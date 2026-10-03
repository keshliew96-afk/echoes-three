#!/usr/bin/env node
// gntM5b-stale — stale input + hidden tabs (PLAN §7 G5b.11). Owner: M5b.
//
// Window 1: the HOST page + a cover tab (hide the host by fronting the
// cover). Window 2: a GUEST page + its own cover tab. Plus one PLAYING Node
// guest (tools/gntM5b-botlib.mjs) whose input can be cut / forced.
//   S1 input cut   the bot holds "east" (forced input); its input stream is cut
//                  for 1 s -> the host repeats the held state <= 8 ticks then
//                  feeds neutral: staleRepeatTicksMax <= 8, the seat stops
//                  within 150 ms of the first starved tick (position trace
//                  recorded on the host every rendered frame), and moves again
//                  when the stream returns.
//   S2 guest tab   the guest page is hidden -> the host hands its seat to the AI
//                  (`seat_control` ai/away) within one snapshot interval of the
//                  guest's visibilitychange, the guest's net loop keeps decoding
//                  on the Worker metronome; visible again -> `seat_control`
//                  human/return and a full re-baseline.
//   S3 host tab    the host page is hidden for 20 s -> the guests keep receiving
//                  60 ± 2 host ticks/s (the host's Worker metronome), 0 desyncs.
//   node tools/gntM5b-stale.mjs [--port 7828] [--base http://127.0.0.1:5199/] [--hideSec 20]
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, openCover, visibility, hostRoom, joinRoom, startGame, waitSession, netEval, sleep, assertNoReload } from './gntM5b-lib.mjs';
import { createPlayingGuest } from './gntM5b-botlib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const opt = { port: Number(arg('port', 7828)), base: arg('base', 'http://127.0.0.1:5199/'), hideSec: Number(arg('hideSec', 20)), out: arg('out', 'captures/gntM5b-stale.json') };
const report = { schema: 'echoes-gntM5b-stale/1', startedAt: new Date().toISOString(), opt, scenarios: {}, gates: {} };
const log = (m) => console.log(`[stale] ${m}`);

