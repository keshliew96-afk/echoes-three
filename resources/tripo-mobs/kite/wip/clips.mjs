// The Gust Kite's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/kite.js (flies 2.8 u/s, circling 3.6 to 5.6 u out; within 5.2 u it hangs
// and marks an Ember lane 0.8 wide and up to 6.2 long for 50 ticks, then dives down it at 12 u/s for 9 to each hero
// crossed; it lands grounded for 80 ticks, taking 50% more, then climbs back; cooldown 250) and its rig
// src/render/enemies/spire.js buildKite (soars flat 1.6 u up with a 0.08 bob at 1.7 rad/s, a 0.12 roll at 1.1 rad/s and
// a 0.08 nose-down; the sails beat at 3.6 rad/s; the hang tips the nose 0.45 down, shivers and folds the sails up and
// back; the dive falls 1.78 to 0.18 u nose down, stretched; grounded flat, tilted 0.22, struggling; the climb beats the
// sails at 11 rad/s nose up; the tail's rags flutter at 5.5 rad/s).
// Kesh's model stands upright, sculpted face-on like a kite on a wall. In flight it lies flat like the game's, the head
// forward and the face up to the camera (B below turns the model into the game's flight frame).
import * as THREE from 'three';
import { smooth, clamp, addPose } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
const Q = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const B = Q(Y, Math.PI).multiply(Q(X, -Math.PI / 2)), BI = B.clone().invert();
const inGame = (g) => BI.clone().multiply(g).multiply(B); // a rotation in the game's flight frame, as a local of a model-frame bone
// a wing: the game's pivot (side +1 is the game's +x, the model's right) raised by `raise` and swept back by `sweep`; the
// outer bone bends a share more (the sail billows); the model's wings hang 24 deg below the shoulder, so 0.3 rides on top
// grounded, the game's tilt would push the low sail into the floor, so that sail lifts by the tilt (tilt, + rolls the model's left down)
const wing = (side, k, o) => (p) => inGame(Q(Y, side * (p.sweep || 0) * o).multiply(Q(Z, side * (k * ((p.raise || 0) + 0.3 * o + (side < 0 ? p.tilt || 0 : 0)) + (o ? 0 : p.bend || 0)))));
const tailJ = (i) => (p) => inGame(Q(Y, p['ty' + i] || 0).multiply(Q(X, p['tx' + i] || 0)));
export const CFG = {
  name: 'kite', unit: 1.6, base: {}, floor: false,
  chain: [['hips', 'b'], ['chest', 'c'], ['head', 'h']],
  extras: [['wing1L', wing(-1, 1, 1)], ['wing2L', wing(-1, 0.35, 0)], ['wing1R', wing(1, 1, 1)], ['wing2R', wing(1, 0.35, 0)],
    ['tail1', tailJ(1)], ['tail2', tailJ(2)], ['tail3', tailJ(3)], ['tail4', tailJ(4)]],
  scales: [['hips', ['hsx', 'hsy', 'hsz']]],
  legs: {},
  springs: [],
};
const U = CFG.unit, HIPY = 0.72;
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const none = () => ({});
// The game's hover state, as the fields its rig sets: h (height, u), gx / gz (the hover's pitch, + nose down, and roll),
// sx (side shiver, u), raise / sweep (the sails' pivot), head (the head's pitch, + nose down), tail flutter and droop per
// joint, stretch (the dive's squash), yaw (mine: a bank into a turn).
function kite(t, g) {
  const W = Q(Y, g.yaw || 0).multiply(Q(X, g.gx || 0)).multiply(Q(Z, g.gz || 0));
  const e = new THREE.Euler().setFromQuaternion(W.clone().multiply(B), 'YXZ');
  const d = g.stretch || 0;
  const o = {
    ox: (g.sx || 0) / U, oy: g.h / U - HIPY, bp: -e.x, by: e.y, br: e.z,
    raise: g.raise || 0, sweep: g.sweep || 0, bend: g.bend || 0, tilt: g.tilt || 0,
    hp: 0.4 + (g.head || 0), hsx: -0.1 * d, hsy: 0.15 * d, hsz: 0,
  };
  // the tail: four joints for the game's six, the flutter running down it; aloft it trails level with a slight droop
  // (mine: the game's tail lifts 0.16 a joint, which on this longer tail curls it up over the back)
  for (let i = 1; i <= 4; i++) {
    const flut = Math.sin(g.tw * t - (i - 1) * 1.2 + (g.tph || 0));
    o['ty' + i] = (0.3 * flut * (1 - 0.8 * (g.dive || 0)) + 0.08 * flut * (g.ground || 0)) * (1 - 0.5 * (g.ground || 0)) * (g.tamp ?? 1);
    o['tx' + i] = (-0.08 - 0.04 * Math.sin(g.tw2 * t - i)) * (1 - (g.dive || 0)) * (1 - (g.ground || 0)) + 0.04 * (g.dive || 0) + (g.tlift ? g.tlift[i - 1] : 0);
  }
  return o;
}
// ------------------------------------------------------------------------------------------------ soar (idle)
// The game's soar in place, whole cycles over 7.39 s: the bob (1.7 rad/s, two), the roll (1.1, rounded to one), the sail
// beat (3.6, rounded to four) and the tail (5.5, rounded to six).
const P = 2 * TAU / 1.7, WB = 2 * TAU / P, WR = TAU / P, WS = 4 * TAU / P, WT = 6 * TAU / P, WT2 = 3 * TAU / P;
const soarG = (t, o = {}) => {
  const beat = Math.sin(WS * t);
  return { h: 1.6 + 0.08 * Math.sin(WB * t), gx: 0.08 + (o.gx || 0), gz: 0.12 * Math.sin(WR * t) + (o.gz || 0), raise: 0.12 + 0.22 * beat,
    bend: 0.08 * Math.sin(WS * t - 0.8), head: 0.05 * Math.sin(WB * t + 1), tw: WT, tw2: WT2, yaw: o.yaw || 0 };
};
const idle = {
  dur: P, loop: true,
  pose: (t) => { const look = 0.25 * pulse(t, 1.2, 1.7, 2.6, 3.1) - 0.25 * pulse(t, 4.6, 5.1, 6.0, 6.5);
    return addPose(kite(t, soarG(t)), { hy: 0, hr: look }); },
  feet: none,
};
// ------------------------------------------------------------------------------------------------ fly and turns
const walk = { dur: P, loop: true, gait: { T: P, duty: 0, v: 2.8 / U }, pose: (t) => kite(t, soarG(t, { gx: 0.06 })), feet: none };
const turn = (dir) => ({
  dur: P, loop: true, gait: { T: P, duty: 0, v: 0, omega: dir * Math.PI, pivot: [0, 0] },
  pose: (t) => addPose(kite(t, soarG(t, { gz: -0.25 * dir })), { hr: 0.2 * dir }),
  feet: none,
});

