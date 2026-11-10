// THE GEODE COLOSSUS, MODEL STANDARD (docs/MODEL_STANDARD.md). The Hollow
// Heart's alternate boss rebuilt in the faceted look of Kesh's sample video,
// on top of the chibi ink style, keeping the classic's identity (render/boss/
// heart.js): the body the Heart grows when the singer stays hidden, a hunched
// giant of dark slate rock with pale glass crystal on its shoulders and back,
// a geode split open in its chest where the heart's violet beats, knuckle-
// walking on two huge fists. What the standard adds:
//
//   * a saddle of slate plates in a brick pattern over the hump, the crystal
//     spires as faceted shards with a crust of smaller crystals round their
//     feet, violet cracks laid as a row of slivers over the rock, the geode a
//     dark cavity lined with nine faceted crystal wedges round a faceted heart,
//     a boxed head sunk between the shoulders under two brow plates, the fists
//     studded with glass and plated over the knuckles, the stubby legs on
//     rock pads;
//   * it walks on FOUR LOCKED FEET (render/facet/legs.js): the two fists are
//     feet as much as the legs are (a knuckle-walk), each pinned to the floor
//     while it carries weight, the fists and the legs stepping as diagonal
//     pairs; a fist raised for a blow comes off its knuckles and lands again
//     where the pose says;
//   * three ability timelines driven by the sim (sim/bosses/colossus.js):
//       Fissure      raise (the 54-tick lane warning less one strike: the
//                    right fist hauled up overhead, the weight back on the
//                    left fist and the legs, the body coiled), slam (2.5
//                    frames on the hit: the fist driven into the floor ahead
//                    on the lane, the B9 lunge, the squash), held with a
//                    recoil, settle (the fist back to its knuckles);
//       Geode Rain   unwarned in the sim: the rig reads the next rain tick
//                    ahead, so over the last 30 ticks both fists come up to
//                    the chest and the geode brightens (load); on the throw
//                    heave (1.5 frames, B1's most for an unwarned move), hurl
//                    (2.5 frames: both fists punched at the ceiling, the body
//                    reared), held with a recoil, settle;
//       Geode Burst  swell (the 60-tick ring warning less one strike: the
//                    body reared up off the fists, both arms spread wide, the
//                    geode's lining opens and blazes), burst (2.5 frames on
//                    the hit: the chest thrust, the fists slammed down wide,
//                    the squash), held with a recoil, spent (the sim's 80
//                    ticks: it slumps dim, the arms slack), recover (settle);
//     and the rage (`enraged`): the cracks burn, the geode beats faster;
//   * the [M] beats: a spawn-in grow, named points (chest, mouth, each fist
//     and foot, the fissure's `tip`), the shared hit envelope (`react`).
//
// Same interface as the classic (group, mats, setYaw, setFlash, pose), plus
// `lab`, `points`, `react`. Faces +Z. Render only: it reads the sim entity
// (mode, telegraph, enraged, nextRainTick) and never writes it.
import { BoxGeometry, Color, ConeGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { HEART } from '../enemies/style.js';
import { facetize, facetMaterial, hash01 } from '../facet/material.js';
import { PART_INK_PX, createPlateTube, createSpine, placeRow, wedgeGeometry } from '../facet/kit.js';
import { createTimeline, ease } from '../facet/timeline.js';
import { lay, limbBox, taperBox } from '../facet/shapes.js';
import { createLegs } from '../facet/legs.js';
import { GATHER_SEC, HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, lunge, makePoints, recoil, settle, spawnGrow } from '../facet/beats.js';

// --- Colour: the classic Colossus's (heart.js), no new hues.
const STONE = HEART.stone.clone();
const STONE_DARK = HEART.stoneDark.clone();
const STONE_LIGHT = STONE.clone().multiplyScalar(1.2); // a value step: the saddle's plates
const GLASS = HEART.crystal.clone().lerp(new Color('#EEF2FF'), 0.55);
const GLASS_EMIT = HEART.crystal.clone().lerp(new Color('#FFFFFF'), 0.3);
const flashable = (c) => facetMaterial(c, { emissive: '#FFFFFF', emissiveIntensity: 0 });
const lit = (c) => new MeshBasicMaterial({ color: new Color(c), toneMapped: false });
function glow(color, size, opacity) {
  const g = makeGlowSprite({ color: '#FFFFFF', size, opacity });
  g.material.toneMapped = false;
  g.material.color.set(color);
  return g;
}

// --- Body plan (yaw space, faces +Z); the torso pivots at the hips.
const HIP_Y = 0.85;
const HIP_Z = -0.3;
// [index, hip x, hip y, hip z (body space for the fists, yaw space for the legs), home x, home z, fist, gait group]
const LEGS = [
  [0, -1.15, 1.25, 0.55, -1.15, 1.0, true, 0],
  [1, 1.15, 1.25, 0.55, 1.15, 1.0, true, 1],
  [2, -0.45, HIP_Y, -0.35, -0.5, -0.4, false, 1],
  [3, 0.45, HIP_Y, -0.35, 0.5, -0.4, false, 0],
];
const ARM_A = 1.2;
const ARM_B = 1.15;
const LEG_A = 0.56;
const LEG_B = 0.56;
const FIST_H = 0.32; // the fist's centre over the floor, on its knuckles
const FOOT_H = 0.07;
export const COLOSSUS_WALK = 1.15; // u/s, COLOSSUS.moveSpeed
const RAISE_SEC = 54 / 60 - STRIKE_SEC; // the fissure lane's warning
const SWELL_SEC = 60 / 60 - STRIKE_SEC; // the burst ring's warning
const SPENT_SEC = 80 / 60; // COLOSSUS.burst.spentTicks
const LOAD_TICKS = 30; // the rain's read-ahead
const LOAD_SEC = 0.5; // the lab's load
const BODY_PITCH = 0.18;

export const COLOSSUS_ABILITIES = Object.freeze({
  fissure: createTimeline('fissure', 'Fissure', [
    { id: 'raise', label: 'raise the fist', dur: RAISE_SEC },
    { id: 'slam', label: 'slam', dur: STRIKE_SEC },
    { id: 'hold', label: 'struck', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: RAISE_SEC, id: 'fissure' }] }),
  rain: createTimeline('rain', 'Geode Rain', [
    { id: 'load', label: 'load', dur: LOAD_SEC },
    { id: 'heave', label: 'heave', dur: GATHER_SEC },
    { id: 'hurl', label: 'hurl', dur: STRIKE_SEC },
    { id: 'hold', label: 'thrown', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.7 },
  ], { cues: [{ at: LOAD_SEC + GATHER_SEC, id: 'rain' }] }),
  burst: createTimeline('burst', 'Geode Burst', [
    { id: 'swell', label: 'swell', dur: SWELL_SEC },
    { id: 'burst', label: 'burst', dur: STRIKE_SEC },
    { id: 'hold', label: 'struck', dur: HOLD_SEC },
    { id: 'spent', label: 'spent', dur: SPENT_SEC },
    { id: 'recover', label: 'recover', dur: 0.6 },
  ], { cues: [{ at: SWELL_SEC, id: 'burst' }, { at: SWELL_SEC + STRIKE_SEC + HOLD_SEC + SPENT_SEC, id: 'recover' }] }),
  rage: createTimeline('rage', 'Enraged', [
    { id: 'rise', label: 'burn', dur: 0.4 },
    { id: 'enraged', label: 'enraged', dur: 1.6 },
  ]),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (0 at rest):
//   crouch 0..1 the body lowers      rear   0..1 the torso rears up (- leans in)
//   reach  u the body moves forward  head   head pitch, + down
//   upR    0..1 the right fist overhead
//   up     0..1 both fists lifted to the chest (the load)
//   punch  0..1 both fists punched overhead
//   spread 0..1 both arms wide off the floor
//   slam   0..1 the right fist planted ahead on the lane
//   wide   0..1 the fists planted wide
//   geode  0..1 the lining open, the heart blazing
//   slump  0..1 spent: slumped and dim
//   squash 0..1 contact squash       shove  0..1 the recoil off a hit (B3)
//   rage   0..1 enraged
const KEYS = ['crouch', 'rear', 'reach', 'head', 'upR', 'up', 'punch', 'spread', 'slam', 'wide', 'geode', 'slump', 'squash', 'shove', 'rage'];
const restChannels = (C) => {
  for (const k of KEYS) C[k] = 0;
  return C;
};
const ZERO = restChannels({});
const pose = (o) => ({ ...ZERO, ...o });
const RAISED = pose({ upR: 1, rear: 0.35, crouch: 0.12, head: -0.22, geode: 0.3 });
const SLAMMED = pose({ slam: 1, rear: -0.25, crouch: 0.35, head: 0.3, geode: 0.5, squash: 1 });
const LOADED = pose({ up: 1, rear: 0.2, head: -0.4, geode: 0.6 });
const HEAVED = pose({ up: 1, rear: 0.45, crouch: 0.2, head: -0.5, geode: 0.8 });
const HURLED = pose({ punch: 1, rear: 0.55, crouch: -0.1, head: -0.6, geode: 1, squash: 1 });
const SWOLLEN = pose({ spread: 1, rear: 0.6, crouch: -0.15, head: -0.3, geode: 1 });
const BURST = pose({ wide: 1, rear: -0.12, crouch: 0.3, head: 0.2, geode: 1, squash: 1 });
const SPENT = pose({ wide: 0.4, slump: 1, crouch: 0.25, head: 0.4, geode: -0.4 });
const mix = (C, A, B, k) => {
  for (const key of KEYS) C[key] = A[key] + (B[key] - A[key]) * k;
  return C;
};

// `from` is the pose an ability starts out of (rest in the lab; in a fight
// whatever the Colossus was doing): every wind-up grows out of it (B1/B5).
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'fissure') {
    // B9: coiled back through the warning, driven past rest on the slam
    if (s.id === 'raise') {
      mix(C, from, RAISED, ease.inOut(Math.min(1, k * 1.4)));
      C.reach = lunge('pull', k).reach * 0.5;
    } else if (s.id === 'slam') {
      mix(C, RAISED, SLAMMED, kick(k));
      const L = lunge('drive', k);
      C.reach = L.reach * 0.5;
      C.squash = (L.sx - 1) / 0.19;
    } else if (s.id === 'hold') {
      mix(C, SLAMMED, SLAMMED, 0);
      C.reach = 0.88 * 0.5;
      C.shove = recoil(k * HOLD_SEC); // B3: the floor kicks back
    } else {
      mix(C, ZERO, { ...SLAMMED, reach: 0.88 * 0.5 }, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.6);
    }
  } else if (id === 'rain') {
    if (s.id === 'load') mix(C, from, LOADED, ease.inOut(k));
    else if (s.id === 'heave') mix(C, LOADED, HEAVED, ease.out(k));
    else if (s.id === 'hurl') mix(C, HEAVED, HURLED, kick(k));
    else if (s.id === 'hold') {
      mix(C, HURLED, HURLED, 0);
      C.shove = recoil(k * HOLD_SEC);
    } else {
      mix(C, ZERO, HURLED, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.7);
    }
  } else if (id === 'burst') {
    if (s.id === 'swell') mix(C, from, SWOLLEN, ease.inOut(Math.min(1, k * 1.3)));
    else if (s.id === 'burst') mix(C, SWOLLEN, BURST, kick(k));
    else if (s.id === 'hold') {
      mix(C, BURST, BURST, 0);
      C.shove = recoil(k * HOLD_SEC);
    } else if (s.id === 'spent') {
      mix(C, BURST, SPENT, ease.out(Math.min(1, k * 3)));
      C.shove = recoil(HOLD_SEC + k * SPENT_SEC);
    } else mix(C, ZERO, SPENT, settle(k));
  } else if (id === 'rage') {
    C.rage = s.id === 'rise' ? ease.out(k) : 1;
  }
  return C;
}

