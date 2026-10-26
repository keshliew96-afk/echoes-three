// SPITTING MANTIS, MODEL STANDARD (docs/MODEL_STANDARD.md "Foes"). The classic
// mantis of enemies/mantis.js (BUILD_BRIEF §11 ranged shooter, §19.2 "mantis
// stick") with the sample video's technique laid ON TOP of its chibi ink look:
// the same tall stick silhouette on stilts, the same four values (PALE head,
// DARK thorax and legs, MID abdomen and upper arms, BONE blades and jaws, Bone
// the brightest), the raptorial forelegs held forward and out in the guard,
// and the one indigo tell (the eye-glint). What it gains:
//
//   * faceted masses: a keeled pronotum with its shield flare, a triangular
//     head, a segmented spindle abdomen whose tergite lips step the light;
//   * detail by repetition, BAKED per kind (render/facet/foe.js), so a room of
//     mantises shares one buffer per part and the draw calls stay under the
//     classic rig's: keel spines, hip knuckles, a waist block, pale sternite
//     plates and cerci on the abdomen, a crest, a face shield and swept
//     antennae on the head, faceted compound-eye gems;
//   * moving parts as instanced rows per rig: two veined wing covers
//     (tegmina) that lift and fan through the wind-up (a deimatic threat
//     display, the non-colour "shot incoming" read from above), two bone
//     mandibles that flare on the spit, the raptorial forelegs as a coxa /
//     spined femur / toothed tibia chain on a hinge plane (the strike unfolds
//     and snaps them), four walking legs and their tarsal claws;
//   * WORLD-LOCKED FEET (render/facet/legs.js): the four walking legs step in
//     diagonal pairs, two-bone legs with high outward knees (the bracket
//     read), each foot pinned to the floor while it carries weight; the
//     forelegs are carried, never walked on (as on the classic);
//   * THE SPIT on the sim's own telegraph. The mantis's one attack (sim/
//     enemies.js "Mantis.") is a 42-tick telegraph (36 under Short Fuse) that
//     resolves into one shot (telegraph_resolve, enemy_fire) on its resolve
//     tick. The wind-up is SAMPLED from telegraphProgress on the shown tick
//     (P.tick + 1), so it builds in step with the lane's charge bead (the
//     classic eased in in 0.2 s, then froze):
//     REAR and load (body back over the hind legs, forelegs up and open, wing
//     covers fanned, the abdomen pumping three times, the head cocked back,
//     the glint flaring), a 6-tick COIL, then the 5-tick STRIKE (2.5 frames:
//     head and thorax whip forward and down, forelegs lash down and snap shut,
//     jaws flare) whose CONTACT lands ON the resolve tick, the frame the shot
//     leaves (the classic's snap peaked 0.1 s late). Then the shot squash (B3)
//     and its shove back, a recoil past the guard and one overshoot into it;
//   * a stun, blind or retreat that cancels the telegraph folds the wind-up
//     back (never a strike), on the resolve tick too: only the fire pulse
//     (enemy_fire) plays the contact; a shot with no telegraph seen (a co-op
//     guest's late snapshot) spits on the fire pulse with one frame of
//     wind-back;
//   * the spawn-in grow (B7), named points (B8: the spit mouth, the foreleg
//     claw tips, the foreleg knee as the hand), the hit and death tuning the
//     shared envelope reads (§6.1 items 9, 10).
//
// Not a 3-hit chain: the spit is a telegraphed ranged attack (one shot per
// 2.5 s cooldown, at least 3.2 s apart), not repeating melee, so it gets its
// own timeline with key poses (Kesh's template, as the foe brief reads it).
//
// §6.1 [M]: 1 the wind-up IS the telegraph (never delays the resolve); 2 the
// strike takes 2.5 frames, the contact holds 2 (and pauses with a hitstop:
// the clock runs on the sim tick), no lunge (a shooter: the sim body stays put); 3 shotSquash at
// contact (20% wide, the stretch overshoot, the shove eased over 0.45 s);
// 4 the jaws and forelegs kick on the contact frame, no ramp; 5 the recoil
// settles into the guard with one overshoot (`settle`); 6 n/a (no chain);
// 7 spawnScale; 8 points; 9 react; 10 death; 11 no Ember, Bright Heal or
// Violet anywhere: the hides are the classic's cool HIDE tokens, the tell is
// TELL_INDIGO on the eyes only (MeshBasic, toneMapped false, out of `mats`).
//
// Faces +Z. Same contract as buildMantis (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing and damage untouched.
import { BufferGeometry, ConeGeometry, CylinderGeometry, Euler, Float32BufferAttribute, LatheGeometry, Matrix4, MeshBasicMaterial, Object3D, OctahedronGeometry, Quaternion, SphereGeometry, Vector2, Vector3 } from 'three';
import { groundShadow } from '../../critters/common.js';
import { makeGlowSprite } from '../../glow.js';
import { markShared } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry, PART_INK_PX } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, SPAWN_SEC, bakeParts, heldBy, hornGeometry, scaleGeometry, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, lerpFields, namedPoint, placeBody, settle, shotSquash, spawnScale, telegraphProgress } from '../../facet/foe.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/legs.js';

// The sim's mantis (sim/enemies.js ENEMY_STATS.mantis): a 42-tick telegraph
// (the lab's default span; live play reads the telegraph's own span), one shot
// on the resolve tick, 1.6 u/s.
const TEL_TICKS = 42;
const RUN_SPEED = 1.6;
const TICK_HZ = 60;

// --- The spit's timing. The coil and the strike keep their own lengths (the
// strike stays 2.5 frames); the rear-and-load stretches to the span.
const COIL_TICKS = 6;
const STRIKE_TICKS = 5;
const REAR_SEC = (TEL_TICKS - COIL_TICKS - STRIKE_TICKS) / TICK_HZ;
const COIL_SEC = COIL_TICKS / TICK_HZ;
// Seconds into the lab's spit where the contact lands (= the resolve tick).
export const SPIT_CONTACT = TEL_TICKS / TICK_HZ;
// the strike ends exactly on the contact (STRIKE_TICKS long; summing the
// three phases' own lengths lands a hair past SPIT_CONTACT in floating point,
// so the cue frame would read 'strike')
const STRIKE_SEC = SPIT_CONTACT - REAR_SEC - COIL_SEC;
const HOLD_SEC = 2 * FRAME;
const RECOIL_SEC = 5 * FRAME;
const SETTLE_SEC = 0.4;
// A telegraph cancelled (stun, blind, retreat): the wind-up folds back.
const FOLD_SEC = 0.3;
// A telegraph cleared in its last ticks (or on its resolve) with no fire
// pulse yet: a co-op guest's snapshot can clear it a tick before the fire
// event lands. Hold the pose this long for the pulse before calling it a
// cancel (at once when the entity is known held: heldBy).
const LATE_TICKS = 4;
const GRACE_SEC = 0.06;
// A shot with no telegraph seen: one frame of wind-back, two of strike (B1).
const QUICK_WIND = FRAME;
const QUICK_STRIKE = 2 * FRAME;
// The idle life (rock, head scan) eases out over this as a spit begins and
// back in over this after its settle.
const LIFE_OUT = 0.35;
const LIFE_IN = 0.6;
// THE HEAD SNAP (Kesh's pick): the head never scans smoothly. It holds, then
// snaps to a new look in SNAP_SEC with a small overshoot (a mantis's
// saccade), one look every SACCADE_SEC; it snaps onto the target in HEAD_LOCK
// as a spit winds up, and snaps back into its looks after the release
// settles.
const SACCADE_SEC = 0.9;
const SNAP_SEC = 4 / TICK_HZ;
const HEAD_LOCK = 4 / TICK_HZ;
const LOOK = 0.2;
// a look for saccade n, in -LOOK..LOOK (a fixed hash: no randomness)
function lookAt(n) {
  const h = Math.sin(n * 91.345 + 7.13) * 43758.5453;
  return (2 * (h - Math.floor(h)) - 1) * LOOK;
}
// the head's look at clock time t: held, then a snap with one overshoot
function saccade(t) {
  const n = Math.floor(t / SACCADE_SEC);
  const k = Math.min(1, (t - n * SACCADE_SEC) / SNAP_SEC);
  const a = lookAt(n - 1);
  return a + (lookAt(n) - a) * ease.back(k);
}

