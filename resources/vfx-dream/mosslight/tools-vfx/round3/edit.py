import sys
p=sys.argv[1]; s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(s.count(a),a[:80]); s=s.replace(a,b)

# --- C. keep shared geometries on dispose
rep("o.g.traverse((m) => { if (m.material) m.material.dispose(); if (m.geometry && m.geometry !== trunkGeo && m.geometry !== leafGeo) m.geometry.dispose(); });",
    "o.g.traverse((m) => { if (m.material) m.material.dispose(); if (m.geometry && m.geometry !== trunkGeo && m.geometry !== leafGeo && !m.geometry.userData.keep) m.geometry.dispose(); });")

# --- B. shared thorn (after snareCoil)
anchor="  bus.on('review_snare_clench', (ev) => {"
thorn=r'''  // ---- Round 3 (Kesh 20 Nov, his Wild Thicket burst repaint): THE thorn. Every thorn-like effect uses it: a thick bark
  // bramble curving up out of cracked ground and hooking over at the tip, sharp tan spines, moss, a leaf, a thin gold line.
  const thornGeos = [];
  const spineGeo = new ConeGeometry(0.03, 0.13, 4); spineGeo.userData.keep = true;
  const thornGeo = (v) => {
    if (thornGeos[v]) return thornGeos[v];
    const hook = [0.24, 0.32, 0.17, 0.28][v], mid = [0.07, 0.1, 0.05, 0.08][v];
    const pts = [new Vector3(0, -0.12, 0), new Vector3(mid, 0.3, 0), new Vector3(mid * 0.8, 0.6, 0), new Vector3(-0.05, 0.85, 0), new Vector3(-hook, 1.0, 0)];
    const geo = rootTube(pts, (u) => 0.105 * Math.pow(1 - u, 0.85) + 0.007, false, 30, 7);
    geo.userData.keep = true;
    const curve = new CatmullRomCurve3(pts);
    const spines = [0.22, 0.36, 0.5, 0.63, 0.76].map((u, k) => { const P = curve.getPointAt(u), T = curve.getTangentAt(u); return { P, T, side: k % 2 ? 1 : -1, r: 0.105 * Math.pow(1 - u, 0.85) + 0.007 }; });
    return (thornGeos[v] = { geo, spines, len: geo.userData.len });
  };
  const crackTex = (() => { let t = null; return () => t || (t = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    let sd = 41; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 34); gr.addColorStop(0, 'rgba(40,28,18,0.75)'); gr.addColorStop(1, 'rgba(40,28,18,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(30,22,14,0.9)'; x.lineCap = 'round';
    for (let i = 0; i < 9; i++) { let a = (i / 9) * Math.PI * 2 + rnd() * 0.4, px = 64, py = 64, w = 3.2; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { a += (rnd() - 0.5) * 0.7; px += Math.cos(a) * (8 + rnd() * 5); py += Math.sin(a) * (8 + rnd() * 5); x.lineWidth = w; w *= 0.72; x.lineTo(px, py); } x.stroke(); }
    x.fillStyle = 'rgba(120,104,88,0.85)'; for (let i = 0; i < 7; i++) { const a = rnd() * 6.28, d = 14 + rnd() * 20; x.fillRect(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 3 + rnd() * 3, 2 + rnd() * 2); } // floor chips
    return new CanvasTexture(c); })()); })();
  // h = height (u), v = shape 0..3; returns { g (sits on the floor: cracks, moss), body (rises: move body.position.y), h }
  function makeThorn(h, v = 0, crack = true) {
    const T = thornGeo(v % 4);
    const g = new Group(), body = new Group();
    const m = new Mesh(T.geo, barkMat(T.len * h)); m.material.emissiveIntensity = 0.6;
    body.add(m);
    const smat = mat('#C9A060', 1, { emissive: '#8A5A20', emissiveIntensity: 0.35 });
    for (const sp of T.spines) {
      const cn = new Mesh(spineGeo, smat);
      const out = new Vector3(-T.T ? 0 : 0, 0, 0);
      const n = new Vector3(sp.T.y, -sp.T.x, 0).normalize(); // outward in the thorn's plane
      const dir = n.clone().multiplyScalar(sp.side > 0 ? 1 : -1).add(new Vector3(0, 0, sp.side * 0.55)).add(sp.T.clone().multiplyScalar(0.5)).normalize();
      cn.position.copy(sp.P).addScaledVector(dir, sp.r * 0.8);
      cn.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir);
      cn.scale.setScalar(1 / Math.max(0.5, h) * 0.8 + 0.2);
      body.add(cn);
    }
    if (v % 2 === 0) { const lf = new Mesh(new PlaneGeometry(0.2, 0.12), texMat(DT.leaf2Tex(), '#FFFFFF', 1, false)); lf.material.alphaTest = 0.5; lf.position.set(0.12, 0.18, 0.04); lf.rotation.set(0.3, 0.4, -0.6); body.add(lf); }
    { const tf = new Mesh(new ConeGeometry(0.13, 0.07, 6), mat('#4F6B2A')); tf.position.y = 0.02; tf.scale.set(1, 1 / h, 1); body.add(tf); } // moss at its foot
    body.scale.setScalar(h);
    g.add(body);
    if (crack) { const d = new Mesh(new PlaneGeometry(1, 1), texMat(crackTex(), '#FFFFFF', 0.9, false)); d.rotation.x = -Math.PI / 2; d.position.y = 0.012; d.scale.setScalar(0.55 + h * 0.45); g.add(d); g.userData.crack = d; }
    return { g, body, h };
  }
  const disposeThorn = (g) => g.traverse((m) => { if (m.material) m.material.dispose(); if (m.geometry && !m.geometry.userData.keep) m.geometry.dispose(); });
'''
rep(anchor, thorn+anchor)

