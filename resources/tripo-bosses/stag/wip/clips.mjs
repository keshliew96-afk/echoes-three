// The Hollow Stag's moves. Units are model units (the model is 1 tall; the game draws it 2.2 u tall, CFG.unit).
// Timings come from the game: STAG in src/sim/boss.js (quake telegraph 42 ticks, trample lunge 12 ticks at 5.4 u/s,
// walk 1.8 u/s) and the beats in src/render/facet/beats.js (strike 2.5 frames, contact held 3 frames, gather 1.5).
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from './quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_, GATHER = 1.5 * FR_;
export const CFG = {
  name: 'stag', unit: 2.2, base: { oy: -0.012, n2y: -0.07, hy: -0.155 },
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck1', 'n1'], ['neck2', 'n2'], ['head', 'h']],
  extras: [['earL', 'el'], ['earR', 'er'], ['crown', 'k'], ['tail1', 't1'], ['tail2', 't2']],
  legs: {
    FL: { kind: 'front', b: ['fUpperL', 'fForeL', 'fCannonL', 'fHoofL'] }, FR: { kind: 'front', b: ['fUpperR', 'fForeR', 'fCannonR', 'fHoofR'] },
    HL: { kind: 'hind', b: ['hThighL', 'hShinL', 'hCannonL', 'hHoofL'] }, HR: { kind: 'hind', b: ['hThighR', 'hShinR', 'hCannonR', 'hHoofR'] },
  },
  springs: [{ bone: 'earL', k: 520, c: 20, max: 0.7 }, { bone: 'earR', k: 520, c: 20, max: 0.7 }, { bone: 'tail1', k: 200, c: 11, max: 0.8 }, { bone: 'tail2', k: 150, c: 8, max: 0.9 }],
};
const REST = { FL: V3(0.062, 0, 0.158), FR: V3(-0.034, 0, 0.158), HL: V3(0.068, 0, -0.298), HR: V3(-0.055, 0, -0.215) };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
// ears: back and up, the same words for both sides
const ears = (backL = 0, upL = 0, backR = backL, upR = upL) => ({ ely: backL, elr: upL, ery: -backR, err: -upR });
// planted at p0, then each step [lift, land, to, height, droop] swings to its next plant
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.9); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const I = new THREE.Quaternion();

