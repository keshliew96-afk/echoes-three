// The Mire Toad's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/toad.js (walks 1.0 u/s and keeps 3.0-5.5 u from its target, sidestepping
// slowly inside that band; every 204 ticks it lobs a glob at where the target stands, locked at the throw: the glob arcs
// 60 ticks with the Ember ring r 0.9 at the landing point, lands for 12 in r 0.9 and leaves a slick r 0.9 for 180 ticks
// that slows heroes 30%) and its rig buildToadFacet in src/render/enemies/facet/toad.js (diagonal pairs of webbed feet
// with a squat hop on each step; the gather read ahead from the cooldown over its last 30 ticks, crouched with the chin
// tucked and the sac filling; the throw a rear-up with the head thrown up and the jaw wide, the sac emptied; its lob key
// poses C1/S1/O1 to C3/S3/O3, the strike timeline and the recoil; a slow throat breath).
import * as THREE from 'three';
import fs from 'fs';
import { gaitFoot, V3, smooth, clamp, track } from '../kit/quad.mjs';
const SK = JSON.parse(fs.readFileSync(new URL('./rig/skel.json', import.meta.url)));
const END = Object.fromEntries(Object.entries(SK.ends).map(([k, v]) => [k, V3(...v)]));
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'toad', unit: 1.0,
  chain: [['hips', 'b'], ['chest', 'c'], ['head', 'h']],
  extras: [['jaw', 'j'], ['sac', 'q']],
  scales: [['hips', ['hsx', 'hsy', 'hsz']], ['sac', ['qsx', 'qsy', 'qsz']]],
  legs: {
    FL: { kind: 'limb', b: ['armL', 'foreL', 'pawL', 'clawL'], pole: [1, 0.2, -0.3] }, FR: { kind: 'limb', b: ['armR', 'foreR', 'pawR', 'clawR'], pole: [-1, 0.2, -0.3] },
    HL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'], pole: [0.7, 0.4, 1] }, HR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'], pole: [-0.7, 0.4, 1] },
  },
  springs: [],
};
const U = CFG.unit;
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const REST_T = { FL: END.clawL.clone(), FR: END.clawR.clone(), HL: END.toeL.clone(), HR: END.toeR.clone() };
const FPS = 0;
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const lerp = (a, b, u) => a + (b - a) * u;
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));

// --- the game's pose fields (facet/toad.js): push (u, +z), lift (u), pitch (front down +), roll (+ toward its right),
// twist (+ toward its left), sx / sy (squash), head (+ tips the head up), jaw (the mouth's gape), sac (the throat sac's
// swell, 0 at rest), haunch (+ drops the rump). Mine: look (the head turning, + to its left), hop (the step's bob).
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, head: 0, jaw: 0.04, sac: 0, haunch: 0, look: 0, hop: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
// the game's body: the hop squashes it wide and stretches it tall, the haunch drops the rump. The jaw opens to about
// half the game's gape (the lip is one surface with the throat, see the page's rough notes); the sac swells by scale.
// It sits on its belly, so the game's drops (lift below 0, the haunch) read as the squash only; the body pitches on the
// hips joint, so it is lifted to rock on its belly's front (nose down) or its rump (rearing), and the squash is taken
// from the floor up.
// Its rear-ups are taken at 60% (the game's lighter body rears on its hind legs; this one sits on its rump).
const REAR = 0.6;
const rear = (g) => REAR * Math.max(0, -g.pitch);
const bodyLift = (g) => { const hop = 0.05 * g.hop;
  return (0.5 * Math.max(0, g.lift) + 0.3 * Math.min(0, g.lift) + hop * 0.25) / U + 0.55 * Math.max(0, g.pitch) + 0.25 * rear(g) + 0.22 * ((g.sy - 1) + 0.6 * hop); };
