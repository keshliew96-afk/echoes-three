// The Vein Weaver's moves. Units are model units (the model is 0.69 tall with its crystals and 1.0 wide leg tip to leg tip;
// the page draws it at the game's scale of 2.4, CFG.unit). Timings come from the game: VEINWEAVER in
// src/sim/bosses/veinweaver.js (walk 1.25 u/s; Bind: 44-tick lane; Heartbeat Slam: 60-tick ring; Brood Sacs: unwarned, the
// rig reads it 30 ticks ahead), the phases of render/boss/veinweaverfacet.js and the beats in render/facet/beats.js (strike
// 2.5 frames, contact held 3 frames, an unwarned wind 1.5 frames). Eight legs on locked feet, stepping in two sets of four
// (an alternating tetrapod, as the game's rig): L1 R2 L3 R4, then R1 L2 R3 L4.
import fs from 'fs';
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from './quad.mjs';
const FR_ = 1 / 60; const wf = (x) => Math.round(x * 60) / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_, GATHER = 1.5 * FR_;
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const J = (n) => V3(...skel.pos[skel.names.indexOf(n)]);
const LEGS = ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'];
const bn = (k) => ['fem', 'tib', 'tar', 'tip'].map((b) => b + k[1] + k[0]);
export const CFG = {
  name: 'veinweaver', unit: 2.4,
  chain: [['hips', 'b'], ['head', 'h']],
  extras: [['abdomen', 'a'], ['spinner', 'sn'], ['fangL', 'fl'], ['fangR', 'fr']],
  scales: [['abdomen', 'az']],
  legs: Object.fromEntries(LEGS.map((k) => [k, { kind: 'limb', b: bn(k), noDrop: true }])), // the body never drops to reach a foot: its hips sit level with its ankles, so lowering it does not help
  springs: [],
};
const REST = Object.fromEntries(LEGS.map((k) => [k, V3(...skel.ends[bn(k)[3]])]));
const RLOC = Object.fromEntries(LEGS.map((k) => [k, REST[k].clone().sub(J(bn(k)[0]))]));
const SG = Object.fromEntries(LEGS.map((k) => [k, k[0] === 'L' ? 1 : -1]));
const FRONT = (k) => k[1] === '1' || k[1] === '2';
const plant = (p, pitch = 0) => ({ p: p.clone(), lock: true, pitch });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x * SG[k], y, z)); // x is outward
const held = (B, k, dx = 0, dy = 0, dz = 0, o = {}) => ({ p: B.loc(k, [RLOC[k].x + dx * SG[k], RLOC[k].y + dy, RLOC[k].z + dz]), ...o }); // a foot placed from its hip, riding the body
const mixF = (a, b, u, lift = 0) => { u = clamp(u); const p = a.p.clone().lerp(b.p, u); p.y += lift * Math.sin(Math.PI * u); return { p, pitch: lerp(a.pitch || 0, b.pitch || 0, u), lock: false }; };
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
function steps(t, p0, seq) { // [[t0, t1, to, lift]]: planted between steps
  let cur = p0;
  for (const [a, b, to, h] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, 0.05); return { p: s.p, pitch: 0 }; } cur = to; }
  return plant(cur);
}
const fangs = (s, f = 0) => ({ flr: 0.3 * s, frr: -0.3 * s, flp: -0.25 * f, frp: -0.25 * f }); // s spreads them apart, f swings them forward

