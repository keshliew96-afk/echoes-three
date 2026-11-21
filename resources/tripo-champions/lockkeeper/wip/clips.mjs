// The Lockkeeper's moves. Units are model units (the model is 1 tall; the page draws it 2.3 u tall, CFG.unit).
// Timings come from the game: LK in src/sim/enemies/champions.js (walk 1.05 u/s, keeps 1.6 to 3.4 u off; Chain Hook: a
// 58-tick lane up to 7.5 u long and 0.9 u wide, the key flies down it and drags every hooked hero to his feet over 10
// ticks, stopping about 1.84 u from his middle; Lock Turn: a 70-tick ring of r 2.5 round himself, he turns the key in the
// floor and heroes inside are slowed by half for 1.5 s), CHAMPION_RULES in src/sim/champions.js (a 96-tick entrance, rage
// below half health: cooldowns x0.7, speed x1.15) and the beats in render/facet/beats.js (a frame is 1/30 s: strike 2.5
// frames, contact held 3 frames, spawn grow 7 frames).
// The Tripo model is a stout keeper in a long coat with his left forearm wrapped in chain and a great iron key in the
// left fist. The rig cuts the key free of the fist (wip/rig.py), so it can fly on its chain and be driven into the floor.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, frac } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
export const CFG = {
  name: 'lockkeeper', unit: 2.3,
  // the stance he carries everywhere: knees a little soft, a small stoop under the hat, the right fist a little off his side;
  // keyW 1: the key always holds its own turn in the room (it hangs straight down from the fist unless a move says otherwise)
  base: { oy: -0.014, hp: -0.03, cp: -0.03, np: 0.04, urr: -0.04, frp: 0.08, keyW: 1 },
  chain: [['hips', 'h'], ['spine', 's'], ['chest', 'c'], ['head', 'n']],
  extras: [['upperarmL', 'ul'], ['forearmL', 'fl'], ['handL', 'wl'], ['key', 'key'], ['upperarmR', 'ur'], ['forearmR', 'fr'], ['handR', 'wr'], ['skF', 'kf'], ['skB', 'kb']],
  arms: { A: { b: ['upperarmL', 'forearmL', 'handL'], pole: [0.5, -0.3, -0.8] }, B: { b: ['upperarmR', 'forearmR', 'handR'], pole: [-0.5, -0.3, -0.8] } },
  legs: { L: { kind: 'biped', b: ['thighL', 'shinL', 'footL'] }, R: { kind: 'biped', b: ['thighR', 'shinR', 'footR'] } },
  springs: [{ bone: 'skF', k: 120, c: 8, max: 0.5 }, { bone: 'skB', k: 105, c: 7, max: 0.6 }],
};
const REST = { L: V3(0.12, 0, 0.125), R: V3(-0.13, 0, 0.125) };
const LEGS = ['L', 'R'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const HEEL = 0.188;                                           // from the back of the heel to the toe
const allPlanted = () => ({ L: plant(REST.L), R: plant(REST.R) });
const Xa = V3(1, 0, 0), Ya = V3(0, 1, 0), Za = V3(0, 0, 1);
const qPYR = (p = 0, y = 0, r = 0) => new THREE.Quaternion().setFromAxisAngle(Ya, y).multiply(new THREE.Quaternion().setFromAxisAngle(Xa, -p)).multiply(new THREE.Quaternion().setFromAxisAngle(Za, r));
const _e = new THREE.Euler();
const pyr = (q) => { _e.setFromQuaternion(q, 'YXZ'); return [-_e.x, _e.y, _e.z]; };
const cloth = (front = 0, back = 0) => ({ kfp: front, kbp: -back });
// a foot that is planted, swings to the next spot, is planted again: seq [[lift, land, to, height, droop]]
// (while the toes are up in a swing the foot is lifted so the heel stays off the floor)
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.4); if (s.pitch < 0) s.p.y += HEEL * Math.sin(-s.pitch); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
// ---- the key arm. reach: w says how far the reach is on (0: the arm hangs by its own channels), h is where the wrist
// goes (root space), q (optional) the fist's turn in the room. keyTurn: the key's own turn in the room (it pivots in the fist).
const WR0 = V3(0.226, 0.461, 0.03);                          // the left wrist as he stands
const TIPD = V3(0.014, -0.317, 0.013);                       // the key's teeth from the wrist when fist and key hang straight
const reach = (w, h, q) => { const o = { AW: w, Ax: h.x, Ay: h.y, Az: h.z }; if (q) { const [p, y, r] = pyr(q); Object.assign(o, { wlW: w, wlWp: p, wlWy: y, wlWr: r }); } return o; };
const reachR = (w, h) => ({ BW: w, Bx: h.x, By: h.y, Bz: h.z });
const keyTurn = (p = 0, y = 0, r = 0) => ({ keyWp: p, keyWy: y, keyWr: r });
const v3of = (o) => V3(o.x, o.y, o.z);
// a key that swings on after something lets it drop: a damped pendulum from time t0
const pend = (t, t0, amp, f = 10, d = 3.2) => (t < t0 ? 0 : amp * Math.exp(-d * (t - t0)) * Math.sin(f * (t - t0)));
// ---- a point on his chest after the body's own lean, and the chest's turn (the hands that clutch the key in death)
const HIPS = V3(0, 0.46, 0), SPINE = V3(0, 0.56, 0), CHEST = V3(0, 0.66, 0);
function onChest(k, pt) {
  const c = addPose(CFG.base, k); const qh = qPYR(c.hp, c.hy, c.hr), qs = qh.clone().multiply(qPYR(c.sp, c.sy, c.sr)), qc = qs.clone().multiply(qPYR(c.cp, c.cy, c.cr));
  return { p: HIPS.clone().add(V3(c.ox || 0, c.oy || 0, c.oz || 0)).add(SPINE.clone().sub(HIPS).applyQuaternion(qh)).add(CHEST.clone().sub(SPINE).applyQuaternion(qs)).add(pt.clone().sub(CHEST).applyQuaternion(qc)), q: qc };
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. A toll keeper at his gate: slow breath under the coat, his weight eased from boot to boot, the hat turns left and
// right, the right hand comes out for the toll and goes back, and once a loop he hefts the key and lets it drop to swing.
const idle = {
  dur: 6, loop: true, contact: [4.5], kinds: ['clink'],
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const lookL = pulse(t, 0.3, 0.9, 1.5, 2.1), lookR = pulse(t, 2.4, 3.0, 3.5, 4.0), toll = pulse(t, 0.8, 1.4, 2.5, 3.1);
    const heft = track([[0, { a: 0 }], [3.9, { a: 0 }], [4.28, { a: 1 }], [4.5, { a: 0 }, 'in'], [6, { a: 0 }]])(t).a;
    const sway = pend(t, 4.5, 0.22, 9.5, 2.6) * (1 - smooth((t - 5.3) / 0.7));
    return addPose(
      { oy: 0.003 * br - 0.004 * bump(t, 4.54, 0.3), cp: 0.018 * br, sp: -0.006 * br, ox: 0.01 * sw, hr: 0.012 * sw, sr: -0.008 * sw, cy: 0.03 * lookL - 0.03 * lookR },
      { np: -0.01 * br + 0.05 * heft, ny: 0.34 * lookL - 0.34 * lookR + 0.12 * heft, nr: 0.03 * lookL - 0.03 * lookR },
      { ulr: 0.012 * br + 0.05 * heft, ulp: 0.12 * heft, flp: 0.02 * br + 0.6 * heft }, keyTurn(sway + 0.1 * heft, 0, 0.015 * sw),
      { urp: 0.3 * toll, urr: -0.012 * br - 0.05 * toll, frp: 0.02 * br + 1.05 * toll },
      cloth(0.015 * br, 0.015 * br),
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// 1.05 u/s, 0.8 s a cycle (two steps). Short quick steps under the long coat, the body rolling a little from boot to
// boot, the hat level and fixed on the hero, the right arm swinging, the key swinging on its ring a beat behind the fist.
// The boots point straight ahead (Kesh's rule for humanoids: no splayed feet).
const WT = 0.8;
const GAIT = { T: WT, duty: 0.6, v: 1.05 / CFG.unit };
const GF = { L: { phase: 0, n: [0.112, 0.125], lift: 0.04, droop: 0.4, push: 0.3 }, R: { phase: 0.5, n: [-0.118, 0.125], lift: 0.04, droop: 0.4, push: 0.3 } };
const low = (x) => Math.pow(0.5 + 0.5 * x, 1.7);
// a boot that pushes off rolls over its toe cap, which is round: the toe point rides up a hair so the cap stays on the floor
const roll = (f) => { if (f.lock && f.pitch > 0) f.p.y += 0.0045 * Math.sin(f.pitch); return f; };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT, a = w - 2 * Math.PI * 0.3;                  // a = 0 when the left boot carries him
    const up = low(Math.cos(2 * a));
    return addPose(
      { oy: -0.026 + 0.012 * up, ox: 0.012 * Math.cos(a), hr: 0.028 * Math.cos(a), hy: 0.06 * Math.sin(a), hp: -0.04 },
      { sy: -0.03 * Math.sin(a), sr: -0.016 * Math.cos(a), cy: -0.05 * Math.sin(a), cr: -0.012 * Math.cos(a), cp: -0.03, np: 0.03 - 0.01 * Math.cos(2 * a), ny: 0.02 * Math.sin(a) },
      { ulp: 0.1 * Math.sin(a), ulr: 0.03, flp: 0.08 + 0.05 * Math.sin(a + 0.4) }, keyTurn(0.13 * Math.sin(a - 0.9), 0, 0.03 * Math.cos(a - 0.9)),
      { urp: -0.26 * Math.sin(a), urr: -0.03, frp: 0.14 - 0.1 * Math.sin(a - 0.5) },
      cloth(0.12 + 0.05 * Math.cos(2 * a + 1.0), 0.14 + 0.05 * Math.cos(2 * a + 2.0)),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, roll(gaitFoot(t, GAIT, GF[k]))])),
};
const turn = (dir) => {
  const TT = 0.8; const g = { T: TT, duty: 0.62, v: 0, omega: dir * 2 * Math.PI / 3.2, pivot: [0, 0] };
  const gf = { L: { ...GF.L, n: [0.118, 0.125], lift: 0.028 }, R: { ...GF.R, n: [-0.124, 0.125], lift: 0.028 } };
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT, a = w - 2 * Math.PI * 0.31;
      return addPose({ oy: -0.016 + 0.007 * low(Math.cos(2 * a)), ox: 0.008 * Math.cos(a), hr: 0.016 * Math.cos(a) },
        { sy: 0.04 * dir, cy: 0.07 * dir, ny: 0.3 * dir, nr: 0.03 * dir }, { ulr: 0.04, flp: 0.08, urr: -0.03 },
        keyTurn(0.05 * Math.sin(a - 0.9), 0, -0.06 * dir), cloth(0.05, 0.05)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, roll(gaitFoot(t, g, gf[k]))])),
  };
};

