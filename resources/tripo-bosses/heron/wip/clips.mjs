// The Drowned Heron's moves. Units are model units (the model is 1 tall; the page draws it 3.0 u tall, CFG.unit, which
// puts its hips at the game rig's 1.45 u). Timings come from the game: HERON in src/sim/bosses/heron.js (stalk 2.0 u/s;
// Bill Spear: 48-tick lane, then a dash at 11 u/s to 2.5 u past the hero; Wingbeat: 42-tick ring, radius 2.2 u;
// Submerge with no warning; Surface: 48-tick ring, radius 1.8 u), the phases of render/boss/heronfacet.js, and the beats
// in render/facet/beats.js (strike 2.5 frames, contact held 3 frames, gather 1.5 frames).
import fs from 'fs';
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, frac } from '../../kit/quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_, GATHER = 1.5 * FR_; const D2R = Math.PI / 180;
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const J = (n) => V3(...skel.pos[skel.names.indexOf(n)]);

// ---- wings. The model's wings are folded; each was cut free and turns about its shoulder. Its pose is three angles:
// sweep (0 straight out to the side, + back), lift (+ up), twist (+ leading edge down). Folded is what the model has.
const WG = skel.wing; const a0 = V3(...WG.a0), n0 = V3(...WG.n0), c0 = V3(...WG.c0);
const qAx = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const XA = V3(1, 0, 0), YA = V3(0, 1, 0), ZA = V3(0, 0, 1);
const eul = (s, l, t) => qAx(YA, s).multiply(qAx(ZA, l)).multiply(qAx(XA, t));
const FOLD = (() => { const s = Math.atan2(-a0.z, a0.x), l = Math.asin(clamp(a0.y, -1, 1)); const v = n0.clone().applyQuaternion(qAx(YA, s).multiply(qAx(ZA, l)).invert()); return { s, l, t: Math.atan2(v.z, v.y) }; })();
const Q0inv = eul(FOLD.s, FOLD.l, FOLD.t).invert();
const mirrorQ = (q) => new THREE.Quaternion(q.x, -q.y, -q.z, q.w);
const wingQ = (s) => (p) => { const q = eul(FOLD.s + (p['w' + s + 's'] || 0), FOLD.l + (p['w' + s + 'l'] || 0), FOLD.t + (p['w' + s + 't'] || 0)).multiply(Q0inv); return s === 'L' ? q : mirrorQ(q); };
const NF = WG.feathers.length;
const featherQ = (s, i) => (p) => { const f = clamp(p['w' + s + 'f'] || 0, 0, 1.15); const q = qAx(n0, WG.feathers[i][2] * D2R * f + (p['w' + s + 'j'] || 0) * (i / NF - 0.4)); return s === 'L' ? q : mirrorQ(q); };
// open 0..1 takes a wing from folded to (lift, sweep, twist) in degrees; fan spreads the flight feathers (they grow out of the wing as it opens)
const wing1 = (s, open, lift = 0, sweep = 0, twist = 0, fan = open) => ({ ['w' + s + 's']: (sweep * D2R - FOLD.s) * open, ['w' + s + 'l']: (lift * D2R - FOLD.l) * open, ['w' + s + 't']: (twist * D2R - FOLD.t) * open, ['w' + s + 'f']: fan, ['s' + s]: 0.9 * smooth(fan * 1.6) });
const wings = (open, lift = 0, sweep = 0, twist = 0, fan = open) => ({ ...wing1('L', open, lift, sweep, twist, fan), ...wing1('R', open, lift, sweep, twist, fan) });

// ---- neck: four segments and the head. Poses are written as each segment's angle from upright toward the front, in degrees, in
// the body's frame (tilt: how far the body itself is tipped forward, to write them in the world's), and the bill's angle below level.
const NJ = ['neck1', 'neck2', 'neck3', 'neck4', 'head'].map(J);
const NREST = [0, 1, 2, 3].map((i) => Math.atan2(NJ[i + 1].z - NJ[i].z, NJ[i + 1].y - NJ[i].y));
const BILL0 = Math.atan2(NJ[4].y - skel.ends.head[1], skel.ends.head[2] - NJ[4].z);
export const NECK_REST = [...NREST.map((a) => a / D2R), BILL0 / D2R];
const neck = (A, tilt = 0) => { const d = [0, 1, 2, 3].map((i) => (A[i] - tilt) * D2R - NREST[i]); return { n1p: -d[0], n2p: -(d[1] - d[0]), n3p: -(d[2] - d[1]), n4p: -(d[3] - d[2]), hp: d[3] - ((A[4] - tilt) * D2R - BILL0) }; };
const mixA = (A, B, u) => A.map((a, i) => lerp(a, B[i], u));
const NR = NECK_REST;

export const CFG = {
  name: 'heron', unit: 3.0, base: { oy: -0.014, sL: -0.9, sR: -0.9 },
  chain: [['hips', 'b'], ['chest', 'c'], ['neck1', 'n1'], ['neck2', 'n2'], ['neck3', 'n3'], ['neck4', 'n4'], ['head', 'h']],
  extras: [['jaw', 'j'], ['crest1', 'k1'], ['crest2', 'k2'], ['plume1', 'q1'], ['plume2', 'q2'], ['tail1', 't1'], ['tail2', 't2'],
    ['wingL', wingQ('L')], ['wingR', wingQ('R')], ...Array.from({ length: NF }, (_, i) => ['fL' + i, featherQ('L', i)]), ...Array.from({ length: NF }, (_, i) => ['fR' + i, featherQ('R', i)]),
    ['weedL', 'vl'], ['weedR', 'vr']],
  scales: [...Array.from({ length: NF }, (_, i) => ['fL' + i, 'sL']), ...Array.from({ length: NF }, (_, i) => ['fR' + i, 'sR'])],
  hang: [['weedL', 0.9], ['weedR', 0.9]],
  legs: { L: { kind: 'hind', kcs: 0.75, kcf: 1.2, b: ['thighL', 'shinL', 'tarsusL', 'footL'] }, R: { kind: 'hind', kcs: 0.75, kcf: 1.2, b: ['thighR', 'shinR', 'tarsusR', 'footR'] } },
  springs: [{ bone: 'crest1', k: 300, c: 11, max: 0.5 }, { bone: 'crest2', k: 220, c: 9, max: 0.7 }, { bone: 'plume1', k: 200, c: 10, max: 0.4 }, { bone: 'plume2', k: 150, c: 8, max: 0.5 },
    { bone: 'tail1', k: 260, c: 12, max: 0.4 }, { bone: 'tail2', k: 200, c: 10, max: 0.5 }, { bone: 'weedL', k: 70, c: 5, max: 1.1 }, { bone: 'weedR', k: 70, c: 5, max: 1.1 }],
};
const REST = { L: V3(...skel.ends.footL), R: V3(...skel.ends.footR) }; REST.L.y = 0; REST.R.y = 0;
const LEGS = ['L', 'R'];
const plant = (p, pitch = 0) => ({ p: p.clone(), lock: true, pitch });
// a foot carried from a to b as the end of a clock hand about the hip: the leg's direction turns and its length changes, so a long
// swing never drags the foot through the hip (which flips the knee over in one frame)
const swingTo = (root, a, b, u, dip = 0) => { if (u <= 0) return a.clone(); if (u >= 1) return b.clone(); const da = a.clone().sub(root), db = b.clone().sub(root), la = da.length(), lb = db.length(); da.normalize(); db.normalize();
  const q = new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(da, db), u); return root.clone().add(da.applyQuaternion(q).multiplyScalar(lerp(la, lb, u) * (1 - dip * Math.sin(Math.PI * u)))); };
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const jaw = (open = 0) => ({ jp: -0.55 * open });
// the crest lies back along the head: up stands it; the tail hangs: lift raises it behind, fan wags it
const crest = (up = 0, sh = 0) => ({ k1p: -0.55 * up + sh, k2p: -0.35 * up - sh });
const tail = (lift = 0, wag = 0) => ({ t1p: -lift, t2p: -0.4 * lift, t1r: wag, t2r: 0.6 * wag });
const plumes = (fwd = 0, side = 0) => ({ q1p: fwd, q2p: 0.6 * fwd, q1r: side, q2r: 0.6 * side });
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.9); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));

