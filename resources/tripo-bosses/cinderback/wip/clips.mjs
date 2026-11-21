// The Cinderback's moves. Units are model units (the model is 1 long from snout to tail tip; the page draws it 2.4 u long,
// CFG.unit, the game's scale). Timings come from the game: CINDERBACK in src/sim/bosses/cinderback.js (prowl 1.5 u/s; Magma
// Dive: 76-tick ring, under the floor for the last 46, spent 60 ticks; Tail Lash: 48-tick cone; Ember Spit: rears for 30
// ticks, gobbets in flight 60, 72 and 84 ticks) and the beats in src/render/facet/beats.js (strike 2.5 frames, held 3).
// A salamander walks with its whole body: the trunk bends in an S, the tail swings against it, and the feet step in diagonal
// pairs on legs that sprawl out to the sides.
import fs from 'fs';
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, makeRig } from '../../kit/quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_; const wf = (s) => Math.round(s * 60) / 60;
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const qAx = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const YA = V3(0, 1, 0);
export const U = 2.4;
export const CFG = {
  name: 'cinderback', unit: U, base: { oy: -0.01 },
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['jaw', 'j'], ['gillL', 'gl'], ['gillR', 'gr'], ['t1', 't1'], ['t2', 't2'], ['t3', 't3'], ['t4', 't4'], ['t5', 't5']],
  legs: {
    FL: { kind: 'limb', b: ['fUpL', 'fLoL', 'fHandL', 'fFingL'], noDrop: true, pole: [1, 0.8, -0.4] }, FR: { kind: 'limb', b: ['fUpR', 'fLoR', 'fHandR', 'fFingR'], noDrop: true, pole: [-1, 0.8, -0.4] },
    HL: { kind: 'limb', b: ['hThL', 'hShL', 'hFtL', 'hToeL'], noDrop: true, pole: [1, 0.8, 0] }, HR: { kind: 'limb', b: ['hThR', 'hShR', 'hFtR', 'hToeR'], noDrop: true, pole: [-1, 0.8, 0] },
  },
  springs: [], smoothHeel: true,
  // the tail lies on the floor where a bend would push it through: each joint's tip stays at least this high (its rest height less a little)
  floorBones: [['t1', 0.064], ['t2', 0.052], ['t3', 0.041], ['t4', 0.033], ['t5', 0.026]],
};
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const END = Object.fromEntries(LEGS.map((k) => [k, V3(...skel.ends[CFG.legs[k].b[3]])]));
export const REST = Object.fromEntries(LEGS.map((k) => [k, END[k].clone().setY(0.002)]));
const SX = { FL: 1, FR: -1, HL: 1, HR: -1 };
const plant = (p, o = {}) => ({ p: p.clone(), lock: true, ...o });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x * SX[k], y, z)); // x: outward
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.3); if (Math.abs(cur.x) > 0.15) s.pitch = 0; /* a hind foot's toes point out to the side: a heel lift about its x axis would roll it onto its edge */ s.p.y += Math.max(0, -s.pitch) * 0.01; return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const rigS = makeRig(skel, CFG);
const P0 = (n) => rigS.P0[n];
// where a foot is in the bind pose from its leg's root, in the parent's frame: a foot held there keeps the sculpted sprawl
const RLOC = Object.fromEntries(LEGS.map((k) => [k, END[k].clone().sub(P0(CFG.legs[k].b[0]))]));
const held = (B, k, dx = 0, dy = 0, dz = 0, o = {}) => ({ p: B.loc(k, [RLOC[k].x + dx * SX[k], RLOC[k].y + dy, RLOC[k].z + dz]), q: B.parQ(k), lock: false, under: true, ...o });
// a foot in the air is kept a little short of the leg's full reach, so the leg never hangs locked straight (a straight
// knee or elbow flips in one frame when it bends again)
const LEN = Object.fromEntries(LEGS.map((k) => { const b = CFG.legs[k].b; return [k, P0(b[0]).distanceTo(P0(b[1])) + P0(b[1]).distanceTo(P0(b[2])) + P0(b[2]).distanceTo(END[k])]; }));
const keepIn = (B, k, F, f = 0.72) => { const r = B.legRoot(k).add(V3(0, 0, B.tz || 0)), d = F.p.clone().sub(r), m = LEN[k] * f; if (d.length() > m) F.p = r.add(d.setLength(m)); return F; };
const mixF = (a, b, u) => ({ ...b, p: a.p.clone().lerp(b.p, u), pitch: lerp(a.pitch || 0, b.pitch || 0, u), q: (a.q || qAx(YA, 0)).clone().slerp(b.q || qAx(YA, 0), clamp(u)), lock: false, under: true });
// ---- the body's parts
const jaw = (open = 0) => ({ jp: -0.7 * open });                         // 1 = as wide as it goes
const gills = (f = 0, w = 0) => ({ gly: 0.4 * f + w, glr: 0.25 * f, gry: -0.4 * f - w, grr: -0.25 * f }); // f flares them out
// the tail: a bend per joint (yaw +: toward its left) with each joint lagging the one before, and a lift
const TAILN = 5;
const tail = (amp, w, lag = 0.7, base = 0, grow = 1.25, lift = 0) => { const o = {}; for (let k = 1; k <= TAILN; k++) { o['t' + k + 'y'] = base + amp * Math.pow(grow, k - 1) * Math.sin(w - lag * k) / TAILN * 2; o['t' + k + 'p'] = lift; } return o; };
const tailCurl = (a, lift = 0) => { const o = {}; for (let k = 1; k <= TAILN; k++) { o['t' + k + 'y'] = a * (0.62 + 0.06 * k); o['t' + k + 'p'] = lift; } return o; };
// the spine's S: the trunk bends one way at the shoulders and the other at the hips
const sBend = (a, w) => ({ by: -a * Math.sin(w), sy: 0.5 * a * Math.sin(w + 0.5), cy: a * Math.sin(w + 0.9), ny: -0.5 * a * Math.sin(w + 1.3), hy: -0.6 * a * Math.sin(w + 1.6) });
const TAU = 2 * Math.PI;

