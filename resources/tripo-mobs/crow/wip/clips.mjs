// The Barrow Crow's moves. Units are model units (the model is 0.81 tall; the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/crow.js (hops at 2.0 u/s to keep 3.5 to 5.5 u from its target, circling
// at 0.4 of that in between; then it caws: an Ember cone r 5.0, half-angle 22 deg, 45 ticks, locked on the target,
// then a fan of three feather-shots at -15, 0, +15 deg, 5 damage each at 5 u/s; every 240 ticks) and its rig
// src/render/enemies/facet/crow.js (the three caws C1..O3 key for key on the strike timeline: the coil to the
// telegraph's end less 2.5 frames, the strike 2.5, the contact held 3 with a recoil shove, snap back 2.5, settle 6;
// both feet step together, so it hops, the body bobbing up 0.08 on each hop and leaning 0.12 into the travel).
import { readFileSync } from 'fs';
import { track, gaitFoot, V3, smooth, lerp, clamp, addPose } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
const SK = JSON.parse(readFileSync(new URL('./rig/skel.json', import.meta.url)));
const LEGS = ['L', 'R'];
export const CFG = {
  name: 'crow', unit: 1.0, base: {},
  chain: [['hips', 'b'], ['sq', 'q']],
  extras: [['neck', 'n'], ['head', 'h'], ['jaw', 'j'], ['tail', 'tl'], ['wingL', 'wL'], ['wingR', 'wR'], ['wtipL', 'wtL'], ['wtipR', 'wtR']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']]],
  legs: Object.fromEntries(LEGS.map((k) => [k, { kind: 'limb', b: ['f' + k, 't' + k, 'a' + k, 'c' + k] }])),
  springs: [],
};
const U = CFG.unit;
const REST = Object.fromEntries(LEGS.map((k) => [k, V3(...SK.ends['c' + k])]));
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

// The game's pose fields (crow.js REST) on this rig: push and lift in game u, pitch + front down, roll, twist, sx/sy;
// head (rad, drawn back +), hy (the head turned), neck (the head thrust out, u), beak (the lower beak's gape), wing (the
// wings fanned up and out, 0..1), wfwd (snapped forward, 0..1). Your wings already hang half open, so the fan lifts
// them from there.
const GR = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, head: 0, hy: 0, neck: 0, beak: 0.05, wing: 0, wfwd: 0 });
function game(g) {
  const o = { oz: g.push / U, oy: g.lift / U, bp: -0.7 * g.pitch, br: g.roll, by: g.twist, qsx: g.sx - 1, qsz: (g.sx - 1) * 0.3, qsy: g.sy - 1,
    np: -2.5 * g.neck, hp: 0.8 * g.head, hy: g.hy, jp: -0.6 * (g.beak - 0.05), tlp: 0.15 * g.wing - 0.1 * g.wfwd - 1.0 * Math.max(0, -g.pitch) };
  for (const [s, sg] of [['L', 1], ['R', -1]]) {
    o['w' + s + 'r'] = sg * (0.75 * g.wing - 0.15 * g.wfwd); o['wt' + s + 'r'] = sg * 0.35 * g.wing;
    o['w' + s + 'y'] = -sg * 0.6 * g.wfwd; o['w' + s + 'p'] = 0.15 * g.wing;
  }
  return o;
}
const BREATH = (t, P) => ({ qsy: 0.01 * Math.sin(TAU * t / P), qsx: -0.004 * Math.sin(TAU * t / P) });

// ------------------------------------------------------------------------------------------------ idle
// 6 s. The game's breath and slow head bob; mine: it cocks its head one way then the other, rouses its wings once,
// and shifts on its feet.
const idle = {
  dur: 6, loop: true,
  pose: (t) => { const cock = 0.4 * pulse(t, 0.8, 1.0, 1.9, 2.1) - 0.45 * pulse(t, 3.2, 3.4, 4.2, 4.4);
    const rouse = bump(t, 5.0, 0.5);
    return addPose(game({ ...GR, wing: 0.25 * rouse }), BREATH(t, 3), { hp: 0.05 * Math.sin(TAU * t / 3) + 0.08 * Math.abs(cock), hy: cock, hr: 0.4 * cock, qsx: 0.03 * rouse, qsz: 0.03 * rouse }); },
  feet: (t) => { const F = allPlanted(); F.L = steps(t, REST.L, [[2.5, 2.7, off('L', 0.01, 0, 0.03), 0.04], [2.8, 3.0, REST.L, 0.04]]); return F; },
};

