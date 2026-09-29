// gntccontent5 — socket screen (4 characters x 4 skills x 8 sockets) + command bar at W x H: layout audit, then real
// keyboard / mouse / mocked-gamepad operations on ALLY seats (pick, place, remove, auto-fill, switch character, close).
// Setup: ?level=2&seed=7, L2 room 1 cleared by cmd, the Healer card left with X -> path page; nodes granted by cmd.
import { boot, ev, writeJson, BASE, sleep, waitFor, key, shot } from './gntccontent5-lib.mjs';
const W = +(process.argv[2] || 1600), H = +(process.argv[3] || 900);
const tag = `${W}x${H}`;
const { browser, page, errors } = await boot(BASE + `?level=2&seed=7`, { w: W, h: H });
const r = { tag };
await waitFor(page, () => { const s = window.__echoes.state(); return s.run && s.run.phase === 'combat' && s.run.room === 1; }, { timeout: 90000 });
await sleep(1000);
await ev(page, () => { window.__s5 = []; window.__echoes.on('*', (e) => { if (/socket|node_|build_/.test(e.type)) window.__s5.push(e); }); window.__echoes.cmd('killAllEnemies'); });
await waitFor(page, () => window.__echoes.state().run.phase === 'reward', { timeout: 30000 });
await sleep(1400);
await key(page, 'KeyX');
await waitFor(page, () => window.__echoes.state().run.phase === 'path', { timeout: 10000 });
await sleep(900);
r.grant = await ev(page, () => { const E = window.__echoes; for (const n of ['sharpen', 'quicken', 'reach', 'widen']) { E.cmd('partyGrantNode', 1, n, 'harness'); E.cmd('partyGrantNode', 3, n === 'widen' ? 'keen' : n, 'harness'); } return [1, 3].map((s) => E.cmd('partyView', s).bench.length); });
const boxAudit = (W, H, list) => {
  const inside = list.every((b) => b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= W + 0.5 && b.y + b.h <= H + 0.5);
  const ov = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a = list[i], b = list[j]; const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); if (ox > 0.5 && oy > 0.5) ov.push([a.k, b.k, +ox.toFixed(1), +oy.toFixed(1)]); }
  return { n: list.length, inside, overlaps: ov };
};
r.hud = await ev(page, (W, H, src) => {
  const boxAudit = eval(src);
  const E = window.__echoes;
  const boxes = [];
  E.hud.slots().forEach((s) => { if (s.tileBox) boxes.push({ k: 'tile' + s.key, ...s.tileBox }); if (s.pipsBox) boxes.push({ k: 'pips' + s.key, ...s.pipsBox }); });
  let P = null; try { P = E.hud.portraits(); } catch {}
  (P || []).forEach((p, i) => { const b = p.box || p.rect || p.tileBox || p.frameBox; if (b) boxes.push({ k: 'portrait' + i, ...b }); });
  return { ...boxAudit(W, H, boxes), slots: E.hud.slots().map((s) => [s.key, s.abbrev, s.sockets && s.sockets.filled]) };
}, W, H, boxAudit.toString());
await shot(page, `gntfixM4a5-hud-${tag}`);
const su = () => ev(page, () => { const s = window.__echoes.content.socketUi(); return { open: s.open, seat: s.viewSeat, focus: s.focus, held: s.held, inHand: s.inHand, bench: s.bench.length, rows: s.rows, rowSeats: s.rowSeats }; });
const pv = (seat) => ev(page, (seat) => { const v = window.__echoes.cmd('partyView', seat ?? 0); if (!v) return null; return { slots: v.slots, filled: v.filled, bench: v.bench.length, rows: v.skills.map((s) => s.sockets.map((c) => c && c.node)) }; }, seat);
const audit = async (name) => {
  const a = await ev(page, (W, H, src) => {
    const boxAudit = eval(src);
    const s = window.__echoes.content.socketUi();
    const R = s.rects;
    const tabs = [...document.querySelectorAll('[data-seat]')].filter((el) => { const rc = el.getBoundingClientRect(); return rc.width > 0 && rc.height > 0 && /tab|strip/i.test(String(el.className)); }).map((el, i) => { const rc = el.getBoundingClientRect(); return { k: 'tab' + el.getAttribute('data-seat') + '_' + i, x: rc.x, y: rc.y, w: rc.width, h: rc.height }; });
    const all = [...R.cells.map((c, i) => ({ k: 'cell' + i, ...c })), ...R.chips.map((c, i) => ({ k: 'chip' + i, ...c })), { k: 'detail', ...R.detail }, { k: 'auto', ...R.auto }, ...tabs];
    const au = boxAudit(W, H, [R.page, ...all].map((b, i) => (i === 0 ? { k: 'page', ...b } : b)));
    au.overlaps = au.overlaps.filter((o) => o[0] !== 'page' && o[1] !== 'page');
    const minCell = Math.min(...R.cells.map((c) => Math.min(c.w, c.h)));
    let minText = 1e9, minEl = null;
    for (const el of document.querySelectorAll('body *')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const rc = el.getBoundingClientRect();
      if (rc.width < 1 || rc.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const cx = rc.x + rc.width / 2, cy = rc.y + rc.height / 2;
      if (cx < R.page.x || cx > R.page.x + R.page.w || cy < R.page.y || cy > R.page.y + R.page.h) continue;
      const top = document.elementFromPoint(cx, cy);
      if (!top || !(top === el || el.contains(top) || top.contains(el))) continue;
      const sc = el.offsetHeight ? rc.height / el.offsetHeight : 1;
      const real = parseFloat(cs.fontSize) * sc;
      if (real < minText) { minText = real; minEl = String(el.className || el.tagName).slice(0, 40) + ' [' + el.textContent.trim().slice(0, 24) + ']'; }
    }
    let clipped = 0; window.__clipList = []; const pg0 = document.querySelector('#socket-screen .nd-page');
    for (const el of document.querySelectorAll('body *')) { const rc = el.getBoundingClientRect(); if (rc.width < 1) continue; const cx = rc.x + rc.width / 2, cy = rc.y + rc.height / 2; if (cx < R.page.x || cx > R.page.x + R.page.w || cy < R.page.y || cy > R.page.y + R.page.h) continue; const cs = getComputedStyle(el); if ((cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1 && el.textContent.trim()) { clipped++; (window.__clipList = window.__clipList || []).push(String(el.className).slice(0, 30) + ' [' + el.textContent.trim().slice(0, 30) + ']'); } if ((cs.overflowY === 'hidden') && el.scrollHeight > el.clientHeight + 3 && el.textContent.trim() && pg0.contains(el)) { clipped++; (window.__clipList = window.__clipList || []).push('Y:' + String(el.className).slice(0, 30) + ' ' + el.scrollHeight + '>' + el.clientHeight); } }
    let scrollable = document.documentElement.scrollHeight > innerHeight + 2;
    const pg = document.querySelector('#socket-screen .nd-page');
    const pr = pg.getBoundingClientRect();
    const sc2 = pr.height / pg.offsetHeight;
    const kids = [...pg.children].filter((k) => k.offsetHeight > 0 && getComputedStyle(k).position !== 'absolute');
    const lastBottom = Math.max(...kids.map((k) => k.getBoundingClientRect().bottom));
    const fit = { pageDesignH: pg.offsetHeight, contentDesignBottom: +((lastBottom - pr.top) / sc2).toFixed(1), rowsOverflow: [...pg.querySelectorAll('.nd-row')].map((r) => r.scrollHeight - r.clientHeight) };
    const car = pg.querySelector('.rn-ptab.rn-pview .rn-pcaret');
    const btns = [...pg.querySelectorAll('.nd-head .nd-btn, .nd-head .nd-sub, .nd-head .nd-total')].map((e) => e.getBoundingClientRect());
    if (car) { const c = car.getBoundingClientRect(); fit.caretHits = btns.filter((b) => Math.min(b.right, c.right) - Math.max(b.left, c.left) > 0.5 && Math.min(b.bottom, c.bottom) - Math.max(b.top, c.top) > 0.5).length; fit.caret = [Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height)]; }
    fit.rnameLines = [...pg.querySelectorAll('.nd-rname')].map((n) => [n.textContent, Math.round(n.getBoundingClientRect().height / sc2), n.scrollHeight > n.clientHeight + 2 ? 'CLIP' : 'ok']);
    return { ...au, nCells: R.cells.length, nChips: R.chips.length, nTabs: tabs.length, minCell: +minCell.toFixed(1), minText: +minText.toFixed(1), minEl, clipped, clipList: (window.__clipList || []).slice(0, 12), fit, scrollable, scale: s.scale };
  }, W, H, boxAudit.toString());
  r['audit_' + name] = a;
  await shot(page, `gntfixM4a5-socket-${name}-${tag}`);
  return a;
};
// ---- keyboard ----
const kb = {};
await key(page, 'KeyB');
kb.openW = await waitFor(page, () => window.__echoes.content.socketUi().open, { timeout: 5000 });
await sleep(800);
kb.s0 = await su();
await audit('healer');
await key(page, 'KeyE'); await sleep(500); kb.afterE = await su();
kb.tank0 = await pv(1);
await audit('tank');
// focus the bench: Enter on a vacant cell? -> use the documented order: Enter picks (focus starts on the bench when it has nodes)
await key(page, 'Enter'); await sleep(300); kb.pick = await su();
await key(page, 'Enter'); await sleep(350); kb.place = await su(); kb.tank1 = await pv(1);
await key(page, 'KeyX'); await sleep(350); kb.removeSu = await su(); kb.tank2 = await pv(1);
await key(page, 'KeyF'); await sleep(500); kb.tank3 = await pv(1);
await key(page, 'F4'); await sleep(600); kb.f4 = await su();
await audit('archer');
await key(page, 'KeyQ'); await sleep(600); kb.q = await su();
await audit('swordsman');
await key(page, 'F1'); await sleep(600); kb.f1 = await su();
kb.events = await ev(page, () => window.__s5.slice(-12).map((e) => [e.type, e.seat, e.skill, e.node, e.slot, e.reason || e.denied]));
// Esc consumed + closes
await ev(page, () => { window.__escPrev = null; window.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.__escPrev = e.defaultPrevented; }); });
await key(page, 'Escape'); await sleep(400);
kb.escPrevented = await ev(page, () => window.__escPrev);
kb.escClosed = await su();
kb.phaseAfterEsc = await ev(page, () => window.__echoes.state().run.phase);
r.kb = kb;
// ---- mouse ----
const ms = {};
await key(page, 'KeyB'); await sleep(800);
const tabBox = await ev(page, () => { const el = [...document.querySelectorAll('[data-seat="3"]')].find((e) => { const rc = e.getBoundingClientRect(); return rc.width > 40 && /tab|strip/i.test(String(e.className)); }); if (!el) return null; const rc = el.getBoundingClientRect(); return { x: rc.x + rc.width / 2, y: rc.y + rc.height / 2, cls: String(el.className) }; });
ms.tabBox = tabBox;
if (tabBox) { await page.mouse.click(tabBox.x, tabBox.y); await sleep(700); }
ms.afterTab = await su();
ms.ar0 = await pv(3);
const R = await ev(page, () => window.__echoes.content.socketUi().rects);
const vac = await ev(page, () => { const s = window.__echoes.content.socketUi(); for (let i = 0; i < s.cells.length; i++) for (let c = 0; c < 8; c++) if (s.cells[i][c].state === 'vacant') return i * 8 + c; return -1; });
ms.vac = vac;
if (R.chips.length && vac >= 0) {
  await page.mouse.click(R.chips[0].x + R.chips[0].w / 2, R.chips[0].y + R.chips[0].h / 2); await sleep(300);
  ms.held = await su();
  await page.mouse.click(R.cells[vac].x + R.cells[vac].w / 2, R.cells[vac].y + R.cells[vac].h / 2); await sleep(400);
  ms.ar1 = await pv(3);
  await page.mouse.click(R.cells[vac].x + R.cells[vac].w / 2, R.cells[vac].y + R.cells[vac].h / 2, { button: 'right' }); await sleep(400);
  ms.ar2 = await pv(3);
}
await key(page, 'Escape'); await sleep(400);
ms.closed = await su();
r.ms = ms;
// ---- gamepad (mocked standard mapping) ----
await ev(page, () => {
  window.__pad = { id: 'Mock Standard Gamepad', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  navigator.getGamepads = () => [window.__pad, null, null, null];
  const e = new Event('gamepadconnected'); e.gamepad = window.__pad; window.dispatchEvent(e);
});
await sleep(400);
const pad = async (b, hold = 140) => { await ev(page, (b) => { window.__pad.buttons[b] = { pressed: true, touched: true, value: 1 }; window.__pad.timestamp = performance.now(); }, b); await sleep(hold); await ev(page, (b) => { window.__pad.buttons[b] = { pressed: false, touched: false, value: 0 }; window.__pad.timestamp = performance.now(); }, b); await sleep(300); };
const gp = {};
await pad(8); await sleep(500); gp.view = await su();
if (!gp.view.open) { await pad(8); await sleep(500); gp.view2 = await su(); }
await pad(5); await sleep(500); gp.rb = await su();
gp.t0 = await pv(1);
await pad(3); await sleep(500); gp.t1 = await pv(1);
await pad(5); await sleep(500); gp.rb2 = await su();
await pad(4); await sleep(500); gp.lb = await su();
await pad(13); gp.down = await su();
await pad(15); gp.right = await su();
await pad(2); await sleep(300); gp.xRemove = await pv(gp.lb.seat ?? 0);
await pad(1); await sleep(400); gp.b = await su();
r.gp = gp;
r.errors = errors;
writeJson(`gntfixM4a5-socketui-${tag}.json`, r);
const A = (a) => a && { n: a.n, inside: a.inside, ov: a.overlaps.length, ovS: a.overlaps.slice(0, 3), cells: a.nCells, chips: a.nChips, tabs: a.nTabs, minCell: a.minCell, minText: a.minText, minEl: a.minEl, clipped: a.clipped, clipList: a.clipList, fit: a.fit, scale: a.scale, scroll: a.scrollable };
console.log(JSON.stringify({ hud: { n: r.hud.n, inside: r.hud.inside, ov: r.hud.overlaps }, healer: A(r.audit_healer), tank: A(r.audit_tank), archer: A(r.audit_archer), swordsman: A(r.audit_swordsman) }));
console.log('kb', JSON.stringify({ open: kb.openW.ok, s0: kb.s0.seat, E: kb.afterE.seat, pick: [kb.pick.held, kb.pick.inHand], tankFilled: [kb.tank0.filled, kb.tank1.filled, kb.tank2.filled, kb.tank3.filled], bench: [kb.tank0.bench, kb.tank1.bench, kb.tank2.bench, kb.tank3.bench], F4: kb.f4.seat, Q: kb.q.seat, F1: kb.f1.seat, esc: [kb.escPrevented, kb.escClosed.open, kb.phaseAfterEsc], ev: kb.events }));
console.log('ms', JSON.stringify({ tab: ms.afterTab && ms.afterTab.seat, filled: [ms.ar0 && ms.ar0.filled, ms.ar1 && ms.ar1.filled, ms.ar2 && ms.ar2.filled], held: ms.held && [ms.held.held, ms.held.inHand], closed: ms.closed.open }));
console.log('gp', JSON.stringify({ view: gp.view.open, view2: gp.view2 && gp.view2.open, rb: gp.rb.seat, y: [gp.t0.filled, gp.t1.filled], rb2: gp.rb2.seat, lb: gp.lb.seat, down: gp.down.focus, right: gp.right.focus, b: gp.b.open }));
console.log('errors', errors);
await browser.close();
