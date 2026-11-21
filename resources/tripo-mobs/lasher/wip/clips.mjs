// The Vine Lasher's moves. Units are model units (the pod is 0.6 wide; the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/lasher.js (creeps at 0.8 u/s keeping 2.2 to 4.6 u from its target; with
// it inside 5 u it marks an Ember lane 0.7 wide and up to 5.4 long for 48 ticks, then lashes: 9 damage to everyone in
// the lane and each hero caught is yanked 1.8 u toward the pod over 12 ticks) and its rig
// src/render/enemies/facet/lasher.js (the three-lash chain C/D/S/H/O 1..3: gather 0.25 s, the coil tightening and
// trembling, the throw in the telegraph's last 5 ticks with the pod leading and the reach last, contact on the resolve
// tick held 2 frames, the reel on the yank, snap back 2.5 frames, settle 6 with one overshoot). Its pose fields are
// copied key for key and mapped onto this rig in game() below; the vine's are laid by vine() along this model's
// own vine, which grows from the pod's right side, not its face.
import * as THREE from 'three';
import { readFileSync } from 'fs';
import { gaitFoot, V3, smooth, lerp, clamp, addPose, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
const SK = JSON.parse(readFileSync(new URL('./rig/skel.json', import.meta.url)));
const P0 = (n) => V3(...SK.pos[SK.names.indexOf(n)]);
const NV = 14, VN = [...Array(NV).keys()].map((i) => 'v' + i).concat(['vend']);
const JV = VN.map(P0), SEG = JV.slice(0, NV).map((p, i) => JV[i + 1].clone().sub(p));
const BEND = V3(...SK.ends.vend).sub(JV[NV]).normalize();
const LEN = SEG.map((s) => s.length()), BDIR = SEG.map((s) => s.clone().normalize()), VLEN = LEN.reduce((a, b) => a + b, 0);
const HIPS0 = P0('hips'), POD0 = P0('pod');
const RA = [...Array(8).keys()].map((k) => (k * Math.PI) / 4), ROOTS = RA.map((a, k) => 'R' + k);
export const CFG = {
  name: 'lasher', unit: 1.0, base: { vm: 0 },
  chain: [['hips', 'b'], ['pod', 'k'], ['sq', 'q']],
  extras: [['lipL', 'll'], ['lipR', 'lr'], ...VN.map((n, i) => [n, (p) => vineOf(p).q[i]])],
  slides: VN.slice(1).map((n, i) => [n, 'vs', SEG[i].toArray()]),
  scales: [['sq', ['qsx', 'qsy', 'qsz']]],
  legs: Object.fromEntries(ROOTS.map((k, i) => [k, { kind: 'limb', b: ['a', 'b', 'c', 'd'].map((c) => 'r' + i + c) }])),
  springs: [],
};
const U = CFG.unit;
const SK_END = SK.ends; const REST = Object.fromEntries(ROOTS.map((k, i) => [k, V3(...SK_END['r' + i + 'd'])]));
const plant = (p) => ({ p: p.clone(), lock: true });
const allPlanted = () => Object.fromEntries(ROOTS.map((k) => [k, plant(REST[k])]));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);

