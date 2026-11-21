// Page side of every clip: where she stands, her body clips in time, her root moves, the dummies and the effects.
import { FX as FXk } from './wb.js';
const FXa = (A, o) => FXk.arrow(A, o);
const H = (x = -2.5, z = 0, face = 90) => ({ x, z, face });
// dense root keys from a function of u (0..1) and t: for moves whose channels run on different clocks (an arc with a flip inside it)
const c01 = (x) => Math.max(0, Math.min(1, x)), s01 = (x) => { x = c01(x); return x * x * (3 - 2 * x); };
const A_s = (u) => u * u * (3 - 2 * u);
const rk = (t0, t1, f, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, t = t0 + (t1 - t0) * u; return { t: +t.toFixed(4), e: 'lin', ye: 'lin', ...f(u, t) }; });
const fwdPt = (A, t, dist, y = null, deg = 0) => { const a = A.at('nock', t), f = A.fwd(t, deg); return [a.x + f.x * dist, y == null ? a.y : y, a.z + f.z * dist]; };
export const DEFS = {};

// ---------------------------------------------------------------- Shot
DEFS.F1 = { T: 2.4, cam: { x: 0.2, z: 0, w: 7 }, her: H(), seq: [[0.3, 'sPierce']], root: [{ t: 0.3 }, { t: 0.42, sd: -0.3, e: 'out' }],
  dum: [[-0.4, 0.12], [1.0, -0.12], [2.3, 0.1]],
  fx(A) { const t0 = 0.55; const end = (A2) => fwdPt(A2, t0, 5.6);
    A.card.def._arrow = FXa(A, { t: t0, dur: 0.24, to: end(A), len: 1.4, glow: A.C.jade, pierce: [{ d: 0, n: 30 }, { d: 1, n: 30 }, { d: 2, n: 30 }] });
    FXk.helix(A, { t: t0, dur: 0.24, from: (A2) => A2.at('nock', t0), to: end, r: 0.14, turns: 4, strands: 2, hold: 0.08, out: 0.35 });
    FXk.trail(A, { of: 'tipA', t0: 0.6, t1: 0.82, len: 0.12, w: 0.06, op: 0.45 });
    FXk.ring(A, { t: t0, at: (t) => A.at('nock', t0), r0: 0.05, r1: 0.35, dur: 0.2, dir: () => A.fwd(t0), op: 0.6 });
  } };
const P3 = (v) => [v.x, v.y, v.z];
const dumAt = (A, i, t, y = 0.55) => { const p = A.dpos(i, t); return [p.x, p.y + y, p.z]; };

// F2 Power Shot: a tap (24), then the full draw (48, then 10% less each foe)
DEFS.F2 = { T: 4.3, cam: { x: 0.6, z: 0, w: 7.6 }, her: H(-2.8), seq: [[0.3, 'combo1'], [1.5, 'sPower']], root: [{ t: 2.5 }, { t: 2.78, fw: -0.3, e: 'out' }],
  dum: [[-0.3, 0.1], [1.2, -0.15], [2.7, 0.12]],
  fx(A) { A.cap(0.2, 1.4, '轻按：24', 'Tap: 24'); A.cap(1.5, 3.9, '按住 0.8 秒：48', 'Hold 0.8 s: 48');
    FXa(A, { t: 0.52, dur: 0.14, to: { d: 0 }, hits: [{ d: 0, n: 24 }] });
    const tL = 2.5, end = (A2) => fwdPt(A2, tL, 8);
    FXk.suck(A, { t0: 1.65, t1: 2.45, at: (t) => A.at('nock', t), r: 1.5, n: 12, y: 0.03, lift: 1 });
    for (let k = 0; k < 4; k++) FXk.ring(A, { t: 1.7 + k * 0.19, dur: 0.3, at: (t) => A.at('nock', t), r0: 0.7, r1: 0.06, e: 'in', w: 0.3, dir: () => A.fwd(tL), op: 0.55 });
    FXk.helix(A, { t: 1.7, dur: 0.75, from: (A2) => { const n = A2.at('nock', 2.4), f = A2.fwd(2.4); return [n.x + f.x * 0.9, n.y, n.z + f.z * 0.9]; }, to: (A2) => P3(A2.at('nock', 2.4)), r: 0.45, taper: 0.1, turns: 3, strands: 3, hold: 0.05, out: 0.12, op: 0.5 });
    FXa(A, { t: tL, dur: 0.3, to: end(A), len: 2.4, scale: 1.4, w: 0.16, glow: A.C.jade, pierce: [{ d: 0, n: 48, big: true }, { d: 1, n: 43, big: true }, { d: 2, n: 39, big: true }] });
    FXk.tunnel(A, { t: tL, dur: 0.3, n: 7, r: 0.5, from: () => A.at('nock', tL), to: () => new A.THREE.Vector3(...end(A)), life: 0.5 });
    FXk.helix(A, { t: tL, dur: 0.3, from: (A2) => A2.at('nock', tL), to: end, r: 0.26, turns: 5, strands: 2, hold: 0.1, out: 0.4 });
    FXk.tube(A, { t: tL, dur: 0.3, hold: 0.4, out: 0.6, flat: true, w: (u) => 0.5 * (1 - u * 0.6), col: '#BDB6A8', op: 0.35, e: 'lin', pts: (A2) => { const a = A2.at('nock', tL), b = end(A2); return [new A.THREE.Vector3(a.x, 0.02, a.z), new A.THREE.Vector3(b[0], 0.02, b[2])]; } });
    FXk.dust(A, { t: tL, at: (t) => { const r = A.rootAt(t); return new A.THREE.Vector3(r.x, 0, r.z); }, n: 6, dir: [-1, 0], sp: 1 }); A.shake(tL + 0.02, 0.05, 0.2);
  } };

// F3 Hunter's Mark: the swipe, the point, a snap shot (12) and the mark; then her shots take 30% more (16)
DEFS.F3 = { T: 3.8, cam: { x: 0.2, z: 0, w: 6.6 }, her: H(-2.4), seq: [[0.3, 'sMark'], [2.0, 'combo1'], [2.6, 'combo2']],
  dum: [[1.6, 0.1]],
  fx(A) { const tL = 0.86; FXk.trail(A, { of: 'handR', t0: 0.36, t1: 0.52, len: 0.14, w: 0.05, op: 0.6 });
    FXa(A, { t: tL, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 12 }] });
    FXk.reticle(A, { t: tL + 0.1, d: 0, dur: 3.6 - tL });
    FXa(A, { t: 2.22, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 16 }] }); FXa(A, { t: 2.84, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 16 }] });
    A.cap(1.1, 3.6, '受伤加深 30%（3 秒）', 'Takes 30% more for 3 s');
  } };

// F4 Pinning Arrow: a hop, a steep shot into the foe (20, stun), the jade cord ties it to the foe behind: both stunned 1 s
DEFS.F4 = { T: 3.0, cam: { x: 0.2, z: 0, w: 6.6 }, her: H(-2.4), seq: [[0.3, 'sPin']], root: [{ t: 0.42 }, { t: 0.62, y: 0.55, e: 'out' }, { t: 0.8, y: 0, e: 'in' }],
  dum: [[0.4, 0.05], [2.1, 0.2]],
  fx(A) { const tL = 0.62, tH = 0.72;
    FXa(A, { t: tL, dur: 0.1, to: { d: 0, y: 0.15, dx: -0.12 }, len: 0.8, glow: A.C.jade, hits: [{ d: 0, n: 20, stun: 0.75 }] });
    FXk.stuck(A, { t: tH, dur: 1.9, at: (t) => { const p = A.dpos(0, t); return new A.THREE.Vector3(p.x - 0.12, 0.15, p.z); }, dir: [0.75, -0.65, 0], shiver: true });
    FXk.tube(A, { t: tH + 0.02, dur: 0.12, hold: 1.0, out: 0.25, r: 0.025, op: 0.85, e: 'out', pts: () => { const a = A.dpos(0, tH), b = A.dpos(1, tH); const T = A.THREE; return [new T.Vector3(a.x - 0.3, 0.32, a.z), new T.Vector3((a.x + b.x) / 2, 0.75, (a.z + b.z) / 2 + 0.2), new T.Vector3(b.x, 0.6, b.z)]; } });
    FXk.tube(A, { t: tH + 0.14, dur: 0.06, hold: 1.0, out: 0.25, r: 0.03, op: 0.9, e: 'lin', pts: () => { const a = A.dpos(0, tH), b = A.dpos(1, tH); const T = A.THREE; return [new T.Vector3(a.x - 0.3, 0.32, a.z), new T.Vector3(b.x, 0.6, b.z)]; } });
    A.hit(1, tH + 0.16, null, { stun: 1.0 }); A.status(0, tH + 0.16, 'stun', 1.0); A.move(1, tH + 0.16, [-0.25, 0], 0.15, 'out');
    FXk.ring(A, { t: tH, at: (t) => { const p = A.dpos(0, tH); return new A.THREE.Vector3(p.x, 0, p.z); }, r1: 0.8, dur: 0.35 });
    A.cap(0.8, 2.2, '两者都被定住 1 秒', 'Both stunned 1 s');
  } };

// F5 Rapid Fire: ten arrows in 1.5 s at one foe (5 each), the tenth out of a full spin
DEFS.F5 = { hops: [[1.55, 1.8, 0.12]], T: 3.0, cam: { x: 0.3, z: 0, w: 6.6 }, her: H(-2.4), seq: [[0.3, 'sRapid']], root: [{ t: 1.55 }, { t: 1.8, spin: 360, e: 'io2' }],
  dum: [[1.7, 0.05]],
  fx(A) { for (let i = 0; i < 9; i++) FXa(A, { t: 0.3 + 0.20 + i * 0.11, dur: 0.12, to: { d: 0, y: 0.5 + (i % 3) * 0.08, dz: ((i * 37) % 5 - 2) * 0.04 }, len: 0.6, hits: [{ d: 0, n: 5 }] });
    FXa(A, { t: 1.82, dur: 0.12, to: { d: 0 }, len: 0.9, glow: A.C.jade, hits: [{ d: 0, n: 5, big: true }] });
    FXk.trail(A, { of: 'tipA', t0: 1.55, t1: 1.8, len: 0.2, w: 0.08, op: 0.5 }); FXk.trail(A, { of: 'tipB', t0: 1.55, t1: 1.8, len: 0.2, w: 0.08, op: 0.5 });
    FXk.helix(A, { t: 1.95, dur: 0.5, from: (A2) => P3(A2.at('nock', 1.95)), to: (A2) => { const n = A2.at('nock', 1.95); return [n.x - 0.1, n.y + 0.6, n.z]; }, r: 0.06, turns: 2, strands: 1, out: 0.4, op: 0.5 });
  } };

// F6 Kill Shot: the toss and catch, a breath, one white streak (24); on a foe under 30% it is 48, and the kill brings the arrow back
DEFS.F6 = { T: 4.6, cam: { x: 0.2, z: 0, w: 6.6 }, her: H(-2.4), seq: [[0.3, 'sKill'], [2.2, 'sKill']], root: [{ t: 0.3, spin: -60 }, { t: 0.55, spin: 0 }, { t: 2.0, spin: 0 }, { t: 2.2, spin: -60 }, { t: 2.45, spin: 0 }],
  dum: [[1.5, -0.45], [1.6, 0.45, { low: true }]],
  fx(A) { const T = A.THREE;
    for (const [s, d] of [[0.3, 0], [2.2, 1]]) { FXk.toss(A, { t0: s + 0.1, t1: s + 0.31, from: (t) => A.at('handR', t), to: (t) => A.at('nock', t), arc: 0.75, spin: 2.5 }); FXk.dim(A, { t: s + 0.32, d, dur: 0.3 });
      FXa(A, { t: s + 0.48, dur: 0.1, to: { d }, len: 1.6, w: 0.08, col: A.C.parch, hits: [{ d, n: d ? 48 : 24, big: !!d }] }); }
    A.cap(2.0, 4.4, '血量低于 30%：双倍', 'Under 30% health: double'); FXk.fell(A, { t: 2.8, d: 1 });
    FXk.toss(A, { t0: 2.95, t1: 3.2, from: (t) => { const p = A.dpos(1, 2.78); return new T.Vector3(p.x, 0.6, p.z); }, to: (t) => A.at('handR', t), arc: 0.9, spin: 1.5 });
    FXk.trail(A, { of: (t) => { const u = A.clamp((t - 2.95) / 0.25); const p = A.dpos(1, 2.78), h = A.at('handR', t); return new T.Vector3(A.lerp(p.x, h.x, u), A.lerp(0.6, h.y, u) + 0.9 * 4 * u * (1 - u), A.lerp(p.z, h.z, u)); }, t0: 2.95, t1: 3.2, len: 0.2, w: 0.05, op: 0.6 });
    A.cap(3.0, 4.4, '击杀：立即可再用', 'A kill: ready again');
  } };

// F7 Eagle Stance: she kneels, four shots from the stance (19, through one more foe), then springs up
DEFS.F7 = { T: 5.0, cam: { x: 1.2, z: 0, w: 9.6 }, her: H(-3.2), seq: [[0.3, 'sEagleIn'], [0.9, 'sEagleShot'], [1.52, 'sEagleShot'], [2.14, 'sEagleShot'], [2.76, 'sEagleShot'], [3.38, 'sEagleOut']],
  dum: [[2.6, 0.05], [3.8, -0.05]],
  fx(A) { const T = A.THREE;
    FXk.tube(A, { t: 0.75, dur: 0.15, hold: 2.5, out: 0.2, flat: true, w: 0.05, op: 0.45, e: 'lin', pts: (A2) => { const n = A2.at('nock', 1.0), f = A2.fwd(1.0); return [new T.Vector3(n.x + f.x * 0.4, 0.03, n.z + f.z * 0.4), new T.Vector3(n.x + f.x * 7.3, 0.03, n.z + f.z * 7.3)]; } });
    for (const s of [0.9, 1.52, 2.14, 2.76]) { const tL = s + 0.28; FXa(A, { t: tL, dur: 0.2, to: fwdPt(A, tL, 7.4), len: 1.1, pierce: [{ d: 0, n: 19 }, { d: 1, n: 19 }] }); }
    A.cap(0.8, 3.4, '普攻 +60%，射程 +3，多穿一个', 'Basic shots +60%, 3 u farther, through one more');
    FXk.trail(A, { of: 'tipA', t0: 3.5, t1: 3.88, len: 0.2, w: 0.06, op: 0.45 }); FXk.trail(A, { of: 'tipB', t0: 3.5, t1: 3.88, len: 0.2, w: 0.06, op: 0.45 });
  } };

// F8 Skypiercer: up, hanging at full draw while the drill winds, the drill bores 10 u (six hits of 8, small foes carried), the recoil flips her
DEFS.F8 = { T: 4.8, cam: { x: 2.0, z: 0, w: 12 }, her: H(-3.6), seq: [[0.3, 'sSky']],
  root: [{ t: 0.42 }, { t: 0.62, y: 1.05, e: 'out' }, { t: 1.3, y: 1.15 }, { t: 1.36, y: 1.22, fw: -0.15, e: 'out' }, { t: 1.75, y: 0, fw: -0.7, pitch: -360, e: 'in', ye: 'in' }, { t: 4.0, fw: -0.7, pitch: -360 }, { t: 4.6, fw: 0, pitch: -360 }],
  dum: [[-0.6, 0.1], [1.4, -0.2], [3.4, 0.15], [2.4, 1.6]],
  fx(A) { const T = A.THREE, tL = 1.3; const end = () => { const n = A.at('nock', tL), f = A.fwd(tL); return [n.x + f.x * 10, 0.55, n.z + f.z * 10]; };
    // the drill on the string
    const big = A.add(new T.Mesh(A.arrowGeo, A.arrowMat)); big.visible = false;
    A.fx((t) => { big.visible = t > 0.55 && t < tL; if (!big.visible) return; const n = A.at('nock', t), f = A.fwd(t); big.position.set(n.x + f.x * 1.0, n.y, n.z + f.z * 1.0); big.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), f); big.scale.setScalar(2.4 * A.EASE.out(A.clamp((t - 0.55) / 0.2))); });
    FXk.helix(A, { t: 0.6, dur: 0.65, from: (A2) => P3(A2.at('nock', 1.0)), to: (A2) => { const n = A2.at('nock', 1.0), f = A2.fwd(1.0); return [n.x + f.x * 2.3, n.y, n.z + f.z * 2.3]; }, r: 0.4, taper: 0.4, turns: 4, strands: 3, hold: 0.1, out: 0.1, op: 0.6 });
    for (let k = 0; k < 4; k++) FXk.ring(A, { t: 0.65 + k * 0.17, dur: 0.3, at: (t) => { const n = A.at('nock', t), f = A.fwd(t); return new T.Vector3(n.x + f.x * 1.9, n.y, n.z + f.z * 1.9); }, r0: 0.9, r1: 0.1, e: 'in', w: 0.3, dir: () => A.fwd(tL), op: 0.5 });
    // the flight
    const fl = 0.75; const hitsAt = (i) => { const n = A.at('nock', tL), e = end(); const p = A.dpos(i, tL); return A.clamp((p.x - n.x) / (e[0] - n.x)); };
    FXa(A, { t: tL, dur: fl, to: end(), len: 3.0, scale: 3.0, w: 0.3, glow: A.C.jade, path: (p, u, a) => { p.y = A.lerp(a.y, 0.55, Math.min(1, u * 4)); } });
    FXk.helix(A, { t: tL, dur: fl, from: () => { const n = A.at('nock', tL); return [n.x, 0.55, n.z]; }, to: end, r: 0.75, turns: 7, strands: 3, hold: 0.25, out: 0.5, op: 0.55, r2: 0.03 });
    FXk.tunnel(A, { t: tL, dur: fl, n: 9, r: 0.85, from: () => { const n = A.at('nock', tL); return new T.Vector3(n.x, 0.55, n.z); }, to: () => new T.Vector3(...end()), life: 0.55, op: 0.55 });
    for (const i of [0, 1, 2]) { const u = hitsAt(i), th = tL + fl * u; for (let k = 0; k < 6; k++) A.hit(i, th + k * ((tL + fl - th) / 6), 8, { up: k === 0 ? 0.35 : 0 }); A.moveTo(i, th, [end()[0] + 0.3 - i * 0.5, i * 0.25 - 0.25], tL + fl - th + 0.05, 'in'); }
    FXk.dust(A, { t: tL + fl, at: end(), n: 8, sp: 1.6, r: 0.25 }); A.shake(tL + 0.05, 0.06, 0.3);
    A.cap(0.4, 3.0, '满弦：六段各 8，小怪被卷到尽头', 'Full draw: six hits of 8; small foes carried to its end');
  } };
// quick body checks: ?id=pose:<clip>
export const POSE = (clip, T = 2) => ({ T, cam: { x: 0, z: 0, w: 3 }, her: { x: 0, z: 0, face: 60 }, seq: [[0, clip]] });

// ---------------------------------------------------------------- Rain
const ang = (A, t, deg, dist, y) => fwdPt(A, t, dist, y, deg);
DEFS.F9 = { T: 2.6, cam: { x: 0.8, z: 0, w: 8.2 }, her: H(-2.4), seq: [[0.3, 'rVolley']], root: [{ t: 0.62 }, { t: 0.92, spin: 360, e: 'io2' }],
  dum: [[1.1, -0.8], [2.4, 0.0], [1.1, 0.8]],
  fx(A) { const tL = 0.55; narrowFan(A, tL, A.card.dum.map((_, d) => d), 14);
    FXk.trail(A, { of: 'tipA', t0: 0.62, t1: 0.92, len: 0.25, w: 0.07, op: 0.4 }); FXk.trail(A, { of: 'tipB', t0: 0.62, t1: 0.92, len: 0.25, w: 0.07, op: 0.4 });
    A.cap(0.4, 2.4, '窄长扇形三箭，6 u，30°：各 14', 'A long narrow fan of three, 6 u, 30°: 14 each'); } };
// the narrow fan (kit 2.6): three arrows at -15, 0, 15 degrees, 6 u; each pierces the foes on its own line
const narrowFan = (A, tL, ds, n) => [-15, 0, 15].forEach((a) => { const end = ang(A, tL, a, 6.0), nk = A.at('nock', tL); const dx = end[0] - nk.x, dz = end[2] - nk.z, L = Math.hypot(dx, dz);
  const pierce = ds.filter((d) => { const p = A.dpos(d, tL), px = p.x - nk.x, pz = p.z - nk.z; return Math.abs(px * dz - pz * dx) / L < 0.35 && px * dx + pz * dz > 0; }).map((d) => ({ d, n }));
  FXa(A, { t: tL, dur: 0.2, to: end, len: 1.1, pierce }); });

DEFS.F10 = { T: 5.6, cam: { x: 0.4, z: -0.2, w: 7.4 }, her: H(-2.6), seq: [[0.3, 'rRain']], dum: [[0.9, -0.3], [1.5, 0.45], [3.2, 0.3]],
  fx(A) { const T = A.THREE, tL = 0.8, spot = [1.2, 0, 0.0]; FXa(A, { t: tL, dur: 0.3, to: [-1.4, 5.0, 0], len: 1.2, glow: A.C.jade });
    FXk.spark(A, { t: 1.1, at: [-1.4, 5.0, 0], r: 0.25, col: A.C.jade, dur: 0.2 });
    FXk.rain(A, { t0: 1.3, t1: 5.2, at: spot, r: 1.4, rate: 20, h: 4.5, slant: [0.35, 0.15] });
    FXk.ring(A, { t: 1.25, at: spot, r0: 1.3, r1: 1.4, dur: 4.0, w: 0.06, op: 0.35, e: 'lin' });
    for (let k = 0; k < 8; k++) { A.hit(0, 1.5 + k * 0.5, 7); A.hit(1, 1.5 + k * 0.5, 7); }
    A.status(0, 1.5, 'slow', 3.8); A.status(1, 1.5, 'slow', 3.8); A.cap(1.3, 5.3, '4 秒：每半秒 7，减速 25%', '4 s: 7 every half second, slow 25%'); } };

DEFS.F11 = { T: 3.0, cam: { x: 0.4, z: 0, w: 6.8 }, her: H(-2.6), seq: [[0.3, 'rBurst']], dum: [[0.6, 0.6], [1.0, -0.6], [3.0, 0.1]],
  fx(A) { const T = A.THREE, tL = 0.66, land = [0.7, 0.05, 0]; FXk.toss(A, { t0: tL, t1: tL + 0.42, from: (t) => A.at('nock', t), to: land, arc: 1.6, spin: 0 });
    FXk.stuck(A, { t: tL + 0.42, dur: 0.75, at: [land[0], 0.32, land[2]], dir: [0.15, -1, 0], shiver: true });
    for (let k = 0; k < 4; k++) FXk.ring(A, { t: 1.1 + k * 0.1, dur: 0.18, at: [land[0], 0.62, land[2]], r0: 0.35, r1: 0.05, e: 'in', w: 0.4, op: 0.8, dir: () => new T.Vector3(0, 1, 0) });
    const tb = 1.5; FXk.ring(A, { t: tb, at: [land[0], 0, land[2]], r0: 0.2, r1: 1.5, dur: 0.35, w: 0.35 }); FXk.disc(A, { t: tb, at: [land[0], 0, land[2]], r0: 0.3, r1: 1.4, dur: 0.25, op: 0.45 });
    A.hit(0, tb + 0.03, 18, { knock: [0.25, 0.25] }); A.hit(1, tb + 0.03, 18, { knock: [0.25, -0.25] });
    for (let k = 0; k < 6; k++) { const a = k * 60 + 10; const r = a * Math.PI / 180; FXa(A, { t: tb, dur: 0.2, from: [land[0], 0.25, land[2]], to: [land[0] + Math.cos(r) * 3, 0.25, land[2] + Math.sin(r) * 3], len: 0.6, scale: 0.6, w: 0.06 }); }
    A.hit(2, tb + 0.16, 6); A.shake(tb, 0.05, 0.2); A.cap(0.4, 2.8, '18（1.5 u 内），六片碎羽各 6', '18 within 1.5 u, six shards of 6'); } };

DEFS.F12 = { T: 2.8, cam: { x: -0.6, z: 0, w: 6.4 }, her: H(-0.6), seq: [[0.3, 'rWhirl']], root: [{ t: 0.58 }, { t: 0.94, spin: 360, e: 'lin' }],
  dum: [[1.6, 0.3], [-0.8, 1.8], [-2.7, -0.6], [0.2, -1.9]],
  fx(A) { const T = A.THREE; const s0 = 0.58, s1 = 0.94; for (let k = 0; k < 12; k++) { const tk = s0 + (s1 - s0) * k / 12; const f = A.fwd(tk); const n = A.at('chest', tk); const to = [n.x + f.x * 3.2, 0.5, n.z + f.z * 3.2];
      FXa(A, { t: tk, dur: 0.12, from: [n.x, 0.5, n.z], to, len: 0.8, w: 0.07 });
      FXk.tube(A, { t: tk, dur: 0.12, hold: 0.25, out: 0.4, flat: true, w: 0.06, op: 0.45, e: 'lin', pts: () => [new T.Vector3(n.x + f.x * 0.4, 0.03, n.z + f.z * 0.4), new T.Vector3(to[0], 0.03, to[2])] });
      A.card.dum.forEach((dm, i) => { const dx = dm.x - n.x, dz = dm.z - n.z, d = Math.hypot(dx, dz); if (d < 3.2 && (dx * f.x + dz * f.z) / d > 0.966) A.hit(i, tk + 0.12 * d / 3.2, 16); }); }
    FXk.ring(A, { t: s0, at: 'her', r0: 0.5, r1: 3.2, dur: 0.5, w: 0.08, op: 0.5 }); } };

DEFS.F13 = { T: 3.0, cam: { x: 0.9, z: 0, w: 7.0 }, her: H(-2.2, 0, 270), seq: [[0.3, 'rRico']],
  dum: [[-0.2, 0.3], [0.9, -0.6], [1.7, 0.5], [2.6, -0.5], [3.4, 0.4], [3.9, -0.3]],
  fx(A) { const T = A.THREE, tL = 0.58, seg = 0.11; const pts = (t) => [A.at('nock', tL), ...A.card.dum.map((_, i) => { const p = A.dpos(i, tL); return new T.Vector3(p.x, 0.55, p.z); })];
    const P = pts(0); const pos = (t) => { const a = (t - tL) / seg; const i = Math.min(P.length - 2, Math.max(0, Math.floor(a))); const u = A.clamp(a - i); return P[i].clone().lerp(P[i + 1], u); };
    const m = A.add(new T.Mesh(A.arrowGeo, A.arrowMat)); m.scale.setScalar(0.8); m.visible = false;
    A.fx((t) => { m.visible = t >= tL && t <= tL + seg * (P.length - 1); if (!m.visible) return; const p = pos(t), q = pos(t - 0.01); m.position.copy(p); if (p.distanceTo(q) > 1e-4) m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); });
    FXk.trail(A, { of: pos, t0: tL, t1: tL + seg * (P.length - 1), len: 0.3, w: 0.09, op: 0.7, col: A.C.bone });
    for (let i = 0; i < 6; i++) { A.hit(i, tL + seg * (i + 1), 10); FXk.spark(A, { t: tL + seg * (i + 1), at: { d: i }, col: A.C.jade, r: 0.14 }); }
    A.cap(0.4, 2.8, '跳六次，每次 10', 'Six hops, 10 each'); } };

DEFS.F14 = { T: 4.4, cam: { x: 0.6, z: 0, w: 7.2 }, her: H(-2.6), seq: [[0.3, 'rTornado']], dum: [[0.5, -1.4], [2.6, 1.1], [1.5, 1.6], [2.9, -0.9]],
  fx(A) { const T = A.THREE, tL = 0.9, spot = [1.4, 0, 0]; FXk.helix(A, { t: 0.36, dur: 0.3, from: (A2) => { const h = A2.at('handR', 0.5); return [h.x, h.y + 0.15, h.z]; }, to: (A2) => { const h = A2.at('handR', 0.5); return [h.x, h.y - 0.05, h.z]; }, r: 0.08, turns: 5, strands: 1, out: 0.2, op: 0.8 });
    FXa(A, { t: tL, dur: 0.18, to: [spot[0], 0.1, spot[2]], len: 0.9, glow: A.C.jade });
    const t0 = tL + 0.18, t1 = t0 + 2.5; FXk.twister(A, { t0, t1, at: spot, r: 1.0, h: 2.4 }); FXk.ring(A, { col: A.C.jade, t: t0, at: spot, r0: 0.3, r1: 2.0, dur: 0.4, w: 0.12 });
    A.card.dum.forEach((dm, i) => { const dx = spot[0] - dm.x, dz = spot[2] - dm.z, d = Math.hypot(dx, dz); if (d < 2.05) A.move(i, t0 + 0.1, [dx * (1 - 0.7 / d), dz * (1 - 0.7 / d)], 0.7, 'out'); });
    for (let k = 0; k < 6; k++) { const tk = t0 + 0.3 + k * 0.4, i = k % A.card.dum.length; FXa(A, { t: tk, dur: 0.12, from: [spot[0], 1.0, spot[2]], to: { d: i }, len: 0.6, hits: [{ d: i, n: 6 }] }); }
    A.cap(0.4, 4.2, '2.5 秒：拉近敌人，每 0.4 秒射一箭 6', '2.5 s: pulls foes in, an arrow every 0.4 s: 6'); } };

DEFS.F15 = { T: 4.6, cam: { x: -0.6, z: 0, w: 6.2 }, her: H(-2.6), seq: [[0.3, 'castPlant']], root: [{ t: 0.3 }, { t: 0.42, y: 0.12, e: 'out' }, { t: 0.56, y: 0, e: 'in' }],
  dum: [[1.6, 0.0]],
  fx(A) { const T = A.THREE, trap = new T.Vector3(-1.95, 0, 0), t0 = 0.72;
    FXk.stuck(A, { t: t0, dur: 3.6, at: [trap.x, 0.18, trap.z], dir: [0.1, -1, 0] });
    // the briar: a pale vine coiled round the arrow
    FXk.helix(A, { t: t0, dur: 0.25, from: [trap.x, 0.02, trap.z], to: [trap.x, 0.34, trap.z], r: 0.16, turns: 3, strands: 2, hold: 0.9, out: 0.3, col: A.C.bone, op: 0.6 });
    FXk.ring(A, { t: t0, at: trap, r0: 0.2, r1: 0.75, dur: 0.3, w: 0.2, col: A.C.bone, op: 0.6 }); FXk.ring(A, { t: t0 + 0.3, at: trap, r0: 0.74, r1: 0.75, dur: 1.4, w: 0.05, col: A.C.bone, op: 0.35, e: 'lin' });
    // a foe walks onto it
    A.moveTo(0, 1.0, [trap.x + 0.05, 0], 0.9, 'lin'); const ts = 1.9;
    for (let k = 0; k < 7; k++) { const a = k * 0.9; FXk.tube(A, { t: ts + k * 0.015, dur: 0.12, hold: 0.55, out: 0.25, r: 0.03, col: A.C.bone, op: 0.85, e: 'out', pts: () => [new T.Vector3(trap.x + Math.cos(a) * 0.7, 0.02, trap.z + Math.sin(a) * 0.7), new T.Vector3(trap.x + Math.cos(a + 0.6) * 0.55, 0.7, trap.z + Math.sin(a + 0.6) * 0.55), new T.Vector3(trap.x + Math.cos(a + 1.4) * 0.15, 1.15, trap.z + Math.sin(a + 1.4) * 0.15)] }); }
    A.status(0, ts, 'stun', 0.7); for (let k = 0; k < 6; k++) A.hit(0, ts + k * 0.5, 8); A.shake(ts, 0.04, 0.15);
    A.cap(1.9, 4.4, '定住 0.7 秒，3 秒内每半秒 8', 'Stun 0.7 s, 8 every half second for 3 s'); } };

DEFS.F16 = { T: 4.6, cam: { x: 1.8, z: -0.4, w: 11 }, her: H(-3.8), seq: [[0.3, 'run', { loop: true, until: 0.62 }], [0.62, 'rStorm', { fade: 0.06 }]],
  root: [{ t: 0.3 }, { t: 0.62, fw: 1.3, e: 'lin' }, { t: 0.95, fw: 2.1, e: 'out' }],
  dum: [[1.0, -0.4], [3.0, 0.8], [4.6, -0.6], [5.6, 1.4]],
  fx(A) { const T = A.THREE, tL = 0.62 + 0.62; FXa(A, { t: tL, dur: 0.3, to: (() => { const n = A.at('nock', tL); return [n.x + 1.5, 4.2, n.z]; })(), len: 1.2, glow: A.C.jade });
    const ox = A.at('nock', tL).x + 1.0, seam = 1.56; FXk.tube(A, { t: seam, dur: 0.12, hold: 1.1, out: 0.3, r: 0.035, op: 0.8, e: 'out', pts: () => [new T.Vector3(ox + 0.6, 4.2, -2.6), new T.Vector3(ox + 0.6, 4.25, 2.6)] });
    for (let k = 0; k < 8; k++) { const x = ox + 0.2 + k * 1.0, tk = 1.7 + k * 0.12;
      for (let j = 0; j < 6; j++) { const z = -2.3 + j * 0.92 + ((k * 7 + j * 3) % 5 - 2) * 0.05; FXa(A, { t: tk, dur: 0.18, from: [x - 0.6, 3.6, z], to: [x, 0.05, z], len: 1.0, w: 0.06, stick: 0.3 }); }
      FXk.tube(A, { t: tk + 0.18, dur: 0.06, hold: 0.15, out: 0.35, flat: true, w: 0.18, op: 0.4, col: A.C.bone, e: 'lin', pts: () => [new T.Vector3(x, 0.03, -2.5), new T.Vector3(x, 0.03, 2.5)] });
      A.card.dum.forEach((dm, i) => { if (Math.abs(dm.x - x) < 1.4 && Math.abs(dm.z) < 2.5 && (A.card.dum[i].hits.length < 3)) A.hit(i, tk + 0.18, 14); }); }
    A.shake(1.9, 0.03, 0.9); A.cap(1.5, 4.3, '5 u 宽的箭幕向前推进 8 u：三次各 14', 'A curtain 5 u wide sweeps 8 u: three hits of 14'); } };

// ---------------------------------------------------------------- Kata
DEFS.F17 = { T: 2.4, cam: { x: -0.4, z: 0.2, w: 6.4 }, her: H(-2.4), seq: [[0.3, 'castSweep']],
  root: [{ t: 0.95 }, { t: 1.15, fw: -0.18, sd: 0.06, e: 'out' }, { t: 1.6, fw: -0.05, sd: 0, e: 'io2' }],
  dum: [[0.3, -0.7], [0.6, 0.15], [0.4, 0.95]],
  fx(A) { const tL = 0.66; [-24, -12, 0, 12, 24].forEach((a, k) => FXa(A, { t: tL, dur: 0.12, to: ang(A, tL, a, 3.2), len: 0.7, w: 0.07, pierce: k === 1 ? [{ d: 0, n: 9 }] : k === 2 ? [{ d: 1, n: 9 }] : k === 3 ? [{ d: 2, n: 9 }] : [] }));
    A.cap(0.4, 2.2, '近距离散射五箭，3.2 u：各 9', 'Five arrows in a close spray, 3.2 u: 9 each'); } };

DEFS.F18 = { T: 2.8, cam: { x: -0.6, z: 0, w: 6.6 }, her: H(-1.6), seq: [[0.3, 'vault']], root: [{ t: 0.38 }, ...rk(0.38, 0.92, (u) => ({ fw: -1.6 * u, y: 0.7 * 4 * u * (1 - u), pitch: -360 * s01(u / 0.46) }))],
  dum: [[1.6, 0.0]],
  fx(A) { const tL = 0.66; FXa(A, { t: tL, dur: 0.14, to: { d: 0 }, len: 1.0, hits: [{ d: 0, n: 18, slow: 2 }] }); FXk.trail(A, { of: 'footL', t0: 0.7, t1: 0.92, len: 0.18, w: 0.1, op: 0.4 });
    FXk.dust(A, { t: 0.94, at: (t) => { const r = A.rootAt(0.95); return new A.THREE.Vector3(r.x, 0, r.z); }, n: 5, dir: [-1, 0] }); A.cap(0.4, 2.6, '后翻 1.6 u，无敌；18，减速 30%', 'Back flip 1.6 u, untouchable; 18, slow 30%'); } };

DEFS.F19 = { hops: [[0.3, 0.45, 0.06]], T: 3.0, cam: { x: -0.4, z: 0, w: 6.2 }, her: H(-2.2), seq: [[0.3, 'kCrescent']],
  root: [{ t: 0.3 }, { t: 0.45, fw: 0.45, e: 'out' }, { t: 0.5, fw: 0.45, y: 0 }, { t: 0.77, fw: 0.2, y: 1.0, pitch: -180, e: 'out', ye: 'out' }, { t: 1.04, fw: -0.2, y: 0, pitch: -360, e: 'in', ye: 'in' }],
  dum: [[-1.15, -0.33], [-1.17, 0.36], [1.6, 0.2]],
  fx(A) { const T = A.THREE, tk = 0.6; FXk.trail(A, { of: 'footL', of2: 'footR', t0: 0.48, t1: 0.66, len: 0.16, op: 0.75 });
    FXk.trail(A, { of: 'footR', t0: 0.5, t1: 0.66, len: 0.14, w: 0.3, op: 0.5 });
    A.hit(0, tk, 14, { up: 1.0 }); A.hit(1, tk + 0.02, 14, { up: 1.05 });
    FXa(A, { t: 0.77, dur: 0.1, to: { d: 1 }, len: 0.8, hits: [{ d: 1, n: 12 }] });
    FXk.dust(A, { t: 1.04, at: (t) => { const r = A.rootAt(1.05); return new T.Vector3(r.x, 0, r.z); }, n: 6 }); A.cap(0.4, 2.8, '踢起 0.6 秒，空中射一箭 12', 'Launched 0.6 s; one arrow at a launched foe: 12'); } };

