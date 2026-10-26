// QUILLBACK, MODEL STANDARD (docs/MODEL_STANDARD.md "Foes"). The classic
// quillback of enemies/archetypes.js (BUILD_BRIEF §23.5 charger: "a round
// dome wrapped in radial quills, a snout; indigo quill tips; rolls down its
// charge lane") with the sample video's technique laid ON TOP of its chibi ink
// look: the same grey-blue dome, pale cool quills, dark snout and stub feet,
// charcoal slit eyes and the one indigo tell (the quill tips, the halo over
// the back). What it gains:
//
//   * faceted masses: the dome is cut into flat planes with a strong value
//     step, and its underside steps darker (a belly saddle, no extra call);
//   * a QUILL COAT, BAKED per kind (render/facet/foe.js) so a room of them
//     shares one buffer, kept to the classic's read (a slate ball under long
//     radial spikes, full silhouette ink): a main layer of long BANDED quills
//     (a slate root band in the hide's own value, the pale shaft) standing
//     near radial with indigo spearhead tips (bright and dim alternating),
//     the tallest along the spine; a short fur raked back over the hide, in
//     the hide's own value and draw call (texture, never a pale tuft). Every
//     quill base is closed and sunk along the hide's normal, past the coat's
//     flare. The spine crest is the only part that moves on its own: seven
//     quills on one instanced row that RAISE in the coil, kick upright on the
//     launch, and droop in the stagger;
//   * a head that TUCKS into the coat (the curl the Journal names), a muzzle
//     mask, brows, ears; WORLD-LOCKED FEET (render/facet/foelegs.js) on four
//     stub legs that fold into the ball for the roll;
//   * the CHARGE on its sim timing (sim/enemies/quillback.js): the lane
//     telegraph (48 ticks) is the coil (the curl, the quills rising, the press
//     down and the rock back of the classic's tell, a shiver building), the
//     launch strike runs in the telegraph's last 2.5 frames so it lands ON
//     the resolve tick, then the roll spins at the real travel (a slowed ball
//     rolls slower, a stunned one stops), each body it rams squashes it
//     (e.chargeHits, counted by length), and the roll ends either SPENT (a
//     lurch on the lost momentum, the spin running down FORWARD into the
//     upright, the uncurl with one overshoot) or on a WALL (the thud squash,
//     the bounce rolling BACK off the wall, the dazed 30-tick punish window
//     with drooping quills, the uncurl). A stun, blind or room clear on the
//     resolve never launches (only the sim's own charge mode does); a rig
//     built mid-charge joins the roll or the daze;
//   * the spawn-in grow (B7), named points (B8: the leading quills, the
//     snout), and the hit and death tuning the shared envelope reads.
//
// Not a repeating melee attack: the charge is one telegraphed commit per 240
// ticks, so it has its own timeline instead of a 3-hit chain (Kesh's template
// (a), the foe clause).
//
// Faces +Z. Same contract as the classic (group, mats, setYaw, pose) plus
// body (the yaw node the hit envelope wraps; the contact shadow stays on the
// group), lab (with lastStrike: the tick the launch lands), react, death,
// points. Render only: the sim, its timing and damage untouched.
import { BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Euler, IcosahedronGeometry, Group, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { makeGlowSprite } from '../../glow.js';
import { markShared } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_DIM, TELL_INDIGO_GLOW } from '../style.js';
import { facetize, hash01 } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, SPAWN_SEC, bakeParts, scaleGeometry, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, lerpFields, namedPoint, placeBody, settle, spawnScale } from '../../facet/foe.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';

// --- The sim's quillback (sim/enemies/quillback.js) -------------------------
const TICK_HZ = 60;
const TEL_TICKS = 48; // the lane telegraph
const STRIKE_TICKS = 5; // the launch: 2.5 frames at 30 fps, the telegraph's last 5 ticks
const STAGGER_TICKS = 30; // a wall ends the charge in a 30-tick stagger
export const TEL_SEC = TEL_TICKS / TICK_HZ;
const STRIKE_SEC = STRIKE_TICKS / TICK_HZ;
const COIL_SEC = TEL_SEC - STRIKE_SEC;
const CHARGE_SEC = 60 / TICK_HZ; // rolls up to 60 ticks
const STAGGER_SEC = STAGGER_TICKS / TICK_HZ;
const WALK_SPEED = 1.5; // u/s
const ROLL_SPEED = 6.0; // u/s
const ROLL_R = 0.34; // the rolling radius (the ball's centre height)
const ROLL_RATE = ROLL_SPEED / ROLL_R; // rad/s at full roll

