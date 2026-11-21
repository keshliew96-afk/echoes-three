// Rampage 连斩 forms: the Combo climbs, rose after-images trail him (one more each ten Combo), marks stack.
// Each form is its own clip; RA() wraps a base clip, counts every numbered hit for the Combo and draws the count and the trail.
import { FX, C, EASE, clamp, lerp } from './dw.js';
import { DEFS, FORMS, H, D2R, around, comboHud, keysHud, bolt, claw, at3, fan, font } from './defs.js';
const F = FORMS.ra;

// o: def (overrides), base (run the base fx, default true), caps (keep base captions, default true), start (Combo at t 0),
// dbl [t0, t1] (hits count twice), bump [[t, n]], fx (more), trail false
function RA(base, o = {}) {
  const def = { ...base, ...(o.def || {}) };
  def.fx = (A) => {
    const times = []; const h0 = A.hit.bind(A), hud0 = A.hud.bind(A), cap0 = A.cap.bind(A);
    A.hit = (i, t, n, oo) => { if (n != null && !(oo && oo.noCombo)) times.push(t); return h0(i, t, n, oo); };
    A.hud = (fn) => { if (!fn._combo) hud0(fn); };
    if (o.base !== false && base.fx) { if (o.caps === false) A.cap = () => {}; base.fx(A); A.cap = cap0; }
    if (o.fx) o.fx(A);
    A.hit = h0; A.hud = hud0;
    const dbl = o.dbl, bump = o.bump || [], start = o.start != null ? o.start : 10;
    const count = (t) => start + times.reduce((s, h) => s + (h <= t ? (dbl && h >= dbl[0] && h <= dbl[1] ? 2 : 1) : 0), 0) + bump.reduce((s, b) => s + (b[0] <= t ? b[1] : 0), 0);
    hud0(comboHud(count));
    if (o.trail !== false) {
      const hid = (t) => (def.hide || []).some((w) => t >= w[0] && t < w[1]);
      A.ghost((t) => { if (hid(t)) return []; const n = 1 + Math.min(3, Math.floor(count(t) / 10)); const r = A.rootAt(t); const out = [];
        for (let k = 1; k <= n; k++) { const lag = 0.045 * k; if (hid(t - lag)) continue; const q = A.rootAt(t - lag); const mv = Math.hypot(q.x - r.x, q.z - r.z) + Math.abs(q.y - r.y) * 1.5 + Math.abs(q.yaw - r.yaw) * 0.2;
          if (mv < 0.05 && !(o.flurry && o.flurry.some((w) => t >= w[0] && t <= w[1]))) continue; out.push({ lag, op: 0.2 - 0.035 * k, tint: C.rose, col: C.rose, glow: 0.28 }); }
        return out; });
    }
  };
  return def;
}
// a sweep arc in front of him at time t: centre c, radius R, from +deg to -deg
function arc(A, t, c, R, deg, col = C.moon, op = 0.6, y = 0.5) {
  FX.tube(A, { t: t - 0.06, dur: 0.12, hold: 0.05, out: 0.3, flat: true, w: (u) => 0.26 * Math.sin(Math.PI * u), col, op, e: 'out', pts: () => { const T = A.THREE, P = []; const f = A.fwd(t); for (let i = 0; i <= 16; i++) { const a = (deg - 2 * deg * i / 16) * D2R; const yaw = Math.atan2(f.x, f.z) + a; P.push(new T.Vector3(c.x + Math.sin(yaw) * R, y, c.z + Math.cos(yaw) * R)); } return P; } });
}
const cap = (A, a, b, zh, en) => A.cap(a, b, zh, en);

// ---------------------------------------------------------------- passive, basic attack, dash
// P: a kill gives 5 Combo. He claws at Combo 0, then at 30 the same claw plays twice as fast
{ const me = [-1.5, 0.2], d0 = [0, 0.2], d1 = [0.4, -1.0]; const b0 = around(d0, 0, 0.62);
  F.P = RA(DEFS.P, { start: 9, caps: false, bump: [[3.3, 5]], fx(A) {
    cap(A, 0.55, 1.4, '正面：10', 'From the front: 10'); cap(A, 1.65, 2.9, '背刺 +20%：12', 'Backstab +20%: 12'); cap(A, 3.3, 4.9, '击杀：连击 +5', 'A kill: Combo +5'); } });
}
// B: while attack is held the blinks go on: a different foe or side each time, 5 each
{ const me = [-1.1, 0], d0 = [-0.15, 0], d1 = [1.5, -0.6], d2 = [1.2, 0.8]; const t0 = 0.35;
  const s1 = around(d1, 0), s2 = around(d1, 126), s3 = around(d1, -126);
  const hitT = [0.10, 0.24, 0.46, 0.62, 0.78, 0.96].map((x) => x + t0);
  const more = [[d2, 30], [d1, 60], [d2, -120], [d1, 180], [d2, 90]].map(([d, a], k) => ({ d, s: around(d, a), t: t0 + 1.12 + 0.2 * k, i: d === d1 ? 1 : 2, R: k % 2 }));
  const seq = [[t0, 'combo', { to: 1.12 }]]; const root = [{ t: t0 + 0.5 }, { t: t0 + 0.56, x: s1[0], z: s1[1], look: d1, cut: true }, { t: t0 + 0.72, x: s2[0], z: s2[1], look: d1, cut: true }, { t: t0 + 0.89, x: s3[0], z: s3[1], look: d1, cut: true }];
  const hide = [[t0 + 0.5, t0 + 0.56], [t0 + 0.66, t0 + 0.72], [t0 + 0.83, t0 + 0.89]];
  for (const m of more) { seq.push([m.t, m.R ? 'clawL' : 'clawR', { from: 0.06, speed: 1.5, fade: 0.02 }]); root.push({ t: m.t - 0.06 }, { t: m.t, x: m.s[0], z: m.s[1], look: m.d, cut: true }); hide.push([m.t - 0.06, m.t]); }
  const tEnd = more[4].t + 0.26; seq.push([tEnd + 0.06, 'emerge', { from: 0.07 }]); root.push({ t: tEnd }, { t: tEnd + 0.06, x: me[0], z: me[1], look: [5, 0], cut: true }); hide.push([tEnd, tEnd + 0.06]);
  F.B = RA({ T: 3.6, cam: { x: 0.35, z: 0, w: 6.0 }, her: H(me[0], me[1]), seq, root, hide, dum: [d0, d1, d2], fx(A) {
    claw(A, hitT[0], 0, 4, { of: 'handR' }); claw(A, hitT[1], 0, 4, { roll: 0.95, mark: { bend: -0.1 }, of: 'handL' });
    A.hit(0, hitT[2], 6, { big: true }); FX.bite(A, { t: hitT[2], at: { d: 0, y: 0.6 }, size: 0.42 });
    claw(A, hitT[3], 1, 5, { of: 'handR', back: true }); claw(A, hitT[4], 1, 5, { roll: 0.95, mark: { bend: -0.1 }, of: 'handL', back: true });
    claw(A, hitT[5], 1, 8, { big: true, back: true, roll: -0.2, mark: { n: 4, size: 0.62 } });
    const hops = [[0.5, me, s1], [0.66, s1, s2], [0.83, s2, s3]]; for (const [h, a, b] of hops) FX.blink(A, { t: t0 + h, dur: 0.06, from: [a[0], 0.45, a[1]], to: [b[0], 0.45, b[1]], n: 9, size: 1.3 });
    let prev = s3; for (const m of more) { FX.blink(A, { t: m.t - 0.06, dur: 0.06, from: [prev[0], 0.45, prev[1]], to: [m.s[0], 0.45, m.s[1]], n: 8, size: 1.2 }); claw(A, m.t + 0.07, m.i, 5, { back: true, roll: m.R ? 0.95 : -0.95, of: m.R ? 'handL' : 'handR' }); prev = m.s; }
    FX.blink(A, { t: tEnd, dur: 0.06, from: [prev[0], 0.45, prev[1]], to: [me[0], 0.45, me[1]], n: 9, size: 1.3 });
    cap(A, t0 + 1.1, tEnd + 0.1, '按住：一直闪，换敌人或换一边，每下 5', 'Held: the blinks go on, a new foe or side each time, 5 each');
  } }, { start: 0 });
}
// D: the bats claw each foe they pass: 5, and each counts for the Combo
F.D = RA(DEFS.D, { start: 6, def: { dum: [...DEFS.D.dum, [-1.25, 0.2], [-0.45, 0.45]] }, fx(A) {
  [1, 2].forEach((i) => { const t = 0.63 + 0.04 * i; A.hit(i, t, 5); FX.claw(A, { t, at: { d: i, y: 0.62 }, roll: 1.4, n: 3, size: 0.38, life: 0.4 }); });
  cap(A, 0.62, 1.0, '蝙蝠抓过路的敌人：各 5', 'The bats claw each foe they pass: 5'); } });

