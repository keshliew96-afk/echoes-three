// Flood 涨潮 forms (kit 2.0): her water lies on the floor as still water 静水 (it soaks, no damage), touching water is one piece 一片,
// and the forms make it, join it, grow it, use the whole piece, or spend it. Built from the passed water looks only (pool, wet path, wave, ring, column, fall, rain).
import { FX, C, EASE, clamp, lerp } from './tc.js';
import { H, FORMS, D2R, around, fan, gaugeHud, foeBolt, ticks, shieldOn, streamOn, tailSlap, shake, coil, leanBack, crouch, turnTrunk, lookUp, shiver, tuck, pawUp, mixA } from './defs.js';
import { TIDE, layWater, block, slamFx } from "./defs.js";
const W = FORMS.fl;
const P = (p) => [p[0], 0, p[1]];
// still water: a pond (round) and a canal (a line)
const pond = (A, t0, t1, at, r, o = {}) => FX.pool(A, Object.assign({ t0, t1, at: typeof at === 'function' ? at : P(at), r, op: 0.42, fin: 0.3 }, o));
const canal = (A, t0, t1, a, b, w = 0.9, o = {}) => FX.strip(A, Object.assign({ t0, t1, from: P(a), to: P(b), w, op: 0.38, flow: 0.15, fin: 0.3 }, o));
// a road of still water laid behind something that moves (the orb's stroke, her ride): it stays to the card's end
const road = (A, of, t0, t1, w, o = {}) => FX.wake(A, Object.assign({ of, t0, t1, w, op: 0.27, life: 30 }, o));
const one = (A, t) => A.say(t, { zh: '连成一片', en: 'One piece' }, { col: C.sky });

// ================================================================ passive, basic attack, dash
// P: a Crash leaves a puddle (1.2 u, 4 s) under each foe it crashes that stands on dry floor; puddles that touch are one piece
{ const me = [-2.0, 0], d0 = [0.4, -0.5], d1 = [0.5, 0.55]; const tc = 0.3 + 0.44, T = 4.2;
  W.P = { T, cam: { x: 0.0, z: 0.1, w: 6.6 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1], { soaked: true }], d1],
    seq: [[0.3, 'castPoint']], root: [{ t: 0.2, look: [0.45, 0.05] }], body: (t) => mixA(tailSlap(t, tc + 0.02, 0.8), shake(t, 1.7, 0.6, 0.6)),
    fx(A) { [0, 1].forEach((i) => FX.jet(A, { t: tc - 0.04 + i * 0.02, to: (t) => A.dpt(i, tc, 0.62).add(new A.THREE.Vector3(1.2, 0, 0)), dur: 0.12, hold: 0.18, w: 0.22 }));
      A.hit(0, tc + 0.1, 29, { crash: true }); A.hit(1, tc + 0.12, 18);
      [d0, d1].forEach((d, i) => { FX.splash(A, { t: tc + 0.2, at: P(d), r: 0.45, h: 0.35 }); pond(A, tc + 0.25, T, d, 0.6); A.soak(i, tc + 1.25, 4, { quiet: i > 0 }); });
      one(A, tc + 0.9);
      A.cap(0.3, 2.1, '涨潮：拍会在被拍的敌人脚下留一个水洼（1.2 u，4 秒）', 'Flood: a Crash leaves a puddle (1.2 u, 4 s) under each foe it crashes');
      A.cap(2.1, T, '静水：只浸湿，不伤害；碰在一起的水算一片', 'Still water: it soaks, no damage; water that touches is one piece'); } };
}
// B: where the stream stays 1 s it pools: one puddle that grows to 2 u; the tsunami (after 5 s, as the base) leaves its whole path as water, 6 s
{ const me = [-2.4, 0.1], d0 = [-0.2, 0.1], d1 = [0.5, -0.3], d2 = [1.9, 0.3]; const s0 = 0.3, s1 = 5.3, tz = s1 + 0.05, tw = tz + 0.68, T = 8.8, g0 = s0 + 1.1;
  W.B = { noWarp: true, T, cam: { x: 0.2, z: 0.0, w: 7.6 }, her: H(me[0], me[1]), dum: [d0, d1, d2],
    seq: [[s0, 'stream', { loop: true, until: s1, fade: 0.15 }], [tz, 'tsunami']],
    body: (t) => mixA(shiver(t, s0 + 0.15, s1), tailSlap(t, tz + 0.7, 0.6), shake(t, tw + 1.6, 0.6, 0.6)),
    fx(A) { FX.stream(A, { t0: s0 + 0.12, t1: s1, to: (t) => A.dpt(0, t, 0.6), w: 0.15 }); ticks(A, 0, s0 + 0.3, s1, 3, 0.2);
      FX.orb(A, { t0: s0 + 0.2, t1: s1 + 0.4, at: 'tip', r: (t) => 0.04 + 0.11 * clamp((t - s0) / 5), pop: false, op: 0.7 });
      // the puddle: it forms once the stream has stayed 1 s on one spot and grows to 2 u in 2 s
      pond(A, g0, tw + 0.6, d0, (t) => lerp(0.2, 1.0, EASE.out(clamp((t - g0) / 2.0))), { grow: false });
      FX.ring(A, { t: g0, at: [d0[0], 0.03, d0[1]], r0: 0.1, r1: 0.5, dur: 0.4, col: C.foam, op: 0.6, w: 0.15 }); A.soak(0, g0 + 0.2, 8); A.soak(1, g0 + 1.4, 8);
      A.hud(gaugeHud('水流 5 秒', 'Stream 5 s', (t) => t < s0 ? 0 : t < s1 ? (t - s0) / 5 : t < tz + 0.7 ? 1 : 0, { full: true }));
      A.cap(s0, 3.6, '水流停在一处 1 秒就积水：一个水洼，长到 2 u', 'Where the stream stays 1 s it pools: one puddle that grows to 2 u');
      A.cap(3.6, s1, '满 5 秒……', '5 s of stream ...');
      FX.wave(A, { t: tw, from: (t) => A.ahead(tw, 0.45, 0), dir: 90, dist: 6, dur: 1.1, w: 1.3, h: 0.8, len: 0.9, wet: false });
      canal(A, tw + 0.05, T, [me[0] + 0.45, me[1]], [me[0] + 6.45, me[1]], 1.3, { grow: 1.1, flow: 0.05 });
      const hitAt = (x) => tw + (x - (me[0] + 0.45)) / 6 * 1.1;
      A.hit(0, hitAt(d0[0]), 45, { crash: true, knock: [1.5, 0], kdur: 0.4, soak: true }); A.hit(1, hitAt(d1[0]), 45, { crash: true, knock: [1.5, 0], kdur: 0.4, soak: true }); A.hit(2, hitAt(d2[0]), 28, { knock: [1.0, 0], kdur: 0.4, soak: true });
      A.cap(tz, T, '海啸走过的整条路留成水，6 秒', 'The tsunami leaves its whole path as water, 6 s'); A.shake(tw, 0.05, 0.25); } };
}
// D: the dash as the base (wet path 3 s); where she steps off, the tide sinks into a pond of still water, 2.6 u, 8 s
{ const me = [-2.2, 0.2]; const t0 = 0.4, L = 2.8, T = 5.0, end = [me[0] + L, me[1]];
  const k = (t) => { const a = t - t0; const ss = (x0, x1, x) => { x = clamp((x - x0) / (x1 - x0)); return x * x * (3 - 2 * x); }; return ss(0.10, 0.22, a) * (1 - ss(0.62, 0.80, a)); };
  W.D = { noWarp: true, T, cam: { x: -0.1, z: 0.0, w: 6.8 }, her: H(me[0], me[1]), dum: [[-0.6, 0.75], [1.1, -0.55], [1.25, 1.1]],
    seq: [[t0, 'dash']],
    root: (() => { const R = [{ t: t0 }]; for (let i = 1; i <= 16; i++) { const a = 0.06 + i * 0.05, t = t0 + a; R.push({ t, fw: L * EASE.s(clamp((a - 0.08) / 0.74)), y: 0.68 * k(t), e: 'lin' }); } return R; })(),
    fx(A) { const ride = (t) => { const r = A.rootAt(t); return [r.x + Math.sin(r.yaw) * 0.25, 0, r.z + Math.cos(r.yaw) * 0.25]; };
      FX.wave(A, { t: t0 + 0.08, at: ride, yaw: () => 90 * D2R, dur: 0.72, out: 0.15, w: 1.0, h: 0.9, len: 1.1, rise: 0.14, hFn: (u) => Math.max(0.05, k(t0 + 0.08 + u * 0.72) * 1.05 + 0.05), wet: false });
      FX.strip(A, { t0: t0 + 0.15, t1: t0 + 3.2, from: [me[0], 0, me[1]], to: [end[0], 0, end[1]], grow: 0.65, w: 1.0, op: 0.35, flow: 0.2 });
      A.soak(0, t0 + 0.45, 3.2); A.status(0, t0 + 0.45, 'slow', 2.6);
      // the tide sinks where she steps off: a ring out to the pond's edge, then flat still water
      FX.ring(A, { t: t0 + 0.78, at: [end[0], 0.03, end[1]], r0: 0.3, r1: 1.3, dur: 0.45, col: C.foam, op: 0.7, w: 0.12 }); FX.splash(A, { t: t0 + 0.78, at: P(end), r: 0.6, h: 0.35 });
      pond(A, t0 + 0.8, T, end, 1.3, { fin: 0.45 }); A.soak(1, t0 + 1.3, 8); A.soak(2, t0 + 1.4, 8, { quiet: true });
      A.cap(0.1, 1.7, '冲刺如基础：乘潮 2.8 u，湿路 3 秒', 'The dash as the base: a tide ride, 2.8 u; the wet path, 3 s');
      A.cap(1.7, T, '涨潮：下潮的地方沉成一个水塘，2.6 u，8 秒', 'Flood: where she steps off, the tide sinks into a pond, 2.6 u, 8 s'); } };
}

