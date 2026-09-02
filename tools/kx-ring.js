(() => {
  const P = window.__arenaProbe;
  const stage = P.stage, cam = stage.camera, scene = stage.scene;
  const W = window.innerWidth, H = window.innerHeight;
  const rings = [];
  scene.traverse((o) => {
    if (o.name !== 'identity-ring') return;
    let cls = '?';
    for (let p = o; p; p = p.parent) {
      if (p.name && p.name.startsWith('critter-')) { cls = p.name.slice(8); break; }
    }
    // the band mesh: PlaneGeometry with a ShaderMaterial carrying uBandA
    let band = null;
    o.traverse((c) => { if (!band && c.isMesh && c.material && c.material.uniforms && c.material.uniforms.uBandA) band = c; });
    if (!band) return;
    if (!o.visible) return;
    let vis = true;
    for (let p = o; p; p = p.parent) if (!p.visible) vis = false;
    if (!vis) return;
    band.updateWorldMatrix(true, false);
    const wp = new (band.position.constructor)();
    band.getWorldPosition(wp);
    rings.push({ cls, band, wp });
  });
  const V3 = rings.length ? rings[0].wp.constructor : null;
  const emitters = (P.emitters || []).map((e) => ({ kind: e.kind, x: e.x, z: e.z }));
  const proj = (v) => {
    const p = v.clone().project(cam);
    return [Math.round(((p.x + 1) / 2) * W * 100) / 100, Math.round(((1 - p.y) / 2) * H * 100) / 100];
  };
  const out = rings.map((r) => {
    const g = r.band.geometry.parameters;
    const half = g.width / 2;
    // nearest emitter direction in world XZ
    let best = null, bd = 1e9;
    for (const e of emitters) {
      const d = Math.hypot(e.x - r.wp.x, e.z - r.wp.z);
      if (d < bd) { bd = d; best = e; }
    }
    const emAng = best ? (Math.atan2(best.z - r.wp.z, best.x - r.wp.x) * 180) / Math.PI : null;
    const samples = [];
    for (let a = 0; a < 360; a += 3) {
      const rad = (a * Math.PI) / 180;
      const row = { a, pts: {} };
      for (const [key, fr] of [['f050', 0.50], ['f063', 0.63], ['f0755', 0.755], ['f088', 0.88], ['f093', 0.93], ['f098', 0.98], ['f112', 1.12], ['f125', 1.25], ['f140', 1.40]]) {
        const local = new V3(Math.cos(rad) * fr * half, Math.sin(rad) * fr * half, 0);
        const wv = r.band.localToWorld(local.clone());
        row.pts[key] = proj(wv);
      }
      samples.push(row);
    }
    return {
      cls: r.cls,
      world: [Math.round(r.wp.x * 100) / 100, Math.round(r.wp.z * 100) / 100],
      centre: proj(r.wp.clone()),
      half,
      nearestEmitter: best ? { kind: best.kind, dist: Math.round(bd * 100) / 100, ang: Math.round(emAng * 10) / 10 } : null,
      samples,
    };
  });
  return { rings: out, emitters, cam: [cam.position.x, cam.position.y, cam.position.z] };
})()
