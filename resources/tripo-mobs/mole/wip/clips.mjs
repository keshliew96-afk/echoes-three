// The Grave Mole's moves. Units are model units (the model is 1 long nose to tail; the page draws it CFG.unit = 1.4
// times bigger). Timings come from the game: src/sim/enemies/mole.js (it tunnels at 2.2 u/s under the floor, untargetable;
// within 0.3 u of its target, or after 180 ticks, it commits: an Ember ring r 0.8 at that spot for 60 ticks with the mole
// still under, then it bursts out for 11 in r 0.8 and stays surfaced, hittable, 120 ticks, then digs back in) and its
// rig src/render/enemies/facet/mole.js (UNDER, S1..O3: the left claw, the right claw, both claws off a leap, on the foe
// strike timeline: coil through the telegraph, strike 2.5 frames, hold 3, snap 3, settle 9, rest 0.3 s; the dig back in:
// nose 0.15 s, the claws rake in turn three strokes each 0.4 s, under 0.25 s, then tunnelling).
import * as THREE from 'three';
import fs from 'fs';
import { gaitFoot, V3, smooth, clamp, addPose } from '../kit/quad.mjs';
const SK = JSON.parse(fs.readFileSync(new URL('./rig/skel.json', import.meta.url)));
const END = Object.fromEntries(Object.entries(SK.ends).map(([k, v]) => [k, V3(...v)]));
const FR = 1 / 30, TAU = 2 * Math.PI;
export const CFG = {
  name: 'mole', unit: 1.4,
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['head', 'h']],
  extras: [['snout', 'n'], ['tail1', 't1'], ['tail2', 't2']],
  scales: [['spine', ['ssx', 'ssy', 'ssz']]],
  legs: {
    FL: { kind: 'limb', b: ['armL', 'foreL', 'pawL', 'clawL'], pole: [0, 0, 1] }, FR: { kind: 'limb', b: ['armR', 'foreR', 'pawR', 'clawR'], pole: [0, 0, 1] },
    HL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'], pole: [0, 0, 1] }, HR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'], pole: [0, 0, 1] },
  },
  springs: [{ bone: 'tail1', k: 260, c: 12, max: 0.6 }, { bone: 'tail2', k: 190, c: 9, max: 0.7 }],
};
const U = CFG.unit;
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const REST_T = { FL: END.clawL.clone(), FR: END.clawR.clone(), HL: END.toeL.clone(), HR: END.toeR.clone() };
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const plant = (p) => ({ p: p.clone(), lock: true });
export const SINK = 0.6;      // fully under (the page's floor hides it; only the mound shows)
export const TUNNEL = 0.42;   // tunnelling: the hump of its back and the grave candle ride along in the mound