// ------------------------------------------------------------------------------------------------ the dive
// The game's whole attack, its own numbers: it hangs over the 50-tick telegraph (the nose tips down to aim, it shivers,
// the sails fold up and back), drops down the full 6.2 u lane at 12 u/s (31 ticks) nose down and stretched, thumps flat
// onto the floor, lies there struggling for 80 ticks, then climbs back up beating hard, nose up.
export const TEL = 50 / 60, LANE = 6.2, DIVE = Math.ceil(LANE / (12 / 60)) / 60, LAND = TEL + DIVE, GROUND = 80 / 60, RISE = LAND + GROUND;
const GH = 0.1; // grounded height (the game's 0.07, raised to this model's back)
const appr = (dt, rate) => 1 - Math.exp(-rate * Math.max(0, dt));
function diveG(t) {
  const hang = t < LAND ? appr(t, 8) : 0, tk = t < TEL ? Math.max(t / TEL, 0.8 * hang) : t < LAND ? 1 : 0;
  const diving = t >= TEL && t < LAND ? 1 : 0, dp = diving ? smooth((t - TEL) / DIVE) : 0;
  // mine: in the last quarter of the drop it flares flat, so the nose does not hit the floor before the body
  const flare = diving ? smooth((dp - 0.7) / 0.3) : 0;
  const ground = t < LAND ? 0 : t < RISE ? appr(t - LAND, 14) : 1 - appr(t - RISE, 14);
  const la = t - LAND, thump = la >= 0 && la < 0.3 ? 1 - la / 0.3 : 0;
  const rise = t < RISE ? 0 : Math.max(0, 1 - (t - RISE) * 0.9), climb = rise * (1 - ground);
  const strug = ground * Math.max(0, Math.sin(t * 7)) * (0.5 + 0.5 * Math.sin(t * 1.9));
  // height: the hang lifts 0.18; the dive drops 1.78 to 0.18; grounded flat; the climb eases back up at 2.2
  let h;
  if (t < TEL) h = 1.6 + 0.18 * tk;
  else if (t < LAND) h = 1.78 - 1.6 * dp;
  else if (t < RISE) h = GH + (0.18 - GH) * (1 - appr(t - LAND, 16)) + 0.04 * thump; // the thump's nose-dip, kept off the floor
  else h = GH + (1.6 - GH) * appr(t - RISE, 2.2);
  const beat = Math.sin(t * (climb > 0.05 ? 11 : 3.6)), fold = Math.max(tk * 0.85, diving);
  const free = (0.12 + 0.22 * beat) * (1 - ground) + climb * 0.4 * beat;
  return {
    h, sx: 0.04 * Math.sin(t * 23) * tk * (1 - diving),
    gx: 0.08 * (1 - tk) * (1 - ground) + 0.45 * tk * (1 - diving) + (0.35 + 0.15 * dp) * diving * (1 - flare) - 0.25 * climb + 0.1 * thump,
    tilt: ground * (0.22 + 0.08 * strug), gz: ground * (0.22 + 0.08 * strug) + 0.03 * Math.sin(t * 31) * tk * (1 - diving),
    raise: free * (1 - fold) + 1.05 * fold + ground * (GFLAT * (1 - fold) + 0.35 * strug), // the game slaps the sails 0.2 down on the thump; here the floor is in the way
    sweep: 0.55 * fold, bend: 0.1 * climb * Math.sin(t * 11 - 0.8),
    head: 0.3 * tk * (1 - diving) - 0.2 * ground + 0.15 * diving * (1 - flare), stretch: diving,
    tw: 5.5, tw2: 3, dive: diving, ground, tlift: TLIFT.map((v) => v * Math.max(ground, c01((0.6 - h) / 0.4))), // near the floor the tail lies along it
  };
}
const GFLAT = 0.13; // grounded, the sails lie flat on the floor (the model's sails hang 24 deg below the back; the game drops them 0.12 below level, which here would sink them into the floor)
const TLIFT = [0.3, 0.04, -0.06, -0.08]; // grounded, the tail lies along the floor instead of hanging through it
const DUR = RISE + 1.9;
export const DIVE_AT = [LAND];
const dive = {
  dur: DUR, contact: [TEL + 0.5 * DIVE, LAND],
  travel: process.env.NOTRAVEL ? undefined : (t) => LANE * c01((t - TEL) / DIVE) / U,
  phases: [['hangs: the Ember lane marks, 50 ticks', 0], ['dives at 12 u/s: 9 to each hero crossed', TEL], ['grounded 80 ticks: takes 50% more', LAND],
           ['climbs back up', RISE], ['soars', RISE + 1.2]],
  pose: (t) => kite(t, diveG(t)),
  feet: none,
};

