#!/usr/bin/env node
// BOSS RUSH in the real game (docs/BOSS_RUSH.md): against `npm run dev` (port
// 5199), boots into camp with ?rush=1 (the harness unlock), opens the Level
// Select, clicks the Boss Rush card, reads the setting-out card, fights fight 1
// (the boss felled by cmd), takes the draft and the relic, reads the card to
// fight 2, visits the Peddler, walks into fight 2 and ends the run on a fall.
// Captures captures/rush-*.png and fails on any page error.
//
//   node tools/boss-rush-browser.mjs [--url http://127.0.0.1:5199/] [--seed 7] [--lang de]
// (--lang: only the Level Select and the setting-out card, in that language.)
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
const SEED = Number(opt('seed', '7'));
const LANG = opt('lang', null);
const TAG = LANG ? `-${LANG}` : '';
const W = 1600;
const H = 900;
mkdirSync('captures', { recursive: true });

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
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
async function waitPhase(phases, timeout = 300000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
const settle = (ms = 2500) => new Promise((r) => setTimeout(r, ms));

try {
  await page.goto(`${URL0}?menu=0&rush=1&seed=${SEED}${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

  // 1. The Level Select: seven cards, Boss Rush the seventh.
  const opened = await cmd('campLevels');
  check(opened === true, 'the Level Select opens from camp');
  await page.waitForSelector('.cg-levels .cg-card[data-level="rush"]', { visible: true, timeout: 60000 });
  await settle();
  const sel = await page.evaluate(() => {
    const c = document.querySelector('.cg-levels .cg-card[data-level="rush"]');
    const all = [...document.querySelectorAll('.cg-levels .cg-card')];
    const r = c.getBoundingClientRect();
    const over = all.some((x) => x.scrollHeight > x.clientHeight + 2);
    return { cards: all.length, seventh: all.indexOf(c) === 6, locked: c.getAttribute('aria-disabled') === 'true', text: c.textContent.replace(/\s+/g, ' ').trim(), inView: r.right <= window.innerWidth && r.left >= 0, over };
  });
  check(sel.cards === 7 && sel.seventh && !sel.locked && sel.inView, `the Boss Rush card is the seventh card, open, on screen (${sel.text.slice(0, 90)})`);
  await page.screenshot({ path: `captures/rush-1-select${TAG}.png` });
  if (LANG) {
    const misses = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : []));
    check(!misses.some((m) => /rush|Rush|BOSS/.test(String(m))), `no missing ${LANG} lines on the card (${misses.slice(0, 4).join(' | ')})`);
  }
  await page.click('.cg-levels .cg-card[data-level="rush"]');

  // 2. The setting-out card names the eight bosses.
  let v = await waitPhase(['transit']);
  await settle();
  const dep = await page.evaluate(() => ({ kicker: document.querySelector('.rn-transit .rn-kicker')?.textContent, head: document.querySelector('.rn-transit .rn-headline')?.textContent, line: document.querySelector('.rn-transit .rn-flavour')?.textContent, next: document.querySelector('.rn-transit .rn-nextname')?.textContent }));
  check(LANG || (dep.kicker === 'THE BOSS RUSH' && (dep.line || '').split(' · ').length === 8), `the setting-out card reads ${JSON.stringify(dep)}`);
  await page.screenshot({ path: `captures/rush-2-setout${TAG}.png` });
  if (LANG) throw 'done';

  // 3. Fight 1 in the boss room of the Wood.
  await page.keyboard.press('Enter');
  v = await waitPhase(['combat']);
  check(v.rush && v.rush.fight === 1 && v.room === 8 && v.act === 1, `fight 1 is live in the Wood's boss room (${JSON.stringify(v.rush)} room ${v.room})`);
  await settle(5000);
  const hud = await page.evaluate(() => ({ name: document.querySelector('.hud-loc-name')?.textContent, sub: document.querySelector('.hud-loc-sub')?.textContent }));
  check(/^BOSS RUSH · FIGHT 1\/8 · /.test(hud.sub || ''), `the HUD plate reads ${JSON.stringify(hud)}`);
  await page.screenshot({ path: 'captures/rush-3-fight.png' });

  // 4. Fell it: the draft, the relic pick, then the card to fight 2.
  await cmd('killBoss');
  v = await waitPhase(['reward']);
  await settle();
  await page.screenshot({ path: 'captures/rush-4-draft.png' });
  await cmd('draftTake');
  v = await waitPhase(['relic', 'transit']);
  if (v.phase === 'relic') {
    await cmd('relicChoose', 0);
    v = await waitPhase(['transit']);
  }
  await settle();
  const card = await page.evaluate(() => ({ kicker: document.querySelector('.rn-transit .rn-kicker')?.textContent, next: document.querySelector('.rn-transit .rn-nextname')?.textContent }));
  check(card.kicker === 'FIGHT 1 OF 8 WON' && /^Fight 2 of 8 · /.test(card.next || ''), `the card reads ${JSON.stringify(card)}`);
  await page.screenshot({ path: 'captures/rush-5-card.png' });

  // 5. Fight 2 opens at the Peddler.
  await page.keyboard.press('Enter');
  v = await waitPhase(['shop']);
  await settle(4000);
  const hud2 = await page.evaluate(() => ({ name: document.querySelector('.hud-loc-name')?.textContent, sub: document.querySelector('.hud-loc-sub')?.textContent }));
  check(v.room === 7 && v.act === 2 && /FIGHT 2\/8/.test(hud2.sub || ''), `fight 2 opens at the Peddler in the Mill (${JSON.stringify(hud2)})`);
  await page.screenshot({ path: 'captures/rush-6-shop.png' });
  await cmd('shopAdvance');
  v = await waitPhase(['combat']);
  await settle(4000);
  await page.screenshot({ path: 'captures/rush-7-fight2.png' });

  // 6. A fall ends the rush: the end card and the profile.
  await cmd('endRun', 'defeat');
  v = await waitPhase(['defeat']);
  await settle();
  const end = await page.evaluate(() => ({
    head: document.querySelector('.rn-end .rn-headline')?.textContent,
    flavour: document.querySelector('.rn-end .rn-flavour')?.textContent,
    summary: document.querySelector('.rn-end .rn-summary')?.textContent.replace(/\s+/g, ' ').trim(),
  }));
  check(end.head === 'THE BOSS RUSH ENDS' && /BOSSES FELLED\s*1 \/ 8/.test(end.summary || ''), `the end card reads ${JSON.stringify(end)}`);
  await page.screenshot({ path: 'captures/rush-8-end.png' });
  const rec = await page.evaluate(() => {
    const r = window.__echoes.save.profile().records;
    return { gameWon: r.gameWon, rushRuns: r.rushRuns, rushMostFelled: r.rushMostFelled, clears: r.levelClears };
  });
  check(rec.gameWon === false && rec.rushRuns === 1 && rec.rushMostFelled === 1 && !(rec.clears[1] > 0), `the profile keeps ${JSON.stringify(rec)}`);
} catch (err) {
  if (err !== 'done') check(false, `probe error: ${err && err.message ? err.message : err}`);
}
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks pass');
process.exit(fails.length ? 1 : 0);
