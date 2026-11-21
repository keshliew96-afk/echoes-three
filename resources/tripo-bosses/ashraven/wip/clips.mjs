// The Ash Raven's moves. Units are model units (the model is 1 tall; the page draws it 2.4 u tall, CFG.unit, the game's
// scale). Timings come from the game: ASHRAVEN in src/sim/bosses/ashraven.js (hops at 1.35 u/s; Carrion Dive: 50-tick
// lane, the last 14 ticks the dive itself, a 40-tick preen; Wing Gust: 40-tick cone; Omen: 84-tick ring), the phases of
// render/boss/ashravenfacet.js (hang at 1.5 u, skim at 0.45 u) and the beats in render/facet/beats.js (strike 2.5
// frames, contact held 3 frames).
import fs from 'fs';
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, frac } from './quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_; const D2R = Math.PI / 180;
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const J = (n) => V3(...skel.pos[skel.names.indexOf(n)]);

// ---- wings. The model's wings are folded; each was cut free and turns about its shoulder. Its pose is three angles:
// sweep (0 straight out to the side, + back), lift (+ up), twist (+ leading edge down). Folded is what the model has.
// An open wing is written against the floor, not the body: the chest's own pitch is taken back out (channel w?c), so a
// bird flying with its body tipped over still beats its wings up and down.
const WG = skel.wing; const a0 = V3(...WG.a0), n0 = V3(...WG.n0);
const qAx = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const XA = V3(1, 0, 0), YA = V3(0, 1, 0), ZA = V3(0, 0, 1);
const eul = (s, l, t) => qAx(YA, s).multiply(qAx(ZA, l)).multiply(qAx(XA, t));
const FOLD = (() => { const s = Math.atan2(-a0.z, a0.x), l = Math.asin(clamp(a0.y, -1, 1)); const v = n0.clone().applyQuaternion(qAx(YA, s).multiply(qAx(ZA, l)).invert()); return { s, l, t: Math.atan2(v.z, v.y) }; })();
const Q0inv = eul(FOLD.s, FOLD.l, FOLD.t).invert();
const mirrorQ = (q) => new THREE.Quaternion(q.x, -q.y, -q.z, q.w);
const wingQ = (s) => (p) => { const q = qAx(XA, ((p.bp || 0) + (p.cp || 0)) * (p['w' + s + 'c'] || 0)).multiply(eul(FOLD.s + (p['w' + s + 's'] || 0), FOLD.l + (p['w' + s + 'l'] || 0), FOLD.t + (p['w' + s + 't'] || 0))).multiply(Q0inv); return s === 'L' ? q : mirrorQ(q); };
const NF = WG.feathers.length;
const featherQ = (s, i) => (p) => { const f = clamp(p['w' + s + 'f'] || 0, 0, 1.15); const q = qAx(n0, WG.feathers[i][2] * D2R * f + (p['w' + s + 'j'] || 0) * (i / NF - 0.4)); return s === 'L' ? q : mirrorQ(q); };
// open 0..1 takes a wing from folded to (lift, sweep, twist) in degrees; fan spreads the flight feathers (they grow out of the wing as it opens)
const wing1 = (s, open, lift = 0, sweep = 0, twist = 0, fan = open) => ({ ['w' + s + 's']: (sweep * D2R - FOLD.s) * open, ['w' + s + 'l']: (lift * D2R - FOLD.l) * open, ['w' + s + 't']: (twist * D2R - FOLD.t) * open, ['w' + s + 'f']: fan, ['w' + s + 'c']: smooth(open), ['s' + s]: 0.9 * smooth(fan * 1.6) });
const wings = (open, lift = 0, sweep = 0, twist = 0, fan = open) => ({ ...wing1('L', open, lift, sweep, twist, fan), ...wing1('R', open, lift, sweep, twist, fan) });

export const CFG = {
  name: 'ashraven', unit: 2.4, base: { sL: -0.9, sR: -0.9 },
  chain: [['hips', 'b'], ['chest', 'c'], ['neck1', 'n1'], ['neck2', 'n2'], ['head', 'h']],
  extras: [['jaw', 'j'], ['hackle', 'k'], ['tail1', 't1'], ['tail2', 't2'],
    ['wingL', wingQ('L')], ['wingR', wingQ('R')], ...Array.from({ length: NF }, (_, i) => ['fL' + i, featherQ('L', i)]), ...Array.from({ length: NF }, (_, i) => ['fR' + i, featherQ('R', i)])],
  scales: [...Array.from({ length: NF }, (_, i) => ['fL' + i, 'sL']), ...Array.from({ length: NF }, (_, i) => ['fR' + i, 'sR'])],
  legs: { L: { kind: 'hind', kcs: 0.75, kcf: 1.2, b: ['thighL', 'shinL', 'tarsusL', 'footL'] }, R: { kind: 'hind', kcs: 0.75, kcf: 1.2, b: ['thighR', 'shinR', 'tarsusR', 'footR'] } },
  springs: [{ bone: 'hackle', k: 260, c: 10, max: 0.35 }, { bone: 'tail1', k: 300, c: 14, max: 0.22 }, { bone: 'tail2', k: 240, c: 12, max: 0.3 }],
};
const REST = { L: V3(...skel.ends.footL), R: V3(...skel.ends.footR) }; REST.L.y = 0; REST.R.y = 0;
const LEGS = ['L', 'R']; const SX = { L: 1, R: -1 };
const plant = (p, pitch = 0) => ({ p: p.clone(), lock: true, pitch });
// a foot carried from a to b as the end of a clock hand about the hip, so a long swing never drags the foot through the hip
const swingTo = (root, a, b, u, dip = 0) => { if (u <= 0) return a.clone(); if (u >= 1) return b.clone(); const da = a.clone().sub(root), db = b.clone().sub(root), la = da.length(), lb = db.length(); da.normalize(); db.normalize();
  const q = new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(da, db), u); return root.clone().add(da.applyQuaternion(q).multiplyScalar(lerp(la, lb, u) * (1 - dip * Math.sin(Math.PI * u)))); };
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.9); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));

