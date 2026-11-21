// A rig for a boss that is a wheel: it rolls on the corners of its peg ends, the legless rule. The corner on the floor
// stays where it is while the wheel pivots over it; then the next corner takes the weight. A clip gives, per frame:
//   s     how far the hub has rolled (model units; the clip's travel is taken off to place it in the frame)
//   th    the wheel's turn about its axle, only for a wheel in the air (on the floor it follows s)
//   tilt  lean about the line of travel through the corner on the floor (+ its left side comes up)
//   yaw   turn about the upright through that corner (+ to its left)
//   hop   height off the floor            x   a sideways slide (only when it is not standing on a corner)
//   rest  0..1: drop the body until its lowest point is on the floor (a wheel lying down)
//   pre   the axle swings round the upright while the wheel turns back the same about its axle (a dropped lid ringing down)
//   aL aR extra swing on each bracket arm, on top of the pendulum; bk 0..1 takes an arm to the angle bL / bR instead
//   pg    twelve sizes, one for each plank's joint (1 whole, 0 shrunk into its socket), when the rig has them
// build.mjs uses it through CFG.makeRig. The frames carry the same fields the legged rig gives (toe, want, lock).
import * as THREE from 'three';
import { V3, FPS } from './quad.mjs';
const X = V3(1, 0, 0), Y = V3(0, 1, 0), Z = V3(0, 0, 1);
const qAx = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);

