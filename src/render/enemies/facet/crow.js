// BARROW CROW, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level III foes").
// The classic crow of enemies/archetypes.js (a hunched near-black bird on
// two thin legs, a bone beak, the indigo glint in each eye its one tell;
// it hops, fans its wings through the caw and thrusts its head on the
// volley) with the sample video's technique laid ON TOP of its chibi ink
// look. What it gains:
//
//   * faceted masses with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd): the hunched body with a ruff of feather tufts at the
//     neck and shoulders, a layered tail fan, the skull with its brow and
//     the long bone beak in two halves, charcoal slit eyes under the glints
//     (never round, never warm);
//   * a HEAD on its own neck hinge (it cocks, draws back for the caw and
//     thrusts on the volley) and a LOWER BEAK on its own hinge that gapes
//     through the caw;
//   * the WINGS as solid faceted plates, each a long primary fan with its
//     coverts stepped in darker tones, on their own row: folded along the
//     back at rest, fanned up and out through the caw, snapped forward on
//     the volley;
//   * WORLD-LOCKED FEET (render/facet/foelegs.js): two bird legs (the
//     tibia and the tarsus, the ankle bent back the way a bird's is) laid
//     by two-bone IK onto three-toed feet pinned to the floor while they
//     carry weight; both feet step together, so the crow HOPS along its
//     real travel (a backpedal hops back, a strafe sideways), the body
//     bobbing up on each hop and leaning into the travel (rule 1);
//   * the CAW on the sim's 45-tick cone telegraph (sim/enemies/crow.js):
//     the telegraph is the coil (the wings fan up, the head draws back with
//     the beak opening, the chest swells), the strike takes its last 2.5
//     frames, sampled on the shown sim tick, so the volley leaves on the
//     resolve tick (the sim's `fireTick`): the head thrust forward with the
//     beak wide, the wings snapped forward, the shooter's squash (§6.1 B3)
//     held 3 frames with a recoil shove, then the snap back and the settle
//     with one overshoot (B5). Repeat caws cycle Kesh's 3-hit flow: cocked
//     from its left, from its right, then the finisher, a hop with the
//     wings thrown full out (B6);
//   * the spawn-in grow (B7), named points (B8: the beak's tip, the mouth),
//     and the hit and death tuning.
//
// Faces +Z. Same contract as buildCrow (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing and shots untouched.
import {
  BoxGeometry,
  ConeGeometry,
  IcosahedronGeometry,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { makeGlowSprite } from '../../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry } from '../../facet/kit.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, placeBody, shotSquash, spawnScale } from '../../facet/foe.js';
