// The Barrow Sexton's moves. Units are model units (the model is 1 tall to the hat's crown; the page draws it CFG.unit =
// 1.25 times bigger, a short hunched man a little taller than the 1 u hero). Timings come from the game:
// src/sim/enemies/sexton.js (28 health, shuffles at 1.4 u/s keeping 3.0 to 4.6 u off, circling; every 300 ticks it kneels
// for 36 ticks, rooted, and buries a bone snare 1.8 u toward its target: a ring r 0.55 that arms 45 ticks later and lies
// 20 s; a hero who steps on an armed snare springs it: an Ember ring r 0.95 for 42 ticks, then the jaws snap: 11 and a
// 60% slow for 75 ticks; it never strikes in person) and its rig src/render/enemies/facet/sexton.js (the dig as a
// timeline: down on a knee 0.12 s, the chop from its right, the chop from its left, the two-handed stamp, 0.16 s each,
// the pat on the sim's dig tick 0.14 s, up 0.3 s, rest 0.2 s; the eye of its lantern flares through the dig).
// Kesh's sexton holds the spade upright on its blade in its right hand (the game's carries it on the shoulder, with a
// lantern in the left): the arms are laid by two-bone IK onto hand targets in the facing frame, the spade aimed in the
// world from the right hand's grip, both turned into the bones' local rotations for the kit.
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
  name: 'sexton', unit: 1.25,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['clvL', 'kL'], ['clvR', 'kR'], ['armL', QF('qaL')], ['foreL', QF('qfL')], ['handL', 'wL'], ['armR', QF('qaR')], ['foreR', QF('qfR')], ['handR', 'wR'], ['spade', QF('qs')]],
  legs: {
    HL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'], pole: [0, 0, 1] }, HR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'], pole: [0, 0, 1] },
  },
  springs: [],
};
const U = CFG.unit;
const REST_T = { HL: END.toeL.clone(), HR: END.toeR.clone() };
const plant = (p, o = {}) => ({ p: p.clone(), lock: true, ...o });
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const legsPlanted = (o = {}, tz = 0) => ({ HL: plant(REST_T.HL.clone().add(V3(o.xl || 0, 0, (o.zl || 0) + tz)), { pitch: o.pl || 0 }), HR: plant(REST_T.HR.clone().add(V3(o.xr || 0, 0, (o.zr || 0) + tz)), { pitch: o.pr || 0 }) });

// --- a mirror of the kit's forward pass for the trunk and the clavicles, so the arms can be solved onto world targets
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const qPYR = (p = 0, y = 0, r = 0) => new THREE.Quaternion().setFromAxisAngle(Y, y).multiply(new THREE.Quaternion().setFromAxisAngle(X, -p)).multiply(new THREE.Quaternion().setFromAxisAngle(Z, r));
const CH = { hips: 'b', spine: 's', chest: 'c', neck: 'n', head: 'h', clvL: 'kL', clvR: 'kR', handL: 'wL', handR: 'wR' };
function fk(p, upto) {
  const QW = { root: new THREE.Quaternion() }, PW = { root: V3() };
  const go = (n) => { if (QW[n]) return; const pa = PAR[n]; go(pa); const c = CH[n]; const ql = qPYR(p[c + 'p'], p[c + 'y'], p[c + 'r']);
    QW[n] = QW[pa].clone().multiply(ql); PW[n] = PW[pa].clone().add(P0[n].clone().sub(P0[pa]).applyQuaternion(QW[pa])); if (n === 'hips') PW[n].add(V3(p.ox || 0, p.oy || 0, p.oz || 0)); };
  upto.forEach(go); return { QW, PW };
}
function basis(d, n) { const nn = n.clone().addScaledVector(d, -n.dot(d)); if (nn.lengthSq() < 1e-8) nn.set(1, 0, 0); nn.normalize(); return new THREE.Matrix4().makeBasis(nn, d, new THREE.Vector3().crossVectors(nn, d)); }
const qFromTo = (d0, n0, d1, n1) => new THREE.Quaternion().setFromRotationMatrix(basis(d1.clone().normalize(), n1).multiply(basis(d0.clone().normalize(), n0).invert()));
const ARMS = {};
for (const s of ['L', 'R']) { const a = P0['arm' + s], f = P0['fore' + s], h = P0['hand' + s]; ARMS[s] = { l1: f.distanceTo(a), l2: h.distanceTo(f), d1: f.clone().sub(a), d2: h.clone().sub(f) }; }
const POLE = {}; for (const s of ['L', 'R']) { const a = P0['arm' + s], f = P0['fore' + s], h = P0['hand' + s]; const d = h.clone().sub(a).normalize(); const e = f.clone().sub(a); POLE[s] = e.addScaledVector(d, -e.dot(d)).normalize(); }
function armIK(s, T, pole, W) {
  const A = ARMS[s], clv = 'clv' + s;
  const S = W.PW[clv].clone().add(P0['arm' + s].clone().sub(P0[clv]).applyQuaternion(W.QW[clv]));
  const d = T.clone().sub(S); let dist = d.length(); const dir = d.clone().normalize(); dist = clamp(dist, Math.abs(A.l1 - A.l2) + 1e-4, A.l1 + A.l2 - 1e-4);
  const ca = (A.l1 * A.l1 + dist * dist - A.l2 * A.l2) / (2 * A.l1 * dist), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  const E = S.clone().addScaledVector(dir, A.l1 * ca).addScaledVector(perp, A.l1 * sa), H = S.clone().addScaledVector(dir, dist);
  const qa = qFromTo(A.d1, POLE[s], E.clone().sub(S), pole), qf = qFromTo(A.d2, POLE[s], H.clone().sub(E), pole);
  const la = W.QW[clv].clone().invert().multiply(qa), lf = qa.clone().invert().multiply(qf);
  return { la, lf, qf, H };
}

