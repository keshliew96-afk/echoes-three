// One frozen frame, many layer configurations: which layer actually puts
// pixels in the reserved h5-25 band? Returns {config: count} plus the bloom
// add sampled at the base centroid.
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
    return [h, mx ? d / mx : 0];
  };
  const grab = () => {
    st.render();
    cv.width = gl.width; cv.height = gl.height;
    ctx.drawImage(gl, 0, 0);
    return ctx.getImageData(0, 0, cv.width, cv.height);
  };
  const count = (img) => {
    const d = img.data; let n = 0, sx = 0, sy = 0;
    for (let i = 0, px = 0; i < d.length; i += 4, px++) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (0.2126 * r + 0.7152 * g + 0.0722 * b <= 40) continue;
      const [h, s] = hsv(r, g, b);
      if (s > 0.35 && h >= 5 && h < 25) { n++; sx += px % img.width; sy += (px / img.width) | 0; }
    }
    return n ? [n, Math.round(sx / n), Math.round(sy / n)] : [0, -1, -1];
  };
  const hide = (pred) => { const l = []; st.scene.traverse((o) => { if (o.visible && pred(o)) { o.visible = false; l.push(o); } }); return l; };
  const show = (l) => l.forEach((o) => { o.visible = true; });
  const under = (o, name) => { for (let q = o; q; q = q.parent) if (q.name === name) return true; return false; };

  const preds = {
    halos: (o) => o.isSprite && o.material?.blending === 2,
    flamebodies: (o) => o.isSprite && o.material?.blending !== 2,
    pools: (o) => o.isMesh && o.material?.blending === 2 && o.geometry?.type === 'CircleGeometry',
    alladd: (o) => (o.isMesh || o.isSprite || o.isPoints) && o.material?.blending === 2,
    bodies: (o) => String(o.name).startsWith('critter-'),
    fireall: (o) => (o.isSprite || (o.isMesh && o.material?.blending === 2 && o.geometry?.type === 'CircleGeometry')),
  };
  const out = { base: count(grab()) };
  for (const [k, f] of Object.entries(preds)) {
    const l = hide(f);
    out['no_' + k] = count(grab());
    out['no_' + k].push(l.length);
    show(l);
  }
  // guard off
  p.setGuard(-14, 34, 0.3, 0);
  out.guardOff = count(grab());
  p.setGuard(-14, 34, 0.3, 1);
  out.guardOn = count(grab());
  // bodies + guard off
  p.setGuard(-14, 34, 0.3, 0);
  const hb = hide(preds.bodies);
  out.guardOff_noBodies = count(grab());
  show(hb);
  p.setGuard(-14, 34, 0.3, 1);
  window.requestAnimationFrame = raf;
  return out;
})()
