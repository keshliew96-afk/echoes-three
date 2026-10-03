// gntfixM5b6-firstkey.mjs — fix-M5b-r6 (NET6-F1) probe, derived from the net critic's
// tools/gntcnet6-firstkey.mjs (read-only reuse of its lib; own outputs, own ports).
// A host + a Tank guest (own browsers, own session server with the admin conditioner) reach the
// room-1 party page where the Tank's card is a full-slot SWAP. The guest presses REAL keys.
//
// Legs (each a fresh session):
//   seq    — S S S W ArrowDown ArrowUp, --gap ms apart, then Enter: per press the DOM mark (the
//            .rn-rep.rn-sel tile), the run UI's mark (runUi().draft.replace), the replicated sim
//            card (state().run.party.cards[seat].replace) and the press -> DOM-change latency
//            (an in-page rAF recorder); the slot the host REPLACED vs the intended one.
//   enter  — S then Enter --enterAfter ms later: mark at Enter, host card, slot replaced.
//   burst  — S, S, Enter 60 ms apart (inside one frame budget of a fast player).
// node tools/gntfixM5b6-firstkey.mjs --port 7821 [--cond lat75,jit10,loss10] [--legs seq,enter,burst]
//   [--gap 250] [--enterAfter 150] [--tag name] [--base http://127.0.0.1:4307/]
import { openClient, closeClient, sleep, writeJson, startServer, CAP } from './gntcnet6-lib.mjs';
import path from 'node:path';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7821);
const BASE = A.base || process.env.GNTFIXM5B6_BASE || 'http://127.0.0.1:4307/';
const LEGS = String(A.legs || 'seq,enter,burst').split(',');
const GAP = Number(A.gap || 250);
const ENTER_AFTER = Number(A.enterAfter || 150);
const tag = A.tag || (A.cond ? 'cond' : 'n0');
const out = { tool: 'gntfixM5b6-firstkey', base: BASE, cond: A.cond || null, gap: GAP, enterAfter: ENTER_AFTER, legs: {}, errors: {} };
const ev = (c, fn, arg) => c.page.evaluate(fn, arg);
async function waitOn(c, fn, timeout = 60000, arg) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { const v = await c.page.evaluate(fn, arg); if (v) return v; } catch { /* nav */ } await sleep(80); } throw new Error(c.tag + ' timeout ' + String(fn).slice(0, 120)); }

// One reading of the guest's swap card: DOM tile, run-UI mark, replicated sim card.
const mark = (c) => ev(c, () => {
  const E = window.__echoes;
  const s = E.net.seat;
  const v = E.state().run;
  const k = v.party && v.party.cards[s];
  const sel = [...document.querySelectorAll('.rn-rep.rn-sel')].filter((e) => e.offsetParent);
  const ui = E.runUi && E.runUi() && E.runUi().draft ? E.runUi().draft : null;
  return { dom: sel.length === 1 ? Number(sel[0].dataset.slot) : sel.length ? -2 : null, ui: ui ? ui.replace : null, sim: k ? k.replace : null, simDecided: k ? k.decided : null, chip: ui && ui.tabs && ui.tabs[s] ? ui.tabs[s].chip : null, tick: E.tick, hasFocus: document.hasFocus() };
});