// ------------------------------------------------------------------------------------------------ idle
// 4 s. She breathes through the abdomen, which beats with the heart; she sways a little on her legs, her fangs work, and
// her two front legs lift and tap the floor in turn, tasting the threads.
const idle = {
  dur: 4.0, loop: true,
  pose: (t) => { const w = 2 * Math.PI * t / 4.0; const beat = Math.max(0, Math.sin(2 * Math.PI * t / 1.0)) ** 6;
    return addPose({ oy: 0.004 * Math.sin(2 * w), ox: 0.006 * Math.sin(w), br: 0.012 * Math.sin(w + 0.4), bp: 0.01 * Math.sin(2 * w + 0.5), by: 0.02 * Math.sin(w + 1.2) },
      { hy: 0.06 * Math.sin(w + 2.0), hp: 0.02 * Math.sin(2 * w), ap: 0.03 * Math.sin(2 * w + 0.8), ay: -0.04 * Math.sin(w + 1.0), az: 0.014 * beat, snp: 0.08 * Math.sin(3 * w) },
      fangs(0.15 + 0.15 * Math.max(0, Math.sin(4 * w)) ** 2)); },
  feet: (t) => { const F = allPlanted();
    const tap = (k, t0) => { if (t > t0 && t < t0 + 0.7) { const u = (t - t0) / 0.7, up = Math.sin(Math.PI * u); F[k] = { p: off(k, -0.01 * up, 0.05 * up + 0.03 * bump(u, 0.5, 0.25), 0.03 * up), pitch: 0 }; } };
    tap('L1', 0.6); tap('R1', 2.4); return F; },
};

// ------------------------------------------------------------------------------------------------ walk and turn
// The alternating tetrapod at the game's 1.25 u/s: one stride of 0.5 u every 0.4 s; the body glides level with a small
// bob on each set and the abdomen swings a little against it.
const WT = 24 / 60;
const GAIT = { T: WT, duty: 0.5, v: 1.25 / CFG.unit };
const PH = { L1: 0, R2: 0.02, L3: 0.04, R4: 0.06, R1: 0.5, L2: 0.52, R3: 0.54, L4: 0.56 };
const GF = Object.fromEntries(LEGS.map((k) => [k, { phase: PH[k], n: [REST[k].x, REST[k].z], lift: FRONT(k) ? 0.07 : 0.06, droop: 0.05, push: 0 }]));
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => { const w = 2 * Math.PI * t / WT;
    return addPose({ oy: 0.005 * Math.cos(2 * w), oz: 0.008, bp: -0.02, br: 0.015 * Math.sin(w), by: 0.02 * Math.sin(w + 0.3) },
      { hy: -0.02 * Math.sin(w + 0.3), ay: -0.05 * Math.sin(w + 0.6), ap: 0.02 * Math.cos(2 * w + 0.5), ar: 0.02 * Math.sin(w) }, fangs(0.12)); },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
export const TURN_DEG = 90;
const turn = (dir) => {
  const TT = 18 / 60; const g = { T: TT, duty: 0.55, v: 0, omega: dir * TURN_DEG * Math.PI / 180, pivot: [0, 0.05] };
  return { dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT; return addPose({ oy: 0.004 * Math.cos(2 * w), br: -0.02 * dir, by: 0.01 * Math.sin(w) }, { hy: 0.12 * dir, ay: -0.12 * dir }, fangs(0.12)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.06 })])) };
};

// ------------------------------------------------------------------------------------------------ Bind
// spin (the 44-tick lane less one strike: the abdomen tipped up, the spinnerets lit, the front legs raised, the body drawn
// back off the lane), cast (2.5 frames on the hit: the front legs whipped down ahead, the thread shot from the spinnerets
// over her head and down the lane, the lunge), held, a recoil, draw (0.45 s: the thread reeled in, the abdomen pumping, the
// front legs hauling hand over hand), settle.
const BI = { spin: 44 / 60 - STRIKE, hit: 44 / 60 }; BI.held = BI.hit + HOLD; BI.draw = BI.held + 0.12; BI.drawn = BI.draw + 0.45; BI.end = wf(BI.drawn + 0.42);
const bindK = track([[0, {}],
  [0.25, addPose({ oy: 0.008, oz: -0.02, bp: 0.07, ap: -0.25, snp: 0.1, hp: -0.04 }, fangs(0.3))],
  [BI.spin, addPose({ oy: 0.018, oz: -0.045, bp: 0.13, ap: -0.6, snp: 0.25, hp: -0.06 }, fangs(0.8, 0.5))],
  [BI.hit, addPose({ oy: -0.03, oz: 0.05, bp: -0.12, ap: -0.25, snp: -0.15, hp: 0.08 }, fangs(0.3, -0.2)), 'in'],
  [BI.held, addPose({ oy: -0.032, oz: 0.052, bp: -0.125, ap: -0.24, snp: -0.15, hp: 0.09 }, fangs(0.3, -0.2))],
  [BI.draw, addPose({ oy: -0.012, oz: 0.015, bp: -0.03, ap: -0.32, hp: 0.02 }, fangs(0.4)), 'out'],
  [BI.drawn, addPose({ oy: -0.006, oz: -0.01, bp: 0.03, ap: -0.3, hp: 0.0 }, fangs(0.3))],
  [BI.end, {}]]);
