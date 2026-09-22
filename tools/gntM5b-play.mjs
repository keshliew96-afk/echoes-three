#!/usr/bin/env node
// M5b network-PLAY gate harness (G5b.1/2/4/5/9/10/14 numbers under a named
// network condition). One host page + guest pages (each its own window, the
// multi-page profile) + optional Node guest bots, a session server of our
// own with the per-guest-link conditioner set through the admin API, the
// host playing combat on the autopilot, guest pages playing with scripted
// input (session.setBotInput). Reports per client: prediction error, remote
// jumps, extrapolation, desyncs / hash checks, bandwidth (1 s windows), fps,
// frames > 50 ms, host net ms per frame, predicted-action feedback, and the
// exactly-once replay audit (host sent-ledger vs every guest's replay ledger).
//
//   node tools/gntM5b-play.mjs [--cond N1|N2|N3|N4|none|<spec>] [--pages 2] [--bots 0]
//        [--seconds 60] [--mode combat|boss|camp] [--port 7825] [--base http://127.0.0.1:5199/]
//        [--w 1280 --h 720] [--settle 6] [--out captures/gntM5b-play-<cond>.json] [--noBot]
//        [--mbots N]        N PLAYING Node guests (tools/gntM5b-botlib.mjs: moving, aiming,
//                           attacking, casting — three moving human seats on the host)
//        [--hostHidden]     the host page is a background TAB (a cover tab in front):
//                           it keeps the session ticking on the Worker metronome and
//                           renders nothing, so a guest page measures ITS OWN frame
//                           rate on this one GPU (two rendering pages share it)
//        [--hw W --hh H]    host window size (default --w/--h)
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, openCover, visibility, hostRoom, joinRoom, startGame, waitSession, netEval, sleep, admin, assertNoReload, pct } from './gntM5b-lib.mjs';
import { createPlayingGuest } from './gntM5b-botlib.mjs';
import { createGuestBot } from './gntM5a-botlib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const has = (k) => process.argv.includes(`--${k}`);
// PLAN §7 M5b network conditions (per direction on each guest link):
// N1 150 ms RTT ± 20 ms, 10 % loss · N2 250 ms ± 40 ms, 20 % loss ·
// N3 Gilbert-Elliott burst (pGB 0.05, pBG 0.3, lossInBad 0.8) at 150 ms ·
// N4 1 % dup + 2 % reorder (20-60 ms) at 100 ms.
const CONDS = {
  none: null,
  N1: 'lat75,jit10,loss10',
  N2: 'lat125,jit20,loss20',
  N3: 'lat75,burst0.05:0.3:0.8',
  N4: 'lat50,dup1,reo2',
};
const condName = arg('cond', 'N1');
const cond = Object.prototype.hasOwnProperty.call(CONDS, condName) ? CONDS[condName] : condName;
const opt = {
  port: Number(arg('port', 7825)),
  base: arg('base', 'http://127.0.0.1:5199/'),
  pages: Number(arg('pages', 2)),
  bots: Number(arg('bots', 0)),
  seconds: Number(arg('seconds', 60)),
  mode: arg('mode', 'combat'),
  w: Number(arg('w', 1280)),
  h: Number(arg('h', 720)),
  settle: Number(arg('settle', 6)),
  out: arg('out', `captures/gntM5b-play-${condName}.json`),
  bot: !has('noBot'),
  mbots: Number(arg('mbots', 0)),
  hostHidden: has('hostHidden'),
  hostKeys: has('hostKeys'),
  hw: Number(arg('hw', arg('w', 1280))),
  hh: Number(arg('hh', arg('h', 720))),
};
const report = { schema: 'echoes-gntM5b-play/1', startedAt: new Date().toISOString(), cond: condName, spec: cond, opt, clients: [], gates: {}, notes: [] };
const log = (m) => console.log(`[play] ${m}`);

