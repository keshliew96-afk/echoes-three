#!/usr/bin/env node
// ELITE AFFIXES in the real game (docs/ELITE_AFFIXES.md): against `npm run
// dev` (port 5199), a Level I campaign room where one elite per power is
// spawned in front of the party (the vfx lab's own command), captured as
//   captures/affix-<id>.png        the elite, its plate and aura (and, for
//                                  Molten / Frozen / Blinking / Warded, the
//                                  warning: core ring, nova ring, marked
//                                  spot, ward)
//   captures/affix-two.png         two elites with two powers each
//   captures/affix-tip.png         the first-time tip (with ?tips=1)
// It fails on a page error, a missing plate, an untranslated chip (--lang)
// or a warning that never shows.
//
//   node tools/affixes-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--only molten,frozen]
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
const ONLY = opt('only', null);
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

await page.goto(`${URL0}?seed=3&tips=1${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await page.evaluate(() => { const tu = window.__echoes.tutorial && window.__echoes.tutorial(); if (tu && tu.resetTips) tu.resetTips(); });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = (fn, arg, timeout = 120000) => page.waitForFunction(fn, { timeout, polling: 200 }, arg).then(() => true, () => false);
const front = () => page.evaluate(() => {
  const p = window.__echoes.content.world().player;
  return { x: p.x, z: p.z };
});
// Mutate a live sim entity (probe only: to start a power's clock now).
const poke = (id, patch) => page.evaluate((i, p) => {
  const e = window.__echoes.content.world().entities().find((x) => x.id === i);
  if (!e) return false;
  const t = window.__echoes.content.world().tick;
  for (const [k, v] of Object.entries(p)) e[k] = typeof v === 'string' && v.startsWith('+') ? t + Number(v.slice(1)) : v;
  return true;
}, id, patch);
const plates = () => page.evaluate(() => [...document.querySelectorAll('.ea-plate')].filter((p) => p.style.opacity === '1').map((p) => [...p.querySelectorAll('.ea-chip')].map((c) => c.textContent)));

await cmd('startCampaign', { level: 1 });
await waitFor(() => window.__echoes.cmd('runState').phase === 'combat', null, 240000);
await cmd('killAllEnemies');
await sleep(1500);

const ALL = ['molten', 'frozen', 'vampiric', 'warded', 'blinking', 'splitting', 'hasted', 'thorned'];
const KIND = { molten: 'boar', frozen: 'ram', vampiric: 'boar', warded: 'boar', blinking: 'mantis', splitting: 'boar', hasted: 'boar', thorned: 'ram' };
const list = ONLY ? ONLY.split(',') : ALL;
// A fresh live room for each shot: the run's next combat room, or a restart.
async function freshRoom() {
  const v = await cmd('runState');
  if (v.phase !== 'combat') {
    await cmd('abandonRun');
    await sleep(1200);
    await cmd('startCampaign', { level: 1 });
    await waitFor(() => window.__echoes.cmd('runState').phase === 'combat', null, 240000);
  }
  await cmd('killAllEnemies');
}
let tipShot = false;
for (const id of list) {
  await freshRoom();
  const f = await front();
  const eid = await cmd('spawn', KIND[id], f.x + 0.6, f.z - 2.4, { elite: true, affixes: [id] });
  // Keep the elite (and its allies' targets) alive and close for the shot.
  await poke(eid, { maxHp: 9000, hp: 9000 });
  await sleep(1800);
  if (!tipShot && !LANG) {
    const tip = await waitFor(() => document.querySelector('[data-tip="affix"]') !== null, null, 15000);
    if (check(tip, 'the first affixed elite brings up the Elite powers tip')) await page.screenshot({ path: `captures/affix-tip${sfx}.png` });
    tipShot = true;
  } else if (!tipShot && LANG) {
    const tip = await waitFor(() => document.querySelector('[data-tip="affix"]') !== null, null, 15000);
    if (check(tip, `the tip shows in ${LANG}`)) await page.screenshot({ path: `captures/affix-tip${sfx}.png` });
    tipShot = true;
  }
  if (id === 'molten') {
    await cmd('setHp', eid, 0);
    await waitFor(() => window.__echoes.content.world().entities().some((e) => e.kind === 'eglob' && e.affix === 'molten'), null, 30000).then((ok) => check(ok, 'Molten: the core swells under its ring'));
    await sleep(250);
  } else if (id === 'frozen') {
    await page.evaluate((x, z) => window.__echoes.cmd('teleport', x, z), f.x + 0.6, f.z - 0.8);
    await poke(eid, { frostAt: '+1' });
    await waitFor((i) => (window.__echoes.content.world().entities().find((e) => e.id === i)?.frostUntil ?? 0) > window.__echoes.content.world().tick, eid, 30000).then((ok) => check(ok, 'Frozen: the nova charges under its ring'));
    await sleep(350);
  } else if (id === 'blinking') {
    await page.evaluate((x, z) => window.__echoes.cmd('teleport', x, z), f.x, f.z + 1.6);
    await poke(eid, { blinkAt: '+1' });
    await waitFor((i) => !!window.__echoes.content.world().entities().find((e) => e.id === i)?.blink, eid, 30000).then((ok) => check(ok, 'Blinking: the spot is marked'));
    await sleep(200);
  } else if (id === 'warded') {
    await poke(eid, { wardAt: '+1', affixWard: null });
    await waitFor((i) => window.__echoes.content.world().entities().find((e) => e.id === i)?.affixWard === 'on', eid, 30000).then((ok) => check(ok, 'Warded: the ward goes up'));
    await sleep(300);
  }
  const pl = await plates();
  if (id !== 'molten') check(pl.length >= 1 && pl.some((c) => c.length === 1), `${id}: a plate with one chip (${JSON.stringify(pl)})`);
  await page.screenshot({ path: `captures/affix-${id}${sfx}.png` });
}
// Two elites with two powers each.
{
  await freshRoom();
  const f = await front();
  const a = await cmd('spawn', 'crab', f.x - 1.3, f.z - 2.4, { elite: true, affixes: ['molten', 'hasted'] });
  const b = await cmd('spawn', 'ram', f.x + 1.3, f.z - 2.6, { elite: true, affixes: ['frozen', 'thorned'] });
  for (const i of [a, b]) await poke(i, { maxHp: 9000, hp: 9000 });
  await sleep(2200);
  const pl = await plates();
  check(pl.filter((c) => c.length === 2).length >= 2, `two plates with two chips each (${JSON.stringify(pl)})`);
  if (LANG) check(pl.flat().every((c) => !['Molten', 'Hasted', 'Frozen', 'Thorned'].includes(c)), `chips are in ${LANG} (${pl.flat().join(', ')})`);
  await page.screenshot({ path: `captures/affix-two${sfx}.png` });
}
const vis = await page.evaluate(() => window.__echoes.content.vfx ? window.__echoes.content.vfx().recipes ?? null : null);
console.log('recipes', JSON.stringify(vis && Object.fromEntries(Object.entries(vis).filter(([k]) => k.startsWith('affix')))));
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(`\n${fails.length ? 'FAILED' : 'ALL OK'} (${fails.length} failed)`);
process.exit(fails.length ? 1 : 0);
