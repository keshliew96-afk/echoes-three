// GEODE BRUTE, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level IV foes").
// The classic brute of enemies/heart.js (a wide hunched boulder-beast that
// knuckle-walks on two huge forearms, violet crystal spires growing out of
// its back, crystal knuckles, a low blunt head under the brow; the slam
// raises both fists and brings them down) with the sample video's technique
// laid ON TOP of its chibi ink look. What it gains:
//
//   * faceted masses with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd, every tone in one white material's vertex colours): the
//     boulder cut into planes with stone plates sunk in its hide, the brow
//     and the blunt head with its lip, stubby hind paws; the crystal spires
//     in the crystal material, their glow driven; the violet seams and the
//     eye slits unlit, driven;
//   * WORLD-LOCKED FEET on all fours (render/facet/foelegs.js): two stubby
//     hind legs and two huge forearms laid by two-bone IK onto feet pinned to
//     the floor while they carry weight, stepping in diagonal pairs along the
//     real travel (a heavy knuckle-walk at the sim's 0.9 u/s), the body
//     rolling with the gait and leaning into the travel (rule 1);
//   * the CRYSTAL SLAM on the sim's 60-tick ring telegraph (sim/enemies/
//     geode.js, mode 'slam'; render/facet/foestrike.js). The ring is the
//     coil: the fists leave the floor (the gait lets them go: no slide) and
//     are hauled up beside the head, the body rearing on its hind legs, the
//     crystal brightening. The strike takes the last 2.5 frames, sampled on
//     the shown sim tick, so the fists land on the resolve tick (confirmed by
//     `slamTick`): driven into the floor in front, the body thrown down after
//     them with a wide squash, held 3 frames, then the snap back and the
//     settle (B5) as the fists step back under it. Kesh's 3-hit flow (§6.1
//     B6): slam 1 the left fist alone, slam 2 the right, slam 3 the finisher:
//     both fists hauled highest, the body reared furthest, both driven down
//     together with the deepest squash;
//   * the spawn-in grow (B7), named points (B8: the fists, the brow, the
//     tallest spire), and the hit and death tuning.
//
// Faces +Z. Same contract as buildGeode (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing and damage
// untouched.
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Mesh, Vector3 } from 'three';
import { groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS } from '../../facet/kit.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, placeBody, scaleGeometry, spawnScale } from '../../facet/foe.js';
import { createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';
import { M, TINT, clamp1, crystalMaterial, heartGlow, qa, rodM, veinColor, veinMat } from './heartfoe.js';

// The sim's brute (sim/enemies/geode.js S): 0.9 u/s; a 60-tick ring
// telegraph (mode 'slam'), the slam on its resolve (slamTick).
const TICK_HZ = 60;
const MARCH_SPEED = 0.9;
export const SLAM_TEL_SEC = 60 / TICK_HZ;
const SNAP = 3 / 30;
const SETTLE = 10 / 30;
const PIVOT = new Vector3(0, 0.42, -0.15);

// --- Key poses (yaw space, u and rad). push: the shove along +z; lift: the
// body risen (+) or sunk (-) at the hips; pitch: the body nosed down (+) or
// reared (-) about the hips; twist (+ toward its left); roll; sx / sy: the
// squash; upL / upR: the fist off the floor (0 the gait's, 1 the pose's);
// lx / ly / lz, rx / ry / rz: the left and the right fist when lifted; glow:
// the crystal's tell (0..1).
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, twist: 0, roll: 0, sx: 1, sy: 1, upL: 0, upR: 0, lx: 0.55, ly: 0.13, lz: 0.5, rx: -0.55, ry: 0.13, rz: 0.5, glow: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Slam 1, THE LEFT FIST: hauled up beside the head, the body turned to its
// left and risen on the right arm; driven down ahead of it.
const C1 = K({ push: -0.04, lift: 0.04, pitch: -0.18, twist: 0.2, roll: -0.06, sx: 0.97, sy: 1.04, upL: 1, lx: 0.42, ly: 1.12, lz: 0.32, glow: 1 });
const S1 = K({ push: 0.1, lift: -0.06, pitch: 0.26, twist: -0.12, roll: 0.05, sx: 1.16, sy: 0.9, upL: 1, lx: 0.3, ly: 0.13, lz: 0.98, glow: 0.8 });
const O1 = K({ push: 0.08, lift: -0.03, pitch: 0.16, twist: -0.08, roll: 0.03, sx: 1.04, sy: 0.98, upL: 1, lx: 0.32, ly: 0.2, lz: 0.92, glow: 0.4 });
// Slam 2, THE RIGHT FIST: the mirror.
const C2 = K({ push: -0.04, lift: 0.04, pitch: -0.18, twist: -0.2, roll: 0.06, sx: 0.97, sy: 1.04, upR: 1, rx: -0.42, ry: 1.12, rz: 0.32, glow: 1 });
const S2 = K({ push: 0.1, lift: -0.06, pitch: 0.26, twist: 0.12, roll: -0.05, sx: 1.16, sy: 0.9, upR: 1, rx: -0.3, ry: 0.13, rz: 0.98, glow: 0.8 });
const O2 = K({ push: 0.08, lift: -0.03, pitch: 0.16, twist: 0.08, roll: -0.03, sx: 1.04, sy: 0.98, upR: 1, rx: -0.32, ry: 0.2, rz: 0.92, glow: 0.4 });
// Slam 3, BOTH FISTS (the biggest, §6.1 B6): reared up on the hind legs with
// both fists hauled highest; both driven down together, the body thrown
// down after them.
const C3 = K({ push: -0.06, lift: 0.08, pitch: -0.36, sx: 0.94, sy: 1.08, upL: 1, upR: 1, lx: 0.44, ly: 1.16, lz: 0.26, rx: -0.44, ry: 1.16, rz: 0.26, glow: 1 });
const S3 = K({ push: 0.14, lift: -0.1, pitch: 0.34, sx: 1.22, sy: 0.86, upL: 1, upR: 1, lx: 0.4, ly: 0.13, lz: 1.02, rx: -0.4, ry: 0.13, rz: 1.02, glow: 1 });
const O3 = K({ push: 0.1, lift: -0.05, pitch: 0.2, sx: 1.06, sy: 0.97, upL: 1, upR: 1, lx: 0.42, ly: 0.22, lz: 0.95, rx: -0.42, ry: 0.22, rz: 0.95, glow: 0.5 });
const SLAMS = [
  { label: 'the left fist', coil: C1, strike: S1, over: O1 },
  { label: 'the right fist', coil: C2, strike: S2, over: O2 },
  { label: 'both fists', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));

const SLAM_TL = strikeTimeline('slam', 'Crystal slam', {
  tel: SLAM_TEL_SEC,
  snap: SNAP,
  settle: SETTLE,
  rest: 0.3,
  labels: { coil: 'coil (the ring telegraph): the fists hauled up', strike: 'the slam', hold: 'contact: the fists in the floor', snap: 'snap back', settle: 'settle: the fists step back under' },
});
const SLAM_CONTACT = SLAM_TL.startOf('hold');
export function geodeSlamPose(v, t, out = { ...REST }) {
  return strikePoseAt(SLAM_TL, SLAMS[v] || SLAMS[0], REST, FIELDS, t, out);
}
const classicSlam = (tt, s) => ({ telegraphK: s.id === 'coil' || s.id === 'strike' ? Math.min(1, tt / SLAM_TEL_SEC) : 0, lungeK: 0, fireK: 0, e: { mode: s.id === 'coil' || s.id === 'strike' ? 'slam' : 'march', slamTick: tt >= SLAM_CONTACT ? 1 : -1 } });
export const GEODE_SLAM = strikeAbility({ id: 'slam', label: 'Crystal slam', tl: SLAM_TL, variants: SLAMS, classic: classicSlam });
export const GEODE_SLAMS_STRING = strikeAbility({ id: 'slams', label: 'Slam string', tl: SLAM_TL, variants: SLAMS, n: 3, gap: SLAM_TL.duration, classic: classicSlam });
export const GEODE_ABILITIES = Object.freeze({ slam: GEODE_SLAM, slams: GEODE_SLAMS_STRING });

// --- Geometry (built once for the session, shared by every brute) ---------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
// A crystal spire rooted at p, leaning along (lx, lz): a 4- or 5-sided cone.
function spire(p, r, h, lx, lz, seg = 4) {
  return { geo: fz(new ConeGeometry(r, h, seg).translate(0, h / 2, 0), 0.12, 1601 + Math.round(h * 100)), m: M(p[0], p[1], p[2], 1, 1, 1, qa(0, 0, 1, -lx).multiply(qa(1, 0, 0, lz))) };
}
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  const rod = fz(new CylinderGeometry(1, 1, 1, 4).translate(0, 0.5, 0), 0, 1);
  // The boulder (about the hips): the mass, stone plates sunk in it, the
  // brow, the low blunt head with its lip.
  set.body = bakeParts('geode:body', () => {
    const out = [
      { geo: fz(new IcosahedronGeometry(0.5, 0), 0.14, 1611), m: M(0, 0.34, 0.2, 1.3, 0.92, 1.05, qa(0, 1, 0, 0.3).multiply(qa(1, 0, 0, 0.2))), tint: TINT.stone },
      { geo: fz(new IcosahedronGeometry(0.17, 0), 0.12, 1613), m: M(0, 0.28, 0.66, 1.15, 0.8, 1.0), tint: TINT.stoneDark },
      { geo: fz(new BoxGeometry(0.34, 0.08, 0.16), 0.1, 1615), m: M(0, 0.42, 0.6, 1, 1, 1, qa(1, 0, 0, 0.3)), tint: TINT.stoneDark, tone: 0.9 }, // the brow
      { geo: fz(new BoxGeometry(0.2, 0.03, 0.08), 0, 1), m: M(0, 0.2, 0.78), tint: TINT.cavity }, // the lip's dark
    ];
    // stone plates sunk in the hide
    const plate = scaleGeometry({ sides: 6, jitter: 0.12, seed: 1617 });
    const PL = [[-0.42, 0.52, 0.1, 0.9], [0.45, 0.5, 0.3, 0.8], [0.2, 0.62, -0.3, 0.7], [-0.3, 0.6, -0.34, 0.75], [0.5, 0.3, 0.55, 0.6], [-0.5, 0.32, 0.5, 0.6]];
    for (let i = 0; i < PL.length; i++) {
      const [x, y, z, s] = PL[i];
      const dir = new Vector3(x, y - 0.34, z - 0.2).normalize();
      out.push({ geo: plate, m: new Matrix4().compose(new Vector3(x, y, z).addScaledVector(dir, -0.04), qa(0, 0, 1, 0).setFromUnitVectors(new Vector3(0, 1, 0), dir), new Vector3(0.2 * s, 0.07, 0.22 * s)), tint: TINT.stone, tone: 0.86 + 0.08 * (i % 3) });
    }
    return out;
  });
  // The spires out of the back (the crystal material), the knuckle crystals.
  set.spires = bakeParts('geode:spires', () => [
    spire([0, 0.64, 0.06], 0.13, 0.56, 0, -0.3, 5),
    spire([0.24, 0.6, 0.0], 0.1, 0.46, 0.45, -0.2),
    spire([-0.26, 0.6, 0.02], 0.11, 0.5, -0.5, -0.15),
    spire([0.12, 0.58, -0.22], 0.08, 0.4, 0.25, -0.55),
    spire([-0.14, 0.56, -0.24], 0.09, 0.44, -0.25, -0.6),
    spire([0.42, 0.44, 0.18], 0.07, 0.3, 0.9, 0.1),
    spire([-0.42, 0.46, 0.22], 0.06, 0.26, -0.9, 0.2),
    spire([0.05, 0.5, -0.38], 0.06, 0.24, 0.1, -1.1),
  ]);
  set.knuckle = bakeParts('geode:knuckle', () => [spire([0, 0.1, 0.1], 0.05, 0.2, 0, 0.9), spire([0.08, 0.1, 0.06], 0.04, 0.16, 0.5, 0.7), spire([-0.08, 0.1, 0.06], 0.04, 0.16, -0.5, 0.7)]);
  // The seams (unlit, driven): violet cracks over the boulder, the eye slits.
  set.seams = bakeParts('geode:seams', () => [
    { geo: rod, m: rodM([-0.35, 0.3, 0.55], [-0.12, 0.52, 0.6], 0.02) },
    { geo: rod, m: rodM([-0.12, 0.52, 0.6], [0.05, 0.42, 0.66], 0.018) },
    { geo: rod, m: rodM([0.4, 0.22, 0.5], [0.52, 0.42, 0.28], 0.02) },
    { geo: rod, m: rodM([-0.52, 0.36, 0.2], [-0.46, 0.6, -0.02], 0.018) },
    { geo: rod, m: rodM([0.3, 0.64, -0.1], [0.44, 0.5, -0.3], 0.016) },
    { geo: fz(new BoxGeometry(0.08, 0.026, 0.026), 0, 1), m: M(0.075, 0.33, 0.82, 1, 1, 1, qa(0, 1, 0, -0.3).multiply(qa(0, 0, 1, 0.35))) },
    { geo: fz(new BoxGeometry(0.08, 0.026, 0.026), 0, 1), m: M(-0.075, 0.33, 0.82, 1, 1, 1, qa(0, 1, 0, 0.3).multiply(qa(0, 0, 1, -0.35))) },
  ]);
  // A limb bone (y 0..1), a hind paw, a fist.
  set.bone = fz(new CylinderGeometry(0.8, 1, 1, 6).translate(0, 0.5, 0), 0.08, 1631);
  set.paw = bakeParts('geode:paw', () => [
    { geo: fz(new IcosahedronGeometry(0.12, 0), 0.1, 1633), m: M(0, 0.07, 0.02, 1.1, 0.7, 1.2), tint: TINT.stoneDark },
    { geo: fz(new ConeGeometry(0.03, 0.08, 4), 0.1, 1635), m: M(0.05, 0.03, 0.14, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tint: TINT.stone, tone: 1.1 },
    { geo: fz(new ConeGeometry(0.03, 0.08, 4), 0.1, 1637), m: M(-0.05, 0.03, 0.14, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tint: TINT.stone, tone: 1.1 },
  ]);
  set.fist = bakeParts('geode:fist', () => [
    { geo: fz(new IcosahedronGeometry(0.17, 0), 0.12, 1639), m: M(0, 0.0, 0.03, 1.1, 0.85, 1.15), tint: TINT.stone },
    { geo: fz(new BoxGeometry(0.22, 0.06, 0.1), 0.1, 1641), m: M(0, 0.1, 0.1, 1, 1, 1, qa(1, 0, 0, 0.4)), tint: TINT.stone, tone: 0.9 },
  ]);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Legs: 0 hind left (+x), 1 hind right, 2 fore left, 3 fore right. Hips and
// shoulders in body space (about the pivot), feet homes on the floor.
const HIPS = [new Vector3(0.26, 0.42, -0.3), new Vector3(-0.26, 0.42, -0.3), new Vector3(0.5, 0.88, 0.25), new Vector3(-0.5, 0.88, 0.25)];
const HOMES = [new Vector3(0.27, 0, -0.34), new Vector3(-0.27, 0, -0.34), new Vector3(0.56, 0, 0.5), new Vector3(-0.56, 0, 0.5)];
const BEND = [new Vector3(0.3, 0, 1).normalize(), new Vector3(-0.3, 0, 1).normalize(), new Vector3(0.6, 0, -1).normalize(), new Vector3(-0.6, 0, -1).normalize()];
const LEG = [[0.22, 0.22], [0.22, 0.22], [0.42, 0.4], [0.42, 0.4]];
const ANKLE = [0.06, 0.06, 0.13, 0.13];

export function buildGeodeFacet() {
  const G = geos();
  const F = createFoeFrame('geode');
  const { body, spawn, track } = F;
  const mat = track(foeMaterial('#FFFFFF'));
  const crystal = crystalMaterial(0.5);
  const veins = veinMat();
  body.add(foePart(G.body, mat, 'full', 'geode-boulder'));
  body.add(foePart(G.spires, crystal, 'full', 'geode-spires'));
  const seams = new Mesh(G.seams, veins);
  seams.name = 'geode-seams';
  body.add(seams);
  const glow = heartGlow(1.1, 0.25);
  glow.name = 'geode-spire-glow';
  glow.position.set(0, 1.0, -0.05);
  body.add(glow);
  const bones = instancedPart(G.bone, mat, 8, { name: 'geode-bones', moving: true, inkPx: 2.0 });
  for (let i = 0; i < 8; i++) bones.setColorAt(i, i < 4 ? TINT.stoneDark : TINT.stone);
  const paws = instancedPart(G.paw, mat, 2, { name: 'geode-paws', moving: true, inkPx: 1.6 });
  const fists = instancedPart(G.fist, mat, 2, { name: 'geode-fists', moving: true, inkPx: 2.0 });
  const knuckles = instancedPart(G.knuckle, crystal, 2, { name: 'geode-knuckles', moving: true, inkPx: 1.4 });
  for (const o of [bones, paws, fists, knuckles]) spawn.add(o);
  F.group.add(groundShadow(0.62, 0.85, { forward: 0.22, wide: 1.25 }));

  // Named points (B8): the fists, the brow, the tallest spire.
  const fistL = namedPoint(spawn, 'geode-fist-left', 0.55, 0.13, 0.5);
  const fistR = namedPoint(spawn, 'geode-fist-right', -0.55, 0.13, 0.5);
  const brow = namedPoint(body, 'geode-brow', 0, 0.4, 0.75);
  const spireTip = namedPoint(body, 'geode-spire', 0, 1.18, -0.1);

  const gait = createLegs({ homes: HOMES, groups: [[0, 3], [1, 2]], trigger: 0.1, reach: 0.3, lift: 0.1, durMin: 0.18, durMax: 0.32 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, snapSec: SNAP, settleSec: SETTLE });
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const m = new Matrix4();
  const C = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  let age = -1;
  let yawNow = 0;
  let slams = 0;
  let lastSlam = null;
  let leanW = 1;
  const lifted = [0, 0, 0, 0];
  const drawn = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  const up = [0, 0]; // the fists' lift blend as drawn (left, right)
  const wasUp = [false, false];
  const gaitOpts = { locked: true };

  const lab = {
    abilities: GEODE_ABILITIES,
    override: null,
    lastStrike: null,
    // a lifted fist carries no weight (it is the pose's, not the floor's)
    feet: () => gait.feet().map((p, i) => ({ ...p, planted: p.planted && !(i >= 2 && up[i - 2] > 0.01), drawnX: drawn[i].x, drawnZ: drawn[i].z, drawnY: drawn[i].y + lifted[i] })),
    pose: () => ({ ...cur }),
    get hit() {
      return clip.state === 'rest' ? -1 : (slams - 1) % 3;
    },
    parts: { body, bones, fists, knuckles, glow },
  };

  function liveSlam(P, now, tick, e) {
    const beat = watch.update(P);
    let fired = false;
    if (e) {
      const st = Number.isFinite(e.slamTick) ? e.slamTick : -1;
      if (lastSlam === null) lastSlam = st;
      else if (st !== lastSlam) {
        fired = st >= 0;
        lastSlam = st;
      }
    }
    clip.update({ beat, tel: watch.telegraph, now, tick, fired, pick: () => SLAMS[slams++ % 3], name: () => `slam:${((slams - 1) % 3) + 1}`, out: cur });
    lab.lastStrike = clip.lastStrike;
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
      const ab = GEODE_ABILITIES[lab.override.id] || GEODE_SLAM;
      const h = ab.at(lab.override.t);
      geodeSlamPose(h.v, h.t, cur);
      watch.reset();
      clip.reset();
    } else liveSlam(P, now, tick, e);

    // --- feet: locked to the floor in diagonal pairs; a fist the slam lifts
    // leaves the gait (no weight, no slide) and steps back under it after
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
    up[0] = cur.upL;
    up[1] = cur.upR;
    for (let i = 0; i < 2; i++) {
      const isUp = up[i] > 0.01;
      if (wasUp[i] && !isUp) gait.release(2 + i, 5 / 30);
      wasUp[i] = isUp;
    }

    // --- the body: the knuckle-walk's roll and bob, the lean into the
    // travel (rule 1), the slam's rear and throw about the hips
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const gaitRoll = (gait.out[0].y - gait.out[1].y) * 0.4 * leanW;
    body.rotation.set(0.08 + cur.pitch + 0.08 * fwd * leanW, cur.twist, cur.roll - 0.05 * side * leanW + gaitRoll);
    body.scale.set(cur.sx, cur.sy, cur.sx);
    placeBody(body, PIVOT, cur.push, cur.lift + 0.03 * bob + 0.01 * Math.sin(tt * 1.2 + id));
    body.updateMatrix();

    // --- legs and arms: the hips ride the body, the feet stand where the
    // gait put them, a lifted fist goes where the pose says
    for (let i = 0; i < 4; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      foot.y += ANKLE[i];
      if (i >= 2) {
        const k = up[i - 2];
        if (k > 0) {
          const tx = i === 2 ? cur.lx : cur.rx;
          const ty = i === 2 ? cur.ly : cur.ry;
          const tz = i === 2 ? cur.lz : cur.rz;
          foot.set(foot.x + (tx - foot.x) * k, foot.y + (ty - foot.y) * k, foot.z + (tz - foot.z) * k);
        }
      }
      const L = LEG[i];
      lifted[i] = liftToReach(hipW, foot, L[0], L[1]);
      if (clampReach(hipW, foot, L[0], L[1]) > 1e-4) {
        gait.release(i);
        lifted[i] = Math.max(lifted[i], 1e-3);
      }
      solveKnee(hipW, foot, L[0], L[1], BEND[i], knee);
      const r0 = i < 2 ? 0.1 : 0.13;
      const r1 = i < 2 ? 0.09 : 0.11;
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, r0, r0, 0.03));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, r1, r1, 0.03));
      C.set(foot.x, foot.y - ANKLE[i], foot.z);
      drawn[i].copy(C);
      X.set(1, 0, 0);
      Y.set(0, 1, 0);
      Z.set(0, 0, 1);
      if (i < 2) {
        setTRS(m, C, X, Y, Z, 1, 1, 1);
        paws.setMatrixAt(i, m);
      } else {
        // a raised fist turns its knuckles forward
        const k = up[i - 2];
        Y.set(0, Math.cos(k * 1.2), -Math.sin(k * 1.2));
        Z.set(0, Math.sin(k * 1.2), Math.cos(k * 1.2));
        setTRS(m, C, X, Y, Z, 1, 1, 1);
        fists.setMatrixAt(i - 2, m);
        knuckles.setMatrixAt(i - 2, m);
        (i === 2 ? fistL : fistR).position.copy(C);
      }
    }
    bones.instanceMatrix.needsUpdate = true;
    paws.instanceMatrix.needsUpdate = true;
    fists.instanceMatrix.needsUpdate = true;
    knuckles.instanceMatrix.needsUpdate = true;

    // --- the tell: the crystal brightens through the coil and flares on
    // the slam; the seams with it
    crystal.emissiveIntensity = 0.5 + 0.6 * cur.glow + 0.06 * Math.sin(tt * 2 + id);
    veinColor(veins.color, 0.4 + 0.6 * cur.glow);
    glow.material.opacity = 0.22 + 0.5 * cur.glow;
    glow.scale.setScalar(1.1 * (1 + 0.3 * cur.glow));
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
    points: { fistL, fistR, brow, spire: spireTip },
    // §6.1 item 9: a boulder: a shallow squash, a short flinch, hardly any
    // knock; the flinch bulges at the mass.
    react: { squash: 0.6, flinch: 0.7, knock: 0.45, axis: 'y', midY: 0.8 },
    death: { swell: 0.7, throw: 0.5 },
  };
}
