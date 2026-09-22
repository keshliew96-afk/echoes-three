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
// E (interact) presents the asset's use flourish + a press cue on the press
// frame; its outcome (heal, stun, lever) stays authoritative.
// Reconciliation: the host tags every event of a human seat's input with
// { seat, inputSeq } (an interact is matched by `by` = this seat's body). The authoritative copy of a predicted action (same
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
    if (ctx.channelling && !ctx.fresh) return null;
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

  // interact(ctx) — E on the predicted body. ctx.target = the interactable the
  // sim's own reach rule picks on the guest's predicted position ({ id,
  // itype, x, z }; the caller already skipped E-as-revive and spent / closed
  // assets). Presented at once: the asset's use flourish (a predicted
  // `interact` on the view bus -> the rig's onUse) and a short press cue; the
  // OUTCOME (heal, stun, lever) stays authoritative. The host's `interact` /
  // `interact_denied` by this seat's body confirms / retracts it.
  let ownEntity = null;
  function interact(ctx) {
    if (!enabled || !ctx.body || !(ctx.body.hp > 0) || !ctx.target) return null;
    ownEntity = ctx.entityId;
    const p = record('interact', -1, ctx.seq, ctx.keyAt, 0);
    p.targetId = ctx.target.id;
    replay({ tick: ctx.tick, type: 'interact', id: ctx.target.id, itype: ctx.target.itype, by: ctx.entityId, x: r2(ctx.target.x), z: r2(ctx.target.z), predicted: true, predId: p.predId, seat });
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
    if (ev.type === 'interact' || ev.type === 'interact_denied') return 'interact';
    return null;
  };
  // Events of this seat's own actions: tagged { seat, inputSeq } by the
  // host's human-seat resolution, or (interactables resolve in their own
  // pass) an interact / interact_denied BY this seat's body.
  const isOwnInteract = (ev) => (ev.type === 'interact' || ev.type === 'interact_denied') && ownEntity !== null && ev.by === ownEntity && !ev.predicted;
  const isOwn = (ev) => (ev.seat === seat && Number.isInteger(ev.inputSeq)) || isOwnInteract(ev);

  // The host's own timers as the newest snapshot replicated them (kept even
  // while a prediction is open) — a retraction restores THESE, never an
  // older local guess (else a retracted basic would re-fire at once).
  let lastAuth = null; // { cds: [4], basic, dodge }
  function retract(p, why, reason = null) {
    if (p.retracted || p.matched) return;
    p.retracted = true;
    stats.retracted += 1;
    if (why === 'denied') stats.deniedRetracts += 1;
    else stats.lateRetracts += 1;
    const from = p.provenAt ?? now();
    stats.retractMs.push(Math.max(0, now() - from));
    if (stats.retractMs.length > 600) stats.retractMs.shift();
    const auth = (v) => (Number.isFinite(v) ? v : -Infinity);
    if (p.kind === 'dodge') dodgeAt = Math.max(p.prevReady, auth(lastAuth && lastAuth.dodge));
    else if (p.kind === 'basic') {
      // A basic suppressed by a dash re-arms its full interval on the host.
      basicAt = reason === 'priority_suppressed' ? p.seq + S.attackIntervalTicks : Math.max(p.prevReady, auth(lastAuth && lastAuth.basic));
    } else if (p.slot >= 0) readyAt[p.slot] = Math.max(p.prevReady, auth(lastAuth && lastAuth.cds && lastAuth.cds[p.slot]));
    if (cosmetics) cosmetics.remove(p.predId);
    replay({ tick: 0, type: 'presentation_retract', predId: p.predId, kind: p.kind, reason: why, seat, view: true });
  }

  // An authoritative event arrived (EVENTS batch). true = it confirms a
  // prediction: suppress its replay.
  function onAuthEvent(ev) {
    if (!enabled || !isOwn(ev)) return false;
    const kind = kindOf(ev);
    if (!kind) return false;
    let best = null;
    if (kind === 'interact') {
      // No input seq on the interactables pass: the OLDEST open interact
      // prediction (the host resolves presses in input order).
      for (const p of pending) {
        if (p.kind === 'interact' && !p.matched && !p.retracted) {
          best = p;
          break;
        }
      }
    } else {
      for (const p of pending) {
        if (p.kind !== kind || p.matched || p.retracted) continue;
        const dd = Math.abs(p.seq - ev.inputSeq);
        if (dd <= MATCH_WINDOW && (!best || dd < Math.abs(best.seq - ev.inputSeq))) best = p;
      }
    }
    if (ev.type === 'seat_denied' || ev.type === 'interact_denied') {
      if (best) {
        best.provenAt = now();
        retract(best, 'denied', ev.reason ?? null);
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

  // Re-seed the timers from the host's replicated seat timers (allies seats
  // block: absolute INPUT-FRAME seqs — exact, no tick mapping). Timers of a
  // kind with a prediction the host has not consumed yet keep the local value.
  function reseed(timers, k) {
    if (!enabled || !timers || !Number.isInteger(k)) return;
    lastAuth = { cds: Array.isArray(timers.cds) ? timers.cds.slice() : null, basic: timers.basic, dodge: timers.dodge };
    // STATE-BASED disproof (loss-robust): the host consumed the frame this
    // prediction rode, and the seat timer it replicates is NOT on the
    // cooldown the action would have started -> the action did not happen.
    // Without this the retraction waits for the reliable event stream to be
    // delivered through that tick, which a retransmit can delay far past one
    // snapshot at 20 % loss (measured 188 ms at N2).
    for (const p of pending) {
      if (p.matched || p.retracted || p.kind === 'interact') continue;
      if (p.seq + MATCH_WINDOW > k) continue;
      const cd = p.kind === 'dodge' ? DODGE.cooldownTicks : p.kind === 'basic' ? S.attackIntervalTicks : p.slot >= 0 && kit[p.slot] ? cdTicks(kit[p.slot]) : null;
      const auth = p.kind === 'dodge' ? timers.dodge : p.kind === 'basic' ? timers.basic : Array.isArray(timers.cds) && p.slot >= 0 ? timers.cds[p.slot] : null;
      if (!Number.isFinite(cd) || !Number.isFinite(auth)) continue;
      if (auth < p.seq + cd - MATCH_WINDOW) {
        p.provenAt = now();
        retract(p, 'absent');
      }
    }
    const open = (kind) => pending.some((p) => p.kind === kind && !p.matched && !p.retracted && p.seq > k);
    if (Array.isArray(timers.cds)) {
      for (let i = 0; i < 4; i++) {
        if (open(`skill_${i + 1}`)) continue;
        readyAt[i] = timers.cds[i] ?? 0;
      }
    }
    if (Number.isFinite(timers.basic) && !open('basic')) basicAt = timers.basic;
    if (Number.isFinite(timers.dodge) && !open('dodge')) dodgeAt = timers.dodge;
  }

  // HUD provider (commandbar VIEW-SEAT): the four kit tiles + dodge, in
  // ticks remaining from the current local frame.
  function slotsView(seqNow = curSeq) {
    if (!enabled) return null;
    return kit.map((def, i) => ({ id: def.id, abbrev: def.abbrev, passive: false, remainingTicks: Math.max(0, readyAt[i] - seqNow), totalTicks: cdTicks(def) }));
  }
  const dodgeView = (seqNow = curSeq) => ({ remaining: Math.max(0, dodgeAt - seqNow), total: DODGE.cooldownTicks });

  // dashEnded(seq) — the predicted dash ended on frame `seq` with the basic
  // held: the host restarts the basic's full interval there (§5).
  function dashEnded(seq) {
    if (enabled) basicAt = seq + S.attackIntervalTicks;
  }

  return {
    press,
    basic,
    interact,
    dashEnded,
    isOwn,
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
