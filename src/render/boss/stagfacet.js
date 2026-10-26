// THE HOLLOW STAG, MODEL STANDARD (docs/MODEL_STANDARD.md). The Level I boss
// rebuilt in the faceted look of Kesh's sample video, laid on top of the
// chibi ink style and keeping every identity beat the certification rounds
// fought for (render/boss/stag.js): a dark self-lit barrel under a near-Bone
// skull, withers and muzzle (the value structure that makes an animal read
// from above), the unlit God-stuff Violet rack veined in white with a crown
// core that is the brightest thing in the room, the hollow rib cage over a
// violet cavity, the violet ridge down the spine, the Bone tail flag, the
// warm ground pool and the hard contact shadow. What the standard adds:
//
//   * a coat of ridged plates laid in a brick pattern over the barrel (Bone-
//     pale over the withers, slate down the back), a boxed skull and muzzle,
//     a dark mane of blades under the neck, cheek plates, fetlock tufts, knee
//     plates and hoof bands; the rack is segmented beams with fourteen tines,
//     a white vein on every beam and tine, and a slow violet rune ring round
//     the crown (Kesh's magic template: runes and an arcane circle);
//   * FOUR LOCKED HOOVES (render/facet/gait.js): every hoof is pinned to the
//     floor while it carries weight and the legs reach it by two-bone IK; it
//     trots in diagonal pairs that step along the real travel, and a hoof
//     the leg can no longer reach lifts, never slides;
//   * two ability timelines driven by the sim:
//       Antler Quake  rear (the telegraph less one strike: the forelegs fold
//                     up, the haunches load, the head lifts), slam (2.5
//                     frames, landing on the quake's tick: the forehooves
//                     land a step ahead, the rack comes down), contact held,
//                     recoil, settle with one overshoot;
//       Trample       gather (1.5 frames: the sim gives no warning; head
//                     down, haunches set), gore (2.5 frames from the lunge's
//                     contact: the rack hooks up, the forehooves land a step
//                     ahead), contact held with a recoil, settle;
//   * the [M] beats (render/facet/beats.js): a spawn-in grow from the floor,
//     named points (mouth, the crown as `tip`, chest, each hoof), and the hit
//     reaction is the shared envelope's (`react`), never its own.
//
// Same interface as render/boss/stag.js (group, mats, lightMount, setYaw,
// setFlash, pose), plus `lab`, `points`, `react`. Faces +Z. Render only: it
// reads the sim entity and never writes it; every clip runs off pose's t.
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  LinearSRGBColorSpace,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { addInk, exactColor, INK_PX } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { HIDE, TELL_VIOLET } from '../enemies/style.js';
import { VEIN_VIOLET } from '../../env/props.js';
import { facetize, facetMaterial } from '../facet/material.js';
import { PART_INK_PX, createPlateTube, createSpine, instancedPart, mottle, placeRow, wedgeGeometry } from '../facet/kit.js';
import { lay, limbBox, taperBox } from '../facet/shapes.js';
import { createLegs } from '../facet/legs.js';
import { createTimeline, ease } from '../facet/timeline.js';
import { GATHER_SEC, HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../facet/beats.js';

// --- Colour: the classic Stag's recipe, unchanged (stag.js explains every
// value: the rack is post-chain-exact violet, the veins the white peak, the
// hide a desaturated charcoal-slate under a near-Bone skull and withers).
const VEIN_CORE = exactColor(PALETTE.godstuffVioletPeak);
const RACK = exactColor('#8F63EE');
const HALO_LINEAR = [VEIN_VIOLET[0] * 1.12, VEIN_VIOLET[1] * 0.92, VEIN_VIOLET[2]];
const haloViolet = (k = 1) => new Color().setRGB(HALO_LINEAR[0] * k, HALO_LINEAR[1] * k, HALO_LINEAR[2] * k, LinearSRGBColorSpace);
const CROWN_LINEAR = [1.16, 1.02, 1.5];
const HULK = HIDE.boarBody.clone().lerp(new Color(PALETTE.warmGrey), 0.45).multiplyScalar(0.56);
const HULK_DARK = HIDE.boarDark.clone().lerp(new Color(PALETTE.warmGrey), 0.4).multiplyScalar(0.55);
const HULK_PALE = HIDE.boarBody.clone().lerp(new Color(PALETTE.bone), 0.86);
// the coat: one value step under the barrel's hide, so the plates read as
// plates with lit ridges and dark seams (the video's scales)
const COAT = HULK.clone().multiplyScalar(0.92);
const SHAG = HULK_DARK.clone().multiplyScalar(0.9);
const BONE = HIDE.bone.clone();

// Self-lit, as the classic (stag.js: the boss room runs a stop dark and no
// real light rides the boss): the base emissive lifts the body out of black;
// the hit flash lerps it to white.
const FLASH_WHITE = new Color('#FFFFFF');
const flashable = (color) => {
  const base = new Color(color).multiplyScalar(0.14);
  const m = facetMaterial(color, { emissive: base.clone(), emissiveIntensity: 1 });
  m.userData.baseEmissive = base;
  return m;
};

// --- Body plan (yaw space, faces +Z). The body pivots at the hind hips, so
// a rear lifts the front off the planted hind legs.
const HIP_Y = 1.06;
const PIVOT_Z = -0.66;
// Legs: [hip x, hip y, hip z, home x, home z, front, gait group]. The homes
// splay past the barrel, as the classic's legs do (four legs in plan view);
// the gait groups are the trot's diagonal pairs.
const LEGS = [
  [-0.32, 1.08, 0.5, -0.7, 0.56, true, 0],
  [0.32, 1.08, 0.5, 0.7, 0.56, true, 1],
  [-0.36, HIP_Y, PIVOT_Z, -0.74, -0.7, false, 1],
  [0.36, HIP_Y, PIVOT_Z, 0.74, -0.7, false, 0],
];
const UPPER = 0.62;
const LOWER = 0.66;
const HOOF_H = 0.09;
export const STAG_WALK = 1.8; // u/s, STAG.moveSpeed (sim/boss.js)

// --- Ability timelines (render only; the sim's numbers live in sim/boss.js
// STAG: a 42-tick quake telegraph, a 12-tick trample lunge).
export const STAG_ABILITIES = Object.freeze({
  quake: createTimeline('quake', 'Antler Quake', [
    { id: 'rear', label: 'rear up', dur: 0.7 },
    { id: 'slam', label: 'slam', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: 0.7 + STRIKE_SEC, id: 'quake' }] }),
  trample: createTimeline('trample', 'Trample', [
    { id: 'gather', label: 'gather', dur: GATHER_SEC },
    { id: 'gore', label: 'gore', dur: STRIKE_SEC },
    { id: 'held', label: 'gore held', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.45 },
  ], { cues: [{ at: GATHER_SEC + STRIKE_SEC, id: 'gore' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (all 0 at rest):
//   rear    0..1 the front lifts off the hind hips (forelegs off the floor)
//   load    0..1 the haunches sink under the rear
//   pitch   body pitch, + nose down        dip    0..1 the whole body lowers
//   reach   u the body leans its weight forward (rig only, a hoof step)
//   step    0..1 the forehooves land a lunge step ahead
//   head    head pitch, + down             rack   antler tilt, + forward
//   squash  0..1 the contact squash (B9)   shove  0..1 the recoil (B3)
//   fever   0..1 the corruption flares     stride 0..1 a galloping crouch
const KEYS = ['rear', 'load', 'pitch', 'dip', 'reach', 'step', 'head', 'rack', 'squash', 'shove', 'fever', 'stride'];
function restChannels(C) {
  for (const k of KEYS) C[k] = 0;
  return C;
}
const lerp = (a, b, k) => a + (b - a) * k;
const ZERO = restChannels({});
// The key poses.
const REARED = { rear: 1, load: 1, pitch: 0, dip: 0, reach: -0.06, step: 0, head: -0.3, rack: -0.15, squash: 0, shove: 0, fever: 1, stride: 0 };
const SLAMMED = { rear: 0, load: 0.25, pitch: 0.06, dip: 0.36, reach: 0.14, step: 1, head: 0.22, rack: 0.16, squash: 1, shove: 0, fever: 1, stride: 0 };
const LOWERED = { rear: 0, load: 0.3, pitch: 0.06, dip: 0.34, reach: 0.12, step: 0.6, head: 0.36, rack: 0.22, squash: 0, shove: 0, fever: 0.6, stride: 1 };
const GORED = { rear: 0, load: 0.1, pitch: 0.0, dip: 0.2, reach: 0.18, step: 1, head: -0.22, rack: -0.12, squash: 1, shove: 0, fever: 0.4, stride: 0 };
function mixPose(C, A, B, k) {
  for (const key of KEYS) C[key] = lerp(A[key], B[key], k);
  return C;
}
// the gather's end: the head lowered, the haunches set (60% of the run pose)
const GATHERED = mixPose({}, ZERO, LOWERED, 0.6);

// Pure: the channels of an ability at a timeline sample. `from` is the pose
// the ability starts out of (B1/B5: a wind-up grows out of the last move's
// tail, never a snap from rest); the lab passes none.
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'quake') {
    if (s.id === 'rear') mixPose(C, from, REARED, ease.inOut(Math.min(1, k * 1.15)));
    else if (s.id === 'slam') mixPose(C, REARED, SLAMMED, kick(k)); // B4: off on the press frame
    else if (s.id === 'hold') mixPose(C, SLAMMED, SLAMMED, 0);
    else if (s.id === 'recoil') {
      mixPose(C, SLAMMED, SLAMMED, 0);
      C.squash = 1 - ease.out(k);
      C.shove = recoil(k * 0.2);
    } else {
      // B5: home with one overshoot past rest
      mixPose(C, ZERO, SLAMMED, settle(k));
      C.squash = 0;
      C.shove = recoil(0.2 + k * 0.5);
    }
  } else if (id === 'trample') {
    if (s.id === 'gather') mixPose(C, from, GATHERED, ease.out(k));
    else if (s.id === 'gore') mixPose(C, GATHERED, GORED, kick(k));
    else if (s.id === 'held') {
      mixPose(C, GORED, GORED, 0);
      C.shove = recoil(k * HOLD_SEC); // B3: the gore shoves the Stag back
    } else {
      mixPose(C, ZERO, GORED, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.45);
    }
  }
  return C;
}

// --- Geometry (shared, faceted once).
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:stag-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  barrel: () => geo('barrel', () => new IcosahedronGeometry(0.58, 1), 101),
  chest: () => geo('chest', () => new IcosahedronGeometry(0.46, 1), 103),
  haunch: () => geo('haunch', () => new IcosahedronGeometry(0.3, 1), 105),
  neck: () => geo('neck', () => new CylinderGeometry(0.21, 0.33, 0.72, 6), 107),
  skull: () => geo('skull', () => taperBox(0.42, 0.34, 0.46, 0.8, 0.84, 0.02), 109),
  muzzle: () => geo('muzzle', () => taperBox(0.27, 0.22, 0.44, 0.7, 0.74, 0.03), 111),
  nose: () => geo('nose', () => taperBox(0.15, 0.1, 0.08, 0.86, 0.86), 113),
  jaw: () => geo('jaw', () => taperBox(0.22, 0.08, 0.36, 0.62, 0.8), 115),
  upperF: () => geo('upper-f', () => limbBox(0.17, 0.15, UPPER, 0.6, 0.66), 117),
  upperH: () => geo('upper-h', () => limbBox(0.26, 0.24, UPPER, 0.42, 0.5), 119),
  lower: () => geo('lower', () => limbBox(0.09, 0.09, LOWER, 0.78, 0.78), 121),
  hoof: () => geo('hoof', () => taperBox(0.16, HOOF_H, 0.2, 0.84, 0.6).translate(0, HOOF_H / 2, 0.02), 123, 0.12),
  beam: () => geo('beam', () => new CylinderGeometry(0.78, 1, 1, 5).translate(0, 0.5, 0), 125),
  bead: () => geo('bead', () => new IcosahedronGeometry(0.085, 0), 127, 0.05),
  ear: () => geo('ear', () => new ConeGeometry(0.1, 0.3, 4).scale(1, 1, 0.45), 129),
  cavity: () => sharedGeo('stag-cavity', () => new SphereGeometry(0.2, 8, 6)),
  eye: () => sharedGeo('stag-eye', () => new BoxGeometry(0.15, 0.035, 0.035)),
};

// The contact shadow's own alpha ramp (stag.js: full alpha to half radius).
let shadowTex = null;
function getShadowTex() {
  if (shadowTex) return shadowTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const h = size / 2;
  const g = ctx.createRadialGradient(h, h, 0, h, h, h);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.52, 'rgba(255,255,255,1)');
  g.addColorStop(0.74, 'rgba(255,255,255,0.72)');
  g.addColorStop(0.9, 'rgba(255,255,255,0.26)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  shadowTex = new CanvasTexture(canvas);
  shadowTex.colorSpace = SRGBColorSpace;
  return shadowTex;
}
function floorShadow(radius, opacity, factor, order) {
  const m = new Mesh(
    sharedGeo(`stag-shadow:${radius}`, () => new CircleGeometry(radius, 30)),
    new MeshBasicMaterial({ map: getShadowTex(), color: exactColor('#0B1018'), transparent: true, opacity, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: factor, polygonOffsetUnits: factor })
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = order;
  return m;
}
function groundGlow(radius, color, opacity) {
  const m = new Mesh(
    sharedGeo(`stag-glow-disc:${radius}`, () => new CircleGeometry(radius, 28)),
    new MeshBasicMaterial({ map: getRadialTexture(), color, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false })
  );
  m.material.opacity = opacity;
  m.rotation.x = -Math.PI / 2;
  return m;
}
function violetGlow(size, opacity, k) {
  const g = makeGlowSprite({ color: PALETTE.godstuffViolet, size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(haloViolet(k));
  return g;
}


// --- The rack (antler space: the top of the skull, +Z forward). One beam a
// side through five points, with seven tines off it; mirrored by side.
const BEAM = [
  [0.1, 0.0, -0.02],
  [0.38, 0.2, -0.14],
  [0.7, 0.38, -0.22],
  [0.98, 0.62, -0.2],
  [1.1, 0.9, -0.08],
];
const BEAM_R = [0.072, 0.062, 0.052, 0.042];
// [beam point, dx, dy, dz, length]
const TINES = [
  [1, 0.1, 0.5, 1, 0.4], // brow tine, forward over the face
  [2, 0.0, 1, 0.55, 0.46],
  [2, 0.45, 0.6, -0.65, 0.28],
  [3, -0.15, 1, 0.3, 0.44],
  [3, 0.7, 0.75, 0.05, 0.32],
  [4, -0.3, 1, 0.2, 0.32],
  [4, 0.5, 1, -0.2, 0.28],
];
const CROWN = [0, 0.86, -0.3]; // the crown star between the beams (antler space)

const _m = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const POLE_FRONT = new Vector3(0, 0.1, 1);
const POLE_HIND = new Vector3(0, 0.1, -1);

export function buildStagFacet() {
  const group = new Group();
  group.name = 'hollow-stag';
  group.userData.modelStandard = true;
  const yaw = new Group();
  group.add(yaw);
  const grow = new Group(); // B7 spawn-in scale
  yaw.add(grow);
  const pivot = new Group(); // the body, pivoting at the hind hips
  pivot.position.set(0, HIP_Y, PIVOT_Z);
  grow.add(pivot);
  const body = new Group(); // body space = the classic rig's space
  body.position.set(0, -HIP_Y, -PIVOT_Z);
  pivot.add(body);
  const squashG = new Group(); // the contact squash, about the barrel's centre
  squashG.position.set(0, 1.3, -0.1);
  body.add(squashG);
  const torso = new Group();
  torso.position.set(0, -1.3, 0.1);
  squashG.add(torso);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const hide = track(flashable(HULK));
  const hideDark = track(flashable(HULK_DARK));
  const hidePale = track(flashable(HULK_PALE));
  const coat = track(flashable(COAT));
  const shag = track(flashable(SHAG));
  const bone = track(flashable(BONE));
  const veinCore = new MeshBasicMaterial({ color: VEIN_CORE, toneMapped: false });
  const rackMat = new MeshBasicMaterial({ color: RACK, toneMapped: false });
  const glows = [];
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- Barrel, chest and haunches: the faceted core under the coat.
  const barrel = mesh(G.barrel(), hide, torso);
  barrel.scale.set(0.8, 0.8, 1.52);
  barrel.position.set(0, 1.3, -0.2);
  const chest = mesh(G.chest(), hideDark, torso);
  chest.scale.set(0.9, 0.92, 0.84);
  chest.position.set(0, 1.3, 0.38);
  for (const side of [-1, 1]) {
    const haunch = mesh(G.haunch(), hide, torso);
    haunch.scale.set(1.0, 1.3, 1.25);
    haunch.position.set(side * 0.3, 1.26, -0.7);
  }

  // --- The coat: ridged plates in a brick pattern round a spine through the
  // barrel, Bone-pale over the withers (the classic's hump: the light plane
  // the eye lands on from above) and slate from the back to the rump.
  const spine = createSpine(6);
  [[0, 1.36, 0.62], [0, 1.42, 0.3], [0, 1.36, -0.05], [0, 1.33, -0.4], [0, 1.36, -0.74], [0, 1.42, -1.02]].forEach(([x, y, z], i) => spine.pts[i].set(x, y, z));
  const coatR = (u) => 0.34 + 0.17 * Math.sin(Math.PI * (0.15 + 0.8 * u));
  const mantle = createPlateTube({ spine, rings: 3, around: 9, arc: Math.PI * 1.0, u0: 0.04, u1: 0.3, radius: coatR, plateMat: hidePale, tilt: 0.36, thick: 0.06, name: 'stag-mantle' });
  const pelt = createPlateTube({ spine, rings: 9, around: 9, arc: Math.PI * 1.05, u0: 0.3, u1: 1, radius: coatR, plateMat: coat, tilt: 0.36, thick: 0.06, name: 'stag-coat' });
  mantle.update();
  pelt.update();
  torso.add(mantle.plates, pelt.plates);

  // --- THE HOLLOW: ribs over a violet cavity under the chest (a real emitter).
  const RIBS = 6;
  const ribs = placeRow(wedge, bone, RIBS, (i, m) => {
    const k = (i - (RIBS - 1) / 2) / ((RIBS - 1) / 2);
    lay(m, k * 0.3, 0.98 - 0.04 * k * k, 0.66 - 0.08 * k * k, k * 0.35, 1, 0.3, 0.09, 0.36 - 0.06 * Math.abs(k), 0.4);
  }, { name: 'stag-ribs', inkPx: PART_INK_PX, mottle: 0.06, seed: 33 });
  torso.add(ribs);
  const cavity = new Mesh(G.cavity(), new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false }));
  cavity.scale.set(1, 0.8, 0.7);
  cavity.position.set(0, 1.08, 0.6);
  torso.add(cavity);
  const cavityGlow = violetGlow(0.7, 0.36, 0.55);
  cavityGlow.position.set(0, 1.08, 0.72);
  torso.add(cavityGlow);
  glows.push(cavityGlow);

  // --- The dorsal ridge: violet blades up the spine with white vein cores.
  const RIDGE = 7;
  const ridgeAt = (i, out) => {
    const u = 0.12 + (0.8 * i) / (RIDGE - 1);
    spine.point(u, out);
    out.y += coatR(u) * 0.98;
    return 0.26 + 0.14 * Math.sin((i / (RIDGE - 1)) * Math.PI);
  };
  const ridge = placeRow(wedge, rackMat, RIDGE, (i, m) => {
    const h = ridgeAt(i, _a);
    lay(m, _a.x, _a.y - 0.05, _a.z, 0, 0.75, -0.66, 0.22, h, 0.5);
  }, { name: 'stag-ridge', ink: false, mottle: 0 });
  const ridgeVeins = placeRow(wedge, veinCore, RIDGE, (i, m) => {
    const h = ridgeAt(i, _a);
    lay(m, _a.x, _a.y - 0.03, _a.z + 0.01, 0, 0.75, -0.66, 0.045, h * 0.7, 0.62);
  }, { name: 'stag-ridge-veins', ink: false, mottle: 0 });
  torso.add(ridge, ridgeVeins);

  // --- The tail flag (the rump's identity when the muzzle faces away).
  const tail = new Group();
  tail.position.set(0, 1.5, -1.12);
  torso.add(tail);
  const tailFan = placeRow(wedge, bone, 3, (i, m) => {
    const a = (i - 1) * 0.4;
    lay(m, Math.sin(a) * 0.05, 0, 0, Math.sin(a) * 0.6, 0.5, -0.85, 0.22, 0.38 - Math.abs(a) * 0.2, 0.6);
  }, { name: 'stag-tail', inkPx: INK_PX * 0.6, mottle: 0.05, seed: 35 });
  tail.add(tailFan);

  // --- Neck and head (the classic's placement: low and forward, so the
  // skull clears the chest in plan view).
  const head = new Group();
  head.position.set(0, 1.3, 1.2);
  torso.add(head);
  const neck = mesh(G.neck(), hideDark, head);
  neck.scale.set(0.82, 1.1, 0.8);
  neck.position.set(0, -0.06, -0.38);
  neck.rotation.x = 0.85;
  // the mane: dark blades hanging under the neck and throat
  const MANE = 9;
  const mane = placeRow(wedge, shag, MANE, (i, m) => {
    const k = i / (MANE - 1);
    const side = ((i % 3) - 1) * 0.08;
    lay(m, side, -0.2 - 0.06 * Math.sin(k * Math.PI), -0.62 + 0.6 * k, side * 1.5, -1, -0.35, 0.16, 0.3 + 0.12 * Math.sin(k * Math.PI), 0.45, side * 3);
  }, { name: 'stag-mane', inkPx: PART_INK_PX, mottle: 0.16, seed: 31 });
  head.add(mane);
  const skull = mesh(G.skull(), hidePale, head);
  skull.position.set(0, 0.1, 0.14);
  const muzzle = mesh(G.muzzle(), bone, head);
  muzzle.position.set(0, -0.02, 0.5);
  muzzle.rotation.x = 0.26;
  const nose = mesh(G.nose(), hideDark, head);
  nose.position.set(0, -0.1, 0.73);
  nose.rotation.x = 0.26;
  const jaw = mesh(G.jaw(), hideDark, head);
  jaw.position.set(0, -0.16, 0.4);
  jaw.rotation.x = 0.18;
  // brow ridges and cheek plates: the skull's mask
  const brow = placeRow(wedge, hidePale, 2, (i, m) => {
    const side = i ? 1 : -1;
    lay(m, side * 0.14, 0.24, 0.24, side * 0.55, 0.2, 0.8, 0.2, 0.26, 0.5, side * 0.6);
  }, { name: 'stag-brow', inkPx: PART_INK_PX, mottle: 0 });
  const cheeks = placeRow(wedge, hidePale, 6, (i, m) => {
    const side = i % 2 ? 1 : -1;
    const j = i >> 1;
    lay(m, side * 0.21, 0.02 - j * 0.03, 0.02 + j * 0.13, side * 0.3, -0.25, 1, 0.16, 0.2, 0.5, side * 1.2);
  }, { name: 'stag-cheeks', inkPx: PART_INK_PX, mottle: 0.12, seed: 39 });
  head.add(brow, cheeks);
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = mesh(G.ear(), hideDark, head);
    ear.scale.set(1.6, 1.4, 1.6);
    ear.position.set(side * 0.26, 0.2, -0.02);
    ear.rotation.set(-0.3, 0, side * -1.06);
    ears.push(ear);
  }
  // angular slit eyes with a violet glint (stag.js: never round warm eyes)
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const glintMat = new MeshBasicMaterial({ color: RACK, toneMapped: false });
  for (const side of [-1, 1]) {
    const eye = new Mesh(G.eye(), eyeMat);
    eye.position.set(side * 0.2, 0.13, 0.3);
    eye.rotation.set(0, side * -0.3, side * 0.4);
    head.add(eye);
    const glint = new Mesh(G.eye(), glintMat);
    glint.scale.set(0.5, 0.9, 0.9);
    glint.position.set(side * 0.215, 0.14, 0.32);
    glint.rotation.copy(eye.rotation);
    head.add(glint);
    const eg = violetGlow(0.22, 0.35, 0.6);
    eg.position.set(side * 0.22, 0.14, 0.36);
    head.add(eg);
    glows.push(eg);
  }

  // --- The rack: segmented beams, tines, a white vein on each, sparks on
  // alternate tines, the halo, and the crown: a burr of six violet spikes
  // round a white bead with the HDR core over it (the room's brightest light,
  // stag.js) inside a slow ring of violet runes.
  const antlers = new Group();
  antlers.position.set(0, 0.26, 0.02);
  head.add(antlers);
  const beamAt = (i, m, k) => {
    const side = i < 4 ? -1 : 1;
    const j = i % 4;
    const [ax, ay, az] = BEAM[j];
    const [bx, by, bz] = BEAM[j + 1];
    _a.set(side * ax, ay, az);
    _b.set(side * bx, by, bz);
    _c.subVectors(_b, _a);
    const len = _c.length() * 1.04;
    const r = BEAM_R[j] * k;
    // a vein rides the beam's front face
    const off = k < 1 ? BEAM_R[j] * 0.62 : 0;
    lay(m, _a.x, _a.y, _a.z + off, _c.x, _c.y, _c.z, r, len, r, side * 0.3);
  };
  const beams = placeRow(G.beam(), rackMat, 8, (i, m) => beamAt(i, m, 1), { name: 'stag-beams', inkPx: PART_INK_PX * 1.3, mottle: 0 });
  const beamVeins = placeRow(G.beam(), veinCore, 8, (i, m) => beamAt(i, m, 0.26), { name: 'stag-beam-veins', ink: false, mottle: 0 });
  const tineAt = (i, m, k) => {
    const side = i < TINES.length ? -1 : 1;
    const [p, dx, dy, dz, len] = TINES[i % TINES.length];
    const [px, py, pz] = BEAM[p];
    const r = BEAM_R[Math.min(3, p)] * 1.9;
    lay(m, side * px, py, pz + (k < 1 ? r * 0.12 : 0), side * dx, dy, dz, r * k, len * (k < 1 ? 0.92 : 1), 0.5 * k, side * 0.5);
  };
  const tines = placeRow(wedge, rackMat, TINES.length * 2, (i, m) => tineAt(i, m, 1), { name: 'stag-tines', inkPx: PART_INK_PX, mottle: 0 });
  const tineVeins = placeRow(wedge, veinCore, TINES.length * 2, (i, m) => tineAt(i, m, 0.34), { name: 'stag-tine-veins', ink: false, mottle: 0 });
  antlers.add(beams, beamVeins, tines, tineVeins);
  for (let i = 0; i < TINES.length * 2; i += 2) {
    const side = i < TINES.length ? -1 : 1;
    const [p, dx, dy, dz, len] = TINES[i % TINES.length];
    const [px, py, pz] = BEAM[p];
    _c.set(side * dx, dy, dz).normalize();
    const spark = violetGlow(0.26, 0.4, 0.6);
    spark.position.set(side * px + _c.x * len * 0.85, py + _c.y * len * 0.85, pz + _c.z * len * 0.85);
    antlers.add(spark);
    glows.push(spark);
  }
  const rackHalo = violetGlow(1.7, 0.42, 1);
  rackHalo.position.set(CROWN[0], CROWN[1] - 0.04, CROWN[2]);
  antlers.add(rackHalo);
  glows.push(rackHalo);
  const crownStar = new Group();
  crownStar.position.set(CROWN[0], CROWN[1], CROWN[2]);
  antlers.add(crownStar);
  crownStar.add(mesh(G.bead(), new MeshBasicMaterial({ color: VEIN_CORE, toneMapped: false })));
  const burr = placeRow(wedge, rackMat, 6, (i, m) => {
    const a = (i / 6) * Math.PI * 2;
    lay(m, Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0, Math.cos(a), Math.sin(a), 0, 0.12, 0.17, 0.5);
  }, { name: 'stag-crown-burr', inkPx: PART_INK_PX, mottle: 0 });
  crownStar.add(burr);
  // the arcane circle: eight rune blades on a ring round the crown, turning
  const runes = new Group();
  crownStar.add(runes);
  runes.add(placeRow(wedge, rackMat, 8, (i, m) => {
    const a = (i / 8) * Math.PI * 2;
    lay(m, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0, -Math.sin(a), Math.cos(a), 0, 0.07, i % 2 ? 0.1 : 0.16, 0.4);
  }, { name: 'stag-runes', ink: false, mottle: 0 }));
  const crownCore = makeGlowSprite({ color: PALETTE.godstuffVioletPeak, size: 0.36, opacity: 0.6 });
  crownCore.material.toneMapped = false;
  crownCore.material.color.setRGB(CROWN_LINEAR[0], CROWN_LINEAR[1], CROWN_LINEAR[2], LinearSRGBColorSpace);
  crownCore.position.set(CROWN[0], CROWN[1], CROWN[2]);
  antlers.add(crownCore);

  // --- Legs: thigh or forearm and cannon reaching the locked hooves by IK,
  // with a pale plate on each knee, a dark band and tufts at each fetlock and
  // Bone hooves flat on the floor.
  const legs = LEGS.map(([hx, hy, hz, fx, fz, front, grp], i) => {
    const upper = new Group();
    mesh(front ? G.upperF() : G.upperH(), front ? hideDark : hide, upper);
    const lower = new Group();
    mesh(G.lower(), hideDark, lower);
    const hoof = new Group();
    mesh(G.hoof(), bone, hoof);
    grow.add(upper, lower, hoof);
    return { i, front, hipLocal: new Vector3(hx, hy, hz), home: [fx, fz], group: grp, upper, lower, foot: hoof, a: UPPER, b: LOWER, pole: front ? POLE_FRONT : POLE_HIND, footH: HOOF_H * 0.8, hip: null };
  });
  const knees = instancedPart(wedge, hidePale, legs.length, { name: 'stag-knees', moving: true });
  const bands = instancedPart(wedge, shag, legs.length * 3, { name: 'stag-fetlocks', moving: true });
  mottle(bands, 0.14, 37);
  grow.add(knees, bands);

  // --- Ground: the warm boss-light pool (stag.js: the pool IS the boss
  // light), the hard and soft contact shadows on the floor. The floor pieces
  // are the root's own children, so the shared hit envelope (which wraps the
  // yaw node) never lifts them; setYaw turns the pool's offset by hand.
  const pool = groundGlow(1.9, PALETTE.hearthAmber, 0.44);
  pool.position.set(0, 0.03, -0.3);
  group.add(pool);
  const spill = groundGlow(3.4, PALETTE.hearthAmber, 0.22);
  spill.position.set(0, 0.02, -0.3);
  group.add(spill);
  const hardShadow = floorShadow(0.92, 0.92, -6, 6);
  hardShadow.position.set(0, 0.038, 0.62);
  hardShadow.scale.set(1.45, 1.02, 1);
  group.add(hardShadow);
  const softShadow = floorShadow(1.55, 0.5, -5, 5);
  softShadow.position.set(0, 0.036, 0.42);
  softShadow.scale.set(1.1, 0.86, 1);
  group.add(softShadow);
  const lightMount = new Group();
  lightMount.position.set(0, 1.05, -0.55);
  yaw.add(lightMount);

  // --- Named points (B8) and the shared hit envelope's tuning (§6.1 item 9:
  // a boss takes half the squash and flinch, no knockback overlay).
  const points = makePoints({
    mouth: [head, 0, -0.1, 0.78],
    tip: [crownStar, 0, 0, 0],
    chest: [torso, 0, 1.1, 0.7],
  });
  const HOOF_NAMES = ['hoofFL', 'hoofFR', 'hoofHL', 'hoofHR'];
  const hoofPts = legs.map((L) => {
    const p = makePoints({ [HOOF_NAMES[L.i]]: [grow, 0, 0, 0] })[HOOF_NAMES[L.i]];
    points[HOOF_NAMES[L.i]] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 0, axis: 'y', midY: 1.3 };

  // --- Locked hooves.
  body.updateMatrix();
  // a hip in grow space: body space through the body's offset and the pivot
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(body.matrix).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.42, lift: 0.24, minDur: 0.13, maxDur: 0.32, durPerSpeed: 0.06, lead: 0.6, flight: 3.0 } });
  const { gait } = legRig;
  const C = restChannels({});
  // stance: the forehooves land a lunge step ahead in the slam and the gore
  const stance = (i, out) => {
    if (legs[i].front) out.z += 0.24 * C.step;
    else out.z -= 0.04 * C.step;
    return out;
  };
  const raise = (i) => (legs[i].front ? C.rear : 0);
  // a reared foreleg folds up under the chest: the hoof tucked back and in
  const raiseTo = (i, out) => {
    hipOf(legs[i], out);
    out.y -= 0.56;
    out.z += 0.12;
    out.x *= 0.9;
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
  let quakeSeen = false;
  let lungeSeen = false;
  let teleSpan = 0.7;
  let telAge = 0;
  let from = { ...ZERO };
  let replantPending = false;
  const lv = new Vector3();
  let leanF = 0;
  let leanS = 0;

  function reset() {
    lastT = null;
    ab = null;
    quakeSeen = false;
    lungeSeen = false;
    from = { ...ZERO };
    spawn.clear();
  }
  // a new ability starts out of this frame's pose (its contact beats spent)
  function begin(id) {
    from = { ...C, squash: 0, shove: 0 };
    ab = { id, t: 0 };
  }

  // In game: the sim's telegraph and lunge drive the timelines. The quake's
  // rear is stretched over the telegraph (B1: the telegraph IS the wind-up)
  // and ends one strike before the sim resolves it, so the slam lands on
  // the quake's tick. The Trample has no warning: the sim's lunge starts the
  // gather, and the gore lands on the lunge's contact (lungeHit), or at the
  // gather's end on a miss.
  function drive(dt, e) {
    const tel = e && e.telegraph ? e.telegraph : null;
    const QK = STAG_ABILITIES.quake;
    const slamAt = QK.startOf('slam');
    if (tel) {
      if (!quakeSeen) {
        quakeSeen = true;
        telAge = 0;
        teleSpan = Math.max(0.05, (tel.resolveTick > tel.startTick ? (tel.resolveTick - tel.startTick) / 60 : 0.7) - STRIKE_SEC);
        begin('quake');
      }
    } else if (quakeSeen) {
      quakeSeen = false;
      if (ab && ab.id === 'quake') ab.t = Math.max(ab.t, slamAt);
    }
    const lunging = !!(e && e.lungeTicksLeft > 0);
    if (lunging && !lungeSeen) begin('trample');
    lungeSeen = lunging;
    if (!ab) return restChannels(C);
    const tl = STAG_ABILITIES[ab.id];
    if (ab.id === 'quake' && quakeSeen && ab.t < slamAt) {
      telAge += dt;
      ab.t = telAge < teleSpan ? Math.min(slamAt - 1e-4, (telAge * 0.7) / teleSpan) : slamAt;
    } else ab.t += dt;
    if (ab.id === 'trample' && e && e.lungeHit && ab.t < tl.startOf('gore')) ab.t = tl.startOf('gore');
    abilityChannels(ab.id, tl.sample(ab.t), C, from);
    if (ab.t >= tl.duration) ab = null;
    return C;
  }
  // a held contact: the slam and the gore are taken on planted hooves
  function holding() {
    if (!ab) return false;
    const ph = STAG_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'slam' || ph === 'hold' || ph === 'gore' || ph === 'held';
  }

  // Lay the body, the legs and the glow for this frame.
  function apply(dt, { locked, hpFrac, sealK = 0, hold = false }) {
    // the walk: the body rises over a passing hoof and leans into the travel
    gait.localVelocity(yaw, lv);
    const sp = Math.min(1.6, Math.hypot(lv.x, lv.z) / STAG_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? (lv.z / STAG_WALK) * 0.04 : 0) - leanF) * k;
    leanS += ((sp > 0.05 ? (-lv.x / STAG_WALK) * 0.03 : 0) - leanS) * k;
    const bobY = 0.05 * gait.bob * Math.min(1, sp);
    const breathe = 0.012 * Math.sin(idle * 1.6);
    pivot.position.set(0, HIP_Y + breathe + bobY - 0.12 * C.dip - 0.1 * C.load, PIVOT_Z + C.reach - 0.1 * C.shove);
    pivot.rotation.set(-0.62 * C.rear + C.pitch + leanF, 0, leanS);
    // the contact squash kept to a boss's size (Kesh's pick over B9's full
    // +19% / -9%): +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    head.rotation.set(C.head - 0.05 * Math.sin(idle * 0.9) * (1 - C.fever) + 0.04 * C.stride * Math.sin(idle * 18), 0.05 * Math.sin(idle * 0.55), 0);
    antlers.rotation.x = C.rack;
    runes.rotation.z = idle * 0.6;
    tail.rotation.x = 0.55 + 0.12 * Math.sin(idle * 2.7) + 0.4 * C.rear;
    for (let s = 0; s < 2; s++) ears[s].rotation.x = -0.3 + 0.7 * Math.max(0, Math.sin(idle * 1.3 + s * 2.1) - 0.85);
    pivot.updateMatrix();

    // the hooves
    legRig.update(dt, { space: yaw, stance, locked, raise, raiseTo, hold });
    let n = 0;
    for (const L of legs) {
      const S = legRig.state[L.i];
      // a lifted hoof tips (the toe trails a forehoof, leads a hind one)
      L.foot.rotation.set((L.front ? 0.8 : -0.6) * S.up, 0, 0);
      hoofPts[L.i].position.copy(L.foot.position);
      // the knee plate on the front of the joint, the band and two tufts at the fetlock
      _a.subVectors(S.knee, S.hip).normalize();
      _c.subVectors(S.end, S.knee).normalize();
      const kneeOut = L.front ? 1 : -1;
      lay(_m, S.knee.x, S.knee.y, S.knee.z, _a.x - _c.x * 0.6, _a.y - _c.y * 0.6, _a.z - _c.z * 0.6 + 0.3 * kneeOut, 0.15, 0.2, 0.55);
      knees.setMatrixAt(L.i, _m);
      lay(_m, S.end.x, S.end.y - 0.02, S.end.z, -_c.x, -_c.y, -_c.z, 0.16, 0.12, 0.7);
      bands.setMatrixAt(n++, _m);
      for (const side of [-1, 1]) {
        lay(_m, S.end.x + side * 0.04, S.end.y + 0.06, S.end.z - 0.03, side * 0.25 - _c.x * 0.2, -0.8, -0.6, 0.11, 0.17, 0.5);
        bands.setMatrixAt(n++, _m);
      }
    }
    knees.instanceMatrix.needsUpdate = true;
    bands.instanceMatrix.needsUpdate = true;

    // glow: corruption breathes, flares with the wind-up, burns as it weakens
    const fever = 0.72 + 0.16 * Math.sin(idle * 2.4) + 0.5 * C.fever + (1 - hpFrac) * 0.3 + sealK * (0.34 + 0.22 * Math.sin(idle * 7.5));
    rackHalo.material.opacity = Math.min(0.6, 0.48 * fever);
    crownCore.material.opacity = Math.min(0.6, 0.46 * fever);
    cavityGlow.material.opacity = Math.min(0.85, 0.46 * fever + 0.12 * C.stride);
    for (const g of glows) if (g !== rackHalo && g !== cavityGlow) g.material.opacity = Math.min(0.75, 0.44 * fever);
    pool.material.opacity = Math.min(0.6, 0.44 + 0.06 * Math.sin(idle * 1.9) + 0.1 * C.fever);
    spill.material.opacity = Math.min(0.34, 0.22 + 0.04 * Math.sin(idle * 1.9) + 0.06 * C.fever);
  }

  return {
    group,
    mats,
    lightMount,
    points,
    react,
    setYaw: (r) => {
      yaw.rotation.y = r;
      pool.position.set(-0.3 * Math.sin(r), 0.03, -0.3 * Math.cos(r));
      spill.position.set(-0.3 * Math.sin(r), 0.02, -0.3 * Math.cos(r));
    },
    // §9 #1: each hide material rides from its base emissive to white; the
    // unlit rack, veins and glows are untouched (the flash is the BODY's).
    setFlash(k) {
      const v = k < 0 ? 0 : k > 1 ? 1 : k;
      for (const m of mats) m.emissive.copy(m.userData.baseEmissive).lerp(FLASH_WHITE, v);
    },
    // pose: { t, hpFrac, sealK, e (the sim entity, read only), turntable }.
    // A dying rig is posed with e = null: its hooves unlock and it collapses
    // in the pose it died in (no wind-up runs on into a strike).
    pose({ t, hpFrac = 1, sealK = 0, e = null, turntable = false }) {
      const id = e ? e.id : lastId;
      // a new boss (or a rewound clock) spawns in; a jump in place (a hitch
      // mid-charge) only re-plants the hooves
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
      apply(dt, { locked: !turntable && g === 1 && !!e, hpFrac, sealK, hold: holding() });
    },
    // The model lab: pose an ability at any time (play, scrub, rewind) while
    // the lab walks the rig along its path. The channels are pure in abT.
    lab: {
      abilities: STAG_ABILITIES,
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
      parts: { pivot, head, antlers, legs },
      pose({ dt, ability = null, abT = 0, hpFrac = 1, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, STAG_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        const g = ability === 'spawn' ? spawnGrow(abT) : 1;
        grow.scale.setScalar(g);
        if (replantPending) {
          replantPending = false;
          pivot.updateMatrix();
          gait.reset(yaw, stance);
        }
        apply(dt, { locked: !rigid && g === 1, hpFrac });
      },
    },
  };
}
