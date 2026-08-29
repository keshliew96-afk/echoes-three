// In-page A/B danger-band probe. Freezes rAF, then renders the SAME frame
// under several layer configurations and counts reserved-band pixels
// (analyzer gate: s>0.35, L>40, 5<=h<25) for each. Returns JSON.
(() => {
  const p = window.__arenaProbe;
  const st = p.stage;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = () => 0;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const gl = st.renderer.domElement;
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
    return [h, mx ? d / mx : 0, mx * 255];
  };
  const grab = () => {
    st.render();
    cv.width = gl.width; cv.height = gl.height;
    ctx.drawImage(gl, 0, 0);
    return ctx.getImageData(0, 0, cv.width, cv.height);
  };
  const count = (img) => {
    const d = img.data; let n = 0; let sx = 0, sy = 0;
    for (let i = 0, px = 0; i < d.length; i += 4, px++) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (L <= 40) continue;
      const [h, s] = hsv(r, g, b);
      if (s > 0.35 && h >= 5 && h < 25) { n++; sx += px % img.width; sy += (px / img.width) | 0; }
    }
    return { n, cx: n ? Math.round(sx / n) : -1, cy: n ? Math.round(sy / n) : -1 };
  };
  const sets = {};
  const hide = (pred) => { const l = []; st.scene.traverse((o) => { if (pred(o) && o.visible) { o.visible = false; l.push(o); } }); return l; };
  const show = (l) => l.forEach((o) => { o.visible = true; });
  const bodies = (o) => String(o.name).startsWith('critter-');

  const base = grab();
  sets.base = count(base);
  st.bloomPass.enabled = false;
  const nb = grab();
  sets.noBloom = count(nb);
  st.bloomPass.enabled = true;
  const hb = hide(bodies);
  sets.noBody = count(grab());
  st.bloomPass.enabled = false;
  sets.noBodyNoBloom = count(grab());
  st.bloomPass.enabled = true;
  show(hb);

  // bloom delta over the base danger centroid neighbourhood
  const cx = sets.base.cx, cy = sets.base.cy, R = 30;
  let dr = 0, dg = 0, db = 0, m = 0;
  if (cx >= 0) {
    for (let y = Math.max(0, cy - R); y < Math.min(base.height, cy + R); y++)
      for (let x = Math.max(0, cx - R); x < Math.min(base.width, cx + R); x++) {
        const i = (y * base.width + x) * 4;
        dr += base.data[i] - nb.data[i];
        dg += base.data[i + 1] - nb.data[i + 1];
        db += base.data[i + 2] - nb.data[i + 2];
        m++;
      }
  }
  sets.bloomAdd = m ? { r: +(dr / m).toFixed(1), g: +(dg / m).toFixed(1), b: +(db / m).toFixed(1) } : null;
  window.requestAnimationFrame = raf;
  return sets;
})()
