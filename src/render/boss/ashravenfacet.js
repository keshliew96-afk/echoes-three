// THE ASH RAVEN, MODEL STANDARD (docs/MODEL_STANDARD.md). The Ashen Barrow's
// third boss rebuilt in the faceted look of Kesh's sample video, on top of
// the chibi ink style, keeping the classic's identity (render/boss/third.js
// buildAshRaven): a huge near-black raven, ash-grey tips on its long
// feathers, a cracked bone mask with violet coals in the eye holes, a violet
// glow in its throat when it calls. What the standard adds:
//
//   * a mantle of feather plates in a brick pattern over the back, a ragged
//     ruff of hackles round the throat, breast plumes, a fan of tail quills
//     with ash tips, nape feathers behind the mask; wings that truly fold and
//     spread (fold, lift and roll as three nested turns) with a faceted blade,
//     eight secondaries, six primaries (the outer three ash) and a covert
//     row; a boxed skull under a faceted bone mask, a two-part beak (the lower
//     half gapes), the violet crack, coals set deep in dark sockets;
//   * two legs on LOCKED FEET (render/facet/legs.js): feathered thighs, dark
//     shanks and four bone talons, both feet in ONE gait group, so the Raven
//     HOPS the way a raven does: both feet leave together and land together,
//     a planted talon never slides;
//   * the abilities as timelines driven by the sim (sim/bosses/ashraven.js):
//       Carrion Dive  rise (the lane warning less its 14-tick dive less one
//                     strike: it beats up into the air and hangs there, the
//                     legs trailed), stoop (2.5 frames as the sim's dive
//                     begins: it tips over, the wings sweep back), dive (held
//                     while the sim drives it down the lane: a flat skim),
//                     strike (2.5 frames on the resolve: the talons out, the
//                     wings flung up to brake, the landing squash), held with
//                     a recoil, preen (held through the sim's 40 ticks: the
//                     head turned into a wing), settle with one overshoot;
//       Wing Gust     mantle (the 40-tick cone warning less one strike: the
//                     wings drawn back and up, the head low, the hackles up,
//                     crouched), beat (2.5 frames on the resolve: the wings
//                     thrown wide and forward, the body rocked back), held
//                     with a recoil, settle;
//       Omen          call (the 84-tick ring warning less one strike: the
//                     wings mantled wide and high, the head up, the beak
//                     open, the throat burning), caw (2.5 frames on the
//                     resolve: the head thrown up, the beak snapped wide),
//                     held with a recoil, settle;
//       Enraged       the coals and the throat burn, the hackles stay up;
//   * the [M] beats (render/facet/beats.js): a spawn-in grow, named points
//     (the beak's root as `mouth`, its point as `tip`, the chest, each wing's
//     tip, each foot), the shared hit envelope (`react`).
//
// Same interface as the classic (group, mats, setYaw, setFlash, pose), plus
// `lab`, `points`, `react`. Faces +Z. Render only: it reads the sim entity
// (mode, telegraph, enraged) and never writes it.
import { BoxGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { HIDE } from '../enemies/style.js';
import { facetize, facetMaterial } from '../facet/material.js';
import { PART_INK_PX, createPlateTube, createSpine, instancedPart, placeRow, wedgeGeometry } from '../facet/kit.js';
import { createTimeline, ease } from '../facet/timeline.js';
import { lay, limbBox, taperBox } from '../facet/shapes.js';
import { createLegs } from '../facet/legs.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../facet/beats.js';

// --- Colour: the classic raven's (third.js), no new hues, and value steps
// of them so the plates read as plates.
const RAVEN = HIDE.crowBody.clone().multiplyScalar(1.15);
const RAVEN_WING = HIDE.crowWing.clone();
const RAVEN_ASH = new Color(PALETTE.warmGrey).lerp(new Color(PALETTE.signalBlue), 0.12).multiplyScalar(0.62);
const MASK = new Color(PALETTE.bone).multiplyScalar(0.9);
const MANTLE = RAVEN.clone().multiplyScalar(1.22);
const QUILL = RAVEN_WING.clone().multiplyScalar(0.88);
const TALON = HIDE.bone.clone();
const VIOLET = new Color(PALETTE.godstuffViolet);
const VIOLET_PEAK = new Color(PALETTE.godstuffVioletPeak);
const flashable = (c) => facetMaterial(c, { emissive: '#FFFFFF', emissiveIntensity: 0 });

function glow(color, size, opacity) {
  const g = makeGlowSprite({ color: '#FFFFFF', size, opacity });
  g.material.toneMapped = false;
  g.material.color.set(color);
  return g;
}

// --- Body plan (yaw space, faces +Z); the body pivots between the hips.
const HIP_Y = 0.95;
// [hip x, home x, home z]; both feet in gait group 0: a hop
const LEGS = [
  [-0.3, -0.3, 0.02],
  [0.3, 0.3, 0.02],
];
const UPPER = 0.52;
const LOWER = 0.58;
const FOOT_H = 0.04;
export const RAVEN_WALK = 1.35; // u/s, ASHRAVEN.moveSpeed
export const DIVE_TICKS = 14; // ASHRAVEN.dive.diveTicks
const RISE_SEC = (50 - DIVE_TICKS) / 60 - STRIKE_SEC; // the dive lane's warning before the dive
const DIVE_SEC = DIVE_TICKS / 60; // the sim's dive (the lab's travel)
const PREEN_SEC = 0.8; // the lab's preen (the sim's 40 ticks)
const MANTLE_SEC = 40 / 60 - STRIKE_SEC; // the gust cone's warning
const CALL_SEC = 84 / 60 - STRIKE_SEC; // the omen ring's warning
export const HOVER_H = 1.5; // u, the hang before the dive
export const SKIM_H = 0.45; // u, the dive's skim

export const RAVEN_ABILITIES = Object.freeze({
  dive: createTimeline('dive', 'Carrion Dive', [
    { id: 'rise', label: 'rise', dur: RISE_SEC },
    { id: 'stoop', label: 'stoop', dur: STRIKE_SEC },
    { id: 'dive', label: 'dive', dur: DIVE_SEC },
    { id: 'strike', label: 'strike', dur: STRIKE_SEC },
    { id: 'hold', label: 'landed', dur: HOLD_SEC },
    { id: 'preen', label: 'preen', dur: PREEN_SEC },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: 0.02, id: 'rise' }, { at: RISE_SEC + STRIKE_SEC + DIVE_SEC, id: 'dive' }] }),
  gust: createTimeline('gust', 'Wing Gust', [
    { id: 'mantle', label: 'mantle', dur: MANTLE_SEC },
    { id: 'beat', label: 'beat', dur: STRIKE_SEC },
    { id: 'hold', label: 'wings forward', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.55 },
  ], { cues: [{ at: MANTLE_SEC, id: 'gust' }] }),
  omen: createTimeline('omen', 'Omen', [
    { id: 'call', label: 'call', dur: CALL_SEC },
    { id: 'caw', label: 'caw', dur: STRIKE_SEC },
    { id: 'hold', label: 'the crows come', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: CALL_SEC, id: 'omen' }] }),
  rage: createTimeline('rage', 'Enraged', [
    { id: 'rise', label: 'kindle', dur: 0.4 },
    { id: 'enraged', label: 'enraged', dur: 1.6 },
  ]),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (0 at rest):
