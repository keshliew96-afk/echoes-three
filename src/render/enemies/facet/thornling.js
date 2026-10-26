// THORNLING, MODEL STANDARD (docs/MODEL_STANDARD.md "Foes"). The classic
// Thornling of enemies/slice2.js (docs/CONTENT_PLAN.md §3, the Hollow Wood's
// gardener) with the sample video's technique laid ON TOP of its chibi ink
// look: the same knee-high knot of bramble on two root legs, the same briar
// hide and root brown, the same charcoal slit eyes and the one indigo tell
// (the three-bud crown that blooms as it roots to plant). What it gains:
//
//   * faceted masses: the knot is a gnarled, seeded polyhedron cut into flat
//     planes with a strong value step, its underside darker than its crown, so
//     the toon light bands plane by plane and the body reads round at play
//     zoom;
//   * detail by repetition, BAKED per kind (render/facet/foe.js), so a room of
//     thornlings shares one buffer: nine thorn clusters (a tapering hooked
//     thorn and a thornlet at its foot) where the classic had nine flat cones,
//     cutting a star round the knot from the camera; a rosette of sunk bark
//     plates nesting the crown and two over the back; two bramble strands
//     winding round the flanks; a brow over each eye. Draw calls drop to half
//     the classic's (each classic spike was its own mesh and material);
//   * ROOT LEGS ON WORLD-LOCKED FEET (render/facet/legs.js): two bow-legged
//     two-bone roots on one instanced row with their rootlet toes, each foot
//     pinned to the floor while it carries weight, toes and all (a planted
//     foot keeps its world heading while the body turns over it), stepping
//     along the real travel: the thornling skulks, so it backpedals and
//     strafes far more than it walks forward, and its feet step that way;
//   * THE PLANT (its only attack: it never bites, so it has no 3-hit chain):
//     the sim roots it for 30 ticks, then plants a thorn patch at its feet as
//     the roots let go (sim/enemies/thornling.js). The root IS the telegraph:
//     its progress drives the anticipation (dig in, rear up and back with the
//     crown blooming open, a shiver of tension), the stamp runs in the last
//     2.5 frames and lands its contact ON the tick the sim plants, the roots
//     stab into the floor and hold, then it snaps back and settles with one
//     overshoot. A stun or a blind that holds the plant back holds the stamp
//     with it (the sim skips the resolve until the status lapses);
//   * the spawn-in grow (B7), named points (B8: the planting point between
//     the root feet, the crown), and the hit and death tuning the shared
//     envelope reads (§6.1 items 9, 10).
//
// Faces +Z. Same contract as buildThornling (group, mats, setYaw, pose) plus
// lab, react, death, points. Render only: the sim, its timing and damage
// untouched.
import { BoxGeometry, Color, CylinderGeometry, DoubleSide, Euler, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import THORNLING_SIM from '../../../sim/enemies/thornling.js';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { makeGlowSprite } from '../../glow.js';
import { markShared } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_DIM, TELL_INDIGO_GLOW } from '../style.js';
import { facetize, hash01 } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, SPAWN_SEC, bakeParts, createFoeClock, createFoeFrame, foeMaterial, foePart, hornGeometry, namedPoint, placeBody, scaleGeometry, settle, spawnScale, telegraphProgress } from '../../facet/foe.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/legs.js';

// The sim's thornling (sim/enemies/thornling.js): it skulks at 1.3 u/s and
// every 240 ticks roots for 30 ticks, planting its thorn patch on the tick
// the roots let go (e.mode 'root' until e.rootUntil, then e.plantTick).
// Read from its stats, so the root's length is the sim's own.
const ROOT_TICKS = THORNLING_SIM.stats.rootTicks;
const PLANT_EVERY = THORNLING_SIM.stats.plantEvery;
export const ROOT_SEC = ROOT_TICKS / 60;
const MOVE_SPEED = THORNLING_SIM.stats.moveSpeed;
// The stamp: 2.5 frames from the end of the gather to the contact (§6.1 B2).
const STRIKE = 2.5 * FRAME;
const STRIKE_TICKS = STRIKE * 60;
const ROOT_IN = 3 * FRAME;
const GATHER_END = ROOT_SEC - STRIKE; // where the strike starts (s into the plant)

// The classic's local hides (render/enemies/slice2.js C.briar, C.root).
const BRIAR = HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.4).multiplyScalar(0.85);
const ROOT = HIDE.boarDark.clone().multiplyScalar(0.9);

