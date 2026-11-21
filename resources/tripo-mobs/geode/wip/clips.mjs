// The Geode Brute's moves. Units are model units (the model is 0.96 tall; the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/geode.js (0.9 u/s; the CRYSTAL SLAM: an Ember ring r 1.5 centred 0.9 u
// in front of it for 60 ticks, 14 damage; it throws three crystal shards ahead and 70 deg to either side, each landing
// 2.4 u from the impact a second later on an Ember ring r 0.8 for 8, leaving a crystal patch r 0.8 for 3 s; every 280
// ticks) and its rig src/render/enemies/facet/geode.js (the knuckle-walk in diagonal pairs, the body rolling with the
// gait and leaning 0.08 into the travel; the three slams C1..O3 key for key on the strike timeline: the coil to the
// telegraph's end less 2.5 frames, the strike 2.5, the contact held 3, snap back 3, settle 10; the fists' lifted
// positions lx, ly, lz and rx, ry, rz).
import { readFileSync } from 'fs';
import { track, gaitFoot, V3, smooth, lerp, clamp, addPose } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
const SK = JSON.parse(readFileSync(new URL('./rig/skel.json', import.meta.url)));
const LEGS = ['HL', 'HR', 'FL', 'FR'];
const BN = { HL: ['fL', 'tL', 'aL', 'cL'], HR: ['fR', 'tR', 'aR', 'cR'], FL: ['armL', 'foreL', 'handL', 'knkL'], FR: ['armR', 'foreR', 'handR', 'knkR'] };
export const CFG = {
  name: 'geode', unit: 1.3, base: {},
  chain: [['hips', 'b'], ['sq', 'q']],
  extras: [['spine', 'sp'], ['chest', 'ch'], ['head', 'h'], ['jaw', 'j']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']]],
  legs: Object.fromEntries(LEGS.map((k) => [k, { kind: 'limb', b: BN[k] }])),
  springs: [],
};
const U = CFG.unit;
const REST = Object.fromEntries(LEGS.map((k) => [k, V3(...SK.ends[BN[k][3]])]));
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

// The game's pose fields (geode.js REST) on this rig: push and lift in game u, pitch (+ nose down) about the hips,
// twist, roll, sx/sy; upL/upR the fist off the floor and lx..rz where it goes (game u, from its rest 0.55, 0.13, 0.5).
const GR = Object.freeze({ push: 0, lift: 0, pitch: 0, twist: 0, roll: 0, sx: 1, sy: 1, upL: 0, upR: 0, lx: 0.55, ly: 0.13, lz: 0.5, rx: -0.55, ry: 0.13, rz: 0.5, glow: 0 });
function game(g) {
  return { oz: g.push / U, oy: g.lift / U, bp: -0.8 * g.pitch, spp: -0.2 * g.pitch, hp: 0.5 * g.pitch, by: g.twist, br: g.roll,
    qsx: g.sx - 1, qsz: (g.sx - 1) * 0.5, qsy: g.sy - 1, jp: -0.25 * g.glow };
}
// where a fist goes: its own rest plus the game's move from its rest, blended in by up
function fist(k, g, base) {
  const up = k === 'FL' ? g.upL : g.upR; if (up <= 0) return base;
  const d = k === 'FL' ? V3(g.lx - 0.55, g.ly - 0.13, g.lz - 0.5) : V3(g.rx + 0.55, g.ry - 0.13, g.rz - 0.5);
  const to = REST[k].clone().add(d.multiplyScalar(1 / U)); to.y = Math.max(to.y, REST[k].y);
  return { p: base.p.clone().lerp(to, up), lock: false };
}
const BREATH = (t, P) => ({ qsy: 0.008 * Math.sin(TAU * t / P), qsx: -0.004 * Math.sin(TAU * t / P), chp: 0.015 * Math.sin(TAU * t / P) });

// ------------------------------------------------------------------------------------------------ idle
// 6 s. The game's slow sway; mine: it rolls its head, shifts its weight from fist to fist and flexes one.
const idle = {
  dur: 6, loop: true,
  pose: (t) => { const sh = Math.sin(TAU * t / 6); return addPose(game({ ...GR, roll: 0.03 * sh, twist: 0.04 * sh }), BREATH(t, 3), { hy: 0.25 * pulse(t, 1.0, 1.4, 2.2, 2.6) - 0.2 * pulse(t, 3.4, 3.8, 4.4, 4.8), hp: 0.04 * Math.sin(TAU * t / 3) }); },
  feet: (t) => { const F = allPlanted(); F.FR = steps(t, REST.FR, [[4.9, 5.2, off('FR', 0, 0, 0.03), 0.06], [5.4, 5.7, REST.FR, 0.05]]); return F; },
};

// ------------------------------------------------------------------------------------------------ knuckle-walk and turns
// The game's heavy knuckle-walk at 0.9 u/s, in diagonal pairs (the left hind with the right fist), the body rolling
// with the gait and leaning 0.08 into the travel.
const WT = 0.6, GAIT = { T: WT, duty: 0.66, v: 0.9 / U };
const PH = { HL: 0, FR: 0.04, HR: 0.5, FL: 0.54 };
const GF = Object.fromEntries(LEGS.map((k) => [k, { phase: PH[k], n: [REST[k].x, REST[k].z + (k[0] === 'H' ? 0.03 : 0)], lift: k[0] === 'F' ? 0.08 : 0.06, droop: 0.2, push: 0.1 }]));
const walk = {
  dur: WT * 2, loop: true, gait: { ...GAIT },
  pose: (t) => { const s = Math.sin(TAU * t / WT); return addPose(game({ ...GR, pitch: 0.08, roll: 0.05 * s, twist: 0.04 * s, lift: 0.015 * Math.abs(Math.cos(TAU * t / WT)) }), { hy: -0.05 * s }); },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: WT, duty: 0.66, v: 0, omega: dir * TAU / 6.0 };
  return {
    dur: WT * 2, loop: true, gait: g,
    pose: (t) => addPose(game({ ...GR, roll: 0.03 * Math.sin(TAU * t / WT) }), { by: 0.06 * dir, hy: 0.2 * dir }),
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.05 })])),
  };
};