// ------------------------------------------------------------------------------------------------ Chain Hook
// lets the key out (the arm goes out to his left and the key slips out on a hand of chain), whirls it (two and a half
// turns beside him, over the top and forward, faster each turn, the right hand pointing down the lane), casts (2.5 frames, landing on the lane's
// tick: the key leaves the circle straight down the lane, teeth first, to the hero), hooked: contact held (3 frames, the
// chain taut), hauls in (he throws his weight back; the game drags the hero to his feet over 10 ticks from the hit, and
// the key rides in with him), key home (it comes off the hero and back into the fist), settles.
const HK = 58 / 60, DRAG = 10 / 60;
const CH = { out: 0.26, wind: HK - STRIKE, hit: HK, held: HK + HOLD, drag: HK + DRAG, haul: HK + DRAG + 0.06, home: HK + DRAG + 0.32, end: HK + DRAG + 0.8 };
export const HOOK = { far: 5.0, near: 1.84, y: 0.4, bite: 0.27 };     // where the page's hero stands and is dragged to (u), the key's height (model), the ring's place behind the teeth
const HW = V3(0.4, 0.74, 0.0), THETA = 5 * Math.PI, LC = 0.08;
const kdir = (th) => V3(0, -Math.cos(th), Math.sin(th));          // where the teeth point from the ring: th 0 hangs, -pi stands up, pi / 2 (or -3 pi / 2) points down the lane
const thOf = (t) => -THETA * Math.pow(clamp((t - 0.1) / (CH.wind - 0.1)), 1.7);
function hookKey(t) {
  const PF = V3(0, HOOK.y, HOOK.far / CFG.unit - HOOK.bite), PN = V3(0, HOOK.y, HOOK.near / CFG.unit - HOOK.bite);
  const T = (ta, v, p) => ({ keyT: 1, keyTa: ta, keyTx: v.x, keyTy: v.y, keyTz: v.z, ...keyTurn(p, 0, 0) });
  if (t <= CH.wind) { const th = thOf(t); return T(0, kdir(th).multiplyScalar(LC * smooth((t - 0.04) / 0.26)), th); }
  if (t <= CH.hit) { const v = (t - CH.wind) / STRIKE; return T(v, kdir(-THETA).multiplyScalar(LC).lerp(PF, v), -THETA - Math.PI / 2 * smooth(v * 1.6)); }
  if (t <= CH.drag) return T(1, PF.clone().lerp(PN, (t - CH.hit) / DRAG), -THETA - Math.PI / 2);
  if (t <= CH.home) { const u = smooth((t - CH.drag) / (CH.home - CH.drag)); return T(1 - u, PN.clone().multiplyScalar(1 - u), -THETA - Math.PI / 2 - Math.PI / 2 * EASE.in(u)); }
  return keyTurn(pend(t, CH.home, -0.3, 10, 4) * (1 - smooth((t - CH.end + 0.25) / 0.25)), 0, 0);
}
const chainHook = {
  dur: CH.end, contact: [CH.hit, CH.home], kinds: ['hook', 'catch'], cues: { lane: [0, CH.hit], drag: [CH.hit, CH.drag], chain: [0.04, CH.home] },
  phases: [['lets the key out', 0], ['whirls it', CH.out], ['casts', CH.wind], ['hooked: contact held', CH.hit], ['hauls in', CH.held], ['key home', CH.haul], ['settles', CH.home]],
  pose: (t) => {
    const COIL = { oy: -0.03, oz: -0.02, hp: 0.05, sp: 0.03, cp: 0.05, hy: 0.1, sy: 0.12, cy: 0.26, ny: -0.42, np: 0.03 };
    const CAST = { oy: -0.05, oz: 0.05, hp: -0.2, sp: -0.08, cp: -0.1, hy: -0.1, sy: -0.14, cy: -0.3, ny: 0.5, np: 0.3 };
    const HAUL = { oy: -0.06, oz: -0.05, hp: 0.14, sp: 0.05, cp: 0.06, hy: 0.1, sy: 0.15, cy: 0.34, ny: -0.5, np: 0.0 };
    const k = track([[0, {}], [CH.out, { oy: -0.015, hp: 0.03, sy: 0.04, cy: 0.1, ny: -0.12, np: 0.06 }], [CH.wind, COIL], [CH.hit, CAST, 'in'], [CH.held, { ...CAST, oy: -0.052 }], [CH.haul, HAUL], [CH.home, { oy: -0.03, hp: 0.03, cy: 0.1, ny: -0.1 }], [CH.end, {}]])(t);
    const th = thOf(t), circ = pulse(t, 0.2, 0.4, CH.wind - 0.02, CH.wind);
    const h = v3of(track([[0, { x: WR0.x, y: WR0.y, z: WR0.z }], [CH.out, { x: HW.x, y: HW.y - 0.02, z: HW.z }], [CH.wind, { x: HW.x - 0.01, y: HW.y + 0.02, z: HW.z - 0.04 }], [CH.hit, { x: 0.19, y: 0.7, z: 0.46 }, 'in'], [CH.held, { x: 0.19, y: 0.7, z: 0.46 }],
      [CH.haul, { x: 0.31, y: 0.6, z: -0.06 }], [CH.home, { x: 0.27, y: 0.55, z: 0.1 }], [CH.end, { x: WR0.x, y: WR0.y, z: WR0.z }]])(t)).add(kdir(th).multiplyScalar(0.03 * circ));
    const w = pulse(t, 0, 0.1, CH.end - 0.2, CH.end);
    const armR = track([[0, { f: 0, out: 0, e: 0 }], [CH.out, { f: 1.2, out: 0.1, e: 0.1 }], [CH.wind, { f: 1.3, out: 0.1, e: 0.05 }], [CH.hit, { f: -0.5, out: 0.3, e: 0.2 }, 'in'], [CH.held, { f: -0.5, out: 0.3, e: 0.2 }], [CH.haul, { f: 0.5, out: 0.15, e: 1.0 }], [CH.home, { f: 0.2, out: 0.1, e: 0.5 }], [CH.end, { f: 0, out: 0, e: 0 }]])(t);
    const strain = pulse(t, CH.hit, CH.hit + 0.03, CH.drag, CH.haul) * 0.012 * Math.sin(75 * t);
    return addPose(k, reach(w, h), hookKey(t), { urp: armR.f, urr: -armR.out, frp: armR.e, cr: strain, nr: strain },
      cloth(0.25 * bump(t, CH.hit + 0.05, 0.3) - 0.2 * bump(t, CH.haul, 0.3), 0.3 * bump(t, CH.hit + 0.06, 0.34)));
  },
  feet: (t) => ({
    R: steps(t, REST.R, [[CH.wind - 0.07, CH.hit - 0.004, off('R', 0, 0, 0.13), 0.04, 0.3], [CH.home + 0.04, CH.home + 0.28, REST.R, 0.035]]),
    L: plant(REST.L),
  }),
};

