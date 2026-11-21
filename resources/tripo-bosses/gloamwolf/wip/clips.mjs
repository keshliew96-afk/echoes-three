// The Gloam Wolf's moves. Units are model units (the model is 1 long; the page draws it 2.3 u long, CFG.unit, which
// puts its hips at the game rig's 1.15 u). Timings come from the game: GLOAMWOLF in src/sim/bosses/gloamwolf.js
// (stalk 1.7 u/s, 2.1 enraged; Pounce: 54-tick warning, the last 16 ticks are the bound; Rend: 36-tick warning;
// Moon Howl: 60-tick warning), the phases of render/boss/gloamwolffacet.js, and the beats in render/facet/beats.js
// (strike 2.5 frames, contact held 3 frames).
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, frac } from '../../kit/quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_, GATHER = 1.5 * FR_;
export const CFG = {
  name: 'gloamwolf', unit: 2.3, base: { oy: -0.012, by: 0.035 },
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck1', 'n1'], ['neck2', 'n2'], ['head', 'h']],
  extras: [['jaw', 'j'], ['earL', 'el'], ['earR', 'er'], ['tail1', 't1'], ['tail2', 't2'], ['tail3', 't3'], ['maneF', 'mf'], ['maneR', 'mr']],
  scales: [['maneF', 'mfs'], ['maneR', 'mrs']],
  legs: {
    // a wolf's foreleg folds at the elbow (pointing back) and the wrist follows by rule, like a hind leg mirrored
    FL: { kind: 'hind', bend: -1, kcs: 0.55, kcf: -1.1, b: ['fUpperL', 'fForeL', 'fCannonL', 'fHoofL'] }, FR: { kind: 'hind', bend: -1, kcs: 0.55, kcf: -1.1, b: ['fUpperR', 'fForeR', 'fCannonR', 'fHoofR'] },
    HL: { kind: 'hind', b: ['hThighL', 'hShinL', 'hCannonL', 'hHoofL'] }, HR: { kind: 'hind', b: ['hThighR', 'hShinR', 'hCannonR', 'hHoofR'] },
  },
  springs: [{ bone: 'earL', k: 420, c: 16, max: 0.6 }, { bone: 'earR', k: 420, c: 16, max: 0.6 },
    { bone: 'tail1', k: 150, c: 9, max: 0.8 }, { bone: 'tail2', k: 120, c: 7, max: 0.9 }, { bone: 'tail3', k: 100, c: 6, max: 1.0 },
    { bone: 'maneF', k: 520, c: 10, max: 0.35 }, { bone: 'maneR', k: 460, c: 9, max: 0.35 }],
};
const REST = { FL: V3(0.08, 0, 0.205), FR: V3(-0.08, 0, 0.205), HL: V3(0.11, 0, -0.265), HR: V3(-0.11, 0, -0.265) };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
// ears: back lays them flat, out opens them to the sides
const ears = (backL = 0, outL = 0, backR = backL, outR = outL) => ({ elp: backL, elr: -outL, erp: backR, err: outR });
// hackles: up stands the bramble mane and swells it; rattle shakes it
const hackles = (up = 0, rattle = 0, ph = 0) => ({ mfp: -0.3 * up + rattle * Math.sin(ph), mrp: -0.36 * up + rattle * Math.sin(ph - 1.1), mfs: 0.16 * up, mrs: 0.2 * up, mfr: 0.6 * rattle * Math.cos(ph), mrr: -0.6 * rattle * Math.cos(ph - 1.1) });
// the tail hangs: lift raises it behind, wag swings it, curl bends the tip on
const tail = (lift = 0, wag = 0, curl = 0) => ({ t1p: -lift, t2p: -0.5 * lift - curl, t3p: -0.3 * lift - curl, t1r: wag, t2r: 0.6 * wag, t3r: 0.4 * wag });
const jaw = (open = 0) => ({ jp: -0.5 * open });
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.9); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const I = new THREE.Quaternion();

