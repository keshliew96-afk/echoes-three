// THE DROWNED HERON, MODEL STANDARD (docs/MODEL_STANDARD.md). The Sunken
// Mill's first boss rebuilt in the faceted look of Kesh's sample video, on top
// of the chibi ink style, keeping the classic's identity (render/boss/heron.js):
// the only VERTICAL boss, a gaunt slate wader on stilt legs with an S-neck, a
// spear of a bill with a violet vein down its ridge, violet weed trailing off
// its wings and the violet pool it stands in. What the standard adds:
//
//   * a mantle of feather plates in a brick pattern over the back, a fan of
//     tail feathers, breast plumes hanging off the neck's root, primaries and
//     coverts on each wing (the wings truly spread: they swing out to the
//     side and lift), a neck of feather rings laid over its S (the plates
//     follow the neck as it coils), a boxed skull, a two-part bill (the lower
//     half gapes), a crest of three plumes; two stilt legs on LOCKED FEET
//     (render/facet/legs.js), each joint bending back the way a heron's does,
//     three toes forward and one back;
//   * four ability timelines driven by the sim (sim/bosses/heron.js):
//       Bill Spear  coil (the 48-tick lane warning less one strike: the S
//                   draws tight over the back, the weight goes onto the back
//                   foot, the bill gapes), thrust (2.5 frames on the resolve:
//                   the B9 lunge, the neck straight down the lane), dash
//                   (held while the sim drives it down the lane at 11 u/s: a
//                   skim on spread wings, the legs trailed back, no foot on
//                   the floor), land (2.5 frames as the dash ends: both feet
//                   down, the lead foot ahead, the wings braking), held with a
//                   recoil, settle;
//       Wingbeat    raise (the 42-tick ring warning less one strike: up on its
//                   toes, the wings up and open over the back, the head
//                   back), beat (2.5 frames on the hit: the wings slam down
//                   and forward, the body drops), held with a recoil, settle;
//       Submerge    gather (1.5 frames: the sim gives no warning), plunge (2.5
//                   frames: nose down into the water), held, under (it sinks
//                   below the floor; only the violet ripple shows);
//       Surface     rise (the 48-tick ring warning less one strike: the bill
//                   breaks the water first, then the head and the neck),
//                   burst (2.5 frames on the hit: up out of the water with
//                   the wings flung wide), held with a recoil, settle;
//   * the [M] beats: a spawn-in grow, named points (the bill's root as
//     `mouth`, its point as `tip`, the chest, each foot), the shared hit
//     envelope (`react`).
//
// Same interface as the classic (group, mats, setYaw, setFlash, pose), plus
// `lab`, `points`, `react`. Faces +Z. Render only: it reads the sim entity
// (mode, telegraph, the dash's velocity) and never writes it.
import { CircleGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from 'three';
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
import { FRAME, GATHER_SEC, HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, lunge, makePoints, recoil, settle, spawnGrow } from '../facet/beats.js';

// --- Colour: the classic heron's (heron.js), no new hues.
const BODY = HIDE.mothWing.clone().lerp(new Color(PALETTE.warmGrey), 0.35).multiplyScalar(0.62);
const DARK = HIDE.boarDark.clone().lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.7);
const BILL = new Color(PALETTE.bone).lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.85);
const WING = BODY.clone().multiplyScalar(0.85);
// value steps of the classic's own colours, so the plates read as plates
const MANTLE = BODY.clone().multiplyScalar(1.12);
const QUILL = WING.clone().lerp(DARK, 0.5);
const flashable = (c) => facetMaterial(c, { emissive: '#FFFFFF', emissiveIntensity: 0 });

function glow(size, opacity) {
  const g = makeGlowSprite({ color: '#9B7BF0', size, opacity });
  g.material.toneMapped = false;
  return g;
}

// --- Body plan (yaw space, faces +Z); the body pivots between the hips.
const HIP_Y = 1.45;
// [hip x, home x, home z, gait group]
const LEGS = [
  [-0.2, -0.24, 0.04, 0],
  [0.2, 0.24, -0.04, 1],
];
// stilts: the legs reach well past the hips' height (the gait's forced lifts
// need a leg that is never stretched straight at rest or up on its toes)
const UPPER = 0.84;
const LOWER = 0.86;
const FOOT_H = 0.05;
// the neck: three segments from its root on the chest, then the head
const NECK_ROOT = [0, 1.9, 0.38];
const NECK_LEN = [0.28, 0.28, 0.3];
// the rest S (each segment's angle from upright toward +Z, relative to the
// body; the head's: + tips the bill down)
const REST_NECK = [0.35, -0.4, 0.05, 0];
export const HERON_WALK = 2.0; // u/s, HERON.moveSpeed
export const HERON_DASH = 11; // u/s, HERON.spear.dashSpeed
const COIL_SEC = 48 / 60 - STRIKE_SEC; // the spear lane's warning
const RAISE_SEC = 42 / 60 - STRIKE_SEC; // the wingbeat ring's
const RISE_SEC = 48 / 60 - STRIKE_SEC; // the surfacing ring's
const DASH_SEC = 0.4; // the lab's dash (the sim's runs for the lane's length)
const DASH_H = 0.42; // u, the skim off the water
const SINK_D = 2.7; // u, how far under it goes

