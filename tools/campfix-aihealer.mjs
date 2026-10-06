#!/usr/bin/env node
// CAMP FIXES item 4 (v0.5.227): the AI Healer under a player on another class.
// Solo as the Archer, Level 1:
//   1. the Healer (AI, the leader bot) is handed three skills and casts them
//      in room 1 — heals and damage, not just its basic attack;
//   2. the first reward page opens with the Healer's card already decided by
//      the AI (like the Tank / Swordsman cards); the player decides only the
//      Archer's card, the page commits, the Healer's pick lands in its kit
//      (or its node is socketed for it) and no socket screen opens.
// Screenshot: captures/campfix-aihealer-reward.png. Fails on any page error.
//
//   node tools/campfix-aihealer.mjs [--url http://127.0.0.1:5199/] [--seed 3] [--ticks 900]
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
const TICKS = Number(opt('ticks', '900'));
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
  await page.waitForFunction((t) => window.__echoes.tick >= t, { timeout: 900000, polling: 250 }, t0 + n);
};
async function waitPhase(phases, timeout = 300000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return cmd('runState');
}

await page.goto(`${URL0}?seed=${SEED}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await page.evaluate(() => window.__echoes.settings.set('gameplay.playClass', 'archer'));
await settle(1500);
const start = await cmd('campChoose', 1);
check(start && start.ok, `a Level 1 run starts as the Archer (${JSON.stringify(start)})`);
await waitPhase(['combat']);
const kit = ['spirit_bolt', 'mending_bolt', 'swift_mend'];
for (const id of kit) await cmd('giveSkill', id);
await page.evaluate(() => {
  window.__hc = { casts: {}, basics: 0 };
  window.__echoes.on('skill_cast', (ev) => (window.__hc.casts[ev.skill] = (window.__hc.casts[ev.skill] || 0) + 1));
  window.__echoes.on('basic_fire', () => (window.__hc.basics += 1));
});
await waitTicks(TICKS);
const hc = await page.evaluate(() => window.__hc);
const casts = Object.values(hc.casts).reduce((a, b) => a + b, 0);
check(casts >= 4 && Object.keys(hc.casts).length >= 2, `the AI Healer casts its skills in ${TICKS} ticks (${JSON.stringify(hc.casts)}, ${hc.basics} basic shots)`);

await cmd('clearRoom');
let v = await waitPhase(['reward'], 300000);
await settle(2500);
v = await cmd('runState');
const cards = v.party ? v.party.cards : [];
const c0 = cards[0] || {};
check(c0.decided && c0.by === 'ai', `the Healer's card opens decided by the AI (${JSON.stringify({ type: c0.type, id: c0.id, choice: c0.choice, by: c0.by })})`);
check(cards.filter((c) => !c.decided).map((c) => c.seat).join() === '3', `only the Archer's card waits for the player (${JSON.stringify(cards.map((c) => [c.seat, c.decided, c.by]))})`);
await page.screenshot({ path: 'captures/campfix-aihealer-reward.png' });
const before = await page.evaluate(() => window.__echoes.state().skills.map((s) => (s ? s.id : null)));
await cmd('partyPick', 3, 'take');
await waitPhase(['path', 'combat', 'shop', 'relic'], 300000);
await settle(1500);
const after = await page.evaluate(() => ({ skills: window.__echoes.state().skills.map((s) => (s ? s.id : null)), build: window.__echoes.state().build, socket: !!window.__echoes.content.socketUi().open }));
const gotSkill = c0.type === 'skill' && c0.choice === 'take' ? after.skills.includes(c0.id) && !before.includes(c0.id) : true;
const filled = after.build && Array.isArray(after.build.bench) ? after.build.bench.length === 0 : true;
check(gotSkill && filled, `the Healer's AI pick landed (${JSON.stringify(after.skills)}, bench ${after.build && after.build.bench ? after.build.bench.length : '?'})`);
check(!after.socket, 'no socket screen opened for the AI Healer');
check(errors.length === 0, `no page errors (${JSON.stringify(errors.slice(0, 3))})`);
await browser.close();
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL OK');
process.exit(fails.length ? 1 : 0);
