// The Quillback's moves. Units are model units (the model is 1 long; the page draws it CFG.unit times bigger).
// Timings come from the game: ENEMY_STATS quillback in src/sim/enemies/quillback.js (walks 1.5 u/s; a 48-tick lane
// telegraph, then rolls at 6.0 u/s for up to 60 ticks; a wall ends it in a 30-tick stagger; one charge per 240 ticks)
// and the rig's charge in src/render/enemies/facet/quillback.js (coil, launch on the resolve tick, roll, then spent:
// lurch and uncurl, or a wall: thud, bounce back, daze, uncurl). Its pose fields (push, lift, tilt, pitch, sx, sy, sz,
// tuck, crest, bristle, legs, glow, shiv, wob) are copied key for key and mapped onto this rig in game() below.
import * as THREE from 'three';
import { track, gaitFoot, V3, smooth, lerp, clamp, addPose, EASE } from '../kit/quad.mjs';
const FR = 1 / 30, TICK = 1 / 60;
export const CFG = {
  name: 'quillback', unit: 0.85, base: {},
  chain: [['hips', 'b'], ['sq', 'q'], ['ball', 'r'], ['chest', 'c'], ['head', 'h']],
  extras: [['rump', 'u']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']], ['fThighL', 'kfl'], ['fThighR', 'kfr'], ['hThighL', 'khl'], ['hThighR', 'khr']],
  legs: {
    FL: { kind: 'limb', b: ['fThighL', 'fShinL', 'fFootL', 'fToeL'] }, FR: { kind: 'limb', b: ['fThighR', 'fShinR', 'fFootR', 'fToeR'] },
    HL: { kind: 'limb', b: ['hThighL', 'hShinL', 'hFootL', 'hToeL'] }, HR: { kind: 'limb', b: ['hThighR', 'hShinR', 'hFootR', 'hToeR'] },
  },
  springs: [],
};
const U = CFG.unit;
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const REST = { FL: V3(0.185, 0, 0.255), FR: V3(-0.185, 0, 0.255), HL: V3(0.185, 0, -0.10), HR: V3(-0.185, 0, -0.10) };
const plant = (p) => ({ p: p.clone(), lock: true });
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
// the game's curves (render/facet/timeline.js ease, render/facet/foe.js settle)
const ease = { out: (k) => 1 - (1 - k) * (1 - k), in: (k) => k * k, inOut: (k) => k * k * (3 - 2 * k) };
const settle = (k) => { if (k <= 0) return 1; if (k >= 1) return 0; const a = 1 - k; return a * a * (1 - 2.6 * k); };
const TAU = 2 * Math.PI;
const wrapPi = (a) => a - TAU * Math.round(a / TAU);

// ------------------------------------------------------------------------------------------------ the game's poses
const GREST = { push: 0, lift: 0, tilt: 0, roll: 0, pitch: 0, sx: 1, sy: 1, sz: 1, tuck: 0, crest: 0, bristle: 0, legs: 1, glow: 0, shiv: 0, wob: 0 };
const FIELDS = Object.keys(GREST);
const K = (o) => ({ ...GREST, ...o });
const lerpF = (a, b, k) => Object.fromEntries(FIELDS.map((f) => [f, a[f] + (b[f] - a[f]) * k]));
const COIL_IN = K({ push: -0.02, lift: -0.03, tilt: -0.02, pitch: -0.18, sx: 1.05, sy: 0.91, sz: 1.04, tuck: 1, crest: 0.8, bristle: 0.55, glow: 0.55 });
const COIL_END = K({ push: -0.05, lift: -0.05, tilt: -0.07, pitch: -0.4, sx: 1.09, sy: 0.86, sz: 1.06, tuck: 1, crest: 1, bristle: 1, glow: 1, shiv: 1 });
const LAUNCH = K({ push: 0.08, lift: 0.03, tilt: 0.38, pitch: 0.32, sx: 0.93, sy: 0.97, sz: 1.17, tuck: 1, crest: 1.18, bristle: 1.2, glow: 1 });
const ROLL = K({ push: 0.03, lift: 0.03, tilt: 0.08, pitch: 0.32, sx: 1, sy: 0.97, sz: 1.04, tuck: 1, crest: 1, bristle: 1, legs: 0, glow: 0.7 });
const LURCH = K({ push: 0.06, lift: -0.01, tilt: 0.32, sx: 1.07, sy: 0.93, sz: 0.9, tuck: 1, crest: 1, bristle: 0.8, legs: 0.2, glow: 0.6 });
const THUD = K({ push: 0.05, tilt: 0.06, sx: 1.16, sy: 1.1, sz: 0.78, tuck: 1, crest: 1.25, bristle: 1.3, legs: 0, glow: 0.9 });
const RECOIL = K({ push: -0.08, lift: 0.06, tilt: -0.22, pitch: -0.35, sx: 0.96, sy: 1.06, sz: 1.05, tuck: 0.85, crest: 0.5, bristle: 0.6, legs: 0.6, glow: 0.6 });
const DAZE = K({ push: -0.02, lift: -0.025, tilt: -0.06, pitch: -0.12, sx: 1.06, sy: 0.93, tuck: 0.45, crest: -0.65, bristle: 0, legs: 1, glow: 0.15, wob: 1 });

const TEL = 48 * TICK, STRIKE = 5 * TICK, COIL = TEL - STRIKE, CHARGE = 60 * TICK, STAGGER = 30 * TICK;
const HOLD = 2 * FR, ROLL_IN = 5 * FR, LURCH_SEC = 3 * FR, UNCURL = 0.4, THUD_SEC = 2 * FR, RECOIL_SEC = 5 * FR, LAND = 6 * FR, RECOVER = 0.38;
const BUMP_AT = 0.32, BUMP_HOLD = 2 * FR, BUMP_OUT = 5 * FR;
const ROLL_SPEED = 6.0, WALK = 1.5;
// this ball: its centre rides BALL_Y above the floor curled (the quills touch the floor), so it turns as far as it travels
const BALL_Y = 0.35, C0 = 0.29;
const RATE = ROLL_SPEED / U / BALL_Y; // rad/s
const UNROLL_RATE = 4, CARRY = 0.09, BOUNCE = 0.38;
// The curled coat is not a perfect ball: its lowest point at each roll angle (0 to 2 pi, from a test spin at BALL_Y), so
// the ball rides up and down over its own bumps and never sinks into the floor. Measured with balltest.mjs.
const LOW = [-0.010,-0.029,-0.044,-0.054,-0.061,-0.065,-0.066,-0.062,-0.053,-0.048,-0.058,-0.064,-0.066,-0.070,-0.079,-0.085,-0.086,-0.089,-0.096,-0.099,-0.096,-0.092,-0.097,-0.109,-0.116,-0.117,-0.114,-0.105,-0.092,-0.073,-0.077,-0.084,-0.086,-0.084,-0.080,-0.085,-0.085,-0.084,-0.086,-0.083,-0.075,-0.063,-0.060,-0.060,-0.056,-0.047,-0.042,-0.046,-0.045,-0.041,-0.032,-0.019,-0.002,0.019,0.020,0.013,0.009,0.003,0.001,0.002,-0.010];
const lowAt = (p) => { const f = ((p % TAU) + TAU) % TAU / TAU * (LOW.length - 1); const i = Math.floor(f); return LOW[i] + (LOW[Math.min(LOW.length - 1, i + 1)] - LOW[i]) * (f - i); };

function coilPose(k) {
  if (k < 0.22) return lerpF(GREST, COIL_IN, ease.out(k / 0.22));
  const o = lerpF(COIL_IN, COIL_END, ease.inOut((k - 0.22) / 0.78)); const s = c01((k - 0.45) / 0.55); o.shiv = s * s; return o;
}
function strikePose(s) {
  const o = lerpF(COIL_END, LAUNCH, ease.in(c01(s))); const kick = ease.out(c01(s * 3));
  o.crest = COIL_END.crest + (LAUNCH.crest - COIL_END.crest) * kick; o.bristle = COIL_END.bristle + (LAUNCH.bristle - COIL_END.bristle) * kick; o.shiv = 1 - c01(s * 2); return o;
}
function rollPose(tr, spin) {
  let o;
  if (tr < HOLD) { o = { ...LAUNCH }; o.legs = 1 - ease.out(tr / HOLD); } else if (tr < HOLD + ROLL_IN) { o = lerpF(LAUNCH, ROLL, 1 - settle((tr - HOLD) / ROLL_IN)); o.legs = 0; } else o = { ...ROLL };
  o.legs = clamp(o.legs, 0, 1); o.pitch += spin; o.lift += 0.008 * Math.abs(Math.sin(spin * 1.5)); return o;
}
function bumpPose(tb, o) {
  if (!(tb >= 0) || tb > BUMP_HOLD + BUMP_OUT) return o;
  const a = tb < BUMP_HOLD ? 1 : settle((tb - BUMP_HOLD) / BUMP_OUT);
  o.sx *= 1 + 0.19 * a; o.sy *= 1 - 0.09 * a; o.sz *= 1 - 0.1 * a; o.bristle += 0.25 * a; return o;
}
const nearestUp = (p) => TAU * Math.round(p / TAU);
function stopPlan(p0) { const fwdUp = TAU * Math.ceil(p0 / TAU) - p0; const c = Math.min(CARRY, fwdUp); const rem = c < CARRY ? 0 : nearestUp(p0 + c) - (p0 + c); return { c, rem, dur: Math.max(UNCURL, Math.abs(rem) / UNROLL_RATE) }; }
function stopPose(ts, cap) {
  const pl = stopPlan(cap.pitch); let o;
  if (ts < LURCH_SEC) o = lerpF(cap, LURCH, ease.out(ts / LURCH_SEC)); else o = lerpF(LURCH, GREST, 1 - settle(c01((ts - LURCH_SEC) / pl.dur)));
  o.pitch = cap.pitch + pl.c * ease.out(c01(ts / LURCH_SEC)) + pl.rem * ((k) => k * k * (3 - 2 * k))(c01((ts - LURCH_SEC) / pl.dur)); return o;
}
function thudPlan(p0) { const backUp = p0 - (DAZE.pitch + TAU * Math.floor((p0 - DAZE.pitch) / TAU)); const c = Math.min(BOUNCE, backUp); const rem = -(backUp - c); return { c, rem, dur: Math.min(1.2, Math.max(LAND, -rem / UNROLL_RATE)) }; }
const thudUpright = (p0) => THUD_SEC + 0.6 * RECOIL_SEC + thudPlan(p0).dur;
function thudPose(ts, cap) {
  let o;
  if (ts < THUD_SEC) { o = lerpF(cap, THUD, ease.out(ts / THUD_SEC)); o.pitch = cap.pitch; return o; }
  if (ts < THUD_SEC + RECOIL_SEC) o = lerpF(THUD, RECOIL, ease.out((ts - THUD_SEC) / RECOIL_SEC)); else o = lerpF(RECOIL, DAZE, 1 - settle(c01((ts - THUD_SEC - RECOIL_SEC) / LAND)));
  const { c, rem, dur } = thudPlan(cap.pitch); const t1 = ts - THUD_SEC; const sm = (k) => k * k * (3 - 2 * k);
  o.pitch = cap.pitch - c * ease.out(c01(t1 / RECOIL_SEC)) + rem * sm(c01((t1 - 0.6 * RECOIL_SEC) / dur)); return o;
}
const returnPose = (ts, cap, dur) => lerpF(cap, GREST, 1 - settle(c01(ts / dur)));

// The game pose on this rig. The game turns its whole body (tilt, roll) about a pivot near the ball's middle and spins
// the ball inside it; here hips lean, sq squashes, ball spins. The curl: the game slides a separate head into its dome;
// this coat is one piece, so tuck curls the chest and rump round and tucks the head under (deeper once the legs are in).
// crest and bristle flare the coat a little (the game raises a separate crest of seven quills and flares its coat).
const uprOf = (g) => 1 - smooth((Math.abs(wrapPi(g.pitch)) - 0.42) / 0.35);
const legsOf = (g) => Math.min(clamp(g.legs, 0, 1), uprOf(g));
function game(g, t) {
  // the coat is long, not a dome: the legs stay in and the curl stays tight until it is back near upright
  const upr = uprOf(g);
  const L = legsOf(g), tk = Math.max(g.tuck, 1 - upr), deep = tk * (1 - L);
  // standing, the long body rocks and dips a third as far as the game's round one, and the rump stays clear of the floor
  const SL = 1 - 0.7 * L, pw = wrapPi(g.pitch), rock = (pw + g.tilt) * L;
  const flare = 1 + 0.035 * Math.min(g.bristle, 1.2) + 0.02 * Math.max(0, g.crest) - 0.012 * Math.max(0, -g.crest);
  // curled, the squash is about the hips (well above the ball's middle): keep the ball's foot on the floor through it
  const oyRoll = BALL_Y - C0 - lowAt(g.pitch + g.tilt), sRel = g.sy * flare / 1.055 - 1;
  const sh = g.shiv, wb = g.wob * L; // curled up, the long coat does not wobble (the game's round one does)
  return {
    oz: g.push / U, oy: g.lift * L / U + (oyRoll + sRel * (0.37 + oyRoll)) * (1 - L) + 0.006 * sh * Math.sin(t * 61) / U,
    bp: -g.tilt * SL, br: g.roll + 0.028 * sh * Math.sin(t * 50) + 0.12 * wb * Math.sin(t * 26), by: 0.05 * wb * Math.sin(t * 9),
    qsx: g.sx * flare - 1, qsy: g.sy * flare - 1, qsz: g.sz * flare - 1,
    rp: -(pw * SL + 0.035 * sh * Math.sin(t * 43)),
    cp: -0.32 * tk - 1.1 * deep, up: 0.1 * tk + 0.9 * deep + 0.3 * Math.min(0, rock) - 0.2 * Math.max(0, rock), hp: -0.42 * tk - 0.15 * deep, hy: 0.3 * wb * Math.sin(t * 7),
    kfl: -0.88 * (1 - L), kfr: -0.88 * (1 - L), khl: -0.88 * (1 - L), khr: -0.88 * (1 - L),
    glow: g.glow,
  };
}
// the feet: planted where they stand; folding (legs < 1), each draws up toward its hip and the leg shrinks into the coat
function gameFeet(g, B, base) {
  const L = legsOf(g); const F = {};
  for (const k of LEGS) {
    const at = base ? base[k] : plant(REST[k].clone().add(V3(0, 0, B.tz || 0)));
    if (L >= 0.999) { F[k] = at; continue; }
    const up = B.loc(k, [0, 0.0, 0.02]);
    F[k] = { p: up.clone().lerp(at.p, L), pitch: 0.8 * (1 - L), lock: false };
  }
  return F;
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. The game's idle: a slow breath (sin 2.3 t), the head sniffing about (sin 1.7 t) and looking side to side
// (sin 0.8 t), the crest swaying. Mine on top: it noses the floor once and gives its coat a shake.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = TAU * t / 6, br = Math.sin(2 * w), sn = Math.sin(4 * w);
    const look = Math.sin(w);
    const nose = pulse(t, 2.2, 2.55, 3.3, 3.7), snuf = nose * Math.sin(40 * t);
    const shake = pulse(t, 4.6, 4.7, 5.05, 5.2);
    return addPose(
      { oy: 0.005 * br / U, qsy: 0.014 * br, bp: 0.012 * br, rp: 0, cp: -0.06 * nose, hp: -0.05 * sn - 0.35 * nose + 0.05 * snuf, hy: 0.14 * look * (1 - nose) + 0.04 * snuf, hr: 0.04 * look },
      { br: 0.06 * Math.sin(55 * t) * shake, by: 0.04 * Math.sin(55 * t + 1) * shake, qsx: 0.03 * shake, qsz: 0.02 * shake, hy: 0.15 * Math.sin(55 * t + 2) * shake, glow: 0 },
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// The game's quillback steps in diagonal pairs (createLegs groups [[0, 3], [1, 2]], a step 0.07 to 0.13 s) at 1.5 u/s.
// Short legs: a quick scurry, six strides a second.
const WT = 1 / 6;
const GAIT = { T: WT, duty: 0.5, v: WALK / U };
const GF = { FL: { phase: 0, n: [0.185, 0.215], lift: 0.04, droop: 0.6 }, HR: { phase: 0.0, n: [-0.185, -0.075], lift: 0.035, droop: 0.4, push: 0.2 },
             FR: { phase: 0.5, n: [-0.185, 0.215], lift: 0.04, droop: 0.6 }, HL: { phase: 0.5, n: [0.185, -0.075], lift: 0.035, droop: 0.4, push: 0.2 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = TAU * t / WT;
    // the game: a lean along the travel (0.08), the steps' bob (0.02) and waddle (0.035 roll)
    return { oy: (-0.008 + 0.02 * 0.5 * (1 + Math.cos(2 * w)) * 0.5) / U, bp: -0.08 + 0.01 * Math.sin(2 * w), br: 0.035 * Math.sin(w), by: 0.02 * Math.sin(w), cp: 0.02 * Math.sin(2 * w + 1), hp: 0.03 - 0.03 * Math.sin(2 * w + 1.5), hy: -0.03 * Math.sin(w) };
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: 1 / 3, duty: 0.55, v: 0, omega: dir * TAU / 1.6, pivot: [0, 0.05] };
  return {
    dur: 1 / 3, loop: true, gait: g,
    pose: (t) => { const w = TAU * t * 3; return { oy: -0.004 + 0.003 * Math.cos(2 * w), br: 0.025 * Math.sin(w) - 0.02 * dir, cy: 0.05 * dir, hy: 0.22 * dir, hr: 0.05 * dir, hp: 0.02 * Math.sin(2 * w) }; },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.03 })])),
  };
};

