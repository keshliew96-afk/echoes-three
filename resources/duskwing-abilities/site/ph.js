// Phantom 影袭 forms: he is not seen, and every hit from behind lands. T3: a backstab is a sure crit (×1.5, shown with !)
// and ignores half the foe's defence; Unseen shows him as dark glass (def.unseen) with a tag top right.
// PH() wraps a base clip: hits marked back become crits, and the Unseen tag follows def.unseen.
import { FX, C, EASE, clamp, lerp } from './dw.js';
import { DEFS, FORMS, H, D2R, around, comboHud, countAt, keysHud, bolt, claw, drink, at3, fan, font, pointer, allyTag, allyShot, hawkK, hawkRoot, hawkGrab, drag, hawkFling, cloakK, cloakRoot, cloakFx } from './defs.js';
const F = FORMS.ph;
const behind = (d, from, r = 0.62) => { const dx = d[0] - from[0], dz = d[1] - from[1], l = Math.hypot(dx, dz) || 1; return [d[0] + dx / l * r, d[1] + dz / l * r]; };
const cap = (A, a, b, zh, en) => A.cap(a, b, zh, en);

// o: def (overrides), base (run base fx), caps (keep base captions), fx (more)
// a hit with back: true is a backstab: Night Hunt's 20%, then a sure crit ×1.5 (n × 1.8, shown with !)
function PH(base, o = {}) {
  const def = { ...base, ...(o.def || {}) };
  def.fx = (A) => {
    const h0 = A.hit.bind(A), cap0 = A.cap.bind(A); let inBase = false; // base clips already add the 20%
    A.hit = (i, t, n, oo = {}) => { if (n != null && typeof n === 'number' && oo.back && !oo.noCrit) { const m = Math.round(n * (inBase ? 1 : 1.2) * 1.5); return h0(i, t, m, { ...oo, crit: true, col: oo.col || C.rose }); } return h0(i, t, n, oo); };
    if (o.base !== false && base.fx) { if (o.caps === false) A.cap = () => {}; inBase = true; base.fx(A); inBase = false; A.cap = cap0; }
    if (o.fx) o.fx(A);
    A.hit = h0;
    const un = def.unseen || [];
    // Unseen: foes near him lose him: a "?" bobs over each; it turns to "!" when he strikes it
    if (un.length) { const v = new A.THREE.Vector3(); A.post((t, x, W, H2, k) => { if (!un.some((w) => t >= w[0] && t < w[1] + 0.3)) return; const r = A.rootAt(t);
      A.card.dum.forEach((dm, i) => { if (dm.fellT != null && t > dm.fellT) return; const p = A.dpt(i, t, 0); if (Math.hypot(p.x - r.x, p.z - r.z) > 3.6) return;
        const hitNow = dm.hits.some((h) => t >= h.t && t < h.t + 0.45 && un.some((w) => h.t >= w[0] - 0.05 && h.t < w[1] + 0.35)); const inU = un.some((w) => t >= w[0] && t < w[1]); if (!inU && !hitNow) return;
        v.copy(A.dpt(i, t, dm.m.h + 0.42)).project(A.cam); const px = (v.x + 1) / 2 * W, py = (1 - v.y) / 2 * H2 + Math.sin(t * 5 + i) * 2.5 * k;
        x.font = font(k, hitNow ? 22 : 17); x.textAlign = 'center'; x.lineWidth = 3 * k; x.strokeStyle = 'rgba(20,14,18,0.85)'; const s2 = hitNow ? '!' : '?'; x.strokeText(s2, px, py); x.fillStyle = hitNow ? C.rose : '#B98FD0'; x.fillText(s2, px, py); }); }); }
    if (un.length) A.hud((t, x, W, H2, k, lang) => { if (!un.some((w) => t >= w[0] && t < w[1])) return; x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = '#B98FD0'; x.fillText(lang === 'en' ? 'Unseen' : '隐身', W - 14 * k, H2 - 34 * k); });
  };
  return def;
}
// a blink line of bats from one spot to another
const hop = (A, t, a, b, dur = 0.08, n = 10) => FX.blink(A, { t, dur, from: [a[0], 0.45, a[1]], to: [b[0], 0.45, b[1]], n, size: 1.3 });

// ---------------------------------------------------------------- passive, basic attack, dash
// P: a backstab is a sure crit; a kill: he is Unseen 1.5 s
F.P = PH(DEFS.P, { caps: false, def: { unseen: [[3.36, 4.86]] }, fx(A) {
  cap(A, 0.55, 1.4, '正面：10', 'From the front: 10'); cap(A, 1.65, 2.9, '背刺：先 +20%，再必暴击 ×1.5：10 → 18', 'A backstab: 20% more, then a sure crit (×1.5): 10 → 18');
  FX.smoke(A, { t: 3.34, at: (t) => A.body(t, 0.2), n: 10, r: 0.3, h: 0.6, size: 0.35, dur: 0.6, op: 0.55 });
  cap(A, 3.3, 4.9, '击杀：隐身 1.5 秒', 'A kill: Unseen 1.5 s'); } });
// B: one blink in place of three: he is gone, then one great claw in its back: 18
{ const me = [-1.1, 0], d0 = [-0.15, 0], d1 = [1.7, -0.55]; const t0 = 0.35; const hitT = [0.10, 0.24, 0.46].map((x) => x + t0);
  const tg = t0 + 0.52, tb = tg + 0.28, s = behind(d1, me, 0.66);
  F.B = PH({ T: 2.8, cam: { x: 0.35, z: -0.2, w: 5.8 }, her: H(me[0], me[1]), seq: [[t0, 'combo', { to: 0.52 }], [tb, 'clawBoth', { from: 0.06, fade: 0.02 }], [tb + 0.8, 'cape', { from: 0.1 }]],
    root: [{ t: tg }, { t: tb, x: s[0], z: s[1], look: d1, cut: true }], hide: [[tg, tb]], dum: [d0, d1] }, { fx(A) {
    claw(A, hitT[0], 0, 4, { of: 'handR' }); claw(A, hitT[1], 0, 4, { roll: 0.95, mark: { bend: -0.1 }, of: 'handL' });
    A.hit(0, hitT[2], 6, { big: true }); FX.bite(A, { t: hitT[2], at: { d: 0, y: 0.6 }, size: 0.42 });
    FX.smoke(A, { t: tg, at: A.body(tg, 0.1), n: 12, r: 0.3, h: 0.7, size: 0.4, dur: 0.5, op: 0.6 }); FX.smoke(A, { t: tb - 0.08, at: [s[0], 0.1, s[1]], n: 10, r: 0.3, h: 0.7, size: 0.4, dur: 0.4, op: 0.5 });
    const tc = tb + 0.14; A.hit(1, tc, 18, { back: true, big: true }); FX.claw(A, { t: tc, at: { d: 1, y: 0.66 }, roll: -0.2, n: 4, size: 0.75, bend: 0.12, back: true }); FX.claw(A, { t: tc + 0.02, at: { d: 1, y: 0.58 }, roll: 0.2, n: 4, size: 0.75, bend: -0.12, back: true });
    FX.spark(A, { t: tc, at: { d: 1, y: 0.6 }, r: 0.8, col: C.moon }); A.shake(tc, 0.06, 0.2);
    A.hud(comboHud(countAt([...hitT, tc])));
    cap(A, tg, 2.7, '一闪不见，背后一记重爪：18 → 32', 'Gone, then one great claw in its back: 18 → 32'); } });
}
// D: he gathers Unseen for 1 s; a dash at a foe within 3 u gathers behind it
{ const me = [-2.2, 0.3], m1 = [0.0, 0.3], d0 = [1.5, -0.6]; const m2 = behind(d0, m1, 0.62);
  F.D = PH({ T: 3.2, cam: { x: 0.0, z: -0.3, w: 6.2 }, her: H(me[0], me[1]), seq: [[0.3, 'castSweep'], [0.55, 'dash', { fade: 0.03 }], [1.75, 'dash'], [2.0, 'standFace', { fade: 0.15 }]],
    root: [{ t: 0.6 }, { t: 0.72, x: m1[0], z: m1[1], cut: true }, { t: 1.8, look: d0 }, { t: 1.92, x: m2[0], z: m2[1], look: d0, cut: true }],
    hide: [[0.6, 0.72], [1.8, 1.92]], unseen: [[0.72, 1.72], [1.92, 2.92]], dum: [d0] }, { fx(A) { const at = (t) => A.body(t, 0.45);
    FX.blink(A, { t: 0.6, dur: 0.12, from: at(0.58), to: at(0.74) }); FX.blink(A, { t: 1.8, dur: 0.12, from: at(1.78), to: at(1.94) });
    cap(A, 0.72, 1.7, '聚拢后隐身 1 秒', 'He gathers Unseen for 1 s'); cap(A, 1.8, 3.1, '冲向 3 u 内的敌人：聚拢在它背后', 'At a foe within 3 u: he gathers behind it'); } });
}

