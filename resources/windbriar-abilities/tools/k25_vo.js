// ------------------------------------------------ Volley 万箭 (kit 2.5)
// VO1 Curve line: the arrow flies an arc she sets, up to 8 u, round the pack's edge, through every foe on it: 26 each
VO.F1 = { T: 2.8, cam: { x: 0.6, z: 0.3, w: 7.6 }, her: H(-2.6), seq: [[0.3, 'sPierce']], root: [{ t: 0.3 }, { t: 0.46, sd: -0.4, e: 'out' }], hops: [[0.3, 0.46, 0.05]],
  dum: [[-0.6, 0.55], [0.9, 1.25], [2.4, 0.9], [3.2, -0.3], [0.9, -0.4, { big: true }]],
  fx(A) { const T = A.THREE, t0 = 0.56, fl = 0.42; const C = (u) => { const a = A.at('nock', t0); const P0 = new T.Vector3(a.x, 0.6, a.z), P1 = new T.Vector3(1.0, 0.6, 2.4), P2 = new T.Vector3(4.2, 0.6, -1.0); const v = 1 - u; return P0.clone().multiplyScalar(v * v).add(P1.clone().multiplyScalar(2 * u * v)).add(P2.clone().multiplyScalar(u * u)); };
    const m = A.add(new T.Mesh(A.arrowGeo, A.arrowMat)); m.scale.setScalar(0.8); m.visible = false; const pos = (t) => C(A.clamp((t - t0) / fl));
    A.fx((t) => { m.visible = t >= t0 && t <= t0 + fl; if (!m.visible) return; const p = pos(t), q = C(Math.max(0, (t - t0) / fl - 0.02)); m.position.copy(p); if (p.distanceTo(q) > 1e-4) m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); m.rotateZ((t - t0) * 40); });
    FXk.trail(A, { of: pos, t0, t1: t0 + fl, len: 0.3, w: 0.1, op: 0.75, col: A.C.bone });
    FXk.tube(A, { t: t0, dur: fl, hold: 1.0, out: 0.6, flat: true, w: 0.14, op: 0.5, e: 'lin', pts: () => [...Array(13)].map((_, i) => { const p = C(i / 12); p.y = 0.03; return p; }) });
    [[0, 0.16], [1, 0.42], [2, 0.66], [3, 0.88]].forEach(([d, u]) => A.hit(d, t0 + fl * u, 26));
    A.cap(0.4, 2.6, '弯成弧线，绕过敌群边缘，穿过线上每个敌人：各 26', 'It bends on an arc round the pack, through every foe on it: 26 each'); } };

// VO2 Pressure line: a full draw's wind drags foes within 1.5 u of its path into the line, then pierces them all: 20 each
VO.F2 = { T: 3.6, cam: { x: 0.8, z: 0, w: 8.4 }, her: H(-3.0), seq: [[0.3, 'sPower']], root: [{ t: 1.3 }, { t: 1.58, fw: -0.3, e: 'out' }],
  dum: [[0.2, 1.2], [1.4, -1.3], [2.6, 1.0], [3.6, -0.9], [1.9, 0.1]],
  fx(A) { const T = A.THREE, tL = 1.3, end = (A2) => fwdPt(A2, tL, 8, 0.6); const nk = A.at('nock', tL);
    // two sheets of wind fold in from both sides along the line
    [1, -1].forEach((sd) => FXk.tube(A, { t: 0.7, dur: 0.5, hold: 0.1, out: 0.3, flat: true, w: (u) => 0.6 * (1 - u * 0.5), op: 0.3, e: 'out', pts: () => [new T.Vector3(nk.x + 0.4, 0.04, sd * 1.5), new T.Vector3(nk.x + 3.5, 0.04, sd * 1.2), new T.Vector3(nk.x + 7.5, 0.04, sd * 1.0)] }));
    A.card.dum.forEach((dm, i) => { if (Math.abs(dm.z) > 0.15) { A.moveTo(i, 0.85, [dm.x, 0.0], 0.4, 'in'); FXk.dust(A, { t: 0.88, at: [dm.x, 0, dm.z], n: 4, dir: [0, -dm.z], sp: 1.2 }); } });
    FXk.suck(A, { t0: 0.5, t1: tL - 0.05, at: (t) => A.at('nock', t), r: 1.5, n: 10, y: 0.03, lift: 1 });
    FXa(A, { t: tL, dur: 0.3, to: end(A), len: 2.2, scale: 1.3, w: 0.13, glow: A.C.jade, pierce: A.card.dum.map((_, d) => ({ d, n: 20 })) });
    FXk.tunnel(A, { t: tL, dur: 0.3, n: 7, r: 0.45, from: () => A.at('nock', tL), to: () => new T.Vector3(...end(A)), life: 0.45 }); A.shake(tL + 0.05, 0.05, 0.2);
    A.cap(0.4, 1.3, '满弦：风把线两侧 1.5 u 的敌人拉到线上', 'A full draw: the wind drags foes within 1.5 u onto the line'); A.cap(1.3, 3.4, '再一箭穿过全部：各 20', 'Then the arrow pierces them all: 20 each'); } };

// VO3 Flare: the arrow hits (12) and bursts into light over it: every foe within 3 u takes 20% more for 4 s
VO.F3 = { ...DEFS.F3, T: 4.2, dum: [[1.6, 0.1], [2.5, -0.9], [2.4, 1.0], [0.9, -1.0]],
  fx(A) { const T = A.THREE, tL = 0.86, c = [1.6, 0, 0.1]; FXk.trail(A, { of: 'handR', t0: 0.36, t1: 0.52, len: 0.14, w: 0.05, op: 0.6 });
    FXa(A, { t: tL, dur: 0.12, to: { d: 0 }, hits: [{ d: 0, n: 12 }] });
    // the flare hangs over the pack: a small star overhead and a soft pool of light on the floor
    const st = A.add(new T.Mesh(new T.SphereGeometry(0.12, 12, 8), new T.MeshBasicMaterial({ color: A.C.parch }))); st.visible = false;
    A.fx((t) => { const a = t - tL - 0.12; st.visible = a >= 0 && a < 3.0; if (!st.visible) return; st.position.set(c[0], 2.0 + 0.4 * A.EASE.out(A.clamp(a / 0.3)) + 0.05 * Math.sin(a * 3), c[2]); st.scale.setScalar(1 + 0.15 * Math.sin(a * 9)); });
    FXk.disc(A, { t: tL + 0.12, at: c, r0: 0.5, r1: 3.0, dur: 3.0, op: 0.14, col: A.C.jade }); FXk.ring(A, { t: tL + 0.12, at: c, r0: 0.3, r1: 3.0, dur: 0.5, w: 0.15 }); FXk.ring(A, { t: tL + 0.5, at: c, r0: 2.95, r1: 3.0, dur: 2.6, w: 0.05, op: 0.4, e: 'lin' });
    [0, 1, 2, 3].forEach((i) => FXk.spark(A, { t: tL + 0.2 + i * 0.04, at: { d: i }, r: 0.1, col: A.C.jade }));
    [[2.22, 0], [2.84, 1]].forEach(([th, d]) => FXa(A, { t: th - 0.12, dur: 0.12, to: { d }, hits: [{ d, n: 14 }] }));
    A.cap(0.4, 1.9, '照明：3 u 内所有敌人受伤 +20%，4 秒', 'Flare: every foe within 3 u takes 20% more for 4 s'); A.cap(1.9, 4.0, '谁打都算', 'From everyone'); } };
