// The Furnace Knight's moves. Units are model units (the model is 1 tall to the top of its chimney; the page draws it 2.6 u
// tall, CFG.unit). Timings come from the game: FK in src/sim/enemies/champions.js (walk 1.2 u/s; Molten Rush: a 62-tick
// lane at a hero 2.2 to 6.5 u off, then 8.6 u/s down it, a slag pool every 9 ticks, four at most; Grate Blast: a 66-tick
// cone of r 3.8 and 40 degrees each side, 16 and a 1.6 u throw), CHAMPION_RULES in src/sim/champions.js (a 96-tick entrance,
// rage below half health: cooldowns x0.7, speed x1.15), and the beats in render/facet/beats.js (a frame is 1/30 s: strike
// 2.5 frames, contact held 3 frames, spawn grow 7 frames).
// The game's rig holds a long sledge across its body in both fists; the Tripo model rests a short sledge on its right
// shoulder with the right fist on the haft. The sledge is cut free and rides on the chest; the right fist is closed on it
// (a grip), and the left hand takes the haft for the two-handed moves.
// Kesh's rule for humanoids (no splayed feet on the walk) has his exception for heavy characters: he is one. The model's
// boots point straight ahead as sent and are left so.
import * as THREE from 'three';
import { track, gaitFoot, V3, swing, smooth, lerp, clamp, addPose, EASE, frac } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
export const CFG = {
  name: 'furnaceknight', unit: 2.6,
  // the stance he carries everywhere: knees a little bent, the helm a little low, the left fist off his side
  base: { oy: -0.01, hp: -0.03, cp: -0.02, np: 0.04, ulr: 0.06, flp: 0.08 },
  chain: [['hips', 'h'], ['spine', 's'], ['chest', 'c'], ['head', 'n']],
  // the sledge comes before the arms: the right fist is closed on it (a grip), so that arm follows wherever it goes
  extras: [['sledge', 'sg'], ['upperarmL', 'ul'], ['forearmL', 'fl'], ['handL', 'wl'], ['upperarmR', 'ur'], ['forearmR', 'fr'], ['handR', 'wr'], ['skF', 'kf'], ['skB', 'kb']],
  arms: { A: { b: ['upperarmR', 'forearmR', 'handR'], pole: [-0.38, -0.92, -0.04] }, B: { b: ['upperarmL', 'forearmL', 'handL'], pole: [0.5, -0.6, -0.6] } },
  grips: { A: { on: 'sledge' } },
  legs: { L: { kind: 'biped', b: ['thighL', 'shinL', 'footL'] }, R: { kind: 'biped', b: ['thighR', 'shinR', 'footR'] } },
  springs: [{ bone: 'skF', k: 110, c: 7, max: 0.6 }, { bone: 'skB', k: 100, c: 7, max: 0.6 }],
};
const REST = { L: V3(0.165, 0, 0.14), R: V3(-0.13, 0, 0.14) };
const LEGS = ['L', 'R'];
const HEEL = 0.245;                                           // from the back of the heel to the toe (a toes-up foot is lifted so the heel stays up)
const plant = (p) => ({ p: p.clone(), lock: true });
const off = (k, x = 0, y = 0, z = 0) => REST[k].clone().add(V3(x, y, z));
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const allPlanted = () => ({ L: plant(REST.L), R: plant(REST.R) });
const cloth = (front = 0, back = 0) => ({ kfp: front, kbp: -back });
function steps(t, p0, seq) {
  let cur = p0;
  for (const [a, b, to, h, droop] of seq) { if (t < a) return plant(cur); if (t < b) { const s = swing(cur, to, (t - a) / (b - a), h, droop ?? 0.4); if (s.pitch < 0) s.p.y += HEEL * Math.sin(-s.pitch); return { p: s.p, pitch: s.pitch }; } cur = to; }
  return plant(cur);
}

