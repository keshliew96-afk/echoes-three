#!/usr/bin/env node
// gntM5b-races — race conditions in network PLAY (PLAN §7 G5b.7). Owner: M5b.
//
// Host + guest pages (own windows, multi-page profile) on our own session
// server, plus Node bots:
//   R1 same-moment interact  the Healer (host) and the guest's Tank stand at one
//                            single-use Dewfont and press E together (trusted
//                            keys, Promise.all) x5 -> exactly ONE `interact`
//                            per asset on the host; the loser's press is a
//                            denial / nothing; a guest prediction for a lost
//                            race is retracted, a won one confirmed.
//   R2 build picks           the guest clicks a draft card (real mouse) while
//                            the host takes a reward -> the guest's pick is
//                            refused (command_rejected + a party-wide ping),
//                            the host's pick applies once, both pages move on
//                            together; the same for a door on the path page.
//   R3 last-seat join race   two Node bots join the last free seat of the
//                            running room at the same moment x5 -> exactly one
//                            seat, the other `full`; the host sees one join.
//   R4 simultaneous pause    Esc on host and guest together -> both menus
//                            open, the host sim keeps 60 ticks/s, the guest
//                            keeps applying snapshots; Esc closes both.
//   node tools/gntM5b-races.mjs [--port 7827] [--base http://127.0.0.1:5199/]
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep } from './gntM5b-lib.mjs';
import { createGuestBot } from './gntM5a-botlib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const opt = { port: Number(arg('port', 7827)), base: arg('base', 'http://127.0.0.1:5199/'), out: arg('out', 'captures/gntM5b-races.json') };
const report = { schema: 'echoes-gntM5b-races/1', startedAt: new Date().toISOString(), opt, races: {}, gates: {} };
const log = (m) => console.log(`[races] ${m}`);

