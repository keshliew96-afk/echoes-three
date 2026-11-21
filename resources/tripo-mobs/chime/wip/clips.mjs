// The Chime Wraith's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/chime.js (drifts at 1.6 u/s to 1.4 to 2.4 u of its target; with a
// hero inside 2.8 u it stops, lifts the bell and marks the toll, an Ember ring r 2.8 round itself, for 60 ticks; the
// toll rings for 6 and slows 40% for 2 s; a stun mid-swing chokes it; cooldown 300 ticks) and its rig buildChime in
// src/render/enemies/spire.js (hover a hand above the floor with a 0.05 bob at 1.6 rad/s; leans 0.1 into the drift,
// back 0.12 on the wind-up, 0.08 on the strike; the shroud sways 0.04 at 0.9 rad/s, gathers 5% on the wind-up and
// flares 22% on the strike; the hem ripples at 3.1 rad/s and kicks out on the strike; the hood thrown back 0.5 on
// the wind-up, forward 0.3 on the strike; the sleeves lifted 0.9 and spread 0.18; the bell lifted 0.12 and swung
// ever harder, its rate 2.2 + 5 tk rad/s, its size 0.1 + 0.55 tk; the strike exp(-6 age) for 0.7 s shudders the bell
// at 22 and 17 rad/s and swells it 10%).
import { V3, smooth, lerp, clamp, addPose, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'chime', unit: 1.5, base: {}, floor: false,
  chain: [['hips', 'b'], ['sq', 'q'], ['spine', 's'], ['chest', 'c'], ['head', 'h']],
  extras: [['sk1', 'k1'], ['sk2', 'k2'], ['sk3', 'k3'], ['armL', 'al'], ['foreL', 'fl'], ['handL', 'nl'], ['armR', 'ar'], ['foreR', 'fr'], ['handR', 'nr'], ['bell', 'bl'], ['rope1', 'r1'], ['rope2', 'r2']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']], ['sk1', ['ksx', 'ksy', 'ksz']], ['sk3', ['k3sx', 'k3sy', 'k3sz']], ['bell', ['bsx', 'bsy', 'bsz']]],
  legs: {},
  springs: [],
};
const U = CFG.unit;
const HOV = 0.16 / U; // the game's hover: the hem a hand above the floor
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const none = () => ({});
// The loops: the bob's 1.6 rad/s, the sway's 0.9, the bell's 2.2 and the hem's 3.1, rounded to whole cycles of 7.85 s
// (two bobs; one sway; three bell swings; four hem ripples)
const P = 7.85, WB = 2 * TAU / P, WS = TAU / P, WL = 3 * TAU / P, WH = 4 * TAU / P;

// --- the game's pose on this rig. move (0..1, the drift), tk (0..1, the toll's wind-up), hit (the strike, 0..1),
// ta (the strike's age), ph (the bell's swing phase). Signs: the game's +x rotation forward on the body and the hood is
// a minus pitch here; the sleeves' minus x (lifted forward) is a plus pitch on these hanging arms.
function chime(t, o = {}) {
  const move = o.move || 0, tk = o.tk || 0, hit = o.hit || 0, ta = o.ta ?? 1, ph = o.ph ?? WL * t;
  const flare = 0.22 * hit - 0.05 * tk;
  const hem = 0.06 * Math.sin(WH * t) * (1 + 0.6 * move);
  const amp = 0.1 + 0.55 * tk, sw = Math.sin(ph) * amp;
  const o2 = {
    oy: (o.oy ?? HOV) + (o.bob ?? 1) * 0.05 / U * Math.sin(WB * t) + 0.2 / U * tk,
    bp: -(0.1 * move - 0.12 * tk + 0.08 * hit), sr: 0.04 * Math.sin(WS * t) * (1 - tk),
    hp: 0.5 * tk - 0.3 * hit,
    // the shroud: gathers on the wind-up, flares on the strike; the hem ripples and kicks out
    ksx: flare, ksz: flare, k3sx: hem + 0.25 * hit, k3sz: hem + 0.25 * hit,
    k1p: -0.12 * move + 0.03 * Math.sin(WB * t + 0.5), k2p: -0.15 * move + 0.05 * Math.sin(WB * t + 1.3), k3p: -0.2 * move + 0.08 * Math.sin(WB * t + 2.1) - 0.15 * hit,
    k1r: 0.03 * Math.sin(WB * t), k2r: 0.05 * Math.sin(WB * t + 0.8), k3r: 0.07 * Math.sin(WB * t + 1.6),
    // the bell: the sway, lifted and swung ever harder through the wind-up, shuddering on the strike
    blp: -(sw + 0.5 * hit * Math.sin(ta * 22)), blr: 0.05 * Math.sin(WS * 2 * t) + 0.2 * hit * Math.sin(ta * 17), blb: 0.03 * tk,
    bsx: 0.1 * hit, bsy: 0.1 * hit, bsz: 0.1 * hit,
    // the rope's end swings after the body (mine)
    r1p: 0.1 * move + 0.05 * Math.sin(WB * t - 0.6) + 0.2 * hit, r2p: 0.08 * Math.sin(WB * t - 1.2) + 0.15 * hit,
  };
  for (const [s, side] of [['l', 1], ['r', -1]]) {
    o2[`a${s}p`] = 0.9 * tk - 0.4 * hit + 0.06 * Math.sin(WB * t + (side > 0 ? 0 : 2.2)) * (1 - tk);
    o2[`a${s}r`] = side * 0.18 * tk;
    o2[`f${s}p`] = 0.3 * tk + 0.05 * Math.sin(WB * t + 1 + (side > 0 ? 0 : 2.2));
  }
  return o2;
}

// ------------------------------------------------------------------------------------------------ idle
// 7.85 s. The game's hover: the bob, the shroud's sway, the hem's ripple and the bell's lazy swing. Mine on top: it
// turns its hood one way then the other and flexes its claws.
const idle = {
  dur: P, loop: true,
  pose: (t) => { const look = 0.3 * pulse(t, 1.0, 1.5, 2.6, 3.1) - 0.3 * pulse(t, 4.6, 5.1, 6.0, 6.5); const flex = bump(t, 3.6, 0.5);
    return addPose(chime(t), { hy: look, cy: 0.3 * look, nlp: 0.35 * flex, nrp: 0.35 * flex }); },
  feet: none,
};
// ------------------------------------------------------------------------------------------------ drift and turns
const walk = { dur: P, loop: true, gait: { T: P, duty: 0, v: 1.6 / U }, pose: (t) => chime(t, { move: 1 }), feet: none };
const turn = (dir) => ({
  dur: P, loop: true, gait: { T: P, duty: 0, v: 0, omega: dir * Math.PI, pivot: [0, 0] },
  pose: (t) => addPose(chime(t, { move: 0.3 }), { by: 0.1 * dir, hy: 0.15 * dir, k1y: -0.12 * dir, k2y: -0.18 * dir, k3y: -0.25 * dir, blr: 0.15 * dir }),
  feet: none,
});

// ------------------------------------------------------------------------------------------------ the toll
// The game's toll: it stops, and through the 60-tick mark it rises 0.2 u, leans back, throws its hood back, lifts and
// spreads its arms, and the bell lifts and swings harder and harder; on the toll the shroud flares, the hem kicks out,
// the hood snaps forward and the bell shudders and swells, all dying away over 0.7 s.
const TEL = 60 / 60, STRIKE = 0.7;
const tkAt = (t) => (t < TEL ? smooth(t / TEL) * 0.15 + 0.85 * (t / TEL) : Math.max(0, 1 - (t - TEL) / (3 * FR)));
// the bell's phase, integrated at the game's rate 2.2 + 5 tk
const PH = (() => { const n = 2.2 * 120, a = new Float64Array(n + 2); let p = 0; for (let i = 0; i <= n + 1; i++) { a[i] = p; p += (2.2 + 5 * tkAt(i / 120)) / 120; } return a; })();
const phAt = (t) => { const f = clamp(t * 120, 0, PH.length - 2); const i = Math.floor(f); return PH[i] + (PH[i + 1] - PH[i]) * (f - i); };
const hitAt = (t) => { const a = t - TEL; return a < 0 || a >= STRIKE ? 0 : Math.exp(-a * 6) * (1 - smooth((a - 0.55) / 0.15)); };
const toll = {
  dur: TEL + STRIKE + 0.35, contact: [TEL],
  phases: [['the mark: the Ember ring, the bell lifts and swings harder', 0], ['the toll: 6 and slowed 40% for 2 s inside the ring', TEL], ['it dies away', TEL + 0.25], ['drifts again', TEL + STRIKE]],
  pose: (t) => { const tk = tkAt(t), hit = hitAt(t); return chime(t, { tk, hit, ta: t - TEL, ph: WL * 0 + phAt(t) }); },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ hurt
// Plays on top: the body jolts back, the hood snaps up, the arms fling out, the skirt whips and the bell knocks.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => {
    const k = track([[0, { p: 0, a: 0 }], [0.05, { p: 0.3, a: 0.5 }, 'out'], [0.17, { p: -0.08, a: -0.1 }], [0.4, { p: 0, a: 0 }]])(t);
    return addPose(chime(0), { oz: -0.04 * k.p / U, bp: 0.4 * k.p, sp: 0.2 * k.p, hp: 0.5 * k.p, k1p: 0.3 * k.p, k2p: 0.3 * k.p, k3p: 0.35 * k.p, blp: 0.5 * k.p,
      alr: 0.5 * k.a, arr: -0.5 * k.a, alp: -0.3 * k.a, arp: -0.3 * k.a, flp: -0.3 * k.a, frp: -0.3 * k.a, qsx: 0.04 * k.a, qsy: -0.04 * k.a, qsz: 0.04 * k.a });
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows in over 7 frames, about 10% over. Mine on top: it rises into the hover, its arms open
// and the bell swings once.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.3, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['rises', 7 * FR], ['arms open, the bell swings', 0.55], ['hovers', 1.0]],
  pose: (t) => { const up = smooth((t - 0.1) / 0.55), op = pulse(t, 0.45, 0.7, 0.9, 1.25);
    return addPose(chime(t, { oy: HOV * up }), { alr: 0.5 * op, arr: -0.5 * op, alp: 0.4 * op, arp: 0.4 * op, hp: 0.25 * op, blp: 0.4 * Math.sin(9 * t) * op }); },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it rears back and the bell gives one last swing; the hover
// gives out: it sinks, the skirt crumples on the floor and it topples forward onto its face, the arms splayed and the
// bell falling out in front. Its lowest point per frame of the tip (LOW, from the probe build with the hover at 0)
// keeps it on the floor through the fall.
const TIP = 1.6, DRAPE = 0.4;
function deathBody(t, a, go, hit) {
  const w = chime(0, { bob: 0, oy: 0 });
  return addPose(w, {
    bp: -a + 0.25 * hit, hp: 0.4 * hit + 0.8 * go * c01(a / TIP), sp: 0.1 * hit, cr: 0.08 * go, hr: 0.25 * go,
    k1p: (0.5 - (0.5 - 0.5 * DRAPE) * c01(a / TIP)) * go, k2p: (0.6 - (0.6 - 0.8 * DRAPE) * c01(a / TIP)) * go, k3p: (0.5 - (0.5 - DRAPE) * c01(a / TIP)) * go,
    alr: 0.3 * hit + 1.4 * go, arr: -0.3 * hit - 1.4 * go, alp: -0.2 * hit + 0.3 * go, arp: -0.2 * hit + 0.3 * go, flp: 0.2 * go, frp: 0.2 * go, nlp: 0.4 * go, nrp: 0.4 * go,
    blp: 0.6 * Math.sin(10 * t) * Math.exp(-3 * t) - 0.9 * go * c01(a / TIP), r1p: -1.3 * go, r2p: -0.3 * go,
  });
}
const deathTip = (t) => TIP * c01((t - 0.3) / 0.55) ** 2;
const LOWT = 1 / 30; // the probe's lowest point per game frame of the death (oy 0)
const LOW = [-0.0040, 0.0020, 0.0070, 0.0080, 0.0130, 0.0220, 0.0370, 0.0430, 0.0440, 0.0470, 0.0470, 0.0490, 0.0470, 0.0430, 0.0380, 0.0350, 0.0280, 0.0220, 0.0210, 0.0280, 0.0220, 0.0260, 0.0440, 0.0790, 0.1330, 0.2070, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510, 0.2510];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t / LOWT, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const deathPose = (t, probe) => {
  const hit = pulse(t, 0, 0.05, 0.12, 0.35), go = smooth((t - 0.08) / 0.32), a = deathTip(t);
  if (probe) return addPose(deathBody(t, a, go, hit), { oy: 0 });
  const sink = HOV - (HOV + 0.3) * c01((t - 0.12) / 0.5) ** 2; // falls out of the hover; the floor stops it
  return addPose(deathBody(t, a, go, hit), { oy: Math.max(sink, -lowAt(t)) + 0.012 * bump(t, 0.9, 0.12) });
};
const death = {
  dur: 2.2, contact: [0.85],
  phases: [['struck: rears back, the bell\'s last swing', 0], ['the hover gives out', 0.15], ['topples forward', 0.3], ['lands', 0.85], ['lies still', 1.1]],
  pose: (t) => deathPose(t, false),
  feet: none,
};
const probe = { dur: 2.2, pose: (t) => deathPose(t, true), feet: none };
export const CLIPS = process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), toll, hurt, spawn, death };