// ---- the vine. qPYR as the kit: Y(yaw) X(-pitch) Z(roll)
const AX = { X: V3(1, 0, 0), Y: V3(0, 1, 0), Z: V3(0, 0, 1) };
const qPYR = (p = 0, y = 0, r = 0) => new THREE.Quaternion().setFromAxisAngle(AX.Y, y).multiply(new THREE.Quaternion().setFromAxisAngle(AX.X, -p)).multiply(new THREE.Quaternion().setFromAxisAngle(AX.Z, r));
const FL = 0.03; // the vine's half thickness: it lies on the floor, not in it
const cache = new WeakMap();
function vineOf(p) {
  let v = cache.get(p); if (v) return v;
  v = vineSolve(p); cache.set(p, v); p.vs = v.vs; return v;
}
// Directions are laid in root space: the model's own coil (carried by the hips, swaying), the game's shape (root yaw
// and pitch, a curl per joint heavier toward the tip, the tip's own curl) and the reach (dead straight to a point on the
// floor, the joints sliding apart to get there); then the vine drapes on the floor wherever it would go under it.
export function vineSolve(p) {
  const Qb = qPYR(p.bp, p.by, p.br); const Pb = HIPS0.clone().add(V3(p.ox || 0, p.oy || 0, p.oz || 0));
  const Qh = Qb.clone().multiply(qPYR(p.kp, p.ky, p.kr)); const Ph = Pb.clone().add(POD0.clone().sub(HIPS0).applyQuaternion(Qb));
  const R0 = Ph.clone().add(JV[0].clone().sub(POD0).applyQuaternion(Qh));
  const vm = p.vm || 0, reach = p.reach || 0, sw = p.vsw || 0, st = p.vst || 0;
  // the game's shape, in the hips' frame
  const vy = p.vy || 0, vp = p.vp || 0; let d = V3(Math.sin(vy) * Math.cos(vp), Math.sin(vp), Math.cos(vy) * Math.cos(vp));
  let u = V3(-Math.sin(vy) * Math.sin(vp), Math.cos(vp), -Math.cos(vy) * Math.sin(vp));
  const proc = [];
  for (let i = 0; i < NV; i++) {
    if (i > 0) {
      const w = (0.4 + 1.2 * i / (NV - 1)) * 11 / NV; const tip = i >= NV - 3 ? (p.ct || 0) * 0.8 : 0;
      const qy = new THREE.Quaternion().setFromAxisAngle(u, (p.cy || 0) * w); d.applyQuaternion(qy); u.applyQuaternion(qy);
      const r = V3().crossVectors(d, u).normalize(); const qp = new THREE.Quaternion().setFromAxisAngle(r, (p.cp || 0) * w + tip); d.applyQuaternion(qp); u.applyQuaternion(qp);
    }
    proc.push(d.clone().applyQuaternion(Qh));
  }
  const T = V3(p.vtx || 0, FL, p.vtz || 0); const toT = T.clone().sub(R0); const Ds = toT.clone().normalize();
  const e = 1 + Math.max(0, toT.length() / VLEN - 1) * reach;
  const D = [];
  for (let i = 0; i < NV; i++) {
    const rest = BDIR[i].clone().applyQuaternion(Qh);
    if (sw) rest.applyAxisAngle(AX.Y, sw * (0.05 + 0.02 * i / NV) * Math.sin(TAU * st / 3 - 0.45 * i));
    let di = rest.clone().lerp(proc[i], vm); if (di.lengthSq() < 1e-6) di = proc[i].clone(); di.normalize();
    di.lerp(Ds, reach); if (di.lengthSq() < 1e-6) di.copy(Ds); di.normalize(); D.push(di);
  }
  // drape: no joint below the floor
  let P = R0.clone(); let lowest = 9;
  for (let i = 0; i < NV; i++) {
    const L = LEN[i] * e; const nx = P.clone().addScaledVector(D[i], L); const fl = i >= NV - 3 ? FL + 0.03 * (i - NV + 4) / 3 : FL;
    if (nx.y < fl) { const h = V3(D[i].x, 0, D[i].z); if (h.lengthSq() < 1e-8) h.set(BDIR[i].x, 0, BDIR[i].z); h.normalize(); const dy = clamp((fl - P.y) / L, -1, 1); D[i] = h.multiplyScalar(Math.sqrt(1 - dy * dy)); D[i].y = dy; }
    P.addScaledVector(D[i], L); lowest = Math.min(lowest, P.y);
  }
  // local rotations, carried joint to joint so the vine never twists
  const q = []; let Rp = Qh.clone();
  for (let i = 0; i < NV; i++) {
    const cur = BDIR[i].clone().applyQuaternion(Rp); const Rw = new THREE.Quaternion().setFromUnitVectors(cur, D[i]).multiply(Rp);
    q.push(Rp.clone().invert().multiply(Rw)); Rp = Rw;
  }
  // the end bone carries on straight from the last joint (and stays off the floor)
  const De = D[NV - 1].clone(); const Le = V3(...SK.ends.vend).distanceTo(JV[NV]); if (P.y < 0.12) { De.y = Math.max(De.y, 0.15); De.normalize(); }
  const cur = BEND.clone().applyQuaternion(Rp); const Re = new THREE.Quaternion().setFromUnitVectors(cur, De).multiply(Rp); q.push(Rp.clone().invert().multiply(Re));
  return { q, vs: e - 1, tip: P };
}

