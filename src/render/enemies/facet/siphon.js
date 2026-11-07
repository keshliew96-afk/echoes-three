// VEIN SIPHON, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level IV foes").
// The classic siphon of enemies/barrowheart.js (a floating sac of bruised
// flesh netted in glowing veins, a toothed mouth beneath, four vein tendrils
// hanging from it; it draws the tendrils up to cast, whips them out on the
// lash, and gulps while it drinks; the tether is the enemy layer's) with the
// sample video's technique laid ON TOP of its chibi ink look. What it gains:
//
//   * faceted masses with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd, every tone in one white material's vertex colours): the
//     sac cut into planes with warts and a puckered crown where the veins
//     meet, the mouth's lip and its ring of bone teeth on their own hinge
//     (it gapes on the gulp), the vein net unlit and driven;
//   * the TENDRILS as four chains of four segments laid every frame (one
//     unlit instanced row): a lazy sway, drawn up and back to cast, whipped
//     out on the lash, reaching forward taut while it drinks;
//   * a FLYER'S LEAN from the real travel (rule 1, a legless form, as the
//     moth's): pitched into an advance, nosed up on a backpedal, rolled
//     toward a strafe (its circling), banked into a turn;
//   * the LASH on the sim's 54-tick lane telegraph (sim/enemies/siphon.js,
//     mode 'cast'; render/facet/foestrike.js). The lane is the coil: the
//     tendrils drawn up and back, the sac contracted and tilted back, the
//     net brightening. The strike takes the last 2.5 frames, sampled on the
//     shown sim tick, so the whip lands on the resolve tick (confirmed by
//     `castTick`): the tendrils flung out down the lane, the sac thrown
//     forward and stretched, held 3 frames, then the snap back and the
//     settle (B5). Kesh's 3-hit flow (§6.1 B6): lash 1 swung in from its
//     left, lash 2 from its right, lash 3 the plunge: all four straight down
//     the lane, the sac thrown furthest;
//   * DRINKING (mode 'drink'): the tendrils reach for the prey and the sac
//     gulps on every drain (the sim's `nextDrainTick` moving on), the mouth
//     gaping with it;
//   * the spawn-in grow (B7), named points (B8: the tendril tips, the mouth,
//     the sac), and the hit and death tuning.
//
// Faces +Z. Same contract as buildSiphon (group, mats, setYaw, pose) plus
// lab, react, death, points. Render only: the sim, its timing and damage
// untouched.
import { ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Mesh, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { facetize } from '../../facet/material.js';
import { instancedPart } from '../../facet/kit.js';
import { createTimeline } from '../../facet/timeline.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, placeBody, spawnScale } from '../../facet/foe.js';
import { createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';
import { segmentMatrix } from '../../facet/foelegs.js';
import { HEART } from '../style.js';
import { M, TINT, clamp1, heartGlow, qa, rodM, veinColor, veinMat } from './heartfoe.js';

// The sim's siphon (sim/enemies/siphon.js S): 1.9 u/s, a flier; a 54-tick
// lane telegraph (mode 'cast'), the lash on its resolve (castTick); drinks
// every 30 ticks for up to 3 s.
const TICK_HZ = 60;
const DRIFT_SPEED = 1.9;
export const LASH_TEL_SEC = 54 / TICK_HZ;
const SNAP = 3 / 30;
const SETTLE = 9 / 30;
export const SAC_Y = 1.15;
const TENDRILS = 4;
const SEGS = 4;
const SEG = 0.2;

// --- Key poses. lift (u, off the hover), push (u, +z), pitch (nose down
// +), roll (+ toward its right), twist (+ toward its left), sx / sy / sz (the
// sac's squash), draw: the tendrils drawn up and back (0..1), whip: flung
// out forward (0..1), swing: swung to a side (+ its left), mouth: gaping
// (0..1), tell: the net's light (0..1).
const REST = Object.freeze({ lift: 0, push: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, sz: 1, draw: 0, whip: 0, swing: 0, mouth: 0, tell: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Lash 1, FROM ITS LEFT: the tendrils drawn up and swung to its left, the
// sac contracted, tilted back and rolled; whipped across and out.
const C1 = K({ lift: 0.08, push: -0.05, pitch: -0.2, roll: -0.15, twist: 0.2, sx: 0.9, sy: 1.1, sz: 0.92, draw: 1, swing: 0.5, mouth: 0.1, tell: 1 });
const S1 = K({ lift: -0.06, push: 0.12, pitch: 0.35, roll: 0.1, twist: -0.12, sx: 1.12, sy: 0.9, sz: 1.12, whip: 1, swing: -0.3, mouth: 0.4, tell: 0.7 });
const O1 = K({ lift: 0.0, push: 0.08, pitch: 0.2, roll: 0.05, twist: -0.08, sx: 1.02, sy: 0.98, sz: 1.02, whip: 0.5, swing: -0.15, mouth: 0.2, tell: 0.3 });
// Lash 2, FROM ITS RIGHT: the mirror.
const C2 = K({ lift: 0.08, push: -0.05, pitch: -0.2, roll: 0.15, twist: -0.2, sx: 0.9, sy: 1.1, sz: 0.92, draw: 1, swing: -0.5, mouth: 0.1, tell: 1 });
const S2 = K({ lift: -0.06, push: 0.12, pitch: 0.35, roll: -0.1, twist: 0.12, sx: 1.12, sy: 0.9, sz: 1.12, whip: 1, swing: 0.3, mouth: 0.4, tell: 0.7 });
const O2 = K({ lift: 0.0, push: 0.08, pitch: 0.2, roll: -0.05, twist: 0.08, sx: 1.02, sy: 0.98, sz: 1.02, whip: 0.5, swing: 0.15, mouth: 0.2, tell: 0.3 });
// Lash 3, THE PLUNGE (the biggest, §6.1 B6): drawn highest and furthest
// back; all four flung straight down the lane, the sac thrown forward and
// stretched.
const C3 = K({ lift: 0.12, push: -0.08, pitch: -0.32, sx: 0.86, sy: 1.16, sz: 0.9, draw: 1.2, mouth: 0.15, tell: 1 });
const S3 = K({ lift: -0.12, push: 0.18, pitch: 0.5, sx: 1.16, sy: 0.86, sz: 1.2, whip: 1.2, mouth: 0.6, tell: 1 });
const O3 = K({ lift: 0.02, push: 0.1, pitch: 0.25, sx: 1.03, sy: 0.98, sz: 1.03, whip: 0.55, mouth: 0.25, tell: 0.35 });
const LASHES = [
  { label: 'from its left', coil: C1, strike: S1, over: O1 },
  { label: 'from its right', coil: C2, strike: S2, over: O2 },
  { label: 'the plunge', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));
export const SIPHON_REST = REST;
export const SIPHON_LASHES = Object.freeze(LASHES);

const LASH_TL = strikeTimeline('lash', 'Tendril lash', {
  tel: LASH_TEL_SEC,
  snap: SNAP,
  settle: SETTLE,
  rest: 0.3,
  labels: { coil: 'coil (the lane telegraph): the tendrils drawn up', strike: 'the whip', hold: 'contact: the tendrils down the lane', snap: 'snap back', settle: 'settle into the hover' },
});
const LASH_CONTACT = LASH_TL.startOf('hold');
export function siphonLashPose(v, t, out = { ...REST }) {
  return strikePoseAt(LASH_TL, LASHES[v] || LASHES[0], REST, FIELDS, t, out);
}
const classicLash = (tt, s) => ({ telegraphK: s.id === 'coil' || s.id === 'strike' ? Math.min(1, tt / LASH_TEL_SEC) : 0, lungeK: 0, fireK: 0, e: { mode: s.id === 'coil' || s.id === 'strike' ? 'cast' : 'drift', castTick: tt >= LASH_CONTACT ? 1 : -1 } });
export const SIPHON_LASH = strikeAbility({ id: 'lash', label: 'Tendril lash', tl: LASH_TL, variants: LASHES, classic: classicLash });
export const SIPHON_LASHES_STRING = strikeAbility({ id: 'lashes', label: 'Lash string', tl: LASH_TL, variants: LASHES, n: 3, gap: LASH_TL.duration, classic: classicLash });
// Drinking: latched, the tendrils reaching, a gulp every half second (the
// sim's 30-tick drain), pure in t.
const GULPS = 4;
const GULP_EVERY = 0.5;
const DRINK_TL = createTimeline('drink', 'Drinking', [
  { id: 'latch', label: 'latched: the tendrils reach', dur: 0.3 },
  { id: 'drink', label: 'drinking: a gulp on every drain', dur: GULPS * GULP_EVERY },
  { id: 'let-go', label: 'lets go', dur: 0.4 },
], { cues: Array.from({ length: GULPS }, (_, i) => ({ at: 0.3 + i * GULP_EVERY, id: 'drink' })) });
// Pure: the drink's reach (0..1) and gulp (0..1) at t into it.
export function siphonDrinkAt(t) {
  const s = DRINK_TL.sample(t);
  if (s.id === 'latch') return { reach: s.k * s.k * (3 - 2 * s.k), gulp: 0 };
  if (s.id === 'drink') {
    const a = (s.t - DRINK_TL.startOf('drink')) % GULP_EVERY;
    return { reach: 1, gulp: a < 0.3 ? Math.sin((a / 0.3) * Math.PI) : 0 };
  }
  return { reach: 1 - s.k * s.k * (3 - 2 * s.k), gulp: 0 };
}
export const SIPHON_DRINK = Object.freeze({
  id: 'drink',
  label: 'Drinking',
  duration: DRINK_TL.duration,
  sample: (t) => DRINK_TL.sample(t),
  readout: (t) => DRINK_TL.readout(t),
  cues: DRINK_TL.cues,
  classicAt: (t) => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { mode: DRINK_TL.sample(t).id === 'let-go' ? 'drift' : 'drink', castTick: -1 } }),
});
export const SIPHON_ABILITIES = Object.freeze({ lash: SIPHON_LASH, lashes: SIPHON_LASHES_STRING, drink: SIPHON_DRINK });

// --- Geometry (built once for the session, shared by every siphon) ---------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const TWO_PI = Math.PI * 2;
const MOUTH_Y = -0.3;
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  const rod = fz(new CylinderGeometry(1, 1, 1, 4).translate(0, 0.5, 0), 0, 1);
  // The sac: the mass, warts, the puckered crown.
  set.sac = bakeParts('siphon:sac', () => {
    const out = [
      { geo: fz(new IcosahedronGeometry(0.28, 1), 0.14, 1901), m: M(0, 0, 0, 1, 1.12, 0.95), tint: TINT.flesh },
      { geo: fz(new ConeGeometry(0.07, 0.08, 6), 0.1, 1903), m: M(0, 0.31, 0, 1, 1, 1), tint: TINT.fleshDark },
    ];
    const W = [[0.5, 0.3, 0.9], [-0.7, -0.1, 0.7], [0.2, -0.5, -0.8], [-0.3, 0.6, -0.5], [0.8, 0.5, -0.2]];
    for (let i = 0; i < W.length; i++) {
      const d = new Vector3(...W[i]).normalize();
      const r = 0.28 * (i % 2 ? 0.95 : 1);
      out.push({ geo: fz(new SphereGeometry(0.035 + 0.01 * (i % 3), 5, 4), 0.1, 1905 + i), m: M(d.x * r, d.y * r * 1.12, d.z * r * 0.95, 1, 0.8, 1, qa(0, 0, 1, 0).setFromUnitVectors(new Vector3(0, 1, 0), d)), tint: TINT.fleshDark, tone: 1.05 });
    }
    return out;
  });
  // The vein net over the sac (unlit, driven).
  set.net = bakeParts('siphon:net', () => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TWO_PI;
      const pts = [0.95, 0.6, 0.0, -0.6].map((y) => {
        const r = Math.sqrt(Math.max(0, 1 - y * y * 0.8)) * 0.29;
        const w = a + y * 0.5;
        return [Math.sin(w) * r, y * 0.31, Math.cos(w) * r];
      });
      for (let j = 0; j < pts.length - 1; j++) out.push({ geo: rod, m: rodM(pts[j], pts[j + 1], 0.013) });
    }
    return out;
  });
  // The mouth (about its hinge): the dark lip, the bone teeth.
  set.mouth = bakeParts('siphon:mouth', () => {
    const out = [{ geo: fz(new TorusGeometry(0.11, 0.035, 5, 12), 0.08, 1921), m: M(0, 0, 0, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tint: TINT.fleshDark }];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TWO_PI;
      out.push({ geo: fz(new ConeGeometry(0.018, 0.07, 3), 0.1, 1923), m: M(Math.sin(a) * 0.09, -0.03, Math.cos(a) * 0.09, 1, 1, 1, qa(1, 0, 0, Math.PI)), tint: TINT.bone });
    }
    return out;
  });
  // A tendril segment (y 0..1, tapering; unlit).
  set.seg = fz(new CylinderGeometry(0.7, 1, 1, 4).translate(0, 0.5, 0), 0, 1);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