// ------------------------------------------------------------------------------------------------ Lock Turn
// raises the key (he draws himself up, the key lifted before him, teeth down), drives it in (he stoops and sets the teeth
// in the floor a step ahead of his left boot), leans on it (the wards grind, the fist wound back), turns (2.5 frames,
// landing on the ring's tick: a quarter turn with his whole weight), contact held (3 frames), pulls it out, settles.
const LK = 70 / 60;
const LT = { raise: 0.42, stab: 0.64, wind: LK - STRIKE, hit: LK, held: LK + HOLD, pull: LK + HOLD + 0.3, end: LK + HOLD + 0.85 };
const SPOT = V3(0.16, -0.01, 0.27), TW = 0.75;               // where the teeth meet the floor (they bite a finger deep), and half the turn
const lockTurn = {
  dur: LT.end, contact: [LT.stab, LT.hit], kinds: ['stab', 'lock'], cues: { ring: [0, LT.hit], hole: [LT.stab, LT.pull] },
  phases: [['raises the key', 0], ['drives it in', LT.raise], ['leans on it', LT.stab], ['turns', LT.wind], ['contact held', LT.hit], ['pulls it out', LT.held], ['settles', LT.pull]],
  pose: (t) => {
    const TALL = { oy: 0.006, hp: 0.05, sp: 0.03, cp: 0.05, np: -0.12 }, STOOP = { oy: -0.096, oz: 0.02, hp: -0.26, sp: -0.44, cp: -0.44, np: 0.55 };
    const k = track([[0, {}], [LT.raise, TALL], [LT.stab, STOOP, 'in'], [LT.wind, { ...STOOP, oy: -0.102, cy: 0.07, sy: 0.03 }], [LT.hit, { ...STOOP, oy: -0.104, cy: -0.24, sy: -0.1, hr: -0.03 }, 'in'], [LT.held, { ...STOOP, oy: -0.104, cy: -0.25, sy: -0.1, hr: -0.03 }],
      [LT.pull, { oy: -0.03, hp: -0.08, sp: -0.1, cp: -0.1, np: 0.12 }], [LT.end, {}]])(t);
    const tw = track([[0, { a: 0 }], [LT.raise, { a: 0.2 }], [LT.stab, { a: 0.45 }], [LT.wind, { a: TW }], [LT.hit, { a: -TW }, 'in'], [LT.held, { a: -TW }], [LT.pull, { a: -0.1 }], [LT.end, { a: 0 }]])(t).a;
    // the teeth: lifted before him, down into the floor, out again; the wrist follows from where the teeth are
    const tip = v3of(track([[0, { x: WR0.x + TIPD.x, y: WR0.y + TIPD.y, z: WR0.z + TIPD.z }], [LT.raise, { x: 0.17, y: 0.36, z: 0.24 }], [LT.stab, { x: SPOT.x, y: SPOT.y, z: SPOT.z }, 'in'], [LT.held, { x: SPOT.x, y: SPOT.y, z: SPOT.z }],
      [LT.pull, { x: 0.2, y: 0.2, z: 0.16 }], [LT.end, { x: WR0.x + TIPD.x, y: WR0.y + TIPD.y, z: WR0.z + TIPD.z }]])(t));
    const grind = pulse(t, LT.stab + 0.04, LT.stab + 0.12, LT.wind - 0.03, LT.wind) * 0.02 * Math.sin(60 * t);
    const q = qPYR(0, tw + grind, 0); const h = tip.clone().sub(TIPD.clone().applyQuaternion(q));
    const w = pulse(t, 0, 0.12, LT.end - 0.2, LT.end);
    const armR = track([[0, { f: 0, out: 0, e: 0 }], [LT.raise, { f: 0.3, out: 0.25, e: 0.5 }], [LT.stab, { f: -0.5, out: 0.55, e: 0.3 }, 'in'], [LT.wind, { f: -0.6, out: 0.6, e: 0.35 }], [LT.hit, { f: -0.2, out: 0.8, e: 0.15 }, 'in'], [LT.held, { f: -0.2, out: 0.8, e: 0.15 }], [LT.pull, { f: 0.1, out: 0.2, e: 0.3 }], [LT.end, { f: 0, out: 0, e: 0 }]])(t);
    return addPose(k, reach(w, h, q), keyTurn(0, (tw + grind) * w, 0), { urp: armR.f, urr: -armR.out, frp: armR.e, nr: grind * 0.5 },
      cloth(0.3 * clamp(-(k.oy || 0) / 0.09) + 0.2 * bump(t, LT.stab + 0.06, 0.3), 0.2 * bump(t, LT.stab + 0.06, 0.34)));
  },
  feet: (t) => ({
    L: plant(REST.L),
    R: steps(t, REST.R, [[LT.raise - 0.04, LT.stab - 0.02, off('R', -0.02, 0, -0.1), 0.035, 0.3], [LT.pull, LT.pull + 0.26, REST.R, 0.035]]),
  }),
};

