// HEART BLOOM, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level IV foes").
// The classic bloom of enemies/barrowheart.js (a crystal flower on a knot of
// vein-roots: five violet crystal petals closed round a beating core; it
// creeps on its roots, then drives them into the floor; opening, the petals
// splay and the core flares; the pulse snaps them shut) with the sample
// video's technique laid ON TOP of its chibi ink look. What it gains:
//
//   * faceted masses with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd, every tone in one white material's vertex colours): the
//     stem with its bark rings, the bulb the petals hinge from with a collar
//     of sepals, the petals in the crystal material (their glow driven), the
//     core and the root veins unlit and driven;
//   * WORLD-LOCKED ROOTS (render/facet/foelegs.js): seven roots from the
//     knot, each a two-bone root laid onto a tip pinned to the floor while it
//     carries weight, stepping along the real travel (the creep at the sim's
//     0.7 u/s, odd and even roots in turn), so the knot crawls on its roots
//     and no tip ever slides (rule 2); its base is the floor;
//   * TAKING ROOT (sim/enemies/bloom.js, mode 'rooted', `rootTick`): the
//     roots step out wide and the knot sinks onto them with a jolt;
//   * the PULSE on the sim's 54-tick ring telegraph (render/facet/
//     foestrike.js). The ring is the coil: the petals splay open, the core
//     flaring and the head rising. The strike takes the last 2.5 frames,
//     sampled on the shown sim tick, so the snap lands on the resolve tick
//     (confirmed by `pulseTick`): the petals slammed shut past closed, the
//     head squashed down, held 3 frames, then the snap back and the settle
//     (B5). Kesh's 3-hit flow (§6.1 B6): pulse 1 splays the petals twisted
//     to its left, pulse 2 to its right, pulse 3 the finisher: the full
//     bloom laid flat and the hardest snap;
//   * the HEARTBEAT on the body (the husks' shared clock): the petals breathe
//     and the core throbs on the swell, flare on the surge;
//   * the spawn-in grow (B7), named points (B8: the core, the crown, the
//     base), and the hit and death tuning.
//
// Faces +Z. Same contract as buildBloom (group, mats, setYaw, pose) plus
// lab, react, death, points. Render only: the sim, its timing and damage
// untouched.
import {
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three';
import { groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, wedgeGeometry } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, settle, spawnScale } from '../../facet/foe.js';
import { createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';
import { createLegs, segmentMatrix, solveKnee } from '../../facet/foelegs.js';
import { HEART } from '../style.js';
import { M, TINT, crystalMaterial, heartGlow, heartbeatK, qa, veinColor, veinMat } from './heartfoe.js';

// The sim's bloom (sim/enemies/bloom.js S): creeps 0.7 u/s, roots within
// 2.4 u or after 4 s; a 54-tick ring telegraph on every second heartbeat.
const TICK_HZ = 60;
const CREEP_SPEED = 0.7;
export const PULSE_TEL_SEC = 54 / TICK_HZ;
const SNAP = 3 / 30;
const SETTLE = 8 / 30;
const HEAD_Y = 0.42;
const KNOT_Y = 0.18;

// --- Key poses. open: the petals' splay (0 closed, 1 the classic's open,
// past either on a snap); rise: the head lifted (u); tilt: the head nosed
// forward (+ rad); twist (+ toward its left); sx / sy: the head's squash;
// core: the core's size; flare: the tell (0..1).
const REST = Object.freeze({ open: 0.08, rise: 0, tilt: 0, twist: 0, sx: 1, sy: 1, core: 1, flare: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Pulse 1, SPLAYED TO ITS LEFT: the petals open and twisted to its left,
// the head risen; snapped shut past closed, squashed down.
const C1 = K({ open: 1, rise: 0.05, tilt: -0.08, twist: 0.3, sx: 0.97, sy: 1.04, core: 1.45, flare: 0.85 });
const S1 = K({ open: -0.1, rise: -0.04, tilt: 0.15, twist: -0.1, sx: 1.16, sy: 0.88, core: 1.65, flare: 1 });
const O1 = K({ open: 0.25, rise: 0.01, tilt: 0.05, twist: -0.04, sx: 0.97, sy: 1.04, core: 1.2, flare: 0.55 });
// Pulse 2, TO ITS RIGHT: the mirror.
const C2 = K({ open: 1, rise: 0.05, tilt: -0.08, twist: -0.3, sx: 0.97, sy: 1.04, core: 1.45, flare: 0.85 });
const S2 = K({ open: -0.1, rise: -0.04, tilt: 0.15, twist: 0.1, sx: 1.16, sy: 0.88, core: 1.65, flare: 1 });
const O2 = K({ open: 0.25, rise: 0.01, tilt: 0.05, twist: 0.04, sx: 0.97, sy: 1.04, core: 1.2, flare: 0.55 });
// Pulse 3, THE FULL BLOOM (the biggest, §6.1 B6): laid flat open, risen
// highest; the hardest snap and the deepest squash.
const C3 = K({ open: 1.2, rise: 0.08, tilt: -0.04, sx: 0.95, sy: 1.06, core: 1.6, flare: 1 });
const S3 = K({ open: -0.15, rise: -0.06, tilt: 0.1, sx: 1.2, sy: 0.84, core: 1.85, flare: 1 });
const O3 = K({ open: 0.3, rise: 0.02, tilt: 0.03, sx: 0.96, sy: 1.05, core: 1.25, flare: 0.6 });
const PULSES = [
  { label: 'splayed to its left', coil: C1, strike: S1, over: O1 },
  { label: 'splayed to its right', coil: C2, strike: S2, over: O2 },
  { label: 'the full bloom', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));

const PULSE_TL = strikeTimeline('pulse', 'Pulse', {
  tel: PULSE_TEL_SEC,
  snap: SNAP,
  settle: SETTLE,
  rest: 0.3,
  labels: { coil: 'coil (the ring telegraph): the petals open, the core flares', strike: 'the snap', hold: 'contact: the petals shut', snap: 'snap back', settle: 'settle' },
});
const PULSE_CONTACT = PULSE_TL.startOf('hold');
export function bloomPulsePose(v, t, out = { ...REST }) {
  return strikePoseAt(PULSE_TL, PULSES[v] || PULSES[0], REST, FIELDS, t, out);
}
const withCues = (ab) => Object.freeze({ ...ab, cues: ab.strikes.flatMap((at) => [{ at: at - PULSE_CONTACT, id: 'open' }, { at, id: 'strike' }]) });
export const BLOOM_PULSE = withCues(strikeAbility({ id: 'pulse', label: 'Pulse', tl: PULSE_TL, variants: PULSES }));
export const BLOOM_PULSES_STRING = withCues(strikeAbility({ id: 'pulses', label: 'Pulse string', tl: PULSE_TL, variants: PULSES, n: 3, gap: PULSE_TL.duration }));
// Taking root: creeping, then the roots driven in with a jolt (3 frames)
// and the knot settling onto them (pure in t).
const ROOT_AT = 0.4;
const ROOT_TL = createTimeline('root', 'Take root', [
  { id: 'creep', label: 'creeping', dur: ROOT_AT },
  { id: 'drive', label: 'the roots driven in', dur: 3 * FRAME },
  { id: 'settle', label: 'the knot settles onto them', dur: 8 * FRAME },
  { id: 'rooted', label: 'rooted', dur: 0.5 },
], { cues: [{ at: ROOT_AT, id: 'root' }] });
// Pure: the root's drive (0..1 the jolt) and the sink (0..1) at t into it.
export function bloomRootAt(t) {
  const s = ROOT_TL.sample(t);
  if (s.id === 'creep') return { drive: 0, sink: 0 };
  if (s.id === 'drive') return { drive: ease.out(s.k), sink: ease.out(s.k) * 0.6 };
  if (s.id === 'settle') return { drive: 1 - (1 - settle(s.k)) * 1, sink: 0.6 + 0.4 * (1 - settle(s.k)) };
  return { drive: 0, sink: 1 };
}
export const BLOOM_ROOT = Object.freeze({
  id: 'root',
  label: 'Take root',
  duration: ROOT_TL.duration,
  sample: (t) => ROOT_TL.sample(t),
  readout: (t) => ROOT_TL.readout(t),
  cues: ROOT_TL.cues,
});
export const BLOOM_ABILITIES = Object.freeze({ pulse: BLOOM_PULSE, pulses: BLOOM_PULSES_STRING, root: BLOOM_ROOT });

// --- Geometry (built once for the session, shared by every bloom) ----------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const TWO_PI = Math.PI * 2;
const ROOTS = 7;
const PETALS = 5;
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  // The knot: the stem with its bark rings, the bulb, a collar of sepals.
  set.knot = bakeParts('bloom:knot', () => {
    const out = [
      { geo: fz(new CylinderGeometry(0.07, 0.13, 0.42, 6), 0.1, 1801), m: M(0, 0.21, 0), tint: TINT.flesh },
      { geo: fz(new TorusGeometry(0.1, 0.018, 4, 7), 0.08, 1803), m: M(0, 0.12, 0, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tint: TINT.fleshDark },
      { geo: fz(new TorusGeometry(0.085, 0.016, 4, 7), 0.08, 1805), m: M(0, 0.27, 0, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tint: TINT.fleshDark },
      { geo: fz(new IcosahedronGeometry(0.16, 0), 0.12, 1807), m: M(0, HEAD_Y, 0, 1, 0.7, 1), tint: TINT.flesh },
      { geo: fz(new IcosahedronGeometry(0.14, 0), 0.1, 1809), m: M(0, 0.05, 0, 1.2, 0.5, 1.2), tint: TINT.fleshDark }, // the knot itself
    ];
    const sepal = wedgeGeometry();
    for (let i = 0; i < PETALS; i++) {
      const a = (i / PETALS) * TWO_PI + Math.PI / PETALS;
      out.push({ geo: sepal, m: M(Math.sin(a) * 0.14, HEAD_Y + 0.02, Math.cos(a) * 0.14, 0.08, 0.12, 0.04, qa(0, 1, 0, a).multiply(qa(1, 0, 0, 0.9))), tint: TINT.fleshDark, tone: 1.1 });
    }
    return out;
  });
  // A petal (the crystal material; y 0..0.62 from its hinge), the core.
  set.petal = fz(new ConeGeometry(0.11, 0.62, 4).scale(1, 1, 0.45).translate(0, 0.31, 0), 0.12, 1811);
  set.core = fz(new IcosahedronGeometry(0.11, 1), 0.1, 1813);
  // A root bone (y 0..1), a root vein (unlit, y 0..1).
  set.root = fz(new CylinderGeometry(0.7, 1, 1, 5).translate(0, 0.5, 0), 0.1, 1815);
  set.vein = fz(new CylinderGeometry(1, 1, 1, 4).translate(0, 0.5, 0), 0, 1);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// The roots' homes: seven tips round the knot.
const HOMES = Array.from({ length: ROOTS }, (_, i) => {
  const a = (i / ROOTS) * TWO_PI + 0.3;
  const r = 0.55 + 0.1 * ((i * 37) % 3);
  return new Vector3(Math.sin(a + 0.25) * r, 0, Math.cos(a + 0.25) * r);
});
const BENDS = HOMES.map((h) => new Vector3(h.x, 0.9, h.z).normalize());
const ROOT_L = [0.36, 0.42];

export function buildBloomFacet() {
  const G = geos();
  const F = createFoeFrame('bloom');
  const { body, spawn, track } = F;
  const mat = track(foeMaterial('#FFFFFF'));
  const crystal = crystalMaterial(0.45);
  const core = veinMat(HEART.veinHot);
  const veins = veinMat();
  body.add(foePart(G.knot, mat, 'full', 'bloom-knot'));
  const head = foePart(G.core, core, false, 'bloom-core');
  head.position.set(0, HEAD_Y + 0.16, 0);
  body.add(head);
  const glow = heartGlow(1.0, 0.35);
  glow.name = 'bloom-core-glow';
  glow.position.set(0, HEAD_Y + 0.2, 0);
  body.add(glow);
  const petals = instancedPart(G.petal, crystal, PETALS, { name: 'bloom-petals', moving: true, inkPx: 1.8 });
  body.add(petals);
  const roots = instancedPart(G.root, mat, ROOTS * 2, { name: 'bloom-roots', moving: true, inkPx: 1.6 });
  for (let i = 0; i < ROOTS * 2; i++) roots.setColorAt(i, i % 2 ? TINT.fleshDark : TINT.flesh);
  const rootVeins = instancedPart(G.vein, veins, ROOTS, { name: 'bloom-root-veins', moving: true, ink: false });
  spawn.add(roots);
  spawn.add(rootVeins);
  const shadow = groundShadow(0.55, 0.6);
  F.group.add(shadow);

  // Named points (B8): the core, the crown, the base.
  const corePt = namedPoint(body, 'bloom-core-point', 0, HEAD_Y + 0.16, 0);
  const crown = namedPoint(body, 'bloom-crown', 0, HEAD_Y + 0.6, 0);
  const base = namedPoint(spawn, 'bloom-base', 0, 0, 0);

  const gait = createLegs({ homes: HOMES, groups: [[0, 2, 4, 6], [1, 3, 5]], trigger: 0.08, reach: 0.22, lift: 0.05, durMin: 0.12, durMax: 0.22 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, snapSec: SNAP, settleSec: SETTLE });
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const m = new Matrix4();
  const q = new Quaternion();
  const q2 = new Quaternion();
  const P0 = new Vector3();
  const P1 = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  const sc = new Vector3();
  let age = -1;
  let yawNow = 0;
  let pulses = 0;
  let lastPulse = null;
  let lastRoot = null;
  let rootAge = 9;
  let sink = 0;
  let open = REST.open;
  const gaitOpts = { locked: true, shift: null };

  const lab = {
    abilities: BLOOM_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => gait.feet().map((p, i) => ({ ...p, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y })),
    // the lowest root tip (the floor)
    base: () => Math.min(...gait.out.map((o) => o.y)),
    pose: () => ({ ...cur, sink, openNow: open }),
    get hit() {
      return clip.state === 'rest' ? -1 : (pulses - 1) % 3;
    },
    parts: { body, head, petals, roots, glow },
  };

  function livePulse(P, now, tick, e) {
    const beat = watch.update(P);
    let fired = false;
    if (e) {
      const pt = Number.isFinite(e.pulseTick) ? e.pulseTick : -1;
      if (lastPulse === null) lastPulse = pt;
      else if (pt !== lastPulse) {
        fired = pt >= 0;
        lastPulse = pt;
      }
    }
    clip.update({ beat, tel: watch.telegraph, now, tick, fired, pick: () => PULSES[pulses++ % 3], name: () => `pulse:${((pulses - 1) % 3) + 1}`, out: cur });
    lab.lastStrike = clip.lastStrike;
  }

  // the roots step out as it roots
  gaitOpts.shift = (i, o) => {
    o.x *= 1 + 0.18 * sink;
    o.z *= 1 + 0.18 * sink;
    return o;
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

    // --- the heartbeat (the room's clock on the interpolated tick)
    const hb = heartbeatK(Number.isFinite(P.tick) ? tick : tt * TICK_HZ);
    const swell = hb.swell;
    const surge = hb.surge;

    // --- the pulse and the root: the lab's pure override, or the sim's
    let drive = 0;
    let sinkT;
    if (lab.override) {
      if (lab.override.id === 'root') {
        Object.assign(cur, REST);
        const r = bloomRootAt(lab.override.t);
        drive = r.drive;
        sinkT = r.sink;
        sink = sinkT;
      } else {
        const ab = BLOOM_ABILITIES[lab.override.id] || BLOOM_PULSE;
        const h = ab.at(lab.override.t);
        bloomPulsePose(h.v, h.t, cur);
        sink = 1;
      }
      watch.reset();
      clip.reset();
    } else {
      livePulse(P, now, tick, e);
      if (e) {
        const rt = Number.isFinite(e.rootTick) ? e.rootTick : -1;
        if (lastRoot === null) lastRoot = rt;
        else if (rt !== lastRoot) {
          if (rt >= 0) rootAge = 0;
          lastRoot = rt;
        }
      }
      rootAge += dt;
      drive = rootAge < 0.35 ? Math.sin((rootAge / 0.35) * Math.PI) : 0;
      const rooted = e ? e.mode === 'rooted' : true;
      sink += ((rooted ? 1 : 0) - sink) * Math.min(1, dt * 6);
    }

    // --- roots: locked to the floor, stepping in two sets along the creep;
    // rooted, they step out wide and stay
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    gaitOpts.locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override);
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob;
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const creepK = Math.min(1, gait.speed / CREEP_SPEED) * (1 - sink);
    // the knot: sunk onto the roots when rooted, jolted down as they drive
    // in, bobbing with the creep
    const knotY = -0.05 * sink - 0.05 * drive + 0.03 * bob * (1 - sink);
    P0.set(0, KNOT_Y + knotY, 0);
    for (let i = 0; i < ROOTS; i++) {
      foot.copy(gait.out[i]);
      solveKnee(P0, foot, ROOT_L[0], ROOT_L[1], BENDS[i], knee);
      // the roots writhe as it creeps (the knee, never the tip)
      knee.y += 0.04 * Math.sin(tt * 5 + i * 1.7 + id) * creepK + 0.03 * drive;
      roots.setMatrixAt(i * 2, segmentMatrix(m, P0, knee, 0.045, 0.045, 0.01));
      roots.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, 0.03, 0.03, 0.01));
      P1.copy(P0).lerp(knee, 0.2).add(sc.set(0, 0.03, 0));
      sc.copy(knee).lerp(foot, 0.85);
      sc.y += 0.015;
      rootVeins.setMatrixAt(i, segmentMatrix(m, P1, sc, 0.012, 0.012, 0));
    }
    roots.instanceMatrix.needsUpdate = true;
    rootVeins.instanceMatrix.needsUpdate = true;
    base.position.y = 0;

    // --- the body: the knot's sink and bob, the creep's shuffle, the head's
    // rise, tilt, twist and squash (a legless form: its lean is the creep's
    // nod along the travel)
    body.position.set(0, knotY, 0);
    body.rotation.set(0.1 * creepK * Math.sin(tt * 5 + id) * 0.5 + cur.tilt, cur.twist, 0.08 * creepK * Math.sin(tt * 3 + id));
    const hs = 1 + 0.06 * swell;
    body.scale.set(cur.sx * hs, cur.sy * hs, cur.sx * hs);
    head.position.y = HEAD_Y + 0.16 + cur.rise;
    glow.position.y = HEAD_Y + 0.2 + cur.rise;

    // --- the petals: closed and breathing; splayed through the coil; slammed
    // shut on the pulse (they close faster than they opened)
    const want = cur.open;
    open = want > open ? open + (want - open) * Math.min(1, dt * 14) : open + (want - open) * Math.min(1, dt * 40);
    if (lab.override || dt <= 0) open = want;
    const breathe = 0.12 * swell * (1 - Math.max(0, cur.flare));
    for (let i = 0; i < PETALS; i++) {
      const a = (i / PETALS) * TWO_PI;
      const ang = Math.max(0.02, 0.2 + breathe + 0.04 * Math.sin(tt * 1.5 + i + id) + 1.15 * open);
      q.setFromAxisAngle(sc.set(0, 1, 0), a);
      q2.setFromAxisAngle(sc.set(1, 0, 0), ang);
      q.multiply(q2);
      P1.set(Math.sin(a) * 0.12, HEAD_Y + 0.05 + cur.rise, Math.cos(a) * 0.12);
      m.compose(P1, q, sc.set(1, 1, 1));
      petals.setMatrixAt(i, m);
    }
    petals.instanceMatrix.needsUpdate = true;
    crown.position.y = HEAD_Y + 0.05 + cur.rise + 0.62 * Math.cos(0.2 + 1.15 * open);

    // --- the core beats with the room's heart and flares through the opening
    const k = Math.min(1, 0.35 + 0.35 * swell + 0.3 * surge + 0.55 * Math.max(0, cur.flare));
    veinColor(core.color, k);
    veinColor(veins.color, Math.min(1, 0.3 + 0.4 * swell + 0.3 * Math.max(0, cur.flare)));
    head.scale.setScalar(cur.core * (1 + 0.25 * swell));
    crystal.emissiveIntensity = 0.45 + 0.35 * swell + 0.7 * Math.max(0, cur.flare);
    glow.material.opacity = 0.25 + 0.25 * swell + 0.5 * Math.max(0, cur.flare);
    glow.scale.setScalar(1.0 * (1 + 0.7 * Math.max(0, cur.flare)));
    shadow.material.opacity = 0.5;
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
    points: { core: corePt, crown, base },
    // §6.1 item 9: a rooted plant: a full squash, a light flinch, no knock
    // to speak of once rooted; the flinch bulges at the bulb.
    react: { squash: 1, flinch: 0.7, knock: 0.6, axis: 'y', midY: HEAD_Y },
    death: { swell: 1.1, throw: 0.5 },
  };
}
