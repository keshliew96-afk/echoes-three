// Sanguine 饮血 forms: what he cuts comes back to him. Every hit sends a few drops home (T2: 15%, 5% from area hits, zones and bleeds),
// a health bar shows it (bottom right), and health above full turns into a blood shield, up to 24.
// SA() wraps a base clip like RA() does: it records his hits and heals, then draws the drops, the bar and the shield.
import { FX, C, EASE, clamp } from './dw.js';
import { DEFS, FORMS, H, D2R, around, comboHud, countAt, bolt, claw, drink, at3, fan, font } from './defs.js';
const F = FORMS.sa;
const TICK = '#E7A0A8';

// o: def (overrides), base (run the base fx, default true), caps (keep base captions), hp (health at t 0, of 100), fx (more),
// hurt [[t, n]] (hits on him), steal false (no 15% drops)
function SA(base, o = {}) {
  const def = { ...base, ...(o.def || {}) };
  def.fx = (A) => {
    const hits = [], heals = []; const h0 = A.hit.bind(A), he0 = A.heal.bind(A), cap0 = A.cap.bind(A);
    A.hit = (i, t, n, oo = {}) => { if (n != null && typeof n === 'number') hits.push({ i, t, n, area: !!(oo.area || oo.col === TICK || oo.noCombo) }); return h0(i, t, n, oo); };
    A.heal = (t, n, oo) => { heals.push({ t, n }); return he0(t, n, oo); };
    if (o.base !== false && base.fx) { if (o.caps === false) A.cap = () => {}; base.fx(A); A.cap = cap0; }
    if (o.fx) o.fx(A);
    A.hit = h0; A.heal = he0;
    const hp0 = o.hp != null ? o.hp : 62, hurt = o.hurt || [];
    // T2: 15% of each hit comes home (5% from area hits, zones and bleeds), as drops, no number
    const steal = o.steal === false ? [] : hits.map((h) => ({ t: h.t + 0.35, n: h.n * (h.area ? 0.05 : 0.15) }));
    if (o.steal !== false) hits.forEach((h, k) => { if (h.area && k % 2) return; FX.drops(A, { t: h.t + 0.02, at: { d: h.i, y: 0.6 }, n: h.area ? 1 : h.n >= 10 ? 3 : 2, to: (tt) => A.at('chest', tt), hang: 0.1, fly: 0.24, size: 0.035, sp: 0.6, up: 0.5, seed: 31 + k }); });
    const gain = (t) => { let g = hp0; const ev = [...heals.map((x) => [x.t, x.n]), ...steal.map((x) => [x.t, x.n]), ...hurt.map((x) => [x[0], -x[1]])].sort((a, b) => a[0] - b[0]);
      let hp = hp0, sh = 0; for (const [tt, n] of ev) { if (tt > t) break; if (n < 0) { const fromSh = Math.min(sh, -n); sh -= fromSh; hp = Math.max(1, hp + n + fromSh); } else { const room = 100 - hp; hp += Math.min(room, n); sh = Math.min(24, sh + Math.max(0, n - room)); } } return { hp, sh }; };
    A.hud((t, x, W, H2, k, lang) => { const { hp, sh } = gain(t); const w = 150 * k, bh = 9 * k, X = W - 14 * k - w, Y = H2 - 46 * k;
      x.fillStyle = 'rgba(20,11,18,0.55)'; x.fillRect(X - 3 * k, Y - 3 * k, w + 6 * k, bh + 6 * k); x.fillStyle = '#3A2A33'; x.fillRect(X, Y, w, bh);
      x.fillStyle = '#4FC765'; x.fillRect(X, Y, w * hp / 100, bh);
      if (sh > 0.5) { x.fillStyle = '#A5121F'; x.fillRect(X, Y - 5 * k, w * sh / 24 * 0.5, 4 * k); }
      x.font = font(k, 13); x.textAlign = 'right'; x.fillStyle = '#F6ECEE'; x.fillText((lang === 'en' ? 'Health ' : '生命 ') + Math.round(hp) + (sh > 0.5 ? (lang === 'en' ? '  Blood shield ' : '  血盾 ') + Math.round(sh) : ''), W - 14 * k, Y - 9 * k); });
    // the blood shield round him while it lasts
    let tS = null; for (let t = 0; t <= def.T; t += 0.05) if (gain(t).sh > 0.5) { tS = t; break; }
    if (tS != null) FX.shield(A, { t0: tS, t1: def.T, r: 0.62, op: 0.32, col: '#C2283A' });
  };
  return def;
}
const cap = (A, a, b, zh, en) => A.cap(a, b, zh, en);
// a bleed: the status and its ticks (n each, every 'every' s, k ticks)
const bleed = (A, i, t, n, k, every = 0.5, dur) => { A.status(i, t, 'bleed', dur || every * k + 0.2, { rate: 7 }); for (let j = 1; j <= k; j++) A.hit(i, t + every * j, n, { col: TICK, noCombo: true }); };
// a pool of blood on the floor
const pool = (A, t, at, r, dur) => { FX.disc(A, { t, at, r0: r * 0.6, r1: r, dur, hold: true, col: '#7A1424', op: 0.55, normal: true }); FX.ring(A, { t, at, r0: r * 0.3, r1: r, dur: 0.35, col: C.blood, op: 0.7, normal: true }); };