// ---- one pose key. n1, n2, hd: how far each neck bone and the head are tipped up from the way the model holds them, against
// the floor (the body's own tilt is taken out). o, li, sw, tw: the wings (open, lift, sweep, twist against the floor); fa: the fan
// of the flight feathers when it is not the wing's own opening. hk: hackles up. tl: tail lifted. jw: beak open.
const K = (o) => ({ ox: 0, oy: 0, oz: 0, bp: 0, cp: 0, n1: 0, n2: 0, hd: 0, o: 0, li: 0, sw: 60, tw: 50, fa: -1, hk: 0, tl: 0, jw: 0, ...o });
const JAW = 0.52;
const body = (k) => { const tilt = k.bp + k.cp; return { ox: k.ox, oy: k.oy, oz: k.oz, bp: k.bp, cp: k.cp, n1p: k.n1 - tilt, n2p: k.n2 - k.n1, hp: k.hd - k.n2, jp: -JAW * clamp(k.jw, 0, 1.1), kp: -0.62 * k.hk, t1p: -k.tl, t2p: -0.45 * k.tl }; };
const wingsK = (k) => wings(clamp(k.o), k.li, k.sw, k.tw, k.fa >= 0 ? k.fa : clamp(k.o * 1.12, 0, 1.06));
const full = (k) => addPose(body(k), wingsK(k));
const FLD = { o: 0, li: 0, sw: 60, tw: 50 };

// ------------------------------------------------------------------------------------------------ idle
// 6 s. A raven is never quite still: the breath, the head snapping to look left, then right with a cock of the head, a ruffle
// that lifts the hackles and shrugs the wings, two clacks of the beak, a flick of the tail.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const lookL = pulse(t, 0.8, 0.88, 1.9, 2.0), lookR = pulse(t, 3.1, 3.18, 4.4, 4.5), cock = pulse(t, 3.5, 3.58, 4.2, 4.28), clack = bump(t, 5.2, 0.16) + bump(t, 5.42, 0.14);
    const ruff = pulse(t, 2.3, 2.5, 2.7, 3.0), rs = Math.sin(40 * t) * pulse(t, 2.4, 2.5, 2.75, 2.9), flick = bump(t, 1.3, 0.2) + bump(t, 4.75, 0.2);
    return addPose(
      { oy: 0.003 * br - 0.008 * ruff, cp: 0.012 * br + 0.03 * ruff, ox: 0.006 * sw, br: 0.012 * sw + 0.03 * rs, by: 0.012 * Math.sin(w + 1) },
      { n1p: 0.02 * sw + 0.05 * ruff - 0.03 * clack, n2p: -0.02 * br + 0.04 * ruff, hp: -0.03 * br - 0.1 * clack + 0.06 * lookL, n1y: 0.2 * lookL - 0.2 * lookR, n2y: 0.25 * lookL - 0.25 * lookR, hy: 0.4 * lookL - 0.4 * lookR, hr: 0.3 * cock + 0.05 * rs, n1r: 0.03 * rs },
      { jp: -JAW * (0.03 + 0.4 * clack), kp: -0.62 * (0.06 + 0.04 * br + 0.75 * ruff + 0.15 * (lookL + lookR)), kr: 0.06 * rs },
      { t1p: -(0.02 * br + 0.12 * ruff + 0.25 * flick), t2p: -0.12 * flick, t1y: 0.04 * sw + 0.2 * rs, t2y: 0.1 * rs },
      wings(0.07 * ruff + 0.012 * (1 + br), 10, 70, 40, 0), { wLt: 0.12 * rs, wRt: -0.12 * rs },
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hop (walk) and turn
// The Raven does not walk: both feet leave the floor together and land together (the right a frame behind the left). 1.35 u/s,
// one hop of 0.57 u every 0.42 s: it sinks and tips forward, kicks off its toes, the wings flick out from its sides in the air,
// the tail lifts, it lands on bent legs and the tail dips. The head stays level all the way.
const WT = 0.42;
const GAIT = { T: WT, duty: 0.46, v: 1.35 / CFG.unit };
const GF = { L: { phase: 0, n: [REST.L.x, REST.L.z - 0.03], lift: 0.1, droop: 0.6, push: 0.5 }, R: { phase: 0.04, n: [REST.R.x, REST.R.z - 0.045], lift: 0.1, droop: 0.6, push: 0.5 } };
const hopPose = (t, turn = 0) => {
  const u = frac(t / WT - 0.02), c = (ph) => Math.cos(2 * Math.PI * (u - ph)); const air = pulse(u, 0.44, 0.6, 0.86, 1.0);
  const bp = -0.07 - 0.085 * c(0.47), oy = -0.02 + 0.046 * c(0.75);
  return addPose(
    { oy, bp, cp: -0.02 * c(0.47), oz: 0.012 * c(0.6), by: 0.05 * turn, br: -0.03 * turn },
    { n1p: -bp * 0.75 + 0.03 * c(0.2), n2p: -bp * 0.25, hp: -0.04 * c(0.1), n1y: 0.1 * turn, hy: 0.2 * turn },
    { jp: -JAW * 0.03, kp: -0.62 * (0.1 + 0.25 * air), t1p: -(0.18 + 0.1 * c(0.72)), t2p: -0.06 * c(0.8), t1y: -0.1 * turn },
    wings(0.03 + 0.13 * air, 14, 66, 44, 0),
  );
};
const walk = { dur: WT, loop: true, gait: GAIT, pose: (t) => hopPose(t), feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])) };
// the game gives the Raven no turn rate; here it turns 45 degrees a hop
export const TURN_DEG = 45 / WT;
const turn = (dir) => { const g = { T: WT, duty: 0.46, v: 0, omega: dir * TURN_DEG * D2R, pivot: [0, 0.03] }; const gf = { L: { ...GF.L, n: [REST.L.x, REST.L.z], lift: 0.06 }, R: { ...GF.R, n: [REST.R.x, REST.R.z], lift: 0.06 } };
  return { dur: WT, loop: true, gait: g, pose: (t) => { const p = hopPose(t, dir); p.bp += 0.05; p.n1p -= 0.04; return p; }, feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])) }; };

