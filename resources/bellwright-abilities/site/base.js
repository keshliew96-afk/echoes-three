// The 26 skills in Base (kit 1.1, section 4).
import { DEFS, H, FX, C, EASE, clamp, lerp, hang, tollFx, beatFx, noteBolt, shotBell, drumBell, inRing, inFan, ward, held, pipsHud, knockHud, gaugeHud, foeBolt, foeSwing, ticks, beatsOf, friendsIn, KB, D2R,
  rock, rockSlow, baton, beat, conduct, listen, flare, clap, nod, crouch, onToes, turnTrunk, lookUp, antFlick, antQuiver, antDroop, antUp, antCurl, knock, toss, pawOut, tapTime, shove, floorCircle, mixA } from './defs.js';
import { lull, friendSwing, soloOn } from './defs.js';
export const ME = [-2.2, 0];
export { DEFS };
// a pointer cross on the floor
export const ptr = (A, at, t0, t1) => FX.pointer(A, { at: [at[0], 0, at[1]], t0, t1 });
// a summoned bell tapped at her mallet and sent flying (the clapper look): returns nothing
export function batBell(A, t, to, o = {}) { const p0 = A.at('tip', t - 0.12); FX.bell(A, { t0: t - 0.16, t1: t + (o.dur || 0.25), h: o.h || 0.2, fade: true, strikes: [t], at: (tt) => { if (tt < t) return [p0.x, p0.y, p0.z]; const u = clamp((tt - t) / (o.dur || 0.25)); const q = typeof to === 'function' ? to(t + (o.dur || 0.25)) : to; return [lerp(p0.x, q[0], u), lerp(p0.y, q[1] != null && q.length === 3 ? q[1] : 0.5, u), lerp(p0.z, q[q.length - 1], u)]; }, rot: (tt) => [tt > t ? -70 : 0, 0, 0] }); }
// a bell dropped in at a spot from above (Great Bell, Bell Jar ...)

