// fix-M1-r3 copy of the critic's tools/gntcmenu3-titlesave.mjs (log renamed, more sizes) — title WITH a save (Continue row) : Exit row vs hint bar overlap, logo vs top edge, at several sizes.
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP } from './gntcmenu3-lib.mjs';
const log = logger('gntfixM13-titlesave');
for (const [w, h] of (process.env.SIZES ? JSON.parse(process.env.SIZES) : [[1024, 576], [1152, 648], [1600, 900], [2560, 1440]])) {
  const browser = await launch({ width: w, height: h });
  try {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: w, height: h });
    await reachTitle(page);
    await page.evaluate(() => document.querySelector('#ap-title-new').click());
    await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 20000 });
    await sleep(1000);
    await page.evaluate(() => window.__echoes.cmd('startRun', { act: 1 }));
    await sleep(2000);
    await page.evaluate(() => window.__echoes.app.quitToTitle({ save: true }));
    await page.waitForFunction(() => window.__echoes.app.state === 'title' && !!document.querySelector('#ap-title-continue'), { timeout: 20000 });
    await sleep(1500);
    const m = await page.evaluate(() => {
      const scr = document.querySelector('[data-screen="title"]');
      const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), bottom: +r.bottom.toFixed(1) }; };
      const hintA = scr.querySelector('.ap-hint') || document.querySelector('.ap-hint'); const leafs = [...scr.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.getBoundingClientRect().width > 0);
      const hintEl = leafs.find((e) => /^Select$/.test(e.textContent.trim()));
      let hint = hintEl; while (hint && hint.parentElement && hint.parentElement !== scr && !/Choose/.test(hint.textContent)) hint = hint.parentElement;
      const logo = leafs.find((e) => /ECHOES/i.test(e.textContent.trim()));
      const exit = document.querySelector('#ap-title-exit');
      const e = R(exit), hb = R(hintA || hint);
      // the element drawn at the Exit label centre
      const er = exit.getBoundingClientRect();
      const hitBottom = document.elementFromPoint(er.x + 60, er.bottom - 4);
      return { exit: e, hint: hb, hintText: (hintA || hint) && (hintA || hint).textContent.replace(/\s+/g, ' ').trim(), logo: R(logo), cont: R(document.querySelector('#ap-title-continue')), overlapPx: e && hb ? +Math.max(0, Math.min(e.bottom, hb.bottom) - Math.max(e.y, hb.y)).toFixed(1) : null, exitBottomHit: hitBottom ? (hitBottom.id || hitBottom.className) : null, vh: innerHeight };
    });
    log(`${w}x${h}`, m, 'errors', errors.length);
    await page.screenshot({ path: `${CAP}/gntfixM13-titlesave-${w}.png` });
  } catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
}
