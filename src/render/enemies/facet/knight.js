// BONE KNIGHT, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level III foes").
// The classic knight of enemies/slice2.js (an iron box torso and a six-sided
// helm on two bone legs, a tower shield on its left arm and a bone blade on
// its right; the indigo visor slit its tell; the sword swings back for the
// slam, the shield swings aside while the guard is down) with the sample
// video's technique laid ON TOP of its chibi ink look. What it gains:
//
//   * a faceted body with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd of each row): the breastplate cut into planes with a
//     gorget, two pauldrons, a belt and a tattered bone-pale tabard hanging
//     to the knees, the helm (part of the torso's row, as the classic's
//     never turned) with a crest ridge, cheek plates and the visor slit on
//     its own unlit row with its glow; the tower shield with a boss, a rim
//     and two dents; the sword with a crossguard, a grip and a pommel;
//   * WORLD-LOCKED FEET (render/facet/foelegs.js): two bone legs laid by
//     two-bone IK with sabatons, planted while they carry weight and stepping
//     along the real travel in a heavy, slow march (rule 2); the body leans
//     into the travel (rule 1); the arms are two-bone IK from the shoulders
//     to the hands the pose places, so the shield and the sword always hang
//     off real elbows;
//   * the GUARD (the sim's e.guard.active): the shield held square before
//     it; when the guard drops (from the slam's wind-up until 50 ticks after
//     the slam, or a stun) the shield swings out to its left and the body
//     turns open;
//   * the OVERHEAD SLAM (sim/enemies/knight.js: a 66-tick ring telegraph 1.1
//     u ahead, the blow on its resolve tick, knight_slam) on the foe kit's
//     strike clip (render/facet/foestrike.js) as a 3-hit flow (Kesh's
//     template, §6.1 B1 to B6): the contact lands on the resolve tick on the
//     layer's shown tick (B2), the wind-up is the telegraph (B3), the
//     contact holds while the sim's slam mode lasts (B4), the overshoot
//     settles through rest (B5). Slam 1 is THE CLEAVE: the blade laid back
//     over its right shoulder and brought down before it, the body dropping
//     into the blow; slam 2 THE CROSS CUT: the blade wound back to its left
//     and swept across low, right to left, the hips driving it; slam 3 THE
//     TWO-HANDED DRIVE: the shield flung wide, both hands on the hilt raised
//     behind its head, the point driven into the floor ahead with the whole
//     body falling on it (B6). Each overshoot is the next slam's wind-up;
//   * the spawn-in grow (B7), named points (B8: the blade's point, the
//     sword hand, the shield), and the hit and death tuning (the heaviest
//     foe of its level: a short knock, a small squash).
//
// Faces +Z. Same contract as buildKnight (group, mats, setYaw, pose) plus
// lab, react, death, points. Render only: the sim, its timing, the guard
// and the damage untouched. It is always Elite: the layer scales the group;
// the crown sits over every pose (archetypes.js CROWN_Y).
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { makeGlowSprite } from '../../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry } from '../../facet/kit.js';
import { ease } from '../../facet/timeline.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, spawnScale } from '../../facet/foe.js';
import {
  HOLD_SEC,
  createStrikeClip,
  strikeAbility,
  strikePoseAt,
  strikeTimeline,
} from '../../facet/foestrike.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';

// The sim's knight (sim/enemies/knight.js S): 0.95 u/s, the slam's ring
// telegraph 66 ticks, the guard down 50 ticks after the slam.
const TICK_HZ = 60;
const MARCH_SPEED = 0.95;
export const SLAM_TEL_SEC = 66 / TICK_HZ;
const OPEN_SEC = 50 / TICK_HZ;
const TWO_PI = Math.PI * 2;
// The classic's colours (enemies/slice2.js C.iron, C.bone) and their folds.
const IRON = HIDE.ramDark.clone().lerp(new Color(PALETTE.warmGrey), 0.25).multiplyScalar(0.75);
const IRON_DARK = IRON.clone().multiplyScalar(0.72);
const BONE = new Color(PALETTE.bone).multiplyScalar(0.8);
const TABARD = new Color(PALETTE.bone).lerp(new Color(PALETTE.signalBlue), 0.1).multiplyScalar(0.62);
const CHARCOAL = new Color(PALETTE.voidCharcoal);