// --- Key poses. push: the body's shove along +z (u); lift (u); pitch: nose
// down (+) or rearing back (-), rad, about the hips; roll; sx / sy: the body's
// squash (wide, tall); hp / hy: the head's dip and turn; ab: the abdomen's
// curl (+ tail up); pump: the abdomen's swell (the spit loading); the
// forelegs on their hinge plane: ac, af, at the coxa, femur and tibia angles
// (0 straight down, π/2 forward, π straight up), asp the plane's spread out,
// aln its lean out; wing: the wing covers' display (0 folded, 1 fanned); jaw:
// the mandibles' flare; glint: the tell's flare.
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, sx: 1, sy: 1, hp: 0, hy: 0, ab: 0, pump: 0, ac: 1.05, af: 2.0, at: 0.7, asp: 0.5, aln: 0.32, wing: 0, jaw: 0, glint: 0 });
const K = (o) => Object.freeze({ ...REST, ...o });
// REAR and load (the telegraph's body): back over the hind legs, forelegs up
// and open, wings fanned, the tail curled up, the head cocked back.
const REAR = K({ push: -0.045, pitch: -0.17, sx: 0.97, sy: 1.04, hp: -0.22, ab: 0.14, pump: 1, ac: 1.55, af: 2.9, at: 1.45, asp: 0.62, aln: 0.44, wing: 0.85, jaw: 0.2, glint: 0.85 });
// COIL: the extreme pull-back, the spring before the strike.
const COIL = K({ push: -0.065, pitch: -0.24, sx: 0.95, sy: 1.06, hp: -0.32, ab: 0.2, pump: 1, ac: 1.75, af: 3.02, at: 1.62, asp: 0.68, aln: 0.5, wing: 1, jaw: 0.35, glint: 1 });
// STRIKE / CONTACT: the head and thorax whip forward and down to spit, the
// forelegs lash down and forward and snap shut, the jaws flare, the wings
// clap half shut, the abdomen empties. (The shot squash adds the B3 width.)
const STRIKE = K({ push: 0.06, pitch: 0.27, hp: 0.48, ab: -0.12, pump: -0.4, ac: 1.35, af: 1.5, at: -1.15, asp: 0.4, aln: 0.22, wing: 0.35, jaw: 1, glint: 1 });
// OVERSHOOT: the recoil past the guard (head up, forelegs tucked low and in,
// the tail kicking up), then one overshoot back into the guard (B5).
const OVER = K({ push: 0.02, pitch: 0.1, hp: -0.12, ab: 0.09, pump: 0.15, ac: 0.72, af: 2.3, at: 0.12, asp: 0.36, aln: 0.22, wing: 0.1, jaw: 0.3, glint: 0.3 });
const FIELDS = Object.keys(REST);
export const MANTIS_REST = REST;
export const MANTIS_KEYS = Object.freeze({ rear: REAR, coil: COIL, strike: STRIKE, over: OVER });

const SPIT_TL = createTimeline(
  'spit',
  'Spit',
  [
    { id: 'rear', label: 'rear and load (the telegraph)', dur: REAR_SEC },
    { id: 'coil', label: 'coil', dur: COIL_SEC },
    { id: 'strike', label: 'strike', dur: STRIKE_SEC },
    { id: 'contact', label: 'contact: the spit', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil past the guard', dur: RECOIL_SEC },
    { id: 'settle', label: 'settle into the guard', dur: SETTLE_SEC },
  ],
  { cues: [{ at: SPIT_CONTACT, id: 'strike' }] }
);

// Pure: the spit's pose at ts seconds into it (the lab's default span; live
// play maps its telegraph onto this time).
// THE 3-VARIANT SPIT (Kesh's three-hit template across repeat spits): A,
// the left blade leads and the right trails it by TRAIL_SEC; B, the right
// leads; C, both blades crash together with a bigger squash and shove. The
// leading blade (or both) lands its contact on the resolve tick in every
// variant; the body rolls and the head cocks toward the leading blade.
// `lead`: +1 the rig's left foreleg (s = +1), -1 its right, 0 both.
export const SPIT_VARIANTS = Object.freeze([
  Object.freeze({ id: 'spit', label: 'Spit: left blade leads', lead: 1 }),
  Object.freeze({ id: 'spitRight', label: 'Spit: right blade leads', lead: -1 }),
  Object.freeze({ id: 'spitBoth', label: 'Spit: both blades crash', lead: 0 }),
]);
// the trailing blade lands this long after the leading one
export const TRAIL_SEC = 2 / TICK_HZ;
// how much of the strike's lean is on (0 before the strike, 1 through the
// contact, easing out through the recoil and the settle)
function strikeEnv(s) {
  if (s.id === 'strike') return ease.in(s.k);
  if (s.id === 'contact') return 1;
  if (s.id === 'recoil') return 1 - 0.5 * ease.out(s.k);
  if (s.id === 'settle') return 0.5 * (1 - ease.inOut(s.k));
  return 0;
}
const SAMPLE = { t: 0, index: 0, id: '', label: '', k: 0 };
export function mantisSpitPose(ts, out = { ...REST }, variant = 0) {
  const s = SPIT_TL.sample(ts, SAMPLE);
  const k = s.k;
  if (s.id === 'rear') {
    lerpFields(out, REST, REAR, ease.inOut(k), FIELDS);
    // the abdomen pumps three times, each deeper (the spit loading), full
    // when the coil begins
    out.pump = k * (0.5 - 0.5 * Math.cos(Math.PI * 5 * k));
    out.glint = REAR.glint * k; // the glint ramps with the charge bead
  } else if (s.id === 'coil') lerpFields(out, REAR, COIL, ease.out(k), FIELDS);
  else if (s.id === 'strike') lerpFields(out, COIL, STRIKE, ease.in(k), FIELDS);
  else if (s.id === 'contact') lerpFields(out, STRIKE, STRIKE, 0, FIELDS);
  else if (s.id === 'recoil') lerpFields(out, STRIKE, OVER, ease.out(k), FIELDS);
  else lerpFields(out, OVER, REST, 1 - settle(k), FIELDS);
  const v = SPIT_VARIANTS[variant] || SPIT_VARIANTS[0];
  const env = strikeEnv(s);
  // the lean toward the leading blade (A, B), or the deeper bow of the
  // double crash (C)
  if (v.lead) {
    out.roll -= v.lead * 0.08 * env;
    out.hy += v.lead * 0.1 * env;
  } else {
    out.pitch += 0.06 * env;
    out.push += 0.015 * env;
  }
  // B3: the shot squashes the shooter and shoves it back (half again as
  // hard on the double crash)
  if (ts >= SPIT_CONTACT) {
    const q = shotSquash(ts - SPIT_CONTACT);
    const big = v.lead ? 1 : 1.5;
    out.sx *= 1 + big * (q.sx - 1);
    out.sy *= 1 + big * (q.sy - 1);
    out.push += big * q.shove;
  }
  return out;
}

// The classic twin's inputs at the same moment (the enemy layer's own
// curves: telegraphK eases in at 14/s, fireK is the 0.2 s hump after the shot).
function classicAt(t) {
  const tc = SPIT_CONTACT;
  const telegraphK = t < tc ? 1 - Math.exp(-14 * Math.max(0, t)) : (1 - Math.exp(-14 * tc)) * Math.exp(-14 * (t - tc));
  const f = t - tc;
  const fireK = f >= 0 && f < 0.2 ? Math.sin(5 * Math.PI * f) : 0;
  return { telegraphK, lungeK: 0, fireK, e: null };
}

// The model lab's spit at the default 42-tick telegraph (pure in t, so it
// rewinds); in game the same poses ride the live telegraph.
function spitAbility(variant) {
  const v = SPIT_VARIANTS[variant];
  return Object.freeze({
    id: v.id,
    label: v.label,
    variant,
    duration: SPIT_TL.duration,
    at(t) {
      const s = SPIT_TL.sample(t);
      return { phase: s.id, label: `${SPIT_TL.label}: ${s.label}`, t: s.t, k: s.k };
    },
    sample: (t) => SPIT_TL.sample(t),
    readout: (t) => SPIT_TL.readout(t),
    // seconds into the spit where the contact lands (the lab's cue: 'spit')
    strikes: [SPIT_CONTACT],
    cues: SPIT_TL.cues,
    classicAt,
  });
}
export const MANTIS_SPIT = spitAbility(0);
export const MANTIS_ABILITIES = Object.freeze({ spit: MANTIS_SPIT, spitRight: spitAbility(1), spitBoth: spitAbility(2) });

// --- Geometry (built once for the session, shared by every mantis) ----------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
// An orthonormal frame: Y along `up`, Z as near `fwd` as it can be.
function basis(up, fwd, X, Y, Z) {
  Y.copy(up).normalize();
  Z.copy(fwd).addScaledVector(Y, -fwd.dot(Y));
  if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1);
  Z.normalize();
  X.crossVectors(Y, Z).normalize();
}
// Tip Y toward Z by angle a (a spine rakes toward a limb's tip).
function tip(X, Y, Z, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const yx = Y.x * c + Z.x * s, yy = Y.y * c + Z.y * s, yz = Y.z * c + Z.z * s;
  Z.set(Z.x * c - Y.x * s, Z.y * c - Y.y * s, Z.z * c - Y.z * s);
  Y.set(yx, yy, yz);
  X.crossVectors(Y, Z).normalize();
}