// rearing lifts the front feet off the floor with the chest (the short front legs cannot reach down)
const frontUp = (g) => Math.max(0, 0.58 * rear(g) + bodyLift(g) - 0.02);
function toad(g, breath = 0) {
  const hop = 0.05 * g.hop;
  return {
    oy: bodyLift(g), oz: g.push / U - 0.22 * rear(g),
    bp: -Math.max(0, g.pitch) + rear(g) + 0.25 * g.haunch, br: g.roll, by: g.twist,
    cp: 0, hp: 0.7 * g.head, hy: g.look, hr: 0,
    jp: -0.45 * (g.jaw - 0.04) + 0.15 * g.head,
    hsx: (g.sx - 1) * (1 - 0.3 * hop) - 0.3 * hop, hsy: (g.sy - 1) + 0.6 * hop + 0.01 * breath, hsz: (g.sx - 1) * 0.3,
    qsx: 0.3 * (g.sac + 0.05 * breath), qsy: 0.3 * (g.sac + 0.05 * breath), qsz: 0.38 * (g.sac + 0.05 * breath),
  };
}
// the feet planted where they stand (with the travel), or splayed out in the death
function feetOf(o = {}, tz = 0) {
  const out = {};
  for (const k of LEGS) {
    const front = k[0] === 'F', sg = k[1] === 'L' ? 1 : -1;
    const p = REST_T[k].clone().add(V3(0, 0.003, tz));
    const sp = o.splay || 0, up = front ? o.up || 0 : 0;
    p.add(V3(sg * (front ? 0.05 : 0.07) * sp, 0.02 * (o.lift || 0) + up, (front ? 0.04 : -0.03) * sp + 0.3 * up));
    out[k] = { p, lock: !o.free && up < 0.003, curl: 0, pitch: front ? 0 : FPS * (o.rear || 0) };
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ idle
// The game's slow throat breath (2.2 rad a second). Mine on top: the throat flutters as toads' do, and once it turns
// its head to look to each side.
const IP = 2 * TAU / 2.2 / 1; // two breaths
const IDUR = Math.round(IP * 60) / 60;
const idle = {
  dur: IDUR, loop: true,
  pose: (t) => { const br = Math.sin(TAU * 2 * t / IDUR), fl = Math.sin(TAU * 12 * t / IDUR);
    const look = 0.3 * pulse(t, 0.6, 0.9, 1.6, 1.9) - 0.3 * pulse(t, 3.2, 3.5, 4.3, 4.6);
    return toad(K({ sac: 0.06 * fl, look, jaw: 0.04 }), br); },
  feet: (t, W) => feetOf({}, W.tz),
};
// ------------------------------------------------------------------------------------------------ walk
// The game's 1.0 u/s: the webbed feet step in diagonal pairs (the left front with the right hind), each foot pinned to
// the floor while it carries weight, and the body bobs up in a squat hop on every step, leaning a little into its way.
const WT = 16 / 60;
const gw = { T: WT, duty: 0.6, v: 1.0 / U };
const gfw = { FL: { phase: 0, n: [REST_T.FL.x, REST_T.FL.z], lift: 0.05, droop: 0.5 }, HR: { phase: 0.02, n: [REST_T.HR.x, REST_T.HR.z], lift: 0.045, droop: 0.5 },
              FR: { phase: 0.5, n: [REST_T.FR.x, REST_T.FR.z], lift: 0.05, droop: 0.5 }, HL: { phase: 0.52, n: [REST_T.HL.x, REST_T.HL.z], lift: 0.045, droop: 0.5 } };
const walk = {
  dur: WT, loop: true, gait: gw,
  pose: (t) => { const w = TAU * t / WT; const hop = Math.abs(Math.sin(w + 0.4));
    return toad(K({ hop, pitch: 0.05, roll: 0.03 * Math.sin(w), look: 0.04 * Math.sin(w) })); },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, gw, gfw[k])])),
};
const turn = (dir) => {
  const g = { T: 0.4, duty: 0.6, v: 0, omega: dir * 0.5 * Math.PI, pivot: [0, 0] };
  const gf = { FL: { phase: 0, n: [REST_T.FL.x, REST_T.FL.z], lift: 0.04, droop: 0.5 }, HR: { phase: 0.02, n: [REST_T.HR.x, REST_T.HR.z], lift: 0.04, droop: 0.5 },
               FR: { phase: 0.5, n: [REST_T.FR.x, REST_T.FR.z], lift: 0.04, droop: 0.5 }, HL: { phase: 0.52, n: [REST_T.HL.x, REST_T.HL.z], lift: 0.04, droop: 0.5 } };
  return { dur: 0.4, loop: true, gait: g,
    pose: (t) => { const w = TAU * t / 0.4; return toad(K({ hop: 0.6 * Math.abs(Math.sin(w + 0.4)), twist: 0.08 * dir, look: 0.25 * dir })); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])) };
};