VO.F3.seq = [[0.3, 'sMark'], [2.0, 'combo1'], [2.6, 'combo2']];

// VO4 Net: it opens over the foe into a net 2 u wide: 14 to each under it, stun 0.5 s, then slowed
VO.F4 = { ...DEFS.F4, dum: [[0.5, -0.65], [0.9, 0.1], [0.4, 0.75], [2.5, 0.4]],
  fx(A) { const T = A.THREE, tL = 0.62, tn = 0.95, c = new T.Vector3(0.6, 0, 0.05);
    FXa(A, { t: tL, dur: 0.22, from: 'nock', to: [c.x - 0.2, 1.9, c.z], len: 0.8, stick: 0, arc: 0.4 });
    // the mesh: a grid of jade threads that opens at the top and settles over the pack
    const g = A.add(new T.Group()); g.visible = false; const mat = A.mat(A.C.jade, A.F.FLAT); const N = 6;
    for (let k = 0; k <= N; k++) { const a = new T.Mesh(new T.BoxGeometry(2.0, 0.015, 0.015), mat); a.position.z = -1 + 2 * k / N; g.add(a); const b = new T.Mesh(new T.BoxGeometry(0.015, 0.015, 2.0), mat); b.position.x = -1 + 2 * k / N; g.add(b); }
    A.fx((t) => { const a = t - (tL + 0.22); g.visible = a >= 0 && a < 2.4; if (!g.visible) return; const op = A.clamp(a / 0.08) * (a > 1.9 ? 1 - (a - 1.9) / 0.5 : 1); const u = A.EASE.out(A.clamp(a / 0.15)), d = A.EASE.in(A.clamp((a - 0.12) / 0.2));
      g.position.set(c.x, A.lerp(1.9, 1.15, d), c.z); g.scale.set(A.lerp(0.15, 1, u), 1, A.lerp(0.15, 1, u)); mat.uniforms.op.value = 0.75 * op; g.children.forEach((m, i) => { m.position.y = d * -0.35 * Math.cos((i / g.children.length) * 6.28) * 0.3; }); });
    [0, 1, 2].forEach((i) => { A.hit(i, tn, 14, { stun: 0.5 }); A.status(i, tn + 0.5, 'slow', 2.0); });
    A.cap(0.4, 2.8, '一张 2 u 的网：各 14，眩晕 0.5 秒，再减速', 'A 2 u net: 14 each, stun 0.5 s, then slowed'); } };

// VO5 Herding sweep: the ten arrows follow a 90° sweep, each nudging its foe toward the side the sweep ends on
VO.F5 = { ...DEFS.F5, T: 3.4, root: [{ t: 0.4, spin: 45 }, { t: 1.85, spin: -45, e: 'lin' }, { t: 2.2, spin: 0 }], hops: [],
  dum: [[0.6, 1.3], [1.4, 0.7], [1.9, -0.1], [1.2, -0.9], [2.4, 0.9]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'tipA', t0: 0.4, t1: 1.85, len: 0.25, w: 0.08, op: 0.4 });
    for (let k = 0; k < 10; k++) { const tk = 0.45 + k * 0.14, f = A.fwd(tk), n = A.at('nock', tk); const to = [n.x + f.x * 4.5, 0.55, n.z + f.z * 4.5];
      let hitD = -1, best = 0.35; A.card.dum.forEach((dm, i) => { const p = A.dpos(i, tk); const dx = p.x - n.x, dz = p.z - n.z, d = Math.hypot(dx, dz); const crs = Math.abs(dx * f.z - dz * f.x); if (crs < best && dx * f.x + dz * f.z > 0) { best = crs; hitD = i; } });
      if (hitD >= 0) { FXa(A, { t: tk, dur: 0.12, to: { d: hitD }, len: 0.6, hits: [{ d: hitD, n: 5 }] }); A.move(hitD, tk + 0.12, [0.05, -0.5], 0.2, 'out'); FXk.dust(A, { t: tk + 0.12, at: () => at0(A, hitD, tk + 0.2), n: 3, dir: [0, -1], sp: 1.0 }); }
      else FXa(A, { t: tk, dur: 0.14, to, len: 0.7 }); }
    FXk.tube(A, { t: 0.45, dur: 1.4, hold: 0.2, out: 0.4, flat: true, w: 0.08, op: 0.3, e: 'lin', pts: () => [...Array(9)].map((_, i) => { const tk = 0.45 + i * 0.175, f = A.fwd(tk), n = A.at('nock', tk); return new T.Vector3(n.x + f.x * 3.5, 0.03, n.z + f.z * 3.5); }) });
    A.cap(0.4, 3.2, '扫 90°：十箭各 5，每箭把敌人往扫的终点推 0.5 u', 'A 90° sweep: ten arrows of 5, each nudging its foe 0.5 u toward the end'); } };