// --- Geometry.
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:colossus-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  torso: () => geo('torso', () => new IcosahedronGeometry(0.95, 1), 701, 0.12),
  cavity: () => geo('cavity', () => new SphereGeometry(0.42, 9, 7), 703),
  heart: () => geo('heart', () => new IcosahedronGeometry(0.17, 0), 705, 0.16),
  spire: () => geo('spire', () => new ConeGeometry(0.3, 1, 5).translate(0, 0.5, 0), 707, 0.14),
  crust: () => geo('crust', () => new ConeGeometry(0.1, 0.3, 4).translate(0, 0.15, 0), 709, 0.16),
  crack: () => sharedGeo('facet:colossus-crack', () => new BoxGeometry(0.035, 0.5, 0.035)),
  head: () => geo('head', () => taperBox(0.72, 0.48, 0.66, 0.8, 0.7, 0.05), 711),
  eye: () => sharedGeo('facet:colossus-eye', () => new BoxGeometry(0.14, 0.03, 0.03)),
  upper: () => geo('upper', () => limbBox(0.52, 0.46, ARM_A, 0.82, 0.82), 713),
  fore: () => geo('fore', () => limbBox(0.44, 0.4, ARM_B, 0.95, 0.95), 715),
  fist: () => geo('fist', () => new IcosahedronGeometry(0.36, 0), 717, 0.14),
  stud: () => geo('stud', () => new ConeGeometry(0.07, 0.3, 4).translate(0, 0.15, 0), 719, 0.14),
  thigh: () => geo('thigh', () => limbBox(0.48, 0.52, LEG_A, 0.85, 0.85), 721),
  shin: () => geo('shin', () => limbBox(0.42, 0.44, LEG_B, 0.92, 0.92), 723),
  pad: () => geo('pad', () => new IcosahedronGeometry(0.26, 0), 725, 0.12),
};