// ---------------------------------------------------------------- Claw
// F1 Hawk Drag: he drags it the other way: out of its pack toward the nearest ally, alone; the fling is a backstab, 20, and it is blinded 1 s
{ const me = [3.0, 0], A0 = [0.9, 0], B0 = [-2.1, 0], al = [-3.25, 0.6]; const t0 = 0.3; const K = hawkK(me, A0, B0, t0 + 0.14); const { tS, tG, tD, tF } = K;
  F.F1 = PH({ T: 3.4, cam: { x: -0.1, z: 0.1, w: 7.8, y: 0.6 }, her: H(me[0], me[1], -90), seq: DEFS.F1.seq, root: hawkRoot(K, true), dum: [A0, [1.75, 0.75], [1.85, -0.75], [al[0], al[1], { ally: true }]] }, { fx(A) {
    hawkGrab(A, K, 0); drag(A, { t: tG, i: 0, a: A0, b: B0, dur: tD - tG, path: [] }); hawkFling(A, K, 0, 20, { back: true, blind: 1, far: 0.55 });
    FX.claw(A, { t: tF, at: { d: 0, y: 0.62 }, roll: -0.2, n: 4, size: 0.6, bend: 0.1, back: true }); allyTag(A, 3);
    cap(A, tS, tF, '反着拖：拖出敌群，拖向最近的队友', 'He drags it the other way: out of its pack, toward the nearest ally');
    cap(A, tF, 3.3, '甩出是背刺：20 → 36（必暴击），致盲 1 秒', 'The fling is a backstab: 20 → 36 (sure crit), blind 1 s'); } });
}
// F2 Cloak Turn: he arrives Unseen 1 s behind the shooter: the claw is a backstab, 18
{ const b = DEFS.F2, k0 = b._k; const K = cloakK({ ...k0, shots: k0.shots.map((sh) => [sh.s, sh.t - k0.tW0]), behind: true });
  F.F2 = PH(b, { base: false, def: { _k: K, root: cloakRoot(K), unseen: [[K.tA, K.tA + 1.0]] }, fx(A) { cloakFx(A, K, { n: 18, back: true });
    cap(A, K.tW0, K.tS, '翻袍：接住，甩回射手', 'The whirl: shots caught and flung back');
    cap(A, K.tS, K.tA + 1.35, '隐身 1 秒落到射手背后：背刺 18 → 32（必暴击）', 'He arrives Unseen 1 s behind the shooter: a backstab, 18 → 32 (sure crit)'); } });
}
// F3: he bursts into a ring of bats that flies out 2.6 u and back: 8 and 8; he gathers behind the foe nearest the pointer
// the pointer taps a foe first; he curls and bursts; the ring tears out and every bat turns home to the spot behind that foe,
// spiralling down into a knot that unfolds into him, low, claws ready, its back lit
{ const me = [-0.8, 0]; const ds = [[-0.2, 0.9], [0.6, -0.8], [1.2, 0.5], [-1.9, -0.7]]; const t0 = 0.36, tO = t0 + 0.12, tR = tO + 0.36, tK = tR + 0.36, tE = tK + 0.22; const g = behind(ds[2], me, 0.62);
  F.F3 = PH({ T: 3.1, cam: { x: 0.0, z: 0, w: 6.4 }, her: H(me[0], me[1]), seq: [[t0, 'curl'], [tE, 'riseBehind', { fade: 0.03 }], [tE + 1.05, 'cape', { from: 0.1 }]], root: [{ t: tO }, { t: tE, x: g[0], z: g[1], look: ds[2], cut: true }], hide: [[tO, tE]], dum: ds }, { fx(A) {
    pointer(A, 0.0, tO + 0.1, 2, [2.2, 1.4]);
    const pts = []; for (let k = 0; k < 10; k++) { const a = k * 36 * D2R; pts.push([me[0] + Math.cos(a) * 2.6, me[1] + Math.sin(a) * 2.6]); }
    pts.forEach((p, k) => { FX.blink(A, { t: tO, dur: 0.33, from: [me[0], 0.5, me[1]], to: [p[0], 0.55, p[1]], n: 3, size: 1.3, puff: false, seed: 300 + k });
      FX.blink(A, { t: tR, dur: 0.36, from: [p[0], 0.55, p[1]], to: [g[0], 0.6, g[1]], n: 3, size: 1.3, puff: false, seed: 340 + k }); });
    FX.ring(A, { t: tO, at: [me[0], 0.5, me[1]], r0: 0.3, r1: 2.6, dur: 0.33, col: C.plum, op: 0.7, w: 0.15 });
    FX.swarm(A, { t0: tK - 0.06, t1: tE + 0.04, at: [g[0], 0.05, g[1]], r: (t) => 0.75 * (1 - EASE.in(clamp((t - tK) / 0.26))) + 0.08, n: 16, w: 9, h: 0.7, size: 1.3, seed: 77 });
    FX.ring(A, { t: tK - 0.04, at: [g[0], 0.03, g[1]], r0: 0.9, r1: 0.15, dur: 0.26, col: C.rose, op: 0.6, w: 0.14, e: 'in' });
    // the bats tear past each foe going out, and again on the way home
    ds.forEach((p, i) => { const d = Math.hypot(p[0] - me[0], p[1] - me[1]), u = Math.min(1, d / 2.6); const ta = tO + 0.33 * u; A.hit(i, ta, 8); FX.claw(A, { t: ta, at: { d: i, y: 0.62 }, roll: 1.2, n: 2, size: 0.36, life: 0.4 });
      const db = Math.hypot(p[0] - g[0], p[1] - g[1]), tb = tR + 0.36 * clamp(1 - db / 3.2); A.hit(i, tb, 8, { dir: [g[0] - p[0], g[1] - p[1]] }); FX.claw(A, { t: tb, at: { d: i, y: 0.7 }, roll: -1.2, n: 2, size: 0.36, life: 0.4 }); });
    FX.smoke(A, { t: tE - 0.04, at: [g[0], 0.1, g[1]], n: 10, r: 0.3, h: 0.7, size: 0.4, dur: 0.5, op: 0.5 }); FX.spark(A, { t: tE + 0.02, at: [g[0], 0.6, g[1]], r: 0.5, col: C.rose });
    cap(A, tO, tE, '化作一圈蝙蝠飞出 2.6 u 再飞回：8 和 8', 'A ring of bats out 2.6 u and back: 8 and 8'); cap(A, tE, 3.0, '聚拢在指针最近的敌人背后', 'He gathers behind the foe nearest the pointer'); } });
}
// F4: no launch: he is gone upward and falls on its back: 30, stun 0.5 s
{ const me = [-1.5, 0], d0 = [0, 0]; const t0 = 0.3, tUp = t0 + 0.24, tIn = tUp + 0.7, tL = tIn + 0.18; const b = behind(d0, me, 0.55);
  F.F4 = PH({ T: 3.0, cam: { x: -0.2, z: -0.4, w: 5.4, y: 1.0 }, her: H(me[0], me[1]), seq: [[t0, 'rise', { to: 0.3 }], [tIn, 'stomp', { from: 0.12, fade: 0.03 }], [tL + 0.5, 'cape', { from: 0.1 }]],
    root: [{ t: t0 + 0.1 }, { t: tUp + 0.1, y: 3.0, fw: 0.2, e: 'in' }, { t: tIn, x: b[0], z: b[1], y: 2.4, look: d0, cut: true }, { t: tL, x: b[0], z: b[1], y: 0.15, look: d0, e: 'in' }, { t: tL + 0.2, y: 0, look: d0 }],
    hide: [[tUp + 0.06, tIn]], dum: [d0] }, { fx(A) {
    FX.trail(A, { of: 'chest', t0: t0 + 0.12, t1: tUp + 0.08, len: 0.12, w: 0.3, col: C.plum, op: 0.6 }); FX.smoke(A, { t: tUp, at: A.body(tUp, 0), n: 8, r: 0.25, size: 0.3, dur: 0.5, op: 0.5 });
    FX.trail(A, { of: 'chest', t0: tIn, t1: tL, len: 0.12, w: 0.3, col: C.plum, op: 0.6 });
    A.hit(0, tL, 30, { back: true, big: true }); A.status(0, tL, 'stun', 0.5); FX.claw(A, { t: tL, at: { d: 0, y: 0.7 }, roll: 0, n: 4, size: 0.9, back: true, bend: 0.1 }); FX.ring(A, { t: tL, at: { d: 0, y: -0.58 }, r0: 0.2, r1: 1.3, dur: 0.45, col: C.rose, op: 0.8 }); FX.dust(A, { t: tL, at: { d: 0, y: -0.6 }, n: 10, sp: 1.4 }); A.shake(tL, 0.08, 0.22);
    cap(A, tUp, tIn, '不挑飞：他向上消失', 'No launch: he is gone upward'); cap(A, tIn, 2.9, '落在它背后：30 → 54（必暴击），眩晕 0.5 秒', 'He falls on its back: 30 → 54 (sure crit), stun 0.5 s'); } });
}
// F5: he blinks to the weakest foe within 5 u and bites its neck from behind; a kill leaves him Unseen 1.5 s
{ const me = [-2.0, 0], d0 = [-0.6, 0.6], d1 = [1.8, -0.2]; const t0 = 0.3, tG = t0 + 0.25, tA = tG + 0.12; const b = behind(d1, me, 0.6);
  F.F5 = PH({ T: 3.4, cam: { x: 0.0, z: 0, w: 6.2 }, her: H(me[0], me[1]), seq: [[t0, 'standFace'], [tA, 'dart', { from: 0.3, fade: 0.02 }], [tA + 0.5, 'lick']],
    root: [{ t: tG }, { t: tA, x: b[0], z: b[1], look: d1, cut: true }], hide: [[tG, tA]], unseen: [[tA + 0.3, tA + 1.8]], dum: [d0, d1] }, { fx(A) {
    FX.smoke(A, { t: 0.0, at: { d: 1, y: 0.9 }, n: 8, r: 0.12, h: 0.5, size: 0.14, dur: 2.0, op: 0.5, col: C.blood, col2: C.rose, rise: 0.6, spread: 1.6, out: 0.2 });
    hop(A, tG, me, b, 0.12, 12); const tb = tA + 0.2; A.hit(1, tb, 48, { back: true, big: true, fell: true }); FX.bite(A, { t: tb, at: { d: 1, y: 0.75 }, size: 0.6 }); A.shake(tb, 0.06, 0.2);
    FX.smoke(A, { t: tA + 0.28, at: (t) => A.body(t, 0.2), n: 10, r: 0.3, h: 0.6, size: 0.35, dur: 0.6, op: 0.55 });
    cap(A, tG, tb + 0.25, '闪到 5 u 内最弱的敌人背后咬颈：低血翻倍 48 → 86', 'He blinks behind the weakest foe within 5 u and bites its neck: doubled 48 → 86'); cap(A, tb + 0.25, 3.3, '击杀：隐身 1.5 秒', 'A kill: Unseen 1.5 s'); } });
}
// F6: he drops on its back out of the dark: stun 1 s, every hit a backstab
{ const me = [-2.0, 0], d0 = [0.6, 0]; const t0 = 0.3, tS = t0 + 0.2, tD = tS + 0.45, tl = tD + 0.2; const b = behind(d0, me, 0.42);
  F.F6 = PH({ T: 3.2, cam: { x: -0.3, z: 0, w: 5.4, y: 0.6 }, her: H(me[0], me[1]), seq: [[t0, 'sink'], [tD, 'pounce', { from: 0.3, fade: 0.02 }], [tl, 'maul'], [tl + 0.95, 'flip'], [tl + 1.45, 'emerge', { from: 0.07 }]],
    root: [{ t: t0 + 0.1 }, { t: tS, y: -1.0, e: 'in' }, { t: tD, x: b[0], z: b[1], y: 1.5, look: d0, cut: true }, { t: tl, x: b[0], z: b[1], y: 0.42, look: d0, e: 'in' }, { t: tl + 0.95, x: b[0], z: b[1], y: 0.42, look: d0 }, { t: tl + 1.4, x: b[0] + 1.0, z: b[1], y: 0, jump: 0.8, pitch: -360, look: d0, e: 'lin' }],
    hide: [[tS, tD]], dum: [d0] }, { fx(A) {
    FX.disc(A, { t: t0 + 0.05, at: [me[0], 0, me[1]], r0: 0.3, r1: 0.7, dur: 0.5, col: C.ink, op: 0.9, normal: true }); FX.smoke(A, { t: tD - 0.05, at: [b[0], 1.5, b[1]], n: 10, r: 0.3, h: 0.4, size: 0.4, dur: 0.5, op: 0.6 });
    A.hit(0, tl, null, { big: true }); A.status(0, tl, 'stun', 1.0); FX.dust(A, { t: tl, at: { d: 0, y: -0.6 }, n: 7 }); A.shake(tl, 0.05, 0.15);
    for (let i = 0; i < 5; i++) { const tc = tl + 0.08 + (i < 4 ? 0.16 * i : 0.78); claw(A, tc, 0, 4, { back: true, bs: true, size: i === 4 ? 0.6 : 0.42, roll: i === 4 ? 0 : i % 2 ? 0.9 : -0.9, y: 0.75, mark: i === 4 ? { n: 4 } : {}, of: i % 2 ? 'handL' : 'handR' }); }
    cap(A, tS, tl, '从黑暗里落到它背上', 'He drops on its back out of the dark'); cap(A, tl, 3.1, '眩晕 1 秒，每一下都是背刺：4 → 7', 'Stun 1 s, every hit a backstab: 4 → 7'); } });
}
// F7: he blinks to where the crescents end and cuts back at the last foe they hit: 14
{ const t0 = 0.3, tC = t0 + 0.44, tE = tC + 0.42, tB = tE + 0.1; const ds = DEFS.F7.dum; const end = [3.0, 0.0];
  F.F7 = PH(DEFS.F7, { def: { T: 3.0, cam: { x: 0.6, z: 0, w: 7.0 }, seq: [[t0, 'clap', { to: 0.62 }], [tB, 'clawR', { from: 0.04, fade: 0.02 }], [tB + 0.6, 'standFace', { fade: 0.2 }]], root: [{ t: tE }, { t: tB, x: end[0], z: end[1], look: ds[2], cut: true }], hide: [[tE, tB]] }, fx(A) {
    hop(A, tE, [-1.9, 0], end, 0.1, 12); const tc = tB + 0.15; claw(A, tc, 2, 14, { back: true, big: true, roll: 1.2, mark: { n: 4, size: 0.62 } }); A.shake(tc, 0.05, 0.16);
    cap(A, tE, 2.9, '闪到月刃尽头，回砍最后一个敌人的背：14 → 25', 'He blinks to where they end and cuts back at the last foe: 14 → 25'); } });
}
// F8: the room goes dark while he flies; one dive out of the dark at the end: 40 within 1.5 u
{ const ds = [[1.1, 0.2], [1.75, -0.45], [1.6, 0.85]]; const c = [1.45, 0.2]; const t0 = 0.3, tDv = t0 + 2.3; const air = [[-1.2, -0.8], [0.4, -1.6], [2.8, -1.0], [2.6, 1.4]];
  F.F8 = PH({ T: tDv + 1.4, cam: { x: 0.5, z: -0.6, w: 7.5, y: 0.9 }, her: H(-1.8, 0),
    seq: [[t0, 'flare'], [t0 + 0.25, 'fly', { loop: true, until: tDv - 0.15 }], [tDv - 0.15, 'streak'], [tDv + 0.02, 'cape', { from: 0.1 }]],
    root: [{ t: t0 + 0.15 }, { t: t0 + 0.6, x: air[0][0], z: air[0][1], y: 1.7, pitch: 20, e: 'out' }, { t: t0 + 1.1, x: air[1][0], z: air[1][1], y: 1.8, pitch: 20, roll: 180 }, { t: t0 + 1.6, x: air[2][0], z: air[2][1], y: 1.8, pitch: 20, roll: 360 }, { t: tDv - 0.15, x: air[3][0], z: air[3][1], y: 1.9, pitch: 25, roll: 360, look: c },
      { t: tDv, x: c[0] - 0.3, z: c[1] + 0.2, y: 0, pitch: 0, roll: 360, e: 'in2' }], unseen: [[t0 + 0.4, tDv - 0.15]], dum: ds }, { fx(A) {
    A.dark(t0 + 0.3, tDv + 0.1, 0.8, 0.3, 0.25, { eyes: true });
    ds.forEach((p, i) => A.hit(i, tDv + 0.01 * i, 40, { big: true })); FX.claw(A, { t: tDv, at: { d: 0, y: 0.7 }, roll: -0.5, n: 4, size: 1.1, bend: 0.14 });
    FX.ring(A, { t: tDv, at: [c[0], 0, c[1]], r0: 0.3, r1: 1.5, dur: 0.45, col: C.rose, op: 0.8 }); FX.ring(A, { t: tDv + 0.04, at: [c[0], 0, c[1]], r0: 0.2, r1: 1.2, dur: 0.4, col: C.plum, op: 0.8, normal: true }); FX.dust(A, { t: tDv, at: [c[0], 0, c[1]], n: 12, sp: 1.4 }); A.shake(tDv, 0.09, 0.25);
    FX.trail(A, { of: 'chest', t0: tDv - 0.15, t1: tDv, len: 0.12, w: 0.32, col: C.plum, op: 0.6 });
    cap(A, t0 + 0.3, tDv - 0.1, '他飞起时房间变黑', 'The room goes dark while he flies'); cap(A, tDv, tDv + 1.3, '最后从黑暗里一次俯冲：1.5 u 内 40', 'One dive out of the dark at the end: 40 within 1.5 u'); } });
}

