// THE GLOAM WOLF, MODEL STANDARD (docs/MODEL_STANDARD.md). The Level I
// hunter rebuilt in the faceted look of Kesh's sample video, on top of the
// chibi ink style, keeping the classic's identity (render/boss/third.js): a
// huge grey night wolf, deep chest and narrow loins, a dark saddle, a pale
// moon streak down each flank, a black bramble mane with violet buds, tall
// ears, violet slit eyes and a long bushy tail. What the standard adds:
//
//   * a coat of shaggy fur plates in a brick pattern over the barrel (the
//     saddle and the moon streak are the same plates, stepped dark and pale),
//     a ruff of blades round the neck and the cheeks, a boxed skull and a
//     long snout, upper and lower fangs, a mane of bramble blades that rise
//     as hackles, a jointed tail of fur blades with a pale tip; four LOCKED
//     PAWS (render/facet/legs.js) with bone claws, the elbows folding back
//     and the stifles forward the way a wolf's do;
//   * three ability timelines driven by the sim (sim/bosses/gloamwolf.js):
//       Pounce     crouch (the ring telegraph, stretched: belly low, hackles
//                  up, the hind paws gathered), leap (the sim's 16-tick bound:
//                  a real arc, paws tucked), land (2.5 frames: the forepaws
//                  take it, the body squashes), held, settle with one
//                  overshoot;
//       Rend       wind (the 36-tick cone telegraph: pulled back, the right
//                  forepaw raised high and wide), strike (2.5 frames: the
//                  lunge and the rake across, the jaw snaps), held, back;
//       Moon Howl  rise (the 60-tick ring telegraph: it sits back on its
//                  haunches, the head goes up, the throat lights), cry (2.5
//                  frames: the head thrown back, the jaw wide), held, settle;
//     and the rage (`enraged`): hackles stay up, the eyes and the mane burn;
//   * the [M] beats: a spawn-in grow, named points (mouth, throat, the mane's
//     crown as `tip`, chest, each paw), the shared hit envelope (`react`).
//
// Same interface as the classic (group, mats, setYaw, setFlash, pose), plus
// `lab`, `points`, `react`. Faces +Z. Render only: it reads the sim entity
// (mode, telegraph, enraged) and never writes it.
import { Color, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { addInk, groundShadow, INK_PX } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { HIDE, TELL_VIOLET } from '../enemies/style.js';
import { facetize, facetMaterial } from '../facet/material.js';
import { PART_INK_PX, createPlateTube, createSpine, instancedPart, placeRow, wedgeGeometry } from '../facet/kit.js';
import { createTimeline, ease } from '../facet/timeline.js';
import { lay, limbBox, taperBox } from '../facet/shapes.js';
import { createLegs } from '../facet/legs.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, lunge, makePoints, settle, spawnGrow } from '../facet/beats.js';

// --- Colour: the classic wolf's (third.js), no new hues.
const FUR = HIDE.boarBody.clone().lerp(new Color(PALETTE.warmGrey), 0.45).multiplyScalar(0.95);
const FUR_DARK = HIDE.boarDark.clone().multiplyScalar(0.7);
const FUR_PALE = new Color(PALETTE.bone).lerp(new Color(PALETTE.signalBlue), 0.18).multiplyScalar(0.95);
const MANE = HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.3).multiplyScalar(0.6);
const VIOLET = new Color(PALETTE.godstuffViolet);
const VIOLET_PEAK = new Color(PALETTE.godstuffVioletPeak);
const flashable = (c) => facetMaterial(c, { emissive: '#FFFFFF', emissiveIntensity: 0 });
const lit = (c) => new MeshBasicMaterial({ color: new Color(c), toneMapped: false });
function glow(color, size, opacity) {
  const g = makeGlowSprite({ color: '#FFFFFF', size, opacity });
  g.material.toneMapped = false;
  g.material.color.set(color);
  return g;
}

// --- Body plan (yaw space, faces +Z); the body pivots at the hind hips, so
// the howl sits back on them and a crouch lowers the whole wolf.
const HIP_Y = 1.15;
const PIVOT_Z = -0.72;
// [hip x, hip z, home x, home z, front, gait group]
const LEGS = [
  [-0.32, 0.62, -0.36, 0.7, true, 0],
  [0.32, 0.62, 0.36, 0.7, true, 1],
  [-0.3, PIVOT_Z, -0.34, -0.78, false, 1],
  [0.3, PIVOT_Z, 0.34, -0.78, false, 0],
];
const UPPER = 0.64;
const LOWER = 0.62;
const PAW_H = 0.1;
export const WOLF_WALK = 1.7; // u/s, GLOAMWOLF.moveSpeed (2.1 enraged)
const CROUCH_SEC = (54 - 16) / 60; // the pounce ring's warning before the bound
const LEAP_SEC = 16 / 60; // GLOAMWOLF.pounce.leapTicks
const LEAP_H = 1.1; // u, the top of the bound's arc
const WIND_SEC = 36 / 60; // the rend cone's warning
const RISE_SEC = 1.0; // the howl ring's warning

