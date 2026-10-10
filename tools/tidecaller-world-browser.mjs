#!/usr/bin/env node
// RILL IN THE WORLD browser check (docs/TIDECALLER.md "Unlock"): on a fresh
// profile Rill is locked (her card says what frees her, the team view and the
// camp leave her out); once the profile frees the Verse of Water she sits at
// the fire and talks, her card opens, her kit and tints show on the Unlocks
// screen and she joins the People in the Journal.
// Screenshots under captures/ (or --out <dir>).
//
//   npx vite --port 5199 &   then   node tools/tidecaller-world-browser.mjs [--out dir]
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
  await page.waitForFunction(() => !!document.querySelector('.cs-classes .cs-card'), { timeout: 60000, polling: 250 });
  await settle(800);
};
const closeScreens = async () => {
  for (let i = 0; i < 4 && (await page.evaluate(() => window.__echoes.app.stack().length > 0)); i++) {
    await page.evaluate(() => window.__echoes.app.back());
    await settle(500);
  }
};

await page.goto(`${URL0}?seed=3&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);

// 1 — a fresh profile: Rill is locked.
check((await page.evaluate(() => window.__echoes.save.tidecallerFreed())) === false, 'a fresh profile has not freed Rill');
const r0 = await rigOf('tidecaller');
check(r0 && r0.visible === false, 'she is not at the camp fire yet');
check(await page.evaluate(() => getComputedStyle(document.querySelector('#camp-prompt .cp-lineup')).display === 'none'), 'no Team chip while she is locked');
await openClasses();
let cs = await cards();
const lockedCard = cs.find((c) => c.cls === 'tidecaller');
check(cs.length === 5 && lockedCard && lockedCard.locked && lockedCard.disabled, `her card shows locked (${cs.map((c) => c.cls + (c.locked ? ':locked' : '')).join(',')})`);
check(/Level II/.test(lockedCard ? lockedCard.text : ''), 'the card says what frees her');
await page.screenshot({ path: `${OUT}/tidecaller-world-1-locked.png` });
await page.click('.cs-classes .cs-lineup');
await settle(700);
cs = await cards();
check(cs.length === 4 && !cs.some((c) => c.cls === 'tidecaller'), `the team view leaves her out (${cs.map((c) => c.cls).join(',')})`);
await closeScreens();

// 2 — the Verse of Water is freed (what the first Level II clear does).
check((await page.evaluate(() => window.__echoes.save.noteFeat('tidecaller'))) === true, 'the profile frees her');
await settle(600);
check((await page.evaluate(() => window.__echoes.save.tidecallerFreed())) === true, 'the profile says she is freed');
const r1 = await until(async () => {
  const r = await rigOf('tidecaller');
  return r && r.visible ? r : null;
}, 20000);
check(!!r1, 'she sits at the fire');

// 3 — walk up to her: her bubble, E talks.
await cmd('teleport', 1.7, -1.4);
const bub = await until(async () => {
  const c = await camp();
  return c.story && c.story.rill && c.story.rill.near ? c.story.rill : null;
}, 60000);
check(!!bub && /Rill/.test(bub.text || ''), `her bubble shows (${bub ? bub.text : 'none'})`);
await settle(500);
await page.screenshot({ path: `${OUT}/tidecaller-world-2-rill-at-camp.png` });
await page.keyboard.press('KeyE');
const talked = await until(async () => {
  const c = await camp();
  return c.story.rill && c.story.rill.talkIdx >= 0 ? c.story.rill : null;
}, 20000);
check(!!talked && talked.line && talked.line !== bub.line, `E moves her on a line (${talked ? talked.line : ''})`);

// 4 — the class picker: five open cards, her NEW badge.
await openClasses();
cs = await cards();
check(cs.length === 5 && !cs.some((c) => c.locked || c.disabled), 'five open class cards');
check(await page.evaluate(() => !!document.querySelector('.cs-card[data-cls="tidecaller"] .cs-new:not(.cs-lock)')), 'her card carries the NEW badge');
await page.screenshot({ path: `${OUT}/tidecaller-world-3-unlocked.png` });
await closeScreens();
check(await page.evaluate(() => getComputedStyle(document.querySelector('#camp-prompt .cp-lineup')).display !== 'none'), 'the Team chip is back');

// 5 — the Unlocks screen: her kit and tints.
await page.keyboard.press('KeyU');
await page.waitForFunction(() => !!document.querySelector('.ul-card, [data-unlock]'), { timeout: 60000, polling: 250 }).catch(() => null);
await settle(800);
const ulText = () => page.evaluate(() => document.body.innerText);
check(/Millrace/.test(await ulText()), 'the Unlocks screen lists the Millrace kit');
await page.screenshot({ path: `${OUT}/tidecaller-world-4-unlocks-kit.png` });
const tab = async (re) => {
  for (let i = 0; i < 6; i++) {
    if (re.test(await ulText())) return true;
    await page.keyboard.press('KeyE');
    await settle(500);
  }
  return re.test(await ulText());
};
check(await tab(/Brine tint[\s\S]*Heron Rain tint|Heron Rain tint[\s\S]*Brine tint/), 'her two tints: Brine and Heron Rain');
await page.screenshot({ path: `${OUT}/tidecaller-world-5-unlocks-tints.png` });
check(await tab(/Rill's Return[\s\S]*High Water/), 'and her two deeds');
await closeScreens();

// 6 — the Journal's story page: Rill among the people met.
await page.keyboard.press('KeyJ');
await page.waitForFunction(() => !!document.querySelector('.st-person'), { timeout: 60000, polling: 250 }).catch(() => null);
await settle(800);
const person = await page.evaluate(() => {
  const d = document.querySelector('.st-person[data-npc="rill"]');
  return d ? d.textContent.replace(/\s+/g, ' ').trim() : null;
});
check(!!person && /Rill, the Tidecaller/.test(person), `the Journal lists Rill under People (${person})`);
await page.evaluate(() => {
  const d = document.querySelector('.st-person[data-npc="rill"]');
  if (d) d.scrollIntoView({ block: 'center' });
});
await settle(500);
await page.screenshot({ path: `${OUT}/tidecaller-world-6-journal.png` });
await closeScreens();

check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(`\n${fails.length ? 'FAIL' : 'PASS'} ${fails.length} failing`);
process.exit(fails.length ? 1 : 0);