// ------------------------------------------------------------------------------------------------ idle
// 6 s. It never quite stands still: slow breath, the weight eases from side to side, the head swings to scan left and
// then right with the ears turning first, it lifts its nose to taste the air, licks its teeth, and the tail tip twitches.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const lookL = pulse(t, 0.5, 1.0, 1.7, 2.3), lookR = pulse(t, 2.6, 3.1, 3.7, 4.3), sniff = pulse(t, 4.5, 4.8, 5.3, 5.7), nose = Math.sin(24 * t) * pulse(t, 4.75, 4.9, 5.25, 5.4);
    const lick = bump(t, 2.45, 0.34);
    return addPose(
      { oy: 0.004 * br, cp: 0.014 * br, sp: -0.008 * br, ox: 0.012 * sw, br: 0.02 * sw, by: 0.012 * Math.sin(w + 1), sy: 0.015 * Math.sin(w + 0.6) },
      { n1p: -0.05 - 0.01 * br + 0.1 * sniff, n2p: 0.1 * sniff, hp: 0.02 + 0.22 * sniff + 0.025 * nose, n1y: 0.14 * lookL - 0.14 * lookR, n2y: 0.16 * lookL - 0.16 * lookR, hy: 0.22 * lookL - 0.22 * lookR, hr: 0.07 * lookL - 0.07 * lookR },
      jaw(0.1 + 0.03 * br + 0.5 * lick),
      ears(0.5 * bump(t, 0.45, 0.3) + 0.3 * bump(t, 2.55, 0.3) - 0.1 * sniff, 0.35 * bump(t, 0.45, 0.3), 0.3 * bump(t, 0.45, 0.3) + 0.5 * bump(t, 2.55, 0.3) - 0.1 * sniff, 0.35 * bump(t, 2.55, 0.3)),
      tail(0.05 + 0.03 * br, 0.1 * sw + 0.22 * bump(t, 1.3, 0.3) - 0.22 * bump(t, 1.55, 0.3) + 0.2 * bump(t, 3.5, 0.3) - 0.2 * bump(t, 3.75, 0.3), 0.04 * br),
      hackles(0.06 + 0.05 * br, 0, 0),
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ stalk (walk) and turn
// Diagonal pairs, as the game's gait (render/facet/gait.js), the hind paw a touch behind its partner. 1.7 u/s, 0.6 s a
// cycle. The head rides low and level while the shoulders roll under the mane.
const WT = 0.6;
const GAIT = { T: WT, duty: 0.6, v: 1.7 / CFG.unit };
const GF = { FL: { phase: 0, n: [0.08, 0.2], lift: 0.055, droop: 0.6, push: 0.2 }, HR: { phase: 0.08, n: [-0.11, -0.265], lift: 0.04, droop: 0.5, push: 0.3 },
             FR: { phase: 0.5, n: [-0.08, 0.2], lift: 0.055, droop: 0.6, push: 0.2 }, HL: { phase: 0.58, n: [0.11, -0.265], lift: 0.04, droop: 0.5, push: 0.3 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT;
    return addPose(
      { oy: -0.03 + 0.007 * Math.cos(2 * w - 0.5), bp: -0.02 + 0.012 * Math.sin(2 * w + 0.5), br: 0.03 * Math.sin(w + 0.2), ox: 0.01 * Math.sin(w + 0.6), by: 0.04 * Math.sin(w) },
      { sy: 0.05 * Math.sin(w + 0.4), sr: -0.02 * Math.sin(w + 0.2), cy: -0.06 * Math.sin(w + 0.4), cr: -0.045 * Math.sin(w + 0.3), cp: -0.02 },
      { n1p: -0.14 + 0.02 * Math.sin(2 * w + 1.3), n2p: -0.06, hp: 0.16 - 0.02 * Math.sin(2 * w + 2.0), hy: -0.03 * Math.sin(w), n1y: -0.02 * Math.sin(w), hr: 0.02 * Math.sin(w + 0.5) },
      jaw(0.12), ears(0.15, 0.05), tail(0.36, 0.08 * Math.sin(w + 1.2), 0.03 * Math.sin(2 * w)), hackles(0.1 + 0.04 * Math.sin(2 * w + 1), 0.012, w),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const TT = 0.45; const g = { T: TT, duty: 0.6, v: 0, omega: dir * 2 * Math.PI / 3.0, pivot: [0, -0.04] };
  const gf = { FL: { ...GF.FL, n: [0.1, 0.2], lift: 0.036 }, FR: { ...GF.FR, n: [-0.1, 0.2], lift: 0.036 }, HL: { ...GF.HL, n: [0.14, -0.265], lift: 0.03 }, HR: { ...GF.HR, n: [-0.14, -0.265], lift: 0.03 } };
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT;
      return addPose({ oy: -0.022 + 0.004 * Math.cos(2 * w - 0.5), br: 0.02 * Math.sin(w) - 0.02 * dir, bp: 0.008 * Math.sin(2 * w) },
        { sy: 0.07 * dir, cy: 0.07 * dir, n1y: 0.12 * dir, n2y: 0.12 * dir, hy: 0.2 * dir, hr: 0.05 * dir, n1p: -0.1 + 0.015 * Math.sin(2 * w + 1), hp: 0.1 },
        jaw(0.12), tail(0.08, -0.25 * dir + 0.1 * Math.sin(w)), ears(0.15, 0.05), hackles(0.1, 0.01, w)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ Pounce
// crouch (the first 38 ticks of the 54-tick ring: it sinks onto its haunches, the hips wind from side to side, the ears
// pin), leap (16 ticks: the hind paws drive, it sails in a 1.1 u arc), land (every paw down at once, the forepaws a step
// ahead, the body squashes in 2.5 frames), landed (3 frames), settle (0.45 s: it walks out of the landing).
const POUNCE_U = 4.5, LAND_GAP = 1.0; // the hero stand-in is 4.5 u away; the forepaws come down at its feet
const PC = { crouch: 38 / 60, leap: 54 / 60, land: 54 / 60 + STRIKE, held: 54 / 60 + STRIKE + HOLD, end: 54 / 60 + STRIKE + HOLD + 0.45 };
const PD = (POUNCE_U - LAND_GAP) / CFG.unit, ARC = 1.1 / CFG.unit, STEP = 0.1;
const pU = (t) => clamp((t - PC.crouch) / (PC.leap - PC.crouch));
const pTravel = (t) => PD * pU(t) + STEP * smooth((t - PC.held) / 0.34);
const airKeys = {
  F: [[0, { y: -0.44, z: 0.06 }], [0.2, { y: -0.3, z: 0.12 }], [0.55, { y: -0.3, z: 0.26 }], [0.85, { y: -0.4, z: 0.3 }], [1, { y: -0.46, z: 0.24 }]],
  H: [[0, { y: -0.46, z: -0.02 }], [0.22, { y: -0.4, z: -0.3 }], [0.55, { y: -0.3, z: -0.38 }], [0.85, { y: -0.36, z: -0.08 }], [1, { y: -0.44, z: 0.06 }]],
};
// the bow (Kesh's photos, 13 Nov): chest and forearms on the floor, rump high, eyes level on the hero
const BOW = { oy: -0.04, oz: -0.06, bp: -0.43, sp: -0.24, cp: -0.05, reach: 0.21, ca: -1.45, up: PC.crouch - 0.07 };
const ELBOW = V3(0, -0.6, -1).normalize(); // the way a foreleg's elbow points: back and down
const bowPaw = (k) => off(k, k === 'FL' ? 0.015 : -0.015, 0.012, BOW.reach + (k === 'FL' ? 0.012 : 0)); // 12 mm up: the forearm has thickness, and it lies on the floor, not in it
const pounce = {
  dur: PC.end, contact: [PC.leap], kinds: ['land'], travel: pTravel, cues: { ring: [0, PC.leap] },
  phases: [['crouch', 0], ['leap', PC.crouch], ['land', PC.leap], ['landed', PC.land], ['settle', PC.held]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.12, { oy: -0.02, oz: -0.03, bp: -0.2, sp: -0.08, cp: -0.02, n1p: 0.08, n2p: 0.05, hp: 0.1 }],
      [0.27, { oy: BOW.oy, oz: BOW.oz, bp: BOW.bp, sp: BOW.sp, cp: BOW.cp, n1p: 0.26, n2p: 0.2, hp: 0.2 }],
      [0.5, { oy: BOW.oy - 0.008, oz: BOW.oz - 0.01, bp: BOW.bp - 0.02, sp: BOW.sp - 0.02, cp: BOW.cp, n1p: 0.28, n2p: 0.2, hp: 0.18 }],
      [PC.crouch, { oy: -0.135, oz: -0.065, bp: 0.0, sp: -0.06, cp: -0.02, n1p: -0.1, n2p: -0.04, hp: 0.16 }],
      [PC.crouch + 0.034, { oy: -0.06, oz: 0.0, bp: 0.36, sp: 0.04, cp: 0.05, n1p: -0.1, hp: -0.06 }, 'out'],
      [PC.crouch + 0.13, { oy: -0.02, oz: 0.02, bp: 0.12, sp: 0.07, cp: 0.05, n1p: -0.04, hp: -0.04 }],
      [PC.leap - 0.05, { oy: -0.02, oz: 0.02, bp: -0.26, sp: -0.02, cp: -0.05, n1p: 0.1, hp: 0.14 }],
      [PC.leap, { oy: -0.035, oz: 0.02, bp: -0.2, sp: -0.03, cp: -0.05, n1p: 0.12, hp: 0.16 }],
      [PC.land, { oy: -0.14, oz: 0.035, bp: -0.1, sp: -0.07, cp: -0.06, n1p: -0.16, n2p: -0.1, hp: 0.1 }, 'out'],
      [PC.held, { oy: -0.146, oz: 0.037, bp: -0.1, sp: -0.07, cp: -0.06, n1p: -0.18, n2p: -0.1, hp: 0.1 }],
      [PC.held + 0.16, { oy: -0.05, oz: 0.01, bp: 0.03, n1p: 0.02, hp: 0.06 }],
      [PC.held + 0.32, { oy: -0.02, bp: -0.01, n1p: -0.04, hp: 0.04 }],
      [PC.end, {}]])(t);
    const u = pU(t), wig = pulse(t, 0.24, 0.3, 0.5, 0.56), fly = pulse(t, PC.crouch, PC.crouch + 0.05, PC.leap - 0.02, PC.leap);
    const snap = pulse(t, PC.leap - 0.1, PC.leap - 0.03, PC.leap, PC.land);
    return addPose(k, { oy: ARC * 4 * u * (1 - u) * (t < PC.leap ? 1 : 0) },
      { br: 0.07 * Math.sin(26 * t) * wig, by: 0.04 * Math.sin(26 * t + 1.2) * wig, sy: -0.05 * Math.sin(26 * t + 1.2) * wig },
      jaw(0.12 + 0.2 * smooth(t / 0.3) * (1 - fly) + 0.75 * snap), ears(0.75 * pulse(t, 0.05, 0.25, PC.held, PC.end), 0.1),
      tail(0.25 * smooth(t / 0.4) + 0.5 * fly - 0.2 * pulse(t, PC.leap, PC.land, PC.held, PC.end), 0.2 * Math.sin(26 * t + 2) * wig, 0.1 * wig),
      hackles(0.5 * smooth(t / 0.5) + 0.4 * pulse(t, PC.leap, PC.land, PC.held + 0.1, PC.end) - 0.5 * smooth((t - PC.held) / 0.45), 0.02 * wig, 26 * t));
  },
  feet: (t, B) => {
    const F = {}; const u = pU(t);
    for (const k of LEGS) {
      const front = k[0] === 'F', sgn = k[1] === 'L' ? 1 : -1; const lift = front ? BOW.up : PC.crouch + 0.034;
      const land = off(k, front ? 0.012 * sgn : 0.02 * sgn, 0, PD + (front ? STEP : 0.055));
      if (t < lift) {
        // the forepaws reach out one after the other and the forearms lie down; the hind paws stay
        if (front) { const a = k === 'FR' ? 0.02 : 0.09; F[k] = { ...steps(t, REST[k], [[a, a + 0.12, bowPaw(k), 0.045, 0.35]]), ca: BOW.ca, cw: smooth((t - 0.1) / 0.17) * (1 - smooth((t - 0.5) / (BOW.up - 0.5))), pole: ELBOW }; }
        else { F[k] = plant(REST[k]); if (t > PC.crouch - 0.03) F[k].pitch = 0.7 * smooth((t - PC.crouch + 0.03) / 0.064); }
        continue;
      }
      if (t < PC.leap) {
        const q = track(airKeys[k[0]])(u); const a = B.loc(k, [0.01 * sgn, q.y, q.z]); const from = front ? bowPaw(k) : REST[k];
        const out = smooth((t - lift) / (front ? 0.07 : 0.04)), inn = smooth((t - (PC.leap - 0.045)) / 0.045);
        const p = from.clone().lerp(a, out).lerp(land, inn); if (inn > 0) p.y = Math.max(p.y, 0.1 * (1 - inn) ** 1.5 * 0.6);
        p.y += 0.014 * Math.sin(Math.PI * Math.min(1, out)); if (inn <= 0) p.y = Math.max(p.y, 0.012 + 0.02 * out); F[k] = { p, pitch: (front ? 0.9 : 0.8) * out * out * (1 - inn) }; if (front) F[k].pole = ELBOW; continue; // the toes clear the floor before they point
      }
      // down. The hind paws walk up one after the other while the body comes over its forepaws.
      if (front) F[k] = { ...plant(land), pole: ELBOW };
      else { const a = PC.held + (k === 'HL' ? 0.03 : 0.17); F[k] = steps(t, land, [[a, a + 0.13, off(k, 0, 0, PD + STEP), 0.035, 0.5]]); }
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Rend
// wind up (the 36-tick cone: the weight rocks back, the right forepaw comes up high and wide, lips back), rake (2.5 frames:
// it lunges and the paw rakes across and down while the jaw snaps), held (3 frames), back (0.4 s: the paw steps home).
const RD = { wind: 36 / 60, hit: 36 / 60 + STRIKE, held: 36 / 60 + STRIKE + HOLD, end: 36 / 60 + STRIKE + HOLD + 0.4 };
const rend = {
  dur: RD.end, contact: [RD.hit], kinds: ['rake'], cues: { cone: [0, RD.wind] },
  phases: [['wind up', 0], ['rake', RD.wind], ['held', RD.hit], ['back', RD.held]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.2, { oy: -0.02, oz: -0.035, ox: 0.02, bp: 0.07, br: -0.05, by: -0.1, sy: -0.06, cy: -0.1, cp: 0.05, cr: -0.06, n1p: 0.06, n1y: 0.08, hp: 0.1, hy: 0.14, hr: -0.1 }],
      [0.48, { oy: -0.03, oz: -0.06, ox: 0.028, bp: 0.13, br: -0.07, by: -0.16, sy: -0.1, cy: -0.16, cp: 0.08, cr: -0.1, n1p: 0.12, n1y: 0.12, n2p: 0.06, hp: 0.16, hy: 0.2, hr: -0.14 }],
      [RD.wind, { oy: -0.034, oz: -0.07, ox: 0.03, bp: 0.15, br: -0.07, by: -0.18, sy: -0.11, cy: -0.18, cp: 0.09, cr: -0.11, n1p: 0.14, n1y: 0.13, n2p: 0.07, hp: 0.18, hy: 0.22, hr: -0.15 }],
      [RD.hit, { oy: -0.07, oz: 0.085, ox: -0.01, bp: -0.12, br: 0.06, by: 0.2, sy: 0.1, cy: 0.16, cp: -0.08, cr: 0.1, n1p: -0.16, n1y: -0.06, n2p: -0.08, hp: 0.02, hy: -0.14, hr: 0.16 }, 'in'],
      [RD.held, { oy: -0.074, oz: 0.09, ox: -0.01, bp: -0.125, br: 0.065, by: 0.21, sy: 0.1, cy: 0.17, cp: -0.08, cr: 0.1, n1p: -0.17, n1y: -0.06, n2p: -0.08, hp: 0.02, hy: -0.15, hr: 0.17 }],
      [RD.held + 0.14, { oy: -0.04, oz: 0.04, bp: -0.04, br: 0.02, by: 0.08, sy: 0.04, cy: 0.06, n1p: -0.08, hy: -0.05, hr: 0.05 }],
      [RD.held + 0.3, { oy: -0.012, oz: 0.0, bp: 0.012, n1p: -0.02 }],
      [RD.end, {}]])(t);
    const snarl = pulse(t, 0.1, 0.3, RD.wind - 0.02, RD.wind), tr = Math.sin(64 * t) * pulse(t, 0.3, 0.4, RD.wind - 0.03, RD.wind);
    return addPose(k, { hr: 0.02 * tr, cp: 0.006 * tr },
      jaw(0.12 + 0.7 * snarl * (t < RD.wind ? 1 : 0) + (t >= RD.wind ? 0.85 * (1 - EASE.in3(clamp((t - RD.wind) / STRIKE))) - 0.12 * pulse(t, RD.wind, RD.hit, RD.held, RD.held + 0.1) : 0)),
      ears(0.8 * pulse(t, 0.05, 0.3, RD.held, RD.end), 0.15 * snarl), tail(0.3 * pulse(t, 0.05, 0.4, RD.held, RD.end), 0.25 * pulse(t, RD.wind, RD.hit, RD.held + 0.1, RD.end), 0.05),
      hackles(0.7 * pulse(t, 0.05, 0.4, RD.held + 0.05, RD.end), 0.02 * Math.abs(tr), 64 * t));
  },
  feet: (t) => {
    const F = allPlanted(); const up = off('FR', -0.11, 0.33, 0.04), hit = off('FR', 0.1, 0, 0.13);
    if (t > 0.06 && t < RD.wind) { const u = smooth((t - 0.06) / 0.3); const p = REST.FR.clone().lerp(up, u); p.y += 0.03 * Math.sin(Math.PI * u) + 0.006 * Math.sin(40 * t) * (u >= 1 ? 1 : 0); F.FR = { p, pitch: 1.1 * Math.sin(Math.PI * 0.5 * u), yaw: 0.25 * u }; }
    else if (t >= RD.wind && t < RD.hit) { const u = (t - RD.wind) / STRIKE; const p = up.clone().lerp(hit, u * u); p.y = up.y * (1 - u ** 1.6); p.z += 0.07 * Math.sin(Math.PI * u); F.FR = { p, pitch: 1.1 * (1 - u), yaw: 0.25 - 0.6 * u }; }
    else if (t >= RD.hit) F.FR = { ...steps(t, hit, [[RD.held + 0.08, RD.held + 0.26, REST.FR, 0.05, 0.8]]) };
    if (t >= RD.hit && t < RD.held + 0.08) F.FR.yaw = -0.35;
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Moon Howl
// rise (the 60-tick ring: it sits back on its haunches, the chest fills and the head comes up), cry (2.5 frames: the muzzle
// goes to the sky and the jaw opens), held (3 frames + 0.3 s: the howl shakes its throat, mane and tail), settle (0.5 s).
const MH = { rise: 1.0, cry: 1.0 + STRIKE, held: 1.0 + STRIKE + HOLD + 0.3, end: 1.0 + STRIKE + HOLD + 0.3 + 0.5 };
const sit = { oy: -0.17, oz: -0.05, bp: 0.42, sp: 0.06, cp: 0.1 };
const howl = {
  dur: MH.end, contact: [MH.cry], kinds: ['howl'], cues: { ring: [0, MH.rise] },
  phases: [['rise', 0], ['cry', MH.rise], ['held', MH.cry], ['settle', MH.held]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.22, { oy: -0.035, oz: -0.02, bp: 0.0, n1p: -0.2, n2p: -0.1, hp: -0.06 }],
      [0.62, { ...sit, oy: -0.15, bp: 0.36, n1p: -0.02, n2p: 0.0, hp: 0.08, cp: 0.04 }],
      [0.9, { ...sit, n1p: 0.12, n2p: 0.1, hp: 0.14, cp: 0.13 }],
      [MH.rise, { ...sit, n1p: 0.1, n2p: 0.08, hp: 0.1, cp: 0.15 }],
      [MH.cry, { ...sit, oy: -0.16, n1p: 0.3, n2p: 0.26, hp: 0.34, cp: 0.12 }, 'out'],
      [MH.held, { ...sit, oy: -0.162, n1p: 0.32, n2p: 0.28, hp: 0.36, cp: 0.06 }],
      [MH.held + 0.2, { oy: -0.09, oz: -0.02, bp: 0.16, sp: 0.02, cp: 0.02, n1p: 0.08, n2p: 0.04, hp: 0.1 }],
      [MH.held + 0.38, { oy: -0.02, bp: -0.01, n1p: -0.06, hp: 0.02 }],
      [MH.end, {}]])(t);
    const cry = pulse(t, MH.rise, MH.cry, MH.held - 0.05, MH.held + 0.08), v = Math.sin(70 * t) * cry;
    return addPose(k, { hy: 0.02 * v, hr: 0.025 * Math.sin(70 * t + 1) * cry, cp: 0.01 * v, n2p: 0.012 * v },
      jaw(0.12 + 0.12 * pulse(t, 0.3, 0.9, MH.rise, MH.cry) + 0.9 * cry + 0.06 * v), ears(0.3 * smooth(t / 0.3) + 0.25 * cry - 0.55 * smooth((t - MH.held) / 0.4), 0.35 * cry),
      tail(0.1 + 0.5 * cry * (1 - 0) + 0.2 * pulse(t, 0.3, 0.9, MH.held, MH.end), 0.06 * v, 0.1 * cry), hackles(0.35 * pulse(t, 0.3, 0.9, MH.held + 0.1, MH.end) + 0.55 * cry, 0.035 * cry, 70 * t));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ Call the pack
// The add waves at 75, 50 and 25 percent. The game plays a roar and no pose; this pose is new: standing, it looks back
// over its left shoulder and gives two short barks, then squares up.
const CL = { b1: 0.36 + STRIKE, b2: 0.62 + STRIKE };
const call = {
  dur: 1.3, contact: [CL.b1, CL.b2], kinds: ['bark', 'bark'], phases: [['looks back', 0], ['bark', 0.36], ['bark', 0.62], ['squares up', 0.8]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.26, { oy: -0.02, by: 0.1, sy: 0.12, cy: 0.16, n1y: 0.34, n2y: 0.3, hy: 0.42, n1p: 0.06, hp: 0.06, hr: 0.1, ox: -0.01 }],
      [0.36, { oy: -0.03, by: 0.11, sy: 0.13, cy: 0.17, n1y: 0.36, n2y: 0.32, hy: 0.44, n1p: -0.04, hp: -0.04, hr: 0.1, ox: -0.01 }],
      [CL.b1, { oy: -0.005, by: 0.11, sy: 0.13, cy: 0.17, n1y: 0.36, n2y: 0.32, hy: 0.44, n1p: 0.2, n2p: 0.1, hp: 0.22, hr: 0.1, cp: 0.05, ox: -0.01 }, 'out'],
      [0.62, { oy: -0.03, by: 0.11, sy: 0.13, cy: 0.17, n1y: 0.36, n2y: 0.32, hy: 0.44, n1p: 0.0, hp: 0.0, hr: 0.1, ox: -0.01 }],
      [CL.b2, { oy: -0.002, by: 0.11, sy: 0.13, cy: 0.17, n1y: 0.36, n2y: 0.32, hy: 0.44, n1p: 0.24, n2p: 0.12, hp: 0.26, hr: 0.1, cp: 0.06, ox: -0.01 }, 'out'],
      [0.84, { oy: -0.015, by: 0.1, sy: 0.12, cy: 0.15, n1y: 0.3, n2y: 0.26, hy: 0.36, n1p: 0.06, hp: 0.06, hr: 0.08 }],
      [1.08, { oy: -0.012, by: -0.01, n1y: -0.04, hy: -0.05, n1p: -0.04 }],
      [1.3, {}]])(t);
    const b = pulse(t, 0.36, CL.b1, CL.b1 + 0.07, CL.b1 + 0.16) + pulse(t, 0.62, CL.b2, CL.b2 + 0.08, CL.b2 + 0.2);
    return addPose(k, jaw(0.12 + 0.8 * b), ears(0.3 * b, 0.25 * pulse(t, 0.1, 0.3, 0.84, 1.1)), tail(0.45 * pulse(t, 0.1, 0.36, 0.84, 1.2) + 0.15 * b, -0.2 * pulse(t, 0.1, 0.3, 0.84, 1.1), 0.1),
      hackles(0.3 * pulse(t, 0.1, 0.36, 0.84, 1.2) + 0.3 * b, 0.03 * b, 60 * t));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ Enrage
// Under 40 percent. hackles up (0.35 s: it drops its head and the mane stands), enraged (1.6 s: a snarl shudders from
// the head to the tail, the right forepaw tears at the floor, it snaps at the air and squares up). The page keeps the
// enraged state on afterwards (rageHold): hackles up, ears pinned, lips back, quick breath.
const EN = { up: 0.35, snap: 1.2 + STRIKE, end: 1.95 };
const enrage = {
  dur: EN.end, contact: [EN.snap], kinds: ['snap'], phases: [['hackles up', 0], ['enraged', EN.up], ['snap', 1.2], ['squares up', EN.snap]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.1, { oy: 0.006, bp: 0.03, n1p: 0.08, hp: 0.06 }],
      [EN.up, { oy: -0.05, oz: -0.02, bp: -0.07, cp: -0.03, n1p: -0.22, n2p: -0.1, hp: 0.2 }],
      [0.8, { oy: -0.06, oz: -0.025, bp: -0.08, cp: -0.03, n1p: -0.25, n2p: -0.12, hp: 0.22 }],
      [1.14, { oy: -0.05, oz: -0.04, bp: -0.03, n1p: -0.14, n2p: -0.04, hp: 0.16 }],
      [1.2, { oy: -0.05, oz: -0.045, bp: -0.02, n1p: -0.1, n2p: -0.02, hp: 0.12 }],
      [EN.snap, { oy: -0.04, oz: 0.05, bp: -0.05, cp: -0.03, n1p: 0.0, n2p: 0.04, hp: 0.06 }, 'in'],
      [EN.snap + HOLD, { oy: -0.04, oz: 0.054, bp: -0.05, cp: -0.03, n1p: 0.0, n2p: 0.04, hp: 0.06 }],
      [1.6, { oy: -0.02, oz: 0.01, bp: 0.0, n1p: -0.04, hp: 0.04 }],
      [EN.end, {}]])(t);
    const sh = pulse(t, EN.up, EN.up + 0.1, 0.95, 1.12), w = 44 * (t - EN.up);
    const open = 0.75 * pulse(t, 0.15, EN.up, 1.2, 1.2 + STRIKE * 0.8) * (t < 1.2 ? 1 : (1 - EASE.in3(clamp((t - 1.2) / STRIKE))));
    return addPose(k, { hy: 0.07 * Math.sin(w) * sh, hr: 0.09 * Math.sin(w + 1.2) * sh, cr: 0.03 * Math.sin(w - 0.7) * sh, sr: 0.03 * Math.sin(w - 1.4) * sh, br: 0.025 * Math.sin(w - 2.1) * sh },
      jaw(0.12 + open), tail(0.15 * smooth(t / 0.35), 0.3 * Math.sin(w - 2.8) * sh, 0.05));
  },
  feet: (t) => {
    const F = allPlanted();
    for (const c of [0.5, 0.82]) if (t >= c && t < c + 0.28) { const q = track([[c, { y: 0, z: 0, p: 0 }], [c + 0.09, { y: 0.06, z: 0.07, p: 0.6 }], [c + 0.13, { y: 0.008, z: 0.07, p: 0.2 }, 'in'], [c + 0.2, { y: 0.012, z: -0.06, p: 0.8 }, 'out'], [c + 0.28, { y: 0, z: 0, p: 0 }]])(t); F.FR = { p: off('FR', 0, q.y, q.z), pitch: q.p }; }
    return F;
  },
};
// The enraged state, played on top of anything (head, ears, jaw, tail and mane only).
const RT = 0.5;
const rageHold = {
  dur: RT, loop: true, upperOnly: true,
  pose: (t) => { const w = 2 * Math.PI * t / RT, b = Math.sin(w);
    return addPose({ n1p: -0.05, hp: 0.05 + 0.012 * b }, jaw(0.26 + 0.05 * b), ears(0.75, 0.1), tail(0.3, 0, 0.06), hackles(0.85 + 0.12 * b, 0, 0)); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything. Only the neck, head, jaw, ears, tail and mane move, so planted paws stay planted.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { n1p: 0.1, n2p: 0.06, hp: 0.08, hy: 0.24, hr: 0.18, n1y: 0.1 }, 'out'], [0.17, { n1p: -0.04, hy: -0.06, hr: -0.05 }], [0.42, {}]])(t),
    jaw(0.6 * pulse(t, 0, 0.04, 0.12, 0.3)), ears(0.8 * pulse(t, 0, 0.04, 0.2, 0.4), 0.2 * pulse(t, 0, 0.04, 0.2, 0.4)), tail(-0.1 * pulse(t, 0, 0.05, 0.2, 0.42), 0.05 * pulse(t, 0, 0.05, 0.1, 0.3), 0.12 * pulse(t, 0, 0.05, 0.2, 0.42)),
    hackles(0.5 * pulse(t, 0, 0.04, 0.14, 0.42), 0.04 * pulse(t, 0, 0.04, 0.1, 0.4), 60 * t)),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers it: knocked back two steps with its head thrown aside, it catches itself low, shakes its head
