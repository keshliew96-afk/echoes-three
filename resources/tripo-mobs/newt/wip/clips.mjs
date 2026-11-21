// The Ember Newt's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/newt.js (skitters at 2.6 u/s to 2.0-3.0 u of its target; within 3.2 u it
// crouches and marks a lunge lane 0.7 u wide and up to 3.6 u long through the target for 42 ticks, shoots down it at
// 13 u/s biting every hero it crosses once for 7, skids to a stop at the lane's end and rests there 40 ticks with its
// flanks heaving; cooldown 190 ticks) and its rig buildNewt in src/render/enemies/kiln.js (a lizard's diagonal trot
// with an S through the spine; the crouch front-low with the haunches wiggling over its last half and the tail raised
// and whipping; the lunge a stretched dart, legs swept back, tail straight; at rest low, fast deep heaves slowing).
import * as THREE from 'three';
import fs from 'fs';
import { gaitFoot, V3, smooth, clamp, addPose, track } from '../kit/quad.mjs';
const SK = JSON.parse(fs.readFileSync(new URL('./rig/skel.json', import.meta.url)));
const END = Object.fromEntries(Object.entries(SK.ends).map(([k, v]) => [k, V3(...v)]));
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'newt', unit: 1.0,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['tail1', 't1'], ['tail2', 't2'], ['tail3', 't3'], ['tail4', 't4']],
  scales: [['spine', ['ssx', 'ssy', 'ssz']], ['chest', ['csx', 'csy', 'csz']]],
  legs: {
    FL: { kind: 'limb', b: ['armL', 'foreL', 'pawL', 'clawL'], pole: [1, 1, -0.3] }, FR: { kind: 'limb', b: ['armR', 'foreR', 'pawR', 'clawR'], pole: [-1, 1, -0.3] },
    HL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'], pole: [1, 1, 0.3] }, HR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'], pole: [-1, 1, 0.3] },
  },
  springs: [{ bone: 'tail3', k: 220, c: 10, max: 0.6 }, { bone: 'tail4', k: 170, c: 8, max: 0.7 }],
};
const U = CFG.unit;
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const REST_T = { FL: END.clawL.clone(), FR: END.clawR.clone(), HL: END.toeL.clone(), HR: END.toeR.clone() };
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const lerp = (a, b, u) => a + (b - a) * u;
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));

