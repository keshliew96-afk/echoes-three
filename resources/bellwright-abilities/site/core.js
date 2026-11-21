// The passive (Sympathy; Third stroke and Chord), the basic attack and the dash, in Base and the three styles.
import { DEFS, FORMS, H, FX, C, hang, tollFx, beatFx, noteBolt, shotBell, drumBell, inRing, inFan, ward, pipsHud, beatsOf, rock, baton, beat, listen, flare, antFlick, antUp, antQuiver, antDroop, nod, lookUp, mixA, crouch, foeBolt, friendsIn, KB } from './defs.js';

// P: Sympathy. Her bells toll on the beat; a toll leaves a foe Ringing 3 s; a Note deals 50% more to a Ringing foe; a Note through a bell's ring makes it answer
function sympathy(style) {
  const me = [-2.2, 0], b = [-0.1, -0.5], d0 = [0.3, -0.75], d1 = [0.5, 0.95], B = beatsOf(1.0, 6.0);
  return { T: 6.6, cam: { x: -0.4, z: 0.1, w: 6.4 }, her: H(me[0], me[1]), dum: [d0, d1].concat(style === 'ha' ? [[-1.2, -1.1, { ally: true }]] : []),
    seq: [[0.25, 'castPlant'], [2.2, 'castPoint'], [3.7, 'castPoint']],
    root: [{ t: 0.2, look: b }, { t: 2.0, look: b }, { t: 2.2, look: d1 }, { t: 3.4, look: d1 }, { t: 3.6, look: d0 }],
    body: (t) => mixA(antFlick(t, B), listen(t, 4.6, 6.4)),
    fx(A) {
      const bell = hang(A, { at: b, t0: 0.67, t1: 6.6, beats: B, style, foes: [0] });
      beatFx(A, B);
      if (style === 'ar') { hang(A, { kind: 'chime', at: [0.9, -1.6], t0: 0.2, t1: 6.6, beats: B, foes: [], quiet: true, noLand: true }); FX.chord(A, { a: [b[0], 0, b[1]], b: [0.9, 0, -1.6], t0: 0.7, t1: 6.6, beats: B }); }
      // a Note on a quiet foe, then one on a Ringing foe through the bell's ring: it answers
      const t1 = 2.2 + 0.36; noteBolt(A, { t: t1, to: (t) => A.dpt(1, t, 0.6), dur: 0.22 }); A.hit(1, t1 + 0.22, 12, { note: true });
      const t2 = 3.7 + 0.36; noteBolt(A, { t: t2, to: (t) => A.dpt(0, t, 0.6), dur: 0.26 }); A.hit(0, t2 + 0.26, 12, { note: true });
      tollFx(A, t2 + 0.14, b, 1.3, { col: C.verd }); A.hit(0, t2 + 0.2, 7, { ans: true, ring: true });
      if (style === 're') { noteBolt(A, { t: t2 + 0.6, from: (t) => A.dpt(0, t2 + 0.6, 0.6), to: (t) => A.at('tip', t), dur: 0.26, col: C.verd }); }
      A.cap(0.2, 2.1, '拍：她的钟每秒齐鸣一次', 'The beat: her bells toll once a second');
      A.cap(1.0, 2.1, '钟鸣：圈里的敌人鸣震 3 秒', 'A toll: foes in its ring are Ringing 3 s');
      A.cap(2.2, 3.6, '音：打没鸣震的，12', 'A Note on a quiet foe: 12');
      A.cap(3.7, 6.6, '音：对鸣震的 +50%；穿过钟圈，钟应声', 'A Note on a Ringing foe: 50% more; through a ring, the bell answers');
      if (style === 'ar') A.cap(4.6, 6.6, '洪钟：最老的钟变大；弦连着别的钟，每拍 4', 'Bourdon: her oldest bell grows; chords toll 4 a beat');
      if (style === 're') A.cap(4.6, 6.6, '二响：每两个技能听两次，音会原路回来', 'Twice Heard: every second skill is heard twice; a Note comes back');
      if (style === 'ha') A.cap(4.6, 6.6, '合调：队友快 15%；走调：敌人伤害 -15%，受伤 +10%', 'In Tune: friends 15% faster. Off-key: foes deal 15% less, take 10% more');
    } };
}
DEFS.P = sympathy('');
// Bell Array's Bourdon: the oldest bell grows into it and a chord ties it to a chime
FORMS.ar.P = (() => { const d = sympathy('ar'); const f0 = d.fx; d.fx = (A) => { f0(A); }; return d; })();
FORMS.re.P = sympathy('re');
FORMS.ha.P = sympathy('ha');
// The Bourdon grows: patch the Array form so its bell is the Bourdon
FORMS.ar.P = (() => { const me = [-2.2, 0], b = [-0.1, -0.5], d0 = [0.3, -0.75], d1 = [0.5, 0.95], B = beatsOf(1.0, 6.0); const s = sympathy('ar'); const base = s.fx;
  s.fx = (A) => { // the Bourdon in place of the plain bell, a chime and a chord
    hang(A, { kind: 'bourdon', at: b, t0: 0.67, t1: 6.6, beats: B, foes: [0] }); beatFx(A, B);
    hang(A, { kind: 'chime', at: [1.2, -1.7], t0: 0.2, t1: 6.6, beats: B, quiet: true, noLand: true }); FX.chord(A, { a: [b[0], 0, b[1]], b: [1.2, 0, -1.7], t0: 0.7, t1: 6.6, beats: B });
    const t1 = 2.2 + 0.36; noteBolt(A, { t: t1, to: (t) => A.dpt(1, t, 0.6), dur: 0.22 }); A.hit(1, t1 + 0.22, 12, { note: true });
    const t2 = 3.7 + 0.36; noteBolt(A, { t: t2, to: (t) => A.dpt(0, t, 0.6), dur: 0.26 }); A.hit(0, t2 + 0.26, 12, { note: true });
    tollFx(A, t2 + 0.14, b, 2.0, { col: C.verd, double: true }); A.hit(0, t2 + 0.2, 14, { ans: true, ring: true });
    A.cap(0.2, 2.1, '洪钟：她最老的钟长成洪钟（2 u，14）', 'Bourdon: her oldest bell is the Bourdon (2 u, 14)');
    A.cap(2.2, 3.6, '弦：连着 4 u 内的钟和铃，每拍 4，鸣震', 'Chords: to every bell within 4 u: 4 a beat, Ringing');
    A.cap(3.7, 6.6, '音穿过洪钟的圈：洪钟应声', 'A Note through its ring: the Bourdon answers');
  }; return s; })();

