#!/usr/bin/env node
// gntfixM5b1 — NET-F1 retraction probe (fix builder M5b round 1).
//
// Same session as the net critic's tools/gntcnet1-session.mjs (host page on
// the autopilot + 1 guest page on the scripted bot input + N playing Node
// bots, every guest link shaped through the server admin API), plus an
// instrumented view of EVERY retraction on the guest page, taken from the
// outside (the shadow's methods are wrapped on the live object; no build
// change needed, so the same probe measures the before and the after build):
//   - which path retracted it: 'state' (inside reseed = a snapshot),
//     'denied' (a seat_denied / interact_denied event), 'events' (the
//     reliable event stream delivered through the consumed tick);
//   - the in-game metric (retract - provenAt, what net.stats() reports);
//   - the PLAN §3.7 clock: retract - the arrival of the FIRST snapshot whose
//     lastInputSeqConsumed >= the prediction's seq (or the denial's arrival
//     when that came first) — "a snapshot with lastInputSeqConsumed >= seq
//     arrives without it ... retracted within one snapshot";
//   - the same from the first snapshot with k >= seq + 3 (the match window).
// Also the snapshot inter-arrival distribution on the guest (the "one
// snapshot interval" of the bar, as received).
//
//   node tools/gntfixM5b1-retract.mjs --server ws://127.0.0.1:7895/echoes --base http://127.0.0.1:4365/
//        [--sweep N2] [--seconds 180] [--bots 2] [--tag name] [--w 1280 --h 720]
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { here, argOf, launchEchoes, openClient, ev, hostRoom, joinRoom, startGame, waitSession, stats, sleep, admin, CONDS, shapeGuestLinks, pct, r2 } from './gntcnet1-lib.mjs';

const SERVER = argOf('server', 'ws://127.0.0.1:7895/echoes');
const BASE = argOf('base', 'http://127.0.0.1:4365/');
const BOTS = Number(argOf('bots', 2));
const SWEEP = String(argOf('sweep', 'N2')).split(',').filter(Boolean);
const SECONDS = Number(argOf('seconds', 180));
const SETTLE = Number(argOf('settle', 6));
const TAG = argOf('tag', SWEEP.join('-'));
const W = Number(argOf('w', 1280));
const H = Number(argOf('h', 720));
// --force downed: every FORCE_PERIOD s the HOST downs the guest's seat body
// (E.cmd('setHp', id, 0)) for FORCE_DOWN s, then restores it — the host
// stops firing the seat's held basic at once while the guest's shadow keeps
// predicting until the snapshot with hp 0 reaches it: a stream of DENIED
// predictions on demand (the PLAN G5b.12 forced-mispredict leg; `stun` is
// hostile-only in this sim, so a Downed pulse is the party-side equivalent).
const FORCE = argOf('force', null);
const FORCE_PERIOD = Number(argOf('forcePeriod', 8));
const FORCE_DOWN = Number(argOf('forceDown', 2.5));
const srv = { http: SERVER.replace(/^ws/, 'http').replace(/\/echoes$/, '') };

