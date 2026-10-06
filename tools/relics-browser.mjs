#!/usr/bin/env node
// RELICS in the real game (docs/CONTENT_PLAN.md §5): against `npm run dev`
// (port 5199), plays a campaign's first rooms through the REAL pages — the
// rooms are force-cleared, the draft is taken, the relic card and the doors
// are clicked in the DOM — and captures:
//   captures/relics-1-pick.png      the free relic page after room 1
//   captures/relics-2-door.png      a path screen with a cursed door
//   captures/relics-3-cursed.png    the cursed room (strip + toast + ring)
//   captures/relics-4-lift.png      "THE CURSE LIFTS" relic page
// and fails on any page error or a missing page.
//
//   node tools/relics-browser.mjs [--url http://127.0.0.1:5199/] [--seed 3]
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
const SEED = Number(opt('seed', '3'));
const W = 1600;
const H = 900;
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

await page.goto(`${URL0}?seed=${SEED}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
// The pages' settle window (300 ms) and fresh-press rule: let the page land.
const settle = () => new Promise((r) => setTimeout(r, 900));
async function clearToReward() {
  await waitPhase(['combat']);
  await cmd('clearRoom');
  return waitPhase(['reward', 'relic', 'path', 'fade']);
}
async function takeDraft() {
  const v = await runView();
  if (v.phase !== 'reward') return v;
  await cmd('draftTake');
  // A taken node chains into the socket screen: close it with Escape.
  await settle();
  const socketOpen = await page.evaluate(() => {
    const el = document.getElementById('socket-screen');
    return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0;
  });
  if (socketOpen) await page.keyboard.press('Escape');
  return waitPhase(['relic', 'path', 'fade']);
}

await cmd('startCampaign', { level: 1 });
let v = await clearToReward();
v = await takeDraft();

// 1. The free relic page after room 1.
check(v.phase === 'relic' && v.relics && v.relics.offer && v.relics.offer.source === 'free', 'room 1 opens the free relic page');
await settle();
const dom1 = await page.evaluate(() => {
  const el = document.querySelector('.rn-relic');
  const cards = [...document.querySelectorAll('.rn-relic .rn-card')];
  return { shown: !!el && el.offsetParent !== null, cards: cards.length, title: document.querySelector('.rn-relic .rl-title')?.textContent };
});
check(dom1.shown && dom1.cards === 3, `the relic page shows three cards (${JSON.stringify(dom1)})`);
await page.screenshot({ path: 'captures/relics-1-pick.png' });
const want = v.relics.offer.choices[1].id;
await page.click('.rn-relic .rl-slot[data-i="1"] .rn-card');
v = await waitPhase(['path', 'fade']);
check(v.relics.owned.length === 1 && v.relics.owned[0].id === want, `a click takes that relic (${want})`);

// 2. Walk rooms until a path screen carries a cursed door.
let cursedRoom = null;
for (let guard = 0; guard < 5 && !cursedRoom; guard++) {
  v = await waitPhase(['path']);
  const side = v.path.options.findIndex((o) => o.curse && !o.major); // a room curse (tools/relics2-browser.mjs covers majors)
  await settle();
  if (side >= 0) {
    const note = await page.evaluate(() => {
      const n = document.querySelector('.rn-path .rl-cursenote');
      const marks = [...document.querySelectorAll('.rn-path .rl-gcurse')].filter((m) => m.style.display !== 'none').length;
      return { note: n && n.style.display !== 'none' ? n.textContent.trim() : null, marks };
    });
    check(!!note.note && note.marks === 1, `the cursed door wears its mark and note (${note.note})`);
    await page.screenshot({ path: 'captures/relics-2-door.png' });
    await page.click(`.rn-path .rn-doorwrap[data-side="${side}"]`);
    cursedRoom = { room: v.path.nextRoom, curse: v.path.options[side].curse };
  } else {
    const clean = Math.max(0, v.path.options.findIndex((o) => !o.curse)); // step around a major curse
    await page.click(`.rn-path .rn-doorwrap[data-side="${clean}"]`);
    v = await clearToReward();
    v = await takeDraft();
    if (v.phase === 'relic') await cmd('relicChoose', 0);
  }
}
if (check(!!cursedRoom, 'a path screen offered a cursed door')) {
  v = await waitPhase(['combat']);
  check(v.relics.curse && v.relics.curse.id === cursedRoom.curse && v.room === cursedRoom.room, `the party walked into the cursed room (${cursedRoom.curse})`);
  await new Promise((r) => setTimeout(r, 1500));
  const strip = await page.evaluate(() => {
    const s = document.querySelector('#relic-strip');
    return s ? { on: s.classList.contains('rl-on'), text: s.textContent.trim(), badges: s.querySelectorAll('.rl-badge').length } : null;
  });
  check(!!strip && strip.on && /CURSED/.test(strip.text) && strip.badges === 1, `the strip shows the relic and the curse (${JSON.stringify(strip)})`);
  await page.screenshot({ path: 'captures/relics-3-cursed.png' });
  await cmd('clearRoom');
  v = await waitPhase(['reward', 'relic', 'path', 'fade']);
  v = await takeDraft();
  check(v.phase === 'relic' && v.relics.offer.source === 'curse', 'clearing the cursed room opens a relic page');
  await settle();
  const title = await page.evaluate(() => document.querySelector('.rn-relic .rl-title')?.textContent);
  check(title === 'THE CURSE LIFTS', `the page reads "${title}"`);
  await page.screenshot({ path: 'captures/relics-4-lift.png' });
  await page.keyboard.press('Enter');
  v = await waitPhase(['path', 'fade', 'combat']);
  check(v.relics.owned.length === 2, 'Enter takes the focused relic');
}

check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
if (fails.length) {
  console.log(`\nFAIL (${fails.length})`);
  process.exit(1);
}
console.log('\nPASS relics browser smoke');
