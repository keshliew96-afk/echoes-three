// The Lich Ram's moves. Units are model units (the model is 1 tall with its horns; the page draws it 2.2 u tall, CFG.unit).
// Timings come from the game: LICHRAM in src/sim/bosses/lichram.js (walk 1.2 u/s, turn 75 deg/s, Bone Rush: 54-tick lane,
// 11 u/s down 7 u, stuck 75 ticks; Grave Call: no warning, gathered over the last 30 ticks before the call) and the beats in
// src/render/facet/beats.js (strike 2.5 frames, contact held 3 frames).
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from './quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_;
export const CFG = {
  name: 'lichram', unit: 2.2, base: { oy: -0.012 },
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck1', 'n1'], ['neck2', 'n2'], ['head', 'h']],
  extras: [['jaw', 'j'], ['heart', 'ht'], ['tail1', 't1'], ['tail2', 't2']],
  legs: {
    FL: { kind: 'front', b: ['fUpperL', 'fForeL', 'fCannonL', 'fHoofL'] }, FR: { kind: 'front', b: ['fUpperR', 'fForeR', 'fCannonR', 'fHoofR'] },
    HL: { kind: 'hind', b: ['hThighL', 'hShinL', 'hCannonL', 'hHoofL'] }, HR: { kind: 'hind', b: ['hThighR', 'hShinR', 'hCannonR', 'hHoofR'] },
  },
  springs: [{ bone: 'tail1', k: 240, c: 12, max: 0.8 }, { bone: 'tail2', k: 170, c: 8, max: 0.9 }],
};
const REST = { FL: V3(0.113, 0, 0.17), FR: V3(-0.113, 0, 0.17), HL: V3(0.103, 0, -0.13), HR: V3(-0.103, 0, -0.13) };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
// planted at p0, then each step [lift, land, to, height, droop] swings to its next plant
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.9); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const I = new THREE.Quaternion();
// the jaw: 0 shut, 1 wide. A clack is a quick open and a hard shut.
const JAW = -0.5; const gape = (g) => ({ jp: JAW * g });
const clack = (t, c) => 0.45 * bump(t, c, 0.11);

