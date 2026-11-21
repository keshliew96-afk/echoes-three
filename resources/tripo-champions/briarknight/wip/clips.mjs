// The Briar Knight's moves. Units are model units (the model is 1 tall; the page draws it 2.4 u tall, CFG.unit).
// Timings come from the game: BK in src/sim/enemies/champions.js (walk 1.25 u/s; Bramble Charge: a 60-tick lane, then
// 9 u/s down a lane of up to 6.5 u; Thorn Ring: a 72-tick ring of r 2.8, thicket r 2.2 for 300 ticks), CHAMPION_RULES in
// src/sim/champions.js (a 96-tick entrance, rage below half health: cooldowns x0.7, speed x1.15), the phases of
// render/enemies/champfacet/briarknight.js, and the beats in render/facet/beats.js (a frame is 1/30 s: strike 2.5
// frames, contact held 3 frames, spawn grow 7 frames).
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, frac } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
export const CFG = {
  name: 'briarknight', unit: 2.4,
  // the stance he carries everywhere: knees a little bent, the empty left fist low and a little forward, the sword low and forward
  base: { oy: -0.014, uly: -0.12, flp: 0.32, ulp: 0.06, frp: 0.18, swp: 0.22 },
  chain: [['hips', 'h'], ['spine', 's'], ['chest', 'c'], ['head', 'n']],
  extras: [['upperarmL', 'ul'], ['forearmL', 'fl'], ['upperarmR', 'ur'], ['forearmR', 'fr'], ['handR', 'wr'], ['sword', 'sw'], ['tabF1', 'tf'], ['tabF2', 'tg'], ['tabB1', 'tb'], ['tabB2', 'tc']],
  arms: { A: { b: ['upperarmR', 'forearmR', 'handR'], pole: [-0.5, -0.5, -0.7] }, B: { b: ['upperarmL', 'forearmL', null], pole: [0.3, -0.5, -0.8] } },
  legs: { L: { kind: 'biped', b: ['thighL', 'shinL', 'footL'] }, R: { kind: 'biped', b: ['thighR', 'shinR', 'footR'] } },
  springs: [{ bone: 'tabF1', k: 130, c: 8, max: 0.7 }, { bone: 'tabF2', k: 100, c: 6, max: 0.8 }, { bone: 'tabB1', k: 110, c: 7, max: 0.9 }, { bone: 'tabB2', k: 85, c: 5, max: 1.0 }],
};
const REST = { L: V3(0.15, 0, 0.105), R: V3(-0.15, 0, 0.105) };
const LEGS = ['L', 'R'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const allPlanted = () => ({ L: plant(REST.L), R: plant(REST.R) });
// the left arm (no shield since V3, an empty fist): g 1 brings the forearm across his chest, out swings it wide to his left
const guard = (g = 0, out = 0, lift = 0) => ({ uly: -0.85 * g + 0.3 * out, flp: 0.75 * g - 0.25 * out + 0.3 * lift, ulr: 0.6 * out, ulp: 0.12 * g + 0.3 * lift });
// the sword arm reaches for a point (root space) and the blade holds an angle in the room: el 0 hangs straight down,
// 1.57 lies level pointing ahead; yaw turns it to his left
// (the elbow is sent to the side the blade points away from, so the forearm lines up behind the blade and the wrist stays nearly straight)
// out leans the point away from him, to his right
const sword = (w, x, y, z, el = 0, yaw = 0, out = 0) => ({ AW: w, Ax: x, Ay: y, Az: z, Aex: -Math.sin(el) * Math.sin(yaw) - 0.25, Aey: Math.cos(el) * 0.9, Aez: -Math.sin(el) * Math.cos(yaw) - 0.35, wrW: w, wrWp: -0.54 + el, wrWy: yaw, wrWr: 0.197 - out });
const cloth = (front = 0, back = 0) => ({ tfp: front, tgp: 0.6 * front, tbp: -back, tcp: -0.6 * back });
// a foot that is planted, swings to the next spot, is planted again: seq [[lift, land, to, height, droop]]
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.5); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. A vigil, not a statue: slow breath in the chest and shoulders, the weight eased from one foot to the other, the helm
// sweeps left and then right, he flexes the left fist up and rolls the sword's point in a small circle.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const lookL = pulse(t, 0.6, 1.2, 1.9, 2.5), lookR = pulse(t, 3.0, 3.6, 4.2, 4.8), heft = bump(t, 5.2, 0.7), roll = pulse(t, 1.6, 2.0, 2.9, 3.3);
    return addPose(
      { oy: 0.003 * br - 0.004 * heft, cp: 0.022 * br, sp: -0.01 * br, ox: 0.012 * sw, hr: 0.018 * sw, sr: -0.012 * sw, hy: 0.02 * Math.sin(w + 1), cy: 0.03 * lookL - 0.03 * lookR },
      { np: -0.03 - 0.012 * br, ny: 0.34 * lookL - 0.34 * lookR, nr: 0.04 * lookL - 0.04 * lookR },
      { ulr: 0.02 * br + 0.05 * heft, ulp: 0.03 * br + 0.14 * heft, flp: 0.04 * br + 0.2 * heft, urr: -0.02 * br, frp: 0.03 * br + 0.05 * roll, swp: 0.05 * br + 0.1 * roll * Math.sin(2.2 * w), swr: 0.1 * roll * Math.cos(2.2 * w) },
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// 1.25 u/s, 1.0 s a cycle (two steps). Kesh's picture (ref/walk-feel-kesh.png): he comes on slowly and does not hurry.
// The feet fall close to one line with the knees and toes straight ahead (the model stands with its legs spread and
// its boots turned out; the walk closes them: no duck-footed step), the body is upright and nearly still, the helm is
// low and stays on its target, both arms hang, the left fist at his side and the sword low with its point out to his
// right, a hand's breadth off the floor.
const WT = 1.0;
const GAIT = { T: WT, duty: 0.62, v: 1.25 / CFG.unit };
const TRACK = 0.088, TOE_IN = 0.16;                          // half the width of his track; how far each boot is turned in to point straight
const GF = { L: { phase: 0, n: [TRACK, 0.105], lift: 0.05, droop: 0.5, push: 0.34 }, R: { phase: 0.5, n: [-TRACK, 0.105], lift: 0.05, droop: 0.5, push: 0.34 } };
const straight = (k, f, toe = TOE_IN) => ({ ...f, yaw: (f.yaw || 0) + (k === 'L' ? -toe : toe), knee: k === 'L' ? -0.05 : 0.05 });
const low = (x) => Math.pow(0.5 + 0.5 * x, 1.7);            // 0..1, spends most of its time near 0
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT, a = w - 2 * Math.PI * 0.31;                 // a = 0 when the left foot carries him
    const up = low(Math.cos(2 * a)); const oy = -0.024 + 0.013 * up;
    return addPose(
      { oy, ox: 0.011 * Math.cos(a), hr: 0.02 * Math.cos(a), hy: 0.075 * Math.sin(a), hp: -0.06 + 0.008 * Math.cos(2 * a + 0.6) },
      { sy: -0.04 * Math.sin(a), sr: -0.016 * Math.cos(a), cy: -0.065 * Math.sin(a), cr: -0.01 * Math.cos(a), cp: -0.06, np: -0.2 - 0.008 * Math.cos(2 * a), ny: 0.03 * Math.sin(a), nr: -0.004 * Math.cos(a) },
      // the left arm hangs, the fist at his side, swinging a little against the stride
      { uly: 0.12, flp: -0.2 + 0.05 * Math.sin(a + 0.4), ulp: -0.06 - 0.09 * Math.sin(a), ulr: 0.05 },
      sword(1, -0.268 + 0.004 * Math.cos(a), 0.472 + oy, -0.005 - 0.022 * Math.sin(a), 0.22 + 0.05 * Math.sin(a + 0.7), 0, 0.5 + 0.03 * Math.cos(a + 0.5)),
      { Aex: 0.05, Aey: -0.8, Aez: -0.35 },                    // on top of the sword's own elbow aim: the elbow hangs back, not up

      cloth(0.1 + 0.08 * Math.cos(2 * a + 1.0), 0.2 + 0.07 * Math.cos(2 * a + 2.0)),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, straight(k, gaitFoot(t, GAIT, GF[k]))])),
};
const turn = (dir) => {
  const TT = 0.8; const g = { T: TT, duty: 0.62, v: 0, omega: dir * 2 * Math.PI / 3.2, pivot: [0, 0] };
  const gf = { L: { ...GF.L, n: [0.12, 0.105], lift: 0.035 }, R: { ...GF.R, n: [-0.12, 0.105], lift: 0.035 } };
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT, a = w - 2 * Math.PI * 0.31;
      return addPose({ oy: -0.022 + 0.008 * low(Math.cos(2 * a)), ox: 0.016 * Math.cos(a), hr: 0.025 * Math.cos(a) },
        { sy: 0.06 * dir, cy: 0.09 * dir, ny: 0.24 * dir, nr: 0.03 * dir, np: 0.03 }, guard(0.2), { frp: 0.05 }, cloth(0.08, 0.08)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, straight(k, gaitFoot(t, g, gf[k]), 0.08)])),
  };
};

