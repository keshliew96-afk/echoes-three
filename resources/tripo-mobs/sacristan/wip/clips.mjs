// The Bell Sacristan's moves. Units are model units (the model is 1 tall; the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/sacristan.js (walks at 1.05 u/s; with kin near it marks the Vesper Hush,
// a pale ring r 3.6 round itself for 54 ticks, then rings: every other enemy inside is hushed for 5 s; alone it walks in
// and raps a hero with its bell, a cone r 1.6 at a half-angle of 60° for 36 ticks, for 7) and its rig buildSacristan in
// src/render/enemies/spire.js (a shuffling stoop, the waist bent 0.42 forward and the neck 0.25, the bell carried low
// and tinkling; the hush draws it up straight with the head tipped back, the bell up and ringing slow wide arcs; the
// ring a shudder that ebbs over 0.9 s; the rap: the bell drawn back with the waist turned, then swung down hard on you
// in 0.08 s and back over 0.37 s).
// The game's acolyte rings with one hand and hushes with the other; yours holds the bell in both hands, so the hands
// move as one grip (a point and a turn in the chest's frame) and the two arms reach for it.
import * as THREE from 'three';
import { V3, smooth, clamp, lerp, addPose, track, EASE } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'sacristan', unit: 1.25,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['skL', 'kl'], ['skR', 'kr']],
  legs: {
    AL: { kind: 'limb', b: ['armL', 'foreL', 'handL', 'fingL'], pole: [1, -0.4, -0.6] },
    AR: { kind: 'limb', b: ['armR', 'foreR', 'handR', 'fingR'], pole: [-1, -0.4, -0.6] },
  },
  springs: [],
};
const U = CFG.unit;
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const approach = (k, to, rate, dt) => k + (to - k) * (1 - Math.exp(-rate * dt));

// the grip in the bind pose: where the clasped hands hold the handle, and each hand's fingertip and shoulder
const G0 = V3(0, 0.62, 0.09);
const TIP = { AL: V3(-0.01, 0.64, 0.115), AR: V3(0.01, 0.64, 0.115) };
const SH = { AL: V3(0.09, 0.67, -0.03), AR: V3(-0.09, 0.67, -0.03) };
// The grip: g = { x, y, z } (where the hands are, model units in the chest's frame), and its turn: tip (- swings the bell
// out in front, + back toward its chest), roll (+ toward its right), yaw. Both hands follow it.
const qE = (tip, yaw, roll) => new THREE.Quaternion().setFromEuler(new THREE.Euler(tip, yaw, roll, 'YXZ'));
function arms(B, g) {
  const Qc = B.parQ('AL'), Q = Qc.clone().multiply(qE(g.tip || 0, g.yaw || 0, g.roll || 0));
  const out = {};
  for (const k of ['AL', 'AR']) {
    // the grip point in the world: from this arm's shoulder through the chest's turn
    const Gw = B.legRoot(k).add(V3(g.x, g.y, g.z).sub(SH[k]).applyQuaternion(Qc));
    out[k] = { p: Gw.add(TIP[k].clone().sub(G0).applyQuaternion(qE(g.tip || 0, g.yaw || 0, g.roll || 0)).applyQuaternion(Qc)), q: Q.clone(), under: true };
  }
  return out;
}
const REST_G = { x: G0.x, y: G0.y, z: G0.z, tip: 0, yaw: 0, roll: 0 };
const mixG = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u), tip: lerp(a.tip, b.tip, u), yaw: lerp(a.yaw, b.yaw, u), roll: lerp(a.roll, b.roll, u) });
const addG = (a, d) => ({ x: a.x + (d.x || 0), y: a.y + (d.y || 0), z: a.z + (d.z || 0), tip: a.tip + (d.tip || 0), yaw: a.yaw + (d.yaw || 0), roll: a.roll + (d.roll || 0) });

// The game's pose fields on this rig: waist (+ bends forward; the spine and chest share it), waistY (+ turns to its
// left), waistZ (sway), neck (+ bows the head; the neck and head share it), bob (model units up).
function body(o) {
  const w = o.waist || 0, n = o.neck || 0;
  return { sp: -0.45 * w, cp: -0.55 * w, sy: 0.5 * (o.waistY || 0), cy: 0.5 * (o.waistY || 0), sr: o.waistZ || 0, np: -0.5 * n, hp: -0.5 * n, oy: o.bob || 0, ny: o.look || 0, hy: 0.5 * (o.look || 0) };
}
// Where the hands carry the bell when it is not ringing: low before its waist, the bell tinkling (the game's right arm
// at -0.35, the bell pivot swinging 0.18 at 3 rad/s and rocking 0.12 sideways).
const TEND_G = { x: 0, y: 0.6, z: 0.1, tip: 0.05, yaw: 0, roll: 0 };
const tinkle = (t, a = 1) => ({ tip: 0.18 * a * Math.sin(3.0 * t), roll: 0.12 * a * Math.sin(1.7 * t) });