const _a = new Vector3();
const _m = new Matrix4();
// elbows bend out and back; the stubby knees forward
const POLE_AL = new Vector3(-0.8, 0.3, -1);
const POLE_AR = new Vector3(0.8, 0.3, -1);
const POLE_L = new Vector3(0, 0.3, 1);
const SPIRES = [[0.85, 1.6, 0.25, 0.32, 0.9, -0.7, -0.2], [-0.9, 1.55, 0.2, 0.3, 0.85, 0.7, -0.25], [0.2, 1.85, -0.2, 0.36, 1.2, -0.15, -0.5], [-0.3, 1.8, -0.35, 0.28, 0.95, 0.25, -0.6], [0.6, 1.4, -0.45, 0.22, 0.7, -0.6, -0.8], [-0.65, 1.3, -0.5, 0.2, 0.62, 0.6, -0.8], [0.0, 1.5, -0.6, 0.24, 0.8, 0, -1.0]];
const CRACKS = [[-0.75, 1.2, 0.85, 0.5], [0.8, 0.7, 0.8, -0.6], [-0.4, 0.3, 1.05, 1.1], [0.55, 1.45, 0.6, 0.2], [-0.95, 0.65, 0.4, -0.3], [0.3, 1.0, 1.0, 0.9], [-0.15, 1.6, 0.75, -0.9]];

