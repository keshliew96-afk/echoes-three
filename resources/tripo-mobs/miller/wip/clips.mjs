// The Drowned Miller's moves. Units are model units (the model is 1 tall; the page draws it CFG.unit = 1.6 times
// bigger, so he stands 1.6 u). Timings come from the game: src/sim/enemies/miller.js (plods 1.1 u/s straight at his
// target; within 1.9 u the FLAIL SWEEP: an Ember ring r 2.2 round him for 60 ticks, then 13 to every hero inside;
// at 3 to 6.5 u, at most every 300 ticks, the SACK TOSS: unwarned, a sodden sack lobbed 60 ticks onto where the hero
// stands, an Ember ring r 1.1 there, 10 and a flour paste slowing 40% for 5 s; cooldown 200 after either) and its rig
// src/render/enemies/facet/miller.js (the three sweeps C1..O3 with the stone's azimuth track: spun up through whole
// turns over the coil, accelerating, swept through the strike in the last 2.5 frames, held 3, then swung on round to
// hang; snap 3 frames, settle 9, rest 0.25 s; the three tosses: a 1.5-frame gather, the throw, held, follow-through).
// Kesh's miller holds the chain in both hands on his belly with the stone hanging in front, and his forearms are
// modelled onto his belly, so his hands only move a little: the game's hand moves are scaled down and the body's
// twist, lean and sink (the game's own) drive the swings. The chain pays out (its bone stretches) as the stone whirls.
import * as THREE from 'three';
import fs from 'fs';
import { gaitFoot, V3, smooth, clamp, addPose } from '../kit/quad.mjs';
const SK = JSON.parse(fs.readFileSync(new URL('./rig/skel.json', import.meta.url)));
const P0 = Object.fromEntries(SK.names.map((n, i) => [n, V3(...SK.pos[i])]));
const END = Object.fromEntries(Object.entries(SK.ends).map(([k, v]) => [k, V3(...v)]));
const PAR = Object.fromEntries(SK.names.map((n, i) => [n, SK.parents[i]]));
const FR = 1 / 30, TAU = 2 * Math.PI;
const QF = (pre) => (p) => new THREE.Quaternion(p[pre + 'x'] || 0, p[pre + 'y'] || 0, p[pre + 'z'] || 0, p[pre + 'w'] ?? 1);
export const CFG = {
  name: 'miller', unit: 1.6,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['armL', QF('qaL')], ['foreL', QF('qfL')], ['handL', 'wL'], ['armR', QF('qaR')], ['foreR', QF('qfR')], ['handR', 'wR'], ['chain', QF('qc')]],
  scales: [['chain', ['csx', 'csy', 'csz']], ['stone', ['tsx', 'tsy', 'tsz']], ['spine', ['ssx', 'ssy', 'ssz']]],
  legs: {
    HL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'], pole: [0, 0, 1] }, HR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'], pole: [0, 0, 1] },
  },
  springs: [],
};
const U = CFG.unit;
const REST_T = { HL: END.toeL.clone(), HR: END.toeR.clone() };
const plant = (p) => ({ p: p.clone(), lock: true });
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const legsPlanted = (o = {}, tz = 0) => ({ HL: plant(REST_T.HL.clone().add(V3(o.xl || 0, 0, (o.zl || 0) + tz))), HR: plant(REST_T.HR.clone().add(V3(o.xr || 0, 0, (o.zr || 0) + tz))) });

