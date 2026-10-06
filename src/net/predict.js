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
//
// Reconciliation: the host tags every event of a human seat's input with
// { seat, inputSeq } (an interact is matched by `by` = this seat's body). The
// authoritative copy of a predicted action (same seat, same kind, inputSeq
// within ±3 frames — a drained buffer or a starved tick can shift a
// hold-repeat by a frame) is SUPPRESSED (no second sound or swing). A
// `seat_denied` for it, or proof that the host consumed the frame without
// it, RETRACTS it: `presentation_retract { predId }` is replayed, the
// cosmetic removed and the cooldown tile restored.
//
// The proof is STATE-BASED and exact (fix-M5b-r1, NET-F1 — loss-robust,
// never waiting on the reliable event stream's retransmit): the seat's
// replicated timers say on which input frame the host last FIRED each kind
// (`cds[slot] − cd`, `dodge − cooldown`, and `fire` for the basic — whose
// `basic` timer also moves on a dash suppression / §5 re-arm). At the first
// snapshot whose lastInputSeqConsumed covers a prediction's match window,
// a host fire inside the window CONFIRMS it by state (the event copy still
// suppresses the replay when it arrives), a last fire before the window —
// or after it but too close to be a second one — RETRACTS it at once
// (PLAN §3.7 "within one snapshot"). Only the ambiguous case (the first
// covering snapshot already lies a full interval past the window) and an
// interact (no timer) wait for the reliable event stream.
//
// The held basic is predicted with the host's own §4/§5 rule run over a LOG
// of this guest's input frames (held basic, dashing after the frame's
// movement step, a dash that ended on it, alive, stunned, revive channel,
// fresh press): the timer is rebuilt at every snapshot from the host's
// timer at k plus every local frame after k — the way the movement
// predictor rebuilds position — never from the host's stale value alone (a
// re-seed that dropped the local dash re-arms made the guest swing ~40
// frames early after every dodge), it is never moved back by a retraction
// (that re-fired a newer prediction one frame later), and it is evaluated
// on EVERY input frame the guest sends (session.js `frame()` after the
// frame's step; the pre-step `basic()` sample keeps the same-frame feedback
// of a fresh press), so a predicted swing lands on the host's frame. Damage
// numerals, hit reactions and kills are never predicted (authoritative
// only).
import { ALLY_KITS, ALLY_CLASSES } from '../sim/allies.js';
import { fanDirections, countFinal, clampPlacement } from '../sim/shapes.js';
import { aimDir } from '../sim/remote.js';
import { TICK_HZ, DODGE } from '../core/constants.js';
import { SEAT_CLASSES } from './seats.js';
import { pct } from './protocol/snapshot.js';

const secTicks = (s) => Math.round(s * TICK_HZ);
const CD_FLOOR = secTicks(0.5);
const MATCH_WINDOW = 3;
// Input frames of local frame log kept while no snapshot trims it (6 s).
const LOG_KEEP = 360;
// A prediction the state confirmed waits this long for its event copy
// before the event stream may still retract it (safety valve only).
const STATE_CONFIRM_GRACE_MS = 2000;
const FLAG_KEYS = ['basic', 'dashing', 'dashEnd', 'alive', 'stunned', 'channelling', 'fresh'];
const r2 = (v) => Math.round(v * 100) / 100;

