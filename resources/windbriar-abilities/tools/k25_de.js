// ---------------------------------------------------------------- kit 2.5 (19 Nov): the new and changed style forms, built as "New, not passed"
const CRIM = '#B8141F';
const V3b = (A, v) => (v && v.isVector3 ? v.clone() : new A.THREE.Vector3(v[0], v[1], v[2]));
const at0 = (A, i, t, y = 0) => { const p = A.dpos(i, t); return new A.THREE.Vector3(p.x, p.y + y, p.z); };
const herAt = (A, t, y = 0) => { const r = A.rootAt(t); return new A.THREE.Vector3(r.x, y, r.z); };
// a foe's shot: a small Foe Crimson ball with a short tail; o.stop (0..1) is where it stops (caught or blocked)
const foeShot = (A, o) => { const T = A.THREE, m = A.add(new T.Mesh(new T.SphereGeometry(o.r || 0.08, 10, 8), new T.MeshBasicMaterial({ color: CRIM }))); m.visible = false;
  const tr = A.add(new T.Mesh(A.streakGeo, A.mat(CRIM, A.F.STREAK))); tr.visible = false; const us = o.stop != null ? o.stop : 1;
  A.fx((t) => { const a = t - o.t, u = a / o.dur; m.visible = tr.visible = a >= 0 && u <= us + (o.linger || 0); if (!m.visible) return;
    const f = V3b(A, typeof o.from === 'function' ? o.from(o.t) : o.from), e = V3b(A, typeof o.to === 'function' ? o.to(o.t + o.dur) : o.to); const uu = Math.min(u, us);
    const p = f.clone().lerp(e, uu); if (o.ride && u > us) p.copy(V3b(A, o.ride(t))); m.position.copy(p); const q = f.clone().lerp(e, Math.max(0, uu - 0.12)); const L = p.distanceTo(q);
    if (L > 0.02 && u <= us) { tr.position.copy(q); tr.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); tr.scale.set(0.09, 0.09, L); tr.material.uniforms.op.value = 0.55; } else tr.visible = false; }); };
// a foe winding up: a Foe Crimson wedge on the floor growing from it toward a point; broken = it shatters at tb
const windup = (A, i, t0, t1, toward, o = {}) => { const T = A.THREE, p0 = A.dpos(i, t0), d = new T.Vector3(toward[0] - p0.x, 0, toward[1] - p0.z).normalize(), L = o.len || 1.5;
  FXk.tube(A, { t: t0, dur: t1 - t0, hold: o.hold || 0, out: 0.08, flat: true, w: (u) => 0.12 + 0.55 * u, col: CRIM, op: 0.5, e: 'lin', pts: () => [new T.Vector3(p0.x + d.x * 0.3, 0.03, p0.z + d.z * 0.3), new T.Vector3(p0.x + d.x * L, 0.03, p0.z + d.z * L)] });
  if (o.broke != null) { const c = new T.Vector3(p0.x + d.x * L * 0.6, 0.05, p0.z + d.z * L * 0.6); FXk.dust(A, { t: o.broke, at: c, n: 7, col: CRIM, r: 0.08, op: 0.7, sp: 1.8, dur: 0.35 }); FXk.ring(A, { t: o.broke, at: [p0.x, 0, p0.z], r0: 0.2, r1: 0.9, dur: 0.25, w: 0.2 }); } };
// a straight jade thread on (or above) the floor between two points
const thread = (A, a, b, t, o = {}) => FXk.tube(A, { t, dur: o.dur || 0.12, hold: o.hold || 1, out: o.out || 0.3, r: o.r || 0.018, op: o.op || 0.8, col: o.col, e: 'lin', pts: () => { const p = V3b(A, typeof a === 'function' ? a() : a), q = V3b(A, typeof b === 'function' ? b() : b); const m = p.clone().lerp(q, 0.5); m.y -= o.sag || 0; return [p, m, q]; } });
const standFeather = (A, t, at, dur) => FXk.stuck(A, { t, dur, at: [at[0], 0.32, at[2]], dir: [0.02, -1, 0], shiver: true });
const capOnly = (A, fn, caps) => { const keep = A.cap; A.cap = () => {}; fn(A); A.cap = keep; caps.forEach((c) => A.cap(...c)); };

// ------------------------------------------------ Deadeye 穿杨
// DE1 Flank: the line pierces (30); a foe struck in its side or back takes 45
DE.F1 = { T: 2.8, cam: { x: 0.4, z: 0, w: 7.2 }, her: H(-2.6), seq: [[0.3, 'sPierce']], root: [{ t: 0.3 }, { t: 0.46, sd: -0.45, e: 'out' }], hops: [[0.3, 0.46, 0.05]],
  dum: [[-0.6, 0.15, { face: 270 }], [0.9, -0.2, { face: 90 }], [2.3, 0.15, { face: 0 }]],
  fx(A) { const T = A.THREE, t0 = 0.56, end = (A2) => fwdPt(A2, t0, 5.6, 0.6);
    FXa(A, { t: t0, dur: 0.24, to: end(A), len: 1.4, glow: A.C.jade, pierce: [{ d: 0, n: 30 }, { d: 1, n: 45, big: true }, { d: 2, n: 45, big: true }] });
    FXk.trail(A, { of: 'tipA', t0: 0.58, t1: 0.8, len: 0.12, w: 0.06, op: 0.45 });
    // a pale arc lights on each foe's back as the arrow passes; a flank hit throws a small spark ring
    [[1, 270], [2, 180]].forEach(([i, back]) => { const dm = A.card.dum[i], a = back * Math.PI / 180, u = (dm.x + 2.6) / 5.6, th = t0 + 0.24 * A.clamp(u);
      FXk.ring(A, { t: th - 0.05, dur: 0.4, at: [dm.x + Math.sin(a) * 0.3, 0.75, dm.z + Math.cos(a) * 0.3], r0: 0.12, r1: 0.4, w: 0.3, op: 0.75, dir: () => new T.Vector3(Math.sin(a), 0, Math.cos(a)) });
      FXk.spark(A, { t: th, at: { d: i }, r: 0.16, col: A.C.jade }); FXk.ring(A, { t: th, dur: 0.3, at: [dm.x, 0.02, dm.z], r0: 0.2, r1: 0.7, w: 0.2 }); });
    A.cap(0.4, 2.6, '正面 30；侧面、背后 45', 'Front 30; side or back 45'); } };

