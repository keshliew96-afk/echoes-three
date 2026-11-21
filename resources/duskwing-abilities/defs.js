// Page side of every clip: where he stands, his body clips in time, his root moves, the dummies and the effects.
import { FX, C, EASE, clamp, lerp } from './dw.js';
export const H = (x = -2, z = 0, face = 90) => ({ x, z, face });
export const DEFS = {};
export const FORMS = { ra: {}, sa: {}, ph: {}, ra2: {}, sa2: {}, ph2: {}, co2: {} }; // *2: new options, not passed (Kesh 18 Nov: work on changes overnight)
// ---- helpers
export const D2R = Math.PI / 180;
// a spot r from a point p at angle deg (0 = +x, 90 = toward -z, the far side of the floor)
export const around = (p, deg, r = 0.62) => [p[0] + Math.cos(deg * D2R) * r, p[1] - Math.sin(deg * D2R) * r];
export const font = (k, px, w = 700) => `${w} ${Math.round(px * k)}px Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`;
// the Combo count, top right
export const comboHud = (fn, o = {}) => Object.assign((t, x, W, H2, k, lang) => { const n = fn(t); if (n == null) return; const s = (lang === 'zh' ? '连击 ' : 'Combo ') + n; x.font = font(k, 18); x.textAlign = 'right';
  x.lineWidth = 3 * k; x.strokeStyle = 'rgba(20,14,18,0.85)'; x.strokeText(s, W - 14 * k, 28 * k); x.fillStyle = n >= (o.lit || 15) ? C.rose : C.parch; x.fillText(s, W - 14 * k, 28 * k); }, { _combo: true, _n: fn, _lit: o.lit || 15 });
export const countAt = (times, base = 0) => (t) => base + times.filter((h) => h <= t).length;
// a row of key squares, bottom left: each [zh, en, cooldown left at t (0 = ready)]
export const keysHud = (fn) => (t, x, W, H2, k, lang) => { const ks = fn(t); ks.forEach((q, i) => { const cx = 14 * k + i * 54 * k, cy = H2 - 52 * k, s = 44 * k, cd = q[2];
  x.fillStyle = 'rgba(20,14,18,0.78)'; x.fillRect(cx, cy, s, s); x.strokeStyle = cd <= 0 ? C.rose : 'rgba(244,239,230,0.35)'; x.lineWidth = (cd <= 0 ? 2.5 : 1.2) * k; x.strokeRect(cx, cy, s, s);
  x.textAlign = 'center'; x.fillStyle = C.parch; x.font = font(k, 11, 600); x.fillText(lang === 'zh' ? q[0] : q[1], cx + s / 2, cy + 15 * k);
  x.font = font(k, 15); x.fillStyle = cd <= 0 ? C.rose : C.parch; x.fillText(cd <= 0 ? (lang === 'zh' ? '就绪' : 'ready') : cd.toFixed(1), cx + s / 2, cy + 35 * k); }); };
// a foe's bolt (Foe Crimson): a short red streak from a dummy to a point
export function bolt(A, o) { const T = A.THREE; const m = A.add(new T.Mesh(A.streakGeo, A.mat('#B8141F', A.F.STREAK))); m.visible = false; const s = A.add(new T.Sprite(new T.SpriteMaterial({ color: '#E0303A', transparent: true, opacity: 0.9, depthWrite: false }))); s.visible = false;
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.4; const on = a >= 0 && a <= d; m.visible = s.visible = on; if (!on) return; const p0 = A.dpt(o.d, o.t, 0.75), p1 = typeof o.to === 'function' ? o.to(o.t + d) : new T.Vector3(...o.to); const p = p0.clone().lerp(p1, a / d), q = p0.clone().lerp(p1, Math.max(0, a / d - 0.18));
    m.position.copy(q); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); m.scale.set(0.12, 0.12, p.distanceTo(q) + 1e-3); m.material.uniforms.op.value = 0.95; s.position.copy(p); s.scale.setScalar(0.14); }); }
// one claw blow on a dummy: the number, the torn mark, a pale streak off the claw
export function claw(A, t, d, n, o = {}) { A.hit(d, t, n, o); FX.claw(A, Object.assign({ t, at: { d, y: o.y || 0.62 }, roll: o.roll != null ? o.roll : -0.95, size: o.size || 0.5 }, o.mark || {}, o.back ? { back: true } : {}));
  if (o.of) FX.trail(A, { of: o.of, t0: t - 0.06, t1: t + 0.04, len: 0.1, w: 0.07, op: 0.5 }); }
// blood drawn home: drops leave the foe, hang a beat, and fly into his mouth; then the heal number
export function drink(A, t, from, n, o = {}) { FX.drops(A, { t, at: from, n: o.drops || 8, to: (tt) => A.at('mouth', tt), hang: o.hang || 0.18, fly: o.fly || 0.2, sp: 1.2, up: 0.8, size: 0.05, spread: 0.08 }); if (n) A.heal(t + (o.hang || 0.18) + (o.fly || 0.2), n); }
export const at3 = (A, i, y = 0.6) => (t) => A.dpt(i, t, y);
export const fan = (n, r, deg0, deg1, cx = 0, cz = 0) => Array.from({ length: n }, (_, i) => around([cx, cz], lerp(deg0, deg1, n > 1 ? i / (n - 1) : 0.5), r));

// ================================================================ passive, basic attack, dash
// P: Night Hunt. A hit from behind deals 20% more; a kill readies the dash and takes 1 s off every cooldown
{ const me = [-1.5, 0.2], d0 = [0, 0.2], d1 = [0.6, -1.0];
  const b0 = around(d0, 0, 0.62);
  DEFS.P = { noWarp: true, T: 5.0, cam: { x: 0.0, z: -0.2, w: 6.2 }, her: H(me[0], me[1]),
    seq: [[0.25, 'run', { loop: true, until: 0.6, fade: 0.08 }], [0.6, 'clawR'], [1.45, 'curl', { fade: 0.05 }], [1.62, 'clawL', { from: 0.06 }], [2.4, 'cape'], [3.0, 'curl', { fade: 0.05 }], [3.16, 'clawBoth', { from: 0.1 }], [3.9, 'cape']],
    root: [{ t: 0.25 }, { t: 0.6, fw: 0.8 }, { t: 1.52 }, { t: 1.6, x: b0[0], z: b0[1], look: d0, cut: true }, { t: 3.06 }, { t: 3.14, ...(() => { const s = around(d1, 30, 0.62); return { x: s[0], z: s[1] }; })(), look: d1, cut: true }],
    hide: [[1.52, 1.6], [3.06, 3.14]],
    dum: [d0, d1],
    fx(A) { claw(A, 0.75, 0, 10, { of: 'handR' }); A.cap(0.55, 1.4, '正面：10', 'From the front: 10');
      FX.blink(A, { t: 1.52, dur: 0.08, from: A.body(1.5), to: A.body(1.62), n: 10 });
      claw(A, 1.77, 0, 12, { back: true, roll: 0.95, mark: { bend: -0.1 }, of: 'handL', col: C.rose }); A.cap(1.65, 2.9, '背刺 +20%：12', 'Backstab +20%: 12');
      FX.blink(A, { t: 3.06, dur: 0.08, from: A.body(3.04), to: A.body(3.16), n: 10 });
      claw(A, 3.26, 1, 14, { back: true, fell: true, roll: -0.2, mark: { n: 4, size: 0.6 }, col: C.rose }); FX.ring(A, { t: 3.32, at: 'him', r0: 0.3, r1: 1.4, dur: 0.5, col: C.rose, op: 0.7 });
      A.cap(3.3, 4.9, '击杀：冲刺就绪，所有冷却 -1 秒', 'A kill: dash ready, every cooldown -1 s');
      A.hud(keysHud((t) => { const k = t >= 3.3 ? 1 : 0; return [['冲刺', 'Dash', t < 3.3 ? 2.4 - t * 0.2 : 0], ['爪击', 'Rake', Math.max(0, 4.2 - t * 0.6 - k)], ['夜幕', 'Nightfall', Math.max(0, 6.8 - t * 0.5 - k)], ['影幕', 'Veil', Math.max(0, 9.5 - t * 0.5 - k)]]; }));
    } };
}
// B: the basic attack, as passed on his model page: claw 4, claw 4, bite 6, then three blinks round the foe nearest the pointer: 5, 5, 8
{ const me = [-1.1, 0], d0 = [-0.15, 0], d1 = [1.7, -0.55]; const t0 = 0.35;
  const s1 = around(d1, 0), s2 = around(d1, 126), s3 = around(d1, -126);
  const hitT = [0.10, 0.24, 0.46, 0.62, 0.78, 0.96].map((x) => x + t0);
  DEFS.B = { noWarp: true, T: 2.6, cam: { x: 0.35, z: -0.2, w: 5.8 }, her: H(me[0], me[1]), seq: [[t0, 'combo']],
    root: [{ t: t0 + 0.5 }, { t: t0 + 0.56, x: s1[0], z: s1[1], look: d1, cut: true }, { t: t0 + 0.72, x: s2[0], z: s2[1], look: d1, cut: true }, { t: t0 + 0.89, x: s3[0], z: s3[1], look: d1, cut: true }, { t: t0 + 1.10, x: me[0], z: me[1], look: [5, 0], cut: true }],
    hide: [[t0 + 0.5, t0 + 0.56], [t0 + 0.66, t0 + 0.72], [t0 + 0.83, t0 + 0.89], [t0 + 1.04, t0 + 1.10]],
    dum: [d0, d1],
    fx(A) {
      claw(A, hitT[0], 0, 4, { of: 'handR' }); claw(A, hitT[1], 0, 4, { roll: 0.95, mark: { bend: -0.1 }, of: 'handL' });
      A.hit(0, hitT[2], 6, { big: true }); FX.bite(A, { t: hitT[2], at: { d: 0, y: 0.6 }, size: 0.42 });
      claw(A, hitT[3], 1, 5, { of: 'handR' }); claw(A, hitT[4], 1, 5, { roll: 0.95, mark: { bend: -0.1 }, of: 'handL' });
      A.hit(1, hitT[5], 8, { big: true }); FX.claw(A, { t: hitT[5], at: { d: 1, y: 0.66 }, roll: -0.2, n: 4, size: 0.62, bend: 0.12 }); FX.claw(A, { t: hitT[5], at: { d: 1, y: 0.58 }, roll: 0.2, n: 4, size: 0.62, bend: -0.12 }); A.shake(hitT[5], 0.05, 0.16);
      const hops = [[0.5, me, s1], [0.66, s1, s2], [0.83, s2, s3], [1.04, s3, me]];
      for (const [h, a, b] of hops) FX.blink(A, { t: t0 + h, dur: 0.06, from: [a[0], 0.45, a[1]], to: [b[0], 0.45, b[1]], n: 9, size: 1.3 });
      A.hud(comboHud(countAt(hitT)));
    } };
}
// D: the dash, as passed: a blink; he splits into small bats and gathers. It cancels any move and he is untouchable
{ const me = [-2.2, 0.3], m1 = [0.3, 0.3], m2 = [1.1, 0.75];
  DEFS.D = { noWarp: true, T: 3.0, cam: { x: 0.0, z: -0.3, w: 6.2 }, her: H(me[0], me[1]), seq: [[0.3, 'castSweep'], [0.55, 'dash', { fade: 0.03 }], [1.75, 'dash']],
    root: [{ t: 0.6 }, { t: 0.72, x: m1[0], z: m1[1], cut: true }, { t: 1.8 }, { t: 1.92, x: m2[0], z: m2[1], look: [1.6, -1.9], cut: true }],
    hide: [[0.6, 0.72], [1.8, 1.92]],
    dum: [[1.6, -1.9]],
    fx(A) { const at = (t) => A.body(t, 0.45);
      FX.blink(A, { t: 0.6, dur: 0.12, from: at(0.58), to: at(0.74) }); FX.blink(A, { t: 1.8, dur: 0.12, from: at(1.78), to: at(1.94) });
      bolt(A, { t: 1.6, d: 0, dur: 0.36, to: [m1[0] + (m1[0] - 1.6) * 0.4, 0.6, m1[1] + (m1[1] + 1.9) * 0.4] });
      A.cap(0.3, 0.75, '冲刺打断出招', 'The dash cancels a move'); A.cap(1.6, 2.3, '无敌：子弹穿过', 'Untouchable: the shot goes through');
    } };
}