// kit (PARTY, BUILD_BRIEF §25.7): () => the seat's CURRENT loadout as the
// replica holds it — per slot { id, abbrev, def (resolved: Quicken etc.),
// cdTicks, passive } | null — so tiles, cooldowns and predicted casts follow
// swaps, reorders and sockets. Without it (or before the first snapshot)
// the §7 starting kit.
export function createActionShadow({ bus, seat, cosmetics = null, now = () => performance.now(), kit: kitFn = null, dodgeCd = () => DODGE.cooldownTicks }) {
  const classId = SEAT_CLASSES[seat];
  const staticKit = seat > 0 && ALLY_KITS[classId] ? ALLY_KITS[classId].map((d) => ({ id: d.id, abbrev: d.abbrev, def: d, cdTicks: Math.max(CD_FLOOR, secTicks(d.cd)), passive: false })) : null;
  const kitNow = () => {
    let k = null;
    try {
      k = kitFn ? kitFn() : null;
    } catch {
      k = null;
    }
    return k || staticKit;
  };
  const S = seat > 0 ? ALLY_CLASSES[classId] : null;
  const enabled = !!(staticKit && S);
  const INTERVAL = enabled ? S.attackIntervalTicks : 0;
  const readyAt = [0, 0, 0, 0];
  let basicAt = 0;
  let dodgeAt = 0;
  let curSeq = 0;
  const pending = []; // { predId, kind, slot, seq, t, keyAt, prevReady, matched, retracted, stateConfirmed, provenAt, consumedTick }
  const stats = { predicted: 0, confirmed: 0, retracted: 0, feedbackMs: [], retractMs: [], deniedRetracts: 0, lateRetracts: 0, byKind: {}, byPath: { state: 0, denied: 0, events: 0, local: 0 }, stateConfirmed: 0 };
  // Local frame log: seq -> what the host's §4/§5 basic rule reads on that
  // input frame (the frames this guest SENT, plus the provisional entry of
  // the frame about to be sent), kept back to the newest consumed seq.
  //   { basic, dashing, dashEnd, alive, stunned, channelling, fresh,
  //     tIn (the basic timer before the frame), act ('fire' | 'suppress' |
  //     null), predId }
  const frameLog = new Map();
  let lastEvalSeq = -1;
  // The host's own timers as the newest snapshot replicated them (kept even
  // while a prediction is open) — a retraction restores THESE, never an
  // older local guess (else a retracted skill would re-fire at once).
  let lastAuth = null; // { cds: [4], basic, dodge, fire, k }

  const cdOf = (kind, slot) => {
    if (kind === 'dodge') return dodgeCd(); // RELICS: Ash Feather
    if (kind === 'basic') return INTERVAL;
    const k = slot >= 0 ? kitNow() : null;
    return k && k[slot] ? k[slot].cdTicks : null;
  };
  const isOpen = (p) => !p.matched && !p.retracted;
  const openNear = (kind, seq) => pending.some((p) => p.kind === kind && isOpen(p) && Math.abs(p.seq - seq) <= MATCH_WINDOW);
  // The newest timer an OPEN prediction of a kind implies (-Infinity: none).
  function openTimer(kind) {
    let t = -Infinity;
    for (const p of pending) if (p.kind === kind && isOpen(p)) t = Math.max(t, p.seq + cdOf(kind, p.slot));
    return t;
  }

  function record(kind, slot, seq, keyAt, prevReady) {
    const p = { predId: `${seq}:${kind}`, kind, slot, seq, t: now(), keyAt, prevReady, matched: false, retracted: false, stateConfirmed: false, provenAt: null, consumedTick: null };
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
      dodgeAt = ctx.seq + dodgeCd();
      const p = record('dodge', -1, ctx.seq, ctx.keyAt, prev);
      replay({ tick: ctx.tick, type: 'ally_dodge', id: ctx.entityId, partyIndex: seat, classId, dx: r2(d.x), dz: r2(d.z), predicted: true, predId: p.predId, seat });
      return p.predId;
    }
    const m = /^skill_(\d)$/.exec(kind);
    if (!m) return null;
    const slot = Number(m[1]) - 1;
    const kitE = kitNow();
    const ent = kitE ? kitE[slot] : null;
    const def = ent ? ent.def : null;
    // An empty slot / a passive: the host denies it (nothing to predict);
    // mid-dash or a displaced cast still pending: suppressed there.
    if (!def || ent.passive || ctx.dashing || ctx.pending || ctx.seq < readyAt[slot]) return null;
    const prev = readyAt[slot];
    readyAt[slot] = ctx.seq + ent.cdTicks;
    const p = record(kind, slot, ctx.seq, ctx.keyAt, prev);
    const cast = { tick: ctx.tick, type: 'ally_cast', id: ctx.entityId, partyIndex: seat, classId, skill: ent.id, slot, shape: def.shape, power: def.power, cd: def.cd, target: null, x: r2(b.x), z: r2(b.z), dx: r2(d.x), dz: r2(d.z), targets: [], predicted: true, predId: p.predId, seat };
    if (def.parry) cast.parry = def.parry.windowTicks;
    if (def.shape === 'melee_arc') {
      cast.reach = def.range;
      cast.halfAngle = def.area;
    } else if (def.shape === 'nova') cast.radius = def.area;
    else if (def.shape === 'projectile') {
      cast.count = countFinal(def.count);
      if (cosmetics) for (const fd of fanDirections(d.x, d.z, def.count)) cosmetics.spawnBolt({ predId: p.predId, skill: ent.id, x: b.x, z: b.z, dirX: fd.x, dirZ: fd.z, speed: def.speed, range: def.range });
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

  // ---- the held basic: the host's rule (sim/allies.js humanContinuous +
  // resolveHuman) over one logged input frame. `T` is the seat's basic timer
  // (an input-frame seq) before the frame; returns it after the frame and
  // what the host does on it: 'fire' (a swing), 'suppress' (mid-dash: denied
  // priority_suppressed, timer still restarted), null.
  function ruleStep(T, seq, e) {
    if (e.dashEnd && e.basic) T = seq + INTERVAL; // §5: a dash that ends with the basic held
    let act = null;
    if (e.alive && e.basic && seq >= T && !e.stunned && (!e.channelling || e.fresh)) {
      act = e.dashing ? 'suppress' : 'fire';
      T = seq + INTERVAL;
    }
    return { T, act };
  }
  const entryOf = (ctx, held) => ({ basic: !!held, dashing: !!ctx.dashing, dashEnd: !!ctx.dashEnd, alive: !!(ctx.body && ctx.body.hp > 0), stunned: !!ctx.stunned, channelling: !!ctx.channelling, fresh: !!ctx.fresh, tIn: basicAt, act: null, predId: null });
  function trimLog() {
    while (frameLog.size > LOG_KEEP) frameLog.delete(frameLog.keys().next().value);
  }
  function presentBasic(seq, ctx) {
    const b = ctx.body;
    const d = aimDir(b, ctx.aim, { x: b.faceX ?? 0, z: b.faceZ ?? 1 });
    const p = record('basic', -1, seq, ctx.keyAt, 0);
    const ev = { tick: ctx.tick, type: 'ally_basic', id: ctx.entityId, partyIndex: seat, classId, shape: S.basicShape, x: r2(b.x), z: r2(b.z), dx: r2(d.x), dz: r2(d.z), targets: [], predicted: true, predId: p.predId, seat };
    if (S.basicShape === 'melee_arc') {
      ev.reach = S.basicRange;
      ev.halfAngle = S.basicHalfAngle;
    } else if (cosmetics) cosmetics.spawnBolt({ predId: p.predId, skill: `${classId}_basic`, x: b.x, z: b.z, dirX: d.x, dirZ: d.z, speed: S.basicSpeed, range: S.basicRange });
    replay(ev);
    return p.predId;
  }
  // Run the rule on the newest logged frame; a fire is presented unless an
  // open basic prediction already sits within the match window (one host
  // swing matches one prediction — never two predictions for one swing).
  function stepFrame(seq, e, ctx) {
    e.tIn = basicAt;
    const r = ruleStep(basicAt, seq, e);
    basicAt = r.T;
    e.act = r.act;
    if (r.act === 'fire' && ctx.body && !openNear('basic', seq)) e.predId = presentBasic(seq, ctx);
    return e.predId;
  }

  // basic(ctx) — the held basic on the PRE-STEP sample of the frame about to
  // be sent (session.js sampleFrame: the rendered frame, or the press event
  // itself — the fresh press is presented the moment it is dispatched). ctx
  // adds { stunned, dashing, channelling, fresh, keyAt } to press()'s.
  function basic(ctx) {
    if (!enabled || !ctx.body || !Number.isInteger(ctx.seq)) return null;
    const seq = ctx.seq;
    if (seq <= lastEvalSeq || frameLog.has(seq)) return null; // one evaluation per input frame
    const e = entryOf(ctx, true);
    frameLog.set(seq, e);
    lastEvalSeq = seq;
    trimLog();
    return stepFrame(seq, e, ctx);
  }

  // frame(ctx) — the input frame `ctx.seq` as SENT, after its movement step
  // (session.js guestTick, every 60 Hz frame): ctx = { seq, basic (held as
  // sent), body, aim, entityId, tick, stunned, channelling, fresh, dashing
  // (after the step), dashEnd (the dash ended on this step) }. Logs the
  // frame; evaluates the held basic on it when no pre-step sample did (a
  // rendered frame that ran two ticks, a hitch); when the frame differs
  // from the sample it was predicted on (the button released between them,
  // a dodge the step refused) the frame is re-run: a prediction the sent
  // frame cannot produce is retracted locally at once.
  function frame(ctx) {
    if (!enabled || !Number.isInteger(ctx.seq)) return null;
    const seq = ctx.seq;
    const flags = entryOf(ctx, ctx.basic);
    let e = frameLog.get(seq);
    if (e) {
      if (FLAG_KEYS.some((k) => e[k] !== flags[k])) {
        basicAt = e.tIn;
        const predId = e.predId;
        for (const k of FLAG_KEYS) e[k] = flags[k];
        const r = ruleStep(basicAt, seq, e);
        basicAt = r.T;
        e.act = r.act;
        if (predId !== null && r.act !== 'fire') {
          const p = pending.find((q) => q.predId === predId);
          if (p && isOpen(p)) {
            p.provenAt = now();
            retract(p, 'absent', null, 'local');
          }
          e.predId = null;
        } else if (predId === null && r.act === 'fire' && ctx.body && !openNear('basic', seq)) e.predId = presentBasic(seq, ctx);
      }
    } else {
      e = flags;
      frameLog.set(seq, e);
      stepFrame(seq, e, ctx);
    }
    if (seq > lastEvalSeq) lastEvalSeq = seq;
    trimLog();
    return e.predId;
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

  // retract(p, why, reason, path) — why: 'denied' | 'absent' | 'reset';
  // path: 'state' (a snapshot proved it), 'denied' (a denial event),
  // 'events' (the reliable stream delivered through the consumed tick
  // without it), 'local' (the sent frame could not produce it).
  function retract(p, why, reason = null, path = 'events') {
    if (!isOpen(p)) return;
    p.retracted = true;
    stats.retracted += 1;
    stats.byPath[path] = (stats.byPath[path] || 0) + 1;
    if (why === 'denied') stats.deniedRetracts += 1;
    else stats.lateRetracts += 1;
    const from = p.provenAt ?? now();
    stats.retractMs.push(Math.max(0, now() - from));
    if (stats.retractMs.length > 600) stats.retractMs.shift();
    // Timers: the basic's is rebuilt from the host's own timer at every
    // snapshot and never moved back here (the retracted swing's local
    // restart stays until the next snapshot re-derives it); a skill / dodge
    // timer returns to the host's value, or to a NEWER open prediction's.
    const auth = (v) => (Number.isFinite(v) ? v : null);
    if (p.kind === 'dodge') dodgeAt = Math.max(auth(lastAuth && lastAuth.dodge) ?? p.prevReady, openTimer('dodge'));
    else if (p.slot >= 0) readyAt[p.slot] = Math.max(auth(lastAuth && lastAuth.cds && lastAuth.cds[p.slot]) ?? p.prevReady, openTimer(p.kind));
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
        if (p.kind === 'interact' && isOpen(p)) {
          best = p;
          break;
        }
      }
    } else {
      for (const p of pending) {
        if (p.kind !== kind || !isOpen(p)) continue;
        const dd = Math.abs(p.seq - ev.inputSeq);
        if (dd <= MATCH_WINDOW && (!best || dd < Math.abs(best.seq - ev.inputSeq))) best = p;
      }
    }
    if (ev.type === 'seat_denied' || ev.type === 'interact_denied') {
      if (best) {
        best.provenAt = now();
        retract(best, 'denied', ev.reason ?? null, 'denied');
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
      if (!isOpen(p) || p.consumedTick !== null) continue;
      if (p.seq + MATCH_WINDOW <= k) {
        p.consumedTick = snapTick;
        p.provenAt = t;
      }
    }
  }

  // The reliable event stream has been delivered through host tick T:
  // every proven prediction still unmatched there was not performed — except
  // one the state confirmed, whose event copy is still on its way.
  function onEventsThrough(T) {
    const t = now();
    for (const p of pending) {
      if (!isOpen(p) || p.consumedTick === null) continue;
      if (p.stateConfirmed && t - (p.provenAt ?? p.t) < STATE_CONFIRM_GRACE_MS) continue;
      if (T >= p.consumedTick) retract(p, 'absent', null, 'events');
    }
    while (pending.length && !isOpen(pending[0]) && t - pending[0].t > 3000) pending.shift();
  }

  // Re-seed from the host's replicated seat timers (allies seats block:
  // absolute INPUT-FRAME seqs — exact, no tick mapping) at snapshot k;
  // `alive` = the seat's body had hp > 0 in that snapshot.
  function reseed(timers, k, alive = true) {
    if (!enabled || !timers || !Number.isInteger(k)) return;
    lastAuth = { cds: Array.isArray(timers.cds) ? timers.cds.slice() : null, basic: timers.basic, dodge: timers.dodge, fire: Number.isInteger(timers.fire) ? timers.fire : null, k };
    // STATE-BASED proof: the input frame the host last fired each kind on.
    for (const p of pending) {
      if (!isOpen(p) || p.stateConfirmed || p.kind === 'interact') continue;
      const cd = cdOf(p.kind, p.slot);
      if (!Number.isFinite(cd)) continue;
      let fired = null;
      if (p.kind === 'basic') {
        if (lastAuth.fire !== null) fired = lastAuth.fire;
        else if (Number.isFinite(timers.basic) && timers.basic < p.seq + cd - MATCH_WINDOW) fired = -Infinity; // an older host: timer only
      } else {
        const auth = p.kind === 'dodge' ? timers.dodge : Array.isArray(timers.cds) ? timers.cds[p.slot] : null;
        if (Number.isFinite(auth)) fired = auth - cd;
      }
      if (fired === null) continue;
      const dd = fired - p.seq;
      if (Math.abs(dd) <= MATCH_WINDOW) {
        // A host fire inside the window (consumed or not): its event copy is
        // on its way and will match.
        p.stateConfirmed = true;
        stats.stateConfirmed += 1;
      } else if (p.seq + MATCH_WINDOW > k) {
        // Window not consumed yet. A Downed body (hp <= 0 at k) cannot act on
        // any later frame either (a revive takes seconds): every open
        // prediction is a phantom — retracted on THIS snapshot, not the one
        // that covers the window.
        if (!alive) {
          p.provenAt = now();
          retract(p, 'absent', null, 'state');
        }
      } else if (dd < 0 || dd < cd - MATCH_WINDOW) {
        // No fire in the window: the last one is older, or later but too
        // close to have followed one there.
        p.provenAt = now();
        retract(p, 'absent', null, 'state');
      }
      // else: ambiguous (a later fire that may be the second after one in
      // the window) — the event stream decides.
    }
    // Skills / dodge: the host's timer, unless a prediction the host has not
    // consumed yet holds a newer local one.
    const open = (kind) => pending.some((p) => p.kind === kind && isOpen(p) && p.seq > k);
    if (Array.isArray(timers.cds)) {
      for (let i = 0; i < 4; i++) {
        if (open(`skill_${i + 1}`)) continue;
        readyAt[i] = timers.cds[i] ?? 0;
      }
    }
    if (Number.isFinite(timers.dodge) && !open('dodge')) dodgeAt = timers.dodge;
    // Basic: the host's timer at k run forward through every local frame
    // after k (the frames the host will consume next).
    if (Number.isFinite(timers.basic)) rebuildBasic(k, timers.basic);
  }
  function rebuildBasic(k, T) {
    for (const seq of frameLog.keys()) {
      if (seq > k) break;
      frameLog.delete(seq);
    }
    let t = T;
    for (const [seq, e] of frameLog) {
      e.tIn = t;
      const r = ruleStep(t, seq, e);
      t = r.T;
      e.act = r.act;
    }
    basicAt = t;
  }

  // HUD provider (commandbar VIEW-SEAT): the four kit tiles + dodge, in
  // ticks remaining from the current local frame.
  function slotsView(seqNow = curSeq) {
    if (!enabled) return null;
    const k = kitNow();
    return k.map((e, i) => (e ? { id: e.id, abbrev: e.abbrev, passive: !!e.passive, remainingTicks: e.passive ? 0 : Math.max(0, readyAt[i] - seqNow), totalTicks: e.cdTicks } : null));
  }
  const dodgeView = (seqNow = curSeq) => ({ remaining: Math.max(0, dodgeAt - seqNow), total: dodgeCd() });

  // reset() — a new authority / timeline (migration, return from away): every
  // open prediction is meaningless now and is retracted quietly; the log and
  // timers restart from the next snapshot.
  function reset() {
    for (const p of pending) {
      if (!isOpen(p)) continue;
      p.retracted = true; // not a mispredict: no stats
      if (cosmetics) cosmetics.remove(p.predId);
      replay({ tick: 0, type: 'presentation_retract', predId: p.predId, kind: p.kind, reason: 'reset', seat, view: true });
    }
    pending.length = 0;
    frameLog.clear();
    lastAuth = null;
    basicAt = 0;
    dodgeAt = 0;
    readyAt.fill(0);
  }

  return {
    press,
    basic,
    frame,
    interact,
    isOwn,
    onAuthEvent,
    onConsumed,
    onEventsThrough,
    reseed,
    reset,
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
      retractsByPath: { ...stats.byPath },
      stateConfirmed: stats.stateConfirmed,
      pendingOpen: pending.filter(isOpen).length,
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

// ---------------------------------------------------------------------------
// Own build-page decisions — the guest's PARTY SHADOW (fix-M5b-r6, NET6-F1).
//
// A guest decides its OWN party-page card (PLAN §16.5: the character's owner
// decides), but the card lives in the host's sim and reaches the guest through
// the interpolated replica — ~0.3-0.4 s after a press at N1. Without
// prediction the Replaces mark moved only when that echo came back, every
// press inside the round trip cycled from the stale mark (2 of 6 presses
// lost) and Enter sent the stale mark (the wrong skill replaced, for good).
//
// The card is predicted exactly like movement (input-sequence
// reconciliation): each own `party` CMD that changes the card — `replace`
// (the W / S, wheel, D-pad, click Replaces mark) and `pick` (Take / Leave,
// with the mark it commits) — is kept as a pending op under its cmdSeq, and
// the run view the guest's UI reads is the replicated card with every pending
// op re-applied in order. Both ops are idempotent SETS, so re-applying one the
// replicated state already carries changes nothing (no flicker however the
// ack and the snapshot interleave). An op retires when
//   · the host's `party_ack { re, tick }` arrived AND the applied replica
//     state is past that host tick (the state now carries the op), or
//   · the host refused it (`command_rejected { re }` — the HUD says why), or
//   · its card is gone: the page committed, another candidate / page is up,
//     or the seat is no longer human-held (the AI / a timeout decides), or
//   · PARTY_PENDING_MAX_MS passed without an ack (a CMD lost to a host
//     change) — the replicated card then shows; acked ops are held at most
//     twice that while the replica catches up.
// Single-player and the host never create a shadow (presentation-only; the
// sim, the replica, the state hash and the bus are untouched).
export const PARTY_PENDING_MAX_MS = 4000;

export function createPartyShadow({ seat, now = () => performance.now(), maxMs = PARTY_PENDING_MAX_MS } = {}) {
  let pending = []; // { seq, op: 'replace'|'pick', slot, choice, replace, key, at, ackAt, ackTick }
  let shown = null; // { key, replace, decided, choice } the prediction last showed
  const st = { predicted: 0, acked: 0, rejected: 0, retired: 0, dropped: 0, expired: 0, corrections: 0, maxPending: 0, ackMs: [] };
  const cardOf = (view) => {
    const p = view && view.party;
    return p && Array.isArray(p.cards) ? p.cards[seat] ?? null : null;
  };
  // A card instance: the page (room + the tick it opened) and the candidate.
  const keyOf = (view) => {
    const c = cardOf(view);
    return c ? `${view.party.room}:${view.party.openedTick}:${c.type}:${c.id}` : null;
  };
  const humanHeld = (view) => {
    const o = view && view.party && view.party.owners;
    return !!o && o[seat] === 'human';
  };
  function applyOp(c, p) {
    if (p.op === 'replace') {
      if (c.swap) c.replace = p.slot;
    } else if (p.op === 'pick') {
      c.decided = true;
      c.choice = p.choice;
      c.by = 'human';
      if (c.swap && Number.isInteger(p.replace)) c.replace = p.replace;
    }
  }
  // Would the host accept this op on the card the guest sees now? (the same
  // checks as sim/partypage.js setReplace / pick — never predict a refusal).
  function valid(view, body) {
    const c = cardOf(view);
    if (!c || !humanHeld(view)) return false;
    if (body.op === 'replace') return !!c.swap && Number.isInteger(body.slot) && body.slot >= 0 && body.slot < 4;
    if (body.op === 'pick') return (body.choice === 'take' || body.choice === 'leave') && !(body.choice === 'take' && !c.type);
    return false;
  }
  return {
    // Record an own CMD just sent (seq = its cmdSeq). Returns true when it
    // is predicted (the view shows it from now on).
    push(seq, body, view) {
      if (!valid(view, body)) return false;
      const replace = body.op === 'pick' && Number.isInteger(body.replace) && body.replace >= 0 && body.replace < 4 ? body.replace : null;
      pending.push({ seq, op: body.op, slot: body.op === 'replace' ? body.slot : null, choice: body.op === 'pick' ? body.choice : null, replace, key: keyOf(view), at: now(), ackAt: null, ackTick: null });
      st.predicted += 1;
      if (pending.length > st.maxPending) st.maxPending = pending.length;
      return true;
    },
    ack(seq, tick) {
      const p = pending.find((q) => q.seq === seq);
      if (!p || p.ackTick !== null) return false;
      p.ackTick = Number.isFinite(tick) ? tick : -1;
      p.ackAt = now();
      st.acked += 1;
      st.ackMs.push(p.ackAt - p.at);
      if (st.ackMs.length > 200) st.ackMs.shift();
      return true;
    },
    reject(seq) {
      const n = pending.length;
      pending = pending.filter((q) => q.seq !== seq);
      if (pending.length === n) return false;
      st.rejected += 1;
      return true;
    },
    // The guest UI's view of the run: the replicated card + the pending ops.
    // `appliedTick` = the host tick of the replica state this view was read from.
    view(v, appliedTick) {
      if (pending.length === 0 && !shown) return v;
      const key = keyOf(v);
      const held = humanHeld(v);
      const t = now();
      pending = pending.filter((p) => {
        if (p.key !== key || !held) {
          st.dropped += 1;
          return false;
        }
        if (p.ackTick !== null && Number.isFinite(appliedTick) && appliedTick > p.ackTick) {
          st.retired += 1;
          return false;
        }
        if (t - p.at > (p.ackTick === null ? maxMs : maxMs * 2)) {
          st.expired += 1;
          return false;
        }
        return true;
      });
      const c = cardOf(v);
      if (pending.length === 0 || !c) {
        // Reconciled: the replicated card shows again. A visible correction
        // only when it differs from what the prediction last showed on the
        // same card (a refused / expired op, or a host-side override).
        if (shown && c && shown.key === key && held && (shown.replace !== c.replace || shown.decided !== c.decided || shown.choice !== c.choice)) st.corrections += 1;
        shown = null;
        return v;
      }
      const card = { ...c };
      for (const p of pending) applyOp(card, p);
      shown = { key, replace: card.replace, decided: card.decided, choice: card.choice };
      const cards = v.party.cards.slice();
      cards[seat] = card;
      return { ...v, party: { ...v.party, cards } };
    },
    pendingCount: () => pending.length,
    pending: () => pending.map((p) => ({ ...p })),
    clear() {
      pending = [];
      shown = null;
    },
    stats: () => {
      const a = [...st.ackMs].sort((x, y) => x - y);
      const q = (f) => (a.length ? Math.round(a[Math.min(a.length - 1, Math.floor(a.length * f))]) : null);
      return { predicted: st.predicted, acked: st.acked, rejected: st.rejected, retired: st.retired, dropped: st.dropped, expired: st.expired, corrections: st.corrections, pending: pending.length, maxPending: st.maxPending, ackMs: a.length ? { p50: q(0.5), p95: q(0.95), n: a.length } : null };
    },
  };
}
