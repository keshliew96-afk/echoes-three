#!/usr/bin/env node
// CONTROLS (docs/CONTROLS.md, v0.5.229) — key rebinding on Settings ▸
// Controls and gamepad play, driven the way a player meets them (dev server
// on 5199):
//   1. Settings ▸ Controls lists every action with its key; a click arms a
//      row, the next key binds it; a key in use swaps; a reserved key is
//      refused; Esc cancels; a mouse button binds; Reset restores defaults;
//      the keys survive a reload;
//   2. in play a rebound key drives the action (a rebound move key walks);
//   3. a gamepad (mocked standard pad) walks with the left stick, attacks on
//      RT, dodges on LT, pauses on Start, opens class select on X in camp;
//      the HUD, the camp prompt and the tutorial coach name pad buttons, and
//      turn back to keys on the next key press;
//   4. no page error, no line missing in the language.
// Screenshots: --shots <dir> (controls-<name>[-<lang>].png).
//
//   node tools/controls-browser.mjs [--url http://127.0.0.1:5199/] [--lang en] [--shots captures]
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
const shot = (name) => page.screenshot({ path: `${SHOTS}/controls-${name}${sfx}.png` });
const waitFn = (fn, arg, timeout = 120000) => page.waitForFunction(fn, { timeout, polling: 200 }, arg);
const ctl = () => page.evaluate(() => window.__echoes.controls.state());
const capText = (id) => page.$eval(`#ap-bind-${id}`, (n) => n.textContent);
const statusText = () => page.$eval('.ap-controls-status', (n) => n.textContent);
const tabDebug = () => page.evaluate(() => document.querySelector('.ap-controls') && window.__echoes.app.service('settings').get('controls.key.dodge'));

// A standard-mapping gamepad the page reads through navigator.getGamepads()
// (docs/TESTING.md "Gamepad probes"): window.__pad.set({ buttons: {7: 1}, axes: [x, y, rx, ry] }).
const PAD_MOCK = () => {
  const pad = {
    id: 'Probe pad (STANDARD GAMEPAD)',
    index: 0,
    connected: true,
    mapping: 'standard',
    timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
  };
  window.__pad = {
    pad,
    set({ buttons = {}, axes = null } = {}) {
      for (const b of pad.buttons) {
        b.pressed = false;
        b.value = 0;
      }
      for (const [i, v] of Object.entries(buttons)) {
        pad.buttons[i].pressed = v > 0.5;
        pad.buttons[i].value = v;
      }
      if (axes) pad.axes = axes.slice();
      pad.timestamp = performance.now();
    },
  };
  navigator.getGamepads = () => [pad, null, null, null];
};
const padSet = (state) => page.evaluate((s) => window.__pad.set(s), state);
// One pad press held for a few rendered frames (software GL runs the page at
// a few frames a second; the pad is read once per frame), then released for
// a few more.
const frames = () => page.evaluate(() => window.__echoes.app.frameCount);
async function waitFrames(n, minMs) {
  const f0 = await frames();
  const t0 = Date.now();
  while ((await frames()) < f0 + n || Date.now() - t0 < minMs) await sleep(80);
}
async function padPress(button) {
  await padSet({ buttons: { [button]: 1 } });
  await waitFrames(3, 300);
  await padSet({});
  await waitFrames(3, 300);
}