// The abdomen: a spindle along +Y (its own frame: +Z dorsal, +X its left),
// raked up and back like the classic's (41° above the floor, tail high).
const AB_LEN = 0.62;
const AB_RAKE = -0.873;
const AB_W = 1.12; // wider than deep, as seen from above
const AB_D = 0.92;
const AB_PROF = [
  [0, 0.068],
  [0.2, 0.104],
  [0.4, 0.118],
  [0.6, 0.106],
  [0.8, 0.074],
  [0.93, 0.042],
  [1, 0.012],
];
function abR(u) {
  for (let i = 1; i < AB_PROF.length; i++) {
    if (u <= AB_PROF[i][0]) {
      const [u0, r0] = AB_PROF[i - 1];
      const [u1, r1] = AB_PROF[i];
      return r0 + ((r1 - r0) * (u - u0)) / (u1 - u0);
    }
  }
  return AB_PROF[AB_PROF.length - 1][1];
}
// The wing cover: a veined leaf, base at the origin, +Y along it, +Z up,
// arched over the spindle, its outer edge draping.
const WING_LEN = 0.5;
const WING_W = 0.078;

// A hand-built leaf: a raised midrib, two sloped flanks and a flat underside.
function leafGeometry() {
  const Y = [0, 0.1, 0.3, 0.55, 0.8, 1];
  const W = [0.36, 0.7, 1, 0.94, 0.6, 0];
  const H = [0.012, 0.018, 0.022, 0.02, 0.012, 0];
  const arch = (y) => 0.05 * Math.sin(Math.PI * y * 0.86);
  const rib = (i) => [0, Y[i] * WING_LEN, H[i] + arch(Y[i])];
  const edge = (i, s) => [s * W[i] * WING_W, Y[i] * WING_LEN, arch(Y[i]) - 0.014 * W[i]];
  const pos = [];
  const tri = (a, b, c, up) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * nx + ny * ny + nz * nz < 1e-14) return; // the tip's degenerate corner
    if ((nz > 0) !== up) pos.push(...a, ...c, ...b);
    else pos.push(...a, ...b, ...c);
  };
  for (let i = 0; i < Y.length - 1; i++) {
    for (const s of [-1, 1]) {
      tri(rib(i), edge(i, s), edge(i + 1, s), true);
      tri(rib(i), edge(i + 1, s), rib(i + 1), true);
    }
    tri(edge(i, -1), edge(i, 1), edge(i + 1, 1), false);
    tri(edge(i, -1), edge(i + 1, 1), edge(i + 1, -1), false);
  }
  // the base edge, closed
  const r0 = rib(0);
  const e0 = edge(0, -1);
  const e1 = edge(0, 1);
  pos.push(...e0, ...e1, ...r0); // facing out of the leaf's base (-Y)
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return fz(g, 0.1, 211);
}
// The leaf surface's height at (x, y) in its own frame (the veins lie on it).
function leafZ(x, y) {
  const Y = [0, 0.1, 0.3, 0.55, 0.8, 1];
  const W = [0.36, 0.7, 1, 0.94, 0.6, 0];
  const H = [0.012, 0.018, 0.022, 0.02, 0.012, 0];
  const v = y / WING_LEN;
  let i = 0;
  while (i < Y.length - 2 && v > Y[i + 1]) i++;
  const k = Math.min(1, Math.max(0, (v - Y[i]) / (Y[i + 1] - Y[i])));
  const w = (W[i] + (W[i + 1] - W[i]) * k) * WING_W;
  const h = H[i] + (H[i + 1] - H[i]) * k;
  const arch = 0.05 * Math.sin(Math.PI * v * 0.86);
  const f = w > 1e-6 ? Math.min(1, Math.abs(x) / w) : 1;
  return arch + h * (1 - f) - 0.014 * (w / WING_W) * f;
}

