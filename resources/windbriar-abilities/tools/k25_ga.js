// ------------------------------------------------ Gale 弓斗 (kit 2.5)
const capsOf = (A, fn) => capOnly(A, fn, []);
const pips = (A, i, t0, pops, burst) => { const T = A.THREE; const ms = [...Array(5)].map(() => { const m = A.add(new T.Mesh(new T.SphereGeometry(0.06, 10, 8), new T.MeshBasicMaterial({ color: A.C.jade }))); m.visible = false; return m; });
  A.fx((t) => ms.forEach((m, k) => { const end = pops[k]; m.visible = t >= t0 && t < end; if (!m.visible) return; const p = A.dpos(i, t), a = k * 1.2566 + t * 2.0; m.position.set(p.x + Math.cos(a) * 0.32, p.y + 1.55, p.z + Math.sin(a) * 0.32); m.scale.setScalar(1 + 0.25 * Math.sin(t * 10 + k)); }));
  pops.forEach((tp, k) => FXk.spark(A, { t: tp, at: () => { const p = A.dpos(i, tp), a = k * 1.2566 + tp * 2.0; return new T.Vector3(p.x + Math.cos(a) * 0.32, p.y + 1.55, p.z + Math.sin(a) * 0.32); }, r: 0.1, col: A.C.jade })); };

// GA1 Chase: a spinning back kick flies the foe 3 u into the others (8); the arrow chases it and nails it where it lands: 30, stun 0.4 s
GA.F1 = { hops: [[0.3, 0.42, 0.08]], T: 3.0, cam: { x: 0.4, z: 0, w: 7.2 }, her: H(-1.6), seq: [[0.3, 'gMule'], [1.0, 'sPierce', { from: 0.1 }]],
  root: [{ t: 0.3 }, { t: 0.42, spin: 180, e: 'out' }, { t: 0.45 }, { t: 0.52, fw: 0.2, y: 0.3, pitch: 46, e: 'out', ye: 'out' }, { t: 0.58, fw: 0.2, y: 0.3, pitch: 46 }, { t: 0.8, fw: 0.05, y: 0, pitch: 0, spin: 360, ye: 'in' }],
  dum: [[-0.7, 0.05], [2.6, -0.45], [2.75, 0.55]],
  fx(A) { FXk.trail(A, { of: 'footL', of2: 'footR', t0: 0.46, t1: 0.6, len: 0.14, op: 0.7 }); A.hit(0, 0.52, 8, { stop: true }); kickRing(A, 0.52, () => dumAt(A, 0, 0.52, 0.6), 0.5);
    A.moveTo(0, 0.54, [2.3, 0.05], 0.42, 'out'); A.launch(0, 0.54, 0.35); FXk.trail(A, { of: (t) => { const p = A.dpos(0, t); return new A.THREE.Vector3(p.x, p.y + 0.6, p.z); }, t0: 0.56, t1: 0.96, len: 0.25, w: 0.2, op: 0.45 });
    [1, 2].forEach((i) => A.hit(i, 0.97, 4, { knock: [0.45, i === 1 ? -0.3 : 0.3], nostop: true })); FXk.dust(A, { t: 0.97, at: [2.3, 0, 0.05], n: 7, sp: 1.4 });
    const tL = 1.15; FXa(A, { t: tL, dur: 0.16, to: { d: 0 }, len: 1.2, glow: A.C.jade, hits: [{ d: 0, n: 30, big: true, stun: 0.4 }] }); FXk.ring(A, { t: tL + 0.16, at: () => at0(A, 0, tL + 0.16, 0.05), r0: 0.2, r1: 0.8, dur: 0.3, w: 0.3 });
    A.cap(0.3, 1.1, '回旋后踢把它踢飞 3 u，撞进敌群：8', 'A spinning back kick flies it 3 u into the others: 8'); A.cap(1.1, 2.8, '箭追上去钉住它：30，眩晕 0.4 秒', 'The arrow chases it and nails it: 30, stun 0.4 s'); } };

// GA2 Wound kick: held, she coils on one paw up to 0.8 s; full, a 2.5 u spinning kick: 40, push 1 u
GA.F2 = { T: 3.2, cam: { x: -0.4, z: 0, w: 7.0 }, her: H(-0.4), seq: [[0.3, 'gRound', { to: 0.14, speed: 0.2 }], [1.1, 'gRound', { from: 0.14 }]],
  root: [{ t: 0.3 }, { t: 1.1, spin: -60, y: -0.04, e: 'out' }, { t: 1.2, spin: 0, y: 0.25, e: 'in', ye: 'out' }, { t: 1.42, spin: 360, y: 0.2, e: 'out' }, { t: 1.6, spin: 420, y: 0, ye: 'in' }],
  dum: [[1.3, 0.6], [-0.7, -1.7], [-1.9, 0.9], [0.6, -1.5], [3.0, 1.2]],
  fx(A) { const T = A.THREE, c = footAt(A, 0.3);
    // the coil: wind winds tighter round her standing paw while she holds
    FXk.helix(A, { t: 0.35, dur: 0.75, from: [c.x, 0.05, c.z], to: [c.x, 1.0, c.z], r: 0.45, turns: 3, strands: 2, hold: 0.05, out: 0.2, op: 0.5 });
    [0.45, 0.65, 0.85, 1.0].forEach((t, k) => FXk.ring(A, { t, at: [c.x, 0, c.z], r0: 1.4 - k * 0.2, r1: 0.35, dur: 0.22, w: 0.12 + k * 0.05, e: 'in', op: 0.4 + k * 0.12 }));
    FXk.ring(A, { t: 1.05, at: [c.x, 0, c.z], r0: 0.3, r1: 0.4, dur: 0.12, w: 0.5, col: A.C.parch }); A.cap(0.3, 1.1, '按住：单爪蓄力最多 0.8 秒', 'Held: she coils on one paw for up to 0.8 s');
    FXk.trail(A, { of: 'footR', t0: 1.18, t1: 1.48, len: 0.22, w: 0.24, op: 0.75 }); FXk.ring(A, { t: 1.25, at: [c.x, 0, c.z], r0: 0.4, r1: 2.5, dur: 0.3, w: 0.2 }); FXk.disc(A, { t: 1.25, at: [c.x, 0, c.z], r0: 0.4, r1: 2.5, dur: 0.25, op: 0.18 }); A.shake(1.28, 0.06, 0.2);
    A.card.dum.forEach((dm, i) => { const dx = dm.x - c.x, dz = dm.z - c.z, d = Math.hypot(dx, dz); if (d <= 2.5) A.hit(i, 1.26 + (Math.atan2(dz, dx) + 3.14) / 6.28 * 0.15, 40, { big: true, knock: [dx / d, dz / d], kdur: 0.3, nostop: i > 0 }); });
    A.cap(1.1, 3.0, '满蓄：2.5 u 回旋踢，40，推开 1 u', 'Full: a 2.5 u spinning kick, 40, push 1 u'); } };

