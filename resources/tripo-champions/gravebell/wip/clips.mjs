// The Gravebell Ringer's moves. Units are model units (the model is 1 tall to the staff's top; the page draws it 2.8 u tall, CFG.unit).
// Timings come from the game: GR in src/sim/enemies/champions.js (walk 0.95 u/s, keeps 2.6 to 4.6 u off; Death Knell: a
// 78-tick ring of r 3.6 round himself, the toll hits for 11 and slows by 45 percent for 2.5 s; Grave Call: a 64-tick ring
// of r 1.8 under a hero up to 8 u off, it bursts for 14 and leaves ash that slows by 30 percent for 5 s), CHAMPION_RULES
// in src/sim/champions.js (a 96-tick entrance, rage below half health: cooldowns x0.7, speed x1.15) and the beats in
// render/facet/beats.js (a frame is 1/30 s: strike 2.5 frames, contact held 3 frames, spawn grow 7 frames).
// The Tripo model is a tall hooded ringer who carries a short staff over his left shoulder with both hands, a cracked
// bell hanging from its top behind him. The rig cuts the staff free of the shoulder and the bell free of its rope
// (wip/rig.py): the staff goes where a move sends it with both fists closed on it, and the bell hangs and swings.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, frac } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
export const CFG = {
  name: 'gravebell', unit: 2.8,
  // the stance he carries everywhere: the model already stoops under the hood; the knees a little soft
  base: { oy: -0.006, hp: -0.02, cp: -0.02 },
  chain: [['hips', 'h'], ['spine', 's'], ['chest', 'c'], ['head', 'n']],
  // the staff comes before the arms: both fists are closed on it (grips), so the arms follow wherever it goes
  extras: [['staff', 'st'], ['bell', 'bl'], ['upperarmL', 'ul'], ['forearmL', 'fl'], ['handL', 'wl'], ['upperarmR', 'ur'], ['forearmR', 'fr'], ['handR', 'wr'], ['skF', 'kf'], ['skF2', 'kg'], ['skB', 'kb'], ['skB2', 'kc']],
  arms: { A: { b: ['upperarmL', 'forearmL', 'handL'], pole: [0.39, -0.79, -0.47] }, B: { b: ['upperarmR', 'forearmR', 'handR'], pole: [-0.55, -0.67, -0.5] } },
  grips: { A: { on: 'staff' }, B: { on: 'staff' } },
  hang: [['bell', 1]],                                         // the bell hangs straight down whatever the staff does; blp and blr swing it; stiff 1 lays it down with the staff
  legs: { L: { kind: 'biped', b: ['thighL', 'shinL', 'footL'] }, R: { kind: 'biped', b: ['thighR', 'shinR', 'footR'] } },
  springs: [{ bone: 'skF', k: 110, c: 7, max: 0.4 }, { bone: 'skB', k: 100, c: 6.5, max: 0.4 }, { bone: 'skF2', k: 80, c: 5.5, max: 0.6 }, { bone: 'skB2', k: 70, c: 5, max: 0.7 }, { bone: 'bell', k: 30, c: 1.6, max: 0.8 }],
};
const REST = { L: V3(0.0775, 0, 0.09), R: V3(-0.0775, 0, 0.09) };
const LEGS = ['L', 'R'];
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const allPlanted = () => ({ L: plant(REST.L), R: plant(REST.R) });
const HEEL = 0.13;                                            // from the back of the heel to the toes
const Xa = V3(1, 0, 0), Ya = V3(0, 1, 0), Za = V3(0, 0, 1);
const _e = new THREE.Euler();
const pyr = (q) => { _e.setFromQuaternion(q, 'YXZ'); return [-_e.x, _e.y, _e.z]; };
// the robe: front and back strips from the belt (front, back) and the two halves of the robe below the knee (f2, b2); positive swings the hem outwards
const cloth = (front = 0, back = 0, f2 = front, b2 = back) => ({ kfp: front * 0.4, kbp: -back * 0.4, kgp: f2, kcp: -b2 });
// a foot that is planted, swings to the next spot, is planted again: seq [[lift, land, to, height, droop]]
// (while the toes are up in a swing the foot is lifted so the heel stays off the floor)
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.45); if (s.pitch < 0) s.p.y += HEEL * Math.sin(-s.pitch); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
// a bell that swings on after a jolt: a damped pendulum from time t0
const pend = (t, t0, amp, f = 6.5, d = 1.5) => (t < t0 ? 0 : amp * Math.exp(-d * (t - t0)) * Math.sin(f * (t - t0)));