// The foreleg bones (each along +Y in its own frame; the hinge is +X, +Z the
// side facing the other bone: the femur's spines and the tibia's teeth).
const LC = 0.2;
const LF = 0.26;
const LT = 0.19;
const CLAW = 0.05;
// The walking legs: hips (body space at rest), feet homes (yaw-space floor).
const HIPS = [new Vector3(-0.055, 0.565, 0.05), new Vector3(0.055, 0.565, 0.05), new Vector3(-0.055, 0.545, -0.07), new Vector3(0.055, 0.545, -0.07)];
const HOMES = [new Vector3(-0.29, 0, 0.17), new Vector3(0.29, 0, 0.17), new Vector3(-0.33, 0, -0.24), new Vector3(0.33, 0, -0.24)];
const L1 = 0.32;
const L2 = 0.4;
const ANKLE = 0.02;
// the knees: high and out (the classic's angular brackets), the middle pair
// a touch forward, the hind pair back
const BEND = [new Vector3(-1, 0.8, 0.3), new Vector3(1, 0.8, 0.3), new Vector3(-1, 0.8, -0.45), new Vector3(1, 0.8, -0.45)];
const LEG_R = [0.032, 0.026];
// Each tarsus points out along its leg (yaw-space heading of its home).
const TARSUS_YAW = HOMES.map((h) => Math.atan2(h.x, h.z));
// The shoulders of the forelegs (body space), the body's pivot (the hips).
const SHOULDER = [new Vector3(-0.07, 0.775, 0.095), new Vector3(0.07, 0.775, 0.095)];
const PIVOT = new Vector3(0, 0.55, -0.03);
const HEAD_AT = new Vector3(0, 0.9, 0.12);
const AB_AT = new Vector3(0, 0.53, -0.04);

