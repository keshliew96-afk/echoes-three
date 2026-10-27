// GLOAM MOTH, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level II foes").
// The classic moth of enemies/archetypes.js (the roster's one flier: a slim
// dark body hovering 0.95 u up on broad fore and hind wings raised in a V,
// feathered antennae, the indigo eyespot on each forewing its one tell) with
// the sample video's technique laid ON TOP of its chibi ink look. What it
// gains:
//
//   * faceted masses with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd): a furred thorax with a pale collar of tufts, the head
//     with comb (feathered) antennae, six thin legs dangling under the hover,
//     charcoal slit eyes (never round, never warm); a banded abdomen on its
//     own hinge that sways under the hover and curls in the dive;
//   * the WINGS as solid faceted plates (the classic's flat sheets given a
//     thickness, so they carry the ink line): fore and hind wing coupled as
//     one plate per side the way a moth's are, a darker base, a dark band
//     along the outer margin and a dark ring round the eyespot painted in
//     the plate's value steps; the indigo eyespots (the tell) unlit on both
//     faces. The classic's beat (17 rad/s between a shallow and a steep V)
//     stays pure in t;
//   * a FLYER'S LEAN from the real travel (rule 1, legless form, as the
//     wasp's): pitched into an advance, nosed up on a backpedal, rolled
//     toward a strafe (its orbit round the target) and banked into a turn;
//   * the SWOOP on the sim's 45-tick lane telegraph (sim/enemies/moth.js,
//     then a dive down the lane at 8 u/s). The telegraph is the coil: risen,
//     nose up, wings held high and beating hard, the abdomen cocked. The
//     strike takes the last 2.5 frames of it (sampled on the shown sim tick)
//     and its contact lands on the release frame: dropped low, nose down,
//     wings swept back flat, the abdomen curled under. The contact holds for
//     as long as the sim's mode is 'swoop'; then it pulls up (B5). Repeat
//     swoops bank in from its left, from its right, then the finisher: it
//     climbs highest and plunges steepest (B6);
//   * the spawn-in grow (B7), named points (B8: the head, the eyespots), and
//     the hit and death tuning.
//
// Faces +Z. Same contract as buildMoth (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing and damage untouched.
import { BoxGeometry, CircleGeometry, Color, CylinderGeometry, ExtrudeGeometry, Matrix4, MeshBasicMaterial, Quaternion, Shape, SphereGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { HIDE, TELL_INDIGO } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, wedgeGeometry } from '../../facet/kit.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, placeBody, spawnScale } from '../../facet/foe.js';
import { createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';

// The sim's moth (sim/enemies/moth.js S): hovers at 2.4 u/s; a 45-tick lane
// telegraph, then a swoop at 8 u/s down a lane of 5.5 u at most.
const TICK_HZ = 60;
const HOVER_SPEED = 2.4;
export const SWOOP_TEL_SEC = 45 / TICK_HZ;
const SWOOP_SEC = 5.5 / 8;
// The hover (the classic's 0.95 u, its 0.06 u bob at 2.3 rad/s) and the beat
// (17 rad/s between a shallow and a steep V).
const HOVER_Y = 0.95;
const BEAT_W = 17;

// --- Key poses. lift (u, off the hover), push (u, +z), pitch (nose down +),
// roll (+ toward its right), twist (+ toward its left), sx / sy / sz
// (squash), wUp (rad, the V raised), wAmp (the beat's size), wSweep (rad,
// swept back), abd (rad, the abdomen curled under).
const REST = Object.freeze({ lift: 0, push: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, sz: 1, wUp: 0, wAmp: 1, wSweep: 0, abd: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Swoop 1, BANKED IN FROM ITS LEFT: risen and banked onto its left, nose up,
// the wings high and beating hard; it rolls through to its right as it drops
// into the dive.
const C1 = K({ lift: 0.06, push: -0.06, pitch: -0.18, roll: -0.22, twist: 0.12, sx: 0.97, sy: 1.04, sz: 0.95, wUp: 0.2, wAmp: 1.35, wSweep: -0.15, abd: -0.3 });
const S1 = K({ lift: -0.5, push: 0.12, pitch: 0.55, roll: 0.2, twist: -0.1, sx: 0.92, sy: 0.92, sz: 1.14, wUp: -0.55, wAmp: 0.2, wSweep: 0.55, abd: 0.45 });
const O1 = K({ lift: 0.04, push: 0.03, pitch: -0.25, roll: 0.1, sx: 1.04, sy: 1.04, sz: 0.96, wUp: 0.1, wAmp: 1.2, wSweep: -0.1, abd: -0.2 });
// Swoop 2, BANKED IN FROM ITS RIGHT: the mirror.
const C2 = K({ lift: 0.06, push: -0.06, pitch: -0.18, roll: 0.22, twist: -0.12, sx: 0.97, sy: 1.04, sz: 0.95, wUp: 0.2, wAmp: 1.35, wSweep: -0.15, abd: -0.3 });
const S2 = K({ lift: -0.5, push: 0.12, pitch: 0.55, roll: -0.2, twist: 0.1, sx: 0.92, sy: 0.92, sz: 1.14, wUp: -0.55, wAmp: 0.2, wSweep: 0.55, abd: 0.45 });
const O2 = K({ lift: 0.04, push: 0.03, pitch: -0.25, roll: -0.1, sx: 1.04, sy: 1.04, sz: 0.96, wUp: 0.1, wAmp: 1.2, wSweep: -0.1, abd: -0.2 });
// Swoop 3, THE PLUNGE (the biggest, §6.1 B6): climbed highest, square and
// reared right back; it plunges steepest and lowest, stretched long.
const C3 = K({ lift: 0.08, push: -0.08, pitch: -0.32, sx: 0.96, sy: 1.06, sz: 0.92, wUp: 0.22, wAmp: 1.45, wSweep: -0.2, abd: -0.4 });
const S3 = K({ lift: -0.58, push: 0.16, pitch: 0.7, sx: 0.9, sy: 0.9, sz: 1.2, wUp: -0.6, wAmp: 0.15, wSweep: 0.65, abd: 0.55 });
const O3 = K({ lift: 0.06, push: 0.04, pitch: -0.32, sx: 1.06, sy: 1.05, sz: 0.95, wUp: 0.12, wAmp: 1.25, wSweep: -0.12, abd: -0.25 });
const SWOOPS = [
  { label: 'banked in from its left', coil: C1, strike: S1, over: O1 },
  { label: 'banked in from its right', coil: C2, strike: S2, over: O2 },
  { label: 'the plunge', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));
export const MOTH_REST = REST;
export const MOTH_SWOOPS = Object.freeze(SWOOPS);

// The dive's own motion while the contact holds: the wings flutter flat.
function heldMotion(V, age, out) {
  out.wUp += 0.08 * Math.sin(age * 40);
}
const SWOOP_TL = strikeTimeline('swoop', 'Swoop', {
  tel: SWOOP_TEL_SEC,
  hold: SWOOP_SEC,
  snap: 4 * (1 / 30),
  settle: 9 * (1 / 30),
  rest: 0.2,
  labels: { coil: 'coil (the lane telegraph): risen, wings high', strike: 'drop into the dive', hold: 'the swoop: down the lane, wings swept flat', snap: 'pull up', settle: 'settle into the hover' },
});
export function mothSwoopPose(v, t, out = { ...REST }) {
  return strikePoseAt(SWOOP_TL, SWOOPS[v] || SWOOPS[0], REST, FIELDS, t, out, heldMotion);
}
const classicSwoop = (tt, s) => ({ telegraphK: s.id === 'coil' || s.id === 'strike' ? 1 : 0, lungeK: 0, fireK: 0, e: { mode: s.id === 'hold' ? 'swoop' : 'orbit' } });
export const MOTH_SWOOP = strikeAbility({ id: 'swoop', label: 'Swoop', tl: SWOOP_TL, variants: SWOOPS, classic: classicSwoop });
export const MOTH_SWOOPS_STRING = strikeAbility({ id: 'swoops', label: 'Swoop string', tl: SWOOP_TL, variants: SWOOPS, n: 3, gap: SWOOP_TL.duration, classic: classicSwoop });
export const MOTH_ABILITIES = Object.freeze({ swoop: MOTH_SWOOP, swoops: MOTH_SWOOPS_STRING });

// --- Geometry (built once for the session, shared by every moth) -----------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
const qTo = (x, y, z) => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(x, y, z).normalize());
// The abdomen's hinge at the thorax's back; the wings' roots either side.
const ABD_AT = new Vector3(0, 0.02, 0.03);
const WING_ROOT = new Vector3(0.04, 0.05, 0.06);
const WING_SCALE = 1.15;
const WING_T = 0.016;
// The eyespot on the forewing (wing space, before the scale) and its sizes.
const SPOT = [0.44, 0.16];
const SPOT_R = 0.075;
const RING_R = 0.11;
const WING_DARK = new Color(HIDE.mothWingDark);
const WING_BASE = new Color(HIDE.mothWing);
// the dark pattern as a tint on the wing's own colour
const DARK_TINT = new Color(WING_DARK.r / WING_BASE.r, WING_DARK.g / WING_BASE.g, WING_DARK.b / WING_BASE.b);
function toneFaces(g, tone) {
  const p = g.attributes.position;
  const c = g.attributes.color;
  for (let i = 0; i + 2 < p.count; i += 3) {
    const col = tone((p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3);
    for (let j = i; j < i + 3; j++) c.setXYZ(j, c.getX(j) * col.r, c.getY(j) * col.g, c.getZ(j) * col.b);
  }
  return g;
}
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  // The body: the furred thorax with its collar of pale tufts, the head, the
  // comb antennae, the six legs dangling under the hover.
  set.body = bakeParts('moth:body', () => {
    const out = [
      { geo: fz(new SphereGeometry(0.095, 8, 6), 0.16, 801), m: M(0, 0.03, 0.1, 1, 0.95, 1.12) },
      { geo: fz(new SphereGeometry(0.066, 7, 5), 0.12, 803), m: M(0, 0.05, 0.22, 1.05, 0.95, 1) },
    ];
    const tuft = wedgeGeometry();
    for (let i = 0; i < 7; i++) {
      const a = -1.4 + (i / 6) * 2.8;
      const dir = new Vector3(Math.sin(a), Math.cos(a) * 0.8 + 0.2, 0.35);
      out.push({ geo: tuft, m: new Matrix4().compose(new Vector3(Math.sin(a) * 0.07, 0.04 + Math.cos(a) * 0.06, 0.17), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()), new Vector3(0.08, 0.07, 0.06)), tone: 2.2 });
    }
    // the comb antennae: a spine laid up, forward and out, its teeth along it
    const spine = fz(new CylinderGeometry(0.006, 0.01, 1, 4).translate(0, 0.5, 0), 0, 1);
    const tooth = fz(new BoxGeometry(0.05, 0.012, 0.008), 0, 1);
    for (const s of [-1, 1]) {
      const base = new Vector3(s * 0.035, 0.1, 0.25);
      const dir = new Vector3(s * 0.55, 0.75, 0.45).normalize();
      out.push({ geo: spine, m: new Matrix4().compose(base, qTo(dir.x, dir.y, dir.z), new Vector3(1, 0.22, 1)), tone: 1.3 });
      for (let k = 1; k <= 5; k++) {
        const p = base.clone().addScaledVector(dir, 0.04 * k);
        const w = 1 - k * 0.12;
        for (const side of [-1, 1]) {
          const q = new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), new Vector3(side * s * 0.3, -0.2, side).normalize());
          out.push({ geo: tooth, m: new Matrix4().compose(p, q, new Vector3(w, 1, 1)), tone: 1.3 });
        }
      }
    }
    // six thin legs hanging under the thorax, bent at the knee
    const leg = fz(new CylinderGeometry(0.008, 0.01, 1, 4).translate(0, -0.5, 0), 0, 1);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const z = 0.15 - i * 0.05;
        const hip = new Vector3(s * 0.04, -0.04, z);
        const knee = hip.clone().add(new Vector3(s * 0.06, -0.04, 0.02 - i * 0.02));
        const foot = knee.clone().add(new Vector3(s * 0.01, -0.08, -0.01 - i * 0.015));
        for (const [a, b] of [[hip, knee], [knee, foot]]) {
          const d = b.clone().sub(a);
          out.push({ geo: leg, m: new Matrix4().compose(a, new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), d.clone().normalize()), new Vector3(1, d.length(), 1)), tone: 1.2 });
        }
      }
    }
    return out;
  });
  // The abdomen (about its hinge): four bands tapering back and down, the
  // rings alternating light and dark.
  set.abd = bakeParts('moth:abd', () => {
    const R = [0.072, 0.064, 0.052, 0.036];
    const Z = [-0.04, -0.11, -0.18, -0.24];
    const Y = [-0.005, -0.015, -0.03, -0.045];
    return R.map((r, i) => ({ geo: fz(new SphereGeometry(r, 7, 5), 0.12, 811 + i), m: M(0, Y[i], Z[i], 1, 0.88, 1.15), tone: i % 2 ? 0.75 : 1.15 }));
  });
  // Eyes: slit bars on the head's front sides (unlit charcoal).
  set.eyes = bakeParts('moth:eyes', () => {
    const bar = fz(new BoxGeometry(0.05, 0.016, 0.016), 0, 1);
    return [-1, 1].map((s) => ({ geo: bar, m: M(s * 0.04, 0.065, 0.27, 1, 1, 1, qa(0, 0, 1, s * 0.5).multiply(qa(0, 1, 0, s * 0.5))) }));
  });
  // A wing pair (fore and hind coupled), one solid plate: span +x from the
  // root, the leading edge toward +z, centred on y 0 (so the other side's
  // plate is this one turned half round its chord, and paints the same).
  set.wing = (() => {
    const fore = new Shape();
    fore.moveTo(0, 0.1);
    fore.bezierCurveTo(0.18, 0.32, 0.52, 0.34, 0.66, 0.16);
    fore.bezierCurveTo(0.7, 0.02, 0.5, -0.12, 0.28, -0.1);
    fore.bezierCurveTo(0.14, -0.08, 0.04, -0.02, 0, 0.1);
    const hind = new Shape();
    hind.moveTo(0, -0.02);
    hind.bezierCurveTo(0.14, -0.06, 0.4, -0.12, 0.42, -0.3);
    hind.bezierCurveTo(0.36, -0.44, 0.12, -0.36, 0, -0.16);
    hind.lineTo(0, -0.02);
    const plate = (shape, seed) => {
      const g = new ExtrudeGeometry(shape, { depth: WING_T, bevelEnabled: false, curveSegments: 5 });
      g.translate(0, 0, -WING_T / 2).rotateX(Math.PI / 2);
      g.deleteAttribute('uv');
      return fz(g.index ? g.toNonIndexed() : g, 0.05, seed);
    };
    const f = toneFaces(plate(fore, 821), (x, z) => {
      const r = Math.hypot(x - SPOT[0], z - SPOT[1]);
      if (r < RING_R) return DARK_TINT.clone().multiplyScalar(0.7);
      if (x < 0.12) return new Color(0.82, 0.82, 0.82);
      if (Math.hypot(x, z * 1.3) > 0.6) return DARK_TINT;
      return new Color(1, 1, 1);
    });
    const h = toneFaces(plate(hind, 823), (x) => (x < 0.12 ? DARK_TINT.clone().multiplyScalar(0.85) : DARK_TINT));
    h.translate(0, -0.002, 0);
    const g = mergeGeometries([f, h]);
    f.dispose();
    h.dispose();
    g.scale(WING_SCALE, 1, WING_SCALE);
    g.userData.faceted = true;
    return g;
  })();
  // The eyespots on both faces of each forewing (unlit indigo).
  set.spot = (() => {
    const top = new CircleGeometry(SPOT_R, 8).rotateX(-Math.PI / 2).translate(SPOT[0], WING_T / 2 + 0.003, SPOT[1]);
    const bot = new CircleGeometry(SPOT_R, 8).rotateX(Math.PI / 2).translate(SPOT[0], -WING_T / 2 - 0.003, SPOT[1]);
    for (const g of [top, bot]) g.deleteAttribute('uv');
    const g = mergeGeometries([top, bot]);
    g.scale(WING_SCALE, 1, WING_SCALE);
    return g;
  })();
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

