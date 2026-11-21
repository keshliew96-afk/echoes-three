import sys
p=sys.argv[1]; s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(s.count(a),a[:80]); s=s.replace(a,b)

# --- H. Wild Thicket warn: tangled thorny roots creeping over the ground + a leafy rim
anchor="  // S62 Wild Thicket: the circle shows in her dark green, then vines burst up through it."
web=r'''  // Round 3 (Kesh 20 Nov, his Wild Thicket repaints): before the burst, thick thorny roots creep over the ground from the
  // middle, tangled through moss; the rim carries small leaves.
  const rootWebTex = (() => { let t = null; return () => t || (t = (() => {
    const S2 = 512, c = document.createElement('canvas'); c.width = c.height = S2; const x = c.getContext('2d');
    let sd = 77; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const C = S2 / 2;
    x.fillStyle = 'rgba(70,110,44,0.55)'; for (let i = 0; i < 260; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * C * 0.95; x.beginPath(); x.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, 3 + rnd() * 6, 0, 6.28); x.fill(); } // moss and clover between the roots
    const strokes = [];
    const root1 = (px, py, a, len, w, depth) => {
      const pts = [[px, py]]; let aa = a;
      for (let k = 0; k < 8; k++) { aa += (rnd() - 0.5) * 0.6; px += Math.cos(aa) * len / 8; py += Math.sin(aa) * len / 8; pts.push([px, py]); }
      strokes.push({ pts, w });
      if (depth > 0) for (let k = 0; k < 2; k++) { const q = pts[2 + Math.floor(rnd() * 5)]; root1(q[0], q[1], aa + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.6), len * 0.55, w * 0.6, depth - 1); }
    };
    for (let i = 0; i < 9; i++) root1(C + (rnd() - 0.5) * 30, C + (rnd() - 0.5) * 30, (i / 9) * 6.28 + rnd() * 0.4, C * (0.8 + rnd() * 0.25), 15 + rnd() * 5, 2);
    for (let i = 0; i < 7; i++) { const a = rnd() * 6.28, d = C * (0.3 + rnd() * 0.5); root1(C + Math.cos(a) * d, C + Math.sin(a) * d, a + 1.6 + rnd(), C * 0.7, 9, 1); } // cross roots so they tangle
    const path = (st) => { x.beginPath(); x.moveTo(st.pts[0][0], st.pts[0][1]); for (let k = 1; k < st.pts.length - 1; k++) { const m = [(st.pts[k][0] + st.pts[k + 1][0]) / 2, (st.pts[k][1] + st.pts[k + 1][1]) / 2]; x.quadraticCurveTo(st.pts[k][0], st.pts[k][1], m[0], m[1]); } x.stroke(); };
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const st of strokes) { x.strokeStyle = 'rgba(28,18,10,0.85)'; x.lineWidth = st.w + 4; path(st); x.strokeStyle = '#5E3E24'; x.lineWidth = st.w; path(st); x.strokeStyle = 'rgba(138,104,68,0.9)'; x.lineWidth = Math.max(1.5, st.w * 0.3); x.save(); x.translate(-st.w * 0.18, -st.w * 0.18); path(st); x.restore();
      x.fillStyle = '#C9A060'; for (let k = 1; k < st.pts.length; k += 2) { const [px, py] = st.pts[k], a = rnd() * 6.28, L = st.w * 0.7; x.beginPath(); x.moveTo(px + Math.cos(a + 1.57) * 2, py + Math.sin(a + 1.57) * 2); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.lineTo(px - Math.cos(a + 1.57) * 2, py - Math.sin(a + 1.57) * 2); x.fill(); } // small thorns
      x.fillStyle = 'rgba(95,150,60,0.95)'; for (let k = 2; k < st.pts.length; k += 3) { const [px, py] = st.pts[k]; x.beginPath(); x.ellipse(px, py, st.w * 0.5, st.w * 0.25, rnd() * 3, 0, 6.28); x.fill(); } } // moss on the roots
    x.globalCompositeOperation = 'destination-in'; const gr = x.createRadialGradient(C, C, C * 0.85, C, C, C); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, S2, S2);
    return new CanvasTexture(c); })()); })();
'''
rep(anchor, web+anchor)
rep('''    const grow = mossy(flat(new RingGeometry(0.01, ev.r, 64), DMG, 0));
    grow.position.y = 0.042;
    g.add(edge, fill, grow);''',
'''    const grow = flat(new RingGeometry(0.01, ev.r, 64), '#FFFFFF', 0); grow.material.map = rootWebTex(); grow.material.needsUpdate = true; // round 3: tangled thorny roots creeping out from the middle
    grow.position.y = 0.042;
    g.add(edge, fill, grow);
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2 + (i % 3) * 0.07; const lf = new Mesh(new PlaneGeometry(0.16, 0.09), texMat(DT.leaf2Tex(), '#E8FFB0', 0, false)); lf.material.alphaTest = 0.4; lf.position.set(Math.cos(a) * ev.r, 0.06, Math.sin(a) * ev.r); lf.rotation.set(-Math.PI / 2 + 0.3, 0, -a + (i % 2 ? 0.6 : -0.6)); g.add(lf); edge.userData.leaves = (edge.userData.leaves || []).concat(lf); } // round 3: small leaves along the rim''')
rep('''      grow.scale.setScalar(Math.max(0.01, u));
      grow.material.opacity = 0.6;''',
'''      grow.scale.setScalar(Math.max(0.01, Math.min(1, u * 1.15)));
      grow.rotation.z = u * 0.25; // the roots seem to crawl outward
      grow.material.opacity = 0.95;
      for (const lf of edge.userData.leaves || []) lf.material.opacity = Math.min(1, u * 6);''')

