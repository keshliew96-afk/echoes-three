// THE MIRE KING, MODEL STANDARD (docs/MODEL_STANDARD.md). The Sunken Mill's
// third boss rebuilt in the faceted look of Kesh's sample video, on top of
// the chibi ink style, keeping the classic's identity (render/boss/third.js):
// the millpond's vast squat toad, mottled teal-slate with a pale belly, two
// bulging eyes on top, a crown of rusted mill-grate bars and a throat sac
// that glows violet. What the standard adds:
//
//   * a saddle of warty hide plates in a brick pattern over the back, a scatter
//     of faceted warts down the flanks, two great glands behind the eyes, brow
//     ridges, a lip of small plates along the mouth, weed hanging off the
//     back; the crown as a faceted band with its bars, rivets and violet
//     gems; a tongue of faceted segments that truly reaches down the lane;
//     four legs on LOCKED FEET (render/facet/legs.js): splayed fore-limbs on
//     four-fingered hands, great folded hind legs on long webbed feet;
//   * three ability timelines driven by the sim (sim/bosses/mireking.js):
//       Tongue Lash  draw (the 48-tick lane warning less one strike: the head
//                    comes up, the mouth opens, the sac fills, the body sits
//                    back), lash (2.5 frames on the hit: the B9 lunge, the
//                    tongue shot the length of the lane), held, reel (the
//                    sim's 12-tick yank: the tongue drawn back in, the body
//                    jerked back, the B3 recoil), settle;
//       Belly Flop   heave (the ring warning less the 20-tick leap: it rears
//                    on its hind legs, the fore-feet off the floor, swelling),
//                    leap (the sim's flight to the ring: a real arc, the legs
//                    spread wide), land (2.5 frames ending on the hit: belly
//                    down, every foot planted wide, squashed), held with a
//                    recoil, settle;
//       Swallow      gape (the 78-tick ring warning less one strike: the jaw
//                    falls wide, the head tips back, the sac and the body
//                    swell, the maw burns), snap (2.5 frames on the hit: the
//                    jaw slams shut, the head drives down), held with a
//                    recoil, settle;
//     and the rage (`enraged`): the sac beats faster, the eyes and the crown's
//     gems burn;
//   * the [M] beats: a spawn-in grow, named points (mouth, the tongue's
//     `tip`, the chest, the sac, each foot), the shared hit envelope (`react`).
//
// Same interface as the classic (group, mats, setYaw, setFlash, pose), plus
// `lab`, `points`, `react`. Faces +Z. Render only: it reads the sim entity
// (mode, telegraph, enraged) and never writes it.
import { BoxGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { HIDE, TELL_VIOLET } from '../enemies/style.js';
import { facetize, facetMaterial, hash01 } from '../facet/material.js';
import { PART_INK_PX, createPlateTube, createSpine, instancedPart, placeRow, wedgeGeometry } from '../facet/kit.js';
import { createTimeline, ease } from '../facet/timeline.js';
import { lay, limbBox } from '../facet/shapes.js';
import { createLegs } from '../facet/legs.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, lunge, makePoints, recoil, settle, spawnGrow } from '../facet/beats.js';

// --- Colour: the classic toad's (third.js), no new hues.
const TOAD = HIDE.toadBody.clone().multiplyScalar(0.95);
const TOAD_DARK = HIDE.toadDark.clone();
const TOAD_BELLY = HIDE.toadSac.clone().multiplyScalar(0.92);
const RUST = HIDE.ramDark.clone().lerp(new Color(PALETTE.bruiseUmber), 0.45).multiplyScalar(1.05);
const TONGUE = HIDE.toadSac.clone().lerp(new Color(PALETTE.godstuffViolet), 0.35);
// a value step of the hide, so the saddle's plates read as plates
const WARTY = TOAD.clone().lerp(TOAD_DARK, 0.4);
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
// the heave rears the front up off them.
const HIP_Y = 0.72;
const PIVOT_Z = -0.55;
// [hip x, hip y, hip z, home x, home z, front, gait group]
const LEGS = [
  [-0.78, 0.8, 0.62, -1.02, 0.86, true, 0],
  [0.78, 0.8, 0.62, 1.02, 0.86, true, 1],
  [-0.98, HIP_Y, PIVOT_Z, -1.24, -0.22, false, 1],
  [0.98, HIP_Y, PIVOT_Z, 1.24, -0.22, false, 0],
];
const FRONT_A = 0.52;
const FRONT_B = 0.5;
const HIND_A = 0.66;
const HIND_B = 0.64;
const FOOT_H = 0.06;
export const MIRE_WALK = 1.0; // u/s, MIREKING.moveSpeed
const DRAW_SEC = 48 / 60 - STRIKE_SEC; // the lash lane's warning
const LEAP_TICKS = 20; // MIREKING.flop.leapTicks
const HEAVE_SEC = (66 - LEAP_TICKS) / 60; // the flop ring's warning before the leap
const LEAP_SEC = LEAP_TICKS / 60 - STRIKE_SEC; // the flight; the landing strike ends on the hit
const GAPE_SEC = 78 / 60 - STRIKE_SEC; // the swallow ring's warning
const REEL_SEC = 12 / 60; // MIREKING.lash.yankTicks
const FLOP_H = 1.4; // u, the top of the flop's arc (the classic's)
const LAB_TONGUE = 5; // u, the lab's lane
const MOUTH_Z = 1.45; // u ahead of the body's centre, where the tongue leaves

export const MIRE_ABILITIES = Object.freeze({
  lash: createTimeline('lash', 'Tongue Lash', [
    { id: 'draw', label: 'draw', dur: DRAW_SEC },
    { id: 'lash', label: 'lash', dur: STRIKE_SEC },
    { id: 'hold', label: 'struck', dur: HOLD_SEC },
    { id: 'reel', label: 'reel in', dur: REEL_SEC },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: DRAW_SEC, id: 'lash' }] }),
  flop: createTimeline('flop', 'Belly Flop', [
    { id: 'heave', label: 'heave', dur: HEAVE_SEC },
    { id: 'leap', label: 'leap', dur: LEAP_SEC },
    { id: 'land', label: 'land', dur: STRIKE_SEC },
    { id: 'hold', label: 'flopped', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: HEAVE_SEC, id: 'leap' }, { at: HEAVE_SEC + LEAP_SEC + STRIKE_SEC, id: 'flop' }] }),
  swallow: createTimeline('swallow', 'Swallow', [
    { id: 'gape', label: 'gape', dur: GAPE_SEC },
    { id: 'snap', label: 'snap', dur: STRIKE_SEC },
    { id: 'hold', label: 'shut', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: GAPE_SEC, id: 'swallow' }] }),
  rage: createTimeline('rage', 'Enraged', [
    { id: 'rise', label: 'swell', dur: 0.4 },
    { id: 'enraged', label: 'enraged', dur: 1.6 },
  ]),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (0 at rest):
