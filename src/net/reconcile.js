// Own-seat movement prediction + reconciliation (docs/gauntlet/PLAN.md §3.7
// "Guest input, prediction, reconciliation"). Owner: M5b.
//
// A guest predicts its own seat's body locally, one step per input frame,
// with the host's own model (sim/remote.js: walk at class speed × status
// speedMul, the Healer's dodge rules, swept dash). Every authoritative
// snapshot carries lastInputSeqConsumed (k) for this guest:
//   1. prediction error = | predicted position after frame k − the host's
//      position after consuming frame k | (predErr, the gate's number);
//   2. rewind: the body is reset to the host's state at k and every later
//      unacknowledged frame is replayed on top (dodge acceptance re-evaluated
//      against the host's dodge timer);
//   3. the visual jump (old predicted − new predicted) becomes an offset that
//      decays with τ = 100 ms, never more than 0.1 u per rendered frame;
//      errors above 1.0 u snap (the offset is dropped).
// Rendering runs AHEAD by the partial tick: px/pz = the current predicted
// position, x/z = that plus the next frame's step with the freshest input,
// so a key pressed between ticks moves the body on the next rendered frame.
import { stepHumanMove, dodgeVelocity, aimDir, moveOf, DOWNED_CRAWL_SPEED, HUMAN_DODGE, HEALER_MOVE_SPEED } from '../sim/remote.js';
import { speedMul, isStunned } from '../sim/status.js';
import { ALLY_CLASSES } from '../sim/allies.js';
import { TICK_HZ } from '../core/constants.js';
import { CORRECTION_TAU_MS, CORRECTION_SNAP_U } from './protocol/constants.js';
import { SEAT_CLASSES } from './seats.js';
import { pct } from './protocol/snapshot.js';

const TICK_DT = 1 / TICK_HZ;
const MAX_CORRECTION_PER_FRAME = 0.1;