// ------------------------------------------------------------------------------------------------ idle
// 6 s. A heron stands very still and moves in snaps: the breath, the S of the neck easing, the head flicking left, then right with
// a cock of the head, the crest lifting each time it looks, a ruffle of the wings, one clack of the bill, the weed swaying.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const lookL = pulse(t, 0.8, 0.9, 1.9, 2.02), lookR = pulse(t, 3.1, 3.2, 4.4, 4.52), cock = pulse(t, 3.5, 3.6, 4.2, 4.3), clack = bump(t, 5.2, 0.16) + bump(t, 5.42, 0.14);
    const ruff = pulse(t, 2.3, 2.5, 2.7, 3.0), rs = Math.sin(40 * t) * pulse(t, 2.4, 2.5, 2.75, 2.9);
    const A = [NR[0] + 2 * sw + 3 * ruff, NR[1] - 3 * sw - 4 * ruff, NR[2] + 2 * Math.sin(w + 0.8), NR[3] + 1.5 * sw, NR[4] - 2 * br + 4 * clack];
    return addPose(
      { oy: 0.003 * br - 0.006 * ruff, cp: 0.012 * br + 0.03 * ruff, ox: 0.006 * sw, br: 0.012 * sw, by: 0.01 * Math.sin(w + 1) },
      neck(A), { n3y: 0.2 * lookL - 0.2 * lookR, n4y: 0.25 * lookL - 0.25 * lookR, hy: 0.4 * lookL - 0.4 * lookR, hr: 0.28 * cock, n2r: 0.02 * rs },
      jaw(0.04 + 0.35 * clack), crest(0.15 + 0.5 * bump(t, 0.9, 0.5) + 0.5 * bump(t, 3.2, 0.5) + 0.3 * cock + 0.25 * clack, 0),
      tail(0.03 * br + 0.1 * ruff, 0.05 * sw + 0.25 * rs), plumes(0.02 * br, 0.03 * sw + 0.1 * rs),
      wings(0.05 * ruff + 0.012 * (1 + br), 0, 60, 60, 0), { wLt: 0.12 * rs * 1, wRt: -0.12 * rs, br: 0.03 * rs },
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ stalk (walk) and turn
// 2.0 u/s, two slow high steps in 0.9 s. The foot comes up with its toes hanging and reaches; the head holds still in the air
// and then darts forward once a step, as a wading bird's does; the tail and the weed swing against the steps.
const WT = 0.9;
const GAIT = { T: WT, duty: 0.62, v: 2.0 / CFG.unit };
const GF = { L: { phase: 0, n: [REST.L.x, REST.L.z - 0.01], lift: 0.1, droop: 1.0, push: 0.35 }, R: { phase: 0.5, n: [REST.R.x, REST.R.z - 0.01], lift: 0.1, droop: 1.0, push: 0.35 } };
const NECK_OUT = [NR[0] + 10, NR[1] + 14, NR[2] + 10, NR[3] + 4, NR[4] + 2], NECK_IN = [NR[0] - 6, NR[1] - 9, NR[2] - 5, NR[3] - 2, NR[4] - 1];
const bob = (t) => { const s = frac(2 * t / WT + 0.3); return s < 0.66 ? 1 - s / 0.66 : smooth((s - 0.66) / 0.34); }; // 1 out, 0 drawn in
const walkPose = (t, turn = 0) => {
  const w = 2 * Math.PI * t / WT; const u = bob(t);
  return addPose(
    { oy: -0.012 + 0.012 * Math.cos(2 * w + 0.5), ox: 0.016 * Math.sin(w + 0.3), br: 0.03 * Math.sin(w + 0.3), by: 0.05 * Math.sin(w - 0.4) + 0.05 * turn, bp: -0.06 + 0.015 * Math.cos(2 * w), cy: -0.03 * Math.sin(w - 0.4) },
    neck(mixA(NECK_IN, NECK_OUT, u), 0.06 / D2R * 0 + 3.4), { n2y: 0.08 * turn, n3y: 0.1 * turn, hy: 0.16 * turn, hr: 0.02 * Math.sin(w) },
    jaw(0.03), crest(0.12 + 0.1 * u, 0), tail(0.2 + 0.03 * Math.cos(2 * w), -0.08 * Math.sin(w + 0.3)), plumes(0.03 * Math.cos(2 * w + 1), 0.05 * Math.sin(w + 0.9)),
    wings(0.02, 0, 60, 60, 0),
  );
};
const walk = { dur: WT, loop: true, gait: GAIT, pose: (t) => walkPose(t), feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])) };
const TURN_W = 2 * Math.PI / 3.0;
const turn = (dir) => { const g = { T: WT, duty: 0.62, v: 0, omega: dir * TURN_W, pivot: [0, 0] }; const gf = { L: { ...GF.L, lift: 0.07 }, R: { ...GF.R, lift: 0.07 } };
  return { dur: WT, loop: true, gait: g, pose: (t) => { const p = walkPose(t, dir); p.bp += 0.04; p.oy += 0.004; return p; }, feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])) }; };

