// The Rotcap's moves. Units are model units (the model is 1 tall; the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/rotcap.js (shambles at 1.1 u/s, bites on contact every 60 ticks per
// target; dying, it bursts: an Ember ring r 1.2 that lands 48 ticks later for 10, then a spore slick r 1.2 for 150
// ticks) and its rig src/render/enemies/facet/rotcap.js (the 3-hit cap combo A1..O3 on the kit's hit timeline: a fresh
// hit's contact 3.5 frames in, chained hits pulled back over 4 frames so the contact lands on the bite; the burst:
// swell 0.09 s, pop 0.17 s). Its pose fields (push, pitch, twist, bank, cp, ctilt, cy, cs, sx, sy, step, lead, hop) are
// copied key for key and mapped onto this rig in game() below.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from '../kit/quad.mjs';
const FR = 1 / 30;
export const CFG = {
  name: 'rotcap', unit: 0.7, base: {},
  chain: [['hips', 'b'], ['sq', 'q'], ['spine', 's'], ['chest', 'c'], ['cap', 'h']],
  extras: [['armL', 'al'], ['foreL', 'fl'], ['handL', 'nl'], ['armR', 'ar'], ['foreR', 'fr'], ['handR', 'nr']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']], ['cap', 'kc']],
  legs: {
    FL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'] }, FR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'] },
  },
  springs: [],
};
const U = CFG.unit;
const LEGS = ['FL', 'FR'];
const REST = { FL: V3(0.16, 0, 0.24), FR: V3(-0.16, 0, 0.24) };
const plant = (p) => ({ p: p.clone(), lock: true });
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const TAU = 2 * Math.PI;
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const ease = { out: (k) => 1 - (1 - k) * (1 - k), in: (k) => k * k };
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.5); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
// the root arms: + raises the arm (roll out), swing + forward
const arms = (upL, fwdL, upR = upL, fwdR = fwdL, curl = 0) => ({ alr: upL, aly: fwdL * 0.6, alp: fwdL * 0.4, flp: -curl, nlp: -curl, arr: -upR, ary: -fwdR * 0.6, arp: fwdR * 0.4, frp: -curl, nrp: -curl });

