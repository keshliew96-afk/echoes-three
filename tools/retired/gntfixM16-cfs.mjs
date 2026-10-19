// fix-M1-r6: verbatim copy of tools/gntcmenu6-fs.mjs (menu critic r6), outputs renamed gntfixM16-cfs.
// Menu critic r6 — G1.5 fullscreen + G1.9 (entering fullscreen: Keep/Revert timeout), resize handling,
// external exit sync, Esc-after-exit guard, pad A honesty, Alt+Enter. Real keys (trusted gestures).
import { launch, logger, sleep, CAP, URL_BASE, installFrameCounter, installGamepad, padTap } from './gntcmenu6-lib.mjs';
import { waitReady } from './gnt-arch-browser.mjs';
const log = logger('gntfixM16-cfs');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const W = 1600, H = 900;
const browser = await launch({ width: W, height: H });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await installFrameCounter(page);
  await page.goto(URL_BASE + '?menu=0&seed=7&fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: 180000 });
  await waitReady(page, { minTick: 240, timeout: 180000 });
  await page.evaluate(() => {
    window.__gcFs = [];
    document.addEventListener('fullscreenchange', () => { const c = document.querySelector('canvas'); window.__gcFs.push({ t: performance.now(), fs: !!document.fullscreenElement, set: window.__echoes.settings.get('display.fullscreen'), iw: innerWidth, ih: innerHeight, cw: c.width, ch: c.height }); });
  });
  const F = () => page.evaluate(() => { const a = window.__echoes.app; const f = a.focus(); return { id: f && f.id, stack: a.stack().join('>'), ring: a.ringCount(), state: a.state }; });
  const S = () => page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); const row = document.querySelector('[data-row-id="ap-display-mode"]'); return { fsEl: document.fullscreenElement ? document.fullscreenElement.tagName : null, set: window.__echoes.settings.get('display.fullscreen'), iw: innerWidth, ih: innerHeight, cw: c.width, ch: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height), row: row ? row.innerText.replace(/\s+/g, ' ') : null, disp: window.__echoes.app.display() }; });
  const toSettingsRow = async (rowId) => {
    let f = await F();
    if (f.stack === '') { await page.keyboard.press('Escape'); await sleep(500); }
    f = await F();
    if (f.stack === 'pause') { for (let i = 0; i < 6 && (await F()).id !== 'pz-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); } await page.keyboard.press('Enter'); await sleep(700); }
    for (let i = 0; i < 10 && (await F()).id !== rowId; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); }
    return F();
  };
  let f = await toSettingsRow('ap-display-mode');
  log('on mode row', f, await S());
  const t0 = await page.evaluate(() => performance.now());
  await page.keyboard.press('ArrowRight');
  await sleep(600);
  let s1 = await S(); const ev1 = await page.evaluate(() => window.__gcFs.slice());
  log('after Right on Display mode', s1, ev1);
  const dt = ev1.length ? +(ev1[0].t - t0).toFixed(0) : null;
  check('G1.5a Right on Display mode -> document.fullscreenElement within 500 ms, setting true', s1.fsEl && s1.set === true && dt !== null && dt <= 500, { dt, fsEl: s1.fsEl, set: s1.set });
  check('G1.5b canvas = window size in fullscreen', s1.cssW === s1.iw && s1.cssH === s1.ih && s1.cw === Math.round(s1.iw * s1.disp.renderScale * Math.min(s1.disp.dpr, 2)), { iw: s1.iw, ih: s1.ih, cssW: s1.cssW, cssH: s1.cssH, cw: s1.cw, ch: s1.ch });
  await page.screenshot({ path: `${CAP}/gntfixM16-cfs-on.png` });
  // leave Settings -> Keep/Revert for entering fullscreen; let it time out
  await page.keyboard.press('Escape'); await sleep(500);
  f = await F(); const dlg = await page.evaluate(() => { const d = document.querySelector('[data-screen="keep-display"]'); return d ? d.innerText.replace(/\s+/g, ' ') : null; });
  log('keep dialog', f, dlg);
  check('G1.9f entering fullscreen then leaving Settings opens Keep/Revert', /keep-display/.test(f.stack), { f, dlg });
  let closedAt = null; const tk = Date.now();
  for (let i = 0; i < 60; i++) { await sleep(250); if (!/keep-display/.test((await F()).stack)) { closedAt = Date.now() - tk; break; } }
  const s2 = await S();
  log('after timeout', closedAt, s2);
  check('G1.9g timeout exits fullscreen (fullscreenElement null) and the setting reads Windowed', s2.fsEl === null && s2.set === false && closedAt !== null, { closedAt, s2: { fsEl: s2.fsEl, set: s2.set, cssW: s2.cssW, cw: s2.cw } });
  check('G1.5c canvas = window size after leaving fullscreen', s2.cssW === s2.iw && s2.cssH === s2.ih && s2.cw === s2.iw, { iw: s2.iw, cssW: s2.cssW, cw: s2.cw, ch: s2.ch });
  // enter again and KEEP, then close menus, then exit fullscreen "by the browser" + an Esc 60 ms later
  f = await toSettingsRow('ap-display-mode');
  await page.keyboard.press('Enter'); await sleep(600);
  const s3 = await S(); log('Enter on mode row', { fsEl: s3.fsEl, set: s3.set });
  await page.keyboard.press('Escape'); await sleep(500);
  if (/keep-display/.test((await F()).stack)) { await page.keyboard.press('Enter'); await sleep(400); }
  for (let i = 0; i < 4 && (await F()).stack !== ''; i++) { await page.keyboard.press('Escape'); await sleep(500); }
  const s4 = await S(); log('kept + menus closed', { fsEl: s4.fsEl, set: s4.set, stack: (await F()).stack });
  check('G1.9h Keep keeps fullscreen', s4.fsEl && s4.set === true, { fsEl: s4.fsEl, set: s4.set });
  await page.evaluate(() => { window.__gcFs.length = 0; });
  await page.evaluate(() => document.exitFullscreen());
  await sleep(60);
  await page.keyboard.press('Escape');
  await sleep(600);
  const s5 = await S(); const ev5 = await page.evaluate(() => window.__gcFs.slice()); f = await F();
  log('browser exit + Esc 60 ms later', { fsEl: s5.fsEl, set: s5.set, stack: f.stack, ev5 });
  check('G1.5d leaving fullscreen by the browser flips the setting to Windowed within one fullscreenchange', s5.fsEl === null && s5.set === false && ev5.length >= 1 && ev5[0].set === false, ev5);
  check('G1.5e an Esc within 150 ms of fullscreenchange does not open a menu', f.stack === '', f);
  // resize handling (windowed): 1280x720 then back
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 }); await sleep(700);
  const s6 = await S();
  await page.screenshot({ path: `${CAP}/gntfixM16-cfs-resize1280.png` });
  check('S11 resize 1600x900 -> 1280x720: canvas css + buffer follow, aspect kept', s6.cssW === 1280 && s6.cssH === 720 && s6.cw === 1280 && s6.ch === 720, { cssW: s6.cssW, cssH: s6.cssH, cw: s6.cw, ch: s6.ch });
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 }); await sleep(700);
  // gamepad A on the mode row: no fullscreen, honest note
  await installGamepad(page);
  f = await toSettingsRow('ap-display-mode');
  await padTap(page, 0); await sleep(600);
  const s7 = await S();
  log('pad A on mode row', { fsEl: s7.fsEl, set: s7.set, row: s7.row, toasts: await page.evaluate(() => window.__echoes.app.toasts && window.__echoes.app.toasts()) });
  check('G1.5f pad A cannot enter fullscreen and the UI says why', s7.fsEl === null && s7.set === false && /gamepad|Enter or click/i.test(s7.row + JSON.stringify(await page.evaluate(() => window.__echoes.app.toasts && window.__echoes.app.toasts()))), { row: s7.row });
  await page.screenshot({ path: `${CAP}/gntfixM16-cfs-padA.png` });
  // D-pad right on the mode row
  await padTap(page, 15); await sleep(600);
  const s7b = await S(); log('pad D-pad right on mode row', { fsEl: s7b.fsEl, set: s7b.set, row: s7b.row });
  // close settings, Alt+Enter in play
  for (let i = 0; i < 5 && (await F()).stack !== ''; i++) { await page.keyboard.press('Escape'); await sleep(500); if (/keep-display/.test((await F()).stack)) { await page.keyboard.press('Escape'); await sleep(400); } }
  await page.keyboard.down('Alt'); await page.keyboard.press('Enter'); await page.keyboard.up('Alt'); await sleep(700);
  const s8 = await S(); f = await F();
  log('Alt+Enter in play', { fsEl: s8.fsEl, set: s8.set, stack: f.stack });
  check('Alt+Enter toggles fullscreen in play', !!s8.fsEl && s8.set === true, { fsEl: s8.fsEl, set: s8.set });
  await page.keyboard.down('Alt'); await page.keyboard.press('Enter'); await page.keyboard.up('Alt'); await sleep(700);
  const s9 = await S(); log('Alt+Enter again', { fsEl: s9.fsEl, set: s9.set });
  check('Alt+Enter again leaves fullscreen', s9.fsEl === null && s9.set === false, { fsEl: s9.fsEl, set: s9.set });
  log('page errors', errors.length, errors.slice(0, 3));
  check('0 page errors', errors.length === 0, errors.length);
} finally { await browser.close(); }
log('TOTAL FAILS', fails);
