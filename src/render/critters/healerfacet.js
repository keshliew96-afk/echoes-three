// HEALER, MODEL STANDARD (docs/MODEL_STANDARD.md). The player's hero in the
// faceted look, laid ON TOP of the chibi mouse of healer.js (BUILD_BRIEF
// §19.2): the same wide-based CLOSED BELL cloak in Sage, the same round ears,
// short snout, head proportions and painted face, the same staff held out to
// the side and forward with the same Bright Heal gem (its exact colour logic
// and glow sprites; the gem is her healing source, so it alone keeps the
// reserved hue). What changes:
//
//   * every mass is faceted (render/facet/material.js): the cloak is a twelve-
//     sided bell, the skull a low-poly ball, the ears, snout, arms and paws
//     cut flat;
//   * detail from the parts kit (render/facet/kit.js): a capelet of
//     overlapping leaves round the shoulders (open at the front over the bone
//     bib), a scalloped hem of leaves, a folded sash, criss-cross bindings on
//     the shaft, a bead collar and a pewter claw setting round the gem
//     (pewter, never gold: amber is reserved);
//   * two small faceted feet peeking out under the bell's front hem (the
//     classic has none), on LOCKED FEET (Kesh's self-check): planted feet
//     stay pinned while they carry weight and step one at a time along the
//     real travel, so a kiting walk steps backward or sideways;
//   * a THREE-HIT STAFF COMBO on the basic bolt (Kesh's template): a diagonal
//     forehand down across the front, a rising backhand back out past the
//     staff side, then an overhead cast with a hop. Each hit's overshoot and
//     settle IS the next hit's wind-up; the hips lead and the staff trails a
//     frame behind; the free paw counterbalances every throw;
//   * four ability timelines that cover every Healer skill shape: Lantern
//     Point (projectile, direct), Bloom (nova, aura), Staff Plant
//     (ground_aoe) and Wide Sweep (melee_arc).
//
// She is RANGED: the bolt leaves the gem on the press (BUILD_BRIEF §6), so
// each release snaps within 2-3 frames of it and the shooter's squash (B3,
// shots: 20, 29, 38% wider) plays on the rig from the attack clock. She
// casts on the move: the feet keep stepping and the walk's bob, roll and
// travel lean stay under the attack pose.
//
// Same contract as buildHealer (apply, torso, head, basePitch, metrics, tip:
// the gem, which the arena reads as the bolts' muzzle), plus `cue(kind, ev)`,
// `hold(dt)`, `comboHitOf(ev)`, `points` and `lab`. Render only: attack
// timing, damage and the sim are untouched.
import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  QuadraticBezierCurve3,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { exactColor, exactColorNearest, faceDecal, mix } from './common.js';
import { sharedGeo } from '../geocache.js';
import { facetize, facetMaterial } from '../facet/material.js';
import { PART_INK_PX, placeRow, plateGeometry, setTRS, wedgeGeometry } from '../facet/kit.js';
import {
  aimLimb,
  createAttackClock,
  createCombo,
  createComboLab,
  createFootLock,
  createMove,
  facetArm,
  FALL_ANGLE,
  fpart,
  HIT_TIMING,
  LAG,
  LUNGE_PITCH_MAX,
  namedPoint,
  posePack,
  settleEase,
  SHOT,
  walkBody,
} from '../facet/hero.js';
import { ease } from '../facet/timeline.js';

// The core's phase easings, by name (createMove's `ease`), for the staff's
// own blend below.
const EASE = Object.freeze({ ...ease, settle: settleEase, linear: (k) => k, hold: () => 1 });

// The classic's proportions (healer.js): the head measurement and the bell.
const HIP = 0.2;
const HEM = 0.022;
const HEAD_C = 0.784;
const HEAD_R = 0.235;
const SX = 1.02, SY = 0.96, SZ = 0.99;
const EAR_TOP = 1.1;
const BELL = [
  [0, HEM],
  [0.21, HEM],
  [0.31, 0.055],
  [0.34, 0.14],
  [0.33, 0.25],
  [0.3, 0.35],
  [0.255, 0.44],
  [0.19, 0.51],
  [0.13, 0.556],
  [0.105, 0.585],
  [0, 0.6],
];
// Twelve sides: the flats sit at cos(15°) of the corners, so the bell is cut
// 2% wide to keep the classic's silhouette width between them.
const BELL_SIDES = 12;
const BELL_GROW = 1.02;
function bellR(y) {
  for (let i = 1; i < BELL.length; i++) {
    if (y <= BELL[i][1]) {
      const [r0, y0] = BELL[i - 1];
      const [r1, y1] = BELL[i];
      return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
    }
  }
  return 0;
}
const bellSlope = (y) => (bellR(y + 0.01) - bellR(y - 0.01)) / 0.02; // dr/dy

// HEALER.moveSpeed (u/s, core/constants.js): full walk lean at full speed.
const WALK_SPEED = 2.4;
// Basic attack: a bolt inside this window of the last one is the next hit
// (she fires every 0.5 s while the button is held).
export const COMBO_WINDOW = 1.0;
// Her release is the press itself (the bolt leaves on the sim's tick): one
// frame of wind-back from rest, the release in 1.5 frames (B1, B2, B4).
const TIMING = Object.freeze({ ...HIT_TIMING, wind: 0.033, strike: 0.05 });

// The staff (staff space, the butt at the origin, as healer.js): the shaft
// runs 0.05..0.86, the gem sits at 0.93, the grip paw at 0.5.
const GEM_Y = 0.93;
const GRIP_ALONG = 0.5;
const SHOULDER_R = new Vector3(0.25, 0.44, 0.08);
const SHOULDER_L = new Vector3(-0.25, 0.44, 0.08);
const REACH = 0.3; // the farthest a stubby arm stretches (u): 1.4x its rest
const REACH_MIN = 0.17; // and the shortest it folds (a blend passing the shoulder)