// ---- the staff. Tripo welded the fists, the staff, the hair and the robe into one shell, with no arms inside the sleeves.
// So the fists stay where he carries them and the staff only rocks on his shoulder: a key says how far its top tips
// forward, to his left and how far it twists (a, radians, against his chest) and how far the fists shift (o: left, up,
// forward, in the chest's own frame, a few centimetres at most). The body and the swinging bell carry the moves.
export const GRIP = V3(0.0125, 0.651, 0.0906), TOP = V3(0.105, 0.988, -0.124), BUTT = V3(-0.026, 0.533, 0.146), PIVOT = V3(0.118, 0.886, -0.139);
const D0 = TOP.clone().sub(GRIP).normalize(); const S0 = (() => { const o = PIVOT.clone().sub(GRIP); return o.addScaledVector(D0, -o.dot(D0)).normalize(); })();
const PV = V3(0.031, 0.09, -0.044);                           // where the staff rocks: just under where it lies on his shoulder, from the staff's joint
const qPYR = (p = 0, y = 0, r = 0) => new THREE.Quaternion().setFromAxisAngle(Ya, y).multiply(new THREE.Quaternion().setFromAxisAngle(Xa, -p)).multiply(new THREE.Quaternion().setFromAxisAngle(Za, r));
const chestQ = (k) => { const c = addPose(CFG.base, k); return qPYR(c.hp, c.hy, c.hr).multiply(qPYR(c.sp, c.sy, c.sr)).multiply(qPYR(c.cp, c.cy, c.cr)); };
const SK = (t, o = {}, ease) => ({ t, w: o.w ?? (o.a ? 1 : 0), a: o.a || [0, 0, 0], o: o.o || [0, 0, 0], ease });
function staffTrack(keys) {
  return (t) => {
    let i = 0; while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1]; let u = clamp((t - a.t) / Math.max(1e-6, b.t - a.t)); u = b.ease ? EASE[b.ease](u) : smooth(u);
    return { w: lerp(a.w, b.w, u), o: V3(...a.o).lerp(V3(...b.o), u), a: a.a.map((x, n) => lerp(x, b.a[n], u)) };
  };
}
const carry = (...keys) => staffTrack(keys.map(([t, o, e]) => SK(t, o, e)));
// the bell's shackle slides round the staff's top so the bell always hangs clear on the staff's underside (or on the side a
// move names), as a bell on a rope would; on the shoulder it is where Tripo put it
const SIDE = PIVOT.clone().sub(GRIP).addScaledVector(D0, -PIVOT.clone().sub(GRIP).dot(D0)).length();
function slide(qa, w, side) {
  const d = D0.clone().applyQuaternion(qa), cur = S0.clone().applyQuaternion(qa); const u = (side ? V3(...side) : V3(0, -1, 0)); u.addScaledVector(d, -u.dot(d)); const L = u.length();
  if (L < 1e-3) return {}; u.normalize(); const k = SIDE * w * (side ? 1 : smooth((L - 0.1) / 0.3)); const o = u.sub(cur).multiplyScalar(k);
  return { blT: 1, blTa: 0, blTx: o.x, blTy: o.y, blTz: o.z };
}
// the staff's channels for a body pose k and a staff state s
function hold(k, s, side) {
  const qc = chestQ(k); const r = qPYR(-s.a[0], s.a[2], -s.a[1]); const [p, y, rr] = pyr(r);
  const o = PV.clone().sub(PV.clone().applyQuaternion(r)).add(s.o).applyQuaternion(qc);
  return { stp: p, sty: y, str: rr, stT: 1, stTa: 0, stTx: o.x, stTy: o.y, stTz: o.z, ...slide(qc.clone().multiply(r), s.w, side) };
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. A ringer waiting by a grave: slow breath, the weight eased from foot to foot, the hood turns left and right, and
// once a loop he hitches the staff higher on his shoulder and the bell swings and tolls softly behind him.
const idle = {
  dur: 6, loop: true, contact: [4.3], kinds: ['toll'],
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const lookL = pulse(t, 0.4, 1.1, 1.7, 2.4), lookR = pulse(t, 2.5, 3.2, 3.6, 4.1);
    const hitch = track([[0, { a: 0 }], [3.85, { a: 0 }], [4.2, { a: 1 }], [4.3, { a: 0.2 }, 'in'], [4.7, { a: 0 }], [6, { a: 0 }]])(t).a;
    const ring = pend(t, 4.3, 0.2, 6.2, 1.5) * (1 - smooth((t - 5.2) / 0.8));
    return addPose(
      { oy: 0.003 * br + 0.006 * hitch, cp: 0.016 * br - 0.03 * hitch, sp: -0.005 * br, ox: 0.008 * sw, hr: 0.01 * sw, sr: -0.007 * sw, cr: -0.03 * hitch, cy: 0.03 * lookL - 0.03 * lookR },
      { np: -0.008 * br + 0.05 * hitch, ny: 0.3 * lookL - 0.3 * lookR, nr: 0.03 * lookL - 0.03 * lookR },
      { blr: 0.04 + 0.02 * sw + ring, blp: -0.04 - 0.012 * br - 0.5 * ring },
      cloth(0.012 * br, 0.012 * br),
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// 0.95 u/s, 1.1 s a cycle (two steps). A slow procession step: the staff rides his shoulder, the hood stays on the hero,
// the robe swings with each leg and the bell rocks behind him. The feet point straight ahead (Kesh's rule for humanoids).
const WT = 1.1;
const GAIT = { T: WT, duty: 0.62, v: 0.95 / CFG.unit };
const GF = { L: { phase: 0, n: [0.068, 0.09], lift: 0.032, droop: 0.4, push: 0.28 }, R: { phase: 0.5, n: [-0.068, 0.09], lift: 0.032, droop: 0.4, push: 0.28 } };
const low = (x) => Math.pow(0.5 + 0.5 * x, 1.7);
// a foot that pushes off rolls over the ball of the foot, which is round: the toe point rides up a hair so the toes stay on the floor
const roll = (f) => { if (f.lock && f.pitch > 0) f.p.y += 0.015 * Math.sin(f.pitch); return f; };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT, a = w - 2 * Math.PI * 0.31;                 // a = 0 when the left foot carries him
    const up = low(Math.cos(2 * a));
    return addPose(
      { oy: -0.02 + 0.01 * up, ox: 0.008 * Math.cos(a), hr: 0.02 * Math.cos(a), hy: 0.05 * Math.sin(a), hp: -0.05 },
      { sy: -0.025 * Math.sin(a), sr: -0.012 * Math.cos(a), cy: -0.035 * Math.sin(a), cr: -0.01 * Math.cos(a), cp: -0.03, np: 0.04 - 0.012 * Math.cos(2 * a), ny: 0.01 * Math.sin(a) },
      { blr: 0.05 + 0.07 * Math.cos(a - 1.0), blp: -0.06 + 0.05 * Math.cos(2 * a - 1.2) },
      cloth(0.1 + 0.05 * Math.cos(2 * a + 1.0), 0.12 + 0.05 * Math.cos(2 * a + 2.0), 0.14 + 0.1 * Math.cos(2 * a + 0.4), 0.2 + 0.1 * Math.cos(2 * a + 1.6)),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, roll(gaitFoot(t, GAIT, GF[k]))])),
};
const turn = (dir) => {
  const TT = 0.9; const g = { T: TT, duty: 0.64, v: 0, omega: dir * 2 * Math.PI / 3.6, pivot: [0, 0] };
  const gf = { L: { ...GF.L, n: [0.074, 0.09], lift: 0.024 }, R: { ...GF.R, n: [-0.074, 0.09], lift: 0.024 } };
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT, a = w - 2 * Math.PI * 0.32;
      return addPose({ oy: -0.012 + 0.006 * low(Math.cos(2 * a)), ox: 0.006 * Math.cos(a), hr: 0.012 * Math.cos(a) },
        { sy: 0.03 * dir, cy: 0.05 * dir, ny: 0.26 * dir, nr: 0.03 * dir }, { blr: 0.05 - 0.1 * dir + 0.03 * Math.cos(a), blp: -0.05 },
        cloth(0.04, 0.05)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, roll(gaitFoot(t, g, gf[k]))])),
  };
};