// The game's body pose on this rig. Its push and the lead foot's lunge are 0.6 of the game's (the root legs are short
// against the body), its lean is spread down the stalk, and the cap nods, tilts, spins and swells on its own bone.
const FS = 0.6;
function game(g) {
  const pitch = g.pitch || 0, tw = g.twist || 0;
  return {
    oz: FS * (g.push || 0) / U, oy: (g.hop || 0) / U - 0.012 * Math.abs(pitch) / 0.24,
    bp: -0.45 * pitch, sp: -0.3 * pitch, cp: -0.25 * pitch, br: -(g.bank || 0),
    by: 0.4 * tw, sy: 0.3 * tw, cy: 0.3 * tw,
    hp: -(g.cp || 0), hr: -(g.ctilt || 0), hy: g.cy || 0, kc: (g.cs ?? 1) - 1,
    qsx: (g.sx ?? 1) - 1, qsz: (g.sx ?? 1) - 1, qsy: (g.sy ?? 1) - 1,
  };
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. Mine (the game's idle is its drifting spore motes, drawn on the page): it breathes, the cap bobs and sways, it
// looks one way and the other with its whole stalk, the root fingers twitch, and once a loop the cap puffs (a swell).
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = TAU * t / 6, br = Math.sin(2 * w);
    const look = 0.25 * pulse(t, 0.6, 1.1, 2.0, 2.5) - 0.25 * pulse(t, 2.9, 3.4, 4.1, 4.6);
    const puff = bump(t, 5.1, 0.5);
    return addPose(
      { oy: -0.004 + 0.004 * br, qsy: 0.012 * br, qsx: -0.006 * br, qsz: -0.006 * br, sp: 0.01 * br, hp: 0.03 * Math.sin(w + 1), hr: 0.035 * Math.sin(w), kc: 0.06 * puff, hy: 0.04 * Math.sin(w) },
      { sy: 0.4 * look, cy: 0.5 * look, hy: 0.2 * look },
      arms(0.05 + 0.03 * br, 0.05 * Math.sin(w + 2), 0.05 + 0.03 * br, -0.05 * Math.sin(w + 2), 0.15 * bump(t, 1.6, 0.3) + 0.15 * bump(t, 3.9, 0.3)),
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// The game's shamble is 1.1 u/s, rolling onto each planted root and lurching up once a roll. Its roots are long; these
// are short, so it waddles faster: 0.6 s a stride (the game's 0.67), rolling onto each root and lurching up onto its left.
const WT = 0.35;
const GAIT = { T: WT, duty: 0.55, v: 1.1 / U };
const GF = { FL: { phase: 0, n: [0.16, 0.24], lift: 0.05, droop: 0.4, push: 0.2 }, FR: { phase: 0.5, n: [-0.16, 0.24], lift: 0.05, droop: 0.4, push: 0.2 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = TAU * t / WT;
    // the roll onto the planted root (the game's ROCK 0.075 rad), the step's bob and the lurch
    return addPose({ oy: -0.03 + 0.01 * Math.cos(2 * w) + 0.012 * Math.sin(w), br: 0.075 * Math.sin(w + 0.4), by: 0.06 * Math.sin(w), bp: -0.06, sy: -0.04 * Math.sin(w), hr: -0.05 * Math.sin(w + 0.9), hp: 0.04 * Math.sin(2 * w + 1.2), kc: 0 },
      arms(0.1, 0.25 * Math.sin(w + Math.PI), 0.1, 0.25 * Math.sin(w), 0.1));
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: WT, duty: 0.62, v: 0, omega: dir * TAU / 2.0, pivot: [0, 0.1] };
  return {
    dur: WT, loop: true, gait: g,
    pose: (t) => { const w = TAU * t / WT; return addPose({ oy: -0.012 + 0.006 * Math.cos(2 * w), br: 0.06 * Math.sin(w + 0.4), sy: 0.08 * dir, cy: 0.1 * dir, hy: 0.12 * dir, hr: 0.05 * dir }, arms(0.12, 0.15 * dir)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.04 })])),
  };
};