// --- Key poses. push: the body's shove along +z (u); lift: up (+) or pressed
// down (-), u; tilt: the body's lean (+ forward, rad); roll: its roll; pitch:
// the BALL's pitch (+ rolls forward, - rocks back; the roll's spin adds to
// it); sx / sy / sz: the body's squash (wide, tall, long); tuck: the head
// curled into the coat (0..1); crest: the spine quills (-1 drooped, 0 raked
// at rest, 1 upright, past 1 the launch kick); bristle: the coat flared out
// (0..1+); legs: out (1) or folded into the ball (0); glow: the tell halo's
// lift; shiv: the pre-launch shiver; wob: the stagger's dazed wobble.
const REST = Object.freeze({ push: 0, lift: 0, tilt: 0, roll: 0, pitch: 0, sx: 1, sy: 1, sz: 1, tuck: 0, crest: 0, bristle: 0, legs: 1, glow: 0, shiv: 0, wob: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// The coil (the telegraph): curled in fast, then deepening, pressed down and
// rocked back onto the hind legs (the classic's tell: wider, shorter, nose up).
const COIL_IN = K({ push: -0.02, lift: -0.03, tilt: -0.02, pitch: -0.18, sx: 1.05, sy: 0.91, sz: 1.04, tuck: 1, crest: 0.8, bristle: 0.55, glow: 0.55 });
const COIL_END = K({ push: -0.05, lift: -0.05, tilt: -0.07, pitch: -0.4, sx: 1.09, sy: 0.86, sz: 1.06, tuck: 1, crest: 1, bristle: 1, glow: 1, shiv: 1 });
// The launch (the resolve tick): the hind legs drive it forward, stretched
// along the lane, leaning 22° in, the ball already rolling, the quills kicked.
const LAUNCH = K({ push: 0.08, lift: 0.03, tilt: 0.38, pitch: 0.32, sx: 0.93, sy: 0.97, sz: 1.17, tuck: 1, crest: 1.18, bristle: 1.2, glow: 1 });
// The roll: a tight ball, legs folded in (the spin adds to the pitch).
const ROLL = K({ push: 0.03, lift: 0.03, tilt: 0.08, pitch: 0.32, sx: 1, sy: 0.97, sz: 1.04, tuck: 1, crest: 1, bristle: 1, legs: 0, glow: 0.7 });
// Spent: the momentum dies, the ball lurches forward over its front.
const LURCH = K({ push: 0.06, lift: -0.01, tilt: 0.32, sx: 1.07, sy: 0.93, sz: 0.9, tuck: 1, crest: 1, bristle: 0.8, legs: 0.2, glow: 0.6 });
// A wall: the thud squash into it, the bounce back, the daze.
const THUD = K({ push: 0.05, tilt: 0.06, sx: 1.16, sy: 1.1, sz: 0.78, tuck: 1, crest: 1.25, bristle: 1.3, legs: 0, glow: 0.9 });
const RECOIL = K({ push: -0.08, lift: 0.06, tilt: -0.22, pitch: -0.35, sx: 0.96, sy: 1.06, sz: 1.05, tuck: 0.85, crest: 0.5, bristle: 0.6, legs: 0.6, glow: 0.6 });
const DAZE = K({ push: -0.02, lift: -0.025, tilt: -0.06, pitch: -0.12, sx: 1.06, sy: 0.93, tuck: 0.45, crest: -0.65, bristle: 0, legs: 1, glow: 0.15, wob: 1 });
export const QUILLBACK_REST = REST;
export const QUILLBACK_POSES = Object.freeze({ COIL_IN, COIL_END, LAUNCH, ROLL, LURCH, THUD, RECOIL, DAZE });

// Phase times (s).
const HOLD = 2 * FRAME; // the launch's contact hold
const ROLL_IN = 5 * FRAME; // the launch stretch relaxes into the roll (one overshoot)
const BUMP_HOLD = 2 * FRAME; // a rammed body: the squash holds two frames
const BUMP_OUT = 5 * FRAME;
const LURCH_SEC = 3 * FRAME;
const UNCURL_SEC = 0.4;
const THUD_SEC = 2 * FRAME;
const RECOIL_SEC = 5 * FRAME;
const LAND_SEC = 6 * FRAME;
const RECOVER_SEC = 0.38;
const ABORT_SEC = 6 * FRAME; // a false start: a flinch back (at rest by frame 2 to 3, one small overshoot)

const wrapPi = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
const clamp01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);

// --- Pure pose curves (the live rig and the lab share them) -----------------
// The coil, k 0..1 across the telegraph before the strike.
function coilPose(k, out) {
  if (k < 0.22) return lerpFields(out, REST, COIL_IN, ease.out(k / 0.22), FIELDS);
  lerpFields(out, COIL_IN, COIL_END, ease.inOut((k - 0.22) / 0.78), FIELDS);
  const s = clamp01((k - 0.45) / 0.55);
  out.shiv = s * s;
  return out;
}
// The launch, s 0..1 across its 2.5 frames: fast, accelerating into the lane;
// the quills (the weapon) kick at once (B4, no ramp).
function strikePose(s, out) {
  lerpFields(out, COIL_END, LAUNCH, ease.in(clamp01(s)), FIELDS);
  const kick = ease.out(clamp01(s * 3));
  out.crest = COIL_END.crest + (LAUNCH.crest - COIL_END.crest) * kick;
  out.bristle = COIL_END.bristle + (LAUNCH.bristle - COIL_END.bristle) * kick;
  out.shiv = 1 - clamp01(s * 2);
  return out;
}
// The roll, tr seconds after the launch's contact, `spin` rad rolled so far.
function rollPose(tr, spin, out) {
  if (tr < HOLD) {
    lerpFields(out, LAUNCH, LAUNCH, 0, FIELDS);
    out.legs = 1 - ease.out(tr / HOLD); // the legs fold in as it leaves
  } else if (tr < HOLD + ROLL_IN) {
    lerpFields(out, LAUNCH, ROLL, 1 - settle((tr - HOLD) / ROLL_IN), FIELDS);
    out.legs = 0; // folded in the hold, they stay folded
  } else lerpFields(out, ROLL, ROLL, 0, FIELDS);
  out.legs = Math.max(0, Math.min(1, out.legs));
  out.pitch += spin;
  out.lift += 0.008 * Math.abs(Math.sin(spin * 1.5)); // the quills bump the floor
  return out;
}
// A rammed body (B9's contact squash: +19% wide, -9% tall), tb seconds after.
function bumpPose(tb, out) {
  if (!(tb >= 0) || tb > BUMP_HOLD + BUMP_OUT) return out;
  const a = tb < BUMP_HOLD ? 1 : settle((tb - BUMP_HOLD) / BUMP_OUT);
  out.sx *= 1 + 0.19 * a;
  out.sy *= 1 - 0.09 * a;
  out.sz *= 1 - 0.1 * a;
  out.bristle += 0.25 * a;
  return out;
}
// The ball rolls only as far as the body travels: a short carry-on past the
// sim's stop (the lurch, about 0.3 rad forward; the bounce, about 0.38 rad
// back, its 0.13 u recoil at r 0.34), never a wheel-spin in place. The rest
// of the way to upright is the creature UNROLLING in place: the nearest way,
// slow (6 rad/s at most at its peak), with the tuck easing out alongside.
const TAU = 2 * Math.PI;
const UNROLL_RATE = 4; // rad/s on average (a smooth step peaks at 1.5x)
const smooth = (k) => k * k * (3 - 2 * k);
const nearestUp = (p, up = 0) => up + TAU * Math.round((p - up) / TAU);
// The stop's plan from the captured pitch: carry-on, then the unroll.
function stopPlan(p0, v0) {
  // the carry-on is the lurch's own travel (0.03 u = 0.09 rad): it stops
  // turning forward once the sim has stopped it (a ball stunned dead: none)
  const carry = 0.09 * clamp01(v0 / ROLL_RATE);
  const fwdUp = TAU * Math.ceil(p0 / TAU) - p0; // forward to the next upright
  const c = Math.min(carry, fwdUp); // it lands upright on the carry-on: done
  const rem = c < carry ? 0 : nearestUp(p0 + c) - (p0 + c);
  return { c, rem, dur: Math.max(UNCURL_SEC, Math.abs(rem) / UNROLL_RATE) };
}
// Spent: from the captured roll pose, the lurch on the lost momentum (the
// carry-on), then unrolling upright and uncurling with one overshoot (B5).
function stopPose(ts, cap, out, v0 = ROLL_RATE) {
  const pl = stopPlan(cap.pitch, v0);
  if (ts < LURCH_SEC) lerpFields(out, cap, LURCH, ease.out(ts / LURCH_SEC), FIELDS);
  else lerpFields(out, LURCH, REST, 1 - settle(clamp01((ts - LURCH_SEC) / pl.dur)), FIELDS);
  out.pitch = cap.pitch + pl.c * ease.out(clamp01(ts / LURCH_SEC)) + pl.rem * smooth(clamp01((ts - LURCH_SEC) / pl.dur));
  return out;
}
const stopSec = (cap, v0) => LURCH_SEC + stopPlan(cap.pitch, v0).dur;
// A wall: the thud, the bounce back, the daze held for as long as the sim
// staggers it. The bounce rolls the ball BACK off the wall by its recoil
// (never forward into the wall), then it unrolls to its dazed upright in
// place; the recovery finishes whatever is left.
const BOUNCE = 0.38;
// The bounce's plan: the recoil's roll back, then the unroll, ALWAYS the
// same way, back off the wall (never forward into it), up to one slow turn.
function thudPlan(p0) {
  const backUp = p0 - (DAZE.pitch + TAU * Math.floor((p0 - DAZE.pitch) / TAU)); // 0..2pi back to the upright
  const c = Math.min(BOUNCE, backUp);
  const rem = -(backUp - c);
  return { c, rem, dur: Math.min(1.2, Math.max(LAND_SEC, -rem / UNROLL_RATE)) };
}
// when the dazed ball is upright again (s after the wall)
const thudUpright = (p0) => THUD_SEC + 0.6 * RECOIL_SEC + thudPlan(p0).dur;
function thudPose(ts, cap, out) {
  if (ts < THUD_SEC) {
    lerpFields(out, cap, THUD, ease.out(ts / THUD_SEC), FIELDS);
    out.pitch = cap.pitch;
    return out;
  }
  if (ts < THUD_SEC + RECOIL_SEC) lerpFields(out, THUD, RECOIL, ease.out((ts - THUD_SEC) / RECOIL_SEC), FIELDS);
  else lerpFields(out, RECOIL, DAZE, 1 - settle(clamp01((ts - THUD_SEC - RECOIL_SEC) / LAND_SEC)), FIELDS);
  const { c, rem, dur } = thudPlan(cap.pitch);
  const t1 = ts - THUD_SEC;
  out.pitch = cap.pitch - c * ease.out(clamp01(t1 / RECOIL_SEC)) + rem * smooth(clamp01((t1 - 0.6 * RECOIL_SEC) / dur));
  return out;
}
// Back to rest from any captured pose, with one overshoot (B5).
function returnPose(ts, cap, dur, out) {
  return lerpFields(out, cap, REST, 1 - settle(clamp01(ts / dur)), FIELDS);
}

// --- The lab's abilities (pure in t) -----------------------------------------
const BUMP_AT = 0.32; // the lab's roll rams a body here
const tlCharge = createTimeline('charge', 'Charge roll', [
  { id: 'coil', label: 'coil (the lane telegraph): curl, quills up, rock back', dur: COIL_SEC },
  { id: 'strike', label: 'launch on the resolve tick', dur: STRIKE_SEC },
  { id: 'hold', label: 'launch held, legs fold in', dur: HOLD },
  { id: 'roll', label: 'roll at 6 u/s (rams a body: contact squash)', dur: CHARGE_SEC - HOLD },
  { id: 'lurch', label: 'spent: lurch on the lost momentum', dur: LURCH_SEC },
  { id: 'uncurl', label: 'roll on upright, uncurl (one overshoot)', dur: UNCURL_SEC },
], { cues: [{ at: TEL_SEC, id: 'strike' }] });
const CRASH_ROLL = 0.5;
// the lab's wall: the daze holds until the unroll is upright (or the
// stagger's 30 ticks, whichever is later)
const CRASH_HOLD = Math.max(STAGGER_SEC, thudUpright(wrapPi(rollPose(CRASH_ROLL, ROLL_RATE * CRASH_ROLL, { ...REST }).pitch)));
const tlCrash = createTimeline('crash', 'Charge into a wall', [
  { id: 'coil', label: 'coil (the lane telegraph): curl, quills up, rock back', dur: COIL_SEC },
  { id: 'strike', label: 'launch on the resolve tick', dur: STRIKE_SEC },
  { id: 'hold', label: 'launch held, legs fold in', dur: HOLD },
  { id: 'roll', label: 'roll at 6 u/s', dur: CRASH_ROLL - HOLD },
  { id: 'thud', label: 'wall: thud squash', dur: THUD_SEC },
  { id: 'recoil', label: 'bounce back, rolling back off the wall upright', dur: RECOIL_SEC },
  { id: 'daze', label: 'stagger: dazed, quills droop (the punish window)', dur: CRASH_HOLD - THUD_SEC - RECOIL_SEC },
  { id: 'recover', label: 'uncurl (one overshoot)', dur: RECOVER_SEC },
], { cues: [{ at: TEL_SEC, id: 'strike' }, { at: TEL_SEC + CRASH_ROLL, id: 'thud' }] });

const capA = { ...REST };
const capB = { ...REST };
// Pure: the charge (spent) at t, into out (the spin is in out.pitch).
function chargeAt(t, out) {
  if (t < COIL_SEC) return coilPose(t / COIL_SEC, out);
  if (t < TEL_SEC) return strikePose((t - COIL_SEC) / STRIKE_SEC, out);
  const end = TEL_SEC + CHARGE_SEC;
  if (t < end) {
    const tr = t - TEL_SEC;
    rollPose(tr, ROLL_RATE * tr, out);
    return bumpPose(tr - BUMP_AT, out);
  }
  rollPose(CHARGE_SEC, ROLL_RATE * CHARGE_SEC, capA);
  capA.pitch = wrapPi(capA.pitch);
  return stopPose(t - end, capA, out);
}
// Pure: the charge into a wall at t.
function crashAt(t, out) {
  if (t < TEL_SEC) return chargeAt(t, out);
  const wall = TEL_SEC + CRASH_ROLL;
  if (t < wall) return rollPose(t - TEL_SEC, ROLL_RATE * (t - TEL_SEC), out);
  rollPose(CRASH_ROLL, ROLL_RATE * CRASH_ROLL, capA);
  capA.pitch = wrapPi(capA.pitch);
  const free = wall + CRASH_HOLD;
  if (t < free) return thudPose(t - wall, capA, out);
  thudPose(CRASH_HOLD, capA, capB);
  capB.pitch = wrapPi(capB.pitch);
  return returnPose(t - free, capB, RECOVER_SEC, out);
}
// The classic twin's stand-in inputs at t (the lab's "Classic beside").
function classicInputs(t, wall) {
  const rollEnd = TEL_SEC + (wall ? CRASH_ROLL : CHARGE_SEC);
  const mode = t >= TEL_SEC && t < rollEnd ? 'charge' : wall && t >= rollEnd && t < rollEnd + STAGGER_SEC ? 'stagger' : 'approach';
  return { telegraphK: t < TEL_SEC ? 1 : 0, lungeK: 0, fireK: 0, e: { mode } };
}
function ability(tl, at, wall) {
  return Object.freeze({
    id: tl.id,
    label: tl.label,
    duration: tl.duration,
    sample: (t) => tl.sample(t),
    readout: (t) => tl.readout(t),
    cues: tl.cues,
    strikes: [TEL_SEC],
    pose: (t, out = { ...REST }) => at(t, out),
    classicAt: (t) => classicInputs(t, wall),
  });
}
export const QUILLBACK_CHARGE = ability(tlCharge, chargeAt, false);
export const QUILLBACK_CRASH = ability(tlCrash, crashAt, true);
export const QUILLBACK_ABILITIES = Object.freeze({ charge: QUILLBACK_CHARGE, crash: QUILLBACK_CRASH });

// --- Geometry (built once for the session, shared by every quillback) -------
const BALL_Y = 0.34;
const DOME = new Vector3(0.3, 0.27, 0.3); // the dome's radii (the classic's 0.3 icosahedron, 0.9 tall)
// Quill roots sink ALONG THE SURFACE NORMAL, past the faceted hide's inset
// (its flat planes sit up to 0.02 u inside the round dome), the root ring's
// tilt and the coat's flare, and every base is closed: no root lifts off the
// hide at rest, in the coil's flare or the thud's.
const SINK_N = 0.075; // the main quills (the coat flares to FLARE_MAX)
const FUR_SINK = 0.06; // the hide's short fur (raked 0.7 rad: its base ring tilts; never flares)
const CREST_SINK = 0.07; // the crest (it tilts up to about 0.55 rad, never flares)
const FLARE = 0.065; // the coat's scale per unit of bristle
const FLARE_MAX = 1 + FLARE * 1.2;
const HEAD0 = new Vector3(0, -0.04, 0.2); // the head's pivot, ball space
const FACE = new Vector3(0, -0.13, 1).normalize(); // the bare face, ball space
const BACK = new Vector3(0, -0.28, -1).normalize(); // the coat's rake: back and down

// The dome surface along a direction from the centre, and its outward normal.
function domeAt(dir, out, nrm) {
  const t = 1 / Math.sqrt((dir.x / DOME.x) ** 2 + (dir.y / DOME.y) ** 2 + (dir.z / DOME.z) ** 2);
  out.copy(dir).multiplyScalar(t);
  if (nrm) nrm.set(out.x / DOME.x ** 2, out.y / DOME.y ** 2, out.z / DOME.z ** 2).normalize();
  return out;
}
// An orthonormal frame: Y along `up`, Z as near `fwd` as it can be.
function basis(up, fwd, X, Y, Z) {
  Y.copy(up).normalize();
  Z.copy(fwd).addScaledVector(Y, -fwd.dot(Y));
  if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1).addScaledVector(Y, -Y.z);
  Z.normalize();
  X.crossVectors(Y, Z).normalize();
}
// A quill's direction: the surface normal raked by `rake` rad toward the back.
function rakeDir(N, rake, out) {
  const T = new Vector3().copy(BACK).addScaledVector(N, -BACK.dot(N));
  if (T.lengthSq() < 1e-4) T.set(0, -1, 0).addScaledVector(N, -N.y);
  T.normalize();
  return out.copy(N).multiplyScalar(Math.cos(rake)).addScaledVector(T, Math.sin(rake)).normalize();
}
// Golden-angle directions over the sphere.
function fib(n, off) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * 2.399963 + off;
    out.push(new Vector3(r * Math.cos(a), y, r * Math.sin(a)));
  }
  return out;
}
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
// A faceted (non-indexed) geometry without its top cap (the faces at y = 1).
function dropTopCap(g) {
  const pos = g.attributes.position;
  const keep = [];
  for (let i = 0; i + 2 < pos.count; i += 3) if (!(pos.getY(i) > 0.999 && pos.getY(i + 1) > 0.999 && pos.getY(i + 2) > 0.999)) keep.push(i);
  const out = new BufferGeometry();
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name];
    const arr = new Float32Array(keep.length * 3 * a.itemSize);
    keep.forEach((i, k) => {
      for (let j = 0; j < 3 * a.itemSize; j++) arr[k * 3 * a.itemSize + j] = a.array[i * a.itemSize + j];
    });
    out.setAttribute(name, new BufferAttribute(arr, a.itemSize));
  }
  out.userData.faceted = true;
  return out;
}
// The coat's quill placements (the roots check reads them; built with SET).
const LAYOUT = [];
export function quillbackCoatLayout() {
  geos();
  return LAYOUT;
}

