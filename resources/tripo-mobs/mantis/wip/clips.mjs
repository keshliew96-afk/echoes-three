// The Spitting Mantis's moves. Units are model units (the model is 1 long; the page draws it CFG.unit times bigger).
// Timings come from the game: ENEMY_STATS.mantis in src/sim/enemies.js (1.6 u/s, a 42-tick telegraph, a shot every
// 2.5 s) and render/enemies/facet/mantis.js (the spit: rear and load to the coil, a 6-tick coil, a 5-tick strike whose
// contact lands on the resolve tick, held 2 frames, recoil 5 frames, settle 0.4 s; three variants, left blade leads,
// right blade leads, both crash; the head saccade every 0.9 s). A game frame is 1/30 s.
import * as THREE from 'three';
import { track, gaitFoot, V3, smooth, lerp, clamp, addPose, EASE } from '../kit/quad.mjs';
const FR = 1 / 30, TK = 1 / 60;
export const CFG = {
  name: 'mantis', unit: 1.1, base: {},
  chain: [['hips', 'b'], ['pron', 'p'], ['head', 'h']],
  extras: [['abd1', 'a1'], ['abd2', 'a2'], ['antL', 'nl'], ['antR', 'nr'], ['wingL', 'wl'], ['wingR', 'wr'],
    ['rCoxaL', 'cl'], ['rFemurL', 'fl'], ['rTibiaL', 'tl'], ['rCoxaR', 'cr'], ['rFemurR', 'fr'], ['rTibiaR', 'tr']],
  legs: {
    FL: { kind: 'limb', b: ['mFemurL', 'mTibiaL', 'mTarsusL', 'mClawL'] }, FR: { kind: 'limb', b: ['mFemurR', 'mTibiaR', 'mTarsusR', 'mClawR'] },
    HL: { kind: 'limb', b: ['hFemurL', 'hTibiaL', 'hTarsusL', 'hClawL'] }, HR: { kind: 'limb', b: ['hFemurR', 'hTibiaR', 'hTarsusR', 'hClawR'] },
  },
  springs: [{ bone: 'antL', k: 500, c: 9, max: 0.7 }, { bone: 'antR', k: 500, c: 9, max: 0.7 }, { bone: 'abd2', k: 420, c: 22, max: 0.3 }],
};
const U = CFG.unit;
const REST = { FL: V3(0.205, 0, 0.475), FR: V3(-0.205, 0, 0.475), HL: V3(0.29, 0, -0.355), HR: V3(-0.29, 0, -0.355) };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const plant = (p) => ({ p: p.clone(), lock: true });
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));

// The game's pose fields (mantis.js REST, REAR, COIL, STRIKE, OVER) on this rig. The forelegs: the game gives each
// segment's angle from straight down (pi/2 forward), so each joint here turns by its change from the game's guard,
// less its parent's. asp spreads the forelegs out, aln leans them out. wing fans the covers. ab curls the tail up.
const G = { push: 0, lift: 0, pitch: 0, roll: 0, hp: 0, hy: 0, ab: 0, pump: 0, ac: 1.05, af: 2.0, at: 0.7, asp: 0.5, aln: 0.32, wing: 0, jaw: 0 };
const K = (o) => ({ ...G, ...o });
const REARp = K({ push: -0.045, pitch: -0.17, hp: -0.22, ab: 0.14, pump: 1, ac: 1.55, af: 2.9, at: 1.45, asp: 0.62, aln: 0.44, wing: 0.85, jaw: 0.2 });
const COILp = K({ push: -0.065, pitch: -0.24, hp: -0.32, ab: 0.2, pump: 1, ac: 1.75, af: 3.02, at: 1.62, asp: 0.68, aln: 0.5, wing: 1, jaw: 0.35 });
const STRIKEp = K({ push: 0.06, pitch: 0.27, hp: 0.48, ab: -0.12, pump: -0.4, ac: 1.35, af: 1.5, at: -1.15, asp: 0.4, aln: 0.22, wing: 0.35, jaw: 1 });
const OVERp = K({ push: 0.02, pitch: 0.1, hp: -0.12, ab: 0.09, pump: 0.15, ac: 0.72, af: 2.3, at: 0.12, asp: 0.36, aln: 0.22, wing: 0.1, jaw: 0.3 });
const FS = 0.75; // the forelegs fold tighter on this model than the game's sticks; their swings are scaled to suit
function arm(g, s, sg) { // one foreleg's channels; sg +1 left, -1 right
  const dC = g.ac - G.ac, dF = g.af - G.af, dT = g.at - G.at;
  return { ['c' + s + 'p']: FS * dC, ['f' + s + 'p']: FS * (dF - dC), ['t' + s + 'p']: FS * (dT - dF),
    ['c' + s + 'y']: sg * 0.7 * (g.asp - G.asp), ['c' + s + 'r']: sg * 0.9 * (g.aln - G.aln) };
}
function game(g, lagR = null) {
  const o = { oz: g.push / U, oy: g.lift / U, bp: -0.75 * g.pitch, pp: -0.35 * g.pitch, br: g.roll, hp: -g.hp, hy: g.hy,
    a1p: -0.9 * g.ab - 0.03 * g.pump, a2p: -0.6 * g.ab + 0.05 * g.pump,
    wlp: -0.42 * g.wing, wly: -0.3 * g.wing, wlr: 0.35 * g.wing, wrp: -0.42 * g.wing, wry: 0.3 * g.wing, wrr: -0.35 * g.wing };
  return addPose(o, arm(g, 'l', 1), arm(lagR || g, 'r', -1));
}
// antennae: swept forward and out at rest; + lifts
const ants = (l, r = l, sl = 0, sr = sl) => ({ nlp: l, nrp: r, nly: sl, nry: -sr });

