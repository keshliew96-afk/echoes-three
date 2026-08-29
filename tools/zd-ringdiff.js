// PER-ARC IDENTITY-RING MEASUREMENT (polish criterion 2).
//
// Octant scanlines along an assumed ellipse cannot measure a ring that a chibi
// body is standing in: the north arc is occluded, and the "adjacent ground"
// sample lands on the critter. So this probe measures the ring by DIFFERENCE
// on ONE frozen frame:
//
//   A = the frame as shipped
//   B = the same frame with only the ring BAND material hidden (the ring's
//       glow halo, the bodies, the pools and the bloom all stay), so every
//       pixel that differs between A and B is a pixel the band actually paints
//       — occluded arcs simply contribute nothing instead of contributing the
//       occluder.
//
// Ring-local coordinates come from the ring's own world basis projected to
// screen (no camera assumptions): a changed pixel is expressed in the basis
// (screen(+X*half), screen(+Z*half)), which gives an exact radius in band
// fractions and an exact angle even under perspective foreshortening.
//
// Reported per octant: band hue/sat/luma (from A), the ADJACENT GROUND luma in
// the same octant (from B, at ring radius 1.10-1.30 — the lit floor just
// outside the ring, halo included), the band/ground ratio (§17's >=1.6
// legibility fallback), and the darkest ink pixel + its width on the outer
// stroke (§17's >=2 px dark rim fallback).
(() => {
  const p = window.__arenaProbe;
  const st = p.stage;
  const THREE_V3 = st.camera.position.constructor;
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
    return [h, mx ? d / mx : 0];
  };

  // --- collect rings: band mesh + world basis -------------------------------
  const rings = [];
  st.scene.traverse((o) => {
    if (o.name !== 'identity-ring') return;
    let owner = o.parent;
    while (owner && !String(owner.name).startsWith('critter-')) owner = owner.parent;
    let band = null;
    o.traverse((c) => { if (c.isMesh && !c.material.map && c.geometry?.parameters?.width) band = c; });
    if (!band) return;
    const half = band.geometry.parameters.width / 2;
    rings.push({ who: owner ? owner.name.slice(8) : '?', band, half });
  });
  if (!rings.length) return { error: 'no rings' };

  const W = gl.width, H = gl.height;
  const proj = (v) => {
    const q = v.clone().project(st.camera);
    return [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H];
  };
  for (const r of rings) {
    r.band.updateWorldMatrix(true, false);
    const c = new THREE_V3().setFromMatrixPosition(r.band.matrixWorld);
    const px = new THREE_V3(c.x + r.half, c.y, c.z);
    const pz = new THREE_V3(c.x, c.y, c.z + r.half);
    const [cx, cy] = proj(c);
    const [ax, ay] = proj(px);
    const [bx, by] = proj(pz);
    r.c = [cx, cy];
    r.ex = [ax - cx, ay - cy];
    r.ez = [bx - cx, by - cy];
    const det = r.ex[0] * r.ez[1] - r.ex[1] * r.ez[0];
    r.inv = [r.ez[1] / det, -r.ez[0] / det, -r.ex[1] / det, r.ex[0] / det];
    r.reach = Math.max(Math.hypot(...r.ex), Math.hypot(...r.ez)) * 1.45;
    r.oct = Array.from({ length: 8 }, () => ({ band: [], core: [], gnd: [], ink: [], inkW: [] }));
  }

  // ONE RING AT A TIME, ISOLATED. Party rings overlap on the floor when the
  // party is bunched (the Tank's whole east half sits under the Swordsman's
  // ring and under its own badger body), so an all-rings-on diff attributes
  // shared pixels to whichever ring drew last and leaves most arcs unsampled.
  // For each ring the other three critters are hidden, which changes nothing
  // about the ring being measured — it is unlit and composited after bloom, so
  // its colour depends only on the pool light under it — but it exposes every
  // arc. `full` is the as-shipped frame; the screenshot taken after this probe
  // shows that state.
  const critters = [];
  st.scene.traverse((o) => { if (String(o.name).startsWith('critter-')) critters.push(o); });
  const A = grab();
  for (const r of rings) {
    const others = critters.filter((c) => {
      let inside = false;
      c.traverse((q) => { if (q === r.band) inside = true; });
      return !inside;
    });
    for (const c of others) c.visible = false;
    r.A = grab();
    r.band.material.visible = false;
    r.B = grab();
    r.band.material.visible = true;
    for (const c of others) c.visible = true;
  }

  // Band/ink radii in plane-half fractions (render/critters/common.js RING).
  const R = { inkA: [0.52, 0.63], band: [0.65, 0.86], core: [0.70, 0.81], inkB: [0.89, 0.97], gnd: [1.10, 1.30] };
  const at = (img, x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };

  for (const r of rings) {
    const [cx, cy] = r.c;
    const x0 = Math.max(0, Math.floor(cx - r.reach)), x1 = Math.min(W - 1, Math.ceil(cx + r.reach));
    const y0 = Math.max(0, Math.floor(cy - r.reach)), y1 = Math.min(H - 1, Math.ceil(cy + r.reach));
    // Pass 1: mark every pixel the band actually paints.
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const mask = new Uint8Array(bw * bh);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        const u = r.inv[0] * dx + r.inv[1] * dy;
        const v = r.inv[2] * dx + r.inv[3] * dy;
        const rad = Math.hypot(u, v);
        if (rad > R.gnd[1]) continue;
        let ang = (Math.atan2(v, u) * 180) / Math.PI; if (ang < 0) ang += 360;
        const oi = Math.round(ang / 45) % 8;
        const a = at(r.A, x, y), b = at(r.B, x, y);
        const moved = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 12;
        if (rad >= R.band[0] && rad <= R.band[1] && moved) {
          r.oct[oi].band.push(a);
          mask[(y - y0) * bw + (x - x0)] = 1;
        }
        else if (rad >= R.gnd[0] && rad <= R.gnd[1]) r.oct[oi].gnd.push(b);
        else if (rad >= R.inkB[0] && rad <= R.inkB[1] && moved) r.oct[oi].ink.push(a);
      }
    }
    // Pass 2: the band's UNCONTAMINATED interior — the mask eroded by 2 px, so
    // no sample sits within the reach of the shipped FXAA pass (main.js
    // defaults msaa=0) of ANY boundary: the band's own radial edges, the ink
    // strokes, and every grass blade or limb crossing the ring. Those fringes
    // are real pixels but they are blends, not the band's colour, and on a
    // foreshortened arc they are half its screen width.
    for (let y = y0 + 2; y <= y1 - 2; y++) {
      for (let x = x0 + 2; x <= x1 - 2; x++) {
        if (!mask[(y - y0) * bw + (x - x0)]) continue;
        let ok = 1;
        for (let j = -2; j <= 2 && ok; j++)
          for (let i = -2; i <= 2; i++)
            if (!mask[(y - y0 + j) * bw + (x - x0 + i)]) { ok = 0; break; }
        if (!ok) continue;
        const dx = x - cx, dy = y - cy;
        const u = r.inv[0] * dx + r.inv[1] * dy;
        const v = r.inv[2] * dx + r.inv[3] * dy;
        let ang = (Math.atan2(v, u) * 180) / Math.PI; if (ang < 0) ang += 360;
        r.oct[Math.round(ang / 45) % 8].core.push(at(r.A, x, y));
      }
    }
    // outer-ink WIDTH in screen px, per octant: walk a ray outward and count
    // consecutive changed pixels darker than the octant's adjacent ground.
    for (let oi = 0; oi < 8; oi++) {
      const gl0 = r.oct[oi].gnd.length
        ? r.oct[oi].gnd.reduce((s, q) => s + luma(...q), 0) / r.oct[oi].gnd.length : 0;
      const widths = [];
      for (let k = -14; k <= 14; k += 2) {
        const ang = ((oi * 45 + k) * Math.PI) / 180;
        const ux = Math.cos(ang), uz = Math.sin(ang);
        let n = 0;
        let seen = 0;
        for (let t = R.band[0]; t <= R.band[1]; t += 0.01) {
          const sx = Math.round(cx + r.ex[0] * ux * t + r.ez[0] * uz * t);
          const sy = Math.round(cy + r.ex[1] * ux * t + r.ez[1] * uz * t);
          if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
          const a = at(r.A, sx, sy), b = at(r.B, sx, sy);
          if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 12) seen++;
        }
        if (seen < 3) continue; // this ray's band is occluded — not a rim sample
        let inkSeen = 0;
        for (let t = R.band[1]; t <= 1.10; t += 0.004) {
          const sx = Math.round(cx + r.ex[0] * ux * t + r.ez[0] * uz * t);
          const sy = Math.round(cy + r.ex[1] * ux * t + r.ez[1] * uz * t);
          if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
          const a = at(r.A, sx, sy), b = at(r.B, sx, sy);
          const moved = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 12;
          if (moved) inkSeen++;
          if (moved && luma(...a) < gl0 * 0.72) n++;
        }
        // A ray whose outer-stroke annulus is entirely OCCLUDED (a grass blade,
        // a paw, the brazier pedestal standing on the ring) paints no pixels
        // there at all; it is not a zero-width rim, it is not a rim sample.
        if (inkSeen < 3) continue;
        // convert the 0.004 parameter step to screen px along this ray
        const step = Math.hypot(r.ex[0] * ux + r.ez[0] * uz, r.ex[1] * ux + r.ez[1] * uz) * 0.004;
        widths.push(n * step);
      }
      widths.sort((a, b) => a - b);
      r.oct[oi].w = widths.length ? widths[Math.floor(widths.length / 2)] : 0;
      r.oct[oi].gl = gl0;
    }
  }

  const OCT = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const meanHue = (hs) => {
    let sx = 0, sy = 0;
    for (const h of hs) { sx += Math.cos((h * Math.PI) / 180); sy += Math.sin((h * Math.PI) / 180); }
    let d = (Math.atan2(sy, sx) * 180) / Math.PI; if (d < 0) d += 360; return d;
  };
  const out = {};
  for (const r of rings) {
    // Which octant faces the nearest fire? That is the arc the Round C
    // critique measured as drifting 17-24 deg off the class accent.
    let poolOct = -1;
    if (Array.isArray(p.emitters) && p.emitters.length) {
      const c = new THREE_V3().setFromMatrixPosition(r.band.matrixWorld);
      let best = null, bd = 1e9;
      for (const em of p.emitters) {
        const d = (em.x - c.x) ** 2 + (em.z - c.z) ** 2;
        if (d < bd) { bd = d; best = em; }
      }
      if (best) {
        let ang = (Math.atan2(best.z - c.z, best.x - c.x) * 180) / Math.PI;
        if (ang < 0) ang += 360;
        poolOct = Math.round(ang / 45) % 8;
        out[r.who + '_pool'] = { arc: OCT[poolOct], emitter: best.kind ?? '?', dist: +Math.sqrt(bd).toFixed(2) };
      }
    }
    out[r.who] = OCT.map((name, oi) => {
      const o = r.oct[oi];
      if (o.band.length < 6) return { arc: name, n: o.band.length };
      const hs = o.band.map((q) => hsv(q[0], q[1], q[2]));
      const cs = o.core.map((q) => hsv(q[0], q[1], q[2]));
      const bl = o.band.reduce((s, q) => s + luma(...q), 0) / o.band.length;
      const inkL = o.ink.length ? o.ink.reduce((s, q) => s + luma(...q), 0) / o.ink.length : null;
      return {
        arc: name + (oi === poolOct ? '*POOL' : ''),
        n: o.band.length,
        h: +meanHue(hs.map((v) => v[0])).toFixed(1),
        hCore: cs.length >= 4 ? +meanHue(cs.map((v) => v[0])).toFixed(1) : null,
        rgbCore: cs.length >= 4
          ? [0, 1, 2].map((k) => Math.round(o.core.reduce((t, q) => t + q[k], 0) / o.core.length))
          : null,
        nCore: cs.length,
        s: +(hs.reduce((s, v) => s + v[1], 0) / hs.length).toFixed(2),
        L: +bl.toFixed(0),
        gL: +o.gl.toFixed(0),
        ratio: +(bl / (o.gl || 1)).toFixed(2),
        inkL: inkL === null ? null : +inkL.toFixed(0),
        inkPx: +o.w.toFixed(1),
      };
    });
  }
  window.requestAnimationFrame = raf;
  return out;
})()