// hand over hand: each front leg hauls the thread back along the floor, then lifts and reaches out again; the two in turn
const haul = (k, t) => { const c = Math.max(0, 3 * clamp((t - BI.draw) / (BI.drawn - BI.draw)) - (k === 'R1' ? 0.5 : 0)) % 1; // the right leg starts half a haul later
  return c < 0.5 ? { p: off(k, 0, 0.012, 0.07 * (1 - 2 * c)), pitch: 0 } : { p: off(k, 0, 0.012 + 0.05 * Math.sin(Math.PI * (2 * c - 1)), 0.07 * (2 * c - 1)), pitch: 0 }; };
const bind = {
  dur: BI.end, contact: [BI.hit], kinds: ['cast'], phases: [['spin', 0], ['cast', BI.spin], ['held', BI.hit], ['draw', BI.draw], ['settle', BI.drawn]],
  cues: { lane: [0, BI.hit], cast: [BI.hit], draw: [BI.draw, BI.drawn] },
  pose: (t) => { const k = bindK(t); const d = pulse(t, BI.draw, BI.draw + 0.05, BI.drawn - 0.05, BI.drawn); const ph = 2 * Math.PI * (t - BI.draw) / 0.15;
    return addPose(k, { ap: -0.08 * Math.sin(ph) * d, oz: -0.006 * Math.sin(ph) * d, az: 0.022 * Math.max(0, Math.sin(ph)) * d }); },
  feet: (t, B) => { const F = allPlanted();
    for (const k of ['L1', 'R1']) {
      const up = held(B, k, -0.02, 0.15, 0.0), down = { p: off(k, 0.0, 0, 0.07), pitch: 0 };
      if (t < 0.12) F[k] = plant(REST[k]);
      else if (t < BI.spin) F[k] = mixF({ p: REST[k], pitch: 0 }, up, smooth((t - 0.12) / 0.4));
      else if (t < BI.hit) F[k] = mixF(up, down, EASE.in((t - BI.spin) / STRIKE));
      else if (t < BI.draw) F[k] = plant(down.p);
      else if (t < BI.drawn) F[k] = haul(k, t);
      else F[k] = steps(t, haul(k, BI.drawn).p, [[BI.drawn + (k === 'R1' ? 0.08 : 0), BI.drawn + 0.2 + (k === 'R1' ? 0.08 : 0), REST[k], 0.03]]);
    }
    return F; },
};

// ------------------------------------------------------------------------------------------------ Heartbeat Slam
// rear (the 60-tick ring less one strike: the body reared up and back on the hind legs, the front four raised, the fangs
// spread), slam (2.5 frames on the hit: the body dropped flat, the front four planted wide, the squash; the heart beats),
// held, a recoil, settle (each front leg stepped back in).
const SL = { rear: 1.0 - STRIKE, hit: 1.0 }; SL.held = SL.hit + HOLD; SL.end = wf(SL.held + 0.75);
const slamK = track([[0, {}],
  [0.18, addPose({ oy: -0.018, bp: -0.04, ap: 0.05 }, fangs(0.2))],
  [0.6, addPose({ oy: 0.07, oz: -0.04, bp: 0.38, hp: -0.12, ap: -0.2, az: 0.033 }, fangs(0.7, 0.3))],
  [SL.rear, addPose({ oy: 0.09, oz: -0.05, bp: 0.48, hp: -0.16, ap: -0.26, az: 0.055 }, fangs(1, 0.5))],
  [SL.hit, addPose({ oy: -0.07, oz: 0.03, bp: -0.05, hp: 0.1, ap: 0.12, az: 0.121 }, fangs(0.4, -0.2)), 'in'],
  [SL.held, addPose({ oy: -0.074, oz: 0.031, bp: -0.055, hp: 0.11, ap: 0.13, az: 0.11 }, fangs(0.4, -0.2))],
  [SL.held + 0.1, addPose({ oy: -0.045, oz: 0.02, bp: -0.02, hp: 0.04, ap: 0.06, az: 0.028 }, fangs(0.3)), 'out'],
  [SL.held + 0.38, addPose({ oy: -0.015, bp: 0.0, ap: 0.02 }, fangs(0.2))],
  [SL.end, {}]]);
