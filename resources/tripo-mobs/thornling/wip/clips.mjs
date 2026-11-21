// The Thornling's moves. Units are model units (the model is 1 tall; the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/thornling.js (skulks at 1.3 u/s keeping 2.6 to 4.2 u from its target;
// every 240 ticks it roots for 30 ticks and plants a thorn patch r 1.0 at its feet as the roots let go: 420 ticks, 35%
// slow, 3 damage every 40 ticks, at most three patches) and its rig src/render/enemies/facet/thornling.js (the plant on
// PLANT_TL: root in 3 frames, rear and bloom, the stamp in the last 2.5 frames, contact on the plant tick, roots in 2,
// snap back 2.5, settle 6; poses ROOT_P, GATHER_P, CONTACT_P, OVER_P; the stamp's sides right, left, then the
// finisher; the skulker's sway, breath and crown breath). Its pose fields (push, sink (halved, FS), pitch, roll, twist, sx, sy,
// bloom, spread, dig) are copied key for key and mapped onto this rig in game() below.
import { gaitFoot, V3, smooth, lerp, clamp, addPose, EASE, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'thornling', unit: 0.7, base: {},
  chain: [['hips', 'b'], ['sq', 'q'], ['spine', 's'], ['head', 'h'], ['crown', 'k']],
  extras: [['bud', 'u'], ['armL', 'al'], ['foreL', 'fl'], ['handL', 'nl'], ['armR', 'ar'], ['foreR', 'fr'], ['handR', 'nr']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']], ['bud', 'bs'], ['toeL', 'tl'], ['toeR', 'tr']],
  legs: {
    FL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'] }, FR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'] },
  },
  springs: [],
};
const U = CFG.unit;
const LEGS = ['FL', 'FR'];
const REST = { FL: V3(0.11, 0, 0.16), FR: V3(-0.11, 0, 0.16) };
const plant = (p, o = {}) => ({ p: p.clone(), lock: true, ...o });
const allPlanted = (o) => () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k], o)]));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const ease = { out: (k) => 1 - (1 - k) * (1 - k), in: (k) => k * k, inOut: (k) => k * k * (3 - 2 * k) };
const settle = (k) => (k <= 0 ? 1 : k >= 1 ? 0 : (1 - k) * (1 - k) * (1 - 2.6 * k));
// the root arms: up raises the arm out to the side, fwd swings it forward, curl closes the claws
const arms = (upL, fwdL, upR = upL, fwdR = fwdL, curl = 0) => ({ alr: upL, aly: fwdL * 0.5, alp: fwdL * 0.5, flp: -curl, nlp: -curl, arr: -upR, ary: -fwdR * 0.5, arp: fwdR * 0.5, frp: -curl, nrp: -curl });

// The game's body pose on this rig: its pitch spread down the body and head, the crown held upright against it and
// spun open with the bloom; the bloom swells the bud (1 + 0.5 bloom: the game's tiny buds grow 1.9 times; this bud is
// already big), spread swells the toes, dig curls them into the floor (on the feet, below).
// The game's roots are 0.21 u long, these 0.1 u: its crouch and rise are halved (FS) so the body stays off the floor.
const FS = 0.5;
const K = (o) => Object.freeze({ push: 0, sink: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, bloom: 0, spread: 0, dig: 0, ...o });
function game(g, side = 0) {
  const p = g.pitch || 0;
  return {
    oz: (g.push || 0) / U, oy: -FS * (g.sink || 0) / U,
    bp: -0.35 * p, sp: -0.35 * p, hp: -0.3 * p, br: g.roll || 0, by: 0.5 * (g.twist || 0), sy: 0.5 * (g.twist || 0),
    kp: 0.55 * p, ky: 0.5 * (g.bloom || 0) * side, bs: 0.5 * (g.bloom || 0),
    qsx: (g.sx ?? 1) - 1, qsz: 0.5 * ((g.sx ?? 1) - 1), qsy: (g.sy ?? 1) - 1, tl: 0.25 * (g.spread || 0), tr: 0.25 * (g.spread || 0),
  };
}

