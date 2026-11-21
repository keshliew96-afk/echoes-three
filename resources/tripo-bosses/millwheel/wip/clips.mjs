// The Millwheel's moves. Units are model units (the wheel is 1 across; the page draws it 2.587 u across, CFG.unit, which puts its
// peg tips 1.29 u from the hub: the game's 1.3). It has no legs: it rolls on the corners of its twelve peg ends (kit/wheel.mjs),
// the corner on the floor is its locked foot, and the two bracket arms hang from the axle and swing as pendulums.
// Timings come from the game: MILLWHEEL in src/sim/bosses/millwheel.js (rim roll 2.4 u/s; Cog Shards: 48-tick cone, radius 6.0 u,
// 28 degrees either side, five shards 12 degrees apart at 5.5 u/s, replaced on 13 Nov by Kesh's Plank Spin; Crosscut: 66-tick lane 1.6 u wide, 9 u/s to the far wall,
// dizzy 75 ticks), the phases of render/boss/millwheelfacet.js and the beats in render/facet/beats.js.
import fs from 'fs';
import { track, smooth, lerp, clamp, EASE } from '../../kit/quad.mjs';
import { makeWheelRig } from '../../kit/wheel.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_, GATHER = 1.5 * FR_;
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const W = skel.wheel; const STEPA = 2 * Math.PI / W.pegs; const P = W.w + 2 * W.Rc * Math.sin(STEPA / 2 - W.delta * Math.PI / 180); // ground per peg
export const CFG = { name: 'millwheel', unit: 2.4 * (202 / 60) / (12 * P), makeRig: makeWheelRig, extras: [], scales: Array.from({ length: 12 }, (_, k) => ['peg' + k]), springs: [], arm: { len: 0.19, damp: 1.5, drag: 0.5, max: 2.4 } };
const U = CFG.unit;
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const decay = (t, t0, k) => (t < t0 ? 0 : Math.exp(-k * (t - t0)));
const Z = { s: 0, tilt: 0, yaw: 0, pre: 0, hop: 0, x: 0, rest: 0, aL: 0, aR: 0, bk: 0, bL: 0, bR: 0 };

// ------------------------------------------------------------------------------------------------ idle
// It never quite stands still: it rocks on the flat of one peg, creaks, rolls forward one peg and back (restless), and shimmies.
const roamAt = (t) => P * pulse(t, 2.3, 2.9, 3.5, 4.2);
const idle = {
  dur: 6, loop: true, travel: roamAt, pageTravel: true, // the page moves the floor under the restless roll, so the wheel stays in the middle
  pose: (t) => {
    const w = 2 * Math.PI * t / 6;
    const roam = roamAt(t);
    const shim = pulse(t, 4.7, 4.85, 5.2, 5.5);
    return { ...Z, s: 0.006 * Math.sin(2 * w) + roam + 0.004 * Math.sin(5 * w) * (1 - shim), tilt: 0.012 * Math.sin(w + 0.4) + 0.008 * Math.sin(3 * w) + 0.04 * Math.sin(30 * (t - 4.7)) * shim,
      yaw: 0.02 * Math.sin(w) + 0.05 * Math.sin(21 * (t - 4.7)) * shim, aL: 0.05 * Math.sin(2 * w + 1), aR: 0.05 * Math.sin(2 * w + 2.2) };
  },
};

