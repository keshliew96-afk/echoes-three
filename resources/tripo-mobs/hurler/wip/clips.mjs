// The Coal Hurler's moves. Units are model units (the model is 1 tall; the page draws it CFG.unit = 1.2 u tall, the game's
// squat imp at its 1.45x size). Timings come from the game: src/sim/enemies/hurler.js (sidles at 1.6 u/s keeping 3.6 to
// 5.2 u off; when a hero stands 2.4 to 6.8 u off it plants, swings the sack back and marks an Ember ring r 1.3 on the
// hero's spot for 66 ticks; the coal lands for 9 and leaves a cinder bed; a stun mid-swing makes it fumble) and its rig
// buildHurler in src/render/enemies/kiln.js (the heave: the sack swings back over the shoulder by 1.25 rad as
// smooth(prog * 1.6), leaning back 0.25 and looking up 0.25, the sack trembling at the top; the hurl: a 0.12 s heave
// forward and an exp(-5 t) recovery, pitching forward 0.35 and lunging 0.08; after the throw the sack is empty, limp
// 0.3, refilling over 1.2 s; the sidle waddles, rolling 0.12) and its effects in src/render/vfx/sig/foes4.js (the coal
// is in the air for the last 0.42 s of the warning).
// The right fist is welded to the chest in the model (moving that arm tears it), so the right arm rides the chest and the
// sack swings from the fist that holds its fold: the 'sack' bone's pivot is the fist.
import * as THREE from 'three';
import fs from 'fs';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose } from '../kit/quad.mjs';
const SK = JSON.parse(fs.readFileSync(new URL('./rig/skel.json', import.meta.url)));
const P0 = Object.fromEntries(SK.names.map((n, i) => [n, V3(...SK.pos[i])]));
const END = Object.fromEntries(Object.entries(SK.ends).map(([k, v]) => [k, V3(...v)]));
const FR = 1 / 30, TAU = 2 * Math.PI;
const PROBE = !!process.env.PROBE;

export const CFG = {
  name: 'hurler', unit: 1.2,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['clvL', 'kL'], ['clvR', 'kR'], ['armL', 'aL'], ['foreL', 'fL'], ['handL', 'wL'], ['armR', 'aR'], ['foreR', 'fR'], ['handR', 'wR'], ['fingR', 'gR'], ['sack', 'k']],
  scales: [['sack', ['qx', 'qy', 'qz']]],
  legs: {
    HL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'], pole: [0, 0, 1] }, HR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'], pole: [0, 0, 1] },
  },
  springs: [],
};
const U = CFG.unit;
const REST = { HL: END.toeL.clone(), HR: END.toeR.clone() };
const plant = (p) => ({ p: p.clone(), lock: true });
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const legsPlanted = (o = {}, tz = 0) => ({ HL: plant(REST.HL.clone().add(V3(o.xl || 0, 0, (o.zl || 0) + tz))), HR: plant(REST.HR.clone().add(V3(o.xr || 0, 0, (o.zr || 0) + tz))) });
const KNEE = { oy: -0.006 };
function clip(c) {
  const pose = (t) => addPose(KNEE, c.pose(t));
  return { ...c, pose, feet: (t, W) => (c.legs ? c.legs(t, W) : legsPlanted({}, W.tz)) };
}

// --- the game's pose on this rig. sack: the swing over the shoulder (the game's sackP.rotation.x, + up and over from
// behind; this kit pitches the other way, so kp = -sack), out (rolls it outward, clear of the head), empty (0..1, limp).
// tilt: the whole body's pitch (the game's rig.rotation.x, - leans back: bp = -tilt), roll (the waddle), look (the head,
// + up). A plus aLp swings the hanging left arm forward and up.
function pose(o) {
  const sack = o.sack || 0, empty = o.empty || 0, tilt = o.tilt || 0, look = o.look || 0;
  return { oy: (o.lift || 0) / U, oz: (o.lunge || 0) / U, bp: -tilt, br: o.roll || 0, by: o.yaw || 0,
    sp: -0.3 * (o.hunch || 0), cp: -0.2 * (o.hunch || 0), np: 0.4 * look, hp: 0.6 * look, ny: o.turn || 0,
    kp: -sack, kr: 0.22 * (o.out ?? sack / 1.25), ky: 0, qy: -0.3 * empty, qz: -0.15 * empty, qx: -0.05 * empty,
    aLp: o.lp || 0, aLr: o.lr || 0, fLp: o.lf || 0, wLp: o.lw || 0 };
}