// GA3 Beat mark: the axe kick marks (12); five pips, one popped by each close hit; the fifth bursts: 18, launch 0.5 s
GA.F3 = { T: 4.2, cam: { x: -0.6, z: 0, w: 6.2 }, her: H(-2.0), seq: [[0.3, 'gAxe'], [1.4, 'kSweep', { to: 0.8 }], [2.25, 'gPush', { to: 0.32 }], [2.65, 'gWindKick'], [3.15, 'gRise']],
  root: [{ t: 0.3 }, { t: 0.43 }, { t: 0.62, fw: 0.5, y: 0.95, e: 'out', ye: 'out' }, { t: 0.67, fw: 0.54, y: 0.95 }, { t: 0.73, fw: 0.6, y: 0.8, ye: 'in' }, { t: 0.86, fw: 0.45, y: 0, ye: 'in' }, { t: 1.4 }, { t: 1.54, fw: 0.5, e: 'out' }, { t: 3.15, fw: 0.5 }, { t: 3.26 }, { t: 3.36, fw: 0.6, y: 0.45, e: 'out', ye: 'out' }, { t: 3.45, fw: 0.6, y: 0.45 }, { t: 3.7, fw: 0.55, y: 0, ye: 'in' }], hops: [[1.4, 1.54, 0.05]],
  dum: [[-0.75, 0.1]],
  fx(A) { FXk.trail(A, { of: 'footR', t0: 0.5, t1: 0.78, len: 0.16, w: 0.2, op: 0.75 }); A.hit(0, 0.73, 12, { big: true, stop: true }); FXk.ring(A, { t: 0.73, at: { d: 0, y: 1.0 }, r0: 0.1, r1: 0.6, dur: 0.22, w: 0.3 });
    const pops = [1.52, 1.66, 2.36, 2.86, 3.36]; pips(A, 0, 0.78, pops); [1.52, 1.66, 2.36, 2.86].forEach((t) => A.hit(0, t, 6));
    FXk.trail(A, { of: 'footR', t0: 3.24, t1: 3.4, len: 0.16, w: 0.2, op: 0.7 }); A.hit(0, 3.36, 18, { big: true, up: 1.2, stop: true }); FXk.ring(A, { t: 3.36, at: () => at0(A, 0, 3.36, 0.9), r0: 0.2, r1: 1.0, dur: 0.3, w: 0.35 }); FXk.disc(A, { t: 3.36, at: () => at0(A, 0, 3.36, 0.9), r0: 0.2, r1: 0.8, dur: 0.2, op: 0.4 });
    A.cap(0.3, 1.4, '下劈踢：12，头上挂五个节拍', 'An axe kick: 12, and five pips over its head'); A.cap(1.4, 3.2, '她每一下近身命中打掉一个', 'Each of her close hits pops one'); A.cap(3.2, 4.0, '第五个爆开：18，挑飞 0.5 秒', 'The fifth bursts: 18, launch 0.5 s'); } };

// GA4 Slingshot: the arrow ties a cord to a foe within 6 u; she slings herself along it: a flying two-paw kick, 30; foes within 1.5 u launched 0.4 s
GA.F4 = { T: 3.2, cam: { x: 0.4, z: 0, w: 7.6 }, her: H(-2.6), seq: [[0.3, 'sPierce', { to: 0.5 }], [0.82, 'dash', { to: 0.5 }], [1.2, 'gSpring', { fade: 0.05 }], [1.6, 'vault', { from: 0.12, fade: 0.08 }]],
  root: [{ t: 0.82 }, { t: 0.95, fw: -0.25, e: 'out' }, { t: 1.28, fw: 4.1, y: 0.55, e: 'in', ye: 'out' }, { t: 1.34, fw: 4.0, y: 0.55 }, ...rk(1.34, 1.8, (u) => ({ fw: 4.0 - 1.3 * u, y: 0.55 * (1 - u) + 0.6 * 4 * u * (1 - u), pitch: -360 * s01(u / 0.7) }))],
  dum: [[1.95, 0.05], [2.9, -0.8], [2.7, 1.0], [3.6, 0.2]],
  fx(A) { const T = A.THREE, tL = 0.55; FXa(A, { t: tL, dur: 0.16, to: { d: 0 }, len: 0.9, hits: [{ d: 0, n: 4 }] });
    // the cord: slack, then pulled taut as she is flung along it
    for (let k = 0; k < 6; k++) { const t = tL + 0.16 + k * 0.1; thread(A, () => A.at('handL', t), () => at0(A, 0, t, 0.7), t, { dur: 0.02, hold: 0.08, out: 0.02, r: 0.02, sag: k < 3 ? 0.35 - k * 0.1 : 0 }); }
    FXk.trail(A, { of: 'footL', of2: 'footR', t0: 0.95, t1: 1.32, len: 0.25, op: 0.6 }); FXk.trail(A, { of: 'chest', t0: 0.95, t1: 1.3, len: 0.35, w: 0.3, op: 0.25 });
    A.hit(0, 1.28, 30, { big: true, stop: true, knock: [0.6, 0] }); kickRing(A, 1.28, () => dumAt(A, 0, 1.28, 0.7), 1.5); A.shake(1.28, 0.06, 0.2);
    [1, 2, 3].forEach((i) => { const dm = A.card.dum[i]; if (Math.hypot(dm.x - 1.95, dm.z) <= 1.6) { A.launch(i, 1.3 + i * 0.02, 0.2); FXk.dust(A, { t: 1.3, at: [dm.x, 0, dm.z], n: 4 }); } });
    A.cap(0.3, 0.9, '一箭把绳子系在 6 u 内的敌人身上', 'An arrow ties a cord to a foe within 6 u'); A.cap(0.9, 3.0, '她顺绳弹过去：双爪飞踢 30，1.5 u 内挑飞 0.4 秒', 'She slings herself in: a two-paw flying kick 30; foes within 1.5 u launched 0.4 s'); } };

// GA5 Foot pin: a paw on its foot roots it 1.5 s; she twists round it firing fourteen hip shots of 4
GA.F5 = { T: 3.4, cam: { x: -0.6, z: 0, w: 5.8 }, her: H(-1.6, 0.0, 90), seq: [[0.3, 'gStamp', { to: 0.45 }], [0.75, 'gHipRun', { loop: true, until: 2.5, speed: 1.0, fade: 0.1 }], [2.5, 'idle', { from: 5.15, fade: 0.15 }]],
  root: [{ t: 0.75 }, ...rk(0.75, 2.5, (u) => { const a = u * 6.283; return { fw: 0.95 - 0.95 * Math.cos(a), sd: -0.95 * Math.sin(a), spin: -a * 180 / Math.PI }; }, 28)],
  dum: [[-0.65, 0.0]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footR', t0: 0.4, t1: 0.6, len: 0.12, w: 0.16, op: 0.7 }); A.hit(0, 0.55, 4, { stop: true }); FXk.dust(A, { t: 0.55, at: [-0.65, 0, 0], n: 5, sp: 1.0 });
    FXk.ring(A, { t: 0.55, at: [-0.65, 0, 0], r0: 0.2, r1: 0.5, dur: 0.2, w: 0.3 }); FXk.ring(A, { t: 0.7, at: [-0.65, 0, 0], r0: 0.38, r1: 0.4, dur: 1.4, w: 0.1, op: 0.7, e: 'lin' });
    for (let k = 0; k < 4; k++) FXk.tube(A, { t: 0.56 + k * 0.02, dur: 0.1, hold: 1.4, out: 0.2, r: 0.025, op: 0.75, e: 'out', pts: () => { const a = k * 1.57 + 0.4; return [new T.Vector3(-0.65 + Math.cos(a) * 0.4, 0.0, Math.sin(a) * 0.4), new T.Vector3(-0.65 + Math.cos(a + 0.5) * 0.3, 0.25, Math.sin(a + 0.5) * 0.3), new T.Vector3(-0.65 + Math.cos(a + 1) * 0.22, 0.4, Math.sin(a + 1) * 0.22)]; } });
    for (let k = 0; k < 14; k++) { const tk = 0.82 + k * 0.12; FXa(A, { t: tk, dur: 0.06, from: P3(A.at('nock', tk)), to: { d: 0, y: 0.45 + (k % 3) * 0.1 }, len: 0.45, w: 0.05, hits: [{ d: 0, n: 4 }] }); }
    A.cap(0.3, 0.8, '一爪踩住它的脚：定身 1.5 秒', 'A paw on its foot: rooted 1.5 s'); A.cap(0.8, 3.2, '她绕着它拧身，胯射十四箭：各 4', 'She twists round it with fourteen hip shots of 4'); } };

