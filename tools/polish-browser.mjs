#!/usr/bin/env node
// POLISH (v0.5.327), the browser half of tools/polish-probe.mjs, against
// `npm run dev` (port 5199):
//   levels    the Level Select with all nine cards open: at 1024x640 in each
//             language the cards stand in two rows and the whole screen fits
//             (no card, name, pip row or key hint cut off); → walks the cards
//             in order and the line under them reads the focused card's
//             blurb; at 1920x1080 in English they keep one row.
//   records   the Records screen in German and Japanese: a high score's day
//             reads in the game's language.
//   weights   the Hourwarden's Toll of the Hours at play zoom on the Spire
//             floor with the party fighting: the hang, the drop and the
//             landing, played by the template (content.vfx().foe).
//
//   node tools/polish-browser.mjs [--only levels,records,weights] [--langs de,ru] [--shots <dir>]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=<chrome> and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
import { mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const URL0 = arg('--url', 'http://127.0.0.1:5199/');
const only = argv.includes('--only') ? new Set(arg('--only').split(',')) : null;
const want = (k) => !only || only.has(k);
const LANGS = arg('--langs', 'en,de,es,fr,pt-BR,ru,ja,ko,zh-Hans,zh-Hant').split(',');
const SHOTS = resolve(here, arg('--shots', 'captures/polish'));
mkdirSync(SHOTS, { recursive: true });
let fails = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) fails++;
  return ok;
};
const errors = [];
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 900000, args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', ...extra] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A virtual clock for the weights' stills (vfx-foes.mjs): the page draws a
// frame only when the probe steps it.
const VCLOCK = () => {
  const realRaf = window.requestAnimationFrame.bind(window);
  const realNow = performance.now.bind(performance);
  let on = false;
  let vt = 0;
  let queue = [];
  window.requestAnimationFrame = (cb) => {
    if (on) {
      queue.push(cb);
      return queue.length;
    }
    return realRaf(cb);
  };
  performance.now = () => (on ? vt : realNow());
  window.__vclock = {
    start() {
      vt = realNow();
      on = true;
    },
    step(ms) {
      vt += ms;
      const q = queue;
      queue = [];
      for (const cb of q) cb(vt);
      return q.length;
    },
  };
};

async function open(lang, w, h, { seed = 7, vclock = false } = {}) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e?.message ?? e)));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  if (vclock) await page.evaluateOnNewDocument(VCLOCK);
  await page.goto(`${URL0}?menu=0&rush=1&fresh=1&seed=${seed}&lang=${lang}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60 && window.__echoes.save, { timeout: 300000, polling: 500 });
  return page;
}

// ------------------------------------------------------------ levels --
async function levels(lang, w, h, wantRows) {
  const page = await open(lang, w, h);
  await page.evaluate(() => window.__echoes.content.unlock([1, 2, 3, 4, 5, 6]));
  await page.evaluate(() => window.__echoes.cmd('campLevels'));
  await page.waitForSelector('.cg-levels .cg-card', { visible: true, timeout: 60000 });
  await sleep(1500);
  const m = await page.evaluate(() => {
    const wrap = document.querySelector('.cg-levels .cg-wrap');
    const wr = wrap.getBoundingClientRect();
    const cut = [];
    for (const c of document.querySelectorAll('.cg-levels .cg-card')) {
      const r = c.getBoundingClientRect();
      if (r.bottom > wr.bottom + 1 || r.right > wr.right + 1) cut.push(`${c.dataset.level} card`);
      for (const el of c.querySelectorAll('.cg-name, .cg-pips, .cg-skulls, .cg-status, .cg-grant, .cg-lock')) {
        const er = el.getBoundingClientRect();
        if (er.width && (er.right > r.right + 1 || er.bottom > r.bottom + 1)) cut.push(`${c.dataset.level} ${el.className}`);
      }
    }
    const foot = document.querySelector('.cg-levels .cg-foot').getBoundingClientRect();
    if (foot.bottom > Math.min(wr.bottom, innerHeight) + 1) cut.push('key hints');
    return { fits: wrap.scrollHeight <= wrap.clientHeight + 1, rows: document.querySelector('.cg-cards').classList.contains('cg-rows'), cut, detail: document.querySelector('.cg-detail').textContent };
  });
  check(m.fits && m.cut.length === 0, `${lang} ${w}x${h}: the Level Select fits${m.cut.length ? ` (cut: ${m.cut.join(', ')})` : ''}`);
  check(m.rows === wantRows, `${lang} ${w}x${h}: ${wantRows ? 'two rows' : 'one row'}`);
  if (wantRows) {
    // → from Level I walks the cards in order; the line reads the focus.
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('ArrowLeft');
      await sleep(150);
    }
    const order = [];
    for (let i = 0; i < 8; i++) {
      const f = await page.evaluate(() => {
        const c = document.querySelector('.cg-levels .cg-card.ap-focus') || document.activeElement;
        return { level: c && c.dataset ? c.dataset.level : null, blurb: c && c.querySelector('.cg-blurb') ? c.querySelector('.cg-blurb').textContent : null, line: document.querySelector('.cg-detail').textContent };
      });
      order.push(f);
      await page.keyboard.press('ArrowRight');
      await sleep(250);
    }
    const levelsSeen = order.map((o) => o.level).join(',');
    // (Endless stays locked on a profile that has not won, so focus skips it.)
    check(levelsSeen === '1,2,3,4,5,6,daily,rush', `${lang}: → walks the open cards in order (${levelsSeen})`);
    check(order.every((o) => !o.blurb || o.line === o.blurb), `${lang}: the line under the rows reads the focused card's blurb`);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowLeft');
      await sleep(150);
    }
  }
  await page.screenshot({ path: join(SHOTS, `level-select-${lang}-${w}x${h}.png`) });
  await page.close();
}