async function bootTitle(query) {
  await page.goto(`${URL0}?${query}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => (window.__echoes && window.__echoes.app ? window.__echoes.app.state : null)).catch(() => null);
    if (st === 'title') break;
    if (st === 'boot') await page.keyboard.press('Shift');
    await sleep(1500);
  }
  await sleep(1000);
}
async function openControls() {
  await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'controls' }));
  await page.waitForSelector('#ap-bind-dodge', { visible: true, timeout: 60000 });
  await sleep(500);
}
async function arm(id) {
  await page.click(`#ap-bind-${id}`);
  await waitFn((x) => document.querySelector(`#ap-bind-${x}`).classList.contains('ap-capturing'), id, 10000);
}

// ------------------------------------------------------- 1. rebinding --
await bootTitle(`menu=1&fresh=1&lang=${LANG}`);
await openControls();
const ids = await page.$$eval('.ap-bind', (ns) => ns.map((n) => n.dataset.action));
check(ids.length === 23, `the Controls tab lists every action as a key button (${ids.length})`);
check((await capText('moveUp')) === 'W' && (await capText('dodge')) === 'Space' && (await capText('skill1')) === '1', 'defaults read W / Space / 1');
check((await page.$eval('#ap-settings-reset', (n) => n.disabled)) === false, 'Reset to defaults is available on this tab');

await arm('dodge');
await shot('1-capturing');
await page.keyboard.press('KeyF');
await sleep(300);
let st = await ctl();
check(st.keys.dodge === 'KeyF' && (await capText('dodge')) === 'F', `pressing F binds Dodge to F (${st.keys.dodge})`);
check(/F/.test(await statusText()), 'the status line says what changed');

await arm('skill1');
await page.keyboard.press('KeyF');
await sleep(300);
st = await ctl();
check(st.keys.skill1 === 'KeyF' && st.keys.dodge === 'Digit1', `a key in use swaps: Skill 1 = F, Dodge = 1 (${st.keys.skill1}, ${st.keys.dodge})`);

await arm('rally');
await page.keyboard.press('F5');
await sleep(300);
st = await ctl();
check(st.keys.rally === 'KeyR' && (await page.$eval('#ap-bind-rally', (n) => n.classList.contains('ap-capturing'))), 'F5 is refused and the row keeps waiting');
await page.keyboard.press('Escape');
await sleep(300);
check(!(await page.$eval('#ap-bind-rally', (n) => n.classList.contains('ap-capturing'))) && (await ctl()).keys.rally === 'KeyR', 'Esc cancels without a change');
check((await page.evaluate(() => window.__echoes.app.overlay)) === 'settings', 'the Esc that cancelled did not close Settings');

await arm('attack');
const box = await page.$eval('#ap-bind-attack', (n) => {
  const r = n.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.click(box.x, box.y);
await sleep(300);
check((await ctl()).keys.attack === 'MouseLeft', `a left click on the armed key binds the left mouse button (${(await ctl()).keys.attack})`);
await arm('attack');
await page.mouse.click(box.x, box.y, { button: 'right' });
await sleep(300);
check((await ctl()).keys.attack === 'MouseRight', 'a right click binds the right mouse button back');

await arm('moveRight');
await page.keyboard.press('ArrowRight');
await sleep(300);
check((await ctl()).keys.moveRight === 'ArrowRight' && (await capText('moveRight')) === '→', 'Move right takes the → arrow');
await sleep(400);
await shot('2-rebound');

// Persisted with the settings: survives a reload.
await page.evaluate(() => window.__echoes.app.service('settings').persist());
await bootTitle(`menu=1&lang=${LANG}`);
st = await ctl();
check(st.keys.dodge === 'Digit1' && st.keys.skill1 === 'KeyF' && st.keys.moveRight === 'ArrowRight', 'the keys survive a reload');

// Gamepad view.
await openControls();
await page.evaluate(() => {
  const n = document.getElementById('ap-controls-view');
  if (n && n.__navAdjust) n.__navAdjust(1);
});
await sleep(500);
const padShown = await page.$eval('.ap-padref', (n) => getComputedStyle(n).display !== 'none' && /RT/.test(n.textContent) && /L-stick/.test(n.textContent));
check(padShown, 'the Gamepad view lists the pad layout (L-stick, RT …)');
await shot('3-gamepad-view');
await page.evaluate(() => {
  const n = document.getElementById('ap-controls-view');
  if (n && n.__navAdjust) n.__navAdjust(-1);
});
await sleep(300);

// ------------------------------------------- 2. rebound keys in play --
await page.evaluate(() => window.__echoes.app.back());
await sleep(400);
await page.evaluate(() => window.__echoes.app.back());
await sleep(400);
await page.goto(`${URL0}?menu=0&lang=${LANG}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await waitFn(() => window.__echoes && window.__echoes.app && window.__echoes.app.state === 'playing', null, 300000);
await sleep(3000);
let b0 = (await ctl()).body;
await page.keyboard.down('ArrowRight');
await waitFn((x0) => window.__echoes.controls.state().body.x > x0 + 1.5, b0.x, 120000).catch(() => {});
await page.keyboard.up('ArrowRight');
let b1 = (await ctl()).body;
check(b1.x > b0.x + 1.5, `the rebound → walks right (${b0.x.toFixed(2)} -> ${b1.x.toFixed(2)})`);
b0 = b1;
await page.keyboard.down('KeyD');
await sleep(1500);
await page.keyboard.up('KeyD');
b1 = (await ctl()).body;
check(Math.abs(b1.x - b0.x) < 0.3, 'D no longer walks (it is unbound now)');

// ------------------------------------------------------- 3. gamepad --
await page.evaluate(PAD_MOCK);
await sleep(600);
b0 = (await ctl()).body;
await padSet({ axes: [-1, 0, 0, 0] });
await waitFn((x0) => window.__echoes.controls.state().body.x < x0 - 1.5, b0.x, 120000).catch(() => {});
await padSet({ axes: [0, 0, 0, 0] });
b1 = (await ctl()).body;
check(b1.x < b0.x - 1.5, `the left stick walks left (${b0.x.toFixed(2)} -> ${b1.x.toFixed(2)})`);
st = await ctl();
check(st.device === 'gamepad', 'the device in use turns to gamepad');
await sleep(500);
const campCaps = await page.$$eval('#camp-prompt .cp-key', (ns) => ns.map((n) => n.textContent));
check(campCaps[0] === 'A' && campCaps.includes('X') && campCaps.includes('Y') && campCaps.includes('B'), `the camp prompt names pad buttons (${campCaps.join(' ')})`);
const barCaps = await page.$$eval('#proto-hud .hud-slot-key', (ns) => ns.map((n) => n.textContent));
check(barCaps.join(' ') === 'X Y B RB LT', `the command bar names pad buttons (${barCaps.join(' ')})`);

await padSet({ buttons: { 7: 1 } });
await waitFn(() => window.__echoes.controls.state().input.last && window.__echoes.controls.state().input.last.attack, null, 30000).catch(() => {});
check(!!((await ctl()).input.last || {}).attack, 'RT holds the basic attack');
await padSet({});
await sleep(400);
await padPress(6);
await waitFn(() => window.__echoes.controls.state().input.presses.includes('dodge'), null, 30000).catch(() => {});
check((await ctl()).input.presses.includes('dodge'), 'LT dodges');
await padPress(15);
await waitFn(() => window.__echoes.controls.state().input.presses.some((p) => p.startsWith('target_select')), null, 30000).catch(() => {});
check((await ctl()).input.presses.some((p) => p === 'target_select:0'), 'D-pad ▶ picks the first ally as heal target');

// Camp: X opens class select, the menu's B closes it.
await padPress(2);
await waitFn(() => window.__echoes.app.overlay === 'classes', null, 30000).catch(() => {});
check((await page.evaluate(() => window.__echoes.app.overlay)) === 'classes', 'X opens class select in camp');
check(!(await ctl()).input.presses.includes('skill_1'), 'that X cast no skill');
await padPress(1);
await waitFn(() => !window.__echoes.app.overlay, null, 30000).catch(() => {});
check(!(await page.evaluate(() => window.__echoes.app.overlay)), 'B closes it');
await sleep(800);
check(!(await ctl()).input.presses.includes('skill_3'), 'the B that closed the menu cast no skill');

// Start pauses; Start resumes.
await padPress(9);
await waitFn(() => window.__echoes.app.overlay === 'pause', null, 30000).catch(() => {});
check((await page.evaluate(() => window.__echoes.app.overlay)) === 'pause', 'Start pauses');
await padPress(9);
await waitFn(() => !window.__echoes.app.overlay, null, 30000).catch(() => {});
check(!(await page.evaluate(() => window.__echoes.app.overlay)), 'Start resumes');

// The tutorial coach in pad words.
await page.evaluate(() => window.__echoes.tutorial().startNow && window.__echoes.tutorial().startNow());
await waitFn(() => window.__echoes.tutorial().debug().step === 'move', null, 300000).catch(() => {});
await sleep(1500);
const coach = await page.evaluate(() => ({ keys: document.querySelector('#tu-coach .tu-keys').textContent, body: document.querySelector('#tu-coach .tu-body').textContent }));
check(/L-stick/.test(coach.keys), `the tutorial coach names the left stick (${coach.keys})`);
b0 = (await ctl()).body;
await padSet({ axes: [1, 0, 0, 0] });
await waitFn(() => window.__echoes.tutorial().debug().step === 'attack', null, 120000).catch(() => {});
await padSet({ axes: [0, 0, 0, 0] });
await sleep(1200);
const coach2 = await page.evaluate(() => ({ keys: document.querySelector('#tu-coach .tu-keys').textContent, body: document.querySelector('#tu-coach .tu-body').textContent }));
check(/RT/.test(coach2.keys) && /RT/.test(coach2.body), `the attack lesson says RT (${coach2.body})`);
await shot('4-hud-gamepad');
await padSet({ buttons: { 7: 1 } });
await waitFn(() => window.__echoes.tutorial().debug().step === 'dodge', null, 120000).catch(() => {});
await padSet({});
check((await page.evaluate(() => window.__echoes.tutorial().debug().step)) === 'dodge', 'holding RT passes the attack lesson');
await sleep(800);
await padPress(6);
await waitFn(() => window.__echoes.tutorial().debug().step === 'use', null, 60000).catch(() => {});
check((await page.evaluate(() => window.__echoes.tutorial().debug().step)) === 'use', 'LT passes the dodge lesson');
await sleep(800);
const ix = await page.evaluate(() => document.querySelector('#tu-coach .tu-body').textContent);
check(/\bA\b/.test(ix), `the spring lesson says A (${ix})`);

// Back to the keyboard: the next key press turns every cap back.
await page.keyboard.press('KeyQ');
await sleep(800);
st = await ctl();
check(st.device === 'keyboard', 'a key press turns the device back to keyboard');
const coach3 = await page.evaluate(() => document.querySelector('#tu-coach .tu-keys').textContent);
check(/E/.test(coach3), `the coach names the E key again (${coach3})`);
const barCaps2 = await page.$$eval('#proto-hud .hud-slot-key', (ns) => ns.map((n) => n.textContent));
check(barCaps2.join(' ') === 'F 2 3 4 1', `the command bar names the rebound keys (${barCaps2.join(' ')})`);
await shot('5-hud-keys');
await page.evaluate(() => window.__echoes.tutorial().skip());
await sleep(1000);

// Reset to defaults.
await page.evaluate(() => window.__echoes.controls.reset());
await sleep(300);
st = await ctl();
check(st.keys.dodge === 'Space' && st.keys.skill1 === 'Digit1' && st.keys.moveRight === 'KeyD' && st.keys.attack === 'MouseRight', 'Reset to defaults restores every key');

const misses = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : []));
if (LANG !== 'en') check(!misses.length, `no line missing in ${LANG} (${misses.slice(0, 5).join(' | ')})`);
check(errors.length === 0, `no page error (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(JSON.stringify({ probe: 'controls-browser', lang: LANG, ok: fails.length === 0, fails }));
process.exit(fails.length ? 1 : 0);