const slam = {
  dur: SL.end, contact: [SL.hit], kinds: ['slam'], phases: [['rear', 0], ['slam', SL.rear], ['struck', SL.hit], ['settle', SL.held + 0.1]],
  cues: { ring: [0, SL.hit], slam: [SL.hit] }, pose: slamK,
  feet: (t, B) => { const F = allPlanted();
    for (const k of ['L1', 'R1', 'L2', 'R2']) {
      const one = k[1] === '1', up = held(B, k, 0.02, one ? 0.12 : 0.17, one ? -0.03 : 0.02), wide = { p: off(k, 0.035, 0, one ? 0.015 : 0.0), pitch: 0 };
      const back = SL.held + 0.12 + { L1: 0, R1: 0.07, L2: 0.14, R2: 0.21 }[k];
      if (t < 0.22) F[k] = plant(REST[k]);
      else if (t < SL.rear) F[k] = mixF({ p: REST[k], pitch: 0 }, up, smooth((t - 0.22) / (one ? 0.45 : 0.55)));
      else if (t < SL.hit) F[k] = mixF(up, wide, EASE.in((t - SL.rear) / STRIKE));
      else F[k] = steps(t, wide.p, [[back, back + 0.16, REST[k], 0.035]]);
    }
    return F; },
};

// ------------------------------------------------------------------------------------------------ Brood Sacs
// unwarned in the game: the rig reads the next brood ahead, so over the last 30 ticks the abdomen swells and lifts (load);
// heave (1.5 frames), lob (2.5 frames: the abdomen flicked up over her back, the body dipped nose down, the three sacs
// leave the spinnerets), held, a recoil, settle.
const BR = { load: 0.5 }; BR.heave = BR.load + GATHER; BR.hit = BR.heave + STRIKE; BR.held = BR.hit + HOLD; BR.end = wf(BR.held + 0.62);
const broodK = track([[0, {}],
  [0.2, addPose({ oy: -0.01, bp: -0.02, ap: -0.12, az: 0.055 }, fangs(0.2))],
  [BR.load, addPose({ oy: -0.024, bp: -0.05, ap: -0.3, az: 0.143, snp: 0.15, hp: 0.03 }, fangs(0.3))],
  [BR.heave, addPose({ oy: -0.032, bp: -0.07, ap: -0.18, az: 0.154, snp: 0.2, hp: 0.04 }, fangs(0.3))],
  [BR.hit, addPose({ oy: -0.045, oz: 0.01, bp: -0.13, ap: -0.6, az: 0.011, snp: -0.35, hp: 0.06 }, fangs(0.4)), 'in'],
  [BR.held, addPose({ oy: -0.047, oz: 0.01, bp: -0.135, ap: -0.62, az: 0, snp: -0.35, hp: 0.06 }, fangs(0.4))],
  [BR.held + 0.12, addPose({ oy: -0.02, bp: -0.05, ap: -0.4, az: 0.028, snp: 0.0, hp: 0.02 }, fangs(0.3)), 'out'],
  [BR.held + 0.36, addPose({ oy: -0.005, ap: -0.08 }, fangs(0.2))],
  [BR.end, {}]]);
const brood = {
  dur: BR.end, contact: [BR.hit], kinds: ['lob'], phases: [['load', 0], ['heave', BR.load], ['lob', BR.heave], ['thrown', BR.hit], ['settle', BR.held + 0.12]],
  cues: { sacs: [BR.hit] }, pose: broodK, feet: () => allPlanted(),
};