const PIVOT = new Vector3(0, 0, 0);
const ROOTS = Array.from({ length: TENDRILS }, (_, i) => {
  const a = (i / TENDRILS) * TWO_PI + Math.PI / 4;
  return { a, x: Math.sin(a) * 0.12, z: Math.cos(a) * 0.12, front: Math.cos(a) };
});

export function buildSiphonFacet() {
  const G = geos();
  const F = createFoeFrame('siphon');
  const { body, spawn, track } = F;
  const mat = track(foeMaterial('#FFFFFF'));
  const veins = veinMat();
  const tendrilMat = veinMat(HEART.vein);
  body.add(foePart(G.sac, mat, 'full', 'siphon-sac'));
  const net = new Mesh(G.net, veins);
  net.name = 'siphon-net';
  body.add(net);
  const glow = heartGlow(0.95, 0.3);
  glow.name = 'siphon-inner-glow';
  body.add(glow);
  const mouth = foePart(G.mouth, mat, 'part', 'siphon-mouth');
  mouth.position.y = MOUTH_Y;
  body.add(mouth);
  const tendrils = instancedPart(G.seg, tendrilMat, TENDRILS * SEGS, { name: 'siphon-tendrils', moving: true, ink: false });
  body.add(tendrils);
  const shadow = groundShadow(0.26, 0.45);
  F.group.add(shadow);

  // Named points (B8): the tendril tips, the mouth, the sac.
  const tips = ROOTS.map((r, i) => namedPoint(body, `siphon-tip-${i}`, r.x, -0.9, r.z));
  const mouthPt = namedPoint(body, 'siphon-mouth-point', 0, MOUTH_Y - 0.05, 0);
  const sacPt = namedPoint(body, 'siphon-sac-point', 0, 0, 0);

  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, snapSec: SNAP, settleSec: SETTLE });
  const cur = { ...REST };
  const m = new Matrix4();
  const q = new Quaternion();
  const qs = new Quaternion();
  const P0 = new Vector3();
  const P1 = new Vector3();
  const D = new Vector3();
  const AX = new Vector3();
  let age = -1;
  let yawNow = 0;
  let lashes = 0;
  let lastCast = null;
  let lastDrain = null;
  let gulpAge = 9;
  let drinkK = 0;
  let lastX = null;
  let lastZ = 0;
  let lastYaw = 0;
  let vx = 0;
  let vz = 0;
  let yawRate = 0;
  let leanW = 1;
  let gulp = 0;

  const lab = {
    abilities: SIPHON_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => [],
    pose: () => ({ ...cur, drink: drinkK, gulp }),
    get gulp() {
      return gulp;
    },
    get hit() {
      return clip.state === 'rest' ? -1 : (lashes - 1) % 3;
    },
    parts: { body, mouth, tendrils, glow, net },
  };

  function liveLash(P, now, tick, e) {
    const beat = watch.update(P);
    let fired = false;
    if (e) {
      const ct = Number.isFinite(e.castTick) ? e.castTick : -1;
      if (lastCast === null) lastCast = ct;
      else if (ct !== lastCast) {
        fired = ct >= 0;
        lastCast = ct;
      }
    }
    clip.update({ beat, tel: watch.telegraph, now, tick, fired, pick: () => LASHES[lashes++ % 3], name: () => `lash:${((lashes - 1) % 3) + 1}`, out: cur });
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

    // --- the lash and the drink: the lab's pure override, or the sim's
    let reach;
    if (lab.override) {
      if (lab.override.id === 'drink') {
        Object.assign(cur, REST);
        const d = siphonDrinkAt(lab.override.t);
        reach = d.reach;
        gulp = d.gulp;
        drinkK = reach;
      } else {
        const ab = SIPHON_ABILITIES[lab.override.id] || SIPHON_LASH;
        const h = ab.at(lab.override.t);
        siphonLashPose(h.v, h.t, cur);
        reach = 0;
        gulp = 0;
        drinkK = 0;
      }
      watch.reset();
      clip.reset();
    } else {
      liveLash(P, now, tick, e);
      const drinking = !!(e && e.mode === 'drink');
      drinkK += ((drinking ? 1 : 0) - drinkK) * Math.min(1, dt * 8);
      reach = drinkK;
      if (e && drinking) {
        const nd = Number.isFinite(e.nextDrainTick) ? e.nextDrainTick : -1;
        if (lastDrain === null) lastDrain = nd;
        else if (nd !== lastDrain) {
          gulpAge = 0;
          lastDrain = nd;
        }
      } else lastDrain = null;
      gulpAge += dt;
      gulp = gulpAge < 0.3 ? Math.sin((gulpAge / 0.3) * Math.PI) : 0;
    }

    // --- the travel, measured off the layer's own position (rule 1, a
    // flier): pitch into it, roll toward a strafe, bank into a turn
    const gx = F.group.position.x;
    const gz = F.group.position.z;
    if (lastX === null) {
      lastX = gx;
      lastZ = gz;
      lastYaw = yawNow;
    }
    if (dt > 0) {
      let ix = (gx - lastX) / dt;
      let iz = (gz - lastZ) / dt;
      if (ix * ix + iz * iz > 400) ix = iz = 0;
      let dy = yawNow - lastYaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      const a = 1 - Math.exp(-12 * dt);
      vx += (ix - vx) * a;
      vz += (iz - vz) * a;
      yawRate += (dy / dt - yawRate) * a;
    }
    lastX = gx;
    lastZ = gz;
    lastYaw = yawNow;
    leanW += ((clip.state === 'rest' && !lab.override && drinkK < 0.5 ? 1 : 0) - leanW) * Math.min(1, dt * 10);
    let leanP = 0;
    let leanR = 0;
    if (!lab.override && !turntable) {
      const sy = Math.sin(yawNow);
      const cy = Math.cos(yawNow);
      const lz = vx * sy + vz * cy;
      const lx = vx * cy - vz * sy;
      leanP = 0.14 * clamp1(lz / DRIFT_SPEED) * leanW;
      leanR = (-0.18 * clamp1(lx / DRIFT_SPEED) - 0.2 * clamp1((Math.max(0, lz) * yawRate) / 6)) * leanW;
    }

    // --- the sac: the lash's pose, the hover and its slow breath, the
    // drink's tilt and gulp (pure in t), the lean
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const bob = 0.07 * Math.sin(tt * 1.9 + id * 1.7) + 0.08 * cur.draw;
    const breath = 0.05 * Math.sin(tt * 2.4 + id * 1.7);
    const sq = 1 + breath + 0.18 * gulp;
    body.rotation.set(cur.pitch + leanP + 0.25 * drinkK, cur.twist, cur.roll + leanR);
    body.scale.set(cur.sx * sq, cur.sy * (2 - sq), cur.sz * sq);
    spawn.position.y = SAC_Y;
    placeBody(body, PIVOT, cur.push, cur.lift + bob);
    const h = SAC_Y + cur.lift + bob;
    const ss = 0.8 + 0.4 * (1 - (h - 0.6) / 0.7);
    shadow.scale.set(ss, 1, ss);
    mouth.scale.setScalar(1 + 0.3 * Math.max(cur.mouth, gulp));
    mouth.position.y = MOUTH_Y - 0.03 * Math.max(cur.mouth, gulp);

    // --- the tendrils: a lazy sway; drawn up and back to cast; whipped
    // forward on the lash; reaching forward, taut, while it drinks
    let n = 0;
    for (let i = 0; i < TENDRILS; i++) {
      const R = ROOTS[i];
      P0.set(R.x, -0.26, R.z);
      q.identity();
      for (let j = 0; j < SEGS; j++) {
        const first = j === 0 ? 1 : j === 1 ? 0.55 : 0.35;
        const sway = 0.22 * Math.sin(tt * 2.2 + id + R.a * 2 + j * 0.9) * (1 - reach);
        // (a positive pitch about +x swings a hanging segment back, -z)
        const pitch = -sway + 0.95 * cur.draw * first - 1.1 * cur.whip * first - 0.8 * reach * first * (0.6 + 0.4 * R.front);
        const roll = 0.18 * Math.sin(tt * 1.7 + id + R.a + j) * (1 - reach) + Math.sin(R.a) * 0.2 * cur.draw + 0.5 * cur.swing * first;
        qs.setFromAxisAngle(AX.set(1, 0, 0), pitch);
        q.multiply(qs);
        qs.setFromAxisAngle(AX.set(0, 0, 1), roll);
        q.multiply(qs);
        D.set(0, -1, 0).applyQuaternion(q);
        P1.copy(P0).addScaledVector(D, SEG * (1 - 0.08 * j));
        tendrils.setMatrixAt(n++, segmentMatrix(m, P0, P1, 0.022 - 0.003 * j, 0.022 - 0.003 * j, 0.004));
        P0.copy(P1);
      }
      tips[i].position.copy(P0);
    }
    tendrils.instanceMatrix.needsUpdate = true;

    // --- the tell: the net and the tendrils brighten to cast, flare on the
    // whip, glow while it drinks
    const k = Math.min(1, 0.35 + 0.1 * Math.sin(tt * 3 + id) + 0.55 * cur.tell + 0.4 * reach + 0.3 * gulp);
    veinColor(veins.color, k);
    veinColor(tendrilMat.color, Math.min(1, k + 0.15));
    glow.material.opacity = 0.25 + 0.35 * cur.tell + 0.3 * reach + 0.3 * gulp;
    glow.scale.setScalar(0.95 * (1 + 0.4 * gulp + 0.3 * cur.whip));
    shadow.material.opacity = 0.4 + 0.05 * Math.sin(tt * 1.9 + id);
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
    points: { tip: tips[0], tip2: tips[1], tip3: tips[2], tip4: tips[3], mouth: mouthPt, sac: sacPt },
    // §6.1 item 9: a floating sac: a big soft squash, a slow flinch, a long
    // knock; the flinch bulges at the sac.
    react: { squash: 1.2, flinch: 0.9, knock: 1.3, axis: 'y', midY: SAC_Y },
    death: { swell: 1.3, throw: 1.1 },
  };
}