export const WOLF_ABILITIES = Object.freeze({
  pounce: createTimeline('pounce', 'Pounce', [
    { id: 'crouch', label: 'crouch', dur: CROUCH_SEC },
    { id: 'leap', label: 'leap', dur: LEAP_SEC },
    { id: 'land', label: 'land', dur: STRIKE_SEC },
    { id: 'hold', label: 'landed', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.45 },
  ], { cues: [{ at: CROUCH_SEC, id: 'leap' }, { at: CROUCH_SEC + LEAP_SEC, id: 'land' }] }),
  rend: createTimeline('rend', 'Rend', [
    { id: 'wind', label: 'wind up', dur: WIND_SEC },
    { id: 'strike', label: 'rake', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact', dur: HOLD_SEC },
    { id: 'back', label: 'recover', dur: 0.4 },
  ], { cues: [{ at: WIND_SEC + STRIKE_SEC, id: 'rend' }] }),
  howl: createTimeline('howl', 'Moon Howl', [
    { id: 'rise', label: 'sit and draw', dur: RISE_SEC },
    { id: 'cry', label: 'howl', dur: STRIKE_SEC },
    { id: 'hold', label: 'held', dur: HOLD_SEC + 0.3 },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: RISE_SEC, id: 'howl' }] }),
  rage: createTimeline('rage', 'Enraged', [
    { id: 'rise', label: 'hackles up', dur: 0.35 },
    { id: 'enraged', label: 'enraged', dur: 1.6 },
  ]),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (0 at rest):
//   crouch 0..1 the body lowers       sit    0..1 down on the haunches
//   pitch  body pitch, + nose down    reach  u the body moves forward
//   neck   neck pitch, + down         head   head pitch, + down
//   jaw    0..1 open                  throat 0..1 the throat lights
//   air    0..1 off the ground        tuck   0..1 paws tucked (in the air)
//   rake   0..1 right forepaw raised  sweep  -1..1 its swing (+ out, - across)
//   hackle 0..1 the mane rises        squash 0..1 contact squash
//   tail   tail lift (+ up)           rage   0..1 enraged
const KEYS = ['crouch', 'sit', 'pitch', 'reach', 'neck', 'head', 'jaw', 'throat', 'air', 'tuck', 'rake', 'sweep', 'hackle', 'squash', 'tail', 'rage'];
const restChannels = (C) => {
  for (const k of KEYS) C[k] = 0;
  return C;
};
const ZERO = restChannels({});
const pose = (o) => ({ ...ZERO, ...o });
const CROUCHED = pose({ crouch: 1, pitch: 0.1, reach: -0.14, neck: 0.4, head: 0.18, jaw: 0.15, hackle: 0.7, tail: -0.35 });
const LANDED = pose({ crouch: 0.6, pitch: 0.14, reach: 0.2, neck: 0.3, head: 0.22, jaw: 0.75, hackle: 0.7, squash: 1, tail: 0.2 });
const WOUND = pose({ crouch: 0.25, pitch: -0.04, neck: 0.05, head: -0.12, jaw: 0.3, hackle: 0.6, rake: 1, sweep: 1 });
const RAKED = pose({ crouch: 0.35, pitch: 0.12, neck: 0.42, head: 0.28, jaw: 0.95, hackle: 0.6, rake: 0.55, sweep: -1 });
const SITTING = pose({ sit: 1, pitch: -0.26, neck: -0.62, head: -0.2, jaw: 0.35, throat: 0.5, hackle: 1, tail: -0.25 });
const CRYING = pose({ sit: 1, pitch: -0.32, neck: -0.86, head: -0.32, jaw: 1, throat: 1, hackle: 1, tail: -0.2 });
const mix = (C, A, B, k) => {
  for (const key of KEYS) C[key] = A[key] + (B[key] - A[key]) * k;
  return C;
};

// `from` is the pose an ability starts from (rest in the lab; in the game a
// back-to-back pounce of the Hunt starts from the landing).
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'pounce') {
    if (s.id === 'crouch') mix(C, from, CROUCHED, ease.out(Math.min(1, k * 1.8)));
    else if (s.id === 'leap') {
      // the bound: a real arc; the body noses up off the crouch and down onto
      // the landing, the paws tucked while it is up
      const air = Math.sin(Math.PI * k);
      mix(C, CROUCHED, LANDED, ease.inOut(k));
      C.crouch = (1 - k) * (1 - air) * 0.8;
      C.squash = 0;
      C.air = air;
      C.tuck = Math.min(1, air * 1.6);
      C.pitch = -0.34 * Math.cos(Math.PI * k) * air + 0.06;
      C.neck = 0.1 - 0.2 * air;
      C.tail = 0.35 * air;
    } else if (s.id === 'land') mix(C, pose({ ...LANDED, squash: 0, crouch: 0.2 }), LANDED, kick(k));
    else if (s.id === 'hold') mix(C, LANDED, LANDED, 0);
    else mix(C, ZERO, LANDED, settle(k));
  } else if (id === 'rend') {
    // B9: pulled back through the wind, driven past rest on the rake, home
    const L = s.id === 'wind' ? lunge('pull', k) : s.id === 'strike' ? lunge('drive', k) : s.id === 'hold' ? lunge('hold', k) : lunge('back', k);
    if (s.id === 'wind') mix(C, from, WOUND, ease.inOut(Math.min(1, k * 1.6)));
    else if (s.id === 'strike') mix(C, WOUND, RAKED, kick(k));
    else if (s.id === 'hold') mix(C, RAKED, RAKED, 0);
    else mix(C, ZERO, RAKED, settle(k, 0.06));
    C.reach = L.reach * 0.6; // body widths to u
    C.pitch += L.lean * 0.5;
    if (s.id === 'hold') C.squash = 1;
    else if (s.id === 'strike') C.squash = kick(k);
  } else if (id === 'howl') {
    if (s.id === 'rise') {
      mix(C, from, SITTING, ease.inOut(Math.min(1, k * 1.5)));
      C.throat = 0.15 + 0.45 * k; // the throat fills through the warning
    } else if (s.id === 'cry') mix(C, SITTING, CRYING, kick(k));
    else if (s.id === 'hold') mix(C, CRYING, CRYING, 0);
    else mix(C, ZERO, CRYING, settle(k));
  } else if (id === 'rage') {
    C.rage = s.id === 'rise' ? ease.out(k) : 1;
  }
  return C;
}

