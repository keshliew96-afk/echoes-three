// fix-M1-r3 copy of the critic's tools/gntcmenu3-layout2.mjs (log + captures renamed; unchanged otherwise)
// Menu critic r3 — populated-profile layout: title with Continue, saves list with entries, records with data, and a
// text-clipping audit (text boxes vs their row plate / scroll box) on every menu screen at 1024x576 / 1280x720 / 2560x1440.
import { launch, open, reachTitle, dumpNav, auditLayout, logger, sleep, URL_BASE, CAP } from './gntcmenu3-lib.mjs';
const log = logger('gntfixM13-clayout2');
const SIZES = [[1024, 576, 14], [1280, 720, 14], [2560, 1440, 18]];
async function clip(page) {
  return page.evaluate(() => {
    const st = window.__echoes.app.stack();
    const top = document.querySelector(`[data-screen="${st[st.length - 1]}"]`);
    if (!top) return { rows: [] };
    const rows = [];
    top.querySelectorAll('[data-nav]').forEach((el) => {
      const r = el.getBoundingClientRect(); if (!r.width) return;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden') return;
      const inner = { top: r.top + (parseFloat(cs.borderTopWidth) || 0), bottom: r.bottom - (parseFloat(cs.borderBottomWidth) || 0), left: r.left + (parseFloat(cs.borderLeftWidth) || 0), right: r.right - (parseFloat(cs.borderRightWidth) || 0) };
      let over = 0; const bad = [];
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) {
        const t = n.textContent.trim(); if (!t) continue;
        const pe = n.parentElement; const pcs = getComputedStyle(pe); if (pcs.display === 'none' || pcs.visibility === 'hidden') continue;
        const rg = document.createRange(); rg.selectNodeContents(n); const tr = rg.getBoundingClientRect(); if (!tr.width) continue;
        const o = Math.max(0, inner.top - tr.top, tr.bottom - inner.bottom, inner.left - tr.left, tr.right - inner.right);
        if (o > 0.5) bad.push({ t: t.slice(0, 40), o: +o.toFixed(1) });
        over = Math.max(over, o);
      }
      // ellipsis / overflow hidden truncation of text inside
      const trunc = [...el.querySelectorAll('*')].filter((c) => c.scrollWidth > c.clientWidth + 1 && getComputedStyle(c).overflow !== 'visible' && (c.textContent || '').trim()).map((c) => (c.textContent || '').trim().slice(0, 40));
      rows.push({ id: el.id || el.getAttribute('aria-label') || (el.textContent || '').trim().slice(0, 20), h: +r.height.toFixed(1), overPx: +over.toFixed(1), bad, trunc });
    });
    return { stack: st, rows };
  });
}
for (const [w, h, floor] of SIZES) {
  const browser = await launch({ width: w, height: h });
  try {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: w, height: h });
    await reachTitle(page);
    // populate: New Game, run room 1 -> reward, manual save to a slot, quit to title (autosave)
    await page.evaluate(() => document.querySelector('#ap-title-new').click());
    await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 20000 });
    await sleep(1200);
    await page.evaluate(() => window.__echoes.cmd('startRun', { act: 1 }));
    await sleep(2500);
    for (let i = 0; i < 10; i++) { await page.evaluate(() => window.__echoes.cmd('killAllEnemies')); await sleep(400); if ((await page.evaluate(() => window.__echoes.state().run.phase)) !== 'combat') break; }
    const sv = await page.evaluate(async () => { try { const r = await window.__echoes.save.save('slot1'); return r && (r.ok !== undefined ? r.ok : true); } catch (e) { return String(e); } });
    await sleep(500);
    await page.evaluate(() => window.__echoes.app.quitToTitle({ save: true }));
    await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 20000 });
    await sleep(1500);
    const results = [];
    async function snap(name) {
      await sleep(700);
      const d = await dumpNav(page);
      const a = auditLayout(d, { fontFloor: floor });
      const c = await clip(page);
      const clipped = c.rows.filter((r) => r.overPx > 0.5 || r.trunc.length);
      results.push({ name, issues: a.issues.length, clipped: clipped.length });
      await page.screenshot({ path: `${CAP}/gntfixM13-clayout2-${w}-${name}.png` });
      log(`${w}x${h} ${name}`, { stack: d.stack, focus: d.focus && d.focus.id, items: a.count, visible: a.visible, scrolled: a.scrolled.length, issues: a.issues, minFont: a.minFont, minHit: +a.minHit.toFixed(1), minText: d.minText, clipped: clipped.map((r) => [r.id, r.h, r.overPx, r.bad.slice(0, 2), r.trunc.slice(0, 2)]) });
    }
    log('save slot1', sv);
    await snap('title-with-save');
    await page.evaluate(() => window.__echoes.app.open('saves', { mode: 'load' }));
    await snap('saves-load');
    await page.keyboard.press('Escape'); await sleep(500);
    await page.evaluate(() => window.__echoes.app.open('records'));
    await snap('records');
    await page.keyboard.press('Escape'); await sleep(500);
    await page.evaluate(() => window.__echoes.app.open('settings'));
    await snap('settings-display');
    for (const t of ['audio', 'gameplay', 'controls', 'network']) { await page.evaluate(() => window.__echoes.app.press('tabNext')); await snap('settings-' + t); }
    await page.keyboard.press('Escape'); await sleep(600);
    await page.evaluate(() => window.__echoes.app.open('mp-menu')); await snap('mp-menu');
    await page.keyboard.press('Escape'); await sleep(500);
    // Continue into the run, pause there, open Save (save mode)
    await page.evaluate(() => document.querySelector('#ap-title-continue') && document.querySelector('#ap-title-continue').click());
    await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 20000 }).catch(() => {});
    await sleep(1500);
    await page.keyboard.press('Escape'); await snap('pause-after-continue');
    await page.evaluate(() => { const b = document.querySelector('#pz-save'); b && b.click(); }); await snap('saves-save');
    log(`SUMMARY ${w}x${h}`, { results, errors });
  } catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
}
