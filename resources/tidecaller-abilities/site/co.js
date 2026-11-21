// The twelve combos (C1 to C12): one small rule between two of her skills, or a skill and her dash or water
import { FX, C, EASE, clamp, lerp } from './tc.js';
import { H, DEFS, D2R, around, fan, gaugeHud, foeBolt, ticks, shieldOn, block, streamOn, tailSlap, shake, coil, crouch, turnTrunk, lookUp, shiver, pawUp, mixA } from './defs.js';
const chime = (A, t, zh, en) => { A.say(t, { zh, en }, { col: C.foam }); FX.spark(A, { t, at: (tt) => A.body(t, 1.1), r: 0.5, col: C.foam, op: 0.6 }); };

// C1 Park the orb: a Tide Orb let go over her Whirlpool does not burst: it circles in the pool, still ticking, and bursts when the pool ends
{ const me = [-2.4, 0.3], c = [0.6, 0], ds = [around(c, 30, 1.2), around(c, 200, 1.1), around(c, 300, 1.0)]; const tp = 0.3 + 0.4, tl = 2.4, te = 5.0;
  DEFS.C1 = { T: te + 0.8, cam: { x: -0.3, z: 0.0, w: 6.4 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant'], [1.1, 'castBloom', { to: 0.62 }], [1.42, 'bloomHold', { loop: true, until: tl }], [tl, 'castPoint', { from: 0.3 }], [tl + 0.6, 'idle', { loop: true, until: te + 0.8, fade: 0.2 }]],
    root: [{ t: 0.3, look: c }], body: (t) => mixA(tailSlap(t, tp, 0.5), pawUp(t, 1.3, tl, 0.7), shake(t, te + 0.2, 0.5, 0.5)),
    fx(A) { FX.pool(A, { t0: tp, t1: te, at: [c[0], 0, c[1]], r: 1.6, whirl: 1, op: 0.55 });
      ds.forEach((d, i) => { A.moveTo(i, tp + 0.2, around(c, [30, 200, 300][i] + 60, 0.6), 1.6, 'out'); A.turn(i, tp + 0.2, 200, 1.6); A.status(i, tp + 0.3, 'slow', te - tp - 0.3); });
      const lead = (t) => { const u = clamp((t - 1.4) / (tl - 1.4)); return [lerp(-1.2, c[0] + 0.9, EASE.s(u)), 0.55, lerp(0.4, c[1], u)]; };
      const circ = (t) => { const a = (t - tl) * 3; return [c[0] + Math.cos(a) * 0.9, 0.5, c[1] - Math.sin(a) * 0.9]; };
      const orbAt = (t) => t < 1.4 ? A.at('tip', t).toArray() : t < tl ? lead(t) : circ(t);
      FX.orb(A, { t0: 1.2, t1: te, at: orbAt, r: 0.3, pop: false }); FX.rope(A, { t0: 1.4, t1: tl, from: 'tip', to: orbAt, w: 0.03, sag: 0.1 }); FX.trail(A, { of: (t) => new A.THREE.Vector3(...circ(Math.min(t, te))), t0: tl, t1: te, len: 0.4, w: 0.2, col: C.foam, op: 0.45 });
      for (let t = tl + 0.3; t < te; t += 0.3) { const q = circ(t); ds.forEach((d, i) => { const p = A.dpos(i, t); if (Math.hypot(q[0] - p.x, q[2] - p.z) < 0.55) A.hit(i, t, 4, { noStop: true, soak: true }); }); }
      chime(A, tl + 0.1, '珠落漩涡', 'Park the orb'); FX.splash(A, { t: te, at: [c[0], 0, c[1]], r: 1.2, h: 1.0, crash: true }); ds.forEach((d, i) => A.hit(i, te + 0.02, 22, { crash: true })); A.shake(te, 0.06, 0.2);
      A.cap(0.3, tl, '先放漩涡，再在上面松开潮珠', 'Whirlpool, then let a Tide Orb go over it'); A.cap(tl, te + 0.8, '潮珠不爆：在漩涡里绕圈继续打，漩涡结束时才爆', 'It does not burst: it circles in the pool, still ticking, and bursts when the pool ends'); } };
}
// C2 Rain feeds the pool: a Whirlpool under her Rain Squall lasts as long as the rain
{ const me = [-2.4, 0.3], c = [0.5, 0], ds = [around(c, 30, 1.3), around(c, 180, 1.2), around(c, 290, 1.1)]; const tp = 0.3 + 0.4, tr = 1.3;
  DEFS.C2 = { T: 6.4, cam: { x: -0.3, z: 0.0, w: 6.4, y: 0.7 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant'], [tr, 'castBloom'], [tr + 1.4, 'idle', { loop: true, until: 6.4, fade: 0.2 }]],
    root: [{ t: 0.3, look: c }], body: (t) => mixA(tailSlap(t, tp, 0.5), lookUp(t, tr + 0.2, tr + 1.0, 25)),
    fx(A) { FX.rain(A, { t0: tr + 0.55, t1: 6.2, at: [c[0], 0, c[1]], r: 1.6, h: 2.3, n: 40, wet: false });
      FX.pool(A, { t0: tp, t1: 6.2, at: [c[0], 0, c[1]], r: (t) => 1.6 + (t > tr + 0.6 ? 0.15 : 0), whirl: (1), op: 0.6 }); FX.column(A, { t: tr + 0.8, at: [c[0], 0, c[1]], h: (t) => 0.6, r: 0.35, dur: 5.2, rise: 0.8 });
      A.hud(gaugeHud('漩涡', 'Whirlpool', (t) => t < tp ? null : t < tr + 0.6 ? 1 - (t - tp) / 5 : (6.2 - t) / (6.2 - tr - 0.6), { col: C.cobalt }));
      ds.forEach((d, i) => { A.moveTo(i, tp + 0.2, around(c, [30, 180, 290][i] + 60, 0.45), 2.0, 'out'); A.turn(i, tp + 0.2, 300, 3); A.status(i, tp + 0.3, 'slow', 5.6); for (let k = 0; k < 5; k++) A.hit(i, tp + 0.5 + k, 4 + (k > 0 ? 3 : 0), { noStop: true, soak: k === 0 }); });
      chime(A, tr + 0.65, '雨入漩涡', 'Rain feeds the pool'); A.cap(0.3, tr + 0.6, '漩涡', 'Whirlpool'); A.cap(tr + 0.6, 6.4, '漩涡在骤雨下，雨多久它就多久', 'A Whirlpool under her Rain Squall lasts as long as the rain'); } };
}
// C3 Geyser under the prison: a Geyser under a sealed foe shoots the bubble up; it pops in the air: doubled, and over the whole pack below
{ const me = [-2.2, 0.2], d0 = [0.3, 0.1], ds = [[d0[0], d0[1], { soaked: true }], around(d0, 40, 1.0), around(d0, 160, 1.1), around(d0, 280, 0.9)]; const tc = 0.3 + 0.6, ts = tc + 0.6, tg = 1.9, te = tg + 0.6, tpop = te + 0.55;
  DEFS.C3 = { T: tpop + 1.4, cam: { x: -0.4, z: 0.0, w: 6.2, y: 1.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom'], [tg - 0.3, 'castPlant', { from: 0.2 }]],
    body: (t) => mixA(pawUp(t, 0.4, 1.0, 0.6), lookUp(t, te, tpop + 0.4, 30), shake(t, tpop + 0.6, 0.6, 0.6)),
    fx(A) { const yAt = (t) => t < te ? 0.7 : lerp(0.7, 2.4, EASE.out(clamp((t - te) / 0.5)));
      A.hold(0, ts, tpop, 0.7); const bAt = (t) => t < ts ? (() => { const s = A.at('tip', tc), u = EASE.s(clamp((t - tc) / 0.6)); const q = A.dpt(0, ts, 0.6); return [lerp(s.x, q.x, u), lerp(s.y, q.y, u), lerp(s.z, q.z, u)]; })() : [d0[0], yAt(t) + 0.55, d0[1]];
      FX.bubble(A, { t0: tc, t1: tpop, at: bAt, r: (t) => t < ts ? 0.25 : 0.65 });
      A.hold(0, te, tpop, 2.4, { drop: true }); FX.pool(A, { t0: tg, t1: te + 0.1, at: [d0[0], 0, d0[1]], r: 0.8, op: 0.45 }); FX.column(A, { t: te, at: [d0[0], 0, d0[1]], h: (t) => yAt(t) + 0.2, r: 0.5, dur: 0.8 });
      FX.splash(A, { t: tpop, at: [d0[0], 0, d0[1]], r: 1.6, h: 1.2, crash: true }); FX.rain(A, { t0: tpop, t1: tpop + 0.9, at: [d0[0], 0, d0[1]], r: 1.5, h: 2.4, n: 30, wet: false });
      A.hit(0, tpop, 38, { crash: true }); [1, 2, 3].forEach((i) => A.hit(i, tpop + 0.25, 24, { soak: true })); A.say(tpop, { zh: '×2', en: '×2' }, { col: C.sky }); A.shake(tpop, 0.06, 0.2);
      chime(A, te + 0.1, '泉顶水牢', 'Geyser under the prison'); A.cap(0.3, tg, '水牢封住一个敌人', 'Water Prison seals a foe'); A.cap(tg, tpop + 1.4, '下面放间歇泉：泡泡被顶上天爆开，翻倍，淋到下面所有敌人', 'A Geyser under it shoots the bubble up: it pops in the air, doubled, over the whole pack'); } };
}
// C4 More water, more skips: each time Skipping Stone lands on her own water it skips once more, up to 8
{ const me = [-2.8, 0.2]; const pts = [[-2.0, 0.2], [-1.3, 0.25], [-0.6, 0.2], [0.1, 0.15], [0.8, 0.2], [1.5, 0.25], [2.2, 0.2], [2.8, 0.2]]; const t0 = 0.3 + 0.32, per = 0.17;
  DEFS.C4 = { T: 3.6, cam: { x: 0.0, z: 0.0, w: 7.2 }, her: H(me[0], me[1]), dum: [[-0.6, 0.25, { soaked: true }], [1.5, 0.3], [2.8, 0.25]], seq: [[0.3, 'flick']], body: (t) => mixA(shake(t, 2.8, 0.6, 0.5)),
    fx(A) { FX.strip(A, { t0: 0, t1: 3.6, from: [-2.4, 0, 0.2], to: [1.9, 0, 0.2], w: 0.9, op: 0.35, flow: 0.2 }); FX.stone(A, { t: t0, pts, per, hop: 0.28, grow: false });
      pts.forEach((p, k) => { const t = t0 + per * (k + 1); A.say(t, { zh: String(k + 1), en: String(k + 1) }, { col: k >= 4 ? C.sky : C.parch }); });
      A.hit(0, t0 + per * 3, 10, { wet: true, soak: true }); A.hit(1, t0 + per * 6, 10, { soak: true }); A.hit(2, t0 + per * 8, 16, { soak: true, big: true });
      chime(A, t0 + per * 5, '水上漂', 'More water, more skips'); A.cap(0.3, 3.6, '打水漂每落在她的水上就多跳一次，最多 8 次（湿路也算）', 'Each time it lands on her own water it skips once more, up to 8 (the wet path counts)'); } };
}
// C5 Rain under the dome: a Geyser inside her Tidal Dome hits the roof and rains down on every foe inside: 16 each
{ const me = [-0.9, 0.3], c = [0.1, 0.1], ds = [[0.4, -0.2], [1.1, 0.7, { soaked: true }], [-0.4, 1.1], [1.3, -0.8]]; const tu = 1.2, tg = 2.0, te = tg + 0.6;
  DEFS.C5 = { T: 4.8, cam: { x: 0.0, z: 0.1, w: 6.6, y: 0.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'whip', { to: 0.4 }], [0.6, 'castBloom', { from: 0.3 }], [tg - 0.25, 'castPlant', { from: 0.2 }]],
    body: (t) => mixA(coil(t, 0.3, 0.75, 0.8), lookUp(t, te, te + 1.2, 35)),
    fx(A) { FX.dome(A, { t0: tu, t1: 4.7, at: [c[0], 0, c[1]], r: 2.0, flat: 0.75, op: 0.42, grow: 0.5, hits: [te + 0.15] });
      ds.forEach((d, i) => { A.soak(i, tu + 0.3, 4, { quiet: i > 0 }); A.status(i, tu + 0.3, 'slow', 3); });
      FX.column(A, { t: te, at: [c[0] + 0.3, 0, c[1]], h: 1.5, r: 0.35, dur: 0.5, rise: 0.15 }); FX.ring(A, { t: te + 0.15, at: [c[0], 1.48, c[1]], r0: 0.2, r1: 1.6, dur: 0.5, col: C.foam, op: 0.8, w: 0.08 });
      FX.rain(A, { t0: te + 0.2, t1: te + 1.5, at: [c[0], 0, c[1]], r: 1.8, h: 1.45, n: 46, wet: false });
      ds.forEach((d, i) => A.hit(i, te + 0.55 + i * 0.05, 16, { wet: !!d[2] })); chime(A, te + 0.2, '穹顶雨', 'Rain under the dome');
      A.cap(0.3, tg, '水穹', 'Tidal Dome'); A.cap(tg, 4.8, '穹里放间歇泉：撞到穹顶变成雨，淋穹里每个敌人 16', 'A Geyser inside hits the roof and rains on every foe inside: 16 each'); } };
}
// C6 The wave takes the fall: Crashing Wave through her Sky Fall drags the falling water along with it, then the fall drops: the wave is 4 u wide and hits with the fall's 16 too
{ const me = [-2.4, 0.2], w = [-1.3, 0.2], ds = [[0.1, -1.3], [0.4, 0.2, { soaked: true }], [0.2, 1.5]]; const tw = 2.0 + 0.46;
  DEFS.C6 = { T: 4.2, cam: { x: -0.4, z: 0.1, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom', { speed: 0.9 }], [2.0, 'castSweep']], body: (t) => mixA(lookUp(t, 0.6, 1.4, 15), tailSlap(t, tw, 0.8), shake(t, 3.5, 0.6, 0.6)),
    fx(A) { FX.waterfall(A, { t0: 0.7, t1: tw + 0.75, cut: tw + 0.4, at: (t) => [w[0] + 2.6 * EASE.lin(clamp((t - tw) / 0.5)), 0, w[1]], follow: true, round: true, w: 1.6, top: 2.6, op: 0.75, rise: 0.45 });
      FX.wave(A, { t: tw - 0.02, from: [w[0] - 0.1, 0, w[1]], dir: 90, dist: 2.6, dur: 0.5, w: 4.0, h: 1.2, len: 1.1 });
      ds.forEach((d, i) => A.hit(i, tw + 0.3, d[2] ? 58 : 36, { crash: true, knock: [1.4, 0], kdur: 0.4 })); A.say(tw + 0.32, { zh: '20 + 16', en: '20 + 16' }, { col: C.sky }); chime(A, tw + 0.05, '浪卷天落', 'The wave takes the fall'); A.shake(tw + 0.3, 0.06, 0.2);
      A.cap(0.3, 2.0, '她的天落在落', 'Her Sky Fall pours'); A.cap(2.0, 4.2, '怒涛冲过天落，把瀑布一起拖走：浪宽 4 u，多算天落的 16', "Crashing Wave drags the Sky Fall along: 4 u wide, and its 16 too"); } };
}
// C7 Dash cast: Spray pressed during the tide ride is kept, and comes off the crest as she lands with no wind-up
{ const me = [-2.6, 0.2]; const t0 = 0.4, L = 2.8, tl = t0 + 0.8;
  const k = (t) => { const a = t - t0; const ss = (x0, x1, x) => { x = clamp((x - x0) / (x1 - x0)); return x * x * (3 - 2 * x); }; return ss(0.10, 0.22, a) * (1 - ss(0.62, 0.80, a)); };
  const ds = fan(3, 2.0, 45, -45, me[0] + L, me[1]); ds[1].push({ soaked: true });
  DEFS.C7 = { noWarp: true, T: 3.4, cam: { x: 0.1, z: 0.1, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'dash', { to: 0.78 }], [tl - 0.02, 'nozzle', { from: 0.25 }]],
    root: (() => { const R = [{ t: t0 }]; for (let i = 1; i <= 14; i++) { const a = 0.06 + i * 0.05, t = t0 + a; R.push({ t, fw: L * EASE.s(clamp((a - 0.08) / 0.74)), y: 0.68 * k(t), e: 'lin' }); } return R; })(),
    body: (t) => shake(t, 2.4, 0.6, 0.6),
    fx(A) { const ride = (t) => { const r = A.rootAt(t); return [r.x + Math.sin(r.yaw) * 0.25, 0, r.z + Math.cos(r.yaw) * 0.25]; };
      FX.wave(A, { t: t0 + 0.08, at: ride, yaw: () => 90 * D2R, dur: 0.72, out: 0.15, w: 1.0, h: 0.9, len: 1.1, rise: 0.14, hFn: (u) => Math.max(0.05, k(t0 + 0.08 + u * 0.72) * 1.05 + 0.05), wet: false });
      FX.strip(A, { t0: t0 + 0.15, t1: 3.4, from: [me[0], 0, me[1]], to: [me[0] + L, 0, me[1]], grow: 0.65, w: 1.0, op: 0.35, flow: 0.2 });
      A.say(t0 + 0.35, { zh: '按 泼水', en: 'Spray pressed' }, { col: C.parch }); const tf = tl + 0.05;
      FX.fan(A, { t: tf, at: 'him', yaw: (t) => 90, arc: 100, r: 3, dur: 0.3, rainbow: true });
      A.hit(0, tf + 0.15, 10, { soak: true }); A.hit(1, tf + 0.18, 10, { wet: true }); A.soak(1, tf + 0.2, 4, { drench: true }); A.hit(2, tf + 0.21, 10, { soak: true }); chime(A, tf, '乘浪施放', 'Dash cast');
      A.cap(0.1, 3.4, '冲刺时按下的技能留到落地，从浪顶无前摇放出', 'A skill pressed during the ride comes off the crest as she lands, with no wind-up'); } };
}
// C8 Whip the bubble: Water Whip on a sealed foe throws it twice as far, and the bubble pops where it lands
{ const me = [-2.0, 0.4], d0 = [-0.6, 0.0], to = [2.4, -0.3], ds = [[d0[0], d0[1], { soaked: true }], around(to, 50, 0.8), around(to, 200, 0.8)]; const tc = 0.3 + 0.6, ts = tc + 0.5, tw = 1.9 + 0.48, tl = tw + 0.7;
  DEFS.C8 = { T: tl + 1.2, cam: { x: 0.1, z: 0.1, w: 6.8, y: 0.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom'], [1.9, 'whip']],
    root: [{ t: 0.3, look: d0 }, { t: tw, look: d0 }, { t: tw + 0.45, look: to, e: 'io2' }], body: (t) => mixA(pawUp(t, 0.4, 1.0, 0.6), tailSlap(t, tw + 0.5, 0.7), shake(t, tl + 0.6, 0.6, 0.6)),
    fx(A) { const path = (t) => { const u = EASE.io2(clamp((t - tw - 0.1) / 0.6)); return [lerp(d0[0], to[0], u), lerp(d0[1], to[1], u)]; };
      A.hold(0, ts, tl, 0.7, { at: (t) => t < tw + 0.1 ? d0 : path(t), spin: 0 });
      FX.bubble(A, { t0: tc, t1: tl, at: (t) => t < ts ? (() => { const s = A.at('tip', tc), u = EASE.s(clamp((t - tc) / 0.5)); const q = A.dpt(0, ts, 0.6); return [lerp(s.x, q.x, u), lerp(s.y, q.y, u), lerp(s.z, q.z, u)]; })() : A.dpt(0, t, 0.6).toArray(), r: (t) => t < ts ? 0.25 : 0.65 });
      FX.rope(A, { t0: tw - 0.05, t1: tw + 0.45, from: 'tip', to: (t) => A.dpt(0, t, 0.6), w: 0.09, head: 0.1, sag: 0.05 }); FX.pointer(A, { t0: 0, t1: tl, at: [to[0], 0, to[1]] });
      A.hit(0, tl, 19, { crash: true }); [1, 2].forEach((i) => A.hit(i, tl + 0.04, 12, { soak: true })); A.say(tw + 0.5, { zh: '×2 远', en: '×2 far' }, { col: C.sky }); chime(A, tw + 0.1, '鞭打水牢', 'Whip the bubble');
      A.cap(0.3, 1.9, '水牢封住一个敌人', 'Water Prison seals a foe'); A.cap(1.9, tl + 1.2, '水鞭把它甩两倍远，泡泡落地就爆', 'Water Whip throws it twice as far, and the bubble pops where it lands'); } };
}
// C9 Bolt down the wet path: she dashes and leaves her wet path; a Riverbolt fired along it rides it to its end, through every foe on it
{ const me = [-2.6, 0.1], L = 2.8, ds = [[-1.6, 0.35], [-0.6, -0.25, { soaked: true }], [0.6, 1.2]]; const t0 = 0.4, td = t0 + 0.85, tb = td + 0.55 + 0.44 / 1.3, dur = 0.7;
  const k = (t) => { const a = t - t0; const ss = (x0, x1, x) => { x = clamp((x - x0) / (x1 - x0)); return x * x * (3 - 2 * x); }; return ss(0.10, 0.22, a) * (1 - ss(0.62, 0.80, a)); };
  DEFS.C9 = { T: 4.2, cam: { x: -0.9, z: 0.3, w: 6.6 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'dash'], [td + 0.4, 'castPoint', { speed: 1.3 }]],
    root: (() => { const R = [{ t: t0 }]; for (let i = 1; i <= 16; i++) { const a = 0.06 + i * 0.05, t = t0 + a; R.push({ t, fw: L * EASE.s(clamp((a - 0.08) / 0.74)), y: 0.68 * k(t), e: 'lin' }); } R.push({ t: td + 0.4, spin: 180, e: 'io2' }); return R; })(),
    body: (t) => mixA(turnTrunk(t, td + 0.4, td + 0.9, -15)),
    fx(A) { FX.strip(A, { t0: t0 + 0.15, t1: 4.1, from: [me[0], 0, me[1]], to: [me[0] + L, 0, me[1]], grow: 0.65, w: 1.0, op: 0.4, flow: 0.2 });
      FX.bolt(A, { t: tb, path: (u) => new A.THREE.Vector3(lerp(me[0] + L - 0.3, me[0], u), 0.35, me[1] + 0.12 * Math.sin(u * 12)), dur, r: 0.13 });
      [0, 1].forEach((i) => { const u = (me[0] + L - 0.3 - ds[i][0]) / (L - 0.3); A.hit(i, tb + u * dur, 14, { wet: !!ds[i][2], soak: true, noStop: true }); });
      chime(A, tb + 0.1, '顺流弹', 'Bolt down the wet path'); A.cap(0.3, td, '冲刺留下湿路', 'The dash leaves her wet path'); A.cap(td, 4.2, '河流弹顺着湿路跑到尽头，穿过路上所有敌人', 'A Riverbolt fired along it rides it to its end, through every foe on it'); } };
}
// C10 Sink the charge: a Depth Charge that hits foes standing in her water bursts from below: they are launched 0.8 s
{ const me = [-2.4, 0.2], tg = [1.0, 0.0], ds = [[0.8, -0.35, { soaked: true }], [1.3, 0.35], [0.6, 0.45]]; const th = 1.4, tl = th + 0.68, td = tl + 0.75;
  DEFS.C10 = { T: 4.6, cam: { x: -0.3, z: 0.0, w: 6.6, y: 0.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.25, 'castBloom', { to: 0.62 }], [0.62, 'bloomHold', { loop: true, until: th }], [th, 'tsunami', { from: 0.2 }]],
    body: (t) => mixA(tailSlap(t, tl, 0.9), lookUp(t, td, td + 0.8, 25), shake(t, td + 0.9, 0.6, 0.6)),
    fx(A) { FX.puddle(A, { t0: 0, t1: td + 0.2, at: [tg[0], 0, tg[1]], r: 1.1, op: 0.5 }); FX.orb(A, { t0: 0.4, t1: tl - 0.2, at: 'tip', r: (t) => 0.06 + 0.32 * clamp((t - 0.4) / 1.2), pop: false });
      FX.bolt(A, { t: tl - 0.2, from: 'tip', to: [tg[0], 0.0, tg[1]], dur: 0.95, arc: 2.2, r: 0.38, e: 'lin', splash: false });
      for (const d of ds) FX.column(A, { t: td + 0.08, at: [d[0], 0, d[1]], h: 1.6, r: 0.3, dur: 0.6, fall: true }); FX.ringwave(A, { t: td, at: [tg[0], 0, tg[1]], r0: 0.3, r1: 1.4, h: 0.4 });
      A.hit(0, td + 0.1, 58, { crash: true, up: 1.76 }); A.hit(1, td + 0.1, 36, { up: 1.76 }); A.hit(2, td + 0.1, 36, { up: 1.76 }); A.shake(td, 0.07, 0.25);
      chime(A, td + 0.1, '沉底', 'Sink the charge'); A.cap(0.25, 4.6, '深水弹打到站在她水里的敌人：从下面爆开，挑飞 0.8 秒', 'A Depth Charge on foes standing in her water bursts from below: launched 0.8 s'); } };
}
// C11 Blessed bubble: on a friend with both River's Gift and Bubble Ward: when the bubble pops, the gift's 5 s start again
{ const me = [-2.4, 0.5], al = [-0.6, 0.0], ds = [[al[0], al[1], { ally: true, face: 0 }], [0.3, -0.1], [0.65, 0.6]]; const tg = 0.3 + 0.44, tw = 1.4 + 0.38, tp = 3.4;
  DEFS.C11 = { T: 6.0, cam: { x: -0.6, z: 0.2, w: 6.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPoint'], [1.4, 'castBloom', { speed: 1.2 }]], root: [{ t: 0.3, look: al }], body: (t) => pawUp(t, 1.5, 2.0, 0.7),
    fx(A) { FX.rope(A, { t0: tg - 0.05, t1: tg + 0.45, from: 'tip', to: (t) => A.dpt(0, t, 0.65), w: 0.07 }); FX.ring(A, { t: tg + 0.2, at: { d: 0, y: 0.7 }, r0: 0.3, r1: 0.42, dur: 5.1, dir: [0, 1, 0], col: C.cobalt, op: 0.6, w: 0.3 });
      shieldOn(A, 0, tw + 0.3, tp, (t) => t < 2.6 ? 14 : t < 3.1 ? 6 : 0, { hits: [2.6, 3.1] }); [2.6, 3.1].forEach((h) => foeBolt(A, { t: h - 0.35, d: 1, dur: 0.35, to: (t) => A.dpt(0, h, 0.7) }));
      A.hud(gaugeHud('河赐 5 秒', "River's Gift 5 s", (t) => t < tg + 0.2 ? null : t < tp ? 1 - (t - tg - 0.2) / 5 : t < 6 ? 1 - (t - tp) / 5 : null, { col: C.cobalt }));
      [1.6, 2.3, 4.0, 4.8, 5.5].forEach((t, k) => { A.turn(0, t - 0.15, k % 2 ? 40 : -40, 0.15); A.hit(1 + (k % 2), t, 8, { soak: true }); FX.splash(A, { t, at: { d: 1 + (k % 2), y: 0 }, r: 0.4, h: 0.4 }); });
      chime(A, tp + 0.05, '河赐护泡', 'Blessed bubble'); A.say(tp + 0.2, { zh: '重新 5 秒', en: '5 s again' }, { col: C.sky });
      A.cap(0.3, tp, '同一个队友身上有河赐和泡泡护盾', "A friend with both River's Gift and Bubble Ward"); A.cap(tp, 6.0, '泡泡破了，河赐重新计 5 秒', "When the bubble pops, the gift's 5 s start again"); } };
}
// C12 Rain on the garden: her rain, pools, currents and waves water Mosslight's seeds and plants, by Mosslight's own watering rule
{ const me = [-2.4, 0.4], c = [0.5, 0.0], mo = [-1.4, -0.9], seeds = [[0.0, -0.4], [0.9, 0.4], [0.4, 0.9], [1.1, -0.6]];
  DEFS.C12 = { T: 4.6, cam: { x: -0.4, z: 0.0, w: 6.4, y: 0.7 }, her: H(me[0], me[1]), dum: [[mo[0], mo[1], { ally: true, face: 0 }]], seq: [[0.3, 'castBloom']], body: (t) => mixA(lookUp(t, 0.5, 1.4, 25)),
    fx(A) { const T = A.THREE; FX.rain(A, { t0: 0.85, t1: 4.4, at: [c[0], 0, c[1]], r: 1.4, h: 2.2, n: 40 }); A.tag(0, 0, 4.6, ['苔光', 'Mosslight'], C.parch);
      seeds.forEach((s, k) => { const g = A.add(new T.Group()); const stem = new T.Mesh(new T.CylinderGeometry(0.02, 0.03, 0.3, 6), new T.MeshLambertMaterial({ color: '#5E8A4A' })); stem.position.y = 0.15; g.add(stem);
        const lf = new T.Mesh(new T.SphereGeometry(0.09, 10, 8), new T.MeshLambertMaterial({ color: '#86B86A' })); lf.scale.set(1.4, 0.5, 0.8); lf.position.set(0.06, 0.28, 0); g.add(lf); const lf2 = lf.clone(); lf2.position.x = -0.06; g.add(lf2);
        const seed = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), new T.MeshLambertMaterial({ color: '#8A6A44' })); g.add(seed); g.position.set(s[0], 0, s[1]); const tw = 1.4 + k * 0.35;
        A.fx((t) => { const u = EASE.back(clamp((t - tw) / 0.4)); stem.scale.set(1, Math.max(0.01, u), 1); lf.visible = lf2.visible = u > 0.3; lf.scale.set(1.4 * u, 0.5 * u, 0.8 * u); lf2.scale.copy(lf.scale); seed.position.y = 0.04; });
        FX.spark(A, { t: tw, at: [s[0], 0.25, s[1]], r: 0.35, col: '#B9E39A', op: 0.5 }); A.say(tw, { zh: '浇水', en: 'Watered' }, { col: '#B9E39A' }); });
      chime(A, 1.4, '雨润', 'Rain on the garden'); A.cap(0.3, 4.6, '她的雨、漩涡、水流和浪按苔光的浇水规则浇灌种子和植物', "Her rain, pools, currents and waves water Mosslight's seeds and plants, by Mosslight's own rule"); } };
}
