// Bell Array 钟阵 forms: many bells round one giant Bourdon 洪钟, joined by chords 弦 (T1: five bells; chords toll 4 a beat within 4 u).
import { DEFS, FORMS, H, FX, C, EASE, clamp, lerp, hang, tollFx, beatFx, noteBolt, shotBell, drumBell, inRing, inFan, ward, held, pipsHud, knockHud, gaugeHud, foeBolt, foeSwing, ticks, beatsOf, friendsIn, KB, D2R,
  rock, rockSlow, baton, beat, conduct, listen, flare, clap, nod, crouch, onToes, turnTrunk, lookUp, antFlick, antQuiver, antDroop, antUp, antCurl, knock, toss, pawOut, tapTime, shove, floorCircle, mixA } from './defs.js';
import { lull, friendSwing, soloOn } from './defs.js';
import { ME, ptr, batBell, swingBell, rollBell, soundLine, earBell, headBell } from './base.js';
const F = FORMS.ar;
const BO = (A, o) => hang(A, Object.assign({ kind: 'bourdon' }, o));
// chords from the Bourdon to each bell (points or fns), flashing on the beats; foes on a chord take 4 a beat (o.n)
const dseg = (p, a, b) => { const vx = b[0] - a[0], vz = b[1] - a[1], L2 = vx * vx + vz * vz || 1, u = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vz) / L2); return Math.hypot(p[0] - a[0] - vx * u, p[1] - a[1] - vz * u); };
export function chords(A, o) { const P = (q, t) => typeof q === 'function' ? q(t) : q; for (const b of o.to) { FX.chord(A, { a: (t) => { const p = P(o.from, t); return [p[0], 0, p[1]]; }, b: (t) => { const p = P(b, t); return [p[0], 0, p[1]]; }, t0: o.t0, t1: o.t1, beats: o.beats, w: o.w });
  if (!o.quiet) for (const bt of o.beats || []) for (const d of A.card.dum) { if (d.opt.ally) continue; const p = A.dpos(d.i, bt); if (dseg([p.x, p.z], P(o.from, bt), P(b, bt)) < 0.3) A.hit(d.i, bt, o.n || 4, { ring: true, small: true, noStop: true }); } } }
const capA = (A, t0, t1, zh, en) => A.cap(t0, t1, zh, en);