// ---------------------------------------------------------------- passive, basic attack, dash
// P: a kill: he drinks it, 6 health
F.P = SA(DEFS.P, { caps: false, fx(A) {
  cap(A, 0.55, 1.4, '正面：10', 'From the front: 10'); cap(A, 1.65, 2.9, '背刺 +20%：12', 'Backstab +20%: 12');
  drink(A, 3.32, { d: 1, y: 0.6 }, 6, { drops: 12, hang: 0.3, fly: 0.3 }); FX.thread(A, { t0: 3.3, t1: 3.9, from: { d: 1, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.03 });
  cap(A, 3.3, 4.9, '击杀：他把它喝掉，回血 6', 'A kill: he drinks it, 6 health'); } });
// B: the bite holds on and drinks: 10, and half comes back
{ const me = [-1.1, 0], d0 = [-0.15, 0], d1 = [1.7, -0.55]; const t0 = 0.35, Hd = 0.7, tb = t0 + 0.46;
  const s1 = around(d1, 0), s2 = around(d1, 126), s3 = around(d1, -126);
  const sh = (x) => x + t0 + (x > 0.47 ? Hd : 0); const hitT = [0.10, 0.24, 0.46, 0.62, 0.78, 0.96].map(sh);
  F.B = SA({ T: 2.6 + Hd, cam: { x: 0.35, z: -0.2, w: 5.8 }, her: H(me[0], me[1]), seq: [[t0, 'combo', { to: 0.48, hold: true }], [t0 + 0.48 + Hd, 'combo', { from: 0.48, fade: 0.04 }]],
    root: [{ t: tb }, { t: tb + 0.1, fw: 0.08 }, { t: tb + Hd - 0.1, fw: 0.12 }, { t: tb + Hd + 0.02, fw: -0.05, e: 'out' }, { t: sh(0.5) }, { t: sh(0.56), x: s1[0], z: s1[1], look: d1, cut: true }, { t: sh(0.72), x: s2[0], z: s2[1], look: d1, cut: true }, { t: sh(0.89), x: s3[0], z: s3[1], look: d1, cut: true }, { t: sh(1.10), x: me[0], z: me[1], look: [5, 0], cut: true }],
    hide: [[sh(0.5), sh(0.56)], [sh(0.66), sh(0.72)], [sh(0.83), sh(0.89)], [sh(1.04), sh(1.10)]], dum: [d0, d1], fx(A) {
    claw(A, hitT[0], 0, 4, { of: 'handR' }); claw(A, hitT[1], 0, 4, { roll: 0.95, mark: { bend: -0.1 }, of: 'handL' });
    FX.bite(A, { t: tb, at: { d: 0, y: 0.6 }, size: 0.5, life: Hd + 0.4 }); A.shake(tb, 0.04, 0.14);
    for (let k = 0; k < 5; k++) { const tk = tb + 0.04 + k * (Hd - 0.1) / 4; A.hit(0, tk, 2, { big: k === 4 }); FX.drops(A, { t: tk, at: { d: 0, y: 0.62 }, n: 4, to: (tt) => A.at('mouth', tt), hang: 0.06, fly: 0.12, size: 0.04, sp: 0.3, up: 0.2 }); }
    FX.thread(A, { t0: tb, t1: tb + Hd, from: { d: 0, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.035, per: 0.25 }); A.heal(tb + Hd - 0.1, 5);
    claw(A, hitT[3], 1, 5, { of: 'handR' }); claw(A, hitT[4], 1, 5, { roll: 0.95, mark: { bend: -0.1 }, of: 'handL' });
    A.hit(1, hitT[5], 8, { big: true }); FX.claw(A, { t: hitT[5], at: { d: 1, y: 0.66 }, roll: -0.2, n: 4, size: 0.62, bend: 0.12 }); FX.claw(A, { t: hitT[5], at: { d: 1, y: 0.58 }, roll: 0.2, n: 4, size: 0.62, bend: -0.12 }); A.shake(hitT[5], 0.05, 0.16);
    const hops = [[0.5, me, s1], [0.66, s1, s2], [0.83, s2, s3], [1.04, s3, me]]; for (const [h, a, b] of hops) FX.blink(A, { t: sh(h), dur: 0.06, from: [a[0], 0.45, a[1]], to: [b[0], 0.45, b[1]], n: 9, size: 1.3 });
    A.hud(comboHud(countAt([hitT[0], hitT[1], ...[0, 1, 2, 3, 4].map((k) => tb + 0.04 + k * (Hd - 0.1) / 4), hitT[3], hitT[4], hitT[5]])));
    cap(A, tb, tb + Hd + 0.3, '咬住不放：10，一半回血', 'The bite holds on and drinks: 10, half comes back'); } });
}
// D: the bats bite each foe they pass: 4, and all of it comes back
F.D = SA(DEFS.D, { def: { dum: [...DEFS.D.dum, [-1.25, 0.2], [-0.45, 0.45]] }, fx(A) {
  [1, 2].forEach((i) => { const t = 0.63 + 0.04 * i; A.hit(i, t, 4); FX.bite(A, { t, at: { d: i, y: 0.62 }, size: 0.3 }); FX.drops(A, { t: t + 0.02, at: { d: i, y: 0.62 }, n: 6, to: (tt) => A.at('chest', tt), hang: 0.08, fly: 0.2, size: 0.04, sp: 0.5, up: 0.4 }); });
  A.heal(0.95, 8); cap(A, 0.62, 1.2, '蝙蝠咬过路的敌人：各 4，全部回血', 'The bats bite each foe they pass: 4, all of it back'); } });

// ---------------------------------------------------------------- Claw
// F1: the cuts bleed: 8 over 3 s
F.F1 = SA(DEFS.F1, { def: { T: 4.2 }, fx(A) { const tH = 0.72; DEFS.F1.dum.forEach((p, i) => bleed(A, i, tH + 0.05, 2, 4, 0.75));
  cap(A, tH + 0.2, 4.1, '伤口流血：3 秒 8', 'The cuts bleed: 8 over 3 s'); } });
// F2: the cross tear is a bite: 10, and the blood of all eight strikes flies to him: heals 8
{ const ds = [[-0.2, -0.25], [-0.1, 0.45]]; const t0 = 0.3; const jab = Array.from({ length: 8 }, (_, i) => t0 + 0.15 + 0.11 * i + 0.05); const tX = t0 + 1.0 + 0.4;
  F.F2 = SA({ ...DEFS.F2, T: 3.2, seq: [[t0, 'jabs', { to: 1.0 }], [t0 + 1.0, 'dart', { from: 0.14, fade: 0.06 }], [t0 + 1.6, 'lick']], root: [{ t: t0 + 1.12 }, { t: t0 + 1.38, fw: 0.25, e: 'out' }] }, { base: false, fx(A) {
    jab.forEach((t, i) => { const d = i % 2, s = i % 2 ? 'handL' : 'handR'; claw(A, t, d, 3, { roll: i % 2 ? 0.9 : -0.9, size: 0.36, of: s, mark: { life: 1.4, drops: true } }); });
    A.ghost((t) => (t > t0 + 0.15 && t < t0 + 1.02 ? [{ lag: 0.035, op: 0.22, glow: 0.25 }, { lag: 0.07, op: 0.14, glow: 0.2 }] : []));
    [0, 1].forEach((d) => { A.hit(d, tX + 0.02 * d, 10, { big: true }); FX.bite(A, { t: tX + 0.02 * d, at: { d, y: 0.62 }, size: 0.5 }); });
    jab.forEach((t, i) => FX.drops(A, { t: tX + 0.03 * i, at: { d: i % 2, y: 0.5 + 0.03 * i }, n: 3, to: (tt) => A.at('mouth', tt), hang: 0.12, fly: 0.22, size: 0.045, sp: 0.5, up: 0.3, seed: 70 + i }));
    A.heal(tX + 0.6, 8); A.shake(tX, 0.05, 0.16);
    cap(A, tX - 0.05, 3.1, '撕咬：10；八爪的血飞回来：回血 8', 'A bite: 10; the blood of all eight strikes flies home: 8'); } });
}
// F3: the wing tips throw a ring of blood out to 2.6 u: 4, bleeding 6 over 3 s
{ const t0 = 0.3, t1 = t0 + 0.95; const ds = [...DEFS.F3.dum, [3.0, 1.2], [2.4, -1.5]];
  F.F3 = SA(DEFS.F3, { def: { T: 4.6, dum: ds }, fx(A) { const tR = t1 - 0.05, c = A.body(tR, 0);
    FX.ring(A, { t: tR, at: [c.x, 0.5, c.z], r0: 0.4, r1: 2.6, dur: 0.4, col: C.blood, op: 0.95, w: 0.22 }); FX.ring(A, { t: tR + 0.04, at: [c.x, 0, c.z], r0: 0.3, r1: 2.6, dur: 0.45, col: '#7A1424', op: 0.6, normal: true });
    FX.drops(A, { t: tR, at: [c.x, 0.5, c.z], n: 24, sp: 4.0, up: 0.5, size: 0.06, dur: 0.6 });
    ds.forEach((p, i) => { const d = Math.hypot(p[0] - c.x, p[1] - c.z); if (d <= 2.7) { const th = tR + 0.4 * d / 2.6; A.hit(i, th, 4, { col: '#F2B8C0', area: true }); bleed(A, i, th, 2, 3, 1.0); } });
    cap(A, tR, 4.5, '翼尖甩出血环，2.6 u：4，流血 3 秒 6', 'A ring of blood off the wing tips, 2.6 u: 4, bleeding 6 over 3 s'); } });
}
// F4: in the air he bites and holds on: 18 over 1 s, half comes back; then he lets it drop
{ const d0 = [-0.6, 0], d1 = [-0.75, 0.75]; const t0 = 0.3, tR = t0 + 0.22, tB = t0 + 0.6, tD = tB + 1.05;
  F.F4 = SA({ T: 3.8, cam: { x: -0.5, z: -0.6, w: 6.0, y: 1.0 }, her: H(-1.5, 0), seq: [[t0, 'rise'], [t0 + 0.42, 'castPlant', { from: 0.25, to: 0.5, hold: true, fade: 0.08 }], [tD, 'drift'], [tD + 0.9, 'idle']],
    root: [{ t: tR }, { t: t0 + 0.5, y: 1.4, fw: 0.42, e: 'out' }, { t: tB + 0.5, y: 1.48, fw: 0.45 }, { t: tD, y: 1.4, fw: 0.42 }, { t: tD + 0.15, y: 1.55, fw: 0.2, e: 'out' }, { t: tD + 0.9, y: 0, fw: 0.05, e: 's' }], dum: [d0, d1] }, { base: false, fx(A) {
    claw(A, tR, 0, 8, { up: 1.75, roll: 1.4, size: 0.55, of: 'handR' }); claw(A, tR + 0.02, 1, 8, { up: 0.75, roll: 1.4, size: 0.5 }); FX.trail(A, { of: 'handR', t0: tR - 0.12, t1: tR + 0.12, len: 0.18, w: 0.12 }); FX.dust(A, { t: tR, at: 'him', n: 7, sp: 0.9 });
    FX.bite(A, { t: tB, at: at3(A, 0, 0.5), size: 0.45, follow: true, life: 1.2 }); A.shake(tB, 0.04, 0.14);
    for (let k = 0; k < 6; k++) { const tk = tB + 0.05 + 0.18 * k; A.hit(0, tk, 3, { big: k === 5 }); A.launch(0, tk, 0.07); FX.drops(A, { t: tk, at: at3(A, 0, 0.66), n: 4, to: (tt) => A.at('mouth', tt), hang: 0.05, fly: 0.12, size: 0.04, sp: 0.3, up: 0.2, seed: 50 + k }); }
    FX.thread(A, { t0: tB, t1: tD, from: at3(A, 0, 0.62), to: (t) => A.at('mouth', t), w: 0.035, per: 0.22 }); A.heal(tD + 0.05, 9); A.launch(0, tD, 0.04);
    cap(A, tB, tD, '空中咬住：1 秒 18，一半回血', 'He bites and holds on in the air: 18 over 1 s, half back'); cap(A, tD, 3.7, '然后松口，让它掉下去', 'Then he lets it drop'); } });
}
// F5: a kill with it heals 12
F.F5 = SA(DEFS.F5, { fx(A) { const b2 = 1.9 + 0.44; drink(A, b2 + 0.05, { d: 1, y: 0.6 }, 12, { drops: 14, hang: 0.3, fly: 0.3 }); FX.thread(A, { t0: b2 + 0.02, t1: b2 + 0.8, from: { d: 1, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.035 });
  cap(A, b2 + 0.1, 3.5, '击杀：回血 12，立刻就绪', 'A kill: 12 health, and it is ready again'); } });
// F6: one long bite: 20, half comes back
{ const d0 = [1.0, 0]; const t0 = 0.3, tl = t0 + 0.6, tE = tl + 1.0;
  F.F6 = SA({ T: 3.6, cam: { x: 0.0, z: 0, w: 5.8, y: 0.6 }, her: H(-2.3, 0), seq: [[t0, 'pounce'], [tl, 'castPlant', { from: 0.3, to: 0.5, hold: true, fade: 0.06 }], [tE, 'flip'], [tE + 0.5, 'emerge', { from: 0.07 }]],
    root: [{ t: t0 + 0.14 }, { t: tl, fw: 2.75, y: 0.42, jump: 1.3, e: 'lin' }, { t: tE, fw: 2.78, y: 0.42 }, { t: tE + 0.45, fw: 1.6, y: 0, jump: 0.8, pitch: -360, e: 'lin' }], dum: [d0] }, { base: false, fx(A) {
    A.hit(0, tl, null, { big: true }); A.turn(0, tl, 0, 0.1); A.status(0, tl, 'stun', tE - tl); FX.dust(A, { t: tl, at: { d: 0, y: -0.6 }, n: 7 }); A.shake(tl, 0.05, 0.15);
    FX.bite(A, { t: tl + 0.05, at: { d: 0, y: 0.78 }, size: 0.62, life: 1.3 });
    for (let k = 0; k < 5; k++) { const tk = tl + 0.1 + 0.2 * k; A.hit(0, tk, 4, { big: k === 4 }); FX.drops(A, { t: tk, at: { d: 0, y: 0.78 }, n: 4, to: (tt) => A.at('mouth', tt), hang: 0.05, fly: 0.12, size: 0.045, sp: 0.3, up: 0.2, seed: 60 + k }); }
    FX.thread(A, { t0: tl + 0.05, t1: tE, from: { d: 0, y: 0.78 }, to: (t) => A.at('mouth', t), w: 0.035, per: 0.22 }); A.heal(tE + 0.05, 10);
    cap(A, tl, tE + 0.5, '一口长咬：20，一半回血', 'One long bite: 20, half comes back'); } });
}
// F7: one blood crescent: 14; it flies back to him through the foes for half and brings 1 health for each foe, up to 6
{ const ds = [[-0.4, 0.15], [0.9, -0.2], [2.1, 0.25]]; const t0 = 0.3, tC = t0 + 0.44, out = 0.42, back = 0.5;
  F.F7 = SA({ T: 2.9, cam: { x: 0.3, z: 0, w: 6.4 }, her: H(-1.9, 0), seq: [[t0, 'clap'], [tC + out + back - 0.1, 'castPlant', { from: 0.35, fade: 0.1 }]], dum: ds }, { base: false, fx(A) {
    const o = A.ahead(tC, 0.45, 0.5), e = A.ahead(tC, 5.3, 0.5);
    FX.crescent(A, { t: tC, dur: out, e: 'lin', R: 1.0, th: 0.28, arc: 2.2, roll: 0, col: C.blood, glow: C.rose, op: 1, glowOp: 0.6, path: (u) => o.clone().lerp(e, u) });
    FX.crescent(A, { t: tC + out, dur: back, e: 'in', R: 0.85, th: 0.24, arc: 2.2, roll: Math.PI, col: C.blood, glow: C.rose, op: 0.95, glowOp: 0.5, path: (u) => e.clone().lerp(A.at('chest', tC + out + back), u) });
    ds.forEach((p, i) => { const u = (p[0] - o.x) / (e.x - o.x); A.hit(i, tC + out * u, 14); FX.claw(A, { t: tC + out * u, at: { d: i, y: 0.6 }, roll: 0.2, n: 1, len: 1.5, size: 0.6 });
      const tb = tC + out + back * EASE.in(1 - u) * 0.98; A.hit(i, tb, 7); FX.drops(A, { t: tb, at: { d: i, y: 0.6 }, n: 5, to: (tt) => A.at('chest', tt), hang: 0.05, fly: 0.14, size: 0.045, sp: 0.4, up: 0.2 }); });
    A.heal(tC + out + back + 0.05, 3); FX.dust(A, { t: tC, at: A.ahead(tC, 0.4, 0), n: 8, dir: [1, 0], sp: 1.6 });
    cap(A, tC, tC + out, '一道血月刃：14', 'One blood crescent: 14'); cap(A, tC + out, 2.8, '飞回来再穿一次：一半；每个敌人回血 1', 'It flies home through them for half; 1 health for each foe'); } });
}
// F8: each dive he carries a foe up, bites it and drops it: 14, heals 5; 6 within 1.2 u where it falls
{ const ds = [[1.1, 0.2], [1.75, -0.45], [1.6, 0.85], [2.4, 0.3]]; const t0 = 0.3; const dv = [t0 + 0.7, t0 + 1.6, t0 + 2.5]; const tg = [0, 1, 2];
  const air = [[-1.2, -0.8], [2.6, -1.3], [0.2, 1.4]];
  const seq = [[t0, 'flare'], [t0 + 0.25, 'fly', { loop: true, until: dv[0] - 0.12 }]]; const root = [{ t: t0 + 0.15 }, { t: t0 + 0.55, x: air[0][0], z: air[0][1], y: 1.6, pitch: 25, e: 'out' }];
  dv.forEach((t, k) => { const p = ds[tg[k]], last = k === 2; seq.push([t - 0.12, 'streak'], [t + 0.02, 'castPlant', { from: 0.3, to: 0.5, hold: true, fade: 0.05 }], [t + 0.5, last ? 'drift' : 'fly', last ? {} : { loop: true, until: dv[k + 1] - 0.12 }]);
    root.push({ t: t - 0.12, x: air[k][0] + 0.4, z: air[k][1], y: 1.7, look: p, pitch: 25, roll: 360 * k }, { t, x: p[0] - 0.42, z: p[1], y: 0.2, pitch: 0, roll: 360 * k, e: 'in2' }, { t: t + 0.42, x: p[0] - 0.42, z: p[1], y: 1.3, pitch: 0, roll: 360 * k, e: 'out' });
    if (!last) root.push({ t: t + 0.6, x: air[k + 1][0], z: air[k + 1][1], y: 1.5, pitch: 25, roll: 360 * (k + 1), e: 'out' }); else root.push({ t: t + 1.3, x: p[0] - 1.0, z: p[1], y: 0, e: 's' }); });
  F.F8 = SA({ T: dv[2] + 1.6, cam: { x: 0.6, z: -0.6, w: 7.6, y: 0.9 }, her: H(-1.8, 0), seq, root, dum: ds }, { base: false, fx(A) {
    dv.forEach((t, k) => { const i = tg[k]; A.hit(i, t, 14, { big: true, up: 1.25 }); FX.bite(A, { t: t + 0.05, at: at3(A, i, 0.66), size: 0.55, follow: true, life: 0.45 }); FX.ring(A, { t, at: [ds[i][0], 0, ds[i][1]], r0: 0.3, r1: 1.0, dur: 0.35, col: C.rose, op: 0.6 }); A.shake(t, 0.05, 0.15);
      FX.drops(A, { t: t + 0.12, at: at3(A, i, 0.66), n: 8, to: (tt) => A.at('mouth', tt), hang: 0.06, fly: 0.2, size: 0.045, sp: 0.4, up: 0.2, seed: 80 + k }); A.heal(t + 0.45, 5);
      const tf = t + 0.42 + 0.5; FX.ring(A, { t: tf, at: [ds[i][0], 0, ds[i][1]], r0: 0.2, r1: 1.2, dur: 0.4, col: C.blood, op: 0.8, normal: true }); FX.dust(A, { t: tf, at: [ds[i][0], 0, ds[i][1]], n: 8, sp: 1.2 }); FX.drops(A, { t: tf, at: { d: i, y: 0.2 }, n: 10, sp: 1.5, up: 0.8, size: 0.05 });
      ds.forEach((p, j) => { if (j !== i && Math.hypot(p[0] - ds[i][0], p[1] - ds[i][1]) <= 1.2) A.hit(j, tf + 0.02, 6, { area: true }); }); A.hit(i, tf, 6, { area: true }); });
    FX.trail(A, { of: 'tipL', t0: t0 + 0.3, t1: dv[2], len: 0.2, w: 0.08, op: 0.35, col: C.moon }); FX.trail(A, { of: 'tipR', t0: t0 + 0.3, t1: dv[2], len: 0.2, w: 0.08, op: 0.35, col: C.moon });
    cap(A, t0 + 0.3, dv[2] + 1.0, '每次俯冲抓起一个敌人，咬：14，回血 5；摔下：1.2 u 内 6', 'Each dive: he carries one up and bites, 14, heals 5; it falls: 6 within 1.2 u'); } });
}

// ---------------------------------------------------------------- Blood
// F9: all of it comes back; the foe bleeds 8 over 3 s
F.F9 = SA(DEFS.F9, { def: { T: 3.8 }, fx(A) { const tB = 0.76; drink(A, tB + 0.3, { d: 1, y: 0.6 }, 20, { drops: 8, hang: 0.25 }); [0, 1].forEach((i) => bleed(A, i, tB + 0.05, 2, 4, 0.75)); cap(A, tB + 0.3, 3.7, '全部回血；流血 3 秒 8', 'All of it comes back; it bleeds 8 over 3 s'); } });
// F10: half the bleed comes back; when the foe falls the bleed jumps to the nearest foe
{ const d0 = [-0.45, 0], d1 = [1.1, 0.6]; const t0 = 0.3, tV = t0 + 0.44, tF = tV + 2.0;
  F.F10 = SA({ T: 5.2, cam: { x: 0.2, z: 0.1, w: 5.8 }, her: H(-1.4, 0), seq: [[t0, 'vein'], [1.4, 'idle']], dum: [d0, d1] }, { base: false, fx(A) {
    A.hit(0, tV, 10, { big: true }); FX.claw(A, { t: tV, at: { d: 0, y: 0.62 }, roll: -0.35, n: 1, len: 1.7, wid: 0.03, size: 0.6, open: 0.05, life: 2.2, bend: 0.04 }); FX.trail(A, { of: 'handR', t0: tV - 0.08, t1: tV + 0.05, len: 0.1, w: 0.06, op: 0.6 });
    A.status(0, tV, 'bleed', tF - tV, { rate: 7 });
    for (let k = 1; k <= 4; k++) { const tk = tV + 0.5 * k; A.hit(0, tk, 3, { col: TICK, noCombo: true, fell: k === 4 }); FX.drops(A, { t: tk, at: { d: 0, y: 0.6 }, n: 3, to: (tt) => A.at('mouth', tt), hang: 0.08, fly: 0.25, size: 0.045, sp: 0.5, up: 0.3, seed: 90 + k }); A.heal(tk + 0.35, 1.5); }
    FX.thread(A, { t0: tF, t1: tF + 0.35, from: { d: 0, y: 0.6 }, to: { d: 1, y: 0.6 }, w: 0.04, per: 0.2 }); FX.claw(A, { t: tF + 0.25, at: { d: 1, y: 0.62 }, roll: -0.35, n: 1, len: 1.5, wid: 0.03, size: 0.55, open: 0.05, life: 2.3, bend: 0.04 });
    A.status(1, tF + 0.25, 'bleed', 2.2, { rate: 7 }); for (let k = 1; k <= 4; k++) { const tk = tF + 0.25 + 0.5 * k; A.hit(1, tk, 3, { col: TICK, noCombo: true }); FX.drops(A, { t: tk, at: { d: 1, y: 0.6 }, n: 3, to: (tt) => A.at('mouth', tt), hang: 0.08, fly: 0.3, size: 0.045, sp: 0.5, up: 0.3, seed: 95 + k }); A.heal(tk + 0.4, 2); }
    cap(A, tV + 0.2, tF - 0.05, '流血一半回血', 'Half the bleed comes back'); cap(A, tF, 5.1, '它倒下：流血跳到最近的敌人', 'It falls: the bleed jumps to the nearest foe'); } });
}
// F11: a thread from every foe: 2 each, up to 10; it ends in a pool, 1.2 u, 3 s: 4 each half second
{ const ds = [[-0.2, 0.05], [1.2, -0.1], [2.6, 0.1], [3.9, 0.6], [4.5, -0.5]]; const t0 = 0.3, tT = t0 + 0.7; const pc = [4.3, 0, 0];
  F.F11 = SA(DEFS.F11, { def: { T: 4.6, dum: ds, cam: { x: 1.2, z: 0, w: 7.6 } }, fx(A) {
    [1, 2].forEach((i) => { const th0 = tT + 0.08 + 0.04 * i; FX.thread(A, { t0: th0, t1: th0 + 1.0, from: { d: i, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.025, per: 0.3 }); A.heal(th0 + 0.35, 2); });
    [3, 4].forEach((i) => { A.hit(i, tT + 0.28, 14); FX.claw(A, { t: tT + 0.28, at: { d: i, y: 0.6 }, roll: 1.5, n: 1, len: 1.1, size: 0.5 }); const th0 = tT + 0.3; FX.thread(A, { t0: th0, t1: th0 + 1.0, from: { d: i, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.025, per: 0.3 }); A.heal(th0 + 0.4, 2); });
    const tp = tT + 0.3; pool(A, tp, pc, 1.2, 3.0); FX.drops(A, { t: tp, at: [pc[0], 0.3, pc[2]], n: 14, sp: 1.5, up: 0.6, size: 0.06 });
    [3, 4].forEach((i) => { for (let k = 1; k <= 6; k++) A.hit(i, tp + 0.5 * k, 4, { col: TICK, area: true, noCombo: true }); });
    cap(A, tT + 0.1, tp + 0.8, '每个敌人一条血线：各 2', 'A thread from every foe: 2 each'); cap(A, tp + 0.8, 4.5, '尽头一滩血，1.2 u，3 秒：每半秒 4', 'It ends in a pool, 1.2 u, 3 s: 4 each half second'); } });
}
// F12: 1.8 u wide, half comes back; at the end the bats fly home: heals 6
{ const ds = [[1.1, 0.2], [1.6, -0.35], [1.5, 0.75], [2.2, -0.9], [0.6, 1.2]]; const t0 = 0.3, tS = t0 + 0.42, c = [1.45, 0.2], tE = tS + 4.0;
  F.F12 = SA({ T: 5.6, cam: { x: 0.3, z: 0, w: 6.6 }, her: H(-1.7, 0), seq: [[t0, 'flare'], [t0 + 0.5, 'idle'], [tE + 0.05, 'flare']], dum: ds }, { base: false, fx(A) {
    FX.blink(A, { t: t0 + 0.12, dur: 0.32, from: A.body(t0, 0.1), to: [c[0], 0.5, c[1]], n: 14, size: 1.5, puff: false });
    FX.swarm(A, { t0: tS, t1: tE, at: [c[0], 0.1, c[1]], r: 1.8, n: 34, h: 1.0, w: 3.2, both: true, size: 1.7 });
    FX.disc(A, { t: tS, at: [c[0], 0, c[1]], r0: 1.7, r1: 1.8, dur: 4.0, hold: true, col: '#7A1424', op: 0.35, normal: true });
    ds.forEach((p, i) => { A.status(i, tS, 'slow', 4.0); for (let s = 1; s <= 4; s++) A.hit(i, tS + s - 0.02 * i, 5, { col: TICK, area: true }); });
    for (let s = 1; s <= 4; s++) { A.heal(tS + s + 0.15, 12); FX.drops(A, { t: tS + s - 0.25, at: [c[0], 0.6, c[1]], n: 6, to: (t) => A.at('mouth', t), hang: 0.1, fly: 0.3, size: 0.045, sp: 0.8 }); }
    FX.blink(A, { t: tE, dur: 0.35, from: [c[0], 0.5, c[1]], to: A.body(tE + 0.35, 0.5), n: 16, size: 1.5, puff: false }); A.heal(tE + 0.4, 6);
    cap(A, tS + 0.2, tE, '1.8 u 宽，一半回血', '1.8 u wide, half comes back'); cap(A, tE, 5.5, '蝙蝠飞回来：回血 6', 'The bats fly home: 6 health'); } });
}
// F13: the spikes stand 3 s: a foe that touches them takes 4 and bleeds; then they melt and flow back: 1 health for each foe hit
{ const ds = [[0.0, 0.25], [1.3, -0.25], [2.6, 0.1], [1.9, 1.3]]; const t0 = 0.3, tS = t0 + 0.36, tM = tS + 3.0;
  F.F13 = SA({ ...DEFS.F13, T: 4.9, dum: ds }, { base: false, fx(A) { const o = A.ahead(tS, 0.5, 0), f = A.fwd(tS); A.shake(tS, 0.06, 0.2); FX.ring(A, { t: tS, at: o, r0: 0.1, r1: 0.7, dur: 0.3, col: C.blood, op: 0.7, normal: true }); FX.dust(A, { t: tS, at: o, n: 6 });
    for (let i = 0; i < 13; i++) { const u = i / 12, d = 0.15 + u * 4.85, ts = tS + 0.02 + u * 0.32; for (const s of [-1, 1]) { const sx = (i % 2 ? 0.2 : 0.32) * s; FX.spike(A, { t: ts, at: [o.x + f.x * d - f.z * sx, 0, o.z + f.z * d + f.x * sx], h: 0.35 + 0.65 * u, w: 0.8 + 0.6 * u, life: tM - ts + 0.3, tilt: [0, s * 0.25], burst: i % 3 === 0 }); } }
    [0, 1, 2].forEach((i) => { const u = (ds[i][0] - o.x - 0.15) / 4.85; A.hit(i, tS + 0.02 + u * 0.32, 16, { up: 0.9 }); });
    A.move(3, tS + 0.6, [0, -1.05], 0.8, 's'); A.hit(3, tS + 1.35, 4); bleed(A, 3, tS + 1.35, 2, 3, 0.6);
    FX.disc(A, { t: tM, at: [o.x + f.x * 2.5, 0, o.z + f.z * 2.5], r0: 0.4, r1: 0.6, dur: 0.5, col: '#7A1424', op: 0.5, normal: true });
    for (let k = 0; k < 4; k++) FX.drops(A, { t: tM + 0.05 * k, at: [o.x + f.x * (1 + 1.2 * k), 0.15, o.z + f.z * (1 + 1.2 * k)], n: 5, to: (t) => A.at('chest', t), hang: 0.15, fly: 0.35, size: 0.05, sp: 0.4, up: 0.2, seed: 110 + k });
    A.heal(tM + 0.6, 4);
    cap(A, tS + 0.4, tM, '血棘立 3 秒：碰到的敌人 4，流血', 'The spikes stand 3 s: a foe that touches them takes 4 and bleeds'); cap(A, tM, 4.8, '融化流回来：每个打中的敌人回血 1', 'They melt and flow back: 1 health for each foe hit'); } });
}
// F14: 2.5 s, and all it deals comes back
{ const ds = [[0.2, -0.45], [0.75, 0.55], [1.4, -0.1], [2.3, 0.4]]; const t0 = 0.3, t1 = t0 + 0.16, t2 = t1 + 2.5;
  F.F14 = SA({ T: 4.4, cam: { x: 0.4, z: 0, w: 6.6 }, her: H(-1.3, 0), seq: [[t0, 'wrap'], [t2, 'cape', { from: 0.0 }]], root: [{ t: t1 }, { t: t2, fw: 3.4, e: 'lin' }], hide: [[t1, t2]], dum: ds }, { base: false, fx(A) {
    FX.mist(A, { t0: t1 - 0.05, t1: t2 + 0.1, at: (t) => A.body(t, 0), r: 1.0, n: 30, h: 1.0, op: 0.55 });
    ds.forEach((p, i) => { for (let s = 0; s < 5; s++) { const ts = t1 + 0.25 + 0.5 * s; const r = A.rootAt(ts); if (Math.hypot(p[0] - r.x, p[1] - r.z) < 1.15) { A.hit(i, ts + 0.03 * i, 4, { col: TICK, area: true }); A.status(i, ts, 'slow', 0.6); A.heal(ts + 0.3, 4); FX.drops(A, { t: ts + 0.04, at: { d: i, y: 0.6 }, n: 4, to: (t) => A.body(t, 0.5), hang: 0.05, fly: 0.2, size: 0.045, sp: 0.3, up: 0.2, seed: 120 + i * 7 + s }); } } });
    cap(A, t1, t2, '2.5 秒，伤害全部回血', '2.5 s, and all it deals comes back');
    FX.smoke(A, { t: t2 - 0.05, at: (t) => A.body(t2, 0.3), n: 8, r: 0.3, size: 0.4, dur: 0.5, op: 0.5, col: '#7A1424', col2: C.rose }); } });
}
// F15: each basic hit heals him 2
F.F15 = SA(DEFS.F15, { fx(A) { const tA = 1.35, sp = 1.4; [0.10, 0.24, 0.46, 0.62 + 0.10, 0.62 + 0.24, 0.62 + 0.46].forEach((x, i) => { const t = tA + x / sp; A.heal(t + 0.2, 2); FX.drops(A, { t: t + 0.02, at: { d: 0, y: 0.6 }, n: 3, to: (tt) => A.at('mouth', tt), hang: 0.05, fly: 0.15, size: 0.045, sp: 0.3, up: 0.2, seed: 130 + i }); });
  cap(A, tA, 3.3, '每一下普攻回血 2', 'Each basic hit heals him 2'); } });
// F16: all of it comes back; the moon hangs 4 s and drinks: 3 a second from each foe under it
{ const t0 = 0.3, tC = t0 + 1.15; const ds = DEFS.F16.dum;
  F.F16 = SA(DEFS.F16, { hp: 40, caps: false, def: { T: tC + 4.4 }, fx(A) {
    FX.moon(A, { t0: tC + 1.55, t1: tC + 4.1, at: (t) => { const r = A.rootAt(t); return [r.x, 1.9 + r.y * 0.4, r.z - 1.0]; }, r: 0.85, grow: 0.01, op: 0.92 });
    A.heal(tC + 0.62, 117, { big: true });
    for (let s = 1; s <= 4; s++) { const ts = tC + 0.1 + s; ds.forEach((p, i) => { A.hit(i, ts + 0.01 * i, 3, { col: TICK, area: true, noCombo: true }); FX.drops(A, { t: ts, at: { d: i, y: 0.7 }, n: 2, to: (t) => { const r = A.rootAt(t); return [r.x, 1.9, r.z - 1.0]; }, hang: 0.1, fly: 0.35, size: 0.045, sp: 0.3, up: 0.4, seed: 140 + i + 9 * s }); }); A.heal(ts + 0.5, 18); }
    cap(A, tC + 0.2, tC + 1.2, '6 个敌人 × 30，全部回血', '6 foes × 30, all of it comes back'); cap(A, tC + 1.2, tC + 4.3, '红月挂 4 秒：每秒从每个敌人吸 3', 'The moon hangs 4 s and drinks 3 a second from each foe'); } });
}

// ---------------------------------------------------------------- Night
// F17: the landing leaves a pool of blood, 1.5 u, 3 s: 4 each half second, and all of it comes back
{ const tL = 0.86; const ds = DEFS.F17.dum;
  F.F17 = SA(DEFS.F17, { def: { T: 4.4 }, fx(A) { const r = A.rootAt(tL); pool(A, tL + 0.05, [r.x, 0, r.z], 1.5, 3.0);
    ds.forEach((p, i) => { for (let k = 1; k <= 6; k++) { const tk = tL + 0.05 + 0.5 * k; A.hit(i, tk + 0.01 * i, 4, { col: TICK, area: true, noCombo: true }); } });
    for (let k = 1; k <= 6; k++) { const tk = tL + 0.05 + 0.5 * k; A.heal(tk + 0.3, 16); FX.drops(A, { t: tk, at: [r.x, 0.1, r.z], n: 6, to: (t) => A.at('chest', t), hang: 0.08, fly: 0.25, size: 0.045, sp: 1.6, up: 0.2, seed: 150 + k }); }
    cap(A, tL + 0.1, 4.3, '落地留下一滩血，1.5 u，3 秒：每半秒 4，全部回血', 'A pool of blood where he lands, 1.5 u, 3 s: 4 each half second, all back'); } });
}
// F18: he tears the claw out: 6 to the foes within 1.5 u, heals 6
{ const d0 = [1.2, 0]; const ds = [d0, [1.8, 0.9], [2.0, -0.8], [0.7, 1.0]]; const t0 = 0.3, tB = t0 + 0.2, tS = tB + 0.13, tO = tS + 0.5;
  F.F18 = SA(DEFS.F18, { def: { T: 2.9, dum: ds, seq: [[t0, 'standFace'], [tB + 0.08, 'stab', { fade: 0.02 }], [tO - 0.08, 'clawR', { from: 0.12, speed: 0.8, fade: 0.04 }]] }, fx(A) {
    FX.drops(A, { t: tO, at: { d: 0, y: 0.6 }, n: 18, sp: 2.4, up: 0.8, size: 0.06 }); FX.ring(A, { t: tO, at: [d0[0], 0.4, d0[1]], r0: 0.2, r1: 1.5, dur: 0.35, col: C.blood, op: 0.9 });
    ds.forEach((p, i) => { if (Math.hypot(p[0] - d0[0], p[1] - d0[1]) <= 1.5) A.hit(i, tO + 0.03 + 0.01 * i, 6, { area: true }); }); A.heal(tO + 0.35, 6); A.shake(tO, 0.04, 0.12);
    cap(A, tO, 2.8, '拔出爪子：1.5 u 内各 6，回血 6', 'He tears the claw out: 6 within 1.5 u, heals 6'); } });
}
// F19: the puff is blood bats: 4 a second, and all of it comes back
{ const d0 = [0.25, 0]; const t0 = 0.4;
  F.F19 = SA(DEFS.F19, { base: false, fx(A) { const p = A.body(t0 + 0.2, 0.1); FX.blink(A, { t: t0 + 0.2, dur: 0.12, from: A.body(t0 + 0.2, 0.4), to: A.body(t0 + 0.34, 0.4), puff: false });
    FX.swarm(A, { t0: t0 + 0.2, t1: t0 + 2.2, at: [p.x, 0.1, p.z], r: 0.6, n: 18, h: 0.9, w: 3.0, both: true, size: 1.5 }); FX.mist(A, { t0: t0 + 0.2, t1: t0 + 2.2, at: [p.x, 0, p.z], r: 0.6, n: 12, h: 0.8, op: 0.35, bats: false });
    bolt(A, { t: t0 - 0.1, d: 0, dur: 0.45, to: [-1.0, 0.6, 0] });
    for (let s = 0; s < 2; s++) { const ts = t0 + 0.6 + s; A.hit(0, ts, 4, { col: TICK, area: true }); A.heal(ts + 0.4, 4); FX.drops(A, { t: ts, at: { d: 0, y: 0.6 }, n: 5, to: (t) => A.at('chest', t), hang: 0.08, fly: 0.3, size: 0.045, sp: 0.4, up: 0.3, seed: 160 + s }); }
    cap(A, t0 + 0.3, t0 + 2.3, '血蝙蝠 2 秒：每秒 4，全部回血', 'Blood bats, 2 s: 4 a second, all of it back'); } });
}
// F20: blinded foes bleed 8 over 2 s; half comes back
{ const tC = 0.9; const ds = DEFS.F20.dum;
  F.F20 = SA(DEFS.F20, { fx(A) { ds.forEach((p, i) => bleed(A, i, tC + 0.1, 2, 4, 0.5, 2.0));
    for (let k = 1; k <= 4; k++) { const tk = tC + 0.1 + 0.5 * k; A.heal(tk + 0.3, 6); }
    cap(A, tC + 0.3, 3.3, '致盲的敌人流血：2 秒 8，一半回血', 'Blinded foes bleed 8 over 2 s; half comes back'); } });
}
// F21: for those 3 s each of his hits on them heals him 2
F.F21 = SA(DEFS.F21, { fx(A) { [2.1, 2.6].forEach((t, k) => { A.heal(t + 0.25, 2); FX.drops(A, { t: t + 0.02, at: { d: 1, y: 0.6 }, n: 4, to: (tt) => A.at('mouth', tt), hang: 0.05, fly: 0.18, size: 0.045, sp: 0.3, up: 0.2, seed: 170 + k }); });
  cap(A, 2.0, 3.3, '3 秒内他打它们每一下回血 2', 'For those 3 s each of his hits on them heals him 2'); } });
// F22: when the shield ends, what is left of it heals him (two bolts take 12 of the 18; the 6 left comes back)
{ const ds = [[-0.4, 0.4], [-0.35, -0.5], [1.8, 0.2]]; const t0 = 0.3, tC = t0 + 0.2, tE = tC + 3.0; const hits = [tC + 0.8, tC + 1.6];
  F.F22 = SA({ ...DEFS.F22, T: 4.4 }, { base: false, fx(A) {
    FX.shield(A, { t0: tC, t1: tE, r: 0.7, op: 0.45, hits }); FX.ring(A, { t: tC, at: 'him', r0: 0.2, r1: 1.2, dur: 0.35, col: C.plum, op: 0.8, normal: true });
    FX.smoke(A, { t: tC, at: A.body(tC, 0), n: 14, r: 0.9, h: 0.6, size: 0.4, dur: 0.6, op: 0.6 }); [0, 1].forEach((i) => A.hit(i, tC + 0.06, 8));
    hits.forEach((h) => { bolt(A, { t: h - 0.4, d: 2, dur: 0.4, to: (() => { const p = A.body(h, 0.6); return [p.x + 0.55, p.y, p.z]; })() }); A.say(h, '-6', { col: C.shield }); });
    A.post((t, x, W, H2, k, lang) => { if (t < tC || t > tE) return; const left = Math.max(0, 18 - 6 * hits.filter((h) => h <= t).length); x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.shield; x.fillText((lang === 'en' ? 'Shield ' : '护盾 ') + left, W - 14 * k, 28 * k); });
    FX.ring(A, { t: tE, at: 'him', r0: 0.7, r1: 0.2, dur: 0.3, col: C.shield, op: 0.8 }); FX.drops(A, { t: tE - 0.05, at: (t) => A.body(t, 0.5), n: 10, to: (t) => A.at('chest', t), hang: 0.1, fly: 0.15, size: 0.05, sp: 0.8, up: 0.3 });
    A.heal(tE + 0.2, 6); cap(A, tC + 0.1, tE, '护盾 18，3 秒', 'A shield of 18 for 3 s'); cap(A, tE, 4.3, '护盾结束：剩下的 6 回血', 'The shield ends: the 6 left heals him'); } });
}
// F23: on the return he gets back half the health he lost since
{ const t0 = 0.3, tH = t0 + 0.32, tR = 2.7;
  F.F23 = SA(DEFS.F23, { hp: 80, def: { dum: [...DEFS.F23.dum, [2.4, 1.2]] }, hurt: [[1.2, 10], [2.0, 10]], fx(A) {
    [1.2, 2.0].forEach((h) => { bolt(A, { t: h - 0.35, d: 2, dur: 0.35, to: (() => { const p = A.body(h, 0.6); return [p.x, p.y, p.z]; })() }); A.say(h, '-10', { col: '#E0303A' }); });
    const spot = A.rootAt(tH); FX.drops(A, { t: tR + 0.12, at: [spot.x, 0.9, spot.z], n: 12, to: (t) => A.at('chest', t), hang: 0.12, fly: 0.2, size: 0.05, sp: 0.6, up: 0.3 }); A.heal(tR + 0.4, 10);
    cap(A, tR - 0.1, 3.9, '回到影子：拿回一半失去的血（20 → 10）', 'Back at the shade: half the health lost since comes back (20 → 10)'); } });
}
// F24: half the tear comes back
{ const tUp = 0.3 + 0.4 + 0.35, tear = tUp + 0.4 + 3.0; const stored = Math.round(0.35 * (12 + 14 + 14 + 14));
  F.F24 = SA(DEFS.F24, { def: { T: 5.4 }, fx(A) { drink(A, tear + 0.05, { d: 0, y: 0.62 }, Math.round(stored / 2), { drops: 16, hang: 0.3, fly: 0.3 }); FX.thread(A, { t0: tear + 0.02, t1: tear + 0.8, from: { d: 0, y: 0.62 }, to: (t) => A.at('mouth', t), w: 0.04 });
    cap(A, tear + 0.3, 5.3, '撕开的一半回血：' + Math.round(stored / 2), 'Half the tear comes back: ' + Math.round(stored / 2)); } });
}

// ================================================================ Kesh's picks (19 Nov, "use those"): these replace the forms above (R9a, R10a, R12a, R12b, DUSKWING_NEW_OPTIONS.md)
// each is shown beside the passed form; the passed form above is unchanged
const N = FORMS.sa2;
// R9a F12: as passed, but at the end the bats fall as a blood pool, 1.5 u, 3 s; he heals while he stands in it: 3 each half second, up to 18
{ const ds = [[1.1, 0.2], [1.6, -0.35], [1.5, 0.75], [2.2, -0.9], [0.6, 1.2]]; const t0 = 0.3, tS = t0 + 0.42, c = [1.45, 0.2], tE = tS + 4.0, tP = tE + 0.05, tIn = tE + 0.5;
  N.F12 = SA({ T: tP + 3.4, cam: { x: 0.3, z: 0, w: 6.6 }, her: H(-1.7, 0), seq: [[t0, 'flare'], [t0 + 0.5, 'idle'], [tE + 0.02, 'run', { loop: true, until: tIn, fade: 0.1 }], [tIn, 'idle', { fade: 0.2 }]],
    root: [{ t: tE + 0.02 }, { t: tIn, x: c[0] - 0.35, z: c[1] - 0.1, look: [3, 0.2], e: 's' }], dum: ds }, { base: false, hp: 30, fx(A) {
    FX.blink(A, { t: t0 + 0.12, dur: 0.32, from: A.body(t0, 0.1), to: [c[0], 0.5, c[1]], n: 14, size: 1.5, puff: false });
    FX.swarm(A, { t0: tS, t1: tE, at: [c[0], 0.1, c[1]], r: 1.8, n: 34, h: 1.0, w: 3.2, both: true, size: 1.7 });
    FX.disc(A, { t: tS, at: [c[0], 0, c[1]], r0: 1.7, r1: 1.8, dur: 4.0, hold: true, col: '#7A1424', op: 0.35, normal: true });
    ds.forEach((p, i) => { A.status(i, tS, 'slow', 4.0); for (let s = 1; s <= 4; s++) A.hit(i, tS + s - 0.02 * i, 5, { col: TICK, area: true }); });
    for (let s = 1; s <= 4; s++) { A.heal(tS + s + 0.15, 12); FX.drops(A, { t: tS + s - 0.25, at: [c[0], 0.6, c[1]], n: 6, to: (t) => A.at('mouth', t), hang: 0.1, fly: 0.3, size: 0.045, sp: 0.8 }); }
    // the bats fall: a rain of blood that lands as a pool
    FX.drops(A, { t: tE - 0.05, at: [c[0], 1.1, c[1]], n: 40, sp: 1.4, up: -0.5, size: 0.06, dur: 0.5, spread: 0.8 }); FX.smoke(A, { t: tE - 0.05, at: [c[0], 0.7, c[1]], n: 10, r: 1.0, h: 0.5, size: 0.4, dur: 0.35, op: 0.45 });
    pool(A, tP, [c[0], 0, c[1]], 1.5, 3.0);
    for (let k = 1; k <= 6; k++) { const tk = tP + 0.5 * k - 0.02; A.heal(tk, 3); FX.drops(A, { t: tk - 0.25, at: A.body(tIn, 0.05), n: 3, to: (t) => A.at('chest', t), hang: 0.04, fly: 0.2, size: 0.04, sp: 0.3, up: 0.6, spread: 0.4, seed: 300 + k }); }
    cap(A, tS + 0.2, tE, '1.8 u 宽，一半回血', '1.8 u wide, half comes back'); cap(A, tE, tIn + 0.2, '蝙蝠落下成一滩血，1.5 u，3 秒', 'The bats fall as a pool of blood, 1.5 u, 3 s');
    cap(A, tIn + 0.2, tP + 3.3, '他站在里面回血：每半秒 3，最多 18', 'He heals while he stands in it: 3 each half second, up to 18'); } });
}
// R10a F8: each dive plucks a foe up and hangs it in the air; at the end all are pulled together over one spot, he bites through them in one pass: 14 each, heals 5 each; they fall together: 10 within 1.5 u
{ const ds = [[1.1, 0.2], [1.75, -0.45], [1.6, 0.85], [2.4, 0.3]]; const t0 = 0.3; const dv = [t0 + 0.7, t0 + 1.55, t0 + 2.4]; const X = [1.55, 0.15];
  const tGa = dv[2] + 0.55, tBi = tGa + 0.6, tF = tBi + 0.2, tL = tF + 0.16; const air = [[-1.2, -0.8], [2.6, -1.3], [0.2, 1.4]]; const P0 = [X[0] - 1.9, X[1] - 0.25], P1 = [X[0] + 1.6, X[1] + 0.25];
  const seq = [[t0, 'flare'], [t0 + 0.25, 'fly', { loop: true, until: dv[0] - 0.12 }]]; const root = [{ t: t0 + 0.15 }, { t: t0 + 0.55, x: air[0][0], z: air[0][1], y: 1.6, pitch: 25, e: 'out' }];
  dv.forEach((t, k) => { const p = ds[k], last = k === 2; seq.push([t - 0.12, 'streak'], [t + 0.02, 'pull'], [t + 0.42, 'fly', { loop: true, until: last ? tBi - 0.16 : dv[k + 1] - 0.12 }]);
    root.push({ t: t - 0.12, x: air[k][0] + 0.4, z: air[k][1], y: 1.7, look: p, pitch: 25, roll: 360 * k }, { t, x: p[0] - 0.42, z: p[1], y: 0.2, pitch: 0, roll: 360 * k, e: 'in2' }, { t: t + 0.42, x: p[0] - 0.5, z: p[1] - 0.2, y: 1.6, pitch: 20, roll: 360 * k, e: 'out' });
    if (!last) root.push({ t: t + 0.6, x: air[k + 1][0], z: air[k + 1][1], y: 1.5, pitch: 25, roll: 360 * (k + 1), e: 'out' }); });
  seq.push([tBi - 0.16, 'streak'], [tBi + 0.2, 'pull'], [tBi + 0.5, 'drift'], [tL + 0.9, 'idle', { fade: 0.2 }]);
  root.push({ t: tBi - 0.16, x: P0[0], z: P0[1], y: 1.45, look: X, pitch: 20, roll: 720 }, { t: tBi + 0.2, x: P1[0], z: P1[1], y: 1.35, pitch: 20, roll: 720, e: 'lin' }, { t: tL + 0.6, x: P1[0] + 0.3, z: P1[1], y: 0, pitch: 0, look: X, roll: 720, e: 's' });
  N.F8 = SA({ T: tL + 1.3, cam: { x: 0.8, z: -0.4, w: 7.8, y: 1.0 }, her: H(-1.8, 0), seq, root, dum: ds }, { base: false, hp: 50, fx(A) {
    const off = [[-0.12, 0.12], [0.14, -0.06], [-0.02, -0.16]];
    dv.forEach((t, k) => { A.hit(k, t, null, { big: true }); A.launch(k, t, 1.3); FX.ring(A, { t, at: [ds[k][0], 0, ds[k][1]], r0: 0.3, r1: 1.0, dur: 0.35, col: C.rose, op: 0.6 }); A.shake(t, 0.04, 0.12); FX.dust(A, { t, at: [ds[k][0], 0, ds[k][1]], n: 6, sp: 1.0 });
      for (let tt = t + 0.34; tt < tF - 0.05; tt += 0.15) A.launch(k, tt, 0.05);
      FX.swarm(A, { t0: t + 0.3, t1: tF, at: (tt) => A.dpt(k, tt, 0.65), r: 0.42, n: 6, h: 0.5, w: 4, size: 1.0, both: true, seed: 60 + k });
      A.moveTo(k, tGa, [X[0] + off[k][0], X[1] + off[k][1]], 0.45, 's'); });
    FX.ring(A, { t: tGa + 0.1, at: [X[0], 1.9, X[1]], r0: 1.4, r1: 0.3, dur: 0.45, col: C.blood, op: 0.7, e: 'in' });
    [0, 1, 2].forEach((k) => { const tb = tBi + 0.06 + 0.04 * k; A.hit(k, tb, 14, { big: k === 1 }); FX.bite(A, { t: tb, at: at3(A, k, 0.66), size: 0.5, follow: true, life: 0.4 }); A.heal(tb + 0.4, 5);
      FX.drops(A, { t: tb + 0.02, at: at3(A, k, 0.66), n: 6, to: (tt) => A.at('mouth', tt), hang: 0.04, fly: 0.2, size: 0.045, sp: 0.4, up: 0.2, seed: 80 + k }); A.launch(k, tF, -1); });
    FX.trail(A, { of: 'chest', t0: tBi - 0.16, t1: tBi + 0.2, len: 0.14, w: 0.34, col: C.blood, op: 0.6 }); A.shake(tBi + 0.1, 0.06, 0.18);
    FX.ring(A, { t: tL, at: [X[0], 0, X[1]], r0: 0.2, r1: 1.5, dur: 0.45, col: C.blood, op: 0.85, normal: true }); FX.dust(A, { t: tL, at: [X[0], 0, X[1]], n: 14, sp: 1.6 }); FX.drops(A, { t: tL, at: [X[0], 0.2, X[1]], n: 16, sp: 1.6, up: 0.9, size: 0.05 }); A.shake(tL, 0.08, 0.25);
    ds.forEach((p, i) => { const q = i < 3 ? [X[0] + off[i][0], X[1] + off[i][1]] : p; if (Math.hypot(q[0] - X[0], q[1] - X[1]) <= 1.5) A.hit(i, tL + 0.02 + 0.01 * i, 10, { area: true }); });
    FX.trail(A, { of: 'tipL', t0: t0 + 0.3, t1: tBi + 0.2, len: 0.2, w: 0.08, op: 0.35, col: C.moon }); FX.trail(A, { of: 'tipR', t0: t0 + 0.3, t1: tBi + 0.2, len: 0.2, w: 0.08, op: 0.35, col: C.moon });
    cap(A, t0 + 0.3, tGa, '每次俯冲抓起一个敌人，挂在空中', 'Each dive plucks a foe up and hangs it in the air'); cap(A, tGa, tF, '全部拉到一处，一次咬穿：各 14，各回血 5', 'All pulled over one spot; he bites through them in one pass: 14 each, heals 5 each');
    cap(A, tF, tL + 1.2, '一起摔下：1.5 u 内 10。精英在地上被咬', 'They fall together: 10 within 1.5 u. Champions are bitten on the floor'); } });
}
// R12a F3: as passed, and when a bleed from the ring runs out it jumps once to the nearest foe within 2 u that is not bleeding: 6 over 3 s again
{ const t0 = 0.3, t1 = t0 + 0.95; const ds = [...DEFS.F3.dum, [3.0, 1.2], [2.4, -1.5], [4.6, 0.7]];
  const tR = t1 - 0.05; let tJ = 0;
  N.F3 = SA(DEFS.F3, { def: { T: 8.2, dum: ds, cam: { x: 1.0, z: 0, w: 7.6 } }, fx(A) { const c = A.body(tR, 0);
    FX.ring(A, { t: tR, at: [c.x, 0.5, c.z], r0: 0.4, r1: 2.6, dur: 0.4, col: C.blood, op: 0.95, w: 0.22 }); FX.ring(A, { t: tR + 0.04, at: [c.x, 0, c.z], r0: 0.3, r1: 2.6, dur: 0.45, col: '#7A1424', op: 0.6, normal: true });
    FX.drops(A, { t: tR, at: [c.x, 0.5, c.z], n: 24, sp: 4.0, up: 0.5, size: 0.06, dur: 0.6 });
    const ends = []; ds.forEach((p, i) => { const d = Math.hypot(p[0] - c.x, p[1] - c.z); if (d <= 2.7) { const th = tR + 0.4 * d / 2.6; A.hit(i, th, 4, { col: '#F2B8C0', area: true }); bleed(A, i, th, 2, 3, 1.0); ends.push([i, th + 3.0]); } });
    // the first bleed to run out with a clean foe within 2 u jumps to it, once
    const clean = 5; let from = -1; ends.sort((a, b) => a[1] - b[1]); for (const [i, te] of ends) if (Math.hypot(ds[i][0] - ds[clean][0], ds[i][1] - ds[clean][1]) <= 2.0) { from = i; tJ = te; break; }
    if (from >= 0) { FX.thread(A, { t0: tJ, t1: tJ + 0.35, from: { d: from, y: 0.6 }, to: { d: clean, y: 0.6 }, w: 0.04, per: 0.2 }); FX.drops(A, { t: tJ, at: { d: from, y: 0.6 }, n: 8, to: (t) => A.dpt(clean, t, 0.6), hang: 0.02, fly: 0.3, size: 0.05, sp: 0.4 });
      FX.ring(A, { t: tJ + 0.3, at: { d: clean, y: 0.6 }, r0: 0.1, r1: 0.6, dur: 0.3, col: C.blood, op: 0.8 }); bleed(A, clean, tJ + 0.3, 2, 3, 1.0);
      A.post((t, x, W, H2, k, lang) => { if (t < tJ - 0.6 || t > tJ + 3.4) return; x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.blood; x.fillText(lang === 'en' ? (t < tJ ? 'Bleed running out' : 'Jumped (once)') : (t < tJ ? '流血快结束' : '跳了（一次）'), W - 14 * k, 28 * k); });
      cap(A, tJ - 0.6, tJ + 0.3, '流血结束时，跳一次到 2 u 内最近的没流血的敌人', 'As a bleed runs out it jumps once to the nearest foe within 2 u that is not bleeding'); cap(A, tJ + 0.3, 8.1, '又流血 3 秒 6', 'Bleeding 6 over 3 s again'); }
    cap(A, tR, tJ - 0.6, '翼尖甩出血环，2.6 u：4，流血 3 秒 6', 'A ring of blood off the wing tips, 2.6 u: 4, bleeding 6 over 3 s'); } });
}
// R12b F20: no bleed: a red thread from each blinded foe to him for 2 s, drinking: 3 a second each, all of it comes back
{ const tC = 0.9; const ds = DEFS.F20.dum;
  N.F20 = SA(DEFS.F20, { def: { T: 3.6 }, hp: 40, fx(A) {
    ds.forEach((p, i) => { FX.thread(A, { t0: tC + 0.15 + 0.02 * i, t1: tC + 2.1, from: { d: i, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.022, per: 0.35 }); for (const s of [1, 2]) A.hit(i, tC + 0.1 + s + 0.02 * i, 3, { col: TICK, area: true, noCombo: true }); });
    for (const s of [1, 2]) A.heal(tC + 0.1 + s + 0.3, 3 * ds.length);
    cap(A, tC + 0.3, 3.5, '不流血：每个致盲的敌人一条血线连到他，2 秒，每秒各 3，全部回血', 'No bleed: a red thread from each blinded foe to him, 2 s, 3 a second each, all of it comes back'); } });
}
// the picks are the styles now
Object.assign(F, N);