// ================================================================ Stream 流
// F1 Pond-maker 添塘 (kit 2.2): the bolt bursts where it lands: 14 within 1.5 u, and leaves a pond, 2 u, 6 s; on her water too: the two overlap and are one piece
{ const me = [-2.6, 0.1], c = [0.0, -0.2], c2 = [1.25, 0.45], ds = [[c[0], c[1]], around(c, 200, 1.1), around(c, 80, 1.0), [c2[0] + 0.1, c2[1] + 0.1], around(c2, 330, 1.0)]; const t1 = 0.3, tb = t1 + 0.44 / 1.3, th = tb + 0.4, t2 = 2.3, tb2 = t2 + 0.44 / 1.3, th2 = tb2 + 0.4, T = 4.8;
  W.F1 = { T, cam: { x: -0.2, z: 0.0, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[t1, 'castPoint', { speed: 1.3 }], [t2, 'castPoint', { speed: 1.3 }]],
    root: [{ t: 0.2, look: c }, { t: t2 - 0.2, look: c }, { t: t2 + 0.1, look: c2, e: 's' }],
    body: (t) => mixA(turnTrunk(t, t1, t1 + 0.45, -20), turnTrunk(t, t2, t2 + 0.45, -20), shake(t, 3.8, 0.5, 0.6)),
    fx(A) { [[tb, th, c, [0, 1, 2]], [tb2, th2, c2, [3, 4, 2]]].forEach(([b, h, at, who], k) => { FX.bolt(A, { t: b, to: [at[0], 0.5, at[1]], dur: 0.4, r: 0.2, splash: false }); FX.splash(A, { t: h, at: P(at), r: 0.9, h: 0.5 });
        FX.ring(A, { t: h, at: [at[0], 0.03, at[1]], r0: 0.3, r1: 1.5, dur: 0.2, col: C.foam, op: 0.7, w: 0.12 }); who.forEach((i, j) => A.hit(i, h + 0.03 * j, 14, { soak: !(k === 1 && i === 2), noStop: j > 0 }));
        pond(A, h + 0.08, T, at, 1.0, { fin: 0.5 }); });
      FX.ring(A, { t: th2 + 0.35, at: [(c[0] + c2[0]) / 2, 0.03, (c[1] + c2[1]) / 2], r0: 0.2, r1: 1.3, dur: 0.5, col: C.sky, op: 0.5, w: 0.08 }); one(A, th2 + 0.4);
      A.cap(t1, t2, '添塘：水弹落地炸开：1.5 u 内 14；留下水塘 2 u，6 秒', 'Pond-maker: the bolt bursts where it lands: 14 within 1.5 u, and leaves a pond, 2 u, 6 s');
      A.cap(t2, T, '打在自己的水上也一样留一个：碰到的连成一片', 'On her water too: it lays another, and water that touches is one piece'); } };
}
// F3 Dunk 摔水: the whip grabs the first foe and dunks it into her nearest water: it lands flat, and the splash hits every foe in that water within 3 u: 12
{ const me = [-1.6, 0.4], d0 = [0.7, -0.6], to = [-0.2, 1.6]; const tw = 0.3 + 0.48, tl = tw + 0.62, T = 3.4;
  const ds = [[d0[0], d0[1], { flat: [[tl, 2.9]] }], around(to, 30, 0.85, ), around(to, 170, 0.9), around(to, 280, 0.75)]; [1, 2, 3].forEach((i) => ds[i].push({ soaked: 9 }));
  W.F3 = { T, cam: { x: -0.4, z: 0.6, w: 6.6 }, her: H(me[0], me[1], 70), dum: ds, seq: [[0.3, 'whip']],
    root: [{ t: 0.3, look: d0 }, { t: tw, look: d0 }, { t: tw + 0.45, look: to, e: 'io2' }],
    body: (t) => mixA(tailSlap(t, tl, 0.8), shake(t, 2.2, 0.6, 0.6)),
    fx(A) { pond(A, 0.05, T, to, 1.35); FX.pointer(A, { t0: 0, t1: 2.2, at: P(to) });
      FX.rope(A, { t0: tw - 0.05, t1: tw + 0.52, from: 'tip', to: (t) => A.dpt(0, t, 0.55), w: 0.09, head: 0.1, sag: 0.05 });
      A.hit(0, tw + 0.06, null); A.moveTo(0, tw + 0.1, to, 0.5, 'io2'); A.launch(0, tw + 0.1, 1.4); A.hit(0, tl, 12, { soak: true, big: true });
      FX.splash(A, { t: tl, at: P(to), r: 1.1, h: 0.9, n: 14 }); FX.ringwave(A, { t: tl, at: P(to), r0: 0.3, r1: 1.4, h: 0.5, dur: 0.4 }); A.shake(tl, 0.05, 0.18);
      [1, 2, 3].forEach((i) => { const d = ds[i], dx = d[0] - to[0], dz = d[1] - to[1], l = Math.hypot(dx, dz); A.hit(i, tl + 0.08, 12, { wet: true, knock: [dx / l * 0.25, dz / l * 0.25], kdur: 0.2 }); });
      A.cap(0.3, T, '摔水：把敌人摔进最近的水里；那片水里 3 u 内的敌人各 12', 'Dunk: the foe is dunked into her nearest water; 12 to every foe in that water within 3 u'); } };
}
// F5 Sweep-in 赶水: the fan washes the foes it hits up to 2.5 u toward her nearest water
{ const me = [-2.3, 0.1], ds = fan(3, 2.2, 45, -45, me[0], me[1]), pw = [1.1, 0.1], to = [[0.85, -0.5], [1.2, 0.15], [0.8, 0.7]]; const tf = 0.3 + 0.3, T = 3.2;
  W.F5 = { T, cam: { x: -0.5, z: 0.1, w: 6.4 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'nozzle']], body: (t) => mixA(tailSlap(t, tf + 0.05, 0.5), shake(t, 1.9, 0.6, 0.6)),
    fx(A) { pond(A, 0.05, T, pw, 1.1); FX.fan(A, { t: tf - 0.12, at: 'him', yaw: (t) => A.rootAt(tf).yaw / D2R, arc: 100, r: 3, dur: 0.3, rainbow: true });
      ds.forEach((d, i) => { const th = tf + 0.05 + i * 0.03; A.hit(i, th, 10, { soak: true }); A.moveTo(i, th + 0.05, to[i], 0.6, 'out'); A.turn(i, th + 0.05, i === 1 ? 20 : 70, 0.6);
        FX.strip(A, { t0: th, t1: th + 0.9, from: P(d), to: P(to[i]), w: 0.5, op: 0.3, flow: 1.2, grow: 0.5, fout: 0.4 }); FX.splash(A, { t: th + 0.62, at: P(to[i]), r: 0.3, h: 0.3, n: 5 }); A.soak(i, th + 1.2, 6, { quiet: true }); });
      A.cap(0.3, T, '赶水：扇形把打中的敌人冲向最近的水，最多 2.5 u', 'Sweep-in: the fan washes the foes it hits up to 2.5 u toward her nearest water'); } };
}
// F6 Paint 画水: the orb trails still water wherever it rolls, 1 u wide, 6 s; let go: it bursts at the stroke's end (no pool)
{ const me = [-2.6, 0.4], ds = [[0.1, 0.5], [0.95, -0.35], [1.9, 0.5], [-0.75, -0.6]]; const t0 = 0.6, t1 = 3.4, T = 5.6;
  // kit 2.2: the stroke closes a loop round the pack, and the floor inside fills
  const LC = [0.55, 0.0], LR = 1.45, pu = (u) => { const a = (200 - 360 * u) * D2R; return [LC[0] + Math.cos(a) * LR, 0.5, LC[1] - Math.sin(a) * LR]; }, p = (t) => pu(clamp((t - t0) / (t1 - t0 - 0.2)));
  W.F6 = { T, cam: { x: -0.2, z: 0.1, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom', { to: 0.62 }], [0.62, 'bloomHold', { loop: true, until: t1 - 0.1 }], [t1 - 0.1, 'castPoint', { from: 0.3 }]],
    root: [{ t: 0.5, look: [-0.8, 0.5] }, { t: 1.4, look: [0.6, 1.4], e: 's' }, { t: 2.3, look: [1.9, 0.0], e: 's' }, { t: t1 - 0.1, look: [-0.6, -0.8], e: 's' }], body: (t) => mixA(pawUp(t, 0.6, t1 - 0.1, 0.8), shake(t, 4.1, 0.6, 0.5)),
    fx(A) { const orbAt = (t) => t < t0 ? A.at('tip', t).toArray() : (() => { const q = p(t), s = A.at('tip', t0), u = clamp((t - t0) / 0.3); return [lerp(s.x, q[0], u), lerp(s.y, 0.34, u), lerp(s.z, q[2], u)]; })();
      FX.orb(A, { t0: 0.4, t1: t1 + 0.05, at: orbAt, r: 0.32 }); FX.rope(A, { t0: t0, t1: t1, from: 'tip', to: orbAt, w: 0.03, sag: 0.1 }); FX.pointer(A, { t0: 0.5, t1: t1, at: (t) => { const q = p(t); return [q[0], 0, q[2]]; } });
      // the stroke: a strip of still water laid behind the orb, piece by piece
      road(A, (t) => { const q = p(t); return [q[0], 0, q[2]]; }, t0 + 0.3, t1, 1.0);
      for (let t = t0 + 0.4; t < t1; t += 0.3) { const q = p(t); ds.forEach((d, i) => { if (Math.hypot(q[0] - d[0], q[2] - d[1]) < 0.7) A.hit(i, t, 4, { noStop: true, soak: true }); }); }
      // the loop closes: the floor inside fills from the edge inward, one part with the stroke
      const tfill = t1 - 0.25; pond(A, tfill, T, LC, (t) => LR * EASE.out(clamp((t - tfill) / 0.3)), { grow: false, op: 0.36 }); FX.ring(A, { t: tfill, at: [LC[0], 0.03, LC[1]], r0: LR, r1: 0.2, dur: 0.3, col: C.foam, op: 0.6, w: 0.1 });
      A.say(tfill + 0.1, { zh: '圈里灌满', en: 'The loop fills' }, { col: C.sky }); [0, 1].forEach((i) => A.soak(i, tfill + 0.3 + i * 0.1, 6, { quiet: i > 0 }));
      const q = p(t1); FX.splash(A, { t: t1 + 0.05, at: [q[0], 0, q[2]], r: 0.8, h: 0.9, crash: true }); A.hit(3, t1 + 0.07, 22, { crash: true }); A.shake(t1 + 0.05, 0.05, 0.2); A.soak(3, t1 + 1.0, 6, { quiet: true });
      A.cap(0.3, 2.4, '画水：水珠滚到哪里，哪里就留下静水（宽 1 u，6 秒）', 'Paint: the orb trails still water wherever it rolls (1 u wide, 6 s)');
      A.cap(2.4, t1, '笔画围成一圈：圈里的地面灌满（最宽 5 u）', 'A stroke that closes a loop fills the floor inside (up to 5 u across)'); A.cap(t1, T, '松开：在笔画尽头爆开，拍 14；水留着', "Let go: it bursts at the stroke's end, Crash 14; the water stays"); } };
}
// F8 Open the gate 开闸 (big): no beam: for 2 s water pours out at the staff and spreads in front of her: a sea 8 u long and 5 u wide, 8 s. Crash: its front: 24
{ const me = [-4.0, 0.2], ds = [[-1.9, -1.3], [-0.6, 1.3], [0.7, -0.3, { soaked: true }], [2.2, 1.7], [3.2, -1.2]]; const t0 = 0.3, b0 = 0.75, b1 = 2.75, T = 6.0, x0 = me[0] + 0.65;
  W.F8 = { T, cam: { x: 0.2, z: 0.2, w: 10.4 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'castPlant', { to: 0.45 }], [0.75, 'plantLean', { loop: true, until: b1 }]],
    body: (t) => mixA(tailSlap(t, b0, 0.7), shake(t, b1 + 0.4, 0.8, 1)),
    fx(A) { const src = (t) => A.ahead(b0, 0.65, 0.2);
      FX.strip(A, { t0: b0, t1: T, from: [x0, 0, me[1]], to: [x0 + 8, 0, me[1]], w: 5, grow: b1 - b0, op: 0.34, flow: 0.06 });
      FX.wave(A, { t: b0, from: [x0, 0, me[1]], dir: 90, dist: 8, dur: b1 - b0, w: 5, h: 0.2, len: 1.5, wet: false, out: 0.35 });
      FX.splash(A, { t: b0, at: (t) => A.ahead(b0, 0.65, 0), r: 0.6, h: 0.6 }); for (let t = b0; t < b1; t += 0.12) FX.mist(A, { t, at: src, n: 2, r: 0.3, h: 0.2, size: 0.2, dur: 0.4, seed: Math.floor(t * 100) });
      for (let t = b0; t < b1; t += 0.25) FX.splash(A, { t, at: (tt) => A.ahead(b0, 0.7, 0), r: 0.45, h: 0.4, n: 5 });
      ds.forEach((d, i) => { const th = b0 + (d[0] - x0) / 8 * (b1 - b0); A.hit(i, th, d[2] ? 38 : 24, { crash: !!d[2] }); A.launch(i, th, 0.12); A.soak(i, th + 0.5, 8, { quiet: i % 2 === 1 }); });
      A.dark(b0, b1, 0.14); A.shake(b0, 0.04, 0.3);
      A.cap(t0, b1, '开闸：水从杖脚涌出铺开，长 8 u、宽 5 u。拍：浪头 24', 'Open the gate: water pours out at the staff: a sea 8 u long, 5 u wide. Crash: its front: 24');
      // kit 2.2: the gate shuts at 2 s and the sea slaps back once from its far end to her: 16 to every foe standing in it
      const tsl = b1 + 0.15; FX.wave(A, { t: tsl, from: [x0 + 8, 0, me[1]], dir: 270, dist: 8, dur: 0.45, w: 5, h: 0.14, len: 0.9, wet: false, out: 0.2 });
      ds.forEach((d, i) => { const th = tsl + (x0 + 8 - d[0]) / 8 * 0.45; A.hit(i, th, 16, { noStop: false }); FX.splash(A, { t: th, at: P(d), r: 0.3, h: 0.3, n: 5 }); });
      A.cap(b1, b1 + 1.3, '关闸：整片海回拍一次：站在里面的敌人各 16', 'The gate shuts: the sea slaps back once: 16 to every foe standing in it');
      A.cap(b1 + 1.3, T, '这片海留 8 秒：站在里面的敌人一直浸湿', 'The sea stays 8 s: foes standing in it stay soaked'); } };
}