// ---- the sledge. At rest it rides on his chest (on the right shoulder plate) and needs no channels. A move holds it in the
// room instead: g is where the right fist is (root space), el and az aim the haft from the fist towards the head (el up from
// level, az turns it from straight ahead to his left), and face is the way the head's lower striking face points (it is
// squared to the haft). w blends from riding on the chest (0) to held in the room (1).
const GRIP = V3(-0.2307, 0.7194, 0.0736), HEADC = V3(-0.11, 0.868, -0.096);
const HU = V3(0.518, 0.557, -0.649).normalize(), A0 = V3(0.261, -0.884, -0.388);
const HA = V3(-0.298, 0.647, 0.158);                              // the haft's pommel end
const HALF = 0.135;                                               // from the head's middle to either striking face
const rest0 = (() => { const v = A0.clone().sub(HU.clone().multiplyScalar(A0.dot(HU))).normalize(); return new THREE.Matrix4().makeBasis(HU.clone(), v, HU.clone().cross(v)); })();
const dirOf = (el, az) => V3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
function sledgeQ(el, az, face) {
  const u = dirOf(el, az), f = face.clone().sub(u.clone().multiplyScalar(face.dot(u))).normalize();
  const m = new THREE.Matrix4().makeBasis(u, f, u.clone().cross(f)).multiply(rest0.clone().transpose());
  return new THREE.Quaternion().setFromRotationMatrix(m);
}
// the rest aim, so a move can start from where the sledge already is
export const REST_AIM = { el: Math.asin(HU.y), az: Math.atan2(HU.x, HU.z) };
const S0 = { gx: GRIP.x, gy: GRIP.y, gz: GRIP.z, el: REST_AIM.el, az: REST_AIM.az, fx: A0.x, fy: A0.y, fz: A0.z, w: 0, lw: 0 };
const S = (o = {}) => ({ ...S0, ...o });
// where a point of the sledge is (given in the rest model) once it is held as s
export function sledgePoint(s, P) { const q = sledgeQ(s.el, s.az, V3(s.fx, s.fy, s.fz)); return V3(s.gx, s.gy, s.gz).add(P.clone().sub(GRIP).applyQuaternion(q)); }
const LH_T = 0.035;                                               // where the left fist goes on the haft, from the pommel end
const SHL = V3(0.18, 0.72, -0.01);
function sledge(s, body = {}) {
  const q = sledgeQ(s.el, s.az, V3(s.fx, s.fy, s.fz)); const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  const o = { sgT: s.w, sgTa: 1, sgTx: s.gx, sgTy: s.gy, sgTz: s.gz, sgW: s.w, sgWp: -e.x, sgWy: e.y, sgWr: e.z };
  if (s.lw > 0) {                                                 // the left fist on the haft, its wrist a little short of it, towards the shoulder
    const L = sledgePoint(s, HA.clone().add(HU.clone().multiplyScalar(LH_T)));
    const sh = SHL.clone().add(V3(body.ox || 0, body.oy || 0, body.oz || 0)); const d = L.clone().sub(sh).normalize();
    const wv = L.clone().sub(d.multiplyScalar(0.05));
    Object.assign(o, { BW: s.lw, Bx: wv.x, By: wv.y, Bz: wv.z });
  }
  return o;
}
// the sledge's head as a block (rest model: its middle, its three half axes) and the pommel: a held sledge never goes under the floor
const HAX = [[0.261, -0.884, -0.388, 0.135], [0.646, -0.138, 0.75, 0.095], [0.717, 0.446, -0.535, 0.06]].map(([x, y, z, h]) => V3(x, y, z).normalize().multiplyScalar(h));
const CORNERS = (() => { const o = [HA.clone()]; for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) o.push(HEADC.clone().add(HAX[0].clone().multiplyScalar(a)).add(HAX[1].clone().multiplyScalar(b)).add(HAX[2].clone().multiplyScalar(c))); return o; })();
function aboveFloor(s) { const lo = Math.min(...CORNERS.map((P) => sledgePoint(s, P).y)); return lo < 0.001 ? { ...s, gy: s.gy + 0.001 - lo } : s; }
// a key on the sledge that sits its lower face on the floor at (x, z); el, az aim the haft from the fist down to the head (el < 0)
function onFloor(x, z, el, az, o = {}) {
  const face = V3(0, -1, 0); const q = sledgeQ(el, az, face);
  const c = V3(x, HALF, z); const g = c.clone().sub(HEADC.clone().sub(GRIP).applyQuaternion(q));
  return S({ gx: g.x, gy: g.y, gz: g.z, el, az, fx: 0, fy: -1, fz: 0, w: 1, ...o });
}
// the same aim with its fist moved so the head's middle sits at c
function headAt(c, el, az, face, o = {}) {
  const q = sledgeQ(el, az, face); const g = c.clone().sub(HEADC.clone().sub(GRIP).applyQuaternion(q));
  return S({ gx: g.x, gy: g.y, gz: g.z, el, az, fx: face.x, fy: face.y, fz: face.z, w: 1, ...o });
}

