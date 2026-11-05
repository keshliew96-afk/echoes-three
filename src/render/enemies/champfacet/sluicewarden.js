// THE SLUICE WARDEN, MODEL STANDARD (docs/MODEL_STANDARD.md "Level II
// champions"). The Sunken Mill's first champion rebuilt in the faceted look
// of Kesh's sample video, on top of the chibi ink style, keeping the classic
// rig's identity (render/enemies/champions.js): a hulking weir-keeper, a
// barrel of a body banded in iron and hunched forward, a small head under a
// grated visor with the ONE indigo tell in its eye slit, a sluice-gate shield
// of planks in an iron frame on the left arm, water dripping off it, and a
// millstone maul in the right hand. What the standard adds:
//
//   * a faceted gut and hump with the weir's two iron bands laid as riveted
//     plates, iron shoulder caps, a boxed skull under a brow plate and a
//     grating of five bars, a gate of four faceted planks in a riveted iron
//     frame with weed hanging off its sill and drips that run and fall, a
//     maul with a ferruled haft and a chisel-marked millstone head;
//   * TWO LOCKED FEET (render/facet/gait.js): each boot is pinned to the
//     floor while it carries weight and the legs reach it by two-bone IK; it
//     steps along the real travel, and a foot the leg can no longer reach
//     lifts, never slides; both arms reach their hands by the same IK;
//   * two ability timelines driven by the sim:
//       Floodgate  heave (the warning less one strike: the gate hauled up
//                  and back over the shoulder, the body cocked back on the
//                  right foot), slam (2.5 frames, landing on the cone's
//                  tick: the gate thrust forward and down, its sill into the
//                  floor ahead on a long lead step), contact held, recoil,
//                  settle with one overshoot;
//       Undertow   raise (the warning less one strike: the maul swung up
//                  overhead, the stance wide, the body back), smash (2.5
//                  frames, on the ring's tick: the stone brought down before
//                  him, the knees deep), contact held, recoil, settle;
//   * the [M] beats (render/facet/beats.js): a spawn-in grow from the floor,
//     named points (the stone's `tip`, the maul `hand`, the `gate`, the
//     `visor`, each foot), and the hit reaction is the shared overlay's
//     (render/react.js), tuned by `react`.
//
// Same interface as the classic (group, mats, setYaw, pose), plus `lab`,
// `points`, `react`. Faces +Z. Render only: it reads the sim entity and never
// writes it; every clip runs off pose's t.
import { BoxGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { addInk, groundShadow } from '../../critters/common.js';
import { PALETTE } from '../../../data/palette.js';
import { makeGlowSprite } from '../../glow.js';
import { sharedGeo } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize, facetMaterial, hash01 } from '../../facet/material.js';
import { PART_INK_PX, instancedPart, mottle, placeRow, plateGeometry, wedgeGeometry } from '../../facet/kit.js';
import { lay, limbBox, taperBox } from '../../facet/shapes.js';
import { createLegs } from '../../facet/legs.js';
import { aimSegment, solveTwoBone } from '../../facet/gait.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../../facet/beats.js';

// --- Colour: the classic Sluice Warden's hides (champions.js C), unchanged.
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const WARDEN_HIDE = slate(0.3, 0.36);
const WARDEN_DARK = slate(0.34, 0.2);
const PLANK = slate(0.18, 0.34).lerp(new Color(PALETTE.bruiseUmber), 0.45);
const IRON = HIDE.ramDark.clone().lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.8);
const STONE = new Color(PALETTE.warmGrey).lerp(new Color(PALETTE.signalBlue), 0.15).multiplyScalar(0.85);
// the standard's value steps: a lit hide over the gut's crown, a dark plank
// in the gate's shade, a weed green off the sill
const HIDE_LIT = WARDEN_HIDE.clone().lerp(new Color(PALETTE.bone), 0.14);
const PLANK_DARK = PLANK.clone().multiplyScalar(0.72);
const IRON_DARK = IRON.clone().multiplyScalar(0.7);
const WEED = slate(0.3, 0.22).lerp(new Color(PALETTE.sageCloak), 0.55);
const DRIP = new Color(PALETTE.parchment).lerp(new Color(PALETTE.signalBlue), 0.45);

