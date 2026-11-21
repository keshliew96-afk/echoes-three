// Quadruped boss kit: key curves, a spine chain, four legs of four bones solved so a planted hoof never slides,
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
  const slideOf = {}; for (const [b, c, ax] of cfg.slides || []) (slideOf[b] = slideOf[b] || []).push([c, ax]); // [[bone, channel, axis in the parent]]: a bone may slide on several axes
  const floorOf = Object.fromEntries(cfg.floorBones || []); // [[bone, lowest y its tip may reach]]
  const legs = cfg.legs;   // {FL:{kind:'front',b:[upper,fore,cannon,hoof]}, ...}
  const restToe = Object.fromEntries(Object.entries(legs).map(([k, L]) => [k, END[L.b[3]].clone()]));
  const restBasis = {};
  // kind 'limb' (a toad's leg): two long bones whose knee is pointed by a pole, a foot that lies on the floor and toes that stay flat.
  // Its rest plane is measured from the bind pose, so the splayed, folded leg the model was sculpted with is the rest pose.
  for (const L of Object.values(legs)) if (L.kind === 'limb') { const [b0, b1, b2] = L.b; L.pole0 = L.pole ? V3(...L.pole) : P0[b1].clone().sub(P0[b0].clone().add(P0[b2]).multiplyScalar(0.5)); L.n0 = V3().crossVectors(P0[b2].clone().sub(P0[b0]), L.pole0).normalize(); }
  for (const L of Object.values(legs)) L.b.forEach((b, i) => { const child = i < 3 ? P0[L.b[i + 1]] : END[b]; restBasis[b] = basis(child.clone().sub(P0[b]).normalize(), L.kind === 'limb' && i < 2 ? L.n0 : X).transpose(); });

  // One pose. p: channel values; feet: {FL:{p:Vector3 (toe, root space), pitch, yaw, q}}. Returns world and local transforms.
  // a bone that would point through the floor lies along it instead, heading the way it already heads (the way it leans in the bind pose if straight down)
  function floorLift(pj, q, v0, fl, body) {
    const v = v0.clone().applyQuaternion(q); const len = v.length(); const minY = fl - pj.y; if (v.y >= minY) return q;
    const away = V3(v0.x, 0, v0.z); if (away.lengthSq() < 1e-8) away.set(0, 0, -1); away.normalize(); /* the way it leans in the bind pose: a weed pinned under a body that rolls over it stays where it lay */
    const h = V3(v.x, 0, v.z).addScaledVector(away, 0.3 * len * clamp((minY - v.y) / (0.3 * len))); if (h.lengthSq() < 1e-10) h.copy(away); h.normalize(); /* its own heading where it first touches, so it never jumps */ const y = Math.min(len * 0.98, minY); const w = h.multiplyScalar(Math.sqrt(len * len - y * y)); w.y = y;
    return new THREE.Quaternion().setFromUnitVectors(v.clone().normalize(), w.normalize()).multiply(q);
  }
  function solve(p, feet) {
    const PW = {}, QW = {}, QL = {};
    PW.root = V3(); QW.root = new THREE.Quaternion();
    chain.forEach(([b, c], i) => {
      QL[b] = qPYR(p[c + 'p'], p[c + 'y'], p[c + 'r']);
      QW[b] = QW[par[b]].clone().multiply(QL[b]);
      PW[b] = PW[par[b]].clone().add(P0[b].clone().sub(P0[par[b]]).applyQuaternion(QW[par[b]]));
      if (i === 0) PW[b].add(V3(p.ox || 0, p.oy || 0, p.oz || 0));
    });
    const TLs = {};
    for (const [b, c] of cfg.extras) {
      // an extra is driven by three channels (prefix + p, y, r) or by its own function of the pose (a wing, a feather)
      QL[b] = typeof c === 'function' ? c(p) : qPYR(p[c + 'p'], p[c + 'y'], p[c + 'r']); QW[b] = QW[par[b]].clone().multiply(QL[b]);
      PW[b] = PW[par[b]].clone().add(P0[b].clone().sub(P0[par[b]]).applyQuaternion(QW[par[b]]));
      if (floorOf[b] !== undefined) { // cfg.floorBones: a tail that bends must not go through the floor; where its tip would, it lies along it
        const kid = names.find((n) => par[n] === b); const v0 = (kid ? P0[kid] : END[b]).clone().sub(P0[b]);
        QW[b] = floorLift(PW[b], QW[b], v0, floorOf[b], PW[chain[0][0]]); QL[b] = QW[par[b]].clone().invert().multiply(QW[b]);
      }
      for (const sl of slideOf[b] || []) if (p[sl[0]]) { const o = V3(...sl[1]).multiplyScalar(p[sl[0]]); TLs[b] = (TLs[b] || V3()).add(o); PW[b].add(o.clone().applyQuaternion(QW[par[b]])); } // a joint that slides along its parent (a tongue that grows)
    }
    // a hanging part (weed, a chain) keeps pointing down whatever its parent does: g 1 hangs free, 0 follows the parent
    for (const [b, g, fl] of cfg.hang || []) {
      const pq = QW[par[b]]; QW[b] = pq.clone().slerp(new THREE.Quaternion(), g);
      PW[b] = PW[par[b]].clone().add(P0[b].clone().sub(P0[par[b]]).applyQuaternion(pq)); if (TLs[b]) PW[b].add(TLs[b].clone().applyQuaternion(pq));
      if (fl !== undefined) { // it cannot hang through the floor: where it would, it lies along the floor, pointing away from the body
        const kid = Object.keys(par).find((n) => par[n] === b); const v0 = (kid ? P0[kid] : END[b]).clone().sub(P0[b]);
        QW[b] = floorLift(PW[b], QW[b], v0, fl, PW[chain[0][0]]);
      }
      QL[b] = pq.clone().invert().multiply(QW[b]);
    }
    const out = { PW, QW, QL, toe: {}, over: {}, want: {}, lock: {}, TL: TLs };
    for (const [b, c] of cfg.extras) if (typeof c === 'string' && p[c + 'b']) { const o = V3(0, p[c + 'b'], 0); out.TL[b] = (out.TL[b] || V3()).add(o); PW[b].add(o.clone().applyQuaternion(QW[par[b]])); }
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
      const [b0, b1, b2, b3] = L.b; const R0 = P0[b0], A0 = P0[b1], K0 = P0[b2], F0 = P0[b3], T0 = END[b3];
      const Rj = out.legRoot(k);
      const T = tg.p.clone(); const floor = cfg.floor !== false && !tg.under; if (!tg.lock && floor && T.y < 0.003) T.y = 0.003; // under: the foot may go below the floor (a dive)
      const leg = (pitch) => {
      if (L.kind === 'limb') {
        // toes flat (tg.curl bends them), the foot lifts its heel by pitch about the ball, then two bones from the root to the ankle
        const hv = T0.clone().sub(F0).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(X, tg.curl || 0)).applyQuaternion(fq);
        let Fp = T.clone().sub(hv); const c = K0.clone().sub(F0).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(X, pitch)).applyQuaternion(fq);
        const Hk = Fp.clone().add(c); const pole = tg.pole ? tg.pole.clone() : L.pole0.clone().applyQuaternion(Qp);
        const n = V3().crossVectors(Hk.clone().sub(Rj), pole); if (n.lengthSq() < 1e-10) n.copy(L.n0).applyQuaternion(Qp); n.normalize();
        const r = ik2(Rj, Hk, R0.distanceTo(A0), A0.distanceTo(K0), n, pole); if (r.over > 1e-5) Fp = r.end.clone().sub(c);
        return { hv, Fp, n, J1: r.mid, J2: r.end, over: r.over };
      }
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
        let Hk, r; // tg.pole: which way the knee points, for a leg lying along the body (a dive)
        for (let s = 0; s <= 12; s++) { const c = cBase.clone().lerp(cStraight, s / 12).setLength(c0.length()); Hk = Fp.clone().add(c); r = ik2(Rj, Hk, l1, l2, n, tg.pole || (L.bend < 0 ? zb.clone().negate() : zb)); if (r.over <= 1e-5) break; }
        J1 = r.mid; J2 = r.end; over = r.over; if (over > 1e-5) Fp = J2.clone().sub(Hk.clone().sub(Fp));
      }
        return { hv, Fp, n, J1, J2, over };
      };
      let R = leg(tg.pitch || 0);
      // a hoof in the air keeps its knee, hock and fetlock off the floor
      if (!tg.lock && floor) for (let s = 0; s < 6; s++) { const lo = Math.min(R.J2.y - 0.016, R.Fp.y - 0.014, R.J1.y - 0.02); if (lo >= 0) break; T.y -= lo * 1.05; R = leg(tg.pitch || 0); }
      // a planted hoof that cannot reach goes up on its toe before anything else gives
      if (tg.lock && cfg.smoothHeel && R.over > 1e-5) { // cfg.smoothHeel: the least heel lift that reaches, found by halving, so it never jumps a step
        const p0 = tg.pitch || 0; let lo = 0, hi = 0.64; if (leg(p0 + hi).over > 1e-5) R = leg(p0 + hi); else { for (let s = 0; s < 14; s++) { const m = (lo + hi) / 2; if (leg(p0 + m).over > 1e-5) lo = m; else hi = m; } R = leg(p0 + hi); }
      } else if (tg.lock) for (let s = 1; s <= 8 && R.over > 1e-5; s++) R = leg((tg.pitch || 0) + 0.08 * s);
      const { hv, n, J1, J2, over } = R; const Fp = R.Fp;
      const Tp = Fp.clone().add(hv);
      const pts = [Rj, J1, J2, Fp, Tp];
      let Qpar = Qp;
      for (let i = 0; i < 4; i++) {
        const b = L.b[i]; const d = pts[i + 1].clone().sub(pts[i]).normalize();
        const nn = i === 3 || (i === 2 && L.kind === 'limb') ? X.clone().applyQuaternion(fq) : n;
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
        let need = 0; for (const k in S.over) if (S.lock[k] && !legs[k].noDrop) need = Math.max(need, S.over[k]); // noDrop: a limb that cannot reach lets go (a fist lifts) instead of pulling the body down
        if (need <= 2e-5) break; drop += need * 1.15;
      }
      S.drop = drop;
      S.t = t; S.tz = tz; S.sc = clip.scale ? clip.scale(t) : 1; S.p = p; frames.push(S);
    }
    // springs: a point mass follows each ear and tail tip; the bone points at it
    const passes = clip.loop ? 3 : 1; const dt = 1 / FPS / 4;
    for (const S of frames) { S.QLd = {}; for (const sp of cfg.springs) S.QLd[sp.bone] = S.QL[sp.bone].clone(); }
    for (const sp of cfg.springs) {
      if (clip.noSpring && clip.noSpring.includes(sp.bone)) continue; // a part the clip throws clear of the body (a crown knocked off)
      let pos = null, prevLd = null; const vel = V3(); const b = sp.bone; const kid = names.find((x) => par[x] === b);
      const tl = END[b] ? END[b].clone().sub(P0[b]) : P0[kid].clone().sub(P0[b]);
      for (let pass = 0; pass < passes; pass++) for (let i = 0; i < nF - (clip.loop ? 1 : 0); i++) {
        const S = frames[i]; const pq = S.QW[par[b]]; const tv = V3(0, 0, S.tz);
        const jw = S.PW[par[b]].clone().add(P0[b].clone().sub(P0[par[b]]).applyQuaternion(pq)); S.PW[b] = jw;
        const qd = pq.clone().multiply(S.QLd[b]);
        const tg = jw.clone().add(tl.clone().applyQuaternion(qd)).add(tv);
        if (!pos) pos = tg.clone();
        for (let s = 0; s < 4; s++) { const acc = tg.clone().sub(pos).multiplyScalar(sp.k).addScaledVector(vel, -sp.c); vel.addScaledVector(acc, dt); pos.addScaledVector(vel, dt);}
        // the mass stays one feather-length from its joint (a rod, not a rubber band): a joint that moves a long way in one frame
        // drags the feather behind it and cannot leave it on the far side, which flipped it over in a single frame
        if (sp.rod !== false) { const jr = jw.clone().add(tv), rd = pos.clone().sub(jr), ln = rd.length(), L0 = tl.length(); if (ln > 1e-9) { rd.multiplyScalar(1 / ln); pos.copy(jr).addScaledVector(rd, L0); vel.addScaledVector(rd, -vel.dot(rd)); } }
        if (sp.floor !== undefined && pos.y < sp.floor) { pos.y = sp.floor; if (vel.y < 0) vel.y = 0; } // a weed dragged under a body lies on the floor, not through it
        const jww = jw.clone().add(tv);
        const dd = tg.clone().sub(jww).normalize(), ds = pos.clone().sub(jww).normalize();
        const a0 = dd.angleTo(ds), fade = a0 < 1.75 ? 1 : Math.max(0, (Math.PI - a0) / (Math.PI - 1.75)); // thrown straight back along itself a feather has no side to bend to: it eases to straight there, and does not flip from one limit to the other
        const ang = Math.min(a0, sp.max ?? 0.9) * fade * (sp.gain ?? 1); const axis = V3().crossVectors(dd, ds);
        const dq = axis.lengthSq() < 1e-12 ? new THREE.Quaternion() : new THREE.Quaternion().setFromAxisAngle(axis.normalize(), ang);
        // the bend, in the feather's own frame, may change by no more than sp.rate a frame (0.55 rad): a strike that whips the head
        // round in two frames lays the feather over across three or four frames, not in one
        let ld = qd.clone().invert().multiply(dq).multiply(qd); const lim = sp.rate ?? 0.55;
        if (prevLd) { const da = prevLd.angleTo(ld); if (da > lim) ld = prevLd.clone().slerp(ld, lim / da); }
        prevLd = ld.clone();
        S.QW[b] = qd.clone().multiply(ld); if (sp.floor !== undefined) S.QW[b] = floorLift(jw, S.QW[b], tl, sp.floor, S.PW[chain[0][0]]);
        S.QL[b] = pq.clone().invert().multiply(S.QW[b]);
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