// ------------------------------------------------------------------------------------------------ idle
// 5.4 s. The game's idle: the skulker's sway, the breath and the crown's slow sway and breath. Mine on top: it looks
// one way and the other, rubs its claws, and once a loop the bud twitches.
const idle = {
  dur: 5.4, loop: true,
  pose: (t) => {
    const w = TAU * t / 5.4, br = Math.sin(2 * w);
    const look = 0.3 * pulse(t, 0.7, 1.1, 1.9, 2.3) - 0.3 * pulse(t, 3.0, 3.4, 4.1, 4.5);
    const rub = pulse(t, 2.4, 2.6, 2.9, 3.1);
    return addPose(
      { oy: 0.004 * br, qsy: 0.015 * br, by: 0.05 * Math.sin(w), kp: 0.06 * Math.sin(3 * w), ky: 0.25 * Math.sin(w + 1), bs: 0.08 * Math.sin(6 * w) + 0.12 * bump(t, 4.9, 0.3), hy: 0.6 * look, sy: 0.2 * look, hr: 0.04 * Math.sin(w + 2) },
      arms(0.08 + 0.02 * br, 0.05 + 0.35 * rub, 0.08 + 0.02 * br, 0.05 + 0.35 * rub, 0.2 + 0.3 * rub * (0.5 + 0.5 * Math.sin(40 * t))),
    );
  },
  feet: allPlanted(),
};

// ------------------------------------------------------------------------------------------------ skulk and turn
// The game's skulk: 1.3 u/s on two short roots, each step 0.08 to 0.13 s, leaning 0.14 rad into the travel and
// waddling onto the planted root. These roots are half the game's length, so it scurries: 6.7 strides a second.
const WT = 0.15;
const GAIT = { T: WT, duty: 0.45, v: 1.3 / U };
const GF = { FL: { phase: 0, n: [0.11, 0.16], lift: 0.04, droop: 0.5, push: 0.15 }, FR: { phase: 0.5, n: [-0.11, 0.16], lift: 0.04, droop: 0.5, push: 0.15 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = TAU * t / WT;
    return addPose({ oy: -0.03 + 0.006 * Math.cos(2 * w), br: 0.07 * Math.sin(w + 0.5), by: 0.05 * Math.sin(w), bp: -0.07, sp: -0.05, hp: 0.03 * Math.sin(2 * w + 1), hr: -0.04 * Math.sin(w + 1), ky: 0.1 * Math.sin(w + 2), kp: 0.08 },
      arms(0.12, 0.3 * Math.sin(w + Math.PI), 0.12, 0.3 * Math.sin(w), 0.15));
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
// The game turns it at once; mine: 240 degrees a second in quick root steps, the head leading.
const turn = (dir) => {
  const g = { T: 0.2, duty: 0.5, v: 0, omega: dir * TAU / 1.5, pivot: [0, 0.08] };
  return {
    dur: 0.2, loop: true, gait: g,
    pose: (t) => { const w = TAU * t / 0.2; return addPose({ oy: -0.02 + 0.004 * Math.cos(2 * w), br: 0.05 * Math.sin(w + 0.4), sy: 0.1 * dir, hy: 0.25 * dir, hr: 0.05 * dir, ky: -0.15 * dir }, arms(0.12, 0.15 * dir, 0.12, -0.15 * dir)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.035 })])),
  };
};