// ------------------------------------------------------------------------------------------------ the lobs
// The game's key poses, word for word. The gather is read ahead from the cooldown over its last 30 ticks (crouched, the
// chin tucked, the sac filling), the throw in the last 2.5 frames landing on the throw tick (reared up, the head thrown
// up and the jaw wide, the sac emptied), the squash held 3 frames with a 0.07 u recoil shove back, snap 3, settle 9,
// rest 0.3 s. 1: flung from its left; 2: from its right; 3: the heave, reared high on its hind legs.
const C1 = K({ push: -0.04, lift: -0.02, pitch: 0.06, roll: -0.04, twist: 0.26, sx: 1.07, sy: 0.92, head: -0.14, jaw: 0.06, sac: 0.55, haunch: 0.03 });
const S1 = K({ push: 0.07, lift: 0.02, pitch: -0.16, roll: 0.05, twist: -0.18, sx: 0.9, sy: 1.12, head: 0.3, jaw: 0.7, sac: -0.3 });
const O1 = K({ push: 0.04, pitch: -0.08, twist: -0.24, sx: 1.04, sy: 0.97, head: 0.14, jaw: 0.32, sac: -0.2 });
const C2 = K({ push: -0.04, lift: -0.02, pitch: 0.06, roll: 0.04, twist: -0.26, sx: 1.07, sy: 0.92, head: -0.14, jaw: 0.06, sac: 0.55, haunch: 0.03 });
const S2 = K({ push: 0.07, lift: 0.02, pitch: -0.16, roll: -0.05, twist: 0.18, sx: 0.9, sy: 1.12, head: 0.3, jaw: 0.7, sac: -0.3 });
const O2 = K({ push: 0.04, pitch: -0.08, twist: 0.24, sx: 1.04, sy: 0.97, head: 0.14, jaw: 0.32, sac: -0.2 });
const C3 = K({ push: -0.06, lift: -0.04, pitch: 0.1, sx: 1.1, sy: 0.88, head: -0.2, jaw: 0.08, sac: 0.85, haunch: 0.05 });
const S3 = K({ push: 0.1, lift: 0.05, pitch: -0.3, sx: 0.88, sy: 1.16, head: 0.4, jaw: 0.85, sac: -0.4 });
const O3 = K({ push: 0.06, lift: 0.01, pitch: -0.14, sx: 1.06, sy: 0.96, head: 0.18, jaw: 0.36, sac: -0.25 });
const LOBS = [{ coil: C1, strike: S1, over: O1 }, { coil: C2, strike: S2, over: O2 }, { coil: C3, strike: S3, over: O3 }];
export const LOAD = 30 / 60;
const STRIKE = 2.5 * FR, HOLD = 3 * FR, SNAP = 3 * FR, SETTLE = 9 * FR, RESTS = 0.3, RECOIL_U = 0.07;
export const TEL = LOAD + STRIKE;
const COIL = LOAD; export const ONE = COIL + STRIKE + HOLD + SNAP + SETTLE + RESTS;
export const FLIGHT = 60 / 60, HERO = 4.2;
const coilCurve = (k) => { const c = c01(k); return 0.85 * (1 - (1 - Math.min(1, c / 0.4)) ** 2) + 0.15 * c; };
const kick = (k) => { const c = c01(k); return 1 - (1 - c) ** 3; };
const settleC = (k) => { const c = c01(k); return smooth(c) - 0.12 * Math.sin(Math.PI * c) * (1 - c); };
// the facet kit's recoil: a shove back over the held frames, eased out through the snap and settle
const recoil = (a) => (a < 0 ? 0 : a < HOLD ? Math.sin(0.5 * Math.PI * a / HOLD) : Math.max(0, 1 - smooth((a - HOLD) / (SNAP + SETTLE))));
function strikePose(V, t) {
  if (t < COIL) return mix(REST, V.coil, coilCurve(t / COIL));
  let a = t - COIL; if (a < STRIKE) return mix(V.coil, V.strike, kick(a / STRIKE));
  a -= STRIKE; const rc = recoil(a); let g;
  if (a < HOLD) g = { ...V.strike };
  else if (a < HOLD + SNAP) g = mix(V.strike, V.over, 1 - (1 - (a - HOLD) / SNAP) ** 2);
  else if (a < HOLD + SNAP + SETTLE) g = mix(V.over, REST, settleC((a - HOLD - SNAP) / SETTLE));
  else g = { ...REST };
  g.push -= RECOIL_U * rc; return g;
}
export const THROW_AT = [TEL, ONE + TEL, 2 * ONE + TEL];
export const LAND_AT = THROW_AT.map((t) => t + FLIGHT);
export const lobG = (t) => { const k = Math.min(2, Math.floor(t / ONE)); return strikePose(LOBS[k], t - k * ONE); };
const LOB_DUR = Math.round((LAND_AT[2] + 0.3) * 60) / 60;
const lob = { dur: LOB_DUR, contact: [...THROW_AT, ...LAND_AT].sort((a, b) => a - b),
  phases: [['1, from its left: the gather, crouched, the sac fills (its last 30 ticks)', 0], ['the fling: the glob away, the Ember ring at the hero (60 ticks)', TEL], ['snaps back, settles', TEL + HOLD + STRIKE],
           ['2, from its right: the gather', ONE], ['the fling', ONE + TEL], ['the first glob lands: 12 in r 0.9, a slick', LAND_AT[0]],
           ['3, the heave: the gather', 2 * ONE], ['the second lands', LAND_AT[1]], ['the heave: reared high', 2 * ONE + TEL], ['settles', 2 * ONE + TEL + 0.2], ['the third lands', LAND_AT[2]]].sort((a, b) => a[1] - b[1]),
  pose: (t) => toad(t < 3 * ONE ? lobG(t) : REST),
  feet: (t, W) => (() => { const g = t < 3 * ONE ? lobG(t) : REST; return feetOf({ up: frontUp(g), rear: rear(g) }, W.tz); })() };

