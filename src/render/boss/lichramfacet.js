// THE LICH RAM, MODEL STANDARD (docs/MODEL_STANDARD.md). The Ashen Barrow's
// second boss rebuilt in the faceted look of Kesh's sample video, on top of
// the chibi ink style, keeping the classic's identity (render/boss/slice2.js
// buildLichram): a bone-pale ram skeleton, a long skull under two huge curled
// horns (the Horn Guard), violet grave-light in the eye sockets and a violet
// heart beating in the rib cage. What the standard adds:
//
//   * a real skeleton: a spine of vertebrae with their neural blades, six
//     pairs of faceted ribs curving round the heart, a sternum, a pelvis with
//     its iliac blades, shoulder blades, a tail of small bones; a boxed skull
//     with a nasal ridge, sunken sockets round the violet coals, a hinged jaw
//     with two rows of teeth; the horns as fourteen tapering segments a side
//     laid along a ram's spiral, ringed with growth ridges, violet runes down
//     their outer face that burn while the Horn Guard is up (Kesh's magic
//     template) and go dark while the horns are stuck in the floor;
//   * FOUR LOCKED HOOVES (render/facet/legs.js): thin bone legs with knobbed
//     joints reach the hooves by two-bone IK; it walks in diagonal pairs and
//     gallops through the Bone Rush with both pairs flying, a planted hoof
//     never sliding;
//   * the abilities as timelines driven by the sim (sim/bosses/lichram.js):
//       Bone Rush   wind (the 54-tick lane warning less one strike: the head
//                   drops, the horns level down the lane, the haunches load,
//                   a forehoof paws), burst (2.5 frames on the resolve: the
//                   B9 drive off the hind legs), run (held while the sim
//                   rushes it down the lane at 11 u/s: a low gallop), slam
//                   (2.5 frames as the rush ends: the horns into the floor,
//                   the forehooves braced a step ahead), held with a recoil,
//                   stuck (held through the sim's 75 ticks: the body sags on
//                   the buried horns, the runes dark), free (2.5 frames: the
//                   head wrenched out), settle with one overshoot;
//       Grave Call  gather (the last 30 ticks before the call, read ahead
//                   from the sim's cooldown, render only: the head rises, the
//                   heart swells, a forehoof lifts), stamp (2.5 frames on the
//                   call's tick: the hoof comes down, the head throws back
//                   and the jaw gapes), held with a recoil, settle;
//       Enraged     the eyes and the heart burn, the heart beats faster;
//   * the [M] beats (render/facet/beats.js): a spawn-in grow, named points
//     (the mouth, the right horn's tip as `tip`, the heart as `chest`, each
//     hoof), the shared hit envelope (`react`).
//
// Same interface as the classic (group, mats, setYaw, setFlash, pose), plus
// `lab`, `points`, `react`. Faces +Z. Render only: it reads the sim entity
// (mode, telegraph, nextGraveTick, guard, enraged) and never writes it.
import { AdditiveBlending, BoxGeometry, CircleGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { TELL_VIOLET } from '../enemies/style.js';
import { facetize, facetMaterial } from '../facet/material.js';
import { PART_INK_PX, createSpine, instancedPart, mottle, placeRow, wedgeGeometry } from '../facet/kit.js';
import { createTimeline, ease } from '../facet/timeline.js';
import { lay, limbBox, taperBox } from '../facet/shapes.js';
import { createLegs } from '../facet/legs.js';
import { GATHER_SEC, HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, lunge, makePoints, recoil, settle, spawnGrow } from '../facet/beats.js';

// --- Colour: the classic's recipe (slice2.js), no new hues: old bone and
// a darker bone toward the umber, and value steps of them.
const BONE = new Color(PALETTE.bone).multiplyScalar(0.82);
const BONE_DARK = new Color(PALETTE.bone).lerp(new Color(PALETTE.bruiseUmber), 0.45).multiplyScalar(0.75);
const BONE_PALE = BONE.clone().multiplyScalar(1.1);
const HORN = BONE_DARK.clone().multiplyScalar(0.94);
const HORN_RIDGE = BONE_DARK.clone().multiplyScalar(0.8);
const VIOLET = new Color(TELL_VIOLET);
const VIOLET_PEAK = new Color(PALETTE.godstuffVioletPeak);
const flashable = (c) => facetMaterial(c, { emissive: '#FFFFFF', emissiveIntensity: 0 });

function glow(size, opacity) {
  const g = makeGlowSprite({ color: '#9B7BF0', size, opacity });
  g.material.toneMapped = false;
  return g;
}

// --- Body plan (yaw space, faces +Z). The body pivots at the hind hips.
const HIP_Y = 1.05;
const PIVOT_Z = -0.98;
// [hip x, hip y, hip z, home x, home z, front, gait group]
const LEGS = [
  [-0.3, 1.08, 0.5, -0.44, 0.56, true, 0],
  [0.3, 1.08, 0.5, 0.44, 0.56, true, 1],
  [-0.3, HIP_Y, PIVOT_Z, -0.44, -1.02, false, 1],
  [0.3, HIP_Y, PIVOT_Z, 0.44, -1.02, false, 0],
];
const UPPER = 0.6;
const LOWER = 0.64;
const HOOF_H = 0.08;
export const LICHRAM_WALK = 1.2; // u/s, LICHRAM.moveSpeed
export const LICHRAM_RUSH = 11; // u/s, LICHRAM.rush.speed
export const CALL_LOAD_TICKS = 30; // the gather read ahead from the cooldown
const WIND_SEC = 54 / 60 - STRIKE_SEC; // the rush lane's warning
const RUN_SEC = 0.45; // the lab's rush (the sim's runs for the lane's length)
const STUCK_SEC = 0.9; // the lab's stuck (the sim's 75 ticks)
const CALL_SEC = CALL_LOAD_TICKS / 60;

export const LICHRAM_ABILITIES = Object.freeze({
  rush: createTimeline('rush', 'Bone Rush', [
    { id: 'wind', label: 'horns down', dur: WIND_SEC },
    { id: 'burst', label: 'burst', dur: STRIKE_SEC },
    { id: 'run', label: 'rush', dur: RUN_SEC },
    { id: 'slam', label: 'horns in', dur: STRIKE_SEC },
    { id: 'hold', label: 'lodged', dur: HOLD_SEC },
    { id: 'stuck', label: 'stuck', dur: STUCK_SEC },
    { id: 'free', label: 'wrench free', dur: STRIKE_SEC },
    { id: 'settle', label: 'settle', dur: 0.55 },
  ], { cues: [{ at: WIND_SEC, id: 'rush' }, { at: WIND_SEC + 2 * STRIKE_SEC + RUN_SEC, id: 'stuck' }] }),
  call: createTimeline('call', 'Grave Call', [
    { id: 'gather', label: 'gather', dur: CALL_SEC },
    { id: 'stamp', label: 'stamp', dur: STRIKE_SEC },
    { id: 'held', label: 'the graves crack', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: CALL_SEC, id: 'call' }] }),
  rage: createTimeline('rage', 'Enraged', [
    { id: 'rise', label: 'kindle', dur: 0.4 },
    { id: 'enraged', label: 'enraged', dur: 1.6 },
  ]),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (0 at rest):
//   load   0..1 the haunches sink    pitch  body pitch, + nose down
//   dip    u the whole body lowers   reach  u the body moves forward
//   step   0..1 the forehooves land a step ahead
//   head   head pitch, + down        gape   0..1 the jaw opens
//   lift   0..1 the head and neck rise (the call)
//   paw    0..1 the left forehoof paws   stamp 0..1 the right forehoof is raised
//   stride 0..1 a galloping crouch   sag   0..1 hung on the buried horns
//   squash 0..1 contact squash       shove 0..1 the recoil (B3)
//   fever  0..1 the grave-light flares   rage 0..1 enraged
const KEYS = ['load', 'pitch', 'dip', 'reach', 'step', 'head', 'gape', 'lift', 'paw', 'stamp', 'stride', 'sag', 'squash', 'shove', 'fever', 'rage'];
const restChannels = (C) => {
  for (const k of KEYS) C[k] = 0;
  return C;
};
const ZERO = restChannels({});
const pose = (o) => ({ ...ZERO, ...o });
const WOUND = pose({ load: 1, pitch: 0.08, dip: 0.08, head: 0.55, paw: 1, fever: 0.7 });
const BURST = pose({ load: 0.3, pitch: 0.12, dip: 0.1, head: 0.62, stride: 1, fever: 1 });
const RUNNING = pose({ load: 0.15, pitch: 0.1, dip: 0.14, head: 0.6, stride: 1, fever: 1 });
const SLAMMED = pose({ load: 0.2, pitch: 0.22, dip: 0.3, step: 1, head: 0.95, squash: 1, fever: 0.4 });
const STUCK = pose({ load: 0.35, pitch: 0.26, dip: 0.34, step: 1, head: 1.05, sag: 1 });
const FREED = pose({ load: 0.2, pitch: -0.1, dip: 0.04, step: 0.5, head: -0.3, gape: 0.5, fever: 0.8 });
const GATHERED = pose({ load: 0.35, pitch: -0.08, head: -0.35, lift: 1, stamp: 1, fever: 0.8 });
const STAMPED = pose({ load: 0.1, pitch: 0.04, dip: 0.12, step: 0.6, head: -0.65, lift: 0.8, gape: 1, squash: 1, fever: 1 });
const mix = (C, A, B, k) => {
  for (const key of KEYS) C[key] = A[key] + (B[key] - A[key]) * k;
  return C;
};

// `from` is the pose an ability starts out of (rest in the lab; in a fight
// whatever the Ram was doing): every wind-up grows out of it (B1/B5).
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'rush') {
    if (s.id === 'wind') {
      mix(C, from, WOUND, ease.inOut(Math.min(1, k * 1.4)));
      // the paw: the hoof lifts and comes down twice through the warning
      C.paw = WOUND.paw * Math.max(0, Math.sin(Math.PI * Math.min(1, k * 1.4) * 2)) * Math.min(1, k * 4);
      const L = lunge('pull', k);
      C.reach += L.reach * 0.6;
    } else if (s.id === 'burst') {
      mix(C, WOUND, BURST, kick(k));
      C.paw = 0;
      const L = lunge('drive', k);
      C.reach = L.reach * 0.6;
    } else if (s.id === 'run') {
      mix(C, BURST, RUNNING, ease.out(Math.min(1, k * 3)));
      C.reach = lunge('hold', 1).reach * 0.6 * (1 - 0.5 * Math.min(1, k * 3));
    } else if (s.id === 'slam') {
      const running = { ...RUNNING, reach: lunge('hold', 1).reach * 0.3 };
      mix(C, running, SLAMMED, kick(k));
    } else if (s.id === 'hold') {
      mix(C, SLAMMED, SLAMMED, 0);
      C.shove = recoil(k * HOLD_SEC); // B3: the horns' bite shoves it back
    } else if (s.id === 'stuck') {
      mix(C, SLAMMED, STUCK, ease.out(Math.min(1, k * 4)));
      C.squash = 1 - ease.out(Math.min(1, k * 3));
      C.shove = recoil(HOLD_SEC + k * STUCK_SEC);
    } else if (s.id === 'free') mix(C, STUCK, FREED, kick(k));
    else mix(C, ZERO, FREED, settle(k)); // B5: home with one overshoot
  } else if (id === 'call') {
    if (s.id === 'gather') mix(C, from, GATHERED, ease.inOut(k));
    else if (s.id === 'stamp') mix(C, GATHERED, STAMPED, kick(k));
    else if (s.id === 'held') {
      mix(C, STAMPED, STAMPED, 0);
      C.shove = recoil(k * HOLD_SEC);
    } else {
      mix(C, ZERO, STAMPED, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.5);
    }
  } else if (id === 'rage') {
    C.rage = s.id === 'rise' ? ease.out(k) : 1;
    C.fever = C.rage;
  }
  return C;
}

