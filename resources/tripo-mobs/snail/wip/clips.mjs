// The Lantern Snail's moves. Units are model units (the model is 1 tall to the lantern's ring and 1 long; the page draws
// it CFG.unit = 1.1 times bigger, a little taller than the 1 u hero with its lantern). Timings come from the game:
// src/sim/enemies/snail.js (48 health, creeps at 0.6 u/s keeping 3.5 u from the party and drifting to the middle of its
// pack; no attack; every 240 ticks its lantern mends every other foe within 3.2 u for 12, the lantern swelling for the
// 30 ticks before) and its rig src/render/enemies/facet/snail.js (the creep: the foot stretches out along the travel
// and draws up after it, one stretch per 0.3 u, 0.09 at full creep, the body leaning into the travel and the shell
// rocking against it; the mend on the foe strike timeline: the coil through the 30-tick swell, the cast the last 2.5
// frames landing on the mend tick, held 3, snap 3, settle 9, rest 0.4 s; three mends: the lantern to its left, to its
// right, the rear-up). Kesh's lantern sits lashed on top of the shell, not on a stalk, so the game's stalk tilts it.
import { V3, smooth, clamp } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'snail', unit: 1.1, base: {}, floor: false,
  chain: [['hips', 'b'], ['neck', 'n'], ['head', 'h']],
  extras: [['tail1', 't1'], ['tail2', 't2'], ['shell', 'sh'], ['lantern', 'ln'], ['stalk1L', 'aL'], ['stalk2L', 'cL'], ['stalk1R', 'aR'], ['stalk2R', 'cR']],
  scales: [['hips', ['fsx', 'fsy', 'fsz']], ['shell', ['shx', 'shy', 'shz']], ['neck', ['nsx', 'nsy', 'nsz']], ['stalk1L', 'esL'], ['stalk1R', 'esR']],
  legs: {},
  springs: [],
};
const U = CFG.unit;
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const none = () => ({});

// --- the game's fields: push, lift (u), pitch (front down +), roll (+ toward its right), sx / sy / sz (the body's
// squash), shell (its rock, + forward over the head), stalk (the lantern tipped, + forward, - up and back), sway (the
// lantern leaned, + its left), bulb and glow (the lantern's light), crane (the head lifted); mine: eyes (the stalks
// drawn back and up, + ; - pointed forward), tuck (the eye stalks pulled in, 0..1), hide (the head drawn in, 0..1).
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, sx: 1, sy: 1, sz: 1, shell: 0, stalk: 0, sway: 0, bulb: 0, glow: 0, crane: 0, eyes: 0, tuck: 0, hide: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
// st: the creep's stretch (the foot drawn long along +z, the tail end held); look: the head turned (+ its left);
// wave: the eye stalks' idle waving (0..1)
function snail(t, g = REST, o = {}) {
  const st = o.st || 0, lean = o.lean || 0, breath = Math.sin(TAU * t / 2);
  const fx = g.sx * (1 - 0.3 * st), fy = g.sy * (1 + 0.012 * breath) * (1 - 0.25 * st), fz = g.sz * (1 + st);
  const p = { oy: g.lift / U + (o.oy || 0), oz: g.push / U + 0.5 * st,
    bp: -g.pitch, br: -g.roll,
    fsx: fx - 1, fsy: fy - 1, fsz: fz - 1,
    // the shell and the head keep their own shape through the creep's stretch (the game stretches the foot)
    shx: (1 - 0.3 * st) ** -1 - 1, shy: (1 - 0.25 * st) ** -1 - 1, shz: 1 / (1 + st) - 1,
    shp: -(g.shell - 0.12 * lean + 0.012 * breath), shr: 0.04 * Math.sin(TAU * t / 4) * (o.wave ?? 1) + (o.shRoll || 0),
    lnp: -0.6 * g.stalk - 0.05 * lean + 0.03 * Math.sin(TAU * t / 4 + 1) * (o.wave ?? 1), lnr: -0.6 * g.sway + 0.04 * Math.sin(TAU * t / 2 + 0.5) * (o.wave ?? 1) + (o.lnRoll || 0),
    np: 0.45 * g.crane - 0.5 * g.hide + 0.1 * lean, hp: 0.5 * g.crane + 0.02 * breath, hy: o.look || 0,
    t1p: -0.04 * (o.tail || 0), t2p: -0.07 * (o.tail || 0) }; // the tail end lifting a little in the wave
  // the sole stays on the floor through a pitch: the tail laid back down, the front lifted back up when it dips
  p.t1p -= 0.9 * p.bp; p.np -= 0.8 * Math.min(0, p.bp); p.oy += 0.22 * Math.max(0, p.bp) + 0.45 * Math.max(0, -p.bp);
  const hs = 1 - 0.6 * g.hide; p.nsx = hs / fx - 1; p.nsy = hs / fy - 1; p.nsz = hs / fz - 1;
  const es = 1 - 0.65 * g.tuck; p.esL = es - 1; p.esR = es - 1;
  const w = o.wave ?? 1;
  for (const [s, sg, ph] of [['L', 1, 0], ['R', -1, 1.7]]) {
    const wv = w * Math.sin(TAU * t / 2 + ph), wv2 = w * Math.sin(TAU * t / 4 + ph * 2);
    // + p tips a stalk back (it points up); roll + swings it toward its right (-x)
    p['a' + s + 'p'] = 0.35 * g.eyes + 0.12 * wv - 0.25 * (o.fwd || 0); p['c' + s + 'p'] = 0.3 * g.eyes + 0.18 * wv2 - 0.2 * (o.fwd || 0);
    p['a' + s + 'r'] = -sg * (0.15 * g.eyes + 0.06 * wv2); p['c' + s + 'r'] = -sg * 0.08 * wv;
    p['a' + s + 'y'] = (o.look || 0) * 0.5;
  }
  return p;
}
export const GLOW = (g) => g.glow + 0.5 * g.bulb;

