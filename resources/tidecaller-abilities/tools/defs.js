// Page side of every clip: where she stands, her body clips in time, her root moves, the dummies and the effects.
import { FX, C, EASE, clamp, lerp } from './tc.js';
import { tailSlap, shake, coil, leanBack, crouch, turnTrunk, lookUp, shiver, tuck, pawUp, mixA } from './poses.js';
export const H = (x = -2, z = 0, face = 90) => ({ x, z, face });
export const DEFS = {};
export const FORMS = { fl: {}, su: {}, bu: {} };
export const D2R = Math.PI / 180;
export { tailSlap, shake, coil, leanBack, crouch, turnTrunk, lookUp, shiver, tuck, pawUp, mixA };
// a spot r from a point p at angle deg (0 = +x, 90 = toward -z, the far side of the floor)
export const around = (p, deg, r = 0.62) => [p[0] + Math.cos(deg * D2R) * r, p[1] - Math.sin(deg * D2R) * r];
export const font = (k, px, w = 700) => `${w} ${Math.round(px * k)}px Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`;
export const fan = (n, r, deg0, deg1, cx = 0, cz = 0) => Array.from({ length: n }, (_, i) => around([cx, cz], lerp(deg0, deg1, n > 1 ? i / (n - 1) : 0.5), r));
export const at3 = (A, i, y = 0.6) => (t) => A.dpt(i, t, y);
// a gauge, bottom left: label and a 0..1 fill (the stream's 5 s, Pressure ...)
export const gaugeHud = (zh, en, fn, o = {}) => (t, x, W, H2, k, lang) => { const v = fn(t); if (v == null) return; const w = 170 * k, h = 12 * k, cx = 14 * k, cy = H2 - 30 * k;
  x.font = font(k, 12, 600); x.textAlign = 'left'; x.fillStyle = C.parch; x.fillText(lang === 'zh' ? zh : en, cx, cy - 6 * k); x.fillStyle = 'rgba(14,20,30,0.8)'; x.fillRect(cx, cy, w, h);
  if (o.pips) { for (let i = 0; i < o.pips; i++) { const on = v * o.pips >= i + 1 - 1e-6; x.fillStyle = on ? (o.col || C.foam) : 'rgba(230,243,247,0.15)'; x.fillRect(cx + 2 * k + i * (w - 4 * k) / o.pips, cy + 2 * k, (w - 4 * k) / o.pips - 3 * k, h - 4 * k); } }
  else { x.fillStyle = o.col || C.cobalt; x.fillRect(cx + 2 * k, cy + 2 * k, (w - 4 * k) * clamp(v), h - 4 * k); } if (o.full && v >= 1) { x.strokeStyle = C.foam; x.lineWidth = 2 * k; x.strokeRect(cx, cy, w, h); } };
// a foe's bolt (Foe Crimson): a short red streak from a dummy to a point
export function foeBolt(A, o) { const T = A.THREE; const m = A.add(new T.Mesh(A.streakGeo, A.mat('#B8141F', A.F.STREAK))); m.visible = false;
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.4; const on = a >= 0 && a <= (o.stop != null ? o.stop : d); m.visible = on; if (!on) return; const p0 = A.dpt(o.d, o.t, 0.75), p1 = typeof o.to === 'function' ? o.to(o.t + d) : new T.Vector3(...o.to); const p = p0.clone().lerp(p1, a / d), q = p0.clone().lerp(p1, Math.max(0, a / d - 0.18));
    m.position.copy(q); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); m.scale.set(0.12, 0.12, p.distanceTo(q) + 1e-3); m.material.uniforms.op.value = 0.95; }); }
// stream ticks: a hit every `per` seconds on dummy i from t0 to t1 (numbers small)
export function ticks(A, i, t0, t1, n, per = 0.2, o = {}) { const out = []; for (let t = t0; t <= t1 + 1e-6; t += per) { A.hit(i, t, n, Object.assign({ noStop: true }, o)); out.push(t); } return out; }
// a bubble shield on an ally dummy, with its number under it
export function shieldOn(A, i, t0, t1, n, o = {}) { FX.bubble(A, Object.assign({ t0, t1, at: (t) => { const p = A.dpos(i, t); const dm = A.card.dum[i]; return [p.x, p.y + 0.62 * dm.m.s / 0.82, p.z]; }, r: 0.62 * (A.card.dum[i].m.s / 0.82) }, o));
  A.tag(i, t0 + 0.1, t1, (t, lang) => { const v = typeof n === 'function' ? n(t) : n; return v > 0 ? (lang === 'zh' ? '泡 ' : 'Bubble ') + v : null; }, C.foam); }

