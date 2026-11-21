// Page side of every clip: where she stands, her body clips in time, her root moves, the dummies, the bells and the effects.
import { FX, C, EASE, clamp, lerp, bellRadius, softTex } from './bw.js';
import { rock, rockSlow, baton, beat, conduct, listen, flare, clap, nod, crouch, onToes, turnTrunk, lookUp, antFlick, antQuiver, antDroop, antUp, antCurl, knock, toss, pawOut, tapTime, shove, floorCircle, mixA } from './poses.js';
export { rock, rockSlow, baton, beat, conduct, listen, flare, clap, nod, crouch, onToes, turnTrunk, lookUp, antFlick, antQuiver, antDroop, antUp, antCurl, knock, toss, pawOut, tapTime, shove, floorCircle, mixA };
export { FX, C, EASE, clamp, lerp };
export const H = (x = -2.2, z = 0, face = 90) => ({ x, z, face });
export const DEFS = {};
export const FORMS = { ar: {}, re: {}, ha: {} };
export const D2R = Math.PI / 180;
export const font = (k, px, w = 700) => `${w} ${Math.round(px * k)}px Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`;
export const around = (p, deg, r = 0.62) => [p[0] + Math.cos(deg * D2R) * r, p[1] - Math.sin(deg * D2R) * r];
export const fan = (n, r, deg0, deg1, cx = 0, cz = 0) => Array.from({ length: n }, (_, i) => around([cx, cz], lerp(deg0, deg1, n > 1 ? i / (n - 1) : 0.5), r));
export const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const beatsOf = (t0, t1, per = 1) => { const o = []; for (let t = t0; t <= t1 + 1e-6; t += per) o.push(+t.toFixed(3)); return o; };
// the three bells and the chime (kit R7), the Bourdon (T1): height on the page, ring, toll, slow
export const KB = { bell: { kind: 'small', h: 0.54, r: 1.3, n: 7 }, great: { kind: 'small', h: 0.78, r: 1.9, n: 12 }, chime: { kind: 'small', h: 0.3, r: 1.0, n: 5 }, bourdon: { kind: 'great', h: 1.05, r: 2.0, n: 14, tint: '#B89468' } };
const XZ = (A, at, t) => { if (typeof at === 'function') { const v = at(t); return v.isVector3 ? [v.x, v.z] : [v[0], v[v.length - 1]]; } return at; };
// a toll: a floor ring out to the bell's ring and a note at its crown (the Bourdon: two rings, bronze and a verdigris lip)
export function tollFx(A, t, at, R, o = {}) {
  FX.ring(A, { t, at: [at[0], 0.02, at[1]], r0: R * 0.25, r1: R, dur: o.dur || 0.34, col: o.col || C.brass, op: o.op || 0.7, w: 0.09 });
  if (o.double) FX.ring(A, { t: t + 0.05, at: [at[0], 0.02, at[1]], r0: R * 0.25, r1: R * 0.9, dur: 0.34, col: C.verd, op: 0.5, w: 0.07 });
  if (o.echo || o.reverb) FX.ring(A, { t: t + 0.09, at: [at[0], 0.02, at[1]], r0: R * 0.2, r1: R * 0.95, dur: 0.4, col: o.col || C.brass, op: 0.28, w: 0.06 });
  if (o.harm) FX.ring(A, { t: t + 0.02, at: [at[0], 0.02, at[1]], r0: R * 0.22, r1: R * 0.93, dur: 0.34, col: C.verd, op: 0.55, w: 0.06 });
  FX.note(A, { t, at: [at[0], (o.top || 0.45) + 0.05, at[1]], r0: 0.06, r1: o.big ? 0.6 : 0.34, col: o.col || C.brass, op: 0.6 });
}
// foes within r of a spot at time t
export const inRing = (A, at, r, t, list) => (list || A.card.dum.map((d) => d.i)).filter((i) => { const d = A.card.dum[i]; if (d.opt.ally) return false; const p = A.dpos(i, t); return Math.hypot(p.x - at[0], p.z - at[1]) <= r + 0.25 * d.m.s / 0.82; });
export const friendsIn = (A, at, r, t) => A.card.dum.filter((d) => d.opt.ally).map((d) => d.i).filter((i) => { const p = A.dpos(i, t); return Math.hypot(p.x - at[0], p.z - at[1]) <= r; });
// a hung bell standing on the floor: it lands (or drops in), tolls on its beats on the foes in its ring, and fades at t1.
// o: kind, at [x, z] or fn, t0, t1, beats, n, foes (list or all), drop, fade, h, r, style (ar / re / ha: how its tolls look and what they do), off (Harmony: Off-key), quiet
export function hang(A, o) {
  const K = KB[o.kind || 'bell'], h = o.h || K.h, R = o.r || K.r, n = o.n != null ? o.n : K.n, st = o.style || '';
  const atF = (t) => XZ(A, o.at, t);
  FX.bell(A, { kind: K.kind, h, floor: (t) => atF(t), t0: o.t0 - (o.drop ? 0.28 : 0), t1: o.t1, drop: o.drop ? 0.28 : 0, dropH: o.dropH, strikes: (o.beats || []).concat(o.strikes || []), tint: K.tint, op: o.op, fade: o.fade, rot: o.rot, lift: o.lift, fin: o.fin, fout: o.fout, glow: o.glow, rock: o.rock });
  if (!o.noLand) { const p = atF(o.t0); FX.dust(A, { t: o.t0, at: [p[0], 0.02, p[1]], n: o.kind === 'bourdon' ? 10 : 5, sp: 0.7, dur: 0.4, col: '#9C8E78', seed: Math.floor(o.t0 * 71) });
    FX.ring(A, { t: o.t0, at: [p[0], 0.02, p[1]], r0: 0.1, r1: R * 0.5, dur: 0.3, col: C.parch, op: 0.4, w: 0.12 }); if (o.kind === 'bourdon' || o.drop) A.shake(o.t0, o.kind === 'bourdon' ? 0.06 : 0.035, 0.2); }
  for (const b of o.beats || []) { const p = atF(b); tollFx(A, b, p, R, { double: o.kind === 'bourdon', top: h, reverb: st === 're', harm: st === 'ha' });
    if (!o.quiet) for (const i of inRing(A, p, R, b, o.foes)) A.hit(i, b, n, { ring: true, noStop: true, small: true, off: st === 'ha' ? (o.offDur || 4) : 0 });
    if (st === 'ha') for (const i of friendsIn(A, p, R, b)) A.tune(i, b, 4); }
  return { at: atF, R, h, t0: o.t0, t1: o.t1 };
}
// a beat on her own back bell: a soft verdigris note and the antennae (the card adds antFlick to her body)
export function beatFx(A, beats, o = {}) { for (const b of beats) { FX.note(A, { t: b, at: 'bellc', r0: 0.04, r1: 0.22, col: C.verd, op: o.op || 0.5, dur: 0.35 }); } }
// a Note sent at a point: a brass ball with a pale trail, little rings behind it
export function noteBolt(A, o) { const d = o.dur || 0.22; FX.bolt(A, Object.assign({ splash: false, col: o.col || C.brass, r: o.r || 0.07, dur: d, len: 0.1 }, o));
  FX.note(A, { t: o.t, at: o.from || 'tip', r0: 0.04, r1: 0.25, col: o.col || C.brass, op: 0.6 }); }
