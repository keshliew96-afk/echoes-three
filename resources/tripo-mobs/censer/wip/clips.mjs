// The Heart Censer's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/censer.js (drifts at 2.0 u/s, a flier; every 300 ticks it gathers for
// 48, then mends its kin within 4.2 u; a stun in the gather spills it) and its rig src/render/enemies/facet/censer.js
// (hung from the chain's top at 2.35 u with the pot at 1.25 u; the whole censer swings about the chain's top,
// 0.07 + 0.16 amp rad at 1.4 + 2.6 amp rad/s, the cross swing at 0.77 of that rate and 0.7 of the size; it trails
// 0.28 rad behind a drift; it bobs 0.06 u at 1.8 rad/s; the gather's key poses REST, coil, strike, over on the strike
// timeline: coil 48 ticks less the 2.5-frame strike, hold 3 frames, snap 3, settle 10, rest 0.35 s; the spill at 0.4 s:
// 4 frames to SPILLED, 0.45 s back). The pot's spin (0.5 rad/s at rest, up to 4) is the page's, added after the moves,
// as the game adds it live; these clips leave the pot unspun.
import { V3, smooth, lerp, clamp, addPose, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'censer', unit: 1.47, base: {}, floor: false,
  chain: [['hips', 'b']],
  extras: [['c1', 'c1'], ['c2', 'c2'], ['c3', 'c3'], ['pot', 'p'], ['sq', 'q']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']]],
  legs: {},
  springs: [],
};
const U = CFG.unit;
const HO = (1.25 - 0.25 * U) / U; // the model's foot on this rig: the pot's middle (model y 0.25) at the game's 1.25 u
const TOP = 1.0 + HO; // the chain's top (model y 1.0) at the game's 2.35 u
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const easeOut = (k) => 1 - (1 - c01(k)) ** 2;
const kick = (k) => 1 - (1 - c01(k)) ** 3;
const coilCurve = (k) => { const c = c01(k); return 0.85 * easeOut(Math.min(1, c / 0.4)) + 0.15 * c; };
const settleK = (k) => { if (k <= 0) return 1; if (k >= 1) return 0; const a = 1 - k; return a * a * (1 - 2.6 * k); };

// --- the game's pose fields: coal (the tell, 0..1, drawn by the page), halo and haloA (the page's), spin (the page's),
// amp (the swing, 0..1 of its wild gather swing), drop (the pot lowered, u, + down), sx / sy (the pot's squash)
const REST = Object.freeze({ coal: 0, halo: 1, haloA: 0.6, spin: 0.5, amp: 0.3, drop: 0, sx: 1, sy: 1 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const COIL = K({ coal: 1, halo: 1.45, haloA: 0.92, spin: 3.0, amp: 1, drop: -0.05, sx: 0.96, sy: 1.04 });
const STRK = K({ coal: 1, halo: 1.85, haloA: 1, spin: 4.0, amp: 0.6, drop: 0.07, sx: 1.14, sy: 0.9 });
const OVER = K({ coal: 0.55, halo: 1.25, haloA: 0.15, spin: 2.0, amp: 0.45, drop: -0.02, sx: 0.98, sy: 1.03 });
const SPILLED = K({ coal: -0.6, halo: 0.7, haloA: 0.2, spin: 0.2, amp: 1, drop: 0.14, sx: 1.08, sy: 0.94 });
const lerpF = (a, b, k) => Object.fromEntries(FIELDS.map((f) => [f, a[f] + (b[f] - a[f]) * k]));
const TEL = 48 / 60, STRIKE = 2.5 * FR, HOLD = 3 * FR, SNAP = 3 / 30, SETTLE = 10 / 30, RESTS = 0.35;
const T_STRIKE = TEL - STRIKE, T_HOLD = TEL, T_SNAP = TEL + HOLD, T_SETTLE = T_SNAP + SNAP, T_REST = T_SETTLE + SETTLE;
export const GATHER_DUR = T_REST + RESTS;
export function gatherPose(t) {
  if (t < T_STRIKE) return lerpF(REST, COIL, coilCurve(t / T_STRIKE));
  if (t < T_HOLD) return lerpF(COIL, STRK, kick((t - T_STRIKE) / STRIKE));
  if (t < T_SNAP) return { ...STRK };
  if (t < T_SETTLE) return lerpF(STRK, OVER, easeOut((t - T_SNAP) / SNAP));
  if (t < T_REST) return lerpF(OVER, REST, 1 - settleK((t - T_SETTLE) / SETTLE));
  return { ...REST };
}
const SPILL_AT = 0.4, SPILL_IN = 4 / 30, SPILL_BACK = 0.45;
export const SPILL_DUR = SPILL_AT + SPILL_IN + SPILL_BACK + 0.2;
export function spillPose(t) {
  if (t < SPILL_AT) return gatherPose(t);
  const from = gatherPose(SPILL_AT);
  if (t < SPILL_AT + SPILL_IN) return lerpF(from, SPILLED, easeOut((t - SPILL_AT) / SPILL_IN));
  if (t < SPILL_AT + SPILL_IN + SPILL_BACK) return lerpF(SPILLED, REST, smooth((t - SPILL_AT - SPILL_IN) / SPILL_BACK));
  return { ...REST };
}

// --- the swing: the game's amp sets the size and the rate, so the phase is integrated (a table per clip)
function phaseTable(dur, ampAt) {
  const n = Math.ceil(dur * 240) + 2, dt = dur / (n - 2), ph = new Float64Array(n); let p = 0;
  for (let i = 0; i < n; i++) { ph[i] = p; p += (1.4 + 2.6 * ampAt(i * dt)) * dt; }
  return (t) => { const f = c01(t / dur) * (n - 2); const i = Math.floor(f); return ph[i] + (ph[i + 1] - ph[i]) * (f - i); };
}
// the swing angles at phase ph: x (+ the pot back) and z (+ the pot to its left), as the game's body.rotation
const swingAt = (ph, amp) => { const a = 0.07 + 0.16 * amp; return [a * Math.sin(ph), a * 0.7 * Math.sin(0.77 * ph + 1)]; };
// the censer's pose: the swing about the chain's top (the links below trail it a little), the bob, the pot's drop and
// squash. fwd (0..1): the drift's trail. Signs: the game's +x rotation swings the pot back, a minus pitch here.
function censer(t, o = {}) {
  const sx = o.sx ?? 0, sz = o.sz ?? 0, lx = o.lx ?? 0, lz = o.lz ?? 0, g = o.g || REST;
  return {
    oy: (o.oy ?? HO) + (o.bob ?? 0.06 / U * Math.sin(o.bw ?? 0)),
    bp: -sx, br: sz,
    // the links trail the swing: each link bends a share of the swing's lag behind the one above
    c2p: -0.5 * lx, c2r: 0.5 * lz, c3p: -0.7 * lx, c3r: 0.7 * lz, pp: -0.4 * lx, pr: 0.4 * lz,
    pb: -g.drop / U, qsx: g.sx - 1, qsz: g.sx - 1, qsy: g.sy - 1,
  };
}
// the bob runs at the game's 1.8 rad/s; the loops round it to whole cycles
function swingPose(t, ph, ampF, phLag, ampLag) {
  const [sx, sz] = swingAt(ph, ampF), [lx0, lz0] = swingAt(phLag, ampLag);
  return { sx, sz, lx: lx0 - sx, lz: lz0 - sz };
}

// ------------------------------------------------------------------------------------------------ idle (the hover)
// The game's rest: the slow swing (amp 0.3: 0.118 rad at 2.18 rad/s, the cross swing at 3/4 of the rate here so the
// loop closes, the game's 0.77), the bob. 11.5 s: four swings, three cross swings, six bobs.
const IP = 4 * TAU / (1.4 + 2.6 * 0.3);
const idle = {
  dur: IP, loop: true,
  pose: (t) => { const w = 4 * TAU * t / IP; const a = 0.07 + 0.16 * 0.3; const lag = 0.25;
    const sx = a * Math.sin(w), sz = a * 0.7 * Math.sin(0.75 * w + 1), lx = a * Math.sin(w - lag) - sx, lz = a * 0.7 * Math.sin(0.75 * (w - lag) + 1) - sz;
    return censer(t, { sx, sz, lx, lz, bw: 6 * TAU * t / IP }); },
};
// ------------------------------------------------------------------------------------------------ drift and turns
// The game's drift: 2.0 u/s, the censer trailing 0.28 rad behind the travel on top of its swing. 5.76 s loop.
const WP = 2 * TAU / (1.4 + 2.6 * 0.3);
const walk = {
  dur: WP, loop: true, gait: { T: WP, duty: 0, v: 2.0 / U },
  pose: (t) => { const w = 2 * TAU * t / WP; const a = 0.07 + 0.16 * 0.3; const lag = 0.25;
    const sx = 0.28 + a * Math.sin(w), sz = a * 0.7 * Math.sin(0.5 * w + 1), lx = a * Math.sin(w - lag) - a * Math.sin(w) - 0.06, lz = a * 0.7 * (Math.sin(0.5 * (w - lag) + 1) - Math.sin(0.5 * w + 1));
    return censer(t, { sx, sz, lx, lz, bw: 3 * TAU * t / WP }); },
};
// turning (my number: the game turns it instantly): the pot swings out from the turn
const turn = (dir) => ({
  dur: WP / 2, loop: true, gait: { T: WP / 2, duty: 0, v: 0, omega: dir * Math.PI, pivot: [0, 0] },
  pose: (t) => { const w = 2 * TAU * t / WP; const a = 0.07 + 0.16 * 0.3;
    return censer(t, { sx: a * Math.sin(w), sz: -0.12 * dir + a * 0.5 * Math.sin(2 * w), lz: 0.05 * dir, bw: 1.5 * TAU * t / WP }); },
});

// ------------------------------------------------------------------------------------------------ gather and mend
// The game's gather key for key: through the 48-tick coil the coals flare, the halo widens, the chain swings wild and
// fast and the pot rises a touch, narrow and tall; on the mend the pot dips and squashes wide, held 3 frames; the
// snap: the halo blinks dark; then it settles into the drift. The page draws the coals, the halo and the spin.
const GPH = phaseTable(GATHER_DUR, (t) => gatherPose(t).amp);
const gather = {
  dur: GATHER_DUR, contact: [T_HOLD],
  phases: [['the gather: coals flare, the halo widens, the chain swings', 0], ['the flare', T_STRIKE], ['the mend: the halo bursts', T_HOLD], ['the halo blinks dark', T_SNAP], ['settle into the drift', T_SETTLE], ['rest', T_REST]],
  pose: (t) => { const g = gatherPose(t), gl = gatherPose(Math.max(0, t - 0.08)); const s = swingPose(t, GPH(t), g.amp, GPH(Math.max(0, t - 0.08)), gl.amp);
    return censer(t, { ...s, g, bw: 1.8 * t }); },
};
// the spill: a stun cuts the gather at 0.4 s; the coals gutter, the pot drops and swings hard, then eases back
const SPH = phaseTable(SPILL_DUR, (t) => spillPose(t).amp);
const spill = {
  dur: SPILL_DUR, contact: [SPILL_AT],
  phases: [['the gather', 0], ['spilled: the coals gutter, the pot drops', SPILL_AT], ['ease back to rest', SPILL_AT + SPILL_IN], ['rest', SPILL_AT + SPILL_IN + SPILL_BACK]],
  pose: (t) => { const g = spillPose(t), gl = spillPose(Math.max(0, t - 0.08)); const s = swingPose(t, SPH(t), g.amp, SPH(Math.max(0, t - 0.08)), gl.amp);
    // the stun's knock: the swing kicked out once
    const kn = 0.25 * bump(t, SPILL_AT + 0.12, 0.3);
    return censer(t, { ...s, sx: s.sx + kn, lx: s.lx - 0.4 * kn, g, bw: 1.8 * t }); },
};

// ------------------------------------------------------------------------------------------------ hurt
// The game's reaction on this rig (squash 0.7 about the pot, flinch, knock): the pot kicks back and swings, the
// chain whips after it.
const hurt = {
  dur: 0.5, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { bp: 0.16, c3p: -0.12, pp: -0.08, qsy: -0.07, qsx: 0.05, qsz: 0.05 }, 'out'], [0.2, { bp: -0.06, c3p: 0.06, pp: 0.05, qsy: 0.02 }], [0.5, {}]])(t),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grows in over 7 frames, about 10% over, from the chain's top (it hangs from it as it grows).
// Mine on top: the swing starts from still and the coals catch.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.2, contact: [], scale: spawnScale,
  phases: [['grows in from the chain\'s top', 0], ['the swing starts', 7 * FR], ['ready', 1.0]],
  pose: (t) => { const s = spawnScale(t); const a = 0.07 + 0.16 * 0.3; const k = smooth(t / 1.0);
    return censer(t, { sx: a * k * Math.sin(2.18 * t), sz: 0.15 * (1 - k) * Math.sin(9 * t), oy: TOP / s - 1.0, bob: 0 }); },
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game swells it and throws it). Struck, it swings hard and the coals die; the chain lets go: it drops to
// the floor, the spike strikes first, the pot topples onto its side and the chain falls over after it.
const FALL = 0.42; // the fall from the hover to the spike on the floor (s): (2 * 0.88 u / 9.8) ** 0.5
const TIPS = 0.5; // the topple onto its side (s)
const TH = Math.PI / 2 + 0.12; // once down: the pot on its side (r 0.18) and the ring (r 0.09) both on the floor
const deathTh = (t) => { const k = c01((t - 0.15 - FALL) / TIPS); return TH * k * k; };
// the lowest point below the chain's top as it tips (model units): the spike, the pot's side, the ring
const lowAt = (th) => { const c = Math.cos(th), s = Math.sin(th); return Math.min(1 - c, 1 - 0.75 * c - 0.183, 1 - 0.09 * Math.abs(s)); };
// the build's floor check per frame, taken out (the topple's true lowest point, the sagging chain)
const LOWT = [0.6, 1 / 30], LOWC = [-0.003,  0.0,  0.0,  0.0,  0.001,  0.001,  0.001,  0.002,  0.003,  0.006,  -0.014,  -0.004,  0.009,  0.018,  0.029,  0.0376,  0.0433,  0.0503,  0.0556,  0.058,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059,  0.059];
const lowCorr = (t) => { if (t < LOWT[0]) return 0; const f = (t - LOWT[0]) / LOWT[1]; const i = Math.min(LOWC.length - 2, Math.floor(f)); const u = Math.min(1, f - i); return LOWC[i] + (LOWC[i + 1] - LOWC[i]) * u; };
const death = {
  dur: 2.2, contact: [0.15 + FALL, 0.15 + FALL + TIPS],
  phases: [['struck', 0], ['the chain lets go', 0.15], ['the spike strikes the floor', 0.15 + FALL], ['topples onto its side', 0.15 + FALL + 0.02], ['lies still', 0.15 + FALL + TIPS + 0.2]],
  pose: (t) => {
    const k = c01((t - 0.15) / FALL), th = deathTh(t);
    const hang = HO * (1 - k * k); // falling
    const bounce = 0.02 * bump(t, 0.15 + FALL + TIPS + 0.08, 0.16);
    const sw = 0.3 * pulse(t, 0, 0.06, 0.12, 0.4);
    const o = censer(t, { sx: sw, bob: 0, oy: hang - (t > 0.15 + FALL ? lowAt(th) : 0) + bounce + lowCorr(t), g: REST });
    // the topple rolls it onto its right side; the chain sags onto the floor
    o.br = (o.br || 0) - th; o.c1r = 0.05 * smooth((t - 0.15 - FALL - TIPS * 0.5) / 0.4); o.c2r = 0.08 * smooth((t - 0.15 - FALL - TIPS * 0.6) / 0.4);
    o.qsy = -0.04 * bump(t, 0.15 + FALL, 0.1); o.qsx = 0.03 * bump(t, 0.15 + FALL, 0.1); o.qsz = o.qsx;
    return o;
  },
};
export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), gather, spill, hurt, spawn, death };
for (const c of Object.values(CLIPS)) c.feet = () => ({});