// ------------------------------------------------------------------------------------------------ idle
// 6 s. Two breaths, the weight rolls from side to side, he looks left then right, an ear flicks on each side,
// the tail flicks twice, and near the end he lowers his head, snorts and paws the floor once.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const look = 0.42 * pulse(t, 0.5, 1.25, 2.2, 3.0) - 0.3 * pulse(t, 3.3, 3.85, 4.2, 4.75);
    const dip = pulse(t, 4.6, 4.95, 5.35, 5.8), snort = bump(t, 5.12, 0.34), lean = pulse(t, 4.5, 4.85, 5.45, 5.85);
    return addPose(
      { oy: 0.004 * br - 0.012 * dip, cp: 0.014 * br, sp: -0.006 * br, n1p: -0.012 * br - 0.2 * dip, n2p: -0.14 * dip, hp: -0.2 * dip + 0.05 * snort },
      { ox: 0.012 * sw + 0.012 * lean, br: 0.018 * sw, by: 0.02 * Math.sin(w + 1), sy: 0.02 * Math.sin(w + 0.6) },
      { n1y: 0.3 * look, n2y: 0.32 * look, hy: 0.42 * look + 0.05 * Math.sin(52 * (t - 5.12)) * snort, hr: 0.13 * look + 0.03 * Math.sin(52 * (t - 5.12) + 1) * snort, cy: 0.05 * look },
      ears(-0.55 * bump(t, 1.05, 0.2) + 0.35 * look + 0.6 * snort, 0.15 * bump(t, 1.05, 0.2), -0.55 * bump(t, 3.62, 0.2) - 0.35 * look + 0.6 * snort, 0.15 * bump(t, 3.62, 0.2)),
      { t1y: 0.55 * bump(t, 2.55, 0.24) - 0.45 * bump(t, 2.82, 0.26) + 0.08 * sw, t1p: 0.22 * bump(t, 2.7, 0.6) + 0.03 * br, t2y: 0.3 * bump(t, 2.62, 0.24) - 0.3 * bump(t, 2.9, 0.26) },
      { kb: 0.012 * Math.sin(2 * w + 0.8), kr: 0.06 * sw },
    );
  },
  feet: (t) => {
    const F = allPlanted(); const r = REST.FR;
    if (t > 4.78 && t < 5.5) { // one paw at the floor
      const k = track([[4.78, { y: 0, z: 0, p: 0 }], [4.95, { y: 0.075, z: 0.035, p: 0.9 }], [5.08, { y: 0.01, z: 0.05, p: 0.35 }, 'in'], [5.2, { y: 0.008, z: -0.035, p: 0.55 }, 'out'], [5.34, { y: 0.045, z: -0.01, p: 0.7 }], [5.5, { y: 0, z: 0, p: 0 }]])(t);
      F.FR = { p: r.clone().add(V3(0, k.y, k.z)), pitch: k.p };
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ walk and turn
// Diagonal pairs, as the game's gait (render/facet/gait.js). 1.8 u/s. 0.6 s a cycle.
const WT = 0.6;
const GAIT = { T: WT, duty: 0.54, v: 1.8 / CFG.unit };
const GF = { FL: { phase: 0, n: [0.062, 0.148], lift: 0.085, droop: 1.0 }, HR: { phase: 0.04, n: [-0.055, -0.262], lift: 0.06, droop: 0.6, push: 0.3 },
             FR: { phase: 0.5, n: [-0.034, 0.148], lift: 0.085, droop: 1.0 }, HL: { phase: 0.54, n: [0.068, -0.262], lift: 0.06, droop: 0.6, push: 0.3 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT;
    return addPose(
      { oy: -0.02 + 0.007 * Math.cos(2 * w - 0.5), bp: 0.012 * Math.sin(2 * w + 0.5), br: 0.024 * Math.sin(w + 0.2), ox: 0.006 * Math.sin(w + 0.6), by: 0.02 * Math.sin(w) },
      { sy: 0.04 * Math.sin(w + 0.4), sr: -0.012 * Math.sin(w + 0.2), cy: -0.035 * Math.sin(w + 0.4), cr: -0.014 * Math.sin(w + 0.2) },
      { n1p: -0.03 + 0.022 * Math.sin(2 * w + 1.3), n2p: 0.012 * Math.sin(2 * w + 1.7), hp: -0.02 * Math.sin(2 * w + 2.0), hy: -0.02 * Math.sin(w), n1y: -0.015 * Math.sin(w) },
      { t1y: 0.14 * Math.sin(w + 1.2), t1p: 0.05 + 0.04 * Math.sin(2 * w), kb: 0.006 * Math.sin(2 * w + 2.4) },
      ears(0.12, 0.02),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: WT, duty: 0.58, v: 0, omega: dir * 2 * Math.PI / 3, pivot: [0.013, -0.06] };
  const gf = { FL: { ...GF.FL, lift: 0.06 }, FR: { ...GF.FR, lift: 0.06 }, HL: { ...GF.HL, lift: 0.045 }, HR: { ...GF.HR, lift: 0.045 } };
  return {
    dur: WT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / WT;
      return addPose({ oy: -0.012 + 0.005 * Math.cos(2 * w - 0.5), br: 0.02 * Math.sin(w) - 0.02 * dir, bp: 0.008 * Math.sin(2 * w) },
        { sy: 0.07 * dir, cy: 0.06 * dir, n1y: 0.14 * dir, n2y: 0.14 * dir, hy: 0.16 * dir, hr: 0.05 * dir, n1p: -0.03 + 0.015 * Math.sin(2 * w + 1) },
        { t1y: -0.25 * dir + 0.1 * Math.sin(w), kb: 0.005 * Math.sin(2 * w) }, ears(0.1, 0.02)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ Antler Quake
// rear (the 0.7 s telegraph less one strike), slam (2.5 frames, landing on the quake's tick), held, recoil, settle.
const Q = { rear: 0.7 - STRIKE, hit: 0.7, held: 0.7 + HOLD, recoil: 0.95, end: 1.7 };
const quake = {
  dur: Q.end, contact: [Q.hit], phases: [['rear', 0], ['slam', Q.rear], ['held', Q.hit], ['recoil', Q.held], ['settle', Q.recoil]],
  pose: (t) => {
    const k = track([
      [0, {}],
      [0.1, { oy: -0.035, bp: -0.07, oz: 0.012, sp: -0.03, n1p: -0.14, n2p: -0.1, hp: -0.16, t1p: -0.2 }],
      [0.36, { oy: -0.05, bp: 0.76, oz: -0.078, sp: 0.06, cp: 0.08, n1p: 0.02, n2p: -0.12, hp: -0.36, t1p: 0.5 }],
      [0.56, { oy: -0.042, bp: 0.88, oz: -0.088, sp: 0.08, cp: 0.11, n1p: 0.24, n2p: 0.16, hp: -0.16, t1p: 0.62 }],
      [Q.rear, { oy: -0.045, bp: 0.74, oz: -0.07, sp: 0.07, cp: 0.09, n1p: 0.32, n2p: 0.24, hp: -0.05, t1p: 0.7 }, 'in'],
      [Q.hit, { oy: -0.06, bp: -0.15, oz: 0.024, sp: -0.07, cp: -0.06, n1p: -0.46, n2p: -0.34, hp: -0.34, t1p: 0.95 }, 'in'],
      [Q.held, { oy: -0.064, bp: -0.16, oz: 0.026, sp: -0.07, cp: -0.06, n1p: -0.48, n2p: -0.35, hp: -0.36, t1p: 0.95 }],
      [Q.recoil - 0.06, { oy: -0.012, bp: 0.05, oz: 0.004, sp: 0.02, cp: 0.02, n1p: -0.1, n2p: -0.04, hp: 0.12, t1p: 0.3 }, 'out'],
      [1.2, { oy: -0.022, bp: -0.02, n1p: -0.04, hp: -0.03, t1p: 0.05 }],
      [Q.end, {}],
    ])(t);
    const tre = pulse(t, 0.36, 0.44, Q.rear - 0.02, Q.rear); // a held, shaking breath at the top
    return addPose(k, { hy: 0.02 * Math.sin(70 * t) * tre, br: 0.012 * Math.sin(38 * t) * tre }, ears(0.5 * pulse(t, 0.05, 0.3, 0.9, 1.3), 0.1 * tre));
  },
  feet: (t, B) => {
    const fore = (k, fold, phase, land, back0, back1) => {
      const rest = REST[k], lp = off(k, 0, 0, land); const paw = (tt) => [0.012 * Math.sin(21 * tt + phase), 0.03 * Math.sin(21 * tt + phase), 0.022 * Math.cos(21 * tt + phase)];
      const foldAt = (tt) => { const a = paw(tt); return [fold[0] + a[0], fold[1] + a[1], fold[2] + a[2]]; };
      const reach = [0, -0.31, 0.2];
      if (t < 0.12) return plant(rest);
      if (t < 0.36) { const u = smooth((t - 0.12) / 0.24); return { p: rest.clone().lerp(B.loc(k, foldAt(t)), u), pitch: 1.25 * u, q: I.clone().slerp(B.parQ(k), u) }; }
      if (t < 0.6) return { p: B.loc(k, foldAt(t)), pitch: 1.25, q: B.parQ(k) };
      if (t < Q.rear) { const u = smooth((t - 0.6) / (Q.rear - 0.6)); const a = foldAt(0.6); return { p: B.loc(k, [lerp(a[0], reach[0], u), lerp(a[1], reach[1], u), lerp(a[2], reach[2], u)]), pitch: lerp(1.25, 0.3, u), q: B.parQ(k) }; }
      if (t < Q.hit) { const u = ((t - Q.rear) / STRIKE) ** 2; return { p: B.loc(k, reach).lerp(lp, u), pitch: lerp(0.3, 0, u), q: B.parQ(k).slerp(I, u) }; }
      return steps(t, lp, [[back0, back1, rest, 0.05]]);
    };
    return { FL: fore('FL', [0.0, -0.165, 0.175], 0, 0.115, 1.0, 1.2), FR: fore('FR', [0.0, -0.215, 0.135], 2.4, 0.09, 1.26, 1.46), HL: plant(REST.HL), HR: plant(REST.HR) };
  },
};

// ------------------------------------------------------------------------------------------------ Trample
// The sim gives no warning: a 12-tick lunge at 5.4 u/s. gather (1.5 frames), gore (2.5 frames, the rack hooks up),
// held, settle. The hooves keep stepping under him: one bound, hind hooves pushing off, forehooves reaching.
const LUNGE = 12 / 60, LD = 5.4 * LUNGE / CFG.unit;
function trampleClip(pre) {
  const T0 = pre; const g0 = T0 + GATHER, hit = g0 + STRIKE, held = hit + HOLD, land = T0 + LUNGE, end = T0 + 0.82;
  const preKeys = pre ? [[0, {}], [0.2, { oy: -0.022, oz: -0.03, bp: -0.05, n1p: -0.24, n2p: -0.16, hp: -0.28, t1p: 0.3 }], [T0, { oy: -0.04, oz: -0.05, bp: -0.085, n1p: -0.34, n2p: -0.22, hp: -0.36, sp: -0.03, t1p: 0.5 }]] : [[0, {}]];
  const keys = track([...preKeys,
    [g0, { oy: -0.04, bp: -0.11, oz: -0.02, sp: -0.04, n1p: -0.4, n2p: -0.27, hp: -0.44, t1p: 0.6 }, 'out'],
    [hit, { oy: 0.012, bp: 0.17, oz: 0.02, sp: 0.05, cp: 0.07, n1p: 0.24, n2p: 0.22, hp: 0.4, hr: -0.08, t1p: 0.9 }, 'out'],
    [held, { oy: 0.014, bp: 0.18, oz: 0.02, sp: 0.05, cp: 0.07, n1p: 0.25, n2p: 0.23, hp: 0.42, hr: -0.08, t1p: 0.9 }],
    [land + 0.02, { oy: -0.04, bp: -0.06, oz: 0.01, n1p: 0.06, n2p: 0.06, hp: 0.14, t1p: 0.2 }],
    [T0 + 0.42, { oy: -0.008, bp: 0.025, n1p: -0.06, hp: -0.06, t1p: -0.1 }],
    [end, {}],
  ]);
  const travel = (t) => LD * clamp((t - T0) / LUNGE);
  return {
    dur: end, contact: [hit], travel,
    phases: pre ? [['warning', 0], ['gather', T0], ['gore', g0], ['held', hit], ['settle', held]] : [['gather', 0], ['gore', g0], ['held', hit], ['settle', held]],
    pose: (t) => addPose(keys(t), ears(0.6 * pulse(t, 0, pre ? 0.2 : 0.02, land, end - 0.2), 0)),
    feet: (t) => {
      const F = {}; const d = (k) => off(k, 0, 0, LD);
      F.FL = steps(t, REST.FL, [[T0 + 0.016, T0 + 0.165, d('FL'), 0.1, 1.1]]); F.FR = steps(t, REST.FR, [[T0 + 0.03, T0 + 0.182, d('FR'), 0.09, 1.1]]);
      F.HL = steps(t, REST.HL, [[T0 + 0.085, T0 + 0.222, d('HL'), 0.075, 0.5]]); F.HR = steps(t, REST.HR, [[T0 + 0.07, T0 + 0.205, d('HR'), 0.07, 0.5]]);
      for (const k of ['HL', 'HR']) if (F[k].lock && t > T0 && t < T0 + 0.09) F[k].pitch = 0.55 * smooth((t - T0) / 0.07); // push off the toes
      if (pre && t < T0) { // the open choice: he paws the floor twice before he goes
        const a = 0.06, w = 0.17; for (const c of [a, a + 0.2]) if (t >= c && t < c + w) { const k = track([[c, { y: 0, z: 0, p: 0 }], [c + 0.055, { y: 0.06, z: 0.04, p: 0.8 }], [c + 0.095, { y: 0.008, z: 0.045, p: 0.4 }, 'in'], [c + 0.14, { y: 0.01, z: -0.03, p: 0.6 }, 'out'], [c + w, { y: 0, z: 0, p: 0 }]])(t); F.FR = { p: off('FR', 0, k.y, k.z), pitch: k.p }; }
      }
      return F;
    },
  };
}

// ------------------------------------------------------------------------------------------------ Call the herd
// The add waves at 75, 50 and 25 percent. The game plays a roar sound and no pose; this pose is new.
const C = { stomp: 0.5 + STRIKE };
const call = {
  dur: 1.6, contact: [C.stomp], phases: [['coil', 0], ['bellow', 0.24], ['stomp', 0.5], ['hold', C.stomp], ['settle', 1.05]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.24, { oy: -0.028, bp: -0.05, sp: -0.03, n1p: -0.3, n2p: -0.2, hp: -0.3, t1p: -0.2 }],
      [0.44, { oy: 0.012, bp: 0.1, cp: 0.07, sp: 0.04, n1p: 0.27, n2p: 0.24, hp: 0.42, t1p: 0.8 }, 'out'],
      [C.stomp, { oy: -0.004, bp: 0.07, cp: 0.07, sp: 0.03, n1p: 0.29, n2p: 0.26, hp: 0.4, t1p: 0.85 }],
      [1.05, { oy: 0.004, bp: 0.08, cp: 0.06, sp: 0.03, n1p: 0.24, n2p: 0.22, hp: 0.36, t1p: 0.7 }],
      [1.3, { oy: -0.006, bp: 0.01, n1p: 0.02, n2p: 0.02, hp: 0.0, t1p: 0.1 }],
      [1.6, {}]])(t);
    const env = pulse(t, 0.4, 0.5, 0.95, 1.12);
    return addPose(k, { hy: 0.04 * Math.sin(82 * t) * env, hr: 0.035 * Math.sin(82 * t + 1.2) * env, n2p: 0.02 * Math.sin(41 * t) * env, cp: 0.012 * Math.sin(82 * t) * env }, ears(0.75 * pulse(t, 0.1, 0.3, 1.0, 1.3), -0.1 * env));
  },
  feet: (t) => {
    const F = allPlanted(); const r = REST.FL;
    if (t > 0.2 && t < C.stomp) { const up = off('FL', 0.005, 0.15, 0.045);
      if (t < 0.42) { const u = smooth((t - 0.2) / 0.22); F.FL = { p: r.clone().lerp(up, u), pitch: 1.15 * Math.sin(Math.PI * 0.5 * u) }; }
      else if (t < 0.5) F.FL = { p: up.clone().add(V3(0, 0.008 * Math.sin(40 * t), 0)), pitch: 1.15 };
      else { const u = ((t - 0.5) / STRIKE) ** 2; F.FL = { p: up.clone().lerp(r, u), pitch: 1.15 * (1 - u) }; } }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything. Only the spine, neck, head, ears and tail move, so planted hooves stay planted.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { n1p: 0.17, n2p: 0.12, hp: -0.13, hy: 0.2, hr: 0.15, n1y: 0.09, n1r: 0.04, t1p: 0.6 }, 'out'], [0.17, { n1p: -0.05, n2p: -0.02, hy: -0.06, hr: -0.04, t1p: -0.1 }], [0.42, {}]])(t), ears(0.8 * pulse(t, 0, 0.04, 0.2, 0.4), 0)),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers him: shoved back a step, the head whips away, he shakes it off and squares up.
const HB = -0.085;
const heavyHit = {
  dur: 1.1, contact: [0], travel: (t) => HB * EASE.out(clamp(t / 0.3)), phases: [['hit', 0], ['stagger', 0.07], ['shake', 0.38], ['square up', 0.7]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.038, oy: -0.02, bp: 0.13, br: 0.08, by: -0.1, sp: 0.06, cp: 0.09, n1p: 0.32, n2p: 0.24, hp: -0.22, hy: -0.42, n2y: -0.22, n1y: -0.1, hr: -0.22, t1p: 0.85 }, 'out'],
      [0.24, { oz: -0.012, oy: -0.05, bp: 0.03, br: -0.035, by: -0.04, n1p: 0.04, n2p: 0.0, hp: -0.3, hy: -0.26, n2y: -0.1, hr: 0.1, t1p: 0.2 }],
      [0.44, { oy: -0.024, bp: -0.045, n1p: -0.2, n2p: -0.12, hp: -0.22, hy: 0.06, t1p: -0.15 }],
      [0.74, { oy: -0.006, bp: 0.012, n1p: -0.05, n2p: -0.02, hp: -0.02 }],
      [1.1, {}]])(t);
    const sh = pulse(t, 0.36, 0.44, 0.6, 0.74);
    return addPose(k, { hy: 0.11 * Math.sin(34 * (t - 0.36)) * sh, hr: 0.09 * Math.sin(34 * (t - 0.36) + 1.3) * sh, n2y: 0.05 * Math.sin(34 * (t - 0.36) - 0.5) * sh }, ears(0.85 * pulse(t, 0, 0.05, 0.5, 0.8), 0.2 * sh));
  },
  feet: (t) => ({
    HL: steps(t, REST.HL, [[0.035, 0.165, off('HL', 0, 0, HB), 0.045, 0.4]]), FR: steps(t, REST.FR, [[0.075, 0.205, off('FR', 0, 0, HB), 0.05]]),
    HR: steps(t, REST.HR, [[0.15, 0.275, off('HR', 0, 0, HB), 0.04, 0.4]]), FL: steps(t, REST.FL, [[0.2, 0.33, off('FL', 0, 0, HB), 0.05]]),
  }),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames, then stand. He rises out of a low crouch, the rack flares, one stamp.
