p='tools/tc.js'; s=open(p).read()
i=s.index("FX.bentwave = (A, o) => {"); j=s.index("  // spray off the leading crest", i)
new='''FX.bentwave = (A, o) => {
  const g = waveGeo.clone(), P0 = g.attributes.position.array.slice(), pa = g.attributes.position; g.deleteAttribute('normal'); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(P0.length), 3));
  const m = A.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { op: { value: 0.9 }, tm: { value: 0 } }, vertexShader: VS_WAVE, fragmentShader: F_WAVE, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false;
  const a0 = V3(o.from), a1 = V3(o.to), d = a1.clone().sub(a0), dn = d.clone().normalize(), side = new THREE.Vector3(-d.z, 0, d.x).normalize(), top = o.top || 2.2, Lf = o.floor || 1.5, st = o.stand || 0;
  // u < 0: the floor behind the source (where the wave stands as an ordinary tsunami); u 0..1: the arc over her
  const path = (u) => u < 0 ? new THREE.Vector3(a0.x + dn.x * u * Lf, 0, a0.z + dn.z * u * Lf) : new THREE.Vector3(a0.x + d.x * u, Math.sin(Math.PI * Math.min(1, u)) * top, a0.z + d.z * u);
  const tan = (u) => { const e = 0.002, p1 = path(u + e), p2 = path(u - e); return p1.sub(p2).normalize(); };
  A.fx((t) => { const a = t - o.t, du = o.dur || 0.9, out = o.out || 0.3; m.visible = a >= -st && a <= du + out; if (!m.visible) return;
    const hd = a < 0 ? 0 : EASE.out(clamp(a / du)), tail = a > du ? -1 + 2 * EASE.s(clamp((a - du) / out)) : -1, hh = (o.hh || 0.6) * EASE.out(clamp((a + st) / 0.15)), W = o.w || 1.3;
    for (let k = 0; k < pa.count; k++) { const x = P0[k * 3], y = P0[k * 3 + 1], z = P0[k * 3 + 2]; const u = hd + z * (hd - tail); const p = path(u), tg = tan(u), nv = new THREE.Vector3().crossVectors(tg, side).multiplyScalar(-1);
      if (nv.y < 0 && Math.abs(tg.y) < 0.99) nv.multiplyScalar(-1); pa.setXYZ(k, p.x + nv.x * y * hh + side.x * x * W, p.y + nv.y * y * hh, p.z + nv.z * y * hh + side.z * x * W); }
    pa.needsUpdate = true; g.computeVertexNormals(); m.material.uniforms.op.value = 0.95 * (a > du ? 1 - EASE.in(clamp((a - du) / out)) : 1); m.material.uniforms.tm.value = t; });
'''
s=s[:i]+new+s[j:]; open(p,'w').write(s)
