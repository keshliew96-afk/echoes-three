// MIRE TOAD, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level II foes").
// The classic toad of enemies/archetypes.js (a wide squat body, a broad flat
// head with a pale throat sac hung under the chin, the eye bulges with their
// indigo glint its one tell, folded hind legs) with the sample video's
// technique laid ON TOP of its chibi ink look. What it gains:
//
//   * a faceted hide cut into planes, with BAKED detail (render/facet/foe.js,
//     one draw call for the crowd): warts down the back in darker steps, a
//     ridge over each eye, a pale belly band, the wide mouth line;
//   * a HEAD that tips and a JAW that drops on their own hinges, the throat
//     sac hung on the jaw so it swings and fills;
//   * WORLD-LOCKED FEET (render/facet/foelegs.js): four legs, the big hind
//     legs folded with their knees out and forward, the short fore legs, each
//     webbed foot pinned to the floor while it carries weight and stepping in
//     diagonal pairs; the body leans into its travel and bobs on each step;
//   * the LOB (sim/enemies/toad.js: unwarned, one glob every 204 ticks). The
//     sim gives no wind-up, so the gather is read ahead from the toad's own
//     cooldown: over its last half second the toad crouches, tucks its chin
//     and fills its sac, and it stays loaded until the sim lets it throw
//     (the glob's own arc and Ember ring are the warning). On the throw tick
//     it snaps in within one frame (§6.1 B1): reared up, the head thrown up
//     and the jaw wide (a lob goes up), the sac emptied, the shooter's squash held 3 frames with a recoil
//     shove back (B3), then the snap back and the settle (B5). Repeat lobs
//     fling from its left, from its right, then the finisher: it rears high
//     on its hind legs and heaves (B6);
//   * the spawn-in grow (B7), named points (B8: the mouth, the sac), and the
//     hit and death tuning.
//
// Faces +Z. Same contract as buildToad (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim and its timing untouched.
import { BoxGeometry, Color, IcosahedronGeometry, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_DIM } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS } from '../../facet/kit.js';
import { ease } from '../../facet/timeline.js';
import { recoil } from '../../facet/beats.js';
import { SPAWN_SEC, bakeParts, createFoeClock, createFoeFrame, foeMaterial, foePart, lerpFields, namedPoint, placeBody, spawnScale } from '../../facet/foe.js';
import { STRIKE_SEC, createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';

// The sim's toad (sim/enemies/toad.js S): walks 1.0 u/s; lobs every 204
// ticks with no wind-up.
const TICK_HZ = 60;
const WALK_SPEED = 1.0;
// The gather read ahead from the cooldown (render only): its last 30 ticks.
const LOAD_TICKS = 30;
export const LOAD_SEC = LOAD_TICKS / TICK_HZ;

// --- Key poses. push (u, +z), lift (u), pitch (front down +), roll (+ toward
// its right), twist (+ toward its left), sx / sy (squash), head (rad, + tips
// the head up), jaw (rad, the mouth's gape), sac (the throat sac's swell,
// 0 at rest), haunch (u, the hind legs' crouch: + drops the rump).
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, head: 0, jaw: 0.04, sac: 0, haunch: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Lob 1, FROM ITS LEFT: crouched low and turned to its left, the chin
// tucked and the sac full; it rears up whipping across to its right and
// lobs the glob up out of the wide mouth.
const C1 = K({ push: -0.04, lift: -0.02, pitch: 0.06, roll: -0.04, twist: 0.26, sx: 1.07, sy: 0.92, head: -0.14, jaw: 0.06, sac: 0.55, haunch: 0.03 });
const S1 = K({ push: 0.07, lift: 0.02, pitch: -0.16, roll: 0.05, twist: -0.18, sx: 0.9, sy: 1.12, head: 0.3, jaw: 0.7, sac: -0.3 });
const O1 = K({ push: 0.04, pitch: -0.08, twist: -0.24, sx: 1.04, sy: 0.97, head: 0.14, jaw: 0.32, sac: -0.2 });
// Lob 2, FROM ITS RIGHT: the mirror, whipping across to its left.
const C2 = K({ push: -0.04, lift: -0.02, pitch: 0.06, roll: 0.04, twist: -0.26, sx: 1.07, sy: 0.92, head: -0.14, jaw: 0.06, sac: 0.55, haunch: 0.03 });
const S2 = K({ push: 0.07, lift: 0.02, pitch: -0.16, roll: -0.05, twist: 0.18, sx: 0.9, sy: 1.12, head: 0.3, jaw: 0.7, sac: -0.3 });
const O2 = K({ push: 0.04, pitch: -0.08, twist: 0.24, sx: 1.04, sy: 0.97, head: 0.14, jaw: 0.32, sac: -0.2 });
// Lob 3, THE HEAVE (the biggest, §6.1 B6): squashed flat to the floor, the
// chin tucked hard and the sac swollen huge; it rears high off its hind legs
// and heaves the glob up and away.
const C3 = K({ push: -0.06, lift: -0.04, pitch: 0.1, sx: 1.1, sy: 0.88, head: -0.2, jaw: 0.08, sac: 0.85, haunch: 0.05 });
const S3 = K({ push: 0.1, lift: 0.05, pitch: -0.3, sx: 0.88, sy: 1.16, head: 0.4, jaw: 0.85, sac: -0.4 });
const O3 = K({ push: 0.06, lift: 0.01, pitch: -0.14, sx: 1.06, sy: 0.96, head: 0.18, jaw: 0.36, sac: -0.25 });
const LOBS = [
  { label: 'flung from its left', coil: C1, strike: S1, over: O1 },
  { label: 'flung from its right', coil: C2, strike: S2, over: O2 },
  { label: 'the heave', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));
export const TOAD_REST = REST;
export const TOAD_LOBS = Object.freeze(LOBS);

// The B3 shooter recoil after the held contact: 0.07 u back.
const RECOIL_U = 0.07;
const LOB_TL = strikeTimeline('lob', 'Lob', {
  tel: LOAD_SEC + STRIKE_SEC,
  rest: 0.3,
  labels: { coil: 'gather: crouched, the sac fills (read ahead from its cooldown)', strike: 'the fling', hold: 'contact: the glob away, the squash held', snap: 'snap back', settle: 'settle' },
});
const CONTACT_AT = LOB_TL.startOf('hold');
function heldMotion(V, age, out) {
  out.push -= RECOIL_U * recoil(age);
}
export function toadLobPose(v, t, out = { ...REST }) {
  return strikePoseAt(LOB_TL, LOBS[v] || LOBS[0], REST, FIELDS, t, out, heldMotion);
}
const classicLob = (tt) => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { throwTick: tt >= CONTACT_AT ? 1 : -1 } });
export const TOAD_LOB = strikeAbility({ id: 'lob', label: 'Lob', tl: LOB_TL, variants: LOBS, classic: classicLob });
export const TOAD_LOBS_STRING = strikeAbility({ id: 'lobs', label: 'Lob string', tl: LOB_TL, variants: LOBS, n: 3, gap: LOB_TL.duration, classic: classicLob });
export const TOAD_ABILITIES = Object.freeze({ lob: TOAD_LOB, lobs: TOAD_LOBS_STRING });