// GA6 Ride: she leaps onto a foe and rides it 1 s, steering it 2 u, then shoots down into it: 24
GA.F6 = { T: 3.4, cam: { x: -0.2, z: 0.4, w: 6.6 }, her: H(-2.2), seq: [[0.3, 'vault', { to: 0.55 }], [0.85, 'idle', { from: 5.15, to: 5.55, speed: 0.45 }], [1.75, 'combo1'], [2.2, 'vault', { from: 0.12, fade: 0.08 }]],
  root: [{ t: 0.3 }, { t: 0.72, fw: 1.6, y: 1.22, e: 's', ye: 'out' }, { t: 0.82, fw: 1.6, y: 1.18 }, { t: 1.82, fw: 2.6, sd: 1.0, y: 1.18, spin: -30 }, { t: 2.2, fw: 2.6, sd: 1.0, y: 1.18, spin: -30 }, { t: 2.6, fw: 1.7, sd: 1.0, y: 0, spin: -30, ye: 'in' }],
  dum: [[-0.6, 0.0], [1.0, 1.8]],
  fx(A) { A.hit(0, 0.74, 4, { stop: true }); kickRing(A, 0.74, () => dumAt(A, 0, 0.74, 1.1), 0.5); A.moveTo(0, 0.82, [0.4, 1.0], 1.0, 's'); A.status(0, 0.82, 'stun', 1.0);
    FXk.trail(A, { of: (t) => at0(A, 0, t, 0.03), t0: 0.85, t1: 1.82, len: 0.6, w: 0.25, op: 0.35 });
    A.hit(1, 1.7, 6, { knock: [0.4, 0.5] }); FXk.spark(A, { t: 1.7, at: { d: 1 }, r: 0.12, col: A.C.parch });
    FXa(A, { t: 1.97, dur: 0.06, from: 'nock', to: { d: 0, y: 0.5 }, len: 0.8, glow: A.C.jade, hits: [{ d: 0, n: 24, big: true }] }); FXk.ring(A, { t: 2.03, at: () => at0(A, 0, 2.03), r0: 0.2, r1: 1.0, dur: 0.3, w: 0.3 }); A.shake(2.03, 0.05, 0.2);
    A.cap(0.3, 1.8, '跳上敌人骑 1 秒，操纵它走 2 u', 'She leaps on and rides it 1 s, steering it 2 u'); A.cap(1.8, 3.2, '往下射一箭：24', 'Then shoots down into it: 24'); } };

// GA8 Arrow spear: the giant arrow as a spear: a spin, 24 within 3 u; then a javelin throw that drills through, 3 × 8, carrying small foes with it
GA.F8 = { T: 3.8, cam: { x: 1.0, z: 0, w: 9.0 }, her: H(-2.4), seq: [[0.3, 'rWhirl'], [1.4, 'castPoint', { speed: 1.2 }]],
  root: [{ t: 0.3 }, { t: 0.58 }, { t: 0.94, spin: 360, e: 'io2' }, { t: 1.4 }, { t: 1.55, fw: -0.25 }, { t: 1.75, fw: 0.3, e: 'out' }],
  dum: [[-1.4, 1.3], [-3.6, -1.0], [0.6, 0.15], [1.8, -0.15], [3.0, 0.1]],
  fx(A) { const T = A.THREE; const sp = A.add(new T.Mesh(A.arrowGeo, A.arrowMat)); sp.visible = false; sp.scale.set(1.6, 1.6, 2.6);
    A.fx((t) => { sp.visible = t >= 0.35 && t < 1.78; if (!sp.visible) return; const h = A.at('handR', t), f = A.fwd(t, t < 1.0 ? 90 : 0); sp.position.set(h.x, h.y, h.z); sp.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(f.x, t < 1.0 ? 0 : 0.08, f.z).normalize()); });
    FXk.trail(A, { of: (t) => { const h = A.at('handR', t), f = A.fwd(t, 90); return new T.Vector3(h.x + f.x * 1.1, h.y, h.z + f.z * 1.1); }, t0: 0.58, t1: 0.96, len: 0.3, w: 0.18, op: 0.55 });
    FXk.ring(A, { t: 0.7, at: 'her', r0: 0.6, r1: 3.0, dur: 0.35, w: 0.14 }); [0, 1].forEach((i) => A.hit(i, 0.66 + i * 0.12, 24, { knock: [i ? -0.4 : 0.1, i ? -0.3 : 0.4] }));
    const tL = 1.78, end = [5.6, 0.7, 0]; FXa(A, { t: tL, dur: 0.5, from: 'handR', to: end, len: 2.4, scale: 1.6, w: 0.14, glow: A.C.jade });
    FXk.helix(A, { t: tL, dur: 0.5, from: () => P3(A.at('handR', tL)), to: end, r: 0.35, turns: 6, strands: 2, hold: 0.15, out: 0.35, op: 0.5 });
    [2, 3, 4].forEach((i) => { const u = (A.card.dum[i].x + 1.6) / 7.2, th = tL + 0.5 * u; for (let k = 0; k < 3; k++) A.hit(i, th + k * 0.06, 8, { nostop: k > 0 }); A.moveTo(i, th, [Math.min(5.0, A.card.dum[i].x + 2.2 - (i - 2) * 0.5), A.card.dum[i].z * 0.3], 0.5 - (th - tL) * 0.6, 'out'); });
    A.cap(0.3, 1.4, '巨箭当长枪：一转，3 u 内 24', 'The giant arrow as a spear: a spin, 24 within 3 u'); A.cap(1.4, 3.6, '再投出去钻穿：3 × 8，小怪被带走', 'Then a javelin throw that drills through: 3 × 8, carrying small foes'); } };

// GA9 Slide shot: she slides under a foe within 2 u and shoots three arrows up between her hind paws: 16 each, launch 0.5 s
GA.F9 = { T: 3.0, cam: { x: -0.6, z: 0, w: 6.0 }, her: H(-2.4), seq: [[0.3, 'gSweepLow', { to: 0.45 }], [0.75, 'gHip', { loop: true, until: 1.35, speed: 0.9 }], [1.35, 'gRise', { from: 0.1 }]],
  root: [{ t: 0.3 }, { t: 0.62, fw: 2.05, y: -0.05, pitch: -18, e: 'out' }, { t: 1.35, fw: 2.1, y: -0.05, pitch: -18 }, { t: 1.7, fw: 3.0, y: 0, pitch: 0, e: 'out' }],
  dum: [[-0.4, 0.0]],
  fx(A) { const T = A.THREE; FXk.dust(A, { t: 0.4, at: () => footAt(A, 0.45), n: 8, sp: 1.2, dir: [-1, 0] }); FXk.tube(A, { t: 0.32, dur: 0.3, hold: 0.4, out: 0.4, flat: true, w: 0.3, col: '#BDB6A8', op: 0.4, e: 'out', pts: () => [new T.Vector3(-2.3, 0.02, 0), new T.Vector3(-0.3, 0.02, 0)] });
    A.hit(0, 0.6, 4, { stop: true }); [0.8, 0.98, 1.16].forEach((tk, k) => { const f = footAt(A, tk); FXa(A, { t: tk, dur: 0.08, from: [f.x + 0.35, 0.15, f.z], to: { d: 0, y: 0.35 }, len: 0.7, glow: k === 2 ? A.C.jade : undefined, hits: [{ d: 0, n: 16, up: k === 0 ? 1.0 : 0.25 }] }); FXk.ring(A, { t: tk, at: [f.x + 0.35, 0.1, f.z], r0: 0.1, r1: 0.4, dur: 0.18, w: 0.3, dir: () => new T.Vector3(0, 1, 0) }); });
    A.cap(0.3, 2.8, '从敌人身下滑过去，两后爪间往上射三箭：各 16，挑飞 0.5 秒', 'She slides under it and shoots three up between her hind paws: 16 each, launch 0.5 s'); } };

