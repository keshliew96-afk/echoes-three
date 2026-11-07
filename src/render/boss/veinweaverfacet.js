// THE VEIN WEAVER, MODEL STANDARD (docs/MODEL_STANDARD.md). The Hollow
// Heart's third boss rebuilt in the faceted look of Kesh's sample video, on
// top of the chibi ink style, keeping the classic's identity (render/boss/
// third.js): the Heart's own spider, bruised-plum flesh and legs, a cut-
// crystal abdomen whose veins light on every heartbeat, a cluster of violet
// eyes and bone fangs. What the standard adds:
//
//   * a saddle of flesh plates over the thorax, the abdomen a great faceted
//     crystal with its five veins laid as lit slivers, seven crystal shards
//     grown out of its back and three spinnerets at its tip, the six eyes as
//     faceted gems under a brow plate, two hooked fangs on dark bases, a
//     crystal cap on every knee and a crystal tip on every foot;
//   * EIGHT LEGS ON LOCKED FEET (render/facet/legs.js): each foot pinned to
//     the floor while it carries weight, the legs stepping in two sets of
//     four (an alternating tetrapod), every knee bent high above the body the
//     way a spider's is; a leg lifted for a pose comes off the floor and
//     lands where the pose says;
//   * three ability timelines driven by the sim (sim/bosses/veinweaver.js):
//       Bind           spin (the 44-tick lane warning less one strike: the
//                      abdomen tipped up, the spinnerets lit, the front legs
//                      raised, the body drawn back off the lane), cast (2.5
//                      frames on the hit: the front legs whipped down ahead,
//                      the thread shot from the spinnerets over the head and
//                      down the lane to its end, the B9 lunge), held with a
//                      recoil, draw (the thread reeled in; while a hero is on
//                      a thread it stays taut and the spinnerets burn), settle;
//       Heartbeat Slam rear (the 60-tick ring warning less one strike: the
//                      body reared up and back on the hind legs, the front
//                      four raised), slam (2.5 frames on the hit: the body
//                      dropped flat, every foot planted wide, the squash),
//                      held with a recoil, settle;
//       Brood Sacs     unwarned in the sim: the rig reads the next brood tick
//                      ahead, so over the last 30 ticks the abdomen swells and
//                      lifts (load); on the throw heave (1.5 frames, B1's most
//                      for an unwarned move), lob (2.5 frames: the abdomen
//                      flicked up, the body dipped, the sacs leave), held
//                      with a recoil, settle;
//     and the rage (`enraged`): the veins burn, the heart beats faster;
//   * the [M] beats: a spawn-in grow, named points (mouth, chest, the
//     thread's `tip`, the spinneret, each foot), the shared hit envelope
//     (`react`).
//
// Same interface as the classic (group, mats, setYaw, setFlash, pose), plus
// `lab`, `points`, `react`. Faces +Z. Render only: it reads the sim entity
// (mode, telegraph, enraged, binds, nextBroodTick) and never writes it.
import { BoxGeometry, Color, ConeGeometry, Euler, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { HEART } from '../enemies/style.js';
import { facetize, facetMaterial, hash01 } from '../facet/material.js';
import { PART_INK_PX, createPlateTube, createSpine, instancedPart, placeRow, wedgeGeometry } from '../facet/kit.js';
import { createTimeline, ease } from '../facet/timeline.js';
import { lay, limbBox } from '../facet/shapes.js';
import { createLegs } from '../facet/legs.js';
import { hornGeometry } from '../facet/foe.js';
import { GATHER_SEC, HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, lunge, makePoints, recoil, settle, spawnGrow } from '../facet/beats.js';

// --- Colour: the classic Weaver's (third.js), no new hues.
const FLESH = HEART.flesh.clone();
const FLESH_DARK = HEART.fleshDark.clone();
const FLESH_LIGHT = FLESH.clone().multiplyScalar(1.22); // a value step: the saddle's plates
const CRYSTAL = HEART.crystal.clone().multiplyScalar(0.8);
const BONE = HEART.bone.clone();
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

// --- Body plan (yaw space, faces +Z): slung low between high knees.
const BODY_Y = 0.92;
const UP_LEN = 1.15;
const LOW_LEN = 1.45;
const TIP_H = 0.14; // the crystal tip under the shin's end
// [row i, hip z (body space), home x, home z] for the four pairs
const PAIRS = [
  [0, 0.65, 1.25, 1.55],
  [1, 0.37, 1.65, 0.6],
  [2, 0.09, 1.65, -0.45],
  [3, -0.19, 1.3, -1.45],
];
export const WEAVER_WALK = 1.25; // u/s, VEINWEAVER.moveSpeed
const SPIN_SEC = 44 / 60 - STRIKE_SEC; // the bind lane's warning
const REAR_SEC = 60 / 60 - STRIKE_SEC; // the slam ring's warning
const LOAD_TICKS = 30; // the brood's read-ahead
const LOAD_SEC = 0.5; // the lab's load
const DRAW_SEC = 0.45; // the thread reeled in
const LAB_THREAD = 5; // u, the lab's lane
const THREAD_SEGS = 14;

export const WEAVER_ABILITIES = Object.freeze({
  bind: createTimeline('bind', 'Bind', [
    { id: 'spin', label: 'spin', dur: SPIN_SEC },
    { id: 'cast', label: 'cast', dur: STRIKE_SEC },
    { id: 'hold', label: 'struck', dur: HOLD_SEC },
    { id: 'draw', label: 'draw in', dur: DRAW_SEC },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: SPIN_SEC, id: 'bind' }] }),
  slam: createTimeline('slam', 'Heartbeat Slam', [
    { id: 'rear', label: 'rear', dur: REAR_SEC },
    { id: 'slam', label: 'slam', dur: STRIKE_SEC },
    { id: 'hold', label: 'struck', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: REAR_SEC, id: 'slam' }] }),
  brood: createTimeline('brood', 'Brood Sacs', [
    { id: 'load', label: 'load', dur: LOAD_SEC },
    { id: 'heave', label: 'heave', dur: GATHER_SEC },
    { id: 'lob', label: 'lob', dur: STRIKE_SEC },
    { id: 'hold', label: 'thrown', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.7 },
  ], { cues: [{ at: LOAD_SEC + GATHER_SEC, id: 'brood' }] }),
  rage: createTimeline('rage', 'Enraged', [
    { id: 'rise', label: 'burn', dur: 0.4 },
    { id: 'enraged', label: 'enraged', dur: 1.6 },
  ]),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (0 at rest):