// the passed bell shot (basic hits 1 and 2): a small faded bell flies from the mallet, rises, grows 2.5 times, turns solid and falls: a Strike within 1 u
// returns the time it lands. o: t (the tap), to [x, z] (where it stops: a foe or its range), n, foes, keep (Bell Array: it stays as a chime 3 s)
export function shotBell(A, o) {
  const t = o.t, TF = 0.24, TR = 0.34, TH = 0.1, TL = 0.09, h0 = 0.14, ts = t + TF + TR + TH + TL; const p0 = A.at('tip', t); const to = o.to;
  const pos = (tt) => { const a = tt - t; if (a < TF) { const u = 1 - (1 - a / TF) ** 2; return [lerp(p0.x, to[0], u), lerp(p0.y, 0.45, u), lerp(p0.z, to[1], u)]; }
    if (a < TF + TR + TH) { const u = EASE.s(Math.min(1, (a - TF) / TR)); return [to[0], 0.45 + 0.62 * u, to[1]]; }
    const u = clamp((a - TF - TR - TH) / TL); return [to[0], lerp(1.07, h0 * 2.5 / 2, u * u), to[1]]; };
  const hh = (tt) => { const a = tt - t; if (a < TF) return h0; if (a < TF + TR + TH) return h0 * (1 + 1.5 * EASE.s(Math.min(1, (a - TF) / TR))); return h0 * 2.5; };
  FX.bell(A, { t0: t - 0.08, t1: ts + (o.keep ? 3 : 0.4), h: hh, at: (tt) => pos(tt), op: (tt) => { const a = tt - t; return a < TF ? 0.4 : a < TF + TR ? 0.4 + 0.6 * EASE.s((a - TF) / TR) : 1; }, rot: (tt) => { const a = tt - t; return [a < TF ? -50 * Math.sin(Math.PI * Math.min(1, a / TF * 1.2)) : 0, 0, 0]; }, fin: 0.08, fout: 0.25, strikes: [ts].concat(o.keep ? o.keepBeats || [] : []), noShadow: false, glow: (tt) => tt < t + TF ? 0.3 : 0 });
  FX.note(A, { t, at: 'tip', r0: 0.04, r1: 0.22, col: C.brass, op: 0.5 });
  FX.ring(A, { t: ts, at: [to[0], 0.02, to[1]], r0: 0.2, r1: 1.0, dur: 0.5, col: C.brass, op: 0.55, w: 0.1 }); FX.ring(A, { t: ts, at: [to[0], 0.02, to[1]], r0: 0.1, r1: 0.6, dur: 0.45, col: C.verd, op: 0.35, w: 0.08 });
  FX.dust(A, { t: ts, at: [to[0], 0.02, to[1]], n: 8, sp: 0.8, dur: 0.45, seed: Math.floor(ts * 53) }); A.shake(ts, 0.03, 0.15);
  if (!o.quiet) for (const i of inRing(A, to, 1.0, ts, o.foes)) A.hit(i, ts, o.n || 8, { ring: true, strike: true });
  return ts;
}
// the passed great bell of hit 3: it appears on its side before her, she drums it (three waves of 3) and gives it the great stroke (8), Notes in an 80° fan, 3 u.
// o: t0 (when it appears), waves [t, t, t], big t, yaw (deg, world), arc, r, foes, stand (pick 2: it stands up after and hangs 5 s), style
export function drumBell(A, o) {
  const r = A.rootAt(o.t0), f = [Math.sin(r.yaw), Math.cos(r.yaw)], L = [Math.cos(r.yaw), -Math.sin(r.yaw)];
  const c = [r.x + f[0] * 0.62 - L[0] * 0.2, r.z + f[1] * 0.62 - L[1] * 0.2], yawD = r.yaw / D2R, H0 = 0.58, standT = o.big + 0.35, end = o.stand ? standT + 0.3 + (o.hangFor || 5) : o.big + 0.5;
  const mouth = [c[0] + f[0] * 0.3, c[1] + f[1] * 0.3];
  FX.bell(A, { t0: o.t0, t1: end, h: H0, fin: 0.18, at: (t) => { const u = o.stand ? EASE.s(clamp((t - standT) / 0.3)) : 0; return [c[0], lerp(0.3, H0 / 2, u), c[1]]; },
    rot: (t) => { const u = o.stand ? EASE.back(clamp((t - standT) / 0.3)) : 0; let kick = 0; for (const w of o.waves.concat([o.big])) { const a = t - w; if (a >= 0 && a < 0.3) kick += (w === o.big ? 10 : 4) * Math.exp(-a * 14); } return [lerp(-98, 0, u) + kick, yawD, 0]; },
    strikes: o.stand ? (o.beats || []) : [], op: o.op });
  const arc = o.arc || 80, R = o.r || 3, all = o.foes;
  o.waves.forEach((w, k) => { FX.arcs(A, { t: w, at: [mouth[0], 0.03, mouth[1]], yaw: arc >= 360 ? 0 : yawD, arc, r: R * 0.75, dur: 0.5, op: 0.45, col: C.brass }); FX.note(A, { t: w, at: [mouth[0], 0.3, mouth[1]], r0: 0.1, r1: 0.4, col: C.brass, op: 0.45 });
    if (!o.quiet) for (const i of inFan(A, arc >= 360 ? [r.x, r.z] : mouth, yawD, arc, R, w + 0.12, all)) A.hit(i, w + 0.12, o.wn || 3, { note: true, noStop: true, small: true }); });
  FX.arcs(A, { t: o.big, at: [mouth[0], 0.03, mouth[1]], yaw: arc >= 360 ? 0 : yawD, arc, r: R, dur: 0.6, op: 0.7, n: 3, gap: 0.07, col: C.brass }); FX.arcs(A, { t: o.big + 0.04, at: [mouth[0], 0.03, mouth[1]], yaw: arc >= 360 ? 0 : yawD, arc, r: R * 0.85, dur: 0.6, op: 0.4, col: C.verd });
  FX.note(A, { t: o.big, at: [mouth[0], 0.3, mouth[1]], r0: 0.15, r1: 0.75, col: C.brass, op: 0.6 }); FX.note(A, { t: o.big, at: 'bellc', r0: 0.05, r1: 0.3, col: C.verd, op: 0.45 }); A.shake(o.big, 0.04, 0.2);
  if (!o.quiet) for (const i of inFan(A, arc >= 360 ? [r.x, r.z] : mouth, yawD, arc, R, o.big + 0.12, all)) A.hit(i, o.big + 0.12, o.bn || 8, Object.assign({ note: true }, o.bigHit || {}));
  if (o.stand) { FX.dust(A, { t: standT + 0.3, at: [c[0], 0.02, c[1]], n: 6, sp: 0.6, dur: 0.4 }); for (const b of o.beats || []) { tollFx(A, b, c, 1.3, { top: H0 }); for (const i of inRing(A, c, 1.3, b, all)) A.hit(i, b, 7, { ring: true, noStop: true, small: true }); } }
  return { c, mouth, yawD };
}
export function inFan(A, at, yawD, arc, R, t, list) { return (list || A.card.dum.map((d) => d.i)).filter((i) => { const d = A.card.dum[i]; if (d.opt.ally) return false; const p = A.dpos(i, t); const dx = p.x - at[0], dz = p.z - at[1], L = Math.hypot(dx, dz); if (L > R + 0.2) return false; if (arc >= 360) return true; const a = Math.atan2(dx, dz) / D2R - yawD; const aa = ((a + 540) % 360) - 180; return Math.abs(aa) <= arc / 2 + 8; }); }
// a ward 护 on a friend: a thin verdigris shell with its number
export function ward(A, i, t0, t1, n, o = {}) { const dm = A.card.dum[i], s = dm.m.s / 0.82; FX.bubble(A, Object.assign({ t0, t1, at: (t) => { const p = A.dpos(i, t); return [p.x, p.y + 0.62 * s, p.z]; }, r: 0.6 * s, col: C.verd, op: 0.5, pop: false }, o));
  A.tag(i, t0 + 0.1, t1, (t, lang) => { const v = typeof n === 'function' ? n(t) : n; return v > 0 ? (lang === 'zh' ? '护 ' : 'Ward ') + v : null; }, C.verd); }
