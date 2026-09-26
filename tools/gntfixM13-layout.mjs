// fix-M1-r3 (MENU-R3-F1 / F3) — layout audit of the title (fresh and WITH a
// save), the pause menu (camp, run via cmd, run by the PLAYER path during the
// boon draft) and Settings ▸ Display at 1024x576 / 1152x648 / 1280x720 /
// 1600x900 / 2560x1440. Per screen:
//   * G1.1 rect audit of every [data-nav] (critic lib auditLayout: viewport,
//     hit >= 40, type floor, hit-testable, pairwise overlap, one ring);
//   * text-over-row: every text node inside its row's border box (the critic's
//     MENU-R3-F1 clip metric) and rows cut by their scroll box;
//   * the non-nav chrome (logo, pause head, hint bars, version) inside the
//     viewport and not overlapping any [data-nav] item — in 2-D AND on the
//     vertical band alone for the title's Exit row vs the hint bar (the
//     critic's MENU-R3-F3 overlapPx metric);
//   * elementFromPoint at each row's lower edge returns the row.
// Log: captures/gntfixM13-layout.log (+ one png per size/screen).
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, dumpNav, auditLayout } from './gntcmenu3-lib.mjs';

const log = logger('gntfixM13-layout');
let fails = 0;
const check = (name, ok, data) => {
  if (!ok) fails++;
  log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data);
};
const SIZES = process.env.SIZES ? JSON.parse(process.env.SIZES) : [[1024, 576], [1152, 648], [1280, 720], [1600, 900], [2560, 1440]];

async function audit(page, w, h, label) {
  await sleep(500);
  const d = await dumpNav(page);
  const fontFloor = w <= 1024 ? 14 : w >= 1600 ? 18 : 14;
  const a = auditLayout(d, { fontFloor });
  const extra = await page.evaluate(() => {
    const st = window.__echoes.app.stack();
    const top = document.querySelector(`[data-screen="${st[st.length - 1]}"]`);
    const vw = innerWidth, vh = innerHeight;
    const R = (el) => { const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), b: +r.bottom.toFixed(1), r: +r.right.toFixed(1) }; };
    const shown = (el) => { if (!el || el.getClientRects().length === 0) return false; let p = el; while (p && p !== document.body) { const cs = getComputedStyle(p); if (cs.display === 'none' || cs.visibility === 'hidden') return false; p = p.parentElement; } return true; };
    const navs = [...top.querySelectorAll('[data-nav]')].filter(shown);
    // text over row + cut by scroll box
    const rows = navs.map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const inner = { top: r.top + (parseFloat(cs.borderTopWidth) || 0), bottom: r.bottom - (parseFloat(cs.borderBottomWidth) || 0) };
      let over = 0;
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = tw.nextNode())) {
        if (!n.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(n);
        const tr = range.getBoundingClientRect();
        if (!tr.width) continue;
        over = Math.max(over, inner.top - tr.top, tr.bottom - inner.bottom);
      }
      let p = el.parentElement, sb = null;
      while (p && p !== top.parentElement) { if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowY)) { sb = p; break; } p = p.parentElement; }
      const sr = sb ? sb.getBoundingClientRect() : null;
      const cut = sr ? Math.max(0, r.bottom - sr.bottom, sr.top - r.top) : 0;
      const hit = document.elementFromPoint(r.left + Math.min(40, r.width / 2), r.bottom - 3);
      return { id: el.id, h: +r.height.toFixed(1), textOver: +Math.max(0, over).toFixed(1), cut: +cut.toFixed(1), scrolls: sb ? sb.scrollHeight > sb.clientHeight + 1 : false, lowerEdgeHit: hit ? (hit === el || el.contains(hit) ? 'self' : hit.id || hit.className) : null };
    });
    // non-nav chrome
    const chromeSel = ['.ap-logo-word', '.ap-logo-rule', '.ap-logo-sub', '.ap-title-foot', '.ap-hints', '.pz-head', '.pz-where', '.pz-online', '.ap-set-head', '.ap-set-foot .ap-hints'];
    const chrome = [];
    for (const sel of chromeSel) for (const el of top.querySelectorAll(sel)) if (shown(el)) chrome.push({ sel, el, rect: R(el) });
    const issues = [];
    for (const c of chrome) {
      const r = c.rect;
      if (r.x < -0.5 || r.y < -0.5 || r.r > vw + 0.5 || r.b > vh + 0.5) issues.push({ kind: 'chrome-outside-viewport', sel: c.sel, rect: r });
      for (const nv of navs) {
        if (c.el.contains(nv) || nv.contains(c.el)) continue;
        const q = R(nv);
        const ox = Math.min(r.r, q.r) - Math.max(r.x, q.x);
        const oy = Math.min(r.b, q.b) - Math.max(r.y, q.y);
        if (ox > 0.6 && oy > 0.6) issues.push({ kind: 'chrome-overlaps-item', sel: c.sel, item: nv.id, ox: +ox.toFixed(1), oy: +oy.toFixed(1) });
      }
    }
    // the critic's F3 metric: title Exit row vs the first hint, vertical band only
    let exitHintBandPx = null;
    const exit = top.querySelector('#ap-title-exit');
    const hint = top.querySelector('.ap-hint');
    if (exit && hint) { const e = R(exit), hb = R(hint); exitHintBandPx = +Math.max(0, Math.min(e.b, hb.b) - Math.max(e.y, hb.y)).toFixed(1); }
    const logo = top.querySelector('.ap-logo-word');
    return { stack: st, rows, issues, exitHintBandPx, logoTop: logo && shown(logo) ? R(logo).y : null, where: (top.querySelector('.pz-where') || {}).textContent || null };
  });
  const rowBad = extra.rows.filter((r) => r.textOver > 0.5 || r.cut > 0.5 || (r.lowerEdgeHit !== 'self' && r.cut === 0));
  const ok = a.issues.length === 0 && rowBad.length === 0 && extra.issues.length === 0 && (extra.exitHintBandPx === null || extra.exitHintBandPx === 0) && (extra.logoTop === null || extra.logoTop >= 0);
  check(`${w}x${h} ${label}`, ok, { stack: extra.stack, where: extra.where, navIssues: a.issues, minFont: a.minFont, minHit: a.minHit, rows: extra.rows.map((r) => [r.id, r.h, r.textOver, r.cut, r.scrolls ? 'SCROLLS' : '', r.lowerEdgeHit]), chromeIssues: extra.issues, exitHintBandPx: extra.exitHintBandPx, logoTop: extra.logoTop });
  await page.screenshot({ path: `${CAP}/gntfixM13-layout-${w}-${label}.png` });
}

