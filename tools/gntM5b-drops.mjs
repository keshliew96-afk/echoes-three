#!/usr/bin/env node
// gntM5b-drops — connection drop-offs in network PLAY (PLAN §7 G5b.6).
// Owner: M5b.
//
// Three game pages (host + 2 guests, each its own window, multi-page
// profile) on a session server of our own (--admin), a real combat room,
// every scenario timed from Node at 100 ms resolution:
//   A guest-close      admin drop {close, 4 s}: the socket dies and the server
//                      refuses the identity for 4 s -> the client's backoff
//                      reconnect -> full snapshot -> control. Gate: full state
//                      AND control within 3 s of link restoration.
//   B guest-blackhole  admin drop {blackhole, 7 s}: silence -> the server drops
//                      the seat at 5 s (AI plays it) -> link back -> same gate.
//   C host-blackhole   admin drop {blackhole, 5 s} on the HOST: > 3 s silence ->
//                      guests freeze ("Host connection lost — waiting") -> the
//                      host is back inside the 10 s grace -> resume.
//   D host-kill        admin kill-host: grace 10 s -> migration to the lowest-
//                      RTT guest (G2's link carries +60 ms so G1 is chosen) ->
//                      become_host with a keyframe <= 2 s old, the other guest
//                      re-baselines. Gate: migration <= 5 s after the grace,
//                      state age <= 2 s; the killed host ends on the title.
//   E server-kill      the server process is killed: every client ends on the
//                      title with "Connection to the server was lost", then a
//                      New Game proves single-player intact.
//   node tools/gntM5b-drops.mjs [--port 7824] [--base http://127.0.0.1:5199/] [--only A,B,C,D,E]
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep, admin, holdKeys } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const opt = { port: Number(arg('port', 7824)), base: arg('base', 'http://127.0.0.1:5199/'), only: String(arg('only', 'A,B,C,D,E')).split(','), out: arg('out', 'captures/gntM5b-drops.json') };
const report = { schema: 'echoes-gntM5b-drops/1', startedAt: new Date().toISOString(), opt, scenarios: {}, gates: {} };
const log = (m) => console.log(`[drops] ${m}`);

// One status line per page (cheap): net state, session role / sync / frozen,
// replica full snapshots, the HUD banner, app state, host human seats.
const probe = (c) =>
  netEval(
    c,
    `const s = n.session ? n.session.status() : null; const st = n.stats();
     const hud = document.querySelector('#nt-hud .nt-banner');
     return { t: Date.now(), net: n.state, role: s ? s.role : null, synced: s ? s.synced : null, frozen: s ? s.frozen : null,
       full: st.fullSnapshots ?? null, snaps: st.snapshots ?? null, applied: (n.session && n.session.debugGuest() && n.session.debugGuest().replica.appliedTick) ?? null,
       humans: st.humanSeats ?? null, banner: hud && !hud.classList.contains('nt-off') ? hud.textContent : null, app: E.app ? E.app.state : null,
       seat: n.seat, tick: E.tick, migration: st.migration ?? null, reconnects: st.reconnects ?? 0, lastReconnectMs: st.lastReconnectMs ?? null };`
  ).catch((e) => ({ t: Date.now(), error: String(e && e.message).slice(0, 120) }));

async function watch(pages, ms, until = null) {
  const rows = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = await Promise.all(pages.map((p) => probe(p)));
    rows.push(r);
    if (until && until(r, rows)) break;
    await sleep(100);
  }
  return rows;
}
const firstAt = (rows, i, pred) => {
  for (const r of rows) if (r[i] && pred(r[i])) return r[i].t;
  return null;
};