// ------------------------------------------------------------------------------------------------ idle
// 6 s. It lies low and breathes slowly (the coals breathe with it on the page). The tail sweeps a lazy S; it lifts its head
// and looks left, then right; its gills flare and settle; it tastes the air once with its mouth just open; a ripple runs down
// its back.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = TAU * t / 6, br = Math.sin(TAU * t / 2);
    const look = 0.4 * pulse(t, 0.6, 1.2, 2.0, 2.6) - 0.36 * pulse(t, 3.0, 3.6, 4.3, 4.9);
    const lift = pulse(t, 0.5, 1.0, 4.6, 5.2), taste = pulse(t, 2.15, 2.3, 2.55, 2.75), rip = pulse(t, 5.2, 5.3, 5.6, 5.9);
    return addPose(
      { oy: 0.002 * br, bp: 0.006 * br, cp: 0.01 * br + 0.02 * lift, np: 0.04 * lift - 0.02 * taste, hp: 0.06 * lift + 0.03 * taste },
      { ny: 0.35 * look, hy: 0.4 * look, cy: 0.1 * look, hr: 0.08 * look, by: -0.04 * look },
      jaw(0.22 * taste), gills(0.5 * bump(t, 1.4, 0.6) + 0.6 * bump(t, 4.1, 0.6) + 0.15 * br),
      tail(0.35, w * 2, 0.6, 0.0, 1.25, 0.01 * br),
      { sp: 0.02 * Math.sin(30 * (t - 5.2)) * rip, cp: -0.015 * Math.sin(30 * (t - 5.25)) * rip, br: 0.012 * Math.sin(TAU * t / 3) },
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// The game's prowl, 1.5 u/s. Diagonal pairs step together; the trunk bends in an S so the shoulder of a stepping foreleg
// swings forward, and the tail swings against the head.
const WT = 0.36;
const GAIT = { T: WT, duty: 0.55, v: 1.5 / U };
const GF = Object.fromEntries(LEGS.map((k) => [k, { phase: k === 'FL' || k === 'HR' ? 0 : 0.5, n: [REST[k].x, REST[k].z], lift: k[0] === 'F' ? 0.03 : 0.028, droop: k[0] === 'F' ? 0.4 : 0, push: k[0] === 'F' ? 0.15 : 0 }]));
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => { const w = TAU * t / WT;
    return addPose({ oy: -0.014 + 0.003 * Math.cos(2 * w), br: 0.03 * Math.sin(w + 0.3), np: -0.02, hp: 0.02 }, sBend(0.1, w + Math.PI / 2), tail(0.55, w + Math.PI / 2 + 1.2, 0.75), gills(0.1 * Math.sin(2 * w)));
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
export const TURN_DEG = 90; const TURN = TURN_DEG * Math.PI / 180;
const turn = (dir) => {
  const g = { T: WT, duty: 0.58, v: 0, omega: dir * TURN, pivot: [0, 0.12] };
  return {
    dur: WT, loop: true, gait: g,
    pose: (t) => { const w = TAU * t / WT;
      return addPose({ oy: -0.004 + 0.002 * Math.cos(2 * w), br: 0.02 * Math.sin(w) - 0.02 * dir, cy: 0.08 * dir, ny: 0.12 * dir, hy: 0.16 * dir, by: -0.04 * dir }, tail(0.25, w, 0.7, -0.12 * dir));
    },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.025 })])),
  };
};