DEFS.F20 = { hops: [[0.64, 0.82, 0.1]], T: 3.4, cam: { x: 0.6, z: 0, w: 7.0 }, her: H(-2.4), seq: [[0.3, 'kKnot']], root: [{ t: 0.64 }, { t: 0.82, spin: 360, e: 'io2' }],
  dum: [[1.0, -1.7], [3.4, 1.2], [0.2, 1.4], [3.3, -1.5]],
  fx(A) { const T = A.THREE, spot = new T.Vector3(1.6, 0, 0), tT = 0.92; FXk.trail(A, { of: 'tipA', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 }); FXk.trail(A, { of: 'tipB', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 });
    A.card.dum.forEach((dm, i) => { const p = new T.Vector3(dm.x, 0.55, dm.z); FXk.tube(A, { t: tT + i * 0.02, dur: 0.14, hold: 0.25, out: 0.25, r: 0.025, op: 0.75, e: 'out', pts: (A2) => { const b = A2.at('tipA', tT); const m = b.clone().lerp(p, 0.5); m.y += 0.6; return [b, m, p]; } });
      FXk.helix(A, { t: tT + 0.12, dur: 0.15, from: [dm.x, 0.2, dm.z], to: [dm.x, 0.95, dm.z], r: 0.3, turns: 2, strands: 1, hold: 0.25, out: 0.25, op: 0.7 });
      const to = [spot.x + Math.cos(i * 1.57 + 0.6) * 0.45, spot.z + Math.sin(i * 1.57 + 0.6) * 0.45]; A.moveTo(i, tT + 0.2, to, 0.35, 'in'); A.hit(i, tT + 0.55, 8, { slow: 2 }); FXk.dust(A, { t: tT + 0.25, at: [dm.x, 0, dm.z], n: 4, dir: [spot.x - dm.x, spot.z - dm.z], sp: 1.4 }); });
    FXk.ring(A, { col: A.C.jade, t: tT + 0.55, at: spot, r0: 0.4, r1: 1.2, dur: 0.3, w: 0.3 }); FXk.ring(A, { col: A.C.jade, t: 1.16, at: spot, r0: 0.2, r1: 0.9, dur: 0.25, op: 0.6 });
    A.cap(0.4, 3.2, '4 u 内的敌人被拉到中心：8，减速 40%', 'Foes within 4 u pulled to the centre: 8, slow 40%'); } };

DEFS.F21 = { T: 3.0, cam: { x: -0.6, z: 0, w: 7.4 }, her: H(-0.6), seq: [[0.3, 'kCyclone']], root: [{ t: 0.38 }, { t: 0.44, roll: -18, y: 0.05 }, { t: 1.0, spin: 1080, roll: -18, y: 0.05, e: 'lin' }, { t: 1.16, spin: 1080, roll: 0, y: 0.3 }, { t: 1.38, spin: 1080, y: 0, e: 'in' }],
  dum: [[0.32, 0.2], [-1.3, 0.72], [-0.92, -0.95]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footL', t0: 0.42, t1: 1.12, len: 0.16, w: 0.18, op: 0.6 }); FXk.trail(A, { of: 'footR', t0: 0.42, t1: 1.12, len: 0.16, w: 0.18, op: 0.6 });
    [0.4, 0.7, 1.0].forEach((tk, k) => { FXk.ring(A, { t: tk, at: 'her', r0: 0.6, r1: 1.0 + k * 0.4, dur: 0.35, w: 0.18, op: 0.55 }); [0, 1, 2].forEach((i) => A.hit(i, tk + 0.02 * i, 6, k === 2 ? { knock: (() => { const dm = A.card.dum[i]; const r = A.rootAt(tk); const dx = dm.x - r.x, dz = dm.z - r.z, l = Math.hypot(dx, dz); return [dx / l * 1.0, dz / l * 1.0]; })() } : {})); });
    [0.52, 0.82, 1.12].forEach((tk, k) => FXa(A, { t: tk, dur: 0.1, from: P3(A.at('hips', tk)), to: { d: k }, len: 0.6, hits: [{ d: k, n: 6 }] }));
    A.cap(0.4, 2.8, '三记旋踢各 6，每转一箭 6，最后一脚推开', 'Three spinning kicks of 6, an arrow each turn: 6; the last kick pushes'); } };

DEFS.F22 = { hops: [[0.3, 0.44, 0.06]], T: 2.8, cam: { x: -0.8, z: 0, w: 5.6 }, her: H(-2.4), seq: [[0.3, 'kSweep']], root: [{ t: 0.3 }, { t: 0.44, fw: 0.55, e: 'out' }],
  dum: [[-0.85, 0.05]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'tipB', t0: 0.34, t1: 0.44, len: 0.1, w: 0.16, op: 0.7 }); FXk.trail(A, { of: 'tipA', t0: 0.46, t1: 0.58, len: 0.1, w: 0.16, op: 0.7 });
    A.hit(0, 0.42, 8); A.hit(0, 0.56, 8); const tL = 0.76; FXa(A, { t: tL, dur: 0.05, to: { d: 0 }, len: 0.6, hits: [{ d: 0, n: 14, knock: [2.0, 0], kdur: 0.3, big: true }] });
    FXk.ring(A, { t: tL, at: (t) => A.at('nock', tL), r0: 0.2, r1: 0.8, dur: 0.25, w: 0.3, dir: () => A.fwd(tL) }); FXk.trail(A, { of: 'tipA', t0: 0.86, t1: 1.1, len: 0.15, w: 0.06, op: 0.4 });
    A.cap(0.4, 2.6, '弓击 8、8，近射 14，击退 2 u', 'Bow strikes 8, 8; point-blank arrow 14, 2 u back'); } };

const circ = (t0, t1, r, turns = 1) => { const ks = []; const n = 24; for (let i = 0; i <= n; i++) { const u = i / n, a = u * turns * 6.283; ks.push({ t: t0 + (t1 - t0) * u, fw: Math.sin(a) * r, sd: -(1 - Math.cos(a)) * r, spin: a * 180 / Math.PI, e: 'lin' }); } return ks; };
DEFS.F23 = { T: 4.6, cam: { x: -0.2, z: -1.2, w: 7.2 }, her: H(-2.0, 0.6, 90), seq: [[0.2, 'idle', { from: 5.15, to: 5.55 }], [0.6, 'run', { loop: true, until: 3.6, speed: 1.15 }]],
  root: [{ t: 0.6 }, ...circ(0.6, 3.6, 2.0, 1.0)], dum: [[0.0, -1.4], [3.4, -1.4, { shooter: true }]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footL', t0: 0.6, t1: 3.6, len: 0.3, w: 0.1, op: 0.45 }); FXk.trail(A, { of: 'footR', t0: 0.6, t1: 3.6, len: 0.3, w: 0.1, op: 0.45 });
    for (let k = 0; k < 5; k++) { const tk = 0.9 + k * 0.55; FXa(A, { t: tk, dur: 0.14, to: { d: 0 }, len: 0.8, hits: [{ d: 0, n: 12 }] }); }
    // the dummy shooter's shots pass through her with a puff
    for (let k = 0; k < 3; k++) { const tk = 1.2 + k * 0.8; const sh = A.add(new T.Mesh(new T.SphereGeometry(0.1, 10, 8), new T.MeshBasicMaterial({ color: '#B8141F' }))); sh.visible = false;
      const from = new T.Vector3(3.4, 0.6, -1.4); A.fx((t) => { const a = t - tk; sh.visible = a >= 0 && a <= 0.7; if (!sh.visible) return; const r = A.rootAt(tk + 0.35); const to = new T.Vector3(r.x, 0.6, r.z); const d = to.clone().sub(from); sh.position.copy(from).addScaledVector(d, a / 0.35); });
      FXk.dust(A, { t: tk + 0.35, at: (t) => { const r = A.rootAt(tk + 0.35); return new T.Vector3(r.x, 0.5, r.z); }, n: 5, col: A.C.jade, r: 0.14, op: 0.5, sp: 0.6 }); }
    A.cap(0.6, 3.7, '3 秒：跑速 +40%，敌方子弹穿身而过，边跑边射', '3 s: 40% faster, foe shots pass through her, she shoots at full run'); } };

DEFS.F24 = { T: 3.4, cam: { x: 0.6, z: -1.1, w: 8.2 }, her: H(-2.2), seq: [[0.3, 'kDive']],
  root: [{ t: 0.44 }, { t: 0.75, y: 2.3, fw: 0.9, e: 'out', ye: 'out' }, { t: 0.88, y: 2.45, fw: 1.4, pitch: 95, e: 's' }, { t: 1.27, y: 2.3, fw: 1.9, pitch: 100, spin: 50, e: 'lin' }, { t: 1.58, y: 0, fw: 2.7, pitch: 360 + 360, spin: 50, e: 'in', ye: 'in' }],
  dum: [[0.2, -0.7], [0.75, 0.7], [-0.3, 0.6]],
  fx(A) { const T = A.THREE; for (let i = 0; i < 5; i++) { const tk = 0.3 + 0.60 + i * 0.09, d = i % 3; FXa(A, { t: tk, dur: 0.12, to: { d }, len: 0.9, hits: [{ d, n: 6 }] }); }
    const tl = 1.58; FXk.trail(A, { of: 'footR', t0: 1.4, t1: tl, len: 0.18, w: 0.16, op: 0.6 });
    FXk.ring(A, { t: tl, at: (t) => { const r = A.rootAt(tl); return new T.Vector3(r.x, 0, r.z); }, r0: 0.3, r1: 1.8, dur: 0.4, w: 0.25 }); FXk.dust(A, { t: tl, at: (t) => { const r = A.rootAt(tl); return new T.Vector3(r.x, 0, r.z); }, n: 10, sp: 1.8, rise: 2.5, r: 0.22 });
    [0, 1, 2].forEach((i) => A.hit(i, tl + 0.02, 16, { up: 0.8 })); A.shake(tl, 0.07, 0.25);
    A.cap(0.4, 3.2, '空中五箭各 6，脚跟落地 16（1.8 u），踢起', 'Five arrows of 6 from the air, heel 16 within 1.8 u, launch'); } };

// ---------------------------------------------------------------- passive, basic attack, dash, the two passive skills
const comboShots = (A, s, hitsFn, opt = {}) => { // the passed combo: shots at +0.22 and +0.54, the flat three-arrow shot at +1.00
  const sp = opt.speed || 1, k = (x) => s + x / sp; const [h1, h2, h3] = hitsFn;
  FXa(A, { t: k(0.22), dur: 0.14, to: h1.to, len: 0.8, hits: h1.hits }); FXa(A, { t: k(0.54), dur: 0.14, to: h2.to, len: 0.8, hits: h2.hits });
  if (!opt.gale) [-10, 0, 10].forEach((a, i) => FXa(A, { t: k(1.0), dur: 0.14, to: h3[i] ? h3[i].to : ang(A, k(1.0), a, 4.5), len: 0.8, w: 0.07, hits: h3[i] ? h3[i].hits : [] }));
};
const galeArrow = (A, tL, range, hitsList) => { const end = fwdPt(A, tL, range);
  FXa(A, { t: tL, dur: 0.24, to: end, len: 2.0, scale: 1.8, w: 0.22, glow: A.C.jade, pierce: hitsList });
  FXk.helix(A, { t: tL, dur: 0.24, from: (A2) => A2.at('nock', tL), to: end, r: 0.32, turns: 4, strands: 3, hold: 0.1, out: 0.4, op: 0.6 });
  FXk.tunnel(A, { t: tL, dur: 0.24, n: 6, r: 0.55, from: () => A.at('nock', tL), to: () => new A.THREE.Vector3(...end), life: 0.45 }); A.shake(tL, 0.05, 0.2); };

DEFS.P = { T: 7.4, cam: { x: 0.2, z: 0, w: 7.6 }, her: H(-2.6), seq: [[0.3, 'sPierce'], [1.6, 'rVolley'], [2.9, 'kSweep'], [4.3, 'combo']],
  root: [{ t: 0.3 }, { t: 0.42, sd: -0.3, e: 'out' }, { t: 1.62, sd: -0.3 }, { t: 1.92, sd: -0.3, spin: 360, e: 'io2' }, { t: 2.9, sd: -0.3, spin: 360 }, { t: 3.05, sd: -0.3, fw: 0.35, spin: 360 }, { t: 4.2, sd: 0, fw: 0, spin: 360 }],
  tail: (t) => t < 1.2 ? 0 : t < 2.5 ? 1 : t < 3.8 ? 2 : t < 5.3 ? 3 : 0,
  dum: [[0.0, 0.15], [1.4, -0.1], [2.8, 0.15]],
  fx(A) { FXa(A, { t: 0.55, dur: 0.22, to: fwdPt(A, 0.55, 5.5), len: 1.2, pierce: [{ d: 0, n: 30 }, { d: 1, n: 30 }, { d: 2, n: 30 }] });
    [-18, 0, 18].forEach((a) => FXa(A, { t: 1.85, dur: 0.16, to: ang(A, 1.85, a, 4.8), len: 0.9, pierce: a === 0 ? [{ d: 0, n: 14 }] : [] }));
    A.hit(0, 3.6, 8); A.hit(0, 3.6 + 0.14, 8);
    for (const tk of [1.2, 2.5, 3.8]) FXk.ring(A, { t: tk, at: 'her', r0: 0.3, r1: 0.9, dur: 0.3, w: 0.15, op: 0.5 });
    comboShots(A, 4.3, [{ to: { d: 0 }, hits: [{ d: 0, n: 12 }] }, { to: { d: 0 }, hits: [{ d: 0, n: 12 }] }], { gale: true });
    galeArrow(A, 5.3, 7, [{ d: 0, n: 30, big: true }, { d: 1, n: 30, big: true }, { d: 2, n: 30, big: true }]);
    A.cap(1.2, 2.5, '顺风 1：跑速、攻速 +5%', 'Tailwind 1: +5% run and attack speed'); A.cap(2.5, 3.8, '顺风 2', 'Tailwind 2'); A.cap(3.8, 5.3, '顺风 3：下一套普攻的最后一箭是风矢', 'Tailwind 3: the last shot of her next combo is the Gale Arrow');
    A.cap(5.3, 7.2, '风矢：7 u，穿透所有敌人，30', 'Gale Arrow: 7 u through every foe, 30'); } };

DEFS.GA = { T: 3.6, cam: { x: 0.4, z: 0, w: 7.6 }, her: H(-2.6), seq: [[0.3, 'combo']], tail: (t) => t < 1.3 ? 3 : 0, dum: [[0.0, 0.15], [1.4, -0.1], [2.8, 0.15]],
  fx(A) { comboShots(A, 0.3, [{ to: { d: 0 }, hits: [{ d: 0, n: 12 }] }, { to: { d: 0 }, hits: [{ d: 0, n: 12 }] }], { gale: true });
    galeArrow(A, 1.3, 7, [{ d: 0, n: 30, big: true }, { d: 1, n: 30, big: true }, { d: 2, n: 30, big: true }]); } };

DEFS.B = { T: 2.6, cam: { x: 0.0, z: 0, w: 6.6 }, her: H(-2.4), seq: [[0.3, 'combo']], dum: [[1.3, -0.55], [1.5, 0.1], [1.3, 0.75]],
  fx(A) { comboShots(A, 0.3, [{ to: { d: 1 }, hits: [{ d: 1, n: 12 }] }, { to: { d: 1 }, hits: [{ d: 1, n: 12 }] }, [{ to: { d: 0 }, hits: [{ d: 0, n: 6 }] }, { to: { d: 1 }, hits: [{ d: 1, n: 6 }] }, { to: { d: 2 }, hits: [{ d: 2, n: 6 }] }]]); } };

DEFS.D = { T: 2.6, cam: { x: 0.6, z: 0, w: 7.0 }, her: H(-2.4), seq: [[0.3, 'dash']], root: [{ t: 0.45 }, { t: 1.05, fw: 2.6, e: 's' }], dum: [[2.6, -0.3]],
  fx(A) { const tL = 0.9; [-1, 0, 1].forEach((s, k) => FXa(A, { t: tL, dur: 0.26, to: { d: 0, y: 0.5 + k * 0.1 }, side: s * 0.8, arc: 0.4, len: 0.8, w: 0.07, hits: [{ d: 0, n: 5 }] }));
    FXk.trail(A, { of: 'hips', t0: 0.45, t1: 1.05, len: 0.25, w: 0.25, op: 0.25, col: A.C.bone }); A.cap(0.4, 2.4, '空翻 2.6 u，无敌，三支追踪箭各 5', 'Somersault 2.6 u, untouchable, three homing arrows of 5'); } };

DEFS.F25 = { T: 4.4, cam: { x: 0.2, z: 0, w: 6.6 }, her: H(-1.4), dum: [[1.5, -0.6], [1.9, 0.9], [-3.8, 0.4]],
  fx(A) { const T = A.THREE; const shots = [0.8, 1.8, 2.8, 3.8]; const k = { t0: 0, t1: 9 };
    // she idles; the kestrel circles her and darts a wind feather at the nearest foe within 4 u each second
    const kp = (t) => { const an = t * 2.4; return { x: -1.4 + Math.cos(an) * 1.0, y: 1.5 + 0.1 * Math.sin(t * 5), z: Math.sin(an) * 1.0, yaw: -an }; };
    FXk.kestrel(A, { pos: kp });
    shots.forEach((tk, i) => { const d = i % 2; const p = kp(tk); FXa(A, { t: tk, dur: 0.16, from: [p.x, p.y, p.z], to: { d }, len: 0.6, w: 0.07, col: A.C.jade, hits: [{ d, n: 6 }] }); });
    FXk.ring(A, { t: 0.2, at: [-1.4, 0, 0], r0: 3.98, r1: 4.0, dur: 4.0, w: 0.03, op: 0.25, e: 'lin' }); A.cap(0.2, 4.2, '每秒射 4 u 内最近的敌人：6（4 u 外的不射）', 'Each second it shoots the nearest foe within 4 u: 6'); } };

DEFS.F26 = { T: 3.8, cam: { x: 0.8, z: 0, w: 7.0 }, her: H(-2.4), seq: [[0.3, 'dash'], [1.5, 'combo', { speed: 1.5 }]], root: [{ t: 0.45 }, { t: 1.05, fw: 2.0, e: 's' }], dum: [[2.6, 0.0]],
  fx(A) { const tL = 0.9; [-1, 0, 1].forEach((s, k) => FXa(A, { t: tL, dur: 0.26, to: { d: 0, y: 0.5 + k * 0.1 }, side: s * 0.8, arc: 0.4, len: 0.8, w: 0.07, hits: [{ d: 0, n: 5 }] }));
    comboShots(A, 1.5, [{ to: { d: 0 }, hits: [{ d: 0, n: 14 }] }, { to: { d: 0 }, hits: [{ d: 0, n: 14 }] }, [{ to: { d: 0, y: 0.45 }, hits: [{ d: 0, n: 7 }] }, { to: { d: 0 }, hits: [{ d: 0, n: 7 }] }, { to: { d: 0, y: 0.65 }, hits: [{ d: 0, n: 7 }] }]], { speed: 1.5 });
    A.cap(1.4, 3.6, '之后三次普攻：快 50%，伤害 +20%', 'Her next three basic shots: 50% faster, 20% more'); } };

// ================================================================ style forms: FORMS.de (Deadeye 穿杨), FORMS.vo (Volley 万箭), FORMS.ga (Gale 弓斗)
export const FORMS = { de: {}, vo: {}, ga: {} };
const DE = FORMS.de, VO = FORMS.vo, GA = FORMS.ga;
const jadeRing = (A, t, at, r1 = 0.8) => FXk.ring(A, { t, at, r0: 0.1, r1, dur: 0.3, w: 0.25 });
const footAt = (A, t) => { const r = A.rootAt(t); return new A.THREE.Vector3(r.x, 0, r.z); };
const drawFx = (A, t0, t1, tL) => { FXk.suck(A, { t0, t1, at: (t) => A.at('nock', t), r: 1.5, n: 12, y: 0.03, lift: 1 });
  const n = Math.max(2, Math.round((t1 - t0) / 0.2)); for (let k = 0; k < n; k++) FXk.ring(A, { t: t0 + k * (t1 - t0) / n, dur: 0.3, at: (t) => A.at('nock', t), r0: 0.7, r1: 0.06, e: 'in', w: 0.3, dir: () => A.fwd(tL), op: 0.55 }); };

// ---------------------------------------------------------------- Deadeye: one foe, drawn shots
DE.P = null;
DE.GA = { T: 3.4, cam: { x: 0.4, z: 0, w: 7.6 }, her: H(-2.6), seq: [[0.3, 'sPower']], tail: (t) => t < 1.3 ? 3 : 0, dum: [[0.2, 0.1], [1.6, -0.1], [3.0, 0.15]],
  fx(A) { const tL = 1.3; drawFx(A, 0.45, 1.25, tL);
    FXa(A, { t: tL, dur: 0.12, to: { d: 0 }, len: 2.0, scale: 1.8, w: 0.22, glow: A.C.jade, stick: 0, hits: [{ d: 0, n: 42, big: true, knock: [0.6, 0] }] });
    FXk.helix(A, { t: tL, dur: 0.12, from: (A2) => A2.at('nock', tL), to: (A2) => dumAt(A2, 0, tL + 0.12), r: 0.32, turns: 3, strands: 3, hold: 0.1, out: 0.3, op: 0.6 });
    FXk.stuck(A, { t: tL + 0.12, dur: 1.6, scale: 1.6, at: (t) => { const p = A.dpos(0, t); return new A.THREE.Vector3(p.x - 0.18, 0.6, p.z); }, dir: [1, 0, 0], shiver: true });
    jadeRing(A, tL + 0.12, (t) => { const p = A.dpos(0, tL + 0.12); return new A.THREE.Vector3(p.x, 0, p.z); }, 1.1); A.shake(tL + 0.12, 0.06, 0.25);
    A.cap(0.3, 3.2, '风矢变成满弦一箭：停在第一个敌人身上，42，无视防御', 'Gale Arrow is her next full drawn shot: stops in the first foe, 42, ignoring defence'); } };
DE.B = { T: 3.6, cam: { x: 0.4, z: 0, w: 7.6 }, her: H(-2.8), seq: [[0.3, 'combo1'], [1.2, 'sPower', { speed: 1.07 }]], dum: [[1.4, 0.05], [3.2, -0.05]],
  fx(A) { FXa(A, { t: 0.52, dur: 0.14, to: { d: 0 }, hits: [{ d: 0, n: 12 }] }); A.cap(0.2, 1.2, '轻按：12', 'Tap: 12');
    const tL = 1.2 + 1.0 / 1.07; drawFx(A, 1.35, tL - 0.05, tL);
    FXa(A, { t: tL, dur: 0.24, to: fwdPt(A, tL, 6.5), len: 1.6, glow: A.C.jade, pierce: [{ d: 0, n: 26, big: true }, { d: 1, n: 26, big: true }] });
    A.cap(1.2, 3.4, '按住 0.75 秒：26，射程 6.5 u，多穿一个', 'Hold 0.75 s: 26, reach 6.5 u, through one more foe'); } };
DE.D = { ...DEFS.D, dum: [[2.6, -0.3], [2.2, 1.3]],
  fx(A) { FXk.reticle(A, { t: 0.2, d: 0, dur: 2.2 }); const tL = 0.9; [-1, 0, 1].forEach((s, k) => FXa(A, { t: tL, dur: 0.26, to: { d: 0, y: 0.5 + k * 0.1 }, side: s * 0.8, arc: 0.4, len: 0.8, w: 0.07, hits: [{ d: 0, n: 5 }] }));
    FXk.trail(A, { of: 'hips', t0: 0.45, t1: 1.05, len: 0.25, w: 0.25, op: 0.25, col: A.C.bone }); A.cap(0.4, 2.4, '三支箭都射向光标旁的敌人', 'All three at the foe nearest the pointer'); } };
DE.F8 = { ...DEFS.F8, dum: [[-0.6, 0.1], [1.0, -0.2], [3.4, 0.05, { big: true }]],
  fx(A) { const T = A.THREE, tL = 1.3;
    const big = A.add(new T.Mesh(A.arrowGeo, A.arrowMat)); big.visible = false;
    A.fx((t) => { big.visible = t > 0.55 && t < tL; if (!big.visible) return; const n = A.at('nock', t), f = A.fwd(t); big.position.set(n.x + f.x * 0.8, n.y, n.z + f.z * 0.8); big.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), f); big.scale.set(1.0, 1.0, 2.6 * A.EASE.out(A.clamp((t - 0.55) / 0.2))); });
    for (let k = 0; k < 4; k++) FXk.ring(A, { t: 0.65 + k * 0.17, dur: 0.3, at: (t) => { const n = A.at('nock', t), f = A.fwd(t); return new T.Vector3(n.x + f.x * 1.6, n.y, n.z + f.z * 1.6); }, r0: 0.5, r1: 0.05, e: 'in', w: 0.3, dir: () => A.fwd(tL), op: 0.5 });
    const fl = 0.35, end = dumAt(A, 2, tL + fl, 0.7);
    FXa(A, { t: tL, dur: fl, to: end, len: 3.0, scale: 1.2, w: 0.08, glow: A.C.jade, path: (p, u, a) => { p.y = A.lerp(a.y, 0.7, Math.min(1, u * 3)); } });
    FXk.helix(A, { t: tL, dur: fl, from: () => { const n = A.at('nock', tL); return [n.x, 0.7, n.z]; }, to: end, r: 0.12, turns: 8, strands: 2, hold: 0.2, out: 0.4, op: 0.6 });
    for (let k = 0; k < 6; k++) A.hit(2, tL + fl + k * 0.07, 8); const tb = tL + fl + 0.45; A.hit(2, tb, 24, { big: true });
    FXk.ring(A, { t: tb, at: (t) => { const p = A.dpos(2, tb); return new T.Vector3(p.x, 0, p.z); }, r0: 0.3, r1: 1.8, dur: 0.4, w: 0.3 }); FXk.disc(A, { t: tb, at: (t) => { const p = A.dpos(2, tb); return new T.Vector3(p.x, 0, p.z); }, r0: 0.3, r1: 1.5, dur: 0.25, op: 0.45 }); A.shake(tb, 0.06, 0.3);
    A.cap(0.4, 3.0, '细针：穿过小怪，停在第一个精英或首领身上：六段 8，再爆 24', 'A needle: passes small foes, stops in the first elite or boss: six hits of 8, then a burst of 24'); } };

DE.F22 = { ...DEFS.F22, hops: [], seq: [[0.3, 'dBreak'], [1.3, 'idle', { from: 5.15, fade: 0.25 }]], root: [{ t: 0.3 }, { t: 0.42, fw: 0.55, e: 'out' }, { t: 0.7, fw: 0.72, e: 'out' }, { t: 0.84, fw: 0.38, e: 'out' }], // spec batch 2 DE F22: a hook aside, a planted spear thrust with the bow, plates of light crack, one shot into the crack
 
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'tipB', t0: 0.4, t1: 0.52, len: 0.1, w: 0.16, op: 0.7 }); A.move(0, 0.5, [0, 0.12], 0.12, 'out'); A.hit(0, 0.7, 6, { stop: true }); FXk.trail(A, { of: 'tipA', t0: 0.6, t1: 0.71, len: 0.2, w: 0.1, op: 0.7 }); A.move(0, 0.72, [0.12, 0], 0.15, 'out');
    for (let k = 0; k < 5; k++) { const a = k * 1.256 + 0.4; FXk.tube(A, { t: 0.7, dur: 0.08, hold: 0.25, out: 0.3, r: 0.02, col: A.C.parch, op: 0.85, e: 'out', pts: () => { const c = at0(A, 0, 0.7, 0.75).add(new A.THREE.Vector3(-0.3, 0, 0)); return [c, c.clone().add(new A.THREE.Vector3(-0.05, Math.sin(a) * 0.3, Math.cos(a) * 0.3))]; } }); }
    const tL = 0.96; FXa(A, { t: tL, dur: 0.05, to: { d: 0 }, len: 0.6, glow: A.C.jade, hits: [{ d: 0, n: 34, big: true }] }); FXk.stuck(A, { t: tL + 0.05, dur: 1.5, at: (t) => dumAt(A, 0, t, 0.6), dir: [1, 0, 0], shiver: true });
    FXk.ring(A, { t: tL, at: (t) => dumAt(A, 0, tL, 0.6), r0: 0.2, r1: 0.7, dur: 0.25, w: 0.3, dir: () => A.fwd(tL) }); A.shake(tL, 0.04, 0.15);
    A.cap(0.4, 2.6, '弓勾住敌人，箭用爪子扎进去：34；防御 -30%（4 秒）', 'The bow hooks one foe, she drives the arrow in: 34; its defence is 30% lower for 4 s'); } };
// ---------------------------------------------------------------- Volley: many foes, fans and rains
const fan = (A, t, from, degs, dist, hitsFor, o = {}) => degs.forEach((a, k) => { const f = A.fwd(t, a); const s = Array.isArray(from) ? from : P3(A.at(from || 'nock', t));
  FXa(A, { t: t + (o.stagger || 0) * k, dur: o.dur || 0.16, from: s, to: [s[0] + f.x * dist, o.y != null ? o.y : s[1], s[2] + f.z * dist], len: o.len || 0.8, w: o.w || 0.07, scale: o.scale || 1, glow: o.glow, pierce: hitsFor ? hitsFor(k) : [] }); });
const ringOut = (A, t, at, n, r, o = {}) => { for (let k = 0; k < n; k++) { const an = (k / n) * 6.283 + (o.ph || 0); const c = V3a(A, typeof at === 'function' ? at(t) : at);
  FXa(A, { t, dur: o.dur || 0.2, from: [c.x, o.y || 0.4, c.z], to: [c.x + Math.cos(an) * r, o.y || 0.4, c.z + Math.sin(an) * r], len: o.len || 0.6, w: 0.06, scale: o.scale || 0.8 }); } };
const V3a = (A, v) => v && v.isVector3 ? v : new A.THREE.Vector3(v[0], v[1], v[2]);
const nearHits = (A, at, r, t, n, o = {}) => A.card.dum.forEach((dm, i) => { const p = A.dpos(i, t); const c = V3a(A, at); if (Math.hypot(p.x - c.x, p.z - c.z) <= r) A.hit(i, t + (o.dt || 0), n, o.h || {}); });

VO.GA = { ...DEFS.GA, dum: [[0.0, 0.1], [1.6, -0.9], [1.9, 0.0], [1.6, 0.9]],
  fx(A) { comboShots(A, 0.3, [{ to: { d: 0 }, hits: [{ d: 0, n: 12 }] }, { to: { d: 0 }, hits: [{ d: 0, n: 12 }] }], { gale: true });
    const tL = 1.3; FXa(A, { t: tL, dur: 0.1, to: { d: 0 }, len: 2.0, scale: 1.8, w: 0.22, glow: A.C.jade, hits: [{ d: 0, n: 20, big: true }] });
    const tb = tL + 0.1; FXk.spark(A, { t: tb, at: { d: 0 }, col: A.C.jade, r: 0.35, dur: 0.2 }); const c = dumAt(A, 0, tb);
    [-36, -24, -12, 0, 12, 24, 36].forEach((a, k) => { const r = a * Math.PI / 180; const to = [c[0] + Math.cos(r) * 3.2, 0.55, c[2] + Math.sin(r) * 3.2];
      FXa(A, { t: tb, dur: 0.2, from: c, to, len: 1.0, w: 0.09, col: A.C.jade, glow: A.C.jade, pierce: k === 1 ? [{ d: 1, n: 10 }] : k === 3 ? [{ d: 2, n: 10 }] : k === 5 ? [{ d: 3, n: 10 }] : [] }); });
    A.shake(tb, 0.05, 0.2); A.cap(1.2, 3.4, '风矢在第一个敌人身上碎开（20），七支风箭向后散开：各 10', 'It breaks on the first foe (20) into seven wind arrows fanning out behind: 10 each'); } };
VO.B = { ...DEFS.B, dum: [[1.3, -0.9], [1.6, 0.0], [1.3, 0.9]],
  fx(A) { const s = 0.3; for (const tk of [s + 0.22, s + 0.54]) fan(A, tk, 'nock', [-14, 0, 14], 4.5, (k) => [{ d: k, n: k === 1 ? 12 : 6 }], { len: 0.8 });
    fan(A, s + 1.0, 'nock', [-24, -12, 0, 12, 24], 4.5, (k) => k === 1 ? [{ d: 0, n: 6 }] : k === 2 ? [{ d: 1, n: 6 }] : k === 3 ? [{ d: 2, n: 6 }] : []);
    A.cap(0.3, 2.4, '前两箭各分成三支（12 和两支 6），最后一下五支', 'Shots one and two split in three (12 and two of 6); the last is five arrows'); } };
VO.D = { ...DEFS.D, dum: [[2.4, -1.2], [2.9, 0.0], [2.4, 1.2]],
  fx(A) { const tL = 0.9; [0, 1, 2].forEach((d) => FXa(A, { t: tL, dur: 0.26, to: { d }, side: (d - 1) * 0.6, arc: 0.4, len: 0.8, w: 0.07, hits: [{ d, n: 5 }] }));
    FXk.trail(A, { of: 'hips', t0: 0.45, t1: 1.05, len: 0.25, w: 0.25, op: 0.25, col: A.C.bone }); A.cap(0.4, 2.4, '三支箭射三个敌人', 'Three arrows at three foes'); } };
VO.F7 = { ...DEFS.F7, seq: [[0.3, 'sEagleInVO'], [0.9, 'sEagleShotVO'], [1.52, 'sEagleShotVO'], [2.14, 'sEagleShotVO'], [2.76, 'sEagleShotVO'], [3.38, 'sEagleOut']], cam: { x: 1.2, z: 0, w: 9.6 }, dum: [[2.4, -0.4], [2.9, 0.5], [3.3, -0.3]],
  fx(A) { const T = A.THREE, spot = [2.9, 0, 0]; FXk.ring(A, { t: 0.8, at: spot, r0: 1.48, r1: 1.5, dur: 2.6, w: 0.05, op: 0.4, e: 'lin' });
    for (const s of [0.9, 1.52, 2.14, 2.76]) { const tL = s + 0.28; const n = A.at('nock', tL); FXa(A, { t: tL, dur: 0.18, to: [n.x + 2.4, 4.5, n.z], len: 0.9 });
      FXa(A, { t: tL + 0.3, dur: 0.18, from: [spot[0] - 1.0, 4.5, 0], to: [spot[0], 0.05, 0], len: 1.0, glow: A.C.jade }); FXk.ring(A, { t: tL + 0.48, at: spot, r0: 0.2, r1: 1.5, dur: 0.3, w: 0.3 }); nearHits(A, spot, 1.6, tL + 0.48, 19); }
    A.cap(0.8, 3.4, '她朝天射：每箭落在光标处炸开 1.5 u', 'She aims at the sky: each shot falls as a 1.5 u burst at the pointer'); } };
VO.F11 = { ...DEFS.F11, seq: [[0.3, 'rBurst', { to: 0.5 }], [0.8, 'vSnap']], root: [{ t: 0.8 }, { t: 1.1, spin: 180, e: 'io2' }],
  fx(A) { DEFS.F11.fx(A); const T = A.THREE, tb = 1.5, land = [0.7, 0, 0];
    for (let k = 0; k < 6; k++) { const r = (k * 60 + 10) * Math.PI / 180; const p = [land[0] + Math.cos(r) * 3, 0, land[2] + Math.sin(r) * 3]; const tb2 = tb + 0.22 + (k % 2) * 0.05;
      FXk.ring(A, { t: tb2, at: p, r0: 0.1, r1: 0.7, dur: 0.25, w: 0.3 }); FXk.spark(A, { t: tb2, at: [p[0], 0.3, p[2]], col: A.C.jade, r: 0.18 }); nearHits(A, p, 0.9, tb2, 8); }
    A.cap(1.5, 2.8, '每片碎羽再炸一次：8', 'Each shard bursts again: 8'); } };
VO.F11.fx = ((orig) => function (A) { const keep = A.cap; A.cap = () => {}; orig.call(this, A); A.cap = keep; A.cap(0.4, 2.8, '18（1.5 u 内），六片碎羽各 6，每片再炸 8', '18 within 1.5 u, six shards of 6, each bursts again: 8'); })(VO.F11.fx);
// ---------------------------------------------------------------- Gale: within 3 u, kicks, wind, hip shots (stand-in bodies built from her passed and kata clips)
const offK = (keys, dt) => keys.map((k) => ({ ...k, t: k.t + dt }));
const F19ROOT = DEFS.F19.root.slice(1); // the flip kick: step 0.15, up 0.2 to 0.74 after the clip starts at 0.3
const flipAt = (s) => offK(F19ROOT, s - 0.3);
const toPos = (A, i, xz) => A.moveTo(i, -1, xz, 0.01, 'lin');
const kickRing = (A, t, at, r = 1.0) => { FXk.ring(A, { t, at, r0: 0.2, r1: r, dur: 0.25, w: 0.3 }); FXk.dust(A, { t, at, n: 5, sp: 1.2 }); };
GA.GA = { T: 3.6, cam: { x: -0.2, z: 0, w: 7.2 }, her: H(-1.6), seq: [[0.3, 'combo', { to: 0.9 }], [1.2, 'gButterfly'], [1.82, 'idle', { from: 5.15, fade: 0.25 }]], // spec: the ring is thrown by a butterfly twist, leaving her leg at the flat point
  root: [{ t: 1.2 }, { t: 1.3, fw: 0.15 }, { t: 1.37, fw: 0.3, y: 0.3, pitch: 60, spin: -40, e: 'lin', ye: 'out' }, { t: 1.5, fw: 0.4, y: 0.42, pitch: 78, spin: 180, e: 'lin' }, { t: 1.6, fw: 0.45, y: 0.3, pitch: 40, spin: 330, e: 'lin', ye: 'in' }, { t: 1.67, fw: 0.45, y: 0, pitch: 0, spin: 360, e: 'out', ye: 'in' }], tail: (t) => t < 1.5 ? 3 : 0,
  dum: [[0.6, 0.2], [-0.2, 1.9], [-1.4, -1.9], [1.4, -1.2]],
  fx(A) { comboShots(A, 0.3, [{ to: { d: 0 }, hits: [{ d: 0, n: 12 }] }, { to: { d: 0 }, hits: [{ d: 0, n: 12 }] }], { gale: true });
    const tk = 1.5, c = () => footAt(A, tk); FXk.trail(A, { of: 'footL', of2: 'footR', t0: 1.4, t1: 1.58, len: 0.16, op: 0.75 });
    FXk.ring(A, { t: tk, at: c, r0: 0.3, r1: 3.0, dur: 0.4, w: 0.2 }); FXk.disc(A, { t: tk, at: c, r0: 0.4, r1: 2.8, dur: 0.3, op: 0.35 });
    A.card.dum.forEach((dm, i) => { const p = c(); const an = Math.atan2(dm.z - p.z, dm.x - p.x); A.moveTo(i, tk + 0.03, [p.x + Math.cos(an) * 0.7, p.z + Math.sin(an) * 0.7], 0.25, 'in'); A.hit(i, tk + 0.28, 24, { up: 1.0, big: true }); });
    A.shake(tk, 0.06, 0.25); A.cap(1.2, 3.4, '风矢：蝴蝶转甩出 3 u 的风环，24；敌人被拉到她身边挑飞', 'Gale Arrow: her butterfly twist throws a 3 u ring of wind: 24; the foes are pulled to her and launched'); } };