let srv = null;
let browser = null;
const bots = [];
try {
  srv = await startServer({ port: opt.port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, width: 1100, height: 620 });
  const host = await openClient(browser, { base: opt.base, server: srv.url, name: 'Host', seed: 7, w: 1100, h: 620 });
  const guest = await openClient(browser, { base: opt.base, server: srv.url, name: 'Racer', seed: 8, w: 1100, h: 620 });
  const code = await hostRoom(host);
  const seat = await joinRoom(guest, code, 1);
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  const version = await host.page.evaluate(() => window.__echoes.version);
  await host.page.evaluate(() => {
    const E = window.__echoes;
    E.cmd('startRun', { act: 1 });
    // Host-side event log for the probes.
    const L = (window.__gntRace = { ev: [] });
    for (const t of ['interact', 'interact_denied', 'draft_taken', 'reward_offer', 'path_chosen', 'seat_control', 'room_start']) E.on(t, (ev) => L.ev.push({ ...ev, type: t }));
  });
  await sleep(2500);
  const seatId = await host.page.evaluate((s) => (window.__echoes.state().party.find((m) => m.partyIndex === s) || {}).id, seat);

  // ---- R1 same-moment interact --------------------------------------------
  {
    const trials = [];
    // Interactables only work in COMBAT (between rooms they are dormant):
    // the room is kept open by one very sturdy enemy parked far away.
    let keeper = null;
    for (let i = 0; i < 5; i++) {
      keeper = await host.page.evaluate((kid) => {
        const E = window.__echoes;
        const s = E.state();
        if (s.run.phase !== 'combat') return kid;
        const alive = (s.enemies || []).filter((e) => e.hp > 0);
        let k = alive.find((e) => e.id === kid) ? kid : null;
        if (k === null) k = E.cmd('spawn', 'mantis', -6.5, -4.5, { hpMul: 400 });
        for (const e of alive) if (e.id !== k) E.cmd('setHp', e.id, 0);
        return k;
      }, keeper);
      // A fresh spot each trial (a spent Dewfont nearer than the new one would
      // take the presses): the guest walks ~1.7 u by real keys first.
      if (i > 0) {
        await guest.page.bringToFront();
        const k = ['KeyW', 'KeyD', 'KeyS', 'KeyS'][i - 1];
        await guest.page.keyboard.down(k);
        await sleep(650);
        await guest.page.keyboard.up(k);
        await sleep(500);
      }
      // Park the Healer beside the guest's body, a fresh single-use Dewfont
      // between them (both within reach), no Downed ally near.
      const setup = await host.page.evaluate((id) => {
        const E = window.__echoes;
        const s = E.state();
        const g = s.party.find((m) => m.id === id);
        E.cmd('setHp', id, 1);
        const p = E.cmd('teleport', g.x + 0.9, g.z);
        const ix = E.cmd('spawnInteractable', 'dewfont', g.x + 0.45, g.z);
        return { ix, g: { x: g.x, z: g.z }, p };
      }, seatId);
      await sleep(900); // the asset + the new Healer spot reach the guest's replica
      await host.page.evaluate(() => (window.__gntRace.ev.length = 0));
      const g0 = await netEval(guest, 'const s = n.stats(); return { predicted: s.predictedActions, confirmed: s.confirmedActions, retractions: s.retractions };');
      const phaseAt = await host.page.evaluate(() => window.__echoes.state().run.phase);
      await Promise.all([host.page.keyboard.press('KeyE'), guest.page.keyboard.press('KeyE')]);
      await sleep(1200);
      const ev = await host.page.evaluate(() => window.__gntRace.ev.filter((e) => e.type === 'interact' || e.type === 'interact_denied'));
      const g1 = await netEval(guest, 'const s = n.stats(); return { predicted: s.predictedActions, confirmed: s.confirmedActions, retractions: s.retractions };');
      const uses = ev.filter((e) => e.type === 'interact' && e.id === setup.ix);
      trials.push({ phase: phaseAt, ix: setup.ix, uses: uses.length, by: uses.map((u) => u.by), denied: ev.filter((e) => e.type === 'interact_denied').length, guestPred: g1.predicted - g0.predicted, guestConfirmed: g1.confirmed - g0.confirmed, guestRetracted: g1.retractions - g0.retractions, guestWon: uses.some((u) => u.by === seatId) });
    }
    const pass = trials.every((t) => t.uses === 1 && (t.guestPred === 0 || (t.guestWon ? t.guestConfirmed >= 1 : t.guestRetracted >= 1)));
    report.races.R1_interact = { trials, pass };
    log(`R1 ${JSON.stringify(report.races.R1_interact)}`);
  }

  // ---- R2 build picks while the host applies --------------------------------
  {
    await host.page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
    const t0 = Date.now();
    let phase = null;
    while (Date.now() - t0 < 20000) {
      phase = await host.page.evaluate(() => window.__echoes.state().run.phase);
      if (phase !== 'combat') break;
      await host.page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
      await sleep(500);
    }
    await sleep(1500); // the guest's replica shows the page
    const g0 = await netEval(guest, 'const s = n.stats(); return { rejected: s.rejectedPicks, desyncs: s.desyncs, phase: E.state().run.phase };');
    const note0 = await guest.page.evaluate(() => (document.querySelector('.nt-guest-note') || {}).textContent || null);
    const cards = await guest.page.evaluate(() => [...document.querySelectorAll('.rn-take')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
    const hostPicks0 = await host.page.evaluate(() => ({ run: window.__echoes.state().run.phase, skills: window.__echoes.state().skills.map((s) => s && s.id), bench: (window.__echoes.state().build.bench || []).length }));
    // The guest clicks Take while the host takes the reward.
    await Promise.all([cards[0] ? guest.page.mouse.click(cards[0].x, cards[0].y) : Promise.resolve(), host.page.evaluate(() => window.__echoes.cmd('draftTake'))]);
    await sleep(1500);
    const hostPicks1 = await host.page.evaluate(() => ({ run: window.__echoes.state().run.phase, skills: window.__echoes.state().skills.map((s) => s && s.id), bench: (window.__echoes.state().build.bench || []).length, taken: window.__gntRace.ev.filter((e) => e.type === 'draft_taken').length }));
    const g1 = await netEval(guest, 'const s = n.stats(); return { rejected: s.rejectedPicks, desyncs: s.desyncs, phase: E.state().run.phase, pings: n.session.pings().length };');
    const hostPings = await netEval(host, 'return n.session.pings().length;');
    // Path page: the guest points at a door (a ping, never a choice), the host chooses.
    let path = null;
    if (hostPicks1.run === 'path') {
      const doors = await guest.page.evaluate(() => [...document.querySelectorAll('.rn-door')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
      const p0 = await netEval(guest, 'const s = n.stats(); return { rejected: s.rejectedPicks, phase: E.state().run.phase };');
      if (doors[0]) await guest.page.mouse.click(doors[0].x, doors[0].y);
      await sleep(400);
      const hostPhaseAfterGuestClick = await host.page.evaluate(() => window.__echoes.state().run.phase);
      await host.page.evaluate(() => window.__echoes.cmd('pathChoose', 0));
      await sleep(1500);
      const p1 = await netEval(guest, 'const s = n.stats(); return { rejected: s.rejectedPicks, phase: E.state().run.phase, desyncs: s.desyncs };');
      const hp = await host.page.evaluate(() => window.__echoes.state().run.phase);
      path = { doors: doors.length, guestBefore: p0, hostPhaseAfterGuestClick, guestAfter: p1, hostAfter: hp };
    }
    const res = { hostPhase0: phase, guestNote: note0, cards: cards.length, guestBefore: g0, guestAfter: g1, hostBefore: hostPicks0, hostAfter: hostPicks1, hostPings, path };
    res.pass = cards.length > 0 && g1.rejected === g0.rejected + 1 && hostPicks1.taken === 1 && g1.phase === hostPicks1.run && g1.desyncs === 0 && hostPings >= 1 && (!path || (path.hostPhaseAfterGuestClick === 'path' && path.guestAfter.phase === path.hostAfter && path.guestAfter.desyncs === 0));
    report.races.R2_picks = res;
    log(`R2 ${JSON.stringify(res)}`);
  }

  // ---- R3 last-seat join race -----------------------------------------------
  {
    const filler = createGuestBot({ server: srv.url, name: 'Filler', version });
    const fr = await filler.net.join(code, 2);
    bots.push(filler);
    const trials = [];
    for (let i = 0; i < 5; i++) {
      const a = createGuestBot({ server: srv.url, name: `RaceA${i}`, version });
      const b = createGuestBot({ server: srv.url, name: `RaceB${i}`, version });
      bots.push(a, b);
      await host.page.evaluate(() => (window.__gntRace.ev.length = 0));
      const [ra, rb] = await Promise.all([a.net.join(code), b.net.join(code)]);
      await sleep(1500);
      const joins = await host.page.evaluate(() => window.__gntRace.ev.filter((e) => e.type === 'seat_control' && e.controller === 'human' && e.partyIndex === 3));
      const room = await netEval(host, 'return n.room.seats.map((s) => ({ i: s.index, name: s.peerId ? s.name : null }));');
      const winners = [ra, rb].filter((r) => r && r.ok);
      trials.push({ a: ra && (ra.ok ? `seat ${ra.seat}` : ra.reason), b: rb && (rb.ok ? `seat ${rb.seat}` : rb.reason), winners: winners.length, seat3: room.find((s) => s.i === 3).name, hostJoins: joins.length });
      // The winner leaves: the seat is free again for the next trial.
      for (const x of [a, b]) x.stop();
      await sleep(1200);
    }
    const pass = fr && fr.ok && trials.every((t) => t.winners === 1 && [t.a, t.b].some((x) => /full/.test(String(x))) && t.hostJoins <= 1);
    report.races.R3_last_seat = { filler: fr && fr.ok ? fr.seat : fr, trials, pass };
    log(`R3 ${JSON.stringify(report.races.R3_last_seat)}`);
  }

  // ---- R4 simultaneous pause --------------------------------------------------
  {
    const t0 = await host.page.evaluate(() => window.__echoes.tick);
    const ga0 = await guest.page.evaluate(() => window.__echoes.net.session.debugGuest().replica.appliedTick);
    await host.page.bringToFront();
    await Promise.all([host.page.keyboard.press('Escape'), guest.page.keyboard.press('Escape')]);
    await sleep(3000);
    const t1 = await host.page.evaluate(() => window.__echoes.tick);
    const ga1 = await guest.page.evaluate(() => window.__echoes.net.session.debugGuest().replica.appliedTick);
    const menus = await Promise.all([host, guest].map((c) => c.page.evaluate(() => ({ overlay: window.__echoes.app.overlay, simPaused: window.__echoes.app.simPaused(), stack: window.__echoes.app.stack() }))));
    await Promise.all([host.page.keyboard.press('Escape'), guest.page.keyboard.press('Escape')]);
    await sleep(800);
    const after = await Promise.all([host, guest].map((c) => c.page.evaluate(() => ({ overlay: window.__echoes.app.overlay, simPaused: window.__echoes.app.simPaused() }))));
    const res = { hostTicksPerSec: Math.round(((t1 - t0) / 3) * 10) / 10, guestAppliedTicks: ga1 - ga0, menus, after };
    res.pass = res.hostTicksPerSec >= 57 && res.guestAppliedTicks >= 150 && menus.every((m) => m.simPaused === false);
    report.races.R4_pause = res;
    log(`R4 ${JSON.stringify(res)}`);
  }
  const gs = await netEval(guest, 'const s = n.stats(); return { desyncs: s.desyncs, hashChecks: s.hashChecks, refusedEmits: E.busCounters.refusedEmits };');
  report.guestEnd = gs;
  report.pageErrors = [...host.errors, ...guest.errors].slice(0, 10);
  for (const [k, v] of Object.entries(report.races)) report.gates[k] = v.pass;
  report.gates.desyncs0 = gs.desyncs === 0;
  report.gates.pageErrors0 = report.pageErrors.length === 0;
} catch (err) {
  report.crash = String(err && err.stack ? err.stack : err);
  console.error(report.crash);
} finally {
  for (const b of bots) {
    try {
      b.stop();
    } catch {
      /* gone */
    }
  }
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
writeFileSync(opt.out, JSON.stringify(report, null, 1));
log(`gates ${JSON.stringify(report.gates)}`);
log(`-> ${opt.out}`);
process.exit(report.crash ? 1 : 0);
