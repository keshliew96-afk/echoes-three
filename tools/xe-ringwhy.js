// RING-DRIFT ATTRIBUTION (polish criterion 2, Round D fix round 2).
//
// zd-ringdiff.js says WHICH arcs drift; this says WHY. It builds the band's
// core mask once (shipped frame vs the same frame with only the band material
// hidden, eroded 2 px so no sample sits on an FXAA fringe) and then re-grabs
// the SAME pixels with one contributor removed at a time. Anything that moves
// the octant's mean rgb is painting on the band after it draws.
//
// Scoped to ONE ring per run (argv-free: the ring whose owner name matches
// window.__xeRingWho, default 'healer') so a run costs 6 renders, not 30.
(() => {
  const p = window.__arenaProbe;
  const st = p.stage;
  const who = window.__xeRingWho || 'healer';
  const V3 = st.camera.position.constructor;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = () => 0;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const gl = st.renderer.domElement;
  const grab = () => {
    st.render();
    cv.width = gl.width; cv.height = gl.height;
    ctx.drawImage(gl, 0, 0);
    return ctx.getImageData(0, 0, cv.width, cv.height);
  };
  const hue = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = 60 * (((g - b) / d) % 6);
      else if (mx === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return h;
  };

  // --- locate the ring ------------------------------------------------------
  let band = null, half = 0;
  st.scene.traverse((o) => {
    if (o.name !== 'identity-ring' || band) return;
    let owner = o.parent;
    while (owner && !String(owner.name).startsWith('critter-')) owner = owner.parent;
    if (!owner || owner.name.slice(8) !== who) return;
    o.traverse((c) => { if (c.isMesh && !c.material.map && c.geometry?.parameters?.width) band = c; });
    if (band) half = band.geometry.parameters.width / 2;
  });
  if (!band) return { error: 'ring not found for ' + who };

  const W = gl.width, H = gl.height;
  const proj = (v) => { const q = v.clone().project(st.camera); return [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H]; };
  band.updateWorldMatrix(true, false);
  const c0 = new V3().setFromMatrixPosition(band.matrixWorld);
  const [cx, cy] = proj(c0);
  const [ax, ay] = proj(new V3(c0.x + half, c0.y, c0.z));
  const [bx, by] = proj(new V3(c0.x, c0.y, c0.z + half));
  const ex = [ax - cx, ay - cy], ez = [bx - cx, by - cy];
  const det = ex[0] * ez[1] - ex[1] * ez[0];
  const inv = [ez[1] / det, -ez[0] / det, -ex[1] / det, ex[0] / det];
  const reach = Math.max(Math.hypot(...ex), Math.hypot(...ez)) * 1.1;
  const x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(W - 1, Math.ceil(cx + reach));
  const y0 = Math.max(0, Math.floor(cy - reach)), y1 = Math.min(H - 1, Math.ceil(cy + reach));
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const at = (img, x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };

  // --- core mask, once ------------------------------------------------------
  // The other three critters are hidden for the whole run: bunched party rings
  // overlap on the floor, and an un-hidden neighbour's body/ring leaves this
  // ring with a handful of unoccluded core pixels. Hiding them changes nothing
  // about how THIS band is lit (it is unlit) — it only exposes its arcs.
  const others = [];
  st.scene.traverse((o) => {
    if (!String(o.name).startsWith('critter-')) return;
    let inside = false;
    o.traverse((q) => { if (q === band) inside = true; });
    if (!inside) others.push(o);
  });
  for (const o of others) o.visible = false;
  const A = grab();
  band.material.visible = false;
  const B = grab();
  band.material.visible = true;
  const raw = new Uint8Array(bw * bh);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      const u = inv[0] * dx + inv[1] * dy, v = inv[2] * dx + inv[3] * dy;
      const rad = Math.hypot(u, v);
      if (rad < 0.65 || rad > 0.86) continue;
      const a = at(A, x, y), b = at(B, x, y);
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 24) raw[(y - y0) * bw + (x - x0)] = 1;
    }
  }
  const OCT = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const cells = []; // {x,y,oct}
  for (let y = y0 + 2; y <= y1 - 2; y++) {
    for (let x = x0 + 2; x <= x1 - 2; x++) {
      if (!raw[(y - y0) * bw + (x - x0)]) continue;
      let ok = 1;
      for (let j = -2; j <= 2 && ok; j++) for (let i = -2; i <= 2; i++) if (!raw[(y - y0 + j) * bw + (x - x0 + i)]) { ok = 0; break; }
      if (!ok) continue;
      const dx = x - cx, dy = y - cy;
      const u = inv[0] * dx + inv[1] * dy, v = inv[2] * dx + inv[3] * dy;
      let ang = (Math.atan2(v, u) * 180) / Math.PI; if (ang < 0) ang += 360;
      cells.push({ x, y, o: Math.round(ang / 45) % 8 });
    }
  }

  const summarise = (img) => {
    const acc = OCT.map(() => [0, 0, 0, 0]);
    for (const q of cells) {
      const px = at(img, q.x, q.y);
      const a = acc[q.o];
      a[0] += px[0]; a[1] += px[1]; a[2] += px[2]; a[3]++;
    }
    const out = {};
    for (let i = 0; i < 8; i++) {
      if (acc[i][3] < 6) continue;
      const r = acc[i][0] / acc[i][3], g = acc[i][1] / acc[i][3], b = acc[i][2] / acc[i][3];
      out[OCT[i]] = { n: acc[i][3], rgb: [Math.round(r), Math.round(g), Math.round(b)], h: +hue(r, g, b).toFixed(1) };
    }
    return out;
  };

  // --- contributor toggles --------------------------------------------------
  // Everything that DRAWS AFTER the band (renderOrder > -1) in the main scene,
  // split by family, plus the two post effects that add to it.
  const later = [];
  st.scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite || o.isLine) if ((o.renderOrder ?? 0) > -1) later.push(o); });
  const halos = [];
  st.scene.traverse((o) => {
    if (o.name !== 'identity-ring') return;
    o.traverse((q) => { if (q.isMesh && q.material && q.material.map && q !== band) halos.push(q); });
  });
  const additiveLater = later.filter((o) => o.material && o.material.blending === 2 /* AdditiveBlending */);

  const res = { who, cells: cells.length, shipped: summarise(A) };
  const run = (key, on, off) => {
    off();
    res[key] = summarise(grab());
    on();
  };
  run('noBloom', () => { st.bloomPass.enabled = true; }, () => { st.bloomPass.enabled = false; });
  run('noGrade', () => { st.gradePass.enabled = true; }, () => { st.gradePass.enabled = false; });
  run('noRingHalos', () => { for (const q of halos) q.visible = true; }, () => { for (const q of halos) q.visible = false; });
  run('noAdditiveAfter', () => { for (const q of additiveLater) q.visible = true; }, () => { for (const q of additiveLater) q.visible = false; });
  const pools = [];
  st.scene.traverse((o) => { if (o.isMesh && o.renderOrder === -12) pools.push(o); });
  const fires = [];
  st.scene.traverse((o) => { if ((o.isSprite || o.isPoints) && (o.renderOrder ?? 0) >= 6) fires.push(o); });
  run('noPools', () => { for (const q of pools) q.visible = true; }, () => { for (const q of pools) q.visible = false; });
  run('noFires', () => { for (const q of fires) q.visible = true; }, () => { for (const q of fires) q.visible = false; });
  run('noAllAfter', () => { for (const q of later) q.visible = true; }, () => { for (const q of later) q.visible = false; });
  run('noBloomNoAfter',
    () => { st.bloomPass.enabled = true; for (const q of later) q.visible = true; },
    () => { st.bloomPass.enabled = false; for (const q of later) q.visible = false; });
  res.counts = { later: later.length, additiveLater: additiveLater.length, halos: halos.length };
  for (const o of others) o.visible = true;
  window.requestAnimationFrame = raf;
  return res;
})()
