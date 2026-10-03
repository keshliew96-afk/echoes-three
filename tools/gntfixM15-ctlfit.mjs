// fix-M1-r5 (MENU-R5-F2) — Settings > Controls fits: at every size every reference row, heading and the
// rebinding note is fully inside the tab's scroll box (no clip), pairwise non-overlapping, type >= floor,
// the box does not overflow (sh <= ch), and the note is displayed. Opened by real keys (title > Settings > E x3).
// Usage: ECHOES_URL=http://127.0.0.1:5199/ node tools/gntfixM15-ctlfit.mjs [WxH ...]
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, focusInfo } from './gntfixM15-clib.mjs';
const log = logger('gntfixM15-ctlfit');
const SIZES = process.argv.slice(2).length
  ? process.argv.slice(2).map((s) => s.split('x').map(Number))
  : [[1024, 576], [1152, 648], [1280, 720], [1366, 768], [1600, 900], [1920, 1080], [2560, 1440]];
let fails = 0;
const check = (name, ok, data) => {
  if (!ok) fails += 1;
  log(`${ok ? 'PASS' : 'FAIL'} ${name}`, data ?? '');
};
for (const [w, h] of SIZES) {
  const browser = await launch({ width: w, height: h });
  try {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: w, height: h });
    await reachTitle(page);
    for (let i = 0; i < 10 && (await focusInfo(page)).id !== 'ap-title-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(160); }
    await page.keyboard.press('Enter'); await sleep(700);
    for (let i = 0; i < 6; i++) {
      const sel = await page.evaluate(() => document.querySelector('[data-screen="settings"] [aria-selected="true"]')?.id);
      if (sel === 'ap-tab-controls') break;
      await page.keyboard.press('KeyE'); await sleep(350);
    }
    await sleep(400);
    const m = await page.evaluate(() => {
      const wrap = document.querySelector('[data-screen="settings"] .ap-tabwrap');
      const wr = wrap.getBoundingClientRect();
      const body = wrap.querySelector('.ap-tabbody.ap-active');
      const items = [...body.querySelectorAll('.ap-ref-row, .ap-section, p.ap-note')].map((e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        const fs = e.classList.contains('ap-ref-row') ? parseFloat(getComputedStyle(e.querySelector('.ap-ref-act')).fontSize) : parseFloat(cs.fontSize);
        return { t: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 48), x: r.x, y: r.y, w: r.width, h: r.height, fs, shown: r.width > 0 && r.height > 0 && cs.display !== 'none' };
      });
      const out = items.filter((i) => !i.shown || i.y < wr.y - 0.5 || i.y + i.h > wr.y + wr.height + 0.5 || i.x < wr.x - 0.5 || i.x + i.w > wr.x + wr.width + 0.5);
      const rows = items.filter((i) => i.shown);
      const overlaps = [];
      for (let a = 0; a < rows.length; a++) for (let b = a + 1; b < rows.length; b++) {
        const A = rows[a], B = rows[b];
        const ix = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
        const iy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
        if (ix > 0.5 && iy > 0.5) overlaps.push([A.t, B.t]);
      }
      // chips wrapped onto a second line?
      const wrapped = [...body.querySelectorAll('.ap-ref-keys')].filter((k) => { const kb = [...k.children].map((c) => c.getBoundingClientRect().top); return kb.length && Math.max(...kb) - Math.min(...kb) > 2; }).map((k) => k.parentElement.textContent.replace(/\s+/g, ' ').trim());
      const note = body.querySelector('p.ap-note');
      return {
        v: window.__echoes.version, s: getComputedStyle(document.documentElement).getPropertyValue('--ap-s'),
        ch: wrap.clientHeight, sh: wrap.scrollHeight, scrollTop: wrap.scrollTop, count: items.length,
        out: out.map((o) => o.t), overlaps, wrapped, minFs: Math.min(...rows.map((r) => r.fs)),
        note: note ? { text: note.textContent, shown: getComputedStyle(note).display !== 'none' && note.getBoundingClientRect().height > 0 } : null,
        more: { below: wrap.classList.contains('ap-more-below'), above: wrap.classList.contains('ap-more-above') },
        region: !!body.querySelector('.ap-scrollstop[data-nav]'),
        ring: window.__echoes.app.ringCount ? window.__echoes.app.ringCount() : null,
      };
    });
    await page.screenshot({ path: `${CAP}/gntfixM15-ctlfit-${w}.png` });
    const floor = w <= 1024 ? 14 : w >= 1600 ? 18 : 14;
    log(`${w}x${h}`, m);
    check(`${w}x${h} nothing clipped (${m.count} items)`, m.out.length === 0, m.out);
    check(`${w}x${h} no overflow sh ${m.sh} <= ch ${m.ch}`, m.sh <= m.ch + 1);
    check(`${w}x${h} no overlaps`, m.overlaps.length === 0, m.overlaps);
    check(`${w}x${h} no wrapped chips`, m.wrapped.length === 0, m.wrapped);
    check(`${w}x${h} type >= ${floor}px (min ${m.minFs})`, m.minFs >= floor);
    check(`${w}x${h} rebinding note shown`, !!m.note && m.note.shown && /rebinding/i.test(m.note.text));
    check(`${w}x${h} one ring, no scroll stop needed`, m.ring === 1 && !m.region && !m.more.below);
    check(`${w}x${h} 0 page errors`, errors.length === 0, errors);
  } catch (e) {
    fails += 1;
    log('ERR', String((e && e.stack) || e));
  } finally {
    await browser.close();
  }
}
log(`TOTAL FAILS ${fails}`);
process.exit(fails ? 1 : 0);
