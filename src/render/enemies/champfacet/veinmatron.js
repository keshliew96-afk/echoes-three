// THE VEIN MATRON, MODEL STANDARD (docs/MODEL_STANDARD.md "Level IV
// champions"). The Hollow Heart's second champion rebuilt in the faceted look
// of Kesh's sample video, on top of the chibi ink style, keeping the classic
// rig's identity (render/enemies/champions2.js): a tall crystal matriarch of
// bruised heart-flesh on a skirt of nine violet vein-roots splayed on the
// floor, crystal plates over her breast with the heart lit through a split,
// a long hooded face under a crown of crystal spines, the ONE indigo tell as
// her third eye, and two whips of tapering flesh off her shoulders. What the
// standard adds:
//
//   * a faceted root on each of the nine, a lit vein plate row down its back
//     and a crystal knuckle at its bend; a ring of hip plates; a faceted
//     waist with a collar of bone plates; three crystal breast plates over a
//     lining of lit wedges; a faceted skull under a veil of plates; the
//     crown's seven faceted spines with six small crystals between; two
//     whips of ten faceted tapering segments with lit vein beads, a gem at
//     each tip;
//   * SHE GLIDES ON HER ROOTS (the legless rule: the base stays planted):
//     she has no feet; the root tips rest on the floor and the skirt never
//     lifts off it except the pulse's heave; the roots ripple with the
//     travel, the body leans into it from its own velocity;
//   * two ability timelines driven by the sim:
//       Vein Lash    draw (the warning less one strike: the right whip drawn
//                    back over the shoulder, the torso twisted away, the
//                    hips sunk into the roots), crack (2.5 frames, landing
//                    on the lane's tick: the whip shot straight down the
//                    lane to its length, the torso twisted into it), contact
//                    held, recoil (the heart flares as she drinks), settle
//                    with one overshoot;
//       Heart Pulse  swell (the warning less one strike: she rears back, the
//                    roots lift, the heart and the crown swell, both whips
//                    raised), beat (2.5 frames, on the ring's tick: the body
//                    drops, the roots slam flat, the heart flares, the whips
//                    flung out), contact held, recoil, settle;
//   * the [M] beats (render/facet/beats.js): a spawn-in grow from the floor,
//     named points (the right whip's `tip`, the `heart`, the third `eye`,
//     the `crown`), and the hit reaction is the shared overlay's
//     (render/react.js), tuned by `react`.
//
// Same interface as the classic (group, mats, setYaw, pose), plus `lab`,
// `points`, `react`. Faces +Z. Render only: it reads the sim entity and never
// writes it; every clip runs off pose's t.
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, OctahedronGeometry, Quaternion, SphereGeometry, Vector3 } from 'three';
import { addInk, groundShadow } from '../../critters/common.js';
import { PALETTE, VFX_MATTER } from '../../../data/palette.js';
import { makeGlowSprite } from '../../glow.js';
import { sharedGeo } from '../../geocache.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize, facetMaterial, hash01 } from '../../facet/material.js';
import { PART_INK_PX, instancedPart, placeRow, plateGeometry, wedgeGeometry } from '../../facet/kit.js';
import { lay, taperBox } from '../../facet/shapes.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../../facet/beats.js';

// --- Colour: the classic Vein Matron's (champions2.js C), unchanged.
const MATRON = new Color(VFX_MATTER.heartflesh).lerp(new Color(PALETTE.godstuffViolet), 0.18).multiplyScalar(1.15);
const MATRON_DARK = new Color(VFX_MATTER.heartflesh).multiplyScalar(0.62);
const ROOT = new Color(VFX_MATTER.heartflesh).lerp(new Color(PALETTE.voidCharcoal), 0.35);
const CRYSTAL = new Color(VFX_MATTER.heartcrystal).lerp(new Color(PALETTE.parchment), 0.35);
const VEIN = new Color(VFX_MATTER.heartvein);
const VEIN_PEAK = new Color(VFX_MATTER.heartpeak);
const HEART = VEIN.clone().lerp(VEIN_PEAK, 0.25);
// the standard's value steps: lit flesh over the waist's crown, a shaded
// root in the skirt's fold, bone for the collar
const MATRON_LIT = MATRON.clone().lerp(new Color(PALETTE.bone), 0.1);
const ROOT_DARK = ROOT.clone().multiplyScalar(0.7);
const BONE = new Color(PALETTE.bone).multiplyScalar(0.8);

