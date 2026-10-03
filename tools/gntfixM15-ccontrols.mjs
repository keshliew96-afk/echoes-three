// Menu critic r5 — Controls tab: full text (does it list the PARTY build-page inputs?), plus pixels at 1024x576 and 1600x900.
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP } from './gntfixM15-clib.mjs';
const log = logger('gntfixM15-controls');
for (const [w, h] of [[1024, 576], [1600, 900]]) {
  const browser = await launch({ width: w, height: h });
  try {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: w, height: h });
    await reachTitle(page);
    await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'controls' })); await sleep(900);
    const t = await page.evaluate(() => { const s = document.querySelector('[data-screen="settings"]'); const sc = [...s.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)).map((e) => ({ cls: e.className, sh: e.scrollHeight, ch: e.clientHeight })); return { text: s.innerText.replace(/\n+/g, ' | '), scrollers: sc }; });
    log(`${w}x${h}`, t);
    await page.screenshot({ path: `${CAP}/gntfixM15-controls-${w}.png` });
    // scroll the list by wheel and by keys
    await page.mouse.move(w * 0.4, h * 0.5); await page.mouse.wheel({ deltaY: 600 }); await sleep(500);
    await page.screenshot({ path: `${CAP}/gntfixM15-controls-${w}-scrolled.png` });
    log('errors', errors);
  } catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
}