// P2: Third stroke and Chord. Each cast lights a pip; the third is heard twice (0.6 s later, half) and readies a Chord on her next attack
function third(style) {
  const me = [-2.2, 0], d0 = [0.2, -0.4], d1 = [0.5, 0.55], fr = style === 'ha' ? [[-2.0, 1.4, { ally: true }], [-2.6, -1.4, { ally: true }]] : [];
  const c1 = 0.3, c2 = 1.5, c3 = 2.7, ta = 4.3, npip = style === 're' ? 2 : 3;
  const seq = [[c1, 'castPoint'], [c2, 'castPoint'], [c3, 'castSweep'], [ta, 'combo3']]; if (style === 're') seq.splice(2, 1, [c2 + 1.2, 'castSweep']);
  return { T: 6.4, cam: { x: -0.7, z: 0.05, w: 6.4 }, her: H(me[0], me[1]), dum: [d0, d1].concat(fr),
    seq, root: [{ t: 0.2, look: d1 }, { t: 1.4, look: d0 }, { t: 2.6, look: [0.3, 0.1] }],
    body: (t) => mixA(antUp(t, ta - 0.2, ta + 1.0)),
    fx(A) {
      const cast = [c1 + 0.36, c2 + 0.36, (style === 're' ? c2 + 1.2 : c3) + 0.44];
      noteBolt(A, { t: cast[0], to: (t) => A.dpt(1, t, 0.6) }); A.hit(1, cast[0] + 0.22, 12, { note: true });
      noteBolt(A, { t: cast[1], to: (t) => A.dpt(0, t, 0.6) }); A.hit(0, cast[1] + 0.22, 12, { note: true });
      const sw = cast[2]; const show3 = style !== 're';
      // Bell Swing: a bell swung across her front (the third cast); heard again 0.6 s later for half
      const third = style === 're' ? sw : sw;
      FX.bell(A, { t0: sw - 0.3, t1: sw + 0.5, h: 0.5, at: (t) => { const r = A.rootAt(t); const u = Math.max(0, Math.min(1, (t - sw + 0.1) / 0.3)); const a = Math.PI * u; return [r.x + Math.sin(r.yaw) * (0.55 + 0.3 * Math.sin(a)) + Math.cos(r.yaw) * (0.5 - 0.5 * (1 - Math.cos(a))), 0.4, r.z + Math.cos(r.yaw) * (0.55 + 0.3 * Math.sin(a)) - Math.sin(r.yaw) * (0.5 - 0.5 * (1 - Math.cos(a)))]; }, strikes: [sw] });
      FX.arcs(A, { t: sw, at: 'him', yaw: 90, arc: 120, r: 1.9, dur: 0.4, op: 0.6 });
      FX.arcs(A, { t: sw + 0.6, at: 'him', yaw: 90, arc: 120, r: 1.9, dur: 0.4, op: 0.45, col: C.verd });
      FX.note(A, { t: sw + 0.6, at: 'bellc', r1: 0.4, col: C.verd });
      A.hit(0, sw + 0.1, 18, { strike: true }); A.hit(0, sw + 0.7, 9, { echo: true });
      const lit = (t) => t < cast[0] ? 0 : t < cast[1] ? 1 : t < sw ? 2 : t < ta + 0.1 ? npip : 0;
      const chord = (t) => t >= sw && t < ta + 0.1 ? 'forte' : null;
      pipsHud(A, (t) => style === 're' ? Math.min(2, lit(t)) : lit(t), { max: npip, chord });
      // the Chord: her next attack is the great stroke at once. Forte (a Bell skill made it): double
      const k = style === 'ha' ? 1.4 : 1; drumBell(A, { t0: ta, waves: [ta + 0.2, ta + 0.3, ta + 0.4], big: ta + 0.52, wn: Math.round(6 * k), bn: Math.round(16 * k), bigHit: { big: true } });
      if (style === 'ar') { hang(A, { at: [0.9, -1.1], t0: 0.0, t1: 6.4, quiet: true, noLand: true, strikes: [ta + 0.52] }); FX.arcs(A, { t: ta + 0.55, at: [0.9, 0.03, -1.1], r: 1.4, arc: 360, op: 0.6 }); A.hit(0, ta + 0.6, 8, { note: true, small: true }); }
      if (style === 'ha') { for (const i of [2, 3]) { A.tune(i, ta + 0.52, 3); A.tag(i, ta + 0.6, 6.2, ['强音：下一击 +30%', 'Forte: next hit 30% more'], C.brass); FX.arcs(A, { t: ta + 0.52, at: (t) => A.dpt(i, t, 0), r: 0.9, arc: 360, op: 0.5 }); } }
      A.cap(0.2, 2.6, '每次放技能点亮一颗：三响', 'Each skill lights a pip: three strokes');
      if (style === 're') A.cap(0.2, 2.6, '二响：两颗就满', 'Twice Heard: two pips, not three');
      A.cap(2.6, 4.2, '第三个技能听两次：0.6 秒后再来一半', 'The third skill is heard twice: again 0.6 s later, for half');
      A.cap(4.2, 6.4, '和弦：下一击直接是大钟一击。钟技能：强音，翻倍', 'Chord: her next attack is the great stroke at once. A Bell skill: Forte, double');
      if (style === 'ar') A.cap(5.2, 6.4, '钟阵：挂着的钟也奏和弦，一半', 'Bell Array: her hung bells play the Chord too, half');
      if (style === 'ha') A.cap(5.2, 6.4, '和鸣：5 u 内每个队友 +20%，各得礼物', 'Harmony: 20% more per friend within 5 u, and each gets a gift');
    } };
}
DEFS.P2 = third(''); FORMS.ar.P2 = third('ar'); FORMS.re.P2 = third('re'); FORMS.ha.P2 = third('ha');