let SET = null;
function geos() {
  if (SET) return SET;
  const P = new Vector3();
  const N = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const H = new Vector3();
  const m = new Matrix4();
  const wedge = wedgeGeometry();
  const scale = scaleGeometry({ seed: 201 });
  const knob = fz(new OctahedronGeometry(1, 0), 0.12, 203);
  const at = (pos, up, fwd, sx, sy, sz) => {
    basis(H.copy(up), fwd, X, Y, Z);
    return setTRS(m, pos, X, Y, Z, sx, sy, sz).clone();
  };
  const set = {};

  // --- Thorax (pronotum): a keeled six-sided prism, the shield flaring where
  // the forelegs hang, leaning forward like the classic's (dark).
  {
    const g = new CylinderGeometry(0.056, 0.07, 0.42, 6, 3);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(p.getY(i) - 0.07) < 1e-3) p.setXYZ(i, p.getX(i) * 1.3, p.getY(i), p.getZ(i) * 1.3);
    }
    g.scale(1.12, 1, 0.9).rotateX(0.3).translate(0, 0.71, 0.05);
    set.thorax = fz(g, 0.14, 205);
  }
  // --- Dark detail (one draw call for the crowd): the waist block the legs
  // hang from, the hip knuckles, the keel spines down the pronotum's back,
  // the shoulder caps (body tone): tinted parts on one white material.
  set.body = bakeParts('mantis:body', () => {
    const out = [];
    const dark = HIDE.mantisDark;
    out.push({ geo: fz(new SphereGeometry(0.07, 6, 3), 0.12, 207), m: new Matrix4().compose(new Vector3(0, 0.55, -0.03), new Quaternion(), new Vector3(1.05, 0.85, 1.35)), tint: dark });
    for (const hip of HIPS) out.push({ geo: knob, m: new Matrix4().compose(hip, new Quaternion(), new Vector3(0.036, 0.036, 0.036)), tint: dark, tone: 0.85 });
    for (const sh of SHOULDER) out.push({ geo: knob, m: new Matrix4().compose(sh, new Quaternion(), new Vector3(0.034, 0.03, 0.034)), tint: HIDE.mantisBody });
    // keel spines along the pronotum's back (its axis leans 0.3 rad forward)
    const ax = new Vector3(0, Math.cos(0.3), Math.sin(0.3));
    const back = new Vector3(0, Math.sin(0.3), -Math.cos(0.3));
    for (let i = 0; i < 4; i++) {
      const u = -0.13 + i * 0.09;
      P.set(0, 0.71, 0.05).addScaledVector(ax, u).addScaledVector(back, 0.058);
      basis(back, ax.clone().negate(), X, Y, Z);
      tip(X, Y, Z, -0.55); // raked up the pronotum toward the head
      const h = 0.045 - 0.006 * i;
      setTRS(m, P, X, Y, Z, h * 0.5, h, h * 0.5);
      out.push({ geo: wedge, m: m.clone(), tint: dark, tone: 1.12 - 0.05 * (i % 2) });
    }
    return out;
  });

  // --- Abdomen: a segmented spindle (five tergite lips step the light).
  {
    const pts = [new Vector2(0, 0)];
    const SEG = [0, 0.18, 0.36, 0.54, 0.72];
    for (const u of SEG) {
      pts.push(new Vector2(abR(u) * (u === 0 ? 1 : 0.93), u * AB_LEN));
      pts.push(new Vector2(abR(u + 0.03) * 1.05, (u + 0.03) * AB_LEN));
    }
    pts.push(new Vector2(abR(0.9) * 0.95, 0.9 * AB_LEN));
    pts.push(new Vector2(0, AB_LEN));
    const g = new LatheGeometry(pts, 6);
    g.scale(AB_W, 1, AB_D);
    set.abdomen = fz(g, 0.14, 209);
  }
  // Abdomen detail: pale sternite plates down the belly, two cerci at the tip.
  // Each plate's base ring sinks inside the hide (the belly is a ridge, so a
  // wide flat plate stood out from it as a saw-tooth fringe); only its ridge
  // stands proud, a pale step down the keel.
  set.abDetail = bakeParts('mantis:abdomen', () => {
    const out = [];
    const pale = HIDE.mantisBody.clone().lerp(HIDE.mantisPale, 0.5);
    for (let i = 0; i < 5; i++) {
      const u = 0.12 + i * 0.16;
      const r = abR(u);
      P.set(0, u * AB_LEN, -r * AB_D * 0.65);
      basis(N.set(0, 0, -1), H.set(0, 1, 0), X, Y, Z);
      tip(X, Y, Z, -0.1); // the trailing edge lifts toward the tail
      setTRS(m, P, X, Y, Z, r * 1.2, 0.04, 0.07);
      out.push({ geo: scale, m: m.clone(), tint: pale, tone: 1 - 0.05 * (i % 2) });
    }
    for (const s of [-1, 1]) out.push({ geo: wedge, m: at(P.set(s * 0.012, AB_LEN - 0.02, 0.004), new Vector3(s * 0.4, 1, 0.25), new Vector3(0, 0, 1), 0.03, 0.07, 0.03), tint: HIDE.mantisDark });
    return out;
  });
  // The wing cover: the leaf and its darker veins (one shared buffer).
  set.wing = bakeParts('mantis:wing', () => {
    const out = [{ geo: leafGeometry(), m: null }];
    const A = new Vector3();
    const B = new Vector3();
    const D = new Vector3();
    const vein = (ax, ay, bx, by, w, tone) => {
      A.set(ax, ay, leafZ(ax, ay));
      B.set(bx, by, leafZ(bx, by));
      D.subVectors(B, A);
      const len = D.length();
      N.set(-(leafZ(ax + 0.004, ay) - leafZ(ax - 0.004, ay)) / 0.008, -(leafZ(ax, ay + 0.004) - leafZ(ax, ay - 0.004)) / 0.008, 1).normalize();
      basis(D, N, X, Y, Z);
      out.push({ geo: wedge, m: setTRS(new Matrix4(), A, X, Y, Z, w, len, 0.022), tone });
    };
    vein(0, 0.03, 0, 0.44, 0.016, 0.8); // the midrib vein
    for (const s of [-1, 1]) {
      vein(s * 0.004, 0.1, s * 0.06, 0.24, 0.011, 0.78);
      vein(s * 0.004, 0.22, s * 0.064, 0.38, 0.01, 0.78);
    }
    return out;
  });

  // --- Head: the broad triangular wedge (pale), the classic's oversized
  // head, pinched toward the mouth.
  {
    const g = new SphereGeometry(0.115, 7, 4);
    g.scale(1.85, 0.95, 1.35);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const k = y < 0 ? Math.min(1, -y / 0.109) : 0;
      p.setXYZ(i, p.getX(i) * (1 - 0.42 * k), y, p.getZ(i) + 0.02 * k);
    }
    set.head = fz(g, 0.12, 213);
  }
  // Head detail: the crest, the face shield and the mouth plate (no dark plates on the face: nothing that could read as a
  // second pair of eyes beside the one tell).
  set.headDetail = bakeParts('mantis:head', () => {
    const out = [];
    const dark = HIDE.mantisDark;
    out.push({ geo: fz(new ConeGeometry(0.07, 0.16, 4), 0.12, 215), m: new Matrix4().compose(new Vector3(0, 0.08, -0.03), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.35), new Vector3(1, 1, 1)), tint: dark });
    out.push({ geo: scale, m: at(P.set(0, -0.012, 0.146), new Vector3(0, 0.15, 1), new Vector3(0, -1, 0), 0.1, 0.028, 0.085), tint: HIDE.mantisPale, tone: 0.84 });
    out.push({ geo: wedge, m: at(P.set(0, -0.065, 0.13), new Vector3(0, -1, 0.3), new Vector3(0, 0, 1), 0.05, 0.045, 0.03), tint: dark });
    return out;
  });
  // The antennae: short mid-tone threads rooted on the crown behind the face
  // (as on the classic), up and forward, tips arching out; no ink, so from
  // the front they never read as dark brows or a second pair of eyes.
  set.antennae = bakeParts('mantis:antennae', () => {
    const ant = hornGeometry({ len: 0.22, r: 0.011, bend: 0.5, seg: 3, sides: 3, seed: 217 });
    return [-1, 1].map((s) => ({ geo: ant, m: at(P.set(s * 0.05, 0.1, 0), new Vector3(s * 0.3, 0.8, 0.5), new Vector3(s, -0.3, -0.2), 1, 1, 1), tint: HIDE.mantisBody }));
  });
  // The mandibles: a curved bone hook (two per head, an instanced row).
  set.jaw = hornGeometry({ len: 0.1, r: 0.024, bend: 1.0, seg: 2, sides: 4, seed: 219 });
  // THE corruption tell: two faceted compound-eye gems on the head's upper
  // corners, pointing up and out (unlit indigo, bright and dim facets).
  set.eyes = bakeParts('mantis:eyes', () => {
    const out = [];
    const gem = fz(new OctahedronGeometry(1, 0), 0.18, 221);
    for (const s of [-1, 1]) {
      out.push({ geo: gem, m: new Matrix4().compose(new Vector3(s * 0.168, 0.03, 0.05), new Quaternion().setFromEuler(new Euler(0.3, 0, s * -0.9)), new Vector3(0.05, 0.068, 0.058)), tint: TELL_INDIGO });
    }
    return out;
  });

  // --- The forelegs. The coxa (body tone), the raptorial femur with its
  // comb of spines in two rows and the big discal spine, the tibia with its
  // teeth and the terminal claw (bone).
  set.coxa = fz(new CylinderGeometry(0.032, 0.04, LC, 5).translate(0, LC / 2, 0), 0.1, 223);
  set.femur = bakeParts('mantis:femur', () => {
    const out = [{ geo: fz(new CylinderGeometry(0.034, 0.048, LF, 5).scale(0.8, 1, 1.2).translate(0, LF / 2, 0), 0.1, 225), m: null }];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const v = 0.3 + i * 0.17;
        const h = 0.036 - 0.004 * i;
        P.set(s * 0.015, v * LF, 0.049 - 0.014 * v);
        basis(N.set(s * 0.25, 0, 1), H.set(0, 1, 0), X, Y, Z);
        tip(X, Y, Z, 0.55);
        setTRS(m, P, X, Y, Z, h * 0.42, h, h * 0.5);
        out.push({ geo: wedge, m: m.clone(), tone: 1.04 - 0.05 * (i % 2) });
      }
    }
    P.set(0, 0.2 * LF, 0.054);
    basis(N.set(0, 0, 1), H.set(0, 1, 0), X, Y, Z);
    tip(X, Y, Z, 0.4);
    setTRS(m, P, X, Y, Z, 0.024, 0.056, 0.028);
    out.push({ geo: wedge, m: m.clone(), tone: 0.95 });
    return out;
  });
  set.tibia = bakeParts('mantis:tibia', () => {
    const out = [{ geo: fz(new CylinderGeometry(0.02, 0.03, LT, 5).scale(0.8, 1, 1.15).translate(0, LT / 2, 0), 0.1, 227), m: null }];
    for (let i = 0; i < 4; i++) {
      const v = 0.25 + i * 0.18;
      const h = 0.026 - 0.003 * i;
      P.set(0, v * LT, 0.03 - 0.01 * v);
      basis(N.set(0, 0, 1), H.set(0, 1, 0), X, Y, Z);
      tip(X, Y, Z, 0.6);
      setTRS(m, P, X, Y, Z, h * 0.4, h, h * 0.5);
      out.push({ geo: wedge, m: m.clone(), tone: 1.03 - 0.06 * (i % 2) });
    }
    out.push({ geo: hornGeometry({ len: CLAW + 0.012, r: 0.016, bend: 1.2, seg: 2, sides: 4, seed: 229 }), m: new Matrix4().makeTranslation(0, LT - 0.006, 0), tone: 0.92 });
    return out;
  });
  // --- The walking legs: a faceted tapered bone (y 0..1) and a tarsal claw
  // lying out along the floor (+Z), its point dipping to the ground.
  set.leg = fz(new CylinderGeometry(0.8, 1, 1, 5).translate(0, 0.5, 0), 0.1, 231);
  set.tarsus = bakeParts('mantis:tarsus', () => [{ geo: wedge, m: at(P.set(0, 0.012, 0), new Vector3(0, -0.12, 1), new Vector3(0, 1, 0), 0.05, 0.085, 0.07) }]);
  // one buffer per part for the whole game (never disposed, geocache.js)
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

