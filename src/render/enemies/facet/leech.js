// MIRE LEECH, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level II foes").
// The classic leech of enemies/woodmill.js (a fat dark leech of six bodies
// with a pale belly and a stripe down its back, the round toothed sucker at
// the head, the indigo ring inside the maw its one tell) with the sample
// video's technique laid ON TOP of its chibi ink look. What it gains:
//
//   * a SEGMENTED body on one instanced row: six faceted rings, fattest in
//     the middle, each with its pale belly and the dorsal stripe baked in,
//     laid every frame along a spine. It CREEPS the way a leech does: a hump
//     runs from the tail to the head as fast as the body travels (rule 1,
//     legless form: the wave is driven by the real travel measured in the
//     floor frame, so a still leech only breathes and a backward slide
//     runs the hump the other way), the head swinging with the sim's weave;
//   * the head's SUCKER in baked detail: a pale lip ring, bone teeth raked
//     in round a dark maw, the indigo ring inside it (unlit); slit charcoal
//     eyes on the head;
//   * the LEAP on the sim's 42-tick lane telegraph (sim/enemies/leech.js:
//     then 'leap' at 11 u/s down the lane). The telegraph is the coil: the
//     front three rings reared high, the body bunched back, the sucker
//     gaping. The strike takes the last 2.5 frames of it, sampled on the
//     shown sim tick, so its contact lands on the release frame: thrown out
//     straight and stretched, the sucker wide and leading. The contact holds
//     while the sim's mode is 'leap'. Repeat leaps rear and cock to its
//     left, to its right, then the finisher: reared highest and stretched
//     longest (§6.1 B6);
//   * LATCHED: stood up against its host's flank, the sucker pressed in, and
//     on every drain (the sim's drain clock) a GULP that swells down the body
//     from the head to the tail;
//   * FLOPPED (thrown off, or a leap that met nobody): rolled on its side,
//     writhing, until it rights itself and creeps again;
//   * the spawn-in grow (B7), named points (B8: the sucker, the tail), and
//     the hit and death tuning.
//
// Faces +Z. Same contract as buildLeech (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing untouched.
import { BoxGeometry, Color, CylinderGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { TELL_INDIGO } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry } from '../../facet/kit.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, spawnScale } from '../../facet/foe.js';
import { createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';

// The sim's leech (sim/enemies/leech.js S): creeps 2 u/s; a 42-tick lane
// telegraph, then a leap at 11 u/s down a lane of 3.2 u at most; latched up
// to 150 ticks, a drain every 30; flopped 45 ticks.
const TICK_HZ = 60;
const CREEP_SPEED = 2.0;
export const LEAP_TEL_SEC = 42 / TICK_HZ;
const LEAP_SEC = 3.2 / 11;
const DRAIN_SEC = 30 / TICK_HZ;
const FLOP_SEC = 45 / TICK_HZ;
// A gulp: the swell runs from the head to the tail in this long.
const GULP_SEC = 0.4;

// The classic's hides (enemies/woodmill.js C.leech, leechBelly, leechStripe).
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const HIDE_C = slate(0.26, 0.17).lerp(new Color(PALETTE.sageCloak), 0.3);
const BELLY_C = slate(0.2, 0.36).lerp(new Color(PALETTE.sageCloak), 0.25);
const STRIPE_C = slate(0.3, 0.3);
const LIP_C = BELLY_C;

// --- Key poses. push (u, +z), rear (u, the front lifted), pitch (the
// sucker's face down +), bunch (0..1 the body drawn up behind), stretch (the
// body's length, 1 at rest), gape (the sucker open), cock (u, the front
// swung aside, + to its left).
const REST = Object.freeze({ push: 0, rear: 0, pitch: 0, bunch: 0, stretch: 1, gape: 0, cock: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Leap 1, REARED TO ITS LEFT: the front reared and swung out to its left,
// the body bunched behind; thrown out straight, the sucker leading.
const C1 = K({ push: -0.08, rear: 0.24, pitch: -0.5, bunch: 1, stretch: 0.85, gape: 0.6, cock: 0.12 });
const S1 = K({ push: 0.2, rear: 0.04, pitch: 0.15, bunch: 0, stretch: 1.25, gape: 1, cock: -0.04 });
const O1 = K({ push: 0.1, rear: 0.03, pitch: 0, stretch: 1.05, gape: 0.4, cock: -0.06 });
// Leap 2, REARED TO ITS RIGHT: the mirror.
const C2 = K({ push: -0.08, rear: 0.24, pitch: -0.5, bunch: 1, stretch: 0.85, gape: 0.6, cock: -0.12 });
const S2 = K({ push: 0.2, rear: 0.04, pitch: 0.15, bunch: 0, stretch: 1.25, gape: 1, cock: 0.04 });
const O2 = K({ push: 0.1, rear: 0.03, pitch: 0, stretch: 1.05, gape: 0.4, cock: 0.06 });
// Leap 3, THE HIGH LEAP (the biggest, §6.1 B6): reared highest, coiled
// tightest; stretched longest.
const C3 = K({ push: -0.1, rear: 0.3, pitch: -0.7, bunch: 1.2, stretch: 0.78, gape: 0.8 });
const S3 = K({ push: 0.26, rear: 0.05, pitch: 0.2, bunch: 0, stretch: 1.32, gape: 1.2 });
const O3 = K({ push: 0.12, rear: 0.04, pitch: 0, stretch: 1.06, gape: 0.45 });
const LEAPS = [
  { label: 'reared to its left', coil: C1, strike: S1, over: O1 },
  { label: 'reared to its right', coil: C2, strike: S2, over: O2 },
  { label: 'the high leap', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));
export const LEECH_REST = REST;
export const LEECH_LEAPS = Object.freeze(LEAPS);
// Latched: stood up against the host, the sucker pressed in.
const LATCH = K({ push: 0.06, rear: 0.24, pitch: 0.5, bunch: 0.4, stretch: 0.9, gape: 0.5 });

const LEAP_TL = strikeTimeline('leap', 'Leap', {
  tel: LEAP_TEL_SEC,
  hold: LEAP_SEC,
  rest: 0.25,
  labels: { coil: 'rear (the lane telegraph)', strike: 'the leap', hold: 'down the lane, the sucker leading', snap: 'snap back', settle: 'settle' },
});
export function leechLeapPose(v, t, out = { ...REST }) {
  return strikePoseAt(LEAP_TL, LEAPS[v] || LEAPS[0], REST, FIELDS, t, out);
}
const classicLeap = (tt, s) => ({ telegraphK: s.id === 'coil' || s.id === 'strike' ? 1 : 0, lungeK: 0, fireK: 0, e: { mode: s.id === 'hold' ? 'leap' : 'creep' } });
export const LEECH_LEAP = strikeAbility({ id: 'leap', label: 'Leap', tl: LEAP_TL, variants: LEAPS, classic: classicLeap });
export const LEECH_LEAPS_STRING = strikeAbility({ id: 'leaps', label: 'Leap string', tl: LEAP_TL, variants: LEAPS, n: 3, gap: LEAP_TL.duration, classic: classicLeap });
// Latched: three drains (a gulp each), pure in t.
export const LEECH_LATCHED = Object.freeze({
  id: 'latched',
  label: 'Latched (drains)',
  duration: DRAIN_SEC * 3 + 0.3,
  at: (t) => ({ v: 0, k: 0, t, phase: 'latched', label: `latched: drain ${Math.min(3, Math.floor(t / DRAIN_SEC) + 1)}, a gulp down the body` }),
  strikes: [0, 1, 2].map((i) => i * DRAIN_SEC + 0.02),
  cues: [0, 1, 2].map((i) => ({ at: i * DRAIN_SEC + 0.02, id: 'drain' })),
  classicAt: (t) => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { mode: 'latched', nextDrainTick: Math.floor(t / DRAIN_SEC) } }),
});
// Flopped: one writhe loop (pure in t).
export const LEECH_FLOP = Object.freeze({
  id: 'flop',
  label: 'Flopped',
  duration: FLOP_SEC * 2,
  at: (t) => ({ v: 0, k: 0, t, phase: 'flop', label: 'flopped: on its side, writhing' }),
  strikes: [],
  classicAt: () => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { mode: 'flop' } }),
});
export const LEECH_ABILITIES = Object.freeze({ leap: LEECH_LEAP, leaps: LEECH_LEAPS_STRING, latched: LEECH_LATCHED, flop: LEECH_FLOP });