// B: the basic attack, as passed: two bell shots (Strike 8 within 1 u), then the great bell drummed (three waves of 3, a great stroke of 8, Notes in an 80° fan, 3 u);
// new (pick 2): the great bell stands up and hangs 5 s
function basic(style) {
  const me = [-2.2, 0], d0 = [0.5, 0.35], d1 = [0.7, -0.7], d2 = [-0.75, -0.55], t0 = 0.3, fr = style === 'ha' ? [[-2.3, 1.2, { ally: true }], [-3.1, -0.6, { ally: true }]] : [];
  return { T: 6.8, cam: { x: -0.7, z: 0, w: 6.6 }, her: H(me[0], me[1]), dum: [d0, d1, d2].concat(fr),
    seq: [[t0, 'combo']], root: [{ t: 0.2, look: [0.6, -0.1] }],
    body: (t) => mixA(listen(t, 2.6, 4.0)),
    fx(A) {
      if (style === 're') { // the shots fly on through every foe as Notes, 6 u: 6
        for (const [tt, tgt] of [[t0 + 0.22, [0, 2]], [t0 + 0.56, [1]]]) { const end = tt === t0 + 0.22 ? [3.6, 0.6] : [3.7, -1.2]; noteBolt(A, { t: tt, to: [end[0], 0.45, end[1]], dur: 0.55, r: 0.06 });
          FX.bell(A, { t0: tt - 0.05, t1: tt + 0.55, h: 0.14, fade: true, at: (t) => { const p = A.at('tip', tt), u = Math.min(1, (t - tt) / 0.55); return [p.x + (end[0] - p.x) * u, 0.45, p.z + (end[1] - p.z) * u]; }, rot: () => [-60, 0, 0] });
          for (const i of tgt) { const p = A.dpos(i, tt); const u = Math.hypot(p.x - me[0], p.z - me[1]) / 5.9; A.hit(i, tt + 0.55 * u, 6, { note: true }); } }
      } else { shotBell(A, { t: t0 + 0.22, to: d0, keep: style === 'ar' }); shotBell(A, { t: t0 + 0.56, to: [d1[0] - 0.1, d1[1]], keep: style === 'ar' }); }
      const B = beatsOf(2.6, 6.6);
      drumBell(A, { t0: t0 + 0.7, waves: [t0 + 0.9, t0 + 1.0, t0 + 1.1], big: t0 + 1.22, arc: style === 'ha' ? 360 : 80, stand: true, beats: B, hangFor: 4.8 });
      if (style === 'ha') for (const i of [3, 4]) A.tune(i, t0 + 1.0, 4);
      A.cap(0.2, 1.2, '第 1、2 击：小钟飞出、变大落下，撞 8（1 u）', 'Hits 1, 2: a small bell flies, grows and falls: Strike 8, 1 u');
      if (style === 're') A.cap(0.2, 1.2, '回音：小钟不落下，作为音一路穿过，6 u：6', 'Reverb: the shots fly on through every foe as Notes, 6 u: 6');
      A.cap(1.2, 2.4, '第 3 击：敲侧放的大钟，三波 3，最后一下 8（80°，3 u）', 'Hit 3: three waves of 3 and a great stroke of 8 (80°, 3 u)');
      if (style === 'ha') A.cap(1.2, 2.4, '和鸣：鼓声向四周散开，3 u，队友合调', 'Harmony: the waves go out all round her, 3 u; friends are tuned');
      A.cap(2.4, 6.8, '大钟立起，挂 5 秒：每拍 7（1.3 u）', 'The great bell stands up and hangs 5 s: 7 a beat (1.3 u)');
      if (style === 'ar') A.cap(2.4, 6.8, '钟阵：落下的小钟留 3 秒当铃', 'Bell Array: each fallen shot bell stays 3 s as a chime');
    } };
}
DEFS.B = basic(''); FORMS.ar.B = basic('ar'); FORMS.re.B = basic('re'); FORMS.ha.B = basic('ha');
// Bell Array chimes toll too: add their beats
{ const d = FORMS.ar.B, f0 = d.fx; d.fx = (A) => { f0(A); for (const [p, ts] of [[[0.5, 0.35], 1.07], [[0.6, -0.7], 1.41]]) for (const b of [2.6, 3.6]) if (b < ts + 3) { tollFx(A, b, p, 1.0, { top: 0.35 }); for (const i of inRing(A, p, 1.0, b)) A.hit(i, b, 5, { ring: true, noStop: true, small: true }); } }; }