// --- a mirror of the kit's forward pass for the trunk (the same rotation order), so the arms and the chain can be
// solved onto world targets
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const qPYR = (p = 0, y = 0, r = 0) => new THREE.Quaternion().setFromAxisAngle(Y, y).multiply(new THREE.Quaternion().setFromAxisAngle(X, -p)).multiply(new THREE.Quaternion().setFromAxisAngle(Z, r));
const CH = { hips: 'b', spine: 's', chest: 'c', neck: 'n', head: 'h' };
function fk(p, upto) {
  const QW = { root: new THREE.Quaternion() }, PW = { root: V3() };
  const go = (n) => { if (QW[n]) return; const pa = PAR[n]; go(pa); const c = CH[n]; const ql = c ? qPYR(p[c + 'p'], p[c + 'y'], p[c + 'r']) : new THREE.Quaternion();
    QW[n] = QW[pa].clone().multiply(ql); PW[n] = PW[pa].clone().add(P0[n].clone().sub(P0[pa]).applyQuaternion(QW[pa])); if (n === 'hips') PW[n].add(V3(p.ox || 0, p.oy || 0, p.oz || 0)); };
  upto.forEach(go); return { QW, PW };
}
function basis(d, n) { const nn = n.clone().addScaledVector(d, -n.dot(d)); if (nn.lengthSq() < 1e-8) nn.set(1, 0, 0); nn.normalize(); return new THREE.Matrix4().makeBasis(nn, d, new THREE.Vector3().crossVectors(nn, d)); }
const qFromTo = (d0, n0, d1, n1) => new THREE.Quaternion().setFromRotationMatrix(basis(d1.clone().normalize(), n1).multiply(basis(d0.clone().normalize(), n0).invert()));
const ARMS = {};
for (const s of ['L', 'R']) { const a = P0['arm' + s], f = P0['fore' + s], h = P0['hand' + s]; ARMS[s] = { l1: f.distanceTo(a), l2: h.distanceTo(f), d1: f.clone().sub(a), d2: h.clone().sub(f) }; }
const POLE = {}; for (const s of ['L', 'R']) { const a = P0['arm' + s], f = P0['fore' + s], h = P0['hand' + s]; const d = h.clone().sub(a).normalize(); const e = f.clone().sub(a); POLE[s] = e.addScaledVector(d, -e.dot(d)).normalize(); }
function armIK(s, T, pole, W) {
  const A = ARMS[s], pa = PAR['arm' + s];
  const S = W.PW[pa].clone().add(P0['arm' + s].clone().sub(P0[pa]).applyQuaternion(W.QW[pa]));
  const d = T.clone().sub(S); let dist = d.length(); const dir = d.clone().normalize(); dist = clamp(dist, Math.abs(A.l1 - A.l2) + 1e-4, A.l1 + A.l2 - 1e-4);
  const ca = (A.l1 * A.l1 + dist * dist - A.l2 * A.l2) / (2 * A.l1 * dist), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  const E = S.clone().addScaledVector(dir, A.l1 * ca).addScaledVector(perp, A.l1 * sa), H = S.clone().addScaledVector(dir, dist);
  const qa = qFromTo(A.d1, POLE[s], E.clone().sub(S), pole), qf = qFromTo(A.d2, POLE[s], H.clone().sub(E), pole);
  const la = W.QW[pa].clone().invert().multiply(qa), lf = qa.clone().invert().multiply(qf);
  return { la, lf, qf, H };
}

