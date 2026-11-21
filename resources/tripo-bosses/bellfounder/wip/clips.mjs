// The Bellfounder's moves. Units are model units (the model is 1 tall; the page draws it 2.6 u tall, CFG.unit, the game's
// scale). Timings come from the game: FOUNDER in src/sim/bosses/founder.js (walk 1.2 u/s; Molten Pour: 60-tick lane; Bell
// Drop: 64-tick ring; the Firing: 96-tick ring round itself, then quenched for 90 ticks) and the beats in
// src/render/facet/beats.js (strike 2.5 frames, contact held 3 frames).
// It walks on two short brick legs with locked feet. The arms are limbs too: their hands are placed on the crucible's two
// handles every frame, so wherever the crucible goes (tipped for the pour, heaved overhead, set on the floor) the hands
// stay on it. A clip moves the crucible with pseudo channels that `fin` turns into the crucible bone's channels:
//   cl lift, cf forward, cs side (in the body's frame), ct tip (spout down, about the handles), cy2 yaw, cw 0 carried .. 1 at
//   FLOOR (fx, fy, fz move it from there).
// fr frees the arms (0 holding .. 1 at the clip's own `free` targets).
import * as THREE from 'three';
import fs from 'fs';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from './quad.mjs';
const SK = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const P0 = Object.fromEntries(SK.names.map((n, i) => [n, V3(...SK.pos[i])]));
const END = Object.fromEntries(Object.entries(SK.ends).map(([k, v]) => [k, V3(...v)]));
const FR_ = 1 / 60; const wf = (x) => Math.round(x * 60) / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_;
export const CFG = {
  name: 'bellfounder', unit: 2.6,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['door', 'd'], ['cru', 'k']],
  slides: [['cru', 'kx', [1, 0, 0]], ['cru', 'kh', [0, 1, 0]], ['cru', 'kz', [0, 0, 1]]],
  hang: [['hbL', 0.85, 0.008], ['hbR', 0.85, 0.008]],
  legs: {
    HL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'], pole: [0, 0, 1] }, HR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'], pole: [0, 0, 1] },
    AL: { kind: 'limb', b: ['armL', 'foreL', 'handL', 'fingL'], pole: [0.35, -0.1, -1], noDrop: true }, AR: { kind: 'limb', b: ['armR', 'foreR', 'handR', 'fingR'], pole: [-0.35, -0.1, -1], noDrop: true },
  },
  springs: [{ bone: 'hbL', k: 150, c: 6, max: 0.6, floor: 0.008 }, { bone: 'hbR', k: 150, c: 6, max: 0.6, floor: 0.008 }],
};
const SG = { L: 1, R: -1, HL: 1, HR: -1, AL: 1, AR: -1 };
const REST = { HL: END.toeL.clone(), HR: END.toeR.clone() };
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x * SG[k], y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.3); /* the heel comes down first: lift the foot by as much so the heel stays on the floor */ s.p.y += Math.max(0, -s.pitch) * 0.02; return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}

