#!/usr/bin/env node
// CAMP FIXES (v0.5.227) in the real game, against `npm run dev` (port 5199):
//   1. no starting skills: in camp every seat's four skill slots are empty
//      (the Healer's skill bar and the three ally loadouts);
//   2. the backpack (B) opens on the character the player controls: the
//      Archer, then the Tank after switching class, then the Healer;
//   3. the class picker says how skills are earned;
//   4. a real run: room 1 starts with empty slots, and the first reward after
//      the wave offers a SKILL to every seat; taking them gives each seat its
//      first skill (AI seats too).
// Screenshots: captures/campfix-*.png. Fails on any page error.
//
//   node tools/campfix-browser.mjs [--url http://127.0.0.1:5199/] [--seed 3] [--lang en]
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
const W = 1280;
const H = 720;
mkdirSync('captures', { recursive: true });
const shot = (n) => page.screenshot({ path: `captures/campfix-${n}${LANG === 'en' ? '' : `-${LANG}`}.png` });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
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
  await page.waitForFunction((t) => window.__echoes.tick >= t, { timeout: 180000, polling: 100 }, t0 + n);
};
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return cmd('runState');
}
// Every seat's four slots: [healer, tank, swordsman, archer].
const loadouts = () =>
  page.evaluate(() => {
    const s = window.__echoes.state();
    const P = window.__echoes.party;
    const healer = s.skills.map((x) => (x ? x.id : null));
    return [healer, ...[1, 2, 3].map((i) => [...((P && P.view(i) && P.view(i).slots) || ['?', '?', '?', '?'])])];
  });
const socketSeat = () => page.evaluate(() => window.__echoes.content.socketUi().viewSeat);
const socketOpen = () => page.evaluate(() => !!window.__echoes.content.socketUi().open);
async function pressB() {
  await page.keyboard.press('KeyB');
  await settle(700);
}

await page.goto(`${URL0}?seed=${SEED}&lang=${LANG}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);

// ------------------------------------------------- 1: empty slots in camp --
await page.evaluate(() => window.__echoes.settings.set('gameplay.playClass', 'archer'));
await waitTicks(20);
let lo = await loadouts();
check(lo.every((s) => s.length === 4 && s.every((x) => x === null)), `camp: every seat starts with four empty skill slots (${JSON.stringify(lo)})`);
await shot('1-camp-empty');

// ------------------------------------------------ 2: B opens on own seat --
await pressB();
check((await socketOpen()) && (await socketSeat()) === 3, `B as the Archer opens the Archer's card (seat ${await socketSeat()})`);
await shot('2-backpack-archer');
await pressB();
await page.evaluate(() => window.__echoes.settings.set('gameplay.playClass', 'tank'));
await waitTicks(20);
await pressB();
check((await socketSeat()) === 1, `after switching to the Tank, B opens the Tank's card (seat ${await socketSeat()})`);
await page.keyboard.press('F3'); // browse another tab, close, reopen: back on own
await settle(400);
await pressB();
await pressB();
check((await socketSeat()) === 1, `reopening after browsing another tab lands on the Tank again (seat ${await socketSeat()})`);
await pressB();
await page.evaluate(() => window.__echoes.settings.set('gameplay.playClass', 'healer'));
await waitTicks(20);
await pressB();
check((await socketSeat()) === 0, `as the Healer, B opens the Healer's card (seat ${await socketSeat()})`);
await pressB();
await page.evaluate(() => window.__echoes.settings.set('gameplay.playClass', 'archer'));
await waitTicks(20);

// ----------------------------------------------------- 3: class picker --
await cmd('campClasses');
await page.waitForFunction(() => !!document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
await settle(1000);
const kits = await page.evaluate(() => [...document.querySelectorAll('.cs-classes .cs-kit')].map((k) => k.textContent.replace(/\s+/g, ' ').trim()));
check(kits.length === 4 && new Set(kits).size === 1 && kits[0].length > 12, `the picker shows the same no-skills line on every class (${JSON.stringify(kits[0])})`);
await shot('3-classes');
await page.keyboard.press('Escape');
await settle(800);

// --------------------------------------------------------- 4: a real run --
const start = await cmd('campChoose', 1);
check(start && start.ok, `the camp starts a campaign (${JSON.stringify(start)})`);
await waitPhase(['combat']);
await settle(1500);
lo = await loadouts();
check(lo.every((s) => s.every((x) => x === null)), `room 1: still no skills (${JSON.stringify(lo)})`);
await page.keyboard.press('Digit1');
await waitTicks(30);
await shot('4-room1-empty-bar');
await cmd('clearRoom');
let v = await waitPhase(['reward'], 240000);
await settle(3000);
v = await cmd('runState');
const cards = v.party && v.party.cards ? v.party.cards : [];
check(cards.length === 4 && cards.every((c) => c.type === 'skill'), `the first reward offers a skill to every seat (${JSON.stringify(cards.map((c) => [c.seat, c.type, c.id]))})`);
await shot('5-first-reward');
for (const c of cards) if (!c.decided) await cmd('partyPick', c.seat, 'take');
await waitPhase(['path', 'combat', 'shop', 'relic'], 240000);
await settle(1500);
lo = await loadouts();
check(lo.every((s) => s.filter(Boolean).length === 1), `after the reward every seat holds exactly one skill (${JSON.stringify(lo)})`);

check(errors.length === 0, `no page errors (${JSON.stringify(errors.slice(0, 3))})`);
await browser.close();
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL OK');
process.exit(fails.length ? 1 : 0);