// DE2 Sweet spot: a full draw lets go late (48); the second lets go at the glint: 77, stagger, a frozen beat
DE.F2 = { T: 5.0, cam: { x: 0.6, z: 0, w: 7.6 }, her: H(-2.8), seq: [[0.3, 'sPower', { speed: 0.9 }], [2.5, 'sPower', { speed: 1.0 }]], root: [{ t: 1.41 }, { t: 1.66, fw: -0.3, e: 'out' }, { t: 2.5, fw: -0.3 }, { t: 3.5 }, { t: 3.76, fw: -0.6, e: 'out' }],
  dum: [[1.6, 0.05], [2.4, -0.4]],
  fx(A) { const T = A.THREE; const shot = (s, tL, sweet) => { const head = (t) => { const n = A.at('nock', t), f = A.fwd(t); return new T.Vector3(n.x + f.x * 0.55, n.y, n.z + f.z * 0.55); };
      FXk.suck(A, { t0: s + 0.12, t1: tL - 0.04, at: (t) => A.at('nock', t), r: 1.4, n: 10, y: 0.03, lift: 1 });
      // the ring closing on the arrowhead: it meets the head at the window
      const tw = tL - (sweet ? 0.02 : 0.25); FXk.ring(A, { t: s + 0.2, dur: tw - s - 0.2, at: head, r0: 0.9, r1: 0.1, e: 'lin', w: 0.18, op: 0.6, dir: () => A.fwd(tL) });
      FXk.spark(A, { t: tw, at: head, r: 0.16, col: A.C.parch, dur: 0.14 });
      FXa(A, { t: tL, dur: 0.22, to: { d: 0 }, len: 2.0, scale: 1.3, w: 0.14, glow: A.C.jade, hits: [{ d: 0, n: sweet ? 77 : 48, big: true, stop: sweet, stun: sweet ? 0.5 : 0, knock: sweet ? [0.35, 0] : null }] });
      FXk.tunnel(A, { t: tL, dur: 0.22, n: 6, r: 0.45, from: () => A.at('nock', tL), to: () => at0(A, 0, tL, 0.55), life: 0.45 });
      if (sweet) { FXk.ring(A, { t: tL, at: (t) => A.at('nock', tL), r0: 0.1, r1: 0.9, dur: 0.25, w: 0.35, col: A.C.parch, dir: () => A.fwd(tL) }); A.shake(tL + 0.22, 0.07, 0.25); } };
    shot(0.3, 1.41, false); shot(2.5, 3.5, true);
    A.cap(0.3, 2.3, '满弦后才松手：48', 'Let go after the full draw: 48'); A.cap(2.5, 4.8, '闪光时松手：77，硬直 0.5 秒', 'Let go at the glint: 77, stagger 0.5 s'); } };

// DE3 Bounty: the mark (18, 5 s); when the foe falls to anyone, every cooldown of hers drops 3 s
DE.F3 = { T: 4.0, cam: { x: 0.3, z: 0, w: 6.8 }, her: H(-2.4), seq: [[0.3, 'sMark'], [1.6, 'combo1'], [2.2, 'combo2']],
  dum: [[1.5, 0.1], [2.6, -0.8]],
  fx(A) { const T = A.THREE, tL = 0.86; FXk.trail(A, { of: 'handR', t0: 0.36, t1: 0.52, len: 0.14, w: 0.05, op: 0.6 });
    FXa(A, { t: tL, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 18 }] }); FXk.reticle(A, { t: tL + 0.1, d: 0, dur: 2.65 - tL });
    FXa(A, { t: 1.82, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 16 }] }); FXa(A, { t: 2.42, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 16, big: true }] }); FXk.fell(A, { t: 2.6, d: 0 });
    // the payout: the three feathers fly to her bow
    for (let k = 0; k < 3; k++) { const t0 = 2.68 + k * 0.05; FXk.trail(A, { of: (t) => { const u = A.clamp((t - t0) / 0.35), p = at0(A, 0, 2.6, 1.2), h = A.at('handL', t); const q = p.clone().lerp(h, A.EASE.in(u)); q.y += 0.6 * 4 * u * (1 - u); q.z += (k - 1) * 0.3 * Math.sin(u * Math.PI); return q; }, t0, t1: t0 + 0.35, len: 0.14, w: 0.07, op: 0.8 }); }
    FXk.ring(A, { t: 3.05, at: 'her', r0: 0.2, r1: 1.0, dur: 0.35, w: 0.25 }); FXk.spark(A, { t: 3.05, at: (t) => A.at('handL', 3.05), r: 0.14, col: A.C.jade });
    A.cap(0.4, 2.6, '悬赏 5 秒，受伤 +30%', 'Bounty 5 s, takes 30% more'); A.cap(2.6, 3.9, '它倒下：她每个技能冷却 −3 秒', 'It falls: every cooldown of hers drops 3 s'); } };

// DE4 Pain link: the pin and the tie; for 4 s half of what one tied foe takes, the other takes too (jade numbers)
DE.F4 = { ...DEFS.F4, T: 4.2, seq: [[0.3, 'sPin'], [1.5, 'combo1'], [2.1, 'combo2'], [2.8, 'combo1']],
  fx(A) { capOnly(A, DEFS.F4.fx, []); const T = A.THREE; const tie = () => { const a = A.dpos(0, 1), b = A.dpos(1, 1); return [new T.Vector3(a.x - 0.3, 0.32, a.z), new T.Vector3(b.x, 0.6, b.z)]; };
    thread(A, () => tie()[0], () => tie()[1], 0.95, { hold: 3.0, op: 0.55, r: 0.022 });
    [[1.72, 12], [2.32, 12], [3.02, 12]].forEach(([tr, n]) => { const th = tr + 0.12; FXa(A, { t: tr, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n }] });
      A.hit(1, th + 0.1, n / 2, { col: A.C.jade }); FXk.spark(A, { t: th + 0.02, at: () => tie()[0].clone().lerp(tie()[1], 0.5), r: 0.13, col: A.C.jade });
      FXk.ring(A, { t: th + 0.02, at: () => tie()[0].clone().lerp(tie()[1], 0.5), r0: 0.05, r1: 0.5, dur: 0.25, w: 0.3, dir: () => new T.Vector3(1, 0, 0) }); });
    A.cap(0.8, 1.6, '钉住并连在一起', 'Pinned and tied'); A.cap(1.6, 4.0, '4 秒：一个受到的伤害，另一个也受一半', 'For 4 s: half of what one takes, the other takes too'); } };