// ------------------------------------------------------------------------------------------------ idle
// 4.2 s. The game's tend: the shuffling stoop (waist 0.42, neck 0.25), a slow sway (the game's 1.3 rad/s, here 1.5 so
// the loop closes), the head nodding and the bell carried low and tinkling (3 rad/s, here 3.0). On top (mine): it lifts
// its head to look about once.
const ID = 2 * Math.PI / 1.5;
const idle = {
  dur: ID, loop: true,
  pose: (t) => { const w = TAU * t / ID, look = 0.35 * pulse(t, 0.8, 1.2, 1.7, 2.1) - 0.3 * pulse(t, 2.2, 2.6, 3.0, 3.4);
    return body({ waist: 0.42 + 0.04 * Math.sin(w), neck: 0.25 + 0.05 * Math.sin(w + 0.5) - 0.2 * Math.abs(look), look }); },
  feet: (t, B) => { const w = TAU * t / ID; return arms(B, addG(TEND_G, { tip: 0.18 * Math.sin(2 * w), roll: 0.12 * Math.sin(w + 1) })); },
};

// ------------------------------------------------------------------------------------------------ walk and turn
// The game's shuffle at 1.05 u/s: the stoop, a sway side to side with each step (waistZ 0.05), a small bob, the hem
// swinging over the feet under it, the bell swaying with the step (the arm -0.1 with the step). 0.8 s a stride (mine).
const WT = 0.8;
const walk = {
  dur: WT, loop: true, gait: { T: WT, v: 1.05 / U },
  pose: (t) => { const s = Math.sin(TAU * t / WT);
    return addPose(body({ waist: 0.46, neck: 0.22, waistZ: 0.05 * s, bob: 0.016 * Math.abs(s) / U }), { klp: 0.16 * s, krp: -0.16 * s, br: 0.015 * s }); },
  feet: (t, B) => { const s = Math.sin(TAU * t / WT); return arms(B, addG(TEND_G, { tip: 0.18 * Math.sin(TAU * 2 * t / WT) + 0.1 * s, roll: 0.06 * s })); },
};
const turn = (dir) => ({
  dur: 0.8, loop: true, gait: { T: 0.8, v: 0, omega: dir * Math.PI, pivot: [0, 0] },
  pose: (t) => { const s = Math.sin(TAU * t / 0.8);
    return addPose(body({ waist: 0.44, neck: 0.22, waistZ: 0.04 * s, look: 0.15 * dir, bob: 0.012 * Math.abs(s) / U }), { klp: 0.1 * s, krp: -0.1 * s, by: 0.06 * dir }); },
  feet: (t, B) => arms(B, addG(TEND_G, { tip: 0.15 * Math.sin(TAU * 2 * t / 0.8), roll: -0.06 * dir })),
});