GA.B = { T: 4.0, cam: { x: -0.6, z: 0, w: 6.0 }, her: H(-2.0), seq: [[0.3, 'kSweep', { to: 0.8 }], [1.0, 'gMule', { to: 0.62 }], [1.6, 'gHipSix', { fade: 0.1 }], [2.2, 'kCrescent', { fade: 0.08 }]], hops: [[0.3, 0.44, 0.06], [1.0, 1.12, 0.08]],
  root: [{ t: 0.3 }, { t: 0.44, fw: 0.45, e: 'out' }, { t: 1.0 }, { t: 1.12, spin: 180, e: 'out' }, { t: 1.15 }, { t: 1.22, fw: 0.6, y: 0.3, pitch: 46, e: 'out', ye: 'out' }, { t: 1.28, fw: 0.6, y: 0.3, pitch: 46 }, { t: 1.5, fw: 0.5, y: 0, pitch: 0, spin: 360, ye: 'in' },
    ...offK(F19ROOT.map((k) => ({ ...k, fw: (k.fw || 0) + 0.5 })), 1.9)], dum: [[-0.8, 0.1]],
  fx(A) { FXk.trail(A, { of: 'tipB', t0: 0.36, t1: 0.46, len: 0.1, w: 0.16, op: 0.7 }); A.hit(0, 0.42, 8); FXa(A, { t: 0.76, dur: 0.05, to: { d: 0 }, len: 0.6, hits: [{ d: 0, n: 8 }] });
    FXk.trail(A, { of: 'footL', of2: 'footR', t0: 1.16, t1: 1.3, len: 0.14, op: 0.7 }); A.hit(0, 1.22, 8, { knock: [0.3, 0], stop: true }); [1.74, 2.06].forEach((t) => FXa(A, { t, dur: 0.05, from: P3(A.at('nock', t)), to: { d: 0 }, len: 0.5, hits: [{ d: 0, n: 5 }] }));
    const tk = 2.5; FXk.trail(A, { of: 'footL', of2: 'footR', t0: 2.4, t1: 2.55, len: 0.16, op: 0.75 }); A.hit(0, tk, 10, { up: 1.0, stop: true }); FXa(A, { t: 2.7, dur: 0.08, to: { d: 0 }, len: 0.6, hits: [{ d: 0, n: 6 }] });
    A.cap(0.3, 3.8, '五拍弓斗术：弓扫 8，胯射 8，后踢 8，两记胯射 5，空翻踢 10 加向下一箭 6', 'Five-beat 弓斗术: bow sweep 8, hip shot 8, back kick 8, two hip shots of 5, flip kick 10 with a shot down 6'); } };
// spec: the dash's somersault ends in a diving flying side kick, angled down (F11's is laid flat)
GA.D = { ...DEFS.D, root: [{ t: 0.45 }, { t: 0.8, fw: 1.7, y: 0.45, pitch: -200, e: 'lin', ye: 'out' }, { t: 0.92, fw: 2.0, y: 0.6, pitch: -360, e: 'lin' }, { t: 0.97, fw: 2.1, y: 0.6, spin: 90, roll: -55, e: 'out' }, { t: 1.12, fw: 2.6, y: 0.12, ye: 'in', e: 'lin' }, { t: 1.18, roll: 0, y: 0, ye: 'out' }, { t: 1.36, fw: 3.0, e: 'out' }, { t: 1.42, spin: 90 }, { t: 1.55, spin: 0, e: 'io2' }], seq: [[0.3, 'dash', { to: 0.75 }], [0.9, 'gSideKick', { from: 0.06, fade: 0.04 }], [1.6, 'idle', { from: 5.15, fade: 0.25 }]], dum: [[1.0, -0.5], [0.8, 0.7]],
  fx(A) { const tL = 0.9; [-1, 0, 1].forEach((s, k) => FXa(A, { t: tL, dur: 0.22, to: { d: k % 2, y: 0.5 + k * 0.1 }, side: s * 0.6, arc: 0.4, len: 0.8, w: 0.07, hits: [{ d: k % 2, n: 5 }] }));
    const tl = 1.12; kickRing(A, tl, () => footAt(A, tl), 1.5); nearHits(A, footAt(A, tl), 1.6, tl + 0.02, 8); A.shake(tl, 0.05, 0.2);
    A.cap(0.4, 2.4, '冲刺最后一记下坠侧踢：1.5 u 内 8', 'It ends in a diving side kick: 8 within 1.5 u'); } };
GA.F7 = { T: 6.0, cam: { x: -0.2, z: 0, w: 9.6 }, her: H(-1.6),
  // kit 2.7 Wind well (Kesh 19 Nov 12:41 SGT): leap, front tuck, heel-first dive; the slam leaves a wind well that stays put 4 s and drags foes in; she runs and shoots freely; then it bursts
  seq: [[0.3, 'gSlam'], [1.55, 'run', { loop: true, until: 3.35, speed: 1.1 }], [3.4, 'combo']],
  root: [{ t: 0.45 }, ...rk(0.45, 1.02, (u) => ({ fw: 1.6 * u, y: 1.5 * 4 * u * (1 - u), pitch: 360 * A_s(u) }), 18),
    ...(() => { const P = (u) => { const th = (-90 + 270 * u) * Math.PI / 180, R = 2.4 * Math.min(1, u / 0.25); return [1.6 + R * Math.cos(th), R * Math.sin(th)]; };
      let prev = 0; const ks = []; for (let i = 0; i <= 28; i++) { const u = i / 28, a = P(u), b = P(Math.min(1, u + 0.01)), c0 = P(Math.max(0, u - 0.01)); let sp = -Math.atan2(b[1] - c0[1], b[0] - c0[0]) * 180 / Math.PI; while (sp - prev > 180) sp -= 360; while (sp - prev < -180) sp += 360; prev = sp;
        ks.push({ t: +(1.55 + 1.8 * u).toFixed(4), fw: a[0], sd: a[1], spin: sp, e: 'lin' }); }
      const last = ks[ks.length - 1].spin, face = Math.round(last / 360) * 360; return [{ t: 1.4 }, ...ks, { t: 3.5, spin: face, e: 'io2' }]; })()],
  dum: [[1.2, 0.0], [2.2, -2.6], [2.6, 1.6], [-1.4, 2.2], [-2.6, -1.3], [0.4, 3.3], [-0.6, -3.2], [4.8, -0.6]],
  fx(A) { const T = A.THREE, c = [0, 0, 0], tS = 1.02, tB = tS + 4.0, rOf = (i, t) => { const p = A.dpos(i, t); return Math.hypot(p.x - c[0], p.z - c[2]); }, an = (i, t) => { const p = A.dpos(i, t); return Math.atan2(p.z - c[2], p.x - c[0]); };
    FXk.trail(A, { of: 'footL', t0: 0.75, t1: tS, len: 0.2, w: 0.12, op: 0.5 }); FXk.trail(A, { of: 'footR', t0: 0.75, t1: tS, len: 0.2, w: 0.12, op: 0.5 });
    FXk.dust(A, { t: tS, at: c, n: 10, sp: 1.6, r: 0.25 }); FXk.ring(A, { t: tS, at: c, r0: 0.2, r1: 1.5, dur: 0.3, w: 0.35 }); A.shake(tS, 0.07, 0.25);
    A.card.dum.forEach((_, i) => { if (rOf(i, tS) <= 1.5) A.hit(i, tS + 0.02, 10, { stun: 0.2 }); });
    // the well: a Wind Jade spiral on the floor where she landed, turning inward; it never follows her
    FXk.twister(A, { t0: tS + 0.1, t1: tB, at: c, r: 1.4, h: 0.5, op: 0.22, riders: 0, col: A.C.jade }); FXk.suck(A, { t0: tS + 0.1, t1: tB, at: [c[0], 0.05, c[2]], r: 4.0, n: 34, y: 0.03, lift: 0.1 });
    FXk.ring(A, { t: tS + 0.1, at: c, r0: 3.95, r1: 4.0, dur: 3.9, w: 0.04, op: 0.25, e: 'lin', col: A.C.jade }); FXk.disc(A, { t: tS + 0.1, at: c, r0: 0.6, r1: 1.2, dur: 3.9, op: 0.1 });
    A.card.dum.forEach((_, i) => { const r = rOf(i, tS + 0.1); if (r > 4.0 || r < 0.8) return; const a = an(i, tS + 0.1), d = Math.min(r - 0.7, 3.9); A.move(i, tS + 0.12, [-Math.cos(a) * d, -Math.sin(a) * d], d / 1.0, 'lin');
      FXk.dust(A, { t: tS + 0.6, at: (t) => { const p = A.dpos(i, t); return new T.Vector3(p.x, 0, p.z); }, n: 3, sp: 0.4 }); FXk.dust(A, { t: tS + 1.8, at: (t) => { const p = A.dpos(i, t); return new T.Vector3(p.x, 0, p.z); }, n: 3, sp: 0.4 }); });
    comboShots(A, 3.4, [{ to: { d: 1 }, hits: [{ d: 1, n: 12 }] }, { to: { d: 2 }, hits: [{ d: 2, n: 12 }] }, [{ to: { d: 3 }, hits: [{ d: 3, n: 6 }] }, { to: { d: 5 }, hits: [{ d: 5, n: 6 }] }, { to: { d: 4 }, hits: [{ d: 4, n: 6 }] }]]);
    // the burst: a jade ring out of the well, 24 to every foe within 3 u, knocked flat for a beat
    FXk.ring(A, { t: tB, at: c, r0: 0.3, r1: 3.2, dur: 0.35, w: 0.4, col: A.C.jade }); FXk.disc(A, { t: tB, at: c, r0: 0.3, r1: 3.0, dur: 0.3, op: 0.35 }); FXk.dust(A, { t: tB, at: c, n: 14, sp: 2.2, r: 0.3 }); A.shake(tB, 0.08, 0.3);
    A.card.dum.forEach((_, i) => { if (rOf(i, tB) <= 3.0) { const a = an(i, tB); A.hit(i, tB + 0.05, 24, { knock: [Math.cos(a) * 1.4, Math.sin(a) * 1.4], kdur: 0.4, up: 0.4, stun: 0.4 }); } });
    A.cap(0.4, 1.6, '跳起俯冲砸地：1.5 u 内各 10，落点留下风井', 'A leap and a dive: 10 within 1.5 u; the slam leaves a wind well'); A.cap(1.6, 4.9, '风井 4 秒：把 4 u 内的敌人每秒拉近 1 u；她自由行动，风不跟着她', 'The well, 4 s: foes within 4 u slide in 1 u a second; she moves freely, the wind stays put'); A.cap(4.9, 5.9, '风井爆开：3 u 内各 24', 'Then it bursts: 24 within 3 u'); } };
GA.F13 = { T: 3.2, cam: { x: 0.2, z: 0, w: 7.6 }, her: H(-2.6), // spec F13: a crouch and spring each time, a stomp, a scissor heel, a cartwheel tap, then a corkscrew over the fourth with an upside-down shot; her path weaves
  seq: [[0.3, 'gRico'], [1.3, 'gAirShot', { fade: 0.03 }]],
  root: [{ t: 0.3 }, { t: 0.43, fw: 0.05 }, { t: 0.52, fw: 0.5, sd: 0.1, y: 1.0, e: 'lin', ye: 'out' }, { t: 0.60, fw: 0.95, sd: 0.2, y: 0.55, e: 'lin', ye: 'in' }, { t: 0.67, fw: 1.0, sd: 0.2, y: 0.55 },
    { t: 0.78, fw: 1.5, sd: 0.0, y: 1.05, e: 'lin', ye: 'out' }, { t: 0.90, fw: 1.97, sd: -0.25, y: 0.55, e: 'lin', ye: 'in' }, { t: 0.97, fw: 2.0, sd: -0.25, y: 0.55, spin: 0 }, { t: 1.0, spin: -90, e: 'out' },
    { t: 1.09, fw: 2.5, sd: 0.0, y: 1.1, roll: 180, e: 'lin', ye: 'out' }, { t: 1.18, fw: 2.95, sd: 0.22, y: 0.62, roll: 360, e: 'lin', ye: 'in' }, { t: 1.2, fw: 2.98, sd: 0.25, y: 0.55 }, { t: 1.27, fw: 3.0, sd: 0.25, y: 0.55, spin: -20, e: 'io2' },
    { t: 1.33, fw: 3.15, sd: 0.2, y: 0.75, spin: 0, ye: 'out' }, { t: 1.47, fw: 3.95, sd: -0.15, y: 1.45, roll: 540, e: 'lin', ye: 'out' }, { t: 1.62, fw: 4.4, sd: -0.15, y: 0.9, roll: 720, e: 'lin', ye: 'in' }, { t: 1.76, fw: 4.6, sd: -0.05, y: 0, ye: 'in' }],
  dum: [[-1.6, 0.2], [-0.6, -0.25], [0.4, 0.25], [1.4, -0.2], [2.9, 0.4]],
  fx(A) { [[0, 0.60, 'footL'], [1, 0.90, 'footR'], [2, 1.20, 'footL'], [3, 1.40, 'footR']].forEach(([k, tk, f], i) => { A.hit(k, tk, 8, { knock: [0.04, i % 2 ? -0.05 : 0.05], stop: true }); kickRing(A, tk, (t) => dumAt(A, k, tk, 0.55), i === 3 ? 0.7 : 0.5); FXk.dust(A, { t: tk, at: (t) => dumAt(A, k, tk, 0.55), n: 4, sp: 0.6, r: 0.08, op: 0.35, seed: 3 + i }); });
    FXk.trail(A, { of: 'footR', t0: 0.4, t1: 0.62, len: 0.2, w: 0.12, op: 0.5 }); FXk.trail(A, { of: 'footL', t0: 0.98, t1: 1.2, len: 0.2, w: 0.12, op: 0.45 }); FXk.trail(A, { of: 'footR', t0: 1.3, t1: 1.62, len: 0.25, w: 0.12, op: 0.5 });
    FXa(A, { t: 1.48, dur: 0.1, to: { d: 4 }, len: 0.9, hits: [{ d: 4, n: 20, big: true }] }); A.shake(1.58, 0.04, 0.15); FXk.dust(A, { t: 1.76, at: () => herAt(A, 1.76), n: 5, sp: 0.9 });
    A.cap(0.3, 3.0, '踩四个头各一脚 8：踩、剪刀脚、侧空翻、螺旋；倒着射最后一个 20', 'Four heads, a kick each (8): stomp, scissor, cartwheel, corkscrew; the last shot upside down: 20'); } };
// ---------------------------------------------------------------- kit 2.5 (19 Nov): the new and changed style forms, built as "New, not passed"
const CRIM = '#B8141F';
const V3b = (A, v) => (v && v.isVector3 ? v.clone() : new A.THREE.Vector3(v[0], v[1], v[2]));
const at0 = (A, i, t, y = 0) => { const p = A.dpos(i, t); return new A.THREE.Vector3(p.x, p.y + y, p.z); };
const herAt = (A, t, y = 0) => { const r = A.rootAt(t); return new A.THREE.Vector3(r.x, y, r.z); };
// a foe's shot: a small Foe Crimson ball with a short tail; o.stop (0..1) is where it stops (caught or blocked)
const foeShot = (A, o) => { const T = A.THREE, m = A.add(new T.Mesh(new T.SphereGeometry(o.r || 0.08, 10, 8), new T.MeshBasicMaterial({ color: CRIM }))); m.visible = false;
  const tr = A.add(new T.Mesh(A.streakGeo, A.mat(CRIM, A.F.STREAK))); tr.visible = false; const us = o.stop != null ? o.stop : 1;
  A.fx((t) => { const a = t - o.t, u = a / o.dur; m.visible = tr.visible = a >= 0 && u <= us + (o.linger || 0); if (!m.visible) return;
    const f = V3b(A, typeof o.from === 'function' ? o.from(o.t) : o.from), e = V3b(A, typeof o.to === 'function' ? o.to(o.t + o.dur) : o.to); const uu = Math.min(u, us);
    const p = f.clone().lerp(e, uu); if (o.ride && u > us) p.copy(V3b(A, o.ride(t))); m.position.copy(p); const q = f.clone().lerp(e, Math.max(0, uu - 0.12)); const L = p.distanceTo(q);
    if (L > 0.02 && u <= us) { tr.position.copy(q); tr.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); tr.scale.set(0.09, 0.09, L); tr.material.uniforms.op.value = 0.55; } else tr.visible = false; }); };
// a foe winding up: a Foe Crimson wedge on the floor growing from it toward a point; broken = it shatters at tb
const windup = (A, i, t0, t1, toward, o = {}) => { const T = A.THREE, p0 = A.dpos(i, t0), d = new T.Vector3(toward[0] - p0.x, 0, toward[1] - p0.z).normalize(), L = o.len || 1.5;
  FXk.tube(A, { t: t0, dur: t1 - t0, hold: o.hold || 0, out: 0.08, flat: true, w: (u) => 0.2 + 0.7 * u, col: CRIM, op: 0.9, e: 'lin', pts: () => [new T.Vector3(p0.x + d.x * 0.3, 0.03, p0.z + d.z * 0.3), new T.Vector3(p0.x + d.x * L, 0.03, p0.z + d.z * L)] });
  if (o.broke != null) { const c = new T.Vector3(p0.x + d.x * L * 0.6, 0.05, p0.z + d.z * L * 0.6); FXk.dust(A, { t: o.broke, at: c, n: 7, col: CRIM, r: 0.08, op: 0.7, sp: 1.8, dur: 0.35 }); FXk.ring(A, { t: o.broke, at: [p0.x, 0, p0.z], r0: 0.2, r1: 0.9, dur: 0.25, w: 0.2 }); } };
// a straight jade thread on (or above) the floor between two points
const thread = (A, a, b, t, o = {}) => FXk.tube(A, { t, dur: o.dur || 0.12, hold: o.hold || 1, out: o.out || 0.3, r: o.r || 0.018, op: o.op || 0.8, col: o.col, e: 'lin', pts: () => { const p = V3b(A, typeof a === 'function' ? a() : a), q = V3b(A, typeof b === 'function' ? b() : b); const m = p.clone().lerp(q, 0.5); m.y -= o.sag || 0; return [p, m, q]; } });
const standFeather = (A, t, at, dur) => FXk.stuck(A, { t, dur, at: [at[0], 0.32, at[2]], dir: [0.02, -1, 0], shiver: true });
const capOnly = (A, fn, caps) => { const keep = A.cap; A.cap = () => {}; fn(A); A.cap = keep; caps.forEach((c) => A.cap(...c)); };

// ------------------------------------------------ Deadeye 穿杨
// DE1 Flank: the line pierces (30); a foe struck in its side or back takes 45
DE.F1 = { T: 2.8, cam: { x: 0.4, z: 0, w: 7.2 }, her: H(-2.6), headMin: 0.02, seq: [[0.3, 'dRoll'], [1.1, 'idle', { from: 5.15, fade: 0.25 }]], root: [{ t: 0.31 }, ...rk(0.31, 0.47, (u) => ({ sd: -1.5 * A_s(u), roll: -360 * u, y: -0.1 * Math.sin(Math.PI * u) }), 10), { t: 0.5, sd: -1.5, roll: -360, y: 0 }], // spec batch 2 DE F1: a shoulder roll sideways to one knee, a canted snap shot, the bow slid behind her back
  dum: [[-0.6, -1.35, { face: 270 }], [0.9, -1.7, { face: 90 }], [2.3, -1.35, { face: 0 }]],
  fx(A) { const T = A.THREE, t0 = 0.7, end = (A2) => fwdPt(A2, t0, 5.6, 0.6);
    FXa(A, { t: t0, dur: 0.24, to: end(A), len: 1.4, glow: A.C.jade, pierce: [{ d: 0, n: 30 }, { d: 1, n: 45, big: true }, { d: 2, n: 45, big: true }] });
    FXk.trail(A, { of: 'tipA', t0: 0.72, t1: 0.94, len: 0.12, w: 0.06, op: 0.45 });
    // a pale arc lights on each foe's back as the arrow passes; a flank hit throws a small spark ring
    [[1, 270], [2, 180]].forEach(([i, back]) => { const dm = A.card.dum[i], a = back * Math.PI / 180, u = (dm.x + 2.6) / 5.6, th = t0 + 0.24 * A.clamp(u);
      FXk.ring(A, { t: th - 0.05, dur: 0.4, at: [dm.x + Math.sin(a) * 0.3, 0.75, dm.z + Math.cos(a) * 0.3], r0: 0.12, r1: 0.4, w: 0.3, op: 0.75, dir: () => new T.Vector3(Math.sin(a), 0, Math.cos(a)) });
      FXk.spark(A, { t: th, at: { d: i }, r: 0.16, col: A.C.jade }); FXk.ring(A, { t: th, dur: 0.3, at: [dm.x, 0.02, dm.z], r0: 0.2, r1: 0.7, w: 0.2 }); });
    A.cap(0.4, 2.6, '正面 30；侧面、背后 45', 'Front 30; side or back 45'); } };

// DE2 Sweet spot: a full draw lets go late (48); the second lets go at the glint: 77, stagger, a frozen beat
DE.F2 = { T: 5.0, cam: { x: 0.6, z: 0, w: 7.6 }, her: H(-2.8), seq: [[0.3, 'sPower', { speed: 0.9 }], [2.5, 'sPower', { speed: 1.0 }]], root: [{ t: 1.41 }, { t: 1.66, fw: -0.3, e: 'out' }, { t: 2.5, fw: -0.3 }, { t: 3.5 }, { t: 3.76, fw: -0.6, e: 'out' }],
  dum: [[1.6, 0.05], [2.4, -0.4]],
  fx(A) { const T = A.THREE; const shot = (s, tL, sweet) => { const head = (t) => { const n = A.at('nock', t), f = A.fwd(t); return new T.Vector3(n.x + f.x * 0.55, n.y, n.z + f.z * 0.55); };
      FXk.suck(A, { t0: s + 0.12, t1: tL - 0.04, at: (t) => A.at('nock', t), r: 1.4, n: 10, y: 0.03, lift: 1 });
      // the ring closing on the arrowhead: it meets the head at the window
      const tw = tL - (sweet ? 0.02 : 0.25); FXk.ring(A, { t: s + 0.2, dur: tw - s - 0.2, at: head, r0: 0.9, r1: 0.1, e: 'lin', w: 0.18, op: 0.6, dir: () => A.fwd(tL) });
      FXk.spark(A, { t: tw, at: head, r: 0.16, col: A.C.parch, dur: 0.14 });
      FXa(A, { t: tL, dur: 0.22, to: { d: 0 }, len: 2.0, scale: 1.3, w: 0.14, glow: A.C.jade, hits: [{ d: 0, n: sweet ? 77 : 48, big: true, stop: sweet, stun: sweet ? 0.5 : 0, knock: sweet ? [0.35, 0] : null }] });
      FXk.tunnel(A, { t: tL, dur: 0.22, n: 6, r: 0.45, from: () => A.at('nock', tL), to: () => at0(A, 0, tL, 0.55), life: 0.45 });
      if (sweet) { FXk.ring(A, { t: tL, at: (t) => A.at('nock', tL), r0: 0.1, r1: 0.9, dur: 0.25, w: 0.35, col: A.C.parch, dir: () => A.fwd(tL) }); A.shake(tL + 0.22, 0.07, 0.25); } };
    shot(0.3, 1.41, false); shot(2.5, 3.5, true);
    A.cap(0.3, 2.3, '满弦后才松手：48', 'Let go after the full draw: 48'); A.cap(2.5, 4.8, '闪光时松手：77，硬直 0.5 秒', 'Let go at the glint: 77, stagger 0.5 s'); } };

// DE3 Bounty: the mark (18, 5 s); when the foe falls to anyone, every cooldown of hers drops 3 s
DE.F3 = { T: 4.0, cam: { x: 0.3, z: 0, w: 6.8 }, her: H(-2.4), seq: [[0.3, 'dBounty'], [1.6, 'combo1'], [2.2, 'combo2'], [2.85, 'dTuck', { fade: 0.05 }]], // spec batch 2 DE F3: a finger frame, a point, a one-motion snap; the last feather tucked behind her ear
  dum: [[1.5, 0.1], [2.6, -0.8]],
  fx(A) { const T = A.THREE, tL = 0.73; FXk.trail(A, { of: 'handR', t0: 0.62, t1: 0.73, len: 0.14, w: 0.05, op: 0.6 });
    FXa(A, { t: tL, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 18 }] }); FXk.reticle(A, { t: tL + 0.1, d: 0, dur: 2.65 - tL });
    FXa(A, { t: 1.82, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 16 }] }); FXa(A, { t: 2.42, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 16, big: true }] }); FXk.fell(A, { t: 2.6, d: 0 });
    // the payout: the three feathers fly to her bow
    for (let k = 0; k < 3; k++) { const t0 = 2.68 + k * 0.05; FXk.trail(A, { of: (t) => { const u = A.clamp((t - t0) / 0.35), p = at0(A, 0, 2.6, 1.2), h = A.at('handL', t); const q = p.clone().lerp(h, A.EASE.in(u)); q.y += 0.6 * 4 * u * (1 - u); q.z += (k - 1) * 0.3 * Math.sin(u * Math.PI); return q; }, t0, t1: t0 + 0.35, len: 0.14, w: 0.07, op: 0.8 }); }
    FXk.ring(A, { t: 3.05, at: 'her', r0: 0.2, r1: 1.0, dur: 0.35, w: 0.25 }); FXk.spark(A, { t: 3.05, at: (t) => A.at('handL', 3.05), r: 0.14, col: A.C.jade });
    A.cap(0.4, 2.6, '悬赏 5 秒，受伤 +30%', 'Bounty 5 s, takes 30% more'); A.cap(2.6, 3.9, '它倒下：她每个技能冷却 −3 秒', 'It falls: every cooldown of hers drops 3 s'); } };

// DE4 Pain link: the pin and the tie; for 4 s half of what one tied foe takes, the other takes too (jade numbers)
DE.F4 = { ...DEFS.F4, T: 4.2, seq: [[0.35, 'dAirShot'], [1.5, 'combo1', { fade: 0.1 }], [2.1, 'combo2'], [2.8, 'combo1']], root: [{ t: 0.44 }, { t: 0.6, y: 1.0, pitch: 45, e: 'out', ye: 'out' }, { t: 0.66, y: 0.98, pitch: 45 }, { t: 0.81, y: 0, pitch: 0, ye: 'in' }], // spec batch 2 DE F4: a 1 u jump, a steep shot down tipped forward, a yank on the cord
  fx(A) { capOnly(A, DEFS.F4.fx, []); const T = A.THREE; const tie = () => { const a = A.dpos(0, 1), b = A.dpos(1, 1); return [new T.Vector3(a.x - 0.3, 0.32, a.z), new T.Vector3(b.x, 0.6, b.z)]; };
    A.move(0, 0.91, [0.06, 0], 0.08, 'out'); A.move(1, 0.91, [-0.06, 0], 0.08, 'out'); FXk.spark(A, { t: 0.92, at: () => tie()[0].clone().lerp(tie()[1], 0.5), r: 0.1, col: A.C.jade });
    thread(A, () => tie()[0], () => tie()[1], 0.95, { hold: 3.0, op: 0.55, r: 0.022 });
    [[1.72, 12], [2.32, 12], [3.02, 12]].forEach(([tr, n]) => { const th = tr + 0.12; FXa(A, { t: tr, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n }] });
      A.hit(1, th + 0.1, n / 2, { col: A.C.jade }); FXk.spark(A, { t: th + 0.02, at: () => tie()[0].clone().lerp(tie()[1], 0.5), r: 0.13, col: A.C.jade });
      FXk.ring(A, { t: th + 0.02, at: () => tie()[0].clone().lerp(tie()[1], 0.5), r0: 0.05, r1: 0.5, dur: 0.25, w: 0.3, dir: () => new T.Vector3(1, 0, 0) }); });
    A.cap(0.8, 1.6, '钉住并连在一起', 'Pinned and tied'); A.cap(1.6, 4.0, '4 秒：一个受到的伤害，另一个也受一半', 'For 4 s: half of what one takes, the other takes too'); } };

// DE5 Split the shaft: four full draws of 8 into the same spot; the fifth splits them: 30, knocked back 1.5 u
DE.F5 = { T: 4.2, cam: { x: 0.4, z: 0, w: 6.8 }, her: H(-2.4), seq: [0, 1, 2, 3, 4].map((i) => [0.3 + i * 0.55, 'combo1', { speed: 0.85, fade: 0.06 }]),
  dum: [[1.6, 0.05]],
  fx(A) { const T = A.THREE; for (let i = 0; i < 4; i++) { const tL = 0.3 + i * 0.55 + 0.26; FXa(A, { t: tL, dur: 0.12, to: { d: 0, y: 0.62, dz: 0, dx: 0 }, stick: 2.7 - tL, len: 0.6, hits: [{ d: 0, n: 8 }] }); FXk.ring(A, { t: tL + 0.12, at: (t) => at0(A, 0, t, 0.62), r0: 0.05, r1: 0.25, dur: 0.18, w: 0.4, dir: () => new T.Vector3(1, 0, 0) }); }
    const t5 = 0.3 + 4 * 0.55 + 0.26; FXa(A, { t: t5, dur: 0.12, to: { d: 0, y: 0.62 }, len: 1.2, glow: A.C.jade, hits: [{ d: 0, n: 30, big: true, stop: true, knock: [1.5, 0], kdur: 0.3 }] });
    // the four split shafts burst out like petals
    [[0, 1], [0, -1], [1, 0.6], [1, -0.6]].map(([y, z]) => [0.55, y * 0.6 - 0.1, z * 0.6]).forEach((d, k) => FXa(A, { t: t5 + 0.12, dur: 0.22, from: P3(at0(A, 0, t5 + 0.12, 0.62)), to: P3(at0(A, 0, t5 + 0.12, 0.62).add(new T.Vector3(...d).multiplyScalar(1.6))), len: 0.5, scale: 0.6, w: 0.06, ease: 'out' }));
    FXk.spark(A, { t: t5 + 0.12, at: () => at0(A, 0, t5 + 0.12, 0.62), r: 0.2, col: A.C.parch }); A.shake(t5 + 0.12, 0.05, 0.2);
    A.cap(0.4, 2.6, '四次满弦射同一点：各 8', 'Four full draws into one spot: 8 each'); A.cap(2.6, 4.0, '第五箭劈开它们：30，击退 1.5 u', 'The fifth splits them: 30, knocked back 1.5 u'); } };

// DE6 Execute: a small foe under 15% falls outright; a boss under 30% takes triple (72)
DE.F6 = { T: 4.4, cam: { x: 0.5, z: 0, w: 7.2 }, her: H(-2.4), seq: [[0.3, 'sKill'], [2.2, 'sKill']], root: [{ t: 0.3, spin: -60 }, { t: 0.55, spin: 0 }, { t: 2.0, spin: 0 }, { t: 2.2, spin: -60 }, { t: 2.45, spin: 18 }],
  dum: [[1.2, -0.5], [2.6, 0.9, { big: true }]],
  fx(A) { for (const [s, d] of [[0.3, 0], [2.2, 1]]) { FXk.toss(A, { t0: s + 0.1, t1: s + 0.31, from: (t) => A.at('handR', t), to: (t) => A.at('nock', t), arc: 0.75, spin: 2.5 }); FXk.dim(A, { t: s + 0.32, d, dur: 0.3, r: d ? 1.8 : 1.4 });
      FXa(A, { t: s + 0.48, dur: 0.1, to: { d }, len: 1.6, w: 0.08, col: A.C.parch, stick: d ? 1.1 : 0.9, hits: [{ d, n: d ? 72 : null, big: true, stop: true, crit: false }] }); }
    // the felled foe stands pinned a beat, then folds
    FXk.ring(A, { t: 0.88, at: { d: 0 }, r0: 0.6, r1: 0.1, e: 'in', dur: 0.2, w: 0.3 }); FXk.fell(A, { t: 1.15, d: 0 });
    A.cap(0.4, 2.0, '小怪、精英血量低于 15%：直接倒下', 'A small foe or elite under 15%: it falls'); A.cap(2.1, 4.2, '冠军、首领低于 30%：三倍，72', 'A champion or boss under 30%: triple, 72'); } };

// DE7 Push-back: the stance; each shot knocks its foe back 0.6 u and slows it; a foe walking in never gets close
DE.F7 = { ...DEFS.F7, seq: [[0.3, 'sEagleInDE'], [0.9, 'sEagleShotDE'], [1.52, 'sEagleShotDE'], [2.14, 'sEagleShotDE'], [2.76, 'sEagleShotDE'], [3.38, 'sEagleOut']], dum: [[2.8, 0.3], [3.9, -1.0]],
  fx(A) { const T = A.THREE; FXk.tube(A, { t: 0.75, dur: 0.15, hold: 2.5, out: 0.2, flat: true, w: 0.05, op: 0.45, e: 'lin', pts: (A2) => { const n = A2.at('nock', 1.0), f = A2.fwd(1.0); return [new T.Vector3(n.x + f.x * 0.4, 0.03, n.z + f.z * 0.4), new T.Vector3(n.x + f.x * 7.3, 0.03, n.z + f.z * 7.3)]; } });
    const shots = [0.9, 1.52, 2.14, 2.76].map((s) => s + 0.28);
    // the foe walks in between shots; each shot skids it back
    A.moveTo(1, 0.5, [2.9, -0.45], 0.9, 'lin'); shots.forEach((tL, k) => { const d = k % 2 ? 1 : 0; if (k < 3) A.move(d, tL + 0.22, [-0.55, 0], 0.5, 'lin');
      FXa(A, { t: tL, dur: 0.16, to: { d }, len: 1.1, hits: [{ d, n: 19, knock: [0.6, 0], kdur: 0.25, slow: 0.5 }] }); FXk.dust(A, { t: tL + 0.18, at: () => at0(A, d, tL + 0.3), n: 5, dir: [1, 0], sp: 1.2 }); });
    A.cap(0.8, 3.4, '每一箭：击退 0.6 u，减速 50%（0.5 秒）', 'Each shot: knocked 0.6 u back, slowed 50% for 0.5 s'); } };

// DE9 Interrupt: three foes winding up; three snap shots break the three wind-ups: 20 each
DE.F9 = { T: 2.8, cam: { x: 0.2, z: 0, w: 7.0 }, her: H(-2.4), seq: [[0.3, 'dInterrupt'], [1.1, 'idle', { from: 5.15, fade: 0.25 }]], // spec batch 2 DE F9: three draws from three stances (hip, knee, pivot), head still
  root: [{ t: 0.3, spin: -22 }, { t: 0.48, spin: -22 }, { t: 0.52, spin: 0 }, { t: 0.68, spin: 0 }, { t: 0.74, spin: 22 }, { t: 1.0, spin: 22 }, { t: 1.3, spin: 0 }],
  dum: [[1.0, 1.4], [1.8, 0.0], [1.1, -1.5]],
  fx(A) { [0, 1, 2].forEach((i) => { const tL = [0.46, 0.66, 0.88][i]; windup(A, i, 0.1, tL + 0.12, [-2.4, 0], { broke: tL + 0.12, len: 1.4 });
      FXa(A, { t: tL, dur: 0.12, to: { d: i }, len: 0.9, hits: [{ d: i, n: 20, stop: true }] }); A.status(i, tL + 0.12, 'stun', 0.3); });
    A.cap(0.1, 2.6, '三箭打断三个前摇：各 20', 'Three arrows break three wind-ups: 20 each'); } };

// DE10 Sky Bolt: no rain; a reticle, and 1.5 s later one giant arrow: 70 at the centre, less to 1.5 u
DE.F10 = { T: 4.0, cam: { x: 0.4, z: 0, w: 7.2 }, her: H(-2.6), seq: [[0.3, 'rRain', { to: 0.95, hold: true }], [2.6, 'idle']],
  dum: [[2.6, -0.9], [1.6, 0.5]],
  fx(A) { const T = A.THREE, tL = 0.8, spot = [1.2, 0, -0.1], tb = 2.3; FXa(A, { t: tL, dur: 0.3, to: [-1.6, 5.0, 0], len: 1.2, glow: A.C.jade });
    // the foe walks into where she aimed
    A.moveTo(0, 0.6, [1.35, -0.2], 1.6, 'lin');
    // the reticle: a jade ring with four feather ticks, narrowing until the bolt drops
    FXk.ring(A, { col: A.C.jade, t: 0.85, at: spot, r0: 1.5, r1: 0.45, e: 'lin', dur: tb - 0.85, w: 0.06, op: 0.8 });
    const g = A.add(new T.Group()); for (let k = 0; k < 4; k++) { const m = new T.Mesh(A.streakGeo, A.mat(A.C.jade, A.F.STREAK)); m.scale.set(0.08, 0.08, 0.35); g.add(m); } g.visible = false;
    A.fx((t) => { const a = t - 0.85; g.visible = a >= 0 && t < tb; if (!g.visible) return; const r = A.lerp(1.5, 0.45, a / (tb - 0.85)); g.position.set(spot[0], 0.04, spot[2]); g.children.forEach((m, k) => { const an = k * Math.PI / 2 + a * 0.6; m.position.set(Math.cos(an) * (r + 0.35), 0, Math.sin(an) * (r + 0.35)); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(-Math.cos(an), 0, -Math.sin(an))); m.material.uniforms.op.value = 0.85; }); });
    FXa(A, { t: tb - 0.18, dur: 0.18, from: [spot[0] - 0.3, 6, spot[2]], to: [spot[0], 0.6, spot[2]], len: 3.0, scale: 3.2, w: 0.35, glow: A.C.jade, stick: 0, ease: 'in' });
    FXk.stuck(A, { t: tb, dur: 1.2, at: [spot[0], 0.95, spot[2]], dir: [0.05, -1, 0], scale: 3.2 });
    FXk.ring(A, { t: tb, at: spot, r0: 0.2, r1: 1.6, dur: 0.45, w: 0.35 }); FXk.disc(A, { t: tb, at: spot, r0: 0.3, r1: 1.4, dur: 0.3, op: 0.4 }); FXk.dust(A, { t: tb, at: spot, n: 10, sp: 2.0, r: 0.25, rise: 2 }); A.shake(tb, 0.09, 0.3);
    A.hit(0, tb + 0.02, 70, { big: true, stop: true }); A.hit(1, tb + 0.04, 46, { knock: [0.3, 0.4] });
    A.cap(0.8, 2.25, '瞄准它 1.5 秒后的位置', 'Aim where it will be in 1.5 s'); A.cap(2.25, 3.9, '中心 70，外圈到 1.5 u 递减到 20', '70 at the centre, falling to 20 at 1.5 u'); } };

