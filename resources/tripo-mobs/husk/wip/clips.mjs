// The Hollow Husk's moves (a hound: the boar's clip set, re-timed). Units are model units (the model is 1 long; the page
// draws it CFG.unit times bigger). Timings from the game: src/sim/enemies/husk.js (1.6 u/s; the room's HEARTBEAT, a beat
// every 180 ticks, a 30-tick swell then a 42-tick surge at x2.2; a contact bite every 48 ticks per target) and the bite
// chain of src/render/enemies/facet/husk.js (HUSK_BITES: contacts at 2.5 frames, 0.8 s and 1.6 s on render/facet/foe.js's
// hit timeline). A game frame is 1/30 s.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from '../kit/quad.mjs';
const FR = 1 / 30;
const PROBE = !!process.env.PROBE;
export const CFG = {
  name: 'husk', unit: 1.3, base: {},
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck1', 'n1'], ['neck2', 'n2'], ['head', 'h']],
  extras: [['earL', 'el'], ['earR', 'er'], ['tail1', 't1'], ['tail2', 't2'], ['tail3', 't3'], ['jaw', 'j']],
  legs: {
    FL: { kind: 'front', b: ['fUpperL', 'fForeL', 'fCannonL', 'fHoofL'] }, FR: { kind: 'front', b: ['fUpperR', 'fForeR', 'fCannonR', 'fHoofR'] },
    HL: { kind: 'hind', b: ['hThighL', 'hShinL', 'hCannonL', 'hHoofL'] }, HR: { kind: 'hind', b: ['hThighR', 'hShinR', 'hCannonR', 'hHoofR'] },
  },
  springs: [{ bone: 'earL', k: 500, c: 16, max: 0.7 }, { bone: 'earR', k: 500, c: 16, max: 0.7 }, { bone: 'tail1', k: 260, c: 12, max: 0.6 }, { bone: 'tail2', k: 200, c: 9, max: 0.7 }, { bone: 'tail3', k: 160, c: 8, max: 0.8 }],
};
const U = CFG.unit;
const REST = { FL: V3(0.08, 0, 0.215), FR: V3(-0.08, 0, 0.215), HL: V3(0.08, 0, -0.285), HR: V3(-0.08, 0, -0.285) };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
// ears: the left ear's yaw and roll, mirrored for the right (+ back: pinned)
const ears = (backL = 0, upL = 0, backR = backL, upR = upL) => ({ ely: backL, elr: upL, ery: -backR, err: -upR });
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.9); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const I = new THREE.Quaternion();
// the game's body pose on this rig: push and hop in game u, pitch + nose down, twist + to its left, jaw 0..1 open
function game(g) {
  const push = (g.push || 0) / U, hop = (g.hop || 0) / U, pitch = g.pitch || 0, tw = g.twist || 0, hy = g.hy || 0, hp = g.hp || 0;
  return { oz: push, oy: hop - 0.08 * pitch * 0.4, bp: -pitch, br: g.roll || 0, by: 0.45 * tw, sy: 0.3 * tw, cy: 0.25 * tw,
    n1y: 0.3 * hy, n2y: 0.3 * hy, hy: 0.4 * hy, n1p: -0.3 * hp, n2p: -0.3 * hp, hp: -0.4 * hp, cp: -0.15 * pitch, jp: -0.6 * (g.jaw || 0) };
}
// the hunch it stalks in: head low and forward, shoulders up, tail hanging
const HUNCH = { n1p: -0.12, n2p: 0.05, hp: 0.06, bp: 0.02, t1p: -0.1 };

