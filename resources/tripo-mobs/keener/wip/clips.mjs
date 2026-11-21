// The Ash Keener's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/keener.js (1.45 u/s to 2.0 to 3.4 u of its target; the wail: an Ember cone
// r 4.2, half-angle 28 deg, aim locked, for 54 ticks; 10 and slowed 40% for 2 s inside; cooldown 270 ticks) and its rig
// src/render/enemies/facet/keener.js (glides 0.08 u up with a 0.04 bob at 1.6 rad/s and a 0.05 sway; leans 0.08 into the
// glide; the head bobs 0.05; the sleeves swing 0.12 at 1.4 rad/s; the wail on the foe strike timeline of
// render/facet/foestrike.js: coil through the telegraph, strike 2.5 frames, the contact held 3, snap 2.5, settle 6, rest
// 0.15 s; three wails in turn, the keen, the lament from its left and the dirge, with the game's key poses).
import { V3, smooth, lerp, clamp, addPose, track } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'keener', unit: 1.75, base: {}, floor: false,
  chain: [['hips', 'b'], ['sq', 'q'], ['spine', 's'], ['chest', 'c'], ['head', 'h']],
  extras: [['sk1', 'k1'], ['sk2', 'k2'], ['sk3', 'k3'], ['armL', 'al'], ['foreL', 'fl'], ['handL', 'nl'], ['armR', 'ar'], ['foreR', 'fr'], ['handR', 'nr']],
  scales: [['sq', ['qsx', 'qsy', 'qsz']], ['sk1', ['ksx', 'ksy', 'ksz']], ['sk3', ['k3sx', 'k3sy', 'k3sz']]],
  legs: {},
  springs: [],
};
const U = CFG.unit;
const HOV = 0.08 / U; // the game's glide height
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const none = () => ({});
// The loops: the bob at 1.6 rad/s (two a loop), the sleeves' 1.4 (rounded to two), the sway's 1.1 (rounded to one) and the
// hem's ripple (mine, four), whole cycles of 7.85 s
const P = 7.85, WB = 2 * TAU / P, WS = TAU / P, WA = 2 * TAU / P, WH = 4 * TAU / P;