// ------------------------------------------------------------------------------------------------ roll (walk)
// One whole turn of the wheel: twelve pegs at the game's 2.4 u/s. It surges a little over each peg and wobbles from side to side.
const WT = 202 / 60, V = 12 * P / WT;
const walk = {
  dur: WT, loop: true, travel: (t) => V * t, gait: { v: V },
  pose: (t) => { const w = 2 * Math.PI * t / WT; return { ...Z, s: V * t - 0.004 * Math.sin(12 * w), tilt: 0.022 * Math.sin(2 * w + 0.3) + 0.01 * Math.sin(6 * w), yaw: 0.012 * Math.sin(2 * w + 1.4) }; },
};
// A wheel turns by leaning: it tips toward the inside of the turn, rocks from the back corner of its peg to the front, and the page
// swings the floor round under the peg it stands on.
const TT = 0.9;
const turn = (dir) => ({
  dur: TT, loop: true,
  pose: (t) => { const w = 2 * Math.PI * t / TT; return { ...Z, s: 0.012 * Math.sin(2 * w), tilt: -0.11 * dir + 0.02 * Math.sin(2 * w + 0.6), yaw: 0.03 * dir * Math.sin(2 * w), aL: 0.1 * Math.sin(2 * w + 1), aR: 0.1 * Math.sin(2 * w + 2.4) }; },
});

// Coming to rest out of a roll. It arrives on the flat of a peg still moving at the roll's speed, rocks on over the front corner of
// that peg (a fifth of the way to the next), falls back onto the flat with a clunk, and rocks once more, smaller. The page plays it
// when Idle is picked during a roll.
const HK = 4.5, HW = 8.5;
const halt = {
  dur: 0.7, contact: [Math.PI / HW], kinds: ['clunk'], phases: [['rocks on', 0], ['falls back', 0.127], ['still', Math.PI / HW]],
  pose: (t) => ({ ...Z, s: (V / HW) * Math.exp(-HK * t) * Math.sin(HW * t) * (1 - smooth((t - 0.5) / 0.2)), tilt: 0.02 * Math.sin(14 * t) * Math.exp(-4 * t), yaw: 0.012 * Math.sin(9 * t) * Math.exp(-4 * t) }),
};