// VO6 Cull: one arrow to each foe under 30% within 6 u, up to six: 24 each
VO.F6 = { T: 3.0, cam: { x: 0.4, z: 0, w: 7.4 }, her: H(-2.4), seq: [[0.3, 'sKill']], root: [{ t: 0.3, spin: -60 }, { t: 0.55, spin: 0 }, { t: 0.76, spin: 30 }, { t: 1.1, spin: -30, e: 'lin' }, { t: 1.3, spin: 0 }],
  dum: [[0.8, -1.3], [1.8, 0.2], [2.6, -0.7], [1.1, 1.3], [3.3, 0.9], [2.0, 1.6, { big: true }]],
  fx(A) { const weak = [0, 1, 2, 3, 4]; FXk.toss(A, { t0: 0.4, t1: 0.61, from: (t) => A.at('handR', t), to: (t) => A.at('nock', t), arc: 0.75, spin: 2.5 });
    weak.forEach((d, k) => { FXk.dim(A, { t: 0.62, d, dur: 0.18 + k * 0.08, r: 0.9 }); const tL = 0.78 + k * 0.08; FXa(A, { t: tL, dur: 0.16, to: { d }, side: (k % 2 ? 1 : -1) * 0.5, len: 0.9, w: 0.06, col: A.C.parch, hits: [{ d, n: 24 }] }); FXk.fell(A, { t: tL + 0.4, d }); });
    A.cap(0.4, 2.8, '每个血量低于 30% 的敌人一箭，最多六个：各 24', 'One arrow to each foe under 30%, up to six: 24 each'); } };

// VO8 Wind wall: the drill stands up along its line as a wall for 3 s: foes cannot cross, 6 a half second while they touch it
VO.F8 = { ...DEFS.F8, T: 5.6, dum: [[4.2, 2.4], [6.0, 2.6], [5.0, -0.1]],
  fx(A) { capOnly(A, DEFS.F8.fx, []); const T = A.THREE, tL = 1.3, tw = 2.05, n = A.at('nock', tL); const x0 = n.x + 0.5, x1 = n.x + 10;
    // the wall: turning ribbons of wind standing along the line
    for (let k = 0; k < 5; k++) FXk.tube(A, { t: tw + k * 0.04, dur: 0.3, hold: 3.0, out: 0.4, flat: true, up: true, w: (u) => 0.5 + 0.3 * Math.sin(u * 9 + k), op: 0.32, e: 'out', pts: () => [...Array(11)].map((_, i) => new T.Vector3(A.lerp(x0, x1, i / 10), 0.35 + k * 0.32, 0.12 * Math.sin(i * 1.3 + k * 2))) });
    for (let k = 0; k < 12; k++) { const x = A.lerp(x0, x1, k / 11); FXk.helix(A, { t: tw + 0.05, dur: 0.25, from: [x, 0.0, 0], to: [x, 1.8, 0], r: 0.18, turns: 2, strands: 1, hold: 2.8, out: 0.4, op: 0.35 }); }
    // the pack walks at it, cannot cross, and takes 6 each half second while touching it
    [0, 1].forEach((i) => { A.moveTo(i, 2.2, [A.card.dum[i].x - 0.1, 0.45], 0.7, 'lin'); for (let k = 0; k < 5; k++) A.hit(i, 2.95 + k * 0.5, 6); A.move(i, 3.0, [0, 0.12], 0.15, 'out'); });
    foeShot(A, { t: 3.4, dur: 0.5, from: [5.0, 0.7, -0.1], to: [5.0, 0.7, 3.0], stop: 0.06 }); FXk.spark(A, { t: 3.43, at: [5.0, 0.7, 0.1], r: 0.14, col: A.C.parch });
    A.cap(0.4, 2.0, '贯日先钻出去', 'The drill bores first'); A.cap(2.0, 5.4, '沿线立起风墙 3 秒：敌人过不去，碰到每半秒 6', 'It stands up as a wall 3 s: foes cannot cross, 6 a half second on touch'); } };

// VO9 Painted fan: each foe the fan hits is painted 3 s; her next skill also strikes every painted foe: 8 each
VO.F9 = { ...DEFS.F9, T: 3.6, seq: [[0.3, 'rVolley'], [1.6, 'sMark']], dum: [[0.5, -1.0], [0.9, 0.05], [0.5, 1.1], [2.6, 0.1]],
  fx(A) { const T = A.THREE, tL = 0.55; [-18, 0, 18].forEach((a, k) => FXa(A, { t: tL, dur: 0.16, to: ang(A, tL, a, 4.8), len: 1.0, pierce: [{ d: k, n: 14 }] }));
    FXk.trail(A, { of: 'tipA', t0: 0.62, t1: 0.92, len: 0.25, w: 0.07, op: 0.4 });
    // a jade feather pinned on each painted foe; on her next skill each one flares and is struck again
    [0, 1, 2].forEach((d) => { FXk.stuck(A, { t: tL + 0.16, dur: 1.75, at: () => at0(A, d, 1, 1.0), dir: [0.3, -0.4, 0.2], scale: 0.7 }); FXk.ring(A, { t: tL + 0.18, dur: 1.7, at: () => at0(A, d, 1, 0.02), r0: 0.42, r1: 0.45, w: 0.15, op: 0.55, e: 'lin' });
      FXk.spark(A, { t: 2.3, at: { d }, r: 0.2, col: A.C.jade }); FXk.ring(A, { t: 2.3, at: () => at0(A, d, 2.3), r0: 0.2, r1: 0.9, dur: 0.3, w: 0.3 }); A.hit(d, 2.32, 8, { col: A.C.jade }); });
    FXa(A, { t: 2.16, dur: 0.12, to: { d: 3 }, hits: [{ d: 3, n: 12 }] });
    A.cap(0.4, 1.6, '中扇的敌人被涂上羽记 3 秒', 'Foes hit are painted for 3 s'); A.cap(1.6, 3.4, '她的下一个技能也打每个羽记：各 8', 'Her next skill also strikes each painted foe: 8'); } };

