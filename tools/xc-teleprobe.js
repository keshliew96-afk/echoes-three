(async () => {
  const E = () => window.__echoes;
  const sl = (m) => new Promise((r) => setTimeout(r, m));
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
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const grab = () => { st.render(); cv.width = gl.width; cv.height = gl.height; ctx.drawImage(gl, 0, 0); return ctx.getImageData(0, 0, cv.width, cv.height); };
  const hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx * 255]; };
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const danger = (img) => { let n = 0; for (let i = 0; i < img.width * img.height; i++) { const r = img.data[i * 4], g = img.data[i * 4 + 1], b = img.data[i * 4 + 2]; const v = hsv(r, g, b); if (v[1] > 0.35 && lum(r, g, b) > 40 && v[0] >= 5 && v[0] < 25) n++; } return n; };
  const bands = [];
  st.scene.traverse((o) => { if (o.name === 'identity-ring') o.traverse((c) => { if (c.isMesh && c.material && c.material.type === 'ShaderMaterial') bands.push(c.material); }); });
  const A = grab();
  for (const m of bands) m.visible = false;
  const B = grab();
  for (const m of bands) m.visible = true;
  return JSON.stringify({ ok, rings: bands.length, dangerShipped: danger(A), dangerRingsHidden: danger(B) });
})()
