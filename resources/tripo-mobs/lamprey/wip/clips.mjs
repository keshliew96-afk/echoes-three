// The Bog Lamprey's moves. Units are model units (the page draws it CFG.unit times bigger).
// Timings come from the game: src/sim/enemies/lamprey.js (lurks submerged, untargetable, gliding 1.6 u/s to 3.0 u of its
// target; at 2.0 to 4.6 u it breaks the surface and marks an Ember lane 0.9 wide and up to 5.0 long for 48 ticks, then
// lunges down it at 10 u/s, biting each hero it crosses for 12; the lunge beaches it for 110 ticks, hittable, before it
// slides back under) and its rig src/render/enemies/facet/lamprey.js (sinks 0.45 u under with only a ripple showing;
// the S-wave runs down the body as fast as it travels; the lunge on the foe strike timeline with the game's key poses
// C1, S1, O1, the contact held while it shoots down the lane with a fast tail beat; beached: rolled onto its side 1.1 rad,
// thrashing in arcs, the head lifting to gasp, the disc gaping; breath 0.008 at 1.9 rad/s).
// Kesh's model rears its head on a tall neck where the game's eel lies low; the rest pose is his.
import { smooth, clamp, addPose } from '../kit/quad.mjs';
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'lamprey', unit: 1.4, base: {}, floor: false,
  chain: [['hips', 'b']],
  extras: [['body', 'q'], ['neck1', 'n1'], ['neck2', 'n2'], ['head', 'h'], ['disc', 'd'], ['tail1', 't1'], ['tail2', 't2'], ['tail3', 't3'], ['tail4', 't4']],
  scales: [['hips', ['hsx', 'hsy', 'hsz']], ['disc', ['dsx', 'dsy', 'dsz']]],
  legs: {},
  springs: [],
};
const U = CFG.unit, L = 1.4; // the body's length in u
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const none = () => ({});
// where each joint sits down the body, 0 at the disc's rim, 1 at the fin (the game's u)
const UJ = { disc: 0.03, head: 0.1, neck2: 0.18, neck1: 0.28, body: 0.38, hips: 0.47, tail1: 0.57, tail2: 0.67, tail3: 0.77, tail4: 0.85, end: 0.92 };
const SINK = 0.45; // u under the floor while it lurks