// ------------------------------------------------------------------------------------------------ idle
// Mine (the game's hurler never stands still): it breathes, the sack riding the shoulder, glances one way then the
// other, and hitches the sack up once.
const IP = 4.0;
const idle = clip({
  dur: IP, loop: true,
  pose: (t) => { const br = Math.sin(TAU * t / 2); const look = 0.35 * pulse(t, 0.6, 1.0, 1.5, 1.9) - 0.3 * pulse(t, 2.3, 2.7, 3.1, 3.5); const hitch = bump(t, 2.0, 0.5);
    return pose({ lift: 0.004 * br, sack: 0.03 * br + 0.22 * hitch, turn: look, tilt: -0.02 * hitch, lp: 0.05 * br }); },
});

// ------------------------------------------------------------------------------------------------ sidle and turns
// The game's sidle: a heavy waddle (roll 0.12), the free arm swinging, the sack bobbing 0.08. 1.6 u/s.
const WT = 0.3;
const GAIT = { T: WT, duty: 0.58, v: 1.6 / U };
const GF = { HL: { phase: 0, n: [REST.HL.x, REST.HL.z], lift: 0.03, droop: 0.5, push: 0.2 }, HR: { phase: 0.5, n: [REST.HR.x, REST.HR.z], lift: 0.03, droop: 0.5, push: 0.2 } };
const walk = clip({
  dur: WT * 2, loop: true, gait: { ...GAIT },
  pose: (t) => { const w = TAU * t / WT;
    return addPose(pose({ roll: 0.12 * Math.sin(w), lift: 0.012 * Math.abs(Math.cos(w)), sack: 0.1 + 0.08 * Math.sin(w * 2), tilt: 0.06, hunch: 0.2, lp: -0.35 * Math.sin(w), lf: 0.15 }), { by: 0.04 * Math.sin(w) }); },
  legs: (t) => ({ HL: gaitFoot(t, GAIT, GF.HL), HR: gaitFoot(t, GAIT, GF.HR) }),
});
const turn = (dir) => {
  const g = { T: WT, duty: 0.6, v: 0, omega: dir * Math.PI, pivot: [0, 0] };
  return clip({
    dur: WT * 2, loop: true, gait: g,
    pose: (t) => { const w = TAU * t / WT; return pose({ roll: 0.06 * Math.sin(w), sack: 0.06, turn: 0.15 * dir, lp: -0.15 * Math.sin(w) }); },
    legs: (t) => ({ HL: gaitFoot(t, g, { ...GF.HL, lift: 0.025 }), HR: gaitFoot(t, g, { ...GF.HR, lift: 0.025 }) }),
  });
};