// ------------------------------------------------------------------------------------------------ Death Knell
// lifts the staff off his shoulder, winds up (he arches back and the staff tips far back over the shoulder, the bell
// hanging behind him), tolls (2.5 frames, landing on the ring's tick: he bows hard and whips the staff forward over the
// shoulder, the bell flung out before him), contact held (3 frames), the bell swings (it rocks under the staff's end as
// he straightens), shoulders the staff again.
const KN = 78 / 60;
const DK = { lift: 0.32, high: 0.8, wind: KN - STRIKE, hit: KN, held: KN + HOLD, rise: KN + HOLD + 0.38, end: KN + HOLD + 0.85 };
const deathKnell = {
  dur: DK.end, springGain: { bell: 0 }, contact: [DK.hit], kinds: ['toll'], cues: { ring: [0, DK.hit] },
  phases: [['lifts the staff', 0], ['winds up', DK.lift], ['tolls', DK.wind], ['contact held', DK.hit], ['the bell swings', DK.held], ['shoulders the staff', DK.rise]],
  pose: (t) => {
    const BACK = { oy: 0.001, oz: -0.012, hp: 0.12, sp: 0.08, cp: 0.1, np: 0.14 }, BOW = { oy: -0.05, oz: 0.035, hp: -0.32, sp: -0.2, cp: -0.2, np: 0.22 };
    const k = track([[0, {}], [DK.lift, { oy: -0.012, hp: -0.06, cp: -0.05, np: -0.06 }], [DK.high, BACK], [DK.wind, { ...BACK, oy: 0.002, hp: 0.15, cp: 0.13, np: 0.18 }], [DK.hit, BOW, 'in'], [DK.held, { ...BOW, oy: -0.054, hp: -0.33 }],
      [DK.rise, { oy: -0.02, hp: -0.1, sp: -0.06, cp: -0.06, np: 0.04 }], [DK.end, {}]])(t);
    const s = carry([0], [DK.lift, { a: [-0.06, 0.04, 0], o: [0, 0.012, 0] }], [DK.high, { a: [-0.3, 0.06, 0], o: [0, 0.02, -0.005] }], [DK.wind, { a: [-0.36, 0.06, 0], o: [0, 0.024, -0.008] }],
      [DK.hit, { a: [0.45, 0.14, 0], o: [0, -0.012, 0.015] }, 'in'], [DK.held, { a: [0.47, 0.14, 0], o: [0, -0.014, 0.016] }], [DK.rise, { a: [0.16, 0.06, 0], o: [0, 0.004, 0.006] }], [DK.end - 0.02])(t);
    const sw = track([[0, { a: 0 }], [DK.lift, { a: -0.06 }], [DK.high, { a: 0.1 }], [DK.wind, { a: -0.08 }], [DK.hit, { a: 1.1 }, 'in'], [DK.held, { a: 0.95 }]])(Math.min(t, DK.held)).a;
    const ring = t <= DK.held ? sw : 0.95 * Math.exp(-2.4 * (t - DK.held)) * (0.5 + 0.5 * Math.cos(7.5 * (t - DK.held))) * (1 - smooth((t - DK.rise) / 0.4));
    return addPose(k, hold(k, s), { blp: ring - 0.04 * (1 - s.w), blr: 0.04 + 0.12 * s.w }, cloth(0.25 * bump(t, DK.hit + 0.08, 0.3), 0.3 * bump(t, DK.hit + 0.1, 0.34) - 0.1 * bump(t, DK.high, 0.5)));
  },
  feet: (t) => ({ R: plant(REST.R), L: steps(t, REST.L, [[DK.wind - 0.1, DK.hit, off('L', 0, 0, 0.11), 0.03, 0.3], [DK.rise - 0.1, DK.rise + 0.2, REST.L, 0.025, 0.3]]) }),
};