// ------------------------------------------------------------------------------------------------ idle
// 6 s. A furnace at rest: slow heavy breath (the grate glows with it on the page), his weight eased from boot to boot, the
// helm turns left and then right, the left fist clenches, and once a loop he lifts the sledge off his shoulder and lets it
// drop back with a clang.
const idle = {
  dur: 6, loop: true, contact: [4.72], kinds: ['clang'],
  pose: (t) => {
    const w = 2 * Math.PI * t / 6, br = Math.sin(2 * w), sw = Math.sin(w);
    const lookL = pulse(t, 0.5, 1.1, 1.9, 2.5), lookR = pulse(t, 2.7, 3.3, 3.8, 4.3), fist = bump(t, 2.4, 0.8);
    const lift = track([[0, { a: 0 }], [4.2, { a: 0 }], [4.58, { a: 1 }], [4.72, { a: -0.08 }, 'in'], [4.9, { a: 0 }], [6, { a: 0 }]])(t).a;
    return addPose(
      { oy: 0.003 * br - 0.006 * bump(t, 4.76, 0.3), cp: 0.02 * br, sp: -0.008 * br, ox: 0.012 * sw, hr: 0.014 * sw, sr: -0.01 * sw, hy: 0.015 * Math.sin(w + 1), cy: 0.03 * lookL - 0.03 * lookR },
      { np: -0.012 * br, ny: 0.34 * lookL - 0.34 * lookR, nr: 0.03 * lookL - 0.03 * lookR },
      { ulr: 0.015 * br + 0.04 * fist, ulp: 0.02 * br, flp: 0.03 * br + 0.2 * fist },
      // the lift: the sledge turns about the fist, its head rising off the shoulder plate
      { sgp: 0.012 * br - 0.12 * lift, sgy: -0.04 * lift, cr: -0.012 * lift },
      cloth(0.02 * br, 0.02 * br),
    );
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ walk and turn
// 1.2 u/s, 1.0 s a cycle (two steps). Heavy: he rolls from boot to boot and sinks onto each, the shoulders roll with the
// stride, the sledge bounces on the shoulder plate and the left arm swings short against it.
const WT = 1.0;
const GAIT = { T: WT, duty: 0.64, v: 1.2 / CFG.unit };
const GF = { L: { phase: 0, n: [0.15, 0.14], lift: 0.042, droop: 0.4, push: 0.24 }, R: { phase: 0.5, n: [-0.125, 0.14], lift: 0.042, droop: 0.4, push: 0.24 } };
const low = (x) => Math.pow(0.5 + 0.5 * x, 1.7);
const walk = {
  dur: WT, loop: true, gait: GAIT,
  pose: (t) => {
    const w = 2 * Math.PI * t / WT, a = w - 2 * Math.PI * 0.32;
    const up = low(Math.cos(2 * a));
    return addPose(
      { oy: -0.028 + 0.016 * up, ox: 0.02 * Math.cos(a), hr: 0.034 * Math.cos(a), hy: 0.07 * Math.sin(a), hp: -0.05 + 0.01 * Math.cos(2 * a + 0.6) },
      { sy: -0.035 * Math.sin(a), sr: -0.02 * Math.cos(a), cy: -0.06 * Math.sin(a), cr: -0.018 * Math.cos(a), np: 0.02 - 0.012 * Math.cos(2 * a), ny: 0.03 * Math.sin(a) },
      { ulp: 0.2 * Math.sin(a), ulr: 0.06, flp: 0.12 + 0.08 * Math.sin(a + 0.5) },
      { sgp: -0.03 * low(Math.cos(2 * a + 0.5)) },
      cloth(0.06 + 0.08 * Math.cos(2 * a + 1.0), 0.06 + 0.07 * Math.cos(2 * a + 2.0)),
    );
  },
  feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, GAIT, GF[k])])),
};
const turn = (dir) => {
  const TT = 0.9; const g = { T: TT, duty: 0.64, v: 0, omega: dir * 2 * Math.PI / 3.6, pivot: [0, 0] };
  const gf = { L: { ...GF.L, lift: 0.032 }, R: { ...GF.R, lift: 0.032 } };
  return {
    dur: TT, loop: true, gait: g,
    pose: (t) => { const w = 2 * Math.PI * t / TT, a = w - 2 * Math.PI * 0.32;
      return addPose({ oy: -0.02 + 0.008 * low(Math.cos(2 * a)), ox: 0.016 * Math.cos(a), hr: 0.024 * Math.cos(a) },
        { sy: 0.04 * dir, cy: 0.07 * dir, ny: 0.26 * dir, nr: 0.02 * dir }, { ulr: 0.09, flp: 0.08 }, cloth(0.04, 0.04)); },
    feet: (t) => Object.fromEntries(LEGS.map((k) => [k, gaitFoot(t, g, gf[k])])),
  };
};