// ------------------------------------------------------------------------------------------------ the throw, whole
// The warning is 66 ticks. It plants (a brace step), heaves the sack back and up over the shoulder (the game's curve:
// 1.25 rad by smooth(prog * 1.6), leaning back, looking up, the free hand up on the sack), and lets fly as the coal must
// leave: 0.42 s before the warning closes (the game's flight). The sack snaps forward over the top in 0.12 s, it pitches
// forward and lunges, and the coal lands as the ring closes. The sack hangs empty and limp, refilling, as it recovers.
export const TEL = 66 / 60, FLIGHT = 0.42, REL = TEL - FLIGHT, HERO_AT = 4.4;
const THROW_DUR = REL + 1.45;
const backAt = (t) => smooth(c01((t / TEL) * 1.6)) * c01(t / 0.08);
const hurlAt = (t) => { const a = t - REL; if (a < 0) return 0; return a < 0.12 ? smooth(a / 0.12) : Math.exp(-(a - 0.12) * 5); };
function sackAt(t) {
  if (t < REL) return 1.25 * backAt(t) + 0.04 * backAt(t) * Math.sin(t * 30) * c01((t - 0.5) / 0.15);
  const a = t - REL; const top = 1.25 + 0.35 * smooth(c01(a / 0.12));
  return a < 0.12 ? top : top * Math.exp(-(a - 0.12) * 3.6);
}
const emptyAt = (t) => { const a = t - REL; if (a < 0) return 0; return smooth(c01(a / 0.1)) * (1 - smooth(c01((a - 0.4) / 1.2))); };
function throwPose(t) {
  const bk = t < REL ? backAt(t) : backAt(REL) * Math.exp(-(t - REL) * 12), h = hurlAt(t);
  const lpUp = 1.9 * bk, lpFwd = 1.3 * h;
  return pose({ sack: sackAt(t), out: 0.22 * bk + 0.35 * c01(sackAt(t) / 1.85) * (t > REL ? 1 : 0), empty: emptyAt(t),
    tilt: -0.25 * bk + 0.35 * h, lunge: 0.08 * h, look: 0.25 * bk - 0.25 * h, hunch: -0.3 * bk + 0.4 * h,
    lp: lpUp * (1 - h) + lpFwd, lr: 0.25 * bk - 0.1 * h, lf: 0.6 * bk * (1 - h) + 0.2 * h, lw: 0.2 * bk });
}
const throwClip = clip({
  dur: THROW_DUR, contact: [REL, TEL],
  phases: [['plants and heaves the sack back: the Ember ring marks the hero', 0], ['hurls: the coal is in the air', REL], ['the coal lands: 9, and a cinder bed', TEL], ['the sack hangs empty as it recovers', TEL + 0.3]],
  pose: throwPose,
  legs: (t, W) => {
    // the brace: the left foot steps forward and out, the right back; they step home as it recovers
    const st = (k, a, b, d, back) => { const A = REST[k].clone().add(V3(0, 0, W.tz)), B = REST[k].clone().add(V3(d[0], 0, d[1] + W.tz));
      const from = back ? B : A, to = back ? A : B;
      if (t < a) return plant(from); if (t < b) { const sw = swing(from, to, (t - a) / (b - a), 0.025, 0.4); return { p: sw.p, pitch: sw.pitch, lock: false }; } return plant(to); };
    if (t < REL + 0.5) return { HL: st('HL', 0.02, 0.22, [0.03, 0.05]), HR: st('HR', 0.2, 0.4, [-0.02, -0.04]) };
    return { HL: st('HL', REL + 0.55, REL + 0.75, [0.03, 0.05], true), HR: st('HR', REL + 0.75, REL + 0.95, [-0.02, -0.04], true) };
  },
});

// ------------------------------------------------------------------------------------------------ fumble
// The game's: a stun mid-heave cancels the coal; it drops the sack. Mine: the heave starts as the game's, the stun
// lands at 0.4 s, the sack falls back off the shoulder and it staggers, then hauls the sack back up.
const FUMBLE_AT = 0.4;
const fumble = clip({
  dur: 1.6, contact: [FUMBLE_AT],
  phases: [['heaves', 0], ['stunned: it fumbles the sack, coals spill, nothing thrown', FUMBLE_AT], ['hauls it back up', 1.0]],
  pose: (t) => { const bk = t < FUMBLE_AT ? backAt(t) : backAt(FUMBLE_AT) * Math.exp(-(t - FUMBLE_AT) * 10);
    const drop = pulse(t, FUMBLE_AT, FUMBLE_AT + 0.15, 1.0, 1.4), jolt = pulse(t, FUMBLE_AT, FUMBLE_AT + 0.05, FUMBLE_AT + 0.15, FUMBLE_AT + 0.45);
    return pose({ sack: 1.25 * bk - 0.35 * drop, out: 0.2 * bk - 0.25 * drop, tilt: -0.25 * bk + 0.15 * jolt, look: 0.25 * bk - 0.3 * jolt, hunch: 0.5 * jolt + 0.2 * drop,
      lp: 1.9 * bk + 0.4 * jolt, lr: 0.25 * bk + 0.2 * jolt, lf: 0.6 * bk + 0.3 * jolt }); },
});