// --- the game's pose fields (facet/miller.js): hx/hy/hz the right hand (u, facing frame), el the chain's elevation
// from the hand (-pi/2 hangs, 0 level, past pi/2 behind and over), orbit (the hand's small circle with the stone), push,
// crouch (the hips sunk), pitch (the torso forward +), twist (+ to its left), roll; the toss adds lx/ly/lz (the left
// hand), tw, ln, cr. The hands go a share of the game's moves from where Kesh posed them (his forearms lie on his belly).
const REST = Object.freeze({ hx: -0.33, hy: 0.72, hz: 0.06, el: -1.45, orbit: 0, push: 0, crouch: 0, pitch: 0, twist: 0, roll: 0, lx: 0.33, ly: 0.72, lz: 0.06, tw: 0, ln: 0, cr: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const HAND0 = { L: P0.handL.clone(), R: P0.handR.clone() };
const ARM_SHARE = 0.4, ARM_MAX = 0.085;
const handOff = (dx, dy, dz) => { const v = V3(dx, dy, dz).multiplyScalar(ARM_SHARE / U); if (v.length() > ARM_MAX) v.setLength(ARM_MAX); return v; };
const CH0 = P0.stone.clone().sub(P0.chain), CHL = CH0.length(), D0 = CH0.clone().normalize();
const FLOOR_C = 0.13;
export const STRETCH_MAX = 3.3; // the chain paid out: the stone's centre 0.45 from the grip (0.72 u, the game's 0.55 chain and its stone)
// o: yaw, lift, turn (head yaw), az (the stone round him, + to its left, 0 ahead), stretch (1 hangs), spin (the stone
// about the chain), bob (extra el)
function miller(g, o = {}) {
  const p = { oy: o.oy ?? (-(g.crouch + g.cr) / U + (o.lift || 0)), oz: (o.oz || 0) + g.push / U, by: o.yaw || 0, br: g.roll * 0.5, bp: o.bp || 0,
    sp: -0.5 * (g.pitch + g.ln), cp: -0.45 * (g.pitch + g.ln), sy: 0.45 * (g.twist + g.tw), cy: 0.55 * (g.twist + g.tw), sr: 0.5 * g.roll,
    np: 0.3 * (g.pitch + g.ln) + (o.nod || 0), ny: (o.turn || 0) - 0.4 * (g.twist + g.tw), hp: 0.2 * (g.pitch + g.ln), hy: 0,
    ssx: 0, ssy: o.breath || 0, ssz: 0 };
  const W = fk(p, ['armL', 'armR']);
  const facing = new THREE.Quaternion().setFromAxisAngle(Y, o.yaw || 0);
  const az = o.az ?? 0, el = g.el + (o.bob || 0);
  // the right hand: a share of the game's move plus the small circle it makes with the stone
  const orb = g.orbit * 0.25;
  const tR = HAND0.R.clone().add(handOff(g.hx - REST.hx + orb * Math.sin(az), g.hy - REST.hy, g.hz - REST.hz + orb * Math.cos(az)).applyQuaternion(facing));
  const tL = HAND0.L.clone().add(handOff(g.lx - REST.lx, g.ly - REST.ly, g.lz - REST.lz).applyQuaternion(facing));
  // the hands follow the chest as it twists (they lie on the belly)
  const chestQ = W.QW.chest.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y, 0));
  const pivot = W.PW.chest;
  const ride = (T) => T.clone().sub(P0.chest).applyQuaternion(chestQ).add(pivot);
  const L = armIK('L', ride(tL), POLE.L.clone().applyQuaternion(W.QW.chest), W);
  const R = armIK('R', ride(tR), POLE.R.clone().applyQuaternion(W.QW.chest), W);
  // the chain in the world: hanging at rest (Kesh's), out along (az, el) as it pays out
  let s = o.stretch ?? 1;
  let dir = V3(Math.sin(az + (o.yaw || 0)) * Math.cos(el), Math.sin(el), Math.cos(az + (o.yaw || 0)) * Math.cos(el));
  // a stone at rest on the floor: the chain runs from the grip to it, paid out as far as it needs
  if (o.stoneAt) { const grip = R.H.clone().add(P0.chain.clone().sub(P0.handR).applyQuaternion(R.qf)); const v = o.stoneAt.clone().sub(grip);
    const k = o.stoneK ?? 1; const hang = D0.clone().multiplyScalar(CHL * (o.stretch ?? 1)); v.lerp(hang, 1 - k); s = Math.max(1, v.length() / CHL); dir = v.normalize(); }
  const wh = c01((s - 1) / (STRETCH_MAX - 1));
  const dHang = D0.clone().applyQuaternion(facing);
  const d = o.stoneAt ? dir.clone() : dHang.clone().lerp(dir, Math.max(wh, o.aim ?? 0)).normalize();
  // the floor: the stone's centre stays a stone's radius up (the chain lifts it rather than burying it)
  { const grip = R.H.clone().add(P0.chain.clone().sub(P0.handR).applyQuaternion(R.qf)); const L = CHL * s, req = (FLOOR_C - grip.y) / L;
    if (!o.stoneAt && req > -1 && req < 1 && d.y < req) { const h = Math.hypot(d.x, d.z) || 1, hn = Math.sqrt(1 - req * req); d.set(d.x / h * hn, req, d.z / h * hn); } }
  // the stone's face: to the front while it hangs, edge-on along its path as it whirls, turned by the spin
  const tang = V3(Math.cos(az + (o.yaw || 0)), 0, -Math.sin(az + (o.yaw || 0)));
  const n1 = Z.clone().applyQuaternion(facing).lerp(tang, wh).normalize().applyAxisAngle(d, o.spin || 0);
  const qW = qFromTo(D0, Z, d, n1);
  const qc = R.qf.clone().invert().multiply(qW);
  const put = (pre, q) => { p[pre + 'x'] = q.x; p[pre + 'y'] = q.y; p[pre + 'z'] = q.z; p[pre + 'w'] = q.w; };
  put('qaL', L.la); put('qfL', L.lf); put('qaR', R.la); put('qfR', R.lf); put('qc', qc);
  // the chain bone stretches along its length (its local -y is the chain at bind); the stone counter-scales
  p.csx = 0; p.csy = s - 1; p.csz = 0; p.tsx = 0; p.tsy = 1 / s - 1; p.tsz = 0;
  return p;
}
const KNEE = { oy: -0.002 };
function clip(c) { const pose = (t) => addPose(KNEE, c.pose(t)); return { ...c, pose, feet: (t, W) => (c.legs ? c.legs(t, W) : legsPlanted(c.plant ? c.plant(t) : {}, W.tz)) }; }