// DE5 Split the shaft: four full draws of 8 into the same spot; the fifth splits them: 30, knocked back 1.5 u
DE.F5 = { T: 4.2, cam: { x: 0.4, z: 0, w: 6.8 }, her: H(-2.4), seq: [0, 1, 2, 3, 4].map((i) => [0.3 + i * 0.55, 'combo1', { speed: 0.85, fade: 0.06 }]),
  dum: [[1.6, 0.05]],
  fx(A) { const T = A.THREE; for (let i = 0; i < 4; i++) { const tL = 0.3 + i * 0.55 + 0.26; FXa(A, { t: tL, dur: 0.12, to: { d: 0, y: 0.62, dz: 0, dx: 0 }, stick: 2.7 - tL, len: 0.6, hits: [{ d: 0, n: 8 }] }); FXk.ring(A, { t: tL + 0.12, at: (t) => at0(A, 0, t, 0.62), r0: 0.05, r1: 0.25, dur: 0.18, w: 0.4, dir: () => new T.Vector3(1, 0, 0) }); }
    const t5 = 0.3 + 4 * 0.55 + 0.26; FXa(A, { t: t5, dur: 0.12, to: { d: 0, y: 0.62 }, len: 1.2, glow: A.C.jade, hits: [{ d: 0, n: 30, big: true, stop: true, knock: [1.5, 0], kdur: 0.3 }] });
    // the four split shafts burst out like petals
    [[0, 1], [0, -1], [1, 0.6], [1, -0.6]].map(([y, z]) => [-0.4, y * 0.6 - 0.1, z * 0.5]).forEach((d, k) => FXa(A, { t: t5 + 0.12, dur: 0.22, from: () => at0(A, 0, t5 + 0.12, 0.62), to: () => at0(A, 0, t5 + 0.12, 0.62).add(new T.Vector3(...d).multiplyScalar(1.6)), len: 0.5, scale: 0.6, w: 0.06, ease: 'out' }));
    FXk.spark(A, { t: t5 + 0.12, at: () => at0(A, 0, t5 + 0.12, 0.62), r: 0.2, col: A.C.parch }); A.shake(t5 + 0.12, 0.05, 0.2);
    A.cap(0.4, 2.6, '四次满弦射同一点：各 8', 'Four full draws into one spot: 8 each'); A.cap(2.6, 4.0, '第五箭劈开它们：30，击退 1.5 u', 'The fifth splits them: 30, knocked back 1.5 u'); } };

// DE6 Execute: a small foe under 15% falls outright; a boss under 30% takes triple (72)
DE.F6 = { T: 4.4, cam: { x: 0.5, z: 0, w: 7.2 }, her: H(-2.4), seq: [[0.3, 'sKill'], [2.2, 'sKill']], root: [{ t: 0.3, spin: -60 }, { t: 0.55, spin: 0 }, { t: 2.0, spin: 0 }, { t: 2.2, spin: -60 }, { t: 2.45, spin: 18 }],
  dum: [[1.2, -0.5], [2.6, 0.9, { big: true }]],
  fx(A) { for (const [s, d] of [[0.3, 0], [2.2, 1]]) { FXk.toss(A, { t0: s + 0.1, t1: s + 0.31, from: (t) => A.at('handR', t), to: (t) => A.at('nock', t), arc: 0.75, spin: 2.5 }); FXk.dim(A, { t: s + 0.32, d, dur: 0.3, r: d ? 1.8 : 1.4 });
      FXa(A, { t: s + 0.48, dur: 0.1, to: { d }, len: 1.6, w: 0.08, col: A.C.parch, stick: d ? 1.1 : 0.9, hits: [{ d, n: d ? 72 : null, big: true, stop: true, crit: false }] }); }
    // the felled foe stands pinned a beat, then folds
    FXk.ring(A, { t: 0.88, at: { d: 0 }, r0: 0.6, r1: 0.1, e: 'in', dur: 0.2, w: 0.3 }); FXk.fell(A, { t: 1.15, d: 0 });
    A.cap(0.4, 2.0, '小怪、精英血量低于 15%：直接倒下', 'A small foe or elite under 15%: it falls'); A.cap(2.1, 4.2, '冠军、首领低于 30%：三倍，72', 'A champion or boss under 30%: triple, 72'); } };

// DE7 Push-back: the stance; each shot knocks its foe back 0.6 u and slows it; a foe walking in never gets close
DE.F7 = { ...DEFS.F7, dum: [[1.6, 0.05], [2.4, -1.0]],
  fx(A) { const T = A.THREE; FXk.tube(A, { t: 0.75, dur: 0.15, hold: 2.5, out: 0.2, flat: true, w: 0.05, op: 0.45, e: 'lin', pts: (A2) => { const n = A2.at('nock', 1.0), f = A2.fwd(1.0); return [new T.Vector3(n.x + f.x * 0.4, 0.03, n.z + f.z * 0.4), new T.Vector3(n.x + f.x * 7.3, 0.03, n.z + f.z * 7.3)]; } });
    const shots = [0.9, 1.52, 2.14, 2.76].map((s) => s + 0.28);
    // the foe walks in between shots; each shot skids it back
    A.moveTo(1, 0.5, [1.8, -0.4], 0.9, 'lin'); shots.forEach((tL, k) => { const d = k % 2 ? 1 : 0; if (k < 3) A.move(d, tL + 0.22, [-0.55, 0], 0.5, 'lin');
      FXa(A, { t: tL, dur: 0.16, to: { d }, len: 1.1, hits: [{ d, n: 19, knock: [0.6, 0], kdur: 0.25, slow: 0.5 }] }); FXk.dust(A, { t: tL + 0.18, at: () => at0(A, d, tL + 0.3), n: 5, dir: [1, 0], sp: 1.2 }); });
    A.cap(0.8, 3.4, '每一箭：击退 0.6 u，减速 50%（0.5 秒）', 'Each shot: knocked 0.6 u back, slowed 50% for 0.5 s'); } };

// DE9 Interrupt: three foes winding up; three snap shots break the three wind-ups: 20 each
DE.F9 = { T: 2.8, cam: { x: 0.2, z: 0, w: 7.0 }, her: H(-2.4), seq: [[0.3, 'combo1', { speed: 1.7 }], [0.62, 'combo1', { speed: 1.7, fade: 0.04 }], [0.94, 'combo1', { speed: 1.7, fade: 0.04 }]],
  root: [{ t: 0.3, spin: -22 }, { t: 0.56, spin: -22 }, { t: 0.62, spin: 0 }, { t: 0.88, spin: 0 }, { t: 0.94, spin: 22 }, { t: 1.4, spin: 22 }, { t: 1.7, spin: 0 }],
  dum: [[1.0, 1.4], [1.8, 0.0], [1.1, -1.5]],
  fx(A) { [0, 1, 2].forEach((i) => { const tL = [0.43, 0.75, 1.07][i]; windup(A, i, 0.1, tL + 0.12, [-2.4, 0], { broke: tL + 0.12, len: 1.4 });
      FXa(A, { t: tL, dur: 0.12, to: { d: i }, len: 0.9, hits: [{ d: i, n: 20, stop: true }] }); A.status(i, tL + 0.12, 'stun', 0.3); });
    A.cap(0.1, 2.6, '三箭打断三个前摇：各 20', 'Three arrows break three wind-ups: 20 each'); } };

