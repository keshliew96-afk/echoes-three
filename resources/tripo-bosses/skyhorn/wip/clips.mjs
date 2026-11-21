// The Skyhorn's moves. Units are model units (the model is 1 tall with its horns; the page draws it 2.5 u tall, the game's
// SKYHORN.scale). Timings come from the game: SKYHORN in src/sim/bosses/skyhorn.js (walk 1.6 u/s; Horn Rush: 60-tick
// lane while it paws, 12 u/s, dazed 75 ticks at a wall; Bell Toll: 50-tick ring r 2.9 round itself; Sky Leap: 72-tick
// ring r 2.0, out of reach for the last 36 ticks, six shards on landing) and the beats in src/render/facet/beats.js
// (strike 2.5 frames, contact held 3 frames). The game gives no turn rate, so the turn is 90 degrees a second (mine).
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE } from './quad.mjs';
const FR_ = 1 / 60; const STRIKE = 2.5 * FR_, HOLD = 3 * FR_;
const wf = (s) => Math.round(s * 60) / 60; // whole frames
export const CFG = {
  name: 'skyhorn', unit: 2.5, base: { oy: -0.008 }, // a little slack in the legs at rest: the model stands on straight forelegs
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['neck1', 'n1'], ['neck2', 'n2'], ['head', 'h']],
  extras: [['earL', 'eL'], ['earR', 'eR'], ['beard', 'bd'], ['bell', 'bl'], ['tail1', 't1'], ['tail2', 't2']],
  legs: {
    FL: { kind: 'front', b: ['fUpperL', 'fForeL', 'fCannonL', 'fHoofL'] }, FR: { kind: 'front', b: ['fUpperR', 'fForeR', 'fCannonR', 'fHoofR'] },
    HL: { kind: 'hind', b: ['hThighL', 'hShinL', 'hCannonL', 'hHoofL'] }, HR: { kind: 'hind', b: ['hThighR', 'hShinR', 'hCannonR', 'hHoofR'] },
  },
  springs: [{ bone: 'bell', k: 150, c: 5, max: 1.0, floor: 0.006 }, { bone: 'beard', k: 260, c: 10, max: 0.55, floor: 0.006 },
    { bone: 'earL', k: 420, c: 18, max: 0.35 }, { bone: 'earR', k: 420, c: 18, max: 0.35 },
    { bone: 'tail1', k: 260, c: 12, max: 0.7 }, { bone: 'tail2', k: 180, c: 8, max: 0.8 }],
};
const REST = { FL: V3(0.075, 0, 0.165), FR: V3(-0.075, 0, 0.165), HL: V3(0.08, 0, -0.215), HR: V3(-0.08, 0, -0.215) };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const SG = { FL: 1, FR: -1, HL: 1, HR: -1 };
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.9); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}
const allPlanted = () => Object.fromEntries(LEGS.map((k) => [k, plant(REST[k])]));
const I = new THREE.Quaternion();
// the hoof in the leg root's own frame at rest (root to hoof tip): the body carries a hoof that has let go of the floor
const LOC0 = { FL: [-0.015, -0.43, 0.035], FR: [0.015, -0.43, 0.035], HL: [-0.015, -0.42, 0.035], HR: [0.015, -0.42, 0.035] };
const carry = (B, k, dx, dy, dz) => B.loc(k, [LOC0[k][0] + dx * SG[k], LOC0[k][1] + dy, LOC0[k][2] + dz]);
// a forehoof lifted off the floor: it lets go as the body starts to rise (w, fast) and folds as it goes up (up: dy, dz in
// the leg root's frame), so the target never runs ahead of the leg
const lift = (B, k, w, up, dy, dz) => REST[k].clone().lerp(carry(B, k, 0.04 * up, dy * up, dz * up), w); // a little out, clear of the bell
// a forehoof that paws: up and forward, a scrape back along the floor, home
const paw = (k, t, c, d = 0.24, h = 0.075) => {
  const q = track([[c, { y: 0, z: 0, p: 0 }], [c + d * 0.3, { y: h, z: 0.05, p: 0.9 }], [c + d * 0.52, { y: 0.006, z: 0.055, p: 0.35 }, 'in'], [c + d * 0.8, { y: 0.008, z: -0.035, p: 0.55 }, 'out'], [c + d, { y: 0, z: 0, p: 0 }]])(t);
  return { p: off(k, 0, q.y, q.z), pitch: q.p };
};
// the bell: a clang is a hard swing forward and back on its rope (the spring carries the ring after it)
const clang = (t, c, a = 1) => ({ blp: -0.9 * a * bump(t, c + 0.04, 0.1) + 0.5 * a * bump(t, c + 0.13, 0.12) });

