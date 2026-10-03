#!/usr/bin/env node
// PARTY GP.6 selection UX by REAL input (keyboard, mouse, a mocked pad), on
// the party page, the shop and the socket screen, at 1024×576, 1600×900,
// 1920×1080 and 2560×1440 (GPU harness, the production preview):
//   - every viewed card / shelf card / socket row carries an owner band
//     naming its character and a `data-seat` matching the viewed tab;
//   - from any tab to any other in <= 2 inputs: Q/E, F1–F4, one click on the
//     tab, the pad's LB/RB (Q/E and LB/RB wrap: never more than 2 steps);
//   - the Replaces selector (a swap card) moves by W/S, the wheel and the
//     D-pad;
//   - the settle window: a switch inside the first 300 ms of a page is
//     dropped and E / F1–F4 restart the window (runUi().settleInMs /
//     carryMs; the restart is capped 1000 ms after the page opens, so the
//     walks below start once a page is past that cap);
//   - layout: 0 overlapping interactive boxes, 0 clipped text, no scrollbars,
//     every tab >= 44 design px tall, text >= 16 design px.
//   node tools/gntPARTY-ux.mjs [--url http://127.0.0.1:4400/] [--sizes 1024x576,1600x900,1920x1080,2560x1440]
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const opt = (k, d = null) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const BASE = opt('url', 'http://127.0.0.1:4400/');
const SIZES = opt('sizes', '1024x576,1600x900,1920x1080,2560x1440').split(',').map((s) => s.split('x').map(Number));
const results = [];
function check(size, name, pass, got = null) {
  results.push({ size, name, pass: !!pass, got });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${size}] ${name}${pass ? '' : ' ' + JSON.stringify(got).slice(0, 600)}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// In-page layout audit of the visible screen root.
const AUDIT = (rootSel) => {
  const root = document.querySelector(rootSel);
  if (!root) return { error: `no ${rootSel}` };
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const inter = [...root.querySelectorAll('.rn-ptab, .rn-btn, .rn-rep, .rn-card, .rn-suggest, .nd-cell, .nd-chip, .nd-btn, .nd-auto, .nd-autoall, button, [data-act]')].filter(vis);
  const overlaps = [];
  for (let i = 0; i < inter.length; i++) {
    for (let j = i + 1; j < inter.length; j++) {
      const a = inter[i];
      const b = inter[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 2 && oy > 2) overlaps.push(`${a.className}|${b.className}`.slice(0, 120));
    }
  }
  const clipped = [];
  const small = [];
  for (const el of root.querySelectorAll('*')) {
    if (!vis(el)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1) clipped.push(`${el.className}:${el.textContent.trim().slice(0, 30)}`);
    const fs = parseFloat(cs.fontSize);
    if (fs < 15.5) small.push(`${el.className || el.tagName}:${fs}px:${el.textContent.trim().slice(0, 24)}`);
  }
  const doc = document.scrollingElement || document.documentElement;
  const scroll = doc.scrollWidth > innerWidth + 1 || doc.scrollHeight > innerHeight + 1;
  const tabs = [...root.querySelectorAll('.rn-ptab')].filter(vis).map((t) => t.offsetHeight);
  // Off-screen: interactive boxes beyond the viewport.
  const off = inter.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1;
  }).map((el) => el.className.slice(0, 40));
  // One page: the screen's own box inside the viewport too (a title or a
  // tab strip pushed off the top is a clip even when nothing overflows).
  const rr = root.getBoundingClientRect();
  if (rr.top < -1 || rr.left < -1 || rr.bottom > innerHeight + 1 || rr.right > innerWidth + 1) off.push(`page ${Math.round(rr.top)}..${Math.round(rr.bottom)} of ${innerHeight}`);
  return { overlaps: [...new Set(overlaps)].slice(0, 8), clipped: clipped.slice(0, 8), small: [...new Set(small)].slice(0, 12), scroll, tabs, off: off.slice(0, 6), n: inter.length };
};

