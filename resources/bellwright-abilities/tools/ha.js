// Harmony 和鸣 forms: her sound touches both sides (T3: a friend In Tune 合调 4 s, 15% faster; a foe Off-key 走调 4 s, deals 15% less, takes 10% more).
import { DEFS, FORMS, H, FX, C, EASE, clamp, lerp, hang, tollFx, beatFx, noteBolt, inRing, friendsIn, ward, held, knockHud, foeBolt, foeSwing, ticks, beatsOf, KB, D2R,
  rock, rockSlow, baton, beat, listen, flare, clap, nod, crouch, onToes, turnTrunk, lookUp, antFlick, antQuiver, antDroop, antUp, antCurl, knock, toss, pawOut, tapTime, shove, floorCircle, mixA } from './defs.js';
import { lull, friendSwing, soloOn } from './defs.js';
import { ME, ptr, batBell, swingBell, rollBell, soundLine, earBell, headBell } from './base.js';
const F = FORMS.ha;
const V = C.verd;
const burst = (A, o) => FX.spark(A, { t: o.t, at: o.at, r: 0.8, col: o.col, dur: 0.3, op: 0.8 });
// a friend's swing at a foe (verdigris arc) and its number
const friendHit = (A, i, t, foe, n, o = {}) => { const p = A.dpos(i, t), q = A.dpos(foe, t); const yaw = Math.atan2(q.x - p.x, q.z - p.z) / D2R; FX.arcs(A, { t, at: [p.x, 0.5, p.z], y: 0.5, yaw, arc: 90, r: 0.8, dur: 0.25, col: V, op: 0.8 }); if (n != null) A.hit(foe, t + 0.08, n, o); };
const ally = (x, z, o = {}) => [x, z, Object.assign({ ally: true }, o)];
const both = (A, t, at, r, dur = 4) => { for (const d of A.card.dum) { const p = A.dpos(d.i, t); if (Math.hypot(p.x - at[0], p.z - at[1]) > r + 0.2) continue; if (d.opt.ally) A.tune(d.i, t + 0.03, dur); else A.offkey(d.i, t + 0.03, dur); } };