// DE10 Sky Bolt: no rain; a reticle, and 1.5 s later one giant arrow: 70 at the centre, less to 1.5 u
DE.F10 = { T: 4.0, cam: { x: 0.4, z: 0, w: 7.2 }, her: H(-2.6), seq: [[0.3, 'rRain', { to: 0.95, hold: true }], [2.6, 'idle']],
  dum: [[2.6, -0.9], [1.6, 0.5]],
  fx(A) { const T = A.THREE, tL = 0.8, spot = [1.2, 0, -0.1], tb = 2.3; FXa(A, { t: tL, dur: 0.3, to: [-1.6, 5.0, 0], len: 1.2, glow: A.C.jade });
    // the foe walks into where she aimed
    A.moveTo(0, 0.6, [1.35, -0.2], 1.6, 'lin');
    // the reticle: a jade ring with four feather ticks, narrowing until the bolt drops
    FXk.ring(A, { t: 0.85, at: spot, r0: 1.5, r1: 0.45, e: 'lin', dur: tb - 0.85, w: 0.06, op: 0.8 });
    const g = A.add(new T.Group()); for (let k = 0; k < 4; k++) { const m = new T.Mesh(A.streakGeo, A.mat(A.C.jade, A.F.STREAK)); m.scale.set(0.08, 0.08, 0.35); g.add(m); } g.visible = false;
    A.fx((t) => { const a = t - 0.85; g.visible = a >= 0 && t < tb; if (!g.visible) return; const r = A.lerp(1.5, 0.45, a / (tb - 0.85)); g.position.set(spot[0], 0.04, spot[2]); g.children.forEach((m, k) => { const an = k * Math.PI / 2 + a * 0.6; m.position.set(Math.cos(an) * (r + 0.35), 0, Math.sin(an) * (r + 0.35)); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(-Math.cos(an), 0, -Math.sin(an))); m.material.uniforms.op.value = 0.85; }); });
    FXa(A, { t: tb - 0.18, dur: 0.18, from: [spot[0] - 0.3, 6, spot[2]], to: [spot[0], 0.6, spot[2]], len: 3.0, scale: 3.2, w: 0.35, glow: A.C.jade, stick: 0, ease: 'in' });
    FXk.stuck(A, { t: tb, dur: 1.2, at: [spot[0], 0.95, spot[2]], dir: [0.05, -1, 0], scale: 3.2 });
    FXk.ring(A, { t: tb, at: spot, r0: 0.2, r1: 1.6, dur: 0.45, w: 0.35 }); FXk.disc(A, { t: tb, at: spot, r0: 0.3, r1: 1.4, dur: 0.3, op: 0.4 }); FXk.dust(A, { t: tb, at: spot, n: 10, sp: 2.0, r: 0.25, rise: 2 }); A.shake(tb, 0.09, 0.3);
    A.hit(0, tb + 0.02, 70, { big: true, stop: true }); A.hit(1, tb + 0.04, 38, { knock: [0.3, 0.4] });
    A.cap(0.8, 2.25, '瞄准它 1.5 秒后的位置', 'Aim where it will be in 1.5 s'); A.cap(2.25, 3.9, '中心 70，外圈到 1.5 u 递减到 20', '70 at the centre, falling to 20 at 1.5 u'); } };

// DE11 Recoil blast: point-blank, it bursts at once: 36 (12 to others within 1 u); the blast throws her 3 u back, untouchable
DE.F11 = { T: 3.0, cam: { x: -1.0, z: 0, w: 7.2 }, her: H(-0.6), seq: [[0.3, 'sPierce', { to: 0.5 }], [0.62, 'dash', { from: 0.5, to: 0.95, speed: 1.2 }], [1.05, 'sEagleIn', { from: 0.15, fade: 0.12 }], [1.75, 'sEagleOut', { from: 0.2 }]],
  root: [{ t: 0.3 }, { t: 0.44, fw: 0.25, e: 'out' }, { t: 0.6 }, ...rk(0.6, 1.05, (u) => ({ fw: 0.25 - 3.0 * A_out(u), y: 0.35 * 4 * u * (1 - u), spin: 360 * u })), { t: 1.4, fw: -2.95, e: 'out' }],
  dum: [[0.45, 0.05], [1.2, 0.55]],
  fx(A) { const T = A.THREE, tb = 0.58; FXa(A, { t: 0.5, dur: 0.06, to: { d: 0 }, len: 0.4, stick: 0.05 }); FXk.disc(A, { t: tb, at: () => at0(A, 0, tb, 0.6), r0: 0.2, r1: 1.0, dur: 0.22, op: 0.6 });
    FXk.ring(A, { t: tb, at: () => at0(A, 0, tb), r0: 0.2, r1: 1.1, dur: 0.3, w: 0.4 }); A.hit(0, tb + 0.02, 36, { big: true, knock: [0.4, 0] }); A.hit(1, tb + 0.04, 12, { knock: [0.3, 0.3] });
    for (let k = 0; k < 5; k++) FXk.spark(A, { t: tb + 0.02 + k * 0.03, at: () => herAt(A, tb + 0.05 + k * 0.05, 0.6), r: 0.07, col: A.C.parch }); A.shake(tb, 0.07, 0.25);
    FXk.trail(A, { of: 'hips', t0: 0.62, t1: 1.05, len: 0.25, w: 0.14, op: 0.4 }); FXk.dust(A, { t: 1.05, at: () => herAt(A, 1.05), n: 7, dir: [-1, 0], sp: 1.4 }); FXk.tube(A, { t: 1.05, dur: 0.35, hold: 0.4, out: 0.4, flat: true, w: 0.3, col: '#BDB6A8', op: 0.35, e: 'out', pts: () => [herAt(A, 1.05, 0.02), herAt(A, 1.4, 0.02)] });
    A.cap(0.3, 2.8, '贴脸一箭：36；爆炸把她炸退 3 u，无敌', 'Point-blank: 36; the blast throws her 3 u back, untouchable'); } };
function A_out(u) { return 1 - (1 - u) * (1 - u); }