// ------------------------------------------------------------------------------------------------ Enrage
// Mine (the game burns the veins and quickens the heart): she rears, drums the air with her front legs four times while her
// fangs clatter and the abdomen shakes, then slams down.
const EN = { beats: [0.62, 0.8, 0.98, 1.16], slam: 1.5, end: 2.0 };
const enrageK = track([[0, {}], [0.2, addPose({ oy: -0.015, bp: -0.03 }, fangs(0.2))],
  [0.5, addPose({ oy: 0.075, oz: -0.04, bp: 0.4, hp: -0.12, ap: -0.15, az: 0.044 }, fangs(0.9, 0.4))],
  [EN.slam - STRIKE, addPose({ oy: 0.08, oz: -0.045, bp: 0.44, hp: -0.14, ap: -0.2, az: 0.066 }, fangs(1, 0.5))],
  [EN.slam, addPose({ oy: -0.065, oz: 0.025, bp: -0.05, hp: 0.1, ap: 0.12, az: 0.11 }, fangs(0.4, -0.2)), 'in'],
  [EN.slam + HOLD, addPose({ oy: -0.068, oz: 0.026, bp: -0.052, hp: 0.1, ap: 0.12, az: 0.099 }, fangs(0.4, -0.2))],
  [EN.slam + 0.18, addPose({ oy: -0.03, bp: -0.01, ap: 0.04 }, fangs(0.3)), 'out'], [EN.end, {}]]);
const enrage = {
  dur: EN.end, contact: [EN.slam], kinds: ['slam'], phases: [['rear', 0], ['drum', 0.55], ['slam', EN.slam - STRIKE], ['settle', EN.slam + 0.1]],
  cues: { burn: [0.4], beats: EN.beats },
  pose: (t) => { const sh = pulse(t, 0.55, 0.65, 1.2, 1.35); return addPose(enrageK(t), { ar: 0.06 * Math.sin(t * 55) * sh, ay: 0.04 * Math.sin(t * 43) * sh, flr: 0.12 * Math.sin(t * 70) * sh, frr: -0.12 * Math.sin(t * 70) * sh }); },
  feet: (t, B) => { const F = allPlanted();
    for (const k of ['L1', 'R1', 'L2', 'R2']) {
      const one = k[1] === '1', up = held(B, k, 0.02, one ? 0.12 : 0.15, one ? -0.03 : 0.02), wide = { p: off(k, 0.035, 0, one ? 0.015 : 0.0), pitch: 0 };
      const back = EN.slam + 0.1 + { L1: 0, R1: 0.06, L2: 0.12, R2: 0.18 }[k];
      if (t < 0.22) F[k] = plant(REST[k]);
      else if (t < EN.slam - STRIKE) { const base = mixF({ p: REST[k], pitch: 0 }, up, smooth((t - 0.22) / 0.3)); // the drum: each beat the front legs strike down and spring back, left and right in turn
        if (one) { let d = 0; EN.beats.forEach((c, i) => { if ((i % 2 === 0) === (k === 'L1')) d += bump(t, c, 0.16); }); base.p.y -= 0.09 * d; base.p.z += 0.03 * d; } F[k] = base; }
      else if (t < EN.slam) F[k] = mixF(up, wide, EASE.in((t - EN.slam + STRIKE) / STRIKE));
      else F[k] = steps(t, wide.p, [[back, back + 0.15, REST[k], 0.03]]);
    }
    return F; },
};

// ------------------------------------------------------------------------------------------------ hurt, heavy hit
const hurt = { dur: wf(0.42), upperOnly: true,
  pose: (t) => { const k = Math.exp(-9 * t) * Math.sin(Math.min(1, t / 0.05) * Math.PI / 2); return { hy: 0.22 * k, hr: 0.1 * k, hp: -0.06 * k, ap: 0.1 * k, ar: -0.08 * k, az: 0.022 * k, flr: 0.15 * k, frr: -0.15 * k }; },
  feet: () => allPlanted() };
