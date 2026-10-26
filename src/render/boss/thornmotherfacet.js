// THE THORNMOTHER, MODEL STANDARD (docs/MODEL_STANDARD.md). The Level I sow
// rebuilt in the faceted look of Kesh's sample video, on top of the chibi ink
// style, keeping the classic's identity (render/boss/slice2.js): a broad, low
// slate sow with a hump of bramble along the spine, violet God-stuff buds in
// the brambles, bone tusks and a dark snout. What the standard adds:
//
//   * a hide of bristled plates in a brick pattern over the barrel, a
//     thicket of briar blades in three lanes along the spine with small barbs
//     on the flanks, faceted seed pods that swell and launch, a boxed skull
//     with a bristle crest, a snout disc, two tusks a side, flop ears,
//     hooves; short legs on four LOCKED HOOVES (render/facet/legs.js);
//   * two ability timelines driven by the sim (sim/bosses/thornmother.js):
//       Seed Volley   gather (1.5 frames, the lab only: in a fight the sim
//                     fires with no warning, so the rig starts at the heave),
//                     heave (2.5 frames from the fire tick: the thicket bucks
//                     up, the pods launch), held with a recoil, settle with
//                     one overshoot;
//       Briar Charge  paw (the 1 s lane telegraph: head down, haunches
//                     loaded, a hind hoof scrapes the floor twice; she turns
//                     square to the lane), burst (2.5 frames), run (held
//                     while the sim charges at 10 u/s, a galloping stride),
//                     stop (2.5 frames: both forehooves brace a step ahead,
//                     the body pitches over them), held, skid (the sim's
//                     40-tick stand: home with one overshoot);
//   * the [M] beats: a spawn-in grow, named points (mouth, the hump as `tip`
//     where the pods leave, each hoof), the shared hit envelope (`react`).
//
// Same interface as the classic (group, mats, setYaw, setFlash, pose), plus
// `lab`, `points`, `react`. Faces +Z. Render only: it reads the sim entity
// (mode, telegraph, the volley's cooldown tick) and never writes it.
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
import { GATHER_SEC, HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../facet/beats.js';

// --- Colour: the classic sow's (slice2.js), no new hues.
const SOW = HIDE.boarBody.clone().lerp(new Color(PALETTE.warmGrey), 0.15).multiplyScalar(0.8);
const SOW_DARK = HIDE.boarDark.clone().multiplyScalar(0.85);
const BRIAR = HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.35).multiplyScalar(0.8);
// the bristled plates: a value step over the hide so they read as plates
const BRISTLE = SOW.clone().lerp(SOW_DARK, 0.45);
const HOOF = HIDE.bone.clone().multiplyScalar(0.62);
const flashable = (c) => facetMaterial(c, { emissive: '#FFFFFF', emissiveIntensity: 0 });

// --- Body plan (yaw space, faces +Z); the body pivots at the hind hips.
const HIP_Y = 0.74;
const PIVOT_Z = -0.8;
// [hip x, hip y, hip z, home x, home z, front, gait group]
const LEGS = [
  [-0.42, 0.76, 0.62, -0.56, 0.66, true, 0],
  [0.42, 0.76, 0.62, 0.56, 0.66, true, 1],
  [-0.44, HIP_Y, PIVOT_Z, -0.58, -0.84, false, 1],
  [0.44, HIP_Y, PIVOT_Z, 0.58, -0.84, false, 0],
];
// the legs reach well past the hips' height: a squat sow stands on bent
// knees, and the heave and the brace never stretch a planted leg straight
const UPPER = 0.46;
const LOWER = 0.44;
const HOOF_H = 0.08;
export const THORN_WALK = 1.3; // u/s, THORNMOTHER.moveSpeed
export const THORN_CHARGE = 10; // u/s, THORNMOTHER.charge.speed
const PAW_SEC = 1.0; // the lane telegraph, 60 ticks

