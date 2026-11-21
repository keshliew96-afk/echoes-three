// Biped champion kit (from the boss kit's quad.mjs): key curves, a spine chain, two legs of three bones (thigh, shin,
// foot) solved so a planted foot never slides, arms and a weapon by channels, a weapon or cloth that can hold a
// direction in the room whatever the arm does,
// springs for ears and tail, and a sampler that turns a clip into 60 frames a second of joint rotations.
import * as THREE from 'three';
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const X = V3(1, 0, 0), Y = V3(0, 1, 0), Z = V3(0, 0, 1);
export const FPS = 60;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, u) => a + (b - a) * u;
export const frac = (x) => x - Math.floor(x);
export const EASE = {
  lin: (x) => x, io: smooth, in: (x) => x * x, out: (x) => 1 - (1 - x) * (1 - x), in3: (x) => x * x * x,
  out3: (x) => 1 - (1 - x) ** 3, snap: (x) => 1 - (1 - x) ** 4, hold: () => 0,
  back: (x) => { const s = 1.70158, y = x - 1; return y * y * ((s + 1) * y + s) + 1; },
};
// keys: [[time, pose, ease?]]. Channels flow through the keys on a monotone cubic (no stop at every key);
// a key with an ease name makes the segment arriving at it use that ease instead (strikes, holds).
export function track(keys) {
  const chans = new Set(); keys.forEach((k) => Object.keys(k[1]).forEach((c) => chans.add(c)));
  const T = keys.map((k) => k[0]); const n = T.length; const data = {};
  for (const c of chans) {
    const v = keys.map((k) => k[1][c] ?? 0); const d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((v[i + 1] - v[i]) / (T[i + 1] - T[i]));
    for (let i = 1; i < n - 1; i++) if (d[i - 1] * d[i] > 0) { const h0 = T[i] - T[i - 1], h1 = T[i + 1] - T[i]; const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    data[c] = { v, m };
  }
  return (t) => {
    const o = {}; let i = 0; if (t >= T[n - 1]) i = n - 2; else while (i < n - 2 && t >= T[i + 1]) i++;
    const h = T[i + 1] - T[i]; const u = clamp((t - T[i]) / h); const e = keys[i + 1][2];
    for (const c of chans) {
      const { v, m } = data[c];
      if (e) o[c] = v[i] + (v[i + 1] - v[i]) * EASE[e](u);
      else { const u2 = u * u, u3 = u2 * u; o[c] = (2 * u3 - 3 * u2 + 1) * v[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * v[i + 1] + (u3 - u2) * h * m[i + 1]; }
    }
    return o;
  };
}
export const addPose = (...ps) => { const o = {}; for (const p of ps) for (const k in p) o[k] = (o[k] || 0) + p[k]; return o; };
// pitch + nose up, yaw + turn to its left (+x), roll + left side up
const qPYR = (p = 0, y = 0, r = 0) => new THREE.Quaternion().setFromAxisAngle(Y, y).multiply(new THREE.Quaternion().setFromAxisAngle(X, -p)).multiply(new THREE.Quaternion().setFromAxisAngle(Z, r));
const sAngle = (a, b, n) => Math.atan2(n.dot(V3().crossVectors(a, b)), a.dot(b));
const rotAbout = (v, n, a) => v.clone().applyAxisAngle(n, a);
function basis(d, n) { const nn = n.clone().addScaledVector(d, -n.dot(d)); if (nn.lengthSq() < 1e-8) nn.set(1, 0, 0).addScaledVector(d, -d.x); nn.normalize(); return new THREE.Matrix4().makeBasis(nn, d, V3().crossVectors(nn, d)); }
function ik2(A, C, l1, l2, n, f) {
  const dv = C.clone().sub(A); let d = dv.length(); const dir = dv.clone().normalize();
  const dc = clamp(d, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-5);
  const ca = (l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc); const sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  const perp = V3().crossVectors(n, dir).normalize(); if (perp.dot(f) < 0) perp.negate();
  const mid = A.clone().addScaledVector(dir, l1 * ca).addScaledVector(perp, l1 * sa);
  const end = A.clone().addScaledVector(dir, dc);
  return { mid, end, over: d - dc };
}

export function makeRig(skel, cfg) {
  const names = skel.names, N = names.length; const ix = Object.fromEntries(names.map((n, i) => [n, i]));
  const P0 = Object.fromEntries(names.map((n, i) => [n, V3(...skel.pos[i])]));
  const END = Object.fromEntries(Object.entries(skel.ends).map(([k, v]) => [k, V3(...v)]));
  const par = Object.fromEntries(names.map((n, i) => [n, skel.parents[i]]));
  const chain = cfg.chain; // [[bone, channel prefix]]
  const legs = cfg.legs;   // {FL:{kind:'front',b:[upper,fore,cannon,hoof]}, ...}
  const restToe = Object.fromEntries(Object.entries(legs).map(([k, L]) => [k, END[L.b[L.b.length - 1]].clone()]));
  const restBasis = {};
  for (const L of Object.values(legs)) L.b.forEach((b, i) => { const child = i < L.b.length - 1 ? P0[L.b[i + 1]] : END[b]; restBasis[b] = basis(child.clone().sub(P0[b]).normalize(), X).transpose(); });

  const armBasis = {};
  // an arm is [upper, fore, hand]; an arm with no hand bone ends at its forearm's end point
  const armTip = (A) => P0[A.b[2]] || END[A.b[1]];
  for (const A of Object.values(cfg.arms || {})) for (let i = 0; i < 2; i++) armBasis[A.b[i]] = basis((i ? armTip(A) : P0[A.b[1]]).clone().sub(P0[A.b[i]]).normalize(), X).transpose();
  // One pose. p: channel values; feet: {FL:{p:Vector3 (toe, root space), pitch, yaw, q}}. Returns world and local transforms.
  function solve(p, feet) {
    const PW = {}, QW = {}, QL = {};
    PW.root = V3(); QW.root = new THREE.Quaternion();
    chain.forEach(([b, c], i) => {
      QL[b] = qPYR(p[c + 'p'], p[c + 'y'], p[c + 'r']);
      QW[b] = QW[par[b]].clone().multiply(QL[b]);
      PW[b] = PW[par[b]].clone().add(P0[b].clone().sub(P0[par[b]]).applyQuaternion(QW[par[b]]));
      if (i === 0) PW[b].add(V3(p.ox || 0, p.oy || 0, p.oz || 0));
    });
    // an arm may reach for a point: channels prefix + W (0..1), x, y, z (the wrist, root space) and ex, ey, ez (where the elbow points)
    const armOf = {}; for (const [k, A] of Object.entries(cfg.arms || {})) { armOf[A.b[0]] = [k, A, 0]; armOf[A.b[1]] = [k, A, 1]; }
    const armIK = {};
    // a hand may be closed on a part (a staff held in both hands): cfg.grips {A: {on: 'staff'}} puts arm A's wrist where the part carries it
    // and gives the hand the part's turn; the channel A + 'G' (default 1) lets go. The part must come before the arm in cfg.extras.
    // A grip with an axis (the part's long way in the rest model, a unit vector) lets the hand slide along it: channel A + 'Gs'.
    const gripW = (k) => (cfg.grips && cfg.grips[k] ? clamp(p[k + 'G'] ?? 1) : 0);
    const gripHand = {}; for (const [k, A] of Object.entries(cfg.arms || {})) if (gripW(k) && A.b[2]) gripHand[A.b[2]] = cfg.grips[k].on;
    const early = new Set(Object.values(cfg.grips || {}).map((G) => G.on)); const TLx = {};
    const leave = (b, c) => {
      if (p[c + 'b']) { const o = V3(0, p[c + 'b'], 0); TLx[b] = o; PW[b].add(o.clone().applyQuaternion(QW[par[b]])); }
      if (typeof c !== 'function' && p[c + 'T']) { const at = PW[b].clone(); const tgt = at.clone().multiplyScalar(1 - clamp(p[c + 'Ta'] || 0)).add(V3(p[c + 'Tx'] || 0, p[c + 'Ty'] || 0, p[c + 'Tz'] || 0)); const pos = at.clone().lerp(tgt, clamp(p[c + 'T'])); TLx[b] = (TLx[b] || V3()).add(pos.clone().sub(at).applyQuaternion(QW[par[b]].clone().invert())); PW[b] = pos; }
    };
    for (const [b, c] of cfg.extras) {
      if (armOf[b] && (p[armOf[b][0] + 'W'] || gripW(armOf[b][0]))) {
        const [k, A, i] = armOf[b]; const gw = gripW(k); const w = gw ? 1 : clamp(p[k + 'W']); const [ub, fb, hb] = A.b;
        PW[b] = PW[par[b]].clone().add(P0[b].clone().sub(P0[par[b]]).applyQuaternion(QW[par[b]]));
        const fk = QW[par[b]].clone().multiply(qPYR(p[c + 'p'], p[c + 'y'], p[c + 'r']));
        if (i === 0) {
          const G = gw ? cfg.grips[k] : null;
          const T = G ? PW[G.on].clone().add(P0[hb].clone().sub(P0[G.on]).add(G.axis ? V3(...G.axis).multiplyScalar(p[k + 'Gs'] || 0) : V3()).applyQuaternion(QW[G.on])) : V3(p[k + 'x'] || 0, p[k + 'y'] || 0, p[k + 'z'] || 0); const pole = V3(p[k + 'ex'] ?? A.pole[0], p[k + 'ey'] ?? A.pole[1], p[k + 'ez'] ?? A.pole[2]).normalize();
          const l1 = P0[ub].distanceTo(P0[fb]), l2 = P0[fb].distanceTo(armTip(A)); const dir = T.clone().sub(PW[b]).normalize();
          let n = V3().crossVectors(dir, pole); if (n.lengthSq() < 1e-8) n = X.clone(); n.normalize();   // the arm's own side axis: with the elbow behind a hanging arm this is +x, as in the rest pose (no twist)
          const r = ik2(PW[b], T, l1, l2, n, pole); armIK[k] = { mid: r.mid, end: r.end, n, over: r.over };
          QW[b] = fk.slerp(new THREE.Quaternion().setFromRotationMatrix(basis(r.mid.clone().sub(PW[b]).normalize(), n).multiply(armBasis[ub])), w);
        } else {
          const r = armIK[k]; QW[b] = fk.slerp(new THREE.Quaternion().setFromRotationMatrix(basis(r.end.clone().sub(r.mid).normalize(), r.n).multiply(armBasis[fb])), w);
        }
        QL[b] = QW[par[b]].clone().invert().multiply(QW[b]); continue;
      }
      // an extra is driven by three channels (prefix + p, y, r) or by its own function of the pose (a wing, a feather)
      QL[b] = typeof c === 'function' ? c(p) : qPYR(p[c + 'p'], p[c + 'y'], p[c + 'r']); QW[b] = QW[par[b]].clone().multiply(QL[b]);
      // a part may hold a direction in the room: channels prefix + W (0..1), Wp, Wy, Wr give its turn from the rest pose in root space
      if (typeof c !== 'function' && p[c + 'W']) { QW[b].slerp(qPYR(p[c + 'Wp'], p[c + 'Wy'], p[c + 'Wr']), clamp(p[c + 'W'])); QL[b] = QW[par[b]].clone().invert().multiply(QW[b]); }
      PW[b] = PW[par[b]].clone().add(P0[b].clone().sub(P0[par[b]]).applyQuaternion(QW[par[b]]));
      if (gripHand[b]) { QW[b] = QW[gripHand[b]].clone(); QL[b] = QW[par[b]].clone().invert().multiply(QW[b]); }
      if (early.has(b)) leave(b, c);
    }
    // a hanging part (weed, a chain) keeps pointing down whatever its parent does: g 1 hangs free, 0 follows the parent;
    // the pose channel stiff (0..1) lets it follow its parent after all, e.g. when it lies on the floor
    for (const [b, g0] of cfg.hang || []) { const g = g0 * (1 - clamp(p.stiff || 0)); const pq = QW[par[b]]; const c = (cfg.extras.find((e) => e[0] === b) || [])[1]; QW[b] = pq.clone().slerp(new THREE.Quaternion(), g); if (typeof c === 'string') QW[b].multiply(qPYR(p[c + 'p'], p[c + 'y'], p[c + 'r'])); QL[b] = pq.clone().invert().multiply(QW[b]); }
    const armW = (k) => Math.max(clamp(p[k + 'W']), gripW(k));
    for (const [b, c] of cfg.extras) if (!early.has(b)) leave(b, c);
    const out = { PW, QW, QL, toe: {}, over: {}, want: {}, lock: {}, TL: TLx, armOver: Math.max(0, ...Object.entries(armIK).map(([k, a]) => a.over * armW(k))) };   // how far a reaching hand fell short of its point
    out.SCL = {}; for (const [b, c] of cfg.scales || []) out.SCL[b] = 1 + (p[c] || 0);
    out.legRoot = (k) => { const L = legs[k], pb = par[L.b[0]]; return PW[pb].clone().add(P0[L.b[0]].clone().sub(P0[pb]).applyQuaternion(QW[pb])); };
    out.loc = (k, v) => out.legRoot(k).add(V3(...v).applyQuaternion(QW[par[legs[k].b[0]]]));
    out.parQ = (k) => QW[par[legs[k].b[0]]].clone();
    if (!feet) return out;
    const F = typeof feet === 'function' ? feet(out) : feet;
    for (const [k, L] of Object.entries(legs)) {
      const tg = F[k]; const pb = par[L.b[0]]; const Qp = QW[pb];
      const xb = X.clone().applyQuaternion(Qp), zb = Z.clone().applyQuaternion(Qp);
      const bodyYaw = Math.atan2(zb.x, zb.z);
      const fq = tg.q ? tg.q.clone() : new THREE.Quaternion().setFromAxisAngle(Y, tg.yaw ?? bodyYaw);
      if (L.kind === 'biped') {
        const [t0, t1, t2] = L.b; const H0 = P0[t0], Kn0 = P0[t1], An0 = P0[t2], To0 = END[t2]; const Rj = out.legRoot(k);
        const T = tg.p.clone(); const floor = cfg.floor !== false && !tg.under; if (!tg.lock && floor && T.y < 0.002) T.y = 0.002;
        const l1 = H0.distanceTo(Kn0), l2 = Kn0.distanceTo(An0); const xf = X.clone().applyQuaternion(fq), zf = Z.clone().applyQuaternion(fq);
        const leg = (pitch) => {
          const hv = To0.clone().sub(An0).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(X, pitch)).applyQuaternion(fq);
          let An = T.clone().sub(hv); const up = Rj.clone().sub(An).normalize();
          // the knee points where the foot points, turned out or in by tg.knee, and a little with the body
          const kd = zf.clone().multiplyScalar(0.75).addScaledVector(zb, 0.25).addScaledVector(xf, tg.knee ?? L.knee ?? 0).normalize();
          let n = V3().crossVectors(kd, up); if (n.lengthSq() < 1e-6) n = xf.clone(); n.normalize();
          const r = ik2(Rj, An, l1, l2, n, kd); if (r.over > 1e-5) An = r.end;
          return { hv, An, Kn: r.mid, over: r.over, n };
        };
        let R = leg(tg.pitch || 0);
        if (!tg.lock && floor) for (let s = 0; s < 6; s++) { const lo = Math.min(R.An.y - (L.ankleH ?? 0.03), R.Kn.y - 0.05); if (lo >= 0) break; T.y -= lo * 1.05; R = leg(tg.pitch || 0); }
        if (tg.lock) for (let s = 1; s <= 8 && R.over > 1e-5; s++) R = leg((tg.pitch || 0) + 0.08 * s);   // a planted foot out of reach goes up on its toe first
        const Tp = R.An.clone().add(R.hv); const pts = [Rj, R.Kn, R.An, Tp]; let Qpar = Qp;
        for (let i = 0; i < 3; i++) {
          const b = L.b[i]; const d = pts[i + 1].clone().sub(pts[i]).normalize(); const nn = i === 2 ? xf : xf.clone().lerp(xb, 0.5).normalize();
          const M = basis(d, nn).multiply(restBasis[b]); const q = new THREE.Quaternion().setFromRotationMatrix(M);
          QW[b] = q; PW[b] = pts[i].clone(); QL[b] = Qpar.clone().invert().multiply(q); Qpar = q;
        }
        out.toe[k] = Tp; out.over[k] = R.over; out.want[k] = T; out.lock[k] = !!tg.lock; continue;
      }
      const [b0, b1, b2, b3] = L.b; const R0 = P0[b0], A0 = P0[b1], K0 = P0[b2], F0 = P0[b3], T0 = END[b3];
      const Rj = out.legRoot(k);
      const T = tg.p.clone(); const floor = cfg.floor !== false && !tg.under; if (!tg.lock && floor && T.y < 0.003) T.y = 0.003; // under: the foot may go below the floor (a dive)
      const leg = (pitch) => {
      const hv = T0.clone().sub(F0).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(X, pitch)).applyQuaternion(fq);
      let Fp = T.clone().sub(hv);
      const up = Rj.clone().sub(Fp); const upn = up.clone().normalize();
      let n = xb.clone().addScaledVector(upn, -xb.dot(upn)); if (n.lengthSq() < 1e-6) n = xb.clone(); n.normalize();
      const up0 = R0.clone().sub(F0).applyQuaternion(fq);
      const th = sAngle(up0, up, n);
      let J1, J2, over = 0;
      if (L.kind === 'front') {
        const u0 = A0.clone().sub(R0).applyQuaternion(Qp); const l1 = A0.distanceTo(K0), l2 = K0.distanceTo(F0);
        // the shoulder follows a part of the leg's swing; if the hoof is out of reach it follows more
        const th0 = sAngle(R0.clone().sub(F0).applyQuaternion(Qp), up, n);
        let E, r;
        for (let s = 0; s <= 12; s++) { const w = lerp(tg.ku ?? L.ku ?? 0.35, 1, s / 12); E = Rj.clone().add(rotAbout(u0, n, th0 * w)); r = ik2(E, Fp, l1, l2, n, zb); if (r.over <= 1e-5) break; }
        J1 = E; J2 = r.mid; over = r.over; Fp = r.end;
      } else {
        const c0 = K0.clone().sub(F0).applyQuaternion(fq); const l1 = R0.distanceTo(A0), l2 = A0.distanceTo(K0);
        const comp = clamp(1 - up.length() / up0.length());
        let a = (L.kcs ?? 0.7) * th - (L.kcf ?? 1.6) * comp + (tg.hock || 0);
        if (tg.ca !== undefined) a = lerp(a, tg.ca, tg.cw ?? 1); // a target may lay the cannon at its own angle (a forearm flat on the floor)
        const cBase = rotAbout(c0, n, a); const cStraight = upn.clone().multiplyScalar(c0.length());
        let Hk, r;
        for (let s = 0; s <= 12; s++) { const c = cBase.clone().lerp(cStraight, s / 12).setLength(c0.length()); Hk = Fp.clone().add(c); r = ik2(Rj, Hk, l1, l2, n, L.bend < 0 ? zb.clone().negate() : zb); if (r.over <= 1e-5) break; }
        J1 = r.mid; J2 = r.end; over = r.over; if (over > 1e-5) Fp = J2.clone().sub(Hk.clone().sub(Fp));
      }
        return { hv, Fp, n, J1, J2, over };
      };
      let R = leg(tg.pitch || 0);
      // a hoof in the air keeps its knee, hock and fetlock off the floor
      if (!tg.lock && floor) for (let s = 0; s < 6; s++) { const lo = Math.min(R.J2.y - 0.016, R.Fp.y - 0.014, R.J1.y - 0.02); if (lo >= 0) break; T.y -= lo * 1.05; R = leg(tg.pitch || 0); }
      // a planted hoof that cannot reach goes up on its toe before anything else gives
      if (tg.lock) for (let s = 1; s <= 8 && R.over > 1e-5; s++) R = leg((tg.pitch || 0) + 0.08 * s);
      const { hv, n, J1, J2, over } = R; const Fp = R.Fp;
      const Tp = Fp.clone().add(hv);
      const pts = [Rj, J1, J2, Fp, Tp];
      let Qpar = Qp;
      for (let i = 0; i < 4; i++) {
        const b = L.b[i]; const d = pts[i + 1].clone().sub(pts[i]).normalize();
        const nn = i === 3 ? X.clone().applyQuaternion(fq) : n;
        const M = basis(d, nn).multiply(restBasis[b]); const q = new THREE.Quaternion().setFromRotationMatrix(M);
        QW[b] = q; PW[b] = pts[i].clone(); QL[b] = Qpar.clone().invert().multiply(q); Qpar = q;
      }
      out.toe[k] = Tp; out.over[k] = over; out.want[k] = T; out.lock[k] = !!tg.lock;
    }
    return out;
  }

  // Sample a clip. clip: {dur, loop, pose(t) -> channels, feet(t, S) -> targets (world = root space + travel),
  // travel(t) -> z, scale(t), springs}
  function sample(clip) {
    const nF = Math.round(clip.dur * FPS) + 1; const frames = [];
    for (let i = 0; i < nF; i++) {
      const t = Math.min(i / FPS, clip.dur); const tz = clip.travel ? clip.travel(t) : 0;
      const p = addPose(cfg.base || {}, clip.pose(t)); let S, drop = 0;
      for (let it = 0; it < 10; it++) {
        S = solve({ ...p, oy: (p.oy || 0) - drop }, (B) => {
          const world = { ...B, loc: (k, v) => B.loc(k, v).add(V3(0, 0, tz)), rest: restToe, tz };
          const F = clip.feet(t, world); const o = {};
          for (const k in F) o[k] = { ...F[k], p: (F[k].p.isVector3 ? F[k].p.clone() : V3(...F[k].p)).sub(V3(0, 0, tz)) };
          return o;
        });
        let need = 0; for (const k in S.over) if (S.lock[k]) need = Math.max(need, S.over[k]);
        if (need <= 2e-5) break; drop += need * 1.15;
      }
      S.drop = drop;
      S.t = t; S.tz = tz; S.sc = clip.scale ? clip.scale(t) : 1; S.p = p; frames.push(S);
    }
    // springs: a point mass follows each ear and tail tip; the bone points at it
    const FLOOR_CLOTH = 0.03;   // cloth rests on the floor, it does not pass through it
    const passes = clip.loop ? 3 : 1; const dt = 1 / FPS / 4;
    for (const S of frames) { S.QLd = {}; for (const sp of cfg.springs) S.QLd[sp.bone] = S.QL[sp.bone].clone(); }
    for (const sp of cfg.springs) {
      let pos = null; const vel = V3(); const b = sp.bone; const kid = names.find((x) => par[x] === b);
      const tl = END[b] ? END[b].clone().sub(P0[b]) : P0[kid].clone().sub(P0[b]);
      for (let pass = 0; pass < passes; pass++) for (let i = 0; i < nF - (clip.loop ? 1 : 0); i++) {
        const S = frames[i]; const pq = S.QW[par[b]]; const tv = V3(0, 0, S.tz);
        const jw = S.PW[par[b]].clone().add(P0[b].clone().sub(P0[par[b]]).applyQuaternion(pq)); if (S.TL[b]) jw.add(S.TL[b].clone().applyQuaternion(pq)); S.PW[b] = jw;
        const qd = pq.clone().multiply(S.QLd[b]);
        const tg = jw.clone().add(tl.clone().applyQuaternion(qd)).add(tv);
        if (!pos) pos = tg.clone();
        for (let s = 0; s < 4; s++) { const acc = tg.clone().sub(pos).multiplyScalar(sp.k).addScaledVector(vel, -sp.c); vel.addScaledVector(acc, dt); pos.addScaledVector(vel, dt); if (pos.y < FLOOR_CLOTH) { pos.y = FLOOR_CLOTH; if (vel.y < 0) vel.y = 0; } }
        const jww = jw.clone().add(tv);
        const dd = tg.clone().sub(jww).normalize(), ds = pos.clone().sub(jww).normalize();
        const ang = Math.min(dd.angleTo(ds), sp.max ?? 0.9) * (sp.gain ?? 1) * (clip.springGain?.[b] ?? 1); const axis = V3().crossVectors(dd, ds);
        const dq = axis.lengthSq() < 1e-12 ? new THREE.Quaternion() : new THREE.Quaternion().setFromAxisAngle(axis.normalize(), ang);
        S.QW[b] = dq.multiply(qd); S.QL[b] = pq.clone().invert().multiply(S.QW[b]);
      }
    }
    if (clip.loop) { const a = frames[0], z = frames[nF - 1]; for (const b of cfg.springs.map((s) => s.bone)) { z.QL[b] = a.QL[b].clone(); z.QW[b] = a.QW[b].clone(); } }
    return frames;
  }
  return { names, ix, P0, END, par, legs, restToe, solve, sample };
}