//   alt    u off the floor (air = alt > 0)   pitch  body pitch, + nose down
//   dip    u the body drops              reach  u the body moves forward
//   open   0..1 the wings spread         flap   -1..1 the stroke (+ up)
//   sweep  0..1 the wings swept back     fore   0..1 the wings thrown forward
//   neck   neck pitch, + down            head   head pitch, + down
//   gape   0..1 the beak opens           hackle 0..1 the ruff stands up
//   tail   0..1 the tail fans            tuck   0..1 the legs trailed back
//   preen  0..1 the head into a wing     crouch 0..1 the legs bent
//   squash 0..1 contact squash           shove  0..1 the recoil (B3)
//   fever  0..1 the coals flare          rage   0..1 enraged
const KEYS = ['alt', 'pitch', 'dip', 'reach', 'open', 'flap', 'sweep', 'fore', 'neck', 'head', 'gape', 'hackle', 'tail', 'tuck', 'preen', 'crouch', 'squash', 'shove', 'fever', 'rage'];
const restChannels = (C) => {
  for (const k of KEYS) C[k] = 0;
  return C;
};
const ZERO = restChannels({});
const pose = (o) => ({ ...ZERO, ...o });
const RISEN = pose({ alt: HOVER_H, pitch: 0.15, open: 1, flap: 0.6, neck: 0.2, tail: 0.5, tuck: 1, fever: 0.6 });
const STOOPED = pose({ alt: HOVER_H * 0.8, pitch: 0.75, open: 0.8, flap: 0.1, sweep: 0.7, neck: 0.3, tail: 0.3, tuck: 1, fever: 1 });
const DIVING = pose({ alt: SKIM_H, pitch: 0.95, open: 0.65, flap: -0.1, sweep: 1, neck: 0.35, head: 0.1, tail: 0.3, tuck: 1, fever: 1 });
const LANDED = pose({ dip: 0.22, pitch: 0.1, reach: 0.1, open: 1, flap: 0.9, neck: 0.3, head: 0.1, tail: 0.6, crouch: 1, squash: 1, fever: 0.4 });
const PREENING = pose({ dip: 0.06, pitch: 0.3, open: 0.1, neck: 0.25, preen: 1, crouch: 0.3 });
const MANTLED = pose({ dip: 0.1, pitch: -0.1, open: 0.9, flap: 0.9, sweep: 0.4, neck: 0.45, head: 0.2, hackle: 1, crouch: 0.8, fever: 0.6 });
const BEATEN = pose({ dip: 0.04, pitch: -0.25, reach: -0.08, open: 1, flap: -0.35, fore: 1, neck: 0.5, gape: 0.8, hackle: 0.6, tail: 0.5, crouch: 0.2, squash: 1, fever: 0.8 });
const CALLING = pose({ pitch: -0.3, open: 0.85, flap: 1, neck: -0.7, head: -0.3, gape: 0.6, hackle: 1, tail: 0.7, fever: 1 });
const CAWED = pose({ pitch: -0.4, dip: -0.06, open: 1, flap: 1.1, neck: -1.0, head: -0.5, gape: 1, hackle: 1, tail: 0.9, squash: 1, fever: 1 });
const mix = (C, A, B, k) => {
  for (const key of KEYS) C[key] = A[key] + (B[key] - A[key]) * k;
  return C;
};

