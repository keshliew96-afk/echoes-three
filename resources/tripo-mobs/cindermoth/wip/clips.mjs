// The Cinder Moth's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/cindermoth.js (flutters at 2.4 u/s straight at its target; within 1.0 u
// it hangs still and kindles, an Ember ring r 1.2 round itself for 48 ticks, then flares for 6 to every hero inside;
// spent for 150 ticks, a grey husk drifting away at 1.2 u/s taking double damage, then it catches light again) and
// its rig buildCindermoth in src/render/enemies/kiln.js (hover 1.25 u bobbing 0.12 at 2.3 rad/s with a 0.025 flutter
// at 16; wings beat at 16 rad/s, the hind a little behind; leans 0.22 into the flight; kindling it rises to 1.38,
// pitches back 0.12 and holds its wings spread flat and trembling at 38 rad/s; the flare snaps them wide, exp(-7t)
// over 0.5 s; spent it sinks to 0.78 on slow sagging beats at 4.2 rad/s, rocking 0.18 at 1.1 rad/s; the heat creeps
// back over the last 40 ticks). The heat, the grey and the flare's light are the page's.
import { V3, smooth, lerp, clamp, addPose, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'cindermoth', unit: 1.0, base: {}, floor: false,
  chain: [['hips', 'b'], ['sq', 'q'], ['head', 'h']],
  extras: [['antL', 'aL'], ['antR', 'aR'], ['wfL', 'wfL'], ['wfR', 'wfR'], ['whL', 'whL'], ['whR', 'whR'], ['legL', 'lL'], ['legR', 'lR']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']]],
  legs: {},
  springs: [],
};
const U = CFG.unit;
const BODY = 0.3; // the body's middle (model y) sits at the game's hover height
const yAt = (h) => (h - BODY * U) / U; // the root offset that puts the body's middle at h u
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const none = () => ({});
// The loops: the bob's 2.3 rad/s is a 2.73 s cycle; the beat's 16 rad/s rounded to 7 beats in it (16.1 rad/s)
const P = TAU / 2.3, WB = TAU / P, BEAT = 7 * TAU / P;

// --- the game's pose on this rig. move (0..1), kin (kindleK 0..1), prog (the kindle's progress), burst (the flare),
// spent (0..1), h (the hover height, u). Signs: the game's +x lean (nose down) is a minus pitch; its wing z rotation
// side * a is a roll of +a on the left wing and -a on the right.
function moth(t, o = {}) {
  const move = o.move || 0, kin = o.kin || 0, prog = o.prog || 0, burst = o.burst || 0, spent = o.spent || 0, lit = 1 - spent;
  const h = o.h ?? 1.25 + 0.12 * Math.sin(WB * t);
  const out = {
    oy: yAt(h) + 0.025 / U * Math.sin(BEAT * t) * (1 - kin) * lit,
    bp: -(0.22 * move * (1 - kin) - 0.12 * kin), br: spent > 0.5 ? 0.18 * Math.sin(1.1 * t) * spent : 0.05 * Math.sin(WB * t) * (1 - spent),
    hp: 0.1 * kin + 0.15 * burst - 0.15 * spent,
    aLp: -0.15 * move + 0.05 * Math.sin(BEAT * t) * lit - 0.3 * spent, aRp: -0.15 * move + 0.05 * Math.sin(BEAT * t) * lit - 0.3 * spent,
    aLr: 0.1 * burst, aRr: -0.1 * burst,
    lLp: -0.4 * move + 0.05 * Math.sin(WB * t) - 0.2 * kin, lRp: -0.4 * move + 0.05 * Math.sin(WB * t + 0.5) - 0.2 * kin,
    qsx: 0.04 * burst, qsy: -0.03 * burst, qsz: 0.04 * burst,
  };
  for (const [w, hind] of [['wf', 0], ['wh', 1]]) {
    const ph = BEAT * t - hind * 0.6;
    const flap = (0.3 + 0.75 * Math.sin(ph)) * lit * (1 - kin);
    const tremble = kin * (0.04 + 0.05 * Math.sin(38 * t + hind)) * (1 + prog);
    const sag = spent * (-0.3 + 0.32 * Math.sin(4.2 * t - hind * 0.5));
    const a = flap + tremble + 0.08 * kin + sag - 0.1 * burst;
    const sw = (hind ? -0.25 : 0.12) * (1 - 0.6 * kin) - 0.15 * burst;
    out[w + 'Lr'] = a; out[w + 'Rr'] = -a; out[w + 'Ly'] = sw; out[w + 'Ry'] = -sw;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ idle (flutter)
const idle = {
  dur: P, loop: true,
  pose: (t) => { const look = 0.25 * pulse(t, 0.6, 0.9, 1.4, 1.7); return addPose(moth(t), { hy: look }); },
  feet: none,
};
const walk = { dur: P, loop: true, gait: { T: P, duty: 0, v: 2.4 / U }, pose: (t) => moth(t, { move: 1 }), feet: none };
const turn = (dir) => ({
  dur: P, loop: true, gait: { T: P, duty: 0, v: 0, omega: dir * 1.5 * Math.PI, pivot: [0, 0] },
  pose: (t) => addPose(moth(t, { move: 0.3 }), { br: -0.15 * dir, hy: 0.15 * dir }),
  feet: none,
});

// ------------------------------------------------------------------------------------------------ kindle, flare, spent
// The game's whole attack: it hangs still and kindles under the Ember ring (48 ticks), flares (6 to every hero inside),
// then is spent for 150 ticks, sinking to a grey husk on slow beats, the heat creeping back over the last 40, and
// catches light and climbs back to its flutter. The page drifts it away while spent and draws the heat and the grey.
const TEL = 48 / 60, SPENT = 150 / 60, CREEP = 40 / 60;
// the game's approaches, integrated: kindleK at 9/s, the height at 5/s (2.5/s spent), litK at 7/s out and 3/s back
const TAB = (() => {
  const n = Math.ceil((TEL + SPENT + 1.0) * 240), dt = 1 / 240, out = [];
  let kin = 0, h = 1.25, lit = 1;
  for (let i = 0; i <= n; i++) {
    const t = i * dt, kindle = t < TEL, spent = t >= TEL && t < TEL + SPENT;
    const creep = spent ? 0.35 * c01(1 - (TEL + SPENT - t) / CREEP) : 0;
    out.push({ kin, h, lit });
    kin += ((kindle ? 1 : 0) - kin) * (1 - Math.exp(-9 * dt));
    const want = spent ? 0.78 + 0.05 * Math.sin(t * 1.3) : kindle ? 1.38 : 1.25 + 0.12 * Math.sin(WB * t);
    h += (want - h) * (1 - Math.exp(-(spent ? 2.5 : 5) * dt));
    lit += ((spent ? creep : 1) - lit) * (1 - Math.exp(-(spent ? 7 : 3) * dt));
  }
  return out;
})();
const tabAt = (t) => { const f = clamp(t * 240, 0, TAB.length - 1); const i = Math.floor(f), j = Math.min(TAB.length - 1, i + 1), u = f - i; const A = TAB[i], B = TAB[j]; return { kin: A.kin + (B.kin - A.kin) * u, h: A.h + (B.h - A.h) * u, lit: A.lit + (B.lit - A.lit) * u }; };
const awayK = (t) => smooth((t - TEL - 0.1) / 0.25) * (1 - smooth((t - TEL - SPENT) / 0.3));
export const KINDLE_DUR = TEL + SPENT + 1.0;
const kindle = {
  dur: KINDLE_DUR, contact: [TEL],
  phases: [['kindles: the Ember ring, wings spread and trembling', 0], ['the flare: 6 to every hero inside', TEL], ['spent: a grey husk, takes double damage', TEL + 0.3], ['the heat creeps back', TEL + SPENT - CREEP], ['catches light again', TEL + SPENT]],
  pose: (t) => {
    const s = tabAt(t), a = t - TEL, burst = a >= 0 && a < 0.5 ? Math.exp(-7 * a) : 0, prog = t < TEL ? t / TEL : 0;
    // at the end it blends back into the flutter's own bob so the idle picks it up
    const back = smooth((t - (KINDLE_DUR - 0.5)) / 0.5);
    const h = lerp(s.h, 1.25 + 0.12 * Math.sin(WB * t), back);
    const o = moth(t, { kin: s.kin, prog, burst, spent: 1 - s.lit, h });
    o.by = Math.PI * awayK(t); // the game turns it away from the party for the spent drift, and back on relight
    return o;
  },
  // the spent husk drifts away from the party at the game's 1.2 u/s until it is 4 u off (the hero starts 0.9 u away)
  travel: (t) => -1.2 * clamp(t - TEL - 0.25, 0, Math.min((4.0 - 0.9) / 1.2, SPENT - 0.25)) / U,
  feet: none,
};

// ------------------------------------------------------------------------------------------------ hurt
const hurt = {
  dur: 0.35, upperOnly: true,
  pose: (t) => { const k = track([[0, { p: 0 }], [0.04, { p: 1 }, 'out'], [0.15, { p: -0.25 }], [0.35, { p: 0 }]])(t).p;
    return { qp: 0.35 * k, hp: 0.3 * k, qsx: 0.06 * k, qsy: -0.06 * k, qsz: 0.06 * k, wfLr: 0.3 * k, wfRr: -0.3 * k, whLr: 0.3 * k, whRr: -0.3 * k, aLp: 0.3 * k, aRp: 0.3 * k }; },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows in over 7 frames, about 10% over. Mine on top: it lifts off from low with hard beats.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.0, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['climbs to its flutter', 7 * FR], ['flutters', 0.8]],
  pose: (t) => moth(t, { h: lerp(0.8, 1.25 + 0.12 * Math.sin(WB * t), smooth((t - 0.1) / 0.7)), move: 0.4 * pulse(t, 0.1, 0.3, 0.6, 0.9) }),
  feet: none,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, its heat goes out; the beat stops and it tumbles down,
// lands on the floor on its belly with a bounce, the wings flopping flat out either side.
const FALLT = 0.55;
const LOW = [0.003,-0.001,-0.001,-0.001,-0.005,-0.007,-0.008,-0.007,-0.006,-0.004,-0.003,-0.006,-0.016,-0.019,-0.013,0.001,0.006,0.009,0.013,0.016,0.016,0.014,0.009,0.006,0.010,0.016,-0.001,-0.009,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012,-0.012];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t * 30, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
function deathBody(t) {
  const hit = pulse(t, 0, 0.04, 0.1, 0.3), k = c01((t - 0.1) / FALLT), land = smooth((t - 0.1 - FALLT) / 0.3);
  const o = moth(t, { spent: 1, h: 1.25 });
  o.oy = 0; o.br = 0.4 * Math.sin(Math.PI * k) * (1 - land); o.bp = 0.6 * k * (1 - land) + 0.2 * hit;
  for (const w of ['wf', 'wh']) { const a = lerp(0.5 * (1 - k), w === 'wf' ? -0.35 : -0.5, land) + 0.2 * Math.sin(12 * t) * (1 - land) * k; o[w + 'Lr'] = a; o[w + 'Rr'] = -a; o[w + 'Ly'] = lerp(o[w + 'Ly'], w === 'wf' ? 0.25 : -0.1, land); o[w + 'Ry'] = -o[w + 'Ly']; }
  o.lLp = -0.5 * land; o.lRp = -0.5 * land; o.lLr = 0.6 * land; o.lRr = -0.6 * land; o.aLp = -0.5 * land; o.aRp = -0.5 * land; o.hp = -0.2 * land;
  return o;
}
const death = {
  dur: 2.0, contact: [0.1 + FALLT],
  phases: [['struck: the heat goes out', 0], ['tumbles down', 0.1], ['lands', 0.1 + FALLT], ['lies still', 0.1 + FALLT + 0.4]],
  pose: (t, probe) => {
    const o = deathBody(t);
    if (process.env.PROBE) return o;
    const k = c01((t - 0.1) / FALLT), fall = yAt(1.25) * (1 - k * k);
    o.oy = Math.max(fall, -lowAt(t)) + 0.015 * bump(t, 0.1 + FALLT + 0.06, 0.12);
    return o;
  },
  feet: none,
};
export const CLIPS = process.env.PROBE ? { death } : { idle, walk, turnL: turn(1), turnR: turn(-1), kindle, hurt, spawn, death };