// ------------------------------------------------------------------------------------------------ idle
// Mine: he breathes heavily, the stone swinging a little on its chain; he looks one way, then the other.
const IP = 4.8;
const idle = clip({
  dur: IP, loop: true,
  pose: (t) => { const br = Math.sin(TAU * t / 2.4), look = 0.3 * pulse(t, 0.6, 1.0, 1.7, 2.1) - 0.25 * pulse(t, 3.0, 3.4, 4.0, 4.4);
    return miller(K({ pitch: 0.02 * br }), { lift: 0.002 * br, breath: 0.012 * br, turn: look, aim: 0.15, bob: 0.08 * Math.sin(TAU * t / 2.4 + 0.8), az: 0 }); },
});
// ------------------------------------------------------------------------------------------------ walk and turns
// The game's heavy plod at 1.1 u/s: feet set wide and straight, the hips bobbing and rolling on each step, the body
// leaning into the travel, the stone swinging forward and back with the gait.
const WT = 0.23;
const GAIT = { T: WT, duty: 0.62, v: 1.1 / U };
const GF = { HL: { phase: 0.1, n: [REST_T.HL.x, REST_T.HL.z], lift: 0.03, droop: 0.4, push: 0.2 }, HR: { phase: 0.6, n: [REST_T.HR.x, REST_T.HR.z], lift: 0.03, droop: 0.4, push: 0.2 } };
const walk = clip({
  dur: WT * 2, loop: true, gait: { ...GAIT },
  pose: (t) => { const w = TAU * t / (WT * 2);
    return miller(K({ pitch: 0.1, roll: 0.07 * Math.sin(w), twist: 0.05 * Math.sin(w) }), { lift: 0.006 * Math.abs(Math.cos(w)) - 0.005, aim: 0.25, bob: 0.22 * Math.sin(2 * w - 1.1), az: 0 }); },
  legs: (t) => ({ HL: gaitFoot(t, GAIT, GF.HL), HR: gaitFoot(t, GAIT, GF.HR) }),
});
const turn = (dir) => {
  const g = { T: WT, duty: 0.62, v: 0, omega: dir * Math.PI * 0.8, pivot: [0, 0] };
  return clip({
    dur: WT * 2, loop: true, gait: g,
    pose: (t) => miller(K({ twist: 0.08 * dir }), { turn: 0.15 * dir, aim: 0.2, bob: 0.1 * Math.sin(TAU * t / WT), az: -0.4 * dir }),
    legs: (t) => ({ HL: gaitFoot(t, g, { ...GF.HL, lift: 0.025 }), HR: gaitFoot(t, g, { ...GF.HR, lift: 0.025 }) }),
  });
};