// ------------------------------------------------------------------------------------------------ Rage (a call: the game shows only the eyes and a sound)
// gather (he hunches over the key, drawn to his chest), roar (2.5 frames: the key is thrust up beside his hat, teeth to
// the sky, the head thrown back, the right fist driven down and wide, and he shakes), then the key drops to swing and his
// right boot stamps.
const RG = { gather: 0.34, roar: 0.34 + STRIKE, hold: 1.08, stamp: 1.24, end: 1.6 };
const rage = {
  dur: RG.end, contact: [RG.roar, RG.stamp], kinds: ['roar', 'stamp'], phases: [['gather', 0], ['roar', RG.gather], ['enraged', RG.roar], ['stamps, squares up', RG.hold]],
  pose: (t) => {
    const IN = { oy: -0.04, hp: -0.16, sp: -0.1, cp: -0.12, np: -0.18 }, OUT = { oy: -0.004, hp: 0.08, sp: 0.06, cp: 0.1, np: 0.36 };
    const k = track([[0, {}], [RG.gather, IN], [RG.roar, OUT, 'out3'], [RG.hold, { ...OUT, np: 0.32 }], [RG.stamp, { oy: -0.035, hp: -0.08, np: -0.02 }, 'in'], [RG.end, {}]])(t);
    const sh = pulse(t, RG.roar, RG.roar + 0.06, RG.hold - 0.12, RG.hold), ws = 58 * t;
    const h = v3of(track([[0, { x: WR0.x, y: WR0.y, z: WR0.z }], [RG.gather, { x: 0.12, y: 0.56, z: 0.19 }], [RG.roar, { x: 0.32, y: 0.9, z: 0.08 }, 'out3'], [RG.hold, { x: 0.32, y: 0.89, z: 0.08 }], [RG.stamp, { x: 0.25, y: 0.5, z: 0.06 }, 'in'], [RG.end, { x: WR0.x, y: WR0.y, z: WR0.z }]])(t));
    const kp = track([[0, { a: 0 }], [RG.gather, { a: 0.5 }], [RG.roar, { a: Math.PI }, 'out3'], [RG.hold, { a: Math.PI }], [RG.stamp, { a: 0.0 }, 'in'], [RG.end, { a: 0 }]])(t).a;
    const arm = track([[0, { out: 0, f: 0, e: 0 }], [RG.gather, { out: 0.0, f: 0.4, e: 1.0 }], [RG.roar, { out: 0.75, f: -0.25, e: 0.25 }, 'out3'], [RG.hold, { out: 0.7, f: -0.2, e: 0.3 }], [RG.end, { out: 0, f: 0, e: 0 }]])(t);
    const w = pulse(t, 0, 0.1, RG.end - 0.2, RG.end);
    return addPose(k, reach(w, h.add(V3(0.006 * Math.sin(ws) * sh, 0, 0.006 * Math.sin(ws + 1) * sh))), keyTurn(kp + pend(t, RG.stamp, 0.25, 10, 5), 0, 0.2 * sh + 0.05 * Math.sin(ws) * sh),
      { urr: -arm.out - 0.04 * Math.sin(ws + 2) * sh, urp: arm.f, frp: arm.e + 0.08 * Math.sin(ws) * sh },
      { nr: 0.05 * Math.sin(ws) * sh, ny: 0.04 * Math.sin(ws + 1.3) * sh, cr: 0.02 * Math.sin(ws - 0.7) * sh, sr: 0.014 * Math.sin(ws - 1.4) * sh },
      cloth(0.3 * bump(t, RG.roar + 0.08, 0.3), 0.3 * bump(t, RG.roar + 0.1, 0.34)));
  },
  feet: (t) => ({ L: plant(REST.L), R: steps(t, REST.R, [[RG.hold - 0.02, RG.stamp, REST.R, 0.07, 0.15]]) }),
};
// The enraged state, played on top of anything (spine, chest, head and arms only): hunched, the key fist up and shaking.
const RT = 0.4;
const rageHold = {
  dur: RT, loop: true, upperOnly: true,
  pose: (t) => { const b = Math.sin(2 * Math.PI * t / RT), c = Math.sin(4 * Math.PI * t / RT);
    return addPose({ sp: -0.04, cp: -0.07 + 0.015 * b, np: -0.08 - 0.015 * b, nr: 0.02 * c, ulr: 0.08 + 0.015 * b, ulp: 0.1, flp: 0.45 + 0.05 * c, urr: -0.1 - 0.015 * b, frp: 0.3 + 0.04 * c }, keyTurn(0.06 * b, 0, 0.05 * c)); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything. Only the spine, chest, head and arms move, so planted feet stay planted. The key swings.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { sp: 0.05, cp: 0.12, cy: 0.1, np: 0.14, ny: 0.26, nr: 0.14, ulr: 0.16, flp: 0.25, urr: -0.2, frp: 0.3 }, 'out'], [0.18, { cp: -0.04, ny: -0.05, nr: -0.03, ulr: 0.04, urr: -0.04 }], [0.42, {}]])(t),
    keyTurn(0.3 * bump(t, 0.1, 0.2) - 0.12 * bump(t, 0.27, 0.22), 0, 0)),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers him: thrown back two steps, the hat snapped back, the right arm flung up and the key swung out
