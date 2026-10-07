#!/usr/bin/env node
// SLICK FLOOR in the page (docs/SLICK_FLOOR.md), against the dev server:
//   - an Act II room on the Weir (layout 5) draws its two wet patches; the
//     Healer walking onto one gets the one-time tip on the bottom card (the
//     fight is not held), it is marked seen, and it does not come back;
//   - keys held then released on the patch: the Healer slides on; a dodge
//     on it carries further than the plain 1.8 u;
//   - an Act III room on the Moonwell (layout 9) draws its two frost patches;
//   - the tip text has a translation (no misses) in a non-English language;
//   - no page errors. Screenshots under --shots (default captures/slick).
//   node tools/slickfloor-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--shots dir]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=<a chrome wrapper adding --no-sandbox>.
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const LANG = opt('lang', 'en');
const SHOTS = opt('shots', 'captures/slick');
mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
const fails = [];
const check = (ok, what, got = null) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${got !== null ? ` ${JSON.stringify(got)}` : ''}`);
  if (!ok) fails.push(what);
  return ok;
};
const sfx = LANG === 'en' ? '' : `-${LANG}`;
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}${sfx}.png` });
const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const tick = () => page.evaluate(() => window.__echoes.tick);
const waitTicks = async (n) => {
  const t0 = await tick();
  await page.waitForFunction((t) => window.__echoes.tick >= t, { timeout: 300000, polling: 100 }, t0 + n);
};
const player = () => page.evaluate(() => {
  const p = window.__echoes.state().party.find((b) => b.kind === 'player');
  return { x: p.x, z: p.z };
});
const quiet = () => cmd('killAllEnemies');
async function holdTicks(key, ticks) {
  const t0 = await tick();
  await page.keyboard.down(key);
  try {
    while ((await tick()) < t0 + ticks) await settle(60);
  } finally {
    await page.keyboard.up(key);
  }
}
const slips = () => page.evaluate(() => window.__echoes.state().run && (window.__echoes.cmd('contentState').hazards || []).filter((h) => h.htype === 'slip'));
const tut = () => page.evaluate(() => window.__echoes.tutorial().debug());

// A live room of the act on the given layout (legacy single-level run: Act
// II rolls 4-6, Act III 7-9), enemies cleared.
// The room clears once its waves are gone: a test that needs it live
// re-enters it first. The Healer is made untouchable for the probe.
async function live(act, layoutId) {
  const v = await cmd('runState');
  const l = await page.evaluate(() => window.__echoes.cmd('contentState').layout);
  if (!(v && v.phase === 'combat' && l && l.layoutId === layoutId)) await roomOn(act, layoutId);
  await page.evaluate(() => {
    const p = window.__echoes.state().party.find((b) => b.kind === 'player');
    window.__echoes.cmd('iframe', p.id, 100000);
  });
}
async function roomOn(act, layoutId) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await cmd('runState');
    if (r && r.active) {
      await cmd('abandonRun', 'quit');
      await settle(600);
    }
    await cmd('startRun', { act });
    for (let n = 1; n <= 6; n++) {
      const v = await cmd('skipToRoom', n);
      const l = await page.evaluate(() => window.__echoes.cmd('contentState').layout);
      if (v.phase === 'combat' && l && l.layoutId === layoutId) {
        await settle(1200);
        await quiet();
        return true;
      }
    }
  }
  return false;
}

