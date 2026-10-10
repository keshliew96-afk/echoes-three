#!/usr/bin/env node
// ENDLESS in the real game (docs/ENDLESS.md): against `npm run dev` (port
// 5199), boots into camp with ?endless=1 (the harness unlock), opens the
// Level Select, clicks the Endless Descent card, jumps the descent to the
// Depth 4 -> 5 card (cmd endlessJump), sets out into Depth 5 and ends the run
// on a fall. Captures:
//   captures/endless-1-select.png   the Level Select with the Endless card (seven cards since Boss Rush)
//   captures/endless-2-card.png     "DEPTH 4 CLEARED" -> Depth 5
//   captures/endless-3-hud.png      Depth 5 in combat, the depth on the HUD
//   captures/endless-4-end.png      "THE DESCENT ENDS" end card
// and fails on any page error or a missing page.
//
//   node tools/endless-browser.mjs [--url http://127.0.0.1:5199/] [--seed 7]
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
  await page.goto(`${URL0}?menu=0&endless=1&seed=${SEED}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

  // 1. The Level Select: three levels and the Endless Descent card.
  const opened = await cmd('campLevels');
  check(opened === true, 'the Level Select opens from camp');
  await page.waitForSelector('.cg-levels .cg-card[data-level="endless"]', { visible: true, timeout: 60000 });
  await settle();
  const sel = await page.evaluate(() => {
    const c = document.querySelector('.cg-levels .cg-card[data-level="endless"]');
    const all = [...document.querySelectorAll('.cg-levels .cg-card')];
    return { cards: all.length, fifth: all.indexOf(c) === 4, locked: c.getAttribute('aria-disabled') === 'true', text: c.textContent.replace(/\s+/g, ' ').trim() };
  });
  check(sel.cards === 7 && sel.fifth && !sel.locked && /Endless Descent/.test(sel.text), `the Endless Descent card is the fifth card, open (${sel.text.slice(0, 80)})`);
  await page.screenshot({ path: 'captures/endless-1-select.png' });
  await page.click('.cg-levels .cg-card[data-level="endless"]');

  // 2. The descent starts at Level I; jump to the Depth 4 -> 5 card.
  let v = await waitPhase(['combat']);
  check(v.endless && v.endless.depth === 1 && v.act === 1, `clicking it sets out on Depth 1 in the Hollow Wood (${JSON.stringify(v.endless)})`);
  await cmd('endlessJump', 5);
  v = await waitPhase(['transit']);
  await settle();
  const card = await page.evaluate(() => ({
    kicker: document.querySelector('.rn-transit .rn-kicker')?.textContent,
    next: document.querySelector('.rn-transit .rn-nextname')?.textContent,
    flavour: document.querySelector('.rn-transit .rn-flavour')?.textContent,
  }));
  check(card.kicker === 'DEPTH 4 CLEARED' && /^Depth 5 · The Hollow Wood/.test(card.next || '') && /campaign is won/.test(card.flavour || ''), `the card reads ${JSON.stringify(card)}`);
  await page.screenshot({ path: 'captures/endless-2-card.png' });

  // 3. Into Depth 5: the HUD names the depth.
  await page.keyboard.press('Enter');
  v = await waitPhase(['combat']);
  check(v.endless && v.endless.depth === 5 && v.act === 1, `Depth 5 is live in the Wood (${JSON.stringify(v.endless)})`);
  await settle(4000);
  const hud = await page.evaluate(() => ({ name: document.querySelector('.hud-loc-name')?.textContent, sub: document.querySelector('.hud-loc-sub')?.textContent }));
  check(/^DEPTH 5 · ROOM 1\/8/.test(hud.sub || ''), `the HUD plate reads ${JSON.stringify(hud)}`);
  await page.screenshot({ path: 'captures/endless-3-hud.png' });

  // 4. A fall ends the descent: the end card and the profile record.
  await cmd('endRun', 'defeat');
  v = await waitPhase(['defeat']);
  await settle();
  const end = await page.evaluate(() => ({
    head: document.querySelector('.rn-end .rn-headline')?.textContent,
    flavour: document.querySelector('.rn-end .rn-flavour')?.textContent,
    summary: document.querySelector('.rn-end .rn-summary')?.textContent.replace(/\s+/g, ' ').trim(),
  }));
  check(end.head === 'THE DESCENT ENDS' && /DEPTH REACHED\s*5/.test(end.summary || '') && /New record/.test(end.summary || ''), `the end card reads ${JSON.stringify(end)}`);
  await page.screenshot({ path: 'captures/endless-4-end.png' });
  const rec = await page.evaluate(() => {
    const r = window.__echoes.save.profile().records;
    return { gameWon: r.gameWon, endlessRuns: r.endlessRuns, endlessBestDepth: r.endlessBestDepth };
  });
  check(rec.gameWon === true && rec.endlessRuns === 1 && rec.endlessBestDepth === 5, `the profile keeps ${JSON.stringify(rec)}`);
} catch (err) {
  check(false, `probe error: ${err && err.message ? err.message : err}`);
}
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks pass');
process.exit(fails.length ? 1 : 0);
