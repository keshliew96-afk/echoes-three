// Combos C1-C12 (kit 1.1, all picked): two of her skills, or a skill and her dash, played together. Base forms.
import { DEFS, H, FX, C, EASE, clamp, lerp, hang, tollFx, noteBolt, shotBell, inRing, held, knockHud, foeBolt, foeSwing, ticks, beatsOf, KB, D2R,
  rock, baton, beat, listen, flare, clap, nod, crouch, lookUp, antFlick, antQuiver, antCurl, knock, toss, pawOut, shove, floorCircle, mixA } from './defs.js';
import { ME, ptr, batBell, swingBell, rollBell, soundLine, earBell, headBell } from './base.js';
const two = (A, a, b, zh, en) => A.cap(a, b, zh, en);
const step = (A, t0, t1, zh, en) => A.hud((t, x, W, H2, k, lang) => { if (t < t0 || t > t1) return; x.font = `700 ${Math.round(13 * k)}px Inter, "PingFang SC", system-ui, sans-serif`; x.textAlign = 'left'; x.lineWidth = 3 * k; x.strokeStyle = 'rgba(14,12,8,0.85)'; const s = lang === 'zh' ? zh : en; x.strokeText(s, 14 * k, H2 - 16 * k); x.fillStyle = C.brass; x.fillText(s, 14 * k, H2 - 16 * k); });
const WATER = '#3E8FD6';