// ================================================================ passive, basic attack, dash
// P: Ebb and Flow. 浸 soaks (4 s, a small foe 15% slower, slides 50% farther); 拍 Crash deals 60% more to a soaked foe and spends it; 湿 more on a soaked foe, the soak stays
{ const me = [-2.0, 0], d0 = [0.4, -0.55], d1 = [0.4, 0.75];
  DEFS.P = { T: 6.2, cam: { x: 0.0, z: 0.1, w: 6.6 }, her: H(me[0], me[1]), dum: [d0, d1],
    seq: [[0.3, 'castPoint', { speed: 1.2 }], [1.75, 'castSweep'], [3.6, 'castPoint']],
    root: [{ t: 0.3, look: d0 }, { t: 1.7, look: d0 }, { t: 1.95, look: [0.4, 0.1] }, { t: 3.5, look: [0.4, 0.1] }],
    body: (t) => mixA(tailSlap(t, 2.15), tailSlap(t, 3.97, 0.8), shake(t, 4.6, 0.7)),
    fx(A) {
      const tb = 0.3 + 0.44 / 1.2; FX.bolt(A, { t: tb, to: (t) => A.dpt(0, t, 0.65), dur: 0.28 }); A.hit(0, tb + 0.28, 14, { soak: true });
      A.cap(0.3, 1.6, '浸：浸湿 4 秒，慢 15%', 'Soak: soaked 4 s, 15% slower');
      // a push: the soaked foe slides 50% farther
      const tw = 1.75 + 0.46; FX.wave(A, { t: tw - 0.05, from: (t) => A.ahead(tw, 0.5, 0), dir: 90, dist: 2.2, dur: 0.45, w: 2.6, h: 0.55, len: 0.7 });
      A.hit(0, tw + 0.2, 6, { knock: [1.5, 0], kdur: 0.5, wet: true }); A.hit(1, tw + 0.2, 6, { knock: [1.0, 0], kdur: 0.45 });
      A.cap(1.75, 3.4, '湿：浸湿的敌人多滑 50%', 'Wet: a soaked foe slides 50% farther');
      // a Crash: 60% more on the soaked foe, and its soak is spent
      const tc = 3.6 + 0.44; FX.jet(A, { t: tc - 0.04, to: (t) => A.dpt(0, tc, 0.62).add(new A.THREE.Vector3(1.2, 0, 0)), dur: 0.12, hold: 0.18, w: 0.22 });
      FX.jet(A, { t: tc - 0.02, to: (t) => A.dpt(1, tc, 0.62).add(new A.THREE.Vector3(1.2, 0, 0)), dur: 0.12, hold: 0.18, w: 0.22 });
      A.hit(0, tc + 0.1, 29, { crash: true }); A.hit(1, tc + 0.12, 18);
      A.cap(3.6, 6.2, '拍：对浸湿的敌人 +60%，并用掉浸湿', 'Crash: 60% more on a soaked foe, and the soak is spent');
    } };
}
// B: the basic attack, as passed: hold for a stream (3 each 0.2 s, 4.5 u); after 5 s, the tsunami: Crash 28, 6 u, knocked back, then soaked
{ const me = [-2.4, 0.1], d0 = [-0.2, 0.1], d1 = [1.3, -0.35]; const s0 = 0.3, s1 = 5.3, tz = s1 + 0.05;
  DEFS.B = { noWarp: true, T: 8.2, cam: { x: 0.0, z: 0.0, w: 7.2 }, her: H(me[0], me[1]), dum: [d0, d1, [1.5, 0.75]],
    seq: [[s0, 'stream', { loop: true, until: s1, fade: 0.15 }], [tz, 'tsunami']],
    body: (t) => mixA(shiver(t, s0 + 0.15, s1), tailSlap(t, tz + 0.7, 0.6)),
    fx(A) { const tgt = (t) => A.dpt(0, t, 0.6);
      FX.stream(A, { t0: s0 + 0.12, t1: s1, to: tgt, w: 0.15 }); ticks(A, 0, s0 + 0.3, s1, 3, 0.2);
      FX.orb(A, { t0: s0 + 0.2, t1: s1 + 0.4, at: 'tip', r: (t) => 0.04 + 0.11 * clamp((t - s0) / 5), pop: false, op: 0.7 });
      A.hud(gaugeHud('水流 5 秒', 'Stream 5 s', (t) => t < s0 ? 0 : t < s1 ? (t - s0) / 5 : t < tz + 0.7 ? 1 : 0, { full: true }));
      A.cap(s0, 2.6, '按住：水流 4.5 u，每 0.2 秒 3', 'Hold: a stream, 4.5 u: 3 each 0.2 s');
      A.cap(2.6, s1, '满 5 秒……', '5 s of stream ...');
      const tw = tz + 0.68; FX.wave(A, { t: tw, from: (t) => A.ahead(tw, 0.45, 0), dir: 90, dist: 6, dur: 1.1, w: 1.3, h: 0.8, len: 0.9 });
      const hitAt = (x) => tw + (x - (me[0] + 0.45)) / 6 * 1.1;
      A.hit(0, hitAt(-0.2), 28, { crash: true, knock: [1.0, 0], kdur: 0.4, soak: true }); A.hit(1, hitAt(1.3), 28, { crash: true, knock: [1.0, 0], kdur: 0.4, soak: true });
      A.cap(tz, 8.2, '海啸：拍 28，6 u，击退，然后浸湿', 'Tsunami: Crash 28, 6 u, knocked back, then soaked');
      A.shake(tw, 0.05, 0.25);
    } };
}
// D: the dash, as passed: she rides a tide 2.8 u, untouchable; the wet path stays 3 s: 30% slower and soaked
{ const me = [-2.2, 0.2]; const t0 = 0.4, L = 2.8;
  const k = (t) => { const a = t - t0; const ss = (x0, x1, x) => { x = clamp((x - x0) / (x1 - x0)); return x * x * (3 - 2 * x); }; return ss(0.10, 0.22, a) * (1 - ss(0.62, 0.80, a)); };
  DEFS.D = { noWarp: true, T: 4.4, cam: { x: -0.2, z: -0.1, w: 6.8 }, her: H(me[0], me[1]), dum: [[-0.6, 0.75], [1.4, -1.4]],
    seq: [[t0, 'dash']],
    root: (() => { const R = [{ t: t0 }]; for (let i = 1; i <= 16; i++) { const a = 0.06 + i * 0.05, t = t0 + a; R.push({ t, fw: L * EASE.s(clamp((a - 0.08) / 0.74)), y: 0.68 * k(t), e: 'lin' }); } return R; })(),
    fx(A) { const ride = (t) => { const r = A.rootAt(t); return [r.x + Math.sin(r.yaw) * 0.25, 0, r.z + Math.cos(r.yaw) * 0.25]; };
      FX.wave(A, { t: t0 + 0.08, at: ride, yaw: () => 90 * D2R, dur: 0.72, out: 0.15, w: 1.0, h: 0.9, len: 1.1, rise: 0.14, hFn: (u) => Math.max(0.05, k(t0 + 0.08 + u * 0.72) * 1.05 + 0.05), wet: false });
      FX.strip(A, { t0: t0 + 0.15, t1: t0 + 3.2, from: [me[0], 0, me[1]], to: [me[0] + L, 0, me[1]], grow: 0.65, w: 1.0, op: 0.35, flow: 0.2 });
      A.soak(0, t0 + 0.45, 3.2); A.status(0, t0 + 0.45, 'slow', 2.6);
      foeBolt(A, { t: t0 + 0.2, d: 1, dur: 0.5, to: [me[0] + 1.5, 0.9, me[1] + 0.6] });
      A.cap(0.1, 1.5, '冲刺：乘潮 2.8 u，无敌', 'Dash: she rides a tide 2.8 u, untouchable');
      A.cap(1.5, 4.4, '湿路 3 秒：慢 30%，浸湿', 'The wet path, 3 s: 30% slower, soaked');
    } };
}