// ---- foot helpers -------------------------------------------------------------------------------------
// A swing from A to B: u 0..1, lift h. The hoof droops as it leaves and reaches before it lands.
export function swing(A, B, u, h, droop = 0.9) {
  u = clamp(u); const e = smooth(u); const p = A.clone().lerp(B, e); p.y += h * Math.sin(Math.PI * Math.pow(u, 0.85));
  const pitch = droop * Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.35 * u) - 0.18 * smooth((u - 0.7) / 0.3) * (1 - smooth((u - 0.92) / 0.08));
  return { p, pitch };
}
// A gait: each foot is planted for `duty` of the period and swings for the rest. The body moves at v (forward) and
// turns at omega about pivot; a planted hoof is a fixed point of the floor seen from the moving body.
export function gaitFoot(t, g, f) {
  const u = frac(t / g.T - f.phase); const st = g.duty * g.T; const nx = f.n[0], nz = f.n[1]; const px = g.pivot?.[0] || 0, pz = g.pivot?.[1] || 0;
  const at = (s) => { const a = -(g.omega || 0) * s; const dx = nx - px, dz = nz - pz; return V3(px + dx * Math.cos(a) + dz * Math.sin(a) - (g.vx || 0) * s, 0, pz - dx * Math.sin(a) + dz * Math.cos(a) - (g.v || 0) * s); };
  if (u < g.duty) { const s = (u / g.duty - 0.5) * st; const k = u / g.duty; return { p: at(s), yaw: -(g.omega || 0) * s, pitch: (f.push ?? 0.22) * smooth((k - 0.72) / 0.28), lock: true }; }
  const w = (u - g.duty) / (1 - g.duty); const A = at(st / 2), B = at(-st / 2);
  const sw = swing(A, B, w, f.lift, f.droop ?? 0.9); const push = (f.push ?? 0.22) * (1 - smooth(w / 0.25));
  return { p: sw.p, pitch: Math.max(sw.pitch, push), yaw: lerp(-(g.omega || 0) * st / 2, (g.omega || 0) * st / 2, smooth(w)), lock: false };
}