const browser = await launchEchoes({ gpu: true, width: 1600, height: 900 });
try {
  for (const [W, H] of SIZES) {
    const size = `${W}x${H}`;
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    await page.evaluateOnNewDocument(() => {
      window.__pad = { buttons: new Array(17).fill(0), axes: [0, 0, 0, 0] };
      const mk = () => ({ id: 'Mock Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: window.__pad.axes.slice(), buttons: window.__pad.buttons.map((v) => ({ pressed: v > 0.5, touched: v > 0.1, value: v })) });
      navigator.getGamepads = () => [mk(), null, null, null];
      window.__padPress = async (i, ms = 90) => {
        window.__pad.buttons[i] = 1;
        await new Promise((r) => setTimeout(r, ms));
        window.__pad.buttons[i] = 0;
        await new Promise((r) => setTimeout(r, 160));
      };
    });
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.goto(`${BASE}?menu=0&seed=7`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 120, { timeout: 180000 });
    await page.bringToFront();
    const pad = (i) => page.evaluate((b) => window.__padPress(b), i);
    const seatOf = (screen) => page.evaluate((s) => { const u = window.__echoes.runUi(); return s === 'socket' ? window.__echoes.content.socketUi().viewSeat : u[s] ? u[s].viewSeat : (u.probe && u.probe().viewSeat); }, screen);
    // ------------------------------------------------------ party page --
    await page.evaluate(() => { const E = window.__echoes; E.cmd('startRun', { act: 1 }); return 1; });
    await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
    await sleep(1500);
    await page.evaluate(() => { window.__echoes.cmd('killAllEnemies'); return 1; });
    // The page's open time = the first rAF poll that sees it (within a frame).
    await page.waitForFunction(() => window.__echoes.runUi().screen === 'draft' && (window.__uxOpen = performance.now()), { timeout: 20000, polling: 'raf' });
    const tOpen = await page.evaluate(() => window.__uxOpen);
    // Settle: a switch inside the first 300 ms is dropped.
    const s0 = await seatOf('draft');
    await page.keyboard.press('KeyE');
    const s1 = await seatOf('draft');
    const st1 = await page.evaluate(() => { const u = window.__echoes.runUi(); return { settleInMs: u.settleInMs, carryMs: u.carryMs }; });
    const early = await page.evaluate((t) => performance.now() - t, tOpen);
    check(size, `settle: E ${Math.round(early)} ms after the party page opened is dropped (seat ${s0} -> ${s1}) and restarts the window (carry ${st1.carryMs} ms ago, settle in ${st1.settleInMs} ms)`, (s1 === s0 && st1.carryMs !== null && st1.settleInMs > 0) || early > 300, { s0, s1, early, st1 });
    // Past the capped window (1000 ms after open) before walking the tabs.
    await page.waitForFunction((t) => performance.now() - t > 1150 && window.__echoes.runUi().settleInMs === 0, { timeout: 5000 }, tOpen);
    const ui = await page.evaluate(() => window.__echoes.runUi().draft);
    const card = await page.evaluate(() => { const c = document.querySelector('.rn-draft .rn-card'); const o = document.querySelector('.rn-draft .rn-ownerhost'); return { seat: c ? Number(c.dataset.seat) : null, owner: o ? o.textContent.trim() : null }; });
    const NAMES = ['Healer', 'Tank', 'Swordsman', 'Archer'];
    check(size, `party page: the viewed card carries data-seat ${card.seat} = the viewed tab ${ui.viewSeat} and an owner band naming "${NAMES[ui.viewSeat]}"`, card.seat === ui.viewSeat && new RegExp(NAMES[ui.viewSeat], 'i').test(card.owner || ''), { card, ui });
    // Every tab pair by keys (Q/E: <= 2 presses; F1-F4: 1).
    const pairs = [];
    for (let from = 0; from < 4; from++) {
      for (let to = 0; to < 4; to++) {
        if (from === to) continue;
        await page.keyboard.press(`F${from + 1}`);
        await sleep(360);
        const fwd = (to - from + 4) % 4;
        const n = fwd <= 2 ? fwd : 4 - fwd;
        const key = fwd <= 2 ? 'KeyE' : 'KeyQ';
        for (let k = 0; k < n; k++) {
          await page.keyboard.press(key);
          await sleep(120);
        }
        const got = await seatOf('draft');
        pairs.push({ from, to, n, ok: got === to });
      }
    }
    check(size, `party page: every tab pair reached in <= 2 Q/E presses (${pairs.filter((p) => p.ok).length}/12)`, pairs.every((p) => p.ok && p.n <= 2), pairs.filter((p) => !p.ok));
    const fkeys = [];
    for (let s = 0; s < 4; s++) {
      await page.keyboard.press(`F${s + 1}`);
      await sleep(150);
      fkeys.push((await seatOf('draft')) === s);
    }
    check(size, `party page: F1–F4 reach each tab in 1 input (${JSON.stringify(fkeys)})`, fkeys.every(Boolean), fkeys);
    const clicks = [];
    for (let s = 0; s < 4; s++) {
      const r = await page.evaluate((i) => { const t = [...document.querySelectorAll('.rn-draft .rn-ptab')].find((x) => Number(x.dataset.seat) === i); if (!t) return null; const b = t.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, s);
      if (r) await page.mouse.click(r.x, r.y);
      await sleep(150);
      clicks.push((await seatOf('draft')) === s);
    }
    check(size, `party page: one click on a tab reaches it (${JSON.stringify(clicks)})`, clicks.every(Boolean), clicks);
    await page.keyboard.press('F1');
    await sleep(200);
    const padSeats = [];
    for (let k = 0; k < 4; k++) {
      await pad(5);
      padSeats.push(await seatOf('draft'));
    }
    await pad(4);
    const back = await seatOf('draft');
    check(size, `party page: the pad's RB walks the tabs (${JSON.stringify(padSeats)}), LB goes back (${back})`, JSON.stringify(padSeats) === JSON.stringify([1, 2, 3, 0]) && back === 3, { padSeats, back });
    // Replaces selector on an ally swap card (allies hold 4 skills).
    const swapSeat = await page.evaluate(() => { const v = window.__echoes.state().run; const c = v.party && v.party.cards.find((k) => k.seat > 0 && k.swap); return c ? c.seat : null; });
    if (swapSeat !== null) {
      await page.keyboard.press(`F${swapSeat + 1}`);
      await sleep(400);
      const rep = () => page.evaluate(() => window.__echoes.runUi().draft.replace);
      const r0 = await rep();
      await page.keyboard.press('KeyS');
      await sleep(150);
      const r1 = await rep();
      await page.keyboard.press('KeyW');
      await sleep(150);
      const r2 = await rep();
      const box = await page.evaluate(() => { const e = document.querySelector('.rn-draft .rn-replace') || document.querySelector('.rn-draft .rn-card'); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
      await page.mouse.move(box.x, box.y);
      await page.mouse.wheel({ deltaY: 120 });
      await sleep(200);
      const r3 = await rep();
      await page.evaluate(() => window.__padPress(13));
      const r4 = await rep();
      check(size, `Replaces selector on the ${NAMES[swapSeat]}'s swap card: S ${r0}→${r1}, W →${r2}, wheel →${r3}, D-pad ↓ →${r4}`, r1 !== r0 && r2 === r0 && r3 !== r2 && r4 !== r3, { r0, r1, r2, r3, r4 });
    } else check(size, 'Replaces selector: an ally swap card on the first page', false, 'no ally swap card');
    const a1 = await page.evaluate(AUDIT, '.rn-draft');
    check(size, `party page layout: ${a1.overlaps.length} overlapping interactive boxes, ${a1.clipped.length} clipped texts, scrollbars ${a1.scroll}, tabs ${JSON.stringify(a1.tabs)} design px, ${a1.small.length} texts < 16 px, ${a1.off.length} off-screen`, a1.overlaps.length === 0 && a1.clipped.length === 0 && !a1.scroll && a1.tabs.length === 4 && a1.tabs.every((h) => h >= 44) && a1.small.length === 0 && a1.off.length === 0, a1);
    await page.screenshot({ path: `captures/gntfixM5a6-partyux-page-${size}.png` });
    // ---------------------------------------------------- socket screen --
    await page.keyboard.press('KeyB');
    await page.waitForFunction(() => window.__echoes.content.socketUi().open, { timeout: 5000 }).catch(() => {});
    await sleep(400);
    const so = [];
    for (let s = 0; s < 4; s++) {
      await page.keyboard.press('KeyE');
      await sleep(180);
      so.push(await seatOf('socket'));
    }
    const rows = await page.evaluate(() => window.__echoes.content.socketUi().rowSeats);
    const sv = await seatOf('socket');
    check(size, `socket screen: E walks the tabs (${JSON.stringify(so)}); every row's data-seat = the viewed tab (${JSON.stringify(rows)} vs ${sv})`, new Set(so).size === 4 && rows.every((r) => r === sv), { so, rows, sv });
    const sp = [];
    for (let k = 0; k < 2; k++) {
      await pad(5);
      sp.push(await seatOf('socket'));
    }
    check(size, `socket screen: the pad's RB switches characters (${JSON.stringify(sp)})`, sp[0] !== sp[1], sp);
    const a2 = await page.evaluate(AUDIT, '#socket-screen');
    check(size, `socket screen layout: ${a2.overlaps.length} overlaps, ${a2.clipped.length} clipped, scrollbars ${a2.scroll}, tabs ${JSON.stringify(a2.tabs)}, ${a2.small.length} texts < 16 px, ${a2.off.length} off-screen`, a2.overlaps.length === 0 && a2.clipped.length === 0 && !a2.scroll && a2.tabs.every((h) => h >= 44) && a2.small.length === 0 && a2.off.length === 0, a2);
    await page.screenshot({ path: `captures/gntfixM5a6-partyux-socket-${size}.png` });
    await page.keyboard.press('Escape');
    await sleep(300);
    // --------------------------------------------------------------- shop --
    await page.evaluate(() => { window.__echoes.cmd('skipToRoom', 7); return 1; });
    await page.waitForFunction(() => window.__echoes.runUi().screen === 'shop' && (window.__uxOpen = performance.now()), { timeout: 20000, polling: 'raf' });
    const tShop = await page.evaluate(() => window.__uxOpen);
    {
      const q0 = await seatOf('shop');
      await page.keyboard.press('F2');
      const q1 = await seatOf('shop');
      const st2 = await page.evaluate(() => { const u = window.__echoes.runUi(); return { settleInMs: u.settleInMs, carryMs: u.carryMs }; });
      check(size, `settle: F2 as the shop opens is dropped (seat ${q0} -> ${q1}) and restarts the window (carry ${st2.carryMs} ms ago, settle in ${st2.settleInMs} ms)`, q1 === q0 && st2.carryMs !== null && st2.settleInMs > 0, { q0, q1, st2 });
    }
    await page.waitForFunction((t) => performance.now() - t > 1150 && window.__echoes.runUi().settleInMs === 0, { timeout: 5000 }, tShop);
    const sh = [];
    for (let s = 0; s < 4; s++) {
      await page.keyboard.press(`F${s + 1}`);
      await sleep(150);
      const st = await page.evaluate(() => { const u = window.__echoes.runUi().shop; const cards = [...document.querySelectorAll('.rn-shop .rn-item .rn-card')].filter((c) => c.offsetParent); return { seat: u.viewSeat, cardSeats: cards.map((c) => Number(c.dataset.seat)), owners: [...document.querySelectorAll('.rn-shop .rn-minowner')].filter((c) => c.offsetParent).map((o) => o.textContent.trim()) }; });
      sh.push(st);
    }
    check(size, `shop: F1–F4 reach each tab; every shelf card's data-seat and owner band = the viewed tab`, sh.every((st, s) => st.seat === s && st.cardSeats.length > 0 && st.cardSeats.every((x) => x === s) && st.owners.every((o) => new RegExp(NAMES[s], 'i').test(o))), sh);
    const sq = [];
    await page.keyboard.press('F1');
    await sleep(150);
    for (let k = 0; k < 4; k++) {
      await page.keyboard.press('KeyE');
      await sleep(150);
      sq.push(await seatOf('shop'));
    }
    await pad(4);
    const shopPad = await seatOf('shop');
    check(size, `shop: E walks the tabs (${JSON.stringify(sq)}), the pad's LB goes back (${shopPad})`, JSON.stringify(sq) === JSON.stringify([1, 2, 3, 0]) && shopPad === 3, { sq, shopPad });
    // Audit with a card HOVERED (its lift must clear its own tab row).
    const hov = await page.evaluate(() => { const c = [...document.querySelectorAll('.rn-shop .rn-item .rn-card')].filter((x) => x.offsetParent)[1]; if (!c) return null; const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    if (hov) await page.mouse.move(hov.x, hov.y);
    await sleep(250);
    const a3 = await page.evaluate(AUDIT, '.rn-shop');
    check(size, `shop layout: ${a3.overlaps.length} overlaps, ${a3.clipped.length} clipped, scrollbars ${a3.scroll}, tabs ${JSON.stringify(a3.tabs)}, ${a3.small.length} texts < 16 px, ${a3.off.length} off-screen`, a3.overlaps.length === 0 && a3.clipped.length === 0 && !a3.scroll && a3.tabs.length === 4 && a3.tabs.every((h) => h >= 44) && a3.small.length === 0 && a3.off.length === 0, a3);
    await page.screenshot({ path: `captures/gntfixM5a6-partyux-shop-${size}.png` });
    check(size, 'no page errors', errors.length === 0, errors.slice(0, 4));
    await page.close();
  }
} finally {
  await browser.close();
}
mkdirSync('captures', { recursive: true });
writeFileSync('captures/gntfixM5a6-partyux.json', JSON.stringify({ tool: 'gntfixM5a6-partyux (copy of tools/gntPARTY-ux.mjs, output renamed)', results }, null, 1));
const failed = results.filter((r) => !r.pass);
console.log(`${results.length - failed.length}/${results.length} checks pass`);
process.exit(failed.length ? 1 : 0);