export function createOwnSeat({ seat }) {
  const classId = SEAT_CLASSES[seat];
  const baseSpeed = seat === 0 ? HEALER_MOVE_SPEED : ALLY_CLASSES[classId] ? ALLY_CLASSES[classId].moveSpeed : 2.4;
  let body = null;
  let authTick = 0;
  let authSeq = 0;
  const hist = []; // { seq, si, x, z }
  let prev = { x: 0, z: 0 };
  let cur = { x: 0, z: 0 };
  const off = { x: 0, z: 0 };
  let lastMove = { x: 0, z: 0 };
  // Motion-start lead: when a move key goes down between two 60 Hz ticks, the
  // first rendered frames draw the body START_LEAD of a tick along the held
  // direction (never less than the frame alpha) until the next input frame
  // carries the step itself — so a keydown moves the body on the very next
  // rendered frame even when that frame runs no tick. Monotonic: the next
  // tick lands a full step ahead of the lead.
  const START_LEAD = 0.5;
  let startLead = 0;
  let wasMoving = false;
  // A dodge press the action shadow accepted between two ticks: drawn at once
  // (dash pose + START_LEAD of the dash step) until the input frame carrying
  // it is stepped (onLocalFrame applies the real dodge — or refuses it and
  // the preview is dropped).
  let dodgePreview = null; // { x, z } per tick
  const stats = { predErr: [], predErrMax: 0, corrections: 0, snaps: 0, maxCorrectionPerFrame: 0, reconciles: 0, replayed: 0, teleports: 0, handoffs: 0 };
  // Authoritative TELEPORTS (the host re-seats the party at a room / camp
  // boundary): a body that moved farther between two snapshots than any
  // walk, dash or push can carry it is re-based at once — not a prediction
  // error, not a correction to smooth.
  let lastAuth = null;
  const TELEPORT_PER_TICK = 0.2;
  const TELEPORT_SLACK = 0.6;

  // timers: the seat's input-frame timers replicated from the host
  // (allies seats block; null for seat 0, whose dodge runs on host ticks).
  function fromAuth(e, timers = null) {
    return {
      dodgeSeq: timers && Number.isFinite(timers.dodge) ? timers.dodge : 0,
      x: e.x,
      z: e.z,
      radius: e.radius ?? 0.3,
      hp: e.hp,
      dashTicksLeft: e.dashTicksLeft > 0 ? e.dashTicksLeft : 0,
      dashVel: e.dashVel && Number.isFinite(e.dashVel.x) ? { x: e.dashVel.x, z: e.dashVel.z } : { x: 0, z: 0 },
      dodgeReadyTick: Number.isFinite(e.dodgeReadyTick) ? e.dodgeReadyTick : 0,
      faceX: e.faceX ?? (e.facing ? e.facing.x : 0),
      faceZ: e.faceZ ?? (e.facing ? e.facing.z : 1),
      status: e.status,
    };
  }

  function speedAt(b, t) {
    if (!(b.hp > 0)) return DOWNED_CRAWL_SPEED;
    return baseSpeed * speedMul(b, t);
  }

  // One input frame on body b at host tick t (host order: move, then the
  // discrete dodge start for the next frame).
  function applyFrame(b, si, t) {
    for (const mv of si.moves) stepHumanMove(b, mv, speedAt(b, t));
    if (b.hp > 0 && si.aim) {
      const d = aimDir(b, si.aim, { x: b.faceX, z: b.faceZ });
      b.faceX = d.x;
      b.faceZ = d.z;
    }
    const ready = seat === 0 ? t >= b.dodgeReadyTick : si.seq >= b.dodgeSeq;
    if (si.presses.some((p) => p.kind === 'dodge') && b.hp > 0 && !isStunned(b, t) && ready && !(b.dashTicksLeft > 0)) {
      const mv = si.moves[si.moves.length - 1];
      b.dashVel = dodgeVelocity(b, mv, si.aim, { x: b.faceX, z: b.faceZ });
      b.dashTicksLeft = HUMAN_DODGE.durationTicks;
      b.dodgeReadyTick = t + HUMAN_DODGE.cooldownTicks;
      b.dodgeSeq = si.seq + HUMAN_DODGE.cooldownTicks;
      return true;
    }
    return false;
  }

  // A local 60 Hz input frame (the one just sent to the host).
  function onLocalFrame(si) {
    if (!body) return false;
    prev = { x: cur.x, z: cur.z };
    startLead = 0;
    dodgePreview = null;
    const t = authTick + (si.seq - authSeq);
    const dodged = applyFrame(body, si, t);
    cur = { x: body.x, z: body.z };
    lastMove = si.moves[si.moves.length - 1] || lastMove;
    hist.push({ seq: si.seq, si, x: body.x, z: body.z });
    if (hist.length > 240) hist.shift();
    return dodged;
  }

  // reconcile(authEntity, snapTick, k, timers, { handoff }) — newest decoded
  // snapshot. `handoff`: the seat's controller just changed (the host's
  // ally AI hands the body to this guest's frames — joining, returning from
  // away): the AI moved it while the guest's frames were not yet consumed,
  // so the body is re-based on the host's (like a teleport) — an ownership
  // change, never a prediction error or a correction snap.
  function reconcile(e, snapTick, k, timers = null, { handoff = false } = {}) {
    if (!e) return;
    stats.reconciles += 1;
    const kk = Number.isInteger(k) ? k : 0;
    if (!body) {
      lastAuth = { x: e.x, z: e.z, tick: snapTick };
      body = fromAuth(e, timers);
      authTick = snapTick;
      authSeq = kk;
      cur = { x: body.x, z: body.z };
      prev = { x: body.x, z: body.z };
      for (let i = hist.length - 1; i >= 0; i--) if (hist[i].seq <= kk) hist.splice(i, 1);
      return;
    }
    // An older ack (reordered snapshot): nothing new — except a handoff,
    // whose k is the first frame the host consumed from this guest (the
    // AI-phase re-base marked every sent frame as consumed).
    if (kk < authSeq && !handoff) return;
    const tele = !!lastAuth && Math.hypot(e.x - lastAuth.x, e.z - lastAuth.z) > TELEPORT_PER_TICK * Math.max(1, snapTick - lastAuth.tick) + TELEPORT_SLACK;
    lastAuth = { x: e.x, z: e.z, tick: snapTick };
    if (tele || handoff) {
      if (handoff) stats.handoffs += 1;
      else stats.teleports += 1;
      authTick = snapTick;
      authSeq = kk;
      while (hist.length && hist[0].seq <= kk) hist.shift();
      const b = fromAuth(e, timers);
      for (const x of hist) {
        applyFrame(b, x.si, authTick + (x.seq - kk));
        x.x = b.x;
        x.z = b.z;
      }
      body = b;
      cur = { x: b.x, z: b.z };
      prev = { x: b.x, z: b.z };
      off.x = 0;
      off.z = 0;
      return;
    }
    const h = hist.find((x) => x.seq === kk);
    if (h) {
      const err = Math.hypot(h.x - e.x, h.z - e.z);
      stats.predErr.push(err);
      if (stats.predErr.length > 1200) stats.predErr.shift();
      if (err > stats.predErrMax) stats.predErrMax = err;
    }
    authTick = snapTick;
    authSeq = kk;
    while (hist.length && hist[0].seq <= kk) hist.shift();
    const b = fromAuth(e, timers);
    for (const x of hist) {
      applyFrame(b, x.si, authTick + (x.seq - kk));
      x.x = b.x;
      x.z = b.z;
      stats.replayed += 1;
    }
    const dx = cur.x - b.x;
    const dz = cur.z - b.z;
    body = b;
    if (Math.abs(dx) > 1e-9 || Math.abs(dz) > 1e-9) {
      if (Math.hypot(dx, dz) > 0.01) stats.corrections += 1;
      off.x += dx;
      off.z += dz;
      prev = { x: prev.x - dx, z: prev.z - dz };
      cur = { x: b.x, z: b.z };
      if (Math.hypot(off.x, off.z) > CORRECTION_SNAP_U) {
        off.x = 0;
        off.z = 0;
        prev = { x: cur.x, z: cur.z };
        stats.snaps += 1;
      }
    }
  }

  // Per rendered frame: decay the correction offset and return the pose to
  // write into the replica's own-seat entity. `heldMove` = the freshest
  // sampled move (0..8 index or {x,z}) for the render-ahead step.
  function render(dtMs, heldMove, alpha = null) {
    if (!body) return null;
    const mag = Math.hypot(off.x, off.z);
    if (mag > 0) {
      let k = Math.exp(-Math.max(0, dtMs) / CORRECTION_TAU_MS);
      let step = mag * (1 - k);
      if (step > MAX_CORRECTION_PER_FRAME) {
        step = MAX_CORRECTION_PER_FRAME;
        k = 1 - step / mag;
      }
      if (step > stats.maxCorrectionPerFrame) stats.maxCorrectionPerFrame = step;
      off.x *= k;
      off.z *= k;
      if (Math.hypot(off.x, off.z) < 1e-4) {
        off.x = 0;
        off.z = 0;
      }
    }
    let vx = 0;
    let vz = 0;
    let moving = false;
    let previewing = false;
    if (body.dashTicksLeft > 0) {
      vx = body.dashVel.x;
      vz = body.dashVel.z;
    } else if (dodgePreview) {
      vx = dodgePreview.x;
      vz = dodgePreview.z;
      previewing = true;
      if (startLead < START_LEAD) startLead = START_LEAD;
      wasMoving = true;
    } else {
      const mv = typeof heldMove === 'number' ? moveOf(heldMove) : heldMove || { x: 0, z: 0 };
      const s = speedAt(body, authTick) * TICK_DT;
      vx = mv.x * s;
      vz = mv.z * s;
      moving = mv.x !== 0 || mv.z !== 0;
    }
    if (!previewing) {
      if (moving && !wasMoving) startLead = START_LEAD;
      else if (!moving) startLead = 0;
      wasMoving = moving;
    }
    let px = cur.x + off.x;
    let pz = cur.z + off.z;
    if (alpha !== null && startLead > alpha) {
      // px/x written so the layers' lerp (px + (x - px) * alpha) lands on
      // the lead point with the same velocity.
      px = cur.x + off.x + vx * (startLead - alpha);
      pz = cur.z + off.z + vz * (startLead - alpha);
    }
    return {
      px,
      pz,
      x: px + vx,
      z: pz + vz,
      faceX: body.faceX,
      faceZ: body.faceZ,
      dashing: body.dashTicksLeft > 0 || previewing,
      dashTicksLeft: body.dashTicksLeft,
      offset: Math.hypot(off.x, off.z),
    };
  }

  // previewDodge(moveIndex, aim) — the shadow accepted a dodge press this
  // frame: the dash direction by the §5 rule (move, else aim, else facing).
  function previewDodge(moveIndex, aim) {
    if (!body || !(body.hp > 0) || body.dashTicksLeft > 0) return;
    const mv = typeof moveIndex === 'number' ? moveOf(moveIndex) : moveIndex || { x: 0, z: 0 };
    dodgePreview = dodgeVelocity(body, mv, aim, { x: body.faceX, z: body.faceZ });
  }

  return {
    onLocalFrame,
    reconcile,
    render,
    previewDodge,
    get ready() {
      return !!body;
    },
    get body() {
      return body;
    },
    get pos() {
      return body ? { x: cur.x + off.x, z: cur.z + off.z } : null;
    },
    get lastMove() {
      return lastMove;
    },
    reset() {
      body = null;
      lastAuth = null;
      hist.length = 0;
      off.x = 0;
      off.z = 0;
    },
    stats: () => ({
      predErrP95: stats.predErr.length ? Math.round(pct(stats.predErr, 0.95) * 1000) / 1000 : null,
      predErrP50: stats.predErr.length ? Math.round(pct(stats.predErr, 0.5) * 1000) / 1000 : null,
      predErrMax: Math.round(stats.predErrMax * 1000) / 1000,
      predErrSamples: stats.predErr.length,
      corrections: stats.corrections,
      snaps: stats.snaps,
      teleports: stats.teleports,
      handoffs: stats.handoffs,
      maxCorrectionPerFrame: Math.round(stats.maxCorrectionPerFrame * 1000) / 1000,
      reconciles: stats.reconciles,
      pendingFrames: hist.length,
    }),
    resetStats() {
      stats.predErr.length = 0;
      stats.predErrMax = 0;
      stats.corrections = 0;
      stats.snaps = 0;
      stats.maxCorrectionPerFrame = 0;
    },
  };
}