const INSTALL = `
  const g = n.session.debugGuest();
  if (!g || !g.shadow) return { ok: false };
  if (window.__m5b1) return { ok: true, again: true };
  const sh = g.shadow;
  const M = (window.__m5b1 = { snaps: [], retracts: [], denials: [], path: null, timers: null, k: null });
  const o = { reseed: sh.reseed, onConsumed: sh.onConsumed, onAuthEvent: sh.onAuthEvent, onEventsThrough: sh.onEventsThrough, basic: sh.basic };
  M.ctx = new Map();
  M.preds = [];
  M.calls = [];
  const oPress = sh.press, oDash = sh.dashEnded;
  sh.press = (kind, c) => { const r = oPress(kind, c); if (kind === 'dodge') M.calls.push([performance.now(), c.seq, 'D' + (r ? '+' : '-') + (c.dashing ? 'd' : '')]); return r; };
  sh.dashEnded = (seq) => { M.calls.push([performance.now(), seq, 'E']); return oDash(seq); };
  sh.basic = (c) => {
    const r = o.basic(c);
    M.calls.push([performance.now(), c.seq, 'B' + (r ? '+' : '-') + (c.channelling ? 'c' : '') + (c.fresh ? 'f' : '') + (c.dashing ? 'd' : '') + (c.body && c.body.hp > 0 ? '' : 'X')]);
    if (M.calls.length > 8000) M.calls.splice(0, 2000);
    if (r) { const pp = sh.pending().find((q) => q.predId === r); M.preds.push([performance.now(), c.seq, pp ? pp.prevReady : null]); if (M.preds.length > 3000) M.preds.splice(0, 1000);
      M.ctx.set(r, { hp: c.body ? c.body.hp : null, ch: !!c.channelling, fresh: !!c.fresh, dash: !!c.dashing, tick: c.tick }); if (M.ctx.size > 400) M.ctx.delete(M.ctx.keys().next().value); }
    return r;
  };
  if (sh.frame) {
    const oF = sh.frame;
    sh.frame = (c) => {
      const prev = M.path;
      M.path = prev || 'local';
      let r;
      try { r = oF(c); } finally { M.path = prev; }
      M.calls.push([performance.now(), c.seq, 'F' + (r ? '+' : '-') + (c.basic ? 'b' : '') + (c.dashEnd ? 'e' : '') + (c.dashing ? 'd' : '') + (c.fresh ? 'f' : '') + (c.channelling ? 'c' : '') + (c.body && c.body.hp > 0 ? '' : 'X')]);
      if (M.calls.length > 8000) M.calls.splice(0, 2000);
      if (r && !M.ctx.has(r)) { M.preds.push([performance.now(), c.seq, null]); if (M.preds.length > 3000) M.preds.splice(0, 1000); M.ctx.set(r, { hp: c.body ? c.body.hp : null, ch: !!c.channelling, fresh: !!c.fresh, dash: !!c.dashing, tick: c.tick, via: 'frame' }); if (M.ctx.size > 400) M.ctx.delete(M.ctx.keys().next().value); }
      return r;
    };
  }
  sh.reseed = (timers, k, ...rest) => {
    M.snaps.push([performance.now(), k, timers ? timers.basic : null, timers && Number.isInteger(timers.fire) ? timers.fire : null]);
    if (M.snaps.length > 6000) M.snaps.splice(0, 2000);
    M.path = 'state';
    M.timers = timers;
    M.k = k;
    try { return o.reseed(timers, k, ...rest); } finally { M.path = null; }
  };
  sh.onAuthEvent = (e) => {
    if (e && (e.type === 'seat_denied' || e.type === 'interact_denied')) M.denials.push({ t: performance.now(), type: e.type, kind: e.kind, reason: e.reason, inputSeq: e.inputSeq });
    const prev = M.path;
    M.path = prev || 'denied';
    try { return o.onAuthEvent(e); } finally { M.path = prev; }
  };
  sh.onEventsThrough = (T) => {
    const prev = M.path;
    M.path = prev || 'events';
    try { return o.onEventsThrough(T); } finally { M.path = prev; }
  };
  E.on('presentation_retract', (e) => {
    if (!e || e.seat !== n.seat) return;
    const p = sh.pending().find((q) => q.predId === e.predId);
    M.retracts.push({ t: performance.now(), path: M.path || 'other', predId: e.predId, kind: e.kind, why: e.reason, seq: p ? p.seq : null, pt: p ? p.t : null, provenAt: p ? p.provenAt : null, consumedTick: p ? p.consumedTick : null, k: M.k, timers: M.timers ? JSON.parse(JSON.stringify(M.timers)) : null, ctx: M.ctx.get(e.predId) || null });
  });
  return { ok: true };
`;
// HOST ground truth for the guest's seat: every event of that seat / body,
// with the seat feed's consumed seq at emission time (the frame being resolved).
const HOST_INSTALL = `
  if (window.__m5b1h) return { ok: true, again: true };
  const d = n.session.debugHost();
  const seat = arg;
  const H = (window.__m5b1h = { log: [] });
  let bodyId = null;
  E.on('*', (e) => {
    if (!e || e.type === 'sound') return;
    if (bodyId === null) { const b = (E.state().party || []).find((p) => p.partyIndex === seat); bodyId = b ? b.id : null; }
    const mine = e.seat === seat || e.partyIndex === seat || (bodyId !== null && (e.id === bodyId || e.targetId === bodyId || e.reviverId === bodyId || e.by === bodyId || e.bodyId === bodyId));
    if (!mine) return;
    const f = d && d.feeds ? d.feeds.get(seat) : null;
    H.log.push({ tick: e.tick, type: e.type, kind: e.kind, reason: e.reason, inputSeq: e.inputSeq, lc: f ? f.lastConsumed : null, miss: f ? f.missingRun : null, depth: f ? f.buffer.size : null });
    if (H.log.length > 20000) H.log.splice(0, 5000);
  });
  return { ok: true, seat };
`;
const HOST_PULL = 'const H = window.__m5b1h; return H ? H.log.splice(0) : null;';
// Pull + clear the page's buffers (snapshot arrivals are kept 10 s back so a
// retraction's clock can still find its first proving snapshot).
const PULL = `
  const M = window.__m5b1;
  if (!M) return null;
  const now = performance.now();
  const out = { now, snaps: M.snaps.slice(), retracts: M.retracts.splice(0), denials: M.denials.splice(0), preds: M.preds.splice(0), calls: M.calls.splice(0) };
  while (M.snaps.length && now - M.snaps[0][0] > 10000) M.snaps.shift();
  return out;
`;