// ---- the crucible: carried in front of the belly, handles in the palms
const CP = V3(...SK.cru.pos); const HIPS0 = P0.hips.clone();
const HANDLE = { L: V3(...SK.handles.L), R: V3(...SK.handles.R) };
const FLOOR = V3(0, 0.002, 0.31); // set down at its feet
const PIV = SK.handles.L[1] - SK.cru.pos[1]; // the handles' height above the crucible's foot
const qE = (p, y, r) => new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), y).multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), -p)).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), r));
// the pose's crucible pseudo channels -> the crucible bone (root space). Carried, it rides the body's lean and yaw about the hips.
function fin(p) {
  const lean = (p.bp || 0) + 0.7 * (p.sp || 0) + 0.4 * (p.cp || 0), yaw = (p.by || 0) + 0.7 * (p.sy || 0) + 0.4 * (p.cy || 0), roll = (p.br || 0) + 0.5 * (p.sr || 0);
  const rel = CP.clone().add(V3(p.cs || 0, p.cl || 0, p.cf || 0)).sub(HIPS0).applyQuaternion(qE(lean, yaw, roll));
  const carried = HIPS0.clone().add(V3(p.ox || 0, p.oy || 0, p.oz || 0)).add(rel);
  // the tip turns the crucible about its handles (the hands), not about its foot
  const w = clamp(p.cw || 0); const tipQ = qE(lean - (p.ct || 0), yaw + (p.cy2 || 0), roll), restQ = qE(lean, yaw + (p.cy2 || 0), roll);
  carried.add(V3(0, -PIV, 0).applyQuaternion(tipQ).sub(V3(0, -PIV, 0).applyQuaternion(restQ)));
  const pos = carried.lerp(FLOOR.clone().add(V3(p.fx || 0, p.fy || 0, p.fz || 0)), w); if (!p.fy) pos.y = Math.max(pos.y, FLOOR.y + 0.115 * Math.abs(Math.sin(lerp(lean, 0, w) - (p.ct || 0))));
  const o = { ...p, kx: pos.x - CP.x, kh: pos.y - CP.y, kz: pos.z - CP.z, kp: lerp(lean, 0, w) - (p.ct || 0), ky: lerp(yaw, 0, w) + (p.cy2 || 0), kr: lerp(roll, 0, w) + (p.cr2 || 0), dy: p.dy || 0 };
  return o;
}
// hands: the palm's middle (from the wrist, rest frame) goes on the handle; the hand is rolled so the palm faces in
const PALM = { L: V3(0.006, 0.014, 0.05), R: V3(-0.006, 0.014, 0.05) };
const GRIP = { L: qE(0, 0, Math.PI / 2), R: qE(0, 0, -Math.PI / 2) };
const TIP = { L: END.fingL.clone().sub(P0.handL), R: END.fingR.clone().sub(P0.handR) };
function hold(s, W) {
  const qc = W.QW.cru.clone(); const q = qc.clone().multiply(GRIP[s]);
  const h = W.PW.cru.clone().add(HANDLE[s].clone().sub(CP).applyQuaternion(qc)).add(V3(0.012 * SG[s], 0, 0).applyQuaternion(qc));
  const wr = h.sub(PALM[s].clone().applyQuaternion(q));
  return { wr, q };
}
// a free hand: the wrist at w = [outward, up, forward] from the shoulder in the chest's frame, turned by a = [pitch, yaw, roll]
function freeHand(s, W, o) {
  const k = 'A' + s; const pq = W.parQ(k); const wr = W.loc(k, [o.w[0] * SG[s], o.w[1], o.w[2]]).sub(V3(0, 0, W.tz));
  const a = o.a || [0, 0, 0]; const q = pq.clone().multiply(qE(a[0], a[1] * SG[s], a[2] * SG[s]));
  return { wr, q };
}
const HANG = { w: [0.1, -0.38, 0.06], a: [0.2, 0, 0.15] };
function arms(W, fr, free) {
  const F = {};
  for (const s of ['L', 'R']) {
    const g = clamp(typeof fr === 'number' ? fr : fr[s]); const A = hold(s, W); let wr = A.wr, q = A.q;
    if (g > 0) { const B = freeHand(s, W, free ? free[s] || free : HANG); wr = A.wr.clone().lerp(B.wr, smooth(g)); q = A.q.clone().slerp(B.q, smooth(g)); }
    F['A' + s] = { p: wr.clone().add(TIP[s].clone().applyQuaternion(q)).add(V3(0, 0, W.tz)), q };
  }
  return F;
}
const legsPlanted = () => ({ HL: plant(REST.HL), HR: plant(REST.HR) });
// a clip: pose(t) -> channels with the pseudo ones, legs(t) -> foot targets, free(t) -> free hand targets, fr from the pose
// KNEE: the body sits a little low in every move so the knees never lock straight (a straight knee flips in one frame)
const KNEE = { oy: -0.012 };
function clip(c) {
  const pose = (t) => fin(addPose(KNEE, c.base || {}, c.pose(t)));
  return { ...c, pose, feet: (t, W) => { const p = pose(t); return { ...(c.legs ? c.legs(t) : legsPlanted()), ...arms(W, c.frOf ? c.frOf(t, p) : (p.fr || 0), c.free ? c.free(t) : null) }; } };
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. The kiln breathes on a slow beat; the weight rolls from foot to foot; it looks down into the crucible and gives it a
// slow swirl; it looks out left, then right; a shrug resettles its grip.
const idle = clip({
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(3 * w), sw = Math.sin(w);
    const peer = pulse(t, 0.6, 1.1, 2.1, 2.6), swirl = pulse(t, 0.9, 1.2, 2.0, 2.3) * Math.sin(2 * Math.PI * (t - 0.9) / 0.55);
    const look = 0.35 * pulse(t, 2.9, 3.4, 3.9, 4.3) - 0.3 * pulse(t, 4.3, 4.7, 5.1, 5.5);
    const shrug = bump(t, 5.7, 0.4);
    return { oy: 0.003 * br - 0.004 * shrug, ox: 0.006 * sw, br: 0.018 * sw, by: 0.012 * Math.sin(w + 0.7), cp: 0.008 * br,
      np: -0.12 * peer + 0.02 * shrug, hp: -0.14 * peer, ny: 0.4 * look, hy: 0.45 * look, cy: 0.06 * look,
      cl: 0.004 * br + 0.02 * shrug + 0.01 * peer, cs: 0.012 * swirl, ct: 0.04 * peer + 0.03 * Math.sin(2 * Math.PI * (t - 0.9) / 0.55 + 1.2) * pulse(t, 0.9, 1.2, 2.0, 2.3) };
  },
});