// ------------------------------------------------------------------------------------------------ the flail sweeps
// The game's three sweeps in turn, each on its own 60-tick ring: the coil runs through the telegraph (feet planted,
// the chain paid out and the stone spun up round him through whole turns, accelerating, the body wound against the
// spin), the strike takes the last 2.5 frames and lands on the resolve (13 to every hero in the ring), the contact holds
// 3 frames, then the stone swings on round and comes back to hang as the chain is hauled in.
const C1 = K({ hx: -0.05, hy: 1.5, hz: 0.05, el: -0.15, orbit: 1, push: -0.03, crouch: 0.06, pitch: -0.06, twist: 0.25 });
const S1 = K({ hx: -0.3, hy: 1.2, hz: 0.25, el: -0.05, orbit: 0.3, push: 0.06, crouch: 0.1, pitch: 0.12, twist: -0.4 });
const O1 = K({ hx: -0.3, hy: 1.0, hz: 0.15, el: -0.6, crouch: 0.05, pitch: 0.06, twist: -0.3 });
const C2 = K({ hx: -0.15, hy: 1.15, hz: 0.1, el: -0.35, orbit: 1, crouch: 0.1, pitch: 0.05, twist: -0.3 });
const S2 = K({ hx: 0.05, hy: 0.85, hz: 0.35, el: -0.3, orbit: 0.2, push: 0.06, crouch: 0.16, pitch: 0.2, twist: 0.4 });
const O2 = K({ hx: -0.1, hy: 0.8, hz: 0.2, el: -0.8, crouch: 0.08, pitch: 0.1, twist: 0.25 });
const C3 = K({ hx: -0.15, hy: 1.0, hz: -0.05, el: 2.5, orbit: 0.4, crouch: 0.02, pitch: -0.2, twist: 0.1 });
const S3 = K({ hx: -0.12, hy: 0.75, hz: 0.45, el: -0.95, push: 0.08, crouch: 0.2, pitch: 0.3, twist: -0.05 });
const O3 = K({ hx: -0.15, hy: 0.7, hz: 0.35, el: -1.2, crouch: 0.12, pitch: 0.2 });
const REST_AZ = -1.43, HOLD_DRIFT = 0.15;
const W1 = { dir: -1, turns: 2, coilAz: 1.0, sweep: 2.2 }, W2 = { dir: 1, turns: 2, coilAz: -2.4, sweep: 3.0 }, W3 = { dir: -1, turns: 1, coilAz: 0, sweep: 0 };
const SWEEPS = [{ coil: C1, strike: S1, over: O1, az: W1 }, { coil: C2, strike: S2, over: O2, az: W2 }, { coil: C3, strike: S3, over: O3, az: W3 }];
export const TEL = 60 / 60;
const STRIKE = 2.5 * FR, HOLD = 3 * FR, SNAP = 3 * FR, SETTLE = 9 * FR, RESTS = 0.25;
const COIL = TEL - STRIKE; export const ONE = COIL + STRIKE + HOLD + SNAP + SETTLE + RESTS;
const coilCurve = (k) => { const c = c01(k); return 0.85 * (1 - (1 - Math.min(1, c / 0.4)) ** 2) + 0.15 * c; };
const kick = (k) => { const c = c01(k); return 1 - (1 - c) ** 3; };
const easeOut = (k) => 1 - (1 - c01(k)) ** 2;
const settleC = (k) => { const c = c01(k); return smooth(c) - 0.12 * Math.sin(Math.PI * c) * (1 - c); };
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
const wrapPos = (a) => ((a % TAU) + TAU) % TAU;
function azTrack(W) {
  const coilTravel = W.turns * TAU + wrapPos(W.dir * (W.coilAz - REST_AZ));
  const coilEnd = REST_AZ + W.dir * coilTravel, strikeEnd = coilEnd + W.dir * W.sweep, holdEnd = strikeEnd + W.dir * HOLD_DRIFT;
  return { coilTravel, coilEnd, strikeEnd, holdEnd, back: wrapPos(W.dir * (REST_AZ - holdEnd)) };
}
// the game's sweep: its pose, the stone's azimuth, and how far the chain is paid out (mine: out over the first 40% of
// the coil, in through the swing back)
export function sweepAt(V, t) {
  const A = azTrack(V.az);
  if (t < COIL) { const k = t / COIL; return { g: mix(REST, V.coil, coilCurve(k)), az: REST_AZ + V.az.dir * A.coilTravel * Math.pow(k, 1.8), s: 1 + (STRETCH_MAX - 1) * smooth(k / 0.4), ph: 'coil' }; }
  let a = t - COIL; if (a < STRIKE) return { g: mix(V.coil, V.strike, kick(a / STRIKE)), az: A.coilEnd + V.az.dir * V.az.sweep * kick(a / STRIKE), s: STRETCH_MAX, ph: 'strike' };
  a -= STRIKE; if (a < HOLD) return { g: { ...V.strike }, az: A.strikeEnd + V.az.dir * HOLD_DRIFT * (a / HOLD), s: STRETCH_MAX, ph: 'hold' };
  a -= HOLD; const pull = SNAP + SETTLE;
  if (a < pull) { const k = a / pull; const g = a < SNAP ? mix(V.strike, V.over, 1 - (1 - a / SNAP) ** 2) : mix(V.over, REST, settleC((a - SNAP) / SETTLE));
    return { g, az: A.holdEnd + V.az.dir * A.back * easeOut(k), s: 1 + (STRETCH_MAX - 1) * (1 - smooth(k)), ph: 'pull' }; }
  return { g: { ...REST }, az: REST_AZ, s: 1, ph: 'rest' };
}
export const SWEEP_AT = [TEL, ONE + TEL, 2 * ONE + TEL];
const sweeps = clip({
  dur: 3 * ONE, contact: SWEEP_AT,
  phases: [['1, the flat whirl: the stone spun up, the Ember ring marks', 0], ['the sweep: 13 to every hero in the ring', TEL], ['the stone comes to hang', TEL + 0.2],
           ['2, the reverse, low: spun up', ONE], ['the sweep', ONE + TEL], ['comes to hang', ONE + TEL + 0.2],
           ['3, the overhead slam: hauled up behind him', 2 * ONE], ['slammed into the floor', 2 * ONE + TEL], ['comes to hang', 2 * ONE + TEL + 0.2]],
  pose: (t) => { const k = Math.min(2, Math.floor(t / ONE)), tt = t - k * ONE; const S = sweepAt(SWEEPS[k], tt);
    // the stone's spin about the chain rides its travel; it rolls only while the chain is out
    return miller(S.g, { az: S.az, stretch: S.s, spin: 0.6 * Math.sin(S.az * 0.5) * c01((S.s - 1) / (STRETCH_MAX - 1)) }); },
});