// --- Key poses (body space; +X is the staff side, +Z the facing). The body
// fields are the hero core's. The staff: hx, hy, hz the grip; el the staff's
// tilt from upright and az the way it tilts (0 forward, +pi/2 out to the
// staff side), so a sweep turns the staff round at a steady tilt; slide: the
// staff pushed through the paw toward the gem (a thrust slides it out);
// spin: about its own shaft. The free paw: fx, fy, fz (the counterbalance).
// glow: the gem's flare (on top of the clip's).
const PACK = posePack({ hx: 0.4, hy: 0.5, hz: 0.19, az: Math.PI / 2, el: 0, slide: 0, spin: 0, fx: -0.31, fy: 0.33, fz: 0.21, glow: 0 });
const { REST, K } = PACK;
// Through the combo she grips the staff low (slide 0.25: the gem rides
// 0.68 u out), so each flick throws a long arc and the butt stays short.
// Three directions (Kesh's template): a diagonal down across the front, a
// rising backhand back out, an overhead cast; each overshoot runs on into
// the next wind-up, so the chain loops: high on the staff side, low on the
// far side, raised over the shoulder, and round again.
// Hit 1, DIAGONAL FOREHAND: the staff cocked high and out behind the staff
// shoulder, the chest turned with it and the free paw out ahead; the hips
// unwind and the staff whips down across the front, the gem snapping out
// toward the aim; the free paw pulls back for balance.
const A1 = K({ yaw: 0.32, pitch: -0.05, roll: 0.03, rx: 0.02, rz: -0.03, sw: 1.02, sh: 0.98, hx: 0.46, hy: 0.56, hz: 0.12, az: 2.0, el: 0.75, slide: 0.25, fx: -0.3, fy: 0.46, fz: 0.32, glow: 0.3 });
const S1 = K({ yaw: -0.28, pitch: 0.12, roll: -0.03, rx: -0.02, rz: 0.04, hx: 0.36, hy: 0.56, hz: 0.32, az: -0.3, el: 1.15, slide: 0.25, fx: -0.37, fy: 0.36, fz: -0.06, glow: 1 });
const O1 = K({ yaw: -0.36, pitch: 0.1, roll: -0.04, rx: -0.025, rz: 0.03, sw: 1.01, sh: 0.99, hx: 0.3, hy: 0.53, hz: 0.34, az: -0.9, el: 1.55, slide: 0.25, fx: -0.37, fy: 0.38, fz: -0.08, glow: 0.8 });
// Hit 2, RISING BACKHAND: the gem held low on the far side (the staff
// shoulder forward, crouched), then the legs drive up as the staff flicks
// up and out past the staff side; the free paw swings forward with the
// counter-turn.
const A2 = K({ yaw: -0.34, pitch: 0.08, roll: -0.03, rx: -0.02, ry: -0.025, rz: -0.03, sw: 1.04, sh: 0.96, hx: 0.24, hy: 0.5, hz: 0.33, az: -1.2, el: 1.85, slide: 0.25, spin: -0.5, fx: -0.36, fy: 0.5, fz: -0.06, glow: 0.3 });
const S2 = K({ yaw: 0.3, pitch: 0.1, roll: 0.03, rx: 0.02, ry: 0.02, rz: 0.04, sw: 0.98, sh: 1.03, hx: 0.4, hy: 0.58, hz: 0.28, az: 0.9, el: 0.65, slide: 0.25, spin: 0.3, fx: -0.27, fy: 0.42, fz: 0.32, glow: 1 });
const O2 = K({ yaw: 0.38, pitch: 0.05, roll: 0.04, rx: 0.025, ry: 0.02, rz: 0.03, sw: 0.99, sh: 1.02, hx: 0.43, hy: 0.6, hz: 0.24, az: 1.2, el: 0.5, slide: 0.25, spin: 0.5, fx: -0.26, fy: 0.44, fz: 0.32, glow: 0.8 });
// Hit 3, OVERHEAD CAST (the finisher, the biggest: B6): up on the toes,
// stretched tall, the staff raised back over the staff shoulder with the
// free paw aiming ahead; then a hop and the staff thrown over the top, the
// gem flung forward on a long reach (the staff slides through the paw),
// still in the air at the release, landing squashed two frames later.
const A3 = K({ yaw: 0.22, pitch: -0.14, roll: 0.02, ry: 0.03, rz: -0.035, sw: 0.96, sh: 1.06, hx: 0.36, hy: 0.66, hz: 0.1, az: 0.1, el: -0.7, slide: 0.3, fx: -0.22, fy: 0.56, fz: 0.32, glow: 0.5 });
const S3 = K({ yaw: -0.18, pitch: 0.22, roll: -0.02, rz: 0.06, hop: 0.13, sw: 0.93, sh: 1.12, hx: 0.32, hy: 0.6, hz: 0.3, az: 0.05, el: 0.95, slide: 0.35, fx: -0.37, fy: 0.34, fz: -0.06, glow: 1 });
const O3 = K({ yaw: -0.24, pitch: 0.16, roll: -0.02, rz: 0.05, hop: 0, sw: 1.1, sh: 0.9, hx: 0.3, hy: 0.54, hz: 0.32, az: -0.05, el: 1.15, slide: 0.36, fx: -0.37, fy: 0.33, fz: -0.06, glow: 0.8 });
// The finisher's flight: the hop and the stretch fall into the landing
// squash with gravity (accelerating), so she is airborne and stretched at
// the release and lands squashed at the end of the overshoot.
const LAND = ['hop', 'sw', 'sh'];
function landing(out, s) {
  if (s.id !== 'overshoot') return;
  const k = s.k * s.k;
  for (const f of LAND) out[f] = S3[f] + (O3[f] - S3[f]) * k;
}
const HITS = createCombo(
  PACK,
  [
    { label: 'diagonal forehand', from: A1, strike: S1, over: O1 },
    { label: 'rising backhand', from: A2, strike: S2, over: O2 },
    { label: 'overhead cast', from: A3, strike: S3, over: O3, extra: landing },
  ],
  { window: COMBO_WINDOW, timing: TIMING, recoil: false }
);
export const HEALER_HITS = HITS;

