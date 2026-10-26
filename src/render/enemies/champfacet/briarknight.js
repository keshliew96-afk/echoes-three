// THE BRIAR KNIGHT, MODEL STANDARD (docs/MODEL_STANDARD.md "Level I
// champions"). The Hollow Wood's first champion rebuilt in the faceted look
// of Kesh's sample video, on top of the chibi ink style, keeping the classic
// rig's identity (render/enemies/champions.js): a knight grown out of the
// Wood, bark plates over a dark trunk, root legs, a thorn-crested helm with
// the ONE indigo tell in its visor slit, a long briar lance in the right hand,
// a thorn buckler on the left arm and a moss cape. What the standard adds:
//
//   * two rings of ridged bark plates laid brick-wise round the chest, a
//     faceted helm with a fan of thorn crest blades, thorn pauldrons, a belt
//     of root knots, a barbed lance with a leaf-blade tip, a seven-sided
//     buckler with a thorn boss and a ring of thorns, a cape of moss strips
//     that swing on their own;
//   * TWO LOCKED ROOT FEET (render/facet/gait.js): each foot is pinned to the
//     floor while it carries weight and the legs reach it by two-bone IK; it
//     steps along the real travel, and a foot the leg can no longer reach
//     lifts, never slides; both arms reach their hands by the same IK;
//   * two ability timelines driven by the sim:
//       Bramble Charge  couch (the warning less one strike: the lance comes
//                       level under the arm, the body cocks back on a long
//                       lead step, the buckler up), drive (2.5 frames: thrown
//                       forward into the run), run (held while the sim
//                       charges, the cape streaming), stop (a braced skid
//                       with the recoil), settle with one overshoot;
//       Thorn Ring      raise (the warning less one strike: the lance lifted
//                       high, point down, the stance wide), plant (2.5
//                       frames, landing on the ring's tick: the lance driven
//                       into the floor, the knees deep), contact held,
//                       recoil, settle;
//   * the [M] beats (render/facet/beats.js): a spawn-in grow from the floor,
//     named points (the lance `tip`, the lance `hand`, the `shield`, the
//     `visor`, each foot), and the hit reaction is the shared overlay's
//     (render/react.js), tuned by `react`.
//
// Same interface as the classic (group, mats, setYaw, pose), plus `lab`,
// `points`, `react`. Faces +Z. Render only: it reads the sim entity and never
// writes it; every clip runs off pose's t.
import { Color, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { addInk, exactColor, groundShadow } from '../../critters/common.js';
import { PALETTE } from '../../../data/palette.js';
import { makeGlowSprite } from '../../glow.js';
import { sharedGeo } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize, facetMaterial } from '../../facet/material.js';
import { PART_INK_PX, instancedPart, mottle, placeRow, plateGeometry, wedgeGeometry } from '../../facet/kit.js';
import { lay, limbBox, taperBox } from '../../facet/shapes.js';
import { createLegs } from '../../facet/legs.js';
import { aimSegment, solveTwoBone } from '../../facet/gait.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../../facet/beats.js';

// --- Colour: the classic Briar Knight's hides (champions.js C), unchanged.
const BARK = HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.45).multiplyScalar(0.95);
const BARK_DARK = HIDE.boarDark.clone().multiplyScalar(0.8);
const MOSS = new Color(PALETTE.sageCloak).lerp(new Color(PALETTE.signalBlue), 0.25).multiplyScalar(0.9);
const THORN = new Color(PALETTE.bone).lerp(new Color(PALETTE.sageCloak), 0.35).multiplyScalar(0.75);
// the standard's value steps: a lit plate one step over the bark, a deep
// moss under the cape strips
const BARK_LIT = BARK.clone().lerp(new Color(PALETTE.bone), 0.18);
const MOSS_DARK = MOSS.clone().multiplyScalar(0.62);

// The hit flash (the enemy layer lifts emissiveIntensity on every mat).
const flashable = (color) => facetMaterial(color, { emissive: '#FFFFFF', emissiveIntensity: 0 });

// --- Body plan (yaw space, faces +Z). The body pivots at the hips.
const HIP_Y = 0.92;
const UPPER = 0.5;
const LOWER = 0.52;
const FOOT_H = 0.07;
// [hip x, home x, home z, gait group]
const LEGS = [
  [-0.2, -0.27, 0.02, 0],
  [0.2, 0.27, -0.02, 1],
];
const ARM_A = 0.42;
const ARM_B = 0.44;
const SHOULDER_L = [-0.5, 1.68, 0.0];
const SHOULDER_R = [0.5, 1.68, 0.02];
// the lance (its own space: the grip at the origin, +Y toward the tip)
const LANCE_BUTT = -0.62;
const LANCE_LEN = 2.25; // butt to the tip's base
const TIP_LEN = 0.6;
export const KNIGHT_WALK = 1.25; // u/s, BK.moveSpeed (sim/enemies/champions.js)
export const KNIGHT_CHARGE = 9.0; // u/s, BK.chargeSpeed

