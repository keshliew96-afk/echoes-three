// The Hollow Cantor's moves. Units are model units (the model is 1 tall; the page draws it 2.4 u tall, CFG.unit, the game's
// scale). Timings come from the game: CANTOR in src/sim/bosses/cantor.js (moves at 1.35 u/s, backs off at 0.7 of that; Hollow
// Note: 48-tick ring; Sung Lance: 54-tick lane; Heart Pulse: 60-tick ring; Echo Step: an 18-tick fade), the phases of
// render/boss/cantorfacet.js (the hem hovers 0.32 u over the floor; its lean comes from its own velocity) and the beats in
// render/facet/beats.js (strike 2.5 frames, contact held 3 frames). It has no feet: nothing is planted.
import fs from 'fs';
import * as THREE from 'three';
import { track, V3, smooth, lerp, clamp, addPose, EASE } from './quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_; const D2R = Math.PI / 180;
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const J = (n) => V3(...skel.pos[skel.names.indexOf(n)]);
const qAx = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const XA = V3(1, 0, 0), YA = V3(0, 1, 0), ZA = V3(0, 0, 1);
const qPYR = (p = 0, y = 0, r = 0) => qAx(YA, y).multiply(qAx(XA, -p)).multiply(qAx(ZA, r));
const UNIT = 2.4; const HOV = 0.32 / UNIT;

// ---- the robe: eight columns hang from the hips. fl flares the upper robe out (- folds it in), f2 flares the hem on top of it;
// kp, kr, ky swing the whole skirt (+kp: the hem forward, +kr: the hem to its left, +ky: twist), against the hips.
const SK = skel.robe.cols; const ZC = skel.robe.zc;
const colDir = Array.from({ length: SK }, (_, k) => { const a = 2 * Math.PI * k / SK; return V3(Math.sin(a), 0, Math.cos(a)); });
const colAx = colDir.map((d) => V3(-d.z, 0, d.x));
const skAQ = (k) => (p) => { const d = colDir[k]; const lean = (p.kp || 0) * d.z + (p.kr || 0) * d.x; // the side the hem swings to opens a little, the far side tucks in
  return qPYR(p.kp || 0, p.ky || 0, -(p.kr || 0)).multiply(qAx(colAx[k], (p.fl || 0) + 0.35 * lean)); };
const skBQ = (k) => (p) => { const d = colDir[k]; const lean = (p.kp || 0) * d.z + (p.kr || 0) * d.x; return qAx(colAx[k], (p.f2 || 0) + 0.25 * lean); };

// ---- the arms: s?p swings the arm forward, s?r raises it out to its side, s?y turns it; e? bends the elbow (forearm forward);
// w?p, w?r the wrist; f? curls the crystal fingers. The right side is the left mirrored.
const SG = { L: 1, R: -1 };
const fingQ = (s, f) => (p) => qPYR((p['f' + s] || 0) * (f === 'th' ? 0.7 : 1), 0, (p['g' + s] || 0) * SG[s] * { th: -0.6, f1: 0.5, f2: 0, f3: -0.5 }[f]);
const armQ = (pre, s) => (p) => qPYR(p[pre + s + 'p'] || 0, (p[pre + s + 'y'] || 0) * SG[s], (p[pre + s + 'r'] || 0) * SG[s]);

// ---- the halo and its notes. The page turns the halo slowly round its own axis and keeps the notes upright (the game's rig
// does the same); the clips throw it back (hb), lift it (hu), grow it (hs) and fling the notes out from the ring (nf).
const HC = V3(...skel.halo.c);
const NOTE_DIR = skel.halo.notes.map((n) => V3(...n).sub(HC).normalize());
const noteQ = (k) => (p) => qAx(ZA, (p.nw || 0) * Math.sin(k * 2.1 + (p.nwp || 0)));

export const CFG = {
  name: 'cantor', unit: UNIT, floor: false,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['jaw', 'j'], ['heart', 'z'], ['halo', 'hl'],
    ...['L', 'R'].flatMap((s) => [['sh' + s, armQ('s', s)], ['el' + s, armQ('e', s)], ['wr' + s, armQ('w', s)], ...['th', 'f1', 'f2', 'f3'].map((f) => [f + s, fingQ(s, f)])]),
    ...Array.from({ length: SK }, (_, k) => ['skA' + k, skAQ(k)]), ...Array.from({ length: SK }, (_, k) => ['skB' + k, skBQ(k)]),
    ...Array.from({ length: 7 }, (_, k) => ['note' + k, noteQ(k)]), ...Array.from({ length: 6 }, (_, k) => ['mote' + k, () => new THREE.Quaternion()])], // the page flies the motes
  slides: [['halo', 'hb', [0, 0, -1]], ['halo', 'hu', [0, 1, 0]], ...NOTE_DIR.map((d, k) => ['note' + k, 'nf', d.toArray()])],
  scales: [['heart', 'hz'], ['halo', 'hs'], ...Array.from({ length: 7 }, (_, k) => ['note' + k, 'ns'])],
  legs: {},
  springs: Array.from({ length: SK }, (_, k) => ({ bone: 'skB' + k, k: 180, c: 11, max: 0.32, rate: 0.2 })),
};

