// gntfixPARTY5-shopfit — party critic r5 F4 (shop half) + F3 (party page) geometry probe.
// Opens ?menu=0&seed=S, clears room 1 (party page: per-seat tab row y, page rect, tab x),
// commits it, skipToRoom(7) (shop: per-seat ribbons vs card width, ribbon overlap, page rect,
// header top). Real F1-F4 keys. Usage: node tools/gntfixPARTY5-shopfit.mjs [--url u] [--sizes 1024x576,...] [--seed 7] [--tag t]
import { launch, open, E, sleep, writeJson, shot, waitFor } from './gntfixPARTY5-lib.mjs';
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const SIZES = opt('sizes', '1024x576,1600x900,1920x1080,2560x1440').split(',').map((s) => s.split('x').map(Number));
const BASEURL = opt('url', 'http://127.0.0.1:5199/');
const SEED = opt('seed', '7');
const TAG = opt('tag', 'x');
const out = [];
const GEO = (sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const tabs = [...root.querySelectorAll('.rn-ptab')].filter(vis).map((t) => R(t));
  const items = [...root.querySelectorAll('.rn-item')].filter(vis).map((it) => {
    const o = it.querySelector('.rn-minowner'); const s = it.querySelector('.rn-suggest'); const c = it.querySelector('.rn-card'); const row = it.querySelector('.rn-itemtabs');
    return { item: R(it), card: R(c), row: R(row), owner: R(o), sug: R(s), ownerTxt: o ? o.textContent : null, sugTxt: s ? s.textContent : null };
  });
  // ribbon overlaps between any two ribbons on the shelf
  const rib = [...root.querySelectorAll('.rn-minowner, .rn-suggest')].filter(vis).map((e) => ({ t: e.textContent, r: e.getBoundingClientRect() }));
  const ov = [];
  for (let i = 0; i < rib.length; i++) for (let j = i + 1; j < rib.length; j++) {
    const a = rib[i].r, b = rib[j].r; const w = Math.min(a.right, b.right) - Math.max(a.left, b.left); const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 0.5 && h > 0.5) ov.push(`${rib[i].t} x ${rib[j].t} ${Math.round(w)}px`);
  }
  // ribbons wider than their item
  const spill = items.filter((it) => it.row && (it.owner && it.owner.x + it.owner.w > it.item.x + it.item.w + 0.5 || it.sug && it.sug.x + it.sug.w > it.item.x + it.item.w + 0.5)).length;
  const head = root.querySelector('.rn-head, .rn-title');
  const btn = root.querySelector('.rn-buttons');
  return { root: R(root), s: getComputedStyle(document.getElementById('run-screen')).getPropertyValue('--rn-s').trim(), tabs, tabRowY: tabs.length ? tabs[0].y : null, tabX: tabs.map((t) => t.x), head: R(head), buttons: R(btn), items, ov, spill, offTop: root.getBoundingClientRect().top < -0.5, offBottom: root.getBoundingClientRect().bottom > innerHeight + 0.5 };
};
const b = await launch();
try {
  for (const [W, H] of SIZES) {
    const size = `${W}x${H}`;
    const { page, errors } = await open(b, `${BASEURL}?menu=0&seed=${SEED}`, { width: W, height: H });
    await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
    await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
    await sleep(1200);
    await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
    await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
    await sleep(1400);
    const pageRows = [];
    for (const k of ['F1', 'F2', 'F3', 'F4', 'F1', 'F3', 'F2', 'F4']) {
      await page.keyboard.press(k); await sleep(450);
      const g = await E(page, GEO, '.rn-draft');
      pageRows.push({ k, tabRowY: g.tabRowY, tabX: g.tabX, root: g.root, s: g.s, buttons: g.buttons, offTop: g.offTop, offBottom: g.offBottom });
      if (pageRows.length <= 4) await shot(page, `gntfixPARTY5-shopfit-${TAG}-${size}-page-${k}`);
    }
    const ys = pageRows.map((r) => r.tabRowY);
    const xs = pageRows.map((r) => r.tabX[0]);
    const by = pageRows.map((r) => r.buttons && r.buttons.y);
    // commit the page (Suggested mode: Enter from the Healer tab)
    await page.keyboard.press('F1'); await sleep(400);
    for (let i = 0; i < 6; i++) { const s = await E(page, () => window.__echoes.runUi().screen); if (s !== 'draft') break; await page.keyboard.press('Enter'); await sleep(600); }
    await E(page, () => { window.__echoes.cmd('skipToRoom', 7); return 1; });
    await waitFor(page, () => window.__echoes.runUi().screen === 'shop', null, 30000).catch(() => null);
    await sleep(1500);
    const shopRows = [];
    for (const k of ['F1', 'F2', 'F3', 'F4', 'F2', 'F1', 'F3']) {
      await page.keyboard.press(k); await sleep(500);
      const g = await E(page, GEO, '.rn-shop');
      shopRows.push({ k, tabRowY: g.tabRowY, root: g.root, s: g.s, head: g.head, ov: g.ov, spill: g.spill, offTop: g.offTop, offBottom: g.offBottom, ribbons: g.items.map((it) => ({ item: it.item.w, owner: it.owner && it.owner.w, sug: it.sug && it.sug.w })) });
      if (shopRows.length <= 4) await shot(page, `gntfixPARTY5-shopfit-${TAG}-${size}-shop-${k}`);
    }
    const sys = shopRows.map((r) => r.tabRowY);
    const row = {
      size,
      page: { tabRowY: ys, tabRowYSpread: Math.max(...ys) - Math.min(...ys), tabX0: xs, tabXSpread: Math.max(...xs) - Math.min(...xs), buttonsY: by, rootH: pageRows.map((r) => r.root.h), s: pageRows.map((r) => r.s), off: pageRows.filter((r) => r.offTop || r.offBottom).length },
      shop: { tabRowY: sys, tabRowYSpread: Math.max(...sys) - Math.min(...sys), rootH: shopRows.map((r) => r.root.h), rootY: shopRows.map((r) => r.root.y), headY: shopRows.map((r) => r.head && r.head.y), s: shopRows.map((r) => r.s), overlaps: shopRows.map((r) => r.ov.length), overlapList: [...new Set(shopRows.flatMap((r) => r.ov))], spill: shopRows.map((r) => r.spill), off: shopRows.filter((r) => r.offTop || r.offBottom).length, ribbons: shopRows.slice(0, 4).map((r) => r.ribbons) },
      errors: errors.length,
    };
    out.push(row);
    console.log(JSON.stringify({ size, page: { y: ys, ySpread: row.page.tabRowYSpread, x0: xs, xSpread: row.page.tabXSpread, btnY: by, h: row.page.rootH, off: row.page.off }, shop: { y: sys, ySpread: row.shop.tabRowYSpread, h: row.shop.rootH, rootY: row.shop.rootY, s: row.shop.s, overlaps: row.shop.overlaps, spill: row.shop.spill, off: row.shop.off }, errors: errors.length }));
    await page.close();
  }
} finally { await b.close(); }
writeJson(`gntfixPARTY5-shopfit-${TAG}`, out);
