// The Vein Siphon's moves. Units are model units (the model is 1 tall to its crown; the page draws it CFG.unit = 1.6
// times bigger, so the sac's middle floats about 1.1 u up like the game's). Timings come from the game:
// src/sim/enemies/siphon.js (a 20 health flier drifting at 1.9 u/s, keeping 2.8 to 4.4 u off and circling; within 4.8 u
// it casts a tendril down an Ember lane 0.7 wide, through its target and 1 u past, up to 5.4 u, for 54 ticks; the first
// hero in the lane takes 5 and is latched: every 30 ticks for up to 3 s it drinks 2 and heals itself as much; the tether
// snaps past 5.6 u, on a stun, or when the hero falls; cooldown 300 ticks) and its rig src/render/enemies/facet/siphon.js
// (hovers bobbing 0.07 at 1.9 rad/s, breathing 0.05 at 2.4; pitches 0.14 into its drift and rolls to a strafe; each
// tendril segment sways 0.22 at 2.2 rad/s and rolls 0.18 at 1.7; the lash on the foe strike timeline, coil through the
// telegraph, strike 2.5 frames, held 3, snap 3, settle 9, rest 0.3 s, three variants: from its left, from its right, the
// plunge; drinking: the tendrils reach forward taut, the sac tilts 0.25 and gulps 0.18 over 0.3 s on every drain).
// The game's four tendrils are Kesh's six; his sac has no mouth.
import { V3, smooth, lerp, clamp, addPose } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
const TS = ['F', 'FL', 'L', 'B', 'R', 'FR'];
const ANG = { F: 0, FL: 1.25, L: 1.83, B: Math.PI, R: -1.83, FR: -1.25 };
export const CFG = {
  name: 'siphon', unit: 1.6, base: {}, floor: false,
  chain: [['hips', 'b'], ['sac', 's'], ['crown', 'c']],
  extras: TS.flatMap((k) => [1, 2, 3, 4].map((i) => [`t${k}${i}`, `${k}${i}`])),
  scales: [['sac', ['ssx', 'ssy', 'ssz']]],
  legs: {},
  springs: [],
};
const U = CFG.unit;
const HOV = 0.1 / U; // the pads hang 0.1 u off the floor at the hover's middle
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const none = () => ({});
// the loops: two bobs (the game's 1.9 rad/s, 3.3 s each); the sway's 2.2 and the roll's 1.7 rad/s rounded to two
// cycles, the breath's 2.4 to three, so the loop closes
const P = 3.3, LOOP = 2 * P, WB = TAU / P, WS = WB, WRo = WB, WBr = 3 * TAU / LOOP;