// F1 Loud bell (kit 1.2): a skill a friend casts from inside its ring is 30% larger
{ const p = [0.2, 0], a0 = ally(0.0, 0.7), a1 = ally(-0.9, -1.8), f0 = [1.6, 0.6], f1 = [-0.2, -2.6], f2 = [1.4, -0.8], B = beatsOf(1.6, 4.6), c1 = 2.0, c2 = 3.4;
  F.F1 = { T: 5.0, cam: { x: -0.3, z: -0.4, w: 7.0 }, her: H(ME[0], ME[1]), dum: [a0, a1, f0, f1, f2], seq: [[0.3, 'castPlant']], root: [{ t: 0.2, look: p }],
    body: (t) => mixA(listen(t, 1.3, 2.6), antFlick(t, B)),
    fx(A) { ptr(A, p, 0, 0.9); batBell(A, 0.7, [p[0], 1.2, p[1]], { dur: 0.15 }); hang(A, { at: p, t0: 0.86, t1: 5.0, beats: B, drop: true, dropH: 0.9, foes: [2, 4] });
      for (const [i, t, r, big] of [[0, c1, 1.56, true], [1, c2, 1.2, false]]) { FX.arcs(A, { t, at: (tt) => A.dpt(i, t, 0.03), r, arc: 360, n: 2, op: 0.85, col: V }); FX.ring(A, { t, at: (tt) => A.dpt(i, t, 0.02), r0: 0.3, r1: r, dur: 0.4, col: V, op: 0.5, w: 0.08 }); A.tag(i, t, t + 1.2, big ? ['扩音 +30%', 'Louder +30%'] : ['钟圈外', 'Outside the ring'], big ? C.brass : C.parch); }
      A.hit(2, c1 + 0.1, 13, {}); A.hit(4, c1 + 0.1, 13, {}); A.hit(3, c2 + 0.1, 10, {});
      A.cap(0.2, 5.0, '扩音钟：队友在钟圈里放的技能大 30%', 'Loud bell: a skill a friend casts from inside its ring is 30% larger'); } };
}
// F2 Morning bell: each toll takes 0.5 s off the cooldowns of friends in its ring
{ const p = [0.6, 0], a0 = ally(0.0, 0.9), a1 = ally(1.0, -0.8), f0 = [1.5, 0.5], f1 = [0.3, -0.4], tl = 1.25, B = beatsOf(2.25, 5.25);
  F.F2 = { ...DEFS.F2, dum: [a0, a1, f0, f1],
    fx(A) { ptr(A, p, 0, tl); hang(A, { kind: 'great', at: p, t0: tl, t1: 6.0, beats: B, drop: true, dropH: 3.2, n: 12, foes: [2, 3] }); FX.arcs(A, { t: tl, at: [p[0], 0.03, p[1]], r: 2.0, arc: 360, n: 2, op: 0.7 });
      for (const i of [2, 3]) A.hit(i, tl + 0.02, 14, { strike: true, stun: 0.6, big: true, off: true }); both(A, tl, p, 1.9, 4.8);
      for (const i of [0, 1]) { A.tag(i, tl + 0.1, 6, (t, lang) => { const n = B.filter((b) => t >= b).length * 0.5; return (lang === 'zh' ? '冷却 −' : 'Cooldowns −') + n + (lang === 'zh' ? ' 秒' : ' s'); }, V); for (const b of B) FX.note(A, { t: b, at: (tt) => A.dpt(i, b, 1.2), r1: 0.25, col: V, op: 0.6 }); }
      A.cap(0.2, 6.0, '晨钟：每响一次，钟圈里的队友技能冷却少 0.5 秒', 'Morning bell: each toll takes 0.5 s off the cooldowns of friends in its ring'); } };
}
// F3 Serve: foes hit are knocked to the nearest friend's feet, up to 3 u, dazed 0.4 s
{ const d0 = [-1.5, 0.7], d1 = [-1.4, -0.6], a0 = ally(0.6, 1.4), a1 = ally(0.9, -1.2), ts = 0.74;
  F.F3 = { ...DEFS.F3, T: 3.8, cam: { x: -0.7, z: 0, w: 6.2 }, dum: [d0, d1, a0, a1],
    fx(A) { swingBell(A, ts); for (const [i, a] of [[0, a0], [1, a1]]) { const p = A.dpos(i, 0); A.hit(i, ts + 0.04, 18, { strike: true, off: true, stun: 0.4 }); A.move(i, ts + 0.04, [a[0] - p.x - 0.8, a[1] - p.z], 0.45, 'out'); }
      both(A, ts + 0.04, [ME[0], ME[1]], 1.9); friendHit(A, 2, ts + 0.75, 0, 20); friendHit(A, 3, ts + 0.8, 1, 20);
      A.cap(0.2, 3.8, '送敌：打中的敌人被撞到最近队友脚边，最多 3 u，晕 0.4 秒', 'Serve: foes hit are knocked to the nearest friend’s feet, up to 3 u, dazed 0.4 s'); } };
}
// F4 Catching (kit 1.2): as the jar lifts, every debuff on the foe inside spreads to the foes within 3 u
{ const d0 = [0.6, 0], fs = [[1.8, 1.2], [2.0, -1.0], [-0.4, 1.5]], tl = 0.95, te = tl + 1.5;
  F.F4 = { T: 5.0, cam: { x: -0.1, z: 0.1, w: 6.8 }, her: H(ME[0], ME[1]), dum: [[d0[0], d0[1], { gone: [[tl, te]] }]].concat(fs), seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: d0 }],
    body: (t) => mixA(baton(t, 0.3, tl + 0.2), beat(t, tl), listen(t, te - 0.2, 4.6)),
    fx(A) { A.offkey(0, 0.2, 4.8); A.status(0, 0.2, 'slow', 4.6); A.tag(0, 0.2, tl, ['走调 · 减速 · 鸣震', 'Off-key · Slowed · Ringing'], V); A.ring(0, 0.2, 4.6);
      FX.bell(A, { kind: 'great', h: 1.0, floor: d0, t0: tl - 0.3, t1: te, drop: 0.3, dropH: 2.5, lift: true, strikes: [1.5, 2.0] }); A.hit(0, tl, 14, { strike: true });
      FX.ring(A, { t: te, at: [d0[0], 0.02, d0[1]], r0: 0.6, r1: 3, dur: 0.5, col: V, op: 0.7, w: 0.08 });
      for (const i of [1, 2, 3]) { noteBolt(A, { t: te, from: [d0[0], 0.7, d0[1]], to: (t) => A.dpt(i, t, 0.7), dur: 0.25, col: V }); A.offkey(i, te + 0.25, 4); A.status(i, te + 0.25, 'slow', 2.3); A.ring(i, te + 0.25, 2.3); A.tag(i, te + 0.3, 5.0, ['传染', 'Caught'], V); }
      A.cap(0.2, te, '扣住一个身上有减益的敌人', 'The jar comes down on a foe carrying debuffs');
      A.cap(te, 5.0, '传染：瓮升起时，它身上每个减益都传给 3 u 内的敌人', 'Catching: as the jar lifts, every debuff on the foe inside spreads to the foes within 3 u'); } };
}
// F5 Parade (kit 1.2): it rolls at a walk, 8 u, tolling as it goes; small foes are pushed ahead of it
{ const from = [-1.6, 0], tp = 1.15, dur = 3.4, d0 = [0.0, 0.1], d1 = [1.2, -0.2], d2 = [2.6, 1.4], a0 = ally(-2.0, 1.1);
  F.F5 = { T: 5.4, cam: { x: 1.6, z: 0, w: 9.6 }, her: H(-2.6, 0), dum: [d0, d1, d2, a0], seq: [[0.25, 'castPlant', { to: 0.62 }], [0.9, 'walk', { loop: true, until: tp + dur, speed: 0.8 }]], root: [{ t: 0.2, look: [4, 0] }, { t: 0.9, fw: 0 }, { t: tp + dur, fw: 6.0, e: 'lin' }],
    body: (t) => mixA(shove(t, tp)),
    fx(A) { const B = beatsOf(tp + 0.5, tp + dur); const pos = rollBell(A, { t0: tp, tset: 0.6, from, dir: [1, 0], dist: 8, dur, e: 'lin', beats: B }); A.move(3, 0.9, [6.0, 0], tp + dur - 0.9, 'lin');
      for (const i of [0, 1]) { const x0 = A.dpos(i, 0).x, tc = tp + dur * (x0 - from[0] - 0.6) / 8; A.move(i, tc, [from[0] + 8.6 - x0, 0], tp + dur - tc, 'lin'); A.hit(i, tc, 6, { off: true, small: true, noStop: true }); }
      for (const b of B) { const p = pos(b); FX.arcs(A, { t: b, at: [p[0], 0.03, p[1]], r: 1.3, arc: 360, op: 0.6 }); for (const i of inRing(A, p, 1.5, b)) A.hit(i, b + 0.03, 7, { ring: true, off: true, small: true, noStop: true }); }
      A.cap(0.2, 5.4, '巡游：钟像散步一样慢慢滚 8 u，一路鸣；小敌人被推着走', 'Parade: it rolls at a walk, 8 u, tolling as it goes; small foes are pushed ahead of it'); } };
}
// F6 Places: the bells fly to her friends, one each, and hang at their feet
{ const bs = [[-1.3, 1.6], [-1.0, -1.7], [2.6, 1.6]], as = [ally(0.4, 1.0), ally(0.5, -0.9), ally(1.6, 0.2)], fs = [[1.4, 1.3], [1.5, -1.1], [2.6, 0.0]], tf = 1.0;
  F.F6 = { T: 4.8, cam: { x: 0.3, z: 0, w: 7.4 }, her: H(ME[0], ME[1]), dum: as.concat(fs), seq: [[0.25, 'castSweep', { to: 0.3 }], [0.55, 'castBloom', { from: 0.5, to: 0.62 }], [0.8, 'bloomHold', { loop: true, until: 1.6 }]], root: [{ t: 0.2, look: [0.6, 0] }],
    body: (t) => mixA(flare(t, 0.5, 1.8), listen(t, 2.0, 4.4)),
    fx(A) { const B = beatsOf(2.0, 4.0); bs.forEach((b, k) => { const tg = [as[k][0] + 0.35, as[k][1] - 0.15]; hang(A, { at: (t) => { const u = EASE.io2(clamp((t - tf - 0.06 * k) / 0.5)); return [lerp(b[0], tg[0], u), lerp(b[1], tg[1], u)]; }, t0: 0, t1: 4.8, noLand: true, quiet: true, beats: B, lift: 0.0 });
        FX.trail(A, { of: (t) => { const u = EASE.io2(clamp((t - tf - 0.06 * k) / 0.5)); return new A.THREE.Vector3(lerp(b[0], tg[0], u), 0.3, lerp(b[1], tg[1], u)); }, t0: tf + 0.06 * k, t1: tf + 0.5 + 0.06 * k, w: 0.15, col: V, len: 0.25 }); A.tune(k, tf + 0.6, 4); });
      for (const b of B) for (const i of [3, 4, 5]) A.hit(i, b + 0.03, 7, { ring: true, small: true, noStop: true, off: true });
      A.cap(0.2, 4.8, '各就各位：钟飞到队友身边，一人一口，挂在脚边', 'Places: the bells fly to her friends, one each, and hang at their feet'); } };
}
// F7 Rout: small foes struck flee 1.5 s
{ const b = [0.4, 0], ds = [[1.0, 0.6], [0.9, -0.7], [-0.3, -0.7], [-0.2, 0.8]], tb = 1.28, a0 = ally(-1.2, 1.4);
  F.F7 = { ...DEFS.F7, T: 4.4, cam: { x: -0.1, z: 0, w: 7.0 }, dum: ds.concat([a0]),
    fx(A) { hang(A, { at: b, t0: 0, t1: 4.4, noLand: true, quiet: true, strikes: [tb] }); FX.arcs(A, { t: tb, at: [b[0], 0.03, b[1]], r: 1.5, arc: 360, n: 2, op: 0.8 }); both(A, tb, b, 1.6);
      ds.forEach((d, i) => { const dx = d[0] - b[0], dz = d[1] - b[1], L = Math.hypot(dx, dz); A.hit(i, tb + 0.04, 16, { stun: 0.4, off: true }); A.move(i, tb + 0.45, [dx / L * 1.4, dz / L * 1.4], 1.5, 'lin'); A.tag(i, tb + 0.4, tb + 1.95, ['逃', 'Flee'], C.stun); });
      A.cap(0.2, 4.4, '破胆：被鸣到的小敌人逃 1.5 秒', 'Rout: small foes struck flee 1.5 s'); } };
}
// F8 Sing along: every friend within 6 u is a bell for the tune: strokes ring round them in turn
{ const as = [ally(-0.4, 1.3), ally(-0.2, -1.3), ally(1.2, 0.2)], fs = [[0.6, 1.6], [0.7, -1.7], [2.2, 0.8], [2.0, -0.6]], S = [1.6, 1.98, 2.36, 2.74, 3.12, 3.5, 3.88, 4.26];
  F.F8 = { T: 5.4, cam: { x: 0.2, z: 0, w: 7.4 }, her: H(ME[0], ME[1]), dum: as.concat(fs), seq: [[0.3, 'idle', { speed: 0.5 }]], root: [{ t: 0.2, look: [0.6, 0] }],
    body: (t) => mixA(baton(t, 1.4, 4.5, 1.2), ...S.map((s) => beat(t, s - 0.05))),
    fx(A) { S.forEach((s, k) => { const w = k % 3, p = A.dpos(w, s); FX.bell(A, { t0: s - 0.1, t1: s + 0.35, h: 0.32, fade: true, at: (t) => { const q = A.dpt(w, t, 1.55); return [q.x, q.y, q.z]; }, strikes: [s] }); FX.arcs(A, { t: s, at: [p.x, 0.03, p.z], r: 1.8, arc: 360, n: 2, op: 0.75 }); A.tune(w, s + 0.03, 4);
        for (const i of inRing(A, [p.x, p.z], 1.8, s)) A.hit(i, s + 0.04, 10, { off: true, small: true, noStop: true }); });
      A.cap(0.2, 5.4, '传唱：6 u 内每个队友都是曲子里的一口钟：钟声轮流在他们身边响', 'Sing along: every friend within 6 u is a bell for the tune: strokes ring round them in turn'); } };
}
// F9 Called out: marks the foe 4 s: every friend's first hit on it is a sure crit; AI friends turn to it
{ const d0 = [1.0, 0.1], d1 = [1.4, 1.3], a0 = ally(-0.2, 1.2, { face: 120 }), a1 = ally(0.0, -1.1, { face: 60 }), t = 0.66;
  F.F9 = { T: 4.2, cam: { x: -0.3, z: 0.1, w: 6.4 }, her: H(ME[0], ME[1]), dum: [d0, d1, a0, a1], seq: [[0.3, 'castPoint']], root: [{ t: 0.2, look: d0 }],
    body: (t) => mixA(nod(t, 1.0, 0.6), listen(t, 1.4, 3.8)),
    fx(A) { batBell(A, t, (tt) => [A.dpt(0, tt, 0.6).x, 0.6, A.dpt(0, tt, 0.6).z], { dur: 0.22 }); noteBolt(A, { t, to: (tt) => A.dpt(0, tt, 0.6), dur: 0.22 }); A.hit(0, t + 0.22, 12, { note: true, off: true });
      A.tag(0, t + 0.3, 4.2, ['示众', 'Called out'], V); FX.ring(A, { t: t + 0.25, at: (tt) => A.dpt(0, tt, 0), r0: 0.5, r1: 0.5, dur: 3.5, col: V, op: 0.5, w: 0.05, follow: true });
      A.move(2, 1.2, [0.6, -0.6], 0.6, 's'); A.move(3, 1.25, [0.5, 0.6], 0.6, 's'); friendHit(A, 2, 1.95, 0, { zh: '暴击 36', en: 'Crit 36' }, { big: true, col: V }); friendHit(A, 3, 2.3, 0, { zh: '暴击 30', en: 'Crit 30' }, { big: true, col: V });
      A.cap(0.2, 4.2, '示众：标记 4 秒：每个队友打它的第一下必暴击；电脑队友转过去打它', 'Called out: marks the foe 4 s: every friend’s first hit on it is a sure crit; AI friends turn to it'); } };
}
// F10 Strip: foes on the line lose their shields, and 30% of their defence for 4 s
{ const ds = [[-0.6, 0.1, { elite: true }], [0.6, -0.1], [1.8, 0.2]], tk = 0.8;
  F.F10 = { ...DEFS.F10, T: 4.4, dum: ds,
    fx(A) { FX.bell(A, { t0: 0.45, t1: tk + 0.6, h: 0.3, at: (t) => { const p = A.ahead(0.5, 0.45, 0.55); return [p.x, p.y, p.z]; }, tint: '#6A5A48', strikes: [tk] });
      ward(A, 0, 0, tk + 0.2, 0, { col: '#9AA6B2' }); soundLine(A, tk, [ME[0] + 0.4, 0], [ME[0] + 5.5, 0], { dur: 0.3 });
      ds.forEach((d, i) => { const ti = tk + 0.3 * (d[0] - ME[0]) / 5.5; A.hit(i, ti, 15, { note: true, off: true }); A.tag(i, ti + 0.1, 4.4, ['防 −30%', 'Def −30%'], V); });
      burst(A, { t: tk + 0.12, at: (t) => A.dpt(0, tk, 0.6), n: 10, col: '#9AA6B2' });
      A.cap(0.2, 4.4, '卸甲：线上的敌人护盾碎掉，防御 −30%，4 秒', 'Strip: foes on the line lose their shields, and 30% of their defence for 4 s'); } };
}
// F11 Gift bells: the bells go to her friends: 6 s, their hits ring: 4 more, Ringing
{ const as = [ally(-0.4, 1.0), ally(-0.3, -1.0)], fs = [[0.8, 1.0], [0.9, -1.0], [1.8, 0.1]], tf = 0.95, H1 = [2.0, 2.8, 3.6, 4.4];
  F.F11 = { T: 5.0, cam: { x: -0.3, z: 0, w: 6.6 }, her: H(ME[0], ME[1]), dum: as.concat(fs), seq: [[0.3, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [0, 0] }],
    body: (t) => mixA(flare(t, 0.35, 0.8, 0.5), toss(t, tf), listen(t, 1.8, 4.6)),
    fx(A) { for (const i of [0, 1]) { const t1 = tf + 0.3 + 0.08 * i; FX.bell(A, { t0: tf, t1: 5, h: 0.16, at: (t) => { if (t < t1) { const p0 = A.at('handL', tf), q = A.dpt(i, t1, 1.0), u = clamp((t - tf) / (t1 - tf)); return [lerp(p0.x, q.x, u), lerp(p0.y, q.y, u) + 0.5 * Math.sin(u * Math.PI), lerp(p0.z, q.z, u)]; } const p = A.dpt(i, t, 0.75); return [p.x + 0.28, p.y, p.z]; }, strikes: H1.map((h) => h + 0.08 + 0.1 * i), rot: (t) => [Math.sin(t * 20) * 15, 0, 0] }); A.tune(i, t1, 4); }
      H1.forEach((h, k) => { friendHit(A, k % 2, h + 0.1 * (k % 2), 2 + (k % 2), 10); A.hit(2 + (k % 2), h + 0.2 + 0.1 * (k % 2), 4, { ring: true, small: true, noStop: true, col: C.brass }); });
      A.cap(0.2, 5.0, '赠铃：小铃送给队友：6 秒，他们打中就响：再 4，鸣震', 'Gift bells: the bells go to her friends: 6 s, their hits ring: 4 more, Ringing'); } };
}
// F12 Team knell: each friend's hit on the marked foe takes 0.5 s off the count and adds 3 to the knell, up to 30
{ const d0 = [0.9, 0], a0 = ally(0.1, 1.0), a1 = ally(0.2, -1.0), H1 = [1.1, 1.5, 1.9, 2.3], tk = 3.0;
  F.F12 = { T: 4.4, cam: { x: -0.6, z: 0, w: 6.0 }, her: H(ME[0], ME[1]), dum: [d0, a0, a1], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: d0 }],
    body: (t) => mixA(knock(t, 0.5, 2.6, [0.7]), nod(t, tk + 0.1, 1.0)),
    fx(A) { knockHud(A, 0, 0.5, tk, (t) => Math.min(3, 1 + H1.filter((h) => t >= h + 0.1).length * 0.5 | 0));
      H1.forEach((h, k) => { friendHit(A, 1 + (k % 2), h, 0, 8); });
      A.tag(0, 1.0, tk + 0.4, (t, lang) => (lang === 'zh' ? '丧钟 ' : 'Knell ') + (30 + 3 * H1.filter((h) => t >= h + 0.1).length), V);
      FX.bell(A, { t0: tk - 0.3, t1: tk + 0.4, h: 0.4, tint: '#6A5A48', at: (t) => { const p = A.dpt(0, t, 1.6); return [p.x, p.y, p.z]; }, strikes: [tk] }); FX.arcs(A, { t: tk, at: [d0[0], 0.03, d0[1]], r: 1.5, arc: 360, n: 2, op: 0.8 }); A.hit(0, tk + 0.03, 42, { note: true, big: true, off: true });
      A.cap(0.2, 4.4, '追魂：队友每打被标记的敌人一下，倒数快 0.5 秒，丧钟 +3，最多 +30', 'Team knell: each friend’s hit on the marked foe takes 0.5 s off the count and adds 3 to the knell, up to 30'); } };
}
// F13 Discord: a small foe strikes the foe nearest it for 5 s (an elite 2 s; a boss or champion: Off-key at double)
{ const d0 = [0.4, 0.2], d1 = [1.6, 0.8], d2 = [1.4, -0.9];
  F.F13 = { T: 5.0, cam: { x: -0.4, z: 0, w: 6.2 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: d0 }],
    body: (t) => mixA(antCurl(t, 0.3, 1.2), listen(t, 1.3, 4.6)),
    fx(A) { noteBolt(A, { t: 0.9, from: 'atR', to: (t) => A.dpt(0, t, 1.1), dur: 0.3 }); earBell(A, 0, 1.2, 5.0); A.offkey(0, 1.2, 3.8); A.tag(0, 1.25, 5.0, ['乱', 'Discord'], V);
      A.move(0, 1.3, [0.3, 0.1], 0.3, 's'); for (const [t, j] of [[1.8, 1], [2.5, 2], [3.2, 1], [3.9, 2]]) { foeSwing(A, 0, t, [A.dpos(j, t).x, A.dpos(j, t).z]); A.hit(j, t + 0.1, 9, {}); }
      A.cap(0.2, 5.0, '乱耳：小敌人 5 秒里去打离它最近的敌人（精英 2 秒；首领、勇士：走调加倍）', 'Discord: a small foe strikes the foe nearest it for 5 s (an elite 2 s; a boss or champion: Off-key at double)'); } };
}
// F14 Shared pain: the called foes share pain 3 s: a hit on one deals 25% to the others
{ const bo = [0.6, 0], ds = [[2.7, 1.2], [2.9, -1.3], [0.2, 2.6]], tc = 1.0, a0 = ally(-0.6, -1.4), H1 = [2.2, 3.0];
  F.F14 = { T: 4.4, cam: { x: 0.4, z: 0, w: 7.6 }, her: H(ME[0], ME[1]), dum: ds.concat([a0]), seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: bo }],
    body: (t) => mixA(baton(t, 0.4, 1.6), listen(t, 1.8, 3.8)),
    fx(A) { hang(A, { kind: 'chime', at: bo, t0: 0.6, t1: 4.4, quiet: true, drop: true, dropH: 1 }); FX.ring(A, { t: tc, at: [bo[0], 0.02, bo[1]], r0: 3.5, r1: 0.5, e: 'in2', dur: 0.4, col: C.brass, op: 0.7, w: 0.05 });
      ds.forEach((d, i) => { const dx = bo[0] - d[0], dz = bo[1] - d[1], L = Math.hypot(dx, dz), k = 2 / L; A.move(i, tc + 0.05, [dx * k * 0.55, dz * k * 0.55], 0.4, 'out'); A.hit(i, tc + 0.4, 8, { note: true, small: true, off: true }); });
      FX.chord(A, { a: (t) => A.dpt(0, t, 0), b: (t) => A.dpt(1, t, 0), t0: 1.5, t1: 4.4, beats: H1, w: 0.04 }); FX.chord(A, { a: (t) => A.dpt(1, t, 0), b: (t) => A.dpt(2, t, 0), t0: 1.5, t1: 4.4, beats: H1, w: 0.04 }); FX.chord(A, { a: (t) => A.dpt(2, t, 0), b: (t) => A.dpt(0, t, 0), t0: 1.5, t1: 4.4, beats: H1, w: 0.04 });
      for (const h of H1) { friendHit(A, 3, h - 0.08, 0, 20); A.hit(1, h + 0.1, 5, { col: V, small: true, noStop: true }); A.hit(2, h + 0.1, 5, { col: V, small: true, noStop: true }); }
      A.cap(0.2, 4.4, '同悲：召来的敌人 3 秒同悲：打一个，其余各挨 25%（20 → 5）', 'Shared pain: the called foes share pain 3 s: a hit on one deals 25% to the others (20 → 5)'); } };
}
// F15 Rouse: friends in the cone are freed of stuns, slows and roots and cannot be stopped 1.5 s
{ const a0 = ally(0.0, 0.4), a1 = ally(0.6, -0.6), f0 = [1.7, 0.6], f1 = [2.0, -0.7], th = 0.5, tr = 1.9;
  F.F15 = { T: 4.4, cam: { x: -0.1, z: 0, w: 6.8 }, her: H(ME[0], ME[1]), dum: [a0, a1, f0, f1], seq: [[0.3, 'combo3', { to: 0.2 }], [th, 'drumHold', { loop: true, until: tr, fade: 0.08 }], [tr, 'combo3', { from: 0.42 }]], root: [{ t: 0.2, look: [1, 0] }],
    body: (t) => mixA(listen(t, 2.6, 4.0)),
    fx(A) { A.status(0, 0.2, 'stun', tr + 0.1 - 0.2); A.status(1, 0.2, 'slow', tr + 0.1 - 0.2);
      FX.bell(A, { kind: 'great', h: 0.55, t0: 0.3, t1: tr + 0.5, fade: true, at: (t) => { const r = A.rootAt(t); return [r.x + 0.6, 0.3, r.z]; }, rot: () => [-98, 90, 0], strikes: [tr] });
      FX.arcs(A, { t: tr + 0.05, at: [ME[0] + 0.7, 0.03, 0], yaw: 90, arc: 60, r: 3.5, n: 4, gap: 0.05, op: 0.85, col: V }); for (const i of [0, 1]) { A.tune(i, tr + 0.2, 4); A.tag(i, tr + 0.2, tr + 1.7, ['不倒', 'Unstoppable'], V); burst(A, { t: tr + 0.2, at: (t) => A.dpt(i, tr + 0.2, 0.6), n: 8, col: V }); }
      for (const i of [2, 3]) A.hit(i, tr + 0.25, 24, { note: true, off: true, knock: [1.2, 0] }); A.move(0, tr + 0.5, [0.8, 0.3], 0.5, 'out'); A.move(1, tr + 0.5, [0.8, -0.1], 0.5, 'out');
      A.cap(0.2, 4.4, '醒神：锥形里的队友解除眩晕、减速、定身，1.5 秒不会被打断', 'Rouse: friends in the cone are freed of stuns, slows and roots and cannot be stopped 1.5 s'); } };
}
// F16 Crescendo (kit 1.2): each stroke a friend in the ring hears adds 5% to that friend's next skill, up to 60%
{ const a0 = ally(-0.6, 1.0), a1 = ally(-0.4, -1.0), f0 = [1.4, 1.1], f1 = [1.5, -1.2], t0 = 0.6, S = Array.from({ length: 12 }, (_, i) => +(t0 + i * 0.25).toFixed(2)), tc = S[11] + 0.6;
  F.F16 = { T: 5.4, cam: { x: -0.6, z: 0, w: 6.8 }, her: H(ME[0], ME[1]), dum: [a0, a1, f0, f1], seq: [[0.3, 'idleHold', { loop: true, until: 5.4 }]],
    body: (t) => mixA(rockSlow(t, t0, S[11] + 0.1, 0.25, 0.9), flare(t, t0, 3.8, clamp((t - t0) / 3)), onToes(t, S[11] - 0.05, 4.2)),
    fx(A) { S.forEach((s, i) => FX.arcs(A, { t: s, at: [ME[0], 0.03, ME[1]], r: 4, arc: 360, dur: 0.45, op: 0.25 + 0.04 * i, col: i % 2 ? V : C.brass }));
      for (const i of [0, 1]) A.tag(i, t0, tc + 0.8, (t, lang) => (lang === 'zh' ? '渐强 +' : 'Crescendo +') + 5 * S.filter((s) => t >= s).length + '%', C.brass);
      for (const [i, f] of [[0, 2], [1, 3]]) { FX.arcs(A, { t: tc, at: (t) => A.dpt(i, tc, 0.03), r: 1.6, arc: 360, n: 3, op: 0.9, col: V }); A.hit(f, tc + 0.1, 32, { big: true }); }
      A.cap(0.2, tc, '渐强：圈里的队友每听到一下，下一个技能 +5%，最多 +60%', 'Crescendo: each stroke a friend in the ring hears adds 5% to their next skill, up to 60%');
      A.cap(tc, 5.4, '队友的下一个技能：+60%（20 → 32）', 'The friend’s next skill: 60% more (20 → 32)'); } };
}
// F17 Slip away: foes that were after her attack the chime for 2 s
{ const d0 = [-0.2, 0.6, { face: 270 }], d1 = [-0.3, -0.6, { face: 270 }], tj = 0.5, tl2 = 1.1;
  F.F17 = { T: 4.2, cam: { x: -1.2, z: 0, w: 6.2 }, her: H(-1.0, 0, 270), dum: [d0, d1], seq: [[0.3, 'hop']], root: [{ t: tj, fw: 0, y: 0 }, { t: tl2, fw: 2.4, y: 0, jump: 0.7, e: 'lin' }],
    body: (t) => mixA(listen(t, 1.6, 3.8)),
    fx(A) { hang(A, { kind: 'chime', at: [-1.0, 0], t0: tj, t1: 4.2, quiet: true, strikes: [1.4, 1.9, 2.4, 2.9] }); A.tag(0, 1.1, 3.2, ['盯铃', 'On chime'], V); A.tag(1, 1.1, 3.2, ['盯铃', 'On chime'], V);
      for (const [i, t] of [[0, 1.3], [1, 1.8], [0, 2.3], [1, 2.8]]) foeSwing(A, i, t, [-1.0, 0]); for (const t of [1.4, 1.9, 2.4, 2.9]) FX.note(A, { t, at: [-1.0, 0.4, 0], r1: 0.3 });
      A.cap(0.2, 4.2, '金蝉脱壳：原本追她的敌人改打铃 2 秒', 'Slip away: foes that were after her attack the chime for 2 s'); } };
}
// F18 Common foe (kit 1.2): for those 4 s the two friends deal 25% more to the lulled foes
{ const a0 = ally(-0.6, -1.0), a1 = ally(0.2, 1.0), f0 = [0.6, -1.3], f1 = [1.0, 1.4], f2 = [-0.2, -1.9], tb = [0.7, 1.3];
  F.F18 = { T: 5.4, cam: { x: -0.6, z: 0, w: 6.6 }, her: H(ME[0], ME[1]), dum: [a0, a1, f0, f1, f2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [a0[0], a0[1]] }, { t: 1.0, look: [a1[0], a1[1]] }],
    body: (t) => mixA(baton(t, 0.3, 1.6), beat(t, tb[0]), beat(t, tb[1]), listen(t, 2.0, 5.0)),
    fx(A) { for (const [i, t, foes] of [[0, tb[0], [2, 4]], [1, tb[1], [3]]]) { FX.bell(A, { t0: t - 0.1, t1: t + 0.6, h: 0.22, fade: true, at: (tt) => { const p = A.dpt(i, t, 1.55); return [p.x, p.y, p.z]; }, strikes: [t + 0.05] }); FX.ring(A, { t: t + 0.05, at: (tt) => A.dpt(i, t, 0.02), r0: 0.3, r1: 2.0, dur: 0.6, col: C.pale, op: 0.6, w: 0.06 }); for (const f of foes) lull(A, f, t + 0.15, t + 4.15); A.tag(i, t + 0.15, t + 4.15, ['同仇 +25%', 'Common foe +25%'], V); }
      for (const [a, f, t] of [[0, 2, 2.0], [1, 3, 2.4], [0, 4, 3.0], [1, 3, 3.5]]) friendSwing(A, a, t, f, 25);
      A.cap(0.2, 5.4, '同仇：4 秒里两个队友打入静的敌人 +25%（20 → 25）', 'Common foe: for those 4 s the two friends deal 25% more to the lulled foes (20 → 25)'); } };
}
// F19 Fast and slow: the haste lasts 5 s; a hastened friend's hits slow the foe 25% 2 s
{ const a0 = ally(-1.4, 0.9), a1 = ally(-1.3, -0.9), f0 = [0.6, 0.8], f1 = [0.7, -0.9];
  F.F19 = { T: 5.0, cam: { x: -0.9, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: [a0, a1, f0, f1], seq: [[0.25, 'castBloom', { to: 0.62 }], [0.87, 'bloomHold', { loop: true, until: 1.8 }]], root: [{ t: 0.2, look: [0, 0] }],
    body: (t) => mixA(pawOut(t, 0.4, 1.8, 0.7), antQuiver(t, 0.9, 1.8)),
    fx(A) { FX.fork(A, { t0: 0.35, t1: 1.9, at: 'handL', hums: [0.95] }); FX.ring(A, { t: 0.95, at: [ME[0], 0.02, ME[1]], r0: 0.4, r1: 3, dur: 0.5, col: V, op: 0.6, w: 0.06 }); for (const i of [0, 1]) { A.tune(i, 1.0, 5); A.tag(i, 1.0, 5.0, ['快 5 秒', 'Haste 5 s'], V); }
      A.move(0, 1.2, [1.4, -0.1], 0.5, 's'); A.move(1, 1.2, [1.4, 0.1], 0.5, 's');
      for (const [i, f, t] of [[0, 2, 2.0], [1, 3, 2.2], [0, 2, 2.7], [1, 3, 2.9]]) { friendHit(A, i, t, f, 10, { slow: 2 }); }
      A.cap(0.2, 5.0, '快慢：加速 5 秒；被加速的队友打中就减速敌人 25%，2 秒', 'Fast and slow: the haste lasts 5 s; a hastened friend’s hits slow the foe 25% 2 s'); } };
}
// F20 Upstaged (kit 1.2): every foe the soloist hits deals 30% less for 3 s
{ const a0 = ally(-0.3, 0.0), fs = [[0.5, 0.6], [0.6, -0.6], [1.5, 0.2]], tg = 1.0;
  F.F20 = { T: 5.4, cam: { x: -0.4, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: [a0].concat(fs), seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [a0[0], a0[1]] }],
    body: (t) => mixA(baton(t, 0.3, 1.2), beat(t, tg - 0.05), listen(t, 1.6, 5.0)),
    fx(A) { soloOn(A, 0, tg + 0.05, 5.0);
      for (const [f, t] of [[1, 1.5], [2, 2.0], [3, 2.8]]) { friendSwing(A, 0, t, f, 26); A.offkey(f, t + 0.1, 3); A.tag(f, t + 0.1, t + 3.1, ['抢戏 伤害 −30%', 'Upstaged: deals −30%'], '#5F8F7C'); }
      for (const [f, t] of [[1, 3.4], [2, 3.9]]) { foeSwing(A, f, t, [a0[0], a0[1]]); A.hit(0, t + 0.1, 7, { col: C.foe, small: true, noStop: true }); }
      A.cap(0.2, 5.4, '抢戏：独奏的队友打到的敌人伤害 −30%，3 秒（10 → 7）', 'Upstaged: every foe the soloist hits deals 30% less for 3 s (10 → 7)'); } };
}
// F21 Drag the beat: foes within 5 u: their wind-ups take twice as long, 4 s
{ const d0 = [0.4, 0.7], d1 = [0.6, -0.8], a0 = ally(-0.6, 0);
  F.F21 = { T: 5.4, cam: { x: -0.5, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: [d0, d1, a0], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [0.4, 0] }],
    body: (t) => mixA(baton(t, 0.4, 1.8), { upperarmR: [t > 0.9 && t < 1.7 ? -30 * Math.sin((t - 0.9) / 0.8 * Math.PI) : 0, 0, 0] }, listen(t, 1.8, 5.0)),
    fx(A) { FX.ring(A, { t: 1.3, at: [ME[0], 0.02, ME[1]], r0: 0.4, r1: 5, dur: 0.9, col: V, op: 0.5, w: 0.08 }); for (const i of [0, 1]) { A.offkey(i, 1.6, 4); A.tag(i, 1.6, 5.4, ['蓄力 ×2', 'Wind-up ×2'], V); }
      for (const [i, t0] of [[0, 2.0], [1, 2.4]]) { FX.ring(A, { t: t0, at: (t) => A.dpt(i, t0, 0.02), r0: 0.2, r1: 0.9, dur: 1.6, col: C.foe, op: 0.6, w: 0.05 }); foeSwing(A, i, t0 + 1.6, [a0[0], a0[1]]); }
      A.move(2, 3.0, [-0.6, 0], 0.3, 'out');
      A.cap(0.2, 5.4, '拖拍：5 u 内的敌人蓄力慢一倍，4 秒（队友有时间躲开）', 'Drag the beat: foes within 5 u: their wind-ups take twice as long, 4 s (friends have time to step away)'); } };
}
// F22 Clear the floor (kit 1.2): foes inside are pushed out and none may enter; friends inside stay In Tune
{ const c = [0.4, 0], a0 = ally(0.2, 0.6), a1 = ally(0.6, -0.5), f0 = [0.9, 0.2], f1 = [-0.3, -0.4], f2 = [3.4, 0.6], t0 = 1.0;
  F.F22 = { T: 5.0, cam: { x: 0.5, z: 0, w: 7.6 }, her: H(ME[0], ME[1]), dum: [a0, a1, f0, f1, f2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: c }],
    body: (t) => mixA(floorCircle(t, 0.4, 1.0), listen(t, 1.4, 4.6)),
    fx(A) { FX.fence(A, { t0: t0, t1: 4.6, at: [c[0], 0, c[1]], r: 2.5, h: 0.6 }); for (const i of [2, 3]) { const p = A.dpos(i, 0), dx = p.x - c[0], dz = p.z - c[1], L = Math.hypot(dx, dz); A.move(i, t0 + 0.1, [dx / L * (2.8 - L), dz / L * (2.8 - L)], 0.4, 'out'); A.hit(i, t0 + 0.1, 6, { off: true, small: true }); }
      A.move(4, 1.6, [-0.6, -0.4], 0.6, 's'); FX.arcs(A, { t: 2.2, at: [c[0] + 2.5, 0.3, c[1] + 0.2], y: 0.3, yaw: 90, arc: 60, r: 0.6, op: 0.8, col: V }); A.move(4, 2.25, [0.5, 0.2], 0.3, 'out');
      for (const i of [0, 1]) { A.tune(i, t0 + 0.05, 3.6); A.tag(i, t0 + 0.1, 4.6, ['合调', 'In Tune'], V); }
      A.cap(0.2, 5.0, '清场：圈里的敌人被推出去，谁也进不来；圈里的队友一直合调', 'Clear the floor: foes inside are pushed out and none may enter; friends inside stay In Tune'); } };
}
// F23 Cut in: she clicks to a friend within 7 u; foes within 2.5 u of them are flipped
{ const a0 = ally(2.6, 0.2), fs = [[3.4, 0.8], [3.3, -0.7], [2.0, -0.8]], tj = 0.75, tl = 1.35;
  F.F23 = { T: 4.4, cam: { x: 0.8, z: 0, w: 8.2 }, her: H(-2.6, 0), dum: [a0].concat(fs), seq: [[0.25, 'idle', { speed: 0.6 }], [tj - 0.1, 'tuck', { loop: true, until: tl + 0.5, fade: 0.06 }], [tl + 0.5, 'idle', { fade: 0.2 }]],
    root: [{ t: 0.2, look: [a0[0], a0[1]] }, { t: tj, fw: 0, y: 0 }, { t: tl, x: 2.0, z: 0.5, y: 0, jump: 1.3, e: 'lin', spin: 360 }, { t: tl + 0.6, look: [3.4, 0.8] }],
    body: (t) => mixA(clap(t, tj)),
    fx(A) { foeSwing(A, 1, 0.6, [a0[0], a0[1]]); FX.arcs(A, { t: tl, at: [2.3, 0.03, 0.3], r: 2.5, arc: 360, n: 3, op: 0.85 }); FX.dust(A, { t: tl, at: [2.0, 0.02, 0.5], n: 12, sp: 1.2, dur: 0.5 }); A.shake(tl, 0.07, 0.25); A.tune(0, tl + 0.03, 4);
      for (const i of [1, 2, 3]) { A.hit(i, tl + 0.03, 10, { strike: true, off: true }); A.launch(i, tl + 0.03, 0.35); A.tag(i, tl + 0.2, tl + 1.1, ['翻倒', 'Flipped'], C.stun); }
      A.cap(0.2, 4.4, '救场：叩到 7 u 内的队友身边；他身边 2.5 u 的敌人全翻倒', 'Cut in: she clicks to a friend within 7 u; foes within 2.5 u of them are flipped'); } };
}
// F24 War song: no tolls: each beat friends gain a verse: 5% damage and speed, up to six; foes near a friend lose 5% damage a beat
{ const a0 = ally(-1.1, 1.2), a1 = ally(-0.8, -1.3), fs = [[0.4, 1.4], [0.6, -1.6], [0.9, 0.1]], te = 5.6, B = beatsOf(1.5, 5.5);
  F.F24 = { ...DEFS.F24, dum: [a0, a1].concat(fs),
    fx(A) { FX.ring(A, { t: 0.9, at: [ME[0], 0.02, ME[1]], r0: 0.4, r1: 4, dur: 0.6, col: V, op: 0.5, w: 0.05 }); A.move(0, 1.4, [1.2, 0.2], 4.2, 'lin'); A.move(1, 1.4, [1.2, 0.3], 4.2, 'lin');
      for (const b of B) for (const w of ['me', 0, 1]) FX.note(A, { t: b, at: (t) => w === 'me' ? A.at('head', b) : A.dpt(w, b, 1.5), r1: 0.28, col: V, op: 0.7 });
      for (const i of [0, 1]) A.tag(i, 1.5, te, (t, lang) => { const n = Math.min(6, B.filter((b) => t >= b).length); return (lang === 'zh' ? '战歌 ' : 'Verse ') + n + ' · +' + 5 * n + '%'; }, V);
      for (const i of [2, 3, 4]) A.tag(i, 1.6, te, (t, lang) => { const n = Math.min(6, B.filter((b) => t >= b + 0.1).length); return (lang === 'zh' ? '伤 −' : 'Dmg −') + 5 * n + '%'; }, C.verdDull || '#5F8F7C');
      A.cap(0.2, 6.0, '战歌：不鸣钟：每拍队友 +5% 伤害和速度（最多六段）；身边的敌人每拍 −5% 伤害', 'War song: no tolls: each beat friends gain 5% damage and speed (up to six); foes near them lose 5% damage a beat'); } };
}
