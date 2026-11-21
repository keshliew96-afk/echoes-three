// The Barrow Ram's moves. Units are model units (the model is 1 long; the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/ram.js (walks 1.1 u/s where its horns point, turns at 90°/s; the Horn
// Slam is a cone 1.8 u at a half-angle of 50° on a 60-tick Ember cone telegraph, 18 damage, cooldown 270 ticks) and its
// rig src/render/enemies/facet/ram.js (the key poses C1..O3, Kesh's 3-hit flow: the hook from its right, the reverse
// hook, the heave; the strike timeline of render/facet/foestrike.js: the coil fills the telegraph, the strike takes its
// last 2.5 frames, held 3, snap 2.5, settle 6 with one overshoot, rest 0.25 s; its legs step in diagonal pairs).
// A game frame is 1/30 s.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from '../kit/quad.mjs';
const FR = 1 / 30;
export const CFG = {
  name: 'ram', unit: 1.3, base: {},
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck1', 'n1'], ['head', 'h']],
  extras: [['tail1', 't1']],
  scales: [['spine', ['ssx', 'ssy', 'ssz']]],
  legs: {
    FL: { kind: 'front', b: ['fUpperL', 'fForeL', 'fCannonL', 'fHoofL'] }, FR: { kind: 'front', b: ['fUpperR', 'fForeR', 'fCannonR', 'fHoofR'] },
    HL: { kind: 'hind', b: ['hThighL', 'hShinL', 'hCannonL', 'hHoofL'] }, HR: { kind: 'hind', b: ['hThighR', 'hShinR', 'hCannonR', 'hHoofR'] },
  },
  springs: [{ bone: 'tail1', k: 240, c: 11, max: 0.7 }],
};
const U = CFG.unit;
const REST = { FL: V3(0.125, 0, 0.17), FR: V3(-0.125, 0, 0.17), HL: V3(0.11, 0, -0.29), HR: V3(-0.11, 0, -0.29) };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.9); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const I = new THREE.Quaternion();