// VO10 Hopping rain: the base rain; each second it hops to the thickest pack within 4 u
VO.F10 = { ...DEFS.F10, T: 5.8, cam: { x: 1.0, z: 0, w: 8.6 }, dum: [[0.4, -1.4], [3.1, 0.9], [3.6, 1.4], [3.0, 1.7], [1.2, -1.0], [1.6, -1.6]],
  fx(A) { const T = A.THREE, tL = 0.8; FXa(A, { t: tL, dur: 0.3, to: [-1.4, 5.0, 0], len: 1.2, glow: A.C.jade });
    const spots = [[1.0, -1.3], [3.3, 1.35], [1.0, -1.3], [3.3, 1.35]]; const sp = (t) => { const k = Math.max(0, Math.min(3, Math.floor(t - 1.3))); const u = A.clamp((t - 1.3 - k - 0.88) / 0.12); const a = spots[k], b = spots[Math.min(3, k + 1)]; return new T.Vector3(A.lerp(a[0], b[0], u), 0, A.lerp(a[1], b[1], u)); };
    FXk.rain(A, { t0: 1.3, t1: 5.3, at: sp, r: 1.4, rate: 20, h: 4.5, slant: [0.35, 0.15] }); FXk.ring(A, { t: 1.25, at: sp, r0: 1.3, r1: 1.4, dur: 4.1, w: 0.06, op: 0.35, e: 'lin' });
    [2.3, 3.3, 4.3].forEach((t) => { FXk.ring(A, { t, at: () => sp(t + 0.12), r0: 0.4, r1: 1.5, dur: 0.3, w: 0.25 }); FXk.trail(A, { of: (tt) => sp(tt).add(new T.Vector3(0, 2.6, 0)), t0: t - 0.12, t1: t, len: 0.12, w: 0.5, op: 0.4 }); });
    A.card.dum.forEach((dm, i) => { for (let k = 0; k < 8; k++) { const t = 1.5 + k * 0.5, p = sp(t); if (Math.hypot(dm.x - p.x, dm.z - p.z) < 1.5) A.hit(i, t, 7); } });
    A.cap(1.3, 5.6, '每秒跳到 4 u 内最密的敌群', 'Each second it hops to the thickest pack within 4 u'); } };

// VO12 Spinning top: the ring of twelve spins up and rolls 5 u along her aim in 1 s: 16 to each foe it passes
VO.F12 = { ...DEFS.F12, T: 3.0, cam: { x: 1.4, z: 0, w: 8.2 }, her: H(-1.6), dum: [[0.4, 0.3], [1.4, -0.4], [2.4, 0.4], [3.3, -0.2], [2.0, 2.0]],
  fx(A) { const T = A.THREE, s0 = 0.58, s1 = 0.94, tr = 1.0, D = 5.0; const g = A.add(new T.Group()); g.visible = false;
    for (let k = 0; k < 12; k++) { const m = new T.Mesh(A.arrowGeo, A.arrowMat); const an = k * Math.PI / 6; m.position.set(Math.cos(an) * 0.55, Math.sin(an) * 0.55, 0); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(Math.cos(an), Math.sin(an), 0)); m.scale.setScalar(0.65); g.add(m); }
    const rim = new T.Mesh(new T.TorusGeometry(0.62, 0.025, 6, 40), A.mat(A.C.jade, A.F.FLAT)); g.add(rim);
    const x0 = herAt(A, s1).x + 0.6; A.fx((t) => { g.visible = t >= s0 + 0.2 && t <= tr + 1.25; if (!g.visible) return; const u = A.clamp((t - tr) / 1.0); const x = A.lerp(x0, x0 + D, u);
      g.position.set(x, 0.66, 0); g.rotation.set(0, 0, -(t - s0) * 14); g.scale.setScalar(A.EASE.out(A.clamp((t - s0 - 0.2) / 0.2)) * (t > tr + 1.0 ? Math.max(0, 1 - (t - tr - 1.0) / 0.25) : 1)); rim.material.uniforms.op.value = 0.6; });
    FXk.tube(A, { t: tr, dur: 1.0, hold: 0.2, out: 0.4, flat: true, w: 0.35, col: '#BDB6A8', op: 0.3, e: 'lin', pts: () => [new T.Vector3(x0, 0.02, 0), new T.Vector3(x0 + D, 0.02, 0)] });
    A.card.dum.forEach((dm, i) => { if (Math.abs(dm.z) < 0.9) { const u = (dm.x - x0) / D; A.hit(i, tr + u * 1.0, 16, { knock: [0.3, dm.z > 0 ? 0.4 : -0.4] }); FXk.spark(A, { t: tr + u * 1.0, at: { d: i }, r: 0.12, col: A.C.parch }); } });
    A.cap(0.4, 2.8, '箭环立起来向前滚 5 u：碰到的每个敌人 16', 'The ring stands up and rolls 5 u: 16 to each foe it passes'); } };
VO.F12.seq = [[0.3, 'rWhirl'], [0.98, 'kSweep', { from: 0.3, to: 0.6 }]];

// VO13 Web: the six hops (10 each); each hop leaves a jade thread between the two foes 3 s: 6 and slow to foes that touch it
VO.F13 = { ...DEFS.F13, T: 4.2,
  fx(A) { capOnly(A, DEFS.F13.fx, []); const tL = 0.58, seg = 0.11; for (let i = 0; i < 5; i++) { const t = tL + seg * (i + 2); thread(A, () => at0(A, i, t, 0.05), () => at0(A, i + 1, t, 0.05), t, { hold: 3.0, out: 0.4, r: 0.016, op: 0.75 }); }
    // two foes walk into the threads: 6 and slowed
    A.card.dum.forEach((dm, i) => { if (i % 2 === 0) A.move(i, 1.4, [0.0, -0.6], 1.6, 'lin'); });
    [0, 2, 4].forEach((i) => { A.hit(i, 1.9, 6); A.hit(i, 2.9, 6); A.status(i, 1.9, 'slow', 1.6); });
    A.cap(0.4, 1.4, '跳六次，各 10', 'Six hops, 10 each'); A.cap(1.4, 4.0, '每跳留下一根丝 3 秒：碰到的敌人 6，减速 30%', 'Each hop leaves a thread 3 s: 6 and slow 30% to foes touching it'); } };

// VO14 Updraft: the twister lifts every foe within 2 u for 1.5 s and shoots them as the base
VO.F14 = { ...DEFS.F14, T: 4.2, dum: [[1.0, -0.8], [1.9, 0.6], [1.0, 0.9], [2.0, -0.9], [3.6, 1.6]],
  fx(A) { const T = A.THREE, tL = 0.9, spot = [1.4, 0, 0], t0 = tL + 0.18; FXa(A, { t: tL, dur: 0.18, to: [spot[0], 0.1, spot[2]], len: 0.9, glow: A.C.jade });
    FXk.twister(A, { t0, t1: t0 + 1.8, at: spot, r: 1.6, h: 3.0 }); FXk.ring(A, { t: t0, at: spot, r0: 0.3, r1: 2.0, dur: 0.4, w: 0.12 });
    [0, 1, 2, 3].forEach((i) => { const dm = A.card.dum[i]; A.moveTo(i, t0 + 0.05, [spot[0] + (dm.x - spot[0]) * 0.5, (dm.z) * 0.5], 0.4, 'out'); A.launch(i, t0 + 0.1 + i * 0.05, 1.3); });
    for (let k = 0; k < 6; k++) { const tk = t0 + 0.35 + k * 0.22, i = k % 4; FXa(A, { t: tk, dur: 0.12, from: [spot[0], 2.0, spot[2]], to: { d: i }, len: 0.6, hits: [{ d: i, n: 6 }] }); }
    A.cap(0.4, 4.0, '旋风把 2 u 内的敌人卷上天 1.5 秒，再射：6 × 6', 'The twister lifts every foe within 2 u for 1.5 s and shoots them: 6 × 6'); } };