// The hit flash (the enemy layer lifts emissiveIntensity on every mat).
const flashable = (color) => facetMaterial(color, { emissive: '#FFFFFF', emissiveIntensity: 0 });

// --- Body plan (yaw space, faces +Z). The body pivots at the hips.
const HIP_Y = 0.84;
const UPPER = 0.5;
const LOWER = 0.48;
const FOOT_H = 0.1;
// [hip x, home x, home z, gait group]
const LEGS = [
  [-0.3, -0.36, 0.02, 0],
  [0.3, 0.36, -0.02, 1],
];
const ARM_A = 0.5;
const ARM_B = 0.5;
const SHOULDER_L = [-0.72, 1.62, 0.02];
const SHOULDER_R = [0.72, 1.62, 0.02];
// the maul (its own space: the grip at the origin, +Y up the haft to the stone)
const HAFT = 1.3;
const STONE_R = 0.42;
export const WARDEN_WALK = 1.0; // u/s, SW.moveSpeed (sim/enemies/champions.js)

// --- Ability timelines (render only; the sim's numbers: a 66-tick cone, a
// 78-tick ring).
export const WARDEN_ABILITIES = Object.freeze({
  floodgate: createTimeline('floodgate', 'Floodgate', [
    { id: 'heave', label: 'heave the gate up', dur: 0.8 },
    { id: 'slam', label: 'slam', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: 0.8 + STRIKE_SEC, id: 'floodgate' }] }),
  undertow: createTimeline('undertow', 'Undertow', [
    { id: 'raise', label: 'raise the maul', dur: 0.9 },
    { id: 'smash', label: 'smash', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: 0.9 + STRIKE_SEC, id: 'undertow' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (all 0 at rest):
//   heave  0..1 the gate hauled up and back   slam   0..1 the gate thrust forward and down
//   raise  0..1 the maul overhead             smash  0..1 the stone down before him
//   lean   body pitch, + forward              crouch 0..1 the knees bend, the hips sink
//   step   0..1 the left foot leads           brace  0..1 the right foot leads, the left sets back
//   wide   0..1 the feet set apart            squash 0..1 the contact squash (B9)
//   shove  0..1 the recoil (B3)               fever  0..1 the visor flares
const KEYS = ['heave', 'slam', 'raise', 'smash', 'lean', 'crouch', 'step', 'brace', 'wide', 'squash', 'shove', 'fever'];
function restChannels(C) {
  for (const k of KEYS) C[k] = 0;
  return C;
}
const lerp = (a, b, k) => a + (b - a) * k;
const ZERO = restChannels({});
const HEAVED = { heave: 1, slam: 0, raise: 0, smash: 0, lean: -0.2, crouch: 0.3, step: 0, brace: 1, wide: 0.4, squash: 0, shove: 0, fever: 1 };
const SLAMMED = { heave: 0, slam: 1, raise: 0, smash: 0, lean: 0.38, crouch: 0.42, step: 1, brace: 0, wide: 0.3, squash: 1, shove: 0, fever: 1 };
const RAISED = { heave: 0, slam: 0, raise: 1, smash: 0, lean: -0.24, crouch: 0.22, step: 0, brace: 0.5, wide: 1, squash: 0, shove: 0, fever: 1 };
const SMASHED = { heave: 0, slam: 0, raise: 0, smash: 1, lean: 0.42, crouch: 0.62, step: 0.6, brace: 0, wide: 1, squash: 1, shove: 0, fever: 1 };
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
  const wind = id === 'floodgate' ? HEAVED : RAISED;
  const struck = id === 'floodgate' ? SLAMMED : SMASHED;
  if (id !== 'floodgate' && id !== 'undertow') return C;
  if (s.id === 'heave' || s.id === 'raise') mixPose(C, from, wind, ease.inOut(Math.min(1, k * 1.15)));
  else if (s.id === 'slam' || s.id === 'smash') mixPose(C, wind, struck, kick(k)); // B4: off on the press frame
  else if (s.id === 'hold') mixPose(C, struck, struck, 0);
  else if (s.id === 'recoil') {
    mixPose(C, struck, struck, 0);
    C.squash = 1 - ease.out(k);
    C.shove = recoil(k * 0.2);
  } else {
    mixPose(C, ZERO, struck, settle(k));
    C.squash = 0;
    C.shove = recoil(0.2 + k * 0.5);
  }
  return C;
}

// --- The hands' key poses (body space): the gate hand [x, y, z, gate pitch,
// gate yaw] (pitch 0 upright facing +Z, + tips the sill forward) and the maul
// hand [x, y, z, maul pitch] (pitch 0 the stone straight up, PI hanging).
const GATE_REST = [-0.72, 1.28, 0.3, 0.0, -0.35];
const GATE_HEAVE = [-0.58, 1.86, -0.18, -0.75, 0.45];
const GATE_SLAM = [-0.36, 1.06, 0.68, 0.28, 0.08];
const MAUL_REST = [0.74, 1.36, 0.16, Math.PI - 0.18];
const MAUL_RAISE = [0.42, 2.12, -0.26, 0.28];
const MAUL_SMASH = [0.3, 1.02, 0.56, Math.PI / 2 + 0.52];
// the walk's arm swing (u, the hands' z, opposite to the feet)
const SWING = 0.06;

// --- Geometry (shared, faceted once).
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:sluice-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  gut: () => geo('gut', () => new IcosahedronGeometry(0.62, 1).scale(1.15, 0.9, 0.95), 301, 0.06),
  hump: () => geo('hump', () => new IcosahedronGeometry(0.5, 1).scale(1.3, 0.75, 0.9), 303, 0.07),
  hip: () => geo('hip', () => new CylinderGeometry(0.46, 0.4, 0.3, 8), 305),
  cap: () => geo('cap', () => new IcosahedronGeometry(0.24, 0), 307, 0.12),
  skull: () => geo('skull', () => taperBox(0.36, 0.32, 0.34, 0.85, 0.8, 0.02), 309),
  brow: () => geo('brow', () => taperBox(0.42, 0.08, 0.16, 0.9, 1, 0), 311),
  thigh: () => geo('thigh', () => limbBox(0.3, 0.3, UPPER, 0.78, 0.78), 313),
  shin: () => geo('shin', () => limbBox(0.24, 0.24, LOWER, 0.85, 0.85), 315),
  foot: () => geo('foot', () => taperBox(0.3, FOOT_H, 0.42, 0.8, 0.6).translate(0, FOOT_H / 2, 0.06), 317, 0.12),
  toecap: () => geo('toecap', () => taperBox(0.26, 0.09, 0.14, 0.7, 0.5).translate(0, 0.05, 0.22), 319, 0.1),
  upperArm: () => geo('upper-arm', () => limbBox(0.24, 0.24, ARM_A, 0.8, 0.8), 321),
  foreArm: () => geo('fore-arm', () => limbBox(0.2, 0.2, ARM_B, 0.85, 0.85), 323),
  fist: () => geo('fist', () => new IcosahedronGeometry(0.12, 0), 325, 0.1),
  plank: () => geo('plank', () => new BoxGeometry(0.26, 1.2, 0.08), 327, 0.05),
  rail: () => geo('rail', () => new BoxGeometry(0.09, 1.3, 0.13), 329, 0.04),
  band: () => geo('band', () => new BoxGeometry(1.14, 0.1, 0.13), 331, 0.04),
  haft: () => geo('haft', () => new CylinderGeometry(0.05, 0.065, HAFT, 6).translate(0, HAFT / 2, 0), 333),
  ferrule: () => geo('ferrule', () => new CylinderGeometry(0.075, 0.075, 0.12, 6), 335, 0.05),
  stone: () => geo('stone', () => new CylinderGeometry(STONE_R, STONE_R, 0.26, 10).rotateZ(Math.PI / 2).translate(0, HAFT - 0.05, 0), 337, 0.07),
  hole: () => sharedGeo('sluice-hole', () => new CylinderGeometry(0.09, 0.09, 0.28, 6).rotateZ(Math.PI / 2).translate(0, HAFT - 0.05, 0)),
  rivet: () => geo('rivet', () => new IcosahedronGeometry(0.035, 0), 339, 0.1),
  drip: () => sharedGeo('sluice-drip', () => new IcosahedronGeometry(0.03, 0).scale(1, 1.6, 1)),
  bar: () => geo('bar', () => new BoxGeometry(0.03, 0.3, 0.03), 341, 0.03),
  eye: () => sharedGeo('sluice-eye', () => new BoxGeometry(0.22, 0.04, 0.02)),
};

const _m = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const POLE_KNEE = new Vector3(0, 0.05, 1);
const POLE_ELBOW_R = new Vector3(0.7, -0.3, -1);
const POLE_ELBOW_L = new Vector3(-0.7, -0.3, -1);

function tellGlow(size, opacity) {
  const g = makeGlowSprite({ color: TELL_INDIGO_GLOW, size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(TELL_INDIGO_GLOW);
  return g;
}

export function buildSluiceWardenFacet() {
  const group = new Group();
  group.name = 'sluice_warden';
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
  const hide = track(flashable(WARDEN_HIDE));
  const hideLit = track(flashable(HIDE_LIT));
  const dark = track(flashable(WARDEN_DARK));
  const plank = track(flashable(PLANK));
  const plankDark = track(flashable(PLANK_DARK));
  const iron = track(flashable(IRON));
  const ironDark = track(flashable(IRON_DARK));
  const stone = track(flashable(STONE));
  const weed = track(flashable(WEED));
  const inkMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal), toneMapped: false });
  const tellMat = new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
  const dripMat = new MeshBasicMaterial({ color: DRIP, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();
  const plate = plateGeometry();

  // --- The barrel: a dark hip drum, the gut, the hump over it, hunched.
  const body = new Group(); // the classic's hunch (rotation.x 0.18) lives here
  torso.add(body);
  const hip = mesh(G.hip(), dark, body);
  hip.position.y = 0.92;
  const gut = mesh(G.gut(), hide, body);
  gut.position.y = 1.2;
  const crownLit = placeRow(plate, hideLit, 6, (i, m) => {
    const a = -0.9 + (i / 5) * 1.8;
    lay(m, Math.sin(a) * 0.5, 1.58, Math.cos(a) * 0.42 + 0.08, Math.sin(a) * 0.5, 1, Math.cos(a) * 0.5, 0.22, 0.12, 0.26, 0.1 * (i % 2));
  }, { name: 'sluice-gut-lit', inkPx: PART_INK_PX, mottle: 0.1, seed: 51 });
  body.add(crownLit);
  const hump = mesh(G.hump(), dark, body);
  hump.position.set(0, 1.64, -0.18);
  // the weir's two iron bands: riveted plates laid brick-wise round the gut
  const BAND_N = 12;
  const bands = placeRow(plate, iron, BAND_N * 2, (i, m) => {
    const row = i < BAND_N ? 0 : 1;
    const j = i % BAND_N;
    const a = ((j + row * 0.5) / BAND_N) * Math.PI * 2;
    const r = row ? 0.66 : 0.68;
    const y = row ? 1.38 : 1.0;
    lay(m, Math.sin(a) * r * 1.1, y, Math.cos(a) * r * 0.95, Math.sin(a), 0, Math.cos(a), 0.3, 0.07, 0.12, Math.PI / 2);
  }, { name: 'sluice-bands', inkPx: PART_INK_PX, mottle: 0.1, seed: 53 });
  body.add(bands);
  const rivets = placeRow(G.rivet(), ironDark, BAND_N * 2, (i, m) => {
    const row = i < BAND_N ? 0 : 1;
    const j = i % BAND_N;
    const a = ((j + row * 0.5 + 0.5) / BAND_N) * Math.PI * 2;
    const r = row ? 0.69 : 0.71;
    lay(m, Math.sin(a) * r * 1.1, row ? 1.38 : 1.0, Math.cos(a) * r * 0.95, Math.sin(a), 0, Math.cos(a), 1, 1, 1);
  }, { name: 'sluice-rivets', inkPx: PART_INK_PX, mottle: 0.08, seed: 55 });
  body.add(rivets);
  // iron shoulder caps
  const caps = [];
  for (const side of [-1, 1]) {
    const c = mesh(G.cap(), iron, body);
    c.scale.set(1.25, 0.8, 1.1);
    c.position.set(side * 0.74, 1.72, 0.0);
    caps.push(c);
  }

  // --- The head: a small boxed skull under a brow plate and a grating of
  // five bars, the indigo eye slit (the ONE tell) behind it.
  const head = new Group();
  head.position.set(0, 1.86, 0.32);
  body.add(head);
  const skull = mesh(G.skull(), dark, head);
  skull.position.y = 0.0;
  const brow = mesh(G.brow(), iron, head);
  brow.position.set(0, 0.17, 0.1);
  const bars = placeRow(G.bar(), iron, 5, (i, m) => lay(m, -0.13 + i * 0.065, -0.02, 0.19, 0, 1, 0, 1, 1, 1), { name: 'sluice-bars', inkPx: PART_INK_PX * 0.8, mottle: 0 });
  head.add(bars);
  const eye = new Mesh(G.eye(), tellMat);
  eye.position.set(0, 0.03, 0.165);
  head.add(eye);
  const eyeGlow = tellGlow(0.5, 0.3);
  eyeGlow.position.set(0, 0.03, 0.22);
  head.add(eyeGlow);

  // --- Arms: upper arm and forearm reaching the hands by IK.
  const arms = [SHOULDER_L, SHOULDER_R].map((sh, i) => {
    const upper = new Group();
    mesh(G.upperArm(), hide, upper);
    const fore = new Group();
    mesh(G.foreArm(), dark, fore);
    const fist = mesh(G.fist(), dark, torso);
    torso.add(upper, fore);
    return { side: i ? 1 : -1, shoulder: new Vector3(...sh), elbow: new Vector3(), hand: new Vector3(), upper, fore, fist, pole: i ? POLE_ELBOW_R : POLE_ELBOW_L };
  });

  // --- The sluice gate (left): four planks in a riveted iron frame, weed off
  // the sill, drips running down the planks. Its space: the grip at the
  // origin on the back, the face +Z, the sill at -0.65.
  const gate = new Group();
  torso.add(gate);
  const gateFace = new Group();
  gateFace.position.set(0, -0.05, 0.12);
  gate.add(gateFace);
  const planks = placeRow(G.plank(), plank, 4, (i, m) => lay(m, -0.39 + i * 0.26, 0, 0, 0, 1, 0, 1, 1, 1), { name: 'sluice-planks', inkPx: PART_INK_PX, mottle: 0.12, seed: 57 });
  gateFace.add(planks);
  const shade = placeRow(wedge, plankDark, 3, (i, m) => lay(m, -0.26 + i * 0.26, -0.1 - (i % 2) * 0.2, -0.02, 0, 1, 0, 0.05, 0.5, 0.06), { name: 'sluice-plank-shade', inkPx: PART_INK_PX * 0.7, mottle: 0 });
  gateFace.add(shade);
  const frame = placeRow(G.band(), iron, 2, (i, m) => lay(m, 0, i ? 0.44 : -0.44, 0.03, 0, 1, 0, 1, 1, 1), { name: 'sluice-gate-bands', inkPx: PART_INK_PX, mottle: 0.06, seed: 59 });
  gateFace.add(frame);
  const rails = placeRow(G.rail(), ironDark, 2, (i, m) => lay(m, i ? 0.56 : -0.56, 0, 0.01, 0, 1, 0, 1, 1, 1), { name: 'sluice-gate-rails', inkPx: PART_INK_PX, mottle: 0.06, seed: 61 });
  gateFace.add(rails);
  const gateRivets = placeRow(G.rivet(), ironDark, 8, (i, m) => lay(m, -0.39 + (i % 4) * 0.26, i < 4 ? 0.44 : -0.44, 0.1, 0, 0, 1, 1, 1, 1), { name: 'sluice-gate-rivets', inkPx: PART_INK_PX, mottle: 0.08, seed: 63 });
  gateFace.add(gateRivets);
  const weeds = placeRow(wedge, weed, 5, (i, m) => {
    const x = -0.42 + i * 0.21;
    lay(m, x, -0.6, 0.06, 0.2 * (i % 3 - 1), -1, 0.15, 0.1, 0.26 + 0.08 * hash01(i, 3), 0.4, 0.3 * (i % 2));
  }, { name: 'sluice-weed', inkPx: PART_INK_PX, mottle: 0.14, seed: 65 });
  gateFace.add(weeds);
  const DRIPS = 5;
  const drips = instancedPart(G.drip(), dripMat, DRIPS, { name: 'sluice-drips', ink: false, moving: true });
  gateFace.add(drips);

  // --- The millstone maul (right): a ferruled haft and a chisel-marked stone.
  const maul = new Group();
  torso.add(maul);
  mesh(G.haft(), ironDark, maul);
  const ferrule = mesh(G.ferrule(), iron, maul);
  ferrule.position.y = 0.02;
  mesh(G.stone(), stone, maul);
  maul.add(new Mesh(G.hole(), inkMat));
  const chisel = placeRow(wedge, ironDark, 10, (i, m) => {
    const a = (i / 10) * Math.PI * 2;
    lay(m, 0.14, HAFT - 0.05 + Math.sin(a) * (STONE_R - 0.02), Math.cos(a) * (STONE_R - 0.02), 1, 0, 0, 0.06, 0.06, 0.16, a);
  }, { name: 'sluice-chisel', inkPx: PART_INK_PX * 0.7, mottle: 0.1, seed: 67 });
  maul.add(chisel);

  // --- Legs: thigh and shin reaching the locked boots by IK, an iron toe
  // cap on each.
  const legs = LEGS.map(([hx, fx, fz, grp], i) => {
    const upper = new Group();
    mesh(G.thigh(), dark, upper);
    const lower = new Group();
    mesh(G.shin(), dark, lower);
    const foot = new Group();
    mesh(G.foot(), dark, foot);
    mesh(G.toecap(), iron, foot);
    grow.add(upper, lower, foot);
    return { i, hipLocal: new Vector3(hx, HIP_Y, 0), home: [fx, fz], group: grp, upper, lower, foot, a: UPPER, b: LOWER, pole: POLE_KNEE, footH: FOOT_H * 0.8, hip: null };
  });
  const knees = instancedPart(G.cap(), ironDark, legs.length, { name: 'sluice-knees', moving: true });
  mottle(knees, 0.1, 69);
  grow.add(knees);

  // --- Ground: the contact shadow, a root child (never under the hit
  // overlay's node, so it stays on the floor).
  const shadow = groundShadow(0.9, 0.85);
  group.add(shadow);

  // --- Named points (B8) and the shared overlay's tuning (§6.1 item 9: a
  // champion takes half the squash and flinch and keeps a small hop).
  const points = makePoints({
    tip: [maul, 0, HAFT - 0.05, 0],
    hand: [maul, 0, 0, 0],
    gate: [gateFace, 0, 0, 0.06],
    visor: [head, 0, 0.03, 0.22],
  });
  const footPts = legs.map((L) => {
    const name = L.i ? 'footR' : 'footL';
    const p = makePoints({ [name]: [grow, 0, 0, 0] })[name];
    points[name] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 1, axis: 'y', midY: 1.15 };

  // --- Locked feet.
  pivot.updateMatrix();
  squashG.updateMatrix();
  torso.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(_m.makeTranslation(0, -HIP_Y, 0)).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.3, lift: 0.18, minDur: 0.14, maxDur: 0.34, durPerSpeed: 0.03, lead: 0.55, flight: 3.4 } });
  const { gait } = legRig;
  const C = restChannels({});
  // stance: the left foot leads on a slam, the right on a heave; wide apart
  const stance = (i, out) => {
    const side = i ? 1 : -1;
    out.z += i ? -0.18 * C.step + 0.3 * C.brace : 0.36 * C.step - 0.22 * C.brace;
    out.x += side * 0.16 * C.wide;
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
  const strikeOf = (id) => WARDEN_ABILITIES[id].startOf(id === 'floodgate' ? 'slam' : 'smash');

  // In game: the sim's warning IS the wind-up (B1), stretched over the
  // telegraph and ending one strike before it resolves, so the slam and the
  // smash land on the sim's tick. On a slow frame the strike may run ahead
  // of the resolve, but the contact holds until the warning is gone.
  function drive(dt, e) {
    const tel = e && e.telegraph ? e.telegraph : null;
    const move = tel ? tel.move : null;
    const id = move === 'floodgate' || move === 'undertow' ? move : null;
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
      if (ab && ab.t < strikeOf(ab.id)) ab.t = strikeOf(ab.id);
    }
    if (!ab) return restChannels(C);
    const tl = WARDEN_ABILITIES[ab.id];
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
  // a held contact: the slam and the smash are taken on planted feet
  function holding() {
    if (!ab) return false;
    const ph = WARDEN_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'slam' || ph === 'smash' || ph === 'hold';
  }

  const blend = (out, rest, a, b, wa, wb, n) => {
    const wr = Math.max(0, 1 - wa - wb);
    const sum = wr + wa + wb || 1;
    for (let j = 0; j < n; j++) out[j] = (rest[j] * wr + a[j] * wa + b[j] * wb) / sum;
    return out;
  };
  const gp = [0, 0, 0, 0, 0];
  const mp = [0, 0, 0, 0];

  // Lay the body, the arms, the legs and the drips for this frame.
  function apply(dt, { locked, hold = false, rage = 0 }) {
    // the walk: the body rolls over a passing foot and leans into the travel
    gait.localVelocity(yaw, lv);
    const speed = Math.hypot(lv.x, lv.z);
    const sp = Math.min(1.6, speed / WARDEN_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? Math.min(0.1, (lv.z / WARDEN_WALK) * 0.05) : 0) - leanF) * k;
    leanS += ((sp > 0.05 ? (-lv.x / WARDEN_WALK) * 0.03 : 0) - leanS) * k;
    walkPh += speed * dt * 2.2;
    const wound = Math.min(1, C.heave + C.slam + C.raise + C.smash);
    const walkK = Math.min(1, sp) * (1 - wound);
    const bobY = 0.05 * gait.bob * Math.min(1, sp);
    const breathe = 0.012 * Math.sin(idle * 1.8);
    pivot.position.set(0, HIP_Y + breathe + bobY - 0.2 * C.crouch, -0.1 * C.shove);
    pivot.rotation.set(C.lean + leanF - 0.12 * C.shove, 0.06 * Math.sin(walkPh) * walkK - 0.2 * C.heave + 0.1 * C.slam, leanS + 0.05 * Math.sin(walkPh) * walkK);
    // the classic's hunch, deeper on a smash
    body.rotation.x = 0.18 + 0.1 * C.raise - 0.1 * C.heave + 0.1 * C.smash;
    // the contact squash kept to a champion's size: +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    gut.scale.set(1, 1 + 0.025 * Math.sin(idle * 1.8), 1);
    head.rotation.set(-0.12 * C.raise + 0.18 * C.smash + 0.12 * C.slam + 0.03 * Math.sin(idle * 0.9), 0.06 * Math.sin(idle * 0.9) * (1 - C.fever) + 0.15 * C.heave, 0);
    pivot.updateMatrix();
    squashG.updateMatrix();

    // the gate arm
    blend(gp, GATE_REST, GATE_HEAVE, GATE_SLAM, C.heave, C.slam, 5);
    const swing = SWING * Math.sin(walkPh) * walkK;
    const L = arms[0];
    L.hand.set(gp[0], gp[1], gp[2] + swing);
    gate.position.copy(L.hand);
    gate.rotation.set(gp[3] + 0.05 * Math.sin(walkPh) * walkK, gp[4], 0.06 * C.heave);
    // the maul arm
    blend(mp, MAUL_REST, MAUL_RAISE, MAUL_SMASH, C.raise, C.smash, 4);
    const R = arms[1];
    R.hand.set(mp[0], mp[1], mp[2] - swing);
    maul.position.copy(R.hand);
    maul.rotation.set(mp[3], 0, -0.1 * Math.max(0, 1 - C.raise - C.smash) + 0.25 * C.raise);
    for (const A of arms) {
      solveTwoBone(A.shoulder, A.hand, ARM_A, ARM_B, A.pole, A.elbow);
      aimSegment(A.upper, A.shoulder, A.elbow);
      _b.subVectors(A.hand, A.elbow);
      _c.copy(A.elbow).addScaledVector(_b.normalize(), Math.min(ARM_B, A.hand.distanceTo(A.elbow)));
      aimSegment(A.fore, A.elbow, _c);
      A.fist.position.copy(_c);
    }

    // the drips: beads run down the planks and fall off the sill
    for (let i = 0; i < DRIPS; i++) {
      const p = (idle * 0.8 + i * 0.7) % 1;
      const s = 1 - p * 0.8;
      lay(_m, -0.4 + i * 0.2, -0.62 - p * 0.5, 0.06, 0, 1, 0, s, s, s);
      drips.setMatrixAt(i, _m);
    }
    drips.instanceMatrix.needsUpdate = true;

    // the feet
    legRig.update(dt, { space: yaw, stance, locked, hold });
    for (const Lg of legs) {
      const S = legRig.state[Lg.i];
      // a lifted foot tips its toes down
      Lg.foot.rotation.set(0.5 * S.up, 0, 0);
      footPts[Lg.i].position.copy(Lg.foot.position);
      _a.subVectors(S.knee, S.hip).normalize();
      _c.subVectors(S.end, S.knee).normalize();
      lay(_m, S.knee.x, S.knee.y, S.knee.z + 0.08, _a.x - _c.x, _a.y - _c.y, _a.z - _c.z + 0.4, 0.9, 0.7, 0.9);
      knees.setMatrixAt(Lg.i, _m);
    }
    knees.instanceMatrix.needsUpdate = true;

    // the tell: the eye slit breathes, flares with the wind-up, burns in rage
    eyeGlow.material.opacity = Math.min(0.85, 0.26 + 0.06 * Math.sin(idle * 2.2) + 0.4 * C.fever + (rage ? 0.2 + 0.1 * Math.sin(idle * 9) : 0));
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
      abilities: WARDEN_ABILITIES,
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
      parts: { pivot, body, head, gate, maul, legs, caps },
      pose({ dt, ability = null, abT = 0, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, WARDEN_ABILITIES[ability].sample(abT), C);
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
