// fix-M1-r6: verbatim copy of tools/gntcmenu6-persist.mjs (menu critic r6), outputs renamed gntfixM16-cpersist.
// Menu critic r6 — G1.8 persistence (real keys for the display rows), reload during the Keep/Revert
// countdown, corrupt JSON, bad per-key values, newer version, throwing storage. Title boots (plain URL).
import { launch, logger, sleep, CAP, URL_BASE, reachTitle } from './gntcmenu6-lib.mjs';
const log = logger('gntfixM16-cpersist');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const W = 1600, H = 900;
const PLAIN = URL_BASE;
const browser = await launch({ width: W, height: H });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const F = () => page.evaluate(() => { const a = window.__echoes.app; const f = a.focus(); return { id: f && f.id, stack: a.stack().join('>'), state: a.state }; });
  const boot = async (url) => { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 }); await reachTitle(page); };
  const snap = () => page.evaluate(() => ({ dump: window.__echoes.settings.dump ? window.__echoes.settings.dump() : null, report: window.__echoes.settings.loadReport, fsEl: !!document.fullscreenElement, canvas: document.querySelector('canvas').width + 'x' + document.querySelector('canvas').height, raw: (() => { try { return localStorage.getItem('echoes.settings'); } catch (e) { return 'THROWS ' + e.message; } })(), keys: (() => { try { return Object.keys(localStorage).filter((k) => k.startsWith('echoes.settings')); } catch (e) { return 'THROWS'; } })(), toasts: window.__echoes.app.toasts() }));
  const toSettings = async () => { for (let i = 0; i < 8 && (await F()).id !== 'ap-title-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(130); } await page.keyboard.press('Enter'); await sleep(700); };
  const goRow = async (id) => { for (let i = 0; i < 12 && (await F()).id !== id; i++) { await page.keyboard.press('ArrowDown'); await sleep(120); } };
  // 1. fresh -> change by keys -> reload
  await boot(PLAIN + '?fresh=1');
  const d0 = await snap();
  log('fresh defaults', d0.dump, d0.report);
  await toSettings();
  for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowLeft'); await sleep(90); } // 0.8
  await page.keyboard.press('Escape'); await sleep(500); log('keep dialog for 0.8', await F()); await page.keyboard.press('Enter'); await sleep(500); log('after Keep', await F(), await page.evaluate(() => window.__echoes.settings.get('display.renderScale')));
  await toSettings();
  await goRow('ap-display-vsync'); await page.keyboard.press('Enter'); await sleep(200);
  await goRow('ap-display-frameLimit'); await page.keyboard.press('ArrowRight'); await sleep(150); await page.keyboard.press('ArrowRight'); await sleep(150);
  await goRow('ap-display-showFps'); await page.keyboard.press('Enter'); await sleep(200);
  await page.keyboard.press('KeyE'); await sleep(400); // audio
  await page.keyboard.press('ArrowDown'); await sleep(150); const auFocus = (await F()).id; for (let i = 0; i < 10; i++) { await page.keyboard.press('ArrowLeft'); await sleep(60); }
  await page.keyboard.press('KeyE'); await sleep(400); // gameplay
  await page.keyboard.press('ArrowDown'); await sleep(150); const gpFocus = (await F()).id; await page.keyboard.press('ArrowRight'); await sleep(150);
  await page.keyboard.press('Escape'); await sleep(500);
  let f = await F(); if (/keep-display/.test(f.stack)) { await page.keyboard.press('Enter'); await sleep(400); }
  await sleep(600); // debounce 150 ms
  const d1 = await snap();
  log('after key changes (audio focus ' + auFocus + ', gameplay focus ' + gpFocus + ')', d1.dump);
  const changed = Object.keys(d1.dump || {}).filter((k) => JSON.stringify(d1.dump[k]) !== JSON.stringify(d0.dump[k]));
  log('changed keys', changed);
  await boot(PLAIN);
  const d2 = await snap();
  const lost = changed.filter((k) => JSON.stringify(d2.dump[k]) !== JSON.stringify(d1.dump[k]));
  check('G1.8a every changed persisted setting survives reload', changed.length >= 5 && lost.length === 0, { changed, lost, after: Object.fromEntries(changed.map((k) => [k, d2.dump[k]])) });
  check('G1.8a2 render scale applied at boot (canvas 1280x720 for 0.8)', d2.canvas === '1280x720', d2.canvas);
  check('G1.8b fullscreen reads Windowed after reload, fullscreenElement null', d2.dump['display.fullscreen'] === false && !d2.fsEl, { set: d2.dump['display.fullscreen'], fsEl: d2.fsEl });
  // 2. reload during the Keep/Revert countdown
  await toSettings();
  for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowLeft'); await sleep(90); } // 0.6
  await page.keyboard.press('Escape'); await sleep(500);
  f = await F(); const mid = await snap();
  log('countdown running', f, 'store', mid.dump['display.renderScale'], 'raw', (mid.raw || '').slice(0, 120));
  await boot(PLAIN);
  const d3 = await snap();
  check('S3 reload during the Keep/Revert countdown returns to the last CONFIRMED scale (0.8), not the unconfirmed 0.6', d3.dump['display.renderScale'] === 0.8, { afterReload: d3.dump['display.renderScale'], canvas: d3.canvas, dialogWas: f.stack });
  // 3. corrupt JSON
  await page.evaluate(() => localStorage.setItem('echoes.settings', '{"v":1,"data":{"display.renderScale":0.7,'));
  const e0 = errors.length;
  await boot(PLAIN);
  const d4 = await snap();
  log('corrupt JSON boot', { report: d4.report, keys: d4.keys, toasts: d4.toasts, scale: d4.dump['display.renderScale'] });
  check('G1.8c corrupt JSON -> defaults + recovered report + notice toast, 0 page errors', d4.dump['display.renderScale'] === 1 && /recover/i.test(JSON.stringify(d4.report)) && /reset|unreadable/i.test(JSON.stringify(d4.toasts)) && errors.length === e0, { report: d4.report, toasts: d4.toasts, keys: d4.keys });
  await page.screenshot({ path: `${CAP}/gntfixM16-cpersist-corrupt.png` });
  // after recovery a change rewrites valid JSON
  await toSettings(); await page.keyboard.press('ArrowLeft'); await sleep(150); await page.keyboard.press('Escape'); await sleep(500);
  if (/keep-display/.test((await F()).stack)) { await page.keyboard.press('Enter'); await sleep(400); }
  await sleep(500);
  const d5 = await snap(); let valid = false; try { JSON.parse(d5.raw); valid = true; } catch {}
  check('G1.8d after recovery the next change writes valid JSON', valid && JSON.parse(d5.raw).data['display.renderScale'] === 0.95, (d5.raw || '').slice(0, 100));
  // 4. bad per-key values
  await page.evaluate(() => localStorage.setItem('echoes.settings', JSON.stringify({ v: 1, savedAt: 'x', data: { 'display.renderScale': 'abc', 'display.frameLimit': 999, 'display.vsync': 'yes', 'display.showFps': true, 'audio.master.level': 7 } })));
  await boot(PLAIN);
  const d6 = await snap();
  log('bad per-key values', { scale: d6.dump['display.renderScale'], limit: d6.dump['display.frameLimit'], vsync: d6.dump['display.vsync'], showFps: d6.dump['display.showFps'], master: d6.dump['audio.master.level'], report: d6.report, toasts: d6.toasts });
  check('S9 bad per-key values fall back per key (valid ones kept), 0 page errors', d6.dump['display.renderScale'] === 1 && d6.dump['display.frameLimit'] === 0 && d6.dump['display.vsync'] === true && d6.dump['display.showFps'] === true && d6.dump['audio.master.level'] <= 1 && errors.length === e0, null);
  // 5. newer version
  const newer = JSON.stringify({ v: 99, savedAt: 'future', data: { 'display.renderScale': 0.5 } });
  await page.evaluate((s) => localStorage.setItem('echoes.settings', s), newer);
  await boot(PLAIN);
  const d7 = await snap();
  check('G1.8e newer version -> defaults, the newer blob is not overwritten on boot', d7.dump['display.renderScale'] === 1 && d7.raw === newer, { scale: d7.dump['display.renderScale'], rawKept: d7.raw === newer, report: d7.report });
  log('page errors so far', errors.length, errors.slice(0, 3));
  await page.close();
  // 6. storage throwing
  const p2 = await browser.newPage();
  const err2 = [];
  p2.on('pageerror', (e) => err2.push(String(e.message || e)));
  await p2.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await p2.evaluateOnNewDocument(() => {
    const thrower = () => { throw new DOMException('blocked by critic', 'SecurityError'); };
    try { Object.defineProperty(window, 'localStorage', { get: thrower, configurable: true }); } catch {}
    try { Storage.prototype.getItem = thrower; Storage.prototype.setItem = thrower; Storage.prototype.removeItem = thrower; } catch {}
  });
  await p2.goto(PLAIN, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p2.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
  const { page: _p } = { page: p2 };
  await reachTitle(p2);
  await p2.evaluate(() => window.__echoes.app.open('settings', { tab: 'display' }));
  await sleep(800);
  const foot = await p2.evaluate(() => { const s = document.querySelector('[data-screen="settings"]'); return s ? s.innerText.replace(/\s+/g, ' ') : null; });
  const rep = await p2.evaluate(() => window.__echoes.settings.loadReport);
  // change a value: works in memory
  await p2.keyboard.press('ArrowLeft'); await sleep(300);
  const mem = await p2.evaluate(() => window.__echoes.settings.get('display.renderScale'));
  await p2.screenshot({ path: `${CAP}/gntfixM16-cpersist-nostorage.png` });
  check('G1.8f storage throwing -> boots, in-memory changes work, Settings says it cannot save', err2.length === 0 && mem === 0.95 && /can.t be saved|cannot be saved|not be saved/i.test(foot), { err2: err2.slice(0, 2), mem, report: rep, footHas: (foot || '').match(/[^.]*saved[^.]*/i) && (foot || '').match(/[^.]*saved[^.]*/i)[0] });
  await p2.close();
} finally { await browser.close(); }
log('page errors', errors.length, errors.slice(0, 3));
log('TOTAL FAILS', fails);
