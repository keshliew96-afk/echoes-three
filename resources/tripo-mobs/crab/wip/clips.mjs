// The Weir Crab's moves. Units are model units (the model is 1 wide; the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/crab.js (scuttles SIDEWAYS across its target's line at 1.9 u/s while
// edging in at 0.6, the side flipping every 75 ticks; its claws held up before its face are the guard that blocks
// shots from the front; within 1.3 u it snaps, an Ember cone r 1.4 half-angle 55 deg for 42 ticks, 10 damage; the
// guard is down from the wind-up until 45 ticks after; every 180 ticks) and its rig src/render/enemies/facet/crab.js
// (the three snaps C1..O3 key for key on the strike timeline of render/facet/foestrike.js: the coil to the telegraph's
// end less 2.5 frames, the strike 2.5, the contact held 3 with a 0.1 u recoil, snap back 2.5, settle 6; the guard
// lowered from the snap back to 45 ticks after the strike; the scuttle's lean, the breath, the claws' tremble).
import { readFileSync } from 'fs';
import { track, gaitFoot, V3, smooth, lerp, clamp, addPose } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
const SK = JSON.parse(readFileSync(new URL('./rig/skel.json', import.meta.url)));
const LEGS = ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'];
const bn = (k) => ['f', 't', 'a', 'c'].map((c) => c + k[1] + k[0]);
export const CFG = {
  name: 'crab', unit: 1.25, base: {},
  chain: [['hips', 'b'], ['sq', 'q']],
  extras: [['eyeL', 'eL'], ['eyeR', 'eR'], ['armL', 'aL'], ['armR', 'aR'], ['clawL', 'cL'], ['clawR', 'cR']],
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

// The game's pose fields (crab.js REST) on this rig: push and lift in game u, pitch + front down, roll + toward its
// right, twist + toward its left, sx/sy the squash; per claw (r its big right, l its left) raise (rad, the arm lifted),
// reach (the arm thrust out, -0.3 drawn back), hook (rad, swung across, + inward), open (the gape). Your claws are one
// plate each, so the gape tips the plate's top back instead of opening a finger. lower: the guard down (0..1).
const GR = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, rRaise: 0, rReach: 0, rHook: 0, rOpen: 0.15, lRaise: 0, lReach: 0, lHook: 0, lOpen: 0.15, lower: 0 });
const GD = { rRaise: -0.62, lRaise: -0.62, rReach: 0.2, lReach: 0.2, rOpen: 0.2, lOpen: 0.2 };
function game(g) {
  const o = { oz: 0.55 * g.push / U, oy: g.lift / U, bp: -0.6 * g.pitch, br: g.roll, by: g.twist, qsx: g.sx - 1, qsz: (g.sx - 1) * 0.3, qsy: g.sy - 1,
    eLp: 0.3 * g.pitch, eRp: 0.3 * g.pitch };
  for (const [s, c, sg] of [['L', 'l', 1], ['R', 'r', -1]]) {
    const lo = g.lower || 0;
    const raise = g[c + 'Raise'] + GD[c + 'Raise'] * lo, reach = g[c + 'Reach'] + GD[c + 'Reach'] * lo, open = g[c + 'Open'] + (GD[c + 'Open'] - 0.15) * lo;
    o['a' + s + 'p'] = raise > 0 ? 0.7 * raise : 0.4 * raise; // the arm lifted (a forward bone: + is up)
    o['a' + s + 'y'] = -sg * 0.5 * g[c + 'Hook']; // swung across
    o['c' + s + 'b'] = 0.08 * reach; // thrust out along the claw
    // the plate: its top tipped back by the gape, forward (the face shown) as the guard comes down, and kept clear of the
    // floor while the arm is lowered
    o['c' + s + 'p'] = 0.6 * (open - 0.15) - 0.75 * lo - 0.35 * Math.min(0, raise);
  }
  return o;
}
const BREATH = (t, P) => ({ qsy: 0.012 * Math.sin(TAU * t / P), qsx: -0.004 * Math.sin(TAU * t / P) });
const tremble = (t) => ({ aLp: -0.7 * 0.03 * Math.sin(3.1 * t), aRp: 0.7 * 0.03 * Math.sin(3.1 * t) });