// ------------------------------------------------------------------------------------------------ the Vesper Hush
// The game's hush: through the 54-tick pale ring it draws itself up straight (the waist 0.08), tips its head back
// (neck -0.45) and lifts the bell, ringing it in slow wide arcs (the swing 0.78, the ring phase speeding to 7.5 rad/s);
// it rings at the ring's end: a shudder that ebbs over 0.9 s and the bell brought down a little; then back to its stoop.
// The game lifts the bell over its head; your arms reach only to its face, so it rings the bell up before its face.
const HT = 54 / 60, HUSH_END = HT + 0.9 + 0.5;
const HUSH_G = { x: 0, y: 0.75, z: 0.18, tip: -0.25, yaw: 0, roll: 0 };
function hushK(t) { // the game's approach at 7/s while the telegraph runs, then out
  let k = 0; const dt = 1 / 120; for (let s = 0; s < t; s += dt) k = approach(k, s < HT ? c01(s / HT) : 0, 7, dt); return k;
}
const HK = []; for (let i = 0; i <= Math.ceil(HUSH_END * 60); i++) HK.push(hushK(i / 60));
const hk = (t) => { const f = clamp(t * 60, 0, HK.length - 1), i = Math.floor(f), j = Math.min(HK.length - 1, i + 1); return HK[i] + (HK[j] - HK[i]) * (f - i); };
const ringPh = (t) => { let ph = 0; const dt = 1 / 120; for (let s = 0; s < t; s += dt) ph += dt * (3.0 + 4.5 * hk(s)); return ph; };
const RP = []; for (let i = 0; i <= Math.ceil(HUSH_END * 60); i++) RP.push(ringPh(i / 60));
const rp = (t) => { const f = clamp(t * 60, 0, RP.length - 1), i = Math.floor(f), j = Math.min(RP.length - 1, i + 1); return RP[i] + (RP[j] - RP[i]) * (f - i); };
const hush = {
  dur: HUSH_END, contact: [HT],
  phases: [['the hush (the pale ring): it draws up and rings the bell', 0], ['it rings: the hush falls', HT], ['the note ebbs', HT + 0.3], ['back to its stoop', HT + 0.9]],
  pose: (t) => { const k = hk(t), tend = 1 - k, ra = t - HT, rung = ra >= 0 && ra < 0.9 ? Math.exp(-ra * 4) : 0, back = smooth((t - HT - 0.6) / 0.6);
    const up = Math.max(k, (1 - back) * (t > HT ? 1 : 0) * 0.85);
    return addPose(body({ waist: 0.42 * (1 - up) + 0.08 * up + 0.04 * rung, neck: 0.25 * (1 - up) - 0.45 * up + 0.15 * rung }), { sr: 0.03 * rung * Math.sin(ra * 28) }); },
  feet: (t, B) => { const k = hk(t), ra = t - HT, rung = ra >= 0 && ra < 0.9 ? Math.exp(-ra * 4) : 0, back = smooth((t - HT - 0.6) / 0.6);
    const up = Math.max(k, (1 - back) * (t > HT ? 1 : 0) * 0.85), swing = Math.sin(rp(t));
    let g = mixG(TEND_G, HUSH_G, smooth(up));
    g = addG(g, { tip: (0.18 + 0.6 * up) * swing * (1 - rung) + 0.4 * rung * Math.sin(ra * 28), roll: 0.25 * up * swing, y: -0.05 * rung });
    return arms(B, g); },
};

// ------------------------------------------------------------------------------------------------ the rap
// The game's rap: through the 36-tick cone it draws the bell back over its right shoulder with the waist turned
// (-0.35) and bent in (0.25); at the cone's end it swings it down hard on you in 0.08 s (the waist +0.55, the bell
// swung out), then back over 0.37 s. Contact on the cone's end (7).
const RT = 36 / 60, RAP_END = RT + 0.45 + 0.35;
const BACK_G = { x: -0.04, y: 0.67, z: 0.08, tip: 1.0, yaw: 0, roll: 0.35 };
const HIT_G = { x: 0, y: 0.58, z: 0.22, tip: -1.2, yaw: 0, roll: 0 };
function rapK(t) { let k = 0; const dt = 1 / 120; for (let s = 0; s < t; s += dt) k = approach(k, s < RT ? c01(s / RT) : 0, 12, dt); return k; }
const RK = []; for (let i = 0; i <= Math.ceil(RAP_END * 60); i++) RK.push(rapK(i / 60));
const rk = (t) => { const f = clamp(t * 60, 0, RK.length - 1), i = Math.floor(f), j = Math.min(RK.length - 1, i + 1); return RK[i] + (RK[j] - RK[i]) * (f - i); };
const rapA = (t) => { const ka = t - RT; return ka < 0 ? 0 : ka < 0.08 ? smooth(ka / 0.08) : ka < 0.45 ? 1 - smooth((ka - 0.08) / 0.37) : 0; };
const rap = {
  dur: RAP_END, contact: [RT + 0.08],
  phases: [['the rap (the cone): the bell drawn back', 0], ['swung down on you', RT], ['contact', RT + 0.08], ['back', RT + 0.2], ['its stoop', RT + 0.45]],
  pose: (t) => { const k = t < RT ? rk(t) : rk(RT) * (1 - smooth((t - RT) / 0.1)), a = rapA(t), tend = 1 - Math.max(k, a);
    return body({ waist: 0.42 * tend + 0.25 * k - 0.15 * k * (1 - a) + 0.55 * a, waistY: -0.35 * k * (1 - a) + 0.2 * a, neck: 0.25 * tend + 0.2 * a }); },
  feet: (t, B) => { const k = t < RT ? rk(t) : rk(RT) * (1 - smooth((t - RT) / 0.1)), a = rapA(t);
    let g = mixG(TEND_G, BACK_G, smooth(k)); if (a > 0) g = mixG(g, HIT_G, a);
    return arms(B, g); },
};