// ------------------------------------------------------------------------------------------------ idle
// The game's head saccade (Kesh's pick): the head holds a look, then snaps to the next in 4 ticks with one overshoot,
// a look every 0.9 s. Six looks a loop. Under it the body rocks, the abdomen breathes, the antennae sweep and twitch,
// and once a loop the left foreleg flicks (a grooming twitch).
const LOOKS = [0.0, 0.17, -0.12, 0.2, -0.19, 0.06];
const SAC = 0.9, SNAP = 4 * TK;
function saccade(t) {
  const n = Math.floor(t / SAC) % 6; const k = clamp((t - Math.floor(t / SAC) * SAC) / SNAP);
  const a = LOOKS[(n + 5) % 6]; return a + (LOOKS[n] - a) * EASE.back(k);
}
const idle = {
  dur: 6 * SAC, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / (6 * SAC), br = Math.sin(3 * w), look = saccade(t);
    const groom = pulse(t, 3.0, 3.18, 3.5, 3.75);
    return addPose(
      { oy: 0.003 * br, ox: 0.006 * Math.sin(w), br: 0.025 * Math.sin(w), bp: 0.01 * Math.sin(2 * w), pp: 0.012 * br },
      { hy: look, hr: 0.35 * look, py: 0.15 * look },
      { a1p: 0.03 * br, a2p: 0.04 * Math.sin(3 * w - 0.6) },
      ants(0.12 * Math.sin(4 * w) + 0.25 * bump(t, 1.8, 0.16), 0.12 * Math.sin(4 * w + 1.3) + 0.25 * bump(t, 4.5, 0.16), 0.1 * Math.sin(2 * w), 0.1 * Math.sin(2 * w + 2)),
      { clp: 0.015 * br + 0.35 * groom, flp: -0.4 * groom, tlp: 0.25 * groom + 0.15 * Math.sin(70 * t) * groom, crp: 0.015 * br },
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// The game's mantis walks its four walking legs in diagonal pairs (mantis.js groups [[0, 3], [1, 2]]) at 1.6 u/s;
// the forelegs are carried in the guard, never walked on.
const WT = 0.3;
const GAIT = { T: WT, duty: 0.52, v: 1.6 / U };
const GF = { FL: { phase: 0, n: [0.205, 0.475], lift: 0.06, droop: 0.5 }, HR: { phase: 0.02, n: [-0.29, -0.355], lift: 0.05, droop: 0.4 },
             FR: { phase: 0.5, n: [-0.205, 0.475], lift: 0.06, droop: 0.5 }, HL: { phase: 0.52, n: [0.29, -0.355], lift: 0.05, droop: 0.4 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT;
    return addPose(
      { oy: -0.004 + 0.005 * Math.cos(2 * w - 0.5), oz: 0.008, bp: 0.03, br: 0.025 * Math.sin(w + 0.3), by: 0.03 * Math.sin(w) },
      { pp: 0.02 * Math.sin(2 * w + 0.8), py: -0.03 * Math.sin(w), hy: 0.02 * Math.sin(w), hp: 0.02 },
      { a1p: 0.03 * Math.sin(2 * w + 1), a2p: 0.03 * Math.sin(2 * w + 0.3), a1y: -0.03 * Math.sin(w) },
      ants(-0.1 + 0.06 * Math.sin(2 * w), -0.1 + 0.06 * Math.sin(2 * w + 0.5), 0.05, 0.05),
      { clp: 0.03 * Math.sin(2 * w + 1.5), crp: 0.03 * Math.sin(2 * w + 1.5) },
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const g = { T: 0.35, duty: 0.55, v: 0, omega: dir * 2 * Math.PI / 1.8, pivot: [0, 0.05] };
  return {
    dur: 0.35, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / 0.35;
      return addPose({ oy: -0.004 + 0.003 * Math.cos(2 * w), br: 0.02 * Math.sin(w) - 0.02 * dir },
        { py: 0.08 * dir, hy: 0.18 * dir, hr: 0.06 * dir, a1y: -0.12 * dir, a2y: -0.08 * dir }, ants(-0.05, -0.05, 0.1 * dir, -0.1 * dir)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, { ...GF[k], lift: 0.045 })])),
  };
};

// ------------------------------------------------------------------------------------------------ the spit
const REAR_SEC = (42 - 6 - 5) * TK, COIL_SEC = 6 * TK, CONTACT = 42 * TK, HOLD = 2 * FR, RECOIL = 5 * FR, SETTLE = 0.4, TRAIL = 2 * TK;
const SPIT_END = CONTACT + HOLD + RECOIL + SETTLE;
const lerpG = (a, b, u) => Object.fromEntries(Object.keys(G).map((k) => [k, a[k] + (b[k] - a[k]) * u]));
// render/facet/beats.js settle: one overshoot back into the guard
const settleK = (k) => 1 - (1 - k) ** 3 * Math.cos(1.6 * k) + 0.06 * Math.sin(Math.PI * k) * (1 - k);
function spitPose(ts) { // the game's mantisSpitPose without the variant lean, on its own timeline
  if (ts < REAR_SEC) { const k = ts / REAR_SEC; const o = lerpG(G, REARp, EASE.io(k)); o.pump = k * (0.5 - 0.5 * Math.cos(Math.PI * 5 * k)); return o; }
  if (ts < REAR_SEC + COIL_SEC) return lerpG(REARp, COILp, EASE.out((ts - REAR_SEC) / COIL_SEC));
  if (ts < CONTACT) return lerpG(COILp, STRIKEp, EASE.in((ts - REAR_SEC - COIL_SEC) / (CONTACT - REAR_SEC - COIL_SEC)));
  if (ts < CONTACT + HOLD) return { ...STRIKEp };
  if (ts < CONTACT + HOLD + RECOIL) return lerpG(STRIKEp, OVERp, EASE.out((ts - CONTACT - HOLD) / RECOIL));
  return lerpG(OVERp, G, clamp(settleK(clamp((ts - CONTACT - HOLD - RECOIL) / SETTLE))));
}
function env(ts) {
  if (ts < REAR_SEC + COIL_SEC) return 0;
  if (ts < CONTACT) return EASE.in((ts - REAR_SEC - COIL_SEC) / (CONTACT - REAR_SEC - COIL_SEC));
  if (ts < CONTACT + HOLD) return 1;
  if (ts < CONTACT + HOLD + RECOIL) return 1 - 0.5 * EASE.out((ts - CONTACT - HOLD) / RECOIL);
  return 0.5 * (1 - EASE.io(clamp((ts - CONTACT - HOLD - RECOIL) / SETTLE)));
}
// the shot squash's shove (render/facet/foe.js shotSquash: the shooter shoved back, eased out over 0.45 s)
const shove = (age, big) => (age < 0 || age > 0.5 ? 0 : -big * 0.035 * Math.sin(Math.PI * Math.min(1, age / 0.1) / 2) * (1 - smooth((age - 0.1) / 0.35)));
const spit = (lead) => ({
  dur: SPIT_END, contact: lead ? [CONTACT, CONTACT + TRAIL] : [CONTACT],
  phases: [['rear and load (the warning)', 0], ['coil', REAR_SEC], ['strike', REAR_SEC + COIL_SEC], ['contact: the spit', CONTACT], ['recoil past the guard', CONTACT + HOLD], ['settle into the guard', CONTACT + HOLD + RECOIL]],
  pose: (t) => {
    const g = spitPose(t); const e = env(t);
    // the trailing blade lands TRAIL later (A: the right trails the left; B: the left trails the right)
    const late = spitPose(Math.max(0, t - TRAIL));
    if (lead) { g.roll -= lead * 0.08 * e; g.hy += lead * 0.1 * e; } else { g.pitch += 0.06 * e; g.push += 0.015 * e; }
    g.push += shove(t - CONTACT, lead ? 1 : 1.5);
    const o = lead === 1 ? game(g, { ...g, ...pick(late) }) : lead === -1 ? swapArms(game({ ...g }), game({ ...g, ...pick(late) })) : game(g);
    // the head locks on and the antennae lay back through the warning; the jaws' flare is the head's kick on contact
    const lock = pulse(t, 0, 4 * TK, CONTACT + HOLD, CONTACT + HOLD + RECOIL + 0.2);
    const kick = bump(t, CONTACT + FR, 3 * FR);
    return addPose(o, ants(-0.35 * lock, -0.35 * lock, -0.15 * lock, -0.15 * lock), { hp: -0.12 * kick });
  },
  feet: allPlanted,
});
const ARMF = ['ac', 'af', 'at', 'asp', 'aln'];
const pick = (g) => Object.fromEntries(ARMF.map((k) => [k, g[k]]));
function swapArms(lead, trail) { // B: the right blade leads, the left trails
  const o = { ...lead }; for (const c of ['cl', 'fl', 'tl']) for (const a of 'pyr') { const k = c + a; if (k in trail) o[k] = trail[k]; } return o;
}

// ------------------------------------------------------------------------------------------------ hurt
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { pp: 0.12, hp: 0.22, hy: -0.25, hr: -0.2, a1p: 0.15, clp: 0.35, crp: 0.35, flp: 0.3, frp: 0.3, wlp: -0.15, wrp: -0.15 }, 'out'], [0.17, { pp: -0.03, hp: -0.05, hy: 0.05, clp: -0.06, crp: -0.06 }], [0.4, {}]])(t),
    ants(-0.4 * pulse(t, 0, 0.04, 0.16, 0.34), -0.4 * pulse(t, 0, 0.04, 0.16, 0.34))),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ spawn
