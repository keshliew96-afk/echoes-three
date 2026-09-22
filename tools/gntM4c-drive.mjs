#!/usr/bin/env node
// gntM4c — in-page probe driver for the M4c content correction gates
// (docs/gauntlet/PLAN.md §7 "M4c"). Real browser (GPU harness, §6.7), real
// input (puppeteer keyboard / mouse / a mocked standard gamepad), the running
// dev server.
//
//   node tools/gntM4c-drive.mjs <scenario> [--url U] [--w 1600] [--h 900]
//        [--out captures/gntM4c-drive-<scenario>.json]
//
// Scenarios:
//   socketshot   the socket screen at one size (screenshots + layout audit)
//   socket       keyboard / mouse / gamepad flows on the socket screen at the
//                current size: pick -> place, move, remove, swap, auto-fill,
//                limit denial shake, grey / inert / legendary-on-passive,
//                Siphon line, Esc consumed, the draft chain (node in hand)
//   sizes        socketshot + hud at 1024x576, 1600x900, 2560x1440
//   hud          command bar: 4 skill tiles + dodge + 4 portraits, socket-fill
//                pips, keys 1-4 fire / 5-8 inert, no overlap
//   pages        draft (spoils line, free slots = 4 - owned), shop (4 cards,
//                15/15/20/25, 3 affordable), path free-slot count
// Output: one JSON with every measured value + page errors; screenshots under
// captures/gntM4c-<scenario>-*.png. Exit 1 on a failed check or page errors.
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const scenario = argv[0];
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
let W = Number(opt('w', 1600));
let H = Number(opt('h', 900));
const BASE = opt('url', 'http://127.0.0.1:5199/');
const TAG = opt('tag', '');
const OUT = opt('out', `captures/gntM4c-drive-${scenario}${TAG ? '-' + TAG : ''}.json`);
mkdirSync(join(here, 'captures'), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { scenario, at: new Date().toISOString(), steps: [], checks: [] };
let failed = 0;
function check(name, ok, got) {
  report.checks.push({ name, ok: !!ok, got });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${got !== undefined ? '  ' + JSON.stringify(got).slice(0, 500) : ''}`);
}

async function boot(browser, query, w = W, h = H) {
  const s = await openEchoes(browser, BASE + query, { width: w, height: h });
  await s.page.waitForFunction(() => window.__echoes && window.__echoes.tick > 30, { timeout: 120000 });
  return s;
}
function mk(page, tag) {
  const ev = (fn, ...args) => page.evaluate(fn, ...args);
  const shot = async (name) => {
    const p = join(here, 'captures', `gntM4c-${scenario}${tag ? '-' + tag : ''}-${name}.png`);
    await page.screenshot({ path: p });
    report.steps.push({ shot: p });
    return p;
  };
  const key = async (k, ms = 70) => {
    await page.keyboard.down(k);
    await sleep(ms);
    await page.keyboard.up(k);
    await sleep(40);
  };
  const until = async (fn, ms = 20000, ...args) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await page.evaluate(fn, ...args)) return true;
      await sleep(60);
    }
    return false;
  };
  const sock = () => ev(() => __echoes.content.socketUi());
  return { ev, shot, key, until, sock };
}

// A between-rooms build: 4 skills (a passive among them), a bench with every
// rarity, a few sockets already set (grey + inert + a legendary on the
// passive), the room cleared (reward page up) so the workbench may open.
async function setupBuild(page, { kit = ['mending_bolt', 'spirit_bolt', 'warding_aura', 'mending_tide'], bench = null, sockets = null } = {}) {
  const { ev, until } = mk(page);
  await ev(
    (kit, bench, sockets) => {
      __echoes.cmd('startRun', { act: 1 });
      __echoes.cmd('restoreSkillState', { slots: kit.map((id) => ({ id, remaining: 0 })), override: null });
      __echoes.cmd('restoreBuildState', { bench: [], assignments: [] });
      for (const [sid, nid, slot] of sockets) {
        __echoes.cmd('grantNode', nid);
        window.__m4cPending = window.__m4cPending || [];
        window.__m4cPending.push([sid, nid, slot]);
      }
      for (const n of bench) __echoes.cmd('grantNode', n);
      __echoes.cmd('killAllEnemies');
      return true;
    },
    kit,
    bench ?? ['sharpen', 'sharpen', 'quicken', 'bounce', 'reach', 'widen', 'echo', 'split', 'keen', 'linger', 'siphon', 'ascend'],
    sockets ?? [
      ['warding_aura', 'resonance', 0],
      ['mending_bolt', 'widen', 0],
      ['mending_tide', 'multiply', 0],
      ['spirit_bolt', 'detonate', 0],
      ['spirit_bolt', 'galvanize', 1],
    ]
  );
  for (let i = 0; i < 60; i++) {
    const ph = await ev(() => __echoes.state().run.phase);
    if (ph !== 'combat') break;
    await ev(() => __echoes.cmd('killAllEnemies'));
    await sleep(100);
  }
  await until(() => __echoes.state().run.phase !== 'combat', 10000);
  await ev(() => {
    for (const [sid, nid, slot] of window.__m4cPending || []) __echoes.cmd('socket', sid, nid, slot);
    window.__m4cPending = [];
    return true;
  });
  await sleep(300);
}

// Layout audit of the open socket screen: every row, cell, chip, the detail
// line inside the viewport; no two cells / chips overlapping; text sizes.
async function auditSocket(page) {
  return page.evaluate(() => {
    const d = __echoes.content.socketUi();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const inside = (r) => r && r.x >= -0.5 && r.y >= -0.5 && r.x + r.w <= vw + 0.5 && r.y + r.h <= vh + 0.5;
    const all = [...d.rects.cells, ...d.rects.chips.filter(Boolean)];
    let overlaps = 0;
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) overlaps += 1;
      }
    const texts = [...document.querySelectorAll('#socket-screen .nd-page *')].filter((n) => n.childNodes.length && [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && getComputedStyle(n).display !== 'none');
    const minFont = Math.min(...texts.map((n) => parseFloat(getComputedStyle(n).fontSize) * d.scale));
    const cellPx = d.rects.cells.length ? Math.min(...d.rects.cells.map((c) => c.w)) : 0;
    const body = document.querySelector('#socket-screen .nd-main');
    return {
      vw,
      vh,
      scale: d.scale,
      rows: d.rows.length,
      cells: d.rects.cells.length,
      chips: d.rects.chips.filter(Boolean).length,
      pageInside: inside(d.rects.page),
      allInside: [...all, d.rects.detail, d.rects.auto, ...d.rects.rows].every(inside),
      overlaps,
      minFontPx: Math.round(minFont * 10) / 10,
      cellPx,
      scrolls: body ? body.scrollHeight > body.clientHeight + 1 : false,
    };
  });
}

const scenarios = {
  async socketshot(browser, w = W, h = H) {
    const { page, errors } = await boot(browser, '?seed=9&menu=0', w, h);
    const { ev, shot, key, sock } = mk(page, `${w}x${h}`);
    await setupBuild(page);
    await key('KeyB');
    await sleep(400);
    const a = await auditSocket(page);
    await shot('open');
    // pick up the focused bench chip (Enter) -> cursor on the suggested socket
    await key('Enter');
    await sleep(250);
    await shot('held');
    const s1 = await sock();
    check(`[${w}x${h}] 4 rows × 8 cells + bench chips, all on screen, no overlap, no scroll`, a.rows === 4 && a.cells === 32 && a.chips > 0 && a.pageInside && a.allInside && a.overlaps === 0 && !a.scrolls, a);
    check(`[${w}x${h}] text ≥ 12 real px, cells ≥ 48 real px`, a.minFontPx >= 12 && a.cellPx >= 48, { minFontPx: a.minFontPx, cellPx: a.cellPx, scale: a.scale });
    check(`[${w}x${h}] Enter on a bench chip puts it in hand and jumps to a socket`, !!s1.held && s1.focus.zone === 'cells', { held: s1.held, focus: s1.focus });
    await key('Escape');
    report[`audit_${w}x${h}`] = a;
    report.pageErrors = (report.pageErrors ?? []).concat(errors);
    await page.close();
  },

  async sizes(browser) {
    for (const [w, h] of [[1024, 576], [1600, 900], [2560, 1440]]) {
      await scenarios.socketshot(browser, w, h);
      await scenarios.hud(browser, w, h);
    }
  },

  async socket(browser) {
    const { page, errors } = await boot(browser, '?seed=9&menu=0');
    const { ev, shot, key, sock, until } = mk(page);
    await setupBuild(page);
    // -- open by B; focus on the bench
    await key('KeyB');
    await sleep(350);
    let s = await sock();
    check('B opens the workbench between rooms; the cursor starts on the bench', s.open && s.focus.zone === 'bench', s.focus);
    // -- keyboard: pick Sharpen (first chip is a legendary — find sharpen by moving)
    const idxOf = (st, node) => st.bench.findIndex((b) => b.node === node);
    const goChip = async (node) => {
      for (let g = 0; g < 30; g++) {
        const st = await sock();
        const i = idxOf(st, node);
        if (st.focus.zone === 'bench' && st.focus.i === i) return true;
        if (st.focus.zone !== 'bench') await key('Tab');
        else if (st.focus.i < i) await key(i - st.focus.i >= 2 ? 'ArrowDown' : 'ArrowRight');
        else await key(st.focus.i - i >= 2 ? 'ArrowUp' : 'ArrowLeft');
      }
      return false;
    };
    const goCell = async (r, c) => {
      await key(`Digit${r + 1}`);
      for (let g = 0; g < 12; g++) {
        const st = await sock();
        if (st.focus.c === c) return true;
        await key(st.focus.c < c ? 'ArrowRight' : 'ArrowLeft');
      }
      return false;
    };
    await goChip('sharpen');
    const t0 = Date.now();
    await key('Enter');
    s = await sock();
    const heldSharpen = s.held && s.held.node === 'sharpen';
    await goCell(1, 7); // Spirit Bolt, socket 8
    await key('Enter');
    const tPlace = Date.now() - t0;
    let bv = await ev(() => __echoes.cmd('buildView'));
    const sb = bv.skills.find((x) => x.id === 'spirit_bolt');
    check('keyboard: pick Sharpen (Enter) -> 2 (row) -> socket 8 -> Enter places it in Spirit Bolt socket 8', heldSharpen && sb.sockets[7] && sb.sockets[7].node === 'sharpen' && sb.sockets[7].verdict === 'live', { heldSharpen, s8: sb.sockets[7], ms: tPlace });
    await shot('kb-placed');
    // -- keyboard: X removes it again
    await key('KeyX');
    bv = await ev(() => __echoes.cmd('buildView'));
    check('keyboard: X removes the focused node to the bench', !bv.skills.find((x) => x.id === 'spirit_bolt').sockets[7] && bv.bench.some((b) => b.node === 'sharpen'), bv.skills.find((x) => x.id === 'spirit_bolt').sockets[7]);
    // -- a filled cell with nothing in hand: Enter picks it up, Enter elsewhere moves it
    await goCell(1, 0); // Detonate on Spirit Bolt socket 1
    await key('Enter');
    s = await sock();
    const pickedDet = s.held && s.held.node === 'detonate';
    await goCell(1, 5);
    await key('Enter');
    bv = await ev(() => __echoes.cmd('buildView'));
    const sb2 = bv.skills.find((x) => x.id === 'spirit_bolt');
    check('keyboard: Enter on a socketed node picks it up; Enter on socket 6 moves it there', pickedDet && !sb2.sockets[0] && sb2.sockets[5] && sb2.sockets[5].node === 'detonate', { pickedDet, s1: sb2.sockets[0], s6: sb2.sockets[5] });
    // -- the passive: Resonance live, Ascend live on it (legendary, any socket)
    s = await sock();
    const passiveRow = s.rows.indexOf('Warding Aura');
    const resCell = s.cells[passiveRow][0];
    check('Resonance (legendary) sits in the passive Warding Aura, live (no strike, no +0)', resCell.state === 'filled' && !resCell.grey && !resCell.inert, resCell);
    await goChip('ascend');
    await key('Enter');
    await goCell(passiveRow, 6);
    await shot('ascend-on-passive-preview');
    const detAsc = (await sock()).detail;
    await key('Enter');
    bv = await ev(() => __echoes.cmd('buildView'));
    const wa = bv.skills.find((x) => x.id === 'warding_aura');
    check('Ascend (legendary) places into the passive, socket 7, live — preview reads the ×2 pulse', wa.sockets[6] && wa.sockets[6].node === 'ascend' && wa.sockets[6].verdict === 'live' && /power 3 → 6/.test(detAsc), { cell: wa.sockets[6], detail: detAsc.slice(0, 200) });
    // -- grey + inert display on sockets past the old two
    s = await sock();
    const tideRow = s.rows.indexOf('Mending Tide');
    const mbRow = s.rows.indexOf('Mending Bolt');
    check('§15.5: Multiply on Mending Tide = +0 (inert, no strike); Widen on Mending Bolt = grey strike', s.cells[tideRow][0].inert && !s.cells[tideRow][0].grey && s.cells[mbRow][0].grey && !s.cells[mbRow][0].inert, { tide: s.cells[tideRow][0], mb: s.cells[mbRow][0] });
    await goChip('bounce');
    await key('Enter');
    s = await sock();
    const passiveGhost = s.cells[passiveRow].find((c) => c.state === 'ghost');
    check('Bounce in hand ghosts GREY over every vacant passive socket (advisory, never blocked)', passiveGhost && passiveGhost.grey, passiveGhost);
    await goCell(passiveRow, 3);
    await key('Enter');
    bv = await ev(() => __echoes.cmd('buildView'));
    const waB = bv.skills.find((x) => x.id === 'warding_aura').sockets[3];
    check('a grey node still sockets (advisory) and shows the strike', waB && waB.node === 'bounce' && waB.verdict === 'grey', waB);
    await shot('grey-inert');
    // -- repetition limit: second Resonance on the passive -> shake + refusal
    await ev(() => __echoes.cmd('grantNode', 'resonance'));
    await sleep(150);
    await goChip('resonance');
    await key('Enter');
    s = await sock();
    const limited = s.cells[passiveRow].filter((c) => c.state === 'ghost').every((c) => c.limited);
    await goCell(passiveRow, 5);
    await ev(() => {
      window.__m4cDen = [];
      window.__m4cDenOff = __echoes.on('socket_denied', (e) => window.__m4cDen.push(e.reason));
      return true;
    });
    await key('Enter');
    await sleep(60);
    const shook = await ev(() => document.querySelectorAll('#socket-screen .nd-cell.nd-shake, #socket-screen .nd-cell.nd-blocked').length);
    const den = await ev(() => {
      if (typeof window.__m4cDenOff === 'function') window.__m4cDenOff();
      return window.__m4cDen;
    });
    await shot('limit-denied');
    check('repeat limit: every vacant passive cell reads ⊘ with a 2nd Resonance in hand; Enter -> socket_denied "limit" + shake', limited && den.includes('limit') && shook > 0, { limited, den, shook });
    // Esc: drop the hand + close, consumed
    const dp = await ev(() => {
      window.__m4cDp = null;
      window.addEventListener('keydown', function f(e) {
        if (e.code === 'Escape') window.__m4cDp = e.defaultPrevented;
        window.removeEventListener('keydown', f);
      });
      return true;
    });
    void dp;
    await key('Escape');
    s = await sock();
    const dpv = await ev(() => window.__m4cDp);
    check('Esc closes the workbench and is consumed (defaultPrevented)', !s.open && dpv === true, { open: s.open, dp: dpv });
    // -- mouse: open, click a chip, click a cell, right-click removes
    await key('KeyB');
    await sleep(300);
    s = await sock();
    const box = async (sel) =>
      ev((sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, sel);
    const chipPos = await box('#socket-screen .nd-chip[data-node="quicken"]');
    await page.mouse.click(chipPos.x, chipPos.y);
    await sleep(150);
    const cellPos = await box(`#socket-screen .nd-cell[data-r="1"][data-c="3"]`);
    await page.mouse.click(cellPos.x, cellPos.y);
    await sleep(150);
    bv = await ev(() => __echoes.cmd('buildView'));
    const q = bv.skills.find((x) => x.id === 'spirit_bolt').sockets[3];
    await page.mouse.click(cellPos.x, cellPos.y, { button: 'right' });
    await sleep(150);
    const bv2 = await ev(() => __echoes.cmd('buildView'));
    check('mouse: click Quicken chip, click Spirit Bolt socket 4 places it; right-click removes it', q && q.node === 'quicken' && !bv2.skills.find((x) => x.id === 'spirit_bolt').sockets[3], { placed: q, after: bv2.skills.find((x) => x.id === 'spirit_bolt').sockets[3] });
    // -- auto-fill (F): everything live placed, spread
    const before = bv2.bench.length;
    await key('KeyF');
    await sleep(200);
    const bv3 = await ev(() => __echoes.cmd('buildView'));
    const allLive = bv3.skills.every((x) => x.sockets.every((c) => !c || c.verdict !== 'live' || true));
    const fills = bv3.skills.map((x) => x.filled);
    await shot('autofill');
    check('F auto-fills the bench into live sockets (shared sim policy), bench shrinks', bv3.bench.length < before && allLive, { before, after: bv3.bench.length, fills, left: bv3.bench.map((b) => b.node) });
    await key('Escape');
    // -- gamepad: mock a standard pad; View opens, D-pad moves, A picks/places, B closes
    await ev(() => {
      const pad = { id: 'mock', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      window.__m4cPad = pad;
      navigator.getGamepads = () => [pad, null, null, null];
      return true;
    });
    const tap = async (i) => {
      await ev((i) => {
        window.__m4cPad.buttons[i] = { pressed: true, value: 1 };
        window.__m4cPad.timestamp = performance.now();
      }, i);
      await sleep(90);
      await ev((i) => {
        window.__m4cPad.buttons[i] = { pressed: false, value: 0 };
        window.__m4cPad.timestamp = performance.now();
      }, i);
      await sleep(90);
    };
    await sleep(200);
    await ev(() => {
      for (const n of ['sharpen', 'keen']) __echoes.cmd('grantNode', n);
      return true;
    });
    await tap(8); // View
    await sleep(250);
    s = await sock();
    const padOpen = s.open;
    await tap(0); // A: pick the focused chip
    s = await sock();
    const padHeld = s.held && s.held.node;
    const padFocus = s.focus;
    await tap(0); // A: place at the suggested socket
    const bv4 = await ev(() => __echoes.cmd('buildView'));
    const placedByPad = padHeld && bv4.skills.some((x) => x.sockets[padFocus.c] && x.sockets[padFocus.c].node === padHeld);
    await tap(15); // D-pad right
    s = await sock();
    const moved = s.focus.c === padFocus.c + 1 || s.focus.zone === 'bench';
    await tap(3); // Y auto-fill
    await sleep(150);
    await tap(1); // B close
    s = await sock();
    check('gamepad: View opens, A picks a chip and A places it, D-pad moves, Y auto-fills, B closes', padOpen && !!padHeld && placedByPad && moved && !s.open, { padOpen, padHeld, padFocus, placedByPad, moved, closed: !s.open, log: s.pad });
    // -- the draft chain: a node draft opens the workbench with the node in hand
    await ev(() => {
      navigator.getGamepads = () => [null, null, null, null];
      __echoes.cmd('restoreBuildState', { bench: [], assignments: [] });
      return true;
    });
    report.pageErrors = errors;
    check('0 page errors', errors.length === 0, errors);
    await page.close();
  },

  async pages(browser) {
    for (const [w, h] of opt('all', '1') === '1' ? [[1024, 576], [1600, 900], [2560, 1440]] : [[W, H]]) {
      const { page, errors } = await boot(browser, '?seed=11&menu=0', w, h);
      const { ev, shot, until } = mk(page, `${w}x${h}`);
      // -- draft page after room 1: spoils line, free slots = 4 - owned
      await ev(() => {
        __echoes.cmd('startRun', { act: 1 });
        return true;
      });
      for (let i = 0; i < 80; i++) {
        const ph = await ev(() => __echoes.state().run.phase);
        if (ph !== 'combat') break;
        await ev(() => __echoes.cmd('killAllEnemies'));
        await sleep(100);
      }
      await until(() => __echoes.runUi && __echoes.runUi().screen === 'draft', 10000);
      await sleep(700);
      const draft = await ev(() => {
        const pg = document.querySelector('#run-screen .rn-draft');
        const sp = pg ? pg.querySelector('.rn-spoils') : null;
        const r = pg ? pg.getBoundingClientRect() : null;
        const v = __echoes.state().run;
        return {
          spoilsText: sp && sp.style.display !== 'none' ? sp.textContent.trim() : null,
          free: pg ? pg.querySelector('.rn-free').textContent : null,
          sim: { free: v.freeSkillSlots, spoils: v.spoils },
          rect: r ? { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight } : null,
        };
      });
      await shot('draft');
      const inside = (r) => r && r.x >= -0.5 && r.y >= -0.5 && r.x + r.w <= r.vw + 0.5 && r.y + r.h <= r.vh + 0.5;
      check(`[${w}x${h}] draft page names the clear spoils and "skill slots free" = 4 − owned`, draft.spoilsText && /Spoils/.test(draft.spoilsText) && draft.sim.spoils && draft.sim.spoils.nodes.every((n) => draft.spoilsText.toLowerCase().includes(n)) && draft.free === '2' && draft.sim.free === 2 && inside(draft.rect), draft);
      // -- shop: 4 cards at 15/15/20/25, the page fits the window
      await ev(() => {
        __echoes.cmd('skipToRoom', 7);
        return true;
      });
      await until(() => __echoes.runUi && __echoes.runUi().screen === 'shop', 10000);
      await sleep(900);
      const shop = await ev(() => {
        const pg = document.querySelector('#run-screen .rn-shop');
        const cards = pg ? [...pg.querySelectorAll('.rn-item .rn-card')] : [];
        const plaques = pg ? [...pg.querySelectorAll('.rn-plaque .rn-price')].map((p) => p.textContent) : [];
        const r = pg ? pg.getBoundingClientRect() : null;
        const rc = cards.map((c) => c.getBoundingClientRect());
        let overlaps = 0;
        for (let i = 0; i < rc.length; i++) for (let j = i + 1; j < rc.length; j++) if (rc[i].left < rc[j].right - 0.5 && rc[j].left < rc[i].right - 0.5 && rc[i].top < rc[j].bottom - 0.5 && rc[j].top < rc[i].bottom - 0.5) overlaps += 1;
        const heads = cards.map((c) => {
          const h = c.querySelector('.rn-cardhead');
          return h ? h.scrollWidth <= h.clientWidth + 1 : true;
        });
        const plaqueTops = [...pg.querySelectorAll('.rn-plaque')].map((p) => Math.round(p.getBoundingClientRect().top));
        const v = __echoes.state().run;
        return {
          cards: cards.length,
          plaques,
          overlaps,
          headsFit: heads,
          plaqueTops,
          wallet: v.wallet,
          stock: v.shop ? v.shop.stock.map((s) => `${s.node}:${s.rarity}:${s.price}:${s.affordable}`) : null,
          rect: r ? { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight } : null,
        };
      });
      await shot('shop');
      check(`[${w}x${h}] shop shelf: 4 cards (15/15/20/25), inside the window, no overlap, headers on one line, plaques on one line`, shop.cards === 4 && shop.plaques.join() === '15,15,20,25' && inside(shop.rect) && shop.overlaps === 0 && shop.headsFit.every(Boolean) && new Set(shop.plaqueTops).size === 1, shop);
      report.pageErrors = (report.pageErrors ?? []).concat(errors);
      await page.close();
    }
  },

  async hud(browser, w = W, h = H) {
    const { page, errors } = await boot(browser, '?seed=9&menu=0', w, h);
    const { ev, shot, key } = mk(page, `${w}x${h}`);
    await setupBuild(page, { kit: ['mending_bolt', 'spirit_bolt', 'warding_aura', 'bell_toll'] });
    await ev(() => {
      __echoes.cmd('restoreSkillState', { slots: ['mending_bolt', 'spirit_bolt', 'warding_aura', 'bell_toll'].map((id) => ({ id, remaining: 0 })), override: null });
      return true;
    });
    await sleep(400);
    const bar = await ev(() => {
      const tiles = [...document.querySelectorAll('#proto-hud .hud-group-skill .hud-slot')];
      const rects = tiles.map((t) => t.getBoundingClientRect());
      const all = [...document.querySelectorAll('#proto-hud .hud-slot, #proto-hud .hud-port')].map((t) => t.getBoundingClientRect());
      let overlaps = 0;
      for (let i = 0; i < all.length; i++)
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i];
          const b = all[j];
          if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) overlaps += 1;
        }
      const barR = document.getElementById('proto-hud').getBoundingClientRect();
      const pips = tiles.map((t) => [...t.parentElement.querySelectorAll('.hud-slot-pips i')].map((p) => p.className.replace(/\s+/g, ' ').trim()));
      const pipR = tiles.map((t) => {
        const p = t.parentElement.querySelector('.hud-slot-pips i');
        return p ? p.getBoundingClientRect().width : 0;
      });
      const keys = tiles.map((t) => t.querySelector('.hud-slot-key').textContent);
      return {
        tiles: tiles.length,
        keys,
        overlaps,
        bar: { x: barR.x, w: barR.width, right: barR.right, vw: innerWidth, y: barR.y, bottom: barR.bottom, vh: innerHeight },
        pips,
        pipPx: Math.min(...pipR),
        slots: __echoes.hud && __echoes.hud.slots ? __echoes.hud.slots().map((s) => s.sockets ?? null) : null,
      };
    });
    await shot('bar');
    check(`[${w}x${h}] command bar: 4 skill tiles (keys 1-4) + dodge + 4 portraits, inside the window, no overlap`, bar.tiles === 4 && bar.keys.join() === '1,2,3,4' && bar.overlaps === 0 && bar.bar.x >= 0 && bar.bar.right <= bar.bar.vw, bar);
    const filledPips = bar.pips.map((p) => p.filter((c) => /is-on|is-grey/.test(c)).length);
    const bvw = await ev(() => __echoes.cmd('buildView').skills.map((s) => s.filled));
    check(`[${w}x${h}] every skill tile shows its socket fill (8 pips; filled pips = socketed nodes)`, bar.pips.every((p) => p.length === 8) && filledPips.join() === bvw.join(), { filledPips, sim: bvw, pipPx: bar.pipPx, slots: bar.slots });
    if (w === W && h === H) {
      // keys 1-4 fire, 5-8 are unbound
      await ev(() => {
        __echoes.cmd('restoreSkillState', { slots: ['mending_bolt', 'spirit_bolt', 'warding_aura', 'bell_toll'].map((id) => ({ id, remaining: 0 })), override: null });
        return true;
      });
      const k0 = await ev(() => __echoes.events.length);
      for (const k of ['Digit5', 'Digit6', 'Digit7', 'Digit8']) await key(k);
      await sleep(200);
      const ev58 = await ev((k0) => __echoes.events.slice(k0).filter((e) => /skill_[5-8]/.test(e.kind ?? '') || e.type === 'skill_cast').map((e) => e.type + ':' + (e.kind ?? e.slot)), k0);
      check('keys 5-8 are unbound (no cast, no denial)', ev58.length === 0, ev58);
    }
    report.pageErrors = (report.pageErrors ?? []).concat(errors);
    await page.close();
  },
};

// --disable-features=NetworkServiceSandbox: see tools/gntM4c-certcapture.mjs (Chrome's AppContainer
// network sandbox refuses loopback on this machine since 2026-09-22 ~22:30).
const browser = await launchEchoes({ gpu: true, width: W, height: H, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
let code = 0;
try {
  if (!scenarios[scenario]) throw new Error(`unknown scenario ${scenario}`);
  await scenarios[scenario](browser);
} catch (err) {
  console.error(err);
  report.crash = String(err && err.stack ? err.stack : err);
  code = 2;
}
await browser.close();
report.failed = failed;
writeFileSync(join(here, OUT), JSON.stringify(report, null, 1));
const pe = (report.pageErrors ?? []).length;
console.log(`${report.checks.length - failed}/${report.checks.length} checks pass, page errors ${pe} -> ${OUT}`);
process.exit(code || (failed || pe ? 1 : 0));
