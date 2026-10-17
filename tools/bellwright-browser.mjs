#!/usr/bin/env node
// THE BELLWRIGHT browser check (docs/BELLWRIGHT.md): the class picker shows
// seven cards (six before v0.5.293) with Tolly playable from the start, picking her opens "Who joins
// the team?" with her in the Archer's place, the camp shows that team, and
// the player's own Level 1 start seats her, where her three bells hang, toll
// and are rung by the Peal. Screenshots under captures/ (or --out <dir>);
// --lang <code> takes only the picker in that language.
//
//   npx vite --port 5199 &   then   node tools/bellwright-browser.mjs [--out dir] [--lang de]
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

const LANG = opt('lang', null);
await page.goto(`${URL0}?seed=3&tolly=1&sable=1${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);
const tag = LANG ? `-${LANG}` : '';

// The class picker: seven cards (Rill locked on a fresh profile); the NEW
// badge moved to Sable's in v0.5.293.
await page.keyboard.press('KeyC');
await page.waitForFunction(() => !!document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
await settle(800);
let cs = await cards();
check(cs.map((c) => c.cls).join(',') === 'healer,tank,swordsman,archer,tidecaller,bellwright,duskwing', `seven class cards (${cs.map((c) => c.cls).join(',')})`);
check(!cs.find((c) => c.cls === 'bellwright').disabled && cs.find((c) => c.cls === 'tidecaller').disabled, 'Tolly is playable from the start, Rill still locked');
check(await page.evaluate(() => !document.querySelector('.cs-card[data-cls="bellwright"] .cs-new') && !!document.querySelector('.cs-card[data-cls="duskwing"] .cs-new')), 'the NEW badge sits on Sable\'s card now');
await page.screenshot({ path: `${OUT}/bellwright-1-six-cards${tag}.png` });
if (LANG) {
  check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
  process.exit(fails.length ? 1 : 0);
}

// Picking her opens "Who joins the team?": she joins in the Archer's place.
await page.click('.cs-classes .cs-card[data-cls="bellwright"]');
await settle(900);
cs = await cards();
const on = (list) => list.filter((c) => c.on).map((c) => c.cls).join(',');
check((await title()) === 'Who joins the team?', `the team view opens (${await title()})`);
check(on(cs) === 'healer,tank,swordsman,bellwright', `Tolly joins in the Archer's place (${on(cs)})`);
check(cs.find((c) => c.cls === 'healer').disabled && cs.find((c) => c.cls === 'bellwright').disabled, 'the Healer and the class you play are locked in');
await page.screenshot({ path: `${OUT}/bellwright-2-who-joins.png` });
await page.click('.cs-classes .cs-lineup');
await settle(700);
await page.click('.cs-classes .cs-card[data-cls="bellwright"]');
await page.waitForFunction(() => !document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
await settle(2500);
const camp = await page.evaluate(() => window.__echoes.state().party.slice().sort((a, b) => a.partyIndex - b.partyIndex).map((p) => p.classId || 'healer'));
check(camp.join(',') === 'healer,tank,swordsman,bellwright', `the camp party follows the team (${camp.join(',')})`);
check(await page.evaluate(() => /Team/.test((document.querySelector('.cp-lineup') || {}).textContent || '') && getComputedStyle(document.querySelector('.cp-lineup')).display !== 'none'), 'the camp shows its Team chip');
await page.screenshot({ path: `${OUT}/bellwright-3-camp.png` });

// The player's own Level 1 start: Tolly on seat 3, played by the player.
await page.evaluate(() => {
  window.__bellSeen = { hang: 0, toll: 0, peal: 0, ring: 0 };
  window.__echoes.on('azone_spawn', (e) => e && e.bell && window.__bellSeen.hang++);
  window.__echoes.on('azone_tick', (e) => e && e.skill === 'hang_bell' && window.__bellSeen.toll++);
  window.__echoes.on('ally_cast', (e) => e && e.skill === 'peal' && window.__bellSeen.peal++);
  window.__echoes.on('bell_ring_hit', () => window.__bellSeen.ring++);
});
await cmd('campChoose', 1);
await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
await settle(2000);
const p = await pc();
check(p.classId === 'bellwright' && p.seat === 3, `Tolly is played on her seat (${JSON.stringify(p)})`);
const ports = await page.evaluate(() => [...document.querySelectorAll('.hud-port')].map((c) => c.dataset.class));
check(ports.join(',') === 'healer,tank,swordsman,bellwright', `the portraits follow (${ports.join(',')})`);

// Between rooms: clear room 1, put her four skills on her keys, step into
// room 2, bring a sturdy pack in, then hang three bells and ring them.
await cmd('partyMode', 'manual');
for (let i = 0; i < 200 && (await cmd('runState')).phase === 'combat'; i++) {
  await cmd('killAllEnemies');
  await settle(100);
}
for (const [k, id] of ['hang_bell', 'peal', 'clapper', 'hum'].entries()) await cmd('partySwap', 3, id, k);
await cmd('skipToRoom', 2);
await page.waitForFunction(() => { const v = window.__echoes.cmd('runState'); return v.phase === 'combat' && v.room === 2; }, { timeout: 300000, polling: 250 });
await settle(1500);
await page.screenshot({ path: `${OUT}/bellwright-4-hud.png` });
const me = await page.evaluate(() => window.__echoes.state().party.find((q) => q.partyIndex === 3));
const spots = [[-1.5, -1.8], [0, -2.4], [1.5, -1.8]];
for (const [dx, dz] of spots) {
  await cmd('spawn', 'boar', me.x + dx, me.z + dz, { hpMul: 6 });
  await cmd('spawn', 'boar', me.x + dx + 0.4, me.z + dz - 0.3, { hpMul: 6 });
}
for (const [dx, dz] of spots) {
  await cmd('partyCast', 3, 0, { x: me.x + dx, z: me.z + dz });
  await settle(500);
}
let seen = { hang: 0, toll: 0 };
for (let i = 0; i < 30 && !(seen.toll >= 3); i++) {
  await settle(400);
  seen = await page.evaluate(() => window.__bellSeen);
}
check(seen.hang >= 3 && seen.toll >= 3, `three bells hang and toll in a real room (${JSON.stringify(seen)})`);
await page.screenshot({ path: `${OUT}/bellwright-5-bells.png` });
await cmd('partyCast', 3, 2, { x: me.x, z: me.z - 2.4 });
await settle(350);
await cmd('partyCast', 3, 1, { x: me.x, z: me.z - 2 });
await settle(260);
await page.screenshot({ path: `${OUT}/bellwright-6-peal.png` });
for (let i = 0; i < 10; i++) {
  await settle(300);
  seen = await page.evaluate(() => window.__bellSeen);
}
check(seen.peal >= 1, `the Peal rings them (${JSON.stringify(seen)})`);

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
process.exit(fails.length ? 1 : 0);