// In-page recorder: every trusted keydown time + every change of the DOM mark (per rAF).
// Mark changes are timed by a MutationObserver (the moment the page wrote the new mark — the
// frame that runs it paints it); frames by the rAF frame-start timestamps. pressToDomFrames = the
// number of frame starts after the keydown's dispatch up to that write (1 = drawn by the next frame).
const installRecorder = (c) => ev(c, () => {
  const R = (window.__gntfixM5b6 = { keys: [], marks: [], frames: [], stop: false });
  // the game's own rendered-frame counter (app.update, called at the END of each rendered frame,
  // after the run UI's update). The MutationObserver callback is a microtask that runs only after the
  // whole rAF callback returned — after that frame's app.update counted it — so a mark written by the
  // first frame after the keydown reads keydown count + 1: drawn frames = mark count - keydown count.
  const fcNow = () => (window.__echoes.app && Number.isFinite(window.__echoes.app.frameCount) ? window.__echoes.app.frameCount : null);
  const cur = () => { const sel = [...document.querySelectorAll('.rn-rep.rn-sel')].filter((e) => e.offsetParent); return sel.length === 1 ? Number(sel[0].dataset.slot) : null; };
  let last = cur();
  R.marks.push({ t: performance.now(), m: last });
  window.addEventListener('keydown', (e) => { if (e.isTrusted) R.keys.push({ t: e.timeStamp, d: performance.now(), fc: fcNow(), code: e.code }); }, { capture: true });
  const mo = new MutationObserver(() => { const m = cur(); if (m !== last && m !== null) { last = m; R.marks.push({ t: performance.now(), fc: fcNow(), m }); } });
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  R.mo = mo;
  const loop = (ft) => { R.frames.push(ft); if (!R.stop) requestAnimationFrame(loop); else mo.disconnect(); };
  requestAnimationFrame(loop);
  return last;
});
const readRecorder = (c) => ev(c, () => { const R = window.__gntfixM5b6; R.stop = true; return { keys: R.keys, marks: R.marks, frames: R.frames }; });
// rendered frames from a keydown to the frame that first showed the mark change (1 = the next frame).
const framesTo = (rec, kt, ct) => rec.frames.filter((f) => f > kt && f <= ct).length;
const frameMs = (rec) => { const d = rec.frames.slice(1).map((f, i) => f - rec.frames[i]).sort((a, b) => a - b); return d.length ? { p50: Math.round(d[Math.floor(d.length / 2)] * 10) / 10, p95: Math.round(d[Math.floor(d.length * 0.95)] * 10) / 10 } : null; };