// ------------------------------------------------------------------------------------------------ idle
// The game's slow breath; mine: the eye stalks wave, one way and the other, and the lantern rocks a little on its lashings;
// once it turns its head to look along the pack.
const IP = 4.0;
const idle = { dur: IP, loop: true, feet: none, pose: (t) => snail(t, REST, { look: 0.25 * pulse(t, 1.2, 1.6, 2.4, 2.9) }) };
// ------------------------------------------------------------------------------------------------ creep and turns
// The game's creep: 0.6 u/s, one stretch of the foot per 0.3 u (0.5 s), 0.09 long at full creep, the head end leading,
// the body leaning into the travel and the shell rocking against it.
const CT = 0.5;
const stretchAt = (t) => 0.09 * (0.5 + 0.5 * Math.sin(TAU * t / CT));
const walk = { dur: IP, loop: true, gait: { T: 2 * CT, duty: 0, v: 0.6 / U }, feet: none,
  pose: (t) => snail(t, REST, { st: stretchAt(t), lean: 1, fwd: 0.4, tail: 0.5 + 0.5 * Math.sin(TAU * t / CT - 1), wave: 0.5 }) };
// The game turns it at once; mine: 90° a second, the foot rippling, the head leading round.
const turn = (dir) => ({ dur: IP, loop: true, gait: { T: 2 * CT, duty: 0, v: 0, omega: dir * 0.5 * Math.PI, pivot: [0, 0] }, feet: none,
  pose: (t) => snail(t, REST, { st: 0.5 * stretchAt(t), look: 0.22 * dir, wave: 0.5 }) });