// ---------------------------------------------------------------- Blood
// F9: he blinks behind the foe nearest the pointer within 3 u and bites its neck: 26
// the pointer taps it; ears flat, he sinks and is gone; he is on its shoulders from behind, jaws in its neck; blood drawn home; he licks and drops off
{ const me = [-1.6, 0], d0 = [0.4, 0.3], d1 = [0.2, -0.7]; const t0 = 0.25, tS = 0.45, tG = tS + 0.14, tA = tG + 0.1; const b = behind(d0, me, 0.58), off = behind(d0, me, 1.15);
  const tb = tA + 0.21, tL = tb + 0.62;
  F.F9 = PH({ T: 2.8, cam: { x: -0.2, z: 0, w: 5.0 }, her: H(me[0], me[1]), seq: [[t0, 'standFace'], [tS, 'sink', { speed: 1.7 }], [tA, 'castPlant', { from: 0.25, fade: 0.02 }], [tL, 'lick', { fade: 0.1 }], [tL + 0.5, 'cape', { from: 0.1 }]],
    root: [{ t: tG }, { t: tA, x: b[0], z: b[1], y: 0.16, look: d0, pitch: 12, cut: true }, { t: tb + 0.3, x: b[0], z: b[1], y: 0.16, look: d0, pitch: 12 }, { t: tL + 0.2, x: off[0], z: off[1], y: 0, look: d0, pitch: 0, e: 's' }],
    hide: [[tG, tA]], dum: [d0, d1] }, { fx(A) {
    pointer(A, 0.0, tG + 0.1, 0, [1.6, 1.3]);
    hop(A, tG, me, b, 0.1, 10); A.hit(0, tb, 26, { back: true, big: true }); FX.bite(A, { t: tb, at: { d: 0, y: 0.75 }, size: 0.55 }); A.shake(tb, 0.05, 0.16);
    FX.drops(A, { t: tb + 0.02, at: { d: 0, y: 0.8 }, n: 10, sp: 1.1, up: 1.0, size: 0.05, dur: 0.6 });
    drink(A, tb + 0.08, { d: 0, y: 0.7 }, 20, { drops: 7, hang: 0.25 });
    cap(A, tG, 2.7, '闪到指针最近的敌人背后，咬颈：26 → 47（必暴击）', 'He blinks behind the foe nearest the pointer and bites its neck: 26 → 47 (sure crit)'); } });
}
// F10: from behind: 14, and after 1.5 s the whole bleed bursts out at once: 24
{ const me = [-1.4, 0], d0 = [0.2, 0]; const t0 = 0.3, tG = t0 + 0.15, tA = tG + 0.1, tV = tA + 0.36, tX = tV + 1.5; const b = behind(d0, me, 0.6);
  F.F10 = PH({ T: 3.6, cam: { x: -0.2, z: 0, w: 5.0 }, her: H(me[0], me[1]), seq: [[t0, 'standFace'], [tA, 'vein', { from: 0.08, fade: 0.02 }], [tV + 0.6, 'idle']], root: [{ t: tG }, { t: tA, x: b[0], z: b[1], look: d0, cut: true }], hide: [[tG, tA]], dum: [d0] }, { fx(A) {
    hop(A, tG, me, b, 0.1, 10); A.hit(0, tV, 14, { back: true, big: true }); FX.claw(A, { t: tV, at: { d: 0, y: 0.62 }, roll: -0.35, n: 1, len: 1.7, wid: 0.03, size: 0.6, open: 0.05, life: 1.6, bend: 0.04, back: true });
    A.status(0, tV, 'bleed', 1.5, { rate: 9 }); FX.drops(A, { t: tX, at: { d: 0, y: 0.6 }, n: 26, sp: 2.6, up: 1.0, size: 0.07 }); FX.ring(A, { t: tX, at: { d: 0, y: 0.1 }, r0: 0.2, r1: 1.0, dur: 0.4, col: C.blood, op: 0.9, normal: true });
    A.hit(0, tX, 24, { big: true, col: C.rose }); A.shake(tX, 0.06, 0.2);
    A.post((t, x, W, H2, k, lang) => { if (t < tV || t > tX) return; x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.rose; x.fillText((lang === 'en' ? 'Burst in ' : '爆开 ') + Math.max(0, tX - t).toFixed(1) + 's', W - 14 * k, 28 * k); });
    cap(A, tG, tX - 0.05, '从背后：14 → 25（必暴击）', 'From behind: 14 → 25 (sure crit)'); cap(A, tX, 3.5, '1.5 秒后整段流血一次爆开：24', 'After 1.5 s the whole bleed bursts out at once: 24'); } });
}
// F11: it pins the first foe 0.5 s and he blinks along the thread to its back: 10 + 14
{ const me = [-1.7, 0], d0 = [0.4, 0.05], d1 = [1.8, -0.1]; const t0 = 0.3, tT = t0 + 0.7, tP = tT + 0.12, tG = tP + 0.35, tA = tG + 0.1; const b = behind(d0, me, 0.6);
  F.F11 = PH({ T: 3.0, cam: { x: 0.0, z: 0, w: 5.8 }, her: H(me[0], me[1]), seq: [[t0, 'lance', { to: 0.82 }], [tA, 'clawR', { from: 0.04, fade: 0.02 }], [tA + 0.6, 'standFace', { fade: 0.2 }]], root: [{ t: tG }, { t: tA, x: b[0], z: b[1], look: d0, cut: true }], hide: [[tG, tA]], dum: [d0, d1] }, { fx(A) {
    const T = A.THREE; FX.thread(A, { t0: t0 + 0.4, t1: tT - 0.02, from: (t) => A.at('handR', t), to: (t) => A.at('handL', t), w: 0.03, grow: 0.15, per: 0.25 });
    const o = A.ahead(tT, 0.5, 0.55); const e = new T.Vector3(d0[0], 0.55, d0[1]); const lm = A.add(new T.Mesh(A.streakGeo, A.mat(C.blood, A.F.STREAK)));
    A.fx((t) => { const a = t - tT, d = 0.12; const on = a >= 0 && t < tA + 0.2; lm.visible = on; if (!on) return; const u = clamp(a / d); const p = o.clone().lerp(e, EASE.out2(u)), q = o.clone().lerp(e, Math.max(0, EASE.out2(u) - 0.5)); lm.position.copy(q); lm.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); lm.scale.set(0.09, 0.09, p.distanceTo(q) + 1e-3); lm.material.uniforms.op.value = t > tA ? 1 - (t - tA) / 0.2 : 1; });
    A.hit(0, tP, 10, { big: true }); A.status(0, tP, 'stun', 0.5); FX.thread(A, { t0: tP, t1: tG + 0.1, from: { d: 0, y: 0.6 }, to: (t) => A.at('handR', t), w: 0.03, per: 0.2 });
    FX.blink(A, { t: tG, dur: 0.1, from: A.body(tG - 0.02, 0.45), to: [b[0], 0.45, b[1]], n: 10, size: 1.3 }); claw(A, tA + 0.15, 0, 14, { back: true, big: true, roll: 1.2, mark: { n: 4, size: 0.6 } }); A.shake(tA + 0.15, 0.05, 0.16);
    cap(A, tP, tG, '钉住第一个敌人 0.5 秒：10', 'It pins the first foe 0.5 s: 10'); cap(A, tG, 2.9, '顺着血线闪到它背后：14 → 25（必暴击）', 'He blinks along the thread to its back: 14 → 25 (sure crit)'); } });
}
// F12: the swarm is round him 4 s: he is Unseen inside it and it bites the foes within 1.3 u
{ const me = [-2.0, 0]; const ds = [[-0.4, 0.7], [0.5, -0.6], [1.4, 0.5]]; const t0 = 0.3, tS = t0 + 0.4, tE = tS + 4.0;
  F.F12 = PH({ T: 5.0, cam: { x: -0.2, z: 0, w: 6.2 }, her: H(me[0], me[1]), seq: [[t0, 'flare'], [tS, 'walk', { loop: true, until: tE }]], root: [{ t: tS }, { t: tE, fw: 3.8, e: 'lin' }], unseen: [[tS, tE]], dum: ds }, { fx(A) {
    FX.swarm(A, { t0: tS - 0.1, t1: tE, at: (t) => A.body(t, 0.1), r: 1.1, n: 26, h: 1.0, w: 3.4, both: true, size: 1.5 });
    for (let s = 0; s < 4; s++) { const ts = tS + 0.5 + 1.0 * s, r = A.rootAt(ts); ds.forEach((p, i) => { if (Math.hypot(p[0] - r.x, p[1] - r.z) <= 1.3) A.hit(i, ts + 0.03 * i, 5, { col: '#E7A0A8' }); }); }
    cap(A, tS, tE, '蝠群围着他 4 秒：他在里面隐身，蝠群咬 1.3 u 内的敌人', 'The swarm is round him 4 s: Unseen inside it, it bites the foes within 1.3 u'); } });
}
// F13: a ring of spikes closes on one foe within 5 u: 16, held 1.2 s; every hit on it is a backstab
{ const me = [-1.8, 0], d0 = [0.6, 0]; const t0 = 0.3, tS = t0 + 0.36, tC = tS + 0.3; const b = around(d0, 180, 0.62);
  F.F13 = PH({ T: 3.2, cam: { x: -0.4, z: 0, w: 5.4 }, her: H(me[0], me[1]), seq: [[t0, 'floorStab'], [tC + 0.35, 'run', { loop: true, until: tC + 0.6 }], [tC + 0.6, 'clawR'], [tC + 0.95, 'clawL']], root: [{ t: tC + 0.35 }, { t: tC + 0.6, x: b[0], z: b[1], look: d0 }], dum: [d0] }, { fx(A) {
    A.shake(tS, 0.05, 0.16); FX.ring(A, { t: tS, at: A.ahead(tS, 0.5, 0), r0: 0.1, r1: 0.6, dur: 0.3, col: C.blood, op: 0.7, normal: true });
    for (let k = 0; k < 12; k++) { const a = k * 30 * D2R; for (const rr of [1.3, 0.75]) { const ts = tS + (rr > 1 ? 0.0 : 0.15) + 0.01 * k; FX.spike(A, { t: ts, at: [d0[0] + Math.cos(a) * rr, 0, d0[1] + Math.sin(a) * rr], h: rr > 1 ? 0.5 : 0.8, w: 0.9, life: 1.5, tilt: [-Math.sin(a) * 0.5, Math.cos(a) * 0.5], burst: k % 3 === 0 }); } }
    A.hit(0, tC, 16, { big: true }); A.status(0, tC, 'stun', 1.2);
    claw(A, tC + 0.75, 0, 10, { back: true, bs: true, of: 'handR' }); claw(A, tC + 1.1, 0, 10, { back: true, bs: true, roll: 0.95, of: 'handL' });
    cap(A, tS, tC + 0.5, '一圈血棘围住 5 u 内一个敌人：16，困 1.2 秒', 'A ring of spikes closes on one foe within 5 u: 16, held 1.2 s'); cap(A, tC + 0.5, 3.1, '打它每一下都是背刺：10 → 18', 'Every hit on it is a backstab: 10 → 18'); } });
}
// F14: black mist: foes inside are blinded; he gathers Unseen behind the foe nearest the pointer
{ const ds = [[0.2, -0.45], [0.75, 0.55], [1.4, -0.1]]; const t0 = 0.3, t1 = t0 + 0.16, t2 = t1 + 1.5; const g = behind(ds[2], [-1.3, 0], 0.6);
  F.F14 = PH({ T: 3.8, cam: { x: 0.2, z: 0, w: 6.2 }, her: H(-1.3, 0), seq: [[t0, 'wrap'], [t2, 'emerge', { from: 0.07 }]], root: [{ t: t1 }, { t: t2 - 0.12, fw: 2.1, e: 'lin' }, { t: t2, x: g[0], z: g[1], look: ds[2], cut: true }], hide: [[t1, t2]], unseen: [[t2, t2 + 1.5]], dum: ds }, { fx(A) {
    FX.mist(A, { t0: t1 - 0.05, t1: t2 - 0.05, at: (t) => A.body(Math.min(t, t2 - 0.12), 0), r: 1.0, n: 26, h: 1.0, op: 0.6, col: '#1E1220', col2: C.plum });
    ds.forEach((p, i) => { for (let s = 0; s < 3; s++) { const ts = t1 + 0.25 + 0.5 * s; const r = A.rootAt(ts); if (Math.hypot(p[0] - r.x, p[1] - r.z) < 1.15) { A.hit(i, ts + 0.03 * i, 4, { col: '#C9B6D6', blind: 1.0 }); } } });
    FX.blink(A, { t: t2 - 0.12, dur: 0.12, from: A.body(t2 - 0.13, 0.45), to: [g[0], 0.45, g[1]], n: 8, size: 1.2 });
    cap(A, t1, t2, '黑雾：里面的敌人致盲', 'Black mist: foes inside are blinded'); cap(A, t2, 3.7, '隐身聚拢在指针最近的敌人背后', 'He gathers Unseen behind the foe nearest the pointer'); } });
}
// F15: no speed: each basic hit blinks him behind its foe
{ const ds = [[-0.4, 0.0], [0.5, 0.95], [0.6, -0.9]]; const t0 = 0.3, tA = t0 + 1.05; const ang = [180, 60, -60]; const me = [-1.25, 0];
  const order = [0, 1, 2, 0, 1, 2]; const ht = order.map((_, k) => tA + 0.36 * k);
  const seq = [[t0, 'boil']], root = [], hide = []; let prev = me;
  order.forEach((i, k) => { const p = around(ds[i], ang[i] + 180 * (k >= 3 ? 1 : 0), 0.62); const t = ht[k]; seq.push([t, k % 3 === 2 ? 'dart' : k % 2 ? 'clawL' : 'clawR', { from: k % 3 === 2 ? 0.3 : 0.06, fade: 0.02 }]); root.push({ t: t - 0.05 }, { t, x: p[0], z: p[1], look: ds[i], cut: true }); hide.push([t - 0.05, t]); prev = p; });
  F.F15 = PH({ T: ht[5] + 0.9, cam: { x: -0.4, z: 0, w: 5.0 }, her: H(me[0], me[1]), seq, root, hide, dum: ds }, { fx(A) {
    FX.smoke(A, { t: t0 + 0.4, at: (t) => A.body(t, 0.2), follow: true, n: 22, r: 0.35, h: 0.8, size: 0.16, dur: ht[5] + 0.5 - t0, spread: 2.4, op: 0.5, col: C.ink, col2: C.plum, rise: 0.8, out: 0.1 });
    let pv = me; order.forEach((i, k) => { const p = around(ds[i], ang[i] + 180 * (k >= 3 ? 1 : 0), 0.62); hop(A, ht[k] - 0.05, pv, p, 0.05, 6); pv = p; const th = ht[k] + (k % 3 === 2 ? 0.18 : 0.12);
      if (k % 3 === 2) { A.hit(i, th, 6, { back: true, bs: true, big: true }); FX.bite(A, { t: th, at: { d: i, y: 0.6 }, size: 0.4 }); } else claw(A, th, i, 4, { back: true, bs: true, roll: k % 2 ? 0.95 : -0.95, of: k % 2 ? 'handL' : 'handR' });
      ds.forEach((q, j) => { if (j !== i && Math.hypot(q[0] - ds[i][0], q[1] - ds[i][1]) <= 1.0) A.hit(j, th + 0.04, 3, { col: '#E7A0A8' }); }); });
    cap(A, tA, ht[5] + 0.8, '不加速：每一下普攻都闪到那个敌人背后', 'No speed: each basic hit blinks him behind its foe'); } });
}
// F16: an eclipse: 20, 4 u wide, blinded 2 s; he is Unseen 3 s
{ const ds = fan(6, 1.9, 0, 300, -0.3, 0); const t0 = 0.3, tC = t0 + 1.15;
  F.F16 = PH({ T: tC + 3.4, cam: { x: -0.3, z: -0.2, w: 8.6, y: 0.9 }, her: H(-0.3, 0), seq: [[t0, 'moonRise']], root: [{ t: t0 + 0.2 }, { t: t0 + 0.9, y: 0.7, e: 'out' }, { t: tC, y: 0.75 }, { t: tC + 0.25, y: 0, e: 'in' }], unseen: [[tC + 0.25, tC + 3.25]], dum: ds }, { fx(A) {
    FX.moon(A, { t0: t0 + 0.3, t1: tC + 2.2, at: (t) => { const r = A.rootAt(t); return [r.x, 1.9 + r.y * 0.4, r.z - 1.0]; }, r: 0.95, grow: 0.8, op: 0.95, eclipse: [t0 + 0.4, tC] });
    A.dark(tC - 0.05, tC + 2.0, 0.6, 0.1, 0.5, { eyes: true }); A.shake(tC, 0.07, 0.25);
    FX.ring(A, { t: tC + 0.02, at: [-0.3, 0, 0], r0: 0.3, r1: 4.0, dur: 0.55, col: C.plum, op: 0.9, w: 0.3, normal: true }); FX.ring(A, { t: tC + 0.12, at: [-0.3, 0, 0], r0: 0.2, r1: 4.0, dur: 0.5, col: C.rose, op: 0.6 });
    ds.forEach((p, i) => A.hit(i, tC + 0.1 + 0.015 * i, 20, { big: true, blind: 2.0 }));
    cap(A, tC - 0.6, tC + 0.25, '日食', 'An eclipse'); cap(A, tC + 0.25, tC + 3.3, '4 u 内 20，致盲 2 秒；他隐身 3 秒', '20 within 4 u, blinded 2 s; he is Unseen 3 s'); } });
}