// --- Geometry.
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:wolf-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  chest: () => geo('chest', () => new IcosahedronGeometry(0.62, 1), 301),
  loins: () => geo('loins', () => new IcosahedronGeometry(0.5, 1), 303),
  belly: () => geo('belly', () => new IcosahedronGeometry(0.45, 1), 305),
  neck: () => geo('neck', () => new CylinderGeometry(0.3, 0.42, 0.7, 7), 307),
  skull: () => geo('skull', () => taperBox(0.5, 0.42, 0.5, 0.82, 0.78, 0.03), 309),
  snout: () => geo('snout', () => taperBox(0.27, 0.2, 0.52, 0.66, 0.7, 0.03), 311),
  jaw: () => geo('jaw', () => taperBox(0.22, 0.09, 0.46, 0.7, 0.7), 313),
  nose: () => geo('nose', () => taperBox(0.13, 0.09, 0.08, 0.8, 0.8), 315),
  throat: () => geo('throat', () => new IcosahedronGeometry(0.1, 0), 317, 0.16),
  bud: () => geo('bud', () => new IcosahedronGeometry(0.07, 0), 319, 0.16),
  tail: () => geo('tail', () => taperBox(0.3, 0.28, 0.42, 0.75, 0.75).translate(0, 0, -0.21), 321),
  upper: () => geo('upper', () => limbBox(0.24, 0.26, UPPER, 0.68, 0.72), 323),
  lower: () => geo('lower', () => limbBox(0.14, 0.15, LOWER, 0.85, 0.85), 325),
  paw: () => geo('paw', () => taperBox(0.2, PAW_H, 0.26, 0.85, 0.7).translate(0, PAW_H / 2, 0.04), 327, 0.12),
};

const _m = new Matrix4();
const _a = new Vector3();
const POLE_FRONT = new Vector3(0, 0.1, -1); // the elbow folds back
const POLE_HIND = new Vector3(0, 0.1, 1); // the stifle points forward

