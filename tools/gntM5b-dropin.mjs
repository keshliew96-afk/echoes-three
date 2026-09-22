#!/usr/bin/env node
// gntM5b-dropin — 2-4 clients and drop-in (PLAN §7 G5b.1). Owner: M5b.
// A host + one guest page start a run; an AI plays the two empty seats; a
// playing Node guest drops into seat 2 of the RUNNING room, then a second
// guest PAGE drops into seat 3 (AI-held seats taken over, full snapshot) —
// four clients. Every seat must then replicate (0 desyncs over the hash
// checks on both pages, the same party on host and guests), each guest must
// control its seat by real keys, and seat_control must show ai -> human.
//   node tools/gntM5b-dropin.mjs [--port 7825] [--base http://127.0.0.1:4307/]
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep, holdKeys, assertNoReload } from './gntM5b-lib.mjs';
import { createPlayingGuest } from './gntM5b-botlib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const opt = { port: Number(arg('port', 7825)), base: arg('base', 'http://127.0.0.1:4307/'), out: arg('out', 'captures/gntM5b-dropin.json') };
const report = { schema: 'echoes-gntM5b-dropin/1', startedAt: new Date().toISOString(), opt, gates: {} };
const log = (m) => console.log(`[dropin] ${m}`);
let srv = null;
let browser = null;
let bot = null;
try {
  srv = await startServer({ port: opt.port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, width: 960, height: 540 });
  const host = await openClient(browser, { base: opt.base, server: srv.url, name: 'Host', seed: 7, w: 960, h: 540 });
  const g1 = await openClient(browser, { base: opt.base, server: srv.url, name: 'First', seed: 8, w: 960, h: 540 });
  const code = await hostRoom(host);
  await joinRoom(g1, code, 1);
  await startGame(host, [g1]);
  await waitSession([host, g1], 30000);
  await host.page.evaluate(() => {
    const E = window.__echoes;
    E.cmd('startRun', { act: 1 });
    E.cmd('autopilot', true);
    const L = (window.__gntDrop = { ctl: [] });
    E.on('seat_control', (ev) => L.ctl.push({ seat: ev.partyIndex, controller: ev.controller, reason: ev.reason, tick: ev.tick }));
  });
  await sleep(3000);
  const controllers0 = await host.page.evaluate(() => window.__echoes.cmd('netSeats'));
  report.before = { controllers: controllers0 };
  // Drop-in 1: a playing Node guest takes seat 2 of the running room.
  const version = await host.page.evaluate(() => window.__echoes.version);
  bot = createPlayingGuest({ server: srv.url, name: 'Bot', seed: 13, version });
  const t0 = Date.now();
  const br = await bot.net.join(code, 2);
  let botSynced = null;
  while (Date.now() - t0 < 10000) {
    const st = bot.stats();
    if (st.snapshots > 3 && st.me) {
      botSynced = Date.now() - t0;
      break;
    }
    await sleep(100);
  }
  // Drop-in 2: a guest PAGE takes seat 3 (AI-held) of the running room.
  const g2 = await openClient(browser, { base: opt.base, server: srv.url, name: 'Late', seed: 9, w: 960, h: 540 });
  const t1 = Date.now();
  const s3 = await joinRoom(g2, code, 3);
  await waitSession([g2], 20000);
  const g2SyncMs = Date.now() - t1;
  await sleep(4000);
  const seats = await netEval(host, 'return n.room.seats.map((s) => ({ i: s.index, name: s.peerId ? s.name : null, connected: s.connected }));');
  const ctl = await host.page.evaluate(() => window.__gntDrop.ctl.slice());
  // Every guest controls its seat by real keys (D held -> +x on the host).
  const seatX = (s) => host.page.evaluate((i) => (window.__echoes.state().party.find((m) => m.partyIndex === i) || {}).x, s);
  const moved = {};
  for (const [c, s] of [[g1, 1], [g2, 3]]) {
    await c.page.bringToFront();
    const x0 = await seatX(s);
    await holdKeys(c, ['KeyD'], 700);
    await sleep(600);
    moved[s] = Math.round(((await seatX(s)) - x0) * 100) / 100;
  }
  await sleep(6000);
  // The same party everywhere (the replica at its applied tick vs the host).
  const hostParty = await host.page.evaluate(() => window.__echoes.state().party.map((m) => ({ i: m.partyIndex ?? 0, hp: Math.round(m.hp), classId: m.classId ?? 'healer' })));
  const g = [];
  for (const c of [g1, g2]) {
    g.push(
      await netEval(
        c,
        'const s = n.stats(); return { seat: n.seat, desyncs: s.desyncs, hashChecks: s.hashChecks, decodeErrors: s.decodeErrors, refusedEmits: E.busCounters.refusedEmits, party: E.state().party.map((m) => ({ i: m.partyIndex ?? 0, classId: m.classId ?? "healer" })) };'
      )
    );
  }
  const bs = bot.stats();
  report.drops = { botJoin: br, botSyncedMs: botSynced, g2Seat: s3, g2SyncMs };
  report.seats = seats;
  report.seatControl = ctl;
  report.movedByKeys = moved;
  report.guests = g;
  report.bot = { desyncs: bs.desyncs, hashChecks: bs.hashChecks, decodeErrors: bs.decodeErrors, snapshots: bs.snapshots };
  report.hostParty = hostParty;
  await assertNoReload([host, g1, g2]);
  const humanOf = (s) => ctl.some((c) => c.seat === s && c.controller === 'human');
  report.gates = {
    fourClients: seats.filter((s) => s.name && s.connected).length === 4,
    dropInBot: !!(br && br.ok) && botSynced !== null && humanOf(2),
    dropInPage: s3 === 3 && g2SyncMs < 10000 && humanOf(3),
    aiFilledBefore: !!controllers0 && controllers0.controllers[2] === 'ai' && controllers0.controllers[3] === 'ai' && controllers0.controllers[1] === 'human',
    guestsControl: moved[1] > 0.5 && moved[3] > 0.5,
    replicate: g.every((x) => x.desyncs === 0 && x.hashChecks > 3 && x.decodeErrors === 0 && x.refusedEmits === 0 && x.party.length === 4) && bs.desyncs === 0 && bs.hashChecks > 3,
    pageErrors0: [host, g1, g2].every((c) => c.errors.length === 0),
  };
  report.pageErrors = [host, g1, g2].flatMap((c) => c.errors).slice(0, 8);
} catch (err) {
  report.crash = String(err && err.stack ? err.stack : err);
  console.error(report.crash);
} finally {
  if (bot) bot.stop();
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
writeFileSync(opt.out, JSON.stringify(report, null, 1));
log(JSON.stringify({ drops: report.drops, moved: report.movedByKeys, guests: report.guests && report.guests.map((x) => ({ seat: x.seat, desyncs: x.desyncs, hashChecks: x.hashChecks })), ctl: report.seatControl }).slice(0, 1500));
log(`gates ${JSON.stringify(report.gates)}`);
process.exit(report.crash ? 1 : 0);
