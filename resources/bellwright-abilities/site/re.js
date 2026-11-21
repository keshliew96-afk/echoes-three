// Reverb 回音 forms: sound that comes back (T2: two pips, every second skill heard twice; a Note's second hearing returns the way it went).
import { DEFS, FORMS, H, FX, C, EASE, clamp, lerp, hang, tollFx, beatFx, noteBolt, inRing, ward, held, knockHud, foeBolt, foeSwing, ticks, beatsOf, KB, D2R,
  rock, rockSlow, baton, beat, listen, flare, clap, nod, crouch, onToes, turnTrunk, lookUp, antFlick, antQuiver, antDroop, antUp, antCurl, knock, toss, pawOut, tapTime, shove, floorCircle, mixA } from './defs.js';
import { lull, friendSwing, soloOn } from './defs.js';
import { ME, ptr, batBell, swingBell, rollBell, soundLine, earBell, headBell } from './base.js';
const F = FORMS.re;
const P = C.pale;
// an echo: a pale ring and a faint note where the sound comes back
const echoAt = (A, t, at, r = 1.0) => { FX.arcs(A, { t, at: [at[0], 0.03, at[1]], r, arc: 360, n: 2, gap: 0.07, op: 0.55, col: P }); FX.note(A, { t, at: [at[0], 0.5, at[1]], r1: 0.32, col: P, op: 0.5 }); };
// a wall segment for bounces
function wall(A, a, b) { const T = A.THREE, L = Math.hypot(b[0] - a[0], b[1] - a[1]); const m = A.add(new T.Mesh(new T.BoxGeometry(L, 0.5, 0.14), new T.MeshStandardMaterial({ color: '#57534C', roughness: 0.95 }))); m.position.set((a[0] + b[0]) / 2, 0.25, (a[1] + b[1]) / 2); m.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); return m; }
const tapAt = (A, t, to) => batBell(A, t, to, { dur: 0.18 });

