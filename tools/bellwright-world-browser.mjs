#!/usr/bin/env node
// TOLLY IN THE WORLD browser check (docs/BELLWRIGHT.md "Unlock" and "Tolly
// in the world", content plan 4 slice 6): on a fresh profile Tolly is locked
// (her card says what frees her, the team view and the camp leave her out);
// once the profile frees the Verse of Stone she stands at the fire and talks,
// her card opens, her kit, tints and deeds show on the Unlocks screen and she
// joins the People in the Journal. Then a run with her in the party holding
// both her class relics, for their effects.
// Screenshots under captures/ (or --out <dir>; --lang <code>).
//
//   npx vite --port 5199 &   then   node tools/bellwright-world-browser.mjs [--out dir] [--lang de]
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
const shot = (name) => page.screenshot({ path: `${OUT}/bellwright-world-${name}${tag}.png` });
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

// 1 — a fresh profile: Tolly (and Rill) locked.
check((await page.evaluate(() => window.__echoes.save.bellwrightFreed())) === false, 'a fresh profile has not freed Tolly');
const r0 = await rigOf('bellwright');
check(r0 && r0.visible === false, 'she is not at the camp fire yet');
check(await page.evaluate(() => getComputedStyle(document.querySelector('#camp-prompt .cp-lineup')).display === 'none'), 'no Team chip while both are locked');
await openClasses();
let cs = await cards();
const lockedCard = cs.find((c) => c.cls === 'bellwright');
check(cs.length === 6 && lockedCard && lockedCard.locked && lockedCard.disabled, `her card shows locked (${cs.map((c) => c.cls + (c.locked ? ':locked' : '')).join(',')})`);
check(/III/.test(lockedCard ? lockedCard.text : ''), 'the card says what frees her (Level III)');
if (en) check(/Barrow Wyrm/.test(lockedCard.text) && !/Drowned Heron/.test(lockedCard.text), 'her own text, not Rill\'s');
await shot('1-locked');
await closeScreens();

// 2 — the Verse of Stone is freed (what the first Level III clear does).
check((await page.evaluate(() => window.__echoes.save.noteFeat('bellwright'))) === true, 'the profile frees her');
await settle(600);
check((await page.evaluate(() => window.__echoes.save.bellwrightFreed())) === true, 'the profile says she is freed');
const r1 = await until(async () => {
  const r = await rigOf('bellwright');
  return r && r.visible ? r : null;
}, 20000);
check(!!r1, 'she stands at the fire');
check(await page.evaluate(() => getComputedStyle(document.querySelector('#camp-prompt .cp-lineup')).display !== 'none'), 'the Team chip is back (five for three seats)');

// 3 — walk up to her: her bubble, E talks.
await cmd('teleport', r1.x + 0.75, r1.z - 0.65);
const bub = await until(async () => {
  const c = await camp();
  return c.story && c.story.tolly && c.story.tolly.near ? c.story.tolly : null;
}, 60000);
check(!!bub && (!en || /Tolly/.test(bub.text || '')), `her bubble shows (${bub ? bub.text : 'none'})`);
await settle(500);
await shot('2-tolly-at-camp');
await page.keyboard.press('KeyE');
const talked = await until(async () => {
  const c = await camp();
  return c.story.tolly && c.story.tolly.talkIdx >= 0 ? c.story.tolly : null;
}, 20000);
check(!!talked && talked.line && talked.line !== bub.line, `E moves her on a line (${talked ? talked.line : ''})`);
await settle(400);
await shot('3-tolly-talks');

// 4 — the class picker: her card open, Rill still locked.
await openClasses();
cs = await cards();
const open = cs.find((c) => c.cls === 'bellwright');
check(open && !open.locked && !open.disabled && cs.find((c) => c.cls === 'tidecaller').locked, 'her card is open; Rill stays locked');
await shot('4-unlocked');
await page.click('.cs-classes .cs-lineup');
await settle(700);
cs = await cards();
check(cs.length === 5 && cs.some((c) => c.cls === 'bellwright') && !cs.some((c) => c.cls === 'tidecaller'), `the team view offers her, not Rill (${cs.map((c) => c.cls).join(',')})`);
await closeScreens();