export const THORN_ABILITIES = Object.freeze({
  volley: createTimeline('volley', 'Seed Volley', [
    { id: 'gather', label: 'gather', dur: GATHER_SEC },
    { id: 'heave', label: 'heave', dur: STRIKE_SEC },
    { id: 'hold', label: 'pods away', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: GATHER_SEC + STRIKE_SEC, id: 'volley' }] }),
  charge: createTimeline('charge', 'Briar Charge', [
    { id: 'paw', label: 'paw the ground', dur: PAW_SEC },
    { id: 'burst', label: 'burst', dur: STRIKE_SEC },
    { id: 'run', label: 'charge', dur: 0.45 },
    { id: 'stop', label: 'stop', dur: STRIKE_SEC },
    { id: 'hold', label: 'braced', dur: HOLD_SEC },
    { id: 'skid', label: 'skid', dur: 0.55 },
  ], { cues: [{ at: PAW_SEC, id: 'charge' }, { at: PAW_SEC + STRIKE_SEC + 0.45, id: 'stop' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (0 at rest):
//   head   head pitch, + down       dip    0..1 the body lowers
//   pitch  body pitch, + nose down  reach  u the body leans forward
//   load   0..1 haunches sink        paw    0..1 the hind hoof scrapes
//   hump   0..1 the thicket heaves   pop    0..1 the pods are away
//   squash 0..1 contact squash       stride 0..1 a galloping bounce
//   brace  0..1 the forehooves land a step ahead
//   shove  0..1 the recoil off the volley (B3)
const KEYS = ['head', 'dip', 'pitch', 'reach', 'load', 'paw', 'hump', 'pop', 'squash', 'stride', 'brace', 'shove'];
const restChannels = (C) => {
  for (const k of KEYS) C[k] = 0;
  return C;
};
const ZERO = restChannels({});
const pose = (o) => ({ ...ZERO, ...o });
const PAWING = pose({ head: 0.4, dip: 0.22, pitch: 0.05, reach: -0.08, load: 0.6, paw: 1 });
const RUNNING = pose({ head: 0.38, dip: 0.45, pitch: 0.12, reach: 0.12, stride: 1 });
const BRACED = pose({ head: 0.12, dip: 0.2, pitch: 0.12, reach: 0.22, squash: 1, brace: 1 });
const HEAVED = pose({ head: -0.2, dip: -0.15, pitch: -0.03, hump: 1, pop: 1, squash: 0.6 });
const GATHERED = pose({ dip: 0.25, hump: -0.3, squash: 0.5 });
const mix = (C, A, B, k) => {
  for (const key of KEYS) C[key] = A[key] + (B[key] - A[key]) * k;
  return C;
};

// `from` (in a fight) is the pose the ability starts out of: the paw grows
// out of it, and the volley, which the sim fires with no warning, heaves
// straight out of it (B1/B5: never a snap from rest). The lab passes none.
export function abilityChannels(id, s, C = restChannels({}), from = null) {
  restChannels(C);
  const k = s.k;
  if (id === 'volley') {
    if (s.id === 'gather') mix(C, ZERO, GATHERED, ease.out(k));
    else if (s.id === 'heave') mix(C, from || GATHERED, HEAVED, kick(k));
    else if (s.id === 'hold') {
      mix(C, HEAVED, HEAVED, 0);
      C.shove = recoil(k * HOLD_SEC); // B3: the launch shoves her back
    } else {
      mix(C, ZERO, HEAVED, settle(k));
      C.pop = 1 - ease.inOut(k); // the pods grow back
      C.shove = recoil(HOLD_SEC + k * 0.5);
    }
  } else if (id === 'charge') {
    if (s.id === 'paw') {
      mix(C, from || ZERO, PAWING, ease.inOut(Math.min(1, k * 2.2)));
      // two scrapes once the head is down: 0..1 is one lift, forward to back
      const q = Math.max(0, Math.min(1, (k - 0.2) / 0.75)) * 2;
      C.paw = q >= 2 ? 0 : q % 1;
    } else if (s.id === 'burst') mix(C, PAWING, RUNNING, kick(k));
    else if (s.id === 'run') mix(C, RUNNING, RUNNING, 0);
    else if (s.id === 'stop') mix(C, RUNNING, BRACED, kick(k));
    else if (s.id === 'hold') mix(C, BRACED, BRACED, 0);
    else mix(C, ZERO, BRACED, settle(k));
  }
  return C;
}

// --- Geometry.
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:thorn-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  barrel: () => geo('barrel', () => new IcosahedronGeometry(0.9, 1), 201),
  skull: () => geo('skull', () => taperBox(0.62, 0.5, 0.56, 0.8, 0.78, 0.04), 203),
  snout: () => geo('snout', () => new CylinderGeometry(0.2, 0.25, 0.3, 6).rotateX(Math.PI / 2), 205),
  disc: () => geo('disc', () => new CylinderGeometry(0.17, 0.17, 0.05, 6).rotateX(Math.PI / 2), 207),
  jaw: () => geo('jaw', () => taperBox(0.4, 0.12, 0.4, 0.7, 0.8), 209),
  upper: () => geo('upper', () => limbBox(0.32, 0.3, UPPER, 0.62, 0.66), 211),
  lower: () => geo('lower', () => limbBox(0.18, 0.18, LOWER, 0.82, 0.82), 213),
  hoof: () => geo('hoof', () => taperBox(0.18, HOOF_H, 0.18, 0.8, 0.6).translate(0, HOOF_H / 2, 0.02), 215, 0.12),
  pod: () => geo('pod', () => new IcosahedronGeometry(0.1, 0), 217, 0.16),
  ear: () => geo('ear', () => taperBox(0.2, 0.04, 0.24, 0.5, 1), 219),
};

const _m = new Matrix4();
const _a = new Vector3();
// both joints fold back: the sow hunkers down on elbows and hocks, it never
// kneels forward onto its forelegs
const POLE_FRONT = new Vector3(0, 0.1, -1);
const POLE_HIND = new Vector3(0, 0.1, -1);

// The thicket: [x, z, height, lean back, splay]; three lanes along the spine.
const THICKET = [];
for (let i = 0; i < 8; i++) {
  const k = i / 7;
  const z = 0.75 - k * 1.75;
  const hump = Math.sin(Math.PI * (0.15 + 0.8 * k));
  THICKET.push([0, z, 0.38 + 0.34 * hump, 0.55, 0]);
  if (i % 2 === 0 || i === 7) {
    THICKET.push([-0.3, z - 0.1, 0.28 + 0.22 * hump, 0.45, -0.55]);
    THICKET.push([0.3, z - 0.1, 0.28 + 0.22 * hump, 0.45, 0.55]);
  }
}
// The pods nestle between the blades: [x, z].
const PODS = [[-0.24, 0.42], [0.3, 0.14], [-0.34, -0.2], [0.22, -0.52], [-0.18, -0.86], [0.06, -0.06]];

export function buildThornmotherFacet() {
  const group = new Group();
  group.name = 'boss-thornmother';
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
  squashG.position.set(0, 0.95, -0.1);
  body.add(squashG);
  const torso = new Group();
  torso.position.set(0, -0.95, 0.1);
  squashG.add(torso);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const hide = track(flashable(SOW));
  const dark = track(flashable(SOW_DARK));
  const briar = track(flashable(BRIAR));
  const bristle = track(flashable(BRISTLE));
  const bone = track(flashable(HIDE.bone));
  const hoofMat = track(flashable(HOOF));
  // unlit violet (a God-stuff emitter), stepped per facet by the vertex colours
  const podMat = new MeshBasicMaterial({ color: TELL_VIOLET, vertexColors: true, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- Barrel under a saddle of bristled plates: a mat over the back only,
  // so the flanks stay the classic's smooth sow and the brambles sit on it.
  const barrel = mesh(G.barrel(), hide, torso);
  barrel.scale.set(1.0, 0.64, 1.4);
  barrel.position.set(0, 0.95, -0.1);
  const spine = createSpine(5);
  [[0, 0.92, 0.95], [0, 0.96, 0.45], [0, 0.96, -0.1], [0, 0.94, -0.65], [0, 0.9, -1.15]].forEach(([x, y, z], i) => spine.pts[i].set(x, y, z));
  const coatR = (u) => 0.5 + 0.1 * Math.sin(Math.PI * (0.1 + 0.85 * u));
  const coat = createPlateTube({ spine, rings: 8, around: 7, arc: Math.PI * 0.62, u0: 0.04, u1: 0.96, radius: coatR, plateMat: bristle, tilt: 0.3, thick: 0.05, name: 'thorn-coat' });
  coat.update();
  // the tube is round and the barrel broad: stretch the mat across the back
  coat.plates.scale.set(1.45, 1, 1);
  torso.add(coat.plates);

  // --- The bramble hump: briar blades in three lanes, barbs on the flanks.
  const hump = new Group(); // heaves with the volley
  hump.position.set(0, 1.5, -0.15);
  torso.add(hump);
  const thicket = placeRow(wedge, briar, THICKET.length, (i, m) => {
    const [x, z, h, back, splay] = THICKET[i];
    lay(m, x, -0.06 - Math.abs(x) * 0.35, z + 0.15, splay * 0.8, 1, -back, 0.2, h, 0.45, splay);
  }, { name: 'thorn-thicket', inkPx: PART_INK_PX, mottle: 0.16, seed: 41 });
  hump.add(thicket);
  const BARBS = 12;
  const barbs = placeRow(wedge, briar, BARBS, (i, m) => {
    const side = i % 2 ? 1 : -1;
    const j = i >> 1;
    const z = 0.6 - j * 0.34;
    lay(m, side * (0.6 - 0.05 * Math.abs(j - 2.5)), 1.02 + 0.06 * Math.sin(j), z, side * 1, 0.5, -0.4, 0.1, 0.2, 0.4, side);
  }, { name: 'thorn-barbs', inkPx: PART_INK_PX, mottle: 0.2, seed: 43 });
  torso.add(barbs);
  // the seed pods: faceted violet beads in the brambles, one glow over them
  const pods = instancedPart(G.pod(), podMat, PODS.length, { name: 'thorn-pods', ink: true, inkPx: PART_INK_PX, moving: true });
  hump.add(pods);
  const humpGlow = makeGlowSprite({ color: '#9B7BF0', size: 2.2, opacity: 0.18 });
  humpGlow.material.toneMapped = false;
  humpGlow.position.set(0, 0.25, 0);
  hump.add(humpGlow);
  // a short curled tail
  const tail = placeRow(wedge, dark, 3, (i, m) => {
    const a = 0.5 + i * 0.9;
    lay(m, 0, 0.98 + Math.sin(a) * 0.08, -1.32 - Math.cos(a) * 0.06 + i * 0.02, 0, Math.cos(a), -Math.sin(a), 0.1, 0.16, 0.4);
  }, { name: 'thorn-tail', inkPx: PART_INK_PX, mottle: 0 });
  torso.add(tail);

  // --- Head: boxed skull, bristle crest, snout and disc, tusks, flop ears.
  const head = new Group();
  head.position.set(0, 0.9, 1.15);
  torso.add(head);
  mesh(G.skull(), hide, head).position.set(0, 0.02, 0.06);
  const snout = mesh(G.snout(), dark, head);
  snout.position.set(0, -0.1, 0.42);
  const disc = mesh(G.disc(), bristle, head);
  disc.position.set(0, -0.1, 0.58);
  const jaw = mesh(G.jaw(), dark, head);
  jaw.position.set(0, -0.24, 0.24);
  jaw.rotation.x = 0.12;
  const crest = placeRow(wedge, briar, 5, (i, m) => {
    lay(m, ((i % 2) * 2 - 1) * 0.05, 0.24, 0.12 - i * 0.11, 0, 1, -0.9, 0.14, 0.26 - i * 0.02, 0.45);
  }, { name: 'thorn-crest', inkPx: PART_INK_PX, mottle: 0.12, seed: 45 });
  head.add(crest);
  const tusks = placeRow(wedge, bone, 4, (i, m) => {
    const side = i % 2 ? 1 : -1;
    const big = i < 2;
    lay(m, side * (big ? 0.2 : 0.14), -0.16, big ? 0.42 : 0.3, side * 0.45, 1, 0.35, big ? 0.12 : 0.08, big ? 0.34 : 0.2, 0.5, side * 0.8);
  }, { name: 'thorn-tusks', inkPx: INK_PX * 0.6, mottle: 0 });
  head.add(tusks);
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = mesh(G.ear(), dark, head);
    ear.position.set(side * 0.26, 0.24, 0.0);
    ear.rotation.set(0.5, side * 0.5, side * -0.5);
    ears.push(ear);
  }
  const eyeMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal), toneMapped: false });
  for (const side of [-1, 1]) {
    const eye = new Mesh(sharedGeo('thorn-eye', () => new CylinderGeometry(0.018, 0.018, 0.13, 4).rotateZ(Math.PI / 2)), eyeMat);
    eye.position.set(side * 0.22, 0.12, 0.32);
    eye.rotation.z = side * 0.35;
    head.add(eye);
  }

  // --- Legs on locked hooves.
  const legs = LEGS.map(([hx, hy, hz, fx, fz, front, grp], i) => {
    const upper = new Group();
    mesh(G.upper(), dark, upper);
    const lower = new Group();
    mesh(G.lower(), dark, lower);
    const hoof = new Group();
    mesh(G.hoof(), hoofMat, hoof);
    grow.add(upper, lower, hoof);
    return { i, front, hipLocal: new Vector3(hx, hy, hz), home: [fx, fz], group: grp, upper, lower, foot: hoof, a: UPPER, b: LOWER, pole: front ? POLE_FRONT : POLE_HIND, footH: HOOF_H * 0.8, hip: null };
  });
  // bristle cuffs over each knee
  const cuffs = instancedPart(wedge, briar, legs.length * 2, { name: 'thorn-cuffs', moving: true });
  grow.add(cuffs);
  group.add(groundShadow(1.25, 0.42, { deep: 1.5 }));

  // --- Points (B8) and the hit envelope's tuning.
  const points = makePoints({
    mouth: [head, 0, -0.14, 0.62],
    tip: [hump, 0, 0.5, 0],
    chest: [torso, 0, 0.7, 0.9],
  });
  const HOOF_NAMES = ['hoofFL', 'hoofFR', 'hoofHL', 'hoofHR'];
  const hoofPts = legs.map((L) => {
    const p = makePoints({ [HOOF_NAMES[L.i]]: [grow, 0, 0, 0] })[HOOF_NAMES[L.i]];
    points[HOOF_NAMES[L.i]] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 0, axis: 'y', midY: 0.95 };

  // --- Locked hooves.
  body.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(body.matrix).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.22, lift: 0.16, minDur: 0.09, maxDur: 0.26, durPerSpeed: 0.03, lead: 0.6, flight: 2.6 } });
  const { gait } = legRig;
  const C = restChannels({});
  const stance = (i, out) => {
    if (legs[i].front) out.z += 0.22 * C.brace;
    else out.z -= 0.06 * C.load;
    return out;
  };
  // the paw: the hind-left hoof lifts and scrapes back, twice
  const raise = (i) => (i === 2 ? Math.sin(Math.PI * C.paw) * (C.paw > 0 ? 1 : 0) : 0);
  const raiseTo = (i, out) => {
    hipOf(legs[i], out);
    out.y -= 0.42;
    out.z += 0.22 - 0.5 * C.paw;
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
  let telSeen = false;
  let teleSpan = PAW_SEC;
  let lastMode = 'root';
  let lastVolley = null;
  let from = null;
  let replantPending = false;
  // the facing: the sim's (setYaw), or square to the charge's lane
  let simYaw = 0;
  let shownYaw = null;
  let laneYaw = null;
  const lv = new Vector3();
  let leanF = 0;

  function reset() {
    lastT = null;
    ab = null;
    telSeen = false;
    lastMode = 'root';
    lastVolley = null;
    from = null;
    laneYaw = null;
    shownYaw = null;
    spawn.clear();
  }
  // a new ability starts out of this frame's pose (its contact beats spent)
  function begin(id, t = 0) {
    from = { ...C, squash: 0, shove: 0 };
    ab = { id, t };
  }

  // In game: the lane telegraph is the paw, the sim's charge and skid modes
  // the run and the stop; a volley is read off its cooldown tick jumping.
  // The sim fires a volley only standing (mode 'root', no telegraph), the
  // tick a skid ends included.
  function drive(dt, e) {
    const tel = e && e.telegraph && e.telegraph.attack === 'charge' ? e.telegraph : null;
    const mode = e ? e.mode || 'root' : 'root';
    const CH = THORN_ABILITIES.charge;
    if (tel && !telSeen) {
      telSeen = true;
      teleSpan = tel.resolveTick > tel.startTick ? (tel.resolveTick - tel.startTick) / 60 : PAW_SEC;
      begin('charge');
    } else if (!tel) telSeen = false;
    if (tel && typeof tel.dirX === 'number') laneYaw = Math.atan2(tel.dirX, tel.dirZ);
    else if (mode === 'charge' && e && (e.chargeVx || e.chargeVz)) laneYaw = Math.atan2(e.chargeVx, e.chargeVz);
    else if (mode !== 'skid') laneYaw = null;
    if (mode !== lastMode) {
      if (mode === 'charge') ab = { id: 'charge', t: Math.max(ab && ab.id === 'charge' ? ab.t : 0, CH.startOf('burst')) };
      else if (mode === 'skid') ab = { id: 'charge', t: Math.max(ab && ab.id === 'charge' ? ab.t : 0, CH.startOf('stop')) };
      lastMode = mode;
    }
    const nv = e && typeof e.nextVolleyTick === 'number' ? e.nextVolleyTick : null;
    if (nv !== null && lastVolley !== null && nv > lastVolley && mode === 'root' && !tel) begin('volley', THORN_ABILITIES.volley.startOf('heave'));
    lastVolley = nv;
    if (!ab) return restChannels(C);
    const tl = THORN_ABILITIES[ab.id];
    if (ab.id === 'charge') {
      const burst = CH.startOf('burst');
      const runEnd = CH.startOf('stop') - 1e-4;
      if (telSeen && ab.t < burst) ab.t = Math.min(burst - 1e-4, ab.t + (dt * PAW_SEC) / teleSpan);
      else if (mode === 'charge') ab.t = Math.min(runEnd, ab.t + dt);
      else ab.t += dt;
    } else ab.t += dt;
    abilityChannels(ab.id, tl.sample(ab.t), C, from);
    if (ab.t >= tl.duration) ab = null;
    return C;
  }
  // a held contact: the heave and the braced stop are taken on planted hooves
  function holding() {
    if (!ab) return false;
    const ph = THORN_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'heave' || ph === 'stop' || ph === 'hold';
  }

  const podScale = (i) => {
    const swell = 1 + 0.25 * Math.sin(idle * 3 + i);
    return 1.3 * swell * (1 - 0.85 * C.pop) + 0.2 * C.hump;
  };

  function apply(dt, { locked, hpFrac, hold = false }) {
    gait.localVelocity(yaw, lv);
    const sp = Math.min(3, Math.hypot(lv.x, lv.z) / THORN_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? Math.min(0.12, (lv.z / THORN_WALK) * 0.03) : 0) - leanF) * k;
    const bounce = 0.06 * C.stride * Math.abs(Math.sin(idle * 16));
    const bobY = 0.03 * gait.bob * Math.min(1, sp);
    pivot.position.set(0, HIP_Y + 0.01 * Math.sin(idle * 2) + bobY + bounce - 0.12 * C.dip - 0.06 * C.load, PIVOT_Z + C.reach - 0.1 * C.shove);
    pivot.rotation.set(C.pitch + leanF, 0, 0);
    // the contact squash kept to a boss's size (Kesh's pick over B9's full
    // +19% / -9%): +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    head.rotation.set(C.head + 0.04 * Math.sin(idle * 1.7), 0, 0);
    hump.position.y = 1.5 + 0.12 * C.hump;
    hump.rotation.x = -0.2 * C.hump;
    hump.scale.set(1 + 0.08 * C.hump, 1 + 0.18 * C.hump, 1);
    for (let s = 0; s < 2; s++) ears[s].rotation.x = 0.5 - 0.4 * C.stride * Math.abs(Math.sin(idle * 16 + s));
    for (let i = 0; i < PODS.length; i++) {
      const [x, z] = PODS[i];
      const sc = podScale(i);
      lay(_m, x, 0.1 + 0.05 * Math.sin(i * 1.7) - Math.abs(x) * 0.25, z + 0.15, 0, 1, 0, sc, sc, sc);
      pods.setMatrixAt(i, _m);
    }
    pods.instanceMatrix.needsUpdate = true;
    pivot.updateMatrix();

    legRig.update(dt, { space: yaw, stance, locked, raise, raiseTo, hold });
    for (const L of legs) {
      const S = legRig.state[L.i];
      L.foot.rotation.set((L.front ? 0.7 : -0.5) * S.up, 0, 0);
      hoofPts[L.i].position.copy(L.foot.position);
      // two bristle blades raking back off each knee
      _a.subVectors(S.end, S.knee).normalize();
      for (const side of [0, 1]) {
        lay(_m, S.knee.x + (side ? 0.05 : -0.05), S.knee.y + 0.02, S.knee.z - 0.04, (side ? 0.3 : -0.3) - _a.x * 0.2, 0.4, -1, 0.1, 0.2, 0.4);
        cuffs.setMatrixAt(L.i * 2 + side, _m);
      }
    }
    cuffs.instanceMatrix.needsUpdate = true;

    const fever = 0.55 + 0.2 * Math.sin(idle * 2.4) + (1 - hpFrac) * 0.3;
    humpGlow.material.opacity = Math.min(0.45, 0.16 * fever + 0.18 * C.load + 0.25 * C.hump);
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
      // the facing eases to the lane while she paws and charges along it,
      // and back to the sim's facing after (never a snap)
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
      abilities: THORN_ABILITIES,
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
        if (ability && ability !== 'spawn') abilityChannels(ability, THORN_ABILITIES[ability].sample(abT), C);
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
