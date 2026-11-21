// The Brood Spider's moves. Units are model units (the model is 1 long; the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/brood.js (skitters at 1.7 u/s, bites on contact for 8 every 60 ticks per
// target; dying, it splits into two broodlings) and its rig src/render/enemies/facet/brood.js (the bite chain: A1..O3
// key for key, the right fang, the left fang, the pounce reared on its back legs; the first bite unwarned, the next two
// on the 60-tick cooldown; the hit timeline of render/facet/foe.js: wind 1, strike 2.5, contact 2, snap 2.5, settle 5
// frames, held for the 1.25 s chain window, recover 0.35 s). A game frame is 1/30 s.
import { readFileSync } from 'fs';
import { track, gaitFoot, V3, smooth, lerp, clamp, addPose } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
const SK = JSON.parse(readFileSync(new URL('./rig/skel.json', import.meta.url)));
const LEGS = ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'];
const bn = (k) => ['f', 't', 'a', 'c'].map((c) => c + k[1] + k[0]);
export const CFG = {
  name: 'brood', unit: 0.9, base: {},
  chain: [['hips', 'b'], ['sq', 'q']],
  extras: [['head', 'h'], ['abd', 'ab'], ['fangL', 'fl'], ['fangR', 'fr']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']]],
  legs: Object.fromEntries(LEGS.map((k) => [k, { kind: 'limb', b: bn(k) }])),
  springs: [],
};
const U = CFG.unit;
const REST = Object.fromEntries(LEGS.map((k) => [k, V3(...SK.ends['c' + k[1] + k[0]])]));
const plant = (p) => ({ p: p.clone(), lock: true });
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h] of seq) { if (t < a) return plant(cur); if (t < b) { const k = smooth((t - a) / (b - a)); const p = cur.clone().lerp(to, k); p.y += h * Math.sin(Math.PI * k); return { p, lock: false }; } cur = to; }
  return plant(cur);
}

// the game's body pose (brood.js REST fields) on this rig: push and lift in game u, pitch + front down, twist + to its
// left, sx/sy the squash, fangs 0..1 spread, rear 0..1 the front pair raised (in the feet), abd the abdomen cocked up
const GR = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, fangs: 0.1, rear: 0, abd: 0 });
function game(g) {
  return { oz: g.push / U, oy: g.lift / U, bp: -g.pitch, br: g.roll, by: g.twist,
    qsx: g.sx - 1, qsz: g.sx - 1, qsy: g.sy - 1, hp: -0.3 * g.pitch, abp: -g.abd + 0.4 * g.pitch,
    flr: 0.45 * g.fangs, frr: -0.45 * g.fangs, flp: -0.2 * g.fangs, frp: -0.2 * g.fangs };
}
const BREATH = (t, P) => ({ qsy: 0.012 * Math.sin(TAU * t / P), qsx: -0.006 * Math.sin(TAU * t / P), qsz: -0.006 * Math.sin(TAU * t / P), abp: 0.02 * Math.sin(TAU * t / P + 1) });

// ------------------------------------------------------------------------------------------------ idle
// 6 s. Mine: the abdomen breathes, the fangs work twice, it shifts its weight, and a front leg taps the floor.
const idle = {
  dur: 6, loop: true,
  pose: (t) => { const sh = Math.sin(TAU * t / 6); const fg = bump(t, 1.6, 0.3) + bump(t, 1.95, 0.3) + bump(t, 4.4, 0.35);
    return addPose(game({ ...GR, fangs: 0.1 + 0.5 * fg }), BREATH(t, 3), { br: 0.02 * sh, oz: 0.008 * Math.sin(TAU * t / 3) / U, hy: 0.12 * pulse(t, 3.0, 3.4, 4.0, 4.4) }); },
  feet: (t) => { const F = allPlanted(); F.L1 = steps(t, REST.L1, [[2.6, 2.75, off('L1', 0, 0, 0.015), 0.04], [2.85, 3.0, REST.L1, 0.04]]); F.R2 = steps(t, REST.R2, [[5.0, 5.2, off('R2', -0.01, 0, 0.01), 0.03], [5.35, 5.5, REST.R2, 0.03]]); return F; },
};

// ------------------------------------------------------------------------------------------------ skitter and turns
// The game's skitter: 1.7 u/s on two alternating sets of four (legs 1 and 3 of one side with 2 and 4 of the other),
// the body low and leaning a little into the travel.
const WT = 0.2, GAIT = { T: WT, duty: 0.5, v: 1.7 / U };
const SET = { L1: 0, L3: 0, R2: 0, R4: 0, L2: 0.5, L4: 0.5, R1: 0.5, R3: 0.5 };
const GF = Object.fromEntries(LEGS.map((k) => [k, { phase: SET[k], n: [REST[k].x, REST[k].z], lift: 0.05, droop: 0.4, push: 0.1 }]));
const walk = {
  dur: WT * 4, loop: true, gait: { ...GAIT },
  pose: (t) => { const w = TAU * t / WT; return addPose({ oy: -0.02 / U + 0.006 * Math.cos(2 * w), bp: -0.05, br: 0.02 * Math.sin(w), abp: 0.03 * Math.sin(w + 1), flr: 0.1, frr: -0.1 }); },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: WT, duty: 0.5, v: 0, omega: dir * TAU / 1.6 };
  return {
    dur: WT * 4, loop: true, gait: g,
    pose: (t) => { const w = TAU * t / WT; return { oy: -0.015 / U + 0.005 * Math.cos(2 * w), by: 0.05 * dir, hy: 0.1 * dir, aby: -0.1 * dir, br: -0.02 * dir }; },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.04 })])),
  };
};

