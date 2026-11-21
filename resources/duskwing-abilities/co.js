// The twelve combos (kit 1.2 section 6, notes N98): two moves meet and something more happens. One clip each.
import { FX, C, EASE, clamp, lerp } from './dw.js';
import { DEFS, FORMS, H, D2R, around, claw, fan, font } from './defs.js';
const TICK = '#E7A0A8';
const V = (A, x, y, z) => new A.THREE.Vector3(x, y, z);
// a lance of blood from o to e (Vector3s), with a rose glow
function lance(A, tT, o, e, oo = {}) { const T = A.THREE, d = oo.dur || 0.3, w = oo.w || 1;
  const lm = A.add(new T.Mesh(A.streakGeo, A.mat(oo.col || C.blood, A.F.STREAK))), gl = A.add(new T.Mesh(A.streakGeo, A.mat(oo.glow || C.rose, A.F.STREAK)));
  A.fx((t) => { const a = t - tT; const on = a >= 0 && a < d + 0.15; lm.visible = gl.visible = on; if (!on) return; const u = clamp(a / d);
    const p = o.clone().lerp(e, EASE.out2(u)), q = o.clone().lerp(e, Math.max(0, EASE.out2(u) - 0.18));
    for (const [m, ww, op] of [[lm, 0.13 * w, 1], [gl, 0.42 * w, 0.45]]) { m.position.copy(q); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); m.scale.set(ww, ww, p.distanceTo(q) + 1e-3); m.material.uniforms.op.value = op * (oo.op || 1) * (a > d ? 1 - (a - d) / 0.15 : 1); } }); }
// bleed ticks on dummy i at the given times, each n (a rose number when doubled)
const ticks = (A, i, ts, n, big) => ts.forEach((t) => A.hit(i, t, n, { col: big ? C.rose : TICK, noCombo: true }));

