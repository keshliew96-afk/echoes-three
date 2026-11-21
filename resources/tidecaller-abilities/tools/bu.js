// Bubble 泡沫 forms: round, slow, wobbling; one Sea Foam rim light; soft plinks and one clean pop. Bubbles guard friends, lift foes, pop
// Bubble Blower (her tier I talent) is on: a foe afloat takes 20% more; every pop deals 6 (a foe once a second)
import { FX, C, EASE, clamp, lerp } from './tc.js';
import { H, FORMS, D2R, around, fan, gaugeHud, foeBolt, ticks, shieldOn, block, slamFx, streamOn, tailSlap, shake, coil, leanBack, crouch, turnTrunk, lookUp, shiver, tuck, pawUp, mixA } from './defs.js';
import { TIDE, layWater, tidePts } from './defs.js';
const B = FORMS.bu;
// a bubble that leaves a point and settles on a dummy (a hat), with a soft bob on the way
const flyTo = (A, t0, dur, from, i, o = {}) => { const s = typeof from === 'string' ? (t) => A.at(from, t0) : (t) => new A.THREE.Vector3(...from); FX.bubble(A, { t0, t1: t0 + dur, pop: false, r: o.r || 0.16, at: (t) => { const a = s(t), b = A.dpt(i, t0 + dur, 0.62), u = EASE.s(clamp((t - t0) / dur)); return [lerp(a.x, b.x, u), lerp(a.y, b.y, u) + 0.35 * Math.sin(u * Math.PI), lerp(a.z, b.z, u)]; } }); };
// the foe's wind-up mark (Foe Crimson ring growing on the floor) and its break
const windup = (A, i, t0, t1, brk) => { FX.ring(A, { t: t0, at: { d: i, y: 0 }, r0: 0.2, r1: 0.75, dur: t1 - t0, col: '#B8141F', op: 0.8, w: 0.12, e: 'lin' }); if (brk) { FX.spark(A, { t: t1, at: { d: i, y: 0.3 }, r: 0.5, col: C.foam, op: 0.6 }); A.tag(i, t1, t1 + 0.9, ['打断', 'Broken'], C.foam); } };

// P (kit 2.1, as kit 1.9's Bubble line): a Crash leaves an 8 bubble, 4 s, on the friend nearest the crashed foe
{ const me = [-2.0, 0.2], d0 = [0.9, 0.1], al = [0.1, 0.9]; const tc = 0.3 + 0.44, T = 3.6;
  B.P = { T, cam: { x: -0.2, z: 0.2, w: 6.2 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1], { soaked: true }], [al[0], al[1], { ally: true, face: 60 }], [1.5, 1.0]], seq: [[0.3, 'castPoint']], body: (t) => mixA(tailSlap(t, tc + 0.02, 0.8), shake(t, 1.9, 0.6, 0.6)),
    fx(A) { FX.jet(A, { t: tc - 0.04, to: (t) => A.dpt(0, tc, 0.62).add(new A.THREE.Vector3(0.9, 0, 0)), dur: 0.12, hold: 0.18, w: 0.22 }); A.hit(0, tc + 0.1, 29, { crash: true });
      FX.bolt(A, { t: tc + 0.14, from: [d0[0], 0.8, d0[1]], to: (t) => A.dpt(1, t, 0.62), dur: 0.3, r: 0.07, col: C.bubble, splash: false });
      shieldOn(A, 1, tc + 0.44, T, 8); foeBolt(A, { t: 2.1, d: 2, dur: 0.35, to: (t) => A.dpt(1, 2.45, 0.7) });
      A.cap(0.3, T, '泡沫：拍会给最近的队友一个 8 的泡泡，4 秒', 'Bubble: a Crash leaves an 8 bubble, 4 s, on the nearest friend'); } };
}
// B: the stream carries a string of bubbles: 2 s of stream floats a small foe 1 s; the tsunami is a roll of foam and leaves a 10 bubble on each friend it passes
{ const me = [-2.6, 0.1], ds = [[-0.6, 0.1, { soaked: true }], [1.3, -0.4], [-0.9, 0.95, { ally: true, face: 0 }], [0.6, 0.85, { ally: true, face: 0 }]]; const s0 = 0.3, tf = s0 + 2.0, s1 = 5.3, tz = s1 + 0.05, tw = tz + 0.68;
  B.B = { noWarp: true, T: tw + 1.7, cam: { x: -0.1, z: 0.2, w: 7.4 }, her: H(me[0], me[1]), dum: ds,
    seq: [[s0, 'stream', { loop: true, until: s1, fade: 0.15 }], [tz, 'tsunami']], body: (t) => mixA(shiver(t, s0 + 0.15, s1), tailSlap(t, tw, 0.6)),
    fx(A) { const tgt = (t) => A.dpt(0, t, 0.6); FX.stream(A, { t0: s0 + 0.12, t1: s1, to: tgt, w: 0.13, op: 0.8 }); ticks(A, 0, s0 + 0.3, s1, 3, 0.2);
      for (let k = 0; k < 24; k++) { const t0 = s0 + 0.15 + k * 0.2; FX.bubble(A, { t0, t1: t0 + 0.42, r: 0.05 + 0.03 * (k % 3), at: (t) => { const a = A.at('tip', t), b = tgt(t), u = clamp((t - t0) / 0.42); return [lerp(a.x, b.x, u), lerp(a.y, b.y, u) + 0.05 * Math.sin(u * 9 + k), lerp(a.z, b.z, u) + 0.04 * Math.cos(u * 7 + k)]; } }); }
      A.hold(0, tf, tf + 1.0, 0.55); A.tag(0, tf + 0.05, tf + 1.0, ['浮空', 'Afloat'], C.foam); FX.bubble(A, { t0: tf, t1: tf + 1.0, at: { d: 0, y: 0.6 }, r: 0.55, op: 0.5 });
      A.hud(gaugeHud('水流 5 秒', 'Stream 5 s', (t) => t < s0 ? 0 : t < s1 ? (t - s0) / 5 : t < tw + 0.6 ? 1 : 0, { full: true }));
      FX.wave(A, { t: tw, from: (t) => A.ahead(tw, 0.45, 0), dir: 90, dist: 6, dur: 1.1, w: 2.6, h: 0.55, len: 0.9 });
      for (let k = 0; k < 14; k++) { const t0 = tw + k * 0.07, z = -1.1 + (k * 0.37) % 2.4; FX.bubble(A, { t0, t1: t0 + 0.5, r: 0.12 + 0.05 * (k % 3), at: (t) => { const x = me[0] + 0.45 + 6 * clamp((t - tw) / 1.1); return [x + 0.2, 0.5 + 0.2 * Math.sin(k), z]; } }); }
      const hitAt = (x) => tw + (x - (me[0] + 0.45)) / 6 * 1.1;
      A.hit(0, hitAt(-0.6), 28, { crash: true, knock: [1.0, 0], kdur: 0.4, soak: true }); A.hit(1, hitAt(1.3), 28, { crash: true, knock: [1.0, 0], kdur: 0.4, soak: true });
      [2, 3].forEach((i) => shieldOn(A, i, hitAt(ds[i][0]), tw + 1.7, 10));
      A.cap(s0, tz, '水流带着泡泡：连打 2 秒让小敌人浮空 1 秒', '2 s of stream floats a small foe 1 s'); A.cap(tz, tw + 1.7, '泡沫海啸：给经过的队友各一个 10 的泡泡', 'A foam tsunami: a 10 bubble on each friend it passes'); } };
}
// D: the crest closes over her as a 10 bubble for 3 s
{ const me = [-2.2, 0.2]; const t0 = 0.4, L = 2.8, tb = t0 + 0.72;
  const k = (t) => { const a = t - t0; const ss = (x0, x1, x) => { x = clamp((x - x0) / (x1 - x0)); return x * x * (3 - 2 * x); }; return ss(0.10, 0.22, a) * (1 - ss(0.62, 0.80, a)); };
  B.D = { noWarp: true, T: 4.2, cam: { x: -0.2, z: -0.1, w: 6.6 }, her: H(me[0], me[1]), dum: [[-0.6, 0.75], [1.9, -1.0]],
    seq: [[t0, 'dash'], [t0 + 1.2, 'idle', { loop: true, until: 4.2, fade: 0.2 }]],
    root: (() => { const R = [{ t: t0 }]; for (let i = 1; i <= 16; i++) { const a = 0.06 + i * 0.05, t = t0 + a; R.push({ t, fw: L * EASE.s(clamp((a - 0.08) / 0.74)), y: 0.68 * k(t), e: 'lin' }); } R.push({ t: 2.4, look: [1.9, -1.0] }); return R; })(),
    fx(A) { const ride = (t) => { const r = A.rootAt(t); return [r.x + Math.sin(r.yaw) * 0.25, 0, r.z + Math.cos(r.yaw) * 0.25]; };
      FX.wave(A, { t: t0 + 0.08, at: ride, yaw: () => 90 * D2R, dur: 0.72, out: 0.15, w: 1.0, h: 0.9, len: 1.1, rise: 0.14, hFn: (u) => Math.max(0.05, k(t0 + 0.08 + u * 0.72) * 1.05 + 0.05), wet: false });
      FX.strip(A, { t0: t0 + 0.15, t1: 4.2, from: [me[0], 0, me[1]], to: [me[0] + L, 0, me[1]], grow: 0.65, w: 1.0, op: 0.35, flow: 0.2 }); A.soak(0, t0 + 0.45, 3.2); A.status(0, t0 + 0.45, 'slow', 2.6);
      FX.bubble(A, { t0: tb, t1: tb + 3.0, at: (t) => A.body(t, 0.42), r: 0.62, hits: [2.3, 3.0] }); [2.3, 3.0].forEach((h) => foeBolt(A, { t: h - 0.35, d: 1, dur: 0.35, to: (t) => A.body(h, 0.6) }));
      A.say(2.35, { zh: '泡 10 → 4', en: 'Bubble 10 → 4' }, { col: C.foam });
      A.cap(0.1, 4.2, '浪顶合拢成泡泡罩住她：10，3 秒', 'The crest closes over her as a 10 bubble for 3 s'); } };
}