// D: the dash, as passed: a great bell drops over her (0.36 s); under it nothing hits her and she walks where steered, 1.5 times as fast, up to 2.5 s; an attack lifts it
function dash(style) {
  const me = [-2.6, -0.2], d0 = [0.9, 0.9], d1 = [1.3, -0.9], fr = style === 'ha' ? [[-1.2, 1.4, { ally: true }], [-0.3, -1.4, { ally: true }]] : [];
  const tc = 0.3, tin = tc + 0.36, tw = tc + 0.62, tl = 3.25, H0 = 1.68;
  return { T: 6.0, cam: { x: -0.6, z: 0, w: 6.8 }, her: H(me[0], me[1]), dum: [d0, d1].concat(fr),
    seq: [[tc, 'dash', { to: 0.62 }], [tw, 'walk', { loop: true, until: tl, speed: 1.5, fade: 0.12 }], [tl, 'combo1']],
    root: [{ t: tw, fw: 0, sd: 0 }, { t: tl, fw: 2.6, sd: -0.5, e: 'lin' }, { t: tl + 0.05, look: [0.9, 0.4] }],
    body: (t) => mixA(lookUp(t, tc, tc + 0.3, 28)),
    fx(A) {
      const at = (t) => { const r = A.rootAt(Math.min(t, tl)); return [r.x, r.z]; };
      const stay = style === 'ar';
      FX.bell(A, { kind: 'great', h: H0, floor: (t) => stay && t > tl ? at(tl) : at(t), t0: tc + 0.08, t1: stay ? 6.0 : tl, drop: 0.28, dropH: 3, op: 0.86, lift: !stay,
        rot: (t) => { const s = Math.sin((t - tw) / 0.32 * Math.PI); return t > tw && t < tl ? [1.7 * Math.cos((t - tw) / 0.32 * Math.PI), 0, 2.9 * s] : [0, 0, 0]; }, strikes: [1.3, 2.0].concat(stay ? beatsOf(4.0, 6.0) : []) });
      const p0 = at(tin); FX.ring(A, { t: tin, at: [p0[0], 0.02, p0[1]], r0: 0.8, r1: 1.7, dur: 0.5, col: C.brass, op: 0.5, w: 0.08 }); FX.dust(A, { t: tin, at: [p0[0], 0.02, p0[1]], n: 14, sp: 1.1, dur: 0.6 }); A.shake(tin, 0.05, 0.2);
      // foes fire at her: their shots ring off the bell
      for (const [i, t] of [[0, 1.0], [1, 1.7]]) { foeBolt(A, { d: i, t, to: (tt) => { const p = at(tt); return new A.THREE.Vector3(p[0], 0.8, p[1]); }, dur: 0.3 }); const p = at(t + 0.3); FX.note(A, { t: t + 0.3, at: [p[0], 1.0, p[1]], r1: 0.5, col: C.brass }); A.say(t + 0.3, ['挡住', 'Blocked'], { col: C.pale }); }
      A.hud((t, x, W, H2, k, lang) => { if (t < tin || t > tl) return; const p = A.at('head', t).clone(); p.y += 1.5; p.project(A.cam); x.font = `700 ${Math.round(13 * k)}px Inter, "PingFang SC", system-ui, sans-serif`; x.textAlign = 'center'; const s = (lang === 'zh' ? '无敌 ' : 'Untouchable ') + Math.max(0, 2.5 - (t - tin)).toFixed(1) + ' s'; x.lineWidth = 3 * k; x.strokeStyle = 'rgba(14,12,8,0.85)'; const cx = (p.x + 1) / 2 * W, cy = (1 - p.y) / 2 * H2; x.strokeText(s, cx, cy); x.fillStyle = C.pale; x.fillText(s, cx, cy); });
      if (!stay) { const p = at(tl); FX.ring(A, { t: tl, at: [p[0], 0.02, p[1]], r0: 0.6, r1: 1.6, dur: 0.5, col: C.verd, op: 0.4, w: 0.08 }); }
      // the attack that lifts it: hit 1's bell shot
      shotBell(A, { t: tl + 0.22, to: [d0[0] - 0.15, d0[1] - 0.1] });
      if (stay) { const p = at(tl); for (const b of beatsOf(4.0, 6.0)) { tollFx(A, b, p, 1.3, { top: H0 }); } }
      if (style === 're') { const p = at(tl); FX.arcs(A, { t: tl, at: [p[0], 0.03, p[1]], r: 2.5, arc: 360, n: 2, gap: 0.08, op: 0.7 }); for (const i of inRing(A, p, 2.5, tl + 0.1)) A.hit(i, tl + 0.1, 10, { note: true }); }
      if (style === 'ha') { const p = at(tl); FX.arcs(A, { t: tl, at: [p[0], 0.03, p[1]], r: 3, arc: 360, op: 0.6, col: C.verd }); for (const i of [2, 3]) { A.tag(i, tl + 0.1, 5.4, ['冲刺回来了', 'Dash back'], C.verd); FX.note(A, { t: tl + 0.1, at: (t) => A.dpt(i, t, 1.2), r1: 0.4, col: C.verd }); } }
      A.cap(0.2, 1.0, '冲刺：大钟罩下来（0.36 秒），第一帧起无敌', 'Dash: a great bell drops over her (0.36 s); untouchable from the first frame');
      A.cap(1.0, tl, '在钟下走，快 1.5 倍，最多 2.5 秒', 'She walks under it, 1.5 times as fast, up to 2.5 s');
      A.cap(tl, 6.0, style === 'ar' ? '钟阵：钟留在原地挂 5 秒' : style === 're' ? '回音：钟升起时一圈音，2.5 u：10' : style === 'ha' ? '和鸣：起拍，3 u 内队友冲刺马上回来' : '攻击、施法或再按冲刺：钟升起', style === 'ar' ? 'Bell Array: the bell stays hung where it lifts, 5 s' : style === 're' ? 'Reverb: it lifts with a ring, 2.5 u: 10, a Note' : style === 'ha' ? 'Harmony: a cue: friends within 3 u have their dash back' : 'An attack, a cast or a second dash lifts it');
    } };
}
DEFS.D = dash(''); FORMS.ar.D = dash('ar'); FORMS.re.D = dash('re'); FORMS.ha.D = dash('ha');