// The game's pose fields (facet/lamprey.js REST): push (u, head thrown forward), rear (u, head lifted), pitch (nose down
// +), coil (S-curve, + bends the first curve to its left), drawn (0..1 bunched back), stretch (1 at rest), gape (the disc),
// cock (head turned, + left). Its state on top: swim (the wave's phase), amp, thrash and flop (the beach), sink; and mine:
// lie (the neck laid flat along the floor, 1 while it lurks: this neck stands too tall to hide 0.45 u under).
const REST = Object.freeze({ push: 0, rear: 0, pitch: 0, coil: 0, drawn: 0, stretch: 1, gape: 0, cock: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
function eel(t, g, s = {}) {
  const swim = s.swim || 0, amp = s.amp ?? 0.03, flop = s.flop || 0, ft = s.ft ?? t, sink = s.sink || 0, lie = s.lie || 0;
  const breath = Math.sin(t * (s.wb || 1.9)), thrash = flop * Math.sin(ft * 9);
  // the lateral line (game units): the coil's S, the swim's wave, the beach's arc, the head's cock
  const X = (u) => g.coil * 0.16 * Math.sin(u * Math.PI * 1.6 + 0.3) * (1 - 0.3 * u) + amp * Math.sin(swim - u * 6 * 1.1) * (0.3 + u)
    + thrash * 0.32 * (u - 0.35) * (u - 0.35) * 2.4 + g.cock * 0.05 * Math.pow(0.42, u * 6) + (s.bend || 0) * (u - 0.47) * (u - 0.47) * 2;
  const yawF = (a, b) => Math.atan2(X(UJ[b]) - X(UJ[a]), (UJ[a] - UJ[b]) * L); // a bone pointing to the head
  const yawB = (a, b) => -Math.atan2(X(UJ[b]) - X(UJ[a]), (UJ[b] - UJ[a]) * L); // a bone pointing to the fin
  const hipsY = yawF('tail1', 'body'), bodyY = yawF('body', 'neck1'), n1Y = yawF('neck1', 'neck2'), n2Y = yawF('neck2', 'head'), hY = yawF('head', 'disc');
  const t1 = yawB('tail1', 'tail2'), t2 = yawB('tail2', 'tail3'), t3 = yawB('tail3', 'tail4'), t4 = yawB('tail4', 'end');
  const gasp = flop * Math.max(0, Math.sin(ft * 4));
  const rear = g.rear + 0.12 * gasp, push = g.push;
  const lieK = lie * (1 - 0.6 * gasp);
  const st = g.stretch * (1 - 0.18 * g.drawn);
  const roll = flop * (1.1 + 0.25 * Math.sin(ft * 7));
  const dg = 0.45 * Math.max(0, g.gape + flop * (0.3 + 0.3 * Math.sin(ft * 4)));
  return {
    oy: -SINK * sink / U + 0.05 * flop / U + 0.004 * breath / U, oz: (push * 0.5 - 0.08 * g.drawn) / U,
    by: hipsY, br: roll * (s.rollSide ?? 1),
    // the body bone; the neck's lean: thrust forward by push (low and leading), reared back by rear, laid flat by lie;
    // the upright neck takes the lateral line as a sideways lean
    qy: bodyY - hipsY, qp: 0.15 * push - 0.3 * rear,
    n1p: 2.4 * rear - 2.2 * push - 1.15 * lieK + 0.03 * breath, n1y: 0.5 * (n1Y - bodyY), n1r: -0.5 * (n1Y - bodyY),
    n2p: 1.2 * rear - 0.9 * push - 0.15 * lieK + 0.02 * breath, n2r: -(n2Y - n1Y) * 1.2,
    hp: -g.pitch - 1.2 * rear + 1.6 * push + 1.25 * lieK - 0.3 * gasp, hy: (hY - n2Y) + g.cock,
    dsx: dg, dsy: dg, dsz: 0,
    t1y: t1 - hipsY, t2y: t2 - t1, t3y: t3 - t2, t4y: t4 - t3, t1p: -0.02 * breath,
    hsz: st - 1, hsx: -0.25 * (st - 1), hsy: -0.25 * (st - 1),
  };
}

// ------------------------------------------------------------------------------------------------ surfaced (idle)
// The game's eel still on the surface only breathes (0.008 at 1.9 rad/s, the wave frozen). Mine on top, whole cycles over
// 6.61 s: a slow wave down the body, the head swaying to look each way, the disc breathing.
const P = 2 * TAU * 2 / (2 * 1.9), WB = 2 * TAU / P;
const idle = {
  dur: P, loop: true,
  pose: (t) => { const look = 0.35 * pulse(t, 0.8, 1.4, 2.2, 2.8) - 0.35 * pulse(t, 3.9, 4.5, 5.3, 5.9);
    return eel(t, K({ cock: look, gape: 0.12 + 0.12 * Math.sin(WB * t * 1.5) }), { swim: 3 * TAU / P * t, amp: 0.03, wb: WB }); },
  feet: none,
};
// ------------------------------------------------------------------------------------------------ swim and turns
// The game's glide speed with its wave run as fast as the travel (phase rate 9 x speed, 14.4 rad/s, rounded to whole
// cycles); amp 0.09 at full speed. The game glides submerged; here it swims on the surface so you can judge it.
const WS = Math.round(1.6 * 9 * P / TAU) * TAU / P;
const walk = { dur: P, loop: true, gait: { T: P, duty: 0, v: 1.6 / U }, pose: (t) => eel(t, REST, { swim: WS * t, amp: 0.09, wb: WB }), feet: none };
const turn = (dir) => ({
  dur: P, loop: true, gait: { T: P, duty: 0, v: 0, omega: dir * Math.PI, pivot: [0, 0] },
  pose: (t) => eel(t, K({ cock: 0.25 * dir }), { swim: 8 * TAU / P * t, amp: 0.06, wb: WB, bend: 0.5 * dir }),
  feet: none,
});

// ------------------------------------------------------------------------------------------------ the lunge
// The game's whole attack. It lurks under (only the ripple), breaks the surface as the 48-tick lane telegraph starts
// (8 frames) and coils to its left through it (C1); the lunge takes the last 2.5 frames and shoots it 5 u down the lane at
// 10 u/s, thrown out straight and stretched, the disc wide (S1), the tail beating; the hero 3 u ahead is bitten as it
// passes. It beaches: snaps back (O1), rolls onto its side and thrashes, gasping, for 110 ticks; then slides back under.
// Mine: a beat of lurking before and after, and it surfaces again at the end so the page can go back to the surface.
const C1 = K({ push: -0.08, rear: 0.1, pitch: -0.3, coil: 1, drawn: 1, stretch: 0.86, gape: 0.6, cock: -0.3 });
const S1 = K({ push: 0.22, rear: 0.02, pitch: 0.1, coil: -0.15, drawn: 0, stretch: 1.22, gape: 1, cock: 0.1 });
const O1 = K({ push: 0.12, rear: 0.04, pitch: 0, coil: -0.3, stretch: 1.06, gape: 0.4, cock: 0.12 });
export const LURK0 = 0.6, TEL = 48 / 60, LUNGE = 5 / 10, LANE = 5.0, HERO_AT = 3.0, BEACH = 110 / 60;
const STRIKE = 2.5 * FR, SNAP = 2.5 * FR, SETTLE = 9 * FR, RISE = 8 * FR;
export const BITE = LURK0 + TEL + LUNGE * HERO_AT / LANE, BEACH_AT = LURK0 + TEL + LUNGE, UNDER = BEACH_AT + BEACH, BACK = UNDER + 1.1;
const coilCurve = (k) => { const c = c01(k); return 0.85 * (1 - (1 - Math.min(1, c / 0.4)) ** 2) + 0.15 * c; };
const kick = (k) => { const c = c01(k); return 1 - (1 - c) ** 3; };
const settleC = (k) => { const c = c01(k); return smooth(c) - 0.12 * Math.sin(Math.PI * c) * (1 - c); };
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
const easeOut = (k) => 1 - (1 - c01(k)) ** 2;
const appr = (dt, rate) => (dt <= 0 ? 0 : 1 - Math.exp(-rate * dt));
function lungeState(t) {
  const a = t - LURK0, COIL = TEL - STRIKE; let g = { ...REST }, held = 0;
  if (a < 0) g = { ...REST };
  else if (a < COIL) g = mix(REST, C1, coilCurve(a / COIL));
  else if (a < TEL) g = mix(C1, S1, kick((a - COIL) / STRIKE));
  else if (a < TEL + LUNGE) { g = { ...S1 }; held = a - TEL; g.coil += 0.18 * Math.sin(held * 28); }
  else if (a < TEL + LUNGE + SNAP) g = mix(S1, O1, 1 - (1 - (a - TEL - LUNGE) / SNAP) ** 2);
  else g = mix(O1, REST, settleC((a - TEL - LUNGE - SNAP) / SETTLE));
  // sink: under until the rise, eased out over 8 frames; under again after the beach (the game's rate 9); back up at the end
  let sink = 1;
  if (t >= LURK0) sink = 1 - easeOut((t - LURK0) / RISE);
  if (t >= UNDER) sink = appr(t - UNDER, 9);
  if (t >= BACK) sink = 1 - easeOut((t - BACK) / 0.5);
  const flop = t < BEACH_AT ? 0 : t < UNDER ? appr(t - BEACH_AT, 8) : 1 - appr(t - UNDER, 8);
  const lie = Math.max(sink > 0.001 ? c01(sink * 1.4) : 0, 0);
  // the swim: the travel's beat in the lunge (speed 10 x 9 + 20), a slow drift under
  const sw = t < LURK0 + TEL ? 2 * t : 2 * (LURK0 + TEL) + 110 * Math.min(LUNGE, t - LURK0 - TEL) + 2 * Math.max(0, t - BEACH_AT);
  return { g, s: { swim: sw, amp: held > 0 ? 0.09 : 0.03, flop, ft: t - BEACH_AT, sink, lie, rollSide: -1, wb: WB } };
}
// the floor under the beached roll and the death (LOW, from the probe build: its lowest point per frame at oy 0)
const LOWT = 1 / 30;
const LOW = [-0.077,-0.077,-0.076,-0.076,-0.075,-0.074,-0.074,-0.073,-0.072,-0.072,-0.071,-0.070,-0.070,-0.069,-0.069,-0.068,-0.068,-0.067,-0.067,-0.061,-0.044,-0.021,-0.008,-0.006,-0.007,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.008,-0.009,-0.009,-0.009,-0.009,-0.009,-0.009,-0.009,-0.009,-0.001,-0.001,-0.003,-0.003,-0.003,-0.003,-0.003,-0.003,-0.003,-0.003,-0.004,-0.004,-0.004,-0.004,-0.004,-0.004,-0.004,-0.005,-0.031,-0.056,-0.071,-0.078,-0.081,-0.081,-0.081,-0.081,-0.082,-0.083,-0.084,-0.085,-0.086,-0.086,-0.086,-0.085,-0.084,-0.083,-0.083,-0.082,-0.082,-0.082,-0.083,-0.084,-0.084,-0.084,-0.084,-0.084,-0.083,-0.082,-0.080,-0.080,-0.079,-0.079,-0.080,-0.081,-0.083,-0.084,-0.085,-0.086,-0.086,-0.086,-0.085,-0.084,-0.083,-0.082,-0.082,-0.082,-0.082,-0.083,-0.085,-0.086,-0.086,-0.086,-0.085,-0.085,-0.078,-0.067,-0.056,-0.045,-0.048,-0.054,-0.057,-0.061,-0.064,-0.066,-0.067,-0.068,-0.068,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.069,-0.070,-0.070,-0.071,-0.071,-0.071,-0.072,-0.072,-0.073,-0.074,-0.074,-0.075,-0.075,-0.076,-0.056,-0.046,-0.036,-0.025,-0.018,-0.010,-0.005,-0.001,0.001,0.001,0.001,0.001,0.001,0.001,0.001,0.001];
const LOWD = [0.000,-0.001,-0.002,-0.002,-0.002,-0.002,-0.002,-0.001,-0.001,-0.002,-0.010,-0.020,-0.032,-0.044,-0.055,-0.065,-0.073,-0.079,-0.083,-0.120,-0.175,-0.214,-0.221,-0.191,-0.149,-0.148,-0.149,-0.146,-0.136,-0.122,-0.103,-0.085,-0.086,-0.086,-0.086,-0.085,-0.085,-0.085,-0.085,-0.085,-0.084,-0.090,-0.099,-0.108,-0.116,-0.123,-0.129,-0.134,-0.137,-0.138,-0.138,-0.136,-0.132,-0.126,-0.120,-0.112,-0.103,-0.094,-0.085,-0.084,-0.084,-0.084,-0.084,-0.084,-0.084,-0.084,-0.085];
const lowOf = (A, t) => { if (!A.length) return 0; const f = clamp(t / LOWT, 0, A.length - 1); const i = Math.floor(f), j = Math.min(A.length - 1, i + 1); return A[i] + (A[j] - A[i]) * (f - i); };
const lowAt = (t) => lowOf(LOW, t);
const lungePose = (t, probe) => { const { g, s } = lungeState(t); const o = eel(t, g, s);
  if (probe) { o.oy = 0; return o; } o.oy = -SINK * s.sink / U + Math.max(0, -lowAt(t)) * (1 - s.sink); return o; }; // the floor, not the game's 0.05 flop lift
const lunge = {
  dur: BACK + 0.6, contact: [BITE, BEACH_AT],
  travel: process.env.NOTRAVEL ? undefined : (t) => LANE * c01((t - LURK0 - TEL) / LUNGE) / U,
  phases: [['lurks under: only the ripple', 0], ['breaks the surface: the Ember lane marks, 48 ticks; coils', LURK0], ['the lunge: 10 u/s, 12 to each hero crossed', LURK0 + TEL],
           ['beached 110 ticks: hittable, thrashing', BEACH_AT], ['slides back under', UNDER], ['surfaces (mine, for the page)', BACK]],
  pose: (t) => lungePose(t, false),
  feet: none,
};

// ------------------------------------------------------------------------------------------------ hurt
// Mine: the neck flinches back, the disc gapes, the tail whips. Plays on top of anything.
const hurt = {
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = c01(t / 0.05) * (1 - smooth((t - 0.05) / 0.35)), w = Math.sin(t * 30) * (1 - c01(t / 0.4));
    return eel(t, K({ rear: 0.08 * k, push: -0.06 * k, gape: 0.8 * k, cock: 0.15 * w }), { swim: 0, amp: 0.03 + 0.08 * Math.abs(w) }); },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's grow-in (7 frames, 10% over). Mine after it: it rears with the disc wide and settles.
const spawnScale = (a) => { const up = 5 * FR, T = 7 * FR; if (a >= T) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T - up)); };
const spawn = {
  dur: 1.3, contact: [], scale: spawnScale,
  phases: [['grows in', 0], ['rears, the disc wide', 0.3], ['settles', 0.8]],
  pose: (t) => { const r = pulse(t, 0.25, 0.5, 0.75, 1.15); return eel(t, K({ rear: 0.1 * r, pitch: -0.25 * r, gape: 0.9 * r }), { swim: 2 * t, amp: 0.04 }); },
  feet: none,
};

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it rears with the disc wide; the neck gives out and it rolls
// onto its side as the head drops to the floor, a last thrash runs down the tail, and it lies still, the disc slack.
const deathState = (t) => {
  const hit = pulse(t, 0, 0.06, 0.15, 0.4), go = smooth((t - 0.25) / 0.5), thr = pulse(t, 0.6, 0.75, 1.0, 1.4);
  return { g: K({ rear: 0.1 * hit, pitch: -0.3 * hit + 0.2 * go, gape: 1.0 * hit + 0.3 * go, coil: 0.3 * go }),
    s: { swim: 6 * t, amp: 0.03 + 0.12 * thr, lie: 0.85 * go, flop: 0, wb: WB, roll: go } };
};
const deathPose = (t, probe) => { const { g, s } = deathState(t); const o = eel(t, g, s); o.br = 1.15 * s.roll; o.oy = probe ? 0 : Math.max(0, -lowOf(LOWD, t)); return o; };
const death = {
  dur: 2.2, contact: [0.02, 0.75],
  phases: [['struck: rears, the disc wide', 0], ['the neck gives out, it rolls', 0.25], ['a last thrash', 0.6], ['lies still', 1.3]],
  pose: (t) => deathPose(t, false),
  feet: none,
};
const probe = { dur: lunge.dur, pose: (t) => lungePose(t, true), feet: none };
const probeD = { dur: 2.2, pose: (t) => deathPose(t, true), feet: none };
export const CLIPS = process.env.PROBE ? { probe, probeD } : { idle, walk, turnL: turn(1), turnR: turn(-1), lunge, hurt, spawn, death };