const flashable = (color) => facetMaterial(color, { emissive: '#FFFFFF', emissiveIntensity: 0 });
const lit = (c) => new MeshBasicMaterial({ color: new Color(c), toneMapped: false });
function glow(color, size, opacity) {
  const g = makeGlowSprite({ color: '#FFFFFF', size, opacity });
  g.material.toneMapped = false;
  g.material.color.set(color);
  return g;
}

// --- Body plan (yaw space, faces +Z; the classic's heights).
const ROOTS = 9;
const ROOT_Y = 0.95; // the roots' hinge
// each root bends at a crystal knuckle: an upper length off the hinge, a lower
// length from the knee down to the floor (the classic's one straight cone)
const ROOT_UP = 0.7;
const ROOT_LOW = 0.8;
const TILT_UP = 0.55; // rad off vertical
const TILT_LOW = 1.15; // the lower reaches the floor: 0.95 - 0.7 cos 0.55 - 0.8 cos 1.15 = 0.03
const HIP_Y = 1.0;
const TORSO_Y = 1.15;
const HEAD_Y = 1.25; // in torso space
const SEGS = 10; // whip segments
const SEG = 0.24; // u, a segment's rest length
const BEADS = 5; // lit beads per whip
export const MATRON_WALK = 1.0; // u/s, VM.moveSpeed (sim/enemies/champions.js)
export const LAB_LASH = 5; // u, the lane the lab's lash cracks down
const DRAW_SEC = 58 / 60 - STRIKE_SEC; // the lash lane's warning
const SWELL_SEC = 70 / 60 - STRIKE_SEC; // the pulse ring's warning

