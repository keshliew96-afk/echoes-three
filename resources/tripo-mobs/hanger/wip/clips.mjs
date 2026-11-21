// The Rope Hanger's moves. Units are model units (the model is 1 tall; the page draws it CFG.unit = 2.0 u tall, the game's
// lanky height: its rig stands about 2.07 u). Timings come from the game: src/sim/enemies/hanger.js (creeps at 1.25 u/s
// keeping 3 to 6 u off; grips the rope and leans back while an Ember lane 1.1 u wide and up to 8.5 u long fills for 66
// ticks; swings down it at 10 u/s on the rope, striking every hero it passes once for 8 and throwing them 2 u aside;
// dangles slack and turning for 45 ticks; cooldown 280 ticks) and its rig buildHanger in src/render/enemies/spire.js (both
// hands up on a belfry rope that rises 6 u out of frame; hunched 0.42 creeping with the neck hanging 0.55; braced and
// leaning back 0.4 on the grip, the rope leaning 0.32 ahead; on the swing the body pendulums about the hips from 0.75
// forward to 0.4 back, lifted 0.12 + 0.38 sin, the legs trailing 0.55 + 0.25 sin; dangling it turns 0.9 sin on the rope
// with the head hanging 0.7). The rope and the lane are the page's.
import * as THREE from 'three';
import fs from 'fs';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose } from '../kit/quad.mjs';
const SK = JSON.parse(fs.readFileSync(new URL('./rig/skel.json', import.meta.url)));
const P0 = Object.fromEntries(SK.names.map((n, i) => [n, V3(...SK.pos[i])]));
const END = Object.fromEntries(Object.entries(SK.ends).map(([k, v]) => [k, V3(...v)]));
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'hanger', unit: 2.0,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['clvL', 'kL'], ['clvR', 'kR'], ['armL', 'aL'], ['armR', 'aR'], ['foreL', 'fL'], ['foreR', 'fR'], ['handL', 'wL'], ['handR', 'wR'], ['fingL', 'gL'], ['fingR', 'gR']],
  hang: [['tas', 0.95, 0.004]],
  legs: {
    HL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'], pole: [0, 0, 1] }, HR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'], pole: [0, 0, 1] },
  },
  springs: [],
};
const U = CFG.unit;
const SG = { L: 1, R: -1, HL: 1, HR: -1 };
const REST = { HL: END.toeL.clone(), HR: END.toeR.clone() };
const plant = (p) => ({ p: p.clone(), lock: true });
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
// The belfry rope: the game's hangs from both hands raised over the head. Your model's arms hang at its sides, fused
// into the coat (lifted, they tear it), and its rope is slung round its chest, so here the belfry rope rises from the
// knot on its right shoulder (ROPE, on the chest bone) and it hangs from that. The page draws the rope.
export const ROPE = [-0.062, 0.805, 0.005];
// --- the arms: they hang at the sides and only ever move a little. sway (creep), out (braced on the grip), trail (the
// swing drags them back), dangle (hanging limp, swinging). A plus pitch swings a hanging arm forward; a plus roll lifts
// the left arm out (the right's is negated).
function arms(o = {}) {
  const out = {};
  for (const [s, sg, ph] of [['L', 1, 0], ['R', -1, Math.PI]]) {
    const sw = (o.sway || 0) * Math.sin((o.w || 0) + ph), tr = o.trail || 0, dg = o.dangle || 0, br = o.out || 0;
    out['a' + s + 'p'] = 0.18 * sw - 0.35 * tr + 0.12 * dg * Math.sin((o.t || 0) * 2.6 + ph) - 0.15 * br;
    out['a' + s + 'r'] = sg * (0.05 * dg + 0.12 * br + 0.06 * tr);
    out['f' + s + 'p'] = 0.12 * Math.max(0, sw) + 0.15 * tr + 0.1 * dg + 0.1 * br;
    out['w' + s + 'p'] = 0.1 * sw + 0.15 * tr + 0.15 * dg;
    out['g' + s + 'p'] = 0.2 * br + 0.1 * tr;
  }
  return out;
}
const legsPlanted = (o = {}, tz = 0) => ({ HL: plant(REST.HL.clone().add(V3(0, 0, (o.zl || 0) + tz))), HR: plant(REST.HR.clone().add(V3(0, 0, (o.zr || 0) + tz))) });
const KNEE = { oy: -0.006 };
function clip(c) {
  const pose = (t) => addPose(KNEE, c.pose(t));
  return { ...c, pose, feet: (t, W) => (c.legs ? c.legs(t, W) : legsPlanted({}, W.tz)) };
}

