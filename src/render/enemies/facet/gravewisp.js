// GRAVE WISP, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level III foes").
// The classic wisp of enemies/slice2.js (a hooded flame-shape hovering a
// unit up on a trailing translucent tail, no body, an indigo core that
// swells while it wards) with the sample video's technique laid ON TOP of
// its chibi ink look. What it gains:
//
//   * a faceted hood with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd): the cone cut into planes with a cowl ridge over the
//     brow, a ragged hem of tatters round its rim and two hanging sleeves
//     that spread when it casts; the slit eyes charcoal bars in the hood's
//     shadow; the core an unlit indigo knot on its own row with its glow;
//   * a TRAIL that reads the travel: the tail streams back along the real
//     velocity and two hem ribbons sway behind it (rule 1: the body pitches
//     into the travel, rolls toward a strafe, banks into a turn, measured
//     off the layer's own position); a flier, so no feet (rule 2 does not
//     apply) and the hover rides the spawn node like the moth's;
//   * the WARD as a beat (sim/enemies/gravewisp.js: no attack of its own;
//     it tethers a nearby foe on the tick the sim picks one, wisp_tether,
//     and holds the ward 240 ticks): the cast is unwarned, so it strikes
//     quick (§6.1 B1): the hood draws in and the core gathers over a frame,
//     then the hood flares, the sleeves fling wide and the body lurches at
//     its ward with the core burst to full; while the ward holds the core
//     stays swollen and the hood stays open; when the tether ends
//     (wisp_tether_end) the hood snaps shut and the wisp recoils;
//   * the spawn-in grow (B7), named points (B8: the core, the brow), and
//     the hit and death tuning.
//
// Faces +Z (toward its ward). Same contract as buildGravewisp (group, mats,
// setYaw, pose) plus lab, react, death, points. Render only: the sim, the
// tether beam (enemies/extras.js) and its timing untouched.
import { Color, ConeGeometry, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { exactColor, groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { makeGlowSprite } from '../../glow.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, wedgeGeometry } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, SPAWN_SEC, bakeParts, createFoeClock, createFoeFrame, foeMaterial, foePart, lerpFields, namedPoint, placeBody, spawnScale } from '../../facet/foe.js';

const TICK_HZ = 60;
const SPEED = 2.3;
const HOVER_Y = 1.0;
// the classic's slate (enemies/slice2.js C.wisp) and a darker fold of it
const WISP = new Color().setHSL(0.6, 0.25, 0.7).multiplyScalar(0.82); // toned a step: it blew out white in the lab's light
const WISP_DARK = new Color().setHSL(0.6, 0.2, 0.3);

// --- Key poses. push (u, +z), lift (u), pitch (brow down +), roll, twist,
// sx / sy (squash), core (0..1 the knot's swell), hood (0..1 the cowl
// flared open, -1 drawn in), arms (0..1 the sleeves flung wide), tail (the
// tail's flick, rad).
const FIELDS = ['push', 'lift', 'pitch', 'roll', 'twist', 'sx', 'sy', 'core', 'hood', 'arms', 'tail'];
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, core: 0, hood: 0, arms: 0, tail: 0 });
const K = (o) => Object.freeze({ ...REST, ...o });
const GATHER = K({ push: -0.05, lift: 0.03, pitch: -0.12, sx: 0.9, sy: 1.1, core: 0.5, hood: -1, arms: -0.2, tail: 0.3 });
const CAST = K({ push: 0.16, lift: -0.04, pitch: 0.22, sx: 1.16, sy: 0.9, core: 1.3, hood: 1, arms: 1, tail: -0.5 });
const WARD = K({ push: 0.05, lift: 0.01, pitch: 0.06, sx: 1.04, sy: 1, core: 1, hood: 0.6, arms: 0.5 });
const SNAP = K({ push: -0.1, lift: 0.05, pitch: -0.2, sx: 0.92, sy: 1.08, core: 0, hood: -0.6, arms: -0.3, tail: 0.6 });
// The cast: an unwarned beat, so its wind-up is one frame (B1).
const WARD_TL = createTimeline('ward', 'Ward', [
  { id: 'gather', label: 'gathers', dur: FRAME },
  { id: 'cast', label: 'casts', dur: 2.5 * FRAME },
  { id: 'held', label: 'warding', dur: 0.8 },
  { id: 'fade', label: 'the ward fades', dur: 0.3 },
  { id: 'rest', label: 'drifts', dur: 0.2 },
]);
const SNAP_TL = createTimeline('snap', 'Tether snaps', [
  { id: 'snap', label: 'snaps shut', dur: 3 * FRAME },
  { id: 'recoil', label: 'recoils', dur: 0.25 },
  { id: 'rest', label: 'drifts', dur: 0.3 },
]);
export function wispWardPose(t, out = { ...REST }) {
  const s = WARD_TL.sample(t);
  if (s.id === 'gather') return lerpFields(out, REST, GATHER, ease.in(s.k), FIELDS);
  if (s.id === 'cast') return lerpFields(out, GATHER, CAST, ease.out(s.k), FIELDS);
  if (s.id === 'held') return lerpFields(out, CAST, WARD, ease.out(Math.min(1, s.k * 3)), FIELDS);
  if (s.id === 'fade') return lerpFields(out, WARD, REST, ease.inOut(s.k), FIELDS);
  return Object.assign(out, REST);
}
export function wispSnapPose(t, out = { ...REST }) {
  const s = SNAP_TL.sample(t);
  if (s.id === 'snap') return lerpFields(out, WARD, SNAP, ease.out(s.k), FIELDS);
  if (s.id === 'recoil') return lerpFields(out, SNAP, REST, ease.inOut(s.k), FIELDS);
  return Object.assign(out, REST);
}
// The cast's contact: the ward lands when the hood flares (the cast's start).
const CAST_AT = WARD_TL.startOf('cast');
export const WISP_WARD = Object.freeze({
  id: 'ward',
  label: 'Ward',
  duration: WARD_TL.duration,
  at(t) {
    const s = WARD_TL.sample(t);
    return { t: s.t, phase: s.id, label: `Ward: ${s.label}` };
  },
  strikes: [CAST_AT],
  cues: [{ at: CAST_AT, id: 'ward' }],
  classicAt: (t) => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { mode: t >= CAST_AT && t < WARD_TL.startOf('fade') ? 'ward' : 'drift', tetherId: t >= CAST_AT && t < WARD_TL.startOf('fade') ? 1 : null } }),
});
export const WISP_SNAP = Object.freeze({
  id: 'snap',
  label: 'Tether snaps',
  duration: SNAP_TL.duration,
  at(t) {
    const s = SNAP_TL.sample(t);
    return { t: s.t, phase: s.id, label: `Tether snaps: ${s.label}` };
  },
  classicAt: () => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { mode: 'drift', tetherId: null } }),
});
export const GRAVEWISP_ABILITIES = Object.freeze({ ward: WISP_WARD, snap: WISP_SNAP });

