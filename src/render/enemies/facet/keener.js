// BARROW KEENER, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level III
// foes"). The classic keener of enemies/barrowheart.js (a long fluted robe
// gliding a hand above the floor, a ragged hem, a mantle, a hooded bone
// mask with hollow eyes and an open indigo mouth that swells through the
// keen; long sleeves that hang in grief, spread to keen and fling forward
// on the wail) with the sample video's technique laid ON TOP of its chibi
// ink look. What it gains:
//
//   * a faceted body with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd of each row): the robe cut into flutes with a cord at
//     the waist, the mantle with its clasp, the hem a ring of nine ragged
//     points; the head on its own row (the hood, its back, the mask with
//     its sunken cheeks and the hollow eyes baked black) so it throws back
//     and forward; the mouth an unlit indigo hollow with its glow;
//   * a GLIDE that reads the travel (rule 1: the body pitches into the
//     travel, rolls toward a strafe, banks into a turn, measured off the
//     layer's own position; the hem trails behind the glide); it has no
//     feet, so rule 2 does not apply; the sleeves are two plates hung from
//     the shoulders and swung by the pose;
//   * the WAIL (sim/enemies/keener.js: a 54-tick cone telegraph, the wail
//     on its resolve, keener_wail) on the foe kit's strike clip
//     (render/facet/foestrike.js) as a 3-hit flow (Kesh's template, §6.1 B1
//     to B6): the contact lands on the resolve tick on the layer's shown
//     tick (B2), the wind-up is the telegraph (B3), the contact holds while
//     the sim's keen lasts (B4), the overshoot settles through rest (B5).
//     Wail 1 is THE KEEN: the hood falls back, the head tips up, the arms
//     spread wide and the mouth swells; the wail throws the head and both
//     arms forward and the hem flares. Wail 2 THE LAMENT FROM ITS LEFT: the
//     body turns to its left with the left arm raised high and the right
//     across its chest; the wail whips it round to face its target with the
//     left arm sweeping across. Wail 3 THE DIRGE (the biggest, B6): it sinks
//     low with the arms crossed over the mask and the hood drawn over; the
//     wail hurls it forward and down, the arms flung back, the robe flaring
//     widest, the mouth gaping. Each overshoot is the next wail's wind-up;
//   * the spawn-in grow (B7), named points (B8: the mouth, the hands), and
//     the hit and death tuning.
//
// Faces +Z. Same contract as buildKeener (group, mats, setYaw, pose) plus
// lab, react, death, points. Render only: the sim, its timing and the cone
// untouched.
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { makeGlowSprite } from '../../glow.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart } from '../../facet/kit.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, placeBody, spawnScale } from '../../facet/foe.js';
import { HOLD_SEC, createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';

// The sim's keener (sim/enemies/keener.js S): 1.45 u/s, the wail's cone
// telegraph 54 ticks.
const TICK_HZ = 60;
const GLIDE_SPEED = 1.45;
export const WAIL_TEL_SEC = 54 / TICK_HZ;
const GLIDE_Y = 0.08;
const TWO_PI = Math.PI * 2;
// The classic's colours (enemies/barrowheart.js C).
const slate = (h, l) => new Color().setHSL(0.6, h, l);
// (the pale cloth toned down a step: the facet's value steps on the classic's
// shade blew out white under the lab's showcase light)
const SHROUD = slate(0.12, 0.62).multiplyScalar(0.82);
const SHROUD_DARK = slate(0.16, 0.34);
const MASK = new Color(PALETTE.bone).multiplyScalar(0.8);
const CHARCOAL = new Color(PALETTE.voidCharcoal);

// --- Key poses. push (u, +z), lift (u), pitch (forward +), twist (+ toward
// its left), roll, flare (the robe and hem, 1 = rest), head (the neck's
// pitch, up -), hood (0..1 thrown back, -1 drawn over), lx / lz and rx / rz
// (the left and right sleeve's swing, rad: x forward -, z out +), mouth
// (0..1 the hollow's swell).
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, twist: 0, roll: 0, flare: 1, head: 0, hood: 0, lx: -0.05, lz: 0.1, rx: -0.05, rz: 0.1, mouth: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Wail 1, THE KEEN: the hood back, the head up, the arms spread, the mouth
// swelling; the wail throws the head and the arms forward, the hem flares.
const C1 = K({ push: -0.04, lift: 0.04, pitch: -0.18, flare: 0.95, head: -0.75, hood: 1, lx: -0.4, lz: 1.3, rx: -0.4, rz: 1.3, mouth: 0.7 });
const S1 = K({ push: 0.12, lift: -0.04, pitch: 0.3, flare: 1.35, head: 0.55, hood: 0.2, lx: -1.5, lz: 0.3, rx: -1.5, rz: 0.3, mouth: 1 });
const O1 = K({ push: 0.08, lift: -0.02, pitch: 0.2, flare: 1.2, head: 0.4, hood: 0.1, lx: -1.2, lz: 0.4, rx: -1.2, rz: 0.4, mouth: 0.6 });
// Wail 2, THE LAMENT FROM ITS LEFT: turned to its left, the left arm raised
// high, the right across the chest; the wail whips it round and the left
// arm sweeps across before it.
const C2 = K({ push: -0.03, lift: 0.04, pitch: -0.08, twist: 0.55, roll: 0.08, flare: 0.95, head: -0.5, hood: 0.8, lx: -0.6, lz: 2.1, rx: -1.0, rz: -0.6, mouth: 0.7 });
const S2 = K({ push: 0.1, lift: -0.03, pitch: 0.25, twist: -0.3, roll: -0.1, flare: 1.3, head: 0.45, hood: 0.15, lx: -1.3, lz: -0.7, rx: -0.9, rz: 0.9, mouth: 1 });
const O2 = K({ push: 0.07, lift: -0.01, pitch: 0.16, twist: -0.2, roll: -0.05, flare: 1.15, head: 0.3, hood: 0.1, lx: -1.0, lz: -0.3, rx: -0.7, rz: 0.6, mouth: 0.6 });
// Wail 3, THE DIRGE (the biggest, §6.1 B6): sunk low, the arms crossed over
// the mask, the hood drawn over; the wail hurls it forward and down with
// the arms flung back, the robe flaring widest, the mouth gaping.
const C3 = K({ push: -0.08, lift: -0.08, pitch: 0.1, flare: 0.85, head: 0.3, hood: -0.6, lx: -1.6, lz: -0.5, rx: -1.6, rz: -0.5, mouth: 0.8 });
const S3 = K({ push: 0.2, lift: -0.05, pitch: 0.55, flare: 1.5, head: 0.2, hood: 0.4, lx: 1.1, lz: 0.6, rx: 1.1, rz: 0.6, mouth: 1 });
const O3 = K({ push: 0.14, lift: -0.03, pitch: 0.4, flare: 1.3, head: 0.15, hood: 0.3, lx: 0.8, lz: 0.5, rx: 0.8, rz: 0.5, mouth: 0.6 });
const WAILS = [
  { label: 'the keen', coil: C1, strike: S1, over: O1 },
  { label: 'the lament from its left', coil: C2, strike: S2, over: O2 },
  { label: 'the dirge', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));
const WAIL_TL = strikeTimeline('wail', 'Wail', {
  tel: WAIL_TEL_SEC,
  labels: { coil: 'coil (the keen, the cone telegraph)', strike: 'the wail', hold: 'contact: the wail held', snap: 'snap back', settle: 'settle' },
});
// The hold: the wail shakes the body.
function heldMotion(V, age, out) {
  const a = age - HOLD_SEC;
  if (a > 0) out.lift += 0.012 * Math.sin(a * 60) * Math.max(0, 1 - a / 0.3);
}
export function keenerWailPose(v, t, out = { ...REST }) {
  return strikePoseAt(WAIL_TL, WAILS[v] || WAILS[0], REST, FIELDS, t, out, heldMotion);
}
export const KEENER_WAIL = strikeAbility({ id: 'wail', label: 'Wail', tl: WAIL_TL, variants: WAILS });
export const KEENER_WAILS_STRING = strikeAbility({ id: 'wails', label: 'Wail string', tl: WAIL_TL, variants: WAILS, n: 3, gap: WAIL_TL.duration });
export const KEENER_ABILITIES = Object.freeze({ wail: KEENER_WAIL, wails: KEENER_WAILS_STRING });

// --- Geometry (built once for the session, shared by every keener) --------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
let SET = null;
const NECK_AT = new Vector3(0, 1.2, 0.02);
const SHOULDERS = [new Vector3(0.2, 1.1, 0.02), new Vector3(-0.2, 1.1, 0.02)]; // left (+x), right
function geos() {
  if (SET) return SET;
  const set = {};
  // The robe (from the floor): the fluted cone, the hem's nine ragged
  // points, the cord at the waist, the mantle and its clasp.
  set.robe = bakeParts('keener:robe', () => {
    const out = [
      { geo: fz(new ConeGeometry(0.34, 1.12, 8), 0.1, 1401), m: M(0, 0.56, 0), tint: SHROUD },
      { geo: fz(new TorusGeometry(0.22, 0.02, 4, 10), 0.05, 1403), m: M(0, 0.72, 0, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tint: SHROUD_DARK },
      { geo: fz(new ConeGeometry(0.27, 0.32, 8), 0.1, 1405), m: M(0, 1.08, 0), tint: SHROUD_DARK },
      { geo: fz(new IcosahedronGeometry(0.035, 0), 0.1, 1407), m: M(0, 1.14, 0.2), tint: MASK },
    ];
    const point = fz(new ConeGeometry(0.07, 0.24, 4), 0.1, 1409);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TWO_PI;
      out.push({ geo: point, m: M(Math.sin(a) * 0.3, 0.12 - 0.02 * (i % 2), Math.cos(a) * 0.3, 1, 1, 1, qa(Math.cos(a), 0, -Math.sin(a), 0.25).multiply(qa(1, 0, 0, Math.PI))), tint: SHROUD_DARK });
    }
    return out;
  });
  // The head (about the neck): the hood, its back, the mask with sunken
  // cheeks, the hollow eyes baked black.
  set.head = bakeParts('keener:head', () => [
    { geo: fz(new ConeGeometry(0.17, 0.42, 7, 1, true), 0.1, 1411), m: M(0, 0.2, -0.04, 1, 1, 1, qa(1, 0, 0, 0.35)), tint: SHROUD },
    { geo: fz(new SphereGeometry(0.15, 8, 6, 0, TWO_PI, 0, Math.PI / 2), 0.08, 1413), m: M(0, 0.06, -0.06, 1, 1, 1, qa(1, 0, 0, -0.4)), tint: SHROUD_DARK },
    { geo: fz(new IcosahedronGeometry(0.1, 1), 0.1, 1415), m: M(0, 0.08, 0.06, 0.8, 1.15, 0.55), tint: MASK },
    { geo: fz(new SphereGeometry(0.03, 5, 4), 0.1, 1417), m: M(0.05, 0.04, 0.1, 1, 1.2, 0.5), tint: MASK, tone: 0.7 },
    { geo: fz(new SphereGeometry(0.03, 5, 4), 0.1, 1419), m: M(-0.05, 0.04, 0.1, 1, 1.2, 0.5), tint: MASK, tone: 0.7 },
    { geo: fz(new BoxGeometry(0.04, 0.018, 0.02), 0, 1), m: M(0.035, 0.12, 0.115, 1, 1, 1, qa(0, 0, 1, 0.35)), tint: CHARCOAL },
    { geo: fz(new BoxGeometry(0.04, 0.018, 0.02), 0, 1), m: M(-0.035, 0.12, 0.115, 1, 1, 1, qa(0, 0, 1, -0.35)), tint: CHARCOAL },
  ]);
  // The tell (unlit): the open mouth, a hollow.
  set.mouth = fz(new SphereGeometry(0.03, 8, 6), 0.06, 1421);
  // A sleeve (hung from the shoulder, y 0..-0.64) with its bone hand.
  set.sleeve = bakeParts('keener:sleeve', () => [
    { geo: fz(new ConeGeometry(0.075, 0.6, 6), 0.1, 1423), m: M(0, -0.3, 0, 1, 1, 1, qa(1, 0, 0, Math.PI)), tint: SHROUD },
    { geo: fz(new CylinderGeometry(0.03, 0.06, 0.06, 6), 0.08, 1425), m: M(0, -0.58, 0), tint: SHROUD_DARK },
    { geo: fz(new ConeGeometry(0.03, 0.12, 4), 0.1, 1427), m: M(0, -0.66, 0, 1, 1, 1, qa(1, 0, 0, Math.PI)), tint: MASK },
  ]);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);
const PIVOT = new Vector3(0, 0, 0);

export function buildKeenerFacet() {
  const G = geos();
  const F = createFoeFrame('keener');
  const { body, spawn, track } = F;
  const mat = track(foeMaterial('#FFFFFF'));
  const mouthMat = new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
  const robe = foePart(G.robe, mat, 'full', 'keener-robe');
  body.add(robe);
  const neck = foePart(G.head, mat, 'full', 'keener-head');
  neck.position.copy(NECK_AT);
  body.add(neck);
  const mouth = foePart(G.mouth, mouthMat, false, 'keener-mouth');
  mouth.position.set(0, 0.03, 0.115);
  neck.add(mouth);
  const glow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.5, opacity: 0.3 });
  glow.material.toneMapped = false;
  glow.material.color.copy(TELL_INDIGO_GLOW);
  glow.name = 'keener-mouth-glow';
  glow.position.set(0, 0.04, 0.16);
  neck.add(glow);
  const sleeves = instancedPart(G.sleeve, mat, 2, { name: 'keener-sleeves', moving: true, inkPx: 1.8 });
  body.add(sleeves);
  const shadow = groundShadow(0.32, 0.55);
  F.group.add(shadow);

  // Named points (B8): the mouth (the wail's source), the hands.
  const mouthPt = namedPoint(neck, 'keener-mouth-point', 0, 0.03, 0.16);
  const handL = namedPoint(body, 'keener-hand', 0.2, 0.45, 0.05);
  const handR = namedPoint(body, 'keener-off-hand', -0.2, 0.45, 0.05);

  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, held: heldMotion });
  const cur = { ...REST };
  const m = new Matrix4();
  const q = new Quaternion();
  const q2 = new Quaternion();
  const pos = new Vector3();
  const scl = new Vector3(1, 1, 1);
  const XA = new Vector3(1, 0, 0);
  const ZA = new Vector3(0, 0, 1);
  const tipV = new Vector3();
  let age = -1;
  let yawNow = 0;
  let wails = 0;
  let lastX = null;
  let lastZ = 0;
  let lastYaw = 0;
  let vx = 0;
  let vz = 0;
  let yawRate = 0;
  let leanW = 1;

  const lab = {
    abilities: KEENER_ABILITIES,
    override: null,
    lastStrike: null,
    pose: () => ({ ...cur }),
    get hit() {
      return clip.state === 'rest' ? -1 : (wails - 1) % 3;
    },
    parts: { body, robe, neck, sleeves },
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

    // --- the wail: the lab's pure override, or the sim's
    if (lab.override) {
      const ab = KEENER_ABILITIES[lab.override.id] || KEENER_WAIL;
      const h = ab.at(lab.override.t);
      keenerWailPose(h.v, h.t, cur);
      watch.reset();
      clip.reset();
    } else {
      const beat = watch.update(P);
      clip.update({ beat, tel: watch.telegraph, now, tick, pick: () => WAILS[wails++ % 3], name: () => `wail:${((wails - 1) % 3) + 1}`, out: cur });
      lab.lastStrike = clip.lastStrike;
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
    leanW += ((clip.state === 'rest' && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 10);
    let lz = 0;
    let lx = 0;
    let leanP = 0;
    let leanR = 0;
    if (!lab.override && !turntable) {
      const sy = Math.sin(yawNow);
      const cy = Math.cos(yawNow);
      lz = clamp1((vx * sy + vz * cy) / GLIDE_SPEED);
      lx = clamp1((vx * cy - vz * sy) / GLIDE_SPEED);
      leanP = 0.08 * lz * leanW;
      leanR = (-0.08 * lx - 0.1 * clamp1((Math.max(0, lz) * yawRate) / 6)) * leanW;
    }

    // --- the body: the glide and its slow bob (pure in t), the lean
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const ph = id * 1.3;
    const bob = 0.04 * Math.sin(tt * 1.6 + ph);
    body.rotation.set(cur.pitch + leanP, cur.twist, cur.roll + leanR + 0.05 * Math.sin(tt * 1.1 + ph));
    body.scale.set(cur.flare, 1, cur.flare);
    spawn.position.y = GLIDE_Y;
    placeBody(body, PIVOT, cur.push, cur.lift + bob);
    // the robe's flare and the hem trailing the glide
    robe.rotation.set(-0.06 * lz * leanW, 0, 0);
    // the head: tipped by the pose, the hood thrown back (the hood is part
    // of the head's row: the whole head tips back for it)
    neck.rotation.set(cur.head - 0.3 * cur.hood + 0.05 * Math.sin(tt * 1.6 + ph), -0.3 * cur.twist, 0);
    neck.position.set(NECK_AT.x, NECK_AT.y + 0.02 * Math.max(0, cur.hood), NECK_AT.z - 0.05 * Math.max(0, cur.hood) + 0.03 * Math.max(0, -cur.hood));
    // the tell: the mouth swells and its glow peaks on the wail
    mouth.scale.set(0.8 + 0.5 * cur.mouth, 1.6 + 1.6 * cur.mouth, 0.4);
    glow.material.opacity = 0.22 + 0.6 * cur.mouth;
    glow.scale.setScalar(0.5 * (1 + 1.6 * cur.mouth));
    shadow.material.opacity = 0.42 - 0.06 * cur.mouth;
    // --- the sleeves: hung from the shoulders, swung by the pose, a sway
    // in grief at rest
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      const sx = i === 0 ? cur.lx : cur.rx;
      const sz = i === 0 ? cur.lz : cur.rz;
      pos.copy(SHOULDERS[i]);
      q.setFromAxisAngle(ZA, side * sz).multiply(q2.setFromAxisAngle(XA, sx + 0.12 * Math.sin(tt * 1.4 + ph + side) * leanW));
      m.compose(pos, q, scl);
      sleeves.setMatrixAt(i, m);
      tipV.set(0, -0.66, 0).applyQuaternion(q).add(pos);
      (i === 0 ? handL : handR).position.copy(tipV);
    }
    sleeves.instanceMatrix.needsUpdate = true;
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
    points: { mouth: mouthPt, hand: handL, offHand: handR },
    // §6.1 item 9: a tall gliding shroud: a soft squash, a full flinch, a
    // long knock (it has no feet to brace); the flinch bulges at the chest.
    react: { squash: 0.8, flinch: 1, knock: 1.2, axis: 'y', midY: 0.9 },
    death: { swell: 1.1, throw: 0.9 },
  };
}
