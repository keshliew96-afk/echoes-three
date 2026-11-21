// The Thornmother's moves. Units are model units (the model is 1 long; the page draws it 2.2 u long, CFG.unit).
// Timings come from the game: THORNMOTHER in src/sim/bosses/thornmother.js (walk 1.3 u/s, Seed Volley with no warning,
// Briar Charge: 60-tick lane warning, 10 u/s, 40-tick skid) and the beats in src/render/facet/beats.js
// (strike 2.5 frames, contact held 3 frames, gather 1.5), with the phases of render/boss/thornmotherfacet.js.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, frac } from '../../kit/quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_, GATHER = 1.5 * FR_;
const BLADES = ['kfl', 'kfr', 'kml', 'kmr', 'ksl', 'ksr', 'krl', 'krr'];
export const CFG = {
  name: 'thornmother', unit: 2.2, base: { oy: -0.006 },
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n1'], ['head', 'h']],
  extras: [['earL', 'el'], ['earR', 'er'], ['tail1', 't1'], ['tail2', 't2'], ['hump1', 'u1'], ['hump2', 'u2'],
    ['bladeFL', 'kfl'], ['bladeFR', 'kfr'], ['bladeML', 'kml'], ['bladeMR', 'kmr'], ['bladeSL', 'ksl'], ['bladeSR', 'ksr'], ['bladeRL', 'krl'], ['bladeRR', 'krr'],
    ['podL', 'pl'], ['podR', 'pr'], ['podC', 'pc'], ['podB', 'pb']],
  scales: [['podL', 'pls'], ['podR', 'prs'], ['podC', 'pcs'], ['podB', 'pbs']],
  legs: {
    FL: { kind: 'front', b: ['fUpperL', 'fForeL', 'fCannonL', 'fHoofL'] }, FR: { kind: 'front', b: ['fUpperR', 'fForeR', 'fCannonR', 'fHoofR'] },
    HL: { kind: 'hind', b: ['hThighL', 'hShinL', 'hCannonL', 'hHoofL'] }, HR: { kind: 'hind', b: ['hThighR', 'hShinR', 'hCannonR', 'hHoofR'] },
  },
  springs: [{ bone: 'earL', k: 260, c: 13, max: 0.9 }, { bone: 'earR', k: 260, c: 13, max: 0.9 }, { bone: 'tail1', k: 220, c: 10, max: 0.9 }, { bone: 'tail2', k: 160, c: 7, max: 1.0 },
    ...['FL', 'FR', 'ML', 'MR', 'SL', 'SR', 'RL', 'RR'].map((k, i) => ({ bone: 'blade' + k, k: 620 + 40 * (i % 3), c: 9 + (i % 2), max: 0.5 }))],
};
const REST = { FL: V3(0.115, 0, 0.145), FR: V3(-0.115, 0, 0.145), HL: V3(0.115, 0, -0.26), HR: V3(-0.115, 0, -0.26) };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
// ears: back and up, the same words for both sides
const ears = (backL = 0, upL = 0, backR = backL, upR = upL) => ({ ely: backL, elr: upL, ery: -backR, err: -upR });
// the thorn blades: up stands them, splay opens them to the sides, wave ripples them from the front to the back
const bristle = (up = 0, splay = 0, wave = 0, ph = 0) => { const o = {}; BLADES.forEach((b, i) => { const sg = b[2] === 'l' ? 1 : -1, row = Math.floor(i / 2); o[b + 'p'] = -up - wave * Math.sin(ph - row * 1.1); o[b + 'r'] = -sg * (splay + 0.5 * wave * Math.cos(ph - row * 1.1)); }); return o; };
const pods = (l = 0, r = l, c = l, b = 0) => ({ pls: l, prs: r, pcs: c, pbs: b });
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.9); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const I = new THREE.Quaternion();

