// HEALER, MODEL STANDARD (docs/MODEL_STANDARD.md). The player's hero in the
// faceted look, laid ON TOP of the chibi mouse of healer.js (BUILD_BRIEF
// §19.2): the same wide-based CLOSED BELL, the same round ears, short snout,
// head proportions and painted face, the same staff held out to the side and
// forward with the same Bright Heal crystal (its exact colour logic and glow
// sprites; it is her healing source, so it alone keeps the reserved hue).
// Model review round 2 (2026-11-11) dressed her from Kesh's turnaround sheet:
//
//   * every mass is faceted (render/facet/material.js): the robe is a twelve-
//     sided bell, the skull a low-poly ball, the ears, snout, arms and paws
//     cut flat;
//   * the garb (palette.js HEALER_GARB): a linen robe with a rust hem band
//     and a rust front edge where it crosses over, a short mantle over the
//     shoulders with a rust rim, a hood over the crown and the back of the
//     head with a rust edge round the face (the big ears stand out through
//     it), linen sleeves, a rope belt knotted at the front with two loose
//     ends and two leather pouches; a long pink tail, pink ears and nose;
//   * a gnarled twig staff with a knot and a side stub, its top split in
//     three prongs cradling a long six-sided crystal;
//   * two small feet in linen wraps peeking out under the robe's front hem
//     (the classic has none), on LOCKED FEET (Kesh's self-check): planted feet
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
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { HEALER_GARB, PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { exactColor, exactColorNearest, faceDecal, mix } from './common.js';
import { sharedGeo } from '../geocache.js';
import { facetize, facetMaterial } from '../facet/material.js';
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
  leanOf,
  namedPoint,
  posePack,
  settleEase,
  RECOIL,
  walkBody,
} from '../facet/hero.js';
import { ease } from '../facet/timeline.js';
import { placeRow } from '../facet/kit.js';

// The core's phase easings, by name (createMove's `ease`), for the staff's
// own blend below.
const EASE = Object.freeze({ ...ease, settle: settleEase, linear: (k) => k, hold: () => 1 });

