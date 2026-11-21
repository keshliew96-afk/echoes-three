// A rig for a boss that is a snake: a head on a chain of joints that lies along a path. The legless rule: the part of the body
// on the floor only ever moves along its own line, so nothing slides. build.mjs uses it through CFG.makeRig.
//
// The body is baked STRAIGHT: the floor part lies along -z behind the root, at z = -(distance along the body from the anchor).
// The page (and the game) lays that straight line along the trail the Wyrm has left, so the bake never needs to know the trail.
// The anchor is the point of the body that sits at the root (0, r, 0). In front of it the body is free: the neck.
//
// A clip gives, per frame (lengths in game units u, angles in radians):
//   head {x,y,z}  where the skull's pivot is            hy hp hr   the head's yaw (+ to its left), pitch (+ nose down), roll
//   jaw   0..1 open                                     nk  0..1   how straight the neck leaves the skull (0 as sculpted, 1 straight back)
//   adv   how far the body has moved forward along its line (u): the free part is cfg.front + adv long
//   side, bow     sideways S and sideways C in the free part (u)      m   stiffness of the two ends of the neck (default 1)
//   curve (s)=>V3 an explicit line for the free part, by distance from the anchor (u), and cw 0..1 how far the neck is on it
//   ha    0..1 the head follows the line it rides instead of hy/hp/hr     roll (b)=>angle  the body rolled about its own line
//   lift (b)=>u   extra height by distance along the body from the head   lat (b)=>u   extra sideways shift
//   pitch (s, Lf)=>angle  the free part given as how steeply it climbs at each distance from the anchor (0 flat, + up, - down), with
//         swing (s)=>yaw; it is walked out from the anchor, so it is always exactly as long as the body in it. cw blends it in as for curve.
//   a0    the climb of the line where it leaves the anchor (read off the line when not given): the page bends the buried body to meet it
// adv may take the free part below nothing: front + adv < 0 puts the head itself that far back along the body's line (a head still
// under the floor before it bursts out; the page lays that line down its hole).
import * as THREE from 'three';
import { V3, FPS, clamp, lerp } from './quad.mjs';
const X = V3(1, 0, 0), Y = V3(0, 1, 0), Z = V3(0, 0, 1);
const qAx = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const basis = (s, n, t) => new THREE.Matrix4().makeBasis(s, n, t);