// ------------------------------------------------------------------------------------------------ the three slams
const K = (o) => Object.freeze({ ...GR, ...o });
const SL = [
  { coil: K({ push: -0.04, lift: 0.04, pitch: -0.18, twist: 0.2, roll: -0.06, sx: 0.97, sy: 1.04, upL: 1, lx: 0.42, ly: 1.12, lz: 0.32, glow: 1 }),
    strike: K({ push: 0.1, lift: -0.06, pitch: 0.26, twist: -0.12, roll: 0.05, sx: 1.16, sy: 0.9, upL: 1, lx: 0.3, ly: 0.13, lz: 0.98, glow: 0.8 }),
    over: K({ push: 0.08, lift: -0.03, pitch: 0.16, twist: -0.08, roll: 0.03, sx: 1.04, sy: 0.98, upL: 1, lx: 0.32, ly: 0.2, lz: 0.92, glow: 0.4 }) },
  { coil: K({ push: -0.04, lift: 0.04, pitch: -0.18, twist: -0.2, roll: 0.06, sx: 0.97, sy: 1.04, upR: 1, rx: -0.42, ry: 1.12, rz: 0.32, glow: 1 }),
    strike: K({ push: 0.1, lift: -0.06, pitch: 0.26, twist: 0.12, roll: -0.05, sx: 1.16, sy: 0.9, upR: 1, rx: -0.3, ry: 0.13, rz: 0.98, glow: 0.8 }),
    over: K({ push: 0.08, lift: -0.03, pitch: 0.16, twist: 0.08, roll: -0.03, sx: 1.04, sy: 0.98, upR: 1, rx: -0.32, ry: 0.2, rz: 0.92, glow: 0.4 }) },
  { coil: K({ push: -0.06, lift: 0.08, pitch: -0.36, sx: 0.94, sy: 1.08, upL: 1, upR: 1, lx: 0.44, ly: 1.16, lz: 0.26, rx: -0.44, ry: 1.16, rz: 0.26, glow: 1 }),
    strike: K({ push: 0.14, lift: -0.1, pitch: 0.34, sx: 1.22, sy: 0.86, upL: 1, upR: 1, lx: 0.4, ly: 0.13, lz: 1.02, rx: -0.4, ry: 0.13, rz: 1.02, glow: 1 }),
    over: K({ push: 0.1, lift: -0.05, pitch: 0.2, sx: 1.06, sy: 0.97, upL: 1, upR: 1, lx: 0.42, ly: 0.22, lz: 0.95, rx: -0.42, ry: 0.22, rz: 0.95, glow: 0.5 }) },
];
export const TEL = 60 / 60;
const ST = TEL - 2.5 * FR, HOLD = TEL + 3 * FR, SNAPE = HOLD + 3 * FR, SETL = SNAPE + 10 * FR, END = SETL + 0.3;
const coilCurve = (k) => 1 - (1 - k) ** 3;
const kick = (k) => k * k * (3 - 2 * k);
function settleK(k, over = 0.08) { const x = c01(k); if (x < 0.62) { const a = x / 0.62; return 1 - (1 + over) * (a * a * (3 - 2 * a)); } const b = (x - 0.62) / 0.38; return -over * (1 - b * b * (3 - 2 * b)); }
const mix = (A, B, k) => Object.fromEntries(Object.keys(GR).map((f) => [f, A[f] + (B[f] - A[f]) * k]));
function slamAt(V, t) {
  if (t < ST) return mix(GR, V.coil, coilCurve(t / ST));
  if (t < TEL) return mix(V.coil, V.strike, kick((t - ST) / (TEL - ST)));
  if (t < HOLD) return { ...V.strike };
  if (t < SNAPE) return mix(V.strike, V.over, 1 - (1 - (t - HOLD) / (SNAPE - HOLD)) ** 2);
  if (t < SETL) { const g = mix(V.over, GR, 1 - settleK((t - SNAPE) / (SETL - SNAPE))); g.upL = V.over.upL * (1 - c01((t - SNAPE) / (SETL - SNAPE))); g.upR = V.over.upR * (1 - c01((t - SNAPE) / (SETL - SNAPE))); return g; }
  return { ...GR };
}
const slam = (i) => ({
  dur: END, contact: [TEL],
  phases: [['coil: the ring telegraph, the fists hauled up', 0], ['the slam', ST], ['contact: the fists in the floor', TEL], ['snap back', HOLD], ['settle: the fists step back under', SNAPE]],
  pose: (t) => game(slamAt(SL[i], t)),
  feet: (t) => { const g = slamAt(SL[i], t); const F = allPlanted(); F.FL = fist('FL', g, F.FL); F.FR = fist('FR', g, F.FR); return F; },
});

