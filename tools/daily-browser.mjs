#!/usr/bin/env node
// DAILY DESCENT in the real game (docs/DAILY.md): against a served build
// (`npm run build && node server/index.mjs --static dist --port 7821
// --origins self`), seeds today's board with a few runs, opens the Level
// Select, clicks the Daily card, reads the day's screen (relic, curse,
// board), sets out, checks the run and the HUD, ends it on a fall and reads
// the end card's board place. Captures (to --dir, default captures/):
//   daily-1-select.png  the Level Select with the Daily card
//   daily-2-screen.png  the day's screen: omen and board
//   daily-3-hud.png     the day's run, room 1
//   daily-4-end.png     the end card with the board's answer
//   daily-5-board.png   the day's screen again, the run on the board
//
//   node tools/daily-browser.mjs [--url http://127.0.0.1:7821/] [--lang de] [--dir captures]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:7821/');
const LANG = opt('lang', null);
const DIR = opt('dir', 'captures');
const SFX = LANG ? `-${LANG}` : '';
const W = 1600;
const H = 900;
mkdirSync(DIR, { recursive: true });
const today = new Date().toISOString().slice(0, 10);

// Today's board: a few other players.
const others = [
  ['Bramblefoot', 'tank', 21, 61000],
  ['Mirela', 'archer', 19, 52000],
  ['Owlkin', 'swordsman', 13, 33000],
  ['Tamsin', 'healer', 9, 21000],
  ['Corvo', 'archer', 4, 9000],
];
for (const [i, [name, cls, depth, ticks]] of others.entries()) {
  await fetch(new URL('/daily/score', URL0), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: today, id: `browser-probe-other-${i}-000`, name, cls, depth, ticks, won: false }) });
}

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
const shot = (n) => page.screenshot({ path: `${DIR}/${n}${SFX}.png` });

try {
  await page.goto(`${URL0}?menu=0&seed=7&netname=Kesh${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });

  // 1. The Level Select: the Daily card after Endless.
  check((await cmd('campLevels')) === true, 'the Level Select opens from camp');
  await page.waitForSelector('.cg-levels .cg-card[data-level="daily"]', { visible: true, timeout: 60000 });
  await settle();
  const sel = await page.evaluate(() => {
    const c = document.querySelector('.cg-levels .cg-card[data-level="daily"]');
    const cards = [...document.querySelectorAll('.cg-levels .cg-card')];
    const r = c.getBoundingClientRect();
    return { n: cards.length, last: cards[cards.length - 1] === c, locked: c.getAttribute('aria-disabled') === 'true', text: c.textContent.replace(/\s+/g, ' ').trim(), inView: r.right <= innerWidth && r.bottom <= innerHeight };
  });
  check(sel.n === 6 && sel.last && !sel.locked && sel.inView, `the Daily card is the sixth card, open, on screen (${sel.text.slice(0, 120)})`);
  await shot('daily-1-select');
  await page.click('.cg-levels .cg-card[data-level="daily"]');

  // 2. The day's screen: relic, curse, board with the five others.
  await page.waitForSelector('.dl-daily .dl-wrap', { visible: true, timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.dl-daily .dl-row:not(.dl-hd)').length >= 5, { timeout: 60000, polling: 250 });
  await settle(1500);
  const omen = await page.evaluate(() => ({ day: window.__echoes.daily().today(), omen: window.__echoes.daily().omen(window.__echoes.daily().today()), relic: document.querySelector('.dl-relic .dl-name').textContent, curse: document.querySelector('.dl-curse .dl-name').textContent, rows: document.querySelectorAll('.dl-daily .dl-row:not(.dl-hd)').length }));
  check(omen.relic && omen.relic !== '—' && omen.curse && omen.curse !== '—' && omen.rows === 5, `the day's screen shows ${JSON.stringify(omen)}`);
  await shot('daily-2-screen');
  await page.click('.dl-daily .dl-go');

  // 3. The run: the day's seed, its relic and curse, the HUD says DAILY.
  let v = await waitPhase(['combat']);
  const st = await page.evaluate(() => {
    const r = window.__echoes.cmd('runState');
    return { daily: r.daily, act: r.act, challenge: r.challenge };
  });
  check(st.daily && st.daily.key === omen.day && st.act === 1 && st.challenge === 'standard', `the day's run is live at Level I (${JSON.stringify({ daily: st.daily, act: st.act })})`);
  await settle(5000);
  const hud = await page.evaluate(() => ({ sub: document.querySelector('.hud-loc-sub')?.textContent }));
  check(/^DAILY · ROOM 1\/8/.test(hud.sub || '') || !!LANG, `the HUD plate reads ${JSON.stringify(hud)}`);
  await shot('daily-3-hud');

  // 4. A fall ends it: the end card names the board place.
  await cmd('skipToRoom', 4);
  await settle(2000);
  await cmd('endRun', 'defeat');
  v = await waitPhase(['defeat']);
  await page.waitForFunction(() => /#\d+/.test(document.querySelector('.rn-end .rn-summary')?.textContent || ''), { timeout: 60000, polling: 250 });
  await settle();
  const end = await page.evaluate(() => ({
    head: document.querySelector('.rn-end .rn-headline')?.textContent,
    summary: document.querySelector('.rn-end .rn-summary')?.textContent.replace(/\s+/g, ' ').trim(),
    last: window.__echoes.daily().last(),
  }));
  check(end.last && end.last.state === 'posted' && end.last.depth === 3 && end.last.rank === 6 && end.last.total === 6, `the run is posted: ${JSON.stringify(end.last)}`);
  check(LANG || (end.head === 'THE DAILY DESCENT ENDS' && /#6 of 6 today/.test(end.summary)), `the end card reads ${JSON.stringify(end.head)} / ${end.summary.slice(0, 160)}`);
  await shot('daily-4-end');

  // 5. Back in camp the day's screen shows the run on the board.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'idle', { timeout: 300000, polling: 500 });
  await settle(3000);
  check((await cmd('campDaily')) === true, 'the day screen opens again from camp');
  await page.waitForFunction(() => !!document.querySelector('.dl-daily .dl-row.dl-me'), { timeout: 60000, polling: 250 });
  await settle(1500);
  const me = await page.evaluate(() => ({ me: document.querySelector('.dl-daily .dl-row.dl-me')?.textContent.replace(/\s+/g, ' ').trim(), best: document.querySelector('.dl-daily .dl-best')?.textContent }));
  check(/Kesh/.test(me.me || ''), `the player's row is marked: ${JSON.stringify(me)}`);
  await shot('daily-5-board');
  await page.keyboard.press('Escape');
} catch (err) {
  check(false, `probe error: ${err && err.message ? err.message : err}`);
}
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks pass');
process.exit(fails.length ? 1 : 0);