// ------------------------------------------------------------------------------------------------ idle
// 6 s. Slow heavy breaths that lift the thicket, the weight rolls, she sniffs low to her left, an ear flaps on each side,
// the tail whisks, and near the end she snorts and shakes her back so the blades rattle from front to rear.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const sniff = pulse(t, 0.6, 1.2, 2.3, 3.0), nose = Math.sin(19 * t) * pulse(t, 1.1, 1.4, 2.1, 2.4);
    const shake = pulse(t, 4.45, 4.6, 5.1, 5.45), sh = Math.sin(40 * (t - 4.45));
    return addPose(
      { oy: 0.005 * br - 0.006 * shake, cp: 0.012 * br, sp: -0.008 * br, u1b: 0.006 * br + 0.004, u2b: 0.005 * Math.sin(2 * w - 0.5) },
      { ox: 0.01 * sw, br: 0.02 * sw + 0.05 * sh * shake, by: 0.015 * Math.sin(w + 1), sy: 0.02 * Math.sin(w + 0.6), sr: 0.04 * sh * shake, cr: -0.03 * sh * shake },
      { n1p: -0.16 * sniff - 0.012 * br, hp: -0.2 * sniff + 0.03 * nose, n1y: 0.2 * sniff, hy: 0.24 * sniff + 0.04 * sh * shake, hr: 0.08 * sniff + 0.08 * Math.sin(40 * (t - 4.45) + 1) * shake },
      ears(-0.5 * bump(t, 1.0, 0.22) + 0.5 * shake * sh, 0.25 * bump(t, 1.0, 0.22), -0.5 * bump(t, 3.5, 0.22) - 0.5 * shake * sh, 0.25 * bump(t, 3.5, 0.22)),
      { t1y: 0.7 * bump(t, 2.6, 0.2) - 0.6 * bump(t, 2.82, 0.22) + 0.5 * bump(t, 3.02, 0.2) + 0.08 * sw, t2y: 0.5 * bump(t, 2.68, 0.2) - 0.5 * bump(t, 2.9, 0.22), t1p: 0.04 * br },
      bristle(0.02 * br + 0.1 * shake, 0.02 * br, 0.1 * shake, 40 * (t - 4.45)),
      { u1r: 0.05 * sh * shake, u2r: 0.06 * Math.sin(40 * (t - 4.45) - 1.2) * shake },
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// Diagonal pairs, as the game's gait (render/facet/gait.js). 1.3 u/s. 0.4 s a cycle: short quick steps under a heavy body.
const WT = 0.4;
const GAIT = { T: WT, duty: 0.56, v: 1.3 / CFG.unit };
const GF = { FL: { phase: 0, n: [0.115, 0.14], lift: 0.04, droop: 0.8, push: 0.2 }, HR: { phase: 0.05, n: [-0.115, -0.26], lift: 0.032, droop: 0.5, push: 0.25 },
             FR: { phase: 0.5, n: [-0.115, 0.14], lift: 0.04, droop: 0.8, push: 0.2 }, HL: { phase: 0.55, n: [0.115, -0.26], lift: 0.032, droop: 0.5, push: 0.25 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT;
    return addPose(
      { oy: -0.012 + 0.006 * Math.cos(2 * w - 0.6), bp: 0.012 * Math.sin(2 * w + 0.5), br: 0.035 * Math.sin(w + 0.2), ox: 0.008 * Math.sin(w + 0.6), by: 0.03 * Math.sin(w) },
      { sy: 0.045 * Math.sin(w + 0.4), sr: -0.02 * Math.sin(w + 0.2), cy: -0.04 * Math.sin(w + 0.4), cr: -0.02 * Math.sin(w + 0.2) },
      { n1p: -0.05 + 0.025 * Math.sin(2 * w + 1.3), hp: -0.04 - 0.03 * Math.sin(2 * w + 2.0), hy: -0.03 * Math.sin(w), n1y: -0.02 * Math.sin(w) },
      { t1y: 0.3 * Math.sin(w + 1.2), t2y: 0.3 * Math.sin(w + 0.4), u1b: 0.004 * Math.sin(2 * w + 2.2), u2b: 0.004 * Math.sin(2 * w + 1.2), u1r: -0.015 * Math.sin(w + 0.2), u2r: -0.02 * Math.sin(w - 0.3) },
      ears(0.1, 0.05), bristle(0.02, 0.01),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: WT, duty: 0.58, v: 0, omega: dir * 2 * Math.PI / 3.6, pivot: [0, -0.06] };
  const gf = { FL: { ...GF.FL, lift: 0.034 }, FR: { ...GF.FR, lift: 0.034 }, HL: { ...GF.HL, lift: 0.028 }, HR: { ...GF.HR, lift: 0.028 } };
  return {
    dur: WT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / WT;
      return addPose({ oy: -0.01 + 0.004 * Math.cos(2 * w - 0.5), br: 0.025 * Math.sin(w) - 0.02 * dir, bp: 0.008 * Math.sin(2 * w) },
        { sy: 0.06 * dir, cy: 0.06 * dir, n1y: 0.16 * dir, hy: 0.2 * dir, hr: 0.05 * dir, n1p: -0.04 + 0.015 * Math.sin(2 * w + 1) },
        { t1y: -0.35 * dir + 0.2 * Math.sin(w), u1r: -0.015 * Math.sin(w), u2r: -0.02 * Math.sin(w - 0.4) }, ears(0.1, 0.05), bristle(0.02, 0.01)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};


// ------------------------------------------------------------------------------------------------ Seed Volley
// The sim fires with no warning. gather (1.5 frames), heave (2.5 frames: the back bucks, three pods leave), held (3 frames),
// settle (0.5 s: the launch shoves her back, the blades ring, the pods grow back).
const SV = { g: GATHER, hit: GATHER + STRIKE, held: GATHER + STRIKE + HOLD, end: GATHER + STRIKE + HOLD + 0.5 };
const volley = {
  dur: SV.end, contact: [SV.hit], kinds: ['launch'], phases: [['gather', 0], ['heave', SV.g], ['pods away', SV.hit], ['settle', SV.held]],
  pose: (t) => {
    const k = track([[0, {}],
      [SV.g, { oy: -0.022, bp: -0.05, sp: -0.03, n1p: -0.1, hp: -0.12, u1b: -0.012, u2b: -0.014, u1p: 0.05, u2p: 0.04 }, 'out'],
      [SV.hit, { oy: 0.016, bp: 0.075, oz: -0.012, sp: 0.05, cp: 0.05, n1p: 0.16, hp: 0.24, u1b: 0.04, u2b: 0.048, u1p: -0.16, u2p: -0.2, t1p: 0.9 }, 'out'],
      [SV.held, { oy: 0.018, bp: 0.08, oz: -0.016, sp: 0.05, cp: 0.05, n1p: 0.17, hp: 0.25, u1b: 0.043, u2b: 0.05, u1p: -0.17, u2p: -0.21, t1p: 0.9 }],
      [SV.held + 0.1, { oy: -0.03, bp: -0.03, oz: -0.034, sp: -0.02, n1p: -0.06, hp: -0.04, u1b: -0.012, u2b: -0.016, u1p: 0.06, u2p: 0.08, t1p: 0.2 }],
      [SV.held + 0.24, { oy: 0.004, bp: 0.012, oz: -0.012, n1p: 0.02, hp: 0.03, u1b: 0.008, u2b: 0.01, u1p: -0.02, u2p: -0.03 }],
      [SV.end, {}]])(t);
    // the pods are gone on the contact frame and swell back with a small overshoot
    const gone = t >= SV.hit - 1e-6 ? 1 : 0; const grow = (d) => { const u = clamp((t - SV.held - d) / 0.3); return gone ? -1 + EASE.back(u) * 1.0 : 0.22 * smooth(t / SV.hit); };
    const fl = pulse(t, SV.g, SV.hit, SV.held + 0.05, SV.held + 0.3);
    return addPose(k, pods(grow(0.1), grow(0.14), grow(0.06), 0.3 * fl), bristle(0.42 * fl - 0.1 * pulse(t, 0, SV.g, SV.g, SV.hit), 0.3 * fl), ears(-0.2 * fl, 0.6 * fl));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ Briar Charge
// paw (the 1 s lane warning: head down, haunches set, the hind-left hoof scrapes the floor twice), burst (2.5 frames),
// charge (10 u/s; here 30 ticks, 5 u: a bounding gallop), stop (2.5 frames: both forehooves land a step ahead),
// held (3 frames), skid (the sim's 40-tick stand: she pitches over her forehooves, rocks back once and settles).
const PAW = 1.0, RUN = 0.5, VC = 10 / CFG.unit, SKID = 40 / 60;
const CH = { burst: PAW, run: PAW + STRIKE, stopAt: PAW + RUN, hit: PAW + RUN + STRIKE, held: PAW + RUN + STRIKE + HOLD, end: PAW + RUN + SKID };
const TG = 0.18, ST = 0.032; // a gallop stride, and how long one hoof is on the floor in it
const DUMMY = 3.0, REACH = (DUMMY - 0.75 - 0.3 - 0.1) / 10; // she reaches the hero stand-in 3 u ahead
const chTravel = (t) => VC * clamp(t - PAW, 0, RUN);
const TOTAL = VC * RUN;
function gallopSeq(k) {
  const front = k[0] === 'F', lead = k === 'FL' || k === 'HR' ? 0.018 : 0; const seq = []; let lift = front ? PAW - 0.035 : PAW + 0.02;
  const first = front ? 0.07 : 0.16; const n = front ? 3 : 2;
  for (let i = 0; i < n; i++) { const c = PAW + first + lead + i * TG; const to = off(k, 0, 0, chTravel(c)); seq.push([lift, c - ST / 2, to, front ? 0.07 : 0.06, front ? 1.0 : 0.5]); lift = c + ST / 2; }
  if (front) seq.push([lift, CH.hit, off(k, 0, 0, TOTAL + 0.05), 0.05, 0.9]); else seq.push([lift, CH.stopAt + lead, off(k, 0, 0, TOTAL + 0.012), 0.05, 0.5]);
  return seq;
}
const GSEQ = Object.fromEntries(LEGS.map((k) => [k, gallopSeq(k)]));
const charge = {
  dur: CH.end, contact: [PAW + REACH, CH.hit], kinds: ['hit', 'stop'], travel: chTravel, cues: { lane: [0, PAW] },
  phases: [['paw the ground', 0], ['burst', CH.burst], ['charge', CH.run], ['stop', CH.stopAt], ['braced', CH.hit], ['skid', CH.held]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.16, { oy: -0.02, oz: -0.02, bp: -0.05, n1p: -0.2, hp: -0.22, t1p: 0.3 }],
      [0.5, { oy: -0.03, oz: -0.04, bp: -0.07, sp: -0.03, n1p: -0.26, hp: -0.3, t1p: 0.6 }],
      [0.9, { oy: -0.036, oz: -0.055, bp: -0.06, sp: -0.04, n1p: -0.3, hp: -0.34, t1p: 0.9 }],
      [CH.burst, { oy: -0.042, oz: -0.06, bp: -0.04, sp: -0.05, n1p: -0.3, hp: -0.3, t1p: 1.0 }],
      [CH.run, { oy: -0.006, oz: 0.03, bp: 0.07, sp: 0.03, n1p: -0.22, hp: -0.2, t1p: 1.2 }, 'out'],
      [CH.stopAt, { oy: -0.006, oz: 0.02, bp: 0.03, n1p: -0.24, hp: -0.22, t1p: 1.2 }],
      [CH.hit, { oy: -0.034, oz: 0.07, bp: -0.13, sp: -0.05, cp: -0.03, n1p: 0.0, hp: 0.12, t1p: 1.4 }, 'in'],
      [CH.held, { oy: -0.037, oz: 0.074, bp: -0.14, sp: -0.05, cp: -0.03, n1p: 0.02, hp: 0.14, t1p: 1.4 }],
      [CH.held + 0.17, { oy: -0.012, oz: 0.0, bp: 0.05, sp: 0.02, n1p: 0.04, hp: 0.1, t1p: 0.2 }],
      [CH.held + 0.36, { oy: -0.016, oz: 0.016, bp: -0.02, n1p: -0.04, hp: -0.03 }],
      [CH.end, {}]])(t);
    const ph = (t - PAW) / TG, run = pulse(t, CH.burst, CH.run + 0.03, CH.stopAt - 0.02, CH.stopAt);
    const snort = pulse(t, 0.3, 0.4, 0.92, 1.0);
    return addPose(k,
      { bp: 0.085 * Math.cos(2 * Math.PI * (ph - 0.86)) * run, oy: (0.02 * Math.cos(2 * Math.PI * (ph - 0.12)) + 0.012) * run, sp: 0.05 * Math.cos(2 * Math.PI * (ph - 0.7)) * run, cp: -0.04 * Math.cos(2 * Math.PI * (ph - 0.5)) * run,
        hp: -0.05 * Math.cos(2 * Math.PI * (ph - 0.6)) * run, u1b: 0.01 * Math.cos(2 * Math.PI * (ph - 0.4)) * run, u2b: 0.012 * Math.cos(2 * Math.PI * (ph - 0.2)) * run },
      { hy: 0.03 * Math.sin(60 * t) * snort, hr: 0.03 * Math.sin(60 * t + 1) * snort, br: 0.01 * Math.sin(47 * t) * snort },
      bristle(0.26 * smooth(t / 0.9) * (1 - smooth((t - CH.burst) / 0.06)) - 0.16 * run + 0.2 * pulse(t, CH.stopAt, CH.hit, CH.held + 0.1, CH.held + 0.4), 0.2 * smooth(t / 0.9) * (1 - smooth((t - CH.burst) / 0.06)), 0.03 * snort, 60 * t),
      ears(0.2 * smooth(t / 0.3) + 0.7 * run, -0.1 * snort), pods(0.16 * snort, 0.16 * snort, 0.16 * snort, 0.16 * snort));
  },
  feet: (t) => {
    const F = {}; for (const k of LEGS) F[k] = steps(t, REST[k], GSEQ[k]);
    // the paw: the hind-left hoof lifts and scrapes back, twice
    for (const c of [0.2, 0.56]) if (t >= c && t < c + 0.3) { const q = track([[c, { y: 0, z: 0, p: 0 }], [c + 0.1, { y: 0.045, z: 0.06, p: 0.5 }], [c + 0.15, { y: 0.006, z: 0.05, p: 0.25 }, 'in'], [c + 0.23, { y: 0.012, z: -0.075, p: 0.75 }, 'out'], [c + 0.3, { y: 0, z: 0, p: 0 }]])(t); F.HL = { p: off('HL', 0, q.y, q.z), pitch: q.p }; }
    for (const k of ['HL', 'HR']) if (F[k].lock && t > PAW - 0.02 && t < PAW + 0.03) F[k].pitch = 0.6 * smooth((t - PAW + 0.02) / 0.04); // the push off the toes
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Call the wood
// The add waves at 75, 50 and 25 percent. The game plays a roar and no pose; this pose is new.
const C = { stomp: 0.5 + STRIKE };
const call = {
  dur: 1.5, contact: [C.stomp], kinds: ['stomp'], phases: [['coil', 0], ['squeal', 0.24], ['stomp', 0.5], ['hold', C.stomp], ['settle', 1.0]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.24, { oy: -0.03, bp: -0.06, sp: -0.03, n1p: -0.24, hp: -0.26, u1b: -0.01, u2b: -0.01 }],
      [0.44, { oy: 0.012, bp: 0.09, cp: 0.06, sp: 0.04, n1p: 0.24, hp: 0.4, u1b: 0.02, u2b: 0.024, t1p: 1.0 }, 'out'],
      [C.stomp, { oy: -0.006, bp: 0.07, cp: 0.06, sp: 0.03, n1p: 0.25, hp: 0.4, u1b: 0.022, u2b: 0.026, t1p: 1.0 }],
      [1.0, { oy: 0.004, bp: 0.07, cp: 0.05, sp: 0.03, n1p: 0.22, hp: 0.36, u1b: 0.018, u2b: 0.02, t1p: 0.8 }],
      [1.24, { oy: -0.008, bp: 0.01, n1p: 0.02, hp: 0.0, t1p: 0.1 }],
      [1.5, {}]])(t);
    const env = pulse(t, 0.4, 0.5, 0.92, 1.08);
    return addPose(k, { hy: 0.05 * Math.sin(86 * t) * env, hr: 0.04 * Math.sin(86 * t + 1.2) * env, cp: 0.012 * Math.sin(86 * t) * env, u1r: 0.03 * Math.sin(86 * t) * env, u2r: 0.03 * Math.sin(86 * t - 1) * env },
      bristle(0.4 * pulse(t, 0.24, 0.46, 1.0, 1.3), 0.3 * pulse(t, 0.24, 0.46, 1.0, 1.3), 0.06 * env, 86 * t), ears(-0.3 * env, 0.7 * pulse(t, 0.3, 0.46, 1.0, 1.3)),
      pods(0.22 * env, 0.22 * env, 0.22 * env, 0.22 * env));
  },
  feet: (t) => {
    const F = allPlanted(); const r = REST.FL;
    if (t > 0.2 && t < C.stomp) { const up = off('FL', 0.005, 0.085, 0.04);
      if (t < 0.42) { const u = smooth((t - 0.2) / 0.22); F.FL = { p: r.clone().lerp(up, u), pitch: 0.9 * Math.sin(Math.PI * 0.5 * u) }; }
      else if (t < 0.5) F.FL = { p: up.clone().add(V3(0, 0.006 * Math.sin(40 * t), 0)), pitch: 0.9 };
      else { const u = ((t - 0.5) / STRIKE) ** 2; F.FL = { p: up.clone().lerp(r, u), pitch: 0.9 * (1 - u) }; } }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything. Only the neck, head, ears, tail, back and blades move, so planted hooves stay planted.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { n1p: 0.14, hp: 0.1, hy: 0.22, hr: 0.16, n1y: 0.1, t1p: 0.8, u1b: -0.008, u2b: -0.01, u1r: 0.05, u2r: 0.07 }, 'out'], [0.17, { n1p: -0.04, hy: -0.06, hr: -0.04, t1p: -0.1, u1b: 0.004, u2b: 0.005, u1r: -0.02, u2r: -0.03 }], [0.42, {}]])(t),
    ears(0.6 * pulse(t, 0, 0.04, 0.2, 0.4), 0.5 * pulse(t, 0, 0.04, 0.2, 0.4)), bristle(0.16 * pulse(t, 0, 0.04, 0.12, 0.4), 0.12 * pulse(t, 0, 0.04, 0.12, 0.4))),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers her: shoved back a step, the head whips away, the back shudders, she shakes it off and squares up.