// ================================================================ Claw 爪
// F1 Talon Rake: a half step, both wings thrown back; he rakes across with both wing claws: 15 to up to 5 foes, 150°, knocked back 0.6 u. End: the cape pose
{ const ds = fan(5, 1.0, 70, -70, -1.0, 0.1);
  DEFS.F1 = { T: 2.5, cam: { x: -0.4, z: 0, w: 5.4 }, her: H(-1.5, 0.1), seq: [[0.3, 'castSweep'], [1.25, 'cape']], root: [{ t: 0.5 }, { t: 0.72, fw: 0.3, e: 'out' }], dum: ds,
    fx(A) { const tH = 0.3 + 0.42, c = A.body(tH, 0);
      ds.forEach((p, i) => { const dx = p[0] - c.x, dz = p[1] - c.z, l = Math.hypot(dx, dz); A.hit(i, tH + 0.012 * (4 - i), 15, { knock: [dx / l * 0.6, dz / l * 0.6], dir: [dx, dz] }); FX.claw(A, { t: tH + 0.012 * (4 - i), at: { d: i, y: 0.62 }, roll: 0.15, n: 4, size: 0.5, bend: 0.14 }); });
      FX.tube(A, { t: tH - 0.06, dur: 0.12, hold: 0.05, out: 0.3, flat: true, w: (u) => 0.28 * Math.sin(Math.PI * u), col: C.moon, op: 0.6, e: 'out', pts: () => { const T = A.THREE, P = []; for (let i = 0; i <= 16; i++) { const a = (75 - 150 * i / 16) * D2R, f = A.fwd(tH); const yaw = Math.atan2(f.x, f.z) + a; P.push(new T.Vector3(c.x + Math.sin(yaw) * 1.1, 0.5, c.z + Math.cos(yaw) * 1.1)); } return P; } });
      FX.trail(A, { of: 'handR', t0: tH - 0.12, t1: tH + 0.14, len: 0.16, w: 0.1 }); FX.trail(A, { of: 'tipR', t0: tH - 0.12, t1: tH + 0.14, len: 0.16, w: 0.08, op: 0.4 });
      FX.dust(A, { t: tH, at: c, n: 6, sp: 0.8 }); A.shake(tH, 0.04, 0.14);
    } };
}
// F2 Thousand Claws: he drops low; eight claw strikes in 1 s, left and right, a blur: 3 each; then a jump and both claws drawn down and apart: a cross tear, 10
{ const ds = [[-0.2, -0.25], [-0.1, 0.45]]; const t0 = 0.3;
  const jab = Array.from({ length: 8 }, (_, i) => t0 + 0.15 + 0.11 * i + 0.05);
  DEFS.F2 = { T: 2.8, cam: { x: -0.5, z: 0.1, w: 5.0 }, her: H(-1.25, 0.1), seq: [[t0, 'jabs'], [t0 + 1.6, 'cape', { from: 0.5 }]], root: [{ t: t0 + 1.02 }, { t: t0 + 1.3, y: 0, jump: 0.55, fw: 0.15 }], dum: ds,
    fx(A) { jab.forEach((t, i) => { const d = i % 2, s = i % 2 ? 'handL' : 'handR'; claw(A, t, d, 3, { roll: i % 2 ? 0.9 : -0.9, size: 0.36, of: s, mark: { life: 0.45, drops: i % 3 === 0 } }); });
      const tX = t0 + 1.27; [0, 1].forEach((d) => { A.hit(d, tX, 10, { big: true }); FX.claw(A, { t: tX, at: { d, y: 0.62 }, roll: -0.75, n: 4, size: 0.7, bend: 0.05 }); FX.claw(A, { t: tX + 0.03, at: { d, y: 0.62 }, roll: 0.75, n: 4, size: 0.7, bend: -0.05 }); });
      FX.trail(A, { of: 'handR', t0: tX - 0.1, t1: tX + 0.05, len: 0.12, w: 0.1 }); FX.trail(A, { of: 'handL', t0: tX - 0.1, t1: tX + 0.05, len: 0.12, w: 0.1 }); A.shake(tX, 0.05, 0.18); FX.dust(A, { t: tX + 0.05, at: 'him', n: 6 });
      A.ghost((t) => (t > t0 + 0.15 && t < t0 + 1.02 ? [{ lag: 0.035, op: 0.22, glow: 0.25 }, { lag: 0.07, op: 0.14, glow: 0.2 }] : []));
    } };
}
// F3 Wing Wheel: he leaps and spins with his wings out flat like blades, 1.6 u, at full run: three turns of 6
{ const ds = [[-0.6, 0.8], [0.3, -0.75], [1.0, 0.7]]; const t0 = 0.3, t1 = t0 + 0.95;
  DEFS.F3 = { T: 2.6, cam: { x: 0.0, z: 0, w: 6.2 }, her: H(-2.0, 0), seq: [[t0, 'blades'], [t1 + 0.1, 'emerge', { from: 0.07 }]],
    root: [{ t: t0 + 0.1 }, { t: t0 + 0.22, y: 0.25, e: 'out' }, { t: t1 - 0.05, fw: 3.6, y: 0.25, spin: -1080, e: 'lin' }, { t: t1 + 0.1, fw: 3.8, y: 0, spin: -1080, e: 'in' }],
    dum: ds,
    fx(A) { for (let k = 0; k < 3; k++) { const tk = t0 + 0.22 + k * 0.24; FX.ring(A, { t: tk, at: (t) => A.body(t, 0.55), follow: true, r0: 1.2, r1: 1.7, dur: 0.3, w: 0.12, col: C.rose, op: 0.7 });
        ds.forEach((p, i) => { const r = A.rootAt(tk + 0.1); if (Math.hypot(p[0] - r.x, p[1] - r.z) < 1.9) claw(A, tk + 0.1, i, 6, { size: 0.42, roll: 1.4 + k * 0.3, mark: { n: 3, life: 0.4 } }); }); }
      FX.trail(A, { of: 'tipL', t0: t0 + 0.2, t1: t1, len: 0.1, w: 0.14, op: 0.6, col: C.moon }); FX.trail(A, { of: 'tipR', t0: t0 + 0.2, t1: t1, len: 0.1, w: 0.14, op: 0.6, col: C.moon });
      FX.dust(A, { t: t1 + 0.1, at: 'him', n: 6, dir: [1, 0] });
    } };
}
// F4 Skyward Rip: a rising claw: 8 within 1.2 u, launched 0.8 s; he flies up with one foe: four cuts of 4; then rolls over it and stamps it down: 10 within 1.5 u
{ const d0 = [-0.6, 0], d1 = [-0.75, 0.75]; const t0 = 0.3;
  DEFS.F4 = { T: 3.4, cam: { x: -0.5, z: -0.6, w: 6.0, y: 1.0 }, her: H(-1.5, 0), seq: [[t0, 'rise'], [t0 + 0.5, 'airCuts'], [t0 + 1.3, 'stomp'], [t0 + 2.0, 'drift'], [t0 + 2.9, 'idle']],
    root: [{ t: t0 + 0.22 }, { t: t0 + 0.5, y: 1.45, fw: 0.35, e: 'out' }, { t: t0 + 1.3, y: 1.6, fw: 0.42 }, { t: t0 + 1.46, y: 1.9, fw: 0.62, pitch: 360, e: 'io2' }, { t: t0 + 1.62, y: 0.85, fw: 0.6, pitch: 360, e: 'in' }, { t: t0 + 2.7, y: 0, fw: 0.45, pitch: 360, e: 's' }],
    dum: [d0, d1],
    fx(A) { const tR = t0 + 0.22; claw(A, tR, 0, 8, { up: 1.9, roll: 1.4, size: 0.55, of: 'handR' }); claw(A, tR + 0.02, 1, 8, { up: 0.75, roll: 1.4, size: 0.5 });
      FX.trail(A, { of: 'handR', t0: tR - 0.12, t1: tR + 0.12, len: 0.18, w: 0.12 }); FX.dust(A, { t: tR, at: 'him', n: 7, sp: 0.9 });
      // four cuts in the air, the foe held up by each
      for (let i = 0; i < 4; i++) { const tc = t0 + 0.5 + 0.2 * i + 0.1; A.hit(0, tc, 4); A.launch(0, tc, 0.12); FX.claw(A, { t: tc, at: at3(A, 0, 0.62), roll: i % 2 ? 0.9 : -0.9, size: 0.45, follow: true }); FX.trail(A, { of: i % 2 ? 'handL' : 'handR', t0: tc - 0.08, t1: tc + 0.04, len: 0.1, w: 0.08 }); }
      const tS = t0 + 1.6; A.hit(0, tS, null); A.launch(0, tS, -1); FX.trail(A, { of: 'footL', t0: tS - 0.14, t1: tS + 0.02, len: 0.12, w: 0.1, col: C.rose });
      const tL = tS + 0.12; A.hit(0, tL, 10, { big: true }); A.hit(1, tL + 0.02, 10); FX.ring(A, { t: tL, at: { d: 0, y: -0.58 }, r0: 0.2, r1: 1.5, dur: 0.45, col: C.moon, op: 0.8 }); FX.ring(A, { t: tL + 0.04, at: { d: 0, y: -0.58 }, r0: 0.1, r1: 1.1, dur: 0.4, col: C.rose, op: 0.6 }); FX.dust(A, { t: tL, at: { d: 0, y: -0.6 }, n: 10, sp: 1.4 }); A.shake(tL, 0.08, 0.22);
      FX.trail(A, { of: 'tipL', t0: t0 + 1.36, t1: t0 + 1.62, len: 0.14, w: 0.1, op: 0.5 }); FX.trail(A, { of: 'tipR', t0: t0 + 1.36, t1: t0 + 1.62, len: 0.14, w: 0.1, op: 0.5 });
    } };
}
// F5 Last Bite: a lunge bite, 1.5 u: 24; double under 30% health; a kill readies it again
{ const d0 = [-0.5, -0.5], d1 = [1.6, 0.5]; const t0 = 0.3, t1 = 1.9;
  DEFS.F5 = { T: 3.6, cam: { x: 0.1, z: 0, w: 6.0 }, her: H(-2.1, -0.5), seq: [[t0, 'dart'], [t0 + 0.7, 'idle'], [t1, 'dart'], [t1 + 0.66, 'lick']],
    root: [{ t: t0 + 0.14 }, { t: t0 + 0.24, pitch: 62, y: 0.25, e: 'out' }, { t: t0 + 0.42, fw: 0.9, pitch: 62, y: 0.25, e: 'lin' }, { t: t0 + 0.6, fw: 0.95, pitch: 0, y: 0, e: 's' },
      { t: t1 - 0.2, x: -0.2, z: -0.1, look: d1 }, { t: t1 + 0.14, x: -0.2, z: -0.1, look: d1 }, { t: t1 + 0.24, pitch: 62, y: 0.25, e: 'out' }, { t: t1 + 0.42, x: 1.25, z: 0.5, pitch: 62, y: 0.25, e: 'lin' }, { t: t1 + 0.6, x: 2.3, z: 0.75, pitch: 0, y: 0, e: 'out' }],
    dum: [d0, d1],
    fx(A) { FX.dim(A, { t: t0, d: 0, dur: 0.6, r: 1.0 }); const b1 = t0 + 0.44; A.hit(0, b1, 24, { big: true }); FX.bite(A, { t: b1, at: { d: 0, y: 0.6 }, size: 0.55 });
      FX.trail(A, { of: 'mouth', t0: t0 + 0.24, t1: b1, len: 0.14, w: 0.14, col: C.moon, op: 0.5 });
      FX.dim(A, { t: t1, d: 1, dur: 0.6, r: 1.0, op: 0.5 }); const b2 = t1 + 0.44; A.hit(1, b2, 48, { big: true, crit: false, fell: true }); FX.bite(A, { t: b2, at: { d: 1, y: 0.6 }, size: 0.7 }); A.shake(b2, 0.06, 0.2);
      FX.trail(A, { of: 'mouth', t0: t1 + 0.24, t1: b2, len: 0.14, w: 0.14, col: C.moon, op: 0.5 });
      A.cap(t1 - 0.3, t1 + 0.4, '低于 30% 血：双倍', 'Under 30% health: double'); A.cap(b2 + 0.1, 3.5, '击杀：绝命牙立刻就绪', 'A kill: Last Bite is ready again');
      A.hud(keysHud((t) => [['绝命牙', 'Last Bite', t < t0 + 0.44 ? 0 : t < b2 + 0.05 ? 8 - (t - t0 - 0.44) : 0]]));
      // a red wisp off the weak foe
      FX.smoke(A, { t: 0.1, at: { d: 1, y: 0.9 }, n: 8, r: 0.12, h: 0.5, size: 0.14, dur: 2.2, op: 0.5, col: C.blood, col2: C.rose, rise: 0.6, spread: 2.0, out: 0.2 });
    } };
}
// F6 Pounce: he leaps on one foe within 4 u, pins it 0.8 s and mauls: five hits of 4; then springs off backward in a flip
{ const d0 = [1.0, 0]; const t0 = 0.3;
  DEFS.F6 = { T: 3.2, cam: { x: 0.0, z: 0, w: 5.8, y: 0.6 }, her: H(-2.3, 0), seq: [[t0, 'pounce'], [t0 + 0.6, 'maul'], [t0 + 1.5, 'flip'], [t0 + 2.0, 'emerge', { from: 0.07 }]],
    root: [{ t: t0 + 0.14 }, { t: t0 + 0.6, fw: 2.75, y: 0.42, jump: 1.3, e: 'lin' }, { t: t0 + 1.5, fw: 2.75, y: 0.42 }, { t: t0 + 1.95, fw: 1.6, y: 0, jump: 0.8, pitch: -360, e: 'lin' }],
    dum: [d0],
    fx(A) { const tl = t0 + 0.6; A.hit(0, tl, null, { big: true }); A.turn(0, tl, 0, 0.1); A.status(0, tl, 'stun', 0.85); FX.dust(A, { t: tl, at: { d: 0, y: -0.6 }, n: 7 }); A.shake(tl, 0.05, 0.15);
      for (let i = 0; i < 5; i++) { const tc = tl + 0.08 + (i < 4 ? 0.16 * i : 0.78); claw(A, tc, 0, 4, { size: i === 4 ? 0.6 : 0.42, roll: i === 4 ? 0 : i % 2 ? 0.9 : -0.9, y: 0.75, mark: i === 4 ? { n: 4 } : {}, of: i % 2 ? 'handL' : 'handR' }); }
      FX.trail(A, { of: 'tipL', t0: t0 + 0.2, t1: tl, len: 0.12, w: 0.1, op: 0.45 }); FX.trail(A, { of: 'tipR', t0: t0 + 0.2, t1: tl, len: 0.12, w: 0.1, op: 0.45 });
      A.cap(tl, tl + 0.85, '按住 0.8 秒', 'Pinned 0.8 s');
    } };
}
// F7 Crescent Wings: wings spread full, a breath, then clapped shut: two crossing crescents fly 5 u through every foe: 9 each
{ const ds = [[-0.4, 0.15], [0.9, -0.2], [2.1, 0.25]]; const t0 = 0.3, tC = t0 + 0.44;
  DEFS.F7 = { T: 2.4, cam: { x: 0.3, z: 0, w: 6.4 }, her: H(-1.9, 0), seq: [[t0, 'clap'], [t0 + 1.0, 'idle', { fade: 0.3 }]], dum: ds,
    fx(A) { const o = A.ahead(tC, 0.45, 0.5), e = A.ahead(tC, 5.3, 0.5);
      for (const s of [-1, 1]) FX.crescent(A, { t: tC, dur: 0.42, e: 'lin', R: 0.9, th: 0.2, arc: 2.0, roll: s * 0.45, op: 1, glowOp: 0.7, col: s > 0 ? C.moon : '#F4C6DA', path: (u) => { const p = o.clone().lerp(e, u); const sd = 0.5 * s * Math.cos(u * Math.PI); p.z += sd; p.y = 0.5 + 0.14 * s; return p; } }); // they start apart, cross in the middle (one over the other) and part again
      ds.forEach((p, i) => { const u = (p[0] - o.x) / (e.x - o.x); A.hit(i, tC + 0.42 * u, 9); A.hit(i, tC + 0.42 * u + 0.03, 9); FX.claw(A, { t: tC + 0.42 * u, at: { d: i, y: 0.6 }, roll: 0.45, n: 1, len: 1.4, size: 0.55 }); FX.claw(A, { t: tC + 0.42 * u + 0.03, at: { d: i, y: 0.6 }, roll: -0.45, n: 1, len: 1.4, size: 0.55 }); });
      FX.dust(A, { t: tC, at: A.ahead(tC, 0.4, 0), n: 8, dir: [1, 0], sp: 1.6 }); A.shake(tC, 0.03, 0.12);
      FX.ring(A, { t: tC - 0.02, at: o, dir: A.fwd(tC), r0: 0.1, r1: 0.7, dur: 0.22, col: C.moon, op: 0.8, w: 0.16 }); FX.spark(A, { t: tC - 0.02, at: o, r: 0.5, col: C.moon }); // the clap
    } };
}
// F8 Night Flight (big): he takes wing 2.5 s, untouchable, 50% faster; three dives on the foe nearest the pointer: 14 within 1.5 u each; he lands with the last, in the cape pose
{ const ds = [[1.1, 0.2], [1.75, -0.45], [1.6, 0.85]]; const t0 = 0.3; const dv = [t0 + 0.75, t0 + 1.4, t0 + 2.05];
  const air = [[-1.2, -0.8], [2.6, -1.3], [0.2, 1.4]];
  DEFS.F8 = { T: 4.2, cam: { x: 0.4, z: -0.8, w: 7.5, y: 0.9 }, her: H(-1.8, 0),
    seq: [[t0, 'flare'], [t0 + 0.25, 'fly', { loop: true, until: dv[0] - 0.12 }], [dv[0] - 0.12, 'streak'], [dv[0] + 0.02, 'pull'], [dv[0] + 0.3, 'fly', { loop: true, until: dv[1] - 0.12 }], [dv[1] - 0.12, 'streak'], [dv[1] + 0.02, 'pull'], [dv[1] + 0.3, 'fly', { loop: true, until: dv[2] - 0.12 }], [dv[2] - 0.12, 'streak'], [dv[2] + 0.02, 'cape', { from: 0.1 }]],
    root: [{ t: t0 + 0.15 }, { t: t0 + 0.55, x: air[0][0], z: air[0][1], y: 1.6, pitch: 25, e: 'out' },
      { t: dv[0] - 0.12, x: air[0][0] + 0.6, z: air[0][1], y: 1.7, look: ds[0], pitch: 25 }, { t: dv[0], x: ds[0][0] - 0.3, z: ds[0][1], y: 0.15, pitch: 70, e: 'in2' }, { t: dv[0] + 0.3, x: air[1][0], z: air[1][1], y: 1.5, pitch: 25, roll: 360, e: 'out' },
      { t: dv[1] - 0.12, x: air[1][0] - 0.2, z: air[1][1] + 0.1, y: 1.6, look: ds[1], roll: 360 }, { t: dv[1], x: ds[1][0] + 0.25, z: ds[1][1] - 0.25, y: 0.15, pitch: 70, roll: 360, e: 'in2' }, { t: dv[1] + 0.3, x: air[2][0], z: air[2][1], y: 1.5, pitch: 25, roll: 720, e: 'out' },
      { t: dv[2] - 0.12, x: air[2][0] + 0.1, z: air[2][1] - 0.1, y: 1.6, look: ds[2], roll: 720 }, { t: dv[2], x: ds[2][0] - 1.05, z: ds[2][1] + 0.1, y: 0, pitch: 0, roll: 720, e: 'in2' }],
    dum: ds,
    fx(A) { dv.forEach((t, k) => { const tgt = ds[k]; ds.forEach((p, i) => { if (Math.hypot(p[0] - tgt[0], p[1] - tgt[1]) <= 1.5) A.hit(i, t + 0.01 * i, 14, { big: i === k }); });
        FX.claw(A, { t, at: { d: k, y: 0.7 }, roll: k % 2 ? 0.5 : -0.5, n: 4, size: 1.05, bend: 0.14 }); FX.ring(A, { t, at: [tgt[0], 0, tgt[1]], r0: 0.3, r1: 1.5, dur: 0.4, col: C.rose, op: 0.7 }); FX.dust(A, { t, at: [tgt[0], 0, tgt[1]], n: 8, sp: 1.2 }); A.shake(t, 0.06, 0.18);
        FX.trail(A, { of: 'chest', t0: t - 0.12, t1: t, len: 0.12, w: 0.3, col: C.plum, op: 0.6 }); });
      A.cap(t0 + 0.3, dv[2] + 0.1, '飞行中无敌，移速 +50%', 'In the air: untouchable, 50% faster');
      FX.trail(A, { of: 'tipL', t0: t0 + 0.3, t1: dv[2], len: 0.2, w: 0.08, op: 0.35, col: C.moon }); FX.trail(A, { of: 'tipR', t0: t0 + 0.3, t1: dv[2], len: 0.2, w: 0.08, op: 0.35, col: C.moon });
    } };
}

