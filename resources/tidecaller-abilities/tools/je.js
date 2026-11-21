// Jet 水刀 forms: thin, hard, straight lines; wet scores cut in the floor; the stream never stops (one foe, bosses)
import { FX, C, EASE, clamp, lerp } from './tc.js';
import { H, FORMS, D2R, around, fan, gaugeHud, foeBolt, ticks, shieldOn, block, slamFx, streamOn, pressureHud, tailSlap, shake, coil, leanBack, crouch, turnTrunk, lookUp, shiver, tuck, pawUp, mixA } from './defs.js';
import { TIDE, layWater, tidePts } from './defs.js';
const J = FORMS.je;
const WHITE = '#F4FAFF';
// a hard white blade line (the water blade, a needle): a thin stream with a white body
const blade = (A, o) => FX.stream(A, Object.assign({ w: 0.07, col: C.sky, coreCol: WHITE, sag: 0, wob: 0.004, speed: 6 }, o));
// a wet score cut in the floor along a line
const windup = (A, i, t0, t1) => FX.ring(A, { t: t0, at: { d: i, y: 0 }, r0: 0.2, r1: 0.75, dur: t1 - t0, col: '#B8141F', op: 0.8, w: 0.12, e: 'lin' });
const score = (A, t0, t1, a, b, o = {}) => FX.strip(A, Object.assign({ t0, t1, from: a, to: b, w: 0.12, op: 0.7, flow: 2.4, foam: true }, o));

// B: no tsunami; the stream builds Pressure (twice as fast on a soaked foe); at 5 the water blade 3 s: through every foe, double
{ const me = [-2.5, 0.1], ds = [[-0.6, 0.1, { soaked: true }], [0.7, 0.05], [1.9, 0.15]]; const s0 = 0.3, t5 = s0 + 2.5, s1 = t5 + 3.0;
  J.B = { noWarp: true, T: s1 + 0.9, cam: { x: -0.1, z: 0.0, w: 7.0 }, her: H(me[0], me[1]), dum: ds,
    seq: [[s0, 'stream', { loop: true, until: s1, fade: 0.15 }]],
    body: (t) => mixA(shiver(t, s0 + 0.15, t5, 0.6), shiver(t, t5, s1, 1.4), crouch(t, t5 - 0.05, s1, 0.6), tailSlap(t, t5, 0.6), shake(t, s1 + 0.15, 0.6, 0.7)),
    fx(A) { const P = (t) => t < s0 ? 0 : t < t5 ? (t - s0) / 2.5 : t < s1 ? 1 : null;
      FX.stream(A, { t0: s0 + 0.12, t1: t5, to: (t) => A.dpt(0, t, 0.6), w: 0.17, wid: (v, t) => (0.75 + 0.25 * v) * (1 - 0.45 * clamp((t - s0) / 2.5)) });
      ticks(A, 0, s0 + 0.3, t5 - 0.1, 3, 0.2);
      // the blade: through every foe, double; a wet score cut in the floor under it
      blade(A, { t0: t5, t1: s1, to: (t) => A.ahead(t, 4.5, 0.6), head: 0.06 }); score(A, t5 + 0.05, s1 + 0.6, (t) => A.ahead(t5, 0.6, 0), (t) => A.ahead(t5, 4.5, 0), { grow: 0.2 });
      FX.ring(A, { t: t5, at: 'tip', r0: 0.05, r1: 0.45, dur: 0.25, dir: (t) => A.fwd(t5), col: WHITE, op: 0.9, w: 0.2 }); FX.spark(A, { t: t5, at: 'tip', r: 0.5, col: WHITE, op: 0.6 });
      [0, 1, 2].forEach((i) => ticks(A, i, t5 + 0.1 + i * 0.03, s1 - 0.05, 6, 0.2, { col: WHITE }));
      A.hud(pressureHud(P)); A.say(t5, { zh: '水刀！', en: 'Water blade!' }, { col: WHITE });
      A.cap(s0, t5, '水流积水压，浸湿的敌人快一倍', 'The stream builds Pressure, twice as fast on a soaked foe');
      A.cap(t5, s1 + 0.9, '满 5：水刀 3 秒，穿透所有敌人，伤害翻倍', 'At 5: the water blade, 3 s: through every foe, double'); } };
}
// D: the stream does not break: she turns on the board of water and keeps it on her target the whole ride
{ const me = [-2.3, 0.9], d0 = [0.9, -0.7]; const s0 = 0.25, t0 = 0.9, L = 2.6;
  const k = (t) => { const a = t - t0; const ss = (x0, x1, x) => { x = clamp((x - x0) / (x1 - x0)); return x * x * (3 - 2 * x); }; return ss(0.10, 0.22, a) * (1 - ss(0.62, 0.80, a)); };
  J.D = { noWarp: true, T: 3.6, cam: { x: -0.4, z: 0.1, w: 6.6 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1], { soaked: true }], [-0.4, -1.1]],
    seq: [[s0, 'stream', { loop: true, until: t0, fade: 0.12 }], [t0, 'surf', { loop: true, until: t0 + 0.85, fade: 0.1 }], [t0 + 0.85, 'stream', { loop: true, until: 3.1, fade: 0.15 }]],
    root: (() => { const R = [{ t: s0, look: d0 }, { t: t0, look: d0 }]; for (let i = 1; i <= 14; i++) { const a = i * 0.06, t = t0 + a, x = me[0] + L * EASE.s(clamp(a / 0.8)); R.push({ t, x, z: me[1], y: 0.5 * k(t), look: d0, e: 'lin', roll: -10 * k(t) }); } R.push({ t: t0 + 1.0, y: 0, roll: 0, look: d0 }); return R; })(),
    body: (t) => mixA(shiver(t, s0 + 0.1, 3.1, 0.7), shake(t, 3.15, 0.4, 0.5)),
    fx(A) { const ride = (t) => { const r = A.rootAt(t); return [r.x, 0, r.z]; };
      FX.wave(A, { t: t0 + 0.06, at: ride, yaw: () => 90 * D2R, dur: 0.75, out: 0.15, w: 0.95, h: 0.7, len: 1.0, rise: 0.14, hFn: (u) => Math.max(0.05, k(t0 + 0.06 + u * 0.75) + 0.05), wet: false });
      FX.strip(A, { t0: t0 + 0.12, t1: 3.6, from: [me[0], 0, me[1]], to: [me[0] + L, 0, me[1]], grow: 0.7, w: 0.95, op: 0.35, flow: 0.2 });
      streamOn(A, s0 + 0.1, 3.1, 0, { w: 0.14 }); foeBolt(A, { t: t0 + 0.05, d: 1, dur: 0.45, to: [me[0] + 0.5, 0.8, me[1]] });
      A.cap(0.1, 3.6, '冲刺中水流不断：踏水板转身，一直对准目标', 'The stream does not break: she turns on her board and keeps it on the target'); } };
}

