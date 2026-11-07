// BARROW SEXTON, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level III
// foes"). The classic sexton of enemies/barrowheart.js (a hunched coat on
// short bowed legs, a hump of shoulders, a wide hat over a sour face, a
// spade carried on the right shoulder and a lantern swinging from the left
// hand, its indigo flame the tell; it kneels to dig a snare and pats the
// earth when the snare is buried) with the sample video's technique laid ON
// TOP of its chibi ink look. What it gains:
//
//   * a faceted body with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd of each row): the coat cut into planes with its tails,
//     the pale scarf, the hump, a row of buttons and a patched elbow; the
//     head with the hat's brim and crown, the nose, the eyes baked black and
//     a stubbled jaw; the spade with its shaft, blade, step and grip; the
//     lantern's cage on its own row with the unlit flame and its glow;
//   * WORLD-LOCKED FEET (render/facet/foelegs.js): two bowed legs laid by
//     two-bone IK with boots, planted while they carry weight and stepping
//     along the real travel in a short shuffle (rule 2); the body leans
//     into the travel (rule 1); the arms are two-bone IK from the shoulders
//     to the hands the pose places, so the spade and the lantern always
//     hang off real elbows;
//   * the DIG (sim/enemies/sexton.js: mode 'dig' for 36 ticks, then the
//     snare is buried on the dig tick, sexton_dig and sexton_bury) as a
//     pure timeline (render/facet/timeline.js) in Kesh's 3-hit shape (§6.1
//     B1 to B6): it drops to a knee and the spade comes off the shoulder;
//     chop 1 is driven in from its right, chop 2 from its left, chop 3 the
//     two-handed stamp straight down (the biggest, B6), each overshoot
//     feeding the next; the BURY is the contact: the spade's flat pats the
//     earth on the sim's dig tick (B2) and holds there (B4); then it rises
//     and the spade goes back on the shoulder through rest (B5). A dig
//     spoiled by a stun (the sim's mode leaves 'dig' with no bury) rises at
//     once, nothing patted;
//   * the spawn-in grow (B7), named points (B8: the spade's blade, the
//     spade hand, the lantern), and the hit and death tuning.
//
// Faces +Z. Same contract as buildSexton (group, mats, setYaw, pose) plus
// lab, react, death, points. Render only: the sim, its timing, the snare
// and its plate (the enemy layer's) untouched.
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, MeshBasicMaterial, Quaternion, TorusGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { makeGlowSprite } from '../../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { SPAWN_SEC, bakeParts, createFoeClock, createFoeFrame, foeMaterial, foePart, lerpFields, namedPoint, spawnScale } from '../../facet/foe.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';

// The sim's sexton (sim/enemies/sexton.js S): 1.4 u/s, the dig 36 ticks.
const TICK_HZ = 60;
const SHUFFLE_SPEED = 1.4;
const DIG_SEC = 36 / TICK_HZ;
const TWO_PI = Math.PI * 2;
// The classic's colours (enemies/barrowheart.js C).
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const COAT = HIDE.ramDark.clone().lerp(new Color(PALETTE.bruiseUmber), 0.25).multiplyScalar(1.1);
const COAT_PALE = slate(0.18, 0.42);
const HAT = slate(0.22, 0.14);
const SKIN = HIDE.moleSnout.clone().multiplyScalar(0.85);
const IRON = HIDE.ramDark.clone().lerp(new Color(PALETTE.warmGrey), 0.35).multiplyScalar(0.9);
const WOOD = new Color(PALETTE.bruiseUmber).lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.7);
const CHARCOAL = new Color(PALETTE.voidCharcoal);

