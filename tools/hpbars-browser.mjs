#!/usr/bin/env node
// HP BARS (docs/HP_BARS.md, v0.5.253) — overhead party health bars and their
// Settings ▸ Gameplay toggle, driven the way a player meets them (dev server
// on 5199):
//   1. camp: all four seats show a full bar over the hero's head;
//   2. a room: the bars follow the heroes, each bar's fill is that hero's HP,
//      a hit flashes the bar and leaves a lag chunk that drains down to the
//      new value, a heal snaps it back, a downed hero's bar goes away and
//      comes back on the revive;
//   3. Settings ▸ Gameplay ▸ Health bars over heroes: the row is there (in
//      the language), a click turns the bars off at once and back on, and the
//      choice survives a reload;
//   4. no page error, no line missing in the language.
// Screenshots: --shots <dir> (hpbars-<name>[-<lang>].png).
//
//   node tools/hpbars-browser.mjs [--url http://127.0.0.1:5199/] [--lang en] [--shots captures]
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
page.on('dialog', (d) => d.accept().catch(() => {}));
page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
const fails = [];
const check = (ok, what, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail !== undefined && !ok ? ` ${JSON.stringify(detail)}` : ''}`);
  if (!ok) fails.push(what);
  return ok;
};
const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const shot = (n) => page.screenshot({ path: `${SHOTS}/hpbars-${n}${sfx}.png` });
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const tick = () => page.evaluate(() => window.__echoes.tick);
const frames = (n) => page.evaluate((k) => new Promise((r) => {
  let i = 0;
  const f = () => (++i >= k ? r() : requestAnimationFrame(f));
  requestAnimationFrame(f);
}), n);
const waitTicks = async (n) => {
  const t0 = await tick();
  await page.waitForFunction((t) => window.__echoes.tick >= t, { timeout: 300000, polling: 100 }, t0 + n);
};
const bars = () => page.evaluate(() => window.__echoes.hpBars());
const party = () => page.evaluate(() => window.__echoes.state().party.map((m) => ({ id: m.id, kind: m.kind, partyIndex: m.partyIndex, hp: m.hp, maxHp: m.maxHp })));
const setting = () => page.evaluate(() => window.__echoes.app.service('settings').get('gameplay.hpBars'));
const memberId = (i) => page.evaluate((k) => {
  const m = window.__echoes.state().party.find((p) => p.partyIndex === k);
  return m ? m.id : null;
}, i);
const shownCount = (b) => b.filter((x) => x.shown && x.opacity > 0.9).length;

await page.goto(`${URL0}?menu=0&seed=7&tips=0&lang=${LANG}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);
await frames(30);

// ------------------------------------------------------------------ camp --
check((await setting()) === true, 'Health bars over heroes is on by default');
let b = await bars();
check(b.length === 4 && shownCount(b) === 4, 'camp: a bar over each of the four heroes', b);
check(b.every((x) => x.fill === 1), 'camp: every bar is full', b.map((x) => x.fill));
await shot('1-camp');

// ------------------------------------------------------------------ room --
await cmd('startRun', {});
await cmd('skipToRoom', 2);
await settle(1200);
await cmd('killAllEnemies');
await waitTicks(20);
// The heroes stay put and nobody hits them while the probe sets HP.
for (const m of await party()) await cmd('iframe', m.id, 100000);
await frames(20);
b = await bars();
check(shownCount(b) === 4, 'room: all four bars are up', b);

check(b.every((x) => x.rect.w > 30 && x.rect.h >= 6), 'bars are a readable size', b.map((x) => x.rect));

const ids = [];
for (let i = 0; i < 4; i++) ids.push(await memberId(i));
await cmd('setHp', ids[1], 0.62);
await cmd('setHp', ids[2], 0.18);
await cmd('setHp', ids[3], 0.85);
await frames(1);
b = await bars();
check(Math.abs(b[1].fill - 0.62) < 0.01 && Math.abs(b[2].fill - 0.18) < 0.01 && Math.abs(b[3].fill - 0.85) < 0.01, 'each bar shows its hero’s HP', b.map((x) => x.fill));
check(b[1].flash > 0 && b[1].lag > b[1].fill + 0.2, 'a hit flashes the bar and leaves the lost chunk behind', b[1]);
await shot('2-hit');
await settle(2500);
await frames(20);
b = await bars();
check(Math.abs(b[1].lag - b[1].fill) < 0.01 && b[1].flash === 0, 'the lost chunk drains down to the new value', b[1]);
await shot('3-room-on');