// --- Geometry (built once for the session, shared by every wisp) -----------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
const TWO_PI = Math.PI * 2;
// The hood hangs about the hover point (body space, hover at 0).
let G = null;
function geos() {
  if (G) return G;
  G = {};
  // the hood: the open cone cut into planes, a cowl ridge over the brow, a
  // ragged hem of tatters round the rim
  G.hood = bakeParts('gravewisp:hood', () => {
    const out = [{ geo: fz(new ConeGeometry(0.2, 0.5, 6, 1, true), 0.12, 1201), m: M(0, 0.05, 0) }];
    out.push({ geo: fz(new ConeGeometry(0.1, 0.22, 5, 1, true), 0.1, 1203), m: M(0, 0.24, 0.03, 1, 1, 1, qa(1, 0, 0, 0.35)), tone: 0.9 });
    const tatter = wedgeGeometry();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TWO_PI + 0.3;
      const r = 0.19;
      out.push({ geo: tatter, m: M(Math.cos(a) * r, -0.2, Math.sin(a) * r, 0.05, -0.12 - 0.04 * (i % 2), 0.03, qa(0, 1, 0, -a)), tone: 0.8 });
    }
    // the slit eyes in the hood's shadow: charcoal bars baked into the
    // hood's row at a black tone (one call for the lot)
    const bar = fz(new ConeGeometry(0.012, 0.06, 4), 0, 1);
    for (const s of [-1, 1]) out.push({ geo: bar, m: M(s * 0.055, 0.08, 0.15, 1, 1, 1, qa(0, 0, 1, s * 0.5)), tone: 0.02 });
    return out;
  });
  G.core = fz(new IcosahedronGeometry(0.08, 1), 0.14, 1205);
  G.tail = fz(new ConeGeometry(0.12, 0.55, 5), 0.08, 1207);
  G.sleeve = wedgeGeometry();
  for (const g of Object.values(G)) markShared(g);
  return G;
}
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);
const PIVOT = new Vector3(0, 0, 0);