// GA10 Closing rain: a ring of rain 4 u wide closes to its centre over 2 s, herding foes inward: 7 a half second
GA.F10 = { T: 4.0, cam: { x: 0.6, z: 0, w: 7.4 }, her: H(-2.6), seq: [[0.3, 'rRain', { to: 0.9 }]],
  dum: [[0.6, 1.9], [2.6, 0.4], [1.0, -1.8], [-0.3, -0.5]],
  fx(A) { const T = A.THREE, c = [0.9, 0, 0], t0 = 1.2, t1 = 3.2, R = (t) => 2.0 * (1 - A.EASE.s(A.clamp((t - t0) / (t1 - t0)))) + 0.25;
    FXa(A, { t: 0.8, dur: 0.3, to: [-2.6, 5.0, 0], len: 1.2, glow: A.C.jade });
    for (let k = 0; k < 10; k++) { const a = k * 0.628; FXk.rain(A, { t0, t1, at: (t) => new T.Vector3(c[0] + Math.cos(a) * R(t), 0, c[2] + Math.sin(a) * R(t)), r: 0.45, rate: 6, h: 4.0, seed: 20 + k }); }
    FXk.ring(A, { t: t0 - 0.05, at: c, r0: 2.2, r1: 2.25, dur: 0.2, w: 0.06 }); for (let k = 0; k < 9; k++) { const t = t0 + k * 0.25; FXk.ring(A, { t, at: c, r0: R(t), r1: R(t + 0.25), dur: 0.25, w: 0.04, op: 0.45, e: 'lin' }); }
    A.card.dum.forEach((dm, i) => { const dx = dm.x - c[0], dz = dm.z - c[2], d = Math.hypot(dx, dz); A.moveTo(i, t0 + 0.2, [c[0] + dx / d * 0.45, c[2] + dz / d * 0.45], 1.9, 's'); for (let k = 0; k < 4; k++) A.hit(i, t0 + 0.3 + k * 0.5, 7); });
    A.cap(0.4, 1.2, '一圈 4 u 宽的箭雨', 'A ring of rain 4 u wide'); A.cap(1.2, 3.8, '2 秒内向中心收拢，把敌人赶进去：每半秒 7', 'It closes to the centre over 2 s, herding foes in: 7 a half second'); } };

// GA11 Blast ride: she plants the arrow behind her; the blast fires her 3 u forward: 16 to each foe she passes, knocked 1 u aside
GA.F11 = { T: 3.0, cam: { x: -0.2, z: 0, w: 6.8 }, her: H(-2.2), seq: [[0.3, 'castPlant', { to: 0.55 }], [0.9, 'dash', { to: 0.62 }], [1.6, 'idle', { from: 5.15, fade: 0.2 }]],
  root: [{ t: 0.3 }, { t: 0.92 }, { t: 1.25, fw: 3.0, y: 0.25, e: 'out', ye: 'out' }, { t: 1.42, fw: 3.2, y: 0, ye: 'in' }],
  dum: [[-1.1, 0.25], [-0.1, -0.25], [0.6, 0.2], [2.4, 1.3]],
  fx(A) { const T = A.THREE, spot = new T.Vector3(-2.7, 0, 0); FXk.stuck(A, { t: 0.62, dur: 0.3, at: [spot.x, 0.25, 0], dir: [0.3, -1, 0] }); FXk.ring(A, { t: 0.62, at: spot, r0: 0.1, r1: 0.4, dur: 0.2, w: 0.3, col: A.C.bone });
    const tb = 0.92; FXk.ring(A, { t: tb, at: spot, r0: 0.2, r1: 1.4, dur: 0.3, w: 0.35 }); FXk.disc(A, { t: tb, at: spot, r0: 0.3, r1: 1.2, dur: 0.22, op: 0.45 }); FXk.dust(A, { t: tb, at: spot, n: 8, sp: 1.8 }); A.shake(tb, 0.06, 0.2);
    FXk.tunnel(A, { t: tb, dur: 0.33, n: 5, r: 0.5, from: () => new T.Vector3(-2.2, 0.6, 0), to: () => new T.Vector3(0.8, 0.6, 0), life: 0.4 });
    [0, 1, 2].forEach((i) => { const dm = A.card.dum[i], th = tb + 0.33 * A.EASE.out(A.clamp((dm.x + 2.2) / 3.0)) * 0.8; A.hit(i, th, 16, { knock: [0.1, dm.z > 0 ? 1.0 : -1.0], kdur: 0.25, nostop: i > 0 }); });
    A.cap(0.3, 0.9, '把箭插在身后', 'She plants the arrow behind her'); A.cap(0.9, 2.8, '爆炸把她射出 3 u：经过的敌人各 16，被撞开 1 u', 'The blast fires her 3 u: 16 to each foe passed, knocked 1 u aside'); } };

// GA12 Kicked saw: the wheel of twelve lies flat at her feet; a side kick sends it 3 u; it saws 2 s: 4 every 0.3 s within 1.5 u
GA.F12 = { T: 3.8, cam: { x: 0.0, z: 0, w: 7.0 }, her: H(-2.2), seq: [[0.3, 'rWhirl', { to: 0.7 }], [0.95, 'gRound']],
  root: [{ t: 0.95 }, { t: 1.05 }, { t: 1.21, y: 0.3, spin: 150, e: 'lin', ye: 'out' }, { t: 1.42, y: 0, spin: 360, e: 'out', ye: 'in' }],
  dum: [[0.6, -0.9], [1.3, 0.6], [0.4, 0.8], [1.6, -0.3]],
  fx(A) { const T = A.THREE, g = A.add(new T.Group()); g.visible = false;
    for (let k = 0; k < 12; k++) { const m = new T.Mesh(A.arrowGeo, A.arrowMat); const an = k * Math.PI / 6; m.position.set(Math.cos(an) * 0.45, 0, Math.sin(an) * 0.45); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(-Math.sin(an), 0, Math.cos(an))); m.scale.setScalar(0.6); g.add(m); }
    const rim = new T.Mesh(new T.TorusGeometry(0.55, 0.02, 6, 40), A.mat(A.C.jade, A.F.FLAT)); rim.rotation.x = Math.PI / 2; g.add(rim);
    const x0 = -1.55, x1 = 1.0, tk = 1.21, tE = tk + 0.3 + 2.0; const pos = (t) => t < tk ? x0 : A.lerp(x0, x1, A.EASE.out(A.clamp((t - tk) / 0.3)));
    A.fx((t) => { g.visible = t >= 0.62 && t < tE; if (!g.visible) return; g.position.set(pos(t), 0.2, 0.0); g.rotation.y = -(t - 0.62) * (t < tk ? 6 : 16); g.scale.setScalar(A.EASE.out(A.clamp((t - 0.62) / 0.2)) * (t > tE - 0.2 ? (tE - t) / 0.2 : 1)); rim.material.uniforms.op.value = 0.6; });
    FXk.trail(A, { of: 'footR', t0: 1.1, t1: 1.3, len: 0.2, w: 0.22, op: 0.6 }); kickRing(A, tk, [x0, 0.2, 0], 0.4);
    FXk.ring(A, { t: tk + 0.3, at: [x1, 0, 0], r0: 1.45, r1: 1.5, dur: 2.0, w: 0.05, op: 0.4, e: 'lin' });
    for (let k = 0; k < 7; k++) { const t = tk + 0.3 + k * 0.3; FXk.dust(A, { t, at: [x1, 0, 0], n: 4, sp: 1.6, col: A.C.parch, r: 0.04, op: 0.6, dur: 0.25 }); A.card.dum.forEach((dm, i) => { if (Math.hypot(dm.x - x1, dm.z) <= 1.5) A.hit(i, t + i * 0.02, 4, { nostop: true }); }); }
    A.cap(0.3, 1.2, '十二箭的轮子平躺在脚边', 'The wheel of twelve lies flat at her feet'); A.cap(1.2, 3.6, '侧踢送出 3 u，原地锯 2 秒：1.5 u 内每 0.3 秒 4', 'A side kick sends it 3 u; it saws 2 s: 4 every 0.3 s within 1.5 u'); } };