// 5 — the Unlocks screen: her kit, tints and deeds.
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
if (en) {
  check(/Belltower/.test(await ulText()), 'the Unlocks screen lists the Belltower kit');
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('.ul-card, [data-unlock]')].find((d) => /Belltower/.test(d.textContent));
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await settle(400);
  await shot('5-unlocks-kit');
  check(await tab(/Silver Peal tint[\s\S]*Wyrm Bronze tint|Wyrm Bronze tint[\s\S]*Silver Peal tint/), 'her two tints: Silver Peal and Wyrm Bronze');
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('.ul-card, [data-unlock]')].find((d) => /Silver Peal/.test(d.textContent));
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await settle(400);
  await shot('6-unlocks-tints');
  check(await tab(/Tolly's Toll[\s\S]*Full Peal/), 'and her two deeds');
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((d) => d.children.length === 0 && /Tolly's Toll/.test(d.textContent));
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await settle(400);
  await shot('7-unlocks-deeds');
}
await closeScreens();

// 6 — the Journal's story page: Tolly among the people met.
await page.keyboard.press('KeyJ');
await page.waitForFunction(() => !!document.querySelector('.st-person'), { timeout: 60000, polling: 250 }).catch(() => null);
await settle(800);
const person = await page.evaluate(() => {
  const d = document.querySelector('.st-person[data-npc="tolly"]');
  return d ? d.textContent.replace(/\s+/g, ' ').trim() : null;
});
check(!!person && (!en || /Tolly, the Bellwright/.test(person)), `the Journal lists Tolly under People (${person})`);
await page.evaluate(() => {
  const d = document.querySelector('.st-person[data-npc="tolly"]');
  if (d) d.scrollIntoView({ block: 'center' });
});
await settle(500);
await shot('8-journal');
await closeScreens();

// 7 — a run with her and both her relics: Bell-Rope and Verdigris Clapper.
await page.evaluate(() => {
  window.__bw = { rope: 0, clap: 0, tip: 0 };
  window.__echoes.on('relic_proc', (e) => {
    if (e && e.relic === 'bell_rope') window.__bw.rope++;
    if (e && e.relic === 'verdigris_clapper') window.__bw.clap++;
  });
});
await cmd('startCampaign', { level: 1, lineup: ['healer', 'tank', 'swordsman', 'bellwright'] });
await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
await settle(1500);
await cmd('partyMode', 'manual');
for (let i = 0; i < 300 && (await cmd('runState')).phase === 'combat'; i++) {
  await cmd('killAllEnemies');
  await settle(100);
}
for (const [k, id] of ['hang_bell', 'peal', 'clapper', 'hum'].entries()) await cmd('partySwap', 3, id, k);
await cmd('skipToRoom', 2);
await page.waitForFunction(() => { const v = window.__echoes.cmd('runState'); return v.phase === 'combat' && v.room === 2; }, { timeout: 300000, polling: 250 });
await settle(1500);
await cmd('relicGrant', 'bell_rope');
await cmd('relicGrant', 'verdigris_clapper');
const me = () => page.evaluate(() => window.__echoes.state().party.find((q) => q.partyIndex === 3));
const cast = (k, x, z) => cmd('partyCast', 3, k, { x, z });
let t = await me();
for (const [dx, dz] of [[-1.4, -2.2], [0, -2.6], [1.4, -2.2], [0.8, -3.0], [-0.8, -3.0], [0, -2.0]]) await cmd('spawn', 'boar', t.x + dx, t.z + dz, { hpMul: 8 });
for (const dx of [-1.4, 0, 1.4]) {
  await cast(0, t.x + dx, t.z - 2.4);
  await settle(450);
}
// Verdigris Clapper: the fourth striking toll rings again.
const clap = await until(async () => {
  const s = await page.evaluate(() => window.__bw);
  return s.clap > 0 ? s : null;
}, 20000);
check(!!clap, 'Verdigris Clapper rings a bell again');
await settle(80);
await shot('9-verdigris-clapper');
await settle(400);
t = await me();
await cast(1, t.x, t.z - 2.4);
const rope = await until(async () => {
  const s = await page.evaluate(() => window.__bw);
  return s.rope > 0 ? s : null;
}, 8000);
check(!!rope, 'Bell-Rope heals her on the Peal');
await settle(120);
await shot('10-bell-rope');

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(`\n${fails.length ? 'FAIL' : 'PASS'} ${fails.length} failing`);
process.exit(fails.length ? 1 : 0);