// ------------------------------------------------------------------------------------------------ the sack tosses
// Unwarned in the game: a 1.5-frame gather inside the release, the throw (the sack away on the contact), held, then the
// follow-through; overarm, side-arm, then a heave over the head. The sack is drawn by the page; the one on his hip stays.
const T = (o) => K(o);
const TOSSES = [
  { coil: T({ lx: 0.3, ly: 1.45, lz: -0.25, tw: 0.3, ln: -0.08 }), strike: T({ lx: 0.15, ly: 1.25, lz: 0.5, tw: -0.3, ln: 0.14, cr: 0.05 }), over: T({ lx: 0.2, ly: 1.0, lz: 0.4, tw: -0.2, ln: 0.08 }) },
  { coil: T({ lx: 0.55, ly: 1.0, lz: -0.25, tw: 0.4 }), strike: T({ lx: -0.05, ly: 1.05, lz: 0.5, tw: -0.45, ln: 0.1, cr: 0.04 }), over: T({ lx: 0.0, ly: 0.9, lz: 0.35, tw: -0.3, ln: 0.05 }) },
  { coil: T({ lx: 0.15, ly: 1.5, lz: -0.2, tw: 0.1, ln: -0.2, cr: 0.08 }), strike: T({ lx: 0.1, ly: 1.3, lz: 0.55, tw: -0.1, ln: 0.25, cr: 0.12 }), over: T({ lx: 0.15, ly: 1.1, lz: 0.45, tw: -0.05, ln: 0.15, cr: 0.06 }) },
];
const TGATHER = 1.5 * FR, TONE = TGATHER + STRIKE + HOLD + SNAP + SETTLE + 0.3;
// the page's lab gives each toss a reach for the sack at his hip first (mine: 0.35 s), so the throw can be seen
const REACH = 0.35, TCYCLE = REACH + TONE + 0.6;
export const TOSS_AT = [0, 1, 2].map((k) => k * TCYCLE + REACH + TGATHER + STRIKE);
function tossAt(V, t) {
  const hip = T({ lx: 0.42, ly: 0.62, lz: -0.05, tw: 0.15, ln: 0.04 });
  if (t < REACH) return mix(REST, hip, smooth(t / REACH));
  let a = t - REACH; if (a < TGATHER) return mix(hip, V.coil, a / TGATHER);
  a -= TGATHER; if (a < STRIKE) return mix(V.coil, V.strike, kick(a / STRIKE));
  a -= STRIKE; if (a < HOLD) return { ...V.strike };
  a -= HOLD; if (a < SNAP) return mix(V.strike, V.over, 1 - (1 - a / SNAP) ** 2);
  a -= SNAP; if (a < SETTLE + 0.3) return mix(V.over, REST, settleC(a / (SETTLE + 0.3)));
  return { ...REST };
}
const tosses = clip({
  dur: 3 * TCYCLE, contact: TOSS_AT,
  phases: [['1, overarm: reaches for a sack', 0], ['the throw (unwarned): the sack away', TOSS_AT[0] - STRIKE], ['follow-through', TOSS_AT[0] + 0.1],
           ['2, side-arm: reaches', TCYCLE], ['the throw', TOSS_AT[1] - STRIKE], ['follow-through', TOSS_AT[1] + 0.1],
           ['3, the heave: reaches', 2 * TCYCLE], ['the throw', TOSS_AT[2] - STRIKE], ['follow-through', TOSS_AT[2] + 0.1]],
  pose: (t) => { const k = Math.min(2, Math.floor(t / TCYCLE)), tt = t - k * TCYCLE; const g = tossAt(TOSSES[k], tt);
    const kk = c01((tt - REACH) / 0.3) * (1 - c01((tt - REACH - 0.6) / 0.4));
    return miller(g, { aim: 0.2, bob: 0.25 * kk * Math.sin(TAU * tt * 1.6), az: 0.4 * kk }); },
});