// --- Abilities: every Healer skill shape plays one. In game a skill enters
// its timeline one frame before its release (the press is instant,
// BUILD_BRIEF §6: the gather plays compressed after it); the lab plays the
// whole gather. Each settles into the stance with one small overshoot.
// Lantern Point (projectile, direct): the staff levelled at the target and
// drawn back low and tight through the paw, the gem dimmed at the hip, the
// weight back; then thrust out like a lance, the staff sliding forward
// through the paw so the gem points at the target on a long reach, the body
// stretching into it (B5).
const G_POINT = K({ yaw: 0.2, pitch: -0.08, rz: -0.035, sw: 1.03, sh: 0.97, hx: 0.42, hy: 0.52, hz: 0.0, az: 0.15, el: 1.25, slide: -0.1, fx: -0.24, fy: 0.46, fz: 0.3, glow: 0.45 });
const S_POINT = K({ yaw: -0.12, pitch: 0.18, rz: 0.05, sw: 0.95, sh: 1.07, hx: 0.35, hy: 0.56, hz: 0.33, az: 0.02, el: 1.05, slide: 0.3, fx: -0.36, fy: 0.34, fz: -0.04, glow: 1 });
// Bloom (nova, aura): up on the toes, the staff raised high and upright at
// her side (the face stays clear), then the bloom: the body squashes down
// and out as the gem flares.
const G_BLOOM = K({ pitch: -0.1, ry: 0.035, sw: 0.95, sh: 1.08, hx: 0.4, hy: 0.64, hz: 0.1, az: 1.45, el: 0.1, slide: 0.24, fx: -0.36, fy: 0.48, fz: 0.18, glow: 0.8 });
const S_BLOOM = K({ pitch: 0.06, ry: -0.02, sw: 1.12, sh: 0.9, hx: 0.41, hy: 0.6, hz: 0.12, az: 1.35, el: 0.14, slide: 0.28, fx: -0.42, fy: 0.36, fz: 0.12, glow: 1 });
// Staff Plant (ground_aoe): the staff lifted at her side, then its butt
// driven into the ground beside her with a lunge step, the free paw flung
// open for balance.
const G_PLANT = K({ yaw: 0.15, pitch: -0.1, ry: 0.03, rz: -0.03, sw: 0.96, sh: 1.06, hx: 0.42, hy: 0.66, hz: 0.1, az: 1.57, el: 0.06, fx: -0.25, fy: 0.46, fz: 0.28, glow: 0.6 });
const S_PLANT = K({ yaw: -0.05, pitch: 0.14, ry: -0.02, rz: 0.07, sw: 1.12, sh: 0.9, step: 0.7, hx: 0.43, hy: 0.515, hz: 0.16, az: 1.3, el: 0.1, fx: -0.44, fy: 0.46, fz: 0.12, glow: 1 });
// Wide Sweep (melee_arc): the staff wound far out and back, then swept
// round the front at a steady low tilt to the far side, the hips unwinding
// ahead of it.
const G_SWEEP = K({ yaw: 0.42, pitch: -0.04, rz: -0.03, sw: 1.04, sh: 0.97, hx: 0.44, hy: 0.5, hz: 0.08, az: 2.3, el: 1.0, slide: 0.34, fx: -0.24, fy: 0.44, fz: 0.3, glow: 0.6 });
const S_SWEEP = K({ yaw: -0.3, pitch: 0.12, rz: 0.05, sw: 1.06, sh: 0.95, hx: 0.31, hy: 0.5, hz: 0.34, az: -1.05, el: 1.08, slide: 0.34, fx: -0.32, fy: 0.34, fz: -0.02, glow: 1 });
const F_SWEEP = K({ yaw: -0.4, pitch: 0.08, rz: 0.04, sw: 1.02, sh: 0.98, hx: 0.29, hy: 0.5, hz: 0.31, az: -1.45, el: 1.12, slide: 0.34, fx: -0.33, fy: 0.33, fz: -0.04, glow: 0.8 });
// a held pose breathes a little, and the gem pulses
const breathe = (out, s) => {
  if (s.id === 'hold') {
    const b = Math.sin(s.k * Math.PI);
    out.ry += -0.01 * b;
    out.glow += 0.15 * b;
  }
};
const LEAD_IN = 0.033; // a skill enters one frame before its release
export const HEALER_MOVES = Object.freeze({
  point: createMove(
    PACK,
    'point',
    'Lantern Point',
    [
      { id: 'gather', label: 'draw back', dur: 0.14, to: G_POINT, ease: 'out' },
      { id: 'release', label: 'thrust (release)', dur: 0.05, to: S_POINT, ease: 'out' },
      { id: 'hold', label: 'point held', dur: 0.18, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.38, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', lead: LEAD_IN, cues: [{ at: 0.19, id: 'point' }], extra: breathe }
  ),
  bloom: createMove(
    PACK,
    'bloom',
    'Bloom',
    [
      { id: 'raise', label: 'raise the staff', dur: 0.2, to: G_BLOOM, ease: 'out' },
      { id: 'bloom', label: 'bloom (release)', dur: 0.07, to: S_BLOOM, ease: 'out' },
      { id: 'hold', label: 'glow held', dur: 0.28, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.42, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'bloom', lead: LEAD_IN, cues: [{ at: 0.27, id: 'bloom' }], extra: breathe }
  ),
  plant: createMove(
    PACK,
    'plant',
    'Staff Plant',
    [
      { id: 'lift', label: 'lift the staff', dur: 0.18, to: G_PLANT, ease: 'out' },
      { id: 'plant', label: 'plant (release)', dur: 0.07, to: S_PLANT, ease: 'in' },
      { id: 'hold', label: 'planted', dur: 0.3, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.42, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'plant', lead: LEAD_IN, cues: [{ at: 0.25, id: 'plant' }], extra: breathe }
  ),
  sweep: createMove(
    PACK,
    'sweep',
    'Wide Sweep',
    [
      { id: 'gather', label: 'wind out', dur: 0.14, to: G_SWEEP, ease: 'out' },
      { id: 'sweep', label: 'sweep (release)', dur: 0.1, to: S_SWEEP, ease: 'in' },
      { id: 'follow', label: 'follow-through', dur: 0.12, to: F_SWEEP, ease: 'out' },
      { id: 'settle', label: 'settle', dur: 0.4, to: REST, ease: 'settle' },
    ],
    { contact: 'follow', entry: 'sweep', lead: LEAD_IN, cues: [{ at: 0.24, id: 'sweep' }] }
  ),
});
// Which ability a Healer skill plays, by its shape (all nineteen skills).
export const HEALER_SKILL_ABILITY = Object.freeze({ projectile: 'point', direct: 'point', nova: 'bloom', aura: 'bloom', ground_aoe: 'plant', melee_arc: 'sweep' });
const skillAbility = (ev) => HEALER_SKILL_ABILITY[ev && ev.shape] || 'point';
export const HEALER_REST = REST;

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------
// A leaf: a pointed oval folded along its midrib (the rib raised on the face,
// +Z, so one half catches the light and the other falls dark) over a low
// back; the stem at y = 0, the tip at y = 1, widest a third of the way up.
function leafGeometry() {
  return sharedGeo('facet:healer-leaf', () => {
    const S = [0, 0, 0];
    const T = [0, 1, 0];
    const rim = [
      [0.3, 0.1, 0],
      [0.5, 0.36, 0],
      [0.38, 0.68, 0],
    ];
    const mirror = (p) => [-p[0], p[1], p[2]];
    const F1 = [0, 0.3, 0.13];
    const F2 = [0, 0.66, 0.1];
    const B = [0, 0.42, -0.05];
    const tris = [];
    for (const side of [1, -1]) {
      const [a, b, c] = side > 0 ? rim : rim.map(mirror);
      tris.push([S, a, F1], [a, b, F1], [b, F2, F1], [b, c, F2], [c, T, F2]);
      tris.push([S, a, B], [a, b, B], [b, c, B], [c, T, B]);
    }
    const pos = [];
    const ctr = [0, 0.42, 0.03]; // inside: wind every face away from it
    for (const [a, b, d] of tris) {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const m = [(a[0] + b[0] + d[0]) / 3 - ctr[0], (a[1] + b[1] + d[1]) / 3 - ctr[1], (a[2] + b[2] + d[2]) / 3 - ctr[2]];
      const flip = n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0;
      pos.push(...a, ...(flip ? d : b), ...(flip ? b : d));
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    return facetize(g, { jitter: 0.1, seed: 101 });
  });
}

// The staff's axis (butt to gem) from a pose's tilt: el from upright, az
// round from the facing (0) toward the staff side (+pi/2).
function staffDir(p, out) {
  const se = Math.sin(p.el);
  return out.set(se * Math.sin(p.az), Math.cos(p.el), se * Math.cos(p.az));
}

const tP = new Vector3();
const tX = new Vector3();
const tY = new Vector3();
const tZ = new Vector3();
const tN = new Vector3();
// A part on the bell at angle phi (0 = front) and height y: its local Y runs
// DOWN the bell's surface (a hanging leaf's length) tipped `tilt` out from
// it, its local Z faces out, X = Y x Z (a right-handed basis, so the part is
// never mirrored inside out).
function onBellHanging(m, phi, y, out, w, len, thick, tilt) {
  const r = bellR(y) * BELL_GROW * out;
  const sx = Math.sin(phi);
  const cz = Math.cos(phi);
  tP.set(sx * r, y, cz * r);
  // the slope half way down the leaf, so it lies along a curving bell
  const s = bellSlope(y - len * 0.4);
  // down the meridian: dy = -1 moves the radius by -s
  tY.set(-s * sx, -1, -s * cz).normalize();
  tN.set(sx, 0, cz).addScaledVector(tY, -(sx * tY.x + cz * tY.z)).normalize(); // outward, off the slope
  const c = Math.cos(tilt);
  const sn = Math.sin(tilt);
  tZ.copy(tN).multiplyScalar(c).addScaledVector(tY, -sn);
  tY.multiplyScalar(c).addScaledVector(tN, sn);
  tX.crossVectors(tY, tZ).normalize();
  setTRS(m, tP, tX, tY, tZ, w, len, thick);
}
// A plate on the bell (a sash fold): local Y faces out, X runs round it.
function onBellPlate(m, phi, y, out, w, h, l) {
  const r = bellR(y) * BELL_GROW * out;
  const sx = Math.sin(phi);
  const cz = Math.cos(phi);
  tP.set(sx * r, y, cz * r);
  tY.set(sx, 0.12, cz).normalize();
  tX.set(cz, 0, -sx).normalize();
  tZ.crossVectors(tX, tY).normalize();
  setTRS(m, tP, tX, tY, tZ, w, h, l);
}

export function buildHealerFacet(rig, trackAccent) {
  const accent = CLASS_ACCENTS.healer;
  // §19.1/19.2: Warm Grey is the shared party base; only the garment carries
  // the class accent (as healer.js).
  const fur = mix(PALETTE.warmGrey, PALETTE.paleGold, 0.14);
  const furHex = fur.getHex();
  // The feet: the fur a step darker, so they read under the dark hem.
  const footHex = mix(furHex, PALETTE.bruiseUmber, 0.22).getHex();
  // The leaves: the Sage cloak lightened in two steps at its own hue (the
  // capelet lighter than the hem), all accent-derived and so tracked to
  // charcoal when she goes down. Not mixed toward Bone: that greys them, and
  // at play zoom, seen from behind, the capelet then reads grey instead of
  // Sage.
  const sage = (l, s) => {
    const c = new Color(accent);
    const o = {};
    c.getHSL(o);
    return c.setHSL(o.h, s, l).getHex();
  };
  const leafHex = sage(0.13, 0.4);
  const hemHex = sage(0.095, 0.43);
  // The staff wood: the classic's Umber-into-Pale-Gold weathered toward Warm
  // Grey, so it reads as wood but stays out of the reserved amber family
  // (the classic's own mix measures inside it).
  const woodHex = mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.3).lerp(new Color(PALETTE.warmGrey), 0.3).getHex();
  const wrapHex = mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.35).getHex();
  // Pewter for the claw setting and the beads (the video's gold accents
  // become pewter: amber is reserved), a cool Bone into charcoal.
  const pewterHex = mix(PALETTE.bone, PALETTE.voidCharcoal, 0.42).lerp(new Color(PALETTE.signalBlue), 0.06).getHex();
  // The sash: a Warm Grey cord darkened toward Umber, so it parts the bone
  // bib from the leaf hem.
  const sashHex = mix(PALETTE.warmGrey, PALETTE.bruiseUmber, 0.4).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group(); // authored in feet-origin coordinates
  body.position.y = -HIP;
  torso.add(body);

  const cloakMat = trackAccent(facetMaterial(accent));
  const collarMat = trackAccent(facetMaterial(mix(accent, PALETTE.voidCharcoal, 0.2).getHex()));
  const leafMat = trackAccent(facetMaterial(leafHex));
  const hemMat = trackAccent(facetMaterial(hemHex));
  const furMat = facetMaterial(furHex);
  const footMat = facetMaterial(footHex);
  const boneMat = facetMaterial(PALETTE.bone);
  const innerMat = facetMaterial(mix(PALETTE.bone, PALETTE.bruiseUmber, 0.35).getHex());
  const woodMat = facetMaterial(woodHex);
  const wrapMat = facetMaterial(wrapHex);
  const pewterMat = facetMaterial(pewterHex);
  const sashMat = facetMaterial(sashHex);

  // --- The closed bell: the base flares far wider than the shoulders.
  const bellGeo = sharedGeo('facet:healer-bell', () => {
    const g = new LatheGeometry(BELL.map(([x, y]) => new Vector2(x * BELL_GROW, y)), BELL_SIDES);
    return facetize(g, { jitter: 0.12, seed: 103 });
  });
  const cloak = fpart(bellGeo, cloakMat);
  body.add(cloak);

  // Bone bib down the front (storybook trim), faceted.
  const BIB = [
    [0.325, 0.16],
    [0.33, 0.25],
    [0.3, 0.35],
    [0.255, 0.44],
    [0.2, 0.5],
  ];
  const bibGeo = sharedGeo('facet:healer-bib', () => facetize(new LatheGeometry(BIB.map(([x, y]) => new Vector2(x * BELL_GROW * 1.03, y)), 4, -0.58, 1.16), { jitter: 0.06, seed: 105 }));
  const bib = new Mesh(bibGeo, boneMat);
  bib.name = 'panel';
  body.add(bib);

  // Narrow accent collar AT the chin: the silhouette's neck pinch (healer.js).
  const collarGeo = sharedGeo('facet:healer-collar', () => facetize(new CylinderGeometry(0.115, 0.15, 0.075, 8), { jitter: 0.08, seed: 107 }));
  const collar = fpart(collarGeo, collarMat);
  collar.position.y = 0.565;
  body.add(collar);

  // --- Detail: a capelet of overlapping leaves low on the shoulders (two
  // brick-laid rows, open at the front over the bib, well below the chin so
  // the head measurement keeps its neck), a scalloped hem of leaves, and a
  // folded sash. Each row is one InstancedMesh, inked thin.
  const leaf = leafGeometry();
  const CAPE = [
    { y: 0.535, n: 11, w: 0.16, len: 0.17, tilt: 0.2, open: 0.6 },
    { y: 0.45, n: 10, w: 0.17, len: 0.16, tilt: 0.16, open: 0.85 },
  ];
  const capeCount = CAPE.reduce((s, r) => s + r.n, 0);
  const cape = placeRow(leaf, leafMat, capeCount, (i, m) => {
    let k = i;
    let row = 0;
    while (k >= CAPE[row].n) k -= CAPE[row++].n;
    const R = CAPE[row];
    const span = Math.PI * 2 - 2 * R.open;
    const phi = R.open + (span * (k + 0.5)) / R.n;
    onBellHanging(m, phi, R.y, 1.04, R.w, R.len, 0.05, R.tilt);
  }, { name: 'healer-cape', seed: 109 });
  body.add(cape);
  const HEM_N = 18;
  const hem = placeRow(leaf, hemMat, HEM_N, (i, m) => {
    const phi = ((i + 0.5) * Math.PI * 2) / HEM_N;
    onBellHanging(m, phi, 0.165, 1.03, 0.14, 0.13, 0.05, 0.06);
  }, { name: 'healer-hem', seed: 111 });
  body.add(hem);
  const SASH_N = 12;
  const sash = placeRow(plateGeometry(), sashMat, SASH_N, (i, m) => {
    onBellPlate(m, (i / SASH_N) * Math.PI * 2, 0.29, 1.02, 0.17, 0.035, 0.055);
  }, { name: 'healer-sash', seed: 113 });
  body.add(sash);

  // --- Head: the classic's proportions, a low-poly ball. The painted face
  // rides just outside it (a facet's middle sits inside the true sphere).
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skullGeo = sharedGeo('facet:healer-skull', () => facetize(new SphereGeometry(HEAD_R, 12, 9), { jitter: 0.07, seed: 115 }));
  const skull = fpart(skullGeo, furMat);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);
  // Small round mouse ears with the inner blush.
  const earGeo = sharedGeo('facet:healer-ear', () => facetize(new SphereGeometry(0.105, 8, 6), { jitter: 0.1, seed: 117 }));
  const innerGeo = sharedGeo('facet:healer-ear-inner', () => facetize(new SphereGeometry(0.055, 7, 5), { jitter: 0.06, seed: 119 }));
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.15, 0.15, -0.025);
    const ear = fpart(earGeo, furMat);
    ear.scale.set(1, 1, 0.42);
    ear.position.y = 0.088;
    pivot.add(ear);
    const inner = new Mesh(innerGeo, innerMat);
    inner.scale.set(1, 1, 0.3);
    inner.position.set(0, 0.075, 0.045);
    pivot.add(inner);
    pivot.rotation.z = side * -0.26;
    head.add(pivot);
    ears.push(pivot);
  }
  // Short snout and ink nose.
  const snoutGeo = sharedGeo('facet:healer-snout', () => facetize(new SphereGeometry(0.078, 8, 6), { jitter: 0.08, seed: 121 }));
  const snout = fpart(snoutGeo, boneMat);
  snout.scale.set(0.9, 0.62, 0.95);
  snout.position.set(0, -0.082, SZ * HEAD_R * 0.82);
  head.add(snout);
  const noseGeo = sharedGeo('facet:healer-nose', () => facetize(new SphereGeometry(0.02, 6, 4), { jitter: 0.05, seed: 123 }));
  const nose = fpart(noseGeo, facetMaterial(PALETTE.voidCharcoal), false);
  nose.position.set(0, -0.062, SZ * HEAD_R * 0.82 + 0.062);
  head.add(nose);
  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, drop: 0.575 }));

  // --- Thin curled mouse tail, faceted.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.2, -0.27);
  const tailGeo = sharedGeo('facet:healer-tail', () => {
    const curve = new QuadraticBezierCurve3(new Vector3(0, 0, 0), new Vector3(0.1, -0.08, -0.13), new Vector3(0.25, 0.02, -0.2));
    return facetize(new TubeGeometry(curve, 10, 0.022, 5), { jitter: 0.08, seed: 125 });
  });
  const tail = fpart(tailGeo, furMat);
  tailPivot.add(tail);
  body.add(tailPivot);

  // --- The staff (butt at its origin, as healer.js): a faceted shaft with
  // criss-cross bindings under the grip and a band under the head, a bead
  // collar, and four pewter claws holding the gem.
  const staff = new Group();
  staff.rotation.order = 'XYZ';
  body.add(staff);
  const shaftGeo = sharedGeo('facet:healer-shaft', () => facetize(new CylinderGeometry(0.024, 0.029, 0.81, 6), { jitter: 0.1, seed: 127 }));
  const shaft = fpart(shaftGeo, woodMat);
  shaft.position.y = 0.455;
  staff.add(shaft);
  const bandGeo = sharedGeo('facet:healer-band', () => facetize(new CylinderGeometry(1, 1, 1, 6), { jitter: 0.08, seed: 129 }));
  const BINDS = [
    [0.3, 0.3],
    [0.333, -0.3],
    [0.366, 0.3],
    [0.399, -0.3],
    [0.432, 0.3],
    [0.8, 0],
    [0.83, 0],
  ];
  const bindings = placeRow(bandGeo, wrapMat, BINDS.length, (i, m) => {
    const [y, tilt] = BINDS[i];
    tY.set(Math.sin(tilt), Math.cos(tilt), 0);
    tZ.set(0, 0, 1);
    tX.crossVectors(tY, tZ).normalize();
    setTRS(m, tP.set(0, y, 0), tX, tY, tZ, 0.034, 0.02, 0.034);
  }, { name: 'healer-binding', seed: 131 });
  staff.add(bindings);
  const beadGeo = sharedGeo('facet:healer-bead', () => facetize(new IcosahedronGeometry(1, 0), { jitter: 0.1, seed: 133 }));
  const BEADS = 6;
  const beads = placeRow(beadGeo, pewterMat, BEADS, (i, m) => {
    const a = (i / BEADS) * Math.PI * 2;
    setTRS(m, tP.set(Math.sin(a) * 0.033, 0.858, Math.cos(a) * 0.033), tX.set(1, 0, 0), tY.set(0, 1, 0), tZ.set(0, 0, 1), 0.014, 0.014, 0.014);
  }, { name: 'healer-beads', ink: false });
  staff.add(beads);
  // The lantern cage: four pewter ribs round the gem, each two blades based
  // at the gem's girth, one tapering down to the collar and one up over the
  // crown, so every rib bulges out round the gem like a lantern's.
  const RIBS = 4;
  const RIB = [
    [0.07, 0.932, 0.022, 0.862],
    [0.07, 0.932, 0.016, 1.002],
  ];
  const claws = placeRow(wedgeGeometry(), pewterMat, RIBS * 2, (i, m) => {
    const a = ((Math.floor(i / 2) + 0.5) / RIBS) * Math.PI * 2;
    const [r0, y0, r1, y1] = RIB[i % 2];
    const ox = Math.sin(a);
    const oz = Math.cos(a);
    tP.set(ox * r0, y0, oz * r0);
    tY.set(ox * (r1 - r0), y1 - y0, oz * (r1 - r0));
    const len = tY.length();
    tY.divideScalar(len);
    tZ.set(ox, 0, oz).addScaledVector(tY, -(ox * tY.x + oz * tY.z)).normalize(); // its flat faces out
    tX.crossVectors(tY, tZ).normalize();
    setTRS(m, tP, tX, tY, tZ, 0.028, len * 1.05, 0.045);
  }, { name: 'healer-cage', inkPx: PART_INK_PX * 0.75, seed: 135 });
  staff.add(claws);

  // --- THE GEM: healer.js's, unchanged (round-3 F6 and the round-4 ACES hue
  // compensation): unlit, no ink, the whole gem family authored up-hue by
  // the measured skew, a two-layer additive halo carrying the cast. It is
  // the only Bright Heal on her: it is her healing source.
  const gemHSL = { h: 0, s: 0, l: 0 };
  new Color(PALETTE.brightHeal).getHSL(gemHSL, SRGBColorSpace);
  const gemAuthored = new Color().setHSL(gemHSL.h + 18 / 360, gemHSL.s, gemHSL.l, SRGBColorSpace).getHex();
  const gemMat = new MeshBasicMaterial({ color: exactColorNearest(gemAuthored) });
  const gem = new Mesh(new OctahedronGeometry(0.052), gemMat);
  gem.name = 'tip';
  gem.position.y = GEM_Y;
  gem.renderOrder = 2;
  staff.add(gem);
  const GLOW_BASE = 0.26;
  const glow = makeGlowSprite({ color: exactColorNearest(gemAuthored).multiplyScalar(3.1), size: GLOW_BASE, opacity: 0.6 });
  glow.position.y = GEM_Y;
  staff.add(glow);
  const flare = makeGlowSprite({
    color: exactColorNearest(gemAuthored).lerp(exactColor(PALETTE.parchment), 0.12).multiplyScalar(1.9),
    size: GLOW_BASE * 0.32,
    opacity: 0.5,
  });
  flare.position.y = GEM_Y;
  staff.add(flare);
  const gemBase = exactColorNearest(gemAuthored);
  const gemDown = exactColor(mix(PALETTE.warmGrey, PALETTE.voidCharcoal, 0.45).getHex());

  // --- Paws and arms (faceted). The grip paw rides the staff where it holds
  // it; the free paw is placed by the pose, within an arm's reach.
  const pawGeo = sharedGeo('facet:paw', () => facetize(new SphereGeometry(1, 7, 5), { jitter: 0.08, seed: 91 }));
  const gripPaw = fpart(pawGeo, furMat);
  gripPaw.scale.setScalar(0.058);
  gripPaw.position.set(0, GRIP_ALONG, 0.014);
  staff.add(gripPaw);
  const freePaw = fpart(pawGeo, furMat);
  freePaw.scale.setScalar(0.058);
  freePaw.position.set(REST.fx, REST.fy, REST.fz);
  body.add(freePaw);
  const armR = facetArm(furMat, 0.056, 0.22, 137);
  armR.position.copy(SHOULDER_R);
  body.add(armR);
  const armL = facetArm(furMat, 0.056, 0.22, 137);
  armL.position.copy(SHOULDER_L);
  body.add(armL);
  // The named points (B8): the grip paw and the gem.
  const hand = namedPoint(gripPaw, 'hand', 0, 0, 0);

  // --- Feet: two small faceted feet peeking out under the bell's front hem
  // (detail added: the classic has none). Children of the rig, so a lean
  // never lifts them; the foot lock pins them in the world.
  const HOME = [new Vector3(-0.115, 0.03, 0.3), new Vector3(0.115, 0.03, 0.3)];
  const footGeo = sharedGeo('facet:healer-foot', () => facetize(new SphereGeometry(1, 7, 5), { jitter: 0.08, seed: 139 }));
  const feet = [];
  for (let i = 0; i < 2; i++) {
    const foot = fpart(footGeo, footMat);
    foot.scale.set(0.058, 0.036, 0.088);
    foot.position.copy(HOME[i]);
    rig.add(foot);
    feet.push(foot);
  }

  // ------------------------------------------------------------------------
  // Locked feet and the attacks (the hero core: render/facet/hero.js).
  // ------------------------------------------------------------------------
  const lock = createFootLock({ rig, feet, home: HOME, lunge: { lead: 1, reach: 0.12, brace: 0.02 } });
  const atk = createAttackClock({
    pack: PACK,
    hits: HITS,
    abilities: HEALER_MOVES,
    skillAbility,
    window: COMBO_WINDOW,
    ranged: true,
  });
  let lastT = null;
  const live = PACK.make();
  const lagged = PACK.make();
  const led = PACK.make();
  const stance = PACK.make();
  const walk = { dy: 0, twist: 0, pitch: 0, roll: 0 };
  const drawn = { az: REST.az };
  const UP = new Vector3(0, 1, 0);
  const dir = new Vector3();
  const grip = new Vector3();
  const qAim = new Quaternion();
  const qSpin = new Quaternion();
  const qDown = new Quaternion();
  const eDown = new Euler();
  const downPos = new Vector3();
  const fp = new Vector3();
  const pA = PACK.make();
  const pB = PACK.make();
  const dA = new Vector3();
  const dB = new Vector3();
  const dE = new Vector3();
  const off = new Vector3();
  const gripBody = new Vector3();

  const lab = {
    abilities: HEALER_MOVES,
    hits: HITS.map((h) => h.timeline),
    get override() {
      return atk.override;
    },
    // { kind: 'hit', n, t, fresh, shot? } | { kind: 'ability', id, t } |
    // { kind: 'spawn', t } | null
    set override(o) {
      atk.setOverride(o);
    },
    cue: atk.cue,
    clock: atk,
    feet: lock.report,
    // the staff's swing (weaponField: its azimuth), as drawn: it trails the hips
    swing: () => drawn.az,
    parts: { torso, head, weapon: staff, staff },
  };

  // Keep a paw within an arm's reach of its shoulder (the stubby arms
  // stretch, but never into noodles).
  function withinReach(p, shoulder) {
    off.subVectors(p, shoulder);
    const d = off.length();
    if (d > REACH) p.copy(shoulder).addScaledVector(off, REACH / d);
    else if (d < REACH_MIN && d > 1e-5) p.copy(shoulder).addScaledVector(off, REACH_MIN / d);
    return p;
  }
  // How far a body-space point of radius `pad` sits inside the bell (its
  // leaves included) or the head; `out` gets the way out.
  const hd = new Vector3();
  function inside(p, pad, out) {
    let deep = 0;
    if (p.y > 0.02 && p.y < 0.6) {
      const d = Math.hypot(p.x, p.z);
      const need = bellR(p.y) * BELL_GROW * 1.05 + pad;
      if (need - d > deep) {
        deep = need - d;
        if (d > 1e-4) out.set(p.x / d, 0, p.z / d);
        else out.set(1, 0, 0);
      }
    }
    hd.set(p.x, p.y - HEAD_C, p.z);
    const dh = hd.length();
    const needH = HEAD_R * SX + pad;
    if (needH - dh > deep) {
      deep = needH - dh;
      out.copy(hd).divideScalar(Math.max(1e-4, dh));
    }
    return deep;
  }
  // Nothing clips through the bell: sample the shaft from butt to gem and
  // push the whole staff (and the paw on it) out of the deepest point, for
  // any pose and any blend between two.
  const SHAFT = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95];
  const sp = new Vector3();
  const way = new Vector3();
  const bestWay = new Vector3();
  function clearStaff() {
    for (let pass = 0; pass < 2; pass++) {
      staff.updateMatrix();
      let worst = 0;
      for (const a of SHAFT) {
        sp.set(0, a, 0).applyMatrix4(staff.matrix);
        const deep = inside(sp, a > 0.88 ? 0.06 : 0.035, way);
        if (deep > worst) {
          worst = deep;
          bestWay.copy(way);
        }
      }
      if (worst <= 0) return;
      staff.position.addScaledVector(bestWay, worst);
    }
  }

  function apply(P, t, fallSign = 1, clip = 'idle') {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const upright = 1 - P.collapse;
    const lay = P.collapse;

    // COMMON-MODE ear sway (healer.js: a constant splay).
    ears[0].rotation.z = -0.26 + 0.7 * P.ear - P.collapse * 0.5;
    ears[1].rotation.z = 0.26 + 0.7 * P.ear + P.collapse * 0.5;
    tailPivot.rotation.y = P.tail * 0.8;
    tailPivot.rotation.z = 0.2 * P.tail;

    // The body an attack takes over from and hands back to: the driver's
    // clip as the factory set it; walking, the walk's lean rides on top of
    // the attack (below), so the base is the part it does not carry.
    const walking = P.collapse < 0.04 && clip === 'walk';
    atk.setBase({
      pitch: walking ? 0 : torso.rotation.x,
      yaw: walking ? walk.twist * 0.4 * upright : torso.rotation.y,
      roll: walking ? 0 : torso.rotation.z,
      sw: rig.scale.x,
      sh: rig.scale.y,
    });
    atk.advance(dt, clip);
    const attacking = atk.active && clip !== 'downed';
    // The hips lead, the staff trails (sampled a frame apart on one timeline).
    if (attacking) atk.sample(live, led, lagged);
    const locked = P.collapse < 0.04;

    // The walk under everything: bob, roll, hip twist and the travel lean
    // from the steps themselves (she casts on the move, so this stays on
    // under an attack and the hips still lead the staff).
    if (locked) walkBody(lock, { walkSpeed: WALK_SPEED }, walk);
    else walk.dy = walk.twist = walk.pitch = walk.roll = 0;
    const walkBob = clip === 'walk' ? P.bob * upright * 0.6 : 0;
    if (attacking) {
      torso.rotation.y = (led.yaw + walk.twist * 0.6) * upright;
      torso.rotation.x = (Math.min(LUNGE_PITCH_MAX, led.pitch) + walk.pitch) * upright;
      torso.rotation.z = (led.roll + walk.roll) * upright;
      rig.position.x = live.rx * upright;
      rig.position.y += (live.ry + live.hop + walk.dy) * upright - walkBob;
      rig.position.z += live.rz * upright;
      rig.scale.set(live.sw, live.sh, live.sw);
    } else {
      rig.position.x = 0;
      if (locked && clip === 'walk') {
        rig.position.y += walk.dy * upright - walkBob;
        torso.rotation.x = walk.pitch * upright;
        torso.rotation.y = walk.twist * upright;
        torso.rotation.z = walk.roll * upright;
      }
    }
    // The shooter's squash (B3, shots): 20/29/38% wider on steady fire and
    // a rig-only shove back off the bolt, after the press.
    const shot = atk.shot();
    if (shot.sw !== 1 || shot.sh !== 1) {
      rig.scale.x *= shot.sw;
      rig.scale.y *= shot.sh;
      rig.scale.z *= shot.sw;
    }
    if (shot.shove > 0) rig.position.z -= SHOT.shove * shot.shove * upright;
    // The head counter-rotates so the face stays up through every lean.
    if (attacking || (locked && clip === 'walk')) {
      head.rotation.x = -torso.rotation.x * 0.88 - 0.18 * upright;
      head.rotation.y = -torso.rotation.y * 0.5 * upright;
    }
    head.rotation.z = -torso.rotation.z * 0.45 * upright;
    // The grow-in on a room entry (B7).
    const sp = atk.spawn();
    if (sp !== 1) rig.scale.multiplyScalar(sp);

    // The staff: an attack places it (a frame behind the hips); otherwise the
    // stance, with the idle flourish and the generic cast lifting it as
    // healer.js does.
    let S = lagged;
    if (!attacking) {
      PACK.copy(stance, REST);
      const lift = Math.max(0, P.prop);
      stance.hy += 0.26 * lift + 0.05 * Math.min(0, P.prop);
      // healer.js cants it by Euler (x -0.2 lift, z 0.12 prop): as a tilt
      const rx = -0.2 * lift;
      const rz = 0.12 * P.prop;
      const dx = -Math.sin(rz);
      const dz = Math.cos(rz) * Math.sin(rx);
      stance.el = Math.asin(Math.min(1, Math.hypot(dx, dz)));
      stance.az = stance.el > 1e-4 ? Math.atan2(dx, dz) : REST.az;
      S = stance;
    }
    drawn.az = S.az;
    staffDir(S, dir);
    // Between two tilted keys the staff swings round at its tilt (az, el: a
    // sweep stays a sweep). Into or out of an upright key it tips straight
    // along its own plane instead: an upright staff has no azimuth, and
    // swinging round to the stance's would carry the butt through the bell.
    if (attacking) {
      const mv = atk.move;
      const tl = mv.timeline;
      const now = atk.moveTime;
      const s = tl.sample(Math.max(0, now - LAG));
      const t0 = tl.startOf(s.id);
      atk.pose(pA, t0 - now);
      atk.pose(pB, t0 + tl.phases[s.index].dur - now);
      if (Math.abs(pA.el) < 0.1 || Math.abs(pB.el) < 0.1) {
        const k = EASE[mv.keys[s.index].ease || 'inOut'](s.k);
        dE.copy(dir); // the drawn pose's own aim
        dir.copy(staffDir(pA, dA)).lerp(staffDir(pB, dB), k);
        if (dir.lengthSq() < 1e-8) dir.copy(dB);
        dir.normalize();
        // a cast entered mid-phase cross-fades in from the pose it took
        // over: so does the aim
        const e = atk.entered(-LAG);
        if (e < 1) {
          dir.lerp(dE, 1 - e);
          if (dir.lengthSq() < 1e-8) dir.copy(dE);
          dir.normalize();
        }
      }
    }
    qAim.setFromUnitVectors(UP, dir);
    qSpin.setFromAxisAngle(UP, S.spin);
    staff.quaternion.copy(qAim).multiply(qSpin);
    grip.set(S.hx, S.hy, S.hz);
    const along = GRIP_ALONG - S.slide;
    staff.position.copy(grip).addScaledVector(dir, -along);
    gripPaw.position.y = along;
    clearStaff();
    // Downed (round-3 F8): the staff swings down to lie flat on the ground
    // beside the body whichever side she fell (healer.js's exact lay).
    if (lay > 0) {
      const flat = -fallSign * (Math.PI / 2 + FALL_ANGLE);
      downPos.set(0.02, -0.1, 0.34);
      qDown.setFromEuler(eDown.set(0, 0, flat));
      staff.position.lerp(downPos, Math.min(1, lay));
      staff.quaternion.slerp(qDown, Math.min(1, lay));
    }
    staff.updateMatrix();
    gripBody.set(0, along, 0.014).applyMatrix4(staff.matrix);
    aimLimb(armR, gripBody);
    // The free paw: its own spot in the pose (the counterbalance), within
    // reach and clear of the bell. (The staff rides the staff side, out of
    // a stubby off arm's reach, so she wields it one-handed.)
    fp.set(S.fx, S.fy, S.fz);
    withinReach(fp, SHOULDER_L);
    const deep = inside(fp, 0.05, way);
    if (deep > 0) fp.addScaledVector(way, deep);
    freePaw.position.copy(fp);
    aimLimb(armL, freePaw.position);

    // Emitter heat (healer.js): the CORE hex never moves; the cast is carried
    // by the halo. Each release flares it (the pose's glow) on top of the
    // clip's own gem heat.
    const flash = attacking ? Math.max(0, Math.min(1, lagged.glow)) : 0;
    const heat = Math.max(P.gem, flash) * (1 - P.desat);
    gemMat.color.copy(gemBase).lerp(gemDown, P.desat);
    const gs = GLOW_BASE * (1 + 1.15 * heat);
    glow.scale.set(gs, gs, 1);
    glow.material.opacity = (0.34 + 0.62 * heat) * (1 - P.desat);
    const fs = GLOW_BASE * 0.32 * (1 + 0.9 * heat);
    flare.scale.set(fs, fs, 1);
    flare.material.opacity = (0.2 + 0.55 * heat) * (1 - P.desat);
    gem.scale.setScalar(1 + 0.22 * heat);
    gem.rotation.y = t * 1.1;

    // Feet last, once the rig is placed: locked to the floor, stepping on
    // their own (the lunge and the hop read from the live pose). Through the
    // spawn's grow-in they ride the growing body (the lock plants at full
    // size, which would leave them standing apart from it), then plant.
    // The lab's Still stands them on the pose's homes.
    lock.step(dt, attacking ? live : REST, locked && sp === 1, !!atk.override && dt <= 0);
  }

  return {
    apply,
    cue: atk.cue,
    hold: atk.hold,
    comboHitOf: atk.comboHitOf,
    atContact: atk.atContact,
    points: { hand, tip: gem },
    lab,
    torso,
    head,
    // The staff-gem mesh: the class's emitter tip (the arena's bolt muzzle).
    tip: gem,
    basePitch: 0,
    metrics: {
      standHeight: EAR_TOP,
      earTopY: EAR_TOP,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.34,
      hipY: HIP,
    },
  };
}