// a held foe 困
export const held = (A, i, t0, t1) => A.tag(i, t0, t1, ['困', 'Held'], C.stun);
// the pips over her head: lit count n(t) of max, coloured by the coming Chord
export const CHORD = { forte: [C.brass, '强音', 'Forte'], vib: [C.pale, '颤音', 'Vibrato'], dim: [C.verd, '弱音', 'Diminuendo'] };
export function pipsHud(A, fn, o = {}) { const max = o.max || 3; A.hud((t, x, W, H2, k, lang) => { const v = fn(t); if (v == null) return; const p = A.at('head', t).clone(); p.y += 0.72; p.project(A.cam); const cx = (p.x + 1) / 2 * W, cy = (1 - p.y) / 2 * H2;
  const col = typeof o.col === 'function' ? o.col(t) : (o.col || C.brass); for (let i = 0; i < max; i++) { const on = v >= i + 1, px = cx + (i - (max - 1) / 2) * 15 * k; x.beginPath(); x.arc(px, cy, 5 * k, 0, 6.283); x.fillStyle = on ? col : 'rgba(20,18,14,0.75)'; x.fill(); x.lineWidth = 1.5 * k; x.strokeStyle = on ? C.pale : 'rgba(245,208,107,0.5)'; x.stroke(); }
  const ch = o.chord ? o.chord(t) : null; if (ch) { x.font = font(k, 12, 700); x.textAlign = 'center'; const s = lang === 'zh' ? CHORD[ch][1] : CHORD[ch][2]; x.lineWidth = 3 * k; x.strokeStyle = 'rgba(14,12,8,0.85)'; x.strokeText(s, cx, cy - 10 * k); x.fillStyle = CHORD[ch][0]; x.fillText(s, cx, cy - 10 * k); } }); }