// ------------------------------------------------------------------------------------------------ idle
// 6 s. It breathes, the weight rolls, it looks out left then right, the ears flick, it chews once with the beard working,
// the tail flicks, and it ends with a short head shake that rings the bell.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, sw = Math.sin(w), br = Math.sin(2 * Math.PI * t / 2); // a breath every 2 s
    const look = 0.42 * pulse(t, 0.6, 1.3, 2.1, 2.8) - 0.36 * pulse(t, 3.0, 3.6, 4.1, 4.6);
    const chew = pulse(t, 2.2, 2.3, 2.8, 2.9), shake = pulse(t, 5.0, 5.08, 5.38, 5.5);
    return addPose(
      { oy: 0.002 * br, ox: 0.01 * sw, br: 0.016 * sw, by: 0.014 * Math.sin(w + 1), sy: 0.016 * Math.sin(w + 0.6), cp: 0.008 * br, sp: 0.004 * br },
      { n1p: 0.02 * br + 0.03 * look * look, n2p: -0.01 * br, hp: 0.015 * Math.sin(2 * w + 1) },
      { n1y: 0.22 * look, n2y: 0.26 * look, hy: 0.34 * look, hr: 0.06 * look, cy: 0.04 * look },
      { hp: 0.025 * chew * Math.sin(22 * t), bdp: 0.12 * chew * Math.sin(22 * t + 0.6) },
      { hy: 0.16 * Math.sin(38 * t) * shake, hr: 0.12 * Math.sin(38 * t + 1.1) * shake, n2y: 0.05 * Math.sin(38 * t - 0.4) * shake },
      { eLp: -0.5 * bump(t, 1.0, 0.22) - 0.3 * bump(t, 4.3, 0.2), eLy: 0.3 * bump(t, 1.0, 0.22), eRp: -0.5 * bump(t, 3.8, 0.22) - 0.3 * bump(t, 1.4, 0.2), eRy: -0.3 * bump(t, 3.8, 0.22) },
      { t1p: -0.5 * bump(t, 2.5, 0.3) + 0.03 * br, t1y: 0.5 * bump(t, 2.45, 0.2) - 0.45 * bump(t, 2.66, 0.2) + 0.06 * sw, t2y: 0.3 * bump(t, 2.5, 0.2) - 0.3 * bump(t, 2.72, 0.2) },
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// Diagonal pairs, 1.6 u/s, 0.6 s a cycle (0.96 u a stride), head carried high, the bell swinging on the steps.
const WT = 0.6;
const GAIT = { T: WT, duty: 0.56, v: 1.6 / CFG.unit };
const GF = { FL: { phase: 0, n: [0.075, 0.165], lift: 0.075, droop: 1.0 }, HR: { phase: 0.04, n: [-0.08, -0.215], lift: 0.055, droop: 0.6, push: 0.3 },
             FR: { phase: 0.5, n: [-0.075, 0.165], lift: 0.075, droop: 1.0 }, HL: { phase: 0.54, n: [0.08, -0.215], lift: 0.055, droop: 0.6, push: 0.3 } };
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT;
    return addPose(
      { oy: -0.012 + 0.006 * Math.cos(2 * w - 0.5), bp: 0.01 * Math.sin(2 * w + 0.5), br: 0.02 * Math.sin(w + 0.2), ox: 0.005 * Math.sin(w + 0.6), by: 0.018 * Math.sin(w) },
      { sy: 0.03 * Math.sin(w + 0.4), sr: -0.01 * Math.sin(w + 0.2), cy: -0.026 * Math.sin(w + 0.4), cr: -0.012 * Math.sin(w + 0.2) },
      { n1p: -0.04 + 0.03 * Math.sin(2 * w + 1.3), n2p: -0.02 + 0.014 * Math.sin(2 * w + 1.7), hp: -0.03 - 0.025 * Math.sin(2 * w + 2.0), hy: -0.02 * Math.sin(w), n1y: -0.015 * Math.sin(w) },
      { t1y: 0.12 * Math.sin(w + 1.2), t1p: -0.05 + 0.04 * Math.sin(2 * w) },
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const TURN = 90 * Math.PI / 180;
const turn = (dir) => {
  const g = { T: WT, duty: 0.58, v: 0, omega: dir * TURN, pivot: [0, -0.03] };
  const gf = { FL: { ...GF.FL, n: [0.095, 0.165], lift: 0.06 }, FR: { ...GF.FR, n: [-0.095, 0.165], lift: 0.06 }, HL: { ...GF.HL, n: [0.097, -0.215], lift: 0.04 }, HR: { ...GF.HR, n: [-0.097, -0.215], lift: 0.04 } };
  return {
    dur: WT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / WT;
      return addPose({ oy: -0.01 + 0.004 * Math.cos(2 * w - 0.5), br: 0.016 * Math.sin(w) - 0.014 * dir, bp: 0.008 * Math.sin(2 * w) },
        { sy: 0.05 * dir, cy: 0.05 * dir, n1y: 0.1 * dir, n2y: 0.1 * dir, hy: 0.12 * dir, hr: 0.04 * dir, n1p: -0.03 + 0.015 * Math.sin(2 * w + 1), hp: -0.02 },
        { t1y: -0.22 * dir + 0.1 * Math.sin(w) }); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ Horn Rush
// The 60-tick lane: it rears, the forehooves strike the air, it comes down and paws twice, then drops its horns level.
// burst (2.5 frames on the resolve), the rush (8 u at 12 u/s: four bounds), the wall (2.5 frames: the horns meet it and
// the head is thrown up), dazed (the sim's 75 ticks: legs set wide, the head low and swimming, one stagger step), the
// recovery (a hard head shake that rings the bell) and it squares up.
const RUN = wf(8 / 12), RD = 8 / CFG.unit;
const R = { rear: 0.14, top: 0.4, down: 0.57, wind: 1.0 - STRIKE, go: 1.0 };
R.stop = R.go + RUN; R.hit = R.stop + STRIKE; R.held = R.hit + HOLD; R.wake = R.stop + 75 / 60; R.shook = R.wake + 0.36; R.end = wf(R.wake + 0.75);
const P4 = RUN / 4; // one bound
const DOWN = { n1p: -0.32, n2p: -0.3, hp: -0.42 }; // horns level: the forehead and the front of the horn arch lead
const rush = {
  dur: R.end, contact: [R.go, R.hit], travel: (t) => RD * clamp((t - R.go) / RUN) - 0.03 * pulse(t, R.stop, R.hit, R.held + 0.1, R.held + 0.4),
  phases: [['rear', 0], ['paw', R.down], ['horns down', 0.82], ['burst', R.wind], ['rush', R.go], ['the wall', R.stop], ['dazed', R.held], ['shake it off', R.wake], ['square up', R.shook]],
  cues: { lane: [0, R.go], run: [R.go, R.stop], wall: [R.stop], dazed: [R.stop, R.wake] },
  pose: (t) => {
    const k = track([[0, {}],
      [R.rear, { oy: -0.012, oz: -0.012, bp: -0.03, n1p: 0.05, hp: 0.02, t1p: -0.2 }],
      [R.top, { oy: 0.008, oz: -0.03, bp: 0.3, sp: 0.04, cp: 0.04, n1p: 0.12, n2p: 0.08, hp: 0.1, t1p: -0.8 }, 'out'],
      [R.down, { oy: -0.03, oz: 0.005, bp: -0.04, sp: -0.01, n1p: -0.08, n2p: -0.06, hp: -0.1, t1p: -0.4 }, 'in'],
      [0.82, { oy: -0.025, oz: -0.02, bp: -0.03, n1p: -0.2, n2p: -0.2, hp: -0.3, t1p: -0.5 }],
      [R.wind, { oy: -0.045, oz: -0.05, bp: -0.08, sp: -0.03, ...DOWN, t1p: -0.6 }],
      [R.go, { oy: -0.025, oz: 0.03, bp: 0.1, sp: 0.04, ...DOWN, t1p: -0.9 }, 'out'],
      [R.go + P4 * 0.5, { oy: 0.0, oz: 0.02, bp: -0.08, ...DOWN, t1p: -0.7 }],
      [R.go + P4, { oy: 0.014, oz: 0.02, bp: 0.08, ...DOWN, t1p: -0.9 }],
      [R.go + P4 * 1.5, { oy: 0.0, oz: 0.02, bp: -0.08, ...DOWN, t1p: -0.7 }],
      [R.go + P4 * 2, { oy: 0.014, oz: 0.02, bp: 0.08, ...DOWN, t1p: -0.9 }],
      [R.go + P4 * 2.5, { oy: 0.0, oz: 0.02, bp: -0.08, ...DOWN, t1p: -0.7 }],
      [R.go + P4 * 3, { oy: 0.014, oz: 0.02, bp: 0.08, ...DOWN, t1p: -0.9 }],
      [R.go + P4 * 3.5, { oy: -0.005, oz: 0.02, bp: -0.1, ...DOWN, t1p: -0.7 }],
      [R.stop, { oy: -0.02, oz: 0.035, bp: -0.12, sp: -0.03, n1p: -0.36, n2p: -0.34, hp: -0.46, t1p: -0.9 }],
      // the wall: the head is thrown up and back, the forequarters pushed back onto the haunches
      [R.hit, { oy: -0.035, oz: -0.03, bp: 0.12, sp: 0.04, cp: 0.04, n1p: 0.12, n2p: 0.1, hp: 0.3, t1p: -1.0 }, 'out'],
      [R.held, { oy: -0.038, oz: -0.034, bp: 0.13, sp: 0.04, cp: 0.04, n1p: 0.14, n2p: 0.12, hp: 0.32, t1p: -1.0 }],
      [R.held + 0.2, { oy: -0.03, oz: -0.012, bp: 0.02, n1p: -0.05, n2p: -0.04, hp: 0.0, t1p: -0.3 }, 'out'],
      // dazed: low, legs wide, the head hanging
      [R.held + 0.5, { oy: -0.04, oz: 0.0, bp: -0.06, sp: -0.02, n1p: -0.3, n2p: -0.22, hp: -0.25, t1p: 0.25 }],
      [R.wake - 0.05, { oy: -0.042, oz: 0.0, bp: -0.07, sp: -0.02, n1p: -0.34, n2p: -0.26, hp: -0.28, t1p: 0.3 }],
      [R.wake + 0.12, { oy: -0.02, bp: 0.03, n1p: 0.02, n2p: 0.02, hp: 0.0, t1p: -0.4 }, 'out'],
      [R.shook + 0.14, { oy: -0.006, bp: 0.03, n1p: 0.06, n2p: 0.04, hp: 0.05, t1p: -0.2 }],
      [R.end, {}]])(t);
    const daze = pulse(t, R.held + 0.2, R.held + 0.45, R.wake - 0.1, R.wake + 0.05), td = t - R.held;
    const shake = pulse(t, R.wake + 0.06, R.wake + 0.1, R.shook - 0.06, R.shook);
    const rearPaw = pulse(t, R.rear + 0.1, R.top - 0.08, R.top + 0.02, R.down - 0.02);
    return addPose(k,
      // the head swims in slow circles, the body sways over the wide-set legs
      { hy: 0.12 * Math.sin(5.5 * td) * daze, hr: 0.1 * Math.sin(5.5 * td + 1.6) * daze, n1y: 0.08 * Math.sin(5.5 * td - 0.5) * daze, br: 0.04 * Math.sin(5.5 * td + 0.8) * daze, by: 0.03 * Math.sin(5.5 * td + 2) * daze,
        eLp: 0.5 * daze, eRp: 0.5 * daze, eLr: 0.3 * daze, eRr: -0.3 * daze },
      { hy: 0.22 * Math.sin(40 * t) * shake, hr: 0.16 * Math.sin(40 * t + 1.1) * shake, n2y: 0.07 * Math.sin(40 * t - 0.4) * shake, eLy: 0.3 * Math.sin(40 * t + 0.5) * shake, eRy: 0.3 * Math.sin(40 * t + 0.5) * shake },
      { hp: 0.05 * Math.sin(24 * t) * rearPaw },
      clang(t, R.stop, 1.0), clang(t, R.wake + 0.08, 0.6),
    );
  },
  feet: (t, B) => {
    const F = {}; const st = 0.02;
    const at = (k, tm) => off(k, 0, 0, RD * clamp((tm - R.go) / RUN));
    const fm = [R.go + 0.09, R.go + 0.09 + P4, R.go + 0.09 + 2 * P4], hm = [R.go + P4, R.go + 2 * P4, R.go + 3 * P4];
    const end = (k) => off(k, 0, 0, RD - 0.03);
    // dazed: the legs step out wide and one stagger step; the recovery brings them home
    const wideF = (k) => end(k).add(V3(0.03 * SG[k], 0, 0.01)), wideH = (k) => end(k).add(V3(0.035 * SG[k], 0, -0.01));
    for (const [k, d] of [['FL', 0], ['FR', 0.01]]) {
      if (t < R.go - 0.06) {
        // the rear: both forehooves leave the floor and strike at the air, then come down; then the left paws twice
        if (t > R.rear + d && t < R.down) {
          const a = R.rear + d, b = R.down - 0.01 + d * 0.5; const u = clamp((t - a) / (b - a));
          const up = smooth(u / 0.45) * (1 - smooth((u - 0.7) / 0.3)), w = smooth((t - a) / 0.06) * (1 - smooth((t - b + 0.06) / 0.06));
          const strike = 0.03 * Math.sin(2 * Math.PI * (u * 2.2 + (k === 'FL' ? 0 : 0.5))) * smooth((u - 0.2) / 0.2);
          F[k] = { p: lift(B, k, w, up, 0.15 + strike, -0.02 + strike), pitch: 1.3 * up };
        } else if (k === 'FL' && t >= 0.6 && t < 0.93) {
          F[k] = t < 0.78 ? paw(k, t, 0.6, 0.18) : paw(k, t, 0.78, 0.15, 0.055);
        } else F[k] = plant(REST[k]);
        continue;
      }
      if (t < R.stop) {
        F[k] = steps(t, REST[k], [[R.wind + 0.008 + d, fm[0] - st + d, at(k, fm[0] + d), 0.09, 1.1], [fm[0] + st + d, fm[1] - st + d, at(k, fm[1] + d), 0.09, 1.1], [fm[1] + st + d, fm[2] - st + d, at(k, fm[2] + d), 0.09, 1.1], [fm[2] + st + d, R.stop - 0.01 + d * 0.5, end(k), 0.08, 1.0]]);
        continue;
      }
      const sl = k === 'FL' ? [R.held + 0.32, R.held + 0.48] : [R.held + 0.62, R.held + 0.8];
      F[k] = steps(t, end(k), [[sl[0], sl[1], wideF(k), 0.035, 0.5], [R.shook + (k === 'FL' ? 0.02 : 0.12), R.shook + (k === 'FL' ? 0.16 : 0.26), end(k), 0.04]]);
    }
    for (const [k, d] of [['HL', 0.01], ['HR', 0]]) {
      const wide = V3(0.03 * SG[k], 0, 0);
      if (t < R.stop) {
        F[k] = steps(t, REST[k], [[R.go + 0.017 + d, hm[0] - st + d, at(k, hm[0] + d).add(wide), 0.075, 0.5], [hm[0] + st + d, hm[1] - st + d, at(k, hm[1] + d).add(wide), 0.075, 0.5], [hm[1] + st + d, hm[2] - st + d, at(k, hm[2] + d).add(wide), 0.075, 0.5], [hm[2] + st + d, R.stop + 0.02 + d, end(k), 0.06, 0.5]]);
        if (F[k].lock && t > R.wind && t < R.go + 0.03) F[k].pitch = 0.4 * smooth((t - R.wind) / 0.05);
        if (F[k].lock && t > R.rear && t < R.down) F[k].pitch = 0.12 * pulse(t, R.rear, R.top - 0.1, R.top, R.down);
        continue;
      }
      const sl = k === 'HR' ? [R.held + 0.44, R.held + 0.62] : [R.held + 0.86, R.held + 1.02];
      F[k] = steps(t, end(k), [[sl[0], sl[1], wideH(k), 0.03, 0.5], [R.shook + (k === 'HR' ? 0.06 : 0.18), R.shook + (k === 'HR' ? 0.2 : 0.32), end(k), 0.035, 0.5]]);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Bell Toll
// The 50-tick ring round itself: it rocks back onto its haunches and throws its head up and back, the forehooves come
// off the floor; strike (2.5 frames on the resolve): the forehooves slam down and the head whips down so the horns clash
// on the floor in front; held; the bell rings on; it lifts its head and settles.
const T = { warn: 50 / 60 }; T.go = T.warn - STRIKE; T.hit = T.warn; T.held = T.hit + HOLD; T.end = wf(T.held + 0.65);
const toll = {
  dur: T.end, contact: [T.hit], phases: [['rock back', 0], ['head up', 0.4], ['clash', T.go], ['the toll', T.hit], ['settle', T.held]], cues: { ring: [0, T.hit], toll: [T.hit] },
  pose: (t) => {
    const k = track([[0, {}],
      [0.3, { oy: -0.02, oz: -0.02, bp: 0.04, n1p: 0.12, n2p: 0.1, hp: 0.12, t1p: -0.4 }],
      [T.go, { oy: -0.012, oz: -0.035, bp: 0.2, sp: 0.03, cp: 0.04, n1p: 0.3, n2p: 0.24, hp: 0.36, t1p: -0.9 }, 'out'],
      [T.hit, { oy: -0.05, oz: 0.02, bp: -0.08, sp: -0.03, cp: -0.03, n1p: -0.3, n2p: -0.26, hp: -0.42, t1p: -1.0 }, 'in'],
      [T.held, { oy: -0.054, oz: 0.022, bp: -0.09, sp: -0.03, cp: -0.03, n1p: -0.31, n2p: -0.27, hp: -0.44, t1p: -1.0 }],
      [T.held + 0.12, { oy: -0.035, oz: 0.01, bp: -0.05, n1p: -0.22, n2p: -0.18, hp: -0.3, t1p: -0.5 }, 'out'],
      [T.held + 0.36, { oy: -0.012, bp: 0.01, n1p: 0.0, n2p: 0.0, hp: -0.04, t1p: 0.0 }],
      [T.end, {}]])(t);
    const ring = pulse(t, T.hit, T.hit + 0.03, T.held + 0.1, T.held + 0.3);
    return addPose(k, { hy: 0.03 * Math.sin(84 * t) * ring, hr: 0.025 * Math.sin(84 * t + 1.2) * ring, eLp: -0.3 * ring, eRp: -0.3 * ring }, clang(t, T.hit, 1.0));
  },
  feet: (t, B) => {
    const F = allPlanted();
    for (const [k, d] of [['FL', 0], ['FR', 0.02]]) {
      const dn = off(k, 0, 0, 0.02);
      if (t > 0.3 + d && t < T.hit) {
        if (t < T.go) { const u = smooth((t - 0.3 - d) / (T.go - 0.3 - d)); F[k] = { p: lift(B, k, smooth((t - 0.3 - d) / 0.05), u, 0.08, -0.01), pitch: 1.0 * u }; }
        else { const u = ((t - T.go) / STRIKE) ** 2; F[k] = { p: lift(B, k, 1, 1, 0.08, -0.01).lerp(dn, u), pitch: 1.0 * (1 - u) }; }
      } else if (t >= T.hit) F[k] = steps(t, dn, [[T.held + 0.3 + d * 3, T.held + 0.44 + d * 3, REST[k], 0.03, 0.3]]);
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ Sky Leap
// The 72-tick ring at the farthest hero: it crouches for the first 36 ticks (the hind legs gather, the head drops), the
// spring (2.5 frames), the last 36 ticks in the air (out of reach: up 1.9 u at the top, 6 u across), the landing on the
// resolve (2.5 frames: forehooves first, the knees take it), held; the shards fly; it rises.
const L = { warn: 72 / 60, air: 36 / 60, H: 0.76, D: 6 / CFG.unit }; L.go = L.warn - L.air; L.wind = L.go - STRIKE; L.hit = L.warn; L.held = L.hit + HOLD; L.end = wf(L.held + 0.8);
const airU = (t) => clamp((t - L.go) / L.air); const fallV = (t) => clamp((t - L.go) / (L.air - STRIKE));
const leap = {
  dur: L.end, contact: [L.go, L.hit], travel: (t) => L.D * airU(t),
  phases: [['crouch', 0], ['spring', L.wind], ['in the air', L.go], ['land', L.hit - STRIKE], ['the shards', L.hit], ['rise', L.held]], cues: { ring: [0, L.hit], air: [L.go, L.hit], land: [L.hit] },
  pose: (t) => {
    const u = airU(t), inAir = t > L.go && t < L.hit;
    const k = track([[0, {}],
      [0.3, { oy: -0.04, oz: -0.02, bp: -0.04, sp: -0.02, n1p: -0.12, n2p: -0.1, hp: -0.14, t1p: -0.3 }],
      [L.wind, { oy: -0.06, oz: -0.035, bp: 0.02, sp: -0.02, n1p: -0.18, n2p: -0.14, hp: -0.2, t1p: -0.5 }],
      [L.go, { oy: 0.0, oz: 0.0, bp: 0.3, sp: 0.03, cp: 0.04, n1p: 0.18, n2p: 0.12, hp: 0.18, t1p: -1.0 }, 'out'],
      [L.go + L.air * 0.5, { bp: 0.04, n1p: 0.02, n2p: 0.0, hp: -0.04, t1p: -0.6 }],
      [L.hit - STRIKE, { oy: 0.0, bp: -0.16, sp: -0.02, n1p: -0.12, n2p: -0.1, hp: -0.18, t1p: -0.2 }],
      [L.hit, { oy: -0.07, oz: 0.01, bp: -0.1, sp: -0.03, cp: -0.03, n1p: -0.24, n2p: -0.2, hp: -0.3, t1p: -0.9 }, 'in'],
      [L.held, { oy: -0.075, oz: 0.01, bp: -0.08, sp: -0.03, cp: -0.03, n1p: -0.25, n2p: -0.21, hp: -0.31, t1p: -0.9 }],
      [L.held + 0.2, { oy: -0.04, bp: 0.0, n1p: -0.08, n2p: -0.05, hp: -0.06, t1p: -0.3 }, 'out'],
      [L.held + 0.5, { oy: -0.008, bp: 0.02, n1p: 0.04, n2p: 0.03, hp: 0.04 }],
      [L.end, {}]])(t);
    const v = fallV(t); const lift = inAir ? L.H * 4 * v * (1 - v) : 0;
    return addPose(k, { oy: lift, eLp: inAir ? 0.4 * Math.sin(Math.PI * u) : 0, eRp: inAir ? 0.4 * Math.sin(Math.PI * u) : 0 }, clang(t, L.hit, 0.8));
  },
  feet: (t, B) => {
    const F = {}; const u = airU(t);
    for (const k of LEGS) {
      const front = k[0] === 'F', land = off(k, 0, 0, L.D), d = k === 'FR' || k === 'HL' ? 0.012 : 0;
      const leave = front ? L.wind - 0.005 + d * 0.3 : L.go + d, touch = front ? L.hit - STRIKE + d * 0.5 : L.hit + 0.03 + d;
      if (t < leave) { F[k] = plant(REST[k]); if (!front && t > L.wind) F[k].pitch = 0.5 * smooth((t - L.wind) / STRIKE); continue; }
      if (t >= touch) { F[k] = steps(t, land, [[L.held + 0.22 + d * 4, L.held + 0.36 + d * 4, land.clone(), 0.02]]); continue; }
      // in the air: carried by the body, folded at first, reaching to land at the end (forelegs forward, hind under)
      const reach = smooth((fallV(t) - 0.45) / 0.5);
      const fold = front ? [0, 0.15 - 0.13 * reach, -0.06 + 0.13 * reach] : [0, 0.1 - 0.06 * reach, 0.07 - 0.04 * reach];
      const kick = front ? 0 : 0.07 * (1 - smooth(u / 0.25)); // the hind legs trail out behind the push first
      const fw = smooth((t - leave) / 0.12); // off the toes into the fold, not in one frame
      let p = carry(B, k, fold[0], fw * (fold[1] + 0.02 * (1 - smooth(u / 0.25))), fw * (fold[2] - kick));
      const near = smooth((t - (touch - 0.034)) / 0.034); if (near > 0) p = p.lerp(land, near);
      F[k] = { p, pitch: lerp(front ? 0 : 0.5, (front ? 1.1 : 0.4) * (1 - reach * 0.8), fw) * (1 - near) };
    }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ enrage (new pose)
// Under 40 percent the game only marks it enraged. This one is mine: it rears high, the forehooves beat the air, it shakes
// its horns so the bell rings, comes down on both forehooves together and throws its horns up.
const E = { top: 0.5, stamp: 1.05 }; E.held = E.stamp + HOLD; E.end = wf(1.85);
const enrage = {
  dur: E.end, contact: [E.stamp], phases: [['rear', 0], ['beat the air', 0.3], ['stamp', E.stamp - STRIKE], ['horns up', E.held], ['settle', 1.5]], cues: { roar: [0.3, 1.4] },
  pose: (t) => {
    const k = track([[0, {}],
      [0.12, { oy: -0.015, oz: -0.01, bp: -0.03, n1p: -0.06, hp: -0.05, t1p: -0.2 }],
      [E.top, { oy: 0.01, oz: -0.04, bp: 0.42, sp: 0.06, cp: 0.05, n1p: 0.1, n2p: 0.08, hp: 0.12, t1p: -1.0 }, 'out'],
      [E.stamp - STRIKE, { oy: 0.006, oz: -0.03, bp: 0.3, sp: 0.04, cp: 0.04, n1p: 0.04, n2p: 0.02, hp: 0.0, t1p: -0.9 }],
      [E.stamp, { oy: -0.045, oz: 0.012, bp: -0.06, sp: -0.02, n1p: -0.3, n2p: -0.26, hp: -0.34, t1p: -1.0 }, 'in'],
      [E.held, { oy: -0.048, oz: 0.012, bp: -0.07, sp: -0.02, n1p: -0.31, n2p: -0.27, hp: -0.35, t1p: -1.0 }],
      [E.held + 0.16, { oy: -0.01, oz: -0.01, bp: 0.08, cp: 0.05, n1p: 0.26, n2p: 0.22, hp: 0.32, t1p: -0.8 }, 'out'],
      [1.5, { oy: -0.008, bp: 0.06, cp: 0.03, n1p: 0.2, n2p: 0.16, hp: 0.24, t1p: -0.6 }],
      [E.end, {}]])(t);
    const shk = pulse(t, 0.45, 0.5, 0.85, 0.95);
    return addPose(k, { hy: 0.2 * Math.sin(30 * t) * shk, hr: 0.16 * Math.sin(30 * t + 1.2) * shk, n2y: 0.06 * Math.sin(30 * t - 0.5) * shk, blr: 0.5 * Math.sin(30 * t + 2) * shk },
      clang(t, 0.5, 0.6), clang(t, 0.72, 0.6), clang(t, E.stamp, 1.0));
  },
  feet: (t, B) => {
    const F = allPlanted();
    for (const [k, d] of [['FL', 0], ['FR', 0.06]]) {
      const a = 0.1 + d * 0.5, b = E.stamp - STRIKE;
      if (t > a && t < E.stamp) {
        if (t < b) { const u = clamp((t - a) / (b - a)); const up = smooth(u / 0.35);
          const beat = 0.04 * Math.sin(2 * Math.PI * (2.4 * u + (k === 'FL' ? 0 : 0.5))) * smooth((u - 0.25) / 0.15);
          F[k] = { p: lift(B, k, smooth((t - a) / 0.06), up, 0.17 + beat, -0.02 + beat), pitch: 1.35 * up }; }
        else { const u = ((t - b) / STRIKE) ** 2; F[k] = { p: lift(B, k, 1, 1, 0.17, -0.02).lerp(off(k, 0, 0, 0.02), u), pitch: 1.35 * (1 - u) }; }
      } else if (t >= E.stamp) F[k] = steps(t, off(k, 0, 0, 0.02), [[1.5 + d, 1.64 + d, REST[k], 0.03, 0.3]]);
    }
    for (const k of ['HL', 'HR']) if (t > 0.2 && t < 0.95) F[k].pitch = 0.1 * pulse(t, 0.2, 0.45, 0.8, 0.95);
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ hurt (light)
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => addPose(track([[0, {}], [0.05, { n1p: 0.14, n2p: 0.1, hp: -0.08, hy: 0.2, hr: 0.14, n1y: 0.08, n1r: 0.04, t1p: -0.6, eLp: 0.4, eRp: 0.4 }, 'out'], [0.17, { n1p: -0.04, n2p: -0.02, hy: -0.05, hr: -0.04, t1p: 0.1 }], [0.42, {}]])(t), clang(t, 0.02, 0.4)),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// Shoved back a step, the head whips away and the bell clangs; it shakes its horns and squares up.
const HB = -0.08;
const heavyHit = {
  dur: 1.1, contact: [0], travel: (t) => HB * EASE.out(clamp(t / 0.3)), phases: [['hit', 0], ['stagger', 0.07], ['shake', 0.38], ['square up', 0.7]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.034, oy: -0.02, bp: 0.12, br: 0.07, by: -0.1, sp: 0.06, cp: 0.08, n1p: 0.28, n2p: 0.22, hp: -0.16, hy: -0.4, n2y: -0.2, n1y: -0.1, hr: -0.22, t1p: -0.85, eLp: 0.5, eRp: 0.5 }, 'out'],
      [0.24, { oz: -0.012, oy: -0.04, bp: 0.03, br: -0.03, by: -0.04, n1p: 0.04, n2p: 0.0, hp: -0.24, hy: -0.24, n2y: -0.1, hr: 0.1, t1p: -0.2 }],
      [0.44, { oy: -0.02, bp: -0.03, n1p: -0.15, n2p: -0.1, hp: -0.16, hy: 0.06, t1p: 0.15 }],
      [0.74, { oy: -0.006, bp: 0.01, n1p: -0.04, n2p: -0.02, hp: -0.02 }],
      [1.1, {}]])(t);
    const sh = pulse(t, 0.36, 0.44, 0.6, 0.74);
    return addPose(k, { hy: 0.13 * Math.sin(34 * (t - 0.36)) * sh, hr: 0.1 * Math.sin(34 * (t - 0.36) + 1.3) * sh, n2y: 0.05 * Math.sin(34 * (t - 0.36) - 0.5) * sh }, clang(t, 0.0, 0.9), clang(t, 0.4, 0.4));
  },
  feet: (t) => ({
    HL: steps(t, REST.HL, [[0.035, 0.165, off('HL', 0, 0, HB), 0.04, 0.4]]), FR: steps(t, REST.FR, [[0.075, 0.205, off('FR', 0, 0, HB), 0.045]]),
    HR: steps(t, REST.HR, [[0.15, 0.275, off('HR', 0, 0, HB), 0.035, 0.4]]), FL: steps(t, REST.FL, [[0.2, 0.33, off('FL', 0, 0, HB), 0.045]]),
  }),
};

// ------------------------------------------------------------------------------------------------ spawn
// The game's spawn: grow from the floor in 7 frames, then stand. It comes up out of a low crouch, lifts its horns, and a
// forehoof stamps; the bell rings.
const SP = { grow: 7 * FR_, stamp: 0.78 + STRIKE };
const spawn = {
  dur: 1.6, contact: [SP.stamp], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['rise', SP.grow], ['horns up', 0.5], ['stamp', 0.78], ['stand', SP.stamp]],
  pose: (t) => addPose(track([
    [0, { oy: -0.1, bp: -0.08, sp: -0.06, n1p: -0.4, n2p: -0.32, hp: -0.4, t1p: 0.3, eLp: 0.5, eRp: 0.5 }],
    [SP.grow, { oy: -0.1, bp: -0.08, sp: -0.06, n1p: -0.4, n2p: -0.32, hp: -0.4, t1p: 0.3, eLp: 0.5, eRp: 0.5 }],
    [0.5, { oy: -0.02, bp: 0.0, sp: -0.02, n1p: -0.16, n2p: -0.12, hp: -0.2, t1p: -0.1 }],
    [0.78, { oy: 0.008, bp: 0.08, cp: 0.05, sp: 0.03, n1p: 0.2, n2p: 0.16, hp: 0.2, t1p: -0.7, eLp: -0.3, eRp: -0.3 }, 'out'],
    [SP.stamp, { oy: 0.0, bp: 0.06, cp: 0.05, sp: 0.03, n1p: 0.19, n2p: 0.16, hp: 0.18, t1p: -0.75, eLp: -0.3, eRp: -0.3 }],
    [1.14, { oy: -0.006, bp: 0.02, cp: 0.01, n1p: 0.06, n2p: 0.04, hp: 0.04, t1p: -0.2 }],
    [1.6, {}]])(t), clang(t, SP.stamp, 0.8)),
  feet: (t) => {
    const F = allPlanted(); const r = REST.FL, up = off('FL', 0.004, 0.12, 0.04);
    if (t > 0.52 && t < SP.stamp) {
      if (t < 0.72) { const u = smooth((t - 0.52) / 0.2); F.FL = { p: r.clone().lerp(up, u), pitch: 1.1 * Math.sin(Math.PI * 0.5 * u) }; }
      else if (t < 0.78) F.FL = { p: up.clone(), pitch: 1.1 };
      else { const u = ((t - 0.78) / STRIKE) ** 2; F.FL = { p: up.clone().lerp(r, u), pitch: 1.1 * (1 - u) }; } }
    return F;
  },
};

// ------------------------------------------------------------------------------------------------ death
// The hooves unlock. A jolt, the forelegs buckle, the hindquarters give and it goes down on its right side; the head stays
// up a moment, then lays down with the horns flat along the floor. The bell rolls out on its rope.
const D = { knees: 0.55, side: 1.2, head: 1.85, end: 2.7 };
const death = {
  dur: D.end, contact: [D.side - 0.04, D.head], phases: [['jolt', 0], ['buckle', 0.14], ['fall', D.knees], ['the head goes down', D.side + 0.2], ['still', D.head]], cues: { out: [D.side, D.head + 0.3] },
  pose: (t) => {
    const lie = { bp: 0.0, oy: -0.258, oz: -0.02, br: 1.42, by: 0.14, sr: 0.03, cr: 0.03 };
    const headDown = { n1p: 0.1, n2p: 0.05, hp: 0.05, n1y: -0.26, n2y: -0.22, hy: -0.1, hr: -0.3, n1r: -0.12, n2r: -0.1 };
    const k = track([[0, {}],
      [0.12, { bp: 0.1, oy: 0.004, br: -0.05, n1p: 0.26, n2p: 0.2, hp: 0.28, hy: 0.14, t1p: -0.8, eLp: 0.4, eRp: 0.4 }, 'out'],
      [D.knees, { bp: -0.34, oy: -0.05, oz: 0.02, br: 0.06, sp: -0.05, n1p: -0.05, n2p: 0.1, hp: 0.26, hy: -0.1, t1p: -0.2 }],
      [0.86, { bp: -0.18, oy: -0.17, oz: 0.0, br: 0.55, by: 0.1, sp: -0.02, sr: 0.06, n1p: 0.14, n2p: 0.14, hp: 0.18, hy: 0.1, hr: -0.18, n1r: -0.08, t1p: -0.5 }],
      [D.side, { ...lie, oy: -0.253, n1p: 0.1, n2p: 0.08, hp: 0.08, n1y: 0.05, hy: 0.0, hr: -0.3, n1r: -0.12, n2r: -0.1, t1p: -0.3 }, 'in'],
      [D.side + 0.2, { ...lie, n1p: 0.13, n2p: 0.1, hp: 0.08, n1y: 0.1, hy: 0.05, hr: -0.32, n1r: -0.14, n2r: -0.12, t1p: -0.1 }],
      [D.head, { ...lie, ...headDown, t1p: 0.1, eLp: 0.6, eRp: 0.6 }, 'in'],
      [D.head + 0.1, { ...lie, ...headDown, n1p: 0.12, hr: -0.32, t1p: 0.1, eLp: 0.6, eRp: 0.6 }, 'out'],
      [D.end, { ...lie, ...headDown, t1p: 0.15, eLp: 0.6, eRp: 0.6 }],
    ])(t);
    const tw = pulse(t, D.side, D.side + 0.1, D.head - 0.25, D.head - 0.05);
    return addPose(k, { hy: 0.03 * Math.sin(47 * t) * tw, n2p: 0.02 * Math.sin(31 * t) * tw }, clang(t, D.side - 0.04, 0.7));
  },
  feet: (t, B) => {
    const u = smooth((t - 0.45) / 0.7);
    const lie = { FL: [-0.07, -0.29, 0.14], FR: [-0.02, -0.36, 0.06], HL: [-0.05, -0.31, 0.03], HR: [-0.02, -0.37, -0.07] };
    const slip = { FL: off('FL', 0.025, 0, -0.03), FR: off('FR', -0.03, 0, -0.045), HL: REST.HL, HR: REST.HR };
    const F = {};
    for (const k of LEGS) {
      const a = REST[k].clone().lerp(slip[k], smooth((t - 0.14) / 0.4));
      const twitch = 0.012 * Math.sin(30 * t + (k === 'FL' ? 0 : 2)) * pulse(t, D.side, D.side + 0.1, D.side + 0.5, D.side + 0.8);
      const l = lie[k], l0 = LOC0[k]; const carried = B.loc(k, [lerp(l0[0], l[0], u), lerp(l0[1], l[1], u) + twitch, lerp(l0[2], l[2], u)]);
      const t0 = k[0] === 'F' ? 0.04 : 0.14, wk = smooth((t - t0) / (0.48 - t0));
      const p = a.clone().lerp(carried, wk); p.y = Math.max(p.y, 0.034 * u);
      F[k] = { p: t < t0 ? a : p, pitch: 0.55 * u, q: I.clone().slerp(B.parQ(k), u), lock: t < t0, under: t >= t0 };
    }
    return F;
  },
};

// the beard hangs from the chin: when the head goes down it swings forward with it instead of into the throat ruff
// (it follows over five frames, so a strike that whips the head down does not flip it in one)
const downOf = (p) => Math.min(0, (p.bp || 0) + (p.sp || 0) + (p.cp || 0) + (p.n1p || 0) + (p.n2p || 0) + (p.hp || 0));
const BEARD = (clip) => ({ ...clip, pose: (t) => { const p = clip.pose(t); let s = 0;
  for (let k = 0; k < 5; k++) { const tk = t - k / 60; s += downOf(k === 0 ? p : clip.pose(clip.loop ? (tk + clip.dur) % clip.dur : Math.max(0, tk))); }
  return addPose(p, { bdp: -1.1 * s / 5 }); } });
const ALL = { idle, walk, turnL: turn(1), turnR: turn(-1), rush, toll, leap, enrage, hurt, heavyHit, spawn, death };
export const CLIPS = Object.fromEntries(Object.entries(ALL).map(([k, c]) => [k, BEARD(c)]));
