// The Glassblower's moves. Units are model units (the model is 1 tall to the top of its blowpipe; the page draws it 2.4 u
// tall, CFG.unit). Timings come from the game: GB in src/sim/enemies/champions.js (walk 1.1 u/s, keeps 3.4 to 5.6 u off and
// backs away; Glass Bubble: an 84-tick ring of r 2.1 on a hero's spot 1.2 to 8 u off, 15 and a glass patch; Glass Gout: a
// 54-tick lane 6.5 u long and 1.0 wide, 12 and a 50 % slow), CHAMPION_RULES in src/sim/champions.js (a 96-tick entrance,
// rage below half health: cooldowns x0.7, speed x1.15), and the beats in render/facet/beats.js (a frame is 1/30 s: strike
// 2.5 frames, contact held 3 frames, spawn grow 7 frames).
// The game's rig holds the blowpipe at its lips with both hands; the Tripo model stands it upright beside him, its foot on
// the floor and his right fist round it high up. The pipe is cut free (wip/rig.py) and rides on the chest; the right fist
// is closed on it (a grip that can slide along it, Gs), and the left hand takes it for the two-handed moves.
// Kesh's rule for humanoids: no splayed feet on the walk or the run. He is lanky, not heavy, so his boots point straight.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
const PU = V3(0.037, 0.9991, -0.0194).normalize();              // the pipe's long way, foot to gather, in the rest model
export const CFG = {
  name: 'glassblower', unit: 2.4,
  // the stance he carries everywhere: a lanky stoop, the head pushed forward, the left glove off his side
  base: { hp: -0.02, sp: 0.02, cp: -0.05, np: -0.05, ulr: 0.04, flp: 0.1 },
  chain: [['hips', 'h'], ['spine', 's'], ['chest', 'c'], ['head', 'n']],
  // the pipe comes before the arms: the right fist is closed on it (a grip), so that arm follows wherever it goes
  extras: [['pipe', 'pp'], ['upperarmL', 'ul'], ['forearmL', 'fl'], ['handL', 'wl'], ['upperarmR', 'ur'], ['forearmR', 'fr'], ['handR', 'wr'], ['skF', 'kf'], ['skB', 'kb']],
  arms: { A: { b: ['upperarmR', 'forearmR', 'handR'], pole: [-0.45, -0.8, -0.4] }, B: { b: ['upperarmL', 'forearmL', 'handL'], pole: [0.35, -0.6, -0.7] } },
  grips: { A: { on: 'pipe', axis: [PU.x, PU.y, PU.z] } },
  legs: { L: { kind: 'biped', b: ['thighL', 'shinL', 'footL'] }, R: { kind: 'biped', b: ['thighR', 'shinR', 'footR'] } },
  springs: [{ bone: 'skF', k: 90, c: 6, max: 0.7 }, { bone: 'skB', k: 85, c: 6, max: 0.7 }],
};
const REST = { L: V3(0.062, 0, 0.07), R: V3(-0.062, 0, 0.07) };
const LEGS = ['L', 'R'];
const HEEL = 0.135;                                           // from the back of the heel to the toe (a toes-up foot is lifted so the heel stays up)
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const allPlanted = () => ({ L: plant(REST.L), R: plant(REST.R) });
const cloth = (front = 0, back = 0) => ({ kfp: front, kbp: -back });
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.4); if (s.pitch < 0) s.p.y += HEEL * Math.sin(-s.pitch); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}