//   crouch 0..1 the body lowers      pitch  body pitch, + nose down
//   reach  u the body moves forward  head   head pitch, + down
//   jaw    0..1 the mouth open       tongue 0..1 of the lane the tongue reaches
//   sac    0..1 the throat sac fills inflate 0..1 the body swells
//   air    0..1 off the floor        splay  0..1 the legs spread (in the air)
//   lift   0..1 the fore-feet off the floor (the heave)
//   wide   0..1 the feet planted wide (the flop)
//   squash 0..1 contact squash       shove  0..1 the recoil off a hit (B3)
//   rage   0..1 enraged
const KEYS = ['crouch', 'pitch', 'reach', 'head', 'jaw', 'tongue', 'sac', 'inflate', 'air', 'splay', 'lift', 'wide', 'squash', 'shove', 'rage'];
const restChannels = (C) => {
  for (const k of KEYS) C[k] = 0;
  return C;
};
const ZERO = restChannels({});
const pose = (o) => ({ ...ZERO, ...o });
const DRAWN = pose({ crouch: 0.2, pitch: -0.1, head: -0.18, jaw: 0.45, sac: 0.6 });
const LASHED = pose({ crouch: 0.1, pitch: 0.12, head: 0.12, jaw: 0.8, tongue: 1, sac: 0.2, squash: 1 });
const REELED = pose({ crouch: 0.15, pitch: 0.04, head: 0.04, jaw: 0.25, sac: 0.2 });
const HEAVED = pose({ crouch: 0.45, pitch: -0.34, head: -0.1, jaw: 0.2, sac: 0.5, inflate: 0.35, lift: 1 });
const FLOPPED = pose({ crouch: 0.6, pitch: 0.08, head: 0.1, jaw: 0.3, sac: 0.3, inflate: 0.2, wide: 1, squash: 1 });
const GAPING = pose({ crouch: 0.15, pitch: -0.08, reach: -0.1, head: -0.26, jaw: 1, sac: 1, inflate: 1 });
const SNAPPED = pose({ crouch: 0.3, pitch: 0.14, reach: 0.15, head: 0.2, jaw: 0, sac: 0.4, inflate: 0.35, squash: 1 });
const mix = (C, A, B, k) => {
  for (const key of KEYS) C[key] = A[key] + (B[key] - A[key]) * k;
  return C;
};