//   crouch 0..1 the body lowers (- rises)   rear   0..1 the body tipped up and back
//   reach  u the body moves forward         pitch  body pitch, + nose down
//   abdo   0..1 the abdomen tipped up       swell  0..1 the abdomen swollen
//   spin   0..1 the spinnerets lit          thread 0..1 of the lane the thread reaches
//   lift   0..1 the front four legs raised  front  0..1 the first pair raised
//   brace  0..1 the first pair planted ahead
//   wide   0..1 every foot planted wide     fang   0..1 the fangs spread
//   squash 0..1 contact squash              shove  0..1 the recoil off a hit (B3)
//   rage   0..1 enraged                     bound  0..1 a hero on a thread
const KEYS = ['crouch', 'rear', 'reach', 'pitch', 'abdo', 'swell', 'spin', 'thread', 'lift', 'front', 'brace', 'wide', 'fang', 'squash', 'shove', 'rage', 'bound'];
const restChannels = (C) => {
  for (const k of KEYS) C[k] = 0;
  return C;
};
const ZERO = restChannels({});
const pose = (o) => ({ ...ZERO, ...o });
const SPUN = pose({ crouch: 0.1, rear: 0.3, pitch: -0.2, abdo: 1, spin: 1, front: 1, fang: 0.5 });
const CAST = pose({ crouch: 0.2, rear: -0.1, pitch: 0.15, abdo: 0.6, spin: 0.8, brace: 1, thread: 1, fang: 1, squash: 1 });
const DRAWN = pose({ crouch: 0.1, pitch: 0.05, abdo: 0.3, spin: 0.3, fang: 0.3 });
const REARED = pose({ crouch: -0.2, rear: 1, pitch: -0.4, abdo: 0.3, lift: 1, fang: 0.6 });
const SLAMMED = pose({ crouch: 1, pitch: 0.1, wide: 1, fang: 1, squash: 1 });
const LOADED = pose({ crouch: 0.1, abdo: 0.5, swell: 1, spin: 0.6 });
const HEAVED = pose({ crouch: 0.25, pitch: 0.1, abdo: 0.8, swell: 1, spin: 1 });
const LOBBED = pose({ crouch: -0.1, pitch: 0.3, abdo: 1, swell: 0.2, spin: 1, squash: 1 });
const mix = (C, A, B, k) => {
  for (const key of KEYS) C[key] = A[key] + (B[key] - A[key]) * k;
  return C;
};