// DE11 Recoil blast: point-blank, it bursts at once: 36 (12 to others within 1 u); the blast throws her 3 u back, untouchable
DE.F11 = { T: 3.0, cam: { x: -1.0, z: 0, w: 7.2 }, her: H(-0.6), seq: [[0.3, 'sPierce', { to: 0.5 }], [0.62, 'dash', { from: 0.5, to: 0.95, speed: 1.2 }], [1.05, 'sEagleIn', { from: 0.15, fade: 0.12 }], [1.75, 'sEagleOut', { from: 0.2 }]],
  root: [{ t: 0.3 }, { t: 0.44, fw: 0.25, e: 'out' }, { t: 0.6 }, ...rk(0.6, 1.05, (u) => ({ fw: 0.25 - 3.0 * A_out(u), y: 0.35 * 4 * u * (1 - u), spin: 360 * u })), { t: 1.4, fw: -2.95, e: 'out' }],
  dum: [[0.45, 0.05], [1.2, 0.55]],
  fx(A) { const T = A.THREE, tb = 0.58; FXa(A, { t: 0.5, dur: 0.06, to: { d: 0 }, len: 0.4, stick: 0.05 }); FXk.disc(A, { t: tb, at: () => at0(A, 0, tb, 0.6), r0: 0.2, r1: 1.0, dur: 0.22, op: 0.6 });
    FXk.ring(A, { t: tb, at: () => at0(A, 0, tb), r0: 0.2, r1: 1.1, dur: 0.3, w: 0.4 }); A.hit(0, tb + 0.02, 36, { big: true, knock: [0.4, 0] }); A.hit(1, tb + 0.04, 12, { knock: [0.3, 0.3] });
    for (let k = 0; k < 5; k++) FXk.spark(A, { t: tb + 0.02 + k * 0.03, at: () => herAt(A, tb + 0.05 + k * 0.05, 0.6), r: 0.07, col: A.C.parch }); A.shake(tb, 0.07, 0.25);
    FXk.trail(A, { of: 'hips', t0: 0.62, t1: 1.05, len: 0.25, w: 0.14, op: 0.4 }); FXk.dust(A, { t: 1.05, at: () => herAt(A, 1.05), n: 7, dir: [-1, 0], sp: 1.4 }); FXk.tube(A, { t: 1.05, dur: 0.35, hold: 0.4, out: 0.4, flat: true, w: 0.3, col: '#BDB6A8', op: 0.35, e: 'out', pts: () => [herAt(A, 1.05, 0.02), herAt(A, 1.4, 0.02)] });
    A.cap(0.3, 2.8, '贴脸一箭：36；爆炸把她炸退 3 u，无敌', 'Point-blank: 36; the blast throws her 3 u back, untouchable'); } };
function A_out(u) { return 1 - (1 - u) * (1 - u); }

// DE12 Spotter wheel: eight arrows circle over the foe for 4 s; each hit on it by anyone drops one: 8
DE.F12 = { ...DEFS.F12, T: 4.6, seq: [[0.3, 'dSpotter'], [1.3, 'idle', { from: 5.15, fade: 0.25 }]], root: [{ t: 0.3 }, { t: 0.8, spin: -60, e: 'lin' }, { t: 1.2, spin: 0 }], // spec batch 2 DE F12: eight arrows flicked up one by one, a raised paw locks the wheel, a fist
  dum: [[1.6, 0.3]],
  fx(A) { const T = A.THREE, s0 = 0.32, s1 = 0.8, tUp = 0.86; FXk.ring(A, { t: s0, at: 'her', r0: 0.5, r1: 1.2, dur: 0.4, w: 0.12, op: 0.5 });
    // up from the spin, they form a slow ring point-down over the foe
    const wheel = (k, t) => { const p = at0(A, 0, t, 1.85), an = k * Math.PI / 4 + t * 1.2; return new T.Vector3(p.x + Math.cos(an) * 0.45, p.y, p.z + Math.sin(an) * 0.45); };
    FXk.ring(A, { t: 1.2, dur: 3.1, at: () => at0(A, 0, 1.2, 1.5), r0: 0.5, r1: 0.52, w: 0.12, op: 0.5, e: 'lin' });
    const drops = [1.7, 2.1, 2.5, 2.9, 3.3, 3.55]; // her shots and an ally's
    for (let k = 0; k < 8; k++) { const ts = s0 + (s1 - s0) * k / 8, td = drops[k] != null ? drops[k] + 0.12 : 4.3; const m = A.add(new T.Mesh(A.arrowGeo, A.arrowMat)); m.scale.setScalar(0.7); m.visible = false;
      A.fx((t) => { m.visible = t >= ts && t < td; if (!m.visible) return; const u = A.clamp((t - ts) / (tUp - ts + 0.3)), w = wheel(k, t), c = A.at('chest', ts); const p = c.clone().lerp(w, A.EASE.out(u)); p.y += 0.8 * Math.sin(u * Math.PI); m.position.copy(p);
        m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), u < 1 ? w.clone().sub(c).normalize() : new T.Vector3(0, -1, 0)); m.scale.setScalar(0.7 * (t > 4.0 && drops[k] == null ? Math.max(0, (4.3 - t) / 0.3) : 1)); });
      if (drops[k] != null) FXa(A, { t: td, dur: 0.1, from: P3(wheel(k, td)), to: { d: 0, y: 0.9 }, len: 0.6, hits: [{ d: 0, n: 8, col: A.C.jade }] }); }
    // what calls them down: her shots and an ally's arrows from off the card
    [1.7, 2.5, 3.3].forEach((t) => FXa(A, { t: t - 0.12, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 12 }] })); [2.1, 2.9, 3.55].forEach((t) => FXa(A, { t: t - 0.2, dur: 0.2, from: [-1.0, 0.7, 3.6], to: { d: 0 }, col: A.C.parch, hits: [{ d: 0, n: 10 }] }));
    A.cap(0.4, 1.6, '八支箭在它头顶转 4 秒', 'Eight arrows circle over it for 4 s'); A.cap(1.6, 4.4, '谁打中它，就落下一支：8', "Anyone's hit on it drops one: 8"); } };
DE.F12.seq = [[0.3, 'rWhirl'], [1.4, 'combo1'], [2.2, 'combo2'], [3.0, 'combo1']];

// DE13 Bank shot: it bounces off walls (up to four times) to a foe behind cover: 22
DE.F13 = { T: 3.0, cam: { x: 0.3, z: 0, w: 7.4 }, her: H(-2.6, 0.2, 90), seq: [[0.3, 'dBank'], [1.0, 'idle', { from: 5.15, fade: 0.25 }]], // spec batch 2 DE F13: a glance along the bounce path, a lean, the bow canted 30°, a step through
  root: [{ t: 0.3, spin: -40 }, { t: 0.5, spin: -48 }],
  dum: [[2.6, -0.1]],
  fx(A) { const T = A.THREE; const wallM = new T.MeshStandardMaterial({ color: '#8C877E', roughness: 0.95 });
    const box = (x, z, w, d, h = 0.8) => { const m = A.add(new T.Mesh(new T.BoxGeometry(w, h, d), wallM)); m.position.set(x, h / 2, z); };
    box(0.6, 2.0, 5.6, 0.3); box(0.6, -2.0, 5.6, 0.3); box(1.3, 0.0, 0.5, 1.4, 1.0); // two walls and a pillar in front of the foe
    const tL = 0.6, seg = [0.1, 0.13, 0.1]; const P = [() => A.at('nock', tL), () => new T.Vector3(-0.1, 0.6, 1.82), () => new T.Vector3(1.9, 0.6, -1.82), () => at0(A, 0, 1.0, 0.6)];
    const tk = [tL, tL + seg[0], tL + seg[0] + seg[1], tL + seg[0] + seg[1] + seg[2]];
    const pos = (t) => { for (let i = 0; i < 3; i++) if (t <= tk[i + 1] || i === 2) { const u = A.clamp((t - tk[i]) / seg[i]); return P[i]().clone().lerp(P[i + 1](), u); } };
    const m = A.add(new T.Mesh(A.arrowGeo, A.arrowMat)); m.scale.setScalar(0.8); m.visible = false;
    A.fx((t) => { m.visible = t >= tL && t <= tk[3] + 1.0; if (!m.visible) return; const p = t > tk[3] ? at0(A, 0, t, 0.6).add(new T.Vector3(-0.3, 0, 0.12)) : pos(t), q = pos(Math.min(t, tk[3]) - 0.01); m.position.copy(p); if (p.distanceTo(q) > 1e-4 && t <= tk[3]) m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); });
    FXk.trail(A, { of: pos, t0: tL, t1: tk[3], len: 0.22, w: 0.08, op: 0.75, col: A.C.bone });
    [1, 2].forEach((i) => { FXk.spark(A, { t: tk[i], at: P[i](), r: 0.16, col: A.C.parch }); FXk.ring(A, { t: tk[i], at: P[i](), r0: 0.05, r1: 0.4, dur: 0.25, w: 0.3, dir: () => new T.Vector3(0, 0, 1) }); });
    A.hit(0, tk[3], 22, { big: true }); A.cap(0.4, 2.8, '在墙上弹，最多四次：每个敌人 22', 'It bounces off walls, up to four times: 22 a foe'); } };

// DE14 Eye hold: the twister holds one foe still in its calm eye 1 s, then spits it straight up: 24, launched 0.6 s
DE.F14 = { ...DEFS.F14, T: 3.8, dum: [[1.4, 0.0], [2.8, 1.3]],
  fx(A) { const T = A.THREE, tL = 0.9, t0 = tL + 0.18, t1 = t0 + 1.0; FXk.helix(A, { t: 0.36, dur: 0.3, from: (A2) => { const h = A2.at('handR', 0.5); return [h.x, h.y + 0.15, h.z]; }, to: (A2) => { const h = A2.at('handR', 0.5); return [h.x, h.y - 0.05, h.z]; }, r: 0.08, turns: 5, strands: 1, out: 0.2, op: 0.8 });
    FXa(A, { t: tL, dur: 0.18, to: { d: 0, y: 0.1 }, len: 0.9, glow: A.C.jade, stick: 0 }); FXk.twister(A, { t0, t1, at: () => at0(A, 0, t0), r: 0.75, h: 2.2, riders: 0 });
    A.hit(0, t0, null, { stun: 1.0 }); FXk.ring(A, { col: A.C.jade, t: t0, at: () => at0(A, 0, t0), r0: 0.9, r1: 0.35, e: 'in', dur: 0.3, w: 0.2 });
    A.hit(0, t1, 24, { up: 1.3, big: true }); FXk.trail(A, { of: (t) => at0(A, 0, t, 0.6), t0: t1, t1: t1 + 0.35, len: 0.2, w: 0.25, op: 0.6 }); FXk.ring(A, { t: t1, at: () => at0(A, 0, t1, 2.2), r0: 0.2, r1: 0.9, dur: 0.3, w: 0.3 });
    A.cap(0.4, 2.0, '风眼定住它 1 秒，旁边的敌人不受影响', 'The eye holds it still 1 s; the others are left alone'); A.cap(2.0, 3.6, '再把它吐上天：24，挑飞 0.6 秒', 'Then spits it straight up: 24, launched 0.6 s'); } };

// DE15 Tripwire: two arrows 4 u apart with a wire; the first foe across trips 1 s, the arrows tear free into it (2 × 16), it cannot leap 3 s
DE.F15 = { T: 4.4, cam: { x: 0.2, z: 0, w: 7.2 }, her: H(0.1, 2.0), seq: [[0.3, 'dTrip'], [1.3, 'idle', { from: 5.15, fade: 0.25 }]], // spec batch 2 DE F15: a stab, a one-paw cartwheel paying out the wire, a stab, a pluck
 
  root: [{ t: 0.46 }, ...rk(0.46, 0.8, (u) => ({ sd: -4.0 * A_s(u), roll: -360 * u, y: 0.2 * Math.sin(Math.PI * u) }), 14), { t: 0.82, sd: -4.0, roll: -360, y: 0 }],
  dum: [[3.2, 0.3]],
  fx(A) { const T = A.THREE, a = [0.4, 0.2, 2.0], b = [0.4, 0.2, -2.0];
    liveCord(A, a, (t) => A.at('handL', t), 0.44, 0.97, { r: 0.008, op: 0.8 }); FXk.spark(A, { t: 1.1, at: [0.4, 0.2, 0.0], r: 0.12, col: A.C.parch }); FXk.ring(A, { t: 1.1, at: [0.4, 0.2, -1.9], r0: 0.05, r1: 0.4, dur: 0.25, w: 0.3, dir: () => new A.THREE.Vector3(1, 0, 0) });
    FXk.stuck(A, { t: 0.43, dur: 2.1, at: a, dir: [0.4, -0.8, 0.3], shiver: true }); FXk.stuck(A, { t: 0.96, dur: 1.6, at: b, dir: [0.4, -0.8, -0.3], shiver: true });
    thread(A, a, b, 1.0, { hold: 1.5, out: 0.1, r: 0.012, op: 0.9 }); // the wire, pulled taut
    const gl = A.add(new T.Mesh(new T.SphereGeometry(0.05, 8, 6), new T.MeshBasicMaterial({ color: A.C.parch }))); gl.visible = false; A.fx((t) => { gl.visible = t > 1.0 && t < 2.3; if (gl.visible) gl.position.set(0.4, 0.2, 2 - ((t - 1.0) * 2.4 % 4)); });
    // a charger runs at her and trips on it
    A.moveTo(0, 1.1, [0.5, 0.1], 1.0, 'in'); const ts = 2.12; A.down(0, ts, 1.0, [-1, 0]); A.move(0, ts, [-0.6, 0], 0.25, 'out');
    FXa(A, { t: ts + 0.05, dur: 0.12, from: a, to: { d: 0, y: 0.3 }, len: 0.6, hits: [{ d: 0, n: 16 }] }); FXa(A, { t: ts + 0.1, dur: 0.12, from: b, to: { d: 0, y: 0.3 }, len: 0.6, hits: [{ d: 0, n: 16 }] });
    FXk.dust(A, { t: ts + 0.15, at: () => at0(A, 0, ts + 0.3), n: 7, sp: 1.2 }); A.status(0, ts, 'stun', 1.0); FXk.ring(A, { t: ts + 1.0, at: () => at0(A, 0, ts + 1.0), r0: 0.5, r1: 0.52, dur: 2.0, w: 0.12, op: 0.5, e: 'lin' });
    A.cap(0.4, 2.1, '两支箭钉在地上，中间拉一根线', 'Two arrows in the floor, a wire between'); A.cap(2.1, 4.2, '绊倒 1 秒，两箭扯出：2 × 16；3 秒不能跳', 'Tripped 1 s, the arrows tear free: 2 × 16; no leaping for 3 s'); } };

// DE16 Arrow hedge: the curtain sweeps (three hits of 14); its last rank stands 5 s as a hedge: foe shots stop on it, hers pass
DE.F16 = { ...DEFS.F16, T: 6.0, cam: { x: 2.6, z: -0.4, w: 12 }, dum: [[1.0, -0.4], [3.0, 0.8], [8.6, 0.2]],
  fx(A) { capOnly(A, DEFS.F16.fx, []); const T = A.THREE, tL = 0.62 + 0.62, ox = A.at('nock', tL).x + 1.0, hx = ox + 0.2 + 7 * 1.0, th = 1.7 + 7 * 0.12 + 0.18;
    for (let j = 0; j < 8; j++) { const z = -2.3 + j * 0.66; FXk.stuck(A, { t: th, dur: 6.0 - th, at: [hx + ((j * 3) % 2) * 0.08, 0.45, z], dir: [0.15, -1, 0.02 * (j - 4)], scale: 1.3 }); }
    FXk.tube(A, { t: th, dur: 0.2, hold: 5.6 - th, out: 0.3, flat: true, w: 0.25, col: A.C.jade, op: 0.22, e: 'lin', pts: () => [new T.Vector3(hx, 0.03, -2.5), new T.Vector3(hx, 0.03, 2.5)] });
    // the shooter behind it: its shots stop on the hedge with a tick; hers pass
    [3.3, 4.3].forEach((t) => { foeShot(A, { t, dur: 0.4, from: [8.6, 0.7, 0.2], to: [-1.0, 0.7, 0.0], stop: (8.6 - hx) / 9.6 }); FXk.spark(A, { t: t + 0.4 * (8.6 - hx) / 9.6, at: [hx, 0.7, 0.15], r: 0.12, col: A.C.parch }); });
    FXa(A, { t: 3.8, dur: 0.35, from: 'nock', to: { d: 2 }, len: 1.2, hits: [{ d: 2, n: 12 }] });
    A.cap(1.5, 3.0, '箭幕推过：三次各 14', 'The curtain sweeps: three hits of 14'); A.cap(3.0, 5.8, '最后一排箭立成篱笆 5 秒：挡住敌人的子弹，她的箭穿过', 'Its last rank stands 5 s as a hedge: foe shots stop, hers pass'); } };
DE.F16.seq = [...DEFS.F16.seq, [3.6, 'combo1']];

// DE17 Feather sentry: the spray and the run; a feather stays where she stood and, 2 s later, shoots the last foe she hit: 24
DE.F17 = { ...DEFS.F17, T: 3.8, dum: [[0.3, -0.7], [0.6, 0.15], [0.4, 0.95]],
  fx(A) { capOnly(A, DEFS.F17.fx, []); const T = A.THREE, spot = herAt(A, 0.9); const fp = [spot.x + 0.15, 0, spot.z + 0.15];
    standFeather(A, 0.95, fp, 2.6); FXk.ring(A, { t: 0.95, at: fp, r0: 0.05, r1: 0.35, dur: 0.3, w: 0.3 });
    A.moveTo(2, 1.2, [2.0, 1.15], 1.0, 's'); // the last foe she hit walks off
    const ts = 2.66; FXk.ring(A, { t: ts - 0.25, at: [fp[0], 0.32, fp[2]], r0: 0.4, r1: 0.05, e: 'in', dur: 0.25, w: 0.3, dir: () => new T.Vector3(1, 0, 0) });
    FXa(A, { t: ts, dur: 0.2, from: [fp[0], 0.45, fp[2]], to: { d: 2 }, len: 1.0, glow: A.C.jade, hits: [{ d: 2, n: 24, big: true }] });
    A.cap(0.4, 1.6, '散射五箭，各 9；原地留下一根羽毛', 'Five arrows of 9; a feather stays where she stood'); A.cap(1.6, 3.6, '2 秒后羽毛射她最后打中的敌人：24', '2 s later it shoots the last foe she hit: 24'); } };

// DE18 Catch: the flip stops at the top 0.6 s, untouchable; two foe shots are caught; one full shot (30) sends them back (10 each)
DE.F18 = { T: 3.4, cam: { x: -0.2, z: 0, w: 7.4 }, her: H(-1.8), seq: [[0.3, 'vault', { to: 0.3, hold: true }], [1.25, 'vault', { from: 0.3 }]],
  root: [{ t: 0.38 }, ...rk(0.38, 0.62, (u) => ({ fw: -0.8 * u, y: 1.0 * A_out(u), pitch: -180 * u })), { t: 1.25, fw: -0.8, y: 1.0, pitch: -180 }, ...rk(1.25, 1.55, (u) => ({ fw: -0.8 - 0.6 * u, y: 1.0 * (1 - u * u), pitch: -180 - 180 * u }))],
  dum: [[1.2, 0.0], [2.6, -1.3], [2.4, 1.4]],
  fx(A) { const T = A.THREE; const paw = (t) => A.at('handR', t);
    [[1, 0.55], [2, 0.75]].forEach(([i, t]) => { foeShot(A, { t, dur: 0.3, from: () => at0(A, i, t, 0.7), to: () => paw(t + 0.3), stop: 1, linger: 2.2, ride: (tt) => (tt < 1.3 ? paw(tt) : A.at('nock', 1.3)) }); FXk.spark(A, { t: t + 0.3, at: () => paw(t + 0.3), r: 0.14, col: A.C.parch }); });
    const tL = 1.3; FXa(A, { t: tL, dur: 0.14, to: { d: 0 }, len: 1.4, scale: 1.3, w: 0.14, glow: A.C.jade, hits: [{ d: 0, n: 30, big: true }] });
    [1, 2].forEach((i) => FXa(A, { t: tL + 0.02, dur: 0.2, to: { d: i }, len: 0.7, w: 0.07, col: '#E86B6B', hits: [{ d: i, n: 10 }] }));
    FXk.dust(A, { t: 1.55, at: () => herAt(A, 1.55), n: 5, dir: [-1, 0] });
    A.cap(0.4, 1.25, '翻到最高点停 0.6 秒，无敌，接住敌人的子弹', 'She hangs at the top 0.6 s, untouchable, catching shots'); A.cap(1.25, 3.2, '满弦一箭 30，接住的子弹各 10 射回去', 'One full shot, 30; the caught shots fly back: 10 each'); } };

// DE19 Crescent cut: the backflip kick throws a crescent forward up to 8 u; it grows as it flies: 20 at 1 u, 60 at 8 u
DE.F19 = { T: 3.0, cam: { x: 1.4, z: 0, w: 10 }, her: H(-3.0), seq: [[0.3, 'kCrescent']],
  root: [{ t: 0.3 }, { t: 0.45, fw: -0.3, e: 'out' }, { t: 0.5, fw: -0.3, y: 0 }, { t: 0.77, fw: -0.5, y: 1.0, pitch: -180, e: 'out', ye: 'out' }, { t: 1.04, fw: -0.8, y: 0, pitch: -360, e: 'in', ye: 'in' }],
  dum: [[4.6, 0.1]],
  fx(A) { const T = A.THREE, t0 = 0.62, fl = 0.55; FXk.trail(A, { of: 'footL', of2: 'footR', t0: 0.48, t1: 0.66, len: 0.16, op: 0.75 });
    const g = A.add(new T.Group()); const curve = new T.CatmullRomCurve3([...Array(13)].map((_, i) => { const a = (i / 12 - 0.5) * 2.4; return new T.Vector3(Math.cos(a) * 0.5 - 0.5, 0, Math.sin(a) * 0.9); }));
    const m = new T.Mesh(FXk.flatRibbon(curve, (u) => 0.04 + 0.16 * Math.sin(u * Math.PI), 40, false), A.mat(A.C.gold, A.F.RIB)); g.add(m); g.visible = false;
    const sx = herAt(A, t0).x + 0.4;
    A.fx((t) => { const a = t - t0; g.visible = a >= 0 && a <= fl + 0.12; if (!g.visible) return; const u = A.clamp(a / fl), x = A.lerp(sx, 4.4, u); g.position.set(x, 0.7, 0.1); const s = 0.5 + 1.6 * u; g.scale.set(s, 1, s); m.material.uniforms.u0.value = 0; m.material.uniforms.u1.value = 1; m.material.uniforms.op.value = (0.45 + 0.5 * u) * (a > fl ? 1 - (a - fl) / 0.12 : 1); });
    A.hit(0, t0 + fl, 60, { big: true, stop: true }); FXk.ring(A, { t: t0 + fl, at: () => at0(A, 0, t0 + fl), r0: 0.3, r1: 1.2, dur: 0.3, w: 0.25 });
    A.cap(0.4, 2.8, '月牙越飞越大：1 u 处 20，8 u 处 60', 'The crescent grows as it flies: 20 at 1 u, 60 at 8 u'); } };

// DE20 Lone wolf: the wind blows every other foe 3 u off the one nearest the spot, and strikes that one: 36
DE.F20 = { ...DEFS.F20, hops: [], her: H(-2.0), seq: [[0.3, 'dLone'], [1.55, 'idle', { from: 5.15, fade: 0.25 }]], root: [{ t: 0.7 }, { t: 0.79, fw: 0.65, y: 0.45, e: 'lin', ye: 'out' }, { t: 0.87, fw: 1.3, y: 0, e: 'out', ye: 'in' }], // spec batch 2 DE F20: a staff spin, a leap, the bow driven into the floor, the blast, a strike on the lone foe
  cam: { x: 0.0, z: 0, w: 8.0 }, dum: [[0.15, 0.0, { big: true }], [-0.3, -0.8], [0.7, 0.7], [0.7, -0.6], [-0.2, 0.85]],
  fx(A) { const T = A.THREE, tT = 0.87, c = [0.15, 0]; FXk.trail(A, { of: 'tipA', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 }); FXk.trail(A, { of: 'tipB', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 });
    FXk.dust(A, { t: tT, at: () => A.at('tipB', tT + 0.01).setY(0), n: 8, sp: 1.4 }); A.shake(tT, 0.06, 0.2); FXk.trail(A, { of: 'tipA', t0: 1.15, t1: 1.24, len: 0.2, w: 0.1, op: 0.7 });
    FXk.ring(A, { col: A.C.jade, t: tT + 0.15, at: [c[0], 0, c[1]], r0: 0.3, r1: 3.2, dur: 0.45, w: 0.2 }); FXk.ring(A, { col: A.C.jade, t: tT + 0.22, at: [c[0], 0, c[1]], r0: 0.3, r1: 2.6, dur: 0.4, w: 0.12, op: 0.6 });
    [1, 2, 3, 4].forEach((i) => { const dm = A.card.dum[i], dx = dm.x - c[0], dz = dm.z - c[1], l = Math.hypot(dx, dz); A.move(i, tT + 0.18, [dx / l * 3.0, dz / l * 3.0], 0.45, 'out'); FXk.dust(A, { t: tT + 0.2, at: [dm.x, 0, dm.z], n: 4, dir: [dx, dz], sp: 1.6 }); });
    A.hit(0, 1.22, 36, { big: true }); FXk.helix(A, { t: 1.22, dur: 0.2, from: [c[0], 0.1, c[1]], to: [c[0], 1.5, c[1]], r: 0.35, turns: 2, strands: 2, hold: 0.1, out: 0.3 });
    A.cap(0.4, 3.2, '把其他敌人吹开 3 u，单独打它：36', 'Blows the others 3 u off it, strikes the lone foe: 36'); } };

// DE21 Avenger: the three kicks (6 each); all three spin arrows hunt the foe that last hit the team: 16 each
DE.F21 = { ...DEFS.F21, T: 3.4, dum: [[0.32, 0.2], [-1.3, 0.72], [2.6, -1.6, { face: 230 }]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footL', t0: 0.42, t1: 1.12, len: 0.16, w: 0.18, op: 0.6 }); FXk.trail(A, { of: 'footR', t0: 0.42, t1: 1.12, len: 0.16, w: 0.18, op: 0.6 });
    foeShot(A, { t: 0.05, dur: 0.3, from: [2.6, 0.7, -1.6], to: [-0.6, 0.7, 0] }); FXk.spark(A, { t: 0.35, at: [-0.6, 0.7, 0], r: 0.12, col: CRIM }); // the foe that hit her
    FXk.reticle(A, { t: 0.4, d: 2, dur: 1.0, col: A.C.parch });
    [0.4, 0.7, 1.0].forEach((tk) => { FXk.ring(A, { t: tk, at: 'her', r0: 0.6, r1: 1.3, dur: 0.3, w: 0.18, op: 0.5 }); [0, 1].forEach((i) => A.hit(i, tk + 0.02 * i, 6)); });
    [0.52, 0.82, 1.12].forEach((tk, k) => FXa(A, { t: tk, dur: 0.28, from: P3(A.at('hips', tk)), to: { d: 2 }, side: (k - 1) * 0.9 + 0.6, len: 0.8, hits: [{ d: 2, n: 16 }] }));
    A.cap(0.05, 0.4, '它刚打了她', 'It just hit her'); A.cap(0.4, 3.2, '三脚各 6；三箭全追那个敌人：各 16', 'Three kicks of 6; all three arrows hunt that foe: 16 each'); } };

// DE23 Slide stance: the run ends in a slide on her haunches into a free 2 s Eagle Stance
DE.F23 = { T: 5.6, cam: { x: 1.2, z: -0.3, w: 10.4 }, her: H(-3.2, 0.6, 90), seq: [[0.2, 'idle', { from: 5.15, to: 5.55 }], [0.6, 'run', { loop: true, until: 2.7 }], [2.7, 'sEagleIn', { speed: 0.8, fade: 0.08 }], [3.45, 'sEagleShot'], [4.07, 'sEagleShot'], [4.69, 'sEagleOut', { from: 0.1 }]],
  root: [{ t: 0.6 }, { t: 2.7, fw: 4.6, sd: -0.6, e: 'lin' }, { t: 3.2, fw: 5.5, sd: -0.6, spin: -10, e: 'out' }], dum: [[5.0, -1.4], [5.6, 1.0]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footL', t0: 0.6, t1: 2.7, len: 0.3, w: 0.1, op: 0.4 }); FXk.trail(A, { of: 'footR', t0: 0.6, t1: 2.7, len: 0.3, w: 0.1, op: 0.4 });
    FXk.tube(A, { t: 2.7, dur: 0.5, hold: 0.6, out: 0.5, flat: true, w: 0.35, col: '#BDB6A8', op: 0.4, e: 'out', pts: () => [herAt(A, 2.7, 0.02), herAt(A, 3.2, 0.02)] }); FXk.dust(A, { t: 2.75, at: () => herAt(A, 2.9), n: 8, dir: [1, 0], sp: 1.5 });
    FXk.ring(A, { t: 3.2, at: 'her', r0: 0.2, r1: 0.9, dur: 0.3, w: 0.25 });
    [[3.73, 0], [4.35, 1]].forEach(([tL, d]) => FXa(A, { t: tL, dur: 0.16, to: { d }, len: 1.1, hits: [{ d, n: 19 }] }));
    A.cap(0.6, 2.7, '3 秒：更快，敌方子弹穿身而过', '3 s: faster, foe shots pass through her'); A.cap(2.7, 5.4, '滑步坐下：免费 2 秒鹰踞，普攻 +60%', 'A slide into a free 2 s Eagle Stance: basic shots +60%'); } };

// DE24 Spear dive: she dives arrow-first at the foe under the pointer: 60, pinned 0.5 s
DE.F24 = { T: 3.2, cam: { x: 0.6, z: -0.6, w: 8.0 }, her: H(-2.2), seq: [[0.3, 'kDive', { to: 1.0 }], [1.0, 'sPierce', { from: 0.1, to: 0.35, hold: true }], [1.62, 'vault', { from: 0.4 }]],
  root: [{ t: 0.44 }, { t: 0.75, y: 2.3, fw: 0.9, e: 'out', ye: 'out' }, { t: 0.95, y: 2.5, fw: 1.4, pitch: 100, e: 's' }, { t: 1.5, y: 0.7, fw: 3.6, pitch: 100, e: 'in', ye: 'in' }, ...rk(1.62, 2.1, (u) => ({ fw: 3.6 - 1.2 * u, y: 0.7 * (1 - u) + 0.7 * 4 * u * (1 - u), pitch: 100 - 460 * u }))],
  dum: [[1.55, 0.0], [0.6, 1.2]],
  fx(A) { const T = A.THREE, ti = 1.5; FXk.trail(A, { of: 'head', t0: 1.0, t1: ti, len: 0.3, w: 0.35, op: 0.5 }); FXk.trail(A, { of: 'nock', t0: 1.0, t1: ti, len: 0.25, w: 0.12, op: 0.7, col: A.C.parch });
    A.hit(0, ti, 60, { big: true, stop: true, stun: 0.5 }); FXk.stuck(A, { t: ti, dur: 1.2, at: () => at0(A, 0, ti, 1.1), dir: [0.3, -1, 0], scale: 1.4 }); FXk.ring(A, { t: ti, at: () => at0(A, 0, ti), r0: 0.2, r1: 1.0, dur: 0.3, w: 0.35 }); A.shake(ti, 0.07, 0.25);
    A.cap(0.4, 1.5, '跳起，头朝下', 'The leap and a head-down turn'); A.cap(1.5, 3.0, '箭在前俯冲：60，钉住 0.5 秒', 'An arrow-first dive: 60, pinned 0.5 s'); } };

// ------------------------------------------------ Volley 万箭 (kit 2.5)
// VO1 Curve line: the arrow flies an arc she sets, up to 8 u, round the pack's edge, through every foe on it: 26 each
// ------------------------------------------------ Volley 万箭 (kit 2.5)
// VO1 Curve line: the arrow flies an arc she sets, up to 8 u, round the pack's edge, through every foe on it: 26 each
VO.F1 = { T: 2.8, cam: { x: 0.6, z: 0.3, w: 7.6 }, her: H(-2.6), seq: [[0.3, 'sPierce']], root: [{ t: 0.3 }, { t: 0.46, sd: -0.4, e: 'out' }], hops: [[0.3, 0.46, 0.05]],
  dum: [[-0.6, 0.55], [0.9, 1.25], [2.4, 0.9], [3.2, -0.3], [0.9, -0.4, { big: true }]],
  fx(A) { const T = A.THREE, t0 = 0.56, fl = 0.42; const C = (u) => { const a = A.at('nock', t0); const P0 = new T.Vector3(a.x, 0.6, a.z), P1 = new T.Vector3(1.0, 0.6, 2.4), P2 = new T.Vector3(4.2, 0.6, -1.0); const v = 1 - u; return P0.clone().multiplyScalar(v * v).add(P1.clone().multiplyScalar(2 * u * v)).add(P2.clone().multiplyScalar(u * u)); };
    const m = A.add(new T.Mesh(A.arrowGeo, A.arrowMat)); m.scale.setScalar(0.8); m.visible = false; const pos = (t) => C(A.clamp((t - t0) / fl));
    A.fx((t) => { m.visible = t >= t0 && t <= t0 + fl; if (!m.visible) return; const p = pos(t), q = C(Math.max(0, (t - t0) / fl - 0.02)); m.position.copy(p); if (p.distanceTo(q) > 1e-4) m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); m.rotateZ((t - t0) * 40); });
    FXk.trail(A, { of: pos, t0, t1: t0 + fl, len: 0.3, w: 0.1, op: 0.75, col: A.C.bone });
    FXk.tube(A, { t: t0, dur: fl, hold: 1.0, out: 0.6, flat: true, w: 0.14, op: 0.5, e: 'lin', pts: () => [...Array(13)].map((_, i) => { const p = C(i / 12); p.y = 0.03; return p; }) });
    [[0, 0.16], [1, 0.42], [2, 0.66], [3, 0.88]].forEach(([d, u]) => A.hit(d, t0 + fl * u, 26));
    A.cap(0.4, 2.6, '弯成弧线，绕过敌群边缘，穿过线上每个敌人：各 26', 'It bends on an arc round the pack, through every foe on it: 26 each'); } };

// VO2 Pressure line: a full draw's wind drags foes within 1.5 u of its path into the line, then pierces them all: 20 each
VO.F2 = { T: 3.6, cam: { x: 0.8, z: 0, w: 8.4 }, her: H(-3.0), seq: [[0.3, 'vSpinDraw']], root: [{ t: 0.32 }, { t: 0.8, spin: 360, e: 'io2' }, { t: 1.3 }, { t: 1.58, fw: -0.3, e: 'out' }],
  dum: [[0.2, 1.2], [1.4, -1.3], [2.6, 1.0], [3.6, -0.9], [1.9, 0.1]],
  fx(A) { const T = A.THREE, tL = 1.3, end = (A2) => fwdPt(A2, tL, 8, 0.6); const nk = A.at('nock', tL);
    // two sheets of wind fold in from both sides along the line
    [1, -1].forEach((sd) => FXk.tube(A, { t: 0.7, dur: 0.5, hold: 0.1, out: 0.3, flat: true, w: (u) => 0.6 * (1 - u * 0.5), op: 0.3, e: 'out', pts: () => [new T.Vector3(nk.x + 0.4, 0.04, sd * 1.5), new T.Vector3(nk.x + 3.5, 0.04, sd * 1.2), new T.Vector3(nk.x + 7.5, 0.04, sd * 1.0)] }));
    A.card.dum.forEach((dm, i) => { if (Math.abs(dm.z) > 0.15) { A.moveTo(i, 0.85, [dm.x, 0.0], 0.4, 'in'); FXk.dust(A, { t: 0.88, at: [dm.x, 0, dm.z], n: 4, dir: [0, -dm.z], sp: 1.2 }); } });
    FXk.suck(A, { t0: 0.5, t1: tL - 0.05, at: (t) => A.at('nock', t), r: 1.5, n: 10, y: 0.03, lift: 1 });
    FXa(A, { t: tL, dur: 0.3, to: end(A), len: 2.2, scale: 1.3, w: 0.13, glow: A.C.jade, pierce: A.card.dum.map((_, d) => ({ d, n: 20 })) });
    FXk.tunnel(A, { t: tL, dur: 0.3, n: 7, r: 0.45, from: () => A.at('nock', tL), to: () => new T.Vector3(...end(A)), life: 0.45 }); A.shake(tL + 0.05, 0.05, 0.2);
    A.cap(0.4, 1.3, '满弦：风把线两侧 1.5 u 的敌人拉到线上', 'A full draw: the wind drags foes within 1.5 u onto the line'); A.cap(1.3, 3.4, '再一箭穿过全部：各 20', 'Then the arrow pierces them all: 20 each'); } };

// VO3 Flare: the arrow hits (12) and bursts into light over it: every foe within 3 u takes 20% more for 4 s
VO.F3 = { ...DEFS.F3, T: 4.2, root: [{ t: 0.3 }, { t: 0.52, spin: 360, e: 'io2' }], dum: [[1.6, 0.1], [2.5, -0.9], [2.4, 1.0], [0.9, -1.0]],
  fx(A) { const T = A.THREE, tL = 0.58, c = [1.6, 0, 0.1]; FXk.trail(A, { of: 'handR', t0: 0.36, t1: 0.52, len: 0.14, w: 0.05, op: 0.6 });
    FXa(A, { t: tL, dur: 0.28, to: [c[0], 2.0, c[2]], len: 0.8, glow: A.C.jade }); A.hit(0, tL + 0.3, 12);
    // the flare hangs over the pack: a small star overhead and a soft pool of light on the floor
    const st = A.add(new T.Mesh(new T.SphereGeometry(0.12, 12, 8), new T.MeshBasicMaterial({ color: A.C.parch }))); st.visible = false;
    A.fx((t) => { const a = t - tL - 0.28; st.visible = a >= 0 && a < 3.0; if (!st.visible) return; st.position.set(c[0], 2.0 + 0.4 * A.EASE.out(A.clamp(a / 0.3)) + 0.05 * Math.sin(a * 3), c[2]); st.scale.setScalar(1 + 0.15 * Math.sin(a * 9)); });
    FXk.disc(A, { t: tL + 0.28, at: c, r0: 0.5, r1: 3.0, dur: 3.0, op: 0.14 }); FXk.ring(A, { t: tL + 0.28, at: c, r0: 0.3, r1: 3.0, dur: 0.5, w: 0.15 }); FXk.ring(A, { t: tL + 0.5, at: c, r0: 2.95, r1: 3.0, dur: 2.6, w: 0.05, op: 0.4, e: 'lin' });
    [0, 1, 2, 3].forEach((i) => FXk.spark(A, { t: tL + 0.2 + i * 0.04, at: { d: i }, r: 0.1, col: A.C.jade }));
    [[2.22, 0], [2.84, 1]].forEach(([th, d]) => FXa(A, { t: th - 0.12, dur: 0.12, to: { d }, hits: [{ d, n: 14 }] }));
    A.cap(0.4, 1.9, '照明：3 u 内所有敌人受伤 +20%，4 秒', 'Flare: every foe within 3 u takes 20% more for 4 s'); A.cap(1.9, 4.0, '谁打都算', 'From everyone'); } };