// --- the game's body pose on this rig: lean (the torso's hunch, forward +), neck (the head hanging, forward +), tilt (the
// pivot's pitch about the hips, forward +), lift (u), yaw and roll of the pivot. Its forward rotation is a minus pitch here.
function body(o) {
  const lean = o.lean || 0, neck = o.neck || 0, tilt = o.tilt || 0;
  return { oy: (o.lift || 0) / U, bp: -tilt, by: o.yaw || 0, br: o.roll || 0, sp: -0.55 * lean, cp: -0.45 * lean, np: -0.55 * neck, hp: -0.45 * neck, nr: o.nr || 0 };
}

// ------------------------------------------------------------------------------------------------ idle (creep, standing)
// The game's creep pose standing still: hunched 0.42, the head hanging, swaying 0.08 at 1.2 rad/s. Mine on top: the
// head lolls one way then the other.
const P = TAU / 1.2 * 1; // 5.24 s, the sway's period
const IP = Math.round(P * 30) / 30, WI = TAU / IP;
const idle = clip({
  dur: IP, loop: true,
  pose: (t) => { const roll = 0.25 * pulse(t, 0.8, 1.4, 2.0, 2.6) - 0.2 * pulse(t, 3.0, 3.5, 4.1, 4.7);
    return addPose(body({ lean: 0.42 + 0.08 * Math.sin(WI * t), neck: 0.55 + 0.05 * Math.sin(WI * t + 0.8) }), arms({ sway: 0.25, w: WI * t }), { nr: 0.6 * roll, hr: 0.4 * roll, ny: 0.2 * roll }); },
});

// ------------------------------------------------------------------------------------------------ creep and turns
const WT = 0.5;
const GAIT = { T: WT, duty: 0.62, v: 1.25 / U };
const GF = { HL: { phase: 0, n: [REST.HL.x, REST.HL.z], lift: 0.025, droop: 0.4, push: 0.2 }, HR: { phase: 0.5, n: [REST.HR.x, REST.HR.z], lift: 0.025, droop: 0.4, push: 0.2 } };
const walk = clip({
  dur: WT * 2, loop: true, gait: { ...GAIT, T: WT },
  pose: (t) => { const w = TAU * t / WT;
    return addPose(body({ lean: 0.42, neck: 0.55, roll: 0.05 * Math.sin(w) }), arms({ sway: 1, w }), { oy: -0.008 + 0.004 * Math.cos(2 * w), ox: 0.006 * Math.sin(w), by: 0.04 * Math.sin(w), cy: -0.04 * Math.sin(w), hp: -0.03 * Math.cos(2 * w) }); },
  legs: (t) => ({ HL: gaitFoot(t, GAIT, GF.HL), HR: gaitFoot(t, GAIT, GF.HR) }),
});
const turn = (dir) => {
  const g = { T: WT, duty: 0.6, v: 0, omega: dir * Math.PI / 2, pivot: [0, 0] };
  return clip({
    dur: WT * 2, loop: true, gait: g,
    pose: (t) => addPose(body({ lean: 0.42, neck: 0.55 }), arms({ sway: 0.5, w: TAU * t / WT }), { ny: 0.15 * dir, hy: 0.15 * dir, oy: -0.006 }),
    legs: (t) => ({ HL: gaitFoot(t, g, { ...GF.HL, lift: 0.02 }), HR: gaitFoot(t, g, { ...GF.HR, lift: 0.02 }) }),
  });
};

