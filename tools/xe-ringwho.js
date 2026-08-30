// WHICH OBJECT PAINTS ON THE IDENTITY RING (polish criterion 2).
//
// xe-ringwhy.js narrowed the band's hue drift to "something in the main scene
// that draws AFTER the band" (hiding every renderOrder > -1 mesh restores the
// authored hue exactly, with bloom left ON). This names the culprits: it takes
// every candidate whose world bounding sphere projects over the ring, hides it
// alone, and reports the ones that move the band's mean rgb.
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
  const bw = x1 - x0 + 1;
  const at = (img, x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };

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
  const raw = new Uint8Array(bw * (y1 - y0 + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      const u = inv[0] * dx + inv[1] * dy, v = inv[2] * dx + inv[3] * dy;
      const rad = Math.hypot(u, v);
      if (rad < 0.65 || rad > 0.86) continue;
      const a = at(A, x, y), b = at(B, x, y);
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 12) raw[(y - y0) * bw + (x - x0)] = 1;
    }
  }
  const cells = [];
  for (let y = y0 + 2; y <= y1 - 2; y++) {
    for (let x = x0 + 2; x <= x1 - 2; x++) {
      if (!raw[(y - y0) * bw + (x - x0)]) continue;
      let ok = 1;
      for (let j = -2; j <= 2 && ok; j++) for (let i = -2; i <= 2; i++) if (!raw[(y - y0 + j) * bw + (x - x0 + i)]) { ok = 0; break; }
      if (ok) cells.push([x, y]);
    }
  }
  const mean = (img) => {
    let r = 0, g = 0, b = 0;
    for (const q of cells) { const px = at(img, q[0], q[1]); r += px[0]; g += px[1]; b += px[2]; }
    const n = cells.length || 1;
    return [r / n, g / n, b / n];
  };
  const base = mean(A);

  // Candidates: drawn after the band, visible, and projecting over the ring.
  const cands = [];
  st.scene.traverse((o) => {
    if (!(o.isMesh || o.isPoints || o.isSprite || o.isLine)) return;
    if ((o.renderOrder ?? 0) <= -1) return;
    if (!o.visible) return;
    if (!o.geometry) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const bs = o.geometry.boundingSphere;
    if (!bs) return;
    o.updateWorldMatrix(true, false);
    const cw = bs.center.clone().applyMatrix4(o.matrixWorld);
    const sc = Math.max(
      Math.hypot(o.matrixWorld.elements[0], o.matrixWorld.elements[1], o.matrixWorld.elements[2]),
      Math.hypot(o.matrixWorld.elements[4], o.matrixWorld.elements[5], o.matrixWorld.elements[6]),
      Math.hypot(o.matrixWorld.elements[8], o.matrixWorld.elements[9], o.matrixWorld.elements[10])
    );
    if (cw.distanceTo(c0) > bs.radius * sc + 1.6) return;
    cands.push(o);
  });

  const hits = [];
  for (const o of cands) {
    o.visible = false;
    const m = mean(grab());
    o.visible = true;
    const d = Math.abs(m[0] - base[0]) + Math.abs(m[1] - base[1]) + Math.abs(m[2] - base[2]);
    if (d < 0.8) continue;
    let chain = [];
    for (let q = o; q && q !== st.scene; q = q.parent) chain.push(q.name || q.type);
    hits.push({
      name: o.name || o.type,
      path: chain.slice(0, 4).join('<'),
      ro: o.renderOrder,
      blend: o.material?.blending,
      transparent: !!o.material?.transparent,
      opacity: o.material?.opacity,
      depthWrite: o.material?.depthWrite,
      mat: o.material?.type,
      delta: +d.toFixed(1),
      rgbWithout: m.map((v) => Math.round(v)),
    });
  }
  hits.sort((a, b) => b.delta - a.delta);
  for (const o of others) o.visible = true;
  window.requestAnimationFrame = raf;
  return { who, cells: cells.length, base: base.map((v) => Math.round(v)), candidates: cands.length, hits: hits.slice(0, 14) };
})()