// C1 Strike the bell: Bell Swing on a hung bell rings it like a Peal: 16 within 1.5 u, dazed 0.4 s
{ const b = [-1.5, 0.25], ds = [[-0.8, 1.1], [-0.7, -0.7], [-2.1, 1.3]], ts = 1.9;
  DEFS.C1 = { T: 4.6, cam: { x: -1.1, z: 0.1, w: 6.0 }, her: H(-2.35, 0.25), dum: ds, seq: [[0.3, 'castPlant'], [ts - 0.44, 'castSweep']], root: [{ t: 0.2, look: b }],
    body: (t) => mixA(listen(t, 2.4, 4.2)),
    fx(A) { batBell(A, 0.7, [b[0], 1.2, b[1]], { dur: 0.15 }); hang(A, { at: b, t0: 0.86, t1: 4.6, drop: true, dropH: 0.9, quiet: true, strikes: [ts + 0.02], rot: (t) => [0, 0, t > ts ? 22 * Math.sin((t - ts) * 14) * Math.exp(-(t - ts) * 3) : 0] }); swingBell(A, ts);
      FX.arcs(A, { t: ts + 0.02, at: [b[0], 0.03, b[1]], r: 1.5, arc: 360, n: 3, op: 0.9 }); A.shake(ts, 0.06, 0.2); for (const i of [0, 1, 2]) A.hit(i, ts + 0.05, 16, { stun: 0.4, ring: true });
      step(A, 0.3, 1.4, '① 悬钟', '① Hang Bell'); step(A, 1.4, 4.6, '② 挥钟打到它', '② Bell Swing on it');
      two(A, 0.2, 4.6, '当头一棒：挥钟（或叩甲落地）打到挂着的钟，就像齐鸣：1.5 u 内 16，晕 0.4 秒', 'Strike the bell: Bell Swing, or Click’s landing, on a hung bell rings it like a Peal: 16 within 1.5 u, dazed 0.4 s'); } };
}
// C2 Bowling: a Rolling Bell that meets a hung bell sends it rolling too, 3 u: 10
{ const hb = [0.2, 0.15], ds = [[-0.9, -0.6], [1.4, 0.4], [2.6, 0.2]], tp = 1.3, from = [-1.7, 0];
  DEFS.C2 = { T: 4.6, cam: { x: 0.3, z: 0, w: 7.6 }, her: H(-2.6, 0), dum: ds, seq: [[0.4, 'castPlant', { to: 0.62 }], [1.05, 'idle']], root: [{ t: 0.2, look: [3, 0] }],
    body: (t) => mixA(shove(t, tp), listen(t, 2.4, 4.2)),
    fx(A) { const tm = tp + 0.55; hang(A, { at: hb, t0: 0, t1: tm, noLand: true, quiet: true, beats: [] });
      const pos = rollBell(A, { t0: tp, tset: 0.75, from, dir: [1, 0], dist: 1.6, dur: 0.55, e: 'lin' });
      const r2 = rollBell(A, { t0: tm, tset: tm, from: hb, dir: [1, 0], dist: 3, dur: 0.6, noSet: true, stand: true }); FX.note(A, { t: tm, at: [hb[0], 0.4, hb[1]], r1: 0.5 }); A.shake(tm, 0.05, 0.15);
      A.hit(0, tp + 0.25, 14, { strike: true, knock: [0, -0.6] }); A.hit(1, tm + 0.25, 10, { strike: true, knock: [0.2, 0.7] }); A.hit(2, tm + 0.48, 10, { strike: true, knock: [0.3, -0.7] });
      step(A, 0.3, tm, '① 滚钟', '① Rolling Bell'); step(A, tm, 4.6, '② 撞上挂着的钟', '② It meets a hung bell');
      two(A, 0.2, 4.6, '连滚：滚钟撞上挂着的钟，把它也撞得滚起来，3 u：10；撞上扣钟，连钟带敌人一起滚', 'Bowling: a Rolling Bell that meets a hung bell sends it rolling too, 3 u: 10; a Bell Jar it meets rolls on with its foe inside'); } };
}
// C3 Dash cast: Peal pressed under the dash bell is kept and comes out as the bell lifts, 30% wider
{ const me = [-2.4, 0], ds = [[0.3, 1.2], [0.6, -1.1], [1.2, 0.2]], tc = 0.3, tin = tc + 0.36, tw = tc + 0.62, tl = 2.6, H0 = 1.68;
  DEFS.C3 = { T: 4.6, cam: { x: -0.5, z: 0, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[tc, 'dash', { to: 0.62 }], [tw, 'walk', { loop: true, until: tl, speed: 1.5, fade: 0.12 }], [tl, 'castBloom', { from: 0.5 }]],
    root: [{ t: tw, fw: 0 }, { t: tl, fw: 2.2, e: 'lin' }],
    fx(A) { const at = (t) => { const r = A.rootAt(Math.min(t, tl)); return [r.x, r.z]; };
      FX.bell(A, { kind: 'great', h: H0, floor: at, t0: tc + 0.08, t1: tl, drop: 0.28, dropH: 3, op: 0.86, lift: true, rot: (t) => { const s = Math.sin((t - tw) / 0.32 * Math.PI); return t > tw && t < tl ? [1.7 * Math.cos((t - tw) / 0.32 * Math.PI), 0, 2.9 * s] : [0, 0, 0]; } });
      A.hud((t, x, W, H2, k, lang) => { if (t < 1.3 || t > tl) return; const p = A.at('head', t).clone(); p.y += 1.5; p.project(A.cam); x.font = `700 ${Math.round(13 * k)}px Inter, "PingFang SC", system-ui, sans-serif`; x.textAlign = 'center'; x.fillStyle = C.brass; x.fillText(lang === 'zh' ? '齐鸣 · 留着' : 'Peal · kept', (p.x + 1) / 2 * W, (1 - p.y) / 2 * H2); });
      const p = at(tl); FX.arcs(A, { t: tl + 0.05, at: [p[0], 0.03, p[1]], r: 1.95, arc: 360, n: 3, op: 0.9 }); FX.ring(A, { t: tl + 0.05, at: [p[0], 0.02, p[1]], r0: 1.5, r1: 1.95, dur: 0.6, col: C.pale, op: 0.6, w: 0.05 }); A.shake(tl, 0.06, 0.2);
      for (const i of [0, 1, 2]) A.hit(i, tl + 0.08, 16, { stun: 0.4, ring: true });
      step(A, 0.3, 1.3, '① 闪避钟', '① Dash'); step(A, 1.3, 4.6, '② 钟下按齐鸣', '② Peal under the bell');
      two(A, 0.2, 4.6, '钟下施放：钟罩下按齐鸣、挥钟、轰鸣或聚音，会留到钟升起时放出，宽 30%', 'Dash cast: Peal, Bell Swing, Boom or Call Chime pressed under the dash bell is kept, and comes out as it lifts, 30% wider'); } };
}
// C4 Jar and knell: Deathwatch's knell on a foe under a Bell Jar rings inside the jar: double on that foe, nothing round it
{ const d0 = [0.6, 0], d1 = [1.4, 0.9], d2 = [1.3, -1.0], K = [0.8, 1.3, 1.8], tj = 1.9, tk = 2.4;
  DEFS.C4 = { T: 4.6, cam: { x: -0.3, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: [[d0[0], d0[1], { gone: [[tj + 0.05, 3.6]] }], d1, d2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: d0 }],
    body: (t) => mixA(knock(t, 0.5, 1.9, K), baton(t, 1.7, 2.1), beat(t, tj), nod(t, tk + 0.1, 1.0)),
    fx(A) { knockHud(A, 0, 0.5, tj, (t) => K.filter((k) => t >= k).length); for (const k of K) A.hit(0, k, 3, { note: true, small: true, noStop: true });
      FX.bell(A, { kind: 'great', h: 1.0, floor: d0, t0: tj - 0.3, t1: 3.6, drop: 0.3, dropH: 2.5, lift: true, strikes: [tk], rot: (t) => [0, 0, t > tk ? 8 * Math.sin((t - tk) * 30) * Math.exp(-(t - tk) * 4) : 0] });
      FX.note(A, { t: tk, at: [d0[0], 0.6, d0[1]], r1: 0.6 }); A.shake(tk, 0.08, 0.3); A.hit(0, tk + 0.02, 60, { big: true, note: true });
      FX.ring(A, { t: tk, at: [d0[0], 0.02, d0[1]], r0: 0.6, r1: 0.7, dur: 0.4, col: C.pale, op: 0.5, w: 0.05 });
      step(A, 0.3, tj - 0.1, '① 报丧敲三下', '① Deathwatch knocks'); step(A, tj - 0.1, 4.6, '② 第三下时扣钟', '② Bell Jar on the third knock');
      two(A, 0.2, 4.6, '瓮中丧钟：丧钟在扣钟里响：对它翻倍（30 → 60），外面一点都不溢', 'Jar and knell: the knell rings inside the jar: double on that foe (30 → 60), nothing round it'); } };
}
// C5 Hurry the watch: a watched foe struck by Peal takes its knell at once
{ const b = [0.2, 0], d0 = [0.8, 0.5], d1 = [0.7, -0.8], tw = 0.9, tb = 2.4;
  DEFS.C5 = { T: 4.4, cam: { x: -0.4, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: [d0, d1], seq: [[0.25, 'idle', { speed: 0.6 }], [tb - 0.98, 'castBloom']], root: [{ t: 0.2, look: d0 }, { t: 1.3, look: b }],
    body: (t) => mixA(knock(t, 0.5, 1.2, [tw])),
    fx(A) { hang(A, { at: b, t0: 0, t1: 4.4, noLand: true, quiet: true, strikes: [tb] }); A.hit(0, tw, 3, { note: true, small: true }); knockHud(A, 0, 0.5, tb, (t) => (t >= tw ? 1 : 0));
      FX.arcs(A, { t: tb, at: [b[0], 0.03, b[1]], r: 1.5, arc: 360, n: 2, op: 0.8 }); A.hit(0, tb + 0.04, 16, { stun: 0.4 }); A.hit(1, tb + 0.04, 16, { stun: 0.4 });
      FX.bell(A, { t0: tb, t1: tb + 0.6, h: 0.4, tint: '#6A5A48', at: (t) => { const p = A.dpt(0, t, 1.6); return [p.x, p.y, p.z]; }, strikes: [tb + 0.15] }); A.hit(0, tb + 0.17, 30, { note: true, big: true });
      step(A, 0.3, 1.4, '① 报丧', '① Deathwatch'); step(A, 1.4, 4.4, '② 齐鸣打到它', '② Peal strikes it');
      two(A, 0.2, 4.4, '催命：被报丧的敌人挨了齐鸣或钟乐，丧钟马上响', 'Hurry the watch: a watched foe struck by Peal or Carillon takes its knell at once'); } };
}
// C6 Catchy: Jingles thrown while an Earworm plays give each foe they hit 2 s of the tune
{ const ds = [[0.6, 0], [0.4, -1.2], [1.4, 0.7], [1.5, -0.6], [-0.3, 1.0]], tf = 2.0;
  DEFS.C6 = { T: 5.0, cam: { x: -0.3, z: 0, w: 6.6 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: ds[0] }],
    body: (t) => mixA(antCurl(t, 0.3, 1.2), flare(t, 1.5, 1.9, 0.5), toss(t, tf), listen(t, 2.8, 4.6)),
    fx(A) { noteBolt(A, { t: 0.9, from: 'atR', to: (t) => A.dpt(0, t, 1.1), dur: 0.3 }); earBell(A, 0, 1.2, 5.0);
      [1, 2, 3, 4].forEach((i, k) => { const t1 = tf + 0.3 + 0.05 * k; FX.bell(A, { t0: tf, t1, h: 0.13, fade: true, at: (t) => { const p0 = A.at('handL', tf), q = A.dpt(i, t1, 0.8), u = clamp((t - tf) / (t1 - tf)); return [lerp(p0.x, q.x, u), lerp(p0.y, q.y, u) + 0.6 * Math.sin(u * Math.PI), lerp(p0.z, q.z, u)]; } });
        A.hit(i, t1, 7, { note: true, ring: 4 }); earBell(A, i, t1, t1 + 2); ticks(A, i, t1 + 0.25, t1 + 2, 3, 0.5, { note: true, ring: true }); });
      step(A, 0.3, 1.6, '① 绕耳音', '① Earworm'); step(A, 1.6, 5.0, '② 散铃', '② Jingles');
      two(A, 0.2, 5.0, '铃传绕耳：绕耳音响着时扔散铃，每个被打中的敌人也绕耳 2 秒', 'Catchy: Jingles thrown while an Earworm plays give each foe they hit 2 s of the tune'); } };
}
// C7 Curfew under a bell: a Curfew laid round a hung bell lasts as long as the bell does
{ const b = [0.6, 0], ds = [[1.6, 0.8], [1.5, -1.0], [3.2, 0.3]], tc = 1.7;
  DEFS.C7 = { T: 6.0, cam: { x: 0.3, z: 0, w: 7.4 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'castPlant'], [1.0, 'idle']], root: [{ t: 0.2, look: b }],
    body: (t) => mixA(floorCircle(t, 1.1, 1.7), listen(t, 2.2, 5.6)),
    fx(A) { batBell(A, 0.7, [b[0], 1.2, b[1]], { dur: 0.15 }); hang(A, { at: b, t0: 0.86, t1: 6, beats: beatsOf(2.0, 6.0), drop: true, dropH: 0.9 }); FX.fence(A, { t0: tc, t1: 6, at: [b[0], 0, b[1]], r: 1.6, h: 0.6, hits: [3.0, 4.2] });
      A.move(2, 2.2, [-1.0, -0.1], 0.8, 's'); A.move(2, 3.0, [0.3, 0], 0.25, 'out'); A.hit(2, 3.0, null, {}); A.move(0, 3.6, [0.6, 0.4], 0.6, 's'); A.move(0, 4.2, [-0.3, -0.2], 0.25, 'out');
      A.hud((t, x, W, H2, k, lang) => { if (t < tc) return; x.font = `700 ${Math.round(13 * k)}px Inter, "PingFang SC", system-ui, sans-serif`; x.textAlign = 'right'; x.fillStyle = C.brass; x.fillText((lang === 'zh' ? '宵禁 ' : 'Curfew ') + (t < tc + 3 ? (tc + 3 - t).toFixed(1) + ' s' : (lang === 'zh' ? '跟钟一样长' : 'as long as the bell')), W - 14 * k, H2 - 16 * k); });
      step(A, 0.3, 1.4, '① 悬钟', '① Hang Bell'); step(A, 1.4, 6, '② 围着它宵禁', '② Curfew round it');
      two(A, 0.2, 6.0, '钟下宵禁：围着挂着的钟放宵禁，钟在多久，宵禁就在多久', 'Curfew under a bell: a Curfew laid round a hung bell lasts as long as the bell does'); } };
}
// C8 Fork on the Anthem: Tuning Fork cast during the Anthem: its haste lasts the rest of the Anthem
{ const a0 = [-1.0, 1.1, { ally: true }], a1 = [-0.8, -1.2, { ally: true }], ds = [[1.2, 1.1], [1.3, -1.2]], t0 = 1.1, te = 5.6, tf = 2.2, B = beatsOf(1.6, te);
  DEFS.C8 = { T: 6.0, cam: { x: -0.6, z: 0, w: 6.8 }, her: H(ME[0], ME[1]), dum: [a0, a1].concat(ds), seq: [[0.25, 'castBloom', { to: 0.62 }], [0.87, 'bloomHold', { loop: true, until: 1.4 }], [1.4, 'walk', { loop: true, until: tf - 0.2, speed: 1.2 }], [tf - 0.2, 'castBloom', { to: 0.62 }], [tf + 0.42, 'walk', { loop: true, until: te, speed: 1.5 }]],
    root: [{ t: 0.2, look: [0, 0] }, { t: 1.4, fw: 0 }, { t: tf - 0.2, fw: 0.5, e: 'lin' }, { t: tf + 0.42, fw: 0.5 }, { t: te, fw: 2.5, e: 'lin' }],
    body: (t) => mixA(flare(t, 0.3, 1.6), pawOut(t, tf - 0.1, tf + 0.6, 0.7)),
    fx(A) { headBell(A, 'me', t0, te, B); headBell(A, 0, t0, te, B); headBell(A, 1, t0, te, B); A.move(0, 1.4, [2.2, 0.2], te - 1.4, 'lin'); A.move(1, 1.4, [2.2, 0.3], te - 1.4, 'lin');
      FX.fork(A, { t0: tf - 0.15, t1: tf + 0.7, at: 'handL', hums: [tf + 0.2] }); FX.ring(A, { t: tf + 0.2, at: (t) => A.rootAt(tf + 0.2), r0: 0.4, r1: 3, dur: 0.5, col: C.verd, op: 0.6, w: 0.06 });
      for (const i of [0, 1]) A.tag(i, tf + 0.25, te, (t, lang) => (lang === 'zh' ? '快 25%' : 'Haste 25%') + (t > tf + 3.25 ? (lang === 'zh' ? ' · 圣咏里一直快' : ' · for the Anthem') : ''), C.brass);
      step(A, 0.3, tf - 0.2, '① 圣咏', '① Anthem'); step(A, tf - 0.2, 6, '② 圣咏中放音叉', '② Tuning Fork during it');
      two(A, 0.2, 6.0, '定调：圣咏中放音叉：加速一直持续到圣咏结束', 'Fork on the Anthem: Tuning Fork cast during the Anthem: its haste lasts the rest of the Anthem'); } };
}
// C9 Bat the roller: Bell Swing on her Rolling Bell sends it off afresh along her aim: 6 u more, 50% harder
{ const from = [-1.6, 0.9], tp = 1.0, ts = 2.0, ds = [[0.4, -0.5], [1.7, -0.9], [3.0, -1.4]];
  DEFS.C9 = { T: 4.8, cam: { x: 0.4, z: -0.2, w: 8.0 }, her: H(-2.6, 0.3), dum: ds, seq: [[0.2, 'castPlant', { to: 0.62 }], [0.8, 'idle'], [ts - 0.44, 'castSweep']], root: [{ t: 0.2, look: [3, 0.9] }, { t: 1.3, look: [-1.1, 0.0] }, { t: 1.4, x: -1.9, z: -0.1 }, { t: 1.55, look: [3, -1.4] }],
    body: (t) => mixA(shove(t, tp), listen(t, 3.0, 4.4)),
    fx(A) { const p1 = rollBell(A, { t0: tp, tset: 0.55, from, dir: [1, -0.35], dist: 0.9, dur: 0.9, e: 'out' }); const q = [from[0] + 0.85, from[1] - 0.3];
      const L = Math.hypot(4.5 - q[0], -1.6 - q[1]), d = [(4.5 - q[0]) / L, (-1.6 - q[1]) / L]; rollBell(A, { t0: ts, tset: ts, from: q, dir: d, dist: 6, dur: 0.75, noSet: true, e: 'out' });
      FX.arcs(A, { t: ts, at: [q[0], 0.3, q[1]], y: 0.3, yaw: Math.atan2(d[0], d[1]) / D2R, arc: 70, r: 1.2, op: 0.9 }); A.shake(ts, 0.06, 0.2);
      ds.forEach((dd, i) => A.hit(i, ts + 0.08 + i * 0.15, 21, { strike: true, big: i === 2, knock: [d[1] * 0.8, -d[0] * 0.8] }));
      step(A, 0.3, ts - 0.5, '① 滚钟', '① Rolling Bell'); step(A, ts - 0.5, 4.8, '② 挥钟打它', '② Bell Swing on it');
      two(A, 0.2, 4.8, '击滚钟：挥钟或轰鸣打到自己的滚钟，它顺着瞄准重新滚出去：再 6 u，重 50%（14 → 21）', 'Bat the roller: Bell Swing or Boom on her Rolling Bell sends it off afresh along her aim: 6 u more, 50% harder (14 → 21)'); } };
}
// C10 Every bell is a bell (kit 1.2): Peal also rings a Bell Jar, the dash bell and the Anthem's bells
{ const b = [-0.6, 1.3], a0 = [0.6, -0.4, { ally: true }], d0 = [1.6, 1.0], d1 = [1.4, -1.2], d2 = [0.3, 0.6], tb = 2.0;
  DEFS.C10 = { T: 4.4, cam: { x: -0.2, z: 0, w: 7.0 }, her: H(ME[0], ME[1]), dum: [a0, [d0[0], d0[1], { gone: [[0.6, 3.4]] }], d1, d2], seq: [[0.25, 'idle', { speed: 0.6 }], [tb - 0.98, 'castBloom']], root: [{ t: 0.2, look: [0, 0] }],
    body: (t) => mixA(baton(t, 0.3, 1.0), beat(t, 0.6)),
    fx(A) { hang(A, { at: b, t0: 0, t1: 4.4, noLand: true, quiet: true, strikes: [tb] }); headBell(A, 0, 0.5, 4.4, [tb + 0.05, 3.0, 4.0]);
      FX.bell(A, { kind: 'great', h: 1.0, floor: d0, t0: 0.4, t1: 3.4, drop: 0.3, dropH: 2.5, lift: true, strikes: [tb + 0.05] });
      for (const c of [b, [a0[0], a0[1]], d0]) FX.arcs(A, { t: tb + 0.04, at: [c[0], 0.03, c[1]], r: 1.5, arc: 360, n: 2, op: 0.85 }); A.shake(tb, 0.06, 0.2);
      A.hit(1, tb + 0.08, 16, { stun: 0.4 }); A.hit(2, tb + 0.08, 16, { stun: 0.4 }); A.hit(3, tb + 0.08, 32, { stun: 0.4, big: true });
      step(A, 0.3, tb - 1.0, '① 圣咏的钟、扣钟', '① Anthem bell, Bell Jar'); step(A, tb - 1.0, 4.4, '② 齐鸣', '② Peal');
      two(A, 0.2, 4.4, '一呼百应：齐鸣和钟乐也让扣钟、冲刺的钟和圣咏的钟一起响', 'Every bell is a bell: Peal and Carillon also ring a Bell Jar, the dash bell and the Anthem’s bells'); } };
}
// C11 Sound on water: a Note that touches the Tide Caller's water hits every foe standing in that water, once
{ const otter = [-1.2, 1.4, { ally: true }], w = [0.9, 0], ds = [[0.4, 0.4], [1.3, -0.4], [1.5, 0.6], [2.8, -0.9]], tn = 1.5;
  DEFS.C11 = { T: 4.2, cam: { x: -0.1, z: 0.2, w: 7.0 }, her: H(ME[0], ME[1]), dum: [otter].concat(ds), seq: [[tn - 0.36, 'castPoint']], root: [{ t: 0.2, look: [ds[0][0], ds[0][1]] }],
    fx(A) { FX.pool(A, { at: [w[0], 0, w[1]], t0: 0.3, t1: 4.2, r: 1.6, sx: 1.1, col: WATER, op: 0.5 }); A.tag(0, 0.3, 1.2, ['潮汐使', 'Tide Caller'], WATER);
      noteBolt(A, { t: tn, to: (t) => A.dpt(1, t, 0.6), dur: 0.2 }); A.hit(1, tn + 0.2, 12, { note: true });
      FX.ring(A, { t: tn + 0.22, at: [w[0], 0.03, w[1]], r0: 0.3, r1: 1.7, dur: 0.45, col: C.brass, op: 0.8, w: 0.06 }); for (const i of [2, 3]) A.hit(i, tn + 0.3, 12, { note: true });
      step(A, 0.3, 1.2, '① 潮汐使的水', '① Tide Caller’s water'); step(A, 1.2, 4.2, '② 一记音碰到水', '② A Note touches it');
      two(A, 0.2, 4.2, '水传声：一记音碰到潮汐使的水，水里站着的敌人全挨一下', 'Sound on water: a Note that touches the Tide Caller’s water hits every foe standing in that water, once'); } };
}
// C12 Come in: Call Chime draws foes through a Curfew ring into it; once in they cannot get out
{ const c = [0.4, 0], ds = [[3.2, 0.9], [3.0, -1.0], [-0.6, 2.5]], tc0 = 0.9, tch = 2.2;
  DEFS.C12 = { T: 5.4, cam: { x: 0.6, z: 0.2, w: 7.6 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }], [tch - 0.36, 'castPoint']], root: [{ t: 0.2, look: c }],
    body: (t) => mixA(floorCircle(t, 0.4, 1.0), listen(t, 3.0, 5.0)),
    fx(A) { FX.fence(A, { t0: tc0, t1: 5.4, at: [c[0], 0, c[1]], r: 1.6, h: 0.6, hits: [4.2] }); hang(A, { kind: 'chime', at: c, t0: tch + 0.25, t1: 5.4, quiet: true, drop: true, dropH: 0.8 });
      ds.forEach((d, i) => { const dx = c[0] - d[0], dz = c[1] - d[1], L = Math.hypot(dx, dz), k = (L - 0.7) / L; A.move(i, tch + 0.3, [dx * k, dz * k], 0.6, 's'); A.hit(i, tch + 0.3, 8, { note: true, small: true, noStop: true }); });
      A.move(0, 3.8, [0.6, 0.3], 0.4, 's'); A.move(0, 4.2, [-0.6, -0.3], 0.25, 'out');
      step(A, 0.3, tch - 0.4, '① 宵禁', '① Curfew'); step(A, tch - 0.4, 5.4, '② 圈里放聚音', '② Call Chime inside it');
      two(A, 0.2, 5.4, '请君入瓮：聚音把敌人穿过宵禁拉进来；进来了就出不去', 'Come in: Call Chime draws foes through a Curfew ring into it; once in they cannot get out'); } };
}
