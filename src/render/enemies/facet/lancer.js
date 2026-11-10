// VEIN LANCER, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level IV foes").
// The classic lancer of enemies/heart.js (a tall thin stilt-legged figure in a
// ragged near-black mantle with bone pauldrons, a long skull with a violet
// crest seam, a vein-spear of the Heart's violet in its right hand, drawn
// back over the shoulder to aim and thrust on the throw, reforming in its
// hand from the veins) with the sample video's technique laid ON TOP of its
// chibi ink look. What it gains:
//
//   * faceted masses with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd, every tone in one white material's vertex colours): the
//     ragged skirt cut into hanging strips, the narrow torso under a rope of
//     bone beads, the pointed mantle with its torn hem and the two hooked
//     bone pauldrons, the long skull with its sunken sockets and the crest
//     seam, bone hands and stilt feet;
//   * WORLD-LOCKED FEET (render/facet/foelegs.js): two stilt legs laid by
//     two-bone IK onto feet pinned to the floor while they carry weight,
//     stepping along the real travel (the sim's 1.5 u/s, the circling
//     between throws steps sideways), the body leaning into the travel
//     (rule 1); planted for the whole aim;
//   * the ARMS by IK from the shoulders to the hands (rule 3), the SPEAR
//     carried in the right hand (the unlit vein material, driven: it
//     brightens as it aims), its point glowing;
//   * the LANCE on the sim's 54-tick lane telegraph (sim/enemies/lancer.js,
//     mode 'aim'; render/facet/foestrike.js). The lane is the coil: planted,
//     the body twisted away, the spear drawn back and brightening, the off
//     hand pointing down the lane. The strike takes the last 2.5 frames,
//     sampled on the shown sim tick, so the thrust lands on the resolve tick
//     (confirmed by `lanceTick`): the body thrown forward, the spear driven
//     down the lane and GONE from the hand (the lane is the attack), held 3
//     frames, then the snap back and the settle (B5) while the spear reforms
//     from the veins over half a second, as the classic's does. Kesh's 3-hit
//     flow (§6.1 B6): throw 1 over the shoulder, throw 2 side-arm from the
//     hip across the body, throw 3 the finisher: the spear raised in both
//     hands and plunged down the lane, the body dropping into it;
//   * the spawn-in grow (B7), named points (B8: the spear's point, the
//     hands, the mouth), and the hit and death tuning.
//
// Faces +Z. Same contract as buildLancer (group, mats, setYaw, pose) plus
// lab, react, death, points. Render only: the sim, its timing and damage
// untouched.
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Mesh, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry } from '../../facet/kit.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, spawnScale } from '../../facet/foe.js';
import { createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';
import { HEART } from '../style.js';
import { M, TINT, clamp1, heartGlow, qa, rodM, veinColor, veinMat } from './heartfoe.js';

// The sim's lancer (sim/enemies/lancer.js S): 1.5 u/s; a 54-tick lane
// telegraph (mode 'aim'), the lance on its resolve (lanceTick).
const TICK_HZ = 60;
const WALK_SPEED = 1.5;
export const LANCE_TEL_SEC = 54 / TICK_HZ;
const SNAP = 3 / 30;
const SETTLE = 9 / 30;
const HIP_Y = 0.74;

// --- Key poses (yaw space, u and rad). push: the shove along +z; crouch:
// the hips sunk; lean: the torso forward (+); twist (+ toward its left);
// roll; head: the neck's pitch (+ down); sx / sy: the squash; lx / ly / lz
// the left hand, rx / ry / rz the right (the spear hand); sp: the spear's
// pitch (+ its point up); sy2: its yaw (+ the point swung to its left);
// slide: the spear slid through the hand along its length (+ forward); aim:
// the tell (0..1: the spear and the veins brighten, the point glows).
const REST = Object.freeze({ push: 0, crouch: 0, lean: 0.05, twist: 0, roll: 0, head: 0, sx: 1, sy: 1, lx: 0.2, ly: 0.74, lz: 0.05, rx: -0.21, ry: 0.95, rz: 0.1, sp: 0.6, sy2: 0, slide: 0, aim: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Throw 1, OVER THE SHOULDER: planted, twisted to its right and leaned back,
// the spear drawn back high over the shoulder, the off hand pointing down
// the lane; thrown with the body turned into it.
const C1 = K({ push: -0.04, crouch: 0.03, lean: -0.12, twist: -0.45, head: -0.08, sx: 0.97, sy: 1.03, lx: 0.2, ly: 1.15, lz: 0.42, rx: -0.24, ry: 1.42, rz: -0.3, sp: 0.2, slide: -0.25, aim: 1 });
const S1 = K({ push: 0.1, crouch: 0.02, lean: 0.25, twist: 0.3, head: 0.12, sx: 1.12, sy: 0.92, lx: 0.24, ly: 0.9, lz: 0.08, rx: 0.06, ry: 1.2, rz: 0.56, sp: -0.05, slide: 0.35, aim: 0.6 });
const O1 = K({ push: 0.08, crouch: 0.01, lean: 0.2, twist: 0.36, head: 0.08, sx: 1.03, sy: 0.98, lx: 0.24, ly: 0.86, lz: 0.08, rx: 0.1, ry: 1.1, rz: 0.5, sp: -0.1, slide: 0.3, aim: 0.25 });
// Throw 2, SIDE-ARM: twisted far to its right, the spear drawn back low at
// the hip, its point swung out; thrown flat across the body.
const C2 = K({ push: -0.04, crouch: 0.04, lean: 0.05, twist: -0.6, roll: 0.06, head: -0.04, sx: 0.97, sy: 1.03, lx: 0.26, ly: 1.0, lz: 0.4, rx: -0.46, ry: 0.95, rz: -0.26, sp: 0.05, sy2: -0.45, slide: -0.2, aim: 1 });
const S2 = K({ push: 0.1, crouch: 0.03, lean: 0.2, twist: 0.35, roll: -0.06, head: 0.1, sx: 1.12, sy: 0.92, lx: 0.26, ly: 0.85, lz: -0.1, rx: 0.14, ry: 0.95, rz: 0.56, sp: -0.05, sy2: 0, slide: 0.35, aim: 0.6 });
const O2 = K({ push: 0.08, crouch: 0.02, lean: 0.15, twist: 0.4, roll: -0.08, head: 0.06, sx: 1.03, sy: 0.98, lx: 0.26, ly: 0.82, lz: -0.08, rx: 0.2, ry: 0.9, rz: 0.5, sp: -0.1, slide: 0.3, aim: 0.25 });
// Throw 3, THE PLUNGE (the biggest, §6.1 B6): risen, the spear raised in
// both hands, its point down the lane; plunged, the body dropping into it.
const C3 = K({ push: -0.05, crouch: -0.02, lean: -0.2, twist: -0.1, head: -0.15, sx: 0.96, sy: 1.05, lx: 0.1, ly: 1.42, lz: 0.08, rx: -0.12, ry: 1.5, rz: -0.12, sp: -0.35, slide: -0.2, aim: 1 });
const S3 = K({ push: 0.14, crouch: 0.1, lean: 0.4, twist: 0.05, head: 0.2, sx: 1.16, sy: 0.88, lx: 0.1, ly: 0.82, lz: 0.6, rx: -0.06, ry: 0.86, rz: 0.56, sp: -0.4, slide: 0.4, aim: 0.6 });
const O3 = K({ push: 0.1, crouch: 0.06, lean: 0.3, twist: 0.05, head: 0.12, sx: 1.04, sy: 0.98, lx: 0.12, ly: 0.8, lz: 0.5, rx: -0.08, ry: 0.84, rz: 0.48, sp: -0.35, slide: 0.3, aim: 0.25 });
const THROWS = [
  { label: 'over the shoulder', coil: C1, strike: S1, over: O1 },
  { label: 'side-arm', coil: C2, strike: S2, over: O2 },
  { label: 'the plunge', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));

const LANCE_TL = strikeTimeline('lance', 'Lance', {
  tel: LANCE_TEL_SEC,
  snap: SNAP,
  settle: SETTLE,
  rest: 0.35,
  labels: { coil: 'coil (the lane telegraph): aim, the spear drawn back', strike: 'the thrust', hold: 'contact: the spear down the lane, gone', snap: 'snap back', settle: 'settle: the spear reforms' },
});
const LANCE_CONTACT = LANCE_TL.startOf('hold');
// The spear reforms in the hand from the veins after the throw: gone for
// 0.12 s from the contact, grown back by 0.62 s (the classic's clock).
export function spearReform(sinceContact) {
  if (sinceContact === null || sinceContact < 0) return 1;
  if (sinceContact < 0.12) return 0;
  return Math.min(1, (sinceContact - 0.12) / 0.5);
}
export function lancerLancePose(v, t, out = { ...REST }) {
  return strikePoseAt(LANCE_TL, THROWS[v] || THROWS[0], REST, FIELDS, t, out);
}
const classicLance = (tt, s) => ({ telegraphK: s.id === 'coil' || s.id === 'strike' ? Math.min(1, tt / LANCE_TEL_SEC) : 0, lungeK: 0, fireK: 0, e: { mode: s.id === 'coil' || s.id === 'strike' ? 'aim' : 'stalk', lanceTick: tt >= LANCE_CONTACT ? 1 : -1 } });
export const LANCER_LANCE = strikeAbility({ id: 'lance', label: 'Lance', tl: LANCE_TL, variants: THROWS, classic: classicLance });
export const LANCER_LANCES = strikeAbility({ id: 'lances', label: 'Lance string', tl: LANCE_TL, variants: THROWS, n: 3, gap: LANCE_TL.duration, classic: classicLance });
export const LANCER_ABILITIES = Object.freeze({ lance: LANCER_LANCE, lances: LANCER_LANCES });

// --- Geometry (built once for the session, shared by every lancer) ---------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const TWO_PI = Math.PI * 2;
const NECK_AT = new Vector3(0, 0.76, 0.02);
const SHOULDERS = [new Vector3(0.17, 0.6, 0), new Vector3(-0.17, 0.6, 0)]; // left (+x), right
const ARM = [0.26, 0.25];
const ELBOW = [new Vector3(1, -0.2, -0.7).normalize(), new Vector3(-1, -0.2, -0.7).normalize()];
// the spear along its own +z: the butt at -0.55, the point at 1.2
const SPEAR_TIP = 1.2;
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  const rod = fz(new CylinderGeometry(1, 1, 1, 4).translate(0, 0.5, 0), 0, 1);
  // The torso (about the hips): the ragged skirt and its strips, the narrow
  // torso, the bead rope, the pointed mantle with its torn hem, the hooked
  // bone pauldrons.
  set.torso = bakeParts('lancer:torso', () => {
    const out = [
      { geo: fz(new ConeGeometry(0.19, 0.4, 5), 0.1, 1501), m: M(0, -0.03, 0), tint: TINT.cloth },
      { geo: fz(new CylinderGeometry(0.1, 0.075, 0.5, 5), 0.1, 1503), m: M(0, 0.38, 0), tint: TINT.flesh },
      { geo: fz(new ConeGeometry(0.27, 0.3, 5), 0.08, 1505), m: M(0, 0.56, 0, 1, 1, 1, qa(0, 1, 0, Math.PI / 5)), tint: TINT.cloth },
      { geo: fz(new TorusGeometry(0.12, 0.018, 4, 9), 0.08, 1507), m: M(0, 0.48, 0.02, 1, 1, 1, qa(1, 0, 0, Math.PI / 2 - 0.2)), tint: TINT.bone, tone: 0.9 },
    ];
    for (const sd of [-1, 1]) {
      out.push({ geo: fz(new ConeGeometry(0.06, 0.32, 4).translate(0, 0.16, 0), 0.1, 1509), m: M(sd * 0.2, 0.62, -0.02, 1, 1, 1, qa(0, 0, 1, -sd * 0.55)), tint: TINT.bone });
    }
    // the skirt's strips and the mantle's torn hem
    const strip = wedgeGeometry();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TWO_PI + 0.2;
      out.push({ geo: strip, m: M(Math.sin(a) * 0.17, -0.3, Math.cos(a) * 0.17, 0.07, 0.18 + 0.05 * (i % 2), 0.035, qa(1, 0, 0, Math.PI).multiply(qa(0, 1, 0, a))), tint: TINT.cloth, tone: 0.9 + 0.2 * (i % 2) });
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TWO_PI + 0.6;
      out.push({ geo: strip, m: M(Math.sin(a) * 0.23, 0.42, Math.cos(a) * 0.23, 0.06, 0.1, 0.03, qa(1, 0, 0, Math.PI).multiply(qa(0, 1, 0, a))), tint: TINT.cloth, tone: 1.15 });
    }
    return out;
  });
  // The long skull (about the neck): the sunken sockets, the teeth.
  set.head = bakeParts('lancer:head', () => [
    { geo: fz(new IcosahedronGeometry(0.1, 0), 0.12, 1521), m: M(0, 0.1, 0, 0.78, 1.45, 0.95), tint: TINT.bone },
    { geo: fz(new SphereGeometry(0.028, 5, 4), 0.1, 1523), m: M(0.04, 0.09, 0.08, 1, 1.3, 0.6), tint: TINT.cavity },
    { geo: fz(new SphereGeometry(0.028, 5, 4), 0.1, 1525), m: M(-0.04, 0.09, 0.08, 1, 1.3, 0.6), tint: TINT.cavity },
    { geo: fz(new BoxGeometry(0.07, 0.025, 0.03), 0, 1), m: M(0, -0.02, 0.08), tint: TINT.cavity },
  ]);
  // The tell on the head (unlit, driven): the crest seam and the eye slits.
  set.headVeins = bakeParts('lancer:headveins', () => [
    { geo: fz(new BoxGeometry(0.022, 0.2, 0.05), 0, 1), m: M(0, 0.16, 0.065) },
    { geo: fz(new BoxGeometry(0.05, 0.022, 0.022), 0, 1), m: M(0.035, 0.09, 0.09, 1, 1, 1, qa(0, 1, 0, -0.3).multiply(qa(0, 0, 1, 0.55))) },
    { geo: fz(new BoxGeometry(0.05, 0.022, 0.022), 0, 1), m: M(-0.035, 0.09, 0.09, 1, 1, 1, qa(0, 1, 0, 0.3).multiply(qa(0, 0, 1, -0.55))) },
  ]);
  // The veins on the torso (unlit, driven).
  set.veins = bakeParts('lancer:veins', () => [
    { geo: rod, m: rodM([0, 0.15, 0.08], [0.03, 0.42, 0.1], 0.014) },
    { geo: rod, m: rodM([0.03, 0.42, 0.1], [-0.05, 0.6, 0.12], 0.012) },
    { geo: rod, m: rodM([0.03, 0.42, 0.1], [0.12, 0.56, 0.1], 0.012) },
    { geo: rod, m: rodM([0, 0.18, -0.08], [0, 0.55, -0.1], 0.014) },
  ]);
  // The spear (unlit, driven): the shaft, the barbed point, the butt spikes.
  set.spear = bakeParts('lancer:spear', () => [
    { geo: fz(new CylinderGeometry(0.016, 0.022, 1.7, 5), 0.06, 1531), m: M(0, 0, 0.3, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)) },
    { geo: fz(new ConeGeometry(0.055, 0.32, 4), 0.1, 1533), m: M(0, 0, SPEAR_TIP - 0.16, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)) },
    { geo: rod, m: rodM([0, 0, 1.0], [0.07, 0, 0.9], 0.012) },
    { geo: rod, m: rodM([0, 0, 1.0], [-0.07, 0, 0.9], 0.012) },
    { geo: rod, m: rodM([0, 0, -0.55], [0.05, 0, -0.66], 0.01) },
    { geo: rod, m: rodM([0, 0, -0.55], [-0.05, 0, -0.66], 0.01) },
  ]);
  // A limb bone (y 0..1, tapering), a stilt foot, a bone hand.
  set.bone = fz(new CylinderGeometry(0.72, 1, 1, 5).translate(0, 0.5, 0), 0.08, 1541);
  set.foot = bakeParts('lancer:foot', () => [
    { geo: fz(new BoxGeometry(0.06, 0.035, 0.12), 0.1, 1543), m: M(0, 0.018, 0.03), tint: TINT.flesh, tone: 0.9 },
    { geo: fz(new ConeGeometry(0.014, 0.06, 4), 0.1, 1545), m: M(0.02, 0.015, 0.1, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tint: TINT.bone },
    { geo: fz(new ConeGeometry(0.014, 0.06, 4), 0.1, 1547), m: M(-0.02, 0.015, 0.1, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tint: TINT.bone },
  ]);
  set.hand = bakeParts('lancer:hand', () => [
    { geo: fz(new IcosahedronGeometry(0.038, 0), 0.1, 1549), m: M(0, -0.01, 0, 1, 0.8, 1.1), tint: TINT.bone, tone: 0.95 },
    { geo: fz(new ConeGeometry(0.012, 0.07, 4), 0.1, 1551), m: M(0.02, -0.05, 0.01, 1, 1, 1, qa(1, 0, 0, Math.PI)), tint: TINT.bone },
    { geo: fz(new ConeGeometry(0.012, 0.07, 4), 0.1, 1553), m: M(-0.02, -0.05, 0.01, 1, 1, 1, qa(1, 0, 0, Math.PI)), tint: TINT.bone },
  ]);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Legs: 0 left (+x), 1 right. Hips in body space, feet homes on the floor.
const HIPS = [new Vector3(0.09, HIP_Y, 0), new Vector3(-0.09, HIP_Y, 0)];
const HOMES = [new Vector3(0.1, 0, 0.0), new Vector3(-0.1, 0, 0.0)];
const KNEE = [new Vector3(0.1, 0, 1).normalize(), new Vector3(-0.1, 0, 1).normalize()];
const LEG = [0.37, 0.36];
const ANKLE_Y = 0.035;

export function buildLancerFacet() {
  const G = geos();
  const F = createFoeFrame('lancer');
  const { body, spawn, track } = F;
  const mat = track(foeMaterial('#FFFFFF'));
  const veins = veinMat();
  const spearMat = veinMat(HEART.vein);
  const torso = foePart(G.torso, mat, 'full', 'lancer-torso');
  torso.position.set(0, HIP_Y, 0);
  body.add(torso);
  const neck = foePart(G.head, mat, 'full', 'lancer-head');
  neck.position.copy(NECK_AT);
  torso.add(neck);
  const headVeins = new Mesh(G.headVeins, veins);
  headVeins.name = 'lancer-crest';
  neck.add(headVeins);
  const veinMesh = new Mesh(G.veins, veins);
  veinMesh.name = 'lancer-veins';
  torso.add(veinMesh);
  // the spear rides the right hand (yaw space)
  const spear = new Mesh(G.spear, spearMat);
  spear.name = 'lancer-spear';
  spawn.add(spear);
  const tipGlow = heartGlow(0.5, 0.25);
  tipGlow.name = 'lancer-point-glow';
  tipGlow.position.set(0, 0, SPEAR_TIP);
  spear.add(tipGlow);
  const bones = instancedPart(G.bone, mat, 8, { name: 'lancer-bones', moving: true, inkPx: 1.6 });
  for (let i = 0; i < 8; i++) bones.setColorAt(i, TINT.flesh);
  const feet = instancedPart(G.foot, mat, 2, { name: 'lancer-feet', moving: true, inkPx: 1.4 });
  const hands = instancedPart(G.hand, mat, 2, { name: 'lancer-hands', moving: true, inkPx: 1.4 });
  for (const o of [bones, feet, hands]) spawn.add(o);
  F.group.add(groundShadow(0.28, 0.7, { forward: 0.1 }));

  // Named points (B8): the spear's point, the hands, the mouth.
  const point = namedPoint(spear, 'lancer-point', 0, 0, SPEAR_TIP);
  const handR = namedPoint(spawn, 'lancer-spear-hand', 0, 1, 0);
  const handL = namedPoint(spawn, 'lancer-hand', 0, 1, 0);
  const mouth = namedPoint(neck, 'lancer-mouth', 0, -0.02, 0.1);

  const gait = createLegs({ homes: HOMES, groups: [[0], [1]], trigger: 0.09, reach: 0.3, lift: 0.1, durMin: 0.14, durMax: 0.26 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, snapSec: SNAP, settleSec: SETTLE });
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const m = new Matrix4();
  const tm = new Matrix4();
  const q = new Quaternion();
  const q2 = new Quaternion();
  const A = new Vector3();
  const B = new Vector3();
  const C = new Vector3();
  const D = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  let age = -1;
  let yawNow = 0;
  let throws = 0;
  let lastLance = null;
  let leanW = 1;
  let reform = 1;
  const lifted = [0, 0];
  const gaitOpts = { locked: true };

  const lab = {
    abilities: LANCER_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => gait.feet().map((p, i) => ({ ...p, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur, reform }),
    get hit() {
      return clip.state === 'rest' ? -1 : (throws - 1) % 3;
    },
    parts: { body, torso, neck, bones, spear },
  };

  function liveLance(P, now, tick, e) {
    const beat = watch.update(P);
    let fired = false;
    if (e) {
      const lt = Number.isFinite(e.lanceTick) ? e.lanceTick : -1;
      if (lastLance === null) lastLance = lt;
      else if (lt !== lastLance) {
        fired = lt >= 0;
        lastLance = lt;
      }
    }
    clip.update({ beat, tel: watch.telegraph, now, tick, fired, pick: () => THROWS[throws++ % 3], name: () => `lance:${((throws - 1) % 3) + 1}`, out: cur });
    lab.lastStrike = clip.lastStrike;
    reform = spearReform(clip.sinceContact);
  }

  function arm(i, hand, row) {
    C.copy(hand);
    A.copy(SHOULDERS[i]).applyMatrix4(tm);
    D.subVectors(C, A);
    const far = (ARM[0] + ARM[1]) * 0.985;
    if (D.length() > far) C.copy(A).addScaledVector(D.normalize(), far);
    solveKnee(A, C, ARM[0], ARM[1], ELBOW[i], B);
    bones.setMatrixAt(row, segmentMatrix(m, A, B, 0.03, 0.03, 0.012));
    bones.setMatrixAt(row + 1, segmentMatrix(m, B, C, 0.024, 0.024, 0.012));
    D.subVectors(C, B).normalize();
    Y.copy(D).negate();
    X.crossVectors(Y, Z.set(0, 0, 1));
    if (X.lengthSq() < 1e-6) X.set(1, 0, 0);
    X.normalize();
    Z.crossVectors(X, Y);
    setTRS(m, C, X, Y, Z, 1, 1, 1);
    hands.setMatrixAt(i, m);
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

    // --- the lance: the lab's pure override, or the sim's
    if (lab.override) {
      const ab = LANCER_ABILITIES[lab.override.id] || LANCER_LANCE;
      const h = ab.at(lab.override.t);
      lancerLancePose(h.v, h.t, cur);
      reform = spearReform(h.t >= LANCE_CONTACT ? h.t - LANCE_CONTACT : null);
      watch.reset();
      clip.reset();
    } else liveLance(P, now, tick, e);

    // --- feet: locked to the floor, long stilted steps
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    gaitOpts.locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override);
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = clamp1(lv.z / WALK_SPEED);
    const side = clamp1(lv.x / WALK_SPEED);
    leanW += ((clip.state === 'rest' && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 10);

    // --- the hips and the torso
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const breath = Math.sin(tt * 1.5 + id);
    body.position.set(0, -cur.crouch - 0.025 * bob, cur.push);
    body.rotation.set(0.1 * fwd * leanW, 0, -0.06 * side * leanW + cur.roll);
    body.scale.set(cur.sx, cur.sy, cur.sx);
    body.updateMatrix();
    torso.rotation.set(cur.lean + 0.02 * breath, cur.twist, 0.03 * Math.sin(tt * 3.0) * Math.min(1, gait.speed / WALK_SPEED) * leanW);
    torso.updateMatrix();
    tm.multiplyMatrices(body.matrix, torso.matrix);
    neck.rotation.set(cur.head - 0.05 * cur.aim, -0.6 * cur.twist, 0);

    // --- legs
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
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, 0.034, 0.034, 0.012));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, 0.024, 0.024, 0.012));
      C.set(foot.x, foot.y - ANKLE_Y, foot.z);
      X.set(1, 0, 0);
      Y.set(0, 1, 0);
      Z.set(0, 0, 1);
      setTRS(m, C, X, Y, Z, 1, 1, 1);
      feet.setMatrixAt(i, m);
    }

    // --- the arms: the spear hand, the off hand (a walking swing at rest)
    const swing = 0.05 * Math.sin(tt * 3.6) * Math.min(1, gait.speed / WALK_SPEED) * leanW;
    D.set(cur.rx, cur.ry - cur.crouch, cur.rz + swing);
    handR.position.copy(arm(1, D, 6));
    const hr = C.clone();
    D.set(cur.lx, cur.ly - cur.crouch, cur.lz - swing);
    handL.position.copy(arm(0, D, 4));
    bones.instanceMatrix.needsUpdate = true;
    feet.instanceMatrix.needsUpdate = true;
    hands.instanceMatrix.needsUpdate = true;

    // --- the spear: through the right hand, pitched and swung by the pose,
    // slid along its length, gone and reforming after a throw
    q.setFromAxisAngle(Y.set(0, 1, 0), cur.sy2);
    q2.setFromAxisAngle(X.set(1, 0, 0), -cur.sp);
    q.multiply(q2);
    Z.set(0, 0, 1).applyQuaternion(q);
    spear.position.copy(hr).addScaledVector(Z, cur.slide);
    spear.quaternion.copy(q);
    spear.scale.set(1, 1, Math.max(0.001, reform));
    spear.visible = reform > 0.02;

    // --- the tell: the spear and the veins brighten as it aims, the point
    // glows
    const k = Math.min(1, 0.45 + 0.55 * cur.aim + 0.08 * Math.sin(tt * 3 + id));
    veinColor(spearMat.color, k);
    veinColor(veins.color, 0.4 + 0.45 * cur.aim);
    tipGlow.material.opacity = 0.2 + 0.6 * cur.aim * (0.75 + 0.25 * Math.sin(tt * 18));
    tipGlow.scale.setScalar(0.5 * (1 + 0.8 * cur.aim));
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
    points: { point, hand: handR, offHand: handL, mouth },
    // §6.1 item 9: tall and thin: a light squash, a full flinch, a long
    // knock; the flinch bulges at the chest.
    react: { squash: 0.75, flinch: 1.05, knock: 1.1, axis: 'y', midY: HIP_Y + 0.45 },
    death: { swell: 0.8, throw: 1.1 },
  };
}
