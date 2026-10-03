// Human-controlled party seats in network play (docs/gauntlet/PLAN.md §3.7
// "Guest input, prediction, reconciliation"). Owner: M5b.
//
// ONE movement / dodge model for a party body driven by an input frame
// instead of the §12 ally AI. The host sim (sim/allies.js, human seats) and
// the guest's own-seat predictor (net/predict.js) both step bodies through
// THESE functions, so a guest predicts exactly what the host will compute
// from the same input — the only prediction errors left are the ones the
// guest cannot know yet (a knock, a hazard push, a stun, a hitstop merge).
//
// Pure sim module: no DOM, no render imports, no wall clock, no RNG.
// Movement is per INPUT FRAME (one frame = one 60 Hz tick of that guest's
// clock): the host applies exactly one step per consumed frame, even when it
// drains two buffered frames in one host tick, so the guest's per-frame
// prediction and the host's per-frame resolution never drift apart.
import { TICK_HZ, DODGE, HEALER } from '../core/constants.js';
import { walkStep, sweptStep } from './movement.js';

const TICK_DT = 1 / TICK_HZ;

// §10: a Downed character crawls at 0.8 u/s (movement only, cannot act) —
// the same figure world.js applies to the Healer.
export const DOWNED_CRAWL_SPEED = 0.8;

// §5 dodge for human seats. PLAN §3.7: "human-controlled allies get the
// Healer's dodge rules" — distance, duration, cooldown, i-frames for the
// full travel window, wall contact ends the dash (swept, no slide).
export const HUMAN_DODGE = DODGE;

// The 8 move directions of the INPUT frame (codec.js: move 1..8 =
// E, NE, N, NW, W, SW, S, SE; 0 = none). Screen-up is -z (core/input.js).
// Both sides use THIS table — the guest predicts with the decoded vector,
// never with its raw keyboard vector, so encode/decode is bit-exact.
const D = Math.SQRT1_2;
export const MOVE_DIRS = Object.freeze([
  Object.freeze({ x: 0, z: 0 }),
  Object.freeze({ x: 1, z: 0 }),
  Object.freeze({ x: D, z: -D }),
  Object.freeze({ x: 0, z: -1 }),
  Object.freeze({ x: -D, z: -D }),
  Object.freeze({ x: -1, z: 0 }),
  Object.freeze({ x: -D, z: D }),
  Object.freeze({ x: 0, z: 1 }),
  Object.freeze({ x: D, z: D }),
]);

// moveIndex(x, z) -> 0..8: the nearest of the 8 directions (0 below 0.2 u/u).
export function moveIndex(x, z) {
  const len = Math.hypot(x || 0, z || 0);
  if (!(len > 0.2)) return 0;
  // angle measured with screen-up (-z) as +90°: E=0, NE=1, N=2 ... SE=7
  const a = Math.atan2(-z, x);
  const k = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  return k + 1;
}
export function moveOf(index) {
  return MOVE_DIRS[index >= 0 && index <= 8 ? index | 0 : 0];
}

// stepHumanMove(body, move, { speed }) — ONE input frame of movement.
//   body: { x, z, radius, dashTicksLeft, dashVel: {x, z}, hp }
//   move: { x, z } unit (or zero) — a MOVE_DIRS entry
//   speed: u/s for a walking step (class speed x status speedMul; the Downed
//          crawl is never scaled — the caller passes DOWNED_CRAWL_SPEED)
// Returns { dashed, ended, wall, moved }.
export function stepHumanMove(body, move, speed) {
  if (body.dashTicksLeft > 0) {
    const { hit } = sweptStep(body, body.dashVel.x, body.dashVel.z, body.radius);
    body.dashTicksLeft -= 1;
    if (hit) body.dashTicksLeft = 0;
    return { dashed: true, ended: body.dashTicksLeft === 0, wall: hit, moved: true };
  }
  if (move && (move.x !== 0 || move.z !== 0)) {
    walkStep(body, move.x * speed * TICK_DT, move.z * speed * TICK_DT, body.radius);
    return { dashed: false, ended: false, wall: false, moved: true };
  }
  return { dashed: false, ended: false, wall: false, moved: false };
}

// dodgeVelocity(body, move, aim, facing) -> { x, z } u per tick — §5 exactly
// as world.startDash: this frame's move vector; if zero, toward the aim; if
// the aim is degenerate, the last facing.
export function dodgeVelocity(body, move, aim, facing) {
  let dx = 0;
  let dz = 0;
  if (move && (move.x !== 0 || move.z !== 0)) {
    dx = move.x;
    dz = move.z;
  } else if (aim) {
    const ax = aim.x - body.x;
    const az = aim.z - body.z;
    const len = Math.hypot(ax, az);
    if (len > 1e-6) {
      dx = ax / len;
      dz = az / len;
    }
  }
  if (dx === 0 && dz === 0 && facing) {
    dx = facing.x;
    dz = facing.z;
  }
  if (dx === 0 && dz === 0) dx = 1;
  const perTick = HUMAN_DODGE.distance / HUMAN_DODGE.durationTicks;
  return { x: dx * perTick, z: dz * perTick };
}

// aimDir(body, aim, fallback) -> unit { x, z } toward the aim point; a
// degenerate aim (on the body) reuses the fallback (§6 last valid aim).
export function aimDir(body, aim, fallback = null) {
  if (aim) {
    const ax = aim.x - body.x;
    const az = aim.z - body.z;
    const len = Math.hypot(ax, az);
    if (len > 1e-4) return { x: ax / len, z: az / len };
  }
  if (fallback && (fallback.x !== 0 || fallback.z !== 0)) return { x: fallback.x, z: fallback.z };
  return { x: 0, z: 1 };
}

// Seat 0 (the Healer) walks at HEALER.moveSpeed; allies at their class speed
// (allies.js ALLY_CLASSES). Exported for the guest predictor.
export const HEALER_MOVE_SPEED = HEALER.moveSpeed;