// GA14 Homecoming twister: it rises 4 u out and rolls back to her over 2 s, pulling foes along and shooting
GA.F14 = { T: 4.0, cam: { x: 0.4, z: 0, w: 7.6 }, her: H(-2.0), seq: [[0.3, 'rTornado', { to: 0.62 }], [1.0, 'idle', { from: 5.15, fade: 0.15 }]],
  dum: [[1.2, 0.9], [2.8, -0.8], [0.6, -1.0], [3.1, 0.6]],
  fx(A) { const T = A.THREE, t0 = 0.9, t1 = 3.2, x0 = 2.0, x1 = -1.4; const at = (t) => new T.Vector3(A.lerp(x0, x1, A.EASE.io2(A.clamp((t - t0 - 0.2) / 2.0))), 0, 0);
    FXa(A, { t: 0.85, dur: 0.2, to: [x0, 0.1, 0], len: 0.9, glow: A.C.jade }); FXk.twister(A, { t0, t1, at, r: 1.0, h: 2.4 }); FXk.trail(A, { of: (t) => at(t).add(new T.Vector3(0, 0.03, 0)), t0: t0 + 0.2, t1: t1 - 0.1, len: 0.8, w: 1.2, op: 0.15 });
    A.card.dum.forEach((dm, i) => { const tIn = t0 + 0.2 + 2.0 * A.clamp((x0 - dm.x) / (x0 - x1)) * 0.6; A.moveTo(i, Math.max(t0, tIn - 0.3), [x1 + 0.8 + (i % 2) * 0.3, (i % 2 ? 0.45 : -0.45)], Math.max(0.6, t1 - 0.2 - tIn), 'io2'); });
    for (let k = 0; k < 6; k++) { const tk = t0 + 0.4 + k * 0.32, i = k % 4; FXa(A, { t: tk, dur: 0.1, from: P3(at(tk).add(new T.Vector3(0, 1.4, 0))), to: { d: i }, len: 0.6, hits: [{ d: i, n: 6 }] }); }
    A.cap(0.3, 3.8, '旋风在 4 u 外起来，2 秒内滚回她身边，一路把敌人拖回来并射击', 'It rises 4 u out and rolls back to her in 2 s, pulling foes and shooting'); } };

// GA15 Briar lash: a 3 u vine whip over a 120° arc: 8, knocked flat 0.4 s
GA.F15 = { T: 2.8, cam: { x: -0.4, z: 0, w: 6.8 }, her: H(-2.0), seq: [[0.3, 'castSweep', { speed: 0.9 }]], root: [{ t: 0.3, spin: 60 }, { t: 0.55, spin: 60 }, { t: 0.85, spin: -60, e: 'io2' }, { t: 1.2, spin: 0 }],
  dum: [[-0.2, -1.9], [0.7, -0.4], [0.4, 1.2], [-1.0, 1.9], [2.2, 0.2]],
  fx(A) { const T = A.THREE, c = footAt(A, 0.3), R = 3.0;
    for (let k = 0; k < 7; k++) { const tk = 0.55 + k * 0.045; FXk.tube(A, { t: tk, dur: 0.06, hold: 0.06, out: 0.18, r: 0.04, col: k % 2 ? A.C.jade : A.C.bone, op: 0.85, e: 'out', pts: () => { const f = A.fwd(tk); const a = Math.atan2(f.z, f.x); return [...Array(7)].map((_, j) => { const u = j / 6, aa = a + Math.sin(u * 3) * 0.12 * (1 - u); return new T.Vector3(c.x + Math.cos(aa) * R * u, 0.55 + 0.25 * Math.sin(u * 3.14), c.z + Math.sin(aa) * R * u); }); } }); }
    FXk.tube(A, { t: 0.55, dur: 0.3, hold: 0.2, out: 0.3, flat: true, w: 0.1, op: 0.45, e: 'lin', pts: () => [...Array(13)].map((_, j) => { const a = (60 - j * 10) * Math.PI / 180; return new T.Vector3(c.x + Math.cos(-a) * R, 0.03, c.z + Math.sin(-a) * R); }) });
    A.card.dum.forEach((dm, i) => { const dx = dm.x - c.x, dz = dm.z - c.z, d = Math.hypot(dx, dz), a = Math.atan2(dz, dx); if (d <= R + 0.1 && Math.abs(a) <= 1.05) { const th = 0.55 + 0.3 * (a + 1.05) / 2.1; A.hit(i, Math.min(0.86, th), 8, { nostop: true }); A.down(i, Math.min(0.88, th + 0.02), 0.4, [dx, dz]); FXk.spark(A, { t: Math.min(0.86, th), at: { d: i }, r: 0.1, col: A.C.bone }); } });
    A.cap(0.3, 2.6, '3 u 的荆条鞭扫 120°：8，打倒 0.4 秒', 'A 3 u vine whip over 120°: 8, knocked flat 0.4 s'); } };

// GA16 Bulldoze: the curtain lands as a wall 4 u wide, 1 u ahead of her, and walks 3 u with her, pushing foes: 3 × 10
GA.F16 = { T: 4.2, cam: { x: 0.2, z: 0, w: 7.6 }, her: H(-2.6), seq: [[0.3, 'rStorm', { from: 0.3, to: 1.2 }], [1.3, 'walk', { loop: true, until: 3.3 }]], root: [{ t: 1.3 }, { t: 3.3, fw: 3.0, e: 'lin' }],
  dum: [[-0.4, -1.1], [0.0, 0.3], [0.5, 1.4], [2.6, 2.4]],
  fx(A) { const T = A.THREE, g = A.add(new T.Group()); g.visible = false; FXa(A, { t: 0.9, dur: 0.3, to: [-1.6, 4.5, 0], len: 1.2, glow: A.C.jade });
    for (let k = 0; k < 11; k++) { const m = new T.Mesh(A.arrowGeo, A.arrowMat); m.position.set(0, 0.35, -2 + k * 0.4); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(0.25, -1, 0).normalize()); m.scale.setScalar(0.9); g.add(m); }
    const band = new T.Mesh(new T.PlaneGeometry(0.12, 4.0), A.mat(A.C.jade, A.F.FLAT)); band.rotation.x = -Math.PI / 2; band.position.y = 0.03; g.add(band);
    const xAt = (t) => A.rootAt(t).x + 1.0; A.fx((t) => { g.visible = t >= 1.15 && t < 3.6; if (!g.visible) return; g.position.set(xAt(t), t < 1.3 ? 1.8 * (1 - (t - 1.15) / 0.15) : 0, 0); band.material.uniforms.op.value = 0.5 * (t > 3.3 ? (3.6 - t) / 0.3 : 1); });
    for (let k = 0; k < 11; k++) FXa(A, { t: 1.0, dur: 0.15, from: [-1.2, 3.2, -2 + k * 0.4], to: [-1.6, 0.4, -2 + k * 0.4], len: 0.9, w: 0.05 });
    FXk.dust(A, { t: 1.3, at: [-1.6, 0, 0], n: 9, sp: 1.6, dir: [1, 0] }); A.shake(1.3, 0.04, 0.15);
    [0, 1, 2].forEach((i) => { const dm = A.card.dum[i]; const tc = 1.3 + Math.max(0, (dm.x - 0.3 + 1.6) / 1.5); A.moveTo(i, tc, [1.7, dm.z], 3.3 - tc, 'lin'); [0, 0.6, 1.2].forEach((d) => A.hit(i, tc + d, 10, { nostop: true })); FXk.dust(A, { t: tc + 0.1, at: () => at0(A, i, tc + 0.1), n: 3, dir: [1, 0] }); });
    A.cap(0.3, 1.3, '箭幕落成一道 4 u 宽的墙，在她前面 1 u', 'The curtain lands as a 4 u wall, 1 u ahead of her'); A.cap(1.3, 4.0, '墙跟她一起往前走 3 u，推着敌人：3 × 10', 'It walks 3 u with her, pushing foes: 3 × 10'); } };

