// THE GRAVEBELL RINGER, MODEL STANDARD (docs/MODEL_STANDARD.md "Level III
// champions"). The Ashen Barrow's second champion rebuilt in the faceted look
// of Kesh's sample video, on top of the chibi ink style, keeping the classic
// rig's identity (render/enemies/champions2.js): a hunched hooded skeleton in
// a ragged shroud under a wooden yoke, a cracked grave bell hanging from the
// yoke's crossbeam over its head with the ONE indigo tell in the bell's
// tongue, a rope in the left hand and a bone mallet in the right. What the
// standard adds:
//
//   * a faceted shroud to the floor with torn rags round the hem, a hunched
//     spine of six vertebrae and four ribs a side in three segments, a
//     mantle of faceted plates over the shoulders, a boxed skull with dark
//     sockets under a faceted hood; the yoke's beam, two posts banded in
//     iron, braces, a crossbeam and a gable of two faceted slopes; the bell
//     as a faceted cup with a lip of ten plates, a crown, a crack of ink and
//     a row of runes; a rope laid from the left hand up to the crossbeam each
//     frame; a mallet with a ferruled haft and a bone head;
//   * TWO LOCKED FEET (render/facet/gait.js) under the shroud: each bone foot
//     is pinned to the floor while it carries weight and the legs reach it by
//     two-bone IK; it shuffles along the real travel, and a foot the leg can
//     no longer reach lifts, never slides; both arms reach their hands by the
//     same IK;
//   * the bell is a damped pendulum driven by the pose: it swings wide
//     through the knell's heave, crashes on the toll, and sways with the walk;
//   * two ability timelines driven by the sim:
//       Death Knell   heave (the warning less one strike: it hauls on the
//                     rope, the body rocking with the bell's swing, the
//                     weight back), toll (2.5 frames, landing on the ring's
//                     tick: the rope yanked down, the bell crashed over, the
//                     body thrown forward), contact held, recoil, settle with
//                     one overshoot;
//       Grave Call    lift (the warning less one strike: the mallet raised
//                     high behind, the body back), slam (2.5 frames, on the
//                     ring's tick: the mallet struck into the floor ahead on
//                     a long lead step), contact held, recoil, settle;
//   * the [M] beats (render/facet/beats.js): a spawn-in grow from the floor,
//     named points (the `bell`, its `clapper`, the `mallet` head, the mallet
//     `hand`, the `eye`, each foot), and the hit reaction is the shared
//     overlay's (render/react.js), tuned by `react`.
//
// Same interface as the classic (group, mats, setYaw, pose), plus `lab`,
// `points`, `react`. Faces +Z. Render only: it reads the sim entity and never
// writes it; every clip runs off pose's t.
import { BoxGeometry, Color, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { addInk, groundShadow } from '../../critters/common.js';
import { PALETTE, VFX_MATTER } from '../../../data/palette.js';
import { makeGlowSprite } from '../../glow.js';
import { sharedGeo } from '../../geocache.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize, facetMaterial, hash01 } from '../../facet/material.js';
import { PART_INK_PX, instancedPart, mottle, placeRow, plateGeometry, wedgeGeometry } from '../../facet/kit.js';
import { lay, limbBox, taperBox } from '../../facet/shapes.js';
import { createLegs } from '../../facet/legs.js';
import { aimSegment, solveTwoBone } from '../../facet/gait.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../../facet/beats.js';

// --- Colour: the classic Gravebell Ringer's bone, shroud, yoke and bell
// (champions2.js C), unchanged.
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const BONE = new Color(PALETTE.bone).multiplyScalar(0.78);
const BONE_DARK = new Color(PALETTE.bone).lerp(new Color(PALETTE.voidCharcoal), 0.5);
const SHROUD = slate(0.12, 0.15).lerp(new Color(VFX_MATTER.cinder), 0.4);
const YOKE = new Color(VFX_MATTER.oak).multiplyScalar(0.7);
const BELL = new Color(VFX_MATTER.gravebronze).lerp(slate(0.2, 0.3), 0.15).multiplyScalar(0.8);
const BELL_DARK = new Color(VFX_MATTER.gravebronze).multiplyScalar(0.5);
const HEMP = new Color(VFX_MATTER.hemp).lerp(new Color(VFX_MATTER.cinder), 0.45); // old rope, greyed with ash
// the standard's value steps: a lit bronze on the bell's crown, a dark shroud
// in the folds, a lit shroud over the mantle, a dark oak in the yoke's shade
const BONE_LIT = BONE.clone().lerp(new Color(PALETTE.parchment), 0.12);
const SHROUD_DARK = SHROUD.clone().multiplyScalar(0.7);
const SHROUD_LIT = SHROUD.clone().lerp(new Color(PALETTE.bone), 0.1);
const YOKE_DARK = YOKE.clone().multiplyScalar(0.72);
const BELL_LIT = BELL.clone().lerp(new Color(PALETTE.parchment), 0.14);
const IRON = BONE_DARK.clone().lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.7);

// The hit flash (the enemy layer lifts emissiveIntensity on every mat).
const flashable = (color) => facetMaterial(color, { emissive: '#FFFFFF', emissiveIntensity: 0 });

