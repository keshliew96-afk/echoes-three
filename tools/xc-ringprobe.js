(() => {
  const p = window.__arenaProbe;
  const st = p.stage;
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
  const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
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
  const meanHue = (hs) => {
    let sx = 0, sy = 0;
    for (const h of hs) { sx += Math.cos(h * Math.PI / 180); sy += Math.sin(h * Math.PI / 180); }
    let d = Math.atan2(sy, sx) * 180 / Math.PI; if (d < 0) d += 360; return d;
  };

  const critters = [];
  st.scene.traverse((o) => { if (String(o.name).startsWith('critter-')) critters.push(o); });
  const rings = [];
  st.scene.traverse((o) => {
    if (o.name !== 'identity-ring') return;
    let owner = o.parent;
    while (owner && !String(owner.name).startsWith('critter-')) owner = owner.parent;
    let band = null;
    o.traverse((c) => { if (c.isMesh && c.material && c.material.type === 'ShaderMaterial') band = c; });
    if (!band) return;
    band.updateWorldMatrix(true, false);
    const ws = new V3(); band.getWorldScale(ws);
    rings.push({ who: owner ? owner.name.slice(8) : '?', band, half: band.geometry.parameters.width / 2 * ws.x, owner });
  });
  if (!rings.length) { window.requestAnimationFrame = raf; return { error: 'no rings' }; }

  const W = gl.width, H = gl.height;
  const proj = (v) => { const q = v.clone().project(st.camera); return [(q.x * .5 + .5) * W, (-q.y * .5 + .5) * H]; };
  for (const r of rings) {
    const c = new V3().setFromMatrixPosition(r.band.matrixWorld);
    r.world = c;
    const cc = proj(c);
    const aa = proj(new V3(c.x + r.half, c.y, c.z));
    const bb = proj(new V3(c.x, c.y, c.z + r.half));
    r.c = cc; r.ex = [aa[0] - cc[0], aa[1] - cc[1]]; r.ez = [bb[0] - cc[0], bb[1] - cc[1]];
    let poolOct = -1, poolInfo = null;
    if (Array.isArray(p.emitters)) {
      let best = null, bd = 1e9;
      for (const em of p.emitters) { const d = (em.x - c.x) * (em.x - c.x) + (em.z - c.z) * (em.z - c.z); if (d < bd) { bd = d; best = em; } }
      if (best) {
        let ang = Math.atan2(best.z - c.z, best.x - c.x) * 180 / Math.PI; if (ang < 0) ang += 360;
        poolOct = Math.round(ang / 45) % 8;
        poolInfo = { kind: best.kind || '?', dist: +Math.sqrt(bd).toFixed(2) };
      }
    }
    r.poolOct = poolOct; r.poolInfo = poolInfo;
  }

  const at = (img, x, y) => { const i = (Math.round(y) * img.width + Math.round(x)) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
  const OCT = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const out = {};

  for (const r of rings) {
    const others = critters.filter((c) => { let inside = false; c.traverse((q) => { if (q === r.band) inside = true; }); return !inside; });
    for (const c of others) c.visible = false;
    const A = grab();
    r.band.material.visible = false;
    const B = grab();
    r.band.material.visible = true;
    for (const c of others) c.visible = true;

    const oct = Array.from({ length: 8 }, () => ({ band: [], core: [], gnd: [] }));
    const sample = (ang, t) => {
      const ux = Math.cos(ang * Math.PI / 180), uz = Math.sin(ang * Math.PI / 180);
      return [r.c[0] + r.ex[0] * ux * t + r.ez[0] * uz * t, r.c[1] + r.ex[1] * ux * t + r.ez[1] * uz * t];
    };
    for (let ang = 0; ang < 360; ang += 0.5) {
      const oi = Math.round((((ang % 360) + 360) % 360) / 45) % 8;
      for (let t = 0.68; t <= 0.83; t += 0.015) {
        const s = sample(ang, t);
        if (s[0] < 1 || s[1] < 1 || s[0] >= W - 1 || s[1] >= H - 1) continue;
        const a = at(A, s[0], s[1]), b = at(B, s[0], s[1]);
        if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= 12) continue;
        oct[oi].band.push(a);
        if (t >= 0.735 && t <= 0.775) oct[oi].core.push(a);
      }
      for (let t = 1.12; t <= 1.28; t += 0.02) {
        const s = sample(ang, t);
        if (s[0] < 1 || s[1] < 1 || s[0] >= W - 1 || s[1] >= H - 1) continue;
        oct[oi].gnd.push(at(B, s[0], s[1]));
      }
    }
    for (let oi = 0; oi < 8; oi++) {
      const g = oct[oi].gnd;
      const gL = g.length ? g.reduce((s, q) => s + luma(q[0], q[1], q[2]), 0) / g.length : 0;
      const widths = [], darks = [];
      for (let k = -18; k <= 18; k += 1.5) {
        const ang = oi * 45 + k;
        const ux = Math.cos(ang * Math.PI / 180), uz = Math.sin(ang * Math.PI / 180);
        const stepPx = Math.hypot(r.ex[0] * ux + r.ez[0] * uz, r.ex[1] * ux + r.ez[1] * uz) * 0.004;
        let painted = 0, n = 0, minL = 999;
        for (let t = 0.88; t <= 1.06; t += 0.004) {
          const sx = r.c[0] + r.ex[0] * ux * t + r.ez[0] * uz * t;
          const sy = r.c[1] + r.ex[1] * ux * t + r.ez[1] * uz * t;
          if (sx < 1 || sy < 1 || sx >= W - 1 || sy >= H - 1) continue;
          const a = at(A, sx, sy), b = at(B, sx, sy);
          const moved = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 12;
          if (moved) { painted++; const L = luma(a[0], a[1], a[2]); if (L < minL) minL = L; if (L < gL * 0.72) n++; }
        }
        if (painted < 15) continue;
        widths.push(n * stepPx); darks.push(minL);
      }
      widths.sort((a, b) => a - b); darks.sort((a, b) => a - b);
      oct[oi].w = widths.length ? widths[Math.floor(widths.length / 2)] : 0;
      oct[oi].inkMin = darks.length ? darks[Math.floor(darks.length / 2)] : null;
      oct[oi].gL = gL;
      oct[oi].rays = widths.length;
    }
    out[r.who] = {
      pool: r.poolOct >= 0 ? OCT[r.poolOct] + ' (' + r.poolInfo.kind + ' d=' + r.poolInfo.dist + ')' : 'none',
      arcs: OCT.map((nm, oi) => {
        const o = oct[oi];
        if (o.band.length < 20) return { arc: nm + (oi === r.poolOct ? '*POOL' : ''), n: o.band.length };
        const hs = o.band.map((q) => hsv(q[0], q[1], q[2]));
        const bL = o.band.reduce((s, q) => s + luma(q[0], q[1], q[2]), 0) / o.band.length;
        return {
          arc: nm + (oi === r.poolOct ? '*POOL' : ''),
          n: o.band.length,
          h: +meanHue(hs.map((v) => v[0])).toFixed(1),
          s: +(hs.reduce((s, v) => s + v[1], 0) / hs.length).toFixed(2),
          L: +bL.toFixed(0),
          gL: +o.gL.toFixed(0),
          ratio: +(bL / (o.gL || 1)).toFixed(2),
          hCore: o.core.length >= 8 ? +meanHue(o.core.map((q) => hsv(q[0], q[1], q[2])[0])).toFixed(1) : null,
          nCore: o.core.length,
          rgbCore: o.core.length >= 8 ? [0,1,2].map((k) => Math.round(o.core.reduce((t2, q) => t2 + q[k], 0) / o.core.length)) : null,
          rimPx: +o.w.toFixed(1),
          rimMinL: o.inkMin === null ? null : +o.inkMin.toFixed(0),
          rays: o.rays,
        };
      }),
    };
  }
  window.requestAnimationFrame = raf;
  return out;
})()