// ------------------------------------------------------------------------------------------------ Molten Rush
// dig (the 62-tick lane: the sledge comes down off the shoulder and across his chest in both fists, head high by his left
// shoulder; he sinks into a ram's crouch and drags the right boot back twice like a bull), charge (8.6 u/s down the lane,
// shoulder first, each boot locked while it is down; the page drops a slag pool every 9 ticks, four at most), braced stop
// (the lead boot dug in, 3 frames and a beat), settle (0.6 s: the sledge goes back on his shoulder).
export const HERO_RUSH_U = 4.5;
const TIPP = 0.7;                                          // how far the sledge tips back on the shoulder in the charge
const MR = { go: 62 / 60, run: 6.5 / 8.6, v: 8.6 / CFG.unit, lane: 6.5 / CFG.unit };
MR.stop = MR.go + MR.run; MR.held = MR.stop + HOLD + 0.1; MR.end = MR.held + 0.6; MR.hit = MR.go + (HERO_RUSH_U - (0.66 + 0.35 + 0.1)) / 8.6;
const mrTravel = (t) => MR.lane * clamp((t - MR.go) / MR.run);
const mrBody = track([[0, { oz: 0 }], [0.4, { oz: -0.03 }], [MR.go - 0.1, { oz: -0.045 }], [MR.go, { oz: -0.05 }], [MR.go + 0.12, { oz: 0.06 }, 'out3'], [MR.stop - 0.05, { oz: 0.06 }], [MR.stop + 0.07, { oz: 0.03 }, 'out'], [MR.held, { oz: -0.02 }], [MR.end - 0.1, { oz: 0 }], [MR.end + 0.3, { oz: 0 }]]);
const RST = 0.15, RDS = 0.075, RUNX = 0.12;
const mrFeet = (() => {
  const zb = (t) => mrTravel(t) + mrBody(t).oz;
  const L0 = off('L', -0.01, 0, 0.05), R0 = off('R', 0, 0, -0.13);
  const seq = { L: [], R: [] }; let k = 'R';
  for (let td = MR.go + 0.05; td < MR.stop - 0.1; td += RST) { seq[k].push([td, td + RDS, V3(k === 'L' ? RUNX : -RUNX, 0, zb(td + RDS / 2) + 0.14)]); k = k === 'L' ? 'R' : 'L'; }
  const brake = k, other = k === 'L' ? 'R' : 'L'; const end = MR.lane; const sx = (q) => (q === 'L' ? 0.15 : -0.125);
  const bz = end + 0.14 + 0.12;
  seq[brake].push([MR.stop - 0.02, 99, V3(sx(brake) * 1.05, 0, bz)]);
  return { seq, L0, R0, brake, other, bz, end, sx };
})();
// where the boots fall (root space at that moment) and when: the page drops the slag pools there
export const RUSH_FALLS = (() => { const o = []; for (const k of LEGS) for (const [td, lo, p] of mrFeet.seq[k]) if (lo < 90) o.push({ t: td, x: p.x, z: p.z }); return o.sort((a, b) => a.t - b.t); })();
function rushFoot(t, k) {
  const { seq, L0, R0, other, end, sx } = mrFeet; const s = seq[k];
  if (t < MR.go) {
    // the dig: the left boot steps ahead, the right is dragged back twice (it scrapes, so it stays low)
    if (k === 'L') return steps(t, REST.L, [[0.1, 0.3, L0, 0.035]]);
    return steps(t, REST.R, [[0.34, 0.52, off('R', 0, 0, -0.07), 0.022, 0.3], [0.56, 0.66, off('R', 0, 0, 0.0), 0.03], [0.68, 0.86, R0, 0.022, 0.3]]);
  }
  let prev = { at: k === 'R' ? MR.go - 0.02 : MR.go + 0.03, p: k === 'L' ? L0 : R0 };
  for (let i = 0; i < s.length; i++) {
    const [td, lo, p] = s[i];
    if (t < td) { if (t < prev.at) return plant(prev.p); const u = (t - prev.at) / (td - prev.at); const sw = swing(prev.p, p, u, 0.07, 1.0); return { p: sw.p, pitch: sw.pitch }; }
    if (t < lo) return { p: p.clone(), lock: true, pitch: 0.2 * smooth((t - td) / (lo - td) * 1.4 - 0.4) };
    prev = { at: lo, p };
  }
  if (k === other) { const to = V3(sx(k), 0, end + 0.14 - 0.08); const a = prev.at, b = MR.stop + 0.08; if (t < b) { const sw = swing(prev.p, to, (t - a) / (b - a), 0.05, 0.8); return { p: sw.p, pitch: sw.pitch }; }
    return steps(t, to, [[MR.held + 0.3, MR.held + 0.48, V3(sx(k), 0, end + 0.14), 0.03]]); }
  return plant(prev.p);
}
const brakeBack = (t, k) => steps(t, V3(mrFeet.sx(k) * 1.05, 0, mrFeet.bz), [[MR.held + 0.06, MR.held + 0.28, V3(mrFeet.sx(k), 0, mrFeet.end + 0.14), 0.035]]);
const molten_rush = {
  dur: MR.end + 0.1, contact: [MR.hit, MR.stop], kinds: ['ram', 'stop'], travel: mrTravel, cues: { lane: [0, MR.go] },
  phases: [['dig', 0], ['charge', MR.go], ['braced stop', MR.stop], ['settle', MR.held]],
  pose: (t) => {
    const LOWK = { oy: -0.06, hp: -0.22, sp: -0.05, cp: -0.06, np: 0.2, hy: 0.2, cy: 0.12, ny: -0.2 };
    const RUN = { oy: -0.07, hp: -0.42, sp: -0.06, cp: -0.05, np: 0.36, hy: 0.28, cy: 0.12, ny: -0.3 };
    const STOP = { oy: -0.08, hp: 0.1, sp: 0.04, cp: 0.04, np: -0.04, hy: 0.1, cy: -0.04 };
    const k = track([[0, {}], [0.3, { oy: -0.03, hp: -0.1, hy: 0.1, cy: 0.05 }], [0.55, LOWK], [MR.go - 0.12, { ...LOWK, oy: -0.065 }], [MR.go, { ...LOWK, oy: -0.07, hp: -0.26 }],
      [MR.go + 0.12, RUN, 'out3'], [MR.stop - 0.04, RUN], [MR.stop + 0.07, STOP, 'out3'], [MR.held, { ...STOP, oy: -0.065, hp: 0.05 }], [MR.held + 0.3, { oy: -0.02, hp: -0.04 }], [MR.end, {}], [MR.end + 0.2, {}]])(t);
    // the sledge stays on his shoulder: tipped back so its head rides low behind him while he charges helm-first
    const tip = track([[0, { a: 0 }], [0.5, { a: 1 }], [MR.stop, { a: 1 }], [MR.stop + 0.08, { a: 0.7 }, 'out'], [MR.held + 0.3, { a: 0 }], [MR.end, { a: 0 }]])(t).a;
    const s = S({ lw: 0 });
    const run = pulse(t, MR.go, MR.go + 0.08, MR.stop - 0.06, MR.stop), ph = 2 * Math.PI * (t - MR.go) / (2 * RST);
    const body = addPose(k, mrBody(t));
    const bob = { oy: 0.012 * run * Math.cos(2 * ph), hr: 0.04 * run * Math.sin(ph), cy: -0.05 * run * Math.sin(ph), ox: 0.008 * run * Math.sin(ph) };
    const pump = run * Math.sin(ph);                              // the left arm pumps with the stride
    return addPose(body, bob, { sgp: TIPP * tip }, cloth(-0.15 * run, 0.7 * run), { ulr: 0.1 + 0.1 * tip, ulp: 0.35 * tip + 0.35 * pump, flp: 0.6 * tip });
  },
  feet: (t) => { const F = {}; for (const k of LEGS) F[k] = (k === mrFeet.brake && t >= MR.held) ? brakeBack(t, k) : rushFoot(t, k); return F; },
};

