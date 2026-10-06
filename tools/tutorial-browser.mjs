#!/usr/bin/env node
// TUTORIAL (docs/TUTORIAL.md, v0.5.228) — the guided first room and the
// one-time tips, driven the way a new player meets them (dev server on 5199):
//   1. a fresh profile's New Game asks "Play the tutorial?"; Play starts the
//      guided room (Level 1 room 1, tutorial campaign, waves held);
//   2. the coach walks move (WASD) -> attack (right mouse) -> dodge (Space)
//      -> the spring (E), and no enemy exists until then;
//   3. the waves come, the room clears, the first wave reward offers a skill,
//      the door ends the tutorial: back in camp, the closing card, no run
//      recorded, tutorial.seen stored;
//   4. tips: class select, a relic pick, a cursed door and the peddler each
//      show their card once; the second relic pick shows none;
//   5. no page error, no line missing in the language.
// Screenshots: --shots <dir> (tutorial-<step>[-<lang>].png).
//
//   node tools/tutorial-browser.mjs [--url http://127.0.0.1:5199/] [--lang en] [--shots captures]
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
const LANG = opt('lang', 'en');
const SHOTS = opt('shots', 'captures');
const sfx = LANG === 'en' ? '' : `-${LANG}`;
mkdirSync(SHOTS, { recursive: true });
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const tut = () => page.evaluate(() => window.__echoes.tutorial().debug());
const runView = () => cmd('runState');
const shot = (name) => page.screenshot({ path: `${SHOTS}/tutorial-${name}${sfx}.png` });
const waitFn = (fn, arg, timeout = 300000) => page.waitForFunction(fn, { timeout, polling: 250 }, arg);
const waitStep = (s, timeout = 300000) => waitFn((x) => window.__echoes.tutorial().debug().step === x, s, timeout);
const waitPhase = (ps, timeout = 300000) => waitFn((x) => x.includes(window.__echoes.cmd('runState').phase), ps, timeout);