// `from` is the pose an ability starts out of (rest in the lab; in a fight
// whatever the bird was doing): every wind-up grows out of it (B1/B5).
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'dive') {
    if (s.id === 'rise') {
      mix(C, from, RISEN, ease.inOut(Math.min(1, k * 1.6)));
      // the wings beat while it hangs
      C.flap = RISEN.flap * Math.sin(k * Math.PI * 7) * Math.min(1, k * 2);
    } else if (s.id === 'stoop') mix(C, RISEN, STOOPED, kick(k));
    else if (s.id === 'dive') mix(C, STOOPED, DIVING, ease.out(Math.min(1, k * 3)));
    else if (s.id === 'strike') mix(C, DIVING, LANDED, kick(k));
    else if (s.id === 'hold') {
      mix(C, LANDED, LANDED, 0);
      C.shove = recoil(k * HOLD_SEC); // B3: the landing shoves it back
    } else if (s.id === 'preen') {
      mix(C, LANDED, PREENING, ease.inOut(Math.min(1, k * 2.5)));
      C.squash = (1 - ease.out(Math.min(1, k * 3))) * LANDED.squash;
      C.shove = recoil(HOLD_SEC + k * PREEN_SEC);
    } else mix(C, ZERO, PREENING, settle(k)); // B5: home with one overshoot
  } else if (id === 'gust') {
    if (s.id === 'mantle') mix(C, from, MANTLED, ease.inOut(Math.min(1, k * 1.4)));
    else if (s.id === 'beat') mix(C, MANTLED, BEATEN, kick(k));
    else if (s.id === 'hold') {
      mix(C, BEATEN, BEATEN, 0);
      C.shove = recoil(k * HOLD_SEC);
    } else {
      mix(C, ZERO, BEATEN, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.55);
    }
  } else if (id === 'omen') {
    if (s.id === 'call') {
      mix(C, from, CALLING, ease.inOut(Math.min(1, k * 1.3)));
      // a slow mantling beat through the call
      C.flap = CALLING.flap * (0.7 + 0.3 * Math.sin(k * Math.PI * 4)) * Math.min(1, k * 2);
    } else if (s.id === 'caw') mix(C, CALLING, CAWED, kick(k));
    else if (s.id === 'hold') {
      mix(C, CAWED, CAWED, 0);
      C.shove = recoil(k * HOLD_SEC);
    } else {
      mix(C, ZERO, CAWED, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.6);
    }
  } else if (id === 'rage') {
    C.rage = s.id === 'rise' ? ease.out(k) : 1;
    C.fever = C.rage;
    C.hackle = 0.6 * C.rage;
  }
  return C;
}

// --- Geometry.
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:ashraven-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  breast: () => geo('breast', () => new IcosahedronGeometry(0.62, 1), 501),
  back: () => geo('back', () => new IcosahedronGeometry(0.5, 1), 503),
  neck: () => geo('neck', () => new CylinderGeometry(0.17, 0.24, 0.42, 6).translate(0, 0.21, 0), 505),
  skull: () => geo('skull', () => new IcosahedronGeometry(0.33, 1), 507),
  mask: () => geo('mask', () => taperBox(0.4, 0.34, 0.3, 0.72, 0.68, 0.02), 509, 0.07),
  beak: () => geo('beak', () => taperBox(0.17, 0.13, 0.8, 0.1, 0.25, 0.03).translate(0, 0, 0.4), 511, 0.06),
  jaw: () => geo('jaw', () => taperBox(0.14, 0.06, 0.62, 0.1, 0.4, -0.01).translate(0, 0, 0.31), 513, 0.06),
  // a wing blade out along +X (the left wing's geometry is mirrored)
  wingR: () => geo('wing-r', () => taperBox(0.46, 0.05, 1.05, 0.62, 0.7, 0.02).translate(0, 0, 0.52).rotateY(Math.PI / 2), 515),
  wingL: () => geo('wing-l', () => taperBox(0.46, 0.05, 1.05, 0.62, 0.7, 0.02).translate(0, 0, 0.52).rotateY(-Math.PI / 2), 517),
  thigh: () => geo('thigh', () => limbBox(0.2, 0.2, UPPER, 0.55, 0.55), 519),
  shank: () => geo('shank', () => limbBox(0.07, 0.07, LOWER, 0.8, 0.8), 521),
  knot: () => geo('knot', () => new IcosahedronGeometry(0.06, 0), 523),
  socket: () => sharedGeo('ashraven-socket', () => new BoxGeometry(0.12, 0.1, 0.06)),
  coal: () => sharedGeo('ashraven-coal', () => new IcosahedronGeometry(0.045, 0)),
  crack: () => sharedGeo('ashraven-crack', () => new BoxGeometry(0.02, 0.3, 0.02)),
};

