// The Hourwarden's moves. Units are model units (the model is 1 tall; the page draws it 2.4 u tall, CFG.unit, the game's scale).
// Timings come from the game: HOURWARDEN in src/sim/bosses/hourwarden.js (glides at 1.45 u/s; Pendulum: 54-tick lane, the
// back-swing 30 ticks later; Hand Sweep: 40-tick cone; Toll of the Hours: weights land 60 ticks after the toll and 14 ticks
// apart, three hours; Run-down: 70 ticks after the last weight) and the poses of buildHourwarden in src/render/boss/spire.js
// (the pendulum pulled far back before a Pendulum and flung across on the back-swing; the arms raised wide for the Hand Sweep;
// a strike for the Toll; run down it slumps forward, the head droops and the pendulum stops). Beats: strike 2.5 frames, held 3.
// It glides on its gear bed: nothing is planted. The clock hand is turned by the page (it ticks, jumps an hour per toll, spins
// when enraged and stops when run down), so it has no keys here.
import fs from 'fs';
import * as THREE from 'three';
import { track, V3, smooth, lerp, clamp, EASE } from '../../kit/quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_;
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const qAx = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const XA = V3(1, 0, 0), YA = V3(0, 1, 0), ZA = V3(0, 0, 1);
const qPYR = (p = 0, y = 0, r = 0) => qAx(YA, y).multiply(qAx(XA, -p)).multiply(qAx(ZA, r));
const UNIT = 2.4;
const J = Object.fromEntries(skel.names.map((n, i) => [n, V3(...skel.pos[i])]));
const SG = { L: 1, R: -1 };

// ---- the arms. ?p swings the arm forward from the shoulder, ?r raises it out to its side, ?y turns it; ?e bends the elbow
// (+ folds the forearm up), ?ey turns the forearm in; ?w tips the fist (+ up). 0 is the pose as sent. The right is the left mirrored.
const shQ = (s) => (p) => qPYR(p[s + 'p'] || 0, (p[s + 'y'] || 0) * SG[s], (p[s + 'r'] || 0) * SG[s]);
const elQ = (s) => (p) => qPYR(p[s + 'e'] || 0, (p[s + 'ey'] || 0) * SG[s], 0);
const wrQ = (s) => (p) => qPYR(p[s + 'w'] || 0, 0, 0);

export const CFG = {
  name: 'hourwarden', unit: UNIT, floor: false,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['pend', (p) => qAx(ZA, p.pd || 0)], ['hand', () => new THREE.Quaternion()],
    ...['L', 'R'].flatMap((s) => [['sh' + s, shQ(s)], ['el' + s, elQ(s)], ['wr' + s, wrQ(s)]])],
  // the chains and weights hang from the fists and swing a beat behind them; they lie on the floor rather than go through it
  hang: [['chL', 0.92, 0.02], ['chR', 0.92, 0.02]],
  slides: [], scales: [], legs: {},
  springs: ['chL', 'chR'].map((b) => ({ bone: b, k: 70, c: 5, max: 0.75, rate: 0.22, floor: 0.02 })),
};

// ---- one pose key. ox, oy, oz move it; bp (+ tips it back), by, br: the whole tower on its bed; sp, sy, cp, cy, cr: the
// lower and upper case (+p leans back); np, hp, hy, hr: neck and head (+hp looks up); pd: the pendulum (+ swings to its left).
const K = (o) => ({ ox: 0, oy: 0, oz: 0, bp: 0, by: 0, br: 0, sp: 0, sy: 0, cp: 0, cy: 0, cr: 0, np: 0, hp: 0, hy: 0, hr: 0, pd: 0,
  Lp: 0, Lr: 0, Ly: 0, Le: 0, Ley: 0, Lw: 0, Rp: 0, Rr: 0, Ry: 0, Re: 0, Rey: 0, Rw: 0, ...o });