// ------------------------------------------------------------------------------------------------ the bite chain
// The game's key poses (brood.js A1..O3) on its hit timeline and its three contacts: the first bite unwarned (wind-back
// and strike in 2.5 frames), the next two on the 60-tick cooldown (the held wind-up pulls back over 4 frames, then
// strikes so the contact lands on the bite). The front legs step in by the contact; the pounce rears it up on its back
// legs with the front pair raised and brings it down on the target off a hop.
const K = (o) => ({ ...GR, ...o });
const A1 = K({ push: -0.04, pitch: -0.06, twist: -0.2, roll: 0.04, sx: 0.97, sy: 1.04, fangs: 0.7 }), P1 = K({ push: -0.07, pitch: -0.08, twist: -0.28, roll: 0.06, sx: 0.96, sy: 1.05, fangs: 0.9 });
const S1 = K({ push: 0.14, pitch: 0.16, twist: 0.18, roll: -0.05, sx: 1.19, sy: 0.91, fangs: 0 }), O1 = K({ push: 0.1, pitch: 0.12, twist: 0.26, roll: -0.06, sx: 1.06, sy: 0.97, fangs: 0.15 });
const A2 = K({ push: -0.04, pitch: -0.06, twist: 0.2, roll: -0.04, sx: 0.97, sy: 1.04, fangs: 0.7 }), P2 = K({ push: -0.07, pitch: -0.08, twist: 0.28, roll: -0.06, sx: 0.96, sy: 1.05, fangs: 0.9 });
const S2 = K({ push: 0.14, pitch: 0.16, twist: -0.18, roll: 0.05, sx: 1.19, sy: 0.91, fangs: 0 }), O2 = K({ push: 0.1, pitch: 0.12, twist: -0.26, roll: 0.06, sx: 1.06, sy: 0.97, fangs: 0.15 });
const A3 = K({ push: -0.03, pitch: -0.22, lift: 0.03, sx: 0.98, sy: 1.04, fangs: 0.8, rear: 0.8, abd: 0.1 }), P3 = K({ push: -0.06, pitch: -0.3, lift: 0.05, sx: 0.96, sy: 1.06, fangs: 1, rear: 1, abd: 0.15 });
const S3 = K({ push: 0.16, pitch: 0.2, lift: 0.02, sx: 1.19, sy: 0.9, fangs: 0, rear: 0, abd: 0.35 }), O3 = K({ push: 0.12, pitch: 0.14, sx: 1.06, sy: 0.96, fangs: 0.15, rear: 0, abd: 0.2 });
const C1 = 2.5 * FR, C2 = 60 / 60, C3 = 120 / 60; // contacts: unwarned, then the 60-tick cooldown
const READY = 1.25 - 13 * FR;
const END = C3 + 9.5 * FR + READY + 0.35;
const KEYS = [
  [0, GR], [C1 - 1.5 * FR, A1, 'out'], [C1, S1, 'in'], [C1 + 2 * FR, S1, 'hold'], [C1 + 4.5 * FR, O1, 'out'], [C1 + 9.5 * FR, A2],
  [C2 - 6.5 * FR, A2], [C2 - 2.5 * FR, P2, 'out'], [C2, S2, 'in'], [C2 + 2 * FR, S2, 'hold'], [C2 + 4.5 * FR, O2, 'out'], [C2 + 9.5 * FR, A3],
  [C3 - 6.5 * FR, A3], [C3 - 2.5 * FR, P3, 'out'], [C3, S3, 'in'], [C3 + 2 * FR, S3, 'hold'], [C3 + 4.5 * FR, O3, 'out'], [C3 + 9.5 * FR, A1],
  [C3 + 9.5 * FR + READY, A1], [END, GR],
];
const GK = track(KEYS.map(([t, g, e]) => [t, g, e]));
const bites = {
  dur: END, contact: [C1, C2, C3],
  phases: [['the right fang: strike', 0], ['contact', C1], ['snap back', C1 + 2 * FR], ['the left fang wind-up held', C1 + 9.5 * FR], ['pull back', C2 - 6.5 * FR], ['the left fang: strike', C2 - 2.5 * FR], ['contact', C2], ['snap back', C2 + 2 * FR],
    ['the pounce wind-up held: reared', C2 + 9.5 * FR], ['pull back', C3 - 6.5 * FR], ['the pounce: strike', C3 - 2.5 * FR], ['contact', C3], ['snap back', C3 + 2 * FR], ['the right fang wind-up held', C3 + 9.5 * FR], ['recover', C3 + 9.5 * FR + READY]],
  pose: (t) => { const g = GK(t); const kick = [C1, C2, C3].reduce((a, c) => a + bump(t, c + FR, 3 * FR), 0); const hop = 0.03 * bump(t, C3 - 1.5 * FR, 4 * FR); return addPose(game({ ...g, lift: g.lift + hop }), { hp: 0.08 * kick }); },
  feet: (t) => {
    const g = GK(t), F = allPlanted();
    // the front legs step in by each contact and back after the snap
    const L = 0.08 / U;
    for (const [k, lag] of [['L1', 0], ['R1', 0.4 * FR], ['L2', 0.8 * FR], ['R2', 1.2 * FR]]) {
      const d = k[1] === '1' ? L : 0.6 * L, seq = [];
      for (const c of (k[1] === '1' ? [C1, C2, C3] : [C1, C2])) { seq.push([Math.max(0, c - 3.25 * FR) + lag, c - 0.25 * FR + lag, off(k, 0, 0, d), 0.03]); seq.push([c + 4.5 * FR, c + 8.5 * FR, REST[k], 0.03]); }
      F[k] = steps(t, REST[k], seq);
    }
    // the pounce: the front pair raised off the floor through the wind-up, brought down ahead on the contact
    for (const k of ['L1', 'R1']) { const r = g.rear; if (r > 0.005) F[k] = { p: F[k].p.clone().add(V3(0, 0.12 * r, 0.03 * r)), lock: false }; }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ hurt
// On top of anything: the body jolts back and squashes, the abdomen bounces, the fangs flare.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { qsy: -0.08, qsx: 0.06, qsz: 0.06, hp: 0.15, abp: 0.18, flr: 0.3, frr: -0.3 }, 'out'], [0.17, { qsy: 0.02, hp: -0.04, abp: -0.06 }], [0.4, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames, about 10% over. Mine on top: it rises on its legs, flares its fangs
// and settles, the front legs testing the floor.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.2, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['rises on its legs', 7 * FR], ['fangs flare', 0.5], ['ready', 0.9]],
  pose: (t) => addPose({ oy: -0.08 / U * (1 - smooth((t - 0.1) / 0.4)) }, game({ ...GR, fangs: 0.1 + 0.8 * pulse(t, 0.45, 0.55, 0.7, 0.9), pitch: -0.08 * pulse(t, 0.45, 0.55, 0.7, 0.9) })),
  feet: (t) => { const F = allPlanted(); F.L1 = steps(t, REST.L1, [[0.7, 0.82, off('L1', 0, 0, 0.02), 0.04], [0.88, 1.0, REST.L1, 0.03]]); F.R1 = steps(t, REST.R1, [[0.76, 0.88, off('R1', 0, 0, 0.02), 0.04], [0.94, 1.06, REST.R1, 0.03]]); return F; },
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game bursts it into two broodlings). Struck, it rears and shudders, the legs give and it drops onto its
// belly; the legs curl in under it, the abdomen sags and twitches once.
const DROP = 0.24; // the body's fall to rest the belly on the floor (model units, set from the build's floor check)
const death = {
  dur: 2.0, contact: [0.55],
  phases: [['struck', 0], ['the legs give', 0.15], ['drops onto its belly', 0.55], ['the legs curl in', 0.6], ['lies still', 1.3]],
  pose: (t) => { const hit = pulse(t, 0, 0.05, 0.12, 0.3), k = c01((t - 0.15) / 0.4), d = k * k;
    return addPose({ oy: -DROP * d + 0.01 * bump(t, 0.62, 0.12), bp: 0.15 * hit - 0.04 * d, qsy: -0.08 * hit - 0.04 * smooth((t - 0.55) / 0.3), qsx: 0.04 * smooth((t - 0.55) / 0.3), qsz: 0.04 * smooth((t - 0.55) / 0.3),
      abp: 0.1 * hit - 0.06 * d - 0.04 * bump(t, 1.4, 0.15), flr: 0.4 * hit + 0.3 * d, frr: -0.4 * hit - 0.3 * d, hp: 0.12 * d }); },
  feet: (t, B) => {
    const curl = smooth((t - 0.5) / 0.6), give = smooth((t - 0.15) / 0.4);
    return Object.fromEntries(LEGS.map((k, i) => { const R = REST[k]; const tuck = V3(R.x * 0.55, 0.06 + 0.12 * curl, R.z * 0.6 + 0.05);
      const splay = V3(R.x * 1.12, 0, R.z * 1.05); const p = R.clone().lerp(splay, give * (1 - curl)).lerp(tuck, curl); return [k, { p, lock: give < 0.01 }]; }));
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), bites, hurt, spawn, death };