// --- Geometry.
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:lichram-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  skull: () => geo('skull', () => taperBox(0.4, 0.36, 0.5, 0.78, 0.8, 0.02), 401),
  muzzle: () => geo('muzzle', () => taperBox(0.28, 0.24, 0.42, 0.62, 0.66, 0.04), 403),
  jaw: () => geo('jaw', () => taperBox(0.24, 0.09, 0.44, 0.6, 0.8), 405),
  vertebra: () => geo('vertebra', () => new BoxGeometry(0.16, 1, 0.14), 407),
  rib: () => geo('rib', () => new CylinderGeometry(0.75, 1, 1, 5).translate(0, 0.5, 0), 409),
  bone: () => geo('bone', () => new CylinderGeometry(0.8, 1, 1, 6).translate(0, 0.5, 0), 411),
  pelvis: () => geo('pelvis', () => taperBox(0.5, 0.26, 0.34, 0.9, 1.1), 413),
  sternum: () => geo('sternum', () => new BoxGeometry(0.12, 0.08, 1.0), 415),
  upper: () => geo('upper', () => limbBox(0.1, 0.1, UPPER, 0.7, 0.7), 417),
  lower: () => geo('lower', () => limbBox(0.07, 0.07, LOWER, 0.8, 0.8), 419),
  hoof: () => geo('hoof', () => taperBox(0.15, HOOF_H, 0.18, 0.8, 0.6).translate(0, HOOF_H / 2, 0.02), 421, 0.12),
  knob: () => geo('knob', () => new IcosahedronGeometry(0.075, 0), 423),
  heart: () => geo('heart', () => new IcosahedronGeometry(0.17, 0), 425, 0.05),
  socket: () => sharedGeo('lichram-socket', () => new BoxGeometry(0.11, 0.1, 0.06)),
  coal: () => sharedGeo('lichram-coal', () => new IcosahedronGeometry(0.04, 0)),
};