// ------------------------------------------------------------------------------------------------ walk and turn
// A heavy plod on locked feet, 1.2 u/s: one stride of 0.3 u every 0.66 s. The kiln rolls over each planted foot and the
// crucible swings a little in the hands. Feet point straight ahead (no splay).
const WT = 40 / 60;
const GAIT = { T: WT, duty: 0.6, v: 1.2 / CFG.unit };
const GF = { HL: { phase: 0, n: [REST.HL.x, REST.HL.z], lift: 0.035, droop: 0.25, push: 0.25 }, HR: { phase: 0.5, n: [REST.HR.x, REST.HR.z], lift: 0.035, droop: 0.25, push: 0.25 } };
const walk = clip({
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT;
    return { oy: -0.014 + 0.006 * Math.cos(2 * w - 0.5), ox: 0.012 * Math.sin(w + 0.4), bp: -0.03, br: 0.05 * Math.sin(w + 0.3), by: 0.05 * Math.sin(w),
      sy: -0.02 * Math.sin(w + 0.4), cy: -0.04 * Math.sin(w + 0.5), cr: -0.02 * Math.sin(w + 0.3),
      np: 0.03, hp: 0.02 - 0.01 * Math.sin(2 * w + 1.4), ny: -0.05 * Math.sin(w), hy: -0.04 * Math.sin(w),
      cl: 0.006 * Math.cos(2 * w - 1.2), ct: 0.03 * Math.sin(2 * w - 0.8), cs: -0.008 * Math.sin(w + 0.9) };
  },
  legs: (t) => ({ HL: gaitFoot(t, GAIT, GF.HL), HR: gaitFoot(t, GAIT, GF.HR) }),
});
export const TURN_DEG = 70;
const TURN = TURN_DEG * Math.PI / 180;
const turn = (dir) => {
  const TT = 36 / 60; const g = { T: TT, duty: 0.55, v: 0, omega: dir * TURN, pivot: [0, -0.02] };
  return clip({
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT; return { oy: -0.006 + 0.005 * Math.cos(2 * w - 0.5), br: 0.04 * Math.sin(w), bp: -0.02, ny: 0.12 * dir, hy: 0.16 * dir, cy: 0.05 * dir, ct: 0.02 * Math.sin(2 * w) }; },
    legs: (t) => ({ HL: gaitFoot(t, g, { ...GF.HL, lift: 0.03 }), HR: gaitFoot(t, g, { ...GF.HR, lift: 0.03 }) }),
  });
};

