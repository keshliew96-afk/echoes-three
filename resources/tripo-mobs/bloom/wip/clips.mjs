// The Heart Bloom's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/bloom.js (creeps at 0.7 u/s; takes root for good within 2.4 u of a
// hero or after 4 s; rooted, it opens on every second beat of the room's heart (src/sim/enemies/husk.js HEARTBEAT,
// 180 ticks) under an Ember ring r 2.3 for 54 ticks and shuts on the surge for 12) and its rig
// src/render/enemies/facet/bloom.js (the pose fields open, rise, tilt, twist, sx, sy, core, flare; the three pulses
// C1/S1/O1 splayed to its left, C2/S2/O2 to its right, C3/S3/O3 the full bloom, on the strike timeline: coil 54 ticks
// less the 2.5-frame strike, hold 3 frames, snap 3, settle 8, rest 0.3 s; the petals open at 14/s and slam shut at
// 40/s; taking root: the roots driven in over 3 frames and the knot settling over 8, sinking 0.05 and the roots
// stepping 18% wider; the heartbeat's swell and surge on the petals and the body).
import * as THREE from 'three';
import { readFileSync } from 'fs';
import { gaitFoot, V3, smooth, lerp, clamp, addPose, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
const SK = JSON.parse(readFileSync(new URL('./rig/skel.json', import.meta.url)));
const PA = [0, 72, 144, 216, 288].map((d) => (d * Math.PI) / 180);
const PAX = PA.map((a) => V3(Math.cos(a), 0, -Math.sin(a))); // a petal splays outward turning about this axis
const ROOTS = [...Array(8).keys()].map((k) => 'R' + k);
// a petal's turn: outward by its splay, plus a lean (ln) that tips the whole crown one way (mine, for the side pulses)
const petalQ = (i) => (p) => new THREE.Quaternion().setFromAxisAngle(PAX[i], p.pa + (p['pe' + i] || 0));
export const CFG = {
  name: 'bloom', unit: 1.1, base: {},
  chain: [['hips', 'b'], ['stem', 's'], ['neck', 'n']],
  extras: [['bud', 'u'], ...PA.map((a, i) => ['p' + i, petalQ(i)])],
  scales: [['stem', ['ssx', 'ssy', 'ssz']]],
  legs: Object.fromEntries(ROOTS.map((k, i) => [k, { kind: 'limb', b: ['a', 'b', 'c', 'd'].map((c) => 'r' + i + c) }])),
  springs: [],
};
const U = CFG.unit;
const WIDEN = 0.08; // the game steps its roots 18% wider as it roots; these modelled roots reach only 8% further
const REST = Object.fromEntries(ROOTS.map((k, i) => [k, V3(...SK.ends['r' + i + 'd'])]));
const WIDE = (k, s) => V3(REST[k].x * (1 + WIDEN * s), REST[k].y, REST[k].z * (1 + WIDEN * s));
const plant = (p) => ({ p: p.clone(), lock: true });
const planted = (s) => () => Object.fromEntries(ROOTS.map((k) => [k, plant(WIDE(k, s))]));
const rooted = planted(1), creeping = planted(0);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const kick = (k) => { const x = c01(k); return 1 - (1 - x) ** 3; };
const settle = (k) => (k <= 0 ? 1 : k >= 1 ? 0 : (1 - k) * (1 - k) * (1 - 2.6 * k));
const coilCurve = (k) => { const c = c01(k); return 0.85 * easeOut(Math.min(1, c / 0.4)) + 0.15 * c; };

// --- the room's heart (the husks' clock): 180 ticks; the swell over the last 30, the surge over the first 42
const HB = 180;
function heart(ph) {
  ph = ((ph % HB) + HB) % HB;
  return { swell: ph >= HB - 30 ? smooth((ph - (HB - 30)) / 30) : 0, surge: ph < 42 ? 1 - 0.6 * smooth(ph / 42) : 0 };
}

// --- the game's key poses (render/enemies/facet/bloom.js), copied
const GREST = Object.freeze({ open: 0.08, rise: 0, tilt: 0, twist: 0, sx: 1, sy: 1, core: 1, flare: 0 });
const FIELDS = Object.keys(GREST);
const K = (o) => Object.freeze({ ...GREST, ...o });
const PULSES = [
  { coil: K({ open: 1, rise: 0.05, tilt: -0.08, twist: 0.3, sx: 0.97, sy: 1.04, core: 1.45, flare: 0.85 }), strike: K({ open: -0.1, rise: -0.04, tilt: 0.15, twist: -0.1, sx: 1.16, sy: 0.88, core: 1.65, flare: 1 }), over: K({ open: 0.25, rise: 0.01, tilt: 0.05, twist: -0.04, sx: 0.97, sy: 1.04, core: 1.2, flare: 0.55 }) },
  { coil: K({ open: 1, rise: 0.05, tilt: -0.08, twist: -0.3, sx: 0.97, sy: 1.04, core: 1.45, flare: 0.85 }), strike: K({ open: -0.1, rise: -0.04, tilt: 0.15, twist: 0.1, sx: 1.16, sy: 0.88, core: 1.65, flare: 1 }), over: K({ open: 0.25, rise: 0.01, tilt: 0.05, twist: 0.04, sx: 0.97, sy: 1.04, core: 1.2, flare: 0.55 }) },
  { coil: K({ open: 1.2, rise: 0.08, tilt: -0.04, sx: 0.95, sy: 1.06, core: 1.6, flare: 1 }), strike: K({ open: -0.15, rise: -0.06, tilt: 0.1, sx: 1.2, sy: 0.84, core: 1.85, flare: 1 }), over: K({ open: 0.3, rise: 0.02, tilt: 0.03, sx: 0.96, sy: 1.05, core: 1.25, flare: 0.6 }) },
];
const TEL = 54 / 60, STRIKE = 2.5 * FR, HOLD = 3 * FR, SNAP = 3 / 30, SETTLE = 8 / 30, REST_T = 0.3;
const COIL = TEL - STRIKE, PULSE_SEC = TEL + HOLD + SNAP + SETTLE + REST_T;
const lerpF = (a, b, k) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * k; return o; };
function strikePose(v, t) {
  const P = PULSES[v];
  if (t < COIL) return lerpF(GREST, P.coil, coilCurve(t / COIL));
  if (t < TEL) return lerpF(P.coil, P.strike, kick((t - COIL) / STRIKE));
  if (t < TEL + HOLD) return { ...P.strike };
  if (t < TEL + HOLD + SNAP) return lerpF(P.strike, P.over, easeOut((t - TEL - HOLD) / SNAP));
  if (t < TEL + HOLD + SNAP + SETTLE) return lerpF(P.over, GREST, 1 - settle((t - TEL - HOLD - SNAP) / SETTLE));
  return { ...GREST };
}
// the petals chase the pose's open: 14/s opening, 40/s slamming shut (integrated at 240 Hz into a table per pulse)
const OPEN = PULSES.map((_, v) => { const n = Math.ceil(PULSE_SEC * 60) + 2, out = []; let o = GREST.open; const dt = 1 / 240;
  for (let i = 0; i < n * 4; i++) { const want = strikePose(v, i * dt).open; o += (want - o) * Math.min(1, dt * (want > o ? 14 : 40)); if (i % 4 === 0) out.push(o); } return out; });