// ----------------------------------------------------------- records --
async function records(lang) {
  // (1600x900: below about 1100 px wide the Records table drops its date column.)
  const page = await open(lang, 1600, 900);
  await page.evaluate(() => {
    const s = window.__echoes.app.service('save');
    for (let i = 0; i < 4; i++) s.recordRun({ act: 1 + (i % 3), victory: i % 2 === 0, roomsCleared: 4 + i, kills: 30 + i * 7, timeSec: 500 + i * 40, seed: 900 + i, challenge: 'standard', lastRoom: 4 + i });
  });
  await page.evaluate(() => window.__echoes.app.open('records'));
  await sleep(1500);
  const got = await page.evaluate((lang) => {
    const want = new Date().toLocaleDateString(lang, { day: 'numeric', month: 'short' });
    const cells = [...document.querySelectorAll('.sv-opt')].map((c) => c.textContent.trim());
    return { want, cells };
  }, lang);
  check(got.cells.length > 0 && got.cells.includes(got.want), `${lang}: a high score's day reads "${got.want}" (${got.cells.slice(0, 4).join(' | ')})`);
  await page.screenshot({ path: join(SHOTS, `records-${lang}.png`) });
  await page.close();
}

// ----------------------------------------------------------- weights --
async function weights() {
  const page = await open('en', 1280, 720, { seed: 41, vclock: true });
  await page.addStyleTag({ content: '.rn-page, #run-veil { display: none !important; }' });
  await page.evaluate(() => __echoes.cmd('startCampaign', { level: 5, lineup: ['healer', 'tank', 'swordsman', 'archer'] }));
  await page.waitForFunction(() => (__echoes.state().run || {}).phase === 'combat', { timeout: 300000, polling: 250 });
  await page.evaluate(() => {
    const X = __echoes;
    X.sim.freeze();
    __vclock.start();
    X.cmd('bossPick', 'hourwarden');
    X.cmd('skipToRoom', 8);
    for (let i = 0; i < 80 && (X.state().run || {}).phase !== 'combat'; i++) X.sim.stepN(30, null);
    X.cmd('partyMode', 'auto');
    X.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true });
  });
  const boss = () => page.evaluate(() => {
    const b = __echoes.content.world().entities().find((e) => e.kind === 'hourwarden' || e.bossKind === 'hourwarden');
    return b ? { tick: __echoes.content.world().tick, next: b.nextTollTick ?? null, hp: b.hp } : null;
  });
  const row = () => page.evaluate(() => (__echoes.content.vfx().foe || {}).hourwarden || {});
  const step = (ticks) => page.evaluate((k) => (__echoes.sim.stepN(k, null), __vclock.step((k * 1000) / 60)), ticks);
  // Run up to the toll on frames of 6 ticks, then 2 ticks a frame.
  for (let i = 0; i < 400; i++) {
    const b = await boss();
    if (!b) break;
    if (b.next != null && b.next - b.tick <= 4) break;
    await page.evaluate(() => {
      for (const m of __echoes.state().party || []) __echoes.cmd('setHp', m.id, 1);
    });
    await step(6);
  }
  const shotsAt = { hang: null, drop: null, land: null };
  let landed0 = (await row()).ring ?? 0;
  for (let i = 0; i < 70; i++) {
    await step(2);
    const r = await row();
    if (!shotsAt.hang && (r.weight ?? 0) > 0) {
      await step(2);
      await page.screenshot({ path: join(SHOTS, 'weights-1-hang.png') });
      shotsAt.hang = i;
    } else if (shotsAt.hang != null && !shotsAt.drop && (r.drop ?? 0) > 0) {
      await step(4);
      await page.screenshot({ path: join(SHOTS, 'weights-2-drop.png') });
      shotsAt.drop = i;
      landed0 = r.ring ?? 0;
    } else if (shotsAt.drop != null && !shotsAt.land && (r.ring ?? 0) > landed0) {
      await step(2);
      await page.screenshot({ path: join(SHOTS, 'weights-3-land.png') });
      shotsAt.land = i;
      break;
    }
  }
  const r = await row();
  console.log('info hourwarden beats:', JSON.stringify(r));
  check((r.weight ?? 0) >= 3, `the Toll's weights each blink in on a thread (${r.weight ?? 0})`);
  check((r.drop ?? 0) >= 1, `they drop trailing the template's light (${r.drop ?? 0})`);
  check(shotsAt.land != null, 'their landing plays the template ring');
  await page.close();
}

if (want('levels')) {
  for (const lang of LANGS) await levels(lang, 1024, 640, true);
  await levels('en', 1920, 1080, false);
}
if (want('records')) for (const lang of ['de', 'ja']) await records(lang);
if (want('weights')) await weights();
check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 4).join(' | ')}` : ''}`);
await browser.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
