// The Sluice Warden's moves. Units are model units (the model is 1 tall with its pole; the page draws it 2.5 u tall, CFG.unit).
// Timings come from the game: SW in src/sim/enemies/champions.js (walk 1.0 u/s; Floodgate: a 66-tick cone of r 3.4 and
// 42 degrees each side; Undertow: a 78-tick ring of r 1.9 under a hero up to 7 u away, slick water for 360 ticks),
// CHAMPION_RULES in src/sim/champions.js (a 96-tick entrance, rage below half health: cooldowns x0.7, speed x1.15), the
// phases of render/enemies/champfacet/sluicewarden.js, and the beats in render/facet/beats.js (a frame is 1/30 s: strike
// 2.5 frames, contact held 3 frames, spawn grow 7 frames).
// The game's rig carries a sluice-gate shield and a millstone maul. The Tripo model carries one long sluice pole with a
// paddle blade, and wears the gate and its wheel on his chest: the moves are built for what he has.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, frac } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
export const CFG = {
  name: 'sluicewarden', unit: 2.5,
  // the stance he carries everywhere: knees a little bent, hunched forward under the helmet, the left fist a little off his side
  base: { oy: -0.012, hp: -0.04, cp: -0.03, np: 0.05, ulr: 0.05, flp: 0.1 },
  chain: [['hips', 'h'], ['spine', 's'], ['chest', 'c'], ['head', 'n']],
  extras: [['upperarmL', 'ul'], ['forearmL', 'fl'], ['upperarmR', 'ur'], ['forearmR', 'fr'], ['handR', 'wr'], ['skF', 'kf'], ['skB', 'kb']],
  arms: { A: { b: ['upperarmR', 'forearmR', 'handR'], pole: [-0.35, -0.45, -0.8] }, B: { b: ['upperarmL', 'forearmL', null], pole: [0.6, -0.6, -0.3] } },
  legs: { L: { kind: 'biped', b: ['thighL', 'shinL', 'footL'] }, R: { kind: 'biped', b: ['thighR', 'shinR', 'footR'] } },
  springs: [{ bone: 'skF', k: 120, c: 8, max: 0.5 }, { bone: 'skB', k: 105, c: 7, max: 0.6 }],
};
const REST = { L: V3(0.1185, 0, 0.119), R: V3(-0.1185, 0, 0.119) };
const LEGS = ['L', 'R'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const allPlanted = () => ({ L: plant(REST.L), R: plant(REST.R) });
const Xa = V3(1, 0, 0), Ya = V3(0, 1, 0), Za = V3(0, 0, 1);
const qPYR = (p = 0, y = 0, r = 0) => new THREE.Quaternion().setFromAxisAngle(Ya, y).multiply(new THREE.Quaternion().setFromAxisAngle(Xa, -p)).multiply(new THREE.Quaternion().setFromAxisAngle(Za, r));
// ---- the pole. Its fist is one piece with it, so the hand holds the pole's angle in the room and the arm follows.
// A pose says where the blade's bottom is (tx, ty, tz, root space) and how the pole leans: p tips the blade forward
// (0 upright, 1.57 level with the blade ahead, negative sends the blade behind him), yaw turns it to his left, roll
// leans its top to his right. The hand's place follows from those.
const TIPD = V3(-0.026, -0.549, 0.123);                     // the blade's bottom from the hand joint, at rest
const POLE0 = { tx: -0.2585, ty: 0.006, tz: 0.183, p: 0, yaw: 0, roll: 0 };   // standing on the floor beside his right foot
const P = (o = {}) => ({ ...POLE0, ...o });
const poleOf = (v) => { const j = V3(v.tx, v.ty, v.tz).sub(TIPD.clone().applyQuaternion(qPYR(v.p, v.yaw, v.roll))); return { AW: 1, Ax: j.x, Ay: j.y, Az: j.z, wrW: 1, wrWp: v.p, wrWy: v.yaw, wrWr: v.roll }; };
// ---- a point on his chest (the gate's wheel), after the body's own lean: the left hand reaches for it
const HIPS = V3(0, 0.40, 0), SPINE = V3(0, 0.46, 0), CHEST = V3(0, 0.52, 0), WHEEL = V3(0.012, 0.612, 0.175);
function onChest(k, pt) {
  const c = addPose(CFG.base, k); const qh = qPYR(c.hp, c.hy, c.hr), qs = qh.clone().multiply(qPYR(c.sp, c.sy, c.sr)), qc = qs.clone().multiply(qPYR(c.cp, c.cy, c.cr));
  return HIPS.clone().add(V3(c.ox || 0, c.oy || 0, c.oz || 0)).add(SPINE.clone().sub(HIPS).applyQuaternion(qh)).add(CHEST.clone().sub(SPINE).applyQuaternion(qs)).add(pt.clone().sub(CHEST).applyQuaternion(qc));
}
const cloth = (front = 0, back = 0) => ({ kfp: front, kbp: -back });
// a foot that is planted, swings to the next spot, is planted again: seq [[lift, land, to, height, droop]]
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.4); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. A keeper at his post: slow heavy breath, his weight eased from one boot to the other, the helmet sweeps left and
// then right, the left fist clenches, and once a loop he lifts the pole a hand's breadth and sets it down again.
const idle = {
  dur: 6, loop: true, contact: [4.62], kinds: ['thunk'],
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const lookL = pulse(t, 0.5, 1.1, 1.9, 2.5), lookR = pulse(t, 2.9, 3.5, 4.0, 4.5), fist = bump(t, 2.7, 0.8);
    const lift = track([[0, { y: 0 }], [4.1, { y: 0 }], [4.5, { y: 0.045 }], [4.62, { y: 0 }, 'in'], [6, { y: 0 }]])(t).y;
    return addPose(
      { oy: 0.003 * br - 0.006 * bump(t, 4.66, 0.3), cp: 0.02 * br, sp: -0.008 * br, ox: 0.014 * sw, hr: 0.016 * sw, sr: -0.01 * sw, hy: 0.015 * Math.sin(w + 1), cy: 0.03 * lookL - 0.03 * lookR },
      { np: -0.012 * br, ny: 0.36 * lookL - 0.36 * lookR, nr: 0.03 * lookL - 0.03 * lookR },
      { ulr: 0.015 * br + 0.04 * fist, ulp: 0.02 * br, flp: 0.03 * br + 0.22 * fist },
      poleOf(P({ ty: POLE0.ty + lift, p: 0.012 * br - 0.05 * bump(t, 4.4, 0.5), roll: 0.01 * sw })),
      cloth(0.02 * br, 0.02 * br),
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// 1.0 u/s, 1.1 s a cycle (two steps). Heavy: he rolls from boot to boot and sinks onto each, and the pole is his third
// foot: its blade goes down with the left boot, stays where it was put while he walks past it, and swings ahead again.
// (Kesh's rule for humanoids, no splayed feet, has his exception for heavy characters; the model's boots point straight
// ahead as sent, so they are left as they are.)
const WT = 1.1;
const GAIT = { T: WT, duty: 0.66, v: 1.0 / CFG.unit };
const GF = { L: { phase: 0, n: [0.1185, 0.119], lift: 0.04, droop: 0.35, push: 0.24 }, R: { phase: 0.5, n: [-0.1185, 0.119], lift: 0.04, droop: 0.35, push: 0.24 } };
function poleStep(t, g, reach = 0.22, lift = 0.035) {
  const u = frac(t / g.T), st = g.duty * g.T;
  if (u < g.duty) { const k = u / g.duty; return P({ tz: POLE0.tz - g.v * (k - 0.5) * st, p: reach * (1 - 2 * k) }); }
  const w = (u - g.duty) / (1 - g.duty), e = smooth(w);
  return P({ tz: POLE0.tz + g.v * st * (e - 0.5), p: reach * (2 * e - 1), ty: POLE0.ty + lift * Math.sin(Math.PI * w) });
}
const low = (x) => Math.pow(0.5 + 0.5 * x, 1.7);            // 0..1, spends most of its time near 0
const walk = {
  dur: WT, loop: true, gait: GAIT, contact: [0], kinds: ['pole'],
  pose: (t) => {
    const w = 2 * Math.PI * t / WT, a = w - 2 * Math.PI * 0.33;                 // a = 0 when the left foot carries him
    const up = low(Math.cos(2 * a));
    return addPose(
      { oy: -0.03 + 0.016 * up, ox: 0.022 * Math.cos(a), hr: 0.032 * Math.cos(a), hy: 0.06 * Math.sin(a), hp: -0.03 + 0.01 * Math.cos(2 * a + 0.6) },
      { sy: -0.03 * Math.sin(a), sr: -0.02 * Math.cos(a), cy: -0.05 * Math.sin(a), cr: -0.016 * Math.cos(a), np: 0.02 - 0.012 * Math.cos(2 * a), ny: -0.02 * Math.sin(a) },
      { ulp: 0.15 * Math.sin(a), ulr: 0.05, flp: 0.08 + 0.06 * Math.sin(a + 0.5) },
      poleOf(poleStep(t, GAIT)),
      cloth(0.05 + 0.07 * Math.cos(2 * a + 1.0), 0.05 + 0.06 * Math.cos(2 * a + 2.0)),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const TT = 0.9; const g = { T: TT, duty: 0.64, v: 0, omega: dir * 2 * Math.PI / 3.6, pivot: [0, 0] };
  const gf = { L: { ...GF.L, lift: 0.03 }, R: { ...GF.R, lift: 0.03 } };
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT, a = w - 2 * Math.PI * 0.32;
      return addPose({ oy: -0.02 + 0.008 * low(Math.cos(2 * a)), ox: 0.016 * Math.cos(a), hr: 0.024 * Math.cos(a) },
        { sy: 0.04 * dir, cy: 0.07 * dir, ny: 0.26 * dir, nr: 0.02 * dir }, { ulr: 0.08, flp: 0.06 },
        poleOf(P({ ty: 0.022 + 0.004 * Math.cos(2 * a), p: -0.04, roll: 0.03 * dir })), cloth(0.04, 0.04)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ Floodgate
// heave (the 66-tick cone less one strike: the right boot goes back, he cocks back onto it, the pole comes up with its
// blade swung behind him, and the left fist goes to the wheel on his chest and cranks it), slam (2.5 frames, landing on
// the cone's tick: a long lead step and the blade is driven into the floor ahead), contact held (3 frames), recoil
// (0.2 s: he levers the pole back, the gate is open), settle (0.5 s).
const FG = { heave: 1.1 - STRIKE, hit: 1.1, held: 1.1 + HOLD, rec: 1.1 + HOLD + 0.2, end: 1.1 + HOLD + 0.7 };
const CRANK = { a: 0.32, turns: 1.5, r: 0.035 };
const floodgate = {
  dur: FG.end, contact: [FG.hit], kinds: ['flood'], cues: { cone: [0, FG.hit] },
  phases: [['heave', 0], ['slam', FG.heave], ['contact held', FG.hit], ['recoil', FG.held], ['settle', FG.rec]],
  pose: (t) => {
    const BACK = { oy: -0.03, oz: -0.05, hp: 0.12, sp: 0.04, cp: 0.05, np: -0.1, hy: -0.28, cy: -0.14, ny: 0.36 };
    const DOWN = { oy: -0.085, oz: 0.11, hp: -0.34, sp: -0.06, cp: -0.06, np: 0.3, hy: 0.16, cy: 0.1, ny: -0.2 };
    const k = track([[0, {}], [0.16, { oy: -0.03, hp: -0.05 }], [0.55, { ...BACK, oy: -0.02 }], [FG.heave - 0.12, BACK], [FG.heave, { ...BACK, oy: -0.045, hp: 0.15 }],
      [FG.hit, DOWN, 'in'], [FG.held, { ...DOWN, oy: -0.09 }], [FG.rec, { ...DOWN, oy: -0.07, hp: -0.24, oz: 0.09 }], [FG.rec + 0.26, { oy: -0.03, hp: -0.08, oz: 0.03, np: 0.06 }], [FG.end, {}]])(t);
    const a = track([[0, P()], [0.16, P({ ty: 0.05, p: -0.1 })], [0.55, P({ tx: -0.3, ty: 0.3, tz: -0.25, p: -0.75 })], [FG.heave - 0.12, P({ tx: -0.31, ty: 0.36, tz: -0.34, p: -0.9 })], [FG.heave, P({ tx: -0.31, ty: 0.38, tz: -0.36, p: -0.95 })],
      [FG.hit, P({ tx: -0.17, ty: 0.0, tz: 0.76, p: 0.6, yaw: 0.12 }), 'in'], [FG.held, P({ tx: -0.17, ty: 0.0, tz: 0.76, p: 0.62, yaw: 0.12 })],
      [FG.rec, P({ tx: -0.17, ty: 0.0, tz: 0.76, p: 0.76, yaw: 0.12 })], [FG.rec + 0.26, P({ tx: -0.22, ty: 0.06, tz: 0.42, p: 0.3 })], [FG.end, P()]])(t);
    // the left hand: to the wheel, one and a half turns of it, then thrown back as he lunges
    const h = track([[0, { w: 0, back: 0 }], [0.14, { w: 0, back: 0 }], [CRANK.a, { w: 1, back: 0 }], [FG.heave, { w: 1, back: 0 }], [FG.hit, { w: 0, back: 1 }, 'out'], [FG.rec, { w: 0, back: 0.8 }], [FG.end, { w: 0, back: 0 }]])(t);
    const cu = smooth((t - CRANK.a) / (FG.heave - CRANK.a)), ph = 2 * Math.PI * CRANK.turns * cu - 0.6;
    const wp = onChest(k, WHEEL.clone().add(V3(CRANK.r * Math.cos(ph), CRANK.r * Math.sin(ph), 0)));
    const shake = pulse(t, 0.6, 0.72, FG.heave - 0.05, FG.heave) * Math.sin(66 * t);
    return addPose(k, poleOf({ ...a, tx: a.tx + 0.004 * shake }), { BW: h.w, Bx: wp.x, By: wp.y, Bz: wp.z },
      { ulp: -0.55 * h.back, ulr: 0.4 * h.back, flp: 0.25 * h.back, cr: 0.006 * shake, nr: 0.006 * shake },
      cloth(0.3 * bump(t, FG.hit + 0.08, 0.3) - 0.1 * pulse(t, 0.3, 0.6, FG.heave, FG.hit), 0.5 * bump(t, FG.hit + 0.06, 0.34)));
  },
  feet: (t) => ({
    R: steps(t, REST.R, [[0.1, 0.34, off('R', -0.01, 0, -0.11), 0.035], [FG.rec + 0.02, FG.rec + 0.24, REST.R, 0.03]]),
    L: steps(t, REST.L, [[FG.heave - 0.06, FG.hit - 0.004, off('L', 0, 0, 0.2), 0.05, 0.25], [FG.rec + 0.22, FG.rec + 0.46, REST.L, 0.035]]),
  }),
};

// ------------------------------------------------------------------------------------------------ Undertow
// stir (the 78-tick ring less one strike: the stance goes wide, the blade goes to the floor ahead and he stirs the pole
// round, twice and quickening, then lifts it straight up), pound (2.5 frames, landing on the ring's tick: driven
// straight down, both knees deep), contact held (3 frames), recoil (0.2 s), settle (0.5 s).
const UT = { raise: 1.3 - STRIKE, hit: 1.3, held: 1.3 + HOLD, rec: 1.3 + HOLD + 0.2, end: 1.3 + HOLD + 0.7 };
const STIR = { a: 0.2, b: 0.9, turns: 2 };
const undertow = {
  dur: UT.end, contact: [UT.hit], kinds: ['well'], cues: { ring: [0, UT.hit] },
  phases: [['stir', 0], ['lift', STIR.b], ['pound', UT.raise], ['contact held', UT.hit], ['recoil', UT.held], ['settle', UT.rec]],
  pose: (t) => {
    const DOWN = { oy: -0.1, hp: -0.3, sp: -0.06, cp: -0.05, np: 0.28, oz: 0.03 };
    const k = track([[0, {}], [STIR.a, { oy: -0.05, hp: -0.15, oz: 0.03, np: 0.1 }], [STIR.b, { oy: -0.055, hp: -0.17, oz: 0.03, np: 0.12 }], [UT.raise - 0.08, { oy: -0.006, hp: 0.1, cp: 0.06, np: -0.08, oz: -0.01 }], [UT.raise, { oy: 0.0, hp: 0.13, cp: 0.07, np: -0.1, oz: -0.015 }],
      [UT.hit, DOWN, 'in'], [UT.held, { ...DOWN, oy: -0.105 }], [UT.rec, { ...DOWN, oy: -0.085, hp: -0.22 }], [UT.rec + 0.25, { oy: -0.03, hp: -0.07, np: 0.05 }], [UT.end, {}]])(t);
    const a = track([[0, P()], [STIR.a, P({ tx: -0.17, tz: 0.47, p: 0.3 })], [STIR.b, P({ tx: -0.17, tz: 0.47, p: 0.3 })], [UT.raise - 0.08, P({ tx: -0.16, ty: 0.26, tz: 0.37, p: 0.13 })], [UT.raise, P({ tx: -0.16, ty: 0.28, tz: 0.36, p: 0.11 })],
      [UT.hit, P({ tx: -0.15, ty: 0.0, tz: 0.42, p: 0.14 }), 'in'], [UT.held, P({ tx: -0.15, ty: 0.0, tz: 0.42, p: 0.14 })], [UT.rec, P({ tx: -0.15, ty: 0.0, tz: 0.42, p: 0.2 })], [UT.rec + 0.25, P({ tx: -0.2, ty: 0.04, tz: 0.3, p: 0.1 })], [UT.end, P()]])(t);
    const st = pulse(t, STIR.a, STIR.a + 0.14, STIR.b - 0.1, STIR.b), u = clamp((t - STIR.a) / (STIR.b - STIR.a)), ph = 2 * Math.PI * STIR.turns * (0.45 * u + 0.55 * u * u);
    const arm = track([[0, { out: 0, f: 0 }], [STIR.a, { out: 0.35, f: 0 }], [STIR.b, { out: 0.4, f: 0 }], [UT.raise, { out: 0.75, f: 0.15 }], [UT.hit, { out: 0.2, f: 0.6 }, 'in'], [UT.rec, { out: 0.2, f: 0.5 }], [UT.end, { out: 0, f: 0 }]])(t);
    return addPose(k, poleOf({ ...a, p: a.p + 0.09 * st * Math.cos(ph), roll: a.roll + 0.13 * st * Math.sin(ph) }),
      { ox: -0.012 * st * Math.sin(ph), hr: -0.02 * st * Math.sin(ph), cy: 0.06 * st * Math.sin(ph), cr: 0.02 * st * Math.sin(ph), ny: -0.05 * st * Math.sin(ph) },
      { ulr: arm.out, ulp: 0.3 * arm.f, flp: 0.5 * arm.f },
      cloth(0.3 * bump(t, UT.hit + 0.08, 0.3), 0.4 * bump(t, UT.hit + 0.08, 0.34)));
  },
  feet: (t) => ({
    L: steps(t, REST.L, [[0.04, 0.24, off('L', 0.05, 0, 0.02), 0.045, 0.55], [UT.rec + 0.2, UT.rec + 0.42, REST.L, 0.045, 0.55]]),
    R: steps(t, REST.R, [[0.26, 0.44, off('R', -0.04, 0, -0.02), 0.04, 0.55], [UT.rec + 0.0, UT.rec + 0.2, REST.R, 0.04, 0.55]]),
  }),
};

// ------------------------------------------------------------------------------------------------ Rage (a call: the game shows only the visor and a sound)
// gather (he hunches and the pole comes off the floor, the left fist to his chest), roar (2.5 frames: the pole is
// slammed down, the left arm thrown wide, the helmet back, and he shakes with it), square up.
const RG = { gather: 0.34, roar: 0.34 + STRIKE, hold: 1.15, end: 1.6 };
const rage = {
  dur: RG.end, contact: [RG.roar], kinds: ['roar'], phases: [['gather', 0], ['roar', RG.gather], ['enraged', RG.roar], ['squares up', RG.hold]],
  pose: (t) => {
    const IN = { oy: -0.05, hp: -0.2, sp: -0.06, cp: -0.08, np: -0.14 };
    const OUT = { oy: -0.02, hp: 0.12, sp: 0.06, cp: 0.1, np: 0.3, oz: -0.01 };
    const k = track([[0, {}], [RG.gather, IN], [RG.roar, OUT, 'out3'], [RG.hold, { ...OUT, oy: -0.025 }], [RG.hold + 0.2, { oy: -0.03, hp: -0.05, np: 0.0 }], [RG.end, {}]])(t);
    const a = track([[0, P()], [RG.gather, P({ ty: 0.14, tz: 0.2, p: -0.12 })], [RG.roar, P({ ty: 0.0, tz: 0.25, p: 0.1 }), 'in3'], [RG.hold, P({ ty: 0.0, tz: 0.25, p: 0.1 })], [RG.hold + 0.2, P({ ty: 0.012, tz: 0.21, p: 0.03 })], [RG.end, P()]])(t);
    const arm = track([[0, { out: 0, f: 0, e: 0 }], [RG.gather, { out: -0.05, f: 0.35, e: 0.9 }], [RG.roar, { out: 0.95, f: -0.25, e: 0.15 }, 'out3'], [RG.hold, { out: 0.9, f: -0.2, e: 0.15 }], [RG.end, { out: 0, f: 0, e: 0 }]])(t);
    const sh = pulse(t, RG.roar, RG.roar + 0.06, RG.hold - 0.15, RG.hold), w = 50 * t;
    return addPose(k, poleOf({ ...a, roll: 0.02 * Math.sin(w) * sh }), { ulr: arm.out, ulp: arm.f, flp: arm.e },
      { nr: 0.04 * Math.sin(w) * sh, ny: 0.035 * Math.sin(w + 1.3) * sh, cr: 0.018 * Math.sin(w - 0.7) * sh, sr: 0.012 * Math.sin(w - 1.4) * sh },
      cloth(0.25 * bump(t, RG.roar + 0.08, 0.3), 0.3 * bump(t, RG.roar + 0.1, 0.34)));
  },
  feet: allPlanted,
};
// The enraged state, played on top of anything (spine, chest, head and arms only): hunched, quick breath, the helmet low.
const RT = 0.5;
const rageHold = {
  dur: RT, loop: true, upperOnly: true,
  pose: (t) => { const b = Math.sin(2 * Math.PI * t / RT);
    return addPose({ sp: -0.03, cp: -0.06 + 0.025 * b, np: -0.05 - 0.02 * b, ulr: 0.08 + 0.02 * b, flp: 0.16 + 0.03 * b }, poleOf(P())); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything. Only the spine, chest, head and arms move, so planted feet stay planted.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { sp: 0.04, cp: 0.1, cy: 0.08, np: 0.1, ny: 0.24, nr: 0.12, ulr: 0.14, flp: -0.1 }, 'out'], [0.18, { cp: -0.03, ny: -0.04, nr: -0.02, ulr: 0.03 }], [0.42, {}]])(t), poleOf(P())),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers him: driven back two short steps, the pole dragged off the floor and the left arm flung wide, he
// catches himself on the pole, shakes his helmet and squares up.
const HB = -0.09;
const heavyHit = {
  dur: 1.15, contact: [0, 0.44], kinds: ['taken', 'pole'], travel: (t) => HB * EASE.out(clamp(t / 0.32)), phases: [['hit', 0], ['stagger', 0.07], ['shake', 0.44], ['square up', 0.76]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.02, oy: -0.012, hp: 0.18, sp: 0.06, cp: 0.1, cy: -0.14, np: 0.12, ny: -0.34, nr: -0.16 }, 'out'],
      [0.26, { oz: -0.005, oy: -0.055, hp: 0.02, cp: -0.03, cy: -0.05, np: -0.08, ny: -0.14 }],
      [0.46, { oy: -0.05, hp: -0.1, cp: -0.05, np: -0.1 }], [0.78, { oy: -0.02, hp: -0.02, np: 0.02 }], [1.15, {}]])(t);
    const a = track([[0, P()], [0.07, P({ ty: 0.05, tz: 0.27, p: 0.2, roll: 0.06 })], [0.3, P({ ty: 0.04, tz: 0.21, p: 0.1, roll: 0.03 })], [0.44, P({ ty: 0.0, tz: 0.2, p: 0.08 }), 'in'], [0.78, P({ ty: 0.0, tz: 0.2, p: 0.04 })], [0.9, P({ ty: 0.02, tz: 0.19, p: 0.0 })], [1.15, P()]])(t);
    const fl = pulse(t, 0, 0.07, 0.3, 0.6), sh = pulse(t, 0.42, 0.5, 0.66, 0.8), w = 36 * (t - 0.42);
    return addPose(k, poleOf(a), { ulr: 0.75 * fl, ulp: -0.25 * fl, flp: 0.2 * fl, ny: 0.09 * Math.sin(w) * sh, nr: 0.1 * Math.sin(w + 1.3) * sh, cr: 0.018 * Math.sin(w - 0.6) * sh },
      cloth(0.3 * bump(t, 0.12, 0.3), -0.1 * bump(t, 0.12, 0.3)));
  },
  feet: (t) => ({ R: steps(t, REST.R, [[0.03, 0.17, off('R', 0, 0, HB), 0.03, 0.25]]), L: steps(t, REST.L, [[0.16, 0.32, off('L', 0, 0, HB), 0.028, 0.25]]) }),
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: he comes up out of a crouch like a diver
// surfacing, stands to his full height, lifts the pole and thumps it on the floor once: he is on duty.
const SP = { grow: SPAWN, thump: 1.0 + STRIKE };
const spawn = {
  dur: 1.6, contact: [SP.thump], kinds: ['thump'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['rise', SP.grow], ['stands', 0.7], ['on duty', 1.0], ['stand', SP.thump]],
  pose: (t) => {
    const LOWP = { oy: -0.11, hp: -0.3, sp: -0.08, cp: -0.05, np: -0.2 };
    const k = track([[0, LOWP], [SP.grow, LOWP], [0.7, { oy: -0.004, hp: 0.04, cp: 0.04, np: 0.1 }], [1.0, { oy: 0.0, hp: 0.06, cp: 0.05, np: 0.12 }],
      [SP.thump, { oy: -0.035, hp: -0.06, cp: -0.02, np: 0.04 }, 'in'], [SP.thump + HOLD, { oy: -0.037, hp: -0.06, cp: -0.02, np: 0.04 }], [1.36, { oy: -0.012, hp: -0.02 }], [1.6, {}]])(t);
    const a = track([[0, P()], [0.7, P()], [1.0, P({ ty: 0.13, p: -0.06 })], [SP.thump, P({ ty: 0.0, p: 0.03 }), 'in'], [SP.thump + HOLD, P({ ty: 0.0, p: 0.03 })], [1.36, P()], [1.6, P()]])(t);
    const arm = track([[0, { e: 0.5 }], [SP.grow, { e: 0.5 }], [0.7, { e: 0.1 }], [1.6, { e: 0 }]])(t);
    return addPose(k, poleOf(a), { flp: arm.e }, cloth(0.1 * bump(t, 0.5, 0.5), 0.15 * bump(t, 0.5, 0.5)));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// His feet unlock. A jolt, he sets the pole out ahead of him and hangs on it, both knees give and come down, and he
// stays kneeling at his post: the pole upright in his fist, the left arm hanging, the helmet bowed.
const D = { pole: 0.45, knees: 0.98, bow: 1.55, end: 2.4 };
const death = {
  dur: D.end, contact: [D.pole, D.knees], kinds: ['pole', 'thud'], phases: [['jolt', 0], ['hangs on the pole', 0.12], ['the knees give', D.pole], ['kneels', D.knees], ['the helmet bows', D.knees + 0.14], ['still', D.bow]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.1, { hp: 0.12, cp: 0.08, oy: -0.01, oz: -0.02, np: 0.18, ny: -0.2, nr: -0.1 }, 'out'],
      [D.pole, { hp: 0.0, cp: -0.03, oy: -0.04, oz: 0.0, np: -0.08, ny: -0.08 }],
      [D.knees, { hp: -0.02, sp: -0.03, cp: -0.04, oy: -0.15, oz: 0.04, np: -0.05 }, 'in'],
      [D.knees + 0.12, { hp: -0.03, sp: -0.03, cp: -0.06, oy: -0.144, oz: 0.04, np: -0.16 }, 'out'],
      [D.bow, { hp: -0.1, sp: -0.07, cp: -0.1, oy: -0.15, oz: 0.045, np: -0.4, ny: -0.12, nr: -0.04 }],
      [D.end, { hp: -0.11, sp: -0.08, cp: -0.11, oy: -0.152, oz: 0.045, np: -0.44, ny: -0.13, nr: -0.05 }]])(t);
    const a = track([[0, P()], [0.1, P({ p: -0.05 })], [0.28, P({ tx: -0.28, ty: 0.05, tz: 0.25, p: 0.05 })], [D.pole, P({ tx: -0.3, ty: 0.0, tz: 0.3, p: 0.02 }), 'in'],
      [D.knees, P({ tx: -0.3, ty: 0.0, tz: 0.3, p: -0.04, roll: 0.02 })], [D.bow, P({ tx: -0.3, ty: 0.0, tz: 0.3, p: -0.09, roll: 0.04 })], [D.end, P({ tx: -0.3, ty: 0.0, tz: 0.3, p: -0.1, roll: 0.04 })]])(t);
    const kn = smooth((t - D.pole) / (D.knees - D.pole));
    const arm = track([[0, { out: 0, f: 0 }], [0.1, { out: 0.5, f: -0.2 }], [D.pole, { out: 0.15, f: 0 }], [D.knees, { out: 0.1, f: 0.05 }], [D.end, { out: 0.06, f: 0.12 }]])(t);
    return addPose(k, poleOf(a), { ulr: arm.out, ulp: arm.f, flp: -0.08 * kn }, cloth(0.45 * kn, 0.45 * kn));
  },
  feet: (t) => {
    const kn = smooth((t - D.pole) / (D.knees - D.pole)); const F = {};
    for (const k of LEGS) { const sx = k === 'L' ? 1 : -1; const p = REST[k].clone(); p.z += -0.36 * kn; p.x += sx * 0.012 * kn; p.y += 0.036 * kn + 0.02 * Math.sin(Math.PI * kn); F[k] = { p, pitch: 2.4 * kn, lock: t < D.pole }; }
    return F;
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), floodgate, undertow, rage, rageHold, hurt, heavyHit, spawn, death };