// --- the game's pose fields (facet/mole.js): rise (0 under the floor, 1 stood on it, more is thrown up), push (u, +z),
// pitch (nose down +), roll, twist (+ to its left), sx / sy (squash), pawL / pawR (0..1 the claw raised and spread),
// snout (+ tips the nose up)
const REST = Object.freeze({ rise: 1, push: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, pawL: 0, pawR: 0, snout: 0 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// a paw raised and spread: up, out and forward from where it stands
const PAW_UP = { L: V3(0.03, 0.15, 0.06), R: V3(-0.03, 0.15, 0.06) };
function mole(g, o = {}) {
  const lift = g.rise <= 1 ? -(1 - g.rise) * (o.depth ?? SINK) : (g.rise - 1) * 0.6;
  return {
    oy: lift + (o.lift || 0), oz: g.push / U, by: 0.5 * g.twist + (o.yaw || 0), bp: -0.6 * g.pitch, br: g.roll,
    sp: -0.25 * g.pitch, sy: 0.3 * g.twist, cp: -0.15 * g.pitch, cy: 0.2 * g.twist, hp: 0.4 * g.snout + (o.nod || 0), hy: o.look || 0,
    np: 0.6 * g.snout + (o.sniff || 0), ny: o.wig || 0,
    t1p: -0.05 - (o.tail || 0) - 0.9 * Math.max(0, -g.pitch), t1y: o.tailY || 0, t2y: 0.6 * (o.tailY || 0),
    ssx: 0.5 * (g.sx - 1), ssy: 0.5 * (g.sy - 1), ssz: 0.5 * (g.sx - 1),
  };
}
// the feet: planted where they stand (lifted with the body when it is thrown up or sunk), the paws raised by pawL/pawR
// a raised paw's mark is kept within the arm's reach of its shoulder as the body pitches, twists and rises (else the
// claw would stretch out to it)
const SHOULDER = { L: V3(0.14, 0.2, 0.12), R: V3(-0.14, 0.2, 0.12) }, HIP_P = V3(0, 0.18, -0.12), ARM_LEN = 0.18;
const PAW0 = { L: V3(0.22, 0.045, 0.2), R: V3(-0.22, 0.045, 0.2) }, CLAW0 = { L: V3(0.23, 0.015, 0.27), R: V3(-0.23, 0.015, 0.27) };
function reachClamp(p, s, g, lift, o) {
  const bp = -0.6 * g.pitch, by = 0.5 * g.twist + (o.yaw || 0);
  const d = SHOULDER[s].clone().sub(HIP_P);
  const y1 = d.y * Math.cos(bp) + d.z * Math.sin(bp), z1 = d.z * Math.cos(bp) - d.y * Math.sin(bp);
  const x2 = d.x * Math.cos(by) + z1 * Math.sin(by), z2 = -d.x * Math.sin(by) + z1 * Math.cos(by);
  const sh = V3(x2, y1, z2).add(HIP_P).add(V3(0, lift + (o.lift || 0), g.push / U));
  // the two-bone arm reaches the paw joint: the claw's offset from the mark (curled, turned with the body) is fixed
  const paw = s === 'L' ? g.pawL : g.pawR, qy = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), by);
  const qc = new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), -0.9 * paw);
  const hv = END['claw' + s].clone().sub(CLAW0[s]).applyQuaternion(qc).applyQuaternion(qy);
  const c = PAW0[s].clone().sub(CLAW0[s]).applyQuaternion(qy);
  const Hk = p.clone().sub(hv).add(c), v = Hk.clone().sub(sh), L = v.length();
  if (L > ARM_LEN) p.copy(sh.add(v.multiplyScalar(ARM_LEN / L)).add(hv).sub(c));
}
function feetOf(g, o = {}, tz = 0) {
  const lift = g.rise <= 1 ? -(1 - g.rise) * (o.depth ?? SINK) : (g.rise - 1) * 0.6;
  const out = {};
  for (const k of LEGS) {
    const s = k[1], front = k[0] === 'F', paw = front ? (s === 'L' ? g.pawL : g.pawR) : 0;
    const p = REST_T[k].clone().add(V3(0, Math.min(0, lift) + Math.max(0, lift) * (front ? 0.6 : 0.85), tz + (front ? g.push / U : 0)));
    if (front) p.add(PAW_UP[s].clone().multiplyScalar(paw)).add(V3(0, 0, (o.rake?.[s] || 0)));
    const lock = lift === 0 && paw < 0.02 && !o.free;
    if (front && !lock) reachClamp(p, s, g, lift, o);
    out[k] = { p, lock, under: lift < -0.001, curl: (front ? -0.9 * paw : 0) };
  }
  return out;
}
const clip = (c) => ({ ...c, feet: c.feet || ((t, W) => feetOf(c.g ? c.g(t) : REST, c.fo ? c.fo(t) : {}, W.tz)) });