// ------------------------------------------------------------------------------------------------ hop and turns
// The game's hop: both feet step together at 2.0 u/s, the body riding up 0.08 on each hop and leaning 0.12 into it.
const HT = 0.3, HD = 0.2, GAIT = { T: HT, duty: HD, v: 2.0 / U };
const GF = Object.fromEntries(LEGS.map((k) => [k, { phase: 0, n: [REST[k].x, REST[k].z], lift: 0.07, droop: 0.3, push: 0.15 }]));
const hopK = (t) => { const u = ((t / HT) % 1 + 1) % 1; return u < HD ? 0 : Math.sin(Math.PI * (u - HD) / (1 - HD)); };
const walk = {
  dur: HT * 3, loop: true, gait: { ...GAIT },
  pose: (t) => { const h = hopK(t); return addPose(game({ ...GR, pitch: 0.12, lift: 0.08 * h, wing: 0.12 * h }), { hp: -0.1 * h, qsy: -0.04 * pulse(((t / HT) % 1), 0, 0.04, HD - 0.04, HD) }); },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: HT, duty: HD, v: 0, omega: dir * TAU / 1.8 };
  return {
    dur: HT * 3, loop: true, gait: g,
    pose: (t) => { const h = hopK(t); return addPose(game({ ...GR, lift: 0.05 * h }), { by: 0.06 * dir, hy: 0.25 * dir }); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.05 })])),
  };
};

// ------------------------------------------------------------------------------------------------ the three caws
const K = (o) => Object.freeze({ ...GR, ...o });
const CW = [
  { coil: K({ push: -0.04, pitch: -0.12, roll: -0.04, twist: 0.2, sx: 0.97, sy: 1.06, head: 0.5, hy: 0.35, neck: -0.04, beak: 0.45, wing: 0.85 }),
    strike: K({ push: 0.06, pitch: 0.16, roll: 0.04, twist: -0.15, sx: 1.2, sy: 0.92, head: -0.25, hy: -0.2, neck: 0.1, beak: 0.9, wing: 0.5, wfwd: 0.8 }),
    over: K({ push: 0.03, pitch: 0.08, twist: -0.12, sx: 1.04, sy: 0.98, head: -0.1, hy: -0.15, neck: 0.05, beak: 0.4, wing: 0.3, wfwd: 0.4 }) },
  { coil: K({ push: -0.04, pitch: -0.12, roll: 0.04, twist: -0.2, sx: 0.97, sy: 1.06, head: 0.5, hy: -0.35, neck: -0.04, beak: 0.45, wing: 0.85 }),
    strike: K({ push: 0.06, pitch: 0.16, roll: -0.04, twist: 0.15, sx: 1.2, sy: 0.92, head: -0.25, hy: 0.2, neck: 0.1, beak: 0.9, wing: 0.5, wfwd: 0.8 }),
    over: K({ push: 0.03, pitch: 0.08, twist: 0.12, sx: 1.04, sy: 0.98, head: -0.1, hy: 0.15, neck: 0.05, beak: 0.4, wing: 0.3, wfwd: 0.4 }) },
  { coil: K({ push: -0.06, lift: -0.02, pitch: -0.16, sx: 0.96, sy: 1.08, head: 0.65, neck: -0.06, beak: 0.5, wing: 1 }),
    strike: K({ push: 0.08, lift: 0.07, pitch: 0.2, sx: 1.2, sy: 0.92, head: -0.35, neck: 0.14, beak: 1.0, wing: 0.7, wfwd: 1 }),
    over: K({ push: 0.04, lift: 0.02, pitch: 0.1, sx: 1.05, sy: 0.98, head: -0.15, neck: 0.06, beak: 0.45, wing: 0.4, wfwd: 0.5 }) },
];
export const TEL = 45 / 60;
const ST = TEL - 2.5 * FR, HOLD = TEL + 3 * FR, SNAPE = HOLD + 2.5 * FR, SETL = SNAPE + 6 * FR, END = SETL + 0.4;
const coilCurve = (k) => 1 - (1 - k) ** 3;
const kick = (k) => k * k * (3 - 2 * k);
function settleK(k, over = 0.08) { const x = c01(k); if (x < 0.62) { const a = x / 0.62; return 1 - (1 + over) * (a * a * (3 - 2 * a)); } const b = (x - 0.62) / 0.38; return -over * (1 - b * b * (3 - 2 * b)); }
const recoil = (a) => { if (a < 0) return 0; if (a < 2 * FR) return a / (2 * FR); const k = (a - 2 * FR) / (8 * FR); return k >= 1 ? 0 : (1 - k) * (1 - k); };
const mix = (A, B, k) => Object.fromEntries(Object.keys(GR).map((f) => [f, A[f] + (B[f] - A[f]) * k]));
function cawAt(V, t) {
  let g;
  if (t < ST) g = mix(GR, V.coil, coilCurve(t / ST));
  else if (t < TEL) g = mix(V.coil, V.strike, kick((t - ST) / (TEL - ST)));
  else if (t < HOLD) g = { ...V.strike };
  else if (t < SNAPE) g = mix(V.strike, V.over, 1 - (1 - (t - HOLD) / (SNAPE - HOLD)) ** 2);
  else if (t < SETL) g = mix(V.over, GR, 1 - settleK((t - SNAPE) / (SETL - SNAPE)));
  else g = { ...GR };
  g.push -= 0.06 * recoil(t - HOLD); // the shooter's recoil shove
  return g;
}
const caw = (i, hop) => ({
  dur: END, contact: [TEL],
  phases: [['coil: the cone telegraph', 0], ['the caw', ST], ['the fan looses', TEL], ['snap back', HOLD], ['settle', SNAPE]],
  pose: (t) => { const g = cawAt(CW[i], t); return addPose(game(g), { qsy: 0.02 * Math.sin(TAU * 7 * c01(t / ST)) * (t < ST ? 1 : 0) * 0.5 }); },
  feet: hop ? (t) => { const F = allPlanted(); const a = TEL - 3 * FR, b = TEL + 4 * FR;
    for (const k of LEGS) F[k] = steps(t, REST[k], [[a, b, REST[k], 0.06]]); return F; } : allPlanted,
});