// ------------------------------------------------------------------------------------------------ hurt
// Mine: a toad's flinch, the head ducked, the eyes pulled down, the throat squeezed. Plays on top of anything.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = track([[0, { p: 0 }], [0.04, { p: 1 }, 'out'], [0.16, { p: -0.2 }], [0.4, { p: 0 }]])(t).p;
    return { cp: 0.08 * k, hp: -0.22 * k, jp: 0.02 * k, qsx: -0.12 * k, qsy: -0.12 * k, qsz: -0.12 * k }; },
  feet: (t, W) => feetOf({}, W.tz),
};
// ------------------------------------------------------------------------------------------------ spawn
// The game's grow-in (7 frames, about 10% over); mine after: it puffs its throat once and settles.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
export const SPAWN_AT = 0.55;
const spawn = {
  dur: 1.0, contact: [SPAWN_AT], scale: spawnScale,
  phases: [['grows in', 0], ['puffs its throat', 0.3], ['settles', 0.75]],
  pose: (t) => { const p = pulse(t, 0.3, SPAWN_AT, 0.65, 0.95); return toad(K({ sac: 0.7 * p, head: 0.12 * p, sy: 1 + 0.04 * p, haunch: 0.02 * (1 - smooth(t / 0.4)) })); },
  feet: (t, W) => feetOf({}, W.tz),
};
// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it rears with its head thrown back and its mouth open; then it
// sags flat onto its belly, the throat emptying, the legs splaying out, rolling a little onto its side.
export const DEATH_HIT = 0.02, DEATH_FLAT = 0.85;
const death = {
  dur: 1.8, contact: [DEATH_HIT, DEATH_FLAT],
  phases: [['struck: rears, the head thrown back', 0], ['sags flat, the throat emptying', 0.3], ['lies still', 1.0]],
  pose: (t) => { const hit = pulse(t, 0, 0.06, 0.15, 0.4), k = smooth((t - 0.3) / 0.55);
    return toad(K({ lift: -0.015 * k, pitch: -0.18 * hit + 0.08 * k, roll: 0.18 * k, head: 0.35 * hit - 0.25 * k, jaw: 0.04 + 0.5 * hit + 0.1 * k, sac: 0.2 * hit - 0.45 * k, sx: 1 + 0.08 * k, sy: 1 - 0.1 * k, haunch: 0.06 * k })); },
  feet: (t, W) => { const k = smooth((t - 0.3) / 0.55); return feetOf({ splay: k, free: k > 0 && k < 1 }, W.tz); },
};
export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), lob, hurt, spawn, death };