// and squares up snarling.
const HB = -0.11;
const heavyHit = {
  dur: 1.1, contact: [0], kinds: ['taken'], travel: (t) => HB * EASE.out(clamp(t / 0.3)), phases: [['hit', 0], ['stagger', 0.07], ['shake', 0.4], ['square up', 0.72]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.03, oy: -0.02, bp: 0.14, br: 0.1, by: -0.12, sp: 0.06, cp: 0.08, n1p: 0.16, n2p: 0.1, hp: 0.1, hy: -0.4, n1y: -0.22, hr: -0.24 }, 'out'],
      [0.24, { oz: -0.01, oy: -0.07, bp: -0.02, br: -0.05, by: -0.05, n1p: -0.1, hp: -0.1, hy: -0.2, n1y: -0.08, hr: 0.1 }],
      [0.44, { oy: -0.05, bp: -0.05, n1p: -0.18, hp: 0.04, hy: 0.06 }],
      [0.76, { oy: -0.015, bp: 0.012, n1p: -0.06, hp: 0.04 }],
      [1.1, {}]])(t);
    const sh = pulse(t, 0.38, 0.46, 0.62, 0.76), w = 38 * (t - 0.38);
    return addPose(k, { hy: 0.1 * Math.sin(w) * sh, hr: 0.14 * Math.sin(w + 1.3) * sh, cr: 0.03 * Math.sin(w - 0.6) * sh },
      jaw(0.12 + 0.6 * pulse(t, 0, 0.05, 0.16, 0.3) + 0.4 * pulse(t, 0.7, 0.8, 0.95, 1.1)), ears(0.8 * pulse(t, 0, 0.05, 0.6, 1.0), 0.3 * pulse(t, 0, 0.05, 0.3, 0.5)),
      tail(0.12 * pulse(t, 0, 0.06, 0.4, 0.8), 0.2 * Math.sin(w - 2) * sh, 0), hackles(0.6 * pulse(t, 0, 0.05, 0.8, 1.1), 0.04 * sh, w));
  },
  feet: (t) => ({
    HL: steps(t, REST.HL, [[0.035, 0.15, off('HL', 0, 0, HB), 0.035, 0.4]]), FR: steps(t, REST.FR, [[0.075, 0.19, off('FR', 0, 0, HB), 0.045]]),
    HR: steps(t, REST.HR, [[0.15, 0.265, off('HR', 0, 0, HB), 0.035, 0.4]]), FL: steps(t, REST.FL, [[0.2, 0.315, off('FL', 0, 0, HB), 0.045]]),
  }),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames, then stand. It comes up out of a crouch nose first, shakes the