VO.F3.seq = [[0.3, 'vFlare'], [2.0, 'combo1'], [2.6, 'combo2']];

// VO4 Net: it opens over the foe into a net 2 u wide: 14 to each under it, stun 0.5 s, then slowed
VO.F4 = { ...DEFS.F4, seq: [[0.42, 'vNet']], root: [{ t: 0.44 }, { t: 0.58, y: 0.35, fw: -0.5, e: 'out', ye: 'out' }, { t: 0.73, y: 0, fw: -0.7, e: 'in', ye: 'in' }], dum: [[0.5, -0.65], [0.9, 0.1], [0.4, 0.75], [2.5, 0.4]],
  fx(A) { const T = A.THREE, tL = 0.62, tn = 0.95, c = new T.Vector3(0.6, 0, 0.05);
    FXa(A, { t: tL, dur: 0.22, from: 'nock', to: [c.x - 0.2, 1.9, c.z], len: 0.8, stick: 0, arc: 0.4 });
    // the mesh: a grid of jade threads that opens at the top and settles over the pack
    const g = A.add(new T.Group()); g.visible = false; const mat = A.mat(A.C.jade, A.F.FLAT); const N = 6;
    for (let k = 0; k <= N; k++) { const a = new T.Mesh(new T.BoxGeometry(2.0, 0.015, 0.015), mat); a.position.z = -1 + 2 * k / N; g.add(a); const b = new T.Mesh(new T.BoxGeometry(0.015, 0.015, 2.0), mat); b.position.x = -1 + 2 * k / N; g.add(b); }
    A.fx((t) => { const a = t - (tL + 0.22); g.visible = a >= 0 && a < 2.4; if (!g.visible) return; const op = A.clamp(a / 0.08) * (a > 1.9 ? 1 - (a - 1.9) / 0.5 : 1); const u = A.EASE.out(A.clamp(a / 0.15)), d = A.EASE.in(A.clamp((a - 0.12) / 0.2));
      g.position.set(c.x, A.lerp(1.9, 1.15, d), c.z); g.scale.set(A.lerp(0.15, 1, u), 1, A.lerp(0.15, 1, u)); mat.uniforms.op.value = 0.75 * op; g.children.forEach((m, i) => { m.position.y = d * -0.35 * Math.cos((i / g.children.length) * 6.28) * 0.3; }); });
    [0, 1, 2].forEach((i) => { A.hit(i, tn, 14, { stun: 0.5 }); A.status(i, tn + 0.5, 'slow', 2.0); });
    A.cap(0.4, 2.8, '一张 2 u 的网：各 14，眩晕 0.5 秒，再减速', 'A 2 u net: 14 each, stun 0.5 s, then slowed'); } };

// VO5 Herding sweep: the ten arrows follow a 90° sweep, each nudging its foe toward the side the sweep ends on
VO.F5 = { ...DEFS.F5, T: 3.4, seq: [[0.36, 'vScythe']], root: [{ t: 0.2 }, { t: 0.36, sd: -0.5, spin: 45, e: 'out' }, ...rk(0.36, 1.85, (u, t) => ({ fw: 0.3 * Math.sin(Math.PI * u), sd: -0.5 + u, spin: 45 - 90 * u + 60 * A_s(Math.min(1, Math.max(0, (t - 1.48) / 0.08))) })), { t: 2.25, sd: 0.5, spin: 0, e: 'io2' }], hops: [],
  dum: [[0.6, 1.3], [1.4, 0.7], [1.9, -0.1], [1.2, -0.9], [2.4, 0.9]],
  fx(A) { const T = A.THREE; const sw = (tk) => { const a = (45 - 90 * A.clamp((tk - 0.36) / 1.49)) * Math.PI / 180; return { x: Math.cos(a), z: -Math.sin(a) }; }; FXk.trail(A, { of: 'tipA', t0: 0.4, t1: 1.85, len: 0.25, w: 0.08, op: 0.4 });
    for (let k = 0; k < 10; k++) { const tk = 0.45 + k * 0.14, f = sw(tk), n = A.at('nock', tk); const to = [n.x + f.x * 4.5, 0.55, n.z + f.z * 4.5];
      let hitD = -1, best = 0.35; A.card.dum.forEach((dm, i) => { const p = A.dpos(i, tk); const dx = p.x - n.x, dz = p.z - n.z, d = Math.hypot(dx, dz); const crs = Math.abs(dx * f.z - dz * f.x); if (crs < best && dx * f.x + dz * f.z > 0) { best = crs; hitD = i; } });
      if (hitD >= 0) { FXa(A, { t: tk, dur: 0.12, to: { d: hitD }, len: 0.6, hits: [{ d: hitD, n: 5 }] }); A.move(hitD, tk + 0.12, [0.05, -0.5], 0.2, 'out'); FXk.dust(A, { t: tk + 0.12, at: () => at0(A, hitD, tk + 0.2), n: 3, dir: [0, -1], sp: 1.0 }); }
      else FXa(A, { t: tk, dur: 0.14, to, len: 0.7 }); }
    FXk.tube(A, { t: 0.45, dur: 1.4, hold: 0.2, out: 0.4, flat: true, w: 0.08, op: 0.3, e: 'lin', pts: () => [...Array(9)].map((_, i) => { const tk = 0.45 + i * 0.175, f = sw(tk), n = A.at('nock', tk); return new T.Vector3(n.x + f.x * 3.5, 0.03, n.z + f.z * 3.5); }) });
    A.cap(0.4, 3.2, '扫 90°：十箭各 5，每箭把敌人往扫的终点推 0.5 u', 'A 90° sweep: ten arrows of 5, each nudging its foe 0.5 u toward the end'); } };

// VO6 Cull: one arrow to each foe under 30% within 6 u, up to six: 24 each
VO.F6 = { T: 3.0, cam: { x: 0.4, z: 0, w: 7.4 }, her: H(-2.4), seq: [[0.3, 'sKill']], root: [{ t: 0.3, spin: -60 }, { t: 0.55, spin: 0 }, { t: 0.76, spin: 30 }, { t: 1.1, spin: -30, e: 'lin' }, { t: 1.3, spin: 0 }],
  dum: [[0.8, -1.3], [1.8, 0.2], [2.6, -0.7], [1.1, 1.3], [3.3, 0.9], [2.0, 1.6, { big: true }]],
  fx(A) { const weak = [0, 1, 2, 3, 4]; FXk.toss(A, { t0: 0.4, t1: 0.61, from: (t) => A.at('handR', t), to: (t) => A.at('nock', t), arc: 0.75, spin: 2.5 });
    weak.forEach((d, k) => { FXk.dim(A, { t: 0.62, d, dur: 0.18 + k * 0.08, r: 0.9 }); const tL = 0.78 + k * 0.08; FXa(A, { t: tL, dur: 0.16, to: { d }, side: (k % 2 ? 1 : -1) * 0.5, len: 0.9, w: 0.06, col: A.C.parch, hits: [{ d, n: 24 }] }); FXk.fell(A, { t: tL + 0.4, d }); });
    A.cap(0.4, 2.8, '每个血量低于 30% 的敌人一箭，最多六个：各 24', 'One arrow to each foe under 30%, up to six: 24 each'); } };

// VO8 Wind wall: the drill stands up along its line as a wall for 3 s: foes cannot cross, 6 a half second while they touch it
VO.F8 = { ...DEFS.F8, T: 5.6, seq: [[0.3, 'sSky', { to: 1.5 }], [1.8, 'vSlap']], dum: [[4.2, 2.4], [6.0, 2.6], [5.0, -0.1]],
  fx(A) { capOnly(A, DEFS.F8.fx, []); const T = A.THREE, tL = 1.3, tw = 2.05, n = A.at('nock', tL); const x0 = n.x + 0.5, x1 = n.x + 10;
    // the wall: turning ribbons of wind standing along the line
    for (let k = 0; k < 5; k++) FXk.tube(A, { t: tw + k * 0.04, dur: 0.3, hold: 3.0, out: 0.4, flat: true, up: true, w: (u) => 0.5 + 0.3 * Math.sin(u * 9 + k), op: 0.32, e: 'out', pts: () => [...Array(11)].map((_, i) => new T.Vector3(A.lerp(x0, x1, i / 10), 0.35 + k * 0.32, 0.12 * Math.sin(i * 1.3 + k * 2))) });
    for (let k = 0; k < 12; k++) { const x = A.lerp(x0, x1, k / 11); FXk.helix(A, { t: tw + 0.05, dur: 0.25, from: [x, 0.0, 0], to: [x, 1.8, 0], r: 0.18, turns: 2, strands: 1, hold: 2.8, out: 0.4, op: 0.35 }); }
    // the pack walks at it, cannot cross, and takes 6 each half second while touching it
    [0, 1].forEach((i) => { A.moveTo(i, 2.2, [A.card.dum[i].x - 0.1, 0.45], 0.7, 'lin'); for (let k = 0; k < 5; k++) A.hit(i, 2.95 + k * 0.5, 6); A.move(i, 3.0, [0, 0.12], 0.15, 'out'); });
    foeShot(A, { t: 3.4, dur: 0.5, from: [5.0, 0.7, -0.1], to: [5.0, 0.7, 3.0], stop: 0.06 }); FXk.spark(A, { t: 3.43, at: [5.0, 0.7, 0.1], r: 0.14, col: A.C.parch });
    A.cap(0.4, 2.0, '贯日先钻出去', 'The drill bores first'); A.cap(2.0, 5.4, '沿线立起风墙 3 秒：敌人过不去，碰到每半秒 6', 'It stands up as a wall 3 s: foes cannot cross, 6 a half second on touch'); } };

// VO9 Painted fan: each foe the fan hits is painted 3 s; her next skill also strikes every painted foe: 8 each
VO.F9 = { ...DEFS.F9, T: 3.6, seq: [[0.3, 'vFingerFan'], [1.6, 'sMark']], root: [], dum: [[1.1, -0.8], [2.4, 0.0], [1.1, 0.8], [2.2, -2.1]],
  fx(A) { const T = A.THREE, tL = 0.55; narrowFan(A, tL, [0, 1, 2], 14);
    FXk.trail(A, { of: 'tipA', t0: 0.42, t1: 0.6, len: 0.25, w: 0.07, op: 0.4 });
    // a jade feather pinned on each painted foe; on her next skill each one flares and is struck again
    [0, 1, 2].forEach((d) => { FXk.stuck(A, { t: tL + 0.16, dur: 1.75, at: () => at0(A, d, 1, 1.0), dir: [0.3, -0.4, 0.2], scale: 0.7 }); FXk.ring(A, { t: tL + 0.18, dur: 1.7, at: () => at0(A, d, 1, 0.02), r0: 0.42, r1: 0.45, w: 0.15, op: 0.55, e: 'lin' });
      FXk.spark(A, { t: 2.3, at: { d }, r: 0.2, col: A.C.jade }); FXk.ring(A, { t: 2.3, at: () => at0(A, d, 2.3), r0: 0.2, r1: 0.9, dur: 0.3, w: 0.3 }); A.hit(d, 2.32, 8, { col: A.C.jade }); });
    FXa(A, { t: 2.16, dur: 0.12, to: { d: 3 }, hits: [{ d: 3, n: 12 }] });
    A.cap(0.4, 1.6, '中扇的敌人被涂上羽记 3 秒', 'Foes hit are painted for 3 s'); A.cap(1.6, 3.4, '她的下一个技能也打每个羽记：各 8', 'Her next skill also strikes each painted foe: 8'); } };

// VO10 Hopping rain: the base rain; each second it hops to the thickest pack within 4 u
VO.F10 = { ...DEFS.F10, T: 5.8, cam: { x: 1.0, z: 0, w: 8.6 }, seq: [[0.3, 'vUpShot'], [1.3, 'vPoint', { loop: true, until: 5.6 }]], root: [{ t: 1.05 }, { t: 1.25, spin: 20, e: 'out' }, { t: 2.2 }, { t: 2.3, spin: -13, e: 'out' }, { t: 3.2 }, { t: 3.3, spin: 20, e: 'out' }, { t: 4.2 }, { t: 4.3, spin: -13, e: 'out' }], dum: [[0.4, -1.4], [3.1, 0.9], [3.6, 1.4], [3.0, 1.7], [1.2, -1.0], [1.6, -1.6]],
  fx(A) { const T = A.THREE, tL = 0.8; FXa(A, { t: tL, dur: 0.3, to: [-1.4, 5.0, 0], len: 1.2, glow: A.C.jade });
    const spots = [[1.0, -1.3], [3.3, 1.35], [1.0, -1.3], [3.3, 1.35]]; const sp = (t) => { const k = Math.max(0, Math.min(3, Math.floor(t - 1.3))); const u = A.clamp((t - 1.3 - k - 0.88) / 0.12); const a = spots[k], b = spots[Math.min(3, k + 1)]; return new T.Vector3(A.lerp(a[0], b[0], u), 0, A.lerp(a[1], b[1], u)); };
    FXk.rain(A, { t0: 1.3, t1: 5.3, at: sp, r: 1.4, rate: 20, h: 4.5, slant: [0.35, 0.15] }); FXk.ring(A, { t: 1.25, at: sp, r0: 1.3, r1: 1.4, dur: 4.1, w: 0.06, op: 0.35, e: 'lin' });
    [2.3, 3.3, 4.3].forEach((t) => { FXk.ring(A, { t, at: () => sp(t + 0.12), r0: 0.4, r1: 1.5, dur: 0.3, w: 0.25 }); FXk.trail(A, { of: (tt) => sp(tt).add(new T.Vector3(0, 2.6, 0)), t0: t - 0.12, t1: t, len: 0.12, w: 0.5, op: 0.4 }); });
    A.card.dum.forEach((dm, i) => { for (let k = 0; k < 8; k++) { const t = 1.5 + k * 0.5, p = sp(t); if (Math.hypot(dm.x - p.x, dm.z - p.z) < 1.5) A.hit(i, t, 7); } });
    A.cap(1.3, 5.6, '每秒跳到 4 u 内最密的敌群', 'Each second it hops to the thickest pack within 4 u'); } };

// VO12 Spinning top: the ring of twelve spins up and rolls 5 u along her aim in 1 s: 16 to each foe it passes
VO.F12 = { ...DEFS.F12, T: 3.0, cam: { x: 1.4, z: 0, w: 8.2 }, her: H(-1.6), dum: [[0.4, 0.3], [1.4, -0.4], [2.4, 0.4], [3.3, -0.2], [2.0, 2.0]],
  fx(A) { const T = A.THREE, s0 = 0.58, s1 = 0.94, tr = 1.0, D = 5.0; const g = A.add(new T.Group()); g.visible = false;
    for (let k = 0; k < 12; k++) { const m = new T.Mesh(A.arrowGeo, A.arrowMat); const an = k * Math.PI / 6; m.position.set(Math.cos(an) * 0.55, Math.sin(an) * 0.55, 0); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(Math.cos(an), Math.sin(an), 0)); m.scale.setScalar(0.65); g.add(m); }
    const rim = new T.Mesh(new T.TorusGeometry(0.62, 0.025, 6, 40), A.mat(A.C.gold, A.F.FLAT)); g.add(rim);
    const x0 = herAt(A, s1).x + 0.6; A.fx((t) => { g.visible = t >= s0 + 0.2 && t <= tr + 1.25; if (!g.visible) return; const u = A.clamp((t - tr) / 1.0); const x = A.lerp(x0, x0 + D, u);
      g.position.set(x, 0.66, 0); g.rotation.set(0, 0, -(t - s0) * 14); g.scale.setScalar(A.EASE.out(A.clamp((t - s0 - 0.2) / 0.2)) * (t > tr + 1.0 ? Math.max(0, 1 - (t - tr - 1.0) / 0.25) : 1)); rim.material.uniforms.op.value = 0.6; });
    FXk.tube(A, { t: tr, dur: 1.0, hold: 0.2, out: 0.4, flat: true, w: 0.35, col: '#BDB6A8', op: 0.3, e: 'lin', pts: () => [new T.Vector3(x0, 0.02, 0), new T.Vector3(x0 + D, 0.02, 0)] });
    A.card.dum.forEach((dm, i) => { if (Math.abs(dm.z) < 0.9) { const u = (dm.x - x0) / D; A.hit(i, tr + u * 1.0, 16, { knock: [0.3, dm.z > 0 ? 0.4 : -0.4] }); FXk.spark(A, { t: tr + u * 1.0, at: { d: i }, r: 0.12, col: A.C.parch }); } });
    A.cap(0.4, 2.8, '箭环立起来向前滚 5 u：碰到的每个敌人 16', 'The ring stands up and rolls 5 u: 16 to each foe it passes'); } };
VO.F12.seq = [[0.3, 'rWhirl', { to: 0.64 }], [0.94, 'vBowl']];

// VO13 Web: the six hops (10 each); each hop leaves a jade thread between the two foes 3 s: 6 and slow to foes that touch it
VO.F13 = { ...DEFS.F13, T: 4.2,
  fx(A) { capOnly(A, DEFS.F13.fx, []); const tL = 0.58, seg = 0.11; for (let i = 0; i < 5; i++) { const t = tL + seg * (i + 2); thread(A, () => at0(A, i, t, 0.05), () => at0(A, i + 1, t, 0.05), t, { hold: 3.0, out: 0.4, r: 0.016, op: 0.75 }); }
    // two foes walk into the threads: 6 and slowed
    A.card.dum.forEach((dm, i) => { if (i % 2 === 0) A.move(i, 1.4, [0.0, -0.6], 1.6, 'lin'); });
    [0, 2, 4].forEach((i) => { A.hit(i, 1.9, 6); A.hit(i, 2.9, 6); A.status(i, 1.9, 'slow', 1.6); });
    A.cap(0.4, 1.4, '跳六次，各 10', 'Six hops, 10 each'); A.cap(1.4, 4.0, '每跳留下一根丝 3 秒：碰到的敌人 6，减速 30%', 'Each hop leaves a thread 3 s: 6 and slow 30% to foes touching it'); } };

// VO14 Updraft: the twister lifts every foe within 2 u for 1.5 s and shoots them as the base
VO.F14 = { ...DEFS.F14, T: 4.2, seq: [[0.3, 'vSpindle']], root: [{ t: 0.34 }, { t: 0.72, spin: 720, e: 'io2' }], dum: [[1.0, -0.8], [1.9, 0.6], [1.0, 0.9], [2.0, -0.9], [3.6, 1.6]],
  fx(A) { const T = A.THREE, tL = 0.9, spot = [1.4, 0, 0], t0 = tL + 0.18; FXa(A, { t: tL, dur: 0.18, to: [spot[0], 0.1, spot[2]], len: 0.9, glow: A.C.jade });
    FXk.twister(A, { t0, t1: t0 + 1.8, at: spot, r: 1.6, h: 3.0 }); FXk.ring(A, { col: A.C.jade, t: t0, at: spot, r0: 0.3, r1: 2.0, dur: 0.4, w: 0.12 });
    [0, 1, 2, 3].forEach((i) => { const dm = A.card.dum[i]; A.moveTo(i, t0 + 0.05, [spot[0] + (dm.x - spot[0]) * 0.5, (dm.z) * 0.5], 0.4, 'out'); A.launch(i, t0 + 0.1 + i * 0.05, 1.3); });
    for (let k = 0; k < 6; k++) { const tk = t0 + 0.35 + k * 0.22, i = k % 4; FXa(A, { t: tk, dur: 0.12, from: [spot[0], 2.0, spot[2]], to: { d: i }, len: 0.6, hits: [{ d: i, n: 6 }] }); }
    A.cap(0.4, 4.0, '旋风把 2 u 内的敌人卷上天 1.5 秒，再射：6 × 6', 'The twister lifts every foe within 2 u for 1.5 s and shoots them: 6 × 6'); } };

// VO15 Linked traps: three traps 2 u apart joined by a cord; when one snaps, the cord drags the foes on the others to it
VO.F15 = { T: 4.8, cam: { x: 0.0, z: 0, w: 7.6 }, her: H(-2.8), seq: [[0.34, 'vStabHop'], [0.74, 'vStabHop'], [1.14, 'vStabHop'], [1.45, 'vWhip']],
  root: [{ t: 0.3, sd: 2.0 }, { t: 0.78, sd: 2.0 }, { t: 0.9, sd: 0.0, e: 'out' }, { t: 1.18 }, { t: 1.3, sd: -2.0, e: 'out' }, { t: 1.95, sd: -2.0 }, { t: 2.25, sd: -0.6, fw: -1.0 }], hops: [[1.95, 2.25, 0.25]],
  dum: [[0.6, -1.9], [0.4, 0.1], [0.7, 2.1]],
  fx(A) { const T = A.THREE, xs = -2.1, P = [[xs, 2.0], [xs, 0.0], [xs, -2.0]], tP = [0.62, 1.02, 1.42];
    P.forEach((p, k) => { FXk.stuck(A, { t: tP[k], dur: 4.6 - tP[k], at: [p[0], 0.18, p[1]], dir: [0.1, -1, 0] }); FXk.ring(A, { t: tP[k], at: [p[0], 0, p[1]], r0: 0.2, r1: 0.6, dur: 0.3, w: 0.2, col: A.C.bone }); FXk.ring(A, { t: tP[k] + 0.3, at: [p[0], 0, p[1]], r0: 0.59, r1: 0.6, dur: 4.2 - tP[k], w: 0.06, col: A.C.bone, op: 0.4, e: 'lin' }); });
    FXk.spark(A, { t: 1.6, at: [xs, 0.3, 0], r: 0.14, col: A.C.parch }); thread(A, [xs, 0.12, 2.0], [xs, 0.12, 0.0], 1.58, { hold: 0.77, out: 0.2, sag: 0.05 }); thread(A, [xs, 0.12, 0.0], [xs, 0.12, -2.0], 1.62, { hold: 0.73, out: 0.2, sag: 0.05 });
    // foes walk onto all three; the middle one snaps and the cord reels the other two in
    A.card.dum.forEach((dm, i) => A.moveTo(i, 1.4, [xs + 0.05, P[2 - i][1]], 0.9, 'lin')); const ts = 2.4;
    [0, 2].forEach((i) => { A.moveTo(i, ts + 0.1, [xs + 0.3, i ? 0.45 : -0.45], 0.35, 'in'); thread(A, () => at0(A, i, ts + 0.05, 0.3), [xs, 0.3, 0], ts, { hold: 0.35, out: 0.2, r: 0.025 }); });
    for (let k = 0; k < 5; k++) FXk.tube(A, { t: ts + k * 0.015, dur: 0.12, hold: 0.5, out: 0.25, r: 0.03, col: A.C.bone, op: 0.85, e: 'out', pts: () => [new T.Vector3(xs + Math.cos(k) * 0.6, 0.02, Math.sin(k) * 0.6), new T.Vector3(xs + Math.cos(k + 0.6) * 0.45, 0.7, Math.sin(k + 0.6) * 0.45), new T.Vector3(xs, 1.1, 0)] });
    [0, 1, 2].forEach((i) => { A.status(i, ts + 0.5, 'slow', 2.0); for (let k = 0; k < 4; k++) A.hit(i, ts + 0.5 + k * 0.5, 6); }); A.shake(ts, 0.04, 0.15);
    A.cap(0.4, 2.3, '三个陷阱一排，用绳连着', 'Three traps in a row, joined by a cord'); A.cap(2.3, 4.6, '一个合上，绳把另两个上的敌人拖过来；减速 40%，每半秒 6', 'One snaps: the cord drags the others in; slowed 40%, 6 a half second'); } };

// VO16 Crossfire: two curtains sweep in from her left and right and cross over her aim: three hits of 10 each; the cross takes both
VO.F16 = { T: 4.2, cam: { x: 1.4, z: 0, w: 8.8 }, her: H(-3.0), seq: [[0.3, 'vSky2'], [2.2, 'vCrossX']], root: [{ t: 0.68 }, { t: 0.86, spin: 360, e: 'io2' }],
  dum: [[1.6, -1.7], [2.3, 0.15], [2.8, -0.25], [3.2, 1.8]],
  fx(A) { const T = A.THREE, tL = 0.92, cx = 2.4, cz = 0.0; FXa(A, { t: 0.62, dur: 0.3, to: [-2.4, 4.2, -0.8], len: 1.2, glow: A.C.jade }); FXa(A, { t: tL, dur: 0.3, to: [-2.4, 4.2, 0.8], len: 1.2, glow: A.C.jade });
    // each curtain is a row of falling arrows that marches in from one side, one row every 0.17 s
    const rows = [];
    [1, -1].forEach((sd) => { for (let k = 0; k < 6; k++) { const tk = 1.4 + k * 0.17, zz = cz + sd * (2.5 - k * 0.5); rows.push([tk, zz, sd]);
        for (let j = 0; j < 5; j++) { const x = cx - 1.6 + j * 0.8; FXa(A, { t: tk, dur: 0.16, from: [x - 0.3, 3.0, zz + sd * 0.5], to: [x, 0.05, zz], len: 0.9, w: 0.07, stick: 0.3 }); }
        FXk.tube(A, { t: tk + 0.16, dur: 0.05, hold: 0.15, out: 0.25, flat: true, w: 0.22, op: 0.45, e: 'lin', pts: () => [new T.Vector3(cx - 1.9, 0.03, zz), new T.Vector3(cx + 1.9, 0.03, zz)] }); } });
    const tx = 1.4 + 5 * 0.17 + 0.16; [[-1, 1], [1, 1]].forEach(([a]) => FXk.tube(A, { t: tx, dur: 0.1, hold: 0.45, out: 0.4, flat: true, w: 0.42, op: 0.65, e: 'lin', pts: () => [new T.Vector3(cx - 1.3, 0.04, cz - 1.3 * a), new T.Vector3(cx + 1.3, 0.04, cz + 1.3 * a)] }));
    FXk.ring(A, { t: tx, at: [cx, 0, cz], r0: 0.3, r1: 1.6, dur: 0.35, w: 0.25 }); A.shake(tx, 0.04, 0.3);
    A.card.dum.forEach((dm, i) => [1, -1].forEach((sd) => { let n = 0; rows.forEach(([tk, zz, s2]) => { if (s2 === sd && n < 3 && Math.abs(dm.z - zz) <= 0.55) { A.hit(i, tk + 0.16 + n * 0.04, 10); n++; } }); }));
    A.cap(0.4, 1.4, '两道箭幕从左右两边扫进来', 'Two curtains sweep in from left and right'); A.cap(1.4, 4.0, '每道各三次 10；交叉处两道都吃', '3 × 10 from each; the cross takes both'); } };

// VO17 Gust: one flap of the fanned arrows: every foe in a 90°, 3 u cone takes 9, is knocked 2 u back, its shots in flight drop
VO.F17 = { T: 2.8, cam: { x: 0.2, z: 0, w: 7.0 }, her: H(-2.0), seq: [[0.3, 'vGust']],
  dum: [[-0.6, -0.8], [-0.3, 0.1], [-0.6, 0.9], [2.8, 0.6]],
  fx(A) { const T = A.THREE, tL = 0.68; foeShot(A, { t: 0.45, dur: 0.6, from: [2.8, 0.7, 0.6], to: [-2.0, 0.7, 0.1], stop: 0.47, r: 0.13 }); FXk.dust(A, { t: 0.73, at: [0.55, 0.5, 0.35], n: 4, col: CRIM, r: 0.06, sp: 0.6, op: 0.6 });
    for (let k = 0; k < 4; k++) FXk.tube(A, { t: tL + k * 0.03, dur: 0.2, hold: 0.05, out: 0.3, flat: true, w: 0.25, op: 0.45, e: 'out', pts: () => { const c = herAt(A, tL); const r = 0.9 + k * 0.6; return [...Array(9)].map((_, i) => { const a = (-45 + i * 11.25) * Math.PI / 180; return new T.Vector3(c.x + Math.cos(a) * r, 0.35, c.z + Math.sin(a) * r); }); } });
    [0, 1, 2].forEach((i) => { const dm = A.card.dum[i], dx = dm.x + 2.0, dz = dm.z, l = Math.hypot(dx, dz); A.hit(i, tL + 0.08, 9, { knock: [dx / l * 2.0, dz / l * 2.0], kdur: 0.35 }); FXk.dust(A, { t: tL + 0.1, at: [dm.x, 0, dm.z], n: 5, dir: [dx, dz], sp: 1.8 }); });
    A.cap(0.4, 2.6, '一扇：90° 3 u 内各 9，吹退 2 u，飞来的子弹落地', 'One flap: 9 in a 90°, 3 u cone, knocked 2 u back; shots in flight drop'); } };

// VO18 Decoy: a feather image of her stays where she stood: foes within 4 u attack it 2 s, then it bursts into eight arrows of 8
VO.F18 = { ...DEFS.F18, T: 3.6, dum: [[0.0, -0.8], [0.2, 0.7], [1.4, 0.0]],
  fx(A) { const T = A.THREE, c = herAt(A, 0.38); FXk.dust(A, { t: 0.94, at: () => herAt(A, 0.95), n: 5, dir: [-1, 0] });
    // the feather outline of her: a pale standing shape that shivers as it is struck
    const g = A.add(new T.Group()); g.visible = false; const fm = A.mat(A.C.parch, A.F.FLAT);
    for (let k = 0; k < 16; k++) { const s = new T.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.09, 0.22, 0, 0.46); s.quadraticCurveTo(-0.09, 0.22, 0, 0); const m = new T.Mesh(new T.ShapeGeometry(s), fm); m.material.side = T.DoubleSide; const a = (k / 16) * 6.28 * 2; const y = 0.15 + (k / 16) * 0.95; const r = 0.22 * (1 - (k / 16) * 0.45); m.position.set(Math.cos(a) * r, y, Math.sin(a) * r); m.rotation.set(0, -a + 1.57, (k % 2 ? 0.25 : -0.25)); g.add(m); }
    const ear = (sx) => { const m = new T.Mesh(new T.ShapeGeometry((() => { const s = new T.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.08, 0.2, 0, 0.42); s.quadraticCurveTo(-0.08, 0.2, 0, 0); return s; })()), fm); m.position.set(0, 1.1, sx * 0.07); m.rotation.set(sx * 0.2, 1.57, 0); g.add(m); }; ear(1); ear(-1);
    FXk.disc(A, { t: 0.4, at: [c.x, 0, c.z], r0: 0.45, r1: 0.5, dur: 2.05, op: 0.2 }); FXk.ring(A, { t: 0.4, at: [c.x, 0, c.z], r0: 0.2, r1: 4.0, dur: 0.45, w: 0.08, op: 0.5 });
    A.fx((t) => { const a = t - 0.4; g.visible = a >= 0 && a < 2.05; if (!g.visible) return; g.position.set(c.x, 0, c.z); g.rotation.y = Math.sin(a * 20) * 0.08 * (a > 0.6 ? 1 : 0); fm.uniforms.op.value = 0.85 * A.clamp(a / 0.2); });
    [0, 1, 2].forEach((i) => { A.moveTo(i, 0.6, [c.x + 0.6 + i * 0.2, (i - 1) * 0.6], 0.5, 'lin'); [1.2, 1.7].forEach((t) => FXk.spark(A, { t: t + i * 0.07, at: [c.x + 0.2, 0.7, c.z + (i - 1) * 0.2], r: 0.1, col: CRIM })); });
    const tb = 2.45; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; FXa(A, { t: tb, dur: 0.2, from: [c.x, 0.6, c.z], to: [c.x + Math.cos(a) * 2.6, 0.55, c.z + Math.sin(a) * 2.6], len: 0.6, scale: 0.8 }); }
    FXk.ring(A, { t: tb, at: [c.x, 0, c.z], r0: 0.2, r1: 2.0, dur: 0.35, w: 0.3 }); [0, 1, 2].forEach((i) => A.hit(i, tb + 0.08, 8, { knock: [0.4, (i - 1) * 0.3] }));
    A.cap(0.4, 2.4, '原地留下羽毛替身：4 u 内的敌人打它 2 秒', 'A feather decoy stays: foes within 4 u attack it for 2 s'); A.cap(2.4, 3.4, '然后炸成八支箭：各 8', 'Then it bursts into eight arrows: 8 each'); } };

// VO19 Bouncing launch: the kick launches one foe; where it lands it launches the foe it lands on, up to five: 10 each
VO.F19 = { ...DEFS.F19, T: 4.0, cam: { x: 0.6, z: 0, w: 8.4 }, dum: [[-1.15, -0.1], [0.2, 0.3], [1.4, -0.3], [2.5, 0.25], [3.5, -0.2]],
  fx(A) { const T = A.THREE, tk = 0.6; FXk.trail(A, { of: 'footL', of2: 'footR', t0: 0.48, t1: 0.66, len: 0.16, op: 0.75 }); A.hit(0, tk, 10, { up: 0.9 });
    // each launched foe flies onto the next and pops it up
    for (let i = 0; i < 4; i++) { const t0 = tk + i * 0.55, dm = A.card.dum[i], nx = A.card.dum[i + 1]; A.moveTo(i, t0 + 0.02, [nx.x - 0.25, nx.z], 0.5, 'lin'); A.launch(i, t0 + 0.02, 0.9); A.hit(i + 1, t0 + 0.52, 10, { up: 0.9 });
      FXk.ring(A, { t: t0 + 0.52, at: () => at0(A, i + 1, t0 + 0.52), r0: 0.2, r1: 0.8, dur: 0.25, w: 0.3 }); FXk.trail(A, { of: (t) => at0(A, i, t, 0.6), t0: t0 + 0.05, t1: t0 + 0.5, len: 0.2, w: 0.12, op: 0.5 }); }
    FXk.dust(A, { t: 1.04, at: () => herAt(A, 1.05), n: 6 });
    A.cap(0.4, 3.8, '踢飞一个；它落在谁身上就把谁弹起，最多五个：各 10', 'The kick launches one; it launches the foe it lands on, up to five: 10 each'); } };

// VO20 Two knots: the knot and a second at the pointer; the two packs are dragged into each other and crash: 4 each, stun 0.4 s
VO.F20 = { ...DEFS.F20, T: 3.6, cam: { x: 0.8, z: 0, w: 9.0 }, hops: [], root: [{ t: 0.96 }, { t: 1.12, spin: 360, e: 'io2' }], dum: [[0.4, -2.0], [1.2, -2.6], [0.7, -1.4], [2.4, 2.0], [1.6, 2.6], [2.2, 1.4]],
  fx(A) { const T = A.THREE, tT = 0.92, K = [[0.8, -2.0], [2.0, 2.0]], m = [1.4, 0.0];
    FXk.trail(A, { of: 'tipA', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 }); FXk.trail(A, { of: 'tipB', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 });
    K.forEach((k, j) => { thread(A, () => A.at('tipA', tT + j * 0.2), [k[0], 0.6, k[1]], tT + j * 0.2, { hold: 0.25, out: 0.2, r: 0.025, sag: -0.5 }); FXk.helix(A, { t: tT + j * 0.2, dur: 0.15, from: [k[0], 0.1, k[1]], to: [k[0], 1.1, k[1]], r: 0.5, turns: 2, strands: 2, hold: 0.3, out: 0.25, op: 0.7 }); });
    A.card.dum.forEach((dm, i) => { const j = i < 3 ? 0 : 1, sgn = j ? 1 : -1; A.moveTo(i, tT + 0.35, [m[0] + (i % 3 - 1) * 0.35, m[1] + sgn * 0.35], 0.55, 'in'); A.hit(i, tT + 0.9, 4, { stun: 0.4 }); });
    FXk.dust(A, { t: tT + 0.9, at: [m[0], 0, m[1]], n: 10, sp: 2.0, r: 0.25 }); FXk.ring(A, { t: tT + 0.9, at: [m[0], 0, m[1]], r0: 0.3, r1: 1.4, dur: 0.3, w: 0.3 }); A.shake(tT + 0.9, 0.05, 0.2);
    A.cap(0.4, 3.4, '两个风结：两群敌人被拖到一起撞上，各 4，眩晕 0.4 秒', 'Two knots: the two packs are dragged into each other: 4 each, stun 0.4 s'); } };
VO.F20.seq = [[0.3, 'vKnots']];

// VO21 Dust cloud: the three kicks raise a 3 u dust cloud for 3 s; foes in it are blinded (their hits miss); her arrows still find them
VO.F21 = { ...DEFS.F21, T: 4.6, dum: [[0.32, 0.2], [-1.3, 0.72], [-0.92, -0.95], [1.2, -0.8]],
  fx(A) { const T = A.THREE, c = herAt(A, 0.5); FXk.trail(A, { of: 'footL', t0: 0.42, t1: 1.12, len: 0.16, w: 0.18, op: 0.4, col: '#BDB6A8' }); FXk.trail(A, { of: 'footR', t0: 0.42, t1: 1.12, len: 0.16, w: 0.18, op: 0.4, col: '#BDB6A8' });
    [0.4, 0.7, 1.0].forEach((tk) => [0, 1, 2].forEach((i) => A.hit(i, tk + 0.02 * i, 6)));
    for (let k = 0; k < 7; k++) FXk.dust(A, { t: 0.45 + k * 0.45, at: [c.x, 0, c.z], n: 12, sp: 2.6, r: 0.55, op: 0.42, dur: 1.4, rise: 3, seed: 3 + k });
    FXk.ring(A, { t: 0.5, at: [c.x, 0, c.z], r0: 2.9, r1: 3.0, dur: 3.2, w: 0.05, col: '#BDB6A8', op: 0.5, e: 'lin' });
    // a blinded foe's hit swings wide; her arrow still finds a foe in the cloud
    foeShot(A, { t: 1.7, dur: 0.4, from: [1.2, 0.7, -0.8], to: [c.x + 0.6, 0.7, c.z + 2.0] }); A.cap(1.6, 2.5, '致盲：打偏', 'Blinded: it misses');
    FXa(A, { t: 2.6, dur: 0.12, from: 'hips', to: { d: 3 }, len: 0.6, hits: [{ d: 3, n: 12 }] });
    A.cap(0.4, 1.6, '三脚各 6，扬起 3 u 的沙尘 3 秒', 'Three kicks of 6 raise a 3 u dust cloud for 3 s'); A.cap(2.5, 4.4, '她的箭照样打中', 'Her arrows still find them'); } };