# --- D. Rootspear row spears -> thorns
a0=s.index("      const sp = new Mesh(new ConeGeometry(0.11 + (i % 3) * 0.03, 0.6 + (i % 4) * 0.12, 5)")
a1=s.index("      spikes.push(sp);", a0)
s=s[:a0]+'''      const sp = makeThorn(0.62 + (i % 4) * 0.12, i % 4); // round 3: Kesh's thorn (was a bark cone spear)
      sp.g.position.set(((i * 37) % 7) / 7 * ev.width * 0.7 - ev.width * 0.35, 0, 0.35 + (i / n) * (ev.len - 0.35));
      sp.g.rotation.y = (i % 2 ? 1 : -1) * Math.PI / 2 + (((i * 13) % 5) - 2) * 0.25; // hooks lean over the row from both sides
      sp.body.position.y = -sp.h;
      sp.g.visible = false;
      g.add(sp.g);
'''+s[a1:]
rep("for (const sp of o.spikes) { sp.visible = true; sp.position.y = -0.45 + 0.75 * rise - 0.8 * sink; }",
    "for (const sp of o.spikes) { sp.g.visible = true; sp.body.position.y = -sp.h * (1 - rise) - sp.h * Math.min(1, sink); }")

# --- E. seed burst spikes
rep('''      const m = new Mesh(spikeGeo, mat(i % 2 ? WOOD : '#8B6A45'));
      m.position.set(ev.x + Math.cos(a) * rr, -0.3, ev.z + Math.sin(a) * rr);
      m.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      root.add(m);
      k7Spikes.push({ m, t: -0.02 * (i % 3) });''',
'''      const th = makeThorn(0.42 + (i % 3) * 0.06, i % 4); // round 3: Kesh's thorn, hooks curling in
      th.g.position.set(ev.x + Math.cos(a) * rr, 0, ev.z + Math.sin(a) * rr);
      th.g.rotation.y = -a;
      th.body.position.y = -th.h;
      root.add(th.g);
      k7Spikes.push({ m: th.g, body: th.body, h: th.h, t: -0.02 * (i % 3) });''')