// C1 Pop the vein: Last Bite or Blood Spikes on a bleeding foe brings the rest of its bleed out at once
{ const d0 = [0, 0]; const t0 = 0.3, tV = t0 + 0.44, t1 = tV + 1.15, b2 = t1 + 0.44;
  DEFS.C1 = { T: 4.0, cam: { x: -0.5, z: 0, w: 5.0 }, her: H(-0.95, 0), seq: [[t0, 'vein'], [tV + 0.45, 'idle', { fade: 0.2 }], [t1, 'dart'], [t1 + 0.66, 'lick']],
    root: [{ t: tV + 0.45 }, { t: tV + 0.85, x: -1.65, z: 0, e: 's' }, { t: t1 + 0.14 }, { t: t1 + 0.24, pitch: 62, y: 0.25, e: 'out' }, { t: t1 + 0.42, x: -0.85, z: 0, pitch: 62, y: 0.25, e: 'lin' }, { t: t1 + 0.6, x: -0.62, z: 0, pitch: 0, y: 0, e: 'out' }],
    dum: [d0],
    fx(A) { A.hit(0, tV, 10, { big: true }); FX.claw(A, { t: tV, at: { d: 0, y: 0.62 }, roll: -0.35, n: 1, len: 1.7, wid: 0.03, size: 0.6, open: 0.05, life: 2.0, bend: 0.04 });
      A.status(0, tV, 'bleed', b2 - tV, { rate: 7 }); ticks(A, 0, [tV + 0.5, tV + 1.0], 3);
      A.hit(0, b2, 29, { big: true }); FX.bite(A, { t: b2, at: { d: 0, y: 0.6 }, size: 0.6 }); A.shake(b2, 0.05, 0.16);
      const tX = b2 + 0.32; A.hit(0, tX, 18, { big: true, col: C.rose, noCombo: true }); FX.drops(A, { t: tX, at: { d: 0, y: 0.6 }, n: 28, sp: 2.8, up: 1.1, size: 0.07 });
      FX.ring(A, { t: tX, at: { d: 0, y: 0.1 }, r0: 0.2, r1: 1.1, dur: 0.45, col: C.blood, op: 0.9, normal: true }); FX.ring(A, { t: tX + 0.04, at: { d: 0, y: 0.6 }, r0: 0.1, r1: 0.8, dur: 0.35, col: C.rose, op: 0.7 });
      A.post((t, x, W, H2, k, lang) => { if (t < tV || t > tX + 0.4) return; const left = t >= tX ? 0 : 24 - 3 * [tV + 0.5, tV + 1.0].filter((q) => q <= t).length; x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.rose; x.fillText((lang === 'en' ? 'Bleed left ' : '剩余流血 ') + left, W - 14 * k, 28 * k); });
      A.cap(tV, t1 + 0.3, '放血：4 秒共 24', 'Open Vein: 24 over 4 s'); A.cap(b2 - 0.1, tX, '绝命牙咬流血的敌人：24 → 29（+20%）', 'Last Bite on a bleeding foe: 24 → 29 (20% more)');
      A.cap(tX, 3.9, '剩下的流血一次爆出：18', 'The rest of the bleed comes out at once: 18');
    } };
}
// C2 Air bite: Bloodbite or Last Bite on a foe in the air slams it down: 50% more, and 10 to the foes within 1.5 u
{ const d0 = [-0.3, 0], d1 = [0.55, 0.75], d2 = [0.6, -0.7]; const t0 = 0.3, tS = t0 + 0.36, tB = tS + 0.24, tL = tB + 0.12;
  DEFS.C2 = { T: 3.0, cam: { x: -0.4, z: 0, w: 5.4, y: 0.8 }, her: H(-1.7, 0), seq: [[t0, 'floorStab'], [tS + 0.04, 'dart', { from: 0.3, fade: 0.03 }], [tB + 0.55, 'lick']],
    root: [{ t: t0 + 0.1 }, { t: tS, fw: 0.3, jump: 0.35, e: 'lin' }, { t: tS + 0.04 }, { t: tB, x: d0[0] - 0.5, z: 0, y: 0.7, pitch: 30, e: 'out' }, { t: tL + 0.2, x: d0[0] - 0.55, z: 0, y: 0, pitch: 0, e: 'in' }],
    dum: [d0, d1, d2],
    fx(A) { const o = A.ahead(tS, 0.5, 0), f = A.fwd(tS); A.shake(tS, 0.05, 0.16); FX.ring(A, { t: tS, at: o, r0: 0.1, r1: 0.6, dur: 0.3, col: C.blood, op: 0.7, normal: true });
      for (let i = 0; i < 6; i++) { const u = i / 5, d = 0.15 + u * 1.1, ts = tS + u * 0.1; for (const s of [-1, 1]) FX.spike(A, { t: ts, at: [o.x + f.x * d - f.z * 0.25 * s, 0, o.z + f.z * d + f.x * 0.25 * s], h: 0.4 + 0.5 * u, w: 0.9, life: 0.6, tilt: [0, s * 0.25], burst: i === 4 }); }
      A.hit(0, tS + 0.07, 16, { up: 1.1 });
      A.hit(0, tB, 30, { big: true }); FX.bite(A, { t: tB, at: (t) => A.dpt(0, t, 0.6), size: 0.6, follow: true }); A.launch(0, tB, -1); FX.trail(A, { of: 'mouth', t0: tS + 0.06, t1: tB, len: 0.14, w: 0.14, col: C.moon, op: 0.5 });
      [1, 2].forEach((i) => A.hit(i, tL + 0.02, 10, { knock: [0.2, i === 1 ? 0.25 : -0.25] }));
      FX.ring(A, { t: tL, at: { d: 0, y: -0.58 }, r0: 0.2, r1: 1.5, dur: 0.45, col: C.rose, op: 0.85 }); FX.ring(A, { t: tL + 0.04, at: { d: 0, y: -0.58 }, r0: 0.1, r1: 1.1, dur: 0.4, col: C.blood, op: 0.8, normal: true }); FX.dust(A, { t: tL, at: { d: 0, y: -0.6 }, n: 12, sp: 1.5 }); A.shake(tL, 0.09, 0.24);
      A.cap(tS, tB, '血棘挑飞：16', 'Blood Spikes launch it: 16'); A.cap(tB, 2.9, '空中血噬，把它砸下：20 → 30，1.5 u 内各 10', 'Bloodbite in the air slams it down: 20 → 30, and 10 within 1.5 u');
    } };
}
// C3 The swarm hunts the mark: while a foe carries Death Mark, Bat Swarm and Night Wings bite only that foe, twice as often
{ const d0 = [0.4, -0.75], c = [1.7, 0.55], d1 = [1.45, 0.3], d2 = [2.0, 0.85]; const tS = 0.95, tUp = tS + 0.75, b = around(d0, 0, 0.55), tM = tUp + 0.35;
  DEFS.C3 = { T: 4.9, cam: { x: 0.3, z: 0, w: 6.4 }, her: H(-1.6, 0), seq: [[0.1, 'idle'], [tS, 'sink'], [tUp, 'riseBehind'], [tUp + 1.2, 'clawR'], [tUp + 1.9, 'clawL']],
    root: [{ t: tS + 0.1 }, { t: tS + 0.4, y: -1.0, e: 'in' }, { t: tS + 0.41, x: b[0], z: b[1], y: -1.0, look: d0, cut: true }, { t: tUp + 0.25, x: b[0], z: b[1], y: 0, e: 'out' }], hide: [[tS + 0.4, tS + 0.45]],
    dum: [d0, d1, d2],
    fx(A) { const T = A.THREE;
      FX.swarm(A, { t0: 0.05, t1: 4.8, at: (t) => { const u = EASE.s(clamp((t - tM) / 0.45)); return V(A, lerp(c[0], d0[0], u), 0.1, lerp(c[1], d0[1], u)); }, r: 0.95, n: 24, h: 1.0, w: 3.2, both: true, size: 1.5 });
      [0.45, 1.45].forEach((t) => [1, 2].forEach((i) => A.hit(i, t + 0.03 * i, 5, { col: TICK, noCombo: true })));
      FX.disc(A, { t: tS + 0.1, at: [-1.6, 0, 0], r0: 0.3, r1: 0.7, dur: 0.6, col: C.ink, op: 0.9, normal: true }); FX.smoke(A, { t: tUp - 0.05, at: [b[0], 0, b[1]], n: 12, r: 0.25, h: 0.6, size: 0.35, dur: 0.7, op: 0.6 });
      A.hit(0, tUp + 0.3, 12, { big: true }); FX.claw(A, { t: tUp + 0.3, at: { d: 0, y: 0.62 }, roll: -0.4, n: 3, size: 0.5 });
      FX.sigil(A, { t0: tUp + 0.3, t1: 4.8, at: (t) => { const p = A.dpt(0, t, 0.72); return [p.x + 0.29, p.y, p.z]; }, r: 0.26, op: 0.8 });
      for (let s = 0; s < 6; s++) A.hit(0, tM + 0.5 + 0.5 * s, 5, { col: TICK, noCombo: true });
      claw(A, tUp + 1.35, 0, 12, { back: true, of: 'handR' }); claw(A, tUp + 2.05, 0, 12, { back: true, roll: 0.95, of: 'handL' });
      A.cap(0.1, tS + 0.4, '蝠群在咬：每秒 5', 'The swarm bites: 5 a second'); A.cap(tUp + 0.3, 4.8, '死兆在身：蝠群只咬它，快一倍', 'It carries Death Mark: the swarm bites only it, twice as often');
    } };
}
// C4 Screech in the dark: Echo Screech from inside Nightfall's dark rings all round him, and the blind on the foes it hits starts again
{ const ds = fan(6, 1.55, 15, 330, -0.4, 0); const t0 = 0.3, tC = t0 + 0.6, tE = tC + 1.25;
  DEFS.C4 = { T: tE + 2.4, cam: { x: -0.4, z: 0, w: 6.2 }, her: H(-0.4, 0), seq: [[t0, 'castBloom'], [tE - 0.42, 'castPoint']], dum: ds,
    fx(A) { FX.dome(A, { t0: tC, t1: tC + 2.0, at: 'him', r: 2.0, op: 0.75 }); FX.sigil(A, { t0: tC, t1: tC + 2.0, at: 'him', floor: true, r: 1.2, op: 0.5 });
      FX.smoke(A, { t: tC, at: A.body(tC, 0), n: 28, r: 1.6, h: 0.8, size: 0.6, dur: 1.4, spread: 0.2, op: 0.55, rise: 0.2, out: 0.2 });
      ds.forEach((p, i) => A.hit(i, tC + 0.06 + 0.01 * i, 6, { blind: 2.0 })); FX.ring(A, { t: tC, at: 'him', r0: 0.3, r1: 2.0, dur: 0.35, col: C.rose, op: 0.6 });
      for (let k = 0; k < 3; k++) { FX.ring(A, { t: tE + 0.07 * k, at: A.body(tE, 0.55), r0: 0.3, r1: 2.6, dur: 0.4, col: k % 2 ? C.rose : C.moon, op: 0.85, w: 0.08 }); }
      FX.ring(A, { t: tE, at: 'him', r0: 0.3, r1: 2.6, dur: 0.45, col: C.moon, op: 0.5, normal: true, w: 0.1 });
      ds.forEach((p, i) => { A.hit(i, tE + 0.15, 12, { blind: 2.0 }); FX.sigil(A, { t0: tE + 0.15, t1: tE + 2.3, at: { d: i, y: 1.35 }, r: 0.16, op: 0.7, col: C.rose }); });
      A.shake(tE, 0.05, 0.2);
      A.post((t, x, W, H2, k, lang) => { if (t < tC + 0.06) return; const left = t < tE + 0.15 ? 2 - (t - tC - 0.06) : 2 - (t - tE - 0.15); if (left <= 0) return; x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = '#B98FD0'; x.fillText((lang === 'en' ? 'Blind ' : '致盲 ') + left.toFixed(1) + 's', W - 14 * k, 28 * k); });
      A.cap(tC, tE - 0.1, '夜幕：致盲 2 秒', 'Nightfall: blinded 2 s'); A.cap(tE, tE + 2.3, '黑暗里尖啸：一圈全中 12（致盲 +20%），致盲重新计时', 'A screech from the dark: all round, 12 (blinded, 20% more), and the blind starts again');
    } };
}
// C5 The shade strikes too: while his Roost shade hangs, it repeats Crescent Wings, Blood Lance and Echo Screech from where it is, for half
{ const sp = [-1.8, 0.85], me2 = [-1.0, -0.75]; const ds = [[0.6, -0.75], [1.9, -0.75], [0.3, 0.85], [1.6, 0.85]]; const t0 = 0.3, tH = t0 + 0.32, tR = 1.45, tL = tR + 0.15, tT = tL + 0.7;
  DEFS.C5 = { T: tT + 1.5, cam: { x: 0.0, z: 0, w: 6.6, y: 0.7 }, her: H(sp[0], sp[1]), seq: [[t0, 'kickUp'], [tH, 'idle', { fade: 0.15 }], [tH + 0.15, 'run', { loop: true, until: tR }], [tR, 'idle', { fade: 0.1 }], [tL, 'lance']],
    root: [{ t: tH + 0.15 }, { t: tR, x: me2[0], z: me2[1], look: [3, me2[1]], e: 's' }], dum: ds,
    fx(A) { const spot = A.rootAt(tH);
      A.ghost((t) => (t >= tH ? [{ clip: 'hang', ct: t, root: { x: spot.x, z: spot.z, y: 0.95, yaw: spot.yaw, pitch: Math.PI, roll: 0 }, op: 0.55, tint: C.plum, col: C.plum, glow: 0.25 }] : []));
      FX.smoke(A, { t: tH, at: A.body(tH, 0.6), n: 8, r: 0.25, size: 0.3, dur: 0.6, op: 0.5 });
      FX.thread(A, { t0: tL + 0.4, t1: tT - 0.02, from: (t) => A.at('handR', t), to: (t) => A.at('handL', t), w: 0.03, grow: 0.15, per: 0.25 });
      const o = A.ahead(tT, 0.5, 0.55), e = A.ahead(tT, 6.0, 0.55); lance(A, tT, o, e);
      const t2 = tT + 0.12, o2 = V(A, sp[0] + 0.4, 0.6, sp[1]), e2 = V(A, sp[0] + 5.9, 0.6, sp[1]); lance(A, t2, o2, e2, { w: 1.3 }); FX.spark(A, { t: t2, at: [sp[0], 0.9, sp[1]], r: 0.6, col: C.rose }); FX.thread(A, { t0: t2 - 0.5, t1: t2, from: [sp[0] + 0.25, 0.75, sp[1] - 0.2], to: [sp[0] + 0.25, 0.75, sp[1] + 0.2], w: 0.03, grow: 0.3, per: 0.2 });
      FX.ring(A, { t: t2, at: [sp[0], 0.9, sp[1]], r0: 0.1, r1: 0.5, dur: 0.3, col: C.rose, op: 0.7 });
      [0, 1].forEach((i) => { const th = tT + 0.3 * Math.pow((ds[i][0] - o.x) / (e.x - o.x), 0.8) * 0.75; A.hit(i, th, 14); FX.claw(A, { t: th, at: { d: i, y: 0.6 }, roll: 1.5, n: 1, len: 1.1, size: 0.5 }); });
      [2, 3].forEach((i) => { const th = t2 + 0.3 * Math.pow((ds[i][0] - o2.x) / (e2.x - o2.x), 0.8) * 0.75; A.hit(i, th, 7); FX.claw(A, { t: th, at: { d: i, y: 0.6 }, roll: 1.5, n: 1, len: 0.9, size: 0.4 }); });
      A.cap(tH, tL, '归巢：影子挂着', 'Roost: the shade hangs'); A.cap(tT, tT + 1.4, '他扔血矢：14；影子在原地也扔一支：一半 7', 'His Blood Lance: 14; the shade throws one too from where it hangs: half, 7');
    } };
}
// C6 Dash cast: Talon Rake (or Wing Wheel, Bloodbite, Crescent Wings) pressed during the dash comes out as he gathers, at once, 30% wider
{ const me = [-2.4, 0.1], m1 = [-0.7, 0.1]; const ds = fan(5, 1.42, 70, -70, m1[0], m1[1]); const tD = 0.6, tG = 0.72, tH = tG + 0.08;
  DEFS.C6 = { T: 2.8, cam: { x: -0.6, z: 0, w: 5.8 }, her: H(me[0], me[1]), seq: [[0.35, 'dash', { fade: 0.03 }], [tG, 'castSweep', { from: 0.34, fade: 0.02 }], [tG + 0.95, 'cape']],
    root: [{ t: tD }, { t: tG, x: m1[0], z: m1[1], cut: true }], hide: [[tD, tG]], dum: ds,
    fx(A) { const at = (t) => A.body(t, 0.45); FX.blink(A, { t: tD, dur: 0.12, from: at(tD - 0.02), to: at(tG + 0.02) });
      const c = V(A, m1[0], 0, m1[1]); const arc = (R, col, op, w) => FX.tube(A, { t: tH - 0.06, dur: 0.12, hold: 0.05, out: 0.3, flat: true, w: (u) => w * Math.sin(Math.PI * u), col, op, e: 'out', pts: () => { const P = []; for (let i = 0; i <= 16; i++) { const a = (75 - 150 * i / 16) * D2R; P.push(V(A, c.x + Math.cos(a) * R, 0.5, c.z - Math.sin(a) * R)); } return P; } });
      arc(1.43, C.moon, 0.7, 0.34); arc(1.1, C.parch, 0.25, 0.1);
      ds.forEach((p, i) => { const dx = p[0] - c.x, dz = p[1] - c.z, l = Math.hypot(dx, dz); A.hit(i, tH + 0.012 * (4 - i), 15, { knock: [dx / l * 0.6, dz / l * 0.6], dir: [dx, dz] }); FX.claw(A, { t: tH + 0.012 * (4 - i), at: { d: i, y: 0.62 }, roll: 0.15, n: 4, size: 0.5, bend: 0.14 }); });
      FX.trail(A, { of: 'handR', t0: tH - 0.08, t1: tH + 0.14, len: 0.16, w: 0.1 }); FX.dust(A, { t: tH, at: c, n: 8, sp: 1.0 }); A.shake(tH, 0.05, 0.16);
      A.cap(0.3, tG, '冲刺中按爪击', 'Talon Rake pressed during the dash'); A.cap(tG, 2.7, '聚拢时立刻打出，宽 30%：1.1 → 1.43 u', 'It comes out as he gathers, 30% wider: 1.1 → 1.43 u');
    } };
}
// C7 Through the cloud: a Blood Lance through his Bat Swarm comes out as three, each at a foe near it, for half
{ const c = [0.5, 0]; const ds = [[2.1, 0.95], [2.4, -0.15], [1.8, -1.15]]; const t0 = 0.3, tT = t0 + 0.7, tX = tT + 0.12;
  DEFS.C7 = { T: 3.4, cam: { x: 0.3, z: 0, w: 6.6 }, her: H(-1.8, 0), seq: [[t0, 'lance']], dum: ds,
    fx(A) { FX.swarm(A, { t0: 0.05, t1: 3.35, at: [c[0], 0.1, c[1]], r: 0.9, n: 24, h: 1.0, w: 3.2, both: true, size: 1.5 }); FX.disc(A, { t: 0.05, at: [c[0], 0, c[1]], r0: 0.85, r1: 0.9, dur: 3.3, hold: true, col: C.plum, op: 0.3, normal: true });
      FX.thread(A, { t0: t0 + 0.4, t1: tT - 0.02, from: (t) => A.at('handR', t), to: (t) => A.at('handL', t), w: 0.03, grow: 0.15, per: 0.25 });
      const o = A.ahead(tT, 0.5, 0.55), m = V(A, c[0], 0.55, c[1]); lance(A, tT, o, m, { dur: 0.12 });
      FX.ring(A, { t: tX, at: m, r0: 0.1, r1: 0.7, dur: 0.3, col: C.rose, op: 0.8 }); FX.spark(A, { t: tX, at: m, r: 0.6, col: C.rose });
      ds.forEach((p, i) => { const e = V(A, p[0] + (p[0] - c[0]) * 0.6, 0.55, p[1] + (p[1] - c[1]) * 0.6); lance(A, tX + 0.02 * i, m.clone(), e, { dur: 0.3, w: 0.75 }); const th = tX + 0.02 * i + 0.3 * 0.55; A.hit(i, th, 7); FX.claw(A, { t: th, at: { d: i, y: 0.6 }, roll: 1.5, n: 1, len: 0.9, size: 0.4 }); });
      A.cap(tT, 3.3, '血矢穿过自己的蝠群：分成三支，各射一个附近的敌人：一半 7', 'A Blood Lance through his swarm comes out as three, each at a foe near it: half, 7');
    } };
}
// C8 Feed the moon: under his Blood Moon every bleed runs twice as fast, and what comes back to him is doubled
{ const ds = fan(4, 1.8, 45, 315, -0.3, 0); const t0 = 0.9, tC = t0 + 1.15, tE = tC + 2.2;
  DEFS.C8 = { T: tE + 0.5, cam: { x: -0.3, z: -0.2, w: 7.0, y: 0.9 }, her: H(-0.3, 0), seq: [[0.1, 'idle'], [t0, 'moonRise']], root: [{ t: t0 + 0.2 }, { t: t0 + 0.9, y: 0.7, e: 'out' }, { t: tC, y: 0.75 }, { t: tC + 0.25, y: 0, e: 'in' }], dum: ds,
    fx(A) { FX.moon(A, { t0: t0 + 0.3, t1: tE, at: (t) => { const r = A.rootAt(t); return [r.x, 1.9 + r.y * 0.4, r.z - 1.0]; }, r: 0.85, grow: 0.8, op: 0.92 });
      A.dark(tC - 0.05, tC + 0.15, 0.55, 0.05, 0.4, { eyes: false }); A.shake(tC, 0.07, 0.25);
      FX.ring(A, { t: tC + 0.02, at: [-0.3, 0, 0], r0: 0.3, r1: 2.4, dur: 0.5, col: C.blood, op: 0.9, w: 0.25, normal: true });
      ds.forEach((p, i) => { A.status(i, 0.05, 'bleed', tE - 0.05, { rate: 7 }); const slow = [], fast = []; for (let t = 0.3 + 0.08 * i; t < tE; t += t < tC ? 0.5 : 0.25) (t < tC ? slow : fast).push(t); ticks(A, i, slow, 3); ticks(A, i, fast, 3, true);
        A.hit(i, tC + 0.1 + 0.015 * i, 36, { big: true, blind: 1.5 }); FX.thread(A, { t0: tC + 0.2, t1: tC + 0.9, from: { d: i, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.025, per: 0.35 }); });
      A.heal(tC + 0.6, 101, { big: true });
      A.cap(0.2, tC - 0.1, '流血：每半秒 3', 'Bleeding: 3 each half second'); A.cap(tC + 0.1, tC + 1.0, '血月：4 × 36（流血 +20%）；回血 35% → 70%：101', 'Blood Moon: 4 × 36 (bleeding, 20% more); 35% → 70% comes back: 101');
      A.cap(tC + 1.0, tE + 0.4, '血月下流血快一倍：每 0.25 秒 3', 'Under the moon every bleed runs twice as fast: 3 each quarter second');
    } };
}
// C9 Push the bleeder: a bleeding foe that is knocked back, launched or carried bleeds double for that second
{ const d0 = [0, 0]; const t0 = 0.3, tV = t0 + 0.44, tR = tV + 1.1;
  DEFS.C9 = { T: tV + 3.2, cam: { x: 0.0, z: 0, w: 5.2 }, her: H(-0.95, 0), seq: [[t0, 'vein'], [tV + 0.45, 'idle', { fade: 0.2 }], [tR - 0.42, 'castSweep'], [tR + 0.55, 'cape']],
    root: [{ t: tR - 0.22 }, { t: tR, fw: 0.3, e: 'out' }], dum: [d0],
    fx(A) { A.hit(0, tV, 10, { big: true }); FX.claw(A, { t: tV, at: { d: 0, y: 0.62 }, roll: -0.35, n: 1, len: 1.7, wid: 0.03, size: 0.6, open: 0.05, life: 3.0, bend: 0.04 });
      A.status(0, tV, 'bleed', 3.0, { rate: 7 }); ticks(A, 0, [tV + 0.5, tV + 1.0], 3); ticks(A, 0, [tV + 1.5, tV + 2.0], 6, true); ticks(A, 0, [tV + 2.5, tV + 3.0], 3);
      A.hit(0, tR, 18, { big: true, knock: [0.6, 0], dir: [1, 0] }); FX.claw(A, { t: tR, at: { d: 0, y: 0.62 }, roll: 0.15, n: 4, size: 0.5, bend: 0.14 }); FX.trail(A, { of: 'handR', t0: tR - 0.12, t1: tR + 0.14, len: 0.16, w: 0.1 }); A.shake(tR, 0.04, 0.14);
      FX.drops(A, { t: tR + 0.05, at: { d: 0, y: 0.6 }, n: 14, sp: 1.6, up: 0.5, size: 0.06 });
      A.cap(tV, tR - 0.05, '放血：每半秒 3', 'Open Vein: 3 each half second'); A.cap(tR, tR + 1.05, '爪击把流血的敌人击退：18（+20%），这一秒流血翻倍：6', 'Talon Rake knocks the bleeder back: 18 (20% more), and it bleeds double that second: 6');
      A.cap(tR + 1.05, tV + 3.15, '一秒后回到 3', 'After the second, back to 3');
    } };
}
// C10 Boil the swarm: Boiling Blood cast while his Bat Swarm is out calls the swarm to him for the rest of its time
{ const c = [1.5, -1.0], me = [-0.95, 0]; const ds = [[0.0, 0.0], [0.45, 0.8], [0.5, -0.75]]; const t1 = 1.0, tA = t1 + 1.05, sp = 1.4, tE = 4.1;
  const hitT = [0.10, 0.24, 0.46].map((x) => tA + x / sp), hitT2 = [0.10, 0.24, 0.46].map((x) => tA + 0.62 / sp + x / sp);
  DEFS.C10 = { T: 4.4, cam: { x: 0.0, z: -0.2, w: 6.0 }, her: H(me[0], me[1]), seq: [[0.1, 'idle'], [t1, 'boil'], [tA, 'combo', { speed: sp, to: 0.62 }], [tA + 0.62 / sp, 'combo', { speed: sp, to: 0.62, fade: 0.05 }]], dum: ds,
    fx(A) { const tC = t1 + 0.4; FX.swarm(A, { t0: 0.05, t1: tE, at: (t) => { const u = EASE.s(clamp((t - tC) / 0.5)); const b = A.body(t, 0.1); return V(A, lerp(c[0], b.x, u), 0.1, lerp(c[1], b.z, u)); }, r: 1.0, n: 26, h: 1.0, w: 3.2, both: true, size: 1.5 });
      FX.smoke(A, { t: t1 + 0.4, at: (t) => A.body(t, 0.2), follow: true, n: 22, r: 0.35, h: 0.8, size: 0.16, dur: 2.6, spread: 2.4, op: 0.55, col: C.blood, col2: C.rose, rise: 0.8, out: 0.1 });
      [...hitT, ...hitT2].forEach((t, i) => { const j = i % 3; if (j === 2) { A.hit(0, t, 6, { big: true }); FX.bite(A, { t, at: { d: 0, y: 0.6 }, size: 0.4 }); } else claw(A, t, 0, 4, { roll: j ? 0.95 : -0.95, of: j ? 'handL' : 'handR' });
        A.hit(1, t + 0.04, 3, { col: TICK }); A.hit(2, t + 0.05, 3, { col: TICK }); });
      [tC + 0.7, tC + 1.7, tC + 2.7].forEach((t) => { const b = A.body(t, 0); ds.forEach((p, i) => { if (t < tE && Math.hypot(p[0] - b.x, p[1] - b.z) <= 1.3) A.hit(i, t + 0.03 * i, 5, { col: '#C9B6D6', noCombo: true }); }); });
      A.cap(0.1, t1 + 0.3, '蝠群在那边', 'His swarm is over there'); A.cap(t1 + 0.4, 4.3, '放血沸：蝠群飞回他身边，剩下的时间都跟着他', 'Boiling Blood: the swarm comes to him and stays for the rest of its time');
    } };
}
// C11 Kill in the dark: a foe that falls while blinded bursts into darkness: the foes within 1.4 u are blinded 1 s
{ const me = [-1.0, 0], d0 = [0.6, 0], d1 = [1.5, 0.75], d2 = [1.6, -0.6]; const t0 = 0.3, tC = t0 + 0.6, tB = tC + 1.0, b = around(d0, 0, 0.7), tS = tB + 0.13, tX = tS + 0.45;
  DEFS.C11 = { T: tX + 1.8, cam: { x: 0.3, z: 0, w: 6.2 }, her: H(me[0], me[1]), seq: [[t0, 'castBloom'], [tB + 0.08, 'stab', { fade: 0.02 }], [tB + 1.0, 'cape', { from: 0.1 }]],
    root: [{ t: tB }, { t: tB + 0.08, x: b[0] - 0.1, z: b[1], look: d0, cut: true }], hide: [[tB, tB + 0.08]], dum: [d0, d1, d2],
    fx(A) { FX.dome(A, { t0: tC, t1: tB, at: [me[0], 0, me[1]], r: 2.0, op: 0.7 }); FX.smoke(A, { t: tC, at: [me[0], 0, me[1]], n: 22, r: 1.5, h: 0.8, size: 0.6, dur: 1.2, spread: 0.2, op: 0.5, rise: 0.2, out: 0.2 });
      A.hit(0, tC + 0.06, 6, { blind: 2.0 });
      FX.blink(A, { t: tB, dur: 0.08, from: A.body(tB - 0.02), to: A.body(tB + 0.1) });
      claw(A, tS, 0, 26, { back: true, big: true, fell: true, roll: 1.3, mark: { n: 1, len: 1.3, wid: 0.05, size: 0.6 } }); A.shake(tS, 0.05, 0.15);
      FX.smoke(A, { t: tX, at: (() => { const p = A.dpt(0, tX, 0.3); return p; })(), n: 30, r: 0.4, h: 0.9, size: 0.6, dur: 1.2, spread: 1.6, op: 0.8, rise: 0.2, out: 1.3, col: C.ink, col2: C.plum });
      FX.ring(A, { t: tX, at: { d: 0, y: -0.55 }, r0: 0.2, r1: 1.4, dur: 0.45, col: C.plum, op: 0.9, w: 0.25, normal: true }); FX.ring(A, { t: tX + 0.05, at: { d: 0, y: 0.1 }, r0: 0.2, r1: 1.4, dur: 0.45, col: C.rose, op: 0.5 });
      [1, 2].forEach((i) => A.hit(i, tX + 0.15, null, { blind: 1.0 }));
      A.cap(tC, tB, '夜幕致盲了它', 'Nightfall blinds it'); A.cap(tS, tX, '瞬袭击杀它：22 → 26（致盲 +20%）', 'Blink Strike fells it: 22 → 26 (blinded, 20% more)'); A.cap(tX, tX + 1.75, '致盲中倒下：炸成黑暗，1.4 u 内致盲 1 秒', 'It fell blinded: it bursts into darkness, the foes within 1.4 u are blinded 1 s');
    } };
}
// C12 Out of the sky: Pounce (or Last Bite) pressed during Night Flight ends the flight on that foe at once: 50% more
{ const d0 = [1.2, 0.1], d1 = [1.8, -0.6]; const t0 = 0.3, tP = t0 + 1.15, x0 = d0[0] - 0.55;
  DEFS.C12 = { T: tP + 2.2, cam: { x: 0.2, z: -0.5, w: 6.6, y: 0.9 }, her: H(-1.8, 0),
    seq: [[t0, 'flare'], [t0 + 0.25, 'fly', { loop: true, until: tP - 0.14 }], [tP - 0.14, 'streak'], [tP, 'maul'], [tP + 0.95, 'flip'], [tP + 1.45, 'emerge', { from: 0.07 }]],
    root: [{ t: t0 + 0.15 }, { t: t0 + 0.6, x: -1.2, z: -0.9, y: 1.6, pitch: 25, e: 'out' }, { t: tP - 0.14, x: -0.3, z: -1.1, y: 1.8, pitch: 25, roll: 360, look: d0 }, { t: tP, x: x0, z: d0[1], y: 0.42, pitch: 0, roll: 360, look: d0, e: 'in2' },
      { t: tP + 0.95, x: x0, z: d0[1], y: 0.42, roll: 360, look: d0 }, { t: tP + 1.4, x: x0 - 1.15, z: d0[1], y: 0, jump: 0.8, pitch: -360, roll: 360, look: d0, e: 'lin' }],
    dum: [d0, d1],
    fx(A) { FX.trail(A, { of: 'tipL', t0: t0 + 0.3, t1: tP, len: 0.2, w: 0.08, op: 0.35, col: C.moon }); FX.trail(A, { of: 'tipR', t0: t0 + 0.3, t1: tP, len: 0.2, w: 0.08, op: 0.35, col: C.moon });
      FX.trail(A, { of: 'chest', t0: tP - 0.14, t1: tP, len: 0.12, w: 0.32, col: C.plum, op: 0.6 });
      A.hit(0, tP, null, { big: true }); A.status(0, tP, 'stun', 0.85); FX.dust(A, { t: tP, at: { d: 0, y: -0.6 }, n: 10, sp: 1.3 }); FX.ring(A, { t: tP, at: { d: 0, y: -0.58 }, r0: 0.2, r1: 1.2, dur: 0.4, col: C.rose, op: 0.7 }); A.shake(tP, 0.07, 0.2);
      for (let i = 0; i < 5; i++) { const tc = tP + 0.08 + (i < 4 ? 0.16 * i : 0.78); claw(A, tc, 0, 6, { size: i === 4 ? 0.6 : 0.42, roll: i === 4 ? 0 : i % 2 ? 0.9 : -0.9, y: 0.75, mark: i === 4 ? { n: 4 } : {}, of: i % 2 ? 'handL' : 'handR' }); }
      A.cap(t0 + 0.3, tP, '夜翔中按扑杀', 'Pounce pressed during Night Flight'); A.cap(tP, tP + 2.1, '飞行立刻结束，扑在它身上：五下 4 → 6（+50%）', 'The flight ends on that foe at once: five hits, 4 → 6 (50% more)');
    } };
}

// ================================================================ Kesh's picks (19 Nov, "use those"): these replace the forms above (R11a to R11c, DUSKWING_NEW_OPTIONS.md)
// each adds one beat to a passed combo; the passed combo above is unchanged
const N = FORMS.co2;
// R11a C1: as passed, and the burst blinds: the foes within 1.2 u, 1 s
{ const b = DEFS.C1, tX = 2.65; N.C1 = { ...b, dum: [...b.dum, [0.75, 0.65]], fx(A) { b.fx(A);
  FX.smoke(A, { t: tX + 0.02, at: { d: 0, y: 0.5 }, n: 16, r: 0.9, h: 0.7, size: 0.45, dur: 0.8, op: 0.6, out: 0.3 }); FX.ring(A, { t: tX + 0.02, at: { d: 0, y: 0.05 }, r0: 0.2, r1: 1.2, dur: 0.4, col: C.plum, op: 0.9, w: 0.25, normal: true });
  [0, 1].forEach((i) => A.status(i, tX + 0.05, 'blind', 1.0));
  A.cap(tX + 0.05, 3.9, '剩下的流血一次爆出：18；爆开致盲 1.2 u 内敌人 1 秒', 'The rest of the bleed comes out at once: 18; the burst blinds the foes within 1.2 u for 1 s'); } }; }
// R11b C4: as passed, and the ring pulls the foes in: 1 u toward him
{ const b = DEFS.C4, tE = 0.9 + 1.25; N.C4 = { ...b, fx(A) { b.fx(A);
  b.dum.forEach((p, i) => { const dx = -0.4 - p[0], dz = -p[1], l = Math.hypot(dx, dz) || 1; A.move(i, tE + 0.15, [dx / l, dz / l], 0.3, 'out'); });
  for (let k = 0; k < 2; k++) FX.ring(A, { t: tE + 0.12 + 0.08 * k, at: A.body(tE, 0.05), r0: 2.6, r1: 0.5, dur: 0.35, col: k ? C.rose : C.moon, op: 0.7, w: 0.1, normal: true, e: 'in' });
  A.cap(tE + 0.05, tE + 2.3, '黑暗里尖啸：一圈全中 12，致盲重新计时；把敌人拉近 1 u', 'A screech from the dark: all round, 12, and the blind starts again; it pulls the foes 1 u in'); } }; }
// R11c C12: as passed, and it lands as a dive: 10 within 1.5 u of the foe
{ const b = DEFS.C12, tP = 0.3 + 1.15; N.C12 = { ...b, dum: [...b.dum, [0.5, 0.95]], fx(A) { b.fx(A);
  FX.ring(A, { t: tP, at: [1.2, 0.03, 0.1], r0: 0.3, r1: 1.5, dur: 0.45, col: C.blood, op: 0.85, w: 0.25, normal: true }); FX.dust(A, { t: tP, at: [1.2, 0.03, 0.1], n: 10, sp: 1.6 });
  [0, 1, 2].forEach((i) => { const p = A.card.def.dum[i]; if (Math.hypot(p[0] - 1.2, p[1] - 0.1) <= 1.5) A.hit(i, tP + 0.03 + 0.01 * i, 10, { big: i === 0, dir: [p[0] - 1.2, p[1] - 0.1] }); });
  A.cap(tP, tP + 2.1, '飞行立刻结束，像俯冲一样落下：1.5 u 内 10；再扑：五下 4 → 6（+50%）', 'The flight ends on that foe at once, landing as a dive: 10 within 1.5 u; then five hits, 4 → 6 (50% more)'); } }; }
// the picks are the styles now
Object.assign(DEFS, N);