// ------------------------------------------------------------------------------------------------ Grate Blast
// stoke (the 66-tick cone less one strike: his boots go wide, the sledge swings off his shoulder to hang head-down from his
// right fist, the left arm and both shoulders are thrown back to bare the grate and he rears back as the furnace builds;
// the page brightens the grate all through it), blast (2.5 frames, landing on the cone's tick: he heaves the chest forward
// and the furnace roars out), roar held (3 frames and a short burn), recoil (0.25 s), settle (0.5 s: the sledge back up).
const GB = { heave: 66 / 60 - STRIKE, hit: 66 / 60, held: 66 / 60 + HOLD + 0.18, rec: 66 / 60 + HOLD + 0.43, end: 66 / 60 + HOLD + 0.93 };
const HANG = { gx: -0.265, gy: 0.53, gz: 0.08, el: -1.38, az: 0.2, fx: 0, fy: 0, fz: 1, w: 1, lw: 0 };
const grate_blast = {
  dur: GB.end, contact: [GB.hit], kinds: ['roar'], cues: { cone: [0, GB.hit] },
  phases: [['stoke', 0], ['blast', GB.heave], ['roar held', GB.hit], ['recoil', GB.held], ['settle', GB.rec]],
  pose: (t) => {
    const BACK = { oy: -0.04, oz: -0.03, hp: 0.16, sp: 0.08, cp: 0.12, np: -0.16 };
    const OUT = { oy: -0.06, oz: 0.05, hp: -0.12, sp: -0.12, cp: -0.08, np: 0.12 };
    const k = track([[0, {}], [0.2, { oy: -0.035, hp: -0.04 }], [0.6, { ...BACK, oy: -0.035 }], [GB.heave - 0.1, BACK], [GB.heave, { ...BACK, cp: 0.15, sp: 0.1 }],
      [GB.hit, OUT, 'in'], [GB.held, { ...OUT, oy: -0.065 }], [GB.rec, { ...OUT, oy: -0.05, hp: -0.06 }], [GB.rec + 0.25, { oy: -0.02, hp: -0.03, np: 0.04 }], [GB.end, {}]])(t);
    const s = track([[0, S()], [0.1, S({ w: 1 })], [0.42, S(HANG)], [GB.heave, S({ ...HANG, gz: 0.03, az: 0.35 })], [GB.hit, S({ ...HANG, gz: 0.11, az: 0.15 }), 'in'], [GB.rec, S(HANG)],
      [GB.rec + 0.3, S({ gx: -0.24, gy: 0.64, gz: 0.14, el: 0.6, az: 0.45, fx: 0, fy: -0.6, fz: -1, w: 1 })], [GB.end - 0.05, S({ w: 1 })], [GB.end, S()]])(t);
    const arm = track([[0, { out: 0, back: 0 }], [0.2, { out: 0.1, back: 0 }], [0.6, { out: 0.75, back: 0.55 }], [GB.heave, { out: 0.85, back: 0.65 }], [GB.hit, { out: 0.55, back: 0.1 }, 'in'], [GB.rec, { out: 0.5, back: 0.05 }], [GB.end, { out: 0, back: 0 }]])(t);
    const shake = pulse(t, 0.7, 0.8, GB.heave - 0.03, GB.heave) * Math.sin(64 * t) + pulse(t, GB.hit, GB.hit + 0.03, GB.held - 0.05, GB.held) * Math.sin(80 * t);
    const sq = { ...s, gx: s.gx + (k.ox || 0) * s.w, gy: s.gy + (k.oy || 0) * s.w, gz: s.gz + (k.oz || 0) * s.w };
    return addPose(k, sledge(sq, k), { ulr: arm.out, ulp: -arm.back, flp: 0.25 * arm.back, cr: 0.008 * shake, nr: 0.008 * shake },
      cloth(0.35 * bump(t, GB.hit + 0.05, 0.3), 0.3 * bump(t, GB.hit + 0.08, 0.34)));
  },
  feet: (t) => ({
    L: steps(t, REST.L, [[0.06, 0.26, off('L', 0.04, 0, 0.03), 0.035], [GB.rec + 0.2, GB.rec + 0.4, REST.L, 0.03]]),
    R: steps(t, REST.R, [[0.22, 0.42, off('R', -0.03, 0, -0.07), 0.035], [GB.rec + 0.02, GB.rec + 0.22, REST.R, 0.03]]),
  }),
};