// ------------------------------------------------------------------------------------------------ hurt
// Mine: the sails flinch up, the head snaps back, the tail whips. Plays on top of anything.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = c01(t / 0.05) * (1 - smooth((t - 0.05) / 0.35)), w = Math.sin(t * 30) * (1 - c01(t / 0.4));
    const o = kite(0, { ...soarG(0), raise: 0.12 + 0.6 * k, head: -0.5 * k }); for (let i = 1; i <= 4; i++) o['ty' + i] += 0.4 * w * (i / 4); return o; },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's grow-in (7 frames, 10% over), at its soaring height with the sails folded; then they snap open and it beats
// twice to catch the wind.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.4, contact: [], scale: spawnScale,
  phases: [['grows in, folded', 0], ['the sails snap open', 0.35], ['beats to catch the wind', 0.5], ['soars', 1.1]],
  pose: (t) => { const g = soarG(t), open = smooth((t - 0.3) / 0.15), beats = pulse(t, 0.4, 0.5, 0.9, 1.2);
    return kite(t, { ...g, raise: (1.05) * (1 - open) + open * (g.raise + 0.45 * beats * Math.sin((t - 0.45) * 11)), sweep: 0.55 * (1 - open), gx: g.gx - 0.2 * beats, head: g.head + 0.3 * (1 - open) }); },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, the sails jerk up and go slack; it slips sideways, nose down,
// turning half round as it falls, slaps flat onto the floor, bounces once, and the tail drops last.
export const DEATH_LAND = 0.95;
function deathG(t) {
  const hit = pulse(t, 0, 0.05, 0.1, 0.3), fall = c01((t - 0.12) / (DEATH_LAND - 0.12)), f2 = fall * fall, lie = smooth((t - DEATH_LAND) / 0.25);
  const bounce = 0.06 * Math.max(0, Math.sin(Math.PI * c01((t - DEATH_LAND) / 0.3)));
  const h = 0.035 * Math.max(0, 1 - Math.abs(t - DEATH_LAND) / 0.08) + (t < DEATH_LAND ? 1.6 + 0.06 * hit - (1.6 - GH - 0.01) * f2 : GH + 0.01 + bounce);
  const slack = smooth((t - 0.1) / 0.4);
  return {
    h, gx: (0.08 + 0.6 * Math.sin(Math.PI * fall)) * (1 - lie) + 0.05 * hit, tilt: 0.12 * lie, gz: 0.6 * Math.sin(Math.PI * fall) * (1 - lie) + 0.12 * lie, yaw: 1.4 * smooth(fall),
    raise: (0.12 + 0.7 * hit) * (1 - slack) + slack * (0.35 * (1 - lie) + lie * GFLAT) , sweep: 0.2 * slack * (1 - lie),
    head: -0.3 * hit + 0.3 * slack * (1 - fall) - 0.25 * lie, tw: 5.5, tw2: 3, tamp: 1 - lie * 0.85, ground: lie,
    tlift: TLIFT.map((v) => v * Math.max(lie, c01((0.6 - h) / 0.4))),
  };
}
const death = {
  dur: 2.4, contact: [0.02, DEATH_LAND],
  phases: [['struck: the sails jerk up', 0], ['slack, it slips and falls', 0.15], ['slaps flat', DEATH_LAND], ['lies still', 1.4]],
  pose: (t) => kite(t, deathG(t)),
  feet: none,
};
export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), dive, hurt, spawn, death };
