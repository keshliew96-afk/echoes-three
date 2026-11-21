// The Bone Reeve's moves. Units are model units (the model is 1 tall with its scythe; the page draws it 2.8 u tall, CFG.unit).
// Timings come from the game: BR in src/sim/enemies/champions.js (walk 1.2 u/s, keeps 1.5 to 3 u off; Reaping Sweep: a
// 54-tick cone of r 2.7 and 75 degrees each side; Grave Lance: a 66-tick lane 8 u long and 1.1 u wide), CHAMPION_RULES in
// src/sim/champions.js (a 96-tick entrance, rage below half health: cooldowns x0.7, speed x1.15) and the beats in
// render/facet/beats.js (a frame is 1/30 s: strike 2.5 frames, contact held 3 frames, spawn grow 7 frames).
// Tripo grew a second right forearm hanging from the scythe arm's elbow: the rig takes it off (wip/rig.py).
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, frac } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
export const CFG = {
  name: 'bonereeve', unit: 2.8,
  // the stance he carries everywhere: tall and stiff, the skull a little forward on the neck, the left arm hanging
  base: { hp: -0.02, cp: -0.03, np: -0.05, ulr: 0.03, flp: 0.06 },
  chain: [['hips', 'h'], ['spine', 's'], ['chest', 'c'], ['head', 'n']],
  extras: [['upperarmL', 'ul'], ['forearmL', 'fl'], ['upperarmR', 'ur'], ['forearmR', 'fr'], ['handR', 'wr'], ['skF', 'kf'], ['skF2', 'kg'], ['skB', 'kb'], ['skB2', 'kc']],
  arms: { A: { b: ['upperarmR', 'forearmR', 'handR'], pole: [-0.5, -0.3, -0.8] } },
  legs: { L: { kind: 'biped', b: ['thighL', 'shinL', 'footL'] }, R: { kind: 'biped', b: ['thighR', 'shinR', 'footR'] } },
  springs: [{ bone: 'skF', k: 110, c: 7, max: 0.4 }, { bone: 'skB', k: 100, c: 6.5, max: 0.4 }, { bone: 'skF2', k: 80, c: 5.5, max: 0.6 }, { bone: 'skB2', k: 70, c: 5, max: 0.7 }],
};
const REST = { L: V3(0.072, 0, 0.085), R: V3(-0.072, 0, 0.085) };
const LEGS = ['L', 'R'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const allPlanted = () => ({ L: plant(REST.L), R: plant(REST.R) });
const Xa = V3(1, 0, 0), Ya = V3(0, 1, 0), Za = V3(0, 0, 1);
// the robe: front and back strips from the belt (front, back) and the two halves of the robe below the knee (f2, b2); positive swings the hem outwards
const cloth = (front = 0, back = 0, f2 = front, b2 = back) => ({ kfp: front * 0.4, kbp: -back * 0.4, kgp: f2, kcp: -b2 });
// a foot that is planted, swings to the next spot, is planted again: seq [[lift, land, to, height, droop]]
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.55); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
// ---- the scythe. Its hand is one piece with it, so the hand holds the scythe's turn in the room and the arm follows.
// A key says where the staff points (d, towards the blade end), where the blade points (b) and either where the staff's
// butt stands (butt) or where the hand is (h), in root space. Between keys the turn is slerped; two keys that both name
// the butt keep the butt on its line, so a planted staff stays planted.
const B0 = V3(0.812, 0, -0.584);                             // where the blade points at rest, seen from above: to his left and back
const BUTT = V3(-0.017, -0.609, 0.048);                      // the staff's butt from the hand joint, at rest
const BUTT0 = [-0.148, 0.004, 0.102];                        // standing on the floor beside his right foot
const E0T = new THREE.Matrix4().makeBasis(Ya, B0, Ya.clone().cross(B0)).transpose();
function aim(d, b = [B0.x, 0, B0.z]) {
  const f1 = V3(...d).normalize(), f2 = V3(...b); f2.addScaledVector(f1, -f2.dot(f1)).normalize(); const f3 = f1.clone().cross(f2);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f1, f2, f3).multiply(E0T));
}
const UP = aim([0, 1, 0]);
const handOf = (k) => k.h ? V3(...k.h) : V3(...k.butt).sub(BUTT.clone().applyQuaternion(k.q));
const K = (t, o, ease) => ({ t, q: UP, butt: o.h ? undefined : BUTT0, ...o, ease });
function scy(keys) {
  return (t) => {
    let i = 0; while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1]; let u = clamp((t - a.t) / Math.max(1e-6, b.t - a.t)); u = b.ease ? EASE[b.ease](u) : smooth(u);
    const q = a.q.clone().slerp(b.q, u);
    const h = a.butt && b.butt ? V3(...a.butt).lerp(V3(...b.butt), u).sub(BUTT.clone().applyQuaternion(q)) : handOf(a).lerp(handOf(b), u);
    return { h, q };
  };
}
const _e = new THREE.Euler();
// the channels for a scythe state, with an optional extra turn dq (a tremble) applied in the room
function hold(s, dq) {
  const q = dq ? dq.clone().multiply(s.q) : s.q; _e.setFromQuaternion(q, 'YXZ');
  return { AW: 1, Ax: s.h.x, Ay: s.h.y, Az: s.h.z, wrW: 1, wrWp: -_e.x, wrWy: _e.y, wrWr: _e.z };
}
const still = (o = {}) => hold(scy([K(0, o), K(1, o)])(0));
const shake = (ax, ay, az) => new THREE.Quaternion().setFromEuler(new THREE.Euler(ax, ay, az));
const yawQ = (a) => new THREE.Quaternion().setFromAxisAngle(Ya, a);
const rotY = (v, a) => V3(...v).applyAxisAngle(Ya, a).toArray();

