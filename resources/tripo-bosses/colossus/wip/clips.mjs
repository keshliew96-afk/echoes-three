// The Geode Colossus's moves. Units are model units (the model is 0.96 tall with its crystals; the page draws it at the
// game's scale of 2.6, CFG.unit). Timings come from the game: COLOSSUS in src/sim/bosses/colossus.js (walk 1.15 u/s;
// Fissure: 54-tick lane; Geode Rain: no warning, loaded over the last 30 ticks; Geode Burst: 60-tick ring, then spent for
// 80 ticks) and the beats in src/render/facet/beats.js (strike 2.5 frames, contact held 3 frames, an unwarned wind 1.5 frames).
// It knuckle-walks: the fists (FL, FR) are feet as much as the legs (HL, HR) are, stepping as diagonal pairs.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from './quad.mjs';
const FR_ = 1 / 60; const wf = (x) => Math.round(x * 60) / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_, GATHER = 1.5 * FR_;
export const CFG = {
  name: 'colossus', unit: 2.6,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['heart', 'ht']],
  scales: [['heart', 'hz']],
  legs: {
    FL: { kind: 'limb', b: ['armL', 'foreL', 'fistL', 'knuckL'], pole: [0.5, -0.6, -0.6], noDrop: true }, FR: { kind: 'limb', b: ['armR', 'foreR', 'fistR', 'knuckR'], pole: [-0.5, -0.6, -0.6], noDrop: true },
    HL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'], pole: [0.15, 0, 1] }, HR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'], pole: [-0.15, 0, 1] },
  },
  springs: [],
};
const REST = { FL: V3(0.36, 0, 0.21), FR: V3(-0.36, 0, 0.21), HL: V3(0.145, 0, -0.09), HR: V3(-0.145, 0, -0.09) };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const SG = { FL: 1, FR: -1, HL: 1, HR: -1 };
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x * SG[k], y, z)); // x is outward
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.5); return { p: s.p, pitch: to.z < cur.z - 1e-4 ? Math.max(s.pitch, 0) : s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
// A fist off the floor, placed by its wrist: a turns the hand about its knuckles' axis (0 knuckles down as it walks,
// -pi/2 knuckles forward, -pi knuckles up as in a punch at the ceiling), r rolls it (positive: the palm turns in), y yaws it.
const C0 = { FL: V3(0.01, 0.158, -0.01), FR: V3(-0.01, 0.158, -0.01) }, HV0 = V3(0, -0.012, 0.09);
const fq = (a = 0, y = 0, r = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(a, y, r, 'YXZ'));
function fist(k, W, a = 0, r = 0, y = 0) { const q = fq(a, y * SG[k], r * SG[k]); const ball = W.clone().sub(C0[k].clone().applyQuaternion(q)); return { p: ball.add(HV0.clone().applyQuaternion(q)), q }; }
const restW = (k) => REST[k].clone().sub(HV0).add(C0[k]); // the wrist over a planted fist
const W = (k, x, y, z) => V3(x * SG[k], y, z);
// Blend between fist placements: [[t, {w:[x outward, y, z], a, r}] ...]; at a key with plant: true the fist is on the floor.
function fistTrack(k, keys, t) {
  const tk = track(keys.map(([tt, o, e]) => [tt, { x: o.w[0], y: o.w[1], z: o.w[2], a: o.a || 0, r: o.r || 0 }, e]))(t);
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  const k0 = keys[i][1], k1 = keys[Math.min(i + 1, keys.length - 1)][1];
  const f = fist(k, W(k, tk.x, tk.y, tk.z), tk.a, tk.r);
  if (k0.plant && (k1.plant || t >= keys[keys.length - 1][0]) && k0.w.join() === k1.w.join() && k0.w.join() === restKey.w.join()) { f.lock = true; }
  return f;
}
const RW = { x: 0.37, y: 0.17, z: 0.11 }; // the rest wrist, outward x
const restKey = { w: [RW.x, RW.y, RW.z], plant: true };

// ------------------------------------------------------------------------------------------------ idle
// 4.5 s. Two slow heavy breaths that lift the hump and the shoulders, the weight rolling from fist to fist; the head
// turns to look right, then left; the left fist lifts and grinds back onto its knuckles; a snort that dips the head.
const idle = {
  dur: 4.5, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 4.5, br = Math.sin(2 * w), sw = Math.sin(w);
    const look = 0.32 * pulse(t, 0.4, 1.0, 1.7, 2.3) - 0.28 * pulse(t, 2.5, 3.0, 3.4, 3.9);
    const grip = pulse(t, 2.75, 2.9, 3.15, 3.35), snort = bump(t, 4.05, 0.22);
    return addPose(
      { oy: 0.004 * br - 0.003 * snort, ox: 0.008 * sw, br: 0.016 * sw - 0.02 * grip, by: 0.015 * Math.sin(w + 0.8), bp: 0.008 * br, sp: 0.01 * br, cp: 0.014 * br },
      { np: -0.01 * br - 0.08 * snort, hp: 0.012 * Math.sin(2 * w + 1) - 0.06 * snort, ny: 0.4 * look, hy: 0.45 * look, hr: 0.08 * look, cy: 0.06 * look },
      { hz: 0.04 * Math.max(0, Math.sin(2 * Math.PI * t / 0.9)) ** 4 },
    );
  },
  feet: (t) => { const F = allPlanted(); if (t > 2.75 && t < 3.35) { const u = clamp((t - 2.75) / 0.6); F.FL = { p: off('FL', 0.004, 0.035 * Math.sin(Math.PI * u), -0.008 * Math.sin(Math.PI * u)), pitch: 0.35 * Math.sin(Math.PI * u) + 0.12 * bump(u, 0.85, 0.2) }; } return F; },
};