// ------------------------------------------------------------------------------------------------ Grave Call
// lifts the staff (it comes up off his shoulder), draws himself up (he twists away to his right, the hood on the hero, the staff trembling), calls (2.5 frames, landing on the ring's
// tick: he whips round to his left and drops his weight, the bell flung out sideways off his shoulder), contact held (3 frames), the
// bell rocks, shoulders the staff again.
const GCT = 64 / 60;
const GC = { out: 0.3, wind: GCT - STRIKE, hit: GCT, held: GCT + HOLD, rock: GCT + HOLD + 0.32, end: GCT + HOLD + 0.8 };
export const CALL = { far: 5.0, r: 1.8 };                    // where the page's hero stands (u) and the ring under them
const graveCall = {
  dur: GC.end, springGain: { bell: 0 }, contact: [GC.hit], kinds: ['call'], cues: { ring: [0, GC.hit] },
  phases: [['lifts the staff', 0], ['draws himself up', GC.out], ['calls', GC.wind], ['contact held', GC.hit], ['the bell rocks', GC.held], ['shoulders the staff', GC.rock]],
  pose: (t) => {
    const tw = (a) => ({ hy: 0.3 * a, sy: 0.3 * a, cy: 0.4 * a, ny: -a });       // a twist of the trunk; the hood stays on the hero
    const UPK = { oy: 0.01, hp: 0.08, sp: 0.04, cp: 0.08, np: 0.24, ...tw(-0.34) }, DOWN = { oy: -0.066, oz: 0.012, hp: -0.2, sp: -0.1, cp: -0.13, np: -0.06, ...tw(0.3) };
    const k = track([[0, {}], [GC.out, { oy: -0.012, hp: -0.07, cp: -0.06, np: -0.1, ...tw(-0.1) }], [GC.wind, UPK], [GC.hit, DOWN, 'in'], [GC.held, { ...DOWN, oy: -0.069 }], [GC.rock, { oy: -0.018, hp: -0.04, np: 0.06, ...tw(0.08) }], [GC.end, {}]])(t);
    const tr = pulse(t, GC.out, GC.out + 0.2, GC.wind - 0.02, GC.wind), ws = 52 * t;
    const s = carry([0], [GC.out, { a: [0.2, 0.1, 0], o: [0, 0.012, 0.006] }], [GC.wind, { a: [0.3, 0.12, 0], o: [0, 0.035, 0.008] }], [GC.hit, { a: [0.36, 0.12, 0], o: [0, -0.022, 0.012] }, 'in'],
      [GC.held, { a: [0.36, 0.12, 0], o: [0, -0.024, 0.012] }], [GC.rock, { a: [0.14, 0.05, 0], o: [0, 0, 0.005] }], [GC.end - 0.02])(t);
    s.a[1] += 0.02 * Math.sin(ws) * tr;
    const jump = track([[0, { a: 0 }], [GC.out, { a: 0.1 }], [GC.wind, { a: 0.04 }], [GC.hit, { a: 0.85 }, 'in'], [GC.held, { a: 0.7 }]])(Math.min(t, GC.held)).a;
    const rock = t <= GC.held ? jump : 0.7 * Math.exp(-2.6 * (t - GC.held)) * (0.5 + 0.5 * Math.cos(8 * (t - GC.held))) * (1 - smooth((t - GC.rock) / 0.4));
    return addPose(k, hold(k, s), { blp: -0.04 - 0.35 * rock, blr: 0.04 + rock + 0.06 * Math.sin(ws + 0.5) * tr }, cloth(0.14 * bump(t, GC.hit + 0.08, 0.3), 0.16 * bump(t, GC.hit + 0.1, 0.34)));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ Rage (a call: the game shows only the eyes and a sound)
// gather (he hunches over the staff), roar (2.5 frames: he rears up, the hood thrown back, the staff upright beside his
// head), shakes it (the bell clangs from side to side over his left shoulder), then stamps and shoulders the staff.
const RG = { gather: 0.34, roar: 0.34 + STRIKE, hold: 1.08, stamp: 1.26, end: 1.6 };
const rage = {
  dur: RG.end, springGain: { bell: 0 }, contact: [RG.roar, RG.stamp], kinds: ['roar', 'stamp'], phases: [['gather', 0], ['roar', RG.gather], ['shakes the bell', RG.roar], ['stamps, shoulders the staff', RG.hold]],
  pose: (t) => {
    const IN = { oy: -0.035, hp: -0.16, sp: -0.1, cp: -0.12, np: -0.16 }, OUT = { oy: 0.006, hp: 0.08, sp: 0.06, cp: 0.1, np: 0.3 };
    const k = track([[0, {}], [RG.gather, IN], [RG.roar, OUT, 'out3'], [RG.hold, { ...OUT, np: 0.26 }], [RG.stamp, { oy: -0.03, hp: -0.08, np: -0.02 }, 'in'], [RG.end, {}]])(t);
    const sh = pulse(t, RG.roar, RG.roar + 0.06, RG.hold - 0.12, RG.hold), ws = 44 * t;
    const s = carry([0], [RG.gather, { a: [-0.05, 0.02, 0], o: [0, -0.006, 0] }], [RG.roar, { a: [0.28, 0.12, 0], o: [0, 0.03, 0.006] }, 'out3'], [RG.hold, { a: [0.28, 0.12, 0], o: [0, 0.028, 0.006] }],
      [RG.stamp, { a: [0.06, 0.03, 0], o: [0, -0.004, 0] }, 'in'], [RG.end - 0.02])(t);
    s.a[1] += 0.1 * Math.sin(ws) * sh;
    return addPose(k, hold(k, s), { blr: 0.04 + (0.3 + 0.36 * Math.sin(ws - 1.2)) * sh, blp: -0.04 - 0.2 * sh - Math.abs(pend(t, RG.stamp, 0.3, 7, 3)) },
      { nr: 0.05 * Math.sin(ws) * sh, ny: 0.04 * Math.sin(ws + 1.3) * sh, cr: 0.02 * Math.sin(ws - 0.7) * sh, sr: 0.012 * Math.sin(ws - 1.4) * sh },
      cloth(0.25 * bump(t, RG.roar + 0.08, 0.3), 0.25 * bump(t, RG.roar + 0.1, 0.34)));
  },
  feet: (t) => ({ L: plant(REST.L), R: steps(t, REST.R, [[RG.hold, RG.stamp, REST.R, 0.06, 0.15]]) }),
};
// The enraged state, played on top of anything (spine, chest, head, arms, staff and bell only): hunched and trembling, the bell shivering.
const RT = 0.4;
const rageHold = {
  dur: RT, loop: true, upperOnly: true,
  pose: (t) => { const b = Math.sin(2 * Math.PI * t / RT), c = Math.sin(4 * Math.PI * t / RT);
    return addPose({ sp: -0.05, cp: -0.08 + 0.014 * b, np: -0.06 - 0.014 * b, nr: 0.02 * c, cr: 0.008 * c }, { blr: 0.04 + 0.05 * c, blp: -0.05 + 0.03 * b }); },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything. Only the spine, chest, head, arms and staff move, so planted feet stay planted. The bell swings.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { sp: 0.05, cp: 0.11, cy: 0.08, np: 0.14, ny: 0.24, nr: 0.12 }, 'out'], [0.18, { cp: -0.04, ny: -0.05, nr: -0.03 }], [0.42, {}]])(t),
    { blp: -0.04 - 0.3 * bump(t, 0.1, 0.2) + 0.1 * bump(t, 0.27, 0.22), blr: 0.04 + 0.12 * bump(t, 0.12, 0.2) }),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers him: thrown back two steps, the hood snapped back, the staff jolted up off his shoulder and the