// ------------------------------------------------------------------------------------------------ Plank Spin (Kesh, 13 Nov)
// In place of Cog Shards. hop (it rocks, jumps and turns onto its side in the air), down (it lands flat on its axle stub, leaning on
// its rim), spin up (it grinds round, faster, and rises level like a top), throw (from the old 48-tick warning on, the twelve planks
// fly off one at a time, in a shuffled order), spin down, spent (it lies still on its rim while each plank spins 4 s where it
// landed), return (Kesh, 14 Nov: each plank flies back down an Ember path, hitting anyone on it, and snaps into its socket; the
// wheel jolts at every snap), up (it kicks itself upright in the air and lands on a peg), settle. The spin is two whole turns, so it stands up facing the way it lay down.
const LIE0 = Math.PI / 2 - 0.2; // lying still it leans on its stub and its rim; spinning it rises level
const PS = { jump: 0.2, down: 0.5, warn: 48 / 60, gap: 0.078, slow: 1.75, still: 2.3 };
PS.full = PS.warn + 0.1; PS.last = PS.warn + 11 * PS.gap;
const ORDER = Array.from({ length: 12 }, (_, j) => (j * 7) % 12); // the order the planks leave in
const THROW = new Array(12); ORDER.forEach((k, j) => (THROW[k] = +(PS.warn + j * PS.gap).toFixed(3)));
const FLY = 0.42, LIFE = 4.0, PATH = 0.5, SNAPT = 0.12; // a plank's flight out and back, its spin on the floor, the path warning before it flies back
const BACK = THROW.map((t) => +(t + FLY + LIFE).toFixed(3)), RET = BACK.map((t) => +(t + FLY).toFixed(3)); // it lifts off the floor; it snaps home
PS.kick = Math.round((Math.max(...RET) + 0.25) * 60) / 60; PS.land = PS.kick + 0.32; PS.end = Math.round((PS.land + 0.6) * 60) / 60;
const spinRate = (t) => smooth((t - PS.down) / (PS.full - PS.down)) * (1 - smooth((t - PS.slow) / (PS.still - PS.slow))); // 0..1
const SPIN = (() => { const a = [0]; const n = Math.round(PS.end * 600); for (let i = 1; i <= n; i++) a.push(a[i - 1] + (spinRate((i - 0.5) / 600)) / 600); const k = 4 * Math.PI / a[n]; return { at: (t) => { const f = clamp(t / PS.end) * n, i = Math.min(n - 1, Math.floor(f)); return k * (a[i] + (a[i + 1] - a[i]) * (f - i)); }, max: k }; })();
export const PLANKS = { order: ORDER, max: SPIN.max, flight: FLY, near: 2.0, far: 5.4, life: LIFE, path: PATH, ring: 0.55, stretch: 1.8 };
const planks = {
  dur: PS.end, contact: [PS.down, PS.land], kinds: ['flat', 'clunk'], cues: { warn: [PS.down, PS.warn], spin: [PS.down, PS.still], throw: THROW, yaw: THROW.map((t) => +SPIN.at(t).toFixed(4)), path: BACK.map((t) => +(t - PATH).toFixed(3)), back: BACK, ret: RET, kick: [PS.kick] }, // yaw: how far it has spun when each plank leaves
  phases: [['hop', 0], ['down', PS.down], ['spin up', PS.down + STRIKE], ['throw', PS.warn], ['spin down', PS.slow], ['spent', PS.still], ['planks fly back', Math.min(...BACK) - PATH], ['up', PS.kick], ['settle', PS.land]],
  pose: (t) => {
    const pg = THROW.map((th, k) => (t < th ? 1 : t < RET[k] ? 0 : (() => { const u = clamp((t - RET[k]) / SNAPT); return 1 - Math.pow(1 - u, 3) + 0.25 * Math.sin(Math.PI * u) * (1 - u); })()));
    const jolt = RET.reduce((a, r) => a + (t > r && t < r + 0.5 ? 0.022 * Math.exp(-10 * (t - r)) * Math.sin(22 * (t - r)) : 0), 0); // each plank's snap knocks the lying wheel
    if (t < PS.jump) { const u = t / PS.jump; return { ...Z, s: -0.22 * P * Math.sin(Math.PI * u), tilt: 0.03 * Math.sin(Math.PI * u), aL: 0.6 * u, aR: 0.6 * u, pg }; }
    if (t > PS.land) { const q = t - PS.land, out = 1 - smooth((q - 0.36) / 0.24); return { ...Z, s: 0.16 * P * Math.exp(-5 * q) * Math.sin(10 * q) * out, tilt: 0.05 * Math.exp(-5 * q) * Math.sin(13 * q) * out, yaw: 0.03 * Math.exp(-4 * q) * Math.sin(7 * q) * out, pg }; }
    const w = spinRate(t), lean = 0.2 * Math.pow(1 - w, 1.5) + 0.03 * w + 0.012 * w * Math.sin(23 * t);
    let tilt = Math.PI / 2 - lean, hop = 0, rest = 1, bk = 1, up = 0;
    if (t < PS.down) { const u = (t - PS.jump) / (PS.down - PS.jump); hop = 0.2 * Math.sin(Math.PI * u); tilt = LIE0 * smooth(u * 1.08); rest = smooth((u - 0.5) / 0.5); bk = smooth(u * 1.5); up = 0.6 * (1 - smooth(u * 2.5)); }
    else if (t > PS.kick) { const u = (t - PS.kick) / (PS.land - PS.kick); hop = 0.19 * Math.sin(Math.PI * u); tilt = LIE0 * (1 - smooth(u * 1.05)); rest = 1 - smooth(u / 0.5); bk = 1 - smooth((u - 0.4) / 0.6); }
    else if (t > PS.still) tilt = LIE0 - jolt - (t > PS.kick - 0.3 ? 0.05 * Math.sin(Math.PI * (t - PS.kick + 0.3) / 0.3) : 0); // jolted by each plank coming home; it presses down on its rim before the kick
    const fling = 0.7 * w; // the brackets are thrown out behind the spin
    return { ...Z, th: 0, s: 0, tilt, yaw: SPIN.at(t), hop, rest, bk, bL: 0.5 + fling, bR: Math.PI - 0.4 + fling, aL: up, aR: up, pg };
  },
};

