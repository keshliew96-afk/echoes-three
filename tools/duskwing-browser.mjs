#!/usr/bin/env node
// THE DUSKWING browser check (docs/DUSKWING.md): the class picker shows
// seven cards with Sable playable from the start, picking him opens "Who
// joins the team?" with him in the Archer's place, the camp shows that team,
// and the player's own Level 1 start seats him, where he dives into a pack,
// blinds it with Nightfall and bites. Screenshots under captures/ (or
// --out <dir>); --lang <code> takes only the picker in that language.
//
//   npx vite --port 5199 &   then   node tools/duskwing-browser.mjs [--out dir] [--lang de]
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
await page.goto(`${URL0}?seed=3&sable=1${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);
const tag = LANG ? `-${LANG}` : '';

// The class picker: seven cards on a fresh profile (Rill and Tolly locked,
// Sable free), the NEW badge on his.
await page.keyboard.press('KeyC');
await page.waitForFunction(() => !!document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
await settle(800);
let cs = await cards();
check(cs.map((c) => c.cls).join(',') === 'healer,tank,swordsman,archer,tidecaller,bellwright,duskwing', `seven class cards (${cs.map((c) => c.cls).join(',')})`);
check(!cs.find((c) => c.cls === 'duskwing').disabled && cs.find((c) => c.cls === 'tidecaller').disabled && cs.find((c) => c.cls === 'bellwright').disabled, 'Sable is playable from the start, Rill and Tolly still locked');
check(await page.evaluate(() => !!document.querySelector('.cs-card[data-cls="duskwing"] .cs-new')), 'his card carries the NEW badge');
check(await page.evaluate(() => { const r = document.querySelector('.cs-classes').getBoundingClientRect(); return [...document.querySelectorAll('.cs-classes .cs-card')].every((c) => { const b = c.getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1 && b.width > 60; }); }), 'all seven cards fit the panel');
await page.screenshot({ path: `${OUT}/duskwing-1-seven-cards${tag}.png` });
if (LANG) {
  check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
  await browser.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
  process.exit(fails.length ? 1 : 0);
}

// Picking him opens "Who joins the team?": he joins in the Archer's place.
await page.click('.cs-classes .cs-card[data-cls="duskwing"]');
await settle(900);
cs = await cards();
const on = (list) => list.filter((c) => c.on).map((c) => c.cls).join(',');
check((await title()) === 'Who joins the team?', `the team view opens (${await title()})`);
check(on(cs) === 'healer,tank,swordsman,duskwing', `Sable joins in the Archer's place (${on(cs)})`);
check(cs.find((c) => c.cls === 'healer').disabled && cs.find((c) => c.cls === 'duskwing').disabled, 'the Healer and the class you play are locked in');
await page.screenshot({ path: `${OUT}/duskwing-2-who-joins.png` });
await page.click('.cs-classes .cs-lineup');
await settle(700);
await page.click('.cs-classes .cs-card[data-cls="duskwing"]');
await page.waitForFunction(() => !document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
await settle(2500);
const camp = await page.evaluate(() => window.__echoes.state().party.slice().sort((a, b) => a.partyIndex - b.partyIndex).map((p) => p.classId || 'healer'));
check(camp.join(',') === 'healer,tank,swordsman,duskwing', `the camp party follows the team (${camp.join(',')})`);
await page.screenshot({ path: `${OUT}/duskwing-3-camp.png` });

// The player's own Level 1 start: Sable on seat 3, played by the player.
await page.evaluate(() => {
  window.__duskSeen = { dash: 0, land: 0, bite: 0, night: 0, blind: 0, sip: 0 };
  const S = window.__duskSeen;
  window.__echoes.on('ally_dash', (e) => e && e.skill === 'dusk_dive' && S.dash++);
  window.__echoes.on('ally_cast', (e) => {
    if (!e) return;
    if (e.skill === 'dusk_dive') S.land++;
    if (e.skill === 'blood_bite') S.bite++;
    if (e.skill === 'nightfall') S.night++;
  });
  window.__echoes.on('status_apply', (e) => e && e.status === 'blind' && S.blind++);
  window.__echoes.on('heal', (e) => e && e.source === 'night_hunger' && S.sip++);
});
await cmd('campChoose', 1);
await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
await settle(2000);
const p = await pc();
check(p.classId === 'duskwing' && p.seat === 3, `Sable is played on his seat (${JSON.stringify(p)})`);
const ports = await page.evaluate(() => [...document.querySelectorAll('.hud-port')].map((c) => c.dataset.class));
check(ports.join(',') === 'healer,tank,swordsman,duskwing', `the portraits follow (${ports.join(',')})`);

// Between rooms: clear room 1, put his four skills on his keys, step into
// room 2, bring a sturdy pack in, then dive, bite and fall the night.
await cmd('partyMode', 'manual');
for (let i = 0; i < 200 && (await cmd('runState')).phase === 'combat'; i++) {
  await cmd('killAllEnemies');
  await settle(100);
}
for (const [k, id] of ['dusk_dive', 'blood_bite', 'nightfall', 'night_wings'].entries()) await cmd('partySwap', 3, id, k);
await cmd('skipToRoom', 2);
await page.waitForFunction(() => { const v = window.__echoes.cmd('runState'); return v.phase === 'combat' && v.room === 2; }, { timeout: 300000, polling: 250 });
await settle(1500);
await page.screenshot({ path: `${OUT}/duskwing-4-hud.png` });
const me = await page.evaluate(() => window.__echoes.state().party.find((q) => q.partyIndex === 3));
const pack = { x: me.x + 0.6, z: me.z - 2.8 };
for (const [dx, dz] of [[0, 0], [0.6, 0.3], [-0.6, 0.3], [0.3, -0.5], [-0.3, -0.5]]) await cmd('spawn', 'boar', pack.x + dx, pack.z + dz, { hpMul: 8 });
await settle(300);
await cmd('partyCast', 3, 0, pack);
await settle(260);
await page.screenshot({ path: `${OUT}/duskwing-5-dive.png` });
await settle(400);
await cmd('partyCast', 3, 2, pack);
await settle(500);
await page.screenshot({ path: `${OUT}/duskwing-6-nightfall.png` });
await settle(700);
await page.screenshot({ path: `${OUT}/duskwing-7-blinded.png` });
await cmd('partyCast', 3, 1, pack);
await settle(240);
await page.screenshot({ path: `${OUT}/duskwing-8-bloodbite.png` });
await settle(1200);
const seen = await page.evaluate(() => window.__duskSeen);
check(seen.dash >= 1 && seen.land >= 1, `he dives and lands in a real room (${JSON.stringify(seen)})`);
check(seen.night >= 1 && seen.blind >= 1, 'Nightfall blinds the pack');
check(seen.bite >= 1, 'Bloodbite bites');

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
process.exit(fails.length ? 1 : 0);