// a small clock face of knocks over a marked foe (Deathwatch): n of max ticks lit
export function knockHud(A, i, t0, t1, fn, max = 3) { A.hud((t, x, W, H2, k) => { if (t < t0 || t > t1) return; const dm = A.card.dum[i]; const p = A.dpos(i, t); const v = new A.THREE.Vector3(p.x, p.y + dm.m.h + 0.38, p.z).project(A.cam); const cx = (v.x + 1) / 2 * W, cy = (1 - v.y) / 2 * H2, n = fn(t);
  x.beginPath(); x.arc(cx, cy, 11 * k, 0, 6.283); x.fillStyle = 'rgba(14,12,8,0.8)'; x.fill(); x.lineWidth = 1.6 * k; x.strokeStyle = C.brass; x.stroke(); for (let q = 0; q < max; q++) { const a = -Math.PI / 2 + q * 6.283 / max; x.beginPath(); x.arc(cx + Math.cos(a) * 6 * k, cy + Math.sin(a) * 6 * k, 2.4 * k, 0, 6.283); x.fillStyle = q < n ? C.brass : 'rgba(245,208,107,0.25)'; x.fill(); } }); }
// a gauge, bottom left
export const gaugeHud = (zh, en, fn, o = {}) => (t, x, W, H2, k, lang) => { const v = fn(t); if (v == null) return; const w = 170 * k, h = 12 * k, cx = 14 * k, cy = H2 - 30 * k;
  x.font = font(k, 12, 600); x.textAlign = 'left'; x.fillStyle = C.parch; x.fillText(lang === 'zh' ? zh : en, cx, cy - 6 * k); x.fillStyle = 'rgba(14,12,8,0.8)'; x.fillRect(cx, cy, w, h);
  if (o.pips) { for (let i = 0; i < o.pips; i++) { const on = v * o.pips >= i + 1 - 1e-6; x.fillStyle = on ? (o.col || C.brass) : 'rgba(245,208,107,0.15)'; x.fillRect(cx + 2 * k + i * (w - 4 * k) / o.pips, cy + 2 * k, (w - 4 * k) / o.pips - 3 * k, h - 4 * k); } }
  else { x.fillStyle = o.col || C.brass; x.fillRect(cx + 2 * k, cy + 2 * k, (w - 4 * k) * clamp(v), h - 4 * k); } };
