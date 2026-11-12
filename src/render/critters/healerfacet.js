// HEALER, MODEL STANDARD (docs/MODEL_STANDARD.md). The player's hero in the
// faceted look, the healer of BUILD_BRIEF §19.2 holding the same staff with
// the same Bright Heal crystal (its exact colour logic and glow sprites; it
// is her healing source, so it alone keeps the reserved hue). Model review
// round 3 (2026-11-11) rebuilt her from Kesh's turnaround sheet, measured
// view by view against it (`node tools/model-review.mjs views`: her ear tips
// at 1.13 u; the sheet holds the staff in her right paw and she holds it in
// her left, so she is built as the sheet's mirror image):
//
//   * a round head in a sand hood with a thick rust rim round the face, the
//     big round ears (pink inside) standing out through it; a pale snout
//     with a pink nose and a little "w" mouth; big painted eyes with a warm
//     under-iris and a glint, and pale oval brows;
//   * an A-line sand robe wrapped at the front (its rust edge runs from the
//     neck to the knot, then straight down to the hem), fluted into soft
//     folds below the belt, with a rust hem band; over it the hood's cowl,
//     open in a V to the chest, and a camel capelet with a rust foot, longer
//     behind; at her back a cloak whose dark rust lining shows past her sides;
//   * wide sleeves with deep rust cuffs; pink paws with four fingers and a
//     thumb, the grip paw's closed round the staff;
//   * a twisted rope belt (instanced twists) knotted at the front on her
//     staff side, its two ends hanging to frayed tassels; two leather
//     pouches with flaps, one strapped and buckled;
//   * a long pink tail, ringed every few steps, curling up at her free side;
//   * a gnarled branch staff with bark scales and two knots, thin at the
//     butt and swelling into a club whose fork holds a long six-sided
//     crystal;
//   * grey-taupe legs under the hem, the feet bound in pale linen wraps with
//     three pink toes out of the front of each, on LOCKED FEET (Kesh's
//     self-check): planted feet stay pinned while they carry weight and step
//     one at a time along the real travel, so a kiting walk steps backward
//     or sideways;
//   * a THREE-HIT STAFF COMBO on the basic bolt (Kesh's template): a diagonal
//     forehand down across the front, a rising backhand back out past the
//     staff side, then an overhead cast with a hop. Each hit's overshoot and
//     settle IS the next hit's wind-up; the hips lead and the staff trails a
//     frame behind; the free paw counterbalances every throw;
//   * four ability timelines that cover every Healer skill shape: Lantern
//     Point (projectile, direct), Bloom (nova, aura), Staff Plant
//     (ground_aoe) and Wide Sweep (melee_arc).
//
// Parts that share a parent and never move apart are merged into one mesh
// (one draw, one ink hull); a merged part carrying several garb colours
// carries them as vertex-colour ratios to its material's, so it still greys
// out with that material when she goes down.
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
  CapsuleGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HEALER_GARB, PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { addInk, exactColor, exactColorNearest, exactHex, faceDecal, mix } from './common.js';
import { sharedGeo } from '../geocache.js';
import { facetize, facetMaterial } from '../facet/material.js';
import {
  aimLimb,
  createAttackClock,
  createCombo,
  createComboLab,
  createFootLock,
  createMove,
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
import { placeRow, setTRS } from '../facet/kit.js';


// The core's phase easings, by name (createMove's `ease`), for the staff's
// own blend below.
const EASE = Object.freeze({ ...ease, settle: settleEase, linear: (k) => k, hold: () => 1 });

// Her proportions, from Kesh's turnaround sheet (model review round 3): the
// sheet is measured with her ear tips at 1.13 u, and every height and width
// below is read off its front and side views at that scale. The sheet holds
// the staff in her right paw; she holds it in her left (+X), so she is built
// as the sheet's mirror image.
const HIP = 0.2;
// The skull: a squashed ball, shallow enough that the eyes sit back where
// the sheet's side view puts them; the snout swells well out of its front,
// to the nose the side view draws a mouse-length ahead of the eye.
const HEAD_C = 0.875;
const HEAD_R = 0.17;
const SX = 1, SY = 0.85, SZ = 0.86;
const HEAD_Z = 0.035;
// the snout swells out of the face round the nose; under it the jaw, full
// and round to the chin (the sheet's profile)
const SNOUT = Object.freeze({ y: -0.105, sx: 0.05, sy: 0.05, h: 0.075 });
const JAW = Object.freeze({ y: -0.172, sx: 0.07, sy: 0.04, h: 0.09 });
// and a soft swell over the brow
const BROW = Object.freeze({ y: 0.02, sx: 0.05, sy: 0.07, h: 0.02 });
const EAR_TOP = 1.13;
// the ears: cupped discs (rx, ry) standing out through the hood, splayed out
// from upright and turned out from the facing (the sheet shows their pink
// insides from the front and from the side alike)
const EAR = Object.freeze({ rx: 0.17, ry: 0.137, cup: 0.022 });
const EAR_SIDES = [-1, 1];
const EAR_SPLAY = 0.02;
const EAR_YAW = 0.84;
// The hood: rings down from its crown, [body y, half-width], its depth
// HOOD_D of its width, round over the crown and falling past the cheeks;
// the cowl (on the body, so a head turn never opens a gap) carries it on
// down round the neck from just inside the hood's foot (flush, so the two
// read as one cloth), drawn in under the chin as the sheet's is, then out a
// little over the capelet's top.
const HOOD_RINGS = [[1.037, 0.001], [1.03, 0.048], [1.02, 0.074], [1.005, 0.094], [0.99, 0.113], [0.97, 0.13], [0.95, 0.144], [0.925, 0.158], [0.9, 0.171], [0.87, 0.187], [0.81, 0.203], [0.78, 0.207], [0.745, 0.19]];
const COWL_RINGS = [[0.778, 0.207], [0.755, 0.205], [0.735, 0.194], [0.72, 0.179], [0.705, 0.161], [0.69, 0.155], [0.675, 0.165], [0.66, 0.166], [0.645, 0.165], [0.632, 0.168]];
// and how far each ring stands out behind (the back of her head is the
// hood's: round over the crown and in at the nape, close over the skull,
// then the cowl down the back onto the capelet)
const HOOD_BACK = [[1.037, 0.001], [1.03, 0.0485], [1.02, 0.074], [1.005, 0.096], [0.99, 0.114], [0.97, 0.13], [0.95, 0.143], [0.925, 0.152], [0.9, 0.157], [0.87, 0.156], [0.84, 0.153], [0.81, 0.149], [0.78, 0.145], [0.745, 0.141]];
const COWL_BACK = [[0.778, 0.143], [0.755, 0.14], [0.735, 0.136], [0.715, 0.132], [0.695, 0.127], [0.675, 0.122], [0.655, 0.117], [0.632, 0.112]];
const HOOD_D = 0.95;
const CROWN_D = 0.1;
const COWL_D = 0.76; // the cowl lies flatter over the chest and the back than the hood stands
const HOOD_Z = -0.008;
// the hood and the head sit forward of the body's middle (the sheet's head
// stands out over her chest), the cowl easing back down to the capelet
const HOOD_DZ = 0.04;
const hoodZ = (y) => HOOD_Z + HOOD_DZ * smooth01((y - 0.66) / 0.11);
// The face opening (the rim's inner edge), [body y, half-width], from the
// brow round the cheeks and down into the V at the chest.
const OPENING = [[0.98, 0], [0.975, 0.04], [0.965, 0.06], [0.95, 0.08], [0.925, 0.103], [0.9, 0.12], [0.875, 0.134], [0.85, 0.147], [0.825, 0.156], [0.8, 0.165], [0.775, 0.168], [0.75, 0.151], [0.725, 0.127], [0.7, 0.081], [0.69, 0.056], [0.675, 0.037], [0.66, 0.022], [0.648, 0.008], [0.64, 0]];
// a smooth step from 0 to 1 over t 0..1
const smooth01 = (t) => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};
// a table [y, v] read at y (rows run top down); outside it, `out`
function lerpRows(rows, y, out = 0) {
  if (y > rows[0][0] || y < rows[rows.length - 1][0]) return out;
  for (let i = 1; i < rows.length; i++) {
    if (y >= rows[i][0]) {
      const [y0, v0] = rows[i - 1];
      const [y1, v1] = rows[i];
      return v1 + ((v0 - v1) * (y - y1)) / Math.max(1e-6, y0 - y1);
    }
  }
  return out;
}
const COWL_FOOT = COWL_RINGS[COWL_RINGS.length - 1][0];
const hoodW = (y) => (y >= 0.745 ? lerpRows(HOOD_RINGS, Math.min(y, HOOD_RINGS[0][0])) : lerpRows(COWL_RINGS, Math.max(y, COWL_FOOT)));
// (deeper over the crown, so the narrow dome still stands clear of the brow)
const hoodD = (y) => (y >= 0.745 ? HOOD_D + CROWN_D * smooth01((y - 0.85) / 0.08) : HOOD_D + (COWL_D - HOOD_D) * Math.min(1, (0.745 - y) / (0.745 - COWL_FOOT)));
const hoodBack = (y) => (y >= 0.745 ? lerpRows(HOOD_BACK, Math.min(y, HOOD_BACK[0][0])) : lerpRows(COWL_BACK, Math.max(y, COWL_FOOT)));
const openW = (y) => lerpRows(OPENING, y);
// how far a point (x >= 0, body y) sits in from the opening's edge
function openDist(x, y) {
  let d = Infinity;
  for (let i = 1; i < OPENING.length; i++) {
    const [y0, x0] = OPENING[i - 1];
    const [y1, x1] = OPENING[i];
    const ex = x1 - x0;
    const ey = y1 - y0;
    const t = Math.max(0, Math.min(1, ((x - x0) * ex + (y - y0) * ey) / (ex * ex + ey * ey)));
    d = Math.min(d, Math.hypot(x - x0 - t * ex, y - y0 - t * ey));
  }
  return d;
}
// The cowl's two rounded lobes either side of the V under her chin (the
// sheet's), standing out over the capelet's top: how far they swell at
// angle a and height y.
const COWL_LOBE = 0.016;
const cowlLobe = (a, y) => Math.exp(-(((Math.abs(a) - 0.55) / 0.35) ** 2)) * Math.max(0, 1 - ((y - 0.655) / 0.045) ** 2);
// the hood's (and the cowl's) surface at angle a round her (0 her facing)
// (beside her eyes the hood's front edge sits a hair back, so the rim clears
// the eye in profile)
const EYE_CLEAR = 0.014;
function hoodAt(a, y, lift = 0, out = new Vector3()) {
  const w = hoodW(y) + lift;
  const c = Math.cos(a);
  const x = Math.sin(a) * w;
  const back = c > 0 ? EYE_CLEAR * smooth01(1 - Math.abs(y - 0.83) / 0.06) * smooth01((Math.abs(x) - 0.1) / 0.04) * smooth01(c / 0.3) : 0;
  return out.set(x, y, hoodZ(y) + c * (c > 0 ? w * hoodD(y) + COWL_LOBE * cowlLobe(a, y) : hoodBack(y) + lift) - back);
}
// The robe: a sand linen A-line from the neck to the shin, [half-width, y]
// from the top down (closed over at the neck); a little shallower than wide
// and a hair forward.
const ROBE = [
  [0.0, 0.75],
  [0.052, 0.742],
  [0.075, 0.725],
  [0.105, 0.69],
  [0.128, 0.64],
  [0.137, 0.58],
  [0.14, 0.52],
  [0.142, 0.47],
  [0.148, 0.43],
  [0.162, 0.37],
  [0.18, 0.3],
  [0.198, 0.235],
  [0.212, 0.18],
  [0.222, 0.14],
];
const ROBE_ZS = 0.86;
const ROBE_DZ = 0.012;
const HEM_Y = 0.14;
const BELT_Y = 0.43;
function robeR(y) {
  if (y > ROBE[0][1]) return 0;
  for (let i = 1; i < ROBE.length; i++) {
    if (y >= ROBE[i][1]) {
      const [r0, y0] = ROBE[i - 1];
      const [r1, y1] = ROBE[i];
      return r1 + ((r0 - r1) * (y - y1)) / Math.max(1e-6, y0 - y1);
    }
  }
  return y >= HEM_Y - 0.005 ? ROBE[ROBE.length - 1][0] : 0;
}
// the cloth's folds: a soft flute round the skirt, deepest at the hem
const fold = (a, y) => 1 + 0.032 * Math.sin(7 * a + 0.4) * Math.max(0, Math.min(1, (0.4 - y) / 0.26));
// the skirt's foot hangs lowest at her front and rides highest at her sides
// (the sheet's three views: the hem band curves down to her toes)
const hemRise = (a, y) => (0.006 - 0.012 * Math.cos(2 * a) - 0.004 * Math.cos(a)) * smooth01((0.27 - y) / 0.07);
// a point on the robe's surface at angle a (0 her facing, +pi/2 her staff
// side), lifted `lift` off it
function robeAt(a, y, lift = 0, out = new Vector3()) {
  const r = robeR(y) * fold(a, y) + lift;
  return out.set(Math.sin(a) * r, y + hemRise(a, y), Math.cos(a) * r * ROBE_ZS + ROBE_DZ);
}
// The capelet over the shoulders: its top ring (under the cowl), and its
// foot by angle (the sheet's: its two front panels meet high at the clasp,
// the foot dips either side of it, runs level round the sides and hangs low
// behind); it slopes from under the cowl out over the shoulders and lies
// close over the chest and the back. CAPE_FOOT is its lowest foot in front.
const CAPE_TOP = Object.freeze({ y: 0.665, r: 0.152 });
const CAPE_FOOT = 0.556;
// (its foot by the angle round from her facing, [angle, y]: high where the
// two panels meet at the clasp, lowest a hand's width either side of it,
// rising a little round to her sides)
const CAPE_FOOT_AT = [[0, 0.595], [0.115, 0.583], [0.231, 0.566], [0.351, 0.556], [0.476, 0.556], [0.611, 0.558], [0.759, 0.5625], [0.932, 0.567], [1.162, 0.571], [1.6, 0.572]];
const capeFootY = (a) => {
  const b = Math.abs(a);
  let y = CAPE_FOOT_AT[CAPE_FOOT_AT.length - 1][1];
  for (let i = 1; i < CAPE_FOOT_AT.length; i++) {
    if (b <= CAPE_FOOT_AT[i][0]) {
      const [b0, y0] = CAPE_FOOT_AT[i - 1];
      const [b1, y1] = CAPE_FOOT_AT[i];
      y = y0 + ((y1 - y0) * (b - b0)) / (b1 - b0);
      break;
    }
  }
  return y - 0.1 * Math.pow(Math.max(0, -Math.cos(a)), 1.2);
};
const CAPE_R = 0.222;
const CAPE_ZS = 0.62;
// its radius t of the way down from the top to the foot
const capeR = (t) => CAPE_TOP.r + (CAPE_R - CAPE_TOP.r) * t;
// The cloak at her back, hung from under the capelet, its dark lining
// showing past her sides. It hangs close behind her (the sheet's side view):
// cloakDeep(t) is how far behind her its middle hangs, t of the way down,
// and its edges stand a little in front of that.
const CLOAK = Object.freeze({ top: 0.615, foot: 0.232, r0: 0.15, r1: 0.355, span: 1.35, taper: 0.45, rows: 5 });
const cloakDeep = (t) => 0.1 + 0.15 * Math.pow(Math.max(0, t), 1.3);
const cloakZ = (t, a) => -cloakDeep(t) * (1 - 0.35 * (1 + Math.cos(a)));
// how far round from her back the cloak reaches, t of the way down: its edges
// swing back as it falls (the sheet's side view: a strap running down
// behind her)
const cloakSpan = (t) => CLOAK.span - CLOAK.taper * Math.sqrt(Math.max(0, t));
// HEALER.moveSpeed (u/s, core/constants.js): full walk lean at full speed.
const WALK_SPEED = 2.4;
// Basic attack: a bolt inside this window of the last one is the next hit
// (she fires every 0.5 s while the button is held).
export const COMBO_WINDOW = 1.0;
// Her release is the press itself (the bolt leaves on the sim's tick): one
// frame of wind-back from rest, the release in 1.5 frames (B1, B2, B4).
const TIMING = Object.freeze({ ...HIT_TIMING, wind: 0.033, strike: 0.05 });