const openAt = (v, t) => { const T = OPEN[v], f = clamp(t * 60, 0, T.length - 1), i = Math.floor(f), j = Math.min(T.length - 1, i + 1); return T[i] + (T[j] - T[i]) * (f - i); };

// --- the game's pose on this rig. The body (stem up) takes the tilt, twist and squash (sx, sy times the heart's
// 6% swell); the bud slides up by the rise; the petals splay outward round the stem. The game splays its five
// separate petals up to 1.4 rad; this bud is one welded mesh, so its petals splay 0.5 of the game's angle (PSC).
const PSC = 0.5;
function bloomPose(g, t, o = {}) {
  const swell = o.swell || 0, surge = o.surge || 0, sink = o.sink ?? 1, drive = o.drive || 0;
  const open = o.open ?? g.open;
  const breathe = 0.12 * swell * (1 - Math.max(0, g.flare));
  const hs = 1 + 0.06 * swell;
  const out = {
    oy: (-0.05 * sink - 0.02 * drive) / U + (o.bob || 0) - (o.crouch || 0),
    sp: -g.tilt + (o.nod || 0), sy: g.twist, sr: o.roll || 0,
    ssx: g.sx * hs - 1, ssy: g.sy * hs - 1, ssz: g.sx * hs - 1,
    ub: g.rise / U,
    pa: PSC * (1.15 * (open - GREST.open) + breathe) - 0.03 * surge,
  };
  if (o.wob) for (let i = 0; i < 5; i++) out['pe' + i] = PSC * 0.04 * Math.sin(TAU * t / 6 * 2 + i * 1.3);
  return out;
}