const HB = -0.075;
const heavyHit = {
  dur: 1.1, contact: [0], kinds: ['taken'], travel: (t) => HB * EASE.out(clamp(t / 0.3)), phases: [['hit', 0], ['stagger', 0.07], ['shake', 0.38], ['square up', 0.7]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.03, oy: -0.018, bp: 0.12, br: 0.09, by: -0.1, sp: 0.06, cp: 0.08, n1p: 0.2, hp: 0.1, hy: -0.4, n1y: -0.2, hr: -0.22, t1p: 1.0, u1b: -0.012, u2b: -0.014 }, 'out'],
      [0.24, { oz: -0.01, oy: -0.04, bp: 0.02, br: -0.04, by: -0.04, n1p: -0.02, hp: -0.22, hy: -0.24, n1y: -0.08, hr: 0.1, t1p: 0.2, u1b: 0.008, u2b: 0.01 }],
      [0.44, { oy: -0.02, bp: -0.04, n1p: -0.16, hp: -0.18, hy: 0.06, t1p: -0.15 }],
      [0.74, { oy: -0.006, bp: 0.012, n1p: -0.04, hp: -0.02 }],
      [1.1, {}]])(t);
    const sh = pulse(t, 0.36, 0.44, 0.6, 0.74), w = 36 * (t - 0.36);
    return addPose(k, { hy: 0.1 * Math.sin(w) * sh, hr: 0.1 * Math.sin(w + 1.3) * sh, br: 0.04 * Math.sin(w - 0.6) * sh, u1r: 0.05 * Math.sin(w - 1) * sh, u2r: 0.06 * Math.sin(w - 1.8) * sh },
      ears(0.7 * pulse(t, 0, 0.05, 0.3, 0.5) + 0.5 * Math.sin(w) * sh, 0.5 * pulse(t, 0, 0.05, 0.4, 0.8), 0.7 * pulse(t, 0, 0.05, 0.3, 0.5) - 0.5 * Math.sin(w) * sh, 0.5 * pulse(t, 0, 0.05, 0.4, 0.8)),
      bristle(0.2 * pulse(t, 0, 0.05, 0.2, 0.5), 0.1 * sh, 0.08 * sh, w));
  },
  feet: (t) => ({
    HL: steps(t, REST.HL, [[0.035, 0.15, off('HL', 0, 0, HB), 0.03, 0.4]]), FR: steps(t, REST.FR, [[0.075, 0.19, off('FR', 0, 0, HB), 0.035]]),
    HR: steps(t, REST.HR, [[0.15, 0.265, off('HR', 0, 0, HB), 0.03, 0.4]]), FL: steps(t, REST.FL, [[0.2, 0.315, off('FL', 0, 0, HB), 0.035]]),
  }),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames, then stand. She heaves up out of a crouch with her pods small,