// ------------------------------------------------------------------------------------------------ Crosscut
// rock (the 66-tick lane less one strike: it rocks back and forward and back, winding), burst (2.5 frames), cut (0.6 s at 9 u/s: it
// really rolls, eight pegs), slam (2.5 frames: it hits the wall, jumps and tips), slammed (3 frames), dizzy (75 ticks less those:
// it teeters like a dropped coin), settle (0.45 s).
const CUT_D = 8 * P, CUT_T = CUT_D * U / 9;
const CC = { rock: 66 / 60 - STRIKE, go: 66 / 60 }; CC.wall = CC.go + CUT_T; CC.slam = CC.wall + STRIKE; CC.held = CC.slam + HOLD; CC.dizzy = CC.held + 75 / 60 - STRIKE - HOLD; CC.end = CC.dizzy + 0.45;
export const CROSSCUT = { hero: 3.2, reach: 1.29 }; // the hero stands 3.2 u away; the rim gets there first
const ccTravel = (t) => CUT_D * clamp((t - CC.go) / CUT_T);
const crosscut = {
  dur: CC.end, travel: ccTravel, contact: [CC.go + (CROSSCUT.hero - CROSSCUT.reach - 0.15) / 9, CC.wall], kinds: ['cut', 'slam'], cues: { lane: [0, CC.go], go: [CC.go], wall: [CC.wall], dizzy: [CC.held, CC.dizzy] },
  phases: [['rock', 0], ['burst', CC.rock], ['cut', CC.go], ['slam', CC.wall], ['slammed', CC.slam], ['dizzy', CC.held], ['settle', CC.dizzy]],
  pose: (t) => {
    const k = track([[0, { s: 0, tilt: 0 }], [0.3, { s: -0.3 * P, tilt: 0.02 }], [0.56, { s: 0.12 * P, tilt: -0.015 }], [0.86, { s: -0.42 * P, tilt: 0.03 }], [CC.rock, { s: -0.46 * P, tilt: 0.034 }], [CC.go, { s: 0, tilt: 0 }, 'in'],
      [CC.wall, { s: 0, tilt: 0 }], [CC.slam, { s: -0.3 * P, tilt: 0.12 }, 'out'], [CC.held, { s: -0.34 * P, tilt: 0.13 }], [CC.held + 0.3, { s: -0.1 * P, tilt: 0 }], [CC.dizzy, { s: -0.04 * P, tilt: 0 }], [CC.end, { s: 0, tilt: 0 }]])(t);
    const tr = Math.sin(64 * t) * pulse(t, 0.8, 0.9, CC.rock - 0.02, CC.rock);
    const hop = 0.085 * Math.sin(Math.PI * clamp((t - CC.wall) / 0.22)) * (t > CC.wall && t < CC.wall + 0.22 ? 1 : 0);
    const dz = pulse(t, CC.held, CC.held + 0.12, CC.dizzy - 0.25, CC.dizzy + 0.2), td = t - CC.held; // the teeter: a lean that swings round and dies away
    const cutK = pulse(t, CC.go, CC.go + 0.05, CC.wall - 0.02, CC.wall);
    return { ...Z, s: ccTravel(t) + k.s + 0.003 * tr, tilt: k.tilt + 0.012 * tr + 0.1 * dz * Math.exp(-1.1 * td) * Math.cos(9 * td) + 0.02 * cutK * Math.sin(40 * t), hop,
      pre: 0, yaw: 0.012 * tr + 0.16 * dz * Math.exp(-0.9 * td) * Math.sin(5.2 * td), aL: 0.4 * pulse(t, 0.6, 0.9, CC.rock, CC.go), aR: 0.4 * pulse(t, 0.64, 0.92, CC.rock, CC.go) };
  },
};