VO.F21.seq = [[0.3, 'kCyclone'], [2.4, 'combo1']];

// VO22 Ripple: the strikes and the shot on one foe; then the shock runs through every foe touching it, and on through the knot: 10 each
VO.F22 = { ...DEFS.F22, T: 3.2, cam: { x: 0.2, z: 0, w: 7.0 }, dum: [[-0.85, 0.05], [-0.35, 0.45], [0.05, -0.15], [0.2, 0.6], [0.6, 0.15], [2.4, 0.9]],
  fx(A) { const h0 = A.hit; A.hit = function (i, t, n, o = {}) { return h0.call(this, i, t, n, { ...o, knock: null }); }; capOnly(A, DEFS.F22.fx, []); A.hit = h0;
    const order = [[0, 1, 1.0], [1, 2, 1.12], [0, 2, 1.12], [2, 3, 1.24], [3, 4, 1.36], [2, 4, 1.36]]; const hit = new Set([0]);
    FXk.ring(A, { t: 0.95, at: () => at0(A, 0, 0.95), r0: 0.2, r1: 0.7, dur: 0.25, w: 0.35 });
    order.forEach(([a, b, t]) => { thread(A, () => at0(A, a, t, 0.7), () => at0(A, b, t, 0.7), t, { dur: 0.08, hold: 0.2, out: 0.25, r: 0.05, op: 0.9 }); if (!hit.has(b)) { hit.add(b); A.hit(b, t + 0.08, 10); FXk.spark(A, { t: t + 0.08, at: { d: b }, r: 0.12, col: A.C.parch }); } });
    A.hit(0, 1.08, 10);
    A.cap(0.4, 0.95, '弓击 8、8，近射 14', 'Bow strikes 8, 8, the shot 14'); A.cap(0.95, 3.0, '冲击沿着挨在一起的敌人一个传一个：各 10', 'The shock runs on through every foe touching another: 10 each'); } };

// VO23 Parting fans: each second of the run she looses a fan of five arrows behind her: 6 each
VO.F23 = { ...DEFS.F23, cam: { x: -1.6, z: -1.5, w: 8.8 }, seq: [[0.2, 'idle', { from: 5.15, to: 5.55 }], [0.6, 'run', { loop: true, until: 1.25, speed: 1.15 }], [1.25, 'vRunBackA'], [1.57, 'run', { loop: true, until: 2.25, speed: 1.15 }], [2.25, 'vRunBackB'], [2.57, 'run', { loop: true, until: 3.18, speed: 1.15 }], [3.18, 'vRunRoll']], dum: [[0.25, 0.3], [-1.75, -4.1], [-4.4, -0.35]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footL', t0: 0.6, t1: 3.6, len: 0.3, w: 0.1, op: 0.4 }); FXk.trail(A, { of: 'footR', t0: 0.6, t1: 3.6, len: 0.3, w: 0.1, op: 0.4 });
    [1.4, 2.4, 3.4].forEach((tk) => { const r = A.rootAt(tk), f = A.fwd(tk), c = [r.x, 0.6, r.z], b = Math.atan2(-f.x, -f.z);
      [-30, -15, 0, 15, 30].forEach((a) => { const bb = b + a * Math.PI / 180; FXa(A, { t: tk, dur: 0.16, from: c, to: [c[0] + Math.sin(bb) * 3.0, 0.55, c[2] + Math.cos(bb) * 3.0], len: 0.8, w: 0.08 }); });
      FXk.tube(A, { t: tk, dur: 0.16, hold: 0.15, out: 0.3, flat: true, w: 0.14, op: 0.4, e: 'out', pts: () => [...Array(9)].map((_, i) => { const bb = b + (-30 + i * 7.5) * Math.PI / 180; return new T.Vector3(c[0] + Math.sin(bb) * 2.2, 0.03, c[2] + Math.cos(bb) * 2.2); }) });
      A.card.dum.forEach((dm, i) => { const p = A.dpos(i, tk); const dx = p.x - c[0], dz = p.z - c[2], d = Math.hypot(dx, dz); const df = Math.abs(((Math.atan2(dx, dz) - b + 3 * Math.PI) % (2 * Math.PI)) - Math.PI); if (d < 3.2 && df < 0.6) { A.hit(i, tk + 0.16 * d / 3, 6); A.hit(i, tk + 0.04 + 0.16 * d / 3, 6); } }); });
    A.cap(0.6, 4.4, '跑的每一秒，向身后扇射五箭：各 6', 'Each second of the run, a fan of five behind her: 6 each'); } };

// VO24 Fountain: the dive; the landing crater sprays arrows for 1.5 s: 3 to each foe within 3 u every 0.3 s
VO.F24 = { ...DEFS.F24, T: 4.0, seq: [[0.3, 'kDive', { to: 1.35 }], [1.6, 'vCrater']], root: [...DEFS.F24.root, { t: 1.62 }, { t: 3.0, spin: 1130, e: 'io2' }], dum: [[0.2, -0.9], [0.95, 0.9], [-0.5, 0.7], [3.3, -1.2], [4.3, 0.6]],
  fx(A) { capOnly(A, DEFS.F24.fx, []); const T = A.THREE, tl = 1.58, c = herAt(A, tl);
    FXk.ring(A, { t: tl, at: [c.x, 0, c.z], r0: 0.3, r1: 1.0, dur: 0.3, w: 0.4 }); FXk.ring(A, { t: tl + 0.2, at: [c.x, 0, c.z], r0: 0.75, r1: 0.8, dur: 1.6, w: 0.15, op: 0.5, col: A.C.bone, e: 'lin' });
    for (let k = 0; k < 18; k++) { const tk = tl + 0.1 + k * 0.08, a = k * 2.4, r = 1.2 + (k % 4) * 0.5; const to = [c.x + Math.cos(a) * r, 0.05, c.z + Math.sin(a) * r];
      FXa(A, { t: tk, dur: 0.32, from: [c.x, 0.2, c.z], to, len: 0.7, w: 0.06, arc: 1.4, stick: 0.25 }); }
    A.card.dum.forEach((dm, i) => { if (Math.hypot(dm.x - c.x, dm.z - c.z) < 3.0) for (let k = 0; k < 5; k++) A.hit(i, tl + 0.3 + k * 0.3, 3); });
    A.cap(0.4, 1.6, '鹰坠下砸', 'The dive'); A.cap(1.6, 3.8, '坑里喷箭 1.5 秒：3 u 内每 0.3 秒各 3', 'The crater sprays arrows 1.5 s: 3 to each foe within 3 u every 0.3 s'); } };

// GA1 Chase: a spinning back kick flies the foe 3 u into the others (8); the arrow chases it and nails it where it lands: 30, stun 0.4 s
// ------------------------------------------------ Gale 弓斗 (kit 2.5)
const capsOf = (A, fn) => capOnly(A, fn, []);
const pips = (A, i, t0, pops, burst) => { const T = A.THREE; const ms = [...Array(5)].map(() => { const m = A.add(new T.Mesh(new T.SphereGeometry(0.06, 10, 8), new T.MeshBasicMaterial({ color: A.C.jade }))); m.visible = false; return m; });
  A.fx((t) => ms.forEach((m, k) => { const end = pops[k]; m.visible = t >= t0 && t < end; if (!m.visible) return; const p = A.dpos(i, t), a = k * 1.2566 + t * 2.0; m.position.set(p.x + Math.cos(a) * 0.32, p.y + 1.55, p.z + Math.sin(a) * 0.32); m.scale.setScalar(1 + 0.25 * Math.sin(t * 10 + k)); }));
  pops.forEach((tp, k) => FXk.spark(A, { t: tp, at: () => { const p = A.dpos(i, tp), a = k * 1.2566 + tp * 2.0; return new T.Vector3(p.x + Math.cos(a) * 0.32, p.y + 1.55, p.z + Math.sin(a) * 0.32); }, r: 0.1, col: A.C.jade })); };

// GA1 Chase: a spinning back kick flies the foe 3 u into the others (8); the arrow chases it and nails it where it lands: 30, stun 0.4 s
GA.F1 = { T: 3.0, headMin: 0.02, cam: { x: 0.4, z: 0, w: 7.2 }, her: H(-1.6), // spec F1: a pivot on the left paw, a mule kick from her forepaws, the push rolls her forward, a hop turn, the chasing shot from a sprinter's lunge
  seq: [[0.3, 'gChase'], [0.92, 'gLunge', { fade: 0.03 }]],
  root: [{ t: 0.3 }, { t: 0.43, spin: 180, e: 'io2' }, { t: 0.53, pitch: 60, y: -0.02, e: 'in' }, { t: 0.58, pitch: 60 },
    ...rk(0.6, 0.8, (u) => ({ fw: -0.75 * u, pitch: 60 + 300 * u, y: -0.26 * Math.sin(Math.PI * u) - 0.2 * Math.max(0, Math.sin(Math.PI * (u - 0.3) / 0.6)) }), 10), { t: 0.86, fw: -0.75, spin: 180 }, { t: 0.89, fw: -0.72, y: 0.14, spin: 270, e: 'lin', ye: 'out' }, { t: 0.92, fw: -0.7, y: 0, spin: 360, e: 'out', ye: 'in' }],
  dum: [[-0.7, 0.05], [2.6, -0.45], [2.75, 0.55]],
  fx(A) { FXk.trail(A, { of: 'footL', of2: 'footR', t0: 0.44, t1: 0.56, len: 0.14, op: 0.7 }); A.hit(0, 0.53, 8, { stop: true }); kickRing(A, 0.53, () => dumAt(A, 0, 0.53, 0.6), 0.5); FXk.dust(A, { t: 0.53, at: () => herAt(A, 0.53), n: 5, sp: 0.8 });
    A.moveTo(0, 0.55, [2.3, 0.05], 0.4, 'out'); A.launch(0, 0.55, 0.3); FXk.trail(A, { of: (t) => { const p = A.dpos(0, t); return new A.THREE.Vector3(p.x, p.y + 0.6, p.z); }, t0: 0.57, t1: 0.95, len: 0.25, w: 0.2, op: 0.45 });
    [1, 2].forEach((i) => A.hit(i, 0.95, 4, { knock: [0.45, i === 1 ? -0.3 : 0.3], nostop: true })); FXk.dust(A, { t: 0.95, at: [2.3, 0, 0.05], n: 7, sp: 1.4 }); FXk.dust(A, { t: 0.8, at: () => herAt(A, 0.8), n: 4, sp: 0.6 });
    const tL = 1.12; FXa(A, { t: tL, dur: 0.16, to: { d: 0 }, len: 1.2, glow: A.C.jade, hits: [{ d: 0, n: 30, big: true, stun: 0.4 }] }); FXk.ring(A, { t: tL + 0.16, at: () => at0(A, 0, tL + 0.16, 0.05), r0: 0.2, r1: 0.8, dur: 0.3, w: 0.3 });
    A.cap(0.3, 1.1, '转身后踢把它踢飞 3 u，撞进敌群：8', 'A pivot and a mule kick fly it 3 u into the others: 8'); A.cap(1.1, 2.8, '前滚翻起身，箭追上去钉住它：30，眩晕 0.4 秒', 'She rolls up and the arrow chases it down: 30, stun 0.4 s'); } };

// GA2 Wound kick: held, she coils on one paw up to 0.8 s; full, a 2.5 u spinning kick: 40, push 1 u
GA.F2 = { T: 3.2, cam: { x: -0.4, z: 0, w: 7.0 }, her: H(-0.4), // spec F2: a coffee-grinder coil on the left paw while held (the right leg sweeping the floor, faster and faster), then a tornado kick turning the same way, landing on the kicking leg
  seq: [[0.3, 'gGrindIn'], [0.48, 'gGrind', { loop: true, until: 1.08, fade: 0.05 }], [1.08, 'gTornado', { fade: 0.03 }]],
  root: [{ t: 0.48 }, ...rk(0.48, 1.08, (u) => ({ spin: 200 * u + 340 * u * u }), 12), { t: 1.14, y: 0.35, ye: 'out' }, { t: 1.3, spin: 900, y: 0.3, e: 'out' }, { t: 1.34, y: 0, ye: 'in' }],
  dum: [[1.3, 0.6], [-0.7, -1.7], [-1.9, 0.9], [0.6, -1.5], [3.0, 1.2]],
  fx(A) { const T = A.THREE, c = footAt(A, 0.3);
    // the coil: wind winds up the sweeping leg while she holds; the dust circle grows
    FXk.helix(A, { t: 0.5, dur: 0.6, from: [c.x, 0.05, c.z], to: [c.x, 0.5, c.z], r: 0.35, turns: 3, strands: 2, hold: 0.02, out: 0.15, op: 0.45, col: A.C.jade }); FXk.trail(A, { of: 'footR', t0: 0.5, t1: 1.08, len: 0.3, w: 0.12, op: 0.5, col: A.C.jade });
    [0.55, 0.72, 0.88, 1.02].forEach((t, k) => { FXk.ring(A, { col: A.C.jade, t, at: [c.x, 0, c.z], r0: 0.5 + k * 0.15, r1: 0.7 + k * 0.2, dur: 0.22, w: 0.12 + k * 0.05, op: 0.35 + k * 0.1 }); FXk.dust(A, { t, at: [c.x, 0, c.z], n: 3 + k, sp: 0.5 + k * 0.2, r: 0.1, op: 0.3, seed: 20 + k }); });
    A.cap(0.3, 1.1, '按住：单爪蓄力最多 0.8 秒', 'Held: she coils on one paw for up to 0.8 s');
    FXk.trail(A, { of: 'footR', t0: 1.14, t1: 1.32, len: 0.22, w: 0.24, op: 0.75 }); FXk.ring(A, { t: 1.26, at: [c.x, 0.3, c.z], r0: 0.4, r1: 2.5, dur: 0.3, w: 0.2 }); FXk.disc(A, { t: 1.26, at: [c.x, 0, c.z], r0: 0.4, r1: 2.5, dur: 0.25, op: 0.18 }); A.shake(1.28, 0.06, 0.2); FXk.dust(A, { t: 1.36, at: [c.x, 0, c.z], n: 6, sp: 1.1 });
    A.card.dum.forEach((dm, i) => { const dx = dm.x - c.x, dz = dm.z - c.z, d = Math.hypot(dx, dz); if (d <= 2.5) A.hit(i, 1.26 + (Math.atan2(dz, dx) + 3.14) / 6.28 * 0.06, 40, { big: true, knock: [dx / d, dz / d], kdur: 0.3, nostop: i > 0, stop: i === 0 }); });
    A.cap(1.1, 3.0, '满蓄：2.5 u 回旋踢，40，推开 1 u', 'Full: a 2.5 u spinning kick, 40, push 1 u'); } };

// GA3 Beat mark: the axe kick marks (12); five pips, one popped by each close hit; the fifth bursts: 18, launch 0.5 s
GA.F3 = { T: 4.2, cam: { x: -0.6, z: 0, w: 6.2 }, her: H(-2.0), seq: [[0.3, 'gTop', { to: 0.13 }], [0.43, 'gAxe', { from: 0.06, to: 0.56, fade: 0.04 }], [0.93, 'gBaby', { fade: 0.03 }], [1.48, 'kSweep', { to: 0.8 }], [2.25, 'gPush', { to: 0.32 }], [2.65, 'gWindKick'], [3.15, 'gRise']],
  root: [{ t: 0.3 }, { t: 0.43, fw: 0.15, e: 'io2' }, { t: 0.5, fw: 0.2 }, { t: 0.69, fw: 0.52, y: 0.95, e: 'out', ye: 'out' }, { t: 0.74, fw: 0.56, y: 0.95 }, { t: 0.8, fw: 0.6, y: 0.8, ye: 'in' }, { t: 0.93, fw: 0.47, y: 0, ye: 'in' }, { t: 1.01, roll: -18, e: 'out' }, { t: 1.23, roll: -18 }, { t: 1.36, roll: 0, e: 'io2' }, { t: 1.48 }, { t: 1.6, fw: 0.5, e: 'out' }, { t: 3.15, fw: 0.5 }, { t: 3.26 }, { t: 3.36, fw: 0.6, y: 0.45, e: 'out', ye: 'out' }, { t: 3.45, fw: 0.6, y: 0.45 }, { t: 3.7, fw: 0.55, y: 0, ye: 'in' }], hops: [[1.4, 1.54, 0.05]],
  dum: [[-0.75, 0.1]],
  fx(A) { FXk.trail(A, { of: 'footR', t0: 0.57, t1: 0.85, len: 0.16, w: 0.2, op: 0.75 }); A.hit(0, 0.8, 12, { big: true, stop: true }); FXk.ring(A, { t: 0.8, at: { d: 0, y: 1.0 }, r0: 0.1, r1: 0.6, dur: 0.22, w: 0.3 }); FXk.dust(A, { t: 0.95, at: () => herAt(A, 0.95), n: 4, sp: 0.6 }); A.hit(0, 1.37, null, { nostop: true });
    const pops = [1.6, 1.74, 2.36, 2.86, 3.36]; pips(A, 0, 0.84, pops); [1.6, 1.74, 2.36, 2.86].forEach((t) => A.hit(0, t, 6));
    FXk.trail(A, { of: 'footR', t0: 3.24, t1: 3.4, len: 0.16, w: 0.2, op: 0.7 }); A.hit(0, 3.36, 18, { big: true, up: 1.2, stop: true }); FXk.ring(A, { t: 3.36, at: () => at0(A, 0, 3.36, 0.9), r0: 0.2, r1: 1.0, dur: 0.3, w: 0.35 }); FXk.disc(A, { t: 3.36, at: () => at0(A, 0, 3.36, 0.9), r0: 0.2, r1: 0.8, dur: 0.2, op: 0.4 });
    A.cap(0.3, 1.4, '下劈踢：12，头上挂五个节拍', 'An axe kick: 12, and five pips over its head'); A.cap(1.4, 3.2, '她每一下近身命中打掉一个', 'Each of her close hits pops one'); A.cap(3.2, 4.0, '第五个爆开：18，挑飞 0.5 秒', 'The fifth bursts: 18, launch 0.5 s'); } };

// GA4 Slingshot: the arrow ties a cord to a foe within 6 u; she slings herself along it: a flying two-paw kick, 30; foes within 1.5 u launched 0.4 s
GA.F4 = { T: 3.2, cam: { x: 0.4, z: 0, w: 7.6 }, her: H(-2.6), seq: [[0.3, 'sPierce', { to: 0.5 }], [0.82, 'gSki', { fade: 0.05 }], [1.3, 'gDropkick', { fade: 0.03 }]], // spec F4: a water-ski lean on the cord, two bounces, a feet-first dropkick with a corkscrew, a three-point landing
  root: [{ t: 0.82 }, { t: 0.9, fw: -0.15, e: 'out' }, { t: 1.3, fw: -0.15 }, { t: 1.36, fw: 0.6, pitch: -80, y: 0.4, e: 'lin', ye: 'out' }, { t: 1.55, fw: 3.95, y: 0.45, e: 'lin' }, { t: 1.64, fw: 3.75, sd: 0.2, y: 0.75, pitch: -30, e: 'out', ye: 'out' }, { t: 1.75, fw: 3.55, sd: 0.45, y: 0, pitch: 0, ye: 'in' }],
  dum: [[1.95, 0.05], [2.9, -0.8], [2.7, 1.0], [3.6, 0.2]],
  fx(A) { const T = A.THREE, tL = 0.55; FXa(A, { t: tL, dur: 0.16, to: { d: 0 }, len: 0.9, hits: [{ d: 0, n: 4 }] });
    // the cord: slack, then pulled taut as she is flung along it
    for (let k = 0; k < 8; k++) { const t = tL + 0.16 + k * 0.08; thread(A, () => A.at('handR', t), () => at0(A, 0, t, 0.7), t, { dur: 0.02, hold: 0.06, out: 0.02, r: 0.02, sag: k < 2 ? 0.3 - k * 0.12 : 0 }); }
    FXk.trail(A, { of: 'footL', of2: 'footR', t0: 1.32, t1: 1.56, len: 0.25, op: 0.6 }); FXk.trail(A, { of: 'chest', t0: 1.32, t1: 1.55, len: 0.35, w: 0.3, op: 0.25 });
    A.hit(0, 1.55, 30, { big: true, stop: true, knock: [0.6, 0] }); kickRing(A, 1.55, () => dumAt(A, 0, 1.55, 0.7), 1.5); A.shake(1.55, 0.06, 0.2); FXk.dust(A, { t: 1.75, at: () => herAt(A, 1.75), n: 5, sp: 0.8 });
    [1, 2, 3].forEach((i) => { const dm = A.card.dum[i]; if (Math.hypot(dm.x - 1.95, dm.z) <= 1.6) { A.launch(i, 1.57 + i * 0.02, 0.2); FXk.dust(A, { t: 1.57, at: [dm.x, 0, dm.z], n: 4 }); } });
    A.cap(0.3, 0.9, '一箭把绳子系在 6 u 内的敌人身上', 'An arrow ties a cord to a foe within 6 u'); A.cap(0.9, 3.0, '她顺绳弹过去：双爪飞踢 30，1.5 u 内挑飞 0.4 秒', 'She slings herself in: a two-paw flying kick 30; foes within 1.5 u launched 0.4 s'); } };

// GA5 Foot pin: a paw on its foot roots it 1.5 s; she twists round it firing fourteen hip shots of 4
GA.F5 = { T: 4.0, cam: { x: -0.4, z: -0.9, w: 8.0 }, her: H(-2.4), // kit 2.8 Shadow kicks (Kesh 14:09): a spinning back kick; a blink behind it and a side kick; a blink and a jumping tornado kick; a blink low under its front and a rising kick; a lean-back shot up into it
  seq: [[0.3, 'zBack'], [0.98, 'gRound', { to: 0.6, fade: 0.04 }], [1.72, 'gTornadoS', { to: 0.5, fade: 0.04 }], [2.33, 'gFlash', { to: 0.78, fade: 0.04 }], [2.88, 'vUpShot', { from: 0.24, speed: 2.5, fade: 0.06 }]],
  root: [{ t: 0.32 }, { t: 0.49, spin: -180, e: 'io2' }, { t: 0.94 }, { t: 1.0, fw: 3.65, sd: 0.606, spin: -60, e: 'out' }, { t: 1.1 }, { t: 1.22, spin: -150, e: 'io2' },
    { t: 1.67 }, { t: 1.73, fw: 2.05, sd: -2.865, spin: -90, e: 'out' }, { t: 1.78 }, { t: 1.9, spin: -450, e: 'io2' }, { t: 2.35 }, { t: 2.41, fw: 1.65, sd: 0.335, spin: -360, e: 'out' }, ...rk(2.43, 2.95, (u) => ({ fw: 1.65 - 0.5 * u, y: 1.0 * 4 * u * (1 - u), pitch: -360 * A_s(u) }), 18)],
  hops: [[1.08, 1.3, 0.1], [1.76, 1.98, 0.25]],
  dum: [[-1.6, 0.0, { face: 180 }]],
  fx(A) { const T = A.THREE, K = [[0.49, [2.5, 0]], [1.22, [-1.25, -2.165]], [1.9, [0, 2.5]]], blink = (t0, t1) => { FXk.dust(A, { t: t0, at: () => herAt(A, t0), n: 5, sp: 0.8, col: A.C.jade }); FXk.trail(A, { of: 'hips', t0, t1: t1 + 0.02, len: 0.3, w: 0.35, op: 0.45, col: A.C.jade }); FXk.ring(A, { t: t1, at: () => herAt(A, t1), r0: 0.1, r1: 0.6, dur: 0.2, w: 0.3, col: A.C.jade }); };
    K.forEach(([tc, kv], k) => { A.hit(0, tc, 10, { knock: kv, kdur: 0.45, up: 0.3 }); FXk.spark(A, { t: tc, at: { d: 0, y: 0.5 }, r: 0.16 }); FXk.ring(A, { t: tc, at: () => dumAt(A, 0, tc, 0.5), r0: 0.1, r1: 0.8, dur: 0.22, w: 0.35 }); FXk.trail(A, { of: ['footR', 'footR', 'footR'][k], t0: tc - 0.08, t1: tc + 0.02, len: 0.15, w: 0.14, op: 0.6 }); A.shake(tc, 0.05, 0.15);
      FXk.trail(A, { of: (t) => new T.Vector3(...dumAt(A, 0, t, 0.45)), t0: tc, t1: tc + 0.45, len: 0.3, w: 0.3, op: 0.35, col: A.C.bone }); FXk.dust(A, { t: tc + 0.45, at: () => new T.Vector3(...dumAt(A, 0, tc + 0.45, 0)), n: 4, sp: 0.8 }); });
    blink(0.94, 1.0); blink(1.67, 1.73); blink(2.35, 2.41);
    A.hit(0, 2.53, 8, { up: 2.8 }); FXk.spark(A, { t: 2.53, at: { d: 0, y: 0.7 }, r: 0.2 }); FXk.ring(A, { t: 2.53, at: () => dumAt(A, 0, 2.53, 0.6), r0: 0.1, r1: 0.9, dur: 0.24, w: 0.35 }); A.shake(2.53, 0.06, 0.18); FXk.trail(A, { of: 'footR', t0: 2.45, t1: 2.66, len: 0.2, w: 0.16, op: 0.65 }); FXk.trail(A, { of: (t) => new T.Vector3(...dumAt(A, 0, t, 0.5)), t0: 2.53, t1: 3.0, len: 0.35, w: 0.3, op: 0.35, col: A.C.bone }); FXk.dust(A, { t: 2.95, at: () => herAt(A, 2.95), n: 4, sp: 0.7 });
    FXa(A, { t: 2.985, dur: 0.05, to: { d: 0 }, len: 1.0, glow: A.C.gold, hits: [{ d: 0, n: 24 }] }); FXk.trail(A, { of: 'tipA', t0: 2.97, t1: 3.04, len: 0.1, w: 0.05, op: 0.3 }); A.shake(3.035, 0.05, 0.15);
    A.cap(0.3, 2.3, '影踢：重踢击退 2.5 u；它停下时她闪到它背后换方向再踢：三次，各 10', 'Shadow kicks: a hard kick knocks it 2.5 u; where it stops she blinks behind it and kicks it another way: three kicks of 10'); A.cap(2.3, 4.0, '第四踢：后空翻高踢把它踢上天 8，再补一箭 24', 'The fourth: a flip kick sends it high, 8; one arrow follows, 24'); } };

// GA6 Ride (spec F6): a leapfrog mount astride its neck, its ears as reins; it stumbles four heavy steps wherever she leans (2 u, into the foe beside it);
// she stands on its shoulders and shoots straight down: 24; the recoil pops her into a backflip and she lands behind it, looking back
const RIDE = (() => { const d = [0.25, 0.25], p = (k) => [-0.6 + d[0] * k, 0 + d[1] * k], off = -0.085, ks = [];
  for (let k = 0; k < 4; k++) { const ts = 0.75 + 0.25 * k, a = p(k), b = p(k + 1), s = k % 2 ? -1 : 1;
    ks.push({ t: ts, fw: a[0] + 2.2 + off, sd: a[1] + off, y: 0.58, roll: 0, e: 'io2' }, { t: ts + 0.09, roll: 6 * s, e: 'io2' }, { t: ts + 0.18, fw: b[0] + 2.2 + off, sd: b[1] + off, y: 0.52, roll: 4 * s, e: 'io2', ye: 'in' }); }
  return { p, ks }; })();
GA.F6 = { T: 3.6, cam: { x: -0.2, z: 0.5, w: 6.4 }, her: H(-2.2), seq: [[0.3, 'gRide'], [2.9, 'idle', { from: 5.15, fade: 0.2 }]],
  root: [{ t: 0.3 }, { t: 0.42, fw: 0.3, e: 'in' }, { t: 0.52, fw: 1.0, y: 1.2, e: 'lin', ye: 'out' }, { t: 0.63, fw: 1.48 - 0.085, sd: -0.085, y: 0.55, ye: 'in' }, { t: 0.72, spin: -45, e: 'io2' },
    ...RIDE.ks, { t: 1.74, fw: 0.4 + 2.2 - 0.085, sd: 1.0 - 0.085, y: 0.52, roll: 0 }, { t: 1.84, fw: 0.4 + 2.2, sd: 1.0, y: 0.7, e: 'io2', ye: 'out' }, { t: 1.98, fw: 0.4 + 2.2 + 0.16, sd: 1.0 + 0.16, y: 0.62, pitch: 40, e: 'io2' }, { t: 2.18, fw: 0.4 + 2.2 + 0.17, sd: 1.0 + 0.17, y: 0.61, pitch: 42 },
    { t: 2.37, fw: 2.25, sd: 0.65, y: 1.35, pitch: -200, e: 'lin', ye: 'out' }, { t: 2.56, fw: 1.96, sd: 0.36, y: 0, pitch: -360, e: 'lin', ye: 'in' }],
  dum: [[-0.6, 0.0, { face: 45 }], [0.78, 1.38]],
  fx(A) { A.hit(0, 0.55, null, { stop: true }); kickRing(A, 0.6, () => dumAt(A, 0, 0.6, 0.75), 0.45); A.status(0, 0.66, 'stun', 1.1);
    for (let k = 0; k < 4; k++) { const ts = 0.75 + 0.25 * k, b = RIDE.p(k + 1); A.moveTo(0, ts, b, 0.18, 'io2'); A.hit(0, ts + 0.18, null, { nostop: true }); FXk.dust(A, { t: ts + 0.18, at: [b[0], 0.02, b[1]], n: 4, sp: 0.6, r: 0.1, op: 0.35, seed: 7 + k }); }
    A.hit(1, 1.68, 6, { knock: [0.5, 0.5], stop: true }); FXk.spark(A, { t: 1.68, at: { d: 1, y: 0.5 } });
    FXk.trail(A, { of: (t) => at0(A, 0, t, 0.03), t0: 0.75, t1: 1.7, len: 0.5, w: 0.2, op: 0.3, col: A.C.jade });
    FXa(A, { t: 2.17, dur: 0.05, from: 'nock', to: { d: 0, y: 0.6 }, len: 0.8, hits: [{ d: 0, n: 24, big: true }] }); A.down(0, 2.24, 1.0, [0.5, 0.5]);
    FXk.ring(A, { t: 2.22, at: () => at0(A, 0, 2.22), r0: 0.2, r1: 1.1, dur: 0.3, w: 0.3 }); FXk.dust(A, { t: 2.24, at: () => at0(A, 0, 2.24), n: 8, sp: 1.2 }); A.shake(2.22, 0.06, 0.22); FXk.dust(A, { t: 2.56, at: () => herAt(A, 2.56), n: 4, sp: 0.7 });
    A.cap(0.3, 1.8, '跳上敌人骑 1 秒，揪着耳朵操纵它走 2 u', 'She leaps on and rides it 1 s, steering it 2 u by the ears'); A.cap(1.8, 3.4, '站上肩膀往下射一箭：24', 'Then stands on its shoulders and shoots down into it: 24'); } };

// GA8 Arrow spear: the giant arrow as a spear: a spin, 24 within 3 u; then a javelin throw that drills through, 3 × 8, carrying small foes with it
GA.F8 = { T: 3.8, cam: { x: 1.0, z: 0, w: 9.0 }, her: H(-2.4), seq: [[0.3, 'gSpear'], [1.75, 'idle', { from: 5.15, fade: 0.2 }]], // spec F8: pull it out, a figure eight, an overhead helicopter, a low sweep, two steps back and the javelin throw
  root: [{ t: 0.86 }, { t: 1.06, spin: 360, e: 'io2' }, { t: 1.1 }, { t: 1.28, spin: 720, e: 'io2' }, { t: 1.32 }, { t: 1.48, fw: -0.35, e: 'io2' }, { t: 1.6, fw: -0.12, e: 'out' }],
  dum: [[-1.4, 1.3], [-3.6, -1.0], [0.6, 0.15], [1.8, -0.15], [3.0, 0.1]],
  fx(A) { const T = A.THREE; const sp = A.add(new T.Mesh(A.arrowGeo, A.arrowMat)); sp.visible = false; sp.scale.set(1.6, 1.6, 2.6);
    const sd = (t) => { const h = A.at('handR', t), l = A.at('handL', t), f = A.fwd(t), sv = A.fwd(t, 90), up = new T.Vector3(0, 1, 0); let pos = h.clone(), dir;
      if (t < 0.53) { pos = h.clone().lerp(l, 0.5); dir = sv.clone(); } else if (t < 0.8) { const a = (t - 0.53) / 0.27 * 6.283; pos = h.clone().lerp(l, 0.5); dir = sv.clone().multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a) * 0.8).addScaledVector(f, Math.sin(2 * a) * 0.4); }
      else if (t < 1.08) { const a = (t - 0.8) / 0.28 * 12.566; dir = new T.Vector3(Math.cos(a), 0, Math.sin(a)); } else if (t < 1.3) { const a = (t - 1.08) / 0.22 * 6.283; dir = sv.clone().multiplyScalar(Math.cos(a)).addScaledVector(f, Math.sin(a)); dir.y = 0; } else dir = f.clone().addScaledVector(up, 0.15);
      return { pos, dir: dir.normalize() }; };
    A.fx((t) => { sp.visible = t >= 0.4 && t < 1.57; if (!sp.visible) return; const q = sd(t); sp.position.copy(q.pos).addScaledVector(q.dir, -0.6); sp.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), q.dir); });
    FXk.trail(A, { of: (t) => { const q = sd(t); return q.pos.clone().addScaledVector(q.dir, 0.9); }, t0: 0.84, t1: 1.28, len: 0.3, w: 0.18, op: 0.55 });
    FXk.ring(A, { t: 0.9, at: 'her', r0: 0.6, r1: 3.0, dur: 0.35, w: 0.14 }); [0, 1].forEach((i) => A.hit(i, 0.92 + i * 0.1, 24, { knock: [i ? -0.4 : 0.1, i ? -0.3 : 0.4] })); FXk.dust(A, { t: 1.14, at: () => herAt(A, 1.14), n: 6, sp: 1.0 });
    const tL = 1.57, end = [5.6, 0.7, 0]; FXa(A, { t: tL, dur: 0.5, from: 'handR', to: end, len: 2.4, scale: 1.6, w: 0.14, glow: A.C.jade });
    FXk.helix(A, { t: tL, dur: 0.5, from: () => P3(A.at('handR', tL)), to: end, r: 0.35, turns: 6, strands: 2, hold: 0.15, out: 0.35, op: 0.5 });
    [2, 3, 4].forEach((i) => { const u = (A.card.dum[i].x + 1.6) / 7.2, th = tL + 0.5 * u; for (let k = 0; k < 3; k++) A.hit(i, th + k * 0.06, 8, { nostop: k > 0 }); A.moveTo(i, th, [Math.min(5.0, A.card.dum[i].x + 2.2 - (i - 2) * 0.5), A.card.dum[i].z * 0.3], 0.5 - (th - tL) * 0.6, 'out'); });
    A.cap(0.3, 1.4, '巨箭当长枪：一转，3 u 内 24', 'The giant arrow as a spear: a spin, 24 within 3 u'); A.cap(1.4, 3.6, '再投出去钻穿：3 × 8，小怪被带走', 'Then a javelin throw that drills through: 3 × 8, carrying small foes'); } };

// GA9 Slide shot: she slides under a foe within 2 u and shoots three arrows up between her hind paws: 16 each, launch 0.5 s
GA.F9 = { T: 3.0, headMin: 0.05, cam: { x: -0.3, z: 0, w: 6.0 }, her: H(-2.4), seq: [[0.3, 'run', { to: 0.3 }], [0.45, 'gSlide', { fade: 0.04 }], [1.15, 'gKip', { from: 0.04, fade: 0.05 }]], // spec F9: two bounds, a baseball slide under it, three snap shots straight up, a kip-up behind it
  root: [{ t: 0.3 }, { t: 0.45, fw: 0.7 }, { t: 0.53, fw: 1.1, pitch: -72, y: -0.24, e: 'lin' }, { t: 0.76, fw: 2.35, pitch: -72, y: -0.24, e: 'out' }, { t: 1.15, fw: 2.6, pitch: -72, y: -0.24 }, { t: 1.3, fw: 2.85, pitch: -28, y: 0.3, e: 'lin', ye: 'out' }, { t: 1.45, fw: 3.0, pitch: 0, y: 0, e: 'out', ye: 'in' }],
  dum: [[-0.4, 0.0]],
  fx(A) { const T = A.THREE; FXk.dust(A, { t: 0.55, at: () => herAt(A, 0.55), n: 8, sp: 1.2, dir: [-1, 0] }); FXk.tube(A, { t: 0.52, dur: 0.24, hold: 0.4, out: 0.4, flat: true, w: 0.3, col: '#BDB6A8', op: 0.4, e: 'out', pts: () => [new T.Vector3(-1.4, 0.02, 0), new T.Vector3(0.2, 0.02, 0)] });
    A.hit(0, 0.7, 4, { stop: true }); [0.74, 0.82, 0.9].forEach((tk, k) => { const n = P3(A.at('nock', tk)); FXa(A, { t: tk, dur: 0.06, from: [n.x, n.y, n.z], to: { d: 0, y: 0.35 }, len: 0.7, glow: k === 2 ? A.C.jade : undefined, hits: [{ d: 0, n: 16, up: k === 0 ? 1.0 : 0.25 }] }); FXk.ring(A, { t: tk, at: [n.x, n.y, n.z], r0: 0.1, r1: 0.4, dur: 0.18, w: 0.3, dir: () => new T.Vector3(0, 1, 0) }); }); FXk.dust(A, { t: 1.45, at: () => herAt(A, 1.45), n: 5, sp: 0.8 });
    A.cap(0.3, 2.8, '从敌人身下滑过去，两后爪间往上射三箭：各 16，挑飞 0.5 秒', 'She slides under it and shoots three up between her hind paws: 16 each, launch 0.5 s'); } };

