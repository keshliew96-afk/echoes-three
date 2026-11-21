// The Vein Lancer's moves. Units are model units (the model is 1 tall with its spear; the page draws it CFG.unit = 2.2
// times bigger, so the body stands 1.76 u like the game's stilt-legged lancer). Timings come from the game:
// src/sim/enemies/lancer.js (walks 1.5 u/s keeping 3.4 to 5.6 u off; within 6.2 u it plants, locks its aim and marks an
// Ember lane 0.8 wide and up to 7 long for 54 ticks, then every hero in the lane takes 10 at once; cooldown 240) and its
// rig src/render/enemies/facet/lancer.js (the three throws on the foe strike timeline with the game's key poses C1..O3:
// over the shoulder, side-arm, the plunge; the strike the last 2.5 frames of the telegraph, the contact held 3 frames,
// snap 3 frames, settle 9, rest 0.35 s; the spear gone from the hand at the contact and reformed from the veins 0.12 to
// 0.62 s after; the veins and the spear brighten with the aim).
// The game lays its arms by IK onto hand targets; so does this file: a two-bone solve per arm onto the game's targets
// (taken as offsets from Kesh's own rest hands), and the spear aimed in the world, then both turned into the bones' local
// rotations for the kit.
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
  name: 'lancer', unit: 2.2,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['clvL', 'kL'], ['clvR', 'kR'], ['armL', QF('qaL')], ['foreL', QF('qfL')], ['handL', 'wL'], ['armR', QF('qaR')], ['foreR', QF('qfR')], ['handR', 'wR'], ['spear', QF('qs')]],
  scales: [['spear', ['spx', 'spy', 'spz']], ['spine', ['ssx', 'ssy', 'ssz']]],
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

// --- a mirror of the kit's forward pass for the trunk and the clavicles (the same rotation order), so the arms can be
// solved onto world targets
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
// solve one arm: the shoulder from the trunk, the hand onto T (world), the elbow toward the pole; returns local rotations
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

