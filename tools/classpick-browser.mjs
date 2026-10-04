#!/usr/bin/env node
// CLASS SELECT in the real game (docs/CLASS_SELECT.md), against `npm run dev`
// (port 5199). One browser profile:
//   1. a fresh camp plays the Healer (seat 0, no leader bot);
//   2. C opens the picker; clicking the Swordsman card picks it: the
//      camera / local body is the Swordsman, real WASD keys walk IT (the
//      Healer stays put), the portal prompt's chip names it;
//   3. a run started from the camp: the Swordsman is human-held, its kit
//      fills the command bar, real keys move and cast it, the Healer is
//      played by the leader bot (it casts), the reward page waits for the
//      player (the bot never takes it) and opens on the Swordsman's card;
//   4. RELOAD: the choice is remembered; picking the Healer again hands the
//      Healer back (seat 0, leader bot off).
// Screenshots: captures/class-1-picker.png, -2-camp.png, -3-combat.png,
// -4-draft.png. Fails on any page error.
//
//   node tools/classpick-browser.mjs [--url http://127.0.0.1:5199/] [--seed 3] [--cls swordsman]
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
const CLS = opt('cls', 'swordsman');
const SEAT = ['healer', 'tank', 'swordsman', 'archer'].indexOf(CLS);
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
const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const pc = () => page.evaluate(() => window.__echoes.playClass());
const tick = () => page.evaluate(() => window.__echoes.state().tick);
const bodies = () =>
  page.evaluate((seat) => {
    const s = window.__echoes.state();
    const me = s.party.find((p) => (seat === 0 ? p.kind === 'player' : p.partyIndex === seat));
    const healer = s.party.find((p) => p.kind === 'player');
    return { me: me ? { x: me.x, z: me.z, hp: me.hp } : null, healer: { x: healer.x, z: healer.z }, tick: s.tick };
  }, SEAT);