// ---- the pipe. At rest it rides on his chest (its foot on the floor) and needs no channels. A move holds it in the room:
// g is where its grip point is (root space; the point the right fist closes on at rest), el and az aim it from the foot
// towards the gather (el up from level, az from straight ahead to his left), face turns it about itself (the way the right
// fist's knuckles look); w blends from riding on the chest (0) to held in the room (1). s slides the right fist along it
// (towards the gather +, the mouth end -); lt puts the left fist on it, measured the same way from the grip point; lw
// blends the left fist on.
export const GRIP = V3(-0.12075, 0.74135, 0.0866);
const FOOT_T = -0.742, TOP_T = 0.258, GATHER_T = 0.215, GATHER_R = 0.04, PIPE_R = 0.013;
const F0 = V3(0, 0, 1).sub(PU.clone().multiplyScalar(PU.z)).normalize();
const rest0 = new THREE.Matrix4().makeBasis(PU.clone(), F0.clone(), PU.clone().cross(F0));
const dirOf = (el, az) => V3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
function pipeQ(el, az, face) {
  const u = dirOf(el, az); let f = face.clone().sub(u.clone().multiplyScalar(face.dot(u))); if (f.lengthSq() < 1e-6) f = V3(0, 1, 0).sub(u.clone().multiplyScalar(u.y)); f.normalize();
  const m = new THREE.Matrix4().makeBasis(u, f, u.clone().cross(f)).multiply(rest0.clone().transpose());
  return new THREE.Quaternion().setFromRotationMatrix(m);
}
export const REST_AIM = { el: Math.asin(PU.y), az: Math.atan2(PU.x, PU.z) };
const P0 = { gx: GRIP.x, gy: GRIP.y, gz: GRIP.z, el: REST_AIM.el, az: REST_AIM.az, fx: 0, fy: 0, fz: 1, w: 1, s: 0, lt: 0, lw: 0 };
const P = (o = {}) => ({ ...P0, ...o });
// a point on the pipe's axis, t from the grip point along it, once it is held as s
export function pipeAt(s, t) { return V3(s.gx, s.gy, s.gz).add(dirOf(s.el, s.az).multiplyScalar(t)); }
// the pipe held with its axis through the point c at distance t
// keys of held pipes, played so that the right fist's own point on the pipe moves in a straight line between keys while the
// pipe turns and slides through it (a plain blend of the grip point would swing the fist out of reach)
function ptrack(keys) {
  const tr = track(keys.map(([t, s, e]) => { const F = pipeAt(s, s.s); return [t, { ...s, Fx: F.x, Fy: F.y, Fz: F.z }, e]; }));
  return (t) => { const s = tr(t); const d = dirOf(s.el, s.az); return { ...s, gx: s.Fx - d.x * s.s, gy: s.Fy - d.y * s.s, gz: s.Fz - d.z * s.s }; };
}
function through(c, t, el, az, o = {}) { const g = c.clone().sub(dirOf(el, az).multiplyScalar(t)); return P({ gx: g.x, gy: g.y, gz: g.z, el, az, w: 1, ...o }); }
const SHL = V3(0.09, 0.75, -0.02);
function pipe(s, body = {}) {
  const q = pipeQ(s.el, s.az, V3(s.fx, s.fy, s.fz)); const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  const o = { ppT: s.w, ppTa: 1, ppTx: s.gx, ppTy: s.gy, ppTz: s.gz, ppW: s.w, ppWp: -e.x, ppWy: e.y, ppWr: e.z, AGs: s.s };
  if (s.lw > 0) {                                                 // the left fist on the pipe: its wrist a little short of it, towards the shoulder
    const L = pipeAt(s, s.lt); const sh = SHL.clone().add(V3(body.ox || 0, body.oy || 0, body.oz || 0)); const d = L.clone().sub(sh).normalize();
    const wv = L.clone().sub(d.multiplyScalar(0.06));
    Object.assign(o, { BW: s.lw, Bx: wv.x, By: wv.y, Bz: wv.z });
  }
  return o;
}
// the lowest point of the held pipe (its foot, or the underside of the gather): a held pipe never goes under the floor
function lowest(s) { const u = dirOf(s.el, s.az), side = Math.sqrt(Math.max(0, 1 - u.y * u.y)); return Math.min(pipeAt(s, FOOT_T).y - PIPE_R * side, pipeAt(s, GATHER_T).y - GATHER_R); }
function aboveFloor(s) { const lo = lowest(s); return lo < 0.001 ? { ...s, gy: s.gy + 0.001 - lo } : s; }
// the pipe standing with its foot on the floor at (x, z), tipped by el and az
function standing(x, z, el = REST_AIM.el, az = REST_AIM.az, o = {}) { const u = dirOf(el, az); return through(V3(x, PIPE_R * Math.sqrt(Math.max(0, 1 - u.y * u.y)), z), FOOT_T, el, az, o); }
const FOOT0 = GRIP.clone().add(PU.clone().multiplyScalar(FOOT_T));     // where its foot stands at rest
// held upright where it stands at rest, lifted dy; the fist rides with it
const lifted = (dy = 0, o = {}) => P({ gy: GRIP.y + dy, w: 1, ...o });