const SP = { grow: 7 * FR_, stamp: 0.74 + STRIKE };
const spawn = {
  dur: 1.6, contact: [SP.stamp], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['rise', SP.grow], ['flare', 0.5], ['stamp', 0.74], ['stand', SP.stamp]],
  pose: (t) => addPose(track([
    [0, { oy: -0.13, bp: -0.1, sp: -0.08, n1p: -0.46, n2p: -0.36, hp: -0.5, t1p: -0.3 }],
    [SP.grow, { oy: -0.13, bp: -0.1, sp: -0.08, n1p: -0.46, n2p: -0.36, hp: -0.5, t1p: -0.3 }],
    [0.5, { oy: -0.02, bp: 0.0, sp: -0.02, n1p: -0.22, n2p: -0.14, hp: -0.28, t1p: 0.1 }],
    [0.74, { oy: 0.014, bp: 0.09, cp: 0.06, sp: 0.03, n1p: 0.25, n2p: 0.2, hp: 0.22, t1p: 0.7 }, 'out'],
    [SP.stamp, { oy: 0.004, bp: 0.07, cp: 0.06, sp: 0.03, n1p: 0.24, n2p: 0.2, hp: 0.2, t1p: 0.75 }],
    [1.12, { oy: -0.008, bp: 0.02, cp: 0.01, n1p: 0.08, n2p: 0.05, hp: 0.04, t1p: 0.2 }],
    [1.6, {}]])(t), ears(0.5 * pulse(t, 0, 0.1, 0.5, 0.8), 0)),
  feet: (t) => {
    const F = allPlanted(); const r = REST.FR, up = off('FR', -0.004, 0.12, 0.04);
    if (t > 0.5 && t < SP.stamp) {
      if (t < 0.7) { const u = smooth((t - 0.5) / 0.2); F.FR = { p: r.clone().lerp(up, u), pitch: 1.1 * Math.sin(Math.PI * 0.5 * u) }; }
      else if (t < 0.74) F.FR = { p: up.clone(), pitch: 1.1 };
      else { const u = ((t - 0.74) / STRIKE) ** 2; F.FR = { p: up.clone().lerp(r, u), pitch: 1.1 * (1 - u) }; } }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ death
// His hooves unlock. A jolt, the forelegs buckle, the hindquarters give way and he goes down on his right side;
// the head stays up a moment, then falls and the rack props it off the floor.
const D = { knees: 0.55, side: 1.2, head: 1.85, end: 2.7 };
const death = {
  dur: D.end, contact: [D.side - 0.04, D.head], phases: [['jolt', 0], ['buckle', 0.14], ['fall', D.knees], ['head falls', D.side + 0.2], ['still', D.head]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.12, { bp: 0.11, oy: 0.004, br: -0.05, n1p: 0.3, n2p: 0.22, hp: 0.3, hy: 0.15, t1p: 0.8 }, 'out'],
      [D.knees, { bp: -0.4, oy: -0.045, oz: 0.02, br: 0.06, sp: -0.05, n1p: -0.05, n2p: 0.1, hp: 0.3, hy: -0.1, t1p: 0.2 }],
      [0.86, { bp: -0.2, oy: -0.16, oz: 0.0, br: 0.55, by: 0.1, sp: -0.02, sr: 0.06, n1p: 0.2, n2p: 0.2, hp: 0.25, hy: 0.1, hr: -0.3, n1r: -0.15, t1p: 0.5 }],
      [D.side, { bp: 0.0, oy: -0.318, oz: -0.02, br: 1.42, by: 0.16, sp: 0.0, sr: 0.03, cr: 0.03, n1p: 0.24, n2p: 0.22, hp: 0.2, n1y: 0.05, hy: 0.0, hr: -0.75, n1r: -0.32, n2r: -0.3, t1p: 0.3 }, 'in'],
      [D.side + 0.2, { bp: 0.0, oy: -0.322, oz: -0.02, br: 1.4, by: 0.16, sr: 0.03, cr: 0.03, n1p: 0.3, n2p: 0.28, hp: 0.22, n1y: 0.1, hy: 0.05, hr: -0.8, n1r: -0.36, n2r: -0.34, t1p: 0.1 }],
      [D.head, { bp: 0.0, oy: -0.324, oz: -0.02, br: 1.4, by: 0.16, sr: 0.03, cr: 0.03, n1p: 0.1, n2p: 0.05, hp: 0.05, n1y: -0.34, n2y: -0.3, hy: -0.12, hr: -0.52, n1r: -0.2, n2r: -0.16, t1p: -0.1 }, 'in'],
      [D.head + 0.1, { bp: 0.0, oy: -0.324, oz: -0.02, br: 1.4, by: 0.16, sr: 0.03, cr: 0.03, n1p: 0.12, n2p: 0.07, hp: 0.07, n1y: -0.31, n2y: -0.27, hy: -0.1, hr: -0.55, n1r: -0.2, n2r: -0.16, t1p: -0.1 }, 'out'],
      [D.end, { bp: 0.0, oy: -0.324, oz: -0.02, br: 1.4, by: 0.16, sr: 0.03, cr: 0.03, n1p: 0.1, n2p: 0.05, hp: 0.05, n1y: -0.34, n2y: -0.3, hy: -0.12, hr: -0.52, n1r: -0.2, n2r: -0.16, t1p: -0.15 }],
    ])(t);
    const tw = pulse(t, D.side, D.side + 0.1, D.head - 0.25, D.head - 0.05);
    return addPose(k, { hy: 0.03 * Math.sin(47 * t) * tw, n2p: 0.02 * Math.sin(31 * t) * tw, kb: -0.05 * smooth((t - D.side) / 0.6) }, ears(0.7 * pulse(t, 0, 0.06, 1.0, 1.6), -0.25 * smooth((t - D.head) / 0.5)));
  },
  feet: (t, B) => {
    const u = smooth((t - 0.5) / 0.6); // the hooves let go of the floor as he falls
    const lie = { FL: [-0.13, -0.3, 0.075], FR: [-0.02, -0.325, 0.11], HL: [-0.12, -0.36, -0.01], HR: [-0.02, -0.385, 0.075] };
    const slip = { FL: off('FL', 0.01, 0, -0.03), FR: off('FR', -0.012, 0, -0.045), HL: REST.HL, HR: REST.HR };
    const F = {};
    for (const k of LEGS) {
      const a = REST[k].clone().lerp(slip[k], smooth((t - 0.14) / 0.4));
      const twitch = 0.012 * Math.sin(30 * t + (k === 'FL' ? 0 : 2)) * pulse(t, D.side, D.side + 0.1, D.side + 0.5, D.side + 0.8);
      const l = lie[k]; const lp = B.loc(k, [l[0], l[1] + twitch, l[2]]); lp.y = Math.max(lp.y, 0.034 * u); F[k] = { p: a.lerp(lp, u), pitch: 0.55 * u, q: I.clone().slerp(B.parQ(k), u), lock: t < 0.14 };
    }
    return F;
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), quake, trample: trampleClip(0), trampleWarn: trampleClip(0.46), call, hurt, heavyHit, spawn, death };