await page.goto(`${URL0}?menu=0&seed=7&tips=1&lang=${LANG}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await settle(1500);
await page.evaluate(() => window.__echoes.tutorial().resetTips());

// ------------------------------------------------------------ the Weir --
check(await roomOn(2, 5), 'an Act II room on the Weir');
let sl = await slips();
check(sl.length === 2 && sl.every((h) => h.skin === 'wet'), 'the Weir places two wet patches', sl.map((h) => [h.x, h.z, h.radius, h.skin]));
const render = await page.evaluate(() => window.__echoes.content.probe('render'));
check(render && render.byType && render.byType.slip === 2, 'the hazard layer draws both patches', render && render.byType);
// Stand just east of the big patch, looking at it.
const P0 = sl.find((h) => h.radius >= 1.4);
await cmd('teleport', P0.x + 2.6, P0.z - 0.4);
await waitTicks(30);
await settle(1500);
await shot('1-wet-weir');
const tip0 = await tut();
check(!tip0.floorTip && !tip0.tipsSeen.includes('slick'), 'no tip before the player touches the floor', tip0);

// Walk west onto it: the tip comes up on the bottom card.
await holdTicks('KeyA', 40);
await page.waitForFunction(() => window.__echoes.tutorial().debug().floorTip === 'slick', { timeout: 120000, polling: 200 });
const tip1 = await tut();
const card = await page.evaluate(() => {
  const c = document.getElementById('tu-coach');
  const r = c.getBoundingClientRect();
  return { on: c.classList.contains('tu-on'), title: c.querySelector('.tu-title').textContent, body: c.querySelector('.tu-body').textContent, top: r.top, bottom: r.bottom, modal: document.getElementById('tu-modal').classList.contains('tu-on') };
});
check(card.on && !card.modal && card.bottom <= 720, 'the slick floor tip shows on the bottom card (no centred card, the fight goes on)', card);
check(tip1.tipsSeen.includes('slick'), 'the tip is marked seen the moment it shows', tip1.tipsSeen);
const before = await tick();
await waitTicks(20);
check((await tick()) >= before + 20, 'the sim keeps running under the tip');
await shot('2-tip');
const misses = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses || [] : []));
check(LANG === 'en' || !misses.some((m) => /slick|Wet stone/i.test(String(m))), `the tip is translated (${LANG})`, misses.slice(0, 4));

// Slide: walk east across the patch, let go mid-patch.
await live(2, 5);
await cmd('teleport', P0.x - 1.2, P0.z);
await waitTicks(10);
await holdTicks('KeyD', 26);
const a = await player();
await waitTicks(50);
const b = await player();
check(b.x - a.x >= 0.2, 'released mid-patch, the Healer slides on', { from: a, to: b, slide: Math.round((b.x - a.x) * 1000) / 1000 });

// Dodge across it, and a screenshot mid-slide.
await live(2, 5);
await cmd('teleport', P0.x - 1.3, P0.z);
await waitTicks(10);
const c0 = await player();
await page.keyboard.down('KeyD');
await waitTicks(2);
await page.keyboard.down('Space');
await waitTicks(2);
await page.keyboard.up('Space');
await page.keyboard.up('KeyD');
await waitTicks(14);
await shot('3-wet-dodge-slide');
await waitTicks(60);
const c1 = await player();
check(c1.x - c0.x >= 2.2, 'a dodge on wet stone carries past the plain 1.8 u', { travel: Math.round((c1.x - c0.x) * 1000) / 1000 });
// Tip shows once only.
await waitTicks(30);
await settle(9500);
const tip2 = await tut();
check(!tip2.floorTip, 'the tip leaves on its own', tip2.floorTip);
await cmd('teleport', P0.x, P0.z);
await waitTicks(30);
await settle(800);
check(!(await tut()).floorTip, 'and does not come back on the next patch');

// ------------------------------------------------------------ the Moonwell --
check(await roomOn(3, 9), 'an Act III room on the Moonwell');
sl = await slips();
check(sl.length === 2 && sl.every((h) => h.skin === 'frost'), 'the Moonwell places two frost patches', sl.map((h) => [h.x, h.z, h.radius, h.skin]));
const F0 = sl.find((h) => h.x > 0) || sl[0];
await cmd('teleport', F0.x - 2.4, F0.z + 0.6);
await waitTicks(30);
await settle(1500);
await shot('4-frost-moonwell');
await live(3, 9);
await cmd('teleport', F0.x - 1.4, F0.z);
await waitTicks(10);
await page.keyboard.down('KeyD');
await waitTicks(2);
await page.keyboard.down('Space');
await waitTicks(2);
await page.keyboard.up('Space');
await page.keyboard.up('KeyD');
await waitTicks(14);
await shot('5-frost-dodge-slide');
await waitTicks(40);

check(errors.length === 0, 'no page errors', errors.slice(0, 3));
await browser.close();
console.log(fails.length ? `\nFAIL slick floor browser (${fails.length})` : '\nPASS slick floor browser');
process.exit(fails.length ? 1 : 0);