// shakes the thicket so the blades stand and the pods swell, and stamps once.
const SP = { grow: 7 * FR_, stamp: 0.78 + STRIKE };
const spawn = {
  dur: 1.6, contact: [SP.stamp], kinds: ['stomp'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['rise', SP.grow], ['shake', 0.42], ['stamp', 0.78], ['stand', SP.stamp]],
  pose: (t) => {
    const lowp = { oy: -0.07, bp: -0.05, sp: -0.04, n1p: -0.1, hp: -0.08, u1b: -0.016, u2b: -0.018, t1p: -0.2 };
    const k = track([[0, lowp], [SP.grow, lowp],
      [0.42, { oy: -0.012, bp: 0.0, sp: -0.02, n1p: -0.14, hp: -0.18, t1p: 0.1 }],
      [0.78, { oy: 0.01, bp: 0.07, cp: 0.05, sp: 0.03, n1p: 0.18, hp: 0.24, u1b: 0.012, u2b: 0.014, t1p: 0.8 }, 'out'],
      [SP.stamp, { oy: 0.0, bp: 0.05, cp: 0.05, sp: 0.03, n1p: 0.17, hp: 0.22, u1b: 0.012, u2b: 0.014, t1p: 0.85 }],
      [1.14, { oy: -0.008, bp: 0.015, cp: 0.01, n1p: 0.05, hp: 0.04, t1p: 0.2 }],
      [1.6, {}]])(t);
    const sh = pulse(t, 0.4, 0.48, 0.66, 0.78), w = 42 * (t - 0.4); const sw = -0.6 * (1 - EASE.back(clamp((t - 0.44) / 0.34)));
    return addPose(k, { br: 0.05 * Math.sin(w) * sh, sr: 0.04 * Math.sin(w - 0.6) * sh, hr: 0.08 * Math.sin(w + 1) * sh, hy: 0.05 * Math.sin(w) * sh, u1r: 0.05 * Math.sin(w - 1) * sh, u2r: 0.06 * Math.sin(w - 1.8) * sh },
      pods(sw, sw, sw, sw), bristle(-0.22 * (1 - smooth((t - 0.4) / 0.3)) + 0.3 * pulse(t, 0.5, 0.78, 0.95, 1.3), 0.2 * pulse(t, 0.5, 0.78, 0.95, 1.3), 0.08 * sh, w), ears(0.4 * pulse(t, 0, 0.1, 0.4, 0.6) + 0.5 * Math.sin(w) * sh, 0.3 * sh));
  },
  feet: (t) => {
    const F = allPlanted(); const r = REST.FR, up = off('FR', -0.004, 0.075, 0.035);
    if (t > 0.56 && t < SP.stamp) {
      if (t < 0.74) { const u = smooth((t - 0.56) / 0.18); F.FR = { p: r.clone().lerp(up, u), pitch: 0.9 * Math.sin(Math.PI * 0.5 * u) }; }
      else if (t < 0.78) F.FR = { p: up.clone(), pitch: 0.9 };
      else { const u = ((t - 0.78) / STRIKE) ** 2; F.FR = { p: up.clone().lerp(r, u), pitch: 0.9 * (1 - u) }; } }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ death
// Her hooves unlock. A jolt and a last squeal, the forelegs slide out ahead and her chin hits the floor, the hindquarters sit down,
// and she rolls onto her right side; the blades sag and the pods wither.
const D = { chin: 0.6, sit: 1.0, side: 1.45, end: 2.5 };
const death = {
  dur: D.end, contact: [D.chin, D.side], kinds: ['thud', 'thud'], phases: [['jolt', 0], ['forelegs give', 0.16], ['sits down', D.chin], ['rolls over', D.sit], ['still', D.side]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.12, { bp: 0.1, oy: 0.004, br: -0.04, n1p: 0.24, hp: 0.36, hy: 0.12, t1p: 1.0 }, 'out'],
      [D.chin, { bp: -0.15, oy: -0.038, oz: 0.02, br: 0.03, sp: -0.04, n1p: -0.14, hp: -0.06, hy: -0.08, t1p: 0.2 }, 'in'],
      [D.chin + 0.08, { bp: -0.135, oy: -0.04, oz: 0.02, br: 0.04, sp: -0.04, n1p: -0.11, hp: -0.02, hy: -0.08, t1p: 0.2 }, 'out'],
      [D.sit, { bp: -0.03, oy: -0.078, oz: 0.0, br: 0.14, by: 0.05, sp: 0.0, n1p: 0.0, hp: 0.1, hy: 0.0, hr: -0.1, t1p: 0.4 }],
      [D.sit + 0.26, { bp: -0.01, oy: -0.066, oz: -0.005, br: 0.75, by: 0.09, sr: 0.02, cr: 0.02, n1p: 0.06, hp: 0.12, hy: -0.04, hr: -0.12, n1r: -0.04, t1p: 0.4 }],
      [D.side, { bp: 0.0, oy: -0.092, oz: -0.01, br: 1.36, by: 0.12, sr: 0.03, cr: 0.03, n1p: 0.1, hp: 0.14, n1y: -0.06, hy: -0.08, hr: -0.14, n1r: -0.08, t1p: 0.3 }, 'in'],
      [D.side + 0.12, { bp: 0.0, oy: -0.096, oz: -0.01, br: 1.32, by: 0.12, sr: 0.03, cr: 0.03, n1p: 0.12, hp: 0.16, n1y: -0.1, hy: -0.12, hr: -0.14, n1r: -0.08, t1p: 0.1 }, 'out'],
      [D.end, { bp: 0.0, oy: -0.098, oz: -0.01, br: 1.34, by: 0.12, sr: 0.03, cr: 0.03, n1p: 0.02, hp: 0.04, n1y: -0.2, hy: -0.2, hr: -0.12, n1r: -0.08, t1p: -0.1 }],
    ])(t);
    const wither = smooth((t - D.sit) / 1.2), sq = pulse(t, 0.06, 0.14, 0.4, 0.55);
    return addPose(k, { hy: 0.04 * Math.sin(70 * t) * sq, hr: 0.03 * Math.sin(70 * t + 1) * sq, u1b: -0.012 * wither, u2b: -0.014 * wither },
      pods(-0.62 * wither, -0.62 * wither, -0.62 * wither, -0.62 * wither), bristle(0.3 * pulse(t, 0, 0.1, 0.5, 0.9) - 0.34 * wither, 0.2 * pulse(t, 0, 0.1, 0.5, 0.9) - 0.1 * wither),
      ears(0.6 * pulse(t, 0, 0.06, 0.6, 1.0), 0.5 * pulse(t, 0, 0.06, 0.5, 0.8) - 0.3 * wither));
  },
  feet: (t, B) => {
    const fold = smooth((t - 0.16) / 0.4), uL = smooth((t - D.sit + 0.1) / 0.5), uR = smooth((t - D.sit + 0.3) / 0.36);
    const lie = { FL: [-0.05, -0.2, 0.09], FR: [-0.01, -0.215, 0.1], HL: [-0.05, -0.215, 0.07], HR: [-0.01, -0.23, 0.09] };
    const tuck = { FL: off('FL', 0.03, 0, 0.1), FR: off('FR', -0.03, 0, 0.085), HL: off('HL', 0.03, 0, 0.1), HR: off('HR', -0.03, 0, 0.1) };
    const F = {};
    for (const k of LEGS) {
      const front = k[0] === 'F'; const f = front ? fold : smooth((t - D.chin) / 0.4); const u = k[1] === 'R' ? uR : uL; // the legs she falls on swing clear first
      const a = REST[k].clone().lerp(tuck[k], f);
      const twitch = 0.01 * Math.sin(30 * t + (k === 'FL' ? 0 : 2)) * pulse(t, D.side, D.side + 0.1, D.side + 0.4, D.side + 0.7);
      const l = lie[k]; const lp = B.loc(k, [l[0], l[1] + twitch, l[2]]); lp.y = Math.max(lp.y, 0.03 * u);
      F[k] = { p: a.lerp(lp, u), pitch: (front ? 0.5 : 0.5) * f * (1 - u) + 0.5 * u, q: I.clone().slerp(B.parQ(k), u), lock: t < 0.16 };
    }
    return F;
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), volley, charge, call, hurt, heavyHit, spawn, death };