function P(k) {
  const o = { ox: k.ox, oy: k.oy, oz: k.oz, bp: k.bp, by: k.by, br: k.br, sp: k.sp, sy: k.sy, cp: k.cp, cy: k.cy, cr: k.cr, np: k.np, hp: k.hp, hy: k.hy, hr: k.hr, pd: k.pd };
  for (const s of ['L', 'R']) for (const c of ['p', 'r', 'y', 'e', 'ey', 'w']) o[s + c] = k[s + c];
  // tipping on its bed: it turns about the edge of the bed that stays on the floor, not about its middle
  if (k.bp) { const pz = k.bp > 0 ? -0.157 : 0.157, piv = V3(0, 0.035, pz), H = J.hips; const q = qPYR(k.bp, 0, 0);
    const moved = H.clone().add(piv.clone().sub(H).applyQuaternion(q)); const d = piv.clone().sub(moved); o.oy += d.y; o.oz += d.z; }
  return o;
}
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const S1 = (t, T, ph = 0) => Math.sin(2 * Math.PI * (t / T + ph));
const pref = (o, s) => Object.fromEntries(Object.entries(o).map(([k, v]) => [s + k, v]));
const both = (o) => ({ ...pref(o, 'L'), ...pref(o, 'R') });
const half = (o, f = 0.5) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v * f]));

