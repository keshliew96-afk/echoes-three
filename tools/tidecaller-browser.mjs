#!/usr/bin/env node
// THE TIDECALLER browser check (docs/TIDECALLER.md): the class picker shows
// five cards, picking Rill opens "Who stays at camp?", the camp shows her at
// the fire with the benched class idling apart, and the player's own Level 1
// start seats her on the benched class's seat, where she fights and soaks.
// Screenshots under captures/ (or --out <dir>).
//
//   npx vite --port 5199 &   then   node tools/tidecaller-browser.mjs [--out dir]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const OUT = opt('out', 'captures');
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
const pc = () => page.evaluate(() => window.__echoes.playClass());
const cards = () => page.evaluate(() => [...document.querySelectorAll('.cs-classes .cs-card')].map((b) => ({ cls: b.dataset.cls, on: b.dataset.on === 'true', disabled: b.disabled })));
const title = () => page.evaluate(() => (document.querySelector('.cs-classes .cs-title') || {}).textContent || '');

await page.goto(`${URL0}?seed=3`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);

// The class picker: five cards, the NEW badge on Rill's.
await page.keyboard.press('KeyC');
await page.waitForFunction(() => !!document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
await settle(800);
let cs = await cards();
check(cs.map((c) => c.cls).join(',') === 'healer,tank,swordsman,archer,tidecaller', `five class cards (${cs.map((c) => c.cls).join(',')})`);
check(await page.evaluate(() => !!document.querySelector('.cs-card[data-cls="tidecaller"] .cs-new')), 'her card carries the NEW badge');
await page.screenshot({ path: `${OUT}/tidecaller-1-five-cards.png` });

// Picking her opens the bench view with the Archer at camp.
await page.click('.cs-classes .cs-card[data-cls="tidecaller"]');
await settle(900);
cs = await cards();
check((await title()) === 'Who stays at camp?', `the bench view opens (${await title()})`);
check(cs.map((c) => c.cls).join(',') === 'tank,swordsman,archer', `the bench choices are Tank, Swordsman, Archer (${cs.map((c) => c.cls).join(',')})`);
check(cs.find((c) => c.cls === 'archer')?.on === true, 'the Archer stays at camp by default');
await page.screenshot({ path: `${OUT}/tidecaller-2-who-stays.png` });

// Bench the Swordsman instead.
await page.click('.cs-classes .cs-card[data-cls="swordsman"]');
await page.waitForFunction(() => !document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
await settle(2500);
const camp = await page.evaluate(() => window.__echoes.state().party.map((p) => p.classId || 'healer'));
check(camp.join(',') === 'healer,tank,tidecaller,archer', `the camp party follows the plan (${camp.join(',')})`);
check(await page.evaluate(() => /Swordsman/.test((document.querySelector('.cp-lineup') || {}).textContent || '')), 'the Lineup chip names the Swordsman');
await page.screenshot({ path: `${OUT}/tidecaller-3-camp.png` });

// The player's own Level 1 start: Rill on seat 2, the Swordsman's.
await page.evaluate(() => {
  window.__tideSeen = { soaked: 0, crash: 0 };
  window.__echoes.on('status_apply', (e) => {
    if (e && e.status === 'soaked') window.__tideSeen.soaked++;
  });
  window.__echoes.on('crash', () => window.__tideSeen.crash++);
});
await cmd('campChoose', 1);
await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
await settle(2000);
const p = await pc();
check(p.classId === 'tidecaller' && p.seat === 2, `Rill is played on the benched seat (${JSON.stringify(p)})`);
const ports = await page.evaluate(() => [...document.querySelectorAll('.hud-port')].map((c) => c.dataset.class));
check(ports.join(',') === 'healer,tank,tidecaller,archer', `the portraits follow (${ports.join(',')})`);

// Hand her the four base skills (room 1 has no draft yet), let the party
// AI drive, and bring a sturdy pack in so her kit has something to soak.
// Between rooms, as the headless probe does: clear room 1, swap the kit in,
// then step into room 2.
await cmd('partyMode', 'manual');
for (let i = 0; i < 200 && (await cmd('runState')).phase === 'combat'; i++) {
  await cmd('killAllEnemies');
  await settle(100);
}
for (const [k, id] of ['riverbolt', 'undertow', 'breaker', 'tidepool'].entries()) await cmd('partySwap', 2, id, k);
await cmd('skipToRoom', 2);
await page.waitForFunction(() => { const v = window.__echoes.cmd('runState'); return v.phase === 'combat' && v.room === 2; }, { timeout: 300000, polling: 250 });
await settle(1500);
await cmd('partyMode', 'auto');
const me = await page.evaluate(() => window.__echoes.state().party.find((p) => p.partyIndex === 2));
for (const [dx, dz] of [[2.5, 1], [3, 0], [2.6, -1], [-2.5, 1.2]]) await cmd('spawn', 'boar', me.x + dx, me.z + dz, { hpMul: 4 });
let seen = { soaked: 0, crash: 0 };
for (let i = 0; i < 40 && !(seen.soaked >= 3); i++) {
  await settle(500);
  seen = await page.evaluate(() => window.__tideSeen);
}
check(seen.soaked > 0, `enemies get soaked in a real room (${JSON.stringify(seen)})`);
await settle(1500);
await page.screenshot({ path: `${OUT}/tidecaller-4-room.png` });

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
process.exit(fails.length ? 1 : 0);
