// Own-action prediction — the guest's ACTION SHADOW (docs/gauntlet/PLAN.md
// §3.7 "Own-action prediction", Source / Overwatch model). Owner: M5b.
//
// The shadow holds the guest seat's kit cooldowns, basic interval and dodge
// timer in INPUT-FRAME units (the seq the press rides), re-seeded from every
// authoritative snapshot (host tick T consumed frame k: a timer ready at host
// tick R is ready at frame k + (R − T)). When a local press is accepted by
// the shadow (off cooldown, not Downed, not stunned, not mid-dash) the guest
// presents it on the SAME rendered frame:
//   (1) a predicted copy of the presentation event goes through bus.replay()
//       — { predicted: true, predId: '<seq>:<kind>' } — so the ally layer
//       plays the swing / cast (wedge, ring, rig clip) and the audio engine
//       its cue at once; projectiles get a render-only COSMETIC bolt (no
//       registry spawn, ui/net/cosmetics.js);
//   (2) the HUD cooldown tile starts (the VIEW-SEAT provider reads the shadow).
// Reconciliation: the host tags every event of a human seat's input with
// { seat, inputSeq }. The authoritative copy of a predicted action (same
// seat, same kind, inputSeq within ±3 frames — a drained buffer or a
// starved tick can shift a hold-repeat by a frame) is SUPPRESSED (no second
// sound or swing). A `seat_denied` for it, or proof that the host consumed
// the frame without it (a snapshot with lastInputSeqConsumed ≥ seq AND the
// reliable event stream delivered through that snapshot's tick), RETRACTS
// it: `presentation_retract { predId }` is replayed, the cosmetic removed and
// the cooldown tile restored. Damage numerals, hit reactions and kills are
// never predicted (authoritative only).
import { ALLY_KITS, ALLY_CLASSES } from '../sim/allies.js';
import { fanDirections, countFinal, clampPlacement } from '../sim/shapes.js';
import { aimDir } from '../sim/remote.js';
import { TICK_HZ, DODGE } from '../core/constants.js';
import { SEAT_CLASSES } from './seats.js';
import { pct } from './protocol/snapshot.js';

const secTicks = (s) => Math.round(s * TICK_HZ);
const CD_FLOOR = secTicks(0.5);
const MATCH_WINDOW = 3;
const r2 = (v) => Math.round(v * 100) / 100;

