// The Ash Wraith's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/ashwraith.js (drifts at 1.7 u/s keeping 2.4 to 5.0 u; fades on a hero
// 1.2 to 5.4 u off; gone 60 ticks while an Ember ring r 1.3 opens 1.4 u behind the hero; rises on the mark facing him
// and rakes for 11; spent 90 ticks, slowed and taking 30% more) and its rig buildAshWraith in
// src/render/enemies/kiln.js (hover 0.35 with a 0.06 bob at 1.7 rad/s, sinking 0.12 spent; the spine's lean
// 0.18 + 0.15 move + 0.4 spent - 0.15 rake; the arms' sway and rake swing; the head; the fade: it collapses into the
// ash over 0.2 s, scaled (1 - 0.85g, 1 - 0.95g, 1 - 0.85g) and spun 5g, hidden from g 0.97, and rises whole at once;
// rake = exp(-6 age) for half a second; spent eases in fast and creeps back over its last 40 ticks).
import { V3, smooth, lerp, clamp, addPose, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'ashwraith', unit: 1.35, base: {}, floor: false,
  chain: [['hips', 'b'], ['sq', 'q'], ['spine', 's'], ['chest', 'c'], ['head', 'h']],
  extras: [['sk1', 'k1'], ['sk2', 'k2'], ['sk3', 'k3'], ['armL', 'al'], ['foreL', 'fl'], ['handL', 'nl'], ['armR', 'ar'], ['foreR', 'fr'], ['handR', 'nr']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']]],
  legs: {},
  springs: [],
};
const U = CFG.unit;
const HOV = 0.15 / U; // the tail tip floats 0.15 u up (the game's skirt hangs short of the floor)
const BOB = 0.06 / U;
const P = 3.7; // the game's 1.7 rad/s bob, rounded to 3.7 s so the loops close; the arms sway on the same period
const W = TAU / P;
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));

// --- the game's pose on this rig: move (0..1, the drift), spent (0..1), rake (0..1), t drives the bob and sway.
// Signs: the game's rotation.x forward on the spine and head is a minus pitch here; on the hanging arms the game's
// minus x (forward) is a plus pitch here. The model's arms already hang a little forward and out, so the game's
// rest offsets are halved.
function wraith(t, o = {}) {
  const move = o.move || 0, spent = o.spent || 0, rake = o.rake || 0, sw = 1 - spent;
  const bob = (o.bob ?? 1) * BOB * Math.sin(W * t) * sw - 0.12 / U * spent;
  const lean = 0.15 * move + 0.4 * spent - 0.15 * rake; // the game's lean on top of the model's own hunch
  const o2 = {
    oy: (o.oy ?? HOV) + bob,
    bp: -0.5 * lean, sp: -0.3 * lean, cp: -0.2 * lean + 0.04 * Math.sin(W * t + 1) * sw,
    sr: 0.06 * Math.sin(W * t + 0.4) * sw, cr: 0.03 * Math.sin(W * t + 1.2) * sw,
    hp: 0.08 - 0.3 * spent + 0.2 * rake,
    // the skirt: trails the drift (mine: the game's strips wave on their own), ripples on the bob
    k1p: -0.12 * move + 0.03 * Math.sin(W * t + 0.5), k2p: -0.15 * move + 0.05 * Math.sin(W * t + 1.3), k3p: -0.2 * move + 0.08 * Math.sin(W * t + 2.1),
    k1r: 0.03 * Math.sin(W * t), k2r: 0.05 * Math.sin(W * t + 0.8), k3r: 0.07 * Math.sin(W * t + 1.6),
  };
  for (const [s, side, rk] of [['l', 1, 1], ['r', -1, 0.6]]) {
    const sway = 0.12 * Math.sin(W * t + (side > 0 ? 0 : 2.2)) * sw;
    o2[`a${s}p`] = 0.12 + sway - 0.3 * spent + 1.6 * rake - 0.1 * move;
    o2[`a${s}r`] = side * (0.06 + 0.6 * rake * rk - 0.1 * spent);
    o2[`f${s}p`] = 0.2 + 0.5 * rake - 0.3 * spent + 0.4 * sway;
    o2[`n${s}p`] = 0.1 + 0.3 * rake - 0.15 * spent;
  }
  return o2;
}
const none = () => ({});