// ------------------------------------------------------------------------------------------------ hurt
const hurt = clip({
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = c01(t / 0.05) * (1 - smooth((t - 0.05) / 0.35));
    return miller(K({ pitch: -0.18 * k, twist: 0.08 * k }), { nod: -0.25 * k, aim: 0.2 + 0.3 * k, bob: 0.4 * k }); },
});
// ------------------------------------------------------------------------------------------------ spawn
const spawnScale = (a) => { const up = 5 * FR, T7 = 7 * FR; if (a >= T7) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T7 - up)); };
const spawn = clip({
  dur: 1.3, contact: [], scale: spawnScale,
  pose: (t) => { const r = pulse(t, 0.15, 0.4, 0.7, 1.1);
    return miller(K({ pitch: -0.1 * r, crouch: -0.02 * r }), { nod: -0.15 * r, aim: 0.3, bob: 0.5 * r * Math.sin(TAU * t * 1.2), lift: 0.004 * r }); },
});

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, he rocks back and the stone drops from his hands to the floor
// on its chain; his knees give and he sits down hard, then falls back flat and lies still.
const TIP = 1.35;
const STONE_REST = V3(P0.stone.x, 0.128, P0.stone.z + 0.05);
const deathState = (t) => {
  const hit = pulse(t, 0, 0.05, 0.12, 0.35), drop = smooth((t - 0.15) / 0.3), sit = smooth((t - 0.35) / 0.45), tip = TIP * c01((t - 0.75) / 0.45) ** 2;
  return { hit, drop, sit, tip };
};
const LOWT = 1 / 30;
const LOW = [0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.002,0.002,0.001,0.000,0.000,0.000,0.000,0.001,-0.002,-0.007,-0.011,-0.013,-0.014,-0.015,-0.015,-0.014,-0.013,-0.012,-0.011,-0.023,-0.035,-0.045,-0.055,-0.065,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t / LOWT, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
function deathPose(t, probe) {
  const { hit, drop, sit, tip } = deathState(t);
  const g = K({ pitch: -0.2 * hit + 0.15 * sit, crouch: 0 });
  // the stone falls to the floor: the chain pays out until it rests there (its centre a stone's radius up)
  const sink = 0.16 * sit;
  const oy = probe ? -sink : Math.max(-sink, -sink - lowAt(t)) + 0.01 * pulse(t, 1.15, 1.2, 1.25, 1.4);
  // the fall: the whole body pitches back about the hips; the stone lies where it dropped, a step in front
  return miller(g, { nod: -0.25 * hit + 0.2 * sit, aim: 0, bp: tip, oy, oz: -0.03 * sit, stoneAt: STONE_REST, stoneK: drop });
}
const deathLegs = (t, W) => { const { sit } = deathState(t);
  return { HL: { p: REST_T.HL.clone().add(V3(0.01 * sit, 0, 0.1 * sit + W.tz)), lock: false }, HR: { p: REST_T.HR.clone().add(V3(-0.01 * sit, 0, 0.08 * sit + W.tz)), lock: false } }; };
const death = clip({
  dur: 2.2, contact: [0.02, 0.45, 1.2],
  phases: [['struck: rocks back', 0], ['the stone drops; he sits down hard', 0.15], ['falls back', 0.75], ['lies still', 1.3]],
  pose: (t) => deathPose(t, false),
  legs: deathLegs,
});
const probe = clip({ dur: 2.2, pose: (t) => deathPose(t, true), legs: deathLegs });
export const CLIPS = process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), sweeps, tosses, hurt, spawn, death };