const out = { schema: 'gntfixM5b1-retract/1', startedAt: new Date().toISOString(), server: SERVER, base: BASE, bots: BOTS, seconds: SECONDS, conditions: {} };
const browser = await launchEchoes({ gpu: true, background: true, width: W, height: H });
const bots = [];
try {
  const host = await openClient(browser, { base: BASE, server: SERVER, name: 'FHost', seed: 7, w: W, h: H });
  const guest = await openClient(browser, { base: BASE, server: SERVER, name: 'FGuest', seed: 7, w: W, h: H });
  const code = await hostRoom(host, 'private');
  await joinRoom(guest, code);
  if (BOTS > 0) {
    const { createPlayingGuest } = await import('./gntM5b-botlib.mjs');
    for (let i = 0; i < BOTS; i++) {
      const b = createPlayingGuest({ server: SERVER, name: `FBot${i + 1}`, seed: 11 + i });
      const r = await b.net.join(code);
      if (!r || !r.ok) throw new Error(`bot join failed ${JSON.stringify(r)}`);
      await b.net.setReady(true);
      bots.push(b);
    }
  }
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  await ev(host, `E.cmd('startRun', { act: 1 }); E.cmd('autopilot', true); return true;`);
  await ev(guest, 'return n.session.setBotInput({ seed: 3, aim: true, chase: true });');
  await sleep(3000);
  out.version = await ev(guest, 'return E.version;');
  const peerIds = (await ev(host, 'return n.peers().filter((p) => p.peerId && !p.me).map((p) => p.peerId);')).filter(Boolean);
  const guestPeer = await ev(guest, 'const me = n.peers().find((p) => p.me); return me ? me.peerId : null;');
  out.install = await ev(guest, INSTALL);
  const guestSeat = await ev(guest, 'return n.seat;');
  out.seats = await ev(host, 'return n.peers().map((p) => ({ i: p.index, name: p.name, ai: p.ai, connected: p.connected }));');
  out.guestSeat = guestSeat;
  out.hostInstall = await ev(host, HOST_INSTALL, guestSeat);
  const hostLog = [];

  for (const key of SWEEP) {
    const spec = key in CONDS ? CONDS[key] : key;
    await shapeGuestLinks(srv, peerIds, spec);
    await sleep(SETTLE * 1000);
    await ev(guest, 'n.session.resetStats(); return true;');
    await ev(guest, PULL); // drop the settle window's records
    const recs = [];
    const denials = [];
    const preds = [];
    const calls = [];
    let snaps = [];
    const snapGaps = [];
    const t1 = Date.now();
    let lastSnapT = null;
    let forced = 0;
    let nextForce = FORCE ? t1 + 4000 : Infinity;
    let restoreAt = Infinity;
    while (Date.now() - t1 < SECONDS * 1000) {
      await sleep(FORCE ? 500 : 2000);
      if (Date.now() >= nextForce) {
        const r = await ev(host, 'const b = (E.state().party || []).find((p) => p.partyIndex === arg); return b ? { id: b.id, hp: E.cmd("setHp", b.id, 0) } : null;', guestSeat).catch((e) => ({ error: String(e) }));
        forced += 1;
        nextForce = Date.now() + FORCE_PERIOD * 1000;
        restoreAt = Date.now() + FORCE_DOWN * 1000;
        if (forced <= 2) console.log('  forced down', JSON.stringify(r));
      }
      if (Date.now() >= restoreAt) {
        await ev(host, 'const b = (E.state().party || []).find((p) => p.partyIndex === arg); return b ? E.cmd("setHp", b.id, 1) : null;', guestSeat).catch(() => null);
        restoreAt = Infinity;
      }
      const p = await ev(guest, PULL);
      if (!p) {
        await ev(guest, INSTALL);
        continue;
      }
      // merge snapshot arrivals (dedupe by time)
      for (const s of p.snaps) {
        if (lastSnapT !== null && s[0] <= lastSnapT) continue;
        if (lastSnapT !== null) snapGaps.push(s[0] - lastSnapT);
        lastSnapT = s[0];
        snaps.push(s);
      }
      if (snaps.length > 20000) snaps = snaps.slice(-10000);
      for (const d of p.denials) denials.push(d);
      for (const q of p.preds || []) preds.push(q);
      for (const q of p.calls || []) calls.push(q);
      const hl = await ev(host, HOST_PULL);
      if (hl) for (const x of hl) hostLog.push(x);
      for (const r of p.retracts) {
        const firstSnap = (min) => {
          for (const s of snaps) if (s[0] >= (r.pt ?? 0) && Number.isInteger(s[1]) && s[1] >= min) return s[0];
          return null;
        };
        const s0 = r.seq !== null ? firstSnap(r.seq) : null;
        const s3 = r.seq !== null ? firstSnap(r.seq + 3) : null;
        // a denial for this prediction that arrived before any proving snapshot
        const den = denials.find((d) => d.inputSeq !== undefined && r.seq !== null && Math.abs(d.inputSeq - r.seq) <= 3 && d.t <= r.t + 0.01 && d.t >= (r.pt ?? 0));
        const start = [s0, den ? den.t : null].filter((x) => x !== null);
        recs.push({
          kind: r.kind,
          why: r.why,
          path: r.path,
          seq: r.seq,
          inGameMs: r.provenAt !== null ? r2(r.t - r.provenAt) : null,
          planMs: start.length ? r2(r.t - Math.min(...start)) : null,
          fromK3Ms: s3 !== null ? r2(r.t - s3) : null,
          sincePredictMs: r.pt !== null ? r2(r.t - r.pt) : null,
          denial: den ? { reason: den.reason, type: den.type } : null,
          k: r.k,
          timers: r.timers,
          ctx: r.ctx,
          guestTimeline: r.seq !== null ? [...preds.filter((q) => q[1] >= r.seq - 45 && q[1] <= r.seq + 45).map((q) => [q[0], `P t=${Math.round(q[0])} seq=${q[1]} prev=${q[2]}`]), ...snaps.filter((x) => x[1] >= r.seq - 45 && x[1] <= r.seq + 45).map((x) => [x[0], `S t=${Math.round(x[0])} k=${x[1]} Tb=${x[2]}`]), ...calls.filter((q) => q[1] >= r.seq - 45 && q[1] <= r.seq + 5).map((q) => [q[0], `C t=${Math.round(q[0])} seq=${q[1]} ${q[2]}`])].sort((a, b) => a[0] - b[0]).map((x) => x[1]) : null,
          rt: Math.round(r.t),
          host: r.seq !== null ? hostLog.filter((x) => Number.isInteger(x.lc) && x.lc >= r.seq - 40 && x.lc <= r.seq + 40).map((x) => `${x.type}${x.kind ? ':' + x.kind : ''}${x.reason ? ':' + x.reason : ''} is=${x.inputSeq ?? '-'} lc=${x.lc} m=${x.miss} d=${x.depth}`) : null,
        });
      }
    }
    const final = await stats(guest);
    const shadow = await ev(guest, 'const g = n.session.debugGuest(); return g && g.shadow ? g.shadow.stats() : null;').catch(() => null);
    const serverStats = await admin(srv, '/stats').catch(() => null);
    const summ = (arr) => {
      const v = arr.filter((x) => x !== null && x !== undefined);
      return v.length ? { n: v.length, p50: r2(pct(v, 50)), p90: r2(pct(v, 90)), p95: r2(pct(v, 95)), max: r2(Math.max(...v)) } : { n: 0 };
    };
    const groups = {};
    for (const r of recs) {
      const key2 = `${r.path}/${r.kind}/${r.why}`;
      (groups[key2] ||= []).push(r);
    }
    const byGroup = {};
    for (const [k2, list] of Object.entries(groups)) byGroup[k2] = { inGame: summ(list.map((x) => x.inGameMs)), plan: summ(list.map((x) => x.planMs)) };
    const res = {
      spec,
      version: out.version,
      inGame: final.mispredictRetractMs,
      predicted: final.predictedActions,
      confirmed: final.confirmedActions,
      retractions: final.retractions,
      snapshotsPerSec: final.snapshotsPerSec,
      rttMs: final.rttMs,
      lossInPct: final.lossInPct,
      snapGapMs: summ(snapGaps),
      forced: FORCE ? { mode: FORCE, pulses: forced, periodS: FORCE_PERIOD, downS: FORCE_DOWN } : null,
      shadow: shadow ? { retractsByPath: shadow.retractsByPath || null, stateConfirmed: shadow.stateConfirmed ?? null, pendingOpen: shadow.pendingOpen ?? null, byKind: shadow.byKind } : null,
      probe: { inGame: summ(recs.map((x) => x.inGameMs)), plan: summ(recs.map((x) => x.planMs)), fromK3: summ(recs.map((x) => x.fromK3Ms)), sincePredict: summ(recs.map((x) => x.sincePredictMs)) },
      byGroup,
      denialReasons: denials.reduce((a, d) => ((a[`${d.type}:${d.kind}:${d.reason}`] = (a[`${d.type}:${d.kind}:${d.reason}`] || 0) + 1), a), {}),
      slowest: recs.filter((x) => x.planMs !== null).sort((a, b) => b.planMs - a.planMs).slice(0, 12),
      server: serverStats && serverStats.peers ? serverStats.peers.filter((pp) => pp.peerId === guestPeer || peerIds.includes(pp.peerId)).map((pp) => ({ peerId: pp.peerId, cond: pp.conditioner || pp.cond || null })) : null,
      pageErrors: { host: host.errors ? host.errors.slice(0, 5) : [], guest: guest.errors ? guest.errors.slice(0, 5) : [] },
    };
    out.conditions[key] = res;
    console.log(`[${key}] ${out.version} inGame ${JSON.stringify(res.inGame)} | plan ${JSON.stringify(res.probe.plan)} | snapGap ${JSON.stringify(res.snapGapMs)} | pred ${res.predicted} conf ${res.confirmed} retr ${res.retractions} | shadow ${JSON.stringify(res.shadow)}`);
    for (const [k2, v] of Object.entries(byGroup)) console.log(`   ${k2}: inGame ${JSON.stringify(v.inGame)} plan ${JSON.stringify(v.plan)}`);
  }
  await shapeGuestLinks(srv, peerIds, null);
} catch (err) {
  console.error("PROBE ERROR", err && err.stack ? err.stack : err);
  out.error = String(err && err.message);
} finally {
  const file = resolve(here, 'captures', `gntfixM5b1-retract-${TAG}.json`);
  writeFileSync(file, JSON.stringify(out, null, 1));
  console.log('->', file);
  for (const b of bots) {
    try {
      b.stop();
    } catch {
      /* ignore */
    }
  }
  await browser.close().catch(() => null);
  process.exit(0);
}