// ------------------------------------------------------------------------------------------------ Wingbeat
// wings up (the 42-tick ring less one strike: a dip, then up on its toes with the wings up and open over the back and the head drawn
// back), beat (2.5 frames: the wings slam down and forward and the body drops), downstroke (3 frames), settle (0.55 s: the wings fold).
const WB = { raise: 42 / 60 - STRIKE, hit: 42 / 60, held: 42 / 60 + HOLD, end: 42 / 60 + HOLD + 0.55 };
const wingbeat = {
  dur: WB.end, contact: [WB.hit], kinds: ['wingbeat'], cues: { ring: [0, WB.hit] },
  phases: [['wings up', 0], ['beat', WB.raise], ['downstroke', WB.hit], ['settle', WB.held]],
  pose: (t) => {
    const k = track([[0, { o: 0, li: 0, sw: 60, tw: 50, oy: 0, bp: 0, cp: 0, a0: NR[0], a1: NR[1], a2: NR[2], a3: NR[3], ah: NR[4] }],
      [0.16, { o: 0.25, li: 0, sw: 50, tw: 40, oy: -0.035, bp: -0.1, cp: -0.04, a0: NR[0] + 14, a1: NR[1] + 10, a2: NR[2], a3: NR[3], ah: NR[4] + 6 }],
      [0.46, { o: 1, li: 58, sw: 12, tw: -6, oy: 0.03, bp: 0.2, cp: 0.08, a0: NR[0] - 20, a1: NR[1] - 16, a2: NR[2] + 6, a3: NR[3] + 22, ah: NR[4] - 6 }],
      [WB.raise, { o: 1, li: 74, sw: 16, tw: -12, oy: 0.045, bp: 0.26, cp: 0.1, a0: NR[0] - 26, a1: NR[1] - 20, a2: NR[2] + 8, a3: NR[3] + 28, ah: NR[4] - 10 }],
      [WB.hit, { o: 1, li: -30, sw: -34, tw: 26, oy: -0.075, bp: -0.24, cp: -0.1, a0: NR[0] + 30, a1: NR[1] + 34, a2: NR[2] + 24, a3: NR[3] + 10, ah: NR[4] + 16 }, 'out'],
      [WB.held, { o: 1, li: -36, sw: -38, tw: 28, oy: -0.085, bp: -0.26, cp: -0.1, a0: NR[0] + 32, a1: NR[1] + 36, a2: NR[2] + 24, a3: NR[3] + 10, ah: NR[4] + 18 }],
      [WB.held + 0.2, { o: 0.8, li: 6, sw: 14, tw: 6, oy: -0.02, bp: -0.04, cp: 0.0, a0: NR[0] + 6, a1: NR[1] + 4, a2: NR[2], a3: NR[3], ah: NR[4] + 2 }],
      [WB.held + 0.4, { o: 0.2, li: 0, sw: 50, tw: 40, oy: 0.006, bp: 0.02, cp: 0.01, a0: NR[0] - 3, a1: NR[1] - 3, a2: NR[2], a3: NR[3], ah: NR[4] }],
      [WB.end, { o: 0, li: 0, sw: 60, tw: 50, oy: 0, bp: 0, cp: 0, a0: NR[0], a1: NR[1], a2: NR[2], a3: NR[3], ah: NR[4] }]])(t);
    const up = pulse(t, 0.2, 0.46, WB.raise, WB.hit), tr = Math.sin(46 * t) * pulse(t, 0.44, 0.5, WB.raise - 0.02, WB.raise), dn = pulse(t, WB.raise, WB.hit, WB.held + 0.1, WB.end);
    return addPose({ oy: k.oy, bp: k.bp, cp: k.cp }, neck([k.a0, k.a1, k.a2, k.a3, k.ah]), wings(clamp(k.o), k.li + 2.5 * tr, k.sw, k.tw, clamp(k.o * 1.1, 0, 1.08)),
      { wLj: 0.12 * tr - 0.25 * dn, wRj: 0.12 * tr - 0.25 * dn },
      jaw(0.1 + 0.6 * up - 0.1 * dn), crest(0.3 + 0.7 * up - 0.3 * dn, 0), tail(0.25 * up - 0.3 * dn, 0), plumes(-0.1 * up + 0.25 * dn, 0));
  },
  feet: (t) => { const up = pulse(t, 0.22, 0.46, WB.raise, WB.hit); return Object.fromEntries(LEGS.map((k) => [k, plant(REST[k], 0.5 * up)])); },
};