export function buildMantisFacet() {
  const G = geos();
  const F = createFoeFrame('mantis');
  const { body, spawn, track } = F;
  const bodyMat = track(foeMaterial(HIDE.mantisBody));
  const darkMat = track(foeMaterial(HIDE.mantisDark));
  const paleMat = track(foeMaterial(HIDE.mantisPale));
  const boneMat = track(foeMaterial(HIDE.bone));
  const wingMat = track(foeMaterial(HIDE.mantisBody.clone().lerp(HIDE.mantisPale, 0.15)));
  // the baked multi-tone rows carry their tones in their vertex colours
  const tintMat = track(foeMaterial('#FFFFFF'));
  // the tell: unlit, never in mats (it never hit-flashes, as on the classic)
  const eyeMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });

  body.add(foePart(G.thorax, darkMat, 'full', 'mantis-thorax'));
  body.add(foePart(G.body, tintMat, 'part', 'mantis-detail'));
  // the abdomen: curls at the waist, swells along its own axis
  const abPivot = new Object3D();
  abPivot.name = 'mantis-abdomen-pivot';
  abPivot.position.copy(AB_AT);
  body.add(abPivot);
  const abAxis = new Object3D();
  abAxis.name = 'mantis-abdomen';
  abAxis.rotation.x = AB_RAKE;
  abPivot.add(abAxis);
  abAxis.add(foePart(G.abdomen, bodyMat, 'full', 'mantis-abdomen-mass'));
  abAxis.add(foePart(G.abDetail, tintMat, 'part', 'mantis-sternites'));
  const wings = instancedPart(G.wing, wingMat, 2, { name: 'mantis-wings', moving: true, inkPx: PART_INK_PX });
  abAxis.add(wings);
  // the head
  const head = new Object3D();
  head.name = 'mantis-head';
  head.position.copy(HEAD_AT);
  body.add(head);
  head.add(foePart(G.head, paleMat, 'full', 'mantis-head-mass'));
  head.add(foePart(G.headDetail, tintMat, 'part', 'mantis-head-detail'));
  head.add(foePart(G.antennae, tintMat, false, 'mantis-antennae'));
  head.add(foePart(G.eyes, eyeMat, false, 'mantis-eyes'));
  const jaws = instancedPart(G.jaw, boneMat, 2, { name: 'mantis-jaws', moving: true, inkPx: PART_INK_PX });
  head.add(jaws);
  const glows = [];
  for (const s of [-1, 1]) {
    const glow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.2, opacity: 0.32 });
    glow.material.toneMapped = false;
    glow.material.color.copy(TELL_INDIGO_GLOW);
    glow.position.set(s * 0.168, 0.03, 0.05);
    head.add(glow);
    glows.push(glow);
  }
  // the forelegs: three instanced rows (two arms each), placed on their hinge
  // planes every frame
  const coxae = instancedPart(G.coxa, bodyMat, 2, { name: 'mantis-coxae', moving: true, inkPx: 2.0 });
  const femurs = instancedPart(G.femur, boneMat, 2, { name: 'mantis-femurs', moving: true, inkPx: 2.0 });
  const tibiae = instancedPart(G.tibia, boneMat, 2, { name: 'mantis-tibiae', moving: true, inkPx: 2.0 });
  body.add(coxae);
  body.add(femurs);
  body.add(tibiae);
  // the walking legs: eight bones on one row, four tarsal claws on another
  const legs = instancedPart(G.leg, darkMat, 8, { name: 'mantis-legs', moving: true, inkPx: 2.0 });
  const tarsi = instancedPart(G.tarsus, darkMat, 4, { name: 'mantis-tarsi', moving: true, inkPx: PART_INK_PX });
  spawn.add(legs);
  spawn.add(tarsi);
  // The contact shadow belongs to the floor (the group, not the yaw), pushed
  // toward the camera like the classic's: a body this tall casts its
  // footprint in front of its own feet.
  F.group.add(groundShadow(0.44, 0.88, { forward: 0.3, wide: 1.15, deep: 0.92 }));

  // Named points (B8): the mouth (the spit), the foreleg claw tips (the
  // blades; `tip` is its right foreleg's), its right foreleg's knee (the hand).
  const mouth = namedPoint(head, 'mantis-mouth', 0, -0.085, 0.15);
  const tipR = namedPoint(body, 'mantis-tip', 0, 0, 0);
  const tipL = namedPoint(body, 'mantis-tip-left', 0, 0, 0);
  const hand = namedPoint(body, 'mantis-hand', 0, 0, 0);

  const gait = createLegs({ homes: HOMES, groups: [[0, 3], [1, 2]], trigger: 0.08, reach: 0.22, lift: 0.07, durMin: 0.09, durMax: 0.16 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const cur = { ...REST };
  const from = { ...REST }; // the pose a fold or a quick spit starts from
  const wind = { ...REST };
  // the trailing blade's pose (the 3-variant spit), and its fold start
  const trail = { ...REST };
  const trailFrom = { ...REST };
  let variant = 0; // SPIT_VARIANTS index of the spit in play
  let spitN = 0; // spits started: the variant cycles A, B, C
  let poseTs = null; // seconds into the spit this frame (null: no sample)
  let trailSet = false; // the trailing blade's pose was set this frame
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  const tq = new Quaternion();
  const qa = new Quaternion();
  const qb = new Quaternion();
  const qc = new Quaternion();
  const ONE = new Vector3(1, 1, 1);
  const XA = new Vector3(1, 0, 0);
  const YA = new Vector3(0, 1, 0);
  const ZA = new Vector3(0, 0, 1);
  const wp = new Vector3();
  const m = new Matrix4();
  // the foreleg solver's scratch
  const PX = new Vector3();
  const PY = new Vector3();
  const PZ = new Vector3();
  const BY = new Vector3();
  const BZ = new Vector3();
  const J0 = new Vector3();
  const J1 = new Vector3();
  const J2 = new Vector3();
  let age = -1;
  let yawNow = 0;
  let lifeT = 1; // the idle life's ramp (0 while a spit plays)
  let headT = 1; // the head's looks: 0 locked on the target (a spit)
  const lifted = [0, 0, 0, 0];
  const pulled = [0, 0, 0, 0];
  const drawnFeet = HOMES.map((h) => h.clone()); // where each foot is drawn (rig space)
  // the spit's live state
  let mode = 'idle'; // 'idle' | 'wind' | 'grace' | 'post' | 'quick' | 'fold'
  let telR = 0; // the tracked telegraph's resolve tick
  let struck = false; // its strike has begun (its contact is promised)
  let postAt = 0; // clock seconds of the contact frame
  let quickAt = 0;
  let foldAt = 0;
  let graceAt = 0;
  let lastFireK = 0;
  let lastFireAt = -99;
  // the latest live strike: the sim tick its contact lands on (the probe)
  const strike = { id: 'spit', tick: 0 };
  let prevStrike = null;
  let prevTick = 0;

  const lab = {
    abilities: MANTIS_ABILITIES,
    override: null, // { id: 'spit', t } | null
    lastStrike: null, // { id, tick }
    // a foot clampReach pulled in this frame carries no weight
    feet: () => gait.feet().map((q, i) => ({ ...q, planted: q.planted && !(pulled[i] > 0), drawnX: drawnFeet[i].x, drawnZ: drawnFeet[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur }),
    get phase() {
      return mode;
    },
    parts: { body, head, abdomen: abAxis, wings, jaws, coxae, femurs, tibiae, legs, tarsi },
  };

  function markStrike(tick) {
    prevStrike = lab.lastStrike;
    prevTick = strike.tick;
    strike.tick = tick;
    lab.lastStrike = strike;
    struck = true;
  }
  function unmarkStrike() {
    // a telegraph cancelled after its strike began: the contact never landed
    strike.tick = prevTick;
    lab.lastStrike = prevStrike;
    struck = false;
  }

  // The wind-up folds back into the guard: no shot, so no contact either.
  function foldBack(now) {
    if (struck) unmarkStrike();
    mode = 'fold';
    foldAt = now;
  }

  // The live spit: the telegraph's beats and the fire pulse.
  function liveSpit(P, e, tick, now) {
    poseTs = null;
    trailSet = false;
    const fireK = P.fireK ?? 0;
    const fireEdge = fireK > 0 && lastFireK <= 0;
    lastFireK = fireK;
    if (fireEdge) lastFireAt = now;
    const beat = watch.update(P);
    if (beat && beat.type === 'wind') {
      mode = 'wind';
      telR = watch.telegraph.resolveTick;
      struck = false;
      variant = spitN++ % SPIT_VARIANTS.length;
    } else if (beat && (beat.type === 'release' || beat.type === 'cancel')) {
      if (now - lastFireAt <= 0.1) {
        // the shot leaves: only the fire pulse (enemy_fire) says so. On the
        // host it lands on the release frame; a guest's snapshot may clear
        // the telegraph a frame either side of it.
        if (!struck) markStrike(telR);
        mode = 'post';
        postAt = now;
      } else {
        // the telegraph ended with no shot (yet): a stun, blind or room
        // clear on (or just before) the resolve tick cancels it before the
        // shot (sim/enemies.js resolveEnemies), and the watch can only call
        // that a release when the entity carries no status. In its last
        // ticks, hold for the pulse a moment (a guest's snapshot can run a
        // tick ahead of the fire event), unless the sim is known to hold it.
        Object.assign(from, cur);
        Object.assign(trailFrom, trail);
        if ((beat.type === 'release' || tick >= telR - LATE_TICKS) && !heldBy(e, telR)) {
          mode = 'grace';
          graceAt = now;
        } else foldBack(now);
      }
    }
    if (mode === 'grace') {
      if (fireEdge) {
        if (!struck) markStrike(telR);
        mode = 'post';
        postAt = now;
      } else if (now - graceAt > GRACE_SEC) foldBack(now); // no shot came
    }
    // a shot with no telegraph to account for it (a guest's late snapshot):
    // spit on the pulse, one frame of wind-back inside the strike (B1)
    if (fireEdge && !watch.telegraph && !(mode === 'post' && now - postAt < 0.2)) {
      Object.assign(from, cur);
      lerpFields(wind, from, COIL, 0.5, FIELDS);
      variant = spitN++ % SPIT_VARIANTS.length;
      mode = 'quick';
      quickAt = now;
      // the contact's sim tick: the shown tick (P.tick + 1) plus the quick
      // wind and strike
      markStrike(tick + 1 + (QUICK_WIND + QUICK_STRIKE) * TICK_HZ);
    }

    if (mode === 'wind') {
      const tel = e && e.telegraph;
      if (!tel) return false;
      // the wind-up rides the telegraph's progress: the rear stretches to the
      // span, the coil and the strike keep their ticks, the contact is the
      // resolve tick. Sampled on the SHOWN tick: the layer passes
      // stateTick - 1 + alpha while the telegraph is the state's own, so the
      // release is seen at P.tick ~ R - 1; one tick ahead, the strike's last
      // in-between shows and the contact lands on the release frame.
      const u = telegraphProgress(e, tick + 1);
      const span = Math.max(1, tel.resolveTick - tel.startTick);
      const left = span * (1 - u);
      let ts;
      if (left <= COIL_TICKS + STRIKE_TICKS) ts = SPIT_CONTACT - left / TICK_HZ;
      else ts = Math.min(1, (span * u) / Math.max(1, span - COIL_TICKS - STRIKE_TICKS)) * REAR_SEC;
      if (!struck && left <= STRIKE_TICKS) markStrike(tel.resolveTick);
      poseTs = Math.min(SPIT_CONTACT, ts);
      mantisSpitPose(poseTs, cur, variant);
      return true;
    }
    if (mode === 'grace') {
      Object.assign(cur, from);
      Object.assign(trail, trailFrom);
      trailSet = true;
      return true;
    }
    if (mode === 'quick') {
      const q = now - quickAt;
      if (q < QUICK_WIND) {
        lerpFields(cur, from, wind, ease.out(q / QUICK_WIND), FIELDS);
        return true;
      }
      if (q < QUICK_WIND + QUICK_STRIKE) {
        lerpFields(cur, wind, STRIKE, ease.in((q - QUICK_WIND) / QUICK_STRIKE), FIELDS);
        return true;
      }
      mode = 'post';
      postAt = quickAt + QUICK_WIND + QUICK_STRIKE;
    }
    if (mode === 'post') {
      const ts = SPIT_CONTACT + (now - postAt);
      if (ts >= SPIT_TL.duration) {
        mode = 'idle';
        return false;
      }
      poseTs = ts;
      mantisSpitPose(ts, cur, variant);
      return true;
    }
    if (mode === 'fold') {
      const k = (now - foldAt) / FOLD_SEC;
      if (k >= 1) {
        mode = 'idle';
        return false;
      }
      // the wind-up folds back into the guard (one overshoot), the head
      // ducking and the forelegs tucking as it flinches off the attack
      lerpFields(cur, from, REST, 1 - settle(k), FIELDS);
      lerpFields(trail, trailFrom, REST, 1 - settle(k), FIELDS);
      trailSet = true;
      const f = Math.sin(Math.PI * Math.min(1, k * 1.6));
      cur.hp += 0.14 * f;
      cur.at -= 0.4 * f;
      cur.push -= 0.02 * f;
      trail.at -= 0.4 * f;
      return true;
    }
    return false;
  }

  // A foreleg bone at angle a on the hinge plane (PX the hinge, PY up, PZ
  // forward), from P0; writes its far end into P1.
  function armBone(row, i, a, len, P0, P1) {
    BY.copy(PY).multiplyScalar(-Math.cos(a)).addScaledVector(PZ, Math.sin(a));
    BZ.crossVectors(PX, BY);
    row.setMatrixAt(i, setTRS(m, P0, PX, BY, BZ, 1, 1, 1));
    P1.copy(P0).addScaledVector(BY, len);
  }
  // One foreleg on its hinge plane: the plane turned out by asp and leaned
  // out by aln; each bone at its angle from straight down toward forward.
  function placeArm(i, s) {
    // the leading blade (or both, on the double crash) rides the spit; the
    // other trails it
    const lead = SPIT_VARIANTS[variant].lead;
    const a = lead === 0 || lead === s ? cur : trail;
    qa.setFromAxisAngle(YA, s * a.asp);
    qb.setFromAxisAngle(ZA, -s * a.aln);
    tq.multiplyQuaternions(qa, qb);
    PX.copy(XA).applyQuaternion(tq);
    PY.copy(YA).applyQuaternion(tq);
    PZ.copy(ZA).applyQuaternion(tq);
    J0.copy(SHOULDER[i]);
    armBone(coxae, i, a.ac, LC, J0, J1);
    armBone(femurs, i, a.af, LF, J1, J2);
    if (s < 0) hand.position.copy(J2);
    armBone(tibiae, i, a.at, LT, J2, J0);
    // the claw tip: the tibia's end and its hook
    (s < 0 ? tipR : tipL).position.copy(J0).addScaledVector(BY, CLAW * 0.8).addScaledVector(BZ, CLAW * 0.35);
  }

  function placeWings() {
    const w = cur.wing;
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1;
      // folded: on the spindle, the outer edge draping, the tip down onto the
      // tail; fanned: spread wide out to the sides and lifted off it, clear
      // of the head (a narrower, steeper fan passed through its back)
      qa.setFromAxisAngle(ZA, -s * 0.95 * w);
      qb.setFromAxisAngle(XA, -0.08 + 0.6 * w);
      qc.setFromAxisAngle(YA, s * 0.42 * (1 - 0.6 * w));
      tq.multiplyQuaternions(qa, qb).multiply(qc);
      wp.set(s * 0.03, 0.06, 0.08 + (s > 0 ? 0.006 : 0));
      wings.setMatrixAt(i, m.compose(wp, tq, ONE));
    }
    wings.instanceMatrix.needsUpdate = true;
  }

  function placeJaws() {
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1;
      // down and forward off the face, hooking in to the midline; the flare
      // swings them out
      PY.set(s * (0.15 + 0.55 * cur.jaw), -0.55, 0.85);
      basis(PY, PZ.set(-s, 0, 0.2), BZ, BY, J0);
      setTRS(m, J1.set(s * 0.048, -0.055, 0.122), BZ, BY, J0, 1, 1, 1);
      jaws.setMatrixAt(i, m);
    }
    jaws.instanceMatrix.needsUpdate = true;
  }

  function pose(P) {
    const dt = clock.step(P);
    const now = clock.now;
    const e = P.e || null;
    // the sim tick, held through a hitstop (never the raw saw-tooth)
    const tick = Number.isFinite(P.tick) && !P.turntable ? clock.tick : (P.tick ?? 0);
    const turntable = !!P.turntable;
    // B7: grow from the floor (not on the Journal's turntable, nor where the
    // caller says the foe stands grown: the lab)
    if (age < 0) age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    spawn.scale.setScalar(spawnScale(age));

    // --- the spit: the lab's pure override, or the live telegraph
    let acting;
    if (lab.override) {
      const ab = MANTIS_ABILITIES[lab.override.id];
      variant = ab ? ab.variant : 0;
      poseTs = lab.override.t;
      trailSet = false;
      mantisSpitPose(poseTs, cur, variant);
      acting = true;
    } else {
      acting = liveSpit(P, e, tick, now);
      if (!acting) Object.assign(cur, REST);
    }
    // the trailing blade: the same spit TRAIL_SEC behind (a fold or a hold
    // set it above; anything else moves both blades together)
    if (!acting) Object.assign(trail, cur);
    else if (poseTs !== null) mantisSpitPose(poseTs - TRAIL_SEC, trail, variant);
    else if (!trailSet) Object.assign(trail, cur);

    // --- feet: locked to the floor, stepping on their own
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    // a lab scrub (no time passing) stands the feet on their homes: a still
    // frame has no step history to show
    gait.update(dt, fr, { locked: !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override) });
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = Math.max(-1, Math.min(1, lv.z / RUN_SPEED));
    const side = Math.max(-1, Math.min(1, lv.x / RUN_SPEED));

    // --- the idle life (never under the lab's override: pure in t): a slow
    // breath, the mantis's leaf-in-the-wind rock, the head's scan
    const live = lab.override ? 0 : 1;
    // its weight eases out as a spit begins (the head settles onto the
    // target through the rear) and back in after the settle, never in one
    // frame
    lifeT = acting ? Math.max(0, lifeT - dt / LIFE_OUT) : Math.min(1, lifeT + dt / LIFE_IN);
    const lifeK = lifeT * lifeT * (3 - 2 * lifeT);
    const still = live * lifeK * (1 - Math.min(1, gait.speed / 0.6));
    const breath = live * Math.sin(now * 1.7);
    const rock = still * Math.sin(now * 3.4);
    // the head: snapped onto the target while it spits, saccades otherwise
    headT = acting ? Math.max(0, headT - dt / HEAD_LOCK) : Math.min(1, headT + dt / HEAD_LOCK);
    const scan = live * headT * headT * (3 - 2 * headT) * (1 - Math.min(1, gait.speed / 0.6)) * saccade(now);

    // --- the body: the attack's pose, the gait's bob and roll, the lean along
    // the travel (an advance leans in, a backpedal leans back), the rock
    body.rotation.set(cur.pitch + 0.09 * fwd, 0, cur.roll - 0.07 * side + 0.025 * bob * (lv.x >= 0 ? 1 : -1) + 0.035 * rock);
    body.scale.set(cur.sx, cur.sy * (1 + 0.01 * breath), 1 + (cur.sx - 1) * 0.3);
    placeBody(body, PIVOT, cur.push, cur.lift + 0.016 * bob + 0.006 * breath);
    body.position.x += 0.014 * rock;
    head.rotation.set(cur.hp - 0.03 * bob, cur.hy + scan, 0);
    abPivot.rotation.x = cur.ab + 0.03 * breath;
    const swell = 1 + 0.07 * cur.pump;
    abAxis.scale.set(swell, 1 + 0.02 * cur.pump, swell);
    // the tell breathes faintly and flares with the charge (a glint, not a lamp)
    const g = 0.28 + 0.1 * Math.sin((P.t ?? 0) * 3.1) + 0.32 * cur.glint;
    for (const glow of glows) glow.material.opacity = g;

    placeWings();
    placeJaws();
    placeArm(0, -1);
    placeArm(1, 1);
    coxae.instanceMatrix.needsUpdate = true;
    femurs.instanceMatrix.needsUpdate = true;
    tibiae.instanceMatrix.needsUpdate = true;

    // --- legs: the hips ride the body, the feet stand where the gait put
    // them (a foot the body rears out of reach of lifts straight up)
    body.updateMatrix();
    for (let i = 0; i < 4; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      foot.y += ANKLE;
      lifted[i] = liftToReach(hipW, foot, L1, L2);
      // a foot still past the leg's reach (a fast turn, a short blink) is
      // drawn pulled in and steps at the next update: never a stretched bone
      pulled[i] = clampReach(hipW, foot, L1, L2);
      if (pulled[i] > 0) gait.release(i);
      drawnFeet[i].copy(foot);
      solveKnee(hipW, foot, L1, L2, BEND[i], knee);
      legs.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, LEG_R[0], LEG_R[0], 0.025));
      legs.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, LEG_R[1], LEG_R[1], 0.015));
      foot.y -= ANKLE; // the tarsal claw lies on the floor under the shin's end
      tq.setFromAxisAngle(YA, TARSUS_YAW[i]);
      tarsi.setMatrixAt(i, m.compose(foot, tq, ONE));
    }
    legs.instanceMatrix.needsUpdate = true;
    tarsi.instanceMatrix.needsUpdate = true;
  }

  return {
    group: F.group,
    mats: F.mats,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    pose,
    // everything that moves (the hit envelope wraps it); the contact shadow
    // stays on the group, on the floor
    body: F.yaw,
    lab,
    modelStandard: true,
    points: { tip: tipR, tipL, hand, mouth },
    // The shared hit envelope's tuning (§6.1 item 9): a tall, light stick
    // insect squashes less than a stocky boar, flinches and is knocked a
    // touch more; the flinch bulges at the thorax, high on the stilts.
    react: { squash: 0.8, flinch: 1.1, knock: 1.15, axis: 'y', midY: 0.72 },
    death: { swell: 0.85, throw: 1.15 },
  };
}