export function buildGravewispFacet() {
  const G = geos();
  const F = createFoeFrame('gravewisp');
  const { body, spawn, track } = F;
  const hoodMat = track(foeMaterial(WISP));
  // the sleeves and ribbons hang in the hood's shadow: unlit, a dark fold
  // of the slate (no ink hull, one call)
  const sleeveMat = new MeshBasicMaterial({ color: WISP_DARK, toneMapped: false });
  const coreMat = new MeshBasicMaterial({ color: exactColor(TELL_INDIGO), toneMapped: false });
  const tailMat = new MeshBasicMaterial({ color: WISP, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });

  body.add(foePart(G.hood, hoodMat, 'full', 'gravewisp-hood'));
  const core = new Mesh(G.core, coreMat);
  core.name = 'gravewisp-core';
  core.position.set(0, -0.02, 0.06);
  body.add(core);
  const glow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.7, opacity: 0.3 });
  glow.material.toneMapped = false;
  glow.material.color.copy(TELL_INDIGO_GLOW);
  glow.name = 'gravewisp-glow';
  glow.position.copy(core.position);
  body.add(glow);
  // the tail streams from the hem (its own node: it turns with the travel)
  const tail = new Mesh(G.tail, tailMat);
  tail.name = 'gravewisp-tail';
  tail.rotation.x = Math.PI;
  tail.position.set(0, -0.38, 0);
  body.add(tail);
  // two sleeves and two hem ribbons on one row
  const cloth = instancedPart(G.sleeve, sleeveMat, 4, { name: 'gravewisp-cloth', moving: true, ink: false });
  body.add(cloth);
  const shadow = groundShadow(0.2, 0.4);
  F.group.add(shadow);
  void spawn;

  // Named points (B8): the core (the tether's root), the brow.
  const corePt = namedPoint(body, 'gravewisp-corept', 0, -0.02, 0.1);
  const brow = namedPoint(body, 'gravewisp-brow', 0, 0.12, 0.17);

  const clock = createFoeClock();
  const cur = { ...REST };
  const m = new Matrix4();
  const q = new Quaternion();
  const pos = new Vector3();
  const scl = new Vector3(1, 1, 1);
  let age = -1;
  let yawNow = 0;
  let lastX = null;
  let lastZ = 0;
  let lastYaw = 0;
  let vx = 0;
  let vz = 0;
  let yawRate = 0;
  let leanW = 1;
  // the live beat: 'ward' from the tether tick, 'snap' from its end
  let beat = null;
  let beatAt = 0;
  let hadTether = null;
  const strike = { id: 'ward', tick: 0 };

  const lab = {
    abilities: GRAVEWISP_ABILITIES,
    override: null,
    lastStrike: null,
    pose: () => ({ ...cur }),
    parts: { body, core, tail, cloth },
  };

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

    // --- the ward: the lab's pure timelines, or the sim's tether
    if (lab.override) {
      const ab = GRAVEWISP_ABILITIES[lab.override.id] || WISP_WARD;
      if (ab === WISP_SNAP) wispSnapPose(lab.override.t, cur);
      else wispWardPose(lab.override.t, cur);
      beat = null;
      hadTether = null;
    } else {
      const tether = e ? e.tetherId != null : false;
      if (hadTether !== null && tether !== hadTether) {
        beat = tether ? 'ward' : 'snap';
        beatAt = now;
        if (tether) {
          strike.tick = tick + CAST_AT * TICK_HZ;
          lab.lastStrike = strike;
        }
      }
      hadTether = tether;
      if (beat === 'ward') {
        // the cast, then held while the tether lasts
        const t = now - beatAt;
        if (tether) wispWardPose(Math.min(t, WARD_TL.startOf('fade') - 1e-3), cur);
        else wispWardPose(t, cur);
        if (t >= WARD_TL.duration) beat = null;
      } else if (beat === 'snap') {
        const t = now - beatAt;
        wispSnapPose(t, cur);
        if (t >= SNAP_TL.duration) beat = null;
      } else if (tether) Object.assign(cur, WARD);
      else Object.assign(cur, REST);
    }

    // --- the travel, measured off the layer's own position (rule 1)
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
      const a = 1 - Math.exp(-10 * dt);
      vx += (ix - vx) * a;
      vz += (iz - vz) * a;
      yawRate += (dy / dt - yawRate) * a;
    }
    lastX = gx;
    lastZ = gz;
    lastYaw = yawNow;
    leanW += ((beat === null && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 10);
    let leanP = 0;
    let leanR = 0;
    let lz = 0;
    let lx = 0;
    if (!lab.override && !turntable) {
      const sy = Math.sin(yawNow);
      const cy = Math.cos(yawNow);
      lz = clamp1((vx * sy + vz * cy) / SPEED);
      lx = clamp1((vx * cy - vz * sy) / SPEED);
      leanP = 0.14 * lz * leanW;
      leanR = (-0.18 * lx - 0.2 * clamp1((Math.max(0, lz) * yawRate) / 6)) * leanW;
    }

    // --- the body: the hover and its slow bob (pure in t), the lean
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const bob = 0.08 * Math.sin(tt * 2.2 + id);
    body.rotation.set(cur.pitch + leanP, cur.twist, cur.roll + leanR);
    body.scale.set(cur.sx, cur.sy, cur.sx);
    // the hover rides the spawn node: a wisp grows in where it floats
    spawn.position.y = HOVER_Y;
    placeBody(body, PIVOT, cur.push, cur.lift + bob);
    const h = HOVER_Y + cur.lift + bob;
    const s = 0.8 + 0.4 * (1 - (h - 0.4) / 0.7);
    shadow.scale.set(s, 1, s);
    // the core swells with the ward and pulses slow at rest
    const swell = 1 + 0.6 * cur.core + 0.1 * Math.sin(tt * 5 + id);
    core.scale.setScalar(swell);
    glow.material.opacity = 0.3 + 0.35 * Math.min(1, cur.core) + 0.1 * Math.max(0, cur.core - 1);
    glow.scale.setScalar(0.7 * (1 + 0.4 * cur.core));
    // --- the tail: streams back along the travel, flicks with the pose
    tail.rotation.set(Math.PI - 0.5 * lz * leanW, 0, Math.sin(tt * 3.1 + id) * 0.25 + cur.tail + 0.4 * lx * leanW);
    tail.scale.set(1, 1 + 0.35 * Math.abs(lz) * leanW, 1);
    // --- the cloth: two sleeves at the hem's sides, spread by the pose, and
    // two ribbons trailing behind that sway
    const spread = 0.35 + 0.9 * cur.arms + 0.25 * cur.hood;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      pos.set(side * 0.16, -0.14, 0.04);
      q.setFromAxisAngle(new Vector3(0, 0, 1), side * spread).multiply(qa(1, 0, 0, 0.1 * Math.sin(tt * 2.7 + id + i)));
      scl.set(0.06, -0.28 * (1 + 0.15 * cur.arms), 0.04);
      m.compose(pos, q, scl);
      cloth.setMatrixAt(i, m);
      const sway = Math.sin(tt * 2.4 + id + i * 2.1) * 0.2 - 0.6 * lz * leanW;
      pos.set(side * 0.08, -0.22, -0.12);
      q.setFromAxisAngle(new Vector3(1, 0, 0), -0.4 + sway).multiply(qa(0, 0, 1, side * 0.15));
      scl.set(0.05, -0.3, 0.03);
      m.compose(pos, q, scl);
      cloth.setMatrixAt(2 + i, m);
    }
    cloth.instanceMatrix.needsUpdate = true;
    corePt.position.set(0, -0.02, 0.06 + 0.06 * swell);
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
    points: { core: corePt, brow, tip: corePt },
    // §6.1 item 9: a hooded flame with no body: a soft squash about its
    // hover, a light flinch, a big knock (it is thrown about like smoke).
    react: { squash: 0.8, flinch: 0.8, knock: 1.4, axis: 'y', midY: HOVER_Y },
    death: { swell: 1.2, throw: 0.6 },
  };
}