// VO15 Linked traps: three traps 2 u apart joined by a cord; when one snaps, the cord drags the foes on the others to it
VO.F15 = { T: 4.8, cam: { x: 0.0, z: 0, w: 7.6 }, her: H(-2.8), seq: [[0.3, 'castPlant', { to: 0.5 }], [0.7, 'castPlant', { from: 0.1, to: 0.5 }], [1.1, 'castPlant', { from: 0.1 }]],
  root: [{ t: 0.3, sd: 2.0 }, { t: 0.7, sd: 2.0 }, { t: 0.82, sd: 0.0, e: 'out' }, { t: 1.1 }, { t: 1.22, sd: -2.0, e: 'out' }, { t: 1.6, sd: -2.0 }, { t: 1.95, sd: -0.6, fw: -1.0 }], hops: [[0.7, 0.82, 0.1], [1.1, 1.22, 0.1], [1.6, 1.95, 0.25]],
  dum: [[0.6, -1.9], [0.4, 0.1], [0.7, 2.1]],
  fx(A) { const T = A.THREE, xs = -2.1, P = [[xs, 2.0], [xs, 0.0], [xs, -2.0]], tP = [0.62, 1.02, 1.42];
    P.forEach((p, k) => { FXk.stuck(A, { t: tP[k], dur: 4.6 - tP[k], at: [p[0], 0.18, p[1]], dir: [0.1, -1, 0] }); FXk.ring(A, { t: tP[k], at: [p[0], 0, p[1]], r0: 0.2, r1: 0.6, dur: 0.3, w: 0.2, col: A.C.bone }); FXk.ring(A, { t: tP[k] + 0.3, at: [p[0], 0, p[1]], r0: 0.59, r1: 0.6, dur: 4.2 - tP[k], w: 0.06, col: A.C.bone, op: 0.4, e: 'lin' }); });
    thread(A, [xs, 0.12, 2.0], [xs, 0.12, 0.0], 1.05, { hold: 1.3, out: 0.2, sag: 0.05 }); thread(A, [xs, 0.12, 0.0], [xs, 0.12, -2.0], 1.45, { hold: 0.9, out: 0.2, sag: 0.05 });
    // foes walk onto all three; the middle one snaps and the cord reels the other two in
    A.card.dum.forEach((dm, i) => A.moveTo(i, 1.4, [xs + 0.05, P[2 - i][1]], 0.9, 'lin')); const ts = 2.4;
    [0, 2].forEach((i) => { A.moveTo(i, ts + 0.1, [xs + 0.3, i ? 0.45 : -0.45], 0.35, 'in'); thread(A, () => at0(A, i, ts + 0.05, 0.3), [xs, 0.3, 0], ts, { hold: 0.35, out: 0.2, r: 0.025 }); });
    for (let k = 0; k < 5; k++) FXk.tube(A, { t: ts + k * 0.015, dur: 0.12, hold: 0.5, out: 0.25, r: 0.03, col: A.C.bone, op: 0.85, e: 'out', pts: () => [new T.Vector3(xs + Math.cos(k) * 0.6, 0.02, Math.sin(k) * 0.6), new T.Vector3(xs + Math.cos(k + 0.6) * 0.45, 0.7, Math.sin(k + 0.6) * 0.45), new T.Vector3(xs, 1.1, 0)] });
    [0, 1, 2].forEach((i) => { A.status(i, ts + 0.5, 'slow', 2.0); for (let k = 0; k < 4; k++) A.hit(i, ts + 0.5 + k * 0.5, 6); }); A.shake(ts, 0.04, 0.15);
    A.cap(0.4, 2.3, '三个陷阱一排，用绳连着', 'Three traps in a row, joined by a cord'); A.cap(2.3, 4.6, '一个合上，绳把另两个上的敌人拖过来；减速 40%，每半秒 6', 'One snaps: the cord drags the others in; slowed 40%, 6 a half second'); } };

// VO16 Crossfire: two curtains sweep in from her left and right and cross over her aim: three hits of 10 each; the cross takes both
VO.F16 = { T: 4.2, cam: { x: 1.4, z: 0, w: 8.8 }, her: H(-3.0), seq: [[0.3, 'rStorm', { from: 0.3 }]],
  dum: [[1.6, -1.7], [2.3, 0.15], [2.8, -0.25], [3.2, 1.8]],
  fx(A) { const T = A.THREE, tL = 0.92, cx = 2.4, cz = 0.0; FXa(A, { t: tL, dur: 0.3, to: [-1.6, 4.2, 0], len: 1.2, glow: A.C.jade });
    // each curtain is a row of falling arrows that marches in from one side, one row every 0.17 s
    const rows = [];
    [1, -1].forEach((sd) => { for (let k = 0; k < 6; k++) { const tk = 1.4 + k * 0.17, zz = cz + sd * (2.5 - k * 0.5); rows.push([tk, zz, sd]);
        for (let j = 0; j < 5; j++) { const x = cx - 1.6 + j * 0.8; FXa(A, { t: tk, dur: 0.16, from: [x - 0.3, 3.0, zz + sd * 0.5], to: [x, 0.05, zz], len: 0.9, w: 0.07, stick: 0.3 }); }
        FXk.tube(A, { t: tk + 0.16, dur: 0.05, hold: 0.15, out: 0.25, flat: true, w: 0.22, op: 0.45, e: 'lin', pts: () => [new T.Vector3(cx - 1.9, 0.03, zz), new T.Vector3(cx + 1.9, 0.03, zz)] }); } });
    const tx = 1.4 + 5 * 0.17 + 0.16; [[-1, 1], [1, 1]].forEach(([a]) => FXk.tube(A, { t: tx, dur: 0.1, hold: 0.45, out: 0.4, flat: true, w: 0.42, op: 0.65, e: 'lin', pts: () => [new T.Vector3(cx - 1.3, 0.04, cz - 1.3 * a), new T.Vector3(cx + 1.3, 0.04, cz + 1.3 * a)] }));
    FXk.ring(A, { t: tx, at: [cx, 0, cz], r0: 0.3, r1: 1.6, dur: 0.35, w: 0.25 }); A.shake(tx, 0.04, 0.3);
    A.card.dum.forEach((dm, i) => [1, -1].forEach((sd) => { let n = 0; rows.forEach(([tk, zz, s2]) => { if (s2 === sd && n < 3 && Math.abs(dm.z - zz) <= 0.55) { A.hit(i, tk + 0.16 + n * 0.04, 10); n++; } }); }));
    A.cap(0.4, 1.4, '两道箭幕从左右两边扫进来', 'Two curtains sweep in from left and right'); A.cap(1.4, 4.0, '每道各三次 10；交叉处两道都吃', '3 × 10 from each; the cross takes both'); } };

