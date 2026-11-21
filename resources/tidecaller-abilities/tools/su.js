// Tsunami 海啸 forms (kit 2.2; Surge 狂澜 until kit 1.9): thick rolling fronts with a curling Sea Foam crest; waves carry the pack and slam it; the floor is left wet and flat
// Shown as the old Surge cards were passed: pushes and throws 40% farther, Slam double (a wall 20, a foe 12 each); in kit 2.x those two are the talents Wide Water and Heavy Swell
import { FX, C, EASE, clamp, lerp } from './tc.js';
import { H, FORMS, D2R, around, fan, gaugeHud, foeBolt, ticks, shieldOn, block, slamFx, streamOn, tailSlap, shake, coil, leanBack, crouch, turnTrunk, lookUp, shiver, tuck, pawUp, mixA } from './defs.js';
import { TIDE, layWater, tidePts } from './defs.js';
const S = FORMS.su;
// a Slam between two foes: 12 each and a flat burst of foam between them
const bump = (A, t, i, j) => { A.hit(i, t, 12, { slam: true }); A.hit(j, t + 0.01, 12, { slam: true }); FX.splash(A, { t, at: (tt) => { const a = A.dpos(i, t), b = A.dpos(j, t); return [(a.x + b.x) / 2, 0, (a.z + b.z) / 2]; }, r: 0.35, h: 0.5, crash: true, n: 6 }); A.shake(t, 0.04, 0.14); };

