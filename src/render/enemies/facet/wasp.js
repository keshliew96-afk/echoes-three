// BRIAR WASP, MODEL STANDARD (docs/MODEL_STANDARD.md "Foes"). The classic
// wasp of enemies/slice2.js (a small striped flier hovering 0.9 u up, slate
// head and thorax, a pale abdomen with a slate band, blurred parchment wings,
// angular charcoal eyes and the one indigo tell, the stinger) with the sample
// video's technique laid ON TOP of its chibi ink look. What it gains:
//
//   * faceted masses: the thorax and the wide head are cut into planes with a
//     strong value step, so the toon light bands plane by plane;
//   * detail BAKED per kind (render/facet/foe.js), one draw call for the
//     crowd: big faceted compound eyes, a pale face shield and brow stripe,
//     mandibles, jointed antennae, pale scutum stripes, scutellum spot and
//     wing scales (tegulae), the wasp waist (petiole), six jointed legs
//     dangling under the hover. One white material carries every tone in its
//     vertex colours (slate, pale, dark, charcoal), so the lit body is two
//     meshes with their ink;
//   * a SEGMENTED abdomen: four overlapping faceted plates on one instanced
//     row, each pale with a slate rear band (the wasp's stripes; the classic's
//     one band becomes four), the seams inked, laid every frame along a chain
//     that curls under and hooks to either side; the faceted, curved indigo
//     stinger (hornGeometry, dim base, bright point) rides its tip;
//   * four VEINED wings on one instanced row (the classic's two meshes): fore
//     and hind wings, a dark costa, a stigma and four long veins cut into the
//     translucent parchment membrane; the beat (the classic's 60 rad/s flap,
//     plus a figure-eight sweep) and the hover bob stay pure in t;
//   * a FLYER'S LEAN from the real travel (rule 1 of the self-check, legless
//     form): the velocity is measured in the floor frame off the layer's own
//     position and turned into the wasp's frame, so it pitches nose-down
//     advancing, noses up on a backpedal, rolls toward a strafe (its orbit
//     round the target) and banks into a turn, whatever way it faces;
//   * the DART on the sim's lane telegraph (sim/enemies/wasp.js: a 42-tick
//     Ember lane, then a dart at 9 u/s down it). The telegraph IS the coil:
//     drawn back and up, aimed down the lane, the abdomen curls under, the
//     wings flare high and a buzz tremor builds. The strike uncoils in the
//     last 2.5 frames of the telegraph, sampled on the interpolated sim tick,
//     so its contact pose (nose down 24 degrees, dropped, stretched long, the
//     abdomen thrust forward under the body: the stab, wings swept back)
//     lands ON the resolve tick, the tick the dart leaves. The contact holds
//     while the sim's mode is 'dart'; when the dart ends it pulls up (flares
//     nose-up, the abdomen whips back past rest) and settles with one
//     overshoot. Not a repeating melee attack, so no 3-hit chain; its
//     directional variety is per dart instead: hook from its right, hook from
//     its left, then the big plunge, offset by the swarm index so a swarm's
//     opening string of three staggered darts reads as three different stings;
//   * the spawn-in grow (B7), named points (B8: the stinger tip, its base, the
//     mandibles), and the hit and death tuning the shared envelope reads.
//
// Faces +Z. Same contract as buildWasp (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing and damage untouched.
import { BufferGeometry, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Matrix4, Mesh, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { TELL_INDIGO, TELL_INDIGO_DIM } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, plateGeometry, setTRS, wedgeGeometry } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, hornGeometry, lerpFields, namedPoint, placeBody, scaleGeometry, settle, spawnScale } from '../../facet/foe.js';
import { segmentMatrix } from '../../facet/legs.js';

// The sim's wasp (sim/enemies/wasp.js S): buzzes at 2.7 u/s; a lane
// telegraph of 42 ticks (Short Fuse: 36), then a dart at 9 u/s, 3.6 u at most
// (24 ticks); its darts come 207 ticks apart.
const TICK_HZ = 60;
const BUZZ_SPEED = 2.7;
export const TELEGRAPH_SEC = 42 / TICK_HZ;
const DIVE_SEC = 24 / TICK_HZ;
// The strike: the last 2.5 frames of the telegraph (5 sim ticks).
const STRIKE_SEC = 2.5 * FRAME;
const STRIKE_TICKS = STRIKE_SEC * TICK_HZ;
const SNAP_SEC = 2.5 * FRAME;
const SETTLE_SEC = 6 * FRAME;
// The stinger's kick on the strike, settled over 3 frames of the contact (B4).
const KICK = 0.12;
// The hover (the classic's 0.9 u, its 0.06 u bob at 7 rad/s, its 60 rad/s beat).
const HOVER_Y = 0.9;
const WING_W = 60;

