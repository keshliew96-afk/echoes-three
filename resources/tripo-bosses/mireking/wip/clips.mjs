// The Mire King's moves. Units are model units (the model is 1 tall to the tips of its crown; the page draws it 3.0 u tall,
// CFG.unit: 2.35 u wide and 2.5 u long, beside the game toad's 2.7 u). Timings come from the game: MIREKING in
// src/sim/bosses/mireking.js (wade 1.0 u/s; Tongue Lash: 48-tick lane, 12-tick yank of 2 u; Belly Flop: 66-tick ring with a
// 20-tick leap; Swallow: 78-tick ring, pull 1.6 u/s), the phases of render/boss/mirekingfacet.js, and the beats in
// render/facet/beats.js (strike 2.5 frames, contact held 3 frames).
import fs from 'fs';
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, frac, makeRig } from '../../kit/quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_; const D2R = Math.PI / 180;
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const J = (n) => V3(...skel.pos[skel.names.indexOf(n)]);
const qAx = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const XA = V3(1, 0, 0), YA = V3(0, 1, 0), ZA = V3(0, 0, 1);
const NT = skel.tongue.n, DT = skel.tongue.d;
// the tongue: a chain of eight joints. Each slides along its parent (tl: -DT draws it right in), the root aims it (tgp down,
// tgy to its left), and the rest curl (tgc, each a little down) and wave (tgw, tgf) side to side
const tgQ = (k) => (p) => (k === 0 ? qAx(YA, p.tgy || 0).multiply(qAx(XA, p.tgp || 0)) : qAx(XA, p.tgc || 0).multiply(qAx(YA, (p.tgw || 0) * Math.sin(k * 1.0 + (p.tgf || 0)))));
export const U = 3.0;
export const CFG = {
  name: 'mireking', unit: U, base: { tl: -DT * 0.93, tgs: -0.3 },
  chain: [['hips', 'b'], ['chest', 'c'], ['head', 'h']],
  extras: [['jaw', 'j'], ['sac', 's'], ['belly', 'g'], ['crown', (p) => (p.kqw ? new THREE.Quaternion(p.kqx, p.kqy, p.kqz, p.kqw).normalize() : qAx(YA, p.ky || 0).multiply(qAx(XA, -(p.kp || 0))).multiply(qAx(ZA, p.kr || 0)))], ['eyeL', 'el'], ['eyeR', 'er'], ['weed1', 'w1'], ['weed2', 'w2'], ...Array.from({ length: NT }, (_, k) => ['tg' + k, tgQ(k)])],
  slides: [...Array.from({ length: NT - 1 }, (_, k) => ['tg' + (k + 1), 'tl', [0, 0, 1]]), ['crown', 'kx', [1, 0, 0]], ['crown', 'kb', [0, 1, 0]], ['crown', 'kz', [0, 0, 1]]],
  scales: [['sac', 'sacs'], ['belly', 'bels'], ['eyeL', 'eLs'], ['eyeR', 'eRs'], ['tg0', 'tgs']],
  hang: [['weed1', 1, 0.03], ['weed2', 1, 0.03]],
  legs: {
    FL: { kind: 'limb', b: ['fUpL', 'fLoL', 'fHandL', 'fFingL'] }, FR: { kind: 'limb', b: ['fUpR', 'fLoR', 'fHandR', 'fFingR'] },
    HL: { kind: 'limb', b: ['hThL', 'hShL', 'hFtL', 'hToeL'] }, HR: { kind: 'limb', b: ['hThR', 'hShR', 'hFtR', 'hToeR'] },
  },
  springs: [{ bone: 'crown', k: 520, c: 10, max: 0.16, gain: 0.8 }, { bone: 'weed1', k: 80, c: 5, max: 1.0, floor: 0.03 }, { bone: 'weed2', k: 60, c: 4, max: 1.1, floor: 0.03 }],
};
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const END = Object.fromEntries(LEGS.map((k) => [k, V3(...skel.ends[CFG.legs[k].b[3]])]));
export const REST = Object.fromEntries(LEGS.map((k) => [k, END[k].clone().setY(0)]));
const SX = { FL: 1, FR: -1, HL: 1, HR: -1 };
const plant = (p, pitch = 0, o = {}) => ({ p: p.clone(), lock: true, pitch, yaw: 0, ...o });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x * SX[k], y, z)); // x: outward
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
// ---- the parts of the face and body
const jaw = (open = 0) => ({ jp: -1.0 * open });                      // 1 = as wide as it goes
const sac = (s = 0) => ({ sacs: 0.55 * s });                          // the throat sac: 1 = blown right up
const belly = (s = 0) => ({ bels: 0.22 * s });                        // the belly and flanks swelling
const blink = (e = 0, l = e) => ({ eLs: -0.42 * e, elb: -0.012 * e, eRs: -0.42 * l, erb: -0.012 * l }); // a toad blinks by drawing its eyes down into its head
const bulge = (e = 0) => ({ eLs: 0.14 * e, eRs: 0.14 * e });
const crown = (hop = 0, tip = 0, side = 0) => ({ kb: hop, kp: tip, kr: side });
// the tongue out to length len (model units from its root to the tip), aimed down by `down` (rad, in the world) given the pitches above it
const TIP = skel.tongue.tip;
// the tongue at length L (model units, root to tip): its joints slide apart; at 0 it is drawn in and shrunk out of sight
const tongueLen = (L) => { const d = Math.max(0.0035, (L - TIP) / (NT - 1)); const s_ = smooth(L / 0.1); return { tl: (d - DT - CFG.base.tl) * s_, tgs: -CFG.base.tgs * s_ }; };
const rigS = makeRig(skel, CFG);
const P0 = (n) => rigS.P0[n];
// aim the tongue from where the pose p puts its root to a point (root space), at lenK of the distance
function aimTongue(p, target, lenK = 1, o = {}) {
  const S = rigS.solve(addPose(CFG.base, p)); const d = target.clone().sub(S.PW.tg0); const L = d.length() * lenK; const dl = d.applyQuaternion(S.QW.jaw.clone().invert()).normalize();
  return { ...tongueLen(L), tgy: Math.atan2(dl.x, dl.z), tgp: Math.atan2(-dl.y, Math.hypot(dl.x, dl.z)), ...o };
}
// where a leg's foot is in the bind pose, from its root, in its parent's frame: a limb held there keeps the sculpted fold
const RLOC = Object.fromEntries(LEGS.map((k) => [k, END[k].clone().sub(P0(CFG.legs[k].b[0]))]));
const held = (B, k, dx = 0, dy = 0, dz = 0, o = {}) => ({ p: B.loc(k, [RLOC[k].x + dx * SX[k], RLOC[k].y + dy, RLOC[k].z + dz]), q: B.parQ(k), ...o });
const fqOf = (a) => (a.q ? a.q : qAx(YA, a.yaw || 0));
const mixT = (a, b, u, lift = 0) => { const p = a.p.clone().lerp(b.p, u); p.y += lift * Math.sin(Math.PI * clamp(u)); // position, heel pitch, toe curl and the foot's own frame all blend
  return { ...b, p, pitch: lerp(a.pitch || 0, b.pitch || 0, u), curl: lerp(a.curl || 0, b.curl || 0, u), q: fqOf(a).clone().slerp(fqOf(b), clamp(u)), lock: false }; };