// the mouth (rest model): where the pipe's mouth end goes when he blows
export const MOUTH = V3(0, 0.846, 0.062);

// ------------------------------------------------------------------------------------------------ idle
// 6 s. He leans on the pipe and waits: a slow breath, his weight eased from boot to boot, the head cocked one way and then
// the other, the left glove flexing; once a loop he lifts the pipe and taps its foot on the floor.
const idle = {
  dur: 6, loop: true, contact: [4.7], kinds: ['tap'],
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const lookL = pulse(t, 0.6, 1.1, 1.9, 2.4), lookR = pulse(t, 2.6, 3.1, 3.7, 4.1), flex = bump(t, 2.3, 0.8);
    const tap = track([[0, { a: 0 }], [4.3, { a: 0 }], [4.6, { a: 1 }], [4.7, { a: 0 }, 'in'], [6, { a: 0 }]])(t).a;
    return addPose(
      { oy: 0.002 * br, cp: 0.015 * br, sp: -0.006 * br, ox: 0.008 * sw, hr: 0.012 * sw, sr: -0.01 * sw, hy: 0.012 * Math.sin(w + 1) },
      { np: -0.01 * br - 0.04 * (lookL + lookR), ny: 0.3 * lookL - 0.3 * lookR, nr: 0.12 * lookL - 0.1 * lookR },
      { ulr: 0.012 * br + 0.03 * flex, flp: 0.03 * br + 0.25 * flex, wlp: -0.3 * flex },
      pipe(lifted(0.045 * tap, { gx: GRIP.x + 0.006 * sw })),
      cloth(0.015 * br, 0.015 * br),
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// 1.1 u/s, 1.0 s a cycle (two steps). Lanky: long loose strides, the head bobbing a little ahead of the body, the shoulders
// swinging, the left glove swinging long, the apron flapping round his knees. The pipe is carried just off the floor and
// swings with the stride. Boots straight ahead.
const WT = 1.0;
const GAIT = { T: WT, duty: 0.6, v: 1.1 / CFG.unit };
const GF = { L: { phase: 0, n: [0.062, 0.07], lift: 0.045, droop: 0.45, push: 0.2 }, R: { phase: 0.5, n: [-0.062, 0.07], lift: 0.045, droop: 0.45, push: 0.2 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT, a = w - 2 * Math.PI * 0.3;
    return addPose(
      { oy: -0.012 + 0.01 * Math.cos(2 * a), ox: 0.01 * Math.cos(a), hr: 0.03 * Math.cos(a), hy: 0.1 * Math.sin(a), hp: -0.03 + 0.01 * Math.cos(2 * a + 0.6) },
      { sy: -0.05 * Math.sin(a), sr: -0.015 * Math.cos(a), cy: -0.08 * Math.sin(a), cr: -0.015 * Math.cos(a), np: 0.02 - 0.03 * Math.cos(2 * a + 0.4), ny: 0.06 * Math.sin(a) },
      { ulp: 0.32 * Math.sin(a), ulr: 0.04, flp: 0.14 + 0.12 * Math.sin(a + 0.5) },
      pipe(lifted(0.05 + 0.008 * Math.cos(2 * a), { el: REST_AIM.el - 0.06 * Math.sin(a), gz: GRIP.z + 0.015 * Math.sin(a) })),
      cloth(0.05 + 0.1 * Math.cos(2 * a + 1.0), 0.05 + 0.09 * Math.cos(2 * a + 2.0)),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const TT = 0.9; const g = { T: TT, duty: 0.6, v: 0, omega: dir * 2 * Math.PI / 3.6, pivot: [0, 0] };
  const gf = { L: { ...GF.L, lift: 0.035 }, R: { ...GF.R, lift: 0.035 } };
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT, a = w - 2 * Math.PI * 0.3;
      return addPose({ oy: -0.01 + 0.006 * Math.cos(2 * a), ox: 0.01 * Math.cos(a), hr: 0.02 * Math.cos(a) },
        { sy: 0.05 * dir, cy: 0.08 * dir, ny: 0.3 * dir, nr: 0.03 * dir }, { ulr: 0.08, flp: 0.1 }, pipe(lifted(0.045, { az: REST_AIM.az + 0.0 })), cloth(0.04, 0.04)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ Glass Bubble
// takes up (both fists on the pipe; he swings it down to slant before him and puts its mouth end to his lips), blows (the
// rest of the 84-tick ring less the flight: three long breaths, his shoulders rising with each; the page swells a bubble of
// molten glass on the gather), lobs (2.5 frames: he flicks the pipe up and the bubble flies off towards the ring), the
// bubble lands and bursts on the 84th tick, settle (the pipe back down on its foot).
const BB = { take: 0.3, flick: 0.95 - STRIKE, lob: 0.95, hit: 84 / 60 };
BB.held = BB.hit + HOLD; BB.end = BB.hit + 0.75;
export const BUBBLE = BB;
const BLOW = { el: -0.24, az: -0.15 };
const glass_bubble = {
  dur: BB.end, contact: [BB.lob, BB.hit], kinds: ['lob', 'burst'], cues: { ring: [0, BB.hit] },
  phases: [['takes up the pipe', 0], ['blows', BB.take], ['lobs', BB.flick], ['the bubble flies', BB.lob], ['bursts', BB.hit], ['settle', BB.held]],
  pose: (t) => {
    const breath = (t > BB.take && t < BB.flick) ? Math.max(0, Math.sin(Math.PI * 3 * (t - BB.take) / (BB.flick - BB.take))) : 0;
    const LEAN = { oy: -0.012, hp: -0.04, sp: -0.03, cp: -0.06, np: -0.06, hy: -0.12, cy: -0.1, ny: 0.1 };
    const k = track([[0, {}], [BB.take, LEAN], [BB.flick, { ...LEAN, oy: -0.02 }], [BB.lob, { oy: -0.005, hp: 0.04, sp: 0.04, cp: 0.08, np: 0.14, hy: -0.06, cy: -0.04, ny: 0.04 }, 'in'],
      [BB.hit, { oy: -0.008, hp: 0.02, cp: 0.04, np: 0.1 }], [BB.held + 0.2, { np: -0.02 }], [BB.end, {}]])(t);
    const blowS = through(MOUTH.clone().add(V3(-0.004, -0.03, 0.035)), FOOT_T, BLOW.el, BLOW.az, { s: -0.6, lt: -0.69, lw: 1, fx: 0, fy: 1, fz: 0 });
    const fp = pipeAt(blowS, blowS.s).add(V3(0, -0.02, -0.025)); const fl = through(fp, blowS.s, 0.55, BLOW.az, { s: -0.6, lt: -0.69, lw: 1, fx: 0, fy: 1, fz: 0 });
    const s = ptrack([[0, P()], [BB.take, blowS], [BB.flick, blowS], [BB.lob, fl, 'in'], [BB.hit, { ...fl, el: 0.5, gy: fl.gy - 0.02 }],
      [BB.held + 0.15, P({ w: 1, gy: GRIP.y + 0.05, el: REST_AIM.el - 0.15, lt: -0.25, lw: 0.6 })], [BB.end - 0.06, P({ w: 1, gy: GRIP.y + 0.01 })], [BB.end, P()]])(t);
    const br = { cp: 0.05 * breath, sp: 0.02 * breath, np: 0.02 * breath, ulr: 0.04 * breath };
    return addPose(k, br, pipe(aboveFloor(s), k), cloth(0.1 * bump(t, BB.lob + 0.05, 0.3), 0.1 * bump(t, BB.lob + 0.08, 0.3)));
  },
  feet: (t) => ({ L: steps(t, REST.L, [[0.05, 0.25, off('L', 0.01, 0, 0.06), 0.035], [BB.held + 0.15, BB.held + 0.35, REST.L, 0.03]]), R: plant(REST.R) }),
};

// ------------------------------------------------------------------------------------------------ Glass Gout
// levels (the 54-tick lane less one strike: he swings the pipe down level at his hip like a lance, the gather forward and
// the left fist behind the right, and sinks with the left boot forward), sprays (2.5 frames: he lunges and thrusts the pipe
// down the lane and molten glass sprays off the gather), spray held (3 frames and a short stream), recoil, settle.
const GG = { thrust: 54 / 60 - STRIKE, hit: 54 / 60 };
GG.held = GG.hit + HOLD + 0.15; GG.rec = GG.held + 0.25; GG.end = GG.rec + 0.5;
export const GOUT = GG;
const glass_gout = {
  dur: GG.end, contact: [GG.hit], kinds: ['gout'], cues: { lane: [0, GG.hit] },
  phases: [['levels the pipe', 0], ['sprays', GG.thrust], ['spray held', GG.hit], ['recoil', GG.held], ['settle', GG.rec]],
  pose: (t) => {
    const AIM = { oy: -0.035, hp: -0.1, sp: -0.04, cp: -0.03, np: -0.04, hy: 0.16, cy: 0.06, ny: -0.16 };
    const LUNGE = { oy: -0.05, oz: 0.04, hp: -0.18, sp: -0.06, cp: -0.04, np: -0.08, hy: 0.1, cy: 0.04, ny: -0.12 };
    const k = track([[0, {}], [0.3, AIM], [GG.thrust, { ...AIM, oz: -0.015 }], [GG.hit, LUNGE, 'in'], [GG.held, { ...LUNGE, oy: -0.048 }], [GG.rec, { ...AIM, oy: -0.03 }], [GG.rec + 0.25, { oy: -0.01, hp: -0.03 }], [GG.end, {}]])(t);
    const LEVEL = through(V3(-0.11, 0.6, 0.17), -0.12, -0.08, 0.1, { s: -0.15, lt: -0.3, lw: 1, fx: 0, fy: 1, fz: 0 });
    const s = ptrack([[0, P()], [0.32, LEVEL], [GG.thrust, { ...LEVEL, gz: LEVEL.gz - 0.025 }], [GG.hit, { ...LEVEL, gz: LEVEL.gz + 0.1, gy: LEVEL.gy - 0.015 }, 'in'],
      [GG.held, { ...LEVEL, gz: LEVEL.gz + 0.095, gy: LEVEL.gy - 0.01 }], [GG.rec, { ...LEVEL, gz: LEVEL.gz + 0.02 }], [GG.rec + 0.3, P({ w: 1, gy: GRIP.y + 0.06, el: REST_AIM.el - 0.2, lt: -0.3, lw: 0.5 })], [GG.end - 0.06, P({ w: 1, gy: GRIP.y + 0.01 })], [GG.end, P()]])(t);
    const shake = pulse(t, GG.hit, GG.hit + 0.03, GG.held - 0.04, GG.held) * Math.sin(70 * t);
    return addPose(k, pipe(aboveFloor({ ...s, gy: s.gy + 0.003 * shake }), k), { cr: 0.006 * shake }, cloth(0.25 * bump(t, GG.hit + 0.05, 0.3), 0.25 * bump(t, GG.hit + 0.08, 0.34)));
  },
  feet: (t) => ({
    L: steps(t, REST.L, [[0.1, 0.3, off('L', 0.01, 0, 0.07), 0.035], [GG.thrust, GG.hit + 0.02, off('L', 0.012, 0, 0.12), 0.03], [GG.rec + 0.1, GG.rec + 0.32, REST.L, 0.03]]),
    R: steps(t, REST.R, [[0.18, 0.36, off('R', -0.01, 0, -0.03), 0.03], [GG.rec + 0.02, GG.rec + 0.22, REST.R, 0.03]]),
  }),
};

// ------------------------------------------------------------------------------------------------ Rage (mine: the game does not stop him)
// raises (he lifts the pipe high in his right fist, the left arm coming up), strikes (2.5 frames: he drives its foot into
// the floor and the gather flares), howls (the head thrown back, the left arm flung wide, shaking), squares up.
const RG = { raise: 0.45, slam: 0.45 + STRIKE, hold: 1.2, end: 1.75 };
const rage = {
  dur: RG.end, contact: [RG.slam], kinds: ['strike'], phases: [['raises the pipe', 0], ['strikes', RG.raise], ['howls', RG.slam + 0.12], ['squares up', RG.hold]],
  pose: (t) => {
    const UPK = { oy: 0.01, hp: 0.06, sp: 0.04, cp: 0.08, np: 0.12 };
    const DOWN = { oy: -0.04, hp: -0.16, sp: -0.05, cp: -0.06, np: -0.14 };
    const HOWL = { oy: -0.03, hp: 0.04, sp: 0.06, cp: 0.12, np: 0.5 };
    const k = track([[0, {}], [RG.raise, UPK], [RG.slam, DOWN, 'in'], [RG.slam + HOLD, { ...DOWN, oy: -0.045 }], [RG.slam + 0.24, HOWL, 'out'], [RG.hold, { ...HOWL, oy: -0.025 }], [RG.hold + 0.25, { oy: -0.008, hp: -0.02 }], [RG.end, {}]])(t);
    const s = track([[0, lifted(0)], [RG.raise, lifted(0.14, { gx: GRIP.x - 0.01, gz: GRIP.z + 0.02 })], [RG.slam, lifted(0), 'in'], [RG.end, lifted(0)]])(t);
    const arm = track([[0, { out: 0, f: 0 }], [RG.raise, { out: 0.35, f: 0.4 }], [RG.slam, { out: 0.2, f: 0.1 }], [RG.slam + 0.24, { out: 1.15, f: -0.25 }, 'out3'], [RG.hold, { out: 1.1, f: -0.2 }], [RG.end, { out: 0, f: 0 }]])(t);
    const sh = pulse(t, RG.slam + 0.2, RG.slam + 0.28, RG.hold - 0.15, RG.hold), w = 52 * t;
    return addPose(k, pipe(s, k), { ulr: arm.out, ulp: arm.f, flp: 0.2 * arm.out, wlp: -0.3 * arm.out },
      { nr: 0.04 * Math.sin(w) * sh, ny: 0.035 * Math.sin(w + 1.3) * sh, cr: 0.015 * Math.sin(w - 0.7) * sh },
      cloth(0.25 * bump(t, RG.slam + 0.06, 0.3), 0.3 * bump(t, RG.slam + 0.08, 0.34)));
  },
  feet: allPlanted,
};
// the enraged state, played on top of anything (spine, chest, head, arms and the pipe only): hunched lower, quick breath,
// the head low and forward. The pipe is held where it already is.
const RT = 0.5;
const rageHold = {
  dur: RT, loop: true, upperOnly: true,
  pose: (t) => { const b = Math.sin(2 * Math.PI * t / RT); return addPose({ sp: -0.03, cp: -0.06 + 0.025 * b, np: -0.12 - 0.02 * b, ulr: 0.1 + 0.02 * b, flp: 0.25 + 0.04 * b }, pipe(lifted(0))); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { sp: 0.04, cp: 0.1, cy: 0.08, np: 0.12, ny: 0.26, nr: 0.14, ulr: 0.2, flp: -0.1 }, 'out'], [0.18, { cp: -0.03, ny: -0.04, nr: -0.02, ulr: 0.03 }], [0.42, {}]])(t),
    pipe(lifted(0.012 * bump(t, 0.07, 0.14)))),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers him: driven back two long stumbling steps, the pipe lifted off the floor and tipped back, the left
// arm flung wide; he catches himself, plants the pipe and shakes his head.
const HB = -0.1;
const heavyHit = {
  dur: 1.15, contact: [0, 0.8], kinds: ['taken', 'tap'], travel: (t) => HB * EASE.out(clamp(t / 0.34)), phases: [['hit', 0], ['stagger', 0.07], ['catches himself', 0.44], ['plants the pipe', 0.72]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.02, oy: -0.01, hp: 0.2, sp: 0.08, cp: 0.12, cy: -0.16, np: 0.14, ny: -0.36, nr: -0.18 }, 'out'],
      [0.28, { oz: -0.005, oy: -0.04, hp: 0.02, cp: -0.03, cy: -0.05, np: -0.08, ny: -0.14 }],
      [0.48, { oy: -0.035, hp: -0.1, cp: -0.06, np: -0.12 }], [0.8, { oy: -0.015, hp: -0.03, np: -0.04 }], [1.15, {}]])(t);
    const s = track([[0, lifted(0)], [0.08, lifted(0.06, { el: REST_AIM.el - 0.25, gz: GRIP.z - 0.03 })], [0.4, lifted(0.04, { el: REST_AIM.el + 0.0 + 0.08 })], [0.7, lifted(0.05)], [0.8, lifted(0), 'in'], [1.15, lifted(0)]])(t);
    const fl = pulse(t, 0, 0.07, 0.3, 0.6), sh = pulse(t, 0.44, 0.52, 0.66, 0.78), w = 36 * (t - 0.44);
    return addPose(k, pipe(aboveFloor(s), k), { ulr: 0.9 * fl, ulp: -0.3 * fl, flp: 0.2 * fl, ny: 0.1 * Math.sin(w) * sh, nr: 0.1 * Math.sin(w + 1.3) * sh, cr: 0.015 * Math.sin(w - 0.6) * sh },
      cloth(0.3 * bump(t, 0.12, 0.3), -0.1 * bump(t, 0.12, 0.3)));
  },
  feet: (t) => ({ R: steps(t, REST.R, [[0.03, 0.18, off('R', 0, 0, HB), 0.035, 0.25]]), L: steps(t, REST.L, [[0.16, 0.34, off('L', 0, 0, HB), 0.032, 0.25]]) }),
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: he unfolds out of a crouch over the pipe,
// stands to his full lanky height, looks about, and taps the pipe's foot on the floor; the gather lights.
const SP = { grow: SPAWN, tap: 1.1 + STRIKE };
const spawn = {
  dur: 1.6, contact: [SP.tap], kinds: ['tap'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['unfolds', SP.grow], ['stands', 0.7], ['lifts the pipe', 0.9], ['taps', SP.tap]],
  pose: (t) => {
    const LOWP = { oy: -0.09, hp: -0.3, sp: -0.12, cp: -0.12, np: -0.25 };
    const k = track([[0, LOWP], [SP.grow, LOWP], [0.7, { oy: -0.004, hp: 0.03, cp: 0.04, np: 0.06 }], [0.9, { oy: 0.0, hp: 0.03, cp: 0.04, np: 0.04, ny: 0.2 }], [1.05, { ny: -0.1 }],
      [SP.tap, { oy: -0.012, hp: -0.03, cp: -0.03, np: -0.06 }, 'in'], [SP.tap + HOLD, { oy: -0.014, hp: -0.03, np: -0.06 }], [1.38, { oy: -0.004 }], [1.6, {}]])(t);
    const s = track([[0, lifted(0)], [0.9, lifted(0)], [1.05, lifted(0.06)], [SP.tap, lifted(0), 'in'], [1.6, lifted(0)]])(t);
    const arm = track([[0, { e: 0.5 }], [SP.grow, { e: 0.5 }], [0.7, { e: 0.1 }], [1.6, { e: 0 }]])(t);
    return addPose(k, { flp: arm.e }, pipe(s, k), cloth(0.1 * bump(t, 0.5, 0.5), 0.12 * bump(t, 0.5, 0.5)));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// His feet unlock. A jolt; he sags against the pipe, his left fist coming up to grip it above the right; his knees give and
// he slides down it to kneel, both fists round the pipe and his brow against them; the gather dims to dark glass (the page).
const D = { sag: 0.35, knees: 1.15, bow: 1.7, end: 2.6 };
const death = {
  dur: D.end, contact: [D.knees], kinds: ['thud'], phases: [['jolt', 0], ['sags on the pipe', 0.12], ['the knees give', D.sag], ['kneels', D.knees], ['the gather goes dark', D.knees + 0.15], ['still', D.bow]],
  pose: (t) => {
    const KN = { hp: -0.1, sp: -0.06, cp: -0.08, oy: -0.225, oz: -0.02, np: -0.3 };
    const k = track([[0, {}],
      [0.1, { hp: 0.12, cp: 0.1, oy: -0.01, oz: -0.02, np: 0.22, ny: -0.2, nr: -0.1 }, 'out'],
      [D.sag, { hp: -0.06, cp: -0.06, oy: -0.03, np: -0.12, ny: -0.06 }],
      [D.knees, { ...KN, oy: -0.23 }, 'in'],
      [D.knees + 0.12, { ...KN, oy: -0.225, np: -0.2 }, 'out'],
      [D.bow, { ...KN, hp: -0.14, cp: -0.14, np: -0.45, ny: -0.06, nr: -0.05 }],
      [D.end, { ...KN, hp: -0.15, cp: -0.15, np: -0.5, ny: -0.07, nr: -0.06 }]])(t);
    // the pipe stays standing, its foot where it was; the fists slide down it as he goes down
    const st = (sv, lt, el) => standing(FOOT0.x, FOOT0.z + 0.02, el, REST_AIM.az, { s: sv, lt, lw: 1 });
    const s = ptrack([[0, P()], [D.sag, st(-0.02, 0.09, REST_AIM.el - 0.06)], [D.knees, st(-0.3, -0.2, REST_AIM.el - 0.12), 'in'], [D.end, st(-0.33, -0.23, REST_AIM.el - 0.13)]])(t);
    const kn = smooth((t - D.sag) / (D.knees - D.sag));
    return addPose(k, pipe(s, k), { flp: 0.3 * kn }, cloth(0.8 * kn, 0.55 * kn));
  },
  feet: (t) => {
    const kn = smooth((t - D.sag) / (D.knees - D.sag)); const F = {};
    for (const k of LEGS) { const sx = k === 'L' ? 1 : -1; const p = REST[k].clone(); p.z += -0.3 * kn; p.x += sx * 0.006 * kn; p.y += 0.02 * kn + 0.02 * Math.sin(Math.PI * kn); F[k] = { p, pitch: 2.5 * kn, lock: t < D.sag }; }
    return F;
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), glass_bubble, glass_gout, rage, rageHold, hurt, heavyHit, spawn, death };