// --- the pose fields: drop (model units the body sinks), pitch (nose down +), roll (+ toward its right), yaw (+ toward
// its left), s (the S through the spine), sx / sz (the body's width and length), tailUp, head (nose down +), look.
const REST = Object.freeze({ drop: 0, pitch: 0, roll: 0, yaw: 0, s: 0, sx: 1, sz: 1, tailUp: 0, head: 0, look: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
function newt(g, o = {}) {
  const tw = o.tw || [0, 0, 0, 0];
  return {
    oy: -g.drop, oz: o.oz || 0, bp: -g.pitch, br: g.roll, by: g.yaw + 0.5 * g.s,
    sy: -0.6 * g.s, cy: -0.5 * g.s, ny: 0.4 * g.s + 0.5 * g.look, hp: -g.head + (o.nod || 0), hy: 0.5 * g.look,
    t1p: 0.05 - 0.45 * g.tailUp, t2p: 0.03 - 0.35 * g.tailUp, t3p: 0.02 + 0.1 * g.tailUp, t4p: 0.1 * g.tailUp,
    t1y: tw[0] - 0.5 * g.s, t2y: tw[1] - 0.3 * g.s, t3y: tw[2], t4y: tw[3],
    ssx: g.sx - 1, ssz: g.sz - 1, csx: 0.6 * (g.sx - 1), csz: 0.6 * (g.sz - 1), ssy: 0, csy: 0,
  };
}
// the feet: planted where they stand (with the travel), or swept back off the floor for the lunge, or splayed out
function feetOf(o = {}, tz = 0) {
  const out = {};
  for (const k of LEGS) {
    const front = k[0] === 'F', sg = k[1] === 'L' ? 1 : -1;
    const p = REST_T[k].clone().add(V3(0, 0.004, tz));
    const sw = o.sweep || 0, sp = o.splay || 0;
    p.add(V3(sg * 0.02 * sw, 0.05 * sw, -(front ? 0.1 : 0.08) * sw)).add(V3(sg * 0.03 * sp, 0.03 * (o.lift || 0), (front ? 0.015 : -0.015) * sp));
    out[k] = { p, lock: !o.free && sw < 0.01, curl: 0 };
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ idle
// The game's newt never stands still (it skitters and weaves). Mine: it waits low, its flanks breathing, the head
// turning to look, the tail tip twitching.
const IP = 3.0;
const idle = {
  dur: IP, loop: true,
  pose: (t) => { const br = Math.sin(TAU * t / 1.0), look = 0.35 * pulse(t, 0.3, 0.5, 1.0, 1.2) - 0.35 * pulse(t, 1.6, 1.8, 2.3, 2.5);
    return newt(K({ drop: 0.004 + 0.002 * br, sx: 1 + 0.03 * br, look, tailUp: 0.05 }), { tw: [0.04 * Math.sin(TAU * t / 3), 0.06 * Math.sin(TAU * t / 3 - 0.6), 0.1 * Math.sin(TAU * t / 1.5 - 1), 0.2 * Math.sin(TAU * t / 0.75)] }); },
  feet: (t, W) => feetOf({}, W.tz),
};
// ------------------------------------------------------------------------------------------------ skitter (its walk)
// The game's 2.6 u/s: a lizard's diagonal trot, quick and low, with the S through the spine and the tail trailing it.
const WT = 0.11;
const gw = { T: WT, duty: 0.5, v: 2.6 / U };
const gfw = { FL: { phase: 0, n: [REST_T.FL.x, REST_T.FL.z], lift: 0.035, droop: 0.6 }, HR: { phase: 0, n: [REST_T.HR.x, REST_T.HR.z], lift: 0.03, droop: 0.6 },
              FR: { phase: 0.5, n: [REST_T.FR.x, REST_T.FR.z], lift: 0.035, droop: 0.6 }, HL: { phase: 0.5, n: [REST_T.HL.x, REST_T.HL.z], lift: 0.03, droop: 0.6 } };
const walk = {
  dur: WT, loop: true, gait: gw,
  pose: (t) => { const w = TAU * t / WT;
    return newt(K({ drop: 0.032 - 0.005 * Math.abs(Math.sin(w)), s: 0.22 * Math.sin(w), pitch: 0.03 }), { tw: [-0.2 * Math.sin(w - 1.1), -0.25 * Math.sin(w - 1.8), -0.3 * Math.sin(w - 2.5), -0.35 * Math.sin(w - 3.2)] }); },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, gw, gfw[k])])),
};
const turn = (dir) => {
  const g = { T: 0.2, duty: 0.55, v: 0, omega: dir * Math.PI, pivot: [0, 0.08] };
  const gf = { FL: { phase: 0, n: [REST_T.FL.x, REST_T.FL.z], lift: 0.03, droop: 0.6 }, HR: { phase: 0.02, n: [REST_T.HR.x, REST_T.HR.z], lift: 0.03, droop: 0.6 },
               FR: { phase: 0.5, n: [REST_T.FR.x, REST_T.FR.z], lift: 0.03, droop: 0.6 }, HL: { phase: 0.52, n: [REST_T.HL.x, REST_T.HL.z], lift: 0.03, droop: 0.6 } };
  return { dur: 0.4, loop: true, gait: g,
    pose: (t) => { const w = TAU * t / 0.2; return newt(K({ drop: 0.03, s: 0.15 * dir, roll: 0.03 * Math.sin(w), look: 0.3 * dir }), { tw: [-0.2 * dir, -0.3 * dir, -0.3 * dir, -0.3 * dir] }); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])) };
};