// The classic's proportions (healer.js): the head measurement and the bell.
const HIP = 0.2;
const HEM = 0.022;
const HEAD_C = 0.784;
const HEAD_R = 0.235;
const SX = 1.02, SY = 0.96, SZ = 0.99;
// The ears, a size up on the classic's (Kesh's turnaround sheet: big round
// mouse ears), and so the top of her a little taller.
const EAR_SCALE = 1.15;
const EAR_TOP = 1.13;
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
const A1 = K({ yaw: 0.32, pitch: -0.05, roll: 0.03, rx: 0.02, rz: -0.05, sw: 1.02, sh: 0.98, hx: 0.46, hy: 0.56, hz: 0.12, az: 2.0, el: 0.75, slide: 0.25, fx: -0.3, fy: 0.46, fz: 0.32, glow: 0.3 });
const S1 = K({ yaw: -0.28, pitch: 0.38, roll: -0.03, rx: -0.02, rz: 0.08, sw: 1.19, sh: 0.91, hx: 0.36, hy: 0.56, hz: 0.32, az: -0.3, el: 1.15, slide: 0.25, fx: -0.37, fy: 0.36, fz: -0.06, glow: 1 });
const O1 = K({ yaw: -0.36, pitch: 0.1, roll: -0.04, rx: -0.025, rz: 0.03, sw: 1.01, sh: 0.99, hx: 0.3, hy: 0.53, hz: 0.34, az: -0.9, el: 1.55, slide: 0.25, fx: -0.37, fy: 0.38, fz: -0.08, glow: 0.8 });
// Hit 2, RISING BACKHAND: the gem held low on the far side (the staff
// shoulder forward, crouched), then the legs drive up as the staff flicks
// up and out past the staff side; the free paw swings forward with the
// counter-turn.
const A2 = K({ yaw: -0.34, pitch: 0.08, roll: -0.03, rx: -0.02, ry: -0.025, rz: -0.05, sw: 1.04, sh: 0.96, hx: 0.24, hy: 0.5, hz: 0.33, az: -1.2, el: 1.85, slide: 0.25, spin: -0.5, fx: -0.36, fy: 0.5, fz: -0.06, glow: 0.3 });
const S2 = K({ yaw: 0.3, pitch: 0.37, roll: 0.03, rx: 0.02, ry: 0.02, rz: 0.08, sw: 1.19, sh: 0.91, hx: 0.4, hy: 0.58, hz: 0.28, az: 0.9, el: 0.65, slide: 0.25, spin: 0.3, fx: -0.27, fy: 0.42, fz: 0.32, glow: 1 });
const O2 = K({ yaw: 0.38, pitch: 0.05, roll: 0.04, rx: 0.025, ry: 0.02, rz: 0.03, sw: 0.99, sh: 1.02, hx: 0.43, hy: 0.6, hz: 0.24, az: 1.2, el: 0.5, slide: 0.25, spin: 0.5, fx: -0.26, fy: 0.44, fz: 0.32, glow: 0.8 });
// Hit 3, OVERHEAD CAST (the finisher, the biggest: B6): up on the toes,
// stretched tall, the staff raised back over the staff shoulder with the
// free paw aiming ahead; then a hop and the staff thrown over the top, the
// gem flung forward on a long reach (the staff slides through the paw),
// coming down at the release squashed into a lunge step, as a melee blow
// (Kesh's pick of 2026-10-26: her basic plays as melee, not shots).
const A3 = K({ yaw: 0.22, pitch: -0.14, roll: 0.02, ry: 0.03, rz: -0.05, sw: 0.96, sh: 1.06, hx: 0.36, hy: 0.66, hz: 0.1, az: 0.1, el: -0.7, slide: 0.3, fx: -0.22, fy: 0.56, fz: 0.32, glow: 0.5 });
const S3 = K({ yaw: -0.18, pitch: 0.42, roll: -0.02, ry: -0.07, rz: 0.14, hop: 0.12, sw: 1.19, sh: 0.86, step: 1, hx: 0.32, hy: 0.6, hz: 0.3, az: 0.05, el: 0.95, slide: 0.35, fx: -0.37, fy: 0.34, fz: -0.06, glow: 1 });
const O3 = K({ yaw: -0.24, pitch: 0.3, roll: -0.02, ry: -0.08, rz: 0.14, hop: 0, sw: 1.04, sh: 0.97, step: 1, hx: 0.3, hy: 0.54, hz: 0.32, az: -0.05, el: 1.15, slide: 0.36, fx: -0.37, fy: 0.33, fz: -0.06, glow: 0.8 });
// The finisher's flight: the hop falls into the landing with gravity
// (accelerating) through the overshoot.
const LAND = ['hop'];
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
  { window: COMBO_WINDOW, timing: TIMING }
);

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
const UP_Y = new Vector3(0, 1, 0);
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

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------
// The staff's axis (butt to gem) from a pose's tilt: el from upright, az
// round from the facing (0) toward the staff side (+pi/2).
function staffDir(p, out) {
  const se = Math.sin(p.el);
  return out.set(se * Math.sin(p.az), Math.cos(p.el), se * Math.cos(p.az));
}