// --- Key poses. push: the body's shove along +z (u); sink: the body lowered
// (u, + down); pitch: forward (+) or reared back (-), rad; roll, twist: rad
// (+ twist turns it toward its left, +x); sx / sy: the squash (wide, tall);
// bloom: the bud crown opening (0 shut, 1 the classic's rooted bloom);
// spread: the rootlet toes swelled to grip (0..1); dig: the toes stabbed into
// the floor (0..1). Twist and roll are written for a plant turning to its
// left; a plant turning right mirrors them.
const REST = Object.freeze({ push: 0, sink: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, bloom: 0, spread: 0, dig: 0 });
const K = (o) => Object.freeze({ ...REST, ...o });
// Root in (3 frames): the rootlets swell and grip, the knot drops into a crouch,
// the crown springs open (the classic's tell is full from the root's first
// tick: this one is full by the root's first frame, with a small overshoot).
const ROOT_P = K({ sink: 0.035, pitch: 0.1, twist: -0.08, sx: 1.08, sy: 0.91, bloom: 1, spread: 1, dig: 0.35 });
// The gather's apex: pushed up off the gripping roots, reared up and back,
// coiled to one side, the crown in full bloom.
const GATHER_P = K({ push: -0.015, sink: -0.022, pitch: -0.3, roll: 0.04, twist: 0.18, sx: 0.92, sy: 1.12, bloom: 1, spread: 0.85, dig: 0.1 });
// The stamp's contact: driven down and forward onto the roots, uncoiled
// through the middle, squashed (+19% wide, -14% tall), the toes stabbed into
// the floor, the crown flaring a touch past its bloom.
const CONTACT_P = K({ push: 0.02, sink: 0.06, pitch: 0.4, roll: -0.03, twist: -0.06, sx: 1.19, sy: 0.86, bloom: 1.06, spread: 0.55, dig: 1 });
// The snap back's overshoot: a touch tall, the toes pulling out, the crown
// shutting (the classic's shuts at once on the plant).
const OVER_P = K({ push: 0.005, sink: -0.012, pitch: -0.06, twist: 0.02, sx: 0.97, sy: 1.05, bloom: 0.35, spread: 0.25, dig: 0.55 });
const FIELDS = Object.keys(REST);
function lerpPose(out, a, b, k) {
  for (const f of FIELDS) out[f] = a[f] + (b[f] - a[f]) * k;
  return out;
}
const smooth = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

// The plant's timeline: the root's 30 ticks are its first three phases.
const PLANT_TL = createTimeline(
  'plant',
  'Plant thicket',
  [
    { id: 'root', label: 'root in', dur: ROOT_IN },
    { id: 'gather', label: 'rear and bloom', dur: GATHER_END - ROOT_IN },
    { id: 'strike', label: 'stamp', dur: STRIKE },
    { id: 'contact', label: 'roots in', dur: 2 * FRAME },
    { id: 'snap', label: 'snap back', dur: 2.5 * FRAME },
    { id: 'settle', label: 'settle', dur: 6 * FRAME },
  ],
  { cues: [{ at: 0, id: 'root' }, { at: ROOT_SEC, id: 'plant' }] }
);

// Pure: the plant's pose at t seconds into it (side: +1 coils to its left,
// -1 to its right). The probe and the lab call it.
const smp = {};
export function thornlingPlantPose(t, out = { ...REST }, side = 1) {
  const s = PLANT_TL.sample(t, smp);
  const k = s.k;
  if (s.id === 'root') {
    lerpPose(out, REST, ROOT_P, ease.out(k));
    // the tell springs open in one frame and overshoots a touch (the
    // warning is at full strength from the root's start, as the classic's)
    const f = 3 * k;
    out.bloom = f < 1 ? ease.out(f) : 1 + 0.08 * Math.sin((Math.PI * (f - 1)) / 2);
  }
  else if (s.id === 'gather') {
    lerpPose(out, ROOT_P, GATHER_P, ease.inOut(k));
    // tension: a shiver that builds through the gather and stills just
    // before the stamp, so the strike leaves a clean apex
    const env = smooth(0.3, 0.85, k) * (1 - smooth(0.9, 1, k));
    out.twist += 0.03 * env * Math.sin(s.t * 75);
    out.roll += 0.022 * env * Math.sin(s.t * 91 + 1);
  } else if (s.id === 'strike') lerpPose(out, GATHER_P, CONTACT_P, ease.in(k));
  else if (s.id === 'contact') lerpPose(out, CONTACT_P, CONTACT_P, 0);
  else if (s.id === 'snap') lerpPose(out, CONTACT_P, OVER_P, ease.out(k));
  else lerpPose(out, OVER_P, REST, 1 - settle(k)); // B5: one small overshoot
  out.twist *= side;
  out.roll *= side;
  return out;
}

export const THORNLING_PLANT = Object.freeze({
  id: 'plant',
  label: 'Plant thicket',
  duration: PLANT_TL.duration,
  timeline: PLANT_TL,
  sample: (t) => PLANT_TL.sample(t),
  readout: (t) => PLANT_TL.readout(t),
  // the root starts at 0 s, the stamp's contact lands at 0.5 s (the sim's
  // plant tick, 30 ticks after the root)
  cues: PLANT_TL.cues,
  strikes: [ROOT_SEC],
  // the classic twin's stand-in inputs: rooted until the plant
  classicAt: (t) => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { mode: t < ROOT_SEC ? 'root' : 'skulk' } }),
});
export const THORNLING_ABILITIES = Object.freeze({ plant: THORNLING_PLANT });