// ---- one pose key. ox, oy, oz: the body off its hover (oy 0 is the hem 0.32 u up). bp, by, br: the hips (pitch + back, yaw +
// to its left, roll + left side up); sp, cp: spine and chest pitch; cy: chest turn; np, hp, hy, hr: neck and head. jw: the mouth
// open 0..1. hz: the heart swells. Arms: ap, ar, ay, e, wp, wr, f, g (spread the fingers), the same both sides unless a side key
// (Lap, Rar, ...) says otherwise. fl, f2, kp, kr, ky: the robe. hb, hu, hs, nf, ns, nw: the halo and the notes.
const K = (o) => ({ ox: 0, oy: 0, oz: 0, bp: 0, by: 0, br: 0, sp: 0, cp: 0, cy: 0, np: 0, hp: 0, hy: 0, hr: 0, jw: 0, hz: 0,
  ap: 0.12, ar: -0.12, ay: 0, e: 0.3, ey: 0, wp: 0.1, wr: 0, f: 0.1, g: 0, fl: 0, f2: 0, kp: 0, kr: 0, ky: 0, hb: 0, hu: 0, hs: 0, nf: 0, ns: 0, nw: 0, ...o });
const JAW = 0.42;

const side = (k, s, c) => k[c] + (k['d' + s + c] || 0); // a side key (dLap, dRe, ...) adds to the shared one
function chans(k) {
  // the robe hangs: a lean of the hips is mostly taken back out of the skirt, so it keeps falling to the floor
  const o = { ox: k.ox, oy: HOV + k.oy, oz: k.oz, bp: k.bp, by: k.by, br: k.br, sp: k.sp, cp: k.cp, cy: k.cy, np: k.np, hp: k.hp, hy: k.hy, hr: k.hr,
    jp: -JAW * clamp(k.jw, 0, 1.15), hz: k.hz, hlp: -0.6 * (k.bp + k.sp + k.cp + k.np + k.hp) + (k.hlp || 0), hlr: -0.5 * (k.br + k.hr), fl: k.fl, f2: k.f2, kp: k.kp - 0.75 * k.bp, kr: k.kr - 0.75 * k.br, ky: k.ky, hb: k.hb, hu: k.hu, hs: k.hs, nf: k.nf, ns: k.ns, nw: k.nw, nwp: k.nwp || 0 };
  for (const s of ['L', 'R']) {
    o['s' + s + 'p'] = side(k, s, 'ap'); o['s' + s + 'r'] = side(k, s, 'ar'); o['s' + s + 'y'] = side(k, s, 'ay');
    o['e' + s + 'p'] = side(k, s, 'e'); o['e' + s + 'y'] = side(k, s, 'ey'); o['w' + s + 'p'] = side(k, s, 'wp'); o['w' + s + 'r'] = side(k, s, 'wr');
    o['f' + s] = side(k, s, 'f'); o['g' + s] = side(k, s, 'g');
  }
  return o;
}
const P = (k) => chans(k);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const S1 = (t, T, ph = 0) => Math.sin(2 * Math.PI * (t / T + ph));

// ------------------------------------------------------------------------------------------------ idle
// 4 s. It hangs in the air and breathes: a slow bob, the robe swinging a beat behind it, the hands turning and the fingers
// opening and closing as if feeling for a note, the head tipping as if listening, a hum (the mouth just parts) at 2.6 s.
const IT = 4;
const idleK = (t) => K({ oy: 0.01 * S1(t, 2), bp: 0.015 * S1(t, 4, 0.1), br: 0.02 * S1(t, 4, 0.3), sp: 0.02 * S1(t, 2, 0.15), cp: 0.02 * S1(t, 2, 0.2),
  np: 0.03 * S1(t, 4, 0.5), hp: 0.04 * S1(t, 4, 0.6) + 0.05 * bump(t, 2.7, 1.2), hr: 0.06 * S1(t, 4, 0.05), hy: 0.05 * S1(t, 4, 0.75),
  dLap: 0.05 * S1(t, 4, 0.2), dRap: 0.05 * S1(t, 4, 0.7), dLar: 0.03 * S1(t, 2, 0.4), dRar: 0.03 * S1(t, 2, 0.9),
  dLe: 0.06 * S1(t, 4, 0.35), dRe: 0.06 * S1(t, 4, 0.85), dLwr: 0.12 * S1(t, 4, 0.1), dRwr: 0.12 * S1(t, 4, 0.6),
  f: 0.12, dLf: 0.1 * S1(t, 2, 0.3), dRf: 0.1 * S1(t, 2, 0.8), g: 0.1 + 0.1 * S1(t, 4), jw: 0.25 * bump(t, 2.7, 1.0), hz: 0.04 * S1(t, 1),
  kp: 0.03 * S1(t, 2, 0.4), kr: 0.03 * S1(t, 4, 0.55), fl: 0.02 * S1(t, 2, 0.45), nw: 0.15, nwp: 2 * Math.PI * t / IT });