let srv = null;
let browser = null;
const pages = [];
try {
  srv = await startServer({ port: opt.port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, width: 960, height: 540 });
  for (const [name, seed] of [['Host', 7], ['G1', 8], ['G2', 9]]) pages.push(await openClient(browser, { base: opt.base, server: srv.url, name, seed, w: 960, h: 540 }));
  const [host, g1, g2] = pages;
  log('pages up');
  const code = await hostRoom(host);
  g1.seat = await joinRoom(g1, code, 1);
  g2.seat = await joinRoom(g2, code, 2);
  log(`room ${code}: seats ${g1.seat} ${g2.seat}`);
  await startGame(host, [g1, g2]);
  await waitSession(pages, 30000);
  log('session synced');
  // A real combat room on the host (the autopilot plays the Healer).
  await host.page.evaluate(() => {
    const E = window.__echoes;
    E.cmd('startRun', { act: 1 });
    E.cmd('autopilot', true);
  });
  await sleep(4000);
  const peerOf = (c) => netEval(c, 'return n.peerId;');
  const seatX = (seat) => host.page.evaluate((s) => {
    const m = window.__echoes.state().party.find((x) => x.partyIndex === s);
    return m ? m.x : null;
  }, seat);

  // ---- A / B: guest drop + reconnect ------------------------------------
  async function guestDrop(key, c, mode, forMs) {
    const pid = await peerOf(c);
    const tDrop = Date.now();
    const r = await admin(srv, '/admin/drop', { peerId: pid, mode, forMs });
    const tRestore = tDrop + forMs;
    let full0 = null;
    const rows = await watch([host, c], forMs + 9000, (r2) => {
      if (full0 === null) full0 = r2[1].full ?? 0;
      return r2[1].net === 'guest' && r2[1].synced && (r2[1].full ?? 0) > full0 && Date.now() > tRestore + 300 && (r2[0].humans || []).includes(c.seat);
    });
    const tDropSeen = firstAt(rows, 1, (s) => s.net === 'reconnecting');
    const tAiSeat = firstAt(rows, 0, (s) => Array.isArray(s.humans) && !s.humans.includes(c.seat));
    const tBack = firstAt(rows.filter((x) => x[1].t > tRestore), 1, (s) => s.net === 'guest');
    // Full state: the guest applied a FULL snapshot after the link came back.
    const tFull = firstAt(rows.filter((x) => x[1].t > tRestore), 1, (s) => (s.full ?? 0) > full0 && s.synced);
    const tControl = firstAt(rows.filter((x) => x[0].t > tRestore), 0, (s) => Array.isArray(s.humans) && s.humans.includes(c.seat));
    // Control proven by real keys: D held 600 ms moves the seat east on the host.
    const x0 = await seatX(c.seat);
    await c.page.bringToFront();
    await holdKeys(c, ['KeyD'], 600);
    await sleep(700);
    const x1 = await seatX(c.seat);
    const banners = [...new Set(rows.map((x) => x[1].banner).filter(Boolean))].slice(0, 6);
    const res = {
      admin: r,
      mode,
      forMs,
      dropSeenMs: tDropSeen ? tDropSeen - tDrop : null,
      aiTookSeatMs: tAiSeat ? tAiSeat - tDrop : null,
      reconnectedAfterRestoreMs: tBack ? tBack - tRestore : null,
      fullStateAfterRestoreMs: tFull ? tFull - tRestore : null,
      controlAfterRestoreMs: tControl ? tControl - tRestore : null,
      movedByKeysAfter: x0 !== null && x1 !== null ? Math.round((x1 - x0) * 100) / 100 : null,
      guestBanners: banners,
    };
    res.pass = res.fullStateAfterRestoreMs !== null && res.fullStateAfterRestoreMs <= 3000 && res.controlAfterRestoreMs !== null && res.controlAfterRestoreMs <= 3000 && res.movedByKeysAfter > 0.5;
    report.scenarios[key] = res;
    log(`${key}: ${JSON.stringify(res)}`);
  }
  log('scenarios');
  if (opt.only.includes('A')) await guestDrop('A_guest_close', g1, 'close', 4000);
  if (opt.only.includes('B')) await guestDrop('B_guest_blackhole', g2, 'blackhole', 7000);

  // ---- C: host blackhole inside the grace -> resume ----------------------
  if (opt.only.includes('C')) {
    const pid = await peerOf(host);
    const tDrop = Date.now();
    const r = await admin(srv, '/admin/drop', { peerId: pid, mode: 'blackhole', forMs: 5000 });
    const rows = await watch([host, g1, g2], 16000, (x) => Date.now() > tDrop + 6000 && x[1].net === 'guest' && !x[1].frozen && x[2].net === 'guest' && !x[2].frozen && x[0].net === 'host');
    const tFrozen = firstAt(rows, 1, (s) => s.frozen);
    const tResume = firstAt(rows.filter((x) => x[1].t > tDrop + 5000), 1, (s) => !s.frozen && s.net === 'guest');
    const t1 = rows.find((x) => x[1].t > tDrop + 5000 && !x[1].frozen);
    const res = {
      admin: r,
      guestFrozeAfterMs: tFrozen ? tFrozen - tDrop : null,
      resumedAfterRestoreMs: tResume ? tResume - (tDrop + 5000) : null,
      hostStillHost: rows[rows.length - 1][0].net === 'host',
      banners: [...new Set(rows.map((x) => x[1].banner).filter(Boolean))].slice(0, 6),
      g1AppliedTickAdvances: t1 ? (await probe(g1)).applied > (t1[1].applied ?? 0) : null,
    };
    res.pass = res.guestFrozeAfterMs !== null && res.resumedAfterRestoreMs !== null && res.resumedAfterRestoreMs <= 3000 && res.hostStillHost;
    report.scenarios.C_host_blackhole = res;
    log(`C: ${JSON.stringify(res)}`);
  }

  // ---- D: kill-host -> grace -> migration --------------------------------
  if (opt.only.includes('D')) {
    // G2's link carries +60 ms so the lowest-RTT guest is G1 (deterministic).
    await admin(srv, '/admin/conditioner', { target: await peerOf(g2), up: 'lat30', down: 'lat30' });
    await sleep(3000);
    const tKill = Date.now();
    const r = await admin(srv, '/admin/kill-host', { code });
    const rows = await watch([host, g1, g2], 24000, (x) => x[1].net === 'host' && x[2].net === 'guest' && x[2].synced && !x[2].frozen && Date.now() > tKill + 10500);
    const tLost = firstAt(rows, 1, (s) => s.frozen);
    const tBecome = firstAt(rows, 1, (s) => s.net === 'host' || s.role === 'host');
    const tOtherSynced = tBecome ? firstAt(rows.filter((x) => x[2].t > tBecome), 2, (s) => s.synced && !s.frozen && s.net === 'guest') : null;
    await sleep(2500);
    const g1s = await netEval(g1, 'const s = n.stats(); return { migration: s.migration, role: s.session, playerController: s.playerController, humanSeats: s.humanSeats, hostNetMsP95: s.hostNetMsP95 };');
    const g2s = await netEval(g2, 'const s = n.stats(); return { desyncs: s.desyncs, hashChecks: s.hashChecks, synced: s.synced, frozen: s.frozen };');
    const hostEnd = await probe(host);
    const toast = await host.page.evaluate(() => JSON.stringify(window.__echoes.app.toasts()));
    // The migrated session keeps playing: G2 walks by real keys on the NEW host.
    const x0 = await g1.page.evaluate(() => (window.__echoes.state().party.find((m) => m.partyIndex === 2) || {}).x);
    await g2.page.bringToFront();
    await holdKeys(g2, ['KeyA'], 600);
    await sleep(800);
    const x1 = await g1.page.evaluate(() => (window.__echoes.state().party.find((m) => m.partyIndex === 2) || {}).x);
    const res = {
      admin: r,
      guestsFrozeAfterMs: tLost ? tLost - tKill : null,
      becomeHostAfterMs: tBecome ? tBecome - tKill : null,
      migrationAfterGraceMs: tBecome ? tBecome - tKill - 10000 : null,
      otherGuestResyncedAfterBecomeMs: tOtherSynced && tBecome ? tOtherSynced - tBecome : null,
      newHost: g1s,
      otherGuest: g2s,
      oldHost: { net: hostEnd.net, app: hostEnd.app, toast },
      g2MovedOnNewHost: x0 !== undefined && x1 !== undefined ? Math.round((x1 - x0) * 100) / 100 : null,
      banners: [...new Set(rows.map((x) => x[2].banner).filter(Boolean))].slice(0, 6),
    };
    const m = g1s.migration || {};
    res.pass =
      res.becomeHostAfterMs !== null &&
      res.becomeHostAfterMs >= 9500 &&
      res.migrationAfterGraceMs <= 5000 &&
      m.applied === true &&
      Number.isFinite(m.stateAgeMs) &&
      m.stateAgeMs <= 2000 &&
      res.otherGuestResyncedAfterBecomeMs !== null &&
      res.otherGuestResyncedAfterBecomeMs <= 5000 &&
      g1s.playerController === 'ai' &&
      res.g2MovedOnNewHost < -0.5 &&
      res.oldHost.app !== 'playing';
    report.scenarios.D_host_kill = res;
    log(`D: ${JSON.stringify(res)}`);
  }

  // ---- E: server kill ----------------------------------------------------
  if (opt.only.includes('E')) {
    const live = opt.only.includes('D') ? [g1, g2] : [host, g1, g2];
    const tKill = Date.now();
    await srv.stop();
    srv = null;
    const rows = await watch(live, 30000, (x) => x.every((s) => s.app === 'title'));
    const tTitle = live.map((_, i) => firstAt(rows, i, (s) => s.app === 'title'));
    await sleep(800);
    const toasts = await Promise.all(live.map((c) => c.page.evaluate(() => JSON.stringify(window.__echoes.app.toasts()))));
    const banners = [...new Set(rows.flatMap((x) => x.map((s) => s.banner)).filter(Boolean))].slice(0, 6);
    // Single-player intact: New Game from the title plays (sim ticks, camp).
    const sp = await live[live.length - 1].page.evaluate(async () => {
      const E = window.__echoes;
      const t0 = E.tick;
      if (E.app && typeof E.app.newGame === 'function') await E.app.newGame();
      await new Promise((r) => setTimeout(r, 2500));
      return { app: E.app.state, ticked: E.tick > t0 + 60, net: E.net.state, replica: E.busCounters.replica, mode: E.state().mode ?? null };
    });
    const res = { titleAfterMs: tTitle.map((t) => (t ? t - tKill : null)), toasts, banners, singlePlayer: sp };
    res.pass = tTitle.every((t) => t !== null) && toasts.every((t) => /Connection to the server was lost/.test(t)) && sp.app === 'playing' && sp.ticked && !sp.replica;
    report.scenarios.E_server_kill = res;
    log(`E: ${JSON.stringify(res)}`);
  }
  report.pageErrors = pages.map((p) => ({ name: p.name, errors: p.errors.slice(0, 8) }));
  for (const [k, v] of Object.entries(report.scenarios)) report.gates[k] = v.pass;
  report.gates.pageErrors0 = pages.every((p) => p.errors.length === 0);
} catch (err) {
  report.crash = String(err && err.stack ? err.stack : err);
  console.error(report.crash);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
writeFileSync(opt.out, JSON.stringify(report, null, 1));
log(`gates ${JSON.stringify(report.gates)}`);
log(`-> ${opt.out}`);
process.exit(report.crash ? 1 : 0);