// DE12 Spotter wheel: eight arrows circle over the foe for 4 s; each hit on it by anyone drops one: 8
DE.F12 = { ...DEFS.F12, T: 4.6, dum: [[1.6, 0.3]],
  fx(A) { const T = A.THREE, s0 = 0.58, s1 = 0.94, tUp = 1.0; FXk.ring(A, { t: s0, at: 'her', r0: 0.5, r1: 1.2, dur: 0.4, w: 0.12, op: 0.5 });
    // up from the spin, they form a slow ring point-down over the foe
    const wheel = (k, t) => { const p = at0(A, 0, t, 2.0), an = k * Math.PI / 4 + t * 1.2; return new T.Vector3(p.x + Math.cos(an) * 0.55, p.y, p.z + Math.sin(an) * 0.55); };
    const drops = [1.7, 2.1, 2.5, 2.9, 3.3, 3.55]; // her shots and an ally's
    for (let k = 0; k < 8; k++) { const ts = s0 + (s1 - s0) * k / 8, td = drops[k] != null ? drops[k] + 0.12 : 4.3; const m = A.add(new T.Mesh(A.arrowGeo, A.arrowMat)); m.scale.setScalar(0.7); m.visible = false;
      A.fx((t) => { m.visible = t >= ts && t < td; if (!m.visible) return; const u = A.clamp((t - ts) / (tUp - ts + 0.3)), w = wheel(k, t), c = A.at('chest', ts); const p = c.clone().lerp(w, A.EASE.out(u)); p.y += 0.8 * Math.sin(u * Math.PI); m.position.copy(p);
        m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), u < 1 ? w.clone().sub(c).normalize() : new T.Vector3(0, -1, 0)); m.scale.setScalar(0.7 * (t > 4.0 && drops[k] == null ? Math.max(0, (4.3 - t) / 0.3) : 1)); });
      if (drops[k] != null) FXa(A, { t: td, dur: 0.1, from: () => wheel(k, td), to: { d: 0, y: 0.9 }, len: 0.6, hits: [{ d: 0, n: 8, col: A.C.jade }] }); }
    // what calls them down: her shots and an ally's arrows from off the card
    [1.7, 2.5, 3.3].forEach((t) => FXa(A, { t: t - 0.12, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 12 }] })); [2.1, 2.9, 3.55].forEach((t) => FXa(A, { t: t - 0.2, dur: 0.2, from: [-1.0, 0.7, 3.6], to: { d: 0 }, col: A.C.parch, hits: [{ d: 0, n: 10 }] }));
    A.cap(0.4, 1.6, '八支箭在它头顶转 4 秒', 'Eight arrows circle over it for 4 s'); A.cap(1.6, 4.4, '谁打中它，就落下一支：8', "Anyone's hit on it drops one: 8"); } };
DE.F12.seq = [[0.3, 'rWhirl'], [1.4, 'combo1'], [2.2, 'combo2'], [3.0, 'combo1']];

// DE13 Bank shot: it bounces off walls (up to four times) to a foe behind cover: 22
DE.F13 = { T: 3.0, cam: { x: 0.3, z: 0, w: 7.4 }, her: H(-2.6, 0.2, 90), seq: [[0.3, 'sPierce']], root: [{ t: 0.3, spin: -40 }, { t: 0.5, spin: -48 }],
  dum: [[2.6, -0.1]],
  fx(A) { const T = A.THREE; const wallM = new T.MeshStandardMaterial({ color: '#8C877E', roughness: 0.95 });
    const box = (x, z, w, d, h = 0.8) => { const m = A.add(new T.Mesh(new T.BoxGeometry(w, h, d), wallM)); m.position.set(x, h / 2, z); };
    box(0.6, 2.0, 5.6, 0.3); box(0.6, -2.0, 5.6, 0.3); box(1.3, 0.0, 0.5, 1.4, 1.0); // two walls and a pillar in front of the foe
    const tL = 0.55, seg = [0.1, 0.13, 0.1]; const P = [() => A.at('nock', tL), () => new T.Vector3(-0.1, 0.6, 1.82), () => new T.Vector3(1.9, 0.6, -1.82), () => at0(A, 0, 1.0, 0.6)];
    const tk = [tL, tL + seg[0], tL + seg[0] + seg[1], tL + seg[0] + seg[1] + seg[2]];
    const pos = (t) => { for (let i = 0; i < 3; i++) if (t <= tk[i + 1] || i === 2) { const u = A.clamp((t - tk[i]) / seg[i]); return P[i]().clone().lerp(P[i + 1](), u); } };
    const m = A.add(new T.Mesh(A.arrowGeo, A.arrowMat)); m.scale.setScalar(0.8); m.visible = false;
    A.fx((t) => { m.visible = t >= tL && t <= tk[3] + 1.0; if (!m.visible) return; const p = t > tk[3] ? at0(A, 0, t, 0.6).add(new T.Vector3(-0.3, 0, 0.12)) : pos(t), q = pos(Math.min(t, tk[3]) - 0.01); m.position.copy(p); if (p.distanceTo(q) > 1e-4 && t <= tk[3]) m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); });
    FXk.trail(A, { of: pos, t0: tL, t1: tk[3], len: 0.22, w: 0.08, op: 0.75, col: A.C.bone });
    [1, 2].forEach((i) => { FXk.spark(A, { t: tk[i], at: P[i](), r: 0.16, col: A.C.parch }); FXk.ring(A, { t: tk[i], at: P[i](), r0: 0.05, r1: 0.4, dur: 0.25, w: 0.3, dir: () => new T.Vector3(0, 0, 1) }); });
    A.hit(0, tk[3], 22, { big: true }); A.cap(0.4, 2.8, '在墙上弹，最多四次：每个敌人 22', 'It bounces off walls, up to four times: 22 a foe'); } };

// DE14 Eye hold: the twister holds one foe still in its calm eye 1 s, then spits it straight up: 24, launched 0.6 s
DE.F14 = { ...DEFS.F14, T: 3.8, dum: [[1.4, 0.0], [2.8, 1.3]],
  fx(A) { const T = A.THREE, tL = 0.9, t0 = tL + 0.18, t1 = t0 + 1.0; FXk.helix(A, { t: 0.36, dur: 0.3, from: (A2) => { const h = A2.at('handR', 0.5); return [h.x, h.y + 0.15, h.z]; }, to: (A2) => { const h = A2.at('handR', 0.5); return [h.x, h.y - 0.05, h.z]; }, r: 0.08, turns: 5, strands: 1, out: 0.2, op: 0.8 });
    FXa(A, { t: tL, dur: 0.18, to: { d: 0, y: 0.1 }, len: 0.9, glow: A.C.jade, stick: 0 }); FXk.twister(A, { t0, t1, at: () => at0(A, 0, t0), r: 0.75, h: 2.2, riders: 0 });
    A.hit(0, t0, null, { stun: 1.0 }); FXk.ring(A, { t: t0, at: () => at0(A, 0, t0), r0: 0.9, r1: 0.35, e: 'in', dur: 0.3, w: 0.2 });
    A.hit(0, t1, 24, { up: 1.3, big: true }); FXk.trail(A, { of: (t) => at0(A, 0, t, 0.6), t0: t1, t1: t1 + 0.35, len: 0.2, w: 0.25, op: 0.6 }); FXk.ring(A, { t: t1, at: () => at0(A, 0, t1, 2.2), r0: 0.2, r1: 0.9, dur: 0.3, w: 0.3 });
    A.cap(0.4, 2.0, '风眼定住它 1 秒，旁边的敌人不受影响', 'The eye holds it still 1 s; the others are left alone'); A.cap(2.0, 3.6, '再把它吐上天：24，挑飞 0.6 秒', 'Then spits it straight up: 24, launched 0.6 s'); } };