// `from` is the pose an ability starts out of (rest in the lab; in a fight
// whatever the Weaver was doing): every wind-up grows out of it (B1/B5).
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'bind') {
    // B9: drawn back off the lane through the warning, driven past rest on the cast
    if (s.id === 'spin') {
      mix(C, from, SPUN, ease.inOut(Math.min(1, k * 1.4)));
      C.reach = lunge('pull', k).reach * 0.5;
    } else if (s.id === 'cast') {
      mix(C, SPUN, CAST, kick(k));
      const L = lunge('drive', k);
      C.reach = L.reach * 0.5;
      C.squash = (L.sx - 1) / 0.19;
    } else if (s.id === 'hold') {
      mix(C, CAST, CAST, 0);
      C.reach = 0.88 * 0.5;
      C.shove = recoil(k * HOLD_SEC); // B3: the thread's catch jerks it back
    } else if (s.id === 'draw') {
      mix(C, CAST, DRAWN, ease.inOut(k));
      C.thread = 1 - ease.in(k);
      C.reach = 0.88 * 0.5 * (1 - ease.inOut(k));
      C.shove = recoil(HOLD_SEC + k * DRAW_SEC);
    } else {
      mix(C, ZERO, DRAWN, settle(k));
      C.shove = recoil(HOLD_SEC + DRAW_SEC + k * 0.5);
    }
  } else if (id === 'slam') {
    if (s.id === 'rear') mix(C, from, REARED, ease.inOut(Math.min(1, k * 1.3)));
    else if (s.id === 'slam') mix(C, REARED, SLAMMED, kick(k));
    else if (s.id === 'hold') {
      mix(C, SLAMMED, SLAMMED, 0);
      C.shove = recoil(k * HOLD_SEC);
    } else {
      mix(C, ZERO, SLAMMED, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.6);
    }
  } else if (id === 'brood') {
    if (s.id === 'load') mix(C, from, LOADED, ease.inOut(k));
    else if (s.id === 'heave') mix(C, LOADED, HEAVED, ease.out(k));
    else if (s.id === 'lob') mix(C, HEAVED, LOBBED, kick(k));
    else if (s.id === 'hold') {
      mix(C, LOBBED, LOBBED, 0);
      C.shove = recoil(k * HOLD_SEC);
    } else {
      mix(C, ZERO, LOBBED, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.7);
    }
  } else if (id === 'rage') {
    C.rage = s.id === 'rise' ? ease.out(k) : 1;
  }
  return C;
}

// --- Geometry.
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:weaver-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  thorax: () => geo('thorax', () => new IcosahedronGeometry(0.55, 1), 801, 0.12),
  gem: () => geo('gem', () => new IcosahedronGeometry(0.85, 0), 803, 0.14),
  vein: () => sharedGeo('facet:weaver-vein', () => new BoxGeometry(0.035, 0.035, 1.5)),
  shard: () => geo('shard', () => new ConeGeometry(0.12, 0.55, 5).translate(0, 0.275, 0), 805, 0.14),
  spinneret: () => geo('spinneret', () => new ConeGeometry(0.07, 0.26, 4).translate(0, 0.13, 0), 807, 0.12),
  eye: () => geo('eye', () => new IcosahedronGeometry(0.07, 1), 809, 0.1),
  fangBase: () => geo('fang-base', () => new IcosahedronGeometry(0.1, 0), 811, 0.14),
  fang: () => sharedGeo('facet:weaver-fang', () => facetize(hornGeometry({ len: 0.34, r: 0.05, bend: 0.6, seg: 3, sides: 5 }), { jitter: 0.1, seed: 813 })),
  upper: () => geo('upper', () => limbBox(0.18, 0.16, UP_LEN, 0.8, 0.8), 815),
  lower: () => geo('lower', () => limbBox(0.13, 0.12, LOW_LEN, 0.45, 0.45), 817),
  tip: () => geo('tip', () => new ConeGeometry(0.045, TIP_H, 4).translate(0, TIP_H / 2, 0), 819, 0.14),
  cap: () => geo('cap', () => new ConeGeometry(0.07, 0.2, 4).translate(0, 0.1, 0), 821, 0.14),
  strand: () => geo('strand', () => new BoxGeometry(1, 1, 1).translate(0, 0.5, 0), 823, 0.08),
  anchor: () => geo('anchor', () => new IcosahedronGeometry(0.12, 0), 825, 0.14),
};