// ------------------------------------------------------------------------------------------------ rooted (idle)
// 6 s, two beats of the room's heart. Rooted (the state it spends its life in): the knot sunk onto its wide roots,
// the petals breathing open on the swell and the body swelling 6%, a thump on the surge.
const idle = {
  dur: 2 * HB / 60, loop: true,
  pose: (t) => { const h = heart(t * 60); return bloomPose(GREST, t, { ...h, sink: 1, wob: true }); },
  feet: rooted,
};

// ------------------------------------------------------------------------------------------------ creep and turns
// The game's creep: 0.7 u/s on its roots, every other root in turn (four and four here; the game has seven), the knot
// shuffling and the body nodding along the travel.
const WT = 0.2, GAIT = { T: WT, duty: 0.5, v: 0.7 / U };
const GF = Object.fromEntries(ROOTS.map((k, i) => [k, { phase: (i % 2) * 0.5, n: [REST[k].x, REST[k].z], lift: 0.03, droop: 0.3, push: 0.1 }]));
const creepPose = (t) => { const w = TAU * t / WT; return bloomPose(GREST, t, { sink: 0, crouch: 0.005 / U, bob: 0.03 * Math.cos(w) / U * 0.5, nod: -0.05 * Math.sin(w), roll: 0.04 * Math.sin(w / 2) }); };
const walk = {
  dur: WT * 4, loop: true, gait: { ...GAIT },
  pose: creepPose,
  feet: (t) => Object.fromEntries(ROOTS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: WT, duty: 0.5, v: 0, omega: dir * Math.PI / 1.5 };
  return {
    dur: WT * 4, loop: true, gait: g,
    pose: (t) => addPose(creepPose(t), { sy: 0.06 * dir }),
    feet: (t) => Object.fromEntries(ROOTS.map((k) => [k, gaitFoot(t, g, GF[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ take root
// The game's rooting: the roots driven in over 3 frames (stepping 18% wider), the knot sinking onto them and settling
// over 8 frames with one overshoot; then rooted for good.
const R0 = 0.2;
function rootAt(t) {
  const a = t - R0;
  if (a < 0) return { drive: 0, sink: 0 };
  if (a < 3 * FR) { const k = easeOut(a / (3 * FR)); return { drive: k, sink: 0.6 * k }; }
  if (a < 11 * FR) { const s = settle((a - 3 * FR) / (8 * FR)); return { drive: s, sink: 0.6 + 0.4 * (1 - s) }; }
  return { drive: 0, sink: 1 };
}
const rootClip = {
  dur: 1.1, contact: [R0],
  phases: [['creeping', 0], ['the roots driven in', R0], ['the knot settles onto them', R0 + 3 * FR], ['rooted', R0 + 11 * FR]],
  pose: (t) => { const r = rootAt(t); return addPose(bloomPose(GREST, t, { sink: r.sink, drive: r.drive }), { pa: PSC * 0.15 * pulse(t, R0, R0 + 0.05, R0 + 0.15, R0 + 0.45) }); },
  feet: (t) => { const r = rootAt(t), free = t > R0 && t < R0 + 3 * FR;
    return Object.fromEntries(ROOTS.map((k) => { const p = WIDE(k, Math.min(1, r.sink / 0.6)); if (free) p.y += 0.015 * Math.sin(Math.PI * (t - R0) / (3 * FR)); return [k, { p, lock: !free }]; })); },
};

// ------------------------------------------------------------------------------------------------ the pulse
// The game's pulse key for key, rooted: the coil on the 54-tick Ember ring opens the petals and flares the core, the
// head rising; the snap slams them shut past closed and squashes the head down on the resolve tick (the heart's
// surge), held 3 frames, then the snap back and the settle. The heart runs under it: the ring opens 54 ticks before
// the beat, so the swell comes through the last half of the coil.
const pulsePose = (v, t) => { const g = strikePose(v, t); const h = heart(HB - 54 + t * 60); return bloomPose(g, t, { ...h, open: openAt(v, t), sink: 1 }); };
const PHASES = (n, at, name) => [[`${name}coil (the ring): the petals open, the core flares`, at], [`${name}the snap`, at + COIL], [`${name}contact: the petals shut`, at + TEL], [`${name}snap back`, at + TEL + HOLD], [`${name}settle`, at + TEL + HOLD + SNAP], [`${name}rest`, at + TEL + HOLD + SNAP + SETTLE]];
const pulseClip = {
  dur: PULSE_SEC, contact: [TEL],
  phases: PHASES(0, 0, ''),
  pose: (t) => pulsePose(0, t),
  feet: rooted,
};
const NAMES = ['pulse 1, splayed to its left: ', 'pulse 2, splayed to its right: ', 'pulse 3, the full bloom: '];
const pulses = {
  dur: 3 * PULSE_SEC, contact: [0, 1, 2].map((n) => n * PULSE_SEC + TEL),
  phases: [0, 1, 2].flatMap((n) => PHASES(n, n * PULSE_SEC, NAMES[n]).filter((_, i) => i !== 1 && i !== 3)),
  pose: (t) => { const n = Math.min(2, Math.floor(t / PULSE_SEC)); return pulsePose(n, t - n * PULSE_SEC); },
  feet: rooted,
};

// ------------------------------------------------------------------------------------------------ hurt
// Plays on top. The game's rooted plant reaction: a full squash, a light flinch bulging at the bulb, no knock to speak
// of; the petals clench.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { ssx: 0.08, ssz: 0.08, ssy: -0.1, sp: 0.08, np: 0.06, pa: -0.06 }, 'out'], [0.17, { ssx: -0.02, ssz: -0.02, ssy: 0.03, sp: -0.02, pa: 0.02 }], [0.4, {}]])(t),
  feet: rooted,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows in over 7 frames, about 10% over. Mine on top: the petals unfurl a little and close, then
// it takes root as above (the game lets it creep for up to 4 s first).
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const SR = 0.75;
const spawn = {
  dur: 1.6, contact: [SR], scale: spawnScale,
  phases: [['grows in', 0], ['the petals unfurl', 7 * FR], ['the roots driven in', SR], ['rooted', SR + 11 * FR]],
  pose: (t) => { const r = rootAt(t - SR + R0); return addPose(bloomPose(GREST, t, { sink: r.sink, drive: r.drive }), { pa: PSC * 0.5 * pulse(t, 0.2, 0.4, 0.5, 0.75), ub: 0.02 * pulse(t, 0.2, 0.4, 0.5, 0.75) }); },
  feet: (t) => rootClip.feet(t - SR + R0),
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it shudders; the light goes out, the petals fall open and
// limp and the stem bows over to its front until the bud lies on the floor, rooted where it stood.
const TIP = 1.41; // the bow (stem and neck together, rad) that lays the bud on the floor: set from the probe below
const bowAt = (t) => TIP * smooth((t - 0.25) / 0.7) ** 1.3;
function deathBody(a, go, hit) {
  return addPose(bloomPose(GREST, 0, { sink: 1 }), { sp: -0.45 * a + 0.1 * hit, np: -0.55 * a, sr: 0.1 * go, ssy: -0.06 * go, pa: PSC * 0.9 * go, pe0: 0.1 * go, pe1: -0.05 * go, pe3: 0.08 * go });
}
const death = {
  dur: 2.2, contact: [0.95],
  phases: [['struck', 0], ['the light goes out', 0.12], ['the stem bows over', 0.25], ['the bud lands', 0.95], ['lies still', 1.2]],
  pose: (t) => { const hit = pulse(t, 0, 0.04, 0.1, 0.3), go = smooth((t - 0.15) / 0.8); return addPose(deathBody(bowAt(t), go, hit), { ssy: -0.08 * hit, ssx: 0.06 * hit, ssz: 0.06 * hit, sp: 0.03 * bump(t, 1.02, 0.14) }); },
  feet: rooted,
};
// The probe: bows it 0..2.0 rad in 0.1 steps (one a frame), in the lying pose.
const probe = { dur: 20 / 30, pose: (t) => deathBody(Math.round(t * 30) * 0.1, 1, 0), feet: rooted };

export const CLIPS = process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), root: rootClip, pulse: pulseClip, pulses, hurt, spawn, death };