// the body cannot go through the floor: the lowest point of its hull for a pitch about the hips
const HULL = skel.hull.map((h) => V3(...h).sub(J('hips')));
const floorOy = (bp, br = 0) => { const q = qAx(XA, -bp).multiply(qAx(ZA, br)); let lo = 1e9; const v = V3(); for (const h of HULL) { v.copy(h).applyQuaternion(q); if (v.y < lo) lo = v.y; } return -(J('hips').y + lo); };

// ------------------------------------------------------------------------------------------------ idle
// 6 s. A toad sits like a stone and lives in its throat: the sac flutters in quick runs with pauses between, the flanks breathe
// slowly underneath. It blinks by pulling its eyes down. Once a loop it looks to one side and shifts its weight, once it swallows
// (a gulp that drops the eyes), and its fingers drum once. The crown rides the head and the weed sways.
const TAU = 2 * Math.PI;
const flutter = (t) => { // runs of quick throat beats: 0..1
  const runs = [[0.2, 1.5, 5.5], [2.2, 3.3, 6], [4.5, 5.6, 5.5]]; let s = 0;
  for (const [a, b, hz] of runs) s += pulse(t, a, a + 0.12, b - 0.12, b) * (0.5 - 0.5 * Math.cos(TAU * hz * (t - a)));
  return s;
};
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const br = Math.sin(TAU * t / 3 - 0.6);                       // the slow breath, two to a loop
    const look = pulse(t, 1.55, 1.8, 2.9, 3.25);                   // looks to its left
    const gulp = bump(t, 3.95, 0.5);                               // the swallow
    const bl = Math.max(bump(t, 0.9, 0.2), bump(t, 3.95, 0.3), bump(t, 5.3, 0.18));
    const shift = pulse(t, 1.5, 2.0, 4.3, 4.9);                    // weight onto its right side
    return addPose(
      { oy: 0.004 * br - 0.006 * gulp - 0.004 * shift, ox: -0.012 * shift, br: -0.02 * shift, bp: 0.012 * br + 0.02 * gulp, by: 0.035 * look, cy: 0.03 * look, cr: 0.012 * shift },
      { hy: 0.07 * look, hp: 0.02 * br - 0.05 * gulp + 0.03 * look, hr: -0.03 * look },
      jaw(0.02 * gulp), sac(0.1 + 0.07 * br + 0.2 * flutter(t) + 0.45 * bump(t, 3.8, 0.45) - 0.1 * bump(t, 4.15, 0.3)), belly(0.25 + 0.3 * br), blink(bl),
      crown(0, 0.01 * br, 0.008 * Math.sin(TAU * t / 6)),
    );
  },
  feet: (t) => { const o = allPlanted(); const d = bump(t, 4.75, 0.2) + bump(t, 5.0, 0.2); // the left hand drums: the heel of the hand lifts, the fingers stay
    o.FL = plant(REST.FL, 0.3 * d); return o; },
};

