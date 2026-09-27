#!/usr/bin/env node
// PARTY multiplayer probe (docs/gauntlet/PLAN.md §16.5, gates GP.9 / GP.10,
// the GP.4 network leg). Own network server (PARTY port block 7950-7959), a
// host page + a guest page on the production preview (tools/gntM5b-lib.mjs,
// read-only), then per mode:
//
//   --mode own   (GP.9) ownership + parallel picks + deadlines:
//     - the guest's own-seat calls become `party` CMDs; a call on another
//       seat is refused locally (false, nothing sent); a RAW CMD for another
//       seat is refused by the host (command_rejected not_owner) and changes
//       nothing; the host's UI cannot decide the guest's card;
//     - parallel picks: the host decides the Healer's card, the page waits for
//       the guest's; the guest's pick commits it (host + guest within one
//       snapshot);
//     - a stalled guest: the page commits 30.0 s ± 0.5 s after it opened with
//       party_autopick + the toast on both clients, the guest's card holding
//       the AI suggestion; the door deadline 30 s -> the left door;
//     - the socket hold: a guest socket screen open when the host commits a
//       door holds it <= 8 s, then the screen closes on the guest;
//     - an AWAY guest (its tab hidden) -> its open card decided at once;
//     - the shop: host Advance with the guest not Done -> a 15 s countdown
//       -> leave; a guest Done then the host's Advance leaves at once;
//     - 0 desyncs over the snapshot hash checks.
//   --mode casts --seat N (GP.4 network leg): the host swaps each class skill
//     of seat N into the guest's slots between rooms; the guest presses the
//     REAL keys 1-4 in combat: the host's sim event, the guest's audio cue
//     <= 150 ms after the press, the VFX box diff on the guest, and the
//     guest's own-seat predErr inside every displacement cast (Shoulder
//     Charge / Fox Step / Vault Shot + the Pursuit / Disengage nodes) at the
//     given --cond (N1 / N2).
//
//   --mode rearm (GP.9 live re-arming): host alone in Manual mode, a drop-in
//     arms the page deadline on the take-over tick; every undecided card is
//     decided at it; a card turning human again gets a fresh 30 s; the 90 s
//     shop deadline; Done then Advance leaves at once; the 2nd human leaving
//     clears the deadline; a network save loads single-player without one.
//   --mode repl (GP.10): builds equal on every client after every page
//     commit / socket op / purchase / level transition; a drop-in takes the
//     AI-built seat with its build; a rejoin keeps it; >= 10 minutes with 0
//     desyncs; a host migration keeps all four builds.
//   --mode bw --cond N1 (GP.10): Level 3 room 6 with the four MAX-STRESS
//     builds, guest downstream <= 12 KB/s avg / 24 KB/s p95.
//
//   node tools/gntPARTY-net.mjs --mode own [--seat 2] [--port 7950] [--base http://127.0.0.1:4400/]
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { startServer, launchEchoes, openClient, openCover, hostRoom, joinRoom, startGame, waitSession, netEval, sleep, admin, pct } from './gntM5b-lib.mjs';
import { SKILLS } from '../src/sim/skills.js';
const SKILL_CD = Object.fromEntries(Object.entries(SKILLS).map(([k, v]) => [k, v.cd]));

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const MODE = arg('mode', 'own');
const SEAT = Number(arg('seat', 2));
const port = Number(arg('port', 7950));
const base = arg('base', 'http://127.0.0.1:4400/');
const COND_NAME = arg('cond', 'none');
const CONDS = { none: null, N1: 'lat75,jit10,loss10', N2: 'lat125,jit20,loss20' };
const TAG = arg('tag', `${MODE}-s${SEAT}-${COND_NAME}`);
const out = { mode: MODE, seat: SEAT, port, base, cond: COND_NAME, checks: [], notes: [] };
const fails = [];
function check(what, ok, got = null) {
  out.checks.push({ what, ok: !!ok, got });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ` ${JSON.stringify(got).slice(0, 700)}`}`);
  if (!ok) fails.push(what);
}
const note = (m) => {
  out.notes.push(m);
  console.log(`[net] ${m}`);
};
async function waitOn(c, src, { timeout = 30000, poll = 50, arg: a = null } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const r = await netEval(c, src, a);
    if (r) return r;
    await sleep(poll);
  }
  throw new Error(`${c.name}: timeout waiting for ${src.slice(0, 160)}`);
}
const RUNV = 'const v = E.state().run;';
const phaseOf = (c) => netEval(c, `${RUNV} return { phase: v.phase, room: v.room, act: v.act, tick: E.tick, party: v.party ? { openedTick: v.party.openedTick, deadlineTick: v.party.deadlineTick, owners: v.party.owners, cards: v.party.cards.map((k) => ({ seat: k.seat, decided: k.decided, choice: k.choice, by: k.by, type: k.type, id: k.id, suggest: k.suggest })) } : null, shop: v.partyShop ? { done: v.partyShop.done, leaveTick: v.partyShop.leaveTick, deadlineTick: v.partyShop.deadlineTick } : null, hold: v.path && v.path.hold ? v.path.hold : null };`);
const W = 'const W = E.content.world();';

// Clear the room the host is in (combat) and wait for the page.
async function clearToPage(host) {
  const r = await waitOn(host, `${RUNV} if (v.phase === 'combat') { E.cmd('killAllEnemies'); if (v.room === 8) E.cmd('killBoss'); } return v.phase === 'reward' && !!v.party ? 'page' : v.phase === 'transit' ? 'transit' : v.phase === 'victory' || v.phase === 'defeat' || v.phase === 'idle' ? 'ended' : null;`, { timeout: 60000, poll: 120 });
  if (r === 'ended') return r;
  if (r === 'transit') {
    // The boss fell: the next level's first room, then its page.
    await waitOn(host, `${RUNV} return v.phase === 'combat';`, { timeout: 30000, poll: 200 });
    return clearToPage(host);
  }
  return r;
}
// Decide both human cards (host: the Healer's; guest: its own) -> path.
async function passPage(host, guest, { guestChoice = 'leave' } = {}) {
  // (Manual mode: the host also decides the AI-held cards it owns.)
  const a = await netEval(host, `${W} ${RUNV} const R = W.runSystem(); const out = R.partyPick(0, 'leave'); if (v.party) for (const c of v.party.cards) if (c.seat > 0 && !c.decided && v.party.owners[c.seat] === 'ai') R.partyPick(c.seat, 'leave'); return out;`);
  const b = await netEval(guest, `${W} return W.runSystem().partyPick(${SEAT}, '${guestChoice}');`);
  try {
    await waitOn(host, `${RUNV} return v.phase !== 'reward';`, { timeout: 10000 });
  } catch (err) {
    const hv = await phaseOf(host);
    const gv = await phaseOf(guest);
    const gs = await netEval(guest, 'return { stats: n.session.partyStats(), status: n.session.status().role, away: n.session.debugGuest().away };');
    const hs = await netEval(host, 'return n.session.partyStats();');
    throw new Error(`passPage stuck: host pick ${JSON.stringify(a)}, guest pick ${JSON.stringify(b)}, host ${JSON.stringify(hv)}, guest ${JSON.stringify(gv)}, gs ${JSON.stringify(gs)}, hs ${JSON.stringify(hs)}`);
  }
}
async function takeDoor(host, side = 0) {
  const ph = await netEval(host, `${RUNV} return v.phase;`);
  if (ph !== 'path') return;
  await netEval(host, `${W} return W.runSystem().choosePath(${side});`);
  await waitOn(host, `${RUNV} return v.phase === 'combat' || v.phase === 'shop';`, { timeout: 15000, poll: 80 });
}

let srv = null;
let browser = null;
try {
  srv = await startServer({ port, admin: true });
  out.serverPid = srv.pid;
  browser = await launchEchoes({ gpu: true, background: true, autoplay: true, width: 1280, height: 720 });
  const host = await openClient(browser, { base, server: srv.url, name: 'Host', seed: 7 });
  // rearm: the host starts ALONE (1 human); the guest drops in later.
  let guest = MODE === 'rearm' ? null : await openClient(browser, { base, server: srv.url, name: 'Fox', seed: 8 });
  const code = await hostRoom(host);
  if (guest) {
    const seat = await joinRoom(guest, code, SEAT);
    check(`the guest joins seat ${SEAT}`, seat === SEAT, seat);
  }
  if (MODE === 'rearm') await netEval(host, `E.settings.set('gameplay.allyBuilds', 'manual'); return E.content.world().partySystem().mode();`);
  await startGame(host, guest ? [guest] : []);
  await waitSession(guest ? [host, guest] : [host], 30000);
  await sleep(1200);
  if (guest && CONDS[COND_NAME]) {
    const gp = await netEval(guest, 'return n.peerId;');
    out.conditioner = await admin(srv, '/admin/conditioner', { target: gp, up: CONDS[COND_NAME], down: CONDS[COND_NAME] });
  }
  await netEval(host, 'window.__pe = []; for (const t of ["party_autopick", "party_deadline", "path_chosen", "party_socket_close", "shop_close", "draft_taken", "room_transition", "seat_control"]) E.on(t, (e) => window.__pe.push({ ...e })); return 1;');
  if (guest) await netEval(guest, 'window.__pe = []; for (const t of ["party_autopick", "party_deadline", "path_chosen", "party_socket_close"]) E.on(t, (e) => window.__pe.push({ ...e, at: E.tick })); return 1;');
  await waitOn(host, 'return E.campaign.ready(1).ready;', { timeout: 90000, poll: 250 });
  const ch = await netEval(host, 'return E.campaign.choose(1);');
  check('the host starts Level 1 (campaign.choose)', ch && ch.ok, ch);
  await waitOn(host, `${RUNV} return v.phase === 'combat' && v.room === 1;`, { timeout: 30000 });
  if (guest) await waitOn(guest, `${RUNV} return v.phase === 'combat' && v.room === 1;`, { timeout: 30000 });
  await sleep(800);

  if (MODE === 'own') {
    // ------------------------------------------------ page 1: ownership --
    await clearToPage(host);
    await waitOn(guest, `${RUNV} return v.phase === 'reward' && !!v.party;`, { timeout: 10000 });
    const p0 = await phaseOf(host);
    check(`a party page opens on both clients; the host sees seat ${SEAT} as human-owned, the others AI (${JSON.stringify(p0.party.owners)})`, p0.party.owners[SEAT] === 'human' && p0.party.owners[0] === 'human' && [1, 2, 3].filter((s) => s !== SEAT).every((s) => p0.party.owners[s] === 'ai'), p0.party);
    check('the guest card opens undecided (a human card; deadline armed with 2 humans)', !p0.party.cards[SEAT].decided && Number.isFinite(p0.party.deadlineTick), p0.party);
    const other = SEAT === 1 ? 2 : 1;
    const local = await netEval(guest, `${W} const s0 = n.session.partyStats().sent; const a = W.runSystem().partyPick(${other}, 'take'); const b = W.partySystem().build(${other}).autoFill(); const c = W.runSystem().partyBuy(${other}, 0); const d = W.runSystem().partyPick(0, 'take'); return { a, b, c, d, sent: n.session.partyStats().sent - s0 };`);
    check(`guest calls on another seat are refused locally (false) and send nothing (${JSON.stringify(local)})`, local.a === false && local.b === false && local.c === false && local.d === false && local.sent === 0, local);
    const hBefore = await netEval(host, 'return n.session.partyStats();');
    const cardBefore = (await phaseOf(host)).party.cards[other];
    await netEval(guest, `n.session.debugPartyCmd({ op: 'pick', seat: ${other}, choice: 'leave' }); n.session.debugPartyCmd({ op: 'autofill', seat: ${other} }); n.session.debugPartyCmd({ op: 'socket', seat: 0, skill: 'mending_bolt', node: 'echo', col: 0 }); n.session.debugPartyCmd({ op: 'reorder', seat: ${other}, from: 0, to: 1 }); return 1;`);
    await sleep(700);
    const hAfter = await netEval(host, 'return n.session.partyStats();');
    const gAfter = await netEval(guest, 'return n.session.partyStats();');
    const cardAfter = (await phaseOf(host)).party.cards[other];
    const slotsSame = await netEval(host, `return JSON.stringify(E.cmd('partyView', ${other}).slots);`);
    check(`RAW guest CMDs on seats ${other} / 0 -> host command_rejected not_owner x4 (host ${JSON.stringify(hAfter.byReason)}, guest ${JSON.stringify(gAfter.byReason)}); the card and loadout unchanged`, (hAfter.byReason.not_owner || 0) - (hBefore.byReason.not_owner || 0) === 4 && (gAfter.byReason.not_owner || 0) >= 4 && JSON.stringify(cardBefore) === JSON.stringify(cardAfter), { hBefore, hAfter, gAfter, cardBefore, cardAfter, slotsSame });
    const hostUi = await netEval(host, `${W} return { pick: W.runSystem().partyPick(${SEAT}, 'take'), fill: W.partySystem().build(${SEAT}).autoFill(), reorder: W.runSystem().reorderLoadout(${SEAT}, 0, 1), aiSeat: W.runSystem().partyReplace(${other}, 0) !== false };`);
    check(`the host's own UI cannot decide / socket / reorder the guest's seat (false), but may act on AI-held seat ${other}`, hostUi.pick === false && hostUi.fill === false && hostUi.reorder === false && hostUi.aiSeat === true, hostUi);
    // Parallel picks: the Healer's first, the page waits for the guest.
    await netEval(host, `${W} return W.runSystem().partyPick(0, 'take');`);
    await sleep(500);
    const mid = await phaseOf(host);
    check('the host decided the Healer card; the page waits for the guest (still reward, guest card undecided)', mid.phase === 'reward' && mid.party.cards[0].decided && !mid.party.cards[SEAT].decided, mid);
    const own = await netEval(guest, `${W} return W.runSystem().partyPick(${SEAT}, 'take');`);
    const tG = Date.now();
    await waitOn(host, `${RUNV} return v.phase === 'path';`, { timeout: 5000, poll: 10 });
    const hostMs = Date.now() - tG;
    await waitOn(guest, `${RUNV} return v.phase === 'path';`, { timeout: 5000, poll: 10 });
    const bothMs = Date.now() - tG;
    const dt = await netEval(host, 'const e = window.__pe.filter((x) => x.type === "draft_taken").slice(-1)[0]; return e ? e.tick : null;');
    check(`the guest's own pick (CMD ${JSON.stringify(own)}) commits the page: host ${hostMs} ms, guest ${bothMs} ms after the press (<= one snapshot + the link)`, own && own.pending && hostMs < 1500 && bothMs - hostMs < 400, { own, hostMs, bothMs, dt });
    // ------------------------------------------ door 1 + page 2: deadline --
    await takeDoor(host, 0);
    await clearToPage(host);
    const p2 = await phaseOf(host);
    await netEval(host, `${W} return W.runSystem().partyPick(0, 'leave');`);
    note(`page 2 opened at tick ${p2.party.openedTick}, deadline ${p2.party.deadlineTick}; the guest stalls`);
    await waitOn(host, `${RUNV} return v.phase === 'path';`, { timeout: 40000, poll: 50 });
    const ap = await netEval(host, `return window.__pe.filter((e) => e.type === 'party_autopick' && e.reason === 'timeout');`);
    const mine = ap.find((e) => e.seat === SEAT);
    const secs = mine ? (mine.tick - p2.party.openedTick) / 60 : null;
    check(`a stalled guest: the page commits at ${secs} s (30.0 ± 0.5) with party_autopick for seat ${SEAT} (choice ${mine && mine.choice})`, mine && Math.abs(secs - 30) <= 0.5, { ap, p2: p2.party });
    await sleep(600);
    const gAp = await netEval(guest, `return { ev: window.__pe.filter((e) => e.type === 'party_autopick'), toasts: E.app.toasts().slice(-6).map((t) => t.text || t.message || t) };`);
    const hToasts = await netEval(host, `return E.app.toasts().slice(-6).map((t) => t.text || t.message || t);`);
    const tRe = /Time's up/;
    check(`party_autopick reached the guest and the "Time's up" toast shows on both (guest: ${JSON.stringify(gAp.toasts.filter((t) => tRe.test(JSON.stringify(t))))})`, gAp.ev.some((e) => e.seat === SEAT) && gAp.toasts.some((t) => tRe.test(JSON.stringify(t))) && hToasts.some((t) => tRe.test(JSON.stringify(t))), { gAp, hToasts });
    const sug = p2.party.cards[SEAT].suggest;
    check(`the stalled seat holds the AI suggestion (${JSON.stringify(sug)} -> ${mine && mine.choice})`, mine && sug && mine.choice === sug.choice, { sug, mine });
    // Door deadline: nobody picks -> the left door at 30 s (armed at the
    // page commit = the autopick tick).
    const pathAt = mine ? mine.tick : await netEval(host, 'return E.tick;');
    await waitOn(host, `${RUNV} return v.phase === 'combat' || v.phase === 'fade';`, { timeout: 40000, poll: 50 });
    const pc = await netEval(host, `return window.__pe.filter((e) => e.type === 'path_chosen').slice(-1)[0];`);
    const dd = await netEval(host, `return window.__pe.filter((e) => e.type === 'party_autopick' && e.reason === 'door_timeout').slice(-1)[0];`);
    check(`door deadline: nobody picks -> the left door ${dd ? ((dd.tick - pathAt) / 60).toFixed(2) : '?'} s after the page commit (30 ± 0.5)`, pc && pc.side === 0 && dd && Math.abs((dd.tick - pathAt) / 60 - 30) <= 0.5, { pc, dd, pathAt });
    await waitOn(host, `${RUNV} return v.phase === 'combat';`, { timeout: 10000 });
    // ------------------------------------------------- page 3: socket hold --
    await clearToPage(host);
    await waitOn(guest, `${RUNV} return v.phase === 'reward' && !!v.party;`, { timeout: 10000 });
    const so = await netEval(guest, `const r = E.cmd('openSocket'); return { r, ui: E.content.socketUi() ? { open: E.content.socketUi().open, viewSeat: E.content.socketUi().viewSeat } : null };`);
    check(`the guest's socket screen opens on its own tab (seat ${so.ui && so.ui.viewSeat})`, so.ui && so.ui.open && so.ui.viewSeat === SEAT, so);
    await sleep(400);
    const scr = await netEval(host, `${RUNV} return v.socketScreens || null;`);
    check(`the host knows the guest's socket screen is open (${JSON.stringify(scr)})`, Array.isArray(scr) && scr[SEAT] === true, scr);
    await passPage(host, guest, { guestChoice: 'take' });
    const heldAt = await netEval(host, 'return E.tick;');
    const hr = await netEval(host, `${W} return W.runSystem().choosePath(1);`);
    const hv = await phaseOf(host);
    check(`the host commits the right door: held for the open socket screen (${JSON.stringify(hr)})`, hr && hr.held && hv.hold && hv.hold.side === 1, { hr, hv });
    const cnt = await netEval(guest, 'await new Promise((r) => setTimeout(r, 450)); const el = document.querySelector("#socket-screen .nd-count"); return el ? el.textContent : null;');
    check(`the guest's socket screen shows the leave countdown ("${cnt}")`, /leaves in \d+ s/.test(cnt || ''), cnt);
    await waitOn(host, `${RUNV} return v.phase === 'fade' || v.phase === 'combat';`, { timeout: 15000, poll: 30 });
    const leftAt = await netEval(host, `return window.__pe.filter((e) => e.type === 'path_chosen').slice(-1)[0];`);
    // Measured from the hold's own start (untilTick − 480), not from the
    // probe's read of the tick before the call (a tick or two of latency).
    const holdSecs = (leftAt.tick - (hr.untilTick - 480)) / 60;
    void heldAt;
    await sleep(500);
    const gs1 = await netEval(guest, 'return { open: E.content.socketUi().open, closeEv: window.__pe.filter((e) => e.type === "party_socket_close").length };');
    check(`the held door leaves after ${holdSecs.toFixed(2)} s (<= 8 s + a tick), the right door; the guest's screen closed (${JSON.stringify(gs1)})`, holdSecs <= 8.02 && holdSecs >= 7.98 && leftAt.side === 1 && gs1.open === false && gs1.closeEv >= 1, { holdSecs, leftAt, gs1 });
    // ------------------------------------------- page 4: an early close --
    await waitOn(host, `${RUNV} return v.phase === 'combat';`, { timeout: 10000 });
    await clearToPage(host);
    await waitOn(guest, `${RUNV} return v.phase === 'reward' && !!v.party;`, { timeout: 10000 });
    await netEval(guest, `E.cmd('openSocket'); return 1;`);
    await sleep(400);
    await passPage(host, guest);
    const h2 = await netEval(host, `${W} const r = W.runSystem().choosePath(0); return { r, tick: E.tick };`);
    await sleep(1500);
    await netEval(guest, `E.cmd('closeSocket'); return 1;`);
    const tClose = Date.now();
    await waitOn(host, `${RUNV} return v.phase === 'fade' || v.phase === 'combat';`, { timeout: 10000, poll: 20 });
    const lag = Date.now() - tClose;
    const pc2 = await netEval(host, `return window.__pe.filter((e) => e.type === 'path_chosen').slice(-1)[0];`);
    check(`a guest closing its socket screen releases the held door at once (${lag} ms after the close; ${((pc2.tick - h2.tick) / 60).toFixed(2)} s held)`, h2.r && h2.r.held && lag < 1500 && (pc2.tick - h2.tick) / 60 < 6, { h2, pc2, lag });
    // --------------------------------------------- page 5: an away guest --
    await waitOn(host, `${RUNV} return v.phase === 'combat';`, { timeout: 10000 });
    const cover = await openCover(browser);
    await cover.bringToFront();
    await sleep(800);
    await clearToPage(host);
    const p5 = await waitOn(host, `${RUNV} const c = v.party && v.party.cards[${SEAT}]; return c && c.decided ? { owner: v.party.owners[${SEAT}], by: c.by, choice: c.choice, opened: v.party.openedTick, tick: E.tick } : null;`, { timeout: 5000, poll: 30 });
    check(`an AWAY guest (tab hidden): its card is decided by the host at once (owner ${p5.owner}, by ${p5.by}, ${p5.tick - p5.opened} ticks after the page opened)`, p5.owner === 'ai' && p5.by === 'ai' && p5.tick - p5.opened <= 30, p5);
    await guest.page.bringToFront();
    await cover.close();
    await sleep(1500);
    await netEval(host, `${W} W.runSystem().partyPick(0, 'leave'); return 1;`);
    await waitOn(host, `${RUNV} return v.phase === 'path';`, { timeout: 10000 });
    await takeDoor(host, 0);
    // ------------------------------------------------------------- shop --
    // Walk to the shop room (the level's shelf).
    for (let k = 0; k < 8; k++) {
      const ph = await phaseOf(host);
      if (ph.phase === 'shop') break;
      if (ph.phase === 'combat') {
        await clearToPage(host);
        await passPage(host, guest);
        await takeDoor(host, 0);
      } else await sleep(300);
    }
    const sp = await phaseOf(host);
    check(`the party reaches the shop (room ${sp.room}); shelves open on both`, sp.phase === 'shop' && sp.shop, sp);
    await waitOn(guest, `${RUNV} return v.phase === 'shop' && !!v.partyShop;`, { timeout: 10000 });
    const gl = await netEval(guest, 'await new Promise((r) => setTimeout(r, 300)); return E.runUi().shop ? E.runUi().shop : (E.runUi().probe ? E.runUi().probe() : null);');
    const lampTxt = await netEval(guest, 'const b = [...document.querySelectorAll(".rn-advance")].find((x) => x.offsetParent !== null); return b ? b.textContent : null;');
    check(`the guest's shop lamp reads "Done" ("${lampTxt}")`, /^Done/.test(lampTxt || ''), { lampTxt, gl });
    const buy = await netEval(guest, `${W} const before = E.cmd('partyView', ${SEAT}).purse; const r = W.runSystem().partyBuy(${SEAT}, 0); return { r, before };`);
    await sleep(700);
    const afterBuy = await netEval(host, `return { purse: E.cmd('partyView', ${SEAT}).purse, sold: E.state().run.partyShop.shelves[${SEAT}].stock[0].sold };`);
    check(`the guest buys on its own shelf through a CMD (purse ${buy.before} -> ${afterBuy.purse}, sold ${afterBuy.sold}) or is refused for the purse`, (afterBuy.sold && afterBuy.purse < buy.before) || afterBuy.purse === buy.before, { buy, afterBuy });
    const adv = await netEval(host, `${W} return { r: W.runSystem().advanceFromShop(), tick: E.tick };`);
    check(`the host's Advance with the guest not Done starts the 15 s countdown (${JSON.stringify(adv.r)})`, adv.r && adv.r.countdown && adv.r.leaveTick - adv.tick >= 895 && adv.r.leaveTick - adv.tick <= 900, adv);
    await sleep(900);
    const gcd = await netEval(guest, `${RUNV} return v.partyShop ? v.partyShop.leaveInTicks : null;`);
    check(`the countdown shows on the guest (${gcd} ticks left)`, Number.isFinite(gcd) && gcd > 0 && gcd < 900, gcd);
    await waitOn(host, `${RUNV} return v.phase !== 'shop';`, { timeout: 25000, poll: 30 });
    const sc = await netEval(host, `return window.__pe.filter((e) => e.type === 'shop_close').slice(-1)[0];`);
    check(`the shop leaves when the countdown ends (${((sc.tick - adv.tick) / 60).toFixed(2)} s after the Advance, 15 ± 0.2)`, Math.abs((sc.tick - adv.tick) / 60 - 15) <= 0.2, { sc, adv });
    // Hash checks over the whole session.
    const gsx = await netEval(guest, 'const g = n.session.debugGuest(); return { desyncs: g.desyncs, hashChecks: g.hashChecks, party: n.session.partyStats() };');
    check(`0 desyncs over ${gsx.hashChecks} snapshot hash checks`, gsx.desyncs === 0 && gsx.hashChecks > 0, gsx);
    out.partyStats = { host: await netEval(host, 'return n.session.partyStats();'), guest: gsx.party };
  }

  if (MODE === 'casts') {
    const CLS = { 1: 'tank', 2: 'swordsman', 3: 'archer' }[SEAT];
    const SK = {
      tank: ['heavy_slam', 'brutal_cleave', 'ground_crack', 'whirling_guard', 'taunting_roar', 'shield_wall', 'shoulder_charge', 'iron_stance'],
      swordsman: ['flurry', 'lunge_strike', 'blade_storm', 'caltrops', 'fox_step', 'crescent_finisher', 'riposte', 'razor_wake'],
      archer: ['piercing_shot', 'volley', 'detonating_charge', 'sundering_nova', 'vault_shot', 'pinning_arrow', 'rain_of_arrows', 'kestrel_watch'],
    }[CLS];
    const PASSIVE = new Set(['iron_stance', 'razor_wake', 'kestrel_watch']);
    const CUE = {
      tank: 'ally_cast_tank', swordsman: 'ally_cast_sword', archer: 'ally_cast_archer',
      taunting_roar: 'tank_roar', shield_wall: 'tank_shield', shoulder_charge: 'tank_charge', iron_stance: 'tank_stance',
      fox_step: 'sword_step', crescent_finisher: 'sword_finisher', riposte: 'sword_parry', razor_wake: 'sword_wake',
      vault_shot: 'archer_vault', pinning_arrow: 'archer_pin', rain_of_arrows: 'archer_rain', kestrel_watch: 'archer_kestrel',
    };
    const guestId = await netEval(guest, 'return n.session.debugGuest().entityId;');
    // Guest-side probe: key times, a cue watcher (the cue log polled every
    // rendered frame), own events.
    await netEval(guest, `
      window.__gk = { keys: [], evs: [] };
      addEventListener('keydown', (e) => { if (!e.repeat) window.__gk.keys.push({ code: e.code, t: performance.now() }); }, { capture: true });
      for (const t of ['ally_cast', 'aura_pulse', 'parry_open', 'ally_dash', 'presentation_retract']) E.on(t, (ev) => { if (ev.seat === ${SEAT} || ev.partyIndex === ${SEAT}) window.__gk.evs.push({ type: t, skill: ev.skill ?? null, predicted: !!ev.predicted, t: performance.now() }); });
      window.__cueWatch = (cue, ms = 1500) => new Promise((res) => {
        const t0 = performance.now();
        const f = () => {
          const hit = E.audio.cueLog(80).find((e) => e.cue === cue);
          if (hit) return res(performance.now());
          if (performance.now() - t0 > ms) return res(null);
          requestAnimationFrame(f);
        };
        f();
      });
      return 1;`);
    await netEval(host, `window.__hk = []; for (const t of ['ally_cast', 'aura_pulse', 'parry_open', 'ally_dash', 'seat_denied', 'skill_swapped']) E.on(t, (ev) => { if (ev.seat === ${SEAT} || ev.partyIndex === ${SEAT}) window.__hk.push({ type: t, skill: ev.skill ?? ev.id ?? null, replaced: ev.replaced ?? null, tick: ev.tick, kind: ev.kind ?? null, reason: ev.reason ?? null, cause: ev.cause ?? null, predicted: !!ev.predicted }); }); return 1;`);
    // Keep the guest seat standing (enemies keep attacking it).
    const keepAlive = setInterval(() => {
      netEval(host, `const e = E.state().party.find((m) => m.partyIndex === ${SEAT}); if (e && e.hp < e.maxHp * 0.7) E.cmd('setHp', e.id, 1); return 1;`).catch(() => {});
    }, 400);
    // Loadout set at a page (between rooms), then into the next combat room.
    async function toCombatWith(slots, sockets = []) {
      await clearToPage(host);
      for (let i = 0; i < 4; i++) {
        const cur = await netEval(host, `return E.cmd('partyView', ${SEAT}).slots;`);
        if (cur[i] === slots[i]) continue;
        const j = cur.indexOf(slots[i]);
        if (j >= 0) await netEval(host, `return E.cmd('partyReorder', ${SEAT}, ${j}, ${i});`);
        else {
          const r = await netEval(host, `return E.cmd('partySwap', ${SEAT}, '${slots[i]}', ${i});`);
          if (!r || r.denied || r.error) note(`partySwap ${slots[i]} -> ${JSON.stringify(r)}`);
        }
      }
      for (const [skill, node] of sockets) {
        await netEval(host, `E.cmd('partyGrantNode', ${SEAT}, '${node}'); return E.cmd('partySocket', ${SEAT}, '${skill}', '${node}', 0);`);
      }
      const fin = await netEval(host, `return E.cmd('partyView', ${SEAT}).slots;`);
      await passPage(host, guest);
      await takeDoor(host, 0);
      if ((await phaseOf(host)).phase === 'shop') {
        await netEval(host, `${W} W.runSystem().advanceFromShop({ force: true }); return 1;`);
        await waitOn(host, `${RUNV} return v.phase === 'combat';`, { timeout: 15000 });
      }
      await waitOn(guest, `${RUNV} return v.phase === 'combat';`, { timeout: 15000 });
      await sleep(1500);
      // The guest's replica + HUD carry the new loadout.
      const gslots = await netEval(guest, `return E.cmd('partyView', ${SEAT}).slots;`);
      return { fin, gslots };
    }
    const ownPose = () => netEval(guest, 'const p = n.session.ownPose(); const g = n.session.debugGuest(); const b = g.own.body; return b ? { x: b.x, z: b.z } : null;');
    async function aimAt(dirSign, dist = 2.5) {
      const b = await ownPose();
      const d = b.x > 0 ? -1 : 1;
      const ax = b.x + d * dirSign * dist;
      const p = await netEval(guest, `return E.content.project(${ax}, ${b.z}, 0.3);`);
      await guest.page.mouse.move(p.x, p.y);
      return { body: b, aim: { x: ax, z: b.z } };
    }
    async function diffPct(a, b) {
      const A = await sharp(a).raw().toBuffer({ resolveWithObject: true });
      const B = await sharp(b).raw().toBuffer({ resolveWithObject: true });
      const n = A.info.width * A.info.height;
      let changed = 0;
      for (let i = 0; i < n; i++) {
        let d = 0;
        for (let c = 0; c < 3; c++) d += Math.abs(A.data[i * A.info.channels + c] - B.data[i * B.info.channels + c]);
        if (d > 30) changed += 1;
      }
      return (100 * changed) / n;
    }
    const raf4 = () => netEval(guest, 'await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))); return 1;');
    // One real key press on the guest: host sim event, guest cue latency, VFX.
    async function pressSkill(slot, skill) {
      const b = await ownPose();
      const p = await netEval(guest, `return E.content.project(${b.x}, ${b.z}, 0.5);`);
      const clip = { x: Math.max(0, p.x - 120), y: Math.max(0, p.y - 120), width: 240, height: 240 };
      const c0 = await guest.page.screenshot({ clip });
      await raf4();
      const c1 = await guest.page.screenshot({ clip });
      const control = await diffPct(c0, c1);
      const cue = CUE[skill] ?? CUE[CLS];
      // A passive cues only when its pulse does something: a target dummy
      // at the fox's side (host spawn) for Razor Wake / Kestrel Watch.
      if (PASSIVE.has(skill)) {
        await netEval(host, `const ents = E.content.world().entities(); const a = ents.find((m) => m.kind === 'ally' && m.partyIndex === ${SEAT}); const hs = ents.filter((e) => e.faction === 'hostile' && e.hp > 0 && e.hittable).sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z)); for (const h of hs.slice(0, 2)) { h.x = a.x + 0.5; h.z = a.z + (hs.indexOf(h) ? 0.3 : -0.3); h.px = h.x; h.pz = h.z; } return hs.length;`);
      }
      const h0 = await netEval(host, 'return window.__hk.length;');
      const fx0 = await netEval(guest, 'return E.content.classFx();');
      await netEval(guest, 'E.audio.cueLogClear(); window.__cuePromise = null; return 1;');
      const pre = await guest.page.screenshot({ clip });
      await netEval(guest, `window.__cuePromise = window.__cueWatch('${cue}', ${PASSIVE.has(skill) ? 2600 : 1500}); return 1;`);
      await guest.page.keyboard.press(`Digit${slot + 1}`);
      await raf4();
      const post = await guest.page.screenshot({ clip });
      const fx1 = await netEval(guest, 'return E.content.classFx();');
      const cueAt = await netEval(guest, 'return await window.__cuePromise;');
      const keyAt = await netEval(guest, `const k = window.__gk.keys.filter((x) => x.code === 'Digit${slot + 1}').slice(-1)[0]; return k ? k.t : null;`);
      await sleep(PASSIVE.has(skill) ? 1500 : 900);
      const hev = await netEval(host, `return window.__hk.slice(${h0});`);
      const vfx = await diffPct(pre, post);
      const fxd = Object.keys(fx1 || {}).filter((k) => fx1[k] !== fx0[k]);
      const sim = PASSIVE.has(skill) ? hev.some((e) => e.type === 'aura_pulse' && e.skill === skill) : hev.some((e) => (e.type === 'ally_cast' || e.type === 'parry_open') && e.skill === skill);
      const latency = cueAt !== null && keyAt !== null ? Math.round(cueAt - keyAt) : null;
      return { skill, slot, sim, hev: hev.map((e) => `${e.type}:${e.skill ?? e.kind}`).slice(0, 6), vfx: +vfx.toFixed(2), control: +control.toFixed(2), fxd, cue, latency, post };
    }
    const rows = [];
    const PART = arg('part', 'all');
    for (const half of PART === 'dash' ? [] : [SK.slice(0, 4), SK.slice(4, 8)]) {
      const lo = await toCombatWith(half);
      check(`the host swapped [${half.join(', ')}] into seat ${SEAT} between rooms; the guest's replica carries it`, JSON.stringify(lo.fin) === JSON.stringify(half) && JSON.stringify(lo.gslots) === JSON.stringify(half), lo);
      const tiles = await netEval(guest, 'return [...document.querySelectorAll(".hud-group-skill .hud-slot")].filter((s) => s.style.display !== "none").map((s) => ({ passive: s.classList.contains("is-passive"), label: s.textContent.trim().slice(0, 12) }));');
      check(`the guest's HUD tiles follow the loadout (passives marked: ${JSON.stringify(tiles.map((t) => t.passive))})`, tiles.length === 4 && tiles.every((t, i) => t.passive === PASSIVE.has(half[i])), tiles);
      for (let i = 0; i < 4; i++) {
        let r = await pressSkill(i, half[i]);
        // A VFX-only miss (a noisy control) is re-measured once after the cooldown.
        if (r.sim && !(r.vfx >= 1.5 && (r.vfx >= r.control + 1.5 || r.fxd.length))) {
          // Wait out the skill's cooldown before the second press.
          await sleep(Math.max(3500, ((SKILL_CD[half[i]] ?? 3) + 0.8) * 1000));
          r = await pressSkill(i, half[i]);
        }
        rows.push(r);
        const vOk = r.vfx >= 1.5 && (r.vfx >= r.control + 1.5 || r.fxd.length > 0);
        // A passive has no press to answer: its cue rides its next pulse.
        const aOk = r.latency !== null && (PASSIVE.has(r.skill) || r.latency <= 150);
        console.log(`${r.sim && vOk && aOk ? 'PASS' : 'FAIL'} ${CLS}.${r.skill} key ${i + 1}: host event ${r.sim} (${r.hev.join(' ')}), vfx ${r.vfx}% (control ${r.control}%, rigs ${r.fxd.join('/')}), cue ${r.cue} +${r.latency} ms`);
        if (arg('debug', null)) writeFileSync(`captures/gntPARTY-net-cast-${r.skill}.png`, r.post);
      }
      // Passive cadence: 60 ± 1 ticks while owned.
      for (const s of half.filter((x) => PASSIVE.has(x))) {
        await sleep(2600);
        const ticks = await netEval(host, `return window.__hk.filter((e) => e.type === 'aura_pulse' && e.skill === '${s}').map((e) => e.tick).slice(-4);`);
        const gaps = ticks.slice(1).map((t, k) => t - ticks[k]);
        check(`${s} pulses every 60 ± 1 ticks on the guest seat (${JSON.stringify(gaps)})`, gaps.length >= 2 && gaps.every((g) => Math.abs(g - 60) <= 1), ticks);
      }
    }
    // The passive swapped out stops (the next loadout does not carry it).
    const passive = SK.find((s) => PASSIVE.has(s));
    if (PART !== 'dash') {
    const swapOutAt = await netEval(host, 'return E.tick;');
    const lo3 = await toCombatWith(SK.slice(0, 4));
    await sleep(2500);
    const late = await netEval(host, `return window.__hk.filter((e) => e.type === 'aura_pulse' && e.skill === '${passive}' && e.tick > ${swapOutAt} + 5).map((e) => e.tick);`);
    const swapTick = await netEval(host, `return window.__hk.length;`);
    void swapTick;
    // (a pulse on the page before the swap tick itself may still land)
    const stopTick = await netEval(host, `const s = window.__hk.filter((e) => e.type === 'skill_swapped' && e.replaced === '${passive}').slice(-1)[0]; return s ? s.tick : null;`);
    const after = late.filter((t) => stopTick !== null && t > stopTick);
    check(`${passive} stops the tick it is swapped out (swap at ${stopTick}; pulses after: ${JSON.stringify(after)})`, stopTick !== null && after.length === 0, { late, stopTick, lo3 });
    const bad = rows.filter((r) => !(r.sim && r.vfx >= 1.5 && (r.vfx >= r.control + 1.5 || r.fxd.length > 0) && r.latency !== null && (PASSIVE.has(r.skill) || r.latency <= 150)));
    const act = rows.filter((r) => !PASSIVE.has(r.skill));
    check(`all 8 ${CLS} skills by REAL keys 1-4 on the guest seat: host sim event + VFX box diff + own cue (actives <= 150 ms after the key, max ${Math.max(...act.map((r) => r.latency ?? 9999))} ms; passives on their pulse) (${rows.length - bad.length}/${rows.length})`, bad.length === 0, bad.map((r) => ({ ...r, post: undefined })));
    out.casts = rows.map((r) => ({ ...r, post: undefined }));
    }
    // ------------------------------------------ displacement prediction --
    const DASH = {
      tank: { slots: ['shoulder_charge', 'heavy_slam', 'brutal_cleave', 'whirling_guard'], sockets: [], casts: [['shoulder_charge', 0, 1]] },
      swordsman: { slots: ['fox_step', 'flurry', 'lunge_strike', 'blade_storm'], sockets: [['flurry', 'pursuit']], casts: [['fox_step', 0, 1], ['pursuit', 1, 1]] },
      archer: { slots: ['vault_shot', 'piercing_shot', 'volley', 'sundering_nova'], sockets: [['piercing_shot', 'disengage']], casts: [['vault_shot', 0, -1], ['disengage', 1, -1]] },
    }[CLS];
    const lo4 = await toCombatWith(DASH.slots, DASH.sockets);
    note(`dash loadout ${JSON.stringify(lo4)}`);
    const windows = {};
    const N = Number(arg('dashes', 10));
    for (let k = 0; k < N; k++) {
      for (const [name, slot, sign] of DASH.casts) {
        // Stay in combat (a cleared room ends the test room: take the next).
        if ((await phaseOf(host)).phase !== 'combat') await toCombatWith(DASH.slots, []);
        await aimAt(sign);
        await netEval(guest, 'n.session.resetStats(); return 1;');
        const s0 = await netEval(guest, 'const o = n.session.debugGuest().own.stats(); return { casts: o.skillCasts, dashes: o.skillDashes };');
        await guest.page.keyboard.press(`Digit${slot + 1}`);
        await sleep(900);
        const st = await netEval(guest, 'const o = n.session.debugGuest().own; return { ...o.stats(), list: o.predErrList ? o.predErrList() : [] };');
        (windows[name] = windows[name] || []).push({ p95: st.predErrP95, max: st.predErrMax, snaps: st.snaps, corr: st.maxCorrectionPerFrame, n: st.predErrSamples, dashed: st.skillDashes - s0.dashes, list: st.list });
      }
      await sleep(name0Cd(CLS));
    }
    function name0Cd(c) {
      return c === 'tank' ? 6300 : c === 'swordsman' ? 4200 : 5200;
    }
    for (const [name] of DASH.casts) {
      const w = windows[name] || [];
      const dashed = w.filter((x) => x.dashed > 0).length;
      // Pooled over every sample inside the cast windows (the G5b.2 bar).
      const pool = w.flatMap((x) => x.list || []).sort((a, b) => a - b);
      const p95 = pool.length ? pool[Math.min(pool.length - 1, Math.floor(pool.length * 0.95))] : Math.max(...w.map((x) => x.p95 ?? 0));
      const mx = Math.max(...w.map((x) => x.max ?? 0));
      const snaps = w.reduce((a, x) => a + (x.snaps || 0), 0);
      const corr = Math.max(...w.map((x) => x.corr ?? 0));
      const barP95 = COND_NAME === 'N2' ? Infinity : 0.15;
      const barMax = 1.0;
      check(`${name} on the guest seat at ${COND_NAME}: ${w.length} casts (${dashed} predicted displacements); predErr p95 ${p95.toFixed(3)} u over ${pool.length} samples in the cast windows (<= ${barP95}), max ${mx.toFixed(3)} u (<= ${barMax}), ${snaps} snaps, max correction/frame ${corr.toFixed(3)} u (<= 0.1)`, w.length >= N && dashed >= N && p95 <= barP95 && mx <= barMax && snaps === 0 && corr <= 0.1, w);
    }
    out.dashWindows = windows;
    clearInterval(keepAlive);
    const gsx = await netEval(guest, 'const g = n.session.debugGuest(); return { desyncs: g.desyncs, hashChecks: g.hashChecks };');
    check(`0 desyncs over ${gsx.hashChecks} snapshot hash checks`, gsx.desyncs === 0 && gsx.hashChecks > 0, gsx);
  }

  if (MODE === 'rearm') {
    // -------------------------------------------------------------- (a) --
    // Host alone (1 human) in MANUAL mode opens a page: no deadline; the
    // ally cards stay undecided. A guest drops in onto an AI-held undecided
    // seat -> a deadline is armed that tick, and at it EVERY undecided card
    // (the guest's, the AI-held Manual ones, the host's own) takes the
    // suggestion (c).
    await clearToPage(host);
    const pa = await phaseOf(host);
    check(`host alone in Manual mode: the page opens with no deadline (${pa.party.deadlineTick}) and the ally cards undecided`, pa.party.deadlineTick === null && [1, 2, 3].every((s) => !pa.party.cards[s].decided), pa.party);
    guest = await openClient(browser, { base, server: srv.url, name: 'Fox', seed: 8 });
    const dropSeat = await joinRoom(guest, code, SEAT);
    await waitSession([host, guest], 30000);
    const armed = await waitOn(host, `const e = window.__pe.find((x) => x.type === 'party_deadline' && x.what === 'page' && x.tick !== null); const c = window.__pe.find((x) => x.type === 'seat_control' && x.partyIndex === ${SEAT} && x.controller === 'human'); return e && c ? { deadline: e.tick, armedAt: e.tick - 1800, controlAt: c.tick } : null;`, { timeout: 30000, poll: 50 });
    check(`a guest drops in onto seat ${dropSeat}: the page deadline is armed on the take-over tick (armed ${armed.armedAt}, seat control ${armed.controlAt})`, Math.abs(armed.armedAt - armed.controlAt) <= 1, armed);
    await waitOn(host, `${RUNV} return v.phase !== 'reward';`, { timeout: 40000, poll: 50 });
    const apA = await netEval(host, `return window.__pe.filter((e) => e.type === 'party_autopick' && e.reason === 'timeout').map((e) => ({ seat: e.seat, choice: e.choice, tick: e.tick }));`);
    const commitA = apA.length ? apA[0].tick : null;
    check(`(a)/(c) the page commits ${commitA !== null ? ((commitA - armed.controlAt) / 60).toFixed(2) : '?'} s after the drop-in (<= 30.5); EVERY undecided card took the suggestion: seats ${JSON.stringify(apA.map((e) => e.seat))}`, commitA !== null && (commitA - armed.controlAt) / 60 <= 30.5 && [0, 1, 2, 3].every((s) => apA.some((e) => e.seat === s)), { apA, armed });
    const sugOk = apA.filter((e) => e.seat > 0).every((e) => {
      const c = pa.party.cards[e.seat];
      return c.suggest && c.suggest.choice === e.choice;
    });
    check('(c) each auto-picked ally card holds its §25.8 suggestion', sugOk, { apA, cards: pa.party.cards });
    await takeDoor(host, 0);
    // -------------------------------------------------------------- (b) --
    await clearToPage(host);
    const pb = await phaseOf(host);
    check(`two humans: the next page opens with a deadline (+${pb.party.deadlineTick - pb.party.openedTick} ticks)`, pb.party.deadlineTick - pb.party.openedTick === 1800, pb.party);
    // (e) a NETWORK save made on this open page with its deadline.
    const netTree = await netEval(host, 'return E.save.capture();');
    await sleep(4000);
    const cover = await openCover(browser);
    await cover.bringToFront();
    await waitOn(host, `${RUNV} return v.party && v.party.owners[${SEAT}] === 'ai';`, { timeout: 10000, poll: 50 });
    const awayCard = (await phaseOf(host)).party.cards[SEAT];
    check(`Manual mode: the guest going AWAY leaves its card undecided (a Manual AI-held card is not auto-decided): decided=${awayCard.decided}`, awayCard.decided === false, awayCard);
    await sleep(3000);
    await guest.page.bringToFront();
    await cover.close();
    const back = await waitOn(host, `${RUNV} const c = window.__pe.filter((x) => x.type === 'seat_control' && x.partyIndex === ${SEAT} && x.controller === 'human').slice(-1)[0]; return v.party && v.party.owners[${SEAT}] === 'human' && c ? { dl: v.party.deadlineTick, back: c.tick, before: ${pb.party.deadlineTick} } : null;`, { timeout: 15000, poll: 50 });
    check(`(b) the card turned human-owned again while undecided: a fresh 30 s from the take-over (deadline ${back.dl} = take-over ${back.back} + ${back.dl - back.back}; was ${back.before})`, back.dl - back.back === 1800 && back.dl > back.before, back);
    await passPage(host, guest);
    await takeDoor(host, 0);
    // ---------------------------------------------------- shop deadline --
    await netEval(host, `E.cmd('skipToRoom', 7); return 1;`);
    const sh = await waitOn(host, `${RUNV} return v.phase === 'shop' && v.partyShop ? { opened: E.tick, deadline: v.partyShop.deadlineTick } : null;`, { timeout: 20000, poll: 50 });
    note(`shop open ~${sh.opened}, its deadline ${sh.deadline}; nobody acts`);
    await waitOn(host, `${RUNV} return v.phase !== 'shop';`, { timeout: 100000, poll: 100 });
    const sc = await netEval(host, `return window.__pe.filter((e) => e.type === 'shop_close').slice(-1)[0];`);
    const shopOpenTick = sh.deadline - 5400;
    check(`the shop's own deadline: it leaves ${((sc.tick - shopOpenTick) / 60).toFixed(2)} s after it opened (90 ± 0.2) with nobody acting`, Math.abs((sc.tick - shopOpenTick) / 60 - 90) <= 0.2, { sc, sh });
    // --------------------------------------- Done, then Advance at once --
    await waitOn(host, `${RUNV} if (v.phase === 'combat' && v.room === 8) { E.cmd('killAllEnemies'); E.cmd('killBoss'); } return v.phase === 'transit' || (v.act === 2 && v.phase === 'combat');`, { timeout: 60000, poll: 150 });
    await waitOn(host, `${RUNV} return v.act === 2 && v.phase === 'combat';`, { timeout: 30000, poll: 150 });
    await sleep(800);
    await netEval(host, `E.cmd('skipToRoom', 7); return 1;`);
    await waitOn(host, `${RUNV} return v.phase === 'shop' && !!v.partyShop;`, { timeout: 20000, poll: 50 });
    await waitOn(guest, `${RUNV} return v.phase === 'shop' && !!v.partyShop;`, { timeout: 20000, poll: 50 });
    await sleep(600);
    // The guest presses Enter on its lamp (reads "Done").
    await guest.page.keyboard.press('Enter');
    await waitOn(host, `${RUNV} return v.partyShop && v.partyShop.done[${SEAT}] === true;`, { timeout: 5000, poll: 30 });
    const adv = await netEval(host, `${W} const t = E.tick; const r = W.runSystem().advanceFromShop(); return { r, t };`);
    const sc2 = await netEval(host, `return window.__pe.filter((e) => e.type === 'shop_close').slice(-1)[0];`);
    check(`the guest pressed Done (Enter on its lamp), then the host's Advance leaves at once (${JSON.stringify(adv.r)}, shop_close at ${sc2 && sc2.tick} vs Advance ${adv.t})`, adv.r && adv.r.nextRoom && sc2 && sc2.tick - adv.t <= 1, { adv, sc2 });
    // -------------------------------------------------------------- (d) --
    await waitOn(host, `${RUNV} if (v.phase === 'combat' && v.room === 8) { E.cmd('killAllEnemies'); E.cmd('killBoss'); } return v.act === 3 && v.phase === 'combat';`, { timeout: 90000, poll: 150 });
    await sleep(800);
    await clearToPage(host);
    const pd = await phaseOf(host);
    check(`Level 3 page with 2 humans: a deadline (${pd.party.deadlineTick})`, Number.isFinite(pd.party.deadlineTick), pd.party);
    const cdBefore = await netEval(host, 'await new Promise((r) => setTimeout(r, 300)); const p = [...document.querySelectorAll(".rn-page")].find((x) => x.style.display !== "none"); return p ? p.textContent.replace(/\\s+/g, " ") : null;');
    await netEval(guest, 'return n.leave();');
    const dNull = await waitOn(host, `${RUNV} return v.party && v.party.deadlineTick === null ? { tick: E.tick } : null;`, { timeout: 15000, poll: 50 });
    await sleep(500);
    const hostTxt = await netEval(host, 'const p = [...document.querySelectorAll(".rn-page")].find((x) => x.style.display !== "none"); return p ? p.textContent.replace(/\\s+/g, " ") : null;');
    const cdRe = /auto-pick in \d+ s|\d+ s left|Waiting for/;
    check(`(d) the 2nd human leaves -> the host's page deadline is cleared (tick ${dNull.tick}) and no countdown shows`, !cdRe.test(hostTxt || ''), { hostTxt: (hostTxt || '').slice(0, 300), cdBefore: (cdBefore || '').slice(0, 200) });
    // -------------------------------------------------------------- (e) --
    // The network save (page open, deadline armed) loaded in a single-player
    // page: no deadline, no countdown, no auto-pick after 60 s.
    const sp = await openClient(browser, { base, server: 'ws://127.0.0.1:1/echoes', name: 'Solo', seed: 9, extra: { net: '' } });
    const e0 = await netEval(sp, `const r = E.save.apply(arg); return { ok: r && (r.ok !== false), phase: E.state().run.phase };`, netTree);
    const e1 = await netEval(sp, `window.__sp = []; E.on('party_autopick', (e) => window.__sp.push(e)); E.sim.freeze(); E.sim.stepN(3600); const v = E.state().run; const r = { phase: v.phase, deadline: v.party ? v.party.deadlineTick : 'none', undecided: v.party ? v.party.cards.filter((c) => !c.decided).map((c) => c.seat) : null, autopicks: window.__sp.length }; E.sim.thaw(); return r;`);
    await sleep(600);
    const spTxt = await netEval(sp, 'const p = [...document.querySelectorAll(".rn-page")].find((x) => x.style.display !== "none"); return p ? p.textContent.replace(/\\s+/g, " ") : null;');
    check(`(e) a network save (open page + deadline) loaded single-player: applied ${JSON.stringify(e0)}; after 60 s of sim still on the page (${e1.phase}), deadline ${e1.deadline}, ${e1.autopicks} auto-picks, no countdown`, e0.ok && e1.phase === 'reward' && e1.deadline === null && e1.autopicks === 0 && !cdRe.test(spTxt || ''), { e0, e1, spTxt: (spTxt || '').slice(0, 200) });
    out.errors2 = { sp: sp.errors.slice(0, 5) };
    const gsx = await netEval(host, 'return n.session.partyStats();');
    out.partyStats = gsx;
  }

  if (MODE === 'repl') {
    const t0 = Date.now();
    // Build signature: all four builds (skills in slot order, sockets,
    // bench, purse) + the party stream state.
    const SIG = `const s = E.cmd('partyState'); const h = E.cmd('buildView'); return JSON.stringify({ rng: s.rng, healer: h ? h.skills.map((k) => k.id + ':' + k.sockets.map((x) => (x ? x.node : '-')).join(',')) : null, seats: s.seats.map((v) => ({ slots: v.slots, purse: v.purse, bench: v.bench.map((b) => b.node).sort(), sk: v.skills.map((k) => k.id + ':' + k.sockets.map((x) => (x ? x.node : '-')).join(',')) })) });`;
    const PAGE = `${RUNV} return v.party ? JSON.stringify({ owners: v.party.owners, cards: v.party.cards.map((c) => [c.seat, c.type, c.id, c.decided, c.choice, c.replace]) }) : null;`;
    const same = async (what, clients = [guest]) => {
      await sleep(700);
      const h = await netEval(host, `${SIG}`);
      const gs = [];
      for (const c of clients) gs.push(await netEval(c, `${SIG}`));
      const ok = gs.every((g) => g === h);
      reps.push({ what, ok });
      if (!ok) note(`replication differs after ${what}: host ${h.slice(0, 300)} guest ${gs.map((g) => g.slice(0, 300)).join(' | ')}`);
      return ok;
    };
    const reps = [];
    let guestB = null;
    await netEval(guest, 'n.session.setBotInput({ seed: 3 }); return 1;');
    // ------------------------------------------------ Level 1 and Level 2 --
    for (let lvl = 1; lvl <= 2; lvl++) {
      for (let room = 0; room < 9; room++) {
        const ph = await phaseOf(host);
        if (ph.act !== lvl) break;
        if (ph.phase === 'combat' && ph.room === 8) {
          await sleep(4000);
          await waitOn(host, `${RUNV} if (v.phase === 'combat') { E.cmd('killAllEnemies'); E.cmd('killBoss'); } return v.phase === 'transit';`, { timeout: 60000, poll: 150 });
          await same(`Level ${lvl} clear (transit card)`, guestB ? [guest, guestB] : [guest]);
          await waitOn(host, `${RUNV} return v.act === ${lvl + 1} && v.phase === 'combat';`, { timeout: 40000, poll: 150 });
          await same(`the Level ${lvl} -> ${lvl + 1} transition`, guestB ? [guest, guestB] : [guest]);
          break;
        }
        if (ph.phase === 'combat') {
          await sleep(6000); // real play: the bot guest fights for a while
          await clearToPage(host);
          const hp = await netEval(host, PAGE);
          await sleep(500);
          const gp = await netEval(guest, PAGE);
          reps.push({ what: `page L${lvl} r${ph.room} (cards / owners)`, ok: hp === gp });
          await netEval(guest, `${W} return W.runSystem().partyPick(${SEAT}, 'take');`);
          if (guestB) await netEval(guestB, `${W} return W.runSystem().partyPick(3, 'take');`);
          await netEval(host, `${W} return W.runSystem().partyPick(0, 'take');`);
          await waitOn(host, `${RUNV} return v.phase !== 'reward';`, { timeout: 10000 });
          await same(`page commit L${lvl} r${ph.room}`, guestB ? [guest, guestB] : [guest]);
          // A socket op by the guest (its own Auto-fill) between rooms.
          await netEval(guest, `${W} return W.partySystem().build(${SEAT}).autoFill();`);
          await same(`guest socket op L${lvl} r${ph.room}`, guestB ? [guest, guestB] : [guest]);
          if (lvl === 1 && ph.room === 2 && !guestB) {
            // ---------------------------------------------- drop-in (GP.10) --
            const before = await netEval(host, `return JSON.stringify(E.cmd('partyView', 3).skills.map((k) => k.id + ':' + k.sockets.map((x) => (x ? x.node : '-')).join(',')));`);
            guestB = await openClient(browser, { base, server: srv.url, name: 'Hare', seed: 9 });
            const sb = await joinRoom(guestB, code, 3);
            await waitSession([host, guest, guestB], 30000);
            await sleep(1500);
            const afterB = await netEval(guestB, `return JSON.stringify(E.cmd('partyView', 3).skills.map((k) => k.id + ':' + k.sockets.map((x) => (x ? x.node : '-')).join(',')));`);
            const ctrl = await netEval(host, 'return E.cmd("netSeats").controllers;');
            check(`drop-in: a 2nd guest takes AI-built seat ${sb} WITH the build the host gave it (${JSON.parse(before).filter((x) => /[a-z]:[^-]/.test(x)).length} built skills) and plays it (controllers ${JSON.stringify(ctrl)})`, afterB === before && ctrl[3] === 'human', { before, afterB, ctrl });
          }
          await takeDoor(host, 0);
          continue;
        }
        if (ph.phase === 'shop') {
          await waitOn(guest, `${RUNV} return v.phase === 'shop' && !!v.partyShop;`, { timeout: 10000 });
          await netEval(guest, `${W} return W.runSystem().partyBuy(${SEAT}, 0);`);
          if (guestB) await netEval(guestB, `${W} return W.runSystem().partyBuy(3, 1);`);
          await same(`guest purchase L${lvl}`, guestB ? [guest, guestB] : [guest]);
          await netEval(host, `${W} W.runSystem().advanceFromShop({ force: true }); return 1;`);
          await waitOn(host, `${RUNV} return v.phase !== 'shop';`, { timeout: 10000 });
          continue;
        }
        await sleep(400);
      }
    }
    check(`builds replicate after every page commit, socket op, purchase and level transition: ${reps.filter((r) => r.ok).length}/${reps.length} equal`, reps.length >= 20 && reps.every((r) => r.ok), reps.filter((r) => !r.ok));
    // --------------------------------------------------- rejoin (GP.10) --
    const pre = await netEval(host, `${SIG}`);
    const pidA = await netEval(guest, 'return n.peerId;');
    const dr = await admin(srv, '/admin/drop', { peerId: pidA, mode: 'close', forMs: 3000 });
    await sleep(3500);
    await waitOn(guest, 'const s = n.session.status(); return s.role === "guest" && s.synced && !s.frozen;', { timeout: 20000, poll: 200 });
    await waitOn(host, `return E.cmd("netSeats").controllers[${SEAT}] === 'human';`, { timeout: 20000, poll: 200 });
    await sleep(1200);
    const hostNow = await netEval(host, `${SIG}`);
    const gNow = await netEval(guest, `${SIG}`);
    const sameBuilds = (a, b) => JSON.stringify(JSON.parse(a).seats.map((s) => [s.slots, s.sk, s.bench, s.purse])) === JSON.stringify(JSON.parse(b).seats.map((s) => [s.slots, s.sk, s.bench, s.purse]));
    check(`rejoin: the guest dropped (${JSON.stringify(dr).slice(0, 60)}) and reconnected to seat ${SEAT}: its build is kept (host builds unchanged, the guest's replica equal)`, sameBuilds(pre, hostNow) && gNow === hostNow, { pre: pre.slice(0, 200), hostNow: hostNow.slice(0, 200) });
    // ----------------------------------------- 10-minute desync window --
    while (Date.now() - t0 < 10 * 60 * 1000) {
      const ph = await phaseOf(host);
      if (ph.phase === 'combat' && ph.room !== 8) {
        await sleep(12000);
        if ((await clearToPage(host)) === 'ended') continue;
        await netEval(guest, `${W} return W.runSystem().partyPick(${SEAT}, 'leave');`);
        if (guestB) await netEval(guestB, `${W} return W.runSystem().partyPick(3, 'leave');`);
        await netEval(host, `${W} return W.runSystem().partyPick(0, 'leave');`);
        await waitOn(host, `${RUNV} return v.phase !== 'reward';`, { timeout: 12000 });
        await takeDoor(host, 0);
      } else if (ph.phase === 'shop') {
        await netEval(host, `${W} W.runSystem().advanceFromShop({ force: true }); return 1;`);
        await sleep(500);
      } else if (ph.phase === 'combat' && ph.room === 8) {
        await sleep(5000);
        await netEval(host, `E.cmd('killAllEnemies'); E.cmd('killBoss'); return 1;`);
        await sleep(3000);
      } else if (ph.phase === 'victory' || ph.phase === 'defeat') {
        await netEval(host, `${W} W.runSystem().returnToCamp(); return 1;`);
        await sleep(2000);
      } else if (ph.phase === 'idle') {
        // The campaign ended (victory / defeat -> camp): the party sets out again.
        const ready = await netEval(host, 'return E.campaign.ready(1).ready;');
        if (ready) await netEval(host, 'return E.campaign.choose(1);');
        await sleep(1500);
      } else await sleep(500);
    }
    const dA = await netEval(guest, 'const g = n.session.debugGuest(); return { desyncs: g.desyncs, hashChecks: g.hashChecks };');
    const dB = guestB ? await netEval(guestB, 'const g = n.session.debugGuest(); return { desyncs: g.desyncs, hashChecks: g.hashChecks };') : { desyncs: 0, hashChecks: 1 };
    check(`a ${((Date.now() - t0) / 60000).toFixed(1)}-minute session: 0 desyncs (guest A ${dA.desyncs}/${dA.hashChecks}, guest B ${dB.desyncs}/${dB.hashChecks} hash checks)`, dA.desyncs === 0 && dB.desyncs === 0 && dA.hashChecks > 100, { dA, dB });
    // ------------------------------------------------ migration (GP.10) --
    await netEval(guest, 'n.session.setBotInput(null); return 1;');
    const preMig = await netEval(host, `${SIG}`);
    await admin(srv, '/admin/conditioner', { target: await netEval(guestB, 'return n.peerId;'), up: 'lat30', down: 'lat30' });
    await sleep(2500);
    const preMig2 = await netEval(host, `${SIG}`);
    const km = await admin(srv, '/admin/kill-host', { code });
    const nh = await waitOn(guest, 'const s = n.session.status(); return s.role === "host" ? s : null;', { timeout: 30000, poll: 250 });
    await waitOn(guestB, 'const s = n.session.status(); return s.role === "guest" && s.synced && !s.frozen;', { timeout: 30000, poll: 250 });
    await sleep(1500);
    const postMig = await netEval(guest, `${SIG}`);
    const postB = await netEval(guestB, `${SIG}`);
    const okMig = sameBuilds(preMig2, postMig) && sameBuilds(postMig, postB);
    check(`migration: the host killed (${JSON.stringify(km).slice(0, 60)}); guest A becomes host (${nh.role}) and all four builds are kept (new host = pre-kill; guest B = new host)`, okMig, { preMig: preMig.slice(0, 160), preMig2: preMig2.slice(0, 160), postMig: postMig.slice(0, 160) });
    out.replication = reps;
  }

  if (MODE === 'bw') {
    // GP.10 bandwidth: Level 3 room 6 with the four deterministic MAX-STRESS
    // builds (BUILD_BRIEF §25.10), the guest at the given --cond (N1).
    // The run started by the common path above is replaced: a Level 3 start
    // with the harness grant 'max' (= ?level=3&partygrant=max).
    await netEval(host, `${W} W.runSystem().setHarnessGrant('max'); E.cmd('abandonRun', 'probe'); return 1;`);
    await sleep(1500);
    await netEval(host, `E.cmd('startCampaign', { level: 3 }); return 1;`);
    await waitOn(host, `${RUNV} return v.phase === 'combat' && v.act === 3;`, { timeout: 30000, poll: 150 });
    if (arg('reskip', '0') === '1') {
      await netEval(host, `E.cmd('skipToRoom', 6); return 1;`);
      await waitOn(host, `${RUNV} return v.phase === 'combat' && v.room === 6;`, { timeout: 30000, poll: 150 });
    }
    await waitOn(guest, `${RUNV} return v.phase === 'combat' && v.act === 3;`, { timeout: 30000, poll: 150 });
    const fill = await netEval(host, `const h = E.cmd('buildView'); return { healer: h.skills.reduce((a, k) => a + k.filled, 0), allies: [1, 2, 3].map((s) => E.cmd('partyView', s).filled), slots: [1, 2, 3].map((s) => E.cmd('partyView', s).slots) };`);
    check(`the MAX-STRESS precondition: every seat 32 / 32 (Healer ${fill.healer}, allies ${JSON.stringify(fill.allies)})`, fill.healer === 32 && fill.allies.every((n) => n === 32), fill);
    await netEval(guest, 'n.session.setBotInput({ seed: 3, aimAll: true }); return 1;');
    await netEval(host, `E.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'off' }); return 1;`);
    // NATURAL play by default (the level's rooms in order: the host's
    // autopilot takes the Healer's card and the doors, the guest bot fights
    // and picks its own card); --reskip 1 re-enters room 6 whenever it
    // clears (the harsher, spawn-heavy worst case).
    const RESKIP = arg('reskip', '0') === '1';
    const keep = setInterval(() => {
      netEval(host, `for (const m of E.state().party) if (m.hp < m.maxHp * 0.6) E.cmd('setHp', m.id, 1); ${RUNV} if (${RESKIP} && (v.phase !== 'combat' || v.room !== 6)) { if (v.phase === 'reward' || v.phase === 'path' || v.phase === 'combat') E.cmd('skipToRoom', 6); } if (v.phase === 'shop') E.content.world().runSystem().advanceFromShop({ force: true }); return 1;`).catch(() => {});
      netEval(guest, `${RUNV} if (v.phase === 'reward' && v.party && !v.party.cards[${SEAT}].decided) E.content.world().runSystem().partyPick(${SEAT}, 'take'); return 1;`).catch(() => {});
    }, 700);
    await sleep(10000); // warm-up (fulls, the first waves)
    const samples = [];
    const ch0 = await netEval(guest, 'const s = n.stats(); return { ch: s.bytesByChannel || null, bytesIn: s.bytesIn };');
    await netEval(host, 'window.__hist = {}; window.__shp = {}; window.__histOff = E.on("*", (e) => { if (e.type === "sound" || e.predicted || e.view) return; window.__hist[e.type] = (window.__hist[e.type] || 0) + 1; const k = e.type + "|" + Object.keys(e).filter((x) => x !== "tick" && x !== "type").sort().join(","); window.__shp[k] = (window.__shp[k] || 0) + 1; }); return 1;');
    const tEnd = Date.now() + Number(arg('secs', 60)) * 1000;
    let ticks0 = null;
    while (Date.now() < tEnd) {
      const r = await netEval(guest, `const s = n.stats(); const v = E.state().run; return { in: s.bytesInPerSec, out: s.bytesOutPerSec, combat: v.phase === 'combat', room: v.room, act: v.act, ev: E.events.length };`);
      if (Number.isFinite(r.in) && r.act === 3 && r.room >= 6 === RESKIP ? true : r.act === 3) samples.push(r);
      await sleep(500);
    }
    clearInterval(keep);
    const ch1 = await netEval(guest, 'const s = n.stats(); return { ch: s.bytesByChannel || null, bytesIn: s.bytesIn };');
    const hs = await netEval(host, 'const s = n.stats(); return { deltaBytesAvg: s.deltaBytesAvg, deltaHotAvg: s.deltaHotAvg, deltaColdAvg: s.deltaColdAvg, deltaChangedAvg: s.deltaChangedAvg, anchors: s.moverAnchors, entities: E.entityCount };');
    note(`host snapshot split ${JSON.stringify(hs)}`);
    if (arg('coldscan', '0') === '1') {
      const scan = await netEval(host, `
        const flat = (tree) => { const out = {}; const walk = (o, p, d) => { if (p.startsWith('registry.entities')) return; if (d === 5 || o === null || typeof o !== 'object') { out[p] = JSON.stringify(o) ?? ''; return; } for (const k of Object.keys(o)) walk(o[k], p ? p + '.' + k : k, d + 1); }; walk(tree, '', 0); return out; };
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        let prev = flat(E.save.capture()); const st = {};
        for (let i = 0; i < 40; i++) { await wait(50); const cur = flat(E.save.capture()); for (const k of new Set([...Object.keys(cur), ...Object.keys(prev)])) { if (cur[k] !== prev[k]) { const s = st[k] || (st[k] = { n: 0, b: 0 }); s.n += 1; s.b += (cur[k] || '').length; } } prev = cur; }
        return Object.entries(st).sort((a, b) => b[1].b - a[1].b).slice(0, 25).map(([k, v]) => k + ' ' + v.n + 'x ' + Math.round(v.b / v.n) + 'B');`);
      note(`host cold churn (JSON, 40 captures): ${scan.join(' | ')}`);
    }
    const hist = await netEval(host, 'window.__histOff && window.__histOff(); return Object.entries(window.__hist).sort((a, b) => b[1] - a[1]).slice(0, 30);');
    const shp = await netEval(host, 'return Object.entries(window.__shp).sort((a, b) => b[1] - a[1]);');
    {
      const { EVENT_SHAPES } = await import('../src/net/protocol/evshapes.js');
      const known = new Set(EVENT_SHAPES);
      out.unshaped = shp.filter(([k]) => !known.has(k)).slice(0, 60);
      if (arg('shapes', '0') === '1') writeFileSync('captures/gntPARTY-net-shapes.json', JSON.stringify(out.unshaped, null, 1));
    }
    out.bwBreakdown = { ch0, ch1, hist };
    note(`channels ${JSON.stringify(ch0.ch)} -> ${JSON.stringify(ch1.ch)}; host events (top): ${JSON.stringify(hist.slice(0, 18))}`);
    const hostEv = await netEval(host, 'return window.__pe.length;');
    void ticks0;
    void hostEv;
    const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const p95 = (a) => a[Math.min(a.length - 1, Math.floor(a.length * 0.95))];
    const sumUp = (list) => {
      const ins = list.map((x) => x.in).sort((a, b) => a - b);
      const outs = list.map((x) => x.out).sort((a, b) => a - b);
      return { samples: list.length, inAvg: Math.round(avg(ins)), inP95: Math.round(p95(ins) ?? 0), outAvg: Math.round(avg(outs)) };
    };
    const combatOnly = sumUp(samples.filter((x) => x.combat));
    const res = { ...sumUp(samples), combatOnly, rooms: [...new Set(samples.map((x) => x.room))] };
    note(`bandwidth: whole Level 3 window ${JSON.stringify(sumUp(samples))}; combat only ${JSON.stringify(combatOnly)}; rooms ${JSON.stringify(res.rooms)}`);
    out.bandwidth = res;
    check(`Level 3 (${RESKIP ? 'room 6 re-entered' : 'rooms in order'}), four MAX-STRESS builds, guest at ${COND_NAME}: downstream ${(res.inAvg / 1024).toFixed(2)} KB/s avg (<= 12), ${(res.inP95 / 1024).toFixed(2)} KB/s p95 (<= 24), upstream ${(res.outAvg / 1024).toFixed(2)} KB/s (<= 4) over ${res.samples} combat samples`, res.samples >= 60 && res.inAvg <= 12 * 1024 && res.inP95 <= 24 * 1024 && res.outAvg <= 4 * 1024, res);
    const gsx = await netEval(guest, 'const g = n.session.debugGuest(); return { desyncs: g.desyncs, hashChecks: g.hashChecks };');
    check(`0 desyncs over ${gsx.hashChecks} hash checks with four max-stress builds`, gsx.desyncs === 0 && gsx.hashChecks > 0, gsx);
  }

  out.errors = { host: host.errors.slice(0, 5), guest: guest ? guest.errors.slice(0, 5) : [] };
  check('no page errors on either page', host.errors.length === 0 && (!guest || guest.errors.length === 0), out.errors);
} catch (err) {
  check('probe completed', false, String(err && err.stack ? err.stack : err).slice(0, 900));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
mkdirSync('captures', { recursive: true });
writeFileSync(`captures/gntPARTY-net-${TAG}.json`, JSON.stringify(out, null, 1));
console.log(`${out.checks.filter((c) => c.ok).length}/${out.checks.length} checks pass`);
process.exit(fails.length ? 1 : 0);
void sharp;
void pct;