// ---- the game's pose fields on this rig
// push (u, +z), pitch (+ leans in), twist (+ toward its left), roll, sx/sy (squash), hop, jaw (the rim's gape, rad: the
// game rests at 0.1, this model's rim is sculpted half open, so it opens and claps relative to that), the vine's vy,
// vp, cy, cp, ct, reach, lw (0 the model's own coil, 1 the game's shape) and sw (the idle sway). The root yaw is
// pulled toward its right, where this vine grows (the game's -0.95..0 becomes -0.68..-0.35); a coil to its left swings
// the root out to its right-front and curls back round in front of the pod, lifted, so it never passes through the pod
// (measured: no vine joint comes within 0.47 of the pod's axis).
const FS = 0.6;
const VYL = 0.4, VPL = 0.25, CYL = 1.4; // a coil to its left swings out and round in front of the pod, clear of it
function game(g) {
  const jaw = (g.jaw ?? 0.1) - 0.1;
  return {
    oz: FS * (g.push || 0) / U, oy: Math.max(0, g.hop || 0) / U, kp: -0.8 * (g.pitch || 0), ky: 0.8 * (g.twist || 0), kr: g.roll || 0,
    qsx: (g.sx ?? 1) - 1, qsz: (g.sx ?? 1) - 1, qsy: (g.sy ?? 1) - 1,
    llr: -0.45 * jaw, lrr: 0.45 * jaw, llp: 0.12 * jaw, lrp: 0.12 * jaw,
    vm: g.lw ?? 0, vy: (g.vy || 0) > 0 ? -0.35 - VYL * g.vy : 0.35 * (g.vy || 0) - 0.35, vp: (g.vp || 0) + VPL * Math.max(0, g.cy || 0) / 0.24, cy: (g.cy || 0) * ((g.cy || 0) > 0 ? CYL : 1), cp: g.cp || 0, ct: g.ct || 0, reach: g.reach || 0, vsw: g.sw || 0,
  };
}
const GREST = Object.freeze({ push: 0, pitch: 0, twist: 0, roll: 0, sx: 1, sy: 1, hop: 0, step: 0, jaw: 0.1, tell: 0, vy: 0, vp: 0, cy: 0, cp: -0.2, ct: 0.5, reach: 0, pull: 0, lw: 0, sw: 1 });
const FIELDS = Object.keys(GREST);
const K = (o) => Object.freeze({ ...GREST, sw: 0, lw: 1, ...o });
const C1 = K({ twist: -0.3, roll: 0.04, pitch: -0.05, step: 1, jaw: 0.42, tell: 0.5, vy: -0.95, vp: 0.3, cy: -0.17, cp: 0.01, ct: 0.08 });
const D1 = K({ push: -0.03, twist: -0.46, roll: 0.06, pitch: -0.09, sx: 1.05, sy: 0.93, step: 1, jaw: 0.78, tell: 1, vy: -1.08, vp: 0.34, cy: -0.24, cp: 0.01, ct: 0.12 });
const S1 = K({ push: 0.1, pitch: 0.38, twist: 0.24, roll: -0.05, sx: 1.19, sy: 0.91, step: 1, jaw: -0.06, tell: 0.6, vy: 0.4, vp: 0.05, reach: 1 });
const C2 = K({ twist: 0.3, roll: -0.04, pitch: -0.03, step: 1, jaw: 0.42, tell: 0.5, vy: 0.95, vp: 0.2, cy: 0.17, cp: 0.0, ct: 0.18 });
const D2 = K({ push: -0.03, twist: 0.46, roll: -0.06, pitch: -0.06, sx: 1.06, sy: 0.92, step: 1, jaw: 0.78, tell: 1, vy: 1.08, vp: 0.14, cy: 0.24, cp: 0.01, ct: 0.25 });
const S2 = K({ push: 0.1, pitch: 0.38, twist: -0.24, roll: 0.05, sx: 1.19, sy: 0.91, step: 1, jaw: -0.06, tell: 0.6, vy: -0.4, vp: 0.02, reach: 1 });
const C3 = K({ pitch: -0.12, sx: 0.99, sy: 1.02, hop: -0.02, step: 1, jaw: 0.5, tell: 0.6, vy: 0, vp: 1.3, cp: 0.03, ct: 0.5 });
const D3 = K({ push: -0.03, pitch: -0.2, sx: 0.98, sy: 1.04, hop: -0.05, step: 1, jaw: 0.88, tell: 1, vy: 0, vp: 1.36, cp: 0.04, ct: 0.62 });
const S3 = K({ push: 0.12, pitch: 0.44, sx: 1.25, sy: 0.85, hop: -0.03, step: 1, jaw: -0.08, tell: 0.7, vy: 0, vp: -0.4, reach: 1 });
const H1 = K({ push: -0.05, pitch: -0.2, twist: 0.12, sx: 0.96, sy: 1.05, step: 0, jaw: 0.5, tell: 0.5, vy: 0.2, vp: 0.1, cp: -0.08, reach: 1, pull: 1 });
const H2 = K({ ...H1, twist: -0.12, vy: -0.2 });
const H3 = K({ ...H1, pitch: -0.24, sy: 1.07, hop: 0.02, twist: 0, vy: 0 });
const O1 = K({ push: -0.02, pitch: -0.05, twist: 0.3, sx: 0.97, sy: 1.04, step: 0, jaw: 0.25, tell: 0.3, vy: 0.75, vp: 0.55, cy: 0.12, cp: 0.08, ct: 0.25 });
const O2 = K({ push: -0.02, pitch: -0.04, twist: -0.3, sx: 0.97, sy: 1.04, step: 0, jaw: 0.25, tell: 0.3, vy: -0.75, vp: 0.6, cy: -0.12, cp: 0.08, ct: 0.25 });
const O3 = K({ push: -0.03, pitch: -0.1, sx: 0.95, sy: 1.07, hop: 0.02, step: 0, jaw: 0.3, tell: 0.35, vy: 0, vp: 0.85, cp: 0.12, ct: 0.3 });
const HITS = [
  { label: 'sweep', gather: C1, coil: D1, strike: S1, haul: H1, over: O1 },
  { label: 'backhand', gather: C2, coil: D2, strike: S2, haul: H2, over: O2 },
  { label: 'overhead slam', gather: C3, coil: D3, strike: S3, haul: H3, over: O3 },
];
const lerpF = (a, b, k) => Object.fromEntries(FIELDS.map((f) => [f, a[f] + (b[f] - a[f]) * k]));
const io = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k)), eout = (k) => 1 - (1 - k) * (1 - k);
const settleE = (k) => 1 - (1 - k) * (1 - k) * Math.cos(1.4 * Math.PI * k); // lands with one overshoot
const LEAD = ['twist', 'push', 'pitch', 'roll', 'hop', 'step'], ROOTV = ['vy', 'vp'], LATE = ['cy', 'cp', 'ct', 'reach'], SQ = ['sx', 'sy', 'jaw', 'tell'];
function strikeLerp(a, b, k) {
  const o = lerpF(a, b, k); const ko = eout(k), kv = Math.max(0, (k - 0.2) / 0.8), kvo = eout(kv);
  for (const f of LEAD) o[f] = a[f] + (b[f] - a[f]) * ko; for (const f of ROOTV) o[f] = a[f] + (b[f] - a[f]) * kvo;
  for (const f of LATE) o[f] = a[f] + (b[f] - a[f]) * k * k * k; for (const f of SQ) o[f] = a[f] + (b[f] - a[f]) * k * k;
  return o;
}
// the timing (seconds)
const TEL = 48 / 60, STRIKE = 5 / 60, GATHER = 0.25, CONTACT = 2 * FR, YANK = 12 / 60, REEL = YANK - CONTACT, SNAP = 2.5 * FR, SETTLE = 6 * FR, CATCH = 3 / 60;
const FOLLOW = CONTACT + REEL + SNAP + SETTLE, PERIOD = TEL + FOLLOW;
export const LASH = { TEL, STRIKE, CONTACT, YANK, PERIOD, FOLLOW };
const LANE = 5.4 / U, HERO = 3.6 / U, PULL = 1.8 / U;
// lash n at tau seconds into it: the game's fields plus where the hook is aimed
function lashAt(n, tau, from, to) {
  const H = HITS[n]; let g, tz = LANE;
  if (tau < GATHER) g = lerpF(from, H.gather, io(tau / GATHER));
  else if (tau < TEL - STRIKE) { const k = (tau - GATHER) / (TEL - STRIKE - GATHER); g = lerpF(H.gather, H.coil, io(k)); const s = k * k; g.vy += 0.035 * s * Math.sin(tau * 41); g.vp += 0.025 * s * Math.sin(tau * 37 + 1); g.jaw += 0.05 * s * Math.sin(tau * 33); }
  else if (tau < TEL) g = strikeLerp(H.coil, H.strike, (tau - TEL + STRIKE) / STRIKE);
  else {
    const tf = tau - TEL; const ck = c01((tf - CONTACT) / CATCH); const cat = ck * ck * (3 - 2 * ck);
    const pull = Math.min(1, tf / YANK); tz = lerp(LANE, HERO, cat) - PULL * pull * cat;
    if (tf < CONTACT) g = lerpF(H.strike, H.strike, 0);
    else if (tf < CONTACT + REEL) g = lerpF(H.strike, H.haul, eout((tf - CONTACT) / REEL));
    else if (tf < CONTACT + REEL + SNAP) g = lerpF(H.haul, H.over, eout((tf - CONTACT - REEL) / SNAP));
    else if (tf < FOLLOW) g = lerpF(H.over, to, settleE((tf - CONTACT - REEL - SNAP) / SETTLE));
    else g = lerpF(to, to, 0);
    if (tf >= CONTACT + REEL) tz = HERO - PULL;
  }
  return { ...game(g), vtz: tz, step: g.step, tell: g.tell };
}
const PH = (s, n) => [['coil gathers (the telegraph)', s], ['coil tightens (the telegraph)', s + GATHER], ['throw', s + TEL - STRIKE], ['contact on the resolve tick', s + TEL], ['reel (the yank)', s + TEL + CONTACT], ['snap back', s + TEL + CONTACT + REEL], [n < 0 ? 'settle' : n < 2 ? `settle into lash ${n + 2}'s coil` : 'settle into idle', s + TEL + CONTACT + REEL + SNAP]];
// the brace: its two front roots (45 degrees either side of its nose) step out while it gathers and home on the reel
const BRACE = 0.05;
const braceFeet = (t, starts) => {
  const F = allPlanted();
  for (const k of ['R1', 'R7']) {
    const out = REST[k].clone().add(V3(Math.sign(REST[k].x) * BRACE * 0.6, 0, BRACE));
    let cur = REST[k], res = null;
    for (const s of starts) {
      const seq = [[s, s + 0.2, out], [s + TEL + CONTACT, s + TEL + YANK + 0.02, REST[k]]];
      for (const [a, b, to] of seq) { if (res) break; if (t < a) { res = plant(cur); break; } if (t < b) { const u = smooth((t - a) / (b - a)); const p = cur.clone().lerp(to, u); p.y += 0.035 * Math.sin(Math.PI * u); res = { p }; break; } cur = to; }
      if (res) break;
    }
    F[k] = res || plant(cur);
  }
  return F;
};
const lashClip = (n) => ({
  dur: PERIOD + 0.35, contact: [TEL], phases: PH(0, -1).map(([l, t]) => [l, t]).concat([['rest', PERIOD]]),
  pose: (t) => lashAt(n, t, GREST, GREST),
  feet: (t) => braceFeet(t, [0]),
});
const chain = {
  dur: 2 * PERIOD + PERIOD + 0.35, contact: [0, 1, 2].map((n) => n * PERIOD + TEL),
  phases: [0, 1, 2].flatMap((n) => PH(n * PERIOD, n).map(([l, t]) => [`Lash ${n + 1}, ${HITS[n].label}: ${l}`, t])).concat([['rest', 3 * PERIOD]]),
  pose: (t) => { const n = Math.min(2, Math.floor(t / PERIOD)); return lashAt(n, t - n * PERIOD, n === 0 ? GREST : HITS[n].gather, n < 2 ? HITS[n + 1].gather : GREST); },
  feet: (t) => braceFeet(t, [0, PERIOD, 2 * PERIOD]),
};