// ------------------------------------------------------------------------------------------------ Molten Pour
// heave (the crucible hauled up to the chest, the kiln leaning back on its heels), tip (the lane fills; the spout comes
// round to the lane and dips), pour (2.5 frames to the beat: tipped right over, the bronze runs down the lane), held while it
// pours, then it rights the crucible and lowers it.
const PO = { heave: 0.42, tip: 1.0 - STRIKE, hit: 1.0, held: 1.0 + HOLD, run: 1.45, end: wf(2.05) };
const pour = clip({
  dur: PO.end, contact: [PO.hit], kinds: ['pour'], phases: [['heave', 0], ['tip', PO.heave + 0.1], ['pour', PO.tip], ['pours', PO.hit], ['right it', PO.run]], cues: { lane: [0, PO.hit], stream: [PO.hit, PO.run + 0.1] },
  pose: (t) => track([[0, {}],
    [PO.heave, { oy: -0.012, bp: 0.07, cp: 0.03, np: 0.02, hp: 0.04, cl: 0.12, cf: -0.02, ct: -0.18 }],
    [PO.heave + 0.18, { oy: -0.014, bp: 0.06, cp: 0.03, np: -0.02, hp: -0.04, cl: 0.13, cf: 0.0, ct: -0.12 }],
    [PO.tip, { oy: -0.016, bp: 0.02, cp: 0.0, np: -0.06, hp: -0.1, cl: 0.12, cf: 0.03, ct: 0.25 }],
    [PO.hit, { oy: -0.024, bp: -0.1, sp: -0.03, cp: -0.03, np: -0.08, hp: -0.14, cl: 0.1, cf: 0.07, ct: 1.0 }, 'in'],
    [PO.held, { oy: -0.025, bp: -0.105, sp: -0.03, cp: -0.03, np: -0.08, hp: -0.15, cl: 0.1, cf: 0.072, ct: 1.03 }],
    [PO.run, { oy: -0.022, bp: -0.08, sp: -0.02, cp: -0.02, np: -0.08, hp: -0.15, cl: 0.1, cf: 0.07, ct: 1.15 }],
    [PO.run + 0.25, { oy: -0.01, bp: 0.0, np: -0.02, hp: -0.04, cl: 0.07, cf: 0.03, ct: 0.15 }, 'out'],
    [PO.end, {}]])(t),
  legs: (t) => ({ HL: steps(t, REST.HL, [[0.12, 0.36, off('HL', 0, 0, 0.05), 0.03]]), HR: plant(REST.HR) }),
});
// the left foot stays forward to the end; bring it home in the last frames so the clip ends in the base stance
pour.legs0 = pour.feet; pour.feet = (t, W) => { const F = pour.legs0(t, W); if (t > PO.run + 0.2) F.HL = steps(t, off('HL', 0, 0, 0.05), [[PO.run + 0.2, PO.end - 0.05, REST.HL, 0.025]]); return F; };

