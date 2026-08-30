// TELEGRAPH-vs-RING Z-ORDER PROBE (Round D fix round 2, criterion 5).
//
// The rejected build composited the identity rings AFTER UnrealBloomPass, where
// the only depth available is opaque scene depth, so the rings painted over the
// Ember telegraph decal that §19.4 puts above them — measured at -12% to -41%
// of the frame's reserved h5-25 count on every telegraphed attack.
//
// Same experiment as the critic's tools/actions/xc-teleocc.json, plus the two
// numbers that make the answer unambiguous: the danger count inside the
// telegraph's own screen box (where the cue lives) and outside it (where the
// rings live). A ring that is not erasing the cue leaves the in-box count
// unchanged or HIGHER (the band under a 0.62-1.0 alpha Ember decal makes the
// decal read more Ember than bare grass does).
(() => {
  const E = () => window.__echoes;
  const sl = (m) => new Promise((r) => setTimeout(r, m));
  return (async () => {
    E().cmd('teleport', 6, -4);
    await sl(2500);
    const id = E().cmd('spawn', 'mantis', 9.2, -4);
    let ok = false;
    for (let i = 0; i < 900; i++) {
      const st = E().state();
      const en = (st.enemies || []).find((e) => e.id === id);
      if (en && en.telegraph) { ok = true; break; }
      await sl(10);
    }
    window.requestAnimationFrame = () => 0;
    const p = window.__arenaProbe, st = p.stage, gl = st.renderer.domElement;
    const V3 = st.camera.position.constructor;
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const grab = () => {
      st.render();
      cv.width = gl.width; cv.height = gl.height;
      ctx.drawImage(gl, 0, 0);
      return ctx.getImageData(0, 0, cv.width, cv.height);
    };
    const hsv = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      let h = 0;
      if (d) {
        if (mx === r) h = 60 * (((g - b) / d) % 6);
        else if (mx === g) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - g) / d + 4);
      }
      if (h < 0) h += 360;
      return [h, mx ? d / mx : 0];
    };
    const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const count = (img, box) => {
      let n = 0;
      const [bx, by, bw, bh] = box || [0, 0, img.width, img.height];
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          const i = (y * img.width + x) * 4;
          const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
          const v = hsv(r, g, b);
          if (v[1] > 0.35 && lum(r, g, b) > 40 && v[0] >= 5 && v[0] < 25) n++;
        }
      }
      return n;
    };

    // Live telegraph decals -> their screen box.
    const decals = [];
    st.scene.traverse((o) => {
      if (o.name !== 'telegraph' || !o.visible) return;
      o.traverse((c) => { if (c.isMesh && c.visible) decals.push(c); });
    });
    const W = gl.width, H = gl.height;
    const proj = (v) => { const q = v.clone().project(st.camera); return [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H]; };
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (const d of decals) {
      d.updateWorldMatrix(true, false);
      if (!d.geometry.boundingSphere) d.geometry.computeBoundingSphere();
      const cW = d.geometry.boundingSphere.center.clone().applyMatrix4(d.matrixWorld);
      const rW = d.geometry.boundingSphere.radius;
      for (const dx of [-rW, rW]) for (const dz of [-rW, rW]) {
        const [sx, sy] = proj(new V3(cW.x + dx, cW.y, cW.z + dz));
        bx0 = Math.min(bx0, sx); by0 = Math.min(by0, sy);
        bx1 = Math.max(bx1, sx); by1 = Math.max(by1, sy);
      }
    }
    const pad = 24;
    const box = decals.length
      ? [Math.max(0, Math.floor(bx0 - pad)), Math.max(0, Math.floor(by0 - pad)),
         Math.min(W, Math.ceil(bx1 + pad)) - Math.max(0, Math.floor(bx0 - pad)),
         Math.min(H, Math.ceil(by1 + pad)) - Math.max(0, Math.floor(by0 - pad))]
      : null;

    const bands = [];
    st.scene.traverse((o) => {
      if (o.name !== 'identity-ring') return;
      o.traverse((c) => { if (c.isMesh && c.material && c.material.type === 'ShaderMaterial') bands.push(c.material); });
    });
    const A = grab();
    for (const m of bands) m.visible = false;
    const B = grab();
    for (const m of bands) m.visible = true;
    const res = {
      ok, rings: bands.length, decals: decals.length, box,
      dangerShipped: count(A), dangerRingsHidden: count(B),
    };
    if (box) {
      res.inBoxShipped = count(A, box);
      res.inBoxRingsHidden = count(B, box);
      res.outBoxShipped = res.dangerShipped - res.inBoxShipped;
      res.outBoxRingsHidden = res.dangerRingsHidden - res.inBoxRingsHidden;
    }
    return JSON.stringify(res);
  })();
})()