// ------------------------------------------------------------------------------------------------ the charge
// QUILLBACK_CHARGE frame for frame: the coil across the telegraph's first 43 ticks, the launch in its last 5 so the
// contact lands on the resolve tick, the legs fold in over 2 frames, then it rolls 60 ticks at 6 u/s (ramming the
// dummy 0.32 s in: the contact squash), and is spent: the lurch on the lost momentum, then it rolls on upright and
// uncurls with one overshoot.
const spinAt = (tr) => RATE * tr;
const CAP_END = (() => { const o = rollPose(CHARGE, spinAt(CHARGE)); o.pitch = wrapPi(o.pitch); return o; })();
const STOP = LURCH_SEC + stopPlan(CAP_END.pitch).dur;
function chargeG(t) {
  if (t < COIL) return coilPose(t / COIL);
  if (t < TEL) return strikePose((t - COIL) / STRIKE);
  if (t < TEL + CHARGE) { const tr = t - TEL; return bumpPose(tr - BUMP_AT, rollPose(tr, spinAt(tr))); }
  return stopPose(t - TEL - CHARGE, CAP_END);
}
const rollTravel = (tr) => ROLL_SPEED * Math.max(0, tr);
const charge = {
  dur: TEL + CHARGE + STOP, contact: [TEL, TEL + BUMP_AT],
  phases: [['coil (the lane telegraph)', 0], ['launch', COIL], ['contact on the resolve tick', TEL], ['legs fold in', TEL + 0.001], ['roll at 6 u/s', TEL + HOLD], ['rams the dummy', TEL + BUMP_AT], ['spent: lurch', TEL + CHARGE], ['uncurl', TEL + CHARGE + LURCH_SEC]],
  travel: (t) => (t < TEL ? 0 : t < TEL + CHARGE ? rollTravel(t - TEL) : rollTravel(CHARGE) + 0.03 * ease.out(c01((t - TEL - CHARGE) / LURCH_SEC))) / U,
  pose: (t) => game(chargeG(t), t),
  feet: (t, B) => gameFeet(chargeG(t), B),
};