// bell thrown out behind; he catches himself, the staff drops back on the shoulder with a clank and he squares up.
const HB = -0.09;
const heavyHit = {
  dur: 1.15, springGain: { bell: 0 }, contact: [0, 0.34, 0.62], kinds: ['taken', 'step', 'toll'], travel: (t) => HB * EASE.out(clamp(t / 0.34)), phases: [['hit', 0], ['stagger', 0.07], ['catches himself', 0.46], ['square up', 0.78]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.018, oy: -0.01, hp: 0.18, sp: 0.07, cp: 0.11, cy: -0.1, np: 0.2, ny: -0.26, nr: -0.14 }, 'out'],
      [0.28, { oz: -0.005, oy: -0.045, hp: 0.04, cp: -0.03, cy: -0.04, np: -0.1, ny: -0.1, nr: 0.1 }],
      [0.48, { oy: -0.045, hp: -0.12, cp: -0.06, np: -0.12, nr: 0.12 }], [0.62, { oy: -0.034, hp: -0.08, np: -0.02, nr: -0.03 }], [0.8, { oy: -0.014, hp: -0.02, np: 0.02 }], [1.15, {}]])(t);
    const s = carry([0], [0.1, { a: [0.22, 0.08, 0], o: [0, 0.028, 0] }, 'out'], [0.36, { a: [0.14, 0.05, 0], o: [0, 0.016, 0] }], [0.62, { w: 0 }, 'in'], [1.15])(t);
    return addPose(k, hold(k, s), { blp: -0.04 - 0.55 * bump(t, 0.12, 0.3) - Math.abs(pend(t, 0.62, 0.3, 7, 3)) * (1 - smooth((t - 0.95) / 0.2)), blr: 0.04 + 0.25 * bump(t, 0.16, 0.36) },
      cloth(0.3 * bump(t, 0.12, 0.3), -0.1 * bump(t, 0.12, 0.3)));
  },
  feet: (t) => ({ R: steps(t, REST.R, [[0.03, 0.18, off('R', 0, 0, HB), 0.035, 0.4]]), L: steps(t, REST.L, [[0.17, 0.34, off('L', 0, 0, HB), 0.035, 0.4]]) }),
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: he comes up bowed over the staff, held
// upright against his chest, as out of a grave; straightens, lifts the hood to the party, and lets the staff fall back
// onto his shoulder: the bell lands behind him and tolls.
const SP = { grow: SPAWN, toll: 1.0 + STRIKE };
const spawn = {
  dur: 1.6, springGain: { bell: 0 }, contact: [SP.toll], kinds: ['toll'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['straightens', SP.grow], ['looks up', 0.6], ['shoulders the staff', 0.84], ['stand', SP.toll + HOLD]],
  pose: (t) => {
    const LOW = { oy: -0.07, hp: -0.3, sp: -0.16, cp: -0.16, np: -0.2 };
    const k = track([[0, LOW], [SP.grow, LOW], [0.62, { oy: -0.012, hp: -0.05, sp: -0.03, cp: -0.03, np: -0.1 }], [0.84, { np: 0.14 }], [SP.toll, { oy: -0.008, cp: -0.03, np: 0.06 }, 'in'], [1.6, {}]])(t);
    const s = carry([0, { a: [0.3, 0.1, 0], o: [0, 0.01, 0.006] }], [SP.grow, { a: [0.3, 0.1, 0], o: [0, 0.01, 0.006] }], [0.62, { a: [0.24, 0.1, 0], o: [0, 0.016, 0.004] }], [0.84, { a: [0.16, 0.06, 0], o: [0, 0.02, 0] }], [SP.toll, { w: 0 }, 'in'], [1.6])(t);
    return addPose(k, hold(k, s), { blp: -0.04 - 0.1 * s.w - Math.abs(pend(t, SP.toll, 0.3, 6.5, 2.4)) * (1 - smooth((t - 1.4) / 0.2)), blr: 0.04 + 0.08 * s.w }, cloth(0.1 * bump(t, 0.5, 0.5), 0.15 * bump(t, 0.5, 0.5)));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// His feet unlock. A jolt, the bell clangs; he sags, both knees give and come down, and he bows over until the hood hangs
// on his chest, the staff still on his shoulder. The bell tolls on, slower and smaller each swing, and hangs still. The eyes go out.
const D = { sag: 0.45, knees: 1.0, fold: 1.65, end: 2.8 };
const KNL = { back: -0.36, up: 0.03, hips: -0.241 };         // where the toes go and how far the hips come down, on both knees
const death = {
  dur: D.end, robe: false, springGain: { bell: 0 }, contact: [0, D.knees, D.fold], kinds: ['toll', 'thud', 'toll'], phases: [['jolt', 0], ['sags', 0.12], ['the knees give', D.sag], ['kneels', D.knees], ['bows over', D.knees + 0.1], ['the bell stills', D.fold]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.1, { hp: 0.14, cp: 0.1, oy: -0.008, oz: -0.02, np: 0.24, ny: -0.2, nr: -0.1 }, 'out'],
      [D.sag, { hp: -0.05, cp: -0.06, oy: -0.045, oz: 0.0, np: -0.16, ny: -0.06 }],
      [D.knees, { hp: -0.06, sp: -0.04, cp: -0.06, oy: KNL.hips, oz: 0.03, np: -0.1 }, 'in'],
      [D.knees + 0.12, { hp: -0.1, sp: -0.05, cp: -0.08, oy: KNL.hips + 0.008, oz: 0.03, np: -0.2 }, 'out'],
      [D.fold, { hp: -0.36, sp: -0.2, cp: -0.22, oy: KNL.hips - 0.006, oz: 0.02, np: -0.5, nr: 0.08 }, 'in'],
      [D.fold + 0.14, { hp: -0.33, sp: -0.2, cp: -0.22, oy: KNL.hips - 0.004, oz: 0.02, np: -0.55, nr: 0.1 }, 'out'],
      [D.end, { hp: -0.35, sp: -0.21, cp: -0.23, oy: KNL.hips - 0.006, oz: 0.02, np: -0.57, nr: 0.1 }]])(t);
    const s = carry([0], [0.1, { a: [0.12, 0.06, 0], o: [0, 0.02, 0] }, 'out'], [D.sag, { a: [0.04, 0.03, 0], o: [0, 0.004, 0] }], [D.knees, { a: [0.14, 0.08, 0], o: [0, 0.012, 0] }, 'in'],
      [D.fold, { a: [0.2, 0.12, 0], o: [0, 0, 0.006] }, 'in'], [D.end, { a: [0.22, 0.12, 0], o: [0, 0, 0.006] }])(t);
    const tk = Math.max(0, t - D.knees), tf = Math.max(0, t - D.fold);
    const sw = -0.45 * bump(t, 0.12, 0.3) + (t < D.knees ? 0 : 0.5 * Math.exp(-1.5 * tk) * Math.sin(7 * tk - 1.1 * tk * tk)) * (1 - smooth(tf / 1.0));
    // the robe: the strips from the belt stay upright as the hips fold, and each half below the knee lays itself out on the floor as the knee joint comes down
    // (until the knees go, the halves slide up under the upper robe as in every other move)
    const kn = smooth((t - D.sag) / (D.knees - D.sag)), hpw = k.hp + CFG.base.hp, oyw = (k.oy || 0) + CFG.base.oy, sn = Math.sin(-hpw);
    const up = (c) => (Math.max(0, -oyw + c * sn) + 0.003) * (1 - kn); const kh = 0.29 + oyw, th = Math.acos(clamp((kh + up(0) - 0.008 - 0.008 * kn - 0.03 * Math.sin(Math.PI * kn)) / 0.27));
    return addPose(k, hold(k, s), { blp: -0.04 * (1 - s.w) + sw, blr: 0.04 + 0.1 * s.w }, { kfp: -hpw, kbp: -hpw, kgp: th, kcp: -0.97 * th, kgb: up(0.05) + 0.007 * kn, kcb: up(-0.06) + 0.11 * Math.max(0, -sn) * (1 - kn) + 0.006 * bump(t, 0.3, 0.4) + 0.014 * kn + 0.012 * smooth((t - D.knees) / 0.4) });
  },
  feet: (t) => {
    const kn = smooth((t - D.sag) / (D.knees - D.sag)); const F = {};
    for (const k of LEGS) { const sx = k === 'L' ? 1 : -1; const p = REST[k].clone(); p.z += KNL.back * kn; p.x += sx * 0.012 * kn; p.y += KNL.up * kn + 0.02 * Math.sin(Math.PI * kn); F[k] = { p, pitch: 2.5 * kn, lock: t < D.sag, under: t >= D.sag }; }   // under: the knee itself rests on the floor, so the solver must not lift it
    return F;
  },
};