// ------------------------------------------------------------------------------------------------ idle
// 4 s. Head low; a slow heaving breath with the jaw slack, a twitchy look left then right, an ear flick, the tail
// twitching, and a jerk of the head half-way (a corpse's tic).
const idle = {
  dur: 4, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 4, br = Math.sin(2 * w);
    const look = 0.35 * pulse(t, 0.4, 0.6, 1.2, 1.4) - 0.3 * pulse(t, 2.5, 2.7, 3.2, 3.45);
    const tic = bump(t, 1.95, 0.16);
    return addPose(HUNCH,
      { oy: 0.003 * br, bp: 0.006 * br, cp: 0.012 * br, n1p: -0.01 * br, hp: 0.02 * br - 0.12 * tic, hr: 0.18 * tic, jp: -0.08 - 0.06 * (0.5 + 0.5 * br) },
      { ox: 0.004 * Math.sin(w), br: 0.012 * Math.sin(w), by: 0.015 * Math.sin(w + 1) },
      { n1y: 0.35 * look, hy: 0.45 * look, hr: 0.08 * look },
      ears(0.15 - 0.4 * bump(t, 3.0, 0.2), 0.1 * bump(t, 3.0, 0.2), 0.15 + 0.3 * tic, 0),
      { t1y: 0.25 * Math.sin(2 * Math.PI * t / 2) * (0.4 + 0.6 * pulse(t, 2.0, 2.3, 3.3, 3.7)), t2y: 0.2 * Math.sin(2 * Math.PI * t / 2 - 0.8) },
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ stalk and turn
// Diagonal pairs at the game's 1.6 u/s, a step pair every 0.155 s (a 0.31 s cycle).
const WT = 0.31, VW = 1.6 / U;
const GAIT = { T: WT, duty: 0.5, v: VW };
const GF = { FL: { phase: 0, n: [0.08, 0.205], lift: 0.045, droop: 0.9 }, HR: { phase: 0.02, n: [-0.08, -0.295], lift: 0.04, droop: 0.6, push: 0.3 },
             FR: { phase: 0.5, n: [-0.08, 0.205], lift: 0.045, droop: 0.9 }, HL: { phase: 0.52, n: [0.08, -0.295], lift: 0.04, droop: 0.6, push: 0.3 } };
const stalkPose = (w, k = 0) => addPose(HUNCH,
  { oy: -0.014 + 0.007 * Math.cos(2 * w - 0.6) - 0.02 * k, oz: 0.01, bp: -0.03 + 0.012 * Math.sin(2 * w + 0.4) - 0.06 * k, br: 0.03 * Math.sin(w + 0.2), by: 0.03 * Math.sin(w) },
  { sy: -0.03 * Math.sin(w + 0.4), cy: -0.03 * Math.sin(w + 0.4), cr: -0.015 * Math.sin(w + 0.2) },
  { n1p: -0.04 + 0.025 * Math.sin(2 * w + 1.3) - 0.15 * k, hp: -0.04 * Math.sin(2 * w + 1.8) + 0.1 * k, hy: -0.03 * Math.sin(w), n1y: -0.02 * Math.sin(w), jp: -0.1 - 0.15 * k },
  { t1p: 0.05 + 0.04 * Math.sin(2 * w) + 0.15 * k, t1y: 0.15 * Math.sin(w + 1.2), t2y: 0.12 * Math.sin(w + 0.4) },
  ears(0.25 + 0.5 * k, 0.04));
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => stalkPose(2 * Math.PI * t / WT),
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: 0.4, duty: 0.55, v: 0, omega: dir * 2 * Math.PI / 1.6, pivot: [0, -0.04] };
  const gf = { FL: { ...GF.FL, lift: 0.04 }, FR: { ...GF.FR, lift: 0.04 }, HL: { ...GF.HL, lift: 0.035 }, HR: { ...GF.HR, lift: 0.035 } };
  return {
    dur: 0.4, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / 0.4;
      return addPose(HUNCH, { oy: -0.004 + 0.004 * Math.cos(2 * w - 0.5), br: 0.02 * Math.sin(w) - 0.02 * dir, bp: 0.008 * Math.sin(2 * w) },
        { sy: 0.08 * dir, cy: 0.07 * dir, n1y: 0.14 * dir, hy: 0.2 * dir, hr: 0.05 * dir, n1p: -0.03 + 0.015 * Math.sin(2 * w + 1) },
        { t1y: -0.3 * dir + 0.1 * Math.sin(w) }, ears(0.2, 0.03)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ the heartbeat
// One beat of the room's clock, 3 s (180 ticks), from the swell: 0.5 s (30 ticks) the veins swell and the body shudders
// and hunches; 0.7 s (42 ticks) the surge, the same stride at 2.2 times the speed (the feet keep to the real travel, as
// the game's do); then 1.8 s of stalking to the next beat. The stride counts in walk-time t' = the distance / 1.6 u/s,
// so the feet stay planted however fast it goes; one beat is 12 whole stride cycles, so the beats repeat seamlessly.
export const SWELL = 30 / 60, SURGE = 42 / 60, BEAT = 180 / 60, MUL = 2.2;
const SA = SWELL, SB = SWELL + 0.1, SC = SWELL + SURGE - 0.1, SD = SWELL + SURGE;
const speedK = (t) => pulse(t, SA, SB, SC, SD);
const TP = (() => { const n = 1800, a = new Float64Array(n + 1); let s = 0; for (let i = 1; i <= n; i++) { const t = (i - 0.5) * BEAT / n; s += (1 + (MUL - 1) * speedK(t)) * BEAT / n; a[i] = s; } return a; })();
const tPrime = (t) => { const f = clamp(t / BEAT, 0, 1) * 1800, i = Math.floor(f), j = Math.min(1800, i + 1); return TP[i] + (TP[j] - TP[i]) * (f - i); };
const BEAT_T = 12 * WT; // must equal tPrime(BEAT)
if (Math.abs(tPrime(BEAT) - BEAT_T) > 0.01) throw new Error('beat strides do not close: ' + tPrime(BEAT) + ' vs ' + BEAT_T);
const BG = { ...GAIT, T: tPrime(BEAT) / 12 };
const beat = {
  dur: BEAT, contact: [SWELL], travel: (t) => VW * tPrime(t),
  phases: [['the swell: its veins brighten, the heart throbs', 0], ['the surge: it runs at 2.2 times its pace', SWELL], ['stalks to the next beat', SD]],
  pose: (t) => {
    const tp = tPrime(t), w = 2 * Math.PI * tp / BG.T, k = speedK(t);
    const sw = pulse(t, 0, 0.3, 0.45, 0.6), shud = sw * Math.sin(70 * t), throb = bump(t, 0.12, 0.14) + bump(t, 0.38, 0.14);
    return addPose(stalkPose(w, k),
      { oy: -0.012 * sw, bp: 0.03 * sw, sy: 0, sp: -0.05 * sw, cp: -0.06 * sw + 0.04 * throb, cr: 0.03 * shud, br: 0.02 * shud, n1p: -0.06 * sw, hy: 0.06 * shud, hr: 0.05 * shud, jp: -0.25 * sw },
      ears(0.3 * sw, 0.05 * sw), { t1p: -0.1 * sw, t1y: 0.15 * shud });
  },
  feet: (t, W) => { const tp = tPrime(t); const o = {}; for (const k of LEGS) { const f = gaitFoot(tp, BG, GF[k]); o[k] = { ...f, p: f.p.clone().add(V3(0, 0, W.tz)) }; } return o; },
};

// ------------------------------------------------------------------------------------------------ the bite chain
// The game's three contacts (HUSK_BITES): the first unwarned (wind-back and strike squeezed into 2.5 frames), the next two
// predicted from the per-target cooldown (the held wind-up pulls back, then strikes so the contact lands on the bite). The
// game's husk claws with its hands; this one is a hound, so each hit is a bite: a snap cocked to its right and ripped
// across to its left, the mirror snap, then a lunge, reared back and driven down and forward with the deepest bite.
const K = (o) => ({ push: 0, pitch: 0, twist: 0, roll: 0, hy: 0, hp: 0, hop: 0, jaw: 0, ...o });
const G0 = K({});
const A1 = K({ push: -0.04, pitch: 0.03, twist: -0.22, roll: 0.05, hy: -0.5, hp: 0.15, jaw: 0.5 }), P1 = K({ push: -0.07, pitch: 0.04, twist: -0.3, roll: 0.07, hy: -0.62, hp: 0.2, jaw: 0.7 });
const S1 = K({ push: 0.16, pitch: 0.14, twist: 0.2, roll: -0.06, hy: 0.55, hp: 0.22, jaw: 0 }), O1 = K({ push: 0.13, pitch: 0.12, twist: 0.3, roll: -0.08, hy: 0.72, hp: 0.12, jaw: 0.15 });
const A2 = K({ push: -0.03, pitch: 0.04, twist: 0.24, roll: -0.05, hy: 0.52, hp: 0.16, jaw: 0.5 }), P2 = K({ push: -0.07, pitch: 0.05, twist: 0.3, roll: -0.07, hy: 0.62, hp: 0.22, jaw: 0.7 });
const S2 = K({ push: 0.16, pitch: 0.14, twist: -0.22, roll: 0.06, hy: -0.56, hp: 0.22, jaw: 0 }), O2 = K({ push: 0.13, pitch: 0.12, twist: -0.32, roll: 0.08, hy: -0.72, hp: 0.12, jaw: 0.15 });
const A3 = K({ push: -0.03, pitch: -0.03, hy: 0, hp: -0.2, jaw: 0.55 }), P3 = K({ push: -0.05, pitch: -0.05, hy: 0, hp: -0.3, jaw: 0.8 });
const S3 = K({ push: 0.2, pitch: 0.16, hy: 0, hp: 0.3, jaw: 0 }), O3 = K({ push: 0.17, pitch: 0.13, hy: 0, hp: 0.22, jaw: 0.2 });
const C1 = 2.5 * FR, C2 = 48 / 60, C3 = 96 / 60; // contacts
const CHAIN = (() => {
  const k = [
    [0, G0], [C1 - 1.5 * FR, A1, 'out'], [C1, S1, 'in'], [C1 + 2 * FR, S1, 'hold'], [C1 + 4.5 * FR, O1, 'out'], [C1 + 9.5 * FR, A2],
    [C2 - 6.5 * FR, A2], [C2 - 2.5 * FR, P2, 'out'], [C2, S2, 'in'], [C2 + 2 * FR, S2, 'hold'], [C2 + 4.5 * FR, O2, 'out'], [C2 + 9.5 * FR, A3],
    [C3 - 6.5 * FR, A3], [C3 - 2.5 * FR, P3, 'out'], [C3, S3, 'in'], [C3 + 2 * FR, S3, 'hold'], [C3 + 4.5 * FR, O3, 'out'], [C3 + 9.5 * FR, A1],
    [C3 + 9.5 * FR + 0.817, A1], [C3 + 9.5 * FR + 0.817 + 0.35, G0],
  ];
  return { keys: track(k.map(([t, g, e]) => [t, game(g), e])), end: C3 + 9.5 * FR + 0.817 + 0.35 };
})();
const bite = {
  dur: CHAIN.end, contact: [C1, C2, C3],
  phases: [['snap: strike', 0], ['snap: contact', C1], ['jerk back', C1 + 2 * FR], ['the mirror snap, wound up and held', C1 + 9.5 * FR], ['pull back', C2 - 6.5 * FR], ['the mirror snap: strike', C2 - 2.5 * FR], ['contact', C2], ['jerk back', C2 + 2 * FR],
           ['the lunge, reared and held', C2 + 9.5 * FR], ['pull back', C3 - 6.5 * FR], ['the lunge: strike', C3 - 2.5 * FR], ['contact', C3], ['jerk back', C3 + 2 * FR], ['the snap wound up, held', C3 + 9.5 * FR], ['recover', C3 + 9.5 * FR + 0.817]],
  pose: (t) => {
    const g = CHAIN.keys(t);
    const heat = pulse(t, 0, 0.05, CHAIN.end - 0.4, CHAIN.end);
    const kick = [C1, C2, C3].reduce((a, c) => a + bump(t, c + 1 * FR, 3 * FR), 0);
    return addPose(HUNCH, g, { hp: -0.08 * kick, n1p: -0.04 * kick }, ears(0.7 * heat, -0.1 * heat), { t1p: 0.25 * heat, t1y: 0.12 * Math.sin(20 * t) * heat });
  },
  feet: (t) => {
    const F = { HL: plant(REST.HL), HR: plant(REST.HR) };
    for (const [k, lag] of [['FL', 0], ['FR', 0.4 * FR]]) {
      const seq = [];
      for (const [c, L] of [[C1, 0.12], [C2, 0.12], [C3, 0.15]]) { const a = Math.max(0, c - 3.25 * FR) + lag; seq.push([a, c - 0.25 * FR + lag, off(k, 0, 0, L / U), 0.04, 0.7]); seq.push([c + 4.5 * FR, c + 8.5 * FR, REST[k], 0.03, 0.5]); }
      F[k] = steps(t, REST[k], seq);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ hurt
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { n1p: 0.14, n2p: 0.06, hp: 0.12, hy: 0.22, hr: 0.18, n1y: 0.1, cp: 0.04, t1p: -0.3, jp: -0.3 }, 'out'], [0.16, { n1p: -0.05, hp: -0.03, hy: -0.06, hr: -0.04, t1p: 0.1, jp: -0.05 }], [0.4, {}]])(t),
    ears(0.8 * pulse(t, 0, 0.04, 0.18, 0.36), 0.1)),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames, about 10% over. On top: it comes up low, jerks its head about
// like something waking wrong, then drops into its hunch.
const SPN = { grow: 7 * FR };
const spawn = {
  dur: 1.3, contact: [], scale: (t) => (t < SPN.grow ? lerp(0.04, 1.1, EASE.out(clamp(t / (SPN.grow * 0.75)))) : lerp(1.1, 1, smooth((t - SPN.grow) / 0.12))),
  phases: [['grows in', 0], ['jerks awake', SPN.grow + 0.1], ['hunches', 0.9]],
  pose: (t) => {
    const k = track([[0, { oy: -0.04, bp: 0.06, n1p: -0.3, hp: -0.2, t1p: -0.3 }], [SPN.grow, { oy: -0.04, bp: 0.06, n1p: -0.3, hp: -0.2, t1p: -0.3 }],
      [0.5, { oy: -0.01, n1p: -0.05, hp: -0.04, t1p: 0 }], [0.8, { n1p: 0.1, hp: 0.1, jp: -0.4 }], [0.95, { n1p: -0.06, hp: -0.06, jp: -0.05 }, 'out'], [1.3, {}]])(t);
    const sh = pulse(t, SPN.grow + 0.08, SPN.grow + 0.14, 0.6, 0.72);
    return addPose(HUNCH, k, { hy: 0.25 * Math.sin(31 * t) * sh, hr: 0.2 * Math.sin(23 * t + 1) * sh, n1y: 0.1 * Math.sin(27 * t - 0.5) * sh }, ears(0.4 * sh, 0.2 * sh));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// The legs let go: a jolt with the head thrown up and the jaw wide, the forelegs buckle, it rolls onto its right side,
// a last twitch of the legs, and the jaw falls slack.
const D = { knees: 0.42, side: 0.9, kick: 1.15, end: 2.2 };
const TAILY = +(process.env.TY ?? -0.4);
const LIE = PROBE ? 0 : 0.28;
const death = {
  dur: D.end, contact: [0.02, D.side - 0.03], phases: [['struck: it jolts, the head thrown up', 0], ['the legs buckle', 0.14], ['falls on its side', D.knees], ['twitches', D.side + 0.1], ['still', 1.6]],
  pose: (t) => {
    const L = LIE;
    const k = track([[0, {}],
      [0.12, { bp: 0.05, oy: -0.004, br: -0.04, n1p: 0.35, hp: 0.3, hy: 0.15, t1p: 0.5, jp: -0.7 }, 'out'],
      [D.knees, { bp: -0.14, oy: -0.06, oz: 0.01, br: 0.1, n1p: -0.05, hp: 0.1, hy: -0.1, t1p: 0.2, jp: -0.5 }],
      [0.68, { bp: -0.1, oy: -0.1, br: 0.6, by: 0.08, n1p: 0.1, hp: 0.15, hr: -0.3, t1p: 0.2, jp: -0.4 }],
      [0.8, { bp: -0.04, oy: -0.18, br: 1.05, by: 0.09, n1p: 0.1, hp: 0.1, hr: -0.36, n1r: -0.12, t1p: 0.2, jp: -0.35 }],
      [D.side, { bp: 0.0, oy: -L, oz: -0.01, br: 1.45, by: 0.1, n1p: 0.1, hp: 0.05, hr: -0.4, n1r: -0.2, t1p: 0.35, jp: -0.3 }, 'in'],
      [D.side + 0.12, { bp: 0.0, oy: -L - 0.004, oz: -0.01, br: 1.42, by: 0.1, n1p: 0.14, hp: 0.08, hr: -0.45, n1r: -0.22, t1p: 0.35, jp: -0.35 }, "out"],
      [1.6, { bp: 0.0, oy: -L - 0.004, oz: -0.01, br: 1.42, by: 0.1, n1p: 0.02, hp: -0.02, hr: -0.35, n1r: -0.18, t1p: 0.3, jp: -0.25 }],
      [D.end, { bp: 0.0, oy: -L - 0.004, oz: -0.01, br: 1.42, by: 0.1, n1p: 0.0, hp: -0.03, hr: -0.35, n1r: -0.18, t1p: 0.3, jp: -0.25 }]])(t);
    return addPose(k, { t1y: TAILY * smooth((t - 0.6) / 0.3) }, ears(0.6 * pulse(t, 0, 0.06, 0.8, 1.3), -0.3 * smooth((t - 1.3) / 0.5)));
  },
  feet: (t, B) => {
    const uF = smooth((t - 0.3) / 0.4), uH = smooth((t - 0.4) / 0.5);
    const lie = { FR: [-0.035, -0.24, 0.11], FL: [-0.085, -0.28, 0.04], HR: [-0.06, -0.25, -0.03], HL: [-0.07, -0.29, 0.0] };
    const slip = { FL: off('FL', 0.008, 0, -0.03), FR: off('FR', -0.006, 0, -0.025), HL: REST.HL, HR: REST.HR };
    const F = {};
    for (const k of LEGS) {
      const a = REST[k].clone().lerp(slip[k], smooth((t - 0.14) / 0.3));
      const kick = 0.025 * Math.sin(26 * t + (k[1] === 'L' ? 0 : 1.7) + (k[0] === 'F' ? 0 : 0.9)) * pulse(t, D.side, D.side + 0.06, D.kick + 0.2, D.kick + 0.5);
      const u = k === 'FR' ? smooth((t - 0.22) / 0.36) : k[0] === 'F' ? uF : uH; const l = lie[k]; const lp = B.loc(k, [l[0], l[1], l[2] + kick]); lp.y = Math.max(lp.y, 0.048 * u);
      F[k] = { p: a.lerp(lp, u), pitch: 0.5 * u, q: I.clone().slerp(B.parQ(k), u), lock: t < 0.14 };
    }
    return F;
  },
};

export const CLIPS = PROBE ? { death } : { idle, walk, turnL: turn(1), turnR: turn(-1), beat, bite, hurt, spawn, death };
