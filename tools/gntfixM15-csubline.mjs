// Menu critic r5 — live sub-line audit: for every adjustable row on the Gameplay, Audio (toggles) and Network tabs, change the
// value by a real ArrowRight, read the row text LIVE, then close + reopen Settings on that tab and read it FRESH (same value).
// A row whose live text differs from its fresh text (digits stripped) shows a stale description after a change.
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, focusInfo } from './gntfixM15-clib.mjs';
const log = logger('gntfixM15-subline');
const browser = await launch({ width: 1600, height: 900 });
const norm = (s) => (s || '').replace(/[0-9.,−\-+%]+/g, '#').replace(/\s+/g, ' ').trim();
const rowText = (page, id) => page.evaluate((id) => { const el = document.getElementById(id); if (!el) return null; let p = el; while (p && p.parentElement && !/row/i.test(typeof p.className === 'string' ? p.className : '')) p = p.parentElement; return (p || el).textContent.replace(/\s+/g, ' ').trim(); }, id);
let stale = 0;
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
  await reachTitle(page);
  for (const tab of ['gameplay', 'audio', 'network']) {
    await page.evaluate((t) => window.__echoes.app.open('settings', { tab: t }), tab); await sleep(800);
    const ids = await page.evaluate(() => [...document.querySelectorAll('[data-screen="settings"] [data-nav]')].filter((e) => typeof e.__navAdjust === 'function' && e.id && !/-level$/.test(e.id)).map((e) => e.id));
    await page.keyboard.press('Escape'); await sleep(500);
    log(tab, 'adjustable rows', ids);
    for (const id of ids) {
      await page.evaluate((t) => window.__echoes.app.open('settings', { tab: t }), tab); await sleep(700);
      for (let i = 0; i < 20 && (await focusInfo(page)).id !== id; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); }
      if ((await focusInfo(page)).id !== id) { log('skip (not reachable by ArrowDown)', id); await page.keyboard.press('Escape'); await sleep(400); continue; }
      const before = await rowText(page, id);
      await page.keyboard.press('ArrowRight'); await sleep(450);
      const live = await rowText(page, id);
      const stack = await page.evaluate(() => window.__echoes.app.stack());
      while ((await page.evaluate(() => window.__echoes.app.stack().length)) > 1) { await page.keyboard.press('Escape'); await sleep(450); }
      await page.evaluate((t) => window.__echoes.app.open('settings', { tab: t }), tab); await sleep(800);
      const fresh = await rowText(page, id);
      const ok = norm(live) === norm(fresh);
      if (!ok) stale++;
      log(ok ? 'OK   ' : 'STALE', id, { before, live, fresh, stack });
      // restore
      for (let i = 0; i < 20 && (await focusInfo(page)).id !== id; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); }
      await page.keyboard.press('ArrowLeft'); await sleep(350);
      while ((await page.evaluate(() => window.__echoes.app.stack().length)) > 1) { await page.keyboard.press('Escape'); await sleep(450); }
    }
  }
  log('errors', errors);
} catch (e) { log('ERR', String(e && e.stack || e)); } finally { log('STALE ROWS', stale); await browser.close(); }
