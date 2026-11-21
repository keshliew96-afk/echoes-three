// The Gloam Moth's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/moth.js (the one flier: hovers at 2.4 u/s on a 3.5 u orbit round its
// target, then telegraphs a swoop lane 0.8 u by 5.5 u through the target for 45 ticks and dives down it at 8 u/s, 9 to
// every hero it crosses; cooldown 180 ticks) and its rig buildMothFacet in src/render/enemies/facet/moth.js (hover 0.95 u
// bobbing 0.06 at 2.3 rad/s; the beat 17 rad/s between a shallow and a steep V; the swoop's key poses on the foe strike
// timeline: coil 45 ticks with the strike in its last 2.5 frames, the dive held for the swoop (5.5/8 s), snap 4 frames,
// settle 9, rest 0.2 s; three variants: banked in from its left, from its right, the plunge).
import { V3, smooth, lerp, clamp, addPose, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'moth', unit: 1.1, base: {}, floor: false,
  chain: [['hips', 'b'], ['sq', 'q'], ['head', 'h']],
  extras: [['abd', 'ab'], ['antL', 'aL'], ['antR', 'aR'], ['wL', 'wL'], ['wR', 'wR'], ['legL', 'lL'], ['legR', 'lR']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']]],
  legs: {},
  springs: [],
};
const U = CFG.unit;
const BODY = 0.2; // the body's middle (model y) sits at the game's hover height
const HOVER = 0.95;
const yAt = (h) => (h - BODY * U) / U; // the root offset that puts the body's middle at h u
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const none = () => ({});
// The loops: the bob's 2.3 rad/s is a 2.73 s cycle; the beat's 17 rad/s rounded to 7 beats in it (16.1 rad/s)
const P = TAU / 2.3, WB = TAU / P, BEAT = 7 * TAU / P;

// --- the game's key-pose fields: lift (u, off the hover), push (u, +z), pitch (nose down +), roll (+ toward its
// right), twist (+ toward its left), sx/sy/sz, wUp (rad, the V raised), wAmp (the beat's size), wSweep (rad, swept
// back), abd (rad, the abdomen curled under). On this rig: nose down is a minus bp; a wing raised is +r on the left and
// -r on the right; swept back is +y on the left and -y on the right; the abdomen curls under with +p.
const REST = Object.freeze({ lift: 0, push: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, sz: 1, wUp: 0, wAmp: 1, wSweep: 0, abd: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
function moth(t, g = REST, o = {}) {
  const move = o.move || 0, h = (o.h ?? HOVER + 0.06 * Math.sin(WB * t)) + g.lift;
  const beat = Math.sin(BEAT * t);
  const out = {
    oy: yAt(h), oz: g.push / U,
    bp: -(g.pitch + 0.2 * move), br: g.roll + 0.04 * Math.sin(WB * t), by: g.twist + (o.yaw || 0),
    hp: 0.1 * g.pitch - 0.05 * move + (o.nod || 0), hy: o.look || 0,
    abp: g.abd + 0.08 * Math.sin(WB * t + 1) + 0.15 * move, aby: 0.06 * Math.sin(WB * t * 0.5),
    aLp: 0.4 * Math.max(0, g.pitch) + 0.15 * move + 0.04 * beat, aRp: 0.4 * Math.max(0, g.pitch) + 0.15 * move + 0.04 * beat,
    lLp: -0.4 * move - 0.6 * Math.max(0, g.pitch) + 0.06 * Math.sin(WB * t), lRp: -0.4 * move - 0.6 * Math.max(0, g.pitch) + 0.06 * Math.sin(WB * t + 0.5),
    qsx: g.sx - 1, qsy: g.sy - 1, qsz: g.sz - 1,
  };
  // the wings: the classic beat between a shallow and a steep V, raised by wUp, its size by wAmp, swept by wSweep
  const a = 0.3 + g.wUp + 0.42 * g.wAmp * beat + (o.wing || 0);
  const sw = 0.05 + g.wSweep;
  out.wLr = a; out.wRr = -a; out.wLy = sw; out.wRy = -sw;
  return out;
}

// ------------------------------------------------------------------------------------------------ idle (hover)
const idle = {
  dur: P, loop: true,
  pose: (t) => moth(t, REST, { look: 0.25 * pulse(t, 0.6, 0.9, 1.5, 1.8) }),
  feet: none,
};
// the hover's travel: 2.4 u/s, leaning into it
const walk = { dur: P, loop: true, gait: { T: P, duty: 0, v: 2.4 / U }, pose: (t) => moth(t, REST, { move: 1 }), feet: none };
const turn = (dir) => ({
  dur: P, loop: true, gait: { T: P, duty: 0, v: 0, omega: dir * 1.5 * Math.PI, pivot: [0, 0] },
  pose: (t) => addPose(moth(t, REST, { move: 0.3 }), { br: -0.2 * dir, hy: 0.15 * dir }),
  feet: none,
});

// ------------------------------------------------------------------------------------------------ the swoops
// The game's three swoops in turn on its own key poses. Each: the 45-tick lane telegraph is the coil (risen, nose up,
// wings high and beating hard, the abdomen cocked); the strike in its last 2.5 frames drops it into the dive; the dive
// is held down the lane at 8 u/s (low, nose down, wings swept flat, the abdomen curled under), crossing the hero; it
// pulls up and settles. Between swoops (mine) it climbs on past the hero and wheels round to face it again, 3.5 u off.
const C1 = K({ lift: 0.06, push: -0.06, pitch: -0.18, roll: -0.22, twist: 0.12, sx: 0.97, sy: 1.04, sz: 0.95, wUp: 0.2, wAmp: 1.35, wSweep: -0.15, abd: -0.3 });
const S1 = K({ lift: -0.5, push: 0.12, pitch: 0.55, roll: 0.2, twist: -0.1, sx: 0.92, sy: 0.92, sz: 1.14, wUp: -0.55, wAmp: 0.2, wSweep: 0.55, abd: 0.45 });
const O1 = K({ lift: 0.04, push: 0.03, pitch: -0.25, roll: 0.1, sx: 1.04, sy: 1.04, sz: 0.96, wUp: 0.1, wAmp: 1.2, wSweep: -0.1, abd: -0.2 });
const C2 = K({ lift: 0.06, push: -0.06, pitch: -0.18, roll: 0.22, twist: -0.12, sx: 0.97, sy: 1.04, sz: 0.95, wUp: 0.2, wAmp: 1.35, wSweep: -0.15, abd: -0.3 });
const S2 = K({ lift: -0.5, push: 0.12, pitch: 0.55, roll: -0.2, twist: 0.1, sx: 0.92, sy: 0.92, sz: 1.14, wUp: -0.55, wAmp: 0.2, wSweep: 0.55, abd: 0.45 });
const O2 = K({ lift: 0.04, push: 0.03, pitch: -0.25, roll: -0.1, sx: 1.04, sy: 1.04, sz: 0.96, wUp: 0.1, wAmp: 1.2, wSweep: -0.1, abd: -0.2 });
const C3 = K({ lift: 0.08, push: -0.08, pitch: -0.32, sx: 0.96, sy: 1.06, sz: 0.92, wUp: 0.22, wAmp: 1.45, wSweep: -0.2, abd: -0.4 });
const S3 = K({ lift: -0.58, push: 0.16, pitch: 0.7, sx: 0.9, sy: 0.9, sz: 1.2, wUp: -0.6, wAmp: 0.15, wSweep: 0.65, abd: 0.55 });
const O3 = K({ lift: 0.06, push: 0.04, pitch: -0.32, sx: 1.06, sy: 1.05, sz: 0.95, wUp: 0.12, wAmp: 1.25, wSweep: -0.12, abd: -0.25 });
const SW = [{ coil: C1, strike: S1, over: O1 }, { coil: C2, strike: S2, over: O2 }, { coil: C3, strike: S3, over: O3 }];
export const TEL = 45 / 60, DIVE = 5.5 / 8, LANE = 5.5, ORBIT = 3.5;
const STRIKE = 2.5 * FR, SNAP = 4 * FR, SETTLE = 9 * FR, WHEEL = 1.1, REST_END = 0.2, BACK = 1.5;
const IN = 0.25; // the rise into the coil
const ONE = TEL + DIVE + SNAP + SETTLE;
export const CYC = ONE + WHEEL;
export const SWOOP_AT = [0, 1, 2].map((k) => k * CYC + TEL);           // the release: into the dive
export const CROSS_AT = SWOOP_AT.map((a) => a + ORBIT / 8);             // the hero crossed (the hit)
export const DIRS = [1, -1, 1];
const kick = (k) => { const c = c01(k); return 1 - (1 - c) ** 3; };
const settleC = (k) => { const c = c01(k); return smooth(c) - 0.12 * Math.sin(Math.PI * c) * (1 - c); };
function swoopAt(V, tt) {
  if (tt < TEL - STRIKE) return { g: mix(REST, V.coil, smooth(tt / IN)), ph: 'coil' };
  let a = tt - (TEL - STRIKE); if (a < STRIKE) return { g: mix(V.coil, V.strike, kick(a / STRIKE)), ph: 'strike' };
  a -= STRIKE; if (a < DIVE) { const g = { ...V.strike }; g.wUp += 0.08 * Math.sin(a * 40); return { g, ph: 'dive' }; }
  a -= DIVE; if (a < SNAP) return { g: mix(V.strike, V.over, 1 - (1 - a / SNAP) ** 2), ph: 'snap' };
  a -= SNAP; if (a < SETTLE) return { g: mix(V.over, REST, settleC(a / SETTLE)), ph: 'settle' };
  return { g: { ...REST }, ph: 'wheel', w: (a - SETTLE) / WHEEL };
}
const wheelK = (w) => smooth(c01(w));
const swoops = {
  dur: 3 * ONE + 2 * WHEEL + REST_END, contact: CROSS_AT,
  phases: [0, 1, 2].flatMap((k) => [[`${['1, banked in from its left', '2, banked in from its right', '3, the plunge'][k]}: the lane telegraph (45 ticks), risen, wings high`, k * CYC],
    ['the swoop: down the lane at 8 u/s, 9 to every hero it crosses', k * CYC + TEL], ['pulls up and settles', k * CYC + TEL + DIVE], ...(k < 2 ? [['climbs on and wheels round (mine)', k * CYC + ONE]] : [])]),
  pose: (t) => {
    const k = Math.min(2, Math.floor(t / CYC)), tt = t - k * CYC; const B = swoopAt(SW[k], tt);
    let yaw = Math.PI * k, h, roll = 0, wing = 0;
    if (B.ph === 'wheel' && k < 2) { const w = wheelK(B.w); yaw += Math.PI * w; roll = -0.45 * Math.sin(Math.PI * c01(B.w)); wing = 0.15 * Math.sin(Math.PI * c01(B.w)); }
    const o = moth(t, B.g, { yaw, wing });
    o.br += roll * (k % 2 ? -1 : 1);
    return o;
  },
  // the dive runs the lane (5.5 u) in the facing; the wheel carries it 1.5 u on past the hero as it turns
  travel: (t) => {
    let z = 0;
    for (let k = 0; k < 3; k++) {
      const tt = t - k * CYC; if (tt <= 0) break;
      const dive = c01((tt - TEL) / DIVE), w = k < 2 ? wheelK((tt - ONE) / WHEEL) : 0;
      z += DIRS[k] * (LANE * dive + BACK * Math.sin(0.5 * Math.PI * w));
    }
    return z / U;
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ hurt
const hurt = {
  dur: 0.35, upperOnly: true,
  pose: (t) => { const k = track([[0, { p: 0 }], [0.04, { p: 1 }, 'out'], [0.15, { p: -0.25 }], [0.35, { p: 0 }]])(t).p;
    return { qp: 0.3 * k, hp: 0.3 * k, qsx: 0.06 * k, qsy: -0.06 * k, qsz: 0.06 * k, wLr: 0.3 * k, wRr: -0.3 * k, aLp: 0.3 * k, aRp: 0.3 * k, abp: 0.25 * k }; },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows in over 7 frames, about 10% over. Mine on top: it lifts off from low with hard beats.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.0, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['climbs to its hover', 7 * FR], ['hovers', 0.8]],
  pose: (t) => moth(t, K({ wAmp: 1 + 0.4 * pulse(t, 0.1, 0.3, 0.6, 0.9) }), { h: lerp(0.55, HOVER + 0.06 * Math.sin(WB * t), smooth((t - 0.1) / 0.7)) }),
  feet: none,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, the beat stops and it tumbles down, lands on the floor on
// its belly with a bounce, the wings flopping flat out either side, the antennae and legs going limp.
const FALLT = 0.5;
const LOW = [0.000,-0.015,-0.016,-0.016,-0.021,-0.023,-0.023,-0.022,-0.020,-0.020,-0.022,-0.024,-0.026,-0.028,-0.030,-0.032,-0.032,-0.032,-0.034,-0.034,-0.033,-0.028,-0.018,-0.002,-0.006,-0.014,-0.017,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018,-0.018];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t * 30, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
function deathBody(t) {
  const hit = pulse(t, 0, 0.04, 0.1, 0.3), k = c01((t - 0.1) / FALLT), land = smooth((t - 0.1 - FALLT) / 0.3);
  const o = moth(t, REST, { h: HOVER });
  o.oy = 0; o.br = 0.45 * Math.sin(Math.PI * k) * (1 - land); o.bp = -0.5 * k * (1 - land) - 0.2 * hit;
  const a = lerp(0.6 * (1 - k) + 0.25 * Math.sin(14 * t) * k, -0.12, land); o.wLr = a; o.wRr = -a; o.wLy = lerp(0.05, 0.12, land); o.wRy = -o.wLy;
  o.lLp = 0.5 * land; o.lRp = 0.5 * land; o.lLr = 0.7 * land; o.lRr = -0.7 * land; o.aLp = 0.6 * land; o.aRp = 0.6 * land; o.hp = -0.15 * land; o.abp = -0.2 * land;
  return o;
}
const death = {
  dur: 2.0, contact: [0.1 + FALLT],
  phases: [['struck: the beat stops', 0], ['tumbles down', 0.1], ['lands', 0.1 + FALLT], ['lies still', 0.1 + FALLT + 0.4]],
  pose: (t) => {
    const o = deathBody(t);
    if (process.env.PROBE) return o;
    const k = c01((t - 0.1) / FALLT), fall = yAt(HOVER) * (1 - k * k);
    o.oy = Math.max(fall, -lowAt(t)) + 0.015 * bump(t, 0.1 + FALLT + 0.06, 0.12);
    return o;
  },
  feet: none,
};
export const CLIPS = process.env.PROBE ? { probe: death } : { idle, walk, turnL: turn(1), turnR: turn(-1), swoops, hurt, spawn, death };