// F1 Signal bell: a Note that reaches the hung bell is sent on from it at the nearest foe
{ const p = [0.0, 1.0], d0 = [0.8, 0.0], d1 = [1.6, 1.6], tb = 1.8;
  F.F1 = { T: 4.6, cam: { x: -0.3, z: 0.4, w: 6.4 }, her: H(ME[0], ME[1]), dum: [d0, d1], seq: [[0.3, 'castPlant'], [tb - 0.36, 'castPoint', { speed: 1.2 }]], root: [{ t: 0.2, look: p }],
    body: (t) => mixA(listen(t, 2.6, 4.0), antFlick(t, [tb + 0.6])),
    fx(A) { ptr(A, p, 0, 0.9); batBell(A, 0.7, [p[0], 1.2, p[1]], { dur: 0.15 }); hang(A, { at: p, t0: 0.86, t1: 4.6, beats: [2.6, 3.6], drop: true, dropH: 0.9, quiet: true, strikes: [tb + 0.3] });
      noteBolt(A, { t: tb, from: 'tip', to: [p[0], 0.5, p[1]], dur: 0.3 }); FX.note(A, { t: tb + 0.3, at: [p[0], 0.55, p[1]], r1: 0.55, col: P });
      noteBolt(A, { t: tb + 0.32, from: [p[0], 0.5, p[1]], to: (t) => A.dpt(1, t, 0.6), dur: 0.26, col: P }); A.hit(1, tb + 0.58, 12, { note: true, echo: true });
      A.cap(0.2, 4.6, '传音：一记音碰到这口钟，就从钟那里转发给最近的敌人', 'Signal bell: a Note that reaches this bell is sent on from it at the nearest foe'); } };
}
// F2 Three falls: the great bell lands three times, hopping 2 u to the pointer: 14, 10, 7; it hangs where it last lands
{ const s0 = [-0.6, -0.8], p = [2.4, 0.6], L = [0.95, 1.6, 2.2], ds = [[-0.4, -0.3], [0.9, -0.3], [2.3, 0.2], [2.8, 1.1]];
  const at3 = [s0, [lerp(s0[0], p[0], 0.5), lerp(s0[1], p[1], 0.5)], p], B = beatsOf(3.2, 5.2);
  F.F2 = { T: 5.6, cam: { x: 0.2, z: 0, w: 7.6 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: s0 }, { t: 1.4, look: at3[1] }, { t: 2.0, look: p }],
    body: (t) => mixA(baton(t, 0.3, 2.4), beat(t, L[0]), beat(t, L[1]), beat(t, L[2]), nod(t, L[1], 0.6), nod(t, L[2], 0.6)),
    fx(A) { ptr(A, p, 0, L[2]); const h = KB.great.h;
      FX.bell(A, { kind: 'great', h, t0: L[0] - 0.3, t1: 5.6, strikes: L.concat(B), at: (t) => { if (t < L[0]) { const u = clamp((t - L[0] + 0.3) / 0.3); return [s0[0], h / 2 + 3 * (1 - EASE.in2(u)), s0[1]]; }
        for (let k = 0; k < 2; k++) if (t < L[k + 1]) { const u = clamp((t - L[k]) / (L[k + 1] - L[k])), a = at3[k], b = at3[k + 1]; return [lerp(a[0], b[0], u), h / 2 + 0.9 * 4 * u * (1 - u), lerp(a[1], b[1], u)]; } return [p[0], h / 2, p[1]]; } });
      const n = [14, 10, 7]; L.forEach((tl, k) => { const c = at3[k]; FX.arcs(A, { t: tl, at: [c[0], 0.03, c[1]], r: 1.6 - 0.3 * k, arc: 360, n: 2, op: 0.8 - 0.15 * k, col: k ? P : C.brass }); FX.dust(A, { t: tl, at: [c[0], 0.02, c[1]], n: 10 - 2 * k, sp: 1, dur: 0.4 }); A.shake(tl, 0.06 - 0.015 * k, 0.2);
        for (const i of inRing(A, c, 1.5, tl)) A.hit(i, tl + 0.02, n[k], { strike: true, echo: k > 0 }); });
      for (const b of B) tollFx(A, b, p, 1.9, { top: 0.8 });
      A.cap(0.2, 5.6, '三落：落三次，每次朝指针跳 2 u：14、10、7；最后落在哪就挂在哪', 'Three falls: it lands three times, hopping 2 u to the pointer: 14, 10, 7; it hangs where it last lands'); } };
}
// F3 Bat back: no bell: a clang, 3.5 u: 14; shots it meets fly back as Notes: 10
{ const f0 = [1.1, 0.6], f1 = [1.0, -0.9], d0 = [-0.6, 0.3], ts = 1.4;
  F.F3 = { T: 4.0, cam: { x: -0.6, z: 0, w: 6.2 }, her: H(ME[0], ME[1]), dum: [f0, f1, d0], seq: [[0.25, 'idle', { speed: 0.6 }], [ts - 0.44, 'castSweep']], root: [{ t: 0.2, look: [0, 0] }],
    body: (t) => mixA(crouch(t, 0.5, ts - 0.3, 0.5), listen(t, 2.4, 3.6)),
    fx(A) { foeBolt(A, { from: 0, t0: 0.85, t1: ts, to: (t) => A.at('chest', t) }); foeBolt(A, { from: 1, t0: 0.95, t1: ts + 0.04, to: (t) => A.at('chest', t) });
      FX.arcs(A, { t: ts - 0.05, at: (t) => { const r = A.rootAt(ts); return new A.THREE.Vector3(r.x, 0.45, r.z); }, y: 0.45, yaw: 90, arc: 140, r: 3.5, r0: 0.6, n: 3, gap: 0.05, op: 0.9 });
      for (const i of [0, 1]) { const q = A.dpos(i, ts); noteBolt(A, { t: ts + 0.02, from: [ME[0] + 0.5, 0.55, ME[1] + 0.1 * (i ? -1 : 1)], to: (t) => A.dpt(i, t, 0.6), dur: 0.35, col: P }); A.hit(i, ts + 0.37, 10, { note: true, echo: true }); }
      A.hit(2, ts + 0.03, 14, { strike: true, knock: [0.6, 0.2] }); A.hit(0, ts + 0.1, 14, { strike: true, noStop: true }); A.hit(1, ts + 0.1, 14, { strike: true, noStop: true });
      A.cap(0.2, 4.0, '格音：没有钟：一声锵，3.5 u：14；碰到的飞弹变成音打回去：10', 'Bat back: no bell: a clang, 3.5 u: 14; shots it meets fly back as Notes: 10'); } };
}
// F4 Jar of sound: what the foe takes inside is heard again as the jar lifts: 40% of it, to it and foes within 2 u
{ const d0 = [0.6, 0], d1 = [1.4, 0.9], d2 = [1.3, -1.0], tl = 0.95, te = 3.4, ins = [1.5, 2.0, 2.5, 3.0];
  F.F4 = { T: 5.0, cam: { x: -0.2, z: 0, w: 6.6 }, her: H(ME[0], ME[1]), dum: [[d0[0], d0[1], { gone: [[tl, te]] }], d1, d2], seq: [[0.25, 'idle', { speed: 0.6 }], [1.35, 'combo', { speed: 1.0 }]], root: [{ t: 0.2, look: d0 }],
    body: (t) => mixA(baton(t, 0.3, tl + 0.2), beat(t, tl), listen(t, te - 0.2, 4.6)),
    fx(A) { FX.bell(A, { kind: 'great', h: 1.0, floor: d0, t0: tl - 0.3, t1: te, drop: 0.3, dropH: 2.5, lift: true, strikes: ins });
      ins.forEach((t, k) => { FX.note(A, { t, at: [d0[0], 0.9, d0[1]], r1: 0.4 }); A.hit(0, t, 15, { noStop: true, small: true }); });
      A.tag(0, tl + 0.1, te, (t, lang) => (lang === 'zh' ? '瓮里 ' : 'Inside ') + ins.filter((x) => t >= x).length * 15, P);
      FX.arcs(A, { t: te, at: [d0[0], 0.03, d0[1]], r: 2, arc: 360, n: 3, op: 0.8, col: P }); A.shake(te, 0.05, 0.2); for (const i of [0, 1, 2]) A.hit(i, te + 0.05, 24, { echo: true, big: i === 0 });
      A.cap(0.2, te, '瓮声：敌人在瓮里挨的伤害都记着', 'Jar of sound: what the foe takes inside is kept');
      A.cap(te, 5.0, '瓮升起时再响一遍：40%（60 → 24），打它和 2 u 内的敌人', 'As the jar lifts it is heard again: 40% (60 → 24), to it and foes within 2 u'); } };
}
// F5 Rumble: it rolls 9 u; every 1.5 u a ring bursts from it, 2 u: 6, Ringing
{ const from = [-1.6, 0], tp = 1.15, ds = [[-0.4, 0.9], [0.9, -0.8], [2.0, 1.0], [3.4, -0.9], [4.6, 0.6]];
  F.F5 = { T: 5.0, cam: { x: 1.5, z: 0, w: 9.6 }, her: H(-2.6, 0), dum: ds, seq: [[0.25, 'castPlant', { to: 0.62 }], [0.9, 'idle']], root: [{ t: 0.2, look: [4, 0] }],
    body: (t) => mixA(shove(t, tp), listen(t, tp + 0.5, 3.6)),
    fx(A) { const dur = 2.0, pos = rollBell(A, { t0: tp, tset: 0.6, from, dir: [1, 0], dist: 9, dur, e: 'lin' });
      for (let k = 1; k <= 6; k++) { const tb = tp + dur * k / 6, x = from[0] + 1.5 * k; FX.arcs(A, { t: tb, at: [x, 0.03, 0], r: 2, arc: 360, n: 1, op: 0.75 }); for (const i of inRing(A, [x, 0], 1.8, tb)) A.hit(i, tb + 0.02, 6, { ring: true, small: true, noStop: true }); }
      A.cap(0.2, 5.0, '轰隆：滚 9 u；每 1.5 u 炸出一圈，2 u：6，鸣震', 'Rumble: it rolls 9 u; every 1.5 u a ring bursts from it, 2 u: 6, Ringing'); } };
}
// F6 Counterpoint: the bells stay; each sings a line to the pointer: 10; where lines cross, 12 more within 1.5 u
{ const bs = [[-1.0, 1.4], [-0.6, -1.5], [2.6, 1.6]], p = [1.0, 0], ds = [[1.0, 0.2], [0.0, 0.8], [0.3, -0.8], [1.9, 0.9]], ts = 1.2;
  F.F6 = { T: 4.8, cam: { x: 0.4, z: 0, w: 7.2 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'castBloom', { to: 0.62 }], [0.87, 'bloomHold', { loop: true, until: 1.6 }]], root: [{ t: 0.2, look: p }],
    body: (t) => mixA(flare(t, 0.4, 1.8, 0.6), conductOr(t)),
    fx(A) { ptr(A, p, 0, 2.2); for (const b of bs) { hang(A, { at: b, t0: 0, t1: 4.8, noLand: true, quiet: true, strikes: [ts] }); soundLine(A, ts, b, p, { dur: 0.3, w: 0.26, col: P }); }
      for (const i of [1, 2, 3]) A.hit(i, ts + 0.2, 10, { note: true, noStop: true }); A.hit(0, ts + 0.3, 10, { note: true });
      FX.arcs(A, { t: ts + 0.32, at: [p[0], 0.03, p[1]], r: 1.5, arc: 360, n: 3, op: 0.9 }); A.shake(ts + 0.32, 0.05, 0.2); for (const i of inRing(A, p, 1.5, ts + 0.35)) A.hit(i, ts + 0.36, 12, { note: true, big: i === 0 });
      A.cap(0.2, 4.8, '对位：钟不动；每口钟朝指针唱一条线：10；线交叉的地方 1.5 u 内再 12', 'Counterpoint: the bells stay; each sings a line to the pointer: 10; where lines cross, 12 more within 1.5 u'); } };
  function conductOr(t) { return baton(t, 0.9, 1.5); }
}
// F7 Out and in: the rings roll out to 5 u, then back in, dragging small foes 1.5 u to the bell
{ const b = [0.4, 0], ds = [[2.4, 1.6], [3.1, -1.2], [-1.0, -2.6], [0.6, 2.9]], tb = 1.28, tback = tb + 0.6;
  F.F7 = { T: 4.4, cam: { x: 0.4, z: 0, w: 8.4 }, her: H(-2.6, 0), dum: ds, seq: [[0.3, 'castBloom']], root: [{ t: 0.2, look: b }],
    body: (t) => mixA(rock(t, 0.8, 3, 0.24, 1.1), pawOut(t, tback - 0.2, tback + 0.4), listen(t, 2.4, 3.8)),
    fx(A) { hang(A, { kind: 'great', at: b, t0: 0, t1: 4.4, noLand: true, quiet: true, strikes: [tb, tback + 0.5] });
      FX.ring(A, { t: tb, at: [b[0], 0.02, b[1]], r0: 0.6, r1: 5, dur: 0.6, col: C.brass, op: 0.8, w: 0.08 }); FX.ring(A, { t: tback, at: [b[0], 0.02, b[1]], r0: 5, r1: 0.6, e: 'in2', dur: 0.5, col: P, op: 0.8, w: 0.08 });
      ds.forEach((d, i) => { const dx = b[0] - d[0], dz = b[1] - d[1], L = Math.hypot(dx, dz); A.hit(i, tb + L / 5 * 0.6, 16, { stun: 0.4, noStop: true }); A.move(i, tback + (5 - L) / 5 * 0.5, [dx / L * 1.5, dz / L * 1.5], 0.35, 'in2'); A.hit(i, tback + 0.5, 6, { echo: true, small: true }); });
      A.cap(0.2, 4.4, '去来：钟圈滚到 5 u，再滚回来，把小敌人往钟拖 1.5 u', 'Out and in: the rings roll out to 5 u, then back in, dragging small foes 1.5 u to the bell'); } };
}
// F8 Canon: each Carillon stroke also rolls from its bell across the whole room: 6
{ const bs = [[-0.8, 1.2], [-0.6, -1.2], [0.6, 0.2]], ds = [[1.8, 0.9], [2.2, -0.8], [3.4, 0.2]], S = [1.6, 1.98, 2.36, 2.74, 3.12, 3.5, 3.88, 4.26];
  F.F8 = { T: 5.6, cam: { x: 0.6, z: 0, w: 8.0 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'idle', { speed: 0.5 }]], root: [{ t: 0.2, look: [1, 0] }],
    body: (t) => mixA(baton(t, 1.4, 4.5, 1.2), ...S.map((s) => beat(t, s - 0.05))),
    fx(A) { bs.forEach((b) => hang(A, { at: b, t0: 0.4, t1: 5.6, drop: true, dropH: 1.2, quiet: true })); hang(A, { kind: 'chime', at: [-1.6, 0.6], t0: 0.6, t1: 1.6, quiet: true, fade: true });
      S.forEach((s, k) => { const b = bs[k % 3]; tollFx(A, s, b, 1.8, { top: 0.55 }); FX.ring(A, { t: s, at: [b[0], 0.02, b[1]], r0: 1.8, r1: 7, dur: 0.9, col: P, op: 0.35, w: 0.05 }); for (const i of [0, 1, 2]) { const q = A.dpos(i, s), L = Math.hypot(q.x - b[0], q.z - b[1]); A.hit(i, s + L / 7 * 0.9, 6, { echo: true, small: true, noStop: true }); } });
      A.cap(0.2, 5.6, '卡农：每一下也从那口钟滚过整个房间：6', 'Canon: each stroke also rolls from its bell across the whole room: 6'); } };
}
// F9 Rebound: the Clapper bounces off walls up to three times, 25% louder each
{ const d0 = [1.0, 1.5], d1 = [-0.2, -1.4], d2 = [1.9, -0.6], t0 = 0.66, pts = [[ME[0] + 0.4, 0.1], [0.4, 2.15], [1.4, -2.15], [2.5, 2.15], [2.9, 0.6]];
  F.F9 = { T: 3.8, cam: { x: 0.2, z: 0, w: 7.0 }, her: H(ME[0], ME[1]), dum: [d0, d1, d2], seq: [[0.3, 'castPoint']], root: [{ t: 0.2, look: pts[1] }],
    fx(A) { wall(A, [-3.4, 2.4], [3.6, 2.4]); wall(A, [-3.4, -2.4], [3.6, -2.4]); let t = t0;
      for (let k = 0; k < 4; k++) { const a = pts[k], b = pts[k + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) / 10; noteBolt(A, { t, from: [a[0], 0.45, a[1]], to: [b[0], 0.45, b[1]], dur: d, r: 0.06 + 0.015 * k, col: k ? P : C.brass }); if (k < 3) FX.arcs(A, { t: t + d, at: [b[0], 0.3, b[1]], y: 0.3, r: 0.6, arc: 180, yaw: b[1] > 0 ? 180 : 0, op: 0.8, col: P }); t += d; }
      A.hit(0, t0 + 0.34, 15, { note: true }); A.hit(1, t0 + 0.72, 19, { note: true, echo: true }); A.hit(2, t0 + 1.12, 23, { note: true, echo: true, big: true });
      A.cap(0.2, 3.8, '回弹：碰墙弹最多三次，每次响 25%', 'Rebound: it bounces off walls up to three times, 25% louder each'); } };
}
// F10 Standing wave: the Knell's line stays 2.5 s: 6 each half second, Ringing
{ const ds = [[-0.9, 0.1], [0.2, -0.1], [1.5, 0.2], [0.6, 1.2]], tk = 0.8;
  F.F10 = { T: 4.6, cam: { x: -0.2, z: 0.2, w: 6.6 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'castPoint', { speed: 0.72 }]], root: [{ t: 0.2, look: [2, 0] }],
    body: (t) => mixA(nod(t, tk + 0.25, 1.3), antQuiver(t, tk + 0.3, tk + 2.7)),
    fx(A) { FX.bell(A, { t0: 0.45, t1: tk + 0.6, h: 0.3, at: (t) => { const p = A.ahead(0.5, 0.45, 0.55); return [p.x, p.y, p.z]; }, tint: '#6A5A48', strikes: [tk] });
      soundLine(A, tk, [ME[0] + 0.4, 0], [ME[0] + 5.5, 0], { dur: 0.3, hold: 2.5 }); for (let k = 1; k <= 5; k++) soundLine(A, tk + 0.5 * k, [ME[0] + 0.4, 0], [ME[0] + 5.5, 0], { dur: 0.1, hold: 0.05, out: 0.25, w: 0.5, col: P, op: 0.4 });
      A.move(3, 1.2, [0, -1.15], 1.4, 's'); for (const i of [0, 1, 2]) { const p = A.dpos(i, 0); A.hit(i, tk + 0.3 * (p.x - ME[0]) / 5.5, 15, { note: true }); for (let k = 1; k <= 5; k++) A.hit(i, tk + 0.5 * k, 6, { ring: true, small: true, noStop: true }); }
      for (let k = 4; k <= 5; k++) A.hit(3, tk + 0.5 * k, 6, { ring: true, small: true, noStop: true });
      A.cap(0.2, 4.6, '驻波：线留 2.5 秒：每半秒 6，鸣震', 'Standing wave: the line stays 2.5 s: 6 each half second, Ringing'); } };
}
// F11 Hung notes: no targets: five notes hang in the air 6 s; a Note passing one sets it off: 9 within 1.5 u
{ const ns = [[-0.3, 0.9], [0.3, -0.6], [1.0, 0.5], [1.6, -0.3], [2.2, 1.0]], ds = [[0.5, 0.2], [1.3, -0.9], [2.4, 0.4]], tf = 0.95, tc = 2.4;
  F.F11 = { T: 4.6, cam: { x: 0.1, z: 0, w: 7.0 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.3, 'idle', { speed: 0.6 }], [tc - 0.36, 'castPoint']], root: [{ t: 0.2, look: [0.8, 0] }, { t: tc - 0.4, look: [3, 0.1] }],
    body: (t) => mixA(flare(t, 0.35, 0.8, 0.5), toss(t, tf)),
    fx(A) { ns.forEach((n, k) => { FX.bell(A, { t0: tf, t1: tc + 0.42 + 0.04 * k, h: 0.2, fade: true, at: (t) => { const p0 = A.at('handL', tf), u = clamp((t - tf) / 0.35); return [lerp(p0.x, n[0], u), lerp(p0.y, 0.6, u) + 0.4 * Math.sin(u * Math.PI) + 0.04 * Math.sin(t * 5 + k), lerp(p0.z, n[1], u)]; }, rot: (t) => [Math.sin(t * 6 + k) * 15, 0, 0] });
        FX.note(A, { t: tf + 0.4, at: [n[0], 0.6, n[1]], r1: 0.25, col: P, op: 0.4 }); });
      noteBolt(A, { t: tc, from: 'tip', to: [3.0, 0.5, 0.1], dur: 0.45 }); for (const k of [0, 1, 2, 3, 4]) { const n = ns[k], tt = tc + 0.42 * (n[0] - ME[0]) / 5.2; FX.arcs(A, { t: tt, at: [n[0], 0.03, n[1]], r: 1.5, arc: 360, op: 0.7, col: P }); }
      A.hit(0, tc + 0.22, 18, { note: true }); A.hit(1, tc + 0.3, 9, { note: true, echo: true }); A.hit(2, tc + 0.38, 18, { note: true });
      A.cap(0.2, 4.6, '留音：不找目标：五个音挂在空中 6 秒；一记音经过就引爆：1.5 u 内 9', 'Hung notes: no targets: five notes hang in the air 6 s; a Note passing one sets it off: 9 within 1.5 u'); } };
}
// F12 Chain toll: a knell that kills marks the nearest foe, one knock fewer each time
{ const ds = [[0.3, 0, { flat: [[2.1, 99]] }], [1.0, 0.9, { flat: [[3.2, 99]] }], [1.6, -0.6]], K0 = [0.7, 1.1, 1.5], tk0 = 1.95, K1 = [2.4, 2.8], tk1 = 3.15, tk2 = 3.65;
  F.F12 = { T: 4.6, cam: { x: -0.2, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: ds[0] }, { t: 2.2, look: ds[1] }, { t: 3.3, look: ds[2] }],
    body: (t) => mixA(knock(t, 0.5, 3.6, K0.concat(K1, [tk2 - 0.3])), nod(t, tk0, 0.8), nod(t, tk1, 0.8)),
    fx(A) { knockHud(A, 0, 0.5, tk0, (t) => K0.filter((k) => t >= k).length); knockHud(A, 1, 2.1, tk1, (t) => K1.filter((k) => t >= k).length + 1); knockHud(A, 2, 3.2, tk2, () => 3);
      [[0, tk0], [1, tk1], [2, tk2]].forEach(([i, tk], k) => { FX.bell(A, { t0: tk - 0.3, t1: tk + 0.4, h: 0.35, tint: '#6A5A48', at: (t) => { const p = A.dpt(i, t, 1.6); return [p.x, p.y, p.z]; }, strikes: [tk] }); A.hit(i, tk + 0.02, 30, { note: true, echo: k > 0, big: true }); });
      noteBolt(A, { t: tk0 + 0.1, from: (t) => A.dpt(0, tk0, 0.8), to: (t) => A.dpt(1, t, 0.8), dur: 0.25, col: P }); noteBolt(A, { t: tk1 + 0.1, from: (t) => A.dpt(1, tk1, 0.8), to: (t) => A.dpt(2, t, 0.8), dur: 0.25, col: P });
      A.cap(0.2, 4.6, '传丧：丧钟打死了，就标记最近的敌人，每传一次少敲一下', 'Chain toll: a knell that kills marks the nearest foe, one knock fewer each time'); } };
}
// F13 Out loud: each Earworm tick rings out from the carrier: 3 within 1.5 u, Ringing
{ const ds = [[0.9, 0], [1.6, 0.8], [1.5, -0.8], [0.3, -0.9]];
  F.F13 = { T: 5.0, cam: { x: -0.1, z: 0, w: 6.6 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: ds[0] }],
    body: (t) => mixA(antCurl(t, 0.3, 1.2), tapTime(t, 1.4, 4.6, 0.5)),
    fx(A) { noteBolt(A, { t: 0.9, from: 'atR', to: (t) => A.dpt(0, t, 1.1), dur: 0.3 }); earBell(A, 0, 1.2, 5.0);
      for (let t = 1.4; t <= 4.9; t += 0.5) { FX.arcs(A, { t, at: (tt) => A.dpt(0, t, 0), r: 1.5, arc: 360, op: 0.5, dur: 0.35, col: P }); for (const i of [0, 1, 2, 3]) A.hit(i, t + 0.03, 3, { ring: true, small: true, noStop: true }); }
      A.cap(0.2, 5.0, '外放：每跳一下都从带音的敌人身上响出去：1.5 u 内 3，鸣震', 'Out loud: each tick rings out from the carrier: 3 within 1.5 u, Ringing'); } };
}
// F14 Piper: the chime drifts 5 u along her aim; foes within 2.5 u follow it
{ const p0 = [-0.6, 0], ds = [[-0.4, 1.8], [0.2, -1.6], [-1.6, 1.2], [0.8, 1.5]], t0 = 1.0, t1 = 4.4;
  F.F14 = { T: 5.0, cam: { x: 1.0, z: 0, w: 8.4 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'castPoint', { speed: 0.8 }], [0.9, 'idle']], root: [{ t: 0.2, look: [3, 0] }],
    body: (t) => mixA(baton(t, 1.0, 4.2, 0.6), antUp(t, 1.0, 4.4)),
    fx(A) { const at = (t) => [lerp(p0[0], p0[0] + 5, EASE.s(clamp((t - t0) / (t1 - t0)))), 0]; hang(A, { kind: 'chime', at, t0: 0.7, t1: 5, quiet: true, beats: [1.5, 2.5, 3.5, 4.5], noLand: true, lift: 0.4 });
      FX.ring(A, { t: t0, at: [p0[0], 0.02, 0], r0: 2.5, r1: 2.5, dur: 3.5, col: P, op: 0.25, w: 0.03 });
      ds.forEach((d, i) => { A.hit(i, 1.1, 8, { note: true, noStop: true, small: true }); A.move(i, t0 + 0.3 + 0.1 * i, [4.6, -d[1] * 0.4], t1 - t0, 's'); });
      A.cap(0.2, 5.0, '引路：铃顺着瞄准飘 5 u；2.5 u 内的敌人跟着走', 'Piper: the chime drifts 5 u along her aim; foes within 2.5 u follow it'); } };
}
// F15 Far cry: no hold: the cone runs 8 u: 12 at her feet, 32 at its end, thrown 3 u there
{ const ds = [[-0.8, 0.2], [1.4, -0.6], [3.6, 0.5], [4.6, -0.3]], tr = 0.75;
  F.F15 = { T: 3.8, cam: { x: 1.4, z: 0, w: 9.4 }, her: H(-2.6, 0), dum: ds, seq: [[0.3, 'combo3', { from: 0.2 }]], root: [{ t: 0.2, look: [5, 0] }],
    body: (t) => mixA(crouch(t, tr, tr + 0.4, 0.6), listen(t, 1.8, 3.2)),
    fx(A) { FX.bell(A, { kind: 'great', h: 0.6, t0: 0.3, t1: tr + 0.6, fade: true, at: (t) => { const r = A.rootAt(t); return [r.x + 0.6, 0.32, r.z]; }, rot: () => [-98, 90, 0], strikes: [tr] });
      FX.arcs(A, { t: tr, at: [-2.0, 0.03, 0], yaw: 90, arc: 40, r: 8, n: 5, gap: 0.06, op: 0.9 }); A.shake(tr, 0.06, 0.25);
      ds.forEach((d, i) => { const L = d[0] + 2.6, n = Math.round(lerp(12, 32, L / 8)); A.hit(i, tr + L * 0.04, n, { note: true, big: n > 25, knock: [lerp(0.4, 3, L / 8), 0], kdur: 0.45 }); });
      A.cap(0.2, 3.8, '远震：不用蓄：锥形一冲 8 u：脚边 12，尽头 32，那里被抛出 3 u', 'Far cry: no hold: the cone runs 8 u: 12 at her feet, 32 at its end, thrown 3 u there'); } };
}
// F16 Twelve shots: each Midnight stroke is a line at the pointer, 7 u: 6; the twelfth 24
{ const ds = [[0.4, 0.5], [1.6, -0.3], [2.8, 0.6], [3.6, -0.4]], t0 = 0.6, S = Array.from({ length: 12 }, (_, i) => +(t0 + i * 0.25).toFixed(2));
  F.F16 = { T: 4.8, cam: { x: 1.2, z: 0, w: 8.6 }, her: H(-2.4, 0), dum: ds, seq: [[0.3, 'drumHold', { loop: true, until: S[11] }], [S[11] - 0.05, 'combo3', { from: 0.42 }]], root: [{ t: 0.2, look: [4.6, 0] }],
    body: (t) => mixA(...S.map((s) => ({ spine: [0, 0, 3 * Math.exp(-Math.max(0, t - s) * 12) * (t > s ? 1 : 0)] }))),
    fx(A) { const pz = (i) => 0.5 * Math.sin(i * 1.7); ptr(A, [4.6, 0], 0, S[11] + 0.3);
      S.forEach((s, i) => { const last = i === 11; soundLine(A, s, [-1.9, 0], [5.1, last ? 0 : pz(i)], { dur: 0.16, hold: 0.05, out: 0.2, w: last ? 0.6 : 0.24, op: last ? 0.85 : 0.55 }); for (const k of [0, 1, 2, 3]) A.hit(k, s + 0.08, last ? 24 : 6, { note: true, small: !last, noStop: !last, big: last && k === 0, stun: last ? 0.8 : 0 }); });
      A.cap(0.2, 4.8, '连发：每一下都是朝指针的一条线，7 u：6；第十二下 24', 'Twelve shots: each stroke is a line at the pointer, 7 u: 6; the twelfth 24'); } };
}
// F17 Ride the note: she rides a thrown note up to 5 u through foes: 8; press again to step off
{ const ds = [[-0.6, 0.2], [0.6, -0.2], [1.8, 0.3]], tj = 0.7, te = 1.65;
  F.F17 = { T: 3.8, cam: { x: 0.0, z: 0, w: 7.2 }, her: H(-2.8, 0), dum: ds, seq: [[0.25, 'castPoint', { to: 0.45 }], [tj - 0.05, 'glide', { loop: true, until: te }], [te, 'hop', { from: 0.55 }]],
    root: [{ t: 0.2, look: [3, 0] }, { t: tj, fw: 0, y: 0 }, { t: tj + 0.12, fw: 0.3, y: 0.32, e: 'out' }, { t: te, fw: 4.7, y: 0.32, e: 'lin' }, { t: te + 0.3, fw: 5.0, y: 0, e: 'in' }],
    body: (t) => mixA(flare(t, tj, te, 0.9)), unseen: [[tj, te]],
    fx(A) { FX.note(A, { t: tj, at: (t) => { const r = A.rootAt(t); return new A.THREE.Vector3(r.x, 0.18, r.z); }, r1: 0.45, dur: te - tj, col: P, op: 0.7, follow: true });
      FX.trail(A, { of: (t) => { const r = A.rootAt(t); return new A.THREE.Vector3(r.x, 0.2, r.z); }, t0: tj, t1: te, w: 0.25, col: C.brass, len: 0.35 });
      ds.forEach((d, i) => A.hit(i, tj + (te - tj) * (d[0] + 2.5) / 4.7, 8, { note: true, small: true }));
      A.cap(0.2, 3.8, '乘音：骑着抛出的音冲最多 5 u，穿过的敌人 8；再按一下就下来', 'Ride the note: she rides a thrown note up to 5 u through foes: 8; press again to step off'); } };
}
// F18 Leftover (kit 1.2): as the lull ends the chime rings out what is left: 10 to every lulled foe, a Note
{ const a0 = [-0.6, -1.0, { ally: true }], a1 = [0.2, 1.0, { ally: true }], f0 = [0.6, -1.3], f1 = [1.0, 1.4], f2 = [-0.2, -1.9], tb = [0.7, 1.3], te = 4.85;
  F.F18 = { T: 5.6, cam: { x: -0.6, z: 0.3, w: 7.2 }, her: H(ME[0], ME[1]), dum: [a0, a1, f0, f1, f2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [a0[0], a0[1]] }, { t: 1.0, look: [a1[0], a1[1]] }],
    body: (t) => mixA(baton(t, 0.3, 1.6), beat(t, tb[0]), beat(t, tb[1]), listen(t, te - 0.3, 5.4)),
    fx(A) { for (const [i, t, foes] of [[0, tb[0], [2, 4]], [1, tb[1], [3]]]) { FX.bell(A, { t0: t - 0.1, t1: te + 0.2, h: 0.22, at: (tt) => { const p = A.dpt(i, tt, 1.55); return [p.x, p.y, p.z]; }, strikes: [t + 0.05, te] }); FX.ring(A, { t: t + 0.05, at: (tt) => A.dpt(i, t, 0.02), r0: 0.3, r1: 2.0, dur: 0.6, col: C.pale, op: 0.6, w: 0.06 }); for (const f of foes) lull(A, f, t + 0.15, te); }
      for (const [i, f] of [[0, 2], [0, 4], [1, 3]]) { noteBolt(A, { t: te, from: (t) => A.dpt(i, te, 1.5), to: (t) => A.dpt(f, t, 0.7), dur: 0.22, col: P }); A.hit(f, te + 0.22, 10, { note: true, echo: true }); }
      A.cap(0.2, te, '入静：两个队友身边 2 u 的敌人慢 30%，4 秒', 'Lulled: foes within 2 u of the two friends are 30% slower, 4 s');
      A.cap(te, 5.6, '余响：入静结束时，铃把剩下的响出去：每个入静的敌人 10，一记音', 'Leftover: as the lull ends the chime rings out what is left: 10 to every lulled foe, a Note'); } };
}
// F19 Two-tone: no haste: the fork stands at the pointer 5 s; a Note that passes it splits in two
{ const p = [0.0, 0], ds = [[2.0, 1.1], [2.2, -1.1]], tc = 1.8;
  F.F19 = { T: 4.4, cam: { x: -0.1, z: 0, w: 6.6 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'castPlant'], [tc - 0.36, 'castPoint', { speed: 1.2 }]], root: [{ t: 0.2, look: p }],
    body: (t) => mixA(antQuiver(t, 0.8, 1.4), listen(t, 2.5, 4.0)),
    fx(A) { ptr(A, p, 0, 0.8); FX.fork(A, { t0: 0.7, t1: 4.4, at: [p[0], 0, p[1]], hums: [0.9, tc + 0.25], s: 2.2 });
      noteBolt(A, { t: tc, from: 'tip', to: [p[0], 0.5, p[1]], dur: 0.25 }); for (const i of [0, 1]) { noteBolt(A, { t: tc + 0.26, from: [p[0], 0.5, p[1]], to: (t) => A.dpt(i, t, 0.6), dur: 0.25, col: i ? P : C.brass }); A.hit(i, tc + 0.51, 12, { note: true, echo: i === 1 }); }
      A.cap(0.2, 4.4, '分音：不加速：音叉立在指针 5 秒；经过它的音一分为二', 'Two-tone: no haste: the fork stands at the pointer 5 s; a Note that passes it splits in two'); } };
}
// F20 Your turn (kit 1.2): as the solo ends it passes to the nearest other friend for 2 s, then on once more
{ const as = [[-0.8, 0.9, { ally: true }], [-0.4, -1.0, { ally: true }], [0.9, 0.2, { ally: true }]], fs = [[0.2, 1.3], [0.5, -1.4], [1.7, 0.6]], tg = 0.9, T1 = tg + 4, T2 = T1 + 2, T3 = T2 + 2;
  F.F20 = { T: 9.0, cam: { x: -0.4, z: 0, w: 6.8 }, her: H(ME[0], ME[1]), dum: as.concat(fs), seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: [as[0][0], as[0][1]] }, { t: T1 - 0.2, look: [as[1][0], as[1][1]] }, { t: T2 - 0.2, look: [as[2][0], as[2][1]] }],
    body: (t) => mixA(baton(t, 0.3, 1.1), beat(t, tg - 0.05), nod(t, T1, 0.6), nod(t, T2, 0.6)),
    fx(A) { soloOn(A, 0, tg, T1); soloOn(A, 1, T1, T2, '轮奏 +30%', 'Your turn +30%'); soloOn(A, 2, T2, T3, '轮奏 +30%', 'Your turn +30%');
      for (const [a, b, t] of [[0, 1, T1], [1, 2, T2]]) noteBolt(A, { t: t - 0.25, from: (tt) => A.dpt(a, t, 1.2), to: (tt) => A.dpt(b, tt, 1.2), dur: 0.25, col: P });
      for (const [a, f, t] of [[0, 3, 1.6], [0, 3, 2.6], [0, 3, 3.6], [1, 4, 5.4], [1, 4, 6.2], [2, 5, 7.4], [2, 5, 8.2]]) friendSwing(A, a, t, f, 26, { small: true });
      A.cap(0.2, T1, '独奏 4 秒', 'Solo, 4 s'); A.cap(T1, 9.0, '轮奏：独奏结束时传给最近的另一个队友 2 秒，再传一次', 'Your turn: as it ends it passes to the nearest other friend for 2 s, then on once more'); } };
}
// F21 Metronome: each beat a free note at the foe nearest the pointer: 8
{ const d0 = [0.6, 0.4], d1 = [1.2, -0.8], p = [0.9, 0.2], B = beatsOf(1.4, 5.4, 0.5);
  F.F21 = { T: 5.8, cam: { x: -0.4, z: 0, w: 6.4 }, her: H(ME[0], ME[1]), dum: [d0, d1], seq: [[0.25, 'idle', { speed: 0.6 }], [1.2, 'idleHold', { loop: true, until: 5.6 }]], root: [{ t: 0.2, look: p }],
    body: (t) => mixA(tapTime(t, 1.2, 5.6, 0.5), antFlick(t, B), rockSlow(t, 1.2, 5.6, 0.5, 0.5)),
    fx(A) { ptr(A, p, 0.6, 5.6); FX.bell(A, { t0: 1.0, t1: 5.6, h: 0.18, at: (t) => { const q = A.at('head', t); return [q.x, q.y + 0.42, q.z]; }, strikes: B, rot: (t) => [0, 0, 25 * Math.sin(t * Math.PI * 2)] });
      for (const b of B) { noteBolt(A, { t: b, from: 'head', to: (t) => A.dpt(0, t, 0.6), dur: 0.2, r: 0.05 }); A.hit(0, b + 0.2, 8, { note: true, small: true, noStop: true }); }
      A.cap(0.2, 5.8, '节拍器：每拍一记白送的音，打离指针最近的敌人：8', 'Metronome: each beat a free note at the foe nearest the pointer: 8'); } };
}
// F22 Dead air (kit 1.2): no fence: foes inside cannot shoot, cast or call; a cast under way is cut off
{ const c = [0.4, 0], f0 = [0.6, 0.6], f1 = [0.9, -0.5], f2 = [3.4, 0.8], t0 = 1.0, tw = 0.6;
  F.F22 = { T: 5.0, cam: { x: 0.3, z: 0, w: 7.6 }, her: H(ME[0], ME[1]), dum: [f0, f1, f2], seq: [[0.25, 'idle', { speed: 0.6 }]], root: [{ t: 0.2, look: c }],
    body: (t) => mixA(floorCircle(t, 0.4, 1.0), { head: [t > 1.0 && t < 4.6 ? 6 : 0, 0, 0] }, antDroop(t, 1.0, 4.6)),
    fx(A) { FX.ring(A, { t: t0, at: [c[0], 0.02, c[1]], r0: 0.4, r1: 2.5, dur: 0.4, col: P, op: 0.35, w: 2.0 }); FX.ring(A, { t: t0 + 0.4, at: [c[0], 0.02, c[1]], r0: 2.5, r1: 2.5, dur: 3.6, col: P, op: 0.18, w: 2.2 });
      FX.ring(A, { t: t0 + 0.4, at: [c[0], 0.02, c[1]], r0: 2.5, r1: 2.5, dur: 3.6, col: C.verd, op: 0.3, w: 0.03 });
      FX.ring(A, { t: tw, at: (t) => A.dpt(0, tw, 0.02), r0: 0.2, r1: 0.8, dur: 0.45, col: C.foe, op: 0.7, w: 0.05 }); A.tag(0, t0 + 0.05, t0 + 0.7, ['打断', 'Cut off'], C.stun);
      for (const i of [0, 1]) A.tag(i, t0 + 0.7, 4.4, ['哑', 'Silenced'], C.verd);
      A.cap(0.2, 5.0, '静区：没有墙：里面的敌人不能射、施法或呼叫；正在施的被打断', 'Dead air: no fence: foes inside cannot shoot, cast or call; a cast under way is cut off'); } };
}
// F23 There and back: she clicks back 1.5 s later, or on a second press; both landings flip
{ const p = [1.4, 0], ds = [[1.9, 0.8], [2.1, -0.7], [-1.7, 1.15], [-2.0, -1.2]], tj = 0.75, tl = 1.25, tb = tl + 1.5, tb2 = tb + 0.5;
  F.F23 = { T: 4.8, cam: { x: -0.4, z: 0, w: 7.6 }, her: H(ME[0], ME[1]), dum: ds, seq: [[0.25, 'idle', { speed: 0.6 }], [tj - 0.1, 'tuck', { loop: true, until: tl + 0.3, fade: 0.06 }], [tl + 0.3, 'idle', { fade: 0.2 }], [tb - 0.1, 'tuck', { loop: true, until: tb2 + 0.3, fade: 0.06 }], [tb2 + 0.3, 'idle', { fade: 0.2 }]],
    root: [{ t: 0.2, look: p }, { t: tj, fw: 0, y: 0 }, { t: tl, fw: 3.6, y: 0, jump: 0.9, e: 'lin', spin: 360 }, { t: tb, fw: 3.6, y: 0, spin: 360 }, { t: tb2, fw: 0, y: 0, jump: 0.9, e: 'lin', spin: 720 }],
    body: (t) => mixA(clap(t, tj), clap(t, tb)),
    fx(A) { ptr(A, p, 0, tl); for (const [t, at, ii] of [[tl, p, [0, 1]], [tb2, ME, [2, 3]]]) { FX.arcs(A, { t, at: [at[0], 0.03, at[1]], r: 1.5, arc: 360, n: 2, op: 0.85, col: t === tb2 ? P : C.brass }); FX.dust(A, { t, at: [at[0], 0.02, at[1]], n: 10, sp: 1, dur: 0.4 });
        for (const i of ii) { A.hit(i, t + 0.03, 10, { strike: true, echo: t === tb2 }); A.launch(i, t + 0.03, 0.3); A.tag(i, t + 0.2, t + 1.1, ['翻倒', 'Flipped'], C.stun); } }
      FX.trail(A, { of: (t) => { const r = A.rootAt(t); return new A.THREE.Vector3(r.x, 0.4 + r.y, r.z); }, t0: tb, t1: tb2, w: 0.2, col: P, len: 0.3 });
      A.cap(0.2, 4.8, '来回：1.5 秒后自己叩回来，或再按一下；两头落地都翻倒', 'There and back: she clicks back 1.5 s later, or on a second press; both landings flip'); } };
}
// F24 Many voices: no bells: every hit a friend lands is heard twice: an echo 0.5 s later for 30%
{ const a0 = [-0.6, 1.0, { ally: true }], a1 = [-0.4, -1.0, { ally: true }], f0 = [0.6, 1.0], f1 = [0.8, -1.0], H1 = [1.6, 2.4, 3.2, 4.0], H2 = [1.9, 2.7, 3.5, 4.3];
  F.F24 = { T: 5.4, cam: { x: -0.6, z: 0, w: 6.6 }, her: H(ME[0], ME[1]), dum: [a0, a1, f0, f1], seq: [[0.25, 'castBloom', { to: 0.62 }], [0.87, 'bloomHold', { loop: true, until: 1.3 }], [1.3, 'idleHold', { loop: true, until: 5.4 }]], root: [{ t: 0.2, look: [0, 0] }],
    body: (t) => mixA(flare(t, 0.3, 1.4), rockSlow(t, 1.3, 5.2, 0.4, 0.8)),
    fx(A) { FX.ring(A, { t: 0.9, at: [ME[0], 0.02, ME[1]], r0: 0.4, r1: 4, dur: 0.6, col: P, op: 0.5, w: 0.05 });
      for (const t of H1) { FX.arcs(A, { t, at: [a0[0] + 0.3, 0.5, a0[1]], y: 0.5, yaw: 90, arc: 90, r: 0.8, dur: 0.25, col: C.verd, op: 0.8 }); A.hit(2, t + 0.1, 20, {}); A.hit(2, t + 0.6, 6, { echo: true, small: true }); echoAt(A, t + 0.6, [f0[0], f0[1]], 0.6); }
      for (const t of H2) { FX.arcs(A, { t, at: [a1[0] + 0.3, 0.5, a1[1]], y: 0.5, yaw: 90, arc: 90, r: 0.8, dur: 0.25, col: C.verd, op: 0.8 }); A.hit(3, t + 0.1, 20, {}); A.hit(3, t + 0.6, 6, { echo: true, small: true }); echoAt(A, t + 0.6, [f1[0], f1[1]], 0.6); }
      A.cap(0.2, 5.4, '众声：没有钟：队友每打一下都听到两次：0.5 秒后回声 30%（20 → 6）', 'Many voices: no bells: every hit a friend lands is heard twice: an echo 0.5 s later for 30% (20 → 6)'); } };
}