const HB = -0.3 / CFG.unit;
const heavyHit = {
  dur: 1.1, contact: [0], travel: (t) => HB * EASE.out(clamp(t / 0.32)), phases: [['hit', 0], ['scramble', 0.07], ['brace', 0.45], ['square up', 0.75]],
  pose: track([[0, {}], [0.06, addPose({ oy: -0.012, oz: -0.01, bp: 0.04, br: 0.05, hp: 0.15, hy: -0.25, ap: -0.15, ar: 0.1 }, fangs(0.6))],
    [0.3, addPose({ oy: -0.02, oz: -0.01, bp: 0.02, br: -0.02, hp: 0.0, hy: -0.08, ap: 0.08 }, fangs(0.3))],
    [0.55, addPose({ oy: -0.03, bp: -0.04, hp: 0.04, ap: 0.12, az: 0.028 }, fangs(0.5, 0.2))], [0.8, addPose({ oy: -0.008 }, fangs(0.2))], [1.1, {}]]),
  feet: (t) => Object.fromEntries(LEGS.map((k) => { const A = ['L1', 'R2', 'L3', 'R4'].includes(k), j = 0.012 * (+k[1] - 1); // the two sets of four scramble back in turn
    return [k, A ? steps(t, REST[k], [[0.0 + j, 0.1 + j, off(k, 0.01, 0, 0.55 * HB), 0.03], [0.2 + j, 0.32 + j, off(k, 0.01, 0, HB), 0.025]]) : steps(t, REST[k], [[0.05 + j, 0.16 + j, off(k, 0.01, 0, 0.9 * HB), 0.03], [0.34 + j, 0.44 + j, off(k, 0, 0, HB), 0.02]])]; })),
};

// ------------------------------------------------------------------------------------------------ spawn
// Grows out of the floor in 7 frames (the game's), curled up with her legs folded under her; the legs unfold and plant one
// by one, she rises, rears with her front legs up and slams them down once.
const SP = { grow: 7 / 60, slam: 0.95, end: 1.6 };
const spawn = {
  dur: SP.end, contact: [SP.slam], kinds: ['slam'], scale: (t) => Math.max(0.001, smooth(t / SP.grow)),
  phases: [['grow', 0], ['unfold', 0.2], ['rear', 0.7], ['slam', SP.slam - STRIKE], ['settle', SP.slam + 0.1]],
  pose: track([[0, addPose({ oy: -0.105, bp: -0.05, hp: 0.15, ap: -0.1, az: -0.1 }, fangs(0))], [0.3, addPose({ oy: -0.11, bp: -0.04, hp: 0.12, ap: -0.08 }, fangs(0.1))],
    [0.68, addPose({ oy: -0.01, bp: 0.0, hp: 0.0, ap: 0.05 }, fangs(0.3))], [SP.slam - STRIKE, addPose({ oy: 0.05, oz: -0.03, bp: 0.3, hp: -0.1, ap: -0.12 }, fangs(0.9, 0.4))],
    [SP.slam, addPose({ oy: -0.05, oz: 0.02, bp: -0.04, hp: 0.08, ap: 0.1, az: 0.083 }, fangs(0.4)), 'in'], [SP.slam + HOLD, addPose({ oy: -0.052, oz: 0.02, bp: -0.04, hp: 0.08, ap: 0.1, az: 0.077 }, fangs(0.4))],
    [SP.slam + 0.2, addPose({ oy: -0.02, ap: 0.03 }, fangs(0.3)), 'out'], [SP.end, {}]]),
  feet: (t, B) => { const F = {};
    for (const k of LEGS) {
      const i = { L2: 0, R3: 1, L3: 2, R2: 3, L4: 4, R4: 5, L1: 6, R1: 7 }[k], u0 = 0.22 + 0.055 * i, tuck = held(B, k, k[1] === '4' ? -0.05 : -0.12, 0.1, k[1] === '4' ? 0.03 : -0.02 * Math.sign(RLOC[k].z)), one = k[1] === '1';
      if (t < u0) F[k] = tuck;
      else if (t < u0 + 0.16) F[k] = mixF(tuck, { p: REST[k], pitch: 0 }, smooth((t - u0) / 0.16), 0.02);
      else F[k] = plant(REST[k]);
      if (one && t > 0.72) { const up = held(B, k, 0.02, 0.12, -0.02); if (t < SP.slam - STRIKE) F[k] = mixF({ p: REST[k], pitch: 0 }, up, smooth((t - 0.72) / 0.18)); else if (t < SP.slam) F[k] = mixF(up, { p: off(k, 0.03, 0, 0.01), pitch: 0 }, EASE.in((t - SP.slam + STRIKE) / STRIKE)); else F[k] = steps(t, off(k, 0.03, 0, 0.01), [[SP.slam + 0.14 + (k === 'R1' ? 0.08 : 0), SP.slam + 0.29 + (k === 'R1' ? 0.08 : 0), REST[k], 0.03]]); }
    }
    return F; },
};