// ---------------------------------------------------------------- Claw
// F1: left, right, both, each from a deeper crouch: 15, then two more rakes of 6; no knock back
{ const ds = fan(5, 1.0, 70, -70, -1.0, 0.1); const t1 = 0.72, t2 = 1.0, t3 = 1.37;
  F.F1 = RA({ T: 2.6, cam: { x: -0.4, z: 0, w: 5.4 }, her: H(-1.5, 0.1), seq: [[0.3, 'castSweep'], [0.9, 'clawR', { from: 0.05, speed: 1.2 }], [1.25, 'clawBoth', { from: 0.08 }], [1.95, 'cape']], root: [{ t: 0.5 }, { t: 0.72, fw: 0.3, e: 'out' }], dum: ds, fx(A) {
    [[t1, 15, 0.15], [t2, 6, -0.9], [t3, 6, 0.0]].forEach(([t, n, roll], k) => { const c = A.body(t, 0); ds.forEach((p, i) => { A.hit(i, t + 0.012 * (4 - i), n, { big: k === 0 }); FX.claw(A, { t: t + 0.012 * (4 - i), at: { d: i, y: 0.62 + 0.05 * k }, roll: roll + 0.15 * k, n: k === 2 ? 4 : 3, size: 0.48, bend: 0.12 }); });
      arc(A, t, c, 1.1, 75 - 10 * k, k === 2 ? C.rose : C.moon, 0.6); A.shake(t, 0.03 + 0.01 * k, 0.12); FX.dust(A, { t, at: c, n: 4 + 2 * k, sp: 0.8 }); });
    FX.trail(A, { of: 'handR', t0: t1 - 0.12, t1: t3 + 0.1, len: 0.14, w: 0.1 }); FX.trail(A, { of: 'handL', t0: t2 - 0.1, t1: t3 + 0.1, len: 0.14, w: 0.1 });
    cap(A, t2 - 0.05, 2.5, '再扫两下，各 6；不击退', 'Two more rakes of 6; no knock back'); } });
}
// F2: held, the strikes go on up to 2 s more, 3 a strike
{ const ds = [[-0.2, -0.25], [-0.1, 0.45]]; const t0 = 0.3, ext = 1.7;
  const jt = []; for (let i = 0; i < 8; i++) jt.push(t0 + 0.2 + 0.11 * i); for (let s = 0; s < 2; s++) for (let i = 0; i < 8; i++) jt.push(t0 + 1.0 + 0.85 * s + 0.05 + 0.11 * i - 0.0);
  const tX = t0 + 1.27 + ext;
  F.F2 = RA({ T: 2.8 + ext, cam: { x: -0.5, z: 0.1, w: 5.0 }, her: H(-1.25, 0.1), seq: [[t0, 'jabs', { to: 1.0 }], [t0 + 1.0, 'jabs', { from: 0.15, to: 1.0, fade: 0.02 }], [t0 + 1.85, 'jabs', { from: 0.15, to: 1.0, fade: 0.02 }], [t0 + 1.0 + ext, 'jabs', { from: 1.0, fade: 0.02 }], [t0 + 1.6 + ext, 'cape', { from: 0.5 }]],
    root: [{ t: t0 + 1.02 + ext }, { t: t0 + 1.3 + ext, y: 0, jump: 0.55, fw: 0.15 }], dum: ds, fx(A) {
    jt.forEach((t, i) => { const d = i % 2, s = i % 2 ? 'handL' : 'handR'; claw(A, t, d, 3, { roll: (i % 2 ? 0.9 : -0.9) + 0.15 * Math.sin(i * 1.7), size: 0.36, of: s, mark: { life: 0.6, drops: i % 3 === 0 } }); });
    [0, 1].forEach((d) => { A.hit(d, tX, 10, { big: true }); FX.claw(A, { t: tX, at: { d, y: 0.62 }, roll: -0.75, n: 4, size: 0.7, bend: 0.05 }); FX.claw(A, { t: tX + 0.03, at: { d, y: 0.62 }, roll: 0.75, n: 4, size: 0.7, bend: -0.05 }); });
    FX.trail(A, { of: 'handR', t0: tX - 0.1, t1: tX + 0.05, len: 0.12, w: 0.1 }); FX.trail(A, { of: 'handL', t0: tX - 0.1, t1: tX + 0.05, len: 0.12, w: 0.1 }); A.shake(tX, 0.05, 0.18); FX.dust(A, { t: tX + 0.05, at: 'him', n: 6 });
    A.ghost((t) => (t > t0 + 0.15 && t < t0 + 1.02 + ext ? [{ lag: 0.035, op: 0.22, glow: 0.25 }, { lag: 0.07, op: 0.14, glow: 0.2 }] : []));
    cap(A, t0 + 1.0, t0 + 1.0 + ext, '按住：最多再 2 秒，每下 3', 'Held: up to 2 s more, 3 a strike'); } }, { start: 4 });
}
// F3: each turn that hits adds a turn, up to six
{ const ds = [[-1.3, 0.75], [-0.5, -0.75], [0.3, 0.7], [1.1, -0.65]]; const t0 = 0.3, n = 6, t1 = t0 + 0.22 + 0.24 * n;
  F.F3 = RA({ T: 2.0 + 0.24 * n, cam: { x: 0.0, z: 0, w: 6.4 }, her: H(-2.6, 0), seq: [[t0, 'blades', { to: 0.2 }], [t0 + 0.2, 'blades', { from: 0.2, to: 1.0, speed: 0.8 / (t1 - t0 - 0.2) }], [t1, 'blades', { from: 1.0 }], [t1 + 0.1, 'emerge', { from: 0.07 }]],
    root: [{ t: t0 + 0.1 }, { t: t0 + 0.22, y: 0.25, e: 'out' }, { t: t1 - 0.05, fw: 4.6, y: 0.25, spin: -360 * n, e: 'lin' }, { t: t1 + 0.1, fw: 4.8, y: 0, spin: -360 * n, e: 'in' }], dum: ds, fx(A) {
    for (let k = 0; k < n; k++) { const tk = t0 + 0.22 + k * 0.24; FX.ring(A, { t: tk, at: (t) => A.body(t, 0.55), follow: true, r0: 1.2, r1: 1.7, dur: 0.3, w: 0.12, col: k >= 3 ? C.rose : C.moon, op: 0.7 });
      ds.forEach((p, i) => { const r = A.rootAt(tk + 0.1); if (Math.hypot(p[0] - r.x, p[1] - r.z) < 1.7) claw(A, tk + 0.1, i, 6, { size: 0.42, roll: 1.4 + k * 0.3, mark: { n: 3, life: 0.5 } }); }); }
    FX.trail(A, { of: 'tipL', t0: t0 + 0.2, t1: t1, len: 0.1, w: 0.14, op: 0.6, col: C.moon }); FX.trail(A, { of: 'tipR', t0: t0 + 0.2, t1: t1, len: 0.1, w: 0.14, op: 0.6, col: C.moon });
    FX.dust(A, { t: t1 + 0.1, at: 'him', n: 6, dir: [1, 0] }); cap(A, t0 + 0.5, t1 + 0.3, '打中就多转一圈，最多六圈', 'Each turn that hits adds a turn, up to six'); } });
}
// F4: eight air cuts of 3; the foe bounces and he rips it up once more
{ const d0 = [-0.6, 0], d1 = [-0.75, 0.75]; const t0 = 0.3, tS = t0 + 1.6, tL = tS + 0.12, tR2 = t0 + 2.17;
  F.F4 = RA({ T: 4.0, cam: { x: -0.5, z: -0.6, w: 6.0, y: 1.0 }, her: H(-1.5, 0), seq: [[t0, 'rise'], [t0 + 0.5, 'airCuts', { speed: 2 }], [t0 + 0.9, 'airCuts', { speed: 2 }], [t0 + 1.3, 'stomp'], [t0 + 1.95, 'rise'], [t0 + 2.45, 'drift'], [t0 + 3.4, 'idle']],
    root: [{ t: t0 + 0.22 }, { t: t0 + 0.5, y: 1.45, fw: 0.35, e: 'out' }, { t: t0 + 1.3, y: 1.6, fw: 0.42 }, { t: t0 + 1.46, y: 1.9, fw: 0.62, pitch: 360, e: 'io2' }, { t: t0 + 1.62, y: 0.85, fw: 0.6, pitch: 360, e: 'in' }, { t: t0 + 1.95, y: 0.0, fw: 0.45, pitch: 360, e: 's' }, { t: t0 + 2.17 }, { t: t0 + 2.45, y: 1.2, fw: 0.5, e: 'out' }, { t: t0 + 3.3, y: 0, fw: 0.45, e: 's' }], dum: [d0, d1], fx(A) {
    const tR = t0 + 0.22; claw(A, tR, 0, 8, { up: 1.9, roll: 1.4, size: 0.55, of: 'handR' }); claw(A, tR + 0.02, 1, 8, { up: 0.75, roll: 1.4, size: 0.5 }); FX.trail(A, { of: 'handR', t0: tR - 0.12, t1: tR + 0.12, len: 0.18, w: 0.12 }); FX.dust(A, { t: tR, at: 'him', n: 7, sp: 0.9 });
    for (let i = 0; i < 8; i++) { const tc = t0 + 0.5 + 0.1 * i + 0.05; A.hit(0, tc, 3); A.launch(0, tc, 0.06); FX.claw(A, { t: tc, at: at3(A, 0, 0.62), roll: (i % 2 ? 0.9 : -0.9) + 0.1 * i, size: 0.42, follow: true, life: 0.5 }); }
    A.hit(0, tS, null); A.launch(0, tS, -1); FX.trail(A, { of: 'footL', t0: tS - 0.14, t1: tS + 0.02, len: 0.12, w: 0.1, col: C.rose });
    A.hit(0, tL, 10, { big: true }); A.hit(1, tL + 0.02, 10); A.launch(0, tL + 0.02, 0.35); FX.ring(A, { t: tL, at: { d: 0, y: -0.58 }, r0: 0.2, r1: 1.5, dur: 0.45, col: C.moon, op: 0.8 }); FX.dust(A, { t: tL, at: { d: 0, y: -0.6 }, n: 10, sp: 1.4 }); A.shake(tL, 0.08, 0.22);
    claw(A, tR2, 0, 8, { up: 1.3, roll: 1.4, size: 0.6, of: 'handR', col: C.rose }); FX.trail(A, { of: 'handR', t0: tR2 - 0.12, t1: tR2 + 0.12, len: 0.18, w: 0.12, col: C.rose });
    cap(A, t0 + 0.5, t0 + 1.3, '空中八爪，各 3', 'Eight air cuts of 3'); cap(A, tL + 0.1, 3.9, '弹起来：再挑一次', 'It bounces: he rips it up once more'); } }, { start: 6 });
}
// F5: after a kill the next lunge reaches 4 u
{ const d0 = [-0.6, -0.4], d1 = [2.7, 0.35]; const t0 = 0.3, t1 = 1.6; const L1 = [-1.2, -0.4], L2 = [2.1, 0.3];
  F.F5 = RA({ T: 3.4, cam: { x: 0.4, z: 0, w: 6.8 }, her: H(-2.2, -0.4), seq: [[t0, 'dart'], [t0 + 0.7, 'idle'], [t1, 'dart'], [t1 + 0.66, 'lick']],
    root: [{ t: t0 + 0.14 }, { t: t0 + 0.24, pitch: 62, y: 0.25, e: 'out' }, { t: t0 + 0.42, x: L1[0], z: L1[1], pitch: 62, y: 0.25, e: 'lin' }, { t: t0 + 0.6, x: L1[0] + 0.05, z: L1[1], pitch: 0, y: 0, e: 's' },
      { t: t1 - 0.2, x: L1[0] + 0.05, z: L1[1], look: d1 }, { t: t1 + 0.14 }, { t: t1 + 0.24, pitch: 62, y: 0.25, e: 'out' }, { t: t1 + 0.5, x: L2[0], z: L2[1], pitch: 62, y: 0.25, e: 'lin' }, { t: t1 + 0.65, x: L2[0] + 0.1, z: L2[1], pitch: 0, y: 0, e: 'out' }], dum: [d0, d1], fx(A) {
    FX.smoke(A, { t: 0.0, at: { d: 0, y: 0.9 }, n: 8, r: 0.12, h: 0.5, size: 0.14, dur: 0.8, op: 0.5, col: C.blood, col2: C.rose, rise: 0.6, spread: 0.6, out: 0.2 });
    const b1 = t0 + 0.44; A.hit(0, b1, 48, { big: true, fell: true }); FX.bite(A, { t: b1, at: { d: 0, y: 0.6 }, size: 0.7 }); A.shake(b1, 0.06, 0.2);
    const b2 = t1 + 0.52; A.hit(1, b2, 24, { big: true }); FX.bite(A, { t: b2, at: { d: 1, y: 0.6 }, size: 0.55 }); FX.trail(A, { of: 'mouth', t0: t1 + 0.24, t1: b2, len: 0.16, w: 0.16, col: C.rose, op: 0.55 });
    FX.ring(A, { t: b1 + 0.1, at: [L1[0], 0, L1[1]], r0: 0.3, r1: 4.0, dur: 0.6, col: C.rose, op: 0.35, normal: true });
    cap(A, b1 + 0.05, t1 + 0.5, '击杀：下一次扑咬 4 u', 'A kill: the next lunge reaches 4 u'); } }, { start: 8 });
}
// F6: then he springs to the next foe within 3 u: three hits of 4; up to three foes
{ const ds = [[-0.2, 0], [1.0, -0.65], [1.9, 0.5]]; const L = ds.map((p) => [p[0] - 0.55, p[1]]); const t0 = 0.3, tl1 = t0 + 0.6, j2 = 1.75, j3 = 2.55;
  F.F6 = RA({ T: 4.5, cam: { x: 0.1, z: 0, w: 6.4, y: 0.6 }, her: H(-2.4, 0), seq: [[t0, 'pounce'], [tl1, 'maul'], [j2, 'pounce', { from: 0.3 }], [j2 + 0.3, 'maul', { to: 0.5 }], [j3, 'pounce', { from: 0.3 }], [j3 + 0.3, 'maul', { to: 0.5 }], [j3 + 0.8, 'flip'], [j3 + 1.3, 'emerge', { from: 0.07 }]],
    root: [{ t: t0 + 0.14 }, { t: tl1, x: L[0][0], z: L[0][1], y: 0.42, jump: 1.3, e: 'lin' }, { t: j2 }, { t: j2 + 0.3, x: L[1][0], z: L[1][1], y: 0.42, jump: 0.7, e: 'lin' }, { t: j3 }, { t: j3 + 0.3, x: L[2][0], z: L[2][1], y: 0.42, jump: 0.7, e: 'lin' }, { t: j3 + 0.8 }, { t: j3 + 1.25, x: L[2][0] - 1.1, z: L[2][1], y: 0, jump: 0.8, pitch: -360, e: 'lin' }], dum: ds, fx(A) {
    const land = [tl1, j2 + 0.3, j3 + 0.3]; land.forEach((tl, k) => { A.hit(k, tl, null, { big: true }); A.status(k, tl, 'stun', k ? 0.55 : 0.85); FX.dust(A, { t: tl, at: { d: k, y: -0.6 }, n: 6 }); A.shake(tl, 0.04, 0.12);
      const nh = k ? 3 : 5; for (let i = 0; i < nh; i++) { const tc = tl + 0.08 + (k === 0 && i === 4 ? 0.78 : 0.16 * i); claw(A, tc, k, 4, { size: i === 4 ? 0.6 : 0.42, roll: i === 4 ? 0 : i % 2 ? 0.9 : -0.9, y: 0.75, mark: i === 4 ? { n: 4 } : {}, of: i % 2 ? 'handL' : 'handR' }); } });
    cap(A, j2, j3 + 0.8, '跳到 3 u 内下一个敌人：三下各 4，最多三个敌人', 'On to the next foe within 3 u: three hits of 4, up to three foes'); } });
}
// F7: a second snap: four crescents in a fan
{ const ds = [[-0.4, 0.15], [0.9, -0.5], [2.1, 0.6]]; const t0 = 0.3, tC = t0 + 0.44, t2 = t0 + 0.62, tC2 = t2 + 0.44;
  const fly = (A, t, deg, s, R = 0.9) => { const o = A.ahead(t, 0.45, 0.5), e = A.ahead(t, 5.3, 0.5, deg); FX.crescent(A, { t, dur: 0.42, e: 'lin', R, th: 0.22, arc: 2.0, roll: s * 0.6, op: 1, glowOp: 0.7, path: (u) => { const p = o.clone().lerp(e, u); p.y = 0.5 + 0.05 * s * Math.sin(u * 6.28); return p; } }); return [o, e]; };
  F.F7 = RA({ T: 3.0, cam: { x: 0.3, z: 0, w: 6.4 }, her: H(-1.9, 0), seq: [[t0, 'clap', { to: 0.62 }], [t2, 'clap', { speed: 1.0, fade: 0.04 }], [t2 + 1.0, 'idle', { fade: 0.3 }]], dum: ds, fx(A) {
    for (const s of [-1, 1]) { const o = A.ahead(tC, 0.45, 0.5), e = A.ahead(tC, 5.3, 0.5); FX.crescent(A, { t: tC, dur: 0.42, e: 'lin', R: 0.9, th: 0.22, arc: 2.0, roll: s * 0.6, op: 1, glowOp: 0.7, path: (u) => { const p = o.clone().lerp(e, u); p.z += 0.22 * s * Math.cos(u * Math.PI * 2.2); p.y = 0.5 + 0.06 * s * Math.sin(u * 6.28); return p; } }); }
    [-16, -6, 6, 16].forEach((deg, k) => fly(A, tC2, deg, k % 2 ? 1 : -1, 0.8));
    const o = A.ahead(tC, 0.45, 0.5); ds.forEach((p, i) => { const d = Math.hypot(p[0] - o.x, p[1] - o.z), u = d / 4.85; const t1 = tC + 0.42 * u; A.hit(i, t1, 9); FX.claw(A, { t: t1, at: { d: i, y: 0.6 }, roll: 0.45, n: 1, len: 1.4, size: 0.55 });
      const t2b = tC2 + 0.42 * u; A.hit(i, t2b, 9); A.hit(i, t2b + 0.03, 9); FX.claw(A, { t: t2b, at: { d: i, y: 0.64 }, roll: -0.45, n: 1, len: 1.4, size: 0.55 }); FX.claw(A, { t: t2b + 0.03, at: { d: i, y: 0.56 }, roll: 0.2, n: 1, len: 1.4, size: 0.55 }); });
    FX.dust(A, { t: tC, at: A.ahead(tC, 0.4, 0), n: 6, dir: [1, 0], sp: 1.4 }); FX.dust(A, { t: tC2, at: A.ahead(tC2, 0.4, 0), n: 9, dir: [1, 0], sp: 1.8 }); A.shake(tC2, 0.04, 0.14);
    cap(A, t2, 2.9, '再合一次：四道月刃成扇形', 'A second snap: four crescents in a fan'); } });
}
// F8: five dives of 10
{ const ds = [[-0.3, -0.5], [1.0, 0.85], [2.4, -0.6], [2.6, 0.9], [1.1, -0.5]]; const tg = [0, 2, 4, 3, 1]; const t0 = 0.3; const gap = 0.42; const dv = tg.map((_, k) => t0 + 0.75 + gap * k);
  const air = [[-1.6, -0.9], [0.6, -1.4], [3.2, -1.2], [2.0, -1.5], [3.4, 1.2]];
  const seq = [[t0, 'flare'], [t0 + 0.25, 'fly', { loop: true, until: dv[0] - 0.12 }]]; const root = [{ t: t0 + 0.15 }, { t: t0 + 0.55, x: air[0][0], z: air[0][1], y: 1.6, pitch: 25, e: 'out' }];
  dv.forEach((t, k) => { const p = ds[tg[k]], last = k === dv.length - 1; seq.push([t - 0.12, 'streak'], [t + 0.02, last ? 'cape' : 'pull', last ? { from: 0.1 } : {}]);
    root.push({ t: t - 0.12, x: air[k][0] + 0.3, z: air[k][1], y: 1.7, look: p, pitch: 25, roll: 360 * k }, { t, x: p[0] - (last ? 1.05 : 0.3), z: p[1] + (last ? 0.1 : 0), y: last ? 0 : 0.15, pitch: last ? 0 : 70, roll: 360 * k, e: 'in2' });
    if (!last) root.push({ t: t + 0.28, x: air[k + 1][0], z: air[k + 1][1], y: 1.5, pitch: 25, roll: 360 * (k + 1), e: 'out' }); });
  F.F8 = RA({ T: dv[4] + 1.2, cam: { x: 0.8, z: -0.5, w: 7.8, y: 0.9 }, her: H(-1.8, 0), seq, root, dum: ds, fx(A) {
    dv.forEach((t, k) => { const tgt = ds[tg[k]]; ds.forEach((p, i) => { if (Math.hypot(p[0] - tgt[0], p[1] - tgt[1]) <= 1.5) A.hit(i, t + 0.01 * i, 10, { big: i === tg[k] }); });
      FX.claw(A, { t, at: { d: tg[k], y: 0.7 }, roll: k % 2 ? 0.5 : -0.5, n: 4, size: 0.9, bend: 0.14 }); FX.ring(A, { t, at: [tgt[0], 0, tgt[1]], r0: 0.3, r1: 1.5, dur: 0.4, col: C.rose, op: 0.7 }); FX.dust(A, { t, at: [tgt[0], 0, tgt[1]], n: 6, sp: 1.2 }); A.shake(t, 0.05, 0.15);
      FX.trail(A, { of: 'chest', t0: t - 0.12, t1: t, len: 0.12, w: 0.3, col: C.plum, op: 0.6 }); });
    cap(A, t0 + 0.3, dv[4] + 0.1, '五次俯冲，各 10', 'Five dives of 10'); } });
}