// ================================================================ Stream 流
// F1 Homing: the bolt tags the foe 4 s (a small turning ring); her stream bends to it from any angle, like a hose swung round a corner
{ const me = [-2.2, 0.6], d0 = [0.4, -0.7], d1 = [0.8, 0.9]; const tb = 0.3 + 0.44 / 1.3, s0 = 1.15, s1 = 3.5;
  J.F1 = { T: 4.0, cam: { x: -0.4, z: 0.1, w: 6.4 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1]], [d1[0], d1[1], { soaked: true }]],
    seq: [[0.3, 'castPoint', { speed: 1.3 }], [s0, 'stream', { loop: true, until: s1, fade: 0.15 }]],
    root: [{ t: 0.3, look: d0 }, { t: s0 - 0.1, look: d0 }, { t: s0 + 0.2, look: [1.6, 0.6], e: 'io2' }, { t: s1, look: [1.6, 0.9] }],
    body: (t) => mixA(turnTrunk(t, 0.3, 0.75, -20), shiver(t, s0, s1, 0.7), shake(t, s1 + 0.1, 0.4, 0.5)),
    fx(A) { FX.bolt(A, { t: tb, to: (t) => A.dpt(0, t, 0.65), dur: 0.3, r: 0.1 }); A.hit(0, tb + 0.3, 14, { soak: true });
      FX.mark(A, { t0: tb + 0.3, t1: s1 + 0.3, at: { d: 0, y: 1.1 }, r: 0.22 }); A.moveTo(0, 1.2, [1.0, -1.3], 2.2, 'io2');
      // the hose bends: it leaves her aim, then curls round to the tagged foe
      FX.stream(A, { t0: s0 + 0.1, t1: s1, to: (t) => A.dpt(0, t, 0.6), w: 0.14, sag: 0, bend: (v, t) => { const f = A.fwd(t); const sd = Math.sin(v * Math.PI) * 1.1; return new A.THREE.Vector3(f.x * sd, 0, f.z * sd); } });
      ticks(A, 0, s0 + 0.4, s1, 3, 0.2); A.tag(0, tb + 0.35, s1 + 0.3, ['引流', 'Tagged'], C.foam);
      A.cap(0.3, 4.0, '标记敌人 4 秒：水流从任何角度弯过去追它', 'Tags the foe 4 s: her stream bends to it from any angle'); } };
}
// F2 Sever: the jet is a flat sheet on edge; foes it leaves under 20% health are cut down (each parts into two splashes)
{ const me = [-2.4, 0.1], ds = [[-0.8, 0.1, { soaked: true }], [0.5, 0.15], [1.9, 0.05]]; const tr = 0.35 + 0.44;
  J.F2 = { T: 2.8, cam: { x: -0.1, z: 0.0, w: 6.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.35, 'castPoint']], root: [{ t: tr - 0.02 }, { t: tr + 0.1, fw: -0.18, e: 'out' }, { t: tr + 0.6, fw: -0.12 }],
    body: (t) => mixA(crouch(t, tr - 0.1, tr + 0.5, 1), tailSlap(t, tr, 0.7), shake(t, tr + 0.9, 0.6, 0.7)),
    fx(A) { blade(A, { t0: tr, t1: tr + 0.25, to: (t) => A.ahead(tr, 5.5, 0.55), head: 0.1, tail: 0.15, w: 0.05, wid: () => 1 });
      FX.sheet(A, { t0: tr, t1: tr + 0.3, at: (t) => A.ahead(tr, 2.9, 0.25), follow: true, yaw: 0, w: 0.02, h: 0.45, th: 5.0, op: 0.45, rise: 0.06, col: C.sky });
      FX.ring(A, { t: tr, at: 'tip', r0: 0.08, r1: 0.5, dur: 0.25, dir: (t) => A.fwd(tr), col: WHITE, op: 0.9, w: 0.2 });
      A.tag(1, 0, tr + 0.08, ['残血', 'Low'], C.parch); A.tag(2, 0, tr + 0.1, ['残血', 'Low'], C.parch);
      A.hit(0, tr + 0.04, 29, { crash: true }); A.hit(1, tr + 0.07, 18, { fell: true, big: true }); A.hit(2, tr + 0.1, 18, { fell: true, big: true });
      for (const [i, tt] of [[1, tr + 0.07], [2, tr + 0.1]]) for (const s of [-1, 1]) FX.splash(A, { t: tt + 0.05, at: { d: i, y: 0, dz: s * 0.3 }, r: 0.3, h: 0.5, n: 5 });
      A.say(tr + 0.3, { zh: '斩！', en: 'Cut down!' }, { col: WHITE });
      A.cap(0.35, 2.8, '低于 20% 生命的敌人被斩断', 'Foes it leaves under 20% health are cut down'); } };
}
// F3 Pin: the ribbon goes straight and stiff, a lance on the foe's chest; it is shoved 4 u and nailed to the wall 1.5 s
{ const me = [-2.4, 0.1], d0 = [-0.6, 0.1], wx = 2.3; const tr = 0.3 + 0.44, ta = tr + 0.35, t1 = ta + 1.5;
  J.F3 = { T: t1 + 1.0, cam: { x: 0.0, z: 0.1, w: 6.6 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1], { soaked: true }]], seq: [[0.3, 'castPoint', { to: 0.5 }], [0.8, 'pointHold', { loop: true, until: t1, fade: 0.1 }]],
    body: (t) => mixA(crouch(t, tr - 0.1, t1, 0.8), shiver(t, tr, t1, 0.8), tailSlap(t, tr, 0.7), shake(t, t1 + 0.2, 0.6, 0.6)),
    fx(A) { block(A, [wx + 0.35, 0.1], [0.4, 1.3, 2.2]);
      blade(A, { t0: tr, t1, to: (t) => A.dpt(0, t, 0.6), w: 0.09, head: 0.08 });
      A.hit(0, tr + 0.05, 12, { crash: true }); A.moveTo(0, tr + 0.05, [wx - 0.05, 0.1], 0.3, 'in2'); A.hold(0, ta, t1, 0.25, { drop: true });
      A.hit(0, ta, 10, { slam: true, stun: 1.5 }); slamFx(A, ta, [wx + 0.12, 0, 0.1]); A.tag(0, ta + 0.1, t1, ['钉住', 'Pinned'], C.foam);
      A.cap(0.3, t1 + 1.0, '水枪推敌 4 u，撞墙钉住 1.5 秒', 'A jet shoves one foe 4 u; at a wall it is nailed there 1.5 s'); } };
}
// F4 Headshot: one skip, then the stone cracks into one foe's brow: 24, stun 0.6 s; the head snaps back
{ const me = [-2.4, 0.2], d0 = [0.6, 0.2]; const t0 = 0.3 + 0.32;
  J.F4 = { T: 2.8, cam: { x: -0.4, z: 0.1, w: 6.2 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1], { soaked: true }], [1.4, -0.8]], seq: [[0.3, 'flick']],
    body: (t) => mixA(shake(t, 1.8, 0.5, 0.5)),
    fx(A) { const s = FX.stone(A, { t: t0, pts: [[-1.0, 0.2]], per: 0.22, hop: 0.25 }); const tk = t0 + 0.22, th = tk + 0.16;
      FX.bolt(A, { t: tk, from: [-1.0, 0.08, 0.2], to: (t) => A.dpt(0, t, 0.92), dur: 0.16, r: 0.09, col: C.sky, splash: false }); FX.spark(A, { t: th, at: { d: 0, y: 0.92 }, r: 0.5, col: WHITE, op: 0.7 });
      A.hit(0, th, 24, { wet: true, big: true, stun: 0.6, knock: [0.25, 0], kdur: 0.15 }); A.turn(0, th, 25, 0.1); A.turn(0, th + 0.25, -25, 0.3); A.launch(0, th, 0.15); A.shake(th, 0.04, 0.12);
      A.cap(0.3, 2.8, '一跳后正中额头：24，眩晕 0.6 秒', "One skip, then one foe's face: 24, stun 0.6 s"); } };
}
// F5 Sprinkler: a flick of the left paw; where her stream strikes, the water flies off the foe in a spinning wheel of arcs, like a lawn sprinkler, wetting everyone round it; the foe in the middle drips. 3 s: every 0.5 s, 2 to it and each foe within 2.5 u, soaks; a soaked foe is drenched
{ const me = [-2.6, 0.1], c = [0.6, 0.1], ds = [[c[0], c[1], { soaked: true }], around(c, 50, 1.5), around(c, 215, 1.8), around(c, 285, 1.3), around(c, 330, 2.2), around(c, 120, 3.3)]; const s0 = 0.3, tc = 0.9, t1 = tc + 3.0, T = t1 + 0.5;
  J.F5 = { noWarp: true, T, cam: { x: -0.2, z: 0.1, w: 8.0 }, her: H(me[0], me[1]), dum: ds, seq: [[s0, 'stream', { loop: true, until: T, fade: 0.15 }]], root: [{ t: 0.2, look: c }],
    body: (t) => mixA(pawUp(t, tc - 0.25, tc + 0.15, 1.0), shiver(t, s0, T, 0.5)),
    fx(A) { FX.stream(A, { t0: s0 + 0.1, t1: T, to: (t) => A.dpt(0, t, 0.6), w: 0.15 }); ticks(A, 0, s0 + 0.35, tc, 3, 0.2);
      FX.ring(A, { t: tc + 0.1, at: [c[0], 0.03, c[1]], r0: 2.5, r1: 2.5, dur: t1 - tc - 0.1, col: C.foam, op: 0.3, w: 0.04, e: 'lin' });
      let b = 0; for (let t = tc + 0.15; t < t1; t += 0.5, b++) { for (let k = 0; k < 6; k++) { const a = (k * 60 + b * 25) * D2R, tt = t + k * 0.04;
          FX.bolt(A, { t: tt, from: [c[0], 0.9, c[1]], to: [c[0] + Math.cos(a) * 2.3, 0.05, c[1] - Math.sin(a) * 2.3], dur: 0.35, arc: 0.7, r: 0.05, splash: false }); FX.drops(A, { t: tt + 0.35, at: [c[0] + Math.cos(a) * 2.3, 0.05, c[1] - Math.sin(a) * 2.3], n: 3, sp: 0.4, up: 0.3, size: 0.035 }); }
        ds.forEach((d, i) => { if (Math.hypot(d[0] - c[0], d[1] - c[1]) <= 2.5) A.hit(i, t + 0.3 + i * 0.01, 2, { noStop: true, soak: b === 0, col: C.sky }); }); }
      for (let t = tc; t < t1; t += 0.25) FX.drops(A, { t, at: [c[0], 0.6, c[1]], n: 2, sp: 0.15, up: 0.05, size: 0.03 });
      A.tag(0, tc + 0.4, t1, ['透湿', 'Drenched'], C.foam);
      A.cap(s0, T, '水流打中的地方变成洒水头 3 秒：每 0.5 秒，周围 2.5 u 的敌人各 2，浸湿；已浸湿的变透湿', 'Where her stream strikes, a sprinkler, 3 s: every 0.5 s, 2 to each foe within 2.5 u, soaks; a soaked foe is drenched'); } };
}
// F6 Billiard: let go: no burst; she slaps the orb away with her tail; it flattens to a disc and rings off the walls 5 times, through every foe: 10 a pass
{ const me = [-2.1, 0.5], ds = [[-0.4, -0.3, { soaked: true }], [1.0, 0.8], [1.4, -0.8]]; const tl = 2.0;
  const pts = [[-1.1, 0.2], [2.55, -1.15], [0.9, 1.55], [-1.5, -1.2], [2.55, 0.25], [0.2, 1.55]];
  J.F6 = { T: 4.6, cam: { x: 0.2, z: 0.15, w: 6.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom', { to: 0.62 }], [0.62, 'bloomHold', { loop: true, until: tl - 0.25 }], [tl - 0.25, 'castSweep', { from: 0.25 }]],
    root: [{ t: 0.5, look: [0, 0] }, { t: tl - 0.3, look: [0, 0] }, { t: tl, spin: -90, e: 'out' }, { t: tl + 0.5, look: [1, 0] }],
    body: (t) => mixA(pawUp(t, 0.6, tl - 0.3, 0.8), tailSlap(t, tl, 1.2), shake(t, 4.0, 0.5, 0.5)),
    fx(A) { const ors = (t) => A.at('tip', Math.min(t, 0.62)).toArray(); const hold = (t) => { const s = A.at('tip', 0.62); const u = clamp((t - 0.62) / 0.4); return [lerp(s.x, pts[0][0], u), lerp(s.y, 0.45, u), lerp(s.z, pts[0][1], u)]; };
      FX.orb(A, { t0: 0.4, t1: tl, at: (t) => t < 0.62 ? ors(t) : hold(t), r: (t) => t < tl - 0.1 ? 0.28 : 0.28, pop: false });
      // the disc rings off the walls
      block(A, [2.9, 0.1], [0.3, 0.6, 3.6]); block(A, [0.3, 1.85], [5.4, 0.6, 0.3]); block(A, [0.3, -1.5], [5.4, 0.6, 0.3]); block(A, [-2.9, 0.1], [0.3, 0.6, 3.6]);
      const per = 0.32; let tt = tl; const segs = []; for (let k = 0; k < 5; k++) { segs.push({ a: pts[k], b: pts[k + 1], t0: tt, t1: tt + per }); tt += per; }
      const pos = (t) => { for (const s of segs) if (t >= s.t0 && t <= s.t1) { const u = (t - s.t0) / per; return [lerp(s.a[0], s.b[0], u), 0.4, lerp(s.a[1], s.b[1], u)]; } return [segs[4].b[0], 0.4, segs[4].b[1]]; };
      const disc = A.add(new A.THREE.Mesh(new A.THREE.CylinderGeometry(0.26, 0.26, 0.06, 24), new A.THREE.MeshLambertMaterial({ color: C.sky, emissive: C.deep, transparent: true, opacity: 0.85 }))); disc.visible = false;
      A.fx((t) => { disc.visible = t >= tl && t <= tt; if (disc.visible) { disc.position.set(...pos(t)); disc.rotation.set(0.1, t * 20, 0); } });
      FX.trail(A, { of: (t) => new A.THREE.Vector3(...pos(Math.min(t, tt))), t0: tl, t1: tt, len: 0.18, w: 0.3, col: C.foam, op: 0.6 });
      segs.forEach((s) => { FX.splash(A, { t: s.t1, at: [s.b[0], 0.3, s.b[1]], r: 0.3, h: 0.45, n: 5 }); FX.spark(A, { t: s.t1, at: [s.b[0], 0.4, s.b[1]], r: 0.35, col: C.foam, op: 0.5 }); });
      // who each pass goes through
      segs.forEach((s) => ds.forEach((d, i) => { const vx = s.b[0] - s.a[0], vz = s.b[1] - s.a[1], L2 = vx * vx + vz * vz; const u = clamp(((d[0] - s.a[0]) * vx + (d[1] - s.a[1]) * vz) / L2); const px = s.a[0] + vx * u - d[0], pz = s.a[1] + vz * u - d[1]; if (Math.hypot(px, pz) < 0.35) A.hit(i, s.t0 + u * per, 10, { wet: !!d[2], noStop: true }); }));
      A.cap(0.3, tl, '按住：水珠跟着指针', 'Hold: the orb follows the pointer'); A.cap(tl, 4.6, '松开：尾巴一抽，在墙间弹 5 次，每次穿过 10', 'Let go: her tail slaps it away; it rings off the walls 5 times, through every foe: 10 a pass'); } };
}
// F7 Torpedo: hold as the base; the ball slides off the staff's tip into the floor and swims at 8 u a second to her target, turning as it moves; it bursts up under it in a column: 18 to 36 to it alone, Crash
{ const me = [-2.6, -0.4], ds = [[1.4, -0.9, { soaked: true }], [-0.6, -0.1]]; const th = 1.4, ts = th + 0.25; const ptr = [1.2, -0.6];
  // its swim, worked out ahead: it steers at the foe's spot each frame, 8 u a second
  let path = null; const sw = (A) => { if (path) return path; path = []; let p = A.ahead(ts, 0.7, 0); let t = ts; while (t < ts + 3) { const q = A.dpos(0, t); const dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz); path.push([t, p.x, p.z]); if (L < 0.12) break; const s = Math.min(L, 8 / 60); p = new A.THREE.Vector3(p.x + dx / L * s, 0, p.z + dz / L * s); t += 1 / 60; } return path; };
  const pAt = (A, t) => { const P = sw(A); const i = Math.max(0, Math.min(P.length - 1, Math.round((t - ts) * 60))); return P[i]; };
  J.F7 = { T: 3.8, cam: { x: -0.4, z: 0.0, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.25, 'castBloom', { to: 0.62 }], [0.62, 'bloomHold', { loop: true, until: th }], [th, 'castPoint', { speed: 0.9 }]], root: [{ t: 0.2, look: ptr }],
    body: (t) => mixA(crouch(t, th, ts + 0.2, 0.8), shake(t, 3.0, 0.6, 0.5)),
    fx(A) { A.moveTo(0, 0.5, [1.3, 0.8], 2.2, 's'); FX.pointer(A, { t0: 0.3, t1: ts, at: [ptr[0], 0, ptr[1]] });
      FX.orb(A, { t0: 0.4, t1: ts, at: 'tip', r: (t) => 0.06 + 0.24 * clamp((t - 0.4) / 0.9), pop: false });
      A.hud(gaugeHud('蓄力', 'Charge', (t) => t < 0.4 ? 0 : t < th ? clamp((t - 0.4) / 1.0) : null, { full: true }));
      const P = sw(A), te = P[P.length - 1][0]; const at = (t) => { const q = pAt(A, Math.min(Math.max(t, ts), te)); return [q[1], 0, q[2]]; };
      FX.splash(A, { t: ts, at: at, r: 0.3, h: 0.35 });
      FX.wake(A, { of: at, t0: ts, t1: te, w: 0.35, op: 0.7, life: 0.9, foam: true });
      FX.bubble(A, { t0: ts, t1: te, at: (t) => { const q = at(t); return [q[0], 0.06, q[2]]; }, r: 0.14, col: C.cobalt, pop: false, dark: () => 0.5 });
      FX.column(A, { t: te, at: (t) => { const q = A.dpos(0, te); return [q.x, 0, q.z]; }, h: 2.0, r: 0.4, dur: 0.6, fall: true }); A.hit(0, te + 0.02, 58, { crash: true, up: 0.8, big: true }); A.shake(te, 0.06, 0.2);
      A.cap(0.25, th, '按住蓄力', 'Hold to charge'); A.cap(th, 3.8, '鱼雷：钻进地里游向目标（每秒 8 u），会转弯，穿过一切；从下面爆开：18 到 36，拍', 'Torpedo: it swims under the floor to her target, 8 u a second, turning, through everything; it bursts up under it: 18 to 36, Crash'); } };
}
// F8 Planted staff: she drives the staff in and steps away, one paw trailing off it; it stands humming and fires alone 3 s (6 each); it hops back to her
{ const sp = [-1.8, 0.2], ds = [[0.6, -0.4, { soaked: true }], [1.7, 0.5]]; const tp = 0.3 + 0.4, t1 = tp + 3.0;
  J.F8 = { T: t1 + 1.1, cam: { x: -0.2, z: 0.2, w: 6.8 }, her: H(sp[0] - 0.3, sp[1]), dum: ds, noStaff: [[tp + 0.05, t1 + 0.35]],
    seq: [[0.3, 'castPlant', { to: 0.45 }], [tp + 0.05, 'walk', { loop: true, until: tp + 1.2, fade: 0.15 }], [tp + 1.2, 'idleHold', { loop: true, until: t1 - 0.3 }], [t1 - 0.3, 'walk', { loop: true, until: t1 + 0.2 }], [t1 + 0.2, 'castBloom', { from: 0.4, speed: 1.4 }]],
    root: [{ t: tp + 0.05 }, { t: tp + 0.25, look: [sp[0] - 0.5, 1.6] }, { t: tp + 1.2, x: sp[0] - 0.6, z: 1.35, e: 'lin' }, { t: tp + 1.5, look: [1, 0] }, { t: t1 - 0.3, look: sp }, { t: t1 + 0.2, x: sp[0] - 0.4, z: 0.6, e: 'lin' }, { t: t1 + 0.4, look: [1, 0.3] }],
    body: (t) => mixA(pawUp(t, tp, tp + 0.5, 0.5), shake(t, t1 + 0.6, 0.4, 0.4)),
    fx(A) { const top = [sp[0] + 0.1, 0.85, sp[1]];
      FX.standStaff(A, { t0: tp + 0.05, t1: t1 + 0.4, at: (t) => t < t1 ? sp : (() => { const u = EASE.s(clamp((t - t1) / 0.35)); const h = A.at('handR', t1 + 0.35); return [lerp(sp[0], h.x, u), 0, lerp(sp[1], h.z, u)]; })(), yaw: 90, hum: true, hop: (t) => t > t1 ? 0.6 * Math.sin(clamp((t - t1) / 0.35) * Math.PI) : 0 });
      FX.splash(A, { t: tp, at: [sp[0], 0, sp[1]], r: 0.4, h: 0.4 }); FX.ring(A, { t: tp, at: [sp[0], 0, sp[1]], r0: 0.2, r1: 0.8, dur: 0.4 });
      FX.stream(A, { t0: tp + 0.2, t1, from: top, to: (t) => A.dpt(t < tp + 1.8 ? 0 : 1, t, 0.6), w: 0.13 }); ticks(A, 0, tp + 0.45, tp + 1.7, 6, 0.25, { noStop: true }); ticks(A, 1, tp + 2.0, t1, 6, 0.25, { noStop: true });
      A.cap(0.3, t1 + 1.1, '杖立在地上自己射 3 秒（每次 6），算她的水流；她自由走动', 'The staff stands and fires alone 3 s (6 each); it counts as her stream; she walks free'); } };
}

