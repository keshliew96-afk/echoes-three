// The Hush's moves. Units are model units (the model is 1 tall; the page draws it 2.6 u tall, CFG.unit, the game's scale).
// Timings come from the game: HUSH in src/sim/bosses/hush.js (drifts at 1.25 u/s; Still Note: 50-tick ring at its target;
// Unringing: 56-tick lane; the Great Hush: 96-tick ring round itself, then drained 90 ticks; a Stillness at 75, 50 and 25
// percent) and the poses of buildHush in src/render/boss/spire.js (it floats about 0.22 u up and bobs; for the Great Hush it
// rises about 0.55 u with its sleeves spread and the veil flared; drained it sinks to the floor, tips forward and the head
// droops; the raised hand holds a finger to the bell and points for the note). Beats: strike 2.5 frames, held 3 frames.
// It has no feet: nothing is planted. The five small bells are moved by the page, as the game's code moves them.
import fs from 'fs';
import * as THREE from 'three';
import { track, V3, smooth, lerp, clamp, EASE } from './quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_;
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const qAx = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const XA = V3(1, 0, 0), YA = V3(0, 1, 0), ZA = V3(0, 0, 1);
const qPYR = (p = 0, y = 0, r = 0) => qAx(YA, y).multiply(qAx(XA, -p)).multiply(qAx(ZA, r));
const UNIT = 2.6; const HOV = 0.22 / UNIT;

// ---- the cloak: eight columns hang from the hips (the Cantor's robe). fl flares the upper cloak out, f2 the hem on top of
// it; kp, kr, ky swing the whole skirt (+kp: the hem forward, +kr: the hem to its left, +ky: twist), against the hips.
const SK = skel.robe.cols;
const colDir = Array.from({ length: SK }, (_, k) => { const a = 2 * Math.PI * k / SK; return V3(Math.sin(a), 0, Math.cos(a)); });
const colAx = colDir.map((d) => V3(-d.z, 0, d.x));
const skAQ = (k) => (p) => { const d = colDir[k]; const lean = (p.kp || 0) * d.z + (p.kr || 0) * d.x;
  return qPYR(p.kp || 0, p.ky || 0, -(p.kr || 0)).multiply(qAx(colAx[k], (p.fl || 0) + 0.35 * lean)); };
const skBQ = (k) => (p) => { const d = colDir[k]; const lean = (p.kp || 0) * d.z + (p.kr || 0) * d.x; return qAx(colAx[k], (p.f2 || 0) + 0.25 * lean); };

// ---- the arms. s?p swings the upper arm forward, s?r raises it out to its side, s?y turns it; e?p bends the elbow, e?y turns
// the forearm in; w?p, w?r the wrist; fL the raised finger (+ bends it forward). 0 is the pose as sent: the left arm raised
// with the finger at the bell's mouth, the right arm hanging. The right side is the left mirrored.
const SG = { L: 1, R: -1 };
const armQ = (pre, s) => (p) => qPYR(p[pre + s + 'p'] || 0, (p[pre + s + 'y'] || 0) * SG[s], (p[pre + s + 'r'] || 0) * SG[s]);

export const CFG = {
  name: 'hush', unit: UNIT, floor: false,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [
    ...['L', 'R'].flatMap((s) => [['sh' + s, armQ('s', s)], ['el' + s, armQ('e', s)], ['wr' + s, armQ('w', s)]]), ['fiL', (p) => qPYR(p.fLp || 0, 0, 0)],
    ['orbit', () => new THREE.Quaternion()], ...Array.from({ length: skel.bells.n }, (_, k) => ['bell' + k, () => new THREE.Quaternion()]),
    ...Array.from({ length: SK }, (_, k) => ['skA' + k, skAQ(k)]), ...Array.from({ length: SK }, (_, k) => ['skB' + k, skBQ(k)])],
  slides: [], scales: [], legs: {},
  springs: Array.from({ length: SK }, (_, k) => ({ bone: 'skB' + k, k: 160, c: 10, max: 0.3, rate: 0.2 })),
};

