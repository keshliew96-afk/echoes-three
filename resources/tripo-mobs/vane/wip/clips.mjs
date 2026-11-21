// The Vane Cock's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/vane.js (1.5 u/s, keeps 4.0-7.0 u from its target, sidestepping inside
// that band; with a clear line it swings round into the wind and marks an Ember lane 0.9 u wide from itself through the
// target, up to 8 u long, for 48 ticks, then lets fly three gust darts down the locked line, one every 9 ticks, 7 each,
// at 6.2 u/s out to 8.5 u; cooldown 230 ticks from the last dart) and its rig buildVane in src/render/enemies/spire.js
// (a hop every 1/2.4 s while it travels, in the air 55% of it at 0.26 u, a squash on landing, a restless small hop at
// rest every 1/0.35 s; on the aim a full turn in 0.5 s that overshoots and settles shivering, leaned back 0.18 rad; each
// dart jerks it back 0.3 rad and 0.08 u, stretched 8% along; the eyes swell through the aim and the volley).
import * as THREE from 'three';
import fs from 'fs';
import { gaitFoot, V3, smooth, clamp, track } from '../kit/quad.mjs';
const SK = JSON.parse(fs.readFileSync(new URL('./rig/skel.json', import.meta.url)));
const END = Object.fromEntries(Object.entries(SK.ends).map(([k, v]) => [k, V3(...v)]));
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'vane', unit: 1.0,
  chain: [['hips', 'b'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['tail1', 't1'], ['tail2', 't2'], ['wingL', 'wL'], ['wingR', 'wR'], ['spindle', 'sd']],
  scales: [['hips', ['hsx', 'hsy', 'hsz']]],
  legs: {
    HL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'], pole: [0.15, 0, 1] }, HR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'], pole: [-0.15, 0, 1] },
  },
  springs: [{ bone: 'tail2', k: 200, c: 9, max: 0.4 }, { bone: 'spindle', k: 160, c: 6, max: 0.5 }],
};
const U = CFG.unit;
const LEGS = ['HL', 'HR'];
const REST_T = { HL: END.toeL.clone(), HR: END.toeR.clone() };
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const lerp = (a, b, u) => a + (b - a) * u;
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));

