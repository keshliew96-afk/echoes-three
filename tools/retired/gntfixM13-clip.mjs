// fix-M1-r3 copy of the critic's tools/gntcmenu3-clip.mjs (log renamed, more sizes) — text-clipping audit of menu rows (child text boxes vs their row plate and scroll box).
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP } from './gntcmenu3-lib.mjs';
const log = logger('gntfixM13-clip');
const SIZES = process.env.SIZES ? JSON.parse(process.env.SIZES) : [[1024, 576], [1280, 720], [1366, 768], [1600, 900], [2560, 1440]];
async function audit(page) {
  return page.evaluate(() => {
    const st = window.__echoes.app.stack();
    const top = document.querySelector(`[data-screen="${st[st.length - 1]}"]`);
    const out = [];
    top.querySelectorAll('[data-nav]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const cs = getComputedStyle(el);
      const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
      const inner = { top: r.top + bt, bottom: r.bottom - bb };
      const texts = [];
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.textContent.trim();
        if (!t) continue;
        const range = document.createRange(); range.selectNodeContents(n);
        const tr = range.getBoundingClientRect();
        if (!tr.width) continue;
        const over = Math.max(0, inner.top - tr.top, tr.bottom - inner.bottom);
        texts.push({ t: t.slice(0, 40), top: +tr.top.toFixed(1), bottom: +tr.bottom.toFixed(1), overPx: +over.toFixed(1) });
      }
      // scroll container
      let p = el.parentElement, sb = null;
      while (p && p !== top.parentElement) { const pc = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(pc.overflowY)) { sb = p; break; } p = p.parentElement; }
      const sr = sb ? sb.getBoundingClientRect() : null;
      out.push({ id: el.id, label: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), h: +r.height.toFixed(1), scrollH: el.scrollHeight, clientH: el.clientHeight, overflowY: cs.overflowY, maxTextOverPx: Math.max(0, ...texts.map((x) => x.overPx)), texts, cutByScrollBox: sr ? +Math.max(0, r.bottom - sr.bottom, sr.top - r.top).toFixed(1) : 0, scrollBox: sr ? { top: +sr.top.toFixed(1), bottom: +sr.bottom.toFixed(1), scrollTop: sb.scrollTop, scrollH: sb.scrollHeight, clientH: sb.clientHeight } : null });
    });
    return { stack: st, items: out };
  });
}
for (const [w, h] of SIZES) {
  const browser = await launch({ width: w, height: h });
  try {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: w, height: h });
    await reachTitle(page);
    await page.evaluate(() => document.querySelector('#ap-title-new').click());
    await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 20000 });
    await sleep(1200);
    await page.evaluate(() => window.__echoes.cmd('startRun', { act: 1 }));
    await sleep(2500);
    await page.keyboard.press('Escape');
    await sleep(900);
    const a = await audit(page);
    const bad = a.items.filter((i) => i.maxTextOverPx > 0.5);
    log(`${w}x${h} pause-run`, { stack: a.stack, rows: a.items.map((i) => [i.id, i.h, 'textOver', i.maxTextOverPx, 'cut', i.cutByScrollBox]), clippedRows: bad.length, scrollBox: a.items[0] && a.items[0].scrollBox });
    await page.screenshot({ path: `${CAP}/gntfixM13-clip-${w}-pause-run.png` });
    // zoomed crop of the menu at 2x
    const box = await page.evaluate(() => { const r = document.querySelector('[data-screen="pause"] [data-nav]').parentElement.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    await page.screenshot({ path: `${CAP}/gntfixM13-clip-${w}-pause-run-crop.png`, clip: { x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10), width: Math.min(w, box.width + 20), height: Math.min(h - Math.max(0, box.y - 10), box.height + 20) } });
    // keyboard to last row: does it scroll into view?
    for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowDown'); await sleep(200); }
    await sleep(400);
    const a2 = await audit(page);
    const f = await page.evaluate(() => window.__echoes.app.focus());
    log(`${w}x${h} pause-run after 6x Down`, { focus: f && f.id, cut: a2.items.map((i) => [i.id, i.cutByScrollBox]), sb: a2.items[0].scrollBox });
    await page.screenshot({ path: `${CAP}/gntfixM13-clip-${w}-pause-run-last.png` });
    log('errors', errors);
  } catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
}