rep('''      const h = s.tall ?? 0.52, b0 = s.tall != null ? -0.5 : -0.3; // kit 1.8: the thicket's vines rise higher
      s.m.position.y = b0 + h * up - h * Math.min(1, down);
      if (s.t > 0.75) { root.remove(s.m); s.m.material.dispose(); k7Spikes.splice(i, 1); }''',
'''      if (s.body) { s.body.position.y = -s.h * (1 - up) - s.h * Math.min(1, down); if (s.m.userData.crack) s.m.userData.crack.material.opacity = 0.9 * Math.min(1, Math.max(0, s.t) / 0.05) * (1 - Math.min(1, down)); } // round 3: thorns rise out of cracked ground
      else { const h = s.tall ?? 0.52, b0 = s.tall != null ? -0.5 : -0.3; s.m.position.y = b0 + h * up - h * Math.min(1, down); } // kit 1.8: the thicket's vines rise higher
      if (s.t > 0.75) { root.remove(s.m); if (s.body) disposeThorn(s.m); else s.m.material.dispose(); k7Spikes.splice(i, 1); }''')

# --- F. Wild Thicket burst
rep('''    spots.forEach(([x, z, k], i) => {
      const m = dressSpike(new Mesh(spikeGeo, mat(i % 3 === 0 ? LEAF : i % 2 ? WOOD : '#8B6A45')), i, 0.6); // round 2: Rootspear's root spears
      m.scale.set(1.3 * k, 1.6 * k, 1.3 * k);
      m.position.set(x, -0.5, z);
      m.rotation.set(Math.sin(i) * 0.3, 0, Math.cos(i * 1.3) * 0.3);
      root.add(m);
      k7Spikes.push({ m, t: -0.012 * (i % 5), tall: 0.8 * k });
    });''',
'''    spots.forEach(([x, z, k], i) => {
      if (k > 1) { // round 3: a held foe gets roots coiled round its base (Kesh's repaint)
        const g2 = new Group(), body = new Group(); const c = snareCoil(); c.geometry.setDrawRange(0, c.geometry.userData.count); c.scale.set(1.15, 1.6, 1.15); body.add(c); g2.add(body); g2.position.set(x, 0, z); body.position.y = -0.4; root.add(g2);
        k7Spikes.push({ m: g2, body, h: 0.4, t: -0.012 * (i % 5) }); return;
      }
      const th = makeThorn((0.7 + ((i * 7) % 5) * 0.09) * 1.15, i % 4); // round 3: Kesh's thorn, lashing up out of cracked ground
      th.g.position.set(x, 0, z);
      th.g.rotation.y = -Math.atan2(ev.z - z, ev.x - x) + Math.PI + (((i * 5) % 7) - 3) * 0.35; // hooks curl toward the middle, a little each way
      th.body.position.y = -th.h;
      root.add(th.g);
      k7Spikes.push({ m: th.g, body: th.body, h: th.h, t: -0.012 * (i % 5) });
    });''')

# --- G. Elder Oak hold spikes
rep('''      const rt = new Mesh(new ConeGeometry(0.09, 0.85, 5), mat(i % 2 ? '#7FA048' : '#9A7444'));
      const pv = new Group();
      pv.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
      pv.rotation.set(0, -a + Math.PI / 2, 0);
      rt.position.y = 0.34;
      rt.rotation.z = 0.4;
      pv.add(rt);
      g.add(pv);''',
'''      const th = makeThorn(0.72 + (i % 2) * 0.12, i % 4, false); // round 3: Kesh's thorn, hooks closing over the held foe
      th.g.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
      th.g.rotation.y = -a;
      g.add(th.g);''')
rep("      if (o.t > o.life + 0.25) { root.remove(o.g); oakRoots.splice(i, 1); }",
    "      if (o.t > o.life + 0.25) { root.remove(o.g); disposeThorn(o.g); oakRoots.splice(i, 1); }")

open(p,'w').write(s)
print('ok')