// The spine crest (the instanced, moving quills): angle from the top toward
// the snout (+) or the rump (-), a hair off the midline, length, root radius.
const CREST = [
  [0.62, 0.025, 0.15, 0.044],
  [0.36, -0.03, 0.16, 0.048],
  [0.1, 0.03, 0.165, 0.05],
  [-0.16, -0.03, 0.165, 0.05],
  [-0.43, 0.03, 0.165, 0.048],
  [-0.72, -0.025, 0.17, 0.046],
  [-1.02, 0.02, 0.15, 0.044],
].map(([a, x, len, r]) => {
  const dir = new Vector3(x, Math.cos(a), Math.sin(a)).normalize();
  const P = new Vector3();
  const N = new Vector3();
  domeAt(dir, P, N);
  return Object.freeze({ a, x, len, r, P, N });
});
const CREST_RAKE = 0.15; // near radial at rest (a hair more raked than the coat)
const TIP_LEN = 0.09;
const TIP_R = 0.028; // the indigo spearhead's base (the classic's 0.03)

let SET = null;
function geos() {
  if (SET) return SET;
  const P = new Vector3();
  const N = new Vector3();
  const D = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const H = new Vector3();
  const m = new Matrix4();
  const set = {};
  // Quill parts: a four-sided shaft (root radius 1, tapering to 0.42) BANDED
  // like a real spine (a root band stepped down to the hide's slate, the pale
  // shaft: the ball keeps the classic's slate share under its spikes), its
  // root closed (the open top is under the tip); a closed spearhead tip (the
  // indigo tell); a closed short spike (the hide's fur).
  {
    // the root band is EXACTLY the hide's palette colour (quillBody) under
    // the quill material (quillSpine): a per-channel ratio, no new colour
    const BAND = { r: HIDE.quillBody.r / HIDE.quillSpine.r, g: HIDE.quillBody.g / HIDE.quillSpine.g, b: HIDE.quillBody.b / HIDE.quillSpine.b };
    const g = fz(new CylinderGeometry(0.42, 1, 1, 4, 2, false).translate(0, 0.5, 0), 0.14, 201);
    const pos = g.attributes.position;
    const col = g.attributes.color;
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      if (cy >= 0.5) continue;
      for (let j = i; j < i + 3; j++) col.setXYZ(j, col.getX(j) * BAND.r, col.getY(j) * BAND.g, col.getZ(j) * BAND.b);
    }
    set.shaft = dropTopCap(g);
  }
  set.tip = fz(new ConeGeometry(1, 1, 4, 1, false).translate(0, 0.5, 0), 0.12, 203);
  const spike = fz(new ConeGeometry(1, 1, 4, 1, false).translate(0, 0.5, 0), 0.14, 205);
  const place = (root, dir, sx, sy) => {
    basis(dir, H.set(0, 1, 0).cross(dir).lengthSq() > 1e-4 ? H.set(0, 1, 0) : H.set(0, 0, 1), X, Y, Z);
    return setTRS(m, root, X, Y, Z, sx, sy, sx).clone();
  };
  // The hide: the classic's faceted slate ball, its underside stepping
  // darker, and a short fur of hide-coloured spikes raked back over it (the
  // texture under the long quills, in the dome's own value and draw call).
  set.dome = bakeParts('quillback:hide', () => {
    const g = fz(new IcosahedronGeometry(0.3, 1).scale(1, DOME.y / 0.3, 1), 0.14, 207);
    const nor = g.attributes.normal;
    const col = g.attributes.color;
    for (let i = 0; i < col.count; i++) {
      const ny = nor.getY(i);
      const k = clamp01((0.05 - ny) / 0.55); // 0 above the waist, 1 under the belly
      const v = 1 - 0.42 * k * k * (3 - 2 * k);
      col.setXYZ(i, col.getX(i) * v, col.getY(i) * v, col.getZ(i) * v);
    }
    const out = [{ geo: g }];
    fib(22, 0.7).forEach((dir, i) => {
      if (dir.y < -0.45 || dir.angleTo(FACE) < 0.6) return;
      domeAt(dir, P, N);
      rakeDir(N, 0.7 + 0.1 * hash01(i, 3), D);
      const run = FUR_SINK / Math.max(0.3, D.dot(N));
      const len = 0.06 + 0.025 * hash01(i, 5);
      const root = P.clone().addScaledVector(N, -FUR_SINK);
      out.push({ geo: spike, m: place(root, D, 0.04, len + run), tone: 0.86 + 0.1 * hash01(i, 7) });
      LAYOUT.push({ kind: 'fur', root, dir: D.clone(), r: 0.04, len: len + run, geo: 'spike' });
    });
    return out;
  });
  // The coat, kept to the classic's read (a slate ball under long radial
  // spikes): the main quills stand near radial, raked only a hair back
  // (longest toward the top), clear of the bare face and the belly; full
  // silhouette ink, like the classic's spikes. Their tips go in the tell row.
  const coatTips = [];
  set.coat = bakeParts('quillback:coat', () => {
    const out = [];
    fib(26, 2.1).forEach((dir, i) => {
      if (dir.y < -0.42 || dir.angleTo(FACE) < 0.78) return;
      domeAt(dir, P, N);
      // keep the spine line for the crest
      if (Math.abs(dir.x) < 0.16 && dir.y > 0.55) return;
      rakeDir(N, 0.1 + 0.06 * hash01(i, 11), D);
      // the classic's height (0.88): shorter over the top, longer round the
      // sides (the radial burst's width)
      const len = 0.2 + 0.03 * hash01(i, 13) - 0.07 * Math.max(0, N.y);
      const run = SINK_N / Math.max(0.3, D.dot(N));
      const root = P.clone().addScaledVector(N, -SINK_N);
      out.push({ geo: set.shaft, m: place(root, D, 0.045, len + run), tone: 0.95 + 0.1 * hash01(i, 17) });
      LAYOUT.push({ kind: 'main', root, dir: D.clone(), r: 0.045, len: len + run, geo: 'shaft' });
      coatTips.push({ root: root.clone().addScaledVector(D, (len + run) * 0.97), dir: D.clone(), r: TIP_R, bright: N.y > -0.05 && i % 2 === 0 });
    });
    // a low ring of short quills round the flanks and the rump (the classic's
    // burst goes all round), clear of the face and over the legs
    let low = 0;
    fib(48, 0.9).forEach((dir, i) => {
      if (low >= 6 || dir.y > -0.22 || dir.y < -0.62 || dir.angleTo(FACE) < 1.0) return;
      low++;
      domeAt(dir, P, N);
      rakeDir(N, 0.12, D);
      const len = 0.12 + 0.02 * hash01(i, 19);
      const run = SINK_N / Math.max(0.3, D.dot(N));
      const root = P.clone().addScaledVector(N, -SINK_N);
      out.push({ geo: set.shaft, m: place(root, D, 0.04, len + run), tone: 0.9 + 0.1 * hash01(i, 23) });
      LAYOUT.push({ kind: 'main', root, dir: D.clone(), r: 0.04, len: len + run, geo: 'shaft' });
      coatTips.push({ root: root.clone().addScaledVector(D, (len + run) * 0.97), dir: D.clone(), r: TIP_R * 0.9, bright: false });
    });
    return out;
  });
  // THE corruption tell: an indigo spearhead on every main-layer quill, bright
  // and dim alternating (one unlit draw call, as the classic's tips).
  set.tips = bakeParts('quillback:tips', () => {
    const bright = new Color(TELL_INDIGO);
    const dim = new Color(TELL_INDIGO_DIM);
    return coatTips.map((q) => ({ geo: set.tip, m: place(q.root, q.dir, q.r, TIP_LEN * 0.9), tint: q.bright ? bright : dim }));
  });
  // The head (dark): the bare muzzle mask, the snout cone, two brow scales,
  // two small ears peeking out of the coat. Head space (pivot HEAD0).
  {
    const scale = scaleGeometry({ seed: 209 });
    const wedge = wedgeGeometry();
    const at = (pos, up, fwd, sx, sy, sz) => {
      basis(H.copy(up), fwd, X, Y, Z);
      return setTRS(m, pos, X, Y, Z, sx, sy, sz).clone();
    };
    const rel = (x, y, z) => P.set(x - HEAD0.x, y - HEAD0.y, z - HEAD0.z);
    set.head = bakeParts('quillback:head', () => {
      const out = [];
      out.push({ geo: fz(new SphereGeometry(1, 6, 5), 0.12, 211), m: new Matrix4().compose(rel(0, -0.03, 0.2).clone(), new Quaternion(), new Vector3(0.15, 0.12, 0.14)) });
      const snoutDir = new Vector3(0, -0.25, 0.97).normalize();
      out.push({ geo: fz(new ConeGeometry(0.07, 0.18, 6).translate(0, 0.09, 0), 0.12, 213), m: at(rel(0, -0.06, 0.25).clone(), snoutDir, new Vector3(0, 1, 0), 1, 1, 1), tone: 0.88 });
      for (const side of [-1, 1]) {
        out.push({ geo: scale, m: at(rel(side * 0.07, 0.045, 0.3).clone(), new Vector3(side * 0.3, 0.75, 0.6), new Vector3(side * -0.4, 0, 1), 0.085, 0.03, 0.05), tone: 1.3 });
        out.push({ geo: wedge, m: at(rel(side * 0.16, 0.085, 0.22).clone(), new Vector3(side * 0.7, 0.7, 0.15), new Vector3(0, 0.2, 1), 0.07, 0.07, 0.045), tone: 1.15 });
      }
      out.push({ geo: fz(new IcosahedronGeometry(0.021, 0), 0, 1), m: new Matrix4().compose(rel(0, -0.105, 0.423).clone(), new Quaternion(), new Vector3(1.2, 0.9, 1)), tone: 0.3 });
      return out;
    });
    // Slit eyes (unlit charcoal: never round, never warm); they shut as the
    // head tucks (the nose, a near-black step of the dark hide, rides out
    // with the snout in the head row above).
    set.eyes = bakeParts('quillback:eyes', () => {
      const out = [];
      const bar = fz(new BoxGeometry(0.075, 0.022, 0.022), 0, 1);
      for (const side of [-1, 1]) out.push({ geo: bar, m: new Matrix4().compose(rel(side * 0.068, 0, 0.318).clone(), new Quaternion().setFromEuler(new Euler(0, side * -0.32, side * 0.36)), new Vector3(1, 1, 1)) });
      return out;
    });
  }
  // A leg bone (and, squashed flat, a paw): a faceted tapered unit segment.
  set.leg = fz(new CylinderGeometry(0.8, 1, 1, 5).translate(0, 0.5, 0), 0.1, 215);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Hips (body space at rest), paw homes (yaw-space floor), the leg bones.