// DE15 Tripwire: two arrows 4 u apart with a wire; the first foe across trips 1 s, the arrows tear free into it (2 × 16), it cannot leap 3 s
DE.F15 = { T: 4.4, cam: { x: 0.2, z: 0, w: 7.2 }, her: H(-2.4), seq: [[0.3, 'combo1', { speed: 1.4 }], [0.62, 'combo1', { speed: 1.4, fade: 0.05 }]],
  root: [{ t: 0.3, spin: -40 }, { t: 0.56, spin: -40 }, { t: 0.62, spin: 40 }, { t: 0.95, spin: 40 }, { t: 1.2, spin: 0 }], hops: [[0.56, 0.66, 0.08]],
  dum: [[3.2, 0.3]],
  fx(A) { const T = A.THREE, a = [0.4, 0.2, 2.0], b = [0.4, 0.2, -2.0];
    FXa(A, { t: 0.45, dur: 0.14, to: a, len: 0.8, stick: 0 }); FXa(A, { t: 0.77, dur: 0.14, to: b, len: 0.8, stick: 0 });
    FXk.stuck(A, { t: 0.59, dur: 1.9, at: a, dir: [0.4, -0.8, 0.3], shiver: true }); FXk.stuck(A, { t: 0.91, dur: 1.6, at: b, dir: [0.4, -0.8, -0.3], shiver: true });
    thread(A, a, b, 0.92, { hold: 1.5, out: 0.1, r: 0.012, op: 0.9 }); // the wire, pulled taut
    const gl = A.add(new T.Mesh(new T.SphereGeometry(0.05, 8, 6), new T.MeshBasicMaterial({ color: A.C.parch }))); gl.visible = false; A.fx((t) => { gl.visible = t > 1.0 && t < 2.3; if (gl.visible) gl.position.set(0.4, 0.2, 2 - ((t - 1.0) * 2.4 % 4)); });
    // a charger runs at her and trips on it
    A.moveTo(0, 1.1, [0.5, 0.1], 1.0, 'in'); const ts = 2.12; A.down(0, ts, 1.0, [-1, 0]); A.move(0, ts, [-0.6, 0], 0.25, 'out');
    FXa(A, { t: ts + 0.05, dur: 0.12, from: a, to: { d: 0, y: 0.3 }, len: 0.6, hits: [{ d: 0, n: 16 }] }); FXa(A, { t: ts + 0.1, dur: 0.12, from: b, to: { d: 0, y: 0.3 }, len: 0.6, hits: [{ d: 0, n: 16 }] });
    FXk.dust(A, { t: ts + 0.15, at: () => at0(A, 0, ts + 0.3), n: 7, sp: 1.2 }); A.status(0, ts, 'stun', 1.0); FXk.ring(A, { t: ts + 1.0, at: () => at0(A, 0, ts + 1.0), r0: 0.5, r1: 0.52, dur: 2.0, w: 0.12, op: 0.5, e: 'lin' });
    A.cap(0.4, 2.1, '两支箭钉在地上，中间拉一根线', 'Two arrows in the floor, a wire between'); A.cap(2.1, 4.2, '绊倒 1 秒，两箭扯出：2 × 16；3 秒不能跳', 'Tripped 1 s, the arrows tear free: 2 × 16; no leaping for 3 s'); } };

// DE16 Arrow hedge: the curtain sweeps (three hits of 14); its last rank stands 5 s as a hedge: foe shots stop on it, hers pass
DE.F16 = { ...DEFS.F16, T: 6.0, cam: { x: 2.6, z: -0.4, w: 12 }, dum: [[1.0, -0.4], [3.0, 0.8], [8.6, 0.2]],
  fx(A) { capOnly(A, DEFS.F16.fx, []); const T = A.THREE, tL = 0.62 + 0.62, ox = A.at('nock', tL).x + 1.0, hx = ox + 0.2 + 7 * 1.0, th = 1.7 + 7 * 0.12 + 0.18;
    for (let j = 0; j < 8; j++) { const z = -2.3 + j * 0.66; FXk.stuck(A, { t: th, dur: 6.0 - th, at: [hx + ((j * 3) % 2) * 0.08, 0.45, z], dir: [0.15, -1, 0.02 * (j - 4)], scale: 1.3 }); }
    FXk.tube(A, { t: th, dur: 0.2, hold: 5.6 - th, out: 0.3, flat: true, w: 0.25, col: A.C.jade, op: 0.22, e: 'lin', pts: () => [new T.Vector3(hx, 0.03, -2.5), new T.Vector3(hx, 0.03, 2.5)] });
    // the shooter behind it: its shots stop on the hedge with a tick; hers pass
    [3.3, 4.3].forEach((t) => { foeShot(A, { t, dur: 0.4, from: [8.6, 0.7, 0.2], to: [-1.0, 0.7, 0.0], stop: (8.6 - hx) / 9.6 }); FXk.spark(A, { t: t + 0.4 * (8.6 - hx) / 9.6, at: [hx, 0.7, 0.15], r: 0.12, col: A.C.parch }); });
    FXa(A, { t: 3.8, dur: 0.35, from: () => A.at('nock', 3.8), to: { d: 2 }, len: 1.2, hits: [{ d: 2, n: 12 }] });
    A.cap(1.5, 3.0, '箭幕推过：三次各 14', 'The curtain sweeps: three hits of 14'); A.cap(3.0, 5.8, '最后一排箭立成篱笆 5 秒：挡住敌人的子弹，她的箭穿过', 'Its last rank stands 5 s as a hedge: foe shots stop, hers pass'); } };
DE.F16.seq = [...DEFS.F16.seq, [3.6, 'combo1']];

// DE17 Feather sentry: the spray and the run; a feather stays where she stood and, 2 s later, shoots the last foe she hit: 24
DE.F17 = { ...DEFS.F17, T: 3.8, dum: [[0.3, -0.7], [0.6, 0.15], [0.4, 0.95]],
  fx(A) { capOnly(A, DEFS.F17.fx, []); const T = A.THREE, spot = herAt(A, 0.9); const fp = [spot.x + 0.15, 0, spot.z + 0.15];
    standFeather(A, 0.95, fp, 2.6); FXk.ring(A, { t: 0.95, at: fp, r0: 0.05, r1: 0.35, dur: 0.3, w: 0.3 });
    A.moveTo(2, 1.2, [2.6, 1.6], 1.0, 's'); // the last foe she hit walks off
    const ts = 2.66; FXk.ring(A, { t: ts - 0.25, at: [fp[0], 0.32, fp[2]], r0: 0.4, r1: 0.05, e: 'in', dur: 0.25, w: 0.3, dir: () => new T.Vector3(1, 0, 0) });
    FXa(A, { t: ts, dur: 0.2, from: [fp[0], 0.45, fp[2]], to: { d: 2 }, len: 1.0, glow: A.C.jade, hits: [{ d: 2, n: 24, big: true }] });
    A.cap(0.4, 1.6, '散射五箭，各 9；原地留下一根羽毛', 'Five arrows of 9; a feather stays where she stood'); A.cap(1.6, 3.6, '2 秒后羽毛射她最后打中的敌人：24', '2 s later it shoots the last foe she hit: 24'); } };