// ------------------------------------------------------------------------------------------------ hurt
// Played on top of anything: the head and shoulders jolt back. The arms stay on the bell.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { cp: 0.12, np: 0.15, hp: 0.1, hr: 0.12, sr: 0.04 }, 'out'], [0.16, { cp: -0.03, np: -0.04, hp: -0.03, hr: -0.03 }], [0.4, {}]])(t),
  feet: (t, B) => arms(B, TEND_G),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames (render/facet/foe.js SPAWN_SEC), about 10% over. On top (mine):
// it comes up bowed low, straightens into its stoop and gives the bell one small ring.
const SPN = 7 * FR;
const spawn = {
  dur: 1.3, contact: [0.8], scale: (t) => (t < SPN ? lerp(0.04, 1.1, EASE.out(clamp(t / (SPN * 0.75)))) : lerp(1.1, 1, smooth((t - SPN) / 0.12))),
  phases: [['grow', 0], ['straightens', SPN + 0.1], ['one ring', 0.8], ['tends', 1.0]],
  pose: (t) => body({ waist: lerp(0.8, 0.42, smooth((t - SPN) / 0.5)), neck: lerp(0.5, 0.25, smooth((t - 0.3) / 0.5)) }),
  feet: (t, B) => { const r = t - 0.8, rung = r > 0 ? Math.exp(-r * 5) : 0; return arms(B, addG(TEND_G, { tip: 0.4 * rung * Math.sin(r * 28) - 0.15 * pulse(t, 0.6, 0.75, 0.8, 0.9) })); },
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game crumbles it where it stoops; the hand bell drops and rings once). Struck, it straightens with a jolt,
// then folds forward at the waist, sinking as its knees go under the robe, and topples onto its face, the bell
// hugged to its chest ringing on the floor under it. How far the body sinks is probed so the lowest point rests on the floor.
const LOW = [0.000,-0.010,-0.016,-0.018,-0.016,-0.013,-0.008,-0.002,0.001,0.000,0.000,0.000,0.001,0.001,-0.001,-0.002,-0.002,-0.001,0.001,0.002,-0.000,-0.003,-0.007,-0.010,-0.011,-0.009,-0.003,0.009,0.029,0.059,0.099,0.094,0.090,0.088,0.088,0.088,0.088,0.088,0.088,0.089,0.089,0.089,0.089,0.089,0.090,0.090,0.090,0.090,0.091,0.091,0.091,0.091,0.092,0.092,0.092,0.092,0.092,0.092,0.092,0.092,0.093];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t * 30, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
const DT = { fold: 0.25, fall: 0.6, down: 1.0, end: 2.0 };
const death = {
  dur: DT.end, contact: [DT.down], phases: [['struck', 0], ['folds', DT.fold], ['topples', DT.fall], ['the bell rings on the floor', DT.down], ['still', 1.4]],
  pose: (t) => {
    const k = track([[0, { bp: 0 }], [0.1, { bp: 0.12, np: 0.2 }, 'out'], [DT.fold, { bp: 0.0, np: 0.0 }], [DT.fall, { bp: -0.25, sp: -0.3, cp: -0.3, np: -0.2 }],
      [DT.down, { bp: -1.45, sp: -0.05, cp: -0.05, np: 0.15, hp: 0.1, hr: 0.25 }, 'in'], [DT.down + 0.12, { bp: -1.4, sp: -0.05, cp: -0.05, np: 0.2, hp: 0.12, hr: 0.3 }, 'out'],
      [DT.end, { bp: -1.42, sp: -0.05, cp: -0.05, np: 0.18, hp: 0.1, hr: 0.3 }]])(t);
    k.klp = 0.25 * smooth((t - DT.fold) / 0.4); k.krp = 0.25 * smooth((t - DT.fold) / 0.4);
    if (process.env.PROBE) { k.oy = 0; return k; }
    k.oy = -lowAt(t) + 0.01 * Math.exp(-Math.max(0, t - DT.down) * 8) * (t > DT.down ? 1 : 0);
    return k;
  },
  feet: (t, B) => { const u = smooth((t - DT.fold) / 0.6); return arms(B, addG(mixG(TEND_G, { x: 0, y: 0.6, z: 0.09, tip: 0.5, yaw: 0, roll: 0 }, u), { tip: 0.3 * Math.exp(-Math.max(0, t - DT.down) * 5) * Math.sin((t - DT.down) * 30) * (t > DT.down ? 1 : 0) })); },
};

export const CLIPS = process.env.PROBE ? { probe: death } : { idle, walk, turnL: turn(1), turnR: turn(-1), hush, rap, hurt, spawn, death };
