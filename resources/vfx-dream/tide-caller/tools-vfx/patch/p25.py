p='tools/tc.js'; s=open(p).read()
anchor="// a ring wall of water that breaks outward from a point (Breaker)"
assert anchor in s
new='''// the tsunami bent along an arc (Surge's Overhead): the wave's white crest leads along the path, its body stretches back to the source;
// o: t, dur (head from start to end), from, to, top (arc height), w (width across), hh (wave height), len (body length, 0..1 of the path), out
FX.bentwave = (A, o) => {
  const g = waveGeo.clone(), P0 = g.attributes.position.array.slice(), pa = g.attributes.position; g.deleteAttribute('normal'); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(P0.length), 3));
  const m = A.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { op: { value: 0.9 }, tm: { value: 0 } }, vertexShader: VS_WAVE, fragmentShader: F_WAVE, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;
  const a0 = V3(o.from), a1 = V3(o.to), d = a1.clone().sub(a0), side = new THREE.Vector3(-d.z, 0, d.x).normalize(), top = o.top || 2.2;
  const path = (u) => new THREE.Vector3(a0.x + d.x * u, Math.sin(Math.PI * clamp(u)) * top, a0.z + d.z * u);
  const tan = (u) => { const e = 0.002, p1 = path(u + e), p2 = path(u - e); return p1.sub(p2).normalize(); };
  A.fx((t) => { const a = t - o.t, du = o.dur || 0.9, out = o.out || 0.3; m.visible = a >= 0 && a <= du + out; if (!m.visible) return;
    const hd = EASE.out(clamp(a / du)) * 1.0, L = Math.min(hd, o.len || 0.55) * (a > du ? 1 - clamp((a - du) / out) : 1), hh = (o.hh || 0.6) * EASE.out(clamp(a / 0.15)), W = o.w || 1.3;
    for (let k = 0; k < pa.count; k++) { const x = P0[k * 3], y = P0[k * 3 + 1], z = P0[k * 3 + 2]; const u = hd + z * L; const p = path(u), tg = tan(u), nv = new THREE.Vector3().crossVectors(tg, side).multiplyScalar(-1);
      if (nv.y < 0 && Math.abs(tg.y) < 0.99) nv.multiplyScalar(-1); pa.setXYZ(k, p.x + nv.x * y * hh + side.x * x * W, p.y + nv.y * y * hh, p.z + nv.z * y * hh + side.z * x * W); }
    pa.needsUpdate = true; g.computeVertexNormals(); m.material.uniforms.op.value = 0.95 * (a > du ? 1 - clamp((a - du) / out) : 1); m.material.uniforms.tm.value = t; });
  // spray off the leading crest
  const n = Math.floor((o.dur || 0.9) / 0.08); for (let i = 0; i < n; i++) { const ts = o.t + 0.05 + i * 0.08; FX.drops(A, { t: ts, at: (tt) => { const u = EASE.out(clamp((ts - o.t) / (o.dur || 0.9))), p = path(u); return [p.x, p.y + (o.hh || 0.6), p.z]; }, n: 4, sp: (o.w || 1.3) * 0.5, up: 0.6, size: 0.035, dur: 0.45, seed: i * 7 + 3 }); }
};
'''
s=s.replace(anchor,new+anchor); open(p,'w').write(s)
