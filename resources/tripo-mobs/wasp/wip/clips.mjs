// The Briar Wasp's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/wasp.js (buzzes at 2.7 u/s; a 42-tick Ember lane 0.6 u wide and up to
// 3.6 u long, then a dart down it at 9 u/s for at most 24 ticks; a swarm of three) and its rig
// src/render/enemies/facet/wasp.js (hover 0.9 u, bob 0.06 u at 7 rad/s, the 60 rad/s wing beat, the lean from travel,
// the three darts C1/S1/O1, C2/S2/O2, C3/S3/O3 on DART_TL, coilPose and strikePose). Its pose fields (lift, push, pitch,
// roll, twist, sx, sy, sz, curl, hook, sting, wUp, wAmp, wSweep, buzz, hold, ext) are copied key for key and mapped onto
// this rig in fly() below.
import { V3, smooth, lerp, clamp, addPose, EASE, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
const SIDES = ['L', 'R'];
const LEGN = [1, 2, 3, 4];
export const CFG = {
  name: 'wasp', unit: 0.8, base: {}, floor: false,
  chain: [['hips', 'b'], ['sq', 'q'], ['head', 'h']],
  extras: [['g0', 'g0'], ['g1', 'g1'], ['g2', 'g2'], ['gs', 'gs'], ['antL', 'aL'], ['antR', 'aR'],
    ['wfL', 'wfL'], ['wfR', 'wfR'], ['whL', 'whL'], ['whR', 'whR'],
    ...SIDES.flatMap((s) => LEGN.flatMap((i) => [[`l${i}${s}`, `l${i}${s}`], [`k${i}${s}`, `k${i}${s}`]]))],
  scales: [['sq', ['qsx', 'qsy', 'qsz']], ['gs', ['gsx', 'gsx', 'gse']]],
  legs: {},
  springs: [],
};
const U = CFG.unit;
const HOVER_Y = 0.9;
const HOV = (HOVER_Y - 0.29 * U) / U; // the hips (the thorax) ride at the game's hover height
const BEAT = 10; // wing beats a second: the game's 60 rad/s is 9.5; 10 lands on whole frames (6 a beat at 60 fps)
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const ease = { out: (k) => 1 - (1 - k) * (1 - k), in: (k) => k * k };
const settle = (k) => (k <= 0 ? 1 : k >= 1 ? 0 : (1 - k) * (1 - k) * (1 - 2.6 * k));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));

