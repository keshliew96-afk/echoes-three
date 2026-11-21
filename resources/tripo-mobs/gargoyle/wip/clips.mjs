// The Gargoyle's moves. Units are model units (the model is 1.0 tall; the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/gargoyle.js (it arrives as stone and does not move; a hero within 2.6 u
// or a hit wakes it: the stone cracks for 48 ticks behind an Ember ring r 1.7 round itself, then it bursts free for 12;
// awake it stalks at 1.9 u/s and slams: an Ember ring r 1.3 centred 0.9 u in front of it for 54 ticks, 13 damage;
// with no hero within 5 u for 6 s it settles back into stone) and its rig in src/render/enemies/spire.js
// buildGargoyle (stand 0 to 1, the burst, the slam's raise and down, the wings' open, the crack shake, all mapped
// below in gar()).
import { readFileSync } from 'fs';
import { track, gaitFoot, V3, smooth, lerp, clamp, addPose } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
const SK = JSON.parse(readFileSync(new URL('./rig/skel.json', import.meta.url)));
const LEGS = ['L', 'R'];
export const CFG = {
  name: 'gargoyle', unit: 1.1, base: {},
  chain: [['hips', 'b'], ['sq', 'q']],
  extras: [['spine', 'sp'], ['chest', 'ch'], ['neck', 'n'], ['head', 'h'], ['jaw', 'j'], ['tail', 'tl'], ['tail2', 'tm'],
    ['armL', 'uL'], ['armR', 'uR'], ['foreL', 'oL'], ['foreR', 'oR'], ['handL', 'kL'], ['handR', 'kR'],
    ['wingL', 'wL'], ['wingR', 'wR'], ['wtipL', 'wtL'], ['wtipR', 'wtR']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']]],
  legs: Object.fromEntries(LEGS.map((k) => [k, { kind: 'limb', b: ['f' + k, 't' + k, 'a' + k, 'c' + k] }])),
  springs: [],
};
const U = CFG.unit;
const REST = Object.fromEntries(LEGS.map((k) => [k, V3(...SK.ends['c' + k])]));
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

// The game's pose fields on this rig. st: crouched stone 0, up and hunched awake 1 (the game raises the hips 0.26 and
// straightens the legs; this one's legs are folded under it, so it rises 0.13 and sits back). raise and down: the
// slam's wind-up and the crash. burst: just broke free. step: the stride (-1..1). br: the breath. shake: the crack's
// judder in game u (two noisy sines, as the game does). look: the head turned.
const GR = Object.freeze({ st: 0, raise: 0, down: 0, burst: 0, step: 0, br: 0, shake: 0, look: 0, t: 0 });
function gar(g) {
  const { st, raise, down, burst, step, br } = g;
  const open = Math.min(1, 0.45 * st + 0.55 * raise + 0.8 * burst + 0.3 * down);
  const swing = step * 0.5;
  const sx = g.shake * (Math.sin(g.t * 71) + Math.sin(g.t * 53)) * 0.5, sz = g.shake * Math.sin(g.t * 64 + 1.3) * 0.5;
  const o = {
    ox: sx / U, oz: sz / U, oy: 0.13 * st + 0.012 * Math.abs(step) - 0.03 * down + 0.04 * raise,
    bp: 0.12 * st + 0.2 * raise - 0.25 * down, br: 0.05 * step, by: 0.05 * step,
    spp: 0.08 * st + 0.2 * raise - 0.15 * down + 0.015 * br, chp: 0.15 * raise - 0.2 * down + 0.01 * br,
    np: -0.05 * st - 0.1 * raise + 0.1 * down, hp: -0.12 * st - 0.2 * raise + 0.12 * down + 0.02 * br, hy: g.look,
    jp: -(0.35 * raise + 0.45 * burst + 0.15 * down),
    tlp: 0.12 * st + 0.1 * raise, tly: 0.06 * Math.sin(g.t * 1.3) * st, tmy: 0.1 * Math.sin(g.t * 1.3 - 1) * st,
    qsy: 0.01 * br, qsx: -0.004 * br,
  };
  for (const [s, sg] of [['L', 1], ['R', -1]]) {
    o['u' + s + 'p'] = 0.15 * st - sg * swing + 1.7 * raise + 0.25 * down * (1 - raise) + 0.6 * burst;
    o['u' + s + 'r'] = sg * (0.08 * st + 0.25 * raise + 0.5 * burst);
    o['o' + s + 'p'] = 0.25 * st + 0.9 * raise - 0.15 * down - 0.2 * burst;
    o['k' + s + 'p'] = -0.2 * st - 0.3 * raise;
    o['w' + s + 'r'] = sg * (0.9 * open + 0.03 * br * st - 0.3 * down);
    o['wt' + s + 'r'] = sg * 0.5 * open;
    o['w' + s + 'y'] = -sg * 0.25 * open;
  }
  return o;
}

// ------------------------------------------------------------------------------------------------ stone
// The game's stone: a statue does not breathe. Perched on its haunches, knuckles down, wings folded along its flanks:
// your model's own pose, held dead still.
const stone = { dur: 4, loop: true, pose: () => gar({ ...GR }), feet: allPlanted };

// ------------------------------------------------------------------------------------------------ awake idle
// 6 s. The game's awake stand and breath; mine: it looks one way then the other, shrugs its wings, shifts a foot.
const idle = {
  dur: 6, loop: true,
  pose: (t) => { const look = 0.35 * pulse(t, 0.8, 1.1, 2.0, 2.3) - 0.35 * pulse(t, 3.3, 3.6, 4.4, 4.7); const shrug = bump(t, 5.2, 0.6);
    return addPose(gar({ ...GR, st: 1, br: Math.sin(TAU * t / 3), look, t: TAU * t / 6 / 1.3 }), { wLr: 0.15 * shrug, wRr: -0.15 * shrug, qsy: 0.015 * shrug }); },
  feet: (t) => { const F = allPlanted(); F.R = steps(t, REST.R, [[2.6, 2.9, off('R', -0.01, 0, 0.04), 0.05], [3.0, 3.3, REST.R, 0.05]]); return F; },
};

// ------------------------------------------------------------------------------------------------ stalk and turns
// The game's stalk at 1.9 u/s: hunched, the hips rolling with the stride, the arms swinging opposite the legs.
const WT = 0.4, GAIT = { T: WT, duty: 0.58, v: 1.9 / U };
const GF = Object.fromEntries(LEGS.map((k, i) => [k, { phase: i * 0.5, n: [REST[k].x, REST[k].z - 0.02], lift: 0.07, droop: 0.2, push: 0.1 }]));
const walk = {
  dur: WT * 2, loop: true, gait: { ...GAIT },
  pose: (t) => gar({ ...GR, st: 1, step: Math.sin(TAU * t / WT), t: TAU * t / (WT * 2) / 1.3 }),
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: WT, duty: 0.58, v: 0, omega: dir * TAU / 1.8 };
  return {
    dur: WT * 2, loop: true, gait: g,
    pose: (t) => addPose(gar({ ...GR, st: 1, step: 0.5 * Math.sin(TAU * t / WT), t: TAU * t / (WT * 2) / 1.3 }), { by: 0.06 * dir, hy: 0.25 * dir }),
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.05 })])),
  };
};

