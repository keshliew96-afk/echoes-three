#!/usr/bin/env node
// ROOM OBJECTIVES in the real game (docs/ROOM_OBJECTIVES.md): against
// `npm run dev` (port 5199), plays a Level 1 campaign through the real pages
// with room 2 forced to a hunt and room 3 to a purge, and captures:
//   captures/objective-door-hunt.png     the doors before the hunt (glyph + legend)
//   captures/objective-tip-hunt.png      the first-hunt tip on those doors
//   captures/objective-hunt.png          the quarry running, marked, HUD timer
//   captures/objective-hunt-winded.png   the quarry winded
//   captures/objective-purge.png         the three nests and the HUD pips
//   captures/objective-purge-spawn.png   a nest spawning
//   captures/objective-purge-wounded.png two nests down, one wounded
// It fails on a page error, a door without its glyph, a room without its
// quarry or nests, or a banner that does not name the objective.
//
//   node tools/objectives-browser.mjs [--url http://127.0.0.1:5199/] [--lang de]
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

await page.goto(`${URL0}?seed=5&tips=1${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
const room = () => page.evaluate(() => window.__echoes.state().room ?? null);
const banner = () => page.evaluate(() => {
  const b = document.getElementById('hud-banner');
  return b ? { text: b.textContent.trim(), show: b.classList.contains('show'), mode: b.dataset.mode ?? null } : null;
});
// The quarry / the nests as the state lists them (enemies + the room view).
const entities = (kind) =>
  page.evaluate((k) => {
    const st = window.__echoes.state();
    const r = st.room || {};
    const ids = k === 'quarry' ? (r.quarry && r.quarry.id != null ? [r.quarry.id] : []) : (r.nests || []).filter((n) => n.alive).map((n) => n.id);
    return (st.enemies || []).filter((e) => ids.includes(e.id)).map((e) => ({ ...e, maxHp: k === 'nest' ? (r.nests.find((n) => n.id === e.id) || {}).maxHp : r.quarry.maxHp }));
  }, kind);
async function closeSocket() {
  const open = await page.evaluate(() => {
    const el = document.getElementById('socket-screen');
    return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0;
  });
  if (open) await page.keyboard.press('Escape');
}
async function closeTip() {
  const tip = await page.evaluate(() => (window.__echoes.tutorial ? window.__echoes.tutorial().debug().tip : null));
  if (tip) {
    await page.keyboard.press('Enter');
    await sleep(400);
  }
  return tip;
}
// On the doors: close any other tip (a cursed door's) until `want` shows.
async function tipAtDoors(want, shotName) {
  for (let i = 0; i < 20; i++) {
    const tp = await page.evaluate(() => window.__echoes.tutorial().debug().tip);
    if (tp === want) {
      await sleep(1800); // a software-GL page paints about once a second
      if (shotName) await page.screenshot({ path: `captures/${shotName}${sfx}.png` });
      await closeTip();
      return tp;
    }
    if (tp) await closeTip();
    await sleep(300);
  }
  return null;
}
async function toPath() {
  for (let i = 0; i < 40; i++) {
    const v = await runView();
    if (v.phase === 'path') return v;
    await closeTip();
    if (v.phase === 'combat') await cmd('clearRoom');
    else if (v.phase === 'reward') {
      await cmd('draftDecline');
      await sleep(900);
      await closeSocket();
    } else if (v.phase === 'relic') await cmd('relicChoose', 0);
    await sleep(600);
  }
  return runView();
}

// The winded beat is 1.4 s of sim time: catch it on its event, not by polling.
await page.evaluate(() => { window.__winded = 0; window.__echoes.on('quarry_winded', () => { window.__winded += 1; }); });
await cmd('startCampaign', { level: 1 });
await waitPhase(['combat']);
check(!!(await cmd('objectiveRoom', 'hunt', 2)), 'room 2 forced to a hunt');
check(!!(await cmd('objectiveRoom', 'purge', 3)), 'room 3 forced to a purge');

// ------------------------------------------------------------------ hunt --
let v = await toPath();
check(v.phase === 'path' && v.path.options.every((o) => o.win === 'hunt'), `the doors lead to the hunt (${v.path && v.path.options.map((o) => o.win)})`);
const tip = await tipAtDoors('hunt', 'objective-tip-hunt');
check(tip === 'hunt', `the first-hunt tip shows on the doors (${tip})`);
await sleep(600);
const door = await page.evaluate(() => ({
  glyphs: [...document.querySelectorAll('.rn-path .rn-gwin')].map((e) => e.textContent),
  legend: (document.querySelector('.rn-path .rn-legend') || {}).textContent ?? '',
}));
check(door.glyphs.every((g) => g === '➶'), `the doors wear the hunt glyph (${door.glyphs.join(' ')})`);
await page.screenshot({ path: `captures/objective-door-hunt${sfx}.png` });
await cmd('pathChoose', 0);
v = await waitPhase(['combat']);
check(v.mode === 'hunt', `room 2 is a hunt (${v.mode})`);
await page.waitForFunction(() => { const r = window.__echoes.state().room; return !!(r && r.quarry && r.quarry.spawned); }, { timeout: 60000, polling: 250 });
let q = (await entities('quarry'))[0];
check(!!q, `the quarry broke cover (${q && q.kind})`);
// Stand a few steps off it so the camera frames the chase.
await cmd('teleport', q.x * 0.55, q.z * 0.55);
await sleep(1800);
let b = await banner();
check(b && b.show && b.mode === 'hunt', `the banner shows the hunt (${b && b.text})`);
await page.screenshot({ path: `captures/objective-hunt${sfx}.png` });
// Wait for a winded beat (it rests every 5 s of running).
const winded = await page
  .waitForFunction(() => window.__winded > 0, { timeout: 120000, polling: 100 })
  .then(() => true)
  .catch(() => false);
check(winded, 'the quarry stops, winded');
q = (await entities('quarry'))[0];
if (q) await cmd('teleport', q.x * 0.7, q.z * 0.7);
await sleep(250);
await page.screenshot({ path: `captures/objective-hunt-winded${sfx}.png` });
const r1 = await room();
check(r1 && r1.quarry && r1.huntTicksLeft > 0, `the room counts the escape down (${r1 && r1.huntTicksLeft} ticks)`);

// ----------------------------------------------------------------- purge --
v = await toPath();
check(v.phase === 'path' && v.path.options.every((o) => o.win === 'purge'), `the doors lead to the purge (${v.path && v.path.options.map((o) => o.win)})`);
const tip2 = await tipAtDoors('purge', 'objective-tip-purge');
check(tip2 === 'purge', `the first-purge tip shows on the doors (${tip2})`);
await sleep(600);
await cmd('pathChoose', 0);
v = await waitPhase(['combat']);
check(v.mode === 'purge', `room 3 is a purge (${v.mode})`);
await sleep(1500);
const nests = await entities('nest');
check(nests.length === 3, `three nests stand (${nests.length})`);
b = await banner();
check(b && b.show && b.mode === 'purge', `the banner shows the purge (${b && b.text})`);
await page.screenshot({ path: `captures/objective-purge${sfx}.png` });
// A nest's spawn: stand by the first nest and wait for its pulse.
await cmd('teleport', nests[0].x * 0.5, nests[0].z * 0.5);
await page
  .waitForFunction(() => (window.__echoes.state().room || {}).pendingSpawns > 0, { timeout: 60000, polling: 100 })
  .catch(() => null);
await sleep(200);
await page.screenshot({ path: `captures/objective-purge-spawn${sfx}.png` });
// Two nests down, the third wounded.
for (const n of nests.slice(0, 2)) await cmd('setHp', n.id, 0);
await cmd('setHp', nests[2].id, 0.35);
const n3 = (await entities('nest'))[0];
await sleep(1500);
const r2 = await room();
check(r2 && r2.nestsAlive === 1, `two nests destroyed (${r2 && r2.nestsAlive} left)`);
if (n3) await cmd('teleport', n3.x * 0.6, n3.z * 0.6);
await sleep(900);
await page.screenshot({ path: `captures/objective-purge-wounded${sfx}.png` });

const misses = LANG ? await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : [])) : [];
check(!LANG || misses.length === 0, `no untranslated lines (${(misses || []).slice(0, 4).join(' | ')})`);
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(JSON.stringify({ probe: 'objectives-browser', ok: fails.length === 0, fails }, null, 1));
process.exit(fails.length ? 1 : 0);