// --- Key poses. The body: push (u, +z), crouch (u, the hips sunk), pitch
// (chest forward +), twist (+ toward its left), roll. The sword hand (yaw
// space, u): hx, hy, hz; the blade's direction from the hand: bEl
// (elevation, rad, up +), bAz (azimuth round y from +z, + toward its left).
// The shield hand: sx, sy, sz; open (0..1 the shield swung out to its left,
// face turned away); head (the helm's pitch, down +).
const REST = Object.freeze({ push: 0, crouch: 0, pitch: 0, twist: 0, roll: 0, hx: -0.32, hy: 0.72, hz: 0.1, bEl: 0.78, bAz: 0.25, sx: 0.2, sy: 0.74, sz: 0.3, open: 0, head: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Slam 1, THE CLEAVE: the blade laid back over its right shoulder (its tip
// under the crown), the chest drawn up and back; it comes down before it,
// the hips dropping and the chest falling with the blow; the shield out.
const C1 = K({ push: -0.04, crouch: 0.02, pitch: -0.14, twist: -0.3, hx: -0.34, hy: 1.02, hz: -0.22, bEl: 0.3, bAz: -2.4, sx: 0.42, sy: 0.7, sz: 0.1, open: 1, head: -0.1 });
const S1 = K({ push: 0.1, crouch: 0.16, pitch: 0.42, twist: 0.1, hx: -0.12, hy: 0.5, hz: 0.72, bEl: -0.95, bAz: 0.05, sx: 0.46, sy: 0.62, sz: -0.1, open: 1, head: 0.3 });
const O1 = K({ push: 0.06, crouch: 0.1, pitch: 0.28, twist: 0.2, hx: -0.02, hy: 0.42, hz: 0.6, bEl: -1.1, bAz: 0.3, sx: 0.44, sy: 0.64, sz: -0.06, open: 1, head: 0.2 });
// Slam 2, THE CROSS CUT: out of the cleave's crouch the blade is wound
// back low to its left, the hips turned left; it sweeps across before it
// from its left to its right, the hips driving the turn, and the chest
// follows through to its right.
const C2 = K({ push: -0.02, crouch: 0.08, pitch: 0.1, twist: 0.5, roll: 0.06, hx: 0.3, hy: 0.6, hz: -0.1, bEl: 0.15, bAz: 2.2, sx: 0.5, sy: 0.72, sz: 0.0, open: 1, head: 0.05 });
const S2 = K({ push: 0.1, crouch: 0.12, pitch: 0.22, twist: -0.55, roll: -0.1, hx: -0.5, hy: 0.46, hz: 0.5, bEl: -0.2, bAz: -1.2, sx: 0.42, sy: 0.74, sz: 0.16, open: 1, head: 0.15 });
const O2 = K({ push: 0.06, crouch: 0.08, pitch: 0.16, twist: -0.4, roll: -0.06, hx: -0.56, hy: 0.5, hz: 0.3, bEl: -0.1, bAz: -1.7, sx: 0.4, sy: 0.74, sz: 0.2, open: 1, head: 0.1 });
// Slam 3, THE TWO-HANDED DRIVE (the biggest, §6.1 B6): the shield flung
// wide to its left, both hands on the hilt raised behind its head, the
// chest drawn tall; the point is driven into the floor ahead, the whole
// body falling on it into a deep crouch.
const C3 = K({ push: -0.06, crouch: -0.02, pitch: -0.2, twist: 0.05, hx: -0.06, hy: 1.0, hz: -0.3, bEl: 0.55, bAz: Math.PI - 0.2, sx: 0.58, sy: 0.9, sz: -0.3, open: 1, head: -0.15 });
const S3 = K({ push: 0.18, crouch: 0.26, pitch: 0.5, twist: 0, hx: -0.02, hy: 0.42, hz: 0.78, bEl: -1.25, bAz: 0, sx: 0.62, sy: 0.5, sz: -0.3, open: 1, head: 0.35 });
const O3 = K({ push: 0.14, crouch: 0.2, pitch: 0.4, twist: 0, hx: -0.04, hy: 0.4, hz: 0.7, bEl: -1.3, bAz: 0, sx: 0.58, sy: 0.52, sz: -0.26, open: 1, head: 0.3 });
const SLAMS = [
  { label: 'the cleave', coil: C1, strike: S1, over: O1 },
  { label: 'the cross cut', coil: C2, strike: S2, over: O2 },
  { label: 'the two-handed drive', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));
// The slam on the kit's strike timeline: the 66-tick coil, the strike, the
// contact held, the snap back, the settle; the guard stays down through the
// settle and a long rest (the sim's 50 ticks).
const SLAM_TL = strikeTimeline('slam', 'Overhead slam', {
  tel: SLAM_TEL_SEC,
  rest: OPEN_SEC,
  labels: { coil: 'coil (the ring telegraph)', strike: 'the blow', hold: 'contact: the blade down', snap: 'snap back', settle: 'settle, guard down' },
});
const CONTACT_AT = SLAM_TL.startOf('hold');
// The hold: the blade bites the floor and the body shudders (a ring of dust
// is the VFX layer's); the recoil is small, it is heavy.
const RECOIL_U = 0.04;
function heldMotion(V, age, out) {
  const a = age - HOLD_SEC;
  if (a > 0) out.push -= RECOIL_U * Math.sin(Math.min(1, a / 0.2) * Math.PI);
}
export function knightSlamPose(v, t, out = { ...REST }) {
  strikePoseAt(SLAM_TL, SLAMS[v] || SLAMS[0], REST, FIELDS, t, out, heldMotion);
  // the guard stays down through the rest
  if (t >= SLAM_TL.startOf('settle')) out.open = Math.max(out.open, 1 - ease.inOut(Math.max(0, (t - SLAM_TL.startOf('rest')) / OPEN_SEC)));
  return out;
}
const classicSlam = (tt, s) => ({ telegraphK: s.id === 'coil' || s.id === 'strike' ? Math.min(1, tt / SLAM_TEL_SEC) : 0, lungeK: 0, fireK: 0, e: { mode: s.id === 'coil' || s.id === 'strike' ? 'slam' : 'march', slamTick: tt >= CONTACT_AT ? 1 : -1, guard: { active: tt >= SLAM_TL.duration } } });
export const KNIGHT_SLAM = strikeAbility({ id: 'slam', label: 'Overhead slam', tl: SLAM_TL, variants: SLAMS, classic: classicSlam });
export const KNIGHT_SLAMS_STRING = strikeAbility({ id: 'slams', label: 'Slam string', tl: SLAM_TL, variants: SLAMS, n: 3, gap: SLAM_TL.duration, classic: classicSlam });
export const KNIGHT_ABILITIES = Object.freeze({ slam: KNIGHT_SLAM, slams: KNIGHT_SLAMS_STRING });

// --- Geometry (built once for the session, shared by every knight) --------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
let SET = null;
// The torso's root at the hips; the helm sits on it (the classic's never
// turned, so it rides the torso's row).
const TORSO_AT = new Vector3(0, 0.6, 0);
const BLADE_L = 0.8;
function geos() {
  if (SET) return SET;
  const set = {};
  // The torso (about the hips): the breastplate, the gorget, the pauldrons,
  // the belt, the tabard and its tattered hem; the helm with its crest and
  // cheek plates.
  set.torso = bakeParts('knight:torso', () => {
    const out = [
      { geo: fz(new BoxGeometry(0.42, 0.5, 0.28), 0.07, 1301), m: M(0, 0.22, 0), tint: IRON },
      { geo: fz(new BoxGeometry(0.3, 0.12, 0.22), 0.06, 1303), m: M(0, 0.0, 0.0), tint: IRON_DARK },
      { geo: fz(new CylinderGeometry(0.17, 0.2, 0.08, 7), 0.06, 1305), m: M(0, 0.5, 0.02), tint: IRON_DARK },
      { geo: fz(new SphereGeometry(0.13, 7, 4, 0, TWO_PI, 0, Math.PI / 2), 0.08, 1307), m: M(0.23, 0.45, 0, 1, 0.8, 1, qa(0, 0, 1, -0.35)), tint: IRON },
      { geo: fz(new SphereGeometry(0.13, 7, 4, 0, TWO_PI, 0, Math.PI / 2), 0.08, 1309), m: M(-0.23, 0.45, 0, 1, 0.8, 1, qa(0, 0, 1, 0.35)), tint: IRON },
      { geo: fz(new BoxGeometry(0.44, 0.05, 0.3), 0.05, 1311), m: M(0, 0.02, 0), tint: CHARCOAL.clone().lerp(IRON, 0.5) },
      { geo: fz(new BoxGeometry(0.24, 0.42, 0.03), 0.08, 1313), m: M(0, -0.2, 0.15, 1, 1, 1, qa(1, 0, 0, 0.06)), tint: TABARD },
      { geo: fz(new BoxGeometry(0.24, 0.3, 0.03), 0.08, 1315), m: M(0, -0.14, -0.15), tint: TABARD, tone: 0.85 },
      // the helm
      { geo: fz(new CylinderGeometry(0.15, 0.17, 0.26, 6), 0.06, 1317), m: M(0, 0.62, 0.02), tint: IRON },
      { geo: fz(new BoxGeometry(0.03, 0.12, 0.26), 0.08, 1319), m: M(0, 0.76, 0.0, 1, 1, 1, qa(1, 0, 0, 0.1)), tint: IRON_DARK },
      { geo: fz(new BoxGeometry(0.05, 0.14, 0.1), 0.06, 1321), m: M(0.15, 0.56, 0.08), tint: IRON_DARK },
      { geo: fz(new BoxGeometry(0.05, 0.14, 0.1), 0.06, 1323), m: M(-0.15, 0.56, 0.08), tint: IRON_DARK },
    ];
    // the tabard's tattered hem
    const tatter = wedgeGeometry();
    for (let i = 0; i < 4; i++) out.push({ geo: tatter, m: M(-0.09 + i * 0.06, -0.41, 0.16, 0.05, -0.1 - 0.03 * (i % 2), 0.025), tint: TABARD, tone: 0.8 });
    return out;
  });
  // The tell (unlit): the visor slit, indigo in a dark socket.
  set.visor = bakeParts('knight:visor', () => [
    { geo: fz(new BoxGeometry(0.24, 0.05, 0.02), 0, 1), m: M(0, 0.64, 0.16), tint: CHARCOAL },
    { geo: fz(new BoxGeometry(0.2, 0.025, 0.02), 0, 1), m: M(0, 0.64, 0.17), tint: new Color(TELL_INDIGO) },
  ]);
  // A limb bone (y 0..1, tapering), a sabaton.
  set.bone = fz(new CylinderGeometry(0.75, 1, 1, 6).translate(0, 0.5, 0), 0.08, 1331);
  set.boot = bakeParts('knight:boot', () => [
    { geo: fz(new BoxGeometry(0.13, 0.08, 0.24), 0.08, 1333), m: M(0, 0.04, 0.04), tint: IRON },
    { geo: fz(new BoxGeometry(0.14, 0.05, 0.1), 0.06, 1335), m: M(0, 0.09, 0.0), tint: IRON_DARK },
  ]);
  // The tower shield (about its grip; its face +z): the plate, the rim, the
  // boss and two dents.
  set.shield = bakeParts('knight:shield', () => {
    const out = [
      { geo: fz(new BoxGeometry(0.55, 0.82, 0.06), 0.06, 1341), m: M(0, -0.04, 0.06), tint: IRON },
      { geo: fz(new TorusGeometry(0.3, 0.025, 4, 10), 0.05, 1343), m: M(0, -0.04, 0.09, 0.9, 1.3, 1), tint: IRON_DARK },
      { geo: fz(new IcosahedronGeometry(0.07, 0), 0.08, 1345), m: M(0, 0.0, 0.11), tint: BONE },
      { geo: fz(new IcosahedronGeometry(0.04, 0), 0.1, 1347), m: M(-0.16, 0.22, 0.09, 1, 1, 0.3), tint: IRON_DARK },
      { geo: fz(new IcosahedronGeometry(0.035, 0), 0.1, 1349), m: M(0.14, -0.26, 0.09, 1, 1, 0.3), tint: IRON_DARK },
    ];
    return out;
  });
  // The sword (about the hand; the blade along +y): the grip, the pommel,
  // the crossguard, the blade and its fuller.
  set.sword = bakeParts('knight:sword', () => [
    { geo: fz(new CylinderGeometry(0.025, 0.028, 0.14, 6), 0.06, 1351), m: M(0, -0.05, 0), tint: CHARCOAL.clone().lerp(IRON, 0.4) },
    { geo: fz(new IcosahedronGeometry(0.04, 0), 0.1, 1353), m: M(0, -0.13, 0), tint: IRON_DARK },
    { geo: fz(new BoxGeometry(0.2, 0.035, 0.04), 0.08, 1355), m: M(0, 0.03, 0), tint: IRON_DARK },
    { geo: fz(new BoxGeometry(0.07, BLADE_L - 0.1, 0.02), 0.04, 1357), m: M(0, 0.05 + (BLADE_L - 0.1) / 2, 0), tint: BONE },
    { geo: fz(new ConeGeometry(0.035, 0.1, 4), 0.06, 1359), m: M(0, BLADE_L, 0, 1, 1, 0.5), tint: BONE },
    { geo: fz(new BoxGeometry(0.02, BLADE_L - 0.3, 0.024), 0, 1), m: M(0, 0.1 + (BLADE_L - 0.3) / 2, 0), tint: BONE, tone: 0.8 },
  ]);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Legs: 0 left (+x), 1 right. Hips in body space, feet homes on the floor.
const HIPS = [new Vector3(0.12, 0.58, 0), new Vector3(-0.12, 0.58, 0)];
const HOMES = [new Vector3(0.15, 0, 0.02), new Vector3(-0.15, 0, 0.02)];
const KNEE = [new Vector3(0.15, 0, 1).normalize(), new Vector3(-0.15, 0, 1).normalize()];
const LEG = [0.29, 0.28];
const ANKLE_Y = 0.06;
// Arms: shoulders in torso space (right, left); the elbow's pole (out and
// back; the shield arm's down and out).
const SHOULDERS = [new Vector3(-0.27, 0.46, 0), new Vector3(0.27, 0.46, 0)];
const ARM = [0.27, 0.26];
const ELBOW = [new Vector3(-1, -0.5, -0.6).normalize(), new Vector3(1, -0.7, -0.3).normalize()];
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildKnightFacet() {
  const G = geos();
  const F = createFoeFrame('knight');
  const { body, spawn, track } = F;
  const mat = track(foeMaterial('#FFFFFF'));
  const tellMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
  const torso = foePart(G.torso, mat, 'full', 'knight-torso');
  torso.position.copy(TORSO_AT);
  body.add(torso);
  const visor = foePart(G.visor, tellMat, false, 'knight-visor');
  torso.add(visor);
  const glow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.35, opacity: 0.3 });
  glow.material.toneMapped = false;
  glow.material.color.copy(TELL_INDIGO_GLOW);
  glow.name = 'knight-visor-glow';
  glow.position.set(0, 0.64, 0.18);
  torso.add(glow);
  // the rows: 8 limb bones (bone legs, iron arms), 2 sabatons; the shield
  // and the sword placed by the hands
  const bones = instancedPart(G.bone, mat, 8, { name: 'knight-bones', moving: true, inkPx: 2.0 });
  for (let i = 0; i < 8; i++) bones.setColorAt(i, i < 4 ? BONE : IRON);
  const boots = instancedPart(G.boot, mat, 2, { name: 'knight-boots', moving: true, inkPx: 1.8 });
  const shield = foePart(G.shield, mat, 'full', 'knight-shield');
  shield.matrixAutoUpdate = false;
  const sword = foePart(G.sword, mat, 'full', 'knight-sword');
  sword.matrixAutoUpdate = false;
  for (const o of [bones, boots, shield, sword]) spawn.add(o);
  F.group.add(groundShadow(0.5, 0.85));

  // Named points (B8): the blade's point, the sword hand, the shield's boss.
  const tip = namedPoint(spawn, 'knight-tip', 0, 1.2, 0.2);
  const hand = namedPoint(spawn, 'knight-hand', 0, 0.8, 0);
  const shieldPt = namedPoint(spawn, 'knight-shield-point', 0.3, 0.7, 0.4);

  const gait = createLegs({ homes: HOMES, groups: [[0], [1]], trigger: 0.1, reach: 0.24, lift: 0.08, durMin: 0.18, durMax: 0.32 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, held: heldMotion });
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
  let slams = 0;
  let open = 0;
  let leanW = 1;
  const lifted = [0, 0];
  const gaitOpts = { locked: true };

  const lab = {
    abilities: KNIGHT_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => gait.feet().map((p, i) => ({ ...p, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur, guardOpen: open }),
    get hit() {
      return clip.state === 'rest' ? -1 : (slams - 1) % 3;
    },
    parts: { body, torso, bones, shield, sword },
  };

  function liveSlam(P, now, tick) {
    const beat = watch.update(P);
    clip.update({
      beat,
      tel: watch.telegraph,
      now,
      tick,
      pick: () => SLAMS[slams++ % 3],
      name: () => `slam:${((slams - 1) % 3) + 1}`,
      out: cur,
    });
    lab.lastStrike = clip.lastStrike;
  }

  // an arm: two-bone IK from the shoulder (torso) to the hand (yaw space)
  function arm(i, handAt, row) {
    C.copy(handAt);
    A.copy(SHOULDERS[i]).applyMatrix4(tm);
    D.subVectors(C, A);
    const far = (ARM[0] + ARM[1]) * 0.98;
    if (D.length() > far) C.copy(A).addScaledVector(D.normalize(), far);
    solveKnee(A, C, ARM[0], ARM[1], ELBOW[i], B);
    bones.setMatrixAt(row, segmentMatrix(m, A, B, 0.06, 0.06, 0.02));
    bones.setMatrixAt(row + 1, segmentMatrix(m, B, C, 0.05, 0.05, 0.02));
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

    // --- the slam: the lab's pure override, or the sim's
    if (lab.override) {
      const ab = KNIGHT_ABILITIES[lab.override.id] || KNIGHT_SLAM;
      const h = ab.at(lab.override.t);
      knightSlamPose(h.v, h.t, cur);
      watch.reset();
      clip.reset();
    } else liveSlam(P, now, tick);
    // --- the guard: the shield square while it holds, swung out while it
    // is down (the sim's e.guard.active) or the pose opens it
    const guardDown = e && e.guard && !e.guard.active ? 1 : 0;
    const wantOpen = lab.override ? cur.open : Math.max(cur.open, guardDown);
    open += (wantOpen - open) * Math.min(1, dt * 9);
    if (dt <= 0 && lab.override) open = wantOpen;

    // --- feet: locked to the floor, a heavy march
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    gaitOpts.locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override);
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = clamp1(lv.z / MARCH_SPEED);
    const side = clamp1(lv.x / MARCH_SPEED);
    leanW += ((clip.state === 'rest' && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 10);

    // --- the hips and the torso: sunk by the crouch, bobbing on each step,
    // leaning into the travel; turned and bent by the swing, turned open
    // with the guard down
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const breath = Math.sin(tt * 1.1 + id);
    body.position.set(0, -cur.crouch - 0.025 * bob, cur.push);
    body.rotation.set(0.07 * fwd * leanW, 0, -0.05 * side * leanW + cur.roll);
    body.updateMatrix();
    torso.rotation.set(0.05 + cur.pitch + 0.02 * breath, cur.twist + 0.25 * open, 0.03 * Math.sin(gait.speed > 0.2 ? tt * 3.0 : 0) * leanW);
    torso.updateMatrix();
    tm.multiplyMatrices(body.matrix, torso.matrix);
    glow.material.opacity = 0.28 + 0.04 * Math.sin(tt * 2 + id) + 0.3 * (clip.state === 'coil' ? 1 : 0);

    // --- legs: the hips ride the body, the feet stand where the gait put them
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
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, 0.065, 0.065, 0.02));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, 0.055, 0.055, 0.02));
      Z.set(0, 0, 1);
      X.set(1, 0, 0);
      Y.set(0, 1, 0);
      C.set(foot.x, foot.y - ANKLE_Y, foot.z);
      setTRS(m, C, X, Y, Z, 1, 1, 1);
      boots.setMatrixAt(i, m);
    }

    // --- the sword arm: the hand where the pose puts it, the blade along
    // its elevation and azimuth (never through the floor)
    const swing = 0.04 * Math.sin(tt * 3.0) * Math.min(1, gait.speed / MARCH_SPEED) * leanW;
    D.set(cur.hx, cur.hy - cur.crouch, cur.hz + swing);
    const hr = arm(0, D, 4);
    hand.position.copy(hr);
    const ce = Math.cos(cur.bEl);
    Y.set(Math.sin(cur.bAz) * ce, Math.sin(cur.bEl), Math.cos(cur.bAz) * ce);
    if (hr.y + Y.y * BLADE_L < 0.03) Y.y = (0.03 - hr.y) / BLADE_L;
    Y.normalize();
    X.crossVectors(UP, Y);
    if (X.lengthSq() < 1e-6) X.set(1, 0, 0);
    X.normalize();
    Z.crossVectors(X, Y);
    setTRS(sword.matrix, hr, X, Y, Z, 1, 1, 1);
    sword.matrixWorldNeedsUpdate = true;
    tip.position.copy(hr).addScaledVector(Y, BLADE_L);
    // --- the shield arm: square before it on guard, swung out to its left
    // and turned away while the guard is down
    D.set(cur.sx + 0.22 * open, cur.sy - cur.crouch, cur.sz - 0.14 * open - swing);
    const hl = arm(1, D, 6);
    const face = 0.9 * open;
    const sf = Math.sin(face);
    const cf = Math.cos(face);
    Z.set(sf, 0, cf);
    X.set(cf, 0, -sf);
    Y.set(0, 1, 0);
    setTRS(shield.matrix, hl, X, Y, Z, 1, 1, 1);
    shield.matrixWorldNeedsUpdate = true;
    shieldPt.position.copy(hl).addScaledVector(Z, 0.1);
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
    points: { tip, hand, shield: shieldPt },
    // §6.1 item 9: an armoured heavy: a small squash, a light flinch, the
    // shortest knock of its level; the flinch bulges at the breastplate.
    react: { squash: 0.7, flinch: 0.8, knock: 0.5, axis: 'y', midY: 0.85 },
    death: { swell: 0.8, throw: 0.5 },
  };
}