// ------------------------------------------------------------------------------------------------ idle (surfaced)
// The game's surfaced mole stands and blinks (its punish window). Mine on top: it breathes, the star nose wiggles and
// sniffs, the head turns to look, the tail twitches.
const IP = 4.0;
const idle = clip({
  dur: IP, loop: true,
  pose: (t) => { const br = Math.sin(TAU * t / 2.0), look = 0.25 * pulse(t, 0.4, 0.8, 1.4, 1.8) - 0.25 * pulse(t, 2.2, 2.6, 3.2, 3.6);
    return mole(REST, { lift: 0.003 * br, look, wig: 0.15 * Math.sin(TAU * t * 2), sniff: 0.12 * Math.max(0, Math.sin(TAU * t * 1.5)) * pulse(t, 1.9, 2.0, 2.4, 2.5), tailY: 0.15 * Math.sin(TAU * t / 2) }); },
});
// ------------------------------------------------------------------------------------------------ tunnel (its walk)
// The game's 2.2 u/s under the floor, untargetable. The claws swim through the earth in turn; the hump of its back and
// the grave candle ride along in the mound.
const TT = 0.5;
const TG = (t) => REST;
const tunnel = clip({
  dur: TT, loop: true, gait: { T: TT, duty: 0.5, v: 2.2 / U },
  pose: (t) => { const w = TAU * t / TT;
    return mole(K({ rise: 0, pitch: 0.08, roll: 0.06 * Math.sin(w) }), { depth: TUNNEL, wig: 0.1 * Math.sin(2 * w), tailY: 0.2 * Math.sin(w + 1) }); },
  feet: (t, W) => { const w = TAU * t / TT; const g = K({ rise: 0, pawL: 0.35 + 0.3 * Math.sin(w), pawR: 0.35 - 0.3 * Math.sin(w) });
    return feetOf(g, { depth: TUNNEL, free: true, rake: { L: 0.06 * Math.cos(w), R: -0.06 * Math.cos(w) } }, W.tz); },
});
// ------------------------------------------------------------------------------------------------ turns (surfaced)
// Mine (the game turns it at once): it shuffles round on the spot, the claws stepping.
const turn = (dir) => {
  const g = { T: 0.25, duty: 0.6, v: 0, omega: dir * Math.PI * 0.5, pivot: [0, 0.08] };
  const gf = { FL: { phase: 0, n: [REST_T.FL.x, REST_T.FL.z], lift: 0.03, droop: 0.5 }, HR: { phase: 0.05, n: [REST_T.HR.x, REST_T.HR.z], lift: 0.03, droop: 0.5 },
               FR: { phase: 0.5, n: [REST_T.FR.x, REST_T.FR.z], lift: 0.04, droop: 0.5 }, HL: { phase: 0.55, n: [REST_T.HL.x, REST_T.HL.z], lift: 0.03, droop: 0.5 } };
  return { dur: 0.5, loop: true, gait: g,
    pose: (t) => { const w = TAU * t / 0.25; return mole(K({ twist: 0.1 * dir, roll: 0.03 * Math.sin(w) }), { look: 0.2 * dir, tailY: -0.3 * dir }); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])) };
};