// ------------------------------------------------------------------------------------------------ Bill Spear
// coil (the 48-tick lane less one strike: a foot goes back and the weight with it, the S draws tight over the back, the bill gapes at
// the hero), thrust (2.5 frames, ending on the resolve: the neck goes straight down the lane and the feet leave the floor), dash (the
// sim's 11 u/s to 2.5 u past the hero: a low skim on spread wings, legs trailed, one wingbeat; the bill runs at a hero's chest, so it
// flies lower than the game rig's +0.42 u; the straight neck reaches 2.2 u, so at the 2.4 u stand-off the bill meets the hero as the dash starts), land (2.5 frames: both feet down, the lead
// foot ahead, the wings thrown forward to brake), braced (3 frames), settle (0.5 s: it steps up and folds).
const HERO_U = 2.4, PAST_U = 2.5, DASH_T = Math.round((HERO_U + PAST_U) / 11 * 60) / 60, DASH = 11 * DASH_T / CFG.unit, STEP = 0.1;
const SP = { coil: 48 / 60 - STRIKE, go: 48 / 60, down: 48 / 60 + DASH_T, land: 48 / 60 + DASH_T + STRIKE, held: 48 / 60 + DASH_T + STRIKE + HOLD, end: 48 / 60 + DASH_T + STRIKE + HOLD + 0.5 };
const spTravel = (t) => DASH * clamp((t - SP.go) / DASH_T) + STEP * smooth((t - SP.held) / 0.32);
const K = (o) => ({ oy: 0, oz: 0, bp: 0, cp: 0, a0: NR[0], a1: NR[1], a2: NR[2], a3: NR[3], ah: NR[4], o: 0, li: 0, sw: 60, tw: 50, ...o });
const tiltOf = (k) => -(k.bp + k.cp) / D2R;
// the wings' twist is written against the floor: a body tipped forward tips its wings with it, so that is taken back out
const wingsW = (k, fanK = 1.15) => wings(clamp(k.o), k.li, k.sw, k.tw - tiltOf(k) * clamp(k.o), clamp(k.o * fanK, 0, 1.06));
const body = (k) => addPose({ oy: k.oy, oz: k.oz, bp: k.bp, cp: k.cp }, neck([k.a0, k.a1, k.a2, k.a3, k.ah], -(k.bp + k.cp) / D2R));
const spear = {
  dur: SP.end, contact: [SP.go + 0.02], kinds: ['spear'], travel: spTravel, cues: { lane: [0, SP.go], go: [SP.go], land: [SP.down] },
  phases: [['coil', 0], ['thrust', SP.coil], ['dash', SP.go], ['land', SP.down], ['braced', SP.land], ['settle', SP.held]],
  pose: (t) => {
    const k = track([[0, K({})],
      [0.22, K({ oy: -0.02, oz: -0.03, bp: 0.06, a0: NR[0] - 22, a1: NR[1] - 26, a2: NR[2] + 6, a3: NR[3] + 20, ah: NR[4] - 6, o: 0.06 })],
      [0.6, K({ oy: -0.045, oz: -0.07, bp: 0.15, cp: 0.04, a0: -49, a1: -105, a2: -22, a3: 44, ah: 8, o: 0.14, li: 10, sw: 62, tw: 46 })],
      [SP.coil, K({ oy: -0.055, oz: -0.08, bp: 0.17, cp: 0.05, a0: -54, a1: -110, a2: -20, a3: 48, ah: 6, o: 0.16, li: 10, sw: 62, tw: 46 })],
      [SP.go, K({ oy: -0.09, oz: 0.1, bp: -0.52, cp: -0.1, a0: 104, a1: 114, a2: 120, a3: 120, ah: 28, o: 0.6, li: 34, sw: 26, tw: 0 }), 'out'],
      [SP.go + 0.08, K({ oy: -0.14, oz: 0.06, bp: -0.62, cp: -0.08, a0: 106, a1: 112, a2: 114, a3: 114, ah: 22, o: 1, li: 24, sw: 14, tw: 0 })],
      [SP.go + 0.24, K({ oy: -0.15, oz: 0.06, bp: -0.62, cp: -0.08, a0: 106, a1: 112, a2: 114, a3: 114, ah: 22, o: 1, li: -14, sw: 16, tw: 6 })],
      [SP.go + 0.39, K({ oy: -0.1, oz: 0.04, bp: -0.46, cp: -0.06, a0: 96, a1: 100, a2: 102, a3: 102, ah: 14, o: 1, li: 18, sw: 6, tw: -8 })],
      [SP.down, K({ oy: 0.02, oz: 0.0, bp: -0.08, cp: 0.0, a0: 46, a1: 36, a2: 30, a3: 40, ah: 18, o: 1, li: 38, sw: -4, tw: -34 })],
      [SP.land, K({ oy: -0.075, oz: -0.02, bp: 0.14, cp: 0.06, a0: 10, a1: -34, a2: -22, a3: 18, ah: 26, o: 1, li: 22, sw: -14, tw: -50 }), 'out'],
      [SP.held, K({ oy: -0.085, oz: -0.022, bp: 0.15, cp: 0.06, a0: 8, a1: -36, a2: -22, a3: 18, ah: 26, o: 1, li: 18, sw: -16, tw: -52 })],
      [SP.held + 0.2, K({ oy: -0.015, oz: 0, bp: 0.03, a0: NR[0] + 6, a1: NR[1] + 6, a2: NR[2], a3: NR[3], ah: NR[4] + 2, o: 0.55, li: 4, sw: 36, tw: 16 })],
      [SP.held + 0.38, K({ oy: 0.004, a0: NR[0] - 3, a1: NR[1] - 3, o: 0.12, li: 0, sw: 58, tw: 46 })],
      [SP.end, K({})]])(t);
    const coil = pulse(t, 0.2, 0.6, SP.coil, SP.go), tr = Math.sin(50 * t) * pulse(t, 0.55, 0.62, SP.coil - 0.02, SP.coil), fly = pulse(t, SP.coil, SP.go, SP.down, SP.land);
    return addPose(body(k), wingsW(k), { hr: 0.03 * tr, n3y: 0.012 * tr, br: 0.008 * tr },
      jaw(0.05 + 0.6 * coil * (1 - fly) + 0.25 * pulse(t, SP.down, SP.land, SP.held, SP.held + 0.2)), crest(0.2 + 0.7 * coil + 0.5 * pulse(t, SP.down, SP.land, SP.held + 0.1, SP.end) - 0.3 * fly, 0),
      tail(0.3 * coil + 0.9 * fly + 0.2 * pulse(t, SP.down, SP.land, SP.held, SP.end), 0), plumes(-0.1 * coil - 0.18 * fly + 0.3 * pulse(t, SP.down, SP.land, SP.held + 0.1, SP.end), 0));
  },
  feet: (t, B) => {
    const F = {}; const back = off('R', 0, 0, -0.065);
    const landP = { L: off('L', 0.006, 0, DASH + STEP), R: off('R', -0.006, 0, DASH - 0.035) };
    for (const k of LEGS) {
      if (t < SP.go - 0.012) { F[k] = k === 'R' ? steps(t, REST.R, [[0.08, 0.26, back, 0.05, 0.6]]) : plant(REST.L); if (t > SP.coil) F[k].pitch = (F[k].pitch || 0) + 0.5 * smooth((t - SP.coil) / STRIKE); continue; }
      if (t < SP.down) {
        const from = k === 'R' ? back : REST.L; const a = B.loc(k, [0, -0.33, -0.36]), root = B.loc(k, [0, 0, 0]); // loc carries the dash's travel, legRoot does not
        const out = smooth((t - (SP.go - 0.012)) / 0.08), inn = smooth((t - (SP.down - 0.17)) / 0.17);
        const p = swingTo(root, swingTo(root, from, a, out), landP[k], inn, 0.1); if (inn > 0) p.y = Math.max(p.y, 0.05 * (1 - inn) ** 1.5);
        F[k] = { p, pitch: 1.2 * out * (1 - inn) }; continue;
      }
      if (k === 'L') F[k] = plant(landP.L);
      else F[k] = steps(t, landP.R, [[SP.held + 0.1, SP.held + 0.34, off('R', 0, 0, DASH + STEP), 0.07, 0.8]]);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Bill Flurry (Kesh's ask, 13 Nov)
// A new move, not in the game: three rapid jabs of the bill at one target. No ring and no lane, only a small mark under the one
// it has picked. The neck coils into its S and aims (36 ticks), then jabs every 10 frames: strike 2.5 frames, held 3, snatched
// back 4.5. The first comes in from its left, the second from its right, the third from above after a bigger wind and a step in,
// and goes deeper. Then it draws up tall and flicks the bill clean.
const PK = { coil: 0.42, h1: 36 / 60, h2: 46 / 60, h3: 58 / 60 }; PK.c1 = PK.h1 - STRIKE; PK.c2 = PK.h2 - STRIKE; PK.c3 = PK.h3 - STRIKE; PK.out = PK.h3 + HOLD; PK.tall = PK.out + 0.2; PK.end = PK.out + 0.6;
const mixK = (A, B, u) => Object.fromEntries(Object.keys(A).map((n) => [n, lerp(A[n], B[n], u)]));
const PK_COIL = K({ oy: 0.008, oz: -0.06, bp: 0.14, cp: 0.05, a0: -46, a1: -98, a2: 4, a3: 70, ah: 26, o: 0.12, li: 10, sw: 62, tw: 46 });
const PK_JAB = K({ oy: -0.05, oz: 0.05, bp: -0.34, cp: -0.1, a0: 106, a1: 120, a2: 126, a3: 126, ah: 36, o: 0.2, li: 26, sw: 44, tw: 20 });
const PK_JAB3 = K({ oy: -0.085, oz: 0.085, bp: -0.46, cp: -0.12, a0: 110, a1: 124, a2: 130, a3: 130, ah: 40, o: 0.34, li: 34, sw: 36, tw: 10 });
const PK_STEP = 0.07;
const PKY = (process.env.PKY || '0.65,0,0,0.2').split(',').map(Number);
const peck = {
  dur: PK.end, contact: [PK.h1, PK.h2, PK.h3], kinds: ['peck', 'peck', 'peck3'], cues: { mark: [0, PK.h1] },
  phases: [['aim', 0], ['jab 1', PK.c1], ['back', PK.h1 + HOLD], ['jab 2', PK.c2], ['back', PK.h2 + HOLD], ['jab 3', PK.c3], ['held', PK.h3], ['flick clean', PK.out]],
  pose: (t) => {
    const hold = (J, d) => ({ ...J, oz: J.oz + d, a3: J.a3 + 2, ah: J.ah + 1 }); // the bill leans into the target while it is held
    const k = track([[0, K({})],
      [0.16, K({ oy: -0.012, oz: 0.012, bp: -0.05, a0: NR[0] + 10, a1: NR[1] + 10, a2: NR[2] + 6, a3: NR[3] + 4, ah: NR[4] + 16 })], // it looks at the one it has picked
      [PK.coil, PK_COIL], [PK.c1, { ...PK_COIL, oy: 0.012, oz: -0.066, a0: -49, a1: -101 }],
      [PK.h1, PK_JAB, 'out'], [PK.h1 + HOLD, hold(PK_JAB, 0.006)],
      [PK.c2, mixK(PK_JAB, PK_COIL, 0.62)],
      [PK.h2, { ...PK_JAB, oy: -0.056, ah: 38 }, 'out'], [PK.h2 + HOLD, hold({ ...PK_JAB, oy: -0.056, ah: 38 }, 0.006)],
      [PK.c3 - 0.025, { ...mixK(PK_JAB, PK_COIL, 0.9), oy: 0.02, a2: 8, a3: 76, ah: 30, o: 0.3, li: 30 }], [PK.c3, { ...mixK(PK_JAB, PK_COIL, 0.96), oy: 0.024, a2: 6, a3: 78, ah: 32, o: 0.32, li: 32 }],
      [PK.h3, PK_JAB3, 'out'], [PK.out, hold(PK_JAB3, 0.01)],
      [PK.out + 0.09, mixK(PK_JAB3, PK_COIL, 0.55)],
      [PK.tall, K({ oy: 0.016, oz: -0.01, bp: 0.07, cp: 0.03, a0: NR[0] - 8, a1: NR[1] - 10, a2: NR[2] - 4, a3: NR[3] - 2, ah: NR[4] - 12, o: 0.1, li: 6, sw: 60, tw: 46 })],
      [PK.tall + 0.2, K({ oy: 0.006, bp: 0.02, a0: NR[0] - 3, a1: NR[1] - 3, ah: NR[4] - 3 })],
      [PK.end, K({})]])(t);
    // each jab comes in from a different side: the neck swings out at its base and the head turns back in, so the tip finds the same spot
    const y = track([[0, { y: 0, r: 0 }], [PK.coil, { y: 0.05, r: 0 }], [PK.c1, { y: 0.16, r: 0.06 }], [PK.h1, { y: 0.13, r: 0.1 }, 'out'], [PK.h1 + HOLD, { y: 0.13, r: 0.1 }], [PK.c2, { y: -0.16, r: -0.06 }],
      [PK.h2, { y: -0.13, r: -0.1 }, 'out'], [PK.h2 + HOLD, { y: -0.13, r: -0.1 }], [PK.c3, { y: 0, r: 0.04 }], [PK.h3, { y: 0, r: -0.16 }, 'out'], [PK.out, { y: 0, r: -0.18 }], [PK.tall, { y: 0, r: 0 }], [PK.end, { y: 0, r: 0 }]])(t);
    const aim = pulse(t, 0.14, PK.coil, PK.c1, PK.h1), tr = Math.sin(52 * t) * pulse(t, PK.coil - 0.04, PK.coil + 0.02, PK.c1 - 0.02, PK.c1);
    const jab = Math.max(pulse(t, PK.c1, PK.h1, PK.h1 + HOLD, PK.c2), pulse(t, PK.c2, PK.h2, PK.h2 + HOLD, PK.c3), pulse(t, PK.c3, PK.h3, PK.out, PK.out + 0.1));
    const wind = Math.max(aim, pulse(t, PK.h1 + HOLD, PK.c2, PK.c2, PK.h2), pulse(t, PK.h2 + HOLD, PK.c3, PK.c3, PK.h3));
    const fl = pulse(t, PK.tall - 0.04, PK.tall, PK.tall + 0.22, PK.tall + 0.3), flick = Math.sin(38 * (t - PK.tall)) * fl; // the bill flicked clean
    return addPose(body(k), wingsW(k), { n1y: PKY[0] * y.y, n2y: PKY[1] * y.y, hy: PKY[2] * y.y, hr: y.r + 0.03 * tr + 0.16 * flick, n3y: 0.012 * tr + 0.03 * flick, by: PKY[3] * y.y, br: -0.3 * y.r + 0.008 * tr },
      jaw(0.04 + 0.1 * wind * (1 - jab) + 0.5 * pulse(t, PK.out, PK.out + 0.1, PK.tall + 0.1, PK.tall + 0.3)), crest(0.2 + 0.8 * wind - 0.35 * jab + 0.6 * pulse(t, PK.out, PK.tall, PK.tall + 0.2, PK.end), 0.1 * flick),
      tail(0.25 * wind + 0.7 * jab, 0.1 * y.y / 0.16 + 0.12 * flick), plumes(-0.06 * wind + 0.22 * jab + 0.2 * pulse(t, PK.out, PK.tall, PK.tall + 0.15, PK.end), 0.2 * y.y / 0.16));
  },
  feet: (t, B) => {
    // the left foot holds; the right slides back half a step as the neck coils, and steps in under the third jab
    const back = off('R', 0, 0, -0.05), fwd = off('R', 0, 0, PK_STEP);
    const R = steps(t, REST.R, [[0.1, 0.3, back, 0.04, 0.5], [PK.h2 + 0.01, PK.h3 - 0.012, fwd, 0.05, 0.7], [PK.tall - 0.02, PK.tall + 0.22, REST.R, 0.05, 0.6]]);
    const L = plant(REST.L, 0.35 * pulse(t, PK.c3, PK.h3, PK.out, PK.tall));
    return { L, R };
  },
};

// ------------------------------------------------------------------------------------------------ Submerge and Surface
// Kesh's ask, 13 Nov: it flies up and dives down flying; surfacing, it does not rise slowly: it bursts up into the air, a little way,
// never at ground level, and then lands softly.
// Submerge: crouch with the wings thrown up (0.1 s), one downbeat takes it off the floor, it rises 1.5 u and hangs, tips its bill at
// the water, and stoops: wings swept back, bill, neck, body and trailed legs one line 76 degrees down, at about 16 u/s. The bill goes
// in first and the toes last. It waits under the floor (the game keeps it there while its adds fight; here 0.4 s).
// Surface: nothing shows for most of the 48-tick ring but the ripple. In its last 0.22 s the bill breaks the water and the bird
// comes up head first at about 12 u/s (his second note: the first build came out in 2.5 frames and "blinked"); the wings fling
// wide as the shoulders clear, on the ring's last tick: the hit. Wings wide (3 frames), on up on one downbeat until its feet are
// 1.9 u clear of the floor, and a slow descent on braking beats, legs reaching, one foot down and then the other, the knees taking it.
const HIP = J('hips'); const TH = 76 * D2R, LINE = { along: 0.628, off: 0.174 }; // hips to bill tip when the bird is one straight line: along it, and off to its back side
const AP = { oy: 0.5, oz: -0.1 };
const lineK = (s, o = {}) => K({ oy: AP.oy - s * Math.sin(TH), oz: AP.oz + s * Math.cos(TH), bp: -TH, cp: 0, a0: 90 + TH / D2R, a1: 90 + TH / D2R, a2: 90 + TH / D2R, a3: 90 + TH / D2R, ah: TH / D2R, ...o });
const S_IN = (HIP.y - 0.014 + AP.oy - LINE.along * Math.sin(TH) + LINE.off * Math.cos(TH)) / Math.sin(TH); // how far down the line the hips are when the bill meets the water
const S_GONE = (HIP.y - 0.014 + AP.oy + 0.66) / Math.sin(TH); // and when the trailed toes are under
const FL = { crouch: 0.1, off: 0.16, apex: 0.4, stoop: 0.44 }; FL.in = FL.stoop + 0.09; FL.gone = FL.in + 0.22; FL.un = FL.gone + 0.06;
const SB = { s0: FL.un + 0.4 }; SB.rise = SB.s0 + 48 / 60 - STRIKE; SB.hit = SB.s0 + 48 / 60; SB.held = SB.hit + HOLD; SB.up = SB.hit - 0.22; SB.apex = SB.hit + 0.34; SB.touch = SB.hit + 1.2; SB.end = SB.touch + 0.5;
export const DIVE_AT = HIP.z + AP.oz + S_IN * Math.cos(TH) + LINE.along * Math.cos(TH) + LINE.off * Math.sin(TH); // where the bill goes in, ahead of its feet
const UPK = { a0: 0, a1: -2, a2: 2, a3: 4, ah: -76 }; // the neck straight up and the bill at the sky
const submerge = {
  dur: SB.end, sinks: true, contact: [FL.in, SB.hit], kinds: ['dive', 'surface'], cues: { ring: [SB.s0, SB.hit], feet: [FL.gone - 0.03], off: [FL.off], up: [SB.up], land: [SB.touch], at: [DIVE_AT * CFG.unit] },
  phases: [['crouch', 0], ['takes off', FL.off], ['hangs', FL.apex - 0.05], ['dives', FL.stoop], ['under', FL.gone], ['ring', SB.s0], ['bursts out', SB.up], ['wings wide', SB.hit], ['in the air', SB.held], ['lands', SB.touch - 0.3], ['settle', SB.touch + 0.05]],
  pose: (t) => {
    const k = track([[0, K({})],
      [FL.crouch, K({ oy: -0.075, oz: -0.012, bp: 0.07, cp: 0.03, a0: NR[0] - 12, a1: NR[1] - 16, a2: NR[2] + 4, a3: NR[3] + 10, ah: NR[4] + 8, o: 0.9, li: 58, sw: 18, tw: 8 })],
      [FL.off + 0.03, K({ oy: 0.07, oz: -0.03, bp: 0.22, cp: 0.05, a0: 4, a1: -30, a2: -14, a3: 10, ah: 0, o: 1, li: -24, sw: 10, tw: -6 })],
      [FL.off + 0.13, K({ oy: 0.33, oz: -0.07, bp: 0.2, cp: 0.04, a0: 2, a1: -40, a2: -24, a3: 6, ah: 6, o: 1, li: 44, sw: 16, tw: 6 })],
      [FL.apex, K({ oy: AP.oy, oz: AP.oz, bp: -0.3, cp: -0.05, a0: -14, a1: -62, a2: 6, a3: 62, ah: 52, o: 1, li: 54, sw: 24, tw: 4 })],
      [FL.stoop, K({ oy: AP.oy - 0.01, oz: AP.oz + 0.005, bp: -0.9, cp: -0.08, a0: 50, a1: 20, a2: 90, a3: 140, ah: 72, o: 0.8, li: 40, sw: 40, tw: 14 })],
      [FL.in, lineK(S_IN + 0.03, { o: 0.4, li: 16, sw: 58, tw: 30 })],
      [FL.in + 0.06, lineK(S_IN + 0.38, { o: 0.12, li: 8, sw: 62, tw: 44 })],
      [FL.gone, lineK(S_GONE)],
      [FL.un, lineK(S_GONE + 0.3)],
      [SB.s0, K({ oy: -1.5, oz: 0.2, bp: 1.25, cp: 0.1, ...UPK })],
      [SB.up - 0.05, K({ oy: -1.5, oz: 0.2, bp: 1.25, cp: 0.1, ...UPK })],
      [SB.up, K({ oy: -1.05, oz: 0.2, bp: 1.25, cp: 0.1, ...UPK, o: 0.04, li: 10, sw: 60, tw: 46 })], // the bill breaks the water (Kesh, 13 Nov: slower here, it "blinked" out)
      [SB.up + 0.12, K({ oy: -0.6, oz: 0.2, bp: 1.22, cp: 0.1, ...UPK, ah: -72, o: 0.08, li: 12, sw: 58, tw: 44 })], // head and neck out, the wings still shut
      [SB.hit, K({ oy: -0.1, oz: 0.2, bp: 1.12, cp: 0.1, a0: -2, a1: -8, a2: 0, a3: 8, ah: -60, o: 0.95, li: 28, sw: 6, tw: 0 })], // the shoulders clear and the wings fling wide: the hit
      [SB.held, K({ oy: 0.09, oz: 0.2, bp: 1.0, cp: 0.1, a0: -6, a1: -20, a2: -6, a3: 12, ah: -40, o: 1, li: 46, sw: 0, tw: -6 })],
      [SB.hit + 0.18, K({ oy: 0.42, oz: 0.19, bp: 0.85, cp: 0.09, a0: -8, a1: -32, a2: -14, a3: 14, ah: -22, o: 1, li: -14, sw: 4, tw: -4 })], // a downbeat carries it on up
      [SB.apex, K({ oy: 0.62, oz: 0.17, bp: 0.7, cp: 0.08, a0: -8, a1: -40, a2: -20, a3: 14, ah: -6, o: 1, li: 40, sw: 4, tw: -4 })],
      [SB.hit + 0.52, K({ oy: 0.6, oz: 0.14, bp: 0.55, cp: 0.06, a0: -4, a1: -46, a2: -28, a3: 6, ah: 6, o: 1, li: -10, sw: -2, tw: -18 })],
      [SB.hit + 0.7, K({ oy: 0.48, oz: 0.1, bp: 0.46, cp: 0.06, a0: -2, a1: -47, a2: -30, a3: 3, ah: 8, o: 1, li: 46, sw: -5, tw: -24 })],
      [SB.hit + 0.88, K({ oy: 0.3, oz: 0.055, bp: 0.4, cp: 0.06, a0: 0, a1: -48, a2: -32, a3: 0, ah: 10, o: 1, li: -6, sw: -8, tw: -28 })],
      [SB.hit + 1.05, K({ oy: 0.11, oz: 0.02, bp: 0.34, cp: 0.05, a0: 2, a1: -49, a2: -34, a3: -2, ah: 11, o: 1, li: 44, sw: -9, tw: -32 })],
      [SB.touch, K({ oy: 0.02, oz: 0.0, bp: 0.3, cp: 0.05, a0: 4, a1: -50, a2: -36, a3: -4, ah: 12, o: 1, li: 6, sw: -10, tw: -34 })],
      [SB.touch + 0.13, K({ oy: -0.045, bp: 0.12, cp: 0.03, a0: NR[0] + 4, a1: NR[1] + 6, a2: NR[2], a3: NR[3], ah: NR[4] + 6, o: 0.9, li: 12, sw: 10, tw: -4 })],
      [SB.touch + 0.3, K({ oy: -0.012, bp: 0.03, a0: NR[0] + 2, a1: NR[1] + 2, o: 0.35, li: 2, sw: 48, tw: 36 })],
      [SB.end, K({})]])(t);
    const up = pulse(t, FL.crouch, FL.off + 0.05, FL.apex, FL.stoop), dive = pulse(t, FL.stoop, FL.in, FL.un, SB.s0), out = pulse(t, SB.up + 0.1, SB.hit, SB.apex, SB.apex + 0.3), air = pulse(t, SB.held, SB.apex, SB.touch - 0.1, SB.touch + 0.1);
    const sh = Math.sin(44 * t) * pulse(t, SB.touch + 0.14, SB.touch + 0.22, SB.end - 0.12, SB.end - 0.02);
    return addPose(body(k), wingsW(k), { wLt: 0.08 * sh, wRt: -0.08 * sh, br: 0.025 * sh, hr: 0.07 * sh },
      jaw(0.05 + 0.25 * pulse(t, FL.apex - 0.06, FL.apex, FL.stoop, FL.in) + 0.7 * out), crest(0.2 + 0.6 * up - 0.35 * dive + 0.8 * out + 0.3 * air + 0.4 * Math.abs(sh), 0),
      tail(0.85 * up + 0.95 * dive + 0.3 * out + 0.35 * air, 0.3 * sh), plumes(-0.12 * up - 0.25 * dive + 0.3 * out + 0.1 * air, 0.1 * sh));
  },
  feet: (t, B) => {
    const F = {};
    for (const k of LEGS) {
      const sx = k === 'L' ? -0.032 : 0.032, lag = k === 'R' ? 0.012 : 0, root = B.legRoot(k);
      // the toes push off; in the air the legs trail a little behind and below, toes hanging
      if (t < FL.off + lag) { F[k] = plant(REST[k], 0.9 * smooth((t - FL.crouch) / (FL.off - FL.crouch))); continue; }
      const trail = B.loc(k, [sx * 0.4, -0.46, -0.1]);
      if (t < FL.stoop) { const o = smooth((t - FL.off - lag) / 0.13); F[k] = { p: swingTo(root, REST[k], trail, o, 0.12), pitch: lerp(0.9, 1.1, o) }; continue; }
      // the stoop: each leg swings up straight, like a clock hand about its hip, until it lies along the body behind the tail with the
      // toes pointed and the feet together
      if (t < SB.s0) {
        const o = smooth((t - FL.stoop) / 0.1), d0 = trail.clone().sub(root), l0 = Math.min(d0.length(), 0.52); d0.normalize();
        const d1 = B.loc(k, [sx, -0.14, -1]).sub(root).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(d0, d1); const dir = d0.clone().applyQuaternion(new THREE.Quaternion().slerp(q, o));
        let phi = Math.atan2(-dir.z, -dir.y); if (phi < -0.5) phi += 2 * Math.PI; // how far the leg has swung from straight down, toward the back and on up
        F[k] = { p: root.clone().add(dir.multiplyScalar(lerp(l0, 0.62, smooth(o * 1.6)))), pitch: lerp(1.1, 1.25 + phi, smooth(o * 2.5)), yaw: 0, under: true, pole: dir.clone().normalize().cross(B.loc(k, [1, 0, 0]).sub(root)).normalize() }; continue; } // the knee keeps to the same side of the leg all the way round
      // the burst and the air: the legs hang straight below it, toes pointed; then they reach for the floor, the left a step ahead of the right
      const hang = root.clone().add(V3(k === 'L' ? 0.012 : -0.012, -0.5, 0.02)), td = SB.touch + (k === 'R' ? 0.05 : 0);
      if (t < td) { const d = smooth((t - (td - 0.36)) / 0.36); F[k] = { p: hang.lerp(REST[k], d), pitch: lerp(1.15, 0.45, smooth((t - SB.apex) / 0.3)) * (1 - d * d), yaw: 0, under: t < SB.held, pole: V3(0, 0, 1).lerp(B.loc(k, [0, 0, 1]).sub(root), d).normalize() }; continue; } // the knee points forward whatever the body does (a body reared upright would flip it)
      F[k] = plant(REST[k]);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ hurt, heavy hit
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => { const f = pulse(t, 0, 0.05, 0.13, 0.42), g = pulse(t, 0.12, 0.2, 0.26, 0.42);
    return addPose(neck([NR[0] - 12 * f + 4 * g, NR[1] - 16 * f + 5 * g, NR[2] + 4 * f, NR[3] + 14 * f - 3 * g, NR[4] - 12 * f + 4 * g]), { hy: 0.22 * f, hr: 0.2 * f - 0.05 * g, n2y: 0.08 * f },
      jaw(0.55 * pulse(t, 0, 0.04, 0.12, 0.3)), crest(0.9 * pulse(t, 0, 0.04, 0.2, 0.42), 0), tail(0.25 * f, 0.15 * f), plumes(-0.2 * f + 0.1 * g, 0.1 * f)); },
  feet: allPlanted,
};
// It is thrown back 0.3 u: the neck whips, the wings fly open to catch its balance, two long steps back, a shake, and it squares up.
const HB = -0.1;
const heavyHit = {
  dur: 1.1, contact: [0], kinds: ['taken'], travel: (t) => HB * EASE.out(clamp(t / 0.34)), phases: [['hit', 0], ['stagger', 0.07], ['catch', 0.4], ['square up', 0.72]],
  pose: (t) => {
    const k = track([[0, K({})],
      [0.07, K({ oy: -0.03, oz: -0.05, bp: 0.34, cp: 0.12, a0: -34, a1: -74, a2: -26, a3: 4, ah: -14, o: 0.5, li: 26, sw: 24, tw: -10 }), 'out'],
      [0.26, K({ oy: -0.055, oz: -0.02, bp: 0.2, cp: 0.06, a0: -16, a1: -60, a2: -34, a3: -2, ah: 6, o: 0.85, li: 14, sw: 10, tw: -16 })],
      [0.48, K({ oy: -0.045, oz: 0.01, bp: -0.12, cp: -0.04, a0: 22, a1: -34, a2: -30, a3: 0, ah: 30, o: 0.7, li: -8, sw: 22, tw: 8 })],
      [0.74, K({ oy: -0.012, bp: 0.03, a0: NR[0] - 4, a1: NR[1] - 4, ah: NR[4] - 2, o: 0.22, li: 0, sw: 52, tw: 40 })],
      [1.1, K({})]])(t);
    const sh = Math.sin(42 * t) * pulse(t, 0.62, 0.7, 0.9, 1.02), f = pulse(t, 0, 0.06, 0.3, 0.6);
    return addPose(body(k), wingsW(k), { br: 0.12 * f - 0.03 * sh, by: -0.14 * f, hy: -0.3 * f + 0.06 * sh, hr: -0.2 * f + 0.1 * sh, n2y: -0.1 * f, wLt: 0.08 * sh, wRt: -0.08 * sh },
      jaw(0.6 * pulse(t, 0, 0.05, 0.2, 0.5)), crest(0.9 * f + 0.3 * Math.abs(sh), 0), tail(0.3 * f, 0.3 * f + 0.3 * sh), plumes(-0.3 * f, 0.15 * sh));
  },
  feet: (t) => ({ R: steps(t, REST.R, [[0.03, 0.2, off('R', -0.01, 0, -0.14), 0.04, 0.45], [0.5, 0.7, off('R', 0, 0, HB), 0.04, 0.5]]), L: steps(t, REST.L, [[0.2, 0.42, off('L', 0, 0, HB), 0.08, 0.8]]) }),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: it grows from the floor in 7 frames and stands. On top: it comes up tall out of a crouch, shakes the water off
// with its wings half open, and clacks its bill twice.
const SW = { grow: 7 / 60, c1: 1.08, c2: 1.26 };
const spawn = {
  dur: 1.6, contact: [SW.c1, SW.c2], kinds: ['clack', 'clack'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SW.grow))), phases: [['grow', 0], ['rise', SW.grow], ['shake', 0.46], ['clack', 1.0], ['stand', 1.34]],
  pose: (t) => {
    const low = K({ oy: -0.14, bp: -0.1, a0: NR[0] - 16, a1: NR[1] - 22, a2: NR[2] + 4, a3: NR[3] + 26, ah: NR[4] + 10 });
    const k = track([[0, low], [SW.grow, low],
      [0.42, K({ oy: 0.012, bp: 0.06, cp: 0.03, a0: NR[0] + 6, a1: NR[1] + 22, a2: NR[2] + 18, a3: NR[3] + 4, ah: NR[4] - 6, o: 0.34, li: 8, sw: 44, tw: 30 })],
      [0.8, K({ oy: -0.004, bp: 0.02, a0: NR[0] + 2, a1: NR[1] + 8, a2: NR[2] + 6, a3: NR[3], ah: NR[4], o: 0.3, li: 6, sw: 46, tw: 32 })],
      [1.0, K({ oy: 0.0, bp: 0.04, a0: NR[0] - 4, a1: NR[1] - 2, a2: NR[2] + 6, a3: NR[3] + 10, ah: NR[4] - 26, o: 0.08 })],
      [1.34, K({ oy: 0.0, bp: 0.03, a0: NR[0] - 4, a1: NR[1] - 2, a2: NR[2] + 6, a3: NR[3] + 10, ah: NR[4] - 24, o: 0.02 })],
      [1.6, K({})]])(t);
    const sh = pulse(t, 0.44, 0.52, 0.76, 0.88), w = 44 * (t - 0.44), cl = (c) => 0.7 * pulse(t, c - 0.1, c - 0.02, c - 0.02, c) * (t < c - 0.02 ? 1 : 1 - EASE.in3(clamp((t - (c - 0.02)) / 0.02)));
    return addPose(body(k), wingsW(k, 1.2), { wLt: 0.14 * Math.sin(w) * sh, wRt: -0.14 * Math.sin(w) * sh, wLl: 0.1 * Math.sin(w + 1) * sh, wRl: -0.1 * Math.sin(w + 1) * sh,
      br: 0.06 * Math.sin(w - 0.6) * sh, cr: 0.05 * Math.sin(w - 1.2) * sh, hr: 0.2 * Math.sin(w - 2.2) * sh, hy: 0.1 * Math.sin(w - 2.8) * sh, n3r: 0.06 * Math.sin(w - 1.8) * sh },
      jaw(0.05 + cl(SW.c1) + cl(SW.c2)), crest(0.5 * pulse(t, 0, 0.1, 0.4, 0.6) + 0.5 * sh + 0.6 * pulse(t, 0.95, 1.05, 1.3, 1.5), 0), tail(0.2 * sh, 0.4 * Math.sin(w - 3) * sh), plumes(0.05 * sh, 0.2 * Math.sin(w - 1.5) * sh));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// The feet unlock. The neck flings up and the bill opens on a cry that does not come; one leg gives, then the other, and the body
// comes down on its breast with the wings falling open across the floor; the neck sways, folds, and the bill lies down last.
const DT = { cry: 0.34, drop: 1.05, wings: 1.5, neck: 1.95 };
const death = {
  dur: 2.6, contact: [DT.drop, DT.neck], kinds: ['thud', 'thud'], phases: [['hit', 0], ['cry', 0.08], ['legs give', DT.cry], ['down', DT.drop], ['neck falls', DT.wings], ['still', DT.neck + 0.1]],
  pose: (t) => {
    const k = track([[0, K({})],
      [0.08, K({ oy: -0.02, oz: -0.03, bp: 0.24, cp: 0.1, a0: -30, a1: -70, a2: -20, a3: 10, ah: -30, o: 0.3, li: 20, sw: 40, tw: 10 }), 'out'],
      [DT.cry, K({ oy: 0.01, oz: -0.02, bp: 0.2, cp: 0.12, a0: -6, a1: -10, a2: -4, a3: 4, ah: -58, o: 0.45, li: 16, sw: 34, tw: 6 })],
      [0.62, K({ oy: -0.1, oz: 0.0, bp: 0.0, cp: 0.04, a0: 6, a1: -24, a2: -16, a3: 0, ah: -20, o: 0.5, li: 10, sw: 30, tw: 4 })],
      [0.9, K({ oy: -0.24, oz: 0.03, bp: -0.2, cp: -0.02, a0: 16, a1: -30, a2: -24, a3: -4, ah: 6, o: 0.62, li: 6, sw: 26, tw: 0 })],
      [DT.drop, K({ oy: DY, oz: 0.05, bp: DP, cp: -0.04, a0: 34, a1: -10, a2: -20, a3: -6, ah: 20, o: 0.75, li: -4, sw: 24, tw: 0 }), 'in'],
      [DT.drop + 0.12, K({ oy: DY + 0.012, oz: 0.05, bp: DP + 0.03, cp: -0.03, a0: 26, a1: -22, a2: -24, a3: -6, ah: 14, o: 0.82, li: -10, sw: 22, tw: 0 })],
      [DT.wings, K({ oy: DY, oz: 0.05, bp: DP, cp: -0.04, a0: 40, a1: 6, a2: -6, a3: 10, ah: 30, o: 0.9, li: DW, sw: 20, tw: 0 })],
      [DT.neck, K({ oy: DY, oz: 0.05, bp: DP, cp: -0.04, a0: 95, a1: 99, a2: 94, a3: 90, ah: 40, o: 0.92, li: DW, sw: 20, tw: 0 }), 'in'],
      [DT.neck + 0.14, K({ oy: DY, oz: 0.05, bp: DP, cp: -0.04, a0: 91, a1: 96, a2: 93, a3: 89, ah: 36, o: 0.92, li: DW, sw: 20, tw: 0 })],
      [2.6, K({ oy: DY, oz: 0.05, bp: DP, cp: -0.04, a0: 95, a1: 99, a2: 94, a3: 90, ah: 41, o: 0.92, li: DW, sw: 20, tw: 0 })]])(t);
    const f = pulse(t, 0, 0.06, 0.3, 0.7), lie = smooth((t - DT.wings) / (DT.neck - DT.wings));
    return addPose(body(k), wingsW(k, 1.1), { br: 0.1 * f + 0.1 * pulse(t, 0.5, 0.8, 0.9, DT.drop), by: -0.06 * f, hr: 0.9 * lie, hy: 0.25 * lie, n4r: 0.3 * lie, n3r: 0.1 * lie },
      jaw(0.75 * pulse(t, 0.04, 0.2, 0.5, 0.9) + 0.22 * lie), crest(0.45 * pulse(t, 0, 0.08, 0.6, 1.2), 0), tail(0.2 * f - 0.3 * smooth((t - 0.9) / 0.3), 0), plumes(-0.1 * f, 0), { q1p: 2.45 * smooth((t - 0.6) / 0.25), q2p: 0.1 * smooth((t - 0.6) / 0.25) });
  },
  feet: (t, B) => {
    const g = smooth((t - DT.cry) / (DT.drop - DT.cry)); const F = {};
    const out = { L: off('L', 0.05, 0.012, 0.17), R: off('R', -0.07, 0.012, 0.1) };
    for (const k of LEGS) { const gg = k === 'R' ? smooth(g * 1.5) : smooth((g - 0.25) / 0.75); const p = REST[k].clone().lerp(out[k], gg); p.y += 0.02 * Math.sin(Math.PI * gg);
      F[k] = { p, pitch: 0.15 * gg, lock: t < DT.cry, ca: DCA, cw: gg }; }
    return F;
  },
};
const DY = -0.377, DP = -0.5, DW = -14, DCA = -1.3;

// The tail hangs a long way below the hips, so whenever the hips come down it swings up behind to lie on the floor, not through it.
const TAIL = { len: 0.33, b0: Math.atan2(0.27, 0.15), dy: -0.03, dz: -0.10 };
function tailGuard(p) {
  const th = -(p.bp || 0); const baseY = 0.5 + (p.oy || 0) + CFG.base.oy + TAIL.dy * Math.cos(th) - TAIL.dz * Math.sin(th);
  const need = TAIL.b0 - th - Math.asin(clamp((baseY - 0.05) / TAIL.len, -1, 1)); const have = -(p.t1p || 0);
  if (need > have) { p.t1p = -need; p.t2p = Math.min(0, p.t2p || 0) * (1 - clamp((need - have) / 0.5)); }
  return p;
}
const guarded = (c) => (c.upperOnly || c.sinks ? c : { ...c, pose: (t) => tailGuard(c.pose(t)) });
export const CLIPS_RAW = { idle, walk, turnL: turn(1), turnR: turn(-1), spear, peck, wingbeat, submerge, hurt, heavyHit, spawn, death };
export const CLIPS = Object.fromEntries(Object.entries(CLIPS_RAW).map(([k, c]) => [k, guarded(c)]));