// ------------------------------------------------------------------------------------------------ the plant
// The game's plant key for key: the root (30 ticks) is the telegraph. Root in (3 frames): the toes grip, it drops into
// a crouch and the bud springs open with an overshoot. Rear and bloom: up and back off the gripping roots, coiled to
// one side, a shiver building. The stamp in the last 2.5 frames lands on the plant tick (0.5 s): driven down onto the
// roots, squashed, the toes stabbed into the floor. Roots in for 2 frames, snap back 2.5, settle 6. The patch springs
// up at its feet on the contact.
const ROOT_SEC = 30 / 60, STRIKE = 2.5 * FR, ROOT_IN = 3 * FR, GATHER_END = ROOT_SEC - STRIKE;
const ROOT_P = K({ sink: 0.035, pitch: 0.1, twist: -0.08, sx: 1.08, sy: 0.91, bloom: 1, spread: 1, dig: 0.35 });
const GATHER_P = K({ push: -0.015, sink: -0.022, pitch: -0.3, roll: 0.04, twist: 0.18, sx: 0.92, sy: 1.12, bloom: 1, spread: 0.85, dig: 0.1 });
const CONTACT_P = K({ push: 0.02, sink: 0.06, pitch: 0.4, roll: -0.03, twist: -0.06, sx: 1.19, sy: 0.86, bloom: 1.06, spread: 0.55, dig: 1 });
const OVER_P = K({ push: 0.005, sink: -0.012, pitch: -0.06, twist: 0.02, sx: 0.97, sy: 1.05, bloom: 0.35, spread: 0.25, dig: 0.55 });
const G0 = K({});
const FIELDS = Object.keys(G0);
const lerpP = (a, b, k) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * k; return o; };
const PLANT_DUR = ROOT_SEC + 2 * FR + 2.5 * FR + 6 * FR;
const STAMP_SIDE = [1, -1, 0], FINISH = 1.3;
function plantPose(t, hit) {
  const side = STAMP_SIDE[hit];
  let o;
  if (t < ROOT_IN) { const k = t / ROOT_IN; o = lerpP(G0, ROOT_P, ease.out(k)); const f = 3 * k; o.bloom = f < 1 ? ease.out(f) : 1 + 0.08 * Math.sin((Math.PI * (f - 1)) / 2); }
  else if (t < GATHER_END) { const k = (t - ROOT_IN) / (GATHER_END - ROOT_IN); o = lerpP(ROOT_P, GATHER_P, ease.inOut(k)); const env = smooth((k - 0.3) / 0.55) * (1 - smooth((k - 0.9) / 0.1)); o.twist += 0.03 * env * Math.sin((t - ROOT_IN) * 75); o.roll += 0.022 * env * Math.sin((t - ROOT_IN) * 91 + 1); }
  else if (t < ROOT_SEC) o = lerpP(GATHER_P, CONTACT_P, ease.in((t - GATHER_END) / STRIKE));
  else if (t < ROOT_SEC + 2 * FR) o = { ...CONTACT_P };
  else if (t < ROOT_SEC + 4.5 * FR) o = lerpP(CONTACT_P, OVER_P, ease.out((t - ROOT_SEC - 2 * FR) / (2.5 * FR)));
  else if (t < PLANT_DUR) o = lerpP(OVER_P, G0, 1 - settle((t - ROOT_SEC - 4.5 * FR) / (6 * FR)));
  else o = { ...G0 };
  o.twist *= side; o.roll *= side;
  if (hit === 2 && t >= GATHER_END && t < ROOT_SEC + 4.5 * FR) { o.sink *= FINISH; o.pitch *= FINISH; o.sx = 1 + (o.sx - 1) * FINISH; o.sy = 1 + (o.sy - 1) * FINISH; o.bloom += 0.14 * o.dig; }
  return o;
}
// mine: the claws rise as it rears, and slam down with the stamp
function plantArms(t) {
  const up = pulse(t, ROOT_IN, GATHER_END - 0.05, GATHER_END, ROOT_SEC + 6 * FR);
  const slam = pulse(t, GATHER_END, ROOT_SEC, ROOT_SEC + 2 * FR, ROOT_SEC + 9 * FR);
  return arms(0.1 + 0.6 * up - 0.15 * slam, -0.2 * up + 0.5 * slam, 0.1 + 0.6 * up - 0.15 * slam, -0.2 * up + 0.5 * slam, 0.3 * up + 0.5 * slam);
}
// the feet: planted throughout; the toes curl down into the floor with dig (the game's stab) and swell with spread.
// The stab curls each toe at most 0.35 rad, so its tip goes a few mm into the floor (said on the page).
const plantFeet = (fn) => (t) => { const g = fn(t); return Object.fromEntries(LEGS.map((k) => [k, plant(REST[k], { curl: 0.35 * g.dig, under: true })])); };
const PHASES = (t0, n) => [[`${n}root in`, t0], [`${n}rear and bloom`, t0 + ROOT_IN], [`${n}stamp`, t0 + GATHER_END], [`${n}roots in`, t0 + ROOT_SEC], [`${n}snap back`, t0 + ROOT_SEC + 2 * FR], [`${n}settle`, t0 + ROOT_SEC + 4.5 * FR]];
const plantOne = {
  dur: PLANT_DUR + 0.25, contact: [ROOT_SEC], phases: [...PHASES(0, ''), ['stand', PLANT_DUR]],
  pose: (t) => addPose(game(plantPose(t, 0), 1), plantArms(t)),
  feet: plantFeet((t) => plantPose(t, 0)),
};
// The game's stamps go right, left, then the finisher, one per plant (the plants are 4 s apart in the game).
const GAP = PLANT_DUR + 0.25;
const at3 = (t) => { const n = Math.min(2, Math.floor(t / GAP)); return [n, t - n * GAP]; };
const plant3 = {
  dur: 3 * GAP, contact: [0, 1, 2].map((n) => n * GAP + ROOT_SEC),
  phases: [0, 1, 2].flatMap((n) => PHASES(n * GAP, `${['right', 'left', 'finisher'][n]}: `)),
  pose: (t) => { const [n, tt] = at3(t); return addPose(game(plantPose(tt, n), STAMP_SIDE[n]), plantArms(tt)); },
  feet: (t) => { const [n, tt] = at3(t); const g = plantPose(tt, n); return Object.fromEntries(LEGS.map((k) => [k, plant(REST[k], { curl: 0.35 * g.dig, under: true })])); },
};