export function buildColossusFacet() {
  const group = new Group();
  group.name = 'boss-colossus';
  group.userData.modelStandard = true;
  const yaw = new Group();
  group.add(yaw);
  const grow = new Group();
  yaw.add(grow);
  // the torso pivots at the hips
  const pivot = new Group();
  pivot.position.set(0, HIP_Y, HIP_Z);
  grow.add(pivot);
  const squashG = new Group();
  squashG.position.set(0, 0.9, 0.35);
  pivot.add(squashG);
  const body = new Group();
  body.position.set(0, -0.9, -0.35);
  squashG.add(body);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const stone = track(flashable(STONE));
  const dark = track(flashable(STONE_DARK));
  const light = track(flashable(STONE_LIGHT));
  const glass = facetMaterial(GLASS, { emissive: GLASS_EMIT, emissiveIntensity: 0.35 });
  const cracks = new MeshBasicMaterial({ color: HEART.vein.clone(), toneMapped: false });
  const core = new MeshBasicMaterial({ color: HEART.veinHot.clone(), vertexColors: true, toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- The hunched torso, the saddle of plates over the hump.
  const torso = mesh(G.torso(), stone, body);
  torso.scale.set(1.25, 1.0, 0.95);
  torso.position.set(0, 0.9, 0.35);
  torso.rotation.set(0.25, 0.4, 0);
  const spine = createSpine(5);
  [[0, 1.45, 1.05], [0, 1.85, 0.6], [0, 1.95, 0.1], [0, 1.8, -0.35], [0, 1.45, -0.6]].forEach(([x, y, z], i) => spine.pts[i].set(x, y, z));
  const saddle = createPlateTube({ spine, rings: 6, around: 7, arc: Math.PI * 0.85, u0: 0.04, u1: 0.98, radius: (u) => 0.74 - 0.22 * u, plateMat: light, tilt: 0.3, thick: 0.08, name: 'colossus-saddle' });
  saddle.update();
  saddle.plates.scale.set(1.5, 1, 1);
  body.add(saddle.plates);
  // the crystal spires out of the shoulders and back, a crust round their feet
  body.add(placeRow(G.spire(), glass, SPIRES.length, (i, m) => {
    const [x, y, z, r, h, lx, lz] = SPIRES[i];
    lay(m, x, y, z, -Math.sin(lx), Math.cos(lx) * Math.cos(lz), Math.cos(lx) * Math.sin(lz), r * 2, h, r * 2);
  }, { name: 'colossus-spires', inkPx: PART_INK_PX, mottle: 0.1, seed: 103 }));
  body.add(placeRow(G.crust(), glass, 12, (i, m) => {
    const [x, y, z, , , lx, lz] = SPIRES[i % SPIRES.length];
    const a = hash01(i, 5) * Math.PI * 2;
    const d = 0.22 + hash01(i, 9) * 0.14;
    const sc = 0.7 + hash01(i, 13) * 0.6;
    lay(m, x + Math.cos(a) * d, y - 0.08, z + Math.sin(a) * d, -Math.sin(lx) * 0.5 + Math.cos(a) * 0.4, 1, Math.cos(lx) * Math.sin(lz) * 0.5 + Math.sin(a) * 0.4, sc, sc, sc);
  }, { name: 'colossus-crust', inkPx: PART_INK_PX, mottle: 0.14, seed: 105 }));
  // violet cracks over the rock (they burn once enraged)
  const crackRow = placeRow(G.crack(), cracks, CRACKS.length, (i, m) => {
    const [x, y, z, rz] = CRACKS[i];
    m.makeRotationZ(rz).setPosition(x, y, z);
  }, { name: 'colossus-cracks', ink: false, mottle: 0 });
  body.add(crackRow);

  // --- The split geode in the chest: a dark cavity lined with crystal, the heart in it.
  const geode = new Group();
  geode.position.set(0, 0.85, 1.12);
  body.add(geode);
  const cavity = mesh(G.cavity(), dark, geode);
  cavity.scale.set(1, 1.2, 0.45);
  const liningG = new Group();
  liningG.position.z = 0.08;
  geode.add(liningG);
  liningG.add(placeRow(wedge, glass, 9, (i, m) => {
    const a = (i / 9) * Math.PI * 2;
    // each wedge grows in from the rim, tipped forward out of the cavity
    lay(m, Math.cos(a) * 0.3, Math.sin(a) * 0.36, 0, -Math.cos(a) * 0.8, -Math.sin(a) * 0.9, 0.55, 0.14, 0.3, 0.12);
  }, { name: 'colossus-lining', inkPx: PART_INK_PX, mottle: 0.1, seed: 107 }));
  const heart = new Mesh(G.heart(), core);
  heart.position.z = 0.12;
  geode.add(heart);
  const heartGlow = glow(HEART.glow, 2.0, 0.45);
  heartGlow.position.z = 0.25;
  geode.add(heartGlow);
  const backGlow = glow(GLASS_EMIT, 2.4, 0.16);
  backGlow.position.set(0, 2.2, -0.3);
  body.add(backGlow);

  // --- The head: a low blunt wedge sunk between the shoulders.
  const headG = new Group();
  headG.position.set(0, 1.55, 1.1);
  body.add(headG);
  mesh(G.head(), dark, headG);
  headG.add(placeRow(wedge, light, 2, (i, m) => {
    const side = i ? 1 : -1;
    lay(m, side * 0.2, 0.22, 0.1, side * 0.35, 0.3, 1, 0.16, 0.3, 0.2, side * 0.3);
  }, { name: 'colossus-brows', inkPx: PART_INK_PX, mottle: 0 }));
  headG.add(placeRow(G.eye(), cracks, 2, (i, m) => {
    const side = i ? 1 : -1;
    m.makeRotationZ(side * 0.3).setPosition(side * 0.13, 0.03, 0.3);
  }, { name: 'colossus-eyes', ink: false, mottle: 0 }));
  const pool = glow(HEART.glow, 3.4, 0.16);
  pool.position.set(0, 0.06, 0.5);
  group.add(pool);
  const shadow = groundShadow(1.25, 0.42, { deep: 1.4 });
  group.add(shadow);

  // --- The limbs on locked feet: the fists and the legs.
  const legs = LEGS.map(([i, hx, hy, hz, fx, fz, fist, grp]) => {
    const side = hx < 0 ? -1 : 1;
    const upper = new Group();
    mesh(fist ? G.upper() : G.thigh(), fist ? stone : dark, upper);
    const lower = new Group();
    mesh(fist ? G.fore() : G.shin(), dark, lower);
    const foot = new Group();
    if (fist) {
      const f = mesh(G.fist(), dark, foot);
      f.scale.set(1.1, 0.95, 1.2);
      // glass studs over the knuckles, plates down the back of the hand
      foot.add(placeRow(G.stud(), glass, 3, (k, m) => lay(m, (k - 1) * 0.15, -0.1, 0.3, 0, 0.35, 1, 1, 1, 1), { name: side < 0 ? 'colossus-studs-l' : 'colossus-studs-r', inkPx: PART_INK_PX, mottle: 0.1, seed: 109 }));
      foot.add(placeRow(wedge, light, 4, (k, m) => lay(m, (k - 1.5) * 0.17, 0.3, -0.05, (k - 1.5) * 0.12, 0.35, 1, 0.12, 0.22, 0.12), { name: side < 0 ? 'colossus-knuckles-l' : 'colossus-knuckles-r', inkPx: PART_INK_PX, mottle: 0.1, seed: 111 }));
    } else {
      mesh(G.pad(), dark, foot).scale.set(1.1, 0.4, 1.2);
    }
    grow.add(upper, lower, foot);
    const pole = fist ? (side < 0 ? POLE_AL : POLE_AR) : POLE_L;
    return { i, fist, side, hipLocal: new Vector3(hx, hy, hz), home: [fx, fz], group: grp, upper, lower, foot, a: fist ? ARM_A : LEG_A, b: fist ? ARM_B : LEG_B, pole, footH: fist ? FIST_H : FOOT_H, hip: null };
  });

  // --- Points (B8) and the hit envelope's tuning.
  const points = makePoints({
    chest: [geode, 0, 0, 0.3],
    mouth: [headG, 0, -0.05, 0.36],
    crown: [body, 0, 2.3, -0.2],
  });
  const PT_NAMES = ['fistL', 'fistR', 'footL', 'footR'];
  const footPts = legs.map((L) => {
    const p = makePoints({ [PT_NAMES[L.i]]: [grow, 0, 0, 0] })[PT_NAMES[L.i]];
    points[PT_NAMES[L.i]] = p;
    return p;
  });
  points.tip = points.fistR;
  const react = { squash: 1, flinch: 1, knock: 0, axis: 'y', midY: 1.3 };

  // --- Locked feet. The fists hang from the shoulders (body space), the
  // legs from the hips (yaw space).
  body.updateMatrix();
  const hipOf = (L, out) => {
    out.copy(L.hipLocal);
    if (L.fist) out.applyMatrix4(body.matrix).applyMatrix4(squashG.matrix).applyMatrix4(pivot.matrix);
    return out;
  };
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.26, lift: 0.2, minDur: 0.12, maxDur: 0.3, durPerSpeed: 0.04, lead: 0.55, flight: 2.6 } });
  const { gait } = legRig;
  const C = restChannels({});
  // the slam plants the right fist ahead on the lane; the burst lands both wide
  const stance = (i, out) => {
    const L = legs[i];
    if (!L.fist) return out;
    if (L.side > 0) {
      out.z += 0.95 * C.slam;
      out.x -= 0.35 * C.slam;
    }
    out.x += L.side * 0.5 * C.wide;
    out.z += 0.15 * C.wide;
    return out;
  };
  // a fist comes off its knuckles for the fissure's raise, the rain's load,
  // the hurl and the burst's spread
  const raise = (i) => {
    const L = legs[i];
    if (!L.fist) return 0;
    return Math.min(1, Math.max(L.side > 0 ? C.upR : 0, C.up, C.punch, C.spread));
  };
  const raiseTo = (i, out) => {
    const L = legs[i];
    hipOf(L, out);
    const wR = L.side > 0 ? C.upR : 0;
    const sum = Math.max(1e-6, wR + C.up + C.punch + C.spread);
    out.x += (L.side * 0.1 * wR + L.side * -0.25 * C.up + L.side * 0.15 * C.punch + L.side * 1.0 * C.spread) / sum;
    out.y += (1.2 * wR - 0.55 * C.up + 1.25 * C.punch - 0.15 * C.spread) / sum;
    out.z += (0.3 * wR + 0.55 * C.up + 0.25 * C.punch + 0.25 * C.spread) / sum;
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
  let lastMode = 'stalk';
  let lastRain = null;
  let rage = 0;
  let load = 0;
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
    lastRain = null;
    rage = 0;
    load = 0;
    laneYaw = null;
    shownYaw = null;
    spawn.clear();
  }
  const begin = (id, t = 0) => {
    from = { ...C, squash: 0, shove: 0, rage: 0 };
    ab = { id, t };
  };

  // In game: each warning is its wind-up, stretched to the sim's ticks so the
  // strike lands on the resolve; the rain is read ahead and fired on the
  // sim's throw; the spent slump holds as long as the sim's mode does.
  function drive(dt, e, tick) {
    const T = e && e.telegraph ? e.telegraph : null;
    const mode = e ? e.mode || 'stalk' : 'stalk';
    const key = T ? `${T.attack}:${T.startTick}` : null;
    if (key && key !== telKey) {
      telAge = 0;
      const id = T.attack === 'fissure' ? 'fissure' : T.attack === 'burst' ? 'burst' : null;
      if (id) begin(id);
    }
    telKey = key;
    tel = T;
    if (tel) telAge += dt;
    if (T && T.attack === 'fissure' && Number.isFinite(T.dirX)) laneYaw = Math.atan2(T.dirX, T.dirZ);
    else if (!(ab && ab.id === 'fissure')) laneYaw = null;
    // the rain: unwarned in the sim; its next tick read ahead for the load,
    // its throw seen as that tick jumping on to the cooldown
    const nextRain = e && Number.isFinite(e.nextRainTick) ? e.nextRainTick : null;
    const tlR = COLOSSUS_ABILITIES.rain;
    if (nextRain !== null && lastRain !== null && nextRain - lastRain > 60 && !(ab && ab.id !== 'rain')) {
      if (!(ab && ab.id === 'rain' && ab.t >= tlR.startOf('heave'))) begin('rain', tlR.startOf('heave'));
    }
    lastRain = nextRain;
    let wantLoad = 0;
    if (nextRain !== null && Number.isFinite(tick) && !T && mode === 'stalk' && !ab) wantLoad = Math.max(0, Math.min(1, (LOAD_TICKS - (nextRain - tick)) / LOAD_TICKS));
    load += (wantLoad - load) * (1 - Math.exp(-14 * dt));
    if (ab) {
      const tl = COLOSSUS_ABILITIES[ab.id];
      if (ab.id === 'rain') {
        ab.t += dt;
      } else {
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
        if (ab.id === 'burst') {
          // the slump holds while the sim keeps it spent
          const recoverAt = tl.startOf('recover');
          if (mode === 'spent' && ab.t >= tl.startOf('spent')) ab.t = Math.min(ab.t, recoverAt - 1e-4);
          else if (mode !== 'spent' && lastMode === 'spent' && ab.t < recoverAt) ab.t = recoverAt;
        }
      }
      if (ab.t >= tl.duration) {
        ab = null;
        laneYaw = null;
      }
    }
    lastMode = mode;
    if (ab) abilityChannels(ab.id, COLOSSUS_ABILITIES[ab.id].sample(ab.t), C, from);
    else restChannels(C);
    if (!ab && load > 0.001) mix(C, ZERO, LOADED, load);
    if (mode === 'spent' && !(ab && ab.id === 'burst')) mix(C, C, SPENT, 1 - Math.exp(-6 * dt) + 0);
    rage += ((e && e.enraged ? 1 : 0) - rage) * (1 - Math.exp(-3 * dt));
    C.rage = Math.max(C.rage, rage);
    return C;
  }
  // a held contact: the blow taken on planted feet
  function holding() {
    if (!ab) return false;
    const ph = COLOSSUS_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'slam' || ph === 'hurl' || ph === 'burst' || ph === 'hold';
  }

  function apply(dt, { locked, hpFrac, hold = false }) {
    gait.localVelocity(yaw, lv);
    const sp = Math.min(3, Math.hypot(lv.x, lv.z) / COLOSSUS_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? Math.min(0.1, (lv.z / COLOSSUS_WALK) * 0.06) : 0) - leanF) * k;
    // a heavy rolling gait: the hump rolls over each planted pair
    const bobY = 0.05 * gait.bob * Math.min(1, sp);
    pivot.position.set(0, HIP_Y + bobY - 0.2 * C.crouch + 0.25 * Math.max(0, C.rear), HIP_Z + C.reach - 0.1 * C.shove);
    pivot.rotation.set(BODY_PITCH + leanF - 0.55 * C.rear + 0.3 * C.slump, 0, 0.04 * gait.bob * Math.min(1, sp) * Math.sin(idle * 6));
    // the contact squash kept to a boss's size (Kesh's pick): +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    headG.rotation.x = C.head + 0.03 * Math.sin(idle * 0.9);
    // the geode beats with the Heart; it blazes for the burst and dims spent
    const rate = 1.6 + (1 - hpFrac) * 1.4 + C.rage * 0.8;
    const beat = Math.pow(Math.max(0, Math.sin(idle * rate * Math.PI)), 6);
    const open = Math.max(-0.4, C.geode);
    heart.scale.setScalar(Math.max(0.3, 1 + 0.3 * beat + 0.6 * open));
    heartGlow.material.opacity = Math.max(0.08, Math.min(0.9, 0.35 + 0.25 * beat + 0.45 * open));
    glass.emissiveIntensity = Math.max(0.05, 0.3 + 0.35 * open + 0.2 * C.rage);
    liningG.scale.setScalar(1 + 0.25 * Math.max(0, open));
    liningG.rotation.z = 0.15 * Math.max(0, open);
    cracks.color.copy(HEART.veinDim).lerp(HEART.veinHot, Math.min(1, 0.35 + 0.65 * Math.max(C.rage * (0.6 + 0.4 * beat), Math.max(0, open))));
    crackRow.scale.set(1 + 0.4 * C.rage, 1, 1 + 0.4 * C.rage);
    pool.material.opacity = Math.max(0.04, 0.12 + 0.08 * beat + 0.25 * Math.max(0, open) - 0.08 * C.slump);
    backGlow.material.opacity = 0.12 + 0.1 * C.rage;
    pivot.updateMatrix();
    squashG.updateMatrix();

    legRig.update(dt, { space: yaw, stance, locked, raise, raiseTo, hold });
    for (const L of legs) {
      const S = legRig.state[L.i];
      if (L.fist) {
        // a planted fist rests on its knuckles; a raised one turns over, palm in
        const up = Math.max(S.up, raise(L.i));
        L.foot.rotation.set(-0.9 * up, L.side * 0.2, L.side * 0.4 * up);
      } else L.foot.rotation.set(0.3 * S.up, 0, 0);
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
      // the facing eases to the lane while it raises and slams, and back to
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
      abilities: COLOSSUS_ABILITIES,
      // the feet re-plant on the next pose's stance, once its channels are set
      reset() {
        reset();
        replantPending = true;
      },
      feet: () => gait.report(yaw),
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      gait,
      legs: legRig, // probes: where each limb's IK reached
      pose({ dt, ability = null, abT = 0, hpFrac = 1, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, COLOSSUS_ABILITIES[ability].sample(abT), C);
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