// ---------------------------------------------------------------- Blood
// F9: three quick bites of 8, each on the same foe 20% harder than the last
{ const d0 = [-0.55, 0]; const t0 = 0.3, sp = 1.8; const bt = [t0 + 0.46 / sp, t0 + 0.3 + (0.46 - 0.15) / sp, t0 + 0.6 + (0.46 - 0.15) / sp];
  F.F9 = RA({ T: 2.2, cam: { x: -0.6, z: 0, w: 4.8 }, her: H(-1.5, 0), seq: [[t0, 'castPlant', { speed: sp, to: 0.62 }], [t0 + 0.3, 'castPlant', { speed: sp, from: 0.15, to: 0.62, fade: 0.03 }], [t0 + 0.6, 'castPlant', { speed: sp, from: 0.15, fade: 0.03 }]], dum: [d0], fx(A) {
    [8, 10, 12].forEach((n, i) => { A.hit(0, bt[i], n, { big: i === 2 }); FX.bite(A, { t: bt[i], at: { d: 0, y: 0.6 + 0.04 * (i - 1) }, size: 0.42 + 0.08 * i }); A.shake(bt[i], 0.03 + 0.015 * i, 0.12); });
    cap(A, bt[0], 2.1, '三口：8、10、12', 'Three bites: 8, 10, 12'); } });
}
// F10: each hit of his on it adds 0.5 s of bleed, up to 8 s
{ const d0 = [-0.45, 0]; const t0 = 0.3, tV = t0 + 0.44; const cl = [1.25, 1.6, 1.95, 2.3]; const hitT = cl.map((t) => t + 0.15);
  const left = (t) => t < tV ? 0 : Math.max(0, 4 + 0.5 * hitT.filter((h) => h <= t).length - (t - tV));
  F.F10 = RA({ T: 5.6, cam: { x: 0.0, z: 0, w: 5.4 }, her: H(-1.4, 0), seq: [[t0, 'vein', { to: 0.9 }], [cl[0], 'clawR'], [cl[1], 'clawL'], [cl[2], 'clawR'], [cl[3], 'clawL'], [cl[3] + 0.55, 'idle', { fade: 0.2 }]], dum: [d0], fx(A) {
    A.hit(0, tV, 10, { big: true }); FX.claw(A, { t: tV, at: { d: 0, y: 0.62 }, roll: -0.35, n: 1, len: 1.7, wid: 0.03, size: 0.6, open: 0.05, life: 5.0, bend: 0.04 }); A.status(0, tV, 'bleed', 6.0, { rate: 7 });
    hitT.forEach((t, i) => claw(A, t, 0, 4, { roll: i % 2 ? 0.95 : -0.95, of: i % 2 ? 'handL' : 'handR' }));
    for (let k = 1; k <= 12; k++) { const tk = tV + 0.5 * k; if (tk < 5.5) A.hit(0, tk, 3, { col: '#E7A0A8', noCombo: true }); }
    A.post((t, x, W, H2, k, lang) => { const l = left(t); if (l <= 0) return; x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.rose; x.fillText((lang === 'en' ? 'Bleed ' : '流血 ') + l.toFixed(1) + 's', W - 14 * k, 52 * k); });
    cap(A, cl[0], 3.4, '每打一下，流血 +0.5 秒，最多 8 秒', 'Each hit adds 0.5 s of bleed, up to 8 s'); } });
}
// F11: three thin lances one after another: 6 each
{ const ds = [[-0.2, 0.05], [1.2, -0.1], [2.6, 0.1]]; const t0 = 0.3, tT = t0 + 0.7; const tl = [tT, tT + 0.22, tT + 0.44];
  F.F11 = RA({ T: 2.8, cam: { x: 0.4, z: 0, w: 6.6 }, her: H(-1.7, 0), seq: [[t0, 'lance', { to: 0.78 }], [tl[1] - 0.12, 'clawR', { from: 0.03, speed: 1.4, fade: 0.03 }], [tl[2] - 0.12, 'clawL', { from: 0.03, speed: 1.4, fade: 0.03 }], [tl[2] + 0.3, 'idle', { fade: 0.25 }]], dum: ds, fx(A) {
    const T = A.THREE; FX.drops(A, { t: t0 + 0.24, at: (t) => A.at('mouth', t), n: 5, sp: 0.4, up: 0.2, size: 0.035 }); FX.thread(A, { t0: t0 + 0.4, t1: tT - 0.02, from: (t) => A.at('handR', t), to: (t) => A.at('handL', t), w: 0.03, grow: 0.15, per: 0.25 });
    tl.forEach((t1, k) => { const o = A.ahead(t1, 0.5, 0.55 + 0.06 * (k - 1)), e = A.ahead(t1, 6.2, 0.55 + 0.06 * (k - 1), (k - 1) * 3); const lm = A.add(new T.Mesh(A.streakGeo, A.mat(C.blood, A.F.STREAK))); const gl = A.add(new T.Mesh(A.streakGeo, A.mat(C.rose, A.F.STREAK)));
      A.fx((t) => { const a = t - t1, d = 0.25; const on = a >= 0 && a < d + 0.12; lm.visible = gl.visible = on; if (!on) return; const u = clamp(a / d); const p = o.clone().lerp(e, EASE.out2(u)), q = o.clone().lerp(e, Math.max(0, EASE.out2(u) - 0.14));
        for (const [m, w, op] of [[lm, 0.115, 1], [gl, 0.38, 0.45]]) { m.position.copy(q); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); m.scale.set(w, w, p.distanceTo(q) + 1e-3); m.material.uniforms.op.value = op * (a > d ? 1 - (a - d) / 0.12 : 1); } });
      ds.forEach((p, i) => { const u = (p[0] - o.x) / (e.x - o.x), th = t1 + 0.25 * Math.pow(u, 0.8) * 0.75; A.hit(i, th, 6); FX.claw(A, { t: th, at: { d: i, y: 0.55 + 0.06 * k }, roll: 1.5, n: 1, len: 0.9, size: 0.42 }); }); });
    cap(A, tT, 2.7, '三支细血枪，各 6', 'Three thin lances, 6 each'); } });
}
// F12: the swarm flies with him 5 s: after each of his hits a bat bites that foe: 2
{ const ds = [[0.6, -0.35], [1.0, 0.5]]; const t0 = 0.3; const cl = [1.3, 1.75, 2.2, 2.65, 3.1]; const hitT = cl.map((t) => t + 0.15);
  F.F12 = RA({ T: 4.2, cam: { x: -0.2, z: 0, w: 6.0 }, her: H(-1.9, 0), seq: [[t0, 'flare'], [t0 + 0.5, 'run', { loop: true, until: cl[0] }], ...cl.map((t, i) => [t, i % 2 ? 'clawL' : 'clawR']), [cl[4] + 0.55, 'idle', { fade: 0.2 }]],
    root: [{ t: t0 + 0.5 }, { t: cl[0], fw: 1.95, e: 's' }], dum: ds, fx(A) {
    FX.swarm(A, { t0: t0 + 0.2, t1: 4.2, at: (t) => A.body(t, 0.55), r: 0.55, n: 12, h: 0.35, w: 3.4, both: true, size: 1.3 });
    hitT.forEach((t, i) => { const d = i % 2 ? 1 : 0; claw(A, t, d, 4, { roll: i % 2 ? 0.95 : -0.95, of: i % 2 ? 'handL' : 'handR' }); FX.blink(A, { t: t + 0.03, dur: 0.12, from: A.body(t, 0.75), to: A.dpt(d, t, 0.8), n: 2, size: 1.3, puff: false }); A.hit(d, t + 0.16, 2, { col: '#E7A0A8' }); });
    cap(A, t0 + 0.4, 4.1, '蝠群跟着他 5 秒：他每打一下，补一口 2', 'The swarm flies with him 5 s: after each of his hits a bat bites for 2'); } }, { start: 8 });
}
// F13: three short rows in a fan, 3 u, one after another: 8 each
{ const ds = [[0.6, -0.95], [0.9, 0.1], [0.6, 1.05]]; const t0 = 0.3; const st = [t0, t0 + 0.42, t0 + 0.84]; const ang = [25, 0, -25];
  F.F13 = RA({ T: 2.6, cam: { x: -0.2, z: 0, w: 6.0 }, her: H(-1.5, 0), seq: [[st[0], 'floorStab', { to: 0.5, speed: 1.2 }], [st[1], 'floorStab', { from: 0.08, to: 0.5, speed: 1.2, fade: 0.03 }], [st[2], 'floorStab', { from: 0.08, speed: 1.2, fade: 0.03 }]], dum: ds, fx(A) {
    st.forEach((s, j) => { const tS = s + (j ? (0.36 - 0.08) : 0.36) / 1.2; const o = A.ahead(tS, 0.45, 0), f = A.fwd(tS, ang[j]); A.shake(tS, 0.04, 0.14); FX.ring(A, { t: tS, at: o, r0: 0.1, r1: 0.5, dur: 0.25, col: C.blood, op: 0.7, normal: true });
      for (let i = 0; i < 8; i++) { const u = i / 7, d = 0.15 + u * 2.85, ts = tS + 0.02 + u * 0.2; for (const sg of [-1, 1]) { const sx = (i % 2 ? 0.14 : 0.22) * sg; FX.spike(A, { t: ts, at: [o.x + f.x * d - f.z * sx, 0, o.z + f.z * d + f.x * sx], h: 0.3 + 0.4 * u, w: 0.7 + 0.4 * u, life: 0.6, tilt: [0, sg * 0.25], burst: i % 3 === 0 }); } }
      A.hit(j, tS + 0.18, 8, { up: 0.5 }); });
    cap(A, st[1], 2.5, '三行扇形血棘，3 u，各 8', 'Three short rows in a fan, 3 u: 8 each'); } });
}
// F14: the Combo cannot fall in the mist; he gathers in a claw spin: 10 within 1.6 u
{ const b = DEFS.F14; const t0 = 0.3, t1 = t0 + 0.16, t2 = t1 + 1.5;
  F.F14 = RA(b, { start: 14, def: { T: 3.6, seq: [[t0, 'wrap'], [t2, 'clawBoth', { from: 0.05 }], [t2 + 0.55, 'cape', { from: 0.1 }]], root: [{ t: t1 }, { t: t2, fw: 2.1, e: 'lin' }, { t: t2 + 0.3, fw: 2.1, spin: -360, e: 'out' }] }, fx(A) {
    const tS = t2 + 0.15; const c = A.body(tS, 0); FX.ring(A, { t: tS, at: c, r0: 0.3, r1: 1.6, dur: 0.4, col: C.rose, op: 0.8 }); arc(A, tS, c, 1.0, 175, C.moon, 0.55);
    b.dum.forEach((p, i) => { if (Math.hypot(p[0] - c.x, p[1] - c.z) < 1.7) claw(A, tS + 0.02 * i, i, 10, { roll: 1.2 + 0.4 * i, size: 0.5, mark: { n: 4 } }); });
    cap(A, t2, 3.5, '雾里连击不掉；出雾一记旋爪：10', 'The Combo holds in the mist; he gathers in a claw spin: 10'); } });
}
// F15: each kill adds 1 s, up to 10 s
{ const b = DEFS.F15; const t0 = 0.3, tA = t0 + 1.05, sp = 1.4; const tk = tA + 0.62 / sp + 0.46 / sp;
  F.F15 = RA(b, { start: 4, fx(A) { A.hit(2, tk + 0.06, null, { fell: true }); FX.ring(A, { t: tk + 0.1, at: 'him', r0: 0.3, r1: 1.0, dur: 0.4, col: C.rose, op: 0.7 });
    A.post((t, x, W, H2, k, lang) => { if (t < t0 + 0.42) return; const l = Math.max(0, 5 - (t - t0 - 0.42) + (t >= tk ? 1 : 0)); x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = t >= tk && t < tk + 0.6 ? C.rose : C.parch; x.fillText((lang === 'en' ? 'Boil ' : '血沸 ') + l.toFixed(1) + 's', W - 14 * k, 52 * k); });
    cap(A, tk + 0.05, 3.3, '击杀：+1 秒，最多 10 秒', 'A kill: +1 s, up to 10 s'); } });
}
// F16: the moon hangs 4 s: under it each hit counts twice for the Combo, and the Combo cannot fall
{ const ds = fan(6, 1.9, 0, 300, -0.3, 0); const t0 = 0.3, tC = t0 + 1.15, tE = tC + 4.0; const cl = [2.2, 2.65, 3.1, 3.55, 4.0];
  F.F16 = RA({ T: tE + 0.6, cam: { x: -0.3, z: -0.2, w: 7.0, y: 0.9 }, her: H(-0.3, 0), seq: [[t0, 'moonRise'], [cl[0] - 0.4, 'idle', { fade: 0.2 }], ...cl.map((t, i) => [t, i % 2 ? 'clawL' : 'clawR'])],
    root: [{ t: t0 + 0.2 }, { t: t0 + 0.9, y: 0.7, e: 'out' }, { t: tC, y: 0.75 }, { t: tC + 0.25, y: 0, e: 'in' }, { t: cl[0] - 0.3 }, { t: cl[0], x: ds[0][0] - 0.65, z: ds[0][1], e: 's' }], dum: ds, fx(A) {
    FX.moon(A, { t0: t0 + 0.3, t1: tE, at: (t) => { const r = A.rootAt(Math.min(t, tC + 0.3)); return [r.x, 1.9 + r.y * 0.4, r.z - 1.0]; }, r: 0.85, grow: 0.8, op: 0.92 });
    A.dark(tC - 0.05, tC + 0.15, 0.55, 0.05, 0.4, { eyes: false }); A.shake(tC, 0.07, 0.25);
    FX.ring(A, { t: tC + 0.02, at: [-0.3, 0, 0], r0: 0.3, r1: 2.4, dur: 0.5, col: C.blood, op: 0.9, w: 0.25, normal: true });
    ds.forEach((p, i) => A.hit(i, tC + 0.1 + 0.015 * i, 30, { big: true, blind: 1.5 }));
    cl.forEach((t, i) => claw(A, t + 0.15, 0, 4, { roll: i % 2 ? 0.95 : -0.95, of: i % 2 ? 'handL' : 'handR' }));
    cap(A, tC + 0.6, tE, '月下：每一下算两次连击，连击不掉', 'Under the moon: each hit counts twice, the Combo holds'); } }, { start: 6, dbl: [tC, tE] });
}