// ------------------------------------------------------------------------------------------------ Rage (a call: the game shows the visor, the cracks and a sound)
// gather (the sledge comes up over his head in both fists, he rears back), slam (2.5 frames: the sledge's head is driven
// into the floor in front of him, knees bent), roar (the helm thrown back, the left arm wide, the right fist on the haft
// of the standing sledge, shaking), square up (the sledge back on his shoulder).
const RG = { gather: 0.42, slam: 0.42 + STRIKE, hold: 1.2, end: 1.75 };
const UP = { gx: -0.08, gy: 0.98, gz: -0.02, el: 1.15, az: 2.6, fx: 0, fy: 0, fz: -1, w: 1, lw: 1 };
const rage = {
  dur: RG.end, contact: [RG.slam], kinds: ['slam'], phases: [['gather', 0], ['slam', RG.gather], ['roar', RG.slam + 0.12], ['squares up', RG.hold]],
  pose: (t) => {
    const IN = { oy: -0.02, hp: 0.16, sp: 0.06, cp: 0.08, np: -0.18 };
    const DOWN = { oy: -0.09, hp: -0.4, sp: -0.06, cp: -0.06, np: 0.24 };
    const ROAR = { oy: -0.06, hp: 0.06, sp: 0.08, cp: 0.14, np: -0.42 };
    const k = track([[0, {}], [RG.gather, IN], [RG.slam, DOWN, 'in'], [RG.slam + HOLD, { ...DOWN, oy: -0.095 }], [RG.slam + 0.24, ROAR, 'out'], [RG.hold, { ...ROAR, oy: -0.055 }], [RG.hold + 0.25, { oy: -0.02, hp: -0.04 }], [RG.end, {}]])(t);
    const slam = onFloor(-0.1, 0.42, -0.95, 0.15, { lw: 1 });
    const stand = onFloor(-0.16, 0.36, -1.25, 0.1, { lw: 0 });
    const s = track([[0, S()], [0.1, S({ w: 1 })], [RG.gather, S(UP)], [RG.slam, slam, 'in'], [RG.slam + HOLD, slam], [RG.slam + 0.22, stand], [RG.hold, stand],
      [RG.hold + 0.3, S({ gx: -0.22, gy: 0.66, gz: 0.15, el: 0.9, az: 0.4, fx: 0, fy: -0.5, fz: -1, w: 1 })], [RG.end - 0.05, S({ w: 1 })], [RG.end, S()]])(t);
    const arm = track([[0, { out: 0, f: 0 }], [RG.slam + 0.05, { out: 0, f: 0 }], [RG.slam + 0.24, { out: 1.0, f: -0.3 }, 'out3'], [RG.hold, { out: 0.95, f: -0.25 }], [RG.end, { out: 0, f: 0 }]])(t);
    const sh = pulse(t, RG.slam + 0.2, RG.slam + 0.28, RG.hold - 0.15, RG.hold), w = 50 * t;
    const sq = { ...s, gx: s.gx + (k.ox || 0) * s.w * 0, gy: s.gy, gz: s.gz };
    return addPose(k, sledge(sq, k), { ulr: arm.out, ulp: arm.f, flp: 0.15 * arm.out },
      { nr: 0.04 * Math.sin(w) * sh, ny: 0.035 * Math.sin(w + 1.3) * sh, cr: 0.018 * Math.sin(w - 0.7) * sh },
      cloth(0.3 * bump(t, RG.slam + 0.06, 0.3), 0.35 * bump(t, RG.slam + 0.08, 0.34)));
  },
  feet: (t) => ({ L: steps(t, REST.L, [[RG.gather - 0.18, RG.slam - 0.01, off('L', 0.01, 0, 0.09), 0.04], [RG.hold + 0.1, RG.hold + 0.3, REST.L, 0.03]]), R: plant(REST.R) }),
};
// the enraged state, played on top of anything (spine, chest, head and arms only): hunched, quick breath, the helm low
const RT = 0.5;
const rageHold = {
  dur: RT, loop: true, upperOnly: true,
  pose: (t) => { const b = Math.sin(2 * Math.PI * t / RT); return { sp: -0.03, cp: -0.06 + 0.025 * b, np: -0.06 - 0.02 * b, ulr: 0.1 + 0.02 * b, flp: 0.2 + 0.03 * b }; },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => track([[0, {}], [0.05, { sp: 0.04, cp: 0.1, cy: 0.08, np: 0.1, ny: 0.24, nr: 0.12, ulr: 0.16, flp: -0.1, sgp: 0.06 }, 'out'], [0.18, { cp: -0.03, ny: -0.04, nr: -0.02, ulr: 0.03 }], [0.42, {}]])(t),
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers him: driven back two short heavy steps, the sledge jolts on his shoulder and the left arm is flung
// wide; he plants himself, shakes the helm and squares up.
const HB = -0.08;
const heavyHit = {
  dur: 1.15, contact: [0], kinds: ['taken'], travel: (t) => HB * EASE.out(clamp(t / 0.32)), phases: [['hit', 0], ['stagger', 0.07], ['shake', 0.44], ['square up', 0.76]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.06, { oz: -0.02, oy: -0.012, hp: 0.18, sp: 0.06, cp: 0.1, cy: -0.14, np: 0.12, ny: -0.34, nr: -0.16, sgp: 0.12, sgy: 0.05 }, 'out'],
      [0.26, { oz: -0.005, oy: -0.055, hp: 0.02, cp: -0.03, cy: -0.05, np: -0.08, ny: -0.14, sgp: -0.04 }],
      [0.46, { oy: -0.05, hp: -0.1, cp: -0.05, np: -0.1 }], [0.78, { oy: -0.02, hp: -0.02, np: 0.02 }], [1.15, {}]])(t);
    const fl = pulse(t, 0, 0.07, 0.3, 0.6), sh = pulse(t, 0.42, 0.5, 0.66, 0.8), w = 36 * (t - 0.42);
    return addPose(k, { ulr: 0.8 * fl, ulp: -0.25 * fl, flp: 0.2 * fl, ny: 0.09 * Math.sin(w) * sh, nr: 0.1 * Math.sin(w + 1.3) * sh, cr: 0.018 * Math.sin(w - 0.6) * sh },
      cloth(0.3 * bump(t, 0.12, 0.3), -0.1 * bump(t, 0.12, 0.3)));
  },
  feet: (t) => ({ R: steps(t, REST.R, [[0.03, 0.17, off('R', 0, 0, HB), 0.03, 0.25]]), L: steps(t, REST.L, [[0.16, 0.32, off('L', 0, 0, HB), 0.028, 0.25]]) }),
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: he comes up out of a crouch like iron being
// drawn from the forge, stands to his full height, lifts the sledge off his shoulder and drops it back with a clang.
const SP = { grow: SPAWN, clang: 1.1 + STRIKE };
const spawn = {
  dur: 1.6, contact: [SP.clang], kinds: ['clang'], scale: (t) => lerp(0.04, 1, EASE.out(clamp(t / SP.grow))), phases: [['grow', 0], ['rise', SP.grow], ['stands', 0.7], ['hefts', 0.85], ['clang', SP.clang]],
  pose: (t) => {
    const LOWP = { oy: -0.1, hp: -0.3, sp: -0.08, cp: -0.05, np: -0.2 };
    const k = track([[0, LOWP], [SP.grow, LOWP], [0.7, { oy: -0.004, hp: 0.04, cp: 0.04, np: 0.1 }], [1.0, { oy: 0.0, hp: 0.06, cp: 0.06, np: 0.12 }],
      [SP.clang, { oy: -0.03, hp: -0.05, cp: -0.03, np: 0.04 }, 'in'], [SP.clang + HOLD, { oy: -0.032, hp: -0.05, cp: -0.03, np: 0.04 }], [1.38, { oy: -0.01, hp: -0.02 }], [1.6, {}]])(t);
    const lift = track([[0, { a: 0 }], [0.85, { a: 0 }], [1.05, { a: 1 }], [SP.clang, { a: -0.08 }, 'in'], [1.3, { a: 0 }], [1.6, { a: 0 }]])(t).a;
    const arm = track([[0, { e: 0.5 }], [SP.grow, { e: 0.5 }], [0.7, { e: 0.1 }], [1.6, { e: 0 }]])(t);
    return addPose(k, { flp: arm.e, sgp: -0.14 * lift, sgy: -0.05 * lift, cr: -0.015 * lift }, cloth(0.1 * bump(t, 0.5, 0.5), 0.15 * bump(t, 0.5, 0.5)));
  },
  feet: allPlanted,
};

