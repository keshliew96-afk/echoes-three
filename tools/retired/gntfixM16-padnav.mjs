// fix-M1-r6 regression probe — gamepad menu navigation and the input-source / hint-glyph model,
// with FRAME-AWARE pad taps (the pad is polled once per rendered frame; on a machine loaded by
// concurrent agents the title renders at a few fps and the critic's fixed 70 ms taps are missed —
// the same on the pre-fix build). Each tap holds the button until >= 2 app frames have polled it,
// then releases it for >= 2 frames.
//   Q1 D-pad down / up move the ring one item; Q2 the hints switch to pad glyphs after pad input
//   Q3 key -> pad -> key: the hints follow the last device
//   Q4 a nav confirm's synthetic click is not mouse input (pad A opens Settings, hints stay pad)
//   Q5 RB / LB switch tabs, B closes Settings with focus restored on Settings
//   Q6 a trusted pointer press (no motion) makes the pointer the source; the next pad press takes it back
// Usage: [ECHOES_URL=<base>/] node tools/gntfixM16-padnav.mjs [--tag x]
import { launch, logger, sleep, URL_BASE, reachTitle, installGamepad } from './gntcmenu6-lib.mjs';

const tagIdx = process.argv.indexOf('--tag');
const TAG = tagIdx > 0 ? process.argv[tagIdx + 1] : 'run';
const log = logger(`gntfixM16-padnav-${TAG}`);
let fails = 0;
const check = (name, ok, data) => {
  if (!ok) fails++;
  log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data);
};
const browser = await launch({});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL_BASE + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
  await reachTitle(page);
  log('version', await page.evaluate(() => window.__echoes.version));
  await installGamepad(page);
  const frames = () => page.evaluate(() => window.__echoes.app.frameCount);
  const waitFrames = async (n) => {
    const f0 = await frames();
    for (let i = 0; i < 400; i++) {
      if ((await frames()) >= f0 + n) return;
      await sleep(25);
    }
  };
  await waitFrames(3);
  const ftap = async (b) => {
    await page.evaluate((x) => window.__gcPress(x, true), b);
    await waitFrames(2);
    await page.evaluate((x) => window.__gcPress(x, false), b);
    await waitFrames(2);
  };
  const F = () => page.evaluate(() => { const a = window.__echoes.app; const f = a.focus(); return { id: f && f.id, stack: a.stack().join('>'), src: a.lastSource() }; });
  const hints = () => page.evaluate(() => { const e = document.querySelector('[data-screen]:not([hidden]) .ap-title-foot, .ap-title-foot'); return e ? e.innerText.replace(/\s+/g, ' ') : null; });
  const order = await page.evaluate(() => window.__echoes.app.focusables().map((n) => n.id || (n.node && n.node.id) || String(n)));
  log('title order', order);
  const hk = await hints();
  let f = await F();
  const start = f.id;
  await ftap(13);
  f = await F();
  const iStart = order.indexOf(start);
  check('Q1 D-pad down moves one item', iStart >= 0 && f.id === order[(iStart + 1) % order.length], { start, now: f.id });
  const hp = await hints();
  check('Q2 hints switch to pad glyphs after pad input', hp !== hk && /\bA\b/.test(hp || ''), { hk, hp, src: f.src });
  await ftap(12);
  f = await F();
  check('Q1b D-pad up moves back', f.id === start, f);
  await page.keyboard.press('ArrowDown');
  await waitFrames(2);
  const hk2 = await hints();
  await ftap(12);
  const hp2 = await hints();
  await page.keyboard.press('ArrowUp');
  await waitFrames(2);
  const hk3 = await hints();
  check('Q3 key -> pad -> key: hints follow the last device', hk2 === hk && hp2 === hp && hk3 === hk, { hk2, hp2, hk3 });
  // To Settings by pad, A opens it; hints must stay pad (synthetic click is not mouse input).
  for (let i = 0; i < 10 && (await F()).id !== 'ap-title-settings'; i++) await ftap(13);
  await ftap(0);
  await waitFrames(3);
  f = await F();
  check('Q4 pad A opens Settings', f.stack === 'title>settings', f);
  check('Q4b the confirm click did not make the pointer the source', f.src === 'gamepad', f.src);
  const tabSel = () => page.evaluate(() => { const t = document.querySelector('[id^="ap-tab-"][aria-selected="true"]'); return t && t.id; });
  const t0 = await tabSel();
  await ftap(5);
  const tRB = await tabSel();
  await ftap(4);
  const tLB = await tabSel();
  check('Q5 RB next tab / LB back', tRB && tRB !== t0 && tLB === t0, { t0, tRB, tLB });
  await ftap(1);
  await waitFrames(3);
  f = await F();
  check('Q5b B closes Settings, focus restored on Settings', f.stack === 'title' && f.id === 'ap-title-settings', f);
  // Q6: rest the pointer on an empty spot of the page, use the pad, then press the pointer without motion.
  await page.mouse.move(8, 890);
  await waitFrames(2);
  await ftap(13);
  const srcPad = (await F()).src;
  await page.mouse.down();
  await page.mouse.up();
  await waitFrames(2);
  const srcPtr = (await F()).src;
  check('Q6 a pointer press with no motion makes the pointer the source', srcPad === 'gamepad' && srcPtr === 'mouse', { srcPad, srcPtr });
  await ftap(12);
  check('Q6b the next pad press takes the source back', (await F()).src === 'gamepad');
  log('page errors', errors.length, errors.slice(0, 3));
  if (errors.length) fails++;
  log(`TOTAL FAILS ${fails}`);
} finally {
  await browser.close();
}
process.exit(fails === 0 ? 0 : 1);