// ------------------------------------------------------------------------------------------------ the emergences
// The game's three bursts in turn: under the floor through the 60-tick ring (the mound heaves and quakes), the burst in
// the last 2.5 frames (11 to every hero in the ring), held 3 frames, it lands on its feet and settles, surfaced; then it
// digs back in (nose down, the claws raking in turn, under) and tunnels.
const UNDER = K({ rise: 0, pitch: -0.3, sx: 0.9, sy: 1.1, pawL: 0.6, pawR: 0.6, snout: 0.5 });
const S1 = K({ rise: 1.12, push: 0.08, pitch: -0.2, roll: -0.08, twist: -0.3, sx: 1.19, sy: 0.91, pawL: 1, pawR: 0.2, snout: 0.45 });
const O1 = K({ rise: 1.05, push: 0.05, pitch: -0.1, twist: -0.22, sx: 1.05, sy: 0.97, pawL: 0.6, pawR: 0.1, snout: 0.25 });
const S2 = K({ rise: 1.12, push: 0.08, pitch: -0.2, roll: 0.08, twist: 0.3, sx: 1.19, sy: 0.91, pawL: 0.2, pawR: 1, snout: 0.45 });
const O2 = K({ rise: 1.05, push: 0.05, pitch: -0.1, twist: 0.22, sx: 1.05, sy: 0.97, pawL: 0.1, pawR: 0.6, snout: 0.25 });
const S3 = K({ rise: 1.2, push: 0.1, pitch: -0.3, sx: 1.12, sy: 0.96, pawL: 1, pawR: 1, snout: 0.6 });
const O3 = K({ rise: 1.06, push: 0.06, pitch: -0.14, sx: 1.04, sy: 0.98, pawL: 0.5, pawR: 0.5, snout: 0.3 });
const BURSTS = [{ strike: S1, over: O1 }, { strike: S2, over: O2 }, { strike: S3, over: O3 }];
export const TEL = 60 / 60;
const STRIKE = 2.5 * FR, HOLD = 3 * FR, SNAP = 3 * FR, SETTLE = 9 * FR, RESTS = 0.3, UP = 1.0;
const DIG = { nose: 0.15, rake: 0.4, sink: 0.25, rest: 0.3 };
const COIL = TEL - STRIKE;
export const UP_AT = TEL + HOLD + SNAP + SETTLE + RESTS;            // surfaced from here
export const DIG_AT = UP_AT + UP;                                    // the dig back in starts
export const CYCLE = DIG_AT + DIG.nose + DIG.rake + DIG.sink + DIG.rest;
const kick = (k) => { const c = c01(k); return 1 - (1 - c) ** 3; };
const settleC = (k) => { const c = c01(k); return smooth(c) - 0.12 * Math.sin(Math.PI * c) * (1 - c); };
const mix = (a, b, u) => { const o = {}; for (const f of FIELDS) o[f] = a[f] + (b[f] - a[f]) * u; return o; };
const DIG_NOSE = K({ pitch: 0.35, pawL: 0.5, pawR: 0.5, snout: -0.2, sx: 0.97, sy: 1.03 });
const DIG_UNDER = K({ rise: 0, pitch: 0.4, pawL: 0.3, pawR: 0.3, snout: -0.2 });
// the whole cycle; the coil starts from under (it arrived tunnelling)
export function burstAt(V, t) {
  if (t < COIL) return { g: UNDER, ph: 'coil' };
  let a = t - COIL; if (a < STRIKE) return { g: mix(UNDER, V.strike, kick(a / STRIKE)), ph: 'strike' };
  a -= STRIKE; if (a < HOLD) return { g: { ...V.strike }, ph: 'hold' };
  a -= HOLD; if (a < SNAP) return { g: mix(V.strike, V.over, 1 - (1 - a / SNAP) ** 2), ph: 'snap' };
  a -= SNAP; if (a < SETTLE) return { g: mix(V.over, REST, settleC(a / SETTLE)), ph: 'settle' };
  if (t < DIG_AT) return { g: { ...REST }, ph: 'up' };
  a = t - DIG_AT;
  if (a < DIG.nose) return { g: mix(REST, DIG_NOSE, smooth(a / DIG.nose)), ph: 'dig' };
  a -= DIG.nose;
  if (a < DIG.rake) { const k = a / DIG.rake; const g = mix(DIG_NOSE, DIG_UNDER, (k * k) * 0.6); const w = Math.sin(k * Math.PI * 3); g.pawL = 0.5 + 0.45 * w; g.pawR = 0.5 - 0.45 * w; return { g, ph: 'rake' }; }
  a -= DIG.rake;
  if (a < DIG.sink) return { g: mix({ ...DIG_UNDER, rise: 0.4 }, DIG_UNDER, 1 - (1 - a / DIG.sink) ** 2), ph: 'sink' };
  return { g: { ...DIG_UNDER }, ph: 'under' };
}
export const BURST_AT = [0, 1, 2].map((k) => k * CYCLE + TEL);
const quake = (t) => (t < COIL ? 0.008 * Math.sin(TAU * t * 11) * c01(t / 0.3) : 0);
const emerges = {
  dur: 3 * CYCLE, contact: BURST_AT, sinks: true,
  phases: [0, 1, 2].flatMap((k) => [[`${['1, the left claw', '2, the right claw', '3, both claws off a leap'][k]}: under, the Ember ring marks, the mound quakes`, k * CYCLE],
    ['the burst: 11 to every hero in the ring', k * CYCLE + TEL], ['lands, surfaced (the game: 2 s, hittable)', k * CYCLE + TEL + 0.2], ['digs back in', k * CYCLE + DIG_AT]]),
  pose: (t) => { const k = Math.min(2, Math.floor(t / CYCLE)), tt = t - k * CYCLE; const B = burstAt(BURSTS[k], tt);
    const up = B.ph === 'up' ? pulse(tt, UP_AT, UP_AT + 0.2, DIG_AT - 0.3, DIG_AT) : 0;
    return mole(B.g, { lift: quake(tt), wig: 0.15 * Math.sin(TAU * tt * 2) * up, look: 0.2 * Math.sin(TAU * (tt - UP_AT) / 1.0) * up, tailY: 0.25 * Math.sin(TAU * tt * 1.5) * (B.ph === 'rake' ? 1 : 0.3) }); },
  feet: (t, W) => { const k = Math.min(2, Math.floor(t / CYCLE)), tt = t - k * CYCLE; const B = burstAt(BURSTS[k], tt);
    const free = B.ph !== 'up' && B.ph !== 'settle';
    return feetOf(B.g, { free, rake: B.ph === 'rake' ? { L: 0.05 * Math.cos((tt - DIG_AT) * 25), R: -0.05 * Math.cos((tt - DIG_AT) * 25) } : null }, W.tz); },
};