// ------------------------------------------------------------------------------------------------ hurt
const hurt = clip({
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = track([[0, { p: 0 }], [0.05, { p: 1 }, 'out'], [0.17, { p: -0.2 }], [0.4, { p: 0 }]])(t).p;
    return { sp: 0.15 * k, cp: 0.12 * k, np: 0.25 * k, hp: 0.25 * k, nr: 0.1 * k, aLp: -0.2 * k, aLr: 0.15 * k, kp: -0.12 * k }; },
});

// ------------------------------------------------------------------------------------------------ spawn
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = clip({
  dur: 1.0, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['hitches the sack up', 7 * FR], ['sidles', 0.8]],
  pose: (t) => { const k = smooth((t - 0.15) / 0.5), h = bump(t, 0.55, 0.3); return pose({ hunch: 0.6 * (1 - k), look: -0.3 * (1 - k), sack: -0.2 * (1 - k) + 0.25 * h, lift: -0.01 * (1 - k) }); },
});

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is, the sack splitting and spilling its coals). Struck, it jolts back;
// the sack slides off its shoulder; its knees give and it topples forward onto its face. LOW is its lowest point per
// frame from a probe build (PROBE=1, no floor correction).
const HIT = 0.15, BUCKLE = 0.5, TOP = 0.55;
const LOW = [-0.001,-0.001,-0.001,-0.001,-0.001,-0.001,-0.001,-0.001,-0.002,-0.002,-0.002,-0.002,-0.003,-0.003,-0.003,0.009,0.010,0.010,0.011,0.017,0.027,0.040,0.057,0.076,0.095,0.077,0.063,0.054,0.048,0.046,0.038,0.030,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029,0.029];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t * 30, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const tipAt = (t) => 1.45 * smooth(c01((t - BUCKLE) / TOP)) ** 1.5;
const death = clip({
  dur: 2.0, contact: [HIT, BUCKLE + TOP],
  phases: [['struck: jolts back, the sack slips', 0], ['the knees give', HIT], ['topples forward', BUCKLE], ['lies still', BUCKLE + TOP + 0.15]],
  pose: (t) => {
    const hit = pulse(t, 0, 0.05, 0.1, 0.3), bk = smooth(c01((t - HIT) / (BUCKLE - HIT))), a = tipAt(t), g = smooth(c01(a / 1.45));
    const o = pose({ tilt: a - 0.15 * hit, hunch: (0.3 * bk - 0.3 * hit) * (1 - 0.8 * g), look: 0.3 * hit - 0.2 * bk + 0.5 * g, sack: -0.25 * bk - 0.35 * g, out: -0.4 * bk - 0.6 * g, empty: 0.4 * g,
      lp: 0.3 * hit + 0.5 * g, lr: 0.2 * g, lf: 0.2 * bk });
    o.oy += -0.03 * bk;
    if (PROBE || t < BUCKLE) return o;
    o.oy += -lowAt(t);
    return o;
  },
  legs: (t, W) => {
    if (t < BUCKLE) return legsPlanted({}, W.tz);
    const out = {}; const g = smooth(c01(tipAt(t) / 1.45));
    for (const k of ['HL', 'HR']) out[k] = { p: W.loc(k, [0.01 * (k === 'HL' ? 1 : -1), -0.27 - 0.02 * g, -0.03 + 0.05 * g]), pitch: 0.3 * (1 - g), lock: false, under: true };
    return out;
  },
});

export const CLIPS = PROBE ? { death } : { idle, walk, turnL: turn(1), turnR: turn(-1), throw: throwClip, fumble, hurt, spawn, death };
