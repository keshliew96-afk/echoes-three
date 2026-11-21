// The Gravewisp's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/gravewisp.js (a 12 hp flier with no attack; it tethers the nearest
// other foe within 5.5 u and, while the tether holds, that foe takes no damage; the tether lasts 240 ticks, snaps past
// 6.5 u, and it needs 150 ticks to gather a new one; it drifts at 2.3 u/s 1.6 u behind its ward and flees a hero
// inside 2.2 u) and its rig buildGravewispFacet in src/render/enemies/facet/gravewisp.js (hovers at 1.0 u bobbing
// 0.08 at 2.2 rad/s; pitches 0.14 into its travel; the tail streams back 0.5 and swishes 0.25 at 3.1 rad/s; the
// sleeves sway at 2.7 rad/s; the indigo core swells 1 + 0.6 core; the ward: gathers 1 frame, casts 2.5 frames, holds
// the ward pose while the tether lasts; the snap: 3 frames to its recoil pose, back over 0.25 s). The tether beam and
// the lantern's glow are the page's. The model's lantern is the game's core.
import { V3, smooth, lerp, clamp, addPose, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'gravewisp', unit: 1.05, base: {}, floor: false,
  chain: [['hips', 'b'], ['sq', 'q'], ['chest', 'c'], ['head', 'h']],
  extras: [['flame', 'f'], ['lamp', 'l'], ['t1', 'k1'], ['t2', 'k2'], ['t3', 'k3'], ['armL', 'aL'], ['armR', 'aR']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']]],
  legs: {},
  springs: [],
};
const U = CFG.unit;
const HOV = 0.35 / U; // the tail tip floats 0.35 u up: the game's hood centre sits at 1.0 u, its tail hangs to 0.35
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const none = () => ({});
// The loops: the bob's 2.2 rad/s is a 2.86 s cycle, rounded to 86 frames; the tail's 3.1 and the sleeves' 2.7 rad/s
// rounded to whole cycles in two bobs (3 each, 3.29 rad/s), the core's 5 rad/s flicker to 5 (5.48 rad/s)
const P = 86 / 30, WB = TAU / P, WT = 3 * TAU / (2 * P), WC = 5 * TAU / (2 * P);

// --- the game's fields on this rig: push, lift (u), pitch, sx, sy, core, hood, arms, tail; move (0..1, the drift).
// Signs: the game's +x pitch (tips forward) is a minus pitch here; on the hanging tail and lantern a plus pitch swings
// them forward. The game's sleeves spread side * (0.35 + 0.9 arms + 0.25 hood); the model's arms already stand out
// that far, so only the extra is added. Mine: the lantern hangs plumb against the body's tip and trails the drift;
// the hood field nods the head. The lantern never swings back past its rest: it would pass into the chest.
const REST = { push: 0, lift: 0, pitch: 0, sx: 1, sy: 1, core: 0, hood: 0, arms: 0, tail: 0 };
function wisp(t, f = REST, o = {}) {
  const move = o.move || 0, bobOn = o.bob ?? 1;
  const bob = 0.08 * Math.sin(WB * t) * bobOn;
  const pitch = f.pitch + 0.14 * move;
  const tsw = 0.25 * Math.sin(WT * t) + f.tail;
  const spread = 0.9 * f.arms + 0.25 * f.hood;
  const sway = (i) => 0.1 * Math.sin(WT * t + i);
  const out = {
    oy: (o.oy ?? HOV) + (f.lift + bob) / U, oz: f.push / U,
    bp: -pitch, cp: -0.15 * f.hood * 0.5, hp: -0.15 * f.hood, hr: 0.04 * Math.sin(WB * t + 1) * bobOn,
    fp: -0.08 * move + 0.06 * Math.sin(WT * t + 0.7), fr: 0.08 * Math.sin(WT * t + 1.9),
    qsx: f.sx - 1, qsy: f.sy - 1, qsz: f.sx - 1,
    lp: Math.max(-0.02, 0.6 * pitch - 0.15 * move + 0.05 * Math.sin(WB * t + 0.8) * bobOn + 0.15 * f.hood * 0.5), lr: 0.04 * Math.sin(WT * t + 0.3),
    // the tail: the game's one cone rotates 0.5 back on the drift and swishes on z; here it bends down its three bones
    k1p: -0.15 * move, k2p: -0.2 * move, k3p: -0.25 * move,
    k1r: 0.3 * tsw, k2r: 0.4 * tsw, k3r: 0.5 * tsw,
    aLr: 0.6 * spread, aRr: -0.6 * spread, aLp: sway(0), aRp: sway(2.1),
  };
  return out;
}
const lerpF = (a, b, k) => { const o = {}; for (const key in REST) o[key] = lerp(a[key] ?? REST[key], b[key] ?? REST[key], k); return o; };
const K = (o) => ({ ...REST, ...o });
const GATHER = K({ push: -0.05, lift: 0.03, pitch: -0.12, sx: 0.9, sy: 1.1, core: 0.5, hood: -1, arms: -0.2, tail: 0.3 });
const CAST = K({ push: 0.16, lift: -0.04, pitch: 0.22, sx: 1.16, sy: 0.9, core: 1.3, hood: 1, arms: 1, tail: -0.5 });
const WARD = K({ push: 0.05, lift: 0.01, pitch: 0.06, sx: 1.04, sy: 1, core: 1, hood: 0.6, arms: 0.5 });
const SNAP = K({ push: -0.1, lift: 0.05, pitch: -0.2, sx: 0.92, sy: 1.08, core: 0, hood: -0.6, arms: -0.3, tail: 0.6 });
const eIn = (k) => k * k, eOut = (k) => 1 - (1 - k) * (1 - k), eInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
// core for the page (the lantern's glow): the game's 1 + 0.6 core swell and its 5 rad/s flicker
export const coreAt = (f, t) => f.core + 0.1 * Math.sin(WC * t);

// ------------------------------------------------------------------------------------------------ idle (hover)
// Two bobs. The game's hover, tail swish and sleeve sway. Mine on top: it looks one way, then the other.
const idle = {
  dur: 2 * P, loop: true,
  pose: (t) => { const look = 0.3 * pulse(t, 0.8, 1.2, 2.0, 2.4) - 0.25 * pulse(t, 3.4, 3.8, 4.6, 5.0); return addPose(wisp(t), { hy: look, cy: 0.3 * look, hr: -0.1 * look }); },
  feet: none,
};
const walk = { dur: 2 * P, loop: true, gait: { T: 2 * P, duty: 0, v: 2.3 / U }, pose: (t) => wisp(t, REST, { move: 1 }), feet: none };
// The game turns it to face its ward at once; mine: 270 degrees a second, banking into the turn (the game's -0.2 roll
// on a fast turn) with the tail swinging wide.
const turn = (dir) => ({
  dur: 2 * P, loop: true, gait: { T: 2 * P, duty: 0, v: 0, omega: dir * 1.5 * Math.PI, pivot: [0, 0] },
  pose: (t) => addPose(wisp(t, REST, { move: 0.3 }), { br: -0.15 * dir, hy: 0.15 * dir, k1y: -0.15 * dir, k2y: -0.2 * dir, k3y: -0.25 * dir, ly: -0.1 * dir }),
  feet: none,
});

// ------------------------------------------------------------------------------------------------ ward and snap
// The game's whole cycle. It gathers (1 frame), casts (2.5 frames; the tether lands at the cast's start) and holds the
// ward pose for the tether's 240 ticks while its ward takes no damage; then the tether fades and snaps (3 frames to the
// recoil pose, back over 0.25 s) and it drifts. The page draws the indigo tether to a stand-in foe.
const GA = FR, CA = 2.5 * FR, HOLD = 240 / 60, SN = 3 * FR, REC = 0.25;
export const CAST_AT = GA, SNAP_AT = HOLD;
export const WARD_DUR = HOLD + SN + REC + 0.4;
export function wardF(t) {
  if (t < GA) return lerpF(REST, GATHER, eIn(t / GA));
  if (t < GA + CA) return lerpF(GATHER, CAST, eOut((t - GA) / CA));
  if (t < HOLD) return lerpF(CAST, WARD, eOut(Math.min(1, (t - GA - CA) / 0.8 * 3)));
  if (t < HOLD + SN) return lerpF(WARD, SNAP, eOut((t - HOLD) / SN));
  if (t < HOLD + SN + REC) return lerpF(SNAP, REST, eInOut((t - HOLD - SN) / REC));
  return REST;
}
const ward = {
  dur: WARD_DUR, contact: [CAST_AT, SNAP_AT],
  phases: [['gathers', 0], ['casts: the tether lands', GA], ['warding: its foe takes no damage', GA + CA], ['the tether snaps', HOLD], ['recoils', HOLD + SN], ['drifts', HOLD + SN + REC]],
  pose: (t) => {
    const f = wardF(t);
    // mine: the lantern swings up toward the ward on the cast and settles; on the snap it flies forward as the body jerks back
    const sw = 0.35 * pulse(t, GA, GA + CA, 0.35, 0.9) + 0.12 * smooth((t - 0.5) / 0.4) * (1 - smooth((t - HOLD) / SN)) + 0.3 * pulse(t, HOLD, HOLD + SN, HOLD + SN + 0.05, HOLD + SN + REC);
    return addPose(wisp(t, f), { lp: sw });
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ hurt
// Plays on top. The game's reaction squashes, flinches and knocks it back; here the body jolts back, the head snaps
// up, the lantern swings and the tail whips.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => {
    const k = track([[0, { p: 0 }], [0.05, { p: 1 }, 'out'], [0.17, { p: -0.25 }], [0.4, { p: 0 }]])(t).p;
    return { oz: -0.05 * k / U, bp: 0.3 * k, hp: 0.3 * k, lp: 0.4 * Math.max(0, k), k1p: 0.25 * k, k2p: 0.3 * k, k3p: 0.4 * k, aLr: 0.4 * k, aRr: -0.4 * k,
      qsx: 0.06 * k, qsy: -0.06 * k, qsz: 0.06 * k };
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows in over 7 frames, about 10% over. Mine on top: it rises out of the floor, unfurling its
// tail, and settles into the hover.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.2, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['rises', 7 * FR], ['hovers', 0.9]],
  pose: (t) => {
    const up = smooth((t - 0.1) / 0.7);
    const o = wisp(t, REST, { oy: lerp(0.05 / U, HOV, up), bob: up });
    return addPose(o, { k1p: 0.4 * (1 - up), k2p: 0.6 * (1 - up), k3p: 0.8 * (1 - up), qsy: -0.1 * (1 - up), qsx: 0.06 * (1 - up), qsz: 0.06 * (1 - up), hp: -0.2 * pulse(t, 0.5, 0.75, 0.85, 1.15) });
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe where it is, a 1.2 swell). Struck, it shudders and the flame gutters; the hover gives
// out and it sinks to the floor, toppling onto its side; the lantern clunks down beside it and the tail curls.
const FALLT = 0.7;
const LOW = [0.000,0.036,0.039,0.039,0.035,0.027,0.018,0.008,0.001,-0.002,-0.002,-0.001,0.002,0.007,0.015,0.025,0.038,0.053,0.068,0.085,0.101,0.117,0.131,0.144,0.154,0.162,0.167,0.169,0.169,0.169,0.169,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170,0.170];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t * 30, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
function deathBody(t) {
  const hit = pulse(t, 0, 0.04, 0.1, 0.3), k = c01((t - 0.2) / FALLT), land = smooth((t - 0.2 - FALLT) / 0.25), kk = smooth(k);
  const shud = 0.06 * Math.sin(40 * t) * pulse(t, 0, 0.05, 0.2, 0.35);
  const o = wisp(0, REST, { bob: 0 });
  o.oy = 0; o.oz = 0;
  return addPose(o, {
    bp: 0.25 * hit, br: 1.45 * kk + shud, hp: 0.3 * hit - 0.3 * kk, hr: 0.25 * kk, fp: -0.4 * kk, fr: -0.4 * kk,
    lp: 0.2 * hit, lr: -1.2 * kk, k1r: -0.3 * kk, k2r: -0.5 * kk, k3r: -0.7 * kk, k1p: 0.2 * kk, k2p: 0.35 * kk, k3p: 0.5 * kk,
    aLr: 0.4 * hit - 0.2 * kk, aRr: -0.4 * hit - 0.5 * kk, aLp: 0.3 * kk, aRp: 0.3 * kk,
    qsx: 0.06 * hit, qsy: -0.08 * hit - 0.05 * land, qsz: 0.06 * hit,
  });
}
const death = {
  dur: 2.0, contact: [0.2 + FALLT],
  phases: [['struck: shudders, the flame gutters', 0], ['sinks and topples', 0.2], ['lands on its side', 0.2 + FALLT], ['lies still', 0.2 + FALLT + 0.3]],
  pose: (t) => {
    const o = deathBody(t);
    if (process.env.PROBE) return o;
    const k = c01((t - 0.15) / FALLT), fall = HOV - (HOV + 0.3) * k * k;
    o.oy = Math.max(fall, -lowAt(t)) + 0.012 * bump(t, 0.2 + FALLT + 0.06, 0.12);
    return o;
  },
  feet: none,
};
export const CLIPS = process.env.PROBE ? { death } : { idle, walk, turnL: turn(1), turnR: turn(-1), ward, hurt, spawn, death };