// ---------------------------------------------------------------- Night
// F17: a dive that hits can be pressed again within 1.5 s: up to three dives, 12 after the first
{ const cs = [[-0.6, 0], [1.0, -0.6], [2.2, 0.5]]; const ds = [[-0.6, 0.55], [-0.6, -0.55], [1.55, -0.6], [2.2, 1.05], [2.65, 0.2]]; const t0 = 0.3; const tL = [t0 + 0.56, t0 + 1.0, t0 + 1.44];
  F.F17 = RA({ T: 2.9, cam: { x: 0.3, z: 0, w: 6.8, y: 0.6 }, her: H(-2.6, 0), seq: [[t0, 'dive'], [tL[0] + 0.0, 'dive', { from: 0.12, fade: 0.03 }], [tL[1], 'dive', { from: 0.12, fade: 0.03 }], [tL[2] + 0.1, 'emerge', { from: 0.07 }]],
    root: [{ t: t0 + 0.12 }, { t: tL[0], x: cs[0][0], z: cs[0][1], y: 0, jump: 1.2, e: 'lin' }, { t: tL[1], x: cs[1][0], z: cs[1][1], y: 0, jump: 0.8, look: cs[2], e: 'lin' }, { t: tL[2], x: cs[2][0], z: cs[2][1], y: 0, jump: 0.8, e: 'lin' }], dum: ds, fx(A) {
    tL.forEach((t, k) => { const c = cs[k]; ds.forEach((p, i) => { if (Math.hypot(p[0] - c[0], p[1] - c[1]) <= 1.2) A.hit(i, t + 0.01 * i, k ? 12 : 16, { knock: [(p[0] - c[0]) * 0.25, (p[1] - c[1]) * 0.25] }); });
      FX.ring(A, { t, at: 'him', r0: 0.2, r1: 1.2, dur: 0.4, col: C.rose, op: 0.8 }); FX.dust(A, { t, at: 'him', n: 9, sp: 1.3 }); A.shake(t, 0.05, 0.16); });
    FX.trail(A, { of: 'chest', t0: t0 + 0.4, t1: tL[2], len: 0.14, w: 0.3, col: C.plum, op: 0.5 });
    cap(A, tL[0], 2.8, '打中后 1.5 秒内再按：最多三次，之后各 12', 'A hit lets him dive again within 1.5 s: up to three, 12 after the first'); } });
}
// F18: three blinks: three foes, or three sides of one: 9 each; three after-images fading
{ const ds = [[0.2, -0.7], [1.5, 0.1], [0.4, 0.8]]; const t0 = 0.3; const tb = [t0 + 0.2, t0 + 0.42, t0 + 0.64]; const sp = ds.map((d) => around(d, 0, 0.7));
  const root = [{ t: tb[0] }]; const hide = []; const seq = [[t0, 'standFace']];
  tb.forEach((t, k) => { root.push({ t: t + 0.06, x: sp[k][0], z: sp[k][1], look: ds[k], cut: true }); if (k < 2) root.push({ t: tb[k + 1] }); hide.push([t, t + 0.06]); seq.push([t + 0.06, 'stab', { fade: 0.02, speed: k < 2 ? 1.4 : 1 }]); });
  F.F18 = RA({ T: 2.6, cam: { x: 0.2, z: 0, w: 5.8 }, her: H(-2.0, 0), seq, root, hide, dum: ds, fx(A) {
    let prev = A.body(tb[0] - 0.02); tb.forEach((t, k) => { FX.blink(A, { t, dur: 0.06, from: prev, to: [sp[k][0], 0.45, sp[k][1]], n: 8 }); prev = [sp[k][0], 0.45, sp[k][1]]; const tS = t + 0.1; claw(A, tS, k, 9, { back: true, roll: 1.3, mark: { n: 1, len: 1.2, wid: 0.045, size: 0.55 } }); FX.spark(A, { t: tS, at: { d: k, y: 0.6 }, r: 0.5, col: C.moon }); });
    A.ghost((t) => tb.slice(0, 2).map((tt, k) => { const a = t - (tb[k + 1]); return a >= 0 && a < 0.5 ? { at: tb[k + 1] - 0.01, op: 0.4 * (1 - a / 0.5), tint: C.rose, col: C.rose, glow: 0.4 } : null; }).filter(Boolean));
    cap(A, tb[0], 2.5, '闪三次：三个敌人或一个敌人的三面，各 9', 'Three blinks: three foes, or three sides of one: 9 each'); } }, { trail: false });
}
// F19: he throws two crescents as he leaves: 8 each
F.F19 = RA(DEFS.F19, { start: 12, fx(A) { const t0 = 0.4, tc = t0 + 0.14;
  for (const s of [-1, 1]) { const o = A.ahead(tc, 0.3, 0.6), e = A.ahead(tc, 3.0, 0.5, s * 14); FX.crescent(A, { t: tc, dur: 0.3, e: 'lin', R: 0.6, th: 0.16, arc: 1.9, roll: s * 0.5, op: 1, glowOp: 0.6, path: (u) => o.clone().lerp(e, u) }); }
  A.hit(0, tc + 0.08, 8); A.hit(0, tc + 0.11, 8); FX.claw(A, { t: tc + 0.08, at: { d: 0, y: 0.62 }, roll: 0.45, n: 1, len: 1.2, size: 0.5 }); FX.claw(A, { t: tc + 0.11, at: { d: 0, y: 0.58 }, roll: -0.45, n: 1, len: 1.2, size: 0.5 });
  cap(A, t0, t0 + 0.3, '离开时甩出两道月刃：各 8', 'Two crescents as he leaves: 8 each'); } });
