// The Moss Hart's moves. Units are model units (the model is 1 tall to its antler tips; the page draws it 2.6 u tall,
// CFG.unit). Timings come from the game: MH in src/sim/enemies/champions.js (walks 1.3 u/s, keeps 1.5 to 2.6 u off;
// Antler Toss: a 56-tick cone of r 3.0 and 55 degrees each side that tosses heroes 2 u; Hart's Leap: a 74-tick ring of
// r 2.0 under the farthest hero 2.5 to 8 u away: it crouches for the first 45 percent of the warning, is over the mark
// at 95 percent and lands on it, leaving moss of r 1.8 that slows for 5 s), CHAMPION_RULES in src/sim/champions.js (a
// 96-tick entrance, rage below half health: cooldowns x0.7, speed x1.15) and the beats in render/facet/beats.js (a
// frame is 1/30 s: strike 2.5 frames, contact held 3 frames, spawn grow 7 frames).
// The legs are a deer's (wip/rig.py): shoulder, elbow, knee, fetlock in front; hip, stifle, hock, fetlock behind. The
// ears, the tail and the moss that hangs from the antlers are on springs; the moss also hangs straight down by itself.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
export const CFG = {
  name: 'mosshart', unit: 2.6, base: {},
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck1', 'n1'], ['neck2', 'n2'], ['head', 'h']],
  extras: [['earL', 'el'], ['earR', 'er'], ['tail', 't1'], ['mossL', 'ml'], ['mossR', 'mr']],
  legs: {
    FL: { kind: 'front', b: ['fUpperL', 'fForeL', 'fCannonL', 'fHoofL'] }, FR: { kind: 'front', b: ['fUpperR', 'fForeR', 'fCannonR', 'fHoofR'] },
    HL: { kind: 'hind', b: ['hThighL', 'hShinL', 'hCannonL', 'hHoofL'] }, HR: { kind: 'hind', b: ['hThighR', 'hShinR', 'hCannonR', 'hHoofR'] },
  },
  hang: [['mossL', 0.85], ['mossR', 0.85]],
  springs: [{ bone: 'earL', k: 520, c: 20, max: 0.7 }, { bone: 'earR', k: 520, c: 20, max: 0.7 }, { bone: 'tail', k: 220, c: 12, max: 0.8 },
    { bone: 'mossL', k: 70, c: 3.2, max: 1.0 }, { bone: 'mossR', k: 70, c: 3.2, max: 1.0 }],
};
const REST = { FL: V3(0.067, 0, 0.125), FR: V3(-0.059, 0, 0.15), HL: V3(0.051, 0, -0.262), HR: V3(-0.045, 0, -0.262) };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
// ears: back and up, the same words for both sides (they stand out to the sides)
const ears = (backL = 0, upL = 0, backR = backL, upR = upL) => ({ ely: backL, elr: upL, ery: -backR, err: -upR });
// the tail hangs down behind: up lifts it like a flag, side wags it
const tail = (up = 0, side = 0) => ({ t1p: -up, t1y: side });
function steps(t, p0, seq) { // planted at p0, then each step [lift, land, to, height, droop] swings to its next plant
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.9); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const I = new THREE.Quaternion();
// one scrape of a forehoof at the floor: lift, set down ahead, drag back, home. c is when it starts (0.5 s long)
function scrape(F, k, t, c, s = 1) {
  if (t <= c || t >= c + 0.5 * s) return;
  const q = track([[c, { y: 0, z: 0, p: 0 }], [c + 0.14 * s, { y: 0.075, z: 0.04, p: 0.9 }], [c + 0.24 * s, { y: 0.01, z: 0.055, p: 0.35 }, 'in'], [c + 0.34 * s, { y: 0.008, z: -0.035, p: 0.55 }, 'out'], [c + 0.43 * s, { y: 0.04, z: -0.01, p: 0.7 }], [c + 0.5 * s, { y: 0, z: 0, p: 0 }]])(t);
  F[k] = { p: off(k, 0, q.y, q.z), pitch: q.p };
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. Two slow breaths, the weight rolls from side to side, it looks left then right, an ear flicks on each side, the
// tail flicks, and near the end it lowers its head, shakes the rack once so the moss swings, and scrapes a hoof.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const look = 0.4 * pulse(t, 0.5, 1.3, 2.2, 3.0) - 0.32 * pulse(t, 3.2, 3.8, 4.2, 4.7);
    const dip = pulse(t, 4.55, 4.95, 5.4, 5.85), shake = pulse(t, 4.95, 5.0, 5.3, 5.42);
    return addPose(
      { oy: 0.004 * br - 0.012 * dip, cp: 0.014 * br, sp: -0.006 * br, n1p: -0.012 * br - 0.24 * dip, n2p: -0.16 * dip, hp: -0.2 * dip },
      { ox: 0.01 * sw, br: 0.016 * sw, by: 0.018 * Math.sin(w + 1), sy: 0.018 * Math.sin(w + 0.6) },
      { n1y: 0.28 * look, n2y: 0.3 * look, hy: 0.4 * look, hr: 0.1 * look + 0.16 * Math.sin(30 * (t - 4.95)) * shake, n2r: 0.06 * Math.sin(30 * (t - 4.95) - 0.6) * shake, cy: 0.05 * look },
      ears(-0.5 * bump(t, 1.05, 0.2) + 0.3 * look + 0.5 * shake, 0.15 * bump(t, 1.05, 0.2), -0.5 * bump(t, 3.62, 0.2) - 0.3 * look + 0.5 * shake, 0.15 * bump(t, 3.62, 0.2)),
      tail(0.5 * bump(t, 2.7, 0.5), 0.5 * bump(t, 2.55, 0.24) - 0.45 * bump(t, 2.82, 0.26) + 0.06 * sw),
    );
  },
  feet: (t) => { const F = allPlanted(); scrape(F, 'FR', t, 5.3, 1.1); return F; },
};

