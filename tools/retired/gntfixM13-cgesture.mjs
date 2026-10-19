// fix-M1-r3 copy of the critic's tools/gntcmenu3-gesture.mjs (log + captures renamed; unchanged otherwise)
// Menu critic r3 — G1.13 gesture hook: one key (not Esc) / one click / one touch on a blocking screen each reach
// service('audio').unlock (no autoplay flag); the hook is the first window capture listener (CDP getEventListeners).
import { launch, logger, sleep, URL_BASE } from './gntcmenu3-lib.mjs';
const log = logger('gntfixM13-cgesture');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const browser = await launch({ width: 1600, height: 900, autoplay: false });
async function fresh(touch = false) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1, hasTouch: touch });
  await page.goto(URL_BASE + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app && window.__echoes.app.service && !!window.__echoes.app.service('audio'), { timeout: 180000 });
  await page.waitForFunction(() => { const el = document.querySelector('#app-ui'); return el && /Press any key|Ready/i.test(el.textContent); }, { timeout: 120000 });
  await page.evaluate(() => { const a = window.__echoes.app.service('audio'); window.__unl = []; const orig = a.unlock.bind(a); a.unlock = (e) => { window.__unl.push(e && e.type); return orig(e); }; });
  return { page, errors };
}
const readState = (page) => page.evaluate(() => ({ unl: window.__unl.slice(), app: window.__echoes.app.state, stack: window.__echoes.app.stack(), audio: (() => { try { return window.__echoes.audio.state; } catch (e) { return String(e); } })() }));
try {
  // key
  {
    const { page, errors } = await fresh();
    const s0 = await readState(page);
    await page.keyboard.press('Escape'); await sleep(300);
    const sEsc = await readState(page);
    await page.keyboard.press('KeyZ'); await sleep(500);
    const s1 = await readState(page);
    check('G1.13 key: Esc grants nothing, one KeyZ reaches unlock synchronously', sEsc.unl.filter((t) => t === 'keydown').length <= 1 && s1.unl.length >= 1 && s1.unl.includes('keydown'), { s0, sEsc, s1 });
    // listener order via CDP
    const cdp = await page.target().createCDPSession();
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'window', objectGroup: 'g' });
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    const scripts = {};
    const cap = listeners.filter((l) => l.useCapture && ['keydown', 'pointerdown', 'mousedown', 'touchend'].includes(l.type));
    for (const l of cap) { if (!scripts[l.scriptId]) { try { const src = await cdp.send('Debugger.enable').then(() => null); } catch {} } }
    const byType = {};
    for (const l of cap) { (byType[l.type] = byType[l.type] || []).push({ scriptId: l.scriptId, line: l.lineNumber, passive: l.passive }); }
    // resolve script URLs
    await cdp.send('Debugger.enable');
    const urls = {};
    cdp.on('Debugger.scriptParsed', (e) => { urls[e.scriptId] = e.url; });
    await sleep(500);
    const first = Object.fromEntries(Object.entries(byType).map(([t, arr]) => [t, arr.map((x) => ({ ...x, url: (urls[x.scriptId] || '').replace(/^.*5199/, '').replace(/\?.*$/, '') })).slice(0, 3)]));
    log('capture listeners on window (registration order)', first);
    check('G1.13 hook is the first window capture listener for keydown/pointerdown/mousedown/touchend (src/app/app.js)', ['keydown', 'pointerdown', 'mousedown', 'touchend'].every((t) => first[t] && /app\/app\.js/.test(first[t][0].url)), Object.fromEntries(Object.entries(first).map(([t, a]) => [t, a[0] && a[0].url])));
    check('key pageerrors', errors.length === 0, errors);
    await page.close();
  }
  // click
  {
    const { page, errors } = await fresh();
    await page.mouse.click(800, 450); await sleep(500);
    const s1 = await readState(page);
    check('G1.13 click: one click reaches unlock', s1.unl.includes('pointerdown') || s1.unl.includes('mousedown') || s1.unl.includes('click'), s1);
    check('click pageerrors', errors.length === 0, errors);
    await page.close();
  }
  // touch
  {
    const { page, errors } = await fresh(true);
    await page.touchscreen.tap(800, 450); await sleep(500);
    const s1 = await readState(page);
    check('G1.13 touch: one tap reaches unlock', s1.unl.length >= 1, s1);
    check('touch pageerrors', errors.length === 0, errors);
    await page.close();
  }
} catch (e) { fails++; log('ERR', String(e && e.stack || e)); } finally { await browser.close(); log('TOTAL FAILS', fails); }