// ------------------------------------------------------------------------------------------------ hurt, heavy hit
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => ({ ...Z, s: -0.05 * P * pulse(t, 0, 0.05, 0.12, 0.36), tilt: 0.1 * pulse(t, 0, 0.04, 0.08, 0.2) - 0.035 * pulse(t, 0.14, 0.22, 0.26, 0.4), yaw: -0.05 * pulse(t, 0, 0.05, 0.14, 0.4), aL: 0.5 * pulse(t, 0, 0.05, 0.1, 0.4), aR: -0.4 * pulse(t, 0, 0.05, 0.1, 0.4) }),
};
// Thrown back a whole peg (0.67 u: the game's 0.3 u would leave it standing between two pegs), teetering as it goes.
const HB = -P;
const heavyHit = {
  dur: 1.1, contact: [0], kinds: ['taken'], travel: (t) => HB * EASE.out(clamp(t / 0.34)), phases: [['hit', 0], ['thrown back', 0.07], ['teeter', 0.34], ['square up', 0.72]],
  pose: (t) => ({ ...Z, s: HB * EASE.out(clamp(t / 0.34)) + 0.06 * P * Math.sin(9 * (t - 0.34)) * decay(t, 0.34, 4.5), tilt: 0.13 * Math.cos(10 * t) * Math.exp(-3.2 * t) * smooth(t / 0.05), yaw: 0.14 * Math.sin(6 * t) * Math.exp(-2.6 * t),
    aL: 0.3 * pulse(t, 0, 0.06, 0.2, 0.6), aR: -0.3 * pulse(t, 0, 0.06, 0.2, 0.6) }),
};

// ------------------------------------------------------------------------------------------------ spawn
// Grows from the floor in 7 frames (the game), drops onto its peg with two clunks, rocks and settles.
const spawn = {
  dur: 1.5, scale: (t) => 0.05 + 0.95 * EASE.out(clamp(t / (7 / 60))), contact: [0.2, 0.52], kinds: ['clunk', 'clunk'], phases: [['grow', 0], ['settle', 7 / 60], ['stand', 0.9]],
  pose: (t) => ({ ...Z, s: 0.3 * P * Math.cos(7.5 * t) * Math.exp(-3.4 * t), tilt: 0.09 * Math.sin(11 * t) * Math.exp(-3.6 * t), yaw: 0.06 * Math.sin(5 * t) * Math.exp(-3 * t),
    hop: 0.03 * Math.sin(Math.PI * clamp((t - 0.2) / 0.16)) * (t > 0.2 && t < 0.36 ? 1 : 0) }),
};

// ------------------------------------------------------------------------------------------------ death
// The turn goes out of it. It teeters, tips over onto its side, and rings round on its rim like a dropped lid, lower and faster,
// until it lies still, propped on the end of its axle and the edge of its rim.
const DT = { tip: 0.5, down: 1.25, flat: 2.3 };
const LIE = Math.PI / 2 - 0.2; // it cannot lie flat: the axle stub holds the hub off the floor, so it comes to rest leaning on stub and rim
const death = {
  dur: 2.8, contact: [DT.down, DT.flat], kinds: ['thud', 'thud'], phases: [['hit', 0], ['teeter', 0.1], ['falls', DT.tip], ['rings round', DT.down], ['still', DT.flat]],
  pose: (t) => {
    const fall = smooth((t - DT.tip) / (DT.down - DT.tip)); const ring = clamp((t - DT.down) / (DT.flat - DT.down));
    const lean = 0.09 * Math.sin(13 * t) * (1 - fall) * smooth(t / 0.08) + lerp(0, 1.2, fall * fall) + (LIE - 1.2) * smooth(ring) + 0.06 * Math.sin(Math.PI * ring) * Math.cos(26 * ring * ring);
    const down = smooth((t - DT.tip - 0.1) / 0.5);
    return { ...Z, s: -0.1 * P * smooth(t / 0.4), tilt: lean, pre: 7.5 * ring * ring * (1 - 0.45 * ring), rest: smooth((t - DT.tip) / 0.12), yaw: 0.08 * Math.sin(5 * t) * (1 - fall),
      bk: smooth((t - DT.down + 0.1) / 0.5), bL: 0.5, bR: Math.PI - 0.4 };
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), halt, planks, crosscut, hurt, heavyHit, spawn, death };