import { HOLD_SEC, createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';

// The sim's crow (sim/enemies/crow.js S): hops 2.0 u/s; the cone telegraph is
// 45 ticks; the volley marks fireTick.
const TICK_HZ = 60;
const HOP_SPEED = 2.0;
export const CAW_TEL_SEC = 45 / TICK_HZ;

// --- Key poses. push (u, +z), lift (u), pitch (chest down +), roll (+
// toward its right), twist (+ toward its left), sx / sy (squash), head
// (rad, + draws the head back and up), hy (rad, the head cocked, + to its
// left), neck (u, the head thrust forward), beak (rad, the gape), wing (0..1
// the wings fanned up), wfwd (0..1 the wings snapped forward).
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, head: 0, hy: 0, neck: 0, beak: 0.05, wing: 0, wfwd: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Caw 1, COCKED FROM ITS LEFT: the head drawn back and cocked to its left,
// the wings fanning; it thrusts the head forward and to its right as the
// fan looses.
const C1 = K({ push: -0.04, pitch: -0.12, roll: -0.04, twist: 0.2, sx: 0.97, sy: 1.06, head: 0.5, hy: 0.35, neck: -0.04, beak: 0.45, wing: 0.85 });
const S1 = K({ push: 0.06, pitch: 0.16, roll: 0.04, twist: -0.15, sx: 1.2, sy: 0.92, head: -0.25, hy: -0.2, neck: 0.1, beak: 0.9, wing: 0.5, wfwd: 0.8 });
const O1 = K({ push: 0.03, pitch: 0.08, twist: -0.12, sx: 1.04, sy: 0.98, head: -0.1, hy: -0.15, neck: 0.05, beak: 0.4, wing: 0.3, wfwd: 0.4 });
// Caw 2, COCKED FROM ITS RIGHT: the mirror.
const C2 = K({ push: -0.04, pitch: -0.12, roll: 0.04, twist: -0.2, sx: 0.97, sy: 1.06, head: 0.5, hy: -0.35, neck: -0.04, beak: 0.45, wing: 0.85 });
const S2 = K({ push: 0.06, pitch: 0.16, roll: -0.04, twist: 0.15, sx: 1.2, sy: 0.92, head: -0.25, hy: 0.2, neck: 0.1, beak: 0.9, wing: 0.5, wfwd: 0.8 });
const O2 = K({ push: 0.03, pitch: 0.08, twist: 0.12, sx: 1.04, sy: 0.98, head: -0.1, hy: 0.15, neck: 0.05, beak: 0.4, wing: 0.3, wfwd: 0.4 });
// Caw 3, THE FULL FAN (the biggest, §6.1 B6): crouched with the wings
// thrown full out and the head drawn far back; it hops as the fan looses,
// the head thrust straight out.
const C3 = K({ push: -0.06, lift: -0.02, pitch: -0.16, sx: 0.96, sy: 1.08, head: 0.65, neck: -0.06, beak: 0.5, wing: 1 });
const S3 = K({ push: 0.08, lift: 0.07, pitch: 0.2, sx: 1.2, sy: 0.92, head: -0.35, neck: 0.14, beak: 1.0, wing: 0.7, wfwd: 1 });
const O3 = K({ push: 0.04, lift: 0.02, pitch: 0.1, sx: 1.05, sy: 0.98, head: -0.15, neck: 0.06, beak: 0.45, wing: 0.4, wfwd: 0.5 });
const CAWS = [
  { label: 'cocked from its left', coil: C1, strike: S1, over: O1 },
  { label: 'cocked from its right', coil: C2, strike: S2, over: O2 },
  { label: 'the full fan', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));

// The shooter's squash (B3) on top of the held contact, with its shove.
function heldMotion(V, age, out) {
  const s = shotSquash(age + HOLD_SEC * 0, 0.7);
  out.sx *= s.sx;
  out.sy *= s.sy;
  out.push += s.shove;
}
const CAW_TL = strikeTimeline('caw', 'Caw', {
  tel: CAW_TEL_SEC,
  rest: 0.25,
  labels: { coil: 'coil (the cone telegraph): wings fanning, the head drawn back', strike: 'the volley', hold: 'contact: the fan away, the squash held', snap: 'snap back', settle: 'settle' },
});
const CONTACT_AT = CAW_TL.startOf('hold');
export function crowCawPose(v, t, out = { ...REST }) {
  return strikePoseAt(CAW_TL, CAWS[v] || CAWS[0], REST, FIELDS, t, out, heldMotion);
}
const classicCaw = (tt, s) => ({ telegraphK: s.id === 'coil' || s.id === 'strike' ? 1 : 0, lungeK: 0, fireK: 0, e: { mode: 'hop', fireTick: tt >= CONTACT_AT ? 1 : -1 } });
export const CROW_CAW = strikeAbility({ id: 'caw', label: 'Caw', tl: CAW_TL, variants: CAWS, classic: classicCaw });
export const CROW_CAWS_STRING = strikeAbility({ id: 'caws', label: 'Caw string', tl: CAW_TL, variants: CAWS, n: 3, gap: CAW_TL.duration, classic: classicCaw });
export const CROW_ABILITIES = Object.freeze({ caw: CROW_CAW, caws: CROW_CAWS_STRING });

// --- Geometry (built once for the session, shared by every crow) ------------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
// The neck hinge (body space), the beak hinge (head space), the wing roots.
const HEAD_AT = new Vector3(0, 0.56, 0.16);
const BEAK_AT = new Vector3(0, 0.0, 0.1);
const WING_ROOT = new Vector3(0.14, 0.46, 0.04);
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  // The body: the classic's hunched egg pitched up, cut into planes; a ruff
  // of tufts at the neck and shoulders; the tail fan in layered plates.
  set.body = bakeParts('crow:body', () => {
    const out = [{ geo: fz(new IcosahedronGeometry(0.22, 1), 0.14, 1001), m: M(0, 0.36, -0.02, 0.9, 0.95, 1.35, qa(1, 0, 0, -0.35)) }];
    const tuft = wedgeGeometry();
    for (let i = 0; i < 7; i++) {
      const a = -1.2 + (i / 6) * 2.4;
      const dir = new Vector3(Math.sin(a) * 0.9, 0.6, Math.cos(a) * 0.4).normalize();
      out.push({ geo: tuft, m: new Matrix4().compose(new Vector3(Math.sin(a) * 0.15, 0.5 + 0.02 * Math.cos(a), 0.08 + Math.cos(a) * 0.06), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir), new Vector3(0.05, 0.08, 0.04)), tone: 0.78 });
    }
    const plume = fz(new BoxGeometry(0.07, 0.015, 0.22), 0.1, 1003);
    for (let i = 0; i < 5; i++) {
      const a = -0.5 + (i / 4) * 1.0;
      out.push({ geo: plume, m: M(Math.sin(a) * 0.1, 0.26 - Math.abs(a) * 0.02, -0.3 - Math.cos(a) * 0.1, 1, 1, 1, qa(0, 1, 0, a).multiply(qa(1, 0, 0, -0.5))), tone: 0.72 + 0.1 * (i % 2) });
    }
    return out;
  });
  // The head (about the neck): the skull, the brow, the upper beak (bone).
  set.head = bakeParts('crow:head', () => {
    const o = (x, y, z) => [x - HEAD_AT.x, y - HEAD_AT.y, z - HEAD_AT.z];
    return [
      { geo: fz(new IcosahedronGeometry(0.13, 0), 0.12, 1011), m: M(...o(0, 0.6, 0.2), 1, 0.95, 1.1) },
      { geo: fz(new BoxGeometry(0.16, 0.04, 0.08), 0.1, 1013), m: M(...o(0, 0.66, 0.27), 1, 1, 1, qa(1, 0, 0, 0.4)), tone: 0.8 },
    ];
  });
  set.beakUp = bakeParts('crow:beak-up', () => {
    const o = (x, y, z) => [x - HEAD_AT.x, y - HEAD_AT.y, z - HEAD_AT.z];
    return [{ geo: fz(new ConeGeometry(0.05, 0.24, 4).translate(0, 0.12, 0), 0.08, 1015), m: M(...o(0, 0.6, 0.28), 1, 1, 0.75, qa(1, 0, 0, Math.PI / 2 - 0.05)) }];
  });
  // The lower beak (about its hinge at the gape).
  set.beakLow = bakeParts('crow:beak-low', () => [{ geo: fz(new ConeGeometry(0.04, 0.2, 4).translate(0, 0.1, 0), 0.08, 1017), m: M(0, -0.02, 0.0, 1, 1, 0.6, qa(1, 0, 0, Math.PI / 2 + 0.05)) }]);
  // The tell (unlit): the indigo glint in each eye over a charcoal slit.
  set.glints = bakeParts('crow:glints', () => {
    const o = (x, y, z) => [x - HEAD_AT.x, y - HEAD_AT.y, z - HEAD_AT.z];
    const bar = fz(new BoxGeometry(0.05, 0.02, 0.02), 0, 1);
    return [-1, 1].map((s) => ({ geo: bar, m: M(...o(s * 0.08, 0.63, 0.28), 1, 1, 1, qa(0, 0, 1, s * 0.4)) }));
  });
  set.eyes = bakeParts('crow:eyes', () => {
    const o = (x, y, z) => [x - HEAD_AT.x, y - HEAD_AT.y, z - HEAD_AT.z];
    const bar = fz(new BoxGeometry(0.06, 0.028, 0.02), 0, 1);
    return [-1, 1].map((s) => ({ geo: bar, m: M(...o(s * 0.08, 0.63, 0.275), 1, 1, 1, qa(0, 0, 1, s * 0.4)) }));
  });
  // A wing (its root at the origin, spanning +x out to the tip, the
  // primaries trailing -z): a solid plate stepped in coverts.
  set.wing = bakeParts('crow:wing', () => {
    const out = [{ geo: fz(new BoxGeometry(0.5, 0.02, 0.2), 0.1, 1021), m: M(0.25, 0, -0.06, 1, 1, 1, qa(0, 1, 0, 0.15)) }];
    for (let i = 0; i < 4; i++) out.push({ geo: fz(new BoxGeometry(0.1, 0.014, 0.14), 0.1, 1023 + i), m: M(0.12 + i * 0.1, 0.012, -0.03 - i * 0.015, 1, 1, 1, qa(0, 1, 0, 0.2)), tone: 0.8 - 0.05 * i });
    const tip = wedgeGeometry();
    for (let i = 0; i < 3; i++) out.push({ geo: tip, m: new Matrix4().compose(new Vector3(0.5 + i * 0.03, 0, -0.08 - i * 0.05), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(0.9, 0, -0.45).normalize()), new Vector3(0.05, 0.14, 0.02)), tone: 0.75 });
    return out;
  });
  // A leg bone (y 0..1); a three-toed foot.
  set.bone = fz(new ConeGeometry(0.5, 1, 4).translate(0, 0.5, 0).rotateX(Math.PI), 0.1, 1031);
  set.foot = bakeParts('crow:foot', () => {
    const toe = fz(new BoxGeometry(0.018, 0.014, 0.1), 0.1, 1033);
    const out = [];
    for (const a of [-0.5, 0, 0.5]) out.push({ geo: toe, m: M(Math.sin(a) * 0.04, 0.007, Math.cos(a) * 0.045, 1, 1, 1, qa(0, 1, 0, a)) });
    out.push({ geo: toe, m: M(0, 0.007, -0.03, 1, 1, 0.5) });
    return out;
  });
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Legs: 0 left (+x), 1 right. Hips in body space, foot homes on the floor;
// the ankle (the leg's visible joint) bends back the way a bird's does.
const HIPS = [new Vector3(0.08, 0.32, 0.02), new Vector3(-0.08, 0.32, 0.02)];
const HOMES = [new Vector3(0.09, 0, 0.04), new Vector3(-0.09, 0, 0.04)];
const BEND = [new Vector3(0.1, 0.1, -1).normalize(), new Vector3(-0.1, 0.1, -1).normalize()];
const L1 = 0.17;
const L2 = 0.17;
const PIVOT = new Vector3(0, 0.34, 0);
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildCrowFacet() {
  const G = geos();
  const F = createFoeFrame('crow');
  const { body, spawn, track } = F;
  const bodyMat = track(foeMaterial(HIDE.crowBody));
  const wingMat = track(foeMaterial(HIDE.crowWing));
  const boneMat = track(foeMaterial(HIDE.bone));
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const tellMat = new MeshBasicMaterial({ color: exactColor(TELL_INDIGO), toneMapped: false });

  body.add(foePart(G.body, bodyMat, 'full', 'crow-body'));
  const head = foePart(G.head, bodyMat, 'full', 'crow-head');
  head.position.copy(HEAD_AT);
  body.add(head);
  head.add(foePart(G.beakUp, boneMat, 'part', 'crow-beak'));
  head.add(foePart(G.eyes, eyeMat, false, 'crow-eyes'));
  head.add(foePart(G.glints, tellMat, false, 'crow-glints'));
  const beak = foePart(G.beakLow, boneMat, 'part', 'crow-beak-low');
  beak.position.copy(BEAK_AT);
  head.add(beak);
  const glows = [];
  for (const s of [-1, 1]) {
    const g = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.22, opacity: 0.3 });
    g.material.toneMapped = false;
    g.material.color.copy(TELL_INDIGO_GLOW);
    g.name = 'crow-eye-glow';
    g.position.set(s * 0.08, 0.63 - HEAD_AT.y, 0.3 - HEAD_AT.z);
    head.add(g);
    glows.push(g);
  }
  // the wings, the legs (4 bones) and the feet on rows
  const wings = instancedPart(G.wing, wingMat, 2, { name: 'crow-wings', moving: true, inkPx: 1.8 });
  const bones = instancedPart(G.bone, eyeMat, 4, { name: 'crow-bones', moving: true, ink: false });
  const feet = instancedPart(G.foot, eyeMat, 2, { name: 'crow-feet', moving: true, ink: false });
  spawn.add(wings);
  spawn.add(bones);
  spawn.add(feet);
  F.group.add(groundShadow(0.32, 0.8));

  // Named points (B8): the beak's tip (where the fan leaves), the mouth.
  const tip = namedPoint(head, 'crow-tip', 0, 0.6 - HEAD_AT.y, 0.52 - HEAD_AT.z);
  const mouth = namedPoint(head, 'crow-mouth', 0, 0.6 - HEAD_AT.y, 0.36 - HEAD_AT.z);

  // both feet step together: a hop
  const gait = createLegs({ homes: HOMES, groups: [[0, 1]], trigger: 0.12, reach: 0.3, lift: 0.09, durMin: 0.13, durMax: 0.22, lead: 0.6 });
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
  const Y = new Vector3();
  const Z = new Vector3();
  const UP = new Vector3(0, 1, 0);
  const q = new Quaternion();
  const q2 = new Quaternion();
  const pos = new Vector3();
  const scl = new Vector3(1, 1, 1);
  let age = -1;
  let yawNow = 0;
  let caws = 0;
  let lastFire = null;
  let leanW = 1;
  const lifted = [0, 0];
  const gaitOpts = { locked: true };

  const lab = {
    abilities: CROW_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => gait.feet().map((p, i) => ({ ...p, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur }),
    get hit() {
      return clip.state === 'rest' ? -1 : (caws - 1) % 3;
    },
    parts: { body, head, beak, wings, bones, feet },
  };

  function liveCaw(P, now, tick, e) {
    let fired = false;
    if (e) {
      const ft = Number.isFinite(e.fireTick) ? e.fireTick : -1;
      if (lastFire === null) lastFire = ft;
      else if (ft !== lastFire) {
        fired = ft >= 0;
        lastFire = ft;
      }
    }
    const beat = watch.update(P);
    clip.update({
      beat,
      tel: watch.telegraph,
      now,
      tick,
      fired,
      pick: () => CAWS[caws++ % 3],
      name: () => `caw:${((caws - 1) % 3) + 1}`,
      out: cur,
    });
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

    if (lab.override) {
      const ab = CROW_ABILITIES[lab.override.id] || CROW_CAW;
      const h = ab.at(lab.override.t);
      crowCawPose(h.v, h.t, cur);
      watch.reset();
      clip.reset();
    } else liveCaw(P, now, tick, e);

    // --- feet: both step together, a hop along the travel
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    gaitOpts.locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override);
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = clamp1(lv.z / HOP_SPEED);
    const side = clamp1(lv.x / HOP_SPEED);

    // --- the body: the caw's pose, the hop's bob (the body rides up with
    // the feet), the lean into the travel, a small breath and a head bob
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const breath = Math.sin(tt * 2.4 + id);
    leanW += ((clip.state === 'rest' && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 12);
    body.rotation.set(cur.pitch + 0.12 * fwd * leanW, cur.twist, cur.roll - 0.1 * side * leanW);
    body.scale.set(cur.sx, cur.sy * (1 + 0.01 * breath), 1 + (cur.sx - 1) * 0.3);
    placeBody(body, PIVOT, cur.push, cur.lift + 0.08 * bob);
    body.updateMatrix();
    head.rotation.set(-cur.head + (0.05 * Math.sin(tt * 1.7 + id) - 0.1 * bob) * leanW, cur.hy, 0);
    head.position.set(HEAD_AT.x, HEAD_AT.y, HEAD_AT.z + cur.neck);
    beak.rotation.set(cur.beak, 0, 0);
    const glint = 0.25 + 0.4 * Math.max(cur.wing, cur.beak * 0.5) + 0.06 * Math.sin(tt * 3 + id);
    for (const g of glows) g.material.opacity = glint;

    // --- the wings: folded along the back at rest, fanned up and out by
    // `wing`, snapped forward by `wfwd`
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? 1 : -1;
      // folded: the plate lies back along the body, tip to the tail
      const fold = 1 - cur.wing;
      const sweep = -1.25 * fold + 0.5 * cur.wfwd; // about y: back when folded, forward on the snap
      const raise = 0.1 + 0.62 * cur.wing - 0.25 * cur.wfwd; // about z: up through the fan (under the elite crown)
      q.setFromAxisAngle(UP, s * sweep);
      q2.setFromAxisAngle(new Vector3(0, 0, 1), s > 0 ? raise : Math.PI - raise);
      q.multiply(q2);
      pos.set(s * WING_ROOT.x, WING_ROOT.y, WING_ROOT.z).applyMatrix4(body.matrix);
      // the plate's own frame rides the body's turn
      q2.setFromRotationMatrix(body.matrix);
      q2.multiply(q);
      m.compose(pos, q2, scl);
      wings.setMatrixAt(i, m);
    }
    wings.instanceMatrix.needsUpdate = true;

    // --- legs: the hips ride the body, the feet stand where the gait put them
    for (let i = 0; i < 2; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      foot.y += 0.01;
      lifted[i] = liftToReach(hipW, foot, L1, L2);
      if (clampReach(hipW, foot, L1, L2) > 1e-4) {
        gait.release(i);
        lifted[i] = Math.max(lifted[i], 1e-3);
      }
      solveKnee(hipW, foot, L1, L2, BEND[i], knee);
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, 0.024, 0.024, 0.01));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, 0.018, 0.018, 0.01));
      foot.y -= 0.01;
      Z.set(0, 0, 1);
      X.set(1, 0, 0);
      Y.copy(UP);
      setTRS(m, foot, X, Y, Z, 1, 1, 1);
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
    points: { tip, hand: tip, mouth },
    // §6.1 item 9: a light bird: a soft squash, a full flinch and a big
    // knock; the flinch bulges at the chest.
    react: { squash: 0.9, flinch: 1, knock: 1.2, axis: 'y', midY: 0.38 },
    death: { swell: 0.9, throw: 1.2 },
  };
}