const _m = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _d = new Vector3();
const SHARDS = [[0.3, 0.95, -0.6, -0.3, -0.4], [-0.25, 0.98, -0.9, -0.5, 0.3], [0.05, 1.05, -0.3, 0.2, 0.05], [0.45, 0.7, -1.2, -0.7, -0.6], [-0.5, 0.65, -0.5, 0.1, 0.7], [0.55, 0.55, -0.85, -0.4, -0.9], [-0.4, 0.8, -1.25, -0.8, 0.5]];
const EYES = [[-0.12, 0.12, 1.0], [0.12, 0.12, 1.0], [-0.26, 0.06, 0.65], [0.26, 0.06, 0.65], [-0.07, 0.24, 0.57], [0.07, 0.24, 0.57]];

export function buildVeinWeaverFacet() {
  const group = new Group();
  group.name = 'boss-veinweaver';
  group.userData.modelStandard = true;
  const yaw = new Group();
  group.add(yaw);
  const grow = new Group();
  yaw.add(grow);
  const pivot = new Group();
  pivot.position.set(0, BODY_Y, -0.25);
  grow.add(pivot);
  const squashG = new Group();
  squashG.position.set(0, 0.1, 0);
  pivot.add(squashG);
  const body = new Group();
  body.position.set(0, -0.1, 0.25);
  squashG.add(body);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const flesh = track(flashable(FLESH));
  const dark = track(flashable(FLESH_DARK));
  const light = track(flashable(FLESH_LIGHT));
  const crystal = track(flashable(CRYSTAL));
  const fangMat = track(flashable(BONE));
  const veinMat = new MeshBasicMaterial({ color: VIOLET.clone(), toneMapped: false });
  const eyeMat = new MeshBasicMaterial({ color: VIOLET_PEAK.clone(), vertexColors: true, toneMapped: false });
  const threadMat = new MeshBasicMaterial({ color: VIOLET.clone(), vertexColors: true, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- The head-chest, low and broad, a saddle of plates over it.
  const thorax = mesh(G.thorax(), flesh, body);
  thorax.scale.set(1.15, 0.65, 1.0);
  thorax.position.set(0, 0, 0.35);
  const spine = createSpine(4);
  [[0, 0.3, 0.85], [0, 0.4, 0.5], [0, 0.4, 0.1], [0, 0.28, -0.2]].forEach(([x, y, z], i) => spine.pts[i].set(x, y, z));
  const saddle = createPlateTube({ spine, rings: 4, around: 6, arc: Math.PI * 0.8, u0: 0.05, u1: 0.95, radius: () => 0.42, plateMat: light, tilt: 0.3, thick: 0.06, name: 'weaver-saddle' });
  saddle.update();
  saddle.plates.scale.set(1.4, 1, 1);
  body.add(saddle.plates);

  // --- The abdomen: a great faceted crystal on a pivot, its veins lit, shards grown out of its back.
  const abdo = new Group();
  abdo.position.set(0, 0.15, -0.25);
  body.add(abdo);
  const swellG = new Group();
  swellG.position.set(0, 0.25, -0.75);
  abdo.add(swellG);
  const gem = mesh(G.gem(), crystal, swellG);
  gem.scale.set(1.0, 0.85, 1.25);
  swellG.add(placeRow(G.vein(), veinMat, 5, (i, m) => {
    const a = (i / 5) * Math.PI * 2;
    m.makeRotationFromEuler(new Euler(Math.sin(a) * 0.35, Math.cos(a) * 0.35, 0)).setPosition(Math.cos(a) * 0.55, Math.sin(a) * 0.45, 0);
  }, { name: 'weaver-veins', ink: false, mottle: 0 }));
  swellG.add(placeRow(G.shard(), crystal, SHARDS.length, (i, m) => {
    const [x, y, z, rx, rz] = SHARDS[i];
    const sc = 0.85 + hash01(i, 3) * 0.4;
    lay(m, x, y - 0.25, z + 0.75, -Math.sin(rz), Math.cos(rz) * Math.cos(rx), -Math.cos(rz) * Math.sin(rx), sc, sc, sc);
  }, { name: 'weaver-shards', inkPx: PART_INK_PX, mottle: 0.12, seed: 113 }));
  // the spinnerets at the tip
  const spinG = new Group();
  spinG.position.set(0, 0.1, -1.85);
  abdo.add(spinG);
  spinG.add(placeRow(G.spinneret(), dark, 3, (i, m) => {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    lay(m, Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0, Math.cos(a) * 0.3, Math.sin(a) * 0.3, -1, 1, 1, 1);
  }, { name: 'weaver-spinnerets', inkPx: PART_INK_PX, mottle: 0.1, seed: 115 }));
  const coreGlow = glow(PALETTE.godstuffViolet, 2.4, 0.2);
  coreGlow.position.set(0, 0.3, -0.75);
  abdo.add(coreGlow);
  const spinGlow = glow(PALETTE.godstuffViolet, 0.9, 0.15);
  spinGlow.position.set(0, 0, -0.1);
  spinG.add(spinGlow);

  // --- The face: six faceted eyes under a brow plate, two hooked fangs.
  const face = new Group();
  face.position.set(0, 0.08, 0.85);
  body.add(face);
  const eyes = placeRow(G.eye(), eyeMat, EYES.length, (i, m) => {
    const [x, y, s] = EYES[i];
    m.makeScale(s, s, s).setPosition(x, y, 0);
  }, { name: 'weaver-eyes', ink: false, mottle: 0 });
  face.add(eyes);
  face.add(placeRow(wedge, dark, 3, (i, m) => {
    const x = (i - 1) * 0.22;
    lay(m, x, 0.3, -0.05, x * 0.4, 0.6, 0.5, 0.16, 0.2, 0.14);
  }, { name: 'weaver-brows', inkPx: PART_INK_PX, mottle: 0.1, seed: 117 }));
  const eyeGlow = glow(PALETTE.godstuffViolet, 0.7, 0.25);
  eyeGlow.position.set(0, 0.15, 0.12);
  face.add(eyeGlow);
  const fangs = [];
  for (const side of [-1, 1]) {
    const fg = new Group();
    fg.position.set(side * 0.13, -0.1, 0.02);
    face.add(fg);
    mesh(G.fangBase(), dark, fg).scale.set(1, 1.2, 1);
    const hook = mesh(G.fang(), fangMat, fg, false);
    hook.position.set(0, -0.04, 0.04);
    hook.rotation.set(Math.PI - 0.5, 0, side * 0.25);
    fangs.push({ fg, side });
  }

  // --- The thread: faceted strands from the spinnerets over the head and
  // down the lane (in the grow node, so it lies along the facing).
  const thread = instancedPart(G.strand(), threadMat, THREAD_SEGS, { name: 'weaver-thread', ink: false, moving: true });
  grow.add(thread);
  const anchor = new Mesh(G.anchor(), threadMat);
  anchor.visible = false;
  grow.add(anchor);
  const floorGlow = glow(PALETTE.godstuffViolet, 3.2, 0.08);
  floorGlow.position.set(0, 0.06, -0.2);
  group.add(floorGlow);
  const shadow = groundShadow(1.6, 0.44, { deep: 1.3, wide: 1.15 });
  group.add(shadow);

  // --- Eight legs on locked feet: a hip on the thorax, a high knee, a long
  // shin to a crystal tip, a crystal cap on the knee.
  const legs = [];
  for (const [i, hz, fx, fz] of PAIRS) {
    for (const side of [-1, 1]) {
      const upper = new Group();
      mesh(G.upper(), i % 2 ? dark : flesh, upper);
      const cap = mesh(G.cap(), crystal, upper, false);
      cap.position.set(0, UP_LEN, 0);
      const lower = new Group();
      mesh(G.lower(), dark, lower);
      const foot = new Group();
      const tipC = mesh(G.tip(), crystal, foot, false);
      tipC.rotation.z = Math.PI;
      tipC.position.y = TIP_H;
      grow.add(upper, lower, foot);
      const idx = legs.length;
      // the alternating tetrapod: each side's legs alternate between the two sets
      const grp = (i + (side > 0 ? 1 : 0)) % 2;
      legs.push({ i: idx, row: i, side, front: i === 0, frontTwo: i <= 1, hipLocal: new Vector3(side * 0.45, 0.02, hz), home: [side * fx, fz], group: grp, upper, lower, foot, a: UP_LEN, b: LOW_LEN, pole: new Vector3(side * 0.7, 1, 0), footH: TIP_H, hip: null });
    }
  }

  // --- Points (B8) and the hit envelope's tuning.
  const points = makePoints({
    mouth: [face, 0, -0.15, 0.15],
    chest: [body, 0, 0.1, 0.4],
    spinneret: [spinG, 0, 0, -0.2],
    crown: [swellG, 0, 0.9, 0],
    tip: [grow, 0, 0.25, 0],
  });
  const footPts = legs.map((L) => {
    const name = `foot${L.side < 0 ? 'L' : 'R'}${L.row + 1}`;
    const p = makePoints({ [name]: [grow, 0, 0, 0] })[name];
    points[name] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 0, axis: 'y', midY: 1.0 };

  // --- Locked feet.
  body.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(body.matrix).applyMatrix4(squashG.matrix).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.22, lift: 0.22, minDur: 0.1, maxDur: 0.26, durPerSpeed: 0.04, lead: 0.55, flight: 2.6 } });
  const { gait } = legRig;
  const C = restChannels({});
  // the cast braces the first pair ahead; the slam lands every foot wide
  const stance = (i, out) => {
    const L = legs[i];
    if (L.front) {
      out.z += 0.55 * C.brace;
      out.x -= L.side * 0.25 * C.brace;
    }
    out.x += L.side * 0.35 * C.wide;
    out.z += (L.row < 2 ? 0.2 : -0.2) * C.wide;
    return out;
  };
  // the spin raises the first pair, the rear the front four
  const raise = (i) => {
    const L = legs[i];
    return Math.min(1, Math.max(L.front ? C.front : 0, L.frontTwo ? C.lift : 0));
  };
  const raiseTo = (i, out) => {
    const L = legs[i];
    hipOf(L, out);
    out.x += L.side * (L.front ? 0.5 : 0.9);
    out.y += L.front ? 0.9 : 0.6;
    out.z += L.front ? 0.9 : 0.5;
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
  // a warning is known by its attack and start tick, never by object: a
  // co-op guest's snapshots hand the rig a fresh copy every few ticks
  let telKey = null;
  let telAge = 0;
  let lastBrood = null;
  let rage = 0;
  let load = 0;
  let bound = 0;
  let threadLen = LAB_THREAD;
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
    lastBrood = null;
    rage = 0;
    load = 0;
    bound = 0;
    laneYaw = null;
    shownYaw = null;
    spawn.clear();
  }
  const begin = (id, t = 0) => {
    from = { ...C, squash: 0, shove: 0, rage: 0, thread: 0, bound: 0 };
    ab = { id, t };
  };

  // In game: each warning is its wind-up, stretched to the sim's ticks so the
  // strike lands on the resolve; the brood is read ahead and fired on the
  // sim's throw; a thread stays out while a hero is bound to it.
  function drive(dt, e, tick) {
    const T = e && e.telegraph ? e.telegraph : null;
    const key = T ? `${T.attack}:${T.startTick}` : null;
    if (key && key !== telKey) {
      telAge = 0;
      const id = T.attack === 'bind' ? 'bind' : T.attack === 'slam' ? 'slam' : null;
      if (id) begin(id);
      // the thread reaches the lane's far end
      if (id === 'bind' && Number.isFinite(T.length)) threadLen = Math.max(0.5, T.length);
    }
    telKey = key;
    tel = T;
    if (tel) telAge += dt;
    if (T && T.attack === 'bind' && Number.isFinite(T.dirX)) laneYaw = Math.atan2(T.dirX, T.dirZ);
    else if (!(ab && ab.id === 'bind')) laneYaw = null;
    // the brood: unwarned in the sim; its next tick read ahead for the load,
    // its throw seen as that tick jumping on to the cooldown
    const nextBrood = e && Number.isFinite(e.nextBroodTick) ? e.nextBroodTick : null;
    const tlB = WEAVER_ABILITIES.brood;
    if (nextBrood !== null && lastBrood !== null && nextBrood - lastBrood > 60 && !(ab && ab.id !== 'brood')) {
      if (!(ab && ab.id === 'brood' && ab.t >= tlB.startOf('heave'))) begin('brood', tlB.startOf('heave'));
    }
    lastBrood = nextBrood;
    let wantLoad = 0;
    if (nextBrood !== null && Number.isFinite(tick) && !T && !ab) wantLoad = Math.max(0, Math.min(1, (LOAD_TICKS - (nextBrood - tick)) / LOAD_TICKS));
    load += (wantLoad - load) * (1 - Math.exp(-14 * dt));
    if (ab) {
      const tl = WEAVER_ABILITIES[ab.id];
      if (ab.id === 'brood') ab.t += dt;
      else {
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
      }
      if (ab.t >= tl.duration) {
        ab = null;
        laneYaw = null;
      }
    }
    if (ab) abilityChannels(ab.id, WEAVER_ABILITIES[ab.id].sample(ab.t), C, from);
    else restChannels(C);
    if (!ab && load > 0.001) mix(C, ZERO, LOADED, load);
    // a hero on a thread: the strand stays taut down the lane, the spinnerets burn
    const held = e && Array.isArray(e.binds) && e.binds.length > 0 ? 1 : 0;
    bound += (held - bound) * (1 - Math.exp(-6 * dt));
    if (bound > 0.001) {
      C.bound = Math.max(C.bound, bound);
      if (!(ab && ab.id === 'bind' && ab.t < WEAVER_ABILITIES.bind.startOf('draw'))) C.thread = Math.max(C.thread, Math.min(1, bound * 1.5));
      C.spin = Math.max(C.spin, 0.7 * bound);
    }
    rage += ((e && e.enraged ? 1 : 0) - rage) * (1 - Math.exp(-3 * dt));
    C.rage = Math.max(C.rage, rage);
    return C;
  }
  // a held contact: the blow taken on planted feet
  function holding() {
    if (!ab) return false;
    const ph = WEAVER_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'cast' || ph === 'slam' || ph === 'lob' || ph === 'hold';
  }

  function apply(dt, { locked, hpFrac, hold = false }) {
    gait.localVelocity(yaw, lv);
    const sp = Math.min(3, Math.hypot(lv.x, lv.z) / WEAVER_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? Math.min(0.08, (lv.z / WEAVER_WALK) * 0.05) : 0) - leanF) * k;
    // the body bobs on the steps and breathes
    const bobY = 0.04 * gait.bob * Math.min(1, sp);
    pivot.position.set(0, BODY_Y + bobY + 0.04 * Math.sin(idle * 1.5) - 0.3 * C.crouch + 0.45 * C.rear, -0.25 + C.reach - 0.1 * C.shove);
    pivot.rotation.set(C.pitch + leanF - 0.5 * C.rear, 0, 0.03 * gait.bob * Math.min(1, sp) * Math.sin(idle * 6));
    // the contact squash kept to a boss's size (Kesh's pick): +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    // the abdomen tips up to aim its spinnerets, swells for the brood
    abdo.rotation.x = -0.6 * C.abdo + 0.1 * Math.sin(idle * 1.2);
    const beat = Math.max(0, Math.sin(idle * (3.2 + 1.6 * C.rage + (1 - hpFrac))));
    swellG.scale.setScalar(1 + 0.04 * beat + 0.14 * C.swell);
    for (const F of fangs) F.fg.rotation.set(-0.45 * C.fang + 0.08 * Math.sin(idle * 4 + F.side), 0, F.side * 0.3 * C.fang);
    const glowK = 0.35 + 0.35 * beat + 0.4 * C.swell + 0.5 * C.squash + 0.25 * C.rage + 0.2 * C.bound;
    coreGlow.material.opacity = Math.min(0.9, 0.12 + 0.35 * glowK);
    spinGlow.material.opacity = Math.min(0.9, 0.12 + 0.75 * C.spin);
    veinMat.color.copy(VIOLET).lerp(VIOLET_PEAK, Math.min(1, glowK * 0.8));
    eyeMat.color.copy(VIOLET).lerp(VIOLET_PEAK, 0.4 + 0.6 * Math.max(C.spin, C.rear, C.rage * 0.5));
    eyeGlow.material.opacity = 0.18 + 0.3 * Math.max(C.spin, C.rear) + 0.15 * C.rage;
    floorGlow.material.opacity = Math.min(0.5, 0.06 + 0.12 * beat + 0.35 * C.squash + 0.1 * C.rear);
    shadow.scale.setScalar(1 + 0.08 * C.rear);
    pivot.updateMatrix();
    squashG.updateMatrix();

    // the thread: from the spinnerets up over the head and down the lane
    points.spinneret.updateWorldMatrix(true, false);
    points.spinneret.getWorldPosition(_a);
    grow.worldToLocal(_a);
    const len = C.thread * threadLen;
    _d.set(0, Math.max(_a.y + 0.4, 1.5), 0.8); // the strand's crest over the head
    _c.set(0, 0.25, len);
    const at = (u, out) => {
      const w0 = (1 - u) * (1 - u);
      const w1 = 2 * u * (1 - u);
      const w2 = u * u;
      return out.set(_a.x * w0 + _d.x * w1 + _c.x * w2 + 0.06 * C.thread * (1 - C.thread) * 4 * Math.sin(u * 11 - idle * 30), _a.y * w0 + _d.y * w1 + _c.y * w2, _a.z * w0 + _d.z * w1 + _c.z * w2);
    };
    const on = C.thread > 0.02;
    for (let i = 0; i < THREAD_SEGS; i++) {
      at(i / THREAD_SEGS, _b);
      at((i + 1) / THREAD_SEGS, _c);
      _c.sub(_b);
      const w = on ? 0.06 - 0.02 * (i / THREAD_SEGS) : 0.0001;
      lay(_m, _b.x, _b.y, _b.z, _c.x, _c.y, _c.z, w, _c.length() * 1.06, w);
      thread.setMatrixAt(i, _m);
      _c.set(0, 0.25, len);
    }
    thread.instanceMatrix.needsUpdate = true;
    anchor.visible = on;
    anchor.position.set(0, 0.25, len);
    points.tip.position.set(0, on ? 0.25 : _a.y, on ? len : _a.z);

    legRig.update(dt, { space: yaw, stance, locked, raise, raiseTo, hold });
    for (const L of legs) {
      const S = legRig.state[L.i];
      L.foot.rotation.set(0.4 * S.up, L.side * 0.2, L.side * 0.3 * S.up);
      footPts[L.i].position.copy(L.foot.position);
    }
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
    pose({ t, hpFrac = 1, e = null, turntable = false, tick = null }) {
      const id = e ? e.id : lastId;
      // a new boss (or a rewound clock) spawns in; a jump in place only re-plants the feet
      const moved = Math.hypot(group.position.x - lastX, group.position.z - lastZ);
      const born = lastT === null || t < lastT || (e && id !== lastId);
      const fresh = born || moved > 2.5;
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
      // the facing eases to the lane while it spins and casts, and back to
      // the sim's facing after (never a snap)
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
      apply(dt, { locked: !turntable && g === 1 && !!e, hpFrac, hold: holding() });
    },
    lab: {
      abilities: WEAVER_ABILITIES,
      // the feet re-plant on the next pose's stance, once its channels are set
      reset() {
        reset();
        replantPending = true;
      },
      feet: () => gait.report(yaw),
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      threadLength: () => C.thread * threadLen,
      gait,
      legs: legRig, // probes: where each leg's IK reached
      pose({ dt, ability = null, abT = 0, hpFrac = 1, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        threadLen = LAB_THREAD;
        if (ability && ability !== 'spawn') abilityChannels(ability, WEAVER_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        const g = ability === 'spawn' ? spawnGrow(abT) : 1;
        grow.scale.setScalar(g);
        if (replantPending) {
          replantPending = false;
          gait.reset(yaw, stance);
        }
        apply(dt, { locked: !rigid && g === 1, hpFrac });
      },
    },
  };
}