// ---------------------------------------------------------------- Night
// F17: no dive: he is behind the foe nearest the pointer within 4.5 u: 22 to it, 8 to the others
// the pointer taps the foe; he sinks into his wings and is gone; he unfolds behind it, both claws high, and drives them down into its back;
// the blow rolls out of it as a red wave that tears the others as it reaches them; he springs back off it and settles in the cape pose
{ const me = [-2.1, 0], c = [1.3, 0]; const ds = fan(4, 1.3, 20, 340, c[0], c[1]); const t0 = 0.22, tS = 0.5, tG = tS + 0.16, tA = tG + 0.1; const tg = 0; const b = around(ds[tg], 20, 0.62);
  const th = tA + 0.16, tF = th + 0.42, bk = around(ds[tg], 20, 1.45);
  F.F17 = PH({ T: 3.0, cam: { x: 0.1, z: 0, w: 6.4, y: 0.6 }, her: H(me[0], me[1]), seq: [[t0, 'standFace'], [tS, 'sink', { speed: 1.6 }], [tA, 'clawBoth', { from: 0.05, fade: 0.02 }], [tF, 'flip', { fade: 0.04 }], [tF + 0.5, 'cape', { from: 0.06 }]],
    root: [{ t: tG }, { t: tA, x: b[0], z: b[1], look: ds[tg], cut: true }, { t: tF }, { t: tF + 0.22, x: (b[0] + bk[0]) / 2, z: (b[1] + bk[1]) / 2, y: 0.42, look: ds[tg], e: 'out' }, { t: tF + 0.46, x: bk[0], z: bk[1], y: 0, look: ds[tg], e: 'in' }],
    hide: [[tG, tA]], dum: ds }, { fx(A) {
    pointer(A, 0.05, tG + 0.1, tg, [-0.4, 1.4]);
    FX.smoke(A, { t: tS + 0.06, at: A.body(tS, 0.1), n: 8, r: 0.25, h: 0.5, size: 0.35, dur: 0.4, op: 0.5 });
    hop(A, tG, me, b, 0.1, 12);
    A.hit(tg, th, 22, { back: true, big: true }); FX.claw(A, { t: th, at: { d: tg, y: 0.62 }, roll: -0.3, n: 4, size: 0.75, back: true }); FX.claw(A, { t: th + 0.03, at: { d: tg, y: 0.6 }, roll: 0.35, n: 3, size: 0.6, back: true });
    FX.spark(A, { t: th, at: { d: tg, y: 0.6 }, r: 0.8, col: C.moon }); FX.trail(A, { of: 'handR', t0: th - 0.1, t1: th + 0.05, len: 0.14, w: 0.09 }); FX.trail(A, { of: 'handL', t0: th - 0.1, t1: th + 0.05, len: 0.14, w: 0.09 });
    const o0 = ds[tg]; let rMax = 0; ds.forEach((p, i) => { if (i !== tg) rMax = Math.max(rMax, Math.hypot(p[0] - o0[0], p[1] - o0[1])); }); const wv = 0.5;
    FX.ring(A, { t: th + 0.02, at: [o0[0], 0.03, o0[1]], r0: 0.3, r1: rMax + 0.35, dur: wv, col: C.blood, op: 0.85, w: 0.22, e: 'lin' }); FX.ring(A, { t: th + 0.06, at: [o0[0], 0.04, o0[1]], r0: 0.2, r1: rMax + 0.2, dur: wv + 0.05, col: C.rose, op: 0.5, w: 0.1, e: 'lin' });
    ds.forEach((p, i) => { if (i === tg) return; const ta = th + 0.02 + wv * (Math.hypot(p[0] - o0[0], p[1] - o0[1]) - 0.3) / (rMax + 0.05); A.hit(i, ta, 8, { dir: [p[0] - o0[0], p[1] - o0[1]] }); FX.claw(A, { t: ta, at: { d: i, y: 0.55 }, roll: 1.3, n: 3, size: 0.4, life: 0.6 }); FX.drops(A, { t: ta, at: { d: i, y: 0.55 }, n: 4, sp: 0.9, up: 0.5 }); });
    A.shake(th, 0.07, 0.22); FX.dust(A, { t: tF + 0.46, at: [bk[0], 0.03, bk[1]], n: 5, sp: 0.8, dur: 0.4 });
    cap(A, tG, 2.9, '不俯冲：直接在指针最近的敌人背后：22 → 40（必暴击），其他 8', 'No dive: behind the foe nearest the pointer: 22 → 40 (sure crit), 8 to the others'); } });
}
// F18: two charges; a kill with it gives one back
{ const me = [-2.0, 0]; const ds = [[0.0, 0.5], [1.2, -0.4], [2.3, 0.4]]; const t0 = 0.3; const tB = [t0 + 0.2, t0 + 0.9, t0 + 1.6];
  const seq = [[t0, 'standFace']], root = [], hide = []; tB.forEach((t, k) => { const p = around(ds[k], k === 1 ? 0 : 20, 0.7); seq.push([t + 0.08, 'stab', { fade: 0.02 }]); root.push({ t }, { t: t + 0.08, x: p[0], z: p[1], look: ds[k], cut: true }); hide.push([t, t + 0.08]); });
  F.F18 = PH({ T: 3.0, cam: { x: 0.2, z: 0, w: 6.2 }, her: H(me[0], me[1]), seq, root, hide, dum: ds }, { fx(A) { let pv = me;
    tB.forEach((t, k) => { const p = around(ds[k], k === 1 ? 0 : 20, 0.7); hop(A, t, pv, p, 0.08, 10); pv = p; const tS = t + 0.13; claw(A, tS, k, 22, { back: true, big: true, fell: k === 0, roll: 1.3, mark: { n: 1, len: 1.3, wid: 0.05, size: 0.6 } }); A.shake(tS, 0.05, 0.14); });
    const ch = (t) => t < tB[0] ? 2 : t < tB[0] + 0.2 ? 1 : t < tB[1] ? 2 : t < tB[2] ? 1 : 0;
    A.hud(keysHud((t) => [['瞬袭 ×' + ch(t), 'Blink ×' + ch(t), ch(t) ? 0 : 5 - (t - tB[2])]]));
    cap(A, tB[0], tB[0] + 0.65, '两次充能', 'Two charges'); cap(A, tB[0] + 0.15, tB[1], '击杀：还一次', 'A kill gives one back'); cap(A, tB[1], 2.9, '每一下都是背刺：22 → 40', 'Each is a backstab: 22 → 40'); } });
}
// F19: 4.5 u, and he is Unseen 2 s
{ const t0 = 0.4;
  F.F19 = PH(DEFS.F19, { def: { T: 3.6, cam: { x: -2.2, z: 0, w: 7.2 }, root: [{ t: t0 + 0.08 }, { t: t0 + 0.2, fw: -0.4, y: 0.35, pitch: -160, e: 'out' }, { t: t0 + 0.32, fw: -4.3, y: 0.35, pitch: -200, cut: true }, { t: t0 + 0.48, fw: -4.5, y: 0, pitch: -360, e: 'in' }], unseen: [[t0 + 0.5, t0 + 2.5]] }, fx(A) {
    cap(A, t0 + 0.5, t0 + 2.5, '跳开 4.5 u，隐身 2 秒', '4.5 u away, Unseen 2 s'); } });
}
// F20: 3 u wide, 3 s; he is Unseen while he stands in it
{ const ds = fan(6, 2.4, 15, 330, -0.4, 0); const t0 = 0.3, tC = t0 + 0.6;
  F.F20 = PH({ T: tC + 3.4, cam: { x: -0.4, z: 0, w: 7.0 }, her: H(-0.4, 0), seq: [[t0, 'castBloom']], unseen: [[tC + 0.05, tC + 3.0]], dum: ds }, { fx(A) {
    FX.dome(A, { t0: tC, t1: tC + 3.0, at: 'him', r: 3.0, op: 0.75 }); FX.sigil(A, { t0: tC, t1: tC + 3.0, at: 'him', floor: true, r: 1.6, op: 0.5 });
    FX.smoke(A, { t: tC, at: A.body(tC, 0), n: 34, r: 2.4, h: 0.8, size: 0.7, dur: 1.6, spread: 0.2, op: 0.55, rise: 0.2, out: 0.2 });
    ds.forEach((p, i) => A.hit(i, tC + 0.06 + 0.01 * i, 6, { blind: 2.0 })); FX.ring(A, { t: tC, at: 'him', r0: 0.3, r1: 3.0, dur: 0.4, col: C.rose, op: 0.6 });
    cap(A, tC + 0.1, tC + 3.2, '3 u 宽，3 秒；他站在里面就隐身', '3 u wide, 3 s; he is Unseen while he stands in it'); } });
}
// F21: a ring, 5 u, no damage: every foe shows its back for 4 s: his hits on it are backstabs from any side
{ const ds = fan(3, 1.6, 38, -38, -1.0, 0); const me = [-1.9, 0]; const t0 = 0.3, tC = t0 + 0.42;
  F.F21 = PH({ T: 3.8, cam: { x: -0.4, z: 0, w: 6.0 }, her: H(me[0], me[1]), seq: [[t0, 'castPoint'], [1.95, 'clawR'], [2.45, 'clawL']], root: [{ t: 1.6 }, { t: 1.95, fw: 0.95, e: 'out' }], dum: ds }, { fx(A) {
    FX.ring(A, { t: tC, at: A.body(tC, 0.5), r0: 0.3, r1: 5.0, dur: 0.6, col: C.moon, op: 0.8, w: 0.14 }); FX.ring(A, { t: tC + 0.08, at: A.body(tC, 0.5), r0: 0.2, r1: 5.0, dur: 0.65, col: C.rose, op: 0.6, w: 0.1 });
    ds.forEach((p, i) => FX.sigil(A, { t0: tC + 0.3, t1: tC + 3.0, at: { d: i, y: 1.35 }, r: 0.16, op: 0.7, col: C.plum }));
    claw(A, 2.1, 1, 10, { back: true, bs: true, of: 'handR' }); claw(A, 2.6, 1, 10, { back: true, bs: true, roll: 0.95, of: 'handL' });
    cap(A, tC, 1.9, '一圈 5 u，没有伤害：4 秒内每个敌人都露出背', 'A ring, 5 u, no damage: every foe shows its back for 4 s'); cap(A, 1.95, 3.7, '从正面打也算背刺：10 → 18', 'A hit from the front is a backstab too: 10 → 18'); } });
}
// F22: no shield: he is Unseen 3 s, and his first hit out of it deals 40% more
{ const me = [-1.1, 0], d0 = [1.4, 0.2], d1 = [-0.3, 0.6]; const t0 = 0.3, tC = t0 + 0.2, tH = tC + 2.3; const b = behind(d0, me, 0.62);
  F.F22 = PH({ T: 3.8, cam: { x: 0.0, z: 0, w: 5.8 }, her: H(me[0], me[1]), seq: [[t0, 'wrap'], [t0 + 0.32, 'emerge', { from: 0.05 }], [tC + 0.9, 'walk', { loop: true, until: tH - 0.1 }], [tH - 0.1, 'clawBoth', { from: 0.04 }], [tH + 0.6, 'cape', { from: 0.1 }]],
    root: [{ t: tC + 0.9 }, { t: tH - 0.1, x: b[0], z: b[1], look: d0, e: 's' }], unseen: [[tC, tH + 0.05]], dum: [d0, d1] }, { fx(A) {
    FX.smoke(A, { t: tC, at: A.body(tC, 0), n: 14, r: 0.9, h: 0.6, size: 0.4, dur: 0.6, op: 0.6 });
    bolt(A, { t: tC + 0.4, d: 1, dur: 0.5, to: [-0.6, 0.6, -1.8] });
    const th = tH + 0.05; A.hit(0, th, 14, { back: true, big: true }); FX.claw(A, { t: th, at: { d: 0, y: 0.62 }, roll: -0.3, n: 4, size: 0.8, back: true }); FX.spark(A, { t: th, at: { d: 0, y: 0.6 }, r: 0.9, col: C.moon }); A.shake(th, 0.07, 0.2);
    cap(A, tC, tC + 1.0, '没有护盾：隐身 3 秒', 'No shield: Unseen 3 s'); cap(A, tC + 1.0, tH, '敌人找不到他', 'Foes cannot find him'); cap(A, tH, 3.7, '出隐身第一下 +40%：10 → 14，背刺 → 25', 'His first hit out of it: 40% more, 10 → 14, backstab → 25'); } });
}
// F23: it hangs 10 s; he returns Unseen 2 s
{ const tR = 2.7;
  F.F23 = PH(DEFS.F23, { def: { T: 5.0, unseen: [[tR + 0.12, tR + 2.12]] }, fx(A) {
    A.post((t, x, W, H2, k, lang) => { if (t < 0.62 || t > tR) return; x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = '#B98FD0'; x.fillText((lang === 'en' ? 'Shade ' : '影子 ') + Math.max(0, 10 - (t - 0.62)).toFixed(1) + 's', W - 14 * k, 28 * k); });
    cap(A, 0.62, 1.4, '影子挂 10 秒', 'The shade hangs 10 s'); cap(A, tR - 0.1, 4.9, '回去后隐身 2 秒', 'He returns Unseen 2 s'); } });
}
// F24: the mark keeps 50%; if the tear fells the foe, Death Mark is ready again
{ const d0 = [0.6, 0]; const t0 = 0.3, tS = t0 + 0.4, b = around(d0, 0, 0.55), tUp = tS + 0.35;
  const hits = [[tUp + 0.4, 12], [tUp + 1.1, 14], [tUp + 1.6, 14], [tUp + 2.1, 14]]; const tear = tUp + 0.4 + 3.0; const crit = (n) => Math.round(n * 1.8);
  const stored = Math.round(0.5 * hits.reduce((s, h) => s + crit(h[1]), 0));
  F.F24 = PH({ ...DEFS.F24, T: 5.4 }, { base: false, fx(A) { const T = A.THREE;
    FX.disc(A, { t: t0 + 0.05, at: [-1.6, 0, 0], r0: 0.3, r1: 0.7, dur: 0.6, col: C.ink, op: 0.9, normal: true }); FX.smoke(A, { t: t0 + 0.1, at: [-1.6, 0, 0], n: 10, r: 0.3, h: 0.3, size: 0.35, dur: 0.7, op: 0.6 });
    const sh = A.add(new T.Mesh(A.ringGeo, A.mat(C.ink, A.F.DISCN, { normal: true }))); A.fx((t) => { const a = t - tS + 0.1; sh.visible = a >= 0 && t < tUp + 0.5; if (!sh.visible) return; const k = EASE.out(clamp(a / 0.3)); sh.position.set(d0[0] + 0.35 * k, 0.013, d0[1]); sh.scale.set(0.35 + 0.5 * k, 1, 0.4); sh.material.uniforms.op.value = 0.85 * Math.min(1, (tUp + 0.5 - t) / 0.2); });
    FX.smoke(A, { t: tUp - 0.05, at: [b[0], 0, b[1]], n: 12, r: 0.25, h: 0.6, size: 0.35, dur: 0.7, op: 0.6 });
    FX.sigil(A, { t0: hits[0][0], t1: tear, at: (t) => { const p = A.dpt(0, t, 0.72); return [p.x + 0.29, p.y, p.z]; }, r: 0.26, op: 0.8, bright: (t) => hits.filter((h) => h[0] <= t).length * 0.25 });
    hits.forEach(([t, n], i) => claw(A, t, 0, n, { back: true, roll: [-0.4, -0.95, 0.95, 0.1][i], mark: i === 3 ? { n: 4 } : {} }));
    for (let i = 0; i < 4; i++) FX.claw(A, { t: tear + 0.02 * i, at: { d: 0, y: 0.62 }, roll: [-0.4, -0.95, 0.95, 0.1][i], n: 4, size: 0.62, pal: 'rose', life: 0.8 });
    A.hit(0, tear, stored, { big: true, col: C.moon, fell: true }); FX.ring(A, { t: tear, at: { d: 0, y: -0.58 }, r0: 0.2, r1: 1.3, dur: 0.5, col: C.rose, op: 0.8 }); FX.spark(A, { t: tear, at: { d: 0, y: 0.7 }, r: 1.0, col: C.rose }); A.shake(tear, 0.07, 0.22);
    A.post((t, x, W, H2, k, lang) => { if (t < hits[0][0] || t > tear + 0.6) return; const n = Math.round(0.5 * hits.filter((h) => h[0] <= t).reduce((s, h) => s + crit(h[1]), 0)); const left = Math.max(0, tear - t);
      x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.rose; x.fillText((lang === 'en' ? 'Mark ' : '死兆 ') + n + (left > 0 ? '  ' + left.toFixed(1) + 's' : ''), W - 14 * k, 28 * k); });
    A.hud(keysHud((t) => [['死兆', 'Death Mark', t < tUp ? 0 : t < tear + 0.1 ? 14 - (t - tUp) : 0]]));
    cap(A, tUp, tUp + 0.9, '从它的影子里站起：12 → 22（必暴击）', 'Up out of its shadow: 12 → 22 (sure crit)'); cap(A, tUp + 1.0, tear - 0.05, '印记存下 50%', 'The mark keeps 50%'); cap(A, tear, 5.3, '撕开：' + stored + '；它倒下，死兆立刻就绪', 'It tears: ' + stored + '; it falls, and Death Mark is ready again'); } });
}