// GA17 Pinwheel: five arrows spin as one drill into a foe for 1.5 s (24); foes within 2 u are pulled against it; she kicks off it into a short run
GA.F17 = { T: 3.6, cam: { x: -0.4, z: 0, w: 6.8 }, her: H(-2.2), seq: [[0.3, 'rVolley'], [1.25, 'gPush', { to: 0.32 }], [1.6, 'run', { loop: true, until: 2.4, fade: 0.08 }], [2.4, 'idle', { from: 5.15, fade: 0.15 }]],
  root: [{ t: 1.25 }, { t: 1.38, fw: 0.35, e: 'out' }, { t: 1.55, fw: 0.2, spin: 150 }, { t: 2.4, fw: -1.3, sd: 0.9, spin: 150, e: 'lin' }],
  dum: [[-0.6, 0.0], [0.6, -1.3], [0.9, 1.1], [-0.2, 1.8]],
  fx(A) { const T = A.THREE, tL = 0.55, tH = tL + 0.16; [-14, -7, 0, 7, 14].forEach((a) => FXa(A, { t: tL, dur: 0.16, to: { d: 0, y: 0.6 }, side: a * 0.03, len: 0.7, w: 0.06 }));
    const g = A.add(new T.Group()); g.visible = false; for (let k = 0; k < 5; k++) { const m = new T.Mesh(A.arrowGeo, A.arrowMat); const an = k * 1.2566; m.position.set(0, Math.cos(an) * 0.16, Math.sin(an) * 0.16); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(1, Math.cos(an) * 0.3, Math.sin(an) * 0.3).normalize()); m.scale.setScalar(0.7); g.add(m); }
    A.fx((t) => { g.visible = t >= tH && t < tH + 1.5; if (!g.visible) return; const p = A.dpos(0, t); g.position.set(p.x - 0.55, p.y + 0.62, p.z); g.rotation.x = (t - tH) * 22; });
    FXk.helix(A, { t: tH, dur: 0.1, from: () => at0(A, 0, tH, 0.62).add(new T.Vector3(-0.6, 0, 0)), to: () => at0(A, 0, tH, 0.62), r: 0.25, turns: 2, strands: 2, hold: 1.4, out: 0.2, op: 0.5 });
    for (let k = 0; k < 6; k++) FXk.spark(A, { t: tH + 0.1 + k * 0.24, at: { d: 0 }, r: 0.07, col: A.C.parch }); A.hit(0, tH + 1.5, 24, { big: true }); A.status(0, tH, 'stun', 1.5);
    [1, 2, 3].forEach((i) => { const dm = A.card.dum[i]; const dx = -0.6 - dm.x, dz = -dm.z, d = Math.hypot(dx, dz); A.moveTo(i, tH + 0.1, [-0.6 - dx / d * 0.55, -dz / d * 0.55], 0.45, 'in'); thread(A, () => at0(A, i, tH + 0.1, 0.6), () => at0(A, 0, tH + 0.1, 0.6), tH + 0.1, { hold: 0.35, out: 0.2, r: 0.02 }); A.hit(i, tH + 0.55, 4, { nostop: true }); });
    FXk.trail(A, { of: 'footL', t0: 1.3, t1: 1.42, len: 0.12, w: 0.16, op: 0.7 }); kickRing(A, 1.38, () => dumAt(A, 0, 1.38, 0.6), 0.45);
    A.cap(0.3, 1.25, '五箭合成一个旋钻钻进一个敌人 1.5 秒：24', 'Five arrows spin as one drill into a foe for 1.5 s: 24'); A.cap(1.25, 3.4, '2 u 内的敌人被吸过去贴着它；她蹬开它跑走', 'Foes within 2 u are pulled against it; she kicks off it into a short run'); } };

// GA18 Switch: she springs onto a foe and kicks off backward; they trade places: 18
GA.F18 = { T: 3.0, cam: { x: -0.6, z: 0, w: 6.6 }, her: H(-2.4), seq: [[0.3, 'dash', { to: 0.5 }], [0.72, 'gSpring', { fade: 0.05 }], [0.94, 'gMule', { from: 0.12, fade: 0.06 }], [1.6, 'idle', { from: 5.15, fade: 0.2 }]],
  root: [{ t: 0.4 }, { t: 0.76, fw: 1.85, y: 1.15, e: 's', ye: 'out' }, { t: 0.86, fw: 1.9, y: 1.15 }, { t: 1.2, fw: 2.5, y: 0, e: 'out', ye: 'in' }],
  dum: [[-0.55, 0.05], [2.4, 1.6]],
  fx(A) { const T = A.THREE; A.hit(0, 0.78, 6, { stop: true }); kickRing(A, 0.78, () => dumAt(A, 0, 0.78, 1.1), 0.45);
    A.moveTo(0, 0.9, [-2.4, 0.05], 0.4, 'out'); A.launch(0, 0.9, 0.3); A.hit(0, 0.92, 18, { big: true, nostop: true });
    FXk.trail(A, { of: (t) => at0(A, 0, t, 0.6), t0: 0.92, t1: 1.3, len: 0.3, w: 0.2, op: 0.4 }); FXk.trail(A, { of: 'chest', t0: 0.4, t1: 1.2, len: 0.35, w: 0.18, op: 0.35 });
    FXk.ring(A, { t: 1.32, at: [-2.4, 0, 0.05], r0: 0.2, r1: 0.6, dur: 0.25, w: 0.3 }); FXk.ring(A, { t: 1.2, at: () => footAt(A, 1.2), r0: 0.2, r1: 0.6, dur: 0.25, w: 0.3 });
    A.cap(0.3, 2.8, '扑上敌人，往后一蹬：两个换位，18', 'She springs onto the foe and kicks off backward: they trade places, 18'); } };

// GA19 Air juggle: a kick launches the foe; she leaps after it: three kicks of 6 in the air
GA.F19 = { T: 3.4, cam: { x: -0.6, z: 0, w: 6.2 }, her: H(-2.0), seq: [[0.3, 'gRise'], [0.95, 'gKnee', { to: 0.5 }], [1.3, 'gRound', { from: 0.1, to: 0.55 }], [1.72, 'gAxe', { from: 0.3 }]],
  root: [{ t: 0.3 }, { t: 0.4 }, { t: 0.51, fw: 0.1, y: 0.4, e: 'out', ye: 'out' }, { t: 0.75, fw: 0.1, y: 0, ye: 'in' }, { t: 0.95 }, { t: 1.2, fw: 0.55, y: 0.9, e: 'out', ye: 'out' }, { t: 1.45, fw: 0.6, y: 1.05, spin: 360, e: 'io2' }, { t: 1.8, fw: 0.6, y: 1.1, spin: 360 }, { t: 1.98, fw: 0.55, y: 0.95, spin: 360 }, { t: 2.4, fw: 0.1, y: 0, spin: 360, ye: 'in' }],
  dum: [[-0.95, 0.05]],
  fx(A) { FXk.trail(A, { of: 'footR', t0: 0.4, t1: 0.55, len: 0.16, w: 0.2, op: 0.7 }); A.hit(0, 0.51, 8, { up: 1.5, stop: true }); kickRing(A, 0.51, () => dumAt(A, 0, 0.51, 0.7), 0.5);
    FXk.trail(A, { of: 'chest', t0: 0.95, t1: 1.25, len: 0.35, w: 0.2, op: 0.35 });
    [[1.2, 'footR'], [1.5, 'footR'], [1.98, 'footR']].forEach(([tk, f], k) => { FXk.trail(A, { of: f, t0: tk - 0.12, t1: tk + 0.05, len: 0.16, w: 0.2, op: 0.7 }); A.hit(0, tk, 6, k < 2 ? { up: 0.5, nostop: false } : { stop: true }); kickRing(A, tk, () => dumAt(A, 0, tk, 0.6), 0.45); });
    A.move(0, 1.99, [0.6, 0], 0.3, 'out'); A.launch(0, 1.99, 0.01); FXk.dust(A, { t: 2.3, at: () => at0(A, 0, 2.3), n: 7, sp: 1.3 });
    A.cap(0.3, 0.95, '一脚挑飞', 'A kick launches it'); A.cap(0.95, 3.2, '她跟着跳上去：空中三脚，各 6', 'She leaps after it: three kicks of 6 in the air'); } };