const HIPS = [new Vector3(-0.12, 0.16, 0.1), new Vector3(0.12, 0.16, 0.1), new Vector3(-0.12, 0.16, -0.1), new Vector3(0.12, 0.16, -0.1)];
const HOMES = [new Vector3(-0.14, 0, 0.12), new Vector3(0.14, 0, 0.12), new Vector3(-0.14, 0, -0.12), new Vector3(0.14, 0, -0.12)];
const L1 = 0.1;
const L2 = 0.09;
const ANKLE = 0.022;
const BEND = [new Vector3(-0.3, 0, 1), new Vector3(0.3, 0, 1), new Vector3(-0.3, 0, -1), new Vector3(0.3, 0, -1)];
const LEG_R = [0.042, 0.034];
const PIVOT = new Vector3(0, 0.3, 0);
const XAXIS = new Vector3(1, 0, 0);
const YAXIS = new Vector3(0, 1, 0);
const ZAXIS = new Vector3(0, 0, 1);

export function buildQuillbackFacet() {
  const G = geos();
  const F = createFoeFrame('quillback');
  const { body, spawn, track } = F;
  const hideMat = track(foeMaterial(HIDE.quillBody));
  const darkMat = track(foeMaterial(HIDE.quillDark));
  const quillMat = track(foeMaterial(HIDE.quillSpine));
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const tellMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });

  // The ball (it rolls): the dome, the coat, its tips, the crest, the head.
  const ball = new Group();
  ball.name = 'quillback-ball';
  ball.position.y = BALL_Y;
  body.add(ball);
  ball.add(foePart(G.dome, hideMat, 'full', 'quillback-dome'));
  const coat = foePart(G.coat, quillMat, 'full', 'quillback-coat');
  ball.add(coat);
  const tips = foePart(G.tips, tellMat, false, 'quillback-tips');
  ball.add(tips);
  // The spine crest: seven quills that raise and lower (two rows: the shafts
  // with thin ink, the unlit indigo spearheads).
  const crest = instancedPart(G.shaft, quillMat, CREST.length, { name: 'quillback-crest', moving: true });
  const crestTips = instancedPart(G.tip, tellMat, CREST.length, { name: 'quillback-crest-tips', moving: true, ink: false });
  {
    const bright = new Color(TELL_INDIGO);
    const dim = new Color(TELL_INDIGO_DIM);
    for (let i = 0; i < CREST.length; i++) crestTips.setColorAt(i, i % 2 === 0 ? bright : dim);
    crestTips.instanceColor.needsUpdate = true;
  }
  ball.add(crest);
  ball.add(crestTips);
  const head = new Group();
  head.name = 'quillback-head';
  head.position.copy(HEAD0);
  ball.add(head);
  head.add(foePart(G.head, darkMat, 'full', 'quillback-face'));
  const eyes = foePart(G.eyes, eyeMat, false, 'quillback-eyes');
  head.add(eyes);
  const tellGlow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.7, opacity: 0.2 });
  tellGlow.material.toneMapped = false;
  tellGlow.material.color.copy(TELL_INDIGO_GLOW);
  tellGlow.position.set(0, 0.62, 0);
  body.add(tellGlow);

  // Legs: eight bones and four paws on ONE instanced row (one geometry, the
  // paw a flattened bone), placed by the leg IK every frame.
  const legs = instancedPart(G.leg, darkMat, 12, { name: 'quillback-legs', moving: true, inkPx: 2.0 });
  spawn.add(legs);
  F.group.add(groundShadow(0.42, 0.84, { forward: 0.28, wide: 1.1, deep: 0.94 }));

  // Named points (B8): the leading quills (the weapon: the face of the ball
  // along the lane, not spinning), the snout, the ball's core.
  const tipPt = namedPoint(body, 'quillback-tip', 0, BALL_Y + 0.02, 0.56);
  const mouth = namedPoint(head, 'quillback-mouth', 0, -0.065, 0.225);
  const core = namedPoint(ball, 'quillback-core', 0, 0, 0);

  const gait = createLegs({ homes: HOMES, groups: [[0, 3], [1, 2]], trigger: 0.055, reach: 0.13, lift: 0.045, durMin: 0.07, durMax: 0.13 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const cur = { ...REST };
  const cap = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  const tuckPt = new Vector3();
  const qP = new Vector3();
  const qD = new Vector3();
  const qX = new Vector3();
  const qZ = new Vector3();
  const m = new Matrix4();
  const reached = [false, false, false, false];
  const drawn = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  const gaitOpts = { locked: false };
  let age = -1;
  let yawNow = 0;
  let calm = 1;
  let locked = false;
  // the live charge
  let phase = 'idle'; // idle | coil | launch | roll | stop | thud | recover | abort
  let t0 = 0;
  let telS = 0;
  let telR = 0;
  let contactAt = 0;
  let spin = 0;
  let spinV = 0; // the roll's real spin rate, rad/s (the stop carries it on)
  let stopV = 0;
  let endAt = -1;
  let endKind = '';
  let hitsSeen = 0;
  let bumpAt = -99;
  let lastX = null;
  let lastZ = 0;
  let struck = false;
  let prevStrikeTick = null;
  const strike = { id: 'roll', tick: 0 };

  const lab = {
    abilities: QUILLBACK_ABILITIES,
    override: null, // { id: 'charge' | 'crash', t } | null
    lastStrike: null, // { id, tick }: the sim tick the latest live launch lands on
    feet: () => gait.feet().map((q, i) => ({ ...q, planted: q.planted && locked && !reached[i], drawnX: drawn[i].x, drawnZ: drawn[i].z, drawnY: drawn[i].y })),
    pose: () => ({ ...cur, phase, spin }),
    get hit() {
      return phase;
    },
    parts: { body, ball, head, coat, crest, legs },
  };

  function setPhase(p, now) {
    Object.assign(cap, cur);
    phase = p;
    t0 = now;
  }
  function markStrike(R) {
    if (struck) return;
    struck = true;
    prevStrikeTick = lab.lastStrike ? lab.lastStrike.tick : null;
    strike.tick = R;
    lab.lastStrike = strike;
  }

  // A broken wind-up (a stun, a blind, a room clear): no launch, and the
  // strike it marked in its last frames is unsaid.
  function cancel(now) {
    if (struck) {
      if (prevStrikeTick === null) lab.lastStrike = null;
      else strike.tick = prevStrikeTick;
      struck = false;
    }
    setPhase('abort', now);
    cap.pitch = wrapPi(cap.pitch);
  }
  function startRoll(now, at, seen) {
    phase = 'roll';
    contactAt = at;
    spin = 0;
    spinV = 0;
    endAt = -1;
    endKind = '';
    hitsSeen = seen;
    bumpAt = -99;
  }

  // The live charge, from the sim's entity (telegraph, mode, chargeHits).
  function live(P, e, tick, now) {
    const beat = watch.update(P);
    const tel = watch.telegraph;
    if (beat && beat.type === 'wind') {
      setPhase('coil', now);
      struck = false;
    }
    if (tel) {
      telS = tel.startTick;
      telR = tel.resolveTick;
    }
    if (beat && (beat.type === 'release' || beat.type === 'cancel')) {
      // the launch only on the sim's own word: the telegraph gone AND the
      // ball rolling (or already stopped by a wall). A stun, a blind or a
      // room clear on the resolve leaves the mode alone: a cancel.
      const launched = e && e.mode ? e.mode === 'charge' || e.mode === 'stagger' : beat.type === 'release';
      if (!launched) cancel(now);
      else if (phase === 'coil' || phase === 'idle') phase = 'launch';
    }
    if (phase === 'coil' || phase === 'launch') {
      const left = telR - tick;
      if (left > STRIKE_TICKS) {
        // the coil: the telegraph's progress, blended in from wherever it was
        const span = telR - STRIKE_TICKS - telS;
        coilPose(span > 0 ? clamp01((tick - telS) / span) : 1, cur);
        const b = clamp01((now - t0) / (4 * FRAME));
        if (b < 1) lerpFields(cur, cap, cur, ease.out(b), FIELDS);
      } else if (left > 0) {
        // the launch: its last 2.5 frames, so the contact lands ON the resolve
        markStrike(telR);
        strikePose(1 - left / STRIKE_TICKS, cur);
      } else if (phase === 'launch') {
        markStrike(telR);
        // the sim makes a fresh chargeHits on the resolve tick: every body in
        // it was rammed by THIS roll (one may already be, on its first tick)
        startRoll(now, now - (tick - telR) / TICK_HZ, 0);
      } else strikePose(1, cur); // resolved, the release not seen yet
    }
    // a rig built (or a wind-up missed) mid-charge: straight into the roll,
    // or the wall's daze
    if (phase === 'idle' && !tel && e) {
      if (e.mode === 'charge') startRoll(now, now - HOLD - ROLL_IN, e.chargeHits ? e.chargeHits.length : 0);
      else if (e.mode === 'stagger') {
        Object.assign(cur, REST);
        setPhase('thud', now - (THUD_SEC + RECOIL_SEC + LAND_SEC));
      }
    }
    if (phase === 'roll') {
      const tr = now - contactAt;
      // each body it rams (once per body per charge) squashes it; counted by
      // length (a co-op guest's snapshot is a fresh array every time)
      const n = e && e.chargeHits ? e.chargeHits.length : 0;
      if (n > hitsSeen) bumpAt = now + Math.max(0, Math.floor(tick) + 1 - tick) / TICK_HZ; // when the ball arrives (never before)
      hitsSeen = n;
      rollPose(tr, spin, cur);
      bumpPose(now - bumpAt, cur);
      // the end: a wall's stagger, or the roll spent (when the ball arrives)
      if (!endKind) {
        if (e && e.mode === 'stagger') {
          endKind = 'wall';
          endAt = now + Math.max(0, (e.staggerUntilTick ?? tick) - STAGGER_TICKS - tick) / TICK_HZ;
        } else if ((!e || e.mode !== 'charge') && tr > HOLD) {
          endKind = 'spent';
          endAt = now + Math.max(0, Math.floor(tick) + 1 - tick) / TICK_HZ;
        }
      }
      if (endKind && now >= endAt) {
        setPhase(endKind === 'wall' ? 'thud' : 'stop', now);
        cap.pitch = wrapPi(cap.pitch);
        stopV = spinV;
        spin = 0;
      }
    }
    if (phase === 'stop') {
      stopPose(now - t0, cap, cur, stopV);
      if (now - t0 >= stopSec(cap, stopV)) phase = 'idle';
    } else if (phase === 'thud') {
      thudPose(now - t0, cap, cur);
      const held = now - t0;
      // free once the sim lets it go AND the slow unroll has it upright
      if (held > Math.max(THUD_SEC + RECOIL_SEC, thudUpright(cap.pitch)) && (e ? e.mode !== 'stagger' : held >= STAGGER_SEC)) {
        setPhase('recover', now);
        cap.pitch = wrapPi(cap.pitch); // the tumble's turns are whole: the ball looks the same
      }
    }
    if (phase === 'recover' || phase === 'abort') {
      returnPose(now - t0, cap, phase === 'recover' ? RECOVER_SEC : ABORT_SEC, cur);
      if (now - t0 >= (phase === 'recover' ? RECOVER_SEC : ABORT_SEC)) phase = 'idle';
    }
    if (phase === 'idle') Object.assign(cur, REST);
  }

  function pose(P) {
    const dt = clock.step(P);
    const now = clock.now;
    const e = P.e || null;
    // the sim tick, held through a hitstop (never the raw saw-tooth)
    const tick = Number.isFinite(P.tick) && !P.turntable ? clock.tick : (P.tick ?? 0);
    const turntable = !!P.turntable;
    if (age < 0) age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    spawn.scale.setScalar(spawnScale(age));

    // the real travel this frame, in the rig's own frame (the roll's spin)
    const gx = F.group.position.x;
    const gz = F.group.position.z;
    const gs = F.group.scale.x || 1;
    let travel = 0;
    if (lastX !== null && dt > 0) {
      const dx = gx - lastX;
      const dz = gz - lastZ;
      if (dx * dx + dz * dz < 1) travel = (Math.sin(yawNow) * dx + Math.cos(yawNow) * dz) / gs;
    }
    lastX = gx;
    lastZ = gz;

    // --- the charge: the lab's pure override, or the live sim
    let tw = now; // the clock the shiver and the wobble run on (held in a hitstop)
    if (lab.override) {
      const ab = QUILLBACK_ABILITIES[lab.override.id] || QUILLBACK_CHARGE;
      tw = lab.override.t;
      ab.pose(tw, cur);
      phase = 'idle';
      watch.reset();
    } else {
      if (phase === 'roll') {
        spin += travel / ROLL_R;
        if (dt > 0) spinV += (travel / ROLL_R / dt - spinV) * Math.min(1, 25 * dt);
      }
      live(P, e, tick, now);
    }
    calm += ((phase === 'idle' && !lab.override ? 1 : 0) - calm) * (1 - Math.exp(-8 * dt));

    // --- feet: locked to the floor while out, folded away for the roll
    fr.x = gx;
    fr.z = gz;
    fr.yaw = yawNow;
    fr.s = gs;
    const L = Math.min(1, cur.legs); // the unfold's overshoot never stretches past the planted paw
    locked = !turntable && age >= SPAWN_SEC && L >= 0.99 && !(dt <= 0 && lab.override);
    gaitOpts.locked = locked;
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob * L;
    gait.localVelocity(fr, lv);
    const walkK = L * calm;
    const fwd = Math.max(-1, Math.min(1, lv.z / WALK_SPEED)) * walkK;
    const side = Math.max(-1, Math.min(1, lv.x / WALK_SPEED)) * walkK;

    // --- the body: the charge's pose, the steps' bob and waddle, the lean
    // along the travel, a slow breath; the shiver and the daze on top
    const breath = Math.sin(now * 2.3) * calm;
    const shiv = cur.shiv;
    const wob = cur.wob;
    body.rotation.set(cur.tilt + 0.08 * fwd, 0.05 * wob * Math.sin(tw * 9), cur.roll - 0.07 * side + 0.035 * bob * (lv.x >= 0 ? 1 : -1) + 0.028 * shiv * Math.sin(tw * 50) + 0.12 * wob * Math.sin(tw * 26));
    body.scale.set(cur.sx, cur.sy * (1 + 0.014 * breath), cur.sz);
    placeBody(body, PIVOT, cur.push, cur.lift + 0.02 * bob + 0.005 * breath + 0.006 * shiv * Math.sin(tw * 61));
    ball.rotation.x = cur.pitch + 0.035 * shiv * Math.sin(tw * 43);
    const flare = 1 + FLARE * Math.min(cur.bristle, 1.2); // never past FLARE_MAX (the roots stay sunk)
    coat.scale.setScalar(flare);
    tips.scale.setScalar(flare);
    // the head: curled into the coat, or out and sniffing about
    const tk = cur.tuck;
    head.position.set(HEAD0.x, HEAD0.y - 0.02 * tk, HEAD0.z - 0.075 * tk);
    head.rotation.set(0.45 * tk + calm * 0.05 * Math.sin(now * 1.7) - 0.03 * bob, calm * 0.14 * Math.sin(now * 0.8) + 0.3 * wob * Math.sin(tw * 7), 0);
    // the slit eyes shut and sink into the muzzle as it tucks (never poking
    // through the hide in the coil or the roll)
    const eyeK = clamp01((1 - tk) / 0.5);
    eyes.scale.setScalar(Math.max(0.001, eyeK));
    eyes.visible = eyeK > 0.02;
    tellGlow.material.opacity = 0.16 + 0.06 * Math.sin((P.t ?? 0) * 2.4) + 0.25 * cur.glow;

    // --- the crest: raked at rest, raised in the coil, kicked on the launch,
    // drooped in the daze; it ripples with the steps and sways at idle
    const c = cur.crest;
    for (let i = 0; i < CREST.length; i++) {
      const q = CREST[i];
      const sway = calm * 0.06 * Math.sin(now * 2.6 - i * 0.7) + 0.1 * bob * Math.sin(i * 1.3);
      const rake = (c >= 0 ? CREST_RAKE * (1 - c) : CREST_RAKE - 0.6 * c) + sway;
      const a = q.a - rake;
      qD.set(q.x * (1 + 0.5 * Math.max(0, c)), Math.cos(a), Math.sin(a)).normalize();
      qX.copy(XAXIS).addScaledVector(qD, -qD.x).normalize();
      qZ.crossVectors(qX, qD);
      // the root sinks along the hide's normal (closed under the hide at any
      // rake); the shaft runs out along its own direction past the surface
      const run = CREST_SINK / Math.max(0.3, qD.dot(q.N));
      const len = (q.len + run) * (1 + 0.06 * Math.max(0, cur.bristle));
      qP.copy(q.P).addScaledVector(q.N, -CREST_SINK);
      crest.setMatrixAt(i, setTRS(m, qP, qX, qD, qZ, q.r, len, q.r));
      qP.addScaledVector(qD, len * 0.97);
      crestTips.setMatrixAt(i, setTRS(m, qP, qX, qD, qZ, TIP_R * 1.06, TIP_LEN * 1.05, TIP_R * 1.06));
    }
    crest.instanceMatrix.needsUpdate = true;
    crestTips.instanceMatrix.needsUpdate = true;

    // --- legs: the hips ride the body, the paws stand where the gait put
    // them; folded, each paw draws back up into the ball
    legs.visible = L > 0.04; // folded into the ball for the roll (written anyway: pure)
    {
      body.updateMatrix();
      const Ld = locked ? 1 : L; // standing: exactly on the planted spot
      const rk = 0.35 + 0.65 * Ld;
      for (let i = 0; i < 4; i++) {
        hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
        tuckPt.copy(hipW);
        tuckPt.y += 0.03;
        foot.copy(gait.out[i]);
        foot.y += ANKLE;
        foot.lerpVectors(tuckPt, foot, Ld);
        liftToReach(hipW, foot, L1, L2);
        // past the leg's reach (a fast turn): pulled in, and the paw steps
        reached[i] = clampReach(hipW, foot, L1, L2) > 0;
        if (reached[i] && locked) gait.release(i);
        solveKnee(hipW, foot, L1, L2, BEND[i], knee);
        legs.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, LEG_R[0] * rk, LEG_R[0] * rk, 0.02));
        legs.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, LEG_R[1] * rk, LEG_R[1] * rk, 0.015));
        foot.y -= ANKLE;
        drawn[i].copy(foot);
        // centred on the planted spot (an offset in the rig's frame would
        // swing round it as the body turns: a slide)
        qP.copy(foot);
        legs.setMatrixAt(8 + i, setTRS(m, qP, XAXIS, YAXIS, ZAXIS, 0.05 * rk, 0.03 * rk, 0.062 * rk));
      }
      legs.instanceMatrix.needsUpdate = true;
    }
  }

  return {
    group: F.group,
    // the moving rig (the VFX layer's hit envelope wraps it); the contact
    // shadow stays on the floor, on the group
    body: F.yaw,
    mats: F.mats,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    pose,
    lab,
    modelStandard: true,
    points: { tip: tipPt, hand: tipPt, mouth, core },
    // The shared hit envelope's tuning (§6.1 item 9): a light round ball
    // squashes along its height, flinches a touch less (the quills are
    // stiff), and is knocked a little further; it bulges at the ball's middle.
    react: { squash: 1, flinch: 0.85, knock: 1.1, axis: 'y', midY: BALL_Y },
    death: { swell: 1.05, throw: 1.15 },
  };
}