// ------------------------------------------------------------------------------------------------ the swing, whole
// grip 66 ticks (the lane fills; it leans back on the rope, braced, one foot forward), the swing (down the lane at
// 10 u/s, 8.5 u: 0.85 s; contact as it passes the hero), the dangle 45 ticks, then it lets go and creeps.
export const TEL = 66 / 60, LANE = 8.5, SWING = LANE / 10, DANGLE = 45 / 60, LETGO = 0.45;
export const SWING_DUR = TEL + SWING + DANGLE + LETGO;
export const HERO_AT = 4.0; // the page's hero, in u ahead
const gripK = (t) => smooth(c01(t / 0.25)) * (1 - smooth(c01((t - TEL) / 0.06)));
const swingP = (t) => c01((t - TEL) / SWING);
const swingOn = (t) => (t >= TEL && t < TEL + SWING ? 1 : 0);
const dangleK = (t) => smooth(c01((t - TEL - SWING) / 0.12)) * (1 - smooth(c01((t - TEL - SWING - DANGLE) / LETGO)));
function swingPose(t) {
  const gk = gripK(t), p = swingP(t), sw = t >= TEL && t < TEL + SWING + 0.08 ? 1 - smooth((t - TEL - SWING) / 0.08) * (t > TEL + SWING ? 1 : 0) : 0, dk = dangleK(t);
  const creep = (1 - gk) * (1 - dk) * (1 - sw);
  const tilt = sw * (0.75 - 1.15 * smooth(p));
  const lift = sw * (0.12 + 0.38 * Math.sin(Math.PI * p)) * 1.1 + 0.04 * 1.1 * dk;
  const spin = 0.9 * dk * Math.sin(1.1 * Math.max(0, t - TEL - SWING));
  const lean = 0.42 * creep - 0.4 * gk + 0.08 * dk + 0.15 * sw;
  const neck = 0.55 * creep + 0.15 * gk + 0.7 * dk - 0.2 * sw;
  const trail = sw * (0.55 + 0.25 * Math.sin(Math.PI * p)) * (1 - 0.6 * smooth(p));
  return addPose(body({ lean, neck, tilt, lift, yaw: spin, roll: 0.05 * Math.sin(2.6 * t) * dk }), arms({ sway: 0.25 * creep, w: 1.2 * t, out: gk, trail, dangle: dk, t }), { nr: 0.25 * dk * Math.sin(0.77 * Math.max(0, t - TEL - SWING)) });
}
const swingClip = clip({
  dur: SWING_DUR, contact: [TEL + (HERO_AT / 10)],
  phases: [['grips the rope and leans back: the Ember lane fills', 0], ['swings down the lane: 8 to every hero it passes, thrown 2 u aside', TEL], ['dangles, slack and turning', TEL + SWING], ['lets go and creeps', TEL + SWING + DANGLE]],
  pose: swingPose,
  travel: (t) => LANE * c01((t - TEL) / SWING) / U,
  legs: (t, W) => {
    const gk = gripK(t), p = swingP(t), dk = dangleK(t), off = t >= TEL && t < TEL + SWING + DANGLE + LETGO * 0.6;
    if (!off) {
      // the grip: braced, the left foot steps forward, then the right back (the game's side * 0.25 at the hips); after the
      // let-go they step home
      const st = (k, a, b, dz, back) => { const A = REST[k].clone().add(V3(0, 0, W.tz + (back ? dz : 0))), B = REST[k].clone().add(V3(0, 0, W.tz + (back ? 0 : dz)));
        if (t < a) return plant(A); if (t < b) { const sw = swing(A, B, (t - a) / (b - a), 0.02, 0.3); return { p: sw.p, pitch: sw.pitch, lock: false }; } return plant(B); };
      if (t < TEL) return { HL: st('HL', 0.05, 0.3, 0.045), HR: st('HR', 0.3, 0.55, -0.045) };
      return legsPlanted({}, W.tz);
    }
    // off the floor: the legs trail the swing, then hang toes down; the feet come down as it lets go
    const hip = P0.hips.clone(); const out = {};
    for (const k of ['HL', 'HR']) {
      const sw = t < TEL + SWING ? 1 : 0, trail = sw * (0.55 + 0.25 * Math.sin(Math.PI * p));
      const down = W.loc(k, [0, -0.23 + 0.03 * trail, -0.12 * trail + 0.02 * dk]);
      const land = smooth(c01((t - TEL - SWING - DANGLE) / (LETGO * 0.6)));
      const pdown = down.clone().add(V3(0, 0, 0)); pdown.lerp(REST[k].clone().add(V3(0, 0, W.tz)), land);
      out[k] = { p: pdown, pitch: 0.9 * dk * (1 - land) + 0.5 * trail, lock: false };
    }
    return out;
  },
});