// ------------------------------------------------------------------------------------------------ walk and turn
// A slow, stately walk: four beats, each hind hoof landing just after the forehoof across from it. 1.3 u/s, 0.8 s a cycle.
// The forelegs stand straight at rest, so the body rides a little low and the forehooves work slightly ahead of the shoulder.
// A hoof rolls over its toe: the toe reaches TOE past the leg's end point, so a pitched hoof is lifted by that much.
const WT = 0.8;
const GAIT = { T: WT, duty: 0.6, v: 1.3 / CFG.unit };
const TOE = { F: 0.022, H: 0.024 };
const roll = (k, f) => { if (f.pitch > 0 && f.lock) f.p.y += TOE[k[0]] * Math.sin(f.pitch); return f; };
const GF = { FL: { phase: 0, n: [0.067, 0.14], lift: 0.085, droop: 1.0, push: 0.16 }, HR: { phase: 0.1, n: [-0.045, -0.238], lift: 0.06, droop: 0.6, push: 0.3 },
             FR: { phase: 0.5, n: [-0.059, 0.165], lift: 0.085, droop: 1.0, push: 0.16 }, HL: { phase: 0.6, n: [0.051, -0.238], lift: 0.06, droop: 0.6, push: 0.3 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT;
    return addPose(
      { oy: -0.03 + 0.006 * Math.cos(2 * w - 0.5), bp: 0.012 * Math.sin(2 * w + 0.5), br: 0.026 * Math.sin(w + 0.2), ox: 0.007 * Math.sin(w + 0.6), by: 0.022 * Math.sin(w) },
      { sy: 0.04 * Math.sin(w + 0.4), sr: -0.012 * Math.sin(w + 0.2), cy: -0.035 * Math.sin(w + 0.4), cr: -0.014 * Math.sin(w + 0.2) },
      { n1p: -0.04 + 0.03 * Math.sin(2 * w + 1.3), n2p: 0.016 * Math.sin(2 * w + 1.7), hp: -0.03 * Math.sin(2 * w + 2.0), hy: -0.02 * Math.sin(w), n1y: -0.015 * Math.sin(w), hr: 0.02 * Math.sin(w + 0.4) },
      tail(0.08 + 0.05 * Math.sin(2 * w), 0.14 * Math.sin(w + 1.2)), ears(0.12, 0.02),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, roll(k, gaitFoot(t, GAIT, GF[k]))])),
};
const turn = (dir) => {
  const TT = 0.8; const g = { T: TT, duty: 0.6, v: 0, omega: dir * 2 * Math.PI / 3.2, pivot: [0, -0.06] };
  const gf = { FL: { ...GF.FL, lift: 0.06 }, FR: { ...GF.FR, lift: 0.06 }, HL: { ...GF.HL, lift: 0.045 }, HR: { ...GF.HR, lift: 0.045 } };
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT;
      return addPose({ oy: -0.022 + 0.005 * Math.cos(2 * w - 0.5), br: 0.02 * Math.sin(w) - 0.02 * dir, bp: 0.008 * Math.sin(2 * w) },
        { sy: 0.07 * dir, cy: 0.06 * dir, n1y: 0.14 * dir, n2y: 0.14 * dir, hy: 0.16 * dir, hr: 0.05 * dir, n1p: -0.03 + 0.015 * Math.sin(2 * w + 1) },
        tail(0.05, -0.25 * dir + 0.1 * Math.sin(w)), ears(0.1, 0.02)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, roll(k, gaitFoot(t, g, gf[k]))])),
  };
};