// ---- one pose key. ox, oy, oz: the body off its hover (oy 0 is the hem 0.22 u up). bp (+ back), by, br: the hips; sp, cp:
// spine and chest pitch; cy: chest turn; np, hp, hy, hr: neck and the bell head (+hp tips the bell's mouth up). Arms per side:
// Lap, Lar, Lay, Le, Ley, Lwp, Lwr, fL (the finger); the right arm (Rap, ...) stays 0, its hand being fused to the hem. fl, f2, kp, kr, ky: the cloak.
const K = (o) => ({ ox: 0, oy: 0, oz: 0, bp: 0, by: 0, br: 0, sp: 0, cp: 0, cy: 0, np: 0, hp: 0, hy: 0, hr: 0,
  Lap: 0, Lar: 0, Lay: 0, Le: 0, Ley: 0, Lwp: 0, Lwr: 0, fL: 0, Rap: 0, Rar: 0, Ray: 0, Re: 0, Rwp: 0, Rwr: 0,
  fl: 0, f2: 0, kp: 0, kr: 0, ky: 0, ...o });
function chans(k) {
  // the cloak hangs: a lean of the hips is mostly taken back out of the skirt, so it keeps falling to the floor
  const o = { ox: k.ox, oy: HOV + k.oy, oz: k.oz, bp: k.bp, by: k.by, br: k.br, sp: k.sp, cp: k.cp, cy: k.cy, np: k.np, hp: k.hp, hy: k.hy, hr: k.hr,
    fl: k.fl, f2: k.f2, kp: k.kp - 0.75 * k.bp, kr: k.kr - 0.75 * k.br, ky: k.ky, fLp: k.fL };
  for (const s of ['L', 'R']) {
    o['s' + s + 'p'] = k[s + 'ap']; o['s' + s + 'r'] = k[s + 'ar']; o['s' + s + 'y'] = k[s + 'ay'];
    o['e' + s + 'p'] = k[s + 'e']; o['e' + s + 'y'] = k[s + 'ey'] || 0; o['w' + s + 'p'] = k[s + 'wp']; o['w' + s + 'r'] = k[s + 'wr'];
  }
  return o;
}
const P = (k) => chans(k);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const S1 = (t, T, ph = 0) => Math.sin(2 * Math.PI * (t / T + ph));

// ------------------------------------------------------------------------------------------------ idle
// 6 s. It hangs in the air, still: a slow bob, the cloak swinging a beat behind it, the bell head tipping as if listening,
// the finger held to the bell's mouth (hush), the hanging hand turning a little. At 3.6 s the finger presses to the bell once.
const IT = 6;
const idleK = (t) => K({ oy: 0.012 * S1(t, IT), bp: 0.012 * S1(t, IT, 0.15), br: 0.015 * S1(t, IT, 0.4), sp: 0.01 * S1(t, IT / 2, 0.2), cp: 0.012 * S1(t, IT / 2, 0.25),
  np: 0.02 * S1(t, IT, 0.5), hp: 0.03 * S1(t, IT, 0.6) - 0.04 * bump(t, 3.7, 0.9), hr: 0.05 * S1(t, IT, 0.05), hy: 0.06 * S1(t, IT, 0.8),
  Lap: 0.02 * S1(t, IT, 0.3), Lwp: 0.05 * bump(t, 3.6, 0.8), fL: 0.12 * bump(t, 3.6, 0.6),
  kp: 0.025 * S1(t, IT / 2, 0.4), kr: 0.025 * S1(t, IT, 0.6), fl: 0.015 * S1(t, IT / 2, 0.45), ky: 0.02 * S1(t, IT, 0.2) });
const idle = { dur: IT, loop: true, pose: (t) => P(idleK(t)), feet: () => ({}) };

// ------------------------------------------------------------------------------------------------ drift, turn
// It drifts at the game's 1.25 u/s, leaning into it a little (the game's 0.06): the cloak trails and ripples, the head stays level.
const GT = 2.4; const VEL = 1.25 / UNIT;
const walkK = (t) => K({ oy: 0.01 * S1(t, GT / 2), bp: -0.06, cp: 0.01, np: 0.02, hp: 0.04, br: 0.015 * S1(t, GT),
  kp: -0.16 + 0.04 * S1(t, GT / 2, 0.3), kr: 0.035 * S1(t, GT, 0.2), fl: 0.05 + 0.025 * S1(t, GT / 2, 0.4), f2: 0.04 * S1(t, GT / 2, 0.6), Lap: 0.02 * S1(t, GT, 0.1), ky: 0.03 * S1(t, GT, 0.5) });