// ================================================================ Stream 流
// F1 Bouncer: it leaves the shell tip as a wobbling bubble, bounces with a plink each time (8), 4 times off foes and walls, and settles on a friend like a hat
{ const me = [-2.3, 0.0], ds = [[-0.4, -0.7], [0.9, 0.6, { soaked: true }], [-0.6, 1.0, { ally: true, face: 0 }]]; const tb = 0.3 + 0.44;
  const pts = [[-0.4, -0.7], [1.6, -1.25], [0.9, 0.6], [2.1, 1.25]];
  B.F1 = { T: 3.8, cam: { x: 0.0, z: 0.0, w: 6.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPoint', { speed: 1.2 }]], root: [{ t: 0.3, look: pts[0] }], body: (t) => mixA(shake(t, 3.0, 0.5, 0.5)),
    fx(A) { block(A, [1.6, -1.55], [1.8, 0.6, 0.3]); block(A, [2.1, 1.55], [1.8, 0.6, 0.3]);
      const legs = [[null, pts[0], 0.35], [pts[0], pts[1], 0.4], [pts[1], pts[2], 0.4], [pts[2], pts[3], 0.4], [pts[3], 'ally', 0.6]]; let t = tb; const seg = [];
      for (const [a, b, d] of legs) { seg.push({ a, b, t0: t, t1: t + d }); t += d; }
      const P = (tt) => { for (const s of seg) if (tt >= s.t0 && tt <= s.t1) { const u = (tt - s.t0) / (s.t1 - s.t0); const a = s.a ? [s.a[0], 0.55, s.a[1]] : A.at('tip', tb).toArray(); const b = s.b === 'ally' ? A.dpt(2, s.t1, 1.05).toArray() : [s.b[0], 0.55, s.b[1]]; return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + 0.3 * Math.sin(u * Math.PI), lerp(a[2], b[2], u)]; } return A.dpt(2, tt, 1.05).toArray(); };
      FX.bubble(A, { t0: tb, t1: t + 0.6, at: P, r: 0.2, hits: seg.map((s) => s.t1) }); FX.trail(A, { of: (tt) => new A.THREE.Vector3(...P(tt)), t0: tb, t1: t, len: 0.2, w: 0.08, col: C.foam, op: 0.4 });
      A.hit(0, seg[0].t1, 8, { soak: true }); FX.ring(A, { t: seg[1].t1, at: [pts[1][0], 0.45, pts[1][1]], r0: 0.1, r1: 0.4, dur: 0.3, dir: [0, 0, 1], col: C.foam, op: 0.7, w: 0.2 }); A.hit(1, seg[2].t1, 8, { wet: true }); FX.ring(A, { t: seg[3].t1, at: [pts[3][0], 0.45, pts[3][1]], r0: 0.1, r1: 0.4, dur: 0.3, dir: [0, 0, 1], col: C.foam, op: 0.7, w: 0.2 });
      A.tag(2, t, 3.8, ['接住', 'Caught'], C.foam);
      A.cap(0.3, 3.8, '泡泡在敌人和墙之间弹 4 次：8；队友可以接住', 'A bubble bounces off foes and walls 4 times: 8; a friend can catch it'); } };
}
// F2 Wash: the jet is wide and soft; each friend it passes through shakes like a wet dog and shines: washed clean of slows, burns and curses
{ const me = [-2.4, 0.1], ds = [[-0.8, 0.1, { ally: true, face: 90 }], [0.5, 0.15, { soaked: true }], [1.4, 0.05, { ally: true, face: 90 }], [2.3, 0.1]]; const tr = 0.35 + 0.44;
  B.F2 = { T: 3.0, cam: { x: 0.0, z: 0.0, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.35, 'castPoint']], root: [{ t: tr - 0.02 }, { t: tr + 0.1, fw: -0.12, e: 'out' }],
    body: (t) => mixA(crouch(t, tr - 0.1, tr + 0.5, 0.6), shake(t, tr + 1.0, 0.6, 0.6)),
    fx(A) { FX.jet(A, { t: tr, to: (t) => A.ahead(tr, 5.5, 0.55), dur: 0.2, hold: 0.3, w: 0.5, tail: 0.25, col: C.sky });
      for (let k = 0; k < 10; k++) { const t0 = tr + k * 0.03; FX.bubble(A, { t0, t1: t0 + 0.5, r: 0.06 + 0.03 * (k % 3), at: (t) => { const p = A.ahead(tr, 0.6 + 5 * clamp((t - t0) / 0.5), 0.5 + 0.15 * Math.sin(k * 2)); p.z += 0.15 * Math.cos(k * 3); return p; } }); }
      A.status(0, 0.1, 'slow', tr - 0.05); A.tag(0, 0.1, tr + 0.05, ['灼烧', 'Burn'], C.parch); A.tag(2, 0.1, tr + 0.12, ['诅咒', 'Curse'], C.parch); A.status(2, 0.1, 'slow', tr + 0.05);
      [[0, tr + 0.05], [2, tr + 0.12]].forEach(([i, t]) => { A.turn(i, t + 0.1, 25, 0.06); A.turn(i, t + 0.16, -50, 0.08); A.turn(i, t + 0.24, 25, 0.06); FX.spark(A, { t: t + 0.1, at: { d: i, y: 0.7 }, r: 0.55, col: C.foam, op: 0.6 }); A.tag(i, t + 0.15, t + 1.2, ['洗净', 'Washed'], C.foam); FX.drops(A, { t: t + 0.15, at: { d: i, y: 0.8 }, n: 10, sp: 1.2, up: 0.6, size: 0.04 }); });
      A.hit(1, tr + 0.08, 29, { crash: true }); A.hit(3, tr + 0.14, 18);
      A.cap(0.35, 3.0, '水柱上的队友被洗掉减速、灼烧和诅咒', 'Friends on the line are washed clean of slows, burns and curses'); } };
}
// F3 Rescue: the ribbon loops the friend once, becomes a 12 bubble, and its free end cracks the foes off them like a tablecloth trick
{ const me = [-2.2, 0.3], al = [0.2, 0.2], ds = [[al[0], al[1], { ally: true, face: 180 }], around(al, 20, 0.7), around(al, 140, 0.65), around(al, 260, 0.7)]; const tw = 0.3 + 0.48;
  B.F3 = { T: 3.2, cam: { x: -0.4, z: 0.2, w: 6.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'whip']], root: [{ t: 0.3, look: al }], body: (t) => mixA(tailSlap(t, tw + 0.3, 0.7), shake(t, 2.4, 0.6, 0.6)),
    fx(A) { FX.rope(A, { t0: tw - 0.05, t1: tw + 0.25, from: 'tip', to: (t) => A.dpt(0, t, 0.55), w: 0.08 }); FX.ring(A, { t: tw + 0.1, at: { d: 0, y: 0.55 }, r0: 0.5, r1: 0.35, dur: 0.25, dir: [0, 1, 0], col: C.foam, op: 0.8, w: 0.2 });
      shieldOn(A, 0, tw + 0.3, 3.2, 12);
      // the free end whips round the friend and cracks the foes off
      const R = 0.75, P = (t) => { const a = (t - tw - 0.3) * 14; return new A.THREE.Vector3(al[0] + Math.cos(a) * R, 0.45, al[1] - Math.sin(a) * R); }; FX.trail(A, { of: P, t0: tw + 0.3, t1: tw + 0.75, len: 0.18, w: 0.12, col: C.foam, op: 0.8 });
      [1, 2, 3].forEach((i, k) => { const d = ds[i], dx = d[0] - al[0], dz = d[1] - al[1], l = Math.hypot(dx, dz); A.hit(i, tw + 0.35 + k * 0.1, 8, { knock: [dx / l * 1.6, dz / l * 1.6], kdur: 0.35, soak: true }); });
      A.cap(0.3, 3.2, '水鞭把队友裹进 12 的泡泡，把敌人从队友身上扯开', 'The whip wraps a friend in a 12 bubble and yanks the foes off them'); } };
}
// F4 Drift mines: each splash blows a slow bubble that drifts off looking for a foe and pops: 10
{ const me = [-2.6, 0.2]; const pts = [[-1.5, 0.2], [-0.3, 0.2], [0.7, 0.2], [1.6, 0.2]], ds = [[-0.7, -1.0], [0.5, 1.1, { soaked: true }], [1.4, -0.9], [2.4, 0.9]]; const t0 = 0.3 + 0.32, per = 0.2;
  B.F4 = { T: 3.6, cam: { x: 0.0, z: 0.1, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'flick']], body: (t) => mixA(shake(t, 2.8, 0.6, 0.5)),
    fx(A) { FX.stone(A, { t: t0, pts, per, hop: 0.3, grow: true });
      pts.forEach((p, k) => { const ts = t0 + per * (k + 1), dur = 1.0 + 0.15 * k; FX.bubble(A, { t0: ts, t1: ts + dur, r: 0.17, at: (t) => { const b = A.dpt(k, ts + dur, 0.55), u = EASE.s(clamp((t - ts) / dur)); return [lerp(p[0], b.x, u) + 0.06 * Math.sin(t * 5 + k), lerp(0.25, b.y, u) + 0.12 * Math.sin(u * Math.PI), lerp(p[1], b.z, u)]; } }); A.hit(k, ts + dur, 10, { wet: !!(ds[k][2]), soak: true }); });
      A.cap(0.3, 3.6, '每个水花吹出一个泡泡，飘向敌人爆开：10', 'Each splash leaves a bubble that drifts to a foe and pops: 10'); } };
}
// F5 Foam floor: suds stay 4 s; a foe that runs or charges across them goes head over heels
{ const me = [-2.0, 0.1], c = [-0.4, 0.1], ds = [[1.8, -0.2, { soaked: true }], [1.4, 0.9]]; const tf = 0.3 + 0.3, tc = 1.4;
  ds[1].push({}); ds[0][2].flat = [[tc + 0.5, 3.6]]; ds[1][2].flat = [[tc + 0.85, 3.6]];
  B.F5 = { T: 4.0, cam: { x: -0.2, z: 0.1, w: 6.2 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'nozzle']], body: (t) => mixA(shake(t, 1.6, 0.6, 0.6)),
    fx(A) { FX.fan(A, { t: tf - 0.12, at: 'him', yaw: (t) => A.rootAt(tf).yaw / D2R, arc: 100, r: 2.6, dur: 0.3, col: C.foam });
      FX.pool(A, { t0: tf + 0.1, t1: 4.0, at: [c[0] + 0.6, 0, c[1]], r: 1.2, sx: 1.0, sz: 1.2, col: C.foam, op: 0.4, whirl: 0.2 });
      for (let k = 0; k < 16; k++) { const a = k * 2.4, r = 0.3 + (k * 0.13) % 0.9; FX.bubble(A, { t0: tf + 0.15 + k * 0.02, t1: 3.9, grow: true, pop: false, r: 0.06 + 0.04 * (k % 3), at: [c[0] + 0.6 + Math.cos(a) * r, 0.05, c[1] + Math.sin(a) * r * 1.1] }); }
      [0, 1].forEach((i) => { const ta = tc + i * 0.3; A.moveTo(i, ta, [c[0] + 0.5, ds[i][1] * 0.5], 0.45, 'lin'); A.turn(i, ta, 0, 0.1); A.hit(i, ta + 0.45, 10, { up: 0.5, soak: i === 1 }); A.tag(i, ta + 0.5, ta + 1.4, ['滑倒', 'Slipped'], C.foam); });
      A.cap(0.3, 4.0, '泡沫留 4 秒：跑或冲过的敌人摔倒', 'Foam stays 4 s: a foe that runs or charges across it falls'); } };
}
// F6 Guardian orb: steered onto a friend it settles over them like a glass bell (14); foes that touch it are slapped by small tongues of water
{ const me = [-2.1, 0.5], al = [0.6, 0.0], ds = [[al[0], al[1], { ally: true, face: 0 }], around(al, 30, 0.85), around(al, 210, 0.85)]; ds[1].push({ soaked: true });
  const p = (t) => { const u = clamp((t - 0.6) / 1.0); return [lerp(-1.2, al[0], EASE.s(u)), 0.55, lerp(0.5, al[1], u)]; };
  B.F6 = { T: 4.2, cam: { x: -0.3, z: 0.1, w: 6.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom', { to: 0.62 }], [0.62, 'bloomHold', { loop: true, until: 1.7 }], [1.7, 'castPoint', { from: 0.3 }]],
    root: [{ t: 0.5, look: al }], body: (t) => mixA(pawUp(t, 0.6, 1.7, 0.8), shake(t, 3.6, 0.5, 0.5)),
    fx(A) { const orbAt = (t) => t < 0.6 ? A.at('tip', t).toArray() : t < 1.6 ? p(t) : A.dpt(0, t, 0.6).toArray();
      FX.orb(A, { t0: 0.4, t1: 1.62, at: orbAt, r: 0.32, pop: false }); FX.rope(A, { t0: 0.6, t1: 1.6, from: 'tip', to: orbAt, w: 0.03, sag: 0.1 }); FX.pointer(A, { t0: 0.5, t1: 1.6, at: (t) => { const q = p(t); return [q[0], 0, q[2]]; } });
      FX.bubble(A, { t0: 1.6, t1: 4.1, at: { d: 0, y: 0.62 }, r: 0.62, col: C.cobalt, op: 0.55, tall: 1.15, hits: [2.3, 3.1] }); A.tag(0, 1.7, 4.1, ['护 14', 'Guard 14'], C.foam);
      for (let k = 0; k < 7; k++) { const t = 1.9 + k * 0.3, i = 1 + (k % 2); FX.jet(A, { t, from: (tt) => A.dpt(0, t, 0.5), to: (tt) => A.dpt(i, t, 0.55), dur: 0.08, hold: 0.06, w: 0.08, col: C.cobalt }); A.hit(i, t + 0.08, 4, { noStop: true, soak: k < 2 }); }
      [2.3, 3.1].forEach((h, k) => foeBolt(A, { t: h - 0.3, d: 1 + k, dur: 0.3, to: (t) => A.dpt(0, h, 0.7) }));
      A.cap(0.3, 4.2, '引到队友身上护住（14）；每跳打它周围的敌人', 'Steered onto a friend it guards them (14); its ticks hit the foes round them'); } };
}
// F7 Raft: the column settles into a quilt of bubbles; friends' feet sink a little into it and the fire under it shows through, harmless
{ const me = [-2.4, 0.2], tg = [1.0, 0.0], ds = [[0.7, -0.25, { ally: true, face: 180 }], [1.35, 0.35, { ally: true, face: 180 }], [1.9, -0.8, { soaked: true }]]; const th = 1.4, tl = th + 0.68, td = tl + 0.75;
  B.F7 = { T: 4.6, cam: { x: -0.2, z: 0.0, w: 6.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.25, 'castBloom', { to: 0.62 }], [0.62, 'bloomHold', { loop: true, until: th }], [th, 'tsunami', { from: 0.2 }]],
    body: (t) => mixA(tailSlap(t, tl, 0.9), shake(t, td + 0.5, 0.6, 0.6)),
    fx(A) { FX.pool(A, { t0: 0, t1: 4.6, at: [tg[0], 0, tg[1]], r: 1.0, col: '#B8141F', op: 0.45, whirl: 0.4 }); A.tag(0, 0.05, td, ['灼烧地面', 'Burning floor'], C.parch); A.status(0, 0.05, 'slow', td - 0.05); A.status(1, 0.05, 'slow', td - 0.05);
      FX.orb(A, { t0: 0.4, t1: tl - 0.2, at: 'tip', r: (t) => 0.06 + 0.3 * clamp((t - 0.4) / 1.2), pop: false });
      FX.bolt(A, { t: tl - 0.2, from: 'tip', to: [tg[0], 0.3, tg[1]], dur: 0.95, arc: 2.2, r: 0.36, e: 'lin', splash: false });
      FX.splash(A, { t: td, at: [tg[0], 0, tg[1]], r: 1.0, h: 0.7 });
      for (let k = 0; k < 22; k++) { const a = k * 2.39, r = Math.sqrt((k + 0.5) / 22) * 1.0; FX.bubble(A, { t0: td + 0.02 * k, t1: 4.5, pop: false, r: 0.15 + 0.04 * (k % 3), tall: 0.5, op: 0.55, at: [tg[0] + Math.cos(a) * r, 0.05, tg[1] + Math.sin(a) * r] }); }
      [0, 1].forEach((i) => A.tag(i, td + 0.1, 4.5, ['免疫地面', 'Floor-proof'], C.foam)); A.hit(2, td + 0.04, 36, { crash: true });
      A.cap(0.25, 4.6, '落地变成泡泡筏：上面的队友不怕灼烧和减速地面', 'It lands as a raft of bubbles: friends on it ignore burning and slowing ground'); } };
}
// F8 Bubble wave: the staff planted, its shell tip open like a bubble wand; she blows across it with puffed cheeks: a wave of bubbles down the 8 u line for 2 s, turning slowly. Small foes it touches are sealed and blown to the line's end (an elite half as far); there the bubble pops: 20, Crash, soaks; the foe falls flat 0.5 s
{ const me = [-3.4, -0.4], ds = [[-1.4, -0.23, { soaked: true }], [0.09, -0.7], [-0.64, -0.89, { elite: true }]]; const t0 = 0.3, b0 = 0.75, b1 = 2.75, T = 4.6, sp = 4.0;
  const yaw0 = 75, yaw1 = 105; // she turns slowly across the line
  const end = (A, i, ta) => { const r = A.rootAt(ta), f = A.fwd(ta); const d = ds[i]; const r0 = Math.hypot(d[0] - r.x, d[1] - r.z); const R1 = i === 2 ? r0 + (8 - r0) / 2 : 8; return { r, f, r0, R1, tz: ta + (R1 - r0) / sp }; };
  B.F8 = { T, cam: { x: 0.6, z: 0.0, w: 9.8 }, her: H(me[0], me[1], yaw0), dum: ds, seq: [[t0, 'castPlant', { to: 0.45 }], [0.75, 'plantLean', { loop: true, until: b1 }], [b1, 'castPlant', { from: 0.5 }]],
    root: [{ t: b0 }, { t: b1, spin: yaw1 - yaw0, e: 'lin' }], body: (t) => mixA(tailSlap(t, b0, 0.5), lookUp(t, b0, b1, -8), shake(t, b1 + 0.3, 0.6, 0.7)),
    fx(A) { // the wave: small bubbles drifting out along the line she faces as each leaves
      for (let k = 0; k < 34; k++) { const tk = b0 + k * 0.06, side = ((k * 7) % 5 - 2) * 0.14, hgt = 0.25 + ((k * 3) % 4) * 0.12; FX.bubble(A, { t0: tk, t1: tk + 1.7, r: 0.09 + ((k * 5) % 3) * 0.04, pop: true, at: (t) => { const r = A.rootAt(tk), f = A.fwd(tk), u = (t - tk) * 4.6 + 0.6; return [r.x + f.x * u - f.z * side * (1 + u * 0.2), hgt + 0.1 * Math.sin(t * 6 + k), r.z + f.z * u + f.x * side * (1 + u * 0.2)]; } }); }
      // each foe is sealed when the wave reaches it, blown out along the line, and dropped where its bubble pops
      ds.forEach((d, i) => { let ta = null; for (let t = b0 + 0.2; t < b1; t += 0.02) { const r = A.rootAt(t), f = A.fwd(t), dx = d[0] - r.x, dz = d[1] - r.z; if (dx * f.x + dz * f.z > 0 && Math.abs(dx * f.z - dz * f.x) < 0.45) { ta = t + 0.1; break; } } if (ta == null) return;
        const e = end(A, i, ta); const ux = (d[0] - e.r.x) / e.r0, uz = (d[1] - e.r.z) / e.r0; const pos = (t) => { const s = e.r0 + (e.R1 - e.r0) * EASE.s(clamp((t - ta) / (e.tz - ta))); return [e.r.x + ux * s, e.r.z + uz * s]; };
        A.hold(i, ta, e.tz, 0.75, { at: pos }); FX.bubble(A, { t0: ta, t1: e.tz, at: (t) => A.dpt(i, t, 0.6), r: 0.62 * (i === 2 ? 1.25 : 1), hits: [e.tz - 0.02] });
        A.hit(i, e.tz + 0.02, i === 0 ? 32 : 20, { crash: true }); A.soak(i, e.tz + 0.1, 4); const o = d[2] || (d[2] = {}); o.flat = [[e.tz + 0.2, e.tz + 0.7]]; });
      A.cap(t0, T, '大招：吹出一道泡泡浪 8 u，2 秒：小敌人被封进泡泡吹到尽头，泡泡破：20，拍，浸湿；摔在地上', 'Big skill: she blows a wave of bubbles down an 8 u line for 2 s: small foes are sealed and blown to its end; the bubble pops: 20, Crash, soaks; they fall flat'); } };
}

