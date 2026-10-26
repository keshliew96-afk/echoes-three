// THE MOSS HART, MODEL STANDARD (docs/MODEL_STANDARD.md "Level I champions").
// The Hollow Wood's second champion rebuilt in the faceted look of Kesh's
// sample video, on top of the chibi ink style, keeping the classic rig's
// identity (render/enemies/champions2.js): a great hart of bark and moss, a
// deep barrel with high shoulders, a moss mantle over the back with strands
// hanging, bark plates down the flanks, branching antlers hung with moss and
// lit with pale lichen, and the ONE indigo tell, a crack down its brow. What
// the standard adds:
//
//   * a faceted barrel, chest and haunches, ridged bark plates laid down each
//     flank, the mantle as faceted moss lumps with blade strands and lichen
//     motes, a ruff of moss blades at the throat, a boxed skull and muzzle,
//     and segmented antler beams with eight tines a side, a lichen bud on
//     every tine and moss drapes off the beams;
//   * FOUR LOCKED HOOVES (render/facet/gait.js): every hoof is pinned to the
//     floor while it carries weight and the legs reach it by two-bone IK; it
//     trots in diagonal pairs that step along the real travel, and a hoof the
//     leg can no longer reach lifts, never slides;
//   * two ability timelines driven by the sim:
//       Antler Toss  lower (the warning less one strike: the head dropped,
//                    the rack levelled, the haunches set), fling (2.5 frames,
//                    landing on the toss's tick: the rack flung up and back,
//                    the forehooves a step ahead), contact held, recoil,
//                    settle with one overshoot;
//       Hart's Leap  gather (the sim's crouch, 45% of the warning: the
//                    haunches load, the head low), bound (the sim's flight:
//                    up ~1.5 u, forelegs reaching, then all four tucked),
//                    land (2.5 frames, on the forehooves, the contact held
//                    on the sim's landing tick), settle;
//   * the [M] beats (render/facet/beats.js): a spawn-in grow from the floor,
//     named points (the `mouth`, the rack's `tip`, the `chest`, each hoof),
//     and the hit reaction is the shared overlay's (render/react.js), tuned
//     by `react`.
//
// Same interface as the classic (group, mats, setYaw, pose), plus `lab`,
// `points`, `react`. Faces +Z. Render only: it reads the sim entity and never
// writes it; every clip runs off pose's t. The bound's height is the classic's
// `hartLift` (champions2.js), so the champion's crown rides up with it.
import { Color, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Vector3, BoxGeometry, ConeGeometry } from 'three';
import { addInk, exactColor, groundShadow } from '../../critters/common.js';
import { PALETTE, VFX_MATTER } from '../../../data/palette.js';
import { makeGlowSprite } from '../../glow.js';
import { sharedGeo } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { hartLift } from '../champions2.js';
import { facetize, facetMaterial } from '../../facet/material.js';
import { PART_INK_PX, instancedPart, mottle, placeRow, plateGeometry, wedgeGeometry } from '../../facet/kit.js';
import { lay, limbBox, taperBox } from '../../facet/shapes.js';
import { createLegs } from '../../facet/legs.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../../facet/beats.js';

// --- Colour: the classic Moss Hart's hides (champions2.js C), unchanged.
const HART_HIDE = HIDE.boarDark.clone().lerp(new Color(PALETTE.bruiseUmber), 0.6).multiplyScalar(1.2);
const HART_BELLY = new Color(PALETTE.warmGrey).lerp(new Color(PALETTE.bruiseUmber), 0.55).multiplyScalar(0.9);
const HART_BARK = HIDE.quillDark.clone().lerp(new Color(PALETTE.bruiseUmber), 0.5).multiplyScalar(0.85);
const MOSS = new Color(VFX_MATTER.moss).lerp(new Color(PALETTE.signalBlue), 0.12);
const MOSS_DARK = new Color(VFX_MATTER.moss).multiplyScalar(0.62);
const ANTLER = new Color(PALETTE.bone).lerp(new Color(PALETTE.bruiseUmber), 0.45).multiplyScalar(0.9);
const LICHEN = VFX_MATTER.lichen;
// the standard's value steps: a darker hide down the legs, a lit withers
const HIDE_DARK = HART_HIDE.clone().multiplyScalar(0.72);
const HOOF = new Color(PALETTE.voidCharcoal).lerp(HART_HIDE, 0.25);

const flashable = (color) => facetMaterial(color, { emissive: '#FFFFFF', emissiveIntensity: 0 });