// --- the game's key poses (render/enemies/facet/wasp.js), copied
const REST = Object.freeze({ lift: 0, push: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, sz: 1, curl: 0, hook: 0, sting: 0, wUp: 0, wAmp: 1, wSweep: 0, buzz: 0, hold: 0, ext: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const C1 = K({ lift: 0.02, push: -0.06, pitch: 0.4, roll: 0.14, twist: -0.14, sx: 0.97, sy: 1.04, sz: 0.93, curl: 0.15, hook: -0.5, sting: -0.5, wUp: -0.08, wAmp: 1.35, wSweep: -0.3, buzz: 1, hold: 1, ext: 0.5 });
const S1 = K({ lift: -0.2, push: 0.1, pitch: 0.8, roll: -0.25, twist: 0.12, sx: 0.9, sy: 0.92, sz: 1.16, curl: 0.9, hook: 0.3, sting: 0, wUp: -0.12, wAmp: 0.5, wSweep: 0.85, hold: 1, ext: 0.7 });
const O1 = K({ lift: 0.03, push: 0.03, pitch: -0.3, roll: 0.1, twist: -0.06, sx: 1.04, sy: 1.05, sz: 0.95, curl: -0.15, hook: -0.12, sting: -0.05, wUp: -0.2, wAmp: 1.15, wSweep: -0.08, hold: 0.5 });
const C3 = K({ lift: 0.04, push: -0.08, pitch: 0.4, sx: 0.96, sy: 1.06, sz: 0.9, curl: 0.2, sting: -0.5, wUp: -0.12, wAmp: 1.45, wSweep: -0.36, buzz: 1, hold: 1, ext: 0.5 });
const S3 = K({ lift: -0.3, push: 0.2, pitch: 0.9, sx: 0.88, sy: 0.9, sz: 1.22, curl: 0.9, sting: -0.1, wUp: -0.15, wAmp: 0.4, wSweep: 1.0, hold: 1, ext: 0.8 });
const O3 = K({ lift: 0.05, push: 0.04, pitch: -0.4, sx: 1.06, sy: 1.06, sz: 0.94, curl: -0.2, sting: -0.06, wUp: -0.24, wAmp: 1.2, wSweep: -0.12, hold: 0.5 });
const C2 = K({ lift: -0.03, push: -0.04, pitch: 0.3, roll: -0.3, twist: 0.2, sx: 1.02, sy: 0.98, sz: 0.95, curl: 0.25, hook: 0.6, sting: -0.5, wUp: -0.04, wAmp: 1.25, wSweep: -0.2, buzz: 1, hold: 1, ext: 0.5 });
const S2 = K({ lift: -0.22, push: 0.1, pitch: 0.8, roll: 0.6, twist: -0.25, sx: 0.9, sy: 0.92, sz: 1.16, curl: 0.9, hook: -0.3, sting: 0, wUp: -0.1, wAmp: 0.55, wSweep: 0.9, hold: 1, ext: 0.7 });
const O2 = K({ lift: 0.03, push: 0.03, pitch: -0.25, roll: -0.15, twist: 0.1, sx: 1.04, sy: 1.05, sz: 0.95, curl: -0.1, hook: 0.1, sting: -0.05, wUp: -0.18, wAmp: 1.1, wSweep: -0.06, hold: 0.5 });
const DARTS = [{ coil: C1, strike: S1, over: O1 }, { coil: C2, strike: S2, over: O2 }, { coil: C3, strike: S3, over: O3 }];
const KICK = 0.12;
const TEL = 42 / 60, STRIKE = 2.5 * FR, DIVE = 24 / 60, SNAP = 2.5 * FR, SETTLE = 6 * FR, HOVER = 0.15;
const COIL = TEL - STRIKE;
const DART_SEC = COIL + STRIKE + DIVE + SNAP + SETTLE + HOVER;
const lerpF = (a, b, k) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * k; return o; };
function dartPose(v, t) {
  const D = DARTS[v];
  if (t < COIL) { const k = t / COIL; const b = 0.85 * ease.out(Math.min(1, k / 0.4)) + 0.15 * k; const o = lerpF(REST, D.coil, b); o.buzz = D.coil.buzz * Math.pow(k, 1.5); return o; }
  if (t < TEL) { const k = (t - COIL) / STRIKE; const o = lerpF(D.coil, D.strike, ease.in(k)); o.sting = D.coil.sting + (D.strike.sting + KICK - D.coil.sting) * ease.out(k); return o; }
  if (t < TEL + DIVE) { const o = { ...D.strike }; o.sting += KICK * settle(Math.min(1, (t - TEL) / (3 * FR))); return o; }
  if (t < TEL + DIVE + SNAP) return lerpF(D.strike, D.over, ease.out((t - TEL - DIVE) / SNAP));
  if (t < TEL + DIVE + SNAP + SETTLE) return lerpF(D.over, REST, 1 - settle((t - TEL - DIVE - SNAP) / SETTLE));
  return { ...REST };
}

// --- the game's pose on this rig. t drives the bob, the beat and the abdomen's pump; o: lean (the game's lean from
// travel: leanP nose down, leanR to its right), drag (the legs trail), fold (the legs tuck), look (the head, mine).
const BOB_W = TAU / 0.9; // the game's 7 rad/s, rounded to a 0.9 s bob so the loops close
const PUMP_W = TAU / 2.7; // the game's 2.3 rad/s pump
const SWAY_W = TAU / 5.4; // the game's 1.7 rad/s hook sway, slowed to close the idle loop
function wings(g, t) {
  const o = {};
  for (const [w, fore, ph0] of [['wf', 1, 0], ['wh', 0.9, 0.35]]) {
    const ph = TAU * BEAT * t + ph0;
    const flap = g.wUp + 0.5 * g.wAmp * fore * Math.sin(ph);
    const sweep = g.wSweep + 0.16 * g.wAmp * Math.cos(ph);
    o[w + 'Lr'] = flap; o[w + 'Ly'] = sweep; o[w + 'Rr'] = -flap; o[w + 'Ry'] = -sweep;
  }
  return o;
}
function legs(t, drag, fold, flail = 0) {
  const o = {};
  for (const s of SIDES) for (const i of LEGN) {
    const ph = i * 1.3 + (s === 'L' ? 0 : 2.1);
    const sw = 0.06 * Math.sin(TAU * t / 0.9 + ph) + flail * Math.sin(31 * t + ph * 2);
    o[`l${i}${s}p`] = -0.4 * drag - 0.45 * fold + sw;
    o[`l${i}${s}r`] = (s === 'L' ? 1 : -1) * (0.25 * fold + 0.5 * flail * Math.sin(23 * t + ph));
    o[`k${i}${s}p`] = -0.15 * drag + 1.1 * fold + 0.6 * sw;
  }
  return o;
}
function fly(g, t, o = {}) {
  const bob = (o.bob ?? 1) * 0.06 * (1 - 0.6 * g.hold) * Math.sin(BOB_W * t);
  const shiver = g.buzz * Math.sin(83 * t);
  const curl = g.curl + (o.pump ?? 1) * 0.06 * Math.sin(PUMP_W * t);
  const hook = g.hook + (o.pump ?? 1) * 0.05 * Math.sin(SWAY_W * t);
  const leanP = o.leanP || 0, leanR = o.leanR || 0;
  return addPose({
    oy: (o.oy ?? HOV) + (g.lift + bob + 0.01 * shiver) / U, oz: g.push / U,
    bp: -(g.pitch + leanP + 0.02 * shiver), by: g.twist, br: g.roll + leanR + 0.05 * shiver,
    qsx: g.sx - 1, qsy: g.sy - 1, qsz: g.sz - 1,
    g0p: 0.35 * curl, g1p: 0.3 * curl, g2p: 0.35 * curl, gsp: 0.15 * curl + g.sting,
    g0y: -0.45 * hook, g1y: -0.35 * hook, g2y: -0.2 * hook, gse: g.ext, gsx: -0.15 * g.ext,
    hp: 0.25 * g.pitch * 0.4 + (o.hp || 0), hy: o.look || 0,
    aLp: -0.15 * g.buzz + 0.05 * Math.sin(TAU * t / 0.9 + 1), aRp: -0.15 * g.buzz + 0.05 * Math.sin(TAU * t / 0.9 + 2.2),
  }, o.noWings ? {} : wings(g, t), legs(t, o.drag || 0, o.fold || 0, o.flail || 0));
}
const none = () => ({});

// ------------------------------------------------------------------------------------------------ idle
// 5.4 s. The game's hover: the bob, the beat and the abdomen's pump and sway. Mine on top: it looks one way, then the
// other, and flicks its antennae.
const idle = {
  dur: 5.4, loop: true,
  pose: (t) => {
    const look = 0.3 * pulse(t, 0.8, 1.2, 2.0, 2.4) - 0.3 * pulse(t, 3.0, 3.4, 4.2, 4.6);
    const fl = bump(t, 1.6, 0.25) + bump(t, 4.9, 0.25);
    return addPose(fly(REST, t, { look, drag: 0.1 }), { by: 0.25 * look, aLp: -0.3 * fl, aRp: -0.2 * fl, aLy: 0.2 * look, aRy: 0.2 * look });
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ buzz and turn
// The game's buzz: 2.7 u/s, and the lean from travel (0.16 rad nose down at full speed). The legs trail (mine).
const walk = {
  dur: 0.9, loop: true, gait: { T: 0.9, duty: 0, v: 2.7 / U },
  pose: (t) => addPose(fly(K({ wAmp: 1.1, curl: -0.05 }), t, { leanP: 0.16, drag: 0.9, pump: 0 }), { aLp: 0.15, aRp: 0.15 }),
  feet: none,
};
// The game turns it at once; mine: 240 degrees a second, banked a little into the turn, the abdomen swinging wide.
const turn = (dir) => ({
  dur: 0.9, loop: true, gait: { T: 0.9, duty: 0, v: 0, omega: dir * TAU / 1.5, pivot: [0, 0.15] },
  pose: (t) => addPose(fly(K({ twist: 0.12 * dir, roll: -0.12 * dir, hook: -0.3 * dir, wAmp: 1.15 }), t, { look: 0.2 * dir, drag: 0.2, pump: 0 }), {}),
  feet: none,
});

// ------------------------------------------------------------------------------------------------ the dart
// The game's dart key for key: coil on the 42-tick lane, strike in its last 2.5 frames, the stab held down the lane
// for the 24-tick dart at 9 u/s, pull up in 2.5 frames, settle in 6. The contacts: the release, then the hero (2.6 u
// down the lane, the game's orbit, so it is struck once the body is within its 0.3 u reach plus his).
const HERO = 2.6, REACH = 0.3 + 0.3;
const HIT = TEL + (HERO - REACH) / 9;
const dartTravel = (t) => 9 * clamp(t - TEL, 0, DIVE) / U;
const dart = {
  dur: DART_SEC, contact: [TEL, HIT],
  phases: [['coil (the lane)', 0], ['strike', COIL], ['dive: the stab down the lane', TEL], ['pull up', TEL + DIVE], ['settle', TEL + DIVE + SNAP], ['hover', TEL + DIVE + SNAP + SETTLE]],
  travel: dartTravel,
  pose: (t) => { const g = dartPose(0, t); const d = t > TEL && t < TEL + DIVE; return fly(g, t, { drag: d ? 0.4 : 0.1, fold: d ? 0.8 : 0.3 * g.buzz }); },
  feet: none,
};
// Three darts in turn, each cut 0.1 s into its hover tail (the game's string): hook from its right, corkscrew from
// its left, the plunge.
const GAP = DART_SEC - 0.1;
const string = {
  dur: 2 * GAP + DART_SEC, contact: [0, 1, 2].flatMap((n) => [n * GAP + TEL, n * GAP + HIT]),
  phases: [0, 1, 2].flatMap((n) => [[`dart ${n + 1}: coil`, n * GAP], [`dart ${n + 1}: ${['hook from its right', 'corkscrew from its left', 'plunge'][n]}`, n * GAP + COIL], [`dart ${n + 1}: pull up`, n * GAP + TEL + DIVE]]),
  travel: (t) => [0, 1, 2].reduce((a, n) => a + dartTravel(t - n * GAP), 0),
  pose: (t) => { const n = t < GAP ? 0 : t < 2 * GAP ? 1 : 2; const tt = t - n * GAP; const g = dartPose(n, tt); const d = tt > TEL && tt < TEL + DIVE; return fly(g, t, { drag: d ? 0.4 : 0.1, fold: d ? 0.8 : 0.3 * g.buzz }); },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ hurt
// Plays on top. The game's hit reaction squashes, flinches and knocks it back; here the body jolts back and up, the
// abdomen flicks, the wings stutter back and the legs flail.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => {
    const k = track([[0, { p: 0, l: 0, c: 0, w: 0 }], [0.05, { p: -0.3, l: 0.04, c: -0.35, w: 0.5 }, 'out'], [0.17, { p: 0.08, l: -0.01, c: 0.1, w: -0.1 }], [0.4, { p: 0, l: 0, c: 0, w: 0 }]])(t);
    const o = { oy: HOV + k.l / U, oz: -0.4 * k.l / U, bp: -k.p, br: 0.3 * k.p, hp: -0.5 * k.p, g0p: k.c, g1p: 0.6 * k.c, gsp: 0.4 * k.c, qsx: 0.1 * k.w * 0.3, qsy: -0.1 * k.w * 0.3 };
    for (const s of SIDES) for (const w of ['wf', 'wh']) o[`${w}${s}y`] = (s === 'L' ? 1 : -1) * k.w;
    return addPose(o, legs(0, 0, 0, 0.25 * pulse(t, 0, 0.04, 0.15, 0.35)));
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows in over 7 frames, about 10% over (from the floor, as the game's spawn node). Mine on top:
// the wings flare, it shakes and settles into the hover.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.2, contact: [],
  scale: spawnScale,
  phases: [['grow in', 0], ['wings flare', 7 * FR], ['shake', 0.55], ['hover', 0.9]],
  pose: (t) => {
    const fl = pulse(t, 0.15, 0.35, 0.55, 0.85), sh = pulse(t, 0.55, 0.6, 0.8, 0.9);
    const g = K({ wUp: 0.3 * fl, wAmp: 1 + 0.4 * fl, lift: 0.08 * fl, curl: -0.2 * fl, sting: -0.2 * fl, buzz: sh });
    return addPose(fly(g, t, { fold: 0.2 * fl }), { by: 0.1 * Math.sin(40 * t) * sh });
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). The beat stops, it drops out of the hover with the wings swept back,
// tumbles onto its right side, bounces once and lies with its legs curled; the abdomen and stinger twitch twice.
const DROP = 0.42; // 0.9 u down under gravity takes 0.43 s
const LIE = 0.176 - 0.29; // the hips lying on its side (offset from their rest height; measured so the lowest point rests on the floor)
const death = {
  dur: 2.2, contact: [DROP],
  phases: [['hit', 0], ['falls', 0.08], ['lands', DROP], ['lies still', 0.9]],
  pose: (t) => {
    const k = c01((t - 0.06) / (DROP - 0.06));
    const fall = HOV + 0.02 / U - (HOV - LIE + 0.02 / U) * k * k;
    const land = t > DROP - 0.04 && t < DROP + 0.12 ? 0.022 * Math.sin(Math.PI * (t - DROP + 0.04) / 0.16) : 0; // the half-rolled legs touch first
    const bnc = land + (t > DROP ? 0.05 * Math.max(0, Math.sin(Math.PI * (t - DROP) / 0.18)) * (t < DROP + 0.18 ? 1 : 0) : 0);
    const roll = 1.55 * smooth((t - 0.05) / (DROP + 0.1)) + 0.12 * bump(t, DROP + 0.1, 0.2);
    const tw = bump(t, 1.05, 0.12) + 0.6 * bump(t, 1.45, 0.12);
    const cr = smooth((t - 0.2) / 0.6);
    const beat = 1 - smooth(t / 0.18);
    const g = K({ wAmp: beat, wSweep: 0.7 * smooth(t / 0.3), wUp: 0.4 * smooth(t / 0.3), curl: 0.35 * cr + 0.25 * tw, sting: 0.2 * tw });
    return addPose(fly(g, t, { oy: fall + bnc, bob: 0, pump: 0, fold: 0.9 * cr, flail: 0.3 * pulse(t, 0, 0.1, 0.3, 0.7) }),
      { br: roll, bp: 0.25 * k - 0.25 * cr * 0.4, by: 0.4 * k, hp: 0.3 * cr, aLp: 0.4 * cr, aRp: 0.5 * cr });
  },
  feet: none,
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), dart, string, hurt, spawn, death };
