#!/usr/bin/env node
// CAMP FIXES item 5 (v0.5.227): a lost Waystone is the BUILD_BRIEF §11
// SOFT-FAIL — the defend room converts to kill-all-remaining, its reward and
// spoils are forfeited, the run goes on. Level 1, the first defend room:
//   1. the Waystone is driven to 0 HP: room.softFailed, the run stays live
//      (no defeat), the banner reads the lost-Waystone line with the enemies
//      left (no dead 0/150 and timer);
//   2. the remaining enemies are cleared: the room clears with softFailed,
//      no reward page opens (forfeited), the run walks on to the doors.
// Screenshot: captures/campfix-waystone-lost[-<lang>].png.
//
//   node tools/campfix-waystone.mjs [--url http://127.0.0.1:5199/] [--seed 3] [--lang en]
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
const LANG = opt('lang', 'en');
mkdirSync('captures', { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', ...extra],
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
const tick = () => page.evaluate(() => window.__echoes.tick);
const waitTicks = async (n) => {
  const t0 = await tick();
  await page.waitForFunction((t) => window.__echoes.tick >= t, { timeout: 600000, polling: 250 }, t0 + n);
};
async function waitPhase(phases, timeout = 300000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return cmd('runState');
}
const room = () => page.evaluate(() => window.__echoes.state().room);
const banner = () => page.evaluate(() => (document.getElementById('hud-banner') ? document.getElementById('hud-banner').textContent.replace(/\s+/g, ' ').trim() : null));

await page.goto(`${URL0}?seed=${SEED}&lang=${LANG}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);
const start = await cmd('campChoose', 1);
check(start && start.ok, `a Level 1 run starts (${JSON.stringify(start)})`);
let v = await waitPhase(['combat']);
const modes = v.frame ? v.frame.modes : [];
const n = modes.indexOf('defend') + 1;
check(n > 0, `Level 1 has a defend room (room ${n} of ${JSON.stringify(modes)})`);
await cmd('skipToRoom', n);
await page.waitForFunction(() => {
  const r = window.__echoes.state().room;
  return r && r.mode === 'defend' && r.waystone && window.__echoes.cmd('runState').phase === 'combat';
}, { timeout: 300000, polling: 250 });
await waitTicks(90);
const before = await banner();
let r = await room();
await cmd('setHp', r.waystone.id, 0);
await waitTicks(30);
r = await room();
v = await cmd('runState');
check(r.softFailed && !r.cleared, `the Waystone at 0 HP soft-fails the room (softFailed ${r.softFailed}, cleared ${r.cleared})`);
check(v.active && v.phase === 'combat' && !v.result, `the run goes on (phase ${v.phase}, result ${v.result ?? null})`);
await settle(1200);
const after = await banner();
check(after && after !== before && !/0\/150/.test(after), `the banner says the Waystone is lost, with the enemies left (${JSON.stringify(before)} -> ${JSON.stringify(after)})`);
await page.screenshot({ path: `captures/campfix-waystone-lost${LANG === 'en' ? '' : `-${LANG}`}.png` });
const evs = [];
await page.exposeFunction('__wsEv', (e) => evs.push(e));
await page.evaluate(() => {
  for (const t of ['room_cleared', 'reward_offer', 'spoils_drop', 'defeat']) window.__echoes.on(t, (ev) => window.__wsEv({ type: t, softFailed: ev.softFailed ?? null }));
});
// Clear the rest of the schedule (waves still due spawn on their clock).
for (let i = 0; i < 40; i++) {
  await cmd('killAllEnemies');
  await waitTicks(60);
  r = await room();
  if (!r || r.cleared) break;
}
v = await waitPhase(['path', 'reward', 'relic'], 300000);
await settle(1500);
const cleared = evs.find((e) => e.type === 'room_cleared');
check(cleared && cleared.softFailed === true, `the room clears as a soft-fail (${JSON.stringify(cleared)})`);
check(!evs.some((e) => e.type === 'reward_offer' || e.type === 'spoils_drop') && v.phase !== 'reward', `no reward and no spoils for the lost room (phase ${v.phase}, events ${JSON.stringify(evs.map((e) => e.type))})`);
check(!evs.some((e) => e.type === 'defeat'), 'no defeat');
check(errors.length === 0, `no page errors (${JSON.stringify(errors.slice(0, 3))})`);
await browser.close();
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL OK');
process.exit(fails.length ? 1 : 0);
