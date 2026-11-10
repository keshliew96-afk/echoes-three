// THE BONE REEVE, MODEL STANDARD (docs/MODEL_STANDARD.md "Level III
// champions"). The Ashen Barrow's first champion rebuilt in the faceted look
// of Kesh's sample video, on top of the chibi ink style, keeping the classic
// rig's identity (render/enemies/champions.js): a tall cowled skeleton in a
// tattered robe, the ONE indigo tell in its eye slits, a grave scythe carried
// in both hands, a bone lantern at the belt. What the standard adds:
//
//   * a faceted robe to the floor with a row of torn rags at the hem and fold
//     wedges up the cloth, a spine of seven vertebrae with neural blades, five
//     ribs a side in three faceted segments curving round to a sternum, a
//     pelvis, clavicles and scapulae, a boxed skull with a hinged jaw and a
//     row of teeth under a faceted hood, a bone lantern of four bars round an
//     indigo flame, a scythe with a ferruled pole, bone knuckles up its length
//     and a blade of eight faceted segments curving to its tip;
//   * TWO LOCKED FEET (render/facet/gait.js) under the robe: each bone foot
//     is pinned to the floor while it carries weight and the legs reach it by
//     two-bone IK; it steps along the real travel (the classic glided), and a
//     foot the leg can no longer reach lifts, never slides; both hands reach
//     their grips on the pole by the same IK;
//   * two ability timelines driven by the sim:
//       Reaping Sweep  draw (the warning less one strike: the scythe drawn
//                      back across the body to the right, the weight on the
//                      back foot, the body twisted into it), swing (2.5
//                      frames, landing on the cone's tick: the blade carried
//                      flat across the front on a lead step), contact held,
//                      recoil, settle with one overshoot;
//       Grave Lance    raise (the warning less one strike: the scythe raised
//                      high overhead, the body back), drive (2.5 frames, on
//                      the lane's tick: the blade driven down into the floor
//                      ahead on a long lead step), contact held, recoil,
//                      settle;
//   * the [M] beats (render/facet/beats.js): a spawn-in grow from the floor,
//     named points (the blade's `tip`, the scythe `hand`, the `lantern`, the
//     `eye`, each foot), and the hit reaction is the shared overlay's
//     (render/react.js), tuned by `react`.
//
// Same interface as the classic (group, mats, setYaw, pose), plus `lab`,
// `points`, `react`. Faces +Z. Render only: it reads the sim entity and never
// writes it; every clip runs off pose's t.
import { BoxGeometry, Color, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, OctahedronGeometry, Vector3 } from 'three';
import { addInk, groundShadow } from '../../critters/common.js';
import { PALETTE } from '../../../data/palette.js';
import { makeGlowSprite } from '../../glow.js';
import { sharedGeo } from '../../geocache.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize, facetMaterial, hash01 } from '../../facet/material.js';
import { PART_INK_PX, instancedPart, mottle, placeRow, wedgeGeometry } from '../../facet/kit.js';
import { lay, limbBox, taperBox } from '../../facet/shapes.js';
import { createLegs } from '../../facet/legs.js';
import { aimSegment, solveTwoBone } from '../../facet/gait.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../../facet/beats.js';

// --- Colour: the classic Bone Reeve's bone and cowl (champions.js C), unchanged.
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const BONE = new Color(PALETTE.bone).multiplyScalar(0.82);
const BONE_DARK = new Color(PALETTE.bone).lerp(new Color(PALETTE.voidCharcoal), 0.45);
const COWL = slate(0.2, 0.17);
// the standard's value steps: a lit bone on the crown of the skull and the
// blade's edge, a dark cowl in the folds, a lit cowl over the shoulders
const BONE_LIT = BONE.clone().lerp(new Color(PALETTE.parchment), 0.14);
const COWL_DARK = COWL.clone().multiplyScalar(0.68);
const COWL_LIT = COWL.clone().lerp(new Color(PALETTE.bone), 0.1);
const IRON = BONE_DARK.clone().lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.75);

