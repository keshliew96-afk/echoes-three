// The Gale Herald's moves. Units are model units (the model is 1 tall to the tip of its helmet vane; the page draws it
// 2.7 u tall, CFG.unit). Timings come from the game: GH in src/sim/enemies/champions.js (walks 1.15 u/s, keeps 2.4 to
// 4.6 u off; Gale Call: a 60-tick cone of r 5.2 and 34 degrees each side that throws heroes 2.4 u; Stoop: a 72-tick
// ring of r 2.1 under a hero 1.6 to 7.5 u away: it takes wing, glides there over the first 80 percent of the warning,
// hangs over the mark and lands on it), CHAMPION_RULES in src/sim/champions.js (a 96-tick entrance, rage below half
// health: cooldowns x0.7, speed x1.15) and the beats in render/facet/beats.js (a frame is 1/30 s: strike 2.5 frames,
// contact held 3 frames, spawn grow 7 frames).
// It is a stone statue: nothing on it swings by itself. The wings, the horn and the helmet vane are cut free in
// wip/rig.py: each wing turns on its root (two joints), the horn turns in the fist that grips it, the vane spins on its rod.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
export const CFG = {
  name: 'galeherald', unit: 2.7,
  base: {},
  chain: [['hips', 'h'], ['spine', 's'], ['chest', 'c'], ['head', 'n']],
  extras: [['vane', 'v'], ['upperarmL', 'ul'], ['forearmL', 'fl'], ['upperarmR', 'ur'], ['horn', 'hn'], ['wingL', 'wl'], ['wingL2', 'xl'], ['wingR', 'wr'], ['wingR2', 'xr']],
  legs: { L: { kind: 'biped', b: ['thighL', 'shinL', 'footL'] }, R: { kind: 'biped', b: ['thighR', 'shinR', 'footR'] } },
  springs: [],
};
const REST = { L: V3(0.045, 0, 0.1), R: V3(-0.045, 0, 0.1) };
const LEGS = ['L', 'R'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const allPlanted = () => ({ L: plant(REST.L), R: plant(REST.R) });
function steps(t, p0, seq) { // a foot that is planted, swings to the next spot, is planted again: seq [[lift, land, to, height, droop]]
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.55); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
// ---- the wings. open: each wing swung out from the back on its root (0 folded, 1.6 level, 2.2 raised in a V);
// fwd: swept forward round the body (+) or back (-); tw: the spread wing turned about its own length; curl: the outer
// half bent further the way the wing opens (+) or back down (-). L and R can differ ({L:{..}, R:{..}}).
const W0 = { open: 0, fwd: 0, tw: 0, curl: 0 };
function wings(a) {
  const L = { ...W0, ...(a.L || a) }, R = { ...W0, ...(a.R || a) };
  return { wlr: L.open, wly: -L.fwd, wlp: L.tw, xlr: L.curl, wrr: -R.open, wry: R.fwd, wrp: R.tw, xrr: -R.curl };
}
const mixW = (a, b, u) => Object.fromEntries(Object.keys(W0).map((k) => [k, lerp(a[k] ?? 0, b[k] ?? 0, u)]));
function keyed(keys, mix, zero) { // [[t, value, ease]]
  return (t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1]; let u = clamp((t - a[0]) / Math.max(1e-6, b[0] - a[0])); u = b[2] ? EASE[b[2]](u) : smooth(u); return mix({ ...zero, ...a[1] }, { ...zero, ...b[1] }, u); };
}
const wingTrack = (keys) => keyed(keys, mixW, W0);
// ---- the horn. At rest it lies on the right shoulder and goes where the arm goes. A key that names a direction holds
// the horn in the room, its bell pointing that way; null lays it back on the shoulder.
const H0 = V3(-0.437, 0.505, -0.744).normalize();           // where the bell points at rest: back, up and out to its right
const aimH = (d) => new THREE.Quaternion().setFromUnitVectors(H0, V3(...d).normalize());
const QI = new THREE.Quaternion(), _e = new THREE.Euler();
function hornTrack(keys) { // [[t, quaternion or null, ease]]
  return (t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1]; let u = clamp((t - a[0]) / Math.max(1e-6, b[0] - a[0])); u = b[2] ? EASE[b[2]](u) : smooth(u);
    const q = (a[1] || QI).clone().slerp(b[1] || QI, u); _e.setFromQuaternion(q, 'YXZ'); return { hnW: lerp(a[1] ? 1 : 0, b[1] ? 1 : 0, u), hnWp: -_e.x, hnWy: _e.y, hnWr: _e.z }; };
}
const HFWD = aimH([0.1, 0.12, 1]), HUP = aimH([-0.3, 1, 0.22]);
// the left arm: the upper arm is carved against the flank and only shrugs; the forearm and the open hand turn at the sleeve's mouth
const armL = (lift = 0, out = 0, shrug = 0) => ({ flp: lift, flr: out, ulp: shrug * 0.6, ulr: shrug * 0.25 });