// --- the game's pose fields (facet/lancer.js REST): push (u along +z), crouch (u), lean (torso forward +), twist (+ to
// its left), roll, head (+ down), sx / sy (squash), lx/ly/lz and rx/ry/rz (the hands, u, in the facing frame), sp (the
// spear's pitch, + point up), sy2 (its yaw, + to its left), slide, aim (0..1 the tell). The hands go where the game puts
// them, measured from Kesh's own rest hands; the spear's pitch maps the game's carried 0.6 to his upright spear and its
// thrown -0.05 to level.
const REST = Object.freeze({ push: 0, crouch: 0, lean: 0.05, twist: 0, roll: 0, head: 0, sx: 1, sy: 1, lx: 0.2, ly: 0.74, lz: 0.05, rx: -0.21, ry: 0.95, rz: 0.1, sp: 0.6, sy2: 0, slide: 0, aim: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const HAND0 = { L: P0.handL.clone(), R: P0.handR.clone() }; // the wrists as Kesh posed them
// each elbow's pole: the way the bind elbow bows off the shoulder-to-wrist line (so the rest pose is his), carried by the chest
const POLE = {}; for (const s of ['L', 'R']) { const a = P0['arm' + s], f = P0['fore' + s], h = P0['hand' + s]; const d = h.clone().sub(a).normalize(); const e = f.clone().sub(a); POLE[s] = e.addScaledVector(d, -e.dot(d)).normalize(); }
const spearDir0 = END.spear.clone().sub(P0.spear).normalize(), EL0 = Math.asin(spearDir0.y);
function lancer(g, o = {}) {
  const lean = g.lean - REST.lean;
  const p = { oy: -g.crouch / U + (o.lift || 0), oz: g.push / U, by: o.yaw || 0, br: g.roll * 0.5,
    sp: -0.55 * lean, cp: -0.45 * lean, sy: 0.45 * g.twist, cy: 0.55 * g.twist, sr: 0.5 * g.roll,
    np: -0.4 * g.head, hp: -0.6 * g.head + (o.look || 0) * 0, ny: o.turn || 0,
    ssx: 0.5 * (g.sx - 1), ssy: 0.5 * (g.sy - 1), ssz: 0.5 * (g.sx - 1) };
  const W = fk(p, ['clvL', 'clvR']);
  const facing = new THREE.Quaternion().setFromAxisAngle(Y, o.yaw || 0);
  const tgt = (s, gx, gy, gz, r0) => HAND0[s].clone().add(V3(gx - r0[0], gy - r0[1], gz - r0[2]).multiplyScalar(1 / U).applyQuaternion(facing)).add(V3(0, 0, 0));
  const L = armIK('L', tgt('L', g.lx, g.ly, g.lz, [REST.lx, REST.ly, REST.lz]).add(V3(o.lsw || 0, 0, o.lfw || 0)), POLE.L.clone().applyQuaternion(W.QW.chest), W);
  const R = armIK('R', tgt('R', g.rx, g.ry, g.rz, [REST.rx, REST.ry, REST.rz]).add(V3(0, 0, o.rfw || 0)), POLE.R.clone().applyQuaternion(W.QW.chest), W);
  // the spear in the world: pitched by the game's sp (mapped onto the upright spear), yawed by sy2 (+ to its left)
  const el = clamp(EL0 + (g.sp - 0.6) * 2.3, -0.66, EL0) + (o.spl || 0), az = g.sy2 + (o.yaw || 0);
  const dir = V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const handQ = R.qf; // the right hand follows its forearm (hand local identity)
  const qsW = qFromTo(spearDir0, X, dir, V3(Math.cos(az), 0, -Math.sin(az)));
  const qs = handQ.clone().invert().multiply(qsW);
  const put = (pre, q) => { p[pre + 'x'] = q.x; p[pre + 'y'] = q.y; p[pre + 'z'] = q.z; p[pre + 'w'] = q.w; };
  put('qaL', L.la); put('qfL', L.lf); put('qaR', R.la); put('qfR', R.lf); put('qs', qs);
  const sc = o.spear ?? 1; p.spx = p.spy = p.spz = Math.max(0.001, sc) - 1;
  return p;
}
const KNEE = { oy: -0.003 };
function clip(c) { const pose = (t) => addPose(KNEE, c.pose(t)); return { ...c, pose, feet: (t, W) => (c.legs ? c.legs(t, W) : legsPlanted(c.plant ? c.plant(t) : {}, W.tz)) }; }

// ------------------------------------------------------------------------------------------------ idle
// Mine (the game's lancer is never still for long): it breathes, the free hand twitching, the spear swaying in its grip;
// it turns its head one way, then the other, and grounds the spear once.
const IP = 4.4;
const idle = clip({
  dur: IP, loop: true,
  pose: (t) => { const br = Math.sin(TAU * t / 2.2), look = 0.35 * pulse(t, 0.5, 0.9, 1.5, 1.9) - 0.3 * pulse(t, 2.6, 3.0, 3.6, 4.0);
    return lancer(K({ head: -0.02 * br, sp: 0.6 + 0.02 * Math.sin(TAU * t / 4.4), ly: 0.74 + 0.01 * br }), { lift: 0.002 * br, turn: look }); },
});
// ------------------------------------------------------------------------------------------------ walk and turns
// The game's 1.5 u/s on stilt legs, leaning into the travel; the free arm swings, the spear carried.
const WT = 0.425;
const GAIT = { T: WT, duty: 0.6, v: 1.5 / U };
const GF = { HL: { phase: 0.1, n: [REST_T.HL.x, REST_T.HL.z], lift: 0.035, droop: 0.5, push: 0.2 }, HR: { phase: 0.6, n: [REST_T.HR.x, REST_T.HR.z], lift: 0.035, droop: 0.5, push: 0.2 } };
const walk = clip({
  dur: WT * 2, loop: true, gait: { ...GAIT },
  pose: (t) => { const w = TAU * t / WT;
    return lancer(K({ lean: 0.12, roll: 0.03 * Math.sin(w), twist: 0.06 * Math.sin(w), sp: 0.6 + 0.04 * Math.sin(w) }), { lift: 0.006 * Math.abs(Math.cos(w)) - 0.004, lfw: 0.05 * Math.sin(w + Math.PI) }); },
  legs: (t) => ({ HL: gaitFoot(t, GAIT, GF.HL), HR: gaitFoot(t, GAIT, GF.HR) }),
});
const turn = (dir) => {
  const g = { T: WT, duty: 0.62, v: 0, omega: dir * Math.PI, pivot: [0, 0] };
  return clip({
    dur: WT * 2, loop: true, gait: g,
    pose: (t) => lancer(K({ twist: 0.08 * dir }), { turn: 0.15 * dir }),
    legs: (t) => ({ HL: gaitFoot(t, g, { ...GF.HL, lift: 0.03 }), HR: gaitFoot(t, g, { ...GF.HR, lift: 0.03 }) }),
  });
};

// ------------------------------------------------------------------------------------------------ the lances
// The game's three throws in turn (its key poses), each on its own 54-tick lane: the coil runs through the telegraph
// (planted, twisted away, the spear drawn back and brightening, the off hand pointing down the lane), the thrust takes
// the last 2.5 frames and lands on the resolve (every hero in the lane takes 10), the spear is gone from the hand,
// the contact holds 3 frames, it snaps back and settles while the spear grows back from the veins.
const C1 = K({ push: -0.04, crouch: 0.03, lean: -0.12, twist: -0.45, head: -0.08, sx: 0.97, sy: 1.03, lx: 0.2, ly: 1.15, lz: 0.42, rx: -0.24, ry: 1.42, rz: -0.3, sp: 0.2, slide: -0.25, aim: 1 });
const S1 = K({ push: 0.1, crouch: 0.02, lean: 0.25, twist: 0.3, head: 0.12, sx: 1.12, sy: 0.92, lx: 0.24, ly: 0.9, lz: 0.08, rx: 0.06, ry: 1.2, rz: 0.56, sp: -0.05, slide: 0.35, aim: 0.6 });
const O1 = K({ push: 0.08, crouch: 0.01, lean: 0.2, twist: 0.36, head: 0.08, sx: 1.03, sy: 0.98, lx: 0.24, ly: 0.86, lz: 0.08, rx: 0.1, ry: 1.1, rz: 0.5, sp: -0.1, slide: 0.3, aim: 0.25 });
const C2 = K({ push: -0.04, crouch: 0.04, lean: 0.05, twist: -0.6, roll: 0.06, head: -0.04, sx: 0.97, sy: 1.03, lx: 0.26, ly: 1.0, lz: 0.4, rx: -0.46, ry: 0.95, rz: -0.26, sp: 0.05, sy2: -0.45, slide: -0.2, aim: 1 });
const S2 = K({ push: 0.1, crouch: 0.03, lean: 0.2, twist: 0.35, roll: -0.06, head: 0.1, sx: 1.12, sy: 0.92, lx: 0.26, ly: 0.85, lz: -0.1, rx: 0.14, ry: 0.95, rz: 0.56, sp: -0.05, sy2: 0, slide: 0.35, aim: 0.6 });
const O2 = K({ push: 0.08, crouch: 0.02, lean: 0.15, twist: 0.4, roll: -0.08, head: 0.06, sx: 1.03, sy: 0.98, lx: 0.26, ly: 0.82, lz: -0.08, rx: 0.2, ry: 0.9, rz: 0.5, sp: -0.1, slide: 0.3, aim: 0.25 });
const C3 = K({ push: -0.05, crouch: -0.02, lean: -0.2, twist: -0.1, head: -0.15, sx: 0.96, sy: 1.05, lx: 0.1, ly: 1.42, lz: 0.08, rx: -0.12, ry: 1.5, rz: -0.12, sp: -0.35, slide: -0.2, aim: 1 });
const S3 = K({ push: 0.14, crouch: 0.1, lean: 0.4, twist: 0.05, head: 0.2, sx: 1.16, sy: 0.88, lx: 0.1, ly: 0.82, lz: 0.6, rx: -0.06, ry: 0.86, rz: 0.56, sp: -0.4, slide: 0.4, aim: 0.6 });
const O3 = K({ push: 0.1, crouch: 0.06, lean: 0.3, twist: 0.05, head: 0.12, sx: 1.04, sy: 0.98, lx: 0.12, ly: 0.8, lz: 0.5, rx: -0.08, ry: 0.84, rz: 0.48, sp: -0.35, slide: 0.3, aim: 0.25 });
const THROWS = [{ coil: C1, strike: S1, over: O1 }, { coil: C2, strike: S2, over: O2 }, { coil: C3, strike: S3, over: O3 }];
export const TEL = 54 / 60;
const STRIKE = 2.5 * FR, HOLD = 3 * FR, SNAP = 3 * FR, SETTLE = 9 * FR, RESTS = 0.35;
const COIL = TEL - STRIKE; export const ONE = COIL + STRIKE + HOLD + SNAP + SETTLE + RESTS;
const coilCurve = (k) => { const c = c01(k); return 0.85 * (1 - (1 - Math.min(1, c / 0.4)) ** 2) + 0.15 * c; };
const kick = (k) => { const c = c01(k); return 1 - (1 - c) ** 3; };
const settleC = (k) => { const c = c01(k); return smooth(c) - 0.12 * Math.sin(Math.PI * c) * (1 - c); };
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
function throwPose(V, t) {
  if (t < COIL) return mix(REST, V.coil, coilCurve(t / COIL));
  let a = t - COIL; if (a < STRIKE) return mix(V.coil, V.strike, kick(a / STRIKE));
  a -= STRIKE; if (a < HOLD) return { ...V.strike };
  a -= HOLD; if (a < SNAP) return mix(V.strike, V.over, 1 - (1 - a / SNAP) ** 2);
  a -= SNAP; if (a < SETTLE) return mix(V.over, REST, settleC(a / SETTLE));
  return { ...REST };
}
const spearReform = (since) => (since < 0 ? 1 : since < 0.12 ? 0 : Math.min(1, (since - 0.12) / 0.5));
export const LANCE_AT = [TEL, ONE + TEL, 2 * ONE + TEL];
const lances = clip({
  dur: 3 * ONE, contact: LANCE_AT,
  phases: [['1, over the shoulder: aims, the Ember lane marks', 0], ['the thrust: 10 to every hero in the lane', TEL], ['settles, the spear reforms', TEL + 0.2],
           ['2, side-arm: aims', ONE], ['the thrust', ONE + TEL], ['settles', ONE + TEL + 0.2],
           ['3, the plunge: aims, both hands', 2 * ONE], ['the thrust', 2 * ONE + TEL], ['settles', 2 * ONE + TEL + 0.2]],
  pose: (t) => { const k = Math.min(2, Math.floor(t / ONE)), tt = t - k * ONE; const g = throwPose(THROWS[k], tt);
    return lancer(g, { spear: spearReform(tt - TEL) }); },
});
export const AIM = (t) => { const k = Math.min(2, Math.floor(t / ONE)); return throwPose(THROWS[k], t - k * ONE).aim; };

// ------------------------------------------------------------------------------------------------ hurt
const hurt = clip({
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = c01(t / 0.05) * (1 - smooth((t - 0.05) / 0.35));
    return lancer(K({ lean: 0.05 - 0.25 * k, head: -0.35 * k, twist: 0.1 * k, lx: 0.2 + 0.1 * k, ly: 0.74 + 0.15 * k })); },
});

// ------------------------------------------------------------------------------------------------ spawn
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = clip({
  dur: 1.3, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['the spear forms from the veins', 0.25], ['grounds it', 0.8]],
  pose: (t) => { const r = pulse(t, 0.2, 0.45, 0.8, 1.1);
    return lancer(K({ head: 0.15 * (1 - smooth(t / 0.6)), ry: 0.95 + 0.12 * r, lean: 0.05 - 0.05 * r }), { spear: c01((t - 0.25) / 0.45), lift: 0.004 * r }); },
});

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it rocks back; the spear falls from its hand (it crumbles to
// nothing); the stilt legs fold and it drops to its knees, then topples forward onto its face.
const TIP = 1.45;
const deathState = (t) => {
  const hit = pulse(t, 0, 0.05, 0.12, 0.35), kneel = smooth((t - 0.2) / 0.45), tip = TIP * c01((t - 0.55) / 0.5) ** 2;
  return { hit, kneel, tip };
};
const LOWT = 1 / 30;
const LOW = [0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t / LOWT, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
function deathPose(t, probe) {
  const { hit, kneel, tip } = deathState(t);
  const g = K({ lean: 0.05 - 0.25 * hit + 0.3 * kneel, head: -0.3 * hit + 0.3 * kneel, lx: 0.2 + 0.1 * kneel, ly: 0.74 - 0.1 * kneel, lz: 0.05 + 0.15 * kneel, rx: -0.21 - 0.05 * kneel, ry: 0.95 - 0.12 * kneel, rz: 0.1 + 0.15 * kneel });
  const p = lancer(g, { spear: 1 - c01((t - 0.25) / 0.4) });
  p.bp = -tip; // the topple: the whole body pitches forward about the hips
  const sink = 0.12 * kneel;
  p.oy = probe ? -sink : Math.max(-sink, -sink - lowAt(t)) + 0.01 * pulse(t, 0.95, 1.0, 1.05, 1.2);
  return p;
}
const deathLegs = (t, W) => { const { kneel, tip } = deathState(t); const k = kneel;
  // the knees go down: the feet slide back and the toes lie flat behind as the hips drop
  return { HL: { p: REST_T.HL.clone().add(V3(0, 0, -0.1 * k + W.tz)), lock: false }, HR: { p: REST_T.HR.clone().add(V3(0, 0, -0.12 * k + W.tz)), lock: false } }; };
const death = clip({
  dur: 2.2, contact: [0.02, 1.0],
  phases: [['struck: rocks back', 0], ['the spear falls; to its knees', 0.2], ['topples forward', 0.55], ['lies still', 1.2]],
  pose: (t) => deathPose(t, false),
  legs: deathLegs,
});
const probe = clip({ dur: 2.2, pose: (t) => deathPose(t, true), legs: deathLegs });
export const CLIPS = process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), lances, hurt, spawn, death };
