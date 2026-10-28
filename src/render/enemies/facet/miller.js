// DROWNED MILLER, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level II
// foes"). The classic miller of enemies/woodmill.js (a tall plodding man in a
// hanging smock with an apron, a flour sack on his back, a cap, the indigo
// eyes in dark sockets his one tell, a small millstone swung on a chain from
// his right hand) with the sample video's technique laid ON TOP of its chibi
// ink look. What it gains:
//
//   * faceted masses with BAKED detail (render/facet/foe.js, one draw call for
//     the crowd, every tone in one white material's vertex colours): the
//     smock cut into planes with its torn hem strips, a rope belt, the apron
//     with its pocket, two patches, the sack on his back tied at the neck;
//     the head with its slack jaw, nose and ears under the cap;
//   * WORLD-LOCKED FEET (render/facet/foelegs.js): two long legs in his
//     trousers laid by two-bone IK onto booted feet pinned to the floor while
//     they carry weight, stepping along the real travel (a heavy plod at the
//     sim's 1.1 u/s), the hips bobbing on each step and the body leaning into
//     the travel (rule 1); a crouch bends the knees over the planted feet;
//   * the ARMS laid by IK from the shoulders to the hands (rule 3: the hands
//     go where the swing needs them, the torso twists and the hips sink to
//     drive it), the CHAIN of seven links hung taut from the right hand to
//     the MILLSTONE (its hole and its grooved face cut in), rolling as it
//     flies;
//   * the FLAIL SWEEP on the sim's 60-tick ring telegraph (sim/enemies/
//     miller.js, mode 'whirl'). The ring is the coil: the feet planted, the
//     stone spun up round the raised hand, accelerating, the body wound
//     against the spin. The strike takes the last 2.5 frames, sampled on the
//     shown sim tick, so the stone's sweep lands on the resolve tick: held 3
//     frames, then the stone swings on round and comes back to hang (B5).
//     Kesh's 3-hit flow (§6.1 B6): sweep 1 is a flat whirl swept across to
//     his right, sweep 2 the reverse, low, swept across to his left, sweep 3
//     the finisher: the stone hauled up behind him and slammed down over the
//     top into the floor in front, the hips sunk and the body thrown into it;
//   * the SACK TOSS (unwarned, sim tossTick): one frame into the throw
//     (§6.1 B1) from wherever he stands, the left arm thrown through, the
//     torso turned into it; held, then the follow-through. Repeat tosses go
//     overarm, side-arm, then a heave over the head;
//   * the spawn-in grow (B7), named points (B8: the stone, the right hand,
//     the left hand, the mouth), and the hit and death tuning.
//
// Faces +Z. Same contract as buildMiller (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing untouched.
import { BoxGeometry, Color, CylinderGeometry, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { HIDE, TELL_INDIGO } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry } from '../../facet/kit.js';
import { ease } from '../../facet/timeline.js';
import { kick } from '../../facet/beats.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, namedPoint, spawnScale } from '../../facet/foe.js';
import { HOLD_SEC, STRIKE_SEC, createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';

// The sim's miller (sim/enemies/miller.js S): plods 1.1 u/s; the sweep's
// ring telegraph is 60 ticks; the sack toss is unwarned.
const TICK_HZ = 60;
const PLOD_SPEED = 1.1;
export const SWEEP_TEL_SEC = 60 / TICK_HZ;
const SNAP = 3 / 30;
const SETTLE = 9 / 30;
const TWO_PI = Math.PI * 2;

// The classic's hides (enemies/woodmill.js C).
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const SMOCK = slate(0.22, 0.26).lerp(new Color(PALETTE.warmGrey), 0.2);
const SMOCK_DARK = slate(0.3, 0.14);
const SKIN = slate(0.12, 0.6).lerp(new Color(PALETTE.bone), 0.3);
const CAP = slate(0.3, 0.2);
const SACK = new Color(PALETTE.bone).lerp(new Color(PALETTE.signalBlue), 0.12).multiplyScalar(0.8);
const STONE = HIDE.ramBody.clone().multiplyScalar(0.95);
const CHAIN = slate(0.18, 0.35);
const CHARCOAL = new Color(PALETTE.voidCharcoal);
const INDIGO = new Color(TELL_INDIGO);

// --- The sweep's key poses (yaw space, u and rad). hx / hy / hz: the right
// hand; el: the chain's elevation from the hand (-pi/2 hangs, 0 level, past
// pi/2 behind and over); orbit: the hand's small circle with the stone;
// push, crouch (the hips sunk), pitch (the torso forward +), twist (the torso
// turned, + to its left), roll. The stone's azimuth round him runs on its
// own track (sweepAz): it spins through whole turns.
const REST = Object.freeze({ hx: -0.33, hy: 0.72, hz: 0.06, el: -1.45, orbit: 0, push: 0, crouch: 0, pitch: 0, twist: 0, roll: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// the stone hangs at his right side
const REST_AZ = -1.43;
// Sweep 1, THE FLAT WHIRL: spun up level round the raised hand, wound to
// his left; swept across the front to his right.
const W1 = { dir: -1, turns: 2, coilAz: 1.0, sweep: 2.2 };
const C1 = K({ hx: -0.05, hy: 1.5, hz: 0.05, el: -0.15, orbit: 1, push: -0.03, crouch: 0.06, pitch: -0.06, twist: 0.25 });
const S1 = K({ hx: -0.3, hy: 1.2, hz: 0.25, el: -0.05, orbit: 0.3, push: 0.06, crouch: 0.1, pitch: 0.12, twist: -0.4 });
const O1 = K({ hx: -0.3, hy: 1.0, hz: 0.15, el: -0.6, crouch: 0.05, pitch: 0.06, twist: -0.3 });
// Sweep 2, THE REVERSE, LOW: spun the other way at hip height, wound to his
// right; swept across the front to his left.
const W2 = { dir: 1, turns: 2, coilAz: -2.4, sweep: 3.0 };
const C2 = K({ hx: -0.15, hy: 1.15, hz: 0.1, el: -0.35, orbit: 1, crouch: 0.1, pitch: 0.05, twist: -0.3 });
const S2 = K({ hx: 0.05, hy: 0.85, hz: 0.35, el: -0.3, orbit: 0.2, push: 0.06, crouch: 0.16, pitch: 0.2, twist: 0.4 });
const O2 = K({ hx: -0.1, hy: 0.8, hz: 0.2, el: -0.8, crouch: 0.08, pitch: 0.1, twist: 0.25 });
// Sweep 3, THE OVERHEAD SLAM (the biggest, §6.1 B6): one turn, then the
// stone hauled up behind him, leaning back; slammed over the top into the
// floor in front, the hips sunk and the body thrown down after it.
const W3 = { dir: -1, turns: 1, coilAz: 0, sweep: 0 };
const C3 = K({ hx: -0.15, hy: 1.0, hz: -0.05, el: 2.5, orbit: 0.4, crouch: 0.02, pitch: -0.2, twist: 0.1 });
const S3 = K({ hx: -0.12, hy: 0.75, hz: 0.45, el: -0.95, push: 0.08, crouch: 0.2, pitch: 0.3, twist: -0.05 });
const O3 = K({ hx: -0.15, hy: 0.7, hz: 0.35, el: -1.2, crouch: 0.12, pitch: 0.2 });
const SWEEPS = [
  { label: 'the flat whirl', coil: C1, strike: S1, over: O1, az: W1 },
  { label: 'the reverse, low', coil: C2, strike: S2, over: O2, az: W2 },
  { label: 'the overhead slam', coil: C3, strike: S3, over: O3, az: W3 },
].map((v) => Object.freeze(v));
export const MILLER_REST = REST;
export const MILLER_SWEEPS = Object.freeze(SWEEPS);

// The stone's azimuth round him (+ to its left, 0 ahead) through a sweep:
// it spins up through whole turns over the coil (accelerating), sweeps on
// through the strike, drifts on through the held contact, then swings on
// round the way it was going and comes to hang at his side.
const HOLD_DRIFT = 0.15;
const wrapPos = (a) => ((a % TWO_PI) + TWO_PI) % TWO_PI;
function azTrack(W) {
  const coilTravel = W.turns * TWO_PI + wrapPos(W.dir * (W.coilAz - REST_AZ));
  const coilEnd = REST_AZ + W.dir * coilTravel;
  const strikeEnd = coilEnd + W.dir * W.sweep;
  const holdEnd = strikeEnd + W.dir * HOLD_DRIFT;
  return { coilTravel, coilEnd, strikeEnd, holdEnd, back: wrapPos(W.dir * (REST_AZ - holdEnd)) };
}
// phase: 'coil' | 'strike' | 'hold' | 'pull' | 'rest'; k 0..1 through it
export function sweepAz(W, phase, k) {
  const A = azTrack(W);
  if (phase === 'coil') return REST_AZ + W.dir * A.coilTravel * Math.pow(Math.max(0, Math.min(1, k)), 1.8);
  if (phase === 'strike') return A.coilEnd + W.dir * W.sweep * kick(Math.min(1, k));
  if (phase === 'hold') return A.strikeEnd + W.dir * HOLD_DRIFT * Math.min(1, k);
  if (phase === 'pull') return A.holdEnd + W.dir * A.back * ease.out(Math.min(1, k));
  return REST_AZ;
}

const SWEEP_TL = strikeTimeline('sweep', 'Flail sweep', {
  tel: SWEEP_TEL_SEC,
  snap: SNAP,
  settle: SETTLE,
  rest: 0.25,
  labels: { coil: 'coil (the ring telegraph): the stone spun up', strike: 'the sweep', hold: 'contact: the stone through the ring', snap: 'swing on round', settle: 'the stone comes to hang' },
});
const SWEEP_CONTACT = SWEEP_TL.startOf('hold');
function sweepPhase(s, tl) {
  if (s.id === 'coil' || s.id === 'strike') return [s.id, s.k];
  if (s.id === 'hold') return ['hold', s.k];
  if (s.id === 'snap' || s.id === 'settle') return ['pull', (s.t - tl.startOf('snap')) / (SNAP + SETTLE)];
  return ['rest', 0];
}
export function millerSweepPose(v, t, out = { ...REST }) {
  return strikePoseAt(SWEEP_TL, SWEEPS[v] || SWEEPS[0], REST, FIELDS, t, out);
}
const classicSweep = (tt, s) => ({ telegraphK: s.id === 'coil' || s.id === 'strike' ? Math.min(1, tt / SWEEP_TEL_SEC) : 0, lungeK: 0, fireK: 0, e: { mode: s.id === 'coil' || s.id === 'strike' ? 'whirl' : 'plod', sweepTick: tt >= SWEEP_CONTACT ? 1 : -1, tossTick: -1 } });
export const MILLER_SWEEP = strikeAbility({ id: 'sweep', label: 'Flail sweep', tl: SWEEP_TL, variants: SWEEPS, classic: classicSweep });
export const MILLER_SWEEPS_STRING = strikeAbility({ id: 'sweeps', label: 'Sweep string', tl: SWEEP_TL, variants: SWEEPS, n: 3, gap: SWEEP_TL.duration, classic: classicSweep });

// --- The toss's key poses (yaw space): lx / ly / lz the left hand; tw, ln,
// cr the torso's twist, lean and the hips' sink added on the sweep's.
const TREST = Object.freeze({ lx: 0.33, ly: 0.72, lz: 0.06, tw: 0, ln: 0, cr: 0 });
const TFIELDS = Object.keys(TREST);
const T = (o) => Object.freeze({ ...TREST, ...o });
const TOSSES = [
  { label: 'overarm', coil: T({ lx: 0.3, ly: 1.45, lz: -0.25, tw: 0.3, ln: -0.08 }), strike: T({ lx: 0.15, ly: 1.25, lz: 0.5, tw: -0.3, ln: 0.14, cr: 0.05 }), over: T({ lx: 0.2, ly: 1.0, lz: 0.4, tw: -0.2, ln: 0.08 }) },
  { label: 'side-arm', coil: T({ lx: 0.55, ly: 1.0, lz: -0.25, tw: 0.4 }), strike: T({ lx: -0.05, ly: 1.05, lz: 0.5, tw: -0.45, ln: 0.1, cr: 0.04 }), over: T({ lx: 0.0, ly: 0.9, lz: 0.35, tw: -0.3, ln: 0.05 }) },
  { label: 'the heave', coil: T({ lx: 0.15, ly: 1.5, lz: -0.2, tw: 0.1, ln: -0.2, cr: 0.08 }), strike: T({ lx: 0.1, ly: 1.3, lz: 0.55, tw: -0.1, ln: 0.25, cr: 0.12 }), over: T({ lx: 0.15, ly: 1.1, lz: 0.45, tw: -0.05, ln: 0.15, cr: 0.06 }) },
].map((v) => Object.freeze(v));
// the lab's toss: a 1.5-frame gather (B1's most for an unwarned move), then
// the throw
const TOSS_TL = strikeTimeline('toss', 'Sack toss', {
  tel: 1.5 / 30 + STRIKE_SEC,
  rest: 0.3,
  labels: { coil: 'gather (unwarned: inside the release)', strike: 'the throw', hold: 'contact: the sack away', snap: 'follow through', settle: 'settle' },
});
const TOSS_CONTACT = TOSS_TL.startOf('hold');
export function millerTossPose(v, t, out = { ...TREST }) {
  return strikePoseAt(TOSS_TL, TOSSES[v] || TOSSES[0], TREST, TFIELDS, t, out);
}
const classicToss = (tt) => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { mode: 'plod', sweepTick: -1, tossTick: tt >= TOSS_CONTACT ? 1 : -1 } });
export const MILLER_TOSS = strikeAbility({ id: 'toss', label: 'Sack toss', tl: TOSS_TL, variants: TOSSES, classic: classicToss });
export const MILLER_TOSSES = strikeAbility({ id: 'tosses', label: 'Toss string', tl: TOSS_TL, variants: TOSSES, n: 3, gap: TOSS_TL.duration, classic: classicToss });
export const MILLER_ABILITIES = Object.freeze({ sweep: MILLER_SWEEP, sweeps: MILLER_SWEEPS_STRING, toss: MILLER_TOSS, tosses: MILLER_TOSSES });

// --- Geometry (built once for the session, shared by every miller) ---------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
// The torso's origin (at the hips, body space) and the neck's (torso space).
const TORSO_AT = new Vector3(0, 0.66, 0);
const NECK_AT = new Vector3(0, 0.7, 0.06);
const CHAIN_L = 0.55;
const LINKS = 7;
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  // The torso (about the hips): the smock and its hem, the belt, the apron
  // and its pocket, two patches, the sack on his back.
  set.torso = bakeParts('miller:torso', () => {
    const out = [
      { geo: fz(new CylinderGeometry(0.24, 0.34, 0.5, 7), 0.08, 1101), m: M(0, 0.05, 0), tint: SMOCK },
      { geo: fz(new CylinderGeometry(0.27, 0.22, 0.5, 7), 0.08, 1103), m: M(0, 0.42, -0.02, 1, 1, 1, qa(1, 0, 0, 0.18)), tint: SMOCK },
      { geo: fz(new CylinderGeometry(0.245, 0.245, 0.06, 7), 0.05, 1105), m: M(0, 0.2, 0.01), tint: SMOCK_DARK },
      { geo: fz(new BoxGeometry(0.3, 0.55, 0.03), 0.06, 1107), m: M(0, 0.18, 0.27, 1, 1, 1, qa(1, 0, 0, 0.1)), tint: SACK },
      { geo: fz(new BoxGeometry(0.16, 0.1, 0.02), 0.06, 1109), m: M(0.02, 0.06, 0.295, 1, 1, 1, qa(1, 0, 0, 0.1)), tint: SACK, tone: 0.78 },
      { geo: fz(new BoxGeometry(0.1, 0.09, 0.02), 0.1, 1111), m: M(-0.18, 0.5, 0.2, 1, 1, 1, qa(0, 1, 0, -0.6)), tint: SMOCK, tone: 0.72 },
      { geo: fz(new BoxGeometry(0.08, 0.1, 0.02), 0.1, 1113), m: M(0.2, 0.0, 0.25, 1, 1, 1, qa(0, 1, 0, 0.5)), tint: SMOCK, tone: 1.2 },
      { geo: fz(new IcosahedronGeometry(0.2, 1), 0.12, 1115), m: M(0.04, 0.5, -0.28, 1.1, 1.25, 0.8), tint: SACK },
      { geo: fz(new CylinderGeometry(0.05, 0.07, 0.06, 6), 0.06, 1117), m: M(0.04, 0.76, -0.28), tint: CHAIN },
      { geo: fz(new TorusGeometry(0.13, 0.03, 4, 8), 0.05, 1119), m: M(0, 0.67, 0.02, 1, 1, 1, qa(1, 0, 0, Math.PI / 2 - 0.1)), tint: SMOCK_DARK },
    ];
    const hem = fz(new BoxGeometry(0.08, 0.16, 0.03), 0.1, 1121);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TWO_PI + 0.2;
      out.push({ geo: hem, m: M(Math.sin(a) * 0.32, -0.24 - (i % 2) * 0.03, Math.cos(a) * 0.32, 1, 1, 1, qa(0, 1, 0, a)), tint: SMOCK_DARK });
    }
    return out;
  });
  // The head (about the neck): the long head, the cap, the slack jaw, the
  // nose and the ears.
  set.head = bakeParts('miller:head', () => [
    { geo: fz(new IcosahedronGeometry(0.13, 1), 0.12, 1131), m: M(0, 0.08, 0.06, 0.9, 1.15, 0.95), tint: SKIN },
    { geo: fz(new CylinderGeometry(0.17, 0.16, 0.06, 8), 0.06, 1133), m: M(0, 0.2, 0.08, 1, 1, 1, qa(1, 0, 0, 0.15)), tint: CAP },
    { geo: fz(new SphereGeometry(0.13, 8, 4, 0, TWO_PI, 0, Math.PI / 2), 0.08, 1135), m: M(0, 0.22, 0.06, 1, 0.6, 1), tint: CAP },
    { geo: fz(new BoxGeometry(0.09, 0.035, 0.05), 0.05, 1137), m: M(0, -0.005, 0.16), tint: SMOCK_DARK, tone: 0.6 },
    { geo: fz(new BoxGeometry(0.035, 0.05, 0.04), 0.1, 1139), m: M(0, 0.07, 0.185, 1, 1, 1, qa(1, 0, 0, -0.3)), tint: SKIN, tone: 0.85 },
    { geo: fz(new SphereGeometry(0.03, 5, 4), 0.1, 1141), m: M(0.115, 0.08, 0.04, 0.6, 1, 1), tint: SKIN, tone: 0.9 },
    { geo: fz(new SphereGeometry(0.03, 5, 4), 0.1, 1143), m: M(-0.115, 0.08, 0.04, 0.6, 1, 1), tint: SKIN, tone: 0.9 },
  ]);
  // The tell (unlit): the dark sockets and the indigo eyes in them.
  set.eyes = bakeParts('miller:eyes', () => {
    const sock = fz(new SphereGeometry(0.03, 6, 4), 0, 1);
    const eye = fz(new SphereGeometry(0.015, 5, 4), 0, 1);
    const out = [];
    for (const s of [-1, 1]) {
      out.push({ geo: sock, m: M(s * 0.045, 0.1, 0.16, 1, 1, 0.6), tint: CHARCOAL });
      out.push({ geo: eye, m: M(s * 0.045, 0.1, 0.18), tint: INDIGO });
    }
    return out;
  });
  // A limb bone (y 0..1, tapering), a boot, a hand, a chain link.
  set.bone = fz(new CylinderGeometry(0.75, 1, 1, 6).translate(0, 0.5, 0), 0.08, 1151);
  set.boot = bakeParts('miller:boot', () => [
    { geo: fz(new BoxGeometry(0.13, 0.09, 0.24), 0.08, 1153), m: M(0, 0.045, 0.04), tint: SMOCK_DARK, tone: 0.8 },
    { geo: fz(new SphereGeometry(0.065, 6, 4, 0, TWO_PI, 0, Math.PI / 2), 0.08, 1155), m: M(0, 0.05, 0.15, 1, 0.9, 0.9), tint: SMOCK_DARK, tone: 0.7 },
  ]);
  set.hand = bakeParts('miller:hand', () => [{ geo: fz(new IcosahedronGeometry(0.065, 0), 0.08, 1157), m: M(0, 0, 0), tint: SKIN }]);
  set.link = bakeParts('miller:link', () => [{ geo: fz(new TorusGeometry(0.04, 0.013, 4, 8), 0.04, 1159), m: M(0, 0, 0, 1, 1.2, 1), tint: CHAIN }]);
  // The millstone (its axis along x): the faced disc, the hole through it,
  // the groove round each face.
  set.stone = bakeParts('miller:stone', () => {
    const out = [{ geo: fz(new CylinderGeometry(0.17, 0.17, 0.09, 10), 0.08, 1161), m: M(0, 0, 0, 1, 1, 1, qa(0, 0, 1, Math.PI / 2)), tint: STONE }];
    for (const s of [-1, 1]) {
      out.push({ geo: fz(new CylinderGeometry(0.04, 0.04, 0.01, 8), 0, 1), m: M(s * 0.046, 0, 0, 1, 1, 1, qa(0, 0, 1, Math.PI / 2)), tint: CHARCOAL });
      out.push({ geo: fz(new TorusGeometry(0.12, 0.009, 3, 14), 0, 1), m: M(s * 0.046, 0, 0, 1, 1, 1, qa(0, 1, 0, Math.PI / 2)), tint: SMOCK_DARK });
    }
    // a few chipped teeth on the rim
    const chip = wedgeGeometry();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TWO_PI + 0.3;
      out.push({ geo: chip, m: new Matrix4().compose(new Vector3(0, Math.cos(a) * 0.165, Math.sin(a) * 0.165), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(0, Math.cos(a), Math.sin(a))), new Vector3(0.08, 0.05, 0.06)), tint: STONE, tone: 0.85 });
    }
    return out;
  });
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Legs: 0 left (+x), 1 right. Hips in body space, feet homes on the floor.
const HIPS = [new Vector3(0.13, 0.66, 0), new Vector3(-0.13, 0.66, 0)];
const HOMES = [new Vector3(0.15, 0, 0.02), new Vector3(-0.15, 0, 0.02)];
const KNEE = [new Vector3(0.15, 0, 1).normalize(), new Vector3(-0.15, 0, 1).normalize()];
const LEG = [0.33, 0.32];
const ANKLE_Y = 0.06;
// Arms: shoulders in torso space; lengths; the elbow's pole (out and back).
const SHOULDERS = [new Vector3(-0.3, 0.6, 0), new Vector3(0.3, 0.6, 0)]; // right, left
const ARM = [0.31, 0.3];
const ELBOW = [new Vector3(-1, -0.4, -0.5).normalize(), new Vector3(1, -0.4, -0.5).normalize()];
const PIVOT_Y = 0.66;
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildMillerFacet() {
  const G = geos();
  const F = createFoeFrame('miller');
  const { body, spawn, track } = F;
  const mat = track(foeMaterial('#FFFFFF'));
  const tellMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
  const torso = foePart(G.torso, mat, 'full', 'miller-torso');
  torso.position.copy(TORSO_AT);
  body.add(torso);
  const neck = foePart(G.head, mat, 'full', 'miller-head');
  neck.position.copy(NECK_AT);
  torso.add(neck);
  const eyes = new Mesh(G.eyes, tellMat);
  eyes.name = 'miller-eyes';
  neck.add(eyes);
  // the rows: 8 limb bones (the legs' trousers, the arms' sleeves), 2 boots,
  // 2 hands, the chain's links; the stone
  const bones = instancedPart(G.bone, mat, 8, { name: 'miller-bones', moving: true, inkPx: 2.0 });
  for (let i = 0; i < 8; i++) bones.setColorAt(i, i < 4 ? SMOCK_DARK : SMOCK);
  const boots = instancedPart(G.boot, mat, 2, { name: 'miller-boots', moving: true, inkPx: 1.8 });
  const hands = instancedPart(G.hand, mat, 2, { name: 'miller-hands', moving: true, inkPx: 1.6 });
  const links = instancedPart(G.link, mat, LINKS, { name: 'miller-chain', moving: true, inkPx: 1.2 });
  const stone = foePart(G.stone, mat, 'full', 'miller-stone');
  stone.matrixAutoUpdate = false;
  for (const o of [bones, boots, hands, links, stone]) spawn.add(o);
  F.group.add(groundShadow(0.5, 0.85));

  // Named points (B8): the stone, the hands, the mouth.
  const stonePt = namedPoint(spawn, 'miller-stone-point', 0, 0.2, 0);
  const handR = namedPoint(spawn, 'miller-hand', 0, 0.7, 0);
  const handL = namedPoint(spawn, 'miller-throw-hand', 0, 0.7, 0);
  const mouth = namedPoint(neck, 'miller-mouth', 0, 0, 0.17);

  const gait = createLegs({ homes: HOMES, groups: [[0], [1]], trigger: 0.1, reach: 0.26, lift: 0.1, durMin: 0.16, durMax: 0.3 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const sweep = createStrikeClip({ rest: REST, fields: FIELDS, snapSec: SNAP, settleSec: SETTLE });
  const toss = createStrikeClip({ rest: TREST, fields: TFIELDS });
  const cur = { ...REST };
  const tc = { ...TREST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const m = new Matrix4();
  const tm = new Matrix4();
  const A = new Vector3();
  const B = new Vector3();
  const C = new Vector3();
  const D = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const UP = new Vector3(0, 1, 0);
  const hipW = new Vector3();
  const HR = new Vector3(); // the right hand, kept past the left arm's solve
  const foot = new Vector3();
  const knee = new Vector3();
  let age = -1;
  let yawNow = 0;
  let sweeps = 0;
  let tosses = 0;
  let lastToss = null;
  let az = REST_AZ;
  let azAbort = null;
  let spin = 0;
  let leanW = 1;
  const lifted = [0, 0];
  const gaitOpts = { locked: true };

  const lab = {
    abilities: MILLER_ABILITIES,
    override: null,
    lastStrike: null,
    lastToss: null,
    feet: () => gait.feet().map((p, i) => ({ ...p, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur, ...tc, az }),
    get hit() {
      return sweep.state === 'rest' ? -1 : (sweeps - 1) % 3;
    },
    parts: { body, torso, neck, bones, stone },
  };

  function liveSweep(P, now, tick) {
    const beat = watch.update(P);
    const st = sweep.update({
      beat,
      tel: watch.telegraph,
      now,
      tick,
      pick: () => SWEEPS[sweeps++ % 3],
      name: () => `sweep:${((sweeps - 1) % 3) + 1}`,
      out: cur,
    });
    lab.lastStrike = sweep.lastStrike;
    const V = sweep.variant;
    const k = sweep.progress;
    if (st === 'abort') {
      // the stone swings on the way it was spinning and comes to hang
      if (azAbort === null) azAbort = { from: az, dir: V ? V.az.dir : -1 };
      const back = wrapPos(azAbort.dir * (REST_AZ - azAbort.from));
      az = azAbort.from + azAbort.dir * back * ease.out(Math.min(1, k / SETTLE));
      return;
    }
    azAbort = null;
    if (!V || st === 'rest') az = REST_AZ;
    else if (st === 'coil') az = sweepAz(V.az, 'coil', k);
    else if (st === 'strike' || st === 'snapin') az = sweepAz(V.az, 'strike', k);
    else if (st === 'held') az = sweepAz(V.az, 'hold', k / HOLD_SEC);
    else if (st === 'pull') az = sweepAz(V.az, 'pull', k / (SNAP + SETTLE));
  }
  function liveToss(now, tick, e) {
    let fired = false;
    if (e) {
      const tt = Number.isFinite(e.tossTick) ? e.tossTick : -1;
      if (lastToss === null) lastToss = tt;
      else if (tt !== lastToss) {
        fired = tt >= 0;
        lastToss = tt;
      }
    }
    toss.update({ beat: null, tel: null, now, tick, fired, pick: () => TOSSES[tosses++ % 3], name: () => `toss:${((tosses - 1) % 3) + 1}`, out: tc });
    lab.lastToss = toss.lastStrike;
  }

  // an arm: two-bone IK from the shoulder (torso) to the hand (yaw space)
  function arm(i, hand, row) {
    C.copy(hand);
    A.copy(SHOULDERS[i]).applyMatrix4(tm);
    D.subVectors(C, A);
    const far = (ARM[0] + ARM[1]) * 0.98;
    if (D.length() > far) C.copy(A).addScaledVector(D.normalize(), far);
    solveKnee(A, C, ARM[0], ARM[1], ELBOW[i], B);
    bones.setMatrixAt(row, segmentMatrix(m, A, B, 0.06, 0.06, 0.02));
    bones.setMatrixAt(row + 1, segmentMatrix(m, B, C, 0.05, 0.05, 0.02));
    m.makeTranslation(C.x, C.y, C.z);
    hands.setMatrixAt(i, m);
    return C;
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

    // --- the sweep and the toss: the lab's pure override, or the sim's
    if (lab.override) {
      const ab = MILLER_ABILITIES[lab.override.id] || MILLER_SWEEP;
      const h = ab.at(lab.override.t);
      Object.assign(cur, REST);
      Object.assign(tc, TREST);
      az = REST_AZ;
      if (ab === MILLER_SWEEP || ab === MILLER_SWEEPS_STRING) {
        millerSweepPose(h.v, h.t, cur);
        const [ph, k] = sweepPhase(SWEEP_TL.sample(h.t), SWEEP_TL);
        az = sweepAz(SWEEPS[h.v].az, ph, k);
      } else millerTossPose(h.v, h.t, tc);
      watch.reset();
      sweep.reset();
      toss.reset();
    } else {
      liveSweep(P, now, tick);
      liveToss(now, tick, e);
    }

    // --- feet: locked to the floor, a heavy plod
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    gaitOpts.locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override);
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = clamp1(lv.z / PLOD_SPEED);
    const side = clamp1(lv.x / PLOD_SPEED);
    leanW += ((sweep.state === 'rest' && toss.state === 'rest' && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 10);

    // --- the hips: sunk by the crouch, bobbing down on each step, leaning
    // into the travel; the torso turned and bent by the swing
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const breath = Math.sin(tt * 1.3 + id);
    body.position.set(0, -cur.crouch - tc.cr - 0.03 * bob, cur.push);
    body.rotation.set(0.08 * fwd * leanW, 0, -0.06 * side * leanW + cur.roll);
    body.updateMatrix();
    torso.rotation.set(0.12 + cur.pitch + tc.ln + 0.03 * breath, cur.twist + tc.tw, 0.04 * Math.sin(gait.speed > 0.2 ? tt * 3.4 : 0) * leanW);
    torso.updateMatrix();
    neck.rotation.set(0.2 - 0.6 * Math.max(0, cur.pitch) * 0.5 - 0.15 * cur.orbit, -0.5 * (cur.twist + tc.tw), 0);
    tm.multiplyMatrices(body.matrix, torso.matrix);

    // --- legs: the hips ride the body, the feet stand where the gait put them
    for (let i = 0; i < 2; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      foot.y += ANKLE_Y;
      lifted[i] = liftToReach(hipW, foot, LEG[0], LEG[1]);
      if (clampReach(hipW, foot, LEG[0], LEG[1]) > 1e-4) {
        gait.release(i);
        lifted[i] = Math.max(lifted[i], 1e-3);
      }
      solveKnee(hipW, foot, LEG[0], LEG[1], KNEE[i], knee);
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, 0.07, 0.07, 0.02));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, 0.055, 0.055, 0.02));
      Z.set(0, 0, 1);
      X.set(1, 0, 0);
      Y.set(0, 1, 0);
      C.set(foot.x, foot.y - ANKLE_Y, foot.z);
      setTRS(m, C, X, Y, Z, 1, 1, 1);
      boots.setMatrixAt(i, m);
    }

    // --- the right hand (the chain), circling with the stone while it spins;
    // the left (the throw); a walking swing on both at rest
    const swing = 0.06 * Math.sin(tt * 3.4) * Math.min(1, gait.speed / PLOD_SPEED) * leanW;
    const sa = Math.sin(az);
    const ca = Math.cos(az);
    D.set(cur.hx + 0.1 * cur.orbit * sa, cur.hy, cur.hz + 0.1 * cur.orbit * ca + swing);
    D.y -= cur.crouch;
    const hr = HR.copy(arm(0, D, 4));
    handR.position.copy(hr);
    D.set(tc.lx, tc.ly - cur.crouch - tc.cr, tc.lz - swing);
    handL.position.copy(arm(1, D, 6));
    bones.instanceMatrix.needsUpdate = true;
    boots.instanceMatrix.needsUpdate = true;
    hands.instanceMatrix.needsUpdate = true;

    // --- the chain and the stone: hung from the right hand along the
    // stone's azimuth and the chain's elevation (a sway at rest)
    const el = cur.el + 0.06 * Math.sin(tt * 1.8 + id) * (1 - cur.orbit);
    const ce = Math.cos(el);
    Z.set(sa * ce, Math.sin(el), ca * ce);
    C.copy(hr).addScaledVector(Z, CHAIN_L);
    // never into the floor
    if (C.y < 0.17) C.y = 0.17;
    D.subVectors(C, hr);
    const len = D.length();
    D.normalize();
    X.crossVectors(UP, D);
    if (X.lengthSq() < 1e-6) X.set(1, 0, 0);
    X.normalize();
    Y.crossVectors(D, X);
    for (let i = 0; i < LINKS; i++) {
      B.copy(hr).addScaledVector(D, ((i + 0.5) / LINKS) * (len - 0.15));
      // alternate links turned a quarter round the chain (right-handed
      // frames: X, D, X x D and X x D, D, -X)
      A.crossVectors(X, D);
      if (i % 2) setTRS(m, B, A, D, Z.copy(X).negate(), 1, 1, 1);
      else setTRS(m, B, X, D, A, 1, 1, 1);
      links.setMatrixAt(i, m);
    }
    links.instanceMatrix.needsUpdate = true;
    // the stone: its face square to the chain's swing, rolling as it flies
    spin += dt * 9 * cur.orbit;
    B.copy(C).addScaledVector(D, 0.02);
    Y.copy(D).negate();
    X.crossVectors(Y, UP);
    if (X.lengthSq() < 1e-6) X.set(1, 0, 0);
    X.normalize();
    Z.crossVectors(X, Y);
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    A.copy(Y).multiplyScalar(cs).addScaledVector(Z, sn);
    Z.multiplyScalar(cs).addScaledVector(Y, -sn);
    setTRS(stone.matrix, B, X, A, Z, 1, 1, 1);
    stone.matrixWorldNeedsUpdate = true;
    stonePt.position.copy(B);
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
    points: { stone: stonePt, hand: handR, throwHand: handL, mouth },
    // §6.1 item 9: a tall heavy man: a light squash, a full flinch, a short
    // knock; the flinch bulges at his chest.
    react: { squash: 0.8, flinch: 1, knock: 0.8, axis: 'y', midY: PIVOT_Y + 0.35 },
    death: { swell: 0.9, throw: 0.7 },
  };
}