// ------------------------------------------------------------------------------------------------ idle
// 6 s. The game's idle sway of the vine (its sw field) plus mine: the pod breathes, the rim opens and closes a little,
// it turns its maw one way and back, and the vine tip twitches once.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = TAU * t / 6, br = Math.sin(2 * w); const look = 0.18 * pulse(t, 1.0, 1.6, 2.6, 3.2) - 0.14 * pulse(t, 3.6, 4.1, 4.9, 5.4);
    return { qsy: 0.015 * br, qsx: -0.008 * br, qsz: -0.008 * br, kp: 0.015 * Math.sin(w + 1), kr: 0.012 * Math.sin(w), ky: look,
      llr: -0.05 - 0.05 * Math.sin(w * 3), lrr: 0.05 + 0.05 * Math.sin(w * 3), vsw: 1, vst: t * 2 };
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turns
// The game's creep: 0.8 u/s on its roots in two sets (here four and four, every other root), the pod rocking onto each
// set and leaning into its travel; the vine drags along behind it.
const WT = 0.35, GAIT = { T: WT, duty: 0.5, v: 0.8 / U };
const GF = Object.fromEntries(ROOTS.map((k, i) => [k, { phase: (i % 2) * 0.5, n: [REST[k].x, REST[k].z], lift: 0.025, droop: 0.3, push: 0.1 }]));
const walk = {
  dur: WT * 2, loop: true, gait: { ...GAIT },
  pose: (t) => { const w = TAU * t / WT; return { oy: 0.006 + 0.006 * Math.cos(w), kp: -0.06, kr: 0.025 * Math.sin(w), qsy: 0.02 * Math.cos(w), qsx: -0.01 * Math.cos(w), qsz: -0.01 * Math.cos(w), llr: -0.02, lrr: 0.02, vsw: 0.4, vst: 3 * t / 0.7 }; },
  feet: (t) => Object.fromEntries(ROOTS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: WT, duty: 0.5, v: 0, omega: dir * Math.PI / 1.2 };
  return {
    dur: WT * 2, loop: true, gait: g,
    pose: (t) => { const w = TAU * t / WT; return { oy: 0.004 + 0.004 * Math.cos(w), kr: -0.03 * dir, ky: 0.06 * dir, qsy: 0.015 * Math.cos(w), vsw: 0.4, vst: 3 * t / 0.7 }; },
    feet: (t) => Object.fromEntries(ROOTS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.025 })])),
  };
};