// --- Key poses. lift: hover height offset (u); push: the body's shove along
// +z (u); pitch: nose down (+); roll: about the long axis (+ leans to its
// right, -x); twist: a small yaw (+ toward its left, +x); sx / sy / sz: the
// body's squash (wide, tall, long); curl: the abdomen's curl under (rad,
// spread over its joints); hook: its swing aside (+ toward its left); sting:
// the stinger's own bend; wUp / wAmp / wSweep: the wings' raise, beat size and
// sweep back; buzz: the coil's tremor (0..1).
const REST = Object.freeze({ lift: 0, push: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, sz: 1, curl: 0, hook: 0, sting: 0, wUp: 0, wAmp: 1, wSweep: 0, buzz: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const mirror = (p) => K({ ...p, roll: -p.roll, twist: -p.twist, hook: -p.hook });
// Dart 1, HOOK FROM ITS RIGHT: coiled with the abdomen cocked to its right,
// it stabs across to its left as it drops into the dive.
const C1 = K({ lift: 0.07, push: -0.06, pitch: 0.18, roll: 0.14, twist: -0.14, sx: 0.97, sy: 1.04, sz: 0.93, curl: 1.0, hook: -0.5, sting: 0.12, wUp: 0.38, wAmp: 1.45, wSweep: -0.18, buzz: 1 });
const S1 = K({ lift: -0.2, push: 0.1, pitch: 0.42, roll: -0.2, twist: 0.12, sx: 0.9, sy: 0.92, sz: 1.16, curl: 1.9, hook: 0.32, sting: 0.3, wUp: -0.12, wAmp: 0.5, wSweep: 0.85 });
const O1 = K({ lift: 0.05, push: 0.03, pitch: -0.3, roll: 0.1, twist: -0.06, sx: 1.04, sy: 1.05, sz: 0.95, curl: -0.15, hook: -0.12, sting: -0.05, wUp: 0.25, wAmp: 1.35, wSweep: -0.3 });
// Dart 3, PLUNGE (the biggest, §6.1 B6): coiled deepest and highest, square,
// it drops hardest, stretched longest, and pulls up with the biggest flare.
const C3 = K({ lift: 0.13, push: -0.08, pitch: 0.12, sx: 0.96, sy: 1.06, sz: 0.9, curl: 1.15, sting: 0.15, wUp: 0.48, wAmp: 1.65, wSweep: -0.22, buzz: 1 });
const S3 = K({ lift: -0.3, push: 0.12, pitch: 0.55, sx: 0.88, sy: 0.9, sz: 1.22, curl: 2.2, sting: 0.35, wUp: -0.15, wAmp: 0.4, wSweep: 1.0 });
const O3 = K({ lift: 0.1, push: 0.04, pitch: -0.4, sx: 1.06, sy: 1.06, sz: 0.94, curl: -0.2, sting: -0.06, wUp: 0.32, wAmp: 1.5, wSweep: -0.36 });
// Dart 2 is dart 1 mirrored: HOOK FROM ITS LEFT.
const DARTS = [
  { label: 'hook from its right', coil: C1, strike: S1, over: O1 },
  { label: 'hook from its left', coil: mirror(C1), strike: mirror(S1), over: mirror(O1) },
  { label: 'plunge', coil: C3, strike: S3, over: O3 },
].map((d) => Object.freeze(d));
export const WASP_REST = REST;
export const WASP_DARTS = Object.freeze(DARTS);

// One dart on its timeline (the lab's; in game the coil and the strike are
// stretched to the live telegraph and the dive holds while the sim darts).
const DART_TL = createTimeline('dart', 'Dart', [
  { id: 'coil', label: 'coil (the lane telegraph)', dur: TELEGRAPH_SEC - STRIKE_SEC },
  { id: 'strike', label: 'strike: uncoil into the dive', dur: STRIKE_SEC },
  { id: 'dive', label: 'dive: the stab held down the lane', dur: DIVE_SEC },
  { id: 'snap', label: 'pull up', dur: SNAP_SEC },
  { id: 'settle', label: 'settle into the hover', dur: SETTLE_SEC },
  { id: 'hover', label: 'hover', dur: 0.15 },
]);
const DART_SEC = DART_TL.duration;

// The coil, k 0..1 across the wind-up: most of it in the first 40%, then a
// slow deepening while the tremor builds toward the release.
function coilPose(D, k, from, out) {
  const b = 0.85 * ease.out(Math.min(1, k / 0.4)) + 0.15 * k;
  lerpFields(out, from, D.coil, b, FIELDS);
  out.buzz = D.coil.buzz * Math.pow(k, 1.5);
  return out;
}
// The strike, k 0..1 across its 2.5 frames: the body accelerates into the
// dive (ease in), the stinger kicks at once (ease out, past its contact bend).
function strikePose(D, k, out) {
  lerpFields(out, D.coil, D.strike, ease.in(k), FIELDS);
  out.sting = D.coil.sting + (D.strike.sting + KICK - D.coil.sting) * ease.out(k);
  return out;
}
// The contact held down the lane; the stinger's kick settles over 3 frames.
function divePose(D, held, out) {
  Object.assign(out, D.strike);
  out.sting += KICK * settle(Math.min(1, held / (3 * FRAME)));
  return out;
}
// Pure: dart v (0 hook right, 1 hook left, 2 plunge) at t seconds into it.
export function waspDartPose(v, t, out = { ...REST }) {
  const D = DARTS[v] || DARTS[0];
  const s = DART_TL.sample(t);
  if (s.id === 'coil') return coilPose(D, s.k, REST, out);
  if (s.id === 'strike') return strikePose(D, s.k, out);
  if (s.id === 'dive') return divePose(D, s.k * DIVE_SEC, out);
  if (s.id === 'snap') return lerpFields(out, D.strike, D.over, ease.out(s.k), FIELDS);
  if (s.id === 'settle') return lerpFields(out, D.over, REST, 1 - settle(s.k), FIELDS);
  return Object.assign(out, REST);
}
// The classic twin's stand-in inputs at the same moment (the lab).
function classicDart(t) {
  const s = DART_TL.sample(t);
  const tel = s.id === 'coil' || s.id === 'strike';
  return { telegraphK: tel ? 1 : 0, lungeK: 0, fireK: 0, e: { mode: s.id === 'dive' ? 'dart' : 'buzz' } };
}

export const WASP_DART = Object.freeze({
  id: 'dart',
  label: 'Dart dive',
  duration: DART_SEC,
  at(t) {
    const s = DART_TL.sample(t);
    return { v: 0, n: 0, t, phase: s.id, label: `${DARTS[0].label}: ${s.label}` };
  },
  // the contact lands where the telegraph resolves
  strikes: [TELEGRAPH_SEC],
  classicAt: classicDart,
});
// Three darts in turn on one body (in game they are the swarm's three
// sisters' opening string, or one wasp's next three darts 3.45 s apart),
// each cut 0.1 s into its hover tail.
const STRING_GAP = DART_SEC - 0.1;
const stringAt = (t) => (t < STRING_GAP ? 0 : t < 2 * STRING_GAP ? 1 : 2);
export const WASP_STRING = Object.freeze({
  id: 'string',
  label: 'Dart string',
  duration: 2 * STRING_GAP + DART_SEC,
  at(t) {
    const n = stringAt(t);
    const tt = t - n * STRING_GAP;
    const s = DART_TL.sample(tt);
    return { v: n, n, t: tt, phase: s.id, label: `Dart ${n + 1}, ${DARTS[n].label}: ${s.label}` };
  },
  strikes: [TELEGRAPH_SEC, STRING_GAP + TELEGRAPH_SEC, 2 * STRING_GAP + TELEGRAPH_SEC],
  classicAt: (t) => classicDart(t - stringAt(t) * STRING_GAP),
});
export const WASP_ABILITIES = Object.freeze({ dart: WASP_DART, string: WASP_STRING });

// --- Geometry (built once for the session, shared by every wasp) ------------
// The classic's hides (enemies/slice2.js C.wasp, C.waspBand), and the tones
// the one white chitin material carries in its vertex colours.
const SLATE = new Color().setHSL(0.6, 0.3, 0.3);
const PALE = new Color(PALETTE.bone).multiplyScalar(0.7);
const DARK = SLATE.clone().multiplyScalar(0.5);
const EYE = SLATE.clone().multiplyScalar(0.2);
const MEMBRANE = new Color(PALETTE.parchment);
const VEIN = SLATE.clone().multiplyScalar(0.32);
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
// An orthonormal frame: Y along `up`, Z as near `fwd` as it can be.
function basis(up, fwd, X, Y, Z) {
  Y.copy(up).normalize();
  Z.copy(fwd).addScaledVector(Y, -fwd.dot(Y));
  if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1);
  Z.normalize();
  X.crossVectors(Y, Z).normalize();
}
// Multiply each face's colour by tone(centroid) (a faceted, non-indexed geometry).
function toneFaces(g, tone) {
  const p = g.attributes.position;
  const c = g.attributes.color;
  for (let i = 0; i + 2 < p.count; i += 3) {
    const col = tone((p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3);
    for (let j = i; j < i + 3; j++) c.setXYZ(j, c.getX(j) * col.r, c.getY(j) * col.g, c.getZ(j) * col.b);
  }
  return g;
}

// A veined wing: a fan from the root (the origin), span 1 along +x, the
// leading edge toward +z. Every cell is its own triangle, so the dark veins
// are cut INTO the membrane (no coplanar overlap to flicker): the costa along
// the leading edge, a stigma at its end, four long veins to the rim.
function wingGeometry() {
  const E = [[0.05, 0.3], [0.8, 0.33], [0.94, 0.2], [1.0, 0.02], [0.95, -0.18], [0.8, -0.33], [0.55, -0.42], [0.3, -0.36], [0.1, -0.2], [0.02, -0.06]];
  const O = [0, 0];
  const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const pos = [];
  const col = [];
  const tri = (a, b, c, color, tone = 1) => {
    for (const q of [a, b, c]) {
      pos.push(q[0], 0, q[1]);
      col.push(color.r * tone, color.g * tone, color.b * tone);
    }
  };
  const VEINS = new Set([3, 5, 7, 8]);
  for (let j = 0; j < E.length - 1; j++) {
    const a = E[j];
    const b = E[j + 1];
    const tone = j % 2 ? 0.93 : 1.04;
    if (j === 0) tri(O, a, b, VEIN); // the costa: a dark sliver along the leading edge
    else if (j === 1) {
      // the stigma: a dark cell at the costa's end
      const P = lerp2(O, a, 0.8);
      const Q = lerp2(a, b, 0.5);
      tri(P, a, Q, VEIN);
      tri(O, P, Q, MEMBRANE, tone);
      tri(O, Q, b, MEMBRANE, tone);
    } else if (VEINS.has(j)) {
      // a long vein: a dark sliver from the root along spoke j
      const f = 0.045 / Math.hypot(b[0] - a[0], b[1] - a[1]);
      const V = lerp2(a, b, f);
      tri(O, a, V, VEIN);
      tri(O, V, b, MEMBRANE, tone);
    } else tri(O, a, b, MEMBRANE, tone);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

let SET = null;
function geos() {
  if (SET) return SET;
  const P = new Vector3();
  const A = new Vector3();
  const B = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const H = new Vector3();
  const m = new Matrix4();
  const wedge = wedgeGeometry();
  const plate = plateGeometry();
  const scale = scaleGeometry({ seed: 215 });
  const at = (pos, up, fwd, sx, sy, sz) => {
    basis(H.copy(up), fwd, X, Y, Z);
    return setTRS(m, pos, X, Y, Z, sx, sy, sz).clone();
  };
  const seg = (a, b, r) => segmentMatrix(new Matrix4(), a, b, r, r, r * 0.6);
  const set = {};
  // The lit body: the slate thorax and the wide head (full ink).
  set.body = bakeParts('wasp:body', () => [
    { geo: fz(new SphereGeometry(0.1, 8, 6), 0.14, 201), m: new Matrix4().compose(new Vector3(0, 0, -0.015), new Quaternion(), new Vector3(1, 0.9, 1.12)), tint: SLATE },
    { geo: fz(new SphereGeometry(0.075, 8, 5), 0.12, 203), m: new Matrix4().compose(new Vector3(0, 0.01, 0.13), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.25), new Vector3(1.18, 0.95, 0.8)), tint: SLATE },
  ]);
  // The detail (part ink): eyes, face, mandibles, antennae, thorax marks,
  // wing scales, the waist and the six dangling legs, every tone in one call.
  set.detail = bakeParts('wasp:detail', () => {
    const out = [];
    const eye = fz(new SphereGeometry(1, 6, 5), 0.22, 205);
    const limb = fz(new CylinderGeometry(0.75, 1, 1, 4).translate(0, 0.5, 0), 0.12, 207);
    const waist = fz(new CylinderGeometry(0.8, 1, 1, 6).translate(0, 0.5, 0), 0.1, 209);
    for (const s of [-1, 1]) {
      // compound eyes: tall faceted kidneys bulging off the head's sides
      out.push({ geo: eye, m: new Matrix4().compose(P.set(s * 0.072, 0.02, 0.132), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), s * 0.35).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -s * 0.2)), new Vector3(0.03, 0.052, 0.046)), tint: EYE });
      // mandibles
      out.push({ geo: wedge, m: at(P.set(s * 0.022, -0.043, 0.18), new Vector3(-s * 0.4, -1, 0.5), new Vector3(0, 0, 1), 0.024, 0.045, 0.012), tint: DARK });
      // antennae: a scape, then the flagellum curving out and down
      A.set(s * 0.022, 0.04, 0.176);
      B.copy(A).addScaledVector(H.set(s * 0.25, 0.85, 0.45).normalize(), 0.055);
      out.push({ geo: limb, m: seg(A, B, 0.008), tint: DARK });
      A.copy(B).addScaledVector(H.set(s * 0.45, 0.3, 0.84).normalize(), 0.06);
      out.push({ geo: limb, m: seg(B, A, 0.0068), tint: DARK });
      B.copy(A).addScaledVector(H.set(s * 0.5, -0.12, 0.86).normalize(), 0.06);
      out.push({ geo: limb, m: seg(A, B, 0.0058), tint: DARK });
      // pale scutum stripes and the wing scales (tegulae)
      out.push({ geo: plate, m: at(P.set(s * 0.032, 0.082, 0.005), new Vector3(s * 0.3, 1, 0.05), new Vector3(0, 0, 1), 0.022, 0.014, 0.07), tint: PALE, tone: 0.96 });
      out.push({ geo: scale, m: at(P.set(s * 0.072, 0.05, 0.03), new Vector3(s * 1, 0.8, 0), new Vector3(0, 0, 1), 0.03, 0.012, 0.036), tint: PALE });
      // six legs hanging under the hover: femur, tibia, tarsus (the front pair
      // reaching forward, the hind pair trailing under the abdomen)
      const LEGS = [
        [[0.03, -0.065, 0.05], [[0.55, -0.6, 0.58, 0.07], [0.1, -0.95, 0.3, 0.08], [0.05, -0.7, 0.7, 0.04]]],
        [[0.042, -0.072, 0.0], [[0.8, -0.6, 0.0, 0.075], [0.25, -0.92, -0.3, 0.085], [0.1, -0.8, -0.6, 0.04]]],
        [[0.042, -0.065, -0.05], [[0.7, -0.55, -0.45, 0.085], [0.2, -0.65, -0.73, 0.1], [0.05, -0.5, -0.86, 0.05]]],
      ];
      const LR = [0.012, 0.0095, 0.007];
      for (const [hip, bones] of LEGS) {
        A.set(s * hip[0], hip[1], hip[2]);
        bones.forEach(([dx, dy, dz, len], k) => {
          B.copy(A).addScaledVector(H.set(s * dx, dy, dz).normalize(), len);
          out.push({ geo: limb, m: seg(A, B, LR[k]), tint: DARK, tone: 1 - 0.06 * k });
          A.copy(B);
        });
      }
    }
    // the pale face shield (clypeus) and a brow stripe above it
    out.push({ geo: scale, m: at(P.set(0, -0.012, 0.183), new Vector3(0, -0.35, 1), new Vector3(0, 1, 0), 0.058, 0.014, 0.048), tint: PALE });
    out.push({ geo: plate, m: at(P.set(0, 0.036, 0.174), new Vector3(0, 0.45, 1), new Vector3(0, 1, 0), 0.02, 0.012, 0.04), tint: PALE, tone: 0.95 });
    // the scutellum spot
    out.push({ geo: plate, m: at(P.set(0, 0.081, -0.056), new Vector3(0, 1, -0.6), new Vector3(0, 0, 1), 0.05, 0.012, 0.028), tint: PALE });
    // the wasp waist (petiole)
    out.push({ geo: waist, m: seg(A.set(0, -0.012, -0.085), B.set(0, -0.028, -0.135), 0.022), tint: DARK });
    return out;
  });
  // One abdomen plate: a faceted ovoid, pale with a slate rear band (its
  // stripe). Unit radius; each instance scales it to its segment.
  set.plate = toneFaces(fz(new SphereGeometry(1, 7, 6), 0.12, 211), (x, y, z) => (z < -0.28 ? SLATE : PALE));
  // The stinger: a curved faceted horn, the base third dim indigo, the point
  // bright (the unlit tell, one draw call as on the classic).
  const tellB = new Color(TELL_INDIGO);
  const tellD = new Color(TELL_INDIGO_DIM);
  set.sting = toneFaces(hornGeometry({ len: 1, r: 0.19, bend: 0.3, seg: 3, sides: 5, jitter: 0.1, seed: 213 }), (x, y) => (y < 0.34 ? tellD : tellB));
  set.wing = wingGeometry();
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// The stinger tip in the horn's own frame (where hornGeometry's arc ends).
const STING_TIP = (() => {
  const v = new Vector3();
  for (let i = 0; i < 3; i++) {
    const a = (0.3 * (i + 0.5)) / 3;
    v.y += Math.cos(a) / 3;
    v.z += Math.sin(a) / 3;
  }
  return v;
})();