// QUILLBACK_CRASH: the same coil and launch, 0.5 s of roll, then the wall: the thud squash, the bounce back off it,
// the dazed stagger (the punish window, quills drooping) held until it is upright and the 30 ticks are up, the uncurl.
const CRASH_ROLL = 0.5;
const CAP_W = (() => { const o = rollPose(CRASH_ROLL, spinAt(CRASH_ROLL)); o.pitch = wrapPi(o.pitch); return o; })();
const CRASH_HOLD = Math.max(STAGGER, thudUpright(CAP_W.pitch));
const CAP_D = (() => { const o = thudPose(CRASH_HOLD, CAP_W); o.pitch = wrapPi(o.pitch); return o; })();
function crashG(t) {
  if (t < TEL) return chargeG(t);
  const wall = TEL + CRASH_ROLL;
  if (t < wall) return rollPose(t - TEL, spinAt(t - TEL));
  if (t < wall + CRASH_HOLD) return thudPose(t - wall, CAP_W);
  return returnPose(t - wall - CRASH_HOLD, CAP_D, RECOVER);
}
const WALL = TEL + CRASH_ROLL;
const crash = {
  dur: WALL + CRASH_HOLD + RECOVER, contact: [TEL, WALL],
  phases: [['coil (the lane telegraph)', 0], ['launch', COIL], ['contact on the resolve tick', TEL], ['roll at 6 u/s', TEL + HOLD], ['wall: thud', WALL], ['bounce back', WALL + THUD_SEC], ['dazed (the punish window)', WALL + THUD_SEC + RECOIL_SEC], ['uncurl', WALL + CRASH_HOLD]],
  // the bounce rolls it back off the wall by BOUNCE rad at its radius
  travel: (t) => (t < TEL ? 0 : t < WALL ? rollTravel(t - TEL) : rollTravel(CRASH_ROLL) - BOUNCE * BALL_Y * U * ease.out(c01((t - WALL - THUD_SEC) / RECOIL_SEC))) / U,
  pose: (t) => game(crashG(t), t),
  feet: (t, B) => {
    // landing from the bounce, the feet come down where they are (under it, a little back of the wall)
    return gameFeet(crashG(t), B);
  },
};