// --- Geometry (built once for the session, shared by every leech) ----------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
const N = 6;
// each ring's girth (fattest in the middle, the classic's), the gap between
const SEG_K = Array.from({ length: N }, (_, i) => 0.62 + 0.38 * Math.sin(((N - 1 - i + 0.5) / N) * Math.PI) + (i === 0 ? -0.12 : 0));
const SEG_R = 0.15;
const SEG_GAP = 0.16;
const BODY_Y = 0.13;
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  // A ring (unit radius along +z): the dark faceted barrel, its pale belly,
  // the stripe down its back.
  set.seg = bakeParts('leech:seg', () => [
    { geo: fz(new SphereGeometry(1, 8, 6), 0.12, 1001), m: M(0, 0, 0, 1.05, 0.72, 0.95) },
    { geo: fz(new SphereGeometry(0.85, 8, 3, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4), 0.08, 1003), m: M(0, -0.12, 0, 1.15, 0.6, 0.95), tone: 2.0 },
    { geo: fz(new BoxGeometry(0.2, 0.12, 0.9), 0.06, 1005), m: M(0, 0.68, 0), tone: 1.75 },
  ]);
  // The sucker (at the head's front, facing +z): the pale lip, the teeth
  // raked in, the dark maw.
  set.sucker = bakeParts('leech:sucker', () => {
    const out = [
      { geo: fz(new TorusGeometry(0.085, 0.035, 5, 10), 0.1, 1011), m: M(0, 0, 0) },
      { geo: fz(new CylinderGeometry(0.06, 0.06, 0.02, 10), 0, 1), m: M(0, 0, -0.008, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tone: 0.15 },
    ];
    const tooth = wedgeGeometry();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dir = new Vector3(-Math.cos(a), -Math.sin(a), 0.4).normalize();
      out.push({ geo: tooth, m: new Matrix4().compose(new Vector3(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0.01), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir), new Vector3(0.04, 0.045, 0.03)), tone: 1.5 });
    }
    return out;
  });
  // The tell: the indigo ring inside the maw (unlit).
  set.ring = fz(new TorusGeometry(0.05, 0.012, 4, 12), 0, 1);
  // The eyes: slit bars over the sucker (unlit charcoal), in the head ring's
  // frame (its radius scaled out).
  set.eyes = bakeParts('leech:eyes', () => {
    const bar = fz(new BoxGeometry(0.045, 0.015, 0.015), 0, 1);
    return [-1, 1].map((s) => ({ geo: bar, m: M(s * 0.055, 0.075, 0.07, 1, 1, 1, qa(0, 0, 1, s * 0.4)) }));
  });
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildLeechFacet() {
  const G = geos();
  const F = createFoeFrame('leech');
  const { body, track } = F;
  const hideMat = track(foeMaterial(HIDE_C));
  const lipMat = track(foeMaterial(LIP_C));
  const tellMat = new MeshBasicMaterial({ color: exactColor(TELL_INDIGO), toneMapped: false });
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  void STRIPE_C;
  const segs = instancedPart(G.seg, hideMat, N, { name: 'leech-body', moving: true, inkPx: 2.4 });
  const sucker = foePart(G.sucker, lipMat, 'part', 'leech-sucker');
  sucker.matrixAutoUpdate = false;
  const ring = new Mesh(G.ring, tellMat);
  ring.name = 'leech-tell';
  ring.matrixAutoUpdate = false;
  const eyes = new Mesh(G.eyes, eyeMat);
  eyes.name = 'leech-eyes';
  eyes.matrixAutoUpdate = false;
  body.add(segs);
  body.add(sucker);
  body.add(ring);
  body.add(eyes);
  const shadow = groundShadow(0.3, 0.7, { deep: 2.1, forward: 0 });
  F.group.add(shadow);

  // Named points (B8): the sucker (the bite, the drain), the tail.
  const mouthPt = namedPoint(body, 'leech-mouth', 0, BODY_Y, 0.42);
  const tailPt = namedPoint(body, 'leech-tail', 0, BODY_Y, -0.45);

  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, maxHold: 1.0 });
  const cur = { ...REST };
  const P = Array.from({ length: N + 1 }, () => new Vector3());
  const m = new Matrix4();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const C = new Vector3();
  const UP = new Vector3(0, 1, 0);
  let age = -1;
  let yawNow = 0;
  let leaps = 0;
  let latch = 0;
  let flop = 0;
  let crawl = 0;
  let lastX = null;
  let lastZ = 0;
  let fwdV = 0;
  let sideV = 0;
  let lastDrain = null;
  let gulpAge = 9;

  const lab = {
    abilities: LEECH_ABILITIES,
    override: null,
    lastStrike: null,
    pose: () => ({ ...cur }),
    get hit() {
      return clip.state === 'rest' ? -1 : (leaps - 1) % 3;
    },
    get gulp() {
      return gulpAge;
    },
    parts: { body, segs, sucker, ring },
  };

  function liveLeap(Pin, now, tick, e) {
    const beat = watch.update(Pin);
    clip.update({
      beat,
      tel: watch.telegraph,
      now,
      tick,
      holding: !!(e && e.mode === 'leap'),
      pick: () => LEAPS[leaps++ % 3],
      name: () => `leap:${((leaps - 1) % 3) + 1}`,
      out: cur,
    });
    lab.lastStrike = clip.lastStrike;
  }

  function pose(Pin) {
    const dt = clock.step(Pin);
    const now = clock.now;
    const tt = Pin.t ?? 0;
    const e = Pin.e || null;
    const tick = Number.isFinite(Pin.tick) && !Pin.turntable ? clock.tick : (Pin.tick ?? 0);
    const turntable = !!Pin.turntable;
    if (age < 0) age = turntable || Pin.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    F.spawn.scale.setScalar(spawnScale(age));

    // --- the leap (the clip), the latch and the flop (eased layers on top)
    let ft = tt; // the flop's and the latch's own clock (the lab's scrub)
    if (lab.override) {
      const ab = LEECH_ABILITIES[lab.override.id] || LEECH_LEAP;
      const h = ab.at(lab.override.t);
      Object.assign(cur, REST);
      latch = flop = 0;
      gulpAge = 9;
      if (ab === LEECH_LATCHED) {
        latch = 1;
        ft = h.t;
        gulpAge = h.t - Math.floor(h.t / DRAIN_SEC) * DRAIN_SEC;
      } else if (ab === LEECH_FLOP) {
        flop = 1;
        ft = h.t;
      } else leechLeapPose(h.v, h.t, cur);
      watch.reset();
      clip.reset();
    } else {
      liveLeap(Pin, now, tick, e);
      const mode = e ? e.mode : 'creep';
      if (turntable) latch = flop = 0;
      else {
        latch += ((mode === 'latched' ? 1 : 0) - latch) * (1 - Math.exp(-14 * dt));
        flop += ((mode === 'flop' ? 1 : 0) - flop) * (1 - Math.exp(-12 * dt));
      }
      // a gulp on every drain: the sim's drain clock moves on
      const nd = e && Number.isFinite(e.nextDrainTick) ? e.nextDrainTick : -1;
      if (lastDrain === null) lastDrain = nd;
      else if (nd !== lastDrain) {
        if (mode === 'latched' && nd > 0 && lastDrain > 0) gulpAge = 0;
        lastDrain = nd;
      }
      gulpAge += dt;
    }
    // the latch's stand-up over the pose
    if (latch > 0) for (const f of FIELDS) cur[f] += (LATCH[f] - cur[f]) * latch;

    // --- the travel (floor frame, into the leech's own): it drives the creep
    const gx = F.group.position.x;
    const gz = F.group.position.z;
    if (lastX === null) {
      lastX = gx;
      lastZ = gz;
    }
    if (dt > 0) {
      let ix = (gx - lastX) / dt;
      let iz = (gz - lastZ) / dt;
      if (ix * ix + iz * iz > 400) ix = iz = 0;
      const sy = Math.sin(yawNow);
      const cy = Math.cos(yawNow);
      const a = 1 - Math.exp(-10 * dt);
      fwdV += (ix * sy + iz * cy - fwdV) * a;
      sideV += (ix * cy - iz * sy - sideV) * a;
    }
    lastX = gx;
    lastZ = gz;
    const free = lab.override || turntable || clip.state !== 'rest' ? 0 : 1 - Math.max(latch, flop);
    const speed = Math.hypot(fwdV, sideV) * free;
    // the hump runs tail to head as fast as the body creeps (backward: the
    // other way)
    crawl += dt * speed * 7 * (fwdV < -0.05 ? -1 : 1);
    const fwd = free ? clamp1(fwdV / CREEP_SPEED) : 0;
    const side = free ? clamp1(sideV / CREEP_SPEED) : 0;
    const hump = 0.07 * Math.min(1, speed / CREEP_SPEED);

    // --- the body node: rolled onto its side flopped, a slight pitch into
    // its travel
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const roll = flop * (1.2 + 0.2 * Math.sin(ft * 6 + id)) * (id % 2 ? 1 : -1);
    body.position.set(0, 0.04 * flop, 0);
    body.rotation.set(0.05 * fwd, 0, roll);
    body.updateMatrix();
    shadow.visible = latch < 0.5;

    // --- the spine, head (0) to tail (N): the creep's hump, the pose's rear
    // (the front rings lifted in a curve), the bunch, the writhe
    const breath = Math.sin(tt * 2 + id);
    const gap = SEG_GAP * cur.stretch * (1 - 0.2 * cur.bunch);
    const writhe = flop * Math.sin(ft * 8 + id);
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const front = Math.max(0, 1 - i / 3.2);
      const lift = cur.rear * front * front + hump * Math.max(0, Math.sin(crawl + i * 1.1)) + cur.bunch * 0.06 * Math.sin(u * Math.PI) * (u > 0.35 ? 1 : 0);
      const lat = cur.cock * front + writhe * 0.3 * (u - 0.45) * (u - 0.45) * 2.6 - side * 0.06 * u + 0.025 * Math.sin(crawl * 0.5 - i * 0.8) * free;
      P[i].set(lat, BODY_Y + lift + 0.006 * breath, 0.4 + cur.push * (1 - 0.5 * u) - i * gap);
    }
    for (let i = 0; i < N; i++) {
      Z.subVectors(P[i], P[i + 1]).normalize();
      X.crossVectors(UP, Z).normalize();
      Y.crossVectors(Z, X);
      C.addVectors(P[i], P[i + 1]).multiplyScalar(0.5);
      // the gulp: a swell that runs from the head ring to the tail
      const g = gulpAge < GULP_SEC ? Math.max(0, 1 - Math.abs(i - (gulpAge / GULP_SEC) * N) / 1.5) * Math.sin(Math.PI * (gulpAge / GULP_SEC)) : 0;
      const r = SEG_R * SEG_K[i] * (1 + 0.22 * g);
      setTRS(m, C, X, Y, Z, r, r, SEG_R * (gap / SEG_GAP) * 0.95);
      segs.setMatrixAt(i, m);
      if (i === 0) {
        setTRS(eyes.matrix, C, X, Y, Z, 1, 1, 1);
        eyes.matrixWorldNeedsUpdate = true;
      }
    }
    segs.instanceMatrix.needsUpdate = true;
    // the sucker at the head's front, its face pitched by the pose, opened
    // by the gape and pulsing on a gulp
    Z.subVectors(P[0], P[1]).normalize();
    X.crossVectors(UP, Z).normalize();
    Z.applyAxisAngle(X, cur.pitch);
    Y.crossVectors(Z, X);
    C.copy(P[0]).addScaledVector(Z, SEG_R * SEG_K[0] * 0.85);
    const gulp0 = gulpAge < 0.3 ? Math.sin((gulpAge / 0.3) * Math.PI) : 0;
    const s = 0.8 + 0.25 * cur.gape + 0.15 * gulp0;
    setTRS(sucker.matrix, C, X, Y, Z, s, s, 1);
    sucker.matrixWorldNeedsUpdate = true;
    C.addScaledVector(Z, 0.012);
    setTRS(ring.matrix, C, X, Y, Z, s, s, 1);
    ring.matrixWorldNeedsUpdate = true;
    mouthPt.position.copy(C);
    tailPt.position.copy(P[N]);
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
    points: { mouth: mouthPt, tail: tailPt },
    // §6.1 item 9: a soft fat body squashes deep along its height.
    react: { squash: 1.15, flinch: 0.9, knock: 1, axis: 'y', midY: BODY_Y },
    death: { swell: 1.1, throw: 1 },
  };
}
