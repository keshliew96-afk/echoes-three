// fix-M1-r5 (MENU-R5-F2) — the overflow safety net: in a window too small for the Controls reference
// (below the G1.1 sizes, e.g. browser zoom), every row is still reachable by keyboard, gamepad D-pad,
// right stick and wheel; the box fades at the cut edge; the ring never leaves the screen; resizing back
// to 1024x576 removes the stop. Real keys / mocked pad only.
// Usage: ECHOES_URL=http://127.0.0.1:5199/ node tools/gntfixM15-overflow.mjs
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, installGamepad, padTap, focusInfo } from './gntfixM15-clib.mjs';
const log = logger(`gntfixM15-overflow-${(process.argv[2] || '960x470')}`);
const [W, H] = (process.argv[2] || '960x470').split('x').map(Number);
const STEPS_MIN = Number(process.argv[3] || 1); // scroll steps expected before the ring moves on
let fails = 0;
const check = (name, ok, data) => {
  if (!ok) fails += 1;
  log(`${ok ? 'PASS' : 'FAIL'} ${name}`, data ?? '');
};
const st = (page) =>
  page.evaluate(() => {
    const wrap = document.querySelector('[data-screen="settings"] .ap-tabwrap');
    const wr = wrap.getBoundingClientRect();
    const body = wrap.querySelector('.ap-tabbody.ap-active');
    const vis = [...body.querySelectorAll('.ap-ref-row, p.ap-note')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.top >= wr.top - 0.5 && r.bottom <= wr.bottom + 0.5; })
      .map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40));
    const f = window.__echoes.app.focus();
    const hints = document.querySelector('[data-screen="settings"] .ap-set-foot .ap-hints');
    return {
      top: Math.round(wrap.scrollTop), max: wrap.scrollHeight - wrap.clientHeight, focus: f && f.id, ring: window.__echoes.app.ringCount(),
      below: wrap.classList.contains('ap-more-below'), above: wrap.classList.contains('ap-more-above'),
      stop: !!body.querySelector('.ap-scrollstop[data-nav]'), vis, hints: hints ? hints.textContent.replace(/\s+/g, ' ').trim() : null,
      wrapRing: getComputedStyle(wrap).outlineStyle !== 'none' && getComputedStyle(wrap).outlineWidth !== '0px',
    };
  });