// ------------------------------------------------------------------------------------------------ wake
// From stone. The game's crack: 48 ticks of judder (0.012 u growing by 0.03), up 0.1 of the way, the jaw creaking;
// then it bursts free: arms and wings thrown wide, the jaw wide, and it rises at the game's rate (6 a second).
export const CRACK = 48 / 60;
const wakeAt = (t) => {
  if (t < CRACK) { const wp = c01(t / CRACK); return { ...GR, st: 0.1 * smooth(wp), shake: 0.012 + 0.03 * wp, t: t, burst: 0, look: 0.05 * Math.sin(t * 9) * wp }; }
  const a = t - CRACK; const burst = Math.exp(-a * 5);
  return { ...GR, st: 1 - 0.9 * Math.exp(-6 * a), burst, t, br: Math.sin(TAU * a / 3) * c01(a / 0.5) * 0 };
};
const wake = {
  dur: CRACK + 0.8, contact: [CRACK],
  phases: [['the stone cracks', 0], ['bursts free', CRACK], ['awake', CRACK + 0.5]],
  pose: (t) => gar(wakeAt(t)),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ settle
// The game's settle: no hero near for 6 s, it sinks back onto its haunches where it stands and goes still.
const settle = {
  dur: 1.6, contact: [],
  phases: [['sinks onto its haunches', 0], ['still as stone', 1.1]],
  pose: (t) => { const k = smooth(t / 1.1); return gar({ ...GR, st: 1 - k, br: Math.sin(TAU * t / 3) * (1 - k), t }); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ slam
// The game's slam: the wind-up is the 54-tick Ember ring 0.9 u in front of it (up on its legs, rearing back, both
// fists overhead, the wings thrown open); on the beat it crashes down (0.1 s), then rises out of it (0.45 s).
export const TEL = 54 / 60;
const slamAt = (t) => {
  const raise = t < TEL ? smooth(c01(t / TEL)) ** 0.8 : 0;
  const sa = t - TEL; const down = sa < 0 ? 0 : sa < 0.1 ? smooth(sa / 0.1) : sa < 0.55 ? 1 - smooth((sa - 0.1) / 0.45) : 0;
  return { ...GR, st: 1, raise: raise * (1 - down), down, t, shake: sa > 0 && sa < 0.3 ? 0.015 * (1 - sa / 0.3) : 0 };
};
const slam = {
  dur: TEL + 0.9, contact: [TEL],
  phases: [['wind-up: the ring telegraph', 0], ['the slam', TEL], ['rises out of it', TEL + 0.1], ['stalks on', TEL + 0.55]],
  pose: (t) => gar(slamAt(t)),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { qsy: -0.05, qsx: 0.04, spp: 0.15, hp: 0.25, jp: -0.25, wLr: 0.2, wRr: -0.2, uLp: 0.12, uRp: 0.12 }, 'out'], [0.18, { qsy: 0.01, spp: 0.03 }], [0.4, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game grows every foe in over 7 frames, about 10% over. The gargoyle arrives as stone: it grows in perched, and
// stays still.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 0.8, contact: [], scale: spawnScale,
  phases: [['grows in, as stone', 0], ['still', 7 * FR]],
  pose: () => gar({ ...GR }),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it rears with its wings thrown open, then pitches forward
// onto its chest, its arms flung out in front, the wings slumping open, and lies still as stone.
const LOW = [0.026,0.026,0.026,0.026,0.026,0.026,0.026,0.026,0.026,0.026,0.026,0.026,0.026,0.026,0.026,0.026,0.024,0.020,-0.015,-0.054,-0.073,-0.072,-0.072,-0.071,-0.070,-0.070,-0.069,-0.069,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068,-0.068];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t * 30, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const death = {
  dur: 2.0, contact: [0.65],
  phases: [['struck', 0], ['pitches forward', 0.25], ['crashes down', 0.65], ['lies still', 1.1]],
  pose: (t) => { const hit = pulse(t, 0, 0.08, 0.15, 0.35), k = c01((t - 0.25) / 0.4), d = k * k, land = smooth((t - 0.65) / 0.3);
    const o = addPose(gar({ ...GR, st: 1 - d, burst: 0.8 * hit, raise: 0.25 * hit, t }),
      { bp: -0.38 * d, spp: -0.15 * d, chp: -0.1 * d, hp: 0.25 * land, jp: -0.3 * land, qsy: -0.05 * land,
        uLp: 1.1 * d, uRp: 1.1 * d, uLr: 0.5 * d, uRr: -0.5 * d, oLp: -0.35 * d, oRp: -0.35 * d,
        wLr: 0.5 * land, wRr: -0.5 * land, wtLr: 0.3 * land, wtRr: -0.3 * land });
    o.oy = (o.oy || 0) * (1 - d) - 0.06 * d + (process.env.PROBE ? 0 : -lowAt(t));
    return o; },
  feet: allPlanted,
};
export const CLIPS = process.env.PROBE ? { death } : { stone, idle, walk, turnL: turn(1), turnR: turn(-1), wake, settle, slam, hurt, spawn, death };
