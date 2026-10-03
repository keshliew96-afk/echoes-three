// gntfixPARTY5-shopbuy — regression for the shop's fixed frame (party critic r5 F4 fix): purchases by a
// real click on the Healer's and the Swordsman's shelves, a click on a Suggested ribbon, the frame and the tab
// row after each, the purchase choreography still playing, 0 page errors.
//   node tools/gntfixPARTY5-shopbuy.mjs [--url http://127.0.0.1:5199/] [--size 1600x900]
import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntfixPARTY5-lib.mjs';
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const BASEURL = opt('url', 'http://127.0.0.1:5199/');
const [W, H] = opt('size', '1600x900').split('x').map(Number);
const checks = [];
const check = (what, ok, got = null) => { checks.push({ what, ok: !!ok, got }); console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ' ' + JSON.stringify(got).slice(0, 400)}`); };
const b = await launch();
try {
  const { page, errors } = await open(b, `${BASEURL}?menu=0&seed=7`, { width: W, height: H });
  await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
  await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
  await E(page, () => { window.__echoes.cmd('skipToRoom', 7); return 1; });
  await waitFor(page, () => window.__echoes.runUi().screen === 'shop', null, 30000);
  await sleep(1500);
  const geo = () => E(page, () => {
    const s = document.querySelector('.rn-shop');
    const t = s.querySelector('.rn-ptab[data-seat="3"]');
    const sh = s.querySelector('.rn-shelf:not(.rn-shelftwin)');
    return { rootY: Math.round(s.getBoundingClientRect().y), rootH: Math.round(s.getBoundingClientRect().height), tabY: Math.round(t.getBoundingClientRect().y), shelfMin: sh.style.minHeight, frame: window.__echoes.runUi().shop && window.__echoes.runUi().shop.frame };
  });
  const cardCenter = (i) => E(page, (k) => { const c = document.querySelectorAll('.rn-shop .rn-shelf:not(.rn-shelftwin) .rn-card')[k]; const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, i);
  const g0 = await geo();
  // Healer: click card 0
  await page.keyboard.press('F1'); await sleep(400);
  const w0 = await E(page, () => window.__echoes.state().run.shop.wallet);
  let c = await cardCenter(0);
  await page.mouse.click(c.x, c.y);
  await sleep(250);
  const anim = await E(page, () => { const u = window.__echoes.runUi(); return u.shop ? u.shop.anim || null : null; });
  await sleep(1200);
  const s1 = await E(page, () => { const v = window.__echoes.state().run.shop; return { wallet: v.wallet, sold0: !!(v.stock[0] && v.stock[0].sold) }; });
  check(`Healer buys card 1 by a click (wallet ${w0} -> ${s1.wallet}, sold ${s1.sold0})`, s1.wallet < w0 && s1.sold0, s1);
  const g1 = await geo();
  check(`the frame holds after the purchase (tab y ${g0.tabY} -> ${g1.tabY}, root h ${g0.rootH} -> ${g1.rootH})`, Math.abs(g1.tabY - g0.tabY) <= 3 && Math.abs(g1.rootH - g0.rootH) <= 2, { g0, g1, anim });
  // Swordsman: toggle a Suggested ribbon by click, then buy card 2
  await page.keyboard.press('F3'); await sleep(450);
  const m0 = await E(page, () => { const v = window.__echoes.state().run.partyShop; return v.shelves[2].stock.map((x) => !!x.marked); });
  const rib = await E(page, () => { const r = document.querySelector('.rn-shop .rn-shelf:not(.rn-shelftwin) .rn-suggest'); if (!r) return null; const b = r.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, idx: Number(r.dataset.idx) }; });
  if (rib) { await page.mouse.click(rib.x, rib.y); await sleep(400); }
  const m1 = await E(page, () => { const v = window.__echoes.state().run.partyShop; return v.shelves[2].stock.map((x) => !!x.marked); });
  check(`a click on the Swordsman's Suggested ribbon toggles that mark (${JSON.stringify(m0)} -> ${JSON.stringify(m1)})`, rib && m0[rib.idx] !== m1[rib.idx], { rib, m0, m1 });
  const p0 = await E(page, () => window.__echoes.state().run.partyShop.shelves[2].purse);
  c = await cardCenter(1);
  await page.mouse.click(c.x, c.y);
  await sleep(1400);
  const p1 = await E(page, () => { const v = window.__echoes.state().run.partyShop.shelves[2]; return { purse: v.purse, sold1: !!(v.stock[1] && v.stock[1].sold) }; });
  check(`Swordsman buys card 2 by a click from its own purse (${p0} -> ${p1.purse})`, p1.purse < p0 && p1.sold1, p1);
  const g2 = await geo();
  check(`the frame holds across the switch + purchases (tab y ${g0.tabY} / ${g1.tabY} / ${g2.tabY})`, Math.max(g0.tabY, g1.tabY, g2.tabY) - Math.min(g0.tabY, g1.tabY, g2.tabY) <= 3, { g0, g1, g2 });
  await shot(page, `gntfixPARTY5-shopbuy-${W}x${H}`);
  check(`0 page errors (${errors.length})`, errors.length === 0, errors.slice(0, 3));
} finally { await b.close(); }
writeJson(`gntfixPARTY5-shopbuy-${W}x${H}`, checks);
console.log(`checks ${checks.filter((c) => c.ok).length}/${checks.length}`);