// ------------------------------------------------------------------------------------------------ hurt
// On top of anything: a flinch (the game's hit envelope: it squashes along its height, flinches a little less than
// most, the quills being stiff). Mine: the head ducks into the coat, a half curl that snaps back out.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { cp: -0.16, up: 0.14, hp: -0.3, hy: 0.15, rp: 0.06 }, 'out'], [0.17, { cp: 0.03, up: -0.03, hp: 0.06, hy: -0.04, rp: -0.015 }], [0.4, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames, about 10% over. Mine on top: it arrives curled in a ball,
// uncurls with one overshoot, and gives its quills a shake.
const SPN = { grow: 7 * FR };
const BALLED = K({ tuck: 1, legs: 0, crest: 0.6, bristle: 0.6, sy: 0.97 });
function spawnG(t) {
  if (t < 0.32) return { ...BALLED };
  const o = lerpF(BALLED, GREST, 1 - settle(c01((t - 0.32) / 0.42)));
  const sh = pulse(t, 0.8, 0.86, 1.05, 1.15); o.shiv = sh; o.bristle += 0.6 * sh; return o;
}
const spawn = {
  dur: 1.3, contact: [],
  scale: (t) => (t < SPN.grow ? lerp(0.04, 1.1, EASE.out(clamp(t / (SPN.grow * 0.75)))) : lerp(1.1, 1, smooth((t - SPN.grow) / 0.12))),
  phases: [['grow (curled)', 0], ['uncurl', 0.32], ['shake', 0.8], ['stand', 1.15]],
  pose: (t) => addPose(game(spawnG(t), t), { hy: 0.18 * Math.sin(46 * t) * pulse(t, 0.8, 0.86, 1.05, 1.15) }),
  feet: (t, B) => gameFeet(spawnG(t), B),
};