// The hit flash (the enemy layer lifts emissiveIntensity on every mat).
const flashable = (color) => facetMaterial(color, { emissive: '#FFFFFF', emissiveIntensity: 0 });

// --- Body plan (yaw space, faces +Z). The body pivots at the hips.
const HIP_Y = 1.05;
const UPPER = 0.62;
const LOWER = 0.56;
const FOOT_H = 0.08;
// [hip x, home x, home z, gait group]
const LEGS = [
  [-0.2, -0.26, 0.02, 0],
  [0.2, 0.26, -0.02, 1],
];
const ARM_A = 0.56;
const ARM_B = 0.54;
const SHOULDER_L = [-0.38, 2.26, 0.02];
const SHOULDER_R = [0.38, 2.26, 0.02];
// the scythe (its own space: the grip at the origin, +Y up the pole to the
// blade; the blade curves out to +Z)
const POLE_LO = -1.0;
const POLE_HI = 1.55;
const GRIP_A = 0.35; // the upper (right) hand on the pole
const GRIP_B = -0.3; // the lower (left) hand
const BLADE_R = 1.0;
const BLADE_C = [0, 0.55, 0.05]; // the arc's centre
export const REEVE_WALK = 1.2; // u/s, BR.moveSpeed (sim/enemies/champions.js)