// a foe's bolt (Foe Crimson)
export function foeBolt(A, o) { const T = A.THREE; const m = A.add(new T.Mesh(A.streakGeo, A.mat('#B8141F', A.F.STREAK))); m.visible = false;
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.4; const on = a >= 0 && a <= (o.stop != null ? o.stop : d); m.visible = on; if (!on) return; const p0 = A.dpt(o.d, o.t, 0.75), p1 = typeof o.to === 'function' ? o.to(o.t + d) : new T.Vector3(...o.to); const p = p0.clone().lerp(p1, a / d), q = p0.clone().lerp(p1, Math.max(0, a / d - 0.18));
    m.position.copy(q); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), p.clone().sub(q).normalize()); m.scale.set(0.12, 0.12, p.distanceTo(q) + 1e-3); m.material.uniforms.op.value = 0.95; }); }
// a foe's swing at a target (a red arc flash at the foe)
export function foeSwing(A, i, t, toward) { const p = A.dpos(i, t); const yaw = Math.atan2(toward[0] - p.x, toward[1] - p.z) / D2R; FX.arcs(A, { t, at: [p.x, 0.5, p.z], y: 0.5, yaw, arc: 90, r: 0.8, dur: 0.25, col: C.foe, op: 0.8 }); }
// ticks: a hit every `per` s
export function ticks(A, i, t0, t1, n, per = 0.5, o = {}) { const out = []; for (let t = t0; t <= t1 + 1e-6; t += per) { A.hit(i, t, n, Object.assign({ noStop: true, small: true }, o)); out.push(t); } return out; }
// Lulled 入静 (kit 1.2, Vesper Chime): 30% slower to move and attack; a slow ring and a pale tag
export const lull = (A, i, t0, t1, k = 30) => { A.status(i, t0, 'slow', t1 - t0); A.tag(i, t0, t1, ['入静 −' + k + '%', 'Lulled −' + k + '%'], C.pale); };
// a friend's swing at a foe: a verdigris arc and its number
export const friendSwing = (A, i, t, foe, n, o = {}) => { const p = A.dpos(i, t), q = A.dpos(foe, t); const yaw = Math.atan2(q.x - p.x, q.z - p.z) / D2R; FX.arcs(A, { t, at: [p.x, 0.5, p.z], y: 0.5, yaw, arc: 90, r: 0.8, dur: 0.25, col: C.verd, op: 0.8 }); if (n != null) A.hit(foe, t + 0.08, n, o); };
// the soloist: a brass ring at the friend's feet and a countdown tag
export const soloOn = (A, i, t0, t1, zh = '独奏 +30%', en = 'Solo +30%') => { FX.ring(A, { t: t0, at: (t) => A.dpt(i, t, 0.02), follow: true, r0: 0.55, r1: 0.6, dur: t1 - t0, col: C.brass, op: 0.7, w: 0.08 }); A.tag(i, t0, t1, (t, lang) => (lang === 'zh' ? zh : en) + ' · ' + Math.max(0, t1 - t).toFixed(1) + ' s', C.brass); };
