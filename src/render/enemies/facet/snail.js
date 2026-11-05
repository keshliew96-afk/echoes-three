// LANTERN SNAIL, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level II
// foes"). The classic snail of enemies/archetypes.js (a long low foot, a
// coiled shell standing across its back, the indigo lantern bulb on its
// stalk: the one tell and the mend's read) with the sample video's technique
// laid ON TOP of its chibi ink look. What it gains:
//
//   * faceted masses: the foot, the mantle and the head cut into planes;
//   * detail BAKED per kind (render/facet/foe.js), one draw call each for the
//     crowd: the shell is a real coil, one faceted seven-sided tube swept
//     three and a half turns and narrowing to the apex, banded light and dark
//     at every step (its growth lines); the foot carries a darker sole rim, a
//     mantle collar under the shell, and two short eye stalks with charcoal
//     slit eyes (never round, never warm);
//   * the CREEP as a slug moves, from its real travel (rule 1 of the
//     self-check, legless form): the foot stretches out along the travel and
//     draws up after it, a muscle wave the length of the sole, the head end
//     leading when it advances and the tail end leading when it backs off
//     (it keeps 3.5 u from the party facing them), the body leaning into the
//     travel and the shell rocking against it; the sole never leaves the
//     floor;
//   * the MEND on the sim's own clock (sim/enemies/snail.js: the lantern
//     swells for the 30 ticks before every mend, e.mendStartTick, and the
//     mend lands on e.mendTick). The swell is the coil: the body draws back
//     and rears, the shell rocks back, the stalk lifts upright and the bulb
//     and its glow swell; the cast takes the last 2.5 frames, so its contact
//     (the stalk thrust out, the bulb flaring, the body squashed down on its
//     sole) lands on the mend tick, the pulse ring leaving it; held 3 frames,
//     then the stalk snaps back and the body settles with one overshoot.
//     Repeat mends cycle the lantern raised to its left, to its right, then
//     the big one, a rear-up (§6.1 B6). The mend is not stun-gated in the
//     sim, so neither is the cast (a death still folds it back);
//   * the spawn-in grow (B7), named points (B8: the bulb, the head), and the
//     hit and death tuning the shared envelope reads (§6.1 items 9, 10).
//
// Faces +Z. Same contract as buildSnail (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing and its heals
// untouched.
import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, RingGeometry, SphereGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { makeGlowSprite } from '../../glow.js';
import { markShared, sharedGeo } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { ease } from '../../facet/timeline.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, placeBody, spawnScale } from '../../facet/foe.js';
import { createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';

// The sim's snail (sim/enemies/snail.js S): 0.6 u/s; the lantern swells for
// 30 ticks before each mend; the mend reaches 3.2 u.
const TICK_HZ = 60;
const CREEP_SPEED = 0.6;
export const MEND_WIND_SEC = 30 / TICK_HZ;
const MEND_RADIUS = 3.2;
// The pulse ring's sweep out to the mend's reach (the classic's 0.6 s).
const PULSE_SEC = 0.6;

// --- Key poses. push: the body's shove along +z (u); lift (u); pitch: front
// down (+); roll: about the long axis (+ toward its right, -x); sx / sy / sz:
// the body's squash; shell: the shell's rock (+ forward over the head);
// stalk: the lantern stalk's tip (+ forward, - up and back); sway: the stalk
// swung aside (+ toward its left); bulb: the bulb's swell; glow: the
// lantern's glow (0..1 above its idle); crane: the head lifted (rad, +
// up).
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, sx: 1, sy: 1, sz: 1, shell: 0, stalk: 0, sway: 0, bulb: 0, glow: 0, crane: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Mend 1, THE LANTERN TO ITS LEFT: it draws back onto its tail, the stalk
// lifted upright and leaned to its left; it casts out across to its right.
const C1 = K({ push: -0.04, pitch: -0.1, roll: -0.05, sy: 1.06, sz: 0.95, shell: -0.14, stalk: -0.45, sway: 0.35, bulb: 0.5, glow: 0.55, crane: 0.18 });
const S1 = K({ push: 0.06, pitch: 0.08, roll: 0.04, sx: 1.14, sy: 0.9, sz: 1.04, shell: 0.1, stalk: -0.05, sway: -0.25, bulb: 0.95, glow: 1, crane: -0.06 });
const O1 = K({ push: 0.03, pitch: -0.03, sx: 0.97, sy: 1.04, shell: -0.05, stalk: -0.22, sway: 0.08, bulb: 0.25, glow: 0.3, crane: 0.04 });
// Mend 2, TO ITS RIGHT: the mirror.
const C2 = K({ ...C1, roll: 0.05, sway: -0.35 });
const S2 = K({ ...S1, roll: -0.04, sway: 0.25 });
const O2 = K({ ...O1, sway: -0.08 });
// Mend 3, THE REAR-UP (the biggest, §6.1 B6): it rears highest, the shell
// rocked far back, then slams down on its sole with the stalk thrown out.
const C3 = K({ push: -0.07, lift: 0.02, pitch: -0.32, sy: 1.12, sz: 0.9, shell: -0.28, stalk: -0.6, bulb: 0.7, glow: 0.8, crane: 0.38 });
const S3 = K({ push: 0.08, pitch: 0.14, sx: 1.2, sy: 0.86, sz: 1.06, shell: 0.16, stalk: 0, bulb: 1.2, glow: 1.25, crane: -0.12 });
const O3 = K({ push: 0.04, pitch: -0.06, sx: 0.95, sy: 1.06, shell: -0.08, stalk: -0.2, bulb: 0.3, glow: 0.35, crane: 0.06 });
const MENDS = [
  { label: 'the lantern to its left', coil: C1, strike: S1, over: O1 },
  { label: 'the lantern to its right', coil: C2, strike: S2, over: O2 },
  { label: 'rear-up', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));
export const SNAIL_REST = REST;
export const SNAIL_MENDS = Object.freeze(MENDS);

const MEND_TL = strikeTimeline('mend', 'Mend', {
  tel: MEND_WIND_SEC,
  rest: 0.4,
  labels: { coil: 'the lantern swells (30 ticks)', strike: 'cast', hold: 'the mend pulse leaves', snap: 'stalk snaps back', settle: 'settle' },
});
const PULSE_AT = MEND_TL.startOf('hold');
export function snailMendPose(v, t, out = { ...REST }) {
  return strikePoseAt(MEND_TL, MENDS[v] || MENDS[0], REST, FIELDS, t, out);
}
const classicMend = (tt, s) => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { mendStartTick: s.id === 'coil' || s.id === 'strike' ? 1 : -1, mendTick: tt >= PULSE_AT ? 2 : -1 } });
export const SNAIL_MEND = strikeAbility({ id: 'mend', label: 'Mend', tl: MEND_TL, variants: MENDS, classic: classicMend });
export const SNAIL_MEND_STRING = strikeAbility({ id: 'mends', label: 'Mend string', tl: MEND_TL, variants: MENDS, n: 3, gap: MEND_TL.duration - 0.25, classic: classicMend });
export const SNAIL_ABILITIES = Object.freeze({ mend: SNAIL_MEND, mends: SNAIL_MEND_STRING });