// ------------------------------------------------------------------------------------------------ idle
// 6 s. The game's breath and the claws' tremble; mine: the eye stalks look about each on its own, it shifts its weight,
// and a front leg resettles.
const idle = {
  dur: 6, loop: true,
  pose: (t) => { const sh = Math.sin(TAU * t / 6);
    const eL = 0.35 * pulse(t, 1.0, 1.25, 2.2, 2.45) - 0.3 * pulse(t, 3.6, 3.8, 4.6, 4.8), eR = 0.3 * pulse(t, 1.15, 1.4, 2.2, 2.5) - 0.35 * pulse(t, 4.0, 4.2, 5.0, 5.3);
    return addPose(game(GR), BREATH(t, 3), tremble(t), { br: 0.03 * sh, ox: 0.01 * sh, eLy: eL, eRy: eR, eLp: 0.08 * bump(t, 5.6, 0.3), eRp: 0.08 * bump(t, 5.65, 0.3) }); },
  feet: (t) => { const F = allPlanted(); F.L1 = steps(t, REST.L1, [[2.6, 2.75, off('L1', 0.01, 0, 0.02), 0.04], [2.85, 3.0, REST.L1, 0.04]]); F.R3 = steps(t, REST.R3, [[5.0, 5.15, off('R3', -0.015, 0, 0), 0.03], [5.3, 5.45, REST.R3, 0.03]]); return F; },
};

// ------------------------------------------------------------------------------------------------ scuttle and turns
// The game's scuttle: sideways to its left at 1.9 u/s while edging in at 0.6, on two alternating sets of four (legs
// 1 and 3 of one side with 2 and 4 of the other), the body leaning 0.14 into the sidestep and a touch forward.
const WT = 0.16, GAIT = { T: WT, duty: 0.5, v: 0.6 / U, vx: 1.9 / U };
const SET = { L1: 0, L3: 0, R2: 0, R4: 0, L2: 0.5, L4: 0.5, R1: 0.5, R3: 0.5 };
const GF = Object.fromEntries(LEGS.map((k) => [k, { phase: SET[k], n: [REST[k].x * 0.92, REST[k].z], lift: 0.045, droop: 0.4, push: 0.1 }]));
const walk = {
  dur: WT * 4, loop: true, gait: { ...GAIT },
  pose: (t) => { const w = TAU * t / WT; return addPose(game({ ...GR, pitch: 0.08 * 0.3, roll: -0.14 }), { oy: 0.012 / U * Math.cos(2 * w), br: 0.03 * 0.5 * Math.sin(2 * w), eLy: 0.25, eRy: 0.25 }); },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: WT, duty: 0.5, v: 0, omega: dir * 300 * Math.PI / 180 };
  return {
    dur: WT * 4, loop: true, gait: g,
    pose: (t) => { const w = TAU * t / WT; return addPose(game(GR), { oy: 0.008 / U * Math.cos(2 * w), by: 0.05 * dir, eLy: 0.2 * dir, eRy: 0.2 * dir }); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.04 })])),
  };
};

