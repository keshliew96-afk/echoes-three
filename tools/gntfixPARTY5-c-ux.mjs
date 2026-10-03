// gntcparty5 — selection UX by REAL input (keys, mouse, mocked pad) at several sizes:
// party page, shop, socket screen. Screenshots per tab, layout audit, tab-strip stability, owner labels.
import { launch, open, E, sleep, writeJson, shot, waitFor } from './gntfixPARTY5-lib.mjs';
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const SIZES = opt('sizes', '1024x576,2560x1440,1600x900').split(',').map((s) => s.split('x').map(Number));
const BASEURL = opt('url', process.env.GNTC_BASE || 'http://127.0.0.1:5199/');
const results = [];
const res = (size, screen, what, ok, got = null) => { results.push({ size, screen, what, ok: !!ok, got }); console.log(`${ok ? 'PASS' : 'FAIL'} [${size} ${screen}] ${what}${ok ? '' : ' ' + JSON.stringify(got).slice(0, 400)}`); };
const AUDIT = (rootSel) => {
  const root = document.querySelector(rootSel);
  if (!root) return { missing: true };
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const texts = [...root.querySelectorAll('*')].filter((el) => vis(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  // text boxes overlapping other text boxes (not ancestor/descendant)
  const tb = texts.map((el) => ({ el, r: el.getBoundingClientRect() }));
  const ov = [];
  for (let i = 0; i < tb.length; i++) for (let j = i + 1; j < tb.length; j++) {
    const a = tb[i], b = tb[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 2 && h > 2) { const area = w * h; const small = Math.min(a.r.width * a.r.height, b.r.width * b.r.height); if (area / small > 0.15) ov.push(`${a.el.className || a.el.tagName}:"${a.el.textContent.trim().slice(0, 16)}" x ${b.el.className || b.el.tagName}:"${b.el.textContent.trim().slice(0, 16)}" ${Math.round((100 * area) / small)}%`); }
  }
  const clipped = texts.filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible').map((el) => `${el.className}:"${el.textContent.trim().slice(0, 24)}"`);
  const off = [...root.querySelectorAll('*')].filter(vis).filter((el) => { const r = el.getBoundingClientRect(); return r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1; }).map((el) => el.className).slice(0, 6);
  const small = texts.map((el) => parseFloat(getComputedStyle(el).fontSize)).filter((f) => f < 12);
  const tabs = [...root.querySelectorAll('.rn-ptab')].filter(vis).map((t) => { const r = t.getBoundingClientRect(); return { seat: t.dataset.seat, x: Math.round(r.x), y: Math.round(r.y), h: Math.round(r.height) }; });
  const rr = root.getBoundingClientRect();
  const doc = document.scrollingElement || document.documentElement;
  return { ov: [...new Set(ov)].slice(0, 10), clipped: clipped.slice(0, 8), off, smallMin: small.length ? Math.min(...small) : null, nSmall: small.length, tabs, root: { x: Math.round(rr.x), y: Math.round(rr.y), w: Math.round(rr.width), h: Math.round(rr.height) }, scroll: doc.scrollHeight > innerHeight + 1 || doc.scrollWidth > innerWidth + 1 };
};
const b = await launch();
try {
  for (const [Wd, Ht] of SIZES) {
    const size = `${Wd}x${Ht}`;
    const { page, errors } = await open(b, `${BASEURL}?menu=0&seed=7`, { width: Wd, height: Ht });
    const pad = (i) => E(page, (bi) => window.__padPress(bi), i);
    const viewSeat = () => E(page, () => { const u = window.__echoes.runUi(); return u.draft ? u.draft.viewSeat : null; });
    // ----------------------------------------------------------- party page
    await E(page, () => { window.__echoes.cmd('startRun', { act: 1 }); return 1; });
    await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
    await sleep(1200);
    await E(page, () => { window.__echoes.cmd('killAllEnemies'); return 1; });
    await waitFor(page, () => window.__echoes.runUi().screen === 'draft', null, 30000);
    const tOpen = Date.now();
    await sleep(1400);
    const perTab = [];
    for (let s = 0; s < 4; s++) {
      await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][s]);
      await sleep(450);
      const vs = await viewSeat();
      const a = await E(page, AUDIT, '.rn-draft');
      const owner = await E(page, () => { const o = document.querySelector('.rn-draft .rn-owner'); const c = document.querySelector('.rn-draft .rn-card'); return { owner: o ? o.innerText.trim() : null, cardSeat: c ? c.dataset.seat : null, reps: [...document.querySelectorAll('.rn-draft .rn-rep')].map((r) => r.dataset.seat) }; });
      await shot(page, `gntfixPARTY5-ux-${size}-page-seat${s}`);
      perTab.push({ s, vs, a, owner });
      res(size, 'page', `F${s + 1} -> viewSeat ${vs}; owner label "${owner.owner}", card data-seat ${owner.cardSeat}`, vs === s && String(owner.cardSeat) === String(s) && /healer|tank|swordsman|archer/i.test(owner.owner || ''), owner);
      res(size, 'page', `seat ${s}: no text overlap, no clipped text, nothing off-screen, no scrollbar`, !a.ov.length && !a.clipped.length && !a.off.length && !a.scroll, { ov: a.ov, clipped: a.clipped, off: a.off, scroll: a.scroll });
    }
    const tabY = perTab.map((p) => (p.a.tabs[0] ? p.a.tabs[0].y : null));
    const rootH = perTab.map((p) => p.a.root.h);
    res(size, 'page', `tab strip stays put while switching characters (tab row y per viewed seat ${JSON.stringify(tabY)}; page height ${JSON.stringify(rootH)})`, Math.max(...tabY) - Math.min(...tabY) <= 4, { tabY, rootH });
    const tabH = perTab[0].a.tabs.map((t) => t.h);
    res(size, 'page', `tabs >= 44 px tall (${JSON.stringify(tabH)})`, tabH.every((h) => h >= 44 * Math.min(1, Ht / 900) - 0.5 || h >= 44), tabH);
    // Q/E wrap + counts
    await page.keyboard.press('F1'); await sleep(350);
    await page.keyboard.press('KeyQ'); await sleep(350);
    const q = await viewSeat();
    res(size, 'page', `Q from Healer wraps to Archer (${q})`, q === 3, q);
    await page.keyboard.press('KeyE'); await sleep(350);
    const e1 = await viewSeat();
    res(size, 'page', `E from Archer wraps to Healer (${e1})`, e1 === 0, e1);
    // mouse: click the Swordsman tab
    const tb = await E(page, () => { const t = document.querySelector('.rn-draft .rn-ptab[data-seat="2"]'); const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.click(tb.x, tb.y); await sleep(400);
    const m1 = await viewSeat();
    res(size, 'page', `one click on the Swordsman tab -> viewSeat ${m1}`, m1 === 2, m1);
    // pad RB / LB
    await pad(5); await sleep(200);
    const p1 = await viewSeat();
    await pad(4); await sleep(200);
    const p2 = await viewSeat();
    res(size, 'page', `pad RB 2 -> ${p1}, LB -> ${p2}`, p1 === 3 && p2 === 2, { p1, p2 });
    // pad D-pad on the Tank's swap card
    await page.keyboard.press('F2'); await sleep(400);
    const r0 = await E(page, () => window.__echoes.state().run.party.cards[1].replace);
    await pad(13); await sleep(250);
    const r1 = await E(page, () => window.__echoes.state().run.party.cards[1].replace);
    await pad(12); await sleep(250);
    const r2 = await E(page, () => window.__echoes.state().run.party.cards[1].replace);
    res(size, 'page', `pad D-pad down/up cycles the Tank's Replaces (${r0} -> ${r1} -> ${r2})`, r1 !== r0 && r2 === r0, { r0, r1, r2 });
    // wheel
    const cb = await E(page, () => { const c = document.querySelector('.rn-draft .rn-card'); const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(cb.x, cb.y);
    await page.mouse.wheel({ deltaY: 120 }); await sleep(300);
    const r3 = await E(page, () => window.__echoes.state().run.party.cards[1].replace);
    res(size, 'page', `wheel over the card cycles Replaces (${r2} -> ${r3})`, r3 !== r2, { r2, r3 });
    await page.mouse.wheel({ deltaY: -120 }); await sleep(300);
    // commit: the Healer's card needs Enter; count Enters from the Healer tab until the page closes
    await page.keyboard.press('F1'); await sleep(400);
    let enters = 0;
    for (let i = 0; i < 6; i++) { const s = await E(page, () => window.__echoes.runUi().screen); if (s !== 'draft') break; await page.keyboard.press('Enter'); enters++; await sleep(600); }
    res(size, 'page', `Suggested mode: the page commits after ${enters} Enter from the Healer's tab`, enters === 1, enters);
    // ----------------------------------------------------------- shop
    await E(page, () => { window.__echoes.cmd('skipToRoom', 7); return 1; });
    await waitFor(page, () => window.__echoes.runUi().screen === 'shop', null, 30000).catch(() => null);
    await sleep(1500);
    const shopScreen = await E(page, () => window.__echoes.runUi().screen);
    if (shopScreen === 'shop') {
      for (let s = 0; s < 4; s++) {
        await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][s]); await sleep(450);
        const vs = await E(page, () => { const u = window.__echoes.runUi(); return u.shop && u.shop.party ? u.shop.party.viewSeat : (u.shop ? u.shop.viewSeat : null); });
        const own = await E(page, () => { const cs = [...document.querySelectorAll('.rn-shop [data-seat]')].filter((e) => e.offsetParent).map((e) => e.dataset.seat); const txt = (document.querySelector('.rn-shop') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 500); return { seats: [...new Set(cs)], txt }; });
        const a = await E(page, AUDIT, '.rn-shop');
        await shot(page, `gntfixPARTY5-ux-${size}-shop-seat${s}`);
        res(size, 'shop', `F${s + 1} -> viewSeat ${vs}; data-seat tags ${JSON.stringify(own.seats)}`, vs === s, { vs, own: own.seats, txt: own.txt.slice(0, 200) });
        res(size, 'shop', `seat ${s}: no text overlap / clipping / off-screen / scrollbar`, !a.missing && !a.ov.length && !a.clipped.length && !a.off.length && !a.scroll, a);
      }
    } else res(size, 'shop', 'shop opened via skipToRoom(7)', false, shopScreen);
    // ----------------------------------------------------------- socket screen
    await page.keyboard.press('F1'); await sleep(300);
    await page.keyboard.press('KeyB'); await sleep(900);
    const sock = await E(page, () => { const X = window.__echoes; let su = null; try { su = X.content.socketUi(); } catch (e) { su = String(e); } return { screen: X.runUi().screen, su: su && su.viewSeat !== undefined ? { viewSeat: su.viewSeat, rows: su.rows && su.rows.length } : su }; });
    if (sock.su && sock.su.viewSeat !== undefined) {
      for (let s = 0; s < 4; s++) {
        await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][s]); await sleep(450);
        const su = await E(page, () => { const x = window.__echoes.content.socketUi(); return { viewSeat: x.viewSeat, rows: (x.rows || []).map((r) => r.skill || r.id) }; });
        const rootSel = await E(page, () => { const c = ['.sk-root', '.sock', '.rn-socket', '[class*="socket"]'].map((s) => document.querySelector(s)).find((e) => e && e.offsetParent); return c ? '.' + [...c.classList][0] : null; });
        const a = rootSel ? await E(page, AUDIT, rootSel) : { missing: true };
        await shot(page, `gntfixPARTY5-ux-${size}-socket-seat${s}`);
        res(size, 'socket', `F${s + 1} -> socket viewSeat ${su.viewSeat}, rows ${JSON.stringify(su.rows)}`, su.viewSeat === s, su);
        res(size, 'socket', `seat ${s}: no text overlap / clipping / off-screen / scrollbar (root ${rootSel})`, !a.missing && !a.ov.length && !a.clipped.length && !a.off.length && !a.scroll, a);
      }
    } else res(size, 'socket', 'socket screen opens with B from the shop', false, sock);
    res(size, 'all', `0 page errors (${errors.length})`, errors.length === 0, errors.slice(0, 3));
    await page.close();
  }
} finally { await b.close(); }
writeJson('gntfixPARTY5-ux', results);
console.log(`${results.filter((r) => r.ok).length}/${results.length} pass`);