// --- Geometry (built once for the session, shared by every snail) ----------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qx = (a) => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), a);
// The shell's coil: centred over the foot, its plane across the back (axis
// z, the classic's), the outer whorl at the bottom resting on the mantle.
const SHELL_C = new Vector3(0, 0.43, -0.1);
const coilAt = (th) => {
  const r = 0.25 * Math.exp(-0.2 * th);
  return { x: r * Math.sin(th + 0.2), y: -r * Math.cos(th + 0.2), tube: 0.135 * Math.exp(-0.2 * th) };
};
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  // The foot, the mantle collar, the neck and head, the feelers, the eye
  // stalks: one hide (value steps in the vertex colours).
  set.body = bakeParts('snail:body', () => {
    const out = [];
    out.push({ geo: fz(new SphereGeometry(0.3, 10, 6), 0.1, 501), m: M(0, 0.1, 0.05, 0.85, 0.32, 1.7) });
    out.push({ geo: fz(new SphereGeometry(0.2, 8, 5), 0.12, 503), m: M(0, 0.2, -0.08, 1.1, 0.5, 1.25), tone: 0.86 });
    out.push({ geo: fz(new SphereGeometry(0.13, 7, 5), 0.1, 505), m: M(0, 0.17, 0.36, 1, 0.85, 1.2), tone: 1.04 });
    // the sole: a flat darker rim round the foot's edge
    out.push({ geo: fz(new SphereGeometry(0.3, 10, 3, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), 0.08, 507), m: M(0, 0.06, 0.05, 0.88, 0.2, 1.73), tone: 0.74 });
    return out;
  });
  set.head = bakeParts('snail:head', () => {
    const out = [];
    out.push({ geo: fz(new SphereGeometry(0.15, 8, 6), 0.1, 511), m: M(0, 0, 0, 1, 0.9, 1.1), tone: 1.06 });
    // the eye stalks, up and a little out
    const stalk = fz(new CylinderGeometry(0.014, 0.022, 0.15, 5).translate(0, 0.075, 0), 0.08, 515);
    for (const s of [-1, 1]) out.push({ geo: stalk, m: new Matrix4().compose(new Vector3(s * 0.06, 0.09, 0.04), new Quaternion().setFromAxisAngle(new Vector3(0.3, 0, s * -1).normalize(), 0.45), new Vector3(1, 1, 1)), tone: 1.02 });
    return out;
  });
  // The shell's coil: one swept tube narrowing to the apex (seven sides,
  // faceted), each whorl step banded light and dark (its growth lines),
  // closed at the apex.
  set.shell = sharedGeo('facet:snail-coil', () => {
    const N = 28;
    const SIDES = 7;
    const T = 3.3 * Math.PI;
    const pos = [];
    const ring = [];
    const C = new Vector3();
    const Tn = new Vector3();
    const Nn = new Vector3();
    const Bn = new Vector3(0, 0, 1);
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * T;
      const p = coilAt(th);
      const q = coilAt(th + 0.01);
      C.set(p.x, p.y, 0).add(SHELL_C);
      Tn.set(q.x - p.x, q.y - p.y, 0).normalize();
      Nn.crossVectors(Bn, Tn).normalize();
      const r = i === N ? 0.002 : p.tube;
      const pts = [];
      for (let j = 0; j < SIDES; j++) {
        const a = (j / SIDES) * Math.PI * 2;
        // the whorls sit a little flattened across the coil's plane
        pts.push(C.clone().addScaledVector(Nn, Math.cos(a) * r).addScaledVector(Bn, Math.sin(a) * r * 0.92));
      }
      ring.push(pts);
    }
    const tones = [];
    for (let i = 0; i < N; i++) {
      const tone = i % 2 ? 0.9 : 1.08;
      for (let j = 0; j < SIDES; j++) {
        const a = ring[i][j];
        const b = ring[i][(j + 1) % SIDES];
        const c = ring[i + 1][j];
        const d = ring[i + 1][(j + 1) % SIDES];
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, b.x, b.y, b.z, d.x, d.y, d.z, c.x, c.y, c.z);
        for (let v = 0; v < 6; v++) tones.push(tone);
      }
    }
    // the aperture's floor (closed: no inside to see)
    const c0 = ring[0].reduce((acc, v) => acc.add(v), new Vector3()).multiplyScalar(1 / SIDES);
    for (let j = 0; j < SIDES; j++) {
      const a = ring[0][j];
      const b = ring[0][(j + 1) % SIDES];
      pos.push(c0.x, c0.y, c0.z, b.x, b.y, b.z, a.x, a.y, a.z);
      for (let v = 0; v < 3; v++) tones.push(0.7);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    const f = facetize(g, { jitter: 0.12, seed: 521 });
    const col = f.attributes.color;
    for (let i = 0; i < col.count; i++) col.setXYZ(i, col.getX(i) * tones[i], col.getY(i) * tones[i], col.getZ(i) * tones[i]);
    f.userData.faceted = true;
    return f;
  });
  // The lantern stalk (its own pivot) and the bulb: the one tell.
  set.stalk = fz(new CylinderGeometry(0.022, 0.032, 0.32, 5).translate(0, 0.16, 0), 0.08, 541);
  set.bulb = fz(new IcosahedronGeometry(0.07, 1), 0.06, 543);
  // Slit eyes on the eye stalks' tips (unlit charcoal).
  set.eyes = bakeParts('snail:eyes', () => {
    const out = [];
    const bar = fz(new CylinderGeometry(0.02, 0.02, 0.05, 4), 0, 1);
    for (const s of [-1, 1]) out.push({ geo: bar, m: new Matrix4().compose(new Vector3(s * 0.098, 0.22, 0.09), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2 + s * 0.4), new Vector3(1, 1, 0.6)) });
    return out;
  });
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