// ------------------------------------------------------------------------------------------------ Bell Drop
// raise (the crucible heaved up over the helmet while the ring fills on the hero), cast (a flick: a fresh bell flies out of
// the crucible and up), it watches it fall, the bell lands on the ring on the beat, and it lowers the crucible.
const BE = { raise: 0.6, cast: 0.74, hit: wf(64 / 60), low: 1.45, end: wf(1.9) };
const bell = clip({
  dur: BE.end, contact: [BE.hit], kinds: ['bell'], phases: [['raise', 0], ['cast', BE.cast - 0.08], ['it falls', BE.cast + 0.08], ['lands', BE.hit], ['lower', BE.hit + 0.15]], cues: { ring: [0, BE.hit], cast: [BE.cast] },
  pose: (t) => track([[0, {}],
    [0.3, { oy: -0.02, bp: -0.04, np: -0.04, hp: -0.06, cl: 0.22, cf: 0.0, ct: -0.1 }],
    [BE.raise, { oy: 0.0, bp: 0.09, sp: 0.03, cp: 0.05, np: 0.12, hp: 0.22, cl: 0.62, cf: -0.06, ct: -0.3 }],
    [BE.cast - 0.06, { oy: -0.012, bp: 0.07, sp: 0.02, cp: 0.04, np: 0.1, hp: 0.2, cl: 0.57, cf: -0.05, ct: -0.36 }],
    [BE.cast, { oy: 0.006, bp: 0.1, sp: 0.04, cp: 0.06, np: 0.14, hp: 0.26, cl: 0.65, cf: -0.03, ct: 0.3 }, 'out'],
    [BE.cast + 0.16, { oy: 0.0, bp: 0.09, sp: 0.03, cp: 0.05, np: 0.12, hp: 0.22, cl: 0.62, cf: -0.05, ct: 0.0 }],
    [BE.hit, { oy: -0.006, bp: 0.05, cp: 0.02, np: 0.0, hp: -0.04, cl: 0.56, cf: 0.02, ct: -0.05 }],
    [BE.hit + 0.15, { oy: -0.01, bp: 0.02, np: -0.04, hp: -0.08, cl: 0.4, cf: 0.08, ct: 0.0 }],
    [BE.low, { oy: -0.012, bp: -0.02, np: -0.02, hp: -0.04, cl: 0.12, cf: 0.0, ct: 0.05 }, 'io'],
    [BE.end, {}]])(t),
});

// ------------------------------------------------------------------------------------------------ the Firing
// set down (it bends and sets the crucible on the floor at its feet), stoke (it straightens, spreads its arms and the chest
// door swings open as the ring fills, the heat building), the Firing (on the beat: arms flung wide, chest out, door wide,
// the heat bursts out), quenched (90 ticks: grey and sagging, head down, arms hanging, the door ajar), rekindle (it
// straightens), and it bends to lift the crucible again.
const FI = { set: 0.45, free: 0.72, hit: 1.6, held: 1.6 + HOLD, sag: 2.0, wake: 3.1, grab: 3.5, lift: 3.95, end: wf(4.35) };
const DOWN = { oy: -0.07, oz: 0.025, bp: -0.46, sp: -0.08, cp: -0.04, np: 0.22, hp: 0.14 };
const SPREAD = { w: [0.25, -0.32, 0.2], a: [0.4, -0.3, 0.9] }, FLUNG = { w: [0.33, -0.26, 0.12], a: [0.5, -0.5, 1.2] };
const firing = clip({
  dur: FI.end, contact: [FI.hit, FI.lift - 0.1], kinds: ['firing', 'lift'], phases: [['set down', 0], ['stoke', FI.free], ['the Firing', FI.hit - STRIKE], ['quenched', FI.held + 0.1], ['rekindle', FI.wake], ['lift', FI.grab - 0.2]],
  cues: { ring: [0, FI.hit], set: [FI.set], quenched: [FI.hit + 0.1, FI.wake], open: [FI.free, FI.hit] },
  pose: (t) => track([[0, {}],
    [0.24, { oy: -0.05, oz: 0.018, bp: -0.33, sp: -0.06, cp: -0.03, np: 0.16, hp: 0.1, cw: 0.3 }],
    [FI.set, { ...DOWN, cw: 1, cl: 0, dy: 0.0 }, 'io'],
    [FI.free, { oy: -0.02, bp: -0.1, np: 0.04, hp: 0.0, cw: 1, fr: 1, dy: 0.15 }],
    [1.05, { oy: -0.005, bp: 0.03, cp: 0.03, np: 0.02, hp: 0.04, cw: 1, fr: 1, dy: 0.7 }],
    [FI.hit - STRIKE, { oy: -0.012, bp: 0.02, cp: 0.02, np: -0.02, hp: 0.0, cw: 1, fr: 1, dy: 1.15 }],
    [FI.hit, { oy: 0.008, bp: 0.1, sp: 0.03, cp: 0.08, np: 0.08, hp: 0.22, cw: 1, fr: 1, dy: 1.75 }, 'out'],
    [FI.held, { oy: 0.009, bp: 0.105, sp: 0.03, cp: 0.085, np: 0.08, hp: 0.23, cw: 1, fr: 1, dy: 1.78 }],
    [FI.sag, { oy: -0.035, bp: -0.12, sp: -0.04, cp: -0.08, np: -0.16, hp: -0.14, br: 0.03, cw: 1, fr: 1, dy: 0.5 }, 'io'],
    [FI.wake - 0.1, { oy: -0.04, bp: -0.13, sp: -0.04, cp: -0.09, np: -0.18, hp: -0.16, br: 0.04, cw: 1, fr: 1, dy: 0.4 }],
    [FI.wake + 0.15, { oy: -0.01, bp: -0.04, np: -0.04, hp: 0.0, cw: 1, fr: 1, dy: 0.15 }, 'io'],
    [FI.grab - 0.15, { ...DOWN, cw: 1, fr: 0.5, dy: 0.0 }],
    [FI.grab, { ...DOWN, cw: 1, fr: 0, dy: 0.0 }, 'io'],
    [FI.grab + 0.12, { ...DOWN, oy: DOWN.oy - 0.004, cw: 1, fr: 0 }],
    [FI.grab + 0.3, { oy: -0.055, oz: 0.02, bp: -0.34, sp: -0.06, cp: -0.03, np: 0.15, hp: 0.1, cw: 0.45, fr: 0 }],
    [FI.lift, { oy: -0.01, bp: 0.03, cl: 0.02, cw: 0, fr: 0 }, 'io'],
    [FI.end, {}]])(t),
  free: (t) => {
    const k = clamp((t - FI.free) / (FI.hit - FI.free)), q = clamp((t - FI.held) / (FI.sag - FI.held));
    const lerpO = (A, B, u) => ({ w: A.w.map((v, i) => lerp(v, B.w[i], u)), a: A.a.map((v, i) => lerp(v, B.a[i], u)) });
    if (t < FI.held) return lerpO(SPREAD, FLUNG, smooth(k));
    if (t < FI.wake + 0.2) return lerpO(FLUNG, HANG, smooth(q));
    return HANG;
  },
  legs: (t) => ({ HL: plant(REST.HL), HR: steps(t, REST.HR, [[0.08, 0.32, off('HR', 0, 0, -0.04), 0.025], [FI.lift + 0.02, FI.end - 0.06, REST.HR, 0.02]]) }),
});