// F20: in the dark he cuts each blinded foe once: 6; rose claw marks light up one after another
F.F20 = RA(DEFS.F20, { start: 8, fx(A) { const tC = 0.9; for (let i = 0; i < 6; i++) { const t = tC + 0.45 + 0.13 * i; claw(A, t, i, 6, { back: true, roll: 1.2 - 0.4 * (i % 3), size: 0.5, mark: { n: 3 }, col: C.rose }); }
  cap(A, tC + 0.45, 2.8, '黑暗中给每个致盲的敌人一爪：6', 'In the dark he cuts each blinded foe once: 6'); } });
// F21: the echo comes back: it hits them again from behind for half
F.F21 = RA(DEFS.F21, { start: 6, fx(A) { const tC = 0.72, tB = tC + 0.42; const f = A.fwd(tC); const o = A.at('mouth', tC);
  for (let k = 0; k < 2; k++) FX.crescent(A, { t: tB + 0.07 * k, dur: 0.34, e: 'in', R: 0.55, th: 0.07, arc: 1.25, glow: C.moon, col: k % 2 ? C.rose : C.moon, op: 0.75, path: (u) => { const r = 2.7 - 2.2 * u; return new A.THREE.Vector3(o.x + f.x * r, o.y - 0.1, o.z + f.z * r); } });
  [0, 1, 2].forEach((i) => { A.hit(i, tB + 0.12, 5, { col: C.rose }); FX.claw(A, { t: tB + 0.12, at: { d: i, y: 0.6 }, back: true, n: 2, size: 0.4, roll: 1.4 }); });
  cap(A, tB, 1.95, '回声弹回来：从背后再打一半：5', 'The echo comes back: from behind, for half: 5'); } });