let srv = null;
let browser = null;
let cover = null;
const bots = [];
try {
  srv = await startServer({ port: opt.port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, width: opt.w, height: opt.h });
  const pages = [];
  for (let i = 0; i < opt.pages; i++) {
    const isHost = i === 0;
    pages.push(await openClient(browser, { base: opt.base, server: srv.url, name: isHost ? 'Host' : `Guest${i}`, seed: 7 + i, w: isHost ? opt.hw : opt.w, h: isHost ? opt.hh : opt.h, tab: isHost && opt.hostHidden }));
    pages[i].role = i === 0 ? 'host' : 'guest';
    if (isHost && opt.hostHidden) {
      // The cover tab joins the HOST's window now (a later newPage would land
      // in the last-created window — a guest's); the host stays in front
      // until the session runs.
      cover = await openCover(browser);
      await pages[0].page.bringToFront();
    }
  }
  const host = pages[0];
  const guests = pages.slice(1);
  const code = await hostRoom(host);
  for (const g of guests) g.seat = await joinRoom(g, code);
  const version = await host.page.evaluate(() => window.__echoes.version);
  for (let i = 0; i < opt.bots; i++) {
    const b = createGuestBot({ server: srv.url, name: `Bot${i + 1}`, version });
    const r = await b.net.join(code);
    if (!r.ok) throw new Error(`bot join failed ${r.reason}`);
    await b.net.setReady(true);
    bots.push(b);
  }
  for (let i = 0; i < opt.mbots; i++) {
    const b = createPlayingGuest({ server: srv.url, name: `Player${i + 1}`, seed: 11 + i, version });
    const r = await b.net.join(code);
    if (!r.ok) throw new Error(`playing bot join failed ${r.reason}`);
    await b.net.setReady(true);
    bots.push(b);
  }
  log(`room ${code}: host + ${guests.length} page guest(s) + ${bots.length} bot(s)`);
  if (cond) {
    for (const g of guests) {
      const pid = await netEval(g, 'return n.peerId;');
      const r = await admin(srv, '/admin/conditioner', { target: pid, up: cond, down: cond });
      if (!r || !r.ok) throw new Error(`conditioner failed: ${JSON.stringify(r)}`);
    }
    for (const b of bots) await admin(srv, '/admin/conditioner', { target: b.net.peerId, up: cond, down: cond });
  }
  await startGame(host, guests);
  await waitSession(pages, 30000);
  if (opt.hostHidden) {
    await cover.bringToFront();
    await sleep(500);
    report.hostVisibility = await visibility(host);
    if (report.hostVisibility !== 'hidden') throw new Error(`host tab still ${report.hostVisibility}`);
    log('host tab hidden (Worker metronome drives its sim)');
  }
  // The host plays: a run on the default-build autopilot (restarted if it ends).
  if (opt.mode !== 'camp') {
    await host.page.evaluate((mode) => {
      const E = window.__echoes;
      const go = () => {
        E.cmd('startRun', { act: 1 });
        E.cmd('autopilot', true);
        if (mode === 'boss') E.cmd('skipToRoom', 8);
      };
      go();
      window.__gntKeep = setInterval(() => {
        try {
          const r = E.state().run;
          if (!r || !r.active) go();
        } catch {
          /* between scenes */
        }
      }, 3000);
    }, opt.mode);
  }
  if (opt.bot) for (let i = 0; i < guests.length; i++) await netEval(guests[i], 'return n.session.setBotInput({ seed: arg });', 3 + i);
  log(`settling ${opt.settle}s (${condName}${cond ? ` = ${cond}` : ''})`);
  await sleep(opt.settle * 1000);
  // ------------------------------------------------------------ measure --
  for (const p of pages) {
    await p.page.evaluate(() => {
      const E = window.__echoes;
      if (E.net.session.resetStats) E.net.session.resetStats();
      const g = E.net.session.debugGuest();
      window.__gntBase = { bus: { ...E.busCounters }, tick: E.tick, ledgerLen: g ? g.replica.ledger().size : null, refusals: E.net.session.debugGuest() ? E.net.stats().worldRefusals : null };
      const nb = (window.__gntFr = { d: [], last: performance.now(), on: true });
      const f = (t) => {
        if (!nb.on) return;
        nb.d.push(t - nb.last);
        nb.last = t;
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
  }
  const hostT0 = await host.page.evaluate(() => window.__echoes.tick);
  const samples = new Map(pages.map((p) => [p, []]));
  const t0 = Date.now();
  log(`measuring ${opt.seconds}s…`);
  while (Date.now() - t0 < opt.seconds * 1000) {
    for (const p of pages) {
      try {
        samples.get(p).push({ t: Date.now(), s: await netEval(p, 'return n.stats();') });
      } catch {
        /* busy */
      }
    }
    await sleep(1000);
  }
  await assertNoReload(pages);
  const hostT1 = await host.page.evaluate(() => window.__echoes.tick);
  // Host keydown-to-move (§22 bar, G5b.9): the autopilot steps aside, the
  // host's own trusted D / A presses from rest; ticks from the keydown to the
  // Healer's sim position changing, while the guests keep playing.
  if (opt.hostKeys && !opt.hostHidden) {
    await host.page.bringToFront();
    await host.page.evaluate(() => {
      const E = window.__echoes;
      E.cmd('autopilot', false);
      const P = (window.__gntKeys = { keys: [], trace: [] });
      addEventListener('keydown', (e) => { if (!e.repeat) P.keys.push({ code: e.code, td: performance.now(), tick: E.tick }); }, { capture: true });
      let last = -1;
      const loop = () => {
        if (P.done) return;
        requestAnimationFrame(loop);
        if (E.tick === last) return;
        last = E.tick;
        const p = E.state().party[0];
        P.trace.push({ tick: E.tick, x: p.x, z: p.z });
      };
      requestAnimationFrame(loop);
    });
    for (let i = 0; i < 10; i++) {
      await sleep(500);
      const k = i % 2 ? 'KeyA' : 'KeyD';
      await host.page.keyboard.down(k);
      await sleep(250);
      await host.page.keyboard.up(k);
    }
    await sleep(300);
    const P = await host.page.evaluate(() => {
      const E = window.__echoes;
      window.__gntKeys.done = true;
      E.cmd('autopilot', true);
      return window.__gntKeys;
    });
    const ticks = [];
    for (const k of P.keys) {
      const i = P.trace.findIndex((t) => t.tick > k.tick);
      if (i < 1) continue;
      const b = P.trace[i - 1];
      let n = null;
      for (let j = i; j < Math.min(P.trace.length, i + 20); j++) {
        if (Math.hypot(P.trace[j].x - b.x, P.trace[j].z - b.z) > 1e-6) {
          n = P.trace[j].tick - k.tick;
          break;
        }
      }
      ticks.push(n);
    }
    report.hostKeydownToMoveTicks = ticks;
  }
  // ---------------------------------------------------------- collect --
  const hostLedger = await host.page.evaluate(() => window.__echoes.net.session.debugHost().ledger());
  const tickOf = (k) => Number(k.split('|')[0]);
  // Window: events emitted after the measure start and >= 2 s before its end
  // (so every guest's interpolation clock has reached them).
  const inWin = (k) => tickOf(k) > hostT0 && tickOf(k) < hostT1 - 120;
  const sent = hostLedger.filter(inWin);
  const sentByType = {};
  for (const k of sent) {
    const t = k.split('|')[1];
    sentByType[t] = (sentByType[t] || 0) + 1;
  }
  for (const p of pages) {
    const ss = samples.get(p);
    const last = ss.length ? ss[ss.length - 1].s : {};
    const perSec = (key) => {
      const out = [];
      for (let i = 1; i < ss.length; i++) {
        const dt = (ss[i].t - ss[i - 1].t) / 1000;
        const d = ss[i].s[key] - ss[i - 1].s[key];
        if (dt > 0 && d >= 0) out.push(d / dt);
      }
      return out;
    };
    const bin = perSec('bytesIn');
    const bout = perSec('bytesOut');
    const fr = await p.page.evaluate(() => {
      const nb = window.__gntFr;
      nb.on = false;
      return nb.d.slice(2);
    });
    const total = fr.reduce((a, b) => a + b, 0);
    const c = {
      name: p.name,
      role: p.role,
      seat: p.seat ?? 0,
      fps: fr.length ? { avg: Math.round((fr.length / total) * 10000) / 10, p5: Math.round((1000 / pct(fr, 0.95)) * 10) / 10 } : null,
      frameOver50: fr.filter((x) => x > 50).length,
      frameOver100: fr.filter((x) => x > 100).length,
      bytesInPerSec: { avg: bin.length ? Math.round(bin.reduce((a, b) => a + b, 0) / bin.length) : null, p95: Math.round(pct(bin, 0.95) ?? 0) },
      bytesOutPerSec: { avg: bout.length ? Math.round(bout.reduce((a, b) => a + b, 0) / bout.length) : null, p95: Math.round(pct(bout, 0.95) ?? 0) },
      rttMs: last.rttMs,
      lossPct: last.lossPct,
      stats: last,
      pageErrors: p.errors.slice(0, 10),
      consoleErrors: p.consoleLines.filter((l) => l.startsWith('[error]')).slice(0, 10),
    };
    if (p.role === 'guest') {
      const g = await p.page.evaluate(() => {
        const E = window.__echoes;
        const gg = E.net.session.debugGuest();
        return { ledger: [...gg.replica.ledger().entries()], base: window.__gntBase, bus: { ...E.busCounters } };
      });
      const led = new Map(g.ledger);
      let missing = 0;
      let dup = 0;
      const missingTypes = {};
      const byType = {};
      for (const k of sent) {
        const n = led.get(k) || 0;
        if (n === 0) {
          missing += 1;
          const t = k.split('|')[1];
          missingTypes[t] = (missingTypes[t] || 0) + 1;
        }
        if (n > 1) dup += 1;
        if (n >= 1) {
          const t = k.split('|')[1];
          byType[t] = (byType[t] || 0) + 1;
        }
      }
      c.replay = {
        sent: sent.length,
        deliveredOnce: sent.length - missing - dup,
        missing,
        duplicates: dup,
        missingTypes,
        simCallsDelta: g.bus.simCalls - g.base.bus.simCalls,
        refusedEmits: g.bus.refusedEmits,
        counts: { glint_gain: [sentByType.glint_gain || 0, byType.glint_gain || 0], reward_offer: [sentByType.reward_offer || 0, byType.reward_offer || 0], run_end: [sentByType.run_end || 0, byType.run_end || 0] },
      };
    }
    report.clients.push(c);
  }
  report.hostTicks = { from: hostT0, to: hostT1, perSec: Math.round(((hostT1 - hostT0) / opt.seconds) * 10) / 10 };
  report.bots = bots.map((b) => (b.stats ? { name: b.name, ...b.stats(), dec: undefined } : { name: b.name, kind: b.kind }));
  report.hostSeats = await host.page.evaluate(() => {
    const E = window.__echoes;
    const s = E.net.stats();
    return { humanSeats: s.humanSeats, awaySeats: s.awaySeats, playerController: s.playerController, metronome: s.metronome, visibility: document.visibilityState };
  });
  report.server = await admin(srv, '/stats').catch(() => null);
  if (report.server && report.server.peers) report.server = { peers: report.server.peers.map((x) => ({ name: x.name, rttMs: x.rttMs, link: x.link ? { up: x.link.up.spec, down: x.link.down.spec, upLoss: x.link.up.appliedLossPct, downLoss: x.link.down.appliedLossPct } : null })) };
  // -------------------------------------------------------------- gates --
  const G = report.gates;
  const gs = report.clients.filter((c) => c.role === 'guest');
  const hs = report.clients.find((c) => c.role === 'host');
  const passLevel = condName === 'N1' || condName === 'none';
  G.desyncs0 = gs.every((c) => c.stats.desyncs === 0 && (c.stats.hashChecks ?? 0) > 0);
  G.decodeErrors0 = gs.every((c) => (c.stats.decodeErrors ?? 0) === 0);
  G.predErrP95 = gs.map((c) => c.stats.predErrP95);
  G.predErrMax = gs.map((c) => c.stats.predErrMax);
  G.maxCorrectionPerFrame = gs.map((c) => c.stats.maxCorrectionPerFrame);
  G.remoteJumpMax = gs.map((c) => c.stats.remoteJumpMax);
  G.remoteJumpRate06 = gs.map((c) => c.stats.remoteJumpRate06);
  G.remoteFrames = gs.map((c) => c.stats.remoteFrames);
  G.hostileJumpMax = gs.map((c) => c.stats.hostileJumpMax);
  G.smoothing = gs.map((c) => ({ smoothed: c.stats.smoothed, maxU: c.stats.smoothedMaxU, snaps: c.stats.smoothSnaps, teleportFrames: c.stats.teleportFrames, stallFrames: c.stats.stallFrames, clockFrames: c.stats.clockFrames, interpSnaps: c.stats.interpSnaps }));
  G.predErrOk = passLevel ? gs.every((c) => c.stats.predErrP95 !== null && c.stats.predErrP95 <= 0.15) : gs.every((c) => c.stats.predErrP95 !== null && c.stats.predErrP95 <= 0.35 && c.stats.predErrMax <= 1.0);
  G.remoteJumpsOk = passLevel ? gs.every((c) => c.stats.remoteJumps03 === 0) : gs.every((c) => c.stats.remoteJumpRate06 <= 0.01);
  G.reconnects0 = gs.every((c) => (c.stats.reconnects ?? 0) === 0);
  G.bandwidthGuestDown = gs.map((c) => c.bytesInPerSec);
  G.bandwidthGuestUp = gs.map((c) => c.bytesOutPerSec);
  G.bandwidthOk = gs.every((c) => c.bytesInPerSec.avg <= 12 * 1024 && c.bytesInPerSec.p95 <= 24 * 1024 && c.bytesOutPerSec.avg <= 4 * 1024) && hs.bytesOutPerSec.avg <= 12 * 1024 * Math.max(1, gs.length + bots.length) + 6 * 1024;
  G.deltaRatio = gs.map((c) => c.stats.deltaRatio);
  G.deltaRatioOk = gs.every((c) => c.stats.deltaRatio !== null && c.stats.deltaRatio <= 0.3);
  G.replayExactlyOnce = gs.map((c) => c.replay);
  G.replayOk = gs.every((c) => c.replay.missing === 0 && c.replay.duplicates === 0 && c.replay.simCallsDelta === 0 && c.replay.refusedEmits === 0);
  G.hostNetMsP95 = hs.stats.hostNetMsP95;
  G.hostFrameOver50Net = hs.stats.frameOver50Net;
  G.fps = report.clients.map((c) => ({ name: c.name, fps: c.fps, over50: c.frameOver50 }));
  G.feedback = gs.map((c) => c.stats.ownActionFeedbackMs);
  G.extrapolated = gs.map((c) => ({ extrapolated: c.stats.extrapolatedFrames, held: c.stats.heldFrames, interpDelayMs: c.stats.interpDelayMs }));
  G.pageErrors0 = report.clients.every((c) => c.pageErrors.length === 0);
  G.botDesyncs0 = report.bots.every((b) => b.desyncs === undefined || (b.desyncs === 0 && b.decodeErrors === 0 && b.hashChecks > 0));
  G.hostTicksPerSec = report.hostTicks.perSec;
  G.hostSeats = report.hostSeats;
  if (report.hostKeydownToMoveTicks) {
    G.hostKeydownToMoveTicks = report.hostKeydownToMoveTicks;
    G.hostKeydownToMoveOk = report.hostKeydownToMoveTicks.length > 0 && report.hostKeydownToMoveTicks.every((t) => t !== null && t <= 2);
  }
  G.hostFps60 = !!hs.fps && hs.fps.avg >= 60;
  G.hostNetMsP95Ok = hs.stats.hostNetMsP95 !== null && hs.stats.hostNetMsP95 <= 2;
  G.hostFrameOver50Net0 = hs.stats.frameOver50Net === 0;
} catch (err) {
  report.crash = String(err && err.stack ? err.stack : err);
  console.error(report.crash);
} finally {
  for (const b of bots) {
    try {
      b.stop();
    } catch {
      /* ignore */
    }
  }
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
writeFileSync(opt.out, JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report.gates)) log(`${k}: ${JSON.stringify(v).slice(0, 300)}`);
log(`-> ${opt.out}`);
process.exit(report.crash ? 1 : 0);