// The abdomen chain: four plates from the waist, each with its length and
// radius, the rest hang of the waist joint and the bend at each joint, and
// the share of the curl each joint takes.
const GASTER_ROOT = new Vector3(0, -0.028, -0.128);
const SEG_L = [0.074, 0.087, 0.078, 0.069];
const SEG_R = [0.068, 0.09, 0.079, 0.056];
const REST_A0 = 0.22;
const REST_BEND = 0.05;
const CURL_W = [0.3, 0.25, 0.25, 0.2];
const STING_LEN = 0.15;
// Wing roots (the right side; the left mirrors), their spans and chords.
const WINGS = [
  { s: -1, fore: true },
  { s: 1, fore: true },
  { s: -1, fore: false },
  { s: 1, fore: false },
];
const ROOT_F = new Vector3(0.068, 0.062, 0.03);
const ROOT_H = new Vector3(0.06, 0.058, -0.012);
const PIVOT = new Vector3(0, 0, -0.03);
const YAXIS = new Vector3(0, 1, 0);
const ZAXIS = new Vector3(0, 0, 1);
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildWaspFacet() {
  const G = geos();
  const F = createFoeFrame('wasp');
  const { body, spawn, track } = F;
  // one lit material: every tone rides in the vertex colours (flashable)
  const chitin = track(foeMaterial('#FFFFFF'));
  const tellMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
  const wingMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false, side: DoubleSide });

  body.add(foePart(G.body, chitin, 'full', 'wasp-body'));
  body.add(foePart(G.detail, chitin, 'part', 'wasp-detail'));
  // the abdomen plates and the wings: one instanced row each, laid every frame
  const gaster = instancedPart(G.plate, chitin, 4, { name: 'wasp-gaster', moving: true, inkPx: 2.0 });
  const wings = instancedPart(G.wing, wingMat, 4, { name: 'wasp-wings', moving: true, ink: false });
  body.add(gaster);
  body.add(wings);
  const sting = new Mesh(G.sting, tellMat);
  sting.name = 'wasp-sting';
  sting.matrixAutoUpdate = false;
  body.add(sting);
  // The contact shadow belongs to the floor (the group, not the yaw).
  const shadow = groundShadow(0.18, 0.5);
  F.group.add(shadow);

  // Named points (B8): the stinger tip (the weapon), its base (the hand that
  // holds it: the abdomen's tip), the mandibles (the mouth).
  const tipPt = namedPoint(sting, 'wasp-tip', STING_TIP.x, STING_TIP.y, STING_TIP.z);
  const hand = namedPoint(sting, 'wasp-hand', 0, 0, 0);
  const mouth = namedPoint(body, 'wasp-mouth', 0, -0.05, 0.19);

  const clock = createFoeClock();
  const watch = createAttackWatch();
  const cur = { ...REST };
  const capture = { ...REST };
  const m = new Matrix4();
  const q = new Quaternion();
  const q2 = new Quaternion();
  const pos = new Vector3();
  const scl = new Vector3();
  const J = new Vector3();
  const D = new Vector3();
  const U = new Vector3();
  const X = new Vector3();
  const Zs = new Vector3();
  const C = new Vector3();
  const axis = new Vector3();
  let age = -1;
  let yawNow = 0;
  // the live dart: 'rest' | 'coil' | 'strike' | 'snapin' | 'dive' | 'pull' | 'abort'
  let state = 'rest';
  let variant = 0;
  let darts = 0;
  let telStart = 0;
  let telResolve = 0;
  let released = false;
  let t0 = 0;
  let offAt = null;
  let wasDarting = false;
  const strike = { id: '', tick: 0 };
  const prevStrike = { id: '', tick: 0, had: false };
  // the measured travel (floor frame), and the turn rate
  let lastX = null;
  let lastZ = 0;
  let lastYaw = 0;
  let vx = 0;
  let vz = 0;
  let yawRate = 0;

  const lab = {
    abilities: WASP_ABILITIES,
    override: null, // { id: 'dart' | 'string', t } | null
    lastStrike: null, // { id, tick }: the sim tick the latest live strike's contact lands on
    pose: () => ({ ...cur }),
    get state() {
      return state;
    },
    get hit() {
      return state === 'rest' ? -1 : variant;
    },
    parts: { body, gaster, wings, sting },
  };

  function noteStrike(id, tick) {
    prevStrike.had = lab.lastStrike !== null;
    prevStrike.id = strike.id;
    prevStrike.tick = strike.tick;
    strike.id = id;
    strike.tick = tick;
    lab.lastStrike = strike;
  }
  function unStrike() {
    // a telegraph cancelled inside its strike frames never struck
    if (prevStrike.had) {
      strike.id = prevStrike.id;
      strike.tick = prevStrike.tick;
    } else lab.lastStrike = null;
  }

  // The live dart, from the sim's telegraph and mode.
  function liveDart(P, now, tick, e) {
    const beat = watch.update(P);
    const darting = !!(e && e.mode === 'dart');
    if (beat && beat.type === 'wind') {
      Object.assign(capture, cur);
      variant = ((e && e.swarmIndex) || 0) + darts;
      variant %= 3;
      darts += 1;
      const tel = watch.telegraph;
      telStart = tel.startTick;
      telResolve = tel.resolveTick;
      released = false;
      state = 'coil';
    } else if (beat && beat.type === 'release' && (state === 'coil' || state === 'strike')) released = true;
    else if (beat && beat.type === 'cancel' && (state === 'coil' || state === 'strike')) {
      if (state === 'strike') unStrike();
      Object.assign(capture, cur);
      state = 'abort';
      t0 = now;
    }
    // a dart with no telegraph seen (the rig met it mid-attack): one frame
    // from wherever it is into the contact (B1)
    if (darting && !wasDarting && state !== 'coil' && state !== 'strike' && state !== 'dive') {
      Object.assign(capture, cur);
      variant = (((e && e.swarmIndex) || 0) + darts) % 3;
      darts += 1;
      state = 'snapin';
      t0 = now;
      noteStrike(`dart:${variant + 1}`, tick + FRAME * TICK_HZ);
    }
    wasDarting = darting;
    const Dv = DARTS[variant];
    if (state === 'coil' || state === 'strike') {
      // sampled on the interpolated sim tick: the contact lands ON the resolve
      const span = Math.max(1, telResolve - telStart);
      const sTicks = Math.min(STRIKE_TICKS, span * 0.5);
      const strikeAt = telResolve - sTicks;
      if (tick < strikeAt) {
        const kc = (tick - telStart) / (strikeAt - telStart);
        coilPose(Dv, kc < 0 ? 0 : kc > 1 ? 1 : kc, capture, cur);
      } else {
        if (state === 'coil') {
          state = 'strike';
          noteStrike(`dart:${variant + 1}`, tick + (telResolve - tick)); // P.tick + seconds to contact x 60
        }
        const ks = (tick - strikeAt) / sTicks;
        strikePose(Dv, ks > 1 ? 1 : ks, cur);
        if (tick >= telResolve && (released || darting)) {
          state = 'dive';
          t0 = now;
          offAt = null;
        }
      }
    }
    if (state === 'snapin') {
      const k = (now - t0) / FRAME;
      if (k >= 1 - 1e-6) {
        state = 'dive';
        t0 = now;
        offAt = null;
      } else lerpFields(cur, capture, Dv.strike, ease.in(k), FIELDS);
    }
    if (state === 'dive') {
      const held = now - t0;
      divePose(Dv, held, cur);
      // the dart ends a tick after the sim's mode drops (the layer draws the
      // last step of it then); the contact holds 2 frames at least (B2)
      if (darting) offAt = null;
      else if (offAt === null) offAt = tick;
      if ((offAt !== null && tick >= offAt + 1 && held >= 2 * FRAME) || held > 1.2) {
        Object.assign(capture, cur);
        state = 'pull';
        t0 = now;
      }
    }
    if (state === 'pull') {
      const tp = now - t0;
      if (tp < SNAP_SEC) lerpFields(cur, capture, Dv.over, ease.out(tp / SNAP_SEC), FIELDS);
      else if (tp < SNAP_SEC + SETTLE_SEC) lerpFields(cur, Dv.over, REST, 1 - settle((tp - SNAP_SEC) / SETTLE_SEC), FIELDS);
      else state = 'rest';
    }
    if (state === 'abort') {
      const k = (now - t0) / SETTLE_SEC;
      if (k >= 1) state = 'rest';
      else lerpFields(cur, capture, REST, 1 - settle(k), FIELDS);
    }
    if (state === 'rest') Object.assign(cur, REST);
  }

  function pose(P) {
    const dt = clock.step(P);
    const now = clock.now;
    const tt = P.t ?? 0;
    const e = P.e || null;
    const tick = P.tick ?? 0;
    const turntable = !!P.turntable;
    // B7: grow from the floor (not on the Journal's turntable, nor where the
    // caller says the foe stands grown: the lab)
    if (age < 0) age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    spawn.scale.setScalar(spawnScale(age));

    // --- the dart: the lab's pure override, or the live telegraph
    if (lab.override) {
      const ab = WASP_ABILITIES[lab.override.id] || WASP_DART;
      const h = ab.at(lab.override.t);
      waspDartPose(h.v, h.t, cur);
      state = 'rest';
      watch.reset();
    } else liveDart(P, now, tick, e);

    // --- the travel, measured off the layer's own position (the floor frame)
    // and turned into the wasp's frame: pitch into it, roll toward a strafe,
    // bank into a turn (rule 1). A lab override or the turntable leans not.
    const gx = F.group.position.x;
    const gz = F.group.position.z;
    if (lastX === null) {
      lastX = gx;
      lastZ = gz;
      lastYaw = yawNow;
    }
    if (dt > 0) {
      let ix = (gx - lastX) / dt;
      let iz = (gz - lastZ) / dt;
      if (ix * ix + iz * iz > 400) ix = iz = 0; // a jump (a spawn, a lab reset), not travel
      let dy = yawNow - lastYaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      const a = 1 - Math.exp(-12 * dt);
      vx += (ix - vx) * a;
      vz += (iz - vz) * a;
      yawRate += (dy / dt - yawRate) * a;
    }
    lastX = gx;
    lastZ = gz;
    lastYaw = yawNow;
    let leanP = 0;
    let leanR = 0;
    if (!lab.override && !turntable) {
      const sy = Math.sin(yawNow);
      const cy = Math.cos(yawNow);
      const lz = vx * sy + vz * cy; // along its facing
      const lx = vx * cy - vz * sy; // toward its left (+x)
      leanP = 0.16 * clamp1(lz / BUZZ_SPEED);
      leanR = -0.2 * clamp1(lx / BUZZ_SPEED) - 0.22 * clamp1((Math.max(0, lz) * yawRate) / 6);
    }

    // --- the body: the dart's pose, the hover and its bob (pure in t), the
    // lean, the coil's tremor, a slow abdomen pump
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const bob = 0.06 * Math.sin(tt * 7 + id);
    const shiver = cur.buzz * Math.sin(tt * 83 + id * 1.7);
    body.rotation.set(cur.pitch + leanP + 0.02 * shiver, cur.twist, cur.roll + leanR + 0.05 * shiver);
    body.scale.set(cur.sx, cur.sy, cur.sz);
    placeBody(body, PIVOT, cur.push, HOVER_Y + cur.lift + bob + 0.01 * shiver);
    // the shadow tightens as the wasp drops, spreads as it rises
    shadow.scale.setScalar(1 - 0.9 * Math.max(-0.35, Math.min(0.2, cur.lift + bob)));

    // --- the abdomen: four plates down a chain that curls under (in the
    // body's midline plane), swung aside about its own back by the hook
    const pump = 0.06 * Math.sin(tt * 2.3 + id);
    const curl = cur.curl + pump;
    let phi = REST_A0 + CURL_W[0] * curl;
    const midPhi = REST_A0 + curl * 0.55 + REST_BEND * 1.5;
    axis.set(0, Math.cos(midPhi), -Math.sin(midPhi));
    q.setFromAxisAngle(axis, -(cur.hook + 0.05 * Math.sin(tt * 1.7 + id)));
    J.set(0, 0, 0);
    for (let i = 0; i < 4; i++) {
      if (i > 0) phi += REST_BEND + CURL_W[i] * curl;
      D.set(0, -Math.sin(phi), -Math.cos(phi)).applyQuaternion(q); // down the chain
      U.set(0, Math.cos(phi), -Math.sin(phi)).applyQuaternion(q); // its back
      C.copy(J).addScaledVector(D, SEG_L[i] * 0.5).add(GASTER_ROOT);
      Zs.copy(D).negate();
      X.crossVectors(U, Zs);
      setTRS(m, C, X, U, Zs, SEG_R[i], SEG_R[i] * 0.9, SEG_L[i] * 0.7);
      gaster.setMatrixAt(i, m);
      J.addScaledVector(D, SEG_L[i]);
    }
    gaster.instanceMatrix.needsUpdate = true;
    // the stinger off the last plate's tip, bent on under (its point leads)
    const sp = phi + 0.1 + 0.15 * curl + cur.sting;
    D.set(0, -Math.sin(sp), -Math.cos(sp)).applyQuaternion(q);
    U.set(0, -Math.cos(sp), Math.sin(sp)).applyQuaternion(q); // its belly: the horn bends this way
    C.copy(J).addScaledVector(D, -0.012).add(GASTER_ROOT);
    X.crossVectors(D, U);
    setTRS(sting.matrix, C, X, D, U, STING_LEN, STING_LEN, STING_LEN);
    sting.matrixWorldNeedsUpdate = true;

    // --- the wings: the classic's 60 rad/s flap with a figure-eight sweep,
    // the hind pair a beat behind; raised, spread or swept by the pose
    for (let i = 0; i < 4; i++) {
      const { s, fore } = WINGS[i];
      const ph = tt * WING_W + id * 0.9 + (fore ? 0 : 0.35);
      const flap = 0.3 + cur.wUp + 0.5 * cur.wAmp * (fore ? 1 : 0.9) * Math.sin(ph);
      const sweep = (fore ? 0.22 : 0.5) + cur.wSweep + 0.16 * cur.wAmp * Math.cos(ph);
      q2.setFromAxisAngle(YAXIS, s * sweep).multiply(axisAngle(ZAXIS, s * flap));
      const root = fore ? ROOT_F : ROOT_H;
      pos.set(s * root.x, root.y, root.z);
      scl.set(s * (fore ? 0.27 : 0.18), 1, fore ? 0.17 : 0.12);
      wings.setMatrixAt(i, m.compose(pos, q2, scl));
    }
    wings.instanceMatrix.needsUpdate = true;
  }
  const qa = new Quaternion();
  function axisAngle(ax, a) {
    return qa.setFromAxisAngle(ax, a);
  }

  return {
    group: F.group,
    // the node holding everything that moves (spawn > body, the gaster and
    // wing rows, the stinger); the shadow stays on the group, on the floor
    body: F.yaw,
    mats: F.mats,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    pose,
    lab,
    modelStandard: true,
    points: { tip: tipPt, hand, mouth },
    // The shared hit envelope's tuning (§6.1 item 9): a light flier takes a
    // softer squash along its spine (the long axis) and a bigger knock; the
    // flinch bulges at the hover.
    react: { squash: 0.8, flinch: 0.85, knock: 1.3, axis: 'z', midY: HOVER_Y },
    // §6.1 item 10: a small body swells less and is thrown farther.
    death: { swell: 0.8, throw: 1.3 },
  };
}