// GA20 Cuju: the knot gathers the pack into a ball of wind; she dribbles it left and right ahead of her for 2 s (2 a half second), then a big instep kick sends it 3 u: burst 6
GA.F20 = { T: 5.0, cam: { x: 0.6, z: 0, w: 8.0 }, her: H(-2.6), seq: [[0.3, 'kKnot', { to: 0.95 }], [1.2, 'walk', { loop: true, until: 3.2, speed: 0.9 }], [3.2, 'gRound', { speed: 1.1 }]],
  root: [{ t: 1.2 }, { t: 3.2, fw: 1.8, e: 'lin' }, { t: 3.32, fw: 1.8 }, { t: 3.5, fw: 1.9, y: 0.25, spin: 150, e: 'lin', ye: 'out' }, { t: 3.68, fw: 1.95, y: 0, spin: 360, e: 'out', ye: 'in' }],
  dum: [[-0.4, -1.2], [0.4, 1.0], [-1.0, 0.7], [0.8, -0.6]],
  fx(A) { const T = A.THREE, tG = 0.92; const ball = (t) => { const r = A.rootAt(Math.min(t, 3.4)); if (t < 1.2) return new T.Vector3(-1.75, 0, 0); if (t < 3.45) { const sw = Math.sin((t - 1.2) * Math.PI * 2 / 0.9) * 0.45; return new T.Vector3(r.x + 0.85, 0, sw); } const u = A.EASE.out(A.clamp((t - 3.45) / 0.35)); return new T.Vector3(A.lerp(r.x + 0.85, r.x + 3.85, u), 0, 0); };
    FXk.trail(A, { of: 'tipA', t0: 0.35, t1: 0.86, len: 0.22, w: 0.08, op: 0.55 });
    const g = A.add(new T.Group()); g.visible = false; for (let k = 0; k < 3; k++) { const m = new T.Mesh(new T.TorusGeometry(0.7, 0.025, 6, 40), A.mat(A.C.jade, A.F.FLAT)); m.rotation.set(k * 1.05, k * 0.6, 0); g.add(m); }
    A.fx((t) => { g.visible = t >= tG && t < 3.85; if (!g.visible) return; const p = ball(t); g.position.set(p.x, 0.7, p.z); g.rotation.set(t * 4, t * 6, 0); g.scale.setScalar(A.EASE.out(A.clamp((t - tG) / 0.2))); g.children.forEach((m) => { m.material.uniforms.op.value = 0.6; }); });
    A.card.dum.forEach((dm, i) => { const a = i * 1.57; A.moveTo(i, tG, [-1.75 + Math.cos(a) * 0.32, Math.sin(a) * 0.32], 0.3, 'in'); A.launch(i, tG + 0.3, 0.12); });
    // the pack rides inside the ball: carried along by a chain of short moves
    for (let k = 0; k < 22; k++) { const t = 1.2 + k * 0.1; const p0 = ball(t), p1 = ball(t + 0.1); A.card.dum.forEach((_, i) => A.move(i, t, [p1.x - p0.x, p1.z - p0.z], 0.1, 'lin')); }
    for (let k = 0; k < 4; k++) { const t = 1.5 + k * 0.5; A.card.dum.forEach((_, i) => A.hit(i, t + i * 0.02, 2, { nostop: true })); FXk.trail(A, { of: k % 2 ? 'footL' : 'footR', t0: t - 0.12, t1: t + 0.02, len: 0.12, w: 0.14, op: 0.5 }); }
    FXk.trail(A, { of: 'footR', t0: 3.34, t1: 3.55, len: 0.2, w: 0.24, op: 0.75 }); const tb = 3.85, pb = [ball(3.84).x, 0, 0];
    for (let k = 0; k < 5; k++) { const p0 = ball(3.4 + k * 0.1), p1 = ball(3.5 + k * 0.1); A.card.dum.forEach((_, i) => A.move(i, 3.4 + k * 0.1, [p1.x - p0.x, p1.z - p0.z], 0.1, 'lin')); }
    FXk.ring(A, { t: tb, at: pb, r0: 0.3, r1: 1.6, dur: 0.3, w: 0.3 }); FXk.disc(A, { t: tb, at: pb, r0: 0.3, r1: 1.2, dur: 0.25, op: 0.35 }); A.shake(tb, 0.06, 0.2);
    A.card.dum.forEach((_, i) => { const a = i * 1.57; A.hit(i, tb + 0.02, 6, { big: true, nostop: true }); A.move(i, tb + 0.02, [Math.cos(a) * 1.1, Math.sin(a) * 1.1], 0.3, 'out'); });
    A.cap(0.3, 1.2, '风结把敌群卷成一个风球', 'The knot gathers the pack into a ball of wind'); A.cap(1.2, 3.2, '左右带球 2 秒：每半秒 2', 'She dribbles it left and right for 2 s: 2 a half second'); A.cap(3.2, 4.8, '大脚抽射 3 u，炸开：6', 'A big instep kick sends it 3 u: burst 6'); } };

// GA21 Parry spin: three upright spins of 6; a melee hit on her during a spin misses and the attacker is kicked: 10, pushed 1 u
GA.F21 = { T: 3.4, cam: { x: -0.4, z: 0, w: 6.0 }, her: H(-0.4), seq: [[0.5, 'kCyclone', { speed: 0.8 }]],
  root: [{ t: 0.5 }, { t: 2.25, spin: 1080, e: 'lin' }],
  dum: [[0.75, 0.2], [-1.2, -0.75], [-1.1, 0.95]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'footL', t0: 0.55, t1: 2.2, len: 0.16, w: 0.18, op: 0.5 }); FXk.trail(A, { of: 'footR', t0: 0.55, t1: 2.2, len: 0.16, w: 0.18, op: 0.5 });
    [0.62, 1.0, 1.37].forEach((tk) => { FXk.ring(A, { t: tk, at: 'her', r0: 0.4, r1: 1.1, dur: 0.25, w: 0.15, op: 0.5 }); [0, 1, 2].forEach((i) => A.hit(i, tk + i * 0.03, 6, { nostop: true })); });
    // each foe swings at her mid-spin: its wind-up, the clash, and it is kicked away
    [[1, 0.35, 0.82], [0, 0.95, 1.55], [2, 1.35, 1.95]].forEach(([i, w0, tp]) => { const r = A.rootAt(tp); windup(A, i, w0, tp, [r.x, r.z], { len: 1.1 }); const p = A.dpos(i, tp), c = new T.Vector3((p.x + r.x) / 2, 0.75, (p.z + r.z) / 2);
      FXk.spark(A, { t: tp, at: c, r: 0.2, col: A.C.parch }); FXk.ring(A, { t: tp, at: [c.x, 0.75, c.z], r0: 0.1, r1: 0.55, dur: 0.22, w: 0.35, dir: () => new T.Vector3(p.x - r.x, 0, p.z - r.z).normalize() });
      const dx = p.x - r.x, dz = p.z - r.z, l = Math.hypot(dx, dz); A.hit(i, tp + 0.04, 10, { big: true, stop: true, knock: [dx / l, dz / l], kdur: 0.3 }); A.cap(tp - 0.05, tp + 0.4, '格挡', 'Parry'); });
    A.cap(0.3, 0.6, '三圈直立转身：各 6', 'Three upright spins: 6 each'); A.cap(2.0, 3.2, '转身时挨的近战打空，出手的敌人被踢：10，推开 1 u', 'A melee hit during a spin misses; the attacker is kicked: 10, pushed 1 u'); } };