// ------------------------------------------------------------------------------------------------ Antler Toss
// wind (the 56-tick cone warning less one strike: the weight goes back, the head goes down and to its right until the
// rack points at the hero, a forehoof scrapes), toss (2.5 frames: it drives forward and throws the rack up and across
// to its left), held (3 frames), recoil (0.25 s), settle.
const W56 = 56 / 60;
const AT = { wind: W56 - STRIKE, hit: W56, held: W56 + HOLD, land: W56 + HOLD + 0.25, rec: W56 + HOLD + 0.25, end: W56 + HOLD + 0.85 };
const LOW = { oy: -0.045, oz: -0.05, bp: -0.1, sp: -0.03, n1p: -0.56, n2p: -0.42, hp: -0.5, n1y: -0.2, n2y: -0.2, hy: -0.22, hr: -0.2 };
const UP = { oy: 0.012, oz: 0.055, bp: 0.14, sp: 0.05, cp: 0.07, n1p: 0.36, n2p: 0.3, hp: 0.42, n1y: 0.2, n2y: 0.18, hy: 0.22, hr: 0.2 };
const antlerToss = {
  dur: AT.end, contact: [AT.hit, AT.land], kinds: ['toss', 'hooves'], cues: { cone: [0, AT.hit] },
  phases: [['wind up', 0], ['toss', AT.wind], ['contact held', AT.hit], ['recoil', AT.held], ['settle', AT.rec]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.2, { oy: -0.02, oz: -0.02, bp: -0.05, n1p: -0.26, n2p: -0.2, hp: -0.3, n1y: -0.08, hy: -0.12 }],
      [0.6, LOW],
      [AT.wind, { ...LOW, oz: -0.06, n1p: -0.6, hp: -0.54 }],
      [AT.hit, UP, 'in'],
      [AT.held, { ...UP, n1p: 0.38, hp: 0.45 }],
      [AT.rec, { oy: -0.012, oz: 0.02, bp: 0.03, n1p: 0.1, n2p: 0.06, hp: 0.1, hy: 0.06 }, 'out'],
      [AT.rec + 0.3, { oy: -0.015, bp: -0.01, n1p: -0.04, hp: -0.03 }],
      [AT.end, {}]])(t);
    const tre = pulse(t, 0.6, 0.68, AT.wind - 0.03, AT.wind);
    return addPose(k, { hy: 0.02 * Math.sin(70 * t) * tre, br: 0.01 * Math.sin(38 * t) * tre }, ears(0.7 * pulse(t, 0.05, 0.3, AT.rec, AT.end - 0.2), 0.1 * tre), tail(0.6 * pulse(t, 0.1, 0.4, AT.rec, AT.end), 0));
  },
  feet: (t) => { // the forehooves leave the floor as the rack goes up and come down together
    const F = allPlanted(); scrape(F, 'FR', t, 0.12, 0.9);
    const h = pulse(t, AT.wind, AT.hit, AT.held + 0.04, AT.land);
    if (h > 0) for (const k of ['FL', 'FR']) F[k] = { p: off(k, 0, 0.075 * h, 0.06 * h), pitch: 0.4 * h };
    return F; },
};