// ------------------------------------------------------------------------------------------------ death
// His feet unlock. A jolt; the right fist opens and the sledge drops head-first beside his right boot and falls over;
// both knees give and he comes down kneeling, the left hand on his knee, the helm bowed; the furnace goes out (the page
// cools the glow to dark iron).
const D = { drop: 0.3, land: 0.62, flat: 0.95, knees: 1.15, bow: 1.7, end: 2.6 };
// the sledge lying on the floor at his right side, haft towards him
// (its long side down: the head's middle sits 0.095 up and the haft slopes down from it to the pommel on the floor)
const LAID = (() => { const el = 0.25, az = -1.9; const d = dirOf(0, az); return headAt(V3(-0.5, 0.095, 0.15), el, az, V3(-d.z, 0, d.x), {}); })();
const death = {
  dur: D.end, contact: [D.land, D.knees], kinds: ['clang', 'thud'], phases: [['jolt', 0], ['the sledge drops', D.drop], ['the knees give', D.land], ['kneels', D.knees], ['the furnace goes out', D.knees + 0.15], ['still', D.bow]],
  pose: (t) => {
    const k = track([[0, {}],
      [0.1, { hp: 0.12, cp: 0.08, oy: -0.01, oz: -0.02, np: 0.2, ny: -0.2, nr: -0.1 }, 'out'],
      [D.land, { hp: 0.0, cp: -0.03, oy: -0.04, oz: 0.0, np: -0.06, ny: -0.08 }],
      [D.knees, { hp: -0.02, sp: -0.03, cp: -0.04, oy: -0.15, oz: 0.04, np: -0.05 }, 'in'],
      [D.knees + 0.12, { hp: -0.03, sp: -0.03, cp: -0.06, oy: -0.144, oz: 0.04, np: -0.16 }, 'out'],
      [D.bow, { hp: -0.1, sp: -0.07, cp: -0.1, oy: -0.15, oz: 0.045, np: -0.42, ny: -0.12, nr: -0.04 }],
      [D.end, { hp: -0.11, sp: -0.08, cp: -0.11, oy: -0.152, oz: 0.045, np: -0.46, ny: -0.13, nr: -0.05 }]])(t);
    // the sledge: held, then let go; its head falls to the floor beside the boot, then it topples flat
    const fall = onFloor(-0.36, 0.14, -1.3, -1.2, { w: 1 });
    const s = track([[0, S()], [0.1, S({ w: 1 })], [D.drop, S({ gx: -0.27, gy: 0.6, gz: 0.12, el: 1.2, az: -0.2, fx: 0, fy: -1, fz: 0, w: 1 })], [D.land, fall, 'in'], [D.flat, LAID, 'in'], [D.end, LAID]])(t);
    const rel = t < D.drop ? 0 : 1;                               // the right fist opens: from here the arm reaches for its own points
    const rh = track([[D.drop, { x: -0.255, y: 0.577, z: 0.142 }], [D.drop + 0.25, { x: -0.29, y: 0.49, z: 0.1 }, 'out'], [D.land + 0.15, { x: -0.28, y: 0.45, z: 0.12 }], [D.knees, { x: -0.27, y: 0.39, z: 0.16 }], [D.end, { x: -0.255, y: 0.33, z: 0.2 }]])(t);
    const pole = track([[D.drop, { x: -0.38, y: -0.92, z: -0.04 }], [D.drop + 0.3, { x: -0.4, y: -0.3, z: -0.85 }], [D.end, { x: -0.4, y: -0.3, z: -0.85 }]])(t);
    const kn = smooth((t - D.land) / (D.knees - D.land));
    const arm = track([[0, { out: 0, f: 0 }], [0.1, { out: 0.5, f: -0.2 }], [D.land, { out: 0.15, f: 0 }], [D.knees, { out: 0.05, f: 0.3 }], [D.end, { out: 0.02, f: 0.42 }]])(t);
    return addPose(k, sledge(aboveFloor(s), k), { AG: 1 - rel, AW: rel, Ax: rh.x, Ay: rh.y, Az: rh.z, Aex: pole.x, Aey: pole.y, Aez: pole.z, ulr: arm.out, ulp: arm.f, flp: 0.5 * kn }, cloth(0.45 * kn, 0.45 * kn));
  },
  feet: (t) => {
    const kn = smooth((t - D.land) / (D.knees - D.land)); const F = {};
    for (const k of LEGS) { const sx = k === 'L' ? 1 : -1; const p = REST[k].clone(); p.z += -0.36 * kn; p.x += sx * 0.012 * kn; p.y += 0.036 * kn + 0.02 * Math.sin(Math.PI * kn); F[k] = { p, pitch: 2.4 * kn, lock: t < D.land }; }
    return F;
  },
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), molten_rush, grate_blast, rage, rageHold, hurt, heavyHit, spawn, death };