export function buildHealerFacet(rig, trackAccent) {
  // §19.1/19.2: Warm Grey is the shared party base. The garb follows Kesh's
  // turnaround sheet (2026-11-11, model review round 2): a linen robe, hood
  // and mantle with a brick-rust trim, a rope belt with two leather pouches,
  // linen foot wraps and a twig staff (palette.js HEALER_GARB). The class
  // accent (Sage) stays on her ring and HP bar.
  const fur = mix(PALETTE.warmGrey, PALETTE.paleGold, 0.14);
  const furHex = fur.getHex();
  const G = HEALER_GARB;
  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group(); // authored in feet-origin coordinates
  body.position.y = -HIP;
  torso.add(body);

  // Every garment material tracks to charcoal when she goes down.
  const cloakMat = trackAccent(facetMaterial(G.robe));
  const shadeMat = trackAccent(facetMaterial(G.robeShade));
  const trimMat = trackAccent(facetMaterial(G.trim));
  const hoodMat = trackAccent(facetMaterial(G.robeShade, { side: DoubleSide }));
  const ropeMat = facetMaterial(G.rope);
  const leatherMat = facetMaterial(G.leather);
  const flapMat = facetMaterial(mix(G.leather, PALETTE.voidCharcoal, 0.3).getHex());
  const furMat = facetMaterial(furHex);
  const footMat = facetMaterial(G.wrap);
  const wrapBandMat = facetMaterial(G.wrapBand);
  const boneMat = facetMaterial(mix(furHex, PALETTE.parchment, 0.45).getHex());
  const pinkMat = facetMaterial(G.pink);
  const woodMat = facetMaterial(G.wood);

  // --- The closed bell: the robe, the base flaring far wider than the
  // shoulders.
  const bellGeo = sharedGeo('facet:healer-bell', () => {
    const g = new LatheGeometry(BELL.map(([x, y]) => new Vector2(x * BELL_GROW, y)), BELL_SIDES);
    return facetize(g, { jitter: 0.12, seed: 103 });
  });
  const cloak = fpart(bellGeo, cloakMat);
  body.add(cloak);

  // The rust hem band round the robe's foot, and the wrap's front edge: a
  // rust strip down the front, just off the middle (the robe crosses over).
  const hemGeo = sharedGeo('facet:healer-hemband', () => facetize(new LatheGeometry([[0.29, 0.03], [0.315, 0.06], [0.34, 0.12], [0.342, 0.15]].map(([x, y]) => new Vector2(x * BELL_GROW * 1.025, y)), BELL_SIDES), { jitter: 0.06, seed: 105 }));
  const hemBand = fpart(hemGeo, trimMat);
  body.add(hemBand);
  const EDGE = [
    [0.342, 0.15],
    [0.33, 0.25],
    [0.3, 0.35],
    [0.255, 0.44],
  ];
  const edgeGeo = sharedGeo('facet:healer-edge', () => facetize(new LatheGeometry(EDGE.map(([x, y]) => new Vector2(x * BELL_GROW * 1.022, y)), 2, 0.1, 0.17), { jitter: 0.04, seed: 106 }));
  const edge = new Mesh(edgeGeo, trimMat);
  edge.name = 'panel';
  body.add(edge);

  // The mantle: a short shoulder cape over the robe's top, flaring out over
  // the shoulders (the sleeves come out under it), its rim trimmed in rust.
  const MANTLE = [
    [0.15, 0.585],
    [0.22, 0.565],
    [0.31, 0.515],
    [0.37, 0.45],
    [0.385, 0.415],
  ];
  const mantleR = (y) => {
    if (y > MANTLE[0][1] || y < MANTLE[MANTLE.length - 1][1]) return 0;
    for (let i = 1; i < MANTLE.length; i++) {
      const [r0, y0] = MANTLE[i - 1];
      const [r1, y1] = MANTLE[i];
      if (y >= y1) return r0 + ((r1 - r0) * (y0 - y)) / Math.max(1e-6, y0 - y1);
    }
    return 0;
  };
  // (a lathe's faces point out when its profile runs up, so it is laid bottom first)
  const mantleGeo = sharedGeo('facet:healer-mantle', () => facetize(new LatheGeometry([...MANTLE].reverse().map(([x, y]) => new Vector2(x, y)), BELL_SIDES), { jitter: 0.1, seed: 107 }));
  const mantle = fpart(mantleGeo, cloakMat);
  body.add(mantle);
  // its rim: a row of rust scallops round the mantle's edge (one instanced part)
  const RIM_N = 24;
  const rimGeo = sharedGeo('facet:healer-scallop', () => facetize(new SphereGeometry(1, 6, 4), { jitter: 0.06, seed: 108 }));
  const rq = new Quaternion();
  const rv = new Vector3();
  const rs = new Vector3();
  const mantleRim = placeRow(rimGeo, trimMat, RIM_N, (i, m) => {
    const a = ((i + 0.5) / RIM_N) * Math.PI * 2;
    rv.set(Math.sin(a) * 0.384, 0.418, Math.cos(a) * 0.384);
    rq.setFromAxisAngle(UP_Y, a);
    m.compose(rv, rq, rs.set(0.058, 0.026, 0.03));
  }, { name: 'healer-trim', seed: 108 });
  body.add(mantleRim);
  // The neck: a rust collar at the chin (the silhouette's neck pinch).
  const collarGeo = sharedGeo('facet:healer-collar', () => facetize(new CylinderGeometry(0.115, 0.15, 0.075, 8), { jitter: 0.08, seed: 109 }));
  const collar = fpart(collarGeo, trimMat);
  collar.position.y = 0.565;
  body.add(collar);

  // --- The rope belt round the waist, knotted at the front with two loose
  // ends, and two leather pouches hung at the front sides.
  const BELT_Y = 0.29;
  const beltR = bellR(BELT_Y) * BELL_GROW + 0.012;
  const knotGeo = sharedGeo('facet:healer-knot', () => facetize(new IcosahedronGeometry(1, 0), { jitter: 0.12, seed: 112 }));
  // the rope: a row of twists laid round the waist (one instanced part)
  const TWISTS = 22;
  const tq = new Quaternion();
  const te = new Euler();
  const tv = new Vector3();
  const ts = new Vector3();
  const rope = placeRow(knotGeo, ropeMat, TWISTS, (i, m) => {
    const a = (i / TWISTS) * Math.PI * 2;
    tv.set(Math.sin(a) * beltR, BELT_Y, Math.cos(a) * beltR);
    tq.setFromEuler(te.set(0.5, a, 0.6));
    m.compose(tv, tq, ts.set(0.034, 0.024, 0.026));
  }, { name: 'healer-rope', seed: 111 });
  body.add(rope);
  const knot = fpart(knotGeo, ropeMat);
  knot.scale.set(0.036, 0.03, 0.028);
  knot.position.set(0.04, BELT_Y, beltR + 0.012);
  body.add(knot);
  const cordGeo = sharedGeo('facet:healer-cord', () => facetize(new CylinderGeometry(0.011, 0.013, 1, 5), { jitter: 0.08, seed: 113 }));
  for (const [dx, tilt, len] of [[0.025, 0.12, 0.13], [0.06, -0.1, 0.11]]) {
    const cord = new Mesh(cordGeo, ropeMat);
    cord.scale.y = len;
    cord.rotation.set(-0.2, 0, tilt);
    cord.position.set(dx, BELT_Y - len / 2 - 0.01, beltR + 0.03);
    body.add(cord);
  }
  const pouchGeo = sharedGeo('facet:healer-pouch', () => facetize(new SphereGeometry(1, 7, 5), { jitter: 0.08, seed: 114 }));
  const flapGeo = sharedGeo('facet:healer-flap', () => facetize(new BoxGeometry(1, 1, 1), { jitter: 0.06, seed: 115 }));
  for (const phi of [-0.95, 1.05]) {
    const y = 0.215;
    const r = bellR(y) * BELL_GROW + 0.035;
    const pouch = new Group();
    pouch.position.set(Math.sin(phi) * r, y, Math.cos(phi) * r);
    pouch.rotation.y = phi;
    const bag = fpart(pouchGeo, leatherMat);
    bag.scale.set(0.058, 0.064, 0.036);
    pouch.add(bag);
    const flap = new Mesh(flapGeo, flapMat);
    flap.scale.set(0.105, 0.04, 0.075);
    flap.position.y = 0.045;
    flap.rotation.x = 0.15;
    pouch.add(flap);
    body.add(pouch);
  }

  // --- Head: the classic's proportions, a low-poly ball. The painted face
  // rides just outside it (a facet's middle sits inside the true sphere).
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skullGeo = sharedGeo('facet:healer-skull', () => facetize(new SphereGeometry(HEAD_R, 12, 9), { jitter: 0.07, seed: 115 }));
  const skull = fpart(skullGeo, furMat);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);
  // Big round mouse ears with pink insides, standing out through the hood.
  const earGeo = sharedGeo('facet:healer-ear', () => facetize(new SphereGeometry(0.105, 8, 6), { jitter: 0.1, seed: 117 }));
  const innerGeo = sharedGeo('facet:healer-ear-inner', () => facetize(new SphereGeometry(0.068, 7, 5), { jitter: 0.06, seed: 119 }));
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.15, 0.15, -0.025);
    pivot.scale.setScalar(EAR_SCALE);
    const ear = fpart(earGeo, furMat);
    ear.scale.set(1, 1, 0.42);
    ear.position.y = 0.088;
    pivot.add(ear);
    const inner = new Mesh(innerGeo, pinkMat);
    inner.scale.set(1, 1, 0.3);
    inner.position.set(0, 0.08, 0.045);
    pivot.add(inner);
    pivot.rotation.z = side * -0.26;
    head.add(pivot);
    ears.push(pivot);
  }
  // The hood: a shell over the crown and the back of the head, a size
  // larger than the skull so it stands off it, with an oval opening round
  // the face (every face of the shell within HOOD_OPEN of the facing is cut
  // away), the opening edged in rust.
  const HOOD_R = HEAD_R * 1.2;
  const HOOD_OPEN = 0.98; // the opening's half-angle round the face (rad)
  const HOOD_DOWN = 2.25; // how far down the back it falls (rad from the crown)
  const HOOD_FACE = new Vector3(0, -0.2, 1).normalize(); // the face looks a little down
  const hoodGeo = sharedGeo('facet:healer-hood', () => {
    const g = new SphereGeometry(HOOD_R, 20, 12, 0, Math.PI * 2, 0, HOOD_DOWN).toNonIndexed();
    const pos = g.attributes.position;
    const keep = [];
    const c = new Vector3();
    const v = new Vector3();
    const cosOpen = Math.cos(HOOD_OPEN);
    for (let i = 0; i < pos.count; i += 3) {
      c.set(0, 0, 0);
      for (let k = 0; k < 3; k++) c.add(v.fromBufferAttribute(pos, i + k));
      if (c.normalize().dot(HOOD_FACE) > cosOpen) continue;
      for (let k = 0; k < 3; k++) keep.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
    }
    const out = new BufferGeometry();
    out.setAttribute('position', new Float32BufferAttribute(keep, 3));
    out.computeVertexNormals();
    return facetize(out, { jitter: 0.06, seed: 116 });
  });
  const hood = fpart(hoodGeo, hoodMat);
  hood.scale.set(SX, SY, SZ);
  hood.position.set(0, 0.012, -0.02);
  head.add(hood);
  const hoodEdgeGeo = sharedGeo('facet:healer-hood-edge', () => {
    // the rim of the opening: the circle HOOD_OPEN round the face, where it
    // runs on the shell (down to the hood's foot)
    const u = new Vector3(1, 0, 0);
    const w = new Vector3().crossVectors(HOOD_FACE, u).normalize();
    const pts = [];
    const r = HOOD_R * 1.005;
    for (let i = 0; i < 32; i++) {
      const t = (i / 32) * Math.PI * 2;
      const d = new Vector3().copy(HOOD_FACE).multiplyScalar(Math.cos(HOOD_OPEN)).addScaledVector(u, Math.sin(HOOD_OPEN) * Math.cos(t)).addScaledVector(w, Math.sin(HOOD_OPEN) * Math.sin(t));
      if (Math.acos(Math.min(1, d.y)) <= HOOD_DOWN - 0.05) pts.push(d.multiplyScalar(r));
    }
    // the kept points run from one foot of the rim over the brow to the
    // other; a wrap round t = 0 is put back in order
    let cut = 0;
    for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > r * 0.5) cut = i;
    const run = cut ? [...pts.slice(cut), ...pts.slice(0, cut)] : pts;
    return facetize(new TubeGeometry(new CatmullRomCurve3(run), 28, 0.017, 4), { jitter: 0.05, seed: 118 });
  });
  const hoodEdge = fpart(hoodEdgeGeo, trimMat);
  hoodEdge.scale.copy(hood.scale);
  hoodEdge.position.copy(hood.position);
  head.add(hoodEdge);
  // Short snout and a pink nose.
  const snoutGeo = sharedGeo('facet:healer-snout', () => facetize(new SphereGeometry(0.078, 8, 6), { jitter: 0.08, seed: 121 }));
  const snout = fpart(snoutGeo, boneMat);
  snout.scale.set(0.9, 0.62, 0.95);
  snout.position.set(0, -0.082, SZ * HEAD_R * 0.82);
  head.add(snout);
  const noseGeo = sharedGeo('facet:healer-nose', () => facetize(new SphereGeometry(0.022, 6, 4), { jitter: 0.05, seed: 123 }));
  const nose = fpart(noseGeo, pinkMat, false);
  nose.position.set(0, -0.062, SZ * HEAD_R * 0.82 + 0.062);
  head.add(nose);
  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, drop: 0.575 }));

  // --- A long pink mouse tail out from under the robe's back, curling up
  // at its end.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.2, -0.27);
  const tailGeo = sharedGeo('facet:healer-tail', () => {
    const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0.05, -0.1, -0.12), new Vector3(0.17, -0.15, -0.25), new Vector3(0.33, -0.1, -0.31), new Vector3(0.43, 0.02, -0.26)]);
    return facetize(new TubeGeometry(curve, 14, 0.019, 5), { jitter: 0.08, seed: 125 });
  });
  const tail = fpart(tailGeo, pinkMat);
  tailPivot.add(tail);
  body.add(tailPivot);

  // --- The staff (butt at its origin, as healer.js): a gnarled twig with a
  // knot and a side stub, its top split into three curling prongs that
  // cradle the crystal.
  const staff = new Group();
  staff.rotation.order = 'XYZ';
  body.add(staff);
  const shaftGeo = sharedGeo('facet:healer-twig', () => {
    const curve = new CatmullRomCurve3([new Vector3(0, 0.03, 0), new Vector3(0.008, 0.24, -0.006), new Vector3(-0.01, 0.45, 0.005), new Vector3(0.011, 0.66, -0.004), new Vector3(0, 0.85, 0)]);
    return facetize(new TubeGeometry(curve, 12, 0.026, 6), { jitter: 0.1, seed: 127 });
  });
  const shaft = fpart(shaftGeo, woodMat);
  staff.add(shaft);
  const twigKnot = new Mesh(knotGeo, woodMat);
  twigKnot.scale.set(0.034, 0.045, 0.032);
  twigKnot.position.set(0.012, 0.6, 0.004);
  staff.add(twigKnot);
  const stubGeo = sharedGeo('facet:healer-stub', () => facetize(new CylinderGeometry(0.008, 0.014, 1, 5), { jitter: 0.08, seed: 129 }));
  const stub = new Mesh(stubGeo, woodMat);
  stub.scale.y = 0.07;
  stub.rotation.z = -0.9;
  stub.position.set(0.03, 0.73, 0);
  staff.add(stub);
  const PRONGS = 3;
  const prongGeo = sharedGeo('facet:healer-prong', () => {
    const curve = new CatmullRomCurve3([new Vector3(0, 0.83, 0), new Vector3(0.03, 0.88, 0), new Vector3(0.052, 0.94, 0), new Vector3(0.03, 1.0, 0)]);
    return facetize(new TubeGeometry(curve, 6, 0.011, 4), { jitter: 0.08, seed: 131 });
  });
  const pq = new Quaternion();
  const pv = new Vector3();
  const ps = new Vector3(1, 1, 1);
  const prongs = placeRow(prongGeo, woodMat, PRONGS, (i, m) => {
    pq.setFromAxisAngle(UP_Y, (i / PRONGS) * Math.PI * 2 + 0.4);
    m.compose(pv.set(0, 0, 0), pq, ps);
  }, { name: 'healer-prongs', seed: 131, mottle: 0 });
  staff.add(prongs);

  // --- THE GEM: healer.js's, unchanged (round-3 F6 and the round-4 ACES hue
  // compensation): unlit, no ink, the whole gem family authored up-hue by
  // the measured skew, a two-layer additive halo carrying the cast. It is
  // the only Bright Heal on her: it is her healing source.
  const gemHSL = { h: 0, s: 0, l: 0 };
  new Color(PALETTE.brightHeal).getHSL(gemHSL, SRGBColorSpace);
  const gemAuthored = new Color().setHSL(gemHSL.h + 18 / 360, gemHSL.s, gemHSL.l, SRGBColorSpace).getHex();
  const gemMat = new MeshBasicMaterial({ color: exactColorNearest(gemAuthored) });
  // The crystal: a long six-sided point (the sheet's), not a round gem.
  const gemGeo = sharedGeo('healer-crystal', () => new LatheGeometry([[0, -0.07], [0.036, -0.032], [0.036, 0.034], [0, 0.088]].map(([x, y]) => new Vector2(x, y)), 6));
  const gem = new Mesh(gemGeo, gemMat);
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
  // the arms are her linen sleeves; the paws stay fur
  const armR = facetArm(cloakMat, 0.058, 0.22, 137);
  armR.position.copy(SHOULDER_R);
  body.add(armR);
  const armL = facetArm(cloakMat, 0.058, 0.22, 137);
  armL.position.copy(SHOULDER_L);
  body.add(armL);
  // The named points (B8): the grip paw and the gem.
  const hand = namedPoint(gripPaw, 'hand', 0, 0, 0);

  // --- Feet: two small feet in linen wraps peeking out under the robe's
  // front hem (detail added: the classic has none). Children of the rig, so a lean
  // never lifts them; the foot lock pins them in the world.
  const HOME = [new Vector3(-0.115, 0.03, 0.3), new Vector3(0.115, 0.03, 0.3)];
  const footGeo = sharedGeo('facet:healer-foot', () => facetize(new SphereGeometry(1, 7, 5), { jitter: 0.08, seed: 139 }));
  const wrapGeo = sharedGeo('facet:healer-footwrap', () => facetize(new CylinderGeometry(1, 1, 1, 7, 1, true), { jitter: 0.05, seed: 141 }));
  const feet = [];
  for (let i = 0; i < 2; i++) {
    const foot = fpart(footGeo, footMat);
    foot.scale.set(0.058, 0.036, 0.088);
    // two wrap bands round each foot
    for (const bz of [0.3, -0.25]) {
      const band = new Mesh(wrapGeo, wrapBandMat);
      band.rotation.x = Math.PI / 2;
      band.scale.set(1.04, 0.22, 1.04);
      band.position.z = bz;
      foot.add(band);
    }
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
    ranged: false,
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
  // How far a body-space point of radius `pad` sits inside the bell, the
  // mantle or the head; `out` gets the way out.
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
    const mr = mantleR(p.y);
    if (mr > 0) {
      const d = Math.hypot(p.x, p.z);
      const need = mr + 0.02 + pad;
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
      torso.rotation.x = leanOf(led.pitch + walk.pitch) * upright;
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
    // The recoil off a connect (B3): her basic plays as melee (Kesh's pick
    // of 2026-10-26), so a rig-only shove and lean back after the held
    // contact, as the Tank and the Swordsman.
    const rc = atk.recoil();
    if (rc > 0) {
      rig.position.z -= RECOIL.shove * rc * upright;
      torso.rotation.x -= RECOIL.lean * rc * upright;
    }
    // The head counter-rotates so the face stays up through every lean.
    if (attacking || rc > 0 || (locked && clip === 'walk')) {
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
    // round 2: a softer flare, so a cast held overhead never whites out her face
    const gs = GLOW_BASE * (1 + 0.8 * heat);
    glow.scale.set(gs, gs, 1);
    glow.material.opacity = (0.3 + 0.45 * heat) * (1 - P.desat);
    const fs = GLOW_BASE * 0.32 * (1 + 0.9 * heat);
    flare.scale.set(fs, fs, 1);
    flare.material.opacity = (0.2 + 0.4 * heat) * (1 - P.desat);
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
export const COMBO_LAB = createComboLab(HITS, { swingSec: SWING_SEC });

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
  ranged: false,
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
    frame: { y: 0.6, z: 0, dist: 3.9, speed: 2.4, loop: 2.2 },
    cues: {
      strike: { sound: 'shoot', pitch: 1, fx: 'flash' },
      finisher: { sound: 'cast_damage', pitch: 0.9, fx: ['flash', 'star'], size: 1.1 },
      point: { sound: 'cast_heal', pitch: 1, fx: ['flash', 'star'] },
      bloom: { sound: 'cast_nova', pitch: 1, fx: ['ring', 'star'], size: 1.2 },
      plant: { sound: 'cast_zone', pitch: 1, fx: ['ring', 'pillar'] },
      sweep: { sound: 'whoosh', pitch: 1, fx: ['flash', 'star'], size: 1.2 },
    },
  },
});