const walk = { dur: GT, loop: true, travel: (t) => VEL * t, pose: (t) => P(walkK(t)), feet: () => ({}) };
// the game turns it to face its target at once; here it turns 90 degrees a second, the cloak twisting a beat behind
export const TURN_DEG = 90;
const TT = 1.0;
const turn = (dir) => ({ dur: TT, loop: true, pose: (t) => P(K({ ...idleK(0), br: 0.04 * dir, cy: 0.05 * dir, hy: 0.1 * dir, ky: -0.16 * dir, kr: -0.04 * dir, oy: 0.006 * S1(t, TT) })), feet: () => ({}) });

// ------------------------------------------------------------------------------------------------ Still Note
// aim (the 50-tick ring at its target less one strike: the finger leaves the bell and the arm reaches out at the target, the bell
// head turns to it), the note (2.5 frames on the hit: the finger flicks down, as if pressing the sound out of the ring; the
// cloak jolts), held (3 frames), the finger goes back to the bell.
const NT = { hit: 50 / 60 }; NT.aim = NT.hit - STRIKE; NT.held = NT.hit + HOLD; NT.end = NT.held + 0.7;
// the left arm's poses, solved for the direction of the upper arm, the forearm and the finger (scripts/armsolve.py)
const POINT = { Lap: 0.73, Lar: -0.77, Lay: 0.5, Le: -2.33, Ley: 1.43, Lwp: -0.11, fL: -0.45 }; // at the target on the floor ahead
const half = (o, f = 0.5) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v * f]));
const note = {
  dur: NT.end, contact: [NT.hit], kinds: ['note'], cues: { ring: [0, NT.hit] }, phases: [['aim', 0], ['the note', NT.aim], ['held', NT.hit], ['back to the bell', NT.held]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.22, K({ oy: 0.006, bp: 0.02, cp: 0.02, hp: 0.04, ...half(POINT, 0.45), kp: 0.02 })],
    [NT.aim, K({ oy: 0.014, bp: 0.03, sp: 0.02, cp: 0.04, np: -0.02, hp: -0.06, ...POINT, fl: -0.03 })],
    [NT.hit, K({ oy: -0.01, oz: 0.004, bp: -0.04, sp: -0.02, cp: -0.03, np: -0.04, hp: -0.12, ...POINT, Lap: 0.78, Lwp: 0.25, fL: 0.05, fl: 0.08, f2: 0.06 }), 'snap'],
    [NT.held, K({ oy: -0.012, oz: 0.004, bp: -0.045, sp: -0.02, cp: -0.03, np: -0.04, hp: -0.13, ...POINT, Lap: 0.79, Lwp: 0.28, fL: 0.08, fl: 0.09, f2: 0.07 })],
    [NT.held + 0.22, K({ oy: 0.006, bp: 0.01, hp: -0.04, ...half(POINT, 0.4), fl: 0.02 })],
    [NT.end, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ Unringing
// draw (the 56-tick lane warning less one strike: it draws back off the lane, tips its bell head back so the cracked mouth faces
// down the lane, and lifts both arms forward, the finger off the bell), unring (2.5 frames on the resolve: it lunges, the bell
// head swings down the lane like a struck bell with no sound, both hands thrust along it, the cloak flung back), held, settle.
const UT = { hit: 56 / 60 }; UT.draw = UT.hit - STRIKE; UT.held = UT.hit + HOLD; UT.end = UT.held + 0.75;
const THRUST = { Lap: 0.92, Lar: -0.39, Lay: 0.24, Le: -2.25, Ley: 1.06, Lwp: -0.38, fL: -0.23 }; // the hand thrust down the lane
const unring = {
  dur: UT.end, contact: [UT.hit], kinds: ['lance'], cues: { lane: [0, UT.hit] }, phases: [['draw', 0], ['unring', UT.draw], ['held', UT.hit], ['settle', UT.held]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.25, K({ oy: 0.01, oz: -0.006, bp: 0.06, sp: 0.03, cp: 0.04, np: 0.04, hp: 0.1, Lwp: -0.1, fL: -0.1, kp: 0.04 })],
    [UT.draw, K({ oy: 0.022, oz: -0.016, bp: 0.12, sp: 0.06, cp: 0.08, np: 0.1, hp: 0.28, ...half(THRUST, 0.3), fl: -0.05, kp: 0.08 })],
    [UT.hit, K({ oy: -0.012, oz: 0.03, bp: -0.16, sp: -0.06, cp: -0.08, np: -0.12, hp: -0.38, ...THRUST, fl: 0.08, f2: 0.06, kp: -0.12 }), 'snap'],
    [UT.held, K({ oy: -0.013, oz: 0.032, bp: -0.17, sp: -0.065, cp: -0.085, np: -0.13, hp: -0.4, ...THRUST, Lap: 0.94, fl: 0.09, f2: 0.07, kp: -0.13 })],
    [UT.held + 0.22, K({ oy: 0.008, oz: 0.016, bp: -0.04, sp: -0.01, cp: -0.02, np: -0.03, hp: -0.1, ...half(THRUST, 0.45), fl: 0.03, kp: 0.04 })],
    [UT.held + 0.47, K({ oy: -0.003, oz: 0.004, bp: 0.01, hp: 0.02, ...half(THRUST, 0.1)})],
    [UT.end, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ the Great Hush
// rise (the 96-tick ring round itself less one strike: it rises 0.55 u, the sleeves spread wide and up, the veil flares, the head
// tips back; the crack and the bells blaze, the page), the hush (2.5 frames on the hit: the arms flung wide, the cloak at its
// widest), held (3 frames), then DRAINED (the sim's 90 ticks): it drops to the floor, tips forward, the bell head droops and the
// arms hang limp; the cloak pools on the floor. Then it lifts back into its hover and the finger goes back to the bell.
const GH = { hit: 96 / 60 }; GH.rise = GH.hit - STRIKE; GH.held = GH.hit + HOLD; GH.drop = GH.held + 0.28; GH.wake = GH.hit + 90 / 60; GH.end = GH.wake + 0.8;
const RISE = 0.21; const LOW = -HOV + 0.012;
const SPREAD_L = { Lap: 1.93, Lar: 1.92, Lay: -0.94, Le: -2.02, Ley: 1.05, Lwp: -0.83, fL: 0.34 }; // out to its side and up
// the right hand is fused to the cloak's hem in the export, so the right arm stays down and sways with the cloak
const SPREAD = { ...SPREAD_L };
const LIMP = { Lap: -0.14, Lar: -0.26, Lay: 0.8, Le: -2.18, Ley: 0.66, Lwp: -0.52, fL: -0.08 }; // hanging limp
const drained = (t) => K({ oy: LOW + 0.004 * Math.sin(2 * Math.PI * t / 1.5), bp: -0.22, sp: -0.08, cp: -0.1, np: -0.12, hp: -0.42, ...LIMP, Lap: 0.1, fl: 0.32, f2: 0.22, kp: 0.05 });
const great = {
  dur: GH.end, contact: [GH.hit, GH.drop], kinds: ['great', 'thud'], cues: { ring: [0, GH.hit], drained: [GH.held, GH.wake] },
  phases: [['rise', 0], ['the hush', GH.rise], ['held', GH.hit], ['drained', GH.held], ['wake', GH.wake]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.35, K({ oy: 0.05, bp: 0.02, sp: 0.02, cp: 0.03, np: 0.02, hp: 0.06, ...half(SPREAD_L, 0.35), fl: 0.05, kp: 0.03 })],
    [GH.rise - 0.25, K({ oy: RISE * 0.9, bp: 0.05, sp: 0.04, cp: 0.06, np: 0.05, hp: 0.12, ...SPREAD, ...half(SPREAD_L, 0.9), fl: 0.14, f2: 0.08, kp: 0.04 })],
    [GH.rise, K({ oy: RISE, bp: 0.06, sp: 0.05, cp: 0.07, np: 0.06, hp: 0.16, ...SPREAD, fl: 0.18, f2: 0.1, kp: 0.04 })],
    [GH.hit, K({ oy: RISE - 0.01, bp: 0.02, sp: 0.02, cp: 0.04, np: 0.04, hp: 0.12, ...SPREAD, Lar: 2.05, fl: 0.3, f2: 0.18 }), 'snap'],
    [GH.held, K({ oy: RISE - 0.012, bp: 0.02, sp: 0.02, cp: 0.04, np: 0.04, hp: 0.12, ...SPREAD, Lar: 2.07, fl: 0.32, f2: 0.2 })],
    [GH.held + 0.1, K({ oy: RISE * 0.6, bp: -0.02, sp: 0.0, cp: 0.0, np: 0.0, hp: 0.0, ...half(SPREAD_L, 0.6), fl: 0.2, f2: 0.12 })],
    [GH.drop, { ...drained(0), oy: LOW - 0.006, bp: -0.26, hp: -0.48, fl: 0.36, f2: 0.25 }, 'in'],
    [GH.drop + 0.16, drained(0)],
    [GH.wake, drained(0)],
    [GH.wake + 0.35, K({ oy: 0.02, bp: 0.02, sp: 0.01, cp: 0.02, np: 0.0, hp: 0.04, ...half(LIMP, 0.3), fl: 0.04, kp: -0.04 }), 'out'],
    [GH.end, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ a Stillness
// At 75, 50 and 25 percent it stills one of its bells and the Spire's creatures come. It lifts its finger high over its head,
// holds, then brings it down to the bell's mouth hard (the page stops a bell then: it drops and goes grey) and bows its head.
// The game follows each Stillness with a Great Hush; press the Great Hush for it.
const ST = { up: 0.55, still: 0.95, end: 1.8 };
const HIGH = { Lap: 2.47, Lar: 0.15, Lay: -0.41, Le: -2.1, Ley: 0.88, Lwp: -0.85, fL: 0.07 }; // the finger straight up over its head
const stillness = {
  dur: ST.end, contact: [ST.still], kinds: ['still'], cues: { still: [ST.still] }, phases: [['finger up', 0], ['hold', ST.up], ['still a bell', ST.still - STRIKE], ['bow', ST.still + HOLD], ['settle', 1.4]],
  pose: (t) => P(track([[0, idleK(0)],
    [ST.up, K({ oy: 0.03, bp: 0.04, sp: 0.03, cp: 0.05, np: 0.06, hp: 0.16, ...HIGH, fl: 0.05 }), 'out'],
    [ST.still - STRIKE, K({ oy: 0.034, bp: 0.045, sp: 0.03, cp: 0.05, np: 0.07, hp: 0.18, ...HIGH, Lap: 2.52, fl: 0.06 })],
    [ST.still, K({ oy: -0.012, bp: -0.05, sp: -0.03, cp: -0.05, np: -0.06, hp: -0.16, Lap: 0.02, Le: 0.05, Lwp: 0.1, fL: 0.2, fl: 0.1, f2: 0.08 }), 'snap'],
    [ST.still + HOLD, K({ oy: -0.014, bp: -0.055, sp: -0.035, cp: -0.055, np: -0.065, hp: -0.18, Lap: 0.02, Le: 0.06, Lwp: 0.12, fL: 0.22, fl: 0.11, f2: 0.09 })],
    [1.4, K({ oy: -0.004, bp: -0.03, sp: -0.02, cp: -0.03, np: -0.04, hp: -0.12, fL: 0.08, fl: 0.03 })],
    [ST.end, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ hurt, heavy hit
// hurt plays on top of anything: the bell head knocked back and aside, the chest jolts.
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => { const f = pulse(t, 0, 0.05, 0.13, 0.42), g = pulse(t, 0.12, 0.2, 0.26, 0.42);
    return { cp: 0.1 * f - 0.03 * g, np: 0.08 * f, hp: 0.16 * f - 0.05 * g, hy: 0.18 * f, hr: 0.16 * f - 0.04 * g, cy: 0.06 * f }; },
  feet: () => ({}),
};
// It is pushed back 0.3 u through the air: the hips knocked back, the cloak streams forward, the finger is knocked off the bell
// and the arm flies out; it catches itself, the cloak swings back past it, and the finger goes back to the bell.
const HB = -0.3 / UNIT;
const heavyHit = {
  dur: 1.1, contact: [0], kinds: ['taken'], travel: (t) => HB * EASE.out(clamp(t / 0.32)), phases: [['hit', 0], ['pushed back', 0.07], ['catch', 0.36], ['square up', 0.7]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.07, K({ oy: 0.016, oz: -0.008, bp: 0.22, sp: 0.08, cp: 0.1, np: 0.1, hp: 0.24, ...half(SPREAD_L, 0.35), kp: 0.26, fl: 0.08, f2: 0.08 }), 'out'],
    [0.36, K({ oy: 0.008, oz: -0.003, bp: 0.08, sp: 0.03, cp: 0.03, np: 0.02, hp: 0.06, ...half(SPREAD_L, 0.15), kp: 0.12, fl: 0.03 })],
    [0.55, K({ oy: -0.01, bp: -0.06, sp: -0.02, cp: -0.02, hp: -0.05, kp: -0.1, fl: 0.02 })],
    [0.8, K({ oy: 0.003, bp: 0.015, kp: 0.03 })],
    [1.1, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ spawn
// It is seen coming out of the floor: it grows in the spawn-in's seven frames bowed low with the cloak pooled, rises into its
// hover, lifts its bell head, and lays its finger on the bell's mouth.
const GROW = 7 / 60;
const spawnLow = K({ oy: LOW, bp: -0.2, sp: -0.1, cp: -0.12, np: -0.1, hp: -0.4, ...LIMP, fl: 0.34, f2: 0.22 });
const spawn = {
  dur: 1.6, contact: [0.95], kinds: ['still'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / GROW))), phases: [['grow', 0], ['rise', GROW], ['head up', 0.55], ['hush', 0.85], ['float', 1.2]],
  pose: (t) => P(track([[0, spawnLow], [GROW + 0.08, spawnLow],
    [0.55, K({ oy: 0.02, bp: 0.0, sp: 0.0, cp: 0.0, np: 0.02, hp: 0.06, ...half(LIMP, 0.35), fl: 0.08, f2: 0.04 }), 'out'],
    [0.85, K({ oy: 0.012, np: 0.03, hp: 0.1, ...half(LIMP, 0.08), fl: 0.03 })],
    [0.95, K({ oy: -0.004, np: -0.02, hp: -0.06, Lwp: 0.06, fL: 0.12, fl: 0.04 }), 'snap'],
    [1.2, K({ oy: 0.004, hp: -0.02, fL: 0.04 })],
    [1.6, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ death
// It falls silent for good: a jolt throws the bell head back and the finger off the bell, the arms lift out; then the float
// fails and it sinks, the cloak crumpling and spreading on the floor, the body folding forward into it until the bell head lies
// on the heap and the arms hang limp across it. (The page lets the bells drop to the floor and go grey, and the crack go dark.)
const DT = { jolt: 0.1, hang: 0.55, sink: 1.0, down: 1.55, still: 2.1 };
const DY = -HOV - 0.147;
const deadK = K({ oy: DY, bp: -0.35, sp: -0.35, cp: -0.35, np: -0.3, hp: -0.55, ...LIMP, Lap: 0.35, fl: 0.95, f2: 0.42, kp: 0.1 });
const death = {
  dur: 2.7, sinks: true, contact: [DT.jolt, DT.down], kinds: ['taken', 'thud'], cues: { out: [DT.hang, DT.still] }, phases: [['jolt', 0], ['hang', 0.3], ['sinks', DT.hang], ['crumples', DT.sink], ['still', DT.down + 0.2]],
  pose: (t) => P(track([[0, idleK(0)],
    [DT.jolt, K({ oy: 0.02, oz: -0.006, bp: 0.1, sp: 0.04, cp: 0.06, np: 0.1, hp: 0.3, ...half(SPREAD_L, 0.45), kp: 0.12, fl: 0.1 }), 'out'],
    [0.3, K({ oy: 0.035, bp: 0.08, sp: 0.04, cp: 0.05, np: 0.08, hp: 0.26, ...half(SPREAD_L, 0.5), kp: 0.08, fl: 0.1 })],
    [DT.hang, K({ oy: 0.03, bp: 0.05, sp: 0.02, cp: 0.03, np: 0.04, hp: 0.15, ...half(SPREAD_L, 0.35), fl: 0.08 })],
    [DT.sink, K({ oy: -0.06, bp: -0.06, sp: -0.06, cp: -0.08, np: -0.08, hp: -0.15, ...half(LIMP, 0.7), fl: 0.3, f2: 0.15 })],
    [DT.down, { ...deadK, oy: DY - 0.004, hp: -0.6 }, 'in'],
    [DT.down + 0.14, K({ ...deadK, oy: DY + 0.006, hp: -0.5 })],
    [DT.still, deadK, 'in'],
    [2.7, deadK]])(t)),
  feet: () => ({}),
};

export const CLIPS_RAW = { idle, walk, turnL: turn(1), turnR: turn(-1), note, unring, great, stillness, hurt, heavyHit, spawn, death };
export const CLIPS = CLIPS_RAW;