// night out of its coat from head to tail, and snaps once at the air.
const SP = { grow: 7 * FR_, snap: 1.0 + STRIKE };
const spawn = {
  dur: 1.6, contact: [SP.snap], kinds: ['snap'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['rise', SP.grow], ['shake', 0.44], ['snap', 1.0], ['stand', SP.snap]],
  pose: (t) => {
    const lowp = { oy: -0.13, oz: -0.03, bp: -0.06, sp: -0.04, n1p: -0.14, n2p: -0.06, hp: 0.16 };
    const k = track([[0, lowp], [SP.grow, lowp],
      [0.42, { oy: -0.03, bp: 0.0, n1p: -0.1, hp: 0.06 }],
      [0.84, { oy: -0.01, bp: 0.02, n1p: -0.02, hp: 0.04 }],
      [1.0, { oy: -0.03, oz: -0.03, bp: 0.03, n1p: 0.04, n2p: 0.04, hp: 0.1 }],
      [SP.snap, { oy: -0.035, oz: 0.045, bp: -0.04, n1p: 0.02, n2p: 0.03, hp: 0.04 }, 'in'],
      [SP.snap + HOLD, { oy: -0.035, oz: 0.048, bp: -0.04, n1p: 0.02, n2p: 0.03, hp: 0.04 }],
      [1.3, { oy: -0.012, oz: 0.01, n1p: -0.03, hp: 0.03 }],
      [1.6, {}]])(t);
    const sh = pulse(t, 0.42, 0.5, 0.74, 0.86), w = 40 * (t - 0.42);
    const open = 0.8 * pulse(t, 0.88, 1.0, 1.0, 1.0 + STRIKE * 0.8) * (t < 1.0 ? 1 : (1 - EASE.in3(clamp((t - 1.0) / STRIKE))));
    return addPose(k, { hy: 0.1 * Math.sin(w) * sh, hr: 0.16 * Math.sin(w + 1.2) * sh, cr: 0.06 * Math.sin(w - 0.8) * sh, sr: 0.06 * Math.sin(w - 1.6) * sh, br: 0.05 * Math.sin(w - 2.4) * sh },
      jaw(0.12 + open), ears(0.6 * pulse(t, 0, 0.1, 0.4, 0.6) + 0.3 * Math.abs(Math.sin(w)) * sh, 0.3 * sh), tail(0.2 * pulse(t, 0.5, 0.9, 1.2, 1.6), 0.35 * Math.sin(w - 3.2) * sh, 0.05),
      hackles(0.6 * pulse(t, 0, 0.1, 1.1, 1.6), 0.05 * sh, w));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// Its paws unlock. A jolt, it tries one more howl and the howl dies in its throat; the forelegs slide out and the chest
// comes down, the hindquarters fold beside it, and the head lays over on the floor. The mane sags and the tail goes slack.
const KU = -0.5;
const D = { cry: 0.5, chest: 1.05, hind: 1.5, head: 1.85, end: 2.6 };
const death = {
  dur: D.end, contact: [D.chest, D.head], kinds: ['thud', 'thud'], phases: [['jolt', 0], ['last howl', 0.14], ['forelegs give', D.cry + 0.1], ['down', D.chest], ['still', D.head]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.1, { bp: 0.08, oy: -0.02, br: -0.05, n1p: 0.1, hp: 0.1, hy: 0.16, hr: 0.1 }, 'out'],
      [D.cry, { bp: 0.12, oy: -0.05, oz: -0.02, n1p: 0.3, n2p: 0.24, hp: 0.34, cp: 0.08 }],
      [D.cry + 0.12, { bp: 0.1, oy: -0.06, oz: -0.02, n1p: 0.24, n2p: 0.16, hp: 0.2, cp: 0.04 }],
      [D.chest, { bp: -0.22, oy: -0.185, oz: 0.03, sp: -0.04, br: 0.04, n1p: 0.06, n2p: 0.06, hp: 0.16, hy: -0.06 }, 'in'],
      [D.chest + 0.1, { bp: -0.2, oy: -0.185, oz: 0.03, sp: -0.04, br: 0.05, n1p: 0.1, n2p: 0.08, hp: 0.18, hy: -0.08 }, 'out'],
      [D.hind, { bp: -0.02, oy: -0.272, oz: 0.02, sp: 0.0, br: 0.2, by: 0.06, sr: -0.06, cr: -0.1, n1p: 0.04, n2p: 0.04, hp: 0.1, hy: -0.2, n1y: -0.1 }],
      [D.head, { bp: 0.0, oy: -0.28, oz: 0.02, br: 0.26, by: 0.08, sr: -0.08, cr: -0.14, n1p: -0.3, n2p: -0.12, hp: 0.3, hy: -0.4, n1y: -0.2, n2y: -0.1, hr: -0.5 }, 'in'],
      [D.head + 0.1, { bp: 0.0, oy: -0.282, oz: 0.02, br: 0.26, by: 0.08, sr: -0.08, cr: -0.14, n1p: -0.27, n2p: -0.12, hp: 0.3, hy: -0.4, n1y: -0.2, n2y: -0.1, hr: -0.5 }, 'out'],
      [D.end, { bp: 0.0, oy: -0.284, oz: 0.02, br: 0.27, by: 0.08, sr: -0.08, cr: -0.14, n1p: -0.3, n2p: -0.12, hp: 0.3, hy: -0.4, n1y: -0.2, n2y: -0.1, hr: -0.52 }],
    ])(t);
    const cry = pulse(t, 0.2, 0.36, D.cry - 0.02, D.cry + 0.12), sag = smooth((t - D.chest) / 1.0);
    return addPose(k, { hy: 0.025 * Math.sin(64 * t) * cry, hr: 0.02 * Math.sin(64 * t + 1) * cry },
      jaw(0.12 + 0.8 * cry + 0.25 * sag), ears(0.5 * pulse(t, 0, 0.06, 0.2, 0.4) + 0.5 * cry + 0.7 * sag, 0.4 * sag),
      tail(0.3 * cry, 0.35 * sag, 0.1 * sag),
      hackles(0.6 * pulse(t, 0, 0.1, D.cry, D.chest) - 0.9 * sag, 0.03 * cry, 64 * t));
  },
  feet: (t, B) => {
    const fold = smooth((t - D.cry - 0.1) / (D.chest - D.cry - 0.1)), hf = smooth((t - D.chest - 0.05) / (D.hind - D.chest - 0.05));
    const out = { FL: off('FL', 0.035, 0.03, 0.2), FR: off('FR', -0.02, 0.03, 0.23), HL: off('HL', 0.07, 0.012, 0.2), HR: off('HR', -0.03, 0.012, 0.15) };
    const F = {};
    for (const k of LEGS) {
      const front = k[0] === 'F'; const f = front ? fold : hf;
      const p = REST[k].clone().lerp(out[k], f); p.y += 0.02 * Math.sin(Math.PI * f) + (front ? 0.02 * pulse(t, 0.85, 1.05, 1.35, 1.7) : 0);
      F[k] = { p, pitch: (front ? 0.1 : 0.7) * f, lock: t < D.cry + 0.1, ku: lerp(0.35, KU, f) }; if (front) F[k].pole = ELBOW;
    }
    return F;
  },
};

// The tail hangs almost to the floor, so whenever the hips come down it swings back far enough to lie on the floor
// behind the wolf instead of through it.
const TAIL_L = 0.415, TAIL_Y = 0.49, TAIL_Z = 0.13;
function tailGuard(p) {
  const bp = p.bp || 0; const baseY = TAIL_Y + (p.oy || 0) + CFG.base.oy - TAIL_Z * Math.sin(bp);
  const need = Math.acos(clamp((baseY - 0.05) / TAIL_L, -1, 1)) + bp; const have = -(p.t1p || 0);
  if (need > have) { const add = need - have; p.t1p = -need; p.t2p = Math.min(p.t2p || 0, 0) * (1 - clamp(add / 0.6)) ; p.t3p = Math.min(p.t3p || 0, 0) * (1 - clamp(add / 0.6)); }
  return p;
}
const guarded = (c) => (c.upperOnly ? c : { ...c, pose: (t) => tailGuard(c.pose(t)) });
export const CLIPS = Object.fromEntries(Object.entries({ idle, walk, turnL: turn(1), turnR: turn(-1), pounce, rend, howl, call, enrage, rageHold, hurt, heavyHit, spawn, death }).map(([k, c]) => [k, guarded(c)]));