// ------------------------------------------------------------------------------------------------ hurt
const hurt = clip({
  dur: 0.4, upperOnly: true,
  pose: (t) => { const k = c01(t / 0.05) * (1 - smooth((t - 0.05) / 0.35)); return mole(K({ pitch: -0.15 * k, roll: 0.05 * k }), { nod: 0.2 * k, sniff: 0.3 * k, tail: 0.3 * k }); },
});
// ------------------------------------------------------------------------------------------------ spawn
const spawnScale = (a) => { const up = 5 * FR, T7 = 7 * FR; if (a >= T7) return 1; if (a <= 0) return 0.001; if (a < up) { const k = a / up; return 0.001 + 1.099 * (1 - (1 - k) * (1 - k)); } return 1.1 - 0.1 * smooth((a - up) / (T7 - up)); };
const spawn = clip({
  dur: 1.3, contact: [], scale: spawnScale,
  pose: (t) => { const r = pulse(t, 0.2, 0.4, 0.7, 1.0); return mole(K({ snout: 0.4 * r, pitch: -0.1 * r }), { wig: 0.3 * Math.sin(TAU * t * 4) * r, tailY: 0.3 * Math.sin(TAU * t * 3) * r }); },
});

// ------------------------------------------------------------------------------------------------ death
// Mine (the game pops every foe flat where it is). Struck, it rears with the claws up; it rolls over onto its side, the
// claws curling, a last kick of the hind feet, and lies still. The candle stays lit (drawn by the page) then goes out.
const ROLL = 1.45;
const deathState = (t) => ({ hit: pulse(t, 0, 0.05, 0.15, 0.4), roll: ROLL * smooth((t - 0.3) / 0.55), kick: pulse(t, 0.95, 1.05, 1.15, 1.35) });
const LOWT = 1 / 30;
const LOW = [0.002,0.010,0.009,0.009,0.009,0.009,0.009,0.010,0.012,0.013,0.015,0.002,0.003,0.004,0.005,0.001,-0.002,-0.017,-0.033,-0.045,-0.054,-0.060,-0.061,-0.068,-0.072,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075,-0.075];
const lowAt = (t) => { if (!LOW.length) return 0; const f = clamp(t / LOWT, 0, LOW.length - 1); const i = Math.floor(f), j = Math.min(LOW.length - 1, i + 1); return LOW[i] + (LOW[j] - LOW[i]) * (f - i); };
function deathPose(t, probe) {
  const { hit, roll, kick: kk } = deathState(t);
  const p = mole(K({ pitch: -0.25 * hit, snout: 0.5 * hit - 0.2 * c01((t - 0.6) / 0.5), pawL: 0.5 * hit, pawR: 0.5 * hit }), { tail: -0.2 * roll, nod: 0.2 * c01((t - 0.6) / 0.5) });
  p.br = -roll;
  p.oy = probe ? 0 : -lowAt(t);
  return p;
}
const deathFeet = (t, W) => { const { hit, roll, kick: kk } = deathState(t); const k = roll / ROLL;
  const out = {};
  // the paws curl in toward the belly as it rolls; the hind feet kick once
  for (const kname of LEGS) { const front = kname[0] === 'F'; const p = REST_T[kname].clone();
    if (front) p.add(V3(-Math.sign(p.x) * 0.08 * k, 0.12 * hit + 0.06 * k, -0.06 * k)); else p.add(V3(-Math.sign(p.x) * 0.04 * k, 0.05 * k + 0.05 * kk, 0.05 * kk));
    // carried round with the body as it rolls (about the hips)
    const piv = V3(0, 0.18 - lowAt(t), p.z); p.sub(piv).applyAxisAngle(V3(0, 0, 1), -roll).add(piv);
    out[kname] = { p: p.add(V3(0, 0, W.tz)), lock: false }; }
  return out; };
const death = { dur: 2.2, contact: [0.02, 0.85], phases: [['struck: rears, claws up', 0], ['rolls onto its side', 0.3], ['a last kick', 0.95], ['lies still', 1.4]],
  pose: (t) => deathPose(t, false), feet: deathFeet };
const probe = { dur: 2.2, pose: (t) => deathPose(t, true), feet: deathFeet };
export const CLIPS = process.env.PROBE ? { probe } : { idle, walk: tunnel, turnL: turn(1), turnR: turn(-1), emerges, hurt, spawn, death };