// ------------------------------------------------------------------------------------------------ walk and turn
// A knuckle-walk in diagonal pairs (left fist with right foot), as the game's rig. 1.15 u/s. One stride of 0.75 u
// every 0.65 s. The hump rolls over each planted pair and the head stays level.
const WT = 39 / 60;
const GAIT = { T: WT, duty: 0.6, v: 1.15 / CFG.unit };
const GF = { FL: { phase: 0, n: [0.36, 0.21], lift: 0.075, droop: 0.5, push: 0.35 }, HR: { phase: 0.04, n: [-0.145, -0.09], lift: 0.04, droop: 0.3, push: 0.35 },
             FR: { phase: 0.5, n: [-0.36, 0.21], lift: 0.075, droop: 0.5, push: 0.35 }, HL: { phase: 0.54, n: [0.145, -0.09], lift: 0.04, droop: 0.3, push: 0.35 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT;
    return addPose(
      { oy: -0.006 + 0.007 * Math.cos(2 * w - 0.6), oz: 0.01, bp: -0.04 + 0.012 * Math.sin(2 * w + 0.4), br: 0.035 * Math.sin(w + 0.3), ox: 0.008 * Math.sin(w + 0.5), by: 0.04 * Math.sin(w) },
      { sy: -0.03 * Math.sin(w + 0.4), sr: -0.012 * Math.sin(w + 0.3), cy: -0.04 * Math.sin(w + 0.5), cr: -0.016 * Math.sin(w + 0.3) },
      { np: 0.03 - 0.012 * Math.sin(2 * w + 1.3), hp: 0.02 - 0.012 * Math.sin(2 * w + 1.8), ny: -0.03 * Math.sin(w), hy: -0.03 * Math.sin(w), hr: -0.02 * Math.sin(w + 0.3) },
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
export const TURN_DEG = 70;
const TURN = TURN_DEG * Math.PI / 180;
const turn = (dir) => {
  const TT = 30 / 60; const g = { T: TT, duty: 0.52, v: 0, omega: dir * TURN, pivot: [0, 0.1] };
  const gf = { FL: { ...GF.FL, lift: 0.06 }, FR: { ...GF.FR, lift: 0.06 }, HL: { ...GF.HL, lift: 0.035 }, HR: { ...GF.HR, lift: 0.035 } };
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT;
      return addPose({ oy: -0.006 + 0.005 * Math.cos(2 * w - 0.5), oz: 0.01, br: 0.025 * Math.sin(w) - 0.02 * dir, bp: -0.04 + 0.008 * Math.sin(2 * w) },
        { ny: 0.12 * dir, hy: 0.16 * dir, hr: 0.04 * dir }); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ Fissure
// raise (the 54-tick lane less one strike: the right fist hauled up overhead, the weight back on the left fist and the legs,
// the body coiled and twisted), slam (2.5 frames on the hit: the fist driven into the floor ahead on the lane, the lunge,
// the squash), held, a recoil as the crack runs out, settle (the fist back to its knuckles).
const FI = { raise: 0.9 - STRIKE, hit: 0.9, held: 0.9 + HOLD, end: wf(0.9 + HOLD + 0.62) };
const SLAMW = { w: [0.2, 0.17, 0.41], a: 0, plant: true };
const fissure = {
  dur: FI.end, contact: [FI.hit], phases: [['raise the fist', 0], ['slam', FI.raise], ['struck', FI.hit], ['settle', FI.held + 0.1]], cues: { lane: [0, FI.hit], crack: [FI.hit] },
  pose: (t) => {
    const k = track([[0, {}],
      [0.3, { oy: 0.005, oz: -0.02, bp: 0.07, br: -0.04, by: -0.05, sy: -0.04, cy: -0.07, cr: -0.03, np: -0.02, hp: 0.05, hy: 0.1 }],
      [FI.raise, { oy: 0.0, oz: -0.03, bp: 0.09, br: -0.06, by: -0.08, sy: -0.06, cy: -0.1, cr: -0.05, cp: 0.04, np: -0.04, hp: 0.0, hy: 0.16 }],
      [FI.hit, { oy: -0.07, oz: 0.11, bp: -0.42, br: 0.08, by: 0.1, sy: 0.08, cy: 0.12, cr: 0.06, cp: -0.08, np: 0.14, hp: 0.16, hy: -0.08 }, 'in'],
      [FI.held, { oy: -0.074, oz: 0.112, bp: -0.43, br: 0.085, by: 0.1, sy: 0.08, cy: 0.12, cr: 0.06, cp: -0.08, np: 0.15, hp: 0.18, hy: -0.08 }],
      [FI.held + 0.12, { oy: -0.045, oz: 0.07, bp: -0.28, br: 0.05, by: 0.08, sy: 0.05, cy: 0.07, cp: -0.02, np: 0.04, hp: 0.06, hy: -0.04 }, 'out'],
      [FI.held + 0.36, { oy: -0.01, oz: 0.015, bp: -0.05, br: 0.01, by: 0.02, hy: -0.0 }],
      [FI.end, {}]])(t);
    return k;
  },
  feet: (t) => {
    const F = allPlanted();
    // the left fist shifts its plant in under the body to take the weight, and comes forward again after
    F.FL = steps(t, REST.FL, [[0.12, 0.34, off('FL', -0.06, 0, -0.02), 0.04], [FI.raise - 0.1, FI.hit, REST.FL, 0.05]]);
    F.FR = fistTrack('FR', [[0, restKey], [0.06, restKey],
      [0.32, { w: [0.3, 0.55, 0.12], a: -1.6, r: 0.4 }],
      [FI.raise - 0.12, { w: [0.24, 0.92, 0.0], a: -2.6, r: 0.2 }],
      [FI.raise, { w: [0.23, 0.95, -0.02], a: -2.5, r: 0.15 }, 'in'],
      [FI.raise + STRIKE * 0.5, { w: [0.22, 0.62, 0.3], a: -1.3, r: 0.08 }],
      [FI.hit, SLAMW, 'in'], [FI.held + 0.2, SLAMW],
      [FI.held + 0.42, { w: [0.3, 0.24, 0.24], a: 0.3 }], [FI.end - 0.06, restKey], [FI.end, restKey]], t);
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Geode Rain
// The sim gives no warning. load (the game's rig reads the next rain ahead: over the last 30 ticks both fists come up to the
// chest and the geode brightens), heave (1.5 frames), hurl (2.5 frames: both fists punched at the ceiling, the body reared),
// held, settle. The geodes fall 66 ticks later.
const RA = { load: 0.5, heave: 0.5 + GATHER, hit: 0.5 + GATHER + STRIKE, held: 0.5 + GATHER + STRIKE + HOLD, end: wf(0.5 + GATHER + STRIKE + HOLD + 0.72) };
const PUNCH = { w: [0.2, 1.08, 0.12], a: -3.1, r: 0.25 };
const rain = {
  dur: RA.end, contact: [RA.hit], phases: [['load', 0], ['heave', RA.load], ['hurl', RA.heave], ['thrown', RA.hit], ['settle', RA.held + 0.12]], cues: { load: [0, RA.hit], rain: [RA.hit] },
  pose: (t) => track([[0, {}],
    [0.18, { oy: -0.01, oz: -0.02, bp: 0.06, np: 0.02, hp: -0.04 }],
    [RA.load, { oy: 0.0, oz: -0.05, bp: 0.22, sp: 0.04, cp: 0.04, np: -0.06, hp: -0.12 }],
    [RA.heave, { oy: -0.02, oz: -0.055, bp: 0.2, sp: 0.03, cp: 0.02, np: -0.08, hp: -0.16 }],
    [RA.hit, { oy: 0.03, oz: -0.06, bp: 0.42, sp: 0.08, cp: 0.08, np: 0.14, hp: 0.3 }, 'out'],
    [RA.held, { oy: 0.032, oz: -0.06, bp: 0.43, sp: 0.08, cp: 0.08, np: 0.15, hp: 0.32 }],
    [RA.held + 0.14, { oy: 0.02, oz: -0.05, bp: 0.36, sp: 0.06, cp: 0.06, np: 0.1, hp: 0.22 }, 'out'],
    [RA.held + 0.42, { oy: -0.025, oz: 0.0, bp: -0.04, np: 0.0, hp: 0.04 }, 'in'],
    [RA.held + 0.52, { oy: -0.012, oz: 0.0, bp: -0.02, hp: 0.02 }],
    [RA.end, {}]])(t),
  feet: (t) => {
    const F = allPlanted();
    for (const k of ['FL', 'FR']) {
      const d = k === 'FL' ? 0 : 0.03;
      F[k] = fistTrack(k, [[0, restKey], [0.05 + d, restKey],
        [0.3 + d, { w: [0.24, 0.42, 0.24], a: -1.3, r: 0.6 }],
        [RA.load, { w: [0.17, 0.5, 0.25], a: -1.6, r: 0.9 }],
        [RA.heave, { w: [0.18, 0.46, 0.24], a: -1.55, r: 0.9 }],
        [RA.hit, PUNCH, 'out'], [RA.held, PUNCH],
        [RA.held + 0.18, { w: [0.25, 0.85, 0.15], a: -2.6, r: 0.2 }],
        [RA.held + 0.42 + d, { w: [RW.x, RW.y, RW.z + 0.02], a: 0.1 }, 'in'], [RA.held + 0.44 + d, restKey], [RA.end, restKey]], t);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Geode Burst
// swell (the 60-tick ring less one strike: reared up off the fists, both arms spread wide, the geode opens and blazes),
// burst (2.5 frames on the hit: the chest thrust, the fists slammed down wide, the squash), held, spent (the sim's 80
// ticks: it slumps dim with the arms slack, the punish window), recover (it hauls itself up and squares off).
const BU = { swell: 1.0 - STRIKE, hit: 1.0, held: 1.0 + HOLD, spent: 1.0 + HOLD + 80 * FR_, end: wf(1.0 + HOLD + 80 * FR_ + 0.62) };
const WIDE = { w: [0.56, 0.17, 0.22], a: 0, plant: true };
const SLUMPW = { w: [0.5, 0.17, 0.25], a: 0.15, plant: true };
const burst = {
  dur: BU.end, contact: [BU.hit], phases: [['swell', 0], ['burst', BU.swell], ['struck', BU.hit], ['spent', BU.held + 0.2], ['recover', BU.spent]], cues: { ring: [0, BU.hit], burst: [BU.hit], spent: [BU.held, BU.spent] },
  pose: (t) => {
    const k = track([[0, {}],
      [0.3, { oy: 0.008, oz: -0.04, bp: 0.22, sp: 0.05, cp: 0.05, np: -0.02, hp: 0.04 }],
      [BU.swell, { oy: 0.012, oz: -0.06, bp: 0.42, sp: 0.1, cp: 0.12, np: 0.08, hp: 0.22, hz: 0.25 }],
      [BU.hit, { oy: -0.06, oz: 0.035, bp: -0.22, sp: -0.06, cp: -0.02, np: 0.06, hp: 0.1, hz: 0.4 }, 'in'],
      [BU.held, { oy: -0.064, oz: 0.036, bp: -0.23, sp: -0.06, cp: -0.02, np: 0.07, hp: 0.12, hz: 0.35 }],
      [BU.held + 0.16, { oy: -0.045, oz: 0.02, bp: -0.14, sp: -0.03, np: 0.04, hp: 0.06, hz: 0.1 }, 'out'],
      [BU.held + 0.5, { oy: -0.07, oz: 0.02, bp: -0.2, sp: -0.06, cp: -0.08, np: 0.12, hp: 0.4, hz: -0.1 }],
      [BU.spent - 0.25, { oy: -0.075, oz: 0.02, bp: -0.22, sp: -0.06, cp: -0.09, np: 0.13, hp: 0.42, hz: -0.1 }],
      [BU.spent, { oy: -0.03, oz: 0.0, bp: 0.06, sp: 0.02, cp: 0.04, np: 0.0, hp: 0.0 }, 'out'],
      [BU.spent + 0.3, { oy: -0.01, bp: -0.02, hp: 0.02 }],
      [BU.end, {}]])(t);
    // spent: a slow, heavy breath and the head lolling
    const sp = pulse(t, BU.held + 0.4, BU.held + 0.6, BU.spent - 0.2, BU.spent);
    const ph = Math.sin(2 * Math.PI * (t - BU.held) / 0.9);
    return addPose(k, { oy: 0.008 * ph * sp, cp: 0.025 * ph * sp, hy: 0.12 * Math.sin(2 * Math.PI * (t - BU.held) / 1.6) * sp, hr: 0.06 * Math.sin(2 * Math.PI * (t - BU.held) / 1.6 + 0.5) * sp });
  },
  feet: (t) => {
    const F = allPlanted();
    for (const k of ['FL', 'FR']) {
      const d = k === 'FL' ? 0 : 0.02;
      F[k] = fistTrack(k, [[0, restKey], [0.08 + d, restKey],
        [0.4 + d, { w: [0.52, 0.48, 0.12], a: -0.9, r: -0.4 }],
        [BU.swell, { w: [0.62, 0.62, 0.02], a: -1.4, r: -0.7 }, 'in'],
        [BU.hit, WIDE, 'in'], [BU.held + 0.3, WIDE], [BU.held + 0.6, SLUMPW], [BU.spent + 0.05 + d, SLUMPW],
        [BU.spent + 0.3 + d, { w: [0.42, 0.22, 0.2], a: 0.1 }], [BU.spent + 0.42 + d, restKey], [BU.end, restKey]], t);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ enrage (new pose)
// Under 40 percent the game burns the cracks and quickens the geode with no pose (its timeline: burn 0.4 s, then enraged).
// This one is new: it rears up and beats its chest, left, right, left, right, then drives both fists into the floor.
const EN = { rear: 0.4, beats: [0.62, 0.8, 0.98, 1.16], slam: 1.5, end: 2.0 };
const enrage = {
  dur: EN.end, contact: [EN.slam], phases: [['burn', 0], ['rear', 0.25], ['beat the chest', EN.beats[0] - 0.08], ['slam', EN.slam - STRIKE], ['settle', EN.slam + HOLD]], cues: { burn: [0, EN.end], beats: EN.beats },
  kinds: ['slam'],
  pose: (t) => {
    const k = track([[0, {}],
      [0.2, { oy: -0.025, bp: -0.08, np: 0.08, hp: 0.1 }],
      [EN.rear + 0.1, { oy: 0.03, oz: -0.07, bp: 0.5, sp: 0.1, cp: 0.12, np: 0.1, hp: 0.3 }, 'out'],
      [EN.slam - 0.12, { oy: 0.03, oz: -0.07, bp: 0.52, sp: 0.1, cp: 0.12, np: 0.12, hp: 0.34 }],
      [EN.slam - STRIKE, { oy: 0.035, oz: -0.08, bp: 0.56, sp: 0.1, cp: 0.12, np: 0.04, hp: 0.2 }],
      [EN.slam, { oy: -0.045, oz: 0.03, bp: -0.2, sp: -0.05, cp: -0.03, np: 0.06, hp: 0.1 }, 'in'],
      [EN.slam + HOLD, { oy: -0.05, oz: 0.03, bp: -0.21, sp: -0.05, cp: -0.03, np: 0.07, hp: 0.12 }],
      [EN.slam + 0.24, { oy: -0.03, oz: 0.015, bp: -0.1, np: 0.03, hp: 0.06 }, 'out'],
      [EN.end, {}]])(t);
    let thump = 0; for (const c of EN.beats) thump += bump(t, c + 0.02, 0.1);
    const side = EN.beats.reduce((s, c, i) => s + (i % 2 ? -1 : 1) * bump(t, c + 0.02, 0.1), 0);
    return addPose(k, { cp: -0.04 * thump, sp: -0.02 * thump, cy: 0.06 * side, by: 0.03 * side, hy: -0.04 * side, hz: 0.25 * thump });
  },
  feet: (t) => {
    const F = allPlanted();
    for (const k of ['FL', 'FR']) {
      const mine = EN.beats.filter((_, i) => (i % 2 === 0) === (k === 'FL'));
      const keys = [[0, restKey], [0.22 + (k === 'FL' ? 0 : 0.03), restKey], [EN.rear + 0.08, { w: [0.3, 0.5, 0.3], a: -1.5, r: 1.1 }]];
      for (const c of mine) { keys.push([c - 0.1, { w: [0.3, 0.52, 0.34], a: -1.5, r: 1.2 }]); keys.push([c, { w: [0.11, 0.47, 0.27], a: -1.5, r: 1.5 }, 'in']); keys.push([c + 0.06, { w: [0.14, 0.47, 0.28], a: -1.5, r: 1.45 }]); }
      keys.push([EN.slam - STRIKE - 0.12, { w: [0.3, 0.62, 0.25], a: -2.2, r: 0.6 }]);
      keys.push([EN.slam - STRIKE, { w: [0.3, 0.78, 0.2], a: -2.6, r: 0.4 }]);
      keys.push([EN.slam, { w: [0.3, 0.17, 0.33], a: 0, plant: true }, 'in']); keys.push([EN.slam + 0.24, { w: [0.3, 0.17, 0.33], a: 0, plant: true }]);
      keys.push([EN.slam + 0.42, { w: [RW.x, RW.y + 0.05, RW.z + 0.04], a: 0.1 }]); keys.push([EN.slam + 0.52, restKey]); keys.push([EN.end, restKey]);
      F[k] = fistTrack(k, keys, t);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ hurt (light)
const hurt = {
  dur: wf(0.42), upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { cp: 0.05, np: 0.12, hp: 0.1, hy: 0.24, hr: 0.14, ny: 0.08, cy: 0.04 }, 'out'], [0.17, { cp: -0.01, np: -0.03, hp: -0.04, hy: -0.06, hr: -0.04 }], [0.42, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// Shoved back 0.3 u: the head snaps aside, the body rocks back off its fists, it shuffles back on fists and feet, shakes the
// head like a bull and drops its weight forward again.
const HB = -0.3 / CFG.unit;
const heavyHit = {
  dur: 1.1, contact: [0], travel: (t) => HB * EASE.out(clamp(t / 0.32)), phases: [['hit', 0], ['stagger', 0.07], ['shake', 0.4], ['square up', 0.74]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.03, oy: 0.01, bp: 0.16, br: 0.07, by: -0.1, sp: 0.04, cp: 0.08, np: 0.16, hp: 0.12, hy: -0.4, ny: -0.14, hr: -0.2 }, 'out'],
      [0.26, { oz: -0.01, oy: -0.03, bp: 0.02, br: -0.03, by: -0.04, np: 0.02, hp: -0.04, hy: -0.2, hr: 0.08 }],
      [0.46, { oy: -0.025, bp: -0.06, np: -0.04, hp: -0.12, hy: 0.04 }],
      [0.76, { oy: -0.006, bp: -0.01, np: -0.01, hp: -0.02 }],
      [1.1, {}]])(t);
    const sh = pulse(t, 0.4, 0.46, 0.62, 0.76);
    return addPose(k, { hy: 0.13 * Math.sin(30 * (t - 0.4)) * sh, hr: 0.07 * Math.sin(30 * (t - 0.4) + 1.3) * sh, ny: 0.05 * Math.sin(30 * (t - 0.4) - 0.5) * sh });
  },
  feet: (t) => ({
    FL: steps(t, REST.FL, [[0.0, 0.2, off('FL', 0.02, 0, HB), 0.1, 0.3]]), HR: steps(t, REST.HR, [[0.07, 0.2, off('HR', 0, 0, HB), 0.03, 0.2]]),
    FR: steps(t, REST.FR, [[0.01, 0.26, off('FR', 0.02, 0, HB), 0.11, 0.3]]), HL: steps(t, REST.HL, [[0.16, 0.29, off('HL', 0, 0, HB), 0.03, 0.2]]),
  }),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames, then stand. It comes up out of a low crouch with its head down,
// lifts its head, rears and brings both fists down on the floor once.
const SPW = { grow: 7 * FR_, slam: 0.95 };
const spawn = {
  dur: 1.6, contact: [SPW.slam], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SPW.grow))), phases: [['grow', 0], ['rise', SPW.grow], ['rear', 0.6], ['slam', SPW.slam - STRIKE], ['stand', SPW.slam + HOLD]],
  pose: (t) => track([
    [0, { oy: -0.09, oz: 0.02, bp: -0.2, sp: -0.05, np: 0.15, hp: 0.25 }],
    [SPW.grow, { oy: -0.09, oz: 0.02, bp: -0.2, sp: -0.05, np: 0.15, hp: 0.25 }],
    [0.55, { oy: -0.02, bp: -0.02, np: 0.02, hp: 0.0 }],
    [SPW.slam - STRIKE, { oy: 0.025, oz: -0.06, bp: 0.4, sp: 0.08, cp: 0.08, np: 0.06, hp: 0.22 }, 'out'],
    [SPW.slam, { oy: -0.05, oz: 0.025, bp: -0.18, sp: -0.04, np: 0.06, hp: 0.1 }, 'in'],
    [SPW.slam + HOLD, { oy: -0.054, oz: 0.025, bp: -0.19, sp: -0.04, np: 0.07, hp: 0.12 }],
    [SPW.slam + 0.25, { oy: -0.02, oz: 0.01, bp: -0.06, np: 0.02, hp: 0.04 }, 'out'],
    [1.6, {}]])(t),
  feet: (t) => {
    const F = allPlanted();
    for (const k of ['FL', 'FR']) {
      F[k] = fistTrack(k, [[0, restKey], [0.6, restKey], [SPW.slam - 0.12, { w: [0.32, 0.62, 0.22], a: -2.2, r: 0.5 }], [SPW.slam - STRIKE, { w: [0.32, 0.72, 0.18], a: -2.5, r: 0.4 }],
        [SPW.slam, { w: [0.33, 0.17, 0.3], a: 0, plant: true }, 'in'], [SPW.slam + 0.24, { w: [0.33, 0.17, 0.3], a: 0, plant: true }], [SPW.slam + 0.44, { w: [RW.x, RW.y + 0.04, RW.z + 0.03], a: 0.1 }], [SPW.slam + 0.54, restKey], [1.6, restKey]], t);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ death
// The geode's light goes out. A jolt that rears it up with the arms thrown wide, the legs give and it drops onto its
// knees, sways, and topples forward onto its chest with its arms flung out to the sides; the head turns aside on the floor.
const D = { jolt: 0.14, knees: 0.75, fall: 1.35, down: 1.62, end: 2.8 };
const LIE = { oy: -0.075, oz: 0.08, bp: -0.5, sp: -0.08, cp: -0.06, np: 0.12, hp: 0.12, hy: 0.4, hr: 0.2 };
const death = {
  dur: D.end, contact: [D.knees, D.down], kinds: ['thud', 'thud'], phases: [['jolt', 0], ['the legs give', D.jolt + 0.1], ['knees', D.knees], ['topple', D.knees + 0.25], ['down', D.down], ['still', D.down + 0.5]], cues: { dark: [D.jolt, D.down + 0.4] },
  pose: (t) => {
    const k = track([[0, {}],
      [D.jolt, { oy: 0.03, oz: -0.03, bp: 0.3, sp: 0.06, cp: 0.08, np: 0.14, hp: 0.3, hy: 0.1 }, 'out'],
      [D.jolt + 0.25, { oy: 0.0, oz: -0.02, bp: 0.18, sp: 0.04, cp: 0.04, np: 0.06, hp: 0.12 }],
      [D.knees, { oy: -0.11, oz: 0.0, bp: 0.06, sp: 0.02, np: 0.04, hp: -0.05, br: 0.03 }, 'in'],
      [D.knees + 0.08, { oy: -0.115, oz: 0.0, bp: 0.04, np: 0.06, hp: -0.06, br: 0.04 }],
      [D.knees + 0.3, { oy: -0.1, oz: 0.02, bp: 0.0, br: -0.05, np: 0.0, hp: -0.12, hy: -0.08 }],
      [D.fall, { oy: -0.11, oz: 0.07, bp: -0.45, sp: -0.06, cp: -0.04, np: 0.12, hp: 0.08, br: 0.04, hy: 0.1 }],
      [D.down, { ...LIE, oy: LIE.oy - 0.01, hy: 0.3 }, 'in'],
      [D.down + 0.12, { ...LIE, oy: LIE.oy + 0.008, bp: LIE.bp + 0.03, hy: 0.4 }, 'out'],
      [D.down + 0.3, { ...LIE, hy: 0.5 }],
      [D.end, LIE]])(t);
    return k;
  },
  feet: (t) => {
    const F = allPlanted();
    for (const k of ['FL', 'FR']) {
      const d = k === 'FL' ? 0 : 0.05;
      F[k] = fistTrack(k, [[0, restKey], [0.017, restKey],
        [D.jolt + 0.05, { w: [0.48, 0.42, 0.14], a: -1.0, r: -0.4 }],
        [D.knees - 0.05, { w: [0.44, 0.24, 0.24], a: -0.2 }],
        [D.knees + 0.04, { w: [0.42, 0.17, 0.26], a: 0, plant: true }, 'in'], [D.fall - 0.18 + d, { w: [0.42, 0.17, 0.26], a: 0, plant: true }],
        [D.down - 0.08 + d, { w: [0.6, 0.2, 0.42], a: -0.9, r: -0.5 }],
        [D.down + d, { w: [0.66, 0.1, 0.46], a: -1.35, r: -0.9 }, 'in'], [D.end, { w: [0.66, 0.1, 0.46], a: -1.35, r: -0.9 }]], t);
    }
    // the feet stay where they stood; the knees go down and forward
    for (const k of ['HL', 'HR']) F[k] = { p: REST[k].clone(), lock: true, pitch: 0.9 * smooth((t - D.jolt) / 0.6) };
    return F;
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), fissure, rain, burst, enrage, hurt, heavyHit, spawn, death };