// ------------------------------------------------------------------------------------------------ Carrion Dive
// rise (the 50-tick lane less the 14-tick dive less one strike: a crouch with the wings thrown up, one downbeat takes it off the
// floor, two more carry it to 1.5 u, and it hangs there with its talons tucked, looking down the lane), stoop (2.5 frames: it tips
// over and the wings sweep back), dive (14 ticks, the sim's: down to a skim 0.45 u over the floor on swept wings, legs trailed, to
// the lane's end less its own radius), strike (2.5 frames from the resolve: talons thrown forward, wings flung up to brake, the
// left foot down a frame before the right), held (3 frames), preen (to 40 ticks after the resolve: it turns its head into its
// left wing and runs the beak down the feathers; the punish window), settle (0.6 s).
const HOVER = 1.5 / CFG.unit, SKIM = 0.45 / CFG.unit, LANE_U = 9.0, DIVE = (LANE_U - 0.8) / CFG.unit, SKID = 0.04;
const DV = { crouch: 0.1, off: 0.16, rise: 36 / 60 - STRIKE, go: 36 / 60, hit: 50 / 60 }; DV.land = DV.hit + STRIKE; DV.held = DV.land + HOLD; DV.preen = DV.hit + 40 / 60; DV.end = DV.preen + 0.6;
const dvTravel = (t) => DIVE * clamp((t - DV.go) / (DV.hit - DV.go)) + SKID * EASE.out(clamp((t - DV.hit) / STRIKE));
const dive = {
  dur: DV.end, contact: [DV.hit], kinds: ['dive'], travel: dvTravel, cues: { lane: [0, DV.hit], off: [DV.off], go: [DV.go], land: [DV.land], preen: [DV.held, DV.preen], len: [LANE_U] },
  phases: [['rise', 0], ['stoop', DV.rise], ['dive', DV.go], ['strike', DV.hit], ['held', DV.land], ['preen', DV.held], ['settle', DV.preen]],
  pose: (t) => {
    const k = track([[0, K({})],
      [DV.crouch, K({ oy: -0.075, bp: -0.1, cp: -0.03, n1: -0.1, hd: 0.1, o: 0.95, li: 52, sw: 18, tw: -6, hk: 0.6, tl: 0.1 })],
      [0.2, K({ oy: 0.09, oz: -0.01, bp: 0.14, cp: 0.04, n1: 0.05, hd: -0.05, o: 1, li: -30, sw: -4, tw: 10, hk: 0.3, tl: -0.25 })],
      [0.285, K({ oy: 0.3, oz: -0.02, bp: 0.12, cp: 0.03, hd: -0.1, o: 1, li: 52, sw: 12, tw: -8, hk: 0.3, tl: 0.1 })],
      [0.37, K({ oy: 0.5, oz: -0.03, bp: 0.14, cp: 0.04, hd: -0.16, o: 1, li: -24, sw: -2, tw: 10, hk: 0.3, tl: -0.2 })],
      [0.46, K({ oy: 0.6, oz: -0.04, bp: 0.12, cp: 0.03, n1: -0.06, hd: -0.3, o: 1, li: 50, sw: 12, tw: -8, hk: 0.5, tl: 0.1, jw: 0.2 })],
      [DV.rise, K({ oy: HOVER, oz: -0.045, bp: 0.15, cp: 0.04, n1: -0.1, n2: -0.2, hd: -0.5, o: 1, li: 52, sw: 20, tw: -4, hk: 0.8, tl: 0.2, jw: 0.45 })],
      [DV.go, K({ oy: HOVER * 0.84, oz: 0.02, bp: -0.75, cp: -0.08, n1: -0.75, n2: -0.8, hd: -0.75, o: 1, li: 34, sw: 42, tw: 34, fa: 0.8, hk: 0.2, tl: 0.5, jw: 0.2 }), 'out'],
      [DV.go + 0.07, K({ oy: 0.14, oz: 0.03, bp: -1.0, cp: -0.08, n1: -0.8, n2: -0.7, hd: -0.5, o: 1, li: 16, sw: 46, tw: 30, fa: 0.8, hk: 0, tl: 0.6, jw: 0.1 })],
      [DV.go + 0.12, K({ oy: -0.09, oz: 0.03, bp: -1.02, cp: -0.06, n1: -0.72, n2: -0.5, hd: -0.25, o: 1, li: 8, sw: 44, tw: 18, fa: 0.86, hk: 0, tl: 0.62, jw: 0.1 })],
      [DV.hit, K({ oy: -0.1, oz: 0.03, bp: -0.96, cp: -0.06, n1: -0.68, n2: -0.45, hd: -0.2, o: 1, li: 12, sw: 42, tw: 14, fa: 0.88, hk: 0, tl: 0.6, jw: 0.35 })],
      [DV.land, K({ oy: -0.085, oz: -0.03, bp: 0.3, cp: 0.1, n1: 0.05, n2: -0.1, hd: -0.3, o: 1, li: 50, sw: -12, tw: -48, hk: 0.9, tl: 0.15, jw: 0.8 }), 'out'],
      [DV.held, K({ oy: -0.095, oz: -0.04, bp: 0.27, cp: 0.09, n1: 0.03, n2: -0.1, hd: -0.3, o: 1, li: 46, sw: -14, tw: -50, hk: 0.9, tl: -0.1, jw: 0.7 })],
      [DV.held + 0.16, K({ oy: -0.035, oz: -0.01, bp: 0.02, n1: -0.05, hd: -0.1, o: 0.6, li: 14, sw: 30, tw: 4, hk: 0.5, tl: 0.05, jw: 0.1 })],
      [DV.held + 0.3, K({ oy: -0.03, bp: -0.08, cp: -0.03, n1: -0.2, n2: -0.3, hd: -0.55, o: 0.1, ...FLD, o: 0.1, hk: 0.35, tl: 0.1 })],
      [DV.preen, K({ oy: -0.032, bp: -0.09, cp: -0.03, n1: -0.22, n2: -0.34, hd: -0.6, o: 0.06, hk: 0.3, tl: 0.1 })],
      [DV.preen + 0.2, K({ oy: 0.008, bp: 0.04, cp: 0.01, n1: 0.08, n2: 0.06, hd: 0.08, hk: 0.45, tl: 0.15 })],
      [DV.preen + 0.4, K({ oy: -0.004, bp: -0.01, hd: -0.02, hk: 0.15 })],
      [DV.end, K({})]])(t);
    const beat = Math.sin(2 * Math.PI * (t - DV.crouch) / 0.17);
    const pr = pulse(t, DV.held + 0.14, DV.held + 0.3, DV.preen - 0.02, DV.preen + 0.14), nib = Math.sin(2 * Math.PI * 7.5 * (t - DV.held)) * pulse(t, DV.held + 0.3, DV.held + 0.36, DV.preen - 0.05, DV.preen), run = smooth((t - (DV.held + 0.3)) / (DV.preen - DV.held - 0.3));
    const sh = Math.sin(46 * t) * pulse(t, DV.preen + 0.18, DV.preen + 0.26, DV.end - 0.14, DV.end - 0.04);
    const p = addPose(full(k), { n1y: 0.6 * pr, n2y: (0.74 - 0.12 * run) * pr, hy: (0.46 - 0.08 * run) * pr + 0.05 * sh, hr: -0.3 * pr + 0.05 * nib + 0.1 * sh, hp: 0.05 * nib - 0.12 * run * pr, jp: -JAW * 0.22 * (0.5 + 0.5 * nib) * pr, by: 0.07 * pr, br: 0.04 * pr + 0.03 * sh, kr: 0.08 * sh, t1y: -0.14 * pr + 0.25 * sh },
      { wLj: 0.1 * beat * pulse(t, DV.crouch, 0.2, DV.rise, DV.go) - 0.2 * pulse(t, DV.hit, DV.land, DV.held, DV.held + 0.2), wRj: 0.1 * beat * pulse(t, DV.crouch, 0.2, DV.rise, DV.go) - 0.2 * pulse(t, DV.hit, DV.land, DV.held, DV.held + 0.2), wLt: 0.07 * sh, wRt: -0.07 * sh });
    // the wing it preens: lifted off its side and half spread, so the beak can run down the long feathers
    const w = wing1('L', 0.42 * pr, 6, 66, 24, 0.5 * pr); for (const c in w) p[c] = (p[c] || 0) + w[c];
    p.wLf = Math.max(p.wLf, 0) + 0.04 * nib * pr; p.sL = Math.min(0.9, p.sL);
    return p;
  },
  feet: (t, B) => {
    const F = {};
    for (const k of LEGS) {
      const sx = SX[k], lag = k === 'R' ? FR_ : 0, root = B.loc(k, [0, 0, 0]);
      // the toes push off; in the air the talons are tucked up under the belly
      if (t < DV.off + lag) { F[k] = plant(REST[k], 0.8 * smooth((t - DV.crouch) / (DV.off - DV.crouch))); continue; }
      const tuck = root.clone().add(V3(sx * 0.03, -0.275, 0.05));
      const trail = root.clone().add(V3(sx * 0.03, -0.17, -0.34));
      const landP = off(k, 0, 0, DIVE + SKID + (k === 'L' ? 0.02 : -0.03));
      const td = DV.land - (k === 'L' ? FR_ : 0);
      if (t < DV.rise) { const o = smooth((t - DV.off - lag) / 0.16); F[k] = { p: swingTo(root, REST[k], tuck, o, 0.05), pitch: lerp(0.8, 0.7, o), under: true }; continue; }
      if (t < DV.hit - 0.085) { const o = smooth((t - DV.rise) / 0.1); F[k] = { p: swingTo(root, tuck, trail, o), pitch: lerp(0.7, 1.3, o), under: true, yaw: 0 }; continue; }
      if (t < td) { const o = (t - (DV.hit - 0.085)) / (td - DV.hit + 0.085), e = smooth(o); const p = swingTo(root, trail, landP, e, 0.06); p.y = Math.max(p.y, 0.03 * (1 - e) + 0.09 * Math.sin(Math.PI * e) * (1 - e)); F[k] = { p, pitch: 1.3 * (1 - smooth(o * 1.15)) - 0.2 * Math.sin(Math.PI * e) * e, yaw: 0 }; continue; }
      F[k] = plant(landP);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Wing Gust
// mantle (the 40-tick cone less one strike: it crouches with the head low, the hackles up and the wings drawn up and back, wide),
// beat (2.5 frames: the wings are thrown wide and forward, cupped at the hero, and the body rocks back), held (3 frames),
// settle (0.55 s: the wings fold).
const GU = { mantle: 40 / 60 - STRIKE, hit: 40 / 60 }; GU.held = GU.hit + HOLD; GU.end = GU.held + 0.55;
const gust = {
  dur: GU.end, contact: [GU.hit], kinds: ['gust'], cues: { cone: [0, GU.hit] },
  phases: [['mantle', 0], ['beat', GU.mantle], ['held', GU.hit], ['settle', GU.held]],
  pose: (t) => {
    const k = track([[0, K({})],
      [0.16, K({ oy: -0.03, bp: -0.08, n1: -0.1, hd: 0.04, o: 0.3, li: 14, sw: 62, tw: 30, hk: 0.5 })],
      [0.44, K({ oy: -0.08, oz: -0.02, bp: -0.2, cp: -0.06, n1: -0.42, n2: -0.3, hd: 0.0, o: 1, li: 46, sw: 32, tw: -30, hk: 1, tl: 0.25, jw: 0.2 })],
      [GU.mantle, K({ oy: -0.092, oz: -0.03, bp: -0.23, cp: -0.07, n1: -0.46, n2: -0.34, hd: 0.02, o: 1, li: 52, sw: 38, tw: -36, hk: 1, tl: 0.3, jw: 0.3 })],
      [GU.hit, K({ oy: -0.04, oz: -0.035, bp: 0.22, cp: 0.09, n1: 0.0, n2: -0.12, hd: -0.2, o: 1, li: 2, sw: -50, tw: -58, hk: 0.7, tl: -0.3, jw: 0.9 }), 'out'],
      [GU.held, K({ oy: -0.05, oz: -0.045, bp: 0.25, cp: 0.1, n1: 0.02, n2: -0.12, hd: -0.2, o: 1, li: -4, sw: -56, tw: -60, hk: 0.7, tl: -0.32, jw: 0.8 })],
      [GU.held + 0.2, K({ oy: -0.02, oz: -0.01, bp: 0.04, n1: 0.0, hd: -0.04, o: 0.75, li: 8, sw: 6, tw: -10, hk: 0.4, tl: 0.05, jw: 0.1 })],
      [GU.held + 0.4, K({ oy: 0.006, bp: -0.02, o: 0.16, li: 6, sw: 56, tw: 40, hk: 0.2 })],
      [GU.end, K({})]])(t);
    const tr = Math.sin(48 * t) * pulse(t, 0.4, 0.46, GU.mantle - 0.02, GU.mantle), dn = pulse(t, GU.mantle, GU.hit, GU.held + 0.1, GU.end);
    return addPose(full(k), { wLl: 0.045 * tr, wRl: 0.045 * tr, wLj: 0.1 * tr - 0.3 * dn, wRj: 0.1 * tr - 0.3 * dn, hr: 0.03 * tr, kr: 0.05 * tr, br: 0.008 * tr });
  },
  feet: (t) => { const up = pulse(t, GU.mantle, GU.hit, GU.held, GU.held + 0.2); return Object.fromEntries(LEGS.map((k) => [k, plant(REST[k], -0.0 * up)])); },
};

// ------------------------------------------------------------------------------------------------ Omen
// call (the 84-tick ring less one strike: it draws itself up, the wings rise wide and high, and the head follows the mark while
// the mark follows the hero, 54 ticks; the mark locks and the head stills and tips back, the beak opening, 30 ticks, the crows
// already on their way for the last 14), caw (2.5 frames: the head is thrown up, the beak snaps wide, the body drops), held
// (3 frames, the crows land), settle (0.6 s).
const OM = { lock: 54 / 60, crows: 70 / 60, call: 84 / 60 - STRIKE, hit: 84 / 60 }; OM.held = OM.hit + HOLD; OM.end = OM.held + 0.6;
const omen = {
  dur: OM.end, contact: [OM.hit], kinds: ['omen'], cues: { ring: [0, OM.hit], lock: [OM.lock], crows: [OM.crows] },
  phases: [['call', 0], ['mark locks', OM.lock], ['crows come', OM.crows], ['caw', OM.call], ['held', OM.hit], ['settle', OM.held]],
  pose: (t) => {
    const k = track([[0, K({})],
      [0.14, K({ oy: -0.03, bp: -0.06, n1: -0.1, o: 0.12, li: 6, sw: 62, tw: 40, hk: 0.3 })],
      [0.46, K({ oy: 0.012, bp: 0.12, cp: 0.05, n1: 0.2, n2: 0.25, hd: 0.2, o: 0.9, li: 30, sw: 12, tw: -50, hk: 0.6, tl: -0.15, jw: 0.2 })],
      [OM.lock, K({ oy: 0.018, bp: 0.15, cp: 0.06, n1: 0.24, n2: 0.32, hd: 0.34, o: 1, li: 36, sw: 8, tw: -66, hk: 0.65, tl: -0.2, jw: 0.3 })],
      [OM.crows, K({ oy: 0.022, bp: 0.18, cp: 0.07, n1: 0.3, n2: 0.46, hd: 0.66, o: 1, li: 40, sw: 6, tw: -72, hk: 0.85, tl: -0.25, jw: 0.5 })],
      [OM.call, K({ oy: 0.03, bp: 0.14, cp: 0.05, n1: 0.2, n2: 0.3, hd: 0.42, o: 1, li: 46, sw: 8, tw: -74, hk: 1, tl: -0.2, jw: 0.25 })],
      [OM.hit, K({ oy: -0.045, bp: 0.24, cp: 0.1, n1: 0.42, n2: 0.7, hd: 1.08, o: 1, li: 12, sw: -16, tw: -62, hk: 1, tl: -0.12, jw: 1.05 }), 'out'],
      [OM.held, K({ oy: -0.052, bp: 0.25, cp: 0.1, n1: 0.43, n2: 0.72, hd: 1.1, o: 1, li: 6, sw: -20, tw: -62, hk: 1, tl: -0.12, jw: 1.0 })],
      [OM.held + 0.22, K({ oy: -0.015, bp: 0.08, cp: 0.03, n1: 0.14, n2: 0.2, hd: 0.3, o: 0.7, li: 10, sw: 16, tw: -20, hk: 0.6, tl: -0.05, jw: 0.3 })],
      [OM.held + 0.44, K({ oy: 0.005, bp: -0.02, n1: -0.03, hd: -0.04, o: 0.14, li: 6, sw: 56, tw: 40, hk: 0.25 })],
      [OM.end, K({})]])(t);
    const seek = pulse(t, 0.3, 0.46, OM.lock - 0.03, OM.lock), look = Math.sin(2 * Math.PI * (t - 0.3) / 0.5) * seek;
    const tr = Math.sin(50 * t) * pulse(t, OM.crows - 0.05, OM.crows, OM.call - 0.02, OM.call), rat = Math.sin(80 * t) * pulse(t, OM.hit - 0.01, OM.hit + 0.02, OM.held + 0.06, OM.held + 0.2);
    return addPose(full(k), { n1y: 0.1 * look, n2y: 0.12 * look, hy: 0.2 * look + 0.03 * rat, hr: -0.14 * look + 0.03 * tr + 0.04 * rat, jp: -0.06 * rat, wLl: 0.03 * tr, wRl: 0.03 * tr, wLj: 0.08 * tr, wRj: 0.08 * tr, kr: 0.04 * tr + 0.06 * rat });
  },
  feet: (t) => { const up = pulse(t, 0.3, OM.lock, OM.call, OM.hit); return Object.fromEntries(LEGS.map((k) => [k, plant(REST[k], 0.3 * up)])); },
};

// ------------------------------------------------------------------------------------------------ Enrage (new pose)
// Under 40 percent the game keeps the hackles up and lights the eyes and throat, with no pose. This one is new: it hunches with
// the head low and the wings shrugged off its sides, then thrusts the head forward and screams with the wings flared and shaking.
const EN = { scr: 0.62, out: 1.1, end: 1.5 };
const enrage = {
  dur: EN.end, contact: [EN.scr], kinds: ['scream'], phases: [['hunch', 0], ['scream', EN.scr - STRIKE], ['settle', EN.out]], cues: { scream: [EN.scr, EN.out] },
  pose: (t) => {
    const k = track([[0, K({})],
      [0.32, K({ oy: -0.07, oz: -0.02, bp: -0.2, cp: -0.08, n1: -0.5, n2: -0.42, hd: -0.2, o: 0.3, li: 8, sw: 70, tw: 34, hk: 1, tl: 0.2 })],
      [EN.scr - STRIKE, K({ oy: -0.08, oz: -0.03, bp: -0.22, cp: -0.09, n1: -0.54, n2: -0.46, hd: -0.24, o: 0.34, li: 10, sw: 70, tw: 32, hk: 1, tl: 0.22, jw: 0.15 })],
      [EN.scr, K({ oy: -0.05, oz: 0.05, bp: -0.34, cp: -0.1, n1: -0.5, n2: -0.3, hd: 0.2, o: 1, li: 24, sw: 2, tw: 4, hk: 1, tl: 0.5, jw: 1.05 }), 'out'],
      [EN.out, K({ oy: -0.045, oz: 0.045, bp: -0.3, cp: -0.09, n1: -0.46, n2: -0.26, hd: 0.2, o: 1, li: 30, sw: 6, tw: 2, hk: 1, tl: 0.45, jw: 0.95 })],
      [EN.out + 0.2, K({ oy: -0.012, bp: -0.04, n1: -0.08, hd: 0.0, o: 0.4, li: 10, sw: 44, tw: 26, hk: 0.95, tl: 0.1, jw: 0.2 })],
      [EN.end, K({ hk: 0.9 })]])(t);
    const env = pulse(t, EN.scr - 0.02, EN.scr + 0.03, EN.out - 0.08, EN.out + 0.08), tr = Math.sin(46 * t) * pulse(t, 0.28, 0.34, EN.scr - 0.06, EN.scr - 0.03);
    return addPose(full(k), { hy: 0.05 * Math.sin(80 * t) * env, hr: 0.05 * Math.sin(80 * t + 1.2) * env + 0.03 * tr, jp: 0.06 * Math.sin(80 * t) * env, wLl: 0.05 * Math.sin(64 * t) * env, wRl: 0.05 * Math.sin(64 * t + 1.6) * env, wLj: 0.12 * Math.sin(64 * t) * env, wRj: 0.12 * Math.sin(64 * t + 1.6) * env, kr: 0.06 * Math.sin(64 * t) * env, br: 0.02 * Math.sin(64 * t + 1) * env + 0.01 * tr });
  },
  feet: allPlanted,
};
// The enraged state, played on top of anything (neck, head, beak, hackles and tail only): hackles up, head a little low, beak
// ajar, quick breath.
const RT = 0.5;
const rageHold = {
  dur: RT, loop: true, upperOnly: true,
  pose: (t) => { const b = Math.sin(2 * Math.PI * t / RT); return { n1p: -0.06, hp: 0.04 + 0.012 * b, jp: -JAW * (0.2 + 0.05 * b), kp: -0.62 * (0.9 + 0.08 * b), t1p: -0.12 }; },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt, heavy hit
// hurt plays on top of anything: the head is knocked back and aside, the hackles flare, the beak gapes.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => { const f = pulse(t, 0, 0.05, 0.13, 0.42), g = pulse(t, 0.12, 0.2, 0.26, 0.42);
    return { n1p: 0.2 * f - 0.06 * g, n2p: 0.14 * f - 0.04 * g, hp: -0.12 * f + 0.05 * g, hy: 0.24 * f, hr: 0.2 * f - 0.05 * g, n1y: 0.08 * f, jp: -JAW * 0.6 * pulse(t, 0, 0.04, 0.12, 0.3), kp: -0.62 * 0.9 * pulse(t, 0, 0.04, 0.2, 0.42), t1p: -0.3 * f, t1y: 0.15 * f }; },
  feet: allPlanted,
};
// It is thrown back 0.3 u: the head whips, the wings fly open to catch it, it hops back on both feet, shakes itself and squares up.
const HB = -0.3 / CFG.unit;
const heavyHit = {
  dur: 1.1, contact: [0], kinds: ['taken'], travel: (t) => HB * EASE.out(clamp(t / 0.3)), phases: [['hit', 0], ['thrown back', 0.07], ['catch', 0.34], ['square up', 0.7]],
  pose: (t) => {
    const k = track([[0, K({})],
      [0.07, K({ oy: -0.03, oz: -0.04, bp: 0.32, cp: 0.12, n1: 0.5, n2: 0.55, hd: 0.3, o: 0.5, li: 26, sw: 24, tw: -10, hk: 1, tl: -0.3, jw: 0.8 }), 'out'],
      [0.22, K({ oy: 0.02, oz: -0.02, bp: 0.2, cp: 0.06, n1: 0.24, n2: 0.2, hd: -0.05, o: 0.9, li: 30, sw: 8, tw: -18, hk: 0.9, tl: -0.1, jw: 0.5 })],
      [0.36, K({ oy: -0.07, oz: 0.0, bp: -0.14, cp: -0.05, n1: -0.25, n2: -0.2, hd: -0.05, o: 0.8, li: -6, sw: 16, tw: 4, hk: 0.8, tl: 0.3, jw: 0.2 })],
      [0.7, K({ oy: -0.012, bp: 0.03, n1: 0.04, hd: 0.02, o: 0.2, li: 4, sw: 54, tw: 40, hk: 0.5, tl: 0.05 })],
      [1.1, K({})]])(t);
    const sh = Math.sin(42 * t) * pulse(t, 0.6, 0.68, 0.9, 1.02), f = pulse(t, 0, 0.06, 0.3, 0.6);
    return addPose(full(k), { br: 0.1 * f - 0.03 * sh, by: -0.12 * f, hy: -0.3 * f + 0.06 * sh, hr: -0.2 * f + 0.1 * sh, n2y: -0.1 * f, wLt: 0.08 * sh, wRt: -0.08 * sh, kr: 0.08 * sh, t1y: 0.25 * f + 0.3 * sh });
  },
  feet: (t) => ({ L: steps(t, REST.L, [[0.04, 0.3, off('L', 0, 0, HB), 0.05, 0.6]]), R: steps(t, REST.R, [[0.04 + FR_, 0.3 + FR_, off('R', 0, 0, HB), 0.05, 0.6]]) }),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows from the floor in 7 frames and stands. On top: it comes up out of a crouch, shakes the ash off with
// its wings half open, and caws once.
const SW = { grow: 7 / 60, caw: 1.12 };
const spawn = {
  dur: 1.6, contact: [SW.caw], kinds: ['caw'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SW.grow))), phases: [['grow', 0], ['rise', SW.grow], ['shake', 0.46], ['caw', 1.0], ['stand', 1.34]],
  pose: (t) => {
    const low = K({ oy: -0.13, bp: -0.16, cp: -0.05, n1: -0.4, n2: -0.3, hd: -0.2, hk: 0.4 });
    const k = track([[0, low], [SW.grow, low],
      [0.42, K({ oy: 0.012, bp: 0.06, cp: 0.03, n1: 0.1, n2: 0.08, hd: 0.06, o: 0.36, li: 10, sw: 44, tw: 26, hk: 0.7 })],
      [0.8, K({ oy: -0.004, bp: 0.02, o: 0.3, li: 8, sw: 46, tw: 28, hk: 0.8 })],
      [1.0, K({ oy: 0.004, bp: 0.03, n1: -0.08, n2: -0.06, hd: -0.1, o: 0.08, hk: 0.6, jw: 0.1 })],
      [SW.caw, K({ oy: -0.02, bp: 0.1, cp: 0.04, n1: 0.2, n2: 0.3, hd: 0.5, o: 0.14, li: 10, sw: 60, tw: 40, hk: 1, tl: -0.2, jw: 1.0 }), 'out'],
      [1.34, K({ oy: -0.01, bp: 0.06, n1: 0.12, n2: 0.2, hd: 0.34, o: 0.06, hk: 0.7, tl: -0.1, jw: 0.7 })],
      [1.6, K({})]])(t);
    const sh = pulse(t, 0.44, 0.52, 0.76, 0.88), w = 44 * (t - 0.44);
    return addPose(full(k), { wLt: 0.14 * Math.sin(w) * sh, wRt: -0.14 * Math.sin(w) * sh, wLl: 0.1 * Math.sin(w + 1) * sh, wRl: -0.1 * Math.sin(w + 1) * sh,
      br: 0.06 * Math.sin(w - 0.6) * sh, cr: 0.05 * Math.sin(w - 1.2) * sh, hr: 0.2 * Math.sin(w - 2.2) * sh, hy: 0.1 * Math.sin(w - 2.8) * sh, kr: 0.1 * Math.sin(w - 1.6) * sh, t1y: 0.35 * Math.sin(w - 3) * sh });
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// The feet unlock. It is knocked upright with the wings flying open and the beak wide on a cry that does not come; the legs give,
// one then the other, and it comes down on its breast with the wings falling open across the floor; the head sways, sinks, and the
// beak lies down last, turned to one side.
const DT = { cry: 0.34, drop: 1.0, wings: 1.4, neck: 1.9 };
const DY = -0.235, DP = -1.1, DW = -13;
const death = {
  dur: 2.6, contact: [DT.drop, DT.neck], kinds: ['thud', 'thud'], phases: [['hit', 0], ['cry', 0.08], ['legs give', DT.cry], ['down', DT.drop], ['head sinks', DT.wings], ['still', DT.neck + 0.1]],
  pose: (t) => {
    const k = track([[0, K({})],
      [0.08, K({ oy: -0.02, oz: -0.03, bp: 0.26, cp: 0.1, n1: 0.4, n2: 0.45, hd: 0.3, o: 0.35, li: 20, sw: 40, tw: 10, hk: 1, jw: 0.7 }), 'out'],
      [DT.cry, K({ oy: 0.012, oz: -0.02, bp: 0.2, cp: 0.1, n1: 0.34, n2: 0.5, hd: 0.8, o: 0.6, li: 26, sw: 28, tw: 0, hk: 1, jw: 1.0, tl: -0.3 })],
      [0.6, K({ oy: -0.07, oz: 0.0, bp: -0.1, cp: 0.0, n1: 0.1, n2: 0.2, hd: 0.3, o: 0.7, li: 18, sw: 22, tw: 0, hk: 0.7, jw: 0.7, tl: 0.0 })],
      [0.85, K({ oy: -0.16, oz: 0.03, bp: -0.6, cp: -0.03, n1: -0.2, n2: -0.05, hd: 0.1, o: 0.82, li: 8, sw: 20, tw: 0, hk: 0.5, jw: 0.5, tl: 0.25 })],
      [DT.drop, K({ oy: DY, oz: 0.05, bp: DP, cp: -0.05, n1: -0.5, n2: -0.2, hd: 0.0, o: 0.9, li: -2, sw: 20, tw: 0, hk: 0.3, jw: 0.4, tl: 0.1 }), 'in'],
      [DT.drop + 0.12, K({ oy: DY + 0.012, oz: 0.05, bp: DP + 0.04, cp: -0.04, n1: -0.36, n2: -0.05, hd: 0.14, o: 0.92, li: -8, sw: 18, tw: 0, hk: 0.3, jw: 0.5, tl: -0.2 })],
      [DT.wings, K({ oy: DY, oz: 0.05, bp: DP, cp: -0.05, n1: -0.56, n2: -0.3, hd: -0.05, o: 0.94, li: DW, sw: 16, tw: 0, hk: 0.2, jw: 0.35, tl: -0.7 })],
      [DT.neck, K({ oy: DY, oz: 0.05, bp: DP, cp: -0.05, n1: -1.0, n2: -0.86, hd: -0.5, o: 0.94, li: DW, sw: 16, tw: 0, hk: 0.1, jw: 0.3, tl: -0.7 }), 'in'],
      [DT.neck + 0.14, K({ oy: DY, oz: 0.05, bp: DP, cp: -0.05, n1: -0.96, n2: -0.8, hd: -0.44, o: 0.94, li: DW, sw: 16, tw: 0, hk: 0.1, jw: 0.3, tl: -0.7 })],
      [2.6, K({ oy: DY, oz: 0.05, bp: DP, cp: -0.05, n1: -1.0, n2: -0.86, hd: -0.5, o: 0.94, li: DW, sw: 16, tw: 0, hk: 0.1, jw: 0.3, tl: -0.7 })]])(t);
    const f = pulse(t, 0, 0.06, 0.3, 0.7), lie = smooth((t - DT.wings) / (DT.neck - DT.wings));
    return addPose(full(k), { br: 0.1 * f + 0.08 * pulse(t, 0.5, 0.8, 0.9, DT.drop), by: -0.06 * f, hr: 0.75 * lie, hy: 0.3 * lie, n2r: 0.25 * lie, n1y: 0.1 * lie });
  },
  feet: (t, B) => {
    const g = smooth((t - DT.cry) / (DT.drop - DT.cry)); const F = {};
    const out = { L: off('L', 0.05, 0.012, -0.02), R: off('R', -0.06, 0.012, -0.05) };
    for (const k of LEGS) { const gg = k === 'R' ? smooth(g * 1.5) : smooth((g - 0.25) / 0.75); const p = REST[k].clone().lerp(out[k], gg); p.y += 0.02 * Math.sin(Math.PI * gg);
      F[k] = { p, pitch: 0.2 * gg, lock: t < DT.cry }; }
    return F;
  },
};

// The tail hangs close to the floor, so whenever the hips come down it swings up behind to lie on the floor, not through it.
const TB = J('tail1'), TE = V3(...skel.ends.tail2), HP = J('hips');
const TAIL = { len: TB.distanceTo(TE), b0: Math.atan2(TB.y - TE.y, TB.z - TE.z), dy: TB.y - HP.y, dz: TB.z - HP.z };
function tailGuard(p) {
  const th = -(p.bp || 0); const baseY = HP.y + (p.oy || 0) + TAIL.dy * Math.cos(th) - TAIL.dz * Math.sin(th);
  const need = TAIL.b0 - th - Math.asin(clamp((baseY - 0.065) / TAIL.len, -1, 1)); const have = -(p.t1p || 0);
  if (need > have) { p.t1p = -need; p.t2p = Math.min(0, p.t2p || 0) * (1 - clamp((need - have) / 0.5)); }
  return p;
}
const guarded = (c) => (c.upperOnly ? c : { ...c, pose: (t) => tailGuard(c.pose(t)) });
export const CLIPS_RAW = { idle, walk, turnL: turn(1), turnR: turn(-1), dive, gust, omen, enrage, rageHold, hurt, heavyHit, spawn, death };
export const CLIPS = Object.fromEntries(Object.entries(CLIPS_RAW).map(([k, c]) => [k, guarded(c)]));