# --- I. Elder Oak: thick 3D roots from the trunk and dappled shade
a0=s.index("    const roots = [];\n    for (let i = 0; i < 14; i++) {\n      const a = (i / 14) * Math.PI * 2 + 0.2;")
a1=s.index("    const tree = new Group();", a0)
s=s[:a0]+r'''    const roots = []; // round 3 (Kesh 20 Nov, his Elder Oak repaint): thick gnarled roots spread over the ground from the trunk, gold line, moss
    for (let i = 0; i < 9; i++) {
      const a0 = (i / 9) * Math.PI * 2 + 0.35 + Math.sin(i * 2.3) * 0.15, len = ev.r * (0.62 + ((i * 5) % 4) * 0.07);
      const pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10, rr = 0.28 + u * (len - 0.28), a = a0 + 0.28 * Math.sin(u * 3.2 + i); pts.push(new Vector3(Math.cos(a) * rr, 0.14 * (1 - u) + 0.02 + 0.035 * Math.sin(u * 8 + i), Math.sin(a) * rr)); }
      const geo = rootTube(pts, (u) => 0.13 * Math.pow(1 - u, 1.1) + 0.016, false, 60, 7);
      const m = new Mesh(geo, barkMat(geo.userData.len)); m.material.emissiveIntensity = 0.7; geo.setDrawRange(0, 0);
      g.add(m); roots.push({ m, at: i * 0.03 });
      for (let b = 0; b < 2; b++) { // two side roots
        const u0 = 0.35 + b * 0.25, P = pts[Math.round(u0 * 10)], side = (b + i) % 2 ? 1 : -1, ba = Math.atan2(P.z, P.x) + side * 0.7;
        const bp = []; for (let k = 0; k <= 6; k++) { const u = k / 6, rr = u * len * 0.32; bp.push(new Vector3(P.x + Math.cos(ba + 0.3 * Math.sin(u * 3)) * rr, P.y * (1 - u) + 0.015, P.z + Math.sin(ba + 0.3 * Math.sin(u * 3)) * rr)); }
        const bg = rootTube(bp, (u) => 0.13 * Math.pow(1 - u0, 1.1) * 0.7 * (1 - u) + 0.012, false, 24, 6);
        const bm = new Mesh(bg, barkMat(bg.userData.len)); bm.material.emissiveIntensity = 0.7; bg.setDrawRange(0, 0);
        g.add(bm); roots.push({ m: bm, at: i * 0.03 + 0.15 + b * 0.05 });
      }
    }
    { const dap = flat(new RingGeometry(0.01, ev.r * 0.98, 64), '#E8FFB0', 0); dap.material.map = DT.glowTex ? null : null; } // (dapple drawn below)
'''+s[a1:]
rep("        o.roots.forEach((r, i) => { r.material.opacity = 0.75 * Math.min(1, Math.max(0, o.t * 2.5 - i * 0.05)) * out; });",
    "        o.roots.forEach((r) => { const ru = Math.min(1, Math.max(0, (o.t - r.at) * 2.2)); r.m.geometry.setDrawRange(0, Math.floor(r.m.geometry.userData.count * ru / 6) * 6); r.m.position.y = -0.2 * (1 - out); }); // round 3: the roots creep out from the trunk")
open(p,'w').write(s); print('ok')
