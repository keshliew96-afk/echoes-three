// BARROW RAM, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level III foes").
// The classic ram of enemies/archetypes.js (a grey block of a body under
// shaggy fleece, a dark face, two thick bone horns curling forward into a
// shield disc, the indigo rim and ridge on the disc's face its one tell,
// stout legs) with the sample video's technique laid ON TOP of its chibi
// ink look. What it gains:
//
//   * a faceted hide cut into planes, with BAKED detail (render/facet/foe.js,
//     one draw call for the crowd): the fleece as a mass of brighter clumps
//     over the back and shoulders, a dark chest and belly band, the face
//     with its brow ridge and muzzle, charcoal slit eyes (never round,
//     never warm);
//   * a HEAD on its own neck hinge that carries the HORNS (each a curved
//     tapering horn of the kit, bent through a full curl, ribbed with growth
//     rings) and the SHIELD DISC they meet in (a ten-sided bone boss with
//     rivets round its face); the indigo rim and ridge baked on the disc,
//     unlit; the guard's glow flares on every blocked shot (the sim's
//     `lastBlockedTick`), as the classic's does;
//   * WORLD-LOCKED FEET (render/facet/foelegs.js): four stout legs laid by
//     two-bone IK onto hooves pinned to the floor while they carry weight,
//     stepping in diagonal pairs along the real travel; the sim turns the
//     ram at 90°/s and walks it where its horns point, so a turn steps round
//     and never drags; the body leans into the travel (rule 1);
//   * the HORN SLAM on the sim's 60-tick cone telegraph (sim/enemies/ram.js):
//     the telegraph is the coil (the hips sink, the body winds back and the
//     head cocks up, the horns drawn away from the blow), the strike takes
//     its last 2.5 frames, sampled on the shown sim tick, so the horns land
//     on the resolve tick with the body driven in on its full lean and the
//     contact squash (§6.1 B9), the front hooves stepped in by the contact
//     (rule 3); held 3 frames, a recoil shove back (B3), then the snap back
//     and the settle with one overshoot (B5). Repeat slams cycle Kesh's
//     3-hit flow: the horns hooked across from its right, the reverse hook
//     from its left, then the finisher, gathered low and heaved up and
//     forward with its whole weight, the shield thrown into the target (B6;
//     a rear would lift the horns through its elite crown);
//   * the spawn-in grow (B7), named points (B8: the shield's face, the
//     mouth), and the hit and death tuning.
//
// Faces +Z. Same contract as buildRam (group, mats, setYaw, pose, blocked)
// plus lab, react, death, points. Render only: the sim, its timing, damage
// and guard untouched.
import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { makeGlowSprite } from '../../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS } from '../../facet/kit.js';
import { recoil } from '../../facet/beats.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, hornGeometry, namedPoint, placeBody, spawnScale } from '../../facet/foe.js';
import { HOLD_SEC, STRIKE_SEC, createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';

// The sim's ram (sim/enemies/ram.js S): walks 1.1 u/s; the cone telegraph is
// 60 ticks; a blocked shot marks lastBlockedTick.
const TICK_HZ = 60;
const WALK_SPEED = 1.1;
export const SLAM_TEL_SEC = 60 / TICK_HZ;

// --- Key poses. push (u, +z), lift (u), pitch (front down +), roll (+
// toward its right), twist (+ toward its left), sx / sy (squash), head (rad,
// + tips the head up), hy (rad, the head turned, + to its left), crouch (u,
// the hips sunk).
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, head: 0, hy: 0, crouch: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Slam 1, THE HOOK FROM ITS RIGHT: wound back to its right with the head
// cocked up and away; the horns rip across the front to its left.
const C1 = K({ push: -0.08, pitch: -0.06, roll: 0.05, twist: -0.3, sx: 0.96, sy: 1.05, head: 0.28, hy: -0.42, crouch: 0.04 });
const S1 = K({ push: 0.18, pitch: 0.22, roll: -0.05, twist: 0.24, sx: 1.19, sy: 0.91, head: -0.3, hy: 0.36 });
const O1 = K({ push: 0.12, pitch: 0.16, twist: 0.3, sx: 1.05, sy: 0.97, head: -0.16, hy: 0.42 });
// Slam 2, THE REVERSE HOOK: the mirror, wound to its left, ripped to its right.
const C2 = K({ push: -0.08, pitch: -0.06, roll: -0.05, twist: 0.3, sx: 0.96, sy: 1.05, head: 0.28, hy: 0.42, crouch: 0.04 });
const S2 = K({ push: 0.18, pitch: 0.22, roll: 0.05, twist: -0.24, sx: 1.19, sy: 0.91, head: -0.3, hy: -0.36 });
const O2 = K({ push: 0.12, pitch: 0.16, twist: -0.3, sx: 1.05, sy: 0.97, head: -0.16, hy: -0.42 });
// Slam 3, THE HEAVE (the biggest, §6.1 B6): gathered low, the hips sunk
// and the head drawn down and back; it drives up and forward with its
// whole weight, the shield thrown up into the target with a stretch.
const C3 = K({ push: -0.12, lift: -0.02, pitch: 0.1, sx: 1.06, sy: 0.92, head: -0.12, crouch: 0.1 });
const S3 = K({ push: 0.2, lift: 0.02, sx: 0.9, sy: 1.1, head: 0.1 });
const O3 = K({ push: 0.14, lift: 0.01, pitch: -0.03, sx: 0.96, sy: 1.04, head: 0.06 });
const SLAMS = [
  { label: 'the hook from its right', coil: C1, strike: S1, over: O1 },
  { label: 'the reverse hook', coil: C2, strike: S2, over: O2 },
  { label: 'the heave', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));

// The B3 recoil after the held contact: 0.1 u back along the facing.
const RECOIL_U = 0.1;
const SLAM_TL = strikeTimeline('slam', 'Horn slam', {
  tel: SLAM_TEL_SEC,
  rest: 0.25,
  labels: { coil: 'coil (the cone telegraph): wound back, the head cocked', strike: 'the slam', hold: 'contact: the horns in', snap: 'snap back', settle: 'settle' },
});
function heldMotion(V, age, out) {
  out.push -= RECOIL_U * recoil(age - HOLD_SEC);
}
export function ramSlamPose(v, t, out = { ...REST }) {
  return strikePoseAt(SLAM_TL, SLAMS[v] || SLAMS[0], REST, FIELDS, t, out, heldMotion);
}
export const RAM_SLAM = strikeAbility({ id: 'slam', label: 'Horn slam', tl: SLAM_TL, variants: SLAMS });
export const RAM_SLAMS_STRING = strikeAbility({ id: 'slams', label: 'Slam string', tl: SLAM_TL, variants: SLAMS, n: 3, gap: SLAM_TL.duration });
export const RAM_ABILITIES = Object.freeze({ slam: RAM_SLAM, slams: RAM_SLAMS_STRING });

// --- Geometry (built once for the session, shared by every ram) -------------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
const TWO_PI = Math.PI * 2;
// The neck hinge (body space).
const HEAD_AT = new Vector3(0, 0.6, 0.32);
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  // The trunk: the classic's block, cut into planes; the fleece as brighter
  // clumps over the back and shoulders; a dark chest and belly band.
  set.trunk = bakeParts('ram:trunk', () => {
    const out = [
      { geo: fz(new BoxGeometry(0.62, 0.44, 0.86, 2, 1, 3), 0.12, 801), m: M(0, 0.52, -0.1) },
      { geo: fz(new BoxGeometry(0.5, 0.16, 0.7), 0.1, 803), m: M(0, 0.32, -0.08), tone: 0.6 },
      { geo: fz(new SphereGeometry(0.22, 8, 5), 0.12, 805), m: M(0, 0.5, 0.3, 1.2, 0.8, 0.6), tone: 0.7 },
    ];
    const clump = fz(new IcosahedronGeometry(0.11, 0), 0.22, 807);
    const C = [
      [-0.18, 0.76, 0.02, 1.3, 0.3], [0.17, 0.77, -0.08, 1.25, -0.4], [-0.1, 0.78, -0.3, 1.2, 0.9], [0.14, 0.76, 0.2, 1.15, 0.2],
      [0.0, 0.8, -0.14, 1.1, 1.3], [-0.26, 0.7, -0.22, 1.0, 0.5], [0.28, 0.68, 0.08, 1.0, -0.8], [-0.04, 0.78, 0.24, 1.05, 2.1],
      [0.24, 0.7, -0.34, 0.95, 0.1], [-0.3, 0.66, 0.16, 0.9, 1.7], [0.06, 0.74, -0.42, 0.95, 0.6], [-0.22, 0.72, -0.4, 0.9, -1.2],
    ];
    for (const [x, y, z, s, a] of C) out.push({ geo: clump, m: M(x, y - 0.02, z, 1.25 * s, 0.6 * s, 1.1 * s, qa(0, 1, 0, a)), tone: 1.18 });
    return out;
  });
  // The head (about the neck hinge): the dark face, the brow ridge, the
  // muzzle, the horns' bases on each side.
  set.head = bakeParts('ram:head', () => {
    const o = (x, y, z) => [x - HEAD_AT.x, y - HEAD_AT.y, z - HEAD_AT.z];
    const out = [
      { geo: fz(new BoxGeometry(0.3, 0.3, 0.34, 1, 1, 2), 0.12, 811), m: M(...o(0, 0.58, 0.42)) },
      { geo: fz(new BoxGeometry(0.2, 0.16, 0.18), 0.1, 813), m: M(...o(0, 0.5, 0.62)), tone: 0.92 },
      { geo: fz(new BoxGeometry(0.3, 0.06, 0.1), 0.1, 815), m: M(...o(0, 0.72, 0.5), 1, 1, 1, qa(1, 0, 0, 0.3)), tone: 0.82 },
      { geo: fz(new BoxGeometry(0.1, 0.04, 0.05), 0.1, 817), m: M(...o(0, 0.44, 0.7)), tone: 0.5 },
    ];
    const base = fz(new SphereGeometry(0.08, 6, 4), 0.14, 819);
    for (const s of [-1, 1]) out.push({ geo: base, m: M(...o(s * 0.17, 0.66, 0.4), 1, 0.9, 1), tone: 0.85 });
    return out;
  });
  // The horns and the shield (bone): each horn a curved tapering horn bent
  // through a curl from its base beside the brow, forward and down into the
  // disc; the ten-sided disc with rivets round its face.
  set.horn = bakeParts('ram:horn', () => {
    const o = (x, y, z) => [x - HEAD_AT.x, y - HEAD_AT.y, z - HEAD_AT.z];
    const out = [];
    const horn = hornGeometry({ len: 1, r: 0.3, bend: 2.9, seg: 6, sides: 6, seed: 821 });
    for (const s of [-1, 1]) {
      // the horn's base points up and out, and bends (toward its own +z)
      // forward and down into the disc
      const q = qa(0, 1, 0, s * 0.35).multiply(qa(1, 0, 0, -0.55)).multiply(qa(0, 0, 1, s * 0.5));
      out.push({ geo: horn, m: M(...o(s * 0.19, 0.64, 0.44), 0.26, 0.5, 0.26, q) });
    }
    out.push({ geo: fz(new CylinderGeometry(0.36, 0.33, 0.09, 10), 0.08, 823), m: M(...o(0, 0.58, 0.8), 1, 1, 1, qa(1, 0, 0, Math.PI / 2)) });
    const rivet = fz(new SphereGeometry(0.025, 5, 3), 0.1, 825);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TWO_PI;
      out.push({ geo: rivet, m: M(...o(Math.cos(a) * 0.27, 0.58 + Math.sin(a) * 0.27, 0.845), 1, 1, 0.6), tone: 0.8 });
    }
    return out;
  });
  // The tell (unlit): the indigo rim and ridge on the disc's face.
  set.tell = bakeParts('ram:tell', () => {
    const o = (x, y, z) => [x - HEAD_AT.x, y - HEAD_AT.y, z - HEAD_AT.z];
    return [
      { geo: fz(new TorusGeometry(0.33, 0.028, 4, 20), 0.2, 831), m: M(...o(0, 0.58, 0.846)) },
      { geo: fz(new BoxGeometry(0.05, 0.5, 0.03), 0.15, 833), m: M(...o(0, 0.58, 0.85)), tone: 0.8 },
    ];
  });
  // Eyes: slit bars (unlit charcoal).
  set.eyes = bakeParts('ram:eyes', () => {
    const o = (x, y, z) => [x - HEAD_AT.x, y - HEAD_AT.y, z - HEAD_AT.z];
    const bar = fz(new BoxGeometry(0.08, 0.02, 0.02), 0, 1);
    return [-1, 1].map((s) => ({ geo: bar, m: M(...o(s * 0.11, 0.61, 0.595), 1, 1, 1, qa(0, 0, 1, s * 0.35)) }));
  });
  // A leg bone (y 0..1, tapering), a cloven hoof.
  set.bone = fz(new CylinderGeometry(0.8, 1, 1, 6).translate(0, 0.5, 0), 0.08, 841);
  set.hoof = bakeParts('ram:hoof', () => [
    { geo: fz(new BoxGeometry(0.07, 0.06, 0.1), 0.08, 843), m: M(-0.04, 0.03, 0.02), tone: 0.8 },
    { geo: fz(new BoxGeometry(0.07, 0.06, 0.1), 0.08, 845), m: M(0.04, 0.03, 0.02), tone: 0.8 },
  ]);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Legs: 0 fore left (+x), 1 fore right, 2 hind left, 3 hind right. Hips in