const _m = new Matrix4();
const _a = new Vector3();
// a bird's leg folds back at its knee
const POLE = new Vector3(0, 0.05, -1);

export function buildAshRavenFacet() {
  const group = new Group();
  group.name = 'boss-ashraven';
  group.userData.modelStandard = true;
  const yaw = new Group();
  group.add(yaw);
  const grow = new Group();
  yaw.add(grow);
  const pivot = new Group();
  pivot.position.set(0, HIP_Y, 0);
  grow.add(pivot);
  const body = new Group();
  body.position.set(0, -HIP_Y, 0);
  pivot.add(body);
  const squashG = new Group();
  squashG.position.set(0, 1.5, 0);
  body.add(squashG);
  const torso = new Group();
  torso.position.set(0, -1.5, 0);
  squashG.add(torso);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const plume = track(flashable(RAVEN));
  const wingMat = track(flashable(RAVEN_WING));
  const ash = track(flashable(RAVEN_ASH));
  const bone = track(flashable(MASK));
  const mantleMat = track(flashable(MANTLE));
  const quill = track(flashable(QUILL));
  const talon = track(flashable(TALON));
  const coalMat = new MeshBasicMaterial({ color: VIOLET_PEAK.clone(), toneMapped: false });
  const crackMat = new MeshBasicMaterial({ color: VIOLET.clone(), toneMapped: false });
  const hollow = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal), toneMapped: false });
  const shankMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal).multiplyScalar(1.3), toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- Body: a heavy breast and a tapering back under a mantle of plates.
  const breast = mesh(G.breast(), plume, torso);
  breast.scale.set(1.0, 1.08, 1.0);
  breast.position.set(0, 1.45, 0.2);
  const back = mesh(G.back(), plume, torso);
  back.scale.set(0.92, 0.72, 1.42);
  back.position.set(0, 1.42, -0.5);
  const spine = createSpine(5);
  [[0, 1.9, 0.3], [0, 1.9, -0.05], [0, 1.8, -0.4], [0, 1.66, -0.75], [0, 1.5, -1.05]].forEach(([x, y, z], i) => spine.pts[i].set(x, y, z));
  const mantle = createPlateTube({ spine, rings: 7, around: 7, arc: Math.PI * 1.05, u0: 0.03, u1: 0.98, radius: (u) => 0.44 - 0.2 * u, plateMat: mantleMat, tilt: 0.5, thick: 0.04, name: 'ashraven-mantle' });
  mantle.update();
  mantle.plates.position.set(0, -0.1, 0);
  torso.add(mantle.plates);
  // the ruff: ragged hackles round the throat, every third one ash
  const hackles = new Group();
  hackles.position.set(0, 1.72, 0.5);
  torso.add(hackles);
  const HACK = 9;
  const hackleRow = (mat, pick) => placeRow(wedge, mat, pick.length, (i, m) => {
    const j = pick[i];
    const a = (j / (HACK - 1) - 0.5) * 2.3;
    lay(m, Math.sin(a) * 0.44, -0.08 * Math.abs(a), Math.cos(a) * 0.14, Math.sin(a) * 0.6, 0.55, 0.75, 0.14, 0.4 + 0.06 * (j % 2), 0.4, a * 0.4);
  }, { name: `ashraven-hackles${mat === ash ? '-ash' : ''}`, inkPx: PART_INK_PX, mottle: 0.14, seed: 91 });
  hackles.add(hackleRow(plume, [0, 1, 3, 4, 6, 7]), hackleRow(ash, [2, 5, 8]));
  // breast plumes hanging under the ruff
  torso.add(placeRow(wedge, mantleMat, 6, (i, m) => {
    const x = (i - 2.5) * 0.1;
    lay(m, x, 1.5, 0.74 - Math.abs(i - 2.5) * 0.04, x * 0.5, -1, 0.3, 0.14, 0.36 + 0.06 * (i % 2), 0.4);
  }, { name: 'ashraven-plumes', inkPx: PART_INK_PX, mottle: 0.16, seed: 93 }));
  // the tail: a fan of quills, the outer two ash
  const tail = new Group();
  tail.position.set(0, 1.4, -1.05);
  torso.add(tail);
  const tailRow = (mat, pick, name) => placeRow(wedge, mat, pick.length, (i, m) => {
    const j = pick[i];
    const a = (j - 3) * 0.17;
    lay(m, Math.sin(a) * 0.1, -0.01 * Math.abs(j - 3), 0, Math.sin(a) * 0.6, -0.3, -1, 0.17, 1.0 - Math.abs(j - 3) * 0.09, 0.4, a);
  }, { name, inkPx: PART_INK_PX, mottle: 0.12, seed: 95 });
  const tailFan = new Group();
  tail.add(tailFan);
  tailFan.add(tailRow(quill, [1, 2, 3, 4, 5], 'ashraven-tail'), tailRow(ash, [0, 6], 'ashraven-tail-ash'));

  // --- Wings: three nested turns a side (fold back along the flank, lift
  // for the stroke, roll about the wing's own length), a faceted blade with
  // its feathers riding it.
  const wings = [];
  const wingTips = [];
  for (const side of [-1, 1]) {
    const fold = new Group();
    fold.position.set(side * 0.46, 1.68, 0.1);
    torso.add(fold);
    const lift = new Group();
    fold.add(lift);
    const roll = new Group();
    lift.add(roll);
    const blade = mesh(side > 0 ? G.wingR() : G.wingL(), wingMat, roll);
    blade.position.set(0, 0, -0.04);
    // secondaries all along the trailing edge, primaries fanned at the tip
    // (the outer three ash), coverts over the leading edge
    roll.add(placeRow(wedge, quill, 8, (i, m) => {
      const x = side * (0.12 + i * 0.12);
      lay(m, x, -0.02, -0.2, side * 0.08, -0.03, -1, 0.2, 0.34 + 0.02 * i, 0.3);
    }, { name: 'ashraven-secondaries', inkPx: PART_INK_PX, mottle: 0.14, seed: 97 + side }));
    roll.add(placeRow(wedge, quill, 3, (i, m) => {
      const x = side * (1.0 + i * 0.03);
      lay(m, x, -0.03 + 0.01 * i, -0.08 - 0.06 * i, side * (0.5 + 0.15 * i), -0.05, -0.85 + 0.1 * i, 0.18, 0.6 + 0.05 * i, 0.3);
    }, { name: 'ashraven-primaries', inkPx: PART_INK_PX, mottle: 0.12, seed: 99 + side }));
    roll.add(placeRow(wedge, ash, 3, (i, m) => {
      const x = side * (1.04 + i * 0.03);
      lay(m, x, 0.0 + 0.01 * i, 0.08 - 0.06 * i, side * (0.85 + 0.05 * i), -0.02, -0.5 + 0.2 * i, 0.17, 0.72 + 0.06 * i, 0.3);
    }, { name: 'ashraven-primaries-ash', inkPx: PART_INK_PX, mottle: 0.1, seed: 101 + side }));
    roll.add(placeRow(wedge, wingMat, 6, (i, m) => {
      const x = side * (0.1 + i * 0.16);
      lay(m, x, 0.035, 0.12, side * 0.05, 0.02, -1, 0.2, 0.3, 0.3);
    }, { name: 'ashraven-coverts', inkPx: PART_INK_PX, mottle: 0.12, seed: 103 + side }));
    const tip = new Group();
    tip.position.set(side * 1.1, 0, -0.05);
    roll.add(tip);
    wingTips.push(tip);
    wings.push({ fold, lift, roll, side });
  }

  // --- Neck and head: the skull under the bone mask, the beak, the coals.
  const neck = new Group();
  neck.position.set(0, 1.86, 0.5);
  torso.add(neck);
  const neckMesh = mesh(G.neck(), plume, neck);
  neckMesh.rotation.x = 0.5;
  const head = new Group();
  head.position.set(0, 0.34, 0.2);
  neck.add(head);
  const skull = mesh(G.skull(), plume, head);
  skull.scale.set(0.95, 0.9, 1.1);
  const mask = mesh(G.mask(), bone, head);
  mask.position.set(0, 0.03, 0.22);
  const beak = mesh(G.beak(), bone, head);
  beak.position.set(0, -0.03, 0.28);
  const jaw = new Group();
  jaw.position.set(0, -0.1, 0.28);
  head.add(jaw);
  mesh(G.jaw(), bone, jaw).position.set(0, -0.01, 0);
  const crack = new Mesh(G.crack(), crackMat);
  crack.position.set(0.07, 0.1, 0.38);
  crack.rotation.z = 0.5;
  head.add(crack);
  const crack2 = new Mesh(G.crack(), crackMat);
  crack2.scale.set(0.8, 0.5, 0.8);
  crack2.position.set(-0.1, 0.02, 0.38);
  crack2.rotation.z = -0.9;
  head.add(crack2);
  // nape feathers behind the mask
  head.add(placeRow(wedge, plume, 5, (i, m) => {
    const a = (i - 2) * 0.28;
    lay(m, Math.sin(a) * 0.2, 0.18 - 0.03 * Math.abs(i - 2), -0.1, Math.sin(a) * 0.5, 0.45, -1, 0.1, 0.3 + 0.05 * (i % 2), 0.4, a * 0.5);
  }, { name: 'ashraven-nape', inkPx: PART_INK_PX, mottle: 0.12, seed: 105 }));
  const coals = [];
  for (const side of [-1, 1]) {
    const sock = new Mesh(G.socket(), hollow);
    sock.position.set(side * 0.15, 0.1, 0.35);
    head.add(sock);
    const coal = new Mesh(G.coal(), coalMat);
    coal.position.set(side * 0.15, 0.1, 0.39);
    head.add(coal);
    coals.push(coal);
  }
  const eyeGlow = glow(PALETTE.godstuffViolet, 0.6, 0.25);
  eyeGlow.position.set(0, 0.12, 0.5);
  head.add(eyeGlow);
  const throatGlow = glow(PALETTE.godstuffViolet, 1.3, 0);
  throatGlow.position.set(0, -0.1, 0.8);
  head.add(throatGlow);
  const chestGlow = glow(PALETTE.godstuffViolet, 1.6, 0.08);
  chestGlow.position.set(0, 1.45, 0.75);
  torso.add(chestGlow);

  // --- Legs on locked feet: feathered thighs, dark shanks, four talons.
  const legs = LEGS.map(([hx, fx, fz], i) => {
    const upper = new Group();
    mesh(G.thigh(), plume, upper);
    const lower = new Group();
    mesh(G.shank(), shankMat, lower);
    const foot = new Group();
    foot.add(placeRow(wedge, talon, 4, (j, m) => {
      const back = j === 3;
      const a = back ? Math.PI : (j - 1) * 0.5;
      lay(m, 0, 0.015, 0, Math.sin(a), -0.08, Math.cos(a), 0.07, back ? 0.18 : 0.3, 0.3, Math.PI / 2);
    }, { name: 'ashraven-talons', inkPx: PART_INK_PX, mottle: 0 }));
    grow.add(upper, lower, foot);
    return { i, hipLocal: new Vector3(hx, HIP_Y, 0), home: [fx, fz], group: 0, upper, lower, foot, a: UPPER, b: LOWER, pole: POLE, footH: FOOT_H, hip: null };
  });
  const knots = instancedPart(G.knot(), plume, legs.length, { name: 'ashraven-knees', moving: true });
  grow.add(knots);

  // --- Floor pieces (beside the envelope's node): the shadow.
  const shadow = groundShadow(1.25, 0.42, { deep: 1.4, wide: 1.2 });
  group.add(shadow);

  // --- Points (B8) and the hit envelope's tuning.
  const points = makePoints({
    mouth: [head, 0, -0.04, 0.3],
    tip: [head, 0, -0.04, 1.08],
    chest: [torso, 0, 1.5, 0.6],
    wingL: [wingTips[0], 0, 0, 0],
    wingR: [wingTips[1], 0, 0, 0],
  });
  const FOOT_NAMES = ['footL', 'footR'];
  const footPts = legs.map((L) => {
    const p = makePoints({ [FOOT_NAMES[L.i]]: [grow, 0, 0, 0] })[FOOT_NAMES[L.i]];
    points[FOOT_NAMES[L.i]] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 0, axis: 'y', midY: 1.45 };

  // --- Locked feet (a hop: both feet in one group).
  body.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(body.matrix).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.3, lift: 0.2, minDur: 0.14, maxDur: 0.3, durPerSpeed: 0.05, lead: 0.6, flight: 5 } });
  const { gait } = legRig;
  const C = restChannels({});
  // the landing's brace: the feet a little apart and ahead
  const stance = (i, out) => {
    out.z += 0.1 * C.crouch;
    out.x += (i === 0 ? -0.06 : 0.06) * C.crouch;
    return out;
  };
  // in the air the legs trail back under the tail
  const tuck = (i, out) => {
    hipOf(legs[i], out);
    out.y -= 0.3;
    out.z -= 0.7 * C.tuck;
    out.x *= 0.8;
    return out;
  };

  // --- Live state.
  const spawn = createSpawnClock();
  let lastT = null;
  let lastX = 0;
  let lastZ = 0;
  let lastId = null;
  let idle = 0;
  let ab = null;
  let from = { ...ZERO };
  let tel = null;
  let telKey = null;
  let telAge = 0;
  let lastMode = 'stalk';
  let rage = 0;
  let replantPending = false;
  let simYaw = 0;
  let shownYaw = null;
  let laneYaw = null;
  const lv = new Vector3();
  let leanF = 0;

  function reset() {
    lastT = null;
    ab = null;
    tel = null;
    telKey = null;
    lastMode = 'stalk';
    rage = 0;
    laneYaw = null;
    shownYaw = null;
    spawn.clear();
  }
  const begin = (id, t = 0) => {
    from = { ...C, squash: 0, shove: 0, rage: 0 };
    ab = { id, t };
  };

  // In game: each warning is its wind-up, stretched to the sim's ticks so
  // the strike lands on the resolve; the dive's rise ends when the sim's
  // dive begins, the dive holds while the sim drives it, the strike lands on
  // the resolve and the preen holds through the sim's preen.
  function drive(dt, e) {
    const T = e && e.telegraph ? e.telegraph : null;
    const mode = e ? e.mode || 'stalk' : 'stalk';
    const key = T ? `${T.attack}:${T.startTick}` : null;
    if (key && key !== telKey) {
      telAge = 0;
      const id = T.attack === 'dive' ? 'dive' : T.attack === 'gust' ? 'gust' : T.attack === 'omen' ? 'omen' : null;
      if (id) begin(id);
    }
    telKey = key;
    tel = T;
    if (tel) telAge += dt;
    if (T && T.attack === 'dive' && Number.isFinite(T.dirX)) laneYaw = Math.atan2(T.dirX, T.dirZ);
    else laneYaw = null;
    const DV = RAVEN_ABILITIES.dive;
    if (mode !== lastMode) {
      if (mode === 'dive') {
        if (!ab || ab.id !== 'dive') begin('dive', DV.startOf('dive'));
        else ab.t = Math.max(ab.t, DV.startOf('stoop'));
      } else if (mode === 'preen') {
        if (!ab || ab.id !== 'dive') begin('dive', DV.startOf('strike'));
        else ab.t = Math.max(ab.t, DV.startOf('strike'));
      } else if (lastMode === 'preen' && ab && ab.id === 'dive') ab.t = Math.max(ab.t, DV.startOf('settle'));
    }
    lastMode = mode;
    if (ab) {
      const tl = RAVEN_ABILITIES[ab.id];
      if (ab.id === 'dive') {
        const riseEnd = DV.startOf('stoop');
        if (tel && mode !== 'dive' && ab.t < riseEnd) {
          const span = Math.max(0.05, (tel.resolveTick - tel.startTick - DIVE_TICKS) / 60 - STRIKE_SEC);
          ab.t = telAge < span ? Math.min(riseEnd - 1e-4, (riseEnd * telAge) / span) : riseEnd;
        } else {
          ab.t = Math.max(ab.t, riseEnd) + dt;
          // the stoop lands as the sim's dive begins; the dive holds while the
          // sim drives it down the lane, the strike waits on the resolve
          if (tel && mode !== 'dive') ab.t = Math.min(ab.t, riseEnd + STRIKE_SEC);
          if (tel && mode === 'dive') ab.t = Math.min(ab.t, DV.startOf('strike') - 1e-4);
        }
        if (mode === 'preen') ab.t = Math.min(ab.t, DV.startOf('settle') - 1e-4);
      } else if (ab.id === 'gust' || ab.id === 'omen') {
        const windEnd = tl.startOf(tl.phases[1].id);
        if (tel && ab.t < windEnd) {
          const span = Math.max(0.05, (tel.resolveTick - tel.startTick) / 60 - STRIKE_SEC);
          ab.t = telAge < span ? Math.min(windEnd - 1e-4, (windEnd * telAge) / span) : windEnd;
        } else {
          ab.t = Math.max(ab.t, windEnd) + dt;
          // the strike may land ahead of the resolve on a slow frame (a 1 fps
          // machine), but the contact holds until the warning is gone
          if (tel) ab.t = Math.min(ab.t, windEnd + STRIKE_SEC);
        }
      } else ab.t += dt;
      if (ab.t >= tl.duration) ab = null;
    }
    if (ab) abilityChannels(ab.id, RAVEN_ABILITIES[ab.id].sample(ab.t), C, from);
    else restChannels(C);
    // a bird posed afresh mid-air (a guest joining) hangs where the sim has it
    if (!ab && mode === 'rise') C.alt = HOVER_H;
    rage += ((e && e.enraged ? 1 : 0) - rage) * (1 - Math.exp(-3 * dt));
    C.rage = Math.max(C.rage, rage);
    C.hackle = Math.max(C.hackle, 0.6 * rage);
    return C;
  }
  // a held contact: the blow taken on planted feet
  function holding() {
    if (!ab) return false;
    const ph = RAVEN_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'beat' || ph === 'caw' || ph === 'hold' || (ab.id === 'dive' && ph === 'strike');
  }

  function apply(dt, { locked, hpFrac, hold = false, airborne = false }) {
    gait.localVelocity(yaw, lv);
    const sp = Math.min(3, Math.hypot(lv.x, lv.z) / RAVEN_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 && C.alt < 0.02 ? Math.min(0.12, (lv.z / RAVEN_WALK) * 0.08) : 0) - leanF) * k;
    // the hop: the body rises with the feet
    const hopY = 0.14 * gait.bob * Math.min(1, sp);
    const breathe = 0.015 * Math.sin(idle * 1.6);
    const beatBob = 0.08 * C.flap * Math.min(1, C.alt / HOVER_H);
    pivot.position.set(0, HIP_Y + breathe + hopY + C.alt - C.dip - 0.12 * C.crouch + beatBob, C.reach - 0.1 * C.shove);
    pivot.rotation.set(C.pitch + leanF, 0, 0);
    // the contact squash kept to a boss's size (Kesh's pick over B9's full
    // +19% / -9%): +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    neck.rotation.set(C.neck + 0.04 * Math.sin(idle * 1.7) + 0.08 * hopY, 0.9 * C.preen * Math.sin(idle * 2.4) + 0.6 * C.preen, 0);
    head.rotation.set(C.head + 0.3 * C.preen, 0, 0.15 * C.preen);
    jaw.rotation.x = 0.55 * C.gape + 0.05 * Math.max(0, Math.sin(idle * 3.1)) * (1 - C.preen);
    hackles.rotation.x = -0.35 * C.hackle;
    hackles.scale.set(1 + 0.15 * C.hackle, 1 + 0.25 * C.hackle, 1 + 0.15 * C.hackle);
    tail.rotation.x = -0.25 - 0.2 * C.tail + 0.25 * C.pitch + 0.04 * Math.sin(idle * 2.2);
    tailFan.scale.set(1 + 0.45 * C.tail, 1, 1);
    for (const W of wings) {
      const s = W.side;
      const open = C.open;
      // folded: swung back along the flank, standing on edge; open: out to
      // the side, swept back for the dive, thrown forward for the gust
      W.fold.rotation.set(0, s * (1.25 * (1 - open) + 0.55 * C.sweep - 0.5 * C.fore), 0);
      W.lift.rotation.set(0, 0, s * (0.3 * (1 - open) + (0.75 * C.flap - 0.1) * open + 0.25 * C.preen * (1 - open)));
      W.roll.rotation.set(-s * 1.25 * (1 - open) + 0.35 * C.sweep * open - 0.3 * C.fore * open + 0.05 * Math.sin(idle * 1.8) * (1 - open), 0, 0);
    }
    pivot.updateMatrix();

    const air = Math.max(C.alt > 0.02 ? Math.min(1, C.alt / 0.3) : 0, airborne ? 0.05 : 0);
    legRig.update(dt, { space: yaw, stance, locked, air, tuck: C.tuck > 0.01 ? tuck : null, hold });
    for (const L of legs) {
      const S = legRig.state[L.i];
      // the talons curl as a foot lifts and spread flat as it lands
      L.foot.rotation.set(0.5 * S.up, 0, 0);
      L.foot.scale.set(1 + 0.15 * C.crouch, 1, 1 + 0.15 * C.crouch);
      footPts[L.i].position.copy(L.foot.position);
      knots.setMatrixAt(L.i, _m.makeTranslation(S.knee.x, S.knee.y, S.knee.z));
    }
    knots.instanceMatrix.needsUpdate = true;

    const fever = 0.5 + 0.25 * Math.sin(idle * 2.8) + (1 - hpFrac) * 0.3 + 0.3 * C.rage + 0.3 * C.fever;
    for (const c of coals) c.scale.setScalar(0.9 + 0.35 * fever + 0.4 * C.gape);
    coalMat.color.copy(VIOLET).lerp(VIOLET_PEAK, 0.4 + 0.6 * Math.max(C.fever, C.rage * 0.5));
    eyeGlow.material.opacity = Math.min(0.7, 0.2 + 0.25 * C.fever + 0.15 * C.rage);
    throatGlow.material.opacity = Math.min(0.85, 0.8 * C.gape * (0.5 + 0.5 * C.fever) + 0.2 * C.rage);
    chestGlow.material.opacity = Math.min(0.4, 0.06 * fever + 0.25 * C.gape);
    const lift = Math.min(1, C.alt / HOVER_H);
    shadow.scale.set(1 - 0.35 * lift, 1 - 0.35 * lift, 1);
    shadow.material.opacity = 0.42 * (1 - 0.5 * lift);
  }

  return {
    group,
    mats,
    points,
    react,
    setYaw: (r) => {
      simYaw = r;
      yaw.rotation.y = shownYaw === null ? r : shownYaw;
    },
    setFlash(k) {
      const v = k < 0 ? 0 : k > 1 ? 1 : k;
      for (const m of mats) m.emissiveIntensity = v;
    },
    // A dying rig is posed with e = null: it collapses in the pose it died
    // in (no wind-up runs on into a strike).
    pose({ t, hpFrac = 1, e = null, turntable = false }) {
      const id = e ? e.id : lastId;
      // a new boss (or a rewound clock) spawns in; a jump in place (the
      // dive's travel, a hitch) only re-plants the feet
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
      // the facing eases to the lane while it rises over it and dives down it
      const aim = laneYaw === null ? simYaw : laneYaw;
      if (shownYaw === null || turntable) shownYaw = aim;
      else {
        let d = aim - shownYaw;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        shownYaw += d * (1 - Math.exp(-14 * dt));
      }
      yaw.rotation.y = shownYaw;
      const g = turntable ? 1 : spawn.scale(t);
      grow.scale.setScalar(g);
      apply(dt, { locked: !turntable && g === 1 && !!e, hpFrac, hold: holding(), airborne: !!e && (e.mode === 'dive' || e.mode === 'rise') });
    },
    lab: {
      abilities: RAVEN_ABILITIES,
      reset() {
        reset();
        replantPending = true;
      },
      feet: () => gait.report(yaw),
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      gait,
      legs: legRig,
      pose({ dt, ability = null, abT = 0, hpFrac = 1, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, RAVEN_ABILITIES[ability].sample(abT), C);
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