const PIVOT = new Vector3(0, 0.03, 0.06);
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildMothFacet() {
  const G = geos();
  const F = createFoeFrame('moth');
  const { body, spawn, track } = F;
  const bodyMat = track(foeMaterial(HIDE.mothBody));
  const wingMat = track(foeMaterial(HIDE.mothWing));
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const spotMat = new MeshBasicMaterial({ color: exactColor(TELL_INDIGO), toneMapped: false });

  body.add(foePart(G.body, bodyMat, 'full', 'moth-body'));
  body.add(foePart(G.eyes, eyeMat, false, 'moth-eyes'));
  const abd = foePart(G.abd, bodyMat, 'full', 'moth-abdomen');
  abd.position.copy(ABD_AT);
  body.add(abd);
  const wings = instancedPart(G.wing, wingMat, 2, { name: 'moth-wings', moving: true, inkPx: 2.0 });
  const spots = instancedPart(G.spot, spotMat, 2, { name: 'moth-spots', moving: true, ink: false });
  body.add(wings);
  body.add(spots);
  // The flier's shadow stays on the floor: it places the moth in space.
  const shadow = groundShadow(0.34, 0.62, { forward: 0.1, wide: 1.5, deep: 0.8 });
  F.group.add(shadow);
  void spawn;

  // Named points (B8): the head (the dive's point), the eyespots.
  const head = namedPoint(body, 'moth-head', 0, 0.05, 0.28);
  const eyespot = namedPoint(body, 'moth-eyespot', WING_ROOT.x + SPOT[0] * WING_SCALE, WING_ROOT.y + 0.2, WING_ROOT.z + SPOT[1] * WING_SCALE);

  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, held: heldMotion, maxHold: 1.5, snapSec: 4 / 30, settleSec: 9 / 30 });
  const cur = { ...REST };
  const m = new Matrix4();
  const q = new Quaternion();
  const q2 = new Quaternion();
  const pos = new Vector3();
  const scl = new Vector3();
  const YA = new Vector3(0, 1, 0);
  const ZA = new Vector3(0, 0, 1);
  let age = -1;
  let yawNow = 0;
  let swoops = 0;
  let lastX = null;
  let lastZ = 0;
  let lastYaw = 0;
  let vx = 0;
  let vz = 0;
  let yawRate = 0;
  let leanW = 1;

  const lab = {
    abilities: MOTH_ABILITIES,
    override: null,
    lastStrike: null,
    pose: () => ({ ...cur }),
    get hit() {
      return clip.state === 'rest' ? -1 : (swoops - 1) % 3;
    },
    parts: { body, abd, wings, spots },
  };

  function liveSwoop(P, now, tick, e) {
    const beat = watch.update(P);
    clip.update({
      beat,
      tel: watch.telegraph,
      now,
      tick,
      holding: !!(e && e.mode === 'swoop'),
      pick: () => SWOOPS[swoops++ % 3],
      name: () => `swoop:${((swoops - 1) % 3) + 1}`,
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
    F.spawn.scale.setScalar(spawnScale(age));

    if (lab.override) {
      const ab = MOTH_ABILITIES[lab.override.id] || MOTH_SWOOP;
      const h = ab.at(lab.override.t);
      mothSwoopPose(h.v, h.t, cur);
      watch.reset();
      clip.reset();
    } else liveSwoop(P, now, tick, e);

    // --- the travel, measured off the layer's own position (the floor frame)
    // and turned into the moth's: pitch into it, roll toward a strafe, bank
    // into a turn (rule 1); eased out while it swoops (the dive owns the body)
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
    leanW += ((clip.state === 'rest' && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 10);
    let leanP = 0;
    let leanR = 0;
    if (!lab.override && !turntable) {
      const sy = Math.sin(yawNow);
      const cy = Math.cos(yawNow);
      const lz = vx * sy + vz * cy;
      const lx = vx * cy - vz * sy;
      leanP = 0.16 * clamp1(lz / HOVER_SPEED) * leanW;
      leanR = (-0.2 * clamp1(lx / HOVER_SPEED) - 0.22 * clamp1((Math.max(0, lz) * yawRate) / 6)) * leanW;
    }

    // --- the body: the swoop's pose, the hover and its slow bob (pure in t),
    // the lean; each downbeat lifts the body a touch
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const ph = tt * BEAT_W + id * 0.9;
    const beat = Math.sin(ph);
    const bob = 0.06 * Math.sin(tt * 2.3 + id) + 0.012 * cur.wAmp * Math.cos(ph);
    body.rotation.set(cur.pitch + leanP, cur.twist, cur.roll + leanR);
    body.scale.set(cur.sx, cur.sy, cur.sz);
    placeBody(body, PIVOT, cur.push, HOVER_Y + cur.lift + bob);
    const h = HOVER_Y + cur.lift + bob;
    const s = 0.8 + 0.4 * (1 - (h - 0.4) / 0.7);
    shadow.scale.set(s, 1, s);
    abd.rotation.set(-cur.abd + 0.08 * Math.sin(tt * 2.1 + id), 0.06 * Math.sin(tt * 1.3 + id), 0);

    // --- the wings: the classic's V, beating between shallow and steep,
    // raised, swept and sized by the pose; one plate per side
    const dihedral = Math.min(0.84, Math.max(0.12, 0.5 + 0.55 * (0.5 + 0.5 * beat) * cur.wAmp + cur.wUp));
    const sweep = 0.05 + cur.wSweep;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      q.setFromAxisAngle(YA, side * sweep);
      if (side > 0) q2.setFromAxisAngle(ZA, dihedral);
      else q2.setFromAxisAngle(ZA, Math.PI - dihedral);
      q.multiply(q2);
      pos.set(side * WING_ROOT.x, WING_ROOT.y, WING_ROOT.z);
      scl.set(1, 1, 1);
      m.compose(pos, q, scl);
      wings.setMatrixAt(i, m);
      spots.setMatrixAt(i, m);
    }
    wings.instanceMatrix.needsUpdate = true;
    spots.instanceMatrix.needsUpdate = true;
    eyespot.position.set(WING_ROOT.x + Math.cos(dihedral) * SPOT[0] * WING_SCALE, WING_ROOT.y + Math.sin(dihedral) * SPOT[0] * WING_SCALE, WING_ROOT.z + SPOT[1] * WING_SCALE);
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
    points: { head, eyespot },
    // §6.1 item 9: a light flier takes a softer squash along its spine and a
    // bigger knock; the flinch bulges at the hover.
    react: { squash: 0.8, flinch: 0.85, knock: 1.3, axis: 'z', midY: HOVER_Y },
    death: { swell: 0.8, throw: 1.3 },
  };
}
