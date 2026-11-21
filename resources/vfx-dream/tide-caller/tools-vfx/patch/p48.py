p='tools/tc.js'; s=open(p).read()
a="  const from = (t) => P3(A, o.from || 'tip', t), to = (t) => P3(A, o.to, t);\n  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), side = new THREE.Vector3(), nrm = new THREE.Vector3();\n  const head = o.head || 0.12, tail = o.tail || 0.15;"
b="""  const from = (t) => P3(A, o.from || 'tip', t), to = (t) => P3(A, o.to, t);
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), side = new THREE.Vector3(), nrm = new THREE.Vector3();
  const head = o.head || 0.12, tail = o.tail || 0.15;
  // a miss (Kesh, 20 Nov): when its end reaches empty air (no foe there), the water loses its force: the last stretch droops and falls to the
  // floor, spilling into a small puddle. o.fall: false where it ends on a wall or an object
  const DN = (A.card && A.card.dum) ? A.card.dum.length : 0, mc = { t: -1, k: 0 };
  const missAt = (t) => { const b = to(t); if (b.y < 0.1) return 0; for (let i = 0; i < DN; i++) { const p = A.dpos(i, t); if (Math.hypot(p.x - b.x, p.z - b.z) < 0.6) return 0; } return 1; };
  const miss = (t) => { if (o.fall === false || !DN) return 0; if (mc.t === t) return mc.k; const k = (missAt(t) + missAt(t - 0.06) + missAt(t - 0.12)) / 3 * clamp((t - o.t0) / head); mc.t = t; mc.k = k; return k; };
  const spillAt = (t) => { const a = from(t), b = to(t), d = b.clone().sub(a).setY(0); const L = d.length(); if (L > 1e-3) d.multiplyScalar(1 / L); return new THREE.Vector3(b.x + d.x * L * 0.08, 0.02, b.z + d.z * L * 0.08); };"""
assert a in s; s=s.replace(a,b)
a="for (let i = 0; i < N; i++) { const v = lerp(u0, u1, i / (N - 1)); const p = tmpA.copy(a).lerp(b, v); p.y -= sag * 4 * v * (1 - v); if (o.bend) p.add(o.bend(v, t));"
b="const mk2 = miss(t); for (let i = 0; i < N; i++) { const v = lerp(u0, u1, i / (N - 1)); const p = tmpA.copy(a).lerp(b, v); p.y -= sag * 4 * v * (1 - v); if (o.bend) p.add(o.bend(v, t));\n      if (mk2 > 0) { const f = sm((v - 0.5) / 0.5); p.addScaledVector(dirv, len * 0.08 * f * mk2); p.y -= mk2 * (b.y - 0.02) * Math.pow(f, 1.7); }"
assert a in s; s=s.replace(a,b)
# spill: puddle + drops at the floor point when it misses
a="  // drops peel off along it\n  if (o.peel !== false && (o.t1 - o.t0) > 0.2)"
b="""  if (o.fall !== false) { FX.pool(A, { t0: o.t0 + head, t1: o.t1 + tail + 0.4, at: (tt) => spillAt(Math.min(tt, o.t1)), follow: true, r: (tt) => 0.42 * miss(Math.min(tt, o.t1)) + 0.001, grow: false, op: 0.4, froth: 1.1, fin: 0.1, fout: 0.4 });
    for (let ts = o.t0 + head; ts < o.t1; ts += 0.1) FX.drops(A, { t: ts, at: (tt) => { const q = spillAt(ts); return miss(ts) > 0.5 ? [q.x, 0.04, q.z] : [q.x, -60, q.z]; }, n: 5, sp: 0.5, up: 0.7, size: 0.035, dur: 0.35, seed: Math.floor(ts * 1000) + 11 }); }
  // drops peel off along it
  if (o.peel !== false && (o.t1 - o.t0) > 0.2)"""
assert a in s; s=s.replace(a,b)
open(p,'w').write(s)

# (spray at the spill point on a miss, applied by hand after)
