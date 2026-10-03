#!/usr/bin/env node
// gntM5b-lagcomp — host lag compensation (PLAN §7 G5b.3). Owner: M5b.
//
// Host page = a background tab (Worker metronome), guest page = its own
// window playing the TANK (seat 1) with scripted input that always aims at
// the nearest hostile it sees and wanders (chase off) so the enemies chasing
// it keep moving. For every PREDICTED instant shape the guest presents
// (ally_basic melee arc, ally_cast melee_arc / nova) the probe records the
// hostiles that were inside that shape ON THE GUEST'S SCREEN (the positions
// its last rendered frame drew, the own body where it was drawn, the
// presented direction); the host records every authoritative ally_basic /
// ally_cast of that seat with its targets. A valid on-screen target
// REGISTERS when the matching host event (same type + slot, input seq ±3)
// lists it. Runs per condition with lag compensation on and off.
//   node tools/gntM5b-lagcomp.mjs [--conds N1,N2] [--seconds 60] [--port 7826] [--base …] [--margin 0.05]
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, openCover, hostRoom, joinRoom, startGame, waitSession, netEval, sleep, admin, assertNoReload } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const CONDS = { none: null, N1: 'lat75,jit10,loss10', N2: 'lat125,jit20,loss20', N3: 'lat75,burst0.05:0.3:0.8', N4: 'lat50,dup1,reo2' };
const opt = {
  conds: String(arg('conds', 'N1,N2')).split(','),
  seconds: Number(arg('seconds', 60)),
  port: Number(arg('port', 7826)),
  base: arg('base', 'http://127.0.0.1:5199/'),
  margin: Number(arg('margin', 0.05)),
  seat: Number(arg('seat', 1)),
  lag: String(arg('lag', 'both')),
  out: arg('out', 'captures/gntM5b-lagcomp.json'),
};
const report = { schema: 'echoes-gntM5b-lagcomp/1', startedAt: new Date().toISOString(), opt, runs: [], gates: {} };
const log = (m) => console.log(`[lagcomp] ${m}`);

const GUEST_PROBE = (margin) => {
  const E = window.__echoes;
  const S = E.net.session;
  const L = (window.__gntLag = { pred: [], on: true });
  const inArc = (bx, bz, dx, dz, reach, halfDeg, x, z, m) => {
    const ex = x - bx;
    const ez = z - bz;
    const d = Math.hypot(ex, ez);
    if (d > reach - m) return false;
    if (d < 1e-4) return true;
    const half = (Math.min(180, Math.max(0, halfDeg)) * Math.PI) / 180;
    const l = Math.hypot(dx, dz) || 1;
    const cos = (ex / d) * (dx / l) + (ez / d) * (dz / l);
    // margin in angle: the target must sit m/d radians inside the edge
    return Math.acos(Math.max(-1, Math.min(1, cos))) <= half - (m > 0 ? Math.min(0.2, m / Math.max(d, 0.2)) : 0);
  };
  for (const t of ['ally_basic', 'ally_cast']) {
    E.on(t, (ev) => {
      if (!L.on || !ev.predicted) return;
      const g = S.debugGuest();
      if (!g || ev.seat !== g.seat) return;
      if (ev.shape !== 'melee_arc' && ev.shape !== 'nova') return;
      const view = S.renderedHostiles();
      const pose = S.ownPose();
      if (!view || !pose) return;
      const bx = pose.rx;
      const bz = pose.rz;
      const strict = [];
      const clear = [];
      for (const h of view.hostiles) {
        if (!h.hittable) continue;
        let a;
        let b;
        if (ev.shape === 'nova') {
          const d = Math.hypot(h.x - bx, h.z - bz);
          a = d <= ev.radius;
          b = d <= ev.radius - margin;
        } else {
          a = inArc(bx, bz, ev.dx, ev.dz, ev.reach, ev.halfAngle, h.x, h.z, 0);
          b = inArc(bx, bz, ev.dx, ev.dz, ev.reach, ev.halfAngle, h.x, h.z, margin);
        }
        if (a) strict.push(h.id);
        if (b) clear.push(h.id);
      }
      L.pred.push({ seq: Number(String(ev.predId).split(':')[0]), type: t, slot: ev.slot ?? -1, shape: ev.shape, strict, clear, viewTick: view.tick });
      if (L.pred.length > 20000) L.pred.splice(0, 5000);
    });
  }
  return true;
};
const HOST_PROBE = (seat) => {
  const E = window.__echoes;
  const H = (window.__gntLag = { auth: [], denied: [], on: true });
  E.on('seat_denied', (ev) => {
    if (H.on && ev.seat === seat) H.denied.push({ inputSeq: ev.inputSeq, kind: ev.kind, reason: ev.reason });
    if (H.denied.length > 4000) H.denied.splice(0, 1000);
  });
  for (const t of ['ally_basic', 'ally_cast']) {
    E.on(t, (ev) => {
      if (!H.on || ev.seat !== seat || !Number.isInteger(ev.inputSeq)) return;
      H.auth.push({ inputSeq: ev.inputSeq, type: t, slot: ev.slot ?? -1, targets: (ev.targets || []).slice(), tick: ev.tick });
      if (H.auth.length > 20000) H.auth.splice(0, 5000);
    });
  }
  return true;
};