// --- Geometry (built once for the session, shared by every thornling) -------
// The knot: the classic's icosahedron (r 0.24, x1 / x1.15 / x0.9 at y 0.4),
// one subdivision finer and gnarled by a seeded jitter.
const BODY_C = new Vector3(0, 0.4, 0);
const BODY_A = new Vector3(0.24, 0.276, 0.216);
const UP = new Vector3(0, 1, 0);
// A point on the knot's surface (and its outward normal) in a direction given
// by azimuth (0 = +z, the face; + toward its left, +x) and elevation.
function knot(az, el, out, nrm, lift = 1) {
  const dx = Math.cos(el) * Math.sin(az);
  const dy = Math.sin(el);
  const dz = Math.cos(el) * Math.cos(az);
  const t = lift / Math.sqrt((dx / BODY_A.x) ** 2 + (dy / BODY_A.y) ** 2 + (dz / BODY_A.z) ** 2);
  out.set(dx * t, dy * t, dz * t);
  if (nrm) nrm.set(out.x / BODY_A.x ** 2, out.y / BODY_A.y ** 2, out.z / BODY_A.z ** 2).normalize();
  return out.add(BODY_C);
}
// An orthonormal frame: Y along `up`, Z as near `fwd` as it can be.
function basis(up, fwd, X, Y, Z) {
  Y.copy(up).normalize();
  Z.copy(fwd).addScaledVector(Y, -fwd.dot(Y));
  if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1).addScaledVector(Y, -Y.z);
  Z.normalize();
  X.crossVectors(Y, Z).normalize();
}
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });

// the thorns' girth over the classic horn's: short thorns (tips at the classic's
// 0.31 u) with the classic's broad cone bases, so they still cut a spiky star
// at play zoom
const THORN_W = 1.8;

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
  const set = {};

  // The knot: gnarled (each corner pushed in or out by a seeded 7%), faceted
  // with a strong value step, the crown faces a step lighter and the
  // underside two steps darker (the value break that reads at play zoom).
  {
    const g = new IcosahedronGeometry(0.24, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const f = 1 + 0.07 * (2 * hash01(Math.round(x * 1e3), Math.round(y * 1e3), Math.round(z * 1e3), 211) - 1);
      p.setXYZ(i, x * f, y * f, z * f);
    }
    g.scale(1, 1.15, 0.9).translate(BODY_C.x, BODY_C.y, BODY_C.z);
    const body = fz(g, 0.14, 201);
    g.dispose();
    const nor = body.attributes.normal;
    const col = body.attributes.color;
    for (let i = 0; i + 2 < col.count; i += 3) {
      const ny = nor.getY(i);
      const v = ny < -0.45 ? 0.6 : ny < -0.1 ? 0.78 : ny > 0.6 ? 1.06 : 1;
      for (let j = 0; j < 3; j++) col.setXYZ(i + j, col.getX(i + j) * v, col.getY(i + j) * v, col.getZ(i + j) * v);
    }
    body.deleteAttribute('uv');
    set.body = body;
  }

  // The knot's real (gnarled) surface, for seating the detail on it: a ray
  // from the knot's centre in a direction (azimuth, elevation as knot()),
  // `depth` u back inside it; `nrm` gets the facet's own normal there.
  const knotMesh = new Mesh(set.body, new MeshBasicMaterial({ side: DoubleSide }));
  const ray = new Raycaster();
  const dir = new Vector3();
  function onKnot(az, el, out, nrm, depth = 0) {
    knot(az, el, dir, null, 1).sub(BODY_C);
    const r0 = dir.length();
    dir.multiplyScalar(1 / r0);
    ray.set(BODY_C, dir);
    const hit = ray.intersectObject(knotMesh, false)[0];
    out.copy(BODY_C).addScaledVector(dir, (hit ? hit.distance : r0) - depth);
    if (nrm) {
      if (hit) nrm.copy(hit.face.normal);
      else knot(az, el, P, nrm, 1);
      if (nrm.dot(dir) < 0) nrm.negate();
    }
    return out;
  }

  // The bramble: nine thorn clusters, a bark rosette round the crown, two
  // strands round the flanks, the brows (one draw call for the crowd, the
  // knot's own material: the thorns a step lighter than the hide, the bark a
  // step darker). Every part is seated on the real knot: the thorns and
  // thornlets rooted in it, the bark half sunk into it, standing proud.
  set.bramble = bakeParts('thornling:bramble', () => {
    const out = [];
    const thorn = hornGeometry({ len: 1, r: 0.2, bend: 0.6, seg: 2, sides: 4, seed: 221 });
    const plate = scaleGeometry({ seed: 223 });
    const strand = scaleGeometry({ sides: 5, seed: 225 });
    const EN = new Vector3();
    // thorn clusters: [azimuth, elevation, length], where the classic's nine
    // spikes stood and as far out (their tips about 0.31 u from the middle,
    // inside the sim's 0.32 radius); mostly level, so from the camera they cut
    // a star round the knot; the face (|az| < 0.5, el 0..0.5) is left clear
    // for the eyes, and none rises beside the crown (the tell reads from the
    // top-down camera)
    const T = [
      [0.38, -0.62, 0.09],
      [0.98, 0.1, 0.13],
      [-0.92, 0.18, 0.125],
      [1.66, -0.22, 0.12],
      [-1.7, -0.14, 0.125],
      [2.32, 0.28, 0.13],
      [-2.38, 0.34, 0.125],
      [3.12, -0.05, 0.135],
      [-1.38, 0.4, 0.105],
    ];
    T.forEach(([az, el, len], i) => {
      onKnot(az, el, P, null, 0.03);
      knot(az, el, H, EN, 1);
      // out along the hide, raised a little toward the sky and hooked upward
      // (a rose thorn)
      H.copy(EN).addScaledVector(UP, 0.2);
      basis(H, UP, X, Y, Z);
      setTRS(m, P, X, Y, Z, len * THORN_W, len, len * THORN_W * 0.8);
      out.push({ geo: thorn, m: m.clone(), tone: 1.1 + 0.06 * (hash01(i, 5, 227) - 0.5) });
      // a thornlet at its foot, leaning its own way (the cluster)
      onKnot(az + 0.27, el - 0.14, P, null, 0.008);
      knot(az + 0.27, el - 0.14, H, EN, 1);
      H.copy(EN).addScaledVector(UP, 0.1);
      basis(H, UP, X, Y, Z);
      const h = len * 0.42;
      setTRS(m, P, X, Y, Z, h * 0.42, h, h * 0.5);
      out.push({ geo: wedge, m: m.clone(), tone: 1.02 });
    });
    // bark: a rosette of five low six-sided plates round the crown (the
    // buds' nest) and two over the back, each half sunk into the knot on its
    // own facet so it stands as raised bark, a step darker than the hide
    const BH = 0.045;
    for (let j = 0; j < 5; j++) {
      onKnot((j / 5) * Math.PI * 2 + 0.3, 1.12, P, N, BH * 0.5);
      basis(N, UP, X, Y, Z);
      setTRS(m, P, X, Y, Z, 0.1, BH, 0.09);
      out.push({ geo: plate, m: m.clone(), tone: j % 2 ? 0.86 : 0.9 });
    }
    for (const [az, el] of [[Math.PI - 0.5, 0.25], [Math.PI + 0.55, -0.1]]) {
      onKnot(az, el, P, N, BH * 0.5);
      basis(N, UP, X, Y, Z);
      setTRS(m, P, X, Y, Z, 0.1, BH, 0.11);
      out.push({ geo: plate, m: m.clone(), tone: 0.86 });
    }
    // two bramble strands winding back round the flanks: segments on a
    // helix, each laid along the strand, half sunk
    for (const [a0, e0, sgn] of [[0.9, -0.35, 1], [-0.9, -0.3, -1]]) {
      for (let k = 0; k < 5; k++) {
        const az = a0 + sgn * k * 0.42;
        const el = e0 + k * 0.09;
        onKnot(az, el, P, N, 0.013);
        knot(az + sgn * 0.1, el + 0.022, H, null, 1);
        knot(az, el, Y, null, 1);
        H.sub(Y);
        basis(N, H, X, Y, Z);
        setTRS(m, P, X, Y, Z, 0.045, 0.026, 0.12);
        out.push({ geo: strand, m: m.clone(), tone: 0.8 + 0.04 * (k % 2) });
      }
    }
    // a brow over each eye, slanted down to the middle (the classic's scowl)
    for (const side of [-1, 1]) {
      onKnot(side * 0.33, 0.42, P, N, 0.012);
      basis(N, new Vector3(-side * 0.55, 1, 0.2), X, Y, Z);
      setTRS(m, P, X, Y, Z, 0.085, 0.03, 0.04);
      out.push({ geo: plate, m: m.clone(), tone: 0.6 });
    }
    return out;
  });

  // Slit eyes (unlit charcoal: never round, never warm), where the classic
  // put them, half sunk into the knot's real surface.
  set.eyes = bakeParts('thornling:eyes', () => {
    const out = [];
    const bar = fz(new BoxGeometry(0.06, 0.022, 0.022), 0, 1);
    for (const side of [-1, 1]) {
      ray.set(P.set(side * 0.07, 0.46, 1), dir.set(0, 0, -1));
      const hit = ray.intersectObject(knotMesh, false)[0];
      const z = hit ? hit.point.z + 0.003 : 0.199;
      out.push({ geo: bar, m: new Matrix4().compose(new Vector3(side * 0.07, 0.46, z), new Quaternion().setFromEuler(new Euler(0, side * -0.3, side * 0.45)), new Vector3(1, 1, 1)) });
    }
    return out;
  });
  knotMesh.material.dispose();

  // THE corruption tell: one indigo bud (a faceted core in bright indigo,
  // four dim sepals round it), three of them on the crown row.
  set.bud = bakeParts('thornling:bud', () => {
    const out = [];
    const bright = new Color(TELL_INDIGO);
    const dim = new Color(TELL_INDIGO_DIM);
    out.push({ geo: fz(new IcosahedronGeometry(0.05, 0), 0.08, 231), m: new Matrix4().makeTranslation(0, 0.012, 0), tint: bright });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const o = new Vector3(Math.cos(a), 0, Math.sin(a));
      // a calyx under the bud: each sepal leaves below the core and ends
      // under its equator, so it frames the bud and never pierces it
      H.copy(UP).multiplyScalar(Math.cos(0.62)).addScaledVector(o, Math.sin(0.62));
      basis(H, o, X, Y, Z);
      setTRS(m, P.set(o.x * 0.03, -0.04, o.z * 0.03), X, Y, Z, 0.036, 0.043, 0.026);
      out.push({ geo: wedge, m: m.clone(), tint: dim });
    }
    return out;
  });

  // A root bone: a faceted five-sided unit segment (y 0..1), thick at its
  // start, thin at its end: the shins and the rootlet toes thicken toward
  // the floor, the thighs toward the knee (a knotted joint).
  set.root = fz(new CylinderGeometry(0.55, 1, 1, 5).translate(0, 0.5, 0), 0.12, 241);
  set.root.deleteAttribute('uv');
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Hips (body space at rest), feet homes (yaw-space floor), the root bones.
const HIPS = [new Vector3(-0.095, 0.21, 0), new Vector3(0.095, 0.21, 0)];
const HOMES = [new Vector3(-0.11, 0, 0.01), new Vector3(0.11, 0, 0.01)];
const L1 = 0.1;
const L2 = 0.11;
const ANKLE = 0.035;
// bow-legged: the knees bend out and a little forward
const BEND = [new Vector3(-0.9, 0, 0.45).normalize(), new Vector3(0.9, 0, 0.45).normalize()];
const R_THIGH = 0.034;
const R_SHIN = 0.045;
const R_TOE = 0.021;
const LIFT = 0.055;
const LIFT_STEP = 0.02; // a planted foot the body lifts more than this steps
const GAIT_REACH = 0.11;
// rootlet toes per foot: their headings (rad from +z toward +x), foot 0 is
// on its right (-x), foot 1 mirrors it
const TOES = [-0.2, -1.15, -(Math.PI - 0.45)];
const TOE_REACH = 0.058;
const PIVOT = new Vector3(0, 0.28, 0);
const CROWN_Y = 0.71;