// ------------------------------------------------------------------------------------------------ wade (walk) and turn
// 1.0 u/s, the game's. A toad walks: diagonal pairs, a hand and the far foot, with the heavy body swinging over whichever side
// carries it. 0.9 s a cycle. The hands reach and the heel of the hand rolls up as it leaves; the long hind foot peels off the floor
// heel first and is carried forward folded.
const WT = 0.9; const V = 1.0 / U;
const GAIT = { T: WT, duty: 0.64, v: V };
const GF = {
  FL: { phase: 0, n: [REST.FL.x + 0.01, REST.FL.z - 0.025], lift: 0.05, droop: 0.5, push: 0.5 }, HR: { phase: 0.1, n: [REST.HR.x - 0.01, REST.HR.z + 0.03], lift: 0.035, droop: 0.55, push: 0.6 },
  FR: { phase: 0.5, n: [REST.FR.x - 0.01, REST.FR.z - 0.025], lift: 0.05, droop: 0.5, push: 0.5 }, HL: { phase: 0.6, n: [REST.HL.x + 0.01, REST.HL.z + 0.03], lift: 0.035, droop: 0.55, push: 0.6 },
};
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = TAU * t / WT;
    return addPose(
      { oy: -0.012 + 0.008 * Math.cos(2 * w - 0.9), ox: -0.016 * Math.sin(w + 0.5), br: -0.045 * Math.sin(w + 0.35), by: 0.06 * Math.sin(w + 0.1), bp: -0.03 + 0.012 * Math.sin(2 * w + 0.4), oz: 0.008 * Math.sin(2 * w + 1.2) },
      { cy: -0.03 * Math.sin(w + 0.3), cr: 0.02 * Math.sin(w + 0.35), hy: -0.035 * Math.sin(w + 0.2), hp: 0.03 + 0.012 * Math.sin(2 * w + 2.2), hr: 0.02 * Math.sin(w + 0.5) },
      sac(0.12 + 0.1 * (0.5 + 0.5 * Math.sin(2 * w + 0.5))), belly(0.3 + 0.12 * Math.sin(2 * w - 0.4)), blink(0),
      crown(0, 0, 0),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
// 120 degrees a second (my number), on the spot: the same diagonal pairs with shorter, quicker steps, the hands stepping round
const turn = (dir) => {
  const TT = 0.6; const g = { T: TT, duty: 0.62, v: 0, omega: dir * TAU / 3.0, pivot: [0, -0.08] };
  const gf = Object.fromEntries(LEGS.map((k) => [k, { ...GF[k], n: [REST[k].x, REST[k].z], lift: k[0] === 'F' ? 0.04 : 0.03, push: 0.35 }]));
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = TAU * t / TT;
      return addPose({ oy: -0.008 + 0.006 * Math.cos(2 * w - 0.7), br: -0.03 * Math.sin(w + 0.3) - 0.02 * dir, ox: -0.01 * Math.sin(w + 0.5), bp: -0.01 },
        { cy: 0.04 * dir, hy: 0.09 * dir, hr: -0.03 * dir, hp: 0.02 }, sac(0.15 + 0.08 * Math.sin(2 * w)), belly(0.3)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

const RESTP = addPose(sac(0.12), belly(0.3));

// ------------------------------------------------------------------------------------------------ Tongue Lash
// The game's: a 48-tick lane warning (the draw), the lash in 2.5 frames on the hit, held 3 frames, a 12-tick yank of 2 u, settle.
// It narrows its eyes and takes aim, sits back on its haunches as the throat fills, then throws its whole weight forward and the
// tongue goes the length of the lane to the hero at its far end. The pad sticks; the tongue drags the hero 2 u in as the body
// rocks back; it lets go, whips home, and the mouth shuts on a gulp.
export const LASH = { lane: 5.0, hero: 4.7, yank: 2.0, chest: 0.62, t: {} };
const LT = { draw: 48 / 60 - STRIKE, hit: 48 / 60 }; LT.held = LT.hit + HOLD; LT.reel = LT.held + 12 / 60; LT.home = LT.reel + 0.12; LT.end = Math.round((LT.reel + 0.62) * 60) / 60;
LASH.t = LT;
const lashK = track([
  [0, RESTP],
  [0.14, addPose({ oy: -0.008, bp: -0.03, hp: -0.02 }, sac(0.2), belly(0.35), blink(0.55))],
  [0.46, addPose({ oz: -0.03, oy: -0.004, bp: 0.09, cp: 0.02, hp: 0.08 }, jaw(0.1), sac(0.75), belly(0.6), blink(0.3))],
  [LT.draw - 0.06, addPose({ oz: -0.046, oy: -0.008, bp: 0.13, cp: 0.03, hp: 0.12 }, jaw(0.3), sac(1.0), belly(0.8), bulge(0.6))],
  [LT.draw, addPose({ oz: -0.05, oy: -0.01, bp: 0.14, cp: 0.03, hp: 0.13 }, jaw(0.42), sac(1.0), belly(0.8), bulge(0.8))],
  [LT.hit, addPose({ oz: 0.075, oy: -0.022, bp: -0.13, cp: -0.03, hp: 0.0 }, jaw(0.82), sac(0.15), belly(0.15), bulge(1)), 'out'],
  [LT.held, addPose({ oz: 0.08, oy: -0.024, bp: -0.135, cp: -0.03, hp: 0.0 }, jaw(0.82), sac(0.12), belly(0.12), bulge(1)), 'lin'],
  [LT.reel, addPose({ oz: -0.02, oy: -0.004, bp: 0.06, cp: 0.02, hp: 0.06 }, jaw(0.6), sac(0.3), belly(0.45), bulge(0.3)), 'out'],
  [LT.home, addPose({ oz: -0.03, oy: 0, bp: 0.08, cp: 0.02, hp: 0.08 }, jaw(0.5), sac(0.35), belly(0.5))],
  [LT.home + 0.1, addPose({ oz: -0.012, oy: -0.006, bp: 0.02, hp: -0.03 }, jaw(0.0), sac(0.85), belly(0.45), blink(1))],
  [LT.home + 0.26, addPose({ oz: 0, oy: 0.003, bp: 0.0, hp: 0.02 }, jaw(0), sac(0.25), belly(0.55), blink(0.2))],
  [LT.end, RESTP],
]);
const lash = {
  dur: LT.end, contact: [LT.hit], kinds: ['lash'], cues: { lane: [0, LT.hit], yank: [LT.held, LT.reel], home: [LT.home], gulp: [LT.home + 0.1] },
  phases: [['draw', 0], ['lash', LT.draw], ['struck', LT.hit], ['reel in', LT.held], ['settle', LT.reel]],
  pose: (t) => {
    const p = lashK(t); const hz = (LASH.hero - 0.26 - LASH.yank * clamp((t - LT.held) / (LT.reel - LT.held))) / U; const tgt = V3(0, LASH.chest / U, hz);
    let k = 0, o = {};
    if (t < LT.draw - 0.1) k = 0;
    else if (t < LT.draw) { const u = smooth((t - LT.draw + 0.1) / 0.1); k = 0.035 * u; o = { tgc: 0.25 * u }; }          // the tip shows in the opening mouth, curled
    else if (t < LT.hit) { const u = (t - LT.draw) / STRIKE; k = lerp(0.035, 1, EASE.out(u)); o = { tgc: 0.25 * (1 - u) ** 3 }; }
    else if (t < LT.reel) { k = 1; o = { tgw: 0.05 * Math.sin((t - LT.held) * 60) * clamp((t - LT.held) / 0.05), tgf: t * 30 }; }   // stuck fast: it shivers as it hauls
    else if (t < LT.home) { const u = (t - LT.reel) / (LT.home - LT.reel); k = lerp(1, 0.0, EASE.in(u)); o = { tgw: 0.28 * Math.sin(Math.PI * u), tgf: t * 40, tgc: 0.12 * u }; } // lets go and whips home
    const w = smooth((t - LT.draw + 0.1) / 0.1) * (1 - smooth((t - LT.home) / 0.08)); if (w <= 0) return p; // the aim eases in while the tongue is still hidden, and out once it is home
    const A = aimTongue(p, tgt, k, o); A.tgy *= w; A.tgp *= w; return { ...p, ...A };
  },
  feet: (t) => { const o = allPlanted(); const d = pulse(t, LT.draw, LT.hit, LT.held, LT.reel); // it comes up onto its fingers as it throws its weight forward, and the heels of its feet lift
    o.HL = plant(REST.HL, 0.35 * d); o.HR = plant(REST.HR, 0.35 * d); return o; },
};

// ------------------------------------------------------------------------------------------------ Belly Flop
// The game's: a 66-tick ring on the hero. For the first 46 ticks it winds up the way a toad does (Kesh, 14 Nov: not a dive):
// it sinks onto its haunches, its hind legs push twice (the hips bob up on the toes and stamp back down), and it loads low and
// swelling. Then the sim's 20-tick leap: it travels to the ring in a real arc (2.2 u at the top, Kesh: higher), limbs spread, and lands in 2.5
// frames ending on the hit, belly down and every foot wide. Held 3 frames, a rebound, then it gathers its limbs and sits up.
export const FLOP = { dist: 3.6, radius: 2.0, mire: 2.0, apex: 2.2 };
const PUMP = [0.36, 0.62]; // the two pushes of the hind legs stamp back down here
const FT = { heave: 46 / 60, hit: 66 / 60 }; FT.land = FT.hit - STRIKE; FT.off = FT.heave + 3 * FR_; FT.held = FT.hit + HOLD; FT.up = FT.held + 0.42; FT.end = FT.held + 1.0;
const FD = FLOP.dist / U; const AP = FLOP.apex / U;
const flopZ = (t) => FD * clamp((t - FT.heave) / (FT.hit - FT.heave));
const flopK = track([
  [0, RESTP],
  [0.12, addPose({ oy: -0.02, oz: -0.02, bp: 0.06, hp: 0.02 }, sac(0.3), belly(0.5), blink(0.4))],
  [0.24, addPose({ oy: 0.034, oz: 0.01, bp: -0.2, cp: -0.03, hp: -0.09 }, sac(0.5), belly(0.6)), 'out'],
  [PUMP[0], addPose({ oy: -0.022, oz: -0.02, bp: 0.07, hp: 0.03 }, sac(0.6), belly(0.75)), 'in'],
  [0.5, addPose({ oy: 0.04, oz: 0.012, bp: -0.22, cp: -0.04, hp: -0.1 }, sac(0.7), belly(0.8), jaw(0.04)), 'out'],
  [PUMP[1], addPose({ oy: -0.026, oz: -0.03, bp: 0.08, hp: 0.04 }, sac(0.8), belly(1.0), bulge(0.6), jaw(0.08)), 'in'],
  [FT.heave, addPose({ oy: -0.03, oz: -0.03, bp: 0.09, cp: 0.02, hp: 0.05 }, sac(0.85), belly(1.0), bulge(0.8), jaw(0.1))],
  [FT.off, addPose({ oy: 0.09, oz: -0.01, bp: 0.2, cp: 0.02, hp: 0.0 }, sac(0.5), belly(0.9), bulge(1), jaw(0.2)), 'out'],
  [FT.heave + 0.16, addPose({ oy: AP * 0.93, oz: 0, bp: 0.1, cp: -0.02, hp: -0.04 }, sac(0.4), belly(0.9), bulge(1), jaw(0.3))],
  [FT.heave + 0.215, addPose({ oy: AP * 0.86, oz: 0, bp: 0.0, cp: -0.04, hp: -0.06 }, sac(0.4), belly(0.95), bulge(1), jaw(0.3))],
  [FT.land, addPose({ oy: 0.2, oz: 0, bp: -0.1, cp: -0.03, hp: 0.02 }, sac(0.5), belly(1.0), bulge(0.6), jaw(0.25))],
  [FT.hit, addPose({ oy: -0.06, oz: 0.01, bp: -0.02, cp: 0.0, hp: 0.1 }, sac(1.0), belly(0.4), blink(1), jaw(0.12)), 'in'],
  [FT.held, addPose({ oy: -0.064, oz: 0.012, bp: -0.02, cp: 0.0, hp: 0.11 }, sac(1.0), belly(0.45), blink(1), jaw(0.12)), 'lin'],
  [FT.held + 0.1, addPose({ oy: -0.045, oz: 0.005, bp: 0.02, hp: 0.05 }, sac(0.5), belly(0.2), blink(1))],
  [FT.held + 0.22, addPose({ oy: -0.056, bp: -0.01, hp: 0.07 }, sac(0.7), belly(0.55), blink(0.9))],
  [FT.held + 0.34, addPose({ oy: -0.05, bp: 0.0, hp: 0.04 }, sac(0.4), belly(0.45), blink(0.6))],
  [FT.up, addPose({ oy: -0.044, bp: 0.02, hp: 0.02 }, sac(0.3), belly(0.5), blink(0.2))],
  [FT.up + 0.3, addPose({ oy: -0.01, bp: 0.03, hp: 0.0 }, sac(0.2), belly(0.4))],
  [FT.end, RESTP],
]);
// the crown leaves his head on the slap and drops back a beat later
const crownHop = (t, t0, h, T_ = 0.3) => { const u = (t - t0) / T_; return u <= 0 || u >= 1 ? 0 : 4 * h * u * (1 - u); };
const flop = {
  dur: FT.end, contact: [FT.hit], kinds: ['flop'], travel: flopZ,
  cues: { ring: [0, FT.hit], stamp: PUMP, leap: [FT.heave], land: [FT.hit], crown: [FT.hit + 0.3], at: [FLOP.dist] },
  phases: [['crouch', 0], ['push', 0.14], ['push again', 0.4], ['load', PUMP[1]], ['leap', FT.heave], ['land', FT.land], ['flopped', FT.hit], ['settle', FT.held]],
  pose: (t) => { const p = flopK(t); const h = crownHop(t, FT.hit, 0.085, 0.3) + crownHop(t, FT.hit + 0.3, 0.02, 0.14);
    return { ...p, kb: h, kr: 0.2 * Math.sin((t - FT.hit) * 22) * pulse(t, FT.hit, FT.hit + 0.05, FT.hit + 0.3, FT.hit + 0.6), kp: -0.12 * pulse(t, FT.hit, FT.hit + 0.08, FT.hit + 0.25, FT.hit + 0.45),
      bels: p.bels + 0.05 * Math.sin((t - FT.held) * 38) * pulse(t, FT.held, FT.held + 0.03, FT.held + 0.25, FT.held + 0.6) }; },
  feet: (t, B) => {
    const o = {}; const zEnd = V3(0, 0, FD);
    for (const k of LEGS) {
      const f = k[0] === 'F'; const wide = REST[k].clone().add(zEnd).add(V3((f ? 0.1 : 0.11) * SX[k], 0, f ? 0.07 : -0.05)); const home = REST[k].clone().add(zEnd);
      const stepAt = FT.up + { FL: 0.0, FR: 0.1, HL: 0.2, HR: 0.3 }[k] - 0.04;
      if (t >= FT.hit) { // down: planted wide, then each limb is gathered in under it as it sits up
        if (t < stepAt) o[k] = plant(wide); else if (t < stepAt + 0.16) { const sw = swing(wide, home, (t - stepAt) / 0.16, 0.03, 0.4); o[k] = { p: sw.p, pitch: sw.pitch, yaw: 0 }; } else o[k] = plant(home);
        continue;
      }
      if (f) {
        const reach = held(B, k, 0.13, 0.17, 0.13, { pitch: -0.25, curl: -0.2 });
        if (t < FT.heave - 0.05) o[k] = plant(REST[k], 0.4 * smooth((t - FT.heave + 0.12) / 0.07)); // the hands stay down on the floor through the pushes, then rise onto the fingers
        else if (t < FT.land) o[k] = mixT({ p: REST[k], pitch: 0.4 }, reach, smooth((t - FT.heave + 0.05) / 0.12)); // and push off with the hind legs
        else o[k] = mixT(reach, { p: wide, pitch: 0, yaw: 0 }, EASE.in((t - FT.land) / STRIKE));
      } else {
        const push = clamp((t - (FT.heave - 0.03)) / (FT.off - FT.heave + 0.03)); const trail = held(B, k, 0.02, 0.02, -0.2, { pitch: 1.0, curl: 0.3 }); const spread = held(B, k, 0.13, 0.07, -0.1, { pitch: 0.5, curl: -0.1 });
        const pump = pulse(t, 0.14, 0.22, 0.27, PUMP[0]) + pulse(t, 0.4, 0.48, 0.53, PUMP[1]); // up on the toes as the leg pushes, the heel stamps back
        if (t < FT.off) o[k] = plant(REST[k], Math.max(0.95 * push, 0.85 * pump));
        else if (t < FT.land) { const u = t - FT.off; o[k] = u < 0.07 ? mixT({ p: REST[k], pitch: 0.95 }, trail, smooth(u / 0.07)) : mixT(trail, spread, smooth((u - 0.07) / 0.12)); }
        else o[k] = mixT(spread, { p: wide, pitch: 0, yaw: 0 }, EASE.in((t - FT.land) / STRIKE));
      }
    }
    return o;
  },
};

// ------------------------------------------------------------------------------------------------ Venom Shake
// Kesh's move (13 Nov), in place of the Swallow. He charges: he hunkers down and swells, and the big warts on his back start to
// glow (the page lights them from the model's own wart mask, warts.json). Then he shakes like a wet dog, and each wart throws
// one gob of venom that lands somewhere round him and leaves a small pool. The charge keeps the Swallow's 78-tick warning.
// The numbers are mine until the game has the move: 11 gobs, 0.5 s in the air, pools 0.6 u for 5 s, 1.8 to 4.6 u from him.
export const WARTS = JSON.parse(fs.readFileSync(new URL('./out/warts.json', import.meta.url)));
export const VENOM = { n: WARTS.length, pool: 0.6, life: 5.0, near: 1.8, far: 4.6, flight: 0.5 };
const VT = { shake: 78 / 60, end: 2.6 }; VT.still = VT.shake + 0.62;
const SPIT = WARTS.map((_, i) => +(VT.shake + 0.05 + 0.44 * (((i * 7) % WARTS.length) / (WARTS.length - 1))).toFixed(3)); // one gob from each wart, in a scattered order
const SHZ = 6.5; // shakes a second
const vnK = track([
  [0, RESTP],
  [0.2, addPose({ oy: -0.008, bp: -0.02 }, belly(0.45), sac(0.1), blink(0.5))],
  [0.9, addPose({ oy: -0.022, oz: -0.008, bp: -0.06, cp: -0.02, hp: -0.05 }, belly(0.95), sac(0.2), blink(1))],
  [VT.shake - 0.1, addPose({ oy: -0.026, oz: -0.01, bp: -0.07, cp: -0.02, hp: -0.06 }, belly(1.0), sac(0.25), blink(1))],
  [VT.shake + 0.1, addPose({ oy: -0.012, bp: -0.02, hp: 0.0 }, belly(0.6), sac(0.5), blink(1))],
  [VT.still, addPose({ oy: -0.01, bp: -0.01, hp: 0.0 }, belly(0.4), sac(0.4), blink(0.8))],
  [VT.still + 0.28, addPose({ oy: 0.006, bp: 0.03, hp: 0.05 }, jaw(0.12), sac(0.85), belly(0.2), bulge(0.3))],
  [VT.end, RESTP],
]);
const venom = {
  dur: VT.end, contact: [VT.shake], kinds: ['shake'], cues: { glow: [0.12, VT.shake], shake: [VT.shake, VT.still], spit: SPIT },
  phases: [['charge', 0], ['shake', VT.shake], ['settle', VT.still]],
  pose: (t) => { const p = vnK(t);
    const tr = pulse(t, 0.35, 1.2, VT.shake - 0.04, VT.shake); // the tremble of holding it in
    const pump = Math.max(bump(t, 0.45, 0.3), bump(t, 0.8, 0.26), bump(t, 1.08, 0.2)); // three pumps, each quicker
    const wind = bump(t, VT.shake - 0.06, 0.16); // a small twist the other way first
    const env = smooth((t - VT.shake) / 0.1) * (1 - smooth((t - VT.shake - 0.3) / (VT.still - VT.shake - 0.25))); const w = TAU * SHZ * (t - VT.shake);
    const sh = (ph) => env * Math.sin(w - ph);
    return { ...p, bels: p.bels + 0.012 * pump + 0.004 * tr * Math.sin(t * 80) + 0.012 * env * Math.sin(2 * w), sacs: p.sacs + 0.03 * tr * Math.sin(t * 66) + 0.05 * env * Math.sin(2 * w + 1),
      oy: p.oy - 0.004 * pump, br: -0.05 * wind + 0.23 * sh(0), by: 0.03 * wind + 0.08 * sh(-1.2), ox: 0.012 * sh(-0.5),
      cr: 0.13 * sh(0.9), cy: 0.04 * sh(0.3), hr: 0.012 * tr * Math.sin(t * 60) + 0.16 * sh(1.7), hy: 0.07 * sh(0.7),
      kr: 0.03 * tr * Math.sin(t * 60 + 1) + 0.12 * sh(2.4), kp: 0.05 * sh(1.2), kb: 0.008 * env * Math.sin(w) ** 2 };
  },
  feet: allPlanted, noSpring: ['crown'], // the crown's lag is keyed here: its spring rattled from stop to stop in single frames
};

// ------------------------------------------------------------------------------------------------ Croak (calls its brood; mine)
// The game calls the mill's toads and a leech at three quarters, half and a quarter health with no pose of its own. This is one:
// a breath in, then the sac blows right up and the whole body pumps the call out, three beats, the crown buzzing on its head.
const CT = { call: 0.5, end: 1.7 };
const croak = {
  dur: CT.end, contact: [CT.call], kinds: ['croak'], cues: { call: [CT.call, CT.call + 0.26, CT.call + 0.52] },
  phases: [['breath', 0], ['croak', CT.call], ['settle', 1.3]],
  pose: (t) => {
    const inh = pulse(t, 0, 0.36, 0.44, 0.56); const on = pulse(t, CT.call - 0.06, CT.call + 0.04, 1.2, 1.38);
    const beat = Math.max(bump(t, CT.call + 0.06, 0.24), bump(t, CT.call + 0.32, 0.24), bump(t, CT.call + 0.58, 0.24)) * on;
    return addPose({ oy: 0.014 * inh - 0.012 * beat, bp: 0.07 * inh + 0.05 * on - 0.03 * beat, hp: 0.05 * inh + 0.1 * on, oz: -0.012 * inh },
      jaw(0.05 * on + 0.05 * beat), sac(0.12 + 0.75 * on + 0.6 * beat + 0.03 * on * Math.sin(t * 150)), belly(0.3 + 0.7 * inh + 0.3 * on - 0.45 * beat), blink(0.8 * on),
      { kr: 0.035 * on * Math.sin(t * 95), kb: 0.004 * beat });
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ Enrage (under 40% health)
// The game marks it with the sac beating faster and the eyes and crown gems burning. The pose is mine: it swells, rears a little
// and brings both hands down on the floor with a roar.
const ET = { slam: 0.62, end: 1.5 };
const enK = track([
  [0, RESTP],
  [0.16, addPose({ oy: -0.012, bp: -0.03 }, sac(0.3), belly(0.5), blink(0.5))],
  [0.46, addPose({ oy: 0.03, oz: -0.03, bp: 0.24, cp: 0.05, hp: 0.12 }, jaw(0.35), sac(1.0), belly(1.0), bulge(1))],
  [ET.slam - STRIKE, addPose({ oy: 0.032, oz: -0.03, bp: 0.25, cp: 0.05, hp: 0.14 }, jaw(0.5), sac(1.0), belly(1.0), bulge(1))],
  [ET.slam, addPose({ oy: -0.02, oz: 0.03, bp: -0.08, cp: -0.02, hp: 0.16 }, jaw(0.9), sac(0.7), belly(0.5), bulge(1)), 'in'],
  [ET.slam + HOLD, addPose({ oy: -0.022, oz: 0.032, bp: -0.085, cp: -0.02, hp: 0.17 }, jaw(0.92), sac(0.7), belly(0.5), bulge(1)), 'lin'],
  [1.0, addPose({ oy: -0.01, oz: 0.02, bp: -0.04, hp: 0.14 }, jaw(0.8), sac(0.9), belly(0.7), bulge(1))],
  [1.22, addPose({ oy: 0, oz: 0.005, bp: 0.0, hp: 0.05 }, jaw(0.2), sac(0.5), belly(0.5), bulge(0.5))],
  [ET.end, RESTP],
]);
const enrage = {
  dur: ET.end, contact: [ET.slam], kinds: ['slam'], cues: { glow: [0.2], slam: [ET.slam], roar: [ET.slam, 1.1] },
  phases: [['swell', 0], ['slam', ET.slam - STRIKE], ['roar', ET.slam], ['settle', 1.1]],
  pose: (t) => { const p = enK(t); const r = pulse(t, ET.slam, ET.slam + 0.05, 1.0, 1.2); return { ...p, sacs: p.sacs + 0.04 * r * Math.sin(t * 120), kr: 0.05 * r * Math.sin(t * 80), kb: crownHop(t, ET.slam, 0.03, 0.2), hr: 0.015 * r * Math.sin(t * 70) }; },
  feet: (t, B) => { const o = allPlanted(); for (const k of ['FL', 'FR']) { const up = held(B, k, 0.02, 0.1, 0.03, { pitch: 0.3, curl: 0.3 });
      if (t < 0.2) o[k] = plant(REST[k], 0.4 * smooth((t - 0.12) / 0.08)); else if (t < 0.46) o[k] = mixT({ p: REST[k], pitch: 0.4 }, up, smooth((t - 0.2) / 0.26)); else if (t < ET.slam - STRIKE) o[k] = up;
      else if (t < ET.slam) o[k] = mixT(up, { p: off(k, 0.02, 0, 0.03), pitch: 0, yaw: 0 }, EASE.in((t - ET.slam + STRIKE) / STRIKE));
      else if (t < 1.2) o[k] = plant(off(k, 0.02, 0, 0.03)); else if (t < 1.36) { const sw = swing(off(k, 0.02, 0, 0.03), REST[k], (t - 1.2) / 0.16, 0.02, 0.3); o[k] = { p: sw.p, pitch: sw.pitch, yaw: 0 }; } else o[k] = plant(REST[k]); }
    return o; },
};

// ------------------------------------------------------------------------------------------------ hurt, heavy hit
// Hurt plays on top of anything: head, jaw, sac, belly, eyes and crown only, so planted feet stay planted.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => { const a = Math.exp(-7 * t); const k = bump(t, 0.05, 0.14); const w = Math.sin(t * 34) * a;
    return addPose({ hp: 0.13 * k + 0.03 * w, hy: 0.05 * k, hr: -0.04 * k }, jaw(0.1 * k), sac(0.12 + 0.5 * k + 0.2 * w), belly(0.3 + 0.35 * w - 0.2 * k), blink(Math.max(k, 0.6 * pulse(t, 0.02, 0.06, 0.2, 0.34))),
      { kb: crownHop(t, 0.02, 0.022, 0.18), kr: 0.12 * w, kp: -0.06 * k }); },
  feet: allPlanted,
};
// Thrown back 0.3 u (the game's). It rocks up onto its haunches with its hands knocked off the floor, shuffles its feet back under
// it, drops forward onto its hands with a thud, and its belly and crown take a moment to stop.
const HH = { back: 0.3 / U, down: 0.62, end: 1.25 };
const hhZ = (t) => -HH.back * EASE.out3(clamp(t / 0.34));
const hhK = track([
  [0, RESTP],
  [0.07, addPose({ oy: 0.02, bp: 0.2, cp: 0.06, hp: 0.16 }, jaw(0.3), sac(0.8), belly(0.1), blink(1)), 'out'],
  [0.26, addPose({ oy: 0.035, bp: 0.34, cp: 0.08, hp: 0.1, br: 0.04 }, jaw(0.4), sac(0.5), belly(0.7), bulge(0.8))],
  [0.44, addPose({ oy: 0.03, bp: 0.3, cp: 0.05, hp: 0.0, br: -0.03 }, jaw(0.2), sac(0.4), belly(0.5), bulge(0.6))],
  [HH.down, addPose({ oy: -0.024, bp: -0.05, cp: -0.02, hp: 0.08 }, jaw(0.1), sac(0.8), belly(0.9), blink(1)), 'in'],
  [HH.down + 0.1, addPose({ oy: -0.006, bp: 0.02, hp: 0.0 }, sac(0.3), belly(0.2), blink(0.8))],
  [HH.down + 0.22, addPose({ oy: -0.014, bp: -0.01, hp: 0.04 }, sac(0.45), belly(0.6), blink(0.3))],
  [1.0, addPose({ oy: -0.004, hy: 0.0 }, sac(0.2), belly(0.4))],
  [HH.end, RESTP],
]);
const heavyHit = {
  dur: HH.end, travel: hhZ, contact: [HH.down], kinds: ['thud'], cues: { hit: [0], down: [HH.down] }, phases: [['thrown back', 0], ['on its haunches', 0.26], ['down', HH.down], ['settle', HH.down + 0.1]],
  pose: (t) => { const p = hhK(t); const sh = pulse(t, 0.74, 0.8, 1.0, 1.12); // it shakes its head to clear it
    return { ...p, hy: (p.hy || 0) + 0.09 * sh * Math.sin((t - 0.74) * 30), kb: crownHop(t, 0.0, 0.05, 0.3) + crownHop(t, HH.down, 0.03, 0.2), kr: 0.16 * Math.sin(t * 20) * pulse(t, 0, 0.05, 0.5, 1.1), kp: 0.1 * pulse(t, 0, 0.08, 0.3, 0.5),
      bels: p.bels + 0.04 * Math.sin((t - HH.down) * 36) * pulse(t, HH.down, HH.down + 0.03, HH.down + 0.2, HH.down + 0.5) }; },
  feet: (t, B) => { const o = {}; const zE = V3(0, 0, -HH.back);
    for (const k of ['HL', 'HR']) { const a = k === 'HL' ? 0.06 : 0.2; const to = REST[k].clone().add(zE);
      o[k] = t < a ? plant(REST[k], 0.2 * (t / a)) : t < a + 0.16 ? (() => { const sw = swing(REST[k], to, (t - a) / 0.16, 0.035, 0.5); return { p: sw.p, pitch: sw.pitch, yaw: 0 }; })() : plant(to); }
    for (const k of ['FL', 'FR']) { const lag = k === 'FL' ? 0 : 0.03; const wb = pulse(t, 0.2, 0.27, 0.38, 0.46); const up = held(B, k, 0.06 + 0.02 * wb * Math.sin(t * 20 + lag * 40), 0.13 + 0.02 * wb * Math.sin(t * 17), 0.05, { pitch: -0.3, curl: -0.3 }); const to = REST[k].clone().add(zE);
      if (t < 0.2) o[k] = mixT({ p: REST[k], pitch: 0 }, up, EASE.out(clamp(t / 0.2)));
      else if (t < 0.46 + lag) o[k] = up;
      else if (t < HH.down + lag) o[k] = mixT(up, { p: to, pitch: 0, yaw: 0 }, EASE.in((t - 0.46 - lag) / (HH.down - 0.46)));
      else o[k] = plant(to); }
    return o; },
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grows from the floor in 7 frames, then stands. On top: it comes up squat and wide out of the mire, bobs up with
// its throat filling, drops back onto its hands, and croaks once as the crown settles.
const SPG = 7 * FR_;
const spK = track([
  [0, addPose({ oy: -0.036, bp: -0.06 }, sac(0), belly(1.0), blink(1))],
  [SPG, addPose({ oy: -0.03, bp: -0.04 }, sac(0.1), belly(0.9), blink(1))],
  [0.3, addPose({ oy: 0.028, bp: 0.1, hp: 0.08 }, sac(0.7), belly(0.2), blink(0.3))],
  [0.48, addPose({ oy: -0.016, bp: -0.02, hp: 0.0 }, sac(0.4), belly(0.8))],
  [0.62, addPose({ oy: 0.004, bp: 0.02, hp: 0.03 }, sac(0.3), belly(0.35))],
  [0.8, addPose({ oy: 0.008, bp: 0.05, hp: 0.08 }, jaw(0.08), sac(1.4), belly(0.2), blink(0.7))],
  [1.05, addPose({ oy: 0.004, bp: 0.03, hp: 0.06 }, jaw(0.06), sac(1.25), belly(0.3), blink(0.7))],
  [1.25, addPose({ oy: 0, bp: 0, hp: 0 }, sac(0.2), belly(0.4))],
  [1.5, RESTP],
]);
const spawn = {
  dur: 1.5, scale: (t) => 0.08 + 0.92 * EASE.out(clamp(t / SPG)), contact: [0.48, 0.8], kinds: ['plop', 'croak'], cues: { rise: [0], plop: [0.48], croak: [0.8] },
  phases: [['grows', 0], ['bobs up', SPG], ['drops', 0.3], ['croaks', 0.72], ['settle', 1.1]],
  pose: (t) => { const p = spK(t); return { ...p, kb: crownHop(t, 0.3, 0.035, 0.26), kr: 0.1 * Math.sin(t * 24) * pulse(t, 0.3, 0.36, 0.7, 1.0), sacs: p.sacs + 0.03 * pulse(t, 0.76, 0.82, 1.0, 1.1) * Math.sin(t * 140) }; },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// 3.2 s. The blow throws its head up with a last croak. It rears, paws at the air, and goes over backward: the crown comes off
// its head as it tips, lands behind it and rings down on its rim. It lies belly up; the legs kick twice and go slack, the tongue
// falls out of the side of its mouth, the throat empties and the eyes go down.
const DT_ = { rear: 0.34, tip: 0.86, over: 1.36, end: 3.2 };
const dK = track([
  [0, RESTP],
  [0.09, addPose({ bp: 0.16, hp: 0.2, oy: 0.012 }, jaw(0.45), sac(1.0), belly(0.2), bulge(1)), 'out'],
  [DT_.rear, addPose({ bp: 0.3, hp: 0.16, oy: 0.03, cp: 0.05 }, jaw(0.5), sac(0.9), belly(0.8), bulge(1))],
  [DT_.tip, addPose({ bp: 0.95, hp: 0.05, oy: 0.07, cp: 0.08, oz: -0.03 }, jaw(0.35), sac(0.6), belly(0.9), bulge(0.8))],
  [DT_.tip + 0.26, addPose({ bp: 1.9, hp: -0.05, oy: 0.0, cp: 0.04, oz: -0.1 }, jaw(0.3), sac(0.4), belly(0.8), bulge(0.6))],
  [DT_.over, addPose({ bp: 2.96, hp: -0.12, oy: -0.3, cp: -0.04, oz: -0.16 }, jaw(0.25), sac(0.9), belly(1.0), blink(1)), 'in'],
  [DT_.over + 0.12, addPose({ bp: 2.82, hp: -0.04, oy: -0.3, cp: 0.0, oz: -0.17 }, jaw(0.4), sac(0.3), belly(0.2), blink(0.6))],
  [DT_.over + 0.3, addPose({ bp: 3.0, hp: -0.1, oy: -0.3, cp: -0.03, oz: -0.175 }, jaw(0.42), sac(0.4), belly(0.8), blink(0.3))],
  [DT_.over + 0.55, addPose({ bp: 2.95, hp: -0.08, oy: -0.3, cp: -0.02, oz: -0.176 }, jaw(0.45), sac(0.2), belly(0.5), blink(0.4))],
  [2.5, addPose({ bp: 2.97, hp: -0.1, oy: -0.3, cp: -0.03, oz: -0.176 }, jaw(0.5), sac(-0.3), belly(0.2), blink(0.7))],
  [DT_.end, addPose({ bp: 2.97, hp: -0.11, oy: -0.3, cp: -0.03, oz: -0.176 }, jaw(0.5), sac(-0.5), belly(0.0), blink(1))],
]);
// the crown: rides the head until it tips, then flies free, lands, bounces and rings down on its rim behind the body
const CR0 = DT_.tip + 0.1, CRL = CR0 + 0.52; const CH = skel.crownHull.map((h) => V3(...h).sub(J('crown')));
const crownLow = (q) => { let lo = 1e9; const v = V3(); for (const h of CH) { v.copy(h).applyQuaternion(q); if (v.y < lo) lo = v.y; } return -lo; };
const CREND = V3(0.46, 0, -1.5);
function crownFree(t, S0) { // S0: where the crown was (position, rotation) when it left the head
  const u = clamp((t - CR0) / (CRL - CR0)); const g = 4.2; const T_ = CRL - CR0; const tt = Math.min(t, CRL) - CR0;
  const qEnd = qAx(YA, 2.2);
  let q, p;
  if (t < CRL) { // a throw: tumbling backward, landing where it will rest
    q = S0.q.clone().slerp(qAx(XA, -2 * Math.PI * 0.999).multiply(qEnd), 0).multiply(qAx(XA, 0)); q = S0.q.clone().slerp(qEnd, smooth(u)).multiply(qAx(XA, -Math.PI * 2 * u * (1 - 0)));
    const hEnd = crownLow(qEnd); const v0y = (hEnd - S0.p.y + 0.5 * g * T_ * T_) / T_;
    p = V3(lerp(S0.p.x, CREND.x, u), S0.p.y + v0y * tt - 0.5 * g * tt * tt, lerp(S0.p.z, CREND.z + 0.1, u));
  } else { // one bounce, then it rings down like a dropped lid and slides a hand's width
    const s = t - CRL; const wob = 0.42 * Math.exp(-3.2 * s); const ph = 13 * s + 5 * s * s;
    q = qAx(YA, 2.2 + ph * 0.25).multiply(qAx(XA, wob * Math.cos(ph))).multiply(qAx(ZA, wob * Math.sin(ph)));
    const hop = s < 0.22 ? 0.05 * 4 * (s / 0.22) * (1 - s / 0.22) : 0;
    p = V3(CREND.x, crownLow(q) + hop, CREND.z + 0.1 * Math.exp(-5 * s));
  }
  return { p, q };
}
let crownS0 = null;
const dBody = (t) => { const p = dK(t); p.oy = Math.max(p.oy, floorOy(p.bp) + 0.01); if (t > DT_.over) p.oy += 0.012 * Math.exp(-9 * (t - DT_.over)) * Math.abs(Math.sin((t - DT_.over) * 16)); return p; };
const death = {
  dur: DT_.end, noSpring: ['crown'], contact: [DT_.over, CRL], kinds: ['thud', 'clang'], cues: { hit: [0], over: [DT_.over], crownOff: [CR0], crownLand: [CRL], kicks: [1.75, 2.15] },
  phases: [['struck', 0], ['rears', DT_.rear], ['goes over', DT_.tip], ['on its back', DT_.over], ['still', 2.5]],
  pose: (t) => {
    const p = dBody(t); const o = { ...p, bels: p.bels + 0.05 * Math.sin((t - DT_.over) * 30) * pulse(t, DT_.over, DT_.over + 0.03, DT_.over + 0.3, DT_.over + 0.7) };
    // the tongue falls out of the left side of the mouth once it is on its back
    const tg = smooth((t - DT_.over - 0.15) / 0.5);
    if (t >= DT_.over) { const S = rigS.solve(addPose(CFG.base, p)); const m = S.PW.tg0; const c = V3(...skel.mouth.cornL).sub(J('head')).applyQuaternion(S.QW.head).add(S.PW.head); const a = m.clone().add(c.sub(m).multiplyScalar(2.1)); a.y = Math.max(0.1, a.y);
      const A = aimTongue(p, a, tg, { tgc: -0.07 * tg }); const r = smooth((t - DT_.over) / 0.15); A.tgy *= r; A.tgp *= r; Object.assign(o, A); }
    if (t >= CR0) {
      if (!crownS0) { const S = rigS.solve(addPose(CFG.base, dBody(CR0))); crownS0 = { p: S.PW.crown.clone(), q: S.QW.head.clone() }; }
      const S = rigS.solve(addPose(CFG.base, p)); const c = crownFree(t, crownS0); const Qh = S.QW.head.clone().invert();
      const loc = c.p.clone().sub(S.PW.head).applyQuaternion(Qh).sub(J('crown').sub(J('head'))); const ql = Qh.multiply(c.q);
      Object.assign(o, { kx: loc.x, kb: loc.y, kz: loc.z, kqx: ql.x, kqy: ql.y, kqz: ql.z, kqw: ql.w || 1e-9 });
    } else Object.assign(o, { kb: crownHop(t, 0, 0.03, 0.24), kp: -0.1 * smooth((t - DT_.rear) / 0.4) });
    return o;
  },
  feet: (t, B) => { const o = {};
    const kick = (c) => bump(t, c, 0.3);
    const slack = smooth((t - 2.3) / 0.7);
    for (const k of LEGS) { const f = k[0] === 'F'; const s = SX[k] > 0 ? 0 : 0.07;
      if (f) { const paw = held(B, k, 0.05 + 0.03 * Math.sin(t * 19 + s * 30), 0.12 + 0.03 * Math.sin(t * 23 + s * 20), 0.06, { pitch: -0.2, curl: -0.2 });
        const limp = held(B, k, 0.1 + 0.03 * slack, 0.07 - 0.02 * kick(1.75 + s) - 0.02 * kick(2.15 + s), 0.0 - 0.05 * slack, { pitch: 0.2 + 0.3 * slack, curl: 0.5 * slack });
        o[k] = t < 0.3 ? mixT({ p: REST[k], pitch: 0 }, paw, EASE.out(clamp(t / 0.3))) : t < DT_.over - 0.1 ? paw : mixT(paw, limp, smooth((t - DT_.over + 0.1) / 0.3));
      } else { const free = held(B, k, 0.03, 0.0, -0.02, { pitch: 0.3, curl: 0.2 }); const kk = kick(1.75 + s) + 0.7 * kick(2.15 + s);
        const limp = held(B, k, 0.06 + 0.05 * slack + 0.04 * kk, -0.02 - 0.1 * kk, -0.03 - 0.1 * kk - 0.03 * slack, { pitch: 0.4 + 0.5 * kk + 0.2 * slack, curl: 0.2 + 0.4 * slack });
        const tu = DT_.tip + 0.06;
        o[k] = t < tu ? plant(REST[k], 0.5 * smooth((t - DT_.rear) / (tu - DT_.rear))) : t < tu + 0.2 ? mixT({ p: REST[k], pitch: 0.5 }, free, smooth((t - tu) / 0.2), 0.09) : t < DT_.over ? free : mixT(free, limp, smooth((t - DT_.over) / 0.25)); }
    }
    return o; },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), lash, flop, venom, croak, enrage, hurt, heavyHit, spawn, death };