// ------------------------------------------------------------------------------------------------ the three snaps
// The game's key poses (crab.js C1..O3) on its strike timeline: the coil through the cone telegraph (42 ticks less the
// strike's 2.5 frames), the strike, the contact held 3 frames with the 0.1 u recoil shove, the snap back to the over pose
// and the settle; the guard comes down through the snap back and stays down 45 ticks from the strike, then rises.
const K = (o) => Object.freeze({ ...GR, ...o });
const SN = [
  { coil: K({ push: -0.06, pitch: -0.12, roll: 0.06, twist: -0.18, sx: 0.97, sy: 1.05, rRaise: 0.3, rReach: -0.3, rHook: -0.5, rOpen: 0.45, lRaise: 0.15, lHook: 0.1, lOpen: 0.3 }),
    strike: K({ push: 0.14, pitch: 0.22, roll: -0.05, twist: 0.2, sx: 1.19, sy: 0.91, rRaise: -0.25, rReach: 1, rHook: 0.45, rOpen: -0.05, lRaise: -0.1, lHook: -0.05, lOpen: 0.15 }),
    over: K({ push: 0.09, pitch: 0.18, twist: 0.26, sx: 1.04, sy: 0.98, rRaise: -0.3, rReach: 0.6, rHook: 0.6, rOpen: 0.1, lRaise: -0.05, lOpen: 0.2 }) },
  { coil: K({ push: -0.05, pitch: -0.1, roll: -0.05, twist: 0.2, sx: 0.97, sy: 1.04, lRaise: 0.28, lReach: -0.4, lHook: 0.05, lOpen: 0.5, rRaise: 0.2, rHook: -0.15, rOpen: 0.25 }),
    strike: K({ push: 0.14, pitch: 0.22, roll: 0.04, twist: -0.18, sx: 1.19, sy: 0.91, lRaise: -0.2, lReach: 1, lHook: 0.12, lOpen: -0.05, rRaise: 0.05, rHook: -0.1, rOpen: 0.15 }),
    over: K({ push: 0.09, pitch: 0.18, twist: -0.24, sx: 1.04, sy: 0.98, lRaise: -0.2, lReach: 0.6, lHook: 0.2, lOpen: 0.1, rRaise: 0.05 }) },
  { coil: K({ push: -0.07, pitch: -0.14, sx: 0.96, sy: 1.07, rRaise: 0.35, rReach: -0.3, rHook: -0.35, rOpen: 0.45, lRaise: 0.35, lReach: -0.3, lHook: -0.35, lOpen: 0.45 }),
    strike: K({ push: 0.16, lift: 0.04, pitch: 0.26, sx: 1.19, sy: 0.91, rRaise: -0.35, rReach: 1, rHook: 0.55, rOpen: -0.08, lRaise: -0.35, lReach: 1, lHook: 0.55, lOpen: -0.08 }),
    over: K({ push: 0.1, lift: 0.01, pitch: 0.2, sx: 1.05, sy: 0.97, rRaise: -0.35, rReach: 0.6, rHook: 0.45, rOpen: 0.1, lRaise: -0.35, lReach: 0.6, lHook: 0.45, lOpen: 0.1 }) },
];
export const TEL = 42 / 60;
const ST = TEL - 2.5 * FR, HOLD = TEL + 3 * FR, SNAPE = HOLD + 2.5 * FR, SETL = SNAPE + 6 * FR, OPEN_END = ST + 45 / 60, END = OPEN_END + 0.45;
const coilCurve = (k) => 1 - (1 - k) ** 3;
const kick = (k) => k * k * (3 - 2 * k);
function settleK(k, over = 0.08) { const x = c01(k); if (x < 0.62) { const a = x / 0.62; return 1 - (1 + over) * (a * a * (3 - 2 * a)); } const b = (x - 0.62) / 0.38; return -over * (1 - b * b * (3 - 2 * b)); }
const recoil = (a) => { if (a < 0) return 0; if (a < 2 * FR) return a / (2 * FR); const k = (a - 2 * FR) / (8 * FR); return k >= 1 ? 0 : (1 - k) * (1 - k); };
const mix = (A, B, k) => Object.fromEntries(Object.keys(GR).map((f) => [f, A[f] + (B[f] - A[f]) * k]));
function snapAt(V, t) {
  let g;
  if (t < ST) g = mix(GR, V.coil, coilCurve(t / ST));
  else if (t < TEL) g = mix(V.coil, V.strike, kick((t - ST) / (TEL - ST)));
  else if (t < HOLD) g = { ...V.strike };
  else if (t < SNAPE) g = mix(V.strike, V.over, 1 - (1 - (t - HOLD) / (SNAPE - HOLD)) ** 2);
  else if (t < SETL) g = mix(V.over, GR, 1 - settleK((t - SNAPE) / (SETL - SNAPE)));
  else g = { ...GR };
  g.push -= 0.1 * recoil(t - HOLD);
  // the guard: down from the snap back, up again 45 ticks after the strike
  g.lower = smooth((t - HOLD) / 0.25) * (1 - smooth((t - OPEN_END) / 0.25));
  return g;
}
const snap = (i, label) => ({
  dur: END, contact: [TEL],
  phases: [['coil: the cone telegraph', 0], ['snap', ST], ['contact: claws shut', TEL], ['snap back', HOLD], ['settle, guard down', SNAPE], ['the guard rises', OPEN_END]],
  pose: (t) => addPose(game(snapAt(SN[i], t)), { hp: 0 }),
  feet: allPlanted,
  label,
});

