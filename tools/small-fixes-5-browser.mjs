#!/usr/bin/env node
// Small fixes 5 in the real game, against `npm run dev` (port 5199):
// <out>/sf5-*.png
//   1-2  Stormglass in the Wood: the glass gathers its own gust down a lane
//        at the nearest enemy, then blows (no gust vent in the room)
//   3    a shrine left unanswered stands again in the next fight, its toast up
//   4    the Journal's Stormglass page (with --lang, in that language)
//   5    the Journal's deeds page: Four Crowns and Five Crowns
// Fails on a page error or an untranslated changed line.
//
//   node tools/small-fixes-5-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--out captures]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH = a chrome wrapper adding
// --no-sandbox and swiftshader (docs/TESTING.md, the cloud probe recipe).
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const LANG = opt('lang', null);
const OUT = opt('out', 'captures');
const SUF = LANG ? `-${LANG}` : '';
const W = 1600;
const H = 900;
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--window-size=${W},${H}`],
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

await page.goto(`${URL0}?seed=5${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: `${OUT}/sf5-${name}${SUF}.png` });
const key = async (code) => {
  await page.keyboard.down(code);
  await sleep(250);
  await page.keyboard.up(code);
};
async function ticks(n) {
  const t0 = await page.evaluate(() => window.__echoes.tick);
  await page.waitForFunction((t) => window.__echoes.tick >= t, { timeout: 120000, polling: 50 }, t0 + n);
}
// Collect the relic and shrine beats off the sim bus.
await page.evaluate(() => {
  window.__sf5 = [];
  const note = (e) => {
    if (!e) return;
    if ((e.type === 'relic_proc' && e.relic === 'stormglass') || e.type === 'shrine_moves' || e.type === 'shrine_spawn') window.__sf5.push({ type: e.type, stage: e.stage ?? null, own: !!e.own, tick: e.tick, room: e.room ?? null });
  };
  window.__echoes.on('relic_proc', note);
  window.__echoes.on('shrine_moves', note);
  window.__echoes.on('shrine_spawn', note);
});
const beats = () => page.evaluate(() => window.__sf5.slice());
const pin = () => page.evaluate(() => {
  // Hold the healer still in the middle and one boar 3.5 u in front of it.
  const w = window.__echoes.content.world();
  const p = w.player;
  p.x = p.px = 0;
  p.z = p.pz = 1.5;
  for (const e of w.entities()) if (e.partyIndex !== undefined) e.hp = e.maxHp;
  const b = w.entities().find((e) => e.id === window.__sf5boar);
  if (b) {
    b.x = b.px = 0;
    b.z = b.pz = -2;
    b.hp = b.maxHp;
  }
});

// ------------------------------------------------- 1. Stormglass --
await cmd('startCampaign', { level: 1 });
await waitPhase(['combat']);
check(Array.isArray(await cmd('objectiveRoom', 'hold', 2)), 'room 2 becomes a Hold room (a long clock, so the room stays live)');
await cmd('skipToRoom', 2);
await waitPhase(['combat']);
await cmd('objectiveDebug', 'clock', 60000);
await cmd('relicGrant', 'stormglass');
await ticks(20);
await cmd('killAllEnemies');
const id = await cmd('spawn', 'boar', 0, -2);
await page.evaluate((i) => {
  window.__sf5boar = i && typeof i === 'object' ? i.id : i;
  const b = window.__echoes.content.world().entities().find((e) => e.id === window.__sf5boar);
  if (b) {
    b.maxHp = 6000;
    b.hp = 6000;
  }
}, id);
// Wait for the glass's own beat (every 8 s from the room's start).
let gather = null;
for (let i = 0; i < 400 && !gather; i++) {
  await pin();
  await sleep(150);
  gather = (await beats()).find((b) => b.stage === 'gather');
}
check(!!gather, `the glass gathers its own gust in a Wood room (tick ${gather?.tick})`);
await shot('1-stormglass-gather');
let blew = null;
for (let i = 0; i < 200 && !blew; i++) {
  await pin();
  await sleep(40);
  blew = (await beats()).find((b) => b.own && !b.stage);
}
check(!!blew && blew.tick - gather.tick === 40, `it blows 40 ticks later (${blew ? blew.tick - gather.tick : '?'})`);
await shot('2-stormglass-blow');

// ------------------------------------------------- 2. the shrine moves on --
await cmd('shrineRoom', 3);
await cmd('skipToRoom', 3);
await waitPhase(['combat']);
await ticks(30);
const st0 = await cmd('shrineState');
check(st0 && st0.room === 3, `the Antler Shrine stands in room 3 (${st0 && st0.room})`);
await cmd('clearRoom');
for (let i = 0; i < 200; i++) {
  const v = await runView();
  if (v.phase === 'combat' && v.room > 3) break;
  if (v.phase === 'reward') await cmd('draftDecline');
  else if (v.phase === 'relic') await cmd('relicChoose', 0);
  else if (v.phase === 'path') await cmd('pathChoose', 0);
  else if (v.phase === 'event' || v.phase === 'encounter' || v.phase === 'vault') await cmd('skipToRoom', v.room + 1);
  await sleep(500);
}
await ticks(40);
const st1 = await cmd('shrineState');
const bs = await beats();
check(bs.some((b) => b.type === 'shrine_moves' && b.room === 3) && st1 && st1.room > 3 && !!st1.body, `unanswered, it moves on and stands in room ${st1 && st1.room}`);
await shot('3-shrine-next-fight');

// ------------------------------------------------- 3. the Journal --
await cmd('endRun', 'abandoned');
await sleep(4000);
for (let i = 0; i < 6; i++) {
  if (await page.evaluate(() => !!document.querySelector('.st-story'))) break;
  await page.keyboard.press('Escape');
  await sleep(1500);
  await key('KeyJ');
  await sleep(2500);
}
const dbg = () => page.evaluate(() => {
  const s = document.querySelector('.st-story');
  return s && s.__journal ? s.__journal() : null;
});
async function toTab(t) {
  for (let i = 0; i < 6; i++) {
    const d = await dbg();
    if (d && d.tab === t) return d;
    await key('KeyE');
    await sleep(600);
  }
  return dbg();
}
let d = await toTab('relics');
await page.evaluate(() => {
  const b = document.querySelector('.jr-tile[data-jid="relic:stormglass"]');
  if (b) b.click();
});
await sleep(1500);
d = await dbg();
check(!!d && d.page && /8/.test(d.page.detail || '') && !/\?\?\?/.test(d.page.detail || ''), `the Journal's Stormglass page tells the new beat (${(d && d.page && d.page.detail || '').slice(0, 160)})`);
await shot('4-journal-stormglass');
d = await toTab('deeds');
await sleep(800);
await page.evaluate(() => {
  const r = [...document.querySelectorAll('.st-story *')].find((e) => e.children.length === 0 && /Crowns|Kronen|Coronas|Couronnes|Coroas|Корон|王冠|冠|왕관/.test(e.textContent || ''));
  if (r && r.scrollIntoView) r.scrollIntoView({ block: 'center' });
});
await sleep(800);
await shot('5-journal-deeds');

if (LANG) {
  const m = (await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : []))) || [];
  const ours = m.filter((k) => /Stormglass|gust vent|champion in each|Co-op most felled/.test(k));
  check(ours.length === 0, `no untranslated changed line (${ours.join(' / ')})`);
}
check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' / ')}` : ''}`);
await browser.close();
console.log(fails.length ? `FAIL small fixes 5 browser (${fails.length})` : 'PASS small fixes 5 browser');
process.exit(fails.length ? 1 : 0);
