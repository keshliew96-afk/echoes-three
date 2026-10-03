// gntcparty5 — multiplayer per-character builds by REAL input (critic's own probe).
// Own session server on 7960 (party critic block 7960-7969), host + guest (Swordsman, seat 2) on the dev server.
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep } from './gntM5b-lib.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const port = Number(arg('port', 7960));
const base = arg('base', process.env.GNTC_BASE || 'http://127.0.0.1:5199/');
const SEAT = 2;
const out = { port, base, checks: [], notes: [], pids: [] };
const check = (what, ok, got = null) => { out.checks.push({ what, ok: !!ok, got }); console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ' ' + JSON.stringify(got).slice(0, 600)}`); };
const note = (m, d = null) => { out.notes.push({ m, d }); console.log(`[note] ${m} ${d ? JSON.stringify(d).slice(0, 600) : ''}`); };
async function waitOn(c, src, { timeout = 30000, poll = 80 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { const r = await netEval(c, src).catch(() => null); if (r) return r; await sleep(poll); }
  throw new Error(`${c.name}: timeout ${src.slice(0, 120)}`);
}
const RUNV = 'const v = E.state().run;';
const W = 'const W = E.content.world();';
const cards = (c) => netEval(c, `${RUNV} return v.party ? { opened: v.party.openedTick, deadline: v.party.deadlineTick, owners: v.party.owners, cards: v.party.cards.map((k) => ({ seat: k.seat, type: k.type, id: k.id, swap: k.swap, replace: k.replace, decided: k.decided, choice: k.choice, by: k.by, suggest: k.suggest })) } : null;`);
const builds = (c) => netEval(c, `${W} const P = W.partySystem(); const b = W.cmd ? null : null; const h = E.cmd('buildView'); return { healer: h ? h.skills.map((k) => k.id + ':' + k.sockets.map((x) => (x ? x.node : '-')).join(',')).join('|') + '#' + h.bench.map((x) => x.node).sort().join(',') : null, seats: [1, 2, 3].map((i) => { const v = P.view(i); return v.slots.join(',') + '#' + v.skills.map((k) => k.sockets.map((x) => (x ? x.node : '-')).join(',')).join('|') + '#' + v.bench.map((x) => x.node).sort().join(',') + '#' + v.purse; }) };`);
async function shotC(c, name) { await c.page.screenshot({ path: `captures/${name}.png` }); return name; }
let srv = null; let browser = null;
try {
  srv = await startServer({ port, admin: true });
  out.pids.push(srv.pid);
  browser = await launchEchoes({ gpu: true, background: true, autoplay: true, width: 1280, height: 720, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
  const host = await openClient(browser, { base, server: srv.url, name: 'Host', seed: 7 });
  const guest = await openClient(browser, { base, server: srv.url, name: 'Fox', seed: 8 });
  const code = await hostRoom(host);
  const seat = await joinRoom(guest, code, SEAT);
  check(`guest joined seat ${SEAT}`, seat === SEAT, seat);
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  await sleep(1000);
  for (const c of [host, guest]) await netEval(c, 'window.__pe = []; for (const t of ["party_autopick","party_deadline","party_commit","skill_swapped","ally_cast","aura_pulse","command_rejected","party_pick"]) E.on(t, (e) => window.__pe.push({ ...e, at: E.tick, ms: performance.now() })); return 1;');
  await waitOn(host, 'return E.campaign.ready(1).ready;', { timeout: 90000, poll: 250 });
  await netEval(host, 'return E.campaign.choose(1);');
  await waitOn(host, `${RUNV} return v.phase === 'combat' && v.room === 1;`, { timeout: 30000 });
  await waitOn(guest, `${RUNV} return v.phase === 'combat' && v.room === 1;`, { timeout: 30000 });
  await sleep(1500);
  // ---------------- casts by REAL keys on the guest seat (starting kit) ----------------
  await guest.page.bringToFront();
  const kit = await netEval(guest, `${W} return W.partySystem().slots(${SEAT});`);
  note('guest seat loadout (room 1)', kit);
  for (let k = 0; k < 4; k++) {
    // aim at the nearest hostile on the guest's screen
    const aim = await netEval(guest, `${W} const reg = W.registry ? W.registry : null; const me = E.state().party ? E.state().party[${SEAT}] : null; return me;`);
    await netEval(guest, 'E.audio.cueLogClear && E.audio.cueLogClear(); return 1;');
    const hBefore = await netEval(host, 'return window.__pe.length;');
    await guest.page.mouse.move(640 + 60, 360 - 40);
    const t0 = Date.now();
    await guest.page.keyboard.press(String(k + 1));
    await sleep(700);
    const hev = await netEval(host, `return window.__pe.slice(${hBefore}).filter((e) => e.type === 'ally_cast' && e.partyIndex === ${SEAT}).map((e) => ({ skill: e.skill, inputSeq: e.inputSeq, tick: e.at }));`);
    const cues = await netEval(guest, 'return E.audio.cueLog ? E.audio.cueLog(20) : null;');
    check(`guest key ${k + 1} (${kit[k]}) -> host ally_cast seat ${SEAT} skill ${kit[k]} with an inputSeq`, hev.some((e) => e.skill === kit[k] && e.inputSeq !== undefined), { hev, cues: (cues || []).slice(-4) });
    note(`guest cue log after key ${k + 1}`, (cues || []).slice(-4));
    await sleep(Math.max(0, 900 - (Date.now() - t0)));
  }
  await shotC(guest, 'gntfixPARTY5-mp-guest-combat');
  // ---------------- page 1: ownership by real UI input ----------------
  await netEval(host, 'E.cmd("killAllEnemies"); return 1;');
  await waitOn(host, `${RUNV} return v.phase === 'reward' && !!v.party;`, { timeout: 20000 });
  await waitOn(guest, `${RUNV} return v.phase === 'reward' && !!v.party && E.runUi().screen === 'draft';`, { timeout: 20000 });
  const openedAt = Date.now();
  await sleep(1300);
  const p0 = await cards(host);
  note('page 1 host cards', p0);
  check('owners on the host = [human, ai, human, ai]', JSON.stringify(p0.owners) === JSON.stringify(['human', 'ai', 'human', 'ai']), p0.owners);
  check('a 30 s deadline is armed with 2 humans', p0.deadline && p0.deadline - p0.opened === 1800, p0);
  await shotC(guest, 'gntfixPARTY5-mp-guest-page-own');
  await shotC(host, 'gntfixPARTY5-mp-host-page');
  // guest views the Tank's tab (AI-held, the host's) and tries S / X / Enter
  await guest.page.bringToFront();
  await guest.page.keyboard.press('F2'); await sleep(400);
  const gv1 = await netEval(guest, 'return E.runUi().draft ? E.runUi().draft.viewSeat : null;');
  await shotC(guest, 'gntfixPARTY5-mp-guest-page-tank');
  await guest.page.keyboard.press('KeyS'); await sleep(250);
  await guest.page.keyboard.press('KeyX'); await sleep(400);
  const p1 = await cards(host);
  check(`guest real keys on the Tank tab (viewSeat ${gv1}) change nothing on the host (seat 1 card before ${JSON.stringify(p0.cards[1])} after ${JSON.stringify(p1.cards[1])})`, JSON.stringify(p0.cards[1]) === JSON.stringify(p1.cards[1]), { before: p0.cards[1], after: p1.cards[1] });
  const gText = await netEval(guest, 'const r = document.querySelector(".rn-draft"); return r ? r.innerText.replace(/\\s+/g, " ").slice(0, 600) : null;');
  note('guest page text on the Tank tab', gText);
  // host tries the guest's tab by real keys
  await host.page.bringToFront();
  await host.page.keyboard.press('F3'); await sleep(400);
  await host.page.keyboard.press('KeyS'); await sleep(250);
  await host.page.keyboard.press('KeyX'); await sleep(400);
  const p2 = await cards(host);
  check(`host real keys on the guest's Swordsman tab change nothing (seat 2 card ${JSON.stringify(p0.cards[2])} -> ${JSON.stringify(p2.cards[2])})`, JSON.stringify(p0.cards[2]) === JSON.stringify(p2.cards[2]), { before: p0.cards[2], after: p2.cards[2] });
  // host builds an AI seat: Archer tab, move the Replaces mark by S
  await host.page.keyboard.press('F4'); await sleep(400);
  await host.page.keyboard.press('KeyS'); await sleep(400);
  const p3 = await cards(host);
  check(`host real S on the AI-held Archer tab moves its Replaces mark (${p0.cards[3].replace} -> ${p3.cards[3].replace}) [only if a swap card]`, p0.cards[3].type !== 'skill' || !p0.cards[3].swap || p3.cards[3].replace !== p0.cards[3].replace, { before: p0.cards[3], after: p3.cards[3] });
  // guest decides its own card by real input: own tab, S, Enter
  await guest.page.bringToFront();
  await guest.page.keyboard.press('F3'); await sleep(400);
  const own0 = (await cards(host)).cards[2];
  await guest.page.keyboard.press('KeyS'); await sleep(400);
  const own1 = (await cards(host)).cards[2];
  const gOwn1 = await netEval(guest, `${RUNV} const c = v.party.cards[${SEAT}]; return { replace: c.replace, decided: c.decided, choice: c.choice };`);
  note('guest own card after S (host view / guest view)', { own0, own1, gOwn1 });
  const slotsBefore = await netEval(host, `${W} return W.partySystem().slots(${SEAT});`);
  await guest.page.keyboard.press('Enter'); await sleep(900);
  const own2 = (await cards(host)) || null;
  note('host cards after guest Enter', own2);
  // host commits its own card with Enter (the Healer's) — press Enter until the page closes
  await host.page.bringToFront();
  await host.page.keyboard.press('F1'); await sleep(300);
  for (let i = 0; i < 5; i++) { const s = await netEval(host, 'return E.runUi().screen;'); if (s !== 'draft') break; await host.page.keyboard.press('Enter'); await sleep(700); }
  await waitOn(host, `${RUNV} return v.phase !== 'reward';`, { timeout: 40000 });
  const commitMs = Date.now() - openedAt;
  const slotsAfter = await netEval(host, `${W} return W.partySystem().slots(${SEAT});`);
  const wantId = own0.id;
  const wantSlot = gOwn1.replace;
  check(`guest's own swap by real keys: ${wantId} lands in the slot the guest chose (${wantSlot}) — before ${JSON.stringify(slotsBefore)} after ${JSON.stringify(slotsAfter)}`, own0.type !== 'skill' || !own0.swap || slotsAfter[wantSlot] === wantId, { own0, gOwn1, slotsBefore, slotsAfter });
  note('page 1 committed after ms', commitMs);
  await sleep(800);
  const bh = await builds(host); const bg = await builds(guest);
  check('builds replicate after page 1 commit (host == guest, all four)', JSON.stringify(bh) === JSON.stringify(bg), { bh, bg });
  // ---------------- door + room 2 + stalled guest page ----------------
  await waitOn(host, `${RUNV} return v.phase === 'path';`, { timeout: 20000 }).catch(() => null);
  await netEval(host, `${W} return W.runSystem().choosePath(0);`).catch(() => null);
  await waitOn(host, `${RUNV} return v.phase === 'combat' || v.phase === 'shop';`, { timeout: 30000 });
  await sleep(1500);
  await netEval(host, 'E.cmd("killAllEnemies"); return 1;');
  await waitOn(host, `${RUNV} return v.phase === 'reward' && !!v.party;`, { timeout: 30000 });
  const pS = await cards(host);
  const tOpen = Date.now();
  // host decides its own + leaves the rest; guest stalls (never answers)
  await host.page.bringToFront();
  await host.page.keyboard.press('Enter'); await sleep(500);
  const hostTickOpen = pS.opened;
  await waitOn(host, `${RUNV} return v.phase !== 'reward';`, { timeout: 45000, poll: 50 });
  const stallMs = Date.now() - tOpen;
  const ap = await netEval(host, 'return window.__pe.filter((e) => e.type === "party_autopick" || e.type === "party_commit").slice(-4);');
  const apTick = (ap.find((e) => e.type === 'party_autopick') || {}).at;
  const toastsH = await netEval(host, 'return E.app.toasts ? E.app.toasts().slice(-5).map((t) => t.text || t.message || JSON.stringify(t)) : null;');
  const toastsG = await netEval(guest, 'return E.app.toasts ? E.app.toasts().slice(-5).map((t) => t.text || t.message || JSON.stringify(t)) : null;');
  check(`stalled guest: page commits at the 30 s deadline (autopick at tick ${apTick}, opened ${hostTickOpen}: ${apTick - hostTickOpen} ticks; wall ${stallMs} ms)`, apTick && Math.abs(apTick - hostTickOpen - 1800) <= 30, { ap, stallMs });
  check('stalled guest: a notice toast on host and guest', (toastsH || []).length && (toastsG || []).length, { toastsH, toastsG });
  note('toasts', { toastsH, toastsG });
  await sleep(800);
  const bh2 = await builds(host); const bg2 = await builds(guest);
  check('builds replicate after the timed-out page (host == guest)', JSON.stringify(bh2) === JSON.stringify(bg2), { bh2, bg2 });
  // ---------------- rejoin keeps the build ----------------
  const before = bh2.seats[SEAT - 1];
  await guest.page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(3000);
  const rj = await netEval(guest, `return n.join ? n.join(${JSON.stringify(code)}, ${SEAT}) : null;`).catch((e) => String(e));
  note('guest rejoin', rj);
  await sleep(6000);
  const bh3 = await builds(host);
  check(`guest drop + rejoin keeps seat ${SEAT}'s build on the host`, bh3.seats[SEAT - 1] === before, { before, after: bh3.seats[SEAT - 1] });
  const gs = await netEval(host, 'return n.session ? n.session.status() : null;').catch(() => null);
  note('host session after rejoin', gs);
} catch (e) {
  check('probe ran to completion', false, String(e.stack || e).slice(0, 800));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
  writeFileSync('captures/gntfixPARTY5-mp.json', JSON.stringify(out, null, 1));
  console.log(`checks ${out.checks.filter((c) => c.ok).length}/${out.checks.length}`);
}
