#!/usr/bin/env node
// RELICS slice 2 in the real game (docs/RELICS.md "Slice 2"): against
// `npm run dev` (port 5199), drives a campaign through the REAL pages and
// captures:
//   captures/relics2-1-major-door.png  a path screen with a MAJOR cursed door
//   captures/relics2-2-bound.png       the bound room (chains VFX, BOUND strip, toast)
//   captures/relics2-3-greater.png     "A GREATER RELIC" page (no commons)
//   captures/relics2-4-drop.png        an elite's relic drop (loot beam)
//   captures/relics2-5-shelf.png       the peddler with its relic shelf
//   captures/relics2-6-bought.png      a relic bought off the shelf (click)
// and fails on any page error or a missing page.
//
//   node tools/relics2-browser.mjs [--url http://127.0.0.1:5199/] [--seed 3]
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const settle = () => sleep(900);
async function clearToReward() {
  await waitPhase(['combat']);
  await cmd('clearRoom');
  return waitPhase(['reward', 'relic', 'path', 'fade']);
}
async function takeDraft() {
  const v = await runView();
  if (v.phase !== 'reward') return v;
  await cmd('draftTake');
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
check(v.phase === 'relic', 'room 1 opens the free relic page');
// Force the next path screen's right door to carry a MAJOR curse.
await cmd('relicDoor', 'hunted', 1);
await cmd('relicChoose', 0);
v = await waitPhase(['path']);
await settle();

// 1. The major door.
const door = await page.evaluate(() => {
  const d = document.querySelector('.rn-path .rn-doorwrap[data-side="1"] .rn-door');
  const n = document.querySelector('.rn-path .rl-cursenote');
  return { major: !!d && d.classList.contains('rl-major'), note: n && n.style.display !== 'none' ? n.textContent.trim() : null };
});
check(v.path.options[1].major === true && door.major && /Major curse/.test(door.note || ''), `the major door wears its chained mark and note (${door.note})`);
await page.screenshot({ path: 'captures/relics2-1-major-door.png' });
await page.click('.rn-path .rn-doorwrap[data-side="1"]');

// 2. The bound room.
v = await waitPhase(['combat']);
check(v.relics.curse && v.relics.curse.major && v.relics.majors.some((m) => m.id === 'hunted'), 'the party walked into the bound room');
await sleep(1200);
const strip = await page.evaluate(() => {
  const s = document.querySelector('#relic-strip');
  return s ? { on: s.classList.contains('rl-on'), text: s.textContent.replace(/\s+/g, ' ').trim(), bound: s.querySelectorAll('.rl-major').length } : null;
});
check(!!strip && strip.on && /BOUND Hunted/.test(strip.text) && strip.bound === 1, `the strip carries the BOUND row (${JSON.stringify(strip)})`);
await page.screenshot({ path: 'captures/relics2-2-bound.png' });

// 3. The greater pick.
await cmd('clearRoom');
v = await waitPhase(['reward', 'relic', 'path', 'fade']);
v = await takeDraft();
check(v.phase === 'relic' && v.relics.offer.source === 'major' && v.relics.offer.choices.every((c) => c.rarity !== 'common'), `the bound room pays a greater pick (${v.relics.offer ? v.relics.offer.choices.map((c) => c.rarity).join(', ') : '-'})`);
await settle();
const title = await page.evaluate(() => document.querySelector('.rn-relic .rl-title')?.textContent);
check(title === 'A GREATER RELIC', `the page reads "${title}"`);
await page.screenshot({ path: 'captures/relics2-3-greater.png' });
await page.keyboard.press('Enter');
v = await waitPhase(['path', 'fade', 'combat']);
if (v.phase === 'path') {
  await settle();
  await page.click('.rn-path .rn-doorwrap[data-side="0"]');
}

// 4. An elite's relic drop: a forced roll on a Barrow Knight (always Elite).
v = await waitPhase(['combat']);
await sleep(600);
const owned0 = v.relics.owned.length;
await cmd('relicDropNext');
const knight = await page.evaluate(() => {
  const p = window.__echoes.content.world().player;
  const x = p ? p.x + 2.2 : 2.2;
  const z = p ? p.z - 0.6 : -0.6;
  return window.__echoes.cmd('spawn', 'knight', x, z);
});
await sleep(300);
const kid = typeof knight === 'object' && knight ? knight.id : knight;
await cmd('setHp', kid, 0.001);
await cmd('keenProbe', kid, -1);
await page.waitForFunction(() => (window.__echoes.cmd('runState').relics?.owned?.length ?? 0) > 0, { timeout: 30000, polling: 100 });
await sleep(350);
await page.screenshot({ path: 'captures/relics2-4-drop.png' });
v = await runView();
check(v.relics.owned.length === owned0 + 1, `the elite dropped a relic (${v.relics.owned.map((o) => o.id).join(', ')})`);

// 5. The peddler's relic shelf.
await cmd('skipToRoom', 7);
v = await waitPhase(['shop']);
await cmd('wallet', 200);
await sleep(1500);
const rack = await page.evaluate(() => {
  const r = document.querySelector('.rn-shop .rl-rack');
  return r ? { shown: r.style.display !== 'none' && r.offsetHeight > 0, tiles: r.querySelectorAll('.rl-ritem').length, text: r.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) } : null;
});
check(!!rack && rack.shown && rack.tiles === 2, `the peddler shows two relics on its rack (${rack ? rack.text : '-'})`);
await page.screenshot({ path: 'captures/relics2-5-shelf.png' });
const before = (await runView()).relics.owned.length;
const want = (await runView()).relics.shelf[0].id;
await page.click('.rn-shop .rl-ritem[data-i="0"]');
await sleep(500);
v = await runView();
check(v.relics.owned.length === before + 1 && v.relics.owned.some((o) => o.id === want) && v.relics.shelf[0].sold, `a click buys ${want} off the rack`);
await page.screenshot({ path: 'captures/relics2-6-bought.png' });

check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
if (fails.length) {
  console.log(`\nFAIL (${fails.length})`);
  process.exit(1);
}
console.log('\nPASS relics slice 2 browser smoke');