// ---- an arm pose that puts the fist on a point (in the chest's own frame, which is the rest frame): a small search
function fistAt(s, k) {
  const sg = SG[s], m = V3(sg, 1, 1); const SH = J['sh' + s], EL = J['el' + s], WR = J['wr' + s], E = V3(...skel.ends['wr' + s]);
  const Qs = qPYR(k.p, k.y * sg, k.r * sg), Qe = Qs.clone().multiply(qPYR(k.e, k.ey * sg, 0)), Qw = Qe.clone().multiply(qPYR(k.w, 0, 0));
  const el = SH.clone().add(EL.clone().sub(SH).applyQuaternion(Qs)); const wr = el.clone().add(WR.clone().sub(EL).applyQuaternion(Qe));
  return { el, wr, fist: wr.clone().add(E.clone().sub(WR).multiplyScalar(0.55).applyQuaternion(Qw)) };
}
function solveFist(s, target, start, reg = 0.002) {
  const keys = ['p', 'r', 'y', 'e', 'ey']; let k = { p: 0, r: 0, y: 0, e: 0, ey: 0, w: 0, ...start };
  const cost = (c) => fistAt(s, c).fist.distanceTo(target) ** 2 + reg * keys.reduce((a, q) => a + ((c[q] - (start[q] || 0)) ** 2) * 0.01, 0);
  let step = 0.3, best = cost(k);
  for (let it = 0; it < 4000 && step > 1e-4; it++) {
    let moved = false;
    for (const q of keys) for (const d of [step, -step]) { const c = { ...k, [q]: k[q] + d }; if (c.e < -0.55 || c.e > 2.4) continue; const v = cost(c); if (v < best) { best = v; k = c; moved = true; } }
    if (!moved) step *= 0.6;
  }
  const out = {}; for (const q of ['p', 'r', 'y', 'e', 'ey', 'w']) out[s + q] = +k[q].toFixed(3);
  console.error('  fist', s, target.toArray().map((v) => +v.toFixed(3)), 'miss mm', +(fistAt(s, k).fist.distanceTo(target) * UNIT * 1000).toFixed(1), JSON.stringify(out));
  return out;
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. The pendulum swings in its window, one beat a second; the clock hand ticks (the page). It stands on its gears, the
// case settling on the beat; the weights sway; it looks left, then right; it flexes its fists and the chains jingle.
const IT = 6;
const swingP = (t) => 0.12 * Math.sin(Math.PI * t);
const idleK = (t) => { const look = 0.32 * pulse(t, 0.9, 1.5, 2.3, 2.9) - 0.3 * pulse(t, 3.4, 4.0, 4.7, 5.3);
  return K({ pd: swingP(t), sp: 0.006 * S1(t, 2, 0.1), cp: 0.008 * S1(t, 3, 0.2), cr: 0.01 * S1(t, IT, 0.3),
    np: 0.01 * S1(t, IT, 0.5), hp: 0.03 * S1(t, IT, 0.6), hy: look, cy: 0.12 * look, hr: 0.03 * look,
    Lp: 0.03 * S1(t, IT, 0.1), Rp: 0.03 * S1(t, IT, 0.6), Lw: 0.12 * bump(t, 2.0, 0.6), Rw: 0.12 * bump(t, 5.4, 0.6),
    Le: 0.05 * bump(t, 2.0, 0.6), Re: 0.05 * bump(t, 5.4, 0.6) }); };
const idle = { dur: IT, loop: true, pose: (t) => P(idleK(t)), feet: () => ({}) };

// ------------------------------------------------------------------------------------------------ glide, turn
// It glides at the game's 1.45 u/s on its gears, leaning into it a little; the arms swing a little, the weights trail.
const GT = 2.0; const VEL = 1.45 / UNIT;
const walkK = (t) => K({ pd: swingP(t), sp: -0.02, cp: -0.03 + 0.008 * S1(t, GT / 2), np: 0.02, hp: 0.04, cr: 0.015 * S1(t, GT), sy: 0.015 * S1(t, GT, 0.25),
  Lp: 0.12 * S1(t, GT), Rp: -0.12 * S1(t, GT), Le: 0.06, Re: 0.06 });
const walk = { dur: GT, loop: true, travel: (t) => VEL * t, pose: (t) => P(walkK(t)), feet: () => ({}) };
// the game turns it to face its target at once; here it turns 90 degrees a second, the head first, the weights swinging out
export const TURN_DEG = 90;
const TT = 1.0;
const turn = (dir) => ({ dur: TT, loop: true, pose: (t) => P(K({ pd: 0.06 * Math.sin(2 * Math.PI * t), sy: 0.03 * dir, cy: 0.04 * dir, hy: 0.14 * dir, cr: -0.02 * dir,
  Lr: 0.06 * (dir > 0 ? 0 : 1), Rr: 0.06 * (dir > 0 ? 1 : 0) })), feet: () => ({}) });

// ------------------------------------------------------------------------------------------------ Pendulum
// pull (the 54-tick lane less one strike: it plants, leans back, spreads its arms, and the pendulum is drawn far over to its
// left, out of sight inside the case), the swing (2.5 frames on the hit: the pendulum is flung across and the page throws its
// swing down the lane; it lurches forward), held, then the back-swing 30 ticks later (the pendulum flung back, it rocks back
// again), and it settles while the pendulum finds its beat.
const PT = { hit: 54 / 60 }; PT.pull = PT.hit - STRIKE; PT.held = PT.hit + HOLD; PT.back = PT.hit + 30 / 60; PT.bpull = PT.back - STRIKE; PT.end = PT.back + 0.9;
const pendulum = {
  dur: PT.end, contact: [PT.hit, PT.back], kinds: ['lance', 'lance'], cues: { lane: [0, PT.back] },
  phases: [['pull', 0], ['swing', PT.pull], ['held', PT.hit], ['back-swing', PT.held + 0.15], ['settle', PT.back + HOLD]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.3, K({ pd: 0.2, sp: 0.01, cp: 0.03, hp: 0.06, ...both({ r: 0.12, p: -0.06 }) })],
    [PT.pull, K({ pd: 0.55, sp: 0.025, cp: 0.06, np: 0.03, hp: 0.1, cr: 0.02, ...both({ r: 0.3, p: -0.2, e: 0.15 }) })],
    [PT.hit, K({ pd: -0.55, sp: -0.03, cp: -0.08, np: -0.04, hp: -0.1, cr: -0.03, ...both({ r: 0.18, p: 0.3, e: 0.05 }) }), 'snap'],
    [PT.held, K({ pd: -0.56, sp: -0.032, cp: -0.085, np: -0.045, hp: -0.11, cr: -0.032, ...both({ r: 0.18, p: 0.32, e: 0.05 }) })],
    [PT.bpull, K({ pd: -0.4, sp: -0.005, cp: -0.01, hp: 0.0, ...both({ r: 0.22, p: 0.0, e: 0.1 }) })],
    [PT.back, K({ pd: 0.5, sp: 0.03, cp: 0.07, np: 0.03, hp: 0.1, cr: 0.03, ...both({ r: 0.2, p: -0.22, e: 0.1 }) }), 'snap'],
    [PT.back + HOLD, K({ pd: 0.5, sp: 0.03, cp: 0.072, np: 0.03, hp: 0.1, cr: 0.03, ...both({ r: 0.2, p: -0.23, e: 0.1 }) })],
    [PT.back + 0.4, K({ pd: -0.15, sp: -0.005, cp: -0.01, hp: -0.01, ...both({ r: 0.05, p: 0.05 }) })],
    [PT.end, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ Hand Sweep
// wind (the 40-tick cone less one strike: both arms swing wide and back, the weights swinging up behind them), the sweep (2.5
// frames on the hit: both arms scythe forward across the cone and the weights whip round in front), held, and it swings back.
const SW = { hit: 40 / 60 }; SW.wind = SW.hit - STRIKE; SW.held = SW.hit + HOLD; SW.end = SW.held + 0.85;
const WIDE = both({ p: -0.55, r: 1.05, y: -0.3, e: 0.25, w: -0.1 });
const ACROSS = both({ p: 1.15, r: 0.32, y: 0.4, e: 0.35, w: 0.1 });
const sweep = {
  dur: SW.end, contact: [SW.hit], kinds: ['sweep'], cues: { cone: [0, SW.hit] },
  phases: [['wind', 0], ['sweep', SW.wind], ['held', SW.hit], ['swing back', SW.held + 0.1]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.25, K({ pd: 0.05, sp: 0.01, cp: 0.03, hp: 0.06, ...half(WIDE, 0.6) })],
    [SW.wind, K({ pd: 0.0, sp: 0.02, cp: 0.05, np: 0.02, hp: 0.08, ...WIDE })],
    [SW.hit, K({ pd: -0.08, sp: -0.025, cp: -0.07, np: -0.03, hp: -0.06, ...ACROSS }), 'snap'],
    [SW.held, K({ pd: -0.09, sp: -0.026, cp: -0.072, np: -0.03, hp: -0.06, ...ACROSS, Lp: 1.18, Rp: 1.18 })],
    [SW.held + 0.3, K({ pd: 0.04, sp: -0.005, cp: -0.02, ...half(ACROSS, 0.35) })],
    [SW.end, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ Toll of the Hours
// It tolls the hours on its own clock face: it raises its right fist (the rings appear round it while the first weight falls),
// then hammers the dial once for each hour, on the beat each weight lands, 14 ticks apart (the page jumps the clock hand an hour
// each time). After the last weight lands it is RUN DOWN for the game's 70 ticks: it slumps forward, the head droops, the arms
// hang and the pendulum stops (the page dims the dial and the eyes). Then it winds itself back up.
const TO = { land: 60 / 60, step: 14 / 60, hours: 3 }; TO.last = TO.land + (TO.hours - 1) * TO.step; TO.wake = TO.last + 70 / 60; TO.end = TO.wake + 0.7;
const DIALHIT = V3(-0.16, 0.665, 0.18), DIALUP = V3(-0.26, 0.72, 0.15);
const RHIT = solveFist('R', DIALHIT, { p: 1.0, r: 0.0, y: 0.0, e: 0.8 });
const RUP = solveFist('R', DIALUP, { p: 0.8, r: 0.6, y: 0.0, e: 1.0 });
const ROFF = solveFist('R', V3(-0.2, 0.6, 0.19), { p: 1.0, r: 0.1, y: 0.0, e: 0.3 }); // drawn back off the dial, out to its side
const strikeKeys = [];
for (let i = 0; i < TO.hours; i++) {
  const h = TO.land + i * TO.step;
  if (i > 0) strikeKeys.push([h - STRIKE - 0.06, K({ pd: 0, cp: 0.03, hp: 0.04, cy: -0.06, ...half(RUP, 0.55), ...half(RHIT, 0.45), Rw: 0.2, Lr: 0.12 })]);
  strikeKeys.push([h, K({ pd: 0, cp: -0.02, np: -0.02, hp: -0.06, cy: -0.1, ...RHIT, Rw: -0.1, Lr: 0.12, Lp: 0.08 }), 'snap']);
  strikeKeys.push([h + HOLD, K({ pd: 0, cp: -0.022, np: -0.02, hp: -0.065, cy: -0.1, ...RHIT, Rw: -0.12, Lr: 0.12, Lp: 0.08 })]);
}
const SLUMP = K({ pd: 0, sp: -0.03, cp: -0.1, np: -0.12, hp: -0.38, cr: 0.03, ...both({ p: 0.12, r: -0.04, e: -0.08, w: -0.2 }) });
const toll = {
  dur: TO.end, contact: Array.from({ length: TO.hours }, (_, i) => TO.land + i * TO.step).concat([TO.wake]), kinds: [...Array(TO.hours).fill('toll'), 'wind'],
  cues: { rings: [0, TO.land, TO.step, TO.hours], rundown: [TO.last + HOLD, TO.wake] },
  phases: [['raise', 0], ['the hours', TO.land - STRIKE], ['run down', TO.last + HOLD], ['wind up', TO.wake]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.35, K({ pd: 0.05, cp: 0.03, hp: 0.06, cy: -0.04, ...half(RUP, 0.6), Lr: 0.08 })],
    [TO.land - STRIKE - 0.12, K({ pd: 0, cp: 0.05, np: 0.02, hp: 0.1, cy: -0.08, ...RUP, Rw: 0.3, Lr: 0.12 })],
    ...strikeKeys,
    [TO.last + 0.16, K({ pd: 0, sp: -0.01, cp: -0.035, np: -0.03, hp: -0.12, ...ROFF, Lp: 0.07, Lw: -0.05 })],
    [TO.last + 0.36, K({ pd: 0, sp: -0.015, cp: -0.05, np: -0.05, hp: -0.18, ...half(ROFF, 0.3), Lp: 0.06, Lw: -0.1 })],
    [TO.last + 0.55, SLUMP],
    [TO.wake - 0.1, K({ ...SLUMP, cp: -0.105, hp: -0.4 })],
    [TO.wake + 0.15, K({ pd: -0.06, sp: 0.01, cp: 0.04, np: 0.04, hp: 0.12, cr: -0.03, ...both({ r: 0.1, p: -0.05, e: 0.1 }) })],
    [TO.wake + 0.4, K({ pd: 0.08, sp: 0.0, cp: -0.01, hp: -0.02, cr: 0.015 })],
    [TO.end, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ enrage (mine)
// Under 40 % the game makes it faster with more hours; it has no pose for it. It shudders, the pendulum swinging wild, throws
// both arms up and out with its head back (the page spins the clock hand and flares the eyes), then slams both fists down.
const EN = { up: 0.6, slam: 1.3, end: 1.8 };
const UP = both({ p: 0.5, r: 1.25, y: -0.2, e: 0.5, w: 0.2 });
const enrage = {
  dur: EN.end, contact: [EN.up, EN.slam], kinds: ['roar', 'slam'], cues: { flare: [EN.up] },
  phases: [['shudder', 0], ['arms up', EN.up - 0.15], ['slam', EN.slam - STRIKE], ['settle', EN.slam + 0.2]],
  pose: (t) => P(addShake(track([[0, idleK(0)],
    [0.35, K({ pd: -0.4, sp: -0.02, cp: -0.05, hp: -0.1, ...both({ p: 0.15, r: 0.1, e: 0.3 }) })],
    [EN.up, K({ pd: 0.5, sp: 0.03, cp: 0.08, np: 0.06, hp: 0.25, ...UP }), 'out'],
    [EN.up + 0.4, K({ pd: -0.45, sp: 0.03, cp: 0.08, np: 0.06, hp: 0.22, ...UP, Lr: 1.3, Rr: 1.3 })],
    [EN.slam - STRIKE - 0.1, K({ pd: 0.3, sp: 0.03, cp: 0.07, hp: 0.12, ...both({ p: 1.1, r: 0.4, e: 1.0, w: 0.3 }) })],
    [EN.slam, K({ pd: -0.2, sp: -0.03, cp: -0.09, np: -0.04, hp: -0.1, ...both({ p: 0.75, r: 0.2, e: 0.0, w: -0.2 }) }), 'snap'],
    [EN.slam + HOLD, K({ pd: -0.2, sp: -0.032, cp: -0.092, np: -0.04, hp: -0.1, ...both({ p: 0.76, r: 0.2, e: 0.0, w: -0.2 }) })],
    [EN.end, idleK(0)]]), t)),
  feet: () => ({}),
};
function addShake(tr, t) { const o = tr(t); const f = pulse(t, 0.05, 0.15, 0.45, 0.6); o.cr = (o.cr || 0) + 0.025 * Math.sin(70 * t) * f; o.hr = (o.hr || 0) + 0.04 * Math.sin(70 * t + 1) * f; return o; }

// ------------------------------------------------------------------------------------------------ hurt, heavy hit
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => { const f = pulse(t, 0, 0.05, 0.13, 0.42), g = pulse(t, 0.12, 0.2, 0.26, 0.42);
    return { cp: 0.06 * f - 0.02 * g, np: 0.05 * f, hp: 0.12 * f - 0.04 * g, hy: 0.1 * f, hr: 0.1 * f - 0.03 * g, cr: 0.03 * f }; },
  feet: () => ({}),
};
// It is pushed back 0.25 u: it rocks back on the rear edge of its bed, the arms and weights flung forward, then rocks down onto
// the front edge and settles.
const HB = -0.25 / UNIT;
const heavyHit = {
  dur: 1.1, contact: [0, 0.48], kinds: ['taken', 'thud'], travel: (t) => HB * EASE.out(clamp(t / 0.3)), phases: [['hit', 0], ['rocks back', 0.07], ['rocks down', 0.36], ['settle', 0.6]],
  pose: (t) => P(track([[0, idleK(0)],
    [0.08, K({ bp: 0.07, cp: 0.04, np: 0.04, hp: 0.12, ...both({ p: 0.35, r: 0.15, e: 0.2 }) }), 'snap'],
    [0.26, K({ bp: 0.09, cp: 0.03, np: 0.02, hp: 0.06, ...both({ p: 0.25, r: 0.12, e: 0.1 }) })],
    [0.48, K({ bp: -0.025, cp: -0.03, hp: -0.06, ...both({ p: -0.1, r: 0.05 }) }), 'in'],
    [0.7, K({ bp: 0.01, cp: 0.01, hp: 0.02 })],
    [1.1, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ spawn
// It is seen coming out of the floor: it grows in the spawn-in's seven frames, the cap first, and rises up through the floor
// on its gears; it lands, the pendulum gives its first swing (the page lights the eyes and the dial), the head lifts.
const GROW = 7 / 60; const SPW = { up: 0.55, end: 1.6 };
const spawn = {
  dur: SPW.end, sinks: true, contact: [SPW.up], kinds: ['land'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / GROW))),
  phases: [['grow', 0], ['rise', GROW], ['lands', SPW.up], ['wakes', 0.8]],
  pose: (t) => P(track([[0, K({ oy: -0.42, cp: -0.06, hp: -0.3, ...both({ p: 0.1, r: -0.05 }) })],
    [GROW, K({ oy: -0.4, cp: -0.06, hp: -0.3, ...both({ p: 0.1, r: -0.05 }) })],
    [SPW.up, K({ oy: 0, cp: -0.05, np: -0.04, hp: -0.28, ...both({ p: 0.08, r: -0.03 }) }), 'in'],
    [0.8, K({ pd: -0.2, cp: -0.04, np: -0.03, hp: -0.2, ...both({ p: 0.05 }) })],
    [1.15, K({ pd: 0.15, cp: 0.02, np: 0.02, hp: 0.06, ...both({ r: 0.05 }) })],
    [SPW.end, idleK(0)]])(t)),
  feet: () => ({}),
};

// ------------------------------------------------------------------------------------------------ death (mine)
// The clock runs down for good: a jolt throws the head back, then it sags, the arms dropping and the pendulum slowing to a stop
// (the page spins the hand backward and lets the dial and eyes go dark). It tips back off the front of its bed, falls flat on
// its back with the dial to the sky, bounces once, and lies still with its arms out and the weights on the floor.
const DT = { jolt: 0.1, sag: 0.5, tip: 0.95, thud: 1.4, still: 1.9, end: 2.6 };
const FALL = 1.6;
const deadK = K({ bp: FALL, sp: 0.02, cp: 0.03, np: -0.05, hp: -0.15, hy: 0.3, hr: 0.2, ...both({ p: -0.4, r: 0.65, e: -0.05, w: 0.1 }) });
const death = {
  dur: DT.end, contact: [DT.jolt, DT.thud], kinds: ['taken', 'thud'], cues: { out: [DT.jolt, DT.still] },
  phases: [['jolt', 0], ['runs down', 0.3], ['tips', DT.tip], ['falls', DT.tip + 0.2], ['still', DT.still]],
  pose: (t) => P(track([[0, idleK(0)],
    [DT.jolt, K({ pd: 0.2, cp: 0.05, np: 0.06, hp: 0.25, hr: 0.06, ...both({ p: 0.2, r: 0.25, e: 0.2 }) }), 'snap'],
    [DT.sag, K({ pd: -0.15, sp: -0.02, cp: -0.06, np: -0.08, hp: -0.3, ...both({ p: 0.1, r: -0.02, e: -0.08, w: -0.2 }) })],
    [DT.tip, K({ pd: 0.05, sp: -0.025, cp: -0.08, np: -0.1, hp: -0.36, ...both({ p: 0.12, e: -0.08, w: -0.2 }) })],
    [DT.tip + 0.2, K({ bp: 0.12, sp: 0, cp: -0.02, np: -0.05, hp: -0.2, ...both({ p: 0.15, r: 0.1 }) })],
    [DT.thud, K({ ...deadK, hp: -0.05, ...both({ p: -0.3, r: 0.5, e: 0.0, w: 0.1 }) }), 'in'],
    [DT.thud + 0.12, K({ ...deadK, bp: FALL - 0.08, hp: -0.1, ...both({ p: -0.2, r: 0.55 }) })],
    [DT.still, deadK],
    [DT.end, deadK]])(t)),
  feet: () => ({}),
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), pendulum, sweep, toll, enrage, hurt, heavyHit, spawn, death };