await cmd('heal', ids[1], 40);
await frames(3);
b = await bars();
check(b[1].fill > 0.62 && Math.abs(b[1].lag - b[1].fill) < 0.01, 'a heal fills the bar at once, no lag chunk', b[1]);

await cmd('setHp', ids[3], 0);
await settle(600);
await frames(20);
b = await bars();
check(!b[3].shown, 'a downed hero has no bar (the revive ring owns that body)', b[3]);
await cmd('setHp', ids[3], 0.5);
await settle(600);
await frames(20);
b = await bars();
check(b[3].shown && Math.abs(b[3].fill - 0.5) < 0.01, 'the bar comes back with the hero', b[3]);

// --------------------------------------------------------------- setting --
await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'gameplay' }));
await page.waitForSelector('#hpbars-gameplay-toggle', { timeout: 60000 });
const row = await page.evaluate(() => {
  const btn = document.getElementById('hpbars-gameplay-toggle');
  const r = btn.closest('.ap-toggle');
  return { text: r ? r.textContent : '', checked: btn.getAttribute('aria-checked') };
});
check(row.checked === 'true', 'the Gameplay tab shows the row switched on', row);
if (LANG !== 'en') check(!/Health bars over heroes/.test(row.text), `the row is in the language (${LANG})`, row.text);
await shot('4-setting');
await page.click('#hpbars-gameplay-toggle');
await settle(300);
check((await setting()) === false, 'a click turns the setting off');
await page.keyboard.press('Escape');
await settle(800);
await frames(10);
b = await bars();
check(shownCount(b) === 0 && b.every((x) => !x.shown), 'off: no bar on screen, at once', b);
await shot('5-room-off');
// Survives a reload. Leave the run first: a page leaving mid-run under
// software GL stalled the renderer in two of twenty runs, before any of
// this layer's code ran again.
await cmd('abandonRun', 'quit');
await settle(800);
await page.evaluate(() => window.__echoes.app.service('settings').persist());
// A fresh navigation, not reload(): under software GL a reload's lifecycle
// event was missed once in ten runs while the page itself came up fine.
await page.goto(`${URL0}?menu=0&seed=7&tips=0&lang=${LANG}`, { waitUntil: 'domcontentloaded', timeout: 300000 }).catch(() => null);
try {
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
} catch (err) {
  const st = await page.evaluate(() => ({ url: location.href, ready: document.readyState, echoes: !!window.__echoes, tick: window.__echoes && window.__echoes.tick, overlay: window.__echoes && window.__echoes.app && window.__echoes.app.overlay })).catch((e) => String(e));
  console.log('RELOAD STUCK', JSON.stringify(st));
  await shot('debug-reload').catch(() => {});
  throw err;
}
await settle(1200);
await frames(20);
check((await setting()) === false, 'off survives a reload');
b = await bars();
check(b.every((x) => !x.shown), 'and the camp has no bars after it', b);
await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'gameplay' }));
await page.waitForSelector('#hpbars-gameplay-toggle', { timeout: 60000 });
await page.click('#hpbars-gameplay-toggle');
await settle(300);
await page.keyboard.press('Escape');
await settle(800);
await frames(20);
b = await bars();
check((await setting()) === true && shownCount(b) === 4, 'on again: the bars are back at once', b);
await page.evaluate(() => window.__echoes.app.service('settings').persist());

const misses = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses || [] : []));
check(LANG === 'en' || !misses.some((m) => /Health bars|health bar|party portraits|every hero/i.test(String(m))), `no new line missing in ${LANG}`, misses.slice(0, 4));
check(errors.length === 0, 'no page errors', errors.slice(0, 3));
await browser.close();
console.log(fails.length ? `\nFAIL hp bars browser (${fails.length})` : '\nPASS hp bars browser');
process.exit(fails.length ? 1 : 0);