// The game's pose fields (facet/keener.js REST): push, lift (u); pitch (+ forward); twist (+ to its left); roll; flare (1
// rest); head (the neck's pitch, up -); hood (0..1 back; on this model the hood is the head, so it adds to the head's tip);
// lx / lz, rx / rz (the sleeves' swing, rad: x forward -, z out +); mouth (0..1, the page's glow).
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, twist: 0, roll: 0, flare: 1, head: 0, hood: 0, lx: -0.05, lz: 0.1, rx: -0.05, rz: 0.1, mouth: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
function keener(t, g = REST, o = {}) {
  const move = o.move || 0, bob = o.bob ?? 1;
  const fl = (g.flare - 1), hem = 0.05 * Math.sin(WH * t) * (1 + 0.6 * move);
  const out = {
    oz: g.push / U, oy: (o.oy ?? HOV) + g.lift / U + bob * 0.04 / U * Math.sin(WB * t),
    bp: -(g.pitch + 0.08 * move), by: g.twist, br: g.roll + 0.05 * Math.sin(WS * t) * bob,
    hp: -(g.head - 0.3 * g.hood + 0.05 * Math.sin(WB * t) * bob), cp: -0.25 * g.head,
    qsx: 0.5 * fl, qsz: 0.5 * fl, ksx: fl, ksz: fl, k3sx: hem + 0.6 * Math.max(0, fl), k3sz: hem + 0.6 * Math.max(0, fl),
    k1p: -0.06 * move + 0.03 * Math.sin(WB * t + 0.5), k2p: -0.1 * move + 0.05 * Math.sin(WB * t + 1.3), k3p: -0.15 * move + 0.07 * Math.sin(WB * t + 2.1),
    k1r: 0.03 * Math.sin(WB * t), k2r: 0.04 * Math.sin(WB * t + 0.8), k3r: 0.06 * Math.sin(WB * t + 1.6),
  };
  // the sleeves: game q = rotZ(side * sz) * rotX(sx + sway); here the arms hang, so the forward swing is a plus pitch and
  // the spread out a roll away from the body (scaled to what these arms, fused into the sleeves, can take)
  for (const [s, side, sx, sz] of [['l', 1, g.lx, g.lz], ['r', -1, g.rx, g.rz]]) {
    const fwd = -(sx - REST.lx) + 0.12 * Math.sin(WA * t + (side > 0 ? 0 : 1.7)) * (1 - 0.5 * move) * bob, spread = 0.75 * (sz - REST.lz);
    out[`a${s}p`] = 0.85 * fwd; out[`a${s}r`] = side * spread;
    out[`f${s}p`] = 0.25 * Math.max(0, fwd) + 0.04 * Math.sin(WA * t + 1 + (side > 0 ? 0 : 1.7)) * bob;
    out[`n${s}p`] = 0.15 * Math.max(0, fwd);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ idle
// 7.85 s. The game's glide in place: the bob, the sway, the head's bob, the sleeves' swing. Mine on top: it bows its head
// in grief, lifts it, and turns to look once each way.
const idle = {
  dur: P, loop: true,
  pose: (t) => { const look = 0.3 * pulse(t, 1.0, 1.5, 2.4, 2.9) - 0.3 * pulse(t, 5.2, 5.7, 6.4, 6.9), bow = pulse(t, 3.2, 3.8, 4.4, 5.0);
    return addPose(keener(t), { hy: look, cy: 0.3 * look, hp: 0.35 * bow, cp: 0.1 * bow, alp: 0.15 * bow, arp: 0.15 * bow }); },
  feet: none,
};
// ------------------------------------------------------------------------------------------------ glide and turns
const walk = { dur: P, loop: true, gait: { T: P, duty: 0, v: 1.45 / U }, pose: (t) => keener(t, REST, { move: 1 }), feet: none };
const turn = (dir) => ({
  dur: P, loop: true, gait: { T: P, duty: 0, v: 0, omega: dir * Math.PI, pivot: [0, 0] },
  pose: (t) => addPose(keener(t, REST, { move: 0.3 }), { by: 0.1 * dir, hy: 0.15 * dir, br: -0.04 * dir, k1y: -0.12 * dir, k2y: -0.18 * dir, k3y: -0.25 * dir }),
  feet: none,
});

// ------------------------------------------------------------------------------------------------ the wails
// The game's key poses (facet/keener.js C1..O3) on the foe strike timeline: the coil runs through the 54-tick cone
// telegraph, the wail lands on its resolve, the contact holds 3 frames shaking the body, snaps back, settles.
const C1 = K({ push: -0.04, lift: 0.04, pitch: -0.18, flare: 0.95, head: -0.75, hood: 1, lx: -0.4, lz: 1.3, rx: -0.4, rz: 1.3, mouth: 0.7 });
const S1 = K({ push: 0.12, lift: -0.04, pitch: 0.3, flare: 1.35, head: 0.55, hood: 0.2, lx: -1.5, lz: 0.3, rx: -1.5, rz: 0.3, mouth: 1 });
const O1 = K({ push: 0.08, lift: -0.02, pitch: 0.2, flare: 1.2, head: 0.4, hood: 0.1, lx: -1.2, lz: 0.4, rx: -1.2, rz: 0.4, mouth: 0.6 });
const C2 = K({ push: -0.03, lift: 0.04, pitch: -0.08, twist: 0.55, roll: 0.08, flare: 0.95, head: -0.5, hood: 0.8, lx: -0.6, lz: 2.1, rx: -1.0, rz: -0.6, mouth: 0.7 });
const S2 = K({ push: 0.1, lift: -0.03, pitch: 0.25, twist: -0.3, roll: -0.1, flare: 1.3, head: 0.45, hood: 0.15, lx: -1.3, lz: -0.7, rx: -0.9, rz: 0.9, mouth: 1 });
const O2 = K({ push: 0.07, lift: -0.01, pitch: 0.16, twist: -0.2, roll: -0.05, flare: 1.15, head: 0.3, hood: 0.1, lx: -1.0, lz: -0.3, rx: -0.7, rz: 0.6, mouth: 0.6 });
const C3 = K({ push: -0.08, lift: -0.08, pitch: 0.1, flare: 0.85, head: 0.3, hood: -0.6, lx: -1.6, lz: -0.5, rx: -1.6, rz: -0.5, mouth: 0.8 });
const S3 = K({ push: 0.2, lift: -0.05, pitch: 0.55, flare: 1.5, head: 0.2, hood: 0.4, lx: 1.1, lz: 0.6, rx: 1.1, rz: 0.6, mouth: 1 });
const O3 = K({ push: 0.14, lift: -0.03, pitch: 0.4, flare: 1.3, head: 0.15, hood: 0.3, lx: 0.8, lz: 0.5, rx: 0.8, rz: 0.5, mouth: 0.6 });
const WAILS = [{ coil: C1, strike: S1, over: O1 }, { coil: C2, strike: S2, over: O2 }, { coil: C3, strike: S3, over: O3 }];
export const TEL = 54 / 60;
const STRIKE = 2.5 * FR, HOLD = 3 * FR, SNAP = 2.5 * FR, SETTLE = 6 * FR, RESTS = 0.15;
const COIL = TEL - STRIKE, ONE = COIL + STRIKE + HOLD + SNAP + SETTLE + RESTS;
const coilCurve = (k) => { const c = c01(k); return 0.85 * (1 - (1 - Math.min(1, c / 0.4)) ** 2) + 0.15 * c; };
const kick = (k) => { const c = c01(k); return 1 - (1 - c) ** 3; };
const settleC = (k) => { const c = c01(k); return smooth(c) - 0.12 * Math.sin(Math.PI * c) * (1 - c); };
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
function wailPose(V, t) {
  if (t < COIL) return mix(REST, V.coil, coilCurve(t / COIL));
  let a = t - COIL; if (a < STRIKE) return mix(V.coil, V.strike, kick(a / STRIKE));
  a -= STRIKE; if (a < HOLD) { const o = { ...V.strike }; o.lift += 0.012 * Math.sin(a * 60); return o; }
  a -= HOLD; if (a < SNAP) return mix(V.strike, V.over, 1 - (1 - a / SNAP) ** 2);
  a -= SNAP; if (a < SETTLE) return mix(V.over, REST, settleC(a / SETTLE));
  return { ...REST };
}
export const WAIL_AT = [TEL, ONE + TEL, 2 * ONE + TEL];
const wails = {
  dur: 3 * ONE, contact: WAIL_AT,
  phases: [['1, the keen: coils, the Ember cone marks', 0], ['the wail: 10 and slowed 40% for 2 s in the cone', TEL], ['settles', TEL + 0.18],
           ['2, the lament from its left: coils', ONE], ['the wail', ONE + TEL], ['settles', ONE + TEL + 0.18],
           ['3, the dirge: sinks, arms over its face', 2 * ONE], ['the wail', 2 * ONE + TEL], ['settles', 2 * ONE + TEL + 0.18]],
  pose: (t) => { const k = Math.min(2, Math.floor(t / ONE)); const g = wailPose(WAILS[k], t - k * ONE); return keener(t, g, { bob: 0.4 }); },
  feet: none,
};
export const MOUTH = (t) => { const k = Math.min(2, Math.floor(t / ONE)); return wailPose(WAILS[k], t - k * ONE).mouth; };

// ------------------------------------------------------------------------------------------------ hurt
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => {
    const k = track([[0, { p: 0, a: 0 }], [0.05, { p: 0.3, a: 0.5 }, 'out'], [0.17, { p: -0.08, a: -0.1 }], [0.4, { p: 0, a: 0 }]])(t);
    return addPose(keener(0), { oz: -0.04 * k.p / U, bp: 0.35 * k.p, sp: 0.2 * k.p, hp: 0.5 * k.p, k1p: 0.25 * k.p, k2p: 0.25 * k.p, k3p: 0.3 * k.p,
      alr: 0.4 * k.a, arr: -0.4 * k.a, alp: -0.25 * k.a, arp: -0.25 * k.a, flp: -0.2 * k.a, frp: -0.2 * k.a, qsx: 0.04 * k.a, qsy: -0.04 * k.a, qsz: 0.04 * k.a });
  },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ spawn
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.3, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['rises', 7 * FR], ['lifts its head', 0.55], ['glides', 1.0]],
  pose: (t) => { const up = smooth((t - 0.1) / 0.55), lift = pulse(t, 0.45, 0.7, 0.9, 1.25);
    return addPose(keener(t, REST, { oy: HOV * up }), { hp: 0.6 * (1 - up) - 0.3 * lift, cp: 0.2 * (1 - up), alr: 0.3 * lift, arr: -0.3 * lift }); },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it rears back with its head thrown up; the glide gives out:
// it sinks, the robe crumples and it topples forward onto its face, the arms splayed. Its lowest point per frame of the
// tip (LOW, from the probe build with the glide at 0) keeps it on the floor through the fall.
const TIP = 1.62;
function deathBody(t, a, go, hit) {
  const w = keener(0, REST, { bob: 0, oy: 0 });
  return addPose(w, {
    bp: -a + 0.25 * hit, hp: -0.5 * hit + 0.6 * go * c01(a / TIP), sp: 0.1 * hit, cr: 0.08 * go, hr: 0.25 * go,
    k1p: (0.5 - 0.55 * c01(a / TIP)) * go, k2p: (0.6 - 0.65 * c01(a / TIP)) * go, k3p: (0.5 - 0.5 * c01(a / TIP)) * go,
    alr: 0.3 * hit + 1.0 * go, arr: -0.3 * hit - 1.0 * go, alp: -0.2 * hit + 0.3 * go, arp: -0.2 * hit + 0.3 * go, flp: 0.2 * go, frp: 0.2 * go, nlp: 0.4 * go, nrp: 0.4 * go,
  });
}
const deathTip = (t) => TIP * c01((t - 0.3) / 0.55) ** 2;
const LOWT = 1 / 30;
const LOW = [-0.001,0.002,0.002,0.002,-0.000,-0.001,0.003,0.013,0.030,0.054,0.078,0.093,0.089,0.070,0.049,0.028,0.009,-0.005,-0.008,0.003,0.033,0.059,0.107,0.163,0.240,0.330,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336,0.336];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t / LOWT, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const deathPose = (t, probe) => {
  const hit = pulse(t, 0, 0.05, 0.12, 0.35), go = smooth((t - 0.08) / 0.32), a = deathTip(t);
  if (probe) return addPose(deathBody(t, a, go, hit), { oy: 0 });
  const sink = HOV - (HOV + 0.3) * c01((t - 0.12) / 0.5) ** 2;
  return addPose(deathBody(t, a, go, hit), { oy: Math.max(sink, -lowAt(t)) + 0.012 * bump(t, 0.9, 0.12) });
};
const death = {
  dur: 2.2, contact: [0.02, 0.85],
  phases: [['struck: rears back, head thrown up', 0], ['the glide gives out', 0.15], ['topples forward', 0.3], ['lands', 0.85], ['lies still', 1.1]],
  pose: (t) => deathPose(t, false),
  feet: none,
};
const probe = { dur: 2.2, pose: (t) => deathPose(t, true), feet: none };
export const CLIPS = process.env.PROBE ? { probe } : { idle, walk, turnL: turn(1), turnR: turn(-1), wails, hurt, spawn, death };