// --- the game's fields: lift, push (u), pitch (nose down +), roll (+ toward its right), twist (+ toward its left),
// sx / sy / sz (the sac's squash), draw (the tendrils drawn up and back), whip (flung forward), swing (to a side, + its
// left), tell (the veins' light); and the drink's reach and gulp. Signs: the game's segment pitch about +x swings a
// hanging segment back; here a plus p swings it forward, so p = -(the game's).
const REST = Object.freeze({ lift: 0, push: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, sz: 1, draw: 0, whip: 0, swing: 0, tell: 0, reach: 0, gulp: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
function siphon(t, g = REST, o = {}) {
  const bob = (0.07 * Math.sin(WB * t) + 0.08 * g.draw) * (o.bob ?? 1), breath = 0.05 * Math.sin(WBr * t);
  const sq = 1 + breath + 0.18 * g.gulp;
  const leanP = 0.14 * (o.move || 0), leanR = o.bank || 0;
  const p = { oy: (o.oy ?? HOV) + (g.lift + bob) / U, oz: g.push / U,
    bp: -(g.pitch + leanP + 0.25 * g.reach), by: g.twist, br: -(g.roll + leanR),
    ssx: g.sx * sq - 1, ssy: g.sy * sq - 1, ssz: g.sz * sq - 1, cp: 0.04 * Math.sin(WB * t + 1) };
  const limp = o.limp || 0;
  TS.forEach((k, ti) => { const a = ANG[k], front = Math.max(0, Math.cos(a));
    for (let j = 0; j < 4; j++) {
      const first = j === 0 ? 1 : j === 1 ? 0.55 : j === 2 ? 0.35 : 0.25;
      const sway = 0.22 * Math.sin(WS * t + a * 2 + j * 0.9) * (1 - g.reach) * (1 - limp);
      // the game's segment pitch (+ back): sway, drawn up and back, whipped forward, reaching forward
      let gp = -sway + 0.95 * g.draw * first - 1.1 * g.whip * first - 0.8 * g.reach * first * (0.6 + 0.4 * front);
      gp += (o.trail || 0) * first; // mine: trailing back in the drift
      const gr = 0.18 * Math.sin(WRo * t + a + j) * (1 - g.reach) * (1 - limp) + Math.sin(a) * 0.2 * g.draw + 0.5 * g.swing * first;
      // the tendrils hang from all round the sac: the side and back ones swing in their own plane so the draw and the
      // whip read the same from every root (the game's pitch is about the body's x for all four)
      const spl = (o.splay || 0) * (j === 0 ? 1 : -0.06); // splayed out flat round it, each along its own root's direction
      p[`${k}${j + 1}p`] = -gp + spl * Math.cos(a); p[`${k}${j + 1}r`] = gr + spl * Math.sin(a);
    } });
  return p;
}
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
export const TELL = (g, t) => Math.min(1, 0.35 + 0.1 * Math.sin(3 * t) + 0.55 * g.tell + 0.4 * g.reach + 0.3 * g.gulp);

// ------------------------------------------------------------------------------------------------ idle (hover)
const idle = { dur: LOOP, loop: true, pose: (t) => siphon(t), feet: none };
// ------------------------------------------------------------------------------------------------ drift and turns
// The game's 1.9 u/s, pitched 0.14 into it; mine: the tendrils trail back a little.
const walk = { dur: LOOP, loop: true, gait: { T: LOOP, duty: 0, v: 1.9 / U }, pose: (t) => siphon(t, REST, { move: 1, trail: 0.25 }), feet: none };
// The game turns it at once; mine: 270° a second, banked into the turn (the game's bank on a fast turn).
const turn = (dir) => ({
  dur: LOOP, loop: true, gait: { T: LOOP, duty: 0, v: 0, omega: dir * 1.5 * Math.PI, pivot: [0, 0] },
  pose: (t) => siphon(t, REST, { bank: -0.12 * dir, trail: 0.1 }), feet: none,
});

// ------------------------------------------------------------------------------------------------ the lashes
// The game's three lashes (its key poses), each on its own 54-tick lane: the coil runs through the telegraph (the
// tendrils drawn up and back, the sac contracted and tilted back, the veins brightening), the whip takes the last 2.5
// frames and lands on the resolve (the first hero in the lane takes 5), held 3 frames, snap 3, settle 9, rest 0.3 s.
const C1 = K({ lift: 0.08, push: -0.05, pitch: -0.2, roll: -0.15, twist: 0.2, sx: 0.9, sy: 1.1, sz: 0.92, draw: 1, swing: 0.5, tell: 1 });
const S1 = K({ lift: -0.06, push: 0.12, pitch: 0.35, roll: 0.1, twist: -0.12, sx: 1.12, sy: 0.9, sz: 1.12, whip: 1, swing: -0.3, tell: 0.7 });
const O1 = K({ lift: 0.0, push: 0.08, pitch: 0.2, roll: 0.05, twist: -0.08, sx: 1.02, sy: 0.98, sz: 1.02, whip: 0.5, swing: -0.15, tell: 0.3 });
const C2 = K({ lift: 0.08, push: -0.05, pitch: -0.2, roll: 0.15, twist: -0.2, sx: 0.9, sy: 1.1, sz: 0.92, draw: 1, swing: -0.5, tell: 1 });
const S2 = K({ lift: -0.06, push: 0.12, pitch: 0.35, roll: -0.1, twist: 0.12, sx: 1.12, sy: 0.9, sz: 1.12, whip: 1, swing: 0.3, tell: 0.7 });
const O2 = K({ lift: 0.0, push: 0.08, pitch: 0.2, roll: -0.05, twist: 0.08, sx: 1.02, sy: 0.98, sz: 1.02, whip: 0.5, swing: 0.15, tell: 0.3 });
const C3 = K({ lift: 0.12, push: -0.08, pitch: -0.32, sx: 0.86, sy: 1.16, sz: 0.9, draw: 1.2, tell: 1 });
const S3 = K({ lift: -0.12, push: 0.18, pitch: 0.5, sx: 1.16, sy: 0.86, sz: 1.2, whip: 1.2, tell: 1 });
const O3 = K({ lift: 0.02, push: 0.1, pitch: 0.25, sx: 1.03, sy: 0.98, sz: 1.03, whip: 0.55, tell: 0.35 });
const LASHES = [{ coil: C1, strike: S1, over: O1 }, { coil: C2, strike: S2, over: O2 }, { coil: C3, strike: S3, over: O3 }];
export const TEL = 54 / 60;
const STRIKE = 2.5 * FR, HOLD = 3 * FR, SNAP = 3 * FR, SETTLE = 9 * FR, RESTS = 0.3;
const COIL = TEL - STRIKE; export const ONE = COIL + STRIKE + HOLD + SNAP + SETTLE + RESTS;
const coilCurve = (k) => { const c = c01(k); return 0.85 * (1 - (1 - Math.min(1, c / 0.4)) ** 2) + 0.15 * c; };
const kick = (k) => { const c = c01(k); return 1 - (1 - c) ** 3; };
const settleC = (k) => { const c = c01(k); return smooth(c) - 0.12 * Math.sin(Math.PI * c) * (1 - c); };
function lashPose(V, t, end = REST) {
  if (t < COIL) return mix(REST, V.coil, coilCurve(t / COIL));
  let a = t - COIL; if (a < STRIKE) return mix(V.coil, V.strike, kick(a / STRIKE));
  a -= STRIKE; if (a < HOLD) return { ...V.strike };
  a -= HOLD; if (a < SNAP) return mix(V.strike, V.over, 1 - (1 - a / SNAP) ** 2);
  a -= SNAP; if (a < SETTLE) return mix(V.over, end, settleC(a / SETTLE));
  return { ...end };
}
export const LASH_AT = [TEL, ONE + TEL, 2 * ONE + TEL];
export const lashG = (t) => { const k = Math.min(2, Math.floor(t / ONE)); return lashPose(LASHES[k], t - k * ONE); };
const lash = {
  dur: 3 * ONE, contact: LASH_AT, feet: none,
  phases: [['1, from its left: the coil, the Ember lane marks', 0], ['the whip: 5 to the first hero in the lane', TEL], ['snaps back, settles', TEL + 0.15],
           ['2, from its right: the coil', ONE], ['the whip', ONE + TEL], ['settles', ONE + TEL + 0.15],
           ['3, the plunge: the coil', 2 * ONE], ['the whip', 2 * ONE + TEL], ['settles', 2 * ONE + TEL + 0.15]],
  pose: (t) => siphon(t, lashG(t)),
};

// ------------------------------------------------------------------------------------------------ the drink
// The plunge lands on the hero and latches: the tendrils reach forward taut and the sac tilts in (0.3 s); every 30
// ticks for 3 s it drinks 2 and heals as much, the sac gulping 0.18 over 0.3 s each time (six drinks); then the drink is
// full and it lets go (0.4 s), the tendrils falling back into the hover.
const LATCH = 0.3, DRAIN = 30 / 60, DRINKS = 6, LETGO = 0.4;
export const LATCH_AT = TEL; const DRINK0 = TEL + 0.1;
export const DRINK_AT = Array.from({ length: DRINKS }, (_, i) => DRINK0 + DRAIN * (i + 1));
export const LETGO_AT = DRINK0 + DRAIN * DRINKS + 0.15; export const DRINK_DUR = LETGO_AT + LETGO + 0.5;
const REACH = K({ push: 0.05, tell: 0.4, reach: 1 });
export const drinkG = (t) => {
  if (t < TEL + STRIKE + HOLD) return lashPose(LASHES[2], t);
  const a = t - TEL - STRIKE - HOLD;
  let reach = t < LETGO_AT ? smooth(a / LATCH) : 1 - smooth((t - LETGO_AT) / LETGO);
  const fromWhip = c01(a / LATCH);
  const base = mix(S3, REACH, smooth(fromWhip));
  const g = mix(REST, base, t < LETGO_AT ? 1 : reach);
  g.reach = reach;
  let gulp = 0; for (const d of DRINK_AT) { const u = t - d; if (u >= 0 && u < 0.3) gulp = Math.sin(u / 0.3 * Math.PI); }
  g.gulp = gulp; if (t >= LETGO_AT) { g.whip *= reach; }
  return g;
};
const drink = {
  dur: DRINK_DUR, contact: [TEL, ...DRINK_AT, LETGO_AT], feet: none,
  phases: [['the plunge: the coil, the Ember lane marks', 0], ['the whip lands: 5, and latched', TEL], ['drinking: 2 every 30 ticks, healing as much', TEL + 0.3], ['full: lets go', LETGO_AT], ['hovers', LETGO_AT + LETGO]],
  pose: (t) => siphon(t, drinkG(t)),
};

// ------------------------------------------------------------------------------------------------ hurt
// The sac flinches back and squeezes; the tendrils jerk up. Plays on top of anything.
const hurt = { dur: 0.4, upperOnly: true, feet: none,
  pose: (t) => { const k = c01(t / 0.05) * (1 - smooth((t - 0.05) / 0.35)); return siphon(t, K({ pitch: -0.25 * k, sx: 1 + 0.1 * k, sy: 1 - 0.12 * k, sz: 1 + 0.1 * k, draw: 0.5 * k, lift: 0.03 * k })); } };

// ------------------------------------------------------------------------------------------------ spawn
// The game's grow-in (7 frames, about 10% over); mine after: it unfurls its tendrils and rises into the hover.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = { dur: 1.2, contact: [0.5], scale: spawnScale, feet: none,
  phases: [['grows in', 0], ['unfurls, the veins lighting', 0.25], ['into the hover', 0.7]],
  pose: (t) => { const u = smooth((t - 0.2) / 0.6); return siphon(t, K({ draw: 0.9 * (1 - u), sy: 1 - 0.1 * (1 - u), tell: pulse(t, 0.3, 0.5, 0.6, 1.0) }), { oy: HOV - 0.06 * (1 - u) }); } };

// ------------------------------------------------------------------------------------------------ death
// Mine (the game's sac bursts where it hangs, raining what it drank). Struck, it shudders and its veins flare; it sags,
// the tendrils going limp, and drops; the sac slaps flat on the floor and the tendrils splay out round it.
const LOWT = 1 / 30;
const LOW = [0.021,0.026,0.024,0.024,0.025,0.025,0.022,0.019,0.017,0.016,0.013,0.010,0.003,-0.004,-0.009,-0.012,-0.016,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.019,-0.009,0.038,0.132,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183,0.183];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t / LOWT, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
export const LAND_AT = 0.95;
function deathPose(t, probe) {
  const hit = pulse(t, 0, 0.04, 0.1, 0.3), sag = smooth((t - 0.2) / 0.5), fall = c01((t - 0.55) / (LAND_AT - 0.55)) ** 2, land = pulse(t, LAND_AT, LAND_AT + 0.05, LAND_AT + 0.12, LAND_AT + 0.45), flat = smooth((t - LAND_AT) / 0.15);
  const g = K({ pitch: -0.2 * hit + 0.15 * sag, roll: 0.15 * sag, sx: 1 + 0.08 * hit + 0.18 * flat + 0.1 * land, sy: 1 - 0.1 * hit - 0.3 * flat - 0.12 * land, sz: 1 + 0.08 * hit + 0.18 * flat + 0.1 * land, tell: 0.8 * hit });
  const p = siphon(t, g, { limp: sag, splay: 1.4 * flat, bob: 1 - sag, oy: 0 });
  // the drop: from the hover to the floor, landing with its lowest point on it (LOW: the lowest point at oy 0, probed)
  p.oy = probe ? 0 : HOV * (1 - fall) - fall * lowAt(t);
  return p;
}
const death = { dur: 2.2, contact: [0.02, LAND_AT], feet: none,
  phases: [['struck: shudders, the veins flare', 0], ['sags, the tendrils go limp', 0.2], ['drops', 0.55], ['slaps flat, the tendrils splayed', LAND_AT], ['lies still', 1.4]],
  pose: (t) => deathPose(t, false) };
const probe = { dur: 2.2, feet: none, pose: (t) => deathPose(t, true) };
export const DEATH_G = (t) => ({ tell: 0.8 * pulse(t, 0, 0.04, 0.1, 0.3) });
export const CLIPS = process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), lash, drink, hurt, spawn, death };