// Tripo set his feet toes-out (the left about 12 degrees, the right about 10). Every clip turns each foot in so the toes
// point straight ahead (Kesh's rule for humanoids: no splayed walk), and a planted foot keeps its heading when the hips turn.
const TOE = { L: -0.218, R: 0.173 };
const straight = (c) => (c.feet ? { ...c, feet: (t, B) => { const F = c.feet(t, B); for (const k of LEGS) F[k] = { ...F[k], yaw: (F[k].yaw ?? 0) + TOE[k] }; return F; } } : c);
// The robe is two stiff halves below the knee. When the hips come down or tip, each half slides up under the upper robe
// by as much (a robe bunches; it does not go through the floor), and the two strips from the belt stay hanging straight.
// A move that lays the robe out itself (the death) sets robe: false.
const robed = (c) => (c.robe === false ? c : { ...c, pose: (t) => { const p = c.pose(t); const hp = (p.hp || 0) + (CFG.base.hp || 0), oy = (p.oy || 0) + (CFG.base.oy || 0), sn = Math.sin(-hp);
  const env = smooth(Math.max(0, -oy) / 0.012), hem = c.hem || [0.004, 0.016];      // a little more while the hips are down: the torn hem swings
  return addPose(p, { kfp: -hp, kbp: -hp, kgb: Math.max(0, -oy + 0.05 * sn) + 0.003 + hem[0] * env, kcb: Math.max(0, -oy - 0.06 * sn) + 0.003 + hem[1] * env + 0.07 * Math.max(0, -sn) }); } });
export const CLIPS = Object.fromEntries(Object.entries({ idle, walk, turnL: turn(1), turnR: turn(-1), deathKnell, graveCall, rage, rageHold, hurt, heavyHit, spawn, death }).map(([n, c]) => [n, robed(straight(c))]));