// --- Body plan (yaw space, faces +Z). The body pivots at the hips; the
// torso hunches forward from them (the classic's 0.25), and the arms, the
// yoke and the bell hang in the hunched chest's space.
const HIP_Y = 0.95;
const UPPER = 0.56;
const LOWER = 0.5;
const FOOT_H = 0.08;
const HUNCH = 0.28;
const CHEST_Y = 1.2; // the chest's root above the floor (body space)
// [hip x, home x, home z, gait group]
const LEGS = [
  [-0.2, -0.27, 0.02, 0],
  [0.2, 0.27, -0.02, 1],
];
const ARM_A = 0.5;
const ARM_B = 0.48;
const SHOULDER_L = [-0.34, 0.82, 0.1];
const SHOULDER_R = [0.34, 0.82, 0.1];
// the mallet (its own space: the grip at the origin, -Y down the haft to the
// head, so pitch 0 hangs it head-down)
const HAFT = 0.78;
// the bell's pivot on the crossbeam (chest space) and the rope's hitch
const PIVOT = [0, 2.6, -0.05];
const HITCH = [-0.18, 2.4, -0.02];
export const RINGER_WALK = 0.95; // u/s, GR.moveSpeed (sim/enemies/champions.js)

// --- Ability timelines (render only; the sim's numbers: a 78-tick ring, a
// 64-tick ring).
export const RINGER_ABILITIES = Object.freeze({
  knell: createTimeline('knell', 'Death Knell', [
    { id: 'heave', label: 'haul on the rope', dur: 78 / 60 - STRIKE_SEC },
    { id: 'toll', label: 'toll', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: 78 / 60, id: 'death_knell' }] }),
  call: createTimeline('call', 'Grave Call', [
    { id: 'lift', label: 'raise the mallet', dur: 64 / 60 - STRIKE_SEC },
    { id: 'slam', label: 'slam', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.55 },
  ], { cues: [{ at: 64 / 60, id: 'grave_call' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (all 0 at rest):
//   heave  0..1 hauling on the rope        toll   0..1 the rope yanked, the bell crashed
//   lift   0..1 the mallet raised behind   slam   0..1 the mallet into the floor
//   lean   body pitch, + forward           crouch 0..1 the knees bend
//   step   0..1 the left foot leads        brace  0..1 the right foot sets back
//   wide   0..1 the feet set apart         squash 0..1 the contact squash (B9)
//   shove  0..1 the recoil (B3)            fever  0..1 the tell flares
const KEYS = ['heave', 'toll', 'lift', 'slam', 'lean', 'crouch', 'step', 'brace', 'wide', 'squash', 'shove', 'fever'];
function restChannels(C) {
  for (const k of KEYS) C[k] = 0;
  return C;
}
const lerp = (a, b, k) => a + (b - a) * k;
const pose = (p) => ({ ...restChannels({}), ...p });
const ZERO = restChannels({});
const HEAVED = pose({ heave: 1, lean: -0.16, crouch: 0.22, brace: 0.8, wide: 0.6, fever: 1 });
const TOLLED = pose({ toll: 1, lean: 0.28, crouch: 0.4, step: 0.6, wide: 0.6, squash: 1, fever: 1 });
const LIFTED = pose({ lift: 1, lean: -0.22, crouch: 0.16, brace: 1, wide: 0.5, fever: 1 });
const SLAMMED = pose({ slam: 1, lean: 0.38, crouch: 0.5, step: 1, wide: 0.5, squash: 1, fever: 1 });
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
  if (id !== 'knell' && id !== 'call') return C;
  const wind = id === 'knell' ? HEAVED : LIFTED;
  const struck = id === 'knell' ? TOLLED : SLAMMED;
  if (s.id === 'heave' || s.id === 'lift') mixPose(C, from, wind, ease.inOut(Math.min(1, k * 1.15)));
  else if (s.id === 'toll' || s.id === 'slam') mixPose(C, wind, struck, kick(k)); // B4: off on the press frame
  else if (s.id === 'hold') mixPose(C, struck, struck, 0);
  else if (s.id === 'recoil') {
    mixPose(C, struck, struck, 0);
    C.squash = 1 - ease.out(k);
    C.shove = recoil(k * 0.2);
  } else {
    mixPose(C, ZERO, struck, settle(k));
    C.squash = 0;
    C.shove = recoil(0.2 + k * 0.55);
  }
  return C;
}

// --- The hands' key poses (chest space): the rope hand [x, y, z] and the
// mallet hand [x, y, z, pitch] (pitch 0 the head hanging down, PI the head
// straight up, - tips the head forward).
const ROPE_REST = [-0.36, 0.26, 0.2];
const ROPE_HEAVE = [-0.3, 0.86, 0.16];
const ROPE_TOLL = [-0.34, -0.1, 0.34];
const MALLET_REST = [0.38, 0.22, 0.24, 0.1];
const MALLET_LIFT = [0.36, 1.06, -0.26, Math.PI - 0.3];
const MALLET_SLAM = [0.33, 0.0, 0.58, -1.05];
// the walk's arm swing (u, the hands' z, opposite to the feet)
const SWING = 0.05;

// --- Geometry (shared, faceted once).
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:ringer-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  skirt: () => geo('skirt', () => new CylinderGeometry(0.36, 0.62, 1.1, 9, 1, true).translate(0, 0.55, 0), 701, 0.05),
  belt: () => geo('belt', () => new CylinderGeometry(0.38, 0.35, 0.12, 8), 703),
  pelvis: () => geo('pelvis', () => taperBox(0.48, 0.2, 0.3, 0.8, 0.7), 705),
  vertebra: () => geo('vertebra', () => new BoxGeometry(0.13, 1, 0.12), 707, 0.06),
  rib: () => geo('rib', () => new BoxGeometry(0.05, 1, 0.07), 709, 0.05),
  mantle: () => geo('mantle', () => new CylinderGeometry(0.14, 0.52, 0.6, 7, 1, true).translate(0, 0.3, 0), 711, 0.06),
  hood: () => geo('hood', () => new CylinderGeometry(0.06, 0.3, 0.6, 7, 1, true).translate(0, 0.08, -0.02), 713, 0.06),
  skull: () => geo('skull', () => taperBox(0.28, 0.28, 0.28, 0.9, 0.85, 0.02), 715),
  socket: () => sharedGeo('ringer-socket', () => new BoxGeometry(0.06, 0.045, 0.02)),
  beam: () => geo('beam', () => new BoxGeometry(1.45, 0.12, 0.16), 717, 0.04),
  post: () => geo('post', () => new CylinderGeometry(0.055, 0.068, 1.85, 6).translate(0, 0.92, 0), 719, 0.05),
  brace: () => geo('brace', () => new BoxGeometry(0.05, 0.42, 0.05), 721, 0.05),
  cross: () => geo('cross', () => new BoxGeometry(1.42, 0.13, 0.18), 723, 0.04),
  slope: () => geo('slope', () => taperBox(0.5, 0.06, 0.2, 1, 1).translate(0, 0, 0), 725, 0.05),
  band: () => geo('band', () => new CylinderGeometry(0.075, 0.075, 0.06, 6), 727, 0.04),
  bell: () => geo('bell', () => new CylinderGeometry(0.16, 0.42, 0.62, 10, 1, true).translate(0, -0.42, 0), 729, 0.04),
  crown: () => geo('crown', () => new CylinderGeometry(0.06, 0.17, 0.14, 8).translate(0, -0.08, 0), 731, 0.05),
  lipPlate: () => geo('lip', () => new BoxGeometry(0.28, 0.07, 0.06), 733, 0.04),
  clapper: () => sharedGeo('ringer-clapper', () => new IcosahedronGeometry(0.08, 0)),
  thigh: () => geo('thigh', () => limbBox(0.11, 0.11, UPPER, 0.8, 0.8), 735),
  shin: () => geo('shin', () => limbBox(0.09, 0.09, LOWER, 0.85, 0.85), 737),
  foot: () => geo('foot', () => taperBox(0.16, FOOT_H, 0.3, 0.7, 0.6).translate(0, FOOT_H / 2, 0.05), 739, 0.1),
  upperArm: () => geo('upper-arm', () => limbBox(0.1, 0.1, ARM_A, 0.85, 0.85), 741),
  foreArm: () => geo('fore-arm', () => limbBox(0.085, 0.085, ARM_B, 0.85, 0.85), 743),
  fist: () => geo('fist', () => new IcosahedronGeometry(0.07, 0), 745, 0.1),
  knob: () => geo('knob', () => new IcosahedronGeometry(0.055, 0), 747, 0.12),
  haft: () => geo('haft', () => new CylinderGeometry(0.03, 0.038, HAFT, 6).translate(0, -HAFT / 2, 0), 749),
  ferrule: () => geo('ferrule', () => new CylinderGeometry(0.05, 0.05, 0.08, 6), 751, 0.05),
  head: () => geo('mallet-head', () => taperBox(0.34, 0.18, 0.18, 0.85, 0.85), 753, 0.06),
  rope: () => geo('rope', () => new CylinderGeometry(0.018, 0.018, 1, 5).translate(0, 0.5, 0), 803, 0.02),
  rune: () => sharedGeo('ringer-rune', () => new BoxGeometry(0.05, 0.07, 0.015)),
};

const _m = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const POLE_KNEE = new Vector3(0, 0.05, 1);
const POLE_ELBOW_R = new Vector3(0.9, -0.2, -1);
const POLE_ELBOW_L = new Vector3(-0.9, -0.2, -1);

function tellGlow(size, opacity) {
  const g = makeGlowSprite({ color: TELL_INDIGO_GLOW, size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(TELL_INDIGO_GLOW);
  return g;
}

export function buildGravebellRingerFacet() {
  const group = new Group();
  group.name = 'gravebell_ringer';
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
  const torso = new Group(); // body space = the classic rig's space
  torso.position.set(0, -HIP_Y, 0);
  squashG.add(torso);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const bone = track(flashable(BONE));
  const boneLit = track(flashable(BONE_LIT));
  const dark = track(flashable(BONE_DARK));
  const shroud = track(flashable(SHROUD));
  const shroudDark = track(flashable(SHROUD_DARK));
  const shroudLit = track(flashable(SHROUD_LIT));
  const yokeM = track(flashable(YOKE));
  const yokeDark = track(flashable(YOKE_DARK));
  const bellM = track(flashable(BELL));
  const bellLit = track(flashable(BELL_LIT));
  const bellDark = track(flashable(BELL_DARK));
  const iron = track(flashable(IRON));
  const hemp = track(flashable(HEMP));
  const inkMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal), toneMapped: false });
  const tellMat = new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();
  const plate = plateGeometry();

  // --- The shroud: a faceted skirt to the floor, torn rags round the hem,
  // fold wedges up the cloth; the belt and the pelvis over it.
  const body = new Group();
  torso.add(body);
  const skirt = mesh(G.skirt(), shroud, body);
  skirt.material.side = DoubleSide;
  skirt.position.y = 0.04;
  const RAGS = 9;
  const rags = [];
  for (let i = 0; i < RAGS; i++) {
    const a = (i / RAGS) * Math.PI * 2 + 0.1;
    const g = new Group();
    g.position.set(Math.sin(a) * 0.6, 0.3, Math.cos(a) * 0.6);
    g.rotation.y = a;
    body.add(g);
    const r = placeRow(wedge, i % 2 ? shroudDark : shroud, 1, (j, m) => lay(m, 0, 0, 0, 0.05 * (i % 3 - 1), -1, 0.12, 0.15, 0.32 + 0.06 * hash01(i, 7), 0.5), { name: 'ringer-rag', inkPx: PART_INK_PX, mottle: 0.1, seed: 755 + i });
    g.add(r);
    rags.push({ g, ph: i * 0.9 });
  }
  const folds = placeRow(wedge, shroudDark, 7, (i, m) => {
    const a = (i / 7) * Math.PI * 2 + 0.5;
    const r = 0.52;
    lay(m, Math.sin(a) * r, 0.68, Math.cos(a) * r, Math.sin(a) * 0.24, 1, Math.cos(a) * 0.24, 0.05, 0.5 + 0.1 * (i % 2), 0.07, a);
  }, { name: 'ringer-folds', inkPx: PART_INK_PX * 0.8, mottle: 0.08, seed: 771 });
  body.add(folds);
  const belt = mesh(G.belt(), shroudDark, body);
  belt.position.y = 1.1;
  const pelvis = mesh(G.pelvis(), dark, body);
  pelvis.position.set(0, 1.2, -0.02);

  // --- The chest: hunched forward from the hips; the spine, ribs, mantle,
  // hood, yoke, bell and arms all hang in its space.
  const chest = new Group();
  chest.position.set(0, CHEST_Y, -0.04);
  chest.rotation.x = HUNCH;
  body.add(chest);
  const VERTS = 6;
  const spine = placeRow(G.vertebra(), bone, VERTS, (i, m) => lay(m, 0, 0.1 + i * 0.13, -0.06, 0, 1, 0.1, 1, 0.1, 1), { name: 'ringer-spine', inkPx: PART_INK_PX, mottle: 0.08, seed: 773 });
  chest.add(spine);
  const blades = placeRow(wedge, dark, VERTS, (i, m) => lay(m, 0, 0.1 + i * 0.13, -0.12, 0, 0.3, -1, 0.05, 0.09, 0.06), { name: 'ringer-neural', inkPx: PART_INK_PX * 0.7, mottle: 0.06, seed: 775 });
  chest.add(blades);
  const RIBS = 4;
  const RIB_SEGS = 3;
  const RIB_SPAN = Math.PI * 0.88;
  const ribs = placeRow(G.rib(), bone, RIBS * RIB_SEGS * 2, (i, m) => {
    const side = i < RIBS * RIB_SEGS ? -1 : 1;
    const j = i % (RIBS * RIB_SEGS);
    const r = Math.floor(j / RIB_SEGS);
    const seg = j % RIB_SEGS;
    const R = 0.27 - r * 0.018;
    const y = 0.72 - r * 0.14;
    const a0 = (seg / RIB_SEGS) * RIB_SPAN;
    const a1 = ((seg + 1) / RIB_SEGS) * RIB_SPAN;
    const am = (a0 + a1) / 2;
    const zc = -0.06 + R * 0.8;
    lay(m, side * Math.sin(am) * R, y - 0.04 * seg, zc - Math.cos(am) * R * 0.8, side * Math.cos(am), -0.12, Math.sin(am) * 0.8, 1, R * (a1 - a0) * 0.98, 1, 0);
  }, { name: 'ringer-ribs', inkPx: PART_INK_PX, mottle: 0.1, seed: 777 });
  chest.add(ribs);
  // the mantle over the shoulders: a faceted cape with lit plates on top
  const mantle = mesh(G.mantle(), shroudDark, chest);
  mantle.material.side = DoubleSide;
  mantle.position.set(0, 0.6, 0);
  const mantlePlates = placeRow(plate, shroudLit, 8, (i, m) => {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const r = 0.3 + 0.06 * (i % 2);
    lay(m, Math.sin(a) * r, 0.86 - 0.08 * (i % 2), Math.cos(a) * r, Math.sin(a) * 0.9, 0.9, Math.cos(a) * 0.9, 0.2, 0.06, 0.16, 0.2 * (i % 3));
  }, { name: 'ringer-mantle-plates', inkPx: PART_INK_PX, mottle: 0.1, seed: 779 });
  chest.add(mantlePlates);

  // --- The head: a boxed skull with dark sockets under a faceted hood, bowed
  // under the yoke.
  const hoodG = new Group();
  hoodG.position.set(0, 1.0, 0.04);
  chest.add(hoodG);
  const hood = mesh(G.hood(), shroud, hoodG);
  hood.material.side = DoubleSide;
  const hoodLit = placeRow(wedge, shroudLit, 3, (i, m) => lay(m, -0.1 + i * 0.1, 0.24 - 0.03 * (i % 2), 0.08 + 0.04 * (i % 2), 0, 1, 0.3, 0.06, 0.14, 0.2), { name: 'ringer-hood-lit', inkPx: PART_INK_PX * 0.8, mottle: 0.06, seed: 781 });
  hoodG.add(hoodLit);
  const skull = mesh(G.skull(), bone, hoodG);
  skull.position.set(0, -0.06, 0.06);
  const sockets = placeRow(G.socket(), inkMat, 2, (i, m) => lay(m, i ? 0.06 : -0.06, -0.04, 0.2, 0, 1, 0, 1, 1, 1), { name: 'ringer-sockets', ink: false, mottle: 0 });
  hoodG.add(sockets);

  // --- The yoke: a beam across the shoulders, two posts banded in iron up
  // past the hood to a crossbeam, a gable of two slopes over it.
  const yoke = new Group();
  yoke.position.set(0, 0.82, -0.08);
  chest.add(yoke);
  mesh(G.beam(), yokeM, yoke);
  const posts = placeRow(G.post(), yokeM, 2, (i, m) => lay(m, i ? 0.62 : -0.62, 0, 0, 0, 1, 0, 1, 1, 1), { name: 'ringer-posts', inkPx: PART_INK_PX, mottle: 0.08, seed: 783 });
  yoke.add(posts);
  const braces = placeRow(G.brace(), yokeDark, 2, (i, m) => lay(m, i ? 0.5 : -0.5, 0.2, 0, i ? -0.56 : 0.56, 1, 0, 1, 1, 1), { name: 'ringer-braces', inkPx: PART_INK_PX, mottle: 0.06, seed: 785 });
  yoke.add(braces);
  const bands = placeRow(G.band(), iron, 6, (i, m) => lay(m, i < 3 ? -0.62 : 0.62, 0.5 + (i % 3) * 0.55, 0, 0, 1, 0, 1, 1, 1), { name: 'ringer-bands', inkPx: PART_INK_PX, mottle: 0.06, seed: 787 });
  yoke.add(bands);
  const cross = mesh(G.cross(), yokeM, yoke);
  cross.position.y = 1.85;
  const slopes = placeRow(G.slope(), bellDark, 2, (i, m) => lay(m, i ? 0.2 : -0.2, 2.08, 0, i ? 0.42 : -0.42, 1, 0, 1, 1, 1), { name: 'ringer-gable', inkPx: PART_INK_PX, mottle: 0.06, seed: 789 });
  yoke.add(slopes);
  const pegs = placeRow(G.knob(), yokeDark, 4, (i, m) => lay(m, -0.45 + i * 0.3, 0.0, 0.09, 0, 0, 1, 0.7, 0.7, 0.7), { name: 'ringer-pegs', inkPx: PART_INK_PX * 0.8, mottle: 0.08, seed: 791 });
  yoke.add(pegs);

  // --- The bell: hung from the crossbeam on a pivot (kept plumb against
  // the hunch), a faceted cup with a crown, a lip of ten plates, a crack of
  // ink, a row of runes; the indigo tongue (the ONE tell) and its glow.
  const bellPivot = new Group();
  bellPivot.position.set(PIVOT[0], PIVOT[1] - 0.82, PIVOT[2] + 0.08);
  yoke.add(bellPivot);
  const bellG = new Group();
  bellPivot.add(bellG);
  const bell = mesh(G.bell(), bellM, bellG);
  bell.material.side = DoubleSide;
  mesh(G.crown(), bellLit, bellG);
  const lip = placeRow(G.lipPlate(), bellDark, 10, (i, m) => {
    const a = (i / 10) * Math.PI * 2;
    lay(m, Math.sin(a) * 0.42, -0.72, Math.cos(a) * 0.42, 0, 1, 0, 1, 1, 1, a);
  }, { name: 'ringer-bell-lip', inkPx: PART_INK_PX, mottle: 0.06, seed: 793 });
  bellG.add(lip);
  const crack = new Mesh(sharedGeo('ringer-crack', () => new BoxGeometry(0.025, 0.36, 0.02)), inkMat);
  crack.position.set(0.12, -0.45, 0.33);
  crack.rotation.set(-0.35, 0, 0.3);
  bellG.add(crack);
  const runes = placeRow(G.rune(), tellMat, 6, (i, m) => {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    lay(m, Math.sin(a) * 0.33, -0.5, Math.cos(a) * 0.33, 0, 1, 0, 1, 1, 1, a);
  }, { name: 'ringer-runes', ink: false, mottle: 0 });
  bellG.add(runes);
  const runeMat = runes.material;
  runeMat.transparent = true;
  const tongue = new Group();
  tongue.position.y = -0.15;
  bellG.add(tongue);
  const clapper = new Mesh(G.clapper(), tellMat);
  clapper.position.y = -0.52;
  tongue.add(clapper);
  const tongueGlow = tellGlow(0.9, 0.3);
  tongueGlow.position.y = -0.55;
  tongue.add(tongueGlow);

  // --- Arms: upper arm and forearm reaching the hands by IK; the rope from
  // the left hand up to the crossbeam's hitch; the mallet in the right.
  const arms = [SHOULDER_L, SHOULDER_R].map((sh, i) => {
    const upper = new Group();
    mesh(G.upperArm(), bone, upper);
    const fore = new Group();
    mesh(G.foreArm(), bone, fore);
    const fist = mesh(G.fist(), dark, chest);
    chest.add(upper, fore);
    return { side: i ? 1 : -1, shoulder: new Vector3(...sh), elbow: new Vector3(), hand: new Vector3(), upper, fore, fist, pole: i ? POLE_ELBOW_R : POLE_ELBOW_L };
  });
  const elbows = instancedPart(G.knob(), dark, 2, { name: 'ringer-elbows', moving: true });
  mottle(elbows, 0.1, 795);
  chest.add(elbows);
  const rope = new Group();
  rope.userData.len = 1; // aimSegment stretches it hand to hitch
  mesh(G.rope(), hemp, rope, false);
  chest.add(rope);
  const hitch = new Vector3(...HITCH);
  const mallet = new Group();
  chest.add(mallet);
  mesh(G.haft(), dark, mallet);
  const ferrules = placeRow(G.ferrule(), iron, 2, (i, m) => lay(m, 0, i ? -HAFT + 0.14 : -0.06, 0, 0, 1, 0, 1, 1, 1), { name: 'ringer-ferrules', inkPx: PART_INK_PX, mottle: 0.05, seed: 797 });
  mallet.add(ferrules);
  const malletHead = mesh(G.head(), bone, mallet);
  malletHead.position.y = -HAFT + 0.02;
  const headLit = placeRow(wedge, boneLit, 2, (i, m) => lay(m, i ? 0.1 : -0.1, -HAFT + 0.11, 0.0, 0, 1, 0, 0.1, 0.03, 0.12, 0), { name: 'ringer-head-lit', inkPx: PART_INK_PX * 0.7, mottle: 0.05, seed: 799 });
  mallet.add(headLit);
  const malletGlow = makeGlowSprite({ color: PALETTE.emberDanger, size: 0.7, opacity: 0 });
  malletGlow.position.y = -HAFT + 0.02;
  mallet.add(malletGlow);

  // --- Legs: thigh and shin reaching the locked bone feet by IK, a knob at
  // each knee, under the shroud.
  const legs = LEGS.map(([hx, fx, fz, grp], i) => {
    const upper = new Group();
    mesh(G.thigh(), bone, upper);
    const lower = new Group();
    mesh(G.shin(), bone, lower);
    const foot = new Group();
    mesh(G.foot(), bone, foot);
    grow.add(upper, lower, foot);
    return { i, hipLocal: new Vector3(hx, HIP_Y, 0), home: [fx, fz], group: grp, upper, lower, foot, a: UPPER, b: LOWER, pole: POLE_KNEE, footH: FOOT_H * 0.8, hip: null };
  });
  const knees = instancedPart(G.knob(), dark, legs.length, { name: 'ringer-knees', moving: true });
  mottle(knees, 0.1, 801);
  grow.add(knees);

  // --- Ground: the contact shadow, a root child (never under the hit
  // overlay's node, so it stays on the floor).
  const shadow = groundShadow(0.8, 0.82);
  group.add(shadow);

  // --- Named points (B8) and the shared overlay's tuning (§6.1 item 9: a
  // champion takes half the squash and flinch and keeps a small hop).
  const points = makePoints({
    bell: [bellG, 0, -0.4, 0],
    clapper: [tongue, 0, -0.52, 0],
    mallet: [mallet, 0, -HAFT + 0.02, 0],
    hand: [mallet, 0, 0, 0],
    eye: [hoodG, 0, -0.04, 0.2],
  });
  const footPts = legs.map((L) => {
    const name = L.i ? 'footR' : 'footL';
    const p = makePoints({ [name]: [grow, 0, 0, 0] })[name];
    points[name] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 1, axis: 'y', midY: 1.4 };

  // --- Locked feet.
  pivot.updateMatrix();
  squashG.updateMatrix();
  torso.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(_m.makeTranslation(0, -HIP_Y, 0)).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.28, lift: 0.14, minDur: 0.14, maxDur: 0.34, durPerSpeed: 0.03, lead: 0.55, flight: 3.4 } });
  const { gait } = legRig;
  const C = restChannels({});
  // stance: the left foot leads on a strike, the right sets back on a
  // wind-up; wide apart
  const stance = (i, out) => {
    const side = i ? 1 : -1;
    out.z += i ? -0.16 * C.step + 0.26 * C.brace : 0.38 * C.step - 0.2 * C.brace;
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
  let teleSpan = 0.8;
  let from = { ...ZERO };
  let replantPending = false;
  const lv = new Vector3();
  let leanF = 0;
  let leanS = 0;
  let walkPh = 0;
  // the bell's pendulum
  let swing = 0;
  let swingV = 0;
  let tollKicked = false;

  function reset() {
    lastT = null;
    ab = null;
    telKey = null;
    from = { ...ZERO };
    spawn.clear();
  }
  // a new ability starts out of this frame's pose (its contact beats spent)
  function begin(id) {
    from = { ...C, squash: 0, shove: 0 };
    ab = { id, t: 0 };
  }
  const MOVE_ID = { death_knell: 'knell', grave_call: 'call' };
  const strikeOf = (id) => RINGER_ABILITIES[id].startOf(id === 'knell' ? 'toll' : 'slam');

  // In game: the sim's warning IS the wind-up (B1), stretched over the
  // telegraph and ending one strike before it resolves, so the toll and the
  // slam land on the sim's tick. On a slow frame the strike may run ahead of
  // the resolve, but the contact holds until the warning is gone.
  function drive(dt, e) {
    const tel = e && e.telegraph ? e.telegraph : null;
    const id = tel ? MOVE_ID[tel.move] || null : null;
    const key = id ? `${tel.move}:${tel.startTick}` : null;
    if (key && key !== telKey) {
      telKey = key;
      telAge = 0;
      const W = tel.resolveTick > tel.startTick ? (tel.resolveTick - tel.startTick) / 60 : 1;
      teleSpan = Math.max(0.05, W - STRIKE_SEC);
      begin(id);
    } else if (!key && telKey) {
      telKey = null;
      // the warning resolved: on to the strike if the wind-up is still going
      if (ab && ab.t < strikeOf(ab.id)) ab.t = strikeOf(ab.id);
    }
    if (!ab) return restChannels(C);
    const tl = RINGER_ABILITIES[ab.id];
    const windEnd = strikeOf(ab.id);
    if (telKey && ab.t < windEnd) {
      telAge += dt;
      ab.t = telAge < teleSpan ? Math.min(windEnd - 1e-4, (telAge / teleSpan) * windEnd) : windEnd;
    } else {
      ab.t += dt;
      if (telKey) ab.t = Math.min(ab.t, windEnd + STRIKE_SEC);
    }
    abilityChannels(ab.id, tl.sample(ab.t), C, from);
    if (ab.t >= tl.duration) ab = null;
    return C;
  }
  // a held contact: the toll and the slam are taken on planted feet
  function holding() {
    if (!ab) return false;
    const ph = RINGER_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'toll' || ph === 'slam' || ph === 'hold';
  }

  const blend = (out, rest, a, b, wa, wb, n) => {
    const wr = Math.max(0, 1 - wa - wb);
    const sum = wr + wa + wb || 1;
    for (let j = 0; j < n; j++) out[j] = (rest[j] * wr + a[j] * wa + b[j] * wb) / sum;
    return out;
  };
  const rp = [0, 0, 0];
  const mp = [0, 0, 0, 0];

  // Lay the body, the bell, the arms, the legs and the rags for this frame.
  function apply(dt, { locked, hold = false, rage = 0 }) {
    // the walk: the body rolls over a passing foot and leans into the travel
    gait.localVelocity(yaw, lv);
    const speed = Math.hypot(lv.x, lv.z);
    const sp = Math.min(1.6, speed / RINGER_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? Math.min(0.1, (lv.z / RINGER_WALK) * 0.05) : 0) - leanF) * k;
    leanS += ((sp > 0.05 ? (-lv.x / RINGER_WALK) * 0.03 : 0) - leanS) * k;
    walkPh += speed * dt * 2.6;
    const wound = Math.min(1, C.heave + C.toll + C.lift + C.slam);
    const walkK = Math.min(1, sp) * (1 - wound);
    const bobY = 0.04 * gait.bob * Math.min(1, sp);
    const breathe = 0.01 * Math.sin(idle * 1.6);
    // the knell's heave rocks the body with the bell
    const rock = 0.1 * C.heave * Math.sin(idle * 6);
    pivot.position.set(0, HIP_Y + breathe + bobY - 0.2 * C.crouch, -0.1 * C.shove);
    pivot.rotation.set(C.lean + leanF + rock - 0.12 * C.shove, 0.05 * Math.sin(walkPh) * walkK, leanS + 0.06 * Math.sin(walkPh) * walkK);
    // the hunch: deeper on the toll and the slam, up on a lift
    chest.rotation.x = HUNCH + 0.18 * C.toll + 0.2 * C.slam - 0.12 * C.lift - 0.08 * C.heave;
    // the contact squash kept to a champion's size: +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    hoodG.rotation.set(-0.3 + 0.15 * C.heave - 0.2 * C.lift + 0.1 * C.slam + 0.05 * Math.sin(idle * 0.8), 0.05 * Math.sin(idle * 0.9) * (1 - C.fever), 0);
    pivot.updateMatrix();
    squashG.updateMatrix();

    // the shroud: the rags swing with the walk, settle at rest
    for (const R of rags) R.g.rotation.x = 0.22 * Math.sin(idle * 2.6 + R.ph) * (0.35 + walkK) + 0.1 * C.toll;

    // the bell: a damped pendulum, driven wide by the heave, crashed by the
    // toll, swayed by the walk
    if (C.toll > 0.9 && !tollKicked) {
      tollKicked = true;
      swingV += 14;
    } else if (C.toll < 0.5) tollKicked = false;
    const driveK = C.heave * Math.sin(idle * 6.0) * 2.6 * (0.4 + 0.6 * C.heave) + walkK * Math.sin(walkPh) * 0.6;
    swingV += (driveK - 18 * swing - 2.2 * swingV) * dt;
    swing += swingV * dt;
    swing = Math.max(-0.95, Math.min(0.95, swing));
    bellPivot.rotation.x = -chest.rotation.x; // the pivot hangs plumb whatever the hunch
    bellG.rotation.set(swing, 0, 0.25 * swing * Math.sin(idle * 1.3));
    tongue.rotation.x = -swing * 0.6;
    yoke.rotation.z = 0.06 * C.heave * Math.sin(idle * 6 + 1);

    // the rope hand and the mallet hand
    blend(rp, ROPE_REST, ROPE_HEAVE, ROPE_TOLL, C.heave, C.toll, 3);
    const armSwing = SWING * Math.sin(walkPh) * walkK;
    const L = arms[0];
    L.hand.set(rp[0], rp[1], rp[2] + armSwing);
    blend(mp, MALLET_REST, MALLET_LIFT, MALLET_SLAM, C.lift, C.slam, 4);
    const R = arms[1];
    R.hand.set(mp[0], mp[1], mp[2] - armSwing);
    mallet.position.copy(R.hand);
    mallet.rotation.set(mp[3], 0, 0.15 * Math.max(0, 1 - C.lift - C.slam) + 0.3 * C.lift);
    for (const A of arms) {
      solveTwoBone(A.shoulder, A.hand, ARM_A, ARM_B, A.pole, A.elbow);
      aimSegment(A.upper, A.shoulder, A.elbow);
      _b.subVectors(A.hand, A.elbow);
      _c.copy(A.elbow).addScaledVector(_b.normalize(), Math.min(ARM_B, A.hand.distanceTo(A.elbow)));
      aimSegment(A.fore, A.elbow, _c);
      A.fist.position.copy(_c);
      lay(_m, A.elbow.x, A.elbow.y, A.elbow.z, 0, 1, 0, 1, 1, 1);
      elbows.setMatrixAt(A.side > 0 ? 1 : 0, _m);
    }
    elbows.instanceMatrix.needsUpdate = true;
    // the rope from the left hand up to the hitch
    aimSegment(rope, L.fist.position, hitch, true);

    // the feet
    legRig.update(dt, { space: yaw, stance, locked, hold });
    for (const Lg of legs) {
      const S = legRig.state[Lg.i];
      // a lifted foot tips its toes down
      Lg.foot.rotation.set(0.5 * S.up, 0, 0);
      footPts[Lg.i].position.copy(Lg.foot.position);
      _a.subVectors(S.knee, S.hip).normalize();
      _c.subVectors(S.end, S.knee).normalize();
      lay(_m, S.knee.x, S.knee.y, S.knee.z + 0.04, _a.x - _c.x, _a.y - _c.y, _a.z - _c.z + 0.4, 0.8, 0.7, 0.8);
      knees.setMatrixAt(Lg.i, _m);
    }
    knees.instanceMatrix.needsUpdate = true;

    // the tell: the tongue breathes, flares with the knell, burns in rage;
    // the runes follow it; the mallet's head burns through the call
    const flare = 0.35 * C.heave + 0.6 * C.toll;
    tongueGlow.material.opacity = Math.min(0.95, 0.3 + 0.05 * Math.sin(idle * 2.2) + flare + (rage ? 0.22 + 0.12 * Math.sin(idle * 9) : 0));
    tongueGlow.scale.setScalar(1 + 0.8 * C.toll + 0.4 * C.heave);
    runeMat.opacity = Math.min(1, 0.45 + 0.5 * Math.max(C.heave, C.toll) + 0.3 * rage);
    malletGlow.material.opacity = 0.5 * C.lift + 0.8 * C.slam;
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
      abilities: RINGER_ABILITIES,
      // the feet re-plant on the next pose's stance, once its channels are set
      reset() {
        reset();
        replantPending = true;
      },
      feet: () => gait.report(yaw),
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      swing: () => swing,
      gait,
      legs: legRig, // probes: where each leg's IK reached
      arms, // probes: where each hand reached
      parts: { pivot, body, chest, hoodG, yoke, bellG, mallet, rope, legs },
      pose({ dt, ability = null, abT = 0, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, RINGER_ABILITIES[ability].sample(abT), C);
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