// The game's body pose (ram.js REST fields) on this rig: push, lift and crouch in game u; pitch + nose down; roll +
// toward its right; twist + toward its left (spread down the spine); sx / sy the body's squash; head + tips the head
// up; hy turns it, + to its left.
const G = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, head: 0, hy: 0, crouch: 0 });
const FIELDS = Object.keys(G);
const K = (o) => Object.freeze({ ...G, ...o });
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
function game(g) {
  const tw = g.twist;
  return { oz: g.push / U, oy: (g.lift - g.crouch) / U, bp: -g.pitch, br: g.roll, by: 0.6 * tw, sy: 0.25 * tw, cy: 0.15 * tw,
    n1p: 0.45 * g.head, hp: 0.55 * g.head, n1y: 0.45 * g.hy, hy: 0.55 * g.hy,
    ssx: 0.4 * (g.sx - 1), ssz: 0.12 * (g.sx - 1) };
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. The game's rest: a slow breath (1.9 rad/s) and the head nodding a little (1.3 rad/s). On top (mine): it lowers
// its head and shakes its horns once, looks left then right, scrapes the floor with a front hoof, the tail flicks.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(3 * w), nod = Math.sin(2 * w);
    const look = 0.32 * pulse(t, 0.4, 0.9, 1.6, 2.1) - 0.3 * pulse(t, 2.3, 2.8, 3.3, 3.8);
    const low = pulse(t, 4.0, 4.3, 5.2, 5.6), shake = pulse(t, 4.35, 4.45, 4.85, 5.0) * Math.sin(30 * t);
    return addPose(
      { oy: 0.003 * br - 0.01 * low, bp: 0.005 * br - 0.04 * low, cp: 0.008 * br, ssy: 0.01 * br, ssx: 0.006 * br },
      { ox: 0.004 * Math.sin(w), br: 0.012 * Math.sin(w), by: 0.015 * Math.sin(w + 1) },
      { n1p: 0.03 * nod - 0.16 * low, hp: 0.02 * nod - 0.14 * low, n1y: 0.4 * look, hy: 0.45 * look + 0.1 * shake, hr: 0.08 * look + 0.14 * shake },
      { t1y: 0.5 * bump(t, 1.2, 0.25) * Math.sin(40 * t) + 0.4 * bump(t, 3.6, 0.25) * Math.sin(40 * t), t1p: 0.05 * br },
    );
  },
  feet: (t) => {
    const F = allPlanted(); const r = REST.FL;
    if (t > 5.1 && t < 5.9) {
      const k = track([[5.1, { y: 0, z: 0, p: 0 }], [5.24, { y: 0.04, z: 0.035, p: 0.7 }], [5.34, { y: 0.004, z: 0.04, p: 0.2 }, 'in'], [5.46, { y: 0.004, z: -0.035, p: 0.4 }, 'out'],
        [5.58, { y: 0.035, z: 0.0, p: 0.6 }], [5.68, { y: 0.004, z: 0.03, p: 0.2 }, 'in'], [5.78, { y: 0.004, z: -0.02, p: 0.3 }, 'out'], [5.9, { y: 0, z: 0, p: 0 }]])(t);
      F.FL = { p: r.clone().add(V3(0, k.y, k.z)), pitch: k.p };
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ walk and turn
// The game's ram steps in diagonal pairs (FL with HR, FR with HL) at 1.1 u/s, leaning into the travel (pitch +0.08).
const WT = 0.4;
const GAIT = { T: WT, duty: 0.58, v: 1.1 / U };
const GF = { FL: { phase: 0, n: [0.125, 0.17], lift: 0.05, droop: 0.9 }, HR: { phase: 0.02, n: [-0.11, -0.29], lift: 0.045, droop: 0.6, push: 0.3 },
             FR: { phase: 0.5, n: [-0.125, 0.17], lift: 0.05, droop: 0.9 }, HL: { phase: 0.52, n: [0.11, -0.29], lift: 0.045, droop: 0.6, push: 0.3 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT;
    return addPose(
      { oy: -0.006 + 0.006 * Math.cos(2 * w - 0.6), oz: 0.008, bp: -0.08 + 0.01 * Math.sin(2 * w + 0.4), br: 0.025 * Math.sin(w + 0.2), by: 0.025 * Math.sin(w) },
      { sy: -0.025 * Math.sin(w + 0.4), cy: -0.025 * Math.sin(w + 0.4), cr: -0.012 * Math.sin(w + 0.2) },
      { n1p: -0.04 + 0.025 * Math.sin(2 * w + 1.3), hp: -0.03 - 0.025 * Math.sin(2 * w + 1.8), hy: -0.03 * Math.sin(w), n1y: -0.02 * Math.sin(w) },
      { t1p: 0.15 + 0.05 * Math.sin(2 * w), t1y: 0.18 * Math.sin(w + 1.2) },
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
// 90°/s: a quarter turn a second, stepping round in place.
const turn = (dir) => {
  const g = { T: 0.5, duty: 0.6, v: 0, omega: dir * Math.PI / 2, pivot: [0, -0.06] };
  const gf = { FL: { ...GF.FL, lift: 0.04 }, FR: { ...GF.FR, lift: 0.04 }, HL: { ...GF.HL, lift: 0.035 }, HR: { ...GF.HR, lift: 0.035 } };
  return {
    dur: 0.5, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / 0.5;
      return addPose({ oy: -0.004 + 0.003 * Math.cos(2 * w - 0.5), br: 0.015 * Math.sin(w) - 0.015 * dir, bp: 0.006 * Math.sin(2 * w) },
        { sy: 0.06 * dir, cy: 0.05 * dir, n1y: 0.12 * dir, hy: 0.15 * dir, hr: 0.04 * dir, n1p: -0.02 + 0.01 * Math.sin(2 * w + 1) },
        { t1y: -0.25 * dir + 0.08 * Math.sin(w), t1p: 0.08 }); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ the horn slams
// The game's key poses (ram.js C1..O3) on its strike timeline, three slams back to back (RAM_SLAMS_STRING): each coil
// fills the 60-tick cone telegraph, the strike is its last 2.5 frames so the horns land on the resolve tick, held 3
// frames, snap 2.5, settle 6 with one overshoot (render/facet/beats.js settle), rest 0.25 s. The front hooves step in by
// the contact and back out after the snap (rule 3).
const C1 = K({ push: -0.08, pitch: -0.06, roll: 0.05, twist: -0.3, sx: 0.96, sy: 1.05, head: 0.28, hy: -0.42, crouch: 0.04 });
const S1 = K({ push: 0.18, pitch: 0.22, roll: -0.05, twist: 0.24, sx: 1.19, sy: 0.91, head: -0.3, hy: 0.36 });
const O1 = K({ push: 0.12, pitch: 0.16, twist: 0.3, sx: 1.05, sy: 0.97, head: -0.16, hy: 0.42 });
const C2 = K({ push: -0.08, pitch: -0.06, roll: -0.05, twist: 0.3, sx: 0.96, sy: 1.05, head: 0.28, hy: 0.42, crouch: 0.04 });
const S2 = K({ push: 0.18, pitch: 0.22, roll: 0.05, twist: -0.24, sx: 1.19, sy: 0.91, head: -0.3, hy: -0.36 });
const O2 = K({ push: 0.12, pitch: 0.16, twist: -0.3, sx: 1.05, sy: 0.97, head: -0.16, hy: -0.42 });
const C3 = K({ push: -0.12, lift: -0.02, pitch: 0.1, sx: 1.06, sy: 0.92, head: -0.12, crouch: 0.1 });
const S3 = K({ push: 0.2, lift: 0.02, sx: 0.9, sy: 1.1, head: 0.1 });
const O3 = K({ push: 0.14, lift: 0.01, pitch: -0.03, sx: 0.96, sy: 1.04, head: 0.06 });
const SLAMS = [{ coil: C1, strike: S1, over: O1 }, { coil: C2, strike: S2, over: O2 }, { coil: C3, strike: S3, over: O3 }];
const TEL = 60 / 60, STRIKE = 2.5 * FR, HOLD = 3 * FR, SNAP = 2.5 * FR, SETTLE = 6 * FR, RESTT = 0.25;
const COIL = TEL - STRIKE, D = TEL + HOLD + SNAP + SETTLE + RESTT;
const kick = (k) => 1 - (1 - c01(k)) ** 3;
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const coilCurve = (k) => { const c = c01(k); return 0.85 * easeOut(Math.min(1, c / 0.4)) + 0.15 * c; };
const settle = (k, over = 0.08) => { const x = c01(k); if (x < 0.62) { const a = x / 0.62; return 1 - (1 + over) * (a * a * (3 - 2 * a)); } const b = (x - 0.62) / 0.38; return -over * (1 - b * b * (3 - 2 * b)); };
function slamAt(V, t) {
  if (t < COIL) return mix(G, V.coil, coilCurve(t / COIL));
  if (t < TEL) return mix(V.coil, V.strike, kick((t - COIL) / STRIKE));
  if (t < TEL + HOLD) return { ...V.strike };
  if (t < TEL + HOLD + SNAP) return mix(V.strike, V.over, easeOut((t - TEL - HOLD) / SNAP));
  if (t < TEL + HOLD + SNAP + SETTLE) return mix(V.over, G, 1 - settle((t - TEL - HOLD - SNAP) / SETTLE));
  return { ...G };
}
const CONTACTS = [0, 1, 2].map((i) => i * D + TEL);
const slams = {
  dur: 3 * D, contact: CONTACTS,
  phases: SLAMS.flatMap((_, i) => {
    const n = ['the hook from its right', 'the reverse hook', 'the heave'][i], a = i * D;
    return [[n + ': coil (the cone telegraph)', a], [n + ': the slam', a + COIL], ['contact: the horns in', a + TEL], ['snap back', a + TEL + HOLD], ['settle', a + TEL + HOLD + SNAP], ['rest', a + TEL + HOLD + SNAP + SETTLE]];
  }),
  pose: (t) => {
    const i = Math.min(2, Math.floor(t / D)), u = t - i * D;
    const g = game(slamAt(SLAMS[i], u));
    // the head kicks on the contact frame (B4); the tail goes up through the coil and whips on the slam
    const kickH = bump(u, TEL + 1 * FR, 3 * FR), tense = pulse(u, 0, 0.2, TEL + HOLD, TEL + HOLD + SNAP + SETTLE);
    return addPose(g, { hp: -0.06 * kickH, n1p: -0.03 * kickH }, { t1p: 0.4 * tense + 0.3 * kickH, t1y: 0.2 * Math.sin(16 * t) * tense });
  },
  feet: (t) => {
    const F = { HL: plant(REST.HL), HR: plant(REST.HR) };
    const L = 0.16 / U;
    for (const [k, lag] of [['FL', 0], ['FR', 0.4 * FR]]) {
      const seq = [];
      for (const c of CONTACTS) { seq.push([c - 3.25 * FR + lag, c - 0.25 * FR + lag, off(k, 0, 0, L), 0.04, 0.7]); seq.push([c + HOLD + SNAP, c + HOLD + SNAP + 4 * FR, REST[k], 0.03, 0.5]); }
      F[k] = steps(t, REST[k], seq);
    }
    // the heave's push walks the hind hooves in a short shuffle after the contact
    const c = CONTACTS[2];
    for (const [k, lag] of [['HL', 0], ['HR', 2 * FR]]) F[k] = steps(t, REST[k], [[c - 6 * FR + lag, c + lag, off(k, 0, 0, 0.08), 0.03, 0.5], [c + HOLD + SNAP + 2 * FR + lag, c + HOLD + SNAP + 7 * FR + lag, REST[k], 0.03, 0.5]]);
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ block
// The guard: a shot blocked on the horns (the sim's hit_blocked). The game flares the indigo glow; on top (mine) the
// head braces down into the blow and shoves back up, the body rocks back a touch. Feet stay planted.
// The page fires a shot from the hero stand-in that lands on the horns at 0.25 s.
const block = {
  dur: 0.75, upperOnly: true, contact: [0.25],
  pose: (t) => track([[0, {}], [0.2, {}], [0.26, { n1p: -0.1, hp: -0.12, cp: 0.04 }, 'out'], [0.38, { n1p: 0.03, hp: 0.04, cp: -0.01 }], [0.75, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt
// Played on top of anything: the game's heavy flinch (a light squash, a short knock). The head snaps away and the body
// gives a little, the tail tucks. Feet stay planted.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { n1p: 0.12, hp: 0.1, hy: 0.16, hr: 0.14, n1y: 0.08, cp: 0.05, t1p: -0.3 }, 'out'],
    [0.16, { n1p: -0.04, hp: -0.03, hy: -0.05, hr: -0.03, cp: -0.01, t1p: 0.08 }], [0.4, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames (render/facet/foe.js SPAWN_SEC), about 10% over, then stand.
// On top (mine): it comes up low with its head down, shakes its horns and stamps a front hoof.
const SPN = { grow: 7 * FR };
const spawn = {
  dur: 1.4, contact: [1.05], scale: (t) => (t < SPN.grow ? lerp(0.04, 1.1, EASE.out(clamp(t / (SPN.grow * 0.75)))) : lerp(1.1, 1, smooth((t - SPN.grow) / 0.12))),
  phases: [['grow', 0], ['shake', SPN.grow + 0.1], ['stamp', 0.85], ['stand', 1.15]],
  pose: (t) => {
    const k = track([[0, { oy: -0.03, bp: -0.05, n1p: -0.25, hp: -0.2, t1p: -0.2 }], [SPN.grow, { oy: -0.03, bp: -0.05, n1p: -0.25, hp: -0.2, t1p: -0.2 }],
      [0.5, { oy: -0.01, bp: -0.02, n1p: -0.1, hp: -0.08, t1p: 0.1 }], [0.95, { oy: -0.005, bp: -0.01, n1p: 0.06, hp: 0.06, t1p: 0.3 }], [1.08, { oy: -0.012, bp: -0.03, n1p: -0.08, hp: -0.06, t1p: 0.2 }, 'out'], [1.4, {}]])(t);
    const sh = pulse(t, SPN.grow + 0.1, SPN.grow + 0.16, 0.66, 0.76);
    return addPose(k, { hy: 0.2 * Math.sin(36 * t) * sh, hr: 0.16 * Math.sin(36 * t + 1) * sh, n1y: 0.07 * Math.sin(36 * t - 0.5) * sh });
  },
  feet: (t) => { const F = allPlanted(); F.FR = steps(t, REST.FR, [[0.82, 1.05, REST.FR, 0.05, 0.8]]); return F; },
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, its head jerks up; the forelegs buckle and it staggers, then
// it rolls heavily onto its right side, the legs kick once and it lies still. How far the body sinks is probed so the
// lowest point (a horn, a hoof or the fleece) rests on the floor.
const LOW = [-0.000,-0.000,0.000,-0.003,-0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.005,0.010,0.013,0.011,0.010,0.015,0.026,0.037,0.047,0.053,0.069,0.099,0.148,0.208,0.202,0.198,0.196,0.196,0.196,0.197,0.197,0.197,0.198,0.199,0.199,0.200,0.200,0.201,0.201,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202,0.202];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t * 30, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const DT = { buckle: 0.16, roll: 0.5, side: 0.9, end: 2.2 };
const death = {
  dur: DT.end, contact: [DT.side - 0.03], phases: [['struck', 0], ['buckles', DT.buckle], ['rolls over', DT.roll], ['kicks', DT.side + 0.05], ['still', 1.5]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.12, { bp: 0.06, br: -0.03, n1p: 0.3, hp: 0.3, hy: 0.12, t1p: 0.5 }, 'out'],
      [DT.roll, { bp: -0.12, oz: 0.015, br: 0.12, n1p: -0.1, hp: 0.0, hy: -0.08, t1p: 0.2 }],
      [0.72, { bp: -0.08, br: 0.8, by: 0.06, n1p: 0.05, hp: 0.08, hr: -0.25, t1p: 0.3 }],
      [DT.side, { bp: 0.0, oz: -0.01, br: 1.42, by: 0.08, n1p: 0.06, hp: 0.04, hr: -0.35, n1r: -0.15, t1p: 0.1 }, 'in'],
      [DT.side + 0.12, { bp: 0.0, oz: -0.01, br: 1.38, by: 0.08, n1p: 0.1, hp: 0.06, hr: -0.4, n1r: -0.18, t1p: 0.0 }, 'out'],
      [1.5, { bp: 0.0, oz: -0.01, br: 1.4, by: 0.08, n1p: 0.0, hp: -0.02, hr: -0.32, n1r: -0.15, t1p: -0.1 }],
      [DT.end, { bp: 0.0, oz: -0.01, br: 1.4, by: 0.08, n1p: -0.02, hp: -0.03, hr: -0.32, n1r: -0.15, t1p: -0.12 }]])(t);
    const sag = -0.05 * pulse(t, DT.buckle, DT.roll, 0.6, 0.75);
    if (process.env.PROBE) { k.oy = 0; return k; }
    const w = smooth((t - 0.5) / 0.35);
    k.oy = lerp(sag, -lowAt(t), w) + 0.012 * bump(t, DT.side + 0.05, 0.12);
    return k;
  },
  feet: (t, B) => {
    const uF = smooth((t - 0.3) / 0.45), uH = smooth((t - 0.4) / 0.5);
    // where each hoof lies, from its leg's root once it is down: the legs stick out sideways, a little bent
    const lie = { FR: [-0.04, -0.3, 0.1], FL: [-0.08, -0.33, 0.05], HR: [-0.06, -0.3, -0.02], HL: [-0.08, -0.34, 0.0] };
    const slip = { FL: off('FL', 0.01, 0, -0.04), FR: off('FR', -0.008, 0, -0.03), HL: REST.HL, HR: REST.HR };
    const F = {};
    for (const k of LEGS) {
      const a = REST[k].clone().lerp(slip[k], smooth((t - 0.16) / 0.3));
      const kick = 0.03 * Math.sin(24 * t + (k[1] === 'L' ? 0 : 1.7) + (k[0] === 'F' ? 0 : 0.9)) * pulse(t, DT.side, DT.side + 0.06, 1.2, 1.5);
      const u = k[0] === 'F' ? uF : uH; const l = lie[k]; const lp = B.loc(k, [l[0], l[1], l[2] + kick]);
      F[k] = { p: a.lerp(lp, u), pitch: 0.5 * u, q: I.clone().slerp(B.parQ(k), u), lock: t < 0.16 };
    }
    return F;
  },
};

export const CLIPS = process.env.PROBE ? { probe: death } : { idle, walk, turnL: turn(1), turnR: turn(-1), slams, block, hurt, spawn, death };