// --- Body plan (yaw space, faces +Z). The body pivots at the hind hips, so
// the fling lifts the front off the planted hind legs.
const HIP_Y = 1.15;
const PIVOT_Z = -0.62;
// Legs: [hip x, hip z, home x, home z, front, gait group] (the trot's
// diagonal pairs).
const LEGS = [
  [-0.3, 0.6, -0.4, 0.64, true, 0],
  [0.3, 0.6, 0.4, 0.64, true, 1],
  [-0.32, PIVOT_Z, -0.42, -0.66, false, 1],
  [0.32, PIVOT_Z, 0.42, -0.66, false, 0],
];
const UPPER = 0.62;
const LOWER = 0.72;
const HOOF_H = 0.1;
const LEAP_H = 1.5; // u, hartLift's peak
export const HART_WALK = 1.3; // u/s, MH.moveSpeed (sim/enemies/champions.js)

// --- Ability timelines (render only; the sim's numbers: a 56-tick toss, a
// 74-tick leap that crouches for 45% and flies until 95%).
const LEAP_W = 74 / 60;
const GATHER = 0.45 * LEAP_W;
const BOUND = 0.5 * LEAP_W;
export const HART_ABILITIES = Object.freeze({
  toss: createTimeline('toss', 'Antler Toss', [
    { id: 'lower', label: 'lower the rack', dur: 0.8 },
    { id: 'fling', label: 'fling', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: 0.8 + STRIKE_SEC, id: 'toss' }] }),
  leap: createTimeline('leap', "Hart's Leap", [
    { id: 'gather', label: 'gather', dur: GATHER },
    { id: 'bound', label: 'bound', dur: BOUND },
    { id: 'land', label: 'land', dur: STRIKE_SEC },
    { id: 'hold', label: 'landing held', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: GATHER + BOUND + STRIKE_SEC, id: 'land' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (all 0 at rest):
//   neck   neck pitch, + down          head   head pitch, + down
//   rack   antler tilt, + forward      crouch 0..1 the body sinks, the haunches load
//   pitch  body pitch, + nose down     reach  u the body leans forward
//   step   0..1 the forehooves land a step ahead
//   air    0..1 off the ground         tuck   0..1 the legs drawn up (in the air)
//   squash 0..1 the contact squash     shove  0..1 the recoil (B3)
//   fever  0..1 the tell flares        glow   0..1 the lichen flares
const KEYS = ['neck', 'head', 'rack', 'crouch', 'pitch', 'reach', 'step', 'air', 'tuck', 'squash', 'shove', 'fever', 'glow'];
function restChannels(C) {
  for (const k of KEYS) C[k] = 0;
  return C;
}
const lerp = (a, b, k) => a + (b - a) * k;
const ZERO = restChannels({});
const LOWERED = { neck: 0.85, head: 0.35, rack: 0.22, crouch: 0.3, pitch: 0.12, reach: -0.08, step: 0.5, air: 0, tuck: 0, squash: 0, shove: 0, fever: 1, glow: 1 };
const FLUNG = { neck: -0.62, head: -0.22, rack: -0.16, crouch: 0.05, pitch: -0.2, reach: 0.18, step: 1, air: 0, tuck: 0, squash: 1, shove: 0, fever: 1, glow: 1 };
const GATHERED = { neck: 0.3, head: 0.12, rack: 0.06, crouch: 1, pitch: 0.12, reach: -0.06, step: 0.25, air: 0, tuck: 0, squash: 0, shove: 0, fever: 1, glow: 0.5 };
const LANDED = { neck: 0.3, head: 0.1, rack: 0.1, crouch: 0.55, pitch: 0.18, reach: 0.12, step: 1, air: 0, tuck: 0, squash: 1, shove: 0, fever: 0.7, glow: 0.4 };
function mixPose(C, A, B, k) {
  for (const key of KEYS) C[key] = lerp(A[key], B[key], k);
  return C;
}

// The bound's arc at k (0..1 through the flight): nose up rising, down
// falling; the legs reach, then tuck.
function boundPose(C, k) {
  const air = Math.sin(Math.PI * k);
  mixPose(C, GATHERED, LANDED, ease.inOut(k));
  C.crouch = (1 - k) * (1 - air);
  C.air = air;
  C.tuck = Math.min(1, air * 1.6);
  C.pitch = -0.3 * Math.cos(Math.PI * k) * air + 0.06;
  C.neck = 0.05 - 0.25 * air;
  C.squash = 0;
  return C;
}

// Pure: the channels of an ability at a timeline sample. `from` is the pose
// the ability starts out of (B1/B5: a wind-up grows out of the last move's
// tail, never a snap from rest); the lab passes none.
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'toss') {
    if (s.id === 'lower') mixPose(C, from, LOWERED, ease.inOut(Math.min(1, k * 1.15)));
    else if (s.id === 'fling') mixPose(C, LOWERED, FLUNG, kick(k)); // B4: off on the press frame
    else if (s.id === 'hold') mixPose(C, FLUNG, FLUNG, 0);
    else if (s.id === 'recoil') {
      mixPose(C, FLUNG, FLUNG, 0);
      C.squash = 1 - ease.out(k);
      C.shove = recoil(k * 0.2);
    } else {
      mixPose(C, ZERO, FLUNG, settle(k));
      C.squash = 0;
      C.shove = recoil(0.2 + k * 0.5);
    }
  } else if (id === 'leap') {
    if (s.id === 'gather') mixPose(C, from, GATHERED, ease.inOut(Math.min(1, k * 1.1)));
    else if (s.id === 'bound') boundPose(C, k);
    else if (s.id === 'land') mixPose(C, boundPose({}, 1), LANDED, kick(k));
    else if (s.id === 'hold') {
      mixPose(C, LANDED, LANDED, 0);
      C.shove = recoil(k * HOLD_SEC); // B3: the landing jolts it back
    } else {
      mixPose(C, ZERO, LANDED, settle(k));
      C.squash = 0;
      C.shove = recoil(HOLD_SEC + k * 0.5);
    }
  }
  return C;
}

// --- Geometry (shared, faceted once).
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:hart-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  barrel: () => geo('barrel', () => new IcosahedronGeometry(0.6, 1), 301),
  chest: () => geo('chest', () => new IcosahedronGeometry(0.5, 1), 303),
  haunch: () => geo('haunch', () => new IcosahedronGeometry(0.3, 1), 305),
  belly: () => geo('belly', () => new IcosahedronGeometry(0.46, 1), 307),
  neck: () => geo('neck', () => new CylinderGeometry(0.2, 0.3, 0.8, 6).translate(0, 0.32, 0), 309),
  skull: () => geo('skull', () => taperBox(0.3, 0.3, 0.42, 0.82, 0.86, 0.02), 311),
  muzzle: () => geo('muzzle', () => taperBox(0.2, 0.18, 0.38, 0.7, 0.72, 0.03), 313),
  nose: () => sharedGeo('hart-nose', () => new BoxGeometry(0.13, 0.07, 0.05)),
  ear: () => geo('ear', () => new ConeGeometry(0.08, 0.28, 4).scale(1, 1, 0.45).translate(0, 0.14, 0), 315),
  upperF: () => geo('upper-f', () => limbBox(0.17, 0.16, UPPER, 0.6, 0.66), 317),
  upperH: () => geo('upper-h', () => limbBox(0.25, 0.24, UPPER, 0.42, 0.5), 319),
  lower: () => geo('lower', () => limbBox(0.09, 0.09, LOWER, 0.78, 0.78), 321),
  hoof: () => geo('hoof', () => taperBox(0.15, HOOF_H, 0.18, 0.84, 0.6).translate(0, HOOF_H / 2, 0.02), 323, 0.12),
  beam: () => geo('beam', () => new CylinderGeometry(0.78, 1, 1, 5).translate(0, 0.5, 0), 325),
  lump: () => geo('lump', () => new IcosahedronGeometry(1, 0), 327, 0.12),
  bud: () => sharedGeo('hart-bud', () => new IcosahedronGeometry(0.038, 0)),
  eye: () => sharedGeo('hart-eye', () => new BoxGeometry(0.02, 0.035, 0.08)),
  crack: () => sharedGeo('hart-crack', () => new BoxGeometry(0.035, 0.2, 0.02)),
};

// --- The rack (antler space: the top of the skull, +Z forward). One beam a
// side through five points, eight tines off it; mirrored by side.
const BEAM = [
  [0.1, 0.0, -0.02],
  [0.34, 0.3, -0.12],
  [0.52, 0.66, -0.2],
  [0.6, 1.0, -0.14],
  [0.56, 1.32, 0.0],
];
const BEAM_R = [0.064, 0.055, 0.046, 0.038];
// [beam point, dx, dy, dz, length]
const TINES = [
  [1, 0.05, 0.45, 1, 0.38], // brow tine, forward over the face
  [1, 0.7, 0.6, 0.2, 0.26],
  [2, -0.1, 1, 0.5, 0.42],
  [2, 0.6, 0.7, -0.5, 0.3],
  [3, -0.3, 1, 0.35, 0.38],
  [3, 0.7, 0.8, 0.0, 0.3],
  [4, -0.35, 1, 0.15, 0.3],
  [4, 0.4, 1, -0.25, 0.26],
];
// moss drapes off the beams: [beam point, length]
const DRAPES = [[1, 0.36], [2, 0.42], [3, 0.3]];

const _m = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const POLE_FRONT = new Vector3(0, 0.1, 1);
const POLE_HIND = new Vector3(0, 0.1, -1);

function glowSprite(color, size, opacity) {
  const g = makeGlowSprite({ color, size, opacity });
  g.material.toneMapped = false;
  return g;
}

export function buildMossHartFacet() {
  const group = new Group();
  group.name = 'moss_hart';
  group.userData.modelStandard = true;
  const yaw = new Group(); // the root's first child: the hit overlay wraps it
  group.add(yaw);
  const grow = new Group(); // B7 spawn-in scale
  yaw.add(grow);
  const pivot = new Group(); // the body, pivoting at the hind hips
  pivot.position.set(0, HIP_Y, PIVOT_Z);
  grow.add(pivot);
  const body = new Group(); // body space = the classic rig's yaw space
  body.position.set(0, -HIP_Y, -PIVOT_Z);
  pivot.add(body);
  const squashG = new Group(); // the contact squash, about the barrel's centre
  squashG.position.set(0, 1.35, 0);
  body.add(squashG);
  const torso = new Group();
  torso.position.set(0, -1.35, 0);
  squashG.add(torso);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const hide = track(flashable(HART_HIDE));
  const hideDark = track(flashable(HIDE_DARK));
  const belly = track(flashable(HART_BELLY));
  const bark = track(flashable(HART_BARK));
  const moss = track(flashable(MOSS));
  const mossDark = track(flashable(MOSS_DARK));
  const antlerM = track(flashable(ANTLER));
  const hoofM = track(flashable(HOOF));
  const lichenM = new MeshBasicMaterial({ color: new Color(LICHEN), toneMapped: false });
  const inkM = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const tellMat = new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();
  const plate = plateGeometry();

  // --- Barrel, chest, belly and haunches (the classic's deep barrel, the
  // shoulders high).
  const barrel = mesh(G.barrel(), hide, torso);
  barrel.scale.set(0.78, 0.74, 1.45);
  barrel.position.set(0, 1.35, -0.05);
  const chest = mesh(G.chest(), hide, torso);
  chest.scale.set(0.85, 0.98, 0.82);
  chest.position.set(0, 1.47, 0.55);
  const under = mesh(G.belly(), belly, torso, false);
  under.scale.set(0.8, 0.5, 1.4);
  under.position.set(0, 1.13, 0);
  for (const side of [-1, 1]) {
    const haunch = mesh(G.haunch(), hide, torso);
    haunch.scale.set(1.0, 1.3, 1.3);
    haunch.position.set(side * 0.28, 1.32, -0.6);
  }
  // bark plates down each flank (the Wood grew through its hide)
  const flank = placeRow(plate, bark, 10, (i, m) => {
    const side = i < 5 ? -1 : 1;
    const j = i % 5;
    const z = 0.42 - j * 0.24;
    const y = 1.36 - (j % 2) * 0.12;
    lay(m, side * 0.45, y, z, side, 0.15, 0.1, 0.2, 0.18, 0.3 - 0.02 * j, 0.25 * side);
  }, { name: 'hart-flank', inkPx: PART_INK_PX, mottle: 0.14, seed: 81 });
  torso.add(flank);

  // --- The moss mantle: faceted lumps over the back and shoulders, blade
  // strands hanging off its edge, lichen motes glowing in it.
  const LUMPS = [[0, 1.77, 0.4, 0.34], [0.2, 1.73, 0.05, 0.3], [-0.22, 1.73, 0.0, 0.3], [0, 1.75, -0.4, 0.32], [0.15, 1.69, -0.72, 0.24], [-0.14, 1.68, -0.7, 0.24], [0, 1.85, 0.75, 0.26], [0.26, 1.66, 0.42, 0.2], [-0.26, 1.66, 0.38, 0.2]];
  const lumps = placeRow(G.lump(), moss, LUMPS.length, (i, m) => {
    const [x, y, z, r] = LUMPS[i];
    lay(m, x, y, z, 0, 1, 0, r, r * 0.6, r, i * 0.7);
  }, { name: 'hart-mantle', inkPx: PART_INK_PX * 1.4, mottle: 0.16, seed: 83 });
  torso.add(lumps);
  const STRANDS = 14;
  const strands = placeRow(wedge, mossDark, STRANDS, (i, m) => {
    const side = i % 2 ? 1 : -1;
    const j = i >> 1;
    lay(m, side * (0.4 + (j % 3) * 0.03), 1.56, 0.66 - j * 0.22, side * 0.2, -1, 0.05, 0.14, 0.42 + 0.08 * (j % 2), 0.45, side * 0.4);
  }, { name: 'hart-strands', inkPx: PART_INK_PX, mottle: 0.16, seed: 85 });
  torso.add(strands);
  const motes = placeRow(G.bud(), lichenM, 6, (i, m) => {
    lay(m, Math.sin(i * 2.1) * 0.24, 1.92 - (i % 2) * 0.06, 0.6 - i * 0.27, 0, 1, 0, 1, 1, 1);
  }, { name: 'hart-motes', ink: false, mottle: 0 });
  torso.add(motes);
  // the tail tuft
  const tail = new Group();
  tail.position.set(0, 1.6, -0.92);
  torso.add(tail);
  tail.add(placeRow(wedge, moss, 3, (i, m) => {
    const a = (i - 1) * 0.4;
    lay(m, Math.sin(a) * 0.05, 0, 0, Math.sin(a) * 0.5, 0.4, -0.9, 0.2, 0.34 - Math.abs(a) * 0.15, 0.6);
  }, { name: 'hart-tail', inkPx: PART_INK_PX, mottle: 0.1, seed: 87 }));

  // --- Neck and head (the classic's placement: high off the shoulders).
  const neck = new Group();
  neck.position.set(0, 1.65, 0.75);
  torso.add(neck);
  const neckM = mesh(G.neck(), hide, neck);
  neckM.rotation.x = 0.55;
  // the ruff: moss blades round the throat
  const ruff = placeRow(wedge, moss, 9, (i, m) => {
    const a = -1.5 + (i / 8) * 3.0;
    lay(m, Math.sin(a) * 0.24, 0.24, 0.12 + Math.cos(a) * 0.14, Math.sin(a) * 0.4, -1, 0.35, 0.2, 0.42, 0.45, a);
  }, { name: 'hart-ruff', inkPx: PART_INK_PX, mottle: 0.14, seed: 89 });
  neck.add(ruff);
  const head = new Group();
  head.position.set(0, 0.62, 0.38);
  head.scale.setScalar(1.3);
  neck.add(head);
  mesh(G.skull(), hide, head);
  const muzzle = mesh(G.muzzle(), belly, head);
  muzzle.position.set(0, -0.06, 0.32);
  const nose = new Mesh(G.nose(), inkM);
  nose.position.set(0, -0.04, 0.5);
  head.add(nose);
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = mesh(G.ear(), hideDark, head);
    ear.position.set(side * 0.16, 0.12, -0.08);
    ear.rotation.set(-0.3, 0, side * -1.0);
    ears.push(ear);
    const eye = new Mesh(G.eye(), inkM);
    eye.position.set(side * 0.155, 0.04, 0.1);
    head.add(eye);
  }
  // brow plates: the skull's mask
  head.add(placeRow(wedge, hideDark, 2, (i, m) => {
    const side = i ? 1 : -1;
    lay(m, side * 0.1, 0.15, 0.12, side * 0.5, 0.3, 0.8, 0.16, 0.2, 0.45, side * 0.6);
  }, { name: 'hart-brow', inkPx: PART_INK_PX, mottle: 0 }));
  // the tell: an indigo crack down the brow
  const crack = new Mesh(G.crack(), tellMat);
  crack.position.set(0, 0.08, 0.215);
  crack.rotation.z = 0.25;
  head.add(crack);
  const tellGlow = glowSprite(TELL_INDIGO_GLOW, 0.55, 0.3);
  tellGlow.material.color.copy(TELL_INDIGO_GLOW);
  tellGlow.position.set(0, 0.08, 0.26);
  head.add(tellGlow);

  // --- The rack: segmented beams and tines, a lichen bud on every tine and
  // the beam tips, moss drapes off the beams, the lichen glow over it.
  const antlers = new Group();
  antlers.position.set(0, 0.14, -0.05);
  head.add(antlers);
  const beamAt = (i, m) => {
    const side = i < 4 ? -1 : 1;
    const j = i % 4;
    const [ax, ay, az] = BEAM[j];
    const [bx, by, bz] = BEAM[j + 1];
    _a.set(side * ax, ay, az);
    _b.set(side * bx, by, bz);
    _c.subVectors(_b, _a);
    lay(m, _a.x, _a.y, _a.z, _c.x, _c.y, _c.z, BEAM_R[j], _c.length() * 1.04, BEAM_R[j], side * 0.3);
  };
  antlers.add(placeRow(G.beam(), antlerM, 8, beamAt, { name: 'hart-beams', inkPx: PART_INK_PX * 1.3, mottle: 0.06, seed: 91 }));
  const tineEnd = (i, out) => {
    const side = i < TINES.length ? -1 : 1;
    const [p, dx, dy, dz, len] = TINES[i % TINES.length];
    const [px, py, pz] = BEAM[p];
    _c.set(side * dx, dy, dz).normalize();
    return out.set(side * px + _c.x * len, py + _c.y * len, pz + _c.z * len);
  };
  antlers.add(placeRow(wedge, antlerM, TINES.length * 2, (i, m) => {
    const side = i < TINES.length ? -1 : 1;
    const [p, dx, dy, dz, len] = TINES[i % TINES.length];
    const [px, py, pz] = BEAM[p];
    const r = BEAM_R[Math.min(3, p)] * 1.8;
    lay(m, side * px, py, pz, side * dx, dy, dz, r, len, 0.5, side * 0.5);
  }, { name: 'hart-tines', inkPx: PART_INK_PX, mottle: 0.06, seed: 93 }));
  const BUDS = TINES.length * 2 + 2;
  const buds = instancedPart(G.bud(), lichenM, BUDS, { name: 'hart-buds', ink: false, moving: true });
  antlers.add(buds);
  antlers.add(placeRow(wedge, mossDark, DRAPES.length * 2, (i, m) => {
    const side = i < DRAPES.length ? -1 : 1;
    const [p, len] = DRAPES[i % DRAPES.length];
    const [px, py, pz] = BEAM[p];
    lay(m, side * px, py + 0.02, pz + 0.02, side * 0.12, -1, 0.05, 0.16, len, 0.4, side * 0.3);
  }, { name: 'hart-drapes', inkPx: PART_INK_PX, mottle: 0.16, seed: 95 }));
  const rackGlow = glowSprite(LICHEN, 1.6, 0.1);
  rackGlow.position.set(0, 1.0, -0.1);
  antlers.add(rackGlow);

  // --- Legs: thigh or forearm and cannon reaching the locked hooves by IK,
  // a bark knee plate on each, dark hooves flat on the floor.
  const legs = LEGS.map(([hx, hz, fx, fz, front, grp], i) => {
    const upper = new Group();
    mesh(front ? G.upperF() : G.upperH(), hide, upper);
    const lower = new Group();
    mesh(G.lower(), hideDark, lower);
    const hoof = new Group();
    mesh(G.hoof(), hoofM, hoof);
    grow.add(upper, lower, hoof);
    return { i, front, hipLocal: new Vector3(hx, HIP_Y, hz), home: [fx, fz], group: grp, upper, lower, foot: hoof, a: UPPER, b: LOWER, pole: front ? POLE_FRONT : POLE_HIND, footH: HOOF_H * 0.8, hip: null };
  });
  const knees = instancedPart(wedge, bark, legs.length, { name: 'hart-knees', moving: true });
  const fetlocks = instancedPart(wedge, mossDark, legs.length * 2, { name: 'hart-fetlocks', moving: true });
  mottle(fetlocks, 0.14, 97);
  grow.add(knees, fetlocks);

  // --- Ground: the contact shadow, a root child (never under the hit
  // overlay's node, so it stays on the floor).
  const shadow = groundShadow(1.0, 0.8, { deep: 1.4 });
  group.add(shadow);

  // --- Named points (B8) and the shared overlay's tuning (§6.1 item 9).
  const points = makePoints({
    mouth: [head, 0, -0.06, 0.52],
    tip: [antlers, 0, 1.2, -0.1],
    chest: [torso, 0, 1.25, 0.9],
  });
  const HOOF_NAMES = ['hoofFL', 'hoofFR', 'hoofHL', 'hoofHR'];
  const hoofPts = legs.map((L) => {
    const p = makePoints({ [HOOF_NAMES[L.i]]: [grow, 0, 0, 0] })[HOOF_NAMES[L.i]];
    points[HOOF_NAMES[L.i]] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 1, axis: 'y', midY: 1.35 };

  // --- Locked hooves.
  body.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(body.matrix).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.4, lift: 0.24, minDur: 0.12, maxDur: 0.3, durPerSpeed: 0.05, lead: 0.6, flight: 3.2 } });
  const { gait } = legRig;
  const C = restChannels({});
  // stance: the forehooves land a step ahead in the fling and the landing;
  // the gather draws the hind hooves in under the haunches
  const stance = (i, out) => {
    if (legs[i].front) out.z += 0.26 * C.step;
    else out.z += 0.14 * C.crouch - 0.04 * C.step;
    return out;
  };
  // the bound: forelegs reach forward, hind legs trail, both drawn up
  const tuck = (i, out) => {
    hipOf(legs[i], out);
    out.y -= legs[i].front ? 0.52 : 0.5;
    out.z += legs[i].front ? 0.56 : -0.58;
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

  function reset() {
    lastT = null;
    ab = null;
    telKey = null;
    from = { ...ZERO };
    spawn.clear();
  }
  function begin(id) {
    from = { ...C, air: 0, tuck: 0, squash: 0, shove: 0 };
    ab = { id, t: 0 };
  }

  // In game: the toss's warning IS the wind-up, stretched over the telegraph
  // and ending one strike before it resolves, so the fling lands on the
  // toss's tick. The leap follows the sim's own clock: the gather over its
  // crouch, the bound's height from hartLift (the crown's own), the landing
  // when the flight ends, the contact held from the sim's landing tick.
  function drive(dt, e, tick) {
    const tel = e && e.telegraph ? e.telegraph : null;
    const move = tel ? tel.move : null;
    const id = move === 'antler_toss' ? 'toss' : move === 'harts_leap' ? 'leap' : null;
    const key = id ? `${move}:${tel.startTick}` : null;
    if (key && key !== telKey) {
      telKey = key;
      telAge = 0;
      const W = tel.resolveTick > tel.startTick ? (tel.resolveTick - tel.startTick) / 60 : 0.9;
      teleSpan = Math.max(0.05, W - STRIKE_SEC);
      begin(id);
    } else if (!key && telKey) {
      telKey = null;
      // the warning resolved: the strike lands now (the fling, the landing)
      if (ab) {
        const at = ab.id === 'toss' ? HART_ABILITIES.toss.startOf('fling') : HART_ABILITIES.leap.startOf('hold');
        if (ab.t < at) ab.t = at;
      }
    }
    if (!ab) return restChannels(C);
    const tl = HART_ABILITIES[ab.id];
    let air = null;
    if (ab.id === 'toss' && telKey && ab.t < tl.startOf('fling')) {
      telAge += dt;
      const windEnd = tl.startOf('fling');
      ab.t = telAge < teleSpan ? Math.min(windEnd - 1e-4, (telAge / teleSpan) * windEnd) : windEnd;
    } else if (ab.id === 'leap' && telKey && tel) {
      // the sim's warning progress, interpolated
      const W = Math.max(1, tel.resolveTick - tel.startTick);
      const prog = Math.max(0, Math.min(1, (tick - tel.startTick) / W));
      const landAt = tl.startOf('land');
      if (prog < 0.45) ab.t = (prog / 0.45) * GATHER;
      else if (prog < 0.95 && e.flight) ab.t = GATHER + ((prog - 0.45) / 0.5) * BOUND;
      else ab.t = Math.max(ab.t, landAt + Math.min(STRIKE_SEC - 1e-4, ((prog - 0.95) * W) / 60));
      if (e.flight && prog >= 0.45 && prog < 0.95) air = Math.min(1, hartLift(e, tick) / LEAP_H);
    } else ab.t += dt;
    abilityChannels(ab.id, tl.sample(ab.t), C, from);
    if (air !== null) C.air = air;
    if (ab.t >= tl.duration) ab = null;
    return C;
  }
  // a held contact: the fling and the landing are taken on planted hooves
  function holding() {
    if (!ab) return false;
    const ph = HART_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'fling' || ph === 'hold' || ph === 'land';
  }

  // Lay the body, the legs and the glow for this frame.
  function apply(dt, { locked, airborne = false, hold = false, rage = 0 }) {
    gait.localVelocity(yaw, lv);
    const sp = Math.min(2, Math.hypot(lv.x, lv.z) / HART_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 && C.air < 0.02 ? Math.min(0.08, (lv.z / HART_WALK) * 0.04) : 0) - leanF) * k;
    leanS += ((sp > 0.05 && C.air < 0.02 ? (-lv.x / HART_WALK) * 0.03 : 0) - leanS) * k;
    const bobY = 0.05 * gait.bob * Math.min(1, sp);
    const breathe = 0.012 * Math.sin(idle * 1.4);
    pivot.position.set(0, HIP_Y + breathe + bobY - 0.3 * C.crouch + LEAP_H * C.air, PIVOT_Z + C.reach - 0.1 * C.shove);
    pivot.rotation.set(C.pitch + leanF + 0.02 * Math.sin(idle * 1.4), 0, leanS + (rage ? 0.02 * Math.sin(idle * 17) : 0));
    // the contact squash kept to a champion's size: +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    neck.rotation.x = C.neck + 0.04 * Math.sin(idle * 0.9);
    head.rotation.set(C.head, 0.12 * Math.sin(idle * 0.6) * (1 - C.fever), 0);
    antlers.rotation.x = C.rack;
    tail.rotation.x = 0.12 * Math.sin(idle * 3.1) + 0.5 * C.air;
    for (let s = 0; s < 2; s++) ears[s].rotation.x = -0.3 + 0.6 * Math.max(0, Math.sin(idle * 1.1 + s * 2.3) - 0.85) - 0.4 * C.fever;
    pivot.updateMatrix();

    // the lichen buds pulse and swell with the toss
    for (let i = 0; i < BUDS; i++) {
      if (i < TINES.length * 2) tineEnd(i, _a);
      else {
        const side = i === BUDS - 2 ? -1 : 1;
        const [bx, by, bz] = BEAM[4];
        _a.set(side * bx, by, bz);
      }
      const sc = 1 + 0.2 * Math.sin(idle * 3 + i) + 0.3 * C.glow;
      lay(_m, _a.x, _a.y, _a.z, 0, 1, 0, sc, sc, sc);
      buds.setMatrixAt(i, _m);
    }
    buds.instanceMatrix.needsUpdate = true;
    const glow = 0.5 + 0.5 * Math.sin(idle * 2.4);
    rackGlow.material.opacity = 0.06 + 0.04 * glow + 0.16 * C.glow * (1 - 0.5 * C.air);
    tellGlow.material.opacity = Math.min(0.85, 0.28 + 0.35 * C.fever + (rage ? 0.22 + 0.12 * Math.sin(idle * 9) : 0));
    shadow.scale.setScalar(1 - 0.35 * C.air);
    shadow.material.opacity = 0.8 * (1 - 0.45 * C.air);

    // the hooves (every sim flight tick is airborne, so the hooves touch
    // down together on the landing's stance)
    legRig.update(dt, { space: yaw, stance, locked, air: Math.max(C.air, airborne ? 0.05 : 0), tuck: C.tuck > 0 ? tuck : null, hold });
    let n = 0;
    for (const L of legs) {
      const S = legRig.state[L.i];
      L.foot.rotation.set((L.front ? 0.8 : -0.6) * S.up, 0, 0);
      hoofPts[L.i].position.copy(L.foot.position);
      _a.subVectors(S.knee, S.hip).normalize();
      _c.subVectors(S.end, S.knee).normalize();
      const kneeOut = L.front ? 1 : -1;
      lay(_m, S.knee.x, S.knee.y, S.knee.z, _a.x - _c.x * 0.6, _a.y - _c.y * 0.6, _a.z - _c.z * 0.6 + 0.3 * kneeOut, 0.14, 0.2, 0.55);
      knees.setMatrixAt(L.i, _m);
      for (const side of [-1, 1]) {
        lay(_m, S.end.x + side * 0.04, S.end.y + 0.06, S.end.z - 0.03, side * 0.25 - _c.x * 0.2, -0.8, -0.6, 0.12, 0.18, 0.5);
        fetlocks.setMatrixAt(n++, _m);
      }
    }
    knees.instanceMatrix.needsUpdate = true;
    fetlocks.instanceMatrix.needsUpdate = true;
  }

  return {
    group,
    mats,
    points,
    react,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    // pose: { t, tick (the interpolated sim tick), e (the sim entity, read
    // only), turntable }. A dying rig is never posed again.
    pose({ t, tick = 0, e = null, turntable = false }) {
      const id = e ? e.id : lastId;
      const born = lastT === null || t < lastT || (e && id !== lastId);
      // a new champion spawns in; a jump in place (not the leap: its flight
      // is a glide) only re-plants the hooves
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
      if (e || turntable) drive(dt, e, tick);
      const g = turntable ? 1 : spawn.scale(t);
      grow.scale.setScalar(g);
      apply(dt, { locked: !turntable && g === 1 && !!e, airborne: !!(e && e.flight), hold: holding(), rage: e && e.rage ? 1 : 0 });
    },
    // The model lab: pose an ability at any time (play, scrub, rewind) while
    // the lab walks the rig along its path. The channels are pure in abT.
    lab: {
      abilities: HART_ABILITIES,
      reset() {
        reset();
        replantPending = true;
      },
      feet: () => gait.report(yaw),
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      gait,
      legs: legRig, // probes: where each leg's IK reached
      parts: { pivot, head, neck, antlers, legs },
      pose({ dt, ability = null, abT = 0, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, HART_ABILITIES[ability].sample(abT), C);
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