// ------------------------------------------------------------------------------------------------ Hart's Leap
// bow (the rack goes down at the hero and the chest dips), gather (it sits back on its haunches and the forehooves
// leave the floor: 45 percent of the 74-tick ring, as the game crouches it), bound (the hind legs drive, the forelegs
// tuck, it sails in a 1.25 u arc and is over the mark at 95 percent of the warning), land (all four hooves on the
// warning's end, the body squashes), held (3 frames), settle.
const LEAP_U = 5.0;                                                       // the hero stand-in is 5 u away
const W74 = 74 / 60;
const HP = { bow: 0.3, crouch: 0.45 * W74, land: W74, held: W74 + HOLD, end: W74 + HOLD + 0.65 };
const PD = LEAP_U / CFG.unit, ARC = 1.25 / CFG.unit;
const pU = (t) => clamp((t - HP.crouch) / (HP.land - HP.crouch));
const pTravel = (t) => PD * (1 - Math.pow(1 - pU(t), 1.6));
const airKeys = {
  F: [[0, { y: -0.4, z: 0.02, p: 0.3 }], [0.16, { y: -0.23, z: 0.1, p: 1.25 }], [0.55, { y: -0.2, z: 0.14, p: 1.3 }], [0.82, { y: -0.34, z: 0.2, p: 0.5 }], [1, { y: -0.425, z: 0.06, p: 0 }]],
  H: [[0, { y: -0.47, z: -0.04, p: 0.6 }], [0.2, { y: -0.36, z: -0.3, p: 0.9 }], [0.55, { y: -0.3, z: -0.36, p: 0.8 }], [0.85, { y: -0.42, z: -0.1, p: 0.3 }], [1, { y: -0.49, z: -0.02, p: 0 }]],
};
const hartsLeap = {
  dur: HP.end, contact: [HP.land], kinds: ['land'], travel: pTravel, cues: { ring: [0, HP.land] },
  phases: [['bow', 0], ['gather', HP.bow], ['bound', HP.crouch], ['lands', HP.land - STRIKE], ['contact held', HP.land], ['settle', HP.held]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.14, { oy: -0.02, bp: -0.1, n1p: -0.3, n2p: -0.2, hp: -0.3 }],
      [HP.bow, { oy: -0.05, oz: 0.0, bp: -0.2, sp: -0.06, n1p: -0.52, n2p: -0.36, hp: -0.45 }],
      [0.46, { oy: -0.1, oz: -0.07, bp: 0.12, sp: 0.03, n1p: -0.12, n2p: -0.06, hp: -0.1 }],
      [HP.crouch, { oy: -0.12, oz: -0.085, bp: 0.3, sp: 0.05, cp: 0.05, n1p: 0.08, n2p: 0.05, hp: 0.0 }],
      [HP.crouch + 0.07, { oy: -0.03, oz: 0.0, bp: 0.42, sp: 0.06, cp: 0.06, n1p: 0.0, hp: -0.1 }, 'out'],
      [HP.crouch + 0.34, { oy: 0.0, oz: 0.02, bp: 0.06, n1p: 0.05, hp: -0.05 }],
      [HP.land - 0.1, { oy: -0.01, oz: 0.03, bp: -0.28, sp: -0.04, cp: -0.05, n1p: 0.2, n2p: 0.1, hp: 0.1 }],
      [HP.land, { oy: -0.075, oz: 0.03, bp: -0.12, sp: -0.06, cp: -0.05, n1p: -0.16, n2p: -0.1, hp: -0.1 }, 'in'],
      [HP.held, { oy: -0.09, oz: 0.032, bp: -0.12, sp: -0.06, cp: -0.05, n1p: -0.18, n2p: -0.1, hp: -0.1 }],
      [HP.held + 0.22, { oy: -0.03, oz: 0.01, bp: 0.03, n1p: 0.06, hp: 0.06 }, 'out'],
      [HP.held + 0.42, { oy: -0.012, bp: -0.01, n1p: -0.03, hp: 0.02 }],
      [HP.end, {}]])(t);
    const u = pU(t), fly = pulse(t, HP.crouch, HP.crouch + 0.06, HP.land - 0.04, HP.land);
    return addPose(k, { oy: ARC * 4 * u * (1 - u) }, ears(0.75 * pulse(t, 0.05, 0.25, HP.held, HP.end), 0.1), tail(0.9 * pulse(t, 0.3, HP.crouch, HP.held, HP.end), 0.1 * Math.sin(20 * t) * fly));
  },
  feet: (t, B) => {
    const F = {}; const u = pU(t);
    for (const k of LEGS) {
      const front = k[0] === 'F', sgn = k[1] === 'L' ? 1 : -1; const lift = front ? HP.crouch - 0.08 : HP.crouch + 0.01;
      const land = off(k, 0, 0, PD);
      if (t < lift) { F[k] = plant(REST[k]); if (!front && t > HP.crouch - 0.05) { roll(k, Object.assign(F[k], { pitch: 0.6 * smooth((t - HP.crouch + 0.05) / 0.06) })); F[k].lock = false; } continue; }   // the hind hooves roll onto their toes as they drive
      if (t < HP.land) {
        const q = track(airKeys[k[0]])(u); const a = B.loc(k, [0.004 * sgn, q.y, q.z]);
        const out = smooth((t - lift) / (front ? 0.1 : 0.04)), inn = smooth((t - (HP.land - 0.06)) / 0.06);
        const p = REST[k].clone().lerp(a, out).lerp(land, inn); p.y = Math.max(p.y, inn > 0 ? 0.05 * (1 - inn) ** 1.5 : 0.012 + 0.02 * out);
        F[k] = { p, pitch: q.p * out * out * (1 - inn) }; continue;
      }
      F[k] = plant(land);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Rage (a bellow: the game shows only the glow and a sound)
// coil (the head drops and a forehoof comes up), bellow (the neck goes out and up, the rack is laid back and shaken),
// stamp (2.5 frames), holds it, then squares up.
const RG = { coil: 0.3, stamp: 0.56 + STRIKE, end: 1.6 };
const rage = {
  dur: RG.end, contact: [RG.stamp], kinds: ['stamp'], phases: [['coil', 0], ['bellow', RG.coil], ['stamp', 0.56], ['holds the bellow', RG.stamp], ['squares up', 1.15]],
  pose: (t) => {
    const k = track([[0, {}],
      [RG.coil, { oy: -0.03, bp: -0.06, sp: -0.03, n1p: -0.36, n2p: -0.24, hp: -0.32 }],
      [0.5, { oy: -0.04, bp: 0.1, cp: 0.07, sp: 0.04, n1p: 0.1, n2p: 0.2, hp: 0.4 }, 'out'],
      [RG.stamp, { oy: -0.04, bp: 0.07, cp: 0.07, sp: 0.03, n1p: 0.12, n2p: 0.22, hp: 0.4 }],
      [1.15, { oy: -0.036, bp: 0.08, cp: 0.06, sp: 0.03, n1p: 0.1, n2p: 0.19, hp: 0.36 }],
      [1.38, { oy: -0.012, bp: 0.01, n1p: 0.02, n2p: 0.02, hp: 0.0 }],
      [RG.end, {}]])(t);
    const env = pulse(t, 0.44, 0.54, 1.05, 1.2);
    return addPose(k, { hy: 0.04 * Math.sin(60 * t) * env, hr: 0.09 * Math.sin(60 * t + 1.2) * env, n2p: 0.02 * Math.sin(30 * t) * env, cp: 0.012 * Math.sin(60 * t) * env },
      ears(0.8 * pulse(t, 0.1, 0.3, 1.1, 1.4), -0.1 * env), tail(0.9 * pulse(t, 0.2, 0.45, 1.15, 1.45), 0.15 * Math.sin(40 * t) * env));
  },
  feet: (t) => {
    const F = allPlanted(); const r = REST.FL, up = off('FL', 0.005, 0.15, 0.045);
    if (t > 0.2 && t < RG.stamp) {
      if (t < 0.46) { const u = smooth((t - 0.2) / 0.26); F.FL = { p: r.clone().lerp(up, u), pitch: 1.15 * Math.sin(Math.PI * 0.5 * u) }; }
      else if (t < 0.56) F.FL = { p: up.clone().add(V3(0, 0.008 * Math.sin(40 * t), 0)), pitch: 1.15 };
      else { const u = ((t - 0.56) / STRIKE) ** 2; F.FL = { p: up.clone().lerp(r, u), pitch: 1.15 * (1 - u) }; } }
    return F;
  },
};
// The enraged state, played on top of anything (spine, neck, head, ears and tail only): the rack carried low and
// forward, the ears pinned, quick breath, the tail up.
const rageHold = {
  dur: 0.5, loop: true, upperOnly: true,
  pose: (t) => { const w = 2 * Math.PI * t / 0.5; return addPose({ cp: 0.012 * Math.sin(w), sp: -0.008 * Math.sin(w), n1p: -0.2 + 0.015 * Math.sin(w + 0.8), n2p: -0.12, hp: -0.16 + 0.012 * Math.sin(2 * w), hr: 0.02 * Math.sin(w) }, ears(0.7, 0), tail(0.6, 0.06 * Math.sin(w))); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything. Only the spine, neck, head, ears and tail move, so planted hooves stay planted.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { n1p: 0.17, n2p: 0.12, hp: -0.13, hy: 0.2, hr: 0.15, n1y: 0.09, n1r: 0.04 }, 'out'], [0.17, { n1p: -0.05, n2p: -0.02, hy: -0.06, hr: -0.04 }], [0.42, {}]])(t),
    ears(0.8 * pulse(t, 0, 0.04, 0.2, 0.4), 0), tail(0.7 * pulse(t, 0, 0.05, 0.2, 0.4), 0)),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers it: shoved back a step on each leg, the head whips away, it shakes the rack and squares up.