// VO17 Gust: one flap of the fanned arrows: every foe in a 90°, 3 u cone takes 9, is knocked 2 u back, its shots in flight drop
VO.F17 = { T: 2.8, cam: { x: 0.2, z: 0, w: 7.0 }, her: H(-2.0), seq: [[0.3, 'castSweep', { speed: 0.9 }]],
  dum: [[-0.6, -0.8], [-0.3, 0.1], [-0.6, 0.9], [2.8, 0.6]],
  fx(A) { const T = A.THREE, tL = 0.68; foeShot(A, { t: 0.45, dur: 0.6, from: [2.8, 0.7, 0.6], to: [-2.0, 0.7, 0.1], stop: 0.47, r: 0.13 }); FXk.dust(A, { t: 0.73, at: [0.55, 0.5, 0.35], n: 4, col: CRIM, r: 0.06, sp: 0.6, op: 0.6 });
    for (let k = 0; k < 4; k++) FXk.tube(A, { t: tL + k * 0.03, dur: 0.2, hold: 0.05, out: 0.3, flat: true, w: 0.25, op: 0.45, e: 'out', pts: () => { const c = herAt(A, tL); const r = 0.9 + k * 0.6; return [...Array(9)].map((_, i) => { const a = (-45 + i * 11.25) * Math.PI / 180; return new T.Vector3(c.x + Math.cos(a) * r, 0.35, c.z + Math.sin(a) * r); }); } });
    [0, 1, 2].forEach((i) => { const dm = A.card.dum[i], dx = dm.x + 2.0, dz = dm.z, l = Math.hypot(dx, dz); A.hit(i, tL + 0.08, 9, { knock: [dx / l * 2.0, dz / l * 2.0], kdur: 0.35 }); FXk.dust(A, { t: tL + 0.1, at: [dm.x, 0, dm.z], n: 5, dir: [dx, dz], sp: 1.8 }); });
    A.cap(0.4, 2.6, '一扇：90° 3 u 内各 9，吹退 2 u，飞来的子弹落地', 'One flap: 9 in a 90°, 3 u cone, knocked 2 u back; shots in flight drop'); } };

// VO18 Decoy: a feather image of her stays where she stood: foes within 4 u attack it 2 s, then it bursts into eight arrows of 8
VO.F18 = { ...DEFS.F18, T: 3.6, dum: [[0.0, -0.8], [0.2, 0.7], [1.4, 0.0]],
  fx(A) { const T = A.THREE, c = herAt(A, 0.38); FXk.dust(A, { t: 0.94, at: () => herAt(A, 0.95), n: 5, dir: [-1, 0] });
    // the feather outline of her: a pale standing shape that shivers as it is struck
    const g = A.add(new T.Group()); g.visible = false; const fm = A.mat(A.C.parch, A.F.FLAT);
    for (let k = 0; k < 16; k++) { const s = new T.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.09, 0.22, 0, 0.46); s.quadraticCurveTo(-0.09, 0.22, 0, 0); const m = new T.Mesh(new T.ShapeGeometry(s), fm); m.material.side = T.DoubleSide; const a = (k / 16) * 6.28 * 2; const y = 0.15 + (k / 16) * 0.95; const r = 0.22 * (1 - (k / 16) * 0.45); m.position.set(Math.cos(a) * r, y, Math.sin(a) * r); m.rotation.set(0, -a + 1.57, (k % 2 ? 0.25 : -0.25)); g.add(m); }
    const ear = (sx) => { const m = new T.Mesh(new T.ShapeGeometry((() => { const s = new T.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.08, 0.2, 0, 0.42); s.quadraticCurveTo(-0.08, 0.2, 0, 0); return s; })()), fm); m.position.set(0, 1.1, sx * 0.07); m.rotation.set(sx * 0.2, 1.57, 0); g.add(m); }; ear(1); ear(-1);
    FXk.disc(A, { t: 0.4, at: [c.x, 0, c.z], r0: 0.45, r1: 0.5, dur: 2.05, op: 0.2 }); FXk.ring(A, { t: 0.4, at: [c.x, 0, c.z], r0: 0.2, r1: 4.0, dur: 0.45, w: 0.08, op: 0.5 });
    A.fx((t) => { const a = t - 0.4; g.visible = a >= 0 && a < 2.05; if (!g.visible) return; g.position.set(c.x, 0, c.z); g.rotation.y = Math.sin(a * 20) * 0.08 * (a > 0.6 ? 1 : 0); fm.uniforms.op.value = 0.85 * A.clamp(a / 0.2); });
    [0, 1, 2].forEach((i) => { A.moveTo(i, 0.6, [c.x + 0.6 + i * 0.2, (i - 1) * 0.6], 0.5, 'lin'); [1.2, 1.7].forEach((t) => FXk.spark(A, { t: t + i * 0.07, at: [c.x + 0.2, 0.7, c.z + (i - 1) * 0.2], r: 0.1, col: CRIM })); });
    const tb = 2.45; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; FXa(A, { t: tb, dur: 0.2, from: [c.x, 0.6, c.z], to: [c.x + Math.cos(a) * 2.6, 0.55, c.z + Math.sin(a) * 2.6], len: 0.6, scale: 0.8 }); }
    FXk.ring(A, { t: tb, at: [c.x, 0, c.z], r0: 0.2, r1: 2.0, dur: 0.35, w: 0.3 }); [0, 1, 2].forEach((i) => A.hit(i, tb + 0.08, 8, { knock: [0.4, (i - 1) * 0.3] }));
    A.cap(0.4, 2.4, '原地留下羽毛替身：4 u 内的敌人打它 2 秒', 'A feather decoy stays: foes within 4 u attack it for 2 s'); A.cap(2.4, 3.4, '然后炸成八支箭：各 8', 'Then it bursts into eight arrows: 8 each'); } };