// ------------------------------------------------------------------------------------------------ death
// The veins go out. A jolt rears her up with her legs splayed; she lurches to one side; her legs give one after another and
// she drops onto her belly; then all eight legs curl in under her, the way a dead spider's do, and the abdomen sags.
const D = { jolt: 0.12, lurch: 0.45, give: 0.85, down: 1.15, curl: 1.35, curled: 2.2, end: 2.8 };
const deathK = track([[0, {}], [D.jolt, addPose({ oy: 0.03, oz: -0.03, bp: 0.2, hp: -0.12, ap: -0.2 }, fangs(1, 0.5))],
  [D.lurch, addPose({ oy: 0.0, ox: 0.02, br: 0.1, bp: 0.05, hy: 0.15, ap: 0.05, ay: -0.1 }, fangs(0.6))],
  [D.give, addPose({ oy: -0.06, ox: 0.025, br: 0.12, bp: -0.04, hp: 0.06, hy: 0.1, ap: 0.0 }, fangs(0.4))],
  [D.down, addPose({ oy: -0.122, ox: 0.02, br: 0.05, bp: -0.03, hp: 0.1, hy: 0.06, ap: 0.02 }, fangs(0.3)), 'in'],
  [D.down + 0.12, addPose({ oy: -0.116, ox: 0.02, br: 0.06, bp: -0.03, hp: 0.08, hy: 0.06, ap: 0.03 }, fangs(0.3))],
  [D.curled, addPose({ oy: -0.124, ox: 0.02, br: 0.04, bp: -0.04, hp: 0.2, hy: 0.05, ap: 0.02, az: -0.04 }, fangs(0.1, -0.2))],
  [D.end, addPose({ oy: -0.124, ox: 0.02, br: 0.04, bp: -0.04, hp: 0.2, hy: 0.05, ap: 0.02, az: -0.04 }, fangs(0.1, -0.2))]]);
const death = {
  dur: D.end, contact: [D.give, D.down], kinds: ['thud', 'thud'], cues: { dark: [0.05, 1.6] }, pose: deathK,
  phases: [['jolt', 0], ['lurch', D.jolt], ['legs give', D.lurch], ['down', D.down], ['curl', D.curl], ['still', D.curled]],
  feet: (t, B) => { const F = {};
    for (const k of LEGS) {
      const i = LEGS.indexOf(k), splay = { p: FRONT(k) ? held(B, k, 0.0, 0.06, -0.02).p : REST[k], pitch: 0 }, down = off(k, FRONT(k) ? 0.05 : 0.03, 0, FRONT(k) ? -0.05 : 0), g0 = D.lurch + 0.05 * ((i * 5) % 8);
      const curl = held(B, k, -RLOC[k].x * SG[k] * 0.55, 0.11, -RLOC[k].z * 0.5 + ({ 3: 0.09, 4: -0.07 }[k[1]] || 0)); // legs 3 and 4 fold apart, not into each other
      if (FRONT(k) && t < g0) F[k] = mixF({ p: REST[k], pitch: 0 }, splay, smooth(t / D.jolt), 0.04); // the front legs fly up as it rears and stay up
      else if (t < g0) F[k] = plant(REST[k]);
      else if (t < D.curl) F[k] = FRONT(k) ? (t < g0 + 0.15 ? mixF(splay, { p: down, pitch: 0 }, (t - g0) / 0.15) : plant(down)) : steps(t, REST[k], [[g0, g0 + 0.15, down, 0.02]]);
      else { const c0 = D.curl + 0.06 * ((i * 3) % 8), u = smooth((t - c0) / 0.5); F[k] = t < c0 ? plant(down) : mixF({ p: down, pitch: 0 }, curl, u, 0.03); }
    }
    return F; },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), bind, slam, brood, enrage, hurt, heavyHit, spawn, death };