// --- Geometry (built once for the session, shared by every toad) ------------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
// The hinges (body space): the head's at the neck, the jaw's under it, the
// sac's middle under the chin.
const HEAD_AT = new Vector3(0, 0.3, 0.1);
const JAW_AT = new Vector3(0, 0.27, 0.12);
const SAC_AT = new Vector3(0, 0.17, 0.36);
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  // The trunk: the classic's squat body, cut into planes, the warts in
  // darker steps down the back, a pale belly band.
  set.trunk = bakeParts('toad:trunk', () => {
    const out = [{ geo: fz(new SphereGeometry(0.3, 9, 6), 0.14, 701), m: M(0, 0.24, -0.08, 1.45, 0.66, 1.22) }];
    out.push({ geo: fz(new SphereGeometry(0.26, 8, 3, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), 0.1, 703), m: M(0, 0.22, -0.04, 1.5, 0.5, 1.2), tone: 1.25 });
    const wart = fz(new IcosahedronGeometry(0.05, 0), 0.2, 705);
    const W = [[-0.14, 0.42, -0.08, 1], [0.1, 0.43, -0.16, 0.9], [0.22, 0.38, 0.0, 0.8], [-0.24, 0.37, -0.2, 0.9], [0.02, 0.44, 0.02, 0.7], [-0.04, 0.42, -0.26, 1.1], [0.26, 0.34, -0.24, 0.8], [-0.3, 0.32, 0.0, 0.7]];
    for (const [x, y, z, s] of W) out.push({ geo: wart, m: M(x, y - 0.02, z, s, s * 0.7, s), tone: 0.6 });
    return out;
  });
  // The head (about its neck hinge): the broad flat skull, the eye bulges,
  // a ridge over each eye.
  set.head = bakeParts('toad:head', () => {
    const o = (x, y, z) => [x - HEAD_AT.x, y - HEAD_AT.y, z - HEAD_AT.z];
    const out = [{ geo: fz(new SphereGeometry(0.2, 9, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), 0.12, 711), m: M(...o(0, 0.27, 0.24), 1.6, 0.85, 1.08) }];
    const bulge = fz(new IcosahedronGeometry(0.1, 1), 0.14, 713);
    for (const s of [-1, 1]) {
      out.push({ geo: bulge, m: M(...o(s * 0.19, 0.42, 0.22), 1, 0.9, 1), tone: 0.62 });
      out.push({ geo: fz(new BoxGeometry(0.12, 0.03, 0.05), 0.1, 715), m: M(...o(s * 0.19, 0.49, 0.2), 1, 1, 1, qa(0, 0, 1, s * 0.3)), tone: 0.5 });
    }
    return out;
  });
  // The lower jaw (about its hinge): a flat pale shelf under the skull; the
  // seam between them is the classic's mouth line, and opens dark.
  set.jaw = bakeParts('toad:jaw', () => {
    const o = (x, y, z) => [x - JAW_AT.x, y - JAW_AT.y, z - JAW_AT.z];
    return [
      { geo: fz(new SphereGeometry(0.19, 9, 3, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), 0.1, 721), m: M(...o(0, 0.27, 0.25), 1.62, 0.5, 1.06), tone: 0.92 },
    ];
  });
  // The throat sac: a pale bulb, cut into planes.
  set.sac = fz(new SphereGeometry(0.17, 8, 6), 0.1, 731);
  // The tell: an indigo slit glint on each eye bulge (unlit).
  set.glint = bakeParts('toad:glint', () => {
    const o = (x, y, z) => [x - HEAD_AT.x, y - HEAD_AT.y, z - HEAD_AT.z];
    const bar = fz(new BoxGeometry(0.085, 0.03, 0.02), 0, 1);
    return [-1, 1].map((s) => ({ geo: bar, m: M(...o(s * 0.19, 0.44, 0.31), 1, 1, 1, qa(0, 0, 1, s * 0.4)) }));
  });
  // A leg bone: a faceted tapered unit segment (y 0..1); a webbed foot.
  set.bone = fz(new SphereGeometry(1, 6, 4).translate(0, 1, 0).scale(1, 0.5, 1), 0.1, 741);
  set.foot = bakeParts('toad:foot', () => {
    const out = [{ geo: fz(new SphereGeometry(0.5, 6, 3, 0, Math.PI * 2, 0, Math.PI * 0.5), 0.1, 743), m: M(0, 0, 0.1, 0.9, 0.35, 1) }];
    const toe = fz(new BoxGeometry(0.16, 0.12, 0.7), 0.1, 745);
    for (const a of [-0.55, 0, 0.55]) out.push({ geo: toe, m: M(Math.sin(a) * 0.35, 0.02, 0.1 + Math.cos(a) * 0.35, 1, 1, 1, qa(0, 1, 0, a)), tone: 0.85 });
    return out;
  });
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Legs: 0 hind left (+x), 1 fore left, 2 hind right, 3 fore right. Hips in
// body space, foot homes on the floor (yaw space), the knee's pole: the hind
// knees out and forward (folded), the fore elbows back.
const HIPS = [];
const HOMES = [];
const BEND = [];
const LEN = [];
for (const s of [1, -1]) {
  HIPS.push(new Vector3(s * 0.26, 0.2, -0.22));
  HOMES.push(new Vector3(s * 0.4, 0, -0.14));
  BEND.push(new Vector3(s * 0.8, 0.5, 1).normalize());
  LEN.push([0.17, 0.17]);
  HIPS.push(new Vector3(s * 0.2, 0.18, 0.18));
  HOMES.push(new Vector3(s * 0.27, 0, 0.34));
  BEND.push(new Vector3(s * 0.3, 0.1, -1).normalize());
  LEN.push([0.1, 0.12]);
}
const THICK = [[0.06, 0.04], [0.035, 0.03]];
const PIVOT = new Vector3(0, 0.2, 0);
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildToadFacet() {
  const G = geos();
  const F = createFoeFrame('toad');
  const { body, spawn, track } = F;
  const hideMat = track(foeMaterial(HIDE.toadBody));
  const darkMat = track(foeMaterial(HIDE.toadDark));
  const sacMat = track(foeMaterial(HIDE.toadSac));
  const tellMat = new MeshBasicMaterial({ color: exactColor(TELL_INDIGO), toneMapped: false });
  void TELL_INDIGO_DIM;
  void PALETTE;

  body.add(foePart(G.trunk, hideMat, 'full', 'toad-trunk'));
  const head = foePart(G.head, hideMat, 'full', 'toad-head');
  head.position.copy(HEAD_AT);
  body.add(head);
  head.add(foePart(G.glint, tellMat, false, 'toad-glint'));
  const jaw = foePart(G.jaw, sacMat, 'part', 'toad-jaw');
  jaw.position.copy(JAW_AT).sub(HEAD_AT);
  head.add(jaw);
  const sac = foePart(G.sac, sacMat, 'full', 'toad-sac');
  sac.position.copy(SAC_AT).sub(JAW_AT);
  jaw.add(sac);
  // the legs (8 bones) on one row, the four webbed feet on another
  const bones = instancedPart(G.bone, darkMat, 8, { name: 'toad-bones', moving: true, inkPx: 1.8 });
  const feet = instancedPart(G.foot, darkMat, 4, { name: 'toad-feet', moving: true, inkPx: 1.6 });
  spawn.add(bones);
  spawn.add(feet);
  F.group.add(groundShadow(0.5, 0.86, { forward: 0.26, wide: 1.3, deep: 0.9 }));

  // Named points (B8): the mouth (where the glob leaves), the sac.
  const mouth = namedPoint(jaw, 'toad-mouth', 0, 0.02, 0.44 - JAW_AT.z);
  const sacPt = namedPoint(sac, 'toad-sac-point', 0, 0, 0);

  const gait = createLegs({ homes: HOMES, groups: [[0, 3], [1, 2]], trigger: 0.08, reach: 0.2, lift: 0.07, durMin: 0.1, durMax: 0.18 });
  const clock = createFoeClock();
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
  let lobs = 0;
  let lastThrow = null;
  let leanW = 1;
  let loadK = 0;
  const lifted = [0, 0, 0, 0];
  const gaitOpts = { locked: true };

  const lab = {
    abilities: TOAD_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => gait.feet().map((p, i) => ({ ...p, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur }),
    get hit() {
      return clip.state === 'rest' ? -1 : (lobs - 1) % 3;
    },
    get load() {
      return loadK;
    },
    parts: { body, head, jaw, sac, bones, feet },
  };

  function liveLob(now, tick, e) {
    let fired = false;
    if (e) {
      const th = Number.isFinite(e.throwTick) ? e.throwTick : -1;
      if (lastThrow === null) lastThrow = th;
      else if (th !== lastThrow) {
        fired = th >= 0;
        lastThrow = th;
      }
    }
    const st = clip.update({
      beat: null,
      tel: null,
      now,
      tick,
      fired,
      pick: () => LOBS[lobs++ % 3],
      name: () => `lob:${((lobs - 1) % 3) + 1}`,
      out: cur,
    });
    lab.lastStrike = clip.lastStrike;
    // the gather, read ahead from the cooldown: the next lob's coil over the
    // last LOAD_TICKS before the sim may throw; held loaded until it does
    loadK = 0;
    if (st === 'rest' && e && Number.isFinite(e.nextAttackTick)) {
      const k = (tick + 1 - (e.nextAttackTick - LOAD_TICKS)) / LOAD_TICKS;
      if (k > 0) loadK = ease.inOut(Math.min(1, k));
    }
    if (loadK > 0) lerpFields(cur, REST, LOBS[lobs % 3].coil, loadK, FIELDS);
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
      const ab = TOAD_ABILITIES[lab.override.id] || TOAD_LOB;
      const h = ab.at(lab.override.t);
      toadLobPose(h.v, h.t, cur);
      clip.reset();
    } else liveLob(now, tick, e);

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

    // --- the body: the lob's pose, the step's bob (a squat hop), the lean
    // into the travel, a slow throat breath
    const breath = Math.sin(tt * 2.2);
    leanW += ((clip.state === 'rest' && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 12);
    body.rotation.set(cur.pitch + (0.1 * fwd - 0.03 * bob) * leanW, cur.twist, cur.roll - 0.08 * side * leanW);
    const hop = 0.05 * bob;
    body.scale.set(cur.sx * (1 - 0.3 * hop), cur.sy * (1 + 0.6 * hop + 0.01 * breath), 1 + (cur.sx - 1) * 0.3);
    placeBody(body, PIVOT, cur.push, cur.lift + hop - cur.haunch * 0.4);
    body.updateMatrix();
    head.rotation.set(-cur.head, 0, 0);
    jaw.rotation.set(cur.jaw, 0, 0);
    sac.scale.setScalar(Math.max(0.4, 1 + cur.sac + 0.05 * breath));

    // --- legs: the hips ride the body, the feet stand where the gait put them
    for (let i = 0; i < 4; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      if (i % 2 === 0) hipW.y -= cur.haunch;
      foot.copy(gait.out[i]);
      const [l1, l2] = LEN[i];
      lifted[i] = liftToReach(hipW, foot, l1, l2);
      if (clampReach(hipW, foot, l1, l2) > 1e-4) {
        gait.release(i);
        lifted[i] = Math.max(lifted[i], 1e-3);
      }
      solveKnee(hipW, foot, l1, l2, BEND[i], knee);
      const [r1, r2] = THICK[i % 2];
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, r1, r1, 0.02));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, r2, r2, 0.01));
      // the webbed foot, flat on the floor, its toes splayed out from the body
      const s = i < 2 ? 1 : -1;
      const toe = (i % 2 === 0 ? 0.6 : 0.25) * s;
      Z.set(Math.sin(toe), 0, Math.cos(toe));
      X.crossVectors(Y, Z).normalize();
      const fs = i % 2 === 0 ? 0.17 : 0.12;
      setTRS(m, foot, X, Y, Z, fs, fs, fs);
      feet.setMatrixAt(i, m);
    }
    bones.instanceMatrix.needsUpdate = true;
    feet.instanceMatrix.needsUpdate = true;
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
    points: { mouth, sac: sacPt },
    // §6.1 item 9: a squat soft body squashes along its height; the flinch
    // bulges at the middle of the hide.
    react: { squash: 1.1, flinch: 0.8, knock: 0.8, axis: 'y', midY: 0.26 },
    death: { swell: 1.15, throw: 0.8 },
  };
}