// The staff (staff space, the butt at the origin, as healer.js): the shaft
// runs to 0.8 and forks, the crystal sits at 0.895 (0.81 to 0.98, the
// sheet's), the grip paw at 0.5.
const GEM_Y = 0.895;
const GRIP_ALONG = 0.5;
const SHOULDER_R = new Vector3(0.155, 0.56, -0.005);
const SHOULDER_L = new Vector3(-0.155, 0.56, -0.005);
const REACH = 0.36; // the farthest an arm stretches (u)
const REACH_MIN = 0.17; // and the shortest it folds (a blend passing the shoulder)

// --- Key poses (body space; +X is the staff side, +Z the facing). The body
// fields are the hero core's. The staff: hx, hy, hz the grip; el the staff's
// tilt from upright and az the way it tilts (0 forward, +pi/2 out to the
// staff side), so a sweep turns the staff round at a steady tilt; slide: the
// staff pushed through the paw toward the gem (a thrust slides it out);
// spin: about its own shaft. The free paw: fx, fy, fz (the counterbalance).
// glow: the gem's flare (on top of the clip's).
// The stance is the sheet's: the staff stood out and a little forward of
// her, leaning out and forward, the free paw hanging at her side.
const PACK = posePack({ hx: 0.31, hy: 0.492, hz: 0.29, az: 0.72, el: 0.206, slide: 0, spin: 0, fx: -0.31, fy: 0.385, fz: 0.08, glow: 0 });
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

// --- Cutting the garments ----------------------------------------------------
// A cloth sheet: rings k = 0..rows, each `sides` steps from angle a0 to a1
// (0 her facing, +pi/2 her staff side); `at(k, a, out)` places the point.
// Faces point away from her middle (or toward it: `inward`).
const sv = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
function clothSheet(rows, sides, a0, a1, at, { inward = false } = {}) {
  const pos = [];
  const [p00, p01, p10, p11] = sv;
  const angle = (k, s) => (typeof a0 === 'function' ? a0(k) : a0) + (((typeof a1 === 'function' ? a1(k) : a1) - (typeof a0 === 'function' ? a0(k) : a0)) * s) / sides;
  for (let k = 0; k < rows; k++) {
    for (let s = 0; s < sides; s++) {
      at(k, angle(k, s), p00);
      at(k, angle(k, s + 1), p01);
      at(k + 1, angle(k + 1, s), p10);
      at(k + 1, angle(k + 1, s + 1), p11);
      const quad = inward ? [p00, p01, p10, p01, p11, p10] : [p00, p10, p01, p01, p10, p11];
      for (const p of quad) pos.push(p.x, p.y, p.z);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}
// A band laid along a path on a surface: `path` the points, `normal(p, out)`
// the surface's way out there; `width` across, `lift` off the surface, and a
// rounded crest (`crest` higher in the middle) so a trim reads as a roll.
function surfaceBand(path, normal, width, { lift = 0.004, crest = 0.006, inner = 0.5 } = {}) {
  const rows = [];
  const n = new Vector3();
  const t = new Vector3();
  const w = new Vector3();
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    normal(p, n);
    t.subVectors(path[Math.min(path.length - 1, i + 1)], path[Math.max(0, i - 1)]).normalize();
    w.crossVectors(t, n).normalize();
    const a = p.clone().addScaledVector(w, -width * inner).addScaledVector(n, lift);
    const m = p.clone().addScaledVector(w, width * (0.5 - inner)).addScaledVector(n, lift + crest);
    const b = p.clone().addScaledVector(w, width * (1 - inner)).addScaledVector(n, lift);
    rows.push([a, m, b]);
  }
  const pos = [];
  for (let i = 0; i + 1 < rows.length; i++) {
    for (let j = 0; j < 2; j++) {
      const p00 = rows[i][j];
      const p01 = rows[i][j + 1];
      const p10 = rows[i + 1][j];
      const p11 = rows[i + 1][j + 1];
      for (const p of [p00, p01, p10, p01, p11, p10]) pos.push(p.x, p.y, p.z);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}
// Faces from a list of corners (three a face).
function trisGeo(pts) {
  const pos = [];
  for (const p of pts) pos.push(p.x, p.y, p.z);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}
// A ribbon: rows of points (as many across in each row), a quad between
// every four neighbours. Its strip j (between columns j and j + 1) is every
// (cols - 1)th quad, six corners a quad, so paintStrips finds a strip by
// its corners' places.
function ribbon(rows) {
  const pts = [];
  for (let i = 0; i + 1 < rows.length; i++) {
    for (let j = 0; j + 1 < rows[i].length; j++) pts.push(rows[i][j], rows[i + 1][j], rows[i][j + 1], rows[i][j + 1], rows[i + 1][j], rows[i + 1][j + 1]);
  }
  return trisGeo(pts);
}
// A faceted ribbon's strips painted: steps[j] = [r, g, b] multiplies strip
// j's facet steps (null leaves it as cut). `cols` points across each row.
function paintStrips(geo, cols, steps) {
  const col = geo.attributes.color;
  for (let v = 0; v < col.count; v++) {
    const k = steps[Math.floor(v / 6) % (cols - 1)];
    if (k) col.setXYZ(v, col.getX(v) * k[0], col.getY(v) * k[1], col.getZ(v) * k[2]);
  }
  return geo;
}
// Every facet step of a piece multiplied by k = [r, g, b].
function shade(geo, k) {
  const col = geo.attributes.color;
  for (let v = 0; v < col.count; v++) col.setXYZ(v, col.getX(v) * k[0], col.getY(v) * k[1], col.getZ(v) * k[2]);
  return geo;
}
// A geometry without its needle faces (the faces of no area a lathe or a
// sheet leaves at a pole).
const nA = new Vector3();
const nB = new Vector3();
const nC = new Vector3();
function dropNeedles(geo) {
  const src = (geo.index ? geo.toNonIndexed() : geo).attributes.position;
  const pts = [];
  for (let i = 0; i < src.count; i += 3) {
    nA.fromBufferAttribute(src, i);
    nB.fromBufferAttribute(src, i + 1);
    nC.fromBufferAttribute(src, i + 2);
    if (nB.clone().sub(nA).cross(nC.clone().sub(nA)).lengthSq() > 1e-16) pts.push(nA.clone(), nB.clone(), nC.clone());
  }
  return trisGeo(pts);
}
// A tube along a curve, tapering from r0 to r1 (`ease` shapes the taper).
function taperTube(curve, segs, radial, r0, r1, ease = (t) => t) {
  const g = new TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position;
  const c = new Vector3();
  const v = new Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c);
    const r = r0 + (r1 - r0) * ease(i / segs);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  return g;
}
// One faceted piece placed in its parent's space (for merging).
const pm = new Matrix4();
const pq = new Quaternion();
const pe = new Euler();
const pv = new Vector3();
const ps = new Vector3();
function piece(geo, { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], q = null } = {}) {
  const g = geo.clone();
  pm.compose(pv.set(...at), q || pq.setFromEuler(pe.set(...rot)), ps.set(...scale));
  g.applyMatrix4(pm);
  return g;
}
// Its colour on the facet steps, as a ratio to its material's (so one mesh
// can carry several garb colours and still grey out with its material).
function tint(geo, hex, baseHex) {
  const c = new Color(hex);
  const b = new Color(baseHex);
  const k = [c.r / Math.max(1e-4, b.r), c.g / Math.max(1e-4, b.g), c.b / Math.max(1e-4, b.b)];
  const col = geo.attributes.color;
  for (let i = 0; i < col.count; i++) col.setXYZ(i, col.getX(i) * k[0], col.getY(i) * k[1], col.getZ(i) * k[2]);
  return geo;
}
// Faceted pieces into one geometry (one draw, one ink hull).
function merge(parts) {
  return mergeGeometries(
    parts.map((g) => {
      for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal' && n !== 'color') g.deleteAttribute(n);
      return g.index ? g.toNonIndexed() : g;
    }),
    false
  );
}
const fz = (geo, jitter, seed) => facetize(geo, { jitter, seed });
// A faceted part's facets leaned toward one way (`k` of the way), so the
// toon light lies on a soft round form (a face, a leather bag) as one tone
// instead of in patches; each facet keeps its own step.
// (`dir` may be a function of the facet's own normal: a thin disc leans
// each side toward its own face)
const leanV = new Vector3();
function leanNormals(geo, dir, k) {
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) {
    leanV.fromBufferAttribute(n, i);
    leanV.lerp(typeof dir === 'function' ? dir(leanV) : dir, k).normalize();
    n.setXYZ(i, leanV.x, leanV.y, leanV.z);
  }
  return geo;
}
// A faceted part's facets leaned (`k` of the way) toward the smooth normal of
// the surface at each corner (the mean of the facets meeting there), so the
// toon light's steps run as smooth curves over a big round form (the hood)
// instead of a staircase of patches; the facets still show in their colour
// steps.
const smoothV = new Vector3();
const smoothS = new Vector3();
function smoothLean(geo, k) {
  const pos = geo.attributes.position;
  const n = geo.attributes.normal;
  const key = (i) => `${Math.round(pos.getX(i) * 2e4)},${Math.round(pos.getY(i) * 2e4)},${Math.round(pos.getZ(i) * 2e4)}`;
  const sum = new Map();
  for (let i = 0; i < pos.count; i++) {
    const id = key(i);
    const a = sum.get(id) || [0, 0, 0];
    a[0] += n.getX(i);
    a[1] += n.getY(i);
    a[2] += n.getZ(i);
    sum.set(id, a);
  }
  for (let i = 0; i < pos.count; i++) {
    const a = sum.get(key(i));
    smoothS.set(a[0], a[1], a[2]).normalize();
    smoothV.fromBufferAttribute(n, i).lerp(smoothS, k).normalize();
    n.setXYZ(i, smoothV.x, smoothV.y, smoothV.z);
  }
  return geo;
}
// A facet material whose facets lean `k` of the way toward straight up in
// the world, whichever way the part is turned (a sleeve on a swinging arm,
// the staff, the rope's twists): the toon light then lies on the part in one
// step from every side, as the sheet's flat light does, and an underside
// never drops into the dark step. (leanNormals does the same in the
// geometry, for parts that never turn.) k is never 0.5: a facet that faces
// straight down would lean to nothing.
function leanUp(mat, k) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, renderer) => {
    if (prev) prev.call(mat, sh, renderer);
    sh.uniforms.uLeanUp = { value: k };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uLeanUp;')
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\n\ttransformedNormal = normalize( mix( normalize( transformedNormal ), normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz ), uLeanUp ) );');
  };
  const key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => `${key()}|leanup`;
  return mat;
}
const FRONT_Z = new Vector3(0, 0, 1);
const FRONT_UP = new Vector3(0, 0.25, 1).normalize();
const CHEST_UP = new Vector3(0, 0.5, 1).normalize();
const leanT = new Vector3();