// ------------------------------------------------------------------------------------------------ Casting (mine)
// The game marks a Casting (75, 50, 25 percent) only by the creatures crawling out of a broken mould. Here it turns to its
// right, tips a little bronze onto the floor where a mould stands, and the mould breaks open on the beat.
const CA = { turn: 0.4, pour: 0.8, end: wf(1.6) };
const casting = clip({
  dur: CA.end, contact: [CA.pour], kinds: ['crack'], phases: [['turn', 0], ['tip', CA.turn], ['it breaks', CA.pour], ['back', CA.pour + 0.3]], cues: { mould: [CA.pour] },
  pose: (t) => track([[0, {}],
    [CA.turn, { by: -0.22, sy: -0.06, cy: -0.08, br: -0.03, np: -0.06, ny: -0.18, hy: -0.2, hp: -0.1, cl: 0.06, cs: -0.03, ct: 0.1 }],
    [CA.pour, { by: -0.26, sy: -0.07, cy: -0.09, br: -0.05, bp: -0.06, np: -0.1, ny: -0.2, hy: -0.22, hp: -0.16, cl: 0.06, cs: -0.04, ct: 0.75 }, 'in'],
    [CA.pour + 0.25, { by: -0.24, sy: -0.06, cy: -0.08, br: -0.04, bp: -0.05, np: -0.12, ny: -0.2, hy: -0.22, hp: -0.18, cl: 0.06, cs: -0.04, ct: 0.6 }],
    [CA.pour + 0.55, { by: -0.08, ny: -0.06, hy: -0.06, hp: -0.04, cl: 0.03, ct: 0.08 }, 'out'],
    [CA.end, {}]])(t),
  legs: (t) => ({ HL: plant(REST.HL), HR: steps(t, REST.HR, [[0.05, 0.33, off('HR', 0.01, 0, -0.025), 0.025], [CA.pour + 0.3, CA.end - 0.05, REST.HR, 0.02]]) }),
});