// ================================================================ Wave 浪
// F13 Plunge pool 瀑潭: the fall fills a pool that spreads 0.9 u a second, to 5 u; the drop hits the whole pool: 16; the pool stays 6 s
{ const me = [-2.6, 0.2], c = [0.3, 0.2], ds = [[0.1, -0.2, { soaked: true }], [0.65, 0.55], around(c, 20, 1.5), around(c, 215, 1.75), around(c, 120, 2.9)]; const tr = 0.3 + 0.5, tf = 3.4, T = 5.4;
  const R = (t) => Math.min(2.5, 0.7 + 0.5 * Math.max(0, Math.min(t, tf + 0.3) - tr));
  W.F13 = { T, cam: { x: 0.0, z: 0.1, w: 7.2 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPoint'], [tf - 0.2, 'castPoint', { from: 0.2 }]],
    body: (t) => mixA(lookUp(t, 0.4, 1.2, 20), tailSlap(t, tf + 0.05, 0.7), shake(t, tf + 0.9, 0.5, 0.5)),
    fx(A) { FX.waterfall(A, { t0: tr - 0.4, t1: tf + 0.35, cut: tf, at: P(c), round: true, w: 1.8, top: 2.8, op: 0.8, rise: 0.4 });
      pond(A, tr + 0.05, T, c, R, { grow: false, op: 0.4 });
      [0, 1].forEach((i) => A.hit(i, tr + 0.05, null, { soak: true, slow: tf - tr }));
      [2, 3].forEach((i) => { const d = Math.hypot(ds[i][0] - c[0], ds[i][1] - c[1]); A.soak(i, tr + (d - 0.7) / 0.5 + 0.1, 8); });
      // the drop: the sky lets go, and the blow runs out through the whole pool as a ring
      FX.splash(A, { t: tf + 0.3, at: P(c), r: 1.2, h: 0.9, crash: true }); FX.ringwave(A, { t: tf + 0.3, at: P(c), r0: 0.5, r1: R(tf + 0.3), h: 0.45, dur: 0.3 });
      [0, 1, 2, 3].forEach((i) => A.hit(i, tf + 0.32 + 0.04 * i, 26, { crash: true })); [0, 1, 2, 3].forEach((i) => A.soak(i, tf + 1.3, 6, { quiet: true })); A.shake(tf + 0.3, 0.07, 0.22);
      A.cap(0.3, tf - 0.2, '瀑潭：瀑布下的水潭越铺越宽，4 秒到 5 u', 'Plunge pool: under the fall a pool spreads, to 5 u wide at 4 s');
      A.cap(tf - 0.2, T, '再按：瀑布砸下，整个水潭里的敌人各 16（浸湿的 26）；水潭留 6 秒', 'Press again: the fall drops: 16 to every foe in the pool (26 if soaked); the pool stays 6 s'); } };
}

// ================================================================ Spring 泉
// F19 Hanging rain 悬雨 (Kesh's design; kit 2.0: Flood's Rain Squall, his pick 2a): the base rain; each second three drops stop in mid-air and a second later fire at the foe her stream is on; the rain's floor stays as a pool
{ const me = [-2.5, -0.4], ds = [[1.8, -1.0], [-0.5, 0.9], [0.5, 1.3]]; const RC = [0.0, 1.05], RR = 1.3; const s0 = 0.3, tc = 0.8, tr = tc + 0.25, te = tr + 6, sOff = tr + 3.9, T = te + 2.4; const HR = 2.2;
  const vol = [0, 1, 2, 3, 4, 5].map((k) => { const h = tr + 0.4 + k * 0.92; return { h, f: h + 1 }; });
  W.F19 = { noWarp: true, T, cam: { x: -0.2, z: 0.2, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[s0, 'stream', { loop: true, until: sOff, fade: 0.15 }]], root: [{ t: 0.2, look: ds[0] }, { t: sOff + 0.2, look: ds[0] }, { t: sOff + 0.7, look: ds[2] }],
    body: (t) => mixA(lookUp(t, tc - 0.2, tc + 0.35, 18), crouch(t, tc - 0.15, tc + 0.1, 0.3), shiver(t, s0, sOff, 0.4)),
    fx(A) { const T3 = A.THREE; A.moveTo(1, 0.6, [-0.2, 1.0], 6.0, 'lin'); A.moveTo(2, 0.6, [0.4, 1.2], 6.0, 'lin'); A.moveTo(0, 0.8, [1.6, -0.7], 3.0, 's');
      streamOn(A, s0 + 0.1, sOff, 0, { n: 3 });
      FX.drops(A, { t: tc, at: 'tip', n: 7, sp: 0.25, up: 1.6, size: 0.05 });
      // the rain as the base, all 6 s
      FX.rain(A, { t0: tr, t1: te, at: [RC[0], 0, RC[1]], r: RR, h: HR, n: 40 });
      [1, 2].forEach((i) => { A.soak(i, tr + 0.35 + 0.1 * i, 8); A.status(i, tr + 0.4 + 0.1 * i, 'slow', te - tr - 0.4); ticks(A, i, tr + 0.6 + 0.1 * i, te, 3, 1); });
      A.tag(2, tr, T, ['残血', 'Low'], C.parch);
      // the volleys: three drops stop high in the rain, hang 1 s, then fly at the stream's foe (stream off: the lowest-health foe)
      let R = 11; const rnd = () => (R = (R * 16807) % 2147483647) / 2147483647; const gm = new T3.SphereGeometry(1, 10, 8);
      vol.forEach((v, k) => { const ti = v.f >= sOff ? 2 : 0; const tgt = (t) => A.dpt(ti, t, 0.75);
        for (let j = 0; j < 3; j++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * RR * 0.8; const p = new T3.Vector3(RC[0] + Math.cos(a) * r, 1.45 + 0.4 * rnd(), RC[1] + Math.sin(a) * r * 0.85); const lag = j * 0.07, side = (j - 1) * 0.6, ph = rnd() * 6.28;
          const t0 = v.h - 0.2, tf = v.f + lag, ta = tf + 0.3;
          const m = A.add(new T3.Mesh(gm, new T3.MeshLambertMaterial({ color: C.sky, emissive: '#F4FAFF', transparent: true, opacity: 0.95 }))); m.visible = false;
          const P1 = p.clone().add(new T3.Vector3(0, 0.25, 0));
          const pos = (t) => { if (t < v.h) { const u = (t - t0) / 0.2; return p.clone().setY(p.y + 0.6 * (1 - u)); } if (t < tf) { const u = EASE.s(clamp((t - (v.f - 0.25)) / 0.25 + 0)); return p.clone().setY(p.y + 0.012 * Math.sin(t * 4 + ph)).lerp(P1, u); }
            const u = clamp((t - tf) / 0.3), e = u * u; const P3 = tgt(ta); const Cc = P1.clone().lerp(P3, 0.5).add(new T3.Vector3(0, 0.7, side)); return P1.clone().multiplyScalar((1 - e) * (1 - e)).add(Cc.multiplyScalar(2 * e * (1 - e))).add(P3.clone().multiplyScalar(e * e)); };
          A.fx((t) => { const on = t >= t0 && t <= tf + 0.03; m.visible = on; if (!on) return; const q = pos(t); m.position.copy(q);
            if (t < v.h) { m.scale.set(0.03, 0.15, 0.03); m.quaternion.identity(); m.material.emissiveIntensity = 0.3; return; }
            const glint = 0.5 + 0.5 * Math.max(0, Math.sin(t * 6 + ph)) ** 4; const s = clamp((t - (v.f - 0.25)) / 0.25);
            const ahead = t < tf ? tgt(ta) : pos(Math.min(t + 0.02, ta)); const dir = ahead.clone().sub(q); if (dir.lengthSq() > 1e-6) m.quaternion.setFromUnitVectors(new T3.Vector3(0, 0, 1), dir.normalize());
            m.scale.set(0.075 - 0.035 * s, 0.075 - 0.035 * s, 0.075 + 0.17 * s); m.material.emissiveIntensity = 0.5 + 0.6 * Math.max(glint, s); });
          // the needle flies as a small thin stream (Kesh, 20 Nov), the jet's look at needle size
          FX.jet(A, { t: tf, hold: 0.02, from: [P1.x, P1.y, P1.z], to: (t) => tgt(ta), w: 0.035, dur: 0.3, tail: 0.12, wob: 0.0 });
          FX.ring(A, { t: v.h, at: [p.x, p.y, p.z], r0: 0.03, r1: 0.16, dur: 0.3, col: '#F4FAFF', op: 0.6, w: 0.3 });
          FX.trail(A, { of: (t) => pos(Math.min(Math.max(t, tf), ta)), t0: tf, t1: ta, len: 0.12, w: 0.05, col: '#F4FAFF', op: 0.7 });
          FX.spark(A, { t: ta, at: { d: ti, y: 0.75 }, r: 0.25, col: '#F4FAFF', op: 0.6 }); A.hit(ti, ta, 2, { noStop: true, col: '#F4FAFF' }); }
        A.soak(ti, v.f + 0.44, 8, { quiet: k > 0 && k !== 4 }); });
      A.say(vol[0].h + 0.05, { zh: '三滴悬停', en: 'Three drops hang' }, { col: C.foam });
      A.cap(tc, sOff, '雨 6 秒，如基础形态；每秒三滴停在空中，1 秒后射向水流下的敌人：每滴 2', 'Rain 6 s, as the base; every second three drops hang, 1 s later they hit the foe her stream is on: 2 each');
      A.cap(sOff, te, '不喷水时：射向 8 u 内血最少的敌人；共 36', 'Stream off: they hit the foe with the least health within 8 u; 36 in all');
      // kit 2.0 (his pick 2a): the rain's floor is her water, and stays as a pool 6 s after the rain
      pond(A, tr + 0.6, T, RC, RR, { op: 0.34, fin: 1.2 }); [1, 2].forEach((i) => A.soak(i, te + 0.6, 6, { quiet: true }));
      A.cap(te, T, '雨停后，雨下过的地面留成水塘，6 秒', 'After the rain, the floor it fell on stays as a pool, 6 s'); } };
}

// F21 Sink 陷水: on her water: the foe and the small foes within 1.5 u of it sink to the neck: held 1.5 s; then they are thrown out: 12 each
{ const me = [-2.4, 0.2], c = [0.4, 0.2]; const tc = 0.3 + 0.5, ts = tc + 0.4, tp = ts + 1.5, T = 4.4;
  const ds = [[0.3, 0.2, { soaked: 9, sunk: [[ts, tp]], flat: [[tp + 0.35, T]] }], [1.2, -0.4, { soaked: 9, sunk: [[ts, tp]], flat: [[tp + 0.4, T]] }], [-0.3, 0.95, { soaked: 9, sunk: [[ts, tp]], flat: [[tp + 0.45, T]] }], [2.7, 1.0]];
  W.F21 = { T, cam: { x: -0.3, z: 0.2, w: 6.4 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom']], root: [{ t: 0.2, look: [0.3, 0.2] }], body: (t) => mixA(pawUp(t, 0.4, 1.0, 0.6), crouch(t, tc - 0.1, tc + 0.3, 0.4), shake(t, tp + 0.8, 0.5, 0.5)),
    fx(A) { pond(A, 0.05, T, c, 1.7);
      [0, 1, 2].forEach((i) => { const d = ds[i], at = P(d);
        // the tell: a dark round patch with a slow whirl opens under each foe and shivers; then they drop to the neck
        FX.pool(A, { t0: tc + 0.02, t1: tp + 0.25, at, r: (t) => 0.5 + 0.02 * Math.sin(t * 40), whirl: 0.7, op: 0.55, grow: false, fin: 0.2 });
        FX.ring(A, { t: ts, at: [d[0], 0.03, d[1]], r0: 0.15, r1: 0.6, dur: 0.4, col: C.foam, op: 0.7, w: 0.15 });
        for (let t = ts + 0.2; t < tp - 0.1; t += 0.35) FX.ring(A, { t, at: [d[0], 0.03, d[1]], r0: 0.2, r1: 0.42, dur: 0.5, col: C.foam, op: 0.45, w: 0.12 });
        A.tag(i, ts + 0.1, tp, ['陷住', 'Sunk'], C.foam);
        FX.column(A, { t: tp, at, h: 1.0, r: 0.3, dur: 0.45, fall: true }); A.launch(i, tp, 0.7); A.hit(i, tp + 0.03 + 0.03 * i, 19, { crash: true }); A.soak(i, tp + 0.9, 6, { quiet: i > 0 }); });
      A.shake(tp, 0.05, 0.18);
      A.cap(0.3, tp, '陷水：在她的水里，目标和 1.5 u 内的小敌人陷到脖子：1.5 秒不能动', 'Sink: on her water, the foe and the small foes within 1.5 u sink to the neck: held 1.5 s');
      A.cap(tp, T, '然后被水抛出：各 12（浸湿的 19）', 'Then the water throws them out: 12 each (19 if soaked)'); } };
}

// ================================================================ kit 2.2: the other Flood cards
// F2 Canal 开渠: the jet's line stays 6 s as a canal with a fast current: a small foe that steps in is swept to its far end and Slams there
{ const me = [-3.3, 0.1], ds = [[-1.6, 0.05, { soaked: true }], [-0.3, 0.2], [1.0, -0.05]]; const tr = 0.35 + 0.44, T = 5.2, x0 = me[0] + 0.5, x1 = x0 + 5.5, wx = x1 + 0.25;
  const end = [[x1 - 1.25, 0.25], [x1 - 0.75, -0.3], [x1 - 0.25, 0.1]];
  W.F2 = { T, cam: { x: -0.4, z: 0.0, w: 7.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.35, 'castPoint']], root: [{ t: tr - 0.02 }, { t: tr + 0.1, fw: -0.18, e: 'out' }, { t: tr + 0.6, fw: -0.12 }],
    body: (t) => mixA(crouch(t, tr - 0.1, tr + 0.5, 1), tailSlap(t, tr, 0.7), shake(t, tr + 1.4, 0.6, 0.7)),
    fx(A) { block(A, [wx + 0.2, 0.1], [0.4, 1.2, 2.2]);
      FX.jet(A, { t: tr, to: (t) => A.ahead(tr, 5.5, 0.55), dur: 0.12, hold: 0.28, w: 0.32, tail: 0.18 }); FX.ring(A, { t: tr, at: 'tip', r0: 0.08, r1: 0.5, dur: 0.25, dir: (t) => A.fwd(tr), col: C.foam, op: 0.9, w: 0.25 });
      A.hit(0, tr + 0.04, 29, { crash: true }); A.hit(1, tr + 0.07, 18); A.hit(2, tr + 0.1, 18); A.shake(tr, 0.04, 0.16);
      // the jet lies down into a canal, 1.5 u wide; its current runs 3 u a second away from her
      canal(A, tr + 0.25, T, [x0, me[1]], [x1, me[1]], 1.5, { grow: 0.3, flow: 1.6, op: 0.42 });
      [2, 1, 0].forEach((i, k) => { const ts = tr + 0.5, dur = (end[i][0] - ds[i][0]) / 3; A.moveTo(i, ts, end[i], dur, 'lin'); A.soak(i, ts + 0.3, 6, { quiet: i < 2 });
        const tl = ts + dur; if (i === 2) { slamFx(A, tl, [wx, 0, end[i][1]]); A.hit(i, tl, 10, { stun: 0.5, big: true }); } else A.hit(i, tl + 0.02, 6, { noStop: true }); if (i === 1) A.hit(2, tl + 0.04, 6, { noStop: true }); if (i === 0) A.hit(1, tl + 0.06, 6, { noStop: true }); });
      for (let t = tr + 0.6; t < T - 0.8; t += 0.3) FX.splash(A, { t, at: [x1 - 0.1, 0, me[1] + 0.3 * Math.sin(t * 9)], r: 0.3, h: 0.25, n: 4 });
      A.cap(0.35, 2.0, '开渠：水柱如基础（拍 18）；它的线留成一条水渠，1.5 u 宽，6 秒', 'Canal: the jet as the base (Crash 18); its line stays as a canal, 1.5 u wide, 6 s');
      A.cap(2.0, T, '渠水很急：踩进去的小敌人被冲到尽头，拍岸', 'A fast current: a small foe that steps in is swept to its far end and Slams there'); } };
}
// F4 Pond-hopper 逐水: in her water the stone hunts: it skips from foe to foe standing in her water, up to 8 skips: 10 each, the last 16
{ const me = [-3.0, 0.2], c = [0.5, 0.1], ds = [[-0.5, 0.5], [0.4, -0.9], [1.5, -0.2], [0.9, 1.0]].map((d) => [d[0], d[1], { soaked: 9 }]); const order = [0, 1, 2, 3, 0, 1, 2, 3];
  const t0 = 0.3 + 0.32, per = 0.2, T = 3.8, pts = [[-1.5, 0.3], ...order.map((i) => [ds[i][0], ds[i][1]])];
  W.F4 = { T, cam: { x: -0.4, z: 0.1, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'flick']], root: [{ t: 0.2, look: [-0.5, 0.4] }],
    body: (t) => mixA(turnTrunk(t, t0 + 0.4, t0 + 1.0, 12), turnTrunk(t, t0 + 1.0, t0 + 1.8, -12), shake(t, 2.9, 0.6, 0.5)),
    fx(A) { pond(A, 0.05, T, c, 1.9); FX.stone(A, { t: t0, pts, per, hop: 0.28, grow: true });
      FX.ring(A, { t: t0 + per, at: [pts[0][0], 0.03, pts[0][1]], r0: 0.1, r1: 0.5, dur: 0.4, col: C.foam, op: 0.6, w: 0.12 });
      order.forEach((i, k) => { const th = t0 + per * (k + 2), last = k === order.length - 1; A.hit(i, th, last ? 16 : 10, { noStop: !last, big: last }); FX.splash(A, { t: th, at: [ds[i][0], 0.9, ds[i][1]], r: last ? 0.5 : 0.25, h: last ? 0.5 : 0.25, n: last ? 9 : 4 }); FX.ring(A, { t: th, at: [ds[i][0], 0.03, ds[i][1]], r0: 0.15, r1: last ? 0.9 : 0.55, dur: 0.4, col: C.foam, op: 0.55, w: 0.1 }); });
      A.cap(0.3, T, '逐水：在她的水里，石片在站在水里的敌人之间跳，最多 8 跳：各 10，最后 16', 'Pond-hopper: in her water the stone skips from foe to foe standing in it, up to 8 skips: 10 each, the last 16'); } };
}
// F7 Sleeper 伏雷: lobbed into her water it sinks and swims under it to the foe nearest the pointer in that water, and goes up there: 18 to 36 within 2.5 u
{ const me = [-3.6, 0.3], in0 = [-1.6, 0.2], c = [2.0, 0.0], ds = [[1.9, 0.1], around(c, 60, 1.1), around(c, 300, 1.2), around(c, 180, 1.5), [-0.2, 1.6]].map((d, i) => i < 4 ? [d[0], d[1], { soaked: 9 }] : d);
  const th = 1.2, tl = th + 0.68, td = tl + 0.6, sw = 3.5 / 6, tu = td + sw + 0.25, T = tu + 2.0;
  W.F7 = { T, cam: { x: -0.4, z: 0.1, w: 8.4 }, her: H(me[0], me[1]), dum: ds, seq: [[0.25, 'castBloom', { to: 0.62 }], [0.62, 'bloomHold', { loop: true, until: th }], [th, 'tsunami', { from: 0.2 }], [td + 0.1, 'castPoint', { from: 0.25 }]],
    body: (t) => mixA(tailSlap(t, tl, 0.9), shake(t, tu + 0.9, 0.6, 0.6)),
    fx(A) { canal(A, 0.05, T, [-2.4, 0.2], [1.0, 0.1], 1.6, { flow: 0.03 }); pond(A, 0.05, T, c, 1.8);
      FX.orb(A, { t0: 0.4, t1: tl - 0.2, at: 'tip', r: (t) => 0.06 + 0.32 * clamp((t - 0.4) / 0.9), pop: false });
      FX.bolt(A, { t: tl - 0.2, from: 'tip', to: [in0[0], 0.1, in0[1]], dur: 0.8, arc: 1.8, r: 0.38, e: 'lin', splash: false });
      FX.ring(A, { t: td, at: [in0[0], 0.03, in0[1]], r0: 0.2, r1: 0.9, dur: 0.5, col: C.foam, op: 0.7, w: 0.14 });
      // the shadow swims under the water, a V of ripples over it, 6 u a second
      const sp = (t) => { const u = clamp((t - td) / sw); return [lerp(in0[0], ds[0][0] - 0.1, u), 0, lerp(in0[1], ds[0][1], u)]; };
      FX.pool(A, { t0: td + 0.05, t1: tu, at: sp, follow: true, r: 0.36, col: C.ink, op: 0.5, grow: false, fin: 0.15, fout: 0.05, y: 0.012 });
      for (let k = 0; k < 8; k++) { const tk = td + 0.05 + k * sw / 8; FX.ring(A, { t: tk, at: (() => { const q = sp(tk); return [q[0], 0.03, q[2]]; })(), r0: 0.15, r1: 0.55, dur: 0.5, col: C.foam, op: 0.5, w: 0.14 }); }
      FX.ring(A, { t: tu - 0.25, at: [ds[0][0] - 0.1, 0.04, ds[0][1]], r0: 0.5, r1: 0.3, dur: 0.25, col: C.foam, op: 0.8, w: 0.2 });
      FX.column(A, { t: tu, at: [ds[0][0] - 0.1, 0, ds[0][1]], h: 2.0, r: 0.5, dur: 0.6, fall: true }); FX.ringwave(A, { t: tu, at: [ds[0][0] - 0.1, 0, ds[0][1]], r0: 0.3, r1: 2.5, h: 0.4, dur: 0.3 });
      [0, 1, 2, 3].forEach((i) => { A.hit(i, tu + 0.02 + 0.02 * i, 58, { crash: true, up: i === 0 ? 0.8 : 0.3 }); A.soak(i, tu + 1.0, 6, { quiet: i > 0 }); }); A.shake(tu, 0.07, 0.25);
      A.cap(0.25, td, '伏雷：蓄力后抛进她的水里：沉下去，不炸', 'Sleeper: charged and lobbed into her water: it sinks, no burst');
      A.cap(td, T, '在水下游向这片水里离指针最近的敌人，从脚下炸开：2.5 u 内 18 到 36', 'It swims under the water to the foe nearest the pointer and goes up under it: 18 to 36 within 2.5 u'); } };
}
// F9 Spreading ring 涨环: cast standing in her water, the ring carries the small foes in that water out to its edge and drops them 1 u beyond: 22
{ const me = [-0.4, 0.1], R = 2.0, ang = [15, 95, 170, 250, 320], rr = [1.0, 1.4, 0.9, 1.5, 1.2], ds = ang.map((a, i) => { const p = around(me, a, rr[i]); return [p[0], p[1], { soaked: 9 }]; }); const tp = 0.3 + 0.4, T = 3.4;
  W.F9 = { T, cam: { x: -0.2, z: 0.1, w: 10.4 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant']], root: [{ t: 0.4 }, { t: tp, y: 0, jump: 0.25 }], body: (t) => mixA(tailSlap(t, tp, 0.8), shake(t, 1.9, 0.6, 0.6)),
    fx(A) { pond(A, 0.05, T, me, R); block(A, [me[0] + 3.35, me[1] - 0.8], [0.4, 1.2, 2.0]);
      FX.ringwave(A, { t: tp, at: P(me), r0: 0.3, r1: R + 1, h: 0.42, dur: 0.5 }); FX.ring(A, { t: tp + 0.4, at: [me[0], 0.03, me[1]], r0: R, r1: R + 1, dur: 0.3, col: C.foam, op: 0.6, w: 0.1 });
      ds.forEach((d, i) => { const to = around(me, ang[i], R + 1), th = tp + 0.5 * rr[i] / (R + 1), dur = 0.5 - (th - tp); A.hit(i, th, 35, { crash: true, noStop: true }); A.moveTo(i, th, i === 0 ? around(me, ang[i], R + 0.75) : to, dur, 'out'); A.launch(i, th, 0.2);
        if (i === 0) { slamFx(A, tp + 0.5, [me[0] + 3.15, 0, to[1]]); A.hit(0, tp + 0.52, 10, { stun: 0.5, big: true }); } });
      A.shake(tp, 0.05, 0.2);
      A.cap(0.3, T, '涨环：站在自己的水里放：环浪把这片水里的小敌人带到水边、再甩出 1 u：22', 'Spreading ring: cast in her water, the ring carries its small foes out to the edge and 1 u beyond: 22'); } };
}
// F10 Roll-up 滚潮: over her water the wave does not stop: it rolls on as far as the water goes, up to 10 u, and grows: 4 more for each 2 u of water crossed, to 32
{ const me = [-5.2, 0.2], x0 = me[0] + 0.35, w0 = x0 + 1.4, ds = [[-2.6, -0.3], [-0.8, 0.5], [1.2, -0.2], [3.2, 0.6]].map((d) => [d[0], d[1], { soaked: 9 }]); const tw = 0.3 + 0.46, dur = 1.45, T = 4.2;
  W.F10 = { T, cam: { x: -0.2, z: 0.1, w: 11.2 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castSweep']], body: (t) => mixA(tailSlap(t, tw, 0.6), shake(t, 2.8, 0.6, 0.6)),
    fx(A) { canal(A, 0.05, T, [w0, me[1]], [x0 + 10, me[1]], 2.2, { flow: 0.03 });
      FX.wave(A, { t: tw - 0.04, from: [x0, 0, me[1]], dir: 90, dist: 10, dur, w: 2.6, h: 0.5, len: 1.4, wFn: (u) => 1.8 + 2.2 * Math.min(1, u * 1.6), hFn: (u) => 0.8 + 0.3 * u, wet: false, out: 0.3 });
      ds.forEach((d, i) => { const th = tw + (d[0] - x0) / 10 * dur, n = [20, 24, 28, 32][i]; A.hit(i, th, Math.round(n * 1.6), { crash: true, knock: [1.2 * 1.5, 0], kdur: 0.4, big: i === 3 }); A.soak(i, th + 1.0, 6, { quiet: true }); });
      FX.splash(A, { t: tw + dur, at: [x0 + 10, 0, me[1]], r: 1.4, h: 0.6, n: 16 }); A.shake(tw + dur, 0.05, 0.2);
      A.cap(0.3, T, '滚潮：浪在她的水上不停，水有多长滚多长（最多 10 u）；每滚过 2 u 水 +4：20 到 32（浸湿的 32 到 51）', 'Roll-up: over her water the wave rolls on as far as the water goes (up to 10 u): 4 more for each 2 u: 20 to 32 (32 to 51 if soaked)'); } };
}
// F11 Tide on tide 连潮: cooldown 6 s. Every piece spills over 1 u past its edge and that rim stays; cast again within 9 s: 22
{ const me = [-3.6, 0.3], pa = [-0.9, -0.5], pb = [1.9, 0.7], ra = 0.9, rb = 0.75;
  const ds = [[-0.9, -0.3, { soaked: 9 }], [1.8, 0.6, { soaked: 9 }], around(pa, 70, 1.5), around(pb, 250, 1.4), [0.9, -2.0]]; const tc = 0.8, tw = tc + 0.5, tc2 = 3.3, tw2 = tc2 + 0.5, T = 6.2;
  const grow = (t, r) => r + EASE.out(clamp((t - tw) / 0.3)) + EASE.out(clamp((t - tw2) / 0.3));
  W.F11 = { T, cam: { x: -0.3, z: 0.1, w: 9.6 }, her: H(me[0], me[1]), dum: ds, seq: [[tc, 'castBloom', { speed: 0.9 }], [tc2, 'castBloom', { speed: 0.9 }]], root: [{ t: 0.2, look: [0.5, 0.2] }],
    body: (t) => mixA(pawUp(t, tc, tw + 0.1, 1.0), pawUp(t, tc2, tw2 + 0.1, 1.0), lookUp(t, tc + 0.1, tw, 12), lookUp(t, tc2 + 0.1, tw2, 16), tailSlap(t, tw, 0.6), tailSlap(t, tw2, 0.7), shake(t, tw2 + 0.9, 0.5, 0.5)),
    fx(A) { pond(A, 0.05, T, pa, (t) => grow(t, ra), { grow: false }); pond(A, 0.05, T, pb, (t) => grow(t, rb), { grow: false });
      [[tw, 16, [0, 1, 2, 3], 0.9], [tw2, 22, [0, 1, 2, 3, 4], 1.25]].forEach(([t, n, who, hh], k) => { [[pa, ra], [pb, rb]].forEach(([p, r]) => { FX.splash(A, { t, at: P(p), r: (r + k) * 0.9, h: hh, crash: true });
          FX.ring(A, { t, at: [p[0], 0.03, p[1]], r0: r + k, r1: r + k + 1, dur: 0.3, col: C.foam, op: 0.75, w: 0.1 }); });
        who.forEach((i, j) => { const wet = i < 2 || k === 1 && i < 4; A.hit(i, t + 0.06 + j * 0.03, wet ? Math.round(n * 1.6) : n, { crash: wet }); A.soak(i, t + 1.0, 6, { quiet: j > 0 }); }); A.shake(t, 0.05, 0.18); });
      one(A, tw + 0.5); A.say(tc2 - 0.3, { zh: '6 秒后', en: '6 s later' }, { col: C.parch });
      A.cap(0.05, tc2 - 0.3, '连潮：冷却 6 秒。每片水涨出边外 1 u，那里的敌人也挨打（16）；涨出的水留 9 秒', 'Tide on tide: cooldown 6 s. Every piece spills 1 u past its edge and hits the foes there (16); the rim stays 9 s');
      A.cap(tc2 - 0.3, T, '9 秒内再唤：22，水边再往外 1 u', 'Cast again within 9 s: 22, and the edge creeps out 1 u more'); } };
}
// F12 Stir 搅水: while the pool touches her water, its 4 a second and its slow run through that whole piece
{ const me = [-3.4, 0.4], c = [-0.9, 0.0], pc = [2.6, 0.3], ds = [around(c, 40, 1.2), around(c, 220, 1.1), [0.9, 0.1, { soaked: 9 }], [2.3, -0.4, { soaked: 9 }], [3.1, 0.8, { soaked: 9 }]]; const tp = 0.3 + 0.4, T = 5.2;
  W.F12 = { T, cam: { x: -0.2, z: 0.1, w: 8.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant'], [tp + 0.1, 'plantLean', { loop: true, until: tp + 0.7 }]], root: [{ t: 0.3, look: c }, { t: tp + 0.1 }, { t: tp + 0.7, spin: 0 }],
    body: (t) => mixA(tailSlap(t, tp, 0.5), turnTrunk(t, tp + 0.1, tp + 0.7, 25), shake(t, 4.2, 0.6, 0.5)),
    fx(A) { canal(A, 0.05, T, [0.2, 0.05], [1.9, 0.2], 1.3, { flow: 0.03 }); pond(A, 0.05, T, pc, 1.3, { whirl: 0.0 });
      // the stir spreads: every water joined to the pool begins to turn slowly the same way
      FX.pool(A, { t0: tp + 0.5, t1: tp + 5, at: P(pc), r: 1.3, whirl: 0.35, op: 0.3, fin: 0.5, grow: false }); FX.strip(A, { t0: tp + 0.5, t1: tp + 5, from: [1.9, 0, 0.2], to: [0.2, 0, 0.05], w: 1.3, op: 0.22, flow: 0.5, fin: 0.5 });
      FX.pool(A, { t0: tp, t1: tp + 5, at: P(c), r: 1.6, whirl: 1, op: 0.6 });
      [0, 1].forEach((i) => { A.moveTo(i, tp + 0.2, around(c, [40, 220][i] + 60, 0.35), 1.6, 'out'); A.turn(i, tp + 0.2, 200, 1.6); });
      ds.forEach((d, i) => { A.status(i, tp + 0.5 + (i > 1 ? 0.3 : 0), 'slow', 3.6); for (let k = 0; k < 4; k++) A.hit(i, tp + 0.7 + k + (i > 1 ? 0.15 : 0), 4, { noStop: true, soak: k === 0 && i < 2 }); });
      one(A, tp + 0.6);
      A.cap(0.3, T, '搅水：漩涡碰着她的水时，每秒 4 和减速传遍整片水；拖拽只在漩涡圈里', "Stir: while the pool touches her water, its 4 a second and its slow run through the whole piece; the drag stays in its circle"); } };
}
// F14 Bow wave 破浪: she rides 2.5 s; the wave lays a road of water 2 u wide behind her, 6 s, and draws the foes she passes onto it
{ const me = [-4.6, 0.9], ds = [[-2.4, -0.9], [-0.3, 1.5], [1.6, -1.0], [3.4, 1.3]]; const t0 = 0.3, R = 2.5, t1 = t0 + R, T = 5.0;
  const path = (u) => [lerp(-4.4, 4.2, u), 0.75 * Math.cos(u * Math.PI * 2.0) + 0.1], us = [0.26, 0.5, 0.72, 0.92];
  W.F14 = { T, cam: { x: 0.0, z: 0.2, w: 11.4 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'castPlant', { to: 0.3, speed: 2 }], [t0 + 0.15, 'belly', { loop: true, until: t1 }], [t1, 'castPlant', { from: 0.6 }]],
    root: (() => { const Rt = [{ t: t0 }]; for (let i = 1; i <= 25; i++) { const u = i / 25, p = path(u), q = path(Math.min(1, u + 0.03)); Rt.push({ t: t0 + R * u, x: p[0], z: p[1], y: 0.28, look: [q[0] + (q[0] - p[0]) * 5, q[1] + (q[1] - p[1]) * 5], e: 'lin', roll: 12 * Math.sin(u * Math.PI * 2.0) }); } Rt.push({ t: t1 + 0.2, y: 0, roll: 0, e: 'out' }); return Rt; })(),
    body: (t) => shake(t, t1 + 0.5, 0.6, 0.7),
    fx(A) { const ride = (t) => { const r = A.rootAt(t); return [r.x, 0, r.z]; };
      FX.wave(A, { t: t0 + 0.05, at: ride, yaw: (t) => A.rootAt(t).yaw, dur: R, out: 0.25, w: 1.6, h: 0.38, len: 1.0, wet: false });
      road(A, ride, t0 + 0.1, t1, 2.0, { op: 0.3 });
      ds.forEach((d, i) => { const th = t0 + R * us[i], p = path(Math.max(0, us[i] - 0.03)); A.hit(i, th, 14, { soak: true }); A.moveTo(i, th + 0.05, [lerp(d[0], p[0], 0.75), lerp(d[1], p[1], 0.75)], 0.35, 'out'); A.turn(i, th + 0.1, 60, 0.4); A.soak(i, th + 1.2, 6, { quiet: true }); });
      A.cap(t0, 2.6, '破浪：踏浪 2.5 秒；身后留下一条水路，2 u 宽，6 秒', 'Bow wave: she rides 2.5 s; the wave lays a road of water behind her, 2 u wide, 6 s');
      A.cap(2.6, T, '经过的敌人各 14，并被吸到水路上', 'Foes she passes take 14 and are drawn in onto the road'); } };
}
// F15 Pond clap 撞水: her water on both sides of the spot folds in and claps there: foes standing in her water within 4 u are carried to the spot: 18, stun 0.5 s
{ const me = [-3.6, 0.3], c = [0.4, 0.1], pa = [0.3, -2.0], pb = [0.6, 2.1], ds = [[0.0, -1.8], [0.9, -2.3], [0.4, 1.9], [1.1, 2.4], [0.5, 0.2]].map((d, i) => i < 4 ? [d[0], d[1], { soaked: 9 }] : d);
  const tp = 0.3 + 0.4, tm = tp + 0.4, tb = tm + 0.45, T = 3.6; const land = [[0.15, -0.35], [0.85, -0.2], [0.1, 0.5], [0.9, 0.55]];
  const sl = (p) => (t) => { const u = t < tm ? EASE.in(clamp((t - tp) / 0.4)) : 1 - EASE.s(clamp((t - tb) / 0.5)); return [lerp(p[0], c[0], u * 0.72), 0, lerp(p[1], c[1], u * 0.72)]; };
  W.F15 = { T, cam: { x: -0.4, z: 0.1, w: 9.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant', { speed: 0.9 }]], root: [{ t: 0.2, look: c }], body: (t) => mixA(tailSlap(t, tm, 0.6), shake(t, 2.6, 0.6, 0.5)),
    fx(A) { FX.pointer(A, { t0: 0, t1: tm, at: P(c) });
      pond(A, 0.05, T, sl(pa), 1.25, { follow: true }); pond(A, 0.05, T, sl(pb), 1.25, { follow: true });
      [0, 1, 2, 3].forEach((i) => { A.moveTo(i, tp, land[i], 0.4, 'in'); A.hit(i, tm + 0.02 + 0.02 * i, 29, { crash: true, stun: 0.5 }); });
      A.hit(4, tm + 0.03, 18, { stun: 0.5 });
      FX.column(A, { t: tm, at: P(c), h: 2.0, r: 0.1, dur: 0.3, fall: true }); FX.splash(A, { t: tm, at: P(c), r: 1.0, h: 0.6, crash: true }); A.shake(tm, 0.06, 0.2);
      A.cap(0.3, tb, '撞水：落点 4 u 内，她的水向中间合拢，把水里的小敌人带过来：18，眩晕 0.5 秒', 'Pond clap: her water within 4 u folds in on the spot and carries its small foes there: 18, stun 0.5 s');
      A.cap(tb, T, '水再流回原处', 'Then the water runs back where it lay'); } };
}
// F16 Drain 排空 (big): all her water in the room drains to her, dragging the foes in it; then the burst: 40, and 6 more and 0.3 u wider for each part drained (up to 5); the burst leaves one pond
{ const me = [-0.2, 0.1], parts = [[-3.4, -1.3, 1.1], [3.2, -1.4, 1.2], [3.0, 1.9, 1.0], [-3.1, 2.0, 1.15]], ds = [[-3.2, -1.0], [3.0, -1.2], [3.3, 1.7], [-2.9, 1.8], [2.7, -1.8]].map((d) => [d[0], d[1], { soaked: 9 }]);
  const t0 = 0.3, td = 0.55, ts = td + 1.0, tb = ts + 0.3, T = 4.8, RB = 1.6 + 0.3 * 4;
  W.F16 = { T, cam: { x: -0.1, z: 0.2, w: 10.8 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'castSweep', { to: 0.5 }], [0.65, 'level', { loop: true, until: ts }], [ts, 'castBloom', { from: 0.3, to: 0.62 }], [tb, 'castPlant', { from: 0.3 }]],
    root: [{ t: 0.5 }, { t: ts, spin: 720, e: 'in2' }, { t: ts + 0.1, spin: 740, e: 'out' }], body: (t) => mixA(coil(t, 0.4, ts, 0.6), tailSlap(t, tb + 0.1, 1), shake(t, tb + 1.0, 0.8, 1)),
    fx(A) { // each part of her water stretches into a stream and runs to her feet in 1 s
      parts.forEach((p, k) => { const u = (t) => EASE.in(clamp((t - td) / 1.0)); pond(A, 0.05, ts + 0.05, (t) => [lerp(p[0], me[0], u(t)), 0, lerp(p[1], me[1], u(t))], (t) => p[2] * (1 - 0.75 * u(t)), { follow: true, grow: false, fout: 0.1 });
        FX.strip(A, { t0: td, t1: ts + 0.1, from: (t) => [lerp(p[0], me[0], u(t)), 0, lerp(p[1], me[1], u(t))], to: P(me), follow: true, w: 0.5, op: 0.3, flow: 1.4, fout: 0.15 }); });
      FX.ring(A, { t: td, at: [me[0], 0.03, me[1]], r0: RB, r1: RB, dur: tb - td, col: C.foam, op: 0.6, w: 0.05 });
      ds.forEach((d, i) => { const dx = me[0] - d[0], dz = me[1] - d[1], l = Math.hypot(dx, dz), k = Math.min(4, l - 0.95) / l; A.moveTo(i, td + 0.05, [d[0] + dx * k, d[1] + dz * k], 0.95, 'in2'); A.turn(i, td, 200, 0.95); });
      A.say(ts - 0.1, { zh: '四处水：+24，远 1.2 u', en: 'Four waters: +24, 1.2 u farther' }, { col: C.sky });
      FX.column(A, { t: tb, at: P(me), h: 3.4, r: 0.6, dur: 0.75, fall: true }); FX.ringwave(A, { t: tb + 0.05, at: P(me), r0: 0.5, r1: RB, h: 0.6, dur: 0.5 });
      ds.forEach((d, i) => A.hit(i, tb + 0.1 + 0.01 * i, 102, { crash: true, up: 0.5, big: true }));
      pond(A, tb + 0.5, T, me, RB, { fin: 0.5 }); ds.forEach((d, i) => A.soak(i, tb + 1.3, 6, { quiet: i > 0 }));
      A.dark(ts - 0.1, tb + 0.1, 0.3, 0.1, 0.2); A.shake(tb, 0.08, 0.3);
      A.cap(t0, tb, '排空：全房间的水流向她，把水里的小敌人拖来（最多 4 u）', 'Drain: all her water in the room runs to her, dragging its small foes along (up to 4 u)');
      A.cap(tb, T, '爆开：40，每吸一处水 +6、远 0.3 u（最多 5 处）；水用光，只留脚下一个塘', 'The burst: 40, 6 more and 0.3 u farther out for each water drained (up to 5); one pond is left'); } };
}
// F17 Water walk 凌波: a step that lands on her water is free: up to six steps; a ripple on her water is twice as wide (3 u)
{ const cc = [0.3, 0.2], HR = 1.6, L = [0, 1, 2, 3, 4, 5].map((k) => around(cc, 180 - 60 * (k + 1), HR)), me = around(cc, 180, HR), ds = [[0.3, 0.3], around(cc, 100, 2.5), around(cc, 330, 2.6), around(cc, 215, 2.7), around(cc, 30, 1.0)].map((d) => [d[0], d[1], { soaked: 9 }]);
  const st = [0.45, 0.95, 1.45, 1.95, 2.45, 2.95], hop = 0.3, T = 4.6;
  W.F17 = { T, cam: { x: 0.2, z: 0.2, w: 8.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.2, 'idle', { loop: true, until: T }]],
    root: (() => { const Rt = [{ t: 0.1, look: L[0] }]; st.forEach((t, k) => { const a = k ? L[k - 1] : me; Rt.push({ t, x: a[0], z: a[1], look: L[k] }); Rt.push({ t: t + hop, x: L[k][0], z: L[k][1], jump: 0.4, look: L[k], e: 'lin' }); }); return Rt; })(),
    body: (t) => mixA(...st.map((s) => crouch(t, s - 0.08, s + 0.05, 0.7)), ...st.map((s) => crouch(t, s + hop - 0.02, s + hop + 0.12, 0.5)), tailSlap(t, st[5] + hop, 0.5), shake(t, st[5] + hop + 0.6, 0.5, 0.5)),
    fx(A) { pond(A, 0.05, T, cc, 2.9);
      L.forEach((p, k) => { const tl = st[k] + hop; FX.ring(A, { t: tl, at: [p[0], 0.03, p[1]], r0: 0.2, r1: 1.5, dur: 0.3, col: C.foam, op: 0.75, w: 0.08 }); FX.splash(A, { t: tl, at: P(p), r: k === 5 ? 0.45 : 0.2, h: k === 5 ? 0.4 : 0.2, n: k === 5 ? 8 : 4 });
        ds.forEach((d, i) => { if (Math.hypot(d[0] - p[0], d[1] - p[1]) < 1.5) A.hit(i, tl + 0.05, 6, { noStop: true }); }); A.say(tl, { zh: '第 ' + (k + 1) + ' 步', en: 'Step ' + (k + 1) }, { col: k > 2 ? C.sky : C.foam }); });
      A.cap(0.2, 2.2, '凌波：落在她的水上的一步不算数：最多六步', 'Water walk: a step that lands on her water is free: up to six steps');
      A.cap(2.2, T, '水上的涟漪宽一倍（3 u）：6', 'A ripple on her water is twice as wide (3 u): 6'); } };
}
// F18 Spill 溢泡: a 10 bubble that spills: each foe that hits it gets a puddle under its feet; when it pops it leaves a pool, 3 u, 6 s, where the friend stands
{ const me = [-3.0, 0.5], al = [-0.4, 0.0], ds = [[0.45, 0.45], [0.3, -0.75], [2.6, -0.2]]; const tc = 0.3 + 0.38, hits = [1.4, 2.0, 2.7], who = [0, 2, 1], T = 4.8;
  W.F18 = { T, cam: { x: -0.1, z: 0.1, w: 7.4 }, her: H(me[0], me[1]), dum: [[al[0], al[1], { ally: true, face: 90 }], ...ds], seq: [[0.3, 'castBloom', { speed: 1.2 }]], root: [{ t: 0.3, look: al }], body: (t) => pawUp(t, 0.45, 1.0, 0.7),
    fx(A) { FX.pointer(A, { t0: 0, t1: tc + 0.2, at: P(al) }); FX.bolt(A, { t: tc, to: (t) => A.dpt(0, t, 0.62), dur: 0.35, r: 0.08, col: C.bubble, splash: false });
      shieldOn(A, 0, tc + 0.35, hits[2] + 0.02, (t) => t < hits[0] ? 10 : t < hits[1] ? 6 : t < hits[2] ? 2 : 0, { hits });
      hits.forEach((h, k) => { const w = who[k], d = ds[w]; if (w === 2) foeBolt(A, { t: h - 0.4, d: 3, dur: 0.4, to: (t) => A.dpt(0, h, 0.7) }); else A.turn(w + 1, h - 0.15, 25, 0.15);
        // the spurt: from the dent to the attacker's feet, where it lies as a puddle (1.2 u, 4 s)
        FX.jet(A, { t: h + 0.02, from: (t) => A.dpt(0, h, 0.6), to: [d[0], 0.05, d[1]], w: 0.05, dur: 0.2, hold: 0.05, tail: 0.1 }); pond(A, h + 0.2, Math.min(T, h + 4.2), d, 0.6); A.soak(w + 1, h + 0.35, 4, { quiet: k > 0 }); });
      const tp = hits[2] + 0.05; FX.splash(A, { t: tp, at: P(al), r: 0.9, h: 0.5, n: 12 }); FX.ring(A, { t: tp, at: [al[0], 0.03, al[1]], r0: 0.3, r1: 1.5, dur: 0.3, col: C.foam, op: 0.7, w: 0.1 }); pond(A, tp + 0.05, T, al, 1.5, { fin: 0.3 }); one(A, tp + 0.5);
      A.cap(0.3, hits[2], '溢泡：10 的泡泡；每个打它的敌人脚下多一个水洼（1.2 u，4 秒）', 'Spill: a 10 bubble; each foe that hits it gets a puddle under its feet (1.2 u, 4 s)');
      A.cap(hits[2], T, '破了：队友站的地方留下水塘，3 u，6 秒', 'It pops: a pool stays where the friend stands, 3 u, 6 s'); } };
}
// F20 Blowout 喷涌: on her water, the water within 3 u of the vent goes up with it: every foe standing there is launched: 16
{ const me = [-3.4, 0.3], c = [0.2, 0.0], ds = [[0.0, -0.2], [1.3, 0.7], [-1.0, 0.9], [1.6, -1.0], [-0.3, -1.7], [3.4, 0.4]].map((d, i) => [d[0], d[1], { soaked: 9 }]); const tp = 0.3 + 0.4, te = tp + 0.6, T = 3.8;
  W.F20 = { T, cam: { x: -0.1, z: 0.0, w: 8.6, y: 0.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.15, 'castPlant', { to: 0.42, speed: 1.8 }], [0.4, 'castPlant', { from: 0.2 }]], body: (t) => mixA(lookUp(t, te, te + 1.0, 25), shake(t, 2.9, 0.6, 0.5)),
    fx(A) { // her water: one piece, a big pond and an arm that runs out past 3 u
      pond(A, 0.05, T, c, 2.4); canal(A, 0.05, T, [2.0, 0.2], [4.0, 0.5], 1.3, { flow: 0.03 });
      FX.pool(A, { t0: tp - 0.1, t1: te + 0.1, at: P(c), r: (t) => 2.4 + 0.03 * Math.sin(t * 50), op: 0.3, grow: false }); FX.ring(A, { t: tp, at: [c[0], 0.03, c[1]], r0: 3.0, r1: 3.0, dur: 0.6, col: C.foam, op: 0.7, w: 0.04 });
      FX.column(A, { t: te, at: P(c), h: 2.4, r: 0.55, dur: 0.75 }); FX.ringwave(A, { t: te, at: P(c), r0: 0.4, r1: 2.4, h: 0.3, dur: 0.35 });
      [0, 1, 2, 3, 4].forEach((i) => { A.hit(i, te + 0.02 + 0.01 * i, 16, { up: 1.5, big: i === 0 }); FX.splash(A, { t: te, at: P(ds[i]), r: 0.5, h: 0.7, n: 8 }); FX.splash(A, { t: te + 0.8, at: P(ds[i]), r: 0.4, h: 0.3, n: 6 }); });
      A.shake(te, 0.06, 0.22); A.tag(5, te, te + 1.4, ['3 u 外', 'Past 3 u'], C.pebble);
      A.cap(0.15, T, '喷涌：在她的水上，喷口 3 u 内的水一起掀起：站在上面的敌人各 16，挑飞 0.8 秒', 'Blowout: on her water, the water within 3 u of the vent goes up with it: 16 to every foe on it, launched 0.8 s'); } };
}
// F22 Porpoise 鱼跃: under her own water the 2 s do not run (3.5 s at most); she comes out in one great leap to the pointer, up to 4 u, and lands with a splash that grows with her time under: 14, and 4 more and 0.4 u wider a second
{ const me = [-5.6, 0.3], w0 = [-4.6, 0.3], w1 = [0.0, 0.1], land = [2.8, 0.0], ds = [around(land, 40, 1.0), around(land, 160, 1.3), around(land, 270, 1.1), around(land, 330, 2.4), [-2.0, -0.5]]; const t0 = 0.3, tin = t0 + 0.4, sw = 2.5, tout = tin + sw, tl = tout + 0.6, T = tl + 1.8, RS = 2.0 + 0.4 * sw, N = 14 + 4 * sw;
  const out = [w1[0] - 0.6, w1[1]];
  W.F22 = { T, cam: { x: 0.2, z: 0.0, w: 13.4, y: 0.6 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'tuckAir', { loop: true, until: tl + 0.3, fade: 0.15 }]],
    root: [{ t: t0 }, { t: tin, fw: 0.9, y: -0.4, jump: 0.6, pitch: 120, e: 'lin' }, { t: tout - 0.01, x: out[0], z: out[1], y: -0.6, pitch: 120, cut: true }, { t: tout, x: out[0], z: out[1], y: -0.6, pitch: -70, cut: true },
      { t: tout + 0.3, x: lerp(out[0], land[0], 0.5), z: lerp(out[1], land[1], 0.5), y: 2.0, pitch: -180, e: 'out' }, { t: tl, x: land[0], z: land[1], y: 0.15, pitch: -270, e: 'in' }, { t: tl + 0.35, x: land[0] + 0.3, z: land[1], y: 0, pitch: -360, e: 'out' }],
    hide: [[tin, tout]], body: (t) => shake(t, tl + 0.8, 0.6, 1),
    fx(A) { canal(A, 0.05, T, w0, w1, 2.0, { flow: 0.03 }); FX.pointer(A, { t0: tin, t1: tl, at: P(land) });
      FX.splash(A, { t: tin, at: (t) => A.ahead(tin - 0.05, 0.3, 0), r: 0.45, h: 0.5 }); FX.ring(A, { t: tin, at: (t) => A.ahead(tin - 0.05, 0.3, 0), r0: 0.3, r1: 0.9, dur: 0.5 });
      const swim = (t) => { const u = clamp((t - tin) / sw); return [lerp(w0[0] + 0.3, out[0], u), 0.02, lerp(w0[1], out[1], u) + 0.45 * Math.sin(u * 9)]; };
      for (let k = 0; k < 22; k++) { const tk = tin + 0.05 + k * sw / 22; FX.ring(A, { t: tk, at: swim(tk), r0: 0.15, r1: 0.5 + 0.3 * k / 22, dur: 0.6, col: C.foam, op: 0.5, w: 0.15 }); }
      A.hud(gaugeHud('水下', 'Under water', (t) => t < tin ? 0 : t < tout ? (t - tin) / 3.5 : null, { full: true }));
      // the tell: a foam ring where she will land, as wide as the splash will be; then the leap, 0.6 s in the air
      FX.ring(A, { t: tout - 0.05, at: [land[0], 0.03, land[1]], r0: RS, r1: RS, dur: 0.65, col: C.foam, op: 0.7, w: 0.04 });
      FX.splash(A, { t: tout, at: P(out), r: 0.5, h: 0.9, n: 10 }); FX.trail(A, { of: (t) => { const r = A.rootAt(t); return new A.THREE.Vector3(r.x, r.y + 0.3, r.z); }, t0: tout, t1: tl, len: 0.5, w: 0.1, col: C.sky, op: 0.6 });
      FX.splash(A, { t: tl, at: P(land), r: RS * 0.7, h: 1.3, n: 26 }); FX.ringwave(A, { t: tl, at: P(land), r0: 0.4, r1: RS, h: 0.4, dur: 0.4 }); A.shake(tl, 0.08, 0.28);
      [0, 1, 2, 3].forEach((i) => { const d = ds[i], dx = d[0] - land[0], dz = d[1] - land[1], l = Math.hypot(dx, dz); A.hit(i, tl + 0.03 + 0.02 * i, N, { soak: true, knock: [dx / l, dz / l], kdur: 0.3, big: i === 0 }); });
      A.cap(t0, tout - 0.3, '鱼跃：在自己的水下，2 秒不走表（最多 3.5 秒）', 'Porpoise: under her own water the 2 s do not run (3.5 s at most)');
      A.cap(tout - 0.3, T, '一跃跳向指针（最多 4 u）；落水溅开：2 u 内 14，水下每秒 +4、远 0.4 u', 'One great leap to the pointer (up to 4 u); the splash: 14 within 2 u, 4 more and 0.4 u farther out a second under'); } };
}
// F23 Shared water 共潮: while the friend stands in her water their hits Crash 小拍: 30% more to a soaked foe, and the soak is spent
{ const me = [-3.0, 0.6], al = [-0.5, 0.0], pc = [-0.2, 0.1], ds = [[0.45, -0.1, { soaked: 9 }], [0.8, 0.7]]; const tc = 0.3 + 0.44, T = 4.4, hs = [1.6, 2.4, 3.2];
  W.F23 = { T, cam: { x: -0.6, z: 0.2, w: 6.4 }, her: H(me[0], me[1]), dum: [[al[0], al[1], { ally: true, face: 0 }], ...ds], seq: [[0.3, 'castPoint']], root: [{ t: 0.3, look: al }],
    fx(A) { pond(A, 0.05, T, pc, 1.5);
      FX.rope(A, { t0: tc - 0.05, t1: tc + 0.45, from: 'tip', to: (t) => A.dpt(0, t, 0.65), w: 0.07 }); FX.ring(A, { t: tc + 0.2, at: { d: 0, y: 0.7 }, r0: 0.3, r1: 0.42, dur: T - tc - 0.3, dir: [0, 1, 0], col: C.cobalt, op: 0.6, w: 0.3 });
      // a second ribbon climbs from the water up the friend's legs while they stand in it
      FX.rope(A, { t0: tc + 0.3, t1: T - 0.1, from: [al[0] - 0.25, 0.02, al[1] + 0.2], to: (t) => A.dpt(0, t, 0.55), w: 0.05, sag: -0.1 }); FX.ring(A, { t: tc + 0.3, at: [al[0], 0.03, al[1]], r0: 0.2, r1: 0.6, dur: 0.4, col: C.foam, op: 0.6, w: 0.12 });
      hs.forEach((t, k) => { A.turn(0, t - 0.15, k % 2 ? 40 : -40, 0.15); A.hit(1, t, 10, { crash: true }); FX.splash(A, { t, at: { d: 1, y: 0.5 }, r: 0.35, h: 0.35, crash: true, n: 6 }); A.soak(1, t + 0.25, 4, { quiet: k > 0 }); A.hit(2, t + 0.05, 4, { soak: k === 0, noStop: true }); });
      A.say(hs[0] + 0.05, { zh: '小拍 +30%', en: 'Small Crash +30%' }, { col: C.sky });
      A.cap(0.3, hs[1], '共潮：河赐如基础；队友站在她的水里时，打浸湿的敌人算小拍：+30%，浸湿用掉', "Shared water: the base gift; while the friend stands in her water, their hits on a soaked foe are a small Crash: 30% more, and the soak is spent");
      A.cap(hs[1], T, '河赐马上又把它浸湿：下一击再拍', 'The gift soaks it again at once: the next hit Crashes too'); } };
}
// F24 Lagoon 水乡 (big): the dome is 5 u wide; five canals run out from it: one to each of her waters within 8 u, the rest to the nearest foes outside, each ending in a puddle under its foe
{ const me = [-1.2, 0.5], dc = [0.2, 0.2], DR = 2.5, al = [0.0, 1.0], pw = [[-4.6, -1.6, 1.0], [4.8, 1.9, 1.1]], ds = [[1.0, -0.5], [-0.9, -0.9], [4.2, -1.9], [-3.9, 2.2], [0.9, 3.6 - 0.4]]; const t0 = 0.3, tu = t0 + 0.9, tf = 3.6, T = 5.6;
  const ends = [[pw[0][0], pw[0][1]], [pw[1][0], pw[1][1]], ds[2], ds[3], ds[4]];
  W.F24 = { T, cam: { x: 0.1, z: 0.3, w: 12.4 }, her: H(me[0], me[1]), dum: [[al[0], al[1], { ally: true, face: 0 }], ...ds], seq: [[t0, 'whip', { to: 0.4 }], [0.6, 'castBloom', { from: 0.3 }], [tf - 0.3, 'castPlant', { from: 0.25 }]],
    body: (t) => mixA(coil(t, 0.3, 0.75, 0.8), lookUp(t, 0.9, 1.8, 25), tailSlap(t, tf + 0.05, 0.8), shake(t, tf + 0.9, 0.5, 0.7)),
    fx(A) { pw.forEach((p) => pond(A, 0.05, T, [p[0], p[1]], p[2]));
      FX.dome(A, { t0: tu, t1: tf + 0.35, at: [dc[0], 0, dc[1]], r: DR, flat: 0.75, op: 0.45, grow: 0.5, fall: tf, hits: [] }); pond(A, tu + 0.3, T, dc, DR, { op: 0.34, fin: 0.4 });
      // five canals leave the dome's foot as it closes, 8 u a second; one to each of her waters, the rest to the nearest foes outside, each ending in a 1.2 u puddle
      ends.forEach((e, k) => { const dx = e[0] - dc[0], dz = e[1] - dc[1], l = Math.hypot(dx, dz), a = [dc[0] + dx / l * (DR - 0.2), dc[1] + dz / l * (DR - 0.2)], ts = tu + 0.45, dur = (l - DR) / 8;
        canal(A, ts, T, a, e, 1.0, { grow: dur, flow: 0.05, op: 0.36 }); FX.ring(A, { t: ts + dur, at: [e[0], 0.03, e[1]], r0: 0.2, r1: 0.9, dur: 0.3, col: C.foam, op: 0.6, w: 0.1 });
        if (k >= 2) { pond(A, ts + dur, T, e, 0.6); A.soak(k + 1, ts + dur + 0.2, 8, { quiet: k > 2 }); } });
      one(A, tu + 1.2);
      A.soak(1, tu + 0.3, 8); A.status(1, tu + 0.3, 'slow', tf - tu - 0.3); A.soak(2, tu + 0.3, 8, { quiet: true }); A.status(2, tu + 0.3, 'slow', tf - tu - 0.3);
      FX.ringwave(A, { t: tf + 0.25, at: [dc[0], 0, dc[1]], r0: DR, r1: 0.4, h: 0.9, dur: 0.35 }); FX.splash(A, { t: tf + 0.35, at: P(dc), r: 1.4, h: 1.0, crash: true });
      A.hit(1, tf + 0.35, 38, { crash: true }); A.hit(2, tf + 0.37, 38, { crash: true }); A.shake(tf + 0.35, 0.07, 0.25);
      A.cap(t0, tf, '水乡：水穹宽 5 u，流出五条水渠：先连她的水，其余流到外面敌人脚下', 'Lagoon: a 5 u dome; five canals run out: to her waters first, the rest to the foes outside');
      A.cap(tf, T, '塌下：拍 24；水穹的地面和水渠再留 8 秒', "It falls in: Crash 24; the dome's floor and the canals stay 8 s more"); } };
}