// B, D, P, P2 are in core.js. F1 Handful: three chimes in a fan, not one bell
{ const ps = [[0.3, -0.9], [0.7, 0], [0.3, 0.9]], ds = [[0.6, -1.2], [1.1, 0.3], [0.1, 1.3]], tt = [0.62, 0.8, 0.98], B = beatsOf(1.6, 4.6), bo = [-1.0, 1.6];
  F.F1 = { T: 5.0, cam: { x: -0.5, z: 0.2, w: 6.4 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'castPlant', { to: 0.5 }], [0.6, 'castPoint', { from: 0.3, to: 0.5, speed: 1.6 }], [0.78, 'castPoint', { from: 0.3, to: 0.5, speed: 1.6 }], [0.96, 'castPoint', { from: 0.3, to: 0.6, speed: 1.6 }]],
    root: [{ t: 0.55, look: ps[0] }, { t: 0.72, look: ps[1] }, { t: 0.9, look: ps[2] }], body: (t) => mixA(listen(t, 1.5, 3.0)),
    fx(A) { BO(A, { at: bo, t0: 0, t1: 5, beats: B, noLand: true, quiet: true }); ps.forEach((p, k) => { batBell(A, tt[k], [p[0], 0.15, p[1]], { dur: 0.2, h: 0.18 }); hang(A, { kind: 'chime', at: p, t0: tt[k] + 0.2, t1: 5, beats: B }); });
      chords(A, { from: bo, to: ps, t0: 1.2, t1: 5, beats: B });
      capA(A, 0.2, 5, '撒铃：三下轻敲，扇形撒三个铃，不是一口钟；弦连到洪钟', 'Handful: three quick taps, three chimes in a fan, not one bell; chords join them to the Bourdon'); } };
}
// F2 Bell hat: the Bourdon lands on the biggest foe and rides its head 4 s: tolls on it double; a small foe under it strikes blind
{ const el = [0.6, 0, { elite: true }], d1 = [1.4, 0.9], d2 = [1.3, -0.9], tl = 1.1, B = beatsOf(2.1, 4.9);
  F.F2 = { T: 5.4, cam: { x: -0.3, z: 0, w: 6.2 }, her: H(ME[0], ME[1]), dum: [el, d1, d2], seq: [[0.25, 'castPoint', { to: 0.4, speed: 0.7 }], [0.85, 'idle']], root: [{ t: 0.2, look: [0.6, 0] }],
    body: (t) => mixA(baton(t, 0.8, 1.4, 0.8), beat(t, 0.9), beat(t, 1.1), listen(t, 1.6, 3.2)),
    fx(A) { const top = (t) => { const p = A.dpt(0, t, 1.35); return [p.x, p.y + 0.45 + 0.04 * Math.sin(t * 9), p.z]; };
      FX.bell(A, { kind: 'great', h: 0.8, tint: KB.bourdon.tint, t0: tl - 0.3, t1: tl + 4, drop: 0.3, dropH: 2.5, at: top, strikes: B, rot: (t) => [0, 0, 6 * Math.sin(t * 4)] });
      A.hit(0, tl, 14, { strike: true, big: true }); for (const b of B) { const p = top(b); tollFx(A, b, [p[0], p[2]], 2.0, { double: true, top: 0.3 }); A.hit(0, b, 28, { ring: true, noStop: true }); for (const i of [1, 2]) A.hit(i, b + 0.03, 14, { ring: true, small: true, noStop: true }); }
      capA(A, 0.2, 2.0, '戴钟：锤子指向，空中轻敲两下：洪钟落在最大的敌人头上', 'Bell hat: she points, taps the air twice: the Bourdon lands on the biggest foe');
      capA(A, 2.0, 5.4, '骑在它头上 4 秒：对它鸣响翻倍', 'It rides its head 4 s: its tolls on it are double'); } };
}
// F3 Bat the bells: Bell Swing bats each hung bell within 2.5 u 3 u along her aim: 10 to foes passed
{ const bs = [[-1.3, 0.9], [-1.0, -1.0]], ds = [[0.4, 0.8], [0.8, -0.9], [-0.6, 0.1]], ts = 0.74;
  F.F3 = { T: 4.4, cam: { x: -0.6, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'castSweep'], [1.0, 'castSweep', { from: 0.3, speed: 1.3 }]], root: [{ t: 0.2, look: [0, 0] }],
    body: (t) => mixA(turnTrunk(t, 0.45, 1.5, 30), listen(t, 2.0, 3.6)),
    fx(A) { const bo = [-3.0, 1.6]; BO(A, { at: bo, t0: 0, t1: 4.4, noLand: true, quiet: true }); swingBell(A, ts); swingBell(A, 1.0 + 0.44 / 1.3, { dir: -1 });
      bs.forEach((b, k) => { const tb = ts + 0.1 * k, q = [b[0] + 3, b[1]]; hang(A, { at: (t) => { const u = EASE.out(clamp((t - tb) / 0.4)); return [lerp(b[0], q[0], u), lerp(b[1], q[1], u)]; }, t0: 0, t1: 4.4, noLand: true, quiet: true, strikes: [tb], rot: (t) => [0, 0, t > tb && t < tb + 0.4 ? 360 * (t - tb) / 0.4 : 0] });
        FX.trail(A, { of: (t) => { const u = EASE.out(clamp((t - tb) / 0.4)); return new A.THREE.Vector3(lerp(b[0], q[0], u), 0.3, lerp(b[1], q[1], u)); }, t0: tb, t1: tb + 0.4, w: 0.18, col: C.brass, len: 0.2 }); });
      chords(A, { from: bo, to: bs.map((b, k) => (t) => { const tb = ts + 0.1 * k, u = EASE.out(clamp((t - tb) / 0.4)); return [lerp(b[0], b[0] + 3, u), b[1]]; }), t0: 0, t1: 4.4, beats: [2.5, 3.5], quiet: true });
      A.hit(0, ts + 0.2, 10, { strike: true }); A.hit(1, ts + 0.3, 10, { strike: true }); A.hit(2, ts + 0.04, 18, { strike: true, knock: [0.8, 0] });
      capA(A, 0.2, 4.4, '击钟：横扫把 2.5 u 内挂着的钟顺着瞄准打出去 3 u：经过的敌人 10', 'Bat the bells: the swing bats each hung bell within 2.5 u 3 u along her aim: 10 to foes passed'); } };
}
// F4 Drum the jar: the Bourdon comes down over up to four small foes; five drummed strokes of 5; the last throws them out dazed
{ const c = [0.4, 0], ds = [[0.1, 0.35], [0.7, 0.35], [0.1, -0.35], [0.7, -0.35]], tl = 0.95, S = [1.55, 1.8, 2.05, 2.3, 2.6], tg = ds.map((d) => [[tl, S[4]]]);
  F.F4 = { T: 4.6, cam: { x: -0.4, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: ds.map((d, i) => [d[0], d[1], { gone: tg[i] }]), seq: [[0.25, 'idle', { speed: 0.6 }], [1.05, 'run', { loop: true, until: 1.45, speed: 0.8 }], [1.45, 'drumHold', { loop: true, until: 2.5 }], [2.5, 'combo3', { from: 0.42 }]],
    root: [{ t: 0.2, look: c }, { t: 1.05, fw: 0 }, { t: 1.45, fw: 1.25, sd: 0.55, e: 'lin' }, { t: 1.5, look: c }],
    body: (t) => mixA(baton(t, 0.3, 1.0), beat(t, tl)),
    fx(A) { FX.bell(A, { kind: 'great', h: 1.5, tint: KB.bourdon.tint, floor: c, t0: tl - 0.3, t1: 3.3, drop: 0.3, dropH: 2.5, strikes: S, lift: true });
      FX.dust(A, { t: tl, at: [c[0], 0.02, c[1]], n: 14, sp: 1.1, dur: 0.5 }); A.shake(tl, 0.06, 0.2);
      S.forEach((s, k) => { FX.note(A, { t: s, at: [c[0], 1.1, c[1]], r1: k === 4 ? 0.9 : 0.5 }); for (const i of [0, 1, 2, 3]) A.hit(i, s + 0.02, 5, { ring: true, small: k < 4, noStop: k < 4 }); });
      ds.forEach((d, i) => { const dx = d[0] - c[0], dz = d[1] - c[1], L = Math.hypot(dx, dz); A.move(i, S[4] + 0.05, [dx / L * 1.3, dz / L * 1.3], 0.35, 'out'); A.status(i, S[4] + 0.1, 'stun', 1.0); });
      FX.arcs(A, { t: S[4], at: [c[0], 0.03, c[1]], r: 2.2, arc: 360, n: 3, op: 0.85 });
      capA(A, 0.2, 1.5, '擂瓮：洪钟扣住最多四个小敌人', 'Drum the jar: the Bourdon comes down over up to four small foes');
      capA(A, 1.5, 4.6, '她跑到旁边擂鼓：五下各 5，最后一下把它们震出来，眩晕', 'She trots to its side and drums: five strokes of 5; the last throws them out dazed'); } };
}
// F5 Drag chord: the rolling bell stays chorded to the Bourdon however far; the chord sweeps with it: 8 to foes it crosses
{ const bo = [-2.4, -1.5], ds = [[-0.6, -0.7], [0.4, -0.2], [1.2, -0.9], [0.8, 1.0]], tp = 1.15, from = [-1.5, 0.6], tE = tp + 1.2;
  F.F5 = { T: 5.4, cam: { x: 0, z: 0, w: 7.6 }, her: H(-2.2, 0.6), dum: ds, seq: [[0.25, 'castPlant', { to: 0.62 }], [0.9, 'idle']], root: [{ t: 0.2, look: [3, 0.6] }],
    body: (t) => mixA(shove(t, tp), listen(t, tE + 0.4, 4.6)),
    fx(A) { BO(A, { at: bo, t0: 0, t1: 5.4, noLand: true, beats: [3.0, 4.0], quiet: true }); const pos = rollBell(A, { t0: tp, tset: 0.6, from, dir: [1, 0], dist: 4.5, dur: 1.0, stand: true, beats: [3.0, 4.0] });
      FX.chord(A, { a: [bo[0], 0, bo[1]], b: (t) => { const p = pos(t); return [p[0], 0, p[1]]; }, t0: 0.6, t1: 5.4, beats: [tp + 0.3, tp + 0.6, 3.0, 4.0], w: 0.05 });
      A.hit(0, tp + 0.35, 8, { ring: true }); A.hit(1, tp + 0.6, 8, { ring: true }); A.hit(2, tp + 0.85, 8, { ring: true }); A.hit(3, tp + 0.72, 14, { strike: true, knock: [0, 0.8] });
      capA(A, 0.2, 5.4, '牵弦：滚钟一直和洪钟连着弦；弦跟着扫过去：扫到的敌人 8', 'Drag chord: the rolling bell stays chorded to the Bourdon; the chord sweeps with it: 8 to foes it crosses'); } };
}
// F6 Formation: the Bourdon lands at the pointer, the rest in a ring round it; the chords snap shut: 12; each bell 2 s more
{ const p = [0.7, 0], bs = [[-1.4, 1.5], [-0.8, -1.7], [2.4, 1.6], [2.6, -1.4]], ds = [[1.5, 0.9], [0.0, -1.0], [1.6, -0.9], [-0.1, 1.1]], tf = 1.1;
  F.F6 = { T: 5.4, cam: { x: 0.2, z: 0, w: 7.6 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'castSweep', { to: 0.3 }], [0.55, 'castSweep', { from: 0.3, to: 0.62, speed: 0.6 }], [1.1, 'idle']], root: [{ t: 0.2, look: p }, { t: 0.55, spin: 0 }, { t: 1.08, spin: -360, e: 'io2' }],
    body: (t) => mixA(listen(t, 1.6, 3.4), flare(t, 0.5, 1.2, 0.6)),
    fx(A) { ptr(A, p, 0, tf); const ring = bs.map((_, k) => [p[0] + Math.cos(k * Math.PI / 2 + 0.78) * 2.5, p[1] + Math.sin(k * Math.PI / 2 + 0.78) * 2.5]), B = beatsOf(2.4, 5.4);
      BO(A, { at: (t) => { const u = EASE.io2(clamp((t - tf) / 0.45)); return [lerp(-3.4, p[0], u), lerp(0.5, p[1], u)]; }, t0: 0, t1: 5.4, noLand: true, beats: B.concat([tf + 0.45]), quiet: true });
      bs.forEach((b, k) => { hang(A, { at: (t) => { const u = EASE.io2(clamp((t - tf - 0.05 * k) / 0.45)); return [lerp(b[0], ring[k][0], u), lerp(b[1], ring[k][1], u)]; }, t0: 0, t1: 5.4, noLand: true, quiet: true, beats: B }); });
      chords(A, { from: p, to: ring, t0: tf + 0.5, t1: 5.4, beats: [tf + 0.55].concat(B), n: 4 }); for (const i of [0, 1, 2, 3]) A.hit(i, tf + 0.56, 12, { ring: true });
      FX.arcs(A, { t: tf + 0.5, at: [p[0], 0.03, p[1]], r: 2.6, arc: 360, n: 2, op: 0.8 });
      capA(A, 0.2, 5.4, '结阵：原地转一圈：洪钟落在指针，其余围成一圈；弦一合：12；每口钟多 2 秒', 'Formation: a full turn: the Bourdon lands at the pointer, the rest ring it; the chords snap shut: 12; each bell 2 s more'); } };
}
// F7 Chord peal: the peal runs down every chord too; a foe on two chords takes it twice
{ const bo = [0.2, 0], bs = [[1.6, 1.2], [1.8, -1.0], [-0.6, -1.5]], ds = [[0.9, 0.6], [1.0, -0.5], [-0.2, -0.75], [0.6, 1.6]], tb = [0.8, 1.04, 1.28];
  F.F7 = { T: 4.4, cam: { x: -0.1, z: 0, w: 7.0 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'castBloom']], root: [{ t: 0.2, look: bo }],
    body: (t) => mixA(rock(t, 0.8, 3, 0.24, 1.1), listen(t, 2.0, 3.6)),
    fx(A) { BO(A, { at: bo, t0: 0, t1: 4.4, noLand: true, quiet: true, strikes: [tb[2]] }); for (const b of bs) hang(A, { at: b, t0: 0, t1: 4.4, noLand: true, quiet: true, strikes: [tb[2]] });
      chords(A, { from: bo, to: bs, t0: 0, t1: 4.4, beats: [tb[2], tb[2] + 0.12], quiet: true, w: 0.06 });
      for (const b of [bo].concat(bs)) FX.arcs(A, { t: tb[2], at: [b[0], 0.03, b[1]], r: 1.5, arc: 360, n: 2, op: 0.7 });
      A.hit(0, tb[2] + 0.06, 16, { stun: 0.4 }); A.hit(0, tb[2] + 0.2, 16, { stun: 0.4 }); A.hit(1, tb[2] + 0.06, 16, { stun: 0.4 }); A.hit(2, tb[2] + 0.06, 16, { stun: 0.4 }); A.hit(3, tb[2] + 0.06, 16, { stun: 0.4 });
      capA(A, 0.2, 4.4, '弦鸣：齐鸣也沿每根弦跑一遍；站在两根弦上的挨两次', 'Chord peal: the peal runs down every chord too; a foe on two chords takes it twice'); } };
}
// F8 Great Toll: no tune: the Bourdon swells to 4 u, rises and falls: 60, stun 1 s; it keeps that size 6 s
{ const bo = [0.6, 0], ds = [[1.6, 1.4], [2.2, -1.0], [-0.6, -1.6], [0.3, 1.9], [2.7, 0.4]], tr = 1.2, tf = 2.0;
  F.F8 = { T: 5.6, cam: { x: 0.2, z: 0, w: 8.0 }, her: H(-2.6, 0), dum: ds, seq: [[0.25, 'idle', { speed: 0.5 }]], root: [{ t: 0.2, look: bo }],
    body: (t) => mixA(flare(t, 0.4, 2.4), onToes(t, 0.5, tf - 0.05), baton(t, 0.4, 2.2), beat(t, tf), crouch(t, tf, tf + 0.6, 0.8), listen(t, 2.8, 5.0)),
    fx(A) { const H0 = KB.bourdon.h; FX.bell(A, { kind: 'great', tint: KB.bourdon.tint, t0: 0, t1: 5.6, h: (t) => lerp(H0, H0 * 2.2, EASE.out(clamp((t - 0.5) / 0.7))), at: (t) => { const h = lerp(H0, H0 * 2.2, EASE.out(clamp((t - 0.5) / 0.7))); const up = t < tr ? 0 : t < tf - 0.12 ? 1.4 * EASE.out(clamp((t - tr) / 0.6)) : t < tf ? 1.4 * (1 - EASE.in((t - tf + 0.12) / 0.12)) : 0; return [bo[0], h / 2 + up, bo[1]]; }, strikes: [tf, 3.0, 4.0, 5.0] });
      FX.arcs(A, { t: tf, at: [bo[0], 0.03, bo[1]], r: 4, arc: 360, n: 3, gap: 0.08, op: 0.9 }); FX.ring(A, { t: tf, at: [bo[0], 0.02, bo[1]], r0: 1, r1: 4, dur: 0.5, col: C.verd, op: 0.5, w: 0.06 }); A.shake(tf, 0.1, 0.35);
      for (const i of [0, 1, 2, 3, 4]) A.hit(i, tf + 0.04, 60, { big: true, stun: 1.0 }); for (const b of [3.0, 4.0, 5.0]) tollFx(A, b, bo, 4.0, { double: true, top: 2.2 });
      capA(A, 0.2, tf, '洪钟大吕：不奏曲：洪钟涨到 4 u，升起', 'Great Toll: no tune: the Bourdon swells to 4 u and rises');
      capA(A, tf, 5.6, '砸下：60，眩晕 1 秒；6 秒内保持这么大', 'It falls: 60, stun 1 s; it keeps that size 6 s'); } };
}
// F9 Carom: the Clapper bounces bell to bell, through the foes between, then to the nearest foe; 25% more for each bell
{ const bs = [[-0.6, 1.1], [0.8, -0.6], [1.6, 1.0]], ds = [[-0.1, 0.25], [1.25, 0.2], [2.6, 0.2]], t0 = 0.66;
  F.F9 = { T: 3.8, cam: { x: 0.1, z: 0.2, w: 7.0 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'castPoint']], root: [{ t: 0.2, look: bs[0] }],
    fx(A) { BO(A, { at: [-1.8, -1.5], t0: 0, t1: 3.8, noLand: true, quiet: true }); for (const b of bs) hang(A, { at: b, t0: 0, t1: 3.8, noLand: true, quiet: true, strikes: [] });
      const pts = [[ME[0] + 0.4, 0]].concat(bs).concat([[ds[2][0], ds[2][1]]]); let t = t0; const legs = [];
      for (let k = 0; k < pts.length - 1; k++) { const a = pts[k], b = pts[k + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) / 9; legs.push([t, a, b, d]); noteBolt(A, { t, from: [a[0], 0.45, a[1]], to: [b[0], 0.45, b[1]], dur: d, r: 0.06 + 0.012 * k }); if (k < 3) { FX.note(A, { t: t + d, at: [b[0], 0.5, b[1]], r1: 0.4 }); } t += d; }
      A.hit(0, legs[1][0] + legs[1][3] * 0.4, 15, { note: true }); A.hit(1, legs[2][0] + legs[2][3] * 0.5, 18, { note: true }); A.hit(2, legs[3][0] + legs[3][3], 21, { note: true, big: true });
      capA(A, 0.2, 3.8, '串钟：钟锤在钟之间弹，穿过中间的敌人，最后打最近的敌人；每过一口钟 +25%', 'Carom: it bounces bell to bell, through the foes between, then to the nearest foe; 25% more per bell'); } };
}
// F10 Temple log: a log swings down the line: 18; if it strikes the Bourdon, that toll is double and 4 u wide
{ const bo = [1.4, 0], ds = [[-0.6, 0.1], [0.3, -0.1], [2.2, 1.6], [2.5, -1.7]], tk = 0.8;
  F.F10 = { T: 4.4, cam: { x: 0.2, z: 0, w: 7.6 }, her: H(ME[0], 0.6), dum: ds, seq: [[0.3, 'castSweep', { speed: 0.8 }]], root: [{ t: 0.2, look: [3, 0.6] }, { t: 0.4, sd: 0 }, { t: 0.7, sd: 0.6 }],
    body: (t) => mixA(nod(t, tk + 0.3, 0.8), turnTrunk(t, 0.6, 1.3, 20)),
    fx(A) { BO(A, { at: bo, t0: 0, t1: 4.4, noLand: true, quiet: true, strikes: [tk + 0.35] });
      const T3 = A.THREE, log = A.add(new T3.Mesh(new T3.CylinderGeometry(0.16, 0.16, 1.1, 12), new T3.MeshStandardMaterial({ color: '#6B4A2E', roughness: 0.9 }))); log.rotation.z = Math.PI / 2; log.visible = false;
      A.fx((t) => { const u = clamp((t - tk) / 0.38); log.visible = t > tk - 0.15 && t < tk + 0.9; if (!log.visible) return; const x = lerp(ME[0] + 0.2, bo[0] - 0.75, EASE.in2(u)) - (t > tk + 0.38 ? 0.4 * Math.sin((t - tk - 0.38) * 6) * Math.exp(-(t - tk - 0.38) * 4) : 0); log.position.set(x, 0.55, 0); log.material.opacity = 1; });
      soundLine(A, tk, [ME[0] + 0.4, 0], [ME[0] + 5.5, 0], { dur: 0.38 }); A.hit(0, tk + 0.12, 18, { note: true }); A.hit(1, tk + 0.25, 18, { note: true });
      FX.arcs(A, { t: tk + 0.38, at: [bo[0], 0.03, bo[1]], r: 4, arc: 360, n: 3, op: 0.85 }); tollFx(A, tk + 0.38, bo, 4, { double: true, top: 1 }); A.shake(tk + 0.38, 0.06, 0.25);
      for (const i of [0, 1, 2, 3]) A.hit(i, tk + 0.45, 28, { ring: true, noStop: i < 2 });
      capA(A, 0.2, 4.4, '撞木：她让开，挥手放一根木头顺着线撞下去：18；撞到洪钟，那一响翻倍，4 u 宽', 'Temple log: she steps aside and waves a log down the line: 18; if it strikes the Bourdon, that toll is double and 4 u wide'); } };
}
// F11 Belled: each little bell ties to its foe as a chime that follows it 4 s
{ const ds = [[0.2, -1.2], [1.0, -0.4], [1.4, 0.6], [0.4, 1.3], [-0.6, 0.8]], tf = 0.95, B = beatsOf(1.6, 4.6);
  F.F11 = { T: 5.0, cam: { x: 0.1, z: 0, w: 7.0 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [0.8, 0] }],
    body: (t) => mixA(flare(t, 0.35, 0.8, 0.5), antQuiver(t, 0.4, 0.95), toss(t, tf)),
    fx(A) { const bo = [-1.6, -1.8]; BO(A, { at: bo, t0: 0, t1: 5, noLand: true, quiet: true, beats: B });
      ds.forEach((d, i) => { const t1 = tf + 0.3 + i * 0.05; A.move(i, 1.6, [0.9 - 0.3 * i, 0.4 * (i % 2 ? -1 : 1)], 3.0, 's'); A.hit(i, t1, 7, { note: true, ring: 4 });
        FX.bell(A, { t0: tf, t1: 5, h: 0.32, at: (t) => { if (t < t1) { const p0 = A.at('handL', tf), q = A.dpt(i, t1, 0.9), u = clamp((t - tf) / (t1 - tf)); return [lerp(p0.x, q.x, u), lerp(p0.y, q.y, u) + 0.6 * Math.sin(u * Math.PI), lerp(p0.z, q.z, u)]; } const p = A.dpt(i, t, 0.95); return [p.x + 0.25, p.y, p.z]; }, strikes: B });
        for (const b of B) { const p = A.dpos(i, b); FX.ring(A, { t: b, at: [p.x, 0.02, p.z], r0: 0.2, r1: 1.0, dur: 0.3, col: C.brass, op: 0.6, w: 0.1 }); } });
      chords(A, { from: bo, to: [0, 3, 4].map((i) => (t) => { const p = A.dpos(i, t); return [p.x, p.z]; }), t0: 1.4, t1: 5, beats: B, quiet: true });
      capA(A, 0.2, 5.0, '系铃：每个小铃系在敌人身上，变成跟着它的铃，4 秒', 'Belled: each little bell ties to its foe as a chime that follows it 4 s'); } };
}
// F12 Many watchers: no one mark: the count runs on every foe in her rings, up to five: knell 20 each
{ const b1 = [-0.9, 1.6], b2 = [-1.0, -1.8], ds = [[0.0, 1.3], [0.9, 0.6], [0.2, -0.4], [1.1, -1.2], [2.4, 0.2]], k3 = [1.0, 2.0, 3.0], tk = 4.0;
  F.F12 = { T: 5.4, cam: { x: 0, z: 0, w: 7.0 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [0.6, 0] }],
    body: (t) => mixA(knock(t, 0.7, 3.3, k3), antFlick(t, k3), nod(t, tk + 0.1, 1.2)),
    fx(A) { hang(A, { at: b1, t0: 0, t1: 5.4, noLand: true, quiet: true }); BO(A, { at: b2, t0: 0, t1: 5.4, noLand: true, quiet: true });
      for (const i of [0, 1, 2, 3]) { knockHud(A, i, 0.5, tk + 0.1, (t) => k3.filter((k) => t >= k).length); for (const k of k3) A.hit(i, k, 3, { note: true, small: true, noStop: true });
        FX.bell(A, { t0: tk - 0.3, t1: tk + 0.4, h: 0.35, tint: '#6A5A48', at: (t) => { const p = A.dpt(i, t, 1.6); return [p.x, p.y, p.z]; }, strikes: [tk] }); FX.arcs(A, { t: tk, at: (t) => A.dpt(i, tk, 0), r: 1.0, arc: 360, op: 0.7 }); A.hit(i, tk + 0.02, 20, { note: true }); }
      capA(A, 0.2, 5.4, '众叩：不点名：她的钟圈里每个敌人都计数，最多五个：各 20 的丧钟', 'Many watchers: the count runs on every foe in her rings, up to five: a knell of 20 each'); } };
}
// F13 Far toll: the Earworm's carrier hears the Bourdon from anywhere: each toll strikes it and foes within 1 u
{ const bo = [-2.4, -1.6], ds = [[1.6, 0.3], [2.2, 0.9], [2.3, -0.4]], B = beatsOf(1.5, 4.5);
  F.F13 = { T: 5.2, cam: { x: 0, z: 0, w: 7.6 }, her: H(ME[0], 0.6), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: ds[0] }],
    body: (t) => mixA(antCurl(t, 0.3, 1.2), listen(t, 1.2, 3.0)),
    fx(A) { BO(A, { at: bo, t0: 0, t1: 5.2, noLand: true, quiet: true, beats: B }); noteBolt(A, { t: 0.9, from: 'atR', to: (t) => A.dpt(0, t, 1.1), dur: 0.3 }); earBell(A, 0, 1.2, 5.2); ticks(A, 0, 1.4, 5.0, 3, 0.5, { note: true, ring: true });
      for (const b of B) { FX.chord(A, { a: [bo[0], 0, bo[1]], b: (t) => { const p = A.dpos(0, b); return [p.x, 0, p.z]; }, t0: b - 0.02, t1: b + 0.3, beats: [b], w: 0.05 }); FX.arcs(A, { t: b + 0.05, at: (t) => A.dpt(0, b, 0), r: 1.0, arc: 360, op: 0.8 }); A.hit(0, b + 0.05, 14, { ring: true, noStop: true }); A.hit(1, b + 0.07, 14, { ring: true, small: true, noStop: true }); A.hit(2, b + 0.07, 14, { ring: true, small: true, noStop: true }); }
      capA(A, 0.2, 5.2, '遥钟：带着绕耳音的敌人在哪都听得到洪钟：每响一次打它和 1 u 内的敌人', 'Far toll: the carrier hears the Bourdon from anywhere: each toll strikes it and foes within 1 u'); } };
}
// F14 Headlong: no chime: the Bourdon calls: small foes within 4 u are yanked into its wall: 10, dazed 0.4 s; each rings it
{ const bo = [0.6, 0], ds = [[2.7, 1.2], [2.9, -1.3], [-0.4, -2.4], [0.2, 2.6]], tc = 1.0;
  F.F14 = { T: 4.2, cam: { x: 0.4, z: 0, w: 7.6 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: bo }],
    body: (t) => mixA(baton(t, 0.4, 1.6), { upperarmR: [t > 0.95 && t < 1.35 ? 20 * Math.sin((t - 0.95) / 0.4 * Math.PI) : 0, 0, 0] }, listen(t, 1.8, 3.6)),
    fx(A) { BO(A, { at: bo, t0: 0, t1: 4.2, noLand: true, quiet: true, strikes: [1.32, 1.36, 1.4, 1.44] }); FX.arcs(A, { t: tc, at: [bo[0], 0.03, bo[1]], r: 4, r0: 4, arc: 360, n: 1, op: 0.6 });
      FX.ring(A, { t: tc, at: [bo[0], 0.02, bo[1]], r0: 4, r1: 0.5, e: 'in2', dur: 0.4, col: C.brass, op: 0.7, w: 0.05 });
      ds.forEach((d, i) => { const dx = bo[0] - d[0], dz = bo[1] - d[1], L = Math.hypot(dx, dz), k = (L - 0.8) / L; A.move(i, tc + 0.05, [dx * k, dz * k], 0.3, 'in2'); A.hit(i, tc + 0.35 + 0.03 * i, 10, { strike: true, stun: 0.4 }); });
      capA(A, 0.2, 4.2, '撞钟：没有铃：洪钟召唤：4 u 内的小敌人被拽到钟壁上：10，晕 0.4 秒；每个都把钟撞响', 'Headlong: the Bourdon calls: small foes within 4 u are yanked into its wall: 10, dazed 0.4 s; each rings it'); } };
}
// F15 Drum the Bourdon: the Bourdon tips over where it hangs and booms from there at the pointer, 5 u
{ const bo = [-0.4, -1.4], p = [2.2, 0.6], ds = [[0.8, -0.6], [1.4, 0.1], [2.1, 0.8]], th = 0.5, tr = 2.4;
  F.F15 = { T: 4.4, cam: { x: 0.2, z: -0.2, w: 7.6 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'combo3', { to: 0.2 }], [th, 'drumHold', { loop: true, until: tr }], [tr, 'combo3', { from: 0.42 }]], root: [{ t: 0.2, look: p }],
    body: (t) => mixA(listen(t, 3.0, 4.2)),
    fx(A) { ptr(A, p, 0, tr + 0.5); const yaw = Math.atan2(p[0] - bo[0], p[1] - bo[1]) / D2R;
      FX.bell(A, { kind: 'great', tint: KB.bourdon.tint, h: KB.bourdon.h, t0: 0, t1: 4.4, at: (t) => { const u = EASE.s(clamp((t - 0.35) / 0.3)); return [bo[0], lerp(KB.bourdon.h / 2, 0.45, u), bo[1]]; }, rot: (t) => { const u = EASE.s(clamp((t - 0.35) / 0.3)); let k = 0; if (t > th && t < tr) k = 3 * Math.sin(t * 40); return [lerp(0, -95, u) + k, yaw, 0]; } });
      for (let t = th; t < tr; t += 0.16) FX.note(A, { t, at: [bo[0], 0.5, bo[1]], r1: 0.35, op: 0.4 });
      const tb = tr + 0.1; FX.arcs(A, { t: tb, at: [bo[0], 0.03, bo[1]], yaw, arc: 60, r: 5, n: 4, gap: 0.05, op: 0.9 }); A.shake(tb, 0.07, 0.25);
      for (const i of [0, 1, 2]) { const q = A.dpos(i, tb), L = Math.hypot(q.x - bo[0], q.z - bo[1]); A.hit(i, tb + L * 0.03, 32, { note: true, knock: [(q.x - bo[0]) / L * 2, (q.z - bo[1]) / L * 2], kdur: 0.4 }); }
      capA(A, 0.2, 4.4, '擂洪钟：洪钟在挂着的地方倒下，从那里朝指针轰出，5 u', 'Drum the Bourdon: it tips over where it hangs and booms from there at the pointer, 5 u'); } };
}
// F16 Clock face: each Midnight stroke hangs a chime at its hour round her, 4 s; the twelfth rings from all twelve
{ const ds = [[0.4, 0.8], [0.0, -1.3], [-1.8, 1.9], [0.9, -0.4]], t0 = 0.6, S = Array.from({ length: 12 }, (_, i) => +(t0 + i * 0.25).toFixed(2));
  F.F16 = { T: 5.0, cam: { x: -0.7, z: 0, w: 7.0 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'idleHold', { loop: true, until: 5 }]],
    body: (t) => mixA(rockSlow(t, t0, S[11] + 0.1, 0.25, 0.9), flare(t, t0, 4.4, clamp((t - t0) / 3)), onToes(t, S[11] - 0.05, 4.2)),
    fx(A) { const hr = (i) => [ME[0] + Math.sin((i + 1) * Math.PI / 6) * 2.2, ME[1] - Math.cos((i + 1) * Math.PI / 6) * 2.2];
      S.forEach((s, i) => { const last = i === 11; FX.arcs(A, { t: s, at: [ME[0], 0.03, ME[1]], r: 4, arc: 360, dur: 0.45, op: 0.45, col: i % 2 ? C.verd : C.brass }); hang(A, { kind: 'chime', at: hr(i), t0: s, t1: s + 4, quiet: true, strikes: [S[11]], drop: true, dropH: 0.6 }); });
      S.forEach((s, i) => { const p = hr(i); FX.arcs(A, { t: S[11], at: [p[0], 0.03, p[1]], r: 1.0, arc: 360, op: 0.75 }); }); A.shake(S[11], 0.06, 0.3);
      for (const j of [0, 1, 2, 3]) A.hit(j, S[11] + 0.05, 24, { note: true, stun: 0.8 }); A.hit(0, S[11] + 0.15, 5, { ans: true }); A.hit(1, S[11] + 0.15, 5, { ans: true });
      capA(A, 0.2, 5.0, '钟面：每一下在对应的钟点挂一个铃，4 秒；第十二下，十二个一起响', 'Clock face: each stroke hangs a chime at its hour round her, 4 s; the twelfth rings from all twelve'); } };
}
// F17 Bell hop: she hops onto a hung bell within 5 u, up to three in a row; each one tolls as she lands
{ const bs = [[-0.6, 0.8], [0.9, -0.5], [2.2, 0.6]], ds = [[0.0, 0.0], [1.5, 0.3], [1.0, 1.4], [2.6, -0.6]], J = [[0.4, 0.95], [1.5, 2.05], [2.6, 3.15]];
  const top = KB.bell.h + 0.02, root = [{ t: 0.2, look: bs[0] }]; let cur = ME;
  J.forEach(([a, b], k) => { const p = bs[k]; root.push({ t: a, x: cur[0], z: cur[1], y: k ? top : 0 }, { t: b, x: p[0], z: p[1], y: top, jump: 0.8, e: 'lin' }, { t: b + 0.3, look: bs[k + 1] || [3, 0] }); cur = p; });
  F.F17 = { T: 4.6, cam: { x: 0.1, z: 0.2, w: 7.0 }, her: H(ME[0], ME[1]), dum: ds, seq: J.map(([a]) => [a - 0.2, 'hop']), root, body: (t) => mixA(J.reduce((o, [, b]) => mixA(o, rock(t, b + 0.1, 2, 0.12, 1.4)), {})),
    fx(A) { bs.forEach((b, k) => { hang(A, { at: b, t0: 0, t1: 4.6, noLand: true, quiet: true, strikes: [J[k][1]] }); FX.arcs(A, { t: J[k][1], at: [b[0], 0.03, b[1]], r: 1.3, arc: 360, n: 2, op: 0.8 }); for (const i of inRing(A, b, 1.3, J[k][1])) A.hit(i, J[k][1] + 0.03, 7, { ring: true }); });
      capA(A, 0.2, 4.6, '踏钟：跳上 5 u 内挂着的钟，连跳最多三口；落脚那口就响（站在钟顶上晃一晃）', 'Bell hop: she hops onto a hung bell within 5 u, up to three in a row; each tolls as she lands (and she wobbles on its crown)'); } };
}
// F18 Friends' chord (kit 1.2): a chord joins the two friends 4 s and tolls on foes it crosses: 4, Ringing
{ const a0 = [-0.4, -1.2, { ally: true }], a1 = [0.3, 1.2, { ally: true }], f0 = [0.0, 0.1], f1 = [1.0, -1.5], f2 = [1.1, 1.6], tb = [0.7, 1.3], B = beatsOf(1.9, 4.9);
  F.F18 = { T: 5.4, cam: { x: -0.3, z: 0, w: 6.8 }, her: H(ME[0], ME[1]), dum: [a0, a1, f0, f1, f2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [a0[0], a0[1]] }, { t: 1.0, look: [a0[0], a0[1]] }, { t: 1.2, look: [a1[0], a1[1]] }],
    body: (t) => mixA(baton(t, 0.3, 1.8), beat(t, tb[0]), beat(t, tb[1]), nod(t, tb[0] + 0.15, 0.7), nod(t, tb[1] + 0.15, 0.7)),
    fx(A) { for (const [i, t] of [[0, tb[0]], [1, tb[1]]]) { FX.bell(A, { t0: t - 0.1, t1: t + 0.6, h: 0.22, fade: true, at: (tt) => { const p = A.dpt(i, t, 1.55); return [p.x, p.y, p.z]; }, strikes: [t + 0.05] }); FX.ring(A, { t: t + 0.05, at: (tt) => A.dpt(i, t, 0.02), r0: 0.3, r1: 2.0, dur: 0.6, col: C.pale, op: 0.6, w: 0.06 }); }
      lull(A, 3, tb[0] + 0.15, tb[0] + 4.15); lull(A, 4, tb[1] + 0.15, tb[1] + 4.15);
      FX.chord(A, { a: (t) => A.dpt(0, t, 0), b: (t) => A.dpt(1, t, 0), t0: tb[1] + 0.2, t1: 5.2, beats: B, w: 0.05 }); A.move(2, 1.5, [0.4, 0.1], 1.5, 's'); for (const b of B) A.hit(2, b, 4, { ring: true, small: true, noStop: true });
      capA(A, 0.2, 5.4, '友弦：两个队友之间连一根弦 4 秒，扫到的敌人每拍 4，鸣震', 'Friends’ chord: a chord joins the two friends 4 s and tolls on foes it crosses: 4, Ringing'); } };
}
// F19 Doorbell: 5 s: a foe that crosses a ring's edge or a chord is tolled at once
{ const bo = [0.5, 0], b1 = [0.6, 1.9], ds = [[2.8, -1.2], [-0.8, 2.3], [2.6, 1.8]], ts = 0.95;
  F.F19 = { T: 5.0, cam: { x: 0.3, z: 0.3, w: 7.4 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'castBloom', { to: 0.62 }], [0.87, 'bloomHold', { loop: true, until: 1.8 }]], root: [{ t: 0.2, look: bo }],
    body: (t) => mixA(pawOut(t, 0.4, 1.8, 0.7), antQuiver(t, ts, 1.8)),
    fx(A) { FX.fork(A, { t0: 0.35, t1: 1.9, at: 'handL', hums: [ts] }); BO(A, { at: bo, t0: 0, t1: 5, noLand: true, quiet: true, strikes: [2.0] }); hang(A, { at: b1, t0: 0, t1: 5, noLand: true, quiet: true, strikes: [2.9] }); chords(A, { from: bo, to: [b1], t0: 0, t1: 5, beats: [3.6], quiet: true });
      FX.ring(A, { t: ts, at: [bo[0], 0.02, bo[1]], r0: 2.0, r1: 2.0, dur: 4, col: C.pale, op: 0.35, w: 0.03 });
      A.move(0, 1.2, [-1.4, 0.6], 1.2, 'lin'); tollFx(A, 2.0, bo, 2.0, { double: true, top: 1 }); A.hit(0, 2.0, 14, { ring: true });
      A.move(1, 2.2, [0.8, -0.3], 1.0, 'lin'); tollFx(A, 2.9, b1, 1.3, { top: 0.55 }); A.hit(1, 2.9, 7, { ring: true });
      A.move(2, 3.0, [-1.2, -0.3], 1.0, 'lin'); A.hit(2, 3.6, 4, { ring: true });
      capA(A, 0.2, 5.0, '门铃：音叉之后 5 秒：敌人跨过钟圈的边或一根弦，马上被敲响', 'Doorbell: for 5 s a foe that crosses a ring’s edge or a chord is tolled at once'); } };
}
// F20 Drummer (kit 1.2): the Bourdon comes to the soloist's side and follows them; every third hit of theirs strikes it: 14 within 2 u
{ const a0 = [-0.6, 0.0, { ally: true }], fs = [[0.6, 0.6], [0.7, -0.5], [1.5, 0.1]], tg = 1.0, H1 = [1.6, 2.0, 2.4, 3.0, 3.4, 3.8], bo = (A, t) => { const p = A.dpos(0, t); return [p.x - 0.2, p.z + 1.1]; };
  F.F20 = { T: 5.0, cam: { x: -0.4, z: 0.3, w: 6.8 }, her: H(ME[0], -0.4), dum: [a0].concat(fs), seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [a0[0], a0[1]] }],
    body: (t) => mixA(baton(t, 0.3, 1.2), beat(t, tg - 0.05), listen(t, 1.6, 4.6)),
    fx(A) { soloOn(A, 0, tg + 0.05, 5.0); A.move(0, 2.6, [0.6, 0], 0.4, 's');
      const hits = [H1[2], H1[5]]; FX.bell(A, { kind: 'great', tint: KB.bourdon.tint, h: KB.bourdon.h, t0: tg - 0.2, t1: 5, drop: 0.3, dropH: 2.5, at: (t) => { const p = bo(A, t); return [p[0], KB.bourdon.h / 2, p[1]]; }, strikes: hits });
      H1.forEach((h, k) => { friendSwing(A, 0, h, 1 + (k % 3), 26, { small: true }); }); for (const h of hits) { const p = bo(A, h); FX.arcs(A, { t: h + 0.05, at: [p[0], 0.03, p[1]], r: 2, arc: 360, n: 2, op: 0.85 }); for (const i of [1, 2, 3]) A.hit(i, h + 0.08, 14, { ring: true, noStop: true }); }
      A.hud((t, x, W, H2, k, lang) => { if (t < 1.5) return; const n = H1.filter((h) => t >= h).length % 3; x.font = `700 ${Math.round(13 * k)}px Inter, "PingFang SC", system-ui, sans-serif`; x.textAlign = 'right'; x.fillStyle = C.brass; x.fillText((lang === 'zh' ? '鼓点 ' : 'Drum ') + '●'.repeat(n) + '○'.repeat(3 - n), W - 14 * k, H2 - 16 * k); });
      capA(A, 0.2, 5.0, '鼓手：洪钟到独奏的队友身边跟着走；他每打三下撞一次钟：2 u 内 14', 'Drummer: the Bourdon comes to the soloist’s side and follows them; every third hit of theirs strikes it: 14 within 2 u'); } };
}
// F21 Largo: the beat halves 6 s: each toll hits three times as hard and knocks small foes down 0.4 s
{ const bo = [0.3, -0.2], d0 = [0.8, 0.5], d1 = [0.9, -0.9], d2 = [-0.4, -1.0], B0 = beatsOf(0.4, 1.4), B = beatsOf(3.2, 5.2, 2);
  F.F21 = { T: 6.0, cam: { x: -0.5, z: 0, w: 6.6 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: bo }],
    body: (t) => mixA(baton(t, 1.4, 2.6), { upperarmR: [t > 1.6 && t < 2.4 ? -30 * Math.sin((t - 1.6) / 0.8 * Math.PI) : 0, 30 * Math.sin(clamp((t - 1.6) / 0.8) * Math.PI) * (t > 1.6 && t < 2.4 ? 1 : 0), 0] }, antFlick(t, B0.concat(B))),
    fx(A) { BO(A, { at: bo, t0: 0, t1: 6, noLand: true, beats: B0, foes: [0, 1, 2] }); for (const b of B) { tollFx(A, b, bo, 2.0, { double: true, big: true, top: 1.05 }); FX.arcs(A, { t: b, at: [bo[0], 0.03, bo[1]], r: 2.0, arc: 360, n: 2, op: 0.8 }); A.shake(b, 0.05, 0.2); for (const i of [0, 1, 2]) { A.hit(i, b + 0.03, 42, { ring: true, big: i === 0 }); A.tag(i, b + 0.05, b + 0.45, ['倒地', 'Down'], C.stun); } }
      A.hud((t, x, W, H2, k, lang) => { const on = t >= 2.2; x.font = `700 ${Math.round(14 * k)}px Inter, "PingFang SC", system-ui, sans-serif`; x.textAlign = 'right'; x.fillStyle = on ? C.brass : C.parch; x.fillText((lang === 'zh' ? '拍 ' : 'Beat ') + (on ? '×½' : '×1'), W - 14 * k, H2 - 16 * k); });
      capA(A, 0.2, 2.2, '慢板：在空中慢慢一大划', 'Largo: one slow, wide stroke in the air');
      capA(A, 2.2, 6.0, '6 秒拍子减半：每响三倍重（14 → 42），小敌人倒地 0.4 秒', 'The beat halves 6 s: each toll three times as hard (14 → 42); small foes knocked down 0.4 s'); } };
}
// F22 Tighten: laid round the Bourdon, the Curfew closes to the bell's foot in 2 s, herding small foes in
{ const bo = [0.6, 0], ds = [[1.6, 0.6], [1.2, -1.0], [-0.2, 0.8], [-0.1, -0.7]], t0 = 1.15;
  F.F22 = { T: 4.6, cam: { x: 0.2, z: 0, w: 7.2 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: bo }],
    body: (t) => mixA(floorCircle(t, 0.4, 1.1), listen(t, 1.6, 3.4)),
    fx(A) { BO(A, { at: bo, t0: 0, t1: 4.6, noLand: true, quiet: true, strikes: [t0 + 2.0] }); const r = (t) => lerp(1.25, 0.55, EASE.io2(clamp((t - t0) / 2)));
      FX.fence(A, { t0, t1: t0 + 2.6, at: [bo[0], 0, bo[1]], r: (t) => r(t) * 1.6, h: 0.6 });
      ds.forEach((d, i) => { const dx = bo[0] - d[0], dz = bo[1] - d[1], L = Math.hypot(dx, dz), k = (L - 0.75) / L; A.move(i, t0 + 0.2, [dx * k, dz * k], 1.8, 's'); A.hit(i, t0 + 2.0, null, {}); });
      capA(A, 0.2, 4.6, '收网：宵禁围着洪钟，2 秒内收到钟脚，把小敌人赶进来', 'Tighten: laid round the Bourdon, it closes to the bell’s foot in 2 s, herding small foes in'); } };
}
// F23 Meteor: she rides the Bourdon down on the pointer, 6 u: 24 within 2 u, flipped 1 s
{ const p = [2.0, 0], ds = [[2.9, 0.9, { flat: [[1.5, 2.5]] }], [2.6, -1.2, { flat: [[1.5, 2.5]] }], [1.0, 1.0, { flat: [[1.5, 2.5]] }]], tj = 0.75, tl = 1.5, top = KB.bourdon.h + 0.02;
  F.F23 = { T: 4.6, cam: { x: 0.4, z: 0, w: 7.6 }, her: H(-3.0, 0), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }], [tj - 0.1, 'tuck', { loop: true, until: tl - 0.25, fade: 0.06 }], [tl - 0.25, 'sit', { loop: true, until: 3.2 }], [3.2, 'hop']],
    root: [{ t: 0.2, look: p }, { t: tj, fw: 0, y: 0 }, { t: tl, fw: 5.0, y: top, jump: 2.4, e: 'lin' }, { t: 3.3, fw: 5.0, y: top }, { t: 3.75, fw: 5.6, y: 0, jump: 0.4, e: 'lin' }],
    body: (t) => mixA(clap(t, tj), crouch(t, 0.3, tj, 1)), unseen: [[tj, tl - 0.3]],
    fx(A) { ptr(A, p, 0, tl); FX.bell(A, { kind: 'great', tint: KB.bourdon.tint, h: KB.bourdon.h, t0: tj + 0.1, t1: 4.6, at: (t) => { const r = A.rootAt(Math.min(t, tl)); return [r.x, Math.max(KB.bourdon.h / 2, r.y + 0.0 - KB.bourdon.h / 2 + 0.02 + (t < tl ? 0 : 0)), r.z]; }, strikes: [tl], fin: 0.2 });
      FX.arcs(A, { t: tl, at: [p[0], 0.03, p[1]], r: 2, arc: 360, n: 3, op: 0.9 }); FX.dust(A, { t: tl, at: [p[0], 0.02, p[1]], n: 16, sp: 1.4, dur: 0.6 }); A.shake(tl, 0.1, 0.3);
      for (const i of [0, 1, 2]) { A.hit(i, tl + 0.03, 24, { strike: true, big: i === 0 }); A.launch(i, tl + 0.03, 0.35); A.tag(i, tl + 0.2, tl + 1.0, ['翻倒', 'Flipped'], C.stun); }
      capA(A, 0.2, tl, '钟落：她骑着洪钟砸向指针，6 u', 'Meteor: she rides the Bourdon down on the pointer, 6 u');
      capA(A, tl, 4.6, '坐在钟顶落地：2 u 内 24，翻倒 1 秒', 'She lands sitting on its crown: 24 within 2 u, flipped 1 s'); } };
}
// F24 Left bells: as the Anthem ends each friend's bell hangs where they stand, 5 s, past the cap
{ const a0 = [-1.1, 1.2, { ally: true }], a1 = [-0.8, -1.3, { ally: true }], ds = [[0.6, 1.4], [0.7, -1.7], [0.9, 0.1]], t0 = 1.1, te = 3.6, B = beatsOf(1.6, te), B2 = beatsOf(te + 0.5, 5.6);
  F.F24 = { T: 6.0, cam: { x: -0.6, z: 0, w: 6.8 }, her: H(ME[0], ME[1]), dum: [a0, a1].concat(ds), seq: [[0.25, 'castBloom', { to: 0.62 }], [0.87, 'bloomHold', { loop: true, until: 1.4 }], [1.4, 'walk', { loop: true, until: te, speed: 1.2 }]],
    root: [{ t: 0.2, look: [0, 0] }, { t: 1.4, fw: 0 }, { t: te, fw: 1.2, e: 'lin' }],
    body: (t) => mixA(flare(t, 0.3, 1.6), baton(t, 1.4, te, 0.8), listen(t, te + 0.3, 5.6)),
    fx(A) { headBell(A, 'me', t0, te, B); headBell(A, 0, t0, te, B); headBell(A, 1, t0, te, B); A.move(0, 1.4, [1.2, 0.2], te - 1.4, 'lin'); A.move(1, 1.4, [1.2, 0.3], te - 1.4, 'lin');
      for (const w of ['me', 0, 1]) { const p = w === 'me' ? A.rootAt(te) : A.dpos(w, te); hang(A, { at: [p.x + (w === 'me' ? 0.5 : 0.45), p.z], t0: te, t1: 6, drop: true, dropH: 1.4, beats: B2 }); }
      capA(A, 0.2, te, '圣咏：头上的钟跟着走、每拍响', 'Anthem: a bell over every head follows and tolls');
      capA(A, te, 6.0, '留钟：结束时每个人的钟挂在原地 5 秒，不算上限', 'Left bells: as it ends each friend’s bell hangs where they stand, 5 s, past the cap'); } };
}