// VO19 Bouncing launch: the kick launches one foe; where it lands it launches the foe it lands on, up to five: 10 each
VO.F19 = { ...DEFS.F19, T: 4.0, cam: { x: 0.6, z: 0, w: 8.4 }, dum: [[-1.15, -0.1], [0.2, 0.3], [1.4, -0.3], [2.5, 0.25], [3.5, -0.2]],
  fx(A) { const T = A.THREE, tk = 0.6; FXk.trail(A, { of: 'footL', of2: 'footR', t0: 0.48, t1: 0.66, len: 0.16, op: 0.75 }); A.hit(0, tk, 10, { up: 0.9 });
    // each launched foe flies onto the next and pops it up
    for (let i = 0; i < 4; i++) { const t0 = tk + i * 0.55, dm = A.card.dum[i], nx = A.card.dum[i + 1]; A.moveTo(i, t0 + 0.02, [nx.x - 0.25, nx.z], 0.5, 'lin'); A.launch(i, t0 + 0.02, 0.9); A.hit(i + 1, t0 + 0.52, 10, { up: 0.9 });
      FXk.ring(A, { t: t0 + 0.52, at: () => at0(A, i + 1, t0 + 0.52), r0: 0.2, r1: 0.8, dur: 0.25, w: 0.3 }); FXk.trail(A, { of: (t) => at0(A, i, t, 0.6), t0: t0 + 0.05, t1: t0 + 0.5, len: 0.2, w: 0.12, op: 0.5 }); }
    FXk.dust(A, { t: 1.04, at: () => herAt(A, 1.05), n: 6 });
    A.cap(0.4, 3.8, '踢飞一个；它落在谁身上就把谁弹起，最多五个：各 10', 'The kick launches one; it launches the foe it lands on, up to five: 10 each'); } };

// VO20 Two knots: the knot and a second at the pointer; the two packs are dragged into each other and crash: 4 each, stun 0.4 s
VO.F20 = { ...DEFS.F20, T: 3.6, cam: { x: 0.8, z: 0, w: 9.0 }, dum: [[0.4, -2.0], [1.2, -2.6], [0.7, -1.4], [2.4, 2.0], [1.6, 2.6], [2.2, 1.4]],
  fx(A) { const T = A.THREE, tT = 0.92, K = [[0.8, -2.0], [2.0, 2.0]], m = [1.4, 0.0];
    FXk.trail(A, { of: 'tipA', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 }); FXk.trail(A, { of: 'tipB', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 });
    K.forEach((k, j) => { thread(A, () => A.at('tipA', tT + j * 0.12), [k[0], 0.6, k[1]], tT + j * 0.12, { hold: 0.25, out: 0.2, r: 0.025, sag: -0.5 }); FXk.helix(A, { t: tT + j * 0.12, dur: 0.15, from: [k[0], 0.1, k[1]], to: [k[0], 1.1, k[1]], r: 0.5, turns: 2, strands: 2, hold: 0.3, out: 0.25, op: 0.7 }); });
    A.card.dum.forEach((dm, i) => { const j = i < 3 ? 0 : 1, sgn = j ? 1 : -1; A.moveTo(i, tT + 0.35, [m[0] + (i % 3 - 1) * 0.35, m[1] + sgn * 0.35], 0.55, 'in'); A.hit(i, tT + 0.9, 4, { stun: 0.4 }); });
    FXk.dust(A, { t: tT + 0.9, at: [m[0], 0, m[1]], n: 10, sp: 2.0, r: 0.25 }); FXk.ring(A, { t: tT + 0.9, at: [m[0], 0, m[1]], r0: 0.3, r1: 1.4, dur: 0.3, w: 0.3 }); A.shake(tT + 0.9, 0.05, 0.2);
    A.cap(0.4, 3.4, '两个风结：两群敌人被拖到一起撞上，各 4，眩晕 0.4 秒', 'Two knots: the two packs are dragged into each other: 4 each, stun 0.4 s'); } };
VO.F20.seq = [[0.3, 'kKnot']];

// VO21 Dust cloud: the three kicks raise a 3 u dust cloud for 3 s; foes in it are blinded (their hits miss); her arrows still find them
VO.F21 = { ...DEFS.F21, T: 4.6, dum: [[0.32, 0.2], [-1.3, 0.72], [-0.92, -0.95], [1.2, -0.8]],
  fx(A) { const T = A.THREE, c = herAt(A, 0.5); FXk.trail(A, { of: 'footL', t0: 0.42, t1: 1.12, len: 0.16, w: 0.18, op: 0.4, col: '#BDB6A8' }); FXk.trail(A, { of: 'footR', t0: 0.42, t1: 1.12, len: 0.16, w: 0.18, op: 0.4, col: '#BDB6A8' });
    [0.4, 0.7, 1.0].forEach((tk) => [0, 1, 2].forEach((i) => A.hit(i, tk + 0.02 * i, 6)));
    for (let k = 0; k < 7; k++) FXk.dust(A, { t: 0.45 + k * 0.45, at: [c.x, 0, c.z], n: 12, sp: 2.6, r: 0.55, op: 0.42, dur: 1.4, rise: 3, seed: 3 + k });
    FXk.ring(A, { t: 0.5, at: [c.x, 0, c.z], r0: 2.9, r1: 3.0, dur: 3.2, w: 0.05, col: '#BDB6A8', op: 0.5, e: 'lin' });
    // a blinded foe's hit swings wide; her arrow still finds a foe in the cloud
    foeShot(A, { t: 1.7, dur: 0.4, from: [1.2, 0.7, -0.8], to: [c.x + 0.6, 0.7, c.z + 2.0] }); A.cap(1.6, 2.5, '致盲：打偏', 'Blinded: it misses');
    FXa(A, { t: 2.6, dur: 0.12, from: 'hips', to: { d: 3 }, len: 0.6, hits: [{ d: 3, n: 12 }] });
    A.cap(0.4, 1.6, '三脚各 6，扬起 3 u 的沙尘 3 秒', 'Three kicks of 6 raise a 3 u dust cloud for 3 s'); A.cap(2.5, 4.4, '她的箭照样打中', 'Her arrows still find them'); } };