// --- pose fields: air (u up, the hop), drop (u, the crouch), lean (+ forward), roll (+ toward its right), spin (rad, the
// whole bird turning, + to its left), head (+ nose down), look (+ to its left), crow (the neck stretched up and forward),
// tail (+ the fan raised), wings (+ open), sx / sy / sz (squash), tip (rad, the death's fall to its right side).
const REST = Object.freeze({ air: 0, drop: 0, lean: 0, roll: 0, spin: 0, head: 0, look: 0, crow: 0, tail: 0, wings: 0, sx: 1, sy: 1, sz: 1, tip: 0, push: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
// the fall pivots on its right side at the floor
const PIV = V3(-0.13, 0, 0), JH = V3(0, 0.36, 0);
function tipShift(th) { const c = Math.cos(th), s = Math.sin(th), dx = PIV.x - JH.x, dy = PIV.y - JH.y; return [dx - (dx * c - dy * s), dy - (dx * s + dy * c)]; }
function cock(g) {
  const [tx, ty] = tipShift(g.tip);
  return {
    ox: tx, oy: (g.air - g.drop) / U + ty + 0.36 * (g.sy - 1) * 0, oz: g.push / U,
    bp: -g.lean, by: g.spin, br: g.roll + g.tip,
    cp: -0.3 * g.lean + 0.15 * g.crow, np: -0.25 * g.head - 0.35 * g.crow, hp: -0.6 * g.head + 0.3 * g.crow, hy: g.look, ny: 0.4 * g.look,
    t1p: -0.35 * g.tail, t2p: -0.25 * g.tail, wLr: 0.75 * g.wings, wRr: -0.75 * g.wings, wLp: 0.2 * g.wings, wRp: 0.2 * g.wings,
    hsx: g.sx - 1, hsy: g.sy - 1, hsz: g.sz - 1,
  };
}
// the feet: planted where they stand (with the travel), or carried with the body (in the air, turning, falling)
function feetOf(g, o = {}, tz = 0) {
  const out = {};
  const c = Math.cos(g.spin), s = Math.sin(g.spin);
  for (const k of LEGS) {
    const p = REST_T[k].clone();
    if (g.spin) p.set(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
    p.z += tz; p.y += 0.003 + (o.up || 0);
    if (g.tip) { const v = p.clone().sub(JH); const ct = Math.cos(g.tip), st = Math.sin(g.tip); p.set(JH.x + v.x * ct - v.y * st, JH.y + v.x * st + v.y * ct, p.z); const [tx, ty] = tipShift(g.tip); p.x += tx; p.y += ty; }
    out[k] = { p, lock: !o.free, curl: 0, yaw: g.spin || undefined };
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ idle
// The game's restless hop at rest (one every 1/0.35 s, 0.06 u). Mine on top: it turns its head to look about, the tail
// fan shifting, a ruffle of the wing plates.
const IDUR = 171 / 60; // 1/0.35 s
const hopAt = (ph, amp) => ({ air: ph < 0.55 ? amp * Math.sin(ph / 0.55 * Math.PI) : 0, sq: ph >= 0.55 && ph < 0.72 ? Math.sin((ph - 0.55) / 0.17 * Math.PI) : 0 });
const idle = {
  dur: IDUR, loop: true,
  pose: (t) => { const ph = t / IDUR, h = hopAt(ph, 0.045), look = 0.45 * pulse(t, 1.2, 1.4, 1.8, 2.0) - 0.3 * pulse(t, 2.0, 2.15, 2.5, 2.7);
    return cock(K({ air: h.air, sy: 1 - 0.05 * h.sq, sx: 1 + 0.03 * h.sq, sz: 1 + 0.03 * h.sq, look, head: -0.1 * pulse(t, 1.2, 1.4, 1.8, 2.0), tail: 0.05 * Math.sin(TAU * t / IDUR), wings: 0.06 * pulse(t, 0.7, 0.8, 0.9, 1.1) })); },
  feet: (t, W) => { const h = hopAt(t / IDUR, 0.045); return feetOf(REST, { up: h.air * 0.9, free: h.air > 0.002 }, W.tz); },
};
// ------------------------------------------------------------------------------------------------ walk (it hops)
// The game's travel: a hop every 1/2.4 s at 1.5 u/s, in the air 55% of it, 0.26 u up (scaled to this bird, 0.16), a
// squash on landing; it rocks side to side hop to hop. On your bird both feet push off and land together.
const WT = 25 / 60, AIR = 0.16;
const gw = { T: WT, duty: 0.45, v: 1.5 / U };
const gfw = { HL: { phase: 0.45, n: [REST_T.HL.x, REST_T.HL.z], lift: 0.01, droop: 0.3, push: 0.1 }, HR: { phase: 0.45, n: [REST_T.HR.x, REST_T.HR.z], lift: 0.01, droop: 0.3, push: 0.1 } };
const hopPose = (t, T, amp, dir = 0) => { const ph = (t / T) % 1, h = hopAt(ph, amp), rock = Math.sin(TAU * t / (2 * T));
  return K({ air: h.air, drop: 0.03 * h.sq + 0.02 * pulse(ph, 0.85, 1.0, 1.0, 1.01), lean: 0.12 + 0.06 * h.sq, roll: 0.06 * rock, sy: 1 - 0.1 * h.sq, sx: 1 + 0.06 * h.sq, sz: 1 + 0.06 * h.sq, tail: -0.15 * h.air / Math.max(amp, 1e-6) + 0.1 * h.sq, wings: 0.25 * h.air / Math.max(amp, 1e-6), head: -0.1 * h.sq, look: 0.2 * dir }); };
const walk = {
  dur: WT * 2, loop: true, gait: { ...gw },
  pose: (t) => cock(hopPose(t, WT, AIR)),
  feet: (t) => Object.fromEntries(LEGS.map((k) => { const f = gaitFoot(t, gw, gfw[k]); const h = hopAt((t / WT) % 1, AIR); f.p.y += h.air * 0.85; return [k, f]; })),
};
const turn = (dir) => {
  const g = { T: WT, duty: 0.45, v: 0, omega: dir * 0.5 * Math.PI, pivot: [0, 0] };
  return { dur: WT * 2, loop: true, gait: g,
    pose: (t) => cock(hopPose(t, WT, 0.08, dir)),
    feet: (t) => Object.fromEntries(LEGS.map((k) => { const f = gaitFoot(t, g, gfw[k]); const h = hopAt((t / WT) % 1, 0.08); f.p.y += h.air * 0.85; return [k, f]; })) };
};

// ------------------------------------------------------------------------------------------------ the volley
// The game's aim (48 ticks): it swings round a full turn into the wind in 0.5 s, overshoots and settles shivering on the
// line, leaned back 0.18 rad, stretched up 6%, the eyes swelling (on your bird: a hop as it spins, landing on the line,
// the wings half open and the tail fanned). Then the three darts down the locked line, one every 9 ticks: each jerks it
// back 0.3 rad and 0.08 u, stretched 8% along (on yours the head thrusts out with the dart as the body recoils). Then it
// settles (mine).
export const TEL = 48 / 60, EVERY = 9 / 60, DARTS = [TEL, TEL + EVERY, TEL + 2 * EVERY], DART_V = 6.2, HERO = 5.5;
const VDUR = 138 / 60;
export const SPIN_T = 0.5;
const fireK = (t) => { let k = 0; for (const d of DARTS) { const a = t - d; if (a >= 0 && a < 0.14) k = Math.max(k, a < 0.03 ? a / 0.03 : 1 - smooth((a - 0.03) / 0.11)); } return k; };
const aimK = (t) => c01(t / 0.12) * (1 - smooth((t - DARTS[2] - 0.15) / 0.45));
const volleyK = (t) => pulse(t, TEL - 0.05, TEL, DARTS[2] + 0.1, DARTS[2] + 0.5);
function volleyG(t) {
  const a = aimK(t), f = fireK(t), v = volleyK(t);
  let spin = 0;
  if (t < SPIN_T) spin = Math.PI * 2 * (1 - smooth(t / SPIN_T));
  else if (t < 1.6) spin = 0.32 * Math.exp(-(t - SPIN_T) * 5) * Math.sin((t - SPIN_T) * 20);
  const air = t < SPIN_T ? 0.07 * Math.sin(Math.PI * t / SPIN_T) : 0;
  const land = pulse(t, SPIN_T - 0.02, SPIN_T + 0.04, SPIN_T + 0.06, SPIN_T + 0.2);
  const shiver = t > SPIN_T && t < TEL ? 0.03 * Math.sin(t * 37) : 0;
  return K({ air, spin, drop: 0.015 * a + 0.03 * land, lean: -0.18 * a - 0.3 * f + 0.08 * v, roll: shiver, push: -0.08 * f, sy: 1 + 0.06 * a * (t < TEL ? 1 : 0) - 0.06 * land, sz: 1 + 0.08 * f, sx: 1 + 0.04 * land,
    wings: 0.45 * a + 0.2 * f, tail: 0.5 * a, head: 0.05 * a - 0.35 * f, crow: 0.25 * a + 0.5 * f });
}
const volley = {
  dur: VDUR, contact: DARTS,
  phases: [['swings round into the wind: the Ember lane marks (48 ticks)', 0], ['settles shivering on the line', SPIN_T], ['dart 1: 7, down the locked line', DARTS[0]], ['dart 2', DARTS[1]], ['dart 3', DARTS[2]], ['settles (mine)', DARTS[2] + 0.2]],
  pose: (t) => cock(volleyG(t)),
  feet: (t, W) => { const g = volleyG(t); return feetOf(t < SPIN_T ? g : REST, { up: g.air * 0.9, free: t < SPIN_T }, W.tz); }, // planted on the line once it lands
};

// ------------------------------------------------------------------------------------------------ hurt
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = track([[0, { p: 0 }], [0.04, { p: 1 }, 'out'], [0.15, { p: -0.2 }], [0.4, { p: 0 }]])(t).p;
    return { cp: 0.12 * k, np: 0.25 * k, hp: 0.3 * k, t1p: 0.2 * k, t2p: 0.15 * k, wLr: 0.3 * k, wRr: -0.3 * k }; },
  feet: (t, W) => feetOf(REST, {}, W.tz),
};
// ------------------------------------------------------------------------------------------------ spawn
// The game's grow-in (7 frames, about 10% over); mine after: it shakes its plates down and stretches up.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
export const SPAWN_AT = 0.6;
const spawn = {
  dur: 1.0, contact: [SPAWN_AT], scale: spawnScale,
  phases: [['grows in', 0], ['shakes its plates', 0.25], ['stretches up', SPAWN_AT]],
  pose: (t) => { const sh = pulse(t, 0.25, 0.3, 0.5, 0.6), up = pulse(t, 0.5, SPAWN_AT, 0.7, 0.95);
    return cock(K({ roll: 0.06 * Math.sin(t * 50) * sh, wings: 0.3 * sh + 0.4 * up, tail: 0.3 * up, crow: 0.5 * up, sy: 1 + 0.04 * up })); },
  feet: (t, W) => feetOf(REST, {}, W.tz),
};
// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it jerks back with its wings flung open; then it topples over
// onto its right side with a clank, the tail fan striking the floor, the legs sticking out stiff.
export const DEATH_HIT = 0.02, DEATH_CLANK = 0.95;
const death = {
  dur: 1.8, contact: [DEATH_HIT, DEATH_CLANK],
  phases: [['struck: jerks back, wings flung open', 0], ['topples onto its side', 0.3], ['clank: down', DEATH_CLANK], ['lies still', 1.2]],
  pose: (t) => { const hit = pulse(t, 0, 0.05, 0.15, 0.4), f = c01((t - 0.3) / 0.65), tip = 1.42 * f * f, bounce = 0.06 * Math.sin(Math.PI * c01((t - DEATH_CLANK) / 0.2)) * (t > DEATH_CLANK ? 1 : 0);
    return cock(K({ lean: -0.25 * hit, wings: 0.8 * hit + 0.15 * f, head: -0.3 * hit + 0.3 * f, tail: 0.3 * hit - 0.2 * f, tip: tip - bounce, crow: 0.3 * hit })); },
  feet: (t, W) => { const f = c01((t - 0.3) / 0.65), tip = 1.42 * f * f; return feetOf(K({ tip }), { free: t > 0.3 }, W.tz); },
};
export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), volley, hurt, spawn, death };