for (const [w, h] of SIZES) {
  const browser = await launch({ width: w, height: h });
  try {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: w, height: h });
    await reachTitle(page);
    await audit(page, w, h, 'title-fresh');
    await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'display' }));
    await audit(page, w, h, 'settings-display');
    await page.keyboard.press('Escape');
    await sleep(500);
    // New Game -> camp, pause in camp
    await page.evaluate(() => document.querySelector('#ap-title-new').click());
    await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 30000 });
    await sleep(1500);
    await page.keyboard.press('Escape');
    await audit(page, w, h, 'pause-camp');
    await page.keyboard.press('Escape');
    await sleep(400);
    // PLAYER path: walk to the portal, E, wait for combat, clear, pause on the boon draft
    await page.keyboard.down('KeyW');
    await page.waitForFunction(() => window.__echoes.cmd('campState').inPortal, { timeout: 15000, polling: 100 }).catch(() => {});
    await page.keyboard.up('KeyW');
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => { const r = window.__echoes.state().run; return r && r.phase === 'combat'; }, { timeout: 20000, polling: 100 });
    await sleep(1500);
    await page.keyboard.press('Escape');
    await audit(page, w, h, 'pause-run-fight');
    await page.keyboard.press('Escape');
    await sleep(300);
    for (let i = 0; i < 12; i++) {
      const ph = await page.evaluate(() => { window.__echoes.cmd('killAllEnemies'); const r = window.__echoes.state().run; return r && r.phase; });
      if (ph !== 'combat') break;
      await sleep(500);
    }
    await sleep(1500);
    await page.keyboard.press('Escape');
    await audit(page, w, h, 'pause-run-boon');
    // Save & Quit to Title -> the title WITH a save (the returning player's screen)
    await page.evaluate(() => window.__echoes.app.quitToTitle({ save: true }));
    await page.waitForFunction(() => window.__echoes.app.state === 'title' && !!document.querySelector('#ap-title-continue'), { timeout: 30000 });
    await sleep(1200);
    await audit(page, w, h, 'title-with-save');
    check(`${w}x${h} page errors`, errors.length === 0, errors);
  } catch (e) {
    fails++;
    log('ERR', `${w}x${h}`, String((e && e.stack) || e));
  } finally {
    await browser.close();
  }
}
log('TOTAL FAILS', fails);