// ------------------------------------------------------------------------------------------------ idle
// 6 s. A steward of the dead at his post: he stands very straight and barely breathes, the skull turns slowly to one
// side and the other as if counting, the left hand comes up to his tally tags and falls again, and once a loop he
// raps the scythe's butt on the floor.
const idle = {
  dur: 6, loop: true, contact: [4.6], kinds: ['rap'],
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const lookL = pulse(t, 0.4, 1.2, 1.8, 2.5), lookR = pulse(t, 2.8, 3.5, 3.9, 4.4), tally = pulse(t, 1.9, 2.5, 3.1, 3.7);
    const lift = track([[0, { y: 0 }], [4.15, { y: 0 }], [4.48, { y: 0.035 }], [4.6, { y: 0 }, 'in'], [6, { y: 0 }]])(t).y;
    return addPose(
      { oy: 0.002 * br - 0.004 * bump(t, 4.64, 0.3), cp: 0.012 * br, sp: -0.005 * br, ox: 0.006 * sw, hr: 0.008 * sw, sr: -0.006 * sw, cy: 0.03 * lookL - 0.03 * lookR },
      { np: -0.01 * br - 0.1 * tally, ny: 0.42 * lookL - 0.42 * lookR + 0.2 * tally, nr: 0.06 * lookL - 0.06 * lookR + 0.05 * tally },
      { ulr: 0.01 * br + 0.05 * tally, ulp: 0.12 * tally, flp: 0.02 * br + 0.85 * tally },
      hold(scy([K(0, { butt: [BUTT0[0], BUTT0[1] + lift, BUTT0[2]], q: aim([0.012 * sw, 1, 0.014 * br - 0.04 * bump(t, 4.4, 0.5)]) }), K(1, {})])(0)),
      cloth(0.015 * br, 0.015 * br),
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// 1.2 u/s, 1.0 s a cycle (two steps). He stalks: long unhurried steps under the robe, the body upright and almost still,
// the skull fixed on the hero, the scythe carried upright beside him with its butt just off the floor, the robe trailing.
// The feet fall close to one line and point straight ahead (Kesh's rule for humanoids: no splayed feet).
const WT = 1.0;
const GAIT = { T: WT, duty: 0.6, v: 1.2 / CFG.unit };
const GF = { L: { phase: 0, n: [0.06, 0.085], lift: 0.05, droop: 0.5, push: 0.3 }, R: { phase: 0.5, n: [-0.06, 0.085], lift: 0.05, droop: 0.5, push: 0.3 } };
const low = (x) => Math.pow(0.5 + 0.5 * x, 1.7);
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT, a = w - 2 * Math.PI * 0.3;                  // a = 0 when the left foot carries him
    const up = low(Math.cos(2 * a));
    return addPose(
      { oy: -0.02 + 0.01 * up, ox: 0.008 * Math.cos(a), hr: 0.02 * Math.cos(a), hy: 0.07 * Math.sin(a), hp: -0.05 },
      { sy: -0.03 * Math.sin(a), sr: -0.012 * Math.cos(a), cy: -0.05 * Math.sin(a), cr: -0.01 * Math.cos(a), cp: -0.03, np: 0.03 - 0.008 * Math.cos(2 * a), ny: -0.02 * Math.sin(a) },
      { ulp: 0.22 * Math.sin(a), ulr: 0.04, flp: 0.1 + 0.08 * Math.sin(a + 0.5) },
      hold(scy([K(0, { butt: [BUTT0[0], 0.022 + 0.006 * Math.cos(2 * a), BUTT0[2] + 0.02 - 0.012 * Math.sin(a)], q: aim([0.01 * Math.cos(a), 1, 0.07 + 0.03 * Math.sin(a)]) }), K(1, {})])(0)),
      cloth(0.1, 0.1, 0.2 + 0.1 * Math.cos(2 * a + 1.0), 0.22 + 0.08 * Math.cos(2 * a + 2.0)),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const TT = 0.9; const g = { T: TT, duty: 0.62, v: 0, omega: dir * 2 * Math.PI / 3.2, pivot: [0, 0] };
  const gf = { L: { ...GF.L, n: [0.068, 0.085], lift: 0.03 }, R: { ...GF.R, n: [-0.068, 0.085], lift: 0.03 } };
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT, a = w - 2 * Math.PI * 0.31;
      return addPose({ oy: -0.012 + 0.006 * low(Math.cos(2 * a)), ox: 0.006 * Math.cos(a), hr: 0.012 * Math.cos(a) },
        { sy: 0.04 * dir, cy: 0.07 * dir, ny: 0.3 * dir, nr: 0.03 * dir }, { ulr: 0.05, flp: 0.08 },
        hold(scy([K(0, { butt: [BUTT0[0], 0.02 + 0.004 * Math.cos(2 * a), BUTT0[2]], q: aim([-0.03 * dir, 1, 0.03]) }), K(1, {})])(0)), cloth(0.05, 0.05)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ Reaping Sweep
// draws back (the 54-tick cone less one strike: the right foot goes back, he turns away to his right and lays the scythe
// level under his arm, the blade low and behind him, and coils), sweep (2.5 frames, landing on the cone's tick: the whole
// body unwinds and the blade comes round across his front), contact held (3 frames), follow-through (0.2 s: the blade
// carries on round to his left), settle (0.55 s: he stands the scythe up again).
const RS = { wind: 0.9 - STRIKE, hit: 0.9, held: 0.9 + HOLD, thru: 0.9 + HOLD + 0.2, end: 0.9 + HOLD + 0.75 };
const TUCK = { h: [-0.12, 0.535, 0.11], d: [0.1, -0.42, 0.9], b: [1, -0.1, 0] };       // the couched scythe, facing ahead: turned by psi about his middle
const psiOf = track([[0, { a: 0 }], [0.5, { a: -1.2 }], [RS.wind, { a: -1.3 }], [RS.hit, { a: 0.3 }, 'in'], [RS.held, { a: 0.36 }], [RS.thru, { a: 1.25 }, 'out'], [RS.thru + 0.15, { a: 1.3 }], [RS.end, { a: 0 }]]);
const tuckAt = (psi, dy = 0) => ({ h: rotY([TUCK.h[0], TUCK.h[1] + dy, TUCK.h[2]], psi), q: aim(rotY(TUCK.d, psi), rotY(TUCK.b, psi)) });
const reaping = {
  dur: RS.end, contact: [RS.hit], kinds: ['reap'], cues: { cone: [0, RS.hit] },
  phases: [['draws back', 0], ['sweep', RS.wind], ['contact held', RS.hit], ['follow-through', RS.held], ['settle', RS.thru]],
  pose: (t) => {
    const psi = psiOf(t).a, tw = pulse(t, 0, 0.3, RS.thru, RS.end);
    const k = track([[0, {}], [0.5, { oy: -0.05, hp: -0.16, cp: -0.06, np: 0.1 }], [RS.wind, { oy: -0.06, hp: -0.18, cp: -0.07, np: 0.12 }], [RS.hit, { oy: -0.04, hp: -0.14, cp: -0.04, np: 0.06 }, 'in'],
      [RS.held, { oy: -0.042, hp: -0.14, cp: -0.04, np: 0.06 }], [RS.thru, { oy: -0.03, hp: -0.1, cp: -0.02, np: 0.04 }], [RS.end, {}]])(t);
    // the scythe: stood up, couched and turned with him, stood up again
    const s = scy([K(0, {}), K(0.34, tuckAt(-0.8, 0.02)), K(0.5, tuckAt(-1.2)), K(RS.wind, tuckAt(-1.3, -0.01)), K(RS.hit, tuckAt(0.3), 'in'), K(RS.held, tuckAt(0.36)), K(RS.thru, tuckAt(1.25, 0.02), 'out'), K(RS.thru + 0.15, tuckAt(1.3, 0.03)), K(RS.end, {})])(t);
    const trem = pulse(t, 0.5, 0.56, RS.wind - 0.03, RS.wind) * 0.012 * Math.sin(70 * t);
    const armL = track([[0, { out: 0, f: 0, e: 0 }], [0.5, { out: 0.35, f: 0.5, e: 0.5 }], [RS.wind, { out: 0.4, f: 0.55, e: 0.55 }], [RS.hit, { out: 0.7, f: -0.5, e: 0.15 }, 'in'], [RS.thru, { out: 0.8, f: -0.7, e: 0.1 }], [RS.end, { out: 0, f: 0, e: 0 }]])(t);
    return addPose(k, { hy: 0.32 * psi * tw, sy: 0.2 * psi * tw, cy: 0.24 * psi * tw, ny: -0.5 * psi * tw, hr: -0.03 * psi * tw },
      hold(s, shake(trem, 0, trem)), { ulr: armL.out, ulp: armL.f, flp: armL.e },
      cloth(0.25 * bump(t, RS.hit + 0.05, 0.4), 0.3 * bump(t, RS.hit + 0.08, 0.44)));
  },
  feet: (t) => ({
    R: steps(t, REST.R, [[0.06, 0.3, off('R', -0.03, 0, -0.14), 0.04], [RS.thru + 0.12, RS.thru + 0.36, REST.R, 0.04]]),
    L: plant(REST.L),
  }),
};

// ------------------------------------------------------------------------------------------------ Grave Lance
// marks the lane (the 66-tick lane less one strike: he lifts the scythe off the floor and draws himself up, and the
// left arm comes up and points down the lane at the hero), strike (2.5 frames, landing on the lane's tick: the staff's
// butt is driven into the floor ahead of him and the pointing hand cuts down), contact held (3 frames), recoil (0.2 s),
// settle (0.55 s). The bone spikes run out along the lane from the butt.
const GL = { raise: 1.1 - STRIKE, hit: 1.1, held: 1.1 + HOLD, rec: 1.1 + HOLD + 0.2, end: 1.1 + HOLD + 0.75 };
const LB = [BUTT0[0] + 0.03, 0, BUTT0[2] + 0.1];             // where the butt comes down
const lance = {
  dur: GL.end, contact: [GL.hit], kinds: ['lance'], cues: { lane: [0, GL.hit] },
  phases: [['marks the lane', 0], ['strike', GL.raise], ['contact held', GL.hit], ['recoil', GL.held], ['settle', GL.rec]],
  pose: (t) => {
    const TALL = { oy: 0.004, hp: 0.07, sp: 0.03, cp: 0.05, np: -0.12 }, DOWN = { oy: -0.065, hp: -0.26, sp: -0.06, cp: -0.06, np: 0.22, oz: 0.02 };
    const k = track([[0, {}], [0.45, TALL], [GL.raise, { ...TALL, oy: 0.006, hp: 0.09 }], [GL.hit, DOWN, 'in'], [GL.held, { ...DOWN, oy: -0.068 }], [GL.rec, { ...DOWN, oy: -0.05, hp: -0.18, np: 0.1 }], [GL.rec + 0.25, { oy: -0.015, hp: -0.05 }], [GL.end, {}]])(t);
    const s = scy([K(0, {}), K(0.45, { butt: [BUTT0[0], 0.2, BUTT0[2] + 0.03], q: aim([0.02, 1, -0.1]) }), K(GL.raise, { butt: [BUTT0[0], 0.23, BUTT0[2] + 0.03], q: aim([0.02, 1, -0.13]) }),
      K(GL.hit, { butt: LB, q: aim([0, 1, 0.1]) }, 'in'), K(GL.held, { butt: LB, q: aim([0, 1, 0.1]) }), K(GL.rec, { butt: LB, q: aim([0, 1, 0.16]) }), K(GL.rec + 0.3, { butt: [BUTT0[0], 0.03, BUTT0[2] + 0.03], q: aim([0, 1, 0.05]) }), K(GL.end, {})])(t);
    const trem = pulse(t, 0.45, 0.52, GL.raise - 0.03, GL.raise) * 0.01 * Math.sin(64 * t);
    const armL = track([[0, { out: 0, f: 0, e: 0 }], [0.4, { out: 0.12, f: 1.35, e: 0.1 }], [GL.raise, { out: 0.12, f: 1.42, e: 0.06 }], [GL.hit, { out: 0.1, f: 0.5, e: 0.0 }, 'in'], [GL.rec, { out: 0.1, f: 0.4, e: 0.05 }], [GL.end, { out: 0, f: 0, e: 0 }]])(t);
    const sq = 0.45 * clamp(-(k.oy || 0) / 0.065);              // the robe's lower half lays out as he drops, so the hem stays on the floor
    return addPose(k, hold(s, shake(trem, 0, trem)), { ulr: armL.out, ulp: armL.f, flp: armL.e, fly: 0 },
      cloth(0.3 * bump(t, GL.hit + 0.08, 0.3), 0.36 * bump(t, GL.hit + 0.08, 0.34), 0.3 * bump(t, GL.hit + 0.08, 0.3) + sq, 0.22 * bump(t, GL.hit + 0.08, 0.34) + sq));
  },
  feet: (t) => ({
    L: steps(t, REST.L, [[GL.raise - 0.08, GL.hit - 0.004, off('L', 0, 0, 0.12), 0.045, 0.3], [GL.rec + 0.24, GL.rec + 0.48, REST.L, 0.04]]),
    R: plant(REST.R),
  }),
};

// ------------------------------------------------------------------------------------------------ Rage (a call: the game shows only the eyes and a sound)
// gather (he folds in on himself, the scythe drawn against his chest), roar (2.5 frames: the scythe is thrust up, the skull
// thrown back, the left arm wide, and every bone rattles), then the butt comes down with a rap and he squares up.
const RG = { gather: 0.34, roar: 0.34 + STRIKE, hold: 1.1, rap: 1.24, end: 1.6 };
const rage = {
  dur: RG.end, contact: [RG.roar, RG.rap], kinds: ['roar', 'rap'], phases: [['gather', 0], ['roar', RG.gather], ['enraged', RG.roar], ['squares up', RG.hold]],
  pose: (t) => {
    const IN = { oy: -0.04, hp: -0.2, sp: -0.08, cp: -0.1, np: -0.2 }, OUT = { oy: 0.0, hp: 0.1, sp: 0.06, cp: 0.1, np: 0.42 };
    const k = track([[0, {}], [RG.gather, IN], [RG.roar, OUT, 'out3'], [RG.hold, { ...OUT, np: 0.38 }], [RG.rap, { oy: -0.03, hp: -0.08, np: -0.04 }, 'in'], [RG.end, {}]])(t);
    const s = scy([K(0, {}), K(RG.gather, { butt: [BUTT0[0] + 0.02, 0.06, BUTT0[2] - 0.02], q: aim([0.06, 1, -0.06]) }), K(RG.roar, { butt: [BUTT0[0] - 0.02, 0.21, BUTT0[2] + 0.02], q: aim([-0.1, 1, 0.05]) }, 'out3'),
      K(RG.hold, { butt: [BUTT0[0] - 0.02, 0.2, BUTT0[2] + 0.02], q: aim([-0.1, 1, 0.05]) }), K(RG.rap, { butt: BUTT0, q: UP }, 'in'), K(RG.end, {})])(t);
    const arm = track([[0, { out: 0, f: 0, e: 0 }], [RG.gather, { out: -0.02, f: 0.5, e: 1.1 }], [RG.roar, { out: 1.0, f: -0.2, e: 0.2 }, 'out3'], [RG.hold, { out: 0.95, f: -0.15, e: 0.25 }], [RG.end, { out: 0, f: 0, e: 0 }]])(t);
    const sh = pulse(t, RG.roar, RG.roar + 0.06, RG.hold - 0.12, RG.hold), w = 58 * t;
    return addPose(k, hold(s, shake(0.02 * Math.sin(w) * sh, 0, 0.02 * Math.sin(w + 1) * sh)), { ulr: arm.out + 0.04 * Math.sin(w + 2) * sh, ulp: arm.f, flp: arm.e + 0.08 * Math.sin(w) * sh },
      { nr: 0.06 * Math.sin(w) * sh, ny: 0.05 * Math.sin(w + 1.3) * sh, cr: 0.02 * Math.sin(w - 0.7) * sh, sr: 0.014 * Math.sin(w - 1.4) * sh },
      cloth(0.3 * bump(t, RG.roar + 0.08, 0.3), 0.3 * bump(t, RG.roar + 0.1, 0.34)));
  },
  feet: allPlanted,
};
// The enraged state, played on top of anything (spine, chest, head and arms only): bent forward, the skull low and twitching.
const RT = 0.4;
const rageHold = {
  dur: RT, loop: true, upperOnly: true,
  pose: (t) => { const b = Math.sin(2 * Math.PI * t / RT), c = Math.sin(4 * Math.PI * t / RT);
    return addPose({ sp: -0.04, cp: -0.07 + 0.015 * b, np: -0.1 - 0.015 * b, nr: 0.025 * c, ulr: 0.06 + 0.015 * b, flp: 0.3 + 0.04 * c }, still()); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything. Only the spine, chest, head and arms move, so planted feet stay planted.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { sp: 0.05, cp: 0.12, cy: 0.1, np: 0.14, ny: 0.3, nr: 0.16, ulr: 0.2, flp: 0.3 }, 'out'], [0.18, { cp: -0.04, ny: -0.05, nr: -0.03, ulr: 0.04 }], [0.42, {}]])(t), still()),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers him: thrown back two steps, the scythe dragged off the floor and the left arm flung up, he catches
// himself on the staff, the skull lolls and snaps straight, and he squares up.
const HB = -0.1;
const heavyHit = {
  dur: 1.15, contact: [0, 0.46], kinds: ['taken', 'rap'], travel: (t) => HB * EASE.out(clamp(t / 0.34)), phases: [['hit', 0], ['stagger', 0.07], ['catches himself', 0.46], ['square up', 0.78]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.02, oy: -0.01, hp: 0.22, sp: 0.08, cp: 0.12, cy: -0.16, np: 0.2, ny: -0.36, nr: -0.2 }, 'out'],
      [0.28, { oz: -0.005, oy: -0.05, hp: 0.04, cp: -0.03, cy: -0.05, np: -0.14, ny: -0.14, nr: 0.16 }],
      [0.48, { oy: -0.045, hp: -0.12, cp: -0.06, np: -0.16, nr: 0.2 }], [0.62, { oy: -0.035, hp: -0.08, np: -0.02, nr: -0.04 }], [0.8, { oy: -0.015, hp: -0.02, np: 0.02 }], [1.15, {}]])(t);
    const s = scy([K(0, {}), K(0.08, { butt: [BUTT0[0], 0.05, BUTT0[2] + 0.07], q: aim([0.05, 1, -0.2]) }), K(0.3, { butt: [BUTT0[0], 0.04, BUTT0[2] + 0.02], q: aim([0.02, 1, -0.1]) }),
      K(0.46, { butt: [BUTT0[0], 0.0, BUTT0[2] + 0.02], q: aim([0, 1, 0.08]) }, 'in'), K(0.8, { butt: [BUTT0[0], 0.0, BUTT0[2] + 0.02], q: aim([0, 1, 0.04]) }), K(0.92, { butt: [BUTT0[0], 0.02, BUTT0[2] + 0.01], q: UP }), K(1.15, {})])(t);
    const fl = pulse(t, 0, 0.07, 0.3, 0.6);
    return addPose(k, hold(s), { ulr: 0.6 * fl, ulp: 0.5 * fl, flp: 0.4 * fl }, cloth(0.35 * bump(t, 0.12, 0.3), -0.1 * bump(t, 0.12, 0.3)));
  },
  feet: (t) => ({ R: steps(t, REST.R, [[0.03, 0.18, off('R', 0, 0, HB), 0.04, 0.4]]), L: steps(t, REST.L, [[0.17, 0.34, off('L', 0, 0, HB), 0.04, 0.4]]) }),
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: he comes up folded in a deep bow, unfolds
// one joint after another, the skull last, stands to his full height and raps the scythe on the floor: court is in session.
const SP = { grow: SPAWN, rap: 1.0 + STRIKE };
const spawn = {
  dur: 1.6, contact: [SP.rap], kinds: ['rap'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['unfolds', SP.grow], ['stands', 0.75], ['raps', 1.0], ['stand', SP.rap]],
  pose: (t) => {
    const BOW = { oy: -0.05, hp: -0.42, sp: -0.2, cp: -0.2, np: -0.4 };
    const k = track([[0, BOW], [SP.grow, BOW], [0.42, { oy: -0.02, hp: -0.06, sp: -0.16, cp: -0.2, np: -0.4 }], [0.58, { oy: -0.006, hp: 0.0, sp: 0.0, cp: -0.12, np: -0.36 }], [0.72, { hp: 0.02, cp: 0.02, np: -0.2 }], [0.86, { hp: 0.03, cp: 0.04, np: 0.12 }],
      [1.0, { oy: 0.002, hp: 0.04, cp: 0.05, np: 0.1 }], [SP.rap, { oy: -0.02, hp: -0.04, cp: -0.02, np: -0.02 }, 'in'], [SP.rap + HOLD, { oy: -0.022, hp: -0.04, cp: -0.02, np: -0.02 }], [1.36, { oy: -0.008, hp: -0.01 }], [1.6, {}]])(t);
    const s = scy([K(0, { butt: [BUTT0[0], 0.012, BUTT0[2]], q: aim([0, 1, 0.1]) }), K(0.6, { q: aim([0, 1, 0.02]) }), K(0.75, {}), K(1.0, { butt: [BUTT0[0], 0.1, BUTT0[2]], q: aim([0, 1, -0.05]) }), K(SP.rap, {}, 'in'), K(1.6, {})])(t);
    const arm = track([[0, { e: 0.3, f: 0.3 }], [SP.grow, { e: 0.3, f: 0.3 }], [0.75, { e: 0.05, f: 0 }], [1.6, { e: 0, f: 0 }]])(t);
    return addPose(k, hold(s), { flp: arm.e, ulp: arm.f }, cloth(0.1 * bump(t, 0.5, 0.5), 0.15 * bump(t, 0.5, 0.5)));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// His feet unlock. A jolt, he sags on the scythe, both knees give and come down, the body folds forward and the skull
// drops. He ends on his knees, bowed to the floor, hanging by one hand from the scythe that still stands. The eyes go out.
const D = { sag: 0.45, knees: 1.0, fold: 1.6, end: 2.5 };
const KN = { back: -0.375, up: 0.03, hips: -0.262 };          // where the toes go and how far the hips come down, on both knees
const death = {
  dur: D.end, contact: [D.knees, D.fold], kinds: ['thud', 'slump'], phases: [['jolt', 0], ['sags on the scythe', 0.12], ['the knees give', D.sag], ['kneels', D.knees], ['folds', D.knees + 0.1], ['still', D.fold]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.1, { hp: 0.14, cp: 0.1, oy: -0.008, oz: -0.02, np: 0.24, ny: -0.22, nr: -0.12 }, 'out'],
      [D.sag, { hp: -0.04, cp: -0.06, oy: -0.045, oz: 0.0, np: -0.14, ny: -0.08 }],
      [D.knees, { hp: -0.06, sp: -0.04, cp: -0.06, oy: KN.hips, oz: 0.03, np: -0.1 }, 'in'],
      [D.knees + 0.12, { hp: -0.1, sp: -0.05, cp: -0.08, oy: KN.hips + 0.008, oz: 0.03, np: -0.2 }, 'out'],
      [D.fold, { hp: -0.46, sp: -0.18, cp: -0.18, oy: KN.hips - 0.01, oz: 0.02, np: -0.5, ny: 0.2, nr: 0.1, hr: 0.04 }, 'in'],
      [D.fold + 0.14, { hp: -0.42, sp: -0.18, cp: -0.18, oy: KN.hips - 0.008, oz: 0.02, np: -0.56, ny: 0.22, nr: 0.12, hr: 0.04 }, 'out'],
      [D.end, { hp: -0.44, sp: -0.19, cp: -0.19, oy: KN.hips - 0.01, oz: 0.02, np: -0.58, ny: 0.23, nr: 0.12, hr: 0.04 }]])(t);
    const DB = [BUTT0[0] - 0.005, 0, BUTT0[2] - 0.04];
    const s = scy([K(0, {}), K(0.1, { q: aim([0, 1, -0.05]) }), K(D.sag, { butt: DB, q: aim([-0.03, 1, 0.1]) }), K(D.knees, { butt: DB, q: aim([-0.05, 1, 0.14]) }, 'in'),
      K(D.fold, { butt: DB, q: aim([-0.08, 1, 0.42]) }, 'in'), K(D.end, { butt: DB, q: aim([-0.085, 1, 0.43]) })])(t);
    const kn = smooth((t - D.sag) / (D.knees - D.sag)), fo = smooth((t - D.knees) / (D.fold - D.knees));
    const arm = track([[0, { out: 0, f: 0, e: 0 }], [0.1, { out: 0.5, f: 0.3, e: 0.3 }], [D.sag, { out: 0.1, f: 0, e: 0.1 }], [D.knees, { out: 0.08, f: 0.1, e: 0.1 }], [D.fold, { out: 0.12, f: 0.75, e: 0.1 }], [D.end, { out: 0.12, f: 0.78, e: 0.12 }]])(t);
    // the robe: the strips from the belt stay upright as the hips fold, and each half below the knee lays itself out on the floor as the knee joint comes down
    const hpw = k.hp + CFG.base.hp, kh = 0.3 + (k.oy || 0), th = Math.acos(clamp((kh - 0.004) / 0.29));
    return addPose(k, hold(s), { ulr: arm.out, ulp: arm.f, flp: arm.e }, { kfp: -hpw, kbp: -hpw, kgp: th, kcp: -0.93 * th });
  },
  feet: (t) => {
    const kn = smooth((t - D.sag) / (D.knees - D.sag)); const F = {};
    for (const k of LEGS) { const sx = k === 'L' ? 1 : -1; const p = REST[k].clone(); p.z += KN.back * kn; p.x += sx * 0.012 * kn; p.y += KN.up * kn + 0.02 * Math.sin(Math.PI * kn); F[k] = { p, pitch: 2.5 * kn, lock: t < D.sag, under: t >= D.sag }; }   // under: the bony knee itself rests on the floor, so the solver must not lift it
    return F;
  },
};

// Tripo set his feet about ten degrees toes-out. Every clip turns each foot in by TOE so the toes point straight ahead
// (Kesh's rule for humanoids: no splayed walk), and a planted foot keeps its heading when the hips turn.
const TOE = 0.15;
const straight = (c) => (c.feet ? { ...c, feet: (t) => { const F = c.feet(t); for (const k of LEGS) F[k] = { ...F[k], yaw: (F[k].yaw ?? 0) + (k === 'L' ? -TOE : TOE) }; return F; } } : c);
export const CLIPS = Object.fromEntries(Object.entries({ idle, walk, turnL: turn(1), turnR: turn(-1), reaping, lance, rage, rageHold, hurt, heavyHit, spawn, death }).map(([n, c]) => [n, straight(c)]));