// `from` is the pose an ability starts out of (rest in the lab; in a fight
// whatever the toad was doing): every wind-up grows out of it (B1/B5).
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'lash') {
    // B9: drawn back through the warning, driven past rest on the lash
    if (s.id === 'draw') {
      mix(C, from, DRAWN, ease.inOut(Math.min(1, k * 1.5)));
      C.reach = lunge('pull', k).reach * 0.7;
    } else if (s.id === 'lash') {
      mix(C, DRAWN, LASHED, kick(k));
      const L = lunge('drive', k);
      C.reach = L.reach * 0.7;
      C.squash = (L.sx - 1) / 0.19;
    } else if (s.id === 'hold') {
      mix(C, LASHED, LASHED, 0);
      C.reach = 0.88 * 0.7;
      C.shove = recoil(k * HOLD_SEC); // B3: the catch yanks it back
    } else if (s.id === 'reel') {
      mix(C, LASHED, REELED, ease.inOut(k));
      C.tongue = 1 - ease.in(k);
      C.reach = 0.88 * 0.7 * (1 - ease.inOut(k)) + 0.1 * ease.inOut(k);
      C.shove = recoil(HOLD_SEC + k * REEL_SEC);
    } else {
      mix(C, ZERO, { ...REELED, reach: 0.1 }, settle(k));
      C.shove = recoil(HOLD_SEC + REEL_SEC + k * 0.5);
    }
  } else if (id === 'flop') {
    if (s.id === 'heave') mix(C, from, HEAVED, ease.inOut(Math.min(1, k * 1.3)));
    else if (s.id === 'leap') {
      // the flight: up off the hind legs, legs spread wide, nose tipping
      // over onto the landing; the last of the fall is the landing strike
      const span = LEAP_SEC + STRIKE_SEC;
      const u = (k * LEAP_SEC) / span;
      const air = Math.sin(Math.PI * u);
      mix(C, HEAVED, FLOPPED, ease.inOut(u));
      C.crouch = (1 - u) * 0.45 * (1 - air);
      C.squash = 0;
      C.wide = 0;
      C.lift = 0;
      C.air = air;
      C.splay = Math.min(1, air * 1.8);
      C.pitch = -0.34 + 0.5 * ease.inOut(u);
    } else if (s.id === 'land') {
      // the fall's last frames are the strike, ending on the hit
      const span = LEAP_SEC + STRIKE_SEC;
      const u = (LEAP_SEC + k * STRIKE_SEC) / span;
      const fall = Math.sin(Math.PI * Math.min(1, u)) * (1 - kick(k));
      mix(C, pose({ ...FLOPPED, squash: 0, crouch: 0.2, wide: 0 }), FLOPPED, kick(k));
      C.air = fall;
      C.splay = Math.min(1, fall * 1.8);
    } else if (s.id === 'hold') {
      mix(C, FLOPPED, FLOPPED, 0);
      C.shove = recoil(k * HOLD_SEC); // B3: the slap bounces it back
    } else {
      mix(C, ZERO, FLOPPED, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.6);
    }
  } else if (id === 'swallow') {
    if (s.id === 'gape') mix(C, from, GAPING, ease.inOut(Math.min(1, k * 1.3)));
    else if (s.id === 'snap') mix(C, GAPING, SNAPPED, kick(k));
    else if (s.id === 'hold') {
      mix(C, SNAPPED, SNAPPED, 0);
      C.shove = recoil(k * HOLD_SEC);
    } else {
      mix(C, ZERO, SNAPPED, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.6);
    }
  } else if (id === 'rage') {
    C.rage = s.id === 'rise' ? ease.out(k) : 1;
  }
  return C;
}

