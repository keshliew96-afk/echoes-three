#!/usr/bin/env node
// SABLE IN THE WORLD browser check (docs/DUSKWING.md "Unlock" and "Sable in
// the world", content plan 5 slice 6): on a fresh profile Sable is locked
// (his card says what frees him, the team view and the camp leave him out);
// once the profile frees the Verse of Heart he perches at the fire and talks,
// his card opens, his kit, tints and deeds show on the Unlocks screen and he
// joins the People in the Journal. Then a run with him in the party holding
// both his class relics, for their effects.
// Screenshots under captures/ (or --out <dir>; --lang <code>).
//
//   npx vite --port 5199 &   then   node tools/duskwing-world-browser.mjs [--out dir] [--lang de]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const OUT = opt('out', 'captures');
const LANG = opt('lang', null);
const tag = LANG ? `-${LANG}` : '';
const shot = (name) => page.screenshot({ path: `${OUT}/duskwing-world-${name}${tag}.png` });
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
const camp = () => cmd('campState');
const rigOf = async (cls) => ((await camp()).party.rigs || []).find((r) => r.classId === cls) || null;
const cards = () => page.evaluate(() => [...document.querySelectorAll('.cs-classes .cs-card')].map((b) => ({ cls: b.dataset.cls, disabled: b.disabled, locked: b.classList.contains('cs-locked'), text: b.textContent.replace(/\s+/g, ' ').trim() })));
const until = async (fn, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await fn();
    if (v) return v;
    await settle(250);
  }
  return null;
};
const openClasses = async () => {
  await page.keyboard.press('KeyC');
  // (A camp bubble can hold the key; open the screen directly if C did not.)
  const ok = await page.waitForFunction(() => !!document.querySelector('.cs-classes .cs-card'), { timeout: 8000, polling: 250 }).catch(() => null);
  if (!ok) await page.evaluate(() => window.__echoes.app.open('classes', { via: 'probe' }));
  await page.waitForFunction(() => !!document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
  await settle(800);
};
const closeScreens = async () => {
  for (let i = 0; i < 4 && (await page.evaluate(() => window.__echoes.app.stack().length > 0)); i++) {
    await page.evaluate(() => window.__echoes.app.back());
    await settle(500);
  }
};

await page.goto(`${URL0}?seed=3&fresh=1&tips=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);
const en = !LANG;

// 1 — a fresh profile: Sable (and Rill and Tolly) locked.
check((await page.evaluate(() => window.__echoes.save.duskwingFreed())) === false, 'a fresh profile has not freed Sable');
const r0 = await rigOf('duskwing');
check(r0 && r0.visible === false, 'he is not at the camp fire yet');
check(await page.evaluate(() => getComputedStyle(document.querySelector('#camp-prompt .cp-lineup')).display === 'none'), 'no Team chip while all three are locked');
await openClasses();
let cs = await cards();
const lockedCard = cs.find((c) => c.cls === 'duskwing');
check(cs.length === 7 && lockedCard && lockedCard.locked && lockedCard.disabled, `his card shows locked (${cs.map((c) => c.cls + (c.locked ? ':locked' : '')).join(',')})`);
check(/IV/.test(lockedCard ? lockedCard.text : ''), 'the card says what frees him (Level IV)');
if (en) check(/HOW TO FREE HIM/.test(lockedCard.text) && /Hollow Cantor/.test(lockedCard.text) && !/Barrow Wyrm/.test(lockedCard.text), 'his own text, not Tolly\'s');
await shot('1-locked');
await closeScreens();

// 2 — the Verse of Heart is freed (what the first Level IV clear does).
check((await page.evaluate(() => window.__echoes.save.noteFeat('duskwing'))) === true, 'the profile frees him');
await settle(600);
check((await page.evaluate(() => window.__echoes.save.duskwingFreed())) === true, 'the profile says he is freed');
const r1 = await until(async () => {
  const r = await rigOf('duskwing');
  return r && r.visible ? r : null;
}, 20000);
check(!!r1, 'he perches at the fire');
check(await page.evaluate(() => getComputedStyle(document.querySelector('#camp-prompt .cp-lineup')).display !== 'none'), 'the Team chip is back (four for three seats)');

// 3 — walk up to him: his bubble, E talks.
await cmd('teleport', r1.x - 0.75, r1.z - 0.65);
const bub = await until(async () => {
  const c = await camp();
  return c.story && c.story.sable && c.story.sable.near ? c.story.sable : null;
}, 60000);
check(!!bub && (!en || /Sable/.test(bub.text || '')), `his bubble shows (${bub ? bub.text : 'none'})`);
await settle(500);
await shot('2-sable-at-camp');
await page.keyboard.press('KeyE');
const talked = await until(async () => {
  const c = await camp();
  return c.story.sable && c.story.sable.talkIdx >= 0 ? c.story.sable : null;
}, 20000);
check(!!talked && talked.line && talked.line !== bub.line, `E moves him on a line (${talked ? talked.line : ''})`);
await settle(400);
await shot('3-sable-talks');

// 4 — the class picker: his card open, Rill and Tolly still locked.
await openClasses();
cs = await cards();
const open = cs.find((c) => c.cls === 'duskwing');
check(open && !open.locked && !open.disabled && cs.find((c) => c.cls === 'tidecaller').locked && cs.find((c) => c.cls === 'bellwright').locked, 'his card is open; Rill and Tolly stay locked');
await shot('4-unlocked');
await page.click('.cs-classes .cs-lineup');
await settle(700);
cs = await cards();
check(cs.length === 5 && cs.some((c) => c.cls === 'duskwing') && !cs.some((c) => c.cls === 'tidecaller' || c.cls === 'bellwright'), `the team view offers him, not Rill or Tolly (${cs.map((c) => c.cls).join(',')})`);
await closeScreens();

// 5 — the Unlocks screen: his kit, tints and deeds.
await page.keyboard.press('KeyU');
await page.waitForFunction(() => !!document.querySelector('.ul-card, [data-unlock]'), { timeout: 60000, polling: 250 }).catch(() => null);
await settle(800);
const ulText = () => page.evaluate(() => document.body.innerText);
const tab = async (re) => {
  for (let i = 0; i < 6; i++) {
    if (re.test(await ulText())) return true;
    await page.keyboard.press('KeyE');
    await settle(500);
  }
  return re.test(await ulText());
};
const scrollTo = (re) =>
  page.evaluate((src) => {
    const r = new RegExp(src);
    const el = [...document.querySelectorAll('.ul-card, [data-unlock]')].find((d) => r.test(d.textContent)) || [...document.querySelectorAll('*')].find((d) => d.children.length === 0 && r.test(d.textContent));
    if (el) el.scrollIntoView({ block: 'center' });
  }, re.source);
if (en) {
  check(await tab(/Night Roost/), 'the Unlocks screen lists the Night Roost kit');
  await scrollTo(/Night Roost/);
  await settle(400);
  await shot('5-unlocks-kit');
  check(await tab(/Gloaming tint[\s\S]*Heartblood tint|Heartblood tint[\s\S]*Gloaming tint/), 'his two tints: Gloaming and Heartblood');
  await scrollTo(/Gloaming/);
  await settle(400);
  await shot('6-unlocks-tints');
  check(await tab(/Sable's Night[\s\S]*Lights Out/), 'and his two deeds');
  await scrollTo(/Sable's Night/);
  await settle(400);
  await shot('7-unlocks-deeds');
}
await closeScreens();

// 6 — the Journal's story page: Sable among the people met.
await page.keyboard.press('KeyJ');
await page.waitForFunction(() => !!document.querySelector('.st-person'), { timeout: 60000, polling: 250 }).catch(() => null);
await settle(800);
const person = await page.evaluate(() => {
  const d = document.querySelector('.st-person[data-npc="sable"]');
  return d ? d.textContent.replace(/\s+/g, ' ').trim() : null;
});
check(!!person && (!en || /Sable, the Duskwing/.test(person)), `the Journal lists Sable under People (${person})`);
await page.evaluate(() => {
  const d = document.querySelector('.st-person[data-npc="sable"]');
  if (d) d.scrollIntoView({ block: 'center' });
});
await settle(500);
await shot('8-journal');
await closeScreens();

// 7 — a run with him and both his relics: Ripe Fig and Moonless Fang.
await page.evaluate(() => {
  window.__dk = { fig: 0, fang: 0 };
  window.__echoes.on('relic_proc', (e) => {
    if (e && e.relic === 'ripe_fig') window.__dk.fig++;
    if (e && e.relic === 'moonless_fang') window.__dk.fang++;
  });
});
await cmd('startCampaign', { level: 1, lineup: ['healer', 'tank', 'swordsman', 'duskwing'] });
await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
await settle(1500);
await cmd('partyMode', 'manual');
for (let i = 0; i < 300 && (await cmd('runState')).phase === 'combat'; i++) {
  await cmd('killAllEnemies');
  await settle(100);
}
for (const [k, id] of ['dusk_dive', 'blood_bite', 'nightfall', 'night_wings'].entries()) await cmd('partySwap', 3, id, k);
await cmd('skipToRoom', 2);
await page.waitForFunction(() => { const v = window.__echoes.cmd('runState'); return v.phase === 'combat' && v.room === 2; }, { timeout: 300000, polling: 250 });
await settle(1500);
await cmd('relicGrant', 'ripe_fig');
await cmd('relicGrant', 'moonless_fang');
const me = () => page.evaluate(() => window.__echoes.state().party.find((q) => q.partyIndex === 3));
const cast = (k, x, z) => cmd('partyCast', 3, k, { x, z });
let t = await me();
await page.evaluate((id) => {
  const b = window.__echoes.registry ? window.__echoes.registry.byId(id) : null;
  if (b) b.hp = Math.max(1, b.maxHp - 50);
}, t.id);
for (const [dx, dz] of [[-0.6, -2.8], [0, -3.2], [0.6, -2.8], [0.3, -3.6], [-0.3, -3.6], [0, -2.5]]) await cmd('spawn', 'boar', t.x + dx, t.z + dz, { hpMul: 8 });
// Ripe Fig: the dive lands in the pack.
await cast(0, t.x, t.z - 3.0);
const fig = await until(async () => {
  const s = await page.evaluate(() => window.__dk);
  return s.fig > 0 ? s : null;
}, 15000);
check(!!fig, 'Ripe Fig heals him where the dive lands');
await settle(100);
await shot('9-ripe-fig');
// Moonless Fang: blind the pack, then let him bite.
t = await me();
await cast(2, t.x, t.z);
await cmd('partyMode', 'auto');
const fang = await until(async () => {
  const s = await page.evaluate(() => window.__dk);
  return s.fang > 0 ? s : null;
}, 30000);
check(!!fang, 'Moonless Fang bites a blinded enemy again');
await settle(60);
await shot('10-moonless-fang');

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(`\n${fails.length ? 'FAIL' : 'PASS'} ${fails.length} failing`);
process.exit(fails.length ? 1 : 0);