// ------------------------------------------------------------------------------------------------ hurt (light)
const hurt = clip({
  dur: wf(0.42), upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { cp: 0.05, np: 0.12, hp: 0.12, hy: 0.22, hr: 0.12, ny: 0.08, cy: 0.04 }, 'out'], [0.17, { cp: -0.01, np: -0.03, hp: -0.04, hy: -0.06, hr: -0.04 }], [0.42, {}]])(t),
});

// ------------------------------------------------------------------------------------------------ heavy hit
// Shoved back 0.25 u: the helmet snaps back, the kiln rocks onto its heels, it steps back once on each foot, the crucible
// sloshes in its hands, and it settles forward again.
const HB = -0.25 / CFG.unit;
const heavyHit = clip({
  dur: 1.1, contact: [0], travel: (t) => HB * EASE.out(clamp(t / 0.32)), phases: [['hit', 0], ['stagger', 0.07], ['slosh', 0.36], ['settle', 0.7]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.02, oy: 0.004, bp: 0.12, br: 0.05, by: -0.06, cp: 0.06, np: 0.18, hp: 0.16, hy: -0.2, ny: -0.1, hr: -0.1, cl: 0.03, ct: -0.2 }, 'out'],
      [0.26, { oz: -0.006, oy: -0.02, bp: 0.02, br: -0.03, by: -0.02, np: 0.02, hp: -0.02, hy: -0.08, cl: 0.0, ct: 0.18 }],
      [0.46, { oy: -0.018, bp: -0.05, np: -0.04, hp: -0.08, ct: -0.1 }],
      [0.72, { oy: -0.005, bp: -0.01, np: -0.01, hp: -0.02, ct: 0.04 }],
      [1.1, {}]])(t);
    return k;
  },
  legs: (t) => ({ HL: steps(t, REST.HL, [[0.02, 0.22, off('HL', 0, 0, HB), 0.03]]), HR: steps(t, REST.HR, [[0.12, 0.32, off('HR', 0, 0, HB), 0.03]]) }),
});

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames, then stand. It comes up out of a crouch over the crucible, straightens,
// and stamps its right foot once; the fire wakes behind the door.
const SPW = { grow: 7 * FR_, stamp: 0.95 };
const spawn = clip({
  dur: 1.6, contact: [SPW.stamp], kinds: ['stamp'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SPW.grow))), phases: [['grow', 0], ['rise', SPW.grow], ['stamp', SPW.stamp - 0.25], ['stand', SPW.stamp + HOLD]],
  pose: (t) => track([
    [0, { oy: -0.05, bp: -0.22, sp: -0.05, np: 0.12, hp: 0.15, cl: 0.03 }],
    [SPW.grow, { oy: -0.05, bp: -0.22, sp: -0.05, np: 0.12, hp: 0.15, cl: 0.03 }],
    [0.55, { oy: -0.006, bp: 0.02, np: 0.0, hp: 0.04, cl: 0.0 }],
    [SPW.stamp - STRIKE, { oy: -0.002, br: 0.05, bp: 0.03, hp: 0.06, cl: 0.02 }, 'out'],
    [SPW.stamp, { oy: -0.02, br: -0.02, bp: -0.03, hp: -0.02, cl: -0.01, ct: 0.08 }, 'in'],
    [SPW.stamp + HOLD, { oy: -0.021, br: -0.02, bp: -0.03, hp: -0.02, cl: -0.01, ct: 0.08 }],
    [SPW.stamp + 0.25, { oy: -0.006, bp: -0.01, ct: -0.03 }, 'out'],
    [1.6, {}]])(t),
  legs: (t) => ({ HL: plant(REST.HL), HR: steps(t, REST.HR, [[0.62, SPW.stamp, REST.HR, 0.05]]) }),
});