// ================================================================ Stream 流
// F1 Riverbolt: a flick from the hip; a twisting bolt, 5 u: 14, soaks. 湿: it goes on through a soaked foe
{ const me = [-2.2, 0.1], d0 = [-0.3, 0.1], d1 = [1.6, 0.1];
  DEFS.F1 = { T: 2.6, cam: { x: -0.2, z: 0.0, w: 6.0 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1], { soaked: true }], d1],
    seq: [[0.3, 'castPoint', { speed: 1.3 }]], body: (t) => mixA(turnTrunk(t, 0.3, 0.75, -20), shake(t, 1.4, 0.5, 0.6)),
    fx(A) { const tb = 0.3 + 0.44 / 1.3; FX.bolt(A, { t: tb, to: [d1[0] + 0.1, 0.65, d1[1]], dur: 0.42, r: 0.12 });
      A.hit(0, tb + 0.18, 14, { wet: true, soak: true }); A.hit(1, tb + 0.42, 14, { soak: true });
      A.cap(0.3, 2.6, '湿：穿过浸湿的敌人', 'Wet: it goes on through a soaked foe'); } };
}
const V = (x, y, z) => [x, y, z];
// F2 Torrent: the staff levelled, a braced stance, a shock ring at the muzzle; Crash: a jet through a 5.5 u line: 18
{ const me = [-2.4, 0.1], ds = [[-0.9, 0.1, { soaked: true }], [0.5, 0.15], [1.9, 0.05, { soaked: true }]]; const tr = 0.35 + 0.44;
  DEFS.F2 = { T: 2.8, cam: { x: -0.1, z: 0.0, w: 6.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.35, 'castPoint']], root: [{ t: tr - 0.02 }, { t: tr + 0.1, fw: -0.18, e: 'out' }, { t: tr + 0.6, fw: -0.12 }],
    body: (t) => mixA(crouch(t, tr - 0.1, tr + 0.5, 1), tailSlap(t, tr, 0.7), shake(t, tr + 0.9, 0.6, 0.7)),
    fx(A) { FX.jet(A, { t: tr, to: (t) => A.ahead(tr, 5.5, 0.55), dur: 0.12, hold: 0.28, w: 0.32, tail: 0.18 });
      FX.ring(A, { t: tr, at: 'tip', r0: 0.08, r1: 0.5, dur: 0.25, dir: (t) => A.fwd(tr), col: C.foam, op: 0.9, w: 0.25 });
      A.hit(0, tr + 0.04, 29, { crash: true }); A.hit(1, tr + 0.07, 18); A.hit(2, tr + 0.1, 29, { crash: true }); A.shake(tr, 0.04, 0.16);
      A.cap(0.35, 2.8, '拍：水柱贯穿 5.5 u：18（浸湿的 29）', 'Crash: a jet through a 5.5 u line: 18 (29 if soaked)'); } };
}
// F3 Water Whip: she coils round the staff and unwinds; a ribbon wraps the first foe within 4 u and throws it to the pointer: 12. 湿: a soaked foe lands flat
{ const me = [-1.6, 0.4], d0 = [0.6, -0.5], to = [-0.4, 1.7]; const tw = 0.3 + 0.48;
  DEFS.F3 = { T: 3.0, cam: { x: -0.4, z: 0.5, w: 6.2 }, her: H(me[0], me[1], 70), dum: [[d0[0], d0[1], { soaked: true, flat: [[tw + 0.62, 2.6]] }]], seq: [[0.3, 'whip']],
    root: [{ t: 0.3, look: d0 }, { t: tw, look: d0 }, { t: tw + 0.45, look: to, e: 'io2' }],
    body: (t) => mixA(tailSlap(t, tw + 0.55, 0.6), shake(t, 1.9, 0.6, 0.6)),
    fx(A) { FX.pointer(A, { t0: 0, t1: 2.2, at: [to[0], 0, to[1]] });
      FX.rope(A, { t0: tw - 0.05, t1: tw + 0.5, from: 'tip', to: (t) => A.dpt(0, t, 0.55), w: 0.09, head: 0.1, sag: 0.05 });
      A.hit(0, tw + 0.06, null); A.moveTo(0, tw + 0.1, to, 0.5, 'io2'); A.launch(0, tw + 0.1, 0.9); A.hit(0, tw + 0.62, 12, { wet: true, soak: true, big: true });
      FX.splash(A, { t: tw + 0.62, at: [to[0], 0, to[1]], r: 0.5, h: 0.5 });
      A.cap(0.3, 3.0, '抓住 4 u 内第一个敌人，甩向指针：12；湿：浸湿的摔倒', 'Grabs the first foe within 4 u, throws it to the pointer: 12. Wet: a soaked foe lands flat'); } };
}
// F4 Skipping Stone: a flat disc of water flicked low and side-on: four skips, 10 each, the last 16. 湿: one more skip for each soaked foe it hits
{ const me = [-2.6, 0.2]; const pts = [[-1.5, 0.2], [-0.3, 0.2], [0.7, 0.2], [1.6, 0.2], [2.4, 0.2]];
  DEFS.F4 = { T: 2.8, cam: { x: 0.0, z: 0.0, w: 6.8 }, her: H(me[0], me[1]), dum: [[-0.3, 0.2, { soaked: true }], [1.6, 0.2], [2.4, 0.2]], seq: [[0.3, 'flick']],
    body: (t) => mixA(shake(t, 1.7, 0.6, 0.5)),
    fx(A) { const t0 = 0.3 + 0.32, per = 0.2; FX.stone(A, { t: t0, pts, per, hop: 0.3, grow: true });
      A.hit(0, t0 + per * 2, 10, { wet: true, soak: true }); A.say(t0 + per * 2, { zh: '+1 跳', en: '+1 skip' }, { col: C.sky }); A.hit(1, t0 + per * 4, 10, { soak: true }); A.hit(2, t0 + per * 5, 16, { soak: true, big: true });
      A.cap(0.3, 2.8, '四跳各 10，最后 16；湿：浸湿的敌人多一跳', 'Four skips of 10, the last 16. Wet: one more skip for each soaked foe'); } };
}
// F5 Spray: the shell tip turned flat like a nozzle, a quick wide fan, 3 u: 10. 湿: a foe already soaked is drenched (its next Crash does not spend the soak)
{ const me = [-1.9, 0.1], ds = fan(3, 2.2, 45, -45, -1.9, 0.1); ds[1].push({ soaked: true }); const tf = 0.3 + 0.3;
  DEFS.F5 = { T: 2.6, cam: { x: -0.6, z: 0.1, w: 5.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'nozzle']], body: (t) => shake(t, 1.5, 0.6, 0.6),
    fx(A) { FX.fan(A, { t: tf - 0.12, at: 'him', yaw: (t) => A.rootAt(tf).yaw / D2R, arc: 100, r: 3, dur: 0.3, rainbow: true });
      A.hit(0, tf + 0.05, 10, { soak: true }); A.hit(1, tf + 0.08, 10, { wet: true }); A.soak(1, tf + 0.1, 4, { drench: true }); A.hit(2, tf + 0.11, 10, { soak: true });
      A.cap(0.3, 2.6, '扇形 3 u：10；湿：已浸湿的变透湿', 'A wide fan, 3 u: 10. Wet: a soaked foe is drenched'); } };
}
// F6 Tide Orb: hold: an orb rises off the shell tip and follows the pointer like a balloon on a string: 4 each 0.3 s. Let go: it bursts, Crash 14
{ const me = [-2.1, 0.5], ds = [[-0.3, -0.4, { soaked: true }], [0.8, 0.3]]; const p = (t) => { const u = clamp((t - 0.6) / 2.0); return [lerp(-1.2, 0.85, EASE.s(u)), 0.55, lerp(0.5, -0.1, Math.sin(u * Math.PI)) + lerp(-0.2, 0.3, u)]; };
  DEFS.F6 = { T: 3.8, cam: { x: -0.4, z: 0.1, w: 6.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom', { to: 0.62 }], [0.62, 'bloomHold', { loop: true, until: 2.7 }], [2.7, 'castPoint', { from: 0.3 }]],
    root: [{ t: 0.5, look: [0, 0] }, { t: 2.7, look: [0.8, 0.3] }], body: (t) => mixA(pawUp(t, 0.6, 2.7, 0.8), shake(t, 3.1, 0.6, 0.5)),
    fx(A) { const orbAt = (t) => t < 0.6 ? A.at('tip', t).toArray() : (() => { const q = p(t), s = A.at('tip', 0.6), u = clamp((t - 0.6) / 0.3); return [lerp(s.x, q[0], u), lerp(s.y, q[1], u), lerp(s.z, q[2], u)]; })();
      FX.orb(A, { t0: 0.4, t1: 2.85, at: orbAt, r: 0.32 }); FX.rope(A, { t0: 0.6, t1: 2.8, from: 'tip', to: orbAt, w: 0.03, sag: 0.1 }); FX.pointer(A, { t0: 0.5, t1: 2.8, at: (t) => { const q = p(t); return [q[0], 0, q[2]]; } });
      for (let t = 0.9; t < 2.8; t += 0.3) { const q = p(t); ds.forEach((d, i) => { if (Math.hypot(q[0] - d[0], q[2] - d[1]) < 0.75) A.hit(i, t, 4, { noStop: true, soak: true }); }); }
      const tb = 2.85, q = p(2.8); FX.splash(A, { t: tb, at: [q[0], 0, q[2]], r: 0.8, h: 0.9, crash: true }); A.hit(1, tb + 0.02, 22, { crash: true }); A.shake(tb, 0.05, 0.2);
      A.cap(0.3, 2.8, '按住：水珠跟着指针，每 0.3 秒 4', 'Hold: the orb follows the pointer: 4 each 0.3 s'); A.cap(2.8, 3.8, '松开：拍 14', 'Let go: it bursts, Crash 14'); } };
}
// F7 Depth Charge: water gathers on the shell into a ball as big as she is; she heaves it over everything; it drops with a deep thump and a column: Crash 18 to 36
{ const me = [-2.4, 0.2], tgt = [1.0, 0.0], ds = [[-0.9, 0.3], [0.9, -0.3, { soaked: true }], [1.4, 0.4]]; const th = 1.4, tl = th + 0.68, td = tl + 0.75;
  DEFS.F7 = { T: 4.2, cam: { x: -0.4, z: 0.0, w: 6.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.25, 'castBloom', { to: 0.62 }], [0.62, 'bloomHold', { loop: true, until: th }], [th, 'tsunami', { from: 0.2 }]],
    body: (t) => mixA(tailSlap(t, tl - 0.2 + 0.2, 0.9), shake(t, td + 0.5, 0.6, 0.6)),
    fx(A) { FX.orb(A, { t0: 0.4, t1: tl - 0.2, at: 'tip', r: (t) => 0.06 + 0.32 * clamp((t - 0.4) / 1.2), pop: false });
      FX.bolt(A, { t: tl - 0.2, from: 'tip', to: [tgt[0], 0.3, tgt[1]], dur: 0.95, arc: 2.2, r: 0.38, e: 'lin', splash: false });
      A.hud(gaugeHud('蓄力', 'Charge', (t) => t < 0.4 ? 0 : t < tl - 0.2 ? clamp((t - 0.4) / 1.2) : null, { full: true }));
      FX.column(A, { t: td, at: [tgt[0], 0, tgt[1]], h: 2.0, r: 0.45, dur: 0.6, fall: true }); FX.ringwave(A, { t: td, at: [tgt[0], 0, tgt[1]], r0: 0.3, r1: 1.4, h: 0.4 });
      A.hit(1, td + 0.02, 58, { crash: true }); A.hit(2, td + 0.04, 36); A.shake(td, 0.07, 0.25);
      A.cap(0.25, th, '按住蓄力', 'Hold to charge'); A.cap(th, 4.2, '抛过一切：拍 18 到 36（满蓄 36）', 'Lobbed over everything: Crash 18 to 36 (36 full)'); } };
}
// F8 Floodgate (big): she drives the staff into the floor and leans back on it, tail braced; a river comes out as one beam, 8 u, 2 s: 8 each 0.25 s; she turns slowly. End: the shake
{ const me = [-2.6, 0.5], ds = [[0.2, -0.6, { soaked: true }], [1.3, 0.3], [2.5, 1.2]]; const t0 = 0.3, b0 = 0.75, b1 = 2.75;
  DEFS.F8 = { T: 4.2, cam: { x: 0.0, z: 0.2, w: 7.4 }, her: H(me[0], me[1], 70), dum: ds, seq: [[t0, 'castPlant', { to: 0.45 }], [0.75, 'plantLean', { loop: true, until: b1 }]],
    root: [{ t: b0 }, { t: b1, spin: 40, e: 'lin' }], body: (t) => mixA(tailSlap(t, b0, 0.7), shake(t, b1 + 0.3, 0.8, 1)),
    fx(A) { const src = (t) => A.ahead(t, 0.65, 0.25), end = (t) => A.ahead(t, 8, 0.4);
      // the jet's look (Kesh, 20 Nov: the beam is wide, so the stream's look reads wrong): blue core in a white sheath, a spiky head
      FX.jet(A, { t: b0, hold: b1 - b0, from: src, to: end, w: 0.62, dur: 0.15, tail: 0.25, wob: 0.05, speed: 4 });
      FX.splash(A, { t: b0, at: (t) => A.ahead(b0, 0.65, 0), r: 0.5, h: 0.5 }); for (let t = b0; t < b1; t += 0.12) FX.mist(A, { t, at: src, n: 2, r: 0.2, h: 0.2, size: 0.18, dur: 0.4, seed: Math.floor(t * 100) });
      // who the beam covers as she turns
      ds.forEach((d, i) => { let first = true; for (let t = b0 + 0.1; t < b1; t += 0.25) { const r = A.rootAt(t), dx = d[0] - r.x, dz = d[1] - r.z, f = A.fwd(t); const al = dx * f.x + dz * f.z, la = Math.abs(dx * f.z - dz * f.x); if (al > 0 && al < 8 && la < 0.45) { A.hit(i, t, first && d[2] ? 13 : 8, first && d[2] ? { crash: true } : { noStop: true }); first = false; } } });
      A.dark(b0, b1, 0.18); A.cap(t0, 4.2, '大招：杖插地，巨流 8 u，2 秒：每 0.25 秒 8', 'Big skill: the staff planted, a great beam, 8 u, 2 s: 8 each 0.25 s'); } };
}