// ------------------------------------------------------------------------------------------------ hurt
// On top of anything: the pod flinches back and squashes, the rim claps shut, the vine jerks.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { kp: 0.12, qsy: -0.06, qsx: 0.04, qsz: 0.04, llr: 0.12, lrr: -0.12, vsw: 1.5, vst: 0.9 }, 'out'], [0.17, { kp: -0.03, qsy: 0.02, llr: -0.03, lrr: 0.03, vsw: 0.6, vst: 1.4 }], [0.4, { vst: 2 }]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows in over 7 frames, about 10% over. Mine on top: the rim snaps open and shut and the vine
// lifts off the floor and drops back.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.2, contact: [], scale: spawnScale,
  phases: [['grow in', 0], ['the rim snaps', 7 * FR], ['the vine lifts', 0.45], ['rest', 0.95]],
  pose: (t) => {
    const snap = track([[0, { llr: 0.1, lrr: -0.1 }], [7 * FR, { llr: 0.1, lrr: -0.1 }], [0.32, { llr: -0.3, lrr: 0.3, qsy: 0.05 }, 'out'], [0.42, { llr: 0.05, lrr: -0.05, qsy: -0.03 }], [0.6, {}]])(t);
    const lift = pulse(t, 0.4, 0.62, 0.75, 1.0);
    return addPose(snap, { ...game(K({ lw: lift, vy: -0.6, vp: 0.5, cp: 0.1, ct: 0.4, cy: -0.1 })), vsw: 1 - lift, vst: t * 2 });
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). It is struck back, the rim gapes and the glow goes out, the pod
// wilts back and slumps on its roots, the vine lifts once and falls limp along the floor.
const death = {
  dur: 2.0, contact: [0.55],
  phases: [['struck', 0], ['wilts', 0.12], ['slumps', 0.55], ['lies still', 1.1]],
  pose: (t) => {
    const k = smooth((t - 0.1) / 0.45), sl = smooth((t - 0.45) / 0.35);
    const lift = pulse(t, 0, 0.12, 0.25, 0.55);
    return addPose(track([[0, {}], [0.06, { kp: 0.15, qsy: -0.05 }, 'out'], [0.2, {}]])(t),
      { kp: 0.42 * k + 0.04 * bump(t, 0.6, 0.2), qsy: -0.12 * sl, qsx: 0.05 * sl, qsz: 0.05 * sl, llr: -0.35 * k, lrr: 0.35 * k, llp: 0.2 * k, lrp: 0.2 * k,
        ...(lift ? { vm: lift, vy: -0.6, vp: 0.4, cy: -0.1, cp: 0.05 } : {}) });
  },
  feet: allPlanted,
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), chain, lash1: lashClip(0), lash2: lashClip(1), lash3: lashClip(2), hurt, spawn, death };