// ------------------------------------------------------------------------------------------------ death
// The fire goes out. A jolt throws the helmet back; the crucible slips from its hands, hits the floor and tips over, the
// bronze spilling; its legs give and it sits down hard; it slumps forward with its head bowed and its hands on the floor,
// and the door falls open on the dead hearth.
const D = { jolt: 0.12, drop: 0.3, land: 0.62, sit: 1.05, slump: 1.6, end: wf(2.8) };
const SIT = { oy: -0.138, oz: -0.02, bp: -0.16, sp: -0.06, cp: -0.08, np: -0.28, hp: -0.22, br: 0.04, by: 0.06 };
const death = clip({
  dur: D.end, contact: [D.jolt, D.land, D.sit], kinds: ['taken', 'clang', 'thud'], phases: [['jolt', 0], ['it drops the crucible', D.drop], ['the legs give', D.land], ['sits', D.sit], ['slumps', D.sit + 0.15], ['still', D.slump + 0.4]], cues: { out: [D.jolt, D.slump + 0.3], spill: [D.land] },
  pose: (t) => track([[0, {}],
    [D.jolt, { oy: 0.012, bp: 0.12, cp: 0.05, np: 0.16, hp: 0.3, cl: 0.03, ct: -0.1 }, 'out'],
    [D.drop, { oy: 0.004, bp: 0.08, cp: 0.03, np: 0.1, hp: 0.2, cl: 0.0, fr: 0.0 }],
    [D.land, { oy: -0.02, bp: 0.02, np: 0.02, hp: 0.04, cw: 1, ct: 1.55, fz: 0.07, fy: 0.15, fr: 1, dy: 0.1 }, 'in'],
    [D.land + 0.1, { oy: -0.04, bp: 0.0, np: 0.0, hp: 0.0, cw: 1, ct: 1.5, fz: 0.07, fy: 0.138, fr: 1, dy: 0.15 }],
    [D.sit, { ...SIT, oy: SIT.oy - 0.006, bp: -0.04, np: 0.04, hp: 0.06, cw: 1, ct: 1.5, fz: 0.07, fy: 0.138, fr: 1, dy: 0.3 }, 'in'],
    [D.sit + 0.12, { ...SIT, oy: SIT.oy + 0.008, bp: -0.06, np: 0.02, hp: 0.04, cw: 1, ct: 1.5, fz: 0.07, fy: 0.138, fr: 1, dy: 0.5 }, 'out'],
    [D.slump, { ...SIT, cw: 1, ct: 1.5, fz: 0.07, fy: 0.138, fr: 1, dy: 1.1 }],
    [D.end, { ...SIT, cw: 1, ct: 1.5, fz: 0.07, fy: 0.138, fr: 1, dy: 1.15 }]])(t),
  free: (t) => {
    const u = smooth((t - D.drop) / 0.35), v = smooth((t - D.sit) / 0.6);
    const A = { w: [0.14, -0.12, 0.2], a: [-0.6, 0, 0.5] }, B = { w: [0.12, -0.36, 0.14], a: [0.8, 0, 0.2] }, C = { w: [0.1, -0.4, 0.2], a: [1.2, 0, 0.1] };
    const l = (P, Q, s) => ({ w: P.w.map((x, i) => lerp(x, Q.w[i], s)), a: P.a.map((x, i) => lerp(x, Q.a[i], s)) });
    return t < D.sit ? l(A, B, u) : l(B, C, v);
  },
  frOf: (t) => smooth((t - 0.2) / 0.15),
  legs: (t) => {
    const u = smooth((t - D.land) / (D.sit - D.land));
    const leg = (k) => ({ p: off(k, 0.02, 0, 0.11 * u), lock: t < D.land });
    return { HL: leg('HL'), HR: leg('HR') };
  },
});

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), pour, bell, firing, casting, hurt, heavyHit, spawn, death };