// ------------------------------------------------------------------------------------------------ hurt
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { qsy: -0.04, qsx: 0.03, spp: 0.08, chp: 0.06, hp: 0.2, jp: -0.2 }, 'out'], [0.18, { qsy: 0.01, chp: -0.02 }], [0.4, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.2, contact: [0.55], scale: spawnScale,
  phases: [['grows in', 0], ['beats the floor', 0.3], ['glares', 0.8]],
  pose: (t) => { const raise = pulse(t, 0.25, 0.45, 0.5, 0.6), thud = bump(t, 0.6, 0.2); return addPose(game({ ...GR, pitch: -0.12 * raise + 0.1 * thud, lift: 0.03 * raise, glow: raise }), { hp: -0.15 * pulse(t, 0.7, 0.85, 1.0, 1.15) }); },
  feet: (t) => { const F = allPlanted(); F.FL = steps(t, REST.FL, [[0.3, 0.45, off('FL', 0, 0.18, -0.04), 0], [0.5, 0.58, REST.FL, 0]]); F.FR = steps(t, REST.FR, [[0.32, 0.47, off('FR', 0, 0.18, -0.04), 0], [0.52, 0.6, REST.FR, 0]]); return F; },
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is): struck, it rears, then its arms give and it slumps down onto its
// chest between its fists, the head down, and lies still, the crystal going dark.
const LOW = [0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,-0.000,-0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.000];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t * 30, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const death = {
  dur: 2.0, contact: [0.7],
  phases: [['struck', 0], ['the arms give', 0.25], ['slumps down', 0.7], ['lies still', 1.1]],
  pose: (t) => { const hit = pulse(t, 0, 0.08, 0.15, 0.35), k = c01((t - 0.25) / 0.45), d = k * k, land = smooth((t - 0.7) / 0.3);
    const o = addPose(game({ ...GR, pitch: -0.15 * hit + 0.25 * d, sy: 1 - 0.06 * land, sx: 1 + 0.06 * land }), { hp: 0.3 * land, jp: -0.25 * land, by: 0.05 * d, br: 0.06 * d });
    o.oy = (o.oy || 0) - 0.16 * d + (process.env.PROBE ? 0 : -lowAt(t));
    return o; },
  feet: (t) => { const k = smooth((t - 0.3) / 0.4); const F = allPlanted(); for (const s of ['FL', 'FR']) { const R = REST[s]; F[s] = { p: R.clone().lerp(V3(R.x * 1.15, R.y, R.z + 0.06), k), lock: k < 0.01 }; } return F; },
};
export const CLIPS = process.env.PROBE ? { death } : { idle, walk, turnL: turn(1), turnR: turn(-1), slam1: slam(0), slam2: slam(1), slam3: slam(2), hurt, spawn, death };