// GA10 Closing rain: a ring of rain 4 u wide closes to its centre over 2 s, herding foes inward: 7 a half second
GA.F10 = { T: 4.0, cam: { x: 0.6, z: 0, w: 7.4 }, her: H(-2.6), seq: [[0.3, 'rRain', { to: 0.9 }]],
  dum: [[0.6, 1.9], [2.6, 0.4], [1.0, -1.8], [-0.3, -0.5]],
  fx(A) { const T = A.THREE, c = [0.9, 0, 0], t0 = 1.2, t1 = 3.2, R = (t) => 2.0 * (1 - A.EASE.s(A.clamp((t - t0) / (t1 - t0)))) + 0.25;
    FXa(A, { t: 0.8, dur: 0.3, to: [-2.6, 5.0, 0], len: 1.2, glow: A.C.jade });
    for (let k = 0; k < 10; k++) { const a = k * 0.628; FXk.rain(A, { t0, t1, at: (t) => new T.Vector3(c[0] + Math.cos(a) * R(t), 0, c[2] + Math.sin(a) * R(t)), r: 0.45, rate: 6, h: 4.0, rip: A.C.jade, seed: 20 + k }); }
    FXk.ring(A, { col: A.C.jade, t: t0 - 0.05, at: c, r0: 2.2, r1: 2.25, dur: 0.2, w: 0.06 }); for (let k = 0; k < 9; k++) { const t = t0 + k * 0.25; FXk.ring(A, { col: A.C.jade, t, at: c, r0: R(t), r1: R(t + 0.25), dur: 0.25, w: 0.04, op: 0.45, e: 'lin' }); }
    A.card.dum.forEach((dm, i) => { const dx = dm.x - c[0], dz = dm.z - c[2], d = Math.hypot(dx, dz); A.moveTo(i, t0 + 0.2, [c[0] + dx / d * 0.45, c[2] + dz / d * 0.45], 1.9, 's'); for (let k = 0; k < 4; k++) A.hit(i, t0 + 0.3 + k * 0.5, 7); });
    A.cap(0.4, 1.2, '一圈 4 u 宽的箭雨', 'A ring of rain 4 u wide'); A.cap(1.2, 3.8, '2 秒内向中心收拢，把敌人赶进去：每半秒 7', 'It closes to the centre over 2 s, herding foes in: 7 a half second'); } };

// GA11 Blast ride: she plants the arrow behind her; the blast fires her 3 u forward: 16 to each foe she passes, knocked 1 u aside
GA.F11 = { T: 3.0, cam: { x: -0.2, z: 0, w: 6.8 }, her: H(-2.2), seq: [[0.3, 'castPlant', { to: 0.55 }], [0.85, 'gSideKick', { fade: 0.05 }], [1.65, 'idle', { from: 5.15, fade: 0.2 }]], // spec F11: sprinter's blocks, the blast, a flying side kick laid flat, a long skid and a turn at the end
  root: [{ t: 0.85 }, { t: 0.97 }, { t: 1.0, fw: 0.3, spin: 90, roll: -75, y: 0.3, e: 'out', ye: 'out' }, { t: 1.21, fw: 3.0, y: 0.3, e: 'lin' }, { t: 1.24, roll: 0, y: 0, ye: 'in' }, { t: 1.45, fw: 3.7, e: 'out' }, { t: 1.5, spin: 90 }, { t: 1.6, spin: 270, e: 'io2' }],
  dum: [[-1.1, 0.25], [-0.1, -0.25], [0.6, 0.2], [2.4, 1.3]],
  fx(A) { const T = A.THREE, spot = new T.Vector3(-2.7, 0, 0); FXk.stuck(A, { t: 0.62, dur: 0.3, at: [spot.x, 0.25, 0], dir: [0.3, -1, 0] }); FXk.ring(A, { t: 0.62, at: spot, r0: 0.1, r1: 0.4, dur: 0.2, w: 0.3, col: A.C.bone });
    const tb = 0.98; FXk.ring(A, { t: tb, at: spot, r0: 0.2, r1: 1.4, dur: 0.3, w: 0.35 }); FXk.disc(A, { t: tb, at: spot, r0: 0.3, r1: 1.2, dur: 0.22, op: 0.45 }); FXk.dust(A, { t: tb, at: spot, n: 8, sp: 1.8 }); A.shake(tb, 0.06, 0.2);
    FXk.tunnel(A, { t: tb, dur: 0.23, n: 5, r: 0.5, from: () => new T.Vector3(-2.2, 0.6, 0), to: () => new T.Vector3(0.8, 0.6, 0), life: 0.4 }); FXk.tube(A, { t: 1.24, dur: 0.22, hold: 0.4, out: 0.4, flat: true, w: 0.3, col: '#BDB6A8', op: 0.4, e: 'out', pts: () => [new T.Vector3(0.8, 0.02, 0), new T.Vector3(1.5, 0.02, 0)] }); FXk.dust(A, { t: 1.3, at: () => herAt(A, 1.3), n: 6, sp: 1.0, dir: [1, 0] });
    [0, 1, 2].forEach((i) => { const dm = A.card.dum[i], th = tb + 0.02 + 0.21 * A.clamp((dm.x + 1.9) / 3.0); A.hit(i, th, 16, { knock: [0.1, dm.z > 0 ? 1.0 : -1.0], kdur: 0.25, nostop: i > 0 }); });
    A.cap(0.3, 0.9, '把箭插在身后', 'She plants the arrow behind her'); A.cap(0.9, 2.8, '爆炸把她射出 3 u：经过的敌人各 16，被撞开 1 u', 'The blast fires her 3 u: 16 to each foe passed, knocked 1 u aside'); } };

// GA12 Kicked saw: the wheel of twelve lies flat at her feet; a side kick sends it 3 u; it saws 2 s: 4 every 0.3 s within 1.5 u
GA.F12 = { T: 3.8, cam: { x: 0.0, z: 0, w: 7.0 }, her: H(-2.2), seq: [[0.3, 'rWhirl', { to: 0.7 }], [0.95, 'gKeepy', { fade: 0.05 }], [1.31, 'gTornadoS', { fade: 0.03 }]], // spec F12: a gather spin, the wheel drops, a keepy-up flick, a tornado kick slaps it out like a frisbee
  root: [{ t: 1.31 }, { t: 1.37, y: 0.35, ye: 'out' }, { t: 1.53, spin: 360, y: 0.3, e: 'out' }, { t: 1.57, y: 0, ye: 'in' }],
  dum: [[0.6, -0.9], [1.3, 0.6], [0.4, 0.8], [1.6, -0.3]],
  fx(A) { const T = A.THREE, g = A.add(new T.Group()); g.visible = false;
    for (let k = 0; k < 12; k++) { const m = new T.Mesh(A.arrowGeo, A.arrowMat); const an = k * Math.PI / 6; m.position.set(Math.cos(an) * 0.45, 0, Math.sin(an) * 0.45); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(-Math.sin(an), 0, Math.cos(an))); m.scale.setScalar(0.6); g.add(m); }
    const rim = new T.Mesh(new T.TorusGeometry(0.55, 0.02, 6, 40), A.mat(A.C.gold, A.F.FLAT)); rim.rotation.x = Math.PI / 2; g.add(rim);
    const x0 = -1.75, x1 = 1.0, tk = 1.49, tE = tk + 0.3 + 2.0; const pos = (t) => t < tk ? x0 : A.lerp(x0, x1, A.EASE.out(A.clamp((t - tk) / 0.3)));
    const hy = (t) => t < 0.92 ? 0.35 : t < 1.0 ? A.lerp(0.35, 0.05, (t - 0.92) / 0.08) : t < 1.06 ? 0.05 : t < tk ? 0.05 + 0.32 * Math.sin(Math.PI * A.clamp((t - 1.06) / (tk - 1.06 + 0.12))) : 0.3;
    A.fx((t) => { g.visible = t >= 0.62 && t < tE; if (!g.visible) return; g.position.set(pos(t), hy(t), 0.0); g.rotation.y = -(t - 0.62) * (t < tk ? 6 : 16); g.scale.setScalar(A.EASE.out(A.clamp((t - 0.62) / 0.2)) * (t > tE - 0.2 ? (tE - t) / 0.2 : 1)); rim.material.uniforms.op.value = 0.6; });
    FXk.trail(A, { of: 'footR', t0: 1.38, t1: 1.55, len: 0.2, w: 0.22, op: 0.6 }); kickRing(A, tk, [x0, 0.3, 0], 0.4); FXk.ring(A, { t: 1.06, at: [x0, 0.08, 0], r0: 0.1, r1: 0.4, dur: 0.15, w: 0.3 });
    FXk.ring(A, { t: tk + 0.3, at: [x1, 0, 0], r0: 1.45, r1: 1.5, dur: 2.0, w: 0.05, op: 0.4, e: 'lin' });
    for (let k = 0; k < 7; k++) { const t = tk + 0.3 + k * 0.3; FXk.dust(A, { t, at: [x1, 0, 0], n: 4, sp: 1.6, col: A.C.parch, r: 0.04, op: 0.6, dur: 0.25 }); A.card.dum.forEach((dm, i) => { if (Math.hypot(dm.x - x1, dm.z) <= 1.5) A.hit(i, t + i * 0.02, 4, { nostop: true }); }); }
    A.cap(0.3, 1.2, '十二箭的轮子平躺在脚边', 'The wheel of twelve lies flat at her feet'); A.cap(1.2, 3.6, '侧踢送出 3 u，原地锯 2 秒：1.5 u 内每 0.3 秒 4', 'A side kick sends it 3 u; it saws 2 s: 4 every 0.3 s within 1.5 u'); } };

// GA14 Homecoming twister: it rises 4 u out and rolls back to her over 2 s, pulling foes along and shooting
const liveCord = (A, a, b, t0, t1, o = {}) => { const T = A.THREE, m = A.add(new T.Mesh(new T.CylinderGeometry(o.r || 0.012, o.r || 0.012, 1, 5, 1, true), A.mat(o.col || A.C.bone, A.F.FLAT))); m.visible = false; m.frustumCulled = false; const Y = new T.Vector3(0, 1, 0);
  A.fx((t) => { m.visible = t >= t0 && t < t1; if (!m.visible) return; const p = V3b(A, typeof a === 'function' ? a(t) : a), q = V3b(A, typeof b === 'function' ? b(t) : b), d = q.clone().sub(p); m.position.copy(p).addScaledVector(d, 0.5); m.scale.set(1, Math.max(0.01, d.length()), 1); m.quaternion.setFromUnitVectors(Y, d.normalize()); m.material.uniforms.op.value = o.op || 0.85; }); };
GA.F14 = { T: 4.4, cam: { x: 0.0, z: 0, w: 7.6 }, her: H(-2.0), seq: [[0.3, 'gLasso'], [0.92, 'gHaul', { loop: true, until: 2.92, fade: 0.06 }], [2.92, 'gPirouette', { fade: 0.04 }], [3.6, 'idle', { from: 5.15, fade: 0.2 }]], // spec F14: a lasso whirl overhead, a tug-of-war haul leaning back, a pirouette inside the twister
  root: [{ t: 0.92 }, ...[1, 2, 3, 4, 5, 6, 7, 8].map((k) => ({ t: 0.92 + k * 0.25, fw: -0.05 * k, pitch: k < 8 ? -14 : -6, e: 'out' })), { t: 2.99, fw: -0.4, pitch: 0 }, { t: 3.32, fw: -0.4, spin: 720, e: 'io2' }],
  dum: [[1.2, 0.9], [2.8, -0.8], [0.6, -1.0], [3.1, 0.6]],
  fx(A) { const T = A.THREE, t0 = 0.8, tA = 0.95, tB = 2.92, tP = 3.32, x0 = 2.0, x1 = -2.15; const at = (t) => new T.Vector3(A.lerp(x0, x1, A.EASE.io2(A.clamp((t - tA) / (tB - tA)))), 0, 0);
    for (let k = 0; k < 3; k++) { const tk = 0.36 + k * 0.12 - k * k * 0.015; FXk.ring(A, { col: A.C.bone, t: tk, at: () => A.at('handR', tk).add(new T.Vector3(0, 0.15, 0)), r0: 0.3, r1: 0.42, dur: 0.12, w: 0.08, op: 0.6, dir: () => new T.Vector3(0, 1, 0) }); }
    FXa(A, { t: 0.75, dur: 0.12, to: [x0, 0.3, 0], len: 0.7, glow: A.C.jade }); liveCord(A, (t) => A.at('handR', t), (t) => at(t).add(new T.Vector3(0, 0.5, 0)), 0.8, tB);
    FXk.twister(A, { t0, t1: tP, at, r: 1.0, h: 2.4 }); FXk.trail(A, { col: A.C.jade, of: (t) => at(t).add(new T.Vector3(0, 0.03, 0)), t0: tA, t1: tB, len: 0.8, w: 1.2, op: 0.15 });
    A.card.dum.forEach((dm, i) => { const tIn = tA + (tB - tA) * A.clamp((x0 - dm.x + 1.0) / (x0 - x1)) * 0.5; A.moveTo(i, tIn, [x1 + 0.75 + (i % 2) * 0.25, (i % 2 ? 0.4 : -0.4)], tB - tIn, 'io2'); A.launch(i, tIn, 0.3);
      const a = (i * 1.57) + 0.6; A.hit(i, tP, 8, { knock: [Math.cos(a) * 1.0, Math.sin(a) * 1.0], nostop: true }); });
    for (let k = 0; k < 6; k++) { const tk = tA + 0.25 + k * 0.3, i = k % 4; FXa(A, { t: tk, dur: 0.1, from: P3(at(tk).add(new T.Vector3(0, 1.4, 0))), to: { d: i }, len: 0.6, hits: [{ d: i, n: 6 }] }); }
    FXk.ring(A, { col: A.C.jade, t: tP, at: () => herAt(A, tP), r0: 0.4, r1: 2.0, dur: 0.35, w: 0.25 }); FXk.dust(A, { t: tP, at: () => herAt(A, tP), n: 8, sp: 1.6 }); A.shake(tP, 0.04, 0.15);
    A.cap(0.3, 0.95, '旋风在 4 u 外起来', 'It rises 4 u out'); A.cap(0.95, 4.2, '她拔河一样把它拉回来，敌人一路被拖着挨箭', 'She hauls it back like a tug of war, foes dragged and shot inside it'); } };

// GA15 Briar lash: a 3 u vine whip over a 120° arc: 8, knocked flat 0.4 s
GA.F15 = { T: 2.8, cam: { x: -0.4, z: 0, w: 6.8 }, her: H(-2.0), seq: [[0.3, 'gLash'], [1.08, 'idle', { from: 5.15, fade: 0.2 }]], // spec F15: drawn like a sword, one loop overhead, a deep lunge, the crack right to left at shin height, a wrap and a flick home
  root: [{ t: 0.42 }, { t: 0.61, fw: 0.28, e: 'out' }, { t: 0.9, fw: 0.28 }, { t: 1.08, fw: 0.12 }],
  dum: [[-0.2, -1.9], [0.7, -0.4], [0.4, 1.2], [-1.0, 1.9], [2.2, 0.2]],
  fx(A) { const T = A.THREE, c = new T.Vector3(-1.72, 0, 0), R = 3.0, t0 = 0.61, dt = 0.08;
    FXk.trail(A, { of: 'handR', t0: 0.33, t1: 0.44, len: 0.25, w: 0.04, op: 0.6, col: A.C.jade }); FXk.ring(A, { col: A.C.jade, t: 0.47, at: () => A.at('handR', 0.49).add(new T.Vector3(0, 0.1, 0)), r0: 0.5, r1: 0.6, dur: 0.1, w: 0.06, op: 0.6, dir: () => new T.Vector3(0, 1, 0) });
    for (let k = 0; k < 7; k++) { const tk = t0 + k * dt / 6, a = (60 - k * 20) * Math.PI / 180; FXk.tube(A, { t: tk, dur: 0.04, hold: 0.03, out: 0.14, r: 0.035, col: k % 2 ? A.C.jade : A.C.bone, op: 0.85, e: 'out', pts: () => { const h = A.at('handR', tk); return [...Array(7)].map((_, j) => { const u = j / 6, aa = a + 0.25 * (1 - u) * u; return new T.Vector3(A.lerp(h.x, c.x + Math.cos(aa) * R, u), A.lerp(h.y, 0.22, Math.sqrt(u)) + 0.15 * Math.sin(u * 3.14), A.lerp(h.z, c.z + Math.sin(aa) * R, u)); }); } }); }
    FXk.tube(A, { t: t0, dur: dt, hold: 0.2, out: 0.3, flat: true, w: 0.1, op: 0.45, e: 'lin', pts: () => [...Array(13)].map((_, j) => { const a = (60 - j * 10) * Math.PI / 180; return new T.Vector3(c.x + Math.cos(a) * R, 0.03, c.z + Math.sin(a) * R); }) });
    FXk.trail(A, { of: 'handR', t0: 0.78, t1: 0.9, len: 0.2, w: 0.04, op: 0.5, col: A.C.jade });
    A.card.dum.forEach((dm, i) => { const dx = dm.x - c.x, dz = dm.z - c.z, d = Math.hypot(dx, dz), a = Math.atan2(dz, dx); if (d <= R + 0.1 && Math.abs(a) <= 1.05) { const th = t0 + dt * (1.05 - a) / 2.1; A.hit(i, th, 8, { nostop: true }); A.down(i, th + 0.02, 0.4, [dx, dz]); FXk.spark(A, { t: th, at: { d: i }, r: 0.1, col: A.C.bone }); } });
    A.cap(0.3, 2.6, '3 u 的荆条鞭扫 120°：8，打倒 0.4 秒', 'A 3 u vine whip over 120°: 8, knocked flat 0.4 s'); } };

// GA16 Bulldoze: the curtain lands as a wall 4 u wide, 1 u ahead of her, and walks 3 u with her, pushing foes: 3 × 10
GA.F16 = { T: 4.6, cam: { x: 0.0, z: 0, w: 7.6 }, her: H(-2.6), seq: [[0.3, 'rStorm', { from: 0.3, to: 1.2 }], [1.3, 'gShove', { fade: 0.06 }], [1.8, 'gRock', { fade: 0.04 }], [2.16, 'gShoveL', { fade: 0.04 }], [2.66, 'gRock', { fade: 0.04 }], [3.02, 'gLeapShove', { fade: 0.04 }], [3.64, 'idle', { from: 5.15, fade: 0.2 }]], // spec F16: three shoves of the bow from planted stamps, toprock between, the last a leaping push
  root: [{ t: 1.3 }, { t: 1.52, fw: 0.25, e: 'out' }, { t: 1.8, fw: 0.25 }, { t: 2.16, fw: 0.6, e: 'lin' }, { t: 2.38, fw: 0.85, e: 'out' }, { t: 2.66, fw: 0.85 }, { t: 3.1, fw: 1.25, e: 'lin' }, { t: 3.2, fw: 1.65, y: 0.22, pitch: 55, e: 'lin', ye: 'out' }, { t: 3.32, fw: 2.05, y: 0.18, pitch: 50, e: 'lin' }, { t: 3.42, fw: 2.25, y: 0, pitch: 0, e: 'out', ye: 'in' }],
  dum: [[-0.4, -1.1], [0.0, 0.3], [0.5, 1.4], [2.6, 2.4]],
  fx(A) { const T = A.THREE, g = A.add(new T.Group()); g.visible = false; FXa(A, { t: 0.9, dur: 0.3, to: [-1.6, 4.5, 0], len: 1.2, glow: A.C.jade });
    for (let k = 0; k < 11; k++) { const m = new T.Mesh(A.arrowGeo, A.arrowMat); m.position.set(0, 0.35, -2 + k * 0.4); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(0.25, -1, 0).normalize()); m.scale.setScalar(0.9); g.add(m); }
    const band = new T.Mesh(new T.PlaneGeometry(0.12, 4.0), A.mat(A.C.jade, A.F.FLAT)); band.rotation.x = -Math.PI / 2; band.position.y = 0.03; g.add(band);
    const xAt = (t) => A.rootAt(Math.max(1.3, t)).x + 1.0; A.fx((t) => { g.visible = t >= 1.15 && t < 4.0; if (!g.visible) return; g.position.set(xAt(t), t < 1.3 ? 1.8 * (1 - (t - 1.15) / 0.15) : 0, 0); band.material.uniforms.op.value = 0.5 * (t > 3.7 ? (4.0 - t) / 0.3 : 1); });
    for (let k = 0; k < 11; k++) FXa(A, { t: 1.0, dur: 0.15, from: [-1.2, 3.2, -2 + k * 0.4], to: [-1.6, 0.4, -2 + k * 0.4], len: 0.9, w: 0.05 });
    FXk.dust(A, { t: 1.3, at: [-1.6, 0, 0], n: 9, sp: 1.6, dir: [1, 0] });
    [1.52, 2.38, 3.24].forEach((ts, k) => { FXk.dust(A, { t: ts, at: () => herAt(A, ts), n: 4, sp: 0.8 }); FXk.dust(A, { t: ts, at: () => new T.Vector3(xAt(ts), 0, 0), n: k === 2 ? 12 : 6, sp: k === 2 ? 2.2 : 1.2, dir: [1, 0] }); A.shake(ts, k === 2 ? 0.06 : 0.03, 0.15); });
    [0, 1, 2].forEach((i) => { const dm = A.card.dum[i]; let hitN = 0; for (let k = 0; k < 24; k++) { const t = 1.3 + k * 0.1; const tx = Math.max(dm.x, xAt(t + 0.1) + 0.35) + (t + 0.1 > 3.3 ? 0.9 : 0); A.moveTo(i, t, [tx, dm.z], 0.1, 'lin'); }
      [1.52, 2.38, 3.24].forEach((ts) => { if (xAt(ts) + 0.5 > dm.x || ts > 2) { A.hit(i, ts + 0.02, 10, { nostop: true }); hitN++; } }); });
    A.cap(0.3, 1.3, '箭幕落成一道 4 u 宽的墙，在她前面 1 u', 'The curtain lands as a 4 u wall, 1 u ahead of her'); A.cap(1.3, 4.3, '她用弓推了三下，墙跟着走 3 u，把敌人推走：每下 10', 'Three shoves of the bow walk it 3 u, pushing foes: 10 each'); } };

// GA17 Pinwheel: five arrows spin as one drill into a foe for 1.5 s (24); foes within 2 u are pulled against it; she kicks off it into a short run
GA.F17 = { T: 3.4, cam: { x: -0.8, z: 0, w: 6.4 }, her: H(-2.3), seq: [[0.3, 'gPinwheel'], [0.96, 'idle', { from: 5.15, fade: 0.25 }]], // spec F17: five arrows spun on a fingertip, a cross punch drives the cone in, a hop back to a low crouch
  root: [{ t: 0.45 }, { t: 0.57, fw: 0.3, e: 'out' }, { t: 0.63, fw: 0.3 }, { t: 0.75, fw: 0.0, e: 'out' }], hops: [[0.63, 0.75, 0.1]],
  dum: [[-1.42, 0.0], [-0.1, -1.3], [0.2, 1.1], [-0.9, 1.8]],
  fx(A) { const T = A.THREE, tH = 0.57; const g = A.add(new T.Group()); g.rotation.order = 'ZYX'; g.visible = false;
    for (let k = 0; k < 5; k++) { const m = new T.Mesh(A.arrowGeo, A.arrowMat); const an = k * 1.2566; m.position.set(0, Math.cos(an) * 0.12, Math.sin(an) * 0.12); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(1, -Math.cos(an) * 0.35, -Math.sin(an) * 0.35).normalize()); m.scale.setScalar(0.7); g.add(m); }
    A.fx((t) => { g.visible = t >= 0.38 && t < tH + 1.5; if (!g.visible) return; let p, tilt;
      if (t < tH) { const h = A.at('handR', t); const u = A.clamp((t - 0.38) / 0.06); p = h.add(new T.Vector3(0, 0.1 + 0.5 * (1 - u) * (t < 0.44 ? Math.sin(u * 3.14) : 0), 0)); tilt = t < 0.5 ? Math.PI / 2 : Math.PI / 2 * (1 - A.EASE.io2(A.clamp((t - 0.5) / 0.07))); }
      else { const d = A.dpos(0, t); p = new T.Vector3(d.x - 0.32, d.y + 0.62, d.z); tilt = 0; }
      g.position.copy(p); g.rotation.z = tilt; g.rotation.x = (t - 0.38) * 26; });
    FXk.trail(A, { of: 'handR', t0: 0.5, t1: 0.58, len: 0.2, w: 0.08, op: 0.6 });
    FXk.helix(A, { t: tH, dur: 0.1, from: () => at0(A, 0, tH, 0.62).add(new T.Vector3(-0.6, 0, 0)), to: () => at0(A, 0, tH, 0.62), r: 0.25, turns: 2, strands: 2, hold: 1.4, out: 0.2, op: 0.5 });
    for (let k = 0; k < 6; k++) FXk.spark(A, { t: tH + 0.1 + k * 0.24, at: { d: 0 }, r: 0.07, col: A.C.parch }); A.hit(0, tH, 4, { stop: true }); A.hit(0, tH + 1.5, 24, { big: true }); A.status(0, tH, 'stun', 1.5);
    [1, 2, 3].forEach((i) => { const dm = A.card.dum[i], c = A.card.dum[0]; const dx = c.x - dm.x, dz = c.z - dm.z, d = Math.hypot(dx, dz); A.moveTo(i, tH + 0.1, [c.x - dx / d * 0.55, c.z - dz / d * 0.55], 0.45, 'in'); thread(A, () => at0(A, i, tH + 0.1, 0.6), () => at0(A, 0, tH + 0.1, 0.6), tH + 0.1, { hold: 0.35, out: 0.2, r: 0.02 }); A.hit(i, tH + 0.55, 6, { nostop: true }); });
    A.cap(0.3, 3.2, '五箭在指尖转成钻头，一拳打进敌人：1.5 秒 24，2 u 内的敌人被拉过去', 'Five arrows spun on a fingertip, punched into a foe as one drill: 24 over 1.5 s, foes within 2 u pulled in'); } };

// GA18 Switch: she springs onto a foe and kicks off backward; they trade places: 18
GA.F18 = { T: 3.0, cam: { x: -1.0, z: 0, w: 6.0 }, her: H(-2.6), seq: [[0.3, 'run', { to: 0.2 }], [0.5, 'gSwitch', { fade: 0.04 }], [1.3, 'idle', { from: 5.15, fade: 0.25 }]], // spec F18: a handstand on its shoulders, a seesaw swap, she lands where it stood
  root: [{ t: 0.3 }, { t: 0.5, fw: 0.6, e: 'lin' }, { t: 0.58, fw: 0.95, y: 0.45, pitch: 30, e: 'lin', ye: 'out' }, { t: 0.66, fw: 1.4, y: 0.8, pitch: 130, e: 'out' }, { t: 0.74, fw: 1.55, y: 0.93, pitch: 180, e: 'out' }, { t: 0.84, fw: 1.55, y: 0.93, pitch: 180 }, { t: 0.96, fw: 1.8, y: 0.65, pitch: 290, e: 'lin', ye: 'in' }, { t: 1.08, fw: 1.95, y: 0, pitch: 360, e: 'out', ye: 'in' }],
  dum: [[-1.05, 0.0], [1.8, 1.4]],
  fx(A) { const T = A.THREE; A.hit(0, 0.74, 4, { stop: true }); FXk.ring(A, { t: 0.74, at: () => dumAt(A, 0, 0.74, 0.95), r0: 0.1, r1: 0.5, dur: 0.2, w: 0.3, dir: () => new T.Vector3(0, 1, 0) });
    A.moveTo(0, 0.86, [-2.3, 0.0], 0.32, 'io2'); A.launch(0, 0.86, 0.3); A.hit(0, 0.88, 18, { big: true, nostop: true }); A.down(0, 1.18, 0.8, [-1, 0]);
    FXk.trail(A, { of: (t) => at0(A, 0, t, 0.6), t0: 0.86, t1: 1.2, len: 0.3, w: 0.2, op: 0.4 }); FXk.trail(A, { of: 'chest', t0: 0.84, t1: 1.08, len: 0.35, w: 0.18, op: 0.35 });
    FXk.dust(A, { t: 1.18, at: [-2.3, 0, 0], n: 7, sp: 1.3 }); FXk.ring(A, { t: 1.08, at: () => footAt(A, 1.08), r0: 0.2, r1: 0.6, dur: 0.25, w: 0.3 });
    A.cap(0.3, 2.8, '在敌人肩上倒立，翻过去：两个换位，18', "A handstand on its shoulders and over: they trade places, 18"); } };

// GA19 Air juggle: a kick launches the foe; she leaps after it: three kicks of 6 in the air
GA.F19 = { T: 3.4, cam: { x: -0.8, z: 0, w: 6.0 }, her: H(-2.0), seq: [[0.3, 'gRise', { to: 0.58 }], [0.88, 'gJuggle', { fade: 0.03 }], [1.6, 'idle', { from: 5.15, fade: 0.25 }]], // spec F19: the landing squash is the next jump's crouch; a rising front kick, a butterfly twist, a bicycle kick upside down, a superhero landing
  root: [{ t: 0.3 }, { t: 0.4 }, { t: 0.51, fw: 0.1, y: 0.4, e: 'out', ye: 'out' }, { t: 0.75, fw: 0.1, y: 0, ye: 'in' }, { t: 0.88, fw: 0.1 }, { t: 1.0, fw: 0.45, y: 0.85, e: 'out', ye: 'out' }, { t: 1.06, fw: 0.5, y: 1.0, pitch: 75 }, { t: 1.18, fw: 0.55, y: 1.05, pitch: 75, spin: 360, e: 'lin' }, { t: 1.22, fw: 0.55, y: 1.08, pitch: 0, spin: 360 }, { t: 1.3, fw: 0.55, y: 1.12, pitch: -180, e: 'lin' }, { t: 1.38, fw: 0.45, y: 0.55, pitch: -330, e: 'lin', ye: 'in' }, { t: 1.44, fw: 0.4, y: 0, pitch: -360, ye: 'in' }],
  dum: [[-0.95, 0.05]],
  fx(A) { FXk.trail(A, { of: 'footR', t0: 0.4, t1: 0.55, len: 0.16, w: 0.2, op: 0.7 }); A.hit(0, 0.51, 8, { up: 1.5, stop: true }); kickRing(A, 0.51, () => dumAt(A, 0, 0.51, 0.7), 0.5);
    FXk.trail(A, { of: 'chest', t0: 0.88, t1: 1.44, len: 0.35, w: 0.2, op: 0.35 });
    [[1.0, 'footR', 0.5], [1.13, 'footL', 0.4], [1.3, 'footR', 0]].forEach(([tk, f, up], k) => { FXk.trail(A, { of: f, t0: tk - 0.08, t1: tk + 0.04, len: 0.16, w: 0.2, op: 0.7 }); A.hit(0, tk, 6, k < 2 ? { up, nostop: false } : { big: true, stop: true }); kickRing(A, tk, () => dumAt(A, 0, tk, 0.6), 0.45); });
    A.launch(0, 1.31, 0.6); A.move(0, 1.31, [0.7, 0], 0.5, 'out'); FXk.dust(A, { t: 1.44, at: () => herAt(A, 1.44), n: 6, sp: 1.2 }); FXk.dust(A, { t: 2.0, at: () => at0(A, 0, 2.0), n: 7, sp: 1.3 });
    A.cap(0.3, 0.88, '一脚挑飞', 'A kick launches it'); A.cap(0.88, 3.2, '她跟着跳上去：空中三脚，各 6', 'She leaps after it: three kicks of 6 in the air'); } };

// GA20 Cuju: the knot gathers the pack into a ball of wind; she dribbles it left and right ahead of her for 2 s (2 a half second), then a big kick sends it 3 u: burst 6
GA.F20 = { T: 5.0, headMin: 0.02, cam: { x: 0.4, z: 0, w: 8.0 }, her: H(-2.6), seq: [[0.3, 'kKnot', { to: 0.95 }], [1.2, 'gDribble', { loop: true, until: 2.2, fade: 0.08 }], [2.2, 'gKneeUp', { fade: 0.04 }], [2.52, 'gRainbow', { fade: 0.03 }], [2.94, 'gWorld', { fade: 0.03 }], [3.34, 'gScorpion', { fade: 0.03 }], [4.14, 'idle', { from: 5.15, fade: 0.25 }]], // spec F20: inside taps, a knee juggle, a rainbow flick, around the world, a scorpion kick, a roll out
  root: [{ t: 1.2 }, { t: 2.2, fw: 1.2, e: 'lin' }, { t: 2.52, fw: 1.35, e: 'lin' }, { t: 2.94, fw: 1.65 }, { t: 3.34, fw: 1.8 }, { t: 3.42, fw: 1.95, pitch: 20 }, { t: 3.5, fw: 2.15, pitch: 78, y: 0.12 }, { t: 3.76, fw: 2.2, pitch: 82, y: 0.12 },
    ...rk(3.8, 3.98, (u) => ({ fw: 2.25 + 0.45 * u, pitch: 82 + 278 * u, y: 0.1 * (1 - u) - 0.22 * Math.sin(Math.PI * u) }), 10), { t: 4.04, fw: 2.75, pitch: 360, y: 0 }],
  dum: [[-0.4, -1.2], [0.4, 1.0], [-1.0, 0.7], [0.8, -0.6]],
  fx(A) { const T = A.THREE, tG = 0.92, tS = 3.64, tb = 3.95; const lift = (t) => { const w = (a, b) => A.clamp((t - a) / (b - a)); if (t < 2.26) return 0; if (t < 2.52) return 0.5 * Math.sin(Math.PI * w(2.26, 2.52)); if (t < 2.94) return 1.0 * Math.sin(Math.PI * w(2.64, 2.94) * 0.85); if (t < 3.34) return 0.75 - 0.25 * w(2.94, 3.34); return t < tS ? 0.5 : 0.5 * (1 - w(tS, tb)); };
    const ball = (t) => { const r = A.rootAt(Math.min(t, tS)); if (t < 1.2) return new T.Vector3(-1.75, 0, 0); if (t < 2.2) { const sw = Math.sin((t - 1.2) * Math.PI * 2 / 0.5) * 0.35; return new T.Vector3(r.x + 1.2, 0, sw); } if (t < 2.64) return new T.Vector3(r.x + 1.1, 0, 0); if (t < 2.94) return new T.Vector3(r.x + 0.7 + 0.6 * A.clamp((t - 2.64) / 0.3), 0, 0); if (t < tS) return new T.Vector3(r.x + 1.25, 0, 0); const u = A.EASE.out(A.clamp((t - tS) / (tb - tS))); return new T.Vector3(A.lerp(r.x + 1.25, r.x + 4.25, u), 0, 0); };
    FXk.trail(A, { of: 'tipA', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 });
    const g = A.add(new T.Group()); g.visible = false; for (let k = 0; k < 3; k++) { const m = new T.Mesh(new T.TorusGeometry(0.7, 0.025, 6, 40), A.mat(A.C.jade, A.F.FLAT)); m.rotation.set(k * 1.05, k * 0.6, 0); g.add(m); }
    A.fx((t) => { g.visible = t >= tG && t < tb; if (!g.visible) return; const p = ball(t); g.position.set(p.x, 0.7 + lift(t), p.z); g.rotation.set(t * 4, t * 6, 0); g.scale.setScalar(A.EASE.out(A.clamp((t - tG) / 0.2))); g.children.forEach((m) => { m.material.uniforms.op.value = 0.6; }); });
    A.card.dum.forEach((dm, i) => { const a = i * 1.57; A.moveTo(i, tG, [-1.75 + Math.cos(a) * 0.32, Math.sin(a) * 0.32], 0.3, 'in'); A.launch(i, tG + 0.3, 0.12); });
    for (let k = 0; k < 28; k++) { const t = 1.2 + k * 0.1; const p0 = ball(t), p1 = ball(Math.min(t + 0.1, tb)); A.card.dum.forEach((_, i) => A.move(i, t, [p1.x - p0.x, p1.z - p0.z], 0.1, 'lin')); }
    for (let k = 0; k < 4; k++) { const t = 1.45 + k * 0.25; A.card.dum.forEach((_, i) => A.hit(i, t + i * 0.02, 2, { nostop: true })); FXk.trail(A, { of: k % 2 ? 'footR' : 'footL', t0: t - 0.1, t1: t + 0.02, len: 0.12, w: 0.14, op: 0.5 }); }
    [[2.32, 'footR'], [2.7, 'footR'], [3.1, 'footR']].forEach(([t, f]) => { FXk.trail(A, { of: f, t0: t - 0.1, t1: t + 0.04, len: 0.14, w: 0.14, op: 0.5 }); A.card.dum.forEach((_, i) => A.hit(i, t + i * 0.02, 2, { nostop: true })); });
    FXk.trail(A, { of: 'footR', t0: 3.5, t1: 3.66, len: 0.2, w: 0.24, op: 0.75 }); FXk.dust(A, { t: 3.5, at: () => herAt(A, 3.5).add(new T.Vector3(0.4, 0, 0)), n: 5, sp: 0.9 });
    const pb = () => { const p = ball(tb - 0.01); return [p.x, 0, 0]; }; FXk.ring(A, { t: tb, at: pb, r0: 0.3, r1: 1.6, dur: 0.3, w: 0.3 }); FXk.disc(A, { t: tb, at: pb, r0: 0.3, r1: 1.2, dur: 0.25, op: 0.35 }); A.shake(tb, 0.06, 0.2); A.shake(tS, 0.04, 0.12);
    A.card.dum.forEach((_, i) => { const a = i * 1.57; A.hit(i, tb + 0.02, 6, { big: true, nostop: true }); A.move(i, tb + 0.02, [Math.cos(a) * 1.1, Math.sin(a) * 1.1], 0.3, 'out'); });
    A.cap(0.3, 1.2, '风结把敌群卷成一个风球', 'The knot gathers the pack into a ball of wind'); A.cap(1.2, 3.34, '带球 2 秒，膝颠、彩虹过顶、绕球：每半秒 2', 'She dribbles it for 2 s with knee, rainbow and around-the-world tricks: 2 a half second'); A.cap(3.34, 4.8, '蝎子踢送出 3 u，炸开：6', 'A scorpion kick sends it 3 u: burst 6'); } };