const PIVOT = new Vector3(0, 0.12, 0.05);
const HEAD_AT = new Vector3(0, 0.2, 0.5);
const STALK_AT = new Vector3(0, 0.08, 0.05); // in the head
const STALK_LEAN = 0.35; // the classic's forward lean at rest
const BULB_UP = 0.33;
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildSnailFacet() {
  const G = geos();
  const F = createFoeFrame('snail');
  const { body, spawn, track } = F;
  const hideMat = track(foeMaterial(HIDE.snailBody));
  const shellMat = track(foeMaterial(HIDE.snailShell));
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const bulbMat = new MeshBasicMaterial({ color: TELL_INDIGO, vertexColors: true, toneMapped: false });

  body.add(foePart(G.body, hideMat, 'full', 'snail-foot'));
  const shell = new Group();
  shell.name = 'snail-shell';
  shell.position.set(0, 0.24, -0.1);
  body.add(shell);
  // the shell's parts were laid about its centre in body space: shift them
  // under the rocking pivot (the mantle's top)
  const shellMesh = foePart(G.shell, shellMat, 'full', 'snail-coil');
  shellMesh.position.set(0, -0.24, 0.1);
  shell.add(shellMesh);
  const head = new Group();
  head.name = 'snail-head';
  head.position.copy(HEAD_AT);
  body.add(head);
  head.add(foePart(G.head, hideMat, 'full', 'snail-head'));
  head.add(foePart(G.eyes, eyeMat, false, 'snail-eyes'));
  const stalk = new Group();
  stalk.name = 'snail-stalk';
  stalk.position.copy(STALK_AT);
  head.add(stalk);
  stalk.add(foePart(G.stalk, hideMat, false, 'snail-stalk'));
  const bulb = foePart(G.bulb, bulbMat, false, 'snail-bulb');
  bulb.position.y = BULB_UP;
  stalk.add(bulb);
  const lantern = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.6, opacity: 0.35 });
  lantern.material.toneMapped = false;
  lantern.material.color.copy(TELL_INDIGO_GLOW);
  lantern.position.y = BULB_UP;
  stalk.add(lantern);
  // On the floor (the group): the mend's pulse ring and the contact shadow.
  const pulse = new Mesh(
    sharedGeo('facet:snail-pulse', () => new RingGeometry(0.92, 1.0, 40)),
    new MeshBasicMaterial({ color: TELL_INDIGO, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
  );
  pulse.name = 'snail-mend-floor-ring';
  pulse.rotation.x = -Math.PI / 2;
  pulse.position.y = 0.02;
  pulse.visible = false;
  F.group.add(pulse);
  F.group.add(groundShadow(0.5, 0.86, { forward: 0.05, wide: 1.0, deep: 1.5 }));

  // Named points (B8): the bulb (the cast's tip), the head (the mouth).
  const tipPt = namedPoint(bulb, 'snail-tip', 0, 0, 0);
  const mouth = namedPoint(head, 'snail-mouth', 0, -0.03, 0.15);

  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS });
  const cur = { ...REST };
  // the mend's wind-up as a telegraph (the sim keeps none: its lantern swell
  // runs from mendStartTick to the mend), on a stand-in the watch reads; the
  // mend is not stun-gated, so the stand-in carries no status
  const tel = { startTick: 0, resolveTick: 0, attack: 'mend' };
  const fakeE = { telegraph: null, state: 'active', hp: 1 };
  let lastMend = null;
  let mends = 0;
  let age = -1;
  let yawNow = 0;
  let lastX = null;
  let lastZ = 0;
  let vx = 0;
  let vz = 0;
  let odo = 0;
  let creep = 0;

  const lab = {
    abilities: SNAIL_ABILITIES,
    override: null,
    lastStrike: null,
    pose: () => ({ ...cur }),
    get hit() {
      return clip.state === 'rest' ? -1 : mends % 3;
    },
    parts: { body, shell, head, stalk, bulb },
  };

  function liveMend(now, tick, e) {
    let fired = false;
    if (e) {
      fakeE.state = e.state || 'active';
      fakeE.hp = e.hp;
      if (Number.isFinite(e.mendStartTick) && e.mendStartTick >= 0) {
        tel.startTick = e.mendStartTick;
        tel.resolveTick = Number.isFinite(e.nextMendTick) && e.nextMendTick > e.mendStartTick ? e.nextMendTick : e.mendStartTick + 30;
        fakeE.telegraph = tel;
      } else fakeE.telegraph = null;
      const mt = Number.isFinite(e.mendTick) ? e.mendTick : -1;
      if (lastMend === null) lastMend = mt;
      else if (mt !== lastMend) {
        fired = mt >= 0;
        lastMend = mt;
      }
    } else fakeE.telegraph = null;
    const beat = watch.update({ e: fakeE, tick });
    clip.update({
      beat,
      tel: watch.telegraph,
      now,
      tick,
      fired,
      pick: () => MENDS[mends++ % 3],
      name: () => `mend:${((mends - 1) % 3) + 1}`,
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

    // --- the mend: the lab's pure override, or the live lantern
    let pulseAge = null;
    if (lab.override) {
      const ab = SNAIL_ABILITIES[lab.override.id] || SNAIL_MEND;
      const h = ab.at(lab.override.t);
      snailMendPose(h.v, h.t, cur);
      pulseAge = h.t >= PULSE_AT ? h.t - PULSE_AT : null;
      watch.reset();
      clip.reset();
    } else {
      liveMend(now, tick, e);
      pulseAge = clip.sinceContact;
    }

    // --- the creep, from the real travel in the floor frame
    const gx = F.group.position.x;
    const gz = F.group.position.z;
    if (lastX === null) {
      lastX = gx;
      lastZ = gz;
    }
    if (dt > 0) {
      let ix = (gx - lastX) / dt;
      let iz = (gz - lastZ) / dt;
      if (ix * ix + iz * iz > 25) ix = iz = 0; // a jump, not travel
      const a = 1 - Math.exp(-10 * dt);
      vx += (ix - vx) * a;
      vz += (iz - vz) * a;
    }
    lastX = gx;
    lastZ = gz;
    const sy0 = Math.sin(yawNow);
    const cy0 = Math.cos(yawNow);
    const lz = lab.override || turntable ? 0 : vx * sy0 + vz * cy0;
    const lx = lab.override || turntable ? 0 : vx * cy0 - vz * sy0;
    const speed = Math.hypot(lx, lz);
    creep += (Math.min(1, speed / CREEP_SPEED) - creep) * Math.min(1, dt * 8);
    odo += speed * dt;
    // the muscle wave: the foot stretches out along the travel and draws up
    // after it (one stretch per 0.3 u), the leading end first
    const wave = Math.sin((odo / 0.3) * Math.PI * 2);
    const stretch = 0.09 * creep * (0.5 + 0.5 * wave);
    const fwd = clamp1(lz / CREEP_SPEED);
    const lead = speed > 1e-3 ? lz / speed : 1;

    // --- the body: the mend's pose, the creep, the lean, a slow breath
    const breath = Math.sin(tt * 1.6);
    body.rotation.set(cur.pitch + 0.06 * fwd, 0, cur.roll - 0.05 * clamp1(lx / CREEP_SPEED));
    body.scale.set(cur.sx * (1 - 0.3 * stretch), cur.sy * (1 + 0.01 * breath) * (1 - 0.25 * stretch), cur.sz * (1 + stretch));
    placeBody(body, PIVOT, cur.push + 0.5 * stretch * 0.6 * lead, cur.lift);
    shell.rotation.set(cur.shell - 0.09 * fwd * creep + 0.015 * breath, 0, 0.04 * Math.sin(tt * 0.9));
    head.rotation.set(-cur.crane + 0.04 * Math.sin(tt * 1.3), 0.06 * Math.sin(tt * 0.7), 0);
    stalk.rotation.set(STALK_LEAN + cur.stalk + 0.05 * Math.sin(tt * 2.1), 0, cur.sway);
    bulb.scale.setScalar(1 + 0.6 * cur.bulb + 0.08 * Math.sin(tt * 3));
    lantern.material.opacity = 0.3 + 0.3 * cur.glow + 0.05 * Math.sin(tt * 3);
    lantern.scale.setScalar(0.6 * (1 + 0.5 * cur.glow));

    // --- the pulse ring: sweeps out to the mend's reach from the contact
    if (pulseAge !== null && pulseAge < PULSE_SEC) {
      const k = pulseAge / PULSE_SEC;
      const r = 0.6 + (MEND_RADIUS - 0.6) * ease.out(k);
      pulse.visible = true;
      pulse.scale.set(r, r, 1);
      pulse.material.opacity = 0.7 * (1 - k);
    } else {
      pulse.visible = false;
      pulse.scale.set(1, 1, 1);
      pulse.material.opacity = 0;
    }
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
    points: { tip: tipPt, hand: tipPt, mouth },
    // §6.1 item 9: a heavy legless body squashes along its height and
    // barely travels on a knock; the flinch bulges at the shell.
    react: { squash: 1, flinch: 0.8, knock: 0.7, axis: 'y', midY: 0.32 },
    // §6.1 item 10: a heavy shell swells a little more and is thrown less.
    death: { swell: 1.1, throw: 0.7 },
  };
}