// P (kit 2.1): a Crash's spent water soaks the other foes within 1.5 u, so the next Crash has targets
{ const me = [-2.0, 0], d0 = [0.4, 0.0], ds = [[d0[0], d0[1], { soaked: true }], around(d0, 50, 1.1), around(d0, 180, 1.2), around(d0, 290, 1.0)]; const tc = 0.3 + 0.44, T = 3.4;
  S.P = { T, cam: { x: -0.1, z: 0.0, w: 6.4 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPoint']], body: (t) => mixA(tailSlap(t, tc + 0.02, 0.8), shake(t, 1.8, 0.6, 0.6)),
    fx(A) { FX.jet(A, { t: tc - 0.04, to: (t) => A.dpt(0, tc, 0.62).add(new A.THREE.Vector3(0.9, 0, 0)), dur: 0.12, hold: 0.18, w: 0.22 }); A.hit(0, tc + 0.1, 29, { crash: true });
      // the spent soak bursts off the foe as a low ring of drops, 1.5 u
      FX.ring(A, { t: tc + 0.14, at: [d0[0], 0.03, d0[1]], r0: 0.2, r1: 1.5, dur: 0.4, col: C.sky, op: 0.7, w: 0.12 }); FX.drops(A, { t: tc + 0.14, at: [d0[0], 0.7, d0[1]], n: 18, sp: 1.5, up: 0.7, size: 0.045, dur: 0.5 });
      [1, 2, 3].forEach((i) => A.soak(i, tc + 0.38 + 0.03 * i, 4));
      A.cap(0.3, T, '海啸：拍掉的水溅开，浸湿 1.5 u 内别的敌人', "Tsunami: a Crash's spent water soaks the other foes within 1.5 u"); } };
}
// B (kit 2.1): the tsunami comes after 3 s (as passed), is twice as wide (2.6 u) and carries small foes to its end (6 u)
{ const me = [-2.6, 0.1], ds = [[-0.9, 0.1, { soaked: true }], [0.2, -0.35], [0.6, 0.5], [-0.3, 1.15], [1.0, -0.95]]; const s0 = 0.3, s1 = 3.3, tz = s1 + 0.05, tw = tz + 0.68, end = me[0] + 0.45 + 6;
  S.B = { noWarp: true, T: tw + 2.0, cam: { x: 0.2, z: 0.0, w: 7.6 }, her: H(me[0], me[1]), dum: ds,
    seq: [[s0, 'stream', { loop: true, until: s1, fade: 0.15 }], [tz, 'tsunami']],
    body: (t) => mixA(shiver(t, s0 + 0.15, s1), tailSlap(t, tw, 0.9), shake(t, tw + 1.2, 0.6, 0.8)),
    fx(A) { streamOn(A, s0 + 0.12, s1, 0, { w: 0.15 }); FX.orb(A, { t0: s0 + 0.2, t1: s1 + 0.4, at: 'tip', r: (t) => 0.04 + 0.11 * clamp((t - s0) / 3), pop: false, op: 0.7 });
      A.hud(gaugeHud('水流 3 秒', 'Stream 3 s', (t) => t < s0 ? 0 : t < s1 ? (t - s0) / 3 : t < tw + 0.6 ? 1 : 0, { full: true }));
      FX.wave(A, { t: tw, from: (t) => A.ahead(tw, 0.45, 0), dir: 90, dist: 6, dur: 1.1, w: 2.6, h: 0.95, len: 1.0, wetFor: 1.5 });
      const at = (x) => tw + (x - (me[0] + 0.45)) / 6 * 1.1;
      ds.forEach((d, i) => { const ta = at(d[0]); A.hit(i, ta, 28, { crash: !!d[2], soak: true }); A.moveTo(i, ta, [end - 0.2 - i * 0.1, d[1] * 0.7], tw + 1.1 - ta, 'lin'); A.launch(i, ta, 0.15); A.turn(i, ta, 160, tw + 1.1 - ta); });
      ds.forEach((d, i) => A.hit(i, tw + 1.15, null, {})); FX.splash(A, { t: tw + 1.12, at: [end, 0, 0.1], r: 0.9, h: 0.8 });
      A.cap(s0, tz, '水流 3 秒就来海啸', 'The tsunami comes after 3 s'); A.cap(tz, tw + 2.0, '海啸宽一倍（2.6 u），把小敌人卷到尽头（6 u）', 'It is twice as wide (2.6 u) and carries small foes to its end (6 u)'); A.shake(tw, 0.05, 0.25); } };
}
// D (kit 2.1): the tide does not sink when she steps off: it rolls on 5 u, twice as wide (2.6 u): 10, pushed 1.5 u
{ const me = [-2.6, 0.2]; const t0 = 0.4, L = 2.8, tr = t0 + 0.8;
  const k = (t) => { const a = t - t0; const ss = (x0, x1, x) => { x = clamp((x - x0) / (x1 - x0)); return x * x * (3 - 2 * x); }; return ss(0.10, 0.22, a) * (1 - ss(0.62, 0.80, a)); };
  S.D = { noWarp: true, T: 4.2, cam: { x: 0.9, z: 0.1, w: 9.0 }, her: H(me[0], me[1]), dum: [[1.2, 0.0, { soaked: true }], [1.6, 0.55], [2.7, -0.95], [3.7, 0.9]],
    seq: [[t0, 'dash']],
    root: (() => { const R = [{ t: t0 }]; for (let i = 1; i <= 16; i++) { const a = 0.06 + i * 0.05, t = t0 + a; R.push({ t, fw: L * EASE.s(clamp((a - 0.08) / 0.74)), y: 0.68 * k(t), e: 'lin' }); } return R; })(),
    body: (t) => shake(t, 2.6, 0.5, 0.5),
    fx(A) { const ride = (t) => { const r = A.rootAt(t); return [r.x + Math.sin(r.yaw) * 0.25, 0, r.z + Math.cos(r.yaw) * 0.25]; };
      FX.wave(A, { t: t0 + 0.08, at: ride, yaw: () => 90 * D2R, dur: 0.6, out: 0.02, w: 1.0, h: 0.9, len: 1.1, rise: 0.14, hFn: (u) => Math.max(0.6, k(t0 + 0.08 + u * 0.6) * 1.05 + 0.05), wet: false });
      FX.wave(A, { t: t0 + 0.68, from: [me[0] + L + 0.25, 0, me[1]], dir: 90, dist: 5, dur: 1.1, w: 2.6, h: 0.8, len: 1.0, rise: 0.02 });
      FX.strip(A, { t0: t0 + 0.15, t1: 4.2, from: [me[0], 0, me[1]], to: [me[0] + L, 0, me[1]], grow: 0.65, w: 1.0, op: 0.35, flow: 0.2 });
      const at = (x) => t0 + 0.68 + (x - (me[0] + L + 0.25)) / 5 * 1.1; A.hit(0, at(1.2), 10, { wet: true, knock: [2.1, 0], kdur: 0.45, soak: true }); [[1, 1.6], [2, 2.7], [3, 3.7]].forEach(([i, x]) => A.hit(i, at(x), 10, { knock: [1.5, 0], kdur: 0.4, soak: true }));
      A.cap(0.1, 4.2, '下潮后浪不停：再滚 5 u，宽一倍（2.6 u）：10，推 1.5 u', 'The tide rolls on 5 u, twice as wide (2.6 u): 10, pushed 1.5 u'); } };
}

// ================================================================ Stream 流
// F1 Wave head 浪头 (kit 2.2): the bolt as the base; where it stops, a wave head rises across her aim, 4 u wide, and rolls 2 u on: 14, pushed 1 u
{ const me = [-3.0, 0.1], d0 = [0.0, 0.1], back = [[1.0, -1.3], [1.3, 0.2], [0.9, 1.4], [1.9, -0.5]], ds = [d0, ...back]; const t1 = 0.3, tb = t1 + 0.44 / 1.3, th = tb + 0.3, T = 3.2;
  S.F1 = { T, cam: { x: -0.2, z: 0.0, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[t1, 'castPoint', { speed: 1.3 }]], body: (t) => mixA(turnTrunk(t, t1, t1 + 0.45, -20), tailSlap(t, th, 0.5), shake(t, 2.2, 0.5, 0.6)),
    fx(A) { FX.bolt(A, { t: tb, to: (t) => A.dpt(0, th, 0.55), dur: 0.3, r: 0.13 }); A.hit(0, th, 14, { soak: true });
      // the water it carried spreads sideways in a blink, stands up in 0.15 s as a low curling front, rolls 2 u in 0.4 s and breaks
      FX.strip(A, { t0: th, t1: th + 0.5, from: [d0[0] + 0.2, 0, d0[1] - 2], to: [d0[0] + 0.2, 0, d0[1] + 2], w: 0.35, op: 0.5, flow: 0.0, fin: 0.08, fout: 0.3 });
      FX.wave(A, { t: th + 0.05, from: [d0[0] + 0.25, 0, d0[1]], dir: 90, dist: 2.0, dur: 0.4, w: 4.0, h: 0.42, len: 1.0, rise: 0.15, out: 0.25 });
      back.forEach((d, i) => { const tt = th + 0.05 + 0.4 * clamp((d[0] - d0[0] - 0.25) / 2.0); A.hit(i + 1, tt, 14, { soak: true, knock: [1.0, 0], kdur: 0.3 }); });
      A.cap(t1, T, '浪头：水弹如基础；它停下的地方横着立起一道浪，宽 4 u，再滚 2 u：14，推 1 u', 'Wave head: where the bolt stops a wave rises across her aim, 4 u wide, and rolls 2 u: 14, pushed 1 u'); } };
}
// F2 Part the sea: the jet opens like a zip and two low waves peel the line's foes 1.5 u out to both sides
{ const me = [-2.4, 0.1], ds = [[-0.9, 0.2, { soaked: true }], [0.3, 0.0], [1.4, 0.15], [2.3, -0.05]]; const tr = 0.35 + 0.44;
  S.F2 = { T: 2.8, cam: { x: 0.0, z: 0.0, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.35, 'castPoint']], root: [{ t: tr - 0.02 }, { t: tr + 0.1, fw: -0.18, e: 'out' }, { t: tr + 0.6, fw: -0.12 }],
    body: (t) => mixA(crouch(t, tr - 0.1, tr + 0.5, 1), tailSlap(t, tr, 0.7), shake(t, tr + 1.0, 0.6, 0.7)),
    fx(A) { FX.jet(A, { t: tr, to: (t) => A.ahead(tr, 5.5, 0.55), dur: 0.14, hold: 0.2, w: 0.3, tail: 0.18 });
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { const x = me[0] + 2.0 + k * 2.2, tk = tr + 0.05 + k * 0.08; FX.wave(A, { t: tk, from: [x, 0, me[1]], dir: s > 0 ? 0 : 180, dist: 1.6, dur: 0.4, w: 2.1, h: 0.35, len: 0.6, wet: true, wetFor: 0.8 }); }
      ds.forEach((d, i) => { const s = i % 2 ? 1 : -1, tk = tr + 0.06 + (d[0] - me[0]) / 5.5 * 0.14; A.hit(i, tk, d[2] ? 29 : 18, { crash: !!d[2], knock: [0, s * 2.1], kdur: 0.4 }); });
      FX.strip(A, { t0: tr, t1: 2.8, from: [me[0] + 0.6, 0, me[1]], to: [me[0] + 5.5, 0, me[1]], w: 0.5, op: 0.35, flow: 0.4 });
      A.cap(0.35, 2.8, '把水柱上的敌人向两边各推 1.5 u', "Throws the line's foes 1.5 u out to both sides"); } };
}
// F3 Whip wave 甩浪 (kit 2.2): no grab: the whip sweeps a half circle in front of her, 4 u; a low crest under the ribbon's whole length sweeps with it: 12, and up to 5 small foes are carried to the arc's end in one heap
{ const me = [-1.2, 0.3], a0 = 100, a1 = -80, ang = [70, 40, 10, -20, -50], rr = [2.2, 3.2, 2.6, 3.4, 2.0], ds = ang.map((a, i) => around(me, a, rr[i])); const tw = 0.3 + 0.3, sw = 0.45, te = tw + sw, T = 3.4;
  const heap = [[0, 0], [0.45, 0.3], [-0.4, 0.35], [0.1, -0.5], [0.5, -0.3]].map((o) => { const c = around(me, a1 + 12, 2.5); return [c[0] + o[0], c[1] + o[1]]; });
  const angAt = (t) => lerp(a0, a1, EASE.s(clamp((t - tw) / sw)));
  S.F3 = { T, cam: { x: 0.2, z: 0.2, w: 12.0 }, her: H(me[0], me[1], 90 - a0), dum: ds, seq: [[0.3, 'whip']], root: [{ t: 0.3, look: around(me, a0, 3) }, { t: tw, look: around(me, a0, 3) }, { t: tw + sw * 0.5, look: around(me, (a0 + a1) / 2, 3), e: 'lin' }, { t: te, look: around(me, a1, 3), e: 'lin' }],
    body: (t) => mixA(coil(t, 0.3, tw, 0.7), tailSlap(t, te, 0.8), shake(t, 2.4, 0.6, 0.6)),
    fx(A) { const tip = (t) => { const p = around(me, angAt(t), 4.0); return [p[0], 0.45, p[1]]; };
      FX.rope(A, { t0: tw - 0.05, t1: te + 0.1, from: 'tip', to: tip, w: 0.09, head: 0.08, sag: 0.02 });
      // the crest: as long as the ribbon (her feet to its tip), low, turning with it like a windscreen wiper
      FX.wave(A, { t: tw, at: (t) => { const p = around(me, angAt(t), 2.2); return [p[0], 0, p[1]]; }, yaw: (t) => (90 - angAt(t) + 90) * D2R, dur: sw, out: 0.25, w: 3.6, h: 0.32, len: 0.9, bend: false, wet: false, rise: 0.1 });
      ds.forEach((d, i) => { const tt = tw + sw * (a0 - ang[i]) / (a0 - a1); A.hit(i, tt, 12, { soak: true, noStop: true });
        // carried along the arc in three short legs, dropped in one heap at its end
        const n = 3; for (let k = 1; k <= n; k++) { const u = k / n, a = lerp(ang[i], a1 + 12, u), r = lerp(rr[i], 2.5, u), p = k === n ? heap[i] : around(me, a, r); A.moveTo(i, tt + (te - tt) * (k - 1) / n, p, (te - tt) / n + 0.001, 'lin'); }
        A.launch(i, tt, 0.25); });
      bump(A, te + 0.03, 0, 1); bump(A, te + 0.06, 2, 3); FX.splash(A, { t: te, at: (() => { const c = around(me, a1 + 12, 2.5); return [c[0], 0, c[1]]; })(), r: 1.0, h: 0.6, n: 14 });
      A.cap(0.3, T, '甩浪：水鞭扫半圈（4 u），鞭下一道浪跟着扫：12；最多 5 个小敌人被卷到尽头，堆成一堆', "Whip wave: a half-circle sweep (4 u) with a wave under the whip: 12; up to 5 small foes end in one heap"); } };
}
// F4 Conveyor: each crown (6) tosses its foes in a low arc on to the next crown: 4.5 u down the line
{ const me = [-2.7, 0.2]; const pts = [[-1.6, 0.2], [-0.5, 0.2], [0.6, 0.2], [1.7, 0.2]]; const t0 = 0.3 + 0.32, per = 0.3;
  S.F4 = { T: 3.2, cam: { x: -0.2, z: 0.0, w: 6.8 }, her: H(me[0], me[1]), dum: [[-1.6, 0.25, { soaked: true }], [-0.45, -0.1]], seq: [[0.3, 'flick']], body: (t) => mixA(shake(t, 2.2, 0.6, 0.5)),
    fx(A) { FX.stone(A, { t: t0, pts, per, hop: 0.3, grow: true });
      [[0, 0], [1, 1]].forEach(([i, k0]) => { for (let k = k0; k < 4; k++) { const tk = t0 + per * (k + 1); A.hit(i, tk, 6, { wet: !!(i === 0), soak: k === k0, noStop: true }); const nx = k < 3 ? pts[k + 1] : [2.9, 0.2]; A.moveTo(i, tk, [nx[0] + (i ? 0.15 : 0), nx[1] + (i ? -0.25 : 0.05)], per, 'lin'); A.launch(i, tk, k < 3 ? 0.35 : 0.5); } });
      FX.splash(A, { t: t0 + per * 5, at: [2.9, 0, 0.2], r: 0.6, h: 0.6 });
      A.cap(0.3, 3.2, '每个水花（6）把敌人抛到下一个：一路送 4.5 u', 'Each splash (6) throws its foes on to the next: 4.5 u down the line'); } };
}
// F5 Drag-in: she flings the fan up and over; it lands behind the pack and washes back to her feet with the foes sliding on it
{ const me = [-2.3, 0.1], ds = [[-0.3, -0.5, { soaked: true }], [0.2, 0.5], [0.8, 0.0]]; const tf = 0.3 + 0.32, tl = tf + 0.35;
  S.F5 = { T: 2.8, cam: { x: -0.4, z: 0.1, w: 6.2 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'nozzle']], body: (t) => mixA(lookUp(t, 0.35, tl, 18), shake(t, 2.0, 0.6, 0.6)),
    fx(A) { for (const z of [-0.6, 0, 0.6]) FX.bolt(A, { t: tf, from: 'tip', to: [1.7, 0.1, z], dur: 0.35, arc: 1.4, r: 0.16, splash: false });
      FX.wave(A, { t: tl, from: [1.9, 0, 0.0], dir: 270, dist: 3.4, dur: 0.6, w: 2.2, h: 0.55, len: 0.8, e: 'out' });
      ds.forEach((d, i) => { const ta = tl + (1.9 - d[0]) / 3.4 * 0.45; A.hit(i, ta, 10, { soak: !d[2], wet: !!d[2] }); A.moveTo(i, ta, [me[0] + 0.7, me[1] + (i - 1) * 0.5], tl + 0.6 - ta, 'out'); A.turn(i, ta, 180, 0.4); });
      A.cap(0.3, 2.8, '水落到敌人身后，把它们冲到她脚下', 'It falls behind the foes and washes them to her feet'); } };
}
// F6 Pick-up: foes inside the orb turn over and over like washing; it swallows up to 3 small foes and carries them; let go: she throws it open
{ const me = [-2.4, 0.6], ds = [[-0.7, -0.3, { soaked: true }], [0.2, 0.3], [0.9, -0.5]]; const tr = 2.8;
  const P = (t) => { const u = clamp((t - 0.7) / (tr - 0.7)); return [lerp(-1.2, 1.1, EASE.s(u)), 0.6, lerp(0.3, -0.4, u) + 0.35 * Math.sin(u * Math.PI * 2)]; };
  const land = [[2.4, -1.1], [2.8, 0.1], [2.1, 0.9]];
  S.F6 = { T: tr + 1.4, cam: { x: 0.0, z: 0.0, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom', { to: 0.62 }], [0.62, 'bloomHold', { loop: true, until: tr - 0.2 }], [tr - 0.2, 'castSweep', { from: 0.25 }]],
    root: [{ t: 0.5, look: [0, 0] }, { t: tr - 0.2, look: [1.0, -0.3] }, { t: tr + 0.2, look: [2.5, 0] }], body: (t) => mixA(pawUp(t, 0.6, tr - 0.2, 0.8), tailSlap(t, tr + 0.1, 0.7), shake(t, tr + 0.8, 0.6, 0.5)),
    fx(A) { const orbAt = (t) => t < 0.7 ? A.at('tip', t).toArray() : P(t); FX.orb(A, { t0: 0.4, t1: tr + 0.05, at: orbAt, r: (t) => 0.3 + 0.12 * clamp((t - 0.9) / 1.5), pop: true });
      FX.rope(A, { t0: 0.7, t1: tr, from: 'tip', to: orbAt, w: 0.03, sag: 0.1 }); FX.pointer(A, { t0: 0.5, t1: tr + 0.6, at: (t) => t < tr ? [P(t)[0], 0, P(t)[2]] : [2.5, 0, 0] });
      ds.forEach((d, i) => { let tin = 0.7; for (let t = 0.7; t < tr; t += 0.02) { const q = P(t); if (Math.hypot(q[0] - d[0], q[2] - d[1]) < 0.4) { tin = t; break; } } const off = [[0.1, 0], [-0.08, 0.08], [0, -0.1]][i];
        A.hold(i, tin, tr + 0.4, 0.35, { spin: 10, at: (t) => t < tr ? [P(t)[0] + off[0], P(t)[2] + off[1]] : (() => { const u = EASE.out(clamp((t - tr) / 0.4)), q = P(tr); return [lerp(q[0], land[i][0], u), lerp(q[2], land[i][1], u)]; })() });
        A.hit(i, tin, 4, { soak: i > 0, noStop: true }); A.tag(i, tin + 0.1, tr, ['卷走', 'Swallowed'], C.foam); A.hit(i, tr + 0.5, 14, { crash: i === 0 }); });
      FX.splash(A, { t: tr + 0.05, at: (t) => { const q = P(tr); return [q[0], 0, q[2]]; }, r: 0.8, h: 0.8, crash: true });
      A.cap(0.3, tr, '卷进最多 3 个小敌人带着走', 'It swallows up to 3 small foes and carries them'); A.cap(tr, tr + 1.4, '松开：甩出去', 'Let go: they are thrown'); } };
}
// F7 Slam down (Kesh, 20 Nov): she points at the floor and a small whirlpool opens there and drags the pack into one knot; then she points up
// and a waterfall drops from the sky square on the knot: every foe under it is Slammed into the floor
{ const me = [-2.4, 0.2], c = [0.6, 0.2], ds = [[-0.5, 0.1, { soaked: true }], [1.7, -0.5], [1.2, 1.1]]; const tp = 0.6, tg = tp + 0.15, tk = tg + 0.85, td = tk + 0.45;
  ds.forEach((d) => d.length < 3 ? d.push({ flat: [[td + 0.05, td + 1.3]] }) : (d[2].flat = [[td + 0.05, td + 1.3]]));
  S.F7 = { T: td + 1.6, cam: { x: -0.4, z: 0.2, w: 6.8 }, her: H(me[0], me[1], 90), dum: ds, seq: [[0.3, 'castPlant', { to: 0.5 }], [tk - 0.1, 'castBloom']], body: (t) => mixA(lookUp(t, tk, td, 30), tailSlap(t, td, 0.9), shake(t, td + 0.5, 0.6, 0.6)),
    fx(A) { // the small whirlpool that gathers them
      FX.pool(A, { t0: tp, t1: td + 0.3, at: [c[0], 0, c[1]], r: (t) => lerp(1.9, 0.9, clamp((t - tp) / (tk - tp))), whirl: 1.4, op: 0.55 });
      ds.forEach((d, i) => { A.moveTo(i, tg, around(c, [200, 330, 80][i], 0.3), tk - tg, 'in2'); A.turn(i, tg, 240, tk - tg); });
      // the waterfall drops on the knot: its water reaches the floor at td, the sky lets go a beat later
      FX.waterfall(A, { t0: td - 0.4, t1: td + 0.75, cut: td + 0.4, at: [c[0], 0, c[1]], yaw: 0, w: 1.4, top: 2.6, th: 1.1, op: 0.85, rise: 0.4 });
      FX.ring(A, { t: td, at: [c[0], 0.02, c[1]], r0: 0.4, r1: 1.6, dur: 0.45, col: C.foam, op: 0.7, w: 0.2 });
      for (let k = 0; k < 4; k++) FX.splash(A, { t: td + k * 0.02, at: around(c, k * 90 + 45, 0.55), r: 0.45, h: 0.4, n: 5 });
      FX.strip(A, { t0: td, t1: td + 1.6, from: [c[0] - 0.8, 0, c[1]], to: [c[0] + 0.8, 0, c[1]], w: 1.4, op: 0.4, flow: 0.1 });
      ds.forEach((d, i) => A.hit(i, td + 0.02, 20, { slam: true, stun: 0.5 })); A.hit(0, td + 0.1, 29, { crash: true }); A.shake(td, 0.08, 0.25);
      A.cap(0.3, tk, '小漩涡把敌人卷到一起', 'A small whirlpool drags the pack into one knot'); A.cap(tk, td + 1.6, '瀑布从天而降砸在上面：每个敌人被拍进地里', 'A waterfall drops from the sky on them: every foe under it is Slammed into the floor'); } };
}
// F8 Flood crest: three water balls lobbed up behind her and she fire four jets together, a river as wide as a door (4 each); foes tumble in it; she leans on the staff and walks the river round; double on a wall
{ const me = [-2.5, 0.0], ds = [[-0.6, -0.4, { soaked: true }], [0.3, 0.35], [-0.1, 0.0]], wx = 2.2; const t0 = 0.3, b0 = 0.75, b1 = 2.75;
  S.F8 = { T: 4.2, cam: { x: -0.1, z: 0.0, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'castPlant', { to: 0.45 }], [0.75, 'plantLean', { loop: true, until: b1 }]],
    root: [{ t: b0 }, { t: 1.7, spin: -8, e: 'io2' }, { t: b1, spin: 6, e: 'io2' }], body: (t) => mixA(tailSlap(t, b0, 0.7), shiver(t, b0, b1, 0.8), shake(t, b1 + 0.3, 0.8, 1)),
    fx(A) { block(A, [wx + 0.3, 0.0], [0.4, 1.3, 2.6]);
      // she lobs three small water balls up behind her; then the balls and she all fire a jet of the base size together, the beams meeting on the pack (Kesh, 20 Nov)
      const ORB = [[-0.3, 0.85, 0.75], [-0.55, 0.0, 1.35], [-0.3, -0.85, 0.75]], tl = 0.32, tland = b0 - 0.08;
      const orbAt = (k, t) => { const r = A.rootAt(Math.max(t, tland)), f = A.fwd(Math.max(t, tland)), [bk, sd, hy] = ORB[k], P = new A.THREE.Vector3(r.x + f.x * bk - f.z * sd, hy, r.z + f.z * bk + f.x * sd);
        if (t >= tland) return P; const u = clamp((t - tl) / (tland - tl)), S = A.ahead(tl, 0.35, 0.8); return S.clone().lerp(P, EASE.out(u)).setY(lerp(S.y, P.y, u) + 0.9 * 4 * u * (1 - u)); };
      ORB.forEach((o, k) => { FX.orb(A, { t0: tl + 0.04 * k, t1: b1 + 0.05, at: (t) => orbAt(k, t), r: 0.13, col: C.deep, op: 0.95 });
        FX.splash(A, { t: b1 + 0.05, at: (tt) => { const p = orbAt(k, b1); return [p.x, p.y - 0.2, p.z]; }, r: 0.25, h: 0.3, n: 5 }); });
      const end = (t, sd) => { const p = A.ahead(t, wx - me[0] - 0.1, 0.25), f = A.fwd(t); return [p.x - f.z * sd, p.y, p.z + f.x * sd]; };
      FX.jet(A, { t: b0, hold: b1 - b0, from: (t) => A.ahead(t, 0.6, 0.15), to: (t) => end(t, 0), w: 0.62, dur: 0.15, tail: 0.25, wob: 0.05, speed: 4 });
      ORB.forEach((o, k) => FX.jet(A, { t: b0 + 0.04 * (k + 1), hold: b1 - b0 - 0.04 * (k + 1), from: (t) => orbAt(k, t), to: (t) => end(t, [0.35, 0.05, -0.35][k]), w: 0.22, dur: 0.18, tail: 0.25, wob: 0.05, speed: 4 + 0.3 * k }));
      FX.strip(A, { t0: b0, t1: 4.2, from: (t) => A.ahead(b0, 0.6, 0), to: [wx, 0, 0], grow: 0.25, w: 1.2, op: 0.5, flow: 1.6, foam: true }); FX.splash(A, { t: b0, at: (t) => A.ahead(b0, 0.65, 0), r: 0.6, h: 0.5 });
      ds.forEach((d, i) => { const ta = b0 + 0.15 + i * 0.1, tw = ta + 0.7; A.moveTo(i, ta, [wx - 0.35 - i * 0.12, d[1] * 0.6], 0.7, 'in'); A.turn(i, ta, 300, 0.7); for (let t = ta; t < tw; t += 0.25) A.hit(i, t, 4, { noStop: true, soak: t === ta }); A.hit(i, tw, 20, { slam: true }); for (let t = tw + 0.25; t < b1; t += 0.25) A.hit(i, t, 8, { noStop: true }); });
      slamFx(A, b0 + 0.85, [wx + 0.08, 0, 0]); A.dark(b0, b1, 0.18);
      A.cap(t0, 4.2, '大招：门宽的河（每次 4），推着敌人走；撞墙翻倍', 'Big skill: a river (4 each) that pushes the pack along; double on a wall'); } };
}