export function buildThornlingFacet() {
  const G = geos();
  const F = createFoeFrame('thornling');
  const { body, spawn, track } = F;
  const briarMat = track(foeMaterial(BRIAR));
  const rootMat = track(foeMaterial(ROOT));
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const budMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });

  body.add(foePart(G.body, briarMat, 'full', 'thornling-knot'));
  body.add(foePart(G.bramble, briarMat, 'part', 'thornling-bramble'));
  body.add(foePart(G.eyes, eyeMat, false, 'thornling-eyes'));
  // the crown: three buds on one unlit row, and the classic's halo
  const crown = new Group();
  crown.name = 'thornling-crown';
  crown.position.set(0, CROWN_Y, 0);
  body.add(crown);
  const buds = instancedPart(G.bud, budMat, 3, { name: 'thornling-buds', moving: true, ink: false });
  crown.add(buds);
  const tellGlow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.4, opacity: 0.2 });
  tellGlow.material.toneMapped = false;
  tellGlow.material.color.copy(TELL_INDIGO_GLOW);
  crown.add(tellGlow);

  // Roots: four bones and six rootlet toes on one instanced row, placed by
  // the leg IK every frame (two draw calls with their ink).
  const roots = instancedPart(G.root, rootMat, 10, { name: 'thornling-roots', moving: true, inkPx: 1.8 });
  spawn.add(roots);
  // The contact shadow belongs to the floor (the group, not the yaw).
  F.group.add(groundShadow(0.28, 0.75));

  // Named points (B8): the planting point between the root feet (the
  // weapon: the patch springs from it), the crown (the tell), the face.
  const tipPt = namedPoint(spawn, 'thornling-tip', 0, 0.02, 0.01);
  const crownPt = namedPoint(crown, 'thornling-crown-point', 0, 0.04, 0);
  const mouth = namedPoint(body, 'thornling-mouth', 0, 0.38, 0.22);

  // (reach: how far a planted foot may trail before it must step, inside
  // the root leg's own sideways reach of about 0.114 u)
  const gait = createLegs({ homes: HOMES, groups: [[0], [1]], trigger: 0.06, reach: GAIT_REACH, lift: LIFT, durMin: 0.08, durMax: 0.13 });
  const gopt = { locked: true };
  const clock = createFoeClock();
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  const tipV = new Vector3();
  const q = new Quaternion();
  const sc = new Vector3();
  const pos = new Vector3();
  const tilt = new Vector3();
  const m = new Matrix4();
  let age = -1;
  let yawNow = 0;
  const lifted = [0, 0];
  // a foot drawn in from past its leg's reach this frame (clampReach): it
  // carries no weight and steps at the next update
  const clamped = [false, false];
  const drawn = [new Vector3(), new Vector3()];
  let lastPT = null;
  // each foot's world heading: kept while it is planted, so the rootlets
  // never sweep the floor as the body turns over them
  const footYaw = [0, 0];
  let lastX = null;
  let lastZ = 0;

  // The live plant, read from the sim's fields (the thornling sets no
  // e.telegraph: its root is the telegraph).
  const plant = { R: null, start: 0, due: 0, gk: 0, sk: 0, contact: null, side: 1, struck: false };
  const rootTel = { telegraph: { startTick: 0, resolveTick: 0 } };
  const strike = { id: 'plant', tick: 0 };
  let seenPlant = null; // the last e.plantTick this rig has accounted for
  const recover = { t0: -1, from: { ...REST } };

  const lab = {
    abilities: THORNLING_ABILITIES,
    override: null, // { id: 'plant', t } | null
    lastStrike: null, // { id, tick }: the sim tick the latest live stamp's contact lands on
    feet: () => gait.feet().map((f, i) => ({ ...f, planted: f.planted && !clamped[i] && !(lifted[i] > LIFT_STEP), drawnX: drawn[i].x, drawnZ: drawn[i].z, drawnY: drawn[i].y })),
    pose: () => ({ ...cur }),
    get plant() {
      return plant.R === null ? null : { R: plant.R, due: plant.due, contact: plant.contact };
    },
    parts: { body, crown, buds, roots },
  };

  // Start the recover blend from wherever the pose is (a plant cut short).
  function cancelPlant(now) {
    Object.assign(recover.from, cur);
    recover.t0 = now;
    plant.R = null;
  }

  function beginPlant(R) {
    plant.R = R;
    plant.start = R - ROOT_TICKS;
    plant.due = R;
    plant.gk = 0;
    plant.sk = 0;
    plant.contact = null;
    plant.struck = false;
    // the stamp coils to alternate sides plant to plant (deterministic)
    plant.side = Math.floor(R / PLANT_EVERY) % 2 ? -1 : 1;
    recover.t0 = -1;
  }

  // The live plant: the ability's time (s) this frame, or -1 at rest.
  // `tick` is the SHOWN tick (P.tick + 1: the layer passes the state's tick
  // - 1 + alpha, while e's fields are that state's own), so the whole stamp
  // plays and its contact lands on the frame the plant first shows.
  function livePlant(e, tick, now) {
    if (!e) {
      plant.R = null;
      return -1;
    }
    const alive = !(e.hp <= 0);
    const plantTick = e.plantTick ?? -1;
    if (seenPlant === null) seenPlant = plantTick; // a plant from before this rig is history
    if (e.mode === 'root' && e.rootUntil > 0 && e.rootUntil !== plant.R && plantTick < e.rootUntil && alive) {
      // the root began: the anticipation runs from its first tick
      beginPlant(e.rootUntil);
    } else if (plant.R === null && plantTick >= 0 && plantTick !== seenPlant && tick - plantTick < 6) {
      // a plant whose root this rig never saw (a late rig, a sparse guest
      // snapshot): straight to its contact
      beginPlant(plantTick);
      plant.gk = 1;
      plant.sk = 1;
    }
    if (plantTick >= 0 && plantTick !== seenPlant && (plant.R === null || plantTick >= plant.R)) seenPlant = plantTick;
    if (plant.R === null) return -1;

    if (plant.contact === null) {
      // the sim planted (e.mode back to 'skulk', e.plantTick set): visible
      // from the frame the sim has run that tick, up to a tick before the
      // interpolated clock reaches it
      const resolved = e.mode !== 'root' && plantTick >= plant.R;
      if (!alive || (e.state && e.state !== 'active') || (e.mode !== 'root' && !resolved)) {
        // killed, gone with the room (the sim resolves only an active foe)
        // or let go before the plant: it never stamps
        cancelPlant(now);
        return -1;
      }
      // the plant tick: rootUntil, or later if a stun or a blind outlasts
      // the root (sim/enemies.js skips the resolve while either holds, so
      // the plant lands on the first free tick); once planted, its own tick
      let due = plant.R;
      if (resolved) due = plantTick;
      else {
        const st = e.status;
        if (st && st.stun && st.stun.untilTick > due) due = st.stun.untilTick;
        if (st && st.blind && st.blind.untilTick > due) due = st.blind.untilTick;
      }
      plant.due = due;
      // the root's progress up to the strike drives the anticipation; the
      // last 2.5 frames before the plant tick run the stamp (both only move
      // forward: a status that lands late holds the body still)
      const rt = rootTel.telegraph;
      rt.startTick = plant.start;
      rt.resolveTick = due - STRIKE_TICKS;
      plant.gk = Math.max(plant.gk, telegraphProgress(rootTel, tick));
      rt.startTick = due - STRIKE_TICKS;
      rt.resolveTick = due;
      const sk = telegraphProgress(rootTel, tick);
      if (sk > 0) plant.sk = Math.max(plant.sk, sk);
      if ((plant.sk > 0 || resolved) && (!plant.struck || strike.tick !== due)) {
        // the stamp began (or its plant tick moved): its contact lands
        // (due - tick) / 60 s from now, so on tick + that * 60: the sim's
        // plant tick
        plant.struck = true;
        strike.tick = due;
        lab.lastStrike = strike;
      }
      if (resolved && tick >= due) plant.contact = now - (tick - due) / 60;
      else if (plant.sk >= 1) return ROOT_SEC; // contact held until the sim confirms
      else return plant.sk > 0 ? GATHER_END + plant.sk * STRIKE : plant.gk * GATHER_END;
    }
    const t = ROOT_SEC + (now - plant.contact);
    if (t >= PLANT_TL.duration) {
      plant.R = null;
      return -1;
    }
    return t;
  }

  function placeRoots(dig, spread) {
    body.updateMatrix();
    let mx = 0;
    let mz = 0;
    for (let i = 0; i < 2; i++) {
      const o = gait.out[i];
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(o);
      foot.y += ANKLE;
      lifted[i] = liftToReach(hipW, foot, L1, L2);
      // the last guard: a foot still past the root's reach (a knockback, a
      // fast strafe) is drawn in along the floor and steps at once; one the
      // body hauled more than a toe's height off the floor carries no weight
      // either and steps too
      clamped[i] = clampReach(hipW, foot, L1, L2) > 0;
      if (clamped[i] || lifted[i] > LIFT_STEP) gait.release(i);
      drawn[i].set(foot.x, foot.y - ANKLE, foot.z);
      solveKnee(hipW, foot, L1, L2, BEND[i], knee);
      // the thigh from the knee (its knot) up into the body, the shin from
      // the ankle (thick, a root) up to the knee
      roots.setMatrixAt(i * 2, segmentMatrix(m, knee, hipW, R_THIGH, R_THIGH, 0.02));
      roots.setMatrixAt(i * 2 + 1, segmentMatrix(m, foot, knee, R_SHIN, R_SHIN, 0.015));
      // the rootlet toes: from the ankle out to the floor. A planted toe's tip
      // never slides: the grip swells the rootlets and the plant stabs the
      // tips straight down into the floor; a stepping foot curls them in, by
      // its step's height, so they land where they curl out again (a planted
      // foot the body lifts keeps its tips on the floor)
      const curl = Math.min(1, o.y / (LIFT * 0.5));
      const heading = footYaw[i] - yawNow;
      const sgn = i === 0 ? 1 : -1;
      const rt = R_TOE * (1 + 0.35 * spread);
      for (let j = 0; j < 3; j++) {
        const a = heading + sgn * TOES[j];
        const r = TOE_REACH * (1 - 0.25 * curl);
        tipV.set(foot.x + Math.sin(a) * r, -0.05 * dig * (1 - curl) + curl * (foot.y - ANKLE - 0.012), foot.z + Math.cos(a) * r);
        roots.setMatrixAt(4 + i * 3 + j, segmentMatrix(m, foot, tipV, rt, rt, 0.006));
      }
      mx += o.x;
      mz += o.z;
    }
    roots.instanceMatrix.needsUpdate = true;
    tipPt.position.set(mx / 2, 0.02, mz / 2);
  }

  function placeBuds(bloom, now) {
    const b = Math.max(-0.2, Math.min(1.4, bloom));
    const bo = Math.max(0, b);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.35;
      // the classic's bloom: each bud rises with it, the later ones higher
      pos.set(Math.cos(a) * 0.07, 0.04 * bo * (1 + i * 0.3) + 0.004 * Math.sin(now * 2.4 + i * 2.1), Math.sin(a) * 0.07);
      // and opens: the bud tips out and its sepals splay
      tilt.set(Math.sin(a), 0, -Math.cos(a));
      q.setFromAxisAngle(tilt, 0.12 + 0.3 * bo);
      sc.set(1 + 0.1 * b, 1 - 0.12 * b, 1 + 0.1 * b);
      buds.setMatrixAt(i, m.compose(pos, q, sc));
    }
    buds.instanceMatrix.needsUpdate = true;
  }

  function pose(P) {
    const dt = clock.step(P);
    const now = clock.now;
    const e = P.e || null;
    const tick = P.tick ?? 0;
    const turntable = !!P.turntable;
    // B7: grow from the floor (not on the Journal's turntable, nor where the
    // caller says the foe stands grown: the lab)
    if (age < 0) age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    spawn.scale.setScalar(spawnScale(age));

    // --- the plant: the lab's pure override, or the live root
    let poseSide = 1;
    if (lab.override) thornlingPlantPose(Math.min(PLANT_TL.duration, Math.max(0, lab.override.t)), cur, 1);
    else {
      const t = livePlant(e, tick + 1, now);
      if (t >= 0) {
        poseSide = plant.side;
        thornlingPlantPose(t, cur, poseSide);
      } else if (recover.t0 >= 0 && now - recover.t0 < 6 * FRAME) {
        // a plant cut short eases home with one small overshoot (B5)
        lerpPose(cur, recover.from, REST, 1 - settle((now - recover.t0) / (6 * FRAME)));
      } else Object.assign(cur, REST);
    }

    // --- feet: locked to the floor, stepping on their own
    const gx = F.group.position.x;
    const gz = F.group.position.z;
    fr.x = gx;
    fr.z = gz;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    // a lab scrub (no time passing) stands the feet on their homes: a still
    // frame has no step history to show
    // A frame that took longer than a step (a weak machine at a few fps) on a
    // body that moved further than a foot may trail cannot show a step: the
    // feet stand afresh under it, a still of the scurry (rule 2 holds: no
    // planted foot is dragged, no root stretched)
    const moved = lastX === null ? 0 : Math.hypot(gx - lastX, gz - lastZ);
    const wall = lastPT === null ? 0 : (P.t ?? 0) - lastPT;
    lastPT = P.t ?? 0;
    const slow = wall > 0.12 && moved > GAIT_REACH * fr.s;
    const locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override) && !slow;
    const jumped = lastX === null || moved > 1.5 || (dt <= 0 && moved > 1e-4);
    lastX = gx;
    lastZ = gz;
    gopt.locked = locked;
    gait.update(dt, fr, gopt);
    for (let i = 0; i < 2; i++) if (!locked || jumped || gait.out[i].y > 1e-5) footYaw[i] = yawNow;
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = Math.max(-1, Math.min(1, lv.z / MOVE_SPEED));
    const side = Math.max(-1, Math.min(1, lv.x / MOVE_SPEED));

    // --- the body: the plant's pose, the lean along the real travel (in on
    // an advance, back on a backpedal, aside on a strafe), the waddle onto
    // the planted root, the skulker's nervous sway and the breath
    const breath = Math.sin(now * 2.3);
    const waddle = ((gait.out[0].y - gait.out[1].y) / LIFT) * 0.07;
    // (the sway hands over to the plant as the crown opens, and back as it
    // shuts, so neither pops)
    const sway = 0.05 * Math.sin(now * 1.7) * (1 - Math.min(1, Math.abs(cur.bloom) * 3));
    body.rotation.set(cur.pitch + 0.14 * fwd, cur.twist + sway, cur.roll - 0.12 * side - waddle);
    body.scale.set(cur.sx, cur.sy * (1 + 0.015 * breath), 1 + (cur.sx - 1) * 0.5);
    placeBody(body, PIVOT, cur.push, -cur.sink + 0.016 * bob + 0.004 * breath);
    // the crown: the bloom (the classic's x1.9 when rooted), a slow breath
    const bloom = cur.bloom;
    crown.scale.setScalar(1 + 0.9 * bloom + 0.08 * Math.sin((P.t ?? 0) * 3) * (1 - 0.6 * Math.min(1, Math.abs(bloom))));
    crown.rotation.set(-0.55 * cur.pitch, 0.25 * Math.sin(now * 0.7) + 0.5 * bloom * poseSide, 0); // the buds stay up as the knot pitches
    placeBuds(bloom, now);
    tellGlow.material.opacity = 0.18 + 0.3 * Math.max(0, Math.min(1.2, bloom));

    // --- roots: the hips ride the body, the feet stand where the gait put
    // them (a foot the body rears out of reach of lifts straight up)
    placeRoots(cur.dig, cur.spread);
  }

  return {
    group: F.group,
    mats: F.mats,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    pose,
    // the node that moves (spawn > body, the roots row): the shared hit
    // envelope wraps it; the contact shadow stays on the group, on the floor
    body: F.yaw,
    lab,
    modelStandard: true,
    points: { tip: tipPt, hand: tipPt, crown: crownPt, mouth },
    // The shared hit envelope's tuning (§6.1 item 9): a small, light knot on
    // two roots squashes and flinches a touch more than a boar and is knocked
    // further; the flinch bulges at the knot's middle.
    react: { squash: 1.1, flinch: 1.15, knock: 1.25, axis: 'y', midY: 0.4 },
    // (item 10) a light body: a smaller swell, thrown further.
    death: { swell: 0.9, throw: 1.25 },
  };
}
