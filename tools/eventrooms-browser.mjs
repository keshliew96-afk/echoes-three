#!/usr/bin/env node
// EVENT ROOMS in the real game (docs/EVENT_ROOMS.md): against `npm run dev`
// (port 5199), drives two campaigns through the REAL pages, walking into
// all eight encounters (each "?" door forced, rooms 2-5), and captures:
//   captures/event-door.png             a path screen with a "?" door
//   captures/event-room-<id>.png        each encounter in its room, idle
//   captures/event-card-<id>.png        the card for two of them
//   captures/event-take-<id>.png        just after a Take
// It fails on a page error, a missing "?" door, a card that does not open
// on E, or a missing page.
//
//   node tools/eventrooms-browser.mjs [--url http://127.0.0.1:5199/] [--lang de]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const LANG = opt('lang', null);
const ONLY = opt('only', null); // comma list of encounter ids
const W = Number(opt('w', '1600'));
const H = Number(opt('h', '900'));
const sfx = LANG ? `-${LANG}` : '';
mkdirSync('captures', { recursive: true });

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--window-size=${W},${H}`, ...extra],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};

await page.goto(`${URL0}?seed=3${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const settle = () => sleep(900);
async function closeSocket() {
  const open = await page.evaluate(() => {
    const el = document.getElementById('socket-screen');
    return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0;
  });
  if (open) await page.keyboard.press('Escape');
}
// Walk every page up to the doors.
async function toPath() {
  for (let i = 0; i < 40; i++) {
    const v = await runView();
    if (v.phase === 'path') return v;
    if (v.phase === 'combat') await cmd('clearRoom');
    else if (v.phase === 'reward') {
      await cmd('draftDecline');
      await settle();
      await closeSocket();
    } else if (v.phase === 'relic') await cmd('relicChoose', 0);
    await sleep(600);
  }
  return runView();
}

const ALL = ['blood_shrine', 'wishing_well', 'trapped_chest', 'lost_pilgrim', 'corrupted_altar', 'wandering_spirit', 'forgotten_cache', 'healing_spring'];
const list = ONLY ? ONLY.split(',') : ALL;
const CARD = new Set(['corrupted_altar', 'wishing_well']);
let first = true;
for (let k = 0; k < list.length; k += 3) {
  await cmd('startCampaign', { level: 1 });
  await waitPhase(['combat']);
  for (const id of list.slice(k, k + 3)) {
    await cmd('eventDoor', id, 1);
    await cmd('wallet', 60);
    let v = await toPath();
    // A path screen rolled before the force (a Take that went straight to
    // the doors): walk the plain door and meet the forced one next.
    for (let g = 0; g < 3 && v.phase === 'path' && !v.path.options.some((o) => o.event); g++) {
      await settle();
      const r = await cmd('pathChoose', 0);
      const w = await waitPhase(['combat'], 60000).catch(() => null);
      if (!w) {
        const x = await runView();
        console.log('stuck after pathChoose', JSON.stringify(r), x.phase, x.room, JSON.stringify(x.path), JSON.stringify(x.encounter));
        break;
      }
      v = await toPath();
    }
    // The forced "?" door goes right unless the right door is cursed.
    const evSide = v.phase === 'path' ? v.path.options.findIndex((o) => o.event) : -1;
    if (!check(evSide >= 0, `${id}: the doors carry a "?" door`)) break;
    await settle();
    if (first) {
      const door = await page.evaluate((side) => {
        const d = document.querySelector(`.rn-path .rn-doorwrap[data-side="${side}"] .rn-door`);
        const n = document.querySelector('.rn-path .ev-note');
        return { mark: d && d.classList.contains('ev-door') ? d.querySelector('.rn-gwin').textContent : null, note: n && n.style.display !== 'none' ? n.textContent.trim() : null };
      }, evSide);
      check(door.mark === '?' && !!door.note, `the "?" door wears its mark and note (${door.note})`);
      await page.screenshot({ path: `captures/event-door${sfx}.png` });
      first = false;
    }
    await page.click(`.rn-path .rn-doorwrap[data-side="${evSide}"]`);
    v = await waitPhase(['event']);
    check(v.mode === 'event' && v.encounter && v.encounter.id === id, `${id}: the party walks into its room`);
    // Stand a little in front of it so the camera frames the prop.
    const body = await page.evaluate(() => (window.__echoes.cmd('runState'), window.__echoes.state().entities || []).find?.((e) => e.kind === 'encounter') ?? null);
    void body;
    await cmd('teleport', 0, 0.2);
    await sleep(2200);
    const plate = await page.evaluate(() => {
      const p = document.getElementById('ev-plate');
      return p && p.classList.contains('ev-on') ? p.textContent.trim() : null;
    });
    check(!!plate, `${id}: the plate names it (${plate})`);
    await page.screenshot({ path: `captures/event-room-${id}${sfx}.png` });
    // Walk up and press E.
    await cmd('teleport', 1.2, -2.6);
    await sleep(500);
    await page.keyboard.down('KeyE');
    await sleep(250);
    await page.keyboard.up('KeyE');
    v = await waitPhase(['encounter'], 60000).catch(() => runView());
    check(v.phase === 'encounter', `${id}: E opens the card`);
    await sleep(1200);
    if (CARD.has(id)) await page.screenshot({ path: `captures/event-card-${id}${sfx}.png` });
    // Take (Enter on the focused Take) — the chest becomes a fight.
    await page.keyboard.press('Enter');
    await sleep(350);
    if (CARD.has(id) || id === 'trapped_chest' || id === 'healing_spring') {
      await sleep(250);
      await page.screenshot({ path: `captures/event-take-${id}${sfx}.png` });
    }
    v = await runView();
    check(v.encounter && v.encounter.state !== 'card', `${id}: Take resolved (${v.phase})`);
    if (id === 'trapped_chest') {
      await sleep(2500);
      await page.screenshot({ path: `captures/event-ambush${sfx}.png` });
    }
  }
  await cmd('abandonRun');
  await sleep(1500);
}
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(JSON.stringify({ probe: 'event-rooms-browser', ok: fails.length === 0, fails }, null, 1));
process.exit(fails.length ? 1 : 0);