// ================================================================ Wave 浪
// F9 Bubble flail 泡锤 (Kesh's design, 20 Nov; kit 2.0: it is Bubble's Breaker now, his pick 1a): her stream catches the foe it hits in a bubble; she flicks the
// stream up and down, bouncing the bubbled foe high and slamming it into the floor where it stands; every slam breaks out as a ring. The third
// slam (inside the 2 s hold cap) pops the bubble. The stream never stops
{ const me = [-2.6, 0.0], c = [0.3, 0.1], ds = [[c[0], c[1]], around(c, 40, 1.2), around(c, 160, 1.3), around(c, 265, 1.1), [2.9, -2.0]]; const s0 = 0.3, tc = 0.9, T = tc + 2.9;
  const ups = [tc + 0.05, tc + 0.65, tc + 1.25], downs = ups.map((t) => t + 0.3), lands = downs.map((t) => t + 0.15), tp = lands[2];
  B.F9 = { noWarp: true, T, cam: { x: -0.2, z: 0.1, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[s0, 'stream', { loop: true, until: T, fade: 0.15 }]],
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
// F10 Faceful: the wall is all foam: 12; foes come out of it with white beards over their eyes, swinging at nothing: blinded 1.2 s
{ const me = [-2.0, 0.1], ds = fan(3, 1.4, 40, -40, -2.0, 0.1); ds[0].push({ soaked: true }); const tw = 0.3 + 0.46;
  B.F10 = { T: 3.0, cam: { x: -0.7, z: 0.1, w: 5.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castSweep']], body: (t) => mixA(tailSlap(t, tw, 0.6), shake(t, 2.2, 0.6, 0.6)),
    fx(A) { FX.wave(A, { t: tw - 0.04, from: (t) => A.ahead(tw, 0.35, 0), dir: 90, dist: 2.0, dur: 0.42, w: 2.6, h: 0.6, len: 0.9, wFn: (u) => 1.8 + 1.4 * u });
      for (let k = 0; k < 12; k++) { const t0 = tw + k * 0.025, z = -1.2 + k * 0.22; FX.bubble(A, { t0, t1: t0 + 0.4, r: 0.12, at: (t) => [me[0] + 0.4 + 2 * clamp((t - tw) / 0.42), 0.5, z * (0.5 + clamp((t - tw) / 0.42) * 0.6)] }); }
      ds.forEach((d, i) => { const ta = tw + 0.2; A.hit(i, ta, i === 0 ? 19 : 12, { crash: i === 0, blind: 1.2, knock: [0.5, 0], kdur: 0.3 }); for (const tt of [ta + 0.45, ta + 0.9]) { A.turn(i, tt, 35, 0.08); A.turn(i, tt + 0.1, -35, 0.15); } A.tag(i, ta + 0.4, ta + 1.2, ['打空', 'Miss'], C.parch); });
      A.cap(0.3, 3.0, '泡沫浪：12；被糊脸的敌人致盲 1.2 秒，打不中', 'Foam, 12: foes it hits are blinded 1.2 s: aimed blows and shots miss'); } };
}
// F11 Bubbling up: the left paw wiggles upward: the wet patches fizz like soda and bubbles rise under everyone standing in them: foes go up, friends are wrapped
{ const me = TIDE.me, ds = [[-0.4, -0.8], [-0.3, 1.2], [1.6, 0.55, { elite: true }], [1.3, 0.95, { ally: true }], [2.5, -0.6]]; const tc = 1.0, tb = tc + 0.5, T = 4.2;
  B.F11 = { T, cam: { x: -0.1, z: 0.2, w: 7.6 }, her: H(me[0], me[1]), dum: ds, seq: [[tc, 'castBloom', { speed: 1.1 }]], root: [{ t: 0.2, look: [0.5, 0.2] }],
    body: (t) => mixA(pawUp(t, tc, tb + 0.3, 1.0), shiver(t, tc + 0.2, tb + 0.3, 0.8)),
    fx(A) { layWater(A, 0.05, T);
      tidePts().forEach((p, k) => { for (let j = 0; j < 4; j++) FX.drops(A, { t: tc + 0.2 + j * 0.12, at: [p[0], 0.02, p[1]], n: 4, sp: 0.2, up: 0.9, size: 0.05, col: C.foam }); });
      // small foes float 1.2 s (the elite 0.6 s) and land soaked; the friend and she get a 10 bubble
      [[0, 1.2], [1, 1.2], [2, 0.6]].forEach(([i, d]) => { A.hold(i, tb, tb + d, 0.6); FX.bubble(A, { t0: tb, t1: tb + d, at: (t) => A.dpt(i, t, 0.6), r: 0.6 * (i === 2 ? 1.3 : 1), hits: [tb + d - 0.02] }); A.soak(i, tb + d, 4); });
      shieldOn(A, 3, tb, T, 10); FX.bubble(A, { t0: tb, t1: T, at: (t) => { const r = A.rootAt(t); return [r.x, 0.5, r.z]; }, r: 0.6 }); A.say(tb + 0.1, { zh: '泡 10', en: 'Bubble 10' }, { col: C.foam });
      A.cap(0.05, tc, '她的水：湿路、水洼', 'Her water: a wet path, puddles'); A.cap(tc, T, '不伤害：水里的敌人浮起 1.2 秒，落地浸湿；水里的队友得到 10 的泡泡', 'No damage: foes in her water float 1.2 s and land soaked; friends in it get a 10 bubble'); } };
}
// F12 Steady water: the pool's rim turns but its middle lies glass-flat; friends in it stand with a ring of still water round each foot: they cannot be stunned, pushed, pulled or knocked flat
{ const me = [-2.4, 0.3], c = [0.3, 0], al = [0.15, 0.1], ds = [[al[0], al[1], { ally: true, face: 0 }], [1.8, -0.9], [1.9, 0.9, { soaked: true }]]; const tp = 0.3 + 0.4, ts = 2.2;
  B.F12 = { T: 4.4, cam: { x: -0.3, z: 0.0, w: 6.4 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant']], root: [{ t: 0.3, look: c }], body: (t) => mixA(tailSlap(t, tp, 0.5), shake(t, 3.6, 0.5, 0.5)),
    fx(A) { FX.pool(A, { t0: tp, t1: 4.3, at: [c[0], 0, c[1]], r: 1.6, whirl: 1, op: 0.55 }); FX.disc(A, { t: tp + 0.1, at: [c[0], 0, c[1]], r0: 0.8, r1: 0.8, hold: true, dur: 3.5, col: C.sky, op: 0.35, y: 0.013 });
      FX.ring(A, { t: tp + 0.2, at: { d: 0, y: 0 }, r0: 0.28, r1: 0.28, dur: 3.4, col: C.foam, op: 0.7, w: 0.12, e: 'lin' });
      // a foe slams the floor: a shock ring that would knock her friend flat; it holds
      FX.ring(A, { t: ts, at: { d: 1, y: 0 }, r0: 0.3, r1: 2.4, dur: 0.45, col: '#B8141F', op: 0.8, w: 0.1 }); A.turn(1, ts - 0.2, 0, 0.1); A.hit(0, ts + 0.3, 6, { col: '#E05A5A', noStop: true }); A.tag(0, ts + 0.3, ts + 1.4, ['定', 'Steady'], C.foam);
      [1, 2].forEach((i) => { A.moveTo(i, tp + 0.6, [lerp(ds[i][0], c[0], 0.3), lerp(ds[i][1], c[1], 0.3)], 1.6, 'out'); A.status(i, tp + 0.6, 'slow', 3); A.hit(i, tp + 0.8, 4, { noStop: true, soak: i === 1 }); });
      A.cap(0.3, 4.4, '站在里面的队友不会被眩晕、推、拉或击倒', 'Friends standing in it cannot be stunned, pushed, pulled or knocked flat'); } };
}
// F13 Return: Sky Fall's waterfall is thin as a soap film, bubbles tumbling down in it; each shot it catches turns in a small bubble and drifts home: 6 each
{ const me = [-2.2, 0.2], w = [-0.8, 0.2], ds = [[1.2, 0.8], [0.9, -0.5, { soaked: true }]]; const tr = 0.3 + 0.6;
  B.F13 = { T: 4.4, cam: { x: -0.3, z: 0.1, w: 6.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom', { speed: 0.8 }]], body: (t) => mixA(lookUp(t, 0.6, 1.6, 15), shake(t, 3.9, 0.5, 0.5)),
    fx(A) { FX.waterfall(A, { t0: tr - 0.2, t1: 4.3, at: [w[0], 0, w[1]], round: true, w: 2.0, top: 3.0, op: 0.55, rise: 0.45, col: C.bubble, bub: true });
      [[1.3, 0, 0.8], [1.7, 1, -0.4], [2.1, 0, 0.6]].forEach(([t, i, z]) => { const hit = t + 0.6 * (ds[i][0] - (w[0] + 0.8)) / (ds[i][0] - (me[0] + 0.2)); foeBolt(A, { t, d: i, dur: 0.6, to: [me[0] + 0.2, 0.75, me[1]], stop: hit - t });
        const sp = [w[0] + 0.8, 0.75, z]; const back = 0.9; FX.bubble(A, { t0: hit, t1: hit + back, r: 0.14, at: (tt) => { const b = A.dpt(i, hit + back, 0.75), u = EASE.s(clamp((tt - hit) / back)); return [lerp(sp[0], b.x, u), lerp(sp[1], b.y, u) + 0.2 * Math.sin(u * Math.PI), lerp(sp[2], b.z, u)]; } });
        const m = A.add(new A.THREE.Mesh(A.streakGeo, A.mat('#B8141F', A.F.STREAK))); m.visible = false; A.fx((tt) => { m.visible = tt >= hit && tt <= hit + back; if (!m.visible) return; const b = A.dpt(i, hit + back, 0.75), u = EASE.s(clamp((tt - hit) / back)); m.position.set(lerp(sp[0], b.x, u), lerp(sp[1], b.y, u) + 0.2 * Math.sin(u * Math.PI), lerp(sp[2], b.z, u)); m.rotation.y = tt * 6; m.scale.set(0.07, 0.07, 0.14); m.material.uniforms.op.value = 0.9; });
        A.hit(i, hit + back, 6, { soak: true }); });
      A.cap(0.3, 4.4, '挡住的子弹被泡泡包着飘回射手：各 6', 'The shots it stops float back to who fired them in bubbles: 6 each'); } };
}
// F14 Bubble wake: she rides low and fast; behind her the foes rise one after another like corks, each in a bubble
{ const me = [-2.6, 0.6], ds = [[-0.9, 0.2], [0.5, -0.6, { soaked: true }], [1.6, 0.4]]; const t0 = 0.3, t1 = t0 + 1.3;
  const path = (u) => [lerp(-2.4, 2.4, u), 0.6 * Math.cos(u * Math.PI * 1.6) - 0.1];
  B.F14 = { T: 3.8, cam: { x: -0.1, z: 0.1, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'castPlant', { to: 0.3, speed: 2 }], [t0 + 0.15, 'belly', { loop: true, until: t1 }], [t1, 'castPlant', { from: 0.6 }]],
    root: (() => { const R = [{ t: t0 }]; for (let i = 1; i <= 15; i++) { const u = i / 15, p = path(u), q = path(Math.min(1, u + 0.03)); R.push({ t: t0 + 1.3 * u, x: p[0], z: p[1], y: 0.2, look: [q[0] + (q[0] - p[0]) * 5, q[1] + (q[1] - p[1]) * 5], e: 'lin', roll: 12 * Math.sin(u * Math.PI * 1.6) }); } R.push({ t: t1 + 0.2, y: 0, roll: 0, e: 'out' }); return R; })(),
    body: (t) => shake(t, t1 + 0.4, 0.6, 0.7),
    fx(A) { const ride = (t) => { const r = A.rootAt(t); return [r.x, 0, r.z]; };
      FX.wave(A, { t: t0 + 0.05, at: ride, yaw: (t) => A.rootAt(t).yaw, dur: 1.3, out: 0.2, w: 0.8, h: 0.28, len: 0.9, wet: false }); FX.wake(A, { of: ride, t0: t0 + 0.1, t1, w: 0.7, op: 0.4, life: 1.4 });
      [0.32, 0.6, 0.85].forEach((u, i) => { const ta = t0 + 1.3 * u + 0.2, te = ta + 1.6; A.hit(i, ta - 0.2, 14, { wet: i === 1, soak: true }); A.hold(i, ta, te, 0.7, { spin: 2 }); FX.bubble(A, { t0: ta, t1: te, at: { d: i, y: 0.6 }, r: 0.6 }); A.tag(i, ta + 0.1, te, ['浮空 +20%', 'Afloat +20%'], C.foam); A.hit(i, te, 6, {}); });
      A.cap(t0, 3.8, '她踏浪经过的敌人一个个被泡泡托起', 'Each foe she rides past is lifted in a bubble behind her'); } };
}
// F15 Bang: two fat bubbles roll in and burst on each other with one sharp bang: 18, no stun; every wind-up within 4 u breaks
{ const me = [-2.2, 0.2], c = [0.6, 0.1], ds = [[0.45, -0.25, { soaked: true }], [0.75, 0.45], [2.4, -1.0], [-0.6, 1.4]]; const tp = 0.3 + 0.4, tm = tp + 0.55;
  B.F15 = { T: 3.0, cam: { x: -0.1, z: 0.1, w: 6.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant', { speed: 0.9 }]], body: (t) => mixA(tailSlap(t, tm, 0.6), shake(t, 2.0, 0.6, 0.5)),
    fx(A) { for (const s of [-1, 1]) FX.bubble(A, { t0: tp, t1: tm, r: 0.55, at: (t) => { const u = EASE.in2(clamp((t - tp) / (tm - tp))); return [c[0], 0.55, c[1] + s * lerp(1.9, 0.5, u)]; } });
      FX.splash(A, { t: tm, at: [c[0], 0, c[1]], r: 0.9, h: 0.8, crash: true }); FX.ring(A, { t: tm, at: [c[0], 0.6, c[1]], r0: 0.3, r1: 4.0, dur: 0.5, col: C.foam, op: 0.6, w: 0.04 }); A.shake(tm, 0.08, 0.2);
      [2, 3].forEach((i) => windup(A, i, 0.4, tm, true));
      A.hit(0, tm + 0.02, 29, { crash: true }); A.hit(1, tm + 0.03, 18);
      A.cap(0.3, 3.0, '两个大泡泡相撞爆开：18，不眩晕；4 u 内所有蓄力被打断', 'Two great bubbles meet and pop: 18, no stun; every wind-up within 4 u breaks'); } };
}
// F16 Decoy: no pull: she spins and the water keeps her shape as she slips out of its back; the copy waves its staff and wobbles at each hit; foes attack it 3 s, then it bursts: 40
{ const me = [-0.4, 0.1], ds = [around(me, 10, 1.3), around(me, 130, 1.2), around(me, 240, 1.3)]; ds[1].push({ soaked: true }); const t0 = 0.3, ts = 1.0, tb = ts + 3.0;
  B.F16 = { T: tb + 1.0, cam: { x: -0.6, z: 0.2, w: 6.6 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'castSweep', { to: 0.5 }], [0.65, 'level', { loop: true, until: ts }], [ts, 'slide', { speed: 1.2 }], [ts + 0.95, 'idle', { loop: true, until: tb + 1, fade: 0.2 }]],
    root: [{ t: 0.5 }, { t: ts, spin: 540, e: 'in2' }, { t: ts + 0.05, look: [-3, 1.5] }, { t: ts + 0.7, x: -2.4, z: 1.2, e: 'out' }, { t: ts + 1.2, look: me }],
    body: (t) => shake(t, tb + 0.4, 0.6, 0.8),
    fx(A) { A.ghost((t) => t >= ts && t < tb ? [{ lag: t - ts, op: 0.55 + 0.25 * Math.max(0, Math.sin((t - ts) * 6)), glow: 0.6 }] : []);
      FX.bubble(A, { t0: ts, t1: tb, at: [me[0], 0.5, me[1]], r: 0.55, op: 0.25, pop: false, hits: [1.6, 2.2, 2.8, 3.4] });
      ds.forEach((d, i) => { A.moveTo(i, ts + 0.2, around(me, [10, 130, 240][i], 0.75), 0.4, 'out'); for (const tt of [1.6 + i * 0.2, 2.6 + i * 0.2, 3.4]) { A.turn(i, tt - 0.1, 30, 0.08); A.turn(i, tt + 0.05, -30, 0.12); } A.tag(i, ts + 0.6, tb, ['被引', 'Taunted'], C.parch); });
      FX.splash(A, { t: tb, at: [me[0], 0, me[1]], r: 1.2, h: 1.0, crash: true }); FX.ringwave(A, { t: tb, at: [me[0], 0, me[1]], r0: 0.3, r1: 1.6, h: 0.5, dur: 0.4 }); A.shake(tb, 0.08, 0.25);
      ds.forEach((d, i) => A.hit(i, tb + 0.05, i === 1 ? 64 : 40, { crash: i === 1, knock: [(d[0] - me[0]) * 0.6, (d[1] - me[1]) * 0.6], kdur: 0.35 }));
      A.cap(t0, tb + 1.0, '大招：留下一只水獭水分身：敌人打它 3 秒，然后爆开：40', 'Big skill: she leaves an otter of water: foes attack it 3 s, then it bursts: 40'); } };
}

// ================================================================ Spring 泉
// F17 Bubble hop: each step lands on the head of the friend or foe nearest the pointer; she bounces off a bubble on it and comes down 1 u beyond. A friend gets an 8 bubble; a small foe is lifted 0.6 s and lands soaked
{ const me = [-2.6, 0.2], ds = [[-1.2, 0.5, { ally: true, face: 90 }], [0.3, -0.3], [1.7, 0.5]]; const st = [0.5, 1.25, 2.0], up = 0.28, dn = 0.25, T = 4.0;
  const land = [[-0.2, 0.55], [1.3, -0.25], [2.7, 0.55]];
  B.F17 = { T, cam: { x: 0.0, z: 0.1, w: 7.4, y: 0.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.2, 'idle', { loop: true, until: T }]],
    root: (() => { const R = [{ t: 0.1, look: [3, 0.2] }]; st.forEach((t, k) => { const from = k ? land[k - 1] : me, h = ds[k]; R.push({ t, x: from[0], z: from[1], y: 0 }); R.push({ t: t + up, x: h[0], z: h[1], y: 1.25, e: 'out', ye: 'out' }); R.push({ t: t + up + dn, x: land[k][0], z: land[k][1], y: 0, jump: 0.35, e: 'lin' }); }); return R; })(),
    body: (t) => mixA(...st.map((s) => crouch(t, s - 0.08, s + 0.05, 0.7)), ...st.map((s) => tuck(t, s + 0.05, s + up + 0.1, 0.5)), ...st.map((s) => crouch(t, s + up + dn - 0.02, s + up + dn + 0.12, 0.5))),
    fx(A) { st.forEach((t, k) => { const tb = t + up; FX.bubble(A, { t0: tb - 0.12, t1: tb + 0.05, at: (q) => A.dpt(k, tb, 1.15), r: 0.3, pop: true }); FX.ring(A, { t: tb, at: (q) => A.dpt(k, tb, 1.15), r0: 0.1, r1: 0.5, dur: 0.25, col: C.foam, op: 0.7, w: 0.12 }); });
      shieldOn(A, 0, st[0] + up, T, 8);
      [1, 2].forEach((i) => { const tb = st[i] + up; A.hold(i, tb, tb + 0.6, 0.5); FX.bubble(A, { t0: tb, t1: tb + 0.6, at: (q) => A.dpt(i, q, 0.6), r: 0.6, hits: [tb + 0.58] }); A.soak(i, tb + 0.6, 4); });
      A.cap(0.2, T, '每步踩在最近的队友或敌人头上，弹起落到 1 u 外；队友 8 的泡泡，小敌人浮起 0.6 秒，浸湿', 'Each step bounces off a head and lands 1 u beyond; a friend gets an 8 bubble, a small foe floats 0.6 s and lands soaked'); } };
}
// F18 Hop: when it pops it jumps as a smaller bubble with a rising plink to the next friend, up to three
{ const me = [-2.3, 0.4], als = [[-0.6, -0.2], [0.6, 0.7], [1.6, -0.4]], fo = [2.6, 0.6]; const tc = 0.3 + 0.38;
  B.F18 = { T: 4.6, cam: { x: 0.1, z: 0.1, w: 6.8 }, her: H(me[0], me[1]), dum: [...als.map((a) => [a[0], a[1], { ally: true, face: 0 }]), fo], seq: [[0.3, 'castBloom', { speed: 1.2 }]], root: [{ t: 0.3, look: als[0] }],
    body: (t) => pawUp(t, 0.45, 1.0, 0.7),
    fx(A) { FX.bolt(A, { t: tc, to: (t) => A.dpt(0, t, 0.62), dur: 0.3, r: 0.08, col: C.bubble, splash: false });
      const pops = [1.6, 2.6, 3.5]; let s = tc + 0.3; [0, 1, 2].forEach((i) => { const v = [14, 10, 7][i]; shieldOn(A, i, s, pops[i], v, { r: 0.62 - i * 0.08 }); foeBolt(A, { t: pops[i] - 0.35, d: 3, dur: 0.35, to: (t) => A.dpt(i, pops[i], 0.7) });
        if (i < 2) FX.bubble(A, { t0: pops[i], t1: pops[i] + 0.35, pop: false, r: 0.15, at: (t) => { const a = A.dpt(i, pops[i], 0.7), b = A.dpt(i + 1, pops[i] + 0.35, 0.7), u = clamp((t - pops[i]) / 0.35); return [lerp(a.x, b.x, u), lerp(a.y, b.y, u) + 0.5 * Math.sin(u * Math.PI), lerp(a.z, b.z, u)]; } });
        s = pops[i] + 0.35; });
      A.cap(0.3, 4.6, '泡泡破了就跳到下一个队友，最多三次', 'When it pops it hops to the next friend, up to three'); } };
}
// F19 Heavy bubbles: bubbles fall slowly, stick on the foes and weigh them down: each second one more; at four it is rooted, then they pop
{ const me = [-2.3, 0.4], c = [0.4, 0], ds = [[0.0, -0.4], [0.9, 0.4, { soaked: true }]];
  B.F19 = { T: 5.6, cam: { x: -0.4, z: 0.0, w: 6.2, y: 0.7 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom']], body: (t) => mixA(lookUp(t, 0.5, 1.4, 25)),
    fx(A) { FX.rain(A, { t0: 0.85, t1: 5.4, at: [c[0], 0, c[1]], r: 1.5, h: 2.2, n: 18 });
      ds.forEach((d, i) => { A.status(i, 1.1, 'slow', 4.2); for (let k = 0; k < 4; k++) { const tk = 1.2 + k + i * 0.1, a = k * 1.7 + i; const off = [Math.cos(a) * 0.22, 0.35 + k * 0.18, Math.sin(a) * 0.22]; FX.bubble(A, { t0: tk - 0.6, t1: 5.3, r: 0.12, pop: true, hits: [], at: (t) => { const p = A.dpt(i, t, 0); const u = clamp((t - tk + 0.6) / 0.6); return [p.x + off[0], lerp(2.1, off[1], EASE.out(u)) + 0, p.z + off[2]]; } }); A.hit(i, tk, 3, { noStop: true, soak: k === 0 }); }
        A.tag(i, 1.3 + i * 0.1, 4.2, (t, lang) => (lang === 'zh' ? '泡 ' : 'Bubbles ') + Math.min(4, Math.floor(t - 1.2 - i * 0.1) + 1), C.foam); A.status(i, 4.2, 'root', 1.1); A.tag(i, 4.25, 5.3, ['定身', 'Rooted'], C.foam); A.hit(i, 5.3, 24, { crash: !!d[2] }); });
      A.cap(0.3, 5.6, '每秒粘一个泡泡；满四个定身，然后全爆', 'Each second sticks a bubble on a foe; at four it is rooted, then they pop'); } };
}
// F20 Bubble fountain: after the column the vent keeps burping 5 s; each bubble wobbles off and settles over the nearest friend
{ const me = [-2.2, 0.3], c = [0.3, 0.0], als = [[-0.5, -0.9], [1.3, 0.9]], ds = [[0.05, -0.25, { soaked: true }], ...als.map((a) => [a[0], a[1], { ally: true, face: 180 }])]; const tp = 0.3 + 0.4, te = tp + 0.6;
  B.F20 = { T: te + 4.0, cam: { x: -0.3, z: 0.0, w: 6.2, y: 0.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.15, 'castPlant', { to: 0.42, speed: 1.8 }], [0.4, 'castPlant', { from: 0.2 }]],
    body: (t) => mixA(lookUp(t, te, te + 1.0, 25)),
    fx(A) { FX.pool(A, { t0: tp - 0.1, t1: te + 3.9, at: [c[0], 0, c[1]], r: 0.45, op: 0.55, whirl: 1 }); FX.column(A, { t: te, at: [c[0], 0, c[1]], h: 2.4, r: 0.55, dur: 0.75 }); A.hit(0, te + 0.02, 16, { wet: true, up: 3.0, big: true });
      for (let k = 0; k < 3; k++) { const t = te + 0.9 + k, i = 1 + (k % 2); FX.splash(A, { t: t - 0.05, at: [c[0], 0, c[1]], r: 0.3, h: 0.4, n: 4 }); FX.bubble(A, { t0: t, t1: t + 0.7, pop: false, r: 0.16, at: (tt) => { const b = A.dpt(i, t + 0.7, 0.62), u = EASE.s(clamp((tt - t) / 0.7)); return [lerp(c[0], b.x, u), lerp(0.4, b.y, u) + 0.5 * Math.sin(u * Math.PI), lerp(c[1], b.z, u)]; } }); }
      shieldOn(A, 1, te + 1.6, te + 4.0, (t) => t < te + 3.6 ? 8 : 16); shieldOn(A, 2, te + 2.6, te + 4.0, 8);
      A.cap(0.15, te + 4.0, '泉口留 5 秒，每秒吹一个泡泡给最近的队友', 'The vent stays 5 s and blows a bubble a second to the nearest friend'); } };
}
// F21 Store: the skin darkens with each hit it stores, then bursts from inside: it pays back all of it, 30% more
{ const me = [-2.2, 0.2], d0 = [0.3, 0.2], al = [1.4, -0.5]; const tc = 0.3 + 0.6, ts = tc + 0.6, tp = ts + 1.5;
  B.F21 = { T: tp + 1.0, cam: { x: -0.5, z: 0.0, w: 6.0, y: 0.7 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1], { soaked: true }], [al[0], al[1], { ally: true, face: 150 }]], seq: [[0.3, 'castBloom'], [ts + 0.2, 'castPoint', { speed: 1.4 }], [ts + 0.8, 'castPoint', { speed: 1.4 }]],
    body: (t) => mixA(pawUp(t, 0.4, 1.0, 0.6), shake(t, tp + 0.4, 0.5, 0.6)),
    fx(A) { const hs = [ts + 0.3, ts + 0.55, ts + 0.85, ts + 1.15], vs = [14, 18, 14, 22]; const dk = (t) => { let n = 0; hs.forEach((h) => { if (t > h) n++; }); return n / 4; };
      const bAt = (t) => t < ts ? (() => { const s = A.at('tip', tc), u = EASE.s(clamp((t - tc) / 0.6)); const q = A.dpt(0, ts, 0.6); return [lerp(s.x, q.x, u), lerp(s.y, q.y, u) + 0.2 * Math.sin(u * Math.PI), lerp(s.z, q.z, u)]; })() : A.dpt(0, t, 0.6).toArray();
      A.hold(0, ts, tp, 0.7); FX.bubble(A, { t0: tc, t1: tp, at: bAt, r: (t) => t < ts ? 0.25 : 0.65, hits: hs, dark: (t) => 0.6 * dk(t) });
      hs.forEach((h, k) => { if (k % 2) foeBolt(A, { t: h - 0.2, d: 1, dur: 0.2, to: (t) => A.dpt(0, h, 0.6) }); else FX.bolt(A, { t: h - 0.2, to: (t) => A.dpt(0, h, 0.6), dur: 0.2, r: 0.08 }); A.hit(0, h, vs[k], { col: '#7FA6EA', noStop: true }); });
      A.tag(0, ts + 0.1, tp, (t, lang) => { let s = 0; hs.forEach((h, k) => { if (t > h) s += vs[k]; }); return (lang === 'zh' ? '存 ' : 'Stored ') + s; }, C.foam);
      A.hit(0, tp, 88, { crash: true, big: true }); A.say(tp + 0.05, { zh: '68 × 1.3', en: '68 × 1.3' }, { col: C.sky }); FX.splash(A, { t: tp, at: [d0[0], 0, d0[1]], r: 0.9, h: 1.0, crash: true }); A.shake(tp, 0.07, 0.22);
      A.cap(0.3, tp, '泡泡存下封住的敌人受到的所有伤害', 'The bubble keeps all damage dealt to the sealed foe'); A.cap(tp, tp + 1.0, '然后加 30% 一次还给它', 'Then pays it back, 30% more'); } };
}
// F22 Water door: no ripple: she dives into her own water and a pool somewhere else bulges and she is there at once
{ const me = [-2.0, 0.6], p0 = [-1.3, 0.6], p1 = [1.4, -0.6], ds = [[2.0, -0.2, { soaked: true }]]; const t0 = 0.3, tin = t0 + 0.4, tout = tin + 0.25;
  B.F22 = { T: 3.4, cam: { x: -0.2, z: 0.0, w: 6.4, y: 0.6 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'tuckAir', { loop: true, until: tout + 0.5, fade: 0.15 }], [tout + 0.5, 'castPoint', { from: 0.25 }]],
    root: [{ t: t0 }, { t: tin, x: p0[0], z: p0[1], y: -0.4, jump: 0.6, pitch: 120, e: 'lin' }, { t: tout - 0.01, x: p0[0], z: p0[1], y: -0.6, pitch: 120, cut: true }, { t: tout, x: p1[0], z: p1[1], y: -0.6, pitch: -60, look: ds[0], cut: true }, { t: tout + 0.3, x: p1[0] + 0.1, z: p1[1], y: 0.9, pitch: -300, e: 'out' }, { t: tout + 0.55, x: p1[0] + 0.2, z: p1[1], y: 0, pitch: -360, e: 'in' }],
    hide: [[tin, tout]], body: (t) => shake(t, 2.9, 0.4, 0.6),
    fx(A) { for (const [p, r] of [[p0, 0.6], [p1, 0.6], [[-0.2, 1.4], 0.45], [[0.6, -1.5], 0.45]]) FX.puddle(A, { t0: 0, t1: 3.4, at: [p[0], 0, p[1]], r, op: 0.45 });
      FX.splash(A, { t: tin, at: [p0[0], 0, p0[1]], r: 0.4, h: 0.4 }); FX.bubble(A, { t0: tin, t1: tout + 0.05, at: [p1[0], 0.05, p1[1]], r: (t) => 0.2 + 0.45 * clamp((t - tin) / 0.25), tall: 0.4, op: 0.6 });
      FX.column(A, { t: tout, at: [p1[0], 0, p1[1]], h: 1.3, r: 0.3, dur: 0.5, fall: true }); A.hit(0, tout + 0.05, 14, { wet: true, up: 0.6 });
      A.cap(t0, 3.4, '从房间里她的任意一片水中立刻钻出', 'She comes up at once from any of her water in the room'); } };
}
// F23 Reflection: the friend's next skill is followed by its own shape in clear water, a half beat late, for 40%
{ const me = [-2.4, 0.5], al = [-0.4, 0.0], ds = [[al[0], al[1], { ally: true, face: 90 }], [0.6, -0.4], [0.7, 0.55, { soaked: true }]]; const tc = 0.3 + 0.44, ts = 1.8;
  B.F23 = { T: 3.8, cam: { x: -0.6, z: 0.2, w: 6.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPoint']], root: [{ t: 0.3, look: al }],
    fx(A) { FX.rope(A, { t0: tc - 0.05, t1: tc + 0.4, from: 'tip', to: (t) => A.dpt(0, t, 0.65), w: 0.07 }); FX.bubble(A, { t0: tc + 0.3, t1: ts, at: { d: 0, y: 0.62 }, r: 0.62, op: 0.35, pop: false });
      // the friend's own skill (a slam ring in parchment), then its water copy half a beat later
      A.turn(0, ts - 0.15, -30, 0.1); A.turn(0, ts + 0.05, 30, 0.2); FX.ring(A, { t: ts, at: { d: 0, y: 0 }, r0: 0.3, r1: 1.6, dur: 0.35, col: C.parch, op: 0.9, w: 0.12 }); A.hit(1, ts + 0.1, 30, {}); A.hit(2, ts + 0.12, 30, {});
      const tr = ts + 0.45; FX.ringwave(A, { t: tr, at: { d: 0, y: 0 }, r0: 0.3, r1: 1.6, h: 0.5, dur: 0.4 }); A.hit(1, tr + 0.1, 12, { soak: true }); A.hit(2, tr + 0.12, 19, { crash: true }); A.say(tr + 0.1, { zh: '倒影 40%', en: 'Reflection 40%' }, { col: C.sky });
      A.cap(0.3, 3.8, '队友的下一个技能（大招也算）放两次：第二次 40%', "The friend's next skill, a big one too, is cast twice: the second for 40%"); } };
}
// F24 Same boat: the dome is one great bubble: its skin dents and rings with every blow it takes for the friends inside, up to 60; cracks of light run over it before it falls in
{ const me = [-0.8, 0.3], als = [[-0.2, 0.9], [0.1, -0.4]], ds = [...als.map((a) => [a[0], a[1], { ally: true, face: 0 }]), [2.5, 0.6], [-2.6, -0.6], [1.9, -1.4]]; const t0 = 0.3, tu = t0 + 0.9, tf = 3.8;
  const hs = [1.7, 2.1, 2.5, 2.9, 3.3], vs = [14, 12, 14, 10, 10];
  B.F24 = { T: 4.8, cam: { x: -0.1, z: 0.1, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'whip', { to: 0.4 }], [0.6, 'castBloom', { from: 0.3 }], [3.5, 'castPlant', { from: 0.25 }]],
    body: (t) => mixA(coil(t, 0.3, 0.75, 0.8), lookUp(t, 0.9, 1.8, 25), shake(t, 4.2, 0.5, 0.7)),
    fx(A) { FX.dome(A, { t0: tu, t1: tf + 0.35, at: [0, 0, 0.2], r: 2.2, flat: 0.75, op: 0.4, grow: 0.5, fall: tf, hits: hs, col: C.bubble });
      hs.forEach((h, k) => { const i = 2 + (k % 3); foeBolt(A, { t: h - 0.35, d: i, dur: 0.35, to: (t) => { const q = A.dpos(i, h), dx = q.x, dz = q.z - 0.2, l = Math.hypot(dx, dz); return [dx / l * 2.15, 0.7, 0.2 + dz / l * 2.15]; } }); });
      A.hud(gaugeHud('同舟：替队友挡 60', 'Same boat: 60 for friends', (t) => t < tu ? null : t < tf ? (() => { let v = 60; hs.forEach((h, k) => { if (t > h) v -= vs[k]; }); return v / 60; })() : null, { col: C.foam }));
      hs.forEach((h, k) => A.say(h, { zh: '-' + vs[k], en: '-' + vs[k] }, { col: C.foam })); A.tag(0, 1.6, 3.6, ['无伤', 'Untouched'], C.foam); A.tag(1, 1.6, 3.6, ['无伤', 'Untouched'], C.foam);
      FX.ringwave(A, { t: tf + 0.25, at: [0, 0, 0.2], r0: 2.2, r1: 0.4, h: 0.9, dur: 0.35 }); FX.splash(A, { t: tf + 0.35, at: [0, 0, 0.2], r: 1.2, h: 1.0, crash: true });
      A.cap(t0, tf, '大招：水穹是一个大泡泡：替里面的队友挨所有打，最多 60', 'Big skill: the dome is one great bubble: it takes every hit meant for the friends inside, up to 60'); } };
}