// ------------------------------------------------------------------------------------------------ idle
// 7.4 s, two bobs. The game's hover, bob and arm sway. Mine on top: it turns its head one way then the other and
// flexes its claws.
const idle = {
  dur: 2 * P, loop: true,
  pose: (t) => {
    const look = 0.35 * pulse(t, 1.0, 1.5, 2.6, 3.1) - 0.3 * pulse(t, 4.6, 5.1, 6.0, 6.5);
    const flex = bump(t, 3.6, 0.5);
    return addPose(wraith(t), { hy: look, cy: 0.3 * look, hr: -0.15 * look, nlp: 0.35 * flex, nrp: 0.35 * flex, flp: 0.2 * flex, frp: 0.2 * flex });
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ drift and turn
// The game's drift, 1.7 u/s, leaning into it (0.15 rad); the skirt trails (mine).
const walk = {
  dur: P, loop: true, gait: { T: P, duty: 0, v: 1.7 / U },
  pose: (t) => wraith(t, { move: 1 }),
  feet: none,
};
// The game turns it at once; mine: 180 degrees a second, the skirt swinging wide.
const turn = (dir) => ({
  dur: P, loop: true, gait: { T: P, duty: 0, v: 0, omega: dir * Math.PI, pivot: [0, 0] },
  pose: (t) => addPose(wraith(t, { move: 0.3 }), { by: 0.1 * dir, hy: 0.15 * dir, k1y: -0.12 * dir, k2y: -0.18 * dir, k3y: -0.25 * dir, br: -0.04 * dir }),
  feet: none,
});

// ------------------------------------------------------------------------------------------------ fade, rise and rake
// The game's whole attack. It fades where it stands (0.2 s), is gone while the Ember ring r 1.3 fills behind the
// hero (60 ticks), rises on the mark whole at once facing him and rakes (contact on the rise), then stands spent for
// 90 ticks, low and slumped, and creeps back over the last 40. The page moves it to the mark and turns it round.
const FADE = 0.2, RISE = 60 / 60, SPENT = 90 / 60, CREEP = 40 / 60;
const goneG = (t) => (t >= RISE ? 0 : smooth(c01(t / FADE)));
const rakeK = (t) => { const a = t - RISE; return a < 0 || a >= 0.5 ? 0 : Math.exp(-6 * a) * (1 - smooth((a - 0.35) / 0.15)); };
// spentK approaches (1 - creep) at 8/s from the rise, then 0 once spent ends
function spentK(t) {
  if (t < RISE) return 0;
  let k = 0; const dt = 1 / 120;
  for (let s = RISE; s < t; s += dt) {
    const creep = s < RISE + SPENT ? c01(1 - (RISE + SPENT - s) / CREEP) : 1;
    const to = s < RISE + SPENT ? 1 - creep : 0;
    k += (to - k) * (1 - Math.exp(-8 * dt));
  }
  return k;
}
const SPK = Array.from({ length: 200 }, (_, i) => spentK(i / 60));
const spentAt = (t) => { const f = clamp(t * 60, 0, SPK.length - 1); const i = Math.floor(f), j = Math.min(SPK.length - 1, i + 1); return SPK[i] + (SPK[j] - SPK[i]) * (f - i); };
const rake = {
  dur: RISE + SPENT + 0.35, contact: [RISE],
  phases: [['fades into the ash', 0], ['gone: the Ember ring behind the hero', FADE], ['rises on the mark and rakes', RISE], ['spent: slowed, takes 30% more', RISE + 0.3], ['creeps back', RISE + SPENT - CREEP], ['drifts again', RISE + SPENT]],
  scale: (t) => { const g = goneG(t); if (g >= 0.97) return [0.001, 0.001, 0.001]; return [1 - 0.85 * g, 1 - 0.95 * g, 1 - 0.85 * g]; },
  pose: (t) => {
    const g = goneG(t), rk = rakeK(t), sp = spentAt(t);
    return addPose(wraith(t, { spent: sp, rake: rk }), { by: 5 * g, bp: 0.15 * g, nlp: 0.4 * rk, nrp: 0.4 * rk });
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ hurt
// Plays on top. The game's hit reaction squashes and knocks it back; here the body jolts back, the head snaps up,
// the arms fling out and the skirt whips.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => {
    const k = track([[0, { p: 0, a: 0 }], [0.05, { p: 0.3, a: 0.5 }, 'out'], [0.17, { p: -0.08, a: -0.1 }], [0.4, { p: 0, a: 0 }]])(t);
    return addPose(wraith(0), { oz: -0.04 * k.p / U, bp: 0.4 * k.p, sp: 0.2 * k.p, hp: 0.5 * k.p, k1p: 0.3 * k.p, k2p: 0.3 * k.p, k3p: 0.35 * k.p,
      alr: 0.5 * k.a, arr: -0.5 * k.a, alp: -0.3 * k.a, arp: -0.3 * k.a, flp: -0.3 * k.a, frp: -0.3 * k.a, qsx: 0.04 * k.a, qsy: -0.04 * k.a, qsz: 0.04 * k.a });
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows in over 7 frames, about 10% over. Mine on top: it rises out of a crouch, its arms open
// and it settles into the hover.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.3, contact: [],
  scale: spawnScale,
  phases: [['grows in', 0], ['rises', 7 * FR], ['arms open', 0.55], ['hovers', 1.0]],
  pose: (t) => {
    const up = smooth((t - 0.1) / 0.55), op = pulse(t, 0.45, 0.7, 0.9, 1.25);
    return addPose(wraith(t, { spent: 0.8 * (1 - up), oy: 0.5 * HOV * (1 + up) + 0.096 / U * (1 - up) }), { alr: 0.5 * op, arr: -0.5 * op, alp: 0.4 * op, arp: 0.4 * op, flp: -0.2 * op, frp: -0.2 * op, hp: 0.25 * op, bp: 0.08 * op });
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it rears back, then the hover gives out: it sinks, the
// skirt crumples on the floor and it topples forward onto its face, arms splayed; the head sinks last. Its lowest
// point per 0.1 rad of forward tip (LOW, from the probe clip) keeps it on the floor through the fall.
const TIP = 1.65, DRAPE = 0.4;
const LOW = [0.151, 0.135, 0.109, 0.084, 0.064, 0.049, 0.041, 0.039, 0.043, 0.053, 0.069, 0.092, 0.120, 0.153, 0.191, 0.233, 0.238, 0.220];
const lowAt = (a) => { const f = clamp(a / 0.1, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
function deathBody(a, go, hit, drape = DRAPE) {
  const w = wraith(0, { bob: 0, spent: 0.6 * go }); w.oy = 0;
  return addPose(w, {
    bp: -a + 0.25 * hit, hp: 0.4 * hit + 0.8 * go * c01(a / TIP), sp: 0.1 * hit, cr: 0.08 * go, hr: 0.25 * go,
    k1p: (0.5 - (0.5 - 0.5 * drape) * c01(a / TIP)) * go, k2p: (0.6 - (0.6 - 0.8 * drape) * c01(a / TIP)) * go, k3p: (0.5 - (0.5 - drape) * c01(a / TIP)) * go,
    alr: 0.3 * hit + 0.9 * go, arr: -0.3 * hit - 0.9 * go, alp: -0.2 * hit + 0.2 * go, arp: -0.2 * hit + 0.2 * go, flp: 0.3 * go, frp: 0.3 * go, nlp: 0.4 * go, nrp: 0.4 * go,
  });
}
const deathTip = (t) => TIP * c01((t - 0.3) / 0.55) ** 2;
const death = {
  dur: 2.2, contact: [0.85],
  phases: [['struck: rears back', 0], ['the hover gives out', 0.15], ['topples forward', 0.3], ['lands', 0.85], ['lies still', 1.1]],
  pose: (t) => {
    const hit = pulse(t, 0, 0.05, 0.12, 0.35), go = smooth((t - 0.08) / 0.32), a = deathTip(t);
    const sink = HOV - (HOV + 0.3) * c01((t - 0.12) / 0.5) ** 2; // falls out of the hover; the floor stops it
    return addPose(deathBody(a, go, hit), { oy: Math.max(sink, -lowAt(a)) + 0.012 * bump(t, 0.9, 0.12) });
  },
  feet: none,
};
// The probe: tips it forward 0..1.5 rad in 0.1 steps (one a frame), oy 0, in the lying pose.
const probe = { dur: 17 / 30, pose: (t) => addPose(deathBody(Math.round(t * 30) * 0.1, 1, 0), { oy: 0 }), feet: none };

const probe2 = { dur: 12 / 30, pose: (t) => addPose(deathBody(TIP, 1, 0, Math.round(t * 30) * 0.2), { oy: 0 }), feet: none };
export const CLIPS = process.env.PROBE === '2' ? { probe2 } : process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), rake, hurt, spawn, death };
