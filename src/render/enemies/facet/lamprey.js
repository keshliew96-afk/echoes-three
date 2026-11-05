// BOG LAMPREY, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level II foes").
// The classic lamprey of enemies/slice2.js (a long low eel of five bodies,
// the round pale toothed mouth, the indigo gill dots its one tell, a ripple
// while it lurks under) with the sample video's technique laid ON TOP of its
// chibi ink look. What it gains:
//
//   * a SEGMENTED body on one instanced row: six faceted rings tapering to
//     the tail, each with its dorsal fin ridge baked in, laid every frame
//     along a spine that swims: the S-wave runs down the body as fast as the
//     eel travels (rule 1, legless form: the undulation is driven by the real
//     travel measured in the floor frame, so a glide sideways or backward
//     swims that way and a still eel only breathes);
//   * the head with its ORAL DISC baked in detail: a pale lip ring, a ring of
//     bone teeth raked inward round a dark throat; it gapes on the rise and
//     wide on the lunge; three indigo gill pores a side behind the head;
//   * the sim's LURK (burrowed, untargetable): it sinks under the floor and
//     only the ripple shows (a floor piece), surfacing as the sim breaks it
//     out;
//   * the LUNGE on the sim's 48-tick lane telegraph (sim/enemies/lamprey.js:
//     'rise', then 'lunge' at 10 u/s down the lane). The rise is the coil:
//     the body drawn back into an S, the head reared and cocked, the disc
//     gaping. The strike takes the last 2.5 frames of it, sampled on the
//     shown sim tick, so its contact lands on the release frame: the body
//     thrown out straight and stretched, the head low and leading, the disc
//     wide. The contact holds while the sim's mode is 'lunge'; then it snaps
//     back and settles (B5). Repeat lunges coil to its left, to its right,
//     then the finisher: reared highest, coiled deepest, stretched longest
//     (B6);
//   * BEACHED (the sim's 110-tick punish window): rolled onto its side, the
//     body thrashing in arcs, the head lifting to gasp, until it slides back
//     under;
//   * the spawn-in grow (B7), named points (B8: the mouth, the gills, the
//     tail), and the hit and death tuning.
//
// Faces +Z. Same contract as buildLamprey (group, mats, setYaw, pose) plus
// lab, react, death, points. Render only: the sim, its timing untouched.
import { Color, CylinderGeometry, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, RingGeometry, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { TELL_INDIGO } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry } from '../../facet/kit.js';
import { ease } from '../../facet/timeline.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, spawnScale } from '../../facet/foe.js';
import { createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';

// The sim's lamprey (sim/enemies/lamprey.js S): glides 1.6 u/s under; a
// 48-tick lane telegraph, then a lunge at 10 u/s down a lane of 5 u at most;
// beached 110 ticks.
const TICK_HZ = 60;
const GLIDE_SPEED = 1.6;
export const LUNGE_TEL_SEC = 48 / TICK_HZ;
const LUNGE_SEC = 5 / 10;
const BEACH_SEC = 110 / TICK_HZ;
// The sink under the floor while it lurks (the classic's 0.45 u).
const SINK_Y = 0.45;

// The classic's hides (enemies/slice2.js C.eel, C.eelBelly).
const EEL = new Color().setHSL(0.6, 0.28, 0.24).lerp(new Color(PALETTE.sageCloak), 0.25);
const BELLY = new Color(PALETTE.bone).multiplyScalar(0.62);

// --- Key poses. push (u, +z: the head thrown forward), rear (u, the head
// lifted), pitch (the head's nose down +), coil (the body drawn back into an
// S, + bends its first curve to its left), drawn (0..1 the body bunched
// back), stretch (the body's length, 1 at rest), gape (the disc open), cock
// (rad, the head turned, + to its left).
const REST = Object.freeze({ push: 0, rear: 0, pitch: 0, coil: 0, drawn: 0, stretch: 1, gape: 0, cock: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Lunge 1, COILED TO ITS LEFT: the body bunched into an S whose first curve
// bows to its left, the head reared and cocked back across; thrown straight
// out down the lane.
const C1 = K({ push: -0.08, rear: 0.1, pitch: -0.3, coil: 1, drawn: 1, stretch: 0.86, gape: 0.6, cock: -0.3 });
const S1 = K({ push: 0.22, rear: 0.02, pitch: 0.1, coil: -0.15, drawn: 0, stretch: 1.22, gape: 1, cock: 0.1 });
const O1 = K({ push: 0.12, rear: 0.04, pitch: 0, coil: -0.3, stretch: 1.06, gape: 0.4, cock: 0.12 });
// Lunge 2, COILED TO ITS RIGHT: the mirror.
const C2 = K({ push: -0.08, rear: 0.1, pitch: -0.3, coil: -1, drawn: 1, stretch: 0.86, gape: 0.6, cock: 0.3 });
const S2 = K({ push: 0.22, rear: 0.02, pitch: 0.1, coil: 0.15, drawn: 0, stretch: 1.22, gape: 1, cock: -0.1 });
const O2 = K({ push: 0.12, rear: 0.04, pitch: 0, coil: 0.3, stretch: 1.06, gape: 0.4, cock: -0.12 });
// Lunge 3, THE STRIKE FROM ON HIGH (the biggest, §6.1 B6): reared highest
// and coiled deepest; it lunges longest and lowest.
const C3 = K({ push: -0.1, rear: 0.13, pitch: -0.45, coil: 1.3, drawn: 1, stretch: 0.8, gape: 0.8 });
const S3 = K({ push: 0.28, rear: 0, pitch: 0.18, coil: 0, drawn: 0, stretch: 1.3, gape: 1.2 });
const O3 = K({ push: 0.14, rear: 0.05, pitch: -0.04, coil: -0.35, stretch: 1.08, gape: 0.45 });
const LUNGES = [
  { label: 'coiled to its left', coil: C1, strike: S1, over: O1 },
  { label: 'coiled to its right', coil: C2, strike: S2, over: O2 },
  { label: 'the strike from on high', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));
export const LAMPREY_REST = REST;
export const LAMPREY_LUNGES = Object.freeze(LUNGES);

// The lunge's own motion while it holds: a fast tail beat drives it.
function heldMotion(V, age, out) {
  out.coil += 0.18 * Math.sin(age * 28);
}
const LUNGE_TL = strikeTimeline('lunge', 'Lunge', {
  tel: LUNGE_TEL_SEC,
  hold: LUNGE_SEC,
  settle: 9 / 30,
  rest: 0.25,
  labels: { coil: 'rise (the lane telegraph): breaks the surface, coils', strike: 'the lunge', hold: 'down the lane, the disc wide', snap: 'snap back', settle: 'settle' },
});
// the lab's surfacing at the start of a rise, pure in t
const RISE_SEC = 8 / 30;
export function lampreyLungePose(v, t, out = { ...REST }) {
  return strikePoseAt(LUNGE_TL, LUNGES[v] || LUNGES[0], REST, FIELDS, t, out, heldMotion);
}
const classicLunge = (tt, s) => ({ telegraphK: s.id === 'coil' || s.id === 'strike' ? 1 : 0, lungeK: 0, fireK: 0, e: { burrowed: tt < 0.05, mode: s.id === 'hold' ? 'lunge' : 'rise' } });
export const LAMPREY_LUNGE = strikeAbility({ id: 'lunge', label: 'Lunge', tl: LUNGE_TL, variants: LUNGES, classic: classicLunge });
export const LAMPREY_LUNGES_STRING = strikeAbility({ id: 'lunges', label: 'Lunge string', tl: LUNGE_TL, variants: LUNGES, n: 3, gap: LUNGE_TL.duration, classic: classicLunge });
// Beached: the sim's punish window, one flop loop (pure in t).
export const LAMPREY_BEACHED = Object.freeze({
  id: 'beached',
  label: 'Beached',
  duration: BEACH_SEC,
  at: (t) => ({ v: 0, k: 0, t, phase: 'beached', label: 'beached: on its side, thrashing' }),
  strikes: [],
  classicAt: () => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { mode: 'beached' } }),
});
export const LAMPREY_ABILITIES = Object.freeze({ lunge: LAMPREY_LUNGE, lunges: LAMPREY_LUNGES_STRING, beached: LAMPREY_BEACHED });

// --- Geometry (built once for the session, shared by every lamprey) --------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
// The body: six rings; their radii, the gap between them at rest.
const N = 6;
const SEG_R = [0.15, 0.145, 0.13, 0.11, 0.085, 0.06];
const SEG_GAP = 0.2;
const BODY_Y = 0.15;
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  // A body ring (unit radius, along +z): a faceted barrel, its belly a pale
  // step, the dorsal fin ridge along its back.
  set.seg = bakeParts('lamprey:seg', () => [
    { geo: fz(new SphereGeometry(1, 8, 6), 0.12, 901), m: M(0, 0, 0, 1, 0.85, 1.25) },
    { geo: fz(new SphereGeometry(0.9, 8, 3, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), 0.08, 903), m: M(0, -0.05, 0, 1.02, 0.85, 1.2), tone: 1.9 },
    { geo: wedgeGeometry(), m: M(0, 0.75, 0, 0.9, 0.55, 1.4, qa(0, 1, 0, Math.PI / 2)), tone: 0.7 },
  ]);
  // The oral disc (at the head's front, facing +z, about its centre): the
  // pale lip ring, the teeth raked in, the dark throat.
  set.mouth = bakeParts('lamprey:mouth', () => {
    const out = [
      { geo: fz(new TorusGeometry(0.1, 0.04, 5, 10), 0.1, 911), m: M(0, 0, 0) },
      { geo: fz(new CylinderGeometry(0.072, 0.072, 0.02, 10), 0, 1), m: M(0, 0, -0.01, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tone: 0.18 },
    ];
    const tooth = wedgeGeometry();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const dir = new Vector3(-Math.cos(a), -Math.sin(a), 0.35).normalize();
      out.push({ geo: tooth, m: new Matrix4().compose(new Vector3(Math.cos(a) * 0.085, Math.sin(a) * 0.085, 0.01), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir), new Vector3(0.05, 0.05, 0.04)), tone: 1.45 });
    }
    return out;
  });
  // The gill pores: three a side (unlit indigo), in the second ring's frame.
  set.gills = bakeParts('lamprey:gills', () => {
    const dot = fz(new IcosahedronGeometry(0.024, 0), 0, 1);
    const out = [];
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) out.push({ geo: dot, m: M(s * 0.125, 0.04, 0.07 - i * 0.065) });
    return out;
  });
  // The lurk's ripple on the floor.
  set.ripple = new RingGeometry(0.4, 0.48, 28).rotateX(-Math.PI / 2);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildLampreyFacet() {
  const G = geos();
  const F = createFoeFrame('lamprey');
  const { body, spawn, track } = F;
  const eelMat = track(foeMaterial(EEL));
  const lipMat = track(foeMaterial(BELLY));
  const gillMat = new MeshBasicMaterial({ color: exactColor(TELL_INDIGO), toneMapped: false });
  const segs = instancedPart(G.seg, eelMat, N, { name: 'lamprey-body', moving: true, inkPx: 2.4 });
  const mouth = foePart(G.mouth, lipMat, 'part', 'lamprey-mouth');
  mouth.matrixAutoUpdate = false;
  const gills = new Mesh(G.gills, gillMat);
  gills.name = 'lamprey-gills';
  gills.matrixAutoUpdate = false;
  body.add(segs);
  body.add(mouth);
  body.add(gills);
  // the floor pieces: the lurk's ripple and the contact shadow
  const rippleMat = new MeshBasicMaterial({ color: new Color(PALETTE.bone).multiplyScalar(0.8), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const ripple = new Mesh(G.ripple, rippleMat);
  ripple.name = 'lamprey-floor-ripple';
  ripple.position.y = 0.02;
  F.group.add(ripple);
  const shadow = groundShadow(0.34, 0.7, { deep: 1.8 });
  F.group.add(shadow);
  void spawn;

  // Named points (B8): the mouth, the gills, the tail.
  const mouthPt = namedPoint(body, 'lamprey-mouth-point', 0, BODY_Y, 0.4);
  const gillPt = namedPoint(body, 'lamprey-gill-point', 0, BODY_Y + 0.05, 0.1);
  const tailPt = namedPoint(body, 'lamprey-tail', 0, BODY_Y, -1.0);

  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, held: heldMotion, maxHold: 1.2, settleSec: 9 / 30 });
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
  let lunges = 0;
  let sink = 0;
  let sinkInit = false;
  let flop = 0;
  let swim = 0; // the S-wave's phase, advanced by the real travel
  let lastX = null;
  let lastZ = 0;
  let fwdV = 0;
  let sideV = 0;

  const lab = {
    abilities: LAMPREY_ABILITIES,
    override: null,
    lastStrike: null,
    pose: () => ({ ...cur }),
    get hit() {
      return clip.state === 'rest' ? -1 : (lunges - 1) % 3;
    },
    get sink() {
      return sink;
    },
    parts: { body, segs, mouth, gills, ripple },
  };

  function liveLunge(Pin, now, tick, e) {
    const beat = watch.update(Pin);
    clip.update({
      beat,
      tel: watch.telegraph,
      now,
      tick,
      holding: !!(e && e.mode === 'lunge'),
      pick: () => LUNGES[lunges++ % 3],
      name: () => `lunge:${((lunges - 1) % 3) + 1}`,
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

    // --- the lunge, the beach and the lurk: the lab's pure override, or the
    // sim's mode
    let wantSink = 0;
    let wantFlop = 0;
    let ft = tt; // the beach's own clock (the lab's scrub in its loop)
    if (lab.override) {
      const ab = LAMPREY_ABILITIES[lab.override.id] || LAMPREY_LUNGE;
      const h = ab.at(lab.override.t);
      if (ab === LAMPREY_BEACHED) {
        Object.assign(cur, REST);
        flop = 1;
        ft = h.t;
      } else {
        lampreyLungePose(h.v, h.t, cur);
        flop = 0;
      }
      // a lab lunge surfaces from under the floor at its start
      sink = ab === LAMPREY_BEACHED ? 0 : h.k === 0 ? 1 - ease.out(Math.min(1, h.t / RISE_SEC)) : 0;
      watch.reset();
      clip.reset();
    } else {
      liveLunge(Pin, now, tick, e);
      wantSink = e && e.burrowed ? 1 : 0;
      wantFlop = e && e.mode === 'beached' ? 1 : 0;
      if (!sinkInit) {
        sink = wantSink;
        sinkInit = true;
      }
      sink += (wantSink - sink) * (1 - Math.exp(-9 * dt));
      flop += (wantFlop - flop) * (1 - Math.exp(-8 * dt));
      if (turntable) sink = flop = 0;
    }

    // --- the travel (floor frame, into the eel's own): it drives the swim
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
    const speed = Math.hypot(fwdV, sideV);
    // the wave runs down the body as fast as the body travels (a lunge
    // beats hard), so the swim matches the glide
    swim += dt * (speed * 9 + (clip.state === 'held' ? 20 : 0)) * (fwdV < -0.05 ? -1 : 1);
    const fwd = lab.override || turntable ? 0 : clamp1(fwdV / GLIDE_SPEED);
    const side = lab.override || turntable ? 0 : clamp1(sideV / GLIDE_SPEED);
    const amp = 0.03 + 0.06 * Math.min(1, speed / GLIDE_SPEED);

    // --- the body node: sunk while it lurks; rolled onto its side beached;
    // a slight pitch into its travel
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const roll = flop * (1.1 + 0.25 * Math.sin(ft * 7 + id));
    body.position.set(0, -SINK_Y * sink + 0.05 * flop, 0);
    body.rotation.set(0.06 * fwd, 0, roll * (id % 2 ? 1 : -1));
    body.visible = sink < 0.97;
    body.updateMatrix();
    shadow.visible = sink < 0.5;
    const ph = (tt * 1.6) % 1;
    ripple.scale.setScalar(0.7 + 0.6 * ph);
    rippleMat.opacity = sink * 0.45 * (1 - ph);

    // --- the spine: from the head back; the pose's coil, the swim's wave,
    // the beach's thrash; the head reared and pushed
    const breath = Math.sin(tt * 1.9 + id);
    const thrash = flop * Math.sin(ft * 9 + id);
    const gap = SEG_GAP * cur.stretch * (1 - 0.18 * cur.drawn);
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const decay = Math.pow(0.42, i);
      const sCurve = cur.coil * 0.16 * Math.sin(u * Math.PI * 1.6 + 0.3) * (1 - 0.3 * u);
      const wave = amp * Math.sin(swim - i * 1.1) * (0.3 + u);
      const arc = thrash * 0.32 * (u - 0.35) * (u - 0.35) * 2.4 - flop * 0.05;
      const sideLean = -side * 0.08 * u;
      P[i].set(sCurve + wave + arc + sideLean + cur.cock * 0.05 * decay, BODY_Y + cur.rear * decay + 0.008 * breath * (1 - u) + flop * 0.12 * Math.max(0, Math.sin(ft * 4 + id)) * decay, 0.2 + cur.push * (1 - 0.6 * u) - i * gap);
    }
    // each ring between its two spine points, rolled level
    for (let i = 0; i < N; i++) {
      Z.subVectors(P[i], P[i + 1]).normalize();
      X.crossVectors(UP, Z).normalize();
      Y.crossVectors(Z, X);
      C.addVectors(P[i], P[i + 1]).multiplyScalar(0.5);
      const r = SEG_R[i];
      setTRS(m, C, X, Y, Z, r, r, r * (gap / SEG_GAP) * 0.92);
      segs.setMatrixAt(i, m);
      if (i === 1) {
        setTRS(gills.matrix, C, X, Y, Z, 1, 1, 1);
        gills.matrixWorldNeedsUpdate = true;
      }
    }
    segs.instanceMatrix.needsUpdate = true;
    // the oral disc at the head's front, along the head, the nose dipped by
    // the pose, the disc opened by the gape (and the beach's gasp)
    Z.subVectors(P[0], P[1]).normalize();
    Z.applyAxisAngle(X.crossVectors(UP, Z).normalize(), cur.pitch);
    Z.applyAxisAngle(UP, cur.cock);
    X.crossVectors(UP, Z).normalize();
    Y.crossVectors(Z, X);
    C.copy(P[0]).addScaledVector(Z, SEG_R[0] * 1.15);
    const g = 1 + 0.45 * Math.max(0, cur.gape + flop * (0.3 + 0.3 * Math.sin(ft * 4 + id)));
    setTRS(mouth.matrix, C, X, Y, Z, g, g, 1);
    mouth.matrixWorldNeedsUpdate = true;
    mouthPt.position.copy(C).addScaledVector(Z, 0.03);
    gillPt.position.copy(P[1]);
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
    points: { mouth: mouthPt, gills: gillPt, tail: tailPt },
    // §6.1 item 9: a long low eel squashes along its height and flinches
    // along its length.
    react: { squash: 1, flinch: 0.9, knock: 0.9, axis: 'y', midY: BODY_Y },
    death: { swell: 1, throw: 0.9 },
  };
}