// DE18 Catch: the flip stops at the top 0.6 s, untouchable; two foe shots are caught; one full shot (30) sends them back (10 each)
DE.F18 = { T: 3.4, cam: { x: -0.2, z: 0, w: 7.4 }, her: H(-1.8), seq: [[0.3, 'vault', { to: 0.3, hold: true }], [1.25, 'vault', { from: 0.3 }]],
  root: [{ t: 0.38 }, ...rk(0.38, 0.62, (u) => ({ fw: -0.8 * u, y: 1.0 * A_out(u), pitch: -180 * u })), { t: 1.25, fw: -0.8, y: 1.0, pitch: -180 }, ...rk(1.25, 1.55, (u) => ({ fw: -0.8 - 0.6 * u, y: 1.0 * (1 - u * u), pitch: -180 - 180 * u }))],
  dum: [[1.2, 0.0], [2.6, -1.3], [2.4, 1.4]],
  fx(A) { const T = A.THREE; const paw = (t) => A.at('handR', t);
    [[1, 0.55], [2, 0.75]].forEach(([i, t]) => { foeShot(A, { t, dur: 0.3, from: () => at0(A, i, t, 0.7), to: () => paw(t + 0.3), stop: 1, linger: 2.2, ride: (tt) => (tt < 1.3 ? paw(tt) : A.at('nock', 1.3)) }); FXk.spark(A, { t: t + 0.3, at: () => paw(t + 0.3), r: 0.14, col: A.C.parch }); });
    const tL = 1.3; FXa(A, { t: tL, dur: 0.14, to: { d: 0 }, len: 1.4, scale: 1.3, w: 0.14, glow: A.C.jade, hits: [{ d: 0, n: 30, big: true }] });
    [1, 2].forEach((i) => FXa(A, { t: tL + 0.02, dur: 0.2, to: { d: i }, len: 0.7, w: 0.07, col: '#E86B6B', hits: [{ d: i, n: 10 }] }));
    FXk.dust(A, { t: 1.55, at: () => herAt(A, 1.55), n: 5, dir: [-1, 0] });
    A.cap(0.4, 1.25, '翻到最高点停 0.6 秒，无敌，接住敌人的子弹', 'She hangs at the top 0.6 s, untouchable, catching shots'); A.cap(1.25, 3.2, '满弦一箭 30，接住的子弹各 10 射回去', 'One full shot, 30; the caught shots fly back: 10 each'); } };

// DE19 Crescent cut: the backflip kick throws a crescent forward up to 8 u; it grows as it flies: 20 at 1 u, 60 at 8 u
DE.F19 = { T: 3.0, cam: { x: 1.4, z: 0, w: 10 }, her: H(-3.0), seq: [[0.3, 'kCrescent']],
  root: [{ t: 0.3 }, { t: 0.45, fw: -0.3, e: 'out' }, { t: 0.5, fw: -0.3, y: 0 }, { t: 0.77, fw: -0.5, y: 1.0, pitch: -180, e: 'out', ye: 'out' }, { t: 1.04, fw: -0.8, y: 0, pitch: -360, e: 'in', ye: 'in' }],
  dum: [[4.6, 0.1]],
  fx(A) { const T = A.THREE, t0 = 0.62, fl = 0.55; FXk.trail(A, { of: 'footL', of2: 'footR', t0: 0.48, t1: 0.66, len: 0.16, op: 0.75 });
    const g = A.add(new T.Group()); const curve = new T.CatmullRomCurve3([...Array(13)].map((_, i) => { const a = (i / 12 - 0.5) * 2.4; return new T.Vector3(Math.cos(a) * 0.5 - 0.5, 0, Math.sin(a) * 0.9); }));
    const m = new T.Mesh(FXk.flatRibbon(curve, (u) => 0.04 + 0.16 * Math.sin(u * Math.PI), 40, false), A.mat(A.C.jade, A.F.RIB)); g.add(m); g.visible = false;
    const sx = herAt(A, t0).x + 0.4;
    A.fx((t) => { const a = t - t0; g.visible = a >= 0 && a <= fl + 0.12; if (!g.visible) return; const u = A.clamp(a / fl), x = A.lerp(sx, 4.4, u); g.position.set(x, 0.7, 0.1); const s = 0.5 + 1.6 * u; g.scale.set(s, 1, s); m.material.uniforms.u0.value = 0; m.material.uniforms.u1.value = 1; m.material.uniforms.op.value = (0.45 + 0.5 * u) * (a > fl ? 1 - (a - fl) / 0.12 : 1); });
    A.hit(0, t0 + fl, 60, { big: true, stop: true }); FXk.ring(A, { t: t0 + fl, at: () => at0(A, 0, t0 + fl), r0: 0.3, r1: 1.2, dur: 0.3, w: 0.25 });
    A.cap(0.4, 2.8, '月牙越飞越大：1 u 处 20，8 u 处 60', 'The crescent grows as it flies: 20 at 1 u, 60 at 8 u'); } };

// DE20 Lone wolf: the wind blows every other foe 3 u off the one nearest the spot, and strikes that one: 36
DE.F20 = { ...DEFS.F20, dum: [[1.6, 0.0, { big: true }], [1.1, -0.6], [2.2, 0.6], [1.9, -0.7], [1.2, 0.7]],
  fx(A) { const T = A.THREE, tT = 0.92, c = [1.6, 0]; FXk.trail(A, { of: 'tipA', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 }); FXk.trail(A, { of: 'tipB', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 });
    thread(A, () => A.at('tipA', tT), () => at0(A, 0, tT, 0.6), tT, { hold: 0.2, out: 0.2, r: 0.025 });
    FXk.ring(A, { t: tT + 0.15, at: [c[0], 0, c[1]], r0: 0.3, r1: 3.2, dur: 0.45, w: 0.2 }); FXk.ring(A, { t: tT + 0.22, at: [c[0], 0, c[1]], r0: 0.3, r1: 2.6, dur: 0.4, w: 0.12, op: 0.6 });
    [1, 2, 3, 4].forEach((i) => { const dm = A.card.dum[i], dx = dm.x - c[0], dz = dm.z - c[1], l = Math.hypot(dx, dz); A.move(i, tT + 0.18, [dx / l * 3.0, dz / l * 3.0], 0.45, 'out'); FXk.dust(A, { t: tT + 0.2, at: [dm.x, 0, dm.z], n: 4, dir: [dx, dz], sp: 1.6 }); });
    A.hit(0, tT + 0.3, 36, { big: true }); FXk.helix(A, { t: tT + 0.3, dur: 0.2, from: [c[0], 0.1, c[1]], to: [c[0], 1.5, c[1]], r: 0.35, turns: 2, strands: 2, hold: 0.1, out: 0.3 });
    A.cap(0.4, 3.2, '把其他敌人吹开 3 u，单独打它：36', 'Blows the others 3 u off it, strikes the lone foe: 36'); } };