// ------------------------------------------------------------------------------------------------ hurt
// On top of anything: the head jolts back and tilts, the body flinches, the bud shivers, the claws pull in.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { hp: -0.25, hr: 0.14, sp: -0.1, bs: -0.08, kp: 0.2 }, 'out'], [0.17, { hp: 0.06, hr: -0.04, sp: 0.03, kp: -0.06 }], [0.4, {}]])(t),
    arms(0.25 * pulse(t, 0, 0.05, 0.15, 0.35), -0.3 * pulse(t, 0, 0.05, 0.15, 0.35), undefined, undefined, 0.5 * pulse(t, 0, 0.05, 0.15, 0.35))),
  feet: allPlanted(),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows in over 7 frames, about 10% over. Mine on top: the bud pops open, it shakes its leaves.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.2, contact: [], scale: spawnScale,
  phases: [['grow in', 0], ['bud pops', 7 * FR], ['shake', 0.6], ['stand', 0.95]],
  pose: (t) => {
    const pop = track([[0, { bs: -0.4 }], [7 * FR, { bs: -0.4 }], [0.38, { bs: 0.25 }, 'out'], [0.55, { bs: 0 }]])(t);
    const sh = pulse(t, 0.6, 0.65, 0.85, 0.95);
    return addPose(pop, { hy: 0.2 * Math.sin(45 * t) * sh, hr: 0.1 * Math.sin(45 * t + 1) * sh, ky: 0.3 * Math.sin(45 * t + 2) * sh, sy: 0.05 * Math.sin(45 * t + 3) * sh }, arms(0.3 * pulse(t, 0.3, 0.5, 0.9, 1.1), 0.1));
  },
  feet: allPlanted(),
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). It is knocked back, staggers, and topples onto its back; the roots
// come up off the floor, the arms flop out, the bud droops and closes. Its lowest point rolls along the floor as it
// goes over (LOW, measured from the model), so it never sinks or floats.
const TIP = 1.5;
// the lowest point of the body (model units, under the hips' rest height) for a backward tip a (rad, every 0.1),
// measured with the legs riding the body (probe clip below)
const LOW = [0.003, 0.013, 0.028, 0.044, 0.063, 0.077, 0.082, 0.075, 0.069, 0.064, 0.061, 0.059, 0.059, 0.039, -0.007, -0.051];
const lowAt = (a) => { if (a > 1.5) return LOW[15] + (a - 1.5) * (LOW[15] - LOW[14]) / 0.1; const f = clamp(a / 0.1, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const OFF = { FL: V3(0.04, -0.15, 0.12), FR: V3(-0.04, -0.15, 0.12) };
const deathTip = (t) => TIP * ease.in(c01((t - 0.16) / 0.42)) + 0.06 * bump(t, 0.66, 0.16);
const death = {
  dur: 2.0, contact: [0.58], phases: [['knocked back', 0], ['topples', 0.16], ['lands', 0.58], ['lies still', 0.9]],
  pose: (t) => {
    const a = deathTip(t), hit = pulse(t, 0, 0.04, 0.12, 0.25);
    const go = smooth((t - 0.5) / 0.5);
    return addPose({ bp: a + 0.2 * hit, oy: -lowAt(a), oz: -0.05 * hit, hp: 0.25 * hit - 0.3 * go, sp: 0.1 * hit, kp: 0.5 * go, bs: -0.25 * go, hr: 0.15 * go },
      arms(0.3 * hit + 0.9 * go, 0.3 * hit - 0.4 * go, 0.3 * hit + 0.8 * go, 0.3 * hit - 0.3 * go, 0.3 * go));
  },
  feet: (t, B) => {
    const k = smooth((t - 0.16) / 0.3);
    return Object.fromEntries(LEGS.map((key) => { const free = B.loc(key, OFF[key].toArray()); return [key, k <= 0 ? plant(REST[key]) : { p: REST[key].clone().lerp(free, k), lock: false }]; }));
  },
};
// The probe: tips it back 0..1.5 rad in 0.1 steps (one a frame), oy 0, legs riding the body.
const probe = {
  dur: 15 / 30, pose: (t) => ({ bp: Math.round(t * 30) * 0.1 }),
  feet: (t, B) => Object.fromEntries(LEGS.map((key) => [key, { p: B.loc(key, OFF[key].toArray()), lock: false }])),
};

export const CLIPS = process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), plant: plantOne, plant3, hurt, spawn, death };