// ------------------------------------------------------------------------------------------------ the mends
// The game's three mends (its key poses), each on its 30-tick swell: the coil (it draws back and rears, the shell
// rocks back, the lantern lifts and swells), the cast in the last 2.5 frames landing on the mend tick (12 to every other
// foe within 3.2 u; the body squashed down on its sole, the lantern thrust out and flaring), held 3 frames, snap 3,
// settle 9, rest 0.4 s. 1: the lantern to its left, cast across to its right; 2: the mirror; 3: the rear-up.
const C1 = K({ push: -0.04, pitch: -0.1, roll: -0.05, sy: 1.06, sz: 0.95, shell: -0.14, stalk: -0.45, sway: 0.35, bulb: 0.5, glow: 0.55, crane: 0.18, eyes: 0.8 });
const S1 = K({ push: 0.06, pitch: 0.08, roll: 0.04, sx: 1.14, sy: 0.9, sz: 1.04, shell: 0.1, stalk: -0.05, sway: -0.25, bulb: 0.95, glow: 1, crane: -0.06, eyes: -0.3 });
const O1 = K({ push: 0.03, pitch: -0.03, sx: 0.97, sy: 1.04, shell: -0.05, stalk: -0.22, sway: 0.08, bulb: 0.25, glow: 0.3, crane: 0.04 });
const C2 = K({ ...C1, roll: 0.05, sway: -0.35 }), S2 = K({ ...S1, roll: -0.04, sway: 0.25 }), O2 = K({ ...O1, sway: -0.08 });
const C3 = K({ push: -0.07, lift: 0.02, pitch: -0.32, sy: 1.12, sz: 0.9, shell: -0.28, stalk: -0.6, bulb: 0.7, glow: 0.8, crane: 0.38, eyes: 1 });
const S3 = K({ push: 0.08, pitch: 0.14, sx: 1.2, sy: 0.86, sz: 1.06, shell: 0.16, stalk: 0, bulb: 1.2, glow: 1.25, crane: -0.12, eyes: -0.4 });
const O3 = K({ push: 0.04, pitch: -0.06, sx: 0.95, sy: 1.06, shell: -0.08, stalk: -0.2, bulb: 0.3, glow: 0.35, crane: 0.06 });
const MENDS = [{ coil: C1, strike: S1, over: O1 }, { coil: C2, strike: S2, over: O2 }, { coil: C3, strike: S3, over: O3 }];
export const TEL = 30 / 60;
const STRIKE = 2.5 * FR, HOLD = 3 * FR, SNAP = 3 * FR, SETTLE = 9 * FR, RESTS = 0.4;
const COIL = TEL - STRIKE; export const ONE = COIL + STRIKE + HOLD + SNAP + SETTLE + RESTS;
const coilCurve = (k) => { const c = c01(k); return 0.85 * (1 - (1 - Math.min(1, c / 0.4)) ** 2) + 0.15 * c; };
const kick = (k) => { const c = c01(k); return 1 - (1 - c) ** 3; };
const settleC = (k) => { const c = c01(k); return smooth(c) - 0.12 * Math.sin(Math.PI * c) * (1 - c); };
function strikePose(V, t, end = REST) {
  if (t < COIL) return mix(REST, V.coil, coilCurve(t / COIL));
  let a = t - COIL; if (a < STRIKE) return mix(V.coil, V.strike, kick(a / STRIKE));
  a -= STRIKE; if (a < HOLD) return { ...V.strike };
  a -= HOLD; if (a < SNAP) return mix(V.strike, V.over, 1 - (1 - a / SNAP) ** 2);
  a -= SNAP; if (a < SETTLE) return mix(V.over, end, settleC(a / SETTLE));
  return { ...end };
}
export const MEND_AT = [TEL, ONE + TEL, 2 * ONE + TEL];
export const mendG = (t) => { const k = Math.min(2, Math.floor(t / ONE)); return strikePose(MENDS[k], t - k * ONE); };
const mend = { dur: 3 * ONE, contact: MEND_AT, feet: none,
  phases: [['1, the lantern to its left: it swells (30 ticks)', 0], ['the mend: 12 to every other foe within 3.2 u', TEL], ['the stalk snaps back, settles', TEL + 0.2],
           ['2, the lantern to its right: it swells', ONE], ['the mend', ONE + TEL], ['settles', ONE + TEL + 0.2],
           ['3, the rear-up: it swells', 2 * ONE], ['the mend', 2 * ONE + TEL], ['settles', 2 * ONE + TEL + 0.2]],
  pose: (t) => snail(t, mendG(t), { wave: 0.4 }) };