// body space, hoof homes on the floor (yaw space), the knee's pole (the
// fore knees forward, the hind hocks back).
const HIPS = [new Vector3(0.2, 0.42, 0.2), new Vector3(-0.2, 0.42, 0.2), new Vector3(0.2, 0.42, -0.34), new Vector3(-0.2, 0.42, -0.34)];
const HOMES = [new Vector3(0.22, 0, 0.2), new Vector3(-0.22, 0, 0.2), new Vector3(0.22, 0, -0.36), new Vector3(-0.22, 0, -0.36)];
const BEND = [new Vector3(0.1, 0.2, 1).normalize(), new Vector3(-0.1, 0.2, 1).normalize(), new Vector3(0.1, 0.2, -1).normalize(), new Vector3(-0.1, 0.2, -1).normalize()];
const L1 = 0.21;
const L2 = 0.2;
const ANKLE = 0.05;
const LEG_R = [0.075, 0.062];
const PIVOT = new Vector3(0, 0.46, 0);
const LUNGE_U = 0.14;
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildRamFacet() {
  const G = geos();
  const F = createFoeFrame('ram');
  const { body, spawn, track } = F;
  const hideMat = track(foeMaterial(HIDE.ramBody));
  const darkMat = track(foeMaterial(HIDE.ramDark));
  const hornMat = track(foeMaterial(HIDE.ramHorn));
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const tellMat = new MeshBasicMaterial({ color: exactColor(TELL_INDIGO), toneMapped: false });

  body.add(foePart(G.trunk, hideMat, 'full', 'ram-trunk'));
  const head = foePart(G.head, darkMat, 'full', 'ram-head');
  head.position.copy(HEAD_AT);
  body.add(head);
  head.add(foePart(G.horn, hornMat, 'full', 'ram-horns'));
  head.add(foePart(G.tell, tellMat, false, 'ram-tell'));
  head.add(foePart(G.eyes, eyeMat, false, 'ram-eyes'));
  const guardGlow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 1.0, opacity: 0.18 });
  guardGlow.material.toneMapped = false;
  guardGlow.material.color.copy(TELL_INDIGO_GLOW);
  guardGlow.name = 'ram-guard-glow';
  guardGlow.position.set(0, 0.02, 0.58);
  head.add(guardGlow);
  // the legs (8 bones) on one row, the four hooves on another
  const bones = instancedPart(G.bone, darkMat, 8, { name: 'ram-bones', moving: true, inkPx: 2.0 });
  const hooves = instancedPart(G.hoof, darkMat, 4, { name: 'ram-hooves', moving: true, inkPx: 1.6 });
  spawn.add(bones);
  spawn.add(hooves);
  F.group.add(groundShadow(0.66, 0.9, { forward: 0.34, wide: 1.1, deep: 0.96 }));

  // Named points (B8): the shield's face (the weapon), the mouth.
  const tip = namedPoint(head, 'ram-tip', 0, -0.02, 0.86 - HEAD_AT.z);
  const mouth = namedPoint(head, 'ram-mouth', 0, 0.44 - HEAD_AT.y, 0.72 - HEAD_AT.z);

  const gait = createLegs({ homes: HOMES, groups: [[0, 3], [1, 2]], trigger: 0.09, reach: 0.2, lift: 0.07, durMin: 0.1, durMax: 0.2 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, held: heldMotion });
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  const m = new Matrix4();
  const X = new Vector3();
  const Y = new Vector3(0, 1, 0);
  const Z = new Vector3();
  let age = -1;
  let yawNow = 0;
  let slams = 0;
  let lastBlock = null;
  let flare = 0;
  let leanW = 1;
  let lunge = 0;
  let lastState = 'rest';
  const lifted = [0, 0, 0, 0];
  const gaitOpts = { locked: true, shift: null };

  const lab = {
    abilities: RAM_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => gait.feet().map((p, i) => ({ ...p, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur }),
    get hit() {
      return clip.state === 'rest' ? -1 : (slams - 1) % 3;
    },
    get flare() {
      return flare;
    },
    parts: { body, head, bones, hooves, guardGlow },
  };

  // the lunge: the front hooves step in for the strike, timed to land by
  // its contact, and back out as the snap settles
  gaitOpts.shift = (i, o) => {
    if (i < 2) o.z += LUNGE_U * lunge;
    return o;
  };
  function liveSlam(P, now, tick, e) {
    const beat = watch.update(P);
    const st = clip.update({
      beat,
      tel: watch.telegraph,
      now,
      tick,
      pick: () => SLAMS[slams++ % 3],
      name: () => `slam:${((slams - 1) % 3) + 1}`,
      out: cur,
    });
    lab.lastStrike = clip.lastStrike;
    if (st !== lastState) {
      if (st === 'strike' || st === 'snapin') {
        lunge = 1;
        gait.release(0, STRIKE_SEC);
        gait.release(1, STRIKE_SEC);
      } else if (st === 'pull' || st === 'abort' || st === 'rest') {
        if (lunge) {
          lunge = 0;
          gait.release(0, 4 / 30);
          gait.release(1, 4 / 30);
        }
      }
      lastState = st;
    }
    if (e) {
      const lb = Number.isFinite(e.lastBlockedTick) ? e.lastBlockedTick : -1;
      if (lastBlock === null) lastBlock = lb;
      else if (lb !== lastBlock) {
        lastBlock = lb;
        if (lb >= 0) flare = 1;
      }
    }
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

    if (lab.override) {
      const ab = RAM_ABILITIES[lab.override.id] || RAM_SLAM;
      const h = ab.at(lab.override.t);
      ramSlamPose(h.v, h.t, cur);
      lunge = h.phase === 'strike' || h.phase === 'hold' ? 1 : 0;
      flare = h.phase === 'hold' ? 1 : 0;
      watch.reset();
      clip.reset();
      lastState = 'rest';
    } else liveSlam(P, now, tick, e);
    flare = Math.max(0, flare - dt * 3.5);

    // --- feet: locked to the floor, stepping in diagonal pairs
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

    // --- the body: the slam's pose, the walk's bob and lean, a slow breath
    const breath = Math.sin(tt * 1.9);
    leanW += ((clip.state === 'rest' && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 12);
    body.rotation.set(cur.pitch + 0.08 * fwd * leanW, cur.twist, cur.roll - 0.06 * side * leanW + 0.025 * bob * (side >= 0 ? 1 : -1));
    body.scale.set(cur.sx, cur.sy * (1 + 0.01 * breath), 1 + (cur.sx - 1) * 0.3);
    placeBody(body, PIVOT, cur.push, cur.lift - cur.crouch + 0.02 * bob);
    body.updateMatrix();
    head.rotation.set(-cur.head + (leanW > 0.5 ? 0.04 * Math.sin(tt * 1.3) : 0), cur.hy, 0);
    guardGlow.material.opacity = 0.14 + 0.05 * Math.sin(tt * 2) + 0.5 * flare;
    guardGlow.scale.setScalar(1.0 + 0.5 * flare);

    // --- legs: the hips ride the body, the hooves stand where the gait put them
    for (let i = 0; i < 4; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      foot.y += ANKLE;
      lifted[i] = liftToReach(hipW, foot, L1, L2);
      if (clampReach(hipW, foot, L1, L2) > 1e-4) {
        gait.release(i);
        lifted[i] = Math.max(lifted[i], 1e-3);
      }
      solveKnee(hipW, foot, L1, L2, BEND[i], knee);
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, LEG_R[0], LEG_R[0], 0.03));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, LEG_R[1], LEG_R[1], 0.02));
      foot.y -= ANKLE;
      Z.set(0, 0, 1);
      X.set(1, 0, 0);
      setTRS(m, foot, X, Y, Z, 1, 1, 1);
      hooves.setMatrixAt(i, m);
    }
    bones.instanceMatrix.needsUpdate = true;
    hooves.instanceMatrix.needsUpdate = true;
  }
  return {
    group: F.group,
    mats: F.mats,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    blocked() {
      flare = 1;
    },
    pose,
    lab,
    modelStandard: true,
    body: F.yaw,
    points: { tip, hand: tip, mouth },
    // §6.1 item 9: a heavy block of a body: a light squash and flinch, a
    // short knock (the sim scales its knockback down too); the flinch bulges
    // at the shoulders.
    react: { squash: 0.85, flinch: 0.8, knock: 0.6, axis: 'y', midY: 0.5 },
    death: { swell: 0.9, throw: 0.7 },
  };
}