// ================================================================ Kesh's picks (19 Nov, "use those"): these replace the forms above (R1a to R4a, DUSKWING_NEW_OPTIONS.md)
// each is shown beside the passed form; the passed form above is unchanged
const N = FORMS.ph2; const TK = '#E7A0A8';
// R1a F9: behind the foe with the most bleed within 4 u (else nearest the pointer); the bite also brings 2 s of its bleed out at once
{ const me = [-1.6, 0], d0 = [0.15, 0.55], d1 = [0.9, -0.5]; const t0 = 0.25, tS = 0.95, tG = tS + 0.14, tA = tG + 0.1; const b = behind(d1, me, 0.58), off = behind(d1, me, 1.15);
  const tb = tA + 0.21, tX = tb + 0.3, tL = tb + 0.62;
  N.F9 = PH({ T: 3.6, cam: { x: -0.2, z: 0, w: 5.2 }, her: H(me[0], me[1]), seq: [[t0, 'standFace'], [tS, 'sink', { speed: 1.7 }], [tA, 'castPlant', { from: 0.25, fade: 0.02 }], [tL, 'lick', { fade: 0.1 }], [tL + 0.5, 'cape', { from: 0.1 }]],
    root: [{ t: tG }, { t: tA, x: b[0], z: b[1], y: 0.16, look: d1, pitch: 12, cut: true }, { t: tb + 0.3, x: b[0], z: b[1], y: 0.16, look: d1, pitch: 12 }, { t: tL + 0.2, x: off[0], z: off[1], y: 0, look: d1, pitch: 0, e: 's' }],
    hide: [[tG, tA]], dum: [d0, d1] }, { fx(A) {
    // the far foe bleeds from the start (3 each half second); the pointer is on the near one
    A.status(1, 0, 'bleed', tX + 1.6, { rate: 7 }); for (const t of [0.2, 0.7]) A.hit(1, t, 3, { col: TK, noCombo: true });
    pointer(A, 0.05, tG + 0.1, 0, [1.4, 1.5]);
    FX.ring(A, { t: 0.55, at: [me[0], 0.03, me[1]], r0: 0.3, r1: 4.0, dur: 0.55, col: C.blood, op: 0.45, w: 0.06, normal: true });
    FX.thread(A, { t0: 0.6, t1: tG, from: { d: 1, y: 0.6 }, to: (t) => A.at('mouth', t), w: 0.018, per: 0.3 }); FX.sigil(A, { t0: 0.6, t1: tb, at: { d: 1, y: 1.4 }, r: 0.16, op: 0.75, col: C.blood });
    hop(A, tG, me, b, 0.1, 10); A.hit(1, tb, 26, { back: true, big: true }); FX.bite(A, { t: tb, at: { d: 1, y: 0.75 }, size: 0.55 }); A.shake(tb, 0.05, 0.16);
    // the wound is opened: two seconds of the bleed come out at once
    A.hit(1, tX, 12, { big: true, col: C.rose, noCombo: true }); FX.drops(A, { t: tX, at: { d: 1, y: 0.7 }, n: 22, sp: 2.4, up: 1.1, size: 0.06, dur: 0.7 });
    FX.ring(A, { t: tX, at: { d: 1, y: 0.7 }, r0: 0.1, r1: 0.75, dur: 0.35, col: C.rose, op: 0.7 }); drink(A, tX + 0.05, { d: 1, y: 0.7 }, 0, { drops: 7, hang: 0.2 });
    for (const t of [tX + 0.55, tX + 1.05, tX + 1.55]) A.hit(1, t, 3, { col: TK, noCombo: true });
    cap(A, 0.5, tG, '4 u 内流血最多的敌人（指针在别的敌人上）', 'The foe with the most bleed within 4 u (the pointer is on another)');
    cap(A, tG, tX, '闪到它背后咬伤口：26 → 47（必暴击）', 'He blinks behind it and bites the wound: 26 → 47 (sure crit)'); cap(A, tX, 3.5, '再把 2 秒的流血一次拿出：12', 'And 2 s of its bleed come out at once: 12'); } });
}
// R1b F14: black mist as passed; he gathers behind the foe that last hit him (in the last 3 s): a revenge claw 16, a backstab, then Unseen 1 s
{ const me = [-1.3, 0]; const ds = [[0.2, -0.45], [0.75, 0.55], [1.4, -0.1]]; const tB = 0.2, t0 = 0.75, t1 = t0 + 0.16, t2 = t1 + 1.5; const g = behind(ds[0], me, 0.6), tc = t2 + 0.16;
  N.F14 = PH({ T: tc + 1.6, cam: { x: 0.1, z: 0, w: 6.2 }, her: H(me[0], me[1]), seq: [[t0, 'wrap'], [t2, 'clawBoth', { from: 0.05, fade: 0.02 }], [tc + 0.6, 'cape', { from: 0.1 }]],
    root: [{ t: t1 }, { t: t2 - 0.12, fw: 2.1, e: 'lin' }, { t: t2, x: g[0], z: g[1], look: ds[0], cut: true }], hide: [[t1, t2]], unseen: [[tc + 0.05, tc + 1.05]], dum: ds }, { fx(A) {
    // a foe throws at him first; that foe is marked for 3 s
    bolt(A, { t: tB, d: 0, dur: 0.35, to: [me[0], 0.6, me[1]] }); A.say(tB + 0.36, '-8', { col: C.blood }); A.shake(tB + 0.36, 0.04, 0.12);
    FX.sigil(A, { t0: tB + 0.4, t1: tc, at: { d: 0, y: 1.4 }, r: 0.16, op: 0.8, col: C.rose });
    A.post((t, x, W, H2, k, lang) => { if (t < tB + 0.4 || t > tc) return; x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.rose; x.fillText((lang === 'en' ? 'Hit him ' : '打了他 ') + Math.max(0, 3 - (t - tB - 0.4)).toFixed(1) + 's', W - 14 * k, 28 * k); });
    pointer(A, 0.35, t1, 2, [2.4, 1.3]);
    FX.mist(A, { t0: t1 - 0.05, t1: t2 - 0.05, at: (t) => A.body(Math.min(t, t2 - 0.12), 0), r: 1.0, n: 26, h: 1.0, op: 0.6, col: '#1E1220', col2: C.plum });
    ds.forEach((p, i) => { for (let s = 0; s < 3; s++) { const ts = t1 + 0.25 + 0.5 * s; const r = A.rootAt(ts); if (Math.hypot(p[0] - r.x, p[1] - r.z) < 1.15) A.hit(i, ts + 0.03 * i, 4, { col: '#C9B6D6', blind: 1.0 }); } });
    FX.blink(A, { t: t2 - 0.12, dur: 0.12, from: A.body(t2 - 0.13, 0.45), to: [g[0], 0.45, g[1]], n: 8, size: 1.2 });
    A.hit(0, tc, 16, { back: true, big: true }); FX.claw(A, { t: tc, at: { d: 0, y: 0.62 }, roll: -0.3, n: 4, size: 0.75, back: true }); FX.spark(A, { t: tc, at: { d: 0, y: 0.6 }, r: 0.8, col: C.moon }); A.shake(tc, 0.06, 0.18);
    FX.smoke(A, { t: tc + 0.05, at: A.body(tc, 0.1), n: 10, r: 0.3, h: 0.6, size: 0.35, dur: 0.6, op: 0.55 });
    cap(A, tB, t1, '这个敌人刚打了他', 'This foe just hit him'); cap(A, t1, t2, '黑雾：里面的敌人致盲', 'Black mist: foes inside are blinded');
    cap(A, t2, tc + 1.5, '聚拢在打他的敌人背后，不是指针的：16 → 29，然后隐身 1 秒', 'He gathers behind the foe that hit him, not the pointer\'s: 16 → 29, then Unseen 1 s'); } });
}
// R1c F17: he swaps places with one foe within 4.5 u: it stands where he stood, turned away; he strikes its back: 22; 8 to the foes within 1.2 u of where he lands
{ const me = [-1.3, 0]; const ds = [[0.6, 0.05], [1.35, 0.6], [1.45, -0.55], [2.7, 0.15]]; const t0 = 0.22, tS = 0.5, tG = tS + 0.16, tA = tG + 0.14; const land = ds[0];
  const bk = [me[0] + 0.62, me[1]], tD = tA + 0.45, th = tD + 0.14, tF = th + 0.42;
  N.F17 = PH({ T: 3.6, cam: { x: 0.4, z: 0, w: 6.6, y: 0.6 }, her: H(me[0], me[1]), seq: [[t0, 'standFace'], [tS, 'sink', { speed: 1.6 }], [tA, 'emerge', { from: 0.07 }], [tD - 0.2, 'dart', { from: 0.1, speed: 1.4 }], [tD, 'clawBoth', { from: 0.05, fade: 0.02 }], [tF, 'cape', { from: 0.1 }]],
    root: [{ t: tG }, { t: tA, x: land[0], z: land[1], look: me, cut: true }, { t: tD - 0.2 }, { t: tD, x: bk[0] + 0.05, z: bk[1], look: me, e: 'out' }], hide: [[tG, tA]], dum: ds }, { fx(A) {
    pointer(A, 0.05, tG + 0.1, 0, [-0.4, 1.4]);
    // the swap: two lines of bats cross; the foe is set down where he stood, turned away from him
    FX.smoke(A, { t: tG - 0.04, at: A.body(tS, 0.1), n: 8, r: 0.25, h: 0.5, size: 0.35, dur: 0.4, op: 0.5 }); FX.smoke(A, { t: tG - 0.02, at: { d: 0, y: 0.2 }, n: 8, r: 0.3, h: 0.7, size: 0.4, dur: 0.4, op: 0.55 });
    hop(A, tG, me, land, 0.14, 12); FX.blink(A, { t: tG, dur: 0.14, from: [land[0], 0.7, land[1]], to: [me[0], 0.7, me[1]], n: 8, size: 1.1, puff: false });
    A.moveTo(0, tG, me, 0.14, 'lin'); A.turn(0, tG + 0.1, 180, 0.08);
    FX.ring(A, { t: tA, at: [land[0], 0.03, land[1]], r0: 0.2, r1: 1.2, dur: 0.35, col: C.rose, op: 0.7, normal: true }); A.shake(tA, 0.05, 0.14);
    ds.forEach((p, i) => { if (i && Math.hypot(p[0] - land[0], p[1] - land[1]) <= 1.2) { A.hit(i, tA + 0.03 + 0.02 * i, 8, { dir: [p[0] - land[0], p[1] - land[1]] }); FX.claw(A, { t: tA + 0.03, at: { d: i, y: 0.55 }, roll: 1.3, n: 3, size: 0.4, life: 0.6 }); } });
    A.hit(0, th, 22, { back: true, big: true }); FX.claw(A, { t: th, at: { d: 0, y: 0.62 }, roll: -0.3, n: 4, size: 0.75, back: true }); FX.claw(A, { t: th + 0.03, at: { d: 0, y: 0.6 }, roll: 0.35, n: 3, size: 0.6, back: true });
    FX.spark(A, { t: th, at: { d: 0, y: 0.6 }, r: 0.8, col: C.moon }); A.shake(th, 0.07, 0.2);
    cap(A, tG, tA + 0.4, '和 4.5 u 内一个敌人换位：它背对着他站在他原来的地方', 'He swaps places with a foe within 4.5 u: it stands where he stood, its back to him');
    cap(A, tA + 0.05, tD, '落点 1.2 u 内的敌人：8', 'The foes within 1.2 u of where he lands: 8'); cap(A, tD, 3.5, '打它的背：22 → 40（必暴击）。首领不换位：他出现在它背后，+20%', 'He strikes its back: 22 → 40 (sure crit). A boss is not swapped: he appears behind it, 20% more'); } });
}
// R2a F16: the eclipse as passed; when the Unseen ends, a black moon falls on the foe his first hit lands on: 24 within 2 u, blind 1 s
{ const ds = fan(6, 1.9, 0, 300, -0.3, 0); const t0 = 0.3, tC = t0 + 1.15, tW = tC + 0.6, tH = tC + 1.75, tM = tH + 0.4; const tgt = ds[0], st = [tgt[0] - 0.62, tgt[1]];
  N.F16 = PH({ T: tM + 1.4, cam: { x: -0.1, z: -0.2, w: 8.6, y: 0.9 }, her: H(-0.3, 0), seq: [[t0, 'moonRise'], [tW, 'walk', { loop: true, until: tH - 0.15, fade: 0.15 }], [tH - 0.15, 'clawR', { from: 0.02 }], [tH + 0.5, 'flip', { fade: 0.05 }], [tH + 1.0, 'cape', { from: 0.06 }]],
    root: [{ t: t0 + 0.2 }, { t: t0 + 0.9, y: 0.7, e: 'out' }, { t: tC, y: 0.75 }, { t: tC + 0.25, y: 0, e: 'in' }, { t: tW }, { t: tH - 0.15, x: st[0], z: st[1], look: tgt, e: 's' }, { t: tH + 0.5 }, { t: tH + 0.95, x: st[0] - 1.1, z: st[1], look: tgt, e: 'out' }],
    unseen: [[tC + 0.25, tH]], dum: ds }, { fx(A) {
    FX.moon(A, { t0: t0 + 0.3, t1: tH, at: (t) => { const r = A.rootAt(Math.min(t, tC + 0.3)); return [r.x, 1.9 + r.y * 0.4, r.z - 1.0]; }, r: 0.95, grow: 0.8, op: 0.95, eclipse: [t0 + 0.4, tC] });
    A.dark(tC - 0.05, tC + 2.0, 0.6, 0.1, 0.5, { eyes: true }); A.shake(tC, 0.07, 0.25);
    FX.ring(A, { t: tC + 0.02, at: [-0.3, 0, 0], r0: 0.3, r1: 4.0, dur: 0.55, col: C.plum, op: 0.9, w: 0.3, normal: true }); FX.ring(A, { t: tC + 0.12, at: [-0.3, 0, 0], r0: 0.2, r1: 4.0, dur: 0.5, col: C.rose, op: 0.6 });
    ds.forEach((p, i) => A.hit(i, tC + 0.1 + 0.015 * i, 20, { big: true, blind: 2.0 }));
    claw(A, tH, 0, 10, { back: true, bs: true, of: 'handR' });
    // the black moon drops from where it hung onto that foe
    const m0 = A.rootAt(tC + 0.3); FX.moon(A, { t0: tH, t1: tM + 0.05, at: (t) => { const u = EASE.in(clamp((t - tH) / (tM - tH))); return [lerp(m0.x, tgt[0], u), lerp(1.9 + m0.y * 0.4, 0.4, u), lerp(m0.z - 1.0, tgt[1], u)]; }, r: 0.95, grow: 0.01, op: 0.95, eclipse: [0, 0.01] });
    FX.ring(A, { t: tM, at: [tgt[0], 0.03, tgt[1]], r0: 0.3, r1: 2.0, dur: 0.45, col: C.plum, op: 0.95, w: 0.3, normal: true }); FX.ring(A, { t: tM + 0.05, at: [tgt[0], 0.4, tgt[1]], r0: 0.2, r1: 2.0, dur: 0.4, col: C.rose, op: 0.6 });
    FX.smoke(A, { t: tM, at: [tgt[0], 0.1, tgt[1]], n: 18, r: 1.2, h: 0.6, size: 0.5, dur: 0.9, op: 0.6, out: 0.3 }); FX.dust(A, { t: tM, at: [tgt[0], 0.03, tgt[1]], n: 10, sp: 1.6 }); A.shake(tM, 0.09, 0.28);
    ds.forEach((p, i) => { if (Math.hypot(p[0] - tgt[0], p[1] - tgt[1]) <= 2.0) A.hit(i, tM + 0.02 + 0.01 * i, 24, { big: i === 0, blind: 1.0 }); });
    cap(A, tC - 0.6, tC + 0.25, '日食', 'The eclipse'); cap(A, tC + 0.25, tH, '20 + 致盲 2 秒；他隐身', '20 and blind 2 s; he is Unseen');
    cap(A, tH, tM + 1.3, '出隐身第一下打中的敌人：黑月落下，2 u 内 24，致盲 1 秒', 'His first hit out of it: the black moon falls on that foe, 24 within 2 u, blind 1 s'); } });
}
// R2b F19: he flits to the nearest ally within 6 u (else 4.5 u away from the aim), Unseen 2 s; that ally's next hit within 2 s is a backstab: 20% more, no sure crit
{ const me = [0.3, 0], d0 = [1.15, 0.05], al = [-3.2, 0.5], t0 = 0.4, tL = t0 + 0.48; const sp = [al[0] + 0.7, al[1] - 0.15], tSh = t0 + 1.3;
  N.F19 = PH({ T: 3.6, cam: { x: -1.0, z: 0, w: 7.2 }, her: H(me[0], me[1]), seq: [[t0, 'flip'], [t0 + 0.5, 'emerge', { from: 0.07 }]],
    root: [{ t: t0 + 0.08 }, { t: t0 + 0.2, fw: -0.4, y: 0.35, pitch: -160, e: 'out' }, { t: t0 + 0.32, x: sp[0] + 0.2, z: sp[1], y: 0.35, pitch: -200, cut: true }, { t: tL, x: sp[0], z: sp[1], y: 0, pitch: -360, e: 'in' }],
    hide: [[t0 + 0.2, t0 + 0.32]], unseen: [[tL + 0.02, tL + 2.0]], dum: [d0, [al[0], al[1], { ally: true }]] }, { fx(A) {
    const p = A.body(t0 + 0.2, 0.1); FX.blink(A, { t: t0 + 0.2, dur: 0.12, from: A.body(t0 + 0.2, 0.4), to: [sp[0] + 0.2, 0.4, sp[1]], puff: false });
    FX.smoke(A, { t: t0 + 0.2, at: p, n: 26, r: 0.55, h: 0.9, size: 0.55, dur: 2.0, spread: 0.3, op: 0.7, rise: 0.15, out: 0.25 });
    bolt(A, { t: t0 - 0.1, d: 0, dur: 0.45, to: [-1.0, 0.6, 0] });
    FX.swarm(A, { t0: t0 + 0.22, t1: t0 + 2.2, at: [p.x, 0.15, p.z], r: 0.45, n: 8, w: 4, h: 0.7, size: 1.0, both: true, seed: 91 });
    for (let s = 0; s < 2; s++) A.hit(0, t0 + 0.6 + s, 4, { col: '#C9B6D6' }); A.status(0, t0 + 0.25, 'blind', 1.0);
    allyTag(A, 1); FX.ring(A, { t: tL, at: { d: 1, y: 0.03 }, r0: 0.2, r1: 0.8, dur: 0.4, col: '#A9C4E0', op: 0.6, normal: true });
    FX.sigil(A, { t0: tL + 0.05, t1: tSh + 0.2, at: { d: 1, y: 1.3 }, r: 0.14, op: 0.8, col: '#A9C4E0' });
    allyShot(A, tSh, 1, 0, 0.3); A.hit(0, tSh + 0.3, 12, { col: '#A9C4E0' });
    cap(A, t0 + 0.2, tSh, '掠到 6 u 内最近的队友身边，隐身 2 秒', 'He flits to the nearest ally within 6 u, Unseen 2 s');
    cap(A, tSh, 3.5, '队友 2 秒内下一击算背刺：10 → 12（+20%，不必暴击）', 'That ally\'s next hit within 2 s is a backstab: 10 → 12 (20% more, no sure crit)'); } });
}
// R2c F22: he folds into his wings 3 s; a hit thrown at him passes through (no damage, once) and marks the thrower; his first hit out blinks him behind it: 40% more, a backstab
{ const me = [-1.1, 0], d0 = [1.5, 0.25], d1 = [-0.2, 0.75]; const t0 = 0.3, tC = t0 + 0.2, tBo = tC + 0.5, tP = tBo + 0.28, tO = tC + 1.9, tA = tO + 0.12; const b = behind(d0, me, 0.62), th = tA + 0.14;
  N.F22 = PH({ T: th + 1.3, cam: { x: 0.1, z: 0, w: 5.8 }, her: H(me[0], me[1]), seq: [[t0, 'wrap'], [tO - 0.05, 'sink', { from: 0.3 }], [tA, 'clawBoth', { from: 0.05, fade: 0.02 }], [th + 0.55, 'cape', { from: 0.1 }]],
    root: [{ t: tO }, { t: tA, x: b[0], z: b[1], look: d0, cut: true }], hide: [[tO, tA]], dum: [d0, d1] }, { fx(A) {
    FX.smoke(A, { t: tC, at: A.body(tC, 0), n: 14, r: 0.9, h: 0.6, size: 0.4, dur: 0.6, op: 0.6 }); FX.shield(A, { t0: tC, t1: tO, r: 0.62, op: 0.32, col: C.plum, hits: [tP] });
    // the shot goes straight through him
    bolt(A, { t: tBo, d: 0, dur: 0.55, to: (() => { const p = A.body(tP, 0.6); return [p.x - 1.3, p.y, p.z - 0.15]; })() }); A.say(tP + 0.05, '0', { col: C.shield });
    FX.ring(A, { t: tP, at: A.body(tP, 0.6), r0: 0.2, r1: 0.7, dur: 0.3, col: C.shield, op: 0.7 });
    FX.sigil(A, { t0: tP + 0.15, t1: th, at: { d: 0, y: 1.4 }, r: 0.16, op: 0.8, col: C.rose }); FX.thread(A, { t0: tP + 0.1, t1: tP + 0.45, from: A.body(tP, 0.6), to: { d: 0, y: 0.7 }, w: 0.02, per: 0.25, col: C.plum });
    hop(A, tO, me, b, 0.12, 12);
    A.hit(0, th, 14, { back: true, big: true }); FX.claw(A, { t: th, at: { d: 0, y: 0.62 }, roll: -0.3, n: 4, size: 0.8, back: true }); FX.spark(A, { t: th, at: { d: 0, y: 0.6 }, r: 0.9, col: C.moon }); A.shake(th, 0.07, 0.2);
    cap(A, tC, tP, '收翼 3 秒', 'He folds into his wings, 3 s'); cap(A, tP, tO, '打向他的一击穿过去（不伤，一次），扔的敌人被标记', 'A hit thrown at him passes through (no damage, once); the thrower is marked');
    cap(A, tO, th + 1.2, '出翼第一下闪到它背后：+40%，背刺：10 → 14 → 25', 'His first hit out blinks him behind it: 40% more, a backstab: 10 → 14 → 25'); } });
}
// R2d F23: the return flies through the foes between him and the shade as bats, raking each back: 12, a backstab; he gathers Unseen 2 s
{ const ds = [[1.4, 0.15], [1.9, -0.5], [0.05, -0.35], [-0.85, 0.4]]; const t0 = 0.3, tH = t0 + 0.32, tR = 2.7, tE = tR + 0.42;
  N.F23 = PH({ T: 5.0, cam: { x: 0.1, z: 0, w: 6.4, y: 0.6 }, her: H(-1.8, 0), seq: [[t0, 'kickUp'], [tH, 'idle', { fade: 0.15 }], [tH + 0.3, 'run', { loop: true, until: 1.5 }], [1.5, 'clawR'], [2.05, 'clawL'], [tE, 'emerge', { from: 0.07 }]],
    root: [{ t: tH + 0.3 }, { t: 1.5, fw: 2.55, e: 's' }, { t: tR }, { t: tE, fw: 0, cut: true }], hide: [[tR, tE]], unseen: [[tE, tE + 2.0]], dum: ds, keepClaws: true }, { fx(A) {
    const spot = A.rootAt(tH); A.ghost((t) => (t >= tH && t < tE ? [{ clip: 'hang', ct: t, root: { x: spot.x, z: spot.z, y: 0.95, yaw: spot.yaw, pitch: Math.PI, roll: 0 }, op: 0.55, tint: C.plum, col: C.plum, glow: 0.25 }] : []));
    FX.smoke(A, { t: tH, at: A.body(tH, 0.6), n: 8, r: 0.25, size: 0.3, dur: 0.6, op: 0.5 });
    claw(A, 1.65, 0, 10, { of: 'handR' }); claw(A, 2.2, 1, 10, { roll: 0.95, of: 'handL' });
    const from = A.rootAt(tR - 0.02); FX.blink(A, { t: tR, dur: tE - tR, from: [from.x, 0.55, from.z], to: [spot.x, 0.55, spot.z], n: 18, size: 1.5 });
    [2, 3].forEach((i) => { const u = (from.x - ds[i][0]) / (from.x - spot.x), t = tR + (tE - tR) * u; A.hit(i, t, 12, { back: true, dir: [-1, 0] }); FX.claw(A, { t, at: { d: i, y: 0.6 }, roll: 1.4, n: 3, size: 0.55, back: true }); FX.drops(A, { t, at: { d: i, y: 0.6 }, n: 6, sp: 1.0, up: 0.5, dir: [-1, 0] }); });
    FX.smoke(A, { t: tE - 0.02, at: [spot.x, 0.2, spot.z], n: 10, r: 0.3, h: 0.7, size: 0.4, dur: 0.5, op: 0.55 });
    A.post((t, x, W, H2, k, lang) => { if (t < 0.62 || t > tR) return; x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = '#B98FD0'; x.fillText((lang === 'en' ? 'Shade ' : '影子 ') + Math.max(0, 10 - (t - 0.62)).toFixed(1) + 's', W - 14 * k, 28 * k); });
    cap(A, tH, tR, '影子挂 10 秒', 'The shade hangs 10 s'); cap(A, tR, tE + 0.6, '化作蝙蝠飞回影子，路上抓每个敌人的背：12 → 22', 'He flies back to it as bats, raking the back of each foe on the way: 12 → 22');
    cap(A, tE + 0.6, 4.9, '回去后隐身 2 秒', 'He gathers Unseen 2 s'); } });
}
// R3a F13: the spike ring holds one foe and opens its back to the team: the first hit any hero lands on it within 3 s deals 40% more (his is a backstab)
{ const me = [-1.8, 0], d0 = [0.6, 0], al = [-0.6, 1.5]; const t0 = 0.3, tS = t0 + 0.36, tC = tS + 0.3, tSh = tC + 0.45; const b = around(d0, 0, 0.62);
  N.F13 = PH({ T: 3.6, cam: { x: -0.4, z: 0.2, w: 5.8 }, her: H(me[0], me[1]), seq: [[t0, 'floorStab'], [tC + 0.55, 'run', { loop: true, until: tC + 1.05 }], [tC + 1.05, 'clawR'], [tC + 1.45, 'clawL']],
    root: [{ t: tC + 0.55 }, { t: tC + 0.8, x: 0.2, z: 0.7, e: 's' }, { t: tC + 1.05, x: b[0], z: b[1], look: d0, e: 's' }], dum: [d0, [al[0], al[1], { ally: true }]], keepClaws: true }, { fx(A) {
    A.shake(tS, 0.05, 0.16); FX.ring(A, { t: tS, at: A.ahead(tS, 0.5, 0), r0: 0.1, r1: 0.6, dur: 0.3, col: C.blood, op: 0.7, normal: true });
    for (let k = 0; k < 12; k++) { const a = k * 30 * D2R; for (const rr of [1.3, 0.75]) { const ts = tS + (rr > 1 ? 0.0 : 0.15) + 0.01 * k; FX.spike(A, { t: ts, at: [d0[0] + Math.cos(a) * rr, 0, d0[1] + Math.sin(a) * rr], h: rr > 1 ? 0.5 : 0.8, w: 0.9, life: 1.5, tilt: [-Math.sin(a) * 0.5, Math.cos(a) * 0.5], burst: k % 3 === 0 }); } }
    A.hit(0, tC, 16, { big: true }); A.status(0, tC, 'stun', 1.2); FX.sigil(A, { t0: tC + 0.05, t1: tSh + 0.3, at: { d: 0, y: 1.4 }, r: 0.17, op: 0.85, col: C.rose });
    allyTag(A, 1); allyShot(A, tSh, 1, 0, 0.25); A.hit(0, tSh + 0.25, 14, { col: '#A9C4E0', big: true });
    claw(A, tC + 1.2, 0, 10, { back: true, bs: true, of: 'handR' }); claw(A, tC + 1.6, 0, 10, { back: true, bs: true, roll: 0.95, of: 'handL' });
    cap(A, tS, tSh, '血棘圈困住一个敌人：16，困 1.2 秒；它的背向全队敞开 3 秒', 'The spike ring holds one foe: 16, held 1.2 s; its back is open to the team for 3 s');
    cap(A, tSh, tC + 1.15, '任何英雄打它的第一下 +40%：队友 10 → 14', 'The first hit any hero lands on it deals 40% more: the ally\'s 10 → 14'); cap(A, tC + 1.15, 3.5, '之后他从背后打：背刺 10 → 18', 'After that, his hits from behind: a backstab, 10 → 18'); } });
}
// R3b F21: the screech finds the weakest foe within 6 u: only it is marked, 5 s; his hits on it are backstabs from any side and deal 30% more; no damage
{ const ds = [[-0.4, 0.7], [0.3, -0.55], [1.0, 0.45]]; const hp = [0.9, 0.75, 0.28]; const me = [-1.9, 0]; const t0 = 0.3, tC = t0 + 0.42, tF = tC + 0.5;
  N.F21 = PH({ T: 3.9, cam: { x: -0.4, z: 0, w: 6.0 }, her: H(me[0], me[1]), seq: [[t0, 'castPoint'], [1.6, 'walk', { loop: true, until: 2.05 }], [2.05, 'clawR'], [2.55, 'clawL']],
    root: [{ t: 1.6 }, { t: 2.05, x: ds[2][0] - 0.66, z: ds[2][1] - 0.05, look: ds[2], e: 's' }], dum: ds, keepClaws: true }, { fx(A) {
    const T = A.THREE, v = new T.Vector3(); A.post((t, x, W, H2, k) => { ds.forEach((p, i) => { if (A.card.dum[i].fellT != null) return; v.copy(A.dpt(i, t, 1.45)).project(A.cam); const px = (v.x + 1) / 2 * W, py = (1 - v.y) / 2 * H2, w = 34 * k, h = 4 * k;
      x.fillStyle = 'rgba(20,11,18,0.7)'; x.fillRect(px - w / 2 - k, py - k, w + 2 * k, h + 2 * k); x.fillStyle = '#B8141F'; x.fillRect(px - w / 2, py, w * hp[i], h); }); });
    FX.ring(A, { t: tC, at: A.body(tC, 0.5), r0: 0.3, r1: 6.0, dur: 0.7, col: C.moon, op: 0.6, w: 0.08 });
    FX.thread(A, { t0: tF - 0.1, t1: tF + 0.25, from: (t) => A.at('mouth', t), to: { d: 2, y: 0.8 }, w: 0.02, per: 0.25, col: C.moon });
    FX.ring(A, { t: tF, at: { d: 2, y: 0.8 }, r0: 0.1, r1: 0.6, dur: 0.35, col: C.rose, op: 0.8 }); FX.sigil(A, { t0: tF, t1: 3.85, at: { d: 2, y: 1.7 }, r: 0.17, op: 0.85, col: C.rose });
    A.post((t, x, W, H2, k, lang) => { if (t < tF || t > 3.85) return; x.font = font(k, 15); x.textAlign = 'right'; x.fillStyle = C.rose; x.fillText((lang === 'en' ? 'Marked ' : '标记 ') + Math.max(0, 5 - (t - tF)).toFixed(1) + 's', W - 14 * k, 28 * k); });
    claw(A, 2.2, 2, 13, { back: true, bs: true, of: 'handR' }); claw(A, 2.7, 2, 13, { back: true, bs: true, roll: 0.95, of: 'handL' });
    cap(A, tC, 2.0, '尖啸找到 6 u 内最弱的敌人：只标记它，5 秒，没有伤害', 'The screech finds the weakest foe within 6 u: only it is marked, 5 s, no damage');
    cap(A, 2.05, 3.8, '从正面也算背刺，+30%：10 → 13 → 23', 'From the front it is a backstab too, 30% more: 10 → 13 → 23'); } });
}
// R4a F6: he sinks into his own shadow and rises out of the floor under the foe, wraps it in his wings and mauls: 10 on the rise, held 1 s, five hits of 4, every hit a backstab
{ const me = [-2.0, 0], d0 = [0.6, 0]; const t0 = 0.3, tS = t0 + 0.2, tU = tS + 0.55, tl = tU + 0.28; const b = behind(d0, me, 0.42);
  N.F6 = PH({ T: 3.6, cam: { x: -0.4, z: 0, w: 5.6, y: 0.6 }, her: H(me[0], me[1]), seq: [[t0, 'sink'], [tU, 'riseBehind', { fade: 0.02, speed: 1.3 }], [tl, 'maul'], [tl + 0.95, 'flip'], [tl + 1.45, 'emerge', { from: 0.07 }]],
    root: [{ t: t0 + 0.1 }, { t: tS, y: -1.0, e: 'in' }, { t: tU, x: b[0], z: b[1], y: -0.9, look: d0, cut: true }, { t: tl, x: b[0], z: b[1], y: 0.42, look: d0, e: 'out' }, { t: tl + 0.95, x: b[0], z: b[1], y: 0.42, look: d0 }, { t: tl + 1.4, x: b[0] + 1.0, z: b[1], y: 0, jump: 0.8, pitch: -360, look: d0, e: 'lin' }],
    hide: [[tS, tU]], dum: [d0] }, { fx(A) {
    FX.disc(A, { t: t0 + 0.05, at: [me[0], 0, me[1]], r0: 0.3, r1: 0.7, dur: 0.5, col: C.ink, op: 0.9, normal: true });
    // his shadow runs across the floor to the foe's feet
    for (let k = 0; k <= 8; k++) { const u = k / 8; FX.disc(A, { t: tS + (tU - tS) * u - 0.05, at: [lerp(me[0], d0[0], u), 0, lerp(me[1], d0[1], u)], y: 0.012, r0: 0.25, r1: 0.42, dur: 0.3, col: C.ink, op: 0.8, normal: true }); }
    FX.disc(A, { t: tU - 0.08, at: [d0[0], 0, d0[1]], r0: 0.3, r1: 0.75, dur: 0.5, col: C.ink, op: 0.95, normal: true });
    A.hit(0, tU + 0.06, 10, { back: true, big: true, up: 0.25 }); A.status(0, tU + 0.06, 'stun', 1.0); FX.ring(A, { t: tU + 0.04, at: [d0[0], 0.03, d0[1]], r0: 0.2, r1: 0.9, dur: 0.35, col: C.plum, op: 0.85, normal: true }); A.shake(tU + 0.06, 0.06, 0.18);
    FX.smoke(A, { t: tl, at: { d: 0, y: 0.4 }, n: 12, r: 0.5, h: 0.6, size: 0.4, dur: 0.9, op: 0.55, col: C.ink });
    for (let i = 0; i < 5; i++) { const tc = tl + 0.08 + (i < 4 ? 0.16 * i : 0.78); claw(A, tc, 0, 4, { back: true, bs: true, size: i === 4 ? 0.6 : 0.42, roll: i === 4 ? 0 : i % 2 ? 0.9 : -0.9, y: 0.75, mark: i === 4 ? { n: 4 } : {}, of: i % 2 ? 'handL' : 'handR' }); }
    cap(A, tS, tU, '沉进自己的影子', 'He sinks into his own shadow'); cap(A, tU, tl + 0.1, '从敌人脚下的地里升起：10 → 18', 'He rises out of the floor under it: 10 → 18');
    cap(A, tl + 0.1, 3.5, '用翅膀裹住它，困 1 秒：五下 4 → 7，每一下都是背刺', 'He wraps it in his wings, held 1 s: five hits of 4 → 7, every hit a backstab'); } });
}
// the picks are the styles now
Object.assign(F, N);

// the dash forms keep the passed dash body: no knee bend (19 Nov knees)
if (F.D) F.D.noKnee = true;
