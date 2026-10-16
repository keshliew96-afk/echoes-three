#!/usr/bin/env node
// VOW RANKS screenshots (plan 4 slice 10), against `npm run dev`: a profile
// that has cleared Levels I to V and felled the Skyhorn Warden, with four
// vows sworn at ranks III, II, II and I (Vow level 8) and a campaign best of
// 8. Shots: the Unlocks screen's Vows tab, the Level Select's vow band (the
// Set out page), and the end card of a run set out from it. Checks the band
// and the end card name the Vow level, and that the page makes no errors or
// untranslated lines.
//   node tools/vow-ranks-shots.mjs [--url http://127.0.0.1:5199/] [--lang de] [--out dir]
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const LANG = opt('lang', 'en');
const OUT = opt('out', 'captures/vow-ranks');
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
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);

await page.goto(`${URL0}?seed=3&tips=0&story=0${LANG === 'en' ? '' : `&lang=${LANG}`}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);

// Levels I to V cleared (the vows are free on their milestones), the Skyhorn
// Warden felled (Heavy Bell), then four vows sworn: Vow level 8. (Short
// Fuse waits on the Once Around deed.)
const prof = await page.evaluate(() => {
  const S = window.__echoes.save;
  const lv = [1, 2, 3, 4, 5].map((l) => ({ level: l, index: l, cleared: true, rooms: 8, ...(l === 5 ? { boss: 'skyhorn' } : {}) }));
  S.awardRun({ act: 1, result: 'victory', victory: true, roomsCleared: 40, kills: 400, timeSec: 3000, seed: 3, challenge: 'standard', campaign: { mode: 'campaign', levels: lv, complete: true }, builds: ['healer', 'tank', 'archer', 'swordsman'].map((c) => ({ classId: c })) });
  S.setVowRank('vow_iron_hide', 3);
  S.setVowRank('vow_crowded', 2);
  S.setVowRank('vow_thin_air', 2);
  S.setVowRank('vow_elite_tide', 1);
  // A campaign won at this Vow level: the campaign best is 8.
  const b = S.boons();
  S.awardRun({ act: 1, result: 'victory', victory: true, roomsCleared: 40, kills: 400, timeSec: 3000, seed: 4, challenge: 'standard', campaign: { mode: 'campaign', levels: lv, complete: true }, boons: b });
  return { meta: S.profile().meta, boons: b };
});
const owned = Object.keys(prof.meta.owned).filter((id) => id.startsWith('vow_'));
check(owned.length === 7 && !owned.includes('vow_short_fuse'), `seven vows are owned, Short Fuse still waits on Once Around (${owned.join(', ')})`);
check(prof.meta.vowBest.campaign === 8, `the campaign best is Vow level 8 (${JSON.stringify(prof.meta.vowBest)})`);
check(prof.meta.deeds.includes('sworn_five'), 'Five Oaths is done');

await page.keyboard.press('KeyU');
await page.waitForFunction(() => !!document.querySelector('.ul-unlocks .ul-card'), { timeout: 60000, polling: 250 });
await settle(1000);
await page.click('.ul-unlocks .ul-tab[data-tab="vow"]');
await settle(900);
await page.screenshot({ path: `${OUT}/vow-ranks-1-vows${suffix}.png` });
// The side panel fits without scrolling (a full campaign plus deeds and four
// vows), at this size and at 1280x720.
const fits = () => page.evaluate(() => {
  const el = document.querySelector('.ul-unlocks .ul-side');
  return el ? { scroll: el.scrollHeight, client: el.clientHeight } : null;
});
const f1 = await fits();
check(!!f1 && f1.scroll <= f1.client + 1, `the side panel fits at ${W}x${H} (${JSON.stringify(f1)})`);
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await settle(2500);
const f2 = await fits();
check(!!f2 && f2.scroll <= f2.client + 1, `the side panel fits at 1280x720 (${JSON.stringify(f2)})`);
await page.screenshot({ path: `${OUT}/vow-ranks-1-vows-1280${suffix}.png` });
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await settle(900);
const cards = await page.evaluate(() => [...document.querySelectorAll('.ul-unlocks .ul-card')].map((c) => ({ id: c.dataset.id, rank: Number(c.dataset.rank), lit: c.querySelectorAll('.ul-rank i.on').length })));
const iron = cards.find((c) => c.id === 'vow_iron_hide');
check(iron && iron.rank === 3 && iron.lit === 3, `Iron Hide shows rank III with three pips lit (${JSON.stringify(iron)})`);
// One press steps Restless from off to rank I.
await page.click('.ul-unlocks .ul-card[data-id="vow_restless"]');
await settle(600);
const step = await page.evaluate(() => window.__echoes.save.profile().meta.loadout);
check(step.vows.includes('vow_restless') && !step.vowRanks.vow_restless, 'a press swears Restless at rank I');
await page.click('.ul-unlocks .ul-card[data-id="vow_restless"]');
await settle(600);
const step2 = await page.evaluate(() => window.__echoes.save.profile().meta.loadout);
check(step2.vowRanks.vow_restless === 2, 'a second press raises it to rank II');
await page.evaluate(() => window.__echoes.save.setVowRank('vow_restless', 0));
await settle(400);
await page.keyboard.press('Escape');
await settle(900);

// The Set out page: the Level Select's vow band.
await page.keyboard.press('KeyL');
await page.waitForFunction(() => !!document.querySelector('.cg-levels .cg-card'), { timeout: 60000, polling: 250 });
await settle(1200);
await page.screenshot({ path: `${OUT}/vow-ranks-2-set-out${suffix}.png` });
const band = await page.evaluate(() => {
  const el = document.querySelector('.cg-levels .cg-vows');
  return el && !el.hidden ? { text: el.textContent.replace(/\s+/g, ' ').trim(), level: (el.querySelector('.cg-vlv b') || {}).textContent } : null;
});
check(!!band && band.level === '8', `the band reads Vow level 8 (${band && band.text})`);
const daily = await page.evaluate(() => (document.querySelector('.cg-levels .cg-card.cg-daily .cg-danger') || {}).textContent);
check(!!daily && daily.length > 3, `the Daily card says it is vow-free (${daily})`);

// Set out from Level I: the run wears the boons, then ends on the card.
await page.click('.cg-levels .cg-card[data-level="1"]');
await page.waitForFunction(() => window.__echoes.cmd('runState').active, { timeout: 120000, polling: 500 });
await settle(1500);
const v = await cmd('runState');
const worn = await page.evaluate(() => {
  const r = window.__echoes.content.world().runSystem().view();
  return r.boons || null;
});
check(!!worn && worn.vows.length === 4 && worn.vowRanks.iron_hide === 3, `the run wears the vows (${JSON.stringify(worn)}; room ${v.room})`);
await cmd('endRun', 'defeat');
await page.waitForFunction(() => !!document.querySelector('.rn-end') && /VOW|誓|SCHWUR|VŒU|VOTO|ОБЕТ|서약/.test(document.querySelector('.rn-end .rn-summary')?.textContent || ''), { timeout: 120000, polling: 500 });
await settle(1500);
await page.screenshot({ path: `${OUT}/vow-ranks-3-end-card${suffix}.png` });
const endText = await page.evaluate(() => document.querySelector('.rn-end .rn-summary').textContent.replace(/\s+/g, ' '));
check(/8/.test(endText), `the end card names the Vow level (${(endText.match(/(VOW LEVEL[^A-Z]*)/) || [''])[0].trim()})`);

const misses = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses || [] : []));
if (LANG !== 'en') check(misses.length === 0, `no untranslated lines (${misses.slice(0, 5).join(' | ')})`);
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS');
process.exit(fails.length ? 1 : 0);