export function createActionShadow({ bus, seat, cosmetics = null, now = () => performance.now() }) {
  const classId = SEAT_CLASSES[seat];
  const kit = seat > 0 ? ALLY_KITS[classId] : null;
  const S = seat > 0 ? ALLY_CLASSES[classId] : null;
  const enabled = !!(kit && S);
  const readyAt = [0, 0, 0, 0];
  let basicAt = 0;
  let dodgeAt = 0;
  let curSeq = 0;
  const pending = []; // { predId, kind, slot, seq, t, keyAt, prevReady, matched, retracted, provenAt, consumedTick }
  const stats = { predicted: 0, confirmed: 0, retracted: 0, feedbackMs: [], retractMs: [], deniedRetracts: 0, lateRetracts: 0, byKind: {} };

  const cdTicks = (def) => Math.max(CD_FLOOR, secTicks(def.cd));

  function record(kind, slot, seq, keyAt, prevReady) {
    const p = { predId: `${seq}:${kind}`, kind, slot, seq, t: now(), keyAt, prevReady, matched: false, retracted: false, provenAt: null, consumedTick: null };
    pending.push(p);
    if (pending.length > 64) pending.shift();
    stats.predicted += 1;
    stats.byKind[kind] = (stats.byKind[kind] || 0) + 1;
    if (Number.isFinite(keyAt)) {
      stats.feedbackMs.push(Math.max(0, p.t - keyAt));
      if (stats.feedbackMs.length > 600) stats.feedbackMs.shift();
    }
    return p;
  }

  // press(kind, ctx) — ctx: { seq (the frame the press will ride), body
  // {x, z, hp, faceX, faceZ}, aim, entityId, tick (host-tick estimate),
  // stunned, dashing, keyAt (keydown timeStamp) } -> predId | null
  function press(kind, ctx) {
    if (!enabled || !ctx.body || !(ctx.body.hp > 0) || ctx.stunned) return null;
    curSeq = Math.max(curSeq, ctx.seq - 1);
    const b = ctx.body;
    const d = aimDir(b, ctx.aim, { x: b.faceX ?? 0, z: b.faceZ ?? 1 });
    if (kind === 'dodge') {
      if (ctx.dashing || ctx.seq < dodgeAt) return null;
      const prev = dodgeAt;
      dodgeAt = ctx.seq + DODGE.cooldownTicks;
      const p = record('dodge', -1, ctx.seq, ctx.keyAt, prev);
      replay({ tick: ctx.tick, type: 'ally_dodge', id: ctx.entityId, partyIndex: seat, classId, dx: r2(d.x), dz: r2(d.z), predicted: true, predId: p.predId, seat });
      return p.predId;
    }
    const m = /^skill_(\d)$/.exec(kind);
    if (!m) return null;
    const slot = Number(m[1]) - 1;
    const def = kit[slot];
    if (!def || ctx.dashing || ctx.seq < readyAt[slot]) return null;
    const prev = readyAt[slot];
    readyAt[slot] = ctx.seq + cdTicks(def);
    const p = record(kind, slot, ctx.seq, ctx.keyAt, prev);
    const cast = { tick: ctx.tick, type: 'ally_cast', id: ctx.entityId, partyIndex: seat, classId, skill: def.id, slot, shape: def.shape, power: def.power, cd: def.cd, target: null, x: r2(b.x), z: r2(b.z), dx: r2(d.x), dz: r2(d.z), targets: [], predicted: true, predId: p.predId, seat };
    if (def.shape === 'melee_arc') {
      cast.reach = def.range;
      cast.halfAngle = def.area;
    } else if (def.shape === 'nova') cast.radius = def.area;
    else if (def.shape === 'projectile') {
      cast.count = countFinal(def.count);
      if (cosmetics) for (const fd of fanDirections(d.x, d.z, def.count)) cosmetics.spawnBolt({ predId: p.predId, skill: def.id, x: b.x, z: b.z, dirX: fd.x, dirZ: fd.z, speed: def.speed, range: def.range });
    } else if (def.shape === 'ground_aoe') {
      const pos = clampPlacement(b, ctx.aim ? { x: ctx.aim.x, z: ctx.aim.z } : { x: b.x + d.x, z: b.z + d.z }, def.range);
      cast.zx = r2(pos.x);
      cast.zz = r2(pos.z);
      cast.radius = def.area;
      if (cosmetics) cosmetics.ring({ predId: p.predId, x: pos.x, z: pos.z, radius: def.area });
    }
    replay(cast);
    return p.predId;
  }

  // basic(ctx) — the held basic, evaluated every frame the button is down
  // (first shot on the press frame, then at the class interval).
  function basic(ctx) {
    if (!enabled || !ctx.body || !(ctx.body.hp > 0) || ctx.stunned) return null;
    if (ctx.seq < basicAt) return null;
    const prev = basicAt;
    basicAt = ctx.seq + S.attackIntervalTicks;
    if (ctx.dashing) return null; // the host denies + re-arms (priority_suppressed)
    const b = ctx.body;
    const d = aimDir(b, ctx.aim, { x: b.faceX ?? 0, z: b.faceZ ?? 1 });
    const p = record('basic', -1, ctx.seq, ctx.keyAt, prev);
    const ev = { tick: ctx.tick, type: 'ally_basic', id: ctx.entityId, partyIndex: seat, classId, shape: S.basicShape, x: r2(b.x), z: r2(b.z), dx: r2(d.x), dz: r2(d.z), targets: [], predicted: true, predId: p.predId, seat };
    if (S.basicShape === 'melee_arc') {
      ev.reach = S.basicRange;
      ev.halfAngle = S.basicHalfAngle;
    } else if (cosmetics) cosmetics.spawnBolt({ predId: p.predId, skill: `${classId}_basic`, x: b.x, z: b.z, dirX: d.x, dirZ: d.z, speed: S.basicSpeed, range: S.basicRange });
    replay(ev);
    return p.predId;
  }

  function replay(ev) {
    try {
      bus.replay(ev);
    } catch (err) {
      console.warn('[net] predicted event listener threw', err);
    }
  }

  const kindOf = (ev) => {
    if (ev.type === 'ally_basic') return 'basic';
    if (ev.type === 'ally_dodge') return 'dodge';
    if (ev.type === 'ally_cast') return `skill_${(ev.slot ?? -1) + 1}`;
    if (ev.type === 'seat_denied') return ev.kind === 'basic_attack' ? 'basic' : ev.kind;
    return null;
  };

  function retract(p, why) {
    if (p.retracted || p.matched) return;
    p.retracted = true;
    stats.retracted += 1;
    if (why === 'denied') stats.deniedRetracts += 1;
    else stats.lateRetracts += 1;
    const from = p.provenAt ?? now();
    stats.retractMs.push(Math.max(0, now() - from));
    if (stats.retractMs.length > 600) stats.retractMs.shift();
    if (p.kind === 'dodge') dodgeAt = Math.min(dodgeAt, p.prevReady);
    else if (p.kind === 'basic') basicAt = Math.min(basicAt, p.prevReady);
    else if (p.slot >= 0) readyAt[p.slot] = Math.min(readyAt[p.slot], p.prevReady);
    if (cosmetics) cosmetics.remove(p.predId);
    replay({ tick: 0, type: 'presentation_retract', predId: p.predId, kind: p.kind, reason: why, seat, view: true });
  }

  // An authoritative event arrived (EVENTS batch). true = it confirms a
  // prediction: suppress its replay.
  function onAuthEvent(ev) {
    if (!enabled || ev.seat !== seat || !Number.isInteger(ev.inputSeq)) return false;
    const kind = kindOf(ev);
    if (!kind) return false;
    let best = null;
    for (const p of pending) {
      if (p.kind !== kind || p.matched || p.retracted) continue;
      const dd = Math.abs(p.seq - ev.inputSeq);
      if (dd <= MATCH_WINDOW && (!best || dd < Math.abs(best.seq - ev.inputSeq))) best = p;
    }
    if (ev.type === 'seat_denied') {
      if (best) {
        best.provenAt = now();
        retract(best, 'denied');
      }
      return false; // the denial itself replays (HUD nudge + deny cue)
    }
    if (best) {
      best.matched = true;
      stats.confirmed += 1;
      if (cosmetics) cosmetics.confirm(best.predId);
      return true;
    }
    return false;
  }

  // A snapshot proved the host consumed frames <= k at host tick `snapTick`.
  function onConsumed(k, snapTick) {
    if (!Number.isInteger(k)) return;
    const t = now();
    for (const p of pending) {
      if (p.matched || p.retracted || p.consumedTick !== null) continue;
      if (p.seq + MATCH_WINDOW <= k) {
        p.consumedTick = snapTick;
        p.provenAt = t;
      }
    }
  }

  // The reliable event stream has been delivered through host tick T:
  // every proven prediction still unmatched there was not performed.
  function onEventsThrough(T) {
    for (const p of pending) {
      if (p.matched || p.retracted || p.consumedTick === null) continue;
      if (T >= p.consumedTick) retract(p, 'absent');
    }
    while (pending.length && (pending[0].matched || pending[0].retracted) && now() - pending[0].t > 3000) pending.shift();
  }

  // Re-seed the timers from the authoritative entity (host tick T consumed k).
  function reseed(e, T, k) {
    if (!enabled || !e || !Number.isInteger(k)) return;
    const open = (kind) => pending.some((p) => p.kind === kind && !p.matched && !p.retracted && p.seq > k);
    if (Array.isArray(e.cds)) {
      for (let i = 0; i < 4; i++) {
        if (open(`skill_${i + 1}`)) continue;
        readyAt[i] = k + Math.max(0, (e.cds[i] ?? 0) - T);
      }
    }
    if (Number.isFinite(e.nextBasicTick) && !open('basic')) basicAt = k + Math.max(0, e.nextBasicTick - T);
    if (Number.isFinite(e.dodgeReadyTick) && !open('dodge')) dodgeAt = k + Math.max(0, e.dodgeReadyTick - T);
  }

  // HUD provider (commandbar VIEW-SEAT): the four kit tiles + dodge, in
  // ticks remaining from the current local frame.
  function slotsView(seqNow = curSeq) {
    if (!enabled) return null;
    return kit.map((def, i) => ({ id: def.id, abbrev: def.abbrev, passive: false, remainingTicks: Math.max(0, readyAt[i] - seqNow), totalTicks: cdTicks(def) }));
  }
  const dodgeView = (seqNow = curSeq) => ({ remaining: Math.max(0, dodgeAt - seqNow), total: DODGE.cooldownTicks });

  return {
    press,
    basic,
    onAuthEvent,
    onConsumed,
    onEventsThrough,
    reseed,
    slotsView,
    dodgeView,
    setSeq(s) {
      curSeq = s;
    },
    get enabled() {
      return enabled;
    },
    pending: () => pending.map((p) => ({ ...p })),
    stats: () => ({
      predicted: stats.predicted,
      confirmed: stats.confirmed,
      retractions: stats.retracted,
      deniedRetracts: stats.deniedRetracts,
      lateRetracts: stats.lateRetracts,
      ownActionFeedbackMs: stats.feedbackMs.length
        ? { p50: Math.round(pct(stats.feedbackMs, 0.5) * 10) / 10, p95: Math.round(pct(stats.feedbackMs, 0.95) * 10) / 10, max: Math.round(Math.max(...stats.feedbackMs) * 10) / 10, n: stats.feedbackMs.length }
        : null,
      mispredictRetractMs: stats.retractMs.length ? { p50: Math.round(pct(stats.retractMs, 0.5) * 10) / 10, p95: Math.round(pct(stats.retractMs, 0.95) * 10) / 10, n: stats.retractMs.length } : null,
      byKind: { ...stats.byKind },
    }),
    resetStats() {
      stats.feedbackMs.length = 0;
      stats.retractMs.length = 0;
    },
  };
}
