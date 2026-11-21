// Knees for a review page (Kesh 19 Nov: "add for other hero to have knees as well", as on Ashfang's page v33).
// The GLB is untouched. On load each leg gets a knee bone halfway down; the foot hangs from it and the leg's
// skin below the knee follows it (blended over 10 cm). A pose that never turns the knee looks exactly as before.
// bendKnees() works on a finished pose: where the clip slid the leg root up into the body (the old hidden knee
// bend) the root takes back half of it and the knee bends forward for the rest, the foot staying where the clip
// put it and keeping its turn. The knee points where the hips face (no splay). Passed clips (idle, walk, run,
// dash, basic combo) pass weight 0 and are not touched.
import * as THREE from 'three';
const V = THREE.Vector3, Q = THREE.Quaternion;
export function addKnees(scene, names = { leg: 'leg', foot: 'foot' }) {
  scene.updateMatrixWorld(true);
  const meshes = [];
  scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  for (const s of ['L', 'R']) {
    const leg = scene.getObjectByName(names.leg + s), foot = scene.getObjectByName(names.foot + s);
    if (!leg || !foot || scene.getObjectByName('knee' + s)) continue;
    const knee = new THREE.Bone();
    knee.name = 'knee' + s;
    knee.position.copy(foot.position).multiplyScalar(0.5);
    leg.add(knee);
    knee.add(foot);
    foot.position.sub(knee.position);
    scene.updateMatrixWorld(true);
    const kneeY = new V().setFromMatrixPosition(knee.matrixWorld).y;
    const band = 0.1 * (names.band || 1), half = band / 2;
    for (const m of meshes) {
      const sk = m.skeleton, iL = sk.bones.indexOf(leg);
      if (iL < 0) continue;
      const kInv = new THREE.Matrix4().makeTranslation(knee.position.x, knee.position.y, knee.position.z).invert().multiply(sk.boneInverses[iL]);
      const bones = [...sk.bones, knee], inv = [...sk.boneInverses, kInv], iK = bones.length - 1;
      const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight, P = m.geometry.attributes.position;
      const v = new V();
      for (let i = 0; i < P.count; i++) {
        for (let k = 0; k < 4; k++) {
          if (si.getComponent(i, k) !== iL || sw.getComponent(i, k) <= 0) continue;
          const y = v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld).y;
          const f = Math.max(0, Math.min(1, (kneeY + half - y) / band));
          if (f <= 0) continue;
          const w = sw.getComponent(i, k);
          let free = -1;
          for (let j = 0; j < 4; j++) if (j !== k && sw.getComponent(i, j) <= 0) { free = j; break; }
          if (f >= 1 || free < 0) { if (f >= 0.5) si.setComponent(i, k, iK); continue; }
          sw.setComponent(i, k, w * (1 - f));
          si.setComponent(i, free, iK);
          sw.setComponent(i, free, w * f);
        }
      }
      si.needsUpdate = true;
      sw.needsUpdate = true;
      m.bind(new THREE.Skeleton(bones, inv), m.bindMatrix);
    }
  }
}
// opts: hips (name), share (part of the root slide the root keeps, 0.5), out (pole outward, 0.06),
// floor (lift a foot the clip sank through the floor, world y = 0, back to its rest height above it), maxThigh (deg the thigh
// may swing forward past the clip's own leg line, null = no cap)
export function kneeSolver(model, opts = {}) {
  const o = { hips: 'hips', share: 0.5, out: 0.06, floor: true, maxThigh: null, ...opts };
  const hips = model.getObjectByName(o.hips);
  const sides = ['L', 'R'].map((s) => {
    const leg = model.getObjectByName('leg' + s), knee = model.getObjectByName('knee' + s), foot = model.getObjectByName('foot' + s);
    if (!leg || !knee || !foot) return null;
    return { s, sgn: s === 'L' ? 1 : -1, leg, knee, foot, rest: leg.position.clone(), restQ: leg.quaternion.clone() };
  }).filter(Boolean);
  model.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4();
  for (const S of sides) { toModel.copy(model.matrixWorld).invert(); S.ankY = new V().setFromMatrixPosition(S.foot.matrixWorld).applyMatrix4(toModel).y; }
  const W = (b) => new V().setFromMatrixPosition(b.matrixWorld);
  const WQ = (b) => b.getWorldQuaternion(new Q());
  const setW = (b, q) => { b.quaternion.copy(WQ(b.parent).invert().multiply(q)); b.updateMatrixWorld(true); };
  const aim = (bone, child, target) => { bone.updateMatrixWorld(true); const P = W(bone), C = W(child); setW(bone, new Q().setFromUnitVectors(C.sub(P).normalize(), target.clone().sub(P).normalize()).multiply(WQ(bone))); };
  const stats = { bend: 0, lift: 0 };
  function solve(w = 1) {
    stats.bend = 0; stats.lift = 0;
    if (!(w > 0) || !sides.length) { for (const S of sides) S.knee.quaternion.identity(); return stats; }
    for (const S of sides) S.knee.quaternion.identity();
    model.updateMatrixWorld(true);
    toModel.copy(model.matrixWorld).invert();
    const hq = WQ(hips), sc = new V().setFromMatrixScale(model.matrixWorld).y; // the floor is world y = 0
    for (const S of sides) {
      const { leg, knee, foot } = S;
      const qf = WQ(foot), T = W(foot), q0 = leg.quaternion.clone(), p0 = leg.position.clone();
      // a foot sunk under its rest height comes up onto the floor (the knee takes it)
      // (only as far as it is both under the floor and under its rest height in his own frame: a body the page sinks
      // into the floor on purpose, or hips raised in the air, are left alone)
      if (o.floor) { const fy = S.ankY * sc, Tm = T.clone().applyMatrix4(toModel), dm = (S.ankY - Tm.y) * sc, dw = fy - T.y, d = Math.min(dm, dw);
        if (d > 0) { stats.lift = Math.max(stats.lift, d / sc); T.y += d; } }
      // the root slide along the leg (up into the body) is the old hidden knee bend: the root keeps `share` of it
      const u = foot.position.clone().add(knee.position).applyQuaternion(leg.quaternion).normalize().negate();
      const d = leg.position.clone().sub(S.rest), sl = d.dot(u);
      if (sl > 0) leg.position.addScaledVector(u, -sl * (1 - o.share));
      leg.updateMatrixWorld(true);
      const Sw = W(leg), L1 = Sw.distanceTo(W(knee)), L2 = W(knee).distanceTo(W(foot));
      const dist = Math.min(T.distanceTo(Sw), (L1 + L2) * 0.9995), dir = T.clone().sub(Sw).normalize();
      const along = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), hgt = Math.sqrt(Math.max(0, L1 * L1 - along * along));
      const pole = new V(o.out * S.sgn, 0, 1).normalize().applyQuaternion(hq);
      const perp = pole.addScaledVector(dir, -pole.dot(dir)).normalize();
      let K = Sw.clone().addScaledVector(dir, along).addScaledVector(perp, hgt);
      if (o.maxThigh != null) { // the thigh may not swing forward past the clip's own leg line by more than maxThigh
        const fwd = new V(0, 0, 1).applyQuaternion(hq), lineAng = Math.asin(Math.max(-1, Math.min(1, dir.dot(fwd))));
        const th = K.clone().sub(Sw).normalize(), thAng = Math.asin(Math.max(-1, Math.min(1, th.dot(fwd))));
        const cap = lineAng + o.maxThigh * Math.PI / 180;
        if (thAng > cap) { // less bend: slide the root back up until the thigh is at the cap
          const k = Math.max(0, Math.min(1, (thAng - lineAng) > 1e-6 ? (cap - lineAng) / (thAng - lineAng) : 1));
          const hk = hgt * k, alongK = Math.sqrt(Math.max(0, L1 * L1 - hk * hk)), a2 = Math.sqrt(Math.max(0, L2 * L2 - hk * hk));
          const nd = alongK + a2, shift = dist - nd; // the root moves along dir toward the foot by -shift (up)
          leg.position.copy(leg.parent.worldToLocal(Sw.clone().addScaledVector(dir, shift)));
          leg.updateMatrixWorld(true);
          const Sw2 = W(leg); K = Sw2.clone().addScaledVector(dir, alongK).addScaledVector(perp, hk);
        }
      }
      aim(leg, knee, K);
      aim(knee, foot, T);
      stats.bend = Math.max(stats.bend, knee.quaternion.angleTo(new Q()) * 180 / Math.PI);
      if (w < 1) { const qs = leg.quaternion.clone(), ps = leg.position.clone(); leg.quaternion.copy(q0).slerp(qs, w); leg.position.lerpVectors(p0, ps, w); knee.quaternion.slerp(new Q(), 1 - w); }
      model.updateMatrixWorld(true);
      setW(foot, qf);
    }
    return stats;
  }
  return { solve, stats, sides };
}