// ------------------------------------------------------------------------------------------------ idle
// 6 s. A statue on watch. It stands dead still for long beats; then the head turns to one side in a single quick move
// and holds, as stone would; the vane on its helmet swings in the wind all the while; once a loop the wings shrug.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6;
    const ny = track([[0, { v: 0 }], [0.8, { v: 0 }], [0.98, { v: 0.5 }, 'out'], [2.5, { v: 0.5 }], [2.7, { v: 0 }, 'out'], [3.4, { v: 0 }], [3.58, { v: -0.45 }, 'out'], [4.5, { v: -0.45 }], [4.7, { v: 0 }, 'out'], [6, { v: 0 }]])(t).v;
    const shrug = bump(t, 5.25, 0.7), lift = pulse(t, 0.85, 1.05, 2.4, 2.75);
    return addPose({ cp: 0.006 * Math.sin(2 * w), ny, cy: 0.12 * ny, np: -0.02 * Math.abs(ny), nr: 0.05 * ny },
      { vy: 0.7 * Math.sin(w) + 0.25 * Math.sin(3 * w + 1.0) + 0.08 * Math.sin(7 * w) },
      wings({ open: 0.16 * shrug, curl: -0.05 * shrug }), armL(0.18 * lift, 0, 0.1 * lift), { urp: 0.03 * shrug });
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// 1.15 u/s, 1.0 s a cycle (two steps). Stone walking: short heavy steps under the robe, the whole body rocking from foot
// to foot, the head held level, the wings folded and jolting a little open at each footfall, the vane swinging.
// The feet point straight ahead and fall 0.23 u apart (Kesh's rule for humanoids: no splayed feet).
const WT = 1.0;
const GAIT = { T: WT, duty: 0.62, v: 1.15 / CFG.unit };
const GF = { L: { phase: 0, n: [0.042, 0.1], lift: 0.045, droop: 0.5, push: 0.26 }, R: { phase: 0.5, n: [-0.042, 0.1], lift: 0.045, droop: 0.5, push: 0.26 } };
const low = (x) => Math.pow(0.5 + 0.5 * x, 1.7);
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT, a = w - 2 * Math.PI * 0.31;                 // a = 0 when the left foot carries it
    const up = low(Math.cos(2 * a)), thud = low(Math.cos(2 * a + 2.2));
    return addPose(
      { oy: -0.024 + 0.01 * up, ox: 0.014 * Math.cos(a), hr: 0.04 * Math.cos(a), hy: 0.07 * Math.sin(a), hp: -0.05 },
      { sr: -0.018 * Math.cos(a), cr: -0.022 * Math.cos(a), sy: -0.03 * Math.sin(a), cy: -0.05 * Math.sin(a), cp: -0.02, np: 0.06, nr: -0.012 * Math.cos(a), ny: 0.02 * Math.sin(a) },
      { vy: 0.45 * Math.sin(a - 0.8) + 0.12 * Math.sin(2 * a) }, wings({ open: 0.05 + 0.07 * thud, curl: -0.04 * thud }),
      armL(0.12 * Math.sin(a) + 0.05, 0, 0.12 * Math.sin(a)), { urp: 0.04 * Math.sin(a + Math.PI) },
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const TT = 0.9; const g = { T: TT, duty: 0.64, v: 0, omega: dir * 2 * Math.PI / 3.4, pivot: [0, 0] };
  const gf = { L: { ...GF.L, n: [0.046, 0.1], lift: 0.03 }, R: { ...GF.R, n: [-0.046, 0.1], lift: 0.03 } };
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT, a = w - 2 * Math.PI * 0.32;
      return addPose({ oy: -0.012 + 0.006 * low(Math.cos(2 * a)), ox: 0.01 * Math.cos(a), hr: 0.025 * Math.cos(a) },
        { sy: 0.04 * dir, cy: 0.07 * dir, ny: 0.32 * dir, nr: 0.03 * dir, cr: -0.012 * Math.cos(a) }, { vy: -0.6 * dir + 0.15 * Math.sin(2 * a) },
        wings({ L: { open: 0.05 + 0.1 * (dir < 0 ? 1 : 0.3) }, R: { open: 0.05 + 0.1 * (dir > 0 ? 1 : 0.3) } }), armL(0.08, 0, 0.05)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ Gale Call
// raises the horn (it swings up off the shoulder and over, the bell coming round to the front, while the statue draws
// itself up), draws the wind (to the 60-tick cone less one strike: it leans back, the wings spread wide and sweep back,
// the vane spins faster and faster), blast (2.5 frames, landing on the cone's tick: it throws its weight forward behind
// the horn and the wings snap forward round it), contact held (3 frames), recoil (0.2 s), settle (0.65 s: the horn goes
// back over the shoulder and the wings fold).
const GC = { level: 0.5, cast: 1.0 - STRIKE, hit: 1.0, held: 1.0 + HOLD, rec: 1.0 + HOLD + 0.2, end: 1.0 + HOLD + 0.85 };
const galeCall = {
  dur: GC.end, contact: [GC.hit], kinds: ['blast'], cues: { cone: [0, GC.hit] },
  phases: [['raises the horn', 0], ['draws the wind', GC.level], ['blast', GC.cast], ['contact held', GC.hit], ['recoil', GC.held], ['settle', GC.rec]],
  pose: (t) => {
    const BACK = { oy: 0.0, oz: -0.022, hp: 0.1, sp: 0.05, cp: 0.13, np: 0.06 }, OUT = { oy: -0.03, oz: 0.04, hp: -0.2, sp: -0.06, cp: -0.1, np: 0.2 };
    const k = track([[0, {}], [GC.level, { ...BACK, hp: 0.05, cp: 0.07, oz: -0.01 }], [GC.cast, BACK], [GC.hit, OUT, 'in'], [GC.held, { ...OUT, oz: 0.045 }], [GC.rec, { oz: -0.012, hp: 0.04, cp: 0.04, np: 0.03 }, 'out'], [GC.end, {}]])(t);
    const h = hornTrack([[0, null], [0.26, aimH([-0.45, 0.85, 0.15])], [GC.level, aimH([0.06, 0.34, 1])], [GC.cast, aimH([0.08, 0.3, 1])], [GC.hit, HFWD, 'in'], [GC.held, HFWD], [GC.rec, aimH([0.06, 0.34, 1]), 'out'], [GC.rec + 0.3, aimH([-0.45, 0.85, 0.15])], [GC.end, null]])(t);
    const wg = wingTrack([[0, {}], [0.3, { open: 0.35 }], [GC.cast, { open: 1.75, fwd: -0.4, curl: 0.2 }], [GC.hit, { open: 1.3, fwd: 0.8, curl: -0.25 }, 'in'], [GC.held, { open: 1.25, fwd: 0.85, curl: -0.28 }], [GC.rec, { open: 1.2, fwd: 0.15 }, 'out'], [GC.end, {}]])(t);
    const u = clamp(t / GC.cast); const spin = 6 * Math.PI * u * u + (t > GC.hit ? 0.5 * Math.exp(-(t - GC.hit) * 4) * Math.sin((t - GC.hit) * 26) : 0);
    const trem = pulse(t, 0.55, 0.7, GC.cast - 0.03, GC.cast) * 0.01 * Math.sin(72 * t);
    const lift = track([[0, { v: 0, s: 0 }], [GC.level, { v: 0.25, s: 0.1 }], [GC.cast, { v: 0.5, s: 0.3 }], [GC.hit, { v: 0.95, s: 0.6 }, 'in'], [GC.rec, { v: 0.5, s: 0.2 }], [GC.end, { v: 0, s: 0 }]])(t);
    const arm = track([[0, { v: 0 }], [GC.level, { v: 0.22 }], [GC.cast, { v: 0.3 }], [GC.hit, { v: 0.16 }, 'in'], [GC.rec + 0.3, { v: 0.2 }], [GC.end, { v: 0 }]])(t).v;
    return addPose(k, h, wings(wg), { vy: spin, cr: trem, nr: -trem, urp: arm }, armL(lift.v, 0, lift.s));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ Stoop
// takes wing (it sinks, the wings snap open and it leaps), glides (to 80 percent of the 72-tick ring: flat out over the
// floor with the wings spread, one beat on the way), hangs over the mark (it rears upright with the wings raised
// high), lands (2.5 frames, landing on the ring's tick: it drops feet first and the wings slam down), contact held
// (3 frames), rises (0.35 s), settles (0.5 s: the wings fold).
const ST = { leap: 0.14, there: 0.96, drop: 1.2 - STRIKE, hit: 1.2, held: 1.2 + HOLD, up: 1.2 + HOLD + 0.35, end: 1.2 + HOLD + 0.85 };
const STOOP_D = 4.5 / CFG.unit;                               // the hero stands 4.5 u off on the page
const stoopZ = (t) => STOOP_D * smooth(clamp((t - ST.leap) / (ST.there - ST.leap)));
const stoopBody = track([[0, {}], [ST.leap, { oy: -0.05, hp: -0.22, cp: -0.06, np: 0.15 }], [0.32, { oy: 0.2, hp: -0.7, np: 0.5 }, 'out'], [0.62, { oy: 0.3, hp: -0.92, sp: -0.05, np: 0.7 }], [ST.there, { oy: 0.3, hp: -0.35, np: 0.2 }],
  [ST.drop, { oy: 0.34, hp: 0.16, cp: 0.1, np: -0.25 }], [ST.hit, { oy: -0.065, hp: -0.26, sp: -0.06, cp: -0.08, np: 0.1 }, 'in'], [ST.held, { oy: -0.075, hp: -0.3, sp: -0.07, cp: -0.1, np: 0.12 }], [ST.up, { oy: -0.01, hp: -0.04, np: 0.02 }, 'out'], [ST.end, {}]]);
const stoop = {
  dur: ST.end, contact: [ST.hit], kinds: ['land'], cues: { ring: [0, ST.hit] }, travel: stoopZ,
  phases: [['takes wing', 0], ['glides', 0.32], ['hangs over the mark', ST.there], ['lands', ST.drop], ['contact held', ST.hit], ['rises', ST.held], ['settles', ST.up]],
  pose: (t) => {
    const k = stoopBody(t);
    const wg = wingTrack([[0, {}], [ST.leap, { open: 0.7, fwd: -0.25 }], [0.22, { open: 2.15, curl: 0.3 }, 'out'], [0.36, { open: 1.15, fwd: 0.3, curl: -0.3 }], [0.56, { open: 1.75, curl: 0.12 }], [0.86, { open: 1.62, fwd: -0.12 }], [ST.drop, { open: 2.25, fwd: -0.1, curl: 0.35 }],
      [ST.hit, { open: 1.2, fwd: 0.45, curl: -0.35 }, 'in'], [ST.held, { open: 1.15, fwd: 0.5, curl: -0.38 }], [ST.up, { open: 0.8, fwd: 0.1 }, 'out'], [ST.end, {}]])(t);
    const pt = track([[0, { v: 0, s: 0 }], [0.32, { v: 0.5, s: 0.3 }], [0.7, { v: 0.9, s: 0.5 }], [ST.drop, { v: 0.3, s: 0.2 }], [ST.hit, { v: 0.1, s: 0 }, 'in'], [ST.end, { v: 0, s: 0 }]])(t);
    const wob = t > ST.hit ? 0.6 * Math.exp(-(t - ST.hit) * 4) * Math.sin((t - ST.hit) * 24) : 0;
    return addPose(k, wings(wg), armL(pt.v, 0, pt.s), { vy: -1.2 * pulse(t, 0.2, 0.4, ST.there, ST.drop) + wob, urp: 0.1 * pulse(t, 0.2, 0.4, ST.there, ST.hit) });
  },
  feet: (t) => {
    const k = stoopBody(t), tz = stoopZ(t), F = {};
    const air = smooth((t - ST.leap) / 0.14) * (1 - smooth((t - ST.there) / (ST.hit - ST.there)));      // 0 on the floor, 1 trailing in the air
    const a = clamp(-(k.hp || 0)) * 0.85, LEG = 0.52;                                                     // the legs trail along the body's line, almost straight
    for (const s of LEGS) {
      if (t <= ST.leap) { F[s] = plant(REST[s]); continue; }
      if (t >= ST.hit) { F[s] = plant(off(s, 0, 0, STOOP_D)); continue; }
      const trail = V3(REST[s].x, (k.oy || 0) + 0.49 - LEG * Math.cos(a), tz + (k.oz || 0) - LEG * Math.sin(a) + 0.1 * (1 - smooth(a / 0.3)));
      const down = t < ST.there ? V3(REST[s].x, Math.max(0, k.oy || 0), tz + 0.1) : V3(REST[s].x, Math.max(0, k.oy || 0), STOOP_D + 0.1);
      F[s] = { p: down.lerp(trail, air), pitch: lerp(0.25, 1.15 + a, air) };
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Rage (a call: the game shows only the glow and a sound)
// gather (it hunches and the wings close forward round it), roar (2.5 frames: it throws itself up, the wings burst open,
// the horn is thrust at the sky and the vane spins), holds the call, then squares up as the horn comes back to the shoulder.
const RG = { gather: 0.34, roar: 0.34 + STRIKE, end: 1.6 };
const rage = {
  dur: RG.end, contact: [RG.roar], kinds: ['roar'], phases: [['gather', 0], ['roar', RG.gather], ['calls the wind', RG.roar], ['squares up', 1.2]],
  pose: (t) => {
    const IN = { oy: -0.035, hp: -0.2, sp: -0.06, cp: -0.12, np: -0.25 }, OUT = { oy: 0.0, oz: -0.01, hp: 0.12, sp: 0.05, cp: 0.16, np: 0.3 };
    const k = track([[0, {}], [RG.gather, IN], [RG.roar, OUT, 'in'], [1.2, { ...OUT, cp: 0.12, np: 0.22 }], [RG.end, {}]])(t);
    const h = hornTrack([[0, null], [RG.gather, aimH([-0.55, 0.6, -0.3])], [RG.roar, HUP, 'in'], [1.15, HUP], [1.4, aimH([-0.5, 0.8, -0.2])], [RG.end, null]])(t);
    const wg = wingTrack([[0, {}], [RG.gather, { open: 0.35, fwd: 0.55, curl: -0.2 }], [RG.roar, { open: 2.0, fwd: -0.2, curl: 0.3 }, 'in'], [1.2, { open: 1.8, fwd: -0.1, curl: 0.2 }], [RG.end, {}]])(t);
    const u = clamp((t - RG.gather) / (1.25 - RG.gather)); const spin = 8 * Math.PI * (u - 0.5 * u * u) * 2 / 1.0 * 0.5;       // four turns, slowing
    const sh = pulse(t, RG.roar, RG.roar + 0.05, 1.05, 1.25) * 0.012 * Math.sin(84 * t);
    const lift = pulse(t, RG.gather, RG.roar, 1.1, 1.5);
    return addPose(k, h, wings(wg), { vy: spin, cr: sh, nr: -sh * 1.5, urp: 0.3 * lift }, armL(0.7 * lift, 0, 0.5 * lift));
  },
  feet: allPlanted,
};
// The enraged state, played on top of anything (spine, chest, head, arms, wings, horn and vane only): the wings held half open and trembling, the head low, the vane twitching.
const rageHold = {
  dur: 0.4, loop: true, upperOnly: true,
  pose: (t) => { const w = 2 * Math.PI * t / 0.4; return addPose({ cp: 0.05, sp: 0.02, np: -0.08 + 0.015 * Math.sin(w), nr: 0.02 * Math.sin(2 * w) }, wings({ open: 0.5 + 0.035 * Math.sin(w), curl: -0.1 + 0.03 * Math.sin(2 * w) }), { vy: 0.5 * Math.sin(w) + 0.2 * Math.sin(3 * w) }, armL(0.25, 0, 0.15)); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything: the chest and the head flinch away, the wings jolt open and the vane is knocked round.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => { const e = t < 0.07 ? smooth(t / 0.07) : 1 - smooth((t - 0.07) / 0.35);
    return addPose({ sp: 0.05 * e, cp: 0.12 * e, np: 0.16 * e, ny: -0.28 * e, nr: 0.06 * e, cy: -0.06 * e }, wings({ open: 0.4 * e, curl: 0.1 * e }), { vy: 1.4 * e }, armL(0.3 * e, 0, 0.2 * e)); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers it: thrown back two heavy steps with the wings flung open for balance and the horn jolted off
// the shoulder; it catches itself, the head shakes once, the wings fold and it squares up.
const HB = -0.13;
const heavyHit = {
  dur: 1.15, contact: [0, 0.46], kinds: ['taken', 'catch'], travel: (t) => HB * EASE.out(clamp(t / 0.36)), phases: [['hit', 0], ['stagger', 0.07], ['catches itself', 0.46], ['squares up', 0.78]],
  pose: (t) => {
    const k = track([[0, {}], [0.07, { oz: -0.02, oy: -0.01, hp: 0.2, sp: 0.07, cp: 0.12, np: 0.2, ny: -0.3, nr: -0.12 }, 'out'], [0.28, { oy: -0.04, hp: 0.05, cp: 0.0, np: -0.08, ny: -0.1 }],
      [0.48, { oy: -0.04, hp: -0.12, cp: -0.06, np: -0.14 }], [0.8, { oy: -0.012, hp: -0.02, np: 0.02 }], [1.15, {}]])(t);
    const h = hornTrack([[0, null], [0.09, aimH([-0.5, 0.82, -0.22]), 'out'], [0.4, aimH([-0.48, 0.7, -0.5])], [0.7, null], [1.15, null]])(t);
    const wg = wingTrack([[0, {}], [0.1, { open: 1.35, fwd: 0.3, curl: 0.25 }, 'out'], [0.46, { open: 0.9, fwd: -0.1 }], [0.8, { open: 0.25 }], [1.15, {}]])(t);
    const fl = pulse(t, 0, 0.08, 0.3, 0.6), sh = pulse(t, 0.5, 0.58, 0.8, 0.95) * 0.25 * Math.sin((t - 0.5) * 21);
    return addPose(k, h, wings(wg), armL(0.8 * fl, 0, 0.5 * fl), { vy: 2.5 * EASE.out(clamp(t / 0.5)) * (1 - smooth((t - 0.6) / 0.5)), ny: sh });
  },
  feet: (t) => ({ R: steps(t, REST.R, [[0.03, 0.19, off('R', 0, 0, HB), 0.04, 0.4]]), L: steps(t, REST.L, [[0.18, 0.36, off('L', 0, 0, HB), 0.04, 0.4]]) }),
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: it stands as it was carved, a statue with
// its head bowed; then the head comes up, the wings lift and snap open once, the vane spins, and the wings fold.
const SP = { wake: 0.5, snap: 1.0, hit: 1.0 + STRIKE, end: 1.6 };
const spawn = {
  dur: SP.end, contact: [SP.hit], kinds: ['wings'], scale: (t) => 0.02 + 0.98 * EASE.out(clamp(t / SPAWN)),
  phases: [['grows', 0], ['a statue', SPAWN], ['wakes', SP.wake], ['wings', SP.snap], ['settles', SP.hit]],
  pose: (t) => {
    const k = track([[0, { np: -0.32, cp: -0.05 }], [SP.wake, { np: -0.32, cp: -0.05 }], [0.72, { np: 0.05, cp: 0.0 }, 'out'], [SP.snap, { np: 0.02, cp: -0.04, oy: -0.012 }], [SP.hit, { np: 0.12, cp: 0.12, hp: 0.04 }, 'in'], [SP.end, {}]])(t);
    const wg = wingTrack([[0, {}], [SP.wake + 0.15, {}], [SP.snap, { open: 0.5, fwd: 0.2 }], [SP.hit, { open: 1.85, fwd: -0.15, curl: 0.25 }, 'in'], [SP.hit + 0.12, { open: 1.7, curl: 0.15 }], [SP.end, {}]])(t);
    const u = clamp((t - SP.snap) / 0.5);
    return addPose(k, wings(wg), { vy: 4 * Math.PI * (u - 0.5 * u * u) * 2 * 0.5 }, armL(0.3 * pulse(t, SP.snap, SP.hit, 1.3, 1.55)));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// It turns back to stone and falls like one. A jolt; the horn slides off the shoulder and hangs, the head sinks, the
// wings droop half open and the vane slows to a stop; then it tips forward, stiff as it was carved, and comes down flat
// on its face. The wings splay on its back. The eyes go out.
const D = { jolt: 0.1, stone: 0.95, land: 1.62, end: 2.6 };
const TOE_Z = 0.1;                                            // it tips over the line of its toes
const tip = (t) => { const u = clamp((t - D.stone) / (D.land - D.stone)); const b = t > D.land ? 0.055 * Math.exp(-(t - D.land) * 9) * Math.abs(Math.sin((t - D.land) * 16)) : 0; return 1.505 * Math.pow(u, 2.4) - b; };
const death = {
  dur: D.end, contact: [D.land, D.land + 0.2], kinds: ['thud', 'settle'], phases: [['jolt', 0], ['turns to stone', D.jolt], ['tips', D.stone], ['falls', D.stone + 0.36], ['lands', D.land], ['still', D.land + 0.3]],
  pose: (t) => {
    const th = tip(t); const c = Math.cos(th), s = Math.sin(th);
    // the hips ride a stiff turn about the toe line: a point at height y and zr behind the line goes to (y cos + ... )
    const y0 = 0.5, zr = -0.005 - TOE_Z; const hy = y0 * c - zr * s, hz = y0 * s + zr * c + TOE_Z;
    const pre = track([[0, {}], [D.jolt, { hp: 0.16, cp: 0.12, np: 0.25, ny: -0.2 }, 'out'], [0.5, { hp: 0.02, cp: -0.02, np: -0.2, ny: 0.1 }], [D.stone, { cp: -0.03, np: -0.38, ny: 0.25 }], [D.land, { cp: 0.0, np: -0.1, ny: 0.7 }], [D.end, { np: -0.05, ny: 0.75 }]])(t);
    const h = hornTrack([[0, null], [D.jolt, aimH([-0.5, 0.8, -0.2]), 'out'], [0.55, aimH([-0.5, 0.1, 0.55]), 'in'], [D.stone, aimH([-0.45, -0.25, 0.6])], [D.land, aimH([-0.75, 0.02, 0.65]), 'in'], [D.end, aimH([-0.78, 0.0, 0.62])]])(t);
    const wg = wingTrack([[0, {}], [D.jolt, { open: 0.9, curl: 0.2 }, 'out'], [0.6, { open: 0.4, curl: -0.15 }], [D.stone, { open: 0.32, curl: -0.18 }], [D.land - 0.1, { open: 0.5, fwd: -0.1 }], [D.land + 0.06, { open: 1.25, fwd: 0.25, curl: 0.2 }, 'out'], [D.land + 0.5, { open: 0.95, fwd: 0.32, curl: 0.12 }], [D.end, { open: 0.95, fwd: 0.33, curl: 0.12 }]])(t);
    const u = clamp(t / D.stone); const spin = 5 * Math.PI * (u - 0.5 * u * u);                               // the vane runs down and stops
    const reach = smooth((t - D.stone) / (D.land - D.stone));
    return addPose({ ...pre, oy: hy - y0 + 0.012 * smooth((th - 1.25) / 0.25) + 0.008 * Math.sin(Math.max(0, th)), oz: hz + 0.005, hp: (pre.hp || 0) - th }, h, wings(wg), { vy: spin }, armL(0.25 * pulse(t, 0, 0.1, 0.4, 0.7) + 1.15 * reach, 0.5 * reach, 0.3 * reach));
  },
  // the sandal's tip reaches 8 mm past the toe line, so the foot rolls up onto it as it tips (no lock once it rolls)
  feet: (t) => { const th = tip(t), pt = th; return Object.fromEntries(LEGS.map((k) => [k, { p: V3(REST[k].x, 0.008 * Math.sin(Math.max(0, pt)), REST[k].z), pitch: pt, lock: th < 0.02, under: th > 0.3 }])); },
};

// Tripo set the feet about eight degrees toes-out: every move turns them straight (and gives planted feet a fixed heading)
const TOE = 0.14;
const straight = (c) => (c.feet ? { ...c, feet: (t) => { const F = c.feet(t); for (const k of LEGS) F[k] = { ...F[k], yaw: (F[k].yaw ?? 0) + (k === 'L' ? -TOE : TOE) }; return F; } } : c);
export const CLIPS = Object.fromEntries(Object.entries({ idle, walk, turnL: turn(1), turnR: turn(-1), galeCall, stoop, rage, rageHold, hurt, heavyHit, spawn, death }).map(([n, c]) => [n, straight(c)]));