export const HERON_ABILITIES = Object.freeze({
  spear: createTimeline('spear', 'Bill Spear', [
    { id: 'coil', label: 'coil', dur: COIL_SEC },
    { id: 'thrust', label: 'thrust', dur: STRIKE_SEC },
    { id: 'dash', label: 'dash', dur: DASH_SEC },
    { id: 'land', label: 'land', dur: STRIKE_SEC },
    { id: 'hold', label: 'braced', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: COIL_SEC, id: 'spear' }, { at: COIL_SEC + 2 * STRIKE_SEC + DASH_SEC, id: 'land' }] }),
  wingbeat: createTimeline('wingbeat', 'Wingbeat', [
    { id: 'raise', label: 'wings up', dur: RAISE_SEC },
    { id: 'beat', label: 'beat', dur: STRIKE_SEC },
    { id: 'hold', label: 'downstroke', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.55 },
  ], { cues: [{ at: RAISE_SEC, id: 'wingbeat' }] }),
  dive: createTimeline('dive', 'Submerge', [
    { id: 'gather', label: 'gather', dur: GATHER_SEC },
    { id: 'plunge', label: 'plunge', dur: STRIKE_SEC },
    { id: 'hold', label: 'splash', dur: HOLD_SEC },
    { id: 'under', label: 'under', dur: 0.6 },
  ], { cues: [{ at: GATHER_SEC + STRIKE_SEC, id: 'dive' }] }),
  surface: createTimeline('surface', 'Surface', [
    { id: 'rise', label: 'rise', dur: RISE_SEC },
    { id: 'burst', label: 'burst', dur: STRIKE_SEC },
    { id: 'hold', label: 'wings wide', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: RISE_SEC, id: 'surface' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (0 at rest):
//   rise   u up on the toes          dip    u the body drops
//   pitch  body pitch, + nose down   reach  u the body moves forward
//   n0..n2 the neck's segment angles off the rest S (+ forward)
//   head   the head's pitch off rest (+ bill down)   gape 0..1 the bill opens
//   spread 0..1 the wings swing out  lift   the wings' lift (+ up, - down)
//   air    0..1 off the floor        tuck   0..1 the legs trailed back
//   sink   0..1 under the water      squash 0..1 contact squash
//   shove  0..1 the recoil off a hit (B3)
//   crest  the plumes' raise         tail   the tail's lift
//   lead   0..1 the left foot ahead, the right behind   wide 0..1 a wide stance
const KEYS = ['rise', 'dip', 'pitch', 'reach', 'n0', 'n1', 'n2', 'head', 'gape', 'spread', 'lift', 'air', 'tuck', 'sink', 'squash', 'shove', 'crest', 'tail', 'lead', 'wide'];
const restChannels = (C) => {
  for (const k of KEYS) C[k] = 0;
  return C;
};
const ZERO = restChannels({});
// a pose, its neck given as absolute angles [A0, A1, A2, H]
const pose = (o, neck = REST_NECK) => ({ ...ZERO, n0: neck[0] - REST_NECK[0], n1: neck[1] - REST_NECK[1], n2: neck[2] - REST_NECK[2], head: neck[3] - REST_NECK[3], ...o });
const COILED = pose({ dip: 0.12, pitch: -0.12, gape: 0.35, spread: 0.3, lift: 0.35, crest: 1, tail: 0.3, lead: 1 }, [-0.15, -0.9, 0.2, 0.2]);
const THRUST = pose({ dip: 0.05, gape: 0, spread: 0.45, lift: 0.25, crest: -0.4, tail: 0.15, lead: 1 }, [1.0, 1.3, 1.4, 0.15]);
const DASHED = pose({ spread: 1, lift: 0.1, air: 1, tuck: 1, crest: -0.5, tail: 0.25 }, [1.15, 1.4, 1.5, 0.1]);
const LANDED = pose({ dip: 0.22, pitch: 0.1, reach: 0.15, spread: 0.75, lift: 0.45, squash: 1, lead: 1.2, crest: 0.2 }, [0.7, 0.6, 0.8, 0.3]);
const RAISED = pose({ rise: 0.12, pitch: -0.2, spread: 0.9, lift: 1.15, gape: 0.45, crest: 1, tail: 0.5, wide: 1 }, [0.05, -0.75, -0.35, -0.35]);
const BEATEN = pose({ dip: 0.28, pitch: 0.18, spread: 1, lift: -0.4, gape: 0.8, crest: 0.6, squash: 1, wide: 1 }, [0.6, 0, 0.4, 0.2]);
const GATHERED = pose({ rise: 0.06, spread: 0.2, lift: 0.2 }, [0.2, -0.6, -0.1, -0.2]);
const PLUNGED = pose({ pitch: 0.55, spread: 0.3, lift: -0.2, squash: 0.5, sink: 0.3 }, [1.1, 1.9, 2.1, 1.2]);
const RISEN = pose({ pitch: -0.25, sink: 1 }, [-0.1, -0.3, -0.3, -0.7]);
const BROKE = pose({ pitch: -0.2, sink: 0.25, spread: 0.15, lift: 0.3, crest: 0.6 }, [0.0, -0.5, -0.3, -0.45]);
const BURST = pose({ rise: 0.1, pitch: -0.12, spread: 1, lift: 0.9, crest: 1, tail: 0.6, gape: 0.6, squash: 1, wide: 1 }, [0.1, -0.55, -0.15, -0.25]);
const mix = (C, A, B, k) => {
  for (const key of KEYS) C[key] = A[key] + (B[key] - A[key]) * k;
  return C;
};

// `from` is the pose an ability starts out of (rest in the lab; in a fight
// whatever the bird was doing): every wind-up grows out of it (B1/B5).
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'spear') {
    // B9: pulled back through the coil, driven past rest on the thrust
    if (s.id === 'coil') {
      mix(C, from, COILED, ease.inOut(Math.min(1, k * 1.5)));
      const L = lunge('pull', k);
      C.reach += L.reach * 0.65; // body widths to u
      C.pitch += L.lean * 0.7;
    } else if (s.id === 'thrust') {
      mix(C, COILED, THRUST, kick(k));
      const L = lunge('drive', k);
      C.reach = L.reach * 0.65;
      C.pitch += L.lean * 0.7;
      C.squash = (L.sx - 1) / 0.19;
    } else if (s.id === 'dash') {
      // off the floor within 2 frames of the thrust, the bill held down the lane
      const L = lunge('hold', 1);
      mix(C, THRUST, DASHED, ease.out(Math.min(1, (k * DASH_SEC) / (2 * FRAME))));
      C.reach = L.reach * 0.65;
      C.pitch += L.lean * 0.7 * (1 - 0.4 * Math.min(1, k * 3));
    } else if (s.id === 'land') {
      const dashed = { ...DASHED, reach: 0.88 * 0.65, pitch: DASHED.pitch + 0.39 * 0.7 * 0.6 };
      mix(C, dashed, LANDED, kick(k));
    } else if (s.id === 'hold') {
      mix(C, LANDED, LANDED, 0);
      C.shove = recoil(k * HOLD_SEC); // B3: the landing shoves it back
    } else {
      mix(C, ZERO, LANDED, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.5);
    }
  } else if (id === 'wingbeat') {
    if (s.id === 'raise') mix(C, from, RAISED, ease.inOut(Math.min(1, k * 1.4)));
    else if (s.id === 'beat') mix(C, RAISED, BEATEN, kick(k));
    else if (s.id === 'hold') {
      mix(C, BEATEN, BEATEN, 0);
      C.shove = recoil(k * HOLD_SEC);
    } else {
      mix(C, ZERO, BEATEN, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.55);
    }
  } else if (id === 'dive') {
    if (s.id === 'gather') mix(C, from, GATHERED, ease.out(k));
    else if (s.id === 'plunge') mix(C, GATHERED, PLUNGED, kick(k));
    else if (s.id === 'hold') mix(C, PLUNGED, PLUNGED, 0);
    else {
      mix(C, PLUNGED, PLUNGED, 0);
      C.sink = 0.3 + 0.7 * ease.in(k);
    }
  } else if (id === 'surface') {
    if (s.id === 'rise') mix(C, RISEN, BROKE, ease.inOut(k));
    else if (s.id === 'burst') mix(C, BROKE, BURST, kick(k));
    else if (s.id === 'hold') {
      mix(C, BURST, BURST, 0);
      C.shove = recoil(k * HOLD_SEC); // B3: the burst shoves it back
    } else {
      mix(C, ZERO, BURST, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.6);
    }
  }
  return C;
}

// --- Geometry.
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:heron-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  core: () => geo('core', () => new IcosahedronGeometry(0.42, 1), 301),
  neckSeg: () => geo('neck', () => new CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0), 303),
  skull: () => geo('skull', () => taperBox(0.24, 0.22, 0.32, 0.72, 0.7, 0.02), 305),
  bill: () => geo('bill', () => taperBox(0.14, 0.08, 0.92, 0.06, 0.3, 0.03).translate(0, 0, 0.46), 307, 0.06),
  jaw: () => geo('jaw', () => taperBox(0.12, 0.05, 0.84, 0.08, 0.4, -0.01).translate(0, 0, 0.42), 309, 0.06),
  // a broad flat wing (thin across, deep in the chord), its tip at -Z
  wing: () => geo('wing', () => taperBox(0.06, 0.5, 1.15, 0.5, 0.5, 0.1).translate(0, 0, 0.57).rotateY(Math.PI), 311),
  upper: () => geo('upper', () => limbBox(0.1, 0.1, UPPER, 0.6, 0.6), 313),
  lower: () => geo('lower', () => limbBox(0.07, 0.07, LOWER, 0.75, 0.75), 315),
  knot: () => geo('knot', () => new IcosahedronGeometry(0.06, 0), 317),
};