// ------------------------------------------------------------------------------------------------ hurt
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { qsy: -0.07, qsx: 0.05, hp: 0.4, np: 0.3, wLr: 0.35, wRr: -0.35, wtLr: 0.2, wtRr: -0.2, jp: -0.3, tlp: 0.25 }, 'out'], [0.18, { qsy: 0.015, hp: -0.08, wLr: -0.05, wRr: 0.05 }], [0.4, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.2, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['rouses its feathers', 7 * FR], ['looks about', 0.75]],
  pose: (t) => { const r = pulse(t, 0.25, 0.4, 0.55, 0.75); return addPose(game({ ...GR, wing: 0.6 * r }), { qsx: 0.06 * r * Math.sin(TAU * 8 * t), qsz: 0.06 * r, hy: 0.3 * pulse(t, 0.75, 0.85, 1.0, 1.15), hp: 0.15 * r }); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it rears with its wings thrown up and the beak wide; then
// it pitches forward onto its breast, the wings falling open across the floor, the head down.
const LOW = [0.009,0.009,0.009,0.009,0.009,0.009,0.009,0.009,0.010,0.013,0.018,0.026,0.035,0.044,0.054,0.064,0.073,0.080,0.086,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089,0.089];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t * 30, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const death = {
  dur: 2.0, contact: [0.6],
  phases: [['struck', 0], ['pitches forward', 0.2], ['lands on its breast', 0.6], ['lies still', 1.1]],
  pose: (t) => { const hit = pulse(t, 0, 0.06, 0.12, 0.3), k = c01((t - 0.2) / 0.4), d = k * k, land = smooth((t - 0.6) / 0.3);
    const o = addPose(game({ ...GR, wing: 0.9 * hit + 0.6 * d, head: 0.5 * hit - 0.4 * d, beak: 0.05 + 0.8 * hit }),
      { bp: -1.2 * d, qsy: -0.05 * land, hp: -0.3 * land, np: -0.3 * d, wLr: -0.6 * land, wRr: 0.6 * land, wtLr: -0.3 * land, wtRr: 0.3 * land, tlp: 0.3 * d });
    o.oy = process.env.PROBE ? 0 : -lowAt(t) + 0.01 * bump(t, 0.66, 0.12) * (1 - 0);
    return o; },
  feet: (t) => { const k = smooth((t - 0.25) / 0.4); return Object.fromEntries(LEGS.map((s) => { const R = REST[s]; const p = R.clone().lerp(V3(R.x * 1.3, 0.08, R.z - 0.18), k); return [s, { p, lock: k < 0.01 }]; })); },
};
export const CLIPS = process.env.PROBE ? { death } : { idle, walk, turnL: turn(1), turnR: turn(-1), caw1: caw(0, false), caw2: caw(1, false), caw3: caw(2, true), hurt, spawn, death };