// DE21 Avenger: the three kicks (6 each); all three spin arrows hunt the foe that last hit the team: 16 each
DE.F21 = { ...DEFS.F21, T: 3.4, dum: [[0.32, 0.2], [-1.3, 0.72], [2.6, -1.6, { face: 230 }]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footL', t0: 0.42, t1: 1.12, len: 0.16, w: 0.18, op: 0.6 }); FXk.trail(A, { of: 'footR', t0: 0.42, t1: 1.12, len: 0.16, w: 0.18, op: 0.6 });
    foeShot(A, { t: 0.05, dur: 0.3, from: [2.6, 0.7, -1.6], to: [-0.6, 0.7, 0] }); FXk.spark(A, { t: 0.35, at: [-0.6, 0.7, 0], r: 0.12, col: CRIM }); // the foe that hit her
    FXk.reticle(A, { t: 0.4, d: 2, dur: 1.0, col: A.C.parch });
    [0.4, 0.7, 1.0].forEach((tk) => { FXk.ring(A, { t: tk, at: 'her', r0: 0.6, r1: 1.3, dur: 0.3, w: 0.18, op: 0.5 }); [0, 1].forEach((i) => A.hit(i, tk + 0.02 * i, 6)); });
    [0.52, 0.82, 1.12].forEach((tk, k) => FXa(A, { t: tk, dur: 0.28, from: P3(A.at('hips', tk)), to: { d: 2 }, side: (k - 1) * 0.9 + 0.6, len: 0.8, hits: [{ d: 2, n: 16 }] }));
    A.cap(0.05, 0.4, '它刚打了她', 'It just hit her'); A.cap(0.4, 3.2, '三脚各 6；三箭全追那个敌人：各 16', 'Three kicks of 6; all three arrows hunt that foe: 16 each'); } };

// DE23 Slide stance: the run ends in a slide on her haunches into a free 2 s Eagle Stance
DE.F23 = { T: 5.6, cam: { x: 1.2, z: -0.3, w: 10.4 }, her: H(-3.2, 0.6, 90), seq: [[0.2, 'idle', { from: 5.15, to: 5.55 }], [0.6, 'run', { loop: true, until: 2.7 }], [2.7, 'sEagleIn', { speed: 0.8, fade: 0.08 }], [3.45, 'sEagleShot'], [4.07, 'sEagleShot'], [4.69, 'sEagleOut', { from: 0.1 }]],
  root: [{ t: 0.6 }, { t: 2.7, fw: 4.6, sd: -0.6, e: 'lin' }, { t: 3.2, fw: 5.5, sd: -0.6, spin: -10, e: 'out' }], dum: [[5.0, -1.4], [5.6, 1.0]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footL', t0: 0.6, t1: 2.7, len: 0.3, w: 0.1, op: 0.4 }); FXk.trail(A, { of: 'footR', t0: 0.6, t1: 2.7, len: 0.3, w: 0.1, op: 0.4 });
    FXk.tube(A, { t: 2.7, dur: 0.5, hold: 0.6, out: 0.5, flat: true, w: 0.35, col: '#BDB6A8', op: 0.4, e: 'out', pts: () => [herAt(A, 2.7, 0.02), herAt(A, 3.2, 0.02)] }); FXk.dust(A, { t: 2.75, at: () => herAt(A, 2.9), n: 8, dir: [1, 0], sp: 1.5 });
    FXk.ring(A, { t: 3.2, at: 'her', r0: 0.2, r1: 0.9, dur: 0.3, w: 0.25 });
    [[3.73, 0], [4.35, 1]].forEach(([tL, d]) => FXa(A, { t: tL, dur: 0.16, to: { d }, len: 1.1, hits: [{ d, n: 19 }] }));
    A.cap(0.6, 2.7, '3 秒：更快，敌方子弹穿身而过', '3 s: faster, foe shots pass through her'); A.cap(2.7, 5.4, '滑步坐下：免费 2 秒鹰踞，普攻 +60%', 'A slide into a free 2 s Eagle Stance: basic shots +60%'); } };

// DE24 Spear dive: she dives arrow-first at the foe under the pointer: 60, pinned 0.5 s
DE.F24 = { T: 3.2, cam: { x: 0.6, z: -0.6, w: 8.0 }, her: H(-2.2), seq: [[0.3, 'kDive', { to: 1.0 }], [1.0, 'sPierce', { from: 0.1, to: 0.35, hold: true }], [1.62, 'vault', { from: 0.4 }]],
  root: [{ t: 0.44 }, { t: 0.75, y: 2.3, fw: 0.9, e: 'out', ye: 'out' }, { t: 0.95, y: 2.5, fw: 1.4, pitch: 100, e: 's' }, { t: 1.5, y: 0.7, fw: 3.6, pitch: 100, e: 'in', ye: 'in' }, ...rk(1.62, 2.1, (u) => ({ fw: 3.6 - 1.2 * u, y: 0.7 * (1 - u) + 0.7 * 4 * u * (1 - u), pitch: 100 - 460 * u }))],
  dum: [[1.55, 0.0], [0.6, 1.2]],
  fx(A) { const T = A.THREE, ti = 1.5; FXk.trail(A, { of: 'head', t0: 1.0, t1: ti, len: 0.3, w: 0.35, op: 0.5 }); FXk.trail(A, { of: 'nock', t0: 1.0, t1: ti, len: 0.25, w: 0.12, op: 0.7, col: A.C.parch });
    A.hit(0, ti, 60, { big: true, stop: true, stun: 0.5 }); FXk.stuck(A, { t: ti, dur: 1.2, at: () => at0(A, 0, ti, 1.1), dir: [0.3, -1, 0], scale: 1.4 }); FXk.ring(A, { t: ti, at: () => at0(A, 0, ti), r0: 0.2, r1: 1.0, dur: 0.3, w: 0.35 }); A.shake(ti, 0.07, 0.25);
    A.cap(0.4, 1.5, '跳起，头朝下', 'The leap and a head-down turn'); A.cap(1.5, 3.0, '箭在前俯冲：60，钉住 0.5 秒', 'An arrow-first dive: 60, pinned 0.5 s'); } };