export function makeWyrmRig(skel, cfg) {
  const names = skel.names, C = skel.chain, U = cfg.unit, NB = C.n, STEP = C.step * U, LEN = C.end * U;
  const bind = Object.fromEntries(names.map((nm, i) => [nm, V3(...skel.pos[i])]));
  const d0 = V3(...C.dir), n0 = V3(...C.back), s0 = V3().crossVectors(n0, d0).normalize(); // bind: toward the tail, the spine side, its left
  const Bi = basis(s0, n0, d0).invert();
  const radT = C.rad; const Rm = (b) => { const x = clamp(b / U, radT[0][0], radT[radT.length - 1][0]); let i = 0; while (i < radT.length - 2 && radT[i + 1][0] < x) i++; const a = radT[i], c = radT[i + 1]; return lerp(a[1], c[1], clamp((x - a[0]) / (c[0] - a[0]))) * U; };
  const LF0 = cfg.front, REST = cfg.rest || 1.07; // how much of the body is free in front of the anchor; how high the middle rides for the skin to touch the floor
  const yc = (b) => Rm(Math.max(b, C.cut * U)) * REST;
  const headQ = (p) => qAx(Y, p.hy || 0).multiply(qAx(X, p.hp || 0)).multiply(qAx(Z, p.hr || 0));
  const hermite = (A, tA, H, tH, u) => { const u2 = u * u, u3 = u2 * u; return A.clone().multiplyScalar(2 * u3 - 3 * u2 + 1).addScaledVector(tA, u3 - 2 * u2 + u).addScaledVector(H, -2 * u3 + 3 * u2).addScaledVector(tH, u3 - u2); };
  const NS = 64;
  // the free part: from the anchor A (heading +z along the floor) to the skull's pivot H, exactly Lf long
  function solveNeck(p, Lf, A, H, tHead) {
    const chord = A.distanceTo(H); const shape = (m) => { const pts = []; for (let i = 0; i <= NS; i++) { const u = i / NS; const q = hermite(A, Z.clone().multiplyScalar(m * (p.m || 1)), H, tHead.clone().multiplyScalar(m), u); q.x += (p.side || 0) * Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u) + (p.bow || 0) * Math.sin(Math.PI * u) ** 2; pts.push(q); } return pts; };
    const len = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += pts[i].distanceTo(pts[i - 1]); return s; };
    let lo = 0.05 * chord, hi = 8 * Math.max(chord, 0.3); let pts = shape(lo); const short = len(pts) - Lf; // short > 0: the head is further than the neck is long
    if (short < 0) { for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (len(shape(m)) < Lf) lo = m; else hi = m; } pts = shape((lo + hi) / 2); }
    return { pts, miss: Math.max(0, short) };
  }
  const resample = (pts, n) => { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1])); const L = cum[cum.length - 1]; return { L, at: (s) => { s = clamp(s, 0, L); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const f = (s - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]); return pts[i - 1].clone().lerp(pts[i], f); } }; };

  function frame(clip, t) {
    const p = { head: { x: 0, y: 1.6, z: 0.5 }, hy: 0, hp: 0, hr: 0, jaw: 0, nk: 0, adv: 0, side: 0, bow: 0, cw: 0, ha: 0, ...clip.pose(t) };
    const tz = clip.travel ? clip.travel(t) : 0, sc = clip.scale ? clip.scale(t) : 1;
    const LfS = LF0 + p.adv, Lf = Math.max(0.02, LfS); const A = V3(0, yc(Lf), 0); let Qh = headQ(p); const H = V3(p.head.x, p.head.y, p.head.z);
    // the line of the free part, anchor to head, as points every DS
    const DS = 0.02; const nF = Math.max(2, Math.ceil(Lf / DS)); let line = [], miss = 0;
    if (p.cw < 1) { const tHead = lerp3(d0.clone().negate(), Z, p.nk).normalize().applyQuaternion(Qh); const sol = solveNeck(p, Lf, A, H, tHead.multiplyScalar(1)); const rs = resample(sol.pts); miss = sol.miss; for (let i = 0; i <= nF; i++) line.push(rs.at((rs.L * i) / nF)); }
    if (p.cw > 0 && (p.curve || p.pitch)) { const ex = [];
      if (p.curve) for (let i = 0; i <= nF; i++) ex.push(p.curve((Lf * i) / nF));
      else { const q = A.clone(), h = Lf / nF; ex.push(q.clone()); for (let i = 0; i < nF; i++) { const sm = (i + 0.5) * h, a = p.pitch(sm, Lf), w = p.swing ? p.swing(sm) : 0; q.x += Math.sin(w) * Math.cos(a) * h; q.y += Math.sin(a) * h; q.z += Math.cos(w) * Math.cos(a) * h; ex.push(q.clone()); } }
      line = p.cw >= 1 ? ex : line.map((q, i) => q.lerp(ex[i], p.cw)); }
    // the whole body's middle line, head first, by distance b from the skull's pivot
    const at = (b) => { const s = LfS - b; let q; if (s >= 0) { const f = clamp(s / Lf) * nF, i = Math.min(nF - 1, Math.floor(f)); q = line[i].clone().lerp(line[i + 1], f - i); if (!p.under && q.y < yc(b)) q.y = yc(b); /* a neck that sags lies on the floor, not in it */ } else q = V3(0, yc(b), s); if (p.lift) q.y += p.lift(b); if (p.lat) q.x += p.lat(b); return q; };
    // frames from the tail forward: the spine side starts up and is carried along the line without twisting
    const NBs = NB + 1, P = [], T = []; const E = 0.04;
    for (let k = 0; k <= NB; k++) { const b = Math.min(k * STEP, LEN - 0.01); P.push(at(b)); const a = at(Math.max(0, b - E)), c = at(Math.min(LEN, b + E)); T.push(c.sub(a).normalize()); } // T: toward the tail
    const Nn = new Array(NBs); let n = Y.clone(); n.addScaledVector(T[NB], -n.dot(T[NB])).normalize(); Nn[NB] = n.clone();
    for (let k = NB - 1; k >= 0; k--) { const q = new THREE.Quaternion().setFromUnitVectors(T[k + 1], T[k]); n = n.clone().applyQuaternion(q); n.addScaledVector(T[k], -n.dot(T[k])).normalize(); Nn[k] = n.clone(); }
    // the head: where the line ends. It can follow the line (ha) instead of its own angles
    if (p.ha > 0) { const fw = T[0].clone().negate(), up = Nn[0].clone(); const Qa = new THREE.Quaternion().setFromRotationMatrix(basis(V3().crossVectors(up, fw).normalize(), up, fw)); Qh = Qh.clone().slerp(Qa, p.ha); }
    // twist: the neck's spine side must meet the skull's. Spread what is missing down the free part
    const wantN = lerp3(n0, Y, p.nk).applyQuaternion(Qh); wantN.addScaledVector(T[0], -wantN.dot(T[0])).normalize();
    let tw = Math.atan2(V3().crossVectors(Nn[0], wantN).dot(T[0]), Nn[0].dot(wantN)); if (!isFinite(tw)) tw = 0;
    const S = { t, tz, sc, p, QL: {}, QW: {}, PW: {}, TL: {}, SCL: {}, toe: {}, want: {}, lock: {}, miss };
    S.PW.root = V3(); S.QW.root = new THREE.Quaternion(); S.PW.hips = bind.hips.clone(); S.QW.hips = new THREE.Quaternion(); S.QL.hips = new THREE.Quaternion();
    for (let k = 0; k < NB; k++) {
      const b = k * STEP, w = clamp(1 - b / Lf); const rl = (p.roll ? p.roll(b) : 0) + tw * w; const nn = Nn[k].clone().applyAxisAngle(T[k], rl); const ss = V3().crossVectors(nn, T[k]).normalize();
      const Q = new THREE.Quaternion().setFromRotationMatrix(basis(ss, nn, T[k]).multiply(Bi)); const nm = 'c' + k;
      S.PW[nm] = P[k].clone().divideScalar(U); S.QW[nm] = Q; S.QL[nm] = Q.clone(); S.TL[nm] = S.PW[nm].clone().sub(bind[nm]);
    }
    S.PW.head = P[0].clone().divideScalar(U); S.QW.head = Qh.clone(); S.QL.head = Qh.clone(); S.TL.head = S.PW.head.clone().sub(bind.head);
    S.QL.jaw = qAx(X, (p.jaw || 0) * (cfg.jawMax || 0.62)); S.QW.jaw = Qh.clone().multiply(S.QL.jaw); S.PW.jaw = S.PW.head.clone().add(bind.jaw.clone().sub(bind.head).applyQuaternion(Qh));
    const l1 = line[Math.min(line.length - 1, 3)].clone().sub(line[0]); S.line = { Lf: LfS, A, a0: p.a0 !== undefined ? p.a0 : Math.atan2(l1.y, Math.hypot(l1.x, l1.z)) };
    return S;
  }
  const lerp3 = (a, b, u) => a.clone().lerp(b, u);
  function sample(clip) { const nF = Math.round(clip.dur * FPS) + 1; const out = []; for (let i = 0; i < nF; i++) out.push(frame(clip, Math.min(i / FPS, clip.dur))); const worst = out.reduce((a, S) => Math.max(a, S.miss), 0); if (worst > 0.005) console.log('   neck too short by', worst.toFixed(3), 'u in', clip.name || ''); return out; }
  return { names, sample, frame, Rm, yc, LEN, STEP };
}