const browser = await launch({ width: W, height: H });
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: W, height: H });
  await installGamepad(page);
  await reachTitle(page);
  for (let i = 0; i < 10 && (await focusInfo(page)).id !== 'ap-title-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(160); }
  await page.keyboard.press('Enter'); await sleep(700);
  // walk to the Controls tab ON THE TAB BAR (ArrowUp from the first row puts the ring on the tab)
  await page.keyboard.press('ArrowUp'); await sleep(250);
  for (let i = 0; i < 6; i++) {
    const sel = await page.evaluate(() => document.querySelector('[data-screen="settings"] [aria-selected="true"]')?.id);
    if (sel === 'ap-tab-controls') break;
    await page.keyboard.press('KeyE'); await sleep(350);
  }
  let s = await st(page);
  log('K0 on the Controls tab', s);
  check('K0 overflowing box has a scroll stop + bottom fade', s.stop && s.max > 20 && s.below && !s.above && s.ring === 1, s);
  // keyboard: Down enters the stop at the top, then scrolls to the end, then moves on to Back
  const seen = new Set(s.vis);
  const all = await page.evaluate(() => [...document.querySelectorAll('[data-screen="settings"] .ap-tabbody.ap-active .ap-ref-row, [data-screen="settings"] .ap-tabbody.ap-active p.ap-note')].map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)));
  await page.keyboard.press('ArrowDown'); await sleep(250);
  s = await st(page);
  check('K1 Down -> the reference stop, top 0, one ring on the box, hints say Scroll', s.focus === 'ap-scroll-controls' && s.top === 0 && s.ring === 1 && s.wrapRing && /Scroll/.test(s.hints || ''), s);
  const seq = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('ArrowDown'); await sleep(220);
    s = await st(page);
    s.vis.forEach((v) => seen.add(v));
    seq.push([s.top, s.focus]);
    if (s.focus !== 'ap-scroll-controls') break;
  }
  log('K2 Down sequence [scrollTop, focus]', seq);
  const last = seq[seq.length - 1];
  const beforeLeave = seq[seq.length - 2];
  check('K2 Down scrolls step by step to the end, then the ring moves to Back', last && last[1] === 'ap-settings-back' && beforeLeave && beforeLeave[0] >= s.max - 1 && seq.length - 1 >= STEPS_MIN && seq.slice(0, -1).every((x, i, a) => i === 0 || x[0] > a[i - 1][0]), { seq, max: s.max });
  check('K3 every reference row was fully visible at some point', all.every((t) => seen.has(t)), { missing: all.filter((t) => !seen.has(t)) });
  check('K4 at the end: top fade, no bottom fade', s.above && !s.below, s);
  await page.keyboard.press('ArrowUp'); await sleep(250);
  s = await st(page);
  check('K5 Up from Back -> the stop, content at its END', s.focus === 'ap-scroll-controls' && s.top >= s.max - 1, s);
  const up = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('ArrowUp'); await sleep(220);
    s = await st(page);
    up.push([s.top, s.focus]);
    if (s.focus !== 'ap-scroll-controls') break;
  }
  check('K6 Up scrolls back to the top, then the ring goes to the Controls tab', up[up.length - 1][1] === 'ap-tab-controls' && up[up.length - 2][0] === 0, up);
  // gamepad D-pad
  await padTap(page, 13); await sleep(200);
  s = await st(page);
  const p0 = s.focus;
  await padTap(page, 13); await sleep(200);
  const s1 = await st(page);
  check('G1 D-pad down enters the stop, then scrolls', p0 === 'ap-scroll-controls' && s1.focus === 'ap-scroll-controls' && s1.top > 0, { p0, s1 });
  // right stick from the tab bar (focus elsewhere): scrolls the box without moving focus
  await page.evaluate(() => { document.querySelector('[data-screen="settings"] .ap-tabwrap').scrollTop = 0; });
  for (let i = 0; i < 6 && (await st(page)).focus !== 'ap-tab-controls'; i++) { await padTap(page, 12); await sleep(150); }
  const f0 = (await st(page)).focus;
  await page.evaluate(() => window.__gcAxis(3, 1)); await sleep(900); await page.evaluate(() => window.__gcAxis(3, 0)); await sleep(200);
  const r1 = await st(page);
  await page.evaluate(() => window.__gcAxis(3, -1)); await sleep(900); await page.evaluate(() => window.__gcAxis(3, 0)); await sleep(200);
  const r2 = await st(page);
  check('G2 right stick (ring on the Controls tab) down -> end, up -> top; focus unchanged', f0 === 'ap-tab-controls' && r1.top >= r1.max - 1 && r2.top === 0 && r1.focus === f0 && r2.focus === f0, { f0, r1: [r1.top, r1.max, r1.focus], r2: [r2.top, r2.focus] });
  // mouse wheel
  const box = await page.evaluate(() => { const r = document.querySelector('[data-screen="settings"] .ap-tabwrap').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(box.x, box.y); await page.mouse.wheel({ deltaY: 400 }); await sleep(400);
  const w1 = await st(page);
  check('M1 wheel scrolls', w1.top > 0, w1.top);
  await page.screenshot({ path: `${CAP}/gntfixM15-overflow-${W}.png` });
  // resize to 1024x576: everything fits, the stop goes away, the ring stays on a live item
  await page.keyboard.press('ArrowDown'); await sleep(200);
  await page.setViewport({ width: 1024, height: 576 }); await sleep(900);
  const z = await st(page);
  check('R1 at 1024x576 no stop, no fades, one ring on a live item', !z.stop && !z.below && !z.above && z.ring === 1 && !!z.focus && z.max <= 0, z);
  await page.screenshot({ path: `${CAP}/gntfixM15-overflow-1024.png` });
  await page.setViewport({ width: W, height: H }); await sleep(900);
  const z2 = await st(page);
  check(`R2 back at ${W}x${H} the stop returns`, z2.stop && z2.below, z2);
  check('Z 0 page errors', errors.length === 0, errors);
} catch (e) {
  fails += 1;
  log('ERR', String((e && e.stack) || e));
} finally {
  await browser.close();
}
log(`TOTAL FAILS ${fails}`);
process.exit(fails ? 1 : 0);