// GA21 Parry spin: three upright spins of 6; a melee hit on her during a spin misses and the attacker is kicked: 10, pushed 1 u
GA.F21 = { T: 3.2, cam: { x: -0.4, z: 0, w: 6.0 }, her: H(-0.4), seq: [[0.5, 'gParry'], [1.8, 'idle', { from: 5.15, fade: 0.3 }]], // spec F21: three spins the same way on the left paw, each stops dead on a blow; a back kick, a hook kick, a crescent kick; a side-on guard
  root: [{ t: 0.5, spin: 0 }, { t: 0.66, spin: 137, e: 'in' }, { t: 0.7, spin: 142 }, { t: 0.86, spin: 330, e: 'out' }, { t: 1.06, spin: 594, e: 'in' }, { t: 1.1, spin: 598 }, { t: 1.26, spin: 790, e: 'out' }, { t: 1.46, spin: 1070, e: 'in' }, { t: 1.5, spin: 1074 }, { t: 1.66, spin: 1170, e: 'out' }],
  dum: [[0.75, 0.2], [-1.2, -0.75], [-1.1, 0.95]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footR', t0: 0.55, t1: 1.62, len: 0.16, w: 0.18, op: 0.45 });
    [0.58, 0.98, 1.38].forEach((tk) => { FXk.ring(A, { t: tk, at: 'her', r0: 0.4, r1: 1.1, dur: 0.25, w: 0.15, op: 0.5 }); [0, 1, 2].forEach((i) => A.hit(i, tk + i * 0.03, 6, { nostop: true })); });
    [[1, 0.25, 0.66, '背旋踢', 'Spinning back kick'], [2, 0.65, 1.06, '勾踢', 'Hook kick'], [0, 1.05, 1.46, '月牙踢', 'Crescent kick']].forEach(([i, w0, tp, zh, en]) => { const r = A.rootAt(tp); windup(A, i, w0, tp, [r.x, r.z], { len: 1.1 }); const p = A.dpos(i, tp), c = new T.Vector3((p.x + r.x) / 2, 0.75, (p.z + r.z) / 2);
      FXk.spark(A, { t: tp, at: c, r: 0.2, col: A.C.parch }); FXk.ring(A, { t: tp, at: [c.x, 0.75, c.z], r0: 0.1, r1: 0.55, dur: 0.22, w: 0.35, dir: () => new T.Vector3(p.x - r.x, 0, p.z - r.z).normalize() });
      const dx = p.x - r.x, dz = p.z - r.z, l = Math.hypot(dx, dz), tk = tp + 0.11; FXk.trail(A, { of: 'footR', t0: tk - 0.08, t1: tk + 0.04, len: 0.16, w: 0.22, op: 0.7 }); A.hit(i, tk, 10, { big: true, stop: true, knock: [dx / l, dz / l], kdur: 0.3 }); A.cap(tp - 0.05, tp + 0.36, '格挡 · ' + zh, 'Parry · ' + en); });
    A.cap(0.3, 0.6, '三圈直立转身：各 6', 'Three upright spins: 6 each'); A.cap(1.85, 3.0, '转身时挨的近战打空，出手的敌人被踢：10，推开 1 u', 'A melee hit during a spin misses; the attacker is kicked: 10, pushed 1 u'); } };

// GA22 Head clap: the bow knocks two foes' heads together: 15 each, stun 0.5 s
GA.F22 = { T: 3.0, cam: { x: -0.8, z: 0, w: 5.4 }, her: H(-1.9), seq: [[0.3, 'gClap'], [1.3, 'idle', { from: 5.15, fade: 0.25 }]], // spec F22: the bow hooked behind both necks, a dropped-weight hip-twist yank, a clonk, a toprock brag
  root: [{ t: 0.3 }, { t: 0.42, fw: 0.6, e: 'out' }, { t: 0.84, fw: 0.6 }, { t: 1.2, fw: 0.3, e: 'io2' }],
  dum: [[-0.85, -0.55], [-0.85, 0.55]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'tipA', t0: 0.44, t1: 0.56, len: 0.16, w: 0.1, op: 0.55 }); FXk.trail(A, { of: 'tipB', t0: 0.44, t1: 0.56, len: 0.16, w: 0.1, op: 0.55 }); FXk.trail(A, { of: 'tipA', t0: 0.6, t1: 0.74, len: 0.2, w: 0.08, op: 0.45 });
    A.moveTo(0, 0.44, [-0.9, -0.21], 0.1, 'in'); A.moveTo(1, 0.44, [-0.9, 0.21], 0.1, 'in'); const tc = 0.54, c = new T.Vector3(-0.9, 1.15, 0);
    [0, 1].forEach((i) => { A.hit(i, tc, 15, { big: true, stop: true, stun: 0.5, dir: [0, i ? 1 : -1] }); A.move(i, tc + 0.05, [0, i ? 0.3 : -0.3], 0.2, 'out'); A.down(i, tc + 0.45, 0.7, [0, i ? 1 : -1]); });
    FXk.spark(A, { t: tc, at: c, r: 0.3, col: A.C.parch }); FXk.ring(A, { t: tc, at: [c.x, 1.15, 0], r0: 0.1, r1: 0.8, dur: 0.25, w: 0.4, dir: () => new T.Vector3(0, 0, 1) }); FXk.ring(A, { t: tc, at: [c.x, 0, 0], r0: 0.2, r1: 1.1, dur: 0.3, w: 0.2 });
    for (let k = 0; k < 6; k++) { const a = k * 1.047; FXk.tube(A, { t: tc, dur: 0.1, hold: 0.05, out: 0.2, r: 0.025, col: A.C.parch, op: 0.9, e: 'out', pts: () => [new T.Vector3(c.x + Math.cos(a) * 0.15, c.y + Math.sin(a) * 0.15, 0), new T.Vector3(c.x + Math.cos(a) * 0.55, c.y + Math.sin(a) * 0.55, 0)] }); }
    A.shake(tc, 0.06, 0.2); A.cap(0.3, 2.8, '用弓把两个敌人的头撞在一起：各 15，眩晕 0.5 秒', "The bow knocks two foes' heads together: 15 each, stun 0.5 s"); } };

// GA23 Zigzag: she runs a zigzag; at each sharp turn she plants a spin kick: 12 within 1.5 u
GA.F23 = { T: 5.4, cam: { x: 0.2, z: 0, w: 8.6 }, her: H(-3.0, 1.2, 90), // spec F23: a bounding run; each turn pivots on a planted paw and throws a different kick: hook, spinning back kick, tornado, low sweep; a skid and a toprock beat
  seq: [[0.3, 'run', { loop: true, until: 0.75 }], [0.75, 'zHook', { fade: 0.05 }], [1.11, 'run', { loop: true, until: 1.56, fade: 0.05 }], [1.56, 'zBack', { fade: 0.05 }], [1.98, 'run', { loop: true, until: 2.43, fade: 0.05 }], [2.43, 'gTornadoS', { to: 0.4, fade: 0.04 }], [2.83, 'run', { loop: true, until: 3.28, fade: 0.05 }], [3.28, 'gSweepLow', { to: 0.6, fade: 0.05 }], [3.88, 'run', { loop: true, until: 4.2, fade: 0.05 }], [4.2, 'zSkid', { fade: 0.04 }], [4.8, 'idle', { from: 5.15, fade: 0.25 }]],
  root: [{ t: 0.3 }, { t: 0.38, spin: 56 }, { t: 0.75, fw: 1.4, sd: -2.1, spin: 56, e: 'lin' }, { t: 0.95, fw: 1.4, sd: -2.1, spin: -54, e: 'io2' }, { t: 1.11, fw: 1.4, sd: -2.1, spin: -54 }, { t: 1.56, fw: 2.8, sd: -0.2, spin: -54, e: 'lin' }, { t: 1.8, fw: 2.8, sd: -0.2, spin: 416, e: 'io2' }, { t: 1.98, fw: 2.8, sd: -0.2, spin: 416 },
    { t: 2.43, fw: 4.2, sd: -2.1, spin: 416, e: 'lin' }, { t: 2.55, fw: 4.2, sd: -2.1, y: 0.3, spin: 200, e: 'lin', ye: 'out' }, { t: 2.7, fw: 4.2, sd: -2.1, y: 0, spin: -54, e: 'out', ye: 'in' }, { t: 2.83, fw: 4.2, sd: -2.1, spin: -54 },
    { t: 3.28, fw: 5.6, sd: -0.3, spin: -54, e: 'lin' }, { t: 3.44, fw: 5.6, sd: -0.3, spin: -54 }, { t: 3.74, fw: 5.6, sd: -0.3, spin: 416, e: 'io2' }, { t: 3.88, fw: 5.6, sd: -0.3, spin: 416 }, { t: 4.2, fw: 6.2, sd: -1.12, spin: 416, e: 'lin' }, { t: 4.46, fw: 6.5, sd: -1.55, spin: 416, e: 'out' }],
  dum: [[-1.0, -1.5], [-2.2, -0.5], [0.4, 1.6], [1.8, -1.5], [3.2, 1.4], [1.0, -0.1]],
  fx(A) { const T = A.THREE; FXk.tube(A, { t: 0.3, dur: 4.2, hold: 0.4, out: 0.4, flat: true, w: 0.1, op: 0.45, e: 'lin', pts: () => [0.3, 0.75, 1.56, 2.43, 3.28, 4.46].map((t) => footAt(A, t).add(new T.Vector3(0, 0.03, 0))) });
    [[0.86, 'footR'], [1.75, 'footR'], [2.61, 'footR'], [3.55, 'footR']].forEach(([tk, f]) => { const c = footAt(A, tk); FXk.trail(A, { of: f, t0: tk - 0.12, t1: tk + 0.1, len: 0.2, w: 0.22, op: 0.6 }); FXk.ring(A, { t: tk, at: [c.x, 0, c.z], r0: 0.4, r1: 1.5, dur: 0.3, w: 0.15 }); FXk.dust(A, { t: tk - 0.1, at: [c.x, 0, c.z], n: 6, sp: 1.2 });
      A.card.dum.forEach((dm, i) => { const p = A.dpos(i, tk), d = Math.hypot(p.x - c.x, p.z - c.z); if (d <= 1.5) A.hit(i, tk + 0.02, 12, { knock: [(p.x - c.x) / d * 0.5, (p.z - c.z) / d * 0.5], nostop: true }); }); });
    FXk.dust(A, { t: 4.25, at: () => herAt(A, 4.3), n: 8, sp: 1.2 });
    A.cap(0.3, 5.2, '之字跑：每个急转弯原地一记不同的踢，1.5 u 内 12', 'A zigzag run: each sharp turn plants a different kick, 12 within 1.5 u'); } };

// GA24 Sinkhole: a heel drill (16 within 1.8 u) sinks the floor 2.5 u wide for 2 s; foes slide to its centre, slowed 50%
GA.F24 = { T: 4.0, cam: { x: -0.8, z: 0, w: 6.4 }, her: H(-1.05), seq: [[0.3, 'gSink'], [1.92, 'idle', { from: 5.15, fade: 0.25 }]], // spec F24: a launch straight up, a flip over, a corkscrew heel drill, three drill turns in the pit, a back handspring to the rim
  root: [{ t: 0.57 }, { t: 0.66, y: 1.25, pitch: -180, e: 'lin', ye: 'out' }, { t: 0.7, y: 1.3, pitch: -360, e: 'lin' }, { t: 0.82, y: 0, spin: 720, pitch: -360, ye: 'in', e: 'lin' }, { t: 0.9, spin: 720 }, { t: 1.3, spin: 1800, e: 'io2' }, { t: 1.36, spin: 1800, pitch: -360 }, { t: 1.47, fw: -0.55, y: 0.2, pitch: -540, e: 'lin', ye: 'out' }, { t: 1.58, fw: -1.1, y: 0, pitch: -720, e: 'out', ye: 'in' }],
  dum: [[-0.1, 1.3], [0.6, -1.1], [-2.0, -1.2], [0.9, 0.6]],
  fx(A) { const T = A.THREE, tl = 0.82, c = new T.Vector3(-1.05, 0, 0); FXk.trail(A, { of: 'footR', t0: 0.68, t1: 0.82, len: 0.2, w: 0.2, op: 0.7 }); A.shake(tl, 0.07, 0.25);
    FXk.helix(A, { t: tl - 0.12, dur: 0.12, from: [c.x, 1.3, 0], to: [c.x, -0.1, 0], r: 0.25, turns: 2, strands: 2, hold: 0.1, out: 0.2, op: 0.6 }); FXk.ring(A, { t: tl, at: c, r0: 0.3, r1: 1.8, dur: 0.3, w: 0.3 }); FXk.dust(A, { t: tl, at: c, n: 10, sp: 2.0 });
    FXk.disc(A, { t: tl + 0.05, at: c, r0: 0.3, r1: 2.5, dur: 2.0, op: 0.4, col: '#3A332B' }); for (let k = 0; k < 8; k++) FXk.ring(A, { t: tl + 0.1 + k * 0.25, at: c, r0: 2.4, r1: 0.25, dur: 0.6, w: 0.05, op: 0.4, e: 'in', col: A.C.bone });
    FXk.trail(A, { of: 'footL', t0: 0.92, t1: 1.3, len: 0.25, w: 0.12, op: 0.4, col: A.C.jade }); FXk.dust(A, { t: 1.58, at: () => herAt(A, 1.58), n: 5, sp: 0.8 });
    A.card.dum.forEach((dm, i) => { const dx = dm.x - c.x, dz = dm.z - c.z, d = Math.hypot(dx, dz); if (d <= 1.8) A.hit(i, tl + 0.02, 16, { nostop: i > 0 }); if (d <= 2.5) { A.status(i, tl + 0.1, 'slow', 2.0); A.moveTo(i, tl + 0.15, [c.x + dx / d * 0.5, c.z + dz / d * 0.5], 1.8, 'io2'); FXk.dust(A, { t: tl + 0.5, at: () => at0(A, i, tl + 0.5), n: 3, dir: [-dx, -dz], sp: 0.6 }); } });
    A.cap(0.3, 1.0, '脚跟钻地：1.8 u 内 16', 'A heel drill: 16 within 1.8 u'); A.cap(1.0, 3.8, '地面下陷 2.5 u 宽 2 秒：敌人滑向中心，减速 50%', 'The floor sinks 2.5 u wide for 2 s: foes slide to the centre, slowed 50%'); } };

// ---------------------------------------------------------------- the twelve combos (kit section 6): two skills, one small rule between them; bonus numbers in Wind Jade
const J = (A) => ({ col: A.C.jade });
const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const sm01 = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const pullTo = (A, i, tT, spot, k, n = 3) => { const dm = A.card.dum[i], T = A.THREE, p = new T.Vector3(dm.x, 0.55, dm.z);
  FXk.tube(A, { t: tT + i * 0.02, dur: 0.14, hold: 0.25, out: 0.25, r: 0.025, op: 0.75, e: 'out', pts: (A2) => { const b = A2.at('tipA', tT); const m = b.clone().lerp(p, 0.5); m.y += 0.6; return [b, m, p]; } });
  FXk.helix(A, { t: tT + 0.12, dur: 0.15, from: [dm.x, 0.2, dm.z], to: [dm.x, 0.95, dm.z], r: 0.3, turns: 2, strands: 1, hold: 0.25, out: 0.25, op: 0.7 });
  const to = [spot[0] + Math.cos(k * 6.283 / n + 0.6) * 0.45, spot[2] + Math.sin(k * 6.283 / n + 0.6) * 0.45]; A.moveTo(i, tT + 0.2, to, 0.35, 'in'); A.hit(i, tT + 0.55, 8, { slow: 2 }); };
const wallMesh = (A, x, z, len = 3.2) => { const T = A.THREE, g = new T.Group(); const mat = new T.MeshStandardMaterial({ color: '#8C877E', roughness: 0.95 });
  for (let k = 0; k < Math.round(len / 0.8); k++) { const b = new T.Mesh(new T.BoxGeometry(0.34, 0.9 + (k % 2) * 0.12, 0.78), mat); b.position.set(0, 0.45 + (k % 2) * 0.06, -len / 2 + 0.4 + k * 0.8); b.castShadow = true; b.receiveShadow = true; g.add(b); }
  g.position.set(x, 0, z); A.add(g); return g; };

DEFS.C1 = { T: 4.6, cam: { x: 0.2, z: 0, w: 7.2 }, her: H(-2.6), seq: [[0.3, 'kKnot'], [1.9, 'sPin']],
  root: [{ t: 0.64 }, { t: 0.82, spin: 360, e: 'io2' }, { t: 2.02, spin: 360 }, { t: 2.22, spin: 360, y: 0.55, e: 'out' }, { t: 2.4, spin: 360, y: 0, e: 'in' }],
  dum: [[0.3, -1.7], [2.4, 1.3], [-0.1, 1.4]],
  fx(A) { const T = A.THREE, spot = [0.9, 0, 0], tT = 0.92; FXk.trail(A, { of: 'tipA', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 });
    [0, 1, 2].forEach((i) => pullTo(A, i, tT, spot, i)); FXk.ring(A, { t: tT + 0.55, at: spot, r0: 0.4, r1: 1.2, dur: 0.3, w: 0.3 });
    const tL = 2.22, tH = 2.32; FXa(A, { t: tL, dur: 0.1, to: { d: 0, y: 0.15 }, len: 0.8, glow: A.C.jade, hits: [{ d: 0, n: 20 }] });
    FXk.stuck(A, { t: tH, dur: 1.6, at: (t) => dumAt(A, 0, tH, 0.15), dir: [0.75, -0.65, 0], shiver: true });
    [1, 2].forEach((i, k) => { FXk.tube(A, { t: tH + 0.02 + k * 0.05, dur: 0.1, hold: 1.1, out: 0.3, r: 0.03, op: 0.9, e: 'out', pts: () => { const a = A.dpos(0, tH), b = A.dpos(i, tH); return [new T.Vector3(a.x, 0.35, a.z), new T.Vector3((a.x + b.x) / 2, 0.85, (a.z + b.z) / 2), new T.Vector3(b.x, 0.6, b.z)]; } }); });
    FXk.ring(A, { t: tH + 0.1, at: spot, r0: 0.95, r1: 0.9, dur: 1.1, w: 0.06, op: 0.6, e: 'lin' }); [0, 1, 2].forEach((i) => A.status(i, tH + 0.12, 'stun', 1.0)); A.shake(tH, 0.04, 0.15);
    A.cap(0.4, 1.8, '聚风把三个敌人拉到一起', 'Windknot gathers three foes'); A.cap(1.9, 4.4, '钉矢射进这一团：三个全被绑住，眩晕 1 秒', 'Pinning Arrow into the knot ties all three: stunned 1 s'); } };

DEFS.C2 = { T: 3.4, cam: { x: 0.0, z: 0, w: 6.0 }, her: H(-1.2), seq: [[0.3, 'kCyclone', { to: 0.42 }], [1.6, 'combo1']], root: [{ t: 0.35 }, { t: 0.7, spin: 360, e: 'io2' }],
  dum: [[-0.45, 0.05]],
  fx(A) { const T = A.THREE; wallMesh(A, 1.65, 0); FXk.trail(A, { of: 'footR', t0: 0.4, t1: 0.6, len: 0.16, w: 0.2, op: 0.6 });
    A.hit(0, 0.55, 6, { knock: [1.62, 0], kdur: 0.22, ke: 'lin' }); const tw = 0.77; A.move(0, tw, [-0.3, 0], 0.25, 'out');
    A.hit(0, tw, 10, { stun: 0.5, ...J(A), big: true }); FXk.ring(A, { t: tw, at: [1.46, 0.55, 0.05], r0: 0.15, r1: 0.9, dur: 0.3, w: 0.3, dir: () => new T.Vector3(1, 0, 0) });
    FXk.dust(A, { t: tw, at: [1.42, 0.3, 0.05], n: 9, sp: 1.6, rise: 2.0, dir: [-1, 0] }); FXk.spark(A, { t: tw, at: [1.45, 0.6, 0.05], r: 0.3, col: A.C.parch, dur: 0.15 }); A.shake(tw, 0.07, 0.2);
    FXa(A, { t: 1.82, dur: 0.1, to: { d: 0 }, len: 0.7, hits: [{ d: 0, n: 12 }] });
    A.cap(0.3, 3.2, '踢到墙上：10，眩晕 0.5 秒（磐皮的石板、石环也算墙）', "Kicked into a wall: 10, stun 0.5 s (Stonehide's slab and Stone Ring count)"); } };

DEFS.C3 = { T: 4.0, cam: { x: -0.4, z: 0, w: 6.8 }, her: H(-2.2), seq: [[0.3, 'combo1'], [1.4, 'kCrescent']], root: [{ t: 1.4 }, ...flipAt(1.4)],
  dum: [[-0.85, 0.1]],
  fx(A) { FXa(A, { t: 0.52, dur: 0.12, to: { d: 0 }, len: 0.7, hits: [{ d: 0, n: 12 }] }); A.cap(0.3, 1.3, '地上：12', 'On the ground: 12');
    const tk = 1.7; FXk.trail(A, { of: 'footL', of2: 'footR', t0: 1.58, t1: 1.76, len: 0.16, op: 0.75 }); A.hit(0, tk, 14, { up: 0.9 });
    FXa(A, { t: 1.87, dur: 0.1, to: { d: 0 }, len: 0.8, glow: A.C.jade, hits: [{ d: 0, n: 16, big: true, ...J(A) }] }); FXk.ring(A, { t: 1.97, at: (t) => dumAt(A, 0, 1.97, 0.4), r0: 0.1, r1: 0.6, dur: 0.25, w: 0.3 });
    A.cap(1.4, 3.8, '空中：同一箭 16（+30%），谁挑飞的都算', 'In the air: the same arrow 16 (+30%), whoever launched it'); } };

DEFS.C4 = { T: 3.8, cam: { x: -0.2, z: 0, w: 6.6 }, her: H(-2.2), seq: [[0.3, 'kCrescent', { to: 0.75 }], [1.05, 'kDive', { from: 0.9 }]],
  root: [{ t: 0.3 }, { t: 0.45, fw: 0.45, e: 'out' }, { t: 0.5, fw: 0.45 }, { t: 0.77, fw: 0.3, y: 1.0, pitch: -180, e: 'out', ye: 'out' }, { t: 1.05, fw: 0.6, y: 2.2, pitch: -360, e: 's', ye: 'out' }, { t: 1.051, pitch: 0 },
    { t: 1.3, fw: 1.0, y: 1.9, pitch: 100, e: 's' }, { t: 1.71, fw: 1.25, y: 0, pitch: 360, e: 'in', ye: 'in' }, { t: 1.711, pitch: 0 }],
  dum: [[-1.2, 0.0], [-0.1, -0.8], [-0.2, 0.9]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footL', of2: 'footR', t0: 0.48, t1: 0.66, len: 0.16, op: 0.75 }); A.hit(0, 0.6, 14, { up: 2.4 });
    const th = 1.3, tl = 1.71; A.hit(0, th, null); A.launch(0, th, 0.02); FXk.trail(A, { of: 'footR', t0: 1.2, t1: tl, len: 0.18, w: 0.18, op: 0.7 });
    FXk.ring(A, { t: th, at: (t) => dumAt(A, 0, th, 0.5), r0: 0.1, r1: 0.7, dur: 0.2, w: 0.35 });
    const g = () => { const p = A.dpos(0, tl); return new T.Vector3(p.x, 0, p.z); }; A.hit(0, tl, 24, { big: true, ...J(A) });
    FXk.ring(A, { t: tl, at: g, r0: 0.3, r1: 1.5, dur: 0.4, w: 0.3 }); FXk.disc(A, { t: tl, at: g, r0: 0.3, r1: 1.4, dur: 0.25, op: 0.4 }); FXk.dust(A, { t: tl, at: g, n: 10, sp: 1.8, rise: 2.5, r: 0.22 });
    [1, 2].forEach((i) => A.hit(i, tl + 0.03, 10, { up: 0.5, ...J(A) })); A.shake(tl, 0.08, 0.28);
    A.cap(0.3, 1.2, '先挑飞', 'Launch first'); A.cap(1.2, 3.6, '鹰坠的脚跟把它砸下去：伤害 +50%，1.5 u 内再 10', "Eagle Dive's heel slams it down: 50% more, and 10 within 1.5 u"); } };

DEFS.C5 = { T: 4.2, cam: { x: 0.4, z: 0, w: 7.6 }, her: H(-2.8), seq: [[0.3, 'rTornado', { to: 0.9 }], [1.6, 'sPierce']], root: [{ t: 1.6 }, { t: 1.72, sd: -0.3, e: 'out' }],
  dum: [[1.8, -1.3], [2.6, 0.2], [1.9, 1.4]],
  fx(A) { const T = A.THREE, spot = [0.0, 0, 0], tL = 0.9; FXa(A, { t: tL, dur: 0.18, to: [spot[0], 0.1, spot[2]], len: 0.9, glow: A.C.jade });
    FXk.twister(A, { t0: 1.08, t1: 3.9, at: spot, r: 0.9, h: 2.3 });
    const t1 = 1.85, tIn = t1 + 0.12; FXa(A, { t: t1, dur: 0.12, from: P3(A.at('nock', t1)), to: [spot[0], 0.9, spot[2]], len: 1.2, glow: A.C.jade });
    FXk.ring(A, { t: tIn, at: [spot[0], 0.9, spot[2]], r0: 0.2, r1: 1.0, dur: 0.25, w: 0.3, dir: () => new T.Vector3(1, 0, 0) });
    [0, 1, 2].forEach((d) => FXa(A, { t: tIn + 0.02, dur: 0.14, from: [spot[0] + 0.3, 0.9, spot[2]], to: { d }, len: 0.9, glow: A.C.jade, hits: [{ d, n: 15, ...J(A) }] }));
    A.cap(0.3, 1.5, '旋风矢', 'Tornado Shot'); A.cap(1.6, 4.0, '一箭穿过旋风，出来变三支，各射一个附近的敌人：伤害减半', 'An arrow through it comes out as three, each at a foe near it, for half'); } };

DEFS.C6 = { T: 5.6, cam: { x: 0.6, z: 0, w: 7.6 }, her: H(-2.6), seq: [[0.3, 'rRain'], [2.1, 'kKnot']], root: [{ t: 2.44 }, { t: 2.62, spin: 360, e: 'io2' }],
  dum: [[2.2, -1.4], [3.4, 0.9], [1.4, 1.5]],
  fx(A) { const T = A.THREE, a = [0.0, 0, -0.2], b = [2.3, 0, 0.1], tT = 2.72; FXa(A, { t: 0.8, dur: 0.3, to: [-1.4, 5.0, 0], len: 1.2, glow: A.C.jade });
    const at = (t) => lerp2(a, b, sm01((t - tT) / 0.5)); FXk.rain(A, { t0: 1.3, t1: 5.3, at, r: 1.3, rate: 22, h: 4.5, slant: [0.35, 0.15] });
    FXk.ring(A, { t: 1.25, at, r0: 1.25, r1: 1.3, dur: 4.1, w: 0.06, op: 0.35, e: 'lin' });
    FXk.trail(A, { of: 'tipA', t0: 2.15, t1: 2.66, len: 0.22, w: 0.08, op: 0.55 }); [0, 1, 2].forEach((i) => pullTo(A, i, tT, b, i));
    FXk.helix(A, { t: tT, dur: 0.5, from: [a[0], 0.6, a[2]], to: [b[0], 0.6, b[2]], r: 0.5, turns: 3, strands: 2, hold: 0.1, out: 0.3, op: 0.5 });
    for (let k = 0; k < 6; k++) [0, 1, 2].forEach((i) => A.hit(i, 3.4 + k * 0.32, 7));
    A.cap(0.3, 2.0, '箭雨', 'Rain of Arrows'); A.cap(2.1, 5.4, '对箭雨放聚风：箭雨跟着风走，落在被拉来的敌人头上', 'Windknot cast on her rain takes the rain with it, onto the gathered foes'); } };

DEFS.C7 = { T: 5.2, cam: { x: 0.4, z: 0, w: 7.2 }, her: H(-2.4), seq: [[0.3, 'sMark']], dum: [[-0.6, -1.0], [-0.4, 1.0], [2.0, 0.2]],
  fx(A) { const tL = 0.86; FXa(A, { t: tL, dur: 0.14, to: { d: 2 }, hits: [{ d: 2, n: 12 }] }); FXk.reticle(A, { t: tL + 0.12, d: 2, dur: 5.0 - tL });
    const kp = (t) => { const an = t * 2.4; return { x: -2.4 + Math.cos(an) * 1.0, y: 1.5 + 0.1 * Math.sin(t * 5), z: Math.sin(an) * 1.0, yaw: -an }; }; FXk.kestrel(A, { pos: kp });
    for (let k = 0; k < 8; k++) { const tk = 1.3 + k * 0.5, p = kp(tk); FXa(A, { t: tk, dur: 0.16, from: [p.x, p.y, p.z], to: { d: 2 }, len: 0.6, w: 0.07, col: A.C.jade, hits: [{ d: 2, n: 8 }] }); }
    A.cap(0.3, 1.2, '猎人印记', "Hunter's Mark"); A.cap(1.2, 5.0, '隼只射有印记的敌人，射速翻倍（近处的不管）', 'The kestrel shoots only the marked foe, twice as often (it ignores the near ones)'); } };

DEFS.C8 = { T: 4.6, cam: { x: -0.4, z: 0, w: 6.4 }, her: H(-2.0), seq: [[0.3, 'castPlant', { to: 0.8 }], [1.3, 'kCyclone', { to: 0.42 }]], root: [{ t: 1.35 }, { t: 1.7, spin: 360, e: 'io2' }],
  dum: [[-1.25, 0.05]],
  fx(A) { const T = A.THREE, trap = new T.Vector3(0.2, 0, 0), t0 = 0.72; FXa(A, { t: 0.6, dur: 0.12, from: P3(A.at('nock', 0.6)), to: [trap.x, 0.18, trap.z], len: 0.6 });
    FXk.stuck(A, { t: t0, dur: 3.6, at: [trap.x, 0.18, trap.z], dir: [0.1, -1, 0] });
    FXk.helix(A, { t: t0, dur: 0.25, from: [trap.x, 0.02, trap.z], to: [trap.x, 0.34, trap.z], r: 0.16, turns: 3, strands: 2, hold: 0.9, out: 0.3, col: A.C.bone, op: 0.6 });
    FXk.ring(A, { t: t0, at: trap, r0: 0.2, r1: 0.75, dur: 0.3, w: 0.2, col: A.C.bone, op: 0.6 }); FXk.ring(A, { t: t0 + 0.3, at: trap, r0: 0.74, r1: 0.75, dur: 1.2, w: 0.05, col: A.C.bone, op: 0.35, e: 'lin' });
    FXk.trail(A, { of: 'footR', t0: 1.4, t1: 1.6, len: 0.16, w: 0.2, op: 0.6 }); A.hit(0, 1.55, 6, { knock: [1.45, -0.05], kdur: 0.3 }); const ts = 1.85;
    for (let k = 0; k < 7; k++) { const a = k * 0.9; FXk.tube(A, { t: ts + k * 0.015, dur: 0.12, hold: 1.2, out: 0.25, r: 0.03, col: A.C.bone, op: 0.85, e: 'out', pts: () => [new T.Vector3(trap.x + Math.cos(a) * 0.7, 0.02, trap.z + Math.sin(a) * 0.7), new T.Vector3(trap.x + Math.cos(a + 0.6) * 0.55, 0.7, trap.z + Math.sin(a + 0.6) * 0.55), new T.Vector3(trap.x + Math.cos(a + 1.4) * 0.15, 1.15, trap.z + Math.sin(a + 1.4) * 0.15)] }); }
    A.status(0, ts, 'stun', 1.4); for (let k = 0; k < 5; k++) A.hit(0, ts + k * 0.5, k < 2 ? 16 : 8, k < 2 ? J(A) : {}); A.shake(ts, 0.05, 0.18);
    A.cap(0.3, 1.2, '棘阱', 'Briar Trap'); A.cap(1.3, 4.4, '把敌人踢进陷阱：眩晕 1.4 秒，第一秒伤害翻倍', 'Kick a foe into it: stun 1.4 s, double damage in the first second'); } };

DEFS.C9 = { T: 3.4, cam: { x: 0.6, z: 0, w: 7.6 }, her: H(-2.6), seq: [[0.3, 'rBurst'], [1.15, 'combo1']], dum: [[0.4, 1.2], [1.2, -1.3], [2.6, 0.6]],
  fx(A) { const T = A.THREE, tL = 0.66, land = [1.0, 0.05, 0]; FXk.toss(A, { t0: tL, t1: tL + 0.42, from: (t) => A.at('nock', t), to: land, arc: 1.6, spin: 0 });
    FXk.stuck(A, { t: tL + 0.42, dur: 0.3, at: [land[0], 0.32, land[2]], dir: [0.15, -1, 0], shiver: true });
    const ts = 1.37, tb = ts + 0.1; FXa(A, { t: ts, dur: 0.1, to: [land[0], 0.32, land[2]], len: 0.7 });
    FXk.ring(A, { t: tb, at: [land[0], 0, land[2]], r0: 0.2, r1: 3.0, dur: 0.45, w: 0.3 }); FXk.disc(A, { t: tb, at: [land[0], 0, land[2]], r0: 0.4, r1: 2.8, dur: 0.3, op: 0.45 });
    FXk.ring(A, { t: tb, at: [land[0], 0, land[2]], r0: 1.48, r1: 1.5, dur: 0.5, w: 0.05, op: 0.4, col: A.C.bone });
    [0, 1, 2].forEach((i) => { const dm = A.card.dum[i]; const dx = dm.x - land[0], dz = dm.z - land[2], d = Math.hypot(dx, dz); A.hit(i, tb + 0.03 + d * 0.03, 18, { knock: [dx / d * 0.4, dz / d * 0.4], ...J(A) }); });
    A.shake(tb, 0.07, 0.25); A.cap(0.3, 1.3, '绽矢落地', 'Burst Arrow lands'); A.cap(1.3, 3.2, '任何一箭射中它：立刻炸开，范围翻倍（3 u）', 'Any arrow that hits it sets it off at once, twice as wide (3 u)'); } };

DEFS.C10 = { T: 3.6, cam: { x: 0.4, z: 0, w: 7.8 }, her: H(-2.8), seq: [[0.3, 'sPower', { from: 0.0, to: 1.05 }]],
  root: [{ t: 0.75 }, ...rk(0.75, 1.35, (u, t) => ({ fw: 2.6 * s01(u), y: 0.7 * 4 * u * (1 - u), pitch: 360 * s01((t - 0.92) / 0.38) })), { t: 1.62, fw: 2.6 }, { t: 1.9, fw: 2.3, e: 'out' }],
  dum: [[1.3, 0.1], [2.6, -0.1]],
  fx(A) { const T = A.THREE; FXk.suck(A, { t0: 0.45, t1: 1.55, at: (t) => A.at('nock', t), r: 1.5, n: 14, y: 0.03, lift: 1 });
    for (let k = 0; k < 5; k++) FXk.ring(A, { t: 0.5 + k * 0.2, dur: 0.3, at: (t) => A.at('nock', t), r0: 0.7, r1: 0.06, e: 'in', w: 0.3, dir: () => A.fwd(1.0), op: 0.55 });
    FXk.trail(A, { of: 'hips', t0: 0.75, t1: 1.35, len: 0.25, w: 0.25, op: 0.25, col: A.C.bone }); FXk.trail(A, { of: 'nock', t0: 0.8, t1: 1.35, len: 0.3, w: 0.06, op: 0.5 });
    const tL = 1.55, end = (A2) => fwdPt(A2, tL, 7); FXa(A, { t: tL, dur: 0.28, to: end(A), len: 2.4, scale: 1.4, w: 0.16, glow: A.C.jade, pierce: [{ d: 0, n: 48, big: true }, { d: 1, n: 48, big: true }] });
    FXk.helix(A, { t: tL, dur: 0.28, from: (A2) => A2.at('nock', tL), to: end, r: 0.26, turns: 5, strands: 2, hold: 0.1, out: 0.4 }); A.shake(tL, 0.05, 0.2);
    A.cap(0.3, 3.4, '冲刺不打断蓄力：空翻时继续拉弓，可以在空中放', 'A dash does not cancel the draw: she keeps drawing through the somersault and can loose in it'); } };

DEFS.C11 = { T: 3.6, cam: { x: 0.6, z: 0, w: 7.8 }, her: H(-2.8), seq: [[0.3, 'dash', { to: 0.6 }], [0.9, 'rVolley', { from: 0.1 }]],
  root: [{ t: 0.45 }, { t: 0.88, fw: 1.45, y: 1.45, pitch: 360, e: 's', ye: 'out' }, { t: 0.98, pitch: 385 }, { t: 1.45, fw: 1.7, y: 1.5, pitch: 385, ye: 'out' }, { t: 1.8, fw: 2.0, y: 0, pitch: 360, ye: 'in' }],
  dum: [[1.1, -1.6], [1.8, -0.3], [1.0, 1.0], [2.6, 1.2]],
  fx(A) { const T = A.THREE, tL = 1.15, c = [1.5, 0, 0]; FXk.ring(A, { t: tL + 0.1, at: c, r0: 1.48, r1: 1.95, dur: 0.4, w: 0.12 });
    FXk.ring(A, { t: tL + 0.12, at: c, r0: 1.48, r1: 1.5, dur: 0.6, w: 0.05, op: 0.4, col: A.C.bone });
    [0, 1, 2, 3].forEach((i) => FXa(A, { t: tL, dur: 0.16, from: P3(A.at('nock', tL)), to: { d: i }, len: 1.0, hits: [{ d: i, n: 14 }] }));
    [[0.4, 0.5], [2.2, -1.2], [1.9, 1.6]].forEach(([x, z]) => FXa(A, { t: tL + 0.02, dur: 0.16, from: P3(A.at('nock', tL)), to: [x, 0.05, z], len: 1.0, stick: 0.4 }));
    FXk.dust(A, { t: 1.8, at: () => footAt(A, 1.8), n: 6 });
    A.cap(0.3, 3.4, '冲刺中按散矢：从最高点往下射，覆盖范围 +30%', 'Volley pressed during the dash is shot down from its top and covers 30% more'); } };

DEFS.C12 = { T: 5.0, cam: { x: -0.2, z: -1.2, w: 7.2 }, her: H(-2.0, 0.6, 90), seq: [[0.2, 'idle', { from: 5.15, to: 5.55 }], [0.6, 'run', { loop: true, until: 3.6, speed: 1.15 }], [3.6, 'idle', { from: 0, to: 1.4 }]],
  root: [{ t: 0.6 }, ...circ(0.6, 3.6, 2.0, 1.0)], dum: [[0.0, -1.4]], tail: (t) => t < 0.6 ? 0 : 3,
  fx(A) { FXk.trail(A, { of: 'footL', t0: 0.6, t1: 3.6, len: 0.3, w: 0.1, op: 0.45 }); FXk.trail(A, { of: 'footR', t0: 0.6, t1: 3.6, len: 0.3, w: 0.1, op: 0.45 });
    FXk.ring(A, { t: 0.6, at: 'her', r0: 0.3, r1: 1.2, dur: 0.35, w: 0.15 }); for (let k = 0; k < 5; k++) { const tk = 0.9 + k * 0.55; FXa(A, { t: tk, dur: 0.14, to: { d: 0 }, len: 0.8, hits: [{ d: 0, n: 12 }] }); }
    A.cap(0.6, 4.8, '御风：顺风立刻满 3 层，御风期间不会消退', 'Windrun fills Tailwind to three at once, and it does not run out while Windrun lasts'); } };