// --- Ability timelines (render only; the sim's numbers: a 60-tick charge
// lane, a 72-tick thorn ring).
export const KNIGHT_ABILITIES = Object.freeze({
  charge: createTimeline('charge', 'Bramble Charge', [
    { id: 'couch', label: 'couch the lance', dur: 0.75 },
    { id: 'drive', label: 'drive', dur: STRIKE_SEC },
    { id: 'run', label: 'charge', dur: 0.6 },
    { id: 'stop', label: 'braced stop', dur: HOLD_SEC + 0.1 },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: 0.75 + STRIKE_SEC, id: 'charge' }] }),
  ring: createTimeline('ring', 'Thorn Ring', [
    { id: 'raise', label: 'raise the lance', dur: 0.85 },
    { id: 'plant', label: 'plant', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: 0.85 + STRIKE_SEC, id: 'ring' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (all 0 at rest):
//   couch  0..1 the lance level under the arm    raise  0..1 the lance high, point down
//   plant  0..1 the lance driven into the floor  lean   body pitch, + forward
//   crouch 0..1 the knees bend, the hips sink    step   0..1 the left foot leads, the right sets back
//   wide   0..1 the feet set apart               guard  0..1 the buckler up and forward
//   run    0..1 the charge (cape streaming)      squash 0..1 the contact squash (B9)
//   shove  0..1 the recoil (B3)                  fever  0..1 the visor flares
const KEYS = ['couch', 'raise', 'plant', 'lean', 'crouch', 'step', 'wide', 'guard', 'run', 'squash', 'shove', 'fever'];
function restChannels(C) {
  for (const k of KEYS) C[k] = 0;
  return C;
}
const lerp = (a, b, k) => a + (b - a) * k;
const ZERO = restChannels({});
const COCKED = { couch: 1, raise: 0, plant: 0, lean: -0.2, crouch: 0.4, step: 1, wide: 0, guard: 1, run: 0, squash: 0, shove: 0, fever: 1 };
const DRIVEN = { couch: 1, raise: 0, plant: 0, lean: 0.34, crouch: 0.22, step: 0.2, wide: 0, guard: 1, run: 1, squash: 1, shove: 0, fever: 0.8 };
const RUNNING = { couch: 1, raise: 0, plant: 0, lean: 0.3, crouch: 0.2, step: 0, wide: 0, guard: 1, run: 1, squash: 0, shove: 0, fever: 0.8 };
const STOPPED = { couch: 0.85, raise: 0, plant: 0, lean: -0.16, crouch: 0.5, step: 1, wide: 0.3, guard: 0.7, run: 0, squash: 1, shove: 0, fever: 0.6 };
const RAISED = { couch: 0, raise: 1, plant: 0, lean: -0.12, crouch: 0.12, step: 0.3, wide: 1, guard: 0, run: 0, squash: 0, shove: 0, fever: 1 };
const PLANTED = { couch: 0, raise: 0, plant: 1, lean: 0.3, crouch: 0.62, step: 0.7, wide: 1, guard: 0, run: 0, squash: 1, shove: 0, fever: 1 };
function mixPose(C, A, B, k) {
  for (const key of KEYS) C[key] = lerp(A[key], B[key], k);
  return C;
}

// Pure: the channels of an ability at a timeline sample. `from` is the pose
// the ability starts out of (B1/B5: a wind-up grows out of the last move's
// tail, never a snap from rest); the lab passes none.
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'charge') {
    if (s.id === 'couch') mixPose(C, from, COCKED, ease.inOut(Math.min(1, k * 1.2)));
    else if (s.id === 'drive') mixPose(C, COCKED, DRIVEN, kick(k)); // B4: off on the press frame
    else if (s.id === 'run') {
      mixPose(C, DRIVEN, RUNNING, ease.out(Math.min(1, k * 3)));
    } else if (s.id === 'stop') {
      mixPose(C, RUNNING, STOPPED, kick(Math.min(1, k * 2.2)));
      C.shove = recoil(k * (HOLD_SEC + 0.1)); // B3: the stop shoves it back on its heels
    } else {
      mixPose(C, ZERO, STOPPED, settle(k));
      C.squash = 0;
      C.shove = recoil(HOLD_SEC + 0.1 + k * 0.5);
    }
  } else if (id === 'ring') {
    if (s.id === 'raise') mixPose(C, from, RAISED, ease.inOut(Math.min(1, k * 1.15)));
    else if (s.id === 'plant') mixPose(C, RAISED, PLANTED, kick(k));
    else if (s.id === 'hold') mixPose(C, PLANTED, PLANTED, 0);
    else if (s.id === 'recoil') {
      mixPose(C, PLANTED, PLANTED, 0);
      C.squash = 1 - ease.out(k);
      C.shove = recoil(k * 0.2);
    } else {
      mixPose(C, ZERO, PLANTED, settle(k));
      C.squash = 0;
      C.shove = recoil(0.2 + k * 0.5);
    }
  }
  return C;
}

// --- The lance hand's key poses (torso space): [hand x, y, z, lance pitch]
// with the pitch 0 upright, PI/2 level forward, PI point down.
const HAND_REST = [0.58, 1.16, 0.3, 0.12];
const HAND_COUCH = [0.36, 1.26, 0.06, Math.PI / 2 + 0.06];
const HAND_RAISE = [0.4, 2.42, 0.2, Math.PI - 0.08];
const HAND_PLANT = [0.34, 1.62, 0.5, Math.PI - 0.42];
const SHIELD_REST = [-0.6, 1.3, 0.22];
const SHIELD_GUARD = [-0.36, 1.42, 0.58];
const SHIELD_OUT = [-0.86, 1.52, 0.12];
// the walk's arm swing (u, the hands' z, opposite to the feet)
const SWING = 0.08;

// --- Geometry (shared, faceted once).
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:briar-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  hip: () => geo('hip', () => new CylinderGeometry(0.33, 0.27, 0.32, 7), 201),
  chest: () => geo('chest', () => new CylinderGeometry(0.44, 0.33, 0.66, 7), 203),
  neck: () => geo('neck', () => new CylinderGeometry(0.13, 0.17, 0.16, 6), 205),
  helm: () => geo('helm', () => new CylinderGeometry(0.17, 0.22, 0.4, 6), 207),
  brim: () => geo('brim', () => taperBox(0.38, 0.08, 0.34, 0.8, 1, 0.02), 209),
  paul: () => geo('paul', () => new IcosahedronGeometry(0.2, 0), 211, 0.12),
  thigh: () => geo('thigh', () => limbBox(0.2, 0.21, UPPER, 0.7, 0.72), 213),
  shin: () => geo('shin', () => limbBox(0.15, 0.16, LOWER, 0.78, 0.8), 215),
  foot: () => geo('foot', () => taperBox(0.2, FOOT_H, 0.3, 0.7, 0.6).translate(0, FOOT_H / 2, 0.04), 217, 0.12),
  upperArm: () => geo('upper-arm', () => limbBox(0.15, 0.15, ARM_A, 0.8, 0.8), 219),
  foreArm: () => geo('fore-arm', () => limbBox(0.12, 0.12, ARM_B, 0.85, 0.85), 221),
  fist: () => geo('fist', () => new IcosahedronGeometry(0.09, 0), 223, 0.1),
  shaft: () => geo('shaft', () => new CylinderGeometry(0.045, 0.06, LANCE_LEN, 6).translate(0, LANCE_BUTT + LANCE_LEN / 2, 0), 225),
  tip: () => geo('tip', () => new CylinderGeometry(0, 0.12, TIP_LEN, 4).scale(1, 1, 0.45).translate(0, LANCE_BUTT + LANCE_LEN + TIP_LEN / 2, 0), 227, 0.14),
  buckler: () => geo('buckler', () => new CylinderGeometry(0.34, 0.34, 0.08, 7).rotateX(Math.PI / 2), 229),
  boss: () => geo('boss', () => new CylinderGeometry(0, 0.1, 0.28, 5).rotateX(Math.PI / 2).translate(0, 0, 0.16), 231, 0.12),
  knot: () => geo('knot', () => new IcosahedronGeometry(0.07, 0), 233, 0.12),
  visor: () => sharedGeo('briar-visor', () => new CylinderGeometry(0.02, 0.02, 0.26, 4).rotateZ(Math.PI / 2)),
};

