#!/usr/bin/env node
// THE BELLWRIGHT's whole kit, in the browser (docs/BELLWRIGHT.md, content
// plan 4 slice 5): a Level 1 campaign with Tolly on seat 3, her seven new
// skills put on her keys three loadouts at a time between rooms and cast at
// a pack, each beat screenshotted as it lands. Screenshots under captures/
// (or --out <dir>); --lang <code> plays it in that language.
//
//   npx vite --port 5199 &   then   node tools/bellwright-kit-browser.mjs [--out dir] [--lang de]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const OUT = opt('out', 'captures');
const LANG = opt('lang', null);
const W = 1600;
const H = 900;
mkdirSync(OUT, { recursive: true });

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
const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const tag = LANG ? `-${LANG}` : '';
const shot = (name) => page.screenshot({ path: `${OUT}/bellwright-kit-${name}${tag}.png` });
const seen = () => page.evaluate(() => window.__kitSeen);

await page.goto(`${URL0}?seed=3&menu=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);
await page.evaluate(() => {
  window.__kitSeen = { casts: {}, rehang: 0, ring: 0 };
  window.__echoes.on('ally_cast', (e) => e && e.classId === 'bellwright' && (window.__kitSeen.casts[e.skill] = (window.__kitSeen.casts[e.skill] || 0) + 1));
  window.__echoes.on('bell_rehang', () => window.__kitSeen.rehang++);
  window.__echoes.on('bell_ring_hit', () => window.__kitSeen.ring++);
});
await cmd('startCampaign', { level: 1, lineup: ['healer', 'tank', 'swordsman', 'bellwright'] });
await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
await settle(1500);
await cmd('partyMode', 'manual');

const ALL = ['hang_bell', 'peal', 'clapper', 'hum', 'great_bell', 'knell', 'bell_swing', 'wing_hop', 'vesper_chime', 'tuning_fork', 'carillon'];
// Between rooms: clear the room, put `ids` on her keys, step into the next.
async function room(ids) {
  for (let i = 0; i < 300 && (await cmd('runState')).phase === 'combat'; i++) {
    await cmd('killAllEnemies');
    await settle(100);
  }
  for (const [k, id] of ids.entries()) {
    const s = (await cmd('partyView', 3)).slots;
    if (s[k] === id) continue;
    const j = s.indexOf(id);
    if (j >= 0) await cmd('partySwap', 3, ALL.find((x) => !s.includes(x) && !ids.includes(x)), j);
    await cmd('partySwap', 3, id, k);
  }
  const next = ((await cmd('runState')).room || 1) + 1;
  await cmd('skipToRoom', next);
  await page.waitForFunction((n) => { const v = window.__echoes.cmd('runState'); return v.phase === 'combat' && v.room === n; }, { timeout: 300000, polling: 250 }, next);
  await settle(1500);
  return (await cmd('partyView', 3)).slots;
}
const me = () => page.evaluate(() => window.__echoes.state().party.find((q) => q.partyIndex === 3));
async function pack(at, pts, kind = 'dummy') {
  for (const [dx, dz] of pts) await cmd('spawn', kind, at.x + dx, at.z + dz, kind === 'dummy' ? {} : { hpMul: 8 });
}
const cast = (k, x, z) => cmd('partyCast', 3, k, { x, z });

const ONLY = opt('only', null); // B or C: one loadout only
let slots;
let t;
let s;
// ---- Loadout B: the Great Bell, the Knell, the Carillon, Bell Swing.
if (ONLY !== 'C') {
slots = await room(['great_bell', 'knell', 'carillon', 'bell_swing']);
check(slots.join(',') === 'great_bell,knell,carillon,bell_swing', `her keys hold the Great Bell, Knell, Carillon and Bell Swing (${slots.join(',')})`);
await shot('1-hud');
t = await me();
await pack(t, [[-0.6, -2.6], [0.6, -2.6], [0, -3.2], [-2.2, -1.4], [2.2, -1.4]], 'boar');
await cast(0, t.x, t.z - 2.7);
await settle(450);
await shot('2-great-bell');
await settle(1500);
t = await me();
await cast(1, t.x, t.z - 3);
await settle(380);
await shot('3-knell');
await settle(900);
t = await me();
await cast(2, t.x, t.z - 2.5);
await settle(320);
await shot('4-carillon');
await settle(800);
t = await me();
await pack(t, [[-0.6, -1.0], [0.6, -1.0]], 'boar');
await cast(3, t.x, t.z - 1);
await settle(260);
await shot('5-bell-swing');
s = await seen();
check(['great_bell', 'knell', 'carillon', 'bell_swing'].every((k) => s.casts[k] >= 1), `all four cast in the room (${JSON.stringify(s.casts)})`);
check(s.rehang >= 1, `the Carillon starts the great bell's time over (${s.rehang})`);

}

// ---- Loadout C: bells, her two wards and Wing Hop. A fresh run: room 2 is
// a timed Waystone hold that killing the pack does not end.
if (ONLY !== 'B') {
if (ONLY !== 'C') {
  await cmd('abandonRun', 'quit');
  await settle(1500);
  await cmd('startCampaign', { level: 1, lineup: ['healer', 'tank', 'swordsman', 'bellwright'] });
  await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
  await settle(1500);
  await cmd('partyMode', 'manual');
}
slots = await room(['hang_bell', 'vesper_chime', 'tuning_fork', 'wing_hop']);
t = await me();
await pack(t, [[-1.4, -2.2], [0, -2.6], [1.4, -2.2], [0.8, -3.0]], 'boar');
for (const dx of [-1.4, 0, 1.4]) {
  await cast(0, t.x + dx, t.z - 2.2);
  await settle(400);
}
await settle(600);
await cast(1, t.x, t.z);
await settle(320);
await shot('6-vesper-chime');
await settle(800);
await cast(2, t.x, t.z);
await settle(300);
await shot('7-tuning-fork');
await settle(800);
t = await me();
await pack(t, [[0.4, 0.2]], 'boar');
await cast(3, t.x + 0.4, t.z);
await settle(420);
await shot('8-wing-hop');
await settle(1200);
await shot('9-bells-tolling');
s = await seen();
check(slots.join(',') === 'hang_bell,vesper_chime,tuning_fork,wing_hop' && ['hang_bell', 'vesper_chime', 'tuning_fork', 'wing_hop'].every((k) => s.casts[k] >= 1), `all four cast in the room (${JSON.stringify(s.casts)})`);
}

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
process.exit(fails.length ? 1 : 0);