// ================================================================ Blood 血
// F9 Bloodbite: a deep bite: 20 to up to 2 foes, 80°, 0.95 u; half comes back
{ const ds = [[-0.6, -0.35], [-0.45, 0.45]]; const t0 = 0.3, tB = t0 + 0.46;
  DEFS.F9 = { T: 2.4, cam: { x: -0.6, z: 0, w: 4.8 }, her: H(-1.5, 0.05), seq: [[t0, 'castPlant']], dum: ds,
    fx(A) { ds.forEach((p, i) => { A.hit(i, tB + 0.02 * i, 20, { big: true }); FX.bite(A, { t: tB + 0.02 * i, at: { d: i, y: 0.6 }, size: 0.52 }); drink(A, tB + 0.08, { d: i, y: 0.6 }, i ? 0 : 20, { drops: 7, hang: 0.25 }); });
      FX.thread(A, { t0: tB + 0.05, t1: tB + 0.5, from: { d: 0, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.03 }); FX.thread(A, { t0: tB + 0.07, t1: tB + 0.5, from: { d: 1, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.03 });
      A.shake(tB, 0.05, 0.16); A.cap(tB + 0.3, 2.2, '一半回血', 'Half comes back');
    } };
}
// F10 Open Vein: one claw drawn slowly back, then a single fast line: 10; it bleeds 3 each half second for 4 s, double while it moves
{ const d0 = [-0.45, 0]; const t0 = 0.3, tV = t0 + 0.44;
  DEFS.F10 = { T: 5.0, cam: { x: 0.1, z: 0, w: 5.6 }, her: H(-1.4, 0), seq: [[t0, 'vein'], [1.4, 'idle']], dum: [d0],
    fx(A) { A.hit(0, tV, 10, { big: true }); FX.claw(A, { t: tV, at: { d: 0, y: 0.62 }, roll: -0.35, n: 1, len: 1.7, wid: 0.03, size: 0.6, open: 0.05, life: 4.4, bend: 0.04 }); FX.trail(A, { of: 'handR', t0: tV - 0.08, t1: tV + 0.05, len: 0.1, w: 0.06, op: 0.6 });
      A.status(0, tV, 'bleed', 4, { rate: 7 });
      A.move(0, 2.4, [1.6, -0.2], 1.4, 's');
      for (let k = 1; k <= 8; k++) { const tk = tV + 0.5 * k, mv = tk > 2.4 && tk < 3.85; A.hit(0, tk, mv ? 6 : 3, { col: mv ? C.rose : '#E7A0A8' }); }
      A.cap(tV + 0.2, 2.3, '流血：每半秒 3', 'Bleed: 3 each half second'); A.cap(2.4, 3.9, '它在走动：翻倍', 'While it moves: double');
    } };
}
// F11 Blood Lance: he bites his wing claw, draws a thread between both claws like a bowstring and throws: a lance 6 u through every foe: 14; a thread from the first foe heals him 4
{ const ds = [[-0.2, 0.05], [1.2, -0.1], [2.6, 0.1]]; const t0 = 0.3, tT = t0 + 0.7;
  DEFS.F11 = { T: 2.8, cam: { x: 0.4, z: 0, w: 6.6 }, her: H(-1.7, 0), seq: [[t0, 'lance']], dum: ds,
    fx(A) { const T = A.THREE; FX.drops(A, { t: t0 + 0.24, at: (t) => A.at('mouth', t), n: 5, sp: 0.4, up: 0.2, size: 0.035 });
      FX.thread(A, { t0: t0 + 0.4, t1: tT - 0.02, from: (t) => A.at('handR', t), to: (t) => A.at('handL', t), w: 0.03, grow: 0.15, per: 0.25 });
      const o = A.ahead(tT, 0.5, 0.55), e = A.ahead(tT, 6.2, 0.55); const lm = A.add(new T.Mesh(A.streakGeo, A.mat(C.blood, A.F.STREAK))); const gl = A.add(new T.Mesh(A.streakGeo, A.mat(C.rose, A.F.STREAK)));
      A.fx((t) => { const a = t - tT, d = 0.3; const on = a >= 0 && a < d + 0.15; lm.visible = gl.visible = on; if (!on) return; const u = clamp(a / d); const p = o.clone().lerp(e, EASE.out2(u)), q = o.clone().lerp(e, Math.max(0, EASE.out2(u) - 0.16));
        for (const [m, w, op] of [[lm, 0.13, 1], [gl, 0.42, 0.45]]) { m.position.copy(q); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); m.scale.set(w, w, p.distanceTo(q) + 1e-3); m.material.uniforms.op.value = op * (a > d ? 1 - (a - d) / 0.15 : 1); } });
      for (let k = 0; k < 14; k++) FX.drops(A, { t: tT + 0.3 * k / 14, at: o.clone().lerp(e, EASE.out2(k / 14)), n: 1, sp: 0.3, up: 0.4, size: 0.04, seed: k + 3 });
      ds.forEach((p, i) => { const u = (p[0] - o.x) / (e.x - o.x), th = tT + 0.3 * Math.pow(u, 0.8) * 0.75; A.hit(i, th, 14, { dir: [1, 0] }); FX.claw(A, { t: th, at: { d: i, y: 0.6 }, roll: 1.5, n: 1, len: 1.1, size: 0.5 }); FX.ring(A, { t: th, at: { d: i, y: 0.6 }, dir: e.clone().sub(o), r0: 0.08, r1: 0.55, dur: 0.28, col: C.rose, op: 0.8, w: 0.2 }); FX.drops(A, { t: th, at: { d: i, y: 0.6 }, n: 6, sp: 1.2, up: 0.5 }); });
      const th0 = tT + 0.03; FX.thread(A, { t0: th0, t1: th0 + 1.0, from: { d: 0, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.03, per: 0.3 }); A.heal(th0 + 0.35, 4);
    } };
}
// F12 Bat Swarm: small bats pour out of his shadow onto a spot within 4.5 u, 1.3 u wide, 4 s: 5 a second, slow 20%; a quarter comes back
{ const ds = [[1.1, 0.2], [1.6, -0.35], [1.5, 0.75]]; const t0 = 0.3, tS = t0 + 0.42, c = [1.45, 0.2];
  DEFS.F12 = { T: 5.0, cam: { x: 0.2, z: 0, w: 6.2 }, her: H(-1.7, 0), seq: [[t0, 'flare'], [t0 + 0.5, 'idle']], dum: ds,
    fx(A) { FX.blink(A, { t: t0 + 0.12, dur: 0.32, from: A.body(t0, 0.1), to: [c[0], 0.5, c[1]], n: 14, size: 1.5, puff: false });
      FX.swarm(A, { t0: tS, t1: tS + 4.0, at: [c[0], 0.1, c[1]], r: 1.3, n: 26, h: 1.0, w: 3.2, both: true, size: 1.7 });
      FX.disc(A, { t: tS, at: [c[0], 0, c[1]], r0: 1.2, r1: 1.3, dur: 4.0, hold: true, col: C.plum, op: 0.35, normal: true });
      ds.forEach((p, i) => { A.status(i, tS, 'slow', 4.0); for (let s = 1; s <= 4; s++) A.hit(i, tS + s - 0.02 * i, 5, { col: '#E7A0A8' }); });
      for (let s = 1; s <= 4; s++) { A.heal(tS + s + 0.15, 4); FX.drops(A, { t: tS + s - 0.25, at: [c[0], 0.6, c[1]], n: 4, to: (t) => A.at('mouth', t), hang: 0.1, fly: 0.3, size: 0.04, sp: 0.8 }); }
      A.cap(tS + 0.2, tS + 4, '每秒 5，减速 20%，四分之一回血', '5 a second, slow 20%, a quarter comes back');
    } };
}
// F13 Blood Spikes: he leaps and drives a claw into the floor: blood spikes run 5 u, 1 u wide, each taller than the last: 16, launched 0.4 s
{ const ds = [[0.0, 0.25], [1.3, -0.25], [2.6, 0.1]]; const t0 = 0.3, tS = t0 + 0.36;
  DEFS.F13 = { T: 2.7, cam: { x: 0.5, z: 0, w: 6.6 }, her: H(-1.6, 0), seq: [[t0, 'floorStab'], [t0 + 0.9, 'idle']], root: [{ t: t0 + 0.1 }, { t: t0 + 0.36, fw: 0.3, jump: 0.35, e: 'lin' }], dum: ds,
    fx(A) { const o = A.ahead(tS, 0.5, 0), f = A.fwd(tS); A.shake(tS, 0.06, 0.2); FX.ring(A, { t: tS, at: o, r0: 0.1, r1: 0.7, dur: 0.3, col: C.blood, op: 0.7, normal: true }); FX.dust(A, { t: tS, at: o, n: 6 });
      for (let i = 0; i < 13; i++) { const u = i / 12, d = 0.15 + u * 4.85, ts = tS + 0.02 + u * 0.32; for (const s of [-1, 1]) { const sx = (i % 2 ? 0.2 : 0.32) * s; FX.spike(A, { t: ts, at: [o.x + f.x * d - f.z * sx, 0, o.z + f.z * d + f.x * sx], h: 0.35 + 0.65 * u, w: 0.8 + 0.6 * u, life: 0.7, tilt: [0, s * 0.25], burst: i % 3 === 0 }); } }
      ds.forEach((p, i) => { const u = (p[0] - o.x - 0.15) / 4.85; A.hit(i, tS + 0.02 + u * 0.32, 16, { up: 0.9 }); });
    } };
}
// F14 Blood Mist: he bursts into red mist, 2 u wide, 1.5 s: untouchable, drifting at 70% speed; foes inside take 4 each half second, slowed 30%
{ const ds = [[0.2, -0.45], [0.75, 0.55], [1.4, -0.1]]; const t0 = 0.3, t1 = t0 + 0.16, t2 = t1 + 1.5;
  DEFS.F14 = { T: 3.4, cam: { x: 0.1, z: 0, w: 6.2 }, her: H(-1.3, 0), seq: [[t0, 'wrap'], [t2, 'cape', { from: 0.0 }]], root: [{ t: t1 }, { t: t2, fw: 2.1, e: 'lin' }], hide: [[t1, t2]], dum: ds,
    fx(A) { FX.mist(A, { t0: t1 - 0.05, t1: t2 + 0.1, at: (t) => A.body(t, 0), r: 1.0, n: 26, h: 1.0, op: 0.5 });
      A.post((t, x, W, H2, k) => {}); bolt(A, { t: t1 + 0.3, d: 2, dur: 0.4, to: (tt) => { const p = A.body(t1 + 0.7, 0.6); return [p.x, p.y, p.z]; } });
      ds.forEach((p, i) => { for (let s = 0; s < 3; s++) { const ts = t1 + 0.25 + 0.5 * s; const r = A.rootAt(ts); if (Math.hypot(p[0] - r.x, p[1] - r.z) < 1.15) { A.hit(i, ts + 0.03 * i, 4, { col: '#E7A0A8' }); A.status(i, ts, 'slow', 0.6); } } });
      A.cap(t1, t2, '无敌，慢慢飘动', 'Untouchable, drifting');
      FX.smoke(A, { t: t2 - 0.05, at: (t) => A.body(t2, 0.3), n: 8, r: 0.3, size: 0.4, dur: 0.5, op: 0.5, col: '#7A1424', col2: C.rose });
    } };
}
// F15 Boiling Blood: 5 s: basic attacks 40% faster; each basic hit splashes: 3 to the foes within 1 u of it
{ const ds = [[-0.3, 0.0], [0.15, 0.7], [0.2, -0.65]]; const t0 = 0.3, tA = t0 + 1.05, sp = 1.4;
  const hitT = [0.10, 0.24, 0.46].map((x) => tA + x / sp); const hitT2 = [0.10, 0.24, 0.46].map((x) => tA + 0.62 / sp + x / sp);
  DEFS.F15 = { T: 3.4, cam: { x: -0.4, z: 0, w: 5.2 }, her: H(-1.25, 0), seq: [[t0, 'boil'], [tA, 'combo', { speed: sp, to: 0.62 }], [tA + 0.62 / sp, 'combo', { speed: sp, to: 0.62, fade: 0.05 }]], dum: ds,
    fx(A) { FX.smoke(A, { t: t0 + 0.4, at: (t) => A.body(t, 0.2), follow: true, n: 22, r: 0.35, h: 0.8, size: 0.16, dur: 2.6, spread: 2.4, op: 0.55, col: C.blood, col2: C.rose, rise: 0.8, out: 0.1 });
      A.post((t, x, W, H2, k) => { if (t < t0 + 0.42 || t > 3.3) return; /* eyes burn rose */ });
      [...hitT, ...hitT2].forEach((t, i) => { const j = i % 3; if (j === 2) { A.hit(0, t, 6, { big: true }); FX.bite(A, { t, at: { d: 0, y: 0.6 }, size: 0.4 }); } else claw(A, t, 0, 4, { roll: j ? 0.95 : -0.95, of: j ? 'handL' : 'handR' });
        A.hit(1, t + 0.04, 3, { col: '#E7A0A8' }); A.hit(2, t + 0.05, 3, { col: '#E7A0A8' }); FX.drops(A, { t: t + 0.02, at: { d: 0, y: 0.6 }, n: 8, sp: 2.0, up: 0.6, size: 0.05 }); FX.ring(A, { t, at: { d: 0, y: -0.58 }, r0: 0.2, r1: 1.0, dur: 0.3, col: C.blood, op: 0.6, normal: true }); });
      A.cap(t0 + 0.5, 3.3, '普攻快 40%，每下溅射 3', 'Basic attacks 40% faster, each splashes 3');
      A.hud(comboHud(countAt([...hitT, ...hitT2])));
    } };
}
// F16 Blood Moon (big): a red moon over him: 30 to up to 10 foes within 2.4 u, blinded 1.5 s; 35% comes back
{ const ds = fan(6, 1.9, 0, 300, -0.3, 0); const t0 = 0.3, tC = t0 + 1.15;
  DEFS.F16 = { T: 3.6, cam: { x: -0.3, z: -0.2, w: 7.0, y: 0.9 }, her: H(-0.3, 0), seq: [[t0, 'moonRise']], root: [{ t: t0 + 0.2 }, { t: t0 + 0.9, y: 0.7, e: 'out' }, { t: tC, y: 0.75 }, { t: tC + 0.25, y: 0, e: 'in' }], dum: ds,
    fx(A) { FX.moon(A, { t0: t0 + 0.3, t1: tC + 1.6, at: (t) => { const r = A.rootAt(t); return [r.x, 1.9 + r.y * 0.4, r.z - 1.0]; }, r: 0.85, grow: 0.8, op: 0.92 });
      A.dark(tC - 0.05, tC + 0.15, 0.55, 0.05, 0.4, { eyes: false }); A.shake(tC, 0.07, 0.25);
      FX.ring(A, { t: tC + 0.02, at: [-0.3, 0, 0], r0: 0.3, r1: 2.4, dur: 0.5, col: C.blood, op: 0.9, w: 0.25, normal: true }); FX.ring(A, { t: tC + 0.12, at: [-0.3, 0, 0], r0: 0.2, r1: 2.2, dur: 0.5, col: C.rose, op: 0.6 });
      // the moon strikes: a beam of red light falls on each foe in turn, a breath before it is hit
      const mAt = (t) => { const r = A.rootAt(t); return A.THREE ? new A.THREE.Vector3(r.x, 1.9 + r.y * 0.4, r.z - 1.0) : null; };
      ds.forEach((p, i) => FX.thread(A, { t0: tC - 0.04 + 0.015 * i, t1: tC + 0.2 + 0.015 * i, from: mAt, to: { d: i, y: 0.7 }, w: 0.06, grow: 0.06, per: 0.2 }));
      FX.disc(A, { t: tC + 0.05, at: [-0.3, 0, 0], r0: 1.2, r1: 2.4, hold: true, dur: 1.5, col: C.blood, op: 0.18, normal: true });
      ds.forEach((p, i) => { A.hit(i, tC + 0.1 + 0.015 * i, 30, { big: true, blind: 1.5 }); FX.thread(A, { t0: tC + 0.2, t1: tC + 0.9, from: { d: i, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.025, per: 0.35 }); });
      A.heal(tC + 0.6, 63, { big: true }); A.cap(tC + 0.2, 3.5, '6 个敌人 × 30，35% 回血', '6 foes × 30, 35% comes back');
    } };
}

// ================================================================ Night 夜
// F17 Dusk Dive: a dive up to 3.6 u, untouchable: 16 to up to 5 foes within 1.2 u of where he lands
{ const c = [1.3, 0]; const ds = fan(4, 1.05, 20, 340, c[0], c[1]); const t0 = 0.3, tL = t0 + 0.56;
  DEFS.F17 = { T: 2.6, cam: { x: 0.1, z: 0, w: 6.4, y: 0.6 }, her: H(-2.1, 0), seq: [[t0, 'dive']], root: [{ t: t0 + 0.12 }, { t: tL, fw: 3.4, y: 0, jump: 1.2, e: 'lin' }], dum: ds,
    fx(A) { ds.forEach((p, i) => A.hit(i, tL + 0.01 * i, 16, { knock: [(p[0] - c[0]) * 0.3, (p[1] - c[1]) * 0.3] }));
      FX.ring(A, { t: tL, at: 'him', r0: 0.2, r1: 1.4, dur: 0.45, col: C.rose, op: 0.8 }); FX.ring(A, { t: tL + 0.03, at: 'him', r0: 0.1, r1: 1.0, dur: 0.4, col: C.plum, op: 0.8, normal: true }); FX.dust(A, { t: tL, at: 'him', n: 12, sp: 1.4 });
      // the rose star where he lands
      for (let k = 0; k < 4; k++) FX.tube(A, { t: tL, dur: 0.12, hold: 0.1, out: 0.3, flat: true, w: (u) => 0.22 * (1 - u), col: C.rose, op: 0.8, pts: () => { const T = A.THREE, r = A.rootAt(tL), a = k * Math.PI / 2 + 0.4; return [new T.Vector3(r.x, 0.03, r.z), new T.Vector3(r.x + Math.cos(a) * 1.25, 0.03, r.z + Math.sin(a) * 1.25)]; } });
      FX.trail(A, { of: 'chest', t0: t0 + 0.4, t1: tL, len: 0.14, w: 0.32, col: C.plum, op: 0.5 }); A.shake(tL, 0.06, 0.2); A.cap(t0 + 0.15, tL, '无敌', 'Untouchable');
    } };
}
// F18 Blink Strike: his ears flick to it; he blinks behind one foe within 5 u and stabs with a wing claw: 22, always a backstab. He looks back over his shoulder
{ const d0 = [1.2, 0]; const t0 = 0.3, tB = t0 + 0.2, b = around(d0, 0, 0.7);
  DEFS.F18 = { T: 2.6, cam: { x: -0.1, z: 0, w: 5.8 }, her: H(-2.0, 0), seq: [[t0, 'standFace'], [tB + 0.08, 'stab', { fade: 0.02 }]], root: [{ t: tB }, { t: tB + 0.08, x: b[0], z: b[1], look: d0, cut: true }], hide: [[tB, tB + 0.08]], dum: [d0],
    fx(A) { FX.blink(A, { t: tB, dur: 0.08, from: A.body(tB - 0.02), to: A.body(tB + 0.1) }); const tS = tB + 0.13;
      claw(A, tS, 0, 22, { back: true, big: true, roll: 1.3, mark: { n: 1, len: 1.3, wid: 0.05, size: 0.6 }, col: C.rose }); FX.spark(A, { t: tS, at: { d: 0, y: 0.6 }, r: 0.7, col: C.moon }); A.shake(tS, 0.05, 0.15);
      A.cap(tS, 2.5, '必定背刺', 'Always a backstab');
    } };
}
// F19 Flit: a back somersault into bats, 2.8 u away from the aim, untouchable; a puff of night stays 2 s: 4 a second, blind 1 s
{ const d0 = [0.25, 0]; const t0 = 0.4;
  DEFS.F19 = { T: 3.2, cam: { x: -1.2, z: 0, w: 6.2 }, her: H(-0.4, 0), seq: [[t0, 'flip'], [t0 + 0.5, 'emerge', { from: 0.07 }]], root: [{ t: t0 + 0.08 }, { t: t0 + 0.2, fw: -0.4, y: 0.35, pitch: -160, e: 'out' }, { t: t0 + 0.32, fw: -2.6, y: 0.35, pitch: -200, cut: true }, { t: t0 + 0.48, fw: -2.8, y: 0, pitch: -360, e: 'in' }],
    hide: [[t0 + 0.2, t0 + 0.32]], dum: [d0],
    fx(A) { const p = A.body(t0 + 0.2, 0.1); FX.blink(A, { t: t0 + 0.2, dur: 0.12, from: A.body(t0 + 0.2, 0.4), to: A.body(t0 + 0.34, 0.4), puff: false });
      FX.smoke(A, { t: t0 + 0.2, at: p, n: 26, r: 0.55, h: 0.9, size: 0.55, dur: 2.0, spread: 0.3, op: 0.7, rise: 0.15, out: 0.25 });
      bolt(A, { t: t0 - 0.1, d: 0, dur: 0.45, to: [-1.0, 0.6, 0] });
      FX.swarm(A, { t0: t0 + 0.22, t1: t0 + 2.2, at: [p.x, 0.15, p.z], r: 0.45, n: 8, w: 4, h: 0.7, size: 1.0, both: true, seed: 91 }); // a few bats stay in the puff
      for (let s = 0; s < 2; s++) A.hit(0, t0 + 0.6 + s, 4, { col: '#C9B6D6' }); A.status(0, t0 + 0.25, 'blind', 1.0);
      A.cap(t0 + 0.3, t0 + 2.3, '夜雾 2 秒：每秒 4，致盲 1 秒', 'The puff, 2 s: 4 a second, blind 1 s');
    } };
}
// F20 Nightfall: darkness round him: 6 to up to 8 foes within 2 u, blinded 2 s
{ const ds = fan(6, 1.55, 15, 330, -0.4, 0); const t0 = 0.3, tC = t0 + 0.6;
  DEFS.F20 = { T: 3.4, cam: { x: -0.4, z: 0, w: 6.0 }, her: H(-0.4, 0), seq: [[t0, 'castBloom']], dum: ds,
    fx(A) { FX.dome(A, { t0: tC, t1: tC + 2.0, at: 'him', r: 2.0, op: 0.75 }); FX.sigil(A, { t0: tC, t1: tC + 2.0, at: 'him', floor: true, r: 1.2, op: 0.5 });
      FX.smoke(A, { t: tC, at: A.body(tC, 0), n: 28, r: 1.6, h: 0.8, size: 0.6, dur: 1.4, spread: 0.2, op: 0.55, rise: 0.2, out: 0.2 });
      ds.forEach((p, i) => A.hit(i, tC + 0.06 + 0.01 * i, 6, { blind: 2.0 })); FX.ring(A, { t: tC, at: 'him', r0: 0.3, r1: 2.0, dur: 0.35, col: C.rose, op: 0.6 });
      A.cap(tC + 0.1, tC + 2.2, '致盲 2 秒', 'Blinded 2 s');
    } };
}
// F21 Echo Screech: a screech down a 70° cone, 2.6 u: 10 to up to 6 foes; each takes 25% more for 3 s
{ const ds = fan(3, 1.6, 38, -38, -1.0, 0); const t0 = 0.3, tC = t0 + 0.42;
  DEFS.F21 = { T: 3.4, cam: { x: -0.2, z: 0, w: 5.4 }, her: H(-1.9, 0), seq: [[t0, 'castPoint'], [1.95, 'clawR'], [2.45, 'clawL']], root: [{ t: 1.6 }, { t: 1.95, fw: 0.95, e: 'out' }], dum: ds,
    fx(A) { const o = A.at('mouth', tC); for (let k = 0; k < 4; k++) FX.crescent(A, { t: tC + 0.075 * k, dur: 0.4, e: 'out', R: 0.4, th: 0.032, arc: 1.25, glow: C.moon, glowOp: 0.28, col: k % 2 ? C.rose : C.moon, op: 0.9 - 0.12 * k, path: (u) => { const r = 0.2 + 2.4 * u; const f = A.fwd(tC); return new A.THREE.Vector3(o.x + f.x * r, o.y - 0.1 * u, o.z + f.z * r); }, scale: (u) => Math.max(0.9, 3.0 * (0.2 + 2.4 * u)), grow: true });
      FX.ring(A, { t: tC - 0.02, at: o, dir: A.fwd(tC), r0: 0.05, r1: 0.35, dur: 0.22, col: C.moon, op: 0.8, w: 0.2 }); FX.ring(A, { t: tC + 0.06, at: o, dir: A.fwd(tC), r0: 0.05, r1: 0.45, dur: 0.25, col: C.rose, op: 0.6, w: 0.15 });
      // the crescents widen as they go: scale them by distance
      ds.forEach((p, i) => { A.hit(i, tC + 0.15, 10); FX.sigil(A, { t0: tC + 0.15, t1: tC + 3.1, at: { d: i, y: 1.35 }, r: 0.16, op: 0.7, col: C.rose }); });
      claw(A, 2.1, 1, 15, { of: 'handR' }); claw(A, 2.6, 1, 15, { roll: 0.95, of: 'handL' }); A.cap(2.0, 3.3, '12 → 15（受伤 +25%）', '12 → 15 (25% more)');
    } };
}
// F22 Shadow Veil: the dark folds round him: a shield of 18 for 3 s; 8 to up to 4 foes within 1.2 u
{ const ds = [[-0.4, 0.4], [-0.35, -0.5], [1.8, 0.2]]; const t0 = 0.3, tC = t0 + 0.2;
  DEFS.F22 = { T: 3.8, cam: { x: -0.4, z: 0, w: 5.6 }, her: H(-1.1, 0), seq: [[t0, 'wrap'], [t0 + 0.32, 'emerge', { from: 0.05 }]], dum: ds,
    fx(A) { const hits = [tC + 0.8, tC + 1.5, tC + 2.2]; FX.shield(A, { t0: tC, t1: tC + 3.0, r: 0.7, op: 0.45, hits }); FX.ring(A, { t: tC, at: 'him', r0: 0.2, r1: 1.2, dur: 0.35, col: C.plum, op: 0.8, normal: true });
      FX.smoke(A, { t: tC, at: A.body(tC, 0), n: 14, r: 0.9, h: 0.6, size: 0.4, dur: 0.6, op: 0.6 }); [0, 1].forEach((i) => A.hit(i, tC + 0.06, 8));
      hits.forEach((h, k) => { bolt(A, { t: h - 0.4, d: 2, dur: 0.4, to: (() => { const p = A.body(h, 0.6); return [p.x + 0.55, p.y, p.z]; })() }); A.say(h, '-6', { col: C.shield }); });
      A.post((t, x, W, H2, k, lang) => { if (t < tC || t > tC + 3.0) return; const left = Math.max(0, 18 - 6 * [tC + 0.8, tC + 1.5, tC + 2.2].filter((h) => h <= t).length); x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.shield; x.fillText((lang === 'en' ? 'Shield ' : '护盾 ') + left, W - 14 * k, 28 * k); });
      A.cap(tC + 0.1, tC + 3.0, '护盾 18，3 秒', 'A shield of 18 for 3 s');
    } };
}
// F23 Roost: he hangs a shade of himself where he stands, 6 s. Press again: he bursts into bats and gathers there, untouchable; 10 to the foes within 1.5 u of where he left
{ const ds = [[1.4, 0.15], [1.9, -0.5]]; const t0 = 0.3, tH = t0 + 0.32, tR = 2.7;
  DEFS.F23 = { T: 4.0, cam: { x: 0.1, z: 0, w: 6.4, y: 0.6 }, her: H(-1.8, 0), seq: [[t0, 'kickUp'], [tH, 'idle', { fade: 0.15 }], [tH + 0.3, 'run', { loop: true, until: 1.5 }], [1.5, 'clawR'], [2.05, 'clawL'], [tR + 0.12, 'emerge', { from: 0.07 }]],
    root: [{ t: tH + 0.3 }, { t: 1.5, fw: 2.55, e: 's' }, { t: tR }, { t: tR + 0.12, fw: 0, cut: true }], hide: [[tR, tR + 0.12]], dum: ds,
    fx(A) { const spot = A.rootAt(tH); A.ghost((t) => (t >= tH && t < tR + 0.1 ? [{ clip: 'hang', ct: t, root: { x: spot.x, z: spot.z, y: 0.95, yaw: spot.yaw, pitch: Math.PI, roll: 0 }, op: 0.55, tint: C.plum, col: C.plum, glow: 0.25 }] : []));
      FX.smoke(A, { t: tH, at: A.body(tH, 0.6), n: 8, r: 0.25, size: 0.3, dur: 0.6, op: 0.5 });
      claw(A, 1.65, 0, 10, { of: 'handR' }); claw(A, 2.2, 1, 10, { roll: 0.95, of: 'handL' });
      FX.blink(A, { t: tR, dur: 0.12, from: A.body(tR - 0.02), to: [spot.x, 0.45, spot.z] }); [0, 1].forEach((i) => A.hit(i, tR + 0.02, 10)); FX.ring(A, { t: tR, at: A.body(tR - 0.02, 0), r0: 0.2, r1: 1.5, dur: 0.4, col: C.rose, op: 0.7 });
      A.post((t, x, W, H2, k) => { if (t < tR - 0.25 || t > tR + 0.05) return; /* the shade opens its eyes */ const p = A.at('eyeL', 0); });
      A.cap(tH, 1.4, '留下影子 6 秒', 'A shade hangs 6 s'); A.cap(tR - 0.1, 3.9, '再按：回到影子，无敌', 'Press again: back to it, untouchable');
    } };
}
// F24 Death Mark (big): he sinks into one foe's shadow within 4 u and rises behind it: 12. For 3 s the mark keeps 35% of what he deals to it, then tears open for that much, through all defence
{ const d0 = [0.6, 0]; const t0 = 0.3, tS = t0 + 0.4, b = around(d0, 0, 0.55), tUp = tS + 0.35;
  const hits = [[tUp + 0.4, 12], [tUp + 1.1, 14], [tUp + 1.6, 14], [tUp + 2.1, 14]]; const tear = tUp + 0.4 + 3.0;
  DEFS.F24 = { T: 4.9, cam: { x: 0.3, z: 0, w: 5.6 }, her: H(-1.6, 0), seq: [[t0, 'sink'], [tUp, 'riseBehind'], [tUp + 0.95, 'clawR'], [tUp + 1.45, 'clawL'], [tUp + 1.95, 'clawBoth'], [tear - 0.78, 'walk', { loop: true, until: tear - 0.26, fade: 0.12 }], [tear - 0.26, 'cape', { fade: 0.08 }]],
    root: [{ t: t0 + 0.1 }, { t: tS, y: -1.0, e: 'in' }, { t: tS + 0.01, x: b[0], z: b[1], y: -1.0, look: d0, cut: true }, { t: tUp + 0.25, x: b[0], z: b[1], y: 0, e: 'out' },
      // he turns his back on it and walks off; it tears open behind him
      { t: tear - 0.8, x: b[0], z: b[1], look: d0 }, { t: tear - 0.62, x: b[0] + 0.05, z: b[1], look: [b[0] + 2, b[1] - 0.25], e: 's' }, { t: tear - 0.24, x: b[0] + 0.62, z: b[1] - 0.07, look: [b[0] + 2, b[1] - 0.25], e: 'out' }], hide: [[tS, tS + 0.05]], dum: [d0],
    fx(A) { const T = A.THREE; FX.disc(A, { t: t0 + 0.05, at: [-1.6, 0, 0], r0: 0.3, r1: 0.7, dur: 0.6, col: C.ink, op: 0.9, normal: true }); FX.smoke(A, { t: t0 + 0.1, at: [-1.6, 0, 0], n: 10, r: 0.3, h: 0.3, size: 0.35, dur: 0.7, op: 0.6 });
      // the foe's own shadow stretches out behind it, and he stands up out of it
      const sh = A.add(new T.Mesh(A.ringGeo, A.mat(C.ink, A.F.DISCN, { normal: true }))); A.fx((t) => { const a = t - tS + 0.1; sh.visible = a >= 0 && t < tUp + 0.5; if (!sh.visible) return; const k = EASE.out(clamp(a / 0.3)); sh.position.set(d0[0] + 0.35 * k, 0.013, d0[1]); sh.scale.set(0.35 + 0.5 * k, 1, 0.4); sh.material.uniforms.op.value = 0.85 * Math.min(1, (tUp + 0.5 - t) / 0.2); });
      FX.smoke(A, { t: tUp - 0.05, at: [b[0], 0, b[1]], n: 12, r: 0.25, h: 0.6, size: 0.35, dur: 0.7, op: 0.6 });
      const bright = (t) => hits.filter((h) => h[0] <= t).length * 0.25;
      FX.sigil(A, { t0: hits[0][0], t1: tear, at: (t) => { const p = A.dpt(0, t, 0.72); return [p.x + 0.29, p.y, p.z]; }, r: 0.26, op: 0.8, bright });
      hits.forEach(([t, n], i) => claw(A, t, 0, n, { back: true, roll: [-0.4, -0.95, 0.95, 0.1][i], mark: i === 3 ? { n: 4 } : {}, col: C.rose }));
      const stored = Math.round(0.35 * hits.reduce((s, h) => s + h[1], 0));
      for (let i = 0; i < 4; i++) FX.claw(A, { t: tear + 0.02 * i, at: { d: 0, y: 0.62 }, roll: [-0.4, -0.95, 0.95, 0.1][i], n: 4, size: 0.62, pal: 'rose', life: 0.8 });
      // the beat before: the mark beats faster and cracks spread from it; the room dims; then it tears
      for (let j = 0; j < 3; j++) FX.claw(A, { t: tear - 0.42 + 0.13 * j, at: { d: 0, y: 0.64 + 0.04 * j }, roll: [1.3, -1.1, 0.2][j], n: 1, len: 0.7, size: 0.3 + 0.08 * j, pal: 'rose', life: 0.5 + 0.13 * (2 - j) });
      A.dark(tear - 0.3, tear + 0.12, 0.4, 0.25, 0.45, { eyes: true });
      FX.drops(A, { t: tear, at: { d: 0, y: 0.7 }, n: 18, sp: 1.8, up: 1.4, size: 0.055, dur: 0.75 }); FX.ring(A, { t: tear, at: { d: 0, y: 0.7 }, dir: [0, 0, 1], r0: 0.1, r1: 1.0, dur: 0.35, col: C.rose, op: 0.85, w: 0.16 });
      A.hit(0, tear, stored, { big: true, col: C.moon }); FX.ring(A, { t: tear, at: { d: 0, y: -0.58 }, r0: 0.2, r1: 1.3, dur: 0.5, col: C.rose, op: 0.8 }); FX.spark(A, { t: tear, at: { d: 0, y: 0.7 }, r: 1.0, col: C.rose }); A.shake(tear, 0.07, 0.22);
      A.post((t, x, W, H2, k, lang) => { if (t < hits[0][0] || t > tear + 0.6) return; const n = Math.round(0.35 * hits.filter((h) => h[0] <= t).reduce((s, h) => s + h[1], 0)); const left = Math.max(0, tear - t);
        x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.rose; x.fillText((lang === 'en' ? 'Mark ' : '死兆 ') + n + (left > 0 ? '  ' + left.toFixed(1) + 's' : ''), W - 14 * k, 28 * k); });
      A.cap(tUp, tUp + 0.9, '从它的影子里站起：12', 'Up out of its shadow: 12'); A.cap(tUp + 1.0, tear - 0.05, '印记存下 35%', 'The mark keeps 35%'); A.cap(tear, 4.85, '撕开：' + stored + '，无视防御', 'It tears: ' + stored + ', through all defence');
    } };
}

// ================================================================ passives
// F25 Night Wings: every second, 3 to the 3 nearest foes within 1.3 u
{ const ds = [[-0.3, 0.75], [0.3, -0.7], [0.9, 0.6], [1.6, -0.2]]; const t0 = 0.2;
  DEFS.F25 = { T: 4.4, cam: { x: 0.0, z: 0, w: 6.0 }, her: H(-1.9, 0), seq: [[t0, 'walk', { loop: true, until: 4.2 }]], root: [{ t: t0 }, { t: 4.2, fw: 3.6, e: 'lin' }], dum: ds,
    fx(A) { for (let s = 1; s <= 4; s++) { const ts = t0 + s * 0.95; const r = A.rootAt(ts); FX.ring(A, { t: ts, at: [r.x, 0, r.z], r0: 0.3, r1: 1.3, dur: 0.4, col: C.plum, op: 0.75, normal: true, w: 0.12 });
        ds.map((p, i) => [i, Math.hypot(p[0] - r.x, p[1] - r.z)]).filter((q) => q[1] <= 1.6).sort((a, b) => a[1] - b[1]).slice(0, 3).forEach(([i], j) => { const tip = j % 2 ? 'tipL' : 'tipR'; FX.thread(A, { t0: ts - 0.02, t1: ts + 0.12, from: (t) => A.at(tip, t), to: { d: i, y: 0.7 }, w: 0.035, grow: 0.06, per: 0.12 }); A.hit(i, ts + 0.05, 3); FX.claw(A, { t: ts + 0.05, at: { d: i, y: 0.62 }, n: 2, size: 0.32, roll: 1.2, drops: false, life: 0.4 }); FX.spark(A, { t: ts + 0.05, at: { d: i, y: 0.65 }, r: 0.3, col: C.rose }); }); }
      FX.trail(A, { of: 'tipL', t0: t0, t1: 4.2, len: 0.25, w: 0.06, op: 0.3, col: C.moon }); FX.trail(A, { of: 'tipR', t0: t0, t1: 4.2, len: 0.25, w: 0.06, op: 0.3, col: C.moon });
      A.cap(t0 + 0.6, 4.3, '每秒 3，最近 3 个敌人', '3 a second to the 3 nearest');
    } };
}
// F26 Blood Scent: a foe under 40% health carries a red wisp; he runs 20% faster while one is within 6 u, and his hits on it deal 20% more
{ const d0 = [1.6, 0]; const t0 = 0.3;
  DEFS.F26 = { T: 3.2, cam: { x: 0.0, z: 0, w: 6.4 }, her: H(-2.4, 0), seq: [[t0, 'run', { loop: true, until: 1.55, speed: 1.2 }], [1.55, 'clawR'], [2.1, 'clawL']], root: [{ t: t0 }, { t: 1.55, fw: 3.3, e: 'lin' }], dum: [d0],
    fx(A) { FX.smoke(A, { t: 0.0, at: { d: 0, y: 0.95 }, n: 14, r: 0.14, h: 0.6, size: 0.16, dur: 3.2, spread: 3.0, op: 0.55, col: C.blood, col2: C.rose, rise: 0.7, out: 0.2 });
      FX.trail(A, { of: 'footL', t0: t0, t1: 1.55, len: 0.2, w: 0.08, col: C.rose, op: 0.4 }); FX.trail(A, { of: 'footR', t0: t0, t1: 1.55, len: 0.2, w: 0.08, col: C.rose, op: 0.4 });
      claw(A, 1.7, 0, 12, { of: 'handR' }); claw(A, 2.25, 0, 12, { roll: 0.95, of: 'handL' });
      A.cap(t0, 1.5, '低于 40% 的敌人：跑速 +20%', 'A foe under 40%: 20% faster'); A.cap(1.6, 3.1, '打它 +20%：10 → 12', 'Hits on it +20%: 10 → 12');
    } };
}
// the player's pointer: a small arrow glides to a spot and taps it (a ring on the floor), for "the foe nearest the pointer"
export function pointer(A, t0, t1, to, from) { const T = A.THREE, v = new T.Vector3(); const P = (p) => (typeof p === 'number' ? A.dpt(p, t0, 0.0) : new T.Vector3(p[0], 0, p[1]));
  const end = P(to), beg = from ? P(from) : end.clone().add(new T.Vector3(1.2, 0, 1.0)); const tap = t0 + 0.32;
  FX.ring(A, { t: tap, at: [end.x, 0.02, end.z], r0: 0.15, r1: 0.62, dur: 0.38, col: C.parch, op: 0.65, w: 0.12 });
  A.post((t, x, W, H2, k) => { if (t < t0 || t > t1) return; const u = EASE.s(clamp((t - t0) / 0.3)); v.copy(beg).lerp(end, u); v.y = 0.15; v.project(A.cam);
    const px = (v.x + 1) / 2 * W, py = (1 - v.y) / 2 * H2, s = 15 * k * (t > tap && t < tap + 0.1 ? 0.85 : 1), al = Math.min(1, (t - t0) / 0.08, (t1 - t) / 0.15);
    x.save(); x.globalAlpha = al; x.translate(px, py); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, s * 1.25); x.lineTo(s * 0.33, s * 0.95); x.lineTo(s * 0.55, s * 1.45); x.lineTo(s * 0.75, s * 1.35); x.lineTo(s * 0.53, s * 0.88); x.lineTo(s * 0.95, s * 0.88); x.closePath();
    x.lineWidth = 2 * k; x.strokeStyle = 'rgba(20,14,18,0.9)'; x.stroke(); x.fillStyle = C.parch; x.fill(); x.restore(); }); }
// an ally (a teammate, slate blue): a tag over it, and its shot: a pale blue streak from it to a foe
export function allyTag(A, i, t0 = 0, t1 = 99) { const T = A.THREE, v = new T.Vector3(); A.post((t, x, W, H2, k, lang) => { if (t < t0 || t > t1) return; v.copy(A.dpt(i, t, 1.55)).project(A.cam);
  const px = (v.x + 1) / 2 * W, py = (1 - v.y) / 2 * H2; x.font = font(k, 13); x.textAlign = 'center'; x.lineWidth = 3 * k; x.strokeStyle = 'rgba(20,14,18,0.85)'; const s = lang === 'en' ? 'Ally' : '队友'; x.strokeText(s, px, py); x.fillStyle = '#A9C4E0'; x.fillText(s, px, py); }); }
export function allyShot(A, t, from, to, dur = 0.22) { const T = A.THREE; const m = A.add(new T.Mesh(A.streakGeo, A.mat('#A9C4E0', A.F.STREAK))); m.visible = false;
  A.fx((tt) => { const a = tt - t; const on = a >= 0 && a <= dur; m.visible = on; if (!on) return; const p0 = A.dpt(from, t, 0.8), p1 = A.dpt(to, t + dur, 0.7); const p = p0.clone().lerp(p1, a / dur), q = p0.clone().lerp(p1, Math.max(0, a / dur - 0.3));
    m.position.copy(q); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); m.scale.set(0.07, 0.07, p.distanceTo(q) + 1e-3); m.material.uniforms.op.value = 0.95; });
  FX.spark(A, { t: t + dur, at: { d: to, y: 0.7 }, r: 0.45, col: '#A9C4E0' }); }