// --- Geometry.
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:mire-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  trunk: () => geo('trunk', () => new IcosahedronGeometry(1.0, 1), 501),
  belly: () => geo('belly', () => new IcosahedronGeometry(0.95, 1), 503),
  lip: () => geo('lip', () => new SphereGeometry(0.85, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), 505),
  lower: () => geo('lower', () => new SphereGeometry(0.85, 10, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 507),
  bulb: () => geo('bulb', () => new IcosahedronGeometry(0.24, 1), 509),
  wart: () => geo('wart', () => new IcosahedronGeometry(0.11, 0), 511, 0.16),
  gland: () => geo('gland', () => new IcosahedronGeometry(0.26, 0), 513),
  sac: () => geo('sac', () => new IcosahedronGeometry(0.42, 1), 515, 0.12),
  band: () => geo('band', () => new TorusGeometry(0.42, 0.05, 4, 14).rotateX(Math.PI / 2), 517),
  bar: () => geo('bar', () => new BoxGeometry(0.07, 1, 0.07).translate(0, 0.5, 0), 519),
  gem: () => geo('gem', () => new IcosahedronGeometry(0.055, 0), 521, 0.16),
  tongue: () => geo('tongue', () => new CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0), 523),
  tip: () => geo('tongue-tip', () => new IcosahedronGeometry(0.17, 0), 525),
  fUpper: () => geo('f-upper', () => limbBox(0.3, 0.26, FRONT_A, 0.7, 0.72), 527),
  fLower: () => geo('f-lower', () => limbBox(0.2, 0.18, FRONT_B, 0.8, 0.8), 529),
  hUpper: () => geo('h-upper', () => limbBox(0.5, 0.46, HIND_A, 0.62, 0.62), 531),
  hLower: () => geo('h-lower', () => limbBox(0.22, 0.2, HIND_B, 0.72, 0.72), 533),
  pad: () => geo('pad', () => new IcosahedronGeometry(0.2, 0), 535),
};

const _m = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
// a toad's elbows fold back and out; its great hind knees forward and out
const POLE_FL = new Vector3(-0.5, 0.2, -1);
const POLE_FR = new Vector3(0.5, 0.2, -1);
const POLE_HL = new Vector3(-0.8, 0.5, 1);
const POLE_HR = new Vector3(0.8, 0.5, 1);
const TONGUE_SEGS = 10;