const _m = new Matrix4();
const _a = new Vector3();
const _p = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
// a heron's leg folds back at its visible joint
const POLE = new Vector3(0, 0.05, -1);

export function buildHeronFacet() {
  const group = new Group();
  group.name = 'boss-heron';
  group.userData.modelStandard = true;
  const yaw = new Group();
  group.add(yaw);
  const grow = new Group();
  yaw.add(grow);
  // sinks under the floor while submerged (the legs with it)
  const sinkG = new Group();
  grow.add(sinkG);
  const pivot = new Group();
  pivot.position.set(0, HIP_Y, 0);
  sinkG.add(pivot);
  const body = new Group();
  body.position.set(0, -HIP_Y, 0);
  pivot.add(body);
  const squashG = new Group();
  squashG.position.set(0, 1.62, -0.1);
  body.add(squashG);
  const torso = new Group();
  torso.position.set(0, -1.62, 0.1);
  squashG.add(torso);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const bodyMat = track(flashable(BODY));
  const darkMat = track(flashable(DARK));
  const billMat = track(flashable(BILL));
  const wingMat = track(flashable(WING));
  const mantleMat = track(flashable(MANTLE));
  const quillMat = track(flashable(QUILL));
  const tell = new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- Body: a long tilted teardrop under a mantle of feather plates.
  const core = mesh(G.core(), bodyMat, torso);
  core.scale.set(0.9, 0.75, 1.45);
  core.position.set(0, 1.62, -0.1);
  core.rotation.x = -0.25;
  const back = createSpine(5);
  [[0, 1.86, 0.36], [0, 1.88, 0.06], [0, 1.8, -0.24], [0, 1.68, -0.52], [0, 1.52, -0.8]].forEach(([x, y, z], i) => back.pts[i].set(x, y, z));
  const mantle = createPlateTube({ spine: back, rings: 6, around: 7, arc: Math.PI * 1.05, u0: 0.04, u1: 0.98, radius: (u) => 0.27 - 0.1 * u, plateMat: mantleMat, tilt: 0.5, thick: 0.035, name: 'heron-mantle' });
  mantle.update();
  mantle.plates.position.set(0, -0.08, 0);
  torso.add(mantle.plates);
  // the tail: a fan of dark quills
  const tail = new Group();
  tail.position.set(0, 1.52, -0.72);
  torso.add(tail);
  tail.add(placeRow(wedge, quillMat, 7, (i, m) => {
    const a = (i - 3) * 0.16;
    lay(m, Math.sin(a) * 0.08, 0, 0, Math.sin(a) * 0.6, -0.35, -1, 0.16, 0.62 - Math.abs(i - 3) * 0.05, 0.4, a);
  }, { name: 'heron-tail', inkPx: PART_INK_PX, mottle: 0.12, seed: 51 }));
  // breast plumes hanging off the neck's root
  torso.add(placeRow(wedge, mantleMat, 6, (i, m) => {
    const x = (i - 2.5) * 0.06;
    lay(m, x, 1.86, 0.44 - Math.abs(i - 2.5) * 0.02, x * 0.6, -1, 0.35, 0.12, 0.42 + 0.06 * (i % 2), 0.4);
  }, { name: 'heron-plumes', inkPx: PART_INK_PX, mottle: 0.16, seed: 53 }));

  // --- Wings: folded along the flank (a blade standing on edge); spread,
  // each rolls flat about its own length, swings out from the shoulder and
  // lifts (three nested turns). Primaries and coverts ride the blade.
  const wings = [];
  const weeds = [];
  for (const side of [-1, 1]) {
    const liftG = new Group();
    liftG.position.set(side * 0.32, 1.8, 0.08);
    torso.add(liftG);
    const swingG = new Group();
    liftG.add(swingG);
    const pivotW = new Group();
    swingG.add(pivotW);
    const blade = mesh(G.wing(), wingMat, pivotW);
    blade.position.set(side * 0.04, -0.16, 0.05);
    blade.rotation.x = 0.12;
    // the trailing edge: secondaries all along it (down the flank folded,
    // back off the edge spread), primaries fanned at the tip
    pivotW.add(placeRow(wedge, quillMat, 8, (i, m) => {
      const z = -0.05 - i * 0.12;
      lay(m, side * 0.05, -0.4 + 0.012 * i, z, 0, -1, -0.45 - 0.08 * i, 0.2, 0.3 + 0.012 * i, 0.3, Math.PI / 2);
    }, { name: 'heron-secondaries', inkPx: PART_INK_PX, mottle: 0.14, seed: 55 + side }));
    pivotW.add(placeRow(wedge, quillMat, 5, (i, m) => {
      const z = -0.95 - i * 0.07;
      lay(m, side * 0.05, -0.26 + 0.035 * i, z, 0, -0.6 + 0.12 * i, -1, 0.16, 0.5 + 0.04 * i, 0.3, Math.PI / 2);
    }, { name: 'heron-primaries', inkPx: PART_INK_PX, mottle: 0.14, seed: 57 + side }));
    pivotW.add(placeRow(wedge, wingMat, 5, (i, m) => {
      const z = -0.12 - i * 0.16;
      lay(m, side * 0.06, -0.02 - 0.03 * i, z, 0, -0.35, -1, 0.18, 0.3, 0.35, Math.PI / 2);
    }, { name: 'heron-coverts', inkPx: PART_INK_PX, mottle: 0.12, seed: 59 + side }));
    // violet weed trailing off the wing
    for (const [dz, len] of [[-0.75, 0.7], [-1.05, 0.55]]) {
      const w = new Group();
      w.position.set(side * 0.08, -0.12, dz);
      pivotW.add(w);
      const strand = new Mesh(sharedGeo('facet:heron-weed', () => new CylinderGeometry(0.018, 0.006, 1, 4).translate(0, -0.5, 0)), tell);
      strand.scale.y = len;
      w.add(strand);
      weeds.push({ w, phase: weeds.length * 1.3 });
    }
    wings.push({ lift: liftG, swing: swingG, roll: pivotW, side });
  }

  // --- Neck: three faceted segments laid along the S each frame, feather
  // rings over them on a spine through the joints.
  const neckCore = instancedPart(G.neckSeg(), bodyMat, 3, { name: 'heron-neck', moving: true });
  torso.add(neckCore);
  const neckSpine = createSpine(5);
  const neckTube = createPlateTube({ spine: neckSpine, rings: 8, around: 6, arc: Math.PI * 1.8, u0: 0.03, u1: 0.95, radius: (u) => 0.104 - 0.022 * u, plateMat: bodyMat, tilt: 0.12, thick: 0.025, name: 'heron-neck-feathers' });
  torso.add(neckTube.plates);
  const head = new Group();
  torso.add(head);
  mesh(G.skull(), bodyMat, head).position.set(0, 0.0, 0.0);
  const billUp = mesh(G.bill(), billMat, head);
  billUp.position.set(0, 0.0, 0.12);
  const jaw = new Group();
  jaw.position.set(0, -0.045, 0.12);
  head.add(jaw);
  mesh(G.jaw(), billMat, jaw).position.set(0, -0.01, 0);
  // the identity: the violet vein along the bill's ridge
  const vein = new Mesh(sharedGeo('facet:heron-vein', () => new CylinderGeometry(0.012, 0.004, 0.86, 4).rotateX(Math.PI / 2)), tell);
  vein.position.set(0, 0.045, 0.56);
  head.add(vein);
  const crest = placeRow(wedge, darkMat, 3, (i, m) => {
    lay(m, (i - 1) * 0.03, 0.08, -0.08, (i - 1) * 0.15, 0.35, -1, 0.07, 0.42 + 0.08 * (i === 1 ? 1 : 0), 0.4);
  }, { name: 'heron-crest', inkPx: PART_INK_PX, mottle: 0.1, seed: 61 });
  const crestG = new Group();
  crestG.add(crest);
  head.add(crestG);
  const eyeMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal), toneMapped: false });
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new Mesh(sharedGeo('facet:heron-eye', () => new IcosahedronGeometry(0.03, 0)), eyeMat);
    eye.position.set(side * 0.1, 0.04, 0.08);
    head.add(eye);
    const g = glow(0.24, 0.6);
    g.position.set(side * 0.1, 0.04, 0.08);
    head.add(g);
    eyes.push(g);
  }
  const tipGlow = glow(0.5, 0.4);
  tipGlow.position.set(0, -0.02, 1.08);
  head.add(tipGlow);
  const coreGlow = glow(1.6, 0.32);
  coreGlow.position.set(0, 1.62, 0);
  torso.add(coreGlow);

  // --- Stilt legs on locked feet: three toes forward, one back, a knot at
  // the joint.
  const legs = LEGS.map(([hx, fx, fz, grp], i) => {
    const upper = new Group();
    mesh(G.upper(), darkMat, upper);
    const lower = new Group();
    mesh(G.lower(), darkMat, lower);
    const foot = new Group();
    foot.add(placeRow(wedge, darkMat, 4, (j, m) => {
      const back = j === 3;
      const a = back ? Math.PI : (j - 1) * 0.42;
      lay(m, 0, 0.012, 0, Math.sin(a), 0, Math.cos(a), 0.08, back ? 0.16 : 0.26, 0.25, Math.PI / 2);
    }, { name: 'heron-toes', inkPx: PART_INK_PX, mottle: 0 }));
    sinkG.add(upper, lower, foot);
    return { i, hipLocal: new Vector3(hx, HIP_Y, -0.02), home: [fx, fz], group: grp, upper, lower, foot, a: UPPER, b: LOWER, pole: POLE, footH: FOOT_H, hip: null };
  });
  const knots = instancedPart(G.knot(), darkMat, legs.length, { name: 'heron-knots', moving: true });
  sinkG.add(knots);

  // --- Floor pieces (beside the envelope's node): the shadow, the violet
  // pool it wades in and the ripple ring that is all that shows while under.
  const shadow = groundShadow(0.9, 0.42, { wide: 1.1, deep: 1.3 });
  group.add(shadow);
  const pool = new Mesh(sharedGeo('facet:heron-pool', () => new CircleGeometry(1.25, 32)), new MeshBasicMaterial({ color: '#4B3A86', transparent: true, opacity: 0.32, depthWrite: false }));
  pool.name = 'heron-pool';
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.012;
  group.add(pool);
  const ripple = new Mesh(sharedGeo('facet:heron-ripple', () => new RingGeometry(0.85, 1.0, 40)), new MeshBasicMaterial({ color: TELL_VIOLET, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  ripple.name = 'heron-ripple';
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = 0.02;
  group.add(ripple);

  // --- Points (B8) and the hit envelope's tuning.
  const points = makePoints({
    mouth: [head, 0, -0.02, 0.18],
    tip: [head, 0, -0.02, 1.06],
    chest: [torso, 0, 1.7, 0.4],
  });
  const FOOT_NAMES = ['footL', 'footR'];
  const footPts = legs.map((L) => {
    const p = makePoints({ [FOOT_NAMES[L.i]]: [sinkG, 0, 0, 0] })[FOOT_NAMES[L.i]];
    points[FOOT_NAMES[L.i]] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 0, axis: 'y', midY: 1.5 };

  // --- Locked feet.
  body.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(body.matrix).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.36, lift: 0.3, minDur: 0.12, maxDur: 0.3, durPerSpeed: 0.04, lead: 0.6, flight: 5 } });
  const { gait } = legRig;
  const C = restChannels({});
  // the lead puts the left foot ahead and the right behind (the coil's
  // weight on the back foot, the landing's brace); `wide` sets them apart
  const stance = (i, out) => {
    const left = i === 0;
    out.z += (left ? 0.22 : -0.16) * C.lead;
    out.x += (left ? -0.08 : 0.08) * C.wide;
    return out;
  };
  // the dash: the legs trail back under the tail, drawn up
  const tuck = (i, out) => {
    hipOf(legs[i], out);
    out.y -= 0.4;
    out.z -= 1.35;
    out.x *= 0.7;
    return out;
  };

  // --- The neck, laid analytically along its S each frame (torso space).
  const A = [0, 0, 0];
  function layNeck(bob) {
    A[0] = REST_NECK[0] + C.n0 + bob;
    A[1] = REST_NECK[1] + C.n1;
    A[2] = REST_NECK[2] + C.n2;
    _p[0].set(...NECK_ROOT);
    for (let i = 0; i < 3; i++) {
      _p[i + 1].set(0, _p[i].y + Math.cos(A[i]) * NECK_LEN[i], _p[i].z + Math.sin(A[i]) * NECK_LEN[i]);
      lay(_m, 0, _p[i].y, _p[i].z, 0, Math.cos(A[i]), Math.sin(A[i]), 0.19 - 0.02 * i, NECK_LEN[i] + 0.04, 0.19 - 0.02 * i);
      neckCore.setMatrixAt(i, _m);
    }
    neckCore.instanceMatrix.needsUpdate = true;
    neckSpine.pts[0].copy(_p[0]);
    neckSpine.pts[1].lerpVectors(_p[0], _p[1], 0.9);
    neckSpine.pts[2].lerpVectors(_p[1], _p[2], 0.9);
    neckSpine.pts[3].copy(_p[3]);
    neckSpine.pts[4].set(0, _p[3].y - Math.sin(REST_NECK[3] + C.head) * 0.12, _p[3].z + Math.cos(REST_NECK[3] + C.head) * 0.12);
    neckTube.update();
    head.position.copy(_p[3]);
    head.rotation.set(REST_NECK[3] + C.head, 0, 0);
  }

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
  // a warning is known by its attack and start tick, never by object: a
  // co-op guest's snapshots hand the rig a fresh copy every few ticks
  let telKey = null;
  let telAge = 0;
  let lastMode = 'stalk';
  let under = false;
  let replantPending = false;
  // the facing: the sim's (setYaw), or square to the spear's lane
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
    under = false;
    laneYaw = null;
    shownYaw = null;
    spawn.clear();
  }
  const begin = (id, t = 0) => {
    from = { ...C, air: 0, tuck: 0, squash: 0, shove: 0, sink: 0 };
    ab = { id, t };
  };

  // In game: each warning is its wind-up, stretched to the sim's ticks so the
  // strike lands on the resolve; the dash and the dive follow the sim's modes.
  function drive(dt, e) {
    const T = e && e.telegraph ? e.telegraph : null;
    const mode = e ? e.mode || 'stalk' : 'stalk';
    const key = T ? `${T.attack}:${T.startTick}` : null;
    if (key && key !== telKey) {
      telAge = 0;
      const id = T.attack === 'spear' ? 'spear' : T.attack === 'wingbeat' ? 'wingbeat' : T.attack === 'surface' ? 'surface' : null;
      if (id) begin(id);
    }
    telKey = key;
    tel = T;
    if (tel) telAge += dt;
    if (T && T.attack === 'spear' && Number.isFinite(T.dirX)) laneYaw = Math.atan2(T.dirX, T.dirZ);
    else if (mode === 'dash' && e && (e.dashVx || e.dashVz)) laneYaw = Math.atan2(e.dashVx, e.dashVz);
    else laneYaw = null;
    const SP = HERON_ABILITIES.spear;
    if (mode !== lastMode) {
      if (mode === 'submerged') begin('dive');
      else if (mode === 'dash') {
        if (!ab || ab.id !== 'spear') begin('spear', SP.startOf('dash'));
        else ab.t = Math.max(ab.t, SP.startOf('dash'));
      } else if (lastMode === 'dash' && ab && ab.id === 'spear') ab.t = Math.max(ab.t, SP.startOf('land'));
    }
    lastMode = mode;
    // posed afresh while it is under (a guest joining mid-dive)
    under = mode === 'submerged' || (mode === 'surfacing' && !(ab && ab.id === 'surface'));
    if (ab) {
      const tl = HERON_ABILITIES[ab.id];
      if (ab.id === 'dive') {
        ab.t += dt;
        if (mode === 'submerged') ab.t = Math.min(tl.duration - 1e-4, ab.t);
      } else {
        const windEnd = tl.startOf(tl.phases[1].id);
        if (tel && ab.t < windEnd) {
          const span = Math.max(0.05, (tel.resolveTick - tel.startTick) / 60 - STRIKE_SEC);
          ab.t = telAge < span ? Math.min(windEnd - 1e-4, (windEnd * telAge) / span) : windEnd;
        } else ab.t = Math.max(ab.t, windEnd) + dt;
        if (ab.id === 'spear' && mode === 'dash') ab.t = Math.min(SP.startOf('land') - 1e-4, ab.t);
      }
      if (ab.t >= tl.duration) ab = null;
    }
    if (ab) abilityChannels(ab.id, HERON_ABILITIES[ab.id].sample(ab.t), C, from);
    else restChannels(C);
    if (under && !(ab && ab.id === 'dive')) C.sink = 1;
    return C;
  }
  // a held contact: the blow taken on planted feet
  function holding() {
    if (!ab) return false;
    const ph = HERON_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'beat' || ph === 'hold' || ph === 'plunge' || (ab.id === 'spear' && ph === 'land');
  }

  function apply(dt, { locked, hpFrac, hold = false, airborne = false }) {
    gait.localVelocity(yaw, lv);
    const sp = Math.min(3, Math.hypot(lv.x, lv.z) / HERON_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 && C.air < 0.02 ? Math.min(0.1, (lv.z / HERON_WALK) * 0.05) : 0) - leanF) * k;
    const bobY = 0.04 * gait.bob * Math.min(1, sp);
    const breathe = 0.02 * Math.sin(idle * 1.4);
    pivot.position.set(0, HIP_Y + breathe + bobY + C.rise - C.dip + DASH_H * C.air, C.reach - 0.1 * C.shove);
    pivot.rotation.set(C.pitch + leanF, 0, 0);
    sinkG.position.y = -SINK_D * C.sink;
    sinkG.visible = C.sink < 0.97;
    // the contact squash kept to a boss's size (Kesh's pick over B9's full
    // +19% / -9%): +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    // a wader's head pumps with its steps
    layNeck(0.07 * gait.bob * Math.min(1, sp) + 0.03 * Math.sin(idle * 2.3));
    jaw.rotation.x = 0.32 * C.gape;
    crestG.rotation.x = -0.35 * C.crest;
    tail.rotation.x = -0.35 * C.tail;
    for (const W of wings) {
      const s = W.side;
      W.roll.rotation.set(0.04 * Math.sin(idle * 1.8) * (1 - C.spread), 0, -s * 1.45 * C.spread);
      W.swing.rotation.set(0.1 * C.spread, -s * 1.3 * C.spread, 0);
      W.lift.rotation.set(0, 0, s * (0.06 + C.lift * (0.25 + 0.75 * C.spread)));
    }
    for (const w of weeds) w.w.rotation.set(0.35 + 0.25 * C.air + 0.12 * Math.sin(idle * 2.2 + w.phase), 0, 0.1 * Math.sin(idle * 1.7 + w.phase));
    pivot.updateMatrix();

    legRig.update(dt, { space: yaw, stance, locked, air: Math.max(C.air, airborne ? 0.05 : 0), tuck: C.tuck > 0 ? tuck : null, hold });
    for (const L of legs) {
      const S = legRig.state[L.i];
      // the toes curl as a foot lifts, and lie flat when it is down
      L.foot.rotation.set(0.6 * S.up, 0, 0);
      footPts[L.i].position.copy(L.foot.position);
      knots.setMatrixAt(L.i, _m.makeTranslation(S.knee.x, S.knee.y, S.knee.z));
    }
    knots.instanceMatrix.needsUpdate = true;

    const fever = 0.7 + 0.15 * Math.sin(idle * 2.6) + 0.4 * C.crest + (1 - hpFrac) * 0.3;
    for (const g of eyes) g.material.opacity = Math.min(0.9, 0.5 * fever);
    tipGlow.material.opacity = Math.min(0.8, 0.25 + 0.45 * Math.max(0, C.gape) + 0.3 * C.air);
    coreGlow.material.opacity = Math.min(0.5, 0.24 * fever) * (1 - C.sink);
    pool.material.opacity = 0.28 + 0.06 * Math.sin(idle * 1.7) + 0.12 * C.sink;
    ripple.material.opacity = Math.min(1, C.sink * 1.4) * (0.45 + 0.25 * Math.sin(idle * 4));
    const rs = 1 + 0.25 * ((idle * 0.8) % 1);
    ripple.scale.set(rs, rs, 1);
    shadow.visible = C.sink < 0.5;
    shadow.scale.set(1 - 0.3 * C.air, 1 - 0.3 * C.air, 1);
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
      // glide under the water, a hitch mid-dash) only re-plants the feet
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
      // the facing eases to the lane while it coils and dashes down it, and
      // back to the sim's facing after (never a snap)
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
      apply(dt, { locked: !turntable && g === 1 && !!e && C.sink < 0.02, hpFrac, hold: holding(), airborne: !!e && e.mode === 'dash' });
    },
    lab: {
      abilities: HERON_ABILITIES,
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
      pose({ dt, ability = null, abT = 0, hpFrac = 1, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, HERON_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        const g = ability === 'spawn' ? spawnGrow(abT) : 1;
        grow.scale.setScalar(g);
        if (replantPending) {
          replantPending = false;
          gait.reset(yaw, stance);
        }
        apply(dt, { locked: !rigid && g === 1 && C.sink < 0.02, hpFrac });
      },
    },
  };
}