const idle = { dur: IT, loop: true, pose: (t) => P(idleK(t)), feet: () => ({}) };

// ------------------------------------------------------------------------------------------------ glide, back away, turn
// It glides at the game's 1.35 u/s, leaning into it (its lean comes from its own velocity): the hips tip forward, the robe trails
// behind and ripples, the arms drift back, the head stays level on the target. Backing away (0.7 of that) leans it back and the
// robe streams forward.
const GT = 2.4; const V = 1.35 / UNIT;
const glideK = (t, dir) => K({ oy: 0.012 * S1(t, GT / 2), bp: -0.16 * dir, sp: -0.03 * dir, cp: 0.02 * dir, np: 0.06 * dir, hp: 0.1 * dir, br: 0.02 * S1(t, GT),
  kp: -0.2 * dir + 0.04 * S1(t, GT / 2, 0.3), kr: 0.04 * S1(t, GT, 0.2), fl: 0.06 + 0.03 * S1(t, GT / 2, 0.4), f2: 0.04 * S1(t, GT / 2, 0.6),
  ap: 0.12 - 0.2 * dir, dLap: 0.04 * S1(t, GT, 0.1), dRap: 0.04 * S1(t, GT, 0.6), ar: -0.06, e: 0.36, wp: 0.2 * dir,
  f: 0.18, hz: 0.04 * S1(t, 0.8), nw: 0.15, nwp: 2 * Math.PI * t / GT, hb: 0.01 * dir });
const walk = { dur: GT, loop: true, travel: (t) => V * t, pose: (t) => P(glideK(t, 1)), feet: () => ({}) };
const back = { dur: GT, loop: true, travel: (t) => -0.7 * V * t, pose: (t) => P(glideK(t, -0.7)), feet: () => ({}) };
// the game turns it to face its target at once; here it turns 120 degrees a second, the robe twisting a beat behind
export const TURN_DEG = 120;
const TT = 0.75;
const turn = (dir) => ({ dur: TT, loop: true, pose: (t) => P(K({ ...idleK(0), by: 0, br: 0.05 * dir, cy: 0.06 * dir, hy: 0.1 * dir, ky: -0.18 * dir, kr: -0.05 * dir,
  dLap: -0.08 * dir, dRap: 0.08 * dir, oy: 0.008 * S1(t, TT), nw: 0.15, nwp: 2 * Math.PI * t / TT })), feet: () => ({}) });