// GA22 Head clap: the bow knocks two foes' heads together: 15 each, stun 0.5 s
GA.F22 = { T: 3.0, cam: { x: -0.4, z: 0, w: 5.6 }, her: H(-1.9), seq: [[0.3, 'gHook']], root: [{ t: 0.3 }, { t: 0.42, fw: 0.45, e: 'out' }, { t: 0.6 }, { t: 0.76, spin: 30 }], hops: [[0.3, 0.42, 0.05]],
  dum: [[-0.7, -0.75], [-0.7, 0.75]],
  fx(A) { const T = A.THREE; FXk.trail(A, { of: 'tipA', t0: 0.32, t1: 0.6, len: 0.16, w: 0.1, op: 0.55 }); FXk.trail(A, { of: 'tipB', t0: 0.32, t1: 0.6, len: 0.16, w: 0.1, op: 0.55 });
    A.moveTo(0, 0.38, [-0.6, -0.24], 0.1, 'in'); A.moveTo(1, 0.38, [-0.6, 0.24], 0.1, 'in'); const tc = 0.48, c = new T.Vector3(-0.6, 1.15, 0);
    [0, 1].forEach((i) => { A.hit(i, tc, 15, { big: true, stop: true, stun: 0.5, dir: [0, i ? 1 : -1] }); A.move(i, tc + 0.05, [0, i ? 0.3 : -0.3], 0.2, 'out'); });
    FXk.spark(A, { t: tc, at: c, r: 0.3, col: A.C.parch }); FXk.ring(A, { t: tc, at: [c.x, 1.15, 0], r0: 0.1, r1: 0.8, dur: 0.25, w: 0.4, dir: () => new T.Vector3(0, 0, 1) }); FXk.ring(A, { t: tc, at: [c.x, 0, 0], r0: 0.2, r1: 1.1, dur: 0.3, w: 0.2 });
    for (let k = 0; k < 6; k++) { const a = k * 1.047; FXk.tube(A, { t: tc, dur: 0.1, hold: 0.05, out: 0.2, r: 0.025, col: A.C.parch, op: 0.9, e: 'out', pts: () => [new T.Vector3(c.x + Math.cos(a) * 0.15, c.y + Math.sin(a) * 0.15, 0), new T.Vector3(c.x + Math.cos(a) * 0.55, c.y + Math.sin(a) * 0.55, 0)] }); }
    A.shake(tc, 0.06, 0.2); A.cap(0.3, 2.8, '用弓把两个敌人的头撞在一起：各 15，眩晕 0.5 秒', "The bow knocks two foes' heads together: 15 each, stun 0.5 s"); } };

// GA23 Zigzag: she runs a zigzag; at each sharp turn she plants a spin kick: 12 within 1.5 u
GA.F23 = { T: 4.4, cam: { x: 0.4, z: 0, w: 8.4 }, her: H(-3.0, 1.2, 90),
  seq: [[0.3, 'run', { loop: true, until: 1.1 }], [1.1, 'gWindKick', { fade: 0.06 }], [1.6, 'run', { loop: true, until: 2.3, fade: 0.06 }], [2.3, 'gWindKick', { fade: 0.06 }], [2.8, 'run', { loop: true, until: 3.5, fade: 0.06 }], [3.5, 'gWindKick', { fade: 0.06 }]],
  root: [{ t: 0.3 }, { t: 1.1, fw: 1.7, sd: -2.0, spin: 50, e: 'lin' }, { t: 1.6, fw: 1.7, sd: -2.0, spin: 50 + 360 - 100, e: 'out' }, { t: 2.3, fw: 3.4, sd: 0.0, spin: -50 + 360, e: 'lin' }, { t: 2.8, fw: 3.4, sd: 0.0, spin: 50 + 720, e: 'out' }, { t: 3.5, fw: 5.1, sd: -2.0, spin: 50 + 720, e: 'lin' }, { t: 4.0, fw: 5.1, sd: -2.0, spin: 50 + 1080, e: 'out' }],
  dum: [[-0.8, -1.4], [0.0, -0.5], [0.8, 1.6], [0.2, 2.0], [2.6, -1.4], [1.6, -0.2]],
  fx(A) { const T = A.THREE; FXk.tube(A, { t: 0.3, dur: 3.2, hold: 0.4, out: 0.4, flat: true, w: 0.1, op: 0.45, e: 'lin', pts: () => [0.3, 1.1, 2.3, 3.5].map((t) => footAt(A, t).add(new T.Vector3(0, 0.03, 0))) });
    [1.25, 2.45, 3.65].forEach((tk) => { const c = footAt(A, tk); FXk.trail(A, { of: 'footR', t0: tk - 0.12, t1: tk + 0.12, len: 0.2, w: 0.22, op: 0.6 }); FXk.ring(A, { t: tk, at: [c.x, 0, c.z], r0: 0.4, r1: 1.5, dur: 0.3, w: 0.15 }); FXk.dust(A, { t: tk - 0.1, at: [c.x, 0, c.z], n: 6, sp: 1.2 });
      A.card.dum.forEach((dm, i) => { const p = A.dpos(i, tk), d = Math.hypot(p.x - c.x, p.z - c.z); if (d <= 1.5) A.hit(i, tk + 0.02, 12, { knock: [(p.x - c.x) / d * 0.5, (p.z - c.z) / d * 0.5], nostop: true }); }); });
    A.cap(0.3, 4.2, '之字跑：每个急转弯原地一记旋踢，1.5 u 内 12', 'A zigzag run: each sharp turn plants a spin kick, 12 within 1.5 u'); } };

// GA24 Sinkhole: a heel drill (16 within 1.8 u) sinks the floor 2.5 u wide for 2 s; foes slide to its centre, slowed 50%
GA.F24 = { T: 4.0, cam: { x: -0.6, z: 0, w: 6.6 }, her: H(-1.8), seq: [[0.3, 'gAxe'], [1.4, 'vault', { from: 0.12 }]],
  root: [{ t: 0.3 }, { t: 0.43 }, { t: 0.62, fw: 0.6, y: 1.05, e: 'out', ye: 'out' }, { t: 0.67, fw: 0.65, y: 1.05 }, { t: 0.76, fw: 0.7, y: 0, ye: 'in' }, { t: 1.4, fw: 0.7 }, { t: 1.8, fw: -0.8, y: 0, jump: 0.6 }],
  dum: [[-0.1, 1.3], [0.6, -1.1], [-2.0, -1.2], [0.9, 0.6]],
  fx(A) { const T = A.THREE, tl = 0.76, c = new T.Vector3(-1.05, 0, 0); FXk.trail(A, { of: 'footR', t0: 0.5, t1: 0.78, len: 0.16, w: 0.22, op: 0.75 }); A.shake(tl, 0.07, 0.25);
    FXk.helix(A, { t: tl, dur: 0.15, from: [c.x, 0.9, 0], to: [c.x, -0.1, 0], r: 0.25, turns: 3, strands: 2, hold: 0.1, out: 0.2, op: 0.6 }); FXk.ring(A, { t: tl, at: c, r0: 0.3, r1: 1.8, dur: 0.3, w: 0.3 });
    FXk.disc(A, { t: tl + 0.05, at: c, r0: 0.3, r1: 2.5, dur: 2.0, op: 0.4, col: '#3A332B' }); for (let k = 0; k < 8; k++) FXk.ring(A, { t: tl + 0.1 + k * 0.25, at: c, r0: 2.4, r1: 0.25, dur: 0.6, w: 0.05, op: 0.4, e: 'in', col: A.C.bone });
    A.card.dum.forEach((dm, i) => { const dx = dm.x - c.x, dz = dm.z - c.z, d = Math.hypot(dx, dz); if (d <= 1.8) A.hit(i, tl + 0.02, 16, { nostop: i > 0 }); if (d <= 2.5) { A.status(i, tl + 0.1, 'slow', 2.0); A.moveTo(i, tl + 0.15, [c.x + dx / d * 0.5, c.z + dz / d * 0.5], 1.8, 'io2'); FXk.dust(A, { t: tl + 0.5, at: () => at0(A, i, tl + 0.5), n: 3, dir: [-dx, -dz], sp: 0.6 }); } });
    A.cap(0.3, 1.0, '脚跟钻地：1.8 u 内 16', 'A heel drill: 16 within 1.8 u'); A.cap(1.0, 3.8, '地面下陷 2.5 u 宽 2 秒：敌人滑向中心，减速 50%', 'The floor sinks 2.5 u wide for 2 s: foes slide to the centre, slowed 50%'); } };