async function session(name, body) {
  const srv = await startServer(port, ['--admin']);
  const cl = [];
  try {
    const url = (nm) => BASE + `?menu=0&seed=11&netname=${nm}&net=${encodeURIComponent(`ws://127.0.0.1:${port}/echoes`)}`;
    cl.push(await openClient(url('Host'), { w: 1280, h: 720, tag: 'Host' }));
    cl.push(await openClient(url('Fox'), { w: 1280, h: 720, tag: 'Fox' }));
    const [H, F] = cl;
    await Promise.all(cl.map((c) => waitOn(c, () => window.__echoes.tick > 240, 120000)));
    const code = await ev(H, async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
    await ev(F, async (cd) => { const n = window.__echoes.net; await n.join(cd); n.setReady(true); return 1; }, code);
    await sleep(400);
    await ev(H, () => window.__echoes.net.start());
    await waitOn(F, () => window.__echoes.net.session.status().synced);
    if (A.cond) { const pid = await ev(F, () => window.__echoes.net.peerId); await fetch('http://127.0.0.1:' + port + '/admin/conditioner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: pid, up: A.cond, down: A.cond }) }); }
    await ev(H, () => window.__echoes.cmd('startCampaign', { level: 1 }));
    await waitOn(H, () => window.__echoes.state().run.phase === 'combat');
    await waitOn(F, () => window.__echoes.state().run.phase === 'combat');
    // warm: the guest walked with real keys in the room (the critic's WARM leg).
    await F.page.keyboard.down('KeyD'); await sleep(600); await F.page.keyboard.up('KeyD');
    await F.page.keyboard.down('KeyA'); await sleep(600); await F.page.keyboard.up('KeyA');
    await sleep(1000);
    await ev(H, () => window.__echoes.cmd('killAllEnemies'));
    await waitOn(F, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; });
    await sleep(2500);
    const seat = await ev(F, () => window.__echoes.net.seat);
    const swap = await ev(F, (s) => { const k = window.__echoes.state().run.party.cards[s]; return { swap: !!k.swap, id: k.id, type: k.type }; }, seat);
    const before = await ev(F, (s) => window.__echoes.cmd('partyView', s).slots, seat);
    const r = await body({ H, F, seat, swap, before });
    // Commit: the host leaves its own card, the page commits, read the loadout after.
    try { await ev(H, () => window.__echoes.content.world().runSystem().partyPick(0, 'leave')); } catch { /* */ }
    await waitOn(H, () => window.__echoes.state().run.phase !== 'reward', 60000);
    await sleep(1500);
    const after = await ev(F, (s) => window.__echoes.cmd('partyView', s).slots, seat);
    const replacedSlot = after.findIndex((x, i) => x !== before[i]);
    const predict = await ev(F, () => { const s = window.__echoes.net.stats(); return s.partyPredict || null; });
    out.legs[name] = { seat, swap, before, after, replacedSlot, ...r, predict, pass: r.intendedFinal === null ? null : replacedSlot === r.intendedFinal && (r.allMoved !== false) };
    console.log(name, JSON.stringify(out.legs[name]));
  } finally {
    for (const c of cl) out.errors[name + ':' + c.tag] = c.errors;
    for (const c of cl) await closeClient(c);
    srv.proc.kill();
    await sleep(500);
  }
}

const cyc = (m, d) => (((m + d) % 4) + 4) % 4; // all four slots owned on the Tank's swap card

async function legSeq({ F }) {
  const m0 = await mark(F);
  await installRecorder(F);
  const keys = ['KeyS', 'KeyS', 'KeyS', 'KeyW', 'ArrowDown', 'ArrowUp'];
  const seq = [{ key: null, ...m0 }];
  let intended = m0.dom;
  const intendedSeq = [];
  for (const k of keys) {
    intended = cyc(intended, k === 'KeyS' || k === 'ArrowDown' ? 1 : -1);
    intendedSeq.push(intended);
    await F.page.keyboard.press(k);
    await sleep(GAP);
    seq.push({ key: k, ...(await mark(F)) });
  }
  await F.page.screenshot({ path: path.join(CAP, `gntfixM5b6-firstkey-${tag}-seq.png`) });
  const atEnter = await mark(F);
  await F.page.keyboard.press('Enter');
  await sleep(1500);
  const rec = await readRecorder(F);
  // press -> DOM change latency: for press i, the first mark change after its keydown.
  const presses = rec.keys.filter((k) => keys.includes(k.code));
  const lat = presses.map((k) => { const ch = rec.marks.find((m) => m.t >= k.t); return ch ? Math.round(ch.t - k.t) : null; });
  const latFrames = presses.map((k) => { const ch = rec.marks.find((m) => m.t >= k.t); return ch ? framesTo(rec, k.d, ch.t) : null; });
  // rendered game frames from the keydown to the frame that drew the new mark (1 = the next frame).
  const gameFrames = presses.map((k) => { const ch = rec.marks.find((m) => m.t >= k.t); return ch && k.fc !== null && ch.fc !== null ? ch.fc - k.fc : null; });
  const domSeq = seq.slice(1).map((s) => s.dom);
  return {
    intendedSeq, domSeq, uiSeq: seq.slice(1).map((s) => s.ui), simSeq: seq.slice(1).map((s) => s.sim),
    domCorrect: domSeq.filter((d, i) => d === intendedSeq[i]).length, presses: keys.length,
    allMoved: domSeq.every((d, i) => d === intendedSeq[i]),
    markAtEnter: atEnter.dom, chipAfterEnter: (await mark(F)).chip,
    pressToDomMs: lat, pressToDomFrames: latFrames, pressToDrawnGameFrames: gameFrames, frameMs: frameMs(rec), intendedFinal: intended,
  };
}

async function legEnter({ F, H, seat }) {
  const m0 = await mark(F);
  await installRecorder(F);
  await F.page.keyboard.press('KeyS');
  await sleep(ENTER_AFTER);
  const m1 = await mark(F);
  await F.page.keyboard.press('Enter');
  const m2 = await mark(F);
  await sleep(1500);
  const hostCard = await ev(H, (q) => { const k = window.__echoes.state().run.party.cards[q]; return { replace: k.replace, decided: k.decided, choice: k.choice, by: k.by }; }, seat);
  const rec = await readRecorder(F);
  const k0 = rec.keys.find((k) => k.code === 'KeyS');
  const ch = k0 ? rec.marks.find((m) => m.t >= k0.t) : null;
  return { markBefore: m0.dom, markAtEnter: m1.dom, uiAtEnter: m1.ui, simAtEnter: m1.sim, chipRightAfterEnter: m2.chip, hostCard, pressToDomMs: ch ? Math.round(ch.t - k0.t) : null, pressToDomFrames: ch ? framesTo(rec, k0.d, ch.t) : null, pressToDrawnGameFrames: ch && k0.fc !== null && ch.fc !== null ? ch.fc - k0.fc : null, frameMs: frameMs(rec), intendedFinal: cyc(m0.dom, 1) };
}

async function legBurst({ F, H, seat }) {
  const m0 = await mark(F);
  await F.page.keyboard.press('KeyS'); await sleep(60);
  await F.page.keyboard.press('KeyS'); await sleep(60);
  const m1 = await mark(F);
  await F.page.keyboard.press('Enter');
  await sleep(1500);
  const hostCard = await ev(H, (q) => { const k = window.__echoes.state().run.party.cards[q]; return { replace: k.replace, decided: k.decided, choice: k.choice, by: k.by }; }, seat);
  return { markBefore: m0.dom, markAtEnter: m1.dom, uiAtEnter: m1.ui, simAtEnter: m1.sim, hostCard, intendedFinal: cyc(m0.dom, 2) };
}

// Every other Replaces input path, 200 ms apart (inside one round trip at N1): wheel down, wheel up,
// a click on a tile, a mocked gamepad D-pad down / up, then pad A commits.
async function legPaths({ F, H, seat }) {
  const m0 = await mark(F);
  await installRecorder(F);
  await ev(F, () => {
    const pad = { id: 'gntfixM5b6 pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), timestamp: performance.now() };
    navigator.getGamepads = () => [pad];
    window.__gfPress = (i, on) => { pad.buttons[i].pressed = on; pad.buttons[i].value = on ? 1 : 0; pad.timestamp = performance.now(); };
    return true;
  });
  await sleep(400);
  const row = await ev(F, () => { const r = document.querySelector('.rn-cardrow').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const steps = [];
  let intended = m0.dom;
  const padTap = async (b) => { await ev(F, (i) => window.__gfPress(i, true), b); await sleep(70); await ev(F, (i) => window.__gfPress(i, false), b); };
  const plan = [
    ['wheel+1', 1, async () => { await F.page.mouse.move(row.x, row.y); await F.page.mouse.wheel({ deltaY: 120 }); }],
    ['wheel-1', -1, async () => { await F.page.mouse.wheel({ deltaY: -120 }); }],
    ['click+2', 2, async () => { const tgt = intended; /* = previous mark + 2 (set before act) */ const r = await ev(F, (sl) => { const e = document.querySelector(`.rn-rep[data-slot="${sl}"]`); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, tgt); await F.page.mouse.click(r.x, r.y); }],
    ['pad-down', 1, async () => padTap(13)],
    ['pad-up', -1, async () => padTap(12)],
    ['pad-down2', 1, async () => padTap(13)],
  ];
  for (const [name, d, act] of plan) {
    intended = cyc(intended, d);
    await act();
    await sleep(200);
    steps.push({ step: name, intended, ...(await mark(F)) });
  }
  const atCommit = await mark(F);
  await padTap(0);
  await sleep(1500);
  const hostCard = await ev(H, (q) => { const k = window.__echoes.state().run.party.cards[q]; return { replace: k.replace, decided: k.decided, choice: k.choice, by: k.by }; }, seat);
  const src = await ev(F, () => (window.__echoes.app && window.__echoes.app.lastSource ? window.__echoes.app.lastSource() : null));
  return { markBefore: m0.dom, steps: steps.map((x) => ({ step: x.step, intended: x.intended, dom: x.dom, ui: x.ui, sim: x.sim })), domCorrect: steps.filter((x) => x.dom === x.intended).length, allMoved: steps.every((x) => x.dom === x.intended), markAtCommit: atCommit.dom, hostCard, lastSource: src, intendedFinal: intended };
}

try {
  if (LEGS.includes('paths')) await session('paths', legPaths);
  if (LEGS.includes('seq')) await session('seq', legSeq);
  if (LEGS.includes('enter')) await session('enter', legEnter);
  if (LEGS.includes('burst')) await session('burst', legBurst);
} catch (e) { out.crash = String(e.stack || e); console.log('CRASH', out.crash); }
finally {
  out.pageErrors = Object.values(out.errors).reduce((s, a) => s + (a ? a.length : 0), 0);
  out.pass = !out.crash && out.pageErrors === 0 && Object.values(out.legs).every((l) => l.pass);
  writeJson(`gntfixM5b6-firstkey-${tag}.json`, out);
  console.log('RESULT', tag, 'pass', out.pass, 'pageErrors', out.pageErrors);
}