VO.F21.seq = [[0.3, 'kCyclone'], [2.4, 'combo1']];

// VO22 Ripple: the strikes and the shot on one foe; then the shock runs through every foe touching it, and on through the knot: 10 each
VO.F22 = { ...DEFS.F22, T: 3.2, cam: { x: 0.2, z: 0, w: 7.0 }, dum: [[-0.85, 0.05], [-0.35, 0.45], [0.05, -0.15], [0.2, 0.6], [0.6, 0.15], [2.4, 0.9]],
  fx(A) { const h0 = A.hit; A.hit = function (i, t, n, o = {}) { return h0.call(this, i, t, n, { ...o, knock: null }); }; capOnly(A, DEFS.F22.fx, []); A.hit = h0;
    const order = [[0, 1, 1.0], [1, 2, 1.12], [0, 2, 1.12], [2, 3, 1.24], [3, 4, 1.36], [2, 4, 1.36]]; const hit = new Set([0]);
    FXk.ring(A, { t: 0.95, at: () => at0(A, 0, 0.95), r0: 0.2, r1: 0.7, dur: 0.25, w: 0.35 });
    order.forEach(([a, b, t]) => { thread(A, () => at0(A, a, t, 0.7), () => at0(A, b, t, 0.7), t, { dur: 0.08, hold: 0.2, out: 0.25, r: 0.05, op: 0.9 }); if (!hit.has(b)) { hit.add(b); A.hit(b, t + 0.08, 10); FXk.spark(A, { t: t + 0.08, at: { d: b }, r: 0.12, col: A.C.parch }); } });
    A.hit(0, 1.08, 10);
    A.cap(0.4, 0.95, '弓击 8、8，近射 14', 'Bow strikes 8, 8, the shot 14'); A.cap(0.95, 3.0, '冲击沿着挨在一起的敌人一个传一个：各 10', 'The shock runs on through every foe touching another: 10 each'); } };

// VO23 Parting fans: each second of the run she looses a fan of five arrows behind her: 6 each
VO.F23 = { ...DEFS.F23, cam: { x: -1.6, z: -1.5, w: 8.8 }, dum: [[0.25, 0.3], [-1.75, -4.1], [-4.4, -0.35]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footL', t0: 0.6, t1: 3.6, len: 0.3, w: 0.1, op: 0.4 }); FXk.trail(A, { of: 'footR', t0: 0.6, t1: 3.6, len: 0.3, w: 0.1, op: 0.4 });
    [1.4, 2.4, 3.4].forEach((tk) => { const r = A.rootAt(tk), f = A.fwd(tk), c = [r.x, 0.6, r.z], b = Math.atan2(-f.x, -f.z);
      [-30, -15, 0, 15, 30].forEach((a) => { const bb = b + a * Math.PI / 180; FXa(A, { t: tk, dur: 0.16, from: c, to: [c[0] + Math.sin(bb) * 3.0, 0.55, c[2] + Math.cos(bb) * 3.0], len: 0.8, w: 0.08 }); });
      FXk.tube(A, { t: tk, dur: 0.16, hold: 0.15, out: 0.3, flat: true, w: 0.14, op: 0.4, e: 'out', pts: () => [...Array(9)].map((_, i) => { const bb = b + (-30 + i * 7.5) * Math.PI / 180; return new T.Vector3(c[0] + Math.sin(bb) * 2.2, 0.03, c[2] + Math.cos(bb) * 2.2); }) });
      A.card.dum.forEach((dm, i) => { const p = A.dpos(i, tk); const dx = p.x - c[0], dz = p.z - c[2], d = Math.hypot(dx, dz); const df = Math.abs(((Math.atan2(dx, dz) - b + 3 * Math.PI) % (2 * Math.PI)) - Math.PI); if (d < 3.2 && df < 0.6) { A.hit(i, tk + 0.16 * d / 3, 6); A.hit(i, tk + 0.04 + 0.16 * d / 3, 6); } }); });
    A.cap(0.6, 4.4, '跑的每一秒，向身后扇射五箭：各 6', 'Each second of the run, a fan of five behind her: 6 each'); } };

// VO24 Fountain: the dive; the landing crater sprays arrows for 1.5 s: 3 to each foe within 3 u every 0.3 s
VO.F24 = { ...DEFS.F24, T: 4.0, dum: [[0.2, -0.9], [0.95, 0.9], [-0.5, 0.7], [3.3, -1.2], [4.3, 0.6]],
  fx(A) { capOnly(A, DEFS.F24.fx, []); const T = A.THREE, tl = 1.58, c = herAt(A, tl);
    FXk.ring(A, { t: tl, at: [c.x, 0, c.z], r0: 0.3, r1: 1.0, dur: 0.3, w: 0.4 }); FXk.ring(A, { t: tl + 0.2, at: [c.x, 0, c.z], r0: 0.75, r1: 0.8, dur: 1.6, w: 0.15, op: 0.5, col: A.C.bone, e: 'lin' });
    for (let k = 0; k < 18; k++) { const tk = tl + 0.1 + k * 0.08, a = k * 2.4, r = 1.2 + (k % 4) * 0.5; const to = [c.x + Math.cos(a) * r, 0.05, c.z + Math.sin(a) * r];
      FXa(A, { t: tk, dur: 0.32, from: [c.x, 0.2, c.z], to, len: 0.7, w: 0.06, arc: 1.4, stick: 0.25 }); }
    A.card.dum.forEach((dm, i) => { if (Math.hypot(dm.x - c.x, dm.z - c.z) < 3.0) for (let k = 0; k < 5; k++) A.hit(i, tl + 0.3 + k * 0.3, 3); });
    A.cap(0.4, 1.6, '鹰坠下砸', 'The dive'); A.cap(1.6, 3.8, '坑里喷箭 1.5 秒：3 u 内每 0.3 秒各 3', 'The crater sprays arrows 1.5 s: 3 to each foe within 3 u every 0.3 s'); } };