// F22: no shield: the next three hits on him within 3 s miss, and each miss is answered with a claw: 8
{ const ds = [[-0.4, 0.4], [-0.35, -0.5], [1.8, 0.2]]; const t0 = 0.3, tC = t0 + 0.2; const hits = [tC + 0.8, tC + 1.5, tC + 2.2];
  F.F22 = RA({ T: 3.8, cam: { x: -0.4, z: 0, w: 5.6 }, her: H(-1.1, 0), seq: [[t0, 'wrap'], [t0 + 0.32, 'emerge', { from: 0.05 }], ...hits.map((h, k) => [h - 0.05, k % 2 ? 'clawL' : 'clawR', { from: 0.05, speed: 1.3 }])], dum: ds, fx(A) {
    FX.smoke(A, { t: tC, at: A.body(tC, 0), n: 14, r: 0.9, h: 0.6, size: 0.4, dur: 0.6, op: 0.6 }); [0, 1].forEach((i) => A.hit(i, tC + 0.06, 8));
    A.ghost((t) => { if (t < tC || t > tC + 3.0) return []; const r = A.rootAt(t); const fl = (s) => 0.25 + 0.12 * Math.sin(t * 31 + s); return [-1, 0, 1].map((s) => ({ root: { x: r.x + 0.22 * s * Math.cos(r.yaw), z: r.z - 0.22 * s * Math.sin(r.yaw) + 0.05 * (s === 0 ? -1 : 0), y: 0, yaw: r.yaw, pitch: 0, roll: 0 }, op: fl(s * 2), tint: C.rose, col: C.rose, glow: 0.35 })); });
    hits.forEach((h, k) => { bolt(A, { t: h - 0.4, d: 2, dur: 0.4, to: (() => { const p = A.body(h, 0.6); return [p.x - 0.55, p.y, p.z + 0.2 * (k - 1)]; })() }); claw(A, h + 0.06, 2, 8, { roll: [1.2, -0.9, 0.2][k], size: 0.5, mark: { n: 3 }, col: C.rose }); FX.blink(A, { t: h, dur: 0.1, from: A.body(h, 0.5), to: A.dpt(2, h + 0.1, 0.6), n: 3, size: 1.1, puff: false }); });
    A.post((t, x, W, H2, k, lang) => { const n = hits.filter((h) => h <= t).length; if (t < tC || t > tC + 3.0) return; x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.moon; x.fillText((lang === 'en' ? 'Misses left ' : '闪避剩 ') + (3 - n), W - 14 * k, 52 * k); });
    cap(A, tC + 0.1, tC + 3.0, '没有护盾：3 秒内三次攻击打空，每次回一爪：8', 'No shield: three hits on him miss within 3 s, each answered with a claw: 8'); } }, { trail: false });
}
// F23: while it hangs, the shade copies his basic claws at the foes within 1.5 u of it, for a third
{ const b = DEFS.F23; F.F23 = RA(b, { start: 8, def: { dum: [...b.dum, [-1.2, 0.85]] }, fx(A) {
  [1.65, 2.2].forEach((t, k) => { A.hit(2, t + 0.02, 3, { col: '#C9B6D6' }); FX.claw(A, { t: t + 0.02, at: { d: 2, y: 0.62 }, roll: k ? 0.95 : -0.95, n: 3, size: 0.4, pal: 'rose', life: 0.5 }); });
  cap(A, 1.6, 2.6, '影子跟着出爪，三分之一：3', 'The shade copies his claws for a third: 3'); } });
}
// F24: each hit on it adds 0.2 s to the mark, up to 5 s
{ const d0 = [0.6, 0]; const t0 = 0.3, tS = t0 + 0.4, b = around(d0, 0, 0.55), tUp = tS + 0.35; const n = 9;
  const hits = Array.from({ length: n }, (_, i) => [tUp + 0.4 + 0.42 * i, i ? 6 : 12]); const tear = tUp + 0.4 + 3.0 + 0.2 * (n - 1);
  const seq = [[t0, 'sink'], [tUp, 'riseBehind']]; hits.slice(1).forEach(([t], i) => seq.push([t - 0.15, i % 2 ? 'clawL' : 'clawR', { speed: 1.3 }])); seq.push([tear - 0.2, 'cape']);
  F.F24 = RA({ T: tear + 1.1, cam: { x: 0.3, z: 0, w: 5.6 }, her: H(-1.6, 0), seq,
    root: [{ t: t0 + 0.1 }, { t: tS, y: -1.0, e: 'in' }, { t: tS + 0.01, x: b[0], z: b[1], y: -1.0, look: d0, cut: true }, { t: tUp + 0.25, x: b[0], z: b[1], y: 0, e: 'out' }], hide: [[tS, tS + 0.05]], dum: [d0], fx(A) {
    FX.disc(A, { t: t0 + 0.05, at: [-1.6, 0, 0], r0: 0.3, r1: 0.7, dur: 0.6, col: C.ink, op: 0.9, normal: true }); FX.smoke(A, { t: tUp - 0.05, at: [b[0], 0, b[1]], n: 12, r: 0.25, h: 0.6, size: 0.35, dur: 0.7, op: 0.6 });
    const bright = (t) => Math.min(1, hits.filter((h) => h[0] <= t).length * 0.12);
    FX.sigil(A, { t0: hits[0][0], t1: tear, at: (t) => { const p = A.dpt(0, t, 0.72); return [p.x + 0.29, p.y, p.z]; }, r: 0.26, op: 0.8, bright });
    hits.forEach(([t, nn], i) => claw(A, t, 0, nn, { back: true, roll: [-0.4, -0.95, 0.95, 0.1, -0.6, 0.6][i % 6], size: 0.45, col: C.rose }));
    const stored = Math.round(0.35 * hits.reduce((s, h) => s + h[1], 0));
    for (let i = 0; i < 4; i++) FX.claw(A, { t: tear + 0.02 * i, at: { d: 0, y: 0.62 }, roll: [-0.4, -0.95, 0.95, 0.1][i], n: 4, size: 0.62, pal: 'rose', life: 0.8 });
    A.hit(0, tear, stored, { big: true, col: C.moon, noCombo: true }); FX.ring(A, { t: tear, at: { d: 0, y: -0.58 }, r0: 0.2, r1: 1.3, dur: 0.5, col: C.rose, op: 0.8 }); A.shake(tear, 0.07, 0.22);
    A.post((t, x, W, H2, k, lang) => { if (t < hits[0][0] || t > tear + 0.6) return; const m = hits.filter((h) => h[0] <= t).length; const nn = Math.round(0.35 * hits.filter((h) => h[0] <= t).reduce((s, h) => s + h[1], 0)); const len = 3.0 + 0.2 * Math.max(0, m - 1); const left = Math.max(0, hits[0][0] + len - t);
      x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.rose; x.fillText((lang === 'en' ? 'Mark ' : '死兆 ') + nn + (left > 0 ? '  ' + left.toFixed(1) + 's' : ''), W - 14 * k, 52 * k); });
    cap(A, hits[1][0], tear - 0.05, '每打一下，印记 +0.2 秒，最多 5 秒', 'Each hit adds 0.2 s to the mark, up to 5 s'); cap(A, tear, tear + 1.0, '撕开：' + stored, 'It tears: ' + stored); } }, { start: 6 });
}