export function buildMireKingFacet() {
  const group = new Group();
  group.name = 'boss-mireking';
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
  squashG.position.set(0, 0.9, 0);
  body.add(squashG);
  const torso = new Group();
  torso.position.set(0, -0.9, 0);
  squashG.add(torso);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const hide = track(flashable(TOAD));
  const dark = track(flashable(TOAD_DARK));
  const belly = track(flashable(TOAD_BELLY));
  const warty = track(flashable(WARTY));
  const rust = track(flashable(RUST));
  const tongueMat = track(flashable(TONGUE));
  const sacMat = new MeshBasicMaterial({ color: TELL_VIOLET, vertexColors: true, toneMapped: false, transparent: true, opacity: 0.85 });
  const mawMat = lit(PALETTE.godstuffViolet);
  const gemMat = new MeshBasicMaterial({ color: new Color(PALETTE.godstuffViolet), vertexColors: true, toneMapped: false });
  const irisMat = lit(PALETTE.godstuffVioletPeak);
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- A wide, low, lumpy body (it swells through the gape and the heave).
  const swell = new Group();
  swell.position.set(0, 0.9, -0.1);
  torso.add(swell);
  const bulk = new Group();
  bulk.position.set(0, -0.9, 0.1);
  swell.add(bulk);
  const trunk = mesh(G.trunk(), hide, bulk);
  trunk.scale.set(1.35, 0.75, 1.15);
  trunk.position.set(0, 0.95, -0.15);
  const under = mesh(G.belly(), belly, bulk);
  under.scale.set(1.25, 0.5, 1.05);
  under.position.set(0, 0.65, 0.05);
  // the saddle: warty plates over the back only, the flanks left smooth
  const spine = createSpine(5);
  [[0, 1.62, 0.55], [0, 1.72, 0.1], [0, 1.68, -0.4], [0, 1.52, -0.85], [0, 1.25, -1.2]].forEach(([x, y, z], i) => spine.pts[i].set(x, y, z));
  const coat = createPlateTube({ spine, rings: 7, around: 8, arc: Math.PI * 0.7, u0: 0.04, u1: 0.98, radius: (u) => 0.62 - 0.18 * u, plateMat: warty, tilt: 0.28, thick: 0.05, name: 'mire-saddle' });
  coat.update();
  coat.plates.scale.set(1.75, 1, 1);
  coat.plates.position.set(0, -0.62, 0);
  bulk.add(coat.plates);
  // warts down the flanks and over the rump, mottled dark
  const WARTS = 26;
  bulk.add(placeRow(G.wart(), dark, WARTS, (i, m) => {
    const side = i % 2 ? 1 : -1;
    const a = hash01(i, 3) * 1.1 + 0.25;
    const z = 0.45 - hash01(i, 7) * 1.45;
    const x = side * (1.3 * Math.sin(a)) * (0.92 - 0.15 * Math.max(0, -z - 0.6));
    const y = 0.95 + 0.72 * Math.cos(a) * 0.95;
    const sc = 0.7 + hash01(i, 11) * 0.8;
    m.makeScale(sc, sc * 0.75, sc).setPosition(x, y, z);
  }, { name: 'mire-warts', inkPx: PART_INK_PX, mottle: 0.2, seed: 81 }));
  // weed hanging off the back
  bulk.add(placeRow(wedge, dark, 5, (i, m) => {
    const x = (i - 2) * 0.3;
    lay(m, x, 1.2 + 0.05 * (i % 2), -1.0 - 0.06 * Math.abs(i - 2), x * 0.3, -1, -0.6, 0.14, 0.7 + 0.08 * (i % 2), 0.2);
  }, { name: 'mire-weed', inkPx: PART_INK_PX, mottle: 0.16, seed: 83 }));

  // --- The head is the front of the body: the lip and the jaw part.
  const head = new Group();
  head.position.set(0, 1.05, 0.75);
  torso.add(head);
  const lip = mesh(G.lip(), hide, head);
  lip.scale.set(1.25, 0.45, 0.75);
  // a lip of small plates along the mouth's edge
  head.add(placeRow(G.wart(), warty, 12, (i, m) => {
    const a = -Math.PI * 0.42 + (i / 11) * Math.PI * 0.84;
    m.makeScale(0.8, 0.35, 0.8).setPosition(Math.sin(a) * 1.02, 0.03, Math.cos(a) * 0.62);
  }, { name: 'mire-lip', inkPx: PART_INK_PX, mottle: 0.14, seed: 85 }));
  const jaw = new Group();
  head.add(jaw);
  const lower = mesh(G.lower(), belly, jaw);
  lower.scale.set(1.2, 0.35, 0.72);
  // the violet maw (seen as it opens)
  const maw = new Mesh(sharedGeo('facet:mire-maw', () => new SphereGeometry(0.6, 10, 6)), mawMat);
  maw.scale.set(1.3, 0.25, 0.8);
  maw.position.set(0, -0.02, 0.1);
  head.add(maw);
  const mawGlow = glow(PALETTE.godstuffViolet, 1.8, 0);
  mawGlow.position.set(0, 0.05, 0.6);
  head.add(mawGlow);
  // the throat sac under the jaw
  const sac = new Mesh(G.sac(), sacMat);
  sac.position.set(0, -0.32, 0.45);
  head.add(sac);
  const sacGlow = glow(PALETTE.godstuffViolet, 1.6, 0.2);
  sacGlow.position.set(0, -0.3, 0.75);
  head.add(sacGlow);
  // bulging eyes on top, violet-slit, under brow ridges; the glands behind
  const irises = [];
  for (const side of [-1, 1]) {
    mesh(G.bulb(), hide, head).position.set(side * 0.55, 0.42, -0.05);
    const iris = new Mesh(sharedGeo('facet:mire-iris', () => new IcosahedronGeometry(0.13, 1)), irisMat);
    iris.position.set(side * 0.62, 0.48, 0.12);
    head.add(iris);
    const slit = new Mesh(sharedGeo('facet:mire-slit', () => new BoxGeometry(0.16, 0.03, 0.03)), lit(PALETTE.voidCharcoal));
    slit.position.set(side * 0.64, 0.49, 0.24);
    head.add(slit);
    irises.push(iris);
  }
  head.add(placeRow(wedge, dark, 2, (i, m) => {
    const side = i ? 1 : -1;
    lay(m, side * 0.55, 0.6, 0.02, side * 0.25, 0.25, 1, 0.2, 0.36, 0.3, side * 0.2);
  }, { name: 'mire-brows', inkPx: PART_INK_PX, mottle: 0 }));
  bulk.add(placeRow(G.gland(), warty, 2, (i, m) => {
    const side = i ? 1 : -1;
    m.makeScale(1, 0.7, 1.5).setPosition(side * 0.72, 1.48, 0.18);
  }, { name: 'mire-glands', inkPx: PART_INK_PX, mottle: 0.1, seed: 87 }));
  // the crown: a band of rusted mill-grate bars, rivets and violet gems
  const crown = new Group();
  crown.position.set(0, 0.62, -0.25);
  head.add(crown);
  mesh(G.band(), rust, crown);
  crown.add(placeRow(G.bar(), rust, 7, (i, m) => {
    const a = (i / 7) * Math.PI * 2;
    const h = 0.38 + (i % 2) * 0.16;
    lay(m, Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42, Math.cos(a) * 0.2, 1, Math.sin(a) * 0.2, 1, h, 1);
  }, { name: 'mire-bars', inkPx: PART_INK_PX, mottle: 0.12, seed: 89 }));
  crown.add(placeRow(G.wart(), rust, 7, (i, m) => {
    const a = ((i + 0.5) / 7) * Math.PI * 2;
    m.makeScale(0.45, 0.45, 0.45).setPosition(Math.cos(a) * 0.45, 0.02, Math.sin(a) * 0.45);
  }, { name: 'mire-rivets', inkPx: PART_INK_PX, mottle: 0 }));
  const gems = placeRow(G.gem(), gemMat, 4, (i, m) => {
    const a = ((i * 2) / 7) * Math.PI * 2;
    m.makeTranslation(Math.cos(a) * 0.43, 0.42, Math.sin(a) * 0.43); // on the short bars' tops
  }, { name: 'mire-gems', ink: false, mottle: 0 });
  crown.add(gems);

  // --- The tongue: faceted segments from the mouth down the lane (in the
  // grow node, so it lies along the facing whatever the body does).
  const tongue = instancedPart(G.tongue(), tongueMat, TONGUE_SEGS, { name: 'mire-tongue', moving: true });
  grow.add(tongue);
  const tongueTip = mesh(G.tip(), tongueMat, grow);
  const pool = glow(PALETTE.godstuffViolet, 3.0, 0.1);
  pool.position.set(0, 0.06, 0.4);
  torso.add(pool);

  // --- Legs on locked feet: hands of four fingers, long webbed hind feet.
  const legs = LEGS.map(([hx, hy, hz, fx, fz, front, grp], i) => {
    const upper = new Group();
    mesh(front ? G.fUpper() : G.hUpper(), hide, upper);
    const lowerSeg = new Group();
    mesh(front ? G.fLower() : G.hLower(), dark, lowerSeg);
    const foot = new Group();
    const side = hx < 0 ? -1 : 1;
    mesh(G.pad(), dark, foot).scale.set(front ? 1.0 : 1.2, 0.32, front ? 1.0 : 1.5);
    foot.add(placeRow(wedge, dark, front ? 4 : 5, (j, m) => {
      const n = front ? 4 : 5;
      const a = (j - (n - 1) / 2) * (front ? 0.45 : 0.32) + side * (front ? 0.35 : 0.2);
      const len = front ? 0.3 : 0.48;
      lay(m, Math.sin(a) * 0.12, 0.02, Math.cos(a) * 0.12, Math.sin(a), 0.02, Math.cos(a), front ? 0.11 : 0.14, len, 0.25, Math.PI / 2);
    }, { name: front ? 'mire-fingers' : 'mire-toes', inkPx: PART_INK_PX, mottle: 0.1, seed: 91 + i }));
    grow.add(upper, lowerSeg, foot);
    const pole = front ? (side < 0 ? POLE_FL : POLE_FR) : side < 0 ? POLE_HL : POLE_HR;
    return { i, front, side, hipLocal: new Vector3(hx, hy, hz), home: [fx, fz], group: grp, upper, lower: lowerSeg, foot, a: front ? FRONT_A : HIND_A, b: front ? FRONT_B : HIND_B, pole, footH: FOOT_H, hip: null };
  });
  const shadow = groundShadow(1.5, 0.45, { deep: 1.3, wide: 1.1 });
  group.add(shadow);

  // --- Points (B8) and the hit envelope's tuning.
  const points = makePoints({
    mouth: [head, 0, -0.05, 0.62],
    chest: [torso, 0, 0.75, 0.9],
    sac: [head, 0, -0.32, 0.6],
    crown: [crown, 0, 0.4, 0],
    tip: [grow, 0, 0.5, MOUTH_Z],
  });
  const FOOT_NAMES = ['footFL', 'footFR', 'footHL', 'footHR'];
  const footPts = legs.map((L) => {
    const p = makePoints({ [FOOT_NAMES[L.i]]: [grow, 0, 0, 0] })[FOOT_NAMES[L.i]];
    points[FOOT_NAMES[L.i]] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 0, axis: 'y', midY: 0.95 };

  // --- Locked feet.
  body.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(body.matrix).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.24, lift: 0.18, minDur: 0.1, maxDur: 0.28, durPerSpeed: 0.04, lead: 0.6, flight: 2.6 } });
  const { gait } = legRig;
  const C = restChannels({});
  // the heave sets the hind feet back under it; the flop lands every foot wide
  const stance = (i, out) => {
    const L = legs[i];
    out.x += L.side * 0.22 * C.wide;
    if (L.front) out.z += 0.12 * C.wide;
    else out.z -= 0.1 * Math.max(0, C.crouch - 0.2);
    return out;
  };
  // the heave lifts the fore-feet off the floor, toward the chest
  const raise = (i) => (legs[i].front ? C.lift : 0);
  const raiseTo = (i, out) => {
    hipOf(legs[i], out);
    out.y -= 0.42;
    out.z += 0.22;
    return out;
  };
  // the flight: every leg spread wide
  const tuck = (i, out) => {
    const L = legs[i];
    hipOf(L, out);
    out.x += L.side * 0.45;
    out.y -= 0.35;
    out.z += L.front ? 0.45 : -0.6;
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
  let lastMode = 'wade';
  let rage = 0;
  let tongueLen = LAB_TONGUE;
  let replantPending = false;
  // the facing: the sim's (setYaw), or square to the lash's lane
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
    lastMode = 'wade';
    rage = 0;
    laneYaw = null;
    shownYaw = null;
    spawn.clear();
  }
  const begin = (id, t = 0) => {
    from = { ...C, air: 0, splay: 0, squash: 0, shove: 0, tongue: 0, lift: 0, rage: 0 };
    ab = { id, t };
  };

  // In game: each warning is its wind-up, stretched to the sim's ticks so the
  // strike lands on the resolve; the flop's flight is the sim's own.
  function drive(dt, e) {
    const T = e && e.telegraph ? e.telegraph : null;
    const mode = e ? e.mode || 'wade' : 'wade';
    const key = T ? `${T.attack}:${T.startTick}` : null;
    if (key && key !== telKey) {
      telAge = 0;
      const id = T.attack === 'lash' ? 'lash' : T.attack === 'flop' ? 'flop' : T.attack === 'swallow' ? 'swallow' : null;
      if (id) begin(id);
      // the tongue reaches the lane's far end from the mouth
      if (id === 'lash' && Number.isFinite(T.length)) tongueLen = Math.max(0.5, T.length - MOUTH_Z);
    }
    telKey = key;
    tel = T;
    if (tel) telAge += dt;
    if (T && T.attack === 'lash' && Number.isFinite(T.dirX)) laneYaw = Math.atan2(T.dirX, T.dirZ);
    else if (!(ab && ab.id === 'lash')) laneYaw = null;
    if (ab) {
      const tl = MIRE_ABILITIES[ab.id];
      if (ab.id === 'flop') {
        const leapAt = tl.startOf('leap');
        if (tel && mode === 'heave') {
          const span = Math.max(0.05, (tel.resolveTick - tel.startTick - LEAP_TICKS) / 60);
          ab.t = Math.min(leapAt - 1e-4, (HEAVE_SEC * telAge) / span);
        } else ab.t = Math.max(ab.t, leapAt) + dt;
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
      }
      if (ab.t >= tl.duration) {
        ab = null;
        laneYaw = null;
      }
    }
    lastMode = mode;
    if (ab) abilityChannels(ab.id, MIRE_ABILITIES[ab.id].sample(ab.t), C, from);
    else restChannels(C);
    rage += ((e && e.enraged ? 1 : 0) - rage) * (1 - Math.exp(-3 * dt));
    C.rage = Math.max(C.rage, rage);
    return C;
  }
  // a held contact: the blow taken on planted feet
  function holding() {
    if (!ab) return false;
    const ph = MIRE_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'lash' || ph === 'snap' || ph === 'hold' || (ab.id === 'flop' && ph === 'land' && C.air < 0.02);
  }

  function apply(dt, { locked, hpFrac, hold = false, airborne = false }) {
    gait.localVelocity(yaw, lv);
    const sp = Math.min(3, Math.hypot(lv.x, lv.z) / MIRE_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 && C.air < 0.02 ? Math.min(0.08, (lv.z / MIRE_WALK) * 0.04) : 0) - leanF) * k;
    // a waddle: the body rolls over each planted pair and bobs on the steps
    const bobY = 0.05 * gait.bob * Math.min(1, sp);
    const breath = 0.5 + 0.5 * Math.sin(idle * (1.8 + 1.4 * C.rage + (1 - hpFrac)));
    pivot.position.set(0, HIP_Y + bobY + 0.02 * Math.sin(idle * 1.6) - 0.22 * C.crouch + FLOP_H * C.air, PIVOT_Z + C.reach - 0.1 * C.shove);
    pivot.rotation.set(C.pitch + leanF, 0, 0.04 * gait.bob * Math.min(1, sp) * Math.sin(idle * 6));
    // the contact squash kept to a boss's size (Kesh's pick over B9's full
    // +19% / -9%): +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    swell.scale.set(1 + 0.04 * Math.sin(idle * 1.6) + 0.08 * C.inflate, 1 - 0.03 * Math.sin(idle * 1.6) + 0.06 * C.inflate, 1 + 0.03 * C.inflate);
    head.rotation.x = C.head;
    jaw.rotation.x = 0.68 * C.jaw;
    maw.scale.set(1.3, 0.25 + 0.9 * C.jaw, 0.8);
    mawGlow.material.opacity = Math.min(0.9, 0.75 * C.jaw * (0.4 + 0.6 * C.sac));
    sac.scale.setScalar(0.85 + 0.12 * breath + 0.7 * C.sac);
    sac.scale.y *= 0.75;
    sacMat.opacity = 0.7 + 0.25 * Math.max(breath * 0.6, C.sac);
    sacGlow.material.opacity = Math.min(0.85, 0.18 + 0.1 * breath + 0.5 * C.sac + 0.15 * C.rage);
    crown.rotation.z = 0.04 * Math.sin(idle * 1.3);
    gems.scale.setScalar(1 + 0.35 * C.rage * (0.5 + 0.5 * Math.sin(idle * 5)));
    // kept under the bloom: the eyes burn brighter only as it rages
    irisMat.color.copy(VIOLET).lerp(VIOLET_PEAK, 0.25 + 0.5 * C.rage).multiplyScalar(0.7 + 0.15 * Math.max(C.sac, C.lift));
    pool.material.opacity = 0.08 + 0.05 * breath + 0.2 * C.jaw * C.sac;
    shadow.scale.set(1 - 0.3 * C.air, 1 - 0.3 * C.air, 1);
    pivot.updateMatrix();

    // the tongue: from the mouth down the lane, a little wave as it reels
    points.mouth.updateWorldMatrix(true, false);
    points.mouth.getWorldPosition(_a);
    grow.worldToLocal(_a);
    const len = Math.max(0.001, C.tongue * tongueLen);
    const endY = 0.45;
      // each segment runs from one point of the curve to the next, so the
    // tongue stays one unbroken strap however it waves
    const at = (u, out) => out.set(0.12 * C.tongue * (1 - C.tongue) * 4 * Math.sin(u * 9 - idle * 30) * u, _a.y + (endY - _a.y) * u, _a.z + len * u);
    for (let i = 0; i < TONGUE_SEGS; i++) {
      const u0 = i / TONGUE_SEGS;
      at(u0, _b);
      at((i + 1) / TONGUE_SEGS, _c);
      _c.sub(_b);
      const w = C.tongue > 0.01 ? 0.22 - 0.06 * u0 : 0.0001;
      lay(_m, _b.x, _b.y, _b.z, _c.x, _c.y, _c.z, w, _c.length() * 1.08, w * 0.8);
      tongue.setMatrixAt(i, _m);
    }
    tongue.instanceMatrix.needsUpdate = true;
    tongueTip.visible = C.tongue > 0.02;
    tongueTip.position.set(0, endY, _a.z + len);
    points.tip.position.set(0, C.tongue > 0.02 ? endY : _a.y, _a.z + (C.tongue > 0.02 ? len : 0));

    legRig.update(dt, { space: yaw, stance, locked, air: Math.max(C.air, airborne ? 0.05 : 0), raise, raiseTo, tuck: C.splay > 0 ? tuck : null, hold });
    for (const L of legs) {
      const S = legRig.state[L.i];
      L.foot.rotation.set((L.front ? 0.5 : 0.3) * S.up, L.side * (L.front ? 0.3 : 0.15), 0);
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
    pose({ t, hpFrac = 1, e = null, turntable = false }) {
      const id = e ? e.id : lastId;
      // a new boss (or a rewound clock) spawns in; the flop's own flight is
      // never a jump, a jump in place only re-plants the feet
      const moved = Math.hypot(group.position.x - lastX, group.position.z - lastZ);
      const born = lastT === null || t < lastT || (e && id !== lastId);
      const fresh = born || (moved > 2.5 && !(e && (e.mode === 'flop' || lastMode === 'flop')));
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
      // the facing eases to the lane while it draws and lashes, and back to
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
      apply(dt, { locked: !turntable && g === 1 && !!e, hpFrac, hold: holding(), airborne: !!e && e.mode === 'flop' });
    },
    lab: {
      abilities: MIRE_ABILITIES,
      // the feet re-plant on the next pose's stance, once its channels are set
      reset() {
        reset();
        replantPending = true;
      },
      feet: () => gait.report(yaw),
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      tongueLength: () => C.tongue * tongueLen,
      gait,
      legs: legRig, // probes: where each leg's IK reached
      pose({ dt, ability = null, abT = 0, hpFrac = 1, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        tongueLen = LAB_TONGUE;
        if (ability && ability !== 'spawn') abilityChannels(ability, MIRE_ABILITIES[ability].sample(abT), C);
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