// Tint plates of a coat: `tint(ring, j)` returns a colour ratio or null.
const _c = new Color();
function tintPlates(mesh, rings, around, tint) {
  for (let r = 0; r < rings; r++) {
    for (let j = 0; j < around; j++) {
      const t = tint(r, j);
      if (!t) continue;
      const i = r * around + j;
      mesh.getColorAt(i, _c);
      mesh.setColorAt(i, _c.multiply(t));
    }
  }
  mesh.instanceColor.needsUpdate = true;
}
const ratio = (a, b) => new Color(a.r / b.r, a.g / b.g, a.b / b.b);

// The mane: [z, y, size] down the crown and withers (body space).
const MANE_ROW = [];
for (let i = 0; i < 11; i++) {
  const k = i / 10;
  MANE_ROW.push([1.0 - k * 1.55, 1.88 - k * 0.3 - (k < 0.2 ? 0 : 0.06), 1.15 - 0.5 * k]);
}
const BUDS = [1, 4, 7];

export function buildGloamWolfFacet() {
  const group = new Group();
  group.name = 'boss-gloamwolf';
  group.userData.modelStandard = true;
  const yaw = new Group();
  group.add(yaw);
  const grow = new Group();
  yaw.add(grow);
  const pivot = new Group();
  pivot.position.set(0, HIP_Y, PIVOT_Z);
  grow.add(pivot);
  const body = new Group();
  body.position.set(0, -HIP_Y, -PIVOT_Z);
  pivot.add(body);
  const squashG = new Group();
  squashG.position.set(0, 1.2, 0);
  body.add(squashG);
  const torso = new Group();
  torso.position.set(0, -1.2, 0);
  squashG.add(torso);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const fur = track(flashable(FUR));
  const dark = track(flashable(FUR_DARK));
  const pale = track(flashable(FUR_PALE));
  const maneMat = track(flashable(MANE));
  const claw = track(flashable(HIDE.bone));
  const eyeMat = lit(PALETTE.godstuffVioletPeak);
  const throatMat = new MeshBasicMaterial({ color: VIOLET, vertexColors: true, toneMapped: false });
  const budMat = new MeshBasicMaterial({ color: TELL_VIOLET, vertexColors: true, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- Deep chest, narrow loins, a pale belly under a coat of fur plates.
  const chest = mesh(G.chest(), fur, torso);
  chest.scale.set(0.95, 1.05, 1.15);
  chest.position.set(0, 1.25, 0.45);
  const loins = mesh(G.loins(), fur, torso);
  loins.scale.set(0.85, 0.85, 1.3);
  loins.position.set(0, 1.18, -0.55);
  const belly = mesh(G.belly(), pale, torso, false);
  belly.scale.set(0.7, 0.5, 1.6);
  belly.position.set(0, 0.95, 0.05);
  const spine = createSpine(5);
  [[0, 1.27, 0.85], [0, 1.27, 0.42], [0, 1.22, -0.1], [0, 1.18, -0.6], [0, 1.18, -1.05]].forEach(([x, y, z], i) => spine.pts[i].set(x, y, z));
  const coatR = (u) => 0.62 - 0.2 * u;
  const RINGS = 12;
  const AROUND = 11;
  const coat = createPlateTube({ spine, rings: RINGS, around: AROUND, arc: Math.PI * 1.08, radius: coatR, plateMat: fur, tilt: 0.36, thick: 0.05, name: 'wolf-coat' });
  coat.update();
  // the saddle: the top plates stepped dark; the moon streak: a pale band
  // down each flank from the shoulder to the hip
  const toDark = ratio(FUR_DARK, FUR);
  const toPale = ratio(FUR_PALE.clone().lerp(FUR, 0.45), FUR);
  const top = (AROUND - 1) / 2;
  tintPlates(coat.plates, RINGS, AROUND, (r, j) => {
    // the saddle: three plates wide over the middle of the back, a dark
    // stripe down the spine fore and aft of it
    if ((Math.abs(j - top) <= 1 && r >= 4 && r <= 8) || (j === top && r >= 2 && r <= 10)) return toDark;
    if ((j === 1 || j === AROUND - 2) && r >= 3 && r <= 8) return toPale;
    return null;
  });
  torso.add(coat.plates);

  // --- The mane: bramble blades from the crown down the withers, hackles
  // that rise (laid every frame), violet buds among them.
  const mane = instancedPart(wedge, maneMat, MANE_ROW.length, { name: 'wolf-mane', moving: true });
  torso.add(mane);
  const buds = instancedPart(G.bud(), budMat, BUDS.length, { name: 'wolf-buds', moving: true, inkPx: PART_INK_PX });
  torso.add(buds);
  const maneGlow = glow(PALETTE.godstuffViolet, 1.3, 0.1);
  maneGlow.position.set(0, 1.95, 0.2);
  torso.add(maneGlow);

  // --- Neck with a ruff; head with a boxed skull, a long snout and a jaw.
  const neck = new Group();
  neck.position.set(0, 1.5, 0.9);
  torso.add(neck);
  const neckM = mesh(G.neck(), fur, neck);
  neckM.rotation.x = -0.9;
  neckM.position.set(0, 0.1, 0.12);
  const RUFF = 12;
  const ruff = placeRow(wedge, fur, RUFF, (i, m) => {
    const a = (i / RUFF) * Math.PI * 2;
    const x = Math.sin(a);
    const y = Math.cos(a);
    // a collar round the neck's base, blades swept back and out
    lay(m, x * 0.4, -0.02 + y * 0.36, -0.08, x * 0.8, y * 0.8, -0.9, 0.24, 0.42 + 0.08 * (y < 0 ? 1 : 0), 0.5, a);
  }, { name: 'wolf-ruff', inkPx: PART_INK_PX, mottle: 0.16, seed: 51 });
  neck.add(ruff);
  const head = new Group();
  head.position.set(0, 0.3, 0.45);
  neck.add(head);
  mesh(G.skull(), fur, head).position.set(0, 0.02, 0.0);
  const snout = mesh(G.snout(), dark, head);
  snout.position.set(0, -0.06, 0.44);
  mesh(G.nose(), lit(PALETTE.voidCharcoal), head, false).position.set(0, -0.0, 0.72);
  const cheeks = placeRow(wedge, pale, 6, (i, m) => {
    const side = i % 2 ? 1 : -1;
    const j = i >> 1;
    lay(m, side * 0.24, -0.04 - j * 0.06, -0.04 - j * 0.04, side * 0.9, -0.25, -0.75, 0.16, 0.3 - j * 0.04, 0.4, side);
  }, { name: 'wolf-cheeks', inkPx: PART_INK_PX, mottle: 0.1, seed: 53 });
  head.add(cheeks);
  const jaw = new Group();
  jaw.position.set(0, -0.15, 0.14);
  head.add(jaw);
  mesh(G.jaw(), dark, jaw).position.set(0, -0.02, 0.22);
  const fangs = placeRow(wedge, claw, 2, (i, m) => {
    const side = i ? 1 : -1;
    lay(m, side * 0.09, -0.1, 0.6, 0, -1, 0.15, 0.06, 0.15, 0.4);
  }, { name: 'wolf-fangs', inkPx: INK_PX * 0.5, mottle: 0 });
  head.add(fangs);
  const lowFangs = placeRow(wedge, claw, 2, (i, m) => {
    const side = i ? 1 : -1;
    lay(m, side * 0.07, 0.02, 0.4, 0, 1, 0.1, 0.05, 0.12, 0.4);
  }, { name: 'wolf-fangs-low', inkPx: INK_PX * 0.5, mottle: 0 });
  jaw.add(lowFangs);
  const ears = placeRow(wedge, dark, 4, (i, m) => {
    const side = i % 2 ? 1 : -1;
    // the outer ear, then a pale inner blade just in front of it
    if (i < 2) lay(m, side * 0.17, 0.18, -0.06, side * 0.25, 1, -0.2, 0.26, 0.42, 0.5, side * 0.2);
    else lay(m, side * 0.17, 0.2, -0.02, side * 0.25, 1, -0.2, 0.15, 0.3, 0.3, side * 0.2);
  }, { name: 'wolf-ears', inkPx: PART_INK_PX, mottle: 0 });
  ears.setColorAt(2, ratio(FUR_PALE, FUR_DARK));
  ears.setColorAt(3, ratio(FUR_PALE, FUR_DARK));
  ears.instanceColor.needsUpdate = true;
  head.add(ears);
  for (const side of [-1, 1]) {
    const eye = new Mesh(sharedGeo('wolf-eye', () => taperBox(0.13, 0.035, 0.04, 0.6, 0.8)), eyeMat);
    eye.position.set(side * 0.16, 0.08, 0.25);
    eye.rotation.z = side * -0.35;
    head.add(eye);
  }
  const eyeGlow = glow(PALETTE.godstuffViolet, 0.5, 0.2);
  eyeGlow.position.set(0, 0.12, 0.42);
  head.add(eyeGlow);
  const throat = new Mesh(G.throat(), throatMat);
  throat.position.set(0, -0.12, 0.33);
  head.add(throat);
  const throatGlow = glow(PALETTE.godstuffViolet, 1.2, 0);
  throatGlow.position.set(0, -0.1, 0.55);
  head.add(throatGlow);

  // --- A long bushy tail: three jointed segments, fur blades, a pale tip.
  const tailRoot = new Group();
  tailRoot.position.set(0, 1.35, -1.12);
  torso.add(tailRoot);
  const tailSegs = [];
  let parent = tailRoot;
  for (let i = 0; i < 3; i++) {
    const seg = new Group();
    if (i > 0) seg.position.set(0, 0, -0.38);
    parent.add(seg);
    const m = mesh(G.tail(), i === 2 ? pale : fur, seg);
    m.scale.setScalar(1 - i * 0.18);
    tailSegs.push(seg);
    parent = seg;
  }
  const tailFur = [];
  for (let i = 0; i < 3; i++) {
    const tuft = placeRow(wedge, i === 2 ? pale : fur, 4, (j, m) => {
      const side = j % 2 ? 1 : -1;
      lay(m, side * 0.1, j < 2 ? 0.06 : -0.06, -0.12, side * 0.7, j < 2 ? 0.5 : -0.4, -0.9, 0.16, 0.34 - i * 0.05, 0.4, side);
    }, { name: 'wolf-tail-fur', inkPx: PART_INK_PX, mottle: 0.12, seed: 55 + i });
    tailSegs[i].add(tuft);
    tailFur.push(tuft);
  }

  // --- Legs on locked paws, bone claws on each.
  const legs = LEGS.map(([hx, hz, fx, fz, front, grp], i) => {
    const upper = new Group();
    mesh(G.upper(), front ? fur : dark, upper);
    const lower = new Group();
    mesh(G.lower(), dark, lower);
    const paw = new Group();
    mesh(G.paw(), pale, paw);
    grow.add(upper, lower, paw);
    return { i, front, hipLocal: new Vector3(hx, HIP_Y, hz), home: [fx, fz], group: grp, upper, lower, foot: paw, a: UPPER, b: LOWER, pole: front ? POLE_FRONT : POLE_HIND, footH: PAW_H * 0.8, hip: null };
  });
  const claws = instancedPart(wedge, claw, legs.length * 3, { name: 'wolf-claws', moving: true, inkPx: INK_PX * 0.5 });
  grow.add(claws);
  const shadow = groundShadow(1.15, 0.42, { deep: 1.6 });
  group.add(shadow);

  // --- Points (B8) and the hit envelope's tuning.
  const points = makePoints({
    mouth: [jaw, 0, 0, 0.5],
    throat: [head, 0, -0.12, 0.33],
    tip: [torso, 0, 2.1, 0.9],
    chest: [torso, 0, 1.2, 1.0],
  });
  const PAW_NAMES = ['pawFL', 'pawFR', 'pawHL', 'pawHR'];
  const pawPts = legs.map((L) => {
    const p = makePoints({ [PAW_NAMES[L.i]]: [grow, 0, 0, 0] })[PAW_NAMES[L.i]];
    points[PAW_NAMES[L.i]] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 0, axis: 'y', midY: 1.2 };

  // --- Locked paws.
  body.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(body.matrix).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.4, lift: 0.22, minDur: 0.11, maxDur: 0.28, durPerSpeed: 0.05, lead: 0.6, flight: 3.2 } });
  const { gait } = legRig;
  const C = restChannels({});
  // the sit draws the hind paws forward under the haunches; the landing and
  // the rake put the forepaws a step ahead
  const stance = (i, out) => {
    if (legs[i].front) out.z += 0.22 * C.squash + 0.1 * C.crouch;
    else out.z += 0.3 * C.sit - 0.06 * C.crouch;
    return out;
  };
  // the rend: the right forepaw lifts high and wide, then rakes across
  const raise = (i) => (i === 1 ? C.rake : 0);
  const raiseTo = (i, out) => {
    hipOf(legs[i], out);
    out.x += 0.32 * C.sweep;
    out.y -= 0.62 - 0.22 * C.rake;
    out.z += 0.5;
    return out;
  };
  // the bound: forepaws reach forward, hind paws trail, both drawn up
  const tuck = (i, out) => {
    hipOf(legs[i], out);
    out.y -= legs[i].front ? 0.7 : 0.66;
    out.z += legs[i].front ? 0.32 : -0.36;
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
  let telAge = 0;
  let lastMode = 'stalk';
  let rage = 0;
  const lv = new Vector3();
  let leanF = 0;

  function reset() {
    lastT = null;
    ab = null;
    tel = null;
    lastMode = 'stalk';
    rage = 0;
    spawn.clear();
  }
  const begin = (id, t = 0) => {
    from = { ...C, air: 0, tuck: 0, squash: 0, rake: 0 };
    ab = { id, t };
  };

  // In game: each warning is its wind-up, stretched to the sim's ticks; the
  // bound follows the sim's leap mode; a resolve jumps to the strike.
  function drive(dt, e) {
    const T = e && e.telegraph ? e.telegraph : null;
    const mode = e ? e.mode || 'stalk' : 'stalk';
    if (T && T !== tel) {
      tel = T;
      telAge = 0;
      const id = T.attack === 'pounce' ? 'pounce' : T.attack === 'rend' ? 'rend' : T.attack === 'howl' ? 'howl' : null;
      if (id) begin(id);
    } else if (!T) tel = null;
    if (tel) telAge += dt;
    if (ab) {
      const tl = WOLF_ABILITIES[ab.id];
      if (ab.id === 'pounce') {
        const leapAt = tl.startOf('leap');
        const landAt = tl.startOf('land');
        if (mode === 'crouch' && tel) {
          const span = Math.max(0.05, (tel.resolveTick - tel.startTick) / 60 - LEAP_SEC);
          ab.t = Math.min(leapAt - 1e-4, (CROUCH_SEC * telAge) / span);
        } else if (mode === 'leap') ab.t = Math.min(landAt - 1e-4, Math.max(ab.t, leapAt) + dt);
        else ab.t = Math.max(ab.t, lastMode === 'leap' ? landAt : ab.t) + dt;
      } else {
        const windEnd = tl.phases[1] ? tl.startOf(tl.phases[1].id) : tl.duration;
        if (tel) {
          const span = Math.max(0.05, (tel.resolveTick - tel.startTick) / 60);
          ab.t = Math.min(windEnd - 1e-4, (windEnd * telAge) / span);
        } else ab.t = Math.max(ab.t, windEnd) + dt;
      }
      if (ab.t >= tl.duration) ab = null;
    }
    lastMode = mode;
    if (ab) abilityChannels(ab.id, WOLF_ABILITIES[ab.id].sample(ab.t), C, from);
    else restChannels(C);
    rage += ((e && e.enraged ? 1 : 0) - rage) * (1 - Math.exp(-3 * dt));
    C.rage = rage;
    return C;
  }

  function apply(dt, { locked, hpFrac }) {
    gait.localVelocity(yaw, lv);
    const sp = Math.min(3, Math.hypot(lv.x, lv.z) / WOLF_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 && C.air < 0.02 ? Math.min(0.1, (lv.z / WOLF_WALK) * 0.04) : 0) - leanF) * k;
    const breathe = 0.012 * Math.sin(idle * (2 + 1.5 * C.rage));
    const bobY = 0.04 * gait.bob * Math.min(1, sp);
    pivot.position.set(0, HIP_Y + breathe + bobY - 0.34 * C.crouch - 0.5 * C.sit + LEAP_H * C.air, PIVOT_Z + C.reach);
    pivot.rotation.set(C.pitch + leanF, 0, 0);
    squashG.scale.set(1 + 0.08 * C.squash, 1 - 0.06 * C.squash, 1 + 0.04 * C.squash);
    neck.rotation.x = C.neck + 0.04 * Math.sin(idle * 1.9);
    head.rotation.x = C.head;
    jaw.rotation.x = 0.55 * C.jaw + 0.05 * Math.sin(idle * 2.3);
    // the mane: hackles rise with the crouch, the howl and the rage
    const hack = Math.max(C.hackle, 0.7 * C.rage);
    for (let i = 0; i < MANE_ROW.length; i++) {
      const [z, y, size] = MANE_ROW[i];
      const back = 0.95 - 0.55 * hack - 0.1 * (i / 10);
      const side = i % 2 ? 1 : -1;
      lay(_m, side * 0.06, y - 0.08, z, side * 0.25, Math.cos(back), -Math.sin(back), 0.2 * size, 0.5 * size * (1 + 0.25 * hack), 0.45 * size, side * 0.3);
      mane.setMatrixAt(i, _m);
    }
    mane.instanceMatrix.needsUpdate = true;
    const fever = 0.55 + 0.2 * Math.sin(idle * 2.6) + (1 - hpFrac) * 0.3 + 0.3 * C.rage;
    for (let i = 0; i < BUDS.length; i++) {
      const [z, y] = MANE_ROW[BUDS[i]];
      const sc = 1 + 0.3 * Math.sin(idle * 3.2 + i) * fever;
      lay(_m, 0, y + 0.16 + 0.12 * hack, z - 0.05, 0, 1, 0, sc, sc, sc);
      buds.setMatrixAt(i, _m);
    }
    buds.instanceMatrix.needsUpdate = true;
    // the tail: a slow wave, up in the bound, tucked in the crouch
    const wag = 0.3 * Math.sin(idle * 3.1) * (0.3 + Math.min(1, sp));
    for (let i = 0; i < tailSegs.length; i++) {
      tailSegs[i].rotation.set((i === 0 ? -0.5 : -0.12) + (0.2 + 0.2 * i) * C.tail + 0.06 * Math.sin(idle * 2.4 - i), wag * (0.5 + 0.4 * i), 0);
    }
    throatGlow.material.opacity = Math.min(0.9, 0.85 * C.throat + 0.3 * C.jaw * (C.rake > 0 ? 1 : 0));
    throat.scale.setScalar(1 + C.throat);
    eyeGlow.material.opacity = 0.18 + 0.22 * C.crouch + 0.15 * C.rage + 0.2 * C.throat;
    maneGlow.material.opacity = Math.min(0.35, 0.08 * fever + 0.22 * C.throat);
    eyeMat.color.copy(VIOLET).lerp(VIOLET_PEAK, 0.4 + 0.6 * Math.max(C.crouch, C.throat, C.rage * 0.5));
    shadow.scale.set(1 - 0.35 * C.air, 1.6 * (1 - 0.35 * C.air), 1);
    pivot.updateMatrix();

    legRig.update(dt, { space: yaw, stance, locked, air: C.air, raise, raiseTo, tuck: C.tuck > 0 ? tuck : null });
    for (const L of legs) {
      const S = legRig.state[L.i];
      // a lifting paw tips its toes down; a planted one lies flat
      L.foot.rotation.set((L.front ? 0.55 : 0.35) * S.up, 0, 0);
      pawPts[L.i].position.copy(L.foot.position);
      for (let j = 0; j < 3; j++) {
        const cx = (j - 1) * 0.06;
        _a.set(0, -0.35 - 0.6 * S.up, 1);
        lay(_m, L.foot.position.x + cx, L.foot.position.y + 0.035, L.foot.position.z + 0.16, _a.x, _a.y, _a.z, 0.05, 0.11, 0.35);
        claws.setMatrixAt(L.i * 3 + j, _m);
      }
    }
    claws.instanceMatrix.needsUpdate = true;
  }

  return {
    group,
    mats,
    points,
    react,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    setFlash(k) {
      const v = k < 0 ? 0 : k > 1 ? 1 : k;
      for (const m of mats) m.emissiveIntensity = v;
    },
    pose({ t, hpFrac = 1, e = null, turntable = false }) {
      const id = e ? e.id : lastId;
      // a fresh pose: a pooled rig posed for a new wolf (or the clock went
      // back); the bound's own travel is never a jump (it is under 9 u)
      const moved = Math.hypot(group.position.x - lastX, group.position.z - lastZ);
      const fresh = lastT === null || t < lastT || (moved > 2.5 && !(e && (e.mode === 'leap' || lastMode === 'leap'))) || (e && id !== lastId);
      if (fresh) {
        reset();
        if (e && !turntable) spawn.restart(t);
      }
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      lastX = group.position.x;
      lastZ = group.position.z;
      lastId = id;
      idle += dt;
      drive(dt, e);
      const g = turntable ? 1 : spawn.scale(t);
      grow.scale.setScalar(g);
      apply(dt, { locked: !turntable && g === 1 && !!e, hpFrac });
    },
    lab: {
      abilities: WOLF_ABILITIES,
      reset() {
        reset();
        gait.reset(yaw, stance);
      },
      feet: () => gait.report(yaw),
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      gait,
      pose({ dt, ability = null, abT = 0, hpFrac = 1, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, WOLF_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        const g = ability === 'spawn' ? spawnGrow(abT) : 1;
        grow.scale.setScalar(g);
        apply(dt, { locked: !rigid && g === 1, hpFrac });
      },
    },
  };
}