// ------------------------------------------------------------------------------------------------ hurt
// On top of anything: the shell jolts and squashes, the eye stalks snap back flat, the claws flinch up.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { qsy: -0.07, qsx: 0.05, eLp: 0.9, eRp: 0.9, aLp: 0.15, aRp: 0.15, cLp: 0.12, cRp: 0.12 }, 'out'], [0.2, { qsy: 0.015, eLp: 0.5, eRp: 0.5 }], [0.4, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames, about 10% over. Mine on top: it rises on its legs, the eyes pop up
// and the claws come up into the guard.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.2, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['rises on its legs', 7 * FR], ['the eyes pop up', 0.4], ['the guard comes up', 0.6]],
  pose: (t) => { const up = smooth((t - 0.6) / 0.35), eyes = smooth((t - 0.35) / 0.2);
    return addPose({ oy: -0.06 / U * (1 - smooth((t - 0.1) / 0.4)) }, game({ ...GR, lower: 1 - up }), { eLp: 1.0 * (1 - eyes) - 0.15 * bump(t, 0.6, 0.15), eRp: 1.0 * (1 - eyes) - 0.15 * bump(t, 0.63, 0.15) }); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it rears and the claws fly up; the legs give and it drops onto
// its belly, the claws falling open to the floor, the legs curling in and the eye stalks folding back.
const DROP = 0.1;
const LOW = [0.000,0.016,0.022,0.022,0.022,0.018,0.016,0.010,0.005,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.004,0.007,0.012,0.018,0.025,0.032,0.040,0.048,0.056,0.064,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070,0.070]; // the probe's lowest point per game frame of the death (oy offset 0)
const lowAt = (t) => { if (!LOW.length) return -1; const f = clamp(t * 30, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const death = {
  dur: 2.0, contact: [0.55],
  phases: [['struck', 0], ['the legs give', 0.15], ['the legs curl in, it sinks onto its belly', 0.5], ['lies still', 1.2]],
  pose: (t) => { const hit = pulse(t, 0, 0.05, 0.12, 0.3), k = c01((t - 0.15) / 0.4), d = k * k, fold = smooth((t - 0.5) / 0.6);
    return addPose(game({ ...GR, lower: 0.8 * d, rRaise: 0.3 * hit, lRaise: 0.3 * hit, rOpen: 0.15 + 0.3 * hit, lOpen: 0.15 + 0.3 * hit }),
      { oy: process.env.PROBE ? 0 : Math.max(-DROP * d, -lowAt(t)) + 0.008 * bump(t, 0.62, 0.12), bp: 0.12 * hit - 0.03 * d, qsy: -0.07 * hit - 0.03 * smooth((t - 0.55) / 0.3), qsx: 0.03 * smooth((t - 0.55) / 0.3),
        eLp: 1.1 * fold, eRp: 1.1 * fold, eLr: 0.3 * fold, eRr: -0.3 * fold, aLy: 0.15 * d, aRy: -0.15 * d }); },
  feet: (t) => {
    const curl = smooth((t - 0.5) / 0.6), give = smooth((t - 0.15) / 0.4);
    return Object.fromEntries(LEGS.map((k) => { const R = REST[k]; const tuck = V3(R.x * 0.7, 0.04 + 0.05 * curl, R.z * 0.75);
      const splay = V3(R.x * 1.12, 0, R.z * 1.05); const p = R.clone().lerp(splay, give * (1 - curl)).lerp(tuck, curl); return [k, { p, lock: give < 0.01 }]; }));
  },
};
export const CLIPS = process.env.PROBE ? { death } : { idle, walk, turnL: turn(1), turnR: turn(-1), snap1: snap(0, 'Claw hook'), snap2: snap(1, 'Claw jab'), snap3: snap(2, 'Scissor slam'), hurt, spawn, death };
