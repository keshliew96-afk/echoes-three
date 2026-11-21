// The Thorn Boar's moves. Units are model units (the model is 1 long; the page draws it CFG.unit times bigger).
// Timings come from the game: ENEMY_STATS.boar in src/sim/enemies.js (2.0 u/s, a bite every 48 ticks per target) and
// the gore in src/render/enemies/facet/boar.js (BOAR_GORE: three hits, contacts at 2.5 frames, 0.8 s and 1.6 s; the
// hit timeline of render/facet/foe.js: wind 1, strike 2.5, contact 2, snap 2.5, settle 5 frames, held, recover 0.35 s).
// A game frame is 1/30 s (render/facet/foe.js FRAME).
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from '../kit/quad.mjs';
const FR = 1 / 30;
export const CFG = {
  name: 'boar', unit: 1.4, base: {},
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck1', 'n1'], ['head', 'h']],
  extras: [['earL', 'el'], ['earR', 'er'], ['tail1', 't1'], ['tail2', 't2'], ['crestF', 'kf'], ['crestR', 'kr']],
  legs: {
    FL: { kind: 'front', b: ['fUpperL', 'fForeL', 'fCannonL', 'fHoofL'] }, FR: { kind: 'front', b: ['fUpperR', 'fForeR', 'fCannonR', 'fHoofR'] },
    HL: { kind: 'hind', b: ['hThighL', 'hShinL', 'hCannonL', 'hHoofL'] }, HR: { kind: 'hind', b: ['hThighR', 'hShinR', 'hCannonR', 'hHoofR'] },
  },
  springs: [{ bone: 'earL', k: 600, c: 20, max: 0.6 }, { bone: 'earR', k: 600, c: 20, max: 0.6 }, { bone: 'tail1', k: 260, c: 12, max: 0.8 }, { bone: 'tail2', k: 190, c: 9, max: 0.9 }],
};
const U = CFG.unit;
const REST = { FL: V3(0.125, 0, 0.17), FR: V3(-0.125, 0, 0.17), HL: V3(0.105, 0, -0.24), HR: V3(-0.105, 0, -0.24) };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
// each front hoof from its shoulder joint (fUpper) at rest, in the chest's frame
const REL = { FL: [0.005, -0.29, 0.04], FR: [-0.005, -0.29, 0.04] };
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
// ears: the left ear's yaw and roll, mirrored for the right
const ears = (backL = 0, upL = 0, backR = backL, upR = upL) => ({ ely: backL, elr: upL, ery: -backR, err: -upR });
// the thorn crest: + stands the thorns up (hackles)
const crest = (a) => ({ kfp: -a, krp: -0.8 * a });
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.9); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const I = new THREE.Quaternion();
// the game's body pose (boar.js REST fields) on this rig: push and hop in game u, pitch + nose down, twist + to its left
function game(g) {
  const push = (g.push || 0) / U, hop = (g.hop || 0) / U, pitch = g.pitch || 0, tw = g.twist || 0, hy = g.hy || 0, hp = g.hp || 0;
  return { oz: push, oy: hop - 0.08 * pitch * 0.4, bp: -pitch, br: g.roll || 0, by: 0.45 * tw, sy: 0.3 * tw, cy: 0.25 * tw,
    n1y: 0.45 * hy, hy: 0.55 * hy, n1p: -0.45 * hp, hp: -0.55 * hp, cp: -0.15 * pitch };
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. Two slow breaths a cycle with a huff on each, a look left then right, an ear flick on each side, the tail
// swishes, and near the end he roots the floor with his snout and paws it once with a front hoof.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(3 * w), sw = Math.sin(w);
    const look = 0.4 * pulse(t, 0.5, 1.0, 1.8, 2.3) - 0.36 * pulse(t, 2.6, 3.05, 3.6, 4.05);
    const root = pulse(t, 4.3, 4.6, 5.3, 5.7), snuf = root * Math.sin(38 * t);
    const huff = bump(t, 1.4, 0.18) + bump(t, 3.3, 0.18);
    return addPose(
      { oy: 0.003 * br - 0.012 * root, bp: -0.06 * root + 0.006 * br, cp: 0.01 * br, n1p: -0.22 * root - 0.008 * br + 0.04 * huff, hp: -0.25 * root + 0.04 * snuf - 0.05 * huff },
      { ox: 0.006 * sw, br: 0.016 * sw, by: 0.02 * Math.sin(w + 1) },
      { n1y: 0.4 * look + 0.03 * snuf, hy: 0.45 * look + 0.05 * snuf, hr: 0.1 * look },
      ears(-0.45 * bump(t, 0.9, 0.2) + 0.2 * look, 0.12 * bump(t, 0.9, 0.2), -0.45 * bump(t, 3.85, 0.2) - 0.2 * look, 0.12 * bump(t, 3.85, 0.2)),
      { t1y: 0.5 * Math.sin(2 * Math.PI * t / 1.5) * (0.4 + 0.6 * pulse(t, 2.0, 2.3, 3.2, 3.6)), t1p: 0.06 * br, t2y: 0.4 * Math.sin(2 * Math.PI * t / 1.5 - 0.8) },
      crest(0.03 * br + 0.06 * huff),
    );
  },
  feet: (t) => {
    const F = allPlanted(); const r = REST.FR;
    if (t > 5.05 && t < 5.6) {
      const k = track([[5.05, { y: 0, z: 0, p: 0 }], [5.18, { y: 0.045, z: 0.03, p: 0.8 }], [5.28, { y: 0.006, z: 0.035, p: 0.3 }, 'in'], [5.38, { y: 0.006, z: -0.03, p: 0.5 }, 'out'], [5.48, { y: 0.03, z: -0.01, p: 0.6 }], [5.6, { y: 0, z: 0, p: 0 }]])(t);
      F.FR = { p: r.clone().add(V3(0, k.y, k.z)), pitch: k.p };
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ run and turn
// The game's boar trots in diagonal pairs (boar.js createLegs groups [[0, 3], [1, 2]]) at 2.0 u/s. a third of a second a cycle.
const WT = 1 / 3;
const GAIT = { T: WT, duty: 0.46, v: 2.0 / U };
const GF = { FL: { phase: 0, n: [0.125, 0.16], lift: 0.06, droop: 0.9 }, HR: { phase: 0.02, n: [-0.105, -0.25], lift: 0.05, droop: 0.6, push: 0.3 },
             FR: { phase: 0.5, n: [-0.125, 0.16], lift: 0.06, droop: 0.9 }, HL: { phase: 0.52, n: [0.105, -0.25], lift: 0.05, droop: 0.6, push: 0.3 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT;
    return addPose(
      { oy: -0.006 + 0.008 * Math.cos(2 * w - 0.6), oz: 0.01, bp: -0.05 + 0.014 * Math.sin(2 * w + 0.4), br: 0.03 * Math.sin(w + 0.2), by: 0.03 * Math.sin(w) },
      { sy: -0.03 * Math.sin(w + 0.4), cy: -0.03 * Math.sin(w + 0.4), cr: -0.015 * Math.sin(w + 0.2) },
      { n1p: -0.07 + 0.03 * Math.sin(2 * w + 1.3), hp: -0.06 - 0.03 * Math.sin(2 * w + 1.8), hy: -0.03 * Math.sin(w), n1y: -0.02 * Math.sin(w) },
      { t1p: 0.25 + 0.06 * Math.sin(2 * w), t1y: 0.2 * Math.sin(w + 1.2), t2y: 0.15 * Math.sin(w + 0.4) },
      ears(0.35, 0.05), crest(0.12 + 0.03 * Math.sin(2 * w)),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: 0.4, duty: 0.55, v: 0, omega: dir * 2 * Math.PI / 1.6, pivot: [0, -0.04] };
  const gf = { FL: { ...GF.FL, lift: 0.045 }, FR: { ...GF.FR, lift: 0.045 }, HL: { ...GF.HL, lift: 0.04 }, HR: { ...GF.HR, lift: 0.04 } };
  return {
    dur: 0.4, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / 0.4;
      return addPose({ oy: -0.005 + 0.004 * Math.cos(2 * w - 0.5), br: 0.02 * Math.sin(w) - 0.02 * dir, bp: 0.008 * Math.sin(2 * w) },
        { sy: 0.08 * dir, cy: 0.07 * dir, n1y: 0.16 * dir, hy: 0.2 * dir, hr: 0.05 * dir, n1p: -0.03 + 0.015 * Math.sin(2 * w + 1) },
        { t1y: -0.3 * dir + 0.1 * Math.sin(w), t1p: 0.1 }, ears(0.15, 0.03)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ the gore combo
// The game's key poses (boar.js A1..O3), its hit timeline and its three contacts (BOAR_GORE): the first bite is
// unwarned (wind-back and strike squeezed into 2.5 frames), the next two are predicted from the per-target cooldown
// (the held wind-up pulls back over 4 frames, then strikes so the contact lands on the bite). Each strike's front
// hooves step in 0.16 u to land on the contact and step back out after the snap (boar.js armLunge, frontShift).
const K = (o) => ({ push: 0, pitch: 0, twist: 0, roll: 0, hy: 0, hp: 0, hop: 0, ...o });
const G0 = K({});
const A1 = K({ push: -0.04, pitch: 0.03, twist: -0.22, roll: 0.05, hy: -0.5, hp: 0.24 }), P1 = K({ push: -0.07, pitch: 0.04, twist: -0.3, roll: 0.07, hy: -0.62, hp: 0.3 });
const S1 = K({ push: 0.16, pitch: 0.14, twist: 0.2, roll: -0.06, hy: 0.55, hp: 0.22 }), O1 = K({ push: 0.13, pitch: 0.12, twist: 0.3, roll: -0.08, hy: 0.72, hp: 0.12 });
const A2 = K({ push: -0.03, pitch: 0.04, twist: 0.24, roll: -0.05, hy: 0.52, hp: 0.26 }), P2 = K({ push: -0.07, pitch: 0.05, twist: 0.3, roll: -0.07, hy: 0.62, hp: 0.32 });
const S2 = K({ push: 0.16, pitch: 0.14, twist: -0.22, roll: 0.06, hy: -0.56, hp: 0.22 }), O2 = K({ push: 0.13, pitch: 0.12, twist: -0.32, roll: 0.08, hy: -0.72, hp: 0.12 });
const A3 = K({ push: -0.02, pitch: 0.08, twist: -0.04, hy: -0.06, hp: 0.3 }), P3 = K({ push: -0.07, pitch: 0.1, hy: 0, hp: 0.36 });
const S3 = K({ push: 0.16, pitch: -0.24, hy: 0, hp: -0.55, hop: 0.05 }), O3 = K({ push: 0.14, pitch: -0.3, hy: 0, hp: -0.65, hop: 0.065 });
const HPITCH = 0;
const C1 = 2.5 * FR, C2 = 48 / 60, C3 = 96 / 60; // contacts
const GORE = (() => {
  // [time, game pose, ease]
  const k = [
    [0, G0], [C1 - 1.5 * FR, A1, 'out'], [C1, S1, 'in'], [C1 + 2 * FR, S1, 'hold'], [C1 + 4.5 * FR, O1, 'out'], [C1 + 9.5 * FR, A2],
    [C2 - 6.5 * FR, A2], [C2 - 2.5 * FR, P2, 'out'], [C2, S2, 'in'], [C2 + 2 * FR, S2, 'hold'], [C2 + 4.5 * FR, O2, 'out'], [C2 + 9.5 * FR, A3],
    [C3 - 6.5 * FR, A3], [C3 - 2.5 * FR, P3, 'out'], [C3, S3, 'in'], [C3 + 2 * FR, S3, 'hold'], [C3 + 4.5 * FR, O3, 'out'], [C3 + 9.5 * FR, A1],
    [C3 + 9.5 * FR + 0.817, A1], [C3 + 9.5 * FR + 0.817 + 0.35, G0],
  ];
  return { keys: track(k.map(([t, g, e]) => [t, game(g), e])), end: C3 + 9.5 * FR + 0.817 + 0.35 };
})();
// the settle's one small overshoot past the next wind-up (render/facet/beats.js B5) is in the monotone cubic's swing
const gore = {
  dur: GORE.end, contact: [C1, C2, C3],
  phases: [['hook: strike', 0], ['hook: contact', C1], ['snap back', C1 + 2 * FR], ['backhand wind-up held', C1 + 9.5 * FR], ['pull back', C2 - 6.5 * FR], ['backhand hook: strike', C2 - 2.5 * FR], ['contact', C2], ['snap back', C2 + 2 * FR],
           ['toss wind-up held', C2 + 9.5 * FR], ['pull back', C3 - 6.5 * FR], ['toss: strike', C3 - 2.5 * FR], ['contact', C3], ['snap back', C3 + 2 * FR], ['hook wind-up held', C3 + 9.5 * FR], ['recover', C3 + 9.5 * FR + 0.817]],
  pose: (t) => {
    const g = GORE.keys(t);
    const heat = pulse(t, 0, 0.05, GORE.end - 0.4, GORE.end);
    // the head kicks on each contact frame (B4), the ears pin back, the thorns stand, the tail goes up
    const kick = [C1, C2, C3].reduce((a, c) => a + bump(t, c + 1 * FR, 3 * FR), 0);
    return addPose(g, { hp: -0.08 * kick, n1p: -0.04 * kick }, ears(0.7 * heat, -0.1 * heat), crest(0.35 * heat + 0.1 * kick), { t1p: 0.6 * heat, t2p: 0.2 * heat, t1y: 0.15 * Math.sin(20 * t) * heat });
  },
  feet: (t, B) => {
    const rear = pulse(t, C3 - 2.5 * FR, C3, C3 + 4.5 * FR, C3 + 9.5 * FR);
    const F = { HL: { ...plant(REST.HL), pitch: HPITCH * rear }, HR: { ...plant(REST.HR), pitch: HPITCH * rear } };
    const L = 0.16 / U;
    for (const [k, lag] of [['FL', 0], ['FR', 0.4 * FR]]) {
      const seq = [];
      for (const c of [C1, C2, C3]) { const a = Math.max(0, c - 3.25 * FR) + lag; seq.push([a, c - 0.25 * FR + lag, off(k, 0, 0, L), 0.045, 0.7]); seq.push([c + 4.5 * FR, c + 8.5 * FR, REST[k], 0.03, 0.5]); }
      F[k] = steps(t, REST[k], seq);
    }
    // the toss rears him up: the front hooves ride up with the chest (folded a little) and come down where they left
    if (t > C3 - 3 * FR && t < C3 + 14 * FR) for (const k of ['FL', 'FR']) {
      const fold = pulse(t, C3 - 2 * FR, C3 + 1 * FR, C3 + 5 * FR, C3 + 10 * FR);
      const air = B.loc(k, [REL[k][0], REL[k][1] + 0.035 * fold, REL[k][2] + 0.03 * fold]);
      const f = F[k]; if (air.y > f.p.y) { const u = smooth((air.y - f.p.y) / 0.02); F[k] = { p: V3(f.p.x, air.y, f.p.z), pitch: lerp(f.pitch || 0, 0.9 * fold, u) }; }
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ hurt
// Played on top of anything: the head and neck snap away, the ears pin, the tail tucks. Feet stay planted.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { n1p: 0.16, hp: 0.12, hy: 0.22, hr: 0.18, n1y: 0.1, cp: 0.04, t1p: -0.4 }, 'out'], [0.16, { n1p: -0.05, hp: -0.03, hy: -0.06, hr: -0.04, t1p: 0.1 }], [0.4, {}]])(t),
    ears(0.8 * pulse(t, 0, 0.04, 0.18, 0.36), 0.1), crest(0.3 * pulse(t, 0, 0.04, 0.2, 0.38))),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames (render/facet/foe.js SPAWN_SEC), about 10% over, then stand.
// On top: he comes up low, shakes his head and snorts, the thorns flare.
const SPN = { grow: 7 * FR };
const spawn = {
  dur: 1.3, contact: [], scale: (t) => (t < SPN.grow ? lerp(0.04, 1.1, EASE.out(clamp(t / (SPN.grow * 0.75)))) : lerp(1.1, 1, smooth((t - SPN.grow) / 0.12))),
  phases: [['grow', 0], ['shake', SPN.grow + 0.1], ['snort', 0.75], ['stand', 1.0]],
  pose: (t) => {
    const k = track([[0, { oy: -0.04, bp: 0.06, n1p: -0.3, hp: -0.3, t1p: -0.3 }], [SPN.grow, { oy: -0.04, bp: 0.06, n1p: -0.3, hp: -0.3, t1p: -0.3 }],
      [0.45, { oy: -0.01, bp: 0.0, n1p: -0.08, hp: -0.06, t1p: 0.2 }], [0.75, { oy: 0, bp: 0.03, n1p: 0.1, hp: 0.12, t1p: 0.5 }], [0.86, { oy: -0.008, bp: -0.03, n1p: -0.1, hp: -0.12, t1p: 0.3 }, 'out'], [1.3, {}]])(t);
    const sh = pulse(t, SPN.grow + 0.08, SPN.grow + 0.14, 0.62, 0.72);
    return addPose(k, { hy: 0.22 * Math.sin(42 * t) * sh, hr: 0.16 * Math.sin(42 * t + 1) * sh, n1y: 0.08 * Math.sin(42 * t - 0.5) * sh }, ears(0.4 * sh + 0.5 * bump(t, 0.82, 0.2), 0.2 * sh), crest(0.4 * pulse(t, 0.6, 0.75, 0.95, 1.25)));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// The hooves let go. A squeal (head up), the forelegs buckle, he rolls onto his right side, a last kick of the legs.
const D = { knees: 0.42, side: 0.9, kick: 1.15, end: 2.2 };
const LIE = 0.117; // how far the hips drop to lie on his side
const death = {
  dur: D.end, contact: [D.side - 0.03], phases: [['squeal', 0], ['buckle', 0.14], ['fall', D.knees], ['kick', D.side + 0.1], ['still', 1.6]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.12, { bp: 0.05, oy: -0.004, br: -0.04, n1p: 0.4, hp: 0.4, hy: 0.15, t1p: 0.8 }, 'out'],
      [D.knees, { bp: -0.14, oy: -0.035, oz: 0.01, br: 0.1, n1p: -0.05, hp: 0.1, hy: -0.1, t1p: 0.3 }],
      [0.68, { bp: -0.1, oy: -0.04, br: 0.6, by: 0.08, n1p: 0.1, hp: 0.15, hr: -0.3, t1p: 0.4 }],
      [0.8, { bp: -0.04, oy: -0.065, br: 1.05, by: 0.09, n1p: 0.1, hp: 0.1, hr: -0.36, n1r: -0.12, t1p: 0.3 }],
      [D.side, { bp: 0.0, oy: -LIE, oz: -0.01, br: 1.45, by: 0.1, n1p: 0.1, hp: 0.05, hr: -0.4, n1r: -0.2, t1p: 0.2 }, 'in'],
      [D.side + 0.12, { bp: 0.0, oy: -LIE - 0.004, oz: -0.01, br: 1.42, by: 0.1, n1p: 0.14, hp: 0.08, hr: -0.45, n1r: -0.22, t1p: 0.1 }, 'out'],
      [1.6, { bp: 0.0, oy: -LIE - 0.004, oz: -0.01, br: 1.42, by: 0.1, n1p: 0.02, hp: -0.02, hr: -0.35, n1r: -0.18, t1p: -0.1 }],
      [D.end, { bp: 0.0, oy: -LIE - 0.004, oz: -0.01, br: 1.42, by: 0.1, n1p: 0.0, hp: -0.03, hr: -0.35, n1r: -0.18, t1p: -0.12 }]])(t);
    return addPose(k, ears(0.6 * pulse(t, 0, 0.06, 0.8, 1.3), -0.3 * smooth((t - 1.3) / 0.5)), crest(0.4 * pulse(t, 0, 0.08, 0.7, 1.2) - 0.1 * smooth((t - 1.4) / 0.6)));
  },
  feet: (t, B) => {
    const uF = smooth((t - 0.3) / 0.4), uH = smooth((t - 0.4) / 0.5);
    // where each hoof lies, in the hips' frame once he is down: the legs stick out sideways, a little bent
    const lie = { FR: [-0.025, -0.17, 0.08], FL: [-0.06, -0.2, 0.03], HR: [-0.045, -0.18, -0.02], HL: [-0.05, -0.21, 0.0] };
    const slip = { FL: off('FL', 0.008, 0, -0.03), FR: off('FR', -0.006, 0, -0.025), HL: REST.HL, HR: REST.HR };
    const F = {};
    for (const k of LEGS) {
      const a = REST[k].clone().lerp(slip[k], smooth((t - 0.14) / 0.3));
      const kick = 0.025 * Math.sin(26 * t + (k[1] === 'L' ? 0 : 1.7) + (k[0] === 'F' ? 0 : 0.9)) * pulse(t, D.side, D.side + 0.06, D.kick + 0.2, D.kick + 0.5);
      const u = k === 'FR' ? smooth((t - 0.22) / 0.36) : k[0] === 'F' ? uF : uH; const l = lie[k]; const lp = B.loc(k, [l[0], l[1], l[2] + kick]); lp.y = Math.max(lp.y, 0.03 * u);
      F[k] = { p: a.lerp(lp, u), pitch: 0.5 * u, q: I.clone().slerp(B.parQ(k), u), lock: t < 0.14 };
    }
    return F;
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), gore, hurt, spawn, death };