// ------------------------------------------------------------------------------------------------ Hollow Note
// draw (the 48-tick ring warning less one strike: it fills its chest, the heart swells, the hands spread palms up and rise, the
// halo lifts, the head tips back and the mouth opens), sing (2.5 frames on the hit: the mouth wide, the halo flung out behind
// it, the notes flung off the ring, the robe squashed down and flared, the hands thrown open), held (3 frames), a recoil that
// lifts it back, settle.
const NT = { hit: 48 / 60 }; NT.draw = NT.hit - STRIKE; NT.held = NT.hit + HOLD; NT.end = NT.held + 0.62;
const note = {
  dur: NT.end, contact: [NT.hit], kinds: ['note'], cues: { ring: [0, NT.hit] }, phases: [['draw', 0], ['sing', NT.draw], ['held', NT.hit], ['settle', NT.held]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.18, K({ oy: -0.008, bp: 0.03, sp: 0.02, cp: 0.04, np: 0.02, hp: 0.04, ap: 0.25, ar: 0.05, e: 0.5, wr: 0.3, wp: -0.1, f: 0.25, jw: 0.1, hz: 0.12, fl: -0.03, hu: 0.004, nw: 0.15 })],
    [NT.draw, K({ oy: 0.022, bp: 0.07, sp: 0.06, cp: 0.12, np: 0.05, hp: 0.2, ap: 0.5, ar: 0.45, e: 0.55, wr: 0.35, wp: 0.1, f: 0.4, g: 0.25, jw: 0.45, hz: 0.38, fl: -0.06, hu: 0.014, hs: 0.06, nw: 0.3 })],
    [NT.hit, K({ oy: -0.03, oz: 0.006, bp: -0.04, sp: -0.04, cp: -0.06, np: 0.08, hp: 0.12, ap: 0.75, ar: 0.95, e: 0.08, wr: 0.4, wp: 0.25, f: -0.15, g: 0.7, jw: 1.1, hz: 0.6, fl: 0.2, f2: 0.12, hb: 0.06, hs: 0.18, nf: 0.035, ns: 0.25, nw: 0.4 }), 'snap'],
    [NT.held, K({ oy: -0.034, oz: 0.004, bp: -0.05, sp: -0.05, cp: -0.07, np: 0.08, hp: 0.13, ap: 0.78, ar: 1.0, e: 0.05, wr: 0.4, wp: 0.25, f: -0.18, g: 0.75, jw: 1.15, hz: 0.6, fl: 0.24, f2: 0.16, hb: 0.065, hs: 0.2, nf: 0.04, ns: 0.25, nw: 0.4 })],
    [NT.held + 0.16, K({ oy: 0.018, oz: -0.012, bp: 0.06, sp: 0.03, cp: 0.04, np: 0.02, hp: 0.06, ap: 0.5, ar: 0.6, e: 0.25, wr: 0.3, wp: 0.15, f: 0.05, g: 0.4, jw: 0.6, hz: 0.3, fl: 0.06, f2: 0.0, hb: 0.03, hs: 0.08, nf: 0.012, ns: 0.08, nw: 0.25 })],
    [NT.held + 0.36, K({ oy: -0.004, bp: -0.01, hp: -0.02, ap: 0.2, ar: -0.02, e: 0.32, wr: 0.15, f: 0.12, jw: 0.12, hz: 0.06, fl: 0.0, hb: 0.004, nw: 0.15 })],
    [NT.end, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ Sung Lance
// gather (the 54-tick lane warning less one strike: it draws its hands in and crosses them at its chest, square to the lane,
// and leans back, the robe drawn in, the heart glowing through the crossed wrists), lance (2.5 frames on the resolve: it lunges
// down the lane, both hands shoved straight out along it, the mouth wide, the robe flung back), held (3 frames), recoil, settle.
const LT = { hit: 54 / 60 }; LT.gather = LT.hit - STRIKE; LT.held = LT.hit + HOLD; LT.end = LT.held + 0.62;
const cross = { ap: 1.05, ar: -0.45, ay: 0, e: 1.0, ey: -1.2 }; // upper arms down and a little forward, forearms turned in across the chest
const lance = {
  dur: LT.end, contact: [LT.hit], kinds: ['lance'], cues: { lane: [0, LT.hit] }, phases: [['gather', 0], ['lance', LT.gather], ['held', LT.hit], ['settle', LT.held]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.2, K({ oy: 0.004, bp: 0.05, sp: 0.03, cp: 0.04, hp: -0.02, ap: 0.4, ar: -0.4, ay: 0, e: 1.0, ey: -0.6, wp: 0.1, f: 0.3, fl: -0.04, hz: 0.1, jw: 0.08 })],
    [LT.gather, K({ oy: 0.016, oz: -0.018, bp: 0.17, sp: 0.07, cp: 0.08, np: -0.04, hp: -0.06, ...cross, wp: 0.3, wr: 0.2, f: 0.55, fl: -0.09, kp: 0.04, hz: 0.35, jw: 0.2, hb: 0.01, hs: 0.05, nw: 0.25 })],
    [LT.hit, K({ oy: -0.012, oz: 0.05, bp: -0.22, sp: -0.08, cp: -0.06, np: 0.1, hp: 0.16, ap: 1.55, ar: -0.62, ay: -0.08, e: 0.04, ey: 0, wp: -0.3, wr: 0.0, f: -0.12, g: 0.4, fl: 0.08, f2: 0.06, kp: -0.12, hz: 0.5, jw: 1.1, hb: -0.01, hs: 0.1, nf: 0.02, ns: 0.15, nw: 0.4 }), 'snap'],
    [LT.held, K({ oy: -0.014, oz: 0.054, bp: -0.24, sp: -0.09, cp: -0.07, np: 0.1, hp: 0.17, ap: 1.58, ar: -0.64, ay: -0.08, e: 0.02, wp: -0.32, f: -0.14, g: 0.45, fl: 0.1, f2: 0.08, kp: -0.14, hz: 0.5, jw: 1.12, hb: -0.012, hs: 0.1, nf: 0.022, ns: 0.15, nw: 0.4 })],
    [LT.held + 0.16, K({ oy: 0.012, oz: 0.03, bp: -0.04, sp: 0.0, cp: 0.02, np: 0.03, hp: 0.05, ap: 1.0, ar: -0.4, e: 0.3, wp: -0.1, f: 0.05, g: 0.2, fl: 0.03, kp: 0.04, hz: 0.25, jw: 0.5, hs: 0.04, nf: 0.006, ns: 0.05, nw: 0.25 })],
    [LT.held + 0.38, K({ oy: -0.003, oz: 0.008, bp: 0.01, ap: 0.3, ar: -0.1, e: 0.35, f: 0.12, jw: 0.08, hz: 0.05, nw: 0.15 })],
    [LT.end, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ Heart Pulse
// swell (the 60-tick ring warning less one strike: the chest and the halo swell, the heart beats harder and faster, the sleeves
// lift out and up, the robe draws in, the head drops to look at its own heart), pulse (2.5 frames on the hit: the chest thrown
// open, the robe flares out all round, the arms flung down and back, the motes thrown out (the page)), held (3 frames), settle.
const PT = { hit: 60 / 60 }; PT.swell = PT.hit - STRIKE; PT.held = PT.hit + HOLD; PT.end = PT.held + 0.7;
const beat = (t) => { const f = lerp(1.6, 3.4, clamp(t / PT.swell)); return Math.max(0, Math.sin(2 * Math.PI * f * t)) ** 3; };
const heartPulse = {
  dur: PT.end, contact: [PT.hit], kinds: ['pulse'], cues: { ring: [0, PT.hit], motes: [PT.hit] }, phases: [['swell', 0], ['pulse', PT.swell], ['held', PT.hit], ['settle', PT.held]],
  pose: (t) => { const k = track([[0, idleK(0)],
    [0.3, K({ oy: 0.01, bp: 0.02, sp: 0.03, cp: 0.06, np: -0.08, hp: -0.12, ap: 0.2, ar: 0.25, e: 0.45, wr: 0.3, f: 0.3, fl: -0.06, hz: 0.15, hs: 0.04, nw: 0.2 })],
    [PT.swell, K({ oy: 0.03, bp: 0.04, sp: 0.07, cp: 0.14, np: -0.14, hp: -0.22, ap: 0.25, ar: 0.95, e: 0.7, wr: 0.6, wp: -0.2, f: 0.55, g: 0.3, fl: -0.14, f2: -0.05, hz: 0.5, hs: 0.16, hu: 0.01, jw: 0.2, nw: 0.35 })],
    [PT.hit, K({ oy: -0.028, bp: -0.05, sp: -0.05, cp: -0.12, np: 0.06, hp: 0.12, ap: -0.3, ar: 0.55, e: 0.05, wr: -0.2, wp: 0.3, f: -0.2, g: 0.8, fl: 0.38, f2: 0.24, hz: 0.6, hs: 0.3, hb: 0.03, jw: 1.0, nf: 0.04, ns: 0.3, nw: 0.5 }), 'snap'],
    [PT.held, K({ oy: -0.03, bp: -0.055, sp: -0.055, cp: -0.13, np: 0.06, hp: 0.13, ap: -0.32, ar: 0.58, e: 0.04, wr: -0.2, wp: 0.32, f: -0.22, g: 0.85, fl: 0.42, f2: 0.28, hz: 0.6, hs: 0.3, hb: 0.032, jw: 1.05, nf: 0.042, ns: 0.3, nw: 0.5 })],
    [PT.held + 0.18, K({ oy: 0.014, bp: 0.03, sp: 0.02, cp: 0.04, np: 0.0, hp: 0.02, ap: 0.0, ar: 0.25, e: 0.3, wr: 0.1, f: 0.05, g: 0.3, fl: 0.08, f2: -0.02, hz: 0.3, hs: 0.08, hb: 0.008, jw: 0.35, nf: 0.01, ns: 0.08, nw: 0.25 })],
    [PT.held + 0.42, K({ oy: -0.004, bp: -0.008, ap: 0.14, ar: -0.08, e: 0.32, f: 0.12, fl: 0.0, hz: 0.06, jw: 0.08, nw: 0.15 })],
    [PT.end, idleK(0)]])(t);
    k.hz += (t < PT.swell ? 0.25 * beat(t) : 0); return P(k); },
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ Echo Step
// fold (the sim's 18-tick fade: the robe folds in on itself, the arms wrap round it, the hood drops into it and the whole of it
// sinks into the floor), then the page hides it while it moves; rise (the spawn-in's seven frames at the far side: it grows back
// out of the floor already turned to the party, the robe opens, the arms spread, a short note), stand.
const FT = { fold: 18 / 60 }; FT.end = FT.fold + 0.05;
const fade = {
  dur: FT.end, sinks: true, cues: { gone: [FT.fold] }, scale: (t) => lerp(1, 0.04, EASE.in(clamp((t - 0.06) / (FT.fold - 0.06)))),
  phases: [['fold', 0], ['gone', FT.fold]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.08, K({ oy: 0.02, bp: 0.03, sp: 0.04, cp: 0.06, hp: 0.12, jw: 0.5, ap: 0.3, ar: 0.3, e: 0.3, f: 0.2, g: 0.4, fl: 0.08, hs: 0.06, nw: 0.3 }), 'out'],
    [FT.fold, K({ oy: -0.2, bp: 0.1, sp: -0.25, cp: -0.3, np: -0.4, hp: -0.35, jw: 0.0, ap: 0.9, ar: -0.5, ay: 0.6, e: 1.5, f: 0.6, fl: -0.3, f2: -0.2, hs: -0.5, ns: -0.6, nw: 0.1 }), 'in'],
    [FT.end, K({ oy: -0.2, bp: 0.1, sp: -0.25, cp: -0.3, np: -0.4, hp: -0.35, ap: 0.9, ar: -0.5, ay: 0.6, e: 1.5, f: 0.6, fl: -0.3, f2: -0.2, hs: -0.5, ns: -0.6 })]])(t)),
  feet: () => ({}),
};
const GROW = 7 / 60;
const riseK = [[0, K({ oy: -0.18, bp: 0.08, sp: -0.2, cp: -0.24, np: -0.3, hp: -0.28, ap: 0.8, ar: -0.4, ay: 0.5, e: 1.4, f: 0.55, fl: -0.25, f2: -0.15, hs: -0.4, ns: -0.5 })],
  [GROW, K({ oy: -0.12, bp: 0.06, sp: -0.16, cp: -0.2, np: -0.24, hp: -0.22, ap: 0.7, ar: -0.3, ay: 0.4, e: 1.3, f: 0.5, fl: -0.2, f2: -0.12, hs: -0.3, ns: -0.4 })],
  [0.34, K({ oy: 0.03, bp: -0.04, sp: -0.04, cp: -0.06, np: -0.04, hp: 0.1, ap: 0.35, ar: 0.55, e: 0.2, wr: 0.6, f: -0.1, g: 0.6, fl: 0.18, f2: 0.12, hz: 0.3, hs: 0.06, nf: 0.012, ns: 0.1, jw: 0.7, nw: 0.4 }), 'out'],
  [0.5, K({ oy: 0.008, bp: 0.02, sp: 0.01, hp: 0.04, ap: 0.25, ar: 0.25, e: 0.3, wr: 0.3, f: 0.05, g: 0.3, fl: 0.04, hz: 0.12, jw: 0.3, nw: 0.25 })],
  [0.75, idleK(0)]];
const rise = { dur: 0.75, contact: [0.34], kinds: ['note'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / GROW))), phases: [['grow', 0], ['open', GROW], ['stand', 0.5]],
  pose: (t) => P(track(riseK)(t)), feet: () => ({}) };