// ------------------------------------------------------------------------------------------------ hurt
const hurt = clip({
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = track([[0, { p: 0 }], [0.05, { p: 1 }, 'out'], [0.17, { p: -0.2 }], [0.4, { p: 0 }]])(t).p;
    return { sp: 0.15 * k, cp: 0.15 * k, np: 0.3 * k, hp: 0.25 * k, nr: 0.1 * k, aLp: -0.2 * k, aRp: -0.2 * k, aLr: 0.15 * k, aRr: -0.15 * k }; },
});

// ------------------------------------------------------------------------------------------------ spawn
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = clip({
  dur: 1.2, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['straightens on the rope', 7 * FR], ['creeps', 1.0]],
  pose: (t) => { const k = smooth((t - 0.15) / 0.8); return addPose(body({ lean: lerp(0.7, 0.42, k), neck: lerp(1.0, 0.55, k), lift: 0 }), arms({ dangle: 1 - k, t }), { oy: -0.03 * (1 - k) }); },
});

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it jolts back; its knees give and it sags, the head
// dropping; then it topples forward onto its face, arms limp, and lies still. LOW is its lowest point per frame from a
// probe build (PROBE=1, no floor correction): from the topple on, the body is lifted by that much so it rolls over the
// floor and lies on it, never in it.
const HIT = 0.15, BUCKLE = 0.55, TOP = 0.6;
const LOW = [-0.000,-0.000,-0.000,-0.000,-0.000,-0.000,-0.001,-0.001,-0.001,-0.001,-0.001,-0.001,-0.001,-0.001,-0.001,-0.001,-0.001,-0.007,-0.007,-0.006,-0.004,-0.001,0.004,0.016,0.029,0.045,0.062,0.080,0.072,0.059,0.054,0.053,0.049,0.045,0.045,0.051,0.062,0.076,0.090,0.101,0.095,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.094];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t * 30, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const tipAt = (t) => 1.5 * smooth(c01((t - BUCKLE) / TOP)) ** 1.5;
const death = clip({
  dur: 2.2, contact: [BUCKLE + TOP],
  phases: [['struck: jolts back', 0], ['the knees give', HIT], ['topples forward', BUCKLE], ['lies still', BUCKLE + TOP + 0.2]],
  pose: (t) => {
    const hit = pulse(t, 0, 0.05, 0.1, 0.3), bk = smooth(c01((t - HIT) / (BUCKLE - HIT))), a = tipAt(t), land = smooth(c01((t - BUCKLE - TOP) / 0.2));
    const flat = 1 - 0.9 * smooth(c01(a / 1.5));
    const o = addPose(body({ lean: (0.42 + 0.25 * bk - 0.3 * hit) * flat, neck: (0.55 + 0.4 * bk - 0.3 * hit) * flat, tilt: a }), arms({ dangle: bk * (1 - land), t, trail: 0.4 * c01(a) * (1 - c01(a / 1.5)) }),
      { oy: -0.07 * bk, nr: 0.5 * land, hr: 0.3 * land, ny: 0.4 * land, aLr: 0.15 * land, aRr: -0.1 * land, aLp: 0.12 * c01(a / 1.5), aRp: 0.1 * c01(a / 1.5), hang_tas: 0.95 * (1 - smooth(c01((a - 0.6) / 0.8))) });
    if (process.env.PROBE || t < BUCKLE) return o;
    o.oy += -lowAt(t) + 0.01 * bump(t, BUCKLE + TOP + 0.05, 0.12);
    return o;
  },
  legs: (t, W) => {
    if (t < BUCKLE) return legsPlanted({}, W.tz);
    // off its feet: the legs ride the hips, knees bent, trailing as it goes over
    const out = {}; const a = tipAt(t);
    for (const k of ['HL', 'HR']) { const g = smooth(c01(a / 1.5)); out[k] = { p: W.loc(k, [0.01 * SG[k], -0.2 - 0.03 * g, -0.06 + 0.05 * g]), pitch: 0.3 * (1 - g), lock: false, under: true }; }
    return out;
  },
});
export const CLIPS = process.env.PROBE ? { death } : { idle, walk, turnL: turn(1), turnR: turn(-1), swing: swingClip, hurt, spawn, death };