// ahead of him on its ring; he catches himself, the key swings back, and he squares up.
const HB = -0.1;
const heavyHit = {
  dur: 1.15, contact: [0, 0.34], kinds: ['taken', 'step'], travel: (t) => HB * EASE.out(clamp(t / 0.34)), phases: [['hit', 0], ['stagger', 0.07], ['catches himself', 0.46], ['square up', 0.78]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.02, oy: -0.012, hp: 0.2, sp: 0.08, cp: 0.12, cy: -0.14, np: 0.2, ny: -0.3, nr: -0.16 }, 'out'],
      [0.28, { oz: -0.005, oy: -0.05, hp: 0.04, cp: -0.03, cy: -0.05, np: -0.12, ny: -0.12, nr: 0.12 }],
      [0.48, { oy: -0.05, hp: -0.12, cp: -0.06, np: -0.14, nr: 0.14 }], [0.62, { oy: -0.038, hp: -0.08, np: -0.02, nr: -0.03 }], [0.8, { oy: -0.016, hp: -0.02, np: 0.02 }], [1.15, {}]])(t);
    const fl = pulse(t, 0, 0.07, 0.3, 0.6);
    return addPose(k, { ulr: 0.3 * fl, ulp: 0.25 * fl, flp: 0.3 * fl, urr: -0.6 * fl, urp: 0.5 * fl, frp: 0.5 * fl },
      keyTurn(0.75 * bump(t, 0.13, 0.3) + pend(t, 0.28, -0.35, 9, 3.4) * (1 - smooth((t - 0.9) / 0.25)), 0, 0), cloth(0.35 * bump(t, 0.12, 0.3), -0.1 * bump(t, 0.12, 0.3)));
  },
  feet: (t) => ({ R: steps(t, REST.R, [[0.03, 0.18, off('R', 0, 0, HB), 0.04, 0.4]]), L: steps(t, REST.L, [[0.17, 0.34, off('L', 0, 0, HB), 0.04, 0.4]]) }),
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: he comes up stooped under his hat, as out
// of the water, straightens his back, lifts the hat to look at the party, hefts the key and lets it drop to swing, and
// holds out his right hand: the toll.
const SP = { grow: SPAWN, clink: 1.0 + STRIKE };
const spawn = {
  dur: 1.6, contact: [SP.clink], kinds: ['clink'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['straightens', SP.grow], ['looks up', 0.6], ['the toll', 0.86], ['stand', SP.clink + HOLD]],
  pose: (t) => {
    const BOW = { oy: -0.05, hp: -0.26, sp: -0.26, cp: -0.26, np: -0.3 };
    const k = track([[0, BOW], [SP.grow, BOW], [0.45, { oy: -0.025, hp: -0.06, sp: -0.16, cp: -0.22, np: -0.32 }], [0.62, { oy: -0.008, hp: 0.0, sp: -0.02, cp: -0.1, np: -0.24 }], [0.8, { hp: 0.02, cp: 0.03, np: 0.1 }],
      [1.0, { oy: 0.0, hp: 0.03, cp: 0.05, np: 0.08 }], [SP.clink, { oy: -0.018, hp: -0.03, cp: -0.02, np: 0.0 }, 'in'], [SP.clink + HOLD, { oy: -0.02, hp: -0.03, cp: -0.02 }], [1.4, { oy: -0.006, hp: -0.01 }], [1.6, {}]])(t);
    const heft = track([[0, { a: 0.2 }], [0.62, { a: 0.1 }], [1.0, { a: 1 }], [SP.clink, { a: 0 }, 'in'], [1.6, { a: 0 }]])(t).a;
    const toll = pulse(t, 0.86, SP.clink, 1.36, 1.6);
    return addPose(k, { ulr: 0.05 * heft, ulp: 0.12 * heft, flp: 0.6 * heft }, keyTurn(0.1 * heft + pend(t, SP.clink, 0.22, 9.5, 3.2) * (1 - smooth((t - 1.35) / 0.25)), 0, 0),
      { urp: 0.3 * toll, urr: -0.05 * toll, frp: 1.05 * toll }, cloth(0.1 * bump(t, 0.5, 0.5), 0.15 * bump(t, 0.5, 0.5)));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// His feet unlock. A jolt, he totters back two steps, tips over backwards like a felled post and lands flat on his back;
// both hands bring the key to his chest as he goes and hold it there, teeth to his boots. He kept the key. The eyes go out.
const D = { totter: 0.12, tip: 0.72, down: 1.26, end: 2.5 };
// the fall is one turn about his heels: the hips ride an arc of radius PIV.L about the pivot, from a0 (standing) to a1 (down)
const PIV = { z: -0.263, L: 0.45, a0: -0.22, a1: 1.22 };
const hipsAt = (a) => ({ oy: PIV.L * Math.cos(a) - 0.441, oz: PIV.z - PIV.L * Math.sin(a) });
const LIE = { hp: 1.44, sp: 0.03, cp: 0.03, ...hipsAt(PIV.a1), np: -0.3 };
const death = {
  dur: D.end, contact: [D.down], kinds: ['thud'], phases: [['jolt', 0], ['totters back', D.totter], ['tips over', D.tip], ['down', D.down], ['still', D.down + 0.4]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.1, { hp: 0.16, cp: 0.1, oy: -0.01, oz: -0.02, np: 0.22, ny: -0.2, nr: -0.1 }, 'out'],
      [0.42, { hp: -0.08, cp: -0.08, oy: -0.035, oz: -0.07, np: -0.14, ny: -0.06 }],
      [D.tip, { hp: 0.2, sp: 0.05, cp: 0.08, ...hipsAt(PIV.a0), np: 0.05 }],
      [D.down, LIE, 'in'],
      [D.down + 0.12, { ...LIE, np: -0.12 }, 'out'],
      [D.down + 0.4, { ...LIE, np: -0.32 }], [D.end, { ...LIE, np: -0.33 }]])(t);
    if (t >= D.tip) { const u = EASE.in(clamp((t - D.tip) / (D.down - D.tip))), bn = bump(t, D.down + 0.1, 0.24); Object.assign(k, hipsAt(lerp(PIV.a0, PIV.a1, u) - 0.035 * bn), { hp: lerp(0.2, LIE.hp, u) - 0.05 * bn }); }
    // the hands come to the chest: the key lies along his front, the fist under his chin and the right hand over it
    const c = smooth((t - 0.3) / 0.6), lie = onChest(k, V3(0.035, 0.665, 0.165)), lieR = onChest(k, V3(-0.05, 0.675, 0.175));
    const h = WR0.clone().lerp(lie.p, c); h.x += 0.06 * bump(t, 0.12, 0.5); h.y += 0.04 * bump(t, 0.12, 0.5);
    const q = new THREE.Quaternion().slerp(lie.q.clone().multiply(qPYR(0.05, 0, 0)), c); const [kp, ky, kr] = pyr(q);
    const fl = pulse(t, 0, 0.08, 0.3, 0.6);
    return addPose(k, reach(1, h, q), keyTurn(kp, ky, kr), { Aex: 0.9, Aey: -0.4, Aez: 0.1 }, reachR(c, lieR.p), { Bex: -0.9, Bey: -0.4, Bez: 0.1 },
      { urr: -0.5 * fl, urp: 0.4 * fl, frp: 0.4 * fl }, cloth(0.2 * bump(t, D.tip + 0.3, 0.5), -0.14 * smooth((t - D.tip - 0.25) / 0.3)));
  },
  feet: (t) => {
    const fall = EASE.in(clamp((t - D.tip) / (D.down - D.tip))), ph = fall * Math.PI / 2; const F = {};
    const st = { R: steps(t, REST.R, [[0.1, 0.3, off('R', 0, 0, -0.12), 0.035, 0.3], [0.48, 0.66, off('R', 0, 0, -0.2), 0.03, 0.3]]), L: steps(t, REST.L, [[0.28, 0.48, off('L', 0, 0, -0.2), 0.035, 0.3]]) };
    for (const kk of LEGS) { const s = st[kk]; if (t < D.tip) { F[kk] = s; continue; }
      const p = s.p.clone(); p.y += HEEL * Math.sin(ph); p.z -= HEEL * (1 - Math.cos(ph)); F[kk] = { p, pitch: -ph, lock: false }; }
    return F;
  },
};

// Tripo set his boots toes-out (the left about 6 degrees, the right about 12). Every clip turns each foot in so the toes
// point straight ahead (Kesh's rule for humanoids: no splayed walk), and a planted foot keeps its heading when the hips turn.
const TOE = { L: -0.10, R: 0.21 };
const straight = (c) => (c.feet ? { ...c, feet: (t, B) => { const F = c.feet(t, B); for (const k of LEGS) F[k] = { ...F[k], yaw: (F[k].yaw ?? 0) + TOE[k] }; return F; } } : c);
export const CLIPS = Object.fromEntries(Object.entries({ idle, walk, turnL: turn(1), turnR: turn(-1), chainHook, lockTurn, rage, rageHold, hurt, heavyHit, spawn, death }).map(([n, c]) => [n, straight(c)]));
