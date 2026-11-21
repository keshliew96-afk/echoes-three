// The Slag Golem's moves. Units are model units (the model is 1 tall to the rake's top; the page draws it CFG.unit = 1.7
// times bigger, a hulk well over the 1 u hero). Timings come from the game: src/sim/enemies/slag.js (64 health, plods at
// 1.25 u/s; within 1.9 u it rears and marks a slam: an Ember ring r 1.4 centred 1.0 u in front of it for 56 ticks, then 14
// and a slag pool r 1.3 (30% slow, 240 ticks); the crust takes 40% less, but after a slam the core shows for 120 ticks and
// it takes 40% more; cooldown 210 ticks) and its rig in src/render/enemies/kiln.js (the plod's sway, the rear with both fists
// overhead, down in 0.1 s, the 0.6 s straighten, the plates knitting over the core's last 30 ticks). The arms are laid by
// two-bone IK onto wrist targets in the facing frame, turned into the bones' local rotations for the kit.
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
  name: 'slag', unit: 1.7,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['head', 'h']],
  extras: [['clvL', 'kL'], ['clvR', 'kR'], ['armL', QF('qaL')], ['foreL', QF('qfL')], ['handL', 'wL'], ['armR', QF('qaR')], ['foreR', QF('qfR')], ['handR', 'wR']],
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
const CH = { hips: 'b', spine: 's', chest: 'c', head: 'h', clvL: 'kL', clvR: 'kR', handL: 'wL', handR: 'wR' };
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
// twist (+ toward its left), roll, head (+ down); the fists' wrists (lx, ly, lz and rx, ry, rz); kL/kR the shoulders
// shrugged up (+); heat (0..1, the seams' glow: the page reads it) and core (0..1, the chest open).
const HL0 = P0.handL.clone(), HR0 = P0.handR.clone();
const REST = Object.freeze({ push: 0, crouch: 0, lean: 0.06, twist: 0, roll: 0, head: 0, lx: HL0.x, ly: HL0.y, lz: HL0.z, rx: HR0.x, ry: HR0.y, rz: HR0.z, shrug: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
function slag(g, o = {}) {
  const p = { oy: -g.crouch + (o.lift || 0), oz: g.push, by: o.yaw || 0, br: g.roll * 0.5,
    sp: -0.5 * g.lean, cp: -0.5 * g.lean, sy: 0.45 * g.twist, cy: 0.55 * g.twist, sr: 0.5 * g.roll,
    hp: -0.8 * g.head, hy: 0.8 * (o.turn || 0), kLr: -0.25 * g.shrug, kRr: 0.25 * g.shrug };
  const W = fk(p, ['clvL', 'clvR']);
  const facing = new THREE.Quaternion().setFromAxisAngle(Y, o.yaw || 0);
  const L = armIK('L', V3(g.lx, g.ly, g.lz).applyQuaternion(facing), POLE.L.clone().applyQuaternion(W.QW.chest), W);
  const R = armIK('R', V3(g.rx, g.ry, g.rz).applyQuaternion(facing), POLE.R.clone().applyQuaternion(W.QW.chest), W);
  const put = (pre, q) => { p[pre + 'x'] = q.x; p[pre + 'y'] = q.y; p[pre + 'z'] = q.z; p[pre + 'w'] = q.w; };
  put('qaL', L.la); put('qfL', L.lf); put('qaR', R.la); put('qfR', R.lf);
  return p;
}
function clip(c) { return { ...c, feet: (t, W) => (c.legs ? c.legs(t, W) : legsPlanted(c.plant ? c.plant(t) : {}, W.tz)) }; }
// the fists hung at rest, moved by (dx, dy, dz) in the facing frame, mirrored for the right
const fists = (dl = [0, 0, 0], dr = dl) => ({ lx: HL0.x + dl[0], ly: HL0.y + dl[1], lz: HL0.z + dl[2], rx: HR0.x - dr[0], ry: HR0.y + dr[1], rz: HR0.z + dr[2] });

// ------------------------------------------------------------------------------------------------ idle
// The game's: a slow heavy breath (1.1 rad/s) with the fists hanging. Mine on top: once it rolls its shoulders, the
// fists lifting a little, and settles.
const IP = 5.7; // 1.1 rad/s breath, one cycle; the shoulder roll once
const idle = clip({
  dur: IP, loop: true,
  pose: (t) => { const br = Math.sin(TAU * t / IP), roll = pulse(t, 2.6, 3.1, 3.5, 4.1);
    return slag(K({ lean: 0.06 + 0.02 * br, head: -0.02 * br, shrug: 0.5 * roll + 0.08 * br, ...fists([0.01 * br + 0.02 * roll, 0.006 * br + 0.04 * roll, 0.02 * roll], [0.01 * br + 0.02 * roll, 0.006 * br + 0.04 * roll, 0.02 * roll]) }), { lift: 0.002 * br }); },
});
// ------------------------------------------------------------------------------------------------ walk and turns
// The game's plod: 1.25 u/s, a slow heavy sway side to side with each step (roll 0.07, a little twist), the legs barely
// lifting, the arms knuckling along out of step.
const WT = 0.35;
const GAIT = { T: WT, duty: 0.55, v: 1.25 / U };
const GF = { HL: { phase: 0.1, n: [REST_T.HL.x, REST_T.HL.z], lift: 0.028, droop: 0.4, push: 0.15 }, HR: { phase: 0.6, n: [REST_T.HR.x, REST_T.HR.z], lift: 0.028, droop: 0.4, push: 0.15 } };
const walk = clip({
  dur: WT * 2, loop: true, gait: { ...GAIT },
  pose: (t) => { const w = TAU * t / (2 * WT), st = Math.sin(w), sw = 0.07 * st;
    return slag(K({ crouch: 0.022, lean: 0.12, roll: 0.14 * st, twist: 0.08 * st, head: -0.04, ...fists([0.0, 0.01 + 0.012 * Math.abs(st), 0.06 + sw], [0.0, 0.01 + 0.012 * Math.abs(st), 0.06 - sw]) }), { lift: 0.008 * Math.abs(Math.cos(w)) - 0.008 }); },
  legs: (t) => ({ HL: gaitFoot(t, GAIT, GF.HL), HR: gaitFoot(t, GAIT, GF.HR) }),
});
const turn = (dir) => {
  const g = { T: WT, duty: 0.6, v: 0, omega: dir * Math.PI * 0.75, pivot: [0, 0] };
  return clip({
    dur: WT * 2, loop: true, gait: g,
    pose: (t) => { const st = Math.sin(TAU * t / (2 * WT)); return slag(K({ crouch: 0.012, lean: 0.1, roll: 0.08 * st, twist: 0.1 * dir, ...fists([0, 0.01, 0.03 + 0.04 * dir], [0, 0.01, 0.03 - 0.04 * dir]) }), { turn: 0.25 * dir }); },
    legs: (t) => ({ HL: gaitFoot(t, g, { ...GF.HL, lift: 0.024 }), HR: gaitFoot(t, g, { ...GF.HR, lift: 0.024 }) }),
  });
};

// ------------------------------------------------------------------------------------------------ the slam
// The game's (sim/enemies/slag.js, render/enemies/kiln.js): planted, it rears through the Ember ring's 56 ticks, both
// fists rising overhead, leaning back, the hips up a little, the head tipping back, a tremble once it is up; on the
// resolve tick it brings both fists down hard in 0.1 s, the hips dropping and the body bent in, the floor struck 1 u in
// front (14 and a slag pool r 1.3); then a slow straighten over 0.6 s. The crust is cracked: for 120 ticks (2 s) the core
// shows, the plates knitting back over the last 30 ticks (the page lights the chest).
export const TEL = 56 / 60, SLAM_AT = TEL, OPEN = 120 / 60, KNIT = 30 / 60;
export const SLAM = SLAM_AT + OPEN + 0.25;
const UP = K({ crouch: -0.02, lean: -0.26, head: -0.25, shrug: 1, ...fists([-0.15, 0.5, 0.02], [-0.15, 0.5, 0.02]) });
const DOWN = K({ crouch: 0.07, lean: 0.62, head: 0.15, push: 0.02, shrug: 0.2, ...fists([-0.26, -0.06, 0.38], [-0.26, -0.06, 0.38]) });
export const SLAM_RAISE = (t) => (t < TEL ? smooth(c01(t / (TEL * 0.8))) : 0);
export const SLAM_DOWN = (t) => { const sa = t - SLAM_AT; return sa < 0 ? 0 : sa < 0.1 ? smooth(sa / 0.1) : sa < 0.7 ? 1 - smooth((sa - 0.1) / 0.6) : 0; };
export const CORE = (t) => { const sa = t - SLAM_AT; if (sa < 0) return 0; const left = OPEN - sa; return left <= 0 ? 0 : Math.min(1, sa / 0.08, left / KNIT); };
function slamPose(t) {
  const raise = SLAM_RAISE(t), down = SLAM_DOWN(t);
  if (t < SLAM_AT) { const tr = raise > 0.95 ? 0.006 * Math.sin(t * 40) : 0; const g = mix(REST, UP, raise); g.ly += tr; g.ry -= tr; return g; }
  const sa = t - SLAM_AT;
  if (sa < 0.1) return mix(UP, DOWN, smooth(sa / 0.1) ** 1.5);
  return mix(REST, DOWN, down);
}
const slamLegs = (t, W) => { const raise = SLAM_RAISE(t), down = SLAM_DOWN(t);
  return { HL: plant(REST_T.HL.clone().add(V3(0, 0, W.tz))), HR: plant(REST_T.HR.clone().add(V3(0, 0, W.tz))) }; };
const slam = clip({
  dur: SLAM, contact: [SLAM_AT, SLAM_AT + OPEN],
  phases: [['rears, both fists overhead; the Ember ring marks 1 u in front', 0], ['the slam: 14, a slag pool r 1.3', SLAM_AT], ['straightens', SLAM_AT + 0.1],
           ['the crust cracked: the core shows, it takes 40% more', SLAM_AT + 0.7], ['the crust knits back', SLAM_AT + OPEN - KNIT], ['shut: it takes 40% less again', SLAM_AT + OPEN]],
  pose: (t) => slag(slamPose(t)),
  legs: slamLegs,
});

// ------------------------------------------------------------------------------------------------ hurt
// The crust turns blows (40% less, knockback x0.3): a short stiff jolt of the shoulders and head.
const hurt = clip({
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = c01(t / 0.05) * (1 - smooth((t - 0.05) / 0.35));
    return slag(K({ lean: 0.06 - 0.12 * k, head: -0.2 * k, twist: 0.08 * k, ...fists([0.02 * k, 0.02 * k, -0.04 * k]) })); },
});

// ------------------------------------------------------------------------------------------------ spawn
// The game's grow-in (7 frames, about 10% over), then mine: it heaves itself up out of a crouch, the fists set down.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
export const SPAWN_AT = 0.75;
const spawn = clip({
  dur: 1.3, contact: [SPAWN_AT], scale: spawnScale,
  phases: [['grows in', 0], ['heaves itself up', 0.25], ['the fists set down', SPAWN_AT]],
  pose: (t) => { const u = 1 - smooth((t - 0.2) / 0.55), set = pulse(t, 0.55, 0.7, 0.78, 1.0);
    return slag(K({ crouch: 0.05 * u, lean: 0.06 + 0.4 * u, head: 0.2 * u, shrug: 0.4 * set, ...fists([-0.04 * u, -0.04 * u + 0.03 * set, 0.12 * u]) })); },
});

// ------------------------------------------------------------------------------------------------ death
// Mine (the game crumbles it where it stands). Struck, it rocks back, the seams flaring; its knees give and it sinks,
// then it topples forward onto its face, the fists flung out ahead to land first.
const TIP = 1.52;
export const deathState = (t) => ({ hit: pulse(t, 0, 0.05, 0.12, 0.35), kneel: smooth((t - 0.2) / 0.5), tip: TIP * c01((t - 0.8) / 0.5) ** 2, fall: c01((t - 0.8) / 0.5) });
export const LAND_AT = 1.3;
const LOWT = 1 / 30;
const LOW = [0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.002,0.001,0.000,-0.001,-0.001,-0.002,-0.002,-0.003,-0.003,-0.003,-0.003,-0.003,-0.003,-0.003,-0.003,-0.003,-0.003,-0.003,-0.004,-0.004,-0.004,-0.004,-0.005,-0.005,-0.005,-0.006,-0.006,-0.006,-0.007,-0.007,-0.007,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t / LOWT, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
function deathPose(t, probe) {
  const { hit, kneel, tip } = deathState(t), f = smooth(c01((t - 0.75) / 0.45));
  const g = K({ lean: 0.06 - 0.25 * hit + 0.3 * kneel, head: -0.3 * hit + 0.25 * kneel, crouch: 0.08 * kneel, shrug: 0.3 * hit,
    ...fists([-0.02 * kneel + 0.05 * f, -0.04 * kneel + 0.04 * f, 0.08 * kneel - 0.14 * f]) });
  const p = slag(g);
  p.bp = -tip;
  p.oy += probe ? 0 : -lowAt(t) + 0.002;
  return p;
}
const deathLegs = (t, W) => { const { kneel } = deathState(t), f = smooth(deathState(t).fall);
  return { HL: { p: REST_T.HL.clone().add(V3(0, 0, -0.05 * kneel - 0.24 * f + W.tz)), lock: false, pitch: 0.4 * kneel + 0.9 * f }, HR: { p: REST_T.HR.clone().add(V3(0, 0, -0.08 * kneel - 0.24 * f + W.tz)), lock: false, pitch: 0.55 * kneel + 0.8 * f } }; };
const death = clip({
  dur: 2.3, contact: [0.02, LAND_AT],
  phases: [['struck: rocks back, the seams flaring', 0], ['the knees give; it sinks', 0.2], ['topples forward', 0.8], ['lands: the seams go dark', LAND_AT], ['lies still', 1.6]],
  pose: (t) => deathPose(t, false),
  legs: deathLegs,
});
const probe = clip({ dur: 2.3, pose: (t) => deathPose(t, true), legs: deathLegs });
export const CLIPS = process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), slam, hurt, spawn, death };