const _m = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const POLE_KNEE = new Vector3(0, 0.05, 1);
const POLE_ELBOW_R = new Vector3(0.6, -0.4, -1);
const POLE_ELBOW_L = new Vector3(-0.6, -0.4, -1);

function tellGlow(size, opacity) {
  const g = makeGlowSprite({ color: TELL_INDIGO_GLOW, size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(TELL_INDIGO_GLOW);
  return g;
}

export function buildBriarKnightFacet() {
  const group = new Group();
  group.name = 'briar_knight';
  group.userData.modelStandard = true;
  const yaw = new Group(); // the root's first child: the hit overlay wraps it
  group.add(yaw);
  const grow = new Group(); // B7 spawn-in scale
  yaw.add(grow);
  const pivot = new Group(); // the body, pivoting at the hips
  pivot.position.set(0, HIP_Y, 0);
  grow.add(pivot);
  const squashG = new Group(); // the contact squash, about the hips
  pivot.add(squashG);
  const torso = new Group(); // torso space = the classic rig's space
  torso.position.set(0, -HIP_Y, 0);
  squashG.add(torso);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const bark = track(flashable(BARK));
  const barkLit = track(flashable(BARK_LIT));
  const dark = track(flashable(BARK_DARK));
  const moss = track(flashable(MOSS));
  const mossDark = track(flashable(MOSS_DARK));
  const thorn = track(flashable(THORN));
  const tellMat = new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();
  const plate = plateGeometry();

  // --- The trunk: a dark hip drum under a wider bark chest.
  const hip = mesh(G.hip(), dark, torso);
  hip.position.y = 0.99;
  const chest = mesh(G.chest(), bark, torso);
  chest.position.y = 1.43;
  // two rings of ridged bark plates, laid brick-wise, the upper ring lit
  const PLATES = 9;
  const plates = placeRow(plate, bark, PLATES * 2, (i, m) => {
    const ring = i < PLATES ? 0 : 1;
    const j = i % PLATES;
    const a = ((j + ring * 0.5) / PLATES) * Math.PI * 2;
    const r = ring ? 0.41 : 0.37;
    const y = ring ? 1.6 : 1.3;
    lay(m, Math.sin(a) * r, y, Math.cos(a) * r, Math.sin(a), ring ? 0.25 : -0.1, Math.cos(a), 0.2, 0.16, ring ? 0.3 : 0.28, 0.05 * (j % 3 - 1));
  }, { name: 'briar-plates', inkPx: PART_INK_PX, mottle: 0.12, seed: 41 });
  torso.add(plates);
  // a belt of root knots round the hip
  const knots = placeRow(G.knot(), barkLit, 8, (i, m) => {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    lay(m, Math.sin(a) * 0.33, 1.12, Math.cos(a) * 0.33, Math.sin(a), 0.3, Math.cos(a), 1.1, 0.8, 1.2);
  }, { name: 'briar-knots', inkPx: PART_INK_PX, mottle: 0.1, seed: 43 });
  torso.add(knots);
  // a skirt of bark tassets over the thighs
  const tassets = placeRow(wedge, dark, 6, (i, m) => {
    const a = -1.1 + (i / 5) * 2.2 + (i > 2 ? 0.0 : 0);
    lay(m, Math.sin(a) * 0.3, 0.98, Math.cos(a) * 0.3, Math.sin(a) * 0.35, -1, Math.cos(a) * 0.35, 0.32, 0.36, 0.5, a);
  }, { name: 'briar-tassets', inkPx: PART_INK_PX, mottle: 0.12, seed: 45 });
  torso.add(tassets);

  // --- Pauldrons sprouting thorns.
  const pauls = [];
  for (const side of [-1, 1]) {
    const p = mesh(G.paul(), barkLit, torso);
    p.scale.set(1.3, 0.85, 1.1);
    p.position.set(side * 0.52, 1.74, 0);
    pauls.push(p);
  }
  const paulThorns = placeRow(wedge, thorn, 8, (i, m) => {
    const side = i < 4 ? -1 : 1;
    const k = i % 4;
    lay(m, side * (0.52 + k * 0.05), 1.86, -0.12 + k * 0.08, side * (0.6 + k * 0.15), 1, -0.1 + k * 0.1, 0.1, 0.24 - k * 0.02, 0.4);
  }, { name: 'briar-paul-thorns', inkPx: PART_INK_PX, mottle: 0.08, seed: 47 });
  torso.add(paulThorns);

  // --- The helm: a faceted pot with a brim, a fan of thorn crest blades and
  // the indigo visor slit (the ONE tell).
  const head = new Group();
  head.position.set(0, 1.98, 0);
  torso.add(head);
  mesh(G.neck(), dark, torso).position.set(0, 1.82, 0);
  const helm = mesh(G.helm(), dark, head);
  helm.position.y = 0.02;
  const brim = mesh(G.brim(), barkLit, head);
  brim.position.set(0, 0.08, 0.06);
  const crest = placeRow(wedge, thorn, 7, (i, m) => {
    const a = -0.9 + i * 0.3;
    lay(m, Math.sin(a) * 0.12, 0.18, -Math.cos(a) * 0.04, Math.sin(a) * 0.8, 1, -0.35, 0.16, 0.46 - Math.abs(a) * 0.12, 0.45);
  }, { name: 'briar-crest', inkPx: PART_INK_PX, mottle: 0.08, seed: 49 });
  head.add(crest);
  const cheeks = placeRow(wedge, dark, 2, (i, m) => {
    const side = i ? 1 : -1;
    lay(m, side * 0.15, -0.06, 0.1, side * 0.2, -1, 0.3, 0.18, 0.2, 0.5);
  }, { name: 'briar-cheeks', inkPx: PART_INK_PX, mottle: 0 });
  head.add(cheeks);
  const visor = new Mesh(G.visor(), tellMat);
  visor.position.set(0, 0.02, 0.205);
  head.add(visor);
  const visorGlow = tellGlow(0.45, 0.32);
  visorGlow.position.set(0, 0.02, 0.24);
  head.add(visorGlow);

  // --- The moss cape: five strips hung from the shoulders, each swinging on
  // its own phase, with a row of moss lumps along the collar.
  const cape = new Group();
  cape.position.set(0, 1.78, -0.3);
  torso.add(cape);
  const strips = [];
  for (let i = 0; i < 5; i++) {
    const x = -0.36 + i * 0.18;
    const g = new Group();
    g.position.set(x, 0, -Math.abs(x) * 0.12);
    cape.add(g);
    const len = 1.18 - Math.abs(i - 2) * 0.08;
    const strip = new Mesh(sharedGeo(`facet:briar-strip-${len}`, () => facetize(taperBox(0.2, len, 0.05, 1, 1).translate(0, -len / 2, 0), { jitter: 0.1, seed: 251 + i })), i % 2 ? mossDark : moss);
    addInk(strip);
    g.add(strip);
    // the tattered end: two blades hanging off the strip
    const ends = placeRow(wedge, mossDark, 2, (j, m) => lay(m, (j ? 0.05 : -0.05), -len + 0.02, 0, j ? 0.15 : -0.15, -1, 0, 0.14, 0.18, 0.4), { name: 'briar-cape-ends', inkPx: PART_INK_PX, mottle: 0.1, seed: 61 + i });
    g.add(ends);
    strips.push({ g, ph: i * 1.3, x });
  }
  const collar = placeRow(G.knot(), moss, 7, (i, m) => {
    const a = -1.4 + (i / 6) * 2.8;
    lay(m, Math.sin(a) * 0.4, 1.8, Math.cos(a) * 0.3 - 0.06, 0, 1, 0, 1.8, 1.1, 1.6);
  }, { name: 'briar-collar', inkPx: PART_INK_PX, mottle: 0.16, seed: 63 });
  torso.add(collar);

  // --- Arms: upper arm and forearm reaching the hands by IK.
  const arms = [SHOULDER_L, SHOULDER_R].map((sh, i) => {
    const upper = new Group();
    mesh(G.upperArm(), bark, upper);
    const fore = new Group();
    mesh(G.foreArm(), dark, fore);
    const fist = mesh(G.fist(), dark, torso);
    torso.add(upper, fore);
    return { side: i ? 1 : -1, shoulder: new Vector3(...sh), elbow: new Vector3(), hand: new Vector3(), upper, fore, fist, pole: i ? POLE_ELBOW_R : POLE_ELBOW_L };
  });
  // the briar lance (right): a barbed shaft and a leaf-blade tip
  const lance = new Group();
  torso.add(lance);
  mesh(G.shaft(), dark, lance);
  mesh(G.tip(), thorn, lance);
  const barbs = placeRow(wedge, thorn, 8, (i, m) => {
    const side = i % 2 ? 1 : -1;
    const y = 0.15 + i * 0.17;
    lay(m, side * 0.05, y, 0, side, 0.9, 0, 0.08, 0.17, 0.4);
  }, { name: 'briar-barbs', inkPx: PART_INK_PX, mottle: 0.08, seed: 65 });
  lance.add(barbs);
  const vamp = placeRow(wedge, barkLit, 4, (i, m) => {
    const a = (i / 4) * Math.PI * 2;
    lay(m, Math.cos(a) * 0.05, -0.02, Math.sin(a) * 0.05, Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4, 0.14, 0.26, 0.5);
  }, { name: 'briar-vamplate', inkPx: PART_INK_PX, mottle: 0 });
  lance.add(vamp);
  // the thorn buckler (left), its face +Z
  const shield = new Group();
  torso.add(shield);
  mesh(G.buckler(), bark, shield);
  mesh(G.boss(), thorn, shield);
  const rim = placeRow(wedge, thorn, 7, (i, m) => {
    const a = (i / 7) * Math.PI * 2;
    lay(m, Math.cos(a) * 0.33, Math.sin(a) * 0.33, 0.02, Math.cos(a), Math.sin(a), 0.25, 0.08, 0.14, 0.4);
  }, { name: 'briar-rim', inkPx: PART_INK_PX, mottle: 0.08, seed: 67 });
  shield.add(rim);

  // --- Legs: thigh and shin reaching the locked root feet by IK; each foot
  // a flat root with three toes splayed and a knot at the ankle.
  const legs = LEGS.map(([hx, fx, fz, grp], i) => {
    const upper = new Group();
    mesh(G.thigh(), dark, upper);
    const lower = new Group();
    mesh(G.shin(), dark, lower);
    const foot = new Group();
    mesh(G.foot(), dark, foot);
    foot.add(placeRow(wedge, dark, 3, (j, m) => {
      const a = (j - 1) * 0.55;
      lay(m, Math.sin(a) * 0.05, 0.03, 0.12, Math.sin(a), -0.05, Math.cos(a), 0.12, 0.26, 0.45);
    }, { name: 'briar-toes', inkPx: PART_INK_PX, mottle: 0.1, seed: 69 + i }));
    grow.add(upper, lower, foot);
    return { i, hipLocal: new Vector3(hx, HIP_Y, 0), home: [fx, fz], group: grp, upper, lower, foot, a: UPPER, b: LOWER, pole: POLE_KNEE, footH: FOOT_H * 0.8, hip: null };
  });
  const kneeKnots = instancedPart(G.knot(), barkLit, legs.length, { name: 'briar-knees', moving: true });
  mottle(kneeKnots, 0.1, 71);
  grow.add(kneeKnots);

  // --- Ground: the contact shadow, a root child (never under the hit
  // overlay's node, so it stays on the floor).
  const shadow = groundShadow(0.75, 0.8);
  group.add(shadow);

  // --- Named points (B8) and the shared overlay's tuning (§6.1 item 9: a
  // champion takes half the squash and flinch and keeps a small hop).
  const points = makePoints({
    tip: [lance, 0, LANCE_BUTT + LANCE_LEN + TIP_LEN, 0],
    hand: [lance, 0, 0, 0],
    shield: [shield, 0, 0, 0.2],
    visor: [head, 0, 0.02, 0.22],
  });
  const footPts = legs.map((L) => {
    const name = L.i ? 'footR' : 'footL';
    const p = makePoints({ [name]: [grow, 0, 0, 0] })[name];
    points[name] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 1, axis: 'y', midY: 1.2 };

  // --- Locked feet.
  pivot.updateMatrix();
  squashG.updateMatrix();
  torso.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(_m.makeTranslation(0, -HIP_Y, 0)).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.3, lift: 0.2, minDur: 0.12, maxDur: 0.3, durPerSpeed: 0.03, lead: 0.55, flight: 3.4 } });
  const { gait } = legRig;
  const C = restChannels({});
  // stance: the left foot leads, the right sets back; a wide stance apart
  const stance = (i, out) => {
    const side = i ? 1 : -1;
    out.z += i ? -0.2 * C.step : 0.34 * C.step;
    out.x += side * 0.14 * C.wide;
    return out;
  };

  // --- Live state.
  const spawn = createSpawnClock();
  let lastT = null;
  let lastX = 0;
  let lastZ = 0;
  let lastId = null;
  let idle = 0;
  let ab = null; // { id, t }
  let telKey = null;
  let telAge = 0;
  let teleSpan = 0.75;
  let charging = false;
  let from = { ...ZERO };
  let replantPending = false;
  const lv = new Vector3();
  let leanF = 0;
  let leanS = 0;
  let walkPh = 0;

  function reset() {
    lastT = null;
    ab = null;
    telKey = null;
    charging = false;
    from = { ...ZERO };
    spawn.clear();
  }
  // a new ability starts out of this frame's pose (its contact beats spent)
  function begin(id) {
    from = { ...C, squash: 0, shove: 0 };
    ab = { id, t: 0 };
  }

  // In game: the sim's warning IS the wind-up (B1), stretched over the
  // telegraph and ending one strike before it resolves, so the drive and the
  // plant land on the sim's tick. The run holds while the sim charges and the
  // stop plays when it ends (a wall or the lane spent).
  function drive(dt, e) {
    const tel = e && e.telegraph ? e.telegraph : null;
    const move = tel ? tel.move : null;
    const id = move === 'bramble_charge' ? 'charge' : move === 'thorn_ring' ? 'ring' : null;
    const key = id ? `${move}:${tel.startTick}` : null;
    if (key && key !== telKey) {
      telKey = key;
      telAge = 0;
      const W = tel.resolveTick > tel.startTick ? (tel.resolveTick - tel.startTick) / 60 : 1;
      teleSpan = Math.max(0.05, W - STRIKE_SEC);
      begin(id);
    } else if (!key && telKey) {
      telKey = null;
      // the warning resolved: on to the strike if the wind-up is still going
      if (ab) {
        const strikeAt = KNIGHT_ABILITIES[ab.id].startOf(ab.id === 'charge' ? 'drive' : 'plant');
        if (ab.t < strikeAt) ab.t = strikeAt;
      }
    }
    const nowCharging = !!(e && e.charge);
    if (nowCharging && !charging && (!ab || ab.id !== 'charge')) begin('charge');
    if (nowCharging && ab && ab.id === 'charge' && ab.t < KNIGHT_ABILITIES.charge.startOf('drive')) ab.t = KNIGHT_ABILITIES.charge.startOf('drive');
    charging = nowCharging;
    if (!ab) return restChannels(C);
    const tl = KNIGHT_ABILITIES[ab.id];
    const windEnd = tl.startOf(ab.id === 'charge' ? 'drive' : 'plant');
    if (telKey && ab.t < windEnd) {
      telAge += dt;
      ab.t = telAge < teleSpan ? Math.min(windEnd - 1e-4, (telAge / teleSpan) * windEnd) : windEnd;
    } else ab.t += dt;
    if (ab.id === 'charge') {
      const runAt = tl.startOf('run');
      const stopAt = tl.startOf('stop');
      // the run holds as long as the sim charges; it stops when the sim does
      if (charging && ab.t >= runAt) ab.t = Math.min(ab.t, stopAt - 1e-4);
      else if (!charging && ab.t >= runAt && ab.t < stopAt && !telKey) ab.t = stopAt;
    }
    abilityChannels(ab.id, tl.sample(ab.t), C, from);
    if (ab.t >= tl.duration) ab = null;
    return C;
  }
  // a held contact: the plant and the stop are taken on planted feet
  function holding() {
    if (!ab) return false;
    const ph = KNIGHT_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'plant' || ph === 'hold' || ph === 'stop';
  }

  const handPose = (out) => {
    // the lance hand: rest, couched, raised or planted by the channels
    const wC = C.couch;
    const wR = C.raise;
    const wP = C.plant;
    const wRest = Math.max(0, 1 - wC - wR - wP);
    const sum = wRest + wC + wR + wP || 1;
    for (let j = 0; j < 4; j++) out[j] = (HAND_REST[j] * wRest + HAND_COUCH[j] * wC + HAND_RAISE[j] * wR + HAND_PLANT[j] * wP) / sum;
    return out;
  };
  const hp = [0, 0, 0, 0];

  // Lay the body, the arms, the legs and the glow for this frame.
  function apply(dt, { locked, hold = false, rage = 0 }) {
    // the walk: the body rises over a passing foot and leans into the travel
    gait.localVelocity(yaw, lv);
    const speed = Math.hypot(lv.x, lv.z);
    const sp = Math.min(1.6, speed / KNIGHT_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 && C.run < 0.5 ? Math.min(0.12, (lv.z / KNIGHT_WALK) * 0.05) : 0) - leanF) * k;
    leanS += ((sp > 0.05 ? (-lv.x / KNIGHT_WALK) * 0.03 : 0) - leanS) * k;
    walkPh += speed * dt * 2.4;
    const walkK = Math.min(1, sp) * (1 - C.couch) * (1 - C.raise) * (1 - C.plant);
    const bobY = 0.05 * gait.bob * Math.min(1, sp);
    const breathe = 0.012 * Math.sin(idle * 2.4);
    pivot.position.set(0, HIP_Y + breathe + bobY - 0.2 * C.crouch, -0.1 * C.shove);
    pivot.rotation.set(C.lean + leanF - 0.12 * C.shove, 0.08 * Math.sin(walkPh) * walkK - 0.18 * C.couch, leanS);
    // the contact squash kept to a champion's size: +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    head.rotation.set(0.15 * C.couch - 0.1 * C.raise + 0.2 * C.plant + 0.03 * Math.sin(idle * 0.9), 0.06 * Math.sin(idle * 0.5) * (1 - C.fever), 0);
    // the cape: strips sway, stream back in the charge and lift off the run
    for (const s of strips) {
      s.g.rotation.x = 0.1 + 0.85 * C.run + 0.25 * Math.min(1, sp) + 0.06 * Math.sin(idle * 2.1 + s.ph) + 0.35 * Math.max(0, C.lean) + 0.2 * C.shove;
      s.g.rotation.z = 0.04 * Math.sin(idle * 1.7 + s.ph) + s.x * 0.12 * C.run;
    }
    pivot.updateMatrix();
    squashG.updateMatrix();

    // the lance arm
    handPose(hp);
    const swing = SWING * Math.sin(walkPh) * walkK;
    const R = arms[1];
    R.hand.set(hp[0], hp[1], hp[2] - swing);
    lance.position.copy(R.hand);
    lance.rotation.set(hp[3] + 0.06 * Math.sin(walkPh) * walkK, 0, -0.05 * C.couch);
    // the buckler arm: guard forward in the charge, out to the side in the raise
    const L = arms[0];
    const wG = C.guard;
    const wO = C.raise + 0.6 * C.plant;
    const wS = Math.max(0, 1 - wG - wO);
    const sumS = wS + wG + wO || 1;
    L.hand.set(
      (SHIELD_REST[0] * wS + SHIELD_GUARD[0] * wG + SHIELD_OUT[0] * wO) / sumS,
      (SHIELD_REST[1] * wS + SHIELD_GUARD[1] * wG + SHIELD_OUT[1] * wO) / sumS,
      (SHIELD_REST[2] * wS + SHIELD_GUARD[2] * wG + SHIELD_OUT[2] * wO) / sumS + swing
    );
    shield.position.copy(L.hand).add(_a.set(-0.06, 0, 0.08));
    shield.rotation.set(-0.1 * wG, -0.5 + 0.55 * wG - 0.5 * wO, 0.1 * wO);
    for (const A of arms) {
      solveTwoBone(A.shoulder, A.hand, ARM_A, ARM_B, A.pole, A.elbow);
      aimSegment(A.upper, A.shoulder, A.elbow);
      _b.subVectors(A.hand, A.elbow);
      _c.copy(A.elbow).addScaledVector(_b.normalize(), Math.min(ARM_B, A.hand.distanceTo(A.elbow)));
      aimSegment(A.fore, A.elbow, _c);
      A.fist.position.copy(_c);
    }

    // the feet
    legRig.update(dt, { space: yaw, stance, locked, hold });
    for (const Lg of legs) {
      const S = legRig.state[Lg.i];
      // a lifted foot tips its toes down
      Lg.foot.rotation.set(0.5 * S.up, 0, 0);
      footPts[Lg.i].position.copy(Lg.foot.position);
      _a.subVectors(S.knee, S.hip).normalize();
      _c.subVectors(S.end, S.knee).normalize();
      lay(_m, S.knee.x, S.knee.y, S.knee.z + 0.05, _a.x - _c.x, _a.y - _c.y, _a.z - _c.z + 0.4, 1.3, 1.1, 1.3);
      kneeKnots.setMatrixAt(Lg.i, _m);
    }
    kneeKnots.instanceMatrix.needsUpdate = true;

    // the tell: the visor breathes, flares with the wind-up, burns in rage
    visorGlow.material.opacity = Math.min(0.85, 0.28 + 0.06 * Math.sin(idle * 2.4) + 0.4 * C.fever + (rage ? 0.15 + 0.1 * Math.sin(idle * 9) : 0));
  }

  return {
    group,
    mats,
    points,
    react,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    // pose: { t, e (the sim entity, read only), turntable }. A dying rig is
    // never posed again (the enemy layer's kill takes it), so it freezes in
    // the pose it died in.
    pose({ t, e = null, turntable = false }) {
      const id = e ? e.id : lastId;
      // a new champion (or a rewound clock) spawns in; a jump in place only
      // re-plants the feet
      const born = lastT === null || t < lastT || (e && id !== lastId);
      const fresh = born || Math.hypot(group.position.x - lastX, group.position.z - lastZ) > 2.5;
      if (fresh) {
        reset();
        if (born && e && !turntable) spawn.restart(t);
      }
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      lastX = group.position.x;
      lastZ = group.position.z;
      lastId = id;
      idle += dt;
      if (e || turntable) drive(dt, e);
      const g = turntable ? 1 : spawn.scale(t);
      grow.scale.setScalar(g);
      apply(dt, { locked: !turntable && g === 1 && !!e, hold: holding(), rage: e && e.rage ? 1 : 0 });
    },
    // The model lab: pose an ability at any time (play, scrub, rewind) while
    // the lab walks the rig along its path. The channels are pure in abT.
    lab: {
      abilities: KNIGHT_ABILITIES,
      // the feet re-plant on the next pose's stance, once its channels are set
      reset() {
        reset();
        replantPending = true;
      },
      feet: () => gait.report(yaw),
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      gait,
      legs: legRig, // probes: where each leg's IK reached
      arms, // probes: where each hand reached
      parts: { pivot, head, lance, shield, legs, strips },
      pose({ dt, ability = null, abT = 0, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, KNIGHT_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        const g = ability === 'spawn' ? spawnGrow(abT) : 1;
        grow.scale.setScalar(g);
        if (replantPending) {
          replantPending = false;
          pivot.updateMatrix();
          gait.reset(yaw, stance);
        }
        apply(dt, { locked: !rigid && g === 1, hold: holding() });
      },
    },
  };
}