let srv = null;
let browser = null;
let bot = null;
try {
  srv = await startServer({ port: opt.port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, width: 1100, height: 620 });
  const host = await openClient(browser, { base: opt.base, server: srv.url, name: 'Host', seed: 7, w: 1100, h: 620, tab: true });
  const hostCover = await openCover(browser);
  await host.page.bringToFront();
  const guest = await openClient(browser, { base: opt.base, server: srv.url, name: 'Tabby', seed: 8, w: 1100, h: 620 });
  const guestCover = await openCover(browser); // lands in the guest's window (the last created)
  await guest.page.bringToFront();
  report.visible0 = { host: await visibility(host), guest: await visibility(guest) };
  const code = await hostRoom(host);
  const gseat = await joinRoom(guest, code, 1);
  const version = await host.page.evaluate(() => window.__echoes.version);
  bot = createPlayingGuest({ server: srv.url, name: 'Stale', seed: 12, version });
  const br = await bot.net.join(code, 2);
  if (!br.ok) throw new Error(`bot join ${br.reason}`);
  await bot.net.setReady(true);
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  await host.page.evaluate(() => {
    const E = window.__echoes;
    E.cmd('startRun', { act: 1 });
    E.cmd('autopilot', true);
    const P = (window.__gntStale = { trace: [], ctl: [] });
    E.on('seat_control', (ev) => P.ctl.push({ at: Date.now(), tick: ev.tick, seat: ev.partyIndex, controller: ev.controller, reason: ev.reason }));
    let last = -1;
    const loop = () => {
      requestAnimationFrame(loop);
      if (E.tick === last) return;
      last = E.tick;
      const m = E.state().party.find((x) => x.partyIndex === 2);
      if (m) P.trace.push({ tick: E.tick, x: m.x, z: m.z, at: Date.now() });
      if (P.trace.length > 20000) P.trace.splice(0, 5000);
    };
    requestAnimationFrame(loop);
  });
  await guest.page.evaluate(() => {
    const P = (window.__gntStale = { vis: [] });
    document.addEventListener('visibilitychange', () => P.vis.push({ at: Date.now(), state: document.visibilityState }));
  });
  await sleep(3000);

  // ---- S1 input cut ------------------------------------------------------
  {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      bot.setForced({ move: { x: i % 2 ? -1 : 1, z: 0 } });
      await sleep(1200);
      const tCut = Date.now();
      const tick0 = await host.page.evaluate(() => window.__echoes.tick);
      bot.setCut(true);
      await sleep(1000);
      bot.setCut(false);
      await sleep(900);
      const r = await host.page.evaluate(() => {
        const E = window.__echoes;
        const s = E.net.stats();
        return { staleLog: s.staleLog, staleRepeatTicksMax: s.staleRepeatTicksMax, trace: window.__gntStale.trace.slice(-400) };
      });
      // The cut's episode = the longest starvation of seat 2 since the cut
      // (1-tick starvations from the bot's own timer jitter happen too).
      const eps = r.staleLog.filter((e) => e.seat === 2 && e.startTick >= tick0 - 5);
      const len = (e) => (e.endTick ?? Infinity) - e.startTick;
      const ep = eps.sort((a, b) => len(b) - len(a))[0] || null;
      let stopTick = null;
      let movedAgainTick = null;
      if (ep) {
        const tr = r.trace;
        // the last tick (from the starve start on) where the body still moved
        for (let k = 1; k < tr.length; k++) {
          if (tr[k].tick < ep.startTick) continue;
          const moved = Math.hypot(tr[k].x - tr[k - 1].x, tr[k].z - tr[k - 1].z) > 1e-6;
          if (moved && (ep.endTick === null || tr[k].tick < ep.endTick)) stopTick = tr[k].tick;
          if (moved && ep.endTick !== null && tr[k].tick >= ep.endTick && movedAgainTick === null) movedAgainTick = tr[k].tick;
        }
      }
      runs.push({
        tCut,
        episode: ep,
        staleRepeatTicksMax: r.staleRepeatTicksMax,
        repeatTicks: ep && ep.neutralTick !== null ? ep.neutralTick - ep.startTick : null,
        stoppedAfterMs: ep && stopTick !== null ? Math.round(((stopTick - ep.startTick + 1) * 1000) / 60) : ep ? 0 : null,
        movedAgain: movedAgainTick !== null,
      });
    }
    bot.setForced(null);
    const pass = runs.every((x) => x.episode && x.staleRepeatTicksMax <= 8 && x.repeatTicks !== null && x.repeatTicks <= 8 && x.stoppedAfterMs <= 150 && x.movedAgain);
    report.scenarios.S1_input_cut = { runs, pass };
    log(`S1 ${JSON.stringify(report.scenarios.S1_input_cut)}`);
  }

  // ---- S2 hidden guest tab ----------------------------------------------------
  {
    const g0 = await netEval(guest, 'const s = n.stats(); return { snaps: s.snapshotsPerSec, full: s.fullSnapshots, dec: n.session.debugGuest().dec.stats().fullCount + n.session.debugGuest().dec.stats().deltaCount };');
    await host.page.evaluate(() => (window.__gntStale.ctl.length = 0));
    await guestCover.bringToFront();
    await sleep(3000);
    const hiddenState = await visibility(guest);
    const gHidden = await netEval(guest, 'const s = n.stats(); const d = n.session.debugGuest().dec.stats(); return { away: s.away, metronome: s.metronome, decoded: d.fullCount + d.deltaCount };');
    const hostHidden = await netEval(host, 'const s = n.stats(); return { awaySeats: s.awaySeats, humanSeats: s.humanSeats };');
    await guest.page.bringToFront();
    await sleep(2500);
    const gBack = await netEval(guest, 'const s = n.stats(); return { away: s.away, synced: s.synced, full: s.fullSnapshots, desyncs: s.desyncs };');
    const hostBack = await netEval(host, 'const s = n.stats(); return { awaySeats: s.awaySeats, humanSeats: s.humanSeats };');
    const vis = await guest.page.evaluate(() => window.__gntStale.vis.slice());
    const ctl = await host.page.evaluate(() => window.__gntStale.ctl.slice());
    const hid = vis.find((v) => v.state === 'hidden');
    const shown = vis.filter((v) => v.state === 'visible').pop();
    const away = ctl.find((c) => c.seat === gseat && c.controller === 'ai' && c.reason === 'away');
    const ret = ctl.find((c) => c.seat === gseat && c.controller === 'human' && c.reason === 'return');
    const res = {
      hiddenState,
      awayAfterMs: hid && away ? away.at - hid.at : null,
      returnAfterMs: shown && ret ? ret.at - shown.at : null,
      decodedWhileHidden: gHidden.decoded - g0.dec,
      guestHidden: gHidden,
      hostHidden,
      guestBack: gBack,
      hostBack,
      fullRebaseline: gBack.full > g0.full,
    };
    res.pass = hiddenState === 'hidden' && res.awayAfterMs !== null && res.awayAfterMs <= 50 + 20 && res.returnAfterMs !== null && res.decodedWhileHidden > 30 && hostHidden.awaySeats.includes(gseat) && hostBack.humanSeats.includes(gseat) && res.fullRebaseline && gBack.desyncs === 0;
    report.scenarios.S2_guest_hidden = res;
    log(`S2 ${JSON.stringify(res)}`);
  }

  // ---- S3 hidden host tab ------------------------------------------------------
  {
    const g0 = await netEval(guest, 'const g = n.session.debugGuest(); const s = n.stats(); return { tick: g.newestTick, desyncs: s.desyncs, hashChecks: s.hashChecks, at: Date.now() };');
    const b0 = bot.stats();
    const fed0 = await netEval(host, 'return { fed: n.stats().hostHiddenFedMs, tick: E.tick, at: Date.now() };');
    await hostCover.bringToFront();
    await guest.page.bringToFront();
    await sleep(500);
    const hv = await visibility(host);
    const samples = [];
    const tA = Date.now();
    while (Date.now() - tA < opt.hideSec * 1000) {
      await sleep(1000);
      samples.push(await netEval(guest, 'return { tick: n.session.debugGuest().newestTick, at: Date.now() };'));
    }
    const g1 = await netEval(guest, 'const g = n.session.debugGuest(); const s = n.stats(); return { tick: g.newestTick, desyncs: s.desyncs, hashChecks: s.hashChecks, at: Date.now() };');
    const hs = await netEval(host, 'const s = n.stats(); return { metronome: s.metronome, visibility: document.visibilityState, fed: s.hostHiddenFedMs, tick: E.tick, at: Date.now() };');
    const b1 = bot.stats();
    await host.page.bringToFront();
    await sleep(1500);
    const hostAfter = await netEval(host, 'const s = n.stats(); return { metronome: s.metronome, visibility: document.visibilityState };');
    const per = [];
    for (let i = 1; i < samples.length; i++) per.push(((samples[i].tick - samples[i - 1].tick) * 1000) / (samples[i].at - samples[i - 1].at));
    const rate = ((g1.tick - g0.tick) * 1000) / (g1.at - g0.at);
    const res = {
      hostVisibility: hv,
      ticksPerSec: Math.round(rate * 10) / 10,
      perSecondMin: Math.round(Math.min(...per) * 10) / 10,
      perSecondMax: Math.round(Math.max(...per) * 10) / 10,
      guestDesyncs: g1.desyncs - g0.desyncs,
      guestHashChecks: g1.hashChecks - g0.hashChecks,
      botDesyncs: b1.desyncs - b0.desyncs,
      botSnapshots: b1.snapshots - b0.snapshots,
      hostMetronome: hs.metronome,
      // Wall time the Worker metronome handed the host's clock per second
      // (1000 = real time; the tick rate below 60 is the sim's own hitstop).
      hostClockFedMsPerSec: Math.round(((hs.fed - fed0.fed) * 1000) / (hs.at - fed0.at)),
      hostTicksPerSecOwn: Math.round(((hs.tick - fed0.tick) * 10000) / (hs.at - fed0.at)) / 10,
      hostAfter,
    };
    res.pass = hv === 'hidden' && Math.abs(rate - 60) <= 2 && res.guestDesyncs === 0 && res.guestHashChecks > 20 && res.botDesyncs === 0;
    report.scenarios.S3_host_hidden = res;
    log(`S3 ${JSON.stringify(res)}`);
  }
  await assertNoReload([host, guest]);
  report.pageErrors = [...host.errors, ...guest.errors].slice(0, 10);
  for (const [k, v] of Object.entries(report.scenarios)) report.gates[k] = v.pass;
  report.gates.pageErrors0 = report.pageErrors.length === 0;
} catch (err) {
  report.crash = String(err && err.stack ? err.stack : err);
  console.error(report.crash);
} finally {
  if (bot) bot.stop();
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
writeFileSync(opt.out, JSON.stringify(report, null, 1));
log(`gates ${JSON.stringify(report.gates)}`);
log(`-> ${opt.out}`);
process.exit(report.crash ? 1 : 0);