// ================================================================ Kesh's picks (19 Nov, "use those"): these replace the forms above (R5a to R8a, DUSKWING_NEW_OPTIONS.md)
// each is shown beside the passed form; the passed form above is unchanged. Each makes the Combo show on the card.
const N = FORMS.ra2;
// R5a F11: three lances, each stronger than the last: 6, 8, 10
{ const ds = [[-0.2, 0.05], [1.2, -0.1], [2.6, 0.1]]; const t0 = 0.3, tT = t0 + 0.7; const tl = [tT, tT + 0.24, tT + 0.5]; const dmg = [6, 8, 10];
  N.F11 = RA({ T: 3.0, cam: { x: 0.4, z: 0, w: 6.6 }, her: H(-1.7, 0), seq: [[t0, 'lance', { to: 0.78 }], [tl[1] - 0.12, 'clawR', { from: 0.03, speed: 1.4, fade: 0.03 }], [tl[2] - 0.14, 'clawBoth', { from: 0.03, speed: 1.3, fade: 0.03 }], [tl[2] + 0.4, 'idle', { fade: 0.25 }]], dum: ds, keepClaws: true, fx(A) {
    const T = A.THREE; FX.drops(A, { t: t0 + 0.24, at: (t) => A.at('mouth', t), n: 5, sp: 0.4, up: 0.2, size: 0.035 }); FX.thread(A, { t0: t0 + 0.4, t1: tT - 0.02, from: (t) => A.at('handR', t), to: (t) => A.at('handL', t), w: 0.03, grow: 0.15, per: 0.25 });
    tl.forEach((t1, k) => { const g = 1 + 0.45 * k; const o = A.ahead(t1, 0.5, 0.55 + 0.06 * (k - 1)), e = A.ahead(t1, 6.2, 0.55 + 0.06 * (k - 1), (k - 1) * 3); const lm = A.add(new T.Mesh(A.streakGeo, A.mat(C.blood, A.F.STREAK))); const gl = A.add(new T.Mesh(A.streakGeo, A.mat(C.rose, A.F.STREAK)));
      A.fx((t) => { const a = t - t1, d = 0.25; const on = a >= 0 && a < d + 0.12; lm.visible = gl.visible = on; if (!on) return; const u = clamp(a / d); const p = o.clone().lerp(e, EASE.out2(u)), q = o.clone().lerp(e, Math.max(0, EASE.out2(u) - 0.14 * g));
        for (const [m, w, op] of [[lm, 0.115 * g, 1], [gl, 0.38 * g, 0.45]]) { m.position.copy(q); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); m.scale.set(w, w, p.distanceTo(q) + 1e-3); m.material.uniforms.op.value = op * (a > d ? 1 - (a - d) / 0.12 : 1); } });
      FX.ring(A, { t: t1, at: o, r0: 0.05, r1: 0.18 + 0.12 * k, dur: 0.22, col: C.rose, op: 0.7, dir: [e.x - o.x, e.y - o.y, e.z - o.z] }); if (k === 2) A.shake(t1, 0.05, 0.15);
      ds.forEach((p, i) => { const u = (p[0] - o.x) / (e.x - o.x), th = t1 + 0.25 * Math.pow(u, 0.8) * 0.75; A.hit(i, th, dmg[k], { big: k === 2 && i === 0 }); FX.claw(A, { t: th, at: { d: i, y: 0.55 + 0.06 * k }, roll: 1.5, n: 1, len: 0.9 + 0.25 * k, size: 0.42 + 0.08 * k }); }); });
    cap(A, tT, 2.9, '三支血枪，一支比一支强：6、8、10', 'Three lances, each stronger than the last: 6, 8, 10'); } });
}
// R5b F18: one blink, plus one for every 10 Combo, up to four; a new foe each time while there is one: 9 each (shown at 31 Combo: four blinks)
{ const ds = [[0.2, -0.7], [1.5, 0.1], [0.4, 0.8], [1.9, -0.95]]; const t0 = 0.5; const tb = [0, 1, 2, 3].map((k) => t0 + 0.2 + 0.22 * k); const sp = ds.map((d) => around(d, 0, 0.7));
  const root = [{ t: tb[0] }]; const hide = []; const seq = [[t0, 'standFace']];
  tb.forEach((t, k) => { root.push({ t: t + 0.06, x: sp[k][0], z: sp[k][1], look: ds[k], cut: true }); if (k < 3) root.push({ t: tb[k + 1] }); hide.push([t, t + 0.06]); seq.push([t + 0.06, 'stab', { fade: 0.02, speed: k < 3 ? 1.4 : 1 }]); });
  N.F18 = RA({ T: 2.9, cam: { x: 0.3, z: -0.1, w: 6.0 }, her: H(-2.0, 0), seq, root, hide, dum: ds, fx(A) {
    // the Combo picks the count: a pip for each blink
    A.post((t, x, W, H2, k, lang) => { if (t > tb[3] + 0.8) return; const n = 1 + Math.min(3, Math.floor(31 / 10)); for (let j = 0; j < 4; j++) { const on = j < n, used = t >= tb[j]; x.beginPath(); x.arc(W - 22 * k - 18 * k * (3 - j), 50 * k, 6 * k, 0, 6.283); x.fillStyle = !on ? 'rgba(60,40,52,0.6)' : used ? 'rgba(224,80,158,0.35)' : C.rose; x.fill(); } x.font = font(k, 13); x.textAlign = 'right'; x.fillStyle = '#F6ECEE'; x.fillText(lang === 'en' ? 'Blinks' : '闪', W - 22 * k - 18 * k * 4, 54 * k); });
    let prev = A.body(tb[0] - 0.02); tb.forEach((t, k) => { FX.blink(A, { t, dur: 0.06, from: prev, to: [sp[k][0], 0.45, sp[k][1]], n: 8 }); prev = [sp[k][0], 0.45, sp[k][1]]; const tS = t + 0.1; claw(A, tS, k, 9, { back: true, roll: 1.3, mark: { n: 1, len: 1.2, wid: 0.045, size: 0.55 } }); FX.spark(A, { t: tS, at: { d: k, y: 0.6 }, r: 0.5, col: C.moon }); });
    A.ghost((t) => tb.slice(0, 3).map((tt, k) => { const a = t - (tb[k + 1]); return a >= 0 && a < 0.5 ? { at: tb[k + 1] - 0.01, op: 0.4 * (1 - a / 0.5), tint: C.rose, col: C.rose, glow: 0.4 } : null; }).filter(Boolean));
    cap(A, 0.1, tb[0], '一闪，每 10 连击多一闪，最多四闪', 'One blink, plus one for every 10 Combo, up to four'); cap(A, tb[0], 2.8, '连击 31：四闪，每次换一个敌人，各 9', '31 Combo: four blinks, a new foe each time, 9 each'); } }, { start: 31, trail: false });
}
// R6a F16: the moon hangs 4 s as passed; when it sets it crashes: 1 for each Combo point, up to 40, to every foe within 2.4 u; he keeps the Combo
{ const ds = fan(6, 1.9, 0, 300, -0.3, 0); const t0 = 0.3, tC = t0 + 1.15, tE = tC + 4.0, tX = tE + 0.35; const cl = [2.2, 2.65, 3.1, 3.55, 4.0];
  const st = [ds[0][0] - 0.65, ds[0][1]], X = [st[0], st[1]]; const n = 6 + 2 * (ds.length + cl.length);
  N.F16 = RA({ T: tX + 1.2, cam: { x: -0.3, z: -0.2, w: 7.4, y: 0.9 }, her: H(-0.3, 0), seq: [[t0, 'moonRise'], [cl[0] - 0.4, 'idle', { fade: 0.2 }], ...cl.map((t, i) => [t, i % 2 ? 'clawL' : 'clawR']), [tE - 0.1, 'flip', { fade: 0.05 }], [tE + 0.4, 'cape', { from: 0.06 }]],
    root: [{ t: t0 + 0.2 }, { t: t0 + 0.9, y: 0.7, e: 'out' }, { t: tC, y: 0.75 }, { t: tC + 0.25, y: 0, e: 'in' }, { t: cl[0] - 0.3 }, { t: cl[0], x: st[0], z: st[1], e: 's' }, { t: tE - 0.1 }, { t: tE + 0.35, x: st[0] - 1.2, z: st[1] + 0.2, look: ds[0], e: 'out' }], dum: ds, keepClaws: true, fx(A) {
    const m0 = A.rootAt(tC + 0.3), mp = [m0.x, 1.9 + m0.y * 0.4, m0.z - 1.0];
    FX.moon(A, { t0: t0 + 0.3, t1: tX, at: (t) => { if (t < tE) return mp; const u = EASE.in(clamp((t - tE) / (tX - tE))); return [lerp(mp[0], X[0], u), lerp(mp[1], 0.3, u), lerp(mp[2], X[1], u)]; }, r: 0.85, grow: 0.8, op: 0.92 });
    A.dark(tC - 0.05, tC + 0.15, 0.55, 0.05, 0.4, { eyes: false }); A.shake(tC, 0.07, 0.25);
    FX.ring(A, { t: tC + 0.02, at: [-0.3, 0, 0], r0: 0.3, r1: 2.4, dur: 0.5, col: C.blood, op: 0.9, w: 0.25, normal: true });
    ds.forEach((p, i) => A.hit(i, tC + 0.1 + 0.015 * i, 30, { big: true, blind: 1.5 }));
    cl.forEach((t, i) => claw(A, t + 0.15, 0, 4, { roll: i % 2 ? 0.95 : -0.95, of: i % 2 ? 'handL' : 'handR' }));
    // the crash: a red wave 2.4 u round where it lands, as much as his Combo, which he keeps
    FX.ring(A, { t: tX, at: [X[0], 0.03, X[1]], r0: 0.3, r1: 2.4, dur: 0.45, col: C.blood, op: 0.95, w: 0.3, normal: true }); FX.ring(A, { t: tX + 0.05, at: [X[0], 0.4, X[1]], r0: 0.2, r1: 2.4, dur: 0.4, col: C.rose, op: 0.6 });
    FX.disc(A, { t: tX, at: [X[0], 0, X[1]], r0: 0.4, r1: 1.1, dur: 0.5, col: C.moon, op: 0.5, normal: true }); FX.dust(A, { t: tX, at: [X[0], 0.03, X[1]], n: 12, sp: 1.8 }); FX.drops(A, { t: tX, at: [X[0], 0.3, X[1]], n: 22, sp: 3.0, up: 1.2, size: 0.06 }); A.shake(tX, 0.1, 0.3);
    ds.forEach((p, i) => { if (Math.hypot(p[0] - X[0], p[1] - X[1]) <= 2.4) A.hit(i, tX + 0.03 + 0.012 * i, n, { big: true, noCombo: true }); });
    cap(A, tC + 0.6, tE, '月下：每一下算两次连击，连击不掉', 'Under the moon: each hit counts twice, the Combo holds');
    cap(A, tE, tX + 1.1, `月落砸下：连击 ${n}，2.4 u 内每个敌人 ${n}；连击留着`, `The moon sets and crashes: ${n} Combo, so ${n} to every foe within 2.4 u; he keeps the Combo`); } }, { start: 6, dbl: [tC, tE] });
}
// R7a F12: the swarm stays on its spot and grows with his Combo: 1.3 u plus 0.2 u per 5 Combo (2.5 u at 30); 5 a second plus 1 per 10 Combo (8 at 30)
{ const c = [1.2, 0.1]; const ds = [[1.55, -0.3], [0.75, 0.55], [2.6, 0.75], [1.15, -1.75], [3.0, -0.6]]; const t0 = 0.3, tS = t0 + 0.42, tE = tS + 4.0; const C0 = 12;
  const cl = [1.1, 1.45, 1.8, 2.15, 2.5, 2.85, 3.2, 3.55]; const clT = cl.map((t) => t + 0.15);
  // the Combo: his claws plus each bite of the swarm (one bite a second on each foe inside)
  const times = [...clT]; const bites = []; const combo = (t) => C0 + times.filter((h) => h <= t).length; const rad = (t) => 1.3 + 0.2 * Math.floor(combo(t) / 5); const radS = (t) => [0, 0.08, 0.16, 0.24].reduce((s, d) => s + rad(t - d), 0) / 4;
  for (let s = 1; s <= 4; s++) { const tb = tS + s - 0.04; const r = rad(tb - 0.001); ds.forEach((p, i) => { if (Math.hypot(p[0] - c[0], p[1] - c[1]) <= r) { bites.push([i, tb + 0.01 * i]); times.push(tb + 0.01 * i); } }); }
  N.F12 = RA({ T: tE + 0.6, cam: { x: 0.6, z: -0.2, w: 7.4, y: 0.8 }, her: H(-1.6, 0), seq: [[t0, 'flare'], [t0 + 0.5, 'run', { loop: true, until: cl[0] }], ...cl.map((t, i) => [t, i % 2 ? 'clawL' : 'clawR']), [cl[7] + 0.55, 'idle', { fade: 0.2 }]],
    root: [{ t: t0 + 0.5 }, { t: cl[0], x: ds[0][0] - 0.62, z: ds[0][1] + 0.05, look: ds[0], e: 's' }], dum: ds, fx(A) {
    FX.blink(A, { t: t0 + 0.12, dur: 0.32, from: A.body(t0, 0.1), to: [c[0], 0.5, c[1]], n: 14, size: 1.5, puff: false });
    FX.swarm(A, { t0: tS, t1: tE, at: [c[0], 0.1, c[1]], r: (t) => radS(t), n: 40, h: 1.0, w: 3.2, both: true, size: 1.7 });
    const disc = A.add(new A.THREE.Mesh(A.ringGeo, A.mat(C.rose, A.F.RING, { normal: true }))); disc.visible = false;
    A.fx((t) => { const on = t >= tS && t <= tE; disc.visible = on; if (!on) return; const rr = radS(t); disc.position.set(c[0], 0.03, c[1]); disc.scale.setScalar(rr); disc.material.uniforms.op.value = 0.55 * Math.min(1, (t - tS) / 0.2, (tE - t) / 0.3); disc.material.uniforms.u0.value = 0.05; });
    cl.forEach((t, i) => claw(A, t + 0.15, i % 3 === 2 ? 1 : 0, 4, { roll: i % 2 ? 0.95 : -0.95, of: i % 2 ? 'handL' : 'handR' }));
    bites.forEach(([i, t]) => A.hit(i, t, 5 + Math.floor(combo(t - 0.001) / 10), { col: '#E7A0A8' }));
    A.post((t, x, W, H2, k, lang) => { if (t < tS || t > tE) return; x.font = font(k, 14); x.textAlign = 'right'; x.fillStyle = '#B98FD0'; x.fillText((lang === 'en' ? 'Swarm ' : '蝠群 ') + rad(t).toFixed(1) + ' u · ' + (5 + Math.floor(combo(t) / 10)) + (lang === 'en' ? '/s' : '/秒'), W - 14 * k, 52 * k); });
    cap(A, tS, tS + 1.4, '蝠群留在原地，随连击变大', 'The swarm stays on its spot and grows with his Combo'); cap(A, tS + 1.4, tE + 0.5, '每 5 连击 +0.2 u（30 时 2.5 u）；每 10 连击每秒 +1（30 时 8）', '0.2 u more per 5 Combo (2.5 u at 30); 1 more a second per 10 Combo (8 at 30)'); } }, { start: C0 });
}
// R8a F23: the shade copies only his finishers (basic hit 6 and each skill's last hit) at the foes within 2 u of it, twice the size, for half
{ const ds = [[1.4, 0.15], [-0.75, 0.95], [-2.6, -0.85], [-1.0, -1.1]]; const t0 = 0.3, tH = t0 + 0.32; const f1 = 1.75, f2 = 2.85;
  N.F23 = RA({ T: 4.2, cam: { x: -0.4, z: 0, w: 7.0, y: 0.6 }, her: H(-1.8, 0), seq: [[t0, 'kickUp'], [tH, 'idle', { fade: 0.15 }], [tH + 0.3, 'run', { loop: true, until: 1.3 }], [1.3, 'combo', { from: 0.3, to: 0.52 }], [f1 - 0.12, 'clawBoth', { from: 0.05, fade: 0.02 }], [f1 + 0.5, 'idle', { fade: 0.2 }], [f2 - 0.35, 'clap', { from: 0.0 }], [f2 + 0.6, 'idle', { fade: 0.25 }]],
    root: [{ t: tH + 0.3 }, { t: 1.3, x: ds[0][0] - 0.66, z: ds[0][1], look: ds[0], e: 's' }], dum: ds, keepClaws: true, fx(A) {
    const spot = A.rootAt(tH); let pulse = (t) => Math.max(...[f1, f2].map((f) => { const a = t - f; return a >= 0 && a < 0.35 ? 1 - a / 0.35 : 0; }));
    A.ghost((t) => (t >= tH ? [{ clip: 'hang', ct: t, root: { x: spot.x, z: spot.z, y: 0.95, yaw: spot.yaw, pitch: Math.PI, roll: 0 }, op: 0.55 + 0.3 * pulse(t), tint: C.plum, col: C.plum, glow: 0.25 + 0.6 * pulse(t) }] : []));
    FX.smoke(A, { t: tH, at: A.body(tH, 0.6), n: 8, r: 0.25, size: 0.3, dur: 0.6, op: 0.5 });
    FX.ring(A, { t: tH + 0.1, at: [spot.x, 0.03, spot.z], r0: 1.95, r1: 2.0, dur: 3.8, col: C.plum, op: 0.35, w: 0.03, normal: true, hold: true });
    // basic chain: hits 1 to 5 small; hit 6 is the finisher
    [1.38, 1.46, 1.54].forEach((t, k) => claw(A, t, 0, 3, { roll: k % 2 ? 0.95 : -0.95, size: 0.35 })); claw(A, f1, 0, 12, { big: true, roll: -0.2, size: 0.7, mark: { n: 4 } });
    // a skill's last hit: the clap of Crescent Wings at the end
    FX.ring(A, { t: f2, at: A.body(f2, 0.6), r0: 0.2, r1: 1.0, dur: 0.3, col: C.moon, op: 0.8 }); A.hit(0, f2, 10, { big: true }); FX.claw(A, { t: f2, at: { d: 0, y: 0.6 }, roll: 1.4, n: 2, size: 0.6 });
    [[f1, 6], [f2, 5]].forEach(([t, n], k) => { [1, 2, 3].forEach((i) => { if (Math.hypot(ds[i][0] - spot.x, ds[i][1] - spot.z) > 2.0) return; A.hit(i, t + 0.06, n, { col: '#C9B6D6' }); FX.claw(A, { t: t + 0.06, at: { d: i, y: 0.62 }, roll: k ? 1.4 : -0.3, n: 4, size: 1.0, pal: 'rose', life: 0.6 }); });
      FX.ring(A, { t: t + 0.04, at: [spot.x, 0.03, spot.z], r0: 0.3, r1: 2.0, dur: 0.35, col: C.rose, op: 0.6, normal: true }); });
    cap(A, tH, 1.65, '影子挂着', 'The shade hangs'); cap(A, f1, f2 - 0.1, '普攻第 6 下：影子在 2 u 内放一个两倍大的，一半：6', 'Basic hit 6: the shade throws one twice the size within 2 u of it, for half: 6');
    cap(A, f2, 4.1, '技能最后一下也复制：一半，两倍范围', 'Each skill\'s last hit too: half, twice the area'); } }, { start: 8 });
}
// the picks are the styles now
Object.assign(F, N);