export function makeWheelRig(skel, cfg) {
  const W = skel.wheel, names = skel.names, n = W.pegs, STEP = 2 * Math.PI / n, dl = W.delta * Math.PI / 180, Rc = W.Rc;
  const P = W.w + 2 * Rc * Math.sin(STEP / 2 - dl); // ground covered per peg
  const bind = Object.fromEntries(names.map((nm, i) => [nm, V3(...skel.pos[i])])); const hub0 = bind.hips;
  const arms = names.filter((nm) => nm.startsWith('arm')); const pegs = names.filter((nm) => nm.startsWith('peg')); // a wheel may carry a joint for each plank (pose.pg: twelve sizes, 1 whole, 0 gone)
  const hull = W.hull.map((h) => ({ b: names[h[0]], p: V3(h[1], h[2], h[3]) }));
  // the corner that is down for a turn th, where it sits on the ground, and where that puts the hub
  function roll(th) {
    const k = Math.round(th / STEP), front = th >= k * STEP, a = k * STEP + (front ? dl : -dl), g = k * P + (front ? W.w / 2 : -W.w / 2);
    return { k, front, a, g, hubZ: g - Rc * Math.sin(a - th), hubY: Rc * Math.cos(a - th), key: 'c' + (((k % n) + n) % n) + (front ? 'f' : 'r') };
  }
  function thetaOf(s) { let lo = (s / P - 1) * STEP, hi = (s / P + 1) * STEP; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (roll(m).hubZ < s) lo = m; else hi = m; } return (lo + hi) / 2; }
  const corners = []; for (let k = 0; k < n; k++) for (const f of [0, 1]) { const a = k * STEP + (f ? dl : -dl); corners.push({ key: 'c' + k + (f ? 'f' : 'r'), loc: V3(0, -Rc * Math.cos(a), Rc * Math.sin(a)) }); }

  function sample(clip) {
    const nF = Math.round(clip.dur * FPS) + 1; const frames = []; const A = cfg.arm || {};
    for (let i = 0; i < nF; i++) {
      const t = Math.min(i / FPS, clip.dur), tz = clip.travel ? clip.travel(t) : 0, p = { s: 0, tilt: 0, yaw: 0, pre: 0, hop: 0, x: 0, rest: 0, aL: 0, aR: 0, bk: 0, bL: 0, bR: 0, ...clip.pose(t) };
      const air = p.hop > 1e-6 || p.th !== undefined; const th = p.th !== undefined ? p.th : thetaOf(p.s); const r = roll(th);
      const Qt = qAx(Y, p.yaw + p.pre).multiply(qAx(Z, p.tilt)); const Q = Qt.clone().multiply(qAx(X, th - p.pre)); const Qp = qAx(Y, p.yaw).multiply(qAx(Z, p.tilt)); // pre: the axle swings round the upright and the wheel turns back as much about its axle, so a wheel lying nearly flat rings round without spinning
      const G = V3(p.x, 0, (air ? p.s : r.g) - tz);
      const hub = air ? V3(p.x, W.R + p.hop, p.s - tz) : G.clone().add(V3(0, r.hubY, r.hubZ - r.g).applyQuaternion(Qp));
      frames.push({ t, tz, sc: clip.scale ? clip.scale(t) : 1, p, th, sp: th - p.pre, r, air, Q, G, hub, free: air || p.rest > 0 });
    }
    // the bracket arms: a pendulum on each axle stub, shaken by the hub and dragged a little by the turning axle
    const passes = clip.loop ? 4 : 1, sub = 4, dt = 1 / FPS / sub, gv = 9.8 / cfg.unit;
    const wz = frames.map((f) => f.hub.z + f.tz), wy = frames.map((f) => f.hub.y), wt = frames.map((f) => f.th);
    const d2 = (a, i) => { const m = nF - 1; const g = (j) => (clip.loop ? a[((j % m) + m) % m] + Math.floor(j / m) * (a[m] - a[0]) : a[Math.max(0, Math.min(m, j))]); return (g(i + 1) - 2 * g(i) + g(i - 1)) * FPS * FPS; };
    const d1 = (a, i) => { const m = nF - 1; const g = (j) => (clip.loop ? a[((j % m) + m) % m] + Math.floor(j / m) * (a[m] - a[0]) : a[Math.max(0, Math.min(m, j))]); return (g(i + 1) - g(i - 1)) * FPS / 2; };
    const beta = {};
    arms.forEach((nm, ai) => {
      const L = (A.len || 0.19) * (1 + 0.07 * ai), c = (A.damp || 1.3) * (1 - 0.12 * ai), fr = A.drag || 0.5, lim = A.max || 2.6; let b = 0, v = 0; const out = new Array(nF);
      for (let ps = 0; ps < passes; ps++) for (let i = 0; i < nF; i++) {
        const az = Math.max(-60, Math.min(60, d2(wz, i))), ay = Math.max(-40, Math.min(40, d2(wy, i))), om = d1(wt, i);
        for (let k = 0; k < sub; k++) { const acc = -((gv + ay) / L) * Math.sin(b) + (az / L) * Math.cos(b) - c * v + fr * (om - v); v += acc * dt; b += v * dt; if (Math.abs(b) > lim) { b = Math.sign(b) * lim; v *= -0.3; } }
        out[i] = b;
      }
      if (clip.loop) { const e = out[nF - 1] - out[0]; for (let i = 0; i < nF; i++) out[i] -= e * (i / (nF - 1)); }
      beta[nm] = out;
    });
    return frames.map((f, i) => {
      const S = { t: f.t, tz: f.tz, sc: f.sc, p: f.p, QL: {}, QW: {}, PW: {}, TL: {}, SCL: {}, toe: {}, want: {}, lock: {} };
      const hub = f.hub.clone(); S.QW.hips = f.Q.clone(); S.QL.hips = f.Q.clone();
      const place = () => { S.PW.hips = hub.clone(); for (const nm of arms) { const L_ = nm.endsWith('L'); const b = (beta[nm][i] + (L_ ? f.p.aL : f.p.aR)) * (1 - f.p.bk) + (L_ ? f.p.bL : f.p.bR) * f.p.bk; S.QL[nm] = qAx(X, b - f.sp); S.QW[nm] = f.Q.clone().multiply(S.QL[nm]); S.PW[nm] = hub.clone().add(bind[nm].clone().sub(hub0).applyQuaternion(f.Q)); }
        for (const nm of pegs) { S.QL[nm] = new THREE.Quaternion(); S.QW[nm] = f.Q.clone(); S.PW[nm] = hub.clone().add(bind[nm].clone().sub(hub0).applyQuaternion(f.Q)); S.SCL[nm] = f.p.pg ? f.p.pg[+nm.slice(3)] : 1; } };
      place();
      // a wheel that leans stands on the edge of its peg, not on the middle of it: nothing may be under the floor, so it is lifted
      // until its lowest point touches (rest > 0 also lets it down onto that point: a wheel lying on its side)
      { let lo = 1e9; for (const h of hull) { const y = S.PW[h.b].y + h.p.clone().sub(bind[h.b]).applyQuaternion(S.QW[h.b]).y; if (y < lo) lo = y; }
        if (f.p.rest > 0) { hub.y -= lo * f.p.rest; place(); } else if (lo < 0 && !f.air) { hub.y -= lo; place(); } }
      for (const c of corners) { const w = hub.clone().add(c.loc.clone().applyQuaternion(f.Q)); S.toe[c.key] = w; S.want[c.key] = w.clone(); S.lock[c.key] = false; }
      if (!f.free) { S.want[f.r.key] = f.G.clone().setY(S.toe[f.r.key].y); S.lock[f.r.key] = true; }
      S.plantKey = f.free ? '' : 'p' + f.r.k;
      S.th = f.th;
      S.beta = Object.fromEntries(arms.map((nm) => [nm, beta[nm][i]]));
      return S;
    });
  }
  return { names, P, STEP, roll, thetaOf, sample, R: W.R };
}