// ------------------------------------------------------------------------------------------------ Magma Dive
// nose (the 30 ticks before it is under: it lowers its head, digs its snout in and slides forward and down, the tail last),
// under (46 ticks: out of sight, swimming to the ring under its target, 4 u ahead on the page), burst (on the resolve, 76
// ticks: it erupts snout first out of the floor), slam (it falls flat), spent (60 ticks: sprawled, dull, jaw slack, the
// game's punish window), and it gathers itself.
const DV = { dig: 0.2, nose: 30 / 60, burst: 76 / 60, slam: 76 / 60 + 0.22, spent: 76 / 60 + 0.25, up: 76 / 60 + 1.0 + 0.25, end: wf(76 / 60 + 1.75) };
const DIVE_D = 4.0 / U; // the page's hero stands 4 u ahead; the ring is on them
const SPRAWL = { oy: -0.008, bp: -0.02, cp: -0.03, np: -0.06, hp: -0.08, hr: 0.1, ny: 0.12, by: 0.04, cy: -0.05, ...jaw(0.3), ...gills(-0.4) };
const dive = {
  dur: DV.end, contact: [DV.burst, DV.slam], kinds: ['burst', 'slam'], sinks: true,
  phases: [['nose in', 0], ['under', DV.nose], ['burst', DV.burst - STRIKE], ['spent', DV.spent], ['gather', DV.up]],
  cues: { ring: [0, DV.burst], under: [DV.nose, DV.burst], spent: [DV.spent, DV.up], dig: [DV.dig] },
  travel: (t) => DIVE_D * smooth((t - DV.dig) / (DV.burst - DV.dig - 0.04)),
  pose: (t) => addPose(track([[0, {}],
    [DV.dig, { oy: -0.01, bp: -0.12, cp: -0.1, np: -0.2, hp: -0.2, ...gills(0.5), ...tail(0, 0, 0, 0, 1, 0.08) }],
    [DV.nose, { oy: -0.17, bp: -0.45, sp: -0.15, cp: -0.15, np: -0.2, hp: -0.15, ...gills(-0.5), ...tail(0, 0, 0, 0, 1, 0.12) }, 'in'],
    [DV.nose + 0.2, { oy: -0.36, bp: -0.3, sp: -0.05, cp: -0.05, np: -0.1, hp: 0, ...tail(0, 0, 0, 0, 1, 0.05) }],
    [DV.burst - 0.12, { oy: -0.3, bp: 0.75, sp: 0.1, cp: 0.1, np: 0.1, hp: 0.1, ...gills(-0.5) }],
    [DV.burst, { oy: 0.03, bp: 0.6, sp: 0.06, cp: 0.05, np: 0.15, hp: 0.25, ...jaw(0.8), ...gills(1), ...tail(0, 0, 0, 0, 1, -0.3) }, 'out'],
    [DV.burst + HOLD, { oy: 0.035, bp: 0.58, sp: 0.06, cp: 0.05, np: 0.16, hp: 0.26, ...jaw(0.85), ...gills(1), ...tail(0, 0, 0, 0, 1, -0.3) }],
    [DV.slam, { oy: -0.004, bp: -0.02, cp: -0.03, np: -0.12, hp: -0.1, ...jaw(0.4), ...gills(0.3), ...tail(0, 0, 0, 0, 1, 0.04) }, 'in'],
    [DV.spent, { ...SPRAWL, oy: -0.011 }],
    [DV.up - 0.1, { ...SPRAWL, oy: -0.009 }],
    [DV.up + 0.25, { oy: 0.004, bp: 0.03, np: 0.06, hp: 0.06, ...gills(0.6) }, 'io'],
    [DV.end, {}]])(t),
    // spent: shallow panting and a twitch down the tail; the tail lies limp in a curve
    { oy: 0.002 * Math.sin(TAU * 2.4 * t) * pulse(t, DV.spent, DV.spent + 0.1, DV.up - 0.1, DV.up), ...tail(0.4 * pulse(t, DV.spent, DV.spent + 0.2, DV.up, DV.up + 0.3), 0.6, 0.4, 0.1 * pulse(t, DV.spent, DV.spent + 0.2, DV.up, DV.up + 0.3)) }),
  feet: (t, B) => {
    // the feet let go as it digs in and are carried along the body, folded back; they come down sprawled wide when it slams
    const F = {};
    for (const k of LEGS) {
      const fold = held(B, k, -0.02, 0.01, k[0] === 'F' ? -0.06 : -0.08, { pitch: 0.4 });
      const wide = off(k, 0.03, 0, k[0] === 'F' ? -0.01 : 0.01).add(V3(0, 0, B.tz));
      if (t < DV.dig + 0.05) F[k] = plant(REST[k]);
      else if (t < DV.dig + 0.25) F[k] = mixF({ p: REST[k].clone(), q: qAx(YA, 0) }, fold, smooth((t - DV.dig - 0.05) / 0.2));
      else if (t < DV.burst - 0.02) F[k] = fold;
      else if (t < DV.slam + 0.06) F[k] = mixF(fold, { p: wide, q: qAx(YA, 0) }, smooth((t - DV.burst + 0.02) / (DV.slam + 0.06 - DV.burst)));
      else if (t < DV.up) F[k] = plant(wide);
      else F[k] = steps(t, wide, [[DV.up + (k === 'FL' || k === 'HR' ? 0 : 0.14), DV.up + (k === 'FL' || k === 'HR' ? 0.2 : 0.34), REST[k].clone().add(V3(0, 0, B.tz)), 0.025]]);
      if (!F[k].lock && t < DV.up) keepIn(B, k, F[k], k[0] === 'F' ? 0.72 : lerp(0.78, 1.6, smooth((t - DV.burst + 0.1) / (DV.slam - DV.burst + 0.1))));
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Tail Lash
// coil (the 48-tick cone less a strike: it plants its forefeet, swings its head round to its right to watch the hero, and
// coils its tail round to its left side), whip (2.5 frames: the tail lashes round behind it and out to its right, the hips
// swinging with it), held, recoil, settle.
const LA = { coil: 0.8 - STRIKE, hit: 0.8, held: 0.8 + HOLD, end: wf(1.7) };
const lash = {
  dur: LA.end, contact: [LA.hit], kinds: ['lash'], cues: { cone: [0, LA.hit] },
  phases: [['coil', 0], ['whip', LA.coil], ['recoil', LA.held + 0.05], ['settle', LA.held + 0.4]],
  pose: (t) => track([[0, {}],
    [0.35, { ox: -0.03, by: 0.11, sy: 0.05, cy: -0.16, ny: -0.2, hy: -0.25, br: 0.04, ...tailCurl(0.55, 0.02), ...gills(0.4) }],
    [LA.coil, { ox: -0.042, oy: -0.006, by: 0.16, sy: 0.08, cy: -0.24, ny: -0.26, hy: -0.32, br: 0.06, ...tailCurl(0.75, 0.04), ...gills(0.8), ...jaw(0.2) }, 'io'],
    [LA.hit, { ox: 0.0, oy: -0.004, by: -0.04, sy: -0.02, cy: 0.06, ny: 0.2, hy: 0.25, br: -0.06, ...tailCurl(-0.85, 0.02), ...gills(1), ...jaw(0.5) }, 'in'],
    [LA.held + 0.1, { ox: 0.045, oy: -0.004, by: -0.2, sy: -0.1, cy: 0.3, ny: 0.2, hy: 0.25, br: -0.06, ...tailCurl(-0.88, 0.02), ...gills(1), ...jaw(0.5) }],
    [LA.held + 0.3, { ox: 0.025, by: -0.1, sy: -0.05, cy: 0.15, ny: 0.1, hy: 0.12, br: -0.03, ...tailCurl(-0.4, 0.01), ...gills(0.4), ...jaw(0.1) }],
    [LA.held + 0.55, { by: 0.03, ny: -0.02, ...tailCurl(0.1, 0), ...gills(0.1) }],
    [LA.end, {}]])(t),
  feet: (t) => ({ FL: plant(REST.FL), FR: plant(REST.FR),
    // the hips swing across under the whip: the hind feet hop with them, out and back
    HL: steps(t, REST.HL, [[0.12, 0.36, REST.HL.clone().add(V3(-0.035, 0, 0)), 0.02], [LA.coil - 0.03, LA.hit + 0.06, REST.HL.clone().add(V3(0.04, 0, -0.01)), 0.025], [LA.held + 0.4, LA.held + 0.62, REST.HL, 0.02]]),
    HR: steps(t, REST.HR, [[LA.coil - 0.06, LA.hit + 0.1, REST.HR.clone().add(V3(0.08, 0, 0.01)), 0.025], [LA.held + 0.28, LA.held + 0.5, REST.HR, 0.02]]) }),
};

// ------------------------------------------------------------------------------------------------ Ember Spit
// rear (mine, 0.32 s: its forefeet lift and it rears on its hind legs, the throat swelling white-hot), spit (on the beat: the
// jaw snaps wide and the head jerks forward; the page sends three gobbets out, 60, 72 and 84 ticks in flight), it holds the
// rear for the game's 30 ticks, then drops back on its forefeet.
const SP = { rear: 0.32 - STRIKE, spit: 0.32, held: 0.32 + HOLD, drop: 0.32 + 0.5, land: 0.32 + 0.5 + 0.2, end: wf(1.6) };
const REAR = { oy: 0.014, bp: 0.42, sp: 0.06, cp: 0.04, np: -0.14, hp: -0.18 };
const spit = {
  dur: SP.end, contact: [SP.spit, SP.land], kinds: ['spit', 'land'], cues: { throat: [0, SP.spit + 0.1], fly: [SP.spit] },
  phases: [['rear', 0], ['spit', SP.rear], ['held', SP.held], ['drop', SP.drop], ['settle', SP.land + HOLD]],
  pose: (t) => track([[0, {}],
    [SP.rear - 0.05, { ...REAR, oy: 0.008, np: -0.06, hp: -0.04, ...jaw(0.15), ...gills(0.7), ...tail(0, 0, 0, 0, 1, -0.34) }, 'io'],
    [SP.rear, { ...REAR, np: -0.02, hp: 0.06, ...jaw(0.25), ...gills(0.8), ...tail(0, 0, 0, 0, 1, -0.36) }],
    [SP.spit, { ...REAR, np: -0.22, hp: -0.26, ...jaw(1), ...gills(1), ...tail(0, 0, 0, 0, 1, -0.36) }, 'out'],
    [SP.held, { ...REAR, np: -0.23, hp: -0.27, ...jaw(1), ...gills(1), ...tail(0, 0, 0, 0, 1, -0.36) }],
    [SP.drop, { ...REAR, bp: 0.36, np: -0.1, hp: -0.1, ...jaw(0.35), ...gills(0.5), ...tail(0, 0, 0, 0, 1, -0.3) }],
    [SP.land, { oy: 0.001, bp: -0.03, cp: -0.03, np: -0.04, hp: -0.04, ...jaw(0.1), ...gills(0.3) }, 'in'],
    [SP.land + HOLD, { oy: 0.0, bp: -0.03, cp: -0.03, np: -0.04, hp: -0.04, ...jaw(0.1), ...gills(0.3) }],
    [SP.land + 0.3, { oy: 0.002, np: 0.02 }],
    [SP.end, {}]])(t),
  feet: (t, B) => {
    const up = (k) => held(B, k, 0.0, 0.02, 0.02, { pitch: 0.3 });
    const F = { HL: plant(REST.HL), HR: plant(REST.HR) };
    for (const k of ['FL', 'FR']) {
      if (t < 0.04) F[k] = plant(REST[k]);
      else if (t < SP.rear) F[k] = mixF({ p: REST[k].clone(), q: qAx(YA, 0) }, up(k), smooth((t - 0.04) / (SP.rear - 0.04)));
      else if (t < SP.drop) F[k] = up(k);
      else if (t < SP.land) F[k] = mixF(up(k), { p: off(k, 0.006, 0, 0.012), q: qAx(YA, 0) }, smooth((t - SP.drop) / (SP.land - SP.drop)));
      else F[k] = steps(t, off(k, 0.006, 0, 0.012), [[SP.land + 0.25 + (k === 'FL' ? 0 : 0.1), SP.land + 0.42 + (k === 'FL' ? 0 : 0.1), REST[k], 0.02]]);
      if (!F[k].lock && t < SP.land) keepIn(B, k, F[k]);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Enrage (mine)
// The game marks its rage under 40 percent only by a faster dive. Here it lifts its chest, opens its jaws in a silent roar with
// its gills flared, lashes its tail side to side, and slaps its forefeet down.
const EN = { roar: 0.55, slap: 1.25, end: wf(1.8) };
const enrage = {
  dur: EN.end, contact: [EN.roar, EN.slap], kinds: ['roar', 'slap'], cues: { flare: [EN.roar] },
  phases: [['gather', 0], ['roar', EN.roar - 0.1], ['slap', EN.slap - 0.2], ['settle', EN.slap + HOLD]],
  pose: (t) => addPose(track([[0, {}],
    [0.35, { oy: 0.0, bp: -0.02, cp: -0.03, np: -0.12, hp: -0.1, ...gills(-0.3) }],
    [EN.roar, { oy: 0.012, bp: 0.12, sp: 0.04, cp: 0.08, np: 0.18, hp: 0.22, ...jaw(1), ...gills(1.2) }, 'out'],
    [EN.roar + 0.4, { oy: 0.012, bp: 0.12, sp: 0.04, cp: 0.08, np: 0.16, hp: 0.2, ...jaw(0.9), ...gills(1.1) }],
    [EN.slap - STRIKE, { oy: 0.008, bp: 0.1, cp: 0.06, np: 0.05, hp: 0.04, ...jaw(0.3), ...gills(0.6) }],
    [EN.slap, { oy: 0.0, bp: -0.04, cp: -0.04, np: -0.08, hp: -0.06, ...jaw(0.4), ...gills(0.8) }, 'in'],
    [EN.slap + HOLD, { oy: -0.001, bp: -0.04, cp: -0.04, np: -0.08, hp: -0.06, ...jaw(0.4), ...gills(0.8) }],
    [EN.end, {}]])(t),
    tail(0.9 * pulse(t, EN.roar - 0.1, EN.roar + 0.1, EN.slap, EN.end), TAU * 2.2 * t, 0.6),
    { hr: 0.03 * Math.sin(40 * t) * pulse(t, EN.roar, EN.roar + 0.05, EN.roar + 0.35, EN.roar + 0.45) }),
  feet: (t, B) => {
    const F = { HL: plant(REST.HL), HR: plant(REST.HR) };
    for (const k of ['FL', 'FR']) F[k] = steps(t, REST[k], [[0.42 + (k === 'FL' ? 0 : 0.03), EN.slap - (k === 'FL' ? 0.02 : 0), REST[k], 0.05, 0.2]]);
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ hurt (light) and heavy hit
const hurt = {
  dur: wf(0.42), upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { cp: 0.03, np: 0.12, hp: 0.12, ny: 0.15, hy: 0.15, hr: 0.1, ...jaw(0.3), ...gills(0.6) }, 'out'], [0.18, { np: -0.03, hp: -0.03, hy: -0.04, ...jaw(0.05) }], [0.42, {}]])(t),
  feet: allPlanted,
};
const HB = -0.25 / U;
const heavyHit = {
  dur: wf(1.1), contact: [0.0], kinds: ['taken'],
  travel: (t) => HB * EASE.out(clamp(t / 0.22)),
  pose: (t) => addPose(track([[0, {}],
    [0.06, { oz: -0.01, oy: -0.004, bp: 0.04, br: 0.04, cp: 0.04, np: 0.24, hp: 0.18, hy: -0.15, ...jaw(0.6), ...gills(1) }, 'out'],
    [0.26, { oy: -0.001, bp: -0.04, br: -0.03, np: -0.06, hp: -0.04, ...jaw(0.1), ...gills(0.2) }],
    [0.5, { oy: -0.006, bp: -0.01, np: -0.01 }],
    [1.1, {}]])(t), tail(0.5 * pulse(t, 0, 0.06, 0.3, 0.8), TAU * 3 * t, 0.7)),
  // the shove skids its feet back with it, then the forefeet resettle
  feet: (t) => Object.fromEntries(LEGS.map((k, i) => { const b = REST[k].clone().add(V3(0, 0, HB * EASE.out(clamp(t / 0.22)))); return [k, t < 0.22 ? { p: b, lock: false } : k[0] === 'F' ? steps(t, b, [[0.3 + 0.08 * i, 0.5 + 0.08 * i, b.clone().add(V3(0, 0, 0.01)), 0.02]]) : plant(b)]; })),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames. It comes up out of the floor snout first, the way it bursts from a dive,
// shakes the slag off its back and settles with a swish of its tail.
const SPW = { grow: 7 * FR_, shake: 0.7, end: wf(1.6) };
const spawn = {
  dur: SPW.end, contact: [0.28], kinds: ['land'], sinks: true, scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SPW.grow))),
  phases: [['grow', 0], ['rise', SPW.grow], ['shake', SPW.shake - 0.1], ['settle', SPW.shake + 0.4]],
  pose: (t) => addPose(track([
    [0, { oy: -0.1, bp: 0.45, cp: 0.05, np: 0.1, hp: 0.15, ...gills(-0.5), ...tail(0, 0, 0, 0, 1, -0.2) }],
    [SPW.grow, { oy: -0.08, bp: 0.45, cp: 0.05, np: 0.1, hp: 0.15, ...gills(-0.5), ...tail(0, 0, 0, 0, 1, -0.2) }],
    [0.28, { oy: -0.006, bp: -0.03, np: -0.06, hp: -0.04, ...gills(0.2) }, 'in'],
    [0.5, { oy: -0.004, np: 0.04, hp: 0.04, ...gills(0.5) }],
    [SPW.shake + 0.45, { oy: 0.0, ...jaw(0.15), ...gills(0.8) }],
    [SPW.end, {}]])(t),
    { br: 0.06 * Math.sin(42 * t) * pulse(t, SPW.shake - 0.05, SPW.shake, SPW.shake + 0.3, SPW.shake + 0.4), sr: -0.05 * Math.sin(42 * t + 0.6) * pulse(t, SPW.shake - 0.05, SPW.shake, SPW.shake + 0.3, SPW.shake + 0.4) },
    tail(0.7 * pulse(t, SPW.shake + 0.2, SPW.shake + 0.35, SPW.end - 0.3, SPW.end), TAU * 1.6 * t, 0.6)),
  feet: (t, B) => {
    const F = {};
    for (const k of LEGS) {
      const fold = held(B, k, -0.01, 0, -0.05, { pitch: 0.3 });
      F[k] = t < 0.22 ? fold : t < 0.28 ? mixF(fold, { p: REST[k].clone(), q: qAx(YA, 0) }, smooth((t - 0.22) / 0.06)) : plant(REST[k]);
      if (!F[k].lock) keepIn(B, k, F[k]);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ death (mine)
// A jolt arches its back and throws its head up with the jaws wide; it thrashes, the tail whipping; the legs give and it
// drops flat, sprawled wide; the head slumps to one side, the jaw falls slack, the tail curls round and lies still. The page
// puts the coals out one by one.
const D = { jolt: 0.12, thrash: 0.35, drop: 1.0, slump: 1.35, end: wf(2.6) };
const DEAD = { oy: -0.006, bp: -0.02, cp: -0.03, np: -0.1, hp: -0.12, ny: -0.3, hy: -0.35, hr: -0.25, by: 0.08, sy: 0.06, cy: -0.1, br: 0, ...jaw(0.45), ...gills(-0.6), ...tailCurl(0.5, 0.01) };
const death = {
  dur: D.end, contact: [D.jolt, D.drop], kinds: ['taken', 'thud'], cues: { out: [D.jolt, D.slump + 0.8] },
  phases: [['jolt', 0], ['thrash', D.thrash], ['it drops', D.drop - 0.25], ['slumps', D.slump], ['still', D.slump + 0.6]],
  pose: (t) => {
    const k = track([[0, {}],
      [D.jolt, { oy: 0.012, bp: 0.1, sp: 0.06, cp: 0.1, np: 0.25, hp: 0.3, ...jaw(1), ...gills(1.2), ...tail(0, 0, 0, 0, 1, -0.05) }, 'out'],
      [D.thrash, { oy: 0.006, bp: 0.06, cp: 0.05, np: 0.15, hp: 0.15, ...jaw(0.8), ...gills(1) }],
      [D.drop - 0.12, { oy: 0.004, bp: 0.03, np: 0.08, hp: 0.06, ...jaw(0.6), ...gills(0.6) }],
      [D.drop, { ...DEAD, oy: -0.004, ny: -0.15, hy: -0.15, hr: -0.1, ...tailCurl(0.2, 0.01) }, 'in'],
      [D.slump, { ...DEAD, oy: -0.004, ...tailCurl(0.4, 0.01) }],
      [D.slump + 0.6, DEAD, 'io'],
      [D.end, DEAD]])(t);
    const th = pulse(t, D.jolt, D.thrash, D.drop - 0.2, D.drop);
    return addPose(k, sBend(0.2 * th, TAU * 2.8 * t), tail(0.9 * th, TAU * 2.8 * t + 1, 0.7), { hr: 0.06 * Math.sin(37 * t) * th });
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => {
    // the legs give: each foot slides out to the side as the body drops on it, and stays there
    const u = smooth((t - D.drop + 0.12) / 0.3);
    const p = REST[k].clone().lerp(off(k, 0.022, 0, k[0] === 'F' ? 0.015 : -0.01), u);
    return [k, { p, lock: k[0] === 'H' ? t < D.drop - 0.12 : t < 0.04 || t > D.drop + 0.2, pitch: 0.2 * u }];
  })),
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), dive, lash, spit, enrage, hurt, heavyHit, spawn, death };