// ------------------------------------------------------------------------------------------------ idle
// 6 s. It has no breath: the weight rolls from side to side, the head looks left then right, the jaw clacks twice,
// the tail flicks, and near the end it cocks its head, the teeth chatter and a shiver runs down the spine.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, sw = Math.sin(w), s2 = Math.sin(2 * w);
    const look = 0.4 * pulse(t, 0.5, 1.2, 2.2, 3.0) - 0.32 * pulse(t, 3.3, 3.85, 4.2, 4.7);
    const cock = pulse(t, 4.75, 4.95, 5.45, 5.75), chat = pulse(t, 4.95, 5.0, 5.4, 5.45), shiver = pulse(t, 5.0, 5.08, 5.3, 5.5);
    return addPose(
      { oy: 0.003 * s2 - 0.006 * cock, ox: 0.012 * sw, br: 0.02 * sw, by: 0.018 * Math.sin(w + 1), sy: 0.02 * Math.sin(w + 0.6), cp: 0.01 * s2 },
      { n1p: -0.02 * s2 - 0.1 * cock, n2p: -0.06 * cock, hp: 0.02 * Math.sin(2 * w + 1) - 0.06 * cock },
      { n1y: 0.26 * look, n2y: 0.3 * look, hy: 0.4 * look, hr: 0.1 * look + 0.3 * cock, n2r: 0.1 * cock, cy: 0.05 * look },
      gape(clack(t, 1.55) + clack(t, 1.75) + 0.3 * chat * (0.5 + 0.5 * Math.sin(58 * t))),
      { sr: 0.03 * Math.sin(60 * t) * shiver, cr: -0.03 * Math.sin(60 * t + 1) * shiver, hy: 0.02 * Math.sin(60 * t) * shiver },
      { t1y: 0.5 * bump(t, 2.55, 0.24) - 0.4 * bump(t, 2.82, 0.26) + 0.08 * sw, t1p: -0.25 * bump(t, 2.7, 0.6) + 0.03 * s2 - 0.3 * shiver, t2y: 0.3 * bump(t, 2.62, 0.24) - 0.3 * bump(t, 2.9, 0.26) },
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// Diagonal pairs, as the game's gait (render/facet/gait.js). 1.2 u/s. 0.72 s a cycle. It walks where its horns point.
const WT = 0.7;
const GAIT = { T: WT, duty: 0.56, v: 1.2 / CFG.unit };
const GF = { FL: { phase: 0, n: [0.113, 0.16], lift: 0.07, droop: 1.0 }, HR: { phase: 0.04, n: [-0.103, -0.14], lift: 0.05, droop: 0.6, push: 0.3 },
             FR: { phase: 0.5, n: [-0.113, 0.16], lift: 0.07, droop: 1.0 }, HL: { phase: 0.54, n: [0.103, -0.14], lift: 0.05, droop: 0.6, push: 0.3 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT;
    return addPose(
      { oy: -0.016 + 0.006 * Math.cos(2 * w - 0.5), bp: 0.012 * Math.sin(2 * w + 0.5), br: 0.024 * Math.sin(w + 0.2), ox: 0.006 * Math.sin(w + 0.6), by: 0.02 * Math.sin(w) },
      { sy: 0.035 * Math.sin(w + 0.4), sr: -0.012 * Math.sin(w + 0.2), cy: -0.03 * Math.sin(w + 0.4), cr: -0.014 * Math.sin(w + 0.2) },
      { n1p: -0.1 + 0.03 * Math.sin(2 * w + 1.3), n2p: -0.06 + 0.014 * Math.sin(2 * w + 1.7), hp: -0.1 - 0.025 * Math.sin(2 * w + 2.0), hy: -0.02 * Math.sin(w), n1y: -0.015 * Math.sin(w) },
      gape(0.1 * bump(t % (WT / 2), 0.2, 0.12)),
      { t1y: 0.14 * Math.sin(w + 1.2), t1p: -0.05 + 0.04 * Math.sin(2 * w) },
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const TURN = 75 * Math.PI / 180;
const turn = (dir) => {
  const g = { T: WT, duty: 0.58, v: 0, omega: dir * TURN, pivot: [0, 0.02] };
  const gf = { FL: { ...GF.FL, lift: 0.055 }, FR: { ...GF.FR, lift: 0.055 }, HL: { ...GF.HL, lift: 0.04 }, HR: { ...GF.HR, lift: 0.04 } };
  return {
    dur: WT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / WT;
      return addPose({ oy: -0.012 + 0.004 * Math.cos(2 * w - 0.5), br: 0.018 * Math.sin(w) - 0.015 * dir, bp: 0.008 * Math.sin(2 * w) },
        { sy: 0.05 * dir, cy: 0.05 * dir, n1y: 0.1 * dir, n2y: 0.1 * dir, hy: 0.12 * dir, hr: 0.04 * dir, n1p: -0.08 + 0.015 * Math.sin(2 * w + 1), hp: -0.08 },
        { t1y: -0.22 * dir + 0.1 * Math.sin(w) }); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ Bone Rush
// wind (the 54-tick lane less one strike: head down, horns level, weight back, the left forehoof paws twice), burst (2.5
// frames, landing on the resolve), run (7 u at 11 u/s: three bounds, each hoof on the floor for two or three frames),
// slam (2.5 frames: the horns go into the floor), held, stuck (the sim's 75 ticks from the stop, the guard down),
// free (2.5 frames: it wrenches the horns out), settle.
const RUN = 39 / 60, RD = 7 / CFG.unit, RV = RD / RUN;
const R = { wind: 0.9 - STRIKE, go: 0.9, stop: 0.9 + RUN, slam: 0.9 + RUN + STRIKE, held: 0.9 + RUN + STRIKE + HOLD, free0: 0.9 + RUN + 1.25, free: 0.9 + RUN + 1.25 + STRIKE, end: 3.4 };
const DOWN = { n1p: -0.3, n2p: -0.3, hp: -0.5 }; // the charge: chin tucked, the horn bosses forward
// lodged: the trunk pitched steeply down on its knees, the rump up, the crown of the skull and the horns on the floor
const HBACK = -0.125; // the hind hooves stop short, so the hind legs trail behind the lodged body
const SLAM = { oy: -0.066, oz: 0.05, bp: -1.0, sp: -0.1, cp: -0.1, n1p: -0.45, n2p: -0.45, hp: -0.25, t1p: -0.9 };
const P3 = RUN / 3; // one bound
// the kneel: the forearm goes down to a knee on the floor and the cannon folds back under it. Measured from the body's
// pose; once the horns are in, the knees stay where they landed.
const KN = {};
function kneelAt(k, B, maxA = 1.5) {
  const sg = k === 'FL' ? 1 : -1; const Ev = B.loc(k, [0, -0.08, -0.06]); const ky = 0.034, l1 = 0.1304, l2 = 0.145;
  const dy = clamp(Ev.y - ky, 0, l1 * Math.sin(maxA)); const K = V3(Ev.x, Ev.y - dy, Ev.z + Math.sqrt(l1 * l1 - dy * dy));
  return V3(K.x + 0.03 * sg, K.y + 0.004 - 0.024, K.z - Math.sqrt(l2 * l2 - 0.03 * 0.03) - 0.088);
}
const rush = {
  dur: R.end, contact: [R.go, R.slam], travel: (t) => RD * clamp((t - R.go) / RUN),
  phases: [['horns down', 0], ['burst', R.wind], ['rush', R.go], ['horns in', R.stop], ['lodged', R.slam], ['stuck', R.held], ['wrench free', R.free0], ['settle', R.free]],
  cues: { lane: [0, R.go], run: [R.go, R.stop], stuck: [R.stop, R.free0] },
  pose: (t) => {
    const k = track([[0, {}],
      [0.26, { oy: -0.02, oz: -0.03, bp: -0.05, n1p: -0.22, n2p: -0.24, hp: -0.4, t1p: -0.3 }],
      [R.wind, { oy: -0.05, oz: -0.062, bp: -0.1, sp: -0.04, ...DOWN, t1p: -0.6 }],
      [R.go, { oy: -0.03, oz: 0.035, bp: 0.12, sp: 0.05, ...DOWN, hp: -0.6, t1p: -0.9 }, 'out'],
      [R.go + P3 * 0.5, { oy: 0.0, oz: 0.02, bp: -0.1, ...DOWN, t1p: -0.7 }],
      [R.go + P3, { oy: 0.012, oz: 0.02, bp: 0.1, ...DOWN, t1p: -0.9 }],
      [R.go + P3 * 1.5, { oy: 0.0, oz: 0.02, bp: -0.1, ...DOWN, t1p: -0.7 }],
      [R.go + P3 * 2, { oy: 0.012, oz: 0.02, bp: 0.1, ...DOWN, t1p: -0.9 }],
      [R.go + P3 * 2.5, { oy: 0.0, oz: 0.02, bp: -0.12, ...DOWN, t1p: -0.7 }],
      [R.stop, { oy: -0.03, oz: 0.03, bp: -0.3, sp: -0.04, n1p: -0.36, n2p: -0.36, hp: -0.45, t1p: -0.9 }],
      [R.slam, SLAM, 'in'],
      [R.held, { ...SLAM, oy: SLAM.oy - 0.005 }],
      [R.held + 0.14, { ...SLAM, oy: SLAM.oy + 0.006, bp: SLAM.bp + 0.03, t1p: -0.3 }, 'out'],
      [R.held + 0.4, { ...SLAM, oy: SLAM.oy - 0.006, bp: SLAM.bp - 0.015, t1p: 0.1 }],
      [R.free0, { ...SLAM, oy: SLAM.oy - 0.004, bp: SLAM.bp + 0.02, t1p: -0.4 }],
      // the wrench: the horns tear out first (the game's strike beat), the forequarters heave up after them
      [R.free, { oy: -0.066, oz: 0.035, bp: -0.66, sp: -0.05, cp: 0.0, n1p: 0.26, n2p: 0.22, hp: 0.38, jp: JAW * 0.7, t1p: -0.8 }, 'out'],
      [R.free + 0.13, { oy: -0.058, oz: -0.02, bp: -0.12, sp: 0.02, cp: 0.05, n1p: 0.16, n2p: 0.12, hp: 0.22, jp: JAW * 0.5, t1p: -0.6 }, 'out'],
      [R.free + 0.3, { oy: -0.03, oz: -0.012, bp: 0.05, n1p: -0.1, n2p: -0.06, hp: -0.1, jp: JAW * 0.1, t1p: 0.1 }],
      [R.free + 0.45, { oy: -0.01, bp: -0.012, n1p: -0.03, hp: -0.02 }],
      [R.end, {}]])(t);
    // stuck: it sags on the buried horns and heaves twice with its hindquarters
    const tug = bump(t, R.held + 0.62, 0.3) + bump(t, R.held + 0.98, 0.3), sh = pulse(t, R.held + 0.45, R.held + 0.55, R.free0 - 0.1, R.free0);
    const shake = pulse(t, R.free + 0.2, R.free + 0.26, R.free + 0.4, R.free + 0.5);
    return addPose(k, { br: 0.05 * Math.sin(26 * t) * tug, by: 0.05 * Math.sin(26 * t + 1) * tug, sy: -0.04 * Math.sin(26 * t + 1) * tug, oy: 0.012 * tug, t1y: 0.5 * Math.sin(20 * t) * sh },
      { hy: 0.1 * Math.sin(36 * t) * shake, hr: 0.08 * Math.sin(36 * t + 1.2) * shake, jp: JAW * 0.25 * shake * (0.5 + 0.5 * Math.sin(60 * t)) });
  },
  feet: (t, B) => {
    const F = {}; const Z = (k, d, x = 0) => off(k, x, 0, d); const st = 0.02; // half a stance
    const at = (k, tm) => Z(k, RV * (tm - R.go)); // where a hoof plants when the body passes over it at time tm
    const fm = [R.go + 0.108, R.go + 0.108 + P3, R.go + 0.108 + 2 * P3], hm = [R.go + P3 * 1.0, R.go + P3 * 2.0];
    for (const [k, d] of [['FL', 0], ['FR', 0.008]]) {
      const last = fm[2] + st + d; // the forehooves leave the floor for the last time: the knees take the slam
      if (t < last) F[k] = steps(t, REST[k], [[R.wind + 0.008 + d, fm[0] - st + d, at(k, fm[0] + d), 0.085, 1.1], [fm[0] + st + d, fm[1] - st + d, at(k, fm[1] + d), 0.085, 1.1], [fm[1] + st + d, fm[2] - st + d, at(k, fm[2] + d), 0.085, 1.1]]);
      else if (t < R.slam) { const u = smooth((t - last) / (R.slam - last)); F[k] = { p: at(k, fm[2] + d).lerp(kneelAt(k, B), u), pitch: 2.0 * u, ku: 0.35 * (1 - u) }; }
      else if (t < R.free0) { if (!KN[k]) KN[k] = kneelAt(k, B); F[k] = { p: KN[k].clone(), pitch: 2.0, ku: 0, lock: true }; }
      else { const a = R.free + 0.03 + (k === 'FL' ? 0 : 0.05), b = a + 0.16; // tucked under the chest through the wrench, then each unfolds and lands
        if (t < b) { const u = smooth((t - a) / (b - a)); const p = KN[k].clone().lerp(kneelAt(k, B, lerp(0.45, 1.4, smooth((t - R.free0) / 0.16))), smooth((t - R.free0) / STRIKE)).lerp(Z(k, RD), u); p.y += 0.03 * Math.sin(Math.PI * u); F[k] = { p, pitch: 2.0 * (1 - u), ku: 0.35 * u }; }
        else F[k] = plant(Z(k, RD)); }
    }
    for (const [k, d] of [['HL', 0.008], ['HR', 0]]) {
      const wide = V3(k === 'HL' ? 0.04 : -0.04, 0, 0); // in a bound the hind hooves land outside the fore ones
      F[k] = steps(t, REST[k], [[R.go + 0.017 + d, hm[0] - st + d, at(k, hm[0] + d).add(wide), 0.07, 0.5], [hm[0] + st + d, hm[1] - st + d, at(k, hm[1] + d).add(wide), 0.07, 0.5], [hm[1] + st + d, R.stop - 0.004 + d, Z(k, RD + HBACK, k === 'HL' ? -0.036 : 0.036), 0.06, 0.5], [R.free + 0.2 + (k === 'HL' ? 0.14 : 0), R.free + 0.33 + (k === 'HL' ? 0.14 : 0), Z(k, RD), 0.04, 0.4]]);
      if (F[k].lock && t > R.wind && t < R.go + 0.03) F[k].pitch = 0.4 * smooth((t - R.wind) / 0.05); // push off the toes
    }
    if (t < R.wind) { // the left forehoof paws the floor twice through the warning
      for (const c of [0.2, 0.5]) if (t >= c && t < c + 0.22) { const q = track([[c, { y: 0, z: 0, p: 0 }], [c + 0.07, { y: 0.065, z: 0.045, p: 0.85 }], [c + 0.12, { y: 0.008, z: 0.05, p: 0.4 }, 'in'], [c + 0.18, { y: 0.01, z: -0.035, p: 0.6 }, 'out'], [c + 0.22, { y: 0, z: 0, p: 0 }]])(t); F.FL = { p: off('FL', 0, q.y, q.z), pitch: q.p }; }
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Grave Call
// The sim gives no warning. gather (the last 30 ticks before the call: the right forehoof lifts, the head goes up),
// stamp (2.5 frames on the call's tick: the hoof down, the jaw wide), held with a recoil, settle.
const G = { gather: 0.5, hit: 0.5 + STRIKE, held: 0.5 + STRIKE + HOLD, end: 1.15 };
const call = {
  dur: G.end, contact: [G.hit], phases: [['gather', 0], ['stamp', G.gather], ['the graves crack', G.hit], ['settle', G.held]], cues: { swell: [0, G.hit], graves: [G.hit] },
  pose: (t) => {
    const k = track([[0, {}],
      [0.2, { oy: -0.012, bp: 0.04, n1p: 0.08, n2p: 0.06, hp: 0.05, t1p: -0.3 }],
      [G.gather, { oy: 0.008, oz: -0.012, bp: 0.12, cp: 0.05, sp: 0.03, n1p: 0.2, n2p: 0.18, hp: 0.22, jp: JAW * 0.15, t1p: -0.8 }],
      [G.hit, { oy: -0.05, oz: 0.012, bp: 0.03, cp: 0.05, n1p: 0.3, n2p: 0.26, hp: 0.4, jp: JAW, t1p: -1.0 }, 'in'],
      [G.held, { oy: -0.054, oz: 0.012, bp: 0.03, cp: 0.05, n1p: 0.31, n2p: 0.27, hp: 0.42, jp: JAW, t1p: -1.0 }],
      [G.held + 0.12, { oy: -0.02, oz: -0.008, bp: 0.07, cp: 0.04, n1p: 0.26, n2p: 0.22, hp: 0.34, jp: JAW * 0.9, t1p: -0.6 }, 'out'],
      [G.held + 0.34, { oy: -0.018, bp: 0.0, n1p: 0.04, n2p: 0.03, hp: 0.0, jp: JAW * 0.15, t1p: 0.0 }],
      [G.end, {}]])(t);
    const env = pulse(t, G.hit, G.hit + 0.03, G.held + 0.12, G.held + 0.3);
    return addPose(k, { hy: 0.035 * Math.sin(84 * t) * env, hr: 0.03 * Math.sin(84 * t + 1.2) * env, jp: 0.05 * Math.sin(84 * t) * env });
  },
  feet: (t) => {
    const F = allPlanted(); const r = REST.FR, up = off('FR', -0.004, 0.15, 0.05), dn = off('FR', 0, 0, 0.03);
    if (t > 0.1 && t < G.hit) {
      if (t < 0.4) { const u = smooth((t - 0.1) / 0.3); F.FR = { p: r.clone().lerp(up, u), pitch: 1.15 * Math.sin(Math.PI * 0.5 * u) }; }
      else if (t < G.gather) F.FR = { p: up.clone().add(V3(0, 0.008 * Math.sin(40 * t), 0)), pitch: 1.15 };
      else { const u = ((t - G.gather) / STRIKE) ** 2; F.FR = { p: up.clone().lerp(dn, u), pitch: 1.15 * (1 - u) }; }
    } else if (t >= G.hit) F.FR = steps(t, dn, [[G.held + 0.3, G.held + 0.44, r, 0.035]]);
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ enrage (new pose)
// Under 40 percent the game speeds the heart and lights the eyes and runes, with no pose. This one is new: it drops its
// head and rakes the floor, then throws the head up and rattles, jaw wide.
const E = { roar: 0.62 };
const enrage = {
  dur: 1.5, contact: [E.roar], phases: [['coil', 0], ['rattle', E.roar - STRIKE], ['settle', 1.14]], cues: { roar: [E.roar, 1.1] },
  pose: (t) => {
    const k = track([[0, {}],
      [0.3, { oy: -0.035, bp: -0.07, sp: -0.03, n1p: -0.34, n2p: -0.3, hp: -0.45, t1p: 0.2 }],
      [E.roar - STRIKE, { oy: -0.04, bp: -0.08, sp: -0.03, n1p: -0.36, n2p: -0.32, hp: -0.5, t1p: 0.2 }],
      [E.roar, { oy: 0.01, bp: 0.13, cp: 0.06, sp: 0.04, n1p: 0.28, n2p: 0.26, hp: 0.4, jp: JAW, t1p: -1.0 }, 'out'],
      [1.14, { oy: 0.004, bp: 0.1, cp: 0.05, sp: 0.03, n1p: 0.24, n2p: 0.22, hp: 0.34, jp: JAW * 0.9, t1p: -0.8 }],
      [1.32, { oy: -0.01, bp: 0.01, n1p: 0.03, n2p: 0.02, hp: 0.0, jp: JAW * 0.1 }],
      [1.5, {}]])(t);
    const env = pulse(t, E.roar - 0.02, E.roar + 0.03, 1.02, 1.18);
    return addPose(k, { hy: 0.05 * Math.sin(80 * t) * env, hr: 0.045 * Math.sin(80 * t + 1.2) * env, jp: 0.08 * Math.sin(80 * t) * env, sr: 0.025 * Math.sin(64 * t) * env, cr: -0.025 * Math.sin(64 * t + 1) * env });
  },
  feet: (t) => {
    const F = allPlanted();
    if (t > 0.06 && t < 0.5) { const c = t < 0.28 ? 0.06 : 0.28; const q = track([[c, { y: 0, z: 0, p: 0 }], [c + 0.07, { y: 0.07, z: 0.05, p: 0.85 }], [c + 0.12, { y: 0.008, z: 0.055, p: 0.4 }, 'in'], [c + 0.18, { y: 0.01, z: -0.04, p: 0.6 }, 'out'], [c + 0.22, { y: 0, z: 0, p: 0 }]])(t); F.FL = { p: off('FL', 0, q.y, q.z), pitch: q.p }; }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ block (new pose)
// Horn Guard: a shot arriving within 60 degrees of its facing is stopped by the horns. The game shows the block with no
// pose; here the head dips to meet it and rocks back. Upper body only, so it plays over a walk.
const block = {
  dur: 0.36, upperOnly: true, contact: [0.04],
  pose: (t) => track([[0, {}], [0.04, { n1p: -0.16, n2p: -0.14, hp: -0.3, cp: -0.02 }, 'out'], [0.1, { n1p: -0.05, n2p: -0.03, hp: -0.12, hr: 0.05, t1p: -0.3 }], [0.2, { n1p: -0.1, n2p: -0.07, hp: -0.18 }], [0.36, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { n1p: 0.16, n2p: 0.12, hp: -0.1, hy: 0.22, hr: 0.16, n1y: 0.09, n1r: 0.04, t1p: -0.6 }, 'out'], [0.17, { n1p: -0.05, n2p: -0.02, hy: -0.06, hr: -0.04, t1p: 0.1 }], [0.42, {}]])(t), gape(0.7 * bump(t, 0.06, 0.12) + 0.3 * bump(t, 0.2, 0.1))),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// Shoved back a step, the skull whips away, the jaw drops; it rattles its head and squares up.
const HB = -0.08;
const heavyHit = {
  dur: 1.1, contact: [0], travel: (t) => HB * EASE.out(clamp(t / 0.3)), phases: [['hit', 0], ['stagger', 0.07], ['rattle', 0.38], ['square up', 0.7]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.036, oy: -0.02, bp: 0.12, br: 0.08, by: -0.1, sp: 0.06, cp: 0.08, n1p: 0.3, n2p: 0.24, hp: -0.2, hy: -0.42, n2y: -0.22, n1y: -0.1, hr: -0.24, jp: JAW * 0.9, t1p: -0.85 }, 'out'],
      [0.24, { oz: -0.012, oy: -0.045, bp: 0.03, br: -0.035, by: -0.04, n1p: 0.04, n2p: 0.0, hp: -0.28, hy: -0.26, n2y: -0.1, hr: 0.1, jp: JAW * 0.5, t1p: -0.2 }],
      [0.44, { oy: -0.022, bp: -0.04, n1p: -0.18, n2p: -0.12, hp: -0.2, hy: 0.06, jp: JAW * 0.15, t1p: 0.15 }],
      [0.74, { oy: -0.006, bp: 0.012, n1p: -0.05, n2p: -0.02, hp: -0.02 }],
      [1.1, {}]])(t);
    const sh = pulse(t, 0.36, 0.44, 0.6, 0.74);
    return addPose(k, { hy: 0.11 * Math.sin(34 * (t - 0.36)) * sh, hr: 0.09 * Math.sin(34 * (t - 0.36) + 1.3) * sh, n2y: 0.05 * Math.sin(34 * (t - 0.36) - 0.5) * sh, jp: JAW * 0.25 * sh * (0.5 + 0.5 * Math.sin(60 * t)) });
  },
  feet: (t) => ({
    HL: steps(t, REST.HL, [[0.035, 0.165, off('HL', 0, 0, HB), 0.04, 0.4]]), FR: steps(t, REST.FR, [[0.075, 0.205, off('FR', 0, 0, HB), 0.045]]),
    HR: steps(t, REST.HR, [[0.15, 0.275, off('HR', 0, 0, HB), 0.035, 0.4]]), FL: steps(t, REST.FL, [[0.2, 0.33, off('FL', 0, 0, HB), 0.045]]),
  }),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames, then stand. It comes up out of a low crouch, the skull lifts, the jaw
// clacks twice and a forehoof stamps.
const SP = { grow: 7 * FR_, stamp: 0.78 + STRIKE };
const spawn = {
  dur: 1.6, contact: [SP.stamp], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['rise', SP.grow], ['look up', 0.5], ['stamp', 0.78], ['stand', SP.stamp]],
  pose: (t) => addPose(track([
    [0, { oy: -0.12, bp: -0.1, sp: -0.08, n1p: -0.44, n2p: -0.36, hp: -0.5, t1p: 0.3 }],
    [SP.grow, { oy: -0.12, bp: -0.1, sp: -0.08, n1p: -0.44, n2p: -0.36, hp: -0.5, t1p: 0.3 }],
    [0.5, { oy: -0.02, bp: 0.0, sp: -0.02, n1p: -0.2, n2p: -0.14, hp: -0.26, t1p: -0.1 }],
    [0.78, { oy: 0.012, bp: 0.09, cp: 0.06, sp: 0.03, n1p: 0.24, n2p: 0.2, hp: 0.22, t1p: -0.7 }, 'out'],
    [SP.stamp, { oy: 0.002, bp: 0.07, cp: 0.06, sp: 0.03, n1p: 0.23, n2p: 0.2, hp: 0.2, t1p: -0.75 }],
    [1.14, { oy: -0.008, bp: 0.02, cp: 0.01, n1p: 0.08, n2p: 0.05, hp: 0.04, t1p: -0.2 }],
    [1.6, {}]])(t), gape(clack(t, 0.9) + clack(t, 1.06))),
  feet: (t) => {
    const F = allPlanted(); const r = REST.FL, up = off('FL', 0.004, 0.12, 0.04);
    if (t > 0.52 && t < SP.stamp) {
      if (t < 0.72) { const u = smooth((t - 0.52) / 0.2); F.FL = { p: r.clone().lerp(up, u), pitch: 1.1 * Math.sin(Math.PI * 0.5 * u) }; }
      else if (t < 0.78) F.FL = { p: up.clone(), pitch: 1.1 };
      else { const u = ((t - 0.78) / STRIKE) ** 2; F.FL = { p: up.clone().lerp(r, u), pitch: 1.1 * (1 - u) }; } }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ death
// The hooves unlock. A jolt, the forelegs buckle, the hindquarters give and it goes down on its right side; the skull
// stays up a moment, then drops and the jaw falls open.
const D = { knees: 0.55, side: 1.2, head: 1.85, end: 2.7 };
const death = {
  dur: D.end, contact: [D.side - 0.04, D.head], phases: [['jolt', 0], ['buckle', 0.14], ['fall', D.knees], ['the skull drops', D.side + 0.2], ['still', D.head]], cues: { out: [D.side, D.head + 0.3] },
  pose: (t) => {
    const lie = { bp: 0.0, oy: -0.298, oz: -0.02, br: 1.42, by: 0.14, sr: 0.03, cr: 0.03 };
    const k = track([[0, {}],
      [0.12, { bp: 0.1, oy: 0.004, br: -0.05, n1p: 0.28, n2p: 0.22, hp: 0.3, hy: 0.15, jp: JAW * 0.8, t1p: -0.8 }, 'out'],
      [D.knees, { bp: -0.36, oy: -0.05, oz: 0.02, br: 0.06, sp: -0.05, n1p: -0.05, n2p: 0.1, hp: 0.28, hy: -0.1, jp: JAW * 0.3, t1p: -0.2 }],
      [0.86, { bp: -0.18, oy: -0.17, oz: 0.0, br: 0.55, by: 0.1, sp: -0.02, sr: 0.06, n1p: 0.14, n2p: 0.14, hp: 0.18, hy: 0.1, hr: -0.18, n1r: -0.08, jp: JAW * 0.4, t1p: -0.5 }],
      [D.side, { ...lie, oy: -0.293, n1p: 0.1, n2p: 0.08, hp: 0.08, n1y: 0.05, hy: 0.0, hr: -0.3, n1r: -0.12, n2r: -0.1, jp: JAW * 0.5, t1p: -0.3 }, 'in'],
      [D.side + 0.2, { ...lie, n1p: 0.13, n2p: 0.1, hp: 0.08, n1y: 0.1, hy: 0.05, hr: -0.32, n1r: -0.14, n2r: -0.12, jp: JAW * 0.3, t1p: -0.1 }],
      [D.head, { ...lie, n1p: 0.1, n2p: 0.05, hp: 0.05, n1y: -0.26, n2y: -0.22, hy: -0.1, hr: -0.3, n1r: -0.12, n2r: -0.1, jp: JAW * 0.75, t1p: 0.1 }, 'in'],
      [D.head + 0.1, { ...lie, n1p: 0.12, n2p: 0.07, hp: 0.07, n1y: -0.23, n2y: -0.2, hy: -0.08, hr: -0.32, n1r: -0.12, n2r: -0.1, jp: JAW * 0.6, t1p: 0.1 }, 'out'],
      [D.end, { ...lie, n1p: 0.1, n2p: 0.05, hp: 0.05, n1y: -0.26, n2y: -0.22, hy: -0.1, hr: -0.3, n1r: -0.12, n2r: -0.1, jp: JAW * 0.8, t1p: 0.15 }],
    ])(t);
    const tw = pulse(t, D.side, D.side + 0.1, D.head - 0.25, D.head - 0.05);
    return addPose(k, { hy: 0.03 * Math.sin(47 * t) * tw, n2p: 0.02 * Math.sin(31 * t) * tw, jp: JAW * 0.2 * tw * (0.5 + 0.5 * Math.sin(55 * t)) });
  },
  feet: (t, B) => {
    // The hooves let go of the floor and the legs are carried by the body as it rolls: each hoof is aimed in the body's own
    // frame (so the leg's plane never turns over), and the floor only pushes it up, which bends the knee.
    const u = smooth((t - 0.45) / 0.7);
    const lie = { FL: [-0.1, -0.3, 0.07], FR: [-0.03, -0.35, 0.17], HL: [-0.035, -0.34, -0.05], HR: [-0.02, -0.36, 0.11] };
    const loc0 = { FL: [0, -0.425, 0.01], FR: [0, -0.425, 0.01], HL: [-0.002, -0.42, 0.075], HR: [0.002, -0.42, 0.075] };
    const slip = { FL: off('FL', 0.01, 0, -0.03), FR: off('FR', -0.012, 0, -0.045), HL: REST.HL, HR: REST.HR };
    const F = {};
    for (const k of LEGS) {
      const a = REST[k].clone().lerp(slip[k], smooth((t - 0.14) / 0.4));
      const twitch = 0.012 * Math.sin(30 * t + (k === 'FL' ? 0 : 2)) * pulse(t, D.side, D.side + 0.1, D.side + 0.5, D.side + 0.8);
      const l = lie[k], l0 = loc0[k]; const carried = B.loc(k, [lerp(l0[0], l[0], u), lerp(l0[1], l[1], u) + twitch, lerp(l0[2], l[2], u)]);
      const t0 = k[0] === 'F' ? 0.04 : 0.14, wk = smooth((t - t0) / (0.48 - t0)); // the jolt lifts the fore hooves a little: they let go first
      const p = a.clone().lerp(carried, wk); p.y = Math.max(p.y, 0.034 * u);
      F[k] = { p: t < t0 ? a : p, pitch: 0.55 * u, q: I.clone().slerp(B.parQ(k), u), lock: t < t0, under: t >= t0 };
    }
    return F;
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), rush, call, enrage, block, hurt, heavyHit, spawn, death };