// The model lab's basic combo: three bolts at the Healer's real cadence
// (HEALER.attackIntervalTicks in core/constants.js: 30 ticks = 0.5 s; the
// heroes probe checks the two agree), each with the shooter's squash. Pure
// in t, so it rewinds.
export const SWING_SEC = 0.5;
export const COMBO_LAB = createComboLab(HITS, { swingSec: SWING_SEC, ranged: true });

// The Healer in the model-standard registry (render/facet/heroes.js): the
// lab tab, the probe and the critter factory read her from here.
export const HEALER_SPEC = Object.freeze({
  id: 'healer',
  label: 'Healer',
  build: buildHealerFacet,
  hits: HITS,
  moves: HEALER_MOVES,
  skillAbility,
  swingSec: SWING_SEC,
  comboLab: COMBO_LAB,
  ranged: true,
  walkSpeed: WALK_SPEED,
  weaponField: 'az',
  lab: {
    abilities: [
      ['combo', 'Basic combo'],
      ['point', 'Lantern Point'],
      ['bloom', 'Bloom'],
      ['plant', 'Staff Plant'],
      ['sweep', 'Wide Sweep'],
      ['spawn', 'Spawn'],
    ],
    frame: { y: 0.6, z: 0, dist: 3.9, speed: 2.4, loop: 2.2, side: 1.5 },
    cues: {
      strike: { sound: 'shoot', pitch: 1, fx: 'flash' },
      finisher: { sound: 'cast_damage', pitch: 0.9, fx: ['flash', 'star'], size: 1.5 },
      point: { sound: 'cast_heal', pitch: 1, fx: ['flash', 'star'] },
      bloom: { sound: 'cast_nova', pitch: 1, fx: ['ring', 'star'], size: 1.2 },
      plant: { sound: 'cast_zone', pitch: 1, fx: ['ring', 'pillar'] },
      sweep: { sound: 'whoosh', pitch: 1, fx: ['flash', 'star'], size: 1.2 },
    },
  },
});