// --- the pose fields, in model units in the facing frame: push (+z), crouch (the hips sunk), lean (the hunch, forward +),
// twist (+ toward its left), roll, head (+ down); the spade's grip gx, gy, gz and its direction (el, the blade end's
// elevation, - down; az, its azimuth from +z, + toward its left); the free hand lx, ly, lz, or on the shaft (two, 0..1,
// the left hand taken onto the shaft below the right); eye (0..1, the tell).
const GRIP0 = P0.handR.clone(), SPD0 = END.spade.clone().sub(P0.spade), SPL = SPD0.length();
const EL0 = Math.asin(SPD0.y / SPL), AZ0 = Math.atan2(SPD0.x, SPD0.z);
const REST = Object.freeze({ push: 0, crouch: 0, lean: 0, twist: 0, roll: 0, head: 0, gx: GRIP0.x, gy: GRIP0.y, gz: GRIP0.z, el: EL0, az: 0, lx: P0.handL.x, ly: P0.handL.y, lz: P0.handL.z, two: 0, eye: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
// o.tip: the whole body pitched forward about the hips after the arms are solved (the death's topple); o.elW: the
// spade's elevation wanted in the world after that topple
function sexton(g, o = {}) {
  const p = { oy: -g.crouch + (o.lift || 0), oz: g.push, by: o.yaw || 0, br: g.roll * 0.5,
    sp: -0.5 * g.lean, cp: -0.5 * g.lean, sy: 0.45 * g.twist, cy: 0.55 * g.twist, sr: 0.5 * g.roll,
    np: -0.4 * g.head, hp: -0.6 * g.head, ny: 0.4 * (o.turn || 0), hy: 0.6 * (o.turn || 0) };
  const W = fk(p, ['clvL', 'clvR']);
  const facing = new THREE.Quaternion().setFromAxisAngle(Y, o.yaw || 0);
  // the spade: the floor keeps the blade end up (the grip's height in the world, its sink included)
  let el = g.el; const gy = g.gy;
  if (!o.tip && gy + SPL * Math.sin(el) < 0.004) el = Math.asin(clamp((0.004 - gy) / SPL, -1, 1));
  let dir = V3(Math.sin(g.az + AZ0) * Math.cos(el), Math.sin(el), Math.cos(g.az + AZ0) * Math.cos(el));
  if (o.tip) { // the grip where the topple carries it (about the hips), the blade end kept on the floor ahead
    const hipW = P0.hips.clone().add(V3(0, p.oy, p.oz)); const gW = V3(g.gx, g.gy, g.gz).sub(hipW).applyAxisAngle(X, o.tip).add(hipW);
    const eW = Math.asin(clamp((0.006 - gW.y) / SPL, -1, 1));
    dir = V3(Math.sin(g.az + AZ0) * Math.cos(eW), Math.sin(eW), Math.cos(g.az + AZ0) * Math.cos(eW)).applyAxisAngle(X, -o.tip); }
  dir.applyQuaternion(facing);
  const GT = V3(g.gx, g.gy, g.gz).applyQuaternion(facing);
  const R = armIK('R', GT, POLE.R.clone().applyQuaternion(W.QW.chest), W);
  const free = V3(g.lx, g.ly, g.lz).applyQuaternion(facing);
  const onShaft = GT.clone().addScaledVector(dir, 0.1).add(V3(0.035, 0, 0).applyQuaternion(facing));
  const L = armIK('L', free.lerp(onShaft, g.two), POLE.L.clone().applyQuaternion(W.QW.chest), W);
  const qsW = qFromTo(SPD0, X, dir, X.clone().applyAxisAngle(Y, g.az + (o.yaw || 0)));
  const qs = R.qf.clone().invert().multiply(qsW);
  const put = (pre, q) => { p[pre + 'x'] = q.x; p[pre + 'y'] = q.y; p[pre + 'z'] = q.z; p[pre + 'w'] = q.w; };
  put('qaL', L.la); put('qfL', L.lf); put('qaR', R.la); put('qfR', R.lf); put('qs', qs);
  return p;
}
function clip(c) { return { ...c, feet: (t, W) => (c.legs ? c.legs(t, W) : legsPlanted(c.plant ? c.plant(t) : {}, W.tz)) }; }

// ------------------------------------------------------------------------------------------------ idle
// The game's sexton shuffles its feet; standing, mine: leaning on the spade, breathing, it peers one way and the other
// under its hat, the free hand's fingers working; once it lifts the spade a hair and sets it down again.
const IP = 4.4;
const idle = clip({
  dur: IP, loop: true,
  pose: (t) => { const br = Math.sin(TAU * t / 2.2), look = 0.4 * pulse(t, 0.4, 0.8, 1.4, 1.8) - 0.35 * pulse(t, 2.0, 2.4, 2.8, 3.2), tap = pulse(t, 3.4, 3.55, 3.6, 3.75);
    return sexton(K({ lean: 0.04 + 0.02 * br, head: -0.03 * br + 0.08 * Math.abs(look), gy: GRIP0.y + 0.004 * br + 0.03 * tap, ly: P0.handL.y + 0.006 * br, lz: P0.handL.z + 0.01 * Math.sin(TAU * t / 1.1) }), { lift: 0.002 * br, turn: look }); },
});
// ------------------------------------------------------------------------------------------------ walk and turns
// The game's 1.4 u/s on short bowed legs, a quick shuffle leaning into the travel; the spade carried tipped forward, blade
// up off the floor, swinging a little with the step; the free arm swinging.
const WT = 0.25;
const GAIT = { T: WT, duty: 0.6, v: 1.4 / U };
const GF = { HL: { phase: 0.1, n: [REST_T.HL.x, REST_T.HL.z], lift: 0.03, droop: 0.5, push: 0.2 }, HR: { phase: 0.6, n: [REST_T.HR.x, REST_T.HR.z], lift: 0.03, droop: 0.5, push: 0.2 } };
const CARRY = { lean: 0.16, gx: GRIP0.x - 0.01, gy: GRIP0.y + 0.0, gz: GRIP0.z + 0.04, el: -1.12, head: -0.08 };
const walk = clip({
  dur: WT * 2, loop: true, gait: { ...GAIT },
  pose: (t) => { const w = TAU * t / (2 * WT);
    return sexton(K({ ...CARRY, roll: 0.04 * Math.sin(w), twist: 0.07 * Math.sin(w), el: CARRY.el + 0.05 * Math.sin(w), lz: P0.handL.z + 0.05 * Math.sin(w + Math.PI), ly: P0.handL.y + 0.01 * Math.abs(Math.sin(w)) }), { lift: 0.006 * Math.abs(Math.cos(w)) - 0.006 }); },
  legs: (t) => ({ HL: gaitFoot(t, GAIT, GF.HL), HR: gaitFoot(t, GAIT, GF.HR) }),
});
const turn = (dir) => {
  const g = { T: WT, duty: 0.62, v: 0, omega: dir * Math.PI, pivot: [0, 0] };
  return clip({
    dur: WT * 2, loop: true, gait: g,
    pose: (t) => sexton(K({ ...CARRY, lean: 0.08, el: -1.3, twist: 0.08 * dir }), { turn: 0.2 * dir }),
    legs: (t) => ({ HL: gaitFoot(t, g, { ...GF.HL, lift: 0.025 }), HR: gaitFoot(t, g, { ...GF.HR, lift: 0.025 }) }),
  });
};

// ------------------------------------------------------------------------------------------------ the dig
// The game's dig (facet/sexton.js, Kesh's 3-hit shape): down on its right knee, the chop driven in from its right, the
// chop from its left, then both hands on the shaft for the stamp straight down, the biggest; on the sim's dig tick the
// spade's flat pats the earth twice (the bury: the snare goes in 1.8 u toward its target); up, the spade set back on its
// blade. Each chop: the raise the first 45%, the drive to 75%, the hit held. Poses re-laid for the upright spade.
const KNEEL = K({ push: 0.02, crouch: 0.1, lean: 0.38, head: 0.15, gx: -0.12, gy: 0.5, gz: 0.2, el: -1.2, az: 0.05, lx: 0.16, ly: 0.36, lz: 0.08, eye: 0.4 });
const R1 = K({ push: 0.0, crouch: 0.09, lean: 0.3, twist: -0.3, roll: -0.05, head: 0.05, gx: -0.19, gy: 0.66, gz: 0.08, el: -0.12, az: -1.25, lx: 0.16, ly: 0.38, lz: 0.06, eye: 0.5 });
const D1 = K({ push: 0.04, crouch: 0.12, lean: 0.5, twist: 0.08, roll: 0.03, head: 0.25, gx: -0.07, gy: 0.4, gz: 0.24, el: -1.0, az: 0.15, lx: 0.16, ly: 0.33, lz: 0.1, eye: 0.6 });
const R2 = K({ push: 0.0, crouch: 0.09, lean: 0.32, twist: 0.3, roll: 0.05, head: 0.05, gx: -0.03, gy: 0.66, gz: 0.14, el: -0.12, az: 1.25, lx: 0.18, ly: 0.4, lz: 0.0, eye: 0.6 });
const D2 = K({ push: 0.04, crouch: 0.12, lean: 0.5, twist: -0.08, roll: -0.03, head: 0.25, gx: -0.07, gy: 0.4, gz: 0.24, el: -1.0, az: -0.15, lx: 0.16, ly: 0.33, lz: 0.1, eye: 0.7 });
const R3 = K({ push: -0.02, crouch: 0.06, lean: 0.15, head: -0.05, gx: -0.04, gy: 0.74, gz: 0.17, el: -1.45, az: 0.0, two: 1, eye: 0.7 });
const D3 = K({ push: 0.05, crouch: 0.13, lean: 0.55, head: 0.2, gx: -0.04, gy: 0.38, gz: 0.25, el: -1.4, az: 0.0, two: 1, eye: 0.8 });
const PAT = K({ push: 0.06, crouch: 0.13, lean: 0.6, head: 0.22, gx: -0.04, gy: 0.34, gz: 0.26, el: -1.3, az: 0.0, two: 1, eye: 1 });
const CHOPS = [[R1, D1], [R2, D2], [R3, D3]];
const KN = 0.12, CHOP = (36 / 60 - 0.12) / 3, BURY = 0.14, RISE = 0.3, RESTD = 0.2;
export const BURY_AT = KN + 3 * CHOP; export const DIG = BURY_AT + BURY + RISE + RESTD;
export const CHOP_HIT = [0, 1, 2].map((i) => KN + i * CHOP + 0.75 * CHOP);
const ease = { inOut: smooth, in: (k) => c01(k) ** 2, out: (k) => 1 - (1 - c01(k)) ** 2 };
function digPose(t) {
  if (t < KN) return mix(REST, KNEEL, ease.inOut(t / KN));
  if (t < BURY_AT) { const c = Math.min(2, Math.floor((t - KN) / CHOP)), k = (t - KN - c * CHOP) / CHOP; const prev = c === 0 ? KNEEL : CHOPS[c - 1][1]; const [Ra, Dr] = CHOPS[c];
    if (k < 0.45) return mix(prev, Ra, ease.inOut(k / 0.45)); if (k < 0.75) return mix(Ra, Dr, ease.in((k - 0.45) / 0.3)); return { ...Dr }; }
  let a = t - BURY_AT;
  if (a < BURY) { const o = mix(D3, PAT, ease.out(Math.min(1, a / BURY * 2.5))); o.gy -= 0.025 * Math.max(0, Math.sin(a / BURY * TAU)); return o; }
  a -= BURY; if (a < RISE) return mix(PAT, REST, ease.inOut(a / RISE));
  return { ...REST };
}
export const EYE_DIG = (t) => digPose(t).eye;
// the knees: the right knee goes down, its foot back on its toe; the left foot steps forward
const digLegs = (t, W) => { const down = t < KN ? smooth(t / KN) : t < BURY_AT + BURY ? 1 : 1 - smooth((t - BURY_AT - BURY) / RISE);
  const moving = (t > 0 && t < KN) || (t > BURY_AT + BURY && t < BURY_AT + BURY + RISE), up = moving ? 0.02 * Math.sin(Math.PI * (t < KN ? t / KN : (t - BURY_AT - BURY) / RISE)) : 0;
  return { HL: { p: REST_T.HL.clone().add(V3(0, up, 0.05 * down + W.tz)), lock: !moving }, HR: { p: REST_T.HR.clone().add(V3(0.01 * down, up, -0.13 * down + W.tz)), lock: !moving, pitch: 1.1 * down } }; };
const dig = clip({
  dur: DIG, contact: [...CHOP_HIT, BURY_AT],
  phases: [['down on a knee', 0], ['the chop from its right', KN], ['the chop from its left', KN + CHOP], ['the stamp, both hands', KN + 2 * CHOP],
           ['contact: the snare patted down, buried 1.8 u off', BURY_AT], ['up, the spade set down', BURY_AT + BURY], ['rest', BURY_AT + BURY + RISE]],
  pose: (t) => sexton(digPose(t)),
  legs: digLegs,
});

// ------------------------------------------------------------------------------------------------ the snare springs
// The game's spring (the sexton plays no part in it): a hero steps onto the armed snare, an Ember ring r 0.95 rises for
// 42 ticks while the teeth climb, then the jaws snap: 11 and a 60% slow for 75 ticks. Mine: it leans on its spade and
// watches, the head coming up as the ring rises, and at the snap a hunched shake of a laugh.
export const TRIP_AT = 0.7, SNAP_AT = TRIP_AT + 42 / 60, HOLD = 75 / 60; export const SPRING = SNAP_AT + HOLD + 0.45;
const spring = clip({
  dur: SPRING, contact: [TRIP_AT, SNAP_AT],
  phases: [['a hero walks onto the armed snare', 0], ['sprung: the Ember ring rises', TRIP_AT], ['the jaws snap: 11 and slowed', SNAP_AT], ['held, slowed 60%', SNAP_AT + 0.2], ['free', SNAP_AT + HOLD]],
  pose: (t) => { const watch = smooth(t / 0.5) * (1 - smooth((t - SNAP_AT - HOLD) / 0.4)), rise = c01((t - TRIP_AT) / (SNAP_AT - TRIP_AT)), laugh = pulse(t, SNAP_AT, SNAP_AT + 0.08, SNAP_AT + 0.7, SNAP_AT + 1.0);
    const sh = laugh * Math.max(0, Math.sin((t - SNAP_AT) * TAU * 4.5));
    return sexton(K({ lean: 0.04 + 0.1 * watch - 0.05 * rise * watch + 0.05 * sh, head: -0.05 * watch - 0.15 * rise * (1 - laugh) + 0.1 * sh, gy: GRIP0.y + 0.015 * sh, gz: GRIP0.z + 0.03 * watch, ly: P0.handL.y + 0.02 * sh, eye: 0.3 * watch + 0.5 * rise * watch }), { lift: 0.004 * sh }); },
  plant: () => ({}),
});
export const EYE_SPRING = (t) => { const watch = smooth(t / 0.5) * (1 - smooth((t - SNAP_AT - HOLD) / 0.4)), rise = c01((t - TRIP_AT) / (SNAP_AT - TRIP_AT)); return 0.3 * watch + 0.5 * rise * watch; };

// ------------------------------------------------------------------------------------------------ hurt
const hurt = clip({
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = c01(t / 0.05) * (1 - smooth((t - 0.05) / 0.35));
    return sexton(K({ lean: -0.22 * k, head: -0.3 * k, twist: 0.12 * k, ly: P0.handL.y + 0.04 * k, lz: P0.handL.z - 0.04 * k })); },
});

// ------------------------------------------------------------------------------------------------ spawn
// The game's grow-in (7 frames, about 10% over), then mine: it rises out of its hunch and sets its spade down on its blade.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = clip({
  dur: 1.2, contact: [0.75], scale: spawnScale,
  phases: [['grows in', 0], ['straightens, the spade lifted', 0.25], ['sets it down on its blade', 0.75]],
  pose: (t) => { const r = pulse(t, 0.3, 0.6, 0.72, 0.8);
    return sexton(K({ lean: 0.3 * (1 - smooth(t / 0.6)), head: 0.3 * (1 - smooth(t / 0.6)), gy: GRIP0.y + 0.05 * r, gz: GRIP0.z + 0.02 * r })); },
});

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe where it stands). Struck, it rocks back; its knees give and it sags onto its spade, then
// topples forward onto its face, the spade still in its fist going down flat ahead of it.
const TIP = 1.45;
const deathState = (t) => ({ hit: pulse(t, 0, 0.05, 0.12, 0.35), kneel: smooth((t - 0.2) / 0.45), tip: TIP * c01((t - 0.75) / 0.5) ** 2, fall: c01((t - 0.75) / 0.5) });
const LOWT = 1 / 30;
const LOW = [0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.004,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.004,0.004,0.003,-0.001,-0.007,-0.030,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072,-0.072];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t / LOWT, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
function deathPose(t, probe) {
  const { hit, kneel, tip, fall } = deathState(t);
  const g = K({ lean: -0.25 * hit + 0.35 * kneel, head: -0.3 * hit + 0.3 * kneel, crouch: 0.1 * kneel, gx: GRIP0.x + 0.03 * kneel, gy: GRIP0.y - 0.12 * kneel, gz: GRIP0.z + 0.1 * kneel, lx: P0.handL.x - 0.02 * kneel, ly: P0.handL.y - 0.05 * kneel, lz: P0.handL.z + 0.12 * kneel });
  const p = sexton(g, tip > 1e-4 ? { tip } : {});
  p.bp = -tip;
  p.oy += probe ? 0 : -lowAt(t) + 0.002;
  return p;
}
const deathLegs = (t, W) => { const { kneel } = deathState(t);
  const f = smooth(deathState(t).fall); // as it topples the legs stretch out behind, the boots laid on their toes
  return { HL: { p: REST_T.HL.clone().add(V3(0, 0, -0.06 * kneel - 0.3 * f + W.tz)), lock: false, pitch: 0.5 * kneel + 0.9 * f }, HR: { p: REST_T.HR.clone().add(V3(0, 0, -0.1 * kneel - 0.3 * f + W.tz)), lock: false, pitch: 0.7 * kneel + 0.8 * f } }; };
const death = clip({
  dur: 2.2, contact: [0.02, 1.25],
  phases: [['struck: rocks back', 0], ['the knees give; sags on its spade', 0.2], ['topples forward', 0.75], ['lies still', 1.35]],
  pose: (t) => deathPose(t, false),
  legs: deathLegs,
});
const probe = clip({ dur: 2.2, pose: (t) => deathPose(t, true), legs: deathLegs });
export const CLIPS = process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), dig, spring, hurt, spawn, death };