// ================================================================ Wave 浪
// kit 1.2 (Kesh's mark 19 Nov): every Jet Wave form is thrown at the one foe her stream is on, or is driven by the stream itself
// F9 Bubble flail 泡锤 (Kesh's design, 20 Nov; 06:10: the bubble stays put): her stream catches the foe it hits in a bubble; she flicks the
// stream up and down, bouncing the bubbled foe high and slamming it into the floor where it stands; every slam breaks out as a ring. The third
// slam (inside the 2 s hold cap) pops the bubble. The stream never stops
{ const me = [-2.6, 0.0], c = [0.3, 0.1], ds = [[c[0], c[1]], around(c, 40, 1.2), around(c, 160, 1.3), around(c, 265, 1.1), [2.9, -2.0]]; const s0 = 0.3, tc = 0.9, T = tc + 2.9;
  const ups = [tc + 0.05, tc + 0.65, tc + 1.25], downs = ups.map((t) => t + 0.3), lands = downs.map((t) => t + 0.15), tp = lands[2];
  J.F9 = { noWarp: true, T, cam: { x: -0.2, z: 0.1, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[s0, 'stream', { loop: true, until: T, fade: 0.15 }]],
    root: [{ t: 0.2, look: c }], body: (t) => mixA(crouch(t, tc, tp, 0.5), ...ups.map((u, k) => lookUp(t, u - 0.05, downs[k] + 0.05, 14)), shiver(t, s0, T, 0.5), shake(t, tp + 0.05, 0.4, 0.5)),
    fx(A) { FX.stream(A, { t0: s0 + 0.1, t1: T, to: (t) => A.dpt(0, t, 0.6), w: 0.15 });
      // the catch: a bubble closes round the foe
      A.hit(0, tc, 12, { soak: true }); FX.bubble(A, { t0: tc, t1: tp, at: (t) => A.dpt(0, t, 0.55), r: 0.55, tall: 0.62, op: 0.8, hits: lands });
      ups.forEach((u, k) => { A.launch(0, u, 1.3); A.launch(0, downs[k], -1); });
      // each slam: a ring breaks out round it: 12 to every foe within 1.8 u, nudged 0.3 u; 6 to the foe inside
      lands.forEach((tl, k) => { FX.ringwave(A, { t: tl, at: [c[0], 0, c[1]], r0: 0.3, r1: 1.8, h: 0.5, dur: 0.4 }); FX.splash(A, { t: tl, at: [c[0], 0, c[1]], r: 0.6, h: 0.5, crash: k === 2 }); A.shake(tl, 0.05, 0.14);
        [1, 2, 3].forEach((i) => { const d = ds[i], dx = d[0] - c[0], dz = d[1] - c[1], l = Math.hypot(dx, dz); A.hit(i, tl + 0.12, 12, { knock: [dx / l * 0.3, dz / l * 0.3], kdur: 0.15, noStop: k < 2 }); });
        if (k < 2) A.hit(0, tl + 0.02, 6, { noStop: true }); });
      // the third slam pops the bubble: Crash on the soaked foe inside
      FX.drops(A, { t: tp, at: [c[0], 0.5, c[1]], n: 12, sp: 1.0, up: 0.8, size: 0.04 }); A.hit(0, tp + 0.02, 35, { crash: true });
      A.cap(0.3, tc + 0.4, '泡锤：水流打中的敌人被泡泡裹住', 'Bubble flail: the foe her stream hits is caught in a bubble');
      A.cap(tc + 0.4, T, '她把它挑高再砸下，原地三次：每下一圈浪，周围 12；第三下泡泡破：拍', 'She bounces it high and slams it down where it stands, three times: each slam rings out, 12 around it; the third pops the bubble: Crash'); } };
}
// F10 Domino: a bulge runs down the stream like an egg down a hose and bursts on its foe; smaller bulges hop on from soaked foe to soaked foe, up to 5
{ const me = [-2.7, 0], ds = [[-0.2, 0, { soaked: true }], [1.3, -1.0, { soaked: true }], [2.5, 0.3, { soaked: true }], [1.4, 1.3, { soaked: true }], [-0.5, 1.5]]; const s0 = 0.3, tp = 1.3, ta = tp + 0.3, T = 3.6;
  J.F10 = { noWarp: true, T, cam: { x: -0.1, z: 0.1, w: 7.2 }, her: H(me[0], me[1]), dum: ds, seq: [[s0, 'stream', { loop: true, until: T, fade: 0.15 }]], root: [{ t: 0.2, look: ds[0] }],
    body: (t) => mixA(pawUp(t, tp - 0.25, tp + 0.2, 0.8), shiver(t, s0, T, 0.5), tailSlap(t, tp, 0.5)),
    fx(A) { FX.stream(A, { t0: s0 + 0.1, t1: T, to: (t) => A.dpt(0, t, 0.6), w: 0.15, wid: (v, t) => 1 + 1.6 * Math.exp(-Math.pow((v - clamp((t - tp) / 0.3)) * 7, 2)) * (t > tp && t < ta + 0.05 ? 1 : 0) });
      ticks(A, 0, s0 + 0.35, tp - 0.1, 3, 0.2); ticks(A, 0, ta + 0.5, T - 0.1, 3, 0.2);
      A.hit(0, ta, 20, { crash: true, knock: [1.2, 0], kdur: 0.3 }); FX.splash(A, { t: ta, at: { d: 0, y: 0 }, r: 0.45, h: 0.6, crash: true });
      // the spent water hops on: d0 (pushed) -> d1 -> d2 -> d3; the dry foe d4 is skipped
      const chain = [0, 1, 2, 3]; let t = ta + 0.08;
      for (let k = 1; k < chain.length; k++) { const a = chain[k - 1], b = chain[k], tt = t;
        FX.bolt(A, { t: tt, from: (q) => A.dpt(a, tt, 0.5), to: (q) => A.dpt(b, tt + 0.22, 0.5), dur: 0.22, arc: 0.7, r: 0.1, splash: false });
        A.hit(b, tt + 0.22, 20, { crash: true }); FX.splash(A, { t: tt + 0.22, at: { d: b, y: 0 }, r: 0.35, h: 0.5, crash: true }); t += 0.3; }
      A.tag(4, ta, T, ['没浸湿：不跳', 'Dry: skipped'], C.pebble);
      A.cap(s0, T, '一股水冲到水流尽头：20，拍；再跳向浸湿的敌人，最多 5 个', 'A pulse runs down her stream: 20, Crash; it hops on from soaked foe to soaked foe, up to 5'); } };
}
// F11 Hundred rivers: the left paw points at the foe: each wet patch lifts a thin jet that arcs in to it, one after another, from every side
{ const me = TIDE.me, ds = [[2.5, -0.4, { elite: true }], [-0.4, -0.8, { soaked: true }]]; const s0 = 0.3, tc = 1.3, tj = tc + 0.35, T = 3.8;
  J.F11 = { noWarp: true, T, cam: { x: 0.0, z: 0.2, w: 7.6 }, her: H(me[0], me[1]), dum: ds, seq: [[s0, 'stream', { loop: true, until: T, fade: 0.15 }]], root: [{ t: 0.2, look: ds[0] }],
    body: (t) => mixA(pawUp(t, tc - 0.2, tj + 0.7, 0.9), shiver(t, s0, T, 0.5)),
    fx(A) { layWater(A, 0.05, T); FX.stream(A, { t0: s0 + 0.1, t1: T, to: (t) => A.dpt(0, t, 0.75), w: 0.15 }); ticks(A, 0, s0 + 0.35, T - 0.1, 3, 0.2);
      const src = [...tidePts().slice(0, 3), [me[0] + 0.5, me[1] + 0.5], [me[0] + 0.4, me[1] - 0.5]];
      src.forEach((p, k) => { const t1 = tj + k * 0.13; FX.splash(A, { t: t1 - 0.05, at: [p[0], 0, p[1]], r: 0.28, h: 0.35 });
        blade(A, { t0: t1, t1: t1 + 0.4, from: [p[0], 0.05, p[1]], to: (t) => A.dpt(0, t, 0.75), head: 0.18, tail: 0.2, w: 0.1, bend: (v) => new A.THREE.Vector3(0, 0.9 * Math.sin(v * Math.PI), 0) });
        A.hit(0, t1 + 0.2, 8, { crash: k === 0, noStop: true }); });
      A.cap(s0, T, '每片水各射一道水，打水流下的敌人：各 8，最多 6 道；第一道拍', 'Each piece of her water fires a jet at her stream\'s foe: 8 each, up to 6; the first is a Crash'); } };
}
// F12 Roll call: she stirs the staff's tip once and the pool opens; where her stream touches a foe a small whirl opens under its feet, it drops through with its arms up, and bobs up in the pool
{ const me = [-2.6, 0.1], c = [0.4, 0.0], ds = [[-0.6, -1.0], [1.7, -0.9, { soaked: true }], [1.4, 1.2], around(c, 200, 0.9)]; const tp = 0.3 + 0.4, s0 = 1.0, T = 4.4; const tg = [1.45, 2.25, 3.05], tgt = [0, 1, 2];
  const ends = [around(c, 120, 0.3), around(c, 0, 0.32), around(c, 240, 0.3)];
  tgt.forEach((i, k) => { const o = ds[i][2] || (ds[i][2] = {}); o.gone = [[tg[k] + 0.12, tg[k] + 0.42]]; });
  const look = (t) => { let k = tg.findIndex((x) => t < x + 0.25); if (k < 0) k = 2; return k; };
  J.F12 = { noWarp: true, T, cam: { x: -0.2, z: 0.1, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant', { speed: 1.2 }], [s0, 'stream', { loop: true, until: T, fade: 0.15 }]],
    root: [{ t: 0.3, look: c }, { t: tg[0] - 0.3, look: ds[0] }, { t: tg[1] - 0.3, look: ds[1], e: 'io2' }, { t: tg[2] - 0.3, look: ds[2], e: 'io2' }, { t: T, look: ds[2] }],
    body: (t) => mixA(tailSlap(t, tp, 0.5), shiver(t, s0, T, 0.5)),
    fx(A) { FX.pool(A, { t0: tp, t1: T, at: [c[0], 0, c[1]], r: 1.3, whirl: 1, op: 0.6 });
      FX.stream(A, { t0: s0 + 0.1, t1: T, to: (t) => { const i = tgt[look(t)], p = A.dpos(i, t), r = A.rootAt(t); const L = Math.hypot(p.x - r.x, p.z - r.z); return A.ahead(t, L, 0.6); }, w: 0.14 });
      tgt.forEach((i, k) => { const t0 = tg[k]; A.hit(i, t0, 3, { noStop: true }); FX.pool(A, { t0: t0 - 0.05, t1: t0 + 0.4, at: [ds[i][0], 0, ds[i][1]], r: 0.45, whirl: 2.5, op: 0.75, fin: 0.05 });
        FX.splash(A, { t: t0 + 0.12, at: [ds[i][0], 0, ds[i][1]], r: 0.3, h: 0.4 }); A.moveTo(i, t0 + 0.2, ends[k], 0.05, 'lin'); FX.splash(A, { t: t0 + 0.42, at: [ends[k][0], 0, ends[k][1]], r: 0.35, h: 0.5 });
        A.status(i, t0 + 0.45, 'slow', T - t0 - 0.5); A.hit(i, t0 + 0.6, 4, { noStop: true, soak: true }); A.hit(i, t0 + 1.6, 4, { noStop: true }); });
      A.status(3, tp + 0.2, 'slow', T - tp - 0.3); for (let k = 0; k < 3; k++) A.hit(3, tp + 0.4 + k, 4, { noStop: true, soak: k === 0 });
      A.cap(0.3, T, '漩涡不拖人；水流碰到的敌人被吸下去，0.3 秒后从漩涡中心冒出来', 'No drag: each foe her stream touches is sucked down and comes up in the pool 0.3 s later'); } };
}
// F13 Chase fall: the waterfall follows her stream: it pours on the foe she is hitting and slides with the stream to the next; press again: it drops there, Crash 16
{ const me = [-2.6, 0.1], ds = [[-0.1, -0.6], [1.5, 0.7, { soaked: true }], [2.8, -0.9]]; const tp = 0.8, ts = 2.0, tm = 2.45, tf = 3.3, T = tf + 1.1;
  const pt = (t) => { const u = EASE.s(clamp((t - ts) / (tm - ts))); return [lerp(ds[0][0], ds[1][0], u), lerp(ds[0][1], ds[1][1], u)]; };
  J.F13 = { T, cam: { x: 0.0, z: 0.0, w: 7.2 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom', { speed: 1.2, to: 0.7 }], [tp - 0.1, 'stream', { loop: true, until: tf + 0.15, fade: 0.15 }]],
    root: [{ t: 0.2, look: ds[0] }, { t: ts, look: ds[0] }, { t: tm, look: ds[1] }], body: (t) => mixA(crouch(t, tp, tf, 0.5), shake(t, tf + 0.5, 0.5, 0.6)),
    fx(A) { FX.waterfall(A, { t0: tp - 0.1, t1: tf + 0.35, cut: tf, at: (t) => { const p = pt(t); return [p[0], 0, p[1]]; }, follow: true, round: true, w: 1.5, top: 2.6, op: 0.8, rise: 0.35 });
      FX.stream(A, { t0: tp, t1: tf, to: (t) => { const p = pt(t); return [p[0], 0.55, p[1]]; }, w: 0.15 });
      A.hit(0, tp + 0.3, null, { soak: true, slow: tm - tp }); A.hit(1, tm, null, { slow: tf - tm });
      for (let t = tp + 0.2; t < ts; t += 0.2) A.hit(0, t, 3, { noStop: true }); for (let t = tm; t < tf; t += 0.2) A.hit(1, t, 3, { noStop: true });
      FX.splash(A, { t: tf + 0.3, at: [ds[1][0], 0, ds[1][1]], r: 1.0, h: 0.9, crash: true }); FX.ring(A, { t: tf + 0.3, at: [ds[1][0], 0.02, ds[1][1]], r0: 0.3, r1: 1.5, dur: 0.4, col: C.foam, op: 0.7, w: 0.16 });
      A.hit(1, tf + 0.32, 26, { crash: true }); A.shake(tf + 0.3, 0.06, 0.2);
      A.cap(0.3, tf - 0.1, '追落：瀑布跟着她的水流，落在她正在打的敌人身上', 'Chase fall: the waterfall follows her stream onto the foe she is hitting');
      A.cap(tf - 0.1, T, '再按：在那里砸下，拍 16', 'Press again: it drops there: Crash 16'); } };
}
// F14 Water rocket: the staff points backward, a blast, and she is a streak on her belly: 6 u through every foe, untouchable: 18; once more within 1.5 s
{ const me = [-2.8, 0.3], ds = [[-1.2, 0.35], [0.4, 0.25, { soaked: true }], [1.7, 0.4]]; const t0 = 0.45, ta = t0 + 0.32, tb = 1.9, tc = tb + 0.32;
  J.F14 = { T: 3.6, cam: { x: 0.0, z: 0.2, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.25, 'castPlant', { to: 0.3, speed: 2 }], [t0, 'belly', { loop: true, until: tc + 0.3, fade: 0.08 }], [tc + 0.3, 'castPlant', { from: 0.6 }]],
    root: [{ t: t0, y: 0 }, { t: t0 + 0.05, y: 0.15 }, { t: ta, fw: 5.5, y: 0.15, e: 'out' }, { t: tb - 0.25, spin: 180, e: 'io2' }, { t: tb, y: 0.15 }, { t: tc, fw: 0.4 + 5.5 - 6, e: 'out' }, { t: tc + 0.3, y: 0, e: 'out' }],
    hide: [], body: (t) => shake(t, tc + 0.6, 0.6, 0.7),
    fx(A) { for (const [s, e] of [[t0, ta], [tb, tc]]) { FX.jet(A, { t: s, from: 'tip', to: (t) => A.ahead(t, -1.6, 0.25), dur: 0.06, hold: e - s, w: 0.2, tail: 0.12 }); FX.wake(A, { of: (t) => { const r = A.rootAt(t); return [r.x, 0, r.z]; }, t0: s, t1: e, w: 0.25, op: 0.6, life: 1.0, foam: true }); FX.ring(A, { t: s, at: 'tip', r0: 0.1, r1: 0.6, dur: 0.25, dir: (t) => A.fwd(s), col: WHITE, op: 0.8, w: 0.2 }); }
      A.ghost((t) => ((t > t0 && t < ta) || (t > tb && t < tc)) ? [{ lag: 0.03, op: 0.3, glow: 0.4 }, { lag: 0.06, op: 0.18, glow: 0.4 }, { lag: 0.1, op: 0.1, glow: 0.4 }] : []);
      const hx = (x, s, e, x0, x1) => s + (e - s) * clamp((x - x0) / (x1 - x0)) * 0.6;
      ds.forEach((d, i) => { A.hit(i, hx(d[0], t0, ta, me[0], me[0] + 5.5), d[2] ? 18 : 18, { wet: !!d[2], soak: true, knock: [0, d[1] > 0.3 ? 0.4 : -0.4], kdur: 0.2 }); A.hit(i, hx(-d[0], tb, tc, -(me[0] + 5.5), -(me[0] - 0.1)), 18, { knock: [0, d[1] > 0.3 ? -0.3 : 0.3], kdur: 0.2 }); });
      // she rides inside a bubble: the foes she passes are struck by the bubble, which rings at each hit and pops when she stops
      const hts = []; ds.forEach((d) => { hts.push(hx(d[0], t0, ta, me[0], me[0] + 5.5), hx(-d[0], tb, tc, -(me[0] + 5.5), -(me[0] - 0.1))); });
      for (const [s, e] of [[t0, ta], [tb, tc]]) FX.bubble(A, { t0: s - 0.02, t1: e + 0.05, at: (t) => A.ahead(t, 0.12, 0.2), r: 0.6, tall: 0.62, op: 0.75, hits: hts });
      foeBolt(A, { t: t0 - 0.1, d: 2, dur: 0.5, to: [me[0] + 2, 0.7, me[1]] });
      A.cap(0.25, 3.6, '水箭：6 u 穿透所有敌人，无敌：18；1.5 秒内可再来一次', 'She shoots 6 u through every foe, untouchable: 18; once more within 1.5 s'); } };
}
// F15 Meeting point: two jets cross; the crossing flashes: 12 each; a foe at the crossing takes 36. No stun
{ const me = [-2.2, 0.2], c = [0.7, 0.1], ds = [[c[0], c[1], { soaked: true }], [-0.2, -0.85], [1.6, 1.0]]; const tp = 0.3 + 0.4, tm = tp + 0.18;
  const A0 = [c[0] - 1.6, -1.55], A1 = [c[0] - 1.6, 1.75];
  J.F15 = { T: 2.8, cam: { x: -0.3, z: 0.1, w: 6.2 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant', { speed: 0.9 }]], body: (t) => mixA(tailSlap(t, tm, 0.6), shake(t, 1.8, 0.6, 0.5)),
    fx(A) { for (const a of [A0, A1]) { const far = [c[0] + (c[0] - a[0]) * 0.8, 0.5, c[1] + (c[1] - a[1]) * 0.8]; FX.splash(A, { t: tp - 0.1, at: [a[0], 0, a[1]], r: 0.3, h: 0.4, n: 5 }); blade(A, { t0: tp, t1: tp + 0.5, from: [a[0], 0.15, a[1]], to: far, head: 0.18, tail: 0.2, w: 0.09 }); }
      FX.spark(A, { t: tm, at: [c[0], 0.55, c[1]], r: 0.9, col: WHITE, op: 0.9 }); FX.ring(A, { t: tm, at: [c[0], 0.55, c[1]], r0: 0.1, r1: 0.7, dur: 0.3, dir: [0, 1, 0], col: WHITE, op: 0.8, w: 0.18 });
      A.hit(0, tm + 0.02, 36, { crash: true, big: true }); A.hit(1, tp + 0.1, 12); A.hit(2, tp + 0.16, 12); A.shake(tm, 0.05, 0.16);
      A.cap(0.3, 2.8, '两道水线交叉：各 12；交叉点的敌人受 36，不眩晕', 'Two jets cross: 12 each; a foe at the crossing takes 36. No stun'); } };
}
// F16 Funnel: the spiral closes to a point under one foe and a single needle of water goes up through it: 40, and 10 more for each foe drawn in
{ const me = [-1.6, 0.2], tg = [0.8, 0.1], ds = [[tg[0], tg[1], { soaked: true, big: true }], around(tg, 40, 2.0), around(tg, 160, 1.5), around(tg, 260, 1.7)]; const t0 = 0.3, ts = 1.3, tb = 1.75;
  J.F16 = { T: 3.8, cam: { x: -0.2, z: 0.1, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'castSweep', { to: 0.5 }], [0.65, 'level', { loop: true, until: ts }], [ts, 'castBloom', { from: 0.3, to: 0.62 }], [tb, 'castPoint', { from: 0.35 }]],
    root: [{ t: 0.5 }, { t: ts, spin: 720, e: 'in2' }, { t: ts + 0.1, spin: 720, look: tg, e: 'out' }], body: (t) => mixA(coil(t, 0.4, ts, 0.6), tailSlap(t, tb, 1), shake(t, 2.8, 0.8, 1)),
    fx(A) { FX.pool(A, { t0: 0.45, t1: tb + 0.15, at: [tg[0], 0, tg[1]], r: (t) => lerp(2.4, 0.25, clamp((t - 0.45) / 1.3)), whirl: 1.8, op: 0.55 });
      [1, 2, 3].forEach((i) => { const a = [40, 160, 260][i - 1]; A.moveTo(i, 0.55, around(tg, a + 80, 0.8), 1.0, 'in2'); A.turn(i, 0.55, 260, 1.0); });
      FX.column(A, { t: tb, at: [tg[0], 0, tg[1]], h: 3.2, r: 0.07, dur: 0.5, rise: 0.06, fall: true }); FX.spark(A, { t: tb, at: { d: 0, y: 0.8 }, r: 0.7, col: WHITE, op: 0.8 });
      A.hit(0, tb + 0.02, 112, { crash: true, up: 0.6 }); [1, 2, 3].forEach((i, k) => A.say(1.4 + k * 0.08, { zh: '+10', en: '+10' }, { col: C.sky })); A.shake(tb, 0.08, 0.25); A.dark(ts - 0.1, tb + 0.1, 0.3, 0.1, 0.2);
      A.cap(t0, 3.8, '大招：全部爆发集中于一个敌人：40，每拉进一个再 +10', 'Big skill: the whole burst goes into one foe: 40, and 10 more for each foe drawn in'); } };
}

// ================================================================ Spring 泉
// F17 Water double: the base steps and her stream never pauses; each hop leaves a clear water otter where she was, in her last pose, staff out, pouring a thin stream at the same foe (half damage); they wobble like jelly and fall as a splash after 3 s
{ const me = [-0.5, -1.4], dir = [-0.35, 0.94], ds = [[2.1, 0.6, { elite: true }]]; const s0 = 0.3, st = [0.75, 1.35, 1.95], hop = 0.3, T = st[2] + 3.4;
  const P = [0, 1, 2, 3].map((k) => [me[0] + dir[0] * 1.6 * k, me[1] + dir[1] * 1.6 * k]);
  J.F17 = { noWarp: true, T, cam: { x: -0.2, z: 1.0, w: 8.2 }, her: H(me[0], me[1]), dum: ds, seq: [[s0, 'stream', { loop: true, until: T, fade: 0.15 }]],
    root: (() => { const R = [{ t: 0.1, look: ds[0] }]; st.forEach((t, k) => { R.push({ t, x: P[k][0], z: P[k][1], look: ds[0] }); R.push({ t: t + hop, x: P[k + 1][0], z: P[k + 1][1], jump: 0.4, look: ds[0], e: 'lin' }); }); R.push({ t: T, x: P[3][0], z: P[3][1], look: ds[0] }); return R; })(),
    body: (t) => mixA(shiver(t, s0, T, 0.5), ...st.map((s) => crouch(t, s - 0.08, s + 0.05, 0.6)), ...st.map((s) => crouch(t, s + hop - 0.02, s + hop + 0.12, 0.5))),
    fx(A) { FX.stream(A, { t0: s0 + 0.1, t1: T, to: (t) => A.dpt(0, t, 0.7), w: 0.15 }); ticks(A, 0, s0 + 0.35, T - 0.1, 3, 0.2);
      // the copies: her pose at each step, left standing where she was
      A.ghost((t) => st.filter((s) => t >= s && t < s + 3).map((s) => ({ at: s - 0.02, op: 0.42, glow: 0.6, shadow: true })));
      st.forEach((s, k) => { const tip = A.at('tip', s - 0.02); FX.stream(A, { t0: s + 0.05, t1: Math.min(s + 3, T), from: [tip.x, tip.y, tip.z], to: (t) => A.dpt(0, t, 0.7), w: 0.07, op: 0.6 });
        ticks(A, 0, s + 0.3 + k * 0.07, Math.min(s + 3, T) - 0.05, 1.5, 0.4, { col: C.sky });
        FX.ring(A, { t: s + hop, at: [P[k + 1][0], 0.03, P[k + 1][1]], r0: 0.2, r1: 1.5, dur: 0.45, col: C.foam, op: 0.7, w: 0.1 }); FX.puddle(A, { t0: s + hop, t1: s + hop + 3, at: [P[k + 1][0], 0, P[k + 1][1]], r: 0.8 });
        if (s + 3 < T) FX.splash(A, { t: s + 3, at: [P[k][0], 0, P[k][1]], r: 0.45, h: 0.6 }); });
      A.cap(s0, T, '三步，水流不停；每个起步处留下一个水影 3 秒，向同一个敌人射细水流，伤害一半', 'Three steps, the stream never stops; each spot she leaves keeps a water copy 3 s, streaming at the same foe for half'); } };
}
// F18 Answer: each hit on the bubble is answered by a thin jet at the attacker: 8
{ const me = [-2.2, 0.4], al = [-0.4, 0.0], ds = [[1.0, -0.9], [1.6, 0.8]]; const tc = 0.3 + 0.38;
  J.F18 = { T: 3.8, cam: { x: -0.2, z: 0.0, w: 6.2 }, her: H(me[0], me[1]), dum: [[al[0], al[1], { ally: true, face: 90 }], ...ds], seq: [[0.3, 'castBloom', { speed: 1.2 }]], root: [{ t: 0.3, look: al }],
    body: (t) => pawUp(t, 0.45, 1.0, 0.7),
    fx(A) { FX.pointer(A, { t0: 0, t1: tc + 0.2, at: [al[0], 0, al[1]] }); FX.bolt(A, { t: tc, to: (t) => A.dpt(0, t, 0.62), dur: 0.35, r: 0.08, col: C.bubble, splash: false });
      const hits = [1.5, 2.1, 2.7]; shieldOn(A, 0, tc + 0.35, 3.2, (t) => t < 1.5 ? 14 : t < 2.1 ? 10 : t < 2.7 ? 6 : 2, { hits });
      hits.forEach((h, k) => { const i = 1 + (k % 2); foeBolt(A, { t: h - 0.4, d: i, dur: 0.4, to: (t) => A.dpt(0, h, 0.7) }); blade(A, { t0: h + 0.06, t1: h + 0.2, from: (t) => A.dpt(0, h, 0.7), to: (t) => A.dpt(i, t, 0.65), head: 0.1, tail: 0.1, w: 0.05 }); A.hit(i, h + 0.16, 8, { soak: k === 0 }); });
      A.cap(0.3, 3.8, '泡泡每挨一下，就向攻击者回射一道水：8', 'Each hit on the bubble is answered by a jet at the attacker: 8'); } };
}
// F19 Hanging rain: she flicks the staff up: rain as the base, 6 s; every second three drops stop dead high in the rain and hang, glinting; a second later they stretch into needles and streak into the foe her stream is on (stream off: the foe with the least health within 8 u): 2 each, soaked 8 s
{ const me = [-2.5, -0.4], ds = [[1.8, -1.0], [-0.5, 0.9], [0.5, 1.3]]; const RC = [0.0, 1.05], RR = 1.3; const s0 = 0.3, tc = 0.8, tr = tc + 0.25, te = tr + 6, sOff = tr + 3.9, T = te + 1.0; const HR = 2.2;
  const vol = [0, 1, 2, 3, 4, 5].map((k) => { const h = tr + 0.4 + k * 0.92; return { h, f: h + 1 }; });
  J.F19 = { noWarp: true, T, cam: { x: -0.2, z: 0.2, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[s0, 'stream', { loop: true, until: sOff, fade: 0.15 }]], root: [{ t: 0.2, look: ds[0] }, { t: sOff + 0.2, look: ds[0] }, { t: sOff + 0.7, look: ds[2] }],
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
      A.cap(sOff, T, '不喷水时：射向 8 u 内血最少的敌人；共 36', 'Stream off: they hit the foe with the least health within 8 u; 36 in all'); } };
}
// F20 High ground: she taps the floor between her feet and rides the column up standing, tail wrapped round it; 3 s she streams over every head; melee cannot reach her
{ const me = [-0.8, 0.2], ds = [[0.4, -0.2, { soaked: true }], [-0.15, 0.85], [1.8, 0.6]]; const tp = 0.3 + 0.4, tu = tp + 0.35, t1 = tu + 3.0;
  J.F20 = { T: t1 + 0.9, cam: { x: -0.3, z: 0.0, w: 6.0, y: 0.9 }, her: H(me[0], me[1]), dum: ds, seq: [[0.15, 'castPlant', { to: 0.42, speed: 1.8 }], [0.4, 'castPlant', { from: 0.2, to: 0.55 }], [tu, 'stream', { loop: true, until: t1, fade: 0.15 }], [t1 + 0.1, 'castPlant', { from: 0.6 }]],
    root: [{ t: tp, y: 0 }, { t: tu, y: 1.35, e: 'out' }, { t: tu + 0.3, look: ds[0] }, { t: tu + 1.6, look: ds[0] }, { t: tu + 2.0, look: ds[2], e: 'io2' }, { t: t1, y: 1.35 }, { t: t1 + 0.4, y: 0, e: 'in2' }],
    body: (t) => mixA(coil(t, tp, t1, 0.35), shiver(t, tu, t1, 0.6), shake(t, t1 + 0.5, 0.5, 0.6)),
    fx(A) { FX.column(A, { t: tp, at: [me[0], 0, me[1]], h: (t) => Math.max(0.1, A.rootAt(t).y + 0.05), r: 0.3, dur: t1 - tp + 0.35, rise: 0.35, fall: true });
      streamOn(A, tu + 0.15, tu + 1.6, 0, { w: 0.14 }); streamOn(A, tu + 2.0, t1, 2, { w: 0.14 });
      A.moveTo(1, tu, [me[0] + 0.35, me[1] + 0.45], 0.6, 'lin'); A.turn(1, tu, 120, 0.3); [1.9, 2.6, 3.3].forEach((t) => { A.turn(1, t - 0.1, 30, 0.1); A.turn(1, t + 0.05, -30, 0.15); A.say(t, { zh: '够不着', en: 'Out of reach' }, { col: C.parch }); });
      A.cap(0.15, t1 + 0.9, '水柱托她 3 秒：越过所有人头顶射水；近战够不着', 'It lifts her 3 s: she streams over every head; melee cannot reach her'); } };
}
// F21 Pressure cell: her stream pumps the bubble up: it swells and whitens, the foe pressed flat to its skin; its pop grows to 48, 2 u wide
{ const me = [-2.2, 0.2], d0 = [0.3, 0.2], ds = [[d0[0], d0[1], { soaked: true }], [1.4, -0.6], [1.0, 1.1]]; const tc = 0.3 + 0.6, ts = tc + 0.6, tp = ts + 1.6;
  J.F21 = { T: tp + 1.0, cam: { x: -0.5, z: 0.1, w: 6.2, y: 0.7 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom'], [ts, 'stream', { loop: true, until: tp - 0.1, fade: 0.12 }]],
    body: (t) => mixA(pawUp(t, 0.4, 1.0, 0.6), shiver(t, ts, tp, 0.8), shake(t, tp + 0.4, 0.5, 0.6)),
    fx(A) { const g = (t) => clamp((t - ts) / 1.5); const bAt = (t) => t < ts ? (() => { const s = A.at('tip', tc), u = EASE.s(clamp((t - tc) / 0.6)); const q = A.dpt(0, ts, 0.6); return [lerp(s.x, q.x, u), lerp(s.y, q.y, u) + 0.2 * Math.sin(u * Math.PI), lerp(s.z, q.z, u)]; })() : A.dpt(0, t, 0.6).toArray();
      A.hold(0, ts, tp, 0.7); FX.bubble(A, { t0: tc, t1: tp, at: bAt, r: (t) => t < ts ? 0.25 : 0.65 + 0.35 * g(t), hits: [ts, ts + 0.5, ts + 1.0], col: C.bubble, op: 0.75, dark: (t) => t > ts ? -0.2 * g(t) : 0 });
      FX.stream(A, { t0: ts + 0.1, t1: tp - 0.1, to: (t) => A.dpt(0, t, 0.9), w: 0.13 });
      A.hud(gaugeHud('水压', 'Pressure', (t) => t < ts ? null : t < tp ? 12 / 48 + (36 / 48) * g(t) : null, { full: true, col: C.foam })); A.tag(0, ts + 0.1, tp, (t, lang) => (lang === 'zh' ? '爆 ' : 'Pop ') + Math.round(12 + 36 * g(t)), C.foam);
      FX.splash(A, { t: tp, at: [d0[0], 0, d0[1]], r: 1.0, h: 1.0, crash: true }); FX.ringwave(A, { t: tp, at: [d0[0], 0, d0[1]], r0: 0.3, r1: 2.0, h: 0.4, dur: 0.4 });
      A.hit(0, tp, 77, { crash: true }); A.hit(1, tp + 0.05, 48, { soak: true }); A.hit(2, tp + 0.06, 48, { soak: true }); A.shake(tp, 0.08, 0.25);
      A.cap(0.3, tp, '她的水流往泡泡里打气', 'Her stream pumps the bubble up'); A.cap(tp, tp + 1.0, '爆开变成 48，2 u 宽', 'Its pop grows to 48, 2 u wide'); } };
}
// F22 Flank: she breaches behind the foe with a half twist; it keeps swinging at the ripple where she was; it does not turn for 2 s
{ const me = [-2.2, 0.3], d0 = [0.4, 0.2]; const t0 = 0.3, tin = t0 + 0.4, tout = tin + 0.9;
  J.F22 = { T: 3.8, cam: { x: -0.6, z: 0.1, w: 6.0, y: 0.6 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1], { face: 180 }]], seq: [[t0, 'tuckAir', { loop: true, until: tout + 0.5, fade: 0.15 }], [tout + 0.5, 'castPoint', { from: 0.25, speed: 1.2 }], [tout + 1.3, 'castPoint', { from: 0.25, speed: 1.2 }]],
    root: [{ t: t0 }, { t: tin, fw: 0.9, y: -0.4, jump: 0.6, pitch: 120, e: 'lin' }, { t: tout - 0.01, x: d0[0] + 0.9, z: d0[1], y: -0.6, pitch: 120, cut: true }, { t: tout, x: d0[0] + 0.9, z: d0[1], y: -0.6, pitch: -60, spin: 180, cut: true }, { t: tout + 0.3, x: d0[0] + 1.0, z: d0[1], y: 0.9, pitch: -300, e: 'out' }, { t: tout + 0.55, x: d0[0] + 1.1, z: d0[1], y: 0, pitch: -360, look: d0, e: 'in' }],
    hide: [[tin, tout]], body: (t) => shake(t, 3.3, 0.4, 0.6),
    fx(A) { FX.splash(A, { t: tin, at: (t) => A.ahead(tin - 0.05, 0.3, 0), r: 0.45, h: 0.5 });
      for (let k = 0; k < 6; k++) { const tk = tin + 0.05 + k * 0.13; FX.ring(A, { t: tk, at: [lerp(me[0] + 1.2, d0[0] + 0.9, k / 5), 0.02, d0[1] + 0.35 * Math.sin(k)], r0: 0.15, r1: 0.6, dur: 0.6, col: C.foam, op: 0.5, w: 0.15 }); }
      FX.column(A, { t: tout, at: [d0[0] + 0.9, 0, d0[1]], h: 1.3, r: 0.3, dur: 0.5, fall: true });
      // the foe keeps swinging at the ripple where she went in
      [1.3, 1.9, 2.5, 3.1].forEach((t) => { A.turn(0, t - 0.08, 25, 0.08); A.turn(0, t + 0.06, -25, 0.12); }); A.tag(0, tout, tout + 2.0, ['不转身', "Can't turn"], C.parch);
      A.hit(0, tout + 0.05, 14, { soak: true, up: 0.6 }); const b1 = tout + 0.5 + 0.44 / 1.2 - 0.2, b2 = tout + 1.3 + 0.44 / 1.2 - 0.2;
      FX.bolt(A, { t: b1, to: (t) => A.dpt(0, t, 0.6), dur: 0.15 }); A.hit(0, b1 + 0.15, 14); FX.bolt(A, { t: b2, to: (t) => A.dpt(0, t, 0.6), dur: 0.15 }); A.hit(0, b2 + 0.15, 14);
      A.cap(t0, 3.8, '从敌人背后钻出；它 2 秒不能转身', 'She comes up behind a foe; it does not turn for 2 s'); } };
}
// F23 Relay: her stream, aimed at the friend, curls once round the friend's weapon and leaves along it; the friend does not flinch
{ const me = [-2.4, 0.6], al = [-0.6, 0.0], ds = [[1.3, -0.5, { soaked: true }], [2.2, -0.9]]; const s0 = 0.45, s1 = 3.6;
  J.F23 = { T: 4.1, cam: { x: -0.1, z: 0.0, w: 6.6 }, her: H(me[0], me[1]), dum: [[al[0], al[1], { ally: true, face: -20 }], ...ds], seq: [[s0, 'stream', { loop: true, until: s1, fade: 0.15 }]], root: [{ t: 0.3, look: al }],
    body: (t) => mixA(shiver(t, s0, s1, 0.6), shake(t, s1 + 0.1, 0.4, 0.4)),
    fx(A) { FX.stream(A, { t0: s0 + 0.1, t1: s1, to: (t) => A.dpt(0, t, 0.7), w: 0.14 });
      FX.ring(A, { t: s0 + 0.3, at: { d: 0, y: 0.7 }, r0: 0.28, r1: 0.32, dur: s1 - s0, dir: [0.3, 1, 0], col: C.cobalt, op: 0.75, w: 0.35, e: 'lin' });
      FX.stream(A, { t0: s0 + 0.35, t1: s1 + 0.05, from: (t) => A.dpt(0, t, 0.7), to: (t) => A.dpt(t < 2.2 ? 1 : 2, t, 0.6), w: 0.13 });
      ticks(A, 1, s0 + 0.6, 2.1, 3, 0.2); ticks(A, 2, 2.4, s1, 3, 0.2);
      A.cap(s0, 4.1, '水流射向队友，从队友的武器上接力射出', "Her stream, aimed at the friend, shoots on from the friend's weapon"); } };
}
// F24 Duel: the dome snaps shut round the two of them; others cannot enter or shoot in; small foes press their faces to the skin from outside
{ const me = [-0.9, 0.1], d0 = [0.4, 0.1], ds = [[d0[0], d0[1], { soaked: true, face: 180 }], [2.3, -0.7, { face: 160 }], [1.9, 1.2, { face: 200 }]]; const t0 = 0.3, tu = t0 + 0.9, s0 = 1.6, s1 = 4.4;
  J.F24 = { T: 5.0, cam: { x: 0.1, z: 0.1, w: 6.6 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'whip', { to: 0.4 }], [0.6, 'castBloom', { from: 0.3 }], [s0, 'stream', { loop: true, until: s1, fade: 0.15 }]],
    root: [{ t: 0.3, look: d0 }],
    body: (t) => mixA(coil(t, 0.3, 0.75, 0.8), lookUp(t, 0.9, 1.4, 20), shiver(t, s0, s1, 0.6)),
    fx(A) { const c = [(me[0] + d0[0]) / 2, 0, 0.1]; FX.dome(A, { t0: tu, t1: s1 + 0.4, at: c, r: 1.25, flat: 0.8, op: 0.5, grow: 0.25, hits: [2.2, 3.0, 3.4] });
      streamOn(A, s0 + 0.1, s1, 0, { w: 0.14 });
      foeBolt(A, { t: 2.0, d: 1, dur: 0.4, to: [c[0] + 1.15, 0.7, -0.3], stop: 0.2 * 2 }); FX.splash(A, { t: 2.2, at: [c[0] + 1.15, 0.3, -0.3], r: 0.25, h: 0.35, n: 4 });
      A.moveTo(2, 2.5, [c[0] + 1.25, 0.75], 0.5, 'lin'); A.moveTo(2, 3.0, [c[0] + 1.6, 1.0], 0.25, 'out'); A.tag(2, 3.0, 3.7, ['进不去', 'Shut out'], C.parch);
      A.moveTo(1, 3.2, [c[0] + 1.35, -0.4], 0.3, 'lin'); A.tag(1, 3.4, 4.2, ['进不去', 'Shut out'], C.parch);
      A.cap(t0, 5.0, '大招：水穹罩住她和一个敌人：别人进不来也射不进', 'Big skill: the dome closes round her and one foe: others cannot enter or shoot in'); } };
}