// ------------------------------------------------------------------------------------------------ death
// The game dissolves a foe with its shared death (a small swell and throw). Mine: a jolt with the head thrown up and the
// quills standing, the legs give, it tips over onto its right side, the legs twitch, and it goes still, half curled.
const D = { give: 0.3, side: 0.85, end: 2.2 };
const LIE = { oy: 0.036, br: 1.42 };
const death = {
  dur: D.end, contact: [D.side - 0.03], phases: [['jolt', 0], ['legs give', 0.14], ['tips over', D.give], ['twitch', D.side + 0.1], ['still', 1.6]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.1, { oy: 0.012, bp: 0.12, cp: 0.14, hp: 0.35, up: -0.1, qsx: 0.05, qsy: 0.05, qsz: 0.05 }, 'out'],
      [D.give, { oy: -0.05, bp: -0.08, cp: -0.05, hp: -0.1, up: 0.05, qsx: 0.02, qsy: 0.0, qsz: 0.02 }],
      [0.6, { oy: 0.03, bp: -0.04, br: 0.7, by: 0.05, cp: -0.12, hp: -0.2, hr: -0.15, up: 0.12 }],
      [D.side, { oy: LIE.oy, br: LIE.br + 0.05, by: 0.08, cp: -0.2, hp: -0.25, hr: -0.3, up: 0.2 }, 'in'],
      [D.side + 0.12, { oy: LIE.oy, br: LIE.br, by: 0.08, cp: -0.22, hp: -0.3, hr: -0.32, up: 0.22 }, 'out'],
      [1.6, { oy: LIE.oy, br: LIE.br, by: 0.08, cp: -0.26, hp: -0.36, hr: -0.32, up: 0.26 }],
      [D.end, { oy: LIE.oy, br: LIE.br, by: 0.08, cp: -0.28, hp: -0.38, hr: -0.32, up: 0.28 }]])(t);
    return k;
  },
  feet: (t, B) => {
    // where each paw lies once it is down, in the hips' frame: the legs stick out to the side, a little bent
    const lie = { FL: [0.03, -0.17, 0.27], FR: [-0.0, -0.15, 0.25], HL: [0.03, -0.17, -0.11], HR: [0.0, -0.15, -0.1] };
    const F = {};
    for (const k of LEGS) {
      const u = smooth((t - 0.16 - (k[0] === 'H' ? 0.06 : 0)) / 0.5);
      const tw = 0.02 * Math.sin(24 * t + (k[1] === 'L' ? 0 : 1.7) + (k[0] === 'F' ? 0 : 0.9)) * pulse(t, D.side, D.side + 0.06, 1.3, 1.6);
      const l = lie[k]; const lp = B.loc(k, [l[0], l[1] + tw, l[2] - (k[0] === 'F' ? 0.13 : -0.175)]); lp.y = Math.max(lp.y, 0.02 * u);
      F[k] = { p: REST[k].clone().lerp(lp, u), pitch: 0.6 * u, q: new THREE.Quaternion().slerp(B.parQ(k), u), lock: t < 0.14 };
    }
    return F;
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), charge, crash, hurt, spawn, death };
export const TIMES = { TEL, COIL, CHARGE, CRASH_ROLL, WALL, CRASH_HOLD, BUMP_AT, STOP, BALL_Y };
export const GAMEPOSE = game, GAMEFEET = gameFeet, GREST_ = GREST;
export const DBGG = { chargeG: (t) => chargeG(t), crashG: (t) => crashG(t), game };