// ------------------------------------------------------------------------------------------------ the cap combo
const K = (o) => ({ push: 0, pitch: 0, twist: 0, bank: 0, cp: 0, ctilt: 0, cy: 0, cs: 1, sx: 1, sy: 1, hop: 0, ...o });
const G0 = K({});
const A1 = K({ push: -0.03, pitch: -0.03, twist: -0.26, bank: -0.07, cp: -0.1, ctilt: -0.22, cs: 1.03, sx: 0.97, sy: 1.04 });
const P1 = K({ push: -0.07, pitch: -0.05, twist: -0.34, bank: -0.09, cp: -0.2, ctilt: -0.3, cs: 1.05, sx: 0.96, sy: 1.05 });
const S1 = K({ push: 0.15, pitch: 0.14, twist: 0.22, bank: 0.07, cp: 0.26, ctilt: 0.32, cs: 1.1, sx: 1.19, sy: 0.91 });
const O1 = K({ push: 0.12, pitch: 0.11, twist: 0.32, bank: 0.09, cp: 0.17, ctilt: 0.4, cs: 1.06, sx: 1.06, sy: 0.97 });
const A2 = K({ push: -0.03, pitch: -0.02, twist: 0.28, bank: 0.07, cp: -0.06, ctilt: 0.26, cy: 0.35, cs: 1.03, sx: 0.97, sy: 1.04 });
const P2 = K({ push: -0.07, pitch: -0.04, twist: 0.36, bank: 0.09, cp: -0.14, ctilt: 0.34, cy: 0.45, cs: 1.05, sx: 0.96, sy: 1.05 });
const S2 = K({ push: 0.15, pitch: 0.15, twist: -0.24, bank: -0.07, cp: 0.32, ctilt: -0.36, cy: -0.5, cs: 1.1, sx: 1.19, sy: 0.91 });
const O2 = K({ push: 0.12, pitch: 0.12, twist: -0.34, bank: -0.09, cp: 0.2, ctilt: -0.44, cy: -0.62, cs: 1.06, sx: 1.06, sy: 0.97 });
const A3 = K({ push: -0.02, pitch: -0.06, cp: -0.32, cs: 1.06, sx: 0.94, sy: 1.1 });
const P3 = K({ push: -0.07, pitch: -0.1, cp: -0.42, cs: 1.08, sx: 0.91, sy: 1.14, hop: 0.04 });
const S3 = K({ push: 0.16, pitch: 0.24, cp: 0.5, cs: 1.14, sx: 1.24, sy: 0.86 });
const O3 = K({ push: 0.14, pitch: 0.2, cp: 0.42, cs: 1.1, sx: 1.16, sy: 0.9 });
const WINDOW = 1.4, RECOVER = 0.35;
const C1 = 3.5 * FR, C2 = 60 / 60, C3 = 120 / 60; // contacts: the first unannounced, the next two on the bite ticks
const END = C3 + WINDOW + RECOVER;
const COMBO = track([
  [0, G0], [1 * FR, A1, 'out'], [C1, S1, 'in'], [C1 + 2 * FR, S1, 'hold'], [C1 + 4.5 * FR, O1, 'out'], [C1 + 9.5 * FR, A2],
  [C2 - 6.5 * FR, A2], [C2 - 2.5 * FR, P2, 'out'], [C2, S2, 'in'], [C2 + 2 * FR, S2, 'hold'], [C2 + 4.5 * FR, O2, 'out'], [C2 + 9.5 * FR, A3],
  [C3 - 6.5 * FR, A3], [C3 - 2.5 * FR, P3, 'out'], [C3, S3, 'in'], [C3 + 2 * FR, S3, 'hold'], [C3 + 4.5 * FR, O3, 'out'], [C3 + 9.5 * FR, A1],
  [C3 + WINDOW, A1], [END, G0],
].map(([t, g, e]) => [t, game(g), e]));
const LEADS = [['FL', C1], ['FR', C2], ['FL', C3]];
const chomp = {
  dur: END, contact: [C1, C2, C3],
  phases: [['cap hook: strike', 0], ['contact', C1], ['snap back', C1 + 2 * FR], ['swipe wind-up held', C1 + 9.5 * FR], ['pull back', C2 - 6.5 * FR], ['reverse cap swipe: strike', C2 - 2.5 * FR], ['contact', C2], ['snap back', C2 + 2 * FR],
           ['rear up held', C2 + 9.5 * FR], ['pull back, rising', C3 - 6.5 * FR], ['cap slam: strike', C3 - 2.5 * FR], ['contact', C3], ['snap back', C3 + 2 * FR], ['hook wind-up held', C3 + 9.5 * FR], ['recover', C3 + WINDOW]],
  pose: (t) => {
    const g = COMBO(t);
    // mine: the root arms throw out with each strike, opposite the cap's swing
    const s1 = pulse(t, 0, C1, C1 + 4.5 * FR, C1 + 12 * FR), s2 = pulse(t, C2 - 2.5 * FR, C2, C2 + 4.5 * FR, C2 + 12 * FR), s3 = pulse(t, C3 - 2.5 * FR, C3, C3 + 4.5 * FR, C3 + 12 * FR);
    const rear = pulse(t, C2 + 4.5 * FR, C2 + 9.5 * FR, C3 - 2.5 * FR, C3);
    return addPose(g, arms(0.15 + 0.35 * s2 + 0.3 * rear + 0.2 * s3, -0.3 * s1 + 0.4 * s2 + 0.3 * s3, 0.15 + 0.35 * s1 + 0.3 * rear + 0.2 * s3, 0.4 * s1 - 0.3 * s2 + 0.3 * s3, 0.3 * (s1 + s2 + s3)));
  },
  feet: (t) => {
    const F = {};
    const L = (FS * 0.16) / U;
    for (const k of LEGS) {
      const seq = [];
      for (const [lk, c] of LEADS) if (lk === k) { seq.push([Math.max(0, c - 3.25 * FR), c - 0.25 * FR, REST[k].clone().add(V3(0, 0, L)), 0.05, 0.4]); seq.push([c + 4.5 * FR, c + 8.5 * FR, REST[k], 0.035, 0.3]); }
      F[k] = steps(t, REST[k], seq);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ hurt
// On top of anything: the cap jolts back and tilts, the stalk flinches, the arms flinch in.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { hp: -0.22, hr: 0.14, cp: 0.08, kc: 0.05, hy: 0.12 }, 'out'], [0.17, { hp: 0.06, hr: -0.04, cp: -0.02, kc: -0.01 }], [0.4, {}]])(t),
    arms(0.25 * pulse(t, 0, 0.05, 0.15, 0.35), -0.2 * pulse(t, 0, 0.05, 0.15, 0.35), undefined, undefined, 0.4 * pulse(t, 0, 0.05, 0.15, 0.35))),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it sprouts from the floor in 7 frames, about 10% over. Mine on top: the cap unfurls with one
// overshoot and gives a shake that throws off spores.
const SPN = { grow: 7 * FR };
const spawn = {
  dur: 1.3, contact: [],
  scale: (t) => (t < SPN.grow ? lerp(0.04, 1.1, EASE.out(clamp(t / (SPN.grow * 0.75)))) : lerp(1.1, 1, smooth((t - SPN.grow) / 0.12))),
  phases: [['sprout', 0], ['cap unfurls', SPN.grow], ['shake', 0.7], ['stand', 1.05]],
  pose: (t) => {
    const k = track([[0, { kc: -0.3, hp: 0.4, sp: 0.1, oy: -0.02 }], [SPN.grow, { kc: -0.3, hp: 0.4, sp: 0.1, oy: -0.02 }], [0.45, { kc: 0.06, hp: -0.12, sp: -0.03, oy: 0 }, 'out'], [0.65, { kc: 0, hp: 0, sp: 0 }]])(t);
    const sh = pulse(t, 0.7, 0.76, 0.95, 1.05);
    return addPose(k, { hy: 0.25 * Math.sin(48 * t) * sh, hr: 0.12 * Math.sin(48 * t + 1) * sh, cy: 0.06 * Math.sin(48 * t + 2) * sh }, arms(0.3 * pulse(t, 0.3, 0.5, 0.9, 1.2), 0.1, undefined, undefined, 0.2));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// The game's death: the cap swells (0.09 s) and the body pops (0.17 s: wider, then gone), and the spore burst it leaves
// lands 48 ticks after the kill. It stays gone; the page draws the ring and the slick.
const SWELL = 0.09, POP = 0.17, BURST = 48 / 60;
const death = {
  dur: BURST + 0.3, contact: [0.001, BURST], phases: [['the cap swells', 0], ['pop', SWELL], ['spore ring', SWELL + POP], ['lands', BURST]],
  scale: (t) => { if (t < SWELL) return [1, 1, 1]; if (t < SWELL + POP) { const k = (t - SWELL) / POP; return [1 + 0.6 * k, Math.max(0.001, (1 - k) * (1 - k)), 1 + 0.6 * k]; } return [0.001, 0.001, 0.001]; },
  pose: (t) => { const k = t < SWELL ? ease.out(t / SWELL) : 1; const kp = c01((t - SWELL) / POP); return addPose(game(K({ cs: 1 + 0.32 * k + 0.12 * kp, sy: 1 + 0.1 * k, sx: 1 - 0.05 * k, cp: -0.12 * k })), arms(0.4 * k, 0, 0.4 * k, 0, -0.2 * k)); },
  feet: allPlanted,
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), chomp, hurt, spawn, death };