await page.goto(`${URL0}?menu=1&fresh=1&lang=${LANG}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
for (let i = 0; i < 200; i++) {
  const st = await page.evaluate(() => (window.__echoes && window.__echoes.app ? window.__echoes.app.state : null)).catch(() => null);
  if (st === 'title') break;
  if (st === 'boot') await page.keyboard.press('Shift');
  await sleep(1500);
}
await sleep(1500);

// 1. New Game offers the tutorial.
await page.click('#ap-title-new');
await page.waitForSelector('#ap-confirm-ok', { visible: true, timeout: 60000 });
await sleep(600);
await shot('0-offer');
check(true, 'the first New Game asks to play the tutorial');
await page.click('#ap-confirm-ok');
await waitFn(() => {
  const v = window.__echoes.cmd('runState');
  return v && v.active && v.tutorial;
});
let v = await runView();
if (v.phase === 'transit') {
  await waitFn(() => window.__echoes.cmd('runState').phase !== 'transit' || window.__echoes.cmd('campaignState').card?.canSkip);
  if ((await runView()).phase === 'transit') await cmd('campaignAdvance');
}
await waitPhase(['combat']);
v = await runView();
check(v.act === 1 && v.room === 1 && v.layout && v.layout.layoutId === 2, `the tutorial is Level 1 room 1 in the spring clearing (act ${v.act}, room ${v.room}, layout ${v.layout && v.layout.layoutId})`);
check(v.tutorial && v.tutorial.hold === true, 'the waves are held');
check(!!(await page.evaluate(() => window.__echoes.tutorial().debug().seen)), 'tutorial.seen is stored');

// 2. The held lessons.
await waitStep('move');
await sleep(1200);
await shot('1-move');
const visible = () => page.evaluate(() => document.getElementById('tu-coach').classList.contains('tu-on'));
check(await visible(), 'the coach card is on screen');
await page.keyboard.down('KeyD');
await waitStep('attack', 120000).catch(() => {});
await page.keyboard.up('KeyD');
check((await tut()).step === 'attack', 'walking passes the move step');
await sleep(800);
await shot('2-attack');
await page.mouse.move(800, 300);
await page.mouse.down({ button: 'right' });
await waitStep('dodge', 120000).catch(() => {});
await page.mouse.up({ button: 'right' });
check((await tut()).step === 'dodge', 'holding the right mouse button passes the attack step');
await sleep(800);
await shot('3-dodge');
await page.keyboard.press('Space');
await waitStep('use', 60000).catch(() => {});
check((await tut()).step === 'use', 'Space passes the dodge step');
let st = await page.evaluate(() => window.__echoes.state().room);
check(st === null, 'no wave has started while the lessons run');
await cmd('teleport', 2.6, -4.3);
await sleep(1500);
await shot('4-spring');
await page.keyboard.press('KeyE');
await waitStep('fight', 60000).catch(() => {});
check((await tut()).step === 'fight', 'drinking from the spring passes the use step and releases the waves');
v = await runView();
check(v.tutorial && v.tutorial.hold === false, 'the run reports the waves released');
await waitFn(() => (window.__echoes.state().room || {}).aliveEnemies > 0, null, 120000).catch(() => {});
await sleep(2500);
await shot('5-fight');
st = await page.evaluate(() => window.__echoes.state().room);
check(!!st && st.pendingSpawns + st.aliveEnemies > 0, `beasts arrive after the release (${st && st.aliveEnemies} alive)`);

// 3. Reward, door, home.
await cmd('clearRoom');
await waitPhase(['reward'], 120000);
await waitStep('reward', 30000).catch(() => {});
v = await runView();
check(v.reward && v.reward.type === 'skill', `the first wave reward offers a skill (${v.reward && v.reward.type})`);
const lesson = () => page.evaluate(() => {
  const m = document.getElementById('tu-modal');
  return m.classList.contains('tu-on') && m.dataset.kind === 'lesson' ? m.dataset.id : null;
});
await sleep(1500);
check((await lesson()) === 'reward', 'the reward lesson opens over the reward page');
await shot('6-reward');
await page.keyboard.press('Enter');
await sleep(800);
v = await runView();
check((await lesson()) === null && v.phase === 'reward', `Enter closes the lesson without taking the reward (phase ${v.phase})`);
await shot('6b-reward-page');
await cmd('draftTake');
await waitPhase(['path'], 60000);
await waitStep('door', 30000).catch(() => {});
check((await tut()).step === 'door', 'no relic pick in the tutorial; the doors come next');
await sleep(1500);
check((await lesson()) === 'door', 'the door lesson opens over the doors');
await shot('7-door');
await page.click('#tu-modal .tu-ok');
await sleep(600);
check((await lesson()) === null && (await runView()).phase === 'path', 'Got it closes the door lesson');
const recBefore = await page.evaluate(() => JSON.stringify(window.__echoes.save?.profile?.()?.records ?? null)).catch(() => null);
await cmd('pathChoose', 0);
await waitFn(() => !window.__echoes.cmd('runState').active, null, 60000);
await waitStep('done', 30000).catch(() => {});
check((await tut()).step === 'done', 'the door ends the tutorial with the closing card');
await sleep(2500);
const camp = await cmd('campState');
check(camp && camp.mode === 'camp', `back in camp (${camp && camp.mode})`);
await shot('8-done');
const recAfter = await page.evaluate(() => JSON.stringify(window.__echoes.save?.profile?.()?.records ?? null)).catch(() => null);
check(recBefore === recAfter, 'no run was recorded');
// (the card also closes itself after 16 s of wall time, which a slow
// software-GL page can spend before this line)
await page.evaluate(() => document.querySelector('#tu-coach .tu-ok').click());
await sleep(500);
check(!(await visible()), 'Got it (or its timeout) closes the closing card');

// 4. Tips.
const tipOn = () => page.evaluate(() => {
  const m = document.getElementById('tu-modal');
  return m.classList.contains('tu-on') && m.dataset.kind === 'tip' ? m.dataset.id : null;
});
await cmd('campClasses');
await waitFn(() => (document.getElementById('tu-modal').dataset.id || null) === 'classes', null, 30000).catch(() => {});
await sleep(800);
check((await tipOn()) === 'classes', 'class select shows its tip');
await shot('tip-classes');
await page.keyboard.press('Escape');
await sleep(800);
check((await tipOn()) === null && (await page.evaluate(() => window.__echoes.app.stack().includes('classes'))), 'Esc closes the tip and leaves class select open');
await page.keyboard.press('Escape');
await sleep(800);
await cmd('startCampaign', { level: 1, depart: false });
await waitPhase(['combat']);
await cmd('relicDoor', 'short_fuse', 0);
await cmd('clearRoom');
await waitPhase(['reward', 'relic', 'path']);
if ((await runView()).phase === 'reward') await cmd('draftTake');
await waitPhase(['relic', 'path']);
await waitFn(() => (document.getElementById('tu-modal').dataset.id || null) === 'relic', null, 30000).catch(() => {});
await sleep(1200);
check((await tipOn()) === 'relic', 'the first relic pick shows its tip');
await shot('tip-relic');
await cmd('relicChoose', 0);
await waitPhase(['path']);
await waitFn(() => (document.getElementById('tu-modal').dataset.id || null) === 'curse', null, 30000).catch(() => {});
await sleep(1200);
v = await runView();
check(v.path && v.path.options.some((o) => o.curse), 'a cursed door is offered');
check((await tipOn()) === 'curse', 'the first cursed door shows its tip');
await shot('tip-curse');
await cmd('pathChoose', 0);
await waitPhase(['combat']);
await cmd('clearRoom');
await waitPhase(['reward', 'relic', 'path']);
if ((await runView()).phase === 'reward') await cmd('draftTake');
await waitPhase(['relic', 'path']);
check((await runView()).phase === 'relic', 'the cursed room owes a second relic pick');
if ((await runView()).phase === 'relic') {
  await sleep(1500);
  check((await tipOn()) === null, 'the second relic pick shows no tip');
  await cmd('relicChoose', 0);
}
await cmd('skipToRoom', 7);
await waitPhase(['shop']);
await sleep(1000);
await cmd('closeSocket'); // the harness jump can leave a node in hand on the socket screen
await waitFn(() => (document.getElementById('tu-modal').dataset.id || null) === 'peddler', null, 30000).catch(() => {});
await sleep(1500);
check((await tipOn()) === 'peddler', 'the peddler shows its tip');
await shot('tip-peddler');
const dbg = await tut();
check(['classes', 'relic', 'curse', 'peddler'].every((k) => dbg.tipsSeen.includes(k)), `every tip is stored as seen (${dbg.tipsSeen.join(',')})`);
await page.click('#tu-modal .tu-ok');
await sleep(500);
check((await tipOn()) === null, 'Got it closes a tip');

// 5. Language and errors.
const i18n = await page.evaluate(() => window.__echoes.i18n());
const misses = [...new Set((i18n.misses || []).map((m) => (typeof m === 'string' ? m : m.key)))];
check(LANG === 'en' || misses.length === 0, `no line missing in ${LANG} (${misses.slice(0, 5).join(' | ')})`);
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
console.log(JSON.stringify({ probe: 'tutorial-browser', lang: LANG, ok: fails.length === 0, fails, log: dbg.log.map((l) => l.step) }));
await browser.close();
process.exit(fails.length ? 1 : 0);