// ================================================================ Wave 浪
// F9 Leap: the ring wall lifts her on its crest; she curls nose to tail, turns once in the air and lands flat on her belly at the pointer in a second ring
{ const me = [-1.6, 0.2], pt = [1.0, 0.0], ds = [around(me, 30, 0.95), around(me, 250, 0.9), around(pt, 60, 0.85), around(pt, 200, 0.9)]; ds[2].push({ soaked: true }); const tp = 0.3 + 0.4, tl = tp + 0.75;
  S.F9 = { T: 3.2, cam: { x: -0.2, z: 0.1, w: 6.4 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant', { to: 0.42 }], [tp, 'tuckAir', { loop: true, until: tl, fade: 0.1 }], [tl, 'slide', { from: 0.55 }]],
    root: [{ t: tp, y: 0 }, { t: tl, x: pt[0], z: pt[1], y: 0, jump: 1.5, pitch: 360, e: 'lin' }],
    body: (t) => mixA(tailSlap(t, tp, 0.8), shake(t, 2.5, 0.6, 0.6)),
    fx(A) { FX.pointer(A, { t0: 0, t1: tl, at: [pt[0], 0, pt[1]] });
      for (const [c, t, idx] of [[me, tp, [0, 1]], [pt, tl, [2, 3]]]) { FX.ringwave(A, { t, at: [c[0], 0, c[1]], r0: 0.3, r1: 1.9, h: 0.6, dur: 0.45 }); idx.forEach((i) => { const d = ds[i], dx = d[0] - c[0], dz = d[1] - c[1], l = Math.hypot(dx, dz); A.hit(i, t + 0.12, d[2] ? 35 : 22, { crash: !!d[2], knock: [dx / l * 1.4, dz / l * 1.4], kdur: 0.35 }); }); A.shake(t, 0.05, 0.2); }
      A.cap(0.3, 3.2, '环浪把她抛起，落在指针处再来一圈', 'The ring throws her up; she lands at the pointer as a second ring'); } };
}
// F10 Three Crests 三叠浪 (Kesh's pick, 20 Nov; kit 2.0: each bigger): three crests, 0.4 s apart: 2.2 u, 3.5 u, then 5 u: 8 each, pushed 1.2 u each;
// a soaked foe slides 50% farther each time and stays soaked: the third is the Crash
{ const me = [-3.4, 0.1], RCH = [2.2, 3.5, 5.0], ds = [[-2.0, -0.5, { soaked: true }], [-1.9, 0.75], [-0.4, 0.1], [1.0, -0.6], [1.0, 0.9]]; const tw = 0.3 + 0.46, gap = 0.4, T = tw + 2 * gap + 2.0;
  S.F10 = { T, cam: { x: 0.0, z: 0.1, w: 9.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castSweep'], [tw + gap - 0.15, 'castSweep', { from: 0.3, speed: 1.4 }], [tw + 2 * gap - 0.15, 'castSweep', { from: 0.3, speed: 1.4 }]],
    body: (t) => mixA(tailSlap(t, tw, 0.5), tailSlap(t, tw + gap, 0.6), tailSlap(t, tw + 2 * gap, 0.9), shake(t, tw + 2 * gap + 1.0, 0.6, 0.6)),
    fx(A) { const du = (k) => 0.36 + 0.14 * k;
      RCH.forEach((R, k) => { FX.wave(A, { t: tw - 0.04 + k * gap, from: (t) => A.ahead(tw, 0.35, 0), dir: 90, dist: R - 0.35, dur: du(k), w: 2.6, h: 0.45 + 0.1 * k, len: 1.0, wFn: (u) => 1.6 + (R * 0.85) * u, wet: k === 0 });
        A.say(tw + k * gap, { zh: R + ' u', en: R + ' u' }, { col: C.sky }); });
      ds.forEach((d, i) => { let x = d[0] - me[0]; const wet = !!(d[2] && d[2].soaked), push = wet ? 1.8 : 1.2;
        RCH.forEach((R, k) => { if (x > R) return; const th = tw - 0.04 + k * gap + du(k) * clamp((x - 0.35) / (R - 0.35)); const cr = k === 2 && wet;
          A.hit(i, th, cr ? 13 : 8, { crash: cr, knock: [push, 0], kdur: 0.25, noStop: k < 2 }); x += push; }); });
      A.cap(0.3, T, '三叠浪：三道浪一道比一道大：2.2 u、3.5 u、5 u；每道 8，推 1.2 u；第三道才拍', 'Three Crests, each bigger: 2.2 u, 3.5 u, 5 u; 8 each, pushed 1.2 u each; the third is the Crash'); } };
}
// F11 Gathering tide: the left paw sweeps to the pointer: every wave leans that way as it breaks and flings its foes toward the spot; they Slam where they meet
{ const me = TIDE.me, ptr = [0.9, 0.1], ds = [[-0.4, -0.8, { soaked: true }], [1.5, 0.7, { soaked: true }], [-0.3, 1.2, { soaked: true }]]; const tc = 1.0, tw = tc + 0.5, tm = tw + 0.4, T = 4.0;
  const deg = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]) / D2R;
  S.F11 = { T, cam: { x: -0.2, z: 0.2, w: 7.4 }, her: H(me[0], me[1]), dum: ds, seq: [[tc, 'castSweep', { speed: 0.9 }]], root: [{ t: 0.2, look: ptr }],
    body: (t) => mixA(pawUp(t, tc, tw + 0.1, 1.0), turnTrunk(t, tc, tw + 0.2, 25), shake(t, tm + 0.1, 0.5, 0.6)),
    fx(A) { layWater(A, 0.05, T); FX.pointer(A, { t0: 0.6, t1: tm + 0.3, at: [ptr[0], 0, ptr[1]] });
      const src = tidePts().slice(0, 3); src.forEach((p, k) => FX.wave(A, { t: tw + k * 0.04, from: [p[0], 0, p[1]], dir: deg(p, ptr), dist: Math.min(1.4, Math.hypot(ptr[0] - p[0], ptr[1] - p[1]) * 0.6), dur: 0.4, w: 1.0, h: 0.6, len: 0.8 }));
      ds.forEach((d, i) => { const a = Math.atan2(d[1] - ptr[1], d[0] - ptr[0]); const to = [ptr[0] + Math.cos(a) * 0.32, ptr[1] + Math.sin(a) * 0.32]; A.hit(i, tw + 0.04 + i * 0.04, 16, { crash: true }); A.moveTo(i, tw + 0.08, to, tm - tw - 0.08, 'in2'); A.hit(i, tm, 12, { slam: true }); });
      slamFx(A, tm, [ptr[0], 0.5, ptr[1]]); A.shake(tm, 0.07, 0.2);
      A.cap(0.05, tc, '她的水：湿路、水洼', 'Her water: a wet path, puddles'); A.cap(tc, T, '每道浪把敌人甩向指针 3 u：16，拍；撞在一起', 'Each wave throws its foes 3 u toward the pointer: 16, Crash; they Slam where they meet'); } };
}
// F12 Abyss: the centre is a dark hole; foes go under; at the end one spout spits them out in a heap, stunned
{ const me = [-2.4, 0.3], c = [0.6, 0], ds = [around(c, 30, 1.4), around(c, 200, 1.3), around(c, 290, 1.2)]; ds[0].push({ soaked: true }); const tp = 0.3 + 0.4, tg = tp + 1.0, ts = tg + 2.0;
  const pile = [[1.9, 0.6], [2.2, 0.3], [2.0, 0.95]]; ds.forEach((d) => { const o = d[2] || {}; o.gone = [[tg, ts]]; o.flat = [[ts + 0.45, ts + 1.6]]; d[2] = o; });
  S.F12 = { T: ts + 1.8, cam: { x: 0.0, z: 0.1, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant'], [ts - 0.4, 'castPlant', { from: 0.2, speed: 1.2 }]],
    root: [{ t: 0.3, look: c }], body: (t) => mixA(tailSlap(t, tp, 0.5), tailSlap(t, ts, 0.8), shake(t, ts + 0.8, 0.6, 0.6)),
    fx(A) { FX.pool(A, { t0: tp, t1: ts + 0.3, at: [c[0], 0, c[1]], r: 1.6, whirl: 1.4, op: 0.6 }); FX.disc(A, { t: tp + 0.2, at: [c[0], 0, c[1]], r0: 0.1, r1: 0.55, hold: true, dur: ts - tp, col: '#0B1A3A', op: 0.85, y: 0.012 });
      ds.forEach((d, i) => { A.moveTo(i, tp + 0.2, [c[0] + 0.1 * (i - 1), c[1]], tg - tp - 0.2, 'in2'); A.turn(i, tp + 0.2, 300, tg - tp - 0.2); A.status(i, tp + 0.3, 'slow', 0.8); A.hit(i, tp + 0.4, 4, { noStop: true, soak: i > 0 }); FX.splash(A, { t: tg, at: [c[0], 0, c[1]], r: 0.35, h: 0.5, n: 5 }); A.moveTo(i, tg + 0.1, pile[i], 0.1, 'lin'); A.launch(i, ts, 1.0 + i * 0.25); A.hit(i, ts + 0.45 + i * 0.12, 12, { slam: true, stun: 1.2 }); });
      FX.column(A, { t: ts, at: [2.05, 0, 0.6], h: 1.8, r: 0.35, dur: 0.6, fall: true }); A.shake(ts + 0.5, 0.05, 0.2);
      A.hud(gaugeHud('吞没 2 秒', 'Swallowed 2 s', (t) => t < tg ? null : t < ts ? (t - tg) / 2 : null));
      A.cap(0.3, ts, '中心的敌人被吞没 2 秒', 'Foes at the centre are swallowed 2 s'); A.cap(ts, ts + 1.8, '然后吐成一堆，眩晕', 'Then spat out in one pile, stunned'); } };
}
// F13 Ring out: the waterfall pours on the pack; when the sky lets go, the pool it filled bursts outward as a ring wave and throws them 2 u out: Crash 16
{ const me = [-2.6, 0.2], c = [0.3, 0.1], ds = [around(c, 30, 0.55), around(c, 150, 0.6), around(c, 270, 0.5)]; ds[1].push({ soaked: true }); const tr = 0.3 + 0.5, tf = 2.7, T = tf + 1.4;
  S.F13 = { T, cam: { x: 0.0, z: 0.1, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPoint'], [tf - 0.2, 'castPoint', { from: 0.2 }]], body: (t) => mixA(lookUp(t, 0.4, 1.2, 20), tailSlap(t, tf + 0.05, 0.8), shake(t, tf + 0.6, 0.6, 0.7)),
    fx(A) { FX.waterfall(A, { t0: tr - 0.4, t1: tf + 0.3, cut: tf, at: [c[0], 0, c[1]], round: true, w: 1.8, top: 2.8, op: 0.8, rise: 0.4 });
      ds.forEach((d, i) => A.hit(i, tr + 0.05, null, { soak: true, slow: tf - tr }));
      FX.splash(A, { t: tf + 0.3, at: [c[0], 0, c[1]], r: 1.0, h: 0.8, crash: true }); FX.ringwave(A, { t: tf + 0.3, at: [c[0], 0, c[1]], r0: 0.4, r1: 2.6, h: 0.7, dur: 0.45 });
      ds.forEach((d, i) => { const an = [30, 150, 270][i], far = d[2] && d[2].soaked ? 3.0 : 2.6; A.hit(i, tf + 0.33, d[2] && d[2].soaked ? 26 : 16, { crash: true }); A.moveTo(i, tf + 0.33, around(c, an, far), 0.4, 'out'); });
      A.shake(tf + 0.3, 0.08, 0.25);
      A.cap(0.3, tf - 0.2, '瀑布落在敌群上，浸湿、变慢', 'The waterfall pours on the pack: soaked and slowed');
      A.cap(tf - 0.2, T, '潮环：再按，水潭向外炸成一圈浪，把它们推出 2 u：拍 16', 'Ring out: press again and its pool bursts outward as a ring wave, throwing them 2 u out: Crash 16'); } };
}
// F14 Crest: she stands up at the crest; on the press the wave folds and breaks under her feet: Crash 28, knocked flat
{ const me = [-2.7, 0.5], ds = [[0.9, 0.0, { soaked: true }], [1.5, 0.7], [1.4, -0.7]]; const t0 = 0.3, tu = t0 + 0.6, tb = t0 + 1.4;
  ds.forEach((d) => { const o = d[2] || {}; o.flat = [[tb + 0.12, tb + 1.4]]; d[2] = o; });
  const path = (u) => [lerp(-2.5, 0.3, u), 0.5 - 0.5 * u];
  S.F14 = { T: 3.6, cam: { x: -0.2, z: 0.1, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'castPlant', { to: 0.3, speed: 2 }], [t0 + 0.15, 'belly', { loop: true, until: tu }], [tu, 'surf', { loop: true, until: tb, fade: 0.12 }], [tb, 'castPlant', { from: 0.35 }]],
    root: (() => { const R = [{ t: t0 }]; for (let i = 1; i <= 12; i++) { const u = i / 12, p = path(u); R.push({ t: t0 + 1.1 * u, x: p[0], z: p[1], y: t0 + 1.1 * u < tu ? 0.28 : 0.28 + 0.7 * clamp((t0 + 1.1 * u - tu) / 0.5), look: [3, 0], e: 'lin' }); } R.push({ t: tb, y: 0.95 }); R.push({ t: tb + 0.3, y: 0, e: 'in2' }); return R; })(),
    body: (t) => mixA(tailSlap(t, tb, 1), shake(t, tb + 0.9, 0.6, 0.8)),
    fx(A) { const ride = (t) => { const r = A.rootAt(Math.min(t, tb)); return [r.x + 0.15, 0, r.z]; };
      FX.wave(A, { t: t0 + 0.05, at: ride, yaw: () => 90 * D2R, dur: tb - t0 - 0.05, out: 0.08, w: 1.4, h: 1.0, len: 1.1, hFn: (u) => 0.35 + 0.75 * u, wet: false });
      FX.wake(A, { of: ride, t0: t0 + 0.1, t1: tb, w: 1.0, op: 0.4, life: 1.6 });
      FX.splash(A, { t: tb + 0.05, at: [0.6, 0, 0.0], r: 1.3, h: 1.2, crash: true }); FX.ringwave(A, { t: tb + 0.05, at: [0.6, 0, 0.0], r0: 0.4, r1: 1.8, h: 0.5, dur: 0.4 });
      ds.forEach((d, i) => A.hit(i, tb + 0.1, d[2].soaked ? 45 : 28, { crash: true, knock: [(d[0] - 0.6) * 0.5, d[1] * 0.5], kdur: 0.3 })); A.shake(tb + 0.05, 0.08, 0.25);
      A.say(tb - 0.05, { zh: '按！', en: 'Press!' }, { col: C.foam });
      A.cap(t0, 3.6, '浪峰时再按：浪碎开，拍 28，击倒', 'Press again as the wave peaks: it breaks: Crash 28, knocked flat'); } };
}
// F15 Vice: the two walls run in and crush together on the spot in one clap; the foes caught between are squeezed out 3 u like a pip; no stun
{ const me = [-2.2, 0.2], c = [0.6, 0.1], ds = [[0.45, -0.15, { soaked: true }], [0.75, 0.35]]; const tp = 0.3 + 0.4, tm = tp + 0.4;
  S.F15 = { T: tm + 1.7, cam: { x: -0.3, z: 0.1, w: 6.2 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant', { speed: 0.9 }]],
    body: (t) => mixA(tailSlap(t, tm, 0.7), shake(t, tm + 0.9, 0.6, 0.6)),
    fx(A) { for (const s of [-1, 1]) FX.wave(A, { t: tp, from: [c[0], 0, c[1] + s * 1.9], dir: s > 0 ? 180 : 0, dist: 1.75, dur: tm - tp, e: 'in2', w: 1.7, h: 1.0, len: 0.8, out: 0.1, wet: false });
      FX.splash(A, { t: tm, at: [c[0], 0, c[1]], r: 1.0, h: 1.0, crash: true }); FX.column(A, { t: tm, at: [c[0], 0, c[1]], h: 2.0, r: 0.14, dur: 0.45, fall: true, umbrella: false });
      ds.forEach((d, i) => { A.hit(i, tm + 0.02 + i * 0.02, d[2] && d[2].soaked ? 32 : 20, { crash: !!(d[2] && d[2].soaked) });
        A.moveTo(i, tm + 0.04, [c[0] + (i ? 3.0 : -1.9), c[1] + (i ? 0.4 : -2.2)], 0.4, 'out'); A.launch(i, tm + 0.04, 0.3); A.turn(i, tm + 0.04, 720, 0.4); });
      A.shake(tm, 0.06, 0.2);
      A.cap(0.3, tm + 1.7, '拍：两道浪撞在一起：20，不眩晕，夹在中间的敌人被挤出 3 u', 'Crash: the walls crush together: 20, no stun; the foes caught between squirt out 3 u'); } };
}
// F16 Fall slam (Kesh, 20 Nov: a waterfall knocks them down instead of the whale): the column launches the pack; while they hang, a waterfall drops
// from the sky onto them and slams them down into a ring: launched 1.2 s; the fall: 12
{ const me = [-0.4, 0.1], c = [-0.4, 0.1], ds = [around(me, 10, 2.6), around(me, 130, 2.4), around(me, 230, 2.7), around(me, 300, 2.2)]; ds[1].push({ soaked: true }); const t0 = 0.3, ts = 1.3, tb = 1.75, tf = tb + 1.2;
  S.F16 = { T: tf + 1.1, cam: { x: -0.3, z: 0.1, w: 7.2, y: 0.8 }, her: H(me[0] - 0.9, me[1]), dum: ds, seq: [[t0, 'castSweep', { to: 0.5 }], [0.65, 'level', { loop: true, until: ts }], [ts, 'castBloom', { from: 0.3, to: 0.62 }], [tb, 'castBloom', { from: 0.62 }]],
    root: [{ t: 0.5 }, { t: ts, spin: 720, e: 'in2' }, { t: ts + 0.1, spin: 720, e: 'out' }], body: (t) => mixA(coil(t, 0.4, ts, 0.6), lookUp(t, tb, tf, 40), tailSlap(t, tf, 1), shake(t, tf + 0.5, 0.8, 1)),
    fx(A) { FX.pool(A, { t0: 0.45, t1: tb + 0.2, at: [c[0] + 0.6, 0, c[1]], r: (t) => lerp(3.0, 1.2, clamp((t - 0.45) / 1.2)), whirl: 1.5, op: 0.5 });
      const pc = (k) => around([c[0] + 0.6, c[1]], [10, 130, 230, 300][k] + 70, 0.6);
      ds.forEach((d, i) => { A.moveTo(i, 0.55, pc(i), 0.95, 'in2'); A.turn(i, 0.55, 260, 0.95); A.hit(i, tb + 0.05, i === 1 ? 64 : 40, { crash: i === 1 }); A.hold(i, tb + 0.05, tf - 0.25, 1.6 + 0.2 * (i % 2), { spin: 3 }); A.hit(i, tf, 12, {}); });
      FX.column(A, { t: tb, at: [c[0] + 0.6, 0, c[1]], h: 1.2, r: 0.6, dur: 0.4 });
      FX.waterfall(A, { t0: tf - 0.5, t1: tf + 0.5, cut: tf + 0.15, at: [c[0] + 0.6, 0, c[1]], round: true, w: 2.0, top: 3.2, op: 0.85, rise: 0.5 });
      FX.ringwave(A, { t: tf - 0.05, at: [c[0] + 0.6, 0, c[1]], r0: 0.5, r1: 2.6, h: 0.6, dur: 0.5 }); FX.splash(A, { t: tf - 0.05, at: [c[0] + 0.6, 0, c[1]], r: 1.4, h: 1.0, crash: true });
      A.shake(tb, 0.06, 0.2); A.shake(tf - 0.05, 0.09, 0.3); A.dark(ts - 0.1, tf, 0.25, 0.1, 0.3);
      A.cap(t0, tf + 1.1, '大招：瀑压：挑飞 1.2 秒，瀑布从天而降把它们砸下，落地成环：12', 'Big skill: Fall slam: launched 1.2 s; a waterfall drops from the sky and slams them down into a ring: 12'); } };
}

// ================================================================ Spring 泉
// F17 Kick waves 蹬浪 (kit 2.2): the base steps, with no ripple; her last landing kicks one wave back down her whole trail, bigger for each step: 8, 16 or 24
{ const me = [0.6, 0.1], st = [0.45, 0.95, 1.45], hop = 0.3, L = [[-1.0, 0.1], [-2.6, 0.1], [-4.2, 0.1]], ds = [[2.0, -0.5], [2.9, 0.6], [3.6, -0.9], [1.3, 1.2]]; const tk = st[2] + hop + 0.25, wd = 0.9, T = 4.6;
  S.F17 = { T, cam: { x: 0.2, z: 0.2, w: 11.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.2, 'idle', { loop: true, until: st[2] + hop }], [st[2] + hop, 'castSweep', { from: 0.25, speed: 1.3 }]],
    root: (() => { const R = [{ t: 0.1, look: ds[0] }]; st.forEach((t, k) => { R.push({ t, x: k ? L[k - 1][0] : me[0], z: me[1], look: ds[0] }); R.push({ t: t + hop, x: L[k][0], z: L[k][1], jump: 0.45, look: ds[0], e: 'lin' }); }); R.push({ t: tk - 0.05, look: [-9, 0.1], e: 's' }); R.push({ t: tk + 0.9, look: [-9, 0.1] }); R.push({ t: tk + 1.3, look: [-6, 2.5], e: 's' }); return R; })(),
    body: (t) => mixA(...st.map((s) => crouch(t, s - 0.08, s + 0.05, 0.7)), ...st.map((s) => crouch(t, s + hop - 0.02, s + hop + 0.12, 0.6)), crouch(t, tk - 0.2, tk + 0.2, 0.8), tailSlap(t, tk, 1.0), shake(t, tk + 1.6, 0.5, 0.5)),
    fx(A) { // the foes chase her as she steps away
      ds.forEach((d, i) => A.moveTo(i, 0.5, [d[0] - 2.6, d[1] * 0.8], 1.3, 'lin'));
      L.forEach((p, k) => { const tl = st[k] + hop; FX.splash(A, { t: tl, at: [p[0], 0, p[1]], r: 0.25, h: 0.25, n: 4 }); FX.puddle(A, { t0: tl, t1: tl + 3, at: [p[0], 0, p[1]], r: 0.34 }); A.say(tl, { zh: '第 ' + (k + 1) + ' 步', en: 'Step ' + (k + 1) }, { col: C.foam }); });
      // one wave, back down her whole trail: three steps: 6 u wide, 8 u long: 24, pushed 4.5 u
      FX.wave(A, { t: tk, from: [L[2][0] + 0.4, 0, L[2][1]], dir: 90, dist: 8, dur: wd, w: 6, h: 0.36, len: 1.5, wFn: (u) => 2.5 + 3.5 * Math.min(1, u * 2.5), out: 0.3 });
      ds.forEach((d, i) => { const x = d[0] - 2.6, th = tk + wd * clamp((x - (L[2][0] + 0.4)) / 8); A.hit(i, th, 24, { soak: true, knock: [4.5, 0], kdur: 0.55, big: i === 0 }); });
      A.shake(tk, 0.05, 0.2);
      A.cap(0.2, tk - 0.1, '蹬浪：三步如基础，但落地没有涟漪', 'Kick waves: the base steps, with no ripple at a landing');
      A.cap(tk - 0.1, T, '最后一步：尾巴一扫，一道浪顺来路打回；三步：宽 6 u、长 8 u：24，推 4.5 u', 'The last landing: one wave back down her trail; three steps: 6 u wide, 8 u long: 24, pushed 4.5 u'); } };
}
// F18 Lend a wave: a 10 bubble; the friend's feet are on a small board of water: it rides a wave 4 s: faster, and bumps foes aside: 8
{ const me = [-2.4, 0.5], al = [-1.0, -0.6], ds = [[0.3, -0.5], [1.3, -0.3, { soaked: true }]]; const tc = 0.3 + 0.38, t1 = 3.6;
  const path = (t) => { const u = clamp((t - tc - 0.3) / (t1 - tc - 0.3)); return [lerp(al[0], 2.4, u), al[1] + 0.25 * Math.sin(u * 5)]; };
  S.F18 = { T: 4.0, cam: { x: 0.0, z: 0.0, w: 6.8 }, her: H(me[0], me[1]), dum: [[al[0], al[1], { ally: true, face: 0 }], ...ds], seq: [[0.3, 'castBloom', { speed: 1.2 }]], root: [{ t: 0.3, look: al }],
    body: (t) => pawUp(t, 0.45, 1.0, 0.7),
    fx(A) { FX.bolt(A, { t: tc, to: (t) => A.dpt(0, t, 0.62), dur: 0.3, r: 0.08, col: C.bubble, splash: false });
      A.hold(0, tc + 0.3, t1, 0.12, { at: path }); shieldOn(A, 0, tc + 0.3, t1, 10);
      FX.wave(A, { t: tc + 0.3, at: (t) => { const p = path(t); return [p[0] - 0.1, 0, p[1]]; }, yaw: () => 90 * D2R, dur: t1 - tc - 0.3, out: 0.2, w: 0.8, h: 0.35, len: 0.8, wet: false }); FX.wake(A, { of: (t) => { const p = path(t); return [p[0], 0, p[1]]; }, t0: tc + 0.3, t1, w: 0.6, op: 0.35, life: 1.2 });
      ds.forEach((d, i) => { let tk = 0; for (let t = tc + 0.3; t < t1; t += 0.02) { const p = path(t); if (Math.abs(p[0] - d[0]) < 0.25) { tk = t; break; } } A.hit(i + 1, tk, 8, { soak: true, knock: [0.2, d[1] > -0.4 ? 1.0 : -1.0], kdur: 0.3 }); });
      A.say(tc + 0.5, { zh: '更快', en: 'Faster' }, { col: C.sky });
      A.cap(0.3, 4.0, '泡泡 10；队友踏浪 4 秒：更快，把敌人撞开：8', 'A 10 bubble; the friend rides a wave 4 s: faster, and bumps foes aside: 8'); } };
}
// F19 Spouts: no slow: three waterspouts 水龙卷 (Kesh's refs) walk about under the cloud like drunks; each plucks a foe, whirls it and lets it fall on a neighbour
{ const me = [-2.4, 0.4], c = [0.4, 0], ds = [[-0.4, -0.6], [0.5, 0.5, { soaked: true }], [1.3, -0.4], [0.9, 1.2]];
  const sp = [(t) => [lerp(-0.6, -0.4, Math.sin(t)), lerp(-0.6, -0.2, t / 4)], (t) => [0.5 + 0.2 * Math.sin(t * 2), 0.5 - 0.1 * t], (t) => [1.3 - 0.15 * t, -0.4 + 0.15 * Math.sin(t * 2.5)]];
  S.F19 = { T: 4.4, cam: { x: -0.2, z: 0.0, w: 6.6, y: 0.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom']], body: (t) => mixA(lookUp(t, 0.5, 1.4, 25), shake(t, 3.6, 0.5, 0.5)),
    fx(A) { FX.rain(A, { t0: 0.85, t1: 4.2, at: [c[0], 0, c[1]], r: 1.5, h: 2.2, n: 30 });
      const plan = [[0, 1.2, 2.2, 2], [1, 1.6, 2.6, 3], [2, 2.0, 3.0, 1]];
      plan.forEach(([i, ta, tb, j], k) => { const P = sp[k]; FX.spout(A, { t: 0.95, at: (t) => { const p = t < ta ? P(t) : t < tb ? A.dpos(i, t) : P(t); return [p.x != null ? p.x : p[0], 0, p.z != null ? p.z : p[1]]; }, follow: true, h: 2.1, r: 0.42, dur: 3.2, rise: 0.4 });
        const dz = ds[j]; A.hold(i, ta, tb, 1.1, { spin: 12, at: (t) => { const u = clamp((t - ta) / (tb - ta)); return [lerp(ds[i][0], dz[0] + 0.1, EASE.s(u)), lerp(ds[i][1], dz[1] + 0.1, EASE.s(u))]; } });
        A.hit(i, ta, 3, { noStop: true, soak: !ds[i][2] }); A.tag(i, ta + 0.1, tb, ['卷起', 'Spun'], C.foam); A.hit(i, tb + 0.28, 12, { slam: true }); A.hit(j, tb + 0.29, 12, { slam: true }); FX.splash(A, { t: tb + 0.28, at: [dz[0], 0, dz[1]], r: 0.5, h: 0.5, crash: true }); });
      A.cap(0.3, 4.4, '不减速：三根水旋乱走，卷起敌人砸到另一个身上', 'No slow: three spouts wander: each lifts a foe, spins it and drops it on another'); } };
}
// F20 Toss: at the top a hand of water bats the launched foes 3 u to the pointer
{ const me = [-2.2, 0.3], c = [0.0, 0.0], pt = [2.0, -0.9], ds = [[-0.25, -0.25, { soaked: true }], [0.3, 0.3]]; const tp = 0.3 + 0.4, te = tp + 0.6, ttop = te + 0.4;
  S.F20 = { T: 3.4, cam: { x: -0.1, z: 0.0, w: 6.4, y: 0.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.15, 'castPlant', { to: 0.42, speed: 1.8 }], [0.4, 'castPlant', { from: 0.2 }], [ttop - 0.2, 'castSweep', { from: 0.3, speed: 1.3 }]],
    body: (t) => mixA(lookUp(t, te, ttop + 0.3, 25), shake(t, 2.8, 0.6, 0.5)),
    fx(A) { FX.pointer(A, { t0: 0, t1: ttop + 0.7, at: [pt[0], 0, pt[1]] }); FX.pool(A, { t0: tp - 0.1, t1: te + 0.1, at: [c[0], 0, c[1]], r: (t) => 0.8 + 0.04 * Math.sin(t * 50), op: 0.45 });
      FX.column(A, { t: te, at: [c[0], 0, c[1]], h: 2.4, r: 0.55, dur: 0.75 }); A.hit(0, te + 0.02, 16, { wet: true, up: 3.0, big: true }); A.hit(1, te + 0.03, 16, { up: 1.5 });
      FX.jet(A, { t: ttop, from: [c[0] - 0.4, 1.6, c[1] + 0.2], to: [pt[0] + 0.3, 0.8, pt[1]], dur: 0.2, hold: 0.15, w: 0.5, tail: 0.2 });
      ds.forEach((d, i) => { A.moveTo(i, ttop + 0.03 * i, [pt[0] + (i ? 0.35 : -0.2), pt[1] + (i ? 0.3 : -0.1)], 0.45, 'out'); A.hit(i, ttop + 0.05, null); A.hit(i, ttop + 0.6, 8, {}); }); FX.splash(A, { t: ttop + 0.6, at: [pt[0], 0, pt[1]], r: 0.7, h: 0.6 });
      A.cap(0.15, 3.4, '在顶点，一只水手把挑飞的敌人拍到指针 3 u', 'At the top a wave throws the launched foes 3 u to the pointer'); } };
}
// F21 Tow: a ribbon runs from the staff's butt to the bubble; the sealed foe bobs after her on it like a balloon. Press again: she turns once with the rope over her head, like a hammer thrower, and lets the bubble fly to the pointer, where it pops
{ const me = [-0.3, 0.6], d0 = [1.2, 0.4], ptr = [1.6, -1.0]; const tc = 0.3 + 0.6, ts = tc + 0.5, tw = ts + 1.3, tt = tw + 0.45, tl = tt + 0.4, T = tl + 1.1;
  S.F21 = { T, cam: { x: -0.2, z: -0.1, w: 6.8, y: 0.6 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1], { soaked: true }], [ptr[0] + 0.45, ptr[1] - 0.1], [-2.4, -0.5]],
    seq: [[0.3, 'castBloom'], [ts, 'walk', { loop: true, until: tw, fade: 0.15 }], [tw, 'castSweep', { speed: 1.2 }], [tl + 0.2, 'idle', { loop: true, until: T, fade: 0.2 }]],
    root: [{ t: ts }, { t: ts + 0.3, look: [-2, -0.4] }, { t: tw, x: -1.4, z: 0.0, e: 'lin' }, { t: tt, spin: 360, look: ptr, e: 'io2' }],
    body: (t) => mixA(pawUp(t, 0.4, 0.9, 0.6), pawUp(t, tw, tt, 1.0), lookUp(t, tw, tt, 10), tailSlap(t, tt, 0.6)),
    fx(A) { const tail = (t) => { const r = A.rootAt(t), f = A.fwd(t); return [r.x - f.x * 0.9, r.z - f.z * 0.9]; };
      const follow = (t) => { if (t < tw) { const q = tail(Math.max(ts, t - 0.35)); const u = EASE.s(clamp((t - ts) / 0.4)); return [lerp(d0[0], q[0], u), lerp(d0[1], q[1], u)]; }
        const r = A.rootAt(t); if (t < tt) { const a = Math.atan2(-(tail(tw)[1] - r.z), tail(tw)[0] - r.x) + ((t - tw) / (tt - tw)) * 2 * Math.PI * Math.sign(1); const R0 = 1.2; return [r.x + Math.cos(a) * R0, r.z - Math.sin(a) * R0]; }
        const s = follow(tt - 1e-4), u = EASE.out(clamp((t - tt) / (tl - tt))); return [lerp(s[0], ptr[0], u), lerp(s[1], ptr[1], u)]; };
      A.hold(0, ts, tl, 0.7, { at: follow }); FX.pointer(A, { t0: tw - 0.3, t1: tl + 0.2, at: [ptr[0], 0, ptr[1]] });
      FX.bubble(A, { t0: tc, t1: tl, at: (t) => t < ts ? (() => { const s = A.at('tip', tc), q = A.dpt(0, ts, 0.6), u = EASE.s(clamp((t - tc) / 0.5)); return [lerp(s.x, q.x, u), lerp(s.y, q.y, u), lerp(s.z, q.z, u)]; })() : A.dpt(0, t, 0.6).toArray(), r: (t) => t < ts ? 0.25 : 0.62, hits: [ts, tl - 0.02] });
      FX.rope(A, { t0: ts, t1: tt + 0.05, from: 'butt', to: (t) => A.dpt(0, t, 0.3), w: 0.05, sag: 0.2 }); A.tag(0, ts + 0.1, tw, ['牵走', 'Towed'], C.foam);
      // it lands on the pointer beside a foe: the pop (12, Crash, soaks) and a Slam for both
      FX.splash(A, { t: tl, at: [ptr[0], 0, ptr[1]], r: 0.7, h: 0.8, crash: true }); A.hit(0, tl + 0.02, 19, { crash: true }); A.hit(1, tl + 0.03, 12, { slam: true }); A.hit(0, tl + 0.08, 12, { slam: true }); slamFx(A, tl, [ptr[0] + 0.22, 0.5, ptr[1]]); A.soak(1, tl + 0.1, 4); A.shake(tl, 0.06, 0.2);
      A.cap(0.3, tw, '封住的敌人被水绳牵着跟她走，像气球', 'The sealed foe follows her on a rope of water, like a balloon'); A.cap(tw, T, '再按：甩一圈，把泡泡扔到指针处（5 u 内）爆开：12，拍；砸到敌人就撞', 'Press again: she swings the rope once and throws it to the pointer (5 u): it pops, 12, Crash; onto a foe it Slams'); } };
}
// F22 Round-up: the V-ripple draws a white ring round foes; when it closes the water inside drops and rushes to the middle with the foes: all swept to its centre and Slammed
{ const me = [-2.3, 0.4], c = [0.6, 0.1], R = 1.4, ds = [around(c, 20, 0.9), around(c, 140, 0.85), around(c, 250, 0.8)]; ds[1].push({ soaked: true }); const t0 = 0.3, tin = t0 + 0.4, tout = tin + 1.4;
  S.F22 = { T: tout + 1.4, cam: { x: -0.3, z: 0.1, w: 6.4, y: 0.6 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'tuckAir', { loop: true, until: tout + 0.5, fade: 0.15 }]],
    root: [{ t: t0 }, { t: tin, fw: 0.9, y: -0.4, jump: 0.6, pitch: 120, e: 'lin' }, { t: tout - 0.01, x: c[0] - R - 0.2, z: c[1], y: -0.6, pitch: 120, cut: true }, { t: tout, x: c[0] - R - 0.2, z: c[1], y: -0.6, pitch: -60, cut: true }, { t: tout + 0.35, x: c[0] - R - 0.5, z: c[1], y: 1.0, pitch: -300, e: 'out' }, { t: tout + 0.8, x: c[0] - R - 0.7, z: c[1], y: 0, pitch: -360, e: 'in' }],
    hide: [[tin, tout]], body: (t) => shake(t, tout + 0.95, 0.6, 1),
    fx(A) { FX.splash(A, { t: tin, at: (t) => A.ahead(tin - 0.05, 0.3, 0), r: 0.45, h: 0.5 });
      const ringPt = (u) => { const a = Math.PI + u * 2 * Math.PI; return [c[0] + Math.cos(a) * R, 0.02, c[1] - Math.sin(a) * R]; };
      FX.wake(A, { of: (t) => ringPt(clamp((t - tin) / (tout - tin - 0.1))), t0: tin, t1: tout - 0.1, w: 0.25, op: 0.6, life: 0.6, foam: true });
      for (let k = 0; k < 12; k++) { const tk = tin + 0.05 + k * 0.1; FX.ring(A, { t: tk, at: ringPt(k / 12), r0: 0.1, r1: 0.45, dur: 0.5, col: C.foam, op: 0.5, w: 0.15 }); }
      const tc = tout - 0.05; FX.ringwave(A, { t: tc, at: [c[0], 0, c[1]], r0: R, r1: 0.2, h: 0.6, dur: 0.35 }); FX.column(A, { t: tc + 0.35, at: [c[0], 0, c[1]], h: 1.4, r: 0.4, dur: 0.5, fall: true });
      ds.forEach((d, i) => { A.moveTo(i, tc, around(c, [20, 140, 250][i], 0.3), 0.35, 'in2'); A.turn(i, tc, 200, 0.35); A.hit(i, tc + 0.36, d[2] ? 21 : 12, { slam: true, stun: 0.5, crash: !!d[2] }); });
      A.shake(tc + 0.36, 0.07, 0.25);
      A.cap(t0, tout + 1.4, '绕敌人游一圈：圈里的全被卷到中心并相撞', 'Swim a ring round foes: all inside are swept to its centre and Slammed'); } };
}
// F23 Alley-oop: a ring of water turns round the friend's feet; a foe thrown to the friend sits down hard in it, stunned, and takes 30% more from their next hit
{ const me = [-2.3, 0.6], al = [0.9, -0.4], d0 = [-0.6, 0.6]; const tw = 0.3 + 0.48, tl = tw + 0.6, th = tl + 0.5;
  S.F23 = { T: 3.4, cam: { x: -0.4, z: 0.1, w: 6.2 }, her: H(me[0], me[1]), dum: [[al[0], al[1], { ally: true, face: 200 }], [d0[0], d0[1], { soaked: true, flat: [[tl, tl + 1.4]] }]], seq: [[0.3, 'whip']],
    root: [{ t: 0.3, look: d0 }, { t: tw, look: d0 }, { t: tw + 0.45, look: al, e: 'io2' }], body: (t) => mixA(tailSlap(t, tw + 0.5, 0.6), shake(t, 2.6, 0.6, 0.6)),
    fx(A) { FX.ring(A, { t: 0.4, at: { d: 0, y: 0 }, r0: 0.6, r1: 0.6, dur: 2.8, col: C.cobalt, op: 0.6, w: 0.3, e: 'lin' });
      FX.rope(A, { t0: tw - 0.05, t1: tw + 0.45, from: 'tip', to: (t) => A.dpt(1, t, 0.55), w: 0.09, head: 0.1, sag: 0.05 });
      A.hit(1, tw + 0.06, 12, { wet: true }); A.moveTo(1, tw + 0.1, [al[0] - 0.6, al[1] + 0.1], 0.5, 'io2'); A.launch(1, tw + 0.1, 0.7); A.status(1, tl, 'stun', 1.2); FX.splash(A, { t: tl, at: [al[0] - 0.6, 0, al[1] + 0.1], r: 0.5, h: 0.5 });
      A.turn(0, th - 0.15, -40, 0.12); A.turn(0, th + 0.1, 40, 0.25); A.hit(1, th, 26, { big: true }); A.say(th + 0.05, { zh: '+30%', en: '+30%' }, { col: C.sky }); A.tag(1, tl + 0.05, th, ['送球', 'Alley-oop'], C.foam);
      A.cap(0.3, 3.4, '甩给队友的敌人被眩晕，队友下一击 +30%', "A foe thrown to the friend arrives stunned and takes 30% more from their next hit"); } };
}
// F24 Pinball: foes cannot leave; foes that hit the skin ring off it like marbles in a bowl: its skin is a wall for Slam and bounces them back
{ const me = [-0.9, 0.2], c = [0, 0.1], R = 2.0, ds = [[0.4, -0.5, { soaked: true }], [0.8, 0.6], [-0.2, 1.0]]; const t0 = 0.3, tu = t0 + 0.9, tw = 2.0 + 0.46;
  S.F24 = { T: 4.8, cam: { x: 0.0, z: 0.1, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'whip', { to: 0.4 }], [0.6, 'castBloom', { from: 0.3 }], [2.0, 'castSweep']],
    root: [{ t: 1.9, look: [2, 0.2] }], body: (t) => mixA(coil(t, 0.3, 0.75, 0.8), lookUp(t, 0.9, 1.6, 20), tailSlap(t, tw, 0.6), shake(t, 4.2, 0.5, 0.6)),
    fx(A) { const hitsAt = []; FX.wave(A, { t: tw - 0.04, from: (t) => A.ahead(tw, 0.35, 0), dir: 90, dist: 1.7, dur: 0.4, w: 2.4, h: 0.7, len: 0.9 });
      ds.forEach((d, i) => { const ta = tw + 0.2 + i * 0.04; const a = Math.atan2(d[1] - c[1] + (i - 1) * 0.4, 1.4); const sk = [c[0] + Math.cos(a) * (R - 0.25), c[1] + Math.sin(a) * (R - 0.25)]; const back = [lerp(sk[0], c[0], 0.6) - 0.3, lerp(sk[1], c[1], 0.5)];
        A.hit(i, ta, d[2] ? 32 : 20, { crash: !!d[2] }); A.moveTo(i, ta, sk, 0.3, 'in'); A.hit(i, ta + 0.3, 20, { slam: true, stun: 0.5 }); A.moveTo(i, ta + 0.3, back, 0.4, 'out'); A.turn(i, ta + 0.3, 200, 0.3); hitsAt.push(ta + 0.3);
        FX.ring(A, { t: ta + 0.3, at: [sk[0] + Math.cos(a) * 0.25, 0.5, sk[1] + Math.sin(a) * 0.25], r0: 0.1, r1: 0.6, dur: 0.35, dir: [Math.cos(a), 0, Math.sin(a)], col: C.foam, op: 0.8, w: 0.18 }); });
      FX.dome(A, { t0: tu, t1: 4.6, at: [c[0], 0, c[1]], r: R, flat: 0.75, op: 0.45, grow: 0.5, hits: hitsAt });
      A.cap(t0, 4.8, '大招：敌人出不去；穹壁当墙相撞，弹回来', 'Big skill: foes cannot leave; its skin is a wall for Slam and bounces them back'); } };
}