const SG = 7 * FR;
const spawn = {
  dur: 1.2, contact: [], scale: (t) => (t < SG ? lerp(0.04, 1.1, EASE.out(clamp(t / (SG * 0.75)))) : lerp(1.1, 1, smooth((t - SG) / 0.12))),
  phases: [['grow', 0], ['rise', SG], ['blades out', 0.5], ['guard', 0.85]],
  pose: (t) => {
    const k = track([[0, { oy: -0.06, bp: 0.15, pp: 0.25, hp: 0.4, clp: -0.5, flp: 0.4, tlp: 0.2, crp: -0.5, frp: 0.4, trp: 0.2, a1p: 0.2 }], [SG, { oy: -0.06, bp: 0.15, pp: 0.25, hp: 0.4, clp: -0.5, flp: 0.4, tlp: 0.2, crp: -0.5, frp: 0.4, trp: 0.2, a1p: 0.2 }],
      [0.5, { oy: 0.0, bp: -0.06, pp: -0.05, hp: -0.15, clp: 0.25, flp: 0.35, tlp: 0.5, crp: 0.25, frp: 0.35, trp: 0.5, a1p: -0.1 }, 'out'], [0.72, { clp: 0.3, flp: -0.25, tlp: -0.35, crp: 0.3, frp: -0.25, trp: -0.35, hp: 0.05 }], [1.2, {}]])(t);
    const fan = pulse(t, 0.45, 0.6, 0.75, 1.0);
    return addPose(k, { wlp: -0.4 * fan, wly: -0.25 * fan, wlr: 0.3 * fan, wrp: -0.4 * fan, wry: 0.25 * fan, wrr: -0.3 * fan }, ants(0.3 * pulse(t, 0.3, 0.45, 0.7, 1.0)));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// The legs give. The forelegs fly open, the head jerks back, the body drops onto its belly with the walking legs
// splaying out flat, it tips onto its left side, the legs curl in with a few twitches, the wings slip half open.
const DROP = 0.31; // the hips come down until the belly lies on the floor
const death = {
  dur: 2.2, contact: [0.55], phases: [['jolt', 0], ['collapse', 0.15], ['down', 0.55], ['twitch', 0.8], ['still', 1.7]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.1, { bp: 0.1, pp: 0.25, hp: -0.4, hy: 0.2, clp: 0.6, flp: 0.6, tlp: 0.6, crp: 0.5, frp: 0.5, trp: 0.5, cly: 0.2, cry: -0.2, a1p: -0.25 }, 'out'],
      [0.55, { oy: -DROP, bp: -0.05, pp: -0.2, hp: 0.25, hy: 0.15, clp: 0.1, flp: -0.3, tlp: 0.1, crp: 0.1, frp: -0.25, trp: 0.1, a1p: 0.12, a2p: 0.1 }, 'in'],
      [0.75, { oy: -DROP + 0.01, br: 0.3, bp: -0.05, pp: -0.28, hp: 0.35, hy: 0.25, hr: 0.25, clp: 0.2, flp: -0.6, tlp: -0.2, crp: 0.15, frp: -0.5, trp: -0.15, a1p: 0.05, a2p: 0.05 }],
      [1.7, { oy: -DROP + 0.012, br: 0.42, bp: -0.05, pp: -0.32, hp: 0.4, hy: 0.25, hr: 0.3, clp: 0.3, flp: -0.85, tlp: -0.3, crp: 0.25, frp: -0.75, trp: -0.25, a1p: 0.05, a2p: 0.08 }],
      [2.2, { oy: -DROP + 0.012, br: 0.42, bp: -0.05, pp: -0.32, hp: 0.42, hy: 0.25, hr: 0.3, clp: 0.3, flp: -0.87, tlp: -0.32, crp: 0.25, frp: -0.77, trp: -0.27, a1p: 0.05, a2p: 0.08 }]])(t);
    const tw = Math.sin(31 * t) * pulse(t, 0.75, 0.8, 1.4, 1.7);
    const open = smooth((t - 0.6) / 0.6);
    return addPose(k, { tlp: 0.12 * tw, trp: -0.1 * tw }, { wlp: -0.12 * open, wly: -0.15 * open, wlr: 0.2 * open, wrp: -0.08 * open, wry: 0.1 * open, wrr: -0.1 * open }, ants(-0.5 * smooth((t - 0.5) / 0.8), -0.45 * smooth((t - 0.5) / 0.8)));
  },
  feet: (t) => {
    // the feet skid out as the body drops (the legs splay flat), then curl in a little as it dies
    const out = { FL: V3(0.12, 0, 0.06), FR: V3(-0.12, 0, 0.06), HL: V3(0.1, 0, -0.04), HR: V3(-0.1, 0, -0.04) };
    const curl = { FL: V3(-0.06, 0.03, -0.05), FR: V3(0.06, 0.03, -0.05), HL: V3(-0.06, 0.03, 0.04), HR: V3(0.06, 0.03, 0.04) };
    const F = {};
    for (const k of LEGS) {
      const u = smooth((t - 0.12) / 0.43), c = smooth((t - 0.8) / 0.9);
      const tw = 0.02 * Math.sin(29 * t + LEGS.indexOf(k) * 1.7) * pulse(t, 0.75, 0.8, 1.4, 1.7);
      const p = REST[k].clone().addScaledVector(out[k], u).addScaledVector(curl[k], c); p.y += Math.max(0, tw);
      F[k] = { p, pitch: 0.2 * c, lock: t < 0.12 };
    }
    return F;
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), spitA: spit(1), spitB: spit(-1), spitC: spit(0), hurt, spawn, death };