// ---------------- Bell 钟
// F1 Hang Bell: 【挂】a bell at the pointer, 4 u (toll 7 a beat, slows 20%)
{ const p = [0.4, 0.1], d0 = [0.9, -0.5], d1 = [0.1, 0.75], d2 = [1.6, 1.1], B = beatsOf(1.6, 5.6);
  DEFS.F1 = { T: 6.0, cam: { x: -0.5, z: 0.1, w: 6.2 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.3, 'castPlant']], root: [{ t: 0.2, look: p }],
    body: (t) => mixA(listen(t, 1.3, 2.6), antFlick(t, B)),
    fx(A) { ptr(A, p, 0, 0.9); const tl = 0.3 + 0.56; batBell(A, 0.3 + 0.4, [p[0], 1.2, p[1]], { dur: 0.15 }); hang(A, { at: p, t0: tl, t1: 6.0, beats: B, drop: true, dropH: 0.9 }); beatFx(A, B);
      for (const i of [0, 1]) A.status(i, 1.6, 'slow', 4.3);
      A.cap(0.2, 1.5, '在指针处挂一口钟，4 u', 'A bell at the pointer, 4 u');
      A.cap(1.5, 6.0, '每拍鸣 7（1.3 u），减速 20%，挂 8 秒', 'It tolls 7 a beat (1.3 u), slows 20%; it hangs 8 s'); } };
}
// F2 Great Bell: 【挂】【撞】it lands: 14, dazed 0.6 s; then tolls 12 a second, 6 s
{ const p = [0.6, 0], d0 = [0.9, -0.6], d1 = [0.2, 0.55], d2 = [1.5, 0.6], tl = 1.25, B = beatsOf(2.25, 5.25);
  DEFS.F2 = { T: 6.0, cam: { x: -0.4, z: 0, w: 6.2 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.25, 'idle', { speed: 0.6 }]],
    root: [{ t: 0.2, look: p }, { t: tl - 0.12, fw: 0, y: 0 }, { t: tl + 0.05, y: 0.12, e: 'out' }, { t: tl + 0.25, y: 0, e: 'in' }],
    body: (t) => mixA(baton(t, 0.3, tl + 0.2), beat(t, tl), lookUp(t, 0.4, tl - 0.1, 16), listen(t, tl + 0.6, 2.8)),
    fx(A) { ptr(A, p, 0, tl); hang(A, { kind: 'great', at: p, t0: tl, t1: 6.0, beats: B, drop: true, dropH: 3.2, n: 12 }); FX.arcs(A, { t: tl, at: [p[0], 0.03, p[1]], r: 2.0, arc: 360, n: 2, op: 0.7 });
      for (const i of inRing(A, p, 1.9, tl)) A.hit(i, tl + 0.02, 14, { strike: true, stun: 0.6, big: true }); for (const i of [0, 1, 2]) A.status(i, 2.25, 'slow', 3.5);
      A.cap(0.2, tl, '指挥棒抬起、落下：巨钟砸下', 'The baton lifts and drops: the great bell falls');
      A.cap(tl, 2.2, '撞 14，眩晕 0.6 秒', 'Strike: 14, dazed 0.6 s');
      A.cap(2.2, 6.0, '每秒鸣 12（1.9 u），减速 35%，6 秒', 'It tolls 12 a second (1.9 u), slows 35%, 6 s'); } };
}
// F3 Bell Swing: 【撞】a bell swung across her front, 120°, 1.9 u: 18, knocked back 1 u
export function swingBell(A, ts, o = {}) { const h = o.h || 0.55, R = o.rad || 0.85; FX.bell(A, { t0: ts - 0.32, t1: ts + 0.42, h, strikes: [ts], at: (t) => { const r = A.rootAt(t); const u = EASE.io2(clamp((t - ts + 0.16) / 0.32)); const a = (-60 + 120 * u) * D2R * (o.dir || 1); const y = r.yaw + a; return [r.x + Math.sin(y) * R, 0.42, r.z + Math.cos(y) * R]; }, rot: (t) => { const u = clamp((t - ts + 0.16) / 0.32); return [0, A.rootAt(t).yaw / D2R + 90, (o.dir || 1) * 35 * Math.sin(u * Math.PI)]; } });
  FX.arcs(A, { t: ts - 0.04, at: 'him', yaw: (tt) => A.rootAt(tt).yaw, arc: 120, r: 1.9, dur: 0.38, op: 0.75 }); }
{ const d0 = [-0.7, 0.35], d1 = [-0.75, -0.6], d2 = [0.6, 0.9], ts = 0.3 + 0.44;
  DEFS.F3 = { T: 3.6, cam: { x: -1.2, z: 0, w: 5.4 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.3, 'castSweep']], root: [{ t: 0.2, look: [-0.5, 0] }],
    body: (t) => mixA(turnTrunk(t, 0.45, 0.95, 24), listen(t, 1.4, 3.0)),
    fx(A) { swingBell(A, ts); for (const i of inFan(A, ME, 90, 120, 1.9, ts)) { const p = A.dpos(i, ts), dx = p.x - ME[0], dz = p.z - ME[1], L = Math.hypot(dx, dz); A.hit(i, ts + 0.04, 18, { strike: true, knock: [dx / L, dz / L], dir: [dx / L, dz / L] }); }
      A.cap(0.2, 3.6, '横扫一口钟，120°，1.9 u：撞 18，击退 1 u', 'A bell swung across her front, 120°, 1.9 u: Strike 18, knocked back 1 u'); } };
}
// F4 Bell Jar: 【撞】a bell drops over one foe, 5 u: 14, trapped 1.5 s
{ const d0 = [0.6, 0.1], d1 = [1.3, -0.8], tl = 1.05, te = tl + 1.5;
  DEFS.F4 = { T: 4.6, cam: { x: -0.5, z: 0, w: 6.0 }, her: H(ME[0], ME[1]), dum: [[d0[0], d0[1], { gone: [[tl, te]] }], d1], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: d0 }],
    body: (t) => mixA(baton(t, 0.3, tl + 0.25), { upperarmR: [10 * Math.sin((t - 0.4) * 9) * (t > 0.4 && t < 0.95 ? 1 : 0), 18 * Math.cos((t - 0.4) * 9) * (t > 0.4 && t < 0.95 ? 1 : 0), 0] }, beat(t, tl), listen(t, tl + 0.4, te)),
    fx(A) { FX.bell(A, { kind: 'great', h: 1.35, floor: d0, t0: tl - 0.3, t1: te, drop: 0.3, dropH: 2.4, strikes: [tl, tl + 0.7, tl + 1.2], lift: true });
      FX.dust(A, { t: tl, at: [d0[0], 0.02, d0[1]], n: 10, sp: 0.9, dur: 0.5 }); FX.ring(A, { t: tl, at: [d0[0], 0.02, d0[1]], r0: 0.5, r1: 1.1, dur: 0.35, col: C.brass, op: 0.6, w: 0.1 }); A.shake(tl, 0.05, 0.2);
      A.hit(0, tl + 0.02, 14, { strike: true, big: true }); held(A, 0, tl + 0.1, te);
      A.cap(0.2, tl, '指挥棒画个圈，落下', 'The baton draws a circle and drops');
      A.cap(tl, 4.6, '一口钟扣住一个敌人，5 u：撞 14，困 1.5 秒', 'A bell drops over one foe, 5 u: Strike 14, trapped 1.5 s'); } };
}
// F5 Rolling Bell: 【撞】a bell rolls 6 u: 14, knocked aside; 【挂】it stands where it stops, 4 s
export function rollBell(A, o) { // o: t0 (push), from [x,z], dir [dx,dz] unit, dist, dur, stand (stands and hangs), h
  const h = o.h || 0.5, yaw = Math.atan2(o.dir[0], o.dir[1]) / D2R, tE = o.t0 + o.dur;
  const pos = (t) => { const u = clamp((t - o.t0) / o.dur), e = o.e ? EASE[o.e](u) : u; return [o.from[0] + o.dir[0] * o.dist * e, o.from[1] + o.dir[1] * o.dist * e]; };
  FX.bell(A, { t0: o.tset || o.t0 - 0.35, t1: o.stand ? tE + 0.3 + (o.hang || 4) : tE + 0.25, h, at: (t) => { const p = pos(t); const su = o.stand ? EASE.s(clamp((t - tE) / 0.3)) : 0; return [p[0], lerp(0.25, h / 2, su) + 0.02 * Math.abs(Math.sin((t - o.t0) * 18)) * (t < tE ? 1 : 0), p[1]]; },
    rot: (t) => { const su = o.stand ? EASE.back(clamp((t - tE) / 0.3)) : 0; const sp = t > o.t0 && t < tE ? (t - o.t0) * 900 : 0; return [lerp(90, 0, su), yaw + 90 * (1 - su), lerp(sp % 360, 0, su)]; }, strikes: o.beats || [] });
  for (let t = o.t0 + 0.08; t < tE; t += 0.12) { const p = pos(t); FX.dust(A, { t, at: [p[0], 0.02, p[1]], n: 2, sp: 0.4, dur: 0.35, seed: Math.floor(t * 77) }); }
  return pos;
}
{ const M5 = [-3.2, 0], d0 = [-1.3, 0.15], d1 = [0.0, -0.15], d2 = [1.4, 0.1], tp = 1.15, from = [M5[0] + 0.7, M5[1]], tE = tp + 1.2;
  DEFS.F5 = { T: 6.6, cam: { x: 0.1, z: 0, w: 8.0 }, her: H(M5[0], M5[1]), dum: [d0, d1, d2], seq: [[0.25, 'castPlant', { to: 0.62 }], [0.9, 'idle']], root: [{ t: 0.2, look: [2, 0] }],
    body: (t) => mixA(shove(t, tp), listen(t, tE + 0.4, 5.0)),
    fx(A) { const B = beatsOf(tE + 0.8, 6.4); const pos = rollBell(A, { t0: tp, tset: 0.6, from, dir: [1, 0], dist: 6, dur: 1.2, stand: true, beats: B });
      for (const i of [0, 1, 2]) { const p = A.dpos(i, 0); const tt = tp + (p.x - from[0]) / 6 * 1.2; A.hit(i, tt, 14, { strike: true, knock: [0, i === 1 ? -0.9 : 0.9], dir: [0, i === 1 ? -1 : 1] }); }
      const end = [from[0] + 6, from[1]]; for (const b of B) { tollFx(A, b, end, 1.3, { top: 0.5 }); for (const i of inRing(A, end, 1.3, b)) A.hit(i, b, 7, { ring: true, small: true, noStop: true }); }
      A.cap(0.2, tE, '钟侧放，用肩一顶：滚 6 u，撞 14，撞到一边', 'A bell on its side, one shove: it rolls 6 u: Strike 14, knocked aside');
      A.cap(tE, 6.6, '停下就立起挂着，4 秒', 'It stands where it stops and hangs 4 s'); } };
}
// F6 Muster: 【撞】every hung bell flies to the pointer: 10 to foes passed; their time is kept
{ const p = [0.9, 0.1], bs = [[-1.2, 1.5], [-0.6, -1.6], [2.3, -1.3]], d0 = [-0.2, 0.9], d1 = [0.3, -0.75], d2 = [1.6, 0.6], tf = 1.0;
  DEFS.F6 = { T: 5.4, cam: { x: 0.1, z: 0, w: 7.0 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: p }],
    body: (t) => mixA(baton(t, 0.3, 1.4), beat(t, tf - 0.05), antUp(t, tf - 0.1, 1.6), listen(t, 2.0, 4.6)),
    fx(A) { ptr(A, p, 0, 1.6); const dst = [[p[0] - 0.35, p[1] + 0.3], [p[0] - 0.3, p[1] - 0.35], [p[0] + 0.45, p[1]]], B = beatsOf(2.4, 5.4);
      bs.forEach((b, k) => { const q = dst[k], t1 = tf + 0.45; hang(A, { at: (t) => { const u = EASE.io2(clamp((t - tf) / 0.45)); return [lerp(b[0], q[0], u), lerp(b[1], q[1], u)]; }, t0: 0, t1: 5.4, beats: B.concat([tf + 0.45]), noLand: true, quiet: true, rot: (t) => { const u = clamp((t - tf) / 0.45); return [0, 0, 25 * Math.sin(u * Math.PI)]; } });
        FX.trail(A, { of: (t) => { const u = EASE.io2(clamp((t - tf) / 0.45)); return new A.THREE.Vector3(lerp(b[0], q[0], u), 0.3 + 0.5 * Math.sin(u * Math.PI), lerp(b[1], q[1], u)); }, t0: tf, t1: tf + 0.45, w: 0.14, col: C.brass, len: 0.2, op: 0.5 }); });
      A.hit(0, tf + 0.22, 10, { strike: true }); A.hit(1, tf + 0.25, 10, { strike: true });
      for (const b of B) for (const i of inRing(A, p, 1.6, b)) A.hit(i, b, 7, { ring: true, small: true, noStop: true });
      A.cap(0.2, tf, '指挥棒一举，触角指向指针', 'The baton, then both antennae snap to the pointer');
      A.cap(tf, 5.4, '所有挂着的钟飞到指针：经过的敌人撞 10；剩余时间不变', 'Every hung bell flies there: Strike 10 to foes passed; their time is kept'); } };
}
// F7 Peal: 【鸣】16 within 1.5 u of each bell, dazed 0.4 s
{ const bs = [[0.4, -0.7], [0.6, 1.0]], d0 = [0.9, -0.4], d1 = [0.1, -1.2], d2 = [1.0, 1.2], tb = [0.8, 1.04, 1.28];
  DEFS.F7 = { T: 4.4, cam: { x: -0.2, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.3, 'castBloom']], root: [{ t: 0.2, look: [0.6, 0] }],
    body: (t) => mixA(rock(t, 0.8, 3, 0.24, 1.1), listen(t, 2.0, 3.6)),
    fx(A) { const B = [3.3]; for (const b of bs) hang(A, { at: b, t0: 0, t1: 4.4, beats: B, strikes: [tb[2]], noLand: true });
      tb.forEach((t, k) => { const at = [[-1.75, -0.5], [-1.55, 0], [-1.75, 0.5]][k]; FX.bell(A, { t0: t - 0.12, t1: t + 0.5, h: 0.2, fade: true, at: [at[0], 0.62, at[1]], strikes: [t] }); FX.note(A, { t, at: [at[0], 0.62, at[1]], r1: 0.3 }); FX.note(A, { t, at: 'bellc', r1: 0.25, col: C.verd, op: 0.5 }); });
      for (const b of bs) { FX.arcs(A, { t: tb[2], at: [b[0], 0.03, b[1]], r: 1.5, arc: 360, n: 3, gap: 0.06, op: 0.8 }); for (const i of inRing(A, b, 1.5, tb[2] + 0.05)) A.hit(i, tb[2] + 0.06, 16, { stun: 0.4 }); }
      A.cap(0.2, 4.4, '摇三拍：每口钟 1.5 u 内 16，眩晕 0.4 秒', 'Three rocks: 16 within 1.5 u of each bell, dazed 0.4 s'); } };
}
// F8 Carillon (big): 【挂】【鸣】a tune: chimes hang round her until three bells play; eight strokes in 3 s, bell after bell: 10 within 1.8 u; every bell's time starts over
{ const b0 = [0.6, -0.2], d0 = [1.2, 0.3], d1 = [-1.3, -1.6], d2 = [-1.0, 1.7], t0 = 0.9, strokes = Array.from({ length: 8 }, (_, i) => +(t0 + 0.2 + i * 0.4).toFixed(2));
  DEFS.F8 = { T: 5.8, cam: { x: -0.6, z: 0, w: 6.8 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.3, 'idle', { speed: 0.5 }]], root: [{ t: 0.2, look: [0.6, 0] }],
    body: (t) => mixA(flare(t, 0.4, 4.6), conduct(t, t0, strokes[7] + 0.2, 8), baton(t, strokes[7] + 0.1, 4.8), onToes(t, strokes[7] - 0.1, 4.6), strokes.reduce((o, s) => mixA(o, beat(t, s, 0.6)), {})),
    fx(A) { const bells = [b0, [-1.6, -1.4], [-1.3, 1.5]]; hang(A, { at: b0, t0: 0, t1: 5.8, noLand: true, quiet: true, strikes: strokes.filter((_, i) => i % 3 === 0) });
      hang(A, { kind: 'chime', at: bells[1], t0: 0.55, t1: 5.8, drop: true, dropH: 1, quiet: true, strikes: strokes.filter((_, i) => i % 3 === 1) }); hang(A, { kind: 'chime', at: bells[2], t0: 0.75, t1: 5.8, drop: true, dropH: 1, quiet: true, strikes: strokes.filter((_, i) => i % 3 === 2) });
      strokes.forEach((s, i) => { const b = bells[i % 3]; FX.arcs(A, { t: s, at: [b[0], 0.03, b[1]], r: 1.8, arc: 360, n: i === 7 ? 3 : 1, op: 0.75 }); FX.note(A, { t: s, at: [b[0], 0.45, b[1]], r1: 0.4 }); for (const j of inRing(A, b, 1.8, s)) A.hit(j, s + 0.04, 10, { noStop: i < 7, small: i < 7 }); });
      A.cap(0.2, 1.0, '奏一曲：她身边挂上铃，凑够三口钟', 'A tune: chimes hang round her until three bells play');
      A.cap(1.0, 5.8, '3 秒八下，一钟接一钟：1.8 u 内 10；钟的时间重新算', 'Eight strokes in 3 s, bell after bell: 10 within 1.8 u; every bell starts over'); } };
}
// ---------------- Note 音
// F9 Clapper: 【音】a bolt, 4.8 u: 12
{ const d0 = [0.9, 0.1], d1 = [1.1, -1.0, { soaked: 3 }];
  DEFS.F9 = { T: 3.4, cam: { x: -0.5, z: -0.3, w: 5.8 }, her: H(ME[0], ME[1]), dum: [d0, d1], seq: [[0.3, 'castPoint'], [1.75, 'castPoint']], root: [{ t: 0.2, look: d0 }, { t: 1.5, look: d0 }, { t: 1.7, look: d1 }],
    fx(A) { A.ring(1, 0, 3.4); for (const [t, i] of [[0.66, 0], [2.11, 1]]) { batBell(A, t, (tt) => [A.dpt(i, tt, 0.6).x, 0.6, A.dpt(i, tt, 0.6).z], { dur: 0.22 }); noteBolt(A, { t, to: (tt) => A.dpt(i, tt, 0.6), dur: 0.22 }); A.hit(i, t + 0.22, 12, { note: true }); }
      A.cap(0.2, 1.7, '钟锤：一记音，4.8 u：12', 'A bolt, 4.8 u: 12');
      A.cap(1.7, 3.4, '打鸣震的敌人：18', 'On a Ringing foe: 18'); } };
}
// F10 Knell: 【音】a line, 5.5 u, through all: 15
export function soundLine(A, t, from, to, o = {}) { FX.tube(A, { t, pts: () => [new A.THREE.Vector3(from[0], 0.05, from[1]), new A.THREE.Vector3(to[0], 0.05, to[1])], flat: true, up: false, w: o.w || 0.42, col: o.col || C.brass, dur: o.dur || 0.22, hold: o.hold || 0.15, out: o.out || 0.3, op: o.op || 0.7 });
  const n = 6; for (let k = 0; k < n; k++) { const u = (k + 0.5) / n; FX.note(A, { t: t + (o.dur || 0.22) * u, at: [lerp(from[0], to[0], u), 0.45, lerp(from[1], to[1], u)], r1: 0.35, col: o.col || C.brass, op: 0.45 }); } }
{ const d0 = [-0.9, 0.1], d1 = [0.2, -0.1], d2 = [1.5, 0.2], d3 = [0.6, 1.2], tk = 0.3 + 0.5;
  DEFS.F10 = { T: 3.8, cam: { x: -0.2, z: 0.2, w: 6.6 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2, d3], seq: [[0.3, 'castPoint', { speed: 0.72 }]], root: [{ t: 0.2, look: [2, 0] }],
    body: (t) => mixA(nod(t, tk + 0.25, 1.3), antDroop(t, tk, 2.6)),
    fx(A) { FX.bell(A, { t0: 0.45, t1: tk + 0.6, h: 0.3, at: (t) => { const p = A.ahead(0.5, 0.45, 0.55); return [p.x, p.y, p.z]; }, tint: '#6A5A48', strikes: [tk] });
      soundLine(A, tk, [ME[0] + 0.4, 0], [ME[0] + 5.5, 0], { dur: 0.3, col: C.brass });
      for (const i of [0, 1, 2]) { const p = A.dpos(i, 0); A.hit(i, tk + 0.3 * (p.x - ME[0]) / 5.5, 15, { note: true }); }
      A.cap(0.2, 3.8, '慢敲一口暗钟，低头：一条线 5.5 u，穿过所有：15', 'A slow tap on a dark bell, a bowed head: a line, 5.5 u, through all: 15'); } };
}
// F11 Jingles: 【音】【震】five little bells, each to a different foe within 5 u: 7, Ringing 4 s
{ const ds = [[0.2, -1.2], [1.0, -0.4], [1.4, 0.6], [0.4, 1.3], [-0.6, 0.8]], tf = 0.95;
  DEFS.F11 = { T: 3.8, cam: { x: -0.3, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [0.8, 0] }],
    body: (t) => mixA(flare(t, 0.35, 0.8, 0.5), antQuiver(t, 0.4, 0.95), toss(t, tf), listen(t, 1.8, 3.2)),
    fx(A) { ds.forEach((d, i) => { const t1 = tf + 0.3 + i * 0.05; FX.bell(A, { t0: 0.4, t1, h: 0.13, fade: true, at: (t) => { if (t < tf) { const p = A.at('handL', t); return [p.x + 0.05 * (i - 2) * 0.4, p.y - 0.05 - i * 0.025, p.z]; } const p0 = A.at('handL', tf), q = A.dpt(i, t1, 0.8), u = clamp((t - tf) / (t1 - tf)); return [lerp(p0.x, q.x, u), lerp(p0.y, q.y, u) + 0.6 * Math.sin(u * Math.PI), lerp(p0.z, q.z, u)]; }, rot: (t) => [Math.sin(t * 40) * 20, 0, 0] });
        A.hit(i, t1, 7, { note: true, ring: 4 }); FX.note(A, { t: t1, at: (tt) => A.dpt(i, t1, 0.9), r1: 0.3 }); });
      A.cap(0.2, 3.8, '一串小铃：五个，各飞向 5 u 内不同的敌人：7，鸣震 4 秒', 'Five little bells, each to a different foe within 5 u: 7, Ringing 4 s'); } };
}
// F12 Deathwatch: 【音】marks one foe, 6 u: three knocks on the beat (3 each), then its knell: 30, and 12 within 1.5 u
{ const d0 = [0.7, 0.0], d1 = [1.4, 0.7], d2 = [1.2, -0.8], k3 = [1.0, 2.0, 3.0], tk = 4.0;
  DEFS.F12 = { T: 5.4, cam: { x: -0.4, z: 0, w: 6.2 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: d0 }],
    body: (t) => mixA(knock(t, 0.7, 3.3, k3), antFlick(t, k3), nod(t, tk + 0.1, 1.2)),
    fx(A) { A.tag(0, 0.5, tk, ['报丧', 'Watched'], C.brass); knockHud(A, 0, 0.5, tk + 0.1, (t) => k3.filter((k) => t >= k).length);
      for (const k of k3) { FX.note(A, { t: k, at: 'chest', r1: 0.2, col: C.verd, op: 0.6 }); FX.note(A, { t: k, at: (t) => A.dpt(0, k, 1.0), r1: 0.35 }); A.hit(0, k, 3, { note: true, small: true, noStop: true }); }
      FX.bell(A, { t0: tk - 0.35, t1: tk + 0.4, h: 0.45, tint: '#6A5A48', at: (t) => { const p = A.dpt(0, t, 1.6); return [p.x, p.y + 0.3 * (1 - clamp((t - tk + 0.35) / 0.3)), p.z]; }, strikes: [tk] });
      FX.arcs(A, { t: tk, at: (t) => A.dpt(0, tk, 0), r: 1.5, arc: 360, n: 3, gap: 0.07, op: 0.8 }); A.hit(0, tk + 0.02, 30, { note: true, big: true }); A.hit(1, tk + 0.06, 12, { note: true }); A.hit(2, tk + 0.06, 12, { note: true });
      A.cap(0.2, 3.4, '用锤柄敲自己的壳：标记一个敌人，6 u，每拍一敲 3', 'She knocks on her own shell: one foe marked, 6 u, three knocks on the beat, 3 each');
      A.cap(3.4, 5.4, '丧钟：30，1.5 u 内 12（敌人先死就传下去）', 'Its knell: 30, and 12 within 1.5 u (it passes on if the foe dies first)'); } };
}
// F13 Earworm: 【音】【震】a tune stuck on one foe, 5 s: 3 each half second, Ringing; it hops on at death
export function earBell(A, i, t0, t1, o = {}) { FX.bell(A, { t0, t1, h: 0.13, fade: true, at: (t) => { const p = A.dpt(i, t, 1.15), a = (t - t0) * 7; return [p.x + Math.cos(a) * 0.28, p.y + 0.05 * Math.sin(a * 2), p.z + Math.sin(a) * 0.28]; }, rot: (t) => [Math.sin(t * 30) * 25, 0, 0], col: o.col }); }
{ const d0 = [0.6, -0.3, { flat: [[2.8, 99]] }], d1 = [1.3, 0.6], d2 = [1.8, -0.9];
  DEFS.F13 = { T: 5.6, cam: { x: -0.2, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: d0 }],
    body: (t) => mixA(antCurl(t, 0.3, 1.2), listen(t, 1.2, 2.4)),
    fx(A) { noteBolt(A, { t: 0.9, from: 'atR', to: (t) => A.dpt(0, t, 1.1), dur: 0.25 }); earBell(A, 0, 1.15, 2.85); ticks(A, 0, 1.4, 2.8, 3, 0.5, { note: true, ring: true });
      A.card.dum[0].fellT = 2.85; noteBolt(A, { t: 2.85, from: (t) => A.dpt(0, 2.85, 1.1), to: (t) => A.dpt(1, t, 1.1), dur: 0.3, col: C.verd }); earBell(A, 1, 3.15, 5.6); ticks(A, 1, 3.4, 5.4, 3, 0.5, { note: true, ring: true });
      A.cap(0.2, 2.8, '触角卷一卷：一段旋律卡在一个敌人身上，5 秒，每 0.5 秒 3，鸣震', 'A tune stuck on one foe, 5 s: 3 each half second, Ringing all the while');
      A.cap(2.8, 5.6, '它死了：旋律跳到下一个', 'At its death the tune hops on'); } };
}
// F14 Call Chime: 【音】【挂】a chime at a spot, 5 u: 8; foes within 3.5 u are called 2 u to it
{ const p = [0.6, 0], ds = [[2.6, 1.4], [3.0, -0.9], [-0.6, -2.4], [0.2, 2.6]], tl = 1.0;
  DEFS.F14 = { T: 4.4, cam: { x: 0.3, z: 0, w: 7.6 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: p }],
    body: (t) => mixA(toss(t, 0.6), baton(t, 0.95, 1.8), { upperarmR: [t > 1.1 && t < 1.5 ? 18 * Math.sin((t - 1.1) / 0.4 * Math.PI) : 0, 0, 0], spine: [t > 1.1 && t < 1.5 ? -8 * Math.sin((t - 1.1) / 0.4 * Math.PI) : 0, 0, 0] }),
    fx(A) { ptr(A, p, 0, tl); FX.bell(A, { t0: 0.6, t1: tl, h: 0.24, fade: true, at: (t) => { const p0 = A.at('tip', 0.6), u = clamp((t - 0.6) / 0.4); return [lerp(p0.x, p[0], u), lerp(p0.y, 0.12, u) + 0.9 * Math.sin(u * Math.PI), lerp(p0.z, p[1], u)]; } });
      hang(A, { kind: 'chime', at: p, t0: tl, t1: 4.4, quiet: true, strikes: [tl + 0.1] }); FX.arcs(A, { t: tl + 0.1, at: [p[0], 0.03, p[1]], r: 3.5, arc: 360, n: 2, op: 0.6 });
      ds.forEach((d, i) => { const dx = p[0] - d[0], dz = p[1] - d[1], L = Math.hypot(dx, dz); A.hit(i, tl + 0.2, 8, { note: true }); A.move(i, tl + 0.25, [dx / L * 2, dz / L * 2], 0.45, 'out'); });
      A.cap(0.2, 4.4, '抛一个铃，5 u：8；3.5 u 内的敌人被召过去 2 u', 'A chime at a spot, 5 u: 8; foes within 3.5 u are called 2 u to it'); } };
}
// F15 Boom: 【音】hold to drum a great bell on its side; let go: a 60° cone, 3.5 u: 16 to 32, knocked back 1 to 3 u
{ const d0 = [0.4, 0.2], d1 = [0.9, -0.5], d2 = [1.2, 0.7], th = 0.5, tr = 2.6;
  DEFS.F15 = { T: 4.6, cam: { x: 0.3, z: 0, w: 7.6 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.3, 'combo3', { to: 0.2 }], [th, 'drumHold', { loop: true, until: tr, fade: 0.08 }], [tr, 'combo3', { from: 0.42 }]],
    root: [{ t: 0.2, look: [1, 0] }, { t: tr + 0.12, fw: 0, e: 'out' }, { t: tr + 0.35, fw: -0.25, e: 'out' }],
    body: (t) => mixA(listen(t, tr + 0.6, 4.2)),
    fx(A) { const r = A.rootAt(0.4), c = [ME[0] + 0.62, ME[1] - 0.2];
      FX.bell(A, { t0: 0.35, t1: tr + 0.5, h: 0.58, at: [c[0], 0.3, c[1]], fin: 0.18, rot: (t) => { let k = 0; const per = lerp(0.2, 0.08, clamp((t - th) / (tr - th))); if (t > th && t < tr) k = 4 * Math.exp(-(((t - th) % per) / per) * 4); if (t > tr + 0.1 && t < tr + 0.5) k += 12 * Math.exp(-(t - tr - 0.1) * 12); return [-98 + k, 90, 0]; } });
      for (let t = th, n = 0; t < tr; n++) { const per = lerp(0.2, 0.08, clamp((t - th) / (tr - th))); FX.note(A, { t, at: [c[0] + 0.3, 0.3, c[1]], r1: 0.2 + 0.2 * (t - th) / (tr - th), op: 0.4 }); t += per; }
      A.hud(gaugeHud('按住：越敲越响', 'Hold: it builds', (t) => t < th ? null : t < tr ? (t - th) / (tr - th) : t < tr + 0.6 ? 1 : null));
      const tb = tr + 0.1; FX.arcs(A, { t: tb, at: [c[0] + 0.3, 0.03, c[1]], yaw: 90, arc: 60, r: 3.5, dur: 0.55, n: 4, gap: 0.05, op: 0.85 }); A.shake(tb, 0.06, 0.25);
      for (const i of [0, 1, 2]) { const p = A.dpos(i, tb), L = Math.hypot(p.x - c[0], p.z - c[1]); A.hit(i, tb + 0.05 + L * 0.03, 32, { note: true, knock: [(p.x - c[0]) / L * 3, (p.z - c[1]) / L * 3], kdur: 0.45, big: i === 0 }); }
      A.cap(0.2, tr, '按住：敲侧放的大钟，越敲越快', 'Hold: she drums a great bell on its side, faster and faster');
      A.cap(tr, 4.6, '松开：60° 锥形，3.5 u：16 到 32，击退 1 到 3 u', 'Let go: a 60° cone, 3.5 u: 16 to 32, knocked back 1 to 3 u'); } };
}
// F16 Midnight (big): 【音】twelve strokes in 3 s, each a ring from her to 4 u: 4; the twelfth: 24, stun 0.8 s; she walks as it tolls
{ const ds = [[0.9, 0.5], [0.6, -1.1], [-1.6, 1.6], [1.6, -0.2]], t0 = 0.6, S = Array.from({ length: 12 }, (_, i) => +(t0 + i * 0.25).toFixed(2));
  DEFS.F16 = { T: 5.2, cam: { x: -0.4, z: 0.1, w: 7.0 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'walk', { loop: true, until: S[11] - 0.1, speed: 0.55 }], [S[11] - 0.1, 'idleHold', { loop: true, until: 5.2 }]],
    root: [{ t: 0.3, fw: 0 }, { t: S[11] - 0.1, fw: 1.0, e: 'lin' }],
    body: (t) => mixA(rockSlow(t, t0, S[11] + 0.1, 0.25, 0.9), flare(t, t0, 4.6, clamp((t - t0) / 3)), onToes(t, S[11] - 0.05, 4.4)),
    fx(A) { S.forEach((s, i) => { const last = i === 11; FX.arcs(A, { t: s, at: (t) => A.body(s, 0), follow: false, r: 4, arc: 360, dur: last ? 0.7 : 0.45, n: last ? 3 : 1, op: last ? 0.9 : 0.55, col: i % 2 ? C.verd : C.brass }); FX.note(A, { t: s, at: 'bellc', r1: last ? 0.6 : 0.25, col: C.verd });
        for (const j of [0, 1, 2, 3]) { const q = A.dpos(j, s), r = A.rootAt(s), L = Math.hypot(q.x - r.x, q.z - r.z); if (L <= 4.1) A.hit(j, s + L * 0.04, last ? 24 : i % 4 === 0 ? 4 : null, last ? { note: true, stun: 0.8, big: j === 0 } : { note: true, small: true, noStop: true }); } });
      A.hud((t, x, W, H2, k, lang) => { const n = S.filter((s) => t >= s).length; if (!n || t > S[11] + 1.2) return; const p = A.at('head', t).clone(); p.y += 0.8; p.project(A.cam); const cx = (p.x + 1) / 2 * W, cy = (1 - p.y) / 2 * H2;
        x.beginPath(); x.arc(cx, cy, 15 * k, 0, 6.283); x.fillStyle = 'rgba(14,12,8,0.8)'; x.fill(); for (let q = 0; q < 12; q++) { const a = -Math.PI / 2 + q * Math.PI / 6; x.beginPath(); x.arc(cx + Math.cos(a) * 10 * k, cy + Math.sin(a) * 10 * k, 2 * k, 0, 6.283); x.fillStyle = q < n ? C.brass : 'rgba(245,208,107,0.25)'; x.fill(); } });
      A.cap(0.2, S[10], '3 秒十二下，每下从她身上一圈到 4 u：4；她可以边走边敲', 'Twelve strokes in 3 s, each a ring from her to 4 u: 4; she walks as it tolls');
      A.cap(S[10], 5.2, '第十二下：24，眩晕 0.8 秒', 'The twelfth: 24, stun 0.8 s'); } };
}
// ---------------- Tune 律
// F17 Wing Hop: a 2.4 u hop, untouchable; 【挂】a chime where she left, 4 s
{ const d0 = [0.1, -0.5], d1 = [0.3, 0.5], tj = 0.5, tl2 = 0.95;
  DEFS.F17 = { T: 4.4, cam: { x: -1.3, z: 0, w: 6.2 }, her: H(-1.0, 0, 270), dum: [d0, d1], seq: [[0.3, 'hop']], root: [{ t: tj, fw: 0, y: 0 }, { t: tl2, fw: 2.4, y: 0, jump: 0.7, e: 'lin' }],
    body: (t) => mixA(listen(t, 1.4, 3.0, -1)), unseen: [[tj, tl2]],
    fx(A) { const p0 = [-1.0, 0]; hang(A, { kind: 'chime', at: p0, t0: tj + 0.05, t1: 4.4, beats: beatsOf(1.5, 4.4), noLand: false });
      foeBolt(A, { d: 0, t: 0.5, to: [-1.6, 0.8, 0], dur: 0.35 });
      A.cap(0.2, 4.4, '振翅跳 2.4 u，无敌；起跳处留一个铃 4 秒', 'A 2.4 u hop, untouchable; a chime stays where she left, 4 s'); } };
}
// F18 Vesper Chime (kit 1.2): it rings over the two friends foes are after: foes within 2 u of each are Lulled 4 s: 30% slower (45% if the friend stands in a ring)
{ const a0 = [-0.6, -1.0, { ally: true }], a1 = [0.2, 1.0, { ally: true }], f0 = [0.6, -1.3], f1 = [1.0, 1.4], f2 = [-0.2, -1.9], tb = [0.7, 1.3];
  DEFS.F18 = { T: 5.4, cam: { x: -0.7, z: 0.3, w: 7.2 }, her: H(ME[0], ME[1]), dum: [a0, a1, f0, f1, f2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [a0[0], a0[1]] }, { t: 1.0, look: [a0[0], a0[1]] }, { t: 1.2, look: [a1[0], a1[1]] }],
    body: (t) => mixA(baton(t, 0.3, 1.8), beat(t, tb[0]), beat(t, tb[1]), nod(t, tb[0] + 0.15, 0.7), nod(t, tb[1] + 0.15, 0.7), listen(t, 2.2, 5.0)),
    fx(A) { hang(A, { at: [0.0, 1.1], t0: 0, t1: 5.4, quiet: true, noLand: true, beats: beatsOf(2.0, 5.0) });
      A.move(2, 0.2, [-0.25, 0.25], 0.6, 's'); A.move(3, 0.2, [-0.3, -0.2], 0.6, 's'); A.move(4, 0.2, [-0.2, 0.4], 0.6, 's');
      for (const [i, t, foes, k] of [[0, tb[0], [2, 4], 30], [1, tb[1], [3], 45]]) { FX.bell(A, { t0: t - 0.1, t1: t + 0.6, h: 0.22, fade: true, at: (tt) => { const p = A.dpt(i, t, 1.55); return [p.x, p.y, p.z]; }, strikes: [t + 0.05] });
        FX.ring(A, { t: t + 0.05, at: (tt) => A.dpt(i, t, 0.02), r0: 0.3, r1: 2.0, dur: 0.6, col: C.pale, op: 0.6, w: 0.06 }); for (const f of foes) lull(A, f, t + 0.15, t + 4.15, k); }
      for (const [f, t, a] of [[2, 2.2, 0], [3, 2.6, 1], [4, 3.0, 0]]) { const p = A.dpos(a, t); foeSwing(A, f, t, [p.x, p.z]); }
      A.cap(0.2, 2.0, '指挥棒点两下：钟声响在敌人追的两个队友头上', 'The baton to each in turn: it rings over the two friends foes are after');
      A.cap(2.0, 5.4, '2 u 内的敌人入静 4 秒：移动和攻击慢 30%（队友站在钟圈里 45%）', 'Foes within 2 u are Lulled 4 s: 30% slower to move and attack (45% if the friend stands in a ring)'); } };
}
// F19 Tuning Fork (kit 1.2): friends within 3 u and she: 25% haste, 3 s
{ const a0 = [-1.2, 1.1, { ally: true }], a1 = [-0.9, -1.2, { ally: true }], a2 = [1.4, 0.4, { ally: true }], ts = 0.95;
  DEFS.F19 = { T: 4.6, cam: { x: -0.7, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: [a0, a1, a2], seq: [[0.25, 'castBloom', { to: 0.62 }], [0.87, 'bloomHold', { loop: true, until: 2.4 }]], root: [{ t: 0.2, look: [0, 0] }],
    body: (t) => mixA(pawOut(t, 0.4, 2.4, 0.7), lookUp(t, ts, 2.2, 12), antQuiver(t, ts, 2.2)),
    fx(A) { FX.fork(A, { t0: 0.35, t1: 2.5, at: 'handL', rot: () => [-10, 0, 0], hums: [ts] }); FX.note(A, { t: ts, at: 'handL', r1: 0.5, col: C.pale }); FX.arcs(A, { t: ts, at: 'him', r: 3, arc: 360, n: 3, gap: 0.12, col: C.verd, op: 0.6 });
      for (const i of [0, 1]) { A.tag(i, ts + 0.1, ts + 3, ['快 25%', 'Haste 25%'], C.brass); A.move(i, ts + 0.3, [1.6, 0], 1.0, 's'); } A.say(ts + 0.1, ['快 25%', 'Haste 25%'], { col: C.verd });
      A.cap(0.2, 4.6, '音叉敲在锤柄上举起：3 u 内的队友和她：快 25%，3 秒', 'The fork struck and held up: friends within 3 u and she: 25% haste, 3 s'); } };
}
// F20 Solo (kit 1.2, new): one friend plays the solo 4 s: 30% more damage; the first foe they fell starts the 4 s again, once
{ const a0 = [-0.3, 0.0, { ally: true }], f0 = [0.5, 0.4, { flat: [[2.15, 99]] }], f1 = [0.6, -0.6], f2 = [1.6, 0.3], tg = 1.0, tk = 2.1, te = tk + 4;
  DEFS.F20 = { T: 6.0, cam: { x: -0.4, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: [a0, f0, f1, f2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [a0[0], a0[1]] }],
    body: (t) => mixA(baton(t, 0.3, 1.2), beat(t, tg - 0.05), flare(t, tg - 0.1, tg + 0.8, 0.7), rock(t, tg + 0.3, 4, 0.2, 0.8)),
    fx(A) { FX.ring(A, { t: tg, at: [a0[0], 0.02, a0[1]], r0: 0.2, r1: 1.2, dur: 0.5, col: C.brass, op: 0.8, w: 0.08 }); FX.note(A, { t: tg, at: (t) => A.dpt(0, tg, 1.5), r1: 0.5 });
      soloOn(A, 0, tg + 0.05, tk + 0.05); soloOn(A, 0, tk + 0.1, 6.0, '独奏 · 再来 4 秒', 'Solo · 4 s again');
      for (const [f, t, n] of [[1, 1.4, 26], [1, 1.8, 26], [1, 2.05, 26], [2, 2.7, 26], [2, 3.2, 26], [3, 4.0, 26]]) friendSwing(A, 0, t, f, n);
      A.move(0, 3.4, [1.0, 0.1], 0.5, 's'); FX.arcs(A, { t: tk + 0.1, at: (t) => A.dpt(0, tk, 0), r: 1.0, arc: 360, n: 2, op: 0.8 });
      A.cap(0.2, tk, '独奏：一个队友独奏 4 秒：伤害 +30%（20 → 26）', 'Solo: one friend plays the solo 4 s: 30% more damage (20 → 26)');
      A.cap(tk, 6.0, '他打倒的第一个敌人让 4 秒重新开始，一次', 'The first foe they fell starts the 4 s again, once'); } };
}
// F21 Allegro: 5 s: the beat doubles (bells, Hum and counts); her basic attack is 30% faster
{ const b = [0.2, -0.2], d0 = [0.7, 0.3], d1 = [0.6, -0.8], t0 = 1.4, B = beatsOf(0.4, 1.4).concat(beatsOf(1.9, 5.4, 0.5));
  DEFS.F21 = { T: 5.8, cam: { x: -0.6, z: 0, w: 6.0 }, her: H(ME[0], ME[1]), dum: [d0, d1], seq: [[0.25, 'idle', { speed: 0.6 }], [3.4, 'combo', { speed: 1.3, to: 1.0 }]], root: [{ t: 0.2, look: [0.6, 0] }],
    body: (t) => mixA(tapTime(t, 0.9, 3.3, 0.25), antFlick(t, B)),
    fx(A) { hang(A, { at: b, t0: 0, t1: 5.8, beats: B, noLand: true }); beatFx(A, B);
      A.hud((t, x, W, H2, k, lang) => { const on = t >= t0 && t < t0 + 5; x.font = `700 ${Math.round(14 * k)}px Inter, "PingFang SC", system-ui, sans-serif`; x.textAlign = 'right'; x.fillStyle = on ? C.brass : C.parch; x.fillText((lang === 'zh' ? '拍 ' : 'Beat ') + (on ? '×2' : '×1'), W - 14 * k, H2 - 16 * k); });
      shotBell(A, { t: 3.4 + 0.22 / 1.3, to: [d0[0] - 0.1, d0[1]] });
      A.cap(0.2, 1.4, '拍：每秒一下', 'The beat: once a second');
      A.cap(1.4, 5.8, '快板 5 秒：拍子翻倍（钟、嗡鸣、计数）；普攻快 30%', 'Allegro, 5 s: the beat doubles (bells, Hum, counts); her attack is 30% faster'); } };
}
// F22 Curfew: 【震】a ring of sound 2.5 u wide, 3 s: small foes cannot cross it (an elite 1.5 s; a boss or champion crosses, dazed 0.4 s)
{ const c = [0.4, 0], f0 = [2.4, 0.9], f1 = [1.9, -1.4], f2 = [0.4, 0.2], bs = [2.6, -0.2, { boss: true }], t0 = 1.15, t1 = t0 + 3;
  DEFS.F22 = { T: 5.0, cam: { x: 0.5, z: 0, w: 7.2 }, her: H(ME[0], ME[1]), dum: [f0, f1, f2, bs], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: c }],
    body: (t) => mixA(floorCircle(t, 0.4, 1.1), listen(t, 1.4, 3.0)),
    fx(A) { ptr(A, c, 0, t0); FX.tube(A, { t: 0.4, pts: (A2) => Array.from({ length: 33 }, (_, k) => new A2.THREE.Vector3(c[0] + Math.cos(k / 32 * 6.283) * 1.25, 0.03, c[1] + Math.sin(k / 32 * 6.283) * 1.25)), flat: true, w: 0.05, col: C.brass, dur: 0.7, hold: 0.2, out: 0.3, op: 0.9 });
      FX.fence(A, { t0, t1, at: [c[0], 0, c[1]], r: 1.25, h: 0.6, hits: [1.75, 2.15, 2.6] });
      A.move(0, 1.2, [-0.9, -0.35], 0.5, 's'); A.move(0, 1.75, [0.35, 0.15], 0.25, 'out'); A.hit(0, 1.75, null, {});
      A.move(1, 1.4, [-0.6, 0.55], 0.45, 's'); A.move(1, 2.15, [0.3, -0.25], 0.25, 'out'); A.hit(1, 2.15, null, {});
      A.move(2, 1.6, [0.75, 0], 0.4, 's'); A.move(2, 2.0, [-0.3, 0], 0.25, 'out');
      A.hit(3, 2.6, null, { stun: 0.25 }); A.tag(3, 2.6, 3.2, ['越过，眩晕', 'Crosses, dazed'], C.stun);
      A.cap(0.2, t0, '锤子在地上画一个圈', 'The mallet draws a circle on the floor');
      A.cap(t0, 5.0, '声圈 2.5 u，3 秒：小敌人过不去（精英 1.5 秒；首领越过，晕 0.4 秒）', 'A ring of sound, 2.5 u, 3 s: small foes cannot cross (elites 1.5 s; a boss crosses, dazed)'); } };
}
// F23 Click: 【撞】she snaps her shell and is flung to the pointer, 4 u, untouchable; small foes within 1.5 u land on their backs 1 s: 10
{ const p = [1.6, 0], ds = [[2.3, 0.6, { flat: [[1.35, 2.35]] }], [1.9, -0.8, { flat: [[1.35, 2.35]] }], [0.9, 0.7, { flat: [[1.35, 2.35]] }]], tj = 0.75, tl = 1.3;
  DEFS.F23 = { T: 4.4, cam: { x: 0.0, z: 0, w: 7.0 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }], [tj - 0.1, 'tuck', { loop: true, until: tl + 0.5, fade: 0.06 }], [tl + 0.5, 'idle', { fade: 0.2 }]],
    root: [{ t: 0.2, look: p }, { t: tj, fw: 0, y: 0, pitch: 0 }, { t: tl, fw: 3.8, y: 0.15, jump: 1.3, pitch: -180, e: 'lin' }, { t: tl + 0.25, fw: 3.85, y: 0.18, pitch: -180 }, { t: tl + 0.5, fw: 3.85, y: 0.25, pitch: -360, jump: 0.3, e: 's' }, { t: tl + 0.7, fw: 3.85, y: 0, pitch: -360 }],
    body: (t) => mixA(clap(t, tj), crouch(t, 0.3, tj, 1)), unseen: [[tj, tl]],
    fx(A) { ptr(A, p, 0, tl); FX.note(A, { t: tj, at: 'chest', r1: 0.5, col: C.pale, op: 0.8 }); FX.spark(A, { t: tj, at: 'chest', r: 0.6, col: C.brass, op: 0.6 });
      FX.arcs(A, { t: tl, at: [p[0], 0.03, p[1]], r: 1.5, arc: 360, n: 2, op: 0.8 }); A.shake(tl, 0.05, 0.2);
      for (const i of [0, 1, 2]) { A.hit(i, tl + 0.03, 10, { strike: true }); A.launch(i, tl + 0.03, 0.3); A.tag(i, tl + 0.2, tl + 1.05, ['翻倒', 'On its back'], C.stun); }
      A.cap(0.2, tl, '收壳一弹：飞到指针，4 u，无敌', 'She snaps her shell and is flung to the pointer, 4 u, untouchable');
      A.cap(tl, 4.4, '背着地落下再翻起：1.5 u 内小敌人翻倒 1 秒：撞 10', 'She lands on her back and rocks up: foes within 1.5 u flipped 1 s: Strike 10'); } };
}
// F24 Anthem (big): 【挂】6 s: a bell over every friend's head and hers follows and tolls: 7 within 1.3 u; all 20% faster
export function headBell(A, who, t0, t1, beats, o = {}) { const at = (t) => { if (who === 'me') { const p = A.at('head', t); return [p.x, p.y + 0.85, p.z]; } const p = A.dpt(who, t, 1.85); return [p.x, p.y, p.z]; };
  FX.bell(A, { t0, t1, h: o.h || 0.32, at, strikes: beats, fin: 0.25, noShadow: true, tint: o.tint });
  for (const b of beats) { const p = at(b); tollFx(A, b, [p[0], p[2]], 1.3, { top: 0.1, col: o.col }); if (!o.quiet) for (const i of inRing(A, [p[0], p[2]], 1.3, b)) A.hit(i, b, o.n || 7, { ring: true, small: true, noStop: true }); } }
{ const a0 = [-1.1, 1.2, { ally: true }], a1 = [-0.8, -1.3, { ally: true }], ds = [[0.6, 1.4], [0.7, -1.7], [0.9, 0.1]], t0 = 1.1, B = beatsOf(1.6, 5.6);
  DEFS.F24 = { T: 6.0, cam: { x: -0.7, z: 0, w: 6.6 }, her: H(ME[0], ME[1]), dum: [a0, a1].concat(ds), seq: [[0.25, 'castBloom', { to: 0.62 }], [0.87, 'bloomHold', { loop: true, until: 1.4 }], [1.4, 'walk', { loop: true, until: 5.6, speed: 1.2 }]],
    root: [{ t: 0.2, look: [0, 0] }, { t: 1.4, fw: 0 }, { t: 5.6, fw: 1.6, sd: 0.3, e: 'lin' }],
    body: (t) => mixA(flare(t, 0.3, 1.6), baton(t, 1.4, 5.6, 0.8), B.reduce((o, b) => mixA(o, beat(t, b, 0.5)), {})),
    fx(A) { headBell(A, 'me', t0, 6.0, B); headBell(A, 0, t0, 6.0, B); headBell(A, 1, t0, 6.0, B);
      A.move(0, 1.4, [1.6, 0.2], 4.2, 'lin'); A.move(1, 1.4, [1.6, 0.4], 4.2, 'lin');
      A.say(t0, ['全队快 20%', 'All 20% faster'], { col: C.brass }); for (const i of [0, 1]) A.tag(i, t0, 6.0, ['快 20%', '20% faster'], C.brass);
      A.cap(0.2, t0, '翅鞘全开，锤子高举一拍', 'Wing cases wide, the mallet high, held a beat');
      A.cap(t0, 6.0, '6 秒：每个队友和她头上一口钟跟着走，每拍 7（1.3 u）；全队快 20%', '6 s: a bell over every friend’s head and hers tolls 7 (1.3 u); all 20% faster'); } };
}
// ---------------- Passives
// F25 Hum: each beat, 4 to the 3 nearest foes within 2.2 u
{ const ds = [[-1.2, 0.8], [-0.9, -0.9], [-0.3, 0.3], [1.0, 1.2]], B = beatsOf(0.8, 4.8);
  DEFS.F25 = { T: 5.2, cam: { x: -1.0, z: 0, w: 5.8 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0, 'walk', { loop: true, until: 5.2, speed: 0.5 }]], root: [{ t: 0, fw: 0 }, { t: 5.2, fw: 1.2, e: 'lin' }],
    body: (t) => mixA(B.reduce((o, b) => mixA(o, rock(t, b, 1, 0.24, 0.5)), {}), antFlick(t, B)),
    fx(A) { beatFx(A, B, { op: 0.7 }); for (const b of B) { const r = A.rootAt(b); FX.ring(A, { t: b, at: [r.x, 0.02, r.z], r0: 0.3, r1: 2.2, dur: 0.4, col: C.verd, op: 0.45, w: 0.06 });
        const near = [0, 1, 2, 3].map((i) => { const p = A.dpos(i, b); return [i, Math.hypot(p.x - r.x, p.z - r.z)]; }).filter((x) => x[1] <= 2.4).sort((a, c) => a[1] - c[1]).slice(0, 3); for (const [i] of near) A.hit(i, b + 0.05, 4, { small: true, noStop: true }); }
      A.cap(0, 5.2, '每拍：2.2 u 内最近的 3 个敌人各 4（背上的钟随拍摆）', 'Each beat: 4 to the 3 nearest foes within 2.2 u (her back bell sways)'); } };
}
// F26 Alarm Bell: 【震】when she is hit, the bell on her back rings: 6 within 1.5 u; once a second
{ const ds = [[-1.4, 0.6], [-1.3, -0.6], [-0.4, 0.2]], hits = [0.8, 1.2, 2.3];
  DEFS.F26 = { T: 4.0, cam: { x: -1.4, z: 0, w: 5.2 }, her: H(ME[0], ME[1]), dum: ds, seq: hits.map((t) => [t, 'hurt']), root: [{ t: 0, look: [0, 0] }],
    fx(A) { foeSwing(A, 0, hits[0] - 0.1, ME); foeSwing(A, 1, hits[1] - 0.1, ME); foeBolt(A, { d: 2, t: hits[2] - 0.3, to: (t) => A.body(t, 0.5), dur: 0.3 });
      for (const t of hits) A.say(t, ['-5', '-5'], { col: C.foe });
      for (const t of [hits[0], hits[2]]) { FX.note(A, { t, at: 'bellc', r1: 0.45, col: C.verd, op: 0.8 }); FX.arcs(A, { t, at: 'him', r: 1.5, arc: 360, n: 2, col: C.verd, op: 0.75 }); for (const i of inRing(A, ME, 1.5, t)) A.hit(i, t + 0.05, 6, { ring: true }); }
      A.tag(0, hits[1], hits[1] + 0.6, ['1 秒一次', 'Once a second'], C.parch);
      A.cap(0, 4.0, '她被打中：背上的钟自己响，1.5 u 内 6，鸣震；每秒一次', 'When she is hit, her back bell rings: 6 within 1.5 u, Ringing; once a second'); } };
}