// The horns: a ram's spiral in the head's space, mirrored by side. s runs
// 0..1 from the root on the skull to the tip; the curl runs from the top of
// the skull back, down behind the eye, and forward under it, the tip ahead.
const HORN_SEGS = 14;
function hornPoint(side, s, out) {
  const R = 0.31 - 0.14 * s;
  const th = s * 1.62 * Math.PI;
  out.set(side * (0.19 + 0.17 * s + 0.05 * s * s), 0.12 + R * Math.cos(th) - 0.1, 0.02 - R * Math.sin(th));
  return out;
}
const hornR = (s) => 0.1 * (1 - 0.72 * s) + 0.024;

const _m = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const POLE_FRONT = new Vector3(0, 0.1, 1);
const POLE_HIND = new Vector3(0, 0.1, -1);

function groundMist(radius, opacity) {
  const m = new Mesh(
    sharedGeo(`lichram-mist:${radius}`, () => new CircleGeometry(radius, 28)),
    new MeshBasicMaterial({ map: getRadialTexture(), color: new Color('#4B3A86'), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, opacity })
  );
  m.name = 'lichram-mist';
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.025;
  return m;
}

export function buildLichramFacet() {
  const group = new Group();
  group.name = 'boss-lichram';
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
  squashG.position.set(0, 1.1, -0.2);
  body.add(squashG);
  const torso = new Group();
  torso.position.set(0, -1.1, 0.2);
  squashG.add(torso);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const bone = track(flashable(BONE));
  const boneDark = track(flashable(BONE_DARK));
  const bonePale = track(flashable(BONE_PALE));
  const horn = track(flashable(HORN));
  const ridge = track(flashable(HORN_RIDGE));
  const violet = new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false });
  const coalMat = new MeshBasicMaterial({ color: VIOLET.clone(), toneMapped: false });
  const runeMat = new MeshBasicMaterial({ color: VIOLET.clone(), toneMapped: false, transparent: true, opacity: 0.8 });
  const hollow = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal), toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- The spine: vertebrae laid along a fixed curve from the withers to
  // the pelvis, each with a neural blade standing up off it.
  const spine = createSpine(6);
  [[0, 1.3, 0.72], [0, 1.36, 0.36], [0, 1.33, -0.02], [0, 1.28, -0.4], [0, 1.24, -0.76], [0, 1.22, -1.1]].forEach(([x, y, z], i) => spine.pts[i].set(x, y, z));
  const VERT = 10;
  const vertAt = (i, out) => spine.point((i + 0.5) / VERT, out);
  torso.add(placeRow(G.vertebra(), bone, VERT, (i, m) => {
    vertAt(i, _a);
    spine.point(Math.min(1, (i + 1) / VERT), _b);
    spine.point(Math.max(0, i / VERT), _c);
    _b.sub(_c);
    lay(m, _a.x, _a.y, _a.z, _b.x, _b.y, _b.z, 1, _b.length() * 0.78, 1);
  }, { name: 'lichram-vertebrae', inkPx: PART_INK_PX, mottle: 0.08, seed: 71 }));
  torso.add(placeRow(wedge, bonePale, VERT, (i, m) => {
    vertAt(i, _a);
    const h = 0.14 + 0.08 * Math.sin((i / (VERT - 1)) * Math.PI);
    lay(m, _a.x, _a.y + 0.05, _a.z, 0, 1, -0.45, 0.12, h, 0.5);
  }, { name: 'lichram-neural-blades', inkPx: PART_INK_PX, mottle: 0.1, seed: 73 }));
  // --- The rib cage: six ribs a side, each three faceted segments curving
  // down from the spine and round under the heart; a sternum ties them.
  const RIBS = 6;
  const RIB_SEGS = 3;
  const ribAt = (side, r, seg, out) => {
    const z = 0.5 - r * 0.24;
    const scale = 1 - Math.abs(r - 2) * 0.08;
    const a0 = (seg / RIB_SEGS) * Math.PI * 0.78;
    out.set(side * Math.sin(a0) * 0.46 * scale, 1.26 - (1 - Math.cos(a0)) * 0.52 * scale, z - 0.03 * seg);
    return out;
  };
  torso.add(placeRow(G.rib(), bone, RIBS * RIB_SEGS * 2, (i, m) => {
    const side = i < RIBS * RIB_SEGS ? -1 : 1;
    const j = i % (RIBS * RIB_SEGS);
    const r = Math.floor(j / RIB_SEGS);
    const seg = j % RIB_SEGS;
    ribAt(side, r, seg, _a);
    ribAt(side, r, seg + 1, _b);
    _c.subVectors(_b, _a);
    const w = 0.065 - 0.012 * seg;
    lay(m, _a.x, _a.y, _a.z, _c.x, _c.y, _c.z, w, _c.length() * 1.06, w * 1.4, side * 0.4);
  }, { name: 'lichram-ribs', inkPx: PART_INK_PX, mottle: 0.1, seed: 75 }));
  const sternum = mesh(G.sternum(), boneDark, torso);
  sternum.position.set(0, 0.76, -0.1);
  sternum.rotation.x = 0.04;
  // the heart: the violet grave-light beating in the cage
  const heart = mesh(G.heart(), violet, torso, false);
  heart.position.set(0, 1.0, 0.1);
  const heartGlow = glow(1.3, 0.3);
  heartGlow.position.copy(heart.position);
  torso.add(heartGlow);
  // --- The pelvis with its iliac blades, the tail bones hanging off it.
  const pelvis = mesh(G.pelvis(), bone, torso);
  pelvis.position.set(0, 1.12, -1.04);
  torso.add(placeRow(wedge, bonePale, 2, (i, m) => {
    const side = i ? 1 : -1;
    lay(m, side * 0.2, 1.24, -0.98, side * 0.5, 1, 0.3, 0.14, 0.24, 0.5, side * 0.4);
  }, { name: 'lichram-iliac', inkPx: PART_INK_PX, mottle: 0 }));
  const tail = new Group();
  tail.position.set(0, 1.14, -1.2);
  torso.add(tail);
  tail.add(placeRow(G.knob(), boneDark, 4, (i, m) => {
    m.makeTranslation(0, -0.05 * i * i, -0.12 * i);
    m.scale(new Vector3(0.8 - 0.12 * i, 0.8 - 0.12 * i, 0.8 - 0.12 * i));
  }, { name: 'lichram-tail', inkPx: PART_INK_PX, mottle: 0.08, seed: 77 }));
  // --- Shoulder blades over the forelegs.
  torso.add(placeRow(wedge, bonePale, 2, (i, m) => {
    const side = i ? 1 : -1;
    lay(m, side * 0.28, 1.08, 0.5, side * 0.35, 1, -0.4, 0.22, 0.34, 0.5, side * 0.9);
  }, { name: 'lichram-scapulae', inkPx: PART_INK_PX, mottle: 0 }));

  // --- Neck and head (the classic's placement: the head out ahead and up).
  const neck = new Group();
  neck.position.set(0, 1.3, 0.72);
  torso.add(neck);
  const neckBones = instancedPart(G.bone(), boneDark, 3, { name: 'lichram-neck', moving: true });
  mottle(neckBones, 0.08, 79);
  torso.add(neckBones);
  const head = new Group();
  torso.add(head);
  const skull = mesh(G.skull(), bone, head);
  skull.position.set(0, 0.04, 0.1);
  const muzzle = mesh(G.muzzle(), bonePale, head);
  muzzle.position.set(0, -0.02, 0.5);
  muzzle.rotation.x = 0.18;
  // the nasal ridge and the brow plates: the skull's mask
  head.add(placeRow(wedge, bonePale, 3, (i, m) => {
    if (i === 2) lay(m, 0, 0.14, 0.42, 0, 0.35, 1, 0.08, 0.34, 0.4);
    else {
      const side = i ? 1 : -1;
      lay(m, side * 0.14, 0.2, 0.3, side * 0.5, 0.25, 0.8, 0.18, 0.2, 0.5, side * 0.6);
    }
  }, { name: 'lichram-brow', inkPx: PART_INK_PX, mottle: 0 }));
  const jaw = new Group();
  jaw.position.set(0, -0.12, 0.2);
  head.add(jaw);
  mesh(G.jaw(), boneDark, jaw).position.set(0, -0.02, 0.26);
  // teeth: an upper row under the muzzle, a lower row on the jaw
  head.add(placeRow(wedge, bonePale, 8, (i, m) => {
    const side = i % 2 ? 1 : -1;
    const j = i >> 1;
    lay(m, side * (0.08 - 0.01 * j), -0.11, 0.42 + 0.08 * j, 0, -1, 0.1, 0.045, 0.07, 0.3);
  }, { name: 'lichram-teeth', inkPx: PART_INK_PX, mottle: 0, ink: false }));
  jaw.add(placeRow(wedge, bonePale, 6, (i, m) => {
    const side = i % 2 ? 1 : -1;
    const j = i >> 1;
    lay(m, side * (0.07 - 0.01 * j), 0.02, 0.26 + 0.08 * j, 0, 1, 0.1, 0.04, 0.06, 0.3);
  }, { name: 'lichram-teeth-lower', inkPx: PART_INK_PX, mottle: 0, ink: false }));
  // the sockets: dark hollows round the violet coals
  const coals = [];
  for (const side of [-1, 1]) {
    const sock = new Mesh(G.socket(), hollow);
    sock.position.set(side * 0.15, 0.08, 0.33);
    head.add(sock);
    const coal = new Mesh(G.coal(), coalMat);
    coal.position.set(side * 0.15, 0.08, 0.36);
    head.add(coal);
    coals.push(coal);
    const g = glow(0.45, 0.5);
    g.position.set(side * 0.15, 0.08, 0.38);
    head.add(g);
    coals.push(g);
  }
  // --- The horns: segments along the spiral, growth ridges every other
  // segment, violet runes down the outer face.
  const hornAt = (i, m, grow = 1, thick = 1) => {
    const side = i < HORN_SEGS ? -1 : 1;
    const j = i % HORN_SEGS;
    hornPoint(side, j / HORN_SEGS, _a);
    hornPoint(side, (j + 1) / HORN_SEGS, _b);
    _c.subVectors(_b, _a);
    const r = hornR(j / HORN_SEGS) * thick;
    lay(m, _a.x, _a.y, _a.z, _c.x, _c.y, _c.z, r, _c.length() * grow, r * 0.9, side * 0.3);
  };
  const horns = placeRow(G.bone(), horn, HORN_SEGS * 2, (i, m) => hornAt(i, m, 1.1, 1), { name: 'lichram-horns', inkPx: PART_INK_PX * 1.3, mottle: 0.07, seed: 81 });
  const hornRidges = placeRow(G.bone(), ridge, HORN_SEGS, (i, m) => {
    const k = i < HORN_SEGS / 2 ? i * 2 : (i - HORN_SEGS / 2) * 2 + HORN_SEGS;
    hornAt(k, m, 0.3, 1.14);
  }, { name: 'lichram-horn-ridges', inkPx: PART_INK_PX, mottle: 0.05, seed: 83 });
  const hornRunes = placeRow(wedge, runeMat, HORN_SEGS, (i, m) => {
    const side = i < HORN_SEGS / 2 ? -1 : 1;
    const j = (i % (HORN_SEGS / 2)) * 2 + 1;
    hornPoint(side, j / HORN_SEGS, _a);
    hornPoint(side, (j + 1) / HORN_SEGS, _b);
    _c.subVectors(_b, _a);
    const r = hornR(j / HORN_SEGS);
    lay(m, _a.x + side * r * 0.9, _a.y, _a.z, _c.x, _c.y, _c.z, 0.028, _c.length() * 0.6, 0.3, side * 0.3);
  }, { name: 'lichram-horn-runes', ink: false, mottle: 0 });
  head.add(horns, hornRidges, hornRunes);
  const hornTip = new Group();
  hornPoint(1, 1, _a);
  hornTip.position.copy(_a);
  head.add(hornTip);

  // --- Legs: thin bone shafts reaching the locked hooves by IK, a knob at
  // every joint, bone hooves flat on the floor.
  const legs = LEGS.map(([hx, hy, hz, fx, fz, front, grp], i) => {
    const upper = new Group();
    mesh(G.upper(), bone, upper);
    const lower = new Group();
    mesh(G.lower(), boneDark, lower);
    const hoof = new Group();
    mesh(G.hoof(), boneDark, hoof);
    grow.add(upper, lower, hoof);
    return { i, front, hipLocal: new Vector3(hx, hy, hz), home: [fx, fz], group: grp, upper, lower, foot: hoof, a: UPPER, b: LOWER, pole: front ? POLE_FRONT : POLE_HIND, footH: HOOF_H * 0.8, hip: null };
  });
  const knobs = instancedPart(G.knob(), bonePale, legs.length * 3, { name: 'lichram-joints', moving: true });
  mottle(knobs, 0.08, 85);
  grow.add(knobs);

  // --- Floor pieces (beside the envelope's node): the shadow and the grave
  // mist it stands in.
  const shadow = groundShadow(1.0, 0.4, { deep: 1.6 });
  group.add(shadow);
  const mist = groundMist(1.7, 0.16);
  group.add(mist);

  // --- Points (B8) and the hit envelope's tuning (§6.1 item 9: a boss takes
  // half the squash and flinch, no knockback overlay).
  const points = makePoints({
    mouth: [head, 0, -0.1, 0.72],
    tip: [hornTip, 0, 0, 0],
    chest: [torso, 0, 1.0, 0.1],
  });
  const HOOF_NAMES = ['hoofFL', 'hoofFR', 'hoofHL', 'hoofHR'];
  const hoofPts = legs.map((L) => {
    const p = makePoints({ [HOOF_NAMES[L.i]]: [grow, 0, 0, 0] })[HOOF_NAMES[L.i]];
    points[HOOF_NAMES[L.i]] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 0, axis: 'y', midY: 1.1 };

  // --- Locked hooves.
  body.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(body.matrix).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.4, lift: 0.22, minDur: 0.12, maxDur: 0.32, durPerSpeed: 0.05, lead: 0.6, flight: 3.0 } });
  const { gait } = legRig;
  const C = restChannels({});
  // stance: the forehooves brace a step ahead in the slam and the stamp
  const stance = (i, out) => {
    if (legs[i].front) out.z += 0.22 * C.step;
    else out.z -= 0.05 * C.step;
    return out;
  };
  // the pawing left forehoof, the raised right one
  const raise = (i) => (i === 0 ? C.paw : i === 1 ? C.stamp : 0);
  const raiseTo = (i, out) => {
    hipOf(legs[i], out);
    out.y -= i === 0 ? 0.82 : 0.6;
    out.z += i === 0 ? 0.3 : 0.14;
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
  let lastGraveTick = null;
  let rage = 0;
  let guardK = 1;
  let replantPending = false;
  // the facing: the sim's (setYaw), or square to the rush's lane
  let simYaw = 0;
  let shownYaw = null;
  let laneYaw = null;
  const lv = new Vector3();
  let leanF = 0;
  let leanS = 0;

  function reset() {
    lastT = null;
    ab = null;
    tel = null;
    telKey = null;
    lastMode = 'stalk';
    lastGraveTick = null;
    rage = 0;
    laneYaw = null;
    shownYaw = null;
    spawn.clear();
  }
  const begin = (id, t = 0) => {
    from = { ...C, squash: 0, shove: 0, paw: 0, stamp: 0, rage: 0 };
    ab = { id, t };
  };

  // In game: the rush's warning is its wind-up, stretched to the sim's ticks
  // so the burst lands on the resolve; the run, the slam and the stuck follow
  // the sim's modes. The call's gather is read ahead from the cooldown (the
  // last CALL_LOAD_TICKS before nextGraveTick) and its stamp lands on the
  // tick the graves are called (nextGraveTick moves on).
  function drive(dt, e, tick) {
    const T = e && e.telegraph ? e.telegraph : null;
    const mode = e ? e.mode || 'stalk' : 'stalk';
    const key = T ? `${T.attack}:${T.startTick}` : null;
    if (key && key !== telKey) {
      telAge = 0;
      if (T.attack === 'rush') begin('rush');
    }
    telKey = key;
    tel = T;
    if (tel) telAge += dt;
    if (T && T.attack === 'rush' && Number.isFinite(T.dirX)) laneYaw = Math.atan2(T.dirX, T.dirZ);
    else if (mode === 'rush' && e && (e.rushVx || e.rushVz)) laneYaw = Math.atan2(e.rushVx, e.rushVz);
    else laneYaw = null;
    const RU = LICHRAM_ABILITIES.rush;
    const CA = LICHRAM_ABILITIES.call;
    if (mode !== lastMode) {
      if (mode === 'rush') {
        if (!ab || ab.id !== 'rush') begin('rush', RU.startOf('run'));
        else ab.t = Math.max(ab.t, RU.startOf('run'));
      } else if (mode === 'stuck') {
        if (!ab || ab.id !== 'rush') begin('rush', RU.startOf('slam'));
        else ab.t = Math.max(ab.t, RU.startOf('slam'));
      } else if (lastMode === 'stuck' && ab && ab.id === 'rush') ab.t = Math.max(ab.t, RU.startOf('free'));
    }
    lastMode = mode;
    // the Grave Call: the gather read ahead, the stamp on the call's tick
    const ng = e && Number.isFinite(e.nextGraveTick) ? e.nextGraveTick : null;
    const fired = ng !== null && lastGraveTick !== null && ng > lastGraveTick;
    if (ng !== null && !T && mode === 'stalk') {
      const left = Number.isFinite(tick) ? ng - tick : Infinity;
      if (fired) {
        if (!ab || ab.id !== 'call') begin('call', CA.startOf('stamp') - GATHER_SEC);
        ab.t = Math.max(ab.t, CA.startOf('stamp'));
      } else if (left <= CALL_LOAD_TICKS && (!ab || (ab.id !== 'rush' && ab.id !== 'call'))) begin('call');
    }
    lastGraveTick = ng;
    if (ab) {
      const tl = LICHRAM_ABILITIES[ab.id];
      if (ab.id === 'rush') {
        const windEnd = RU.startOf('burst');
        if (tel && ab.t < windEnd) {
          const span = Math.max(0.05, (tel.resolveTick - tel.startTick) / 60 - STRIKE_SEC);
          ab.t = telAge < span ? Math.min(windEnd - 1e-4, (windEnd * telAge) / span) : windEnd;
        } else {
          ab.t = Math.max(ab.t, windEnd) + dt;
          // the burst may land ahead of the resolve on a slow frame (a 1 fps
          // machine), but it runs no further while the warning is live
          if (tel) ab.t = Math.min(ab.t, windEnd + STRIKE_SEC);
        }
        if (mode === 'rush') ab.t = Math.min(RU.startOf('slam') - 1e-4, ab.t);
        if (mode === 'stuck') ab.t = Math.min(RU.startOf('free') - 1e-4, ab.t);
      } else if (ab.id === 'call') {
        const gatherEnd = CA.startOf('stamp');
        if (ab.t < gatherEnd && !fired) {
          const left = Number.isFinite(tick) && ng !== null ? ng - tick : null;
          // the gather follows the cooldown down; a call the sim holds back
          // (the governor, a dead target) waits at the top of it
          if (left !== null) ab.t = Math.min(gatherEnd - 1e-4, Math.max(ab.t, (gatherEnd * (CALL_LOAD_TICKS - Math.max(0, left))) / CALL_LOAD_TICKS));
          else ab.t = Math.min(gatherEnd - 1e-4, ab.t + dt);
        } else ab.t = Math.max(ab.t, gatherEnd) + dt;
      } else ab.t += dt;
      if (ab.t >= tl.duration) ab = null;
    }
    if (ab) abilityChannels(ab.id, LICHRAM_ABILITIES[ab.id].sample(ab.t), C, from);
    else restChannels(C);
    rage += ((e && e.enraged ? 1 : 0) - rage) * (1 - Math.exp(-3 * dt));
    C.rage = Math.max(C.rage, rage);
    return C;
  }
  // a held contact: the slam, the stuck and the stamp are taken on planted hooves
  function holding() {
    if (!ab) return false;
    const ph = LICHRAM_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'slam' || ph === 'hold' || ph === 'stuck' || ph === 'stamp' || ph === 'held';
  }

  function apply(dt, { locked, hpFrac, hold = false, guard = true }) {
    gait.localVelocity(yaw, lv);
    const sp = Math.min(1.6, Math.hypot(lv.x, lv.z) / LICHRAM_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? Math.min(0.08, (lv.z / LICHRAM_WALK) * 0.04) : 0) - leanF) * k;
    leanS += ((sp > 0.05 ? (-lv.x / LICHRAM_WALK) * 0.03 : 0) - leanS) * k;
    guardK += ((guard ? 1 : 0) - guardK) * k;
    const bobY = 0.04 * gait.bob * Math.min(1, sp);
    const breathe = 0.01 * Math.sin(idle * 1.5);
    const rock = C.sag * 0.03 * Math.sin(idle * 6);
    pivot.position.set(0, HIP_Y + breathe + bobY - C.dip - 0.08 * C.load, PIVOT_Z + C.reach - 0.1 * C.shove);
    pivot.rotation.set(C.pitch + leanF + rock, 0, leanS);
    // the contact squash kept to a boss's size (Kesh's pick over B9's full
    // +19% / -9%): +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    // the neck: three bones from the withers to the skull, raised by `lift`
    const n0 = 0.45 - 0.5 * C.lift + 0.35 * C.head;
    const nl = 0.26;
    _a.set(0, 1.3, 0.72);
    for (let i = 0; i < 3; i++) {
      const a = n0 + (i - 1) * 0.08 * (1 - C.lift);
      _b.set(0, Math.cos(a) * nl, Math.sin(a) * nl);
      lay(_m, _a.x, _a.y, _a.z, _b.x, _b.y, _b.z, 0.1 - 0.01 * i, nl * 1.05, 0.1 - 0.01 * i);
      neckBones.setMatrixAt(i, _m);
      _a.add(_b);
    }
    neckBones.instanceMatrix.needsUpdate = true;
    head.position.copy(_a);
    head.rotation.set(C.head + 0.03 * Math.sin(idle * 1.5) * (1 - C.fever) + 0.03 * C.stride * Math.sin(idle * 18), 0.04 * Math.sin(idle * 0.5) * (1 - C.sag), 0);
    jaw.rotation.x = 0.5 * C.gape + 0.04 * Math.max(0, Math.sin(idle * 2.7)) * (1 - C.sag);
    tail.rotation.x = 0.2 + 0.1 * Math.sin(idle * 2.3) + 0.3 * C.load;
    pivot.updateMatrix();

    legRig.update(dt, { space: yaw, stance, locked, raise, raiseTo, hold });
    let n = 0;
    for (const L of legs) {
      const S = legRig.state[L.i];
      L.foot.rotation.set((L.front ? 0.7 : -0.5) * S.up, 0, 0);
      hoofPts[L.i].position.copy(L.foot.position);
      knobs.setMatrixAt(n++, _m.makeTranslation(S.hip.x, S.hip.y, S.hip.z));
      knobs.setMatrixAt(n++, _m.makeTranslation(S.knee.x, S.knee.y, S.knee.z));
      _m.makeTranslation(S.end.x, S.end.y, S.end.z);
      _m.scale(_c.set(0.7, 0.7, 0.7));
      knobs.setMatrixAt(n++, _m);
    }
    knobs.instanceMatrix.needsUpdate = true;

    // the grave-light: the heart beats, faster as it rages and weakens; the
    // runes burn with the guard and go dark while the horns are stuck
    const beat = 0.5 + 0.5 * Math.sin(idle * (3.2 + 2 * C.rage + (1 - hpFrac)));
    const fever = 0.55 + 0.2 * beat + (1 - hpFrac) * 0.3 + 0.3 * C.rage + 0.3 * C.fever;
    heart.scale.setScalar(1 + 0.15 * beat * fever + 0.2 * C.lift);
    heartGlow.material.opacity = Math.min(0.6, 0.22 * fever + 0.2 * C.lift);
    coalMat.color.copy(VIOLET).lerp(VIOLET_PEAK, 0.2 + 0.5 * Math.max(C.rage, C.fever));
    for (const c of coals) {
      if (c.isSprite) c.material.opacity = Math.min(0.95, 0.6 * fever);
      else c.scale.setScalar(1 + 0.3 * fever);
    }
    runeMat.opacity = Math.max(0, Math.min(0.9, (0.45 + 0.2 * beat + 0.3 * C.rage) * guardK * (1 - C.sag)));
    mist.material.opacity = 0.14 + 0.03 * Math.sin(idle * 1.3) + 0.12 * C.lift + 0.06 * C.rage;
    shadow.scale.set(1 + 0.1 * C.step, 1, 1);
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
    // pose: { t, hpFrac, e (the sim entity, read only), tick (the sim tick,
    // for the call's read-ahead), turntable }. A dying rig is posed with
    // e = null: it collapses in the pose it died in.
    pose({ t, hpFrac = 1, e = null, tick = null, turntable = false }) {
      const id = e ? e.id : lastId;
      // a new boss (or a rewound clock) spawns in; a jump in place (a hitch
      // mid-rush) only re-plants the hooves
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
      if (e || turntable) drive(dt, e, tick);
      // the facing eases to the lane while it winds up and rushes down it,
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
      const guard = !e || !e.guard || e.guard.active !== false;
      apply(dt, { locked: !turntable && g === 1 && !!e, hpFrac, hold: holding(), guard: guard && !(e && e.mode === 'stuck') });
    },
    lab: {
      abilities: LICHRAM_ABILITIES,
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
        if (ability && ability !== 'spawn') abilityChannels(ability, LICHRAM_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        const g = ability === 'spawn' ? spawnGrow(abT) : 1;
        grow.scale.setScalar(g);
        if (replantPending) {
          replantPending = false;
          pivot.updateMatrix();
          gait.reset(yaw, stance);
        }
        apply(dt, { locked: !rigid && g === 1, hpFrac, hold: false, guard: C.sag < 0.5 });
      },
    },
  };
}
