#!/usr/bin/env node
// DEEDS AND UNLOCKS, ROUND TWO screenshots (docs/UNLOCKS.md "Round two"),
// against `npm run dev`: a profile that has cleared Levels I to IV and is part
// way through the counted deeds, then the Unlocks screen's Deeds, Kits,
// Vows and Tints tabs. Checks the deed cards show progress and that the page
// makes no errors or untranslated lines.
//   node tools/deeds-unlocks-2-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--out dir]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const LANG = opt('lang', 'en');
const OUT = opt('out', 'captures');
const W = 1600;
const H = 900;
mkdirSync(OUT, { recursive: true });
const suffix = LANG === 'en' ? '' : `-${LANG}`;

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

await page.goto(`${URL0}?seed=3${LANG === 'en' ? '' : `&lang=${LANG}`}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);

// A profile part way through: Levels I to IV cleared once, half the event
// rooms, five affixes, two champions, three arenas, two Daily days in a row.
const r = await page.evaluate(() => {
  const S = window.__echoes.save;
  const lv = (n) => [1, 2, 3, 4].slice(0, n).map((l) => ({ level: l, index: l, cleared: true, rooms: 8 }));
  const base = (o) => ({ act: 1, result: 'victory', victory: true, roomsCleared: 32, kills: 300, timeSec: 2400, seed: 3, challenge: 'standard', ...o });
  S.awardRun(base({ campaign: { mode: 'campaign', levels: lv(4), complete: true }, builds: ['healer', 'tank', 'archer', 'swordsman'].map((c) => ({ classId: c })), deedRun: { events: ['blood_shrine', 'wishing_well', 'lost_pilgrim', 'fey_ring', 'sluice_gate', 'healing_spring', 'gamblers_dice'], affixes: ['molten', 'frozen', 'warded', 'hasted', 'thorned'], objectives: ['hunt', 'escort'], champions: ['briar_knight', 'bone_reeve'], arenas: [21, 23, 25], vaults: 1 } }));
  S.awardRun(base({ result: 'defeat', victory: false, campaign: { mode: 'campaign', levels: [{ level: 1, index: 1, cleared: false, rooms: 5 }], complete: false, daily: { key: '2026-10-09' } } }));
  S.awardRun(base({ result: 'defeat', victory: false, campaign: { mode: 'campaign', levels: [{ level: 1, index: 1, cleared: false, rooms: 6 }], complete: false, daily: { key: '2026-10-10' } } }));
  S.embers(260);
  return S.profile().meta;
});
check(r.marks && r.marks.event.length === 7 && r.marks.daily.streak === 2, `the profile holds its marks (${r.marks && r.marks.event.length} event rooms, Daily streak ${r.marks && r.marks.daily.streak})`);

await page.keyboard.press('KeyU');
await page.waitForFunction(() => !!document.querySelector('.ul-unlocks .ul-card'), { timeout: 60000, polling: 250 });
await settle(1200);
const shot = async (tab, name) => {
  await page.click(`.ul-unlocks .ul-tab[data-tab="${tab}"]`);
  await settle(900);
  if (tab === 'deed') await page.evaluate(() => {
    const g = document.querySelector('.ul-unlocks .ul-grid');
    const c = document.querySelector('.ul-unlocks .ul-card[data-id="wayfarer"]');
    if (g && c) g.scrollTop = c.offsetTop - g.offsetTop - 12;
  });
  await settle(600);
  await page.screenshot({ path: `${OUT}/${name}${suffix}.png` });
};
await shot('deed', 'deeds-1-deeds');
const wayfarer = await page.evaluate(() => {
  const c = document.querySelector('.ul-unlocks .ul-card[data-id="wayfarer"]');
  return c ? { text: c.textContent, bar: !!c.querySelector('.ul-goal i') } : null;
});
check(!!wayfarer && wayfarer.bar && /7/.test(wayfarer.text) && /14/.test(wayfarer.text), `Wayfarer shows its progress (${wayfarer && wayfarer.text.replace(/\s+/g, ' ').slice(0, 90)})`);
const done = await page.evaluate(() => [...document.querySelectorAll('.ul-unlocks .ul-card[data-state="done"]')].map((c) => c.dataset.id));
check(['run_to_ground', 'safe_home', 'crownbreaker', 'keyholder'].every((d) => done.includes(d)) && !done.includes('down_the_river'), `the deeds the runs met read done (${done.length})`);
await shot('kit', 'deeds-2-kits');
const kits = await page.evaluate(() => ['kit_dawnwatch', 'kit_earthwarden', 'kit_moonblade', 'kit_huntmaster', 'kit_stormwater'].map((id) => (document.querySelector(`.ul-unlocks .ul-card[data-id="${id}"]`) || {}).dataset?.state));
check(kits.every((s) => s === 'buy' || s === 'poor'), `the five new kits are on sale after Level IV (${kits.join(', ')})`);
await shot('vow', 'deeds-3-vows');
await shot('tint', 'deeds-4-tints');
const misses = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses || [] : []));
if (LANG !== 'en') check(misses.length === 0, `no untranslated lines (${misses.slice(0, 5).join(' | ')})`);
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS');
process.exit(fails.length ? 1 : 0);