// --- Key poses. push (u, +z), crouch (u, the hips sunk), pitch (the spine's
// hunch, forward +), twist (+ toward its left), roll, head (down +); the
// spade hand (yaw space, u): sx, sy, sz; the spade's direction from the
// hand: sEl (elevation of the blade end, rad, up +), sAz (azimuth round y
// from +z, + toward its left); the lantern hand: lx, ly, lz; flame (0..1).
const REST = Object.freeze({ push: 0, crouch: 0, pitch: 0.3, twist: 0, roll: 0, head: -0.25, sx: 0.24, sy: 0.72, sz: 0.1, sEl: -0.7, sAz: Math.PI - 0.2, lx: -0.26, ly: 0.5, lz: 0.14, flame: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Down on a knee, the spade off the shoulder and before it.
const KNEEL = K({ push: 0.02, crouch: 0.16, pitch: 0.55, head: -0.4, sx: 0.2, sy: 0.5, sz: 0.3, sEl: -0.5, sAz: 0.1, lx: -0.3, ly: 0.3, lz: 0.2, flame: 0.4 });
// Chop 1, FROM ITS RIGHT: the spade raised to its right and driven down
// and across into the earth ahead.
const R1 = K({ push: 0.0, crouch: 0.14, pitch: 0.4, twist: -0.3, roll: -0.06, head: -0.3, sx: 0.36, sy: 0.82, sz: 0.0, sEl: 0.2, sAz: -0.9, lx: -0.3, ly: 0.32, lz: 0.18, flame: 0.5 });
const D1 = K({ push: 0.05, crouch: 0.2, pitch: 0.7, twist: 0.1, roll: 0.03, head: -0.45, sx: 0.14, sy: 0.4, sz: 0.4, sEl: -1.15, sAz: 0.3, lx: -0.3, ly: 0.28, lz: 0.22, flame: 0.6 });
// Chop 2, FROM ITS LEFT: swung up over to its left and driven down.
const R2 = K({ push: 0.0, crouch: 0.14, pitch: 0.42, twist: 0.3, roll: 0.06, head: -0.3, sx: -0.1, sy: 0.84, sz: 0.02, sEl: 0.25, sAz: 0.9, lx: -0.34, ly: 0.36, lz: 0.1, flame: 0.6 });
const D2 = K({ push: 0.05, crouch: 0.2, pitch: 0.7, twist: -0.1, roll: -0.03, head: -0.45, sx: 0.1, sy: 0.4, sz: 0.4, sEl: -1.15, sAz: -0.3, lx: -0.3, ly: 0.28, lz: 0.22, flame: 0.7 });
// Chop 3, THE STAMP (the biggest, §6.1 B6): both hands on the shaft, the
// spade raised high before it and stamped straight down, the whole hunch
// falling on it.
const R3 = K({ push: -0.04, crouch: 0.08, pitch: 0.2, head: -0.2, sx: 0.08, sy: 0.96, sz: 0.1, sEl: 0.55, sAz: 0.0, lx: -0.06, ly: 0.9, lz: 0.08, flame: 0.7 });
const D3 = K({ push: 0.08, crouch: 0.24, pitch: 0.8, head: -0.5, sx: 0.08, sy: 0.36, sz: 0.42, sEl: -1.3, sAz: 0.0, lx: -0.1, ly: 0.34, lz: 0.4, flame: 0.8 });
// The bury: the spade's flat pats the earth, the hunch bowed over it.
const PAT = K({ push: 0.1, crouch: 0.22, pitch: 0.85, head: -0.55, sx: 0.1, sy: 0.3, sz: 0.5, sEl: -1.45, sAz: 0.0, lx: -0.28, ly: 0.26, lz: 0.3, flame: 1 });
const CHOPS = [
  { label: 'the chop from its right', raise: R1, drive: D1 },
  { label: 'the chop from its left', raise: R2, drive: D2 },
  { label: 'the stamp', raise: R3, drive: D3 },
].map((v) => Object.freeze(v));
export const SEXTON_REST = REST;
export const SEXTON_CHOPS = Object.freeze(CHOPS);
// The dig: 36 ticks from the knee to the bury (the sim's), then the rise.
const CHOP_SEC = (DIG_SEC - 0.12) / 3;
const DIG_TL = createTimeline('dig', 'Dig a snare', [
  { id: 'kneel', label: 'down on a knee', dur: 0.12 },
  { id: 'chop1', label: 'the chop from its right', dur: CHOP_SEC },
  { id: 'chop2', label: 'the chop from its left', dur: CHOP_SEC },
  { id: 'chop3', label: 'the stamp', dur: CHOP_SEC },
  { id: 'bury', label: 'contact: the snare patted down', dur: 0.14 },
  { id: 'rise', label: 'up, the spade shouldered', dur: 0.3 },
  { id: 'rest', label: 'rest', dur: 0.2 },
]);
export const BURY_AT = DIG_TL.startOf('bury');
// Inside a chop: the raise (the first 45%), the drive, the hit held.
function chopPose(c, k, out) {
  const V = CHOPS[c];
  const prev = c === 0 ? KNEEL : CHOPS[c - 1].drive;
  if (k < 0.45) return lerpFields(out, prev, V.raise, ease.inOut(k / 0.45), FIELDS);
  if (k < 0.75) return lerpFields(out, V.raise, V.drive, ease.in((k - 0.45) / 0.3), FIELDS);
  return Object.assign(out, V.drive);
}
export function sextonDigPose(t, out = { ...REST }) {
  const s = DIG_TL.sample(t);
  if (s.id === 'kneel') return lerpFields(out, REST, KNEEL, ease.inOut(s.k), FIELDS);
  if (s.id === 'chop1') return chopPose(0, s.k, out);
  if (s.id === 'chop2') return chopPose(1, s.k, out);
  if (s.id === 'chop3') return chopPose(2, s.k, out);
  if (s.id === 'bury') {
    lerpFields(out, D3, PAT, ease.out(Math.min(1, s.k * 2.5)), FIELDS);
    // the pat: the flat presses twice
    out.sy -= 0.02 * Math.max(0, Math.sin(s.k * TWO_PI));
    return out;
  }
  if (s.id === 'rise') return lerpFields(out, PAT, REST, ease.inOut(s.k), FIELDS);
  return Object.assign(out, REST);
}
export const SEXTON_DIG = Object.freeze({
  id: 'dig',
  label: 'Dig a snare',
  duration: DIG_TL.duration,
  at(t) {
    const s = DIG_TL.sample(t);
    return { t: s.t, phase: s.id, label: `Dig a snare: ${s.label}` };
  },
  strikes: [BURY_AT],
  cues: [
    { at: 0, id: 'dig' },
    { at: BURY_AT, id: 'bury' },
  ],
  classicAt: (t) => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { mode: t < BURY_AT ? 'dig' : 'skulk', digTick: t >= BURY_AT ? 1 : -1 } }),
});
const GAP = DIG_TL.duration + 0.4;
export const SEXTON_DIGS = Object.freeze({
  id: 'digs',
  label: 'Dig string',
  duration: 2 * GAP + DIG_TL.duration,
  at(t) {
    const k = Math.max(0, Math.min(2, Math.floor(t / GAP)));
    const tt = t - k * GAP;
    const s = DIG_TL.sample(tt);
    return { t: tt, phase: s.id, label: `${k + 1}, Dig a snare: ${s.label}` };
  },
  strikes: [BURY_AT, GAP + BURY_AT, 2 * GAP + BURY_AT],
  cues: [0, GAP, 2 * GAP].flatMap((g) => [
    { at: g, id: 'dig' },
    { at: g + BURY_AT, id: 'bury' },
  ]),
  classicAt: (t) => {
    const tt = t - Math.max(0, Math.min(2, Math.floor(t / GAP))) * GAP;
    return { telegraphK: 0, lungeK: 0, fireK: 0, e: { mode: tt < BURY_AT ? 'dig' : 'skulk', digTick: tt >= BURY_AT ? 1 : -1 } };
  },
});
export const SEXTON_ABILITIES = Object.freeze({ dig: SEXTON_DIG, digs: SEXTON_DIGS });