// --- Ability timelines (render only; the sim's numbers: a 58-tick lane, a
// 70-tick ring).
export const MATRON_ABILITIES = Object.freeze({
  lash: createTimeline('lash', 'Vein Lash', [
    { id: 'draw', label: 'draw the whip back', dur: DRAW_SEC },
    { id: 'crack', label: 'crack', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'drink', dur: 0.25 },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: DRAW_SEC + STRIKE_SEC, id: 'lash' }] }),
  pulse: createTimeline('pulse', 'Heart Pulse', [
    { id: 'swell', label: 'swell', dur: SWELL_SEC },
    { id: 'beat', label: 'beat', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: SWELL_SEC + STRIKE_SEC, id: 'pulse' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (all 0 at rest):
//   lean   body pitch, + forward        twist  body yaw, + the right shoulder back
//   sink   0..1 the hips sunk into the roots   rootLift 0..1 the roots lifted off the floor
//   heart  0..1 the heart swollen       crown  0..1 the crown fanned
//   back   0..1 the right whip drawn back    out  0..1 the right whip cracked down the lane
//   raise  0..1 both whips raised       fling  0..1 both whips flung out wide
//   squash 0..1 contact squash          shove  0..1 the recoil (B3)
//   fever  0..1 the tell flares         drink  0..1 the veins run with drunk light
const KEYS = ['lean', 'twist', 'sink', 'rootLift', 'heart', 'crown', 'back', 'out', 'raise', 'fling', 'squash', 'shove', 'fever', 'drink'];
function restChannels(C) {
  for (const k of KEYS) C[k] = 0;
  return C;
}
const lerp = (a, b, k) => a + (b - a) * k;
const ZERO = restChannels({});
const pose = (p) => ({ ...ZERO, ...p });
const DRAWN = pose({ lean: -0.12, twist: 0.45, sink: 0.35, heart: 0.3, back: 1, fever: 1 });
const CRACKED = pose({ lean: 0.3, twist: -0.4, sink: 0.25, heart: 0.5, out: 1, squash: 1, fever: 1 });
const SWOLLEN = pose({ lean: -0.3, sink: -0.2, rootLift: 1, heart: 1, crown: 1, raise: 1, fever: 1 });
const BEATEN = pose({ lean: 0.18, sink: 0.6, heart: 1, crown: 0.6, fling: 1, squash: 1, fever: 1 });
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
  if (id !== 'lash' && id !== 'pulse') return C;
  const wind = id === 'lash' ? DRAWN : SWOLLEN;
  const struck = id === 'lash' ? CRACKED : BEATEN;
  if (s.id === 'draw' || s.id === 'swell') mixPose(C, from, wind, ease.inOut(Math.min(1, k * 1.15)));
  else if (s.id === 'crack' || s.id === 'beat') mixPose(C, wind, struck, kick(k)); // B4: off on the press frame
  else if (s.id === 'hold') mixPose(C, struck, struck, 0);
  else if (s.id === 'recoil') {
    mixPose(C, struck, struck, 0);
    C.squash = 1 - ease.out(k);
    C.shove = recoil(k * 0.2);
    if (id === 'lash') C.drink = Math.sin(Math.PI * k);
  } else {
    mixPose(C, ZERO, struck, settle(k));
    C.squash = 0;
    C.shove = recoil(0.2 + k * 0.5);
    if (id === 'lash') C.drink = Math.max(0, 1 - k * 2);
  }
  return C;
}

// --- Geometry (shared, faceted once).
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:matron-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  rootUp: () => geo('root-up', () => new CylinderGeometry(0.1, 0.14, ROOT_UP, 5).translate(0, -ROOT_UP / 2, 0), 501, 0.08),
  rootLow: () => geo('root-low', () => new ConeGeometry(0.1, ROOT_LOW, 5).translate(0, -ROOT_LOW / 2, 0), 502, 0.08),
  knuckle: () => geo('knuckle', () => new OctahedronGeometry(0.07, 0), 503, 0.1),
  hips: () => geo('hips', () => new SphereGeometry(0.42, 9, 7).scale(1.0, 0.6, 0.9), 505, 0.06),
  waist: () => geo('waist', () => new CylinderGeometry(0.34, 0.22, 0.8, 8).translate(0, 0.4, 0), 507, 0.06),
  shoulders: () => geo('shoulders', () => taperBox(0.8, 0.14, 0.26, 0.9, 0.8, 0), 509),
  breast: () => geo('breast', () => new OctahedronGeometry(0.2, 0).scale(0.9, 1.4, 0.45), 511, 0.08),
  heart: () => geo('heart', () => new IcosahedronGeometry(0.15, 1), 513, 0.08),
  skull: () => geo('skull', () => new SphereGeometry(0.17, 8, 7).scale(0.85, 1.25, 0.9), 515, 0.07),
  veil: () => geo('veil', () => new ConeGeometry(0.26, 0.7, 7, 1, true).translate(0, -0.1, -0.06), 517, 0.07),
  spine: () => geo('spine', () => new ConeGeometry(0.045, 0.6, 4).translate(0, 0.3, 0), 519, 0.1),
  seg: () => geo('seg', () => new CylinderGeometry(0.07, 0.085, SEG, 5).translate(0, -SEG / 2, 0), 521, 0.08),
  bead: () => sharedGeo('matron-bead', () => new SphereGeometry(0.03, 4, 3)),
  gem: () => geo('gem', () => new OctahedronGeometry(0.06, 0).scale(1, 1.6, 1), 523, 0.1),
  third: () => sharedGeo('matron-third', () => new OctahedronGeometry(0.04, 0).scale(1, 1.8, 1)),
  eye: () => sharedGeo('matron-eye', () => new BoxGeometry(0.05, 0.015, 0.02)),
};

const _m = new Matrix4();
const _q = new Quaternion();
const _a = new Vector3();

function tellGlow(size, opacity) {
  const g = makeGlowSprite({ color: TELL_INDIGO_GLOW, size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(TELL_INDIGO_GLOW);
  return g;
}

export function buildVeinMatronFacet() {
  const group = new Group();
  group.name = 'vein_matron';
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
  const body = new Group(); // body space = the classic's space
  body.position.set(0, -HIP_Y, 0);
  squashG.add(body);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const flesh = track(flashable(MATRON));
  const fleshLit = track(flashable(MATRON_LIT));
  const dark = track(flashable(MATRON_DARK));
  const rootM = track(flashable(ROOT));
  const rootDark = track(flashable(ROOT_DARK));
  const bone = track(flashable(BONE));
  const crystal = track(facetMaterial(CRYSTAL, { emissive: CRYSTAL, emissiveIntensity: 0.08 }));
  const veinM = lit(VEIN);
  const heartM = lit(HEART);
  const peakM = lit(VEIN_PEAK);
  const tellMat = new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const plate = plateGeometry();
  const wedge = wedgeGeometry();

  // --- The skirt of vein-roots: nine faceted roots hinged under the hips,
  // splayed to the floor, a lit vein row down each back and a crystal
  // knuckle at the bend. They live in yaw space (grow), so the body's lean
  // never lifts them: the base stays planted.
  const skirt = new Group();
  skirt.position.y = ROOT_Y;
  grow.add(skirt);
  const roots = [];
  const VEINS = 3;
  const veins = instancedPart(wedge, veinM, ROOTS * VEINS, { name: 'matron-root-veins', ink: false, moving: true });
  const knuckles = instancedPart(G.knuckle(), crystal, ROOTS, { name: 'matron-knuckles', ink: false, moving: true });
  grow.add(veins, knuckles);
  for (let i = 0; i < ROOTS; i++) {
    const a = (i / ROOTS) * Math.PI * 2 + 0.17;
    const g = new Group();
    g.rotation.y = a;
    skirt.add(g);
    const up = mesh(G.rootUp(), i % 3 === 1 ? rootDark : rootM, g);
    up.rotation.x = TILT_UP;
    const knee = new Group(); // the lower root hangs from the upper's end
    knee.position.y = -ROOT_UP;
    up.add(knee);
    const low = mesh(G.rootLow(), i % 3 === 1 ? rootDark : rootM, knee);
    low.rotation.x = TILT_LOW - TILT_UP;
    roots.push({ g, up, low, knee, ph: i * 0.8, a });
  }
  const hips = mesh(G.hips(), dark, body);
  hips.position.y = HIP_Y;
  const hipPlates = placeRow(plate, rootDark, 8, (i, m) => {
    const a = (i / 8) * Math.PI * 2;
    lay(m, Math.sin(a) * 0.4, HIP_Y - 0.08, Math.cos(a) * 0.36, Math.sin(a), -0.4, Math.cos(a), 0.18, 0.025, 0.2, 0);
  }, { name: 'matron-hip-plates', inkPx: PART_INK_PX, mottle: 0.1, seed: 81 });
  body.add(hipPlates);

  // --- The torso: a faceted waist, lit plates over its crown, a bone collar,
  // three crystal breast plates over a lining of lit wedges, the heart lit
  // through the split, the shoulders.
  const torso = new Group();
  torso.position.y = TORSO_Y;
  body.add(torso);
  mesh(G.waist(), flesh, torso);
  const waistLit = placeRow(plate, fleshLit, 5, (i, m) => {
    const a = -0.8 + (i / 4) * 1.6;
    lay(m, Math.sin(a) * 0.24, 0.7, Math.cos(a) * 0.22, Math.sin(a), 0.5, Math.cos(a), 0.12, 0.02, 0.2, 0);
  }, { name: 'matron-waist-lit', inkPx: PART_INK_PX, mottle: 0.1, seed: 83 });
  torso.add(waistLit);
  const collar = placeRow(plate, bone, 6, (i, m) => {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    lay(m, Math.sin(a) * 0.3, 0.86, Math.cos(a) * 0.24, Math.sin(a), 0.7, Math.cos(a), 0.14, 0.02, 0.1, 0);
  }, { name: 'matron-collar', inkPx: PART_INK_PX, mottle: 0.08, seed: 85 });
  torso.add(collar);
  for (const [x, y, rz] of [[-0.17, 0.75, 0.4], [0.17, 0.75, -0.4], [0, 0.5, 0]]) {
    const p = mesh(G.breast(), crystal, torso, false);
    p.position.set(x, y, 0.26);
    p.rotation.z = rz;
  }
  const lining = placeRow(wedge, veinM, 6, (i, m) => {
    const a = (i / 6) * Math.PI * 2;
    lay(m, Math.cos(a) * 0.1, 0.62 + Math.sin(a) * 0.12, 0.22, Math.cos(a), Math.sin(a), 0.1, 0.03, 0.09, 0.03, 0);
  }, { name: 'matron-lining', ink: false, mottle: 0 });
  torso.add(lining);
  const heart = mesh(G.heart(), heartM, torso, false);
  heart.position.set(0, 0.62, 0.24);
  const heartGlow = glow(VEIN, 1.6, 0.4);
  heartGlow.position.set(0, 0.62, 0.32);
  torso.add(heartGlow);
  const shoulders = mesh(G.shoulders(), dark, torso);
  shoulders.position.y = 0.95;

  // --- The head: a faceted skull under a veil of plates, the third eye's
  // indigo tell, two lit eyes, the crown of seven faceted spines with six
  // small crystals between.
  const head = new Group();
  head.position.y = HEAD_Y;
  torso.add(head);
  mesh(G.skull(), flesh, head);
  const veil = mesh(G.veil(), dark, head);
  veil.material.side = 2;
  const veilPlates = placeRow(plate, dark, 5, (i, m) => {
    const a = (i / 5) * Math.PI * 2 + Math.PI;
    lay(m, Math.sin(a) * 0.2, -0.12, Math.cos(a) * 0.2 - 0.06, Math.sin(a), 0.35, Math.cos(a), 0.12, 0.02, 0.32, 0);
  }, { name: 'matron-veil', inkPx: PART_INK_PX, mottle: 0.1, seed: 87 });
  head.add(veilPlates);
  const third = new Mesh(G.third(), tellMat);
  third.position.set(0, 0.08, 0.15);
  head.add(third);
  const tg = tellGlow(0.45, 0.3);
  tg.name = 'tell';
  tg.position.set(0, 0.08, 0.19);
  head.add(tg);
  for (const side of [-1, 1]) {
    const eye = new Mesh(G.eye(), peakM);
    eye.position.set(side * 0.06, -0.02, 0.15);
    eye.rotation.z = side * 0.3;
    head.add(eye);
  }
  const crownG = new Group();
  crownG.position.set(0, 0.12, -0.08);
  head.add(crownG);
  const spines = placeRow(G.spine(), crystal, 7, (i, m) => {
    const a = (i / 6 - 0.5) * 2.2;
    const s = 1 - Math.abs(i - 3) * 0.13;
    lay(m, Math.sin(a) * 0.06, 0, 0, Math.sin(a) * 0.9, Math.cos(a) * 0.9, -0.35, 1, s, 1, 0);
  }, { name: 'matron-spines', ink: false, mottle: 0 });
  crownG.add(spines);
  const crownGems = placeRow(G.gem(), crystal, 6, (i, m) => {
    const a = ((i + 0.5) / 6 - 0.5) * 2.2;
    lay(m, Math.sin(a) * 0.1, 0.04, -0.02, Math.sin(a), Math.cos(a), -0.3, 0.6, 0.6, 0.6, 0);
  }, { name: 'matron-crown-gems', ink: false, mottle: 0 });
  crownG.add(crownGems);
  const crownGlow = glow(VFX_MATTER.heartcrystal, 1.3, 0.2);
  crownGlow.position.y = 0.35;
  crownG.add(crownGlow);

  // --- The whips: ten faceted tapering segments off each shoulder, laid link
  // by link (an instanced row per whip, in torso space), lit beads along
  // them, a gem at each tip.
  const whips = [-1, 1].map((side, w) => {
    const segs = instancedPart(G.seg(), w ? flesh : dark, SEGS, { name: `matron-whip-${side > 0 ? 'r' : 'l'}`, inkPx: PART_INK_PX, moving: true });
    const beads = instancedPart(G.bead(), veinM, BEADS, { name: `matron-whip-beads-${side > 0 ? 'r' : 'l'}`, ink: false, moving: true });
    torso.add(segs, beads);
    const tip = new Group();
    torso.add(tip);
    mesh(G.gem(), crystal, tip, false);
    const tipGlow = glow(VEIN, 0.5, 0);
    tip.add(tipGlow);
    return { side, segs, beads, tip, tipGlow, sh: new Vector3(side * 0.42, 0.92, 0.02), pts: Array.from({ length: SEGS + 1 }, () => new Vector3()) };
  });

  // --- Ground: the contact shadow, a root child (never under the hit
  // overlay's node, so it stays on the floor).
  const shadow = groundShadow(0.95, 0.8);
  group.add(shadow);

  // --- Named points (B8) and the shared overlay's tuning (§6.1 item 9).
  const points = makePoints({
    tip: [whips[1].tip, 0, 0, 0],
    heart: [torso, 0, 0.62, 0.32],
    eye: [head, 0, 0.08, 0.19],
    crown: [crownG, 0, 0.35, 0],
  });
  const react = { squash: 1, flinch: 1, knock: 1, axis: 'y', midY: 1.6 };

  // --- Live state.
  const C = restChannels({});
  const spawn = createSpawnClock();
  let lastT = null;
  let lastX = 0;
  let lastZ = 0;
  let lastId = null;
  let idle = 0;
  let ab = null;
  let telKey = null;
  let telAge = 0;
  let teleSpan = 0.8;
  let from = { ...ZERO };
  let reach = LAB_LASH; // u, the lane the lash cracks down
  const lv = new Vector3();
  let leanF = 0;
  let leanS = 0;
  let glidePh = 0;
  let base = 0; // the lowest root tip this frame (yaw space)

  function reset() {
    lastT = null;
    ab = null;
    telKey = null;
    from = { ...ZERO };
    spawn.clear();
  }
  function begin(id) {
    from = { ...C, squash: 0, shove: 0, drink: 0 };
    ab = { id, t: 0 };
  }
  const strikeOf = (id) => MATRON_ABILITIES[id].startOf(id === 'lash' ? 'crack' : 'beat');

  // In game: the sim's warning IS the wind-up (B1), stretched over the
  // telegraph and ending one strike before it resolves, so the crack and
  // the beat land on the sim's tick. On a slow frame the strike may run
  // ahead of the resolve, but the contact holds until the warning is gone.
  function drive(dt, e) {
    const tel = e && e.telegraph ? e.telegraph : null;
    const move = tel ? tel.move : null;
    const id = move === 'vein_lash' ? 'lash' : move === 'heart_pulse' ? 'pulse' : null;
    const key = id ? `${move}:${tel.startTick}` : null;
    if (key && key !== telKey) {
      telKey = key;
      telAge = 0;
      const W = tel.resolveTick > tel.startTick ? (tel.resolveTick - tel.startTick) / 60 : 1;
      teleSpan = Math.max(0.05, W - STRIKE_SEC);
      if (id === 'lash') reach = tel.length ?? reach;
      begin(id);
    } else if (!key && telKey) {
      telKey = null;
      if (ab && ab.t < strikeOf(ab.id)) ab.t = strikeOf(ab.id);
    }
    if (!ab) return restChannels(C);
    const tl = MATRON_ABILITIES[ab.id];
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

  // A whip: a chain of SEGS points from the shoulder, each segment turned a
  // little from the last (coiling at rest, drawn back, cracked straight, raised,
  // flung). Laid in torso space.
  const _dir = new Vector3();
  const _up = new Vector3(0, 1, 0);
  function layWhip(W, { hang, back, out, raise, fling }) {
    const side = W.side;
    // the chain's root direction and its per-segment turn
    // rest: hanging down and a little out, coiling; back: up and behind the
    // shoulder; out: straight down the lane (+Z) at chest height; raise:
    // up and out wide; fling: out wide and down
    const len = out > 0.01 ? lerp(SEG, Math.min(0.8, (reach - 0.5) / SEGS), out) : SEG;
    let dx = side * 0.35 * hang + side * 0.9 * raise + side * 1.1 * fling - side * 0.3 * back;
    let dy = -1 * hang + 0.9 * back + 0.8 * raise - 0.35 * fling + 0.05 * out;
    let dz = 0.1 * hang - 0.9 * back + 0.2 * raise + 0.3 * fling + 1.0 * out;
    _dir.set(dx, dy, dz).normalize();
    W.pts[0].copy(W.sh);
    for (let i = 0; i < SEGS; i++) {
      // the coil at rest, a shiver as it is drawn, nothing cracked straight
      const coil = 0.22 * Math.sin(idle * 2.2 + i * 0.7 + side) * hang + 0.18 * Math.sin(idle * 10 + i) * back * 0.5;
      const droop = 0.12 * hang + 0.08 * fling + 0.03 * raise; // gravity's bend per segment
      // turn the direction: a droop about the side axis, the coil about the up axis
      _a.set(side, 0, 0);
      _dir.applyAxisAngle(_a, -droop * (i / SEGS)).applyAxisAngle(_up, coil * 0.3).normalize();
      W.pts[i + 1].copy(W.pts[i]).addScaledVector(_dir, len);
      lay(_m, W.pts[i].x, W.pts[i].y, W.pts[i].z, -_dir.x, -_dir.y, -_dir.z, 1 - i * 0.07, len / SEG, 1 - i * 0.07, 0);
      W.segs.setMatrixAt(i, _m);
    }
    W.segs.instanceMatrix.needsUpdate = true;
    for (let b = 0; b < BEADS; b++) {
      const i = b * 2 + 1;
      const p = W.pts[i];
      const s = 1 + 1.2 * C.drink * (0.5 + 0.5 * Math.sin(idle * 14 - b));
      _m.makeScale(s, s, s).setPosition(p.x, p.y, p.z + 0.04);
      W.beads.setMatrixAt(b, _m);
    }
    W.beads.instanceMatrix.needsUpdate = true;
    const end = W.pts[SEGS];
    W.tip.position.copy(end);
    W.tip.lookAt(_a.copy(end).add(_dir));
    W.tip.rotateX(Math.PI / 2);
    W.tipGlow.material.opacity = 0.6 * back + 0.9 * out + 0.4 * fling;
  }

  // Lay the glide, the roots, the body, the whips for this frame.
  function apply(dt, { rage = 0 }) {
    // the glide: she leans into her travel, the roots ripple with it
    const speed = Math.hypot(lv.x, lv.z);
    const sp = Math.min(1.6, speed / MATRON_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? Math.min(0.1, (lv.z / MATRON_WALK) * 0.06) : 0) - leanF) * k;
    leanS += ((sp > 0.05 ? (-lv.x / MATRON_WALK) * 0.04 : 0) - leanS) * k;
    glidePh += speed * dt * 2.6;
    const breathe = 0.03 * Math.sin(idle * 1.3);
    pivot.position.set(0, HIP_Y + breathe - 0.2 * C.sink + 0.12 * C.rootLift, -0.1 * C.shove);
    pivot.rotation.set(C.lean + leanF - 0.1 * C.shove, C.twist, leanS + 0.04 * Math.sin(glidePh * 0.7) * Math.min(1, sp));
    // the contact squash kept to a champion's size: +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    // the roots: planted on the floor, rippling with the travel; the pulse
    // lifts them and the beat slams them flat; the hips' sink spreads them
    skirt.position.y = ROOT_Y - 0.2 * C.sink + 0.12 * C.rootLift;
    base = 10;
    for (let i = 0; i < ROOTS; i++) {
      const R = roots[i];
      const ripple = 0.08 * Math.sin(idle * 2 + R.ph + glidePh * Math.min(1, sp));
      const lift = 0.45 * C.rootLift; // the pulse's heave tips the roots up off the floor
      const tiltUp = TILT_UP + 0.25 * C.sink + ripple * 0.5 + lift * 0.6;
      const tiltLow = TILT_LOW + 0.2 * C.sink + ripple * 0.3 + lift;
      R.up.rotation.x = tiltUp;
      R.low.rotation.x = tiltLow - tiltUp;
      // the knee and the tip in yaw space (a root hangs -Y, tilted about X)
      const kneeY = skirt.position.y - ROOT_UP * Math.cos(tiltUp);
      const kneeOut = ROOT_UP * Math.sin(tiltUp);
      const tipY = kneeY - ROOT_LOW * Math.cos(tiltLow);
      const tipOut = kneeOut + ROOT_LOW * Math.sin(tiltLow);
      base = Math.min(base, tipY);
      for (let v = 0; v < VEINS; v++) {
        const u = 0.3 + v * 0.3;
        const px = Math.sin(R.a) * (kneeOut + (tipOut - kneeOut) * u);
        const pz = Math.cos(R.a) * (kneeOut + (tipOut - kneeOut) * u);
        const py = kneeY + (tipY - kneeY) * u + 0.08;
        const s = 0.5 + 0.5 * C.drink * (0.5 + 0.5 * Math.sin(idle * 12 - v * 2 - i));
        lay(_m, px, py, pz, Math.sin(R.a) * 0.3, 1, Math.cos(R.a) * 0.3, 0.05 * s, 0.16 + 0.08 * hash01(i, v), 0.05, R.a);
        veins.setMatrixAt(i * VEINS + v, _m);
      }
      _m.makeScale(1, 1, 1).setPosition(Math.sin(R.a) * kneeOut, kneeY + 0.04, Math.cos(R.a) * kneeOut);
      knuckles.setMatrixAt(i, _m);
    }
    veins.instanceMatrix.needsUpdate = true;
    knuckles.instanceMatrix.needsUpdate = true;
    // the heart beats, racing raged, swelling to the pulse and the drink
    const hb = Math.pow(0.5 + 0.5 * Math.sin(idle * (rage ? 7.5 : 3.6)), 4);
    heart.scale.setScalar(1 + 0.18 * hb + 0.7 * C.heart + 0.4 * C.drink);
    heartGlow.material.opacity = Math.min(0.95, 0.3 + 0.2 * hb + 0.5 * C.heart + 0.5 * C.drink);
    heartGlow.scale.setScalar(1 + 0.8 * C.heart * C.squash);
    torso.rotation.set(-0.12 * C.heart * (1 - C.squash) + 0.03 * Math.sin(idle * 1.1), 0, 0);
    crownG.rotation.x = -0.5 * C.crown;
    crownGlow.material.opacity = 0.18 + 0.45 * C.crown + 0.3 * C.drink;
    head.rotation.set(0.1 * Math.sin(idle * 0.9) - 0.25 * C.crown + 0.15 * C.squash, -0.3 * C.twist, 0);
    tg.material.opacity = Math.min(0.85, 0.28 + 0.06 * Math.sin(idle * 2.2) + 0.35 * C.fever + (rage ? 0.22 + 0.12 * Math.sin(idle * 9) : 0));
    // the whips: the right lashes, both rise and fling on the pulse
    const hang = Math.max(0, 1 - C.back - C.out - C.raise - C.fling);
    layWhip(whips[1], { hang, back: C.back, out: C.out, raise: C.raise, fling: C.fling });
    layWhip(whips[0], { hang: Math.max(0, 1 - C.raise - C.fling), back: 0, out: 0, raise: C.raise, fling: C.fling });
  }

  return {
    group,
    mats,
    points,
    react,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    pose({ t, e = null, turntable = false }) {
      const id = e ? e.id : lastId;
      const moved = Math.hypot(group.position.x - lastX, group.position.z - lastZ);
      const born = lastT === null || t < lastT || (e && id !== lastId);
      const fresh = born || moved > 2.5;
      if (fresh) {
        reset();
        if (born && e && !turntable) spawn.restart(t);
      }
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      // the velocity for the lean (its own: it has no gait)
      if (dt > 0 && moved < 2.5) {
        lv.set((group.position.x - lastX) / dt, 0, (group.position.z - lastZ) / dt);
        yaw.updateWorldMatrix(true, false);
        lv.applyQuaternion(yaw.getWorldQuaternion(_q).invert());
      } else lv.set(0, 0, 0);
      lastX = group.position.x;
      lastZ = group.position.z;
      lastId = id;
      idle += dt;
      if (e || turntable) drive(dt, e);
      const g = turntable ? 1 : spawn.scale(t);
      grow.scale.setScalar(g);
      apply(dt, { rage: e && e.rage ? 1 : 0 });
    },
    lab: {
      abilities: MATRON_ABILITIES,
      reset,
      feet: () => [], // a glider: no feet (the planted base is the rule instead)
      base: () => base,
      reach: () => reach,
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      parts: { pivot, torso, head, skirt, roots, whips, crownG },
      pose({ dt, ability = null, abT = 0 }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, MATRON_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        const g = ability === 'spawn' ? spawnGrow(abT) : 1;
        grow.scale.setScalar(g);
        apply(dt, {});
      },
    },
  };
}