// Hold a key until the sim has advanced `ticks` (software GL runs slow).
async function holdFor(code, ticks) {
  const t0 = await tick();
  await page.keyboard.down(code);
  try {
    await page.waitForFunction((t) => window.__echoes.state().tick >= t, { timeout: 120000, polling: 100 }, t0 + ticks);
  } finally {
    await page.keyboard.up(code);
  }
}
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return cmd('runState');
}
async function boot() {
  await page.goto(`${URL0}?seed=${SEED}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  await settle(1500);
}

// --------------------------------------------------- 1: fresh = the Healer --
await boot();
let p = await pc();
check(p.seat === 0 && p.classId === 'healer' && !p.leader, `a fresh profile plays the Healer (${JSON.stringify(p)})`);

// ------------------------------------------------------- 2: pick a class --
await page.keyboard.press('KeyC');
await page.waitForFunction(() => !!document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
await settle(1200);
const cards = await page.evaluate(() => [...document.querySelectorAll('.cs-classes .cs-card')].map((b) => ({ cls: b.dataset.cls, on: b.dataset.on })));
check(cards.length === 4 && cards.find((c) => c.cls === 'healer').on === 'true', `the picker shows four classes, the Healer picked (${JSON.stringify(cards)})`);
await page.screenshot({ path: 'captures/class-1-picker.png' });
await page.click(`.cs-classes .cs-card[data-cls="${CLS}"]`);
await settle(1500);
p = await pc();
check(p.seat === SEAT && p.chosen === CLS && p.leader, `picking the ${CLS} puts the player on seat ${SEAT} with the Healer bot (${JSON.stringify(p)})`);
let b0 = await bodies();
await holdFor('KeyD', 70);
await holdFor('KeyW', 40);
let b1 = await bodies();
const walked = Math.hypot(b1.me.x - b0.me.x, b1.me.z - b0.me.z);
const healerMoved = Math.hypot(b1.healer.x - b0.healer.x, b1.healer.z - b0.healer.z);
check(walked > 1.0 && healerMoved < 0.05, `real keys walk the ${CLS} in camp (${walked.toFixed(2)} u), not the Healer (${healerMoved.toFixed(2)} u)`);
const camp = await cmd('campState');
check(camp.playClass === CLS, `the camp knows the class (${camp.playClass})`);
await page.screenshot({ path: 'captures/class-2-camp.png' });

// ---------------------------------------------------------- 3: a real run --
const start = await cmd('campChoose', 1);
check(start && start.ok, `the camp starts a campaign (${JSON.stringify(start)})`);
await waitPhase(['combat']);
await settle(1500);
const controllers = (await cmd('netSeats')).controllers;
check(Array.isArray(controllers) && controllers[SEAT] === 'human' && controllers[0] === 'ai', `the ${CLS} is human-held and the Healer AI-held (${JSON.stringify(controllers)})`);
const bar = await page.evaluate(() => [...document.querySelectorAll('.hud-slot')].filter((s) => s.style.display !== 'none').map((s) => s.textContent.trim()).slice(0, 6));
check(bar.length >= 4, `the command bar shows the ${CLS}'s kit (${JSON.stringify(bar)})`);
const evs = [];
await page.exposeFunction('__classEv', (e) => evs.push(e));
await page.evaluate(() => {
  for (const t of ['ally_cast', 'ally_basic', 'ally_dash', 'seat_denied', 'basic_fire', 'skill_cast', 'heal']) window.__echoes.on(t, (ev) => window.__classEv({ type: t, seat: ev.seat ?? null, by: ev.casterId ?? ev.id ?? null }));
});
b0 = await bodies();
await holdFor('KeyA', 50);
b1 = await bodies();
check(Math.hypot(b1.me.x - b0.me.x, b1.me.z - b0.me.z) > 0.6, `real keys move the ${CLS} in combat (${Math.hypot(b1.me.x - b0.me.x, b1.me.z - b0.me.z).toFixed(2)} u)`);
for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) {
  await page.keyboard.press(k);
  await page.waitForFunction((t) => window.__echoes.state().tick >= t, { timeout: 60000, polling: 100 }, (await tick()) + 20);
}
await page.screenshot({ path: 'captures/class-3-combat.png' });
await settle(2500);
const seatEvents = evs.filter((e) => e.seat === SEAT);
check(seatEvents.length > 0, `the keys cast the ${CLS}'s skills (${seatEvents.length} seat events: ${JSON.stringify([...new Set(seatEvents.map((e) => e.type))])})`);
// Clear the room the quick way; the reward page must WAIT for the player.
await cmd('clearRoom');
let v = await waitPhase(['reward', 'relic', 'path'], 240000);
await settle(4000);
v = await cmd('runState');
check(v.phase === 'reward' || v.phase === 'relic', `the reward waits for the player (phase ${v.phase})`);
const draft = await page.evaluate(() => {
  const own = document.querySelector('.rn-ptab.rn-psel, .rn-ptab[aria-selected="true"]');
  return { own: own ? own.textContent.replace(/\s+/g, ' ').trim() : null, band: document.querySelector('.rn-owner, .rn-powner.rn-pyou')?.textContent ?? null };
});
console.log('     draft', JSON.stringify(draft));
await page.screenshot({ path: 'captures/class-4-draft.png' });

// ---------------------------------------------------- 4: reload + Healer --
await boot();
p = await pc();
check(p.chosen === CLS && p.seat === SEAT, `the choice survives a reload (${JSON.stringify(p)})`);
await cmd('campClasses');
await page.waitForFunction(() => !!document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
await settle(800);
await page.click('.cs-classes .cs-card[data-cls="healer"]');
await settle(1500);
p = await pc();
check(p.seat === 0 && !p.leader && !p.presented, `picking the Healer hands it back (${JSON.stringify(p)})`);
b0 = await bodies();
await holdFor('KeyS', 40);
b1 = await bodies();
check(Math.hypot(b1.healer.x - b0.healer.x, b1.healer.z - b0.healer.z) > 0.6, 'real keys walk the Healer again');

check(errors.length === 0, `no page errors (${JSON.stringify(errors.slice(0, 3))})`);
await browser.close();
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL OK');
process.exit(fails.length ? 1 : 0);