export function buildHealerFacet(rig, trackAccent) {
  // §19.1/19.2 and Kesh's turnaround sheet (model review round 3): her garb
  // and fur are the sheet's colours, solved for the light (palette.js
  // HEALER_GARB); the class accent (Sage) stays on her ring and HP bar.
  const G = HEALER_GARB;
  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group(); // authored in feet-origin coordinates
  body.position.y = -HIP;
  torso.add(body);

  // Every garment material tracks to charcoal when she goes down.
  const robeMat = trackAccent(facetMaterial(G.robe));
  // (the parts that swing with her arms and the staff lean their facets up
  // in the shader, so each stays in the sheet's one lit tone as it turns)
  const sleeveMat = leanUp(trackAccent(facetMaterial(G.robe, { side: DoubleSide })), 0.65);
  const cuffMat = leanUp(trackAccent(facetMaterial(G.trim)), 0.65);
  const capeMat = trackAccent(facetMaterial(G.cape));
  const trimMat = trackAccent(facetMaterial(G.trim));
  const liningMat = trackAccent(facetMaterial(G.lining));
  const hoodMat = trackAccent(facetMaterial(G.robe));
  const ropeMat = leanUp(facetMaterial(G.rope), 0.6);
  const leatherMat = facetMaterial(G.leather);
  const flapMat = facetMaterial(G.flap);
  const strapMat = facetMaterial(G.strap);
  const furMat = facetMaterial(G.fur);
  const pinkMat = facetMaterial(G.pink);
  const noseMat = facetMaterial(G.nose);
  const pawMat = facetMaterial(G.paw);
  const woodMat = leanUp(facetMaterial(G.wood), 0.65);
  const footMat = facetMaterial(G.wrap); // the feet: wraps, with the legs and toes in their facet steps
  const tailMat = facetMaterial(G.tail);
  const ringMat = facetMaterial(mix(G.tail, G.trim, 0.55).getHex());

  // --- Where the garments run (body space) --------------------------------
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const capeAt = (t, a, lift, out) => {
    const y = CAPE_TOP.y + (capeFootY(wrapA(a)) - CAPE_TOP.y) * t;
    const r = capeR(t) + 0.006 * Math.sin(Math.PI * t) + lift;
    return out.set(Math.sin(a) * r, y, Math.cos(a) * r * CAPE_ZS - 0.005);
  };
  // the robe's way out at a point on it
  const robeN = (p, out) => out.set(p.x, 0, (p.z - ROBE_DZ) / (ROBE_ZS * ROBE_ZS)).normalize();
  // the point of the robe's front that stands at x across her (as the
  // sheet's front view measures it) and height y
  const onRobe = (x, y, out = new Vector3()) => {
    const at = (r) => Math.asin(Math.max(-0.99, Math.min(0.99, x / r)));
    return robeAt(at(robeR(y) * fold(at(robeR(y)), y)), y, 0, out);
  };
  // and the point `lift` off the robe that stands at x and y; `n` gets the
  // robe's way out there
  const offRobe = (x, y, lift, out, n) => {
    robeN(onRobe(x, y, out), n);
    robeN(onRobe(x - n.x * lift, y, out), n);
    return out.addScaledVector(n, lift);
  };
  // its two front edges meet under the hood's V, all the way down to the
  // clasp (the sheet's)
  const capeOpen = () => 0.012;
  const cloakBack = new Vector3();
  const cloakAt = (t, a, lift, out) => {
    const y = CLOAK.top + (CLOAK.foot - CLOAK.top) * t;
    const r = CLOAK.r0 + (CLOAK.r1 - CLOAK.r0) * Math.pow(t, 0.8) + lift;
    // (never into the robe: at least a little behind its back)
    const z = Math.min(cloakZ(t, a) - lift, robeAt(a, y, 0, cloakBack).z - 0.008 - lift);
    return out.set(Math.sin(a) * r, y, z);
  };
  // where the face opening cuts a ring of the hood or the cowl: the angle
  // round from her facing to its edge
  // (cut a little wide, so the cut edge lies under the rim's raised roll)
  const openA = (y) => {
    const w = hoodW(y);
    const o = openW(y);
    return o <= 0 || w <= 0 ? 0 : Math.asin(Math.min(1, (o + 0.006) / w));
  };
  // faces turned away from her middle line (or a point)
  const fromAxis = (c, o) => o.set(0, c.y, 0);
  function faceAway(geo, ref) {
    const pos = geo.attributes.position;
    const A = new Vector3();
    const B = new Vector3();
    const C = new Vector3();
    const n = new Vector3();
    const c = new Vector3();
    const o = new Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      A.fromBufferAttribute(pos, i);
      B.fromBufferAttribute(pos, i + 1);
      C.fromBufferAttribute(pos, i + 2);
      n.crossVectors(B.clone().sub(A), C.clone().sub(A));
      c.copy(A).add(B).add(C).divideScalar(3);
      if (n.dot(c.clone().sub(ref(c, o))) < 0) {
        pos.setXYZ(i + 1, C.x, C.y, C.z);
        pos.setXYZ(i + 2, B.x, B.y, B.z);
      }
    }
    return geo;
  }
  const lathe = (pts, sides) => new LatheGeometry(pts.map(([x, y]) => new Vector2(x, y)), sides);
  // a sheet over (t, a): rows of t, steps of a, each point from `at`
  const grid = (t0, t1, rows, a0, a1, sides, at, lift = 0) =>
    clothSheet(rows, sides, (k) => (typeof a0 === 'function' ? a0(t0 + ((t1 - t0) * k) / rows) : a0), (k) => (typeof a1 === 'function' ? a1(t0 + ((t1 - t0) * k) / rows) : a1), (k, a, out) => at(t0 + ((t1 - t0) * k) / rows, a, typeof lift === 'function' ? lift(k) : lift, out));

  // --- The robe: a sand linen A-line closed over at the neck, its skirt
  // fluted into soft folds; the outside of the cloak is the same linen, so
  // the two are one mesh.
  const robeGeo = sharedGeo('facet:healer-robe', () => {
    // (its rings: the table's, bar those the capelet and the cowl hide)
    const Y = ROBE.map(([, y]) => y).filter((y) => y > 0.745 || y < 0.6);
    const robe = clothSheet(Y.length - 1, 24, -Math.PI, Math.PI, (k, a, out) => robeAt(a, Y[k], 0, out));
    const cloak = grid(0, 1, CLOAK.rows, (t) => Math.PI - cloakSpan(t), (t) => Math.PI + cloakSpan(t), 14, cloakAt);
    // (its front, from the hem to the chest, leaned toward her facing and
    // a little up, the more the more it faces her front, so the front lands
    // in one lit step under a high key as the sheet's front does, and its
    // sides fall away into the mid step)
    // (the chest leans higher still, so its free half is lit out to her
    // side as the sheet's is)
    const front = fz(faceAway(robe, fromAxis), 0.035, 103);
    const fp = front.attributes.position;
    const fn = front.attributes.normal;
    const fc = front.attributes.color;
    for (let i = 0; i < fn.count; i++) {
      const y = fp.getY(i);
      // the sheet's soft shading, painted: the skirt deepens a little toward
      // the hem, and the capelet's shadow lies on the chest under its foot
      const low = smooth01((0.29 - y) / 0.07);
      const under = smooth01((y - 0.52) / 0.06);
      fc.setXYZ(i, fc.getX(i) * (1 - 0.03 * low - 0.1 * under), fc.getY(i) * (1 - 0.08 * low - 0.16 * under), fc.getZ(i) * (1 - 0.08 * low - 0.18 * under));
      const z = fn.getZ(i);
      if (z <= 0 || y < HEM_Y || y > 0.6) continue;
      const chest = y > BELT_Y;
      leanV.fromBufferAttribute(fn, i).lerp(chest ? CHEST_UP : FRONT_UP, (chest ? 0.7 : 0.5) * z).normalize();
      fn.setXYZ(i, leanV.x, leanV.y, leanV.z);
    }
    return merge([front, fz(faceAway(cloak, fromAxis), 0.03, 105)]);
  });
  body.add(fpart(robeGeo, robeMat));
  // the cloak's rust lining, seen past the robe's sides (it faces in, out
  // of the light, so its steps are lifted to the sheet's mid rust there)
  const liningGeo = sharedGeo('facet:healer-lining', () => {
    const g = grid(0, 1, CLOAK.rows, (t) => Math.PI - cloakSpan(t), (t) => Math.PI + cloakSpan(t), 14, cloakAt, -0.003);
    // faces turned in toward her
    return leanNormals(tint(fz(faceAway(g, (c, o) => o.set(c.x * 3, c.y, c.z * 3)), 0.03, 106), G.cloakLining, G.lining), FRONT_Z, 0.6);
  });
  body.add(new Mesh(liningGeo, liningMat));
  // The cowl: the hood carried on down round the neck and out over the
  // shoulders (over the capelet's top), open in the face opening's V, lined
  // in rust like the hood; on the body, flush inside the hood's foot.
  const COWL_Y = COWL_RINGS.map(([y]) => y);
  // (its foot curves up at the sides, the sheet's fold over the shoulders)
  const cowlFold = (k, a) => 0.022 * Math.abs(Math.sin(a)) ** 1.5 * Math.max(0, (k - (COWL_Y.length - 4)) / 3);
  const cowlAt = (k, a, lift, out) => {
    hoodAt(a, COWL_Y[k], lift, out);
    out.y += cowlFold(k, a);
    return out;
  };
  const cowlGeo = sharedGeo('facet:healer-cowl', () => {
    const g = smoothLean(fz(faceAway(clothSheet(COWL_Y.length - 1, 24, (k) => openA(COWL_Y[k]), (k) => Math.PI * 2 - openA(COWL_Y[k]), (k, a, out) => cowlAt(k, a, 0, out)), (c, o) => o.set(0, c.y, hoodZ(c.y))), 0.025, 104), 0.75);
    // (its facets leaned up, so both its lobes sit in the lit step)
    leanNormals(g, (n) => leanT.set(n.x, Math.max(n.y, 0) + 0.45 * Math.hypot(n.x, n.z), n.z).normalize(), 0.6);
    // its last strip darkened to the fold's line
    const fold = mix(G.lining, PALETTE.voidCharcoal, 0.5);
    const base = new Color(G.robe);
    const col = g.attributes.color;
    for (let v = (COWL_Y.length - 2) * 24 * 6; v < (COWL_Y.length - 1) * 24 * 6; v++) col.setXYZ(v, (col.getX(v) * fold.r) / base.r, (col.getY(v) * fold.g) / base.g, (col.getZ(v) * fold.b) / base.b);
    return g;
  });
  body.add(fpart(cowlGeo, hoodMat));
  // its lining, where it shows: either side of the V
  const cowlLiningGeo = sharedGeo('facet:healer-cowl-lining', () => fz(merge([1, -1].map((side) => faceAway(clothSheet(COWL_Y.length - 1, 3, (k) => side * openA(COWL_Y[k]), (k) => side * (openA(COWL_Y[k]) + 2.2), (k, a, out) => cowlAt(k, a, -0.004, out)), (c, o) => o.set(c.x * 3, c.y, hoodZ(c.y) + (c.z - hoodZ(c.y)) * 3)))), 0.05, 108));
  body.add(new Mesh(cowlLiningGeo, liningMat));
  // her neck deep in the V under her chin, in the chin's shadow (it closes
  // the V; it stays behind the chin, so the chin's line shows over it)
  const throatGeo = sharedGeo('facet:healer-throat', () => leanNormals(tint(piece(fz(new SphereGeometry(1, 8, 5).rotateY(Math.PI / 8), 0.04, 109), { at: [0, 0.668, 0.01], scale: [0.11, 0.07, 0.09] }), G.throat, G.lining), FRONT_UP, 0.7));
  body.add(new Mesh(throatGeo, liningMat));
  // The capelet: camel, over the shoulders, its foot hanging lower behind.
  const capeGeo = sharedGeo('facet:healer-cape', () => smoothLean(fz(faceAway(grid(0, 1, 5, capeOpen, (t) => Math.PI * 2 - capeOpen(t), 24, capeAt), fromAxis), 0.035, 107), 0.6));
  body.add(fpart(capeGeo, capeMat));

  // --- The rim round the face: a thick rust roll along the opening's edge,
  // tucked in at its inner edge, lying on the hood (the head's part, above
  // the chin) and on down the cowl into the V (the body's part).
  const RIM = [[-0.002, -0.0015], [0.002, 0.0045], [0.014, 0.008], [0.026, 0.002]]; // [out from the edge, lift]
  // (its roll widens round the cheeks, where it runs out to the hood's edge,
  // and narrows again down the V's arms)
  const rimWide = (y) => (1.15 + 0.15 * smooth01((0.84 - y) / 0.06)) * (1 - 0.33 * smooth01((0.745 - y) / 0.04));
  const rimRight = [];
  for (let i = 0; i < OPENING.length; i++) {
    const [y, x] = OPENING[i];
    rimRight.push([x, y]);
    if (i + 1 < OPENING.length) {
      const [y1, x1] = OPENING[i + 1];
      rimRight.push([(x + x1) / 2, (y + y1) / 2]);
    }
  }
  function rimBand(path, headSpace) {
    const rows = [];
    const n3 = new Vector3();
    for (let i = 0; i < path.length; i++) {
      const [x, y] = path[i];
      const [xa, ya] = path[Math.max(0, i - 1)];
      const [xb, yb] = path[Math.min(path.length - 1, i + 1)];
      let nx = yb - ya;
      let ny = -(xb - xa);
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
      // out of the opening: away from its middle
      if (nx * x + ny * (y - 0.82) < 0) {
        nx = -nx;
        ny = -ny;
      }
      rows.push(RIM.map(([off, lift], j) => {
        const o = j >= 2 ? off * rimWide(y) : off;
        const px = x + nx * o;
        const py = y + ny * o;
        const w = hoodW(py);
        const d = hoodD(py);
        // (never quite round to the hood's side: a point pushed out to the hood's
        // full width would land far back on it, a spike in profile)
        const a = Math.asin(Math.max(-0.97, Math.min(0.97, px / w)));
        const p = hoodAt(a, py, 0);
        n3.set(p.x / (w * w), 0, (p.z - hoodZ(py)) / (w * d) ** 2).normalize();
        p.addScaledVector(n3, lift);
        if (headSpace) p.y -= HEAD_C;
        return p;
      }));
    }
    const pos = [];
    for (let i = 0; i + 1 < rows.length; i++) {
      for (let j = 0; j + 1 < RIM.length; j++) {
        for (const p of [rows[i][j], rows[i + 1][j], rows[i][j + 1], rows[i][j + 1], rows[i + 1][j], rows[i + 1][j + 1]]) pos.push(p.x, p.y, p.z);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    return faceAway(g, (c, o) => o.set(0, c.y, hoodZ(headSpace ? c.y + HEAD_C : c.y) - 0.05));
  }
  // the rim's inner slope (its first strip, tucked in at the face) darkened
  // to the sheet's ink line round the face
  const rimInk = new Color(mix(G.trim, PALETTE.voidCharcoal, 0.9).getHex());
  function inkRimEdge(geo) {
    const t = new Color(G.trim);
    const k = [rimInk.r / t.r, rimInk.g / t.g, rimInk.b / t.b];
    const col = geo.attributes.color;
    for (let v = 0; v < col.count; v++) {
      const strip = Math.floor(v / 6) % (RIM.length - 1);
      const inner = [0, 1, 4].includes(v % 6); // (the quad's corners on its inner edge)
      // its inner slope inked; a dark stripe in along the roll's foot, and a
      // fine line along its outer edge
      const m = strip === 0 ? k : strip === 1 && inner ? [0.8, 0.8, 0.8] : strip === 2 && !inner ? [0.85, 0.85, 0.85] : null;
      if (m) col.setXYZ(v, col.getX(v) * m[0], col.getY(v) * m[1], col.getZ(v) * m[2]);
    }
    return geo;
  }
  // the rim's normals leaned up, so its roll stays out of the dark step
  // (and drawn in from the sides, so the roll on her far cheek is lit as the
  // near one is)
  const rimUp = (geo) => leanNormals(geo, (n) => leanT.set(0.5 * n.x, Math.max(n.y, 0) + 0.7 * Math.hypot(n.x, n.z), n.z + 0.3).normalize(), 0.85);
  // a trim sheet's strip `row` (of `sides` quads a row) inked the same way
  function inkStrip(geo, sides, row) {
    const t = new Color(G.trim);
    const k = [rimInk.r / t.r, rimInk.g / t.g, rimInk.b / t.b];
    const col = geo.attributes.color;
    for (let v = row * sides * 6; v < (row + 1) * sides * 6; v++) col.setXYZ(v, col.getX(v) * k[0], col.getY(v) * k[1], col.getZ(v) * k[2]);
    return geo;
  }

  // --- The rust trim on the body, one mesh: the robe's hem band; the wrap's
  // edge, from the neck across to the knot and straight down to the hem; the
  // rim's run down the cowl into the V; the capelet's foot and its clasp;
  // the cloak's foot and sides.
  const trimGeo = sharedGeo('facet:healer-trim', () => {
    const parts = [];
    // (each band's facets leaned up, so it reads as one lit rust all the
    // way round, as the sheet's bands do)
    const up = (g) => leanNormals(g, UP_Y, 0.65);
    const add = (g, seed) => parts.push(up(fz(faceAway(g, fromAxis), 0.05, seed)));
    // the hem band, with the sheet's ink line along its foot (its first
    // strip, under the robe's edge)
    // (the ink hangs on below the robe's foot, at the foot's own width)
    const HB = [[0.129, 0.004], [0.137, 0.006], [0.193, 0.007]];
    const hemAt = (k, a, out) => {
      const y = Math.max(HB[k][0], HEM_Y - 0.004);
      robeAt(a, y, HB[k][1], out).y += HB[k][0] - y;
      return out;
    };
    parts.push(up(inkStrip(fz(faceAway(clothSheet(2, 24, -Math.PI, Math.PI, hemAt), fromAxis), 0.05, 141), 24, 0)));
    // the wrap's edge: from under the clasp in a long diagonal across to
    // the knot, then straight down to the hem (the sheet's); and the short
    // edge of the panel under it, from the clasp down the other way into the
    // capelet's opening
    const path = [];
    for (let i = 0; i <= 8; i++) {
      const y = 0.575 + (BELT_Y + 0.012 - 0.575) * (i / 8);
      const x = -0.03 + 0.118 * (i / 8);
      path.push(robeAt(Math.asin(Math.max(-0.99, Math.min(0.99, x / robeR(y)))), y, 0));
    }
    for (let i = 1; i <= 7; i++) {
      const y = BELT_Y - 0.01 + (0.19 - BELT_Y + 0.01) * (i / 7);
      const x = 0.092 + 0.004 * (i / 7);
      path.push(robeAt(Math.asin(Math.min(0.99, x / robeR(y))), y, 0));
    }
    add(surfaceBand(path, robeN, 0.046, { lift: 0.004, crest: 0.004 }), 142);
    // the rim on down the cowl: down the right side into the V, up the left
    const low = rimRight.filter(([, y]) => y <= 0.779);
    parts.push(inkRimEdge(rimUp(fz(rimBand([...low, ...low.slice(0, -1).reverse().map(([x, y]) => [-x, y])], false), 0.05, 143))));
    // the capelet's foot, and its two front edges from the clasp down
    add(grid(0.84, 1, 2, capeOpen, (t) => Math.PI * 2 - capeOpen(t), 24, capeAt, (k) => [0.006, 0.008, 0.006][k]), 145);
    for (const side of [1, -1]) add(grid(0.6, 0.8, 2, (t) => (side > 0 ? capeOpen(t) : -capeOpen(t) - 0.11), (t) => (side > 0 ? capeOpen(t) + 0.11 : -capeOpen(t)), 1, capeAt, () => 0.008), 146);
    // the clasp where the capelet's edges meet: a round stud, between the
    // trim's rust and the linen's sand
    const claspZ = capeAt((CAPE_TOP.y - 0.597) / (CAPE_TOP.y - capeFootY(0)), 0, 0.008, new Vector3()).z + 0.002;
    parts.push(tint(piece(fz(new IcosahedronGeometry(1, 0), 0.06, 149), { at: [0, 0.597, claspZ], scale: [0.014, 0.017, 0.008] }), mix(G.trim, G.robe, 0.5).getHex(), G.trim));
    // the cloak's foot and sides
    add(grid(0.92, 1, 1, (t) => Math.PI - cloakSpan(t), (t) => Math.PI + cloakSpan(t), 14, cloakAt, () => 0.005), 147);
    for (const side of [-1, 1]) add(grid(0, 1, CLOAK.rows, (t) => Math.PI + side * cloakSpan(t), (t) => Math.PI + side * (cloakSpan(t) - 0.1), 1, cloakAt, () => 0.005), 148);
    return merge(parts);
  });
  body.add(fpart(trimGeo, trimMat));


  // --- The rope belt round the waist: a thick twisted cord, knotted at the
  // front on her staff side, its two ends hanging down the skirt to round
  // tips; two leather pouches at the hips. Round the waist the cord is a
  // painted bed (its two edges the sheet's ink lines, its middle the dark of
  // the grooves between the strands) under one instanced part, the strands:
  // each a low pyramid slanted across the cord, a groove's width from the
  // next. The knot and the two loose ends are round (their own hull inks
  // them from every side), the twist's grooves painted across them.
  // The belt dips at the front, where the knot draws it down, and runs level
  // round her sides and her back (the sheet's three views).
  const beltY = (a) => 0.436 - 0.015 * smooth01((Math.cos(a) - 0.5) / 0.45) - 0.0035 * smooth01((-Math.cos(a) - 0.5) / 0.5);
  const beltAt = (a, dy, lift, out) => robeAt(a, beltY(a) + dy, lift, out);
  // (H: the cord's half-height to the outside of its ink, h to the inside of
  // it; the bed `lift` off the robe, its edges `edge` off it, the strands `d`
  // proud of the bed; n strands round the waist)
  const CORD = Object.freeze({ H: 0.0142, h: 0.0098, lift: 0.0065, edge: 0.0015, d: 0.0055, n: 30 });
  // a colour as a step of a material's own (for painting a facet), and a
  // material's ink
  const stepOf = (c, baseHex) => {
    const b = new Color(baseHex);
    return [c.r / b.r, c.g / b.g, c.b / b.b];
  };
  const inkOf = (hex) => stepOf(mix(hex, PALETTE.voidCharcoal, 0.9), hex);
  const ROPE_INK = inkOf(G.rope);
  const ROPE_GROOVE = [0.58, 0.52, 0.46];
  // The knot: a ball of cord on the belt, where the sheet's front view has
  // it, turned a little out to her staff side (r its half-sizes: across, up,
  // out); the ends come out from under its foot.
  const KNOT = Object.freeze({ x: 0.0933, y: 0.4208, lift: 0.0095, yaw: 0.3, r: [0.028, 0.0235, 0.016] });
  const KNOT_FOOT = KNOT.y - KNOT.r[1] + 0.002;
  const knotP = offRobe(KNOT.x, KNOT.y, KNOT.lift, new Vector3(), new Vector3());
  const knotQ = new Quaternion().setFromAxisAngle(UP_Y, KNOT.yaw);
  // The two loose ends, from under the knot down the skirt: where each runs
  // (x across her, by height) from `top` (inside the knot) to `foot` (where
  // its round tip starts); r the cord's radius, `lift` its middle off the
  // robe; the twist shows as END_LINES grooves down each.
  const ENDS = [
    { x: () => 0.0845, top: 0.41, foot: 0.2835, r: 0.0105, lift: 0.009 },
    { x: (y) => 0.108 + 0.18 * (0.4 - y), top: 0.41, foot: 0.291, r: 0.0115, lift: 0.0098 },
  ];
  const END_LINES = 6;
  // an end's frame t of the way down it: p its middle, x down its run, y
  // across it, z its way out
  const fr = { p: new Vector3(), x: new Vector3(), y: new Vector3(), z: new Vector3() };
  const endFrame = (e, t) => {
    const y = e.top + (e.foot - e.top) * t;
    offRobe(e.x(y - 0.004), y - 0.004, e.lift, fr.x, fr.z).sub(offRobe(e.x(y + 0.004), y + 0.004, e.lift, fr.p, fr.z)).normalize();
    offRobe(e.x(y), y, e.lift, fr.p, fr.z);
    fr.z.addScaledVector(fr.x, -fr.z.dot(fr.x)).normalize();
    fr.y.crossVectors(fr.z, fr.x);
    return fr;
  };
  // the middle of an end's cord nearest a point of it
  const endMiddle = (e) => (c, o) => {
    const y = Math.max(e.foot, Math.min(e.top, c.y));
    return offRobe(e.x(y), y, e.lift, o, fr.z);
  };
  // One strand (x along the cord, y across it, z out of it; a unit, scaled
  // to the cord where it is placed): a parallelogram leaning along the cord
  // as it crosses it (the sheet's slant), drawn up to a point in its middle;
  // a groove's width narrower than its step along the cord.
  const strandGeo = sharedGeo('facet:healer-strand', () => {
    const w = 0.41;
    const lean = 0.316;
    const A = new Vector3(-w - lean, -1, 0);
    const B = new Vector3(w - lean, -1, 0);
    const C = new Vector3(w + lean, 1, 0);
    const D = new Vector3(-w + lean, 1, 0);
    const P = new Vector3(0, 0, 1);
    const g = fz(trisGeo([A, B, P, B, C, P, C, D, P, D, A, P]), 0.03, 111);
    // (its under side and its trailing side a step darker: the sheet's soft
    // shade in each strand)
    const col = g.attributes.color;
    for (let v = 0; v < col.count; v++) {
      const k = v < 3 ? 0.93 : v >= 9 ? 0.96 : 1;
      col.setXYZ(v, col.getX(v) * k, col.getY(v) * k, col.getZ(v) * k);
    }
    return g;
  });
  // round the waist: each on its own flat of the bed
  const rope = placeRow(strandGeo, ropeMat, CORD.n, (i, m) => {
    beltAt(((i - 0.5) / CORD.n) * Math.PI * 2, 0, CORD.lift + 0.0005, fr.p);
    beltAt(((i + 0.5) / CORD.n) * Math.PI * 2, 0, CORD.lift + 0.0005, fr.y);
    fr.x.subVectors(fr.y, fr.p);
    const len = fr.x.length();
    fr.x.normalize();
    fr.p.add(fr.y).multiplyScalar(0.5);
    fr.z.crossVectors(fr.x, UP_Y).normalize();
    fr.y.crossVectors(fr.z, fr.x);
    setTRS(m, fr.p, fr.x, fr.y, fr.z, len, CORD.h, CORD.d);
  }, { name: 'healer-rope', seed: 111, mottle: 0.05 });
  body.add(rope);
  // the bed under the strands (no hull: its ink is painted), with the ends'
  // round tips and the knot's wraps
  const bedGeo = sharedGeo('facet:healer-rope-bed', () => {
    const parts = [];
    const inked = [ROPE_INK, ROPE_GROOVE, ROPE_INK];
    // round the waist, its corners between the strands
    const belt = [];
    for (let i = 0; i <= CORD.n; i++) {
      const a = ((i - 0.5) / CORD.n) * Math.PI * 2;
      belt.push([beltAt(a, CORD.H, CORD.edge), beltAt(a, CORD.h, CORD.lift), beltAt(a, -CORD.h, CORD.lift), beltAt(a, -CORD.H, CORD.edge)]);
    }
    parts.push(paintStrips(fz(faceAway(ribbon(belt), fromAxis), 0.03, 110), 4, inked));
    // the grooves of the twist across each loose end: short strips round its
    // front, slanting as the sheet's lines do
    for (const e of ENDS) {
      const t0 = (e.top - KNOT_FOOT) / (e.top - e.foot);
      const grooves = [];
      for (let s = 0; s < END_LINES; s++) {
        endFrame(e, t0 + ((1 - t0) * (s + 0.6)) / END_LINES);
        const R = e.r + 0.0012;
        grooves.push(ribbon([15, 62, 118, 165].map((deg) => {
          const f = (deg / 180) * Math.PI;
          const c = fr.p.clone().addScaledVector(fr.y, Math.cos(f) * R).addScaledVector(fr.z, Math.sin(f) * R).addScaledVector(fr.x, 0.7 * Math.cos(f) * R);
          return [c.clone().addScaledVector(fr.x, -0.0017), c.clone().addScaledVector(fr.x, 0.0017)];
        })));
      }
      parts.push(shade(fz(faceAway(merge(grooves), endMiddle(e)), 0.03, 115), ROPE_GROOVE));
    }
    // the knot's wraps, painted on the ball (in its own space): one band
    // across it and two short spurs off the band (the sheet's)
    const [rx, ry, rz] = KNOT.r;
    const onBall = (x, y) => {
      const z = rz * Math.sqrt(Math.max(0.03, 1 - (x / rx) ** 2 - (y / ry) ** 2));
      return new Vector3(x, y, z).addScaledVector(new Vector3(x / (rx * rx), y / (ry * ry), z / (rz * rz)).normalize(), 0.0014);
    };
    const wrap = (x0, y0, x1, y1, w) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const px = (-(y1 - y0) / len) * w * 0.5;
      const py = ((x1 - x0) / len) * w * 0.5;
      const rows = [];
      for (let s = 0; s <= 3; s++) {
        const x = x0 + ((x1 - x0) * s) / 3;
        const y = y0 + ((y1 - y0) * s) / 3;
        rows.push([onBall(x - px, y - py), onBall(x + px, y + py)]);
      }
      return ribbon(rows);
    };
    const wraps = merge([wrap(0.02, -0.0122, -0.0108, 0.0172, 0.005), wrap(0.0154, 0.0172, 0.011, 0.0059, 0.003), wrap(-0.0007, -0.0031, -0.0177, -0.0112, 0.003)]);
    parts.push(shade(fz(faceAway(wraps, (c, o) => o.set(0, 0, 0)), 0.03, 118), ROPE_GROOVE).applyMatrix4(new Matrix4().compose(knotP, knotQ, new Vector3(1, 1, 1))));
    return merge(parts);
  });
  body.add(new Mesh(bedGeo, ropeMat));
  // the knot's ball, the bight of cord that shows beside it, and the two
  // loose ends: round cords down to round tips
  const knotGeo = sharedGeo('facet:healer-knot', () => {
    const bight = offRobe(0.1333, 0.4372, 0.006, new Vector3(), new Vector3());
    const cord = (e) => {
      const ring = (t, r, drop) => {
        endFrame(e, t);
        const c = fr.p.clone().addScaledVector(fr.x, drop);
        return Array.from({ length: 7 }, (_, j) => c.clone().addScaledVector(fr.y, Math.cos((j / 3) * Math.PI) * r).addScaledVector(fr.z, Math.sin((j / 3) * Math.PI) * r));
      };
      const rows = [];
      for (let k = 0; k <= 5; k++) rows.push(ring(k / 5, e.r, 0));
      rows.push(ring(1, e.r * 0.8, e.r * 0.6), ring(1, 0, e.r));
      return smoothLean(fz(faceAway(dropNeedles(ribbon(rows)), endMiddle(e)), 0.03, 114), 0.8);
    };
    return merge([
      piece(fz(new SphereGeometry(1, 10, 6), 0.04, 112), { at: knotP.toArray(), q: knotQ, scale: KNOT.r }),
      piece(fz(new IcosahedronGeometry(1, 0), 0.06, 113), { at: bight.toArray(), scale: [0.0055, 0.0082, 0.006] }),
      ...ENDS.map(cord),
    ]);
  });
  body.add(fpart(knotGeo, ropeMat));

  // The pouches: a soft leather sack hung under the belt at each hip, widest
  // low down and round under ([y, half-width] from its top down), flat where
  // it hangs from the belt and plump below (sackD: its depth, of its width),
  // its foot in shade; a flap over its top, hanging lower over its front, its
  // edge inked; and a pale strap tongue from the flap's tip down the sack's
  // front.
  const SACK = [[0.061, 0], [0.0575, 0.035], [0.044, 0.0415], [0.014, 0.047], [-0.028, 0.0622], [-0.04, 0.063], [-0.052, 0.054], [-0.059, 0.036], [-0.062, 0]];
  const sackD = (y) => 0.36 + 0.26 * smooth01((0.05 - y) / 0.085);
  const SACK_TURN = Math.PI / 10; // a flat of its ten sides faces its front
  // a point of the sack at angle f round it (0 its front) and height y,
  // `lift` off it
  const sackAt = (f, y, lift, out) => {
    const r = lerpRows(SACK, y);
    return out.set(Math.sin(f) * (r + lift), y, Math.cos(f) * (r * sackD(y) + lift));
  };
  // the flap's edge by the angle round the sack: lower over its front
  const flapY = (f) => 0.038 - 0.028 * Math.max(0, Math.cos(f)) ** 2;
  const fromMiddle = (c, o) => o.set(0, 0, 0);
  // (a soft round form: its facets leaned to the surface's own curve, then
  // up, so the whole sack sits in one step of the light)
  const softUp = (g) => leanNormals(smoothLean(g, 0.9), (n) => leanT.set(n.x, Math.max(n.y, 0) + 0.8 * Math.hypot(n.x, n.z), n.z).normalize(), 0.7);
  const sackGeo = (seed) => {
    const round = dropNeedles(new LatheGeometry(SACK.map(([y, r]) => new Vector2(r, y)).reverse(), 10).rotateY(SACK_TURN));
    const rp = round.attributes.position;
    for (let v = 0; v < rp.count; v++) rp.setZ(v, rp.getZ(v) * sackD(rp.getY(v)));
    const g = softUp(fz(faceAway(round, fromMiddle), 0.03, seed));
    const pos = g.attributes.position;
    const col = g.attributes.color;
    for (let v = 0; v < pos.count; v++) {
      const s = smooth01((-0.029 - pos.getY(v)) / 0.01);
      col.setXYZ(v, col.getX(v) * (1 - 0.36 * s), col.getY(v) * (1 - 0.46 * s), col.getZ(v) * (1 - 0.36 * s));
    }
    return g;
  };
  const flapGeo = (seed) => {
    const at = (k, f, out) => {
      if (k === 4) return out.set(0, 0.064, 0);
      const e = flapY(f);
      return sackAt(f, [e - 0.003, e, e + (0.0575 - e) * 0.5, 0.0575][k], k ? 0.0035 : 0.0006, out);
    };
    // (its first strip, down to the sack, is its inked edge)
    return softUp(fz(faceAway(dropNeedles(clothSheet(4, 10, -Math.PI + SACK_TURN, Math.PI + SACK_TURN, at)), fromMiddle), 0.03, seed));
  };
  const POUCH_Y = 0.362; // the sack's middle
  const pouchFrames = [-1.2, 1.35].map((a) => {
    const p = robeAt(a, POUCH_Y, 0.018);
    const n = robeN(p, new Vector3());
    // (the staff-side one faces out to her side; the other is turned most of
    // the way to her front, so it shows its face from the front as the
    // sheet's does)
    const yaw = (a > 0 ? 0.85 : 0.68) * Math.atan2(n.x, n.z);
    // (each hangs along the skirt, its foot swung out; the free-side one
    // leans out a little more, across its own face)
    return { at: [p.x, p.y, p.z], q: new Quaternion().setFromEuler(new Euler(-0.14, yaw, a > 0 ? 0 : -0.1, 'YXZ')) };
  });
  const bagGeo = sharedGeo('facet:healer-bags', () => merge(pouchFrames.map((f, i) => piece(sackGeo(151 + i), { at: f.at, q: f.q }))));
  body.add(fpart(bagGeo, leatherMat));
  const lidGeo = sharedGeo('facet:healer-lids', () => {
    const ink = inkOf(G.flap);
    return merge(pouchFrames.map((f, i) => {
      const g = flapGeo(153 + i);
      const col = g.attributes.color;
      for (let v = 0; v < 60; v++) col.setXYZ(v, col.getX(v) * ink[0], col.getY(v) * ink[1], col.getZ(v) * ink[2]);
      return piece(g, { at: f.at, q: f.q });
    }));
  });
  body.add(fpart(lidGeo, flapMat));
  const strapGeo = sharedGeo('facet:healer-straps', () => {
    const ink = inkOf(G.strap);
    const TAB = { W: 0.0095, w: 0.0068, top: 0.017, foot: -0.014, lift: 0.0058, edge: 0.0033 };
    const front = (c, o) => o.set(c.x, c.y, -1);
    const tabAt = (x, y, lift) => new Vector3(x, y, lerpRows(SACK, y) * Math.cos(SACK_TURN) * sackD(y) + lift);
    const cut = [];
    // the tongue: its run down from the flap, inked down both sides
    const run = [TAB.top, 0.007, -0.003, TAB.foot].map((y) => [-TAB.W, -TAB.w, TAB.w, TAB.W].map((x, j) => tabAt(x, y, j % 3 ? TAB.lift : TAB.edge)));
    cut.push(paintStrips(fz(faceAway(ribbon(run), front), 0.03, 155), 4, [ink, null, ink]));
    // its square top on the flap, and its round foot, inked round
    const arc = (r, lift, s) => tabAt(r * Math.cos((s / 4) * Math.PI), TAB.foot - r * Math.sin((s / 4) * Math.PI), lift);
    const fill = [];
    const rim = [tabAt(-TAB.W, TAB.top, TAB.lift), tabAt(TAB.W, TAB.top, TAB.lift), tabAt(-TAB.W, TAB.top + 0.003, TAB.edge), tabAt(TAB.W, TAB.top, TAB.lift), tabAt(TAB.W, TAB.top + 0.003, TAB.edge), tabAt(-TAB.W, TAB.top + 0.003, TAB.edge)];
    for (let s = 0; s < 4; s++) {
      fill.push(tabAt(0, TAB.foot, TAB.lift), arc(TAB.w, TAB.lift, s), arc(TAB.w, TAB.lift, s + 1));
      rim.push(arc(TAB.w, TAB.lift, s), arc(TAB.W, TAB.edge, s), arc(TAB.w, TAB.lift, s + 1), arc(TAB.w, TAB.lift, s + 1), arc(TAB.W, TAB.edge, s), arc(TAB.W, TAB.edge, s + 1));
    }
    // and the stud that holds it: a dark dot near its foot
    const stud = [[0, 0.0026], [-0.0022, 0], [0, -0.0026], [0.0022, 0]].map(([x, y]) => tabAt(x, TAB.foot + 0.004 + y, TAB.lift + 0.0008));
    rim.push(stud[0], stud[1], stud[2], stud[0], stud[2], stud[3]);
    cut.push(fz(faceAway(trisGeo(fill), front), 0.03, 156), shade(fz(faceAway(trisGeo(rim), front), 0.03, 157), ink));
    const tab = merge(cut);
    return merge(pouchFrames.map((f) => piece(tab, { at: f.at, q: f.q })));
  });
  body.add(new Mesh(strapGeo, strapMat));

  // --- Head: a taupe skull grown out in front into a soft snout (one
  // surface, its muzzle paler and its cheeks blushed), the painted eyes and
  // brows, a pink nose and a little "w" mouth, under the sand hood with its
  // thick rust rim round the face; the big round ears stand out through it.
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const RX = HEAD_R * SX;
  const RY = HEAD_R * SY;
  const RZ = HEAD_R * SZ;
  // how much of the snout a point of the skull carries (head space, before
  // HEAD_Z; z its depth on the plain skull): full over the muzzle, none
  // round the back
  const snoutK = (x, y, z) => Math.exp(-((x / SNOUT.sx) ** 2 + ((y - SNOUT.y) / SNOUT.sy) ** 2)) * smooth01((z / RZ + 0.1) / 0.4);
  const jawK = (x, y, z) => Math.exp(-((x / JAW.sx) ** 2 + ((y - JAW.y) / JAW.sy) ** 2)) * smooth01((z / RZ + 0.1) / 0.4);
  // how far the snout and the jaw stand a point of the plain skull out
  const browK = (x, y, z) => Math.exp(-((x / BROW.sx) ** 2 + ((y - BROW.y) / BROW.sy) ** 2)) * smooth01((z / RZ + 0.1) / 0.4);
  const faceBump = (x, y, z) => SNOUT.h * snoutK(x, y, z) + JAW.h * jawK(x, y, z) + BROW.h * browK(x, y, z);
  // The lower half of her face runs long, down to a soft chin in the hood's
  // V (the sheet's face fills the opening): a point of the ball at height v
  // (-1..1) stands at RY * vMap(v).
  const CHIN = 0.25;
  const vMap = (v) => (v < 0 ? v * (1 + CHIN * v * v) : v);
  const vOf = (y) => {
    const t = y / RY;
    if (t >= 0) return Math.min(1, t);
    let v = Math.max(-1, t);
    for (let i = 0; i < 6; i++) v -= (v + CHIN * v * v * v - t) / (1 + 3 * CHIN * v * v);
    return Math.max(-1, v);
  };
  // The skull's rings, as a share of the ball's: the crown drawn in (the
  // narrow dome of the hood sits close over it) and the lower face squared
  // off toward a superellipse, so it is widest at the cheeks, as the sheet's
  // pear-shaped face is.
  const ringX = (v) => (v > 0 ? 1 - 0.12 * smooth01(v / 0.5) : Math.sqrt(1 + 1.4 * v * v));
  const ringZ = (v) => (v > 0 ? 1 : Math.sqrt(1 + v * v));
  const skullZ = (x, y) => {
    const v = vOf(y);
    return RZ * ringZ(v) * Math.sqrt(Math.max(0, 1 - (x / (RX * ringX(v))) ** 2 - v ** 2));
  };
  // the face's surface in front (head space)
  const surfZ = (x, y) => {
    const z = skullZ(x, y);
    return HEAD_Z + z + faceBump(x, y, z);
  };
  const skullGeo = sharedGeo('facet:healer-skull', () => {
    // the front half of a ball (the hood hides the rest), the snout swelled out
    const g = new SphereGeometry(1, 16, 16, 0, Math.PI).toNonIndexed();
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = pos.getY(i);
      const x = pos.getX(i) * RX * ringX(v);
      const y = vMap(v) * RY;
      const z = pos.getZ(i) * RZ * ringZ(v);
      pos.setXYZ(i, x, y, HEAD_Z + z + faceBump(x, y, z));
    }
    // a soft step, its facets lifted well up toward the light (keeping some
    // of their own turn): the whole face sits in the lit step from the front
    // and in profile alike, and reads as the sheet's one soft taupe surface
    const f = leanNormals(fz(g, 0.014, 115), (n) => leanT.set(0.6 * n.x, Math.max(n.y, 0) + 1.4 * Math.hypot(n.x, n.z), n.z).normalize(), 0.9);
    // the muzzle paler, one soft oval over the nose, the mouth and the chin,
    // and the cheeks faintly blushed: graded vertex by vertex, so they blend
    // across the facets as the sheet's soft shading does
    // and a mauve-grey shade round its edge, just inside the rim's ink
    const fp = f.attributes.position;
    const col = f.attributes.color;
    const fur = new Color(G.fur);
    const muz = new Color(G.muzzle);
    const blush = new Color(G.pink);
    const edge = new Color(G.fur).multiply(new Color(0.6, 0.5, 0.58));
    // (the lifted facets take more of the sky's light: taken back here)
    const SKY = [0.93, 0.905, 0.925];
    const c = new Color();
    for (let i = 0; i < fp.count; i++) {
      const x = fp.getX(i);
      const y = fp.getY(i);
      const front = skullZ(x, y);
      const m = smooth01(3 * (1 - (x / 0.082) ** 2 - ((y + 0.135) / 0.058) ** 2)) * smooth01(front / RZ / 0.2);
      const b = 0.05 * Math.exp(-(((Math.abs(x) - 0.105) / 0.036) ** 2 + ((y + 0.095) / 0.032) ** 2)) * smooth01(front / RZ / 0.3);
      const e = smooth01(1 - openDist(Math.abs(x), y + HEAD_C) / 0.025);
      c.copy(fur).lerp(edge, e).lerp(muz, m).lerp(blush, b);
      col.setXYZ(i, col.getX(i) * (c.r / fur.r) * SKY[0], col.getY(i) * (c.g / fur.g) * SKY[1], col.getZ(i) * (c.b / fur.b) * SKY[2]);
    }
    return f;
  });
  head.add(fpart(skullGeo, furMat));
  // the nose: a small pink rounded triangle on the snout's tip
  const NOSE_Y = -0.105;
  const noseW = (y) => (1 + 0.75 * Math.min(0, y)) * (1 + 0.3 * Math.max(0, y));
  const noseGeo = sharedGeo('facet:healer-nose', () => {
    const g = new SphereGeometry(1, 8, 6);
    const pos = g.attributes.position;
    // (a flat wide top, drawn quickly to a point below)
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setX(i, pos.getX(i) * noseW(y));
      if (y > 0) pos.setY(i, y * 0.75);
    }
    return leanNormals(fz(g, 0.02, 123), FRONT_Z, 0.7);
  });
  const nose = new Mesh(noseGeo, noseMat);
  nose.scale.set(0.0185, 0.012, 0.011);
  nose.position.set(0, NOSE_Y, surfZ(0, NOSE_Y) - 0.004);
  nose.rotation.x = -0.35;
  head.add(nose);
  // the mouth: a little "w" under the nose, on the snout
  // (and the nose's ink outline: a rounded triangle on the snout under it)
  const mouthGeo = sharedGeo('healer-mouth', () => {
    const w = [[-0.033, -0.139], [-0.0205, -0.1445], [-0.0085, -0.1435], [0, -0.1375], [0.0085, -0.1435], [0.0205, -0.1445], [0.033, -0.139]].map(([x, y]) => new Vector3(x, y, surfZ(x, y) + 0.0022));
    const lip = new TubeGeometry(new CatmullRomCurve3(w), 9, 0.0016, 4);
    const philtrum = new TubeGeometry(new CatmullRomCurve3([new Vector3(0, -0.116, surfZ(0, -0.116) + 0.0022), new Vector3(0, -0.1375, surfZ(0, -0.1375) + 0.0022)]), 2, 0.0008, 4);
    const rim = new CircleGeometry(1, 14);
    const rp = rim.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const y = rp.getY(i);
      const x = rp.getX(i) * 0.0215 * noseW(y);
      const yy = NOSE_Y + 0.001 + y * 0.0145 * (y > 0 ? 0.75 : 1);
      rp.setXYZ(i, x, yy, surfZ(x, yy) + 0.001);
    }
    return mergeGeometries([lip, philtrum, rim].map((g) => (g.deleteAttribute('uv'), g.index ? g.toNonIndexed() : g)), false);
  });
  const mouth = new Mesh(mouthGeo, new MeshBasicMaterial({ color: exactColor(G.mouth) }));
  mouth.name = 'mouth';
  head.add(mouth);
  // The painted face: big dark eyes with a warm brown under-iris and one
  // glint, and the little oval brows above them, where the sheet puts them
  // (the patch's canvas: u across 2.1 rad of the skull, v down 1.15 rad from
  // 0.95 rad below its crown), laid over the snout as the skull is.
  const face = faceDecal({
    R: HEAD_R,
    sx: SX,
    sy: SY,
    sz: SZ,
    eyeW: 0,
    eyeH: 0,
    glint: 0,
    segments: [16, 10],
    paint: (ctx, S) => {
      const ell = (cx, cy, rx, ry, fill, rot = 0) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.ellipse(cx * S, cy * S, rx * S, ry * S, rot, 0, Math.PI * 2);
        ctx.fill();
      };
      const ink = exactHex(PALETTE.voidCharcoal);
      for (const side of [-1, 1]) {
        // brows: a pale oval with a fine dark edge
        const bx = 0.5 + side * 0.201;
        ell(bx, 0.433, 0.082, 0.088, exactHex(G.mouth), side * -0.12);
        ell(bx, 0.433, 0.068, 0.064, exactHex(G.brow), side * -0.12);
        // eyes: upright dark ovals (their tops leaning out a hair), a warm
        // brown lens of iris low in the middle, and one glint
        const ex = 0.5 + side * 0.2425;
        const ey = 0.803;
        const rx = 0.086;
        const ry = 0.175;
        ctx.save();
        ctx.translate(ex * S, ey * S);
        ctx.rotate(side * 0.05);
        ctx.translate(-ex * S, -ey * S);
        ell(ex, ey, rx * 1.06, ry * 1.04, ink);
        ell(ex, ey, rx, ry, exactHex(G.eye));
        ctx.beginPath();
        ctx.ellipse(ex * S, ey * S, rx * S, ry * S, 0, 0, Math.PI * 2);
        ctx.clip();
        ell(ex, ey + ry * 0.5, rx * 0.62, ry * 0.42, exactHex(G.iris));
        ell(ex, ey - ry * 0.04, rx * 0.9, ry * 0.6, exactHex(G.eye));
        ctx.restore();
        ell(ex - rx * 0.3, ey - ry * 0.36, rx * 0.25, ry * 0.21, G.glint);
      }
    },
  });
  {
    const pos = face.geometry.attributes.position;
    const RD = HEAD_R * 1.012; // the patch's ball
    for (let i = 0; i < pos.count; i++) {
      const v = pos.getY(i) / RD;
      const ly = RD * vMap(v);
      const px = pos.getX(i) * ringX(v);
      const x = px * SX;
      const y = ly * SY;
      const z = pos.getZ(i) * ringZ(v) * SZ;
      pos.setX(i, px);
      pos.setY(i, ly);
      pos.setZ(i, (z + faceBump(x, y, z)) / SZ);
    }
    face.geometry.computeBoundingSphere();
  }
  face.position.z = HEAD_Z;
  head.add(face);
  // The hood: a sand shell over the crown, cut open round the face in the
  // sheet's outline, lined in rust; its foot hands on to the cowl.
  const HOOD_Y = HOOD_RINGS.map(([y]) => y);
  const hoodRing = (k, a, lift, out) => hoodAt(a, HOOD_Y[k], lift, out).setY(HOOD_Y[k] - HEAD_C);
  const hoodRef = (c, o) => o.set(0, Math.min(c.y, 0), hoodZ(c.y + HEAD_C));
  const hoodGeo = sharedGeo('facet:healer-hood', () => smoothLean(fz(faceAway(clothSheet(HOOD_Y.length - 1, 24, (k) => openA(HOOD_Y[k]), (k) => Math.PI * 2 - openA(HOOD_Y[k]), (k, a, out) => hoodRing(k, a, 0, out)), hoodRef), 0.022, 116), 0.9));
  head.add(fpart(hoodGeo, hoodMat));
  // the lining, where it shows: round the face's sides, from the brow down,
  // in the hood's shadow (the sheet draws only a dark line inside the rim)
  const LINED = HOOD_Y.findIndex((y) => y <= OPENING[0][0]);
  const hoodLiningGeo = sharedGeo('facet:healer-hood-lining', () => tint(fz(merge([1, -1].map((side) => faceAway(clothSheet(HOOD_Y.length - 1 - LINED, 5, (k) => side * openA(HOOD_Y[k + LINED]), (k) => side * (openA(HOOD_Y[k + LINED]) + 2.1), (k, a, out) => hoodRing(k + LINED, a, -0.004, out)), (c, o) => o.set(c.x * 3, c.y, hoodZ(c.y + HEAD_C) + (c.z - hoodZ(c.y + HEAD_C)) * 3)))), 0.05, 118), mix(G.lining, PALETTE.voidCharcoal, 0.4).getHex(), G.lining));
  head.add(new Mesh(hoodLiningGeo, liningMat));
  // its rim's run round the face, over the brow and down to the chin
  const rimHeadGeo = sharedGeo('facet:healer-hood-rim', () => {
    const top = rimRight.filter(([, y]) => y >= 0.745);
    return inkRimEdge(rimUp(fz(rimBand([...top.slice(1).reverse().map(([x, y]) => [-x, y]), ...top], true), 0.05, 117)));
  });
  head.add(fpart(rimHeadGeo, trimMat));
  // Big round mouse ears, cupped, with pink insides, splayed out through the
  // hood. (each ear: the disc, and the little lobe of its foot showing below
  // the fold, against the hood, on its inner side)
  const cupZ = (x, y) => -EAR.cup * Math.max(0, 1 - (x / EAR.rx) ** 2 - (y / EAR.ry) ** 2);
  const cupped = (g, z0) => {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + z0 + cupZ(pos.getX(i), pos.getY(i)));
    return g;
  };
  const LOBE = [-0.067, -0.058];
  // (each face of an ear leaned up and out of its own side, all of it one
  // way: turned out as they are, both ears then sit in the lit step from the
  // front, the side and behind, as the sheet's two ears are one tone; its
  // fur ring a cooler grey than her face)
  const earUp = (n) => leanT.set(0, 0.7, n.z >= 0 ? 0.71 : -0.71);
  const EAR_RING = [0.85, 0.88, 0.98];
  const earGeo = (side) => sharedGeo(`facet:healer-ear:${side}`, () => {
    const disc = leanNormals(fz(cupped(new SphereGeometry(1, 24, 4).rotateX(Math.PI / 2).scale(EAR.rx, EAR.ry, 0.02), 0), 0.03, 117), earUp, 1);
    const dc = disc.attributes.color;
    for (let v = 0; v < dc.count; v++) dc.setXYZ(v, dc.getX(v) * EAR_RING[0], dc.getY(v) * EAR_RING[1], dc.getZ(v) * EAR_RING[2]);
    // the lobe: a little teardrop, round above and drawn to a point below
    const lobe = new SphereGeometry(1, 10, 4);
    const lp = lobe.attributes.position;
    for (let i = 0; i < lp.count; i++) lp.setX(i, lp.getX(i) * (1 + 0.45 * Math.min(0, lp.getY(i))));
    return merge([
      disc,
      leanNormals(piece(fz(lobe, 0.04, 118), { at: [side * LOBE[0], LOBE[1], 0.016], rot: [0, 0, side * 0.35], scale: [0.028, 0.033, 0.012] }), earUp, 0.9),
    ]);
  });
  // the pink inside: paler low on its outer side, and folded over down its
  // inner side (toward the head) in a darker rose band edged with the
  // sheet's dark line, from its top down to the lobe
  const PINK = { x: 0.0255, y: -0.001, rx: EAR.rx * 0.66, ry: EAR.ry * 0.79 };
  const pinkZ = (x, y, rho) => 0.0135 + 0.008 * Math.sqrt(Math.max(0, 1 - rho * rho)) + cupZ(x, y);
  const pinkLit = new Color(G.pink);
  const pinkPale = new Color(mix(G.pink, PALETTE.parchment, 0.22).getHex());
  // (the ears' pink a touch lighter and peachier than the tail's: #E2B9A1)
  const PINK_LIFT = [0.82, 0.76, 0.7];
  const foldGeo = (side) => {
    const F = [0.8, 0.95, 1.0];
    const T0 = -0.75;
    const T1 = 1.5;
    const N = 8;
    const pos = [];
    const at = (k, j) => {
      const t = T0 + ((T1 - T0) * j) / N;
      const taper = Math.pow(Math.sin((Math.PI * j) / N), 0.6);
      const f = 1 - (1 - F[k]) * taper;
      const x = side * PINK.x - side * PINK.rx * f * Math.cos(t);
      const y = PINK.y + PINK.ry * f * Math.sin(t);
      return [x, y, pinkZ(x, y, f) + 0.0016];
    };
    for (let k = 0; k < 2; k++) {
      for (let j = 0; j < N; j++) {
        const q = [at(k, j), at(k, j + 1), at(k + 1, j), at(k + 1, j + 1)];
        const tri = side > 0 ? [q[0], q[1], q[2], q[1], q[3], q[2]] : [q[0], q[2], q[1], q[1], q[2], q[3]];
        for (const p of tri) pos.push(...p);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    const f = fz(g, 0.02, 120);
    const col = f.attributes.color;
    const rose = [0.62 * PINK_LIFT[0], 0.5 * PINK_LIFT[1], 0.58 * PINK_LIFT[2]];
    const line = [0.1, 0.06, 0.05];
    for (let v = 0; v < col.count; v++) {
      const k = v < N * 6 ? rose : line;
      col.setXYZ(v, col.getX(v) * k[0], col.getY(v) * k[1], col.getZ(v) * k[2]);
    }
    return f;
  };
  const innerGeo = (side) => sharedGeo(`facet:healer-ear-inner:${side}`, () => {
    const g = fz(cupped(new SphereGeometry(1, 20, 4).rotateX(Math.PI / 2).scale(PINK.rx, PINK.ry, 0.008).translate(side * PINK.x, PINK.y, 0), 0.0135), 0.025, 119);
    // (paler toward its lower outer side, per vertex so it blends)
    const pos = g.attributes.position;
    const col = g.attributes.color;
    for (let v = 0; v < pos.count; v++) {
      const u = (side * (pos.getX(v) - side * PINK.x)) / PINK.rx;
      const w = (pos.getY(v) - PINK.y) / PINK.ry;
      const k = 0.5 * smooth01((0.55 * u - 0.85 * w - 0.15) / 0.9);
      col.setXYZ(v, col.getX(v) * PINK_LIFT[0] * (1 + k * (pinkPale.r / pinkLit.r - 1)), col.getY(v) * PINK_LIFT[1] * (1 + k * (pinkPale.g / pinkLit.g - 1)), col.getZ(v) * PINK_LIFT[2] * (1 + k * (pinkPale.b / pinkLit.b - 1)));
    }
    return leanNormals(merge([g, foldGeo(side)]), earUp, 1);
  });
  const ears = [];
  for (const side of EAR_SIDES) {
    const pivot = new Group();
    pivot.position.set(side * 0.2, 0.039, -0.053);
    pivot.rotation.z = side * -EAR_SPLAY;
    const disc = new Group();
    disc.position.y = 0.08;
    disc.rotation.y = side * EAR_YAW;
    disc.add(fpart(earGeo(side), furMat));
    disc.add(new Mesh(innerGeo(side), pinkMat));
    pivot.add(disc);
    head.add(pivot);
    ears.push(pivot);
  }

  // --- A long pink tail out from under the robe's back: it hangs down
  // between the robe and the cloak, sweeps back along the floor and curls up
  // at her free side, ringed every few steps.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.36, -0.13);
  const TAIL = new CatmullRomCurve3([
    [0, 0, 0], [0, -0.06, -0.04], [-0.01, -0.12, -0.07], [-0.03, -0.19, -0.115], [-0.07, -0.245, -0.15], [-0.13, -0.28, -0.21], [-0.2, -0.283, -0.27], [-0.27, -0.26, -0.315], [-0.305, -0.22, -0.335], [-0.315, -0.18, -0.335],
  ].map(([x, y, z]) => new Vector3(x, y, z)));
  const TAIL_R0 = 0.024;
  const TAIL_R1 = 0.004;
  // (full along the body, tapering in the curl to a closed point)
  const tailEase = (t) => t ** 1.6;
  const tailGeo = sharedGeo('facet:healer-tail', () => smoothLean(merge([
    fz(taperTube(TAIL, 16, 6, TAIL_R0, TAIL_R1, tailEase), 0.06, 125),
    piece(fz(new SphereGeometry(1, 6, 4), 0.06, 127), { at: TAIL.getPointAt(1).toArray(), scale: [0.0045, 0.0045, 0.0045] }),
  ]), 0.5));
  tailPivot.add(fpart(tailGeo, tailMat));
  const ringGeo = sharedGeo('facet:healer-tail-ring', () => fz(new TorusGeometry(1, 0.18, 3, 6), 0.05, 126));
  const RINGS = 6;
  const rq = { p: new Vector3(), t: new Vector3(), q: new Quaternion(), s: new Vector3(), z: new Vector3(0, 0, 1) };
  tailPivot.add(placeRow(ringGeo, ringMat, RINGS, (i, m) => {
    const u = 0.08 + (0.87 * i) / (RINGS - 1);
    TAIL.getPointAt(u, rq.p);
    TAIL.getTangentAt(u, rq.t);
    rq.q.setFromUnitVectors(rq.z, rq.t);
    const r = TAIL_R0 + (TAIL_R1 - TAIL_R0) * tailEase(u);
    m.compose(rq.p, rq.q, rq.s.set(r, r, r));
  }, { name: 'healer-tail-rings', seed: 126 }));
  body.add(tailPivot);

  // --- The staff (butt at its origin): a gnarled branch, thin at the butt
  // and swelling upward into a club, two knots and bark scales up its
  // length; its head forks round the crystal's foot, a short lobe on the
  // outside and a taller stub on the inside hooked in toward her (the
  // sheet's: no prongs, no side twig).
  const staff = new Group();
  staff.rotation.order = 'XYZ';
  body.add(staff);
  const SHAFT_TOP = 0.8;
  const SHAFT_EASE = (t) => t ** 2.2;
  const shaftR = (y) => 0.012 + 0.015 * SHAFT_EASE(Math.max(0, Math.min(1, y / SHAFT_TOP)));
  const shaftGeo = sharedGeo('facet:healer-twig', () => {
    const v3 = (pts) => new CatmullRomCurve3(pts.map(([x, y, z]) => new Vector3(x, y, z)));
    const shaft = taperTube(v3([[0, 0, 0], [0.006, 0.16, -0.003], [-0.005, 0.34, 0.004], [0.006, 0.52, -0.003], [-0.003, 0.68, 0.002], [0.002, SHAFT_TOP, 0]]), 12, 6, 0.012, 0.027, SHAFT_EASE);
    const stub = taperTube(v3([[-0.006, 0.78, -0.006], [-0.022, 0.815, -0.01], [-0.04, 0.85, -0.014], [-0.05, 0.872, -0.016]]), 4, 6, 0.022, 0.018);
    const lobe = taperTube(v3([[0.008, 0.775, -0.004], [0.028, 0.795, -0.004], [0.044, 0.82, -0.002], [0.05, 0.845, 0]]), 3, 6, 0.016, 0.012);
    const ico = (seed) => fz(new IcosahedronGeometry(1, 0), 0.1, seed);
    return merge([
      fz(shaft, 0.1, 127),
      // the club's swell under the fork
      piece(fz(new IcosahedronGeometry(1, 0), 0.08, 128), { at: [0.002, 0.792, -0.004], rot: [0.2, 0.4, 0.1], scale: [0.04, 0.045, 0.036] }),
      fz(stub, 0.08, 132),
      piece(ico(133), { at: [-0.05, 0.872, -0.016], scale: [0.019, 0.019, 0.019] }),
      fz(lobe, 0.08, 134),
      piece(ico(135), { at: [0.05, 0.845, 0], scale: [0.016, 0.016, 0.016] }),
    ]);
  });
  staff.add(fpart(shaftGeo, woodMat));
  // the knots up the branch (one instanced part; the sheet's staff is
  // smooth between them, with no bark scales)
  const knotBumpGeo = sharedGeo('facet:healer-staff-knot', () => fz(new IcosahedronGeometry(1, 0), 0.1, 129));
  const KNOTS = [[0.003, 0.2, 0.002, 0.3, 2.1, 0.015, 0.021, 0.014], [0.003, 0.33, 0.002, 0.5, 0.5, 0.018, 0.026, 0.017], [-0.003, 0.585, 0, 1.2, -0.2, 0.022, 0.03, 0.021]];
  const kq = { p: new Vector3(), q: new Quaternion(), e: new Euler(), s: new Vector3() };
  staff.add(placeRow(knotBumpGeo, woodMat, KNOTS.length, (i, m) => {
    const [x, y, z, ry, rz, sx, sy, sz] = KNOTS[i];
    m.compose(kq.p.set(x, y, z), kq.q.setFromEuler(kq.e.set(0.2, ry, rz)), kq.s.set(sx, sy, sz));
  }, { name: 'healer-staff-knots', seed: 129 }));

  // --- THE GEM: healer.js's colour (round-3 F6 and the round-4 ACES hue
  // compensation): unlit, the whole gem family authored up-hue by
  // the measured skew, a two-layer additive halo carrying the cast. It is
  // the only Bright Heal on her: it is her healing source.
  const gemHSL = { h: 0, s: 0, l: 0 };
  new Color(PALETTE.brightHeal).getHSL(gemHSL, SRGBColorSpace);
  const gemAuthored = new Color().setHSL(gemHSL.h + 18 / 360, gemHSL.s, gemHSL.l, SRGBColorSpace).getHex();
  const gemMat = new MeshBasicMaterial({ color: exactColorNearest(gemAuthored), vertexColors: true });
  // The crystal: a long six-sided point (the sheet's), set in the fork a
  // little out and forward of the shaft and inked like every other part;
  // unlit, so its facets' steps are painted on (lighter round the top
  // point), and as it turns they twinkle.
  const GEM_AT = new Vector3(0.004, GEM_Y + 0.005, 0.002);
  const gemGeo = sharedGeo('healer-crystal', () => {
    const g = new LatheGeometry([[0, -0.088], [0.03, -0.04], [0.03, 0.035], [0, 0.085]].map(([x, y]) => new Vector2(x, y)), 6).toNonIndexed();
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const STEP = [1.38, 1.17, 1.01, 1.09, 1.25, 1.43];
    const base = exactColorNearest(gemAuthored);
    const GEM_TOP = [base.r, base.g, base.b].map((b) => (b + (1 - b) * 0.45) / Math.max(1e-3, b));
    for (let i = 0; i < pos.count; i += 3) {
      const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const side = Math.floor(((Math.atan2(x, z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 3)) % 6;
      const v = STEP[side] + (y < -0.04 ? -0.06 : 0);
      // (its top point paler: toward white, which the tone curve keeps)
      const w = y > 0.035 ? GEM_TOP : [1, 1, 1];
      for (let j = 0; j < 3; j++) col.set([v * w[0], v * w[1], v * w[2]], (i + j) * 3);
    }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    return g;
  });
  const gem = new Mesh(gemGeo, gemMat);
  gem.name = 'tip';
  gem.position.copy(GEM_AT);
  gem.renderOrder = 2;
  addInk(gem);
  staff.add(gem);
  const GLOW_BASE = 0.26;
  const glow = makeGlowSprite({ color: exactColorNearest(gemAuthored).multiplyScalar(3.1), size: GLOW_BASE, opacity: 0.6 });
  glow.position.copy(GEM_AT);
  staff.add(glow);
  const flare = makeGlowSprite({
    color: exactColorNearest(gemAuthored).lerp(exactColor(PALETTE.parchment), 0.12).multiplyScalar(1.9),
    size: GLOW_BASE * 0.32,
    opacity: 0.5,
  });
  flare.position.copy(GEM_AT);
  staff.add(flare);
  const gemBase = exactColorNearest(gemAuthored);
  const gemDown = exactColor(mix(PALETTE.warmGrey, PALETTE.voidCharcoal, 0.45).getHex());

  // --- Sleeves and paws. Her arms are wide linen sleeves with deep rust
  // cuffs (a dark hollow inside each); the paws are pink with four fingers
  // and a thumb: the grip paw's fingers close round the staff, the free paw
  // hangs open. The grip paw rides the staff where it holds it; the free
  // paw is placed by the pose, within an arm's reach.
  const ARM_LEN = 0.3; // a sleeve's length at rest (aimLimb stretches it to the paw)
  // Each sleeve is a bell hung under its arm: its line runs `droop` below the
  // arm's (toward its own -Z, the side `hang` keeps toward the floor), so
  // the wrist comes out of the top of its mouth, as the sheet's does. The
  // staff arm's is the deeper (the sheet's reaches from her shoulder line
  // down to her waist); the cuff's lip turns in round the wrist, and the
  // sleeve's inside shows in the mouth as the sheet's dark rust.
  const SLEEVE = {
    R: { sleeve: [[0.062, -0.02], [0.064, 0.05], [0.07, 0.11], [0.076, 0.17], [0.081, 0.215], [0.083, 0.232]], cuff: [[0.079, 0.208], [0.0865, 0.218], [0.0885, 0.243], [0.085, 0.256], [0.07, 0.263]], droop: 0.028, hollow: 0.076 },
    L: { sleeve: [[0.049, -0.02], [0.051, 0.05], [0.055, 0.11], [0.061, 0.17], [0.067, 0.215], [0.07, 0.232]], cuff: [[0.066, 0.208], [0.0735, 0.218], [0.0755, 0.243], [0.072, 0.256], [0.059, 0.263]], droop: 0.012, hollow: 0.063 },
  };
  const INSIDE = [0.55, 0.43, 0.53]; // the sleeve's inside, as a share of the cuff's rust
  function sleeveArm(key, baseLen) {
    const S = SLEEVE[key];
    const sleeveGeo = sharedGeo(`facet:healer-sleeve:${key}`, () => fz(lathe(S.sleeve, 10).translate(0, 0, -S.droop), 0.05, 161));
    const cuffGeo = sharedGeo(`facet:healer-cuff:${key}`, () => {
      const inside = fz(new CircleGeometry(S.hollow, 10).rotateX(-Math.PI / 2).translate(0, 0.205, -S.droop), 0.04, 163);
      const ic = inside.attributes.color;
      for (let v = 0; v < ic.count; v++) ic.setXYZ(v, ic.getX(v) * INSIDE[0], ic.getY(v) * INSIDE[1], ic.getZ(v) * INSIDE[2]);
      return merge([fz(lathe(S.cuff, 10).translate(0, 0, -S.droop), 0.05, 162), inside]);
    });
    const pivot = new Group();
    pivot.add(fpart(sleeveGeo, sleeveMat));
    pivot.add(fpart(cuffGeo, cuffMat));
    pivot.userData.baseLen = baseLen;
    return pivot;
  }
  // the grip arm's sleeve stops short of the paw (the sheet's big paw shows
  // clear of the cuff), a taupe wrist running on out of the cuff to it
  const armR = sleeveArm('R', 0.295);
  armR.position.copy(SHOULDER_R);
  const pawBack = mix(G.fur, G.leg, 0.3).getHex(); // the backs of her paws and her wrists: furred taupe
  const wristGeo = sharedGeo('facet:healer-wrist', () => tint(piece(fz(new CapsuleGeometry(1, 1, 2, 6), 0.05, 177), { at: [0, 0.285, 0], scale: [0.022, 0.03, 0.022] }), pawBack, G.paw));
  armR.add(fpart(wristGeo, pawMat));
  body.add(armR);
  const armL = sleeveArm('L', ARM_LEN);
  armL.position.copy(SHOULDER_L);
  body.add(armL);
  // A sleeve rolled about its own line so that its low side (-Z) hangs
  // toward the floor, whichever way the arm points (straight up or down it
  // has no low side: left as aimed).
  const hangX = new Vector3();
  const hangZ = new Vector3();
  const qRoll = new Quaternion();
  function hang(pivot) {
    hangX.set(1, 0, 0).applyQuaternion(pivot.quaternion);
    hangZ.set(0, 0, 1).applyQuaternion(pivot.quaternion);
    if (Math.hypot(hangX.y, hangZ.y) < 0.05) return;
    pivot.quaternion.multiply(qRoll.setFromAxisAngle(UP_Y, Math.atan2(hangX.y, hangZ.y)));
  }
  // The grip paw (staff space, centred on the shaft): the palm on the side
  // her arm comes from, four fingers wrapped round the front and the far
  // side, the thumb over the top.
  const gripGeo = sharedGeo('facet:healer-grip', () => {
    const parts = [tint(piece(fz(new SphereGeometry(1, 7, 5), 0.06, 164), { at: [-0.006, 0.002, -0.03], scale: [0.024, 0.036, 0.022] }), pawBack, G.paw)];
    for (let i = 0; i < 4; i++) {
      const y = 0.0225 - i * 0.015;
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const psi = (-0.5 + (1.3 * k) / 8) * Math.PI; // from behind her palm, round the outside, across the front to her side
        const r = 0.022 * (1 - 0.02 * k);
        pts.push(new Vector3(Math.cos(psi) * r, y - 0.001 * k, Math.sin(psi) * r));
      }
      parts.push(fz(taperTube(new CatmullRomCurve3(pts), 6, 4, 0.0078, 0.0066), 0.05, 165 + i));
    }
    // the thumb, upright on her side of the staff
    parts.push(fz(taperTube(new CatmullRomCurve3([new Vector3(-0.024, 0.008, -0.012), new Vector3(-0.022, 0.03, 0.004), new Vector3(-0.012, 0.038, 0.016)]), 3, 4, 0.0085, 0.0068), 0.05, 169));
    return merge(parts);
  });
  const gripPaw = fpart(gripGeo, pawMat);
  gripPaw.position.set(0, GRIP_ALONG, 0);
  gripPaw.scale.setScalar(1.3); // the sheet's paw is big, a fist round the staff
  staff.add(gripPaw);
  // The free paw (its +Y down the arm, +Z its palm, +X its thumb's side): a
  // furred wrist out of the cuff and the back of the paw, graded into the
  // pink of four plump fingers held together, and a thumb apart from them.
  const freeGeo = sharedGeo('facet:healer-paw', () => {
    const palm = piece(fz(new SphereGeometry(1, 7, 5), 0.06, 171), { at: [0.002, 0.004, 0], scale: [0.031, 0.03, 0.019] });
    const pc = palm.attributes.color;
    const pp = palm.attributes.position;
    const back = new Color(pawBack);
    const pink = new Color(G.paw);
    for (let v = 0; v < pc.count; v++) {
      const k = 1 - smooth01((pp.getY(v) + 0.008) / 0.03);
      pc.setXYZ(v, pc.getX(v) * (1 + k * (back.r / pink.r - 1)), pc.getY(v) * (1 + k * (back.g / pink.g - 1)), pc.getZ(v) * (1 + k * (back.b / pink.b - 1)));
    }
    const parts = [tint(piece(fz(new CapsuleGeometry(1, 1, 1, 6), 0.05, 170), { at: [0, -0.032, 0], scale: [0.019, 0.022, 0.017] }), pawBack, G.paw), palm];
    for (let i = 0; i < 4; i++) {
      const x = -0.021 + i * 0.0115;
      const mid = x + 0.004;
      parts.push(piece(fz(new SphereGeometry(1, 5, 3), 0.06, 172 + i), { at: [x, 0.05 - Math.abs(mid) * 0.35, 0.004], rot: [0.25, 0, -mid * 4], scale: [0.0088, 0.04 - Math.abs(i - 1.5) * 0.004, 0.0085] }));
    }
    parts.push(piece(fz(new SphereGeometry(1, 5, 3), 0.06, 176), { at: [0.034, 0.02, 0.006], rot: [0.2, 0, -0.35], scale: [0.0105, 0.03, 0.0095] }));
    return merge(parts);
  });
  const freePaw = fpart(freeGeo, pawMat);
  freePaw.position.set(REST.fx, REST.fy, REST.fz);
  body.add(freePaw);
  // The named points (B8): the grip paw and the gem.
  const hand = namedPoint(gripPaw, 'hand', 0, 0, 0);

  // --- Feet: grey-taupe legs under the hem, the ankles and feet bound in
  // pale linen wraps (the wraps' crossings raised), and three pink toes out
  // of the front of each. The origin sits FOOT_UP over the sole, as every
  // hero's does (createFootLock pins a planted foot's y to its home).
  // Children of the rig, so a lean never lifts them; the foot lock pins
  // them in the world.
  const FOOT_UP = 0.04;
  const HOME = [new Vector3(-0.095, FOOT_UP, -0.01), new Vector3(0.095, FOOT_UP, -0.01)];
  const FOOT_OUT = 0.2; // each foot turned out a little, toes apart
  // the ankle wrap's rows [radius, y, tilt]: two thin rows tilted opposite
  // ways are the sheet's crossing bandage lines (painted, flush); its top
  // rows sit in the robe's shade. The ankle is deeper front to back than wide.
  const WRAP = [[0.047, 0.024, 0], [0.046, 0.05, 0.009], [0.0458, 0.0545, 0.009], [0.04, 0.08, -0.008], [0.0398, 0.0845, -0.008], [0.038, 0.098, 0], [0.034, 0.105, 0]];
  const WRAP_LINES = [1, 3];
  const WRAP_SHADE = [0, 0, 0, 0, 0.5, 1];
  const footGeo = sharedGeo('facet:healer-foot', () => {
    const wrap = lathe(WRAP.map(([r, y]) => [r, y]), 8);
    const wp = wrap.attributes.position;
    for (let k = 0; k < wp.count; k++) {
      const row = WRAP[k % WRAP.length];
      const phi = (Math.floor(k / WRAP.length) / 8) * Math.PI * 2;
      wp.setY(k, wp.getY(k) + row[2] * Math.cos(phi));
    }
    wrap.scale(1, 1, 1.18).translate(0, 0, 0.004);
    const wrapF = fz(wrap, 0.05, 181);
    const base = new Color(G.wrap);
    const lineK = new Color(G.wrapBand);
    const shadeK = new Color(G.wrapShade);
    const col = wrapF.attributes.color;
    for (let v = 0; v < col.count; v++) {
      const strip = Math.floor(v / 6) % (WRAP.length - 1);
      const k = WRAP_LINES.includes(strip) ? lineK : WRAP_SHADE[strip] ? shadeK.clone().lerp(base, 1 - WRAP_SHADE[strip]) : null;
      if (k) col.setXYZ(v, (col.getX(v) * k.r) / base.r, (col.getY(v) * k.g) / base.g, (col.getZ(v) * k.b) / base.b);
    }
    const parts = [
      tint(fz(lathe([[0.042, 0.1], [0.045, 0.13], [0.042, 0.168]], 7).scale(1, 1, 1.12).translate(0, 0, 0.003), 0.05, 180), G.leg, G.wrap),
      smoothLean(wrapF, 0.5),
      smoothLean(piece(fz(new SphereGeometry(1, 8, 5), 0.06, 182), { at: [0, 0.036, 0.03], scale: [0.05, 0.038, 0.072] }), 0.5),
    ];
    // the bare toes: three overlapping into one rounded cap at the front,
    // notched where they meet
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.02;
      const k = i === 1 ? 1 : 0.92;
      parts.push(smoothLean(tint(piece(fz(new SphereGeometry(1, 5, 3), 0.05, 185 + i), { at: [x, 0.024 * k, 0.1 - Math.abs(x) * 0.3], rot: [0.25, x * 3, 0], scale: [0.0185 * k, 0.024 * k, 0.036 * k] }), G.tail, G.wrap), 0.6));
    }
    return merge(parts).translate(0, -FOOT_UP, 0);
  });
  const feet = [];
  for (let i = 0; i < 2; i++) {
    const foot = fpart(footGeo, footMat);
    foot.position.copy(HOME[i]);
    foot.rotation.y = (i === 0 ? -1 : 1) * FOOT_OUT;
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
  const pawX = new Vector3();
  const pawY = new Vector3();
  const pawZ = new Vector3();
  const pawM = new Matrix4();
  const DOWN_Y = new Vector3(0, -1, 0);
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
  // How far a body-space point of radius `pad` sits inside her: the robe,
  // the cowl and the capelet over its shoulders, the cloak behind, and the
  // hood; `out` gets the way out.
  const hd = new Vector3();
  const HOOD_AT = new Vector3(0, 0.875, hoodZ(0.875));
  const HOOD_OUT = 0.212;
  const HOOD_SQ = 1.3; // the hood is lower than it is wide: its crown at 1.04
  function bodyR(p) {
    const y = p.y;
    let r = 0;
    if (y > 0.02 && y < 0.74) r = robeR(Math.max(HEM_Y, y)) * 1.04 + 0.006;
    if (y > COWL_RINGS[COWL_RINGS.length - 1][0] && y < 0.745) r = Math.max(r, hoodW(y) + 0.012);
    if (y > 0.48 && y < CAPE_TOP.y + 0.01) {
      const t = Math.min(1, Math.max(0, (CAPE_TOP.y - y) / (CAPE_TOP.y - CAPE_FOOT)));
      r = Math.max(r, capeR(t) + 0.014);
    }
    if (p.z < 0 && y > CLOAK.foot && y < CLOAK.top) r = Math.max(r, cloakR((CLOAK.top - y) / (CLOAK.top - CLOAK.foot), p) + 0.01);
    return r;
  }
  // how far out the cloak's outline runs toward p (in the floor plane), t of
  // the way down: found along the cloak's own curve (cloakAt), from its
  // middle out to its edge on p's side; 0 past its edges
  const cloakP = new Vector3();
  function cloakR(t, p) {
    const want = Math.abs(Math.atan2(p.x, p.z)); // pi straight behind her
    const span = cloakSpan(t);
    cloakAt(t, Math.PI - span, 0, cloakP);
    if (Math.abs(Math.atan2(cloakP.x, cloakP.z)) > want) return 0;
    let lo = Math.PI - span;
    let hi = Math.PI;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      cloakAt(t, mid, 0, cloakP);
      if (Math.abs(Math.atan2(cloakP.x, cloakP.z)) < want) lo = mid;
      else hi = mid;
    }
    cloakAt(t, (lo + hi) / 2, 0, cloakP);
    return Math.hypot(cloakP.x, cloakP.z);
  }
  function inside(p, pad, out) {
    let deep = 0;
    const r = bodyR(p);
    if (r > 0) {
      const d = Math.hypot(p.x, p.z);
      const need = r + pad;
      if (need - d > deep) {
        deep = need - d;
        if (d > 1e-4) out.set(p.x / d, 0, p.z / d);
        else out.set(1, 0, 0);
      }
    }
    hd.subVectors(p, HOOD_AT);
    hd.y *= HOOD_SQ;
    const dh = hd.length();
    const needH = HOOD_OUT + pad;
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

    // COMMON-MODE ear sway (healer.js) over the sheet's outward splay; down,
    // the ears droop further out.
    for (let i = 0; i < 2; i++) ears[i].rotation.z = -EAR_SIDES[i] * (EAR_SPLAY + P.collapse * 0.5) + 0.7 * P.ear;
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
      // healer.js cants it by Euler (x -0.2 lift, z 0.12 prop): as a tilt,
      // on top of the stance's own lean out and forward
      const rx = -0.2 * lift;
      const rz = 0.12 * P.prop;
      const se = Math.sin(REST.el);
      const dx = se * Math.sin(REST.az) - Math.sin(rz);
      const dz = se * Math.cos(REST.az) + Math.cos(rz) * Math.sin(rx);
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
    hang(armR);
    // The free paw: its own spot in the pose (the counterbalance), within
    // reach and clear of the bell. (The staff rides the staff side, out of
    // a stubby off arm's reach, so she wields it one-handed.)
    fp.set(S.fx, S.fy, S.fz);
    withinReach(fp, SHOULDER_L);
    const deep = inside(fp, 0.05, way);
    if (deep > 0) fp.addScaledVector(way, deep);
    freePaw.position.copy(fp);
    aimLimb(armL, freePaw.position);
    hang(armL);
    // it hangs: its +Y half way from the arm's line to straight down, its
    // palm turned back and in toward her (the back of the paw shows from
    // her front, the thumb on her side of it, as the sheet draws it)
    pawY.copy(fp).sub(SHOULDER_L).normalize().addScaledVector(DOWN_Y, 0.6).normalize();
    pawZ.set(0.5, 0, -0.85).addScaledVector(pawY, -(0.5 * pawY.x - 0.85 * pawY.z)).normalize();
    pawX.crossVectors(pawY, pawZ);
    freePaw.quaternion.setFromRotationMatrix(pawM.makeBasis(pawX, pawY, pawZ));

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
      domeTopY: HOOD_RINGS[0][0],
      chinY: HEAD_C - HEAD_R * SY,
      headR: Math.max(...HOOD_RINGS.map(([, w]) => w)),
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