// --- Ability timelines (render only; the sim's numbers: a 54-tick cone, a
// 66-tick lane).
export const REEVE_ABILITIES = Object.freeze({
  sweep: createTimeline('sweep', 'Reaping Sweep', [
    { id: 'draw', label: 'draw the scythe back', dur: 54 / 60 - STRIKE_SEC },
    { id: 'swing', label: 'swing', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.55 },
  ], { cues: [{ at: 54 / 60, id: 'reaping_sweep' }] }),
  lance: createTimeline('lance', 'Grave Lance', [
    { id: 'raise', label: 'raise the scythe', dur: 66 / 60 - STRIKE_SEC },
    { id: 'drive', label: 'drive', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.55 },
  ], { cues: [{ at: 66 / 60, id: 'grave_lance' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (all 0 at rest):
//   draw   0..1 the scythe drawn back      swing  0..1 the blade across the front
//   raise  0..1 the scythe overhead        drive  0..1 the blade into the floor
//   lean   body pitch, + forward           twist  body yaw, + the right shoulder back
//   crouch 0..1 the knees bend             step   0..1 the left foot leads
//   brace  0..1 the right foot sets back   wide   0..1 the feet set apart
//   squash 0..1 the contact squash (B9)    shove  0..1 the recoil (B3)
//   fever  0..1 the eyes flare
const KEYS = ['draw', 'swing', 'raise', 'drive', 'lean', 'twist', 'crouch', 'step', 'brace', 'wide', 'squash', 'shove', 'fever'];
function restChannels(C) {
  for (const k of KEYS) C[k] = 0;
  return C;
}
const lerp = (a, b, k) => a + (b - a) * k;
const pose = (p) => ({ ...restChannels({}), ...p });
const ZERO = restChannels({});
const DRAWN = pose({ draw: 1, lean: -0.1, twist: 0.4, crouch: 0.22, brace: 1, wide: 0.5, fever: 1 });
const SWUNG = pose({ swing: 1, lean: 0.22, twist: -0.55, crouch: 0.34, step: 1, wide: 0.4, squash: 1, fever: 1 });
const RAISED = pose({ raise: 1, lean: -0.22, crouch: 0.18, brace: 0.7, wide: 0.6, fever: 1 });
const DRIVEN = pose({ drive: 1, lean: 0.4, crouch: 0.5, step: 1, wide: 0.5, squash: 1, fever: 1 });
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
  if (id !== 'sweep' && id !== 'lance') return C;
  const wind = id === 'sweep' ? DRAWN : RAISED;
  const struck = id === 'sweep' ? SWUNG : DRIVEN;
  if (s.id === 'draw' || s.id === 'raise') mixPose(C, from, wind, ease.inOut(Math.min(1, k * 1.15)));
  else if (s.id === 'swing' || s.id === 'drive') mixPose(C, wind, struck, kick(k)); // B4: off on the press frame
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

// --- The scythe's key poses (body space): [x, y, z, pitch, yaw, roll] of
// the grip. Pitch 0 the pole upright, + tips the blade forward and down; yaw
// + carries the blade out to the right; roll - tilts the pole's top to the
// right (the classic's carry).
const SCY_REST = [0.22, 1.72, 0.12, 0.05, 0.0, -0.45];
const SCY_DRAWN = [0.34, 1.7, -0.02, 0.15, 1.3, -0.5];
const SCY_SWUNG = [0.06, 1.56, 0.26, 0.1, -1.5, -0.3];
const SCY_RAISED = [0.16, 2.26, -0.24, -1.15, 0.0, -0.12];
const SCY_DRIVEN = [0.2, 1.52, 0.32, 1.25, 0.0, -0.18];

// --- Geometry (shared, faceted once).
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:reeve-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  skirt: () => geo('skirt', () => new CylinderGeometry(0.34, 0.6, 1.12, 9, 1, true).translate(0, 0.56, 0), 601, 0.05),
  belt: () => geo('belt', () => new CylinderGeometry(0.36, 0.33, 0.14, 8), 603),
  pelvis: () => geo('pelvis', () => taperBox(0.5, 0.22, 0.3, 0.8, 0.7), 605),
  vertebra: () => geo('vertebra', () => new BoxGeometry(0.13, 1, 0.12), 607, 0.06),
  rib: () => geo('rib', () => new BoxGeometry(0.05, 1, 0.07), 609, 0.05),
  sternum: () => geo('sternum', () => taperBox(0.12, 0.7, 0.07, 0.7, 1), 611),
  clavicle: () => geo('clavicle', () => new BoxGeometry(0.9, 0.09, 0.12), 613, 0.05),
  scapula: () => geo('scapula', () => taperBox(0.24, 0.3, 0.06, 0.6, 0.8), 615),
  hood: () => geo('hood', () => new CylinderGeometry(0.06, 0.3, 0.62, 7, 1, true).translate(0, 0.1, -0.03), 617, 0.06),
  skull: () => geo('skull', () => taperBox(0.3, 0.3, 0.3, 0.9, 0.85, 0.02), 619),
  jaw: () => geo('jaw', () => taperBox(0.2, 0.07, 0.16, 0.8, 1), 621),
  tooth: () => geo('tooth', () => new BoxGeometry(0.025, 0.035, 0.02), 622, 0.02),
  thigh: () => geo('thigh', () => limbBox(0.11, 0.11, UPPER, 0.8, 0.8), 623),
  shin: () => geo('shin', () => limbBox(0.09, 0.09, LOWER, 0.85, 0.85), 625),
  foot: () => geo('foot', () => taperBox(0.16, FOOT_H, 0.32, 0.7, 0.6).translate(0, FOOT_H / 2, 0.06), 627, 0.1),
  upperArm: () => geo('upper-arm', () => limbBox(0.1, 0.1, ARM_A, 0.85, 0.85), 629),
  foreArm: () => geo('fore-arm', () => limbBox(0.085, 0.085, ARM_B, 0.85, 0.85), 631),
  fist: () => geo('fist', () => new IcosahedronGeometry(0.075, 0), 633, 0.1),
  knob: () => geo('knob', () => new IcosahedronGeometry(0.06, 0), 635, 0.12),
  pole: () => geo('pole', () => new CylinderGeometry(0.035, 0.045, POLE_HI - POLE_LO, 6).translate(0, (POLE_HI + POLE_LO) / 2, 0), 637),
  ferrule: () => geo('ferrule', () => new CylinderGeometry(0.06, 0.06, 0.1, 6), 639, 0.05),
  bladeSeg: () => geo('blade', () => new BoxGeometry(1, 1, 1), 641, 0.04),
  cage: () => geo('cage', () => new OctahedronGeometry(0.12, 0).scale(1, 1.4, 1), 643, 0.08),
  flame: () => sharedGeo('reeve-flame', () => new OctahedronGeometry(0.045, 0).scale(1, 1.5, 1)),
  eye: () => sharedGeo('reeve-eye', () => new BoxGeometry(0.07, 0.03, 0.02)),
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

export function buildBoneReeveFacet() {
  const group = new Group();
  group.name = 'bone_reeve';
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
  const cowl = track(flashable(COWL));
  const cowlDark = track(flashable(COWL_DARK));
  const cowlLit = track(flashable(COWL_LIT));
  const iron = track(flashable(IRON));
  const inkMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal), toneMapped: false });
  const tellMat = new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- The robe: a faceted skirt to the floor, torn rags round the hem,
  // fold wedges up the cloth; the belt and the pelvis over it.
  const body = new Group();
  torso.add(body);
  const skirt = mesh(G.skirt(), cowl, body);
  skirt.material.side = DoubleSide;
  skirt.position.y = 0.04;
  const RAGS = 9;
  const rags = [];
  for (let i = 0; i < RAGS; i++) {
    const a = (i / RAGS) * Math.PI * 2 + 0.2;
    const g = new Group();
    g.position.set(Math.sin(a) * 0.58, 0.3, Math.cos(a) * 0.58);
    g.rotation.y = a;
    body.add(g);
    const r = placeRow(wedge, i % 2 ? cowlDark : cowl, 1, (j, m) => lay(m, 0, 0, 0, 0.05 * (i % 3 - 1), -1, 0.12, 0.14, 0.3 + 0.06 * hash01(i, 5), 0.5), { name: 'reeve-rag', inkPx: PART_INK_PX, mottle: 0.1, seed: 645 + i });
    g.add(r);
    rags.push({ g, ph: i * 0.9 });
  }
  const folds = placeRow(wedge, cowlDark, 7, (i, m) => {
    const a = (i / 7) * Math.PI * 2 + 0.35;
    const r = 0.5;
    lay(m, Math.sin(a) * r, 0.7, Math.cos(a) * r, Math.sin(a) * 0.22, 1, Math.cos(a) * 0.22, 0.05, 0.55 + 0.1 * (i % 2), 0.07, a);
  }, { name: 'reeve-folds', inkPx: PART_INK_PX * 0.8, mottle: 0.08, seed: 661 });
  body.add(folds);
  const belt = mesh(G.belt(), cowlDark, body);
  belt.position.y = 1.16;
  const pelvis = mesh(G.pelvis(), dark, body);
  pelvis.position.set(0, 1.32, -0.02);

  // --- The spine and ribs: seven vertebrae with neural blades up from the
  // pelvis, five ribs a side in three segments curving round to a sternum.
  const VERTS = 7;
  const spine = placeRow(G.vertebra(), bone, VERTS, (i, m) => {
    const y = 1.42 + i * 0.125;
    lay(m, 0, y, -0.1 + 0.02 * Math.sin(i * 0.8), 0, 1, 0.08, 1, 0.1, 1);
  }, { name: 'reeve-spine', inkPx: PART_INK_PX, mottle: 0.08, seed: 663 });
  body.add(spine);
  const blades = placeRow(wedge, dark, VERTS, (i, m) => lay(m, 0, 1.42 + i * 0.125, -0.16, 0, 0.3, -1, 0.05, 0.1, 0.06), { name: 'reeve-neural', inkPx: PART_INK_PX * 0.7, mottle: 0.06, seed: 665 });
  body.add(blades);
  const RIBS = 5;
  const RIB_SEGS = 3;
  const RIB_SPAN = Math.PI * 0.9;
  const ribs = placeRow(G.rib(), bone, RIBS * RIB_SEGS * 2, (i, m) => {
    const side = i < RIBS * RIB_SEGS ? -1 : 1;
    const j = i % (RIBS * RIB_SEGS);
    const r = Math.floor(j / RIB_SEGS);
    const seg = j % RIB_SEGS;
    const R = 0.3 - r * 0.02;
    const y = 2.1 - r * 0.15;
    const a0 = (seg / RIB_SEGS) * RIB_SPAN;
    const a1 = ((seg + 1) / RIB_SEGS) * RIB_SPAN;
    const am = (a0 + a1) / 2;
    const zc = -0.1 + R * 0.8;
    const px = side * Math.sin(am) * R;
    const pz = zc - Math.cos(am) * R * 0.8;
    const len = R * (a1 - a0) * 0.98;
    // the tangent, the rib dropping a little toward the front
    lay(m, px, y - 0.05 * seg, pz, side * Math.cos(am), -0.12, Math.sin(am) * 0.8, 1, len, 1, 0);
  }, { name: 'reeve-ribs', inkPx: PART_INK_PX, mottle: 0.1, seed: 667 });
  body.add(ribs);
  const sternum = mesh(G.sternum(), boneLit, body);
  sternum.position.set(0, 1.78, 0.33);
  sternum.rotation.x = 0.1;
  const clavicle = mesh(G.clavicle(), bone, body);
  clavicle.position.set(0, 2.27, 0.02);
  const scapulae = placeRow(G.scapula(), dark, 2, (i, m) => lay(m, i ? 0.24 : -0.24, 2.1, -0.16, i ? 0.25 : -0.25, 1, -0.1, 1, 1, 1), { name: 'reeve-scapulae', inkPx: PART_INK_PX, mottle: 0.08, seed: 669 });
  body.add(scapulae);
  const shoulderLit = placeRow(wedge, cowlLit, 4, (i, m) => {
    const side = i < 2 ? -1 : 1;
    const j = i % 2;
    lay(m, side * (0.28 + 0.12 * j), 2.32 - 0.03 * j, 0.0, side * 0.6, 1, 0.1, 0.1, 0.12, 0.3, side * 0.4);
  }, { name: 'reeve-shoulder-lit', inkPx: PART_INK_PX * 0.8, mottle: 0.06, seed: 671 });
  body.add(shoulderLit);

  // --- The head: a boxed skull with a hinged jaw and a row of teeth under a
  // faceted hood, the indigo slit eyes (the ONE tell) and their glow.
  const head = new Group();
  head.position.set(0, 2.5, 0.0);
  body.add(head);
  const hood = mesh(G.hood(), cowl, head);
  hood.material.side = DoubleSide;
  const hoodLit = placeRow(wedge, cowlLit, 3, (i, m) => lay(m, -0.1 + i * 0.1, 0.26 - 0.03 * (i % 2), 0.08 + 0.04 * (i % 2), 0, 1, 0.3, 0.06, 0.14, 0.2), { name: 'reeve-hood-lit', inkPx: PART_INK_PX * 0.8, mottle: 0.06, seed: 673 });
  head.add(hoodLit);
  const skull = mesh(G.skull(), bone, head);
  skull.position.set(0, -0.04, 0.05);
  const crown = placeRow(wedge, boneLit, 2, (i, m) => lay(m, i ? 0.05 : -0.06, 0.1, 0.1, 0, 1, 0.4, 0.07, 0.06, 0.12), { name: 'reeve-crown', inkPx: PART_INK_PX * 0.7, mottle: 0.05, seed: 675 });
  head.add(crown);
  const jaw = new Group();
  jaw.position.set(0, -0.13, 0.06);
  head.add(jaw);
  mesh(G.jaw(), dark, jaw).position.set(0, -0.04, 0.06);
  const teeth = placeRow(G.tooth(), boneLit, 6, (i, m) => lay(m, -0.075 + i * 0.03, -0.045, 0.14, 0, 1, 0, 1, 1, 1), { name: 'reeve-teeth', ink: false, mottle: 0 });
  jaw.add(teeth);
  const eyes = placeRow(G.eye(), tellMat, 2, (i, m) => lay(m, i ? 0.065 : -0.065, -0.01, 0.2, 0, 1, 0, 1, 1, 1, i ? -0.2 : 0.2), { name: 'reeve-eyes', ink: false, mottle: 0 });
  head.add(eyes);
  const eyeGlow = tellGlow(0.42, 0.34);
  eyeGlow.position.set(0, -0.01, 0.24);
  head.add(eyeGlow);

  // --- The lantern at the belt: a bone cage of four bars round an indigo
  // flame, swinging as it walks.
  const lantern = new Group();
  lantern.position.set(-0.38, 1.36, 0.14);
  body.add(lantern);
  const cage = mesh(G.cage(), bone, lantern);
  const bars = placeRow(wedge, dark, 4, (i, m) => {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    lay(m, Math.sin(a) * 0.1, -0.02, Math.cos(a) * 0.1, 0, 1, 0, 0.025, 0.26, 0.03, a);
  }, { name: 'reeve-lantern-bars', inkPx: PART_INK_PX * 0.7, mottle: 0.05, seed: 677 });
  lantern.add(bars);
  const flame = new Mesh(G.flame(), tellMat);
  flame.position.y = -0.03;
  lantern.add(flame);
  const flameGlow = tellGlow(0.5, 0.5);
  flameGlow.position.y = -0.02;
  lantern.add(flameGlow);

  // --- Arms: upper arm and forearm reaching the hands by IK.
  const arms = [SHOULDER_L, SHOULDER_R].map((sh, i) => {
    const upper = new Group();
    mesh(G.upperArm(), bone, upper);
    const fore = new Group();
    mesh(G.foreArm(), bone, fore);
    const fist = mesh(G.fist(), dark, torso);
    torso.add(upper, fore);
    return { side: i ? 1 : -1, shoulder: new Vector3(...sh), elbow: new Vector3(), hand: new Vector3(), upper, fore, fist, pole: i ? POLE_ELBOW_R : POLE_ELBOW_L };
  });
  const elbows = instancedPart(G.knob(), dark, 2, { name: 'reeve-elbows', moving: true });
  mottle(elbows, 0.1, 679);
  torso.add(elbows);

  // --- The scythe: a ferruled pole with bone knuckles up its length and a
  // blade of eight faceted segments curving to its tip.
  const scythe = new Group();
  torso.add(scythe);
  mesh(G.pole(), dark, scythe);
  const ferrules = placeRow(G.ferrule(), iron, 2, (i, m) => lay(m, 0, i ? POLE_HI - 0.06 : POLE_LO + 0.06, 0, 0, 1, 0, 1, 1, 1), { name: 'reeve-ferrules', inkPx: PART_INK_PX, mottle: 0.05, seed: 681 });
  scythe.add(ferrules);
  const knuckles = placeRow(G.knob(), bone, 5, (i, m) => lay(m, 0, -0.7 + i * 0.5, 0, 0, 1, 0, 0.9, 0.7, 0.9), { name: 'reeve-knuckles', inkPx: PART_INK_PX * 0.8, mottle: 0.1, seed: 683 });
  scythe.add(knuckles);
  const BLADE_N = 8;
  const bladeAt = (k) => {
    // the arc from the pole's top out and down to the tip
    const a = (Math.PI / 2) * (1 - k);
    return [BLADE_C[0], BLADE_C[1] + Math.sin(a) * BLADE_R, BLADE_C[2] + Math.cos(a) * BLADE_R];
  };
  const blade = placeRow(G.bladeSeg(), bone, BLADE_N, (i, m) => {
    const k0 = i / BLADE_N;
    const k1 = (i + 1) / BLADE_N;
    const p0 = bladeAt(k0);
    const p1 = bladeAt(k1);
    const len = Math.hypot(p1[1] - p0[1], p1[2] - p0[2]) * 1.04;
    const km = (k0 + k1) / 2;
    lay(m, 0, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2, 0, p1[1] - p0[1], p1[2] - p0[2], 0.03, len, 0.2 - 0.16 * km);
  }, { name: 'reeve-blade', inkPx: PART_INK_PX, mottle: 0.06, seed: 685 });
  scythe.add(blade);
  const edge = placeRow(wedge, boneLit, BLADE_N - 1, (i, m) => {
    const p = bladeAt((i + 0.5) / BLADE_N);
    const q = bladeAt((i + 1.5) / BLADE_N);
    const km = (i + 1) / BLADE_N;
    // the edge wedges sit on the outer face, pointing along the arc
    const off = 0.08 - 0.06 * km;
    lay(m, 0, p[1] - off * 0.2, p[2] + off * 0.9, 0, q[1] - p[1], q[2] - p[2], 0.02, Math.hypot(q[1] - p[1], q[2] - p[2]) * 0.9, 0.05);
  }, { name: 'reeve-blade-edge', inkPx: PART_INK_PX * 0.7, mottle: 0.04, seed: 687 });
  scythe.add(edge);
  const tang = mesh(G.ferrule(), iron, scythe);
  tang.position.set(0, POLE_HI, 0.05);
  tang.rotation.x = Math.PI / 2;

  // --- Legs: thigh and shin reaching the locked bone feet by IK, a knob at
  // each knee, under the robe.
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
  const knees = instancedPart(G.knob(), dark, legs.length, { name: 'reeve-knees', moving: true });
  mottle(knees, 0.1, 689);
  grow.add(knees);

  // --- Ground: the contact shadow, a root child (never under the hit
  // overlay's node, so it stays on the floor).
  const shadow = groundShadow(0.7, 0.8);
  group.add(shadow);

  // --- Named points (B8) and the shared overlay's tuning (§6.1 item 9: a
  // champion takes half the squash and flinch and keeps a small hop).
  const tipAt = bladeAt(1);
  const points = makePoints({
    tip: [scythe, tipAt[0], tipAt[1], tipAt[2]],
    hand: [scythe, 0, GRIP_A, 0],
    lantern: [lantern, 0, -0.02, 0],
    eye: [head, 0, -0.01, 0.24],
  });
  const footPts = legs.map((L) => {
    const name = L.i ? 'footR' : 'footL';
    const p = makePoints({ [name]: [grow, 0, 0, 0] })[name];
    points[name] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 1, axis: 'y', midY: 1.5 };

  // --- Locked feet.
  pivot.updateMatrix();
  squashG.updateMatrix();
  torso.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(_m.makeTranslation(0, -HIP_Y, 0)).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.3, lift: 0.16, minDur: 0.14, maxDur: 0.34, durPerSpeed: 0.03, lead: 0.55, flight: 3.4 } });
  const { gait } = legRig;
  const C = restChannels({});
  // stance: the left foot leads on a strike, the right sets back on a draw;
  // wide apart
  const stance = (i, out) => {
    const side = i ? 1 : -1;
    out.z += i ? -0.16 * C.step + 0.28 * C.brace : 0.4 * C.step - 0.2 * C.brace;
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
  const MOVE_ID = { reaping_sweep: 'sweep', grave_lance: 'lance' };
  const strikeOf = (id) => REEVE_ABILITIES[id].startOf(id === 'sweep' ? 'swing' : 'drive');

  // In game: the sim's warning IS the wind-up (B1), stretched over the
  // telegraph and ending one strike before it resolves, so the swing and the
  // drive land on the sim's tick. On a slow frame the strike may run ahead
  // of the resolve, but the contact holds until the warning is gone.
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
    const tl = REEVE_ABILITIES[ab.id];
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
  // a held contact: the swing and the drive are taken on planted feet
  function holding() {
    if (!ab) return false;
    const ph = REEVE_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'swing' || ph === 'drive' || ph === 'hold';
  }

  const sp6 = [0, 0, 0, 0, 0, 0];
  const blendScythe = (out) => {
    const wd = C.draw;
    const ws = C.swing;
    const wr = C.raise;
    const wv = C.drive;
    const w0 = Math.max(0, 1 - wd - ws - wr - wv);
    const sum = w0 + wd + ws + wr + wv || 1;
    for (let j = 0; j < 6; j++) out[j] = (SCY_REST[j] * w0 + SCY_DRAWN[j] * wd + SCY_SWUNG[j] * ws + SCY_RAISED[j] * wr + SCY_DRIVEN[j] * wv) / sum;
    return out;
  };
  const gripA = new Vector3();
  const gripB = new Vector3();

  // Lay the body, the scythe, the arms, the legs and the rags for this frame.
  function apply(dt, { locked, hold = false, rage = 0 }) {
    // the walk: the body rolls over a passing foot and leans into the travel
    gait.localVelocity(yaw, lv);
    const speed = Math.hypot(lv.x, lv.z);
    const sp = Math.min(1.6, speed / REEVE_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? Math.min(0.1, (lv.z / REEVE_WALK) * 0.05) : 0) - leanF) * k;
    leanS += ((sp > 0.05 ? (-lv.x / REEVE_WALK) * 0.03 : 0) - leanS) * k;
    walkPh += speed * dt * 2.4;
    const wound = Math.min(1, C.draw + C.swing + C.raise + C.drive);
    const walkK = Math.min(1, sp) * (1 - wound);
    const bobY = 0.04 * gait.bob * Math.min(1, sp);
    const breathe = 0.01 * Math.sin(idle * 1.6);
    pivot.position.set(0, HIP_Y + breathe + bobY - 0.2 * C.crouch, -0.1 * C.shove);
    pivot.rotation.set(C.lean + leanF - 0.12 * C.shove, C.twist + 0.05 * Math.sin(walkPh) * walkK, leanS + 0.04 * Math.sin(walkPh) * walkK);
    // the contact squash kept to a champion's size: +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    head.rotation.set(-0.12 * C.raise + 0.2 * C.drive + 0.05 * C.swing + 0.03 * Math.sin(idle * 0.9), 0.06 * Math.sin(idle * 0.9) * (1 - C.fever) - 0.3 * C.draw + 0.2 * C.swing, 0);
    jaw.rotation.x = 0.35 * Math.max(C.draw, C.raise) + 0.2 * Math.max(C.swing, C.drive);
    pivot.updateMatrix();
    squashG.updateMatrix();

    // the robe: the rags swing with the walk, settle at rest
    for (const R of rags) R.g.rotation.x = 0.22 * Math.sin(idle * 2.6 + R.ph) * (0.35 + walkK) + 0.15 * C.swing;
    lantern.rotation.set(0.12 * Math.sin(walkPh + 1) * walkK, 0, 0.18 * Math.sin(idle * 1.7) + 0.1 * C.twist);

    // the scythe and the two hands on its pole
    blendScythe(sp6);
    scythe.position.set(sp6[0], sp6[1], sp6[2]);
    scythe.rotation.set(sp6[3], sp6[4], sp6[5]);
    scythe.updateMatrix();
    gripA.set(0, GRIP_A, 0).applyMatrix4(scythe.matrix);
    gripB.set(0, GRIP_B, 0).applyMatrix4(scythe.matrix);
    arms[1].hand.copy(gripA);
    arms[0].hand.copy(gripB);
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

    // the tell: the eyes breathe, flare with the wind-up, burn in rage; the
    // lantern's flame gutters
    eyeGlow.material.opacity = Math.min(0.9, 0.3 + 0.06 * Math.sin(idle * 2.2) + 0.4 * C.fever + (rage ? 0.2 + 0.1 * Math.sin(idle * 9) : 0));
    flameGlow.material.opacity = 0.42 + 0.12 * Math.sin(idle * 7.3) + 0.2 * C.fever;
    flame.scale.setScalar(1 + 0.15 * Math.sin(idle * 7.3) + 0.3 * C.fever);
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
      abilities: REEVE_ABILITIES,
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
      parts: { pivot, body, head, scythe, lantern, legs },
      pose({ dt, ability = null, abT = 0, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, REEVE_ABILITIES[ability].sample(abT), C);
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