// ------------------------------------------------------------------------------------------------ hurt
// A snail's flinch: the eye stalks snap in, the head ducks and the body squeezes down. Plays on top of anything.
const hurt = { dur: 0.5, upperOnly: true, feet: none,
  pose: (t) => { const k = c01(t / 0.05) * (1 - smooth((t - 0.12) / 0.38)); return snail(t, K({ tuck: 0.8 * k, hide: 0.25 * k, crane: -0.15 * k, sy: 1 - 0.06 * k, sx: 1 + 0.04 * k })); } };

// ------------------------------------------------------------------------------------------------ spawn
// The game's grow-in (7 frames, about 10% over); mine after: the head comes out of the shell, the eye stalks unroll and
// the lantern lights.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
export const SPAWN_AT = 0.85;
const spawn = { dur: 1.4, contact: [SPAWN_AT], scale: spawnScale, feet: none,
  phases: [['grows in, drawn into its shell', 0], ['the head comes out', 0.25], ['the eye stalks unroll', 0.55], ['the lantern lights', SPAWN_AT]],
  pose: (t) => { const h = 1 - smooth((t - 0.2) / 0.45), e = 1 - smooth((t - 0.5) / 0.4); return snail(t, K({ hide: 0.8 * h, tuck: 0.9 * e, eyes: 0.4 * pulse(t, 0.6, 0.9, 1.0, 1.3) })); } };

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops it where it creeps). Struck, it flinches, the eye stalks snapping in; the head draws back into the
// shell, the foot sags flat and the shell tips, the lantern toppling off its top and going out.
const LOWT = 1 / 30;
const LOW = [0.001,0.005,0.005,0.005,0.005,0.004,0.003,0.001,0.000,0.000,0.000,0.001,0.002,0.003,0.004,0.006,0.007,0.007,0.008,0.008,0.009,0.009,0.010,0.010,0.010,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011,0.011];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t / LOWT, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
export const LAND_AT = 1.2;
export const deathState = (t) => ({ hit: pulse(t, 0, 0.04, 0.1, 0.3), tuck: smooth(t / 0.15), hide: smooth((t - 0.15) / 0.5), sag: smooth((t - 0.3) / 0.6), tip: c01((t - 0.75) / (LAND_AT - 0.75)) ** 2 });
function deathPose(t, probe) {
  const s = deathState(t), clank = pulse(t, LAND_AT, LAND_AT + 0.04, LAND_AT + 0.1, LAND_AT + 0.4);
  const g = K({ pitch: 0.06 * s.sag, sx: 1 + 0.06 * s.sag, sy: 1 - 0.1 * s.hit - 0.18 * s.sag, sz: 1 + 0.03 * s.sag, tuck: s.tuck, hide: 0.6 * s.hide, crane: -0.35 * s.hide, roll: 0.06 * s.sag });
  const p = snail(t, g, { wave: 1 - s.tuck, shRoll: -0.16 * s.tip - 0.03 * clank, lnRoll: -0.95 * s.tip - 0.08 * clank });
  p.oy += probe ? 0 : -lowAt(t) + 0.002;
  return p;
}
const death = { dur: 2.2, contact: [0.02, LAND_AT], feet: none,
  phases: [['struck: flinches, the eye stalks snap in', 0], ['the head draws into the shell; the foot sags', 0.15], ['the shell tips; the lantern topples', 0.75], ['the lantern clanks down and goes out', LAND_AT], ['lies still', 1.6]],
  pose: (t) => deathPose(t, false) };
const probe = { dur: 2.2, feet: none, pose: (t) => deathPose(t, true) };
export const CLIPS = process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), mend, hurt, spawn, death };