const HB = -0.085;
const heavyHit = {
  dur: 1.15, contact: [0, 0.44], kinds: ['taken', 'catch'], travel: (t) => HB * EASE.out(clamp(t / 0.3)), phases: [['hit', 0], ['stagger', 0.07], ['shake', 0.38], ['squares up', 0.74]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.038, oy: -0.02, bp: 0.13, br: 0.08, by: -0.1, sp: 0.06, cp: 0.09, n1p: 0.3, n2p: 0.22, hp: -0.2, hy: -0.4, n2y: -0.2, n1y: -0.1, hr: -0.2 }, 'out'],
      [0.24, { oz: -0.012, oy: -0.05, bp: 0.03, br: -0.035, by: -0.04, n1p: 0.04, n2p: 0.0, hp: -0.28, hy: -0.24, n2y: -0.1, hr: 0.1 }],
      [0.44, { oy: -0.024, bp: -0.045, n1p: -0.2, n2p: -0.12, hp: -0.2, hy: 0.06 }],
      [0.76, { oy: -0.006, bp: 0.012, n1p: -0.05, n2p: -0.02, hp: -0.02 }],
      [1.15, {}]])(t);
    const sh = pulse(t, 0.36, 0.44, 0.62, 0.76);
    return addPose(k, { hy: 0.08 * Math.sin(30 * (t - 0.36)) * sh, hr: 0.14 * Math.sin(30 * (t - 0.36) + 1.3) * sh, n2y: 0.04 * Math.sin(30 * (t - 0.36) - 0.5) * sh },
      ears(0.85 * pulse(t, 0, 0.05, 0.5, 0.8), 0.2 * sh), tail(0.8 * pulse(t, 0, 0.06, 0.5, 0.9), 0));
  },
  feet: (t) => ({
    HL: steps(t, REST.HL, [[0.035, 0.165, off('HL', 0, 0, HB), 0.045, 0.4]]), FR: steps(t, REST.FR, [[0.075, 0.205, off('FR', 0, 0, HB), 0.05]]),
    HR: steps(t, REST.HR, [[0.15, 0.275, off('HR', 0, 0, HB), 0.04, 0.4]]), FL: steps(t, REST.FL, [[0.2, 0.33, off('FL', 0, 0, HB), 0.05]]),
  }),
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: it comes up low, head down, as if it had
// been asleep under its moss; it rises, shakes the rack so the moss swings, and stamps once.
const SP = { rise: 0.55, shake: 0.62, stamp: 1.05 + STRIKE, end: 1.6 };
const spawn = {
  dur: SP.end, contact: [SP.stamp], kinds: ['stamp'], scale: (t) => 0.03 + 0.97 * EASE.out(clamp(t / SPAWN)),
  phases: [['grows', 0], ['rises', SPAWN], ['shakes off the sleep', SP.shake], ['stamp', 1.05], ['stands', SP.stamp]],
  pose: (t) => {
    const LOWP = { oy: -0.13, bp: -0.1, sp: -0.08, n1p: -0.5, n2p: -0.38, hp: -0.5 };
    const k = track([[0, LOWP], [SPAWN, LOWP], [SP.rise, { oy: -0.02, bp: 0.0, sp: -0.02, n1p: -0.2, n2p: -0.12, hp: -0.22 }],
      [0.9, { oy: -0.024, bp: 0.05, cp: 0.04, n1p: 0.1, n2p: 0.1, hp: 0.1 }], [1.05, { oy: -0.04, bp: 0.08, cp: 0.06, sp: 0.03, n1p: 0.22, n2p: 0.18, hp: 0.2 }, 'out'],
      [SP.stamp, { oy: -0.04, bp: 0.07, cp: 0.06, sp: 0.03, n1p: 0.22, n2p: 0.18, hp: 0.18 }], [1.35, { oy: -0.014, bp: 0.02, n1p: 0.08, n2p: 0.05, hp: 0.04 }], [SP.end, {}]])(t);
    const sh = pulse(t, SP.shake, SP.shake + 0.06, 0.92, 1.0);
    return addPose(k, { hr: 0.22 * Math.sin(26 * (t - SP.shake)) * sh, n2r: 0.1 * Math.sin(26 * (t - SP.shake) - 0.7) * sh, n1r: 0.05 * Math.sin(26 * (t - SP.shake) - 1.3) * sh, cr: 0.02 * Math.sin(26 * (t - SP.shake) - 1.8) * sh },
      ears(0.5 * pulse(t, 0, 0.1, 0.5, 0.8) + 0.5 * sh, 0), tail(0.5 * sh, 0.4 * Math.sin(26 * t) * sh));
  },
  feet: (t) => {
    const F = allPlanted(); const r = REST.FR, up = off('FR', -0.004, 0.12, 0.04);
    if (t > 0.86 && t < SP.stamp) {
      if (t < 1.0) { const u = smooth((t - 0.86) / 0.14); F.FR = { p: r.clone().lerp(up, u), pitch: 1.1 * Math.sin(Math.PI * 0.5 * u) }; }
      else if (t < 1.05) F.FR = { p: up.clone(), pitch: 1.1 };
      else { const u = ((t - 1.05) / STRIKE) ** 2; F.FR = { p: up.clone().lerp(r, u), pitch: 1.1 * (1 - u) }; } }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ death
// Its hooves unlock. A jolt, the forelegs buckle, the hindquarters give way and it goes down on its right side; the
// head stays up a moment, then sinks until the rack props it off the floor. The moss settles over it.
const D = { knees: 0.6, side: 1.3, head: 2.0, end: 2.9 };
const DOWN = { bp: 0.0, oy: -0.354, oz: -0.02, br: 1.4, by: 0.16, sr: 0.03, cr: 0.03 };
const UPHEAD = { n1p: 0.2, n2p: 0.18, hp: 0.16, n1y: 0.3, n2y: 0.25, hy: 0.0, hr: -0.75, n1r: -0.32, n2r: -0.3 };   // the body is down, the head still held up and level
const STIFF = 0.45;                                              // the hanging moss ends draped along the floor, not through it
const LIE = { n1p: 0.05, n2p: 0.05, hp: 0.0, n1y: -0.3, n2y: -0.3, hy: -0.3, hr: 0.2, n1r: 0.1, n2r: 0.1 };   // the head down on its side, the low antler along the floor
const death = {
  dur: D.end, contact: [D.side - 0.04, D.head], kinds: ['thud', 'settle'], phases: [['jolt', 0], ['buckles', 0.14], ['falls', D.knees], ['head sinks', D.side + 0.2], ['still', D.head]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.12, { bp: 0.05, oy: -0.02, br: -0.05, n1p: 0.3, n2p: 0.22, hp: 0.3, hy: 0.15 }, 'out'],
      [D.knees, { bp: -0.4, oy: -0.05, oz: 0.02, br: 0.06, sp: -0.05, n1p: -0.05, n2p: 0.1, hp: 0.3, hy: -0.1 }],
      [0.94, { bp: -0.2, oy: -0.18, oz: 0.0, br: 0.55, by: 0.1, sp: -0.02, sr: 0.06, n1p: 0.2, n2p: 0.2, hp: 0.25, hy: 0.1, hr: -0.3, n1r: -0.15 }],
      [D.side, { ...DOWN, oy: DOWN.oy + 0.006, br: 1.42, ...UPHEAD }, 'in'],
      [D.side + 0.2, { ...DOWN, ...UPHEAD, n1y: UPHEAD.n1y + 0.04, hp: UPHEAD.hp + 0.04 }],
      [D.head, { ...DOWN, ...LIE }, 'in'],
      [D.head + 0.1, { ...DOWN, ...LIE, n1y: LIE.n1y + 0.03, n2y: LIE.n2y + 0.03, hp: LIE.hp + 0.03 }, 'out'],
      [D.end, { ...DOWN, ...LIE }],
    ])(t);
    const tw = pulse(t, D.side, D.side + 0.1, D.head - 0.25, D.head - 0.05);
    return addPose(k, { hy: 0.03 * Math.sin(47 * t) * tw, n2p: 0.02 * Math.sin(31 * t) * tw, stiff: STIFF * smooth((t - 0.9) / 0.5) }, ears(0.7 * pulse(t, 0, 0.06, 1.0, 1.6), -0.25 * smooth((t - D.head) / 0.5)), tail(0.6 * pulse(t, 0, 0.1, 0.8, 1.3), 0));
  },
  feet: (t, B) => {
    const u = smooth((t - 0.5) / 0.7); // the hooves let go of the floor as it falls
    const lie = { FL: [-0.11, -0.25, 0.1], FR: [-0.02, -0.28, 0.15], HL: [-0.1, -0.31, 0.03], HR: [-0.02, -0.34, 0.1] };
    const slip = { FL: off('FL', 0.01, 0, -0.03), FR: off('FR', -0.012, 0, -0.045), HL: REST.HL, HR: REST.HR };
    const F = {};
    for (const k of LEGS) {
      const a = REST[k].clone().lerp(slip[k], smooth((t - 0.14) / 0.4));
      const twitch = 0.012 * Math.sin(30 * t + (k === 'FL' ? 0 : 2)) * pulse(t, D.side, D.side + 0.1, D.side + 0.5, D.side + 0.8);
      const l = lie[k]; const lp = B.loc(k, [l[0], l[1] + twitch, l[2]]); lp.y = Math.max(lp.y, 0.034 * u); F[k] = { p: a.lerp(lp, u), pitch: 0.55 * u, q: I.clone().slerp(B.parQ(k), u), lock: t < 0.14 };
    }
    return F;
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), antlerToss, hartsLeap, rage, rageHold, hurt, heavyHit, spawn, death };