let srv = null;
let browser = null;
try {
  srv = await startServer({ port: opt.port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 });
  const host = await openClient(browser, { base: opt.base, server: srv.url, name: 'Host', seed: 7, tab: true });
  const cover = await openCover(browser);
  await host.page.bringToFront();
  const guest = await openClient(browser, { base: opt.base, server: srv.url, name: 'Lag', seed: 8 });
  const code = await hostRoom(host);
  const seat = await joinRoom(guest, code, opt.seat);
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  await cover.bringToFront();
  await guest.page.bringToFront();
  await host.page.evaluate(() => window.__echoes.cmd('startRun', { act: 1 }));
  await sleep(1500);
  const seatId = await host.page.evaluate((s) => (window.__echoes.state().party.find((m) => m.partyIndex === s) || {}).id, seat);
  // Keep the room in combat with chasing enemies around the guest; keep the
  // guest's seat on its feet (a Downed seat cannot swing).
  const keep = setInterval(() => {
    host.page
      .evaluate((id) => {
        const E = window.__echoes;
        const s = E.state();
        if (!s.run || !s.run.active) return E.cmd('startRun', { act: 1 });
        if (s.run.phase !== 'combat') {
          try {
            E.cmd('draftDecline');
            E.cmd('pathChoose', 0);
            E.cmd('shopAdvance');
          } catch {
            /* page-specific */
          }
          return null;
        }
        const me = s.party.find((m) => m.id === id);
        if (me && me.hp < me.maxHp * 0.6) E.cmd('setHp', id, 1);
        const alive = (s.enemies || []).filter((e) => e.hp > 0).length;
        if (me && alive < 5) {
          const a = (s.tick % 628) / 100;
          E.cmd('spawn', 'mantis', me.x + Math.cos(a) * 2.6, me.z + Math.sin(a) * 2.6, { hpMul: 30 });
          E.cmd('spawn', 'boar', me.x - Math.cos(a) * 3.2, me.z - Math.sin(a) * 3.2, { hpMul: 30 });
        }
        return alive;
      }, seatId)
      .catch(() => {});
  }, 1500);
  await guest.page.evaluate(GUEST_PROBE, opt.margin);
  await host.page.evaluate(HOST_PROBE, seat);
  await netEval(guest, 'return n.session.setBotInput({ seed: 5, aimAll: true, chase: false });');
  const guestPeer = await netEval(guest, 'return n.peerId;');
  for (const condName of opt.conds) {
    const cond = CONDS[condName] ?? condName;
    await admin(srv, '/admin/conditioner', { target: guestPeer, up: cond || 'off', down: cond || 'off' });
    for (const lag of opt.lag === 'on' ? [true] : opt.lag === 'off' ? [false] : [true, false]) {
      await host.page.evaluate((on) => window.__echoes.net.session.setLagCompensation(on), lag);
      await sleep(3000);
      await guest.page.evaluate(() => (window.__gntLag.pred.length = 0));
      await host.page.evaluate(() => {
        window.__gntLag.auth.length = 0;
        window.__gntLag.denied.length = 0;
      });
      const hs0 = await netEval(host, 'const s = n.stats(); return { rewinds: s.rewinds, clamped: s.rewindClamped, compHits: s.lagCompHits, sel: s.lagCompSelections };');
      const sh0 = await guest.page.evaluate(() => window.__echoes.net.session.debugGuest().shadow.stats());
      log(`${condName} lagComp ${lag ? 'ON' : 'OFF'}: ${opt.seconds}s`);
      await sleep(opt.seconds * 1000);
      await sleep(1500); // the last presses' host events arrive
      const pred = await guest.page.evaluate(() => window.__gntLag.pred.slice());
      const auth = await host.page.evaluate(() => window.__gntLag.auth.slice());
      const hs1 = await netEval(host, 'const s = n.stats(); return { rewinds: s.rewinds, clamped: s.rewindClamped, compHits: s.lagCompHits, sel: s.lagCompSelections, rewindTicksAvg: s.rewindTicksAvg, wantedP50: s.rewindWantedP50, wantedP95: s.rewindWantedP95, maxTicks: s.rewindMaxTicks, depth: s.inputBufferDepth };');
      const sh1 = await guest.page.evaluate(() => window.__echoes.net.session.debugGuest().shadow.stats());
      const denies = await host.page.evaluate(() => (window.__gntLag.denied || []).slice());
      const gs = await netEval(guest, 'const s = n.stats(); return { rttMs: s.rttMs, interpDelayMs: s.interpDelayMs, predErrP95: s.predErrP95, desyncs: s.desyncs };');
      let matched = 0;
      let unmatched = 0;
      const unmatchedSample = [];
      const tally = { strict: { valid: 0, reg: 0 }, clear: { valid: 0, reg: 0 } };
      const byShape = {};
      for (const p of pred) {
        let best = null;
        for (const a of auth) {
          if (a.type !== p.type || a.slot !== p.slot) continue;
          const dd = Math.abs(a.inputSeq - p.seq);
          if (dd <= 3 && (!best || dd < Math.abs(best.inputSeq - p.seq))) best = a;
        }
        if (!best) {
          unmatched += 1;
          if (unmatchedSample.length < 8) {
            let near = null;
            for (const a of auth) if (a.type === p.type && a.slot === p.slot && (!near || Math.abs(a.inputSeq - p.seq) < Math.abs(near.inputSeq - p.seq))) near = a;
            const dn = denies.filter((d) => Math.abs(d.inputSeq - p.seq) <= 6).map((d) => `${d.kind}:${d.reason}@${d.inputSeq}`);
            unmatchedSample.push({ seq: p.seq, type: p.type, slot: p.slot, nearestAuthSeq: near ? near.inputSeq : null, denies: dn });
          }
          continue;
        }
        matched += 1;
        const hit = new Set(best.targets);
        for (const k of ['strict', 'clear']) {
          for (const id of p[k]) {
            tally[k].valid += 1;
            if (hit.has(id)) tally[k].reg += 1;
          }
        }
        const b = (byShape[`${p.type}:${p.shape}`] = byShape[`${p.type}:${p.shape}`] || { valid: 0, reg: 0 });
        for (const id of p.clear) {
          b.valid += 1;
          if (hit.has(id)) b.reg += 1;
        }
      }
      const rate = (t) => (t.valid ? Math.round((t.reg / t.valid) * 1000) / 10 : null);
      const run = {
        cond: condName,
        lagComp: lag,
        predictions: pred.length,
        matched,
        unmatched,
        strict: { ...tally.strict, pct: rate(tally.strict) },
        clear: { ...tally.clear, pct: rate(tally.clear) },
        byShape: Object.fromEntries(Object.entries(byShape).map(([k, v]) => [k, { ...v, pct: rate(v) }])),
        host: { rewinds: hs1.rewinds - hs0.rewinds, clamped: hs1.clamped - hs0.clamped, compHits: (hs1.compHits ?? 0) - (hs0.compHits ?? 0), rewindTicksAvg: hs1.rewindTicksAvg, wantedP50: hs1.wantedP50, wantedP95: hs1.wantedP95, maxTicks: hs1.maxTicks, inputBufferDepth: hs1.depth },
        shadow: { predicted: sh1.predicted - sh0.predicted, confirmed: sh1.confirmed - sh0.confirmed, deniedRetracts: sh1.deniedRetracts - sh0.deniedRetracts, lateRetracts: sh1.lateRetracts - sh0.lateRetracts },
        unmatchedSample,
        guest: gs,
      };
      report.runs.push(run);
      log(JSON.stringify(run));
    }
  }
  clearInterval(keep);
  await assertNoReload([host, guest]);
  const get = (c, l) => report.runs.find((r) => r.cond === c && r.lagComp === l);
  for (const c of opt.conds) {
    const on = get(c, true);
    const off = get(c, false);
    const bar = c === 'N1' ? 95 : 85;
    report.gates[c] = { bar, on: on.clear.pct, off: off.clear.pct, strictOn: on.strict.pct, strictOff: off.strict.pct, pass: on.clear.pct >= bar, dropShown: off.clear.pct < on.clear.pct - 5 };
  }
  report.pageErrors = [...host.errors, ...guest.errors].slice(0, 10);
  report.gates.pageErrors0 = report.pageErrors.length === 0;
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