// --- Geometry (built once for the session, shared by every sexton) --------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
let SET = null;
const SPINE_AT = new Vector3(0, 0.4, 0);
const HEAD_AT = new Vector3(0, 0.7, 0.12);
const SHAFT = [-0.3, 0.7]; // the shaft from the hand: down to the blade, up to the grip
function geos() {
  if (SET) return SET;
  const set = {};
  // The upper body (about the hips): the coat, its tails, the scarf, the
  // hump, a row of buttons, a patched elbow.
  set.torso = bakeParts('sexton:torso', () => {
    const out = [
      { geo: fz(new CylinderGeometry(0.17, 0.25, 0.62, 7), 0.08, 1501), m: M(0, 0.3, 0), tint: COAT },
      { geo: fz(new ConeGeometry(0.28, 0.36, 7, 1, true), 0.1, 1503), m: M(0, -0.02, 0), tint: COAT },
      { geo: fz(new TorusGeometry(0.13, 0.045, 5, 10), 0.06, 1505), m: M(0, 0.6, 0.02, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tint: COAT_PALE },
      { geo: fz(new IcosahedronGeometry(0.17, 0), 0.1, 1507), m: M(0, 0.6, -0.06, 1.25, 0.8, 1.0), tint: COAT },
      { geo: fz(new BoxGeometry(0.06, 0.05, 0.02), 0.1, 1509), m: M(0.14, 0.5, 0.17, 1, 1, 1, qa(0, 1, 0, 0.5)), tint: COAT_PALE, tone: 0.8 },
    ];
    const button = fz(new IcosahedronGeometry(0.014, 0), 0, 1);
    for (let i = 0; i < 4; i++) out.push({ geo: button, m: M(0.03, 0.14 + i * 0.1, 0.23 - i * 0.01), tint: IRON });
    return out;
  });
  // The head (about the neck): the face, the nose, the stubbled jaw, the
  // eyes baked black, the hat's brim and crown.
  set.head = bakeParts('sexton:head', () => [
    { geo: fz(new IcosahedronGeometry(0.1, 1), 0.1, 1511), m: M(0, 0, 0, 0.9, 1.0, 0.95), tint: SKIN },
    { geo: fz(new ConeGeometry(0.025, 0.09, 4), 0.1, 1513), m: M(0, -0.01, 0.1, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tint: SKIN },
    { geo: fz(new BoxGeometry(0.1, 0.035, 0.05), 0.1, 1515), m: M(0, -0.07, 0.06), tint: SKIN, tone: 0.75 },
    { geo: fz(new BoxGeometry(0.035, 0.016, 0.02), 0, 1), m: M(0.04, 0.03, 0.085), tint: CHARCOAL },
    { geo: fz(new BoxGeometry(0.035, 0.016, 0.02), 0, 1), m: M(-0.04, 0.03, 0.085), tint: CHARCOAL },
    { geo: fz(new CylinderGeometry(0.27, 0.28, 0.025, 12), 0.06, 1517), m: M(0, 0.1, -0.01, 1, 1, 1, qa(1, 0, 0, 0.18)), tint: HAT },
    { geo: fz(new CylinderGeometry(0.11, 0.13, 0.16, 8), 0.06, 1519), m: M(0, 0.19, -0.025, 1, 1, 1, qa(1, 0, 0, 0.18)), tint: HAT },
    { geo: fz(new TorusGeometry(0.125, 0.012, 3, 10), 0.04, 1521), m: M(0, 0.12, -0.015, 1, 1, 1, qa(1, 0, 0, Math.PI / 2 + 0.18)), tint: COAT_PALE, tone: 0.7 },
  ]);
  // A limb bone (y 0..1, tapering), a boot.
  set.bone = fz(new CylinderGeometry(0.8, 1, 1, 5).translate(0, 0.5, 0), 0.08, 1531);
  set.boot = bakeParts('sexton:boot', () => [{ geo: fz(new BoxGeometry(0.1, 0.07, 0.18), 0.08, 1533), m: M(0, 0.035, 0.04), tint: HAT }]);
  // The spade (about the hand; its shaft along y, the blade at -y): the
  // shaft, the blade with its step, the grip.
  set.spade = bakeParts('sexton:spade', () => [
    { geo: fz(new CylinderGeometry(0.02, 0.02, SHAFT[1] - SHAFT[0], 5), 0.05, 1541), m: M(0, (SHAFT[0] + SHAFT[1]) / 2, 0), tint: WOOD },
    { geo: fz(new BoxGeometry(0.16, 0.2, 0.025), 0.06, 1543), m: M(0, SHAFT[0] - 0.08, 0), tint: IRON },
    { geo: fz(new ConeGeometry(0.08, 0.08, 4), 0.06, 1545), m: M(0, SHAFT[0] - 0.21, 0, 1, 1, 0.3, qa(0, 0, 1, Math.PI).multiply(qa(0, 1, 0, Math.PI / 4))), tint: IRON },
    { geo: fz(new BoxGeometry(0.18, 0.02, 0.03), 0, 1), m: M(0, SHAFT[0] + 0.02, 0), tint: IRON, tone: 0.8 },
    { geo: fz(new BoxGeometry(0.12, 0.03, 0.03), 0.06, 1547), m: M(0, SHAFT[1], 0), tint: WOOD },
  ]);
  // The lantern (about its bail): the cage.
  set.cage = bakeParts('sexton:cage', () => {
    const out = [
      { geo: fz(new CylinderGeometry(0.06, 0.07, 0.025, 6), 0.05, 1551), m: M(0, -0.17, 0), tint: IRON },
      { geo: fz(new ConeGeometry(0.07, 0.06, 6), 0.05, 1553), m: M(0, -0.01, 0), tint: IRON },
      { geo: fz(new TorusGeometry(0.025, 0.006, 3, 8), 0, 1), m: M(0, 0.035, 0), tint: IRON },
    ];
    const rod = fz(new CylinderGeometry(0.007, 0.007, 0.12, 3), 0, 1);
    for (let i = 0; i < 4; i++) out.push({ geo: rod, m: M(Math.cos((i * Math.PI) / 2) * 0.06, -0.1, Math.sin((i * Math.PI) / 2) * 0.06), tint: IRON });
    return out;
  });
  set.flame = fz(new ConeGeometry(0.035, 0.1, 5), 0.06, 1555);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Legs: 0 left (+x), 1 right. Hips in body space, feet homes on the floor.
const HIPS = [new Vector3(0.11, 0.38, 0), new Vector3(-0.11, 0.38, 0)];
const HOMES = [new Vector3(0.13, 0, 0.02), new Vector3(-0.13, 0, 0.02)];
const KNEE = [new Vector3(0.3, 0, 1).normalize(), new Vector3(-0.3, 0, 1).normalize()];
const LEG = [0.2, 0.19];
const ANKLE_Y = 0.05;
// Arms: shoulders in spine space (right, left); the elbow's pole.
const SHOULDERS = [new Vector3(0.22, 0.58, 0.02), new Vector3(-0.22, 0.58, 0.04)];
const ARM = [0.22, 0.21];
const ELBOW = [new Vector3(1, -0.5, -0.5).normalize(), new Vector3(-1, -0.5, -0.5).normalize()];
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildSextonFacet() {
  const G = geos();
  const F = createFoeFrame('sexton');
  const { body, spawn, track } = F;
  const mat = track(foeMaterial('#FFFFFF'));
  const flameMat = new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
  const spine = foePart(G.torso, mat, 'full', 'sexton-torso');
  spine.position.copy(SPINE_AT);
  body.add(spine);
  const head = foePart(G.head, mat, 'full', 'sexton-head');
  head.position.copy(HEAD_AT);
  spine.add(head);
  // the rows: 8 limb bones (coat sleeves and trousers), 2 boots; the spade
  // and the lantern placed by the hands
  const bones = instancedPart(G.bone, mat, 8, { name: 'sexton-bones', moving: true, inkPx: 1.8 });
  for (let i = 0; i < 8; i++) bones.setColorAt(i, COAT);
  const boots = instancedPart(G.boot, mat, 2, { name: 'sexton-boots', moving: true, inkPx: 1.6 });
  const spade = foePart(G.spade, mat, 'full', 'sexton-spade');
  spade.matrixAutoUpdate = false;
  const lantern = foePart(G.cage, mat, 'part', 'sexton-lantern');
  const flame = foePart(G.flame, flameMat, false, 'sexton-flame');
  flame.position.y = -0.1;
  lantern.add(flame);
  const glow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.7, opacity: 0.3 });
  glow.material.toneMapped = false;
  glow.material.color.copy(TELL_INDIGO_GLOW);
  glow.name = 'sexton-lamp-glow';
  glow.position.y = -0.1;
  lantern.add(glow);
  for (const o of [bones, boots, spade, lantern]) spawn.add(o);
  F.group.add(groundShadow(0.32, 0.7, { forward: 0.08 }));

  // Named points (B8): the spade's blade, the spade hand, the lantern.
  const blade = namedPoint(spawn, 'sexton-blade', 0, 0.4, 0.3);
  const hand = namedPoint(spawn, 'sexton-hand', 0.24, 0.72, 0.1);
  const lamp = namedPoint(spawn, 'sexton-lamp', -0.26, 0.4, 0.14);

  const gait = createLegs({ homes: HOMES, groups: [[0], [1]], trigger: 0.08, reach: 0.2, lift: 0.06, durMin: 0.12, durMax: 0.22 });
  const clock = createFoeClock();
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const m = new Matrix4();
  const tm = new Matrix4();
  const A = new Vector3();
  const B = new Vector3();
  const C = new Vector3();
  const D = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const UP = new Vector3(0, 1, 0);
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  let age = -1;
  let yawNow = 0;
  let leanW = 1;
  const lifted = [0, 0];
  const gaitOpts = { locked: true };
  // the live dig: its start (the rig clock), the bury seen, a spoil
  let digAt = null;
  let buried = false;
  let spoilAt = null;
  const spoilFrom = { ...REST };
  let wasDig = null;
  let lastDigTick = null;
  const strike = { id: 'bury', tick: 0 };

  const lab = {
    abilities: SEXTON_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => gait.feet().map((p, i) => ({ ...p, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur }),
    get hit() {
      if (digAt === null) return -1;
      const s = DIG_TL.sample(clock.now - digAt);
      return s.id === 'chop1' ? 0 : s.id === 'chop2' ? 1 : s.id === 'chop3' || s.id === 'bury' ? 2 : -1;
    },
    parts: { body, spine, head, bones, spade, lantern },
  };

  function liveDig(now, tick, e) {
    const digging = e ? e.mode === 'dig' : false;
    const dt = e && Number.isFinite(e.digTick) ? e.digTick : -1;
    if (lastDigTick === null) lastDigTick = dt;
    let bury = false;
    if (dt !== lastDigTick) {
      bury = dt >= 0;
      lastDigTick = dt;
    }
    if (wasDig === null) wasDig = digging;
    if (digging && !wasDig) {
      digAt = now;
      buried = false;
      spoilAt = null;
    }
    if (bury) {
      // the pat lands on the sim's dig tick: the timeline is at its bury
      if (digAt === null || now - digAt < BURY_AT) digAt = now - BURY_AT;
      buried = true;
      strike.tick = dt;
      lab.lastStrike = strike;
    }
    if (!digging && wasDig && !buried && !bury && digAt !== null && now - digAt < BURY_AT) {
      // spoiled by a stun: up at once, nothing patted
      spoilAt = now;
      Object.assign(spoilFrom, cur);
      digAt = null;
    }
    wasDig = digging;
    if (spoilAt !== null) {
      const k = Math.min(1, (now - spoilAt) / 0.25);
      lerpFields(cur, spoilFrom, REST, ease.inOut(k), FIELDS);
      if (k >= 1) spoilAt = null;
      return true;
    }
    if (digAt === null) {
      Object.assign(cur, REST);
      return false;
    }
    let t = now - digAt;
    // the sim's dig holds the knee until the bury: never past the stamp
    if (!buried && t > BURY_AT - 1e-6) t = BURY_AT - 1e-6;
    sextonDigPose(t, cur);
    if (t >= DIG_TL.duration) digAt = null;
    return true;
  }

  // an arm: two-bone IK from the shoulder (spine) to the hand (yaw space)
  function arm(i, handAt, row) {
    C.copy(handAt);
    A.copy(SHOULDERS[i]).applyMatrix4(tm);
    D.subVectors(C, A);
    const far = (ARM[0] + ARM[1]) * 0.98;
    if (D.length() > far) C.copy(A).addScaledVector(D.normalize(), far);
    solveKnee(A, C, ARM[0], ARM[1], ELBOW[i], B);
    bones.setMatrixAt(row, segmentMatrix(m, A, B, 0.045, 0.045, 0.02));
    bones.setMatrixAt(row + 1, segmentMatrix(m, B, C, 0.04, 0.04, 0.02));
    return C;
  }

  function pose(P) {
    const dt = clock.step(P);
    const now = clock.now;
    const tt = P.t ?? 0;
    const e = P.e || null;
    const tick = Number.isFinite(P.tick) && !P.turntable ? clock.tick : (P.tick ?? 0);
    const turntable = !!P.turntable;
    if (age < 0) age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    spawn.scale.setScalar(spawnScale(age));

    // --- the dig: the lab's pure override, or the sim's
    let busy;
    if (lab.override) {
      const ab = SEXTON_ABILITIES[lab.override.id] || SEXTON_DIG;
      const h = ab.at(lab.override.t);
      sextonDigPose(h.t, cur);
      busy = h.phase !== 'rest';
      digAt = null;
      wasDig = null;
      lastDigTick = null;
    } else busy = liveDig(now, tick, e);

    // --- feet: locked to the floor, a short shuffle
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    gaitOpts.locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override);
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = clamp1(lv.z / SHUFFLE_SPEED);
    const side = clamp1(lv.x / SHUFFLE_SPEED);
    leanW += ((!busy ? 1 : 0) - leanW) * Math.min(1, dt * 10);

    // --- the hips and the hunch: sunk by the crouch, bobbing on each step,
    // leaning into the travel; the spine bent and turned by the dig
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const ph = id * 0.9;
    const breath = Math.sin(tt * 1.4 + ph);
    body.position.set(0, -cur.crouch - 0.02 * bob, cur.push);
    body.rotation.set(0.06 * fwd * leanW, 0, -0.05 * side * leanW + cur.roll);
    body.updateMatrix();
    spine.rotation.set(cur.pitch + 0.02 * breath, cur.twist, 0.04 * Math.sin(gait.speed > 0.2 ? tt * 3.6 : 0) * leanW);
    spine.updateMatrix();
    head.rotation.set(cur.head, -0.3 * cur.twist, 0);
    tm.multiplyMatrices(body.matrix, spine.matrix);

    // --- legs: the hips ride the body, the feet stand where the gait put
    // them; a kneel folds the right knee to the floor
    for (let i = 0; i < 2; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      foot.y += ANKLE_Y;
      lifted[i] = liftToReach(hipW, foot, LEG[0], LEG[1]);
      if (clampReach(hipW, foot, LEG[0], LEG[1]) > 1e-4) {
        gait.release(i);
        lifted[i] = Math.max(lifted[i], 1e-3);
      }
      solveKnee(hipW, foot, LEG[0], LEG[1], KNEE[i], knee);
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, 0.05, 0.05, 0.02));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, 0.045, 0.045, 0.02));
      Z.set(0, 0, 1);
      X.set(1, 0, 0);
      Y.set(0, 1, 0);
      C.set(foot.x, foot.y - ANKLE_Y, foot.z);
      setTRS(m, C, X, Y, Z, 1, 1, 1);
      boots.setMatrixAt(i, m);
    }

    // --- the spade arm: the hand where the pose puts it, the shaft along
    // its elevation and azimuth (the blade end never through the floor)
    const swing = 0.03 * Math.sin(tt * 3.6) * Math.min(1, gait.speed / SHUFFLE_SPEED) * leanW;
    D.set(cur.sx, cur.sy - cur.crouch, cur.sz + swing);
    const hr = arm(0, D, 4);
    hand.position.copy(hr);
    const ce = Math.cos(cur.sEl);
    // the blade end of the shaft lies along -y of the spade: point y up the
    // shaft toward the grip, so the blade direction is its negative
    Y.set(-Math.sin(cur.sAz) * ce, -Math.sin(cur.sEl), -Math.cos(cur.sAz) * ce);
    if (hr.y + Y.y * SHAFT[0] < 0.02) Y.y = (0.02 - hr.y) / SHAFT[0];
    Y.normalize();
    X.crossVectors(UP, Y);
    if (X.lengthSq() < 1e-6) X.set(1, 0, 0);
    X.normalize();
    Z.crossVectors(X, Y);
    setTRS(spade.matrix, hr, X, Y, Z, 1, 1, 1);
    spade.matrixWorldNeedsUpdate = true;
    blade.position.copy(hr).addScaledVector(Y, SHAFT[0] - 0.1);
    // --- the lantern arm: the lantern hangs plumb from the hand on its
    // bail, swinging as it walks
    D.set(cur.lx, cur.ly - cur.crouch, cur.lz - swing);
    const hl = arm(1, D, 6);
    lantern.position.copy(hl);
    lantern.rotation.set(0.15 * Math.sin(tt * 2.2 + ph) + 0.3 * fwd * leanW, 0, 0.12 * Math.sin(tt * 1.7 + ph) - 0.2 * side * leanW);
    lamp.position.copy(hl);
    lamp.position.y -= 0.1;
    // the tell: the flame gutters at rest and flares through the dig
    flame.scale.set(1, 1 + 0.3 * Math.sin(tt * 13 + ph) + 0.8 * cur.flame, 1);
    glow.material.opacity = 0.26 + 0.05 * Math.sin(tt * 9 + ph) + 0.45 * cur.flame;
    glow.scale.setScalar(0.7 * (1 + 0.5 * cur.flame));
    bones.instanceMatrix.needsUpdate = true;
    boots.instanceMatrix.needsUpdate = true;
  }
  return {
    group: F.group,
    mats: F.mats,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    pose,
    lab,
    modelStandard: true,
    body: F.yaw,
    points: { tip: blade, hand, lamp },
    // §6.1 item 9: a short hunched man: a full squash, a full flinch, a
    // short knock; the flinch bulges at the hump.
    react: { squash: 1, flinch: 1, knock: 0.8, axis: 'y', midY: 0.7 },
    death: { swell: 1, throw: 0.8 },
  };
}