// ------------------------------------------------------------------------------------------------ the lunge
// The game's lunge: the crouch through the 42-tick lane telegraph (front low, the haunches wiggling over its last half,
// the tail raised and whipping faster); then it shoots down the lane at 13 u/s, a stretched dart with its legs swept
// back and the tail straight, biting the hero as it passes (7); it skids to a stop at the lane's end and rests 40
// ticks, low, its flanks heaving fast and deep and slowing; then it gets up (mine).
export const TEL = 42 / 60, LANE = 3.6, SPEED = 13, HERO = 2.5;
const RUN = LANE / SPEED, SKID = 0.1, REST_T_ = 40 / 60, UPT = 0.35;
export const LUNGE_AT = TEL, CROSS = TEL + HERO / SPEED, STOP = TEL + RUN;
const CROUCH = K({ drop: 0.035, pitch: 0.1, tailUp: 0.5, head: 0.12 });
const DART = K({ drop: -0.02, pitch: -0.05, sx: 0.88, sz: 1.22, head: -0.1 });
const RESTP = K({ drop: 0.032, pitch: 0.04, head: -0.15, tailUp: -0.05 });
function lungeG(t) {
  if (t < TEL) { const k = smooth(t / 0.18), prog = t / TEL, wig = k * smooth((prog - 0.45) / 0.4);
    const g = mix(REST, CROUCH, k); g.yaw = 0.09 * Math.sin(t * 30) * wig; g.roll = 0.05 * Math.sin(t * 30 + 1) * wig; return { g, k, prog, ph: 'crouch' }; }
  if (t < STOP) { const k = smooth((t - TEL) / 0.06); return { g: mix(CROUCH, DART, k), k, ph: 'lunge' }; }
  if (t < STOP + REST_T_) { const a = t - STOP, k = smooth(a / SKID); const g = mix(DART, RESTP, k);
    const breath = Math.max(0, Math.sin(a * (9 - 3 * c01(a - 0.3)) * 1.0 + 0.5)) * k; g.sx += 0.14 * breath; return { g, k, breath, ph: 'rest' }; }
  const k = smooth((t - STOP - REST_T_) / UPT); return { g: mix(RESTP, REST, k), k, ph: 'up' };
}
const lunge = {
  dur: STOP + REST_T_ + UPT, contact: [CROSS, STOP],
  phases: [['the crouch: the Ember lane marks (42 ticks), the haunches wiggle, the tail whips', 0], ['the lunge: 13 u/s down the lane, 7 to every hero it crosses', TEL],
    ['skids to a stop at the lane\'s end', STOP], ['rests 40 ticks, flanks heaving', STOP + SKID], ['gets up (mine)', STOP + REST_T_]],
  pose: (t) => { const L = lungeG(t);
    let tw = [0, 0, 0, 0];
    if (L.ph === 'crouch') { const f = 12 + 10 * L.prog; tw = [0, 1, 2, 3].map((i) => L.k * (i >= 2 ? 0.5 : 0.15) * Math.sin(t * f - i * 0.9)); }
    if (L.ph === 'rest') tw = [0.05, 0.1, 0.15, 0.2].map((a, i) => a * Math.sin(t * 1.5 - i));
    return newt(L.g, { tw, nod: L.ph === 'rest' ? -0.12 * (L.breath || 0) : 0 }); },
  // the lane: 13 u/s from the release to its end (3.6 u), the last of it in the skid
  travel: (t) => (t < TEL ? 0 : t < STOP - 0.04 ? SPEED * (t - TEL) : t < STOP + SKID ? lerp(SPEED * (RUN - 0.04), LANE, smooth((t - STOP + 0.04) / (SKID + 0.04))) : LANE) / U,
  feet: (t, W) => { const L = lungeG(t);
    if (L.ph === 'lunge') return feetOf({ sweep: L.k, free: true }, W.tz);
    if (L.ph === 'rest') { const k = smooth((t - STOP) / SKID); return feetOf({ sweep: 1 - k, splay: k, free: k < 1 }, W.tz); }
    if (L.ph === 'up') return feetOf({ splay: 1 - L.k, free: L.k > 0 && L.k < 1, lift: Math.sin(Math.PI * L.k) }, W.tz);
    return feetOf({}, W.tz); },
};

// ------------------------------------------------------------------------------------------------ hurt
const hurt = {
  dur: 0.35, upperOnly: true,
  pose: (t) => { const k = track([[0, { p: 0 }], [0.04, { p: 1 }, 'out'], [0.15, { p: -0.25 }], [0.35, { p: 0 }]])(t).p;
    return { cp: 0.15 * k, np: 0.2 * k, hp: 0.25 * k, t1p: -0.2 * k, t2p: -0.15 * k }; },
  feet: (t, W) => feetOf({}, W.tz),
};
// ------------------------------------------------------------------------------------------------ spawn
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 0.9, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['shakes itself', 7 * FR], ['stands', 0.7]],
  pose: (t) => { const k = pulse(t, 0.25, 0.3, 0.55, 0.7); return newt(K({ s: 0.2 * Math.sin(t * 40) * k, look: 0.2 * k }), { tw: [0, 0.2, 0.3, 0.4].map((a, i) => a * Math.sin(t * 30 - i) * k) }); },
  feet: (t, W) => feetOf({}, W.tz),
};
// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it rears its head back, then sags flat onto its belly with
// its legs splaying out, the head down on the floor and the tail curling round to one side.
const death = {
  dur: 1.8, contact: [0.55],
  phases: [['struck: rears its head', 0], ['sags flat', 0.25], ['lies still', 0.9]],
  pose: (t) => { const hit = pulse(t, 0, 0.05, 0.12, 0.3), k = smooth((t - 0.25) / 0.35), curl = smooth((t - 0.4) / 0.6);
    const g = K({ drop: 0.045 * k, pitch: -0.12 * hit + 0.06 * k, roll: 0.06 * k, head: -0.4 * hit + 0.3 * k, sx: 1 + 0.06 * k, tailUp: 0.15 * hit - 0.15 * k });
    const o = newt(g, { tw: [0.15, 0.3, 0.45, 0.6].map((a) => a * curl) }); o.t1p -= 0.06 * k; o.t2p -= 0.04 * k; return o; },
  feet: (t, W) => { const k = smooth((t - 0.25) / 0.35); return feetOf({ splay: 1.2 * k, free: k > 0 && k < 1 }, W.tz); },
};
export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), lunge, hurt, spawn, death };
