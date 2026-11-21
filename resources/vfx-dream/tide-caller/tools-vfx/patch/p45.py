p='tools/tc.js'; s=open(p).read()
a="""  A.fx((t) => { const a = t - o.t, d = o.dur || 0.6, out = o.out || 0.25; m.visible = a >= 0 && a <= d + out; if (!m.visible) return; const p = posAt(Math.min(t, o.t + d)); m.position.set(p.x, 0, p.z); m.rotation.set(0, dirAt(t), 0);
    const rise = EASE.out(clamp(a / (o.rise || 0.15))), sink = a > d ? 1 - EASE.in((a - d) / out) : 1, hh = (o.h || 0.8) * 1.2 * rise * sink * (o.hFn ? o.hFn(a / d) : 1);
    m.scale.set(o.wFn ? o.wFn(a / d) : (o.w || 1.3), Math.max(0.01, hh), (o.len || 1.0) * 1.9 * (0.7 + 0.3 * rise)); m.material.uniforms.op.value = 0.95 * Math.min(1, sink * 1.5); m.material.uniforms.tm.value = t; });"""
b="""  // steered by a path (her rides): the wave's body bends along the way it came (Kesh, 20 Nov: it could not bend on a turn), each slice of it
  // sitting where the crest was that far back, so a turning ride drags a curved wave behind it
  const bend = typeof o.at === 'function' && o.bend !== false; let bg = null, B0 = null;
  if (bend) { bg = waveGeo.clone(); B0 = bg.attributes.position.array.slice(); m.geometry = bg; }
  const HK = 70, hx = new Float32Array(HK + 1), hz = new Float32Array(HK + 1), hd = new Float32Array(HK + 1);
  A.fx((t) => { const a = t - o.t, d = o.dur || 0.6, out = o.out || 0.25; m.visible = a >= 0 && a <= d + out; if (!m.visible) return; const tc = Math.min(t, o.t + d), p = posAt(tc), yw = dirAt(t);
    const rise = EASE.out(clamp(a / (o.rise || 0.15))), sink = a > d ? 1 - EASE.in((a - d) / out) : 1, hh = (o.h || 0.8) * 1.2 * rise * sink * (o.hFn ? o.hFn(a / d) : 1);
    const W = o.wFn ? o.wFn(a / d) : (o.w || 1.3), Lz = (o.len || 1.0) * 1.9 * (0.7 + 0.3 * rise);
    m.material.uniforms.op.value = 0.95 * Math.min(1, sink * 1.5); m.material.uniforms.tm.value = t;
    if (!bend) { m.position.set(p.x, 0, p.z); m.rotation.set(0, yw, 0); m.scale.set(W, Math.max(0.01, hh), Lz); return; }
    // the crest's track back in time, as distance along it
    for (let k = 0; k <= HK; k++) { const q = posAt(Math.max(o.t, tc - k * 0.02)); hx[k] = q.x; hz[k] = q.z; hd[k] = k ? hd[k - 1] + Math.hypot(q.x - hx[k - 1], q.z - hz[k - 1]) : 0; }
    const f0x = Math.sin(dirAt(o.t)), f0z = Math.cos(dirAt(o.t)), fx = Math.sin(yw), fz = Math.cos(yw), pa = bg.attributes.position;
    for (let v = 0; v < pa.count; v++) { const x = B0[v * 3] * W, y = Math.max(0.01, hh) * B0[v * 3 + 1], sz = B0[v * 3 + 2] * Lz; let cx, cz, tx, tz;
      if (sz >= 0) { cx = p.x + fx * sz; cz = p.z + fz * sz; tx = fx; tz = fz; }
      else { const ds = -sz; let k = 1; while (k < HK && hd[k] < ds) k++; const seg = hd[k] - hd[k - 1];
        if (hd[k] < ds || seg < 1e-4) { const back = ds - hd[k]; tx = k > 0 && seg > 1e-4 ? (hx[k - 1] - hx[k]) / seg : f0x; tz = k > 0 && seg > 1e-4 ? (hz[k - 1] - hz[k]) / seg : f0z; if (hd[HK] < 1e-3) { tx = fx; tz = fz; } cx = hx[k] - tx * back; cz = hz[k] - tz * back; }
        else { const f = (ds - hd[k - 1]) / seg; cx = hx[k - 1] + (hx[k] - hx[k - 1]) * f; cz = hz[k - 1] + (hz[k] - hz[k - 1]) * f; tx = (hx[k - 1] - hx[k]) / seg; tz = (hz[k - 1] - hz[k]) / seg; } }
      pa.setXYZ(v, cx + tz * x, y, cz - tx * x); }
    pa.needsUpdate = true; bg.computeVertexNormals(); bg.computeBoundingSphere(); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); });"""
assert a in s; s=s.replace(a,b); open(p,'w').write(s)
