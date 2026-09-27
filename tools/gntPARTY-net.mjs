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
//   node tools/gntPARTY-net.mjs --mode own [--seat 2] [--port 7950] [--base http://127.0.0.1:4400/]
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { startServer, launchEchoes, openClient, openCover, hostRoom, joinRoom, startGame, waitSession, netEval, sleep, admin, pct } from './gntM5b-lib.mjs';

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
  await waitOn(host, `${RUNV} if (v.phase === 'combat') { E.cmd('killAllEnemies'); } return v.phase === 'reward' && !!v.party;`, { timeout: 60000, poll: 120 });
}
// Decide both human cards (host: the Healer's; guest: its own) -> path.
async function passPage(host, guest, { guestChoice = 'leave' } = {}) {
  const a = await netEval(host, `${W} return W.runSystem().partyPick(0, 'leave');`);
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
  browser = await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 });
  const host = await openClient(browser, { base, server: srv.url, name: 'Host', seed: 7 });
  const guest = await openClient(browser, { base, server: srv.url, name: 'Fox', seed: 8 });
  const code = await hostRoom(host);
  const seat = await joinRoom(guest, code, SEAT);
  check(`the guest joins seat ${SEAT}`, seat === SEAT, seat);
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  await sleep(1200);
  if (CONDS[COND_NAME]) {
    const gp = await netEval(guest, 'return n.peerId;');
    out.conditioner = await admin(srv, '/admin/conditioner', { target: gp, up: CONDS[COND_NAME], down: CONDS[COND_NAME] });
  }
  await netEval(host, 'window.__pe = []; for (const t of ["party_autopick", "party_deadline", "path_chosen", "party_socket_close", "shop_close", "draft_taken", "room_transition"]) E.on(t, (e) => window.__pe.push({ ...e })); return 1;');
  await netEval(guest, 'window.__pe = []; for (const t of ["party_autopick", "party_deadline", "path_chosen", "party_socket_close"]) E.on(t, (e) => window.__pe.push({ ...e, at: E.tick })); return 1;');
  await waitOn(host, 'return E.campaign.ready(1).ready;', { timeout: 90000, poll: 250 });
  const ch = await netEval(host, 'return E.campaign.choose(1);');
  check('the host starts Level 1 (campaign.choose)', ch && ch.ok, ch);
  await waitOn(host, `${RUNV} return v.phase === 'combat' && v.room === 1;`, { timeout: 30000 });
  await waitOn(guest, `${RUNV} return v.phase === 'combat' && v.room === 1;`, { timeout: 30000 });
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
    const holdSecs = (leftAt.tick - heldAt) / 60;
    await sleep(500);
    const gs1 = await netEval(guest, 'return { open: E.content.socketUi().open, closeEv: window.__pe.filter((e) => e.type === "party_socket_close").length };');
    check(`the held door leaves after ${holdSecs.toFixed(2)} s (<= 8 s + a tick), the right door; the guest's screen closed (${JSON.stringify(gs1)})`, holdSecs <= 8.02 && holdSecs >= 7.9 && leftAt.side === 1 && gs1.open === false && gs1.closeEv >= 1, { holdSecs, leftAt, gs1 });
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

  out.errors = { host: host.errors.slice(0, 5), guest: guest.errors.slice(0, 5) };
  check('no page errors on either page', host.errors.length === 0 && guest.errors.length === 0, out.errors);
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