// ================================================================ Wave 浪
// F9 Breaker: a hop, the staff's butt down; a ring wall of water breaks outward: Crash 22, knocked back 1 u
{ const me = [-0.6, 0.1], ds = [around(me, 20, 0.95), around(me, 150, 1.0), around(me, 260, 0.9)]; ds[0].push({ soaked: true }); const tp = 0.3 + 0.4;
  DEFS.F9 = { T: 2.5, cam: { x: -0.4, z: 0.1, w: 5.4 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant']], root: [{ t: 0.4 }, { t: tp, y: 0, jump: 0.25 }],
    body: (t) => mixA(tailSlap(t, tp, 0.8), shake(t, 1.5, 0.6, 0.6)),
    fx(A) { FX.ringwave(A, { t: tp, at: [me[0], 0, me[1]], r0: 0.3, r1: 1.9, h: 0.6, dur: 0.45 });
      ds.forEach((d, i) => { const dx = d[0] - me[0], dz = d[1] - me[1], l = Math.hypot(dx, dz); A.hit(i, tp + 0.12, i === 0 ? 35 : 22, { crash: i === 0, knock: [dx / l * (i === 0 ? 1.5 : 1), dz / l * (i === 0 ? 1.5 : 1)], kdur: 0.35, dir: [dx, dz] }); });
      A.shake(tp, 0.05, 0.2); A.cap(0.3, 2.5, '拍：周身环浪：22，击退 1 u', 'Crash: a ring round her: 22, knocked back 1 u'); } };
}
// F10 Crashing Wave: the trunk turn and the curling wall, 100°, 2.2 u: Crash 20, pushed 1.2 u
{ const me = [-2.0, 0.1], ds = fan(3, 1.4, 40, -40, -2.0, 0.1); ds[0].push({ soaked: true }); const tw = 0.3 + 0.46;
  DEFS.F10 = { T: 2.6, cam: { x: -0.7, z: 0.1, w: 5.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castSweep']], body: (t) => mixA(tailSlap(t, tw, 0.6), shake(t, 1.6, 0.6, 0.6)),
    fx(A) { FX.wave(A, { t: tw - 0.04, from: (t) => A.ahead(tw, 0.35, 0), dir: 90, dist: 2.0, dur: 0.42, w: 2.6, h: 0.75, len: 0.9, wFn: (u) => 1.8 + 1.4 * u });
      ds.forEach((d, i) => { const dx = d[0] - me[0], dz = d[1] - me[1], l = Math.hypot(dx, dz); A.hit(i, tw + 0.2, i === 0 ? 32 : 20, { crash: i === 0, knock: [dx / l * (i === 0 ? 1.8 : 1.2), dz / l * (i === 0 ? 1.8 : 1.2)], kdur: 0.4 }); });
      A.cap(0.3, 2.6, '拍：100° 怒涛 2.2 u：20，推 1.2 u', 'Crash: a wave, 100°, 2.2 u: 20, pushed 1.2 u'); } };
}
// Call the Tide (F11, kit 1.4): her water laid on the floor before the cast: an old wet path, two puddles and one under her own feet
export const TIDE = { me: [-2.6, 0.1], path: [[-1.5, -0.8], [0.8, -0.8]], pools: [[1.5, 0.7, 0.7], [-0.3, 1.2, 0.55], [-2.6, 0.1, 0.6]] };
export function layWater(A, t0, t1, o = {}) { FX.strip(A, { t0, t1, from: [TIDE.path[0][0], 0, TIDE.path[0][1]], to: [TIDE.path[1][0], 0, TIDE.path[1][1]], w: 0.9, op: 0.38, flow: 0.2, fin: 0.3 });
  TIDE.pools.forEach((p, k) => { if (o.noFeet && k === 2) return; FX.puddle(A, { t0, t1, at: [p[0], 0, p[1]], r: p[2], op: 0.45, fin: 0.3 }); }); }
// one point per piece of water (the path's middle, each puddle)
export const tidePts = () => [[lerp(TIDE.path[0][0], TIDE.path[1][0], 0.5), TIDE.path[0][1]], ...TIDE.pools.map((p) => [p[0], p[1]])];
// F11 Call the Tide: she lifts the left paw slowly, palm up, as if raising the sea on a string: every wet patch swells, stands up as a small wave and breaks where it stands; a ring of tide rises round her feet
{ const me = TIDE.me, ds = [[-0.4, -0.8, { soaked: true }], [1.5, 0.7, { soaked: true }], [-0.3, 1.2, { soaked: true }], [2.5, -0.6]]; const tc = 1.0, tw = tc + 0.5, T = 4.4;
  DEFS.F11 = { T, cam: { x: -0.1, z: 0.2, w: 7.6 }, her: H(me[0], me[1]), dum: ds, seq: [[tc, 'castBloom', { speed: 0.9 }]], root: [{ t: 0.2, look: [0.5, 0.2] }],
    body: (t) => mixA(pawUp(t, tc, tw + 0.1, 1.0), lookUp(t, tc + 0.1, tw, 12), tailSlap(t, tw, 0.6), shake(t, tw + 0.1, 0.5, 0.5)),
    fx(A) { layWater(A, 0.05, T); A.cap(0.05, tc, '她的水：湿路、水洼', 'Her water: a wet path, puddles');
      // each piece rises as a standing wave and breaks where it stands; the floor round her rises as a ring
      for (let k = 0; k < 4; k++) FX.splash(A, { t: tw + k * 0.03, at: [lerp(TIDE.path[0][0], TIDE.path[1][0], k / 3), 0, TIDE.path[0][1]], r: 0.5, h: 0.9, crash: true });
      TIDE.pools.forEach((p, k) => FX.splash(A, { t: tw + 0.05 + k * 0.04, at: [p[0], 0, p[1]], r: p[2] * 1.1, h: 1.0, crash: true }));
      FX.ring(A, { t: tw, at: [me[0], 0.03, me[1]], r0: 0.4, r1: 2.0, dur: 0.45, col: C.foam, op: 0.7, w: 0.14 }); for (let k = 0; k < 6; k++) FX.splash(A, { t: tw + 0.1, at: around(me, k * 60, 1.6), r: 0.35, h: 0.6 });
      [0, 1, 2].forEach((i) => A.hit(i, tw + 0.06 + i * 0.03, 16, { crash: true })); A.shake(tw, 0.05, 0.18);
      A.cap(tc, T, '拍：她所有的水和身边 2 u 一起涌起成浪：站在里面的敌人 16；水多留 2 秒', 'Crash: all her water and the floor within 2 u rise as waves: 16 to foes in it; the water lasts 2 s longer'); } };
}
// F12 Whirlpool: a pool, 5 s: 4 a second, slows, drags foes to its centre; a foe in it is soaked again at once after a Crash
{ const me = [-2.4, 0.3], c = [0.5, 0], ds = [around(c, 30, 1.4), around(c, 200, 1.3), around(c, 290, 1.2)]; const tp = 0.3 + 0.4;
  DEFS.F12 = { T: 4.6, cam: { x: -0.4, z: 0.0, w: 6.4 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant'], [2.6, 'castPoint', { speed: 1.2 }]],
    root: [{ t: 0.3, look: c }], body: (t) => mixA(tailSlap(t, tp, 0.5), shake(t, 3.6, 0.6, 0.5)),
    fx(A) { FX.pool(A, { t0: tp, t1: 4.4, at: [c[0], 0, c[1]], r: 1.6, whirl: 1, op: 0.6 });
      ds.forEach((d, i) => { A.moveTo(i, tp + 0.2, around(c, [30, 200, 290][i] + 60, 0.35), 1.6, 'out'); A.turn(i, tp + 0.2, 200, 1.6); A.status(i, tp + 0.3, 'slow', 3.4); for (let k = 0; k < 3; k++) A.hit(i, tp + 0.5 + k, 4, { noStop: true, soak: k === 0 }); });
      const tb = 2.6 + 0.44 / 1.2; FX.bolt(A, { t: tb, to: (t) => A.dpt(0, t, 0.6), dur: 0.3 }); A.hit(0, tb + 0.3, 22, { crash: true }); A.soak(0, tb + 0.45, 4);
      A.cap(0.3, 2.6, '浸：漩涡 5 秒：每秒 4，减速，拖向中心', 'Soak: a pool, 5 s: 4 a second, slows, drags foes to its centre');
      A.cap(2.6, 4.6, '在漩涡里被拍后马上再浸湿', 'A foe in it is soaked again at once after a Crash'); } };
}
// F13 Sky Fall (Kesh, 20 Nov: the wall is gone; his pick of three): she points, and a round waterfall pours from the sky onto the spot, 4 s:
// foes' shots that fly into it are washed down; foes under it are soaked and slowed 40%. Press again: the whole fall drops at once: Crash 16
{ const me = [-2.4, 0.2], c = [0.3, 0.2], ds = [[0.1, -0.2, { soaked: true }], [0.65, 0.55], [2.7, -0.3]]; const tr = 0.3 + 0.5, tf = 3.2;
  DEFS.F13 = { T: 4.4, cam: { x: 0.0, z: 0.1, w: 6.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPoint'], [tf - 0.2, 'castPoint', { from: 0.2 }]],
    body: (t) => mixA(lookUp(t, 0.4, 1.2, 20), tailSlap(t, tf + 0.05, 0.7), shake(t, tf + 0.6, 0.5, 0.5)),
    fx(A) { FX.waterfall(A, { t0: tr - 0.4, t1: tf + 0.35, cut: tf, at: [c[0], 0, c[1]], round: true, w: 1.8, top: 2.8, op: 0.8, rise: 0.4 });
      [0, 1].forEach((i) => { A.hit(i, tr + 0.05, null, { soak: true, slow: tf - tr }); });
      // the shooter's bolts fly into the fall and are washed down
      for (const tb of [1.4, 2.2]) { const tt = tb + 0.6 * (2.7 - 1.15) / (2.7 - (me[0] + 0.3)); foeBolt(A, { t: tb, d: 2, dur: 0.6, to: [me[0] + 0.3, 0.75, me[1]], stop: tt - tb });
        FX.drops(A, { t: tt, at: [1.15, 0.7, -0.2], n: 6, sp: 0.3, up: -0.6, size: 0.04, dur: 0.5 }); FX.splash(A, { t: tt + 0.3, at: [1.05, 0, -0.15], r: 0.25, h: 0.3, n: 4 }); }
      // the drop: the sky lets go, all its water lands at once
      FX.splash(A, { t: tf + 0.3, at: [c[0], 0, c[1]], r: 1.2, h: 0.9, crash: true }); FX.ring(A, { t: tf + 0.3, at: [c[0], 0.02, c[1]], r0: 0.4, r1: 1.8, dur: 0.45, col: C.foam, op: 0.7, w: 0.18 });
      A.hit(0, tf + 0.32, 26, { crash: true }); A.hit(1, tf + 0.32, 16, {}); A.shake(tf + 0.3, 0.07, 0.22);
      A.cap(0.3, tf - 0.2, '浸：天落 4 秒：瀑布从天而降，冲掉飞进来的子弹；下面的敌人浸湿、慢 40%', 'Soak: Sky Fall, 4 s: a waterfall pours on a spot, washing down the shots that fly in; foes under it are soaked and 40% slower');
      A.cap(tf - 0.2, 4.4, '再按：整道瀑布一口气砸下，拍 16', 'Press again: the whole fall drops at once: Crash 16'); } };
}
// F14 Wave Rider: she hops, a wave lifts under her and she rides it on her belly, steering, 1.5 s: 14 to foes she passes
{ const me = [-2.6, 0.6], ds = [[-0.9, 0.2], [0.5, -0.6, { soaked: true }], [1.6, 0.4]]; const t0 = 0.3, t1 = t0 + 1.5;
  const path = (u) => [lerp(-2.4, 2.2, u), 0.6 * Math.cos(u * Math.PI * 1.6) - 0.1];
  DEFS.F14 = { T: 3.4, cam: { x: -0.1, z: 0.1, w: 7.0 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'castPlant', { to: 0.3, speed: 2 }], [t0 + 0.15, 'belly', { loop: true, until: t1 }], [t1, 'castPlant', { from: 0.6 }]],
    root: (() => { const R = [{ t: t0 }]; for (let i = 1; i <= 15; i++) { const u = i / 15, p = path(u), q = path(Math.min(1, u + 0.03)); R.push({ t: t0 + 1.5 * u, x: p[0], z: p[1], y: 0.28, look: [q[0] + (q[0] - p[0]) * 5, q[1] + (q[1] - p[1]) * 5], e: 'lin', roll: 12 * Math.sin(u * Math.PI * 1.6) }); } R.push({ t: t1 + 0.2, y: 0, roll: 0, e: 'out' }); return R; })(),
    body: (t) => shake(t, t1 + 0.4, 0.6, 0.7),
    fx(A) { const ride = (t) => { const r = A.rootAt(t); return [r.x, 0, r.z]; };
      FX.wave(A, { t: t0 + 0.05, at: ride, yaw: (t) => A.rootAt(t).yaw, dur: 1.5, out: 0.2, w: 0.9, h: 0.38, len: 1.0, wet: false });
      FX.wake(A, { of: ride, t0: t0 + 0.1, t1, w: 0.8, op: 0.4, life: 1.4 });
      [0.32, 0.6, 0.85].forEach((u, i) => A.hit(i, t0 + 1.5 * u, i === 1 ? 14 : 14, { wet: i === 1, soak: true, knock: [0, i === 1 ? 0.6 : -0.6], kdur: 0.25 }));
      A.cap(t0, 3.4, '浸：踏浪 1.5 秒，转向自如：经过的敌人各 14', 'Soak: she surfs a wave she steers, 1.5 s: 14 to foes she passes'); } };
}
// F15 Clapping Waves: the staff's tip dropped to the floor in front; two walls rise at the sides of a spot and run in to meet with a boom and a tall thin fin: Crash 18, stun 0.5 s
{ const me = [-2.2, 0.2], c = [0.6, 0.1], ds = [[0.45, -0.25, { soaked: true }], [0.75, 0.45]]; const tp = 0.3 + 0.4, tm = tp + 0.45;
  DEFS.F15 = { T: 2.8, cam: { x: -0.4, z: 0.1, w: 6.0 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castPlant', { speed: 0.9 }]], body: (t) => mixA(tailSlap(t, tm, 0.6), shake(t, 1.8, 0.6, 0.5)),
    fx(A) { for (const s of [-1, 1]) FX.wave(A, { t: tp, from: [c[0], 0, c[1] + s * 1.9], dir: s > 0 ? 180 : 0, dist: 1.7, dur: tm - tp, e: 'in2', w: 1.7, h: 1.0, len: 0.8, out: 0.12, wet: false });
      FX.column(A, { t: tm, at: [c[0], 0, c[1]], h: 2.2, r: 0.12, dur: 0.5, fall: true }); FX.splash(A, { t: tm, at: [c[0], 0, c[1]], r: 0.8, h: 0.6, crash: true });
      A.hit(0, tm + 0.02, 29, { crash: true, stun: 0.5 }); A.hit(1, tm + 0.03, 18, { stun: 0.5 }); A.shake(tm, 0.06, 0.2);
      A.cap(0.3, 2.8, '拍：两道浪从两侧合拢：18，眩晕 0.5 秒', 'Crash: two waves clap shut on a spot: 18, stun 0.5 s'); } };
}
// F16 Maelstrom (big): she spins on the spot with the staff out, the water running to her feet in a spiral; a beat of stillness; a column goes up: pulls everything within 3 u inward, then bursts: Crash 40. End: the shake
{ const me = [-0.3, 0.1], ds = [around(me, 10, 2.6), around(me, 130, 2.4), around(me, 230, 2.7), around(me, 300, 2.2)]; ds[1].push({ soaked: true }); const t0 = 0.3, ts = 1.3, tb = 1.75;
  DEFS.F16 = { T: 3.8, cam: { x: -0.3, z: 0.1, w: 7.2 }, her: H(me[0], me[1]), dum: ds, seq: [[t0, 'castSweep', { to: 0.5 }], [0.65, 'level', { loop: true, until: ts }], [ts, 'castBloom', { from: 0.3, to: 0.62 }], [tb, 'castPlant', { from: 0.3 }]],
    root: [{ t: 0.5 }, { t: ts, spin: 720, e: 'in2' }, { t: ts + 0.1, spin: 740, e: 'out' }], body: (t) => mixA(coil(t, 0.4, ts, 0.6), tailSlap(t, tb + 0.1, 1), shake(t, 2.7, 0.8, 1)),
    fx(A) { FX.pool(A, { t0: 0.45, t1: tb + 0.2, at: [me[0], 0, me[1]], r: (t) => lerp(3.0, 1.2, clamp((t - 0.45) / 1.2)), whirl: 1.5, op: 0.5 });
      ds.forEach((d, i) => { A.moveTo(i, 0.55, around(me, [10, 130, 230, 300][i] + 70, 0.75), 0.95, 'in2'); A.turn(i, 0.55, 260, 0.95); });
      FX.column(A, { t: tb, at: [me[0], 0, me[1]], h: 2.8, r: 0.55, dur: 0.75, fall: true }); FX.ringwave(A, { t: tb + 0.05, at: [me[0], 0, me[1]], r0: 0.5, r1: 2.6, h: 0.7, dur: 0.5 });
      ds.forEach((d, i) => { const p = around(me, [10, 130, 230, 300][i] + 70, 0.75), dx = p[0] - me[0], dz = p[1] - me[1], l = Math.hypot(dx, dz); A.hit(i, tb + 0.1, i === 1 ? 64 : 40, { crash: i === 1, knock: [dx / l * 1.5, dz / l * 1.5], kdur: 0.45, up: 0.5 }); });
      A.dark(ts - 0.1, tb + 0.1, 0.3, 0.1, 0.2); A.shake(tb, 0.08, 0.3); A.cap(t0, 3.8, '大招：拉近 3 u 内一切，然后爆开：拍 40', 'Big skill: pulls everything within 3 u inward, then bursts: Crash 40'); } };
}

// ================================================================ Spring 泉
// F17 Ripple Step: three light hops, knees bent, tail out; each landing spreads a ripple (1.5 u, 6, soaks) and leaves a puddle (0.8 u, 3 s, 6 a second); standing still she steps away from her aim
{ const me = [-0.1, 0.1], ds = [[1.7, 0.1], [-1.2, -0.75], [-3.4, 0.8]]; const st = [0.45, 1.05, 1.65], hop = 0.3, T = 4.6; const L = [[-1.7, 0.1], [-3.3, 0.1], [-4.9, 0.1]];
  DEFS.F17 = { T, cam: { x: -1.9, z: 0.1, w: 7.6 }, her: H(me[0], me[1]), dum: ds, seq: [[0.2, 'idle', { loop: true, until: T }]],
    root: (() => { const R = [{ t: 0.1, look: ds[0] }]; st.forEach((t, k) => { R.push({ t, x: k ? L[k - 1][0] : me[0], z: me[1], look: ds[0] }); R.push({ t: t + hop, x: L[k][0], z: L[k][1], jump: 0.45, look: ds[0], e: 'lin' }); }); return R; })(),
    body: (t) => mixA(...st.map((s) => crouch(t, s - 0.08, s + 0.05, 0.7)), ...st.map((s) => crouch(t, s + hop - 0.02, s + hop + 0.12, 0.6)), ...st.map((s) => tailSlap(t, s + hop, 0.3))),
    fx(A) { foeBolt(A, { t: 0.35, d: 0, dur: 0.45, to: [me[0] - 0.2, 0.6, me[1]] });
      L.forEach((p, k) => { const tl = st[k] + hop; FX.ring(A, { t: tl, at: [p[0], 0.03, p[1]], r0: 0.2, r1: 1.5, dur: 0.45, col: C.foam, op: 0.7, w: 0.1 }); FX.splash(A, { t: tl, at: [p[0], 0, p[1]], r: 0.35, h: 0.35 }); FX.puddle(A, { t0: tl, t1: tl + 3, at: [p[0], 0, p[1]], r: 0.8 }); });
      A.hit(1, st[0] + hop + 0.05, 6, { soak: true }); A.hit(1, st[0] + hop + 1.05, 6, { noStop: true }); A.hit(1, st[0] + hop + 2.05, 6, { noStop: true });
      A.hit(2, st[2] + hop + 0.05, 6, { soak: true });
      A.cap(0.2, T, '浸：3 秒内最多三步，每步 1.6 u，无敌；落地涟漪 6，浸湿；留下水洼', 'Soak: up to three steps within 3 s, 1.6 u each, untouchable; each landing: a ripple, 6, soaks; a puddle stays'); } };
}
// F18 Bubble Ward: a 14 bubble, 4 s, on the friend under the pointer; its pop soaks the foes within 1 u
{ const me = [-2.2, 0.4], al = [-0.3, 0.0], ds = [[0.4, 0.5], [2.0, -0.4]]; const tc = 0.3 + 0.38;
  DEFS.F18 = { T: 3.6, cam: { x: -0.2, z: 0.1, w: 6.2 }, her: H(me[0], me[1]), dum: [[al[0], al[1], { ally: true, face: 90 }], ...ds], seq: [[0.3, 'castBloom', { speed: 1.2 }]], root: [{ t: 0.3, look: al }],
    body: (t) => pawUp(t, 0.45, 1.0, 0.7),
    fx(A) { FX.pointer(A, { t0: 0, t1: tc + 0.2, at: [al[0], 0, al[1]] }); FX.bolt(A, { t: tc, to: (t) => A.dpt(0, t, 0.62), dur: 0.35, r: 0.08, col: C.bubble, splash: false });
      const hits = [1.5, 2.1, 2.6]; shieldOn(A, 0, tc + 0.35, 2.62, (t) => t < 1.5 ? 14 : t < 2.1 ? 8 : t < 2.6 ? 2 : 0, { hits });
      hits.forEach((h, k) => foeBolt(A, { t: h - 0.4, d: 2, dur: 0.4, to: (t) => A.dpt(0, h, 0.7) }));
      A.hit(1, 2.65, null, { soak: true }); A.cap(0.3, 2.5, '浸：指针下的队友得到泡泡 14，4 秒', 'Soak: a 14 bubble, 4 s, on the friend under the pointer'); A.cap(2.5, 3.6, '破了：1 u 内的敌人浸湿', 'It pops: foes within 1 u are soaked'); } };
}
// F19 Rain Squall: she points the staff up; clouds, rain, 6 s: 3 a second, slow 25%; its soak lasts 8 s
{ const me = [-2.3, 0.4], c = [0.4, 0], ds = [[0.0, -0.4], [0.9, 0.4], [0.5, -1.3]];
  DEFS.F19 = { T: 4.0, cam: { x: -0.4, z: -0.1, w: 6.4 }, her: H(me[0], me[1]), dum: ds, seq: [[0.3, 'castBloom']], body: (t) => mixA(lookUp(t, 0.5, 1.4, 25)),
    fx(A) { FX.rain(A, { t0: 0.85, t1: 3.9, at: [c[0], 0, c[1]], r: 1.5, h: 2.2, n: 46 }); FX.trail(A, { of: 'tip', t0: 0.5, t1: 0.95, len: 0.25, w: 0.06, col: C.foam });
      ds.forEach((d, i) => { A.status(i, 1.1, 'slow', 2.8); A.soak(i, 1.1, 8, { quiet: i > 0 }); for (let k = 0; k < 3; k++) A.hit(i, 1.4 + k, 3, { noStop: true }); });
      A.cap(0.3, 4.0, '浸：骤雨 6 秒：每秒 3，减速 25%；浸湿持续 8 秒', 'Soak: rain, 6 s: 3 a second, slow 25%; its soak lasts 8 s'); } };
}
// F20 Geyser: the staff's butt taps the floor twice; a round wet mark shivers; 0.6 s later a white column: 16, launched 0.8 s. 湿: a soaked foe flies twice as high
{ const me = [-2.2, 0.3], c = [0.3, 0.0], ds = [[0.05, -0.25, { soaked: true }], [0.6, 0.3]]; const tp = 0.3 + 0.4, te = tp + 0.6;
  DEFS.F20 = { T: 3.2, cam: { x: -0.5, z: 0.0, w: 6.0, y: 0.8 }, her: H(me[0], me[1]), dum: ds, seq: [[0.15, 'castPlant', { to: 0.42, speed: 1.8 }], [0.4, 'castPlant', { from: 0.2 }]],
    body: (t) => mixA(lookUp(t, te, te + 1.0, 25), shake(t, 2.3, 0.6, 0.5)),
    fx(A) { FX.pool(A, { t0: tp - 0.1, t1: te + 0.1, at: [c[0], 0, c[1]], r: (t) => 0.8 + 0.04 * Math.sin(t * 50), op: 0.45 }); FX.ring(A, { t: tp, at: [c[0], 0, c[1]], r0: 0.8, r1: 0.8, dur: 0.6, col: C.foam, op: 0.8, w: 0.1 });
      FX.column(A, { t: te, at: [c[0], 0, c[1]], h: 2.4, r: 0.55, dur: 0.75 }); A.hit(0, te + 0.02, 16, { wet: true, up: 3.0, big: true }); A.hit(1, te + 0.03, 16, { up: 1.5 }); A.shake(te, 0.05, 0.2);
      A.cap(0.15, 3.2, '浸：0.6 秒后喷发：16，挑飞；湿：浸湿的飞两倍高', 'Soak: it erupts 0.6 s later: 16, launched. Wet: a soaked foe flies twice as high'); } };
}
// F21 Water Prison: one slow bubble leaves the shell tip, drifts, swallows the first foe and lifts it: afloat 1.5 s; Crash: it pops, 12; the pop soaks
{ const me = [-2.2, 0.2], d0 = [0.3, 0.2]; const tc = 0.3 + 0.6, ts = tc + 0.6, tp = ts + 1.5;
  DEFS.F21 = { T: 4.0, cam: { x: -0.6, z: 0.0, w: 5.8, y: 0.7 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1], { soaked: true }], [1.1, -0.3]], seq: [[0.3, 'castBloom']], body: (t) => mixA(pawUp(t, 0.4, 1.0, 0.6), lookUp(t, ts, tp, 12)),
    fx(A) { const bAt = (t) => t < ts ? (() => { const s = A.at('tip', tc), u = EASE.s(clamp((t - tc) / 0.6)); const q = A.dpt(0, ts, 0.6); return [lerp(s.x, q.x, u), lerp(s.y, q.y, u) + 0.2 * Math.sin(u * Math.PI), lerp(s.z, q.z, u)]; })() : A.dpt(0, t, 0.6).toArray();
      A.hold(0, ts, tp, 0.7); FX.bubble(A, { t0: tc, t1: tp, at: bAt, r: (t) => t < ts ? 0.25 : 0.65, hits: [ts] }); A.tag(0, ts + 0.1, tp, ['浮空', 'Afloat'], C.foam);
      A.hit(0, tp, 19, { crash: true }); A.soak(0, tp + 0.05, 4); A.soak(1, tp + 0.05, 4);
      A.cap(0.3, tp, '泡泡封住第一个敌人：浮空 1.5 秒', 'A bubble seals the first foe: afloat 1.5 s'); A.cap(tp, 4.0, '拍：破开 12，浸湿周围', 'Crash: it pops: 12, and the pop soaks'); } };
}
// F22 Otter Dive: a nose-first arc into the floor; she swims under it up to 2 s, untouchable (a V ripple runs where she swims); she breaches in a column: 14, launched
{ const me = [-2.4, 0.3], d0 = [1.0, -0.1]; const t0 = 0.3, tin = t0 + 0.4, tout = tin + 1.2;
  DEFS.F22 = { T: 3.6, cam: { x: -0.5, z: 0.0, w: 6.6, y: 0.6 }, her: H(me[0], me[1]), dum: [[d0[0], d0[1]], [1.6, 0.6, { soaked: true }]], seq: [[t0, 'tuckAir', { loop: true, until: tout + 0.5, fade: 0.15 }]],
    root: [{ t: t0 }, { t: tin, fw: 0.9, y: -0.4, jump: 0.6, pitch: 120, e: 'lin' }, { t: tout - 0.01, x: d0[0] - 0.1, z: d0[1], y: -0.6, pitch: 120, cut: true }, { t: tout, x: d0[0] - 0.1, z: d0[1], y: -0.6, pitch: -60, cut: true }, { t: tout + 0.35, x: d0[0] - 0.4, z: d0[1], y: 1.1, pitch: -300, spin: 0, e: 'out' }, { t: tout + 0.8, x: d0[0] - 0.7, z: d0[1] + 0.1, y: 0, pitch: -360, e: 'in' }],
    hide: [[tin, tout]], body: (t) => shake(t, tout + 0.95, 0.6, 1),
    fx(A) { FX.splash(A, { t: tin, at: (t) => A.ahead(tin - 0.05, 0.3, 0), r: 0.45, h: 0.5 }); FX.ring(A, { t: tin, at: (t) => A.ahead(tin - 0.05, 0.3, 0), r0: 0.3, r1: 0.9, dur: 0.5 });
      const sw = (t) => { const u = clamp((t - tin) / (tout - tin)); const a = A.ahead(tin, 0.3, 0); return [lerp(a.x, d0[0] - 0.1, u), 0.02, lerp(a.z, d0[1], u) + 0.25 * Math.sin(u * 6)]; };
      for (let k = 0; k < 10; k++) { const tk = tin + 0.05 + k * 0.11; FX.ring(A, { t: tk, at: sw.bind(null, tk), r0: 0.15, r1: 0.6, dur: 0.6, col: C.foam, op: 0.5, w: 0.15 }); }
      FX.column(A, { t: tout, at: [d0[0] - 0.1, 0, d0[1]], h: 1.8, r: 0.4, dur: 0.6, fall: true }); A.hit(0, tout + 0.03, 14, { soak: true, up: 1.4 }); A.hit(1, tout + 0.05, 14, { wet: true, soak: true, up: 1.0 });
      A.cap(t0, 3.6, '浸：潜游地下最多 2 秒，无敌；钻出：14，挑飞', 'Soak: she swims under the floor up to 2 s, untouchable; she surfaces: 14, launched'); } };
}
// F23 River's Gift: a ribbon of water runs to a friend's weapon and winds round it; for 5 s the friend's hits soak and splash 4
{ const me = [-2.4, 0.5], al = [-0.6, 0.0], ds = [[0.3, -0.1], [0.65, 0.6]]; const tc = 0.3 + 0.44;
  DEFS.F23 = { T: 3.8, cam: { x: -0.6, z: 0.2, w: 6.0 }, her: H(me[0], me[1]), dum: [[al[0], al[1], { ally: true, face: 0 }], ...ds], seq: [[0.3, 'castPoint']], root: [{ t: 0.3, look: al }],
    fx(A) { FX.rope(A, { t0: tc - 0.05, t1: tc + 0.45, from: 'tip', to: (t) => A.dpt(0, t, 0.65), w: 0.07 }); FX.ring(A, { t: tc + 0.2, at: { d: 0, y: 0.7 }, r0: 0.3, r1: 0.42, dur: 3.2, dir: [0, 1, 0], col: C.cobalt, op: 0.6, w: 0.3 });
      [1.6, 2.4, 3.1].forEach((t, k) => { A.turn(0, t - 0.15, k % 2 ? 40 : -40, 0.15); A.hit(1, t, 8, { soak: true }); FX.splash(A, { t, at: { d: 1, y: 0 }, r: 0.4, h: 0.4 }); A.hit(2, t + 0.05, 4, { soak: true, noStop: true }); });
      A.cap(0.3, 3.8, '浸：5 秒内队友的攻击带浸湿并溅射 4', "Soak: for 5 s a friend's hits soak and splash 4"); } };
}
// F24 Tidal Dome (big): she winds up and throws the staff up: a dome closes from the floor upward, 5 s: friends inside take 25% less; foes inside are soaked and slowed. Crash: it falls in, 24
{ const me = [-0.8, 0.3], al = [-0.2, 0.9], ds = [[0.6, -0.4], [-1.7, -0.5], [2.5, 0.6]]; const t0 = 0.3, tu = t0 + 0.9, tf = 3.4;
  DEFS.F24 = { T: 4.6, cam: { x: -0.1, z: 0.1, w: 7.0 }, her: H(me[0], me[1]), dum: [[al[0], al[1], { ally: true, face: 0 }], ...ds], seq: [[t0, 'whip', { to: 0.4 }], [0.6, 'castBloom', { from: 0.3 }], [3.1, 'castPlant', { from: 0.25 }]],
    body: (t) => mixA(coil(t, 0.3, 0.75, 0.8), lookUp(t, 0.9, 1.8, 25), tailSlap(t, tf + 0.05, 0.8), shake(t, 4.0, 0.5, 0.7)),
    fx(A) { FX.dome(A, { t0: tu, t1: tf + 0.35, at: [0, 0, 0.2], r: 2.2, flat: 0.75, op: 0.45, grow: 0.5, fall: tf, hits: [2.0] });
      foeBolt(A, { t: 1.65, d: 3, dur: 0.35, to: (t) => A.dpt(0, 2.0, 0.7) }); A.hit(0, 2.0, 6, { col: '#E05A5A', noStop: true }); A.tag(0, 2.0, 2.8, ['-25%', '-25%'], C.foam);
      A.soak(1, tu + 0.3, 4); A.status(1, tu + 0.3, 'slow', 2.6); A.soak(2, tu + 0.3, 4); A.status(2, tu + 0.3, 'slow', 2.6);
      FX.ringwave(A, { t: tf + 0.25, at: [0, 0, 0.2], r0: 2.2, r1: 0.4, h: 0.9, dur: 0.35 }); FX.splash(A, { t: tf + 0.35, at: [0, 0, 0.2], r: 1.2, h: 1.0, crash: true });
      A.hit(1, tf + 0.35, 38, { crash: true }); A.hit(2, tf + 0.35, 24); A.shake(tf + 0.35, 0.07, 0.25);
      A.cap(t0, tf, '大招：水穹 5 秒：队友受伤 -25%；敌人浸湿、减速', 'Big skill: a dome, 5 s: friends inside take 25% less; foes inside soaked, slowed'); A.cap(tf, 4.6, '拍：塌下 24', 'Crash: it falls in: 24'); } };
}
// F25 Tidepool (passive): every second, 5 to the 2 nearest foes within 2.5 u; ripples at her feet
{ const me = [-0.4, 0.1], ds = [around(me, 30, 1.2), around(me, 200, 1.8), around(me, 300, 3.0)];
  DEFS.F25 = { T: 3.4, cam: { x: 0.0, z: 0.2, w: 7.2 }, her: H(me[0], me[1]), dum: ds, seq: [[0, 'idle', { loop: true, until: 3.4 }]], noAuto: true,
    fx(A) { FX.ring(A, { t: 0.05, at: [me[0], 0, me[1]], r0: 2.5, r1: 2.5, dur: 3.3, col: C.cobalt, op: 0.35, w: 0.03 });
      for (let k = 0; k < 3; k++) { const t = 0.4 + k; FX.ring(A, { t: t - 0.2, at: [me[0], 0, me[1]], r0: 0.2, r1: 1.0, dur: 0.6, col: C.foam, op: 0.5, w: 0.15 }); [0, 1].forEach((i) => { FX.jet(A, { t, from: [me[0], 0.05, me[1]], to: (tt) => A.dpt(i, tt, 0.3), dur: 0.1, hold: 0.05, w: 0.07 }); A.hit(i, t + 0.1, 5, { soak: k === 0, noStop: true }); }); }
      A.cap(0, 3.4, '被动：每秒对 2.5 u 内最近的 2 个敌人各 5', 'Passive: every second, 5 to the 2 nearest foes within 2.5 u'); } };
}
// F26 Home Waters (passive): on her own water she slides on her belly, 20% faster. 湿: soaked foes leave wet footprints (her water, 2 s)
{ const me = [-2.6, -0.2];
  DEFS.F26 = { T: 4.0, cam: { x: -0.2, z: 0.1, w: 7.0 }, her: H(me[0], me[1]), dum: [[1.6, 0.9, { soaked: 9, face: 180 }]], seq: [[0.2, 'run', { loop: true, until: 0.9 }], [0.9, 'belly', { loop: true, until: 2.4, fade: 0.15 }], [2.4, 'run', { loop: true, until: 2.9 }]],
    root: [{ t: 0.2 }, { t: 0.9, fw: 1.2, e: 'lin' }, { t: 2.4, fw: 4.0, e: 'lin' }, { t: 2.9, fw: 4.6, e: 'out' }],
    fx(A) { FX.strip(A, { t0: 0, t1: 4, from: [-1.3, 0, -0.2], to: [1.4, 0, -0.2], w: 0.9, op: 0.4, flow: 0.2 }); A.say(1.0, { zh: '+20%', en: '+20%' }, { col: C.sky });
      A.moveTo(0, 0.3, [1.6, -1.7], 3.4, 'lin'); for (let k = 0; k < 9; k++) FX.puddle(A, { t0: 0.4 + k * 0.37, t1: 0.4 + k * 0.37 + 2, at: [1.6 + (k % 2 ? 0.12 : -0.12), 0, 0.9 - (k + 0.4) * 0.3], r: 0.14, op: 0.5 });
      A.cap(0, 4.0, '被动：在自己的水上腹滑，快 20%；湿：浸湿的敌人留下湿脚印', 'Passive: on her own water she slides, 20% faster. Wet: soaked foes leave wet footprints'); } };
}

// ================================================================ shared by the style files
// a stone block on the floor (a wall or pillar to Slam foes into)
export function block(A, at, size = [0.5, 1.0, 0.5], o = {}) { const T = A.THREE; const m = A.add(new T.Mesh(new T.BoxGeometry(...size), new T.MeshLambertMaterial({ color: o.col || '#8E877D' }))); m.position.set(at[0], size[1] / 2, at[1]); if (o.yaw) m.rotation.y = o.yaw * D2R;
  (A.blocks || (A.blocks = [])).push({ x: at[0], z: at[1], hx: size[0] / 2, hz: size[2] / 2 }); // a stream ending on it is not a miss
  const top = A.add(new T.Mesh(new T.BoxGeometry(size[0] + 0.04, 0.05, size[2] + 0.04), new T.MeshLambertMaterial({ color: '#A39C91' }))); top.position.set(at[0], size[1], at[1]); if (o.yaw) top.rotation.y = o.yaw * D2R; return m; }
// a Slam on a wall: grit and a flat crack of foam where the foe meets it
export function slamFx(A, t, at, o = {}) { FX.splash(A, { t, at, r: 0.45, h: 0.6, crash: true, n: 8 }); FX.spark(A, { t, at: [at[0], 0.6, at[2]], r: 0.5, col: C.foam, op: 0.6 }); FX.dust(A, { t, at: [at[0], 0.1, at[2]], n: 6, r: 0.3 }); A.shake(t, o.a || 0.05, 0.18); }
// her held stream on dummy i (or a point), with its ticks
export function streamOn(A, t0, t1, i, o = {}) { const to = typeof i === 'number' ? (t) => A.dpt(i, t, 0.6) : i; FX.stream(A, Object.assign({ t0, t1, to, w: 0.15 }, o)); if (typeof i === 'number' && o.n !== 0) return ticks(A, i, t0 + 0.25, t1, o.n || 3, o.per || 0.2, o.hit || {}); return []; }
// the Pressure pips 水压 (Jet): 0 to 5
export const pressureHud = (fn) => gaugeHud('水压', 'Pressure', fn, { pips: 5, full: true, col: C.foam });
