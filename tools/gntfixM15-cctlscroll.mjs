// Menu critic r5 — Controls tab below the fold: can a keyboard / gamepad player reach the hidden rows? Sizes 1024x576..1366x768.
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, installGamepad, padTap, focusInfo } from './gntfixM15-clib.mjs';
const log = logger('gntfixM15-ctlscroll');
for (const [w, h] of [[1024, 576], [1152, 648], [1280, 720], [1366, 768]]) {
  const browser = await launch({ width: w, height: h });
  try {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: w, height: h });
    await installGamepad(page);
    await reachTitle(page);
    await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'controls' })); await sleep(900);
    const sc = () => page.evaluate(() => {
      const wrap = document.querySelector('[data-screen="settings"] .ap-tabwrap');
      const wr = wrap.getBoundingClientRect();
      const rows = [...wrap.querySelectorAll('*')].filter((e) => e.children.length >= 1 && /Fullscreen|Quicksave/.test(e.textContent) && e.textContent.length < 60).map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent.replace(/\s+/g, ' ').trim(), top: Math.round(r.y), bottom: Math.round(r.y + r.height), visible: r.y >= wr.y - 1 && r.y + r.height <= wr.y + wr.height + 1 }; });
      const note = [...document.querySelectorAll('[data-screen="settings"] *')].find((e) => /rebinding/i.test(e.textContent) && e.children.length === 0);
      const nr = note && note.getBoundingClientRect();
      return { scrollTop: wrap.scrollTop, sh: wrap.scrollHeight, ch: wrap.clientHeight, rows, note: note ? { shown: nr.width > 0 && nr.height > 0 && getComputedStyle(note).display !== 'none', y: Math.round(nr.y) } : null };
    });
    const s0 = await sc();
    const keys = [];
    for (const k of ['ArrowDown', 'ArrowDown', 'PageDown', 'End', 'ArrowUp']) { await page.keyboard.press(k); await sleep(250); const s = await sc(); keys.push([k, s.scrollTop, (await focusInfo(page)).id]); }
    await page.evaluate(() => { document.querySelector('[data-screen="settings"] .ap-tabwrap').scrollTop = 0; });
    const pads = [];
    for (const b of [13, 13, 7, 6]) { await padTap(page, b); await sleep(250); const s = await sc(); pads.push([b, s.scrollTop, (await focusInfo(page)).id]); }
    await page.evaluate(() => window.__gcAxis(3, 1)); await sleep(700); await page.evaluate(() => window.__gcAxis(3, 0)); await sleep(200);
    const rs = await sc();
    log(`${w}x${h}`, { initial: s0, keys, pads, rightStick: rs.scrollTop, errors: errors.length });
  } catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
}