// ------------------------------------------------------------------------------------------------ Bramble Charge
// couch (the 60-tick lane less one strike: the right foot goes back, the left forearm comes across his chest, the sword
// comes level beside it, he sinks and cocks back), drive (2.5 frames: thrown forward), charge (9 u/s down the lane:
// a low sprint, left shoulder and forearm first, each foot locked while it is down), braced stop (the right heel dug in ahead of him,
// 3 frames and a beat), settle (0.5 s: one rock back, then he squares up).
export const HERO_CHARGE_U = 4.5;                          // where the page stands the hero for this move
const CH = { couch: 1.0 - STRIKE, go: 1.0, run: 6.5 / 9, v: 9 / CFG.unit, lane: 6.5 / CFG.unit };
CH.stop = CH.go + CH.run; CH.held = CH.stop + HOLD + 0.1; CH.end = CH.held + 0.5; CH.hit = CH.go + (HERO_CHARGE_U - (0.62 + 0.35 + 0.1)) / 9;
const chTravel = (t) => CH.lane * clamp((t - CH.go) / CH.run);
// the body's own shift on top of the travel (cocked back, thrown forward, rocked at the stop)
const chBody = track([[0, { oz: 0 }], [0.5, { oz: -0.035 }], [CH.couch - 0.1, { oz: -0.05 }], [CH.couch, { oz: -0.06 }], [CH.go, { oz: 0.06 }, 'out3'], [CH.stop - 0.05, { oz: 0.06 }], [CH.stop + 0.07, { oz: 0.03 }, 'out'], [CH.held, { oz: -0.02 }], [CH.end - 0.1, { oz: 0 }], [CH.end + 0.3, { oz: 0 }]]);
// footfalls of the sprint: one every 0.15 s, on the floor for 0.085 s, under the body at the middle of its stance
const ST = 0.15, DS = 0.085, LEAD = CH.v * DS / 2 + 0.02;
const RUNX = 0.115;
const chFeet = (() => {
  const zb = (t) => chTravel(t) + chBody(t).oz;
  const L0 = off('L', 0, 0, 0.03), R0 = off('R', -0.02, 0, -0.15);          // the couched stance: left ahead, right set back
  const seq = { L: [], R: [] }; const pl = { L: [[0.42, 0.62, L0, 0.03]], R: [[0.16, 0.4, R0, 0.04]] };
  let k = 'R', n = 0;
  for (let td = CH.go + 0.035; td < CH.stop - 0.1; td += ST, n++) { seq[k].push([td, td + DS, V3(k === 'L' ? RUNX : -RUNX, 0, zb(td + DS / 2) + LEAD * 0.2 + 0.105)]); k = k === 'L' ? 'R' : 'L'; }
  // the stop: the next foot lands well ahead and holds; the other closes up beside it in the settle
  const brake = k, other = k === 'L' ? 'R' : 'L'; const end = CH.lane;
  const bz = end + 0.105 + 0.13, sx = (q) => (q === 'L' ? 0.15 : -0.15);
  seq[brake].push([CH.stop - 0.02, 99, V3(sx(brake) * 1.05, 0, bz)]);
  return { seq, L0, R0, brake, other, bz, end, sx };
})();
function runFoot(t, k) {
  const { seq, L0, R0, brake, other, bz, end, sx } = chFeet; const s = seq[k]; const start = k === 'L' ? L0 : R0;
  // the wind-up steps
  if (t < CH.go - 0.0) {
    if (k === 'R') return steps(t, REST.R, [[0.16, 0.4, R0, 0.04]]);
    return steps(t, REST.L, [[0.44, 0.62, L0, 0.025]]);
  }
  let prev = { at: k === 'R' ? CH.couch + 0.005 : CH.go + 0.015, p: start };       // when it leaves the couched stance
  for (let i = 0; i < s.length; i++) {
    const [td, lo, p] = s[i];
    if (t < td) { if (t < prev.at) return plant(prev.p); const u = (t - prev.at) / (td - prev.at); const sw = swing(prev.p, p, u, 0.085, 1.1); return { p: sw.p, pitch: sw.pitch }; }
    if (t < lo) return { p: p.clone(), lock: true, pitch: 0.25 * smooth((t - td) / (lo - td) * 1.4 - 0.4) };
    prev = { at: lo, p };
  }
  // after its last footfall: the brake foot is down for good until the settle; the other swings up beside it
  if (k === other) { const to = V3(sx(k), 0, end + 0.105 - 0.1); const a = prev.at, b = CH.stop + 0.06; if (t < b) { const sw = swing(prev.p, to, (t - a) / (b - a), 0.06, 0.8); return { p: sw.p, pitch: sw.pitch }; }
    return steps(t, to, [[CH.held + 0.26, CH.held + 0.44, V3(sx(k), 0, end + 0.105), 0.03]]); }
  return plant(prev.p);
}
const brakeBack = (t, k) => steps(t, V3(chFeet.sx(k) * 1.05, 0, chFeet.bz), [[CH.held + 0.02, CH.held + 0.24, V3(chFeet.sx(k), 0, chFeet.end + 0.105), 0.035]]);
const charge = {
  dur: CH.end + 0.1, contact: [CH.hit, CH.stop], kinds: ['ram', 'stop'], travel: chTravel, cues: { lane: [0, CH.go] },
  phases: [['couch', 0], ['drive', CH.couch], ['charge', CH.go], ['braced stop', CH.stop], ['settle', CH.held]],
  pose: (t) => {
    const COCK = { oy: -0.055, hp: 0.1, sp: 0.03, cp: 0.02, np: -0.1, hy: -0.22, cy: 0.1, ny: 0.12 };
    const RUN = { oy: -0.075, hp: -0.38, sp: -0.06, cp: -0.04, np: 0.34, hy: 0, cy: 0, ny: 0 };
    const STOP = { oy: -0.085, hp: 0.12, sp: 0.05, cp: 0.04, np: -0.05, hy: 0.12, cy: -0.05 };
    const k = track([[0, {}], [0.16, { oy: -0.01, hp: -0.03 }], [0.5, { ...COCK, oy: -0.04, hp: 0.05 }], [CH.couch - 0.16, { ...COCK, oy: -0.05 }], [CH.couch, { ...COCK, oy: -0.07, hp: 0.14 }],
      [CH.go, RUN, 'out3'], [CH.stop - 0.04, RUN], [CH.stop + 0.07, STOP, 'out3'], [CH.held, { ...STOP, oy: -0.07, hp: 0.06 }], [CH.held + 0.25, { oy: -0.02, hp: -0.04 }], [CH.end, {}], [CH.end + 0.2, {}]])(t);
    const g = track([[0, { g: 0, w: 0, el: 0.3, x: -0.2, y: 0.5, z: 0.06, yaw: 0, back: 0 }], [0.2, { g: 0.2, w: 0.5, el: 0.5, x: -0.2, y: 0.52, z: 0.04, yaw: 0, back: 0 }],
      [0.55, { g: 1, w: 1, el: 1.5, x: -0.2, y: 0.6, z: 0.07, yaw: 0.0, back: 0 }], [CH.couch, { g: 1, w: 1, el: 1.58, x: -0.2, y: 0.58, z: 0.0, yaw: 0.02, back: 0 }],
      [CH.go, { g: 1, w: 1, el: 1.56, x: -0.18, y: 0.5, z: 0.25, yaw: 0.04, back: 1 }, 'out3'], [CH.stop - 0.04, { g: 1, w: 1, el: 1.56, x: -0.18, y: 0.5, z: 0.25, yaw: 0.04, back: 1 }],
      [CH.stop + 0.07, { g: 0.8, w: 1, el: 1.3, x: -0.2, y: 0.52, z: 0.14, yaw: 0, back: -0.3 }, 'out3'], [CH.held + 0.2, { g: 0.3, w: 0.6, el: 0.7, x: -0.21, y: 0.5, z: 0.08, yaw: 0, back: 0.1 }], [CH.end, { g: 0, w: 0, el: 0.3, x: -0.2, y: 0.5, z: 0.06, yaw: 0, back: 0 }], [CH.end + 0.2, { g: 0, w: 0, el: 0.3, x: -0.2, y: 0.5, z: 0.06, yaw: 0, back: 0 }]])(t);
    const run = pulse(t, CH.go, CH.go + 0.08, CH.stop - 0.06, CH.stop), ph = 2 * Math.PI * (t - CH.go) / (2 * ST);
    const shake = pulse(t, 0.6, 0.72, CH.couch - 0.05, CH.couch) * Math.sin(70 * t);
    return addPose(k, chBody(t), guard(g.g), sword(g.w, g.x, g.y + (k.oy || 0), g.z + (chBody(t).oz || 0), g.el, g.yaw),
      { oy: 0.012 * run * Math.cos(2 * ph), hr: 0.04 * run * Math.sin(ph), cy: -0.06 * run * Math.sin(ph), ox: 0.006 * run * Math.sin(ph), cr: 0.006 * shake, nr: 0.008 * shake },
      cloth(-0.12 * g.back, 1.0 * Math.max(0, g.back) - 0.5 * Math.min(0, g.back) * 0), { tfp: 0.25 * Math.max(0, -g.back) });
  },
  feet: (t) => {
    const F = {};
    for (const k of LEGS) F[k] = (k === chFeet.brake && t >= CH.held) ? brakeBack(t, k) : runFoot(t, k);
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Thorn Ring
// raise (the 72-tick ring less one strike: the left foot steps wide, the left arm swings out, the sword goes up high with
// its point down and trembles there), plant (2.5 frames, landing on the ring's tick: driven into the floor, knees deep),
// contact held (3 frames), recoil (0.2 s), settle (0.5 s: he draws the blade out and stands).
const TR = { plant: 1.2 - STRIKE, hit: 1.2, held: 1.2 + HOLD, rec: 1.2 + HOLD + 0.2, end: 1.2 + HOLD + 0.7 };
const ring = {
  dur: TR.end, contact: [TR.hit], kinds: ['ring'], cues: { ring: [0, TR.hit] },
  phases: [['raise', 0], ['plant', TR.plant], ['contact held', TR.hit], ['recoil', TR.held], ['settle', TR.rec]],
  pose: (t) => {
    const UP = { oy: 0.004, hp: 0.14, sp: 0.06, cp: 0.08, np: 0.12, hy: -0.1, cy: -0.12 };
    const DOWN = { oy: -0.125, hp: -0.34, sp: -0.1, cp: -0.08, np: 0.3, hy: 0.06, cy: 0.1, oz: 0.02 };
    const k = track([[0, {}], [0.14, { oy: -0.03, hp: -0.06, np: 0.04 }], [0.62, { ...UP, oy: -0.004 }], [TR.plant - 0.12, UP], [TR.plant, { ...UP, oy: 0.012, hp: 0.17 }],
      [TR.hit, DOWN, 'in'], [TR.held, { ...DOWN, oy: -0.13 }], [TR.rec, { ...DOWN, oy: -0.105, hp: -0.26, oz: 0.0 }], [TR.rec + 0.24, { oy: -0.05, hp: -0.1, np: 0.08 }], [TR.end, {}]])(t);
    const a = track([[0, { w: 0, x: -0.2, y: 0.5, z: 0.06, el: 0.3, out: 0, g: 0 }], [0.14, { w: 0.4, x: -0.21, y: 0.52, z: 0.08, el: 0.5, out: 0.1, g: 0.2 }],
      [0.62, { w: 1, x: -0.15, y: 0.95, z: 0.05, el: 0.42, out: 0.8, g: 0 }], [TR.plant - 0.12, { w: 1, x: -0.14, y: 0.97, z: 0.03, el: 0.3, out: 1, g: 0 }], [TR.plant, { w: 1, x: -0.14, y: 0.985, z: 0.0, el: 0.2, out: 1, g: 0 }],
      [TR.hit, { w: 1, x: -0.07, y: 0.452, z: 0.235, el: 0.0, out: 0.55, g: 0 }, 'in'], [TR.held, { w: 1, x: -0.07, y: 0.448, z: 0.235, el: 0.0, out: 0.55, g: 0 }],
      [TR.rec, { w: 1, x: -0.07, y: 0.47, z: 0.23, el: 0.03, out: 0.4, g: 0 }], [TR.rec + 0.24, { w: 1, x: -0.13, y: 0.6, z: 0.2, el: 0.3, out: 0.15, g: 0.1 }], [TR.end, { w: 0, x: -0.2, y: 0.5, z: 0.06, el: 0.3, out: 0, g: 0 }]])(t);
    const tr = pulse(t, 0.62, 0.74, TR.plant - 0.03, TR.plant) * Math.sin(64 * t);
    return addPose(k, guard(a.g, a.out), sword(a.w, a.x + 0.004 * tr, a.y, a.z, a.el, 0), { cr: 0.008 * tr, nr: 0.006 * tr },
      cloth(0.3 * bump(t, TR.hit + 0.07, 0.3), 0.5 * bump(t, TR.hit + 0.09, 0.36)));
  },
  feet: (t) => ({ L: steps(t, REST.L, [[0.1, 0.32, off('L', 0.075, 0, 0.02), 0.035], [TR.rec + 0.18, TR.rec + 0.4, REST.L, 0.03]]), R: steps(t, REST.R, [[0.34, 0.52, off('R', -0.03, 0, -0.03), 0.025], [TR.rec + 0.02, TR.rec + 0.2, REST.R, 0.025]]) }),
};

// ------------------------------------------------------------------------------------------------ Rage (a call: the game shows only the visor and a sound)
// gather (he folds in over the left forearm), roar (2.5 frames: the right foot stamps, both arms are thrown wide, the helm
// goes back, and he shakes with it), square up.
const RG = { gather: 0.34, roar: 0.34 + STRIKE, hold: 1.15, end: 1.6 };
const rage = {
  dur: RG.end, contact: [RG.roar], kinds: ['roar'], phases: [['gather', 0], ['roar', RG.gather], ['enraged', RG.roar], ['squares up', RG.hold]],
  pose: (t) => {
    const IN = { oy: -0.06, hp: -0.2, sp: -0.08, cp: -0.1, np: -0.16 };
    const OUT = { oy: -0.03, hp: 0.12, sp: 0.1, cp: 0.16, np: 0.34, oz: -0.01 };
    const k = track([[0, {}], [RG.gather, IN], [RG.roar, OUT, 'out3'], [RG.hold, { ...OUT, oy: -0.035 }], [RG.hold + 0.2, { oy: -0.03, hp: -0.05, np: 0.0 }], [RG.end, {}]])(t);
    const a = track([[0, { g: 0, out: 0, w: 0, x: -0.2, y: 0.5, z: 0.06, el: 0.3, yaw: 0 }], [0.1, { g: 0.4, out: 0, w: 1, x: -0.19, y: 0.55, z: 0.1, el: 0.8, yaw: 0.1 }], [RG.gather, { g: 0.9, out: 0, w: 1, x: -0.12, y: 0.58, z: 0.14, el: 1.2, yaw: 0.5 }],
      [RG.roar, { g: -0.3, out: 1.2, w: 1, x: -0.4, y: 0.74, z: -0.04, el: 2.3, yaw: -0.9 }, 'out3'], [RG.hold, { g: -0.3, out: 1.15, w: 1, x: -0.4, y: 0.72, z: -0.04, el: 2.2, yaw: -0.9 }],
      [RG.hold + 0.2, { g: 0, out: 0.3, w: 0.7, x: -0.26, y: 0.56, z: 0.04, el: 0.9, yaw: -0.2 }], [RG.end, { g: 0, out: 0, w: 0, x: -0.2, y: 0.5, z: 0.06, el: 0.3, yaw: 0 }]])(t);
    const sh = pulse(t, RG.roar, RG.roar + 0.06, RG.hold - 0.15, RG.hold), w = 52 * t;
    return addPose(k, guard(a.g, a.out), sword(a.w, a.x, a.y, a.z, a.el, a.yaw),
      { nr: 0.05 * Math.sin(w) * sh, ny: 0.04 * Math.sin(w + 1.3) * sh, cr: 0.022 * Math.sin(w - 0.7) * sh, sr: 0.015 * Math.sin(w - 1.4) * sh },
      cloth(0.25 * bump(t, RG.roar + 0.08, 0.3), 0.3 * bump(t, RG.roar + 0.1, 0.34)));
  },
  feet: (t) => {
    const F = allPlanted();
    if (t > 0.1 && t < RG.roar) { const q = track([[0.1, { y: 0, p: 0 }], [RG.gather, { y: 0.075, p: 0.35 }], [RG.roar, { y: 0, p: 0 }, 'in3']])(t); F.R = { p: off('R', 0, q.y, 0), pitch: q.p }; }
    return F;
  },
};
// The enraged state, played on top of anything (spine, chest, head and arms only): hunched, quick breath, the helm low.
const RT = 0.5;
const rageHold = {
  dur: RT, loop: true, upperOnly: true,
  pose: (t) => { const b = Math.sin(2 * Math.PI * t / RT);
    return { sp: -0.04, cp: -0.07 + 0.03 * b, np: -0.06 - 0.02 * b, ulr: 0.06 + 0.02 * b, urr: -0.06 - 0.02 * b, ulp: 0.03 * b, flp: 0.1 + 0.03 * b, frp: 0.12 + 0.03 * b, swp: 0.1 }; },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything. Only the spine, chest, head and arms move, so planted feet stay planted.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { sp: 0.05, cp: 0.12, cy: 0.1, np: 0.1, ny: 0.26, nr: 0.14, ulr: 0.16, flp: -0.12, urr: -0.12, frp: -0.08 }, 'out'], [0.18, { cp: -0.03, ny: -0.05, nr: -0.03, ulr: 0.03 }], [0.42, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers him: driven back two short steps with the left arm knocked wide, he catches himself low,
// shakes his helm and squares up.
const HB = -0.1;
const heavyHit = {
  dur: 1.15, contact: [0], kinds: ['taken'], travel: (t) => HB * EASE.out(clamp(t / 0.32)), phases: [['hit', 0], ['stagger', 0.07], ['shake', 0.42], ['square up', 0.74]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.02, oy: -0.015, hp: 0.2, sp: 0.08, cp: 0.12, cy: -0.16, np: 0.12, ny: -0.36, nr: -0.2 }, 'out'],
      [0.26, { oz: -0.005, oy: -0.06, hp: 0.02, cp: -0.04, cy: -0.06, np: -0.1, ny: -0.16 }],
      [0.46, { oy: -0.05, hp: -0.1, cp: -0.06, np: -0.12 }], [0.78, { oy: -0.02, hp: -0.02, np: 0.02 }], [1.15, {}]])(t);
    const fl = pulse(t, 0, 0.07, 0.3, 0.6), sh = pulse(t, 0.4, 0.48, 0.64, 0.78), w = 38 * (t - 0.4);
    return addPose(k, guard(-0.2 * fl, 0.9 * fl), { urr: -0.3 * fl, urp: -0.25 * fl, frp: 0.2 * fl, swp: -0.2 * fl, ny: 0.1 * Math.sin(w) * sh, nr: 0.12 * Math.sin(w + 1.3) * sh, cr: 0.02 * Math.sin(w - 0.6) * sh },
      cloth(0.3 * bump(t, 0.12, 0.3), -0.1));
  },
  feet: (t) => ({ R: steps(t, REST.R, [[0.03, 0.17, off('R', 0, 0, HB), 0.035, 0.3]]), L: steps(t, REST.L, [[0.16, 0.32, off('L', 0, 0, HB), 0.03, 0.3]]) }),
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: he comes up from a crouch with the left
// forearm across his chest, stands to his full height and salutes (the hilt before his visor, the blade upright, the
// left fist on his heart), then cuts the blade down and out so its point finds the hero: the challenge.
const SP = { grow: SPAWN, salute: 1.0, clang: 1.0 + STRIKE };
const spawn = {
  dur: 1.6, contact: [SP.clang], kinds: ['challenge'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['rise', SP.grow], ['salute', 0.7], ['challenge', SP.salute], ['stand', SP.clang]],
  pose: (t) => {
    const LOWP = { oy: -0.13, hp: -0.3, sp: -0.1, cp: -0.06, np: -0.2 };
    const k = track([[0, LOWP], [SP.grow, LOWP], [0.7, { oy: -0.005, hp: 0.04, cp: 0.05, np: 0.06 }], [SP.salute, { oy: -0.002, hp: 0.05, cp: 0.08, np: 0.04 }],
      [SP.clang, { oy: -0.03, hp: -0.05, cp: -0.03, cy: -0.1, np: -0.04, ny: -0.06 }, 'in'], [SP.clang + HOLD, { oy: -0.03, hp: -0.05, cp: -0.03, cy: -0.11, np: -0.04, ny: -0.06 }], [1.36, { oy: -0.015, hp: -0.02, cy: -0.03 }], [1.6, {}]])(t);
    const a = track([[0, { g: 1, out: 0, w: 1, x: -0.17, y: 0.36, z: 0.2, el: 1.2, yaw: 0.2 }], [SP.grow, { g: 1, out: 0, w: 1, x: -0.17, y: 0.36, z: 0.2, el: 1.2, yaw: 0.2 }], [0.62, { g: 0.6, out: 0, w: 1, x: -0.2, y: 0.6, z: 0.1, el: 1.6, yaw: 0 }],
      [SP.salute, { g: 1, out: 0, w: 1, x: -0.11, y: 0.74, z: 0.15, el: 2.95, yaw: 0 }], [SP.clang, { g: 0.2, out: 0.35, w: 1, x: -0.25, y: 0.58, z: 0.19, el: 1.45, yaw: -0.35 }, 'in'], [SP.clang + HOLD, { g: 0.2, out: 0.35, w: 1, x: -0.25, y: 0.58, z: 0.19, el: 1.45, yaw: -0.35 }],
      [1.36, { g: 0.1, out: 0.1, w: 0.8, x: -0.22, y: 0.54, z: 0.12, el: 0.9, yaw: -0.1 }], [1.6, { g: 0, out: 0, w: 0, x: -0.2, y: 0.5, z: 0.06, el: 0.3, yaw: 0 }]])(t);
    return addPose(k, guard(a.g, a.out), sword(a.w, a.x, a.y, a.z, a.el, a.yaw), cloth(0.1 * bump(t, 0.5, 0.5), 0.2 * bump(t, 0.5, 0.5)));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// Kesh's picture (ref/death-kneel-kesh.png): he does not fall. A jolt, the sword's point drops to the floor ahead of
// him and he leans on it, the left foot steps forward, the right knee gives and comes down, and he ends on one knee:
// the sword upright under his right hand, the left forearm laid on the raised knee, the helm bowed. He stays there.
const D = { point: 0.44, knee: 0.9, bow: 1.55, end: 2.3 };
const DL = off('L', -0.035, 0, 0.2);                       // where the left foot ends, flat, its knee up
const death = {
  dur: D.end, contact: [D.point, D.knee], kinds: ['point', 'thud'], phases: [['jolt', 0], ['the point finds the floor', 0.12], ['the knee gives', D.point], ['on one knee', D.knee], ['the helm bows', D.knee + 0.14], ['still', D.bow]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.1, { hp: 0.14, cp: 0.1, oy: -0.01, oz: -0.02, np: 0.2, ny: 0.2, nr: 0.1 }, 'out'],
      [D.point, { hp: -0.04, cp: -0.05, oy: -0.045, oz: 0.02, np: -0.1, ny: -0.05 }],
      [D.knee, { hp: -0.04, sp: -0.04, cp: -0.05, oy: -0.19, oz: 0.05, np: -0.06, hy: 0.06, cy: -0.1 }, 'in'],
      [D.knee + 0.12, { hp: -0.05, sp: -0.05, cp: -0.08, oy: -0.184, oz: 0.05, np: -0.2, hy: 0.06, cy: -0.1 }, 'out'],
      [D.bow, { hp: -0.14, sp: -0.11, cp: -0.17, oy: -0.19, oz: 0.055, np: -0.4, ny: -0.14, nr: -0.05, hy: 0.06, cy: -0.14 }],
      [D.end, { hp: -0.15, sp: -0.12, cp: -0.18, oy: -0.192, oz: 0.055, np: -0.43, ny: -0.15, nr: -0.06, hy: 0.06, cy: -0.14 }]])(t);
    // the sword: the point drops to the floor and stays there; the hand comes over it and he leans his weight on it
    const a = track([[0, { g: 0, out: 0, w: 0, x: -0.2, y: 0.5, z: 0.06, el: 0.3, lean: 0, kneel: 0, cf: 0, cb: 0 }], [0.1, { g: -0.2, out: 0.6, w: 0.5, x: -0.26, y: 0.56, z: 0.0, el: 0.6, lean: 0.2, kneel: 0, cf: 0.2, cb: 0 }],
      [D.point - 0.1, { g: 0.1, out: 0.2, w: 1, x: -0.2, y: 0.54, z: 0.2, el: 0.1, lean: 0.05, kneel: 0, cf: 0.3, cb: 0.3 }], [D.point, { g: 0.1, out: 0.2, w: 1, x: -0.185, y: 0.5, z: 0.25, el: 0.03, lean: 0.03, kneel: 0, cf: 0.3, cb: 0.4 }, 'in'],
      [D.knee, { g: 0.2, out: 0.1, w: 1, x: -0.18, y: 0.478, z: 0.262, el: -0.03, lean: 0.0, kneel: 0.35, cf: 0.8, cb: 0.75 }],
      [D.bow, { g: 0.2, out: 0.1, w: 1, x: -0.178, y: 0.474, z: 0.268, el: -0.05, lean: 0.0, kneel: 1, cf: 0.9, cb: 0.62 }], [D.end, { g: 0.2, out: 0.1, w: 1, x: -0.178, y: 0.474, z: 0.268, el: -0.05, lean: 0.0, kneel: 1, cf: 0.9, cb: 0.62 }]])(t);
    // the grip arm: the elbow sinks below the hand as he kneels, so the forearm comes up to the grip
    const sw = sword(a.w, a.x, a.y, a.z, a.el, 0, a.lean); sw.Aex = lerp(sw.Aex, -0.55, a.kneel); sw.Aey = lerp(sw.Aey, -0.75, a.kneel); sw.Aez = lerp(sw.Aez, -0.25, a.kneel);
    // the left arm reaches for the raised knee and the forearm lies on it, the fist hanging past it
    const sh = guard(a.g, a.out); const B = { BW: smooth((t - (D.knee - 0.2)) / 0.5), Bx: 0.165, By: 0.325 + 0.02 * (1 - a.kneel), Bz: 0.2 + (k.oz || 0) };
    return addPose(k, sh, B, sw, cloth(a.cf, a.cb));
  },
  feet: (t) => {
    const kn = smooth((t - D.point) / (D.knee - D.point));
    const R = REST.R.clone(); R.z += -0.29 * kn; R.x += -0.012 * kn; R.y += 0.06 * kn;
    return { L: straight('L', steps(t, REST.L, [[0.14, 0.4, DL, 0.045, 0.4]]), 0.1 * smooth((t - 0.14) / 0.26)), R: { p: R, pitch: 2.4 * kn, lock: t < D.point } };
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), charge, ring, rage, rageHold, hurt, heavyHit, spawn, death };