// ------------------------------------------------------------------------------------------------ Verse
// Each add phase is a verse: it rises a little, throws its head back and both arms up, and sings the verse with the mouth wide
// while the halo and the heart flare and the notes take the verse's land colour (the page) and spin out and back.
const VT = { call: 0.55, end: 1.6 };
const verse = {
  dur: VT.end, contact: [VT.call], kinds: ['verse'], cues: { flare: [VT.call] }, phases: [['gather', 0], ['verse', VT.call], ['settle', 1.15]],
  pose: (t) => { const k = track([[0, idleK(0)],
    [0.3, K({ oy: 0.02, bp: 0.04, sp: 0.04, cp: 0.08, np: -0.06, hp: -0.12, ap: 0.4, ar: 0.1, e: 0.9, wr: 0.4, f: 0.45, fl: -0.08, hz: 0.25, hs: 0.04, jw: 0.1, nw: 0.25 })],
    [VT.call, K({ oy: 0.06, bp: 0.1, sp: 0.06, cp: 0.12, np: 0.12, hp: 0.32, ap: 0.6, ar: 1.55, e: 0.25, wr: 0.9, wp: -0.4, f: -0.1, g: 0.7, fl: 0.14, f2: 0.1, hz: 0.7, hs: 0.22, hu: 0.02, jw: 0.85, nf: 0.03, ns: 0.3, nw: 0.6 }), 'out'],
    [0.95, K({ oy: 0.065, bp: 0.11, sp: 0.06, cp: 0.13, np: 0.12, hp: 0.34, ap: 0.62, ar: 1.6, e: 0.22, wr: 0.9, wp: -0.4, f: -0.12, g: 0.75, fl: 0.12, f2: 0.08, hz: 0.6, hs: 0.2, hu: 0.02, jw: 0.8, nf: 0.03, ns: 0.25, nw: 0.6 })],
    [1.15, K({ oy: 0.03, bp: 0.04, sp: 0.02, cp: 0.04, np: 0.04, hp: 0.1, ap: 0.4, ar: 0.6, e: 0.3, wr: 0.4, f: 0.05, g: 0.3, fl: 0.05, hz: 0.25, hs: 0.06, jw: 0.35, nf: 0.008, ns: 0.06, nw: 0.3 })],
    [1.38, K({ oy: -0.004, ap: 0.14, ar: -0.1, e: 0.3, f: 0.12, hz: 0.05, jw: 0.05, nw: 0.15 })],
    [VT.end, idleK(0)]])(t);
    k.jw += 0.12 * Math.sin(2 * Math.PI * 7 * t) * pulse(t, VT.call, VT.call + 0.05, 0.9, 1.1); k.nwp = 2 * Math.PI * t * 1.5; return P(k); },
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ hurt, heavy hit
// hurt plays on top of anything: the head and chest knocked back and aside, the mouth gasps, the robe jerks.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => { const f = pulse(t, 0, 0.05, 0.13, 0.42), g = pulse(t, 0.12, 0.2, 0.26, 0.42);
    return { cp: 0.12 * f - 0.04 * g, np: 0.1 * f, hp: 0.14 * f - 0.05 * g, hy: 0.2 * f, hr: 0.16 * f - 0.04 * g, cy: 0.08 * f, jp: -JAW * 0.6 * pulse(t, 0, 0.04, 0.12, 0.3) }; },
  feet: () => ({}),
};
// It is thrown back 0.3 u through the air: the hips knocked back, the robe streams forward, the arms fly forward and out, the
// halo jolts; it catches itself, the robe swings back past it, and it squares up.
const HB = -0.3 / UNIT;
const heavyHit = {
  dur: 1.1, contact: [0], kinds: ['taken'], travel: (t) => HB * EASE.out(clamp(t / 0.32)), phases: [['hit', 0], ['thrown back', 0.07], ['catch', 0.36], ['square up', 0.7]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.07, K({ oy: 0.02, oz: -0.01, bp: 0.3, sp: 0.1, cp: 0.12, np: 0.12, hp: 0.2, ap: 0.7, ar: 0.5, e: 0.15, f: -0.1, g: 0.5, kp: 0.3, fl: 0.1, f2: 0.1, jw: 0.8, hb: 0.03, hs: 0.05, nf: 0.015, nw: 0.5 }), 'out'],
    [0.36, K({ oy: 0.01, oz: -0.004, bp: 0.1, sp: 0.04, cp: 0.04, np: 0.02, hp: 0.04, ap: 0.4, ar: 0.3, e: 0.3, f: 0.05, g: 0.3, kp: 0.15, fl: 0.04, jw: 0.3, hb: 0.01, nw: 0.3 })],
    [0.55, K({ oy: -0.012, bp: -0.08, sp: -0.02, cp: -0.03, hp: -0.04, ap: 0.0, ar: -0.05, e: 0.35, f: 0.15, kp: -0.12, fl: 0.02, jw: 0.05, nw: 0.2 })],
    [0.8, K({ oy: 0.004, bp: 0.02, ap: 0.16, ar: -0.12, e: 0.3, f: 0.12, kp: 0.04, nw: 0.15 })],
    [1.1, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ spawn
// It grows out of the floor (the spawn-in's seven frames), folded, rises into its hover, opens its robe and arms, lifts its
// head and sings one note (the halo flares, the notes ring out), then floats into its idle.
const SW = { grow: GROW, sing: 1.0 };
const spawn = {
  dur: 1.6, contact: [SW.sing], kinds: ['note'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SW.grow))), phases: [['grow', 0], ['rise', SW.grow], ['open', 0.5], ['sing', 0.85], ['float', 1.25]],
  pose: (t) => P(track([[0, riseK[0][1]], [SW.grow, riseK[1][1]],
    [0.5, K({ oy: 0.0, bp: 0.03, sp: -0.04, cp: -0.05, np: -0.08, hp: -0.04, ap: 0.4, ar: 0.1, ay: 0.2, e: 0.8, f: 0.3, fl: -0.05, hs: -0.05, ns: -0.1, nw: 0.2 })],
    [0.85, K({ oy: 0.02, bp: 0.03, sp: 0.03, cp: 0.08, np: -0.02, hp: 0.12, ap: 0.4, ar: 0.6, e: 0.4, wr: 0.6, wp: -0.3, f: 0.2, g: 0.4, fl: 0.04, hz: 0.3, hs: 0.04, jw: 0.4, nw: 0.3 })],
    [SW.sing, K({ oy: -0.02, bp: -0.04, sp: -0.03, cp: -0.06, np: 0.08, hp: 0.16, ap: 0.6, ar: 0.95, e: 0.1, wr: 0.9, wp: -0.5, f: -0.15, g: 0.7, fl: 0.2, f2: 0.12, hz: 0.6, hs: 0.16, hb: 0.05, jw: 1.1, nf: 0.03, ns: 0.25, nw: 0.4 }), 'out'],
    [1.25, K({ oy: 0.008, bp: 0.02, hp: 0.04, ap: 0.3, ar: 0.2, e: 0.3, wr: 0.3, f: 0.05, g: 0.3, fl: 0.04, hz: 0.12, hs: 0.02, jw: 0.2, nw: 0.25 })],
    [1.6, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ death
// The falling-silent death: it cries out (head back, arms up, mouth wide, the halo flares), then the song stops: the mouth
// closes, the hover fails and it sinks; the robe crumples and spreads on the floor, the hood falls forward, the arms drop
// limp across the heap, the halo sags behind it and the notes drop to the floor (the page fades them and the heart goes dark).
const DT = { cry: 0.4, silent: 0.75, down: 1.45, still: 2.0 };
const DY = -HOV - 0.1;
const death = {
  dur: 2.6, sinks: true, contact: [DT.down], kinds: ['thud'], cues: { silent: [DT.silent] }, phases: [['hit', 0], ['cry', 0.08], ['silence', DT.silent], ['sinks', 0.95], ['crumples', DT.down], ['still', DT.still]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.08, K({ oy: 0.01, oz: -0.006, bp: 0.08, sp: 0.04, cp: 0.05, np: 0.08, hp: 0.14, ap: 0.4, ar: 0.6, e: 0.2, f: -0.1, g: 0.5, jw: 0.8, hz: 0.4, hs: 0.1, kp: 0.1, nw: 0.4 }), 'out'],
    [DT.cry, K({ oy: 0.05, bp: 0.06, sp: 0.04, cp: 0.06, np: 0.12, hp: 0.32, ap: 0.6, ar: 1.5, e: 0.25, wr: 0.8, f: -0.15, g: 0.8, fl: 0.1, jw: 1.15, hz: 0.6, hs: 0.2, hu: 0.02, nf: 0.03, ns: 0.2, nw: 0.6 })],
    [DT.silent, K({ oy: 0.045, bp: 0.05, sp: 0.03, cp: 0.05, np: 0.08, hp: 0.22, ap: 0.55, ar: 1.35, e: 0.3, wr: 0.7, f: 0.0, g: 0.6, fl: 0.08, jw: 0.2, hz: 0.1, hs: 0.15, hu: 0.015, nf: 0.02, ns: 0.15, nw: 0.1 })],
    [0.95, K({ oy: -0.01, bp: 0.06, sp: 0.02, cp: 0.02, np: 0.0, hp: 0.05, ap: 0.4, ar: 0.6, e: 0.3, wr: 0.3, f: 0.2, g: 0.2, fl: 0.04, jw: 0.1, hs: 0.05, hu: -0.01, nf: 0.0 })],
    [1.25, K({ oy: -0.17, bp: -0.04, sp: -0.1, cp: -0.12, np: -0.2, hp: -0.2, ap: 0.3, ar: 0.25, e: 0.4, f: 0.3, fl: 0.45, f2: 0.25, jw: 0.05, hs: -0.05, hu: -0.05, hb: 0.02, hlp: 0.4 })],
    [DT.down, K({ oy: DY, bp: -0.1, sp: -0.28, cp: -0.3, np: -0.45, hp: -0.35, ap: 0.55, ar: 0.12, e: 0.6, wp: 0.3, f: 0.35, fl: 0.8, f2: 0.32, jw: 0.0, hs: -0.12, hu: -0.12, hb: 0.03, hlp: 0.9 }), 'in'],
    [DT.down + 0.14, K({ oy: DY + 0.01, bp: -0.08, sp: -0.25, cp: -0.27, np: -0.4, hp: -0.3, ap: 0.5, ar: 0.16, e: 0.55, wp: 0.25, f: 0.3, fl: 0.8, f2: 0.32, hs: -0.1, hu: -0.11, hb: 0.03, hlp: 0.9 })],
    [DT.still, K({ oy: DY, bp: -0.12, sp: -0.32, cp: -0.36, np: -0.55, hp: -0.45, ap: 0.62, ar: 0.08, e: 0.7, wp: 0.4, f: 0.4, fl: 0.8, f2: 0.32, hs: -0.14, hu: -0.13, hb: 0.03, hlp: 0.9 }), 'in'],
    [2.6, K({ oy: DY, bp: -0.12, sp: -0.32, cp: -0.36, np: -0.55, hp: -0.45, ap: 0.62, ar: 0.08, e: 0.7, wp: 0.4, f: 0.4, fl: 0.8, f2: 0.32, hs: -0.14, hu: -0.13, hb: 0.03, hlp: 0.9 })]])(t)),
  feet: () => ({}),
};

export const CLIPS_RAW = { idle, walk, back, turnL: turn(1), turnR: turn(-1), note, lance, pulse: heartPulse, fade, rise, verse, hurt, heavyHit, spawn, death };
export const CLIPS = CLIPS_RAW;
