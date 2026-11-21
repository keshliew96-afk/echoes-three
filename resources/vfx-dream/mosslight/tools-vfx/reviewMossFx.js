// REVIEW-ONLY (never committed): Mosslight's dream-loop VFX (19 Nov), built to match Kesh's ChatGPT repaints
// in /mnt/project-files/vfx-dream/mosslight/targets/. Heals Bright Heal green with warm gold; her damage
// lantern gold with an arcane purple sparkle at the hit (magic template). Layered on the page's draft looks.
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, DoubleSide, Color, Group, InstancedMesh, Matrix4, Object3D, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Sprite, SpriteMaterial, TubeGeometry, Vector3 } from 'three';

const HEAL = '#5FE873';
const HEAL_HI = '#B8FFB0';
const GOLD = '#FFD36A';
const GOLD_HI = '#FFF0B8';
const LANTERN = '#E8A23D';
const ARCANE = '#A24BFF';

// ---- canvas textures (made once)
const TEX = {};
function canvasTex(key, size, draw) {
  if (TEX[key]) return TEX[key];
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  TEX[key] = t;
  return t;
}
const glowTex = () => canvasTex('glow', 64, (x, s) => {
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
});
const starTex = () => canvasTex('star', 128, (x, s) => {
  const c = s / 2;
  const g = x.createRadialGradient(c, c, 0, c, c, c * 0.35);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  x.fillStyle = 'rgba(255,255,255,0.95)';
  for (const [w, h] of [[0.05, 0.48], [0.48, 0.05]]) {
    x.beginPath(); x.moveTo(c - w * s, c); x.lineTo(c, c - h * s); x.lineTo(c + w * s, c); x.lineTo(c, c + h * s); x.closePath(); x.fill();
  }
});
const lineTex = () => canvasTex('line', 64, (x, s) => { // soft across, solid along
  const g = x.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,255,255,0.7)'); g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(0.58, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
});
const leafTex = () => canvasTex('leaf', 64, (x, s) => {
  x.translate(s / 2, s / 2); x.rotate(-0.6);
  x.fillStyle = '#6FC24A';
  x.beginPath(); x.moveTo(0, -s * 0.44); x.quadraticCurveTo(s * 0.26, -s * 0.05, 0, s * 0.42); x.quadraticCurveTo(-s * 0.26, -s * 0.05, 0, -s * 0.44); x.fill();
  x.strokeStyle = '#2F6A26'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -s * 0.38); x.lineTo(0, s * 0.38); x.stroke();
});
const flowerTex = () => canvasTex('flower', 64, (x, s) => {
  const c = s / 2;
  x.fillStyle = '#FBF8EE';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    x.beginPath(); x.ellipse(c + Math.cos(a) * s * 0.19, c + Math.sin(a) * s * 0.19, s * 0.17, s * 0.12, a, 0, Math.PI * 2); x.fill();
  }
  x.strokeStyle = 'rgba(150,140,110,0.6)'; x.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; x.beginPath(); x.ellipse(c + Math.cos(a) * s * 0.19, c + Math.sin(a) * s * 0.19, s * 0.17, s * 0.12, a, 0, Math.PI * 2); x.stroke(); }
  x.fillStyle = '#F2C94C'; x.beginPath(); x.arc(c, c, s * 0.09, 0, Math.PI * 2); x.fill();
});
// Swiftleaf's leaf: base on the left, tip on the right; deep green to lime to a yellow tip, pale rim, dark vein
const leaf2Tex = () => canvasTex('leaf2', 256, (x, s) => {
  const h = s / 2;
  const path = () => { x.beginPath(); x.moveTo(6, h); x.bezierCurveTo(s * 0.3, h - s * 0.56, s * 0.75, h - s * 0.5, s - 4, h); x.bezierCurveTo(s * 0.75, h + s * 0.5, s * 0.3, h + s * 0.56, 6, h); x.closePath(); }; // a broad leaf filling ~85% of the plane
  const g = x.createLinearGradient(0, 0, s, 0);
  g.addColorStop(0, '#23802C'); g.addColorStop(0.25, '#23802C'); g.addColorStop(0.55, '#55D03A'); g.addColorStop(0.8, '#55D03A'); g.addColorStop(1, '#F2DC4A');
  path(); x.fillStyle = g; x.fill();
  x.save(); path(); x.clip(); x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(0, 0, s, h); x.restore(); // the darker half
  x.lineWidth = 1; x.strokeStyle = '#BFF58A'; path(); x.stroke();
  x.strokeStyle = '#1F5E22'; x.lineWidth = 4; x.beginPath(); x.moveTo(8, h); x.lineTo(s - 12, h); x.stroke();
  x.lineWidth = 1.5;
  for (let i = 1; i < 5; i++) { const px = (i / 5) * s * 0.8; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(px, h); x.lineTo(px + s * 0.08, h + sg * s * 0.2); x.stroke(); } }
});
// a lane bed: green, brighter towards the rim, with moss flecks
const bedTex = () => canvasTex('bed', 256, (x, s) => {
  x.fillStyle = 'rgba(150,215,70,0.24)'; x.fillRect(0, 0, s, s);
  for (const [a, b] of [[0, 0.16], [1, 0.84]]) {
    const g = x.createLinearGradient(a * s, 0, b * s, 0);
    g.addColorStop(0, 'rgba(170,240,90,0.25)'); g.addColorStop(1, 'rgba(170,240,90,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
  }
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const px = rnd() * s, py = rnd() * s, edge = Math.min(px, s - px) / s;
    if (rnd() < edge * 2.2) continue; // flecks hug the rim
    x.fillStyle = rnd() < 0.5 ? 'rgba(60,140,50,0.55)' : 'rgba(140,210,90,0.5)';
    x.beginPath(); x.ellipse(px, py, 2 + rnd() * 4, 1 + rnd() * 2, rnd() * 3, 0, Math.PI * 2); x.fill();
  }
});
// moss for Rootspear's row: a deeper, leafier green
const mossTex = () => canvasTex('moss', 256, (x, s) => {
  x.fillStyle = 'rgba(80,170,70,0.8)'; x.fillRect(0, 0, s, s);
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 420; i++) {
    x.fillStyle = ['rgba(50,120,40,0.55)', 'rgba(120,200,80,0.5)', 'rgba(70,150,55,0.6)'][i % 3];
    x.beginPath(); x.ellipse(rnd() * s, rnd() * s, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd() * 3, 0, Math.PI * 2); x.fill();
  }
});
// a darker moss for the Dew Wave lane's frame
const mossDarkTex = () => canvasTex('mossDark', 256, (x, s) => {
  x.fillStyle = 'rgba(52,120,42,0.8)'; x.fillRect(0, 0, s, s);
  let seed = 31; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 500; i++) {
    x.fillStyle = i % 2 ? '#2F7A2A' : '#7CC456';
    x.beginPath(); x.ellipse(rnd() * s, rnd() * s, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd() * 3, 0, Math.PI * 2); x.fill();
  }
});
// the same moss, feathered: soft long sides and a soft far end (the canvas's v=0 edge is the far end)
const mossSoftTex = () => canvasTex('mossSoft', 256, (x, s) => {
  x.drawImage(mossTex().image, 0, 0);
  x.globalCompositeOperation = 'destination-in';
  const gx = x.createLinearGradient(0, 0, s, 0);
  gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.11, 'rgba(0,0,0,1)'); gx.addColorStop(0.89, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gx; x.fillRect(0, 0, s, s);
  const gy = x.createLinearGradient(0, 0, 0, s);
  gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.08, 'rgba(0,0,0,1)'); gy.addColorStop(0.97, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gy; x.fillRect(0, 0, s, s);
  // clover clumps
  x.globalCompositeOperation = 'source-over';
  let seed = 23; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) {
    const px = s * (0.12 + rnd() * 0.76), py = s * (0.1 + rnd() * 0.86);
    x.fillStyle = i % 2 ? 'rgba(90,160,60,0.85)' : 'rgba(60,125,45,0.85)';
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + rnd(); x.beginPath(); x.arc(px + Math.cos(a) * 3, py + Math.sin(a) * 3, 3, 0, Math.PI * 2); x.fill(); }
  }
});
// roots spreading from a foe's feet: dark bark lines with a gold glow in the main ones
const rootsTex = () => canvasTex('roots', 256, (x, s) => {
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const c = s / 2;
  const branch = (px, py, a, len, w, depth, glow) => {
    if (depth <= 0 || len < 4) return;
    let ex = px, ey = py, aa = a;
    const pts = [[px, py]];
    const bend = (rnd() < 0.5 ? -1 : 1) * 0.35; // a slight S
    for (let k = 0; k < 4; k++) { aa += (rnd() - 0.5) * 0.5 + (k < 2 ? bend : -bend); ex += Math.cos(aa) * len / 4; ey += Math.sin(aa) * len / 4; pts.push([ex, ey]); }
    // body tapers from twice the width at the base to w at the tip; the main roots carry a thin gold line on top
    x.lineCap = 'round'; x.strokeStyle = '#7A5530';
    for (let j = 0; j < pts.length - 1; j++) { x.lineWidth = w * (2 - j / (pts.length - 2)); x.beginPath(); x.moveTo(pts[j][0], pts[j][1]); x.lineTo(pts[j + 1][0], pts[j + 1][1]); x.stroke(); }
    if (glow) { x.strokeStyle = 'rgba(232,162,61,0.8)'; x.lineWidth = 2; x.beginPath(); x.moveTo(pts[0][0], pts[0][1] - 1); for (const p of pts) x.lineTo(p[0], p[1] - 1); x.stroke(); }
    const n = 1 + (rnd() < 0.6 ? 1 : 0);
    for (let k = 0; k < n; k++) branch(ex, ey, aa + (rnd() - 0.5) * 1.3, len * 0.62, w * 0.62, depth - 1, glow && k === 0);
    if (glow) { const fp = pts[2], fa = aa + (rnd() < 0.5 ? -1 : 1) * 0.44; branch(fp[0] + (pts[3][0] - fp[0]) * 0.6, fp[1] + (pts[3][1] - fp[1]) * 0.6, fa, len * 0.3, w * 0.5, 1, false); } // a short fork at ~65%
  };
  for (let i = 0; i < 11; i++) branch(c, c, (i / 11) * Math.PI * 2 + rnd() * 0.3, 48 + rnd() * 40, 9, 4, true);
  const g = x.createRadialGradient(c, c, 0, c, c, 45);
  g.addColorStop(0, 'rgba(79,107,42,1)'); g.addColorStop(0.7, 'rgba(79,107,42,0.85)'); g.addColorStop(1, 'rgba(79,107,42,0)');
  x.fillStyle = g; x.beginPath(); x.arc(c, c, 45, 0, Math.PI * 2); x.fill();
});

// a round moss mound for a rooted foe's feet: the moss texture with a radial falloff
const mossRoundTex = () => canvasTex('mossRound', 256, (x, s) => {
  x.drawImage(mossTex().image, 0, 0);
  x.globalCompositeOperation = 'destination-in';
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
});
// a rune ring: a thin circle with small square runes round it (Wispfall's landing)
// crit=true: drawn at 512 px with lines thinned for the 1.5 u crit ring, so it is not a heavy band when stretched
const runeTex = (crit = false) => canvasTex(crit ? 'runeCrit' : 'rune', crit ? 512 : 256, (x, s) => {
  const k = crit ? 2 : 1, c = s / 2, r = s * 0.42, lw = crit ? 0.6 : 1, sq = crit ? 13 : 18;
  x.shadowColor = 'rgba(255,255,255,0.9)'; x.shadowBlur = 10 * k;
  x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 5 * k * lw;
  x.beginPath(); x.arc(c, c, r, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2.5 * k * lw; x.strokeStyle = 'rgba(255,255,255,0.5)';
  x.beginPath(); x.arc(c, c, r * 0.86, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2.5 * k * lw; x.strokeStyle = 'rgba(255,255,255,0.95)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, h = (sq / 2) * k;
    x.save(); x.translate(c + Math.cos(a) * r, c + Math.sin(a) * r); x.rotate(a + Math.PI / 4);
    x.clearRect(-h - 3 * k, -h - 3 * k, 2 * h + 6 * k, 2 * h + 6 * k); x.strokeRect(-h, -h, 2 * h, 2 * h); x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(-3 * k * lw, -3 * k * lw, 6 * k * lw, 6 * k * lw); x.restore();
  }
});
// a long spark streak (for starbursts): bright along the middle, fading to both ends
const streakTex = () => canvasTex('streak', 64, (x, s) => {
  const g = x.createLinearGradient(0, 0, s, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, s * 0.44, s, s * 0.12);
});

export function createReviewMossFx({ bus, root, world, tip }) {
  globalThis.__reviewMossFx = true; // the page's own Dew Wave tufts step aside for the meadow
  const live = []; // { t, life, tick(o, k, dt) , dispose }
  const add = (o) => { live.push(o); return o; };
  const flat = (w, l, map, color, op, blend = true) => {
    const m = new Mesh(new PlaneGeometry(w, l), new MeshBasicMaterial({ map, color, transparent: true, opacity: op, depthWrite: false, side: DoubleSide, blending: blend ? AdditiveBlending : undefined }));
    m.rotation.x = -Math.PI / 2;
    return m;
  };
  const spr = (map, color, scale, add2 = true) => {
    const s = new Sprite(new SpriteMaterial({ map, color, transparent: true, depthWrite: false, opacity: 0, blending: add2 ? AdditiveBlending : undefined }));
    s.scale.setScalar(scale);
    return s;
  };
  // a meadow blade: one unit tall, tapering to a point and bending forward, darker at the root (vertex colour)
  const bladeGeo = (() => {
    const pos = [], col = [], idx = [], R = 4;
    for (let k = 0; k <= R; k++) {
      const h = k / R, w = 0.045 * (1 - h) + 0.004, z = 0.28 * h * h, c = 0.55 + 0.45 * h;
      pos.push(-w, h, z, w, h, z); col.push(c, c, c, c, c, c);
      if (k < R) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  })();
  const meadowMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide, emissive: '#2E6A24', emissiveIntensity: 0.1 });
  const vineMat = new MeshStandardMaterial({ color: '#5DA845', roughness: 0.6, emissive: '#3E8A30', emissiveIntensity: 0.2 });
  const ease = (k) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;
  const fadeLife = (t, inT, life, outT) => Math.min(1, t / inT) * Math.min(1, Math.max(0, (life - t) / outT));
  const dispose = (g) => { root.remove(g); g.traverse((m) => { if (m.geometry && m.geometry !== bladeGeo) m.geometry.dispose(); if (m.material && m.material !== meadowMat && m.material !== vineMat) m.material.dispose(); }); };
  // a curl: a tendril rising from (x,z) on the floor, spiralling outwards and up
  const curl = (x, z, ax, az, h, turns, r) => {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const k = i / 16, a = k * turns * Math.PI * 2;
      let rr = r * (0.3 + k);
      rr *= 1 - 0.7 * Math.max(0, k - 0.66) / 0.34;
      pts.push(new Vector3(x + ax * k * r * 1.6 + Math.cos(a) * rr * 0.4, k * h, z + az * k * r * 1.6 + Math.sin(a) * rr * 0.4));
    }
    return new CatmullRomCurve3(pts);
  };
  const ribbon = (curve, color, rad, op) => {
    const m = new Mesh(new TubeGeometry(curve, 48, rad, 4, false), new MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, blending: AdditiveBlending }));
    return m;
  };

  // ================================================================ S12 Dew Wave
  let dewLast = null;
  bus.on('review_k20_lane', (ev) => { if (dewLast && dewLast.t < 0.05) dewLast.life = ev.secs + 0.45; dewLast = null; });
  bus.on('review_rect', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    g.rotation.y = Math.atan2(ev.dx, ev.dz); // local +z = along the lane, +x = across
    const W = ev.width, L = ev.len;
    const bed = flat(W, L, bedTex(), '#FFFFFF', 0, false);
    bed.position.set(0, 0.035, L / 2);
    g.add(bed);
    // glowing rim, four sides
    const rims = [];
    for (const [w, l, px, pz] of [[0.05, L, -W / 2, L / 2], [0.05, L, W / 2, L / 2], [W + 0.05, 0.05, 0, 0], [W + 0.05, 0.05, 0, L]]) {
      const r = flat(w > l ? w : l, 0.05, lineTex(), '#D8FF9A', 0);
      if (w < l) r.rotation.z = Math.PI / 2;
      r.position.set(px, 0.04, pz);
      g.add(r); rims.push(r);
    }
    const mossB = [];
    for (const [w, l, px, pz] of [[0.2, L, -W / 2 + 0.12, L / 2], [0.2, L, W / 2 - 0.12, L / 2], [W - 0.04, 0.2, 0, 0.12], [W - 0.04, 0.2, 0, L - 0.12], [0.5, 0.5, -W / 2 + 0.28, 0.28], [0.5, 0.5, W / 2 - 0.28, 0.28]]) {
      const m = flat(w, l, mossDarkTex(), '#FFFFFF', 0, false);
      m.position.set(px, 0.038, pz);
      g.add(m); mossB.push(m);
    }
    // Kesh 19 Nov: the lane's grass is a natural meadow (自然草地) with a few small flowers: short clumps of thin
    // curved blades in mixed greens, scattered and clustered over the whole lane, swaying a little; thicker at the rim
    let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const clumps = [];
    const clump = (px, pz, sc) => clumps.push({ px, pz, sc: sc * (0.75 + rnd() * 0.5), at: (pz / L) * 0.32 + rnd() * 0.05, ph: rnd() * 6, n: 3 + Math.floor(rnd() * 4), yaw: rnd() * 6.28 });
    const cells = Math.round(W * L / 0.055); // ~one clump every 0.23 u, so the ground shows between
    for (let i = 0; i < cells; i++) {
      const px = (rnd() - 0.5) * (W - 0.08), pz = 0.04 + rnd() * (L - 0.08);
      if (rnd() < 0.25 && Math.abs(px) < W / 2 - 0.25) continue; // a few bare patches
      clump(px, pz, 0.1 + rnd() * 0.06);
    }
    for (let i = 0; i < Math.round(L / 0.12); i++) { const side = i % 2 ? 1 : -1; clump(side * (W / 2 - 0.05 - rnd() * 0.12), rnd() * L, 0.17 + rnd() * 0.05); } // the rim fringe
    const MEADOW = ['#2F6B28', '#3F8434', '#4E9A3E', '#5EAD45', '#77BE4E', '#9ACD5E', '#3A7A30'].map((c) => new Color(c));
    let nb = 0; for (const c of clumps) nb += c.n;
    const meadow = new InstancedMesh(bladeGeo, meadowMat, nb);
    meadow.frustumCulled = false;
    const blades = [];
    for (const c of clumps) {
      for (let k = 0; k < c.n; k++) {
        blades.push({ c, ox: (rnd() - 0.5) * 0.07, oz: (rnd() - 0.5) * 0.07, h: c.sc * (0.6 + rnd() * 0.6), yaw: c.yaw + (k / c.n) * 6.28 + rnd() * 0.8, tilt: 0.1 + rnd() * 0.35 });
        meadow.setColorAt(blades.length - 1, MEADOW[Math.floor(rnd() * MEADOW.length)]);
      }
    }
    meadow.instanceColor.needsUpdate = true;
    g.add(meadow);
    const dummy = new Object3D();
    const setMeadow = (t, grow) => {
      blades.forEach((b, i) => {
        const k = ease((t - b.c.at) / 0.2) * grow, sway = Math.sin(t * 2.2 + b.c.ph + b.c.px * 3) * 0.12;
        dummy.position.set(b.c.px + b.ox, 0.03, b.c.pz + b.oz);
        dummy.rotation.set(b.tilt * 0.6 + sway, b.yaw, 0, 'YXZ');
        dummy.scale.set(k + 0.001, b.h * k + 0.001, k + 0.001);
        dummy.updateMatrix(); meadow.setMatrixAt(i, dummy.matrix);
      });
      meadow.instanceMatrix.needsUpdate = true;
    };
    setMeadow(0, 0);
    // a few small wild flowers in the meadow: mostly white, some butter yellow, two pink
    const wild = [];
    const nf = Math.max(8, Math.round(W * L * 1.6));
    for (let i = 0; i < nf; i++) {
      const px = (rnd() - 0.5) * (W - 0.3), pz = 0.55 + rnd() * (L - 0.75);
      const tint = i % 5 === 3 ? '#F6E08A' : i % 7 === 5 ? '#F2C2CF' : '#F4F0E2';
      const sc = 0.17 + rnd() * 0.06;
      const fw = flat(sc, sc, flowerTex(), tint, 0, false);
      fw.position.set(px, 0.17 + rnd() * 0.04, pz); fw.rotation.z = rnd() * 6;
      fw.userData = { at: (pz / L) * 0.32 + 0.08 };
      g.add(fw); wild.push(fw);
    }
    // flowers at the near corners
    const flowers = [];
    for (const [px, pz, sc0] of [[-W / 2 + 0.18, 0.2, 0.24], [-W / 2 + 0.34, 0.36, 0.2], [-W / 2 + 0.14, 0.42, 0.2], [W / 2 - 0.2, 0.18, 0.26], [W / 2 - 0.36, 0.32, 0.2], [W / 2 - 0.12, 0.44, 0.22]]) {
      const sc = sc0 * 1.15;
      const f = flat(sc, sc, flowerTex(), '#EDE8D2', 0, false);
      f.position.set(px, 0.2, pz); // above the meadow
      g.add(f); flowers.push(f);
    }
    // the wave front: a thin gold-white line across the lane with leaf fans at both ends
    const front = new Group();
    const fl = flat(W + 0.3, 0.07, lineTex(), '#FFE45C', 0);
    const fc = flat(W + 0.1, 0.025, lineTex(), '#FFFFFF', 0);
    const fh = flat(W + 0.9, 0.28, lineTex(), '#FFE45C', 0);
    fl.position.y = 0.32; fc.position.y = 0.325; fh.position.y = 0.3;
    front.add(fh, fl, fc);
    const fans = [];
    for (const side of [-1, 1]) {
      for (let k = 0; k < 8; k++) {
        const lf = spr(leafTex(), '#FFFFFF', 0.32, false);
        lf.userData = { side, k };
        front.add(lf); fans.push(lf);
      }
      const knot = spr(flowerTex(), '#E9E4CC', 0.2, false);
      knot.position.set(side * (W / 2 + 0.1), 0.32, 0);
      knot.userData = { side, k: -1 };
      front.add(knot); fans.push(knot);
    }
    g.add(front);
    // curling vines up both sides and gold ribbons swinging round the lane
    const vines = [];
    for (const [px, pz, side, h, turns] of [[-W / 2 - 0.08, L * 0.12, -1, 1.0, 1.4], [-W / 2 - 0.05, L * 0.45, -1, 0.7, 1.2], [-W / 2 - 0.06, L * 0.8, -1, 0.6, 1.3], [W / 2 + 0.08, L * 0.15, 1, 0.95, -1.4], [W / 2 + 0.05, L * 0.5, 1, 0.75, -1.2], [W / 2 + 0.06, L * 0.85, 1, 0.6, -1.3]]) {
      const cv = curl(px, pz, side, 0, h, Math.sign(turns) * 1.8, 0.26);
      const v = new Mesh(new TubeGeometry(cv, 40, 0.026, 5, false), vineMat);
      v.geometry.setDrawRange(0, 0);
      g.add(v); vines.push(v);
      for (const k of [0.45, 0.7, 1]) {
        const lf = spr(leafTex(), '#FFFFFF', 0.24, false);
        lf.position.copy(cv.getPoint(k)); lf.material.rotation = side * (0.4 + k);
        g.add(lf); vines.push(lf);
      }
    }
    const ribbons = [];
    for (const [side, z0, h0, bow, twin] of [[-1, 0.15, 0.2, 0.15, true], [-1, L * 0.55, 0.35, 0.4, false], [1, 0.3, 0.25, 0.4, true], [1, L * 0.62, 0.3, 0.15, false]]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(new Vector3(side * (W / 2 + 0.05 + Math.sin(k * Math.PI) * bow), h0 + 0.3 * k, z0 + 0.8 * k)); }
      const e = pts[pts.length - 1];
      for (let i = 1; i <= 10; i++) { const a = (i / 10) * Math.PI * 2.5, rr = 0.22 * (1 - i / 12); pts.push(new Vector3(e.x + side * Math.sin(a) * rr, e.y + 0.02 * i, e.z + 0.18 - Math.cos(a) * rr)); }
      const op = side < 0 ? 0.42 : 0.5; // the left moss strip sat under these
      const r = ribbon(new CatmullRomCurve3(pts), '#FFC94A', 0.013, op);
      if (twin) { const r2 = ribbon(new CatmullRomCurve3(pts.map((q) => new Vector3(q.x + side * 0.06, q.y, q.z))), '#FFC94A', 0.007, 0.3);
        r2.geometry.setDrawRange(0, 0); r2.userData.op = 0.3; g.add(r2); ribbons.push(r2); }
      for (const k of [0.75, 0.95]) { const st = spr(starTex(), GOLD_HI, 0.1); st.position.copy(pts[Math.floor(k * (pts.length - 1))]); g.add(st); vines.push(st); }
      r.geometry.setDrawRange(0, 0);
      r.userData.op = op;
      g.add(r); ribbons.push(r);
    }
    // drifting leaves and gold motes round the lane
    const motes = [];
    for (let i = 0; i < 26; i++) {
      const leaf = i % 3 === 0;
      const s = spr(leaf ? leafTex() : glowTex(), leaf ? '#FFFFFF' : GOLD, leaf ? 0.14 : 0.07, !leaf);
      const side = rnd() < 0.5 ? -1 : 1;
      s.position.set(side * (W / 2 + 0.1 + rnd() * 0.9), 0.1 + rnd() * 0.9, rnd() * L * 1.1);
      s.userData = { vy: 0.15 + rnd() * 0.3, vx: side * (0.05 + rnd() * 0.2), ph: rnd() * 6, at: rnd() * 0.25 };
      g.add(s); motes.push(s);
    }
    // the healed: a soft green bloom at each ally inside
    const glows = [];
    for (const e of world.entities()) {
      if (e.partyIndex === undefined || e.partyIndex === 0 || !(e.hp > 0)) continue;
      const rx = e.x - ev.x, rz = e.z - ev.z;
      const along = rx * ev.dx + rz * ev.dz, across = Math.abs(rx * -ev.dz + rz * ev.dx);
      if (along < -0.3 || along > L + 0.3 || across > W / 2 + 0.3) continue;
      const s = spr(glowTex(), HEAL_HI, 0.55);
      s.position.set(e.x, 0.55, e.z);
      s.userData = { at: (along / L) * 0.3 };
      root.add(s); glows.push(s);
    }
    // foes it touches: an arcane-purple fizz
    const fizz = [];
    for (const e of world.entities()) {
      if (e.faction !== 'hostile' || !e.hittable) continue;
      const rx = e.x - ev.x, rz = e.z - ev.z;
      const along = rx * ev.dx + rz * ev.dz, across = Math.abs(rx * -ev.dz + rz * ev.dx);
      if (along < -0.3 || along > L + 1.0 || across > W / 2 + 1.0) continue;
      { const a0 = rnd() * 6; const pts = []; for (let i = 0; i <= 12; i++) { const a = a0 + (i / 12) * 2.2; pts.push(new Vector3(e.x + Math.cos(a) * 0.45, 0.4 + i * 0.03, e.z + Math.sin(a) * 0.35)); }
        const arc = ribbon(new CatmullRomCurve3(pts), ARCANE, 0.01, 0.5); arc.userData = { ph: 0, arc: true }; root.add(arc); fizz.push(arc); }
      for (let k = 0; k < 7; k++) {
        const s = spr(starTex(), k % 3 ? ARCANE : '#E6CCFF', 0.08 + rnd() * 0.08);
        s.position.set(e.x + (rnd() - 0.5) * 0.9, 0.3 + rnd() * 0.9, e.z + (rnd() - 0.5) * 0.6);
        s.userData = { ph: rnd() * 6 };
        root.add(s); fizz.push(s);
      }
    }
    // no foliage over the lane: every leaf sprite stays outside the rim
    const clampOut = (s) => { if (Math.abs(s.position.x) < W / 2 + 0.05) s.position.x = (Math.sign(s.position.x) || 1) * (W / 2 + 0.05); };
    for (const v of vines) if (v.isSprite && v.material.map === leafTex()) clampOut(v);
    root.add(g);
    // Kesh 19 Nov: the look lasts as long as the skill's wet lane (kit 2.0 L3, 3 s; review_k20_lane follows this event in the same tick)
    dewLast = add({ t: 0, life: 3.0 + 0.45, done: () => { dispose(g); for (const s of [...glows, ...fizz]) { root.remove(s); s.material.dispose(); if (s.geometry && !s.isSprite) s.geometry.dispose(); } }, tick(o) {
      const LIFE = o.life, t = o.t, f = fadeLife(t, 0.06, LIFE, 0.45);
      bed.material.opacity = 0.8 * f;
      for (const r of rims) r.material.opacity = 0.75 * f;
      for (const m of mossB) m.material.opacity = 0.92 * f;
      setMeadow(t, Math.min(1, Math.max(0, (LIFE - t) / 0.35)));
      for (const fw of wild) fw.material.opacity = f * ease((t - fw.userData.at) / 0.15);
      for (const fw of flowers) fw.material.opacity = f * ease(t / 0.12);
      const roll = Math.min(1, t / 0.32);
      front.position.z = roll * L;
      const ff = t < 0.32 ? Math.min(1, t / 0.03) : Math.max(0, 1 - (t - 0.32) / 0.25);
      fl.material.opacity = 0.95 * ff; fc.material.opacity = 0.9 * ff; fh.material.opacity = 0.3 * ff;
      for (const lf of fans) {
        const { side, k } = lf.userData;
        if (k < 0) { lf.material.opacity = 0.85 * ff; continue; }
        const a = -0.9 + (k / 7) * 1.8, sp = 0.2 + 0.25 * ease(t / 0.1);
        lf.position.set(side * (W / 2 + 0.12 + Math.cos(a) * sp), 0.32 + Math.abs(Math.sin(a)) * sp * 0.6, Math.sin(a) * sp);
        lf.material.rotation = side * (0.6 + a * 0.5);
        if (Math.abs(lf.position.x) < W / 2 + 0.05) lf.position.x = side * (W / 2 + 0.05);
        lf.material.opacity = ff;
      }
      for (const v of vines) {
        if (v.isSprite) { v.material.opacity = f * ease((t - 0.03) / 0.05); continue; }
        v.geometry.setDrawRange(0, Math.floor(v.geometry.index.count * ease(t / 0.08)));
        v.scale.y = Math.min(1, (LIFE - t) / 0.35) + 0.0001;
      }
      for (const r of ribbons) { r.geometry.setDrawRange(0, Math.floor(r.geometry.index.count * ease(t / 0.09))); r.material.opacity = r.userData.op * f; }
      for (const s of motes) {
        const u = s.userData;
        if (u.x0 == null) { u.x0 = s.position.x; u.y0 = s.position.y; }
        s.position.y += u.vy * o.dt; s.position.x += u.vx * o.dt;
        if (s.position.y > 1.4) { s.position.y = 0.1; s.position.x = u.x0; } // drift on a loop for the lane's whole life
        if (s.material.map === leafTex() && Math.abs(s.position.x) < W / 2 + 0.05) s.position.x = Math.sign(u.vx) * (W / 2 + 0.05);
        s.material.opacity = f * ease((t - u.at) / 0.1) * (0.6 + 0.4 * Math.sin(t * 9 + u.ph));
      }
      for (const s of glows) { const k = t - s.userData.at; s.material.opacity = k < 0 ? 0 : 0.75 * Math.min(1, k / 0.05) * Math.max(0, 1 - k / 0.7); }
      for (const s of fizz) s.material.opacity = s.userData.arc ? 0.5 * Math.max(0, 1 - t / 0.7) : Math.max(0, 1 - t / 0.8) * (0.55 + 0.45 * Math.sin(t * 14 + s.userData.ph));
    } });
  });

  // ================================================================ S21 Rootspear
  bus.on('review_spear', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    g.rotation.y = Math.atan2(ev.dx, ev.dz);
    const W = ev.width, L = ev.len;
    let seed = 9; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const bed = flat(W, L - 0.3, mossSoftTex(), '#7F9A45', 0, false);
    bed.position.set(0, 0.03, 0.15 + (L - 0.3) / 2);
    g.add(bed);
    // a winding gold vine down the row, white flowers and leaves on it
    const pts = [];
    for (let i = 0; i <= 28; i++) { const k = i / 28; pts.push(new Vector3((Math.sin(k * 17.3 + 0.7) * 0.6 + Math.sin(k * 7.1 + 2.1) * 0.4) * W * 0.32, 0.05, 0.6 + k * (L - 0.8))); }
    const vineCurve = new CatmullRomCurve3(pts);
    const vine = new Mesh(new TubeGeometry(vineCurve, 160, 0.01, 4, false), vineMat);
    const vineGlow = ribbon(vineCurve, LANTERN, 0.02, 0.45);
    const sideCurls = [];
    for (let i = 0; i < 6; i++) {
      const p0 = vineCurve.getPoint((i + 0.5) / 6), sd = i % 2 ? 1 : -1, cp = [];
      for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI * 1.6, rr = 0.12 * (1 - k / 14); cp.push(new Vector3(p0.x + sd * (k / 10) * 0.15 + sd * Math.sin(a) * rr, 0.05, p0.z + 0.1 * (k / 10) - Math.cos(a) * rr + rr)); }
      const cm = ribbon(new CatmullRomCurve3(cp), LANTERN, 0.012, 0.6);
      cm.geometry.setDrawRange(0, 0); g.add(cm); sideCurls.push(cm);
    }
    vine.geometry.setDrawRange(0, 0); vineGlow.geometry.setDrawRange(0, 0);
    g.add(vine, vineGlow);
    // gold glints twinkling along the vine
    const glints = [];
    for (let i = 0; i < 12; i++) {
      const k = 0.04 + rnd() * 0.92, p = vineCurve.getPoint(k);
      const s = spr(glowTex(), LANTERN, 0.05 + rnd() * 0.03);
      s.position.set(p.x + (rnd() - 0.5) * 0.6, 0.08, p.z);
      s.userData = { k, ph: rnd() * 6 };
      g.add(s); glints.push(s);
    }
    const bloom = [];
    for (let i = 0; i < 21; i++) {
      const k = (i + 0.5) / 21, p = vineCurve.getPoint(k);
      const isF = i % 3 !== 2;
      const m = flat(isF ? 0.2 : 0.22, isF ? 0.2 : 0.22, isF ? flowerTex() : leafTex(), isF ? '#DDD8CC' : '#FFFFFF', 0, false);
      m.position.set(p.x + (rnd() - 0.5) * 0.25, 0.07, p.z + (rnd() - 0.5) * 0.2);
      m.rotation.z = rnd() * 6;
      m.userData = { k };
      g.add(m); bloom.push(m);
    }
    root.add(g);
    // each foe in the row: roots spread from its feet, a gold band winds round it, purple sparks at its feet
    const foes = [];
    for (const e of world.entities()) {
      if (e.faction !== 'hostile' || !e.hittable) continue;
      const rx = e.x - ev.x, rz = e.z - ev.z;
      const along = rx * ev.dx + rz * ev.dz, across = Math.abs(rx * -ev.dz + rz * ev.dx);
      if (along < -0.3 || along > L + 0.3 || across > W / 2 + (e.radius || 0.3)) continue;
      const fg = new Group();
      fg.position.set(e.x, 0, e.z);
      const decal = flat(1.6, 1.1, rootsTex(), '#D8D0C0', 0, false); // long along the row
      decal.position.y = 0.045; decal.rotation.z = Math.atan2(-ev.dz, ev.dx) + (rnd() - 0.5) * 0.6;
      const mound = flat(1.25, 1.25, mossRoundTex(), '#5F7F34', 0, false);
      mound.position.y = 0.048; fg.add(mound);
      const halo = flat(1.5, 1.0, glowTex(), LANTERN, 0); halo.rotation.z = decal.rotation.z;
      const pglow = flat(0.6, 0.6, glowTex(), ARCANE, 0);
      pglow.position.y = 0.055; fg.add(pglow);
      halo.position.y = 0.05;
      fg.add(halo, decal);
      // 3D root curls at the feet
      const curls = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + rnd() * 0.5;
        const c = new Mesh(new TubeGeometry(curl(Math.cos(a) * 0.22, Math.sin(a) * 0.22, Math.cos(a), Math.sin(a), 0.28, 0.6, 0.18), 20, 0.022, 4, false), new MeshStandardMaterial({ color: '#6B4A2A', roughness: 0.9 }));
        c.geometry.setDrawRange(0, 0);
        fg.add(c); curls.push(c);
      }
      // a gold band winding up round its body
      const band = [];
      for (let i = 0; i <= 24; i++) { const k = i / 24, a = k * Math.PI * 1.6 + rnd() * 0.1; band.push(new Vector3(Math.cos(a) * (0.42 - k * 0.12), 0.25 + k * 1.0, Math.sin(a) * (0.42 - k * 0.12) * 0.9)); }
      const bandMesh = ribbon(new CatmullRomCurve3(band), LANTERN, 0.012, 0.55);
      bandMesh.geometry = new TubeGeometry(new CatmullRomCurve3(band.slice(0, 18)), 36, 0.012, 4, false); // the last 30% left off: a tapering tail
      const tailMesh = ribbon(new CatmullRomCurve3(band.slice(17)), LANTERN, 0.006, 0.3); fg.add(tailMesh);
      bandMesh.geometry.setDrawRange(0, 0);
      fg.add(bandMesh);
      const sparks = [];
      for (let k = 0; k < 6; k++) {
        const s = spr(starTex(), k % 3 ? ARCANE : '#EAD6FF', 0.22 + rnd() * 0.1);
        const a = rnd() * 6.28;
        s.position.set(Math.cos(a) * 0.3, 0.05 + rnd() * 0.2, Math.sin(a) * 0.3);
        s.userData = { ph: rnd() * 6 };
        fg.add(s); sparks.push(s);
      }
      const leaves = [];
      for (let k = 0; k < 6; k++) {
        const s = spr(k % 3 === 0 ? flowerTex() : k % 3 === 1 ? leafTex() : glowTex(), k % 3 === 0 ? '#F2B8C6' : k % 3 === 1 ? '#FFFFFF' : GOLD, k % 3 === 2 ? 0.06 : 0.13, k % 3 === 2);
        const a = rnd() * 6.28;
        s.position.set(Math.cos(a) * 0.4, 0.3 + rnd() * 0.6, Math.sin(a) * 0.4);
        s.userData = { vy: 0.4 };
        fg.add(s); leaves.push(s);
      }
      root.add(fg);
      foes.push({ fg, decal, mound, halo, pglow, curls, bandMesh, sparks, leaves });
    }
    const LIFE = 1.4;
    add({ t: 0, life: LIFE, done: () => { dispose(g); for (const f of foes) dispose(f.fg); }, tick(o) {
      const t = o.t, f = fadeLife(t, 0.05, LIFE, 0.5);
      bed.material.opacity = 0.5 * f;
      const grow = ease(t / 0.1);
      vine.geometry.setDrawRange(0, Math.floor(vine.geometry.index.count * grow));
      vineGlow.geometry.setDrawRange(0, Math.floor(vineGlow.geometry.index.count * grow));
      vineGlow.material.opacity = 0.45 * f;
      for (const cm of sideCurls) { cm.geometry.setDrawRange(0, Math.floor(cm.geometry.index.count * ease((t - 0.04) / 0.1))); cm.material.opacity = 0.6 * f; }
      for (const m of bloom) m.material.opacity = f * ease((t - m.userData.k * 0.08) / 0.06);
      for (const s of glints) s.material.opacity = grow >= s.userData.k ? 0.7 * Math.max(0, Math.sin(t * 12 + s.userData.ph)) * Math.max(0, 1 - Math.max(0, t - 0.6) / 0.3) : 0;
      for (const F of foes) {
        F.decal.material.opacity = f * ease(t / 0.1);
        F.decal.scale.setScalar(0.5 + 0.5 * ease(t / 0.12));
        F.mound.material.opacity = 0.85 * f * ease(t / 0.1); F.mound.scale.copy(F.decal.scale);
        F.halo.material.opacity = 0.32 * f;
        F.pglow.material.opacity = 0.35 * f;
        for (const c of F.curls) { c.geometry.setDrawRange(0, Math.floor(c.geometry.index.count * ease(t / 0.1))); c.material.opacity = f; c.material.transparent = f < 1; }
        F.bandMesh.geometry.setDrawRange(0, Math.floor(F.bandMesh.geometry.index.count * ease((t - 0.01) / 0.1)));
        F.bandMesh.material.opacity = 0.55 * f;
        for (const s of F.sparks) s.material.opacity = Math.max(0, 1 - t / 0.9) * (0.6 + 0.4 * Math.sin(t * 16 + s.userData.ph));
        for (const s of F.leaves) { s.position.y += s.userData.vy * o.dt; s.material.opacity = f; }
      }
    } });
  });

  // ---- a tapered camera-facing ribbon through a list of points (old -> new), rebuilt each frame
  const camDir = new Vector3();
  function makeTrail(color, maxPts, width, op, normal = false, exp = 0.8) {
    const N = 40; // resampled points
    const pos = new Float32Array(N * 2 * 3), col = new Float32Array(N * 2 * 4);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('color', new BufferAttribute(col, 4));
    const idx = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    const uv = new Float32Array(N * 2 * 2);
    for (let i = 0; i < N; i++) { uv[i * 4] = i / (N - 1); uv[i * 4 + 1] = 0; uv[i * 4 + 2] = i / (N - 1); uv[i * 4 + 3] = 1; }
    geo.setAttribute('uv', new BufferAttribute(uv, 2));
    const m = new Mesh(geo, new MeshBasicMaterial({ color, map: lineTex(), vertexColors: true, transparent: true, opacity: op, depthWrite: false, side: DoubleSide, blending: normal ? undefined : AdditiveBlending }));
    m.frustumCulled = false;
    root.add(m);
    const t = new Vector3(), side = new Vector3(), prev = new Vector3(1, 0, 0);
    return {
      m, set(raw, endMul = 1) {
        // drop near-duplicate points, then resample through a smooth curve
        const pts = [];
        for (const q of raw) if (!pts.length || pts[pts.length - 1].distanceTo(q) > 0.04) pts.push(q);
        if (pts.length < 2) { geo.setDrawRange(0, 0); return; }
        const curve = new CatmullRomCurve3(pts, false, 'centripetal');
        const cam = window.__reviewCam;
        prev.set(1, 0, 0); let first = true;
        for (let i = 0; i < N; i++) {
          const u = i / (N - 1), p = curve.getPoint(u);
          t.copy(curve.getTangent(Math.min(0.999, Math.max(0.001, u))));
          if (cam) camDir.subVectors(cam.position, p).normalize(); else camDir.set(0, 1, 0);
          side.crossVectors(t, camDir);
          if (side.lengthSq() < 1e-8) side.copy(prev); else side.normalize();
          if (!first && side.dot(prev) < 0) side.negate();
          if (!first) side.lerp(prev, 0.5).normalize();
          prev.copy(side); first = false;
          const taper = Math.pow(u, exp), w = width * taper;
          pos.set([p.x + side.x * w, p.y + side.y * w, p.z + side.z * w], i * 6);
          pos.set([p.x - side.x * w, p.y - side.y * w, p.z - side.z * w], i * 6 + 3);
          const al = taper * (u > 0.85 ? endMul : 1); col.set([1, 1, 1, al, 1, 1, 1, al], i * 8);
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
        geo.setDrawRange(0, (N - 1) * 6);
      },
      dispose() { root.remove(m); geo.dispose(); m.material.dispose(); },
    };
  }

  // ================================================================ S10 Swiftleaf
  // three bright leaves on long gold ribbons that meet on the ally and turn into a three-blade pinwheel
  const sl = new Map();
  bus.on('review_sl', (ev) => {
    const leaves = [0, 1, 2].map(() => {
      const leaf = new Mesh(new PlaneGeometry(0.62, 0.3), new MeshBasicMaterial({ map: leaf2Tex(), transparent: true, depthWrite: false, side: DoubleSide, color: '#FFFFFF', toneMapped: false, alphaTest: 0.5 }));
      leaf.geometry.translate(0.31, 0, 0); // base at the origin, tip along +x
      const glow = spr(glowTex(), HEAL, 0.3);
      const g = new Group(); g.add(leaf, glow); g.visible = false; root.add(g);
      return { g, leaf, glow, hist: [], pinHist: [], last: null, frozen: false, gold: makeTrail('#FFC94A', 0, 0.075, 0.9, true, 1.4), hi: makeTrail(GOLD_HI, 0, 0.02, 1, true, 1.4), green: makeTrail(HEAL, 0, 0.15, 0.22, false, 1.4), swirl: (() => { const tr = makeTrail(GOLD, 0, 0.03, 0.9, false, 1.4); tr.m.material.depthTest = false; tr.m.renderOrder = 4; return tr; })() };
    });
    sl.set(ev.id, { leaves, t: 0, meet: null, hub: null, sparks: [], chips: [] });
  });
  bus.on('review_sl_meet', (ev) => {
    const o = sl.get(ev.id); if (!o) return;
    o.meet = 0; o.hub = new Vector3(ev.x, 0.42, ev.z); // below the sim's meeting point: clear of the game's +HP glyph sprite
    let seed = ev.id * 13 + 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const s = i % 3 === 0 ? spr(starTex(), GOLD_HI, 0.1) : spr(glowTex(), rnd() < 0.7 ? GOLD : HEAL_HI, 0.05 + rnd() * 0.04);
      const a = rnd() * 6.28, r = 0.3 + rnd() * 0.8;
      s.position.set(ev.x + Math.cos(a) * r, 0.3 + rnd() * 1.0, ev.z + Math.sin(a) * r * 0.8);
      s.userData = { vx: Math.cos(a) * 0.2, vy: 0.1 + rnd() * 0.2, vz: Math.sin(a) * 0.2, life: 0.7 + rnd() * 0.4, at: rnd() * 0.15 };
      root.add(s); o.sparks.push(s);
    }
    const hubStar = spr(starTex(), GOLD_HI, 0.28);
    hubStar.position.copy(o.hub); hubStar.material.depthTest = false; hubStar.renderOrder = 6;
    hubStar.userData = { hub: true };
    root.add(hubStar); o.sparks.push(hubStar);
    const hubGlow = spr(glowTex(), GOLD, 0.5);
    hubGlow.position.copy(o.hub); hubGlow.material.depthTest = false; hubGlow.renderOrder = 4;
    hubGlow.userData = { hubGlow: true };
    root.add(hubGlow); o.sparks.push(hubGlow);
    const halo = spr(glowTex(), GOLD, 0.8);
    halo.position.set(ev.x, 0.75, ev.z);
    halo.userData = { halo: true, life: 0.3 };
    root.add(halo); o.sparks.push(halo);
    // leaf chips shed along the ribbons
    for (const l of o.leaves) for (let k = 0; k < 2; k++) {
      const q = l.hist[Math.floor(l.hist.length * (0.3 + 0.35 * k))];
      if (!q) continue;
      const c = spr(leafTex(), '#FFFFFF', 0.16, false);
      c.position.copy(q); c.userData = { vy: -0.3, rot: rnd() * 6 };
      root.add(c); o.chips.push(c);
    }
  });
  bus.on('review_sl_end', (ev) => { const o = sl.get(ev.id); if (o) o.end = 0; });
  const camPos = () => (window.__reviewCam ? window.__reviewCam.position : new Vector3(0, 10, 6));
  // orient a leaf: base at the group's origin, long axis pointing along dir, face tilted toward the camera
  const aimLeaf = (leaf, at, dir, tilt) => {
    const d = dir.clone().normalize();
    const toCam = camPos().clone().sub(at).normalize();
    const nrm = toCam.clone().sub(d.clone().multiplyScalar(toCam.dot(d))).normalize();
    const y = new Vector3().crossVectors(nrm, d).normalize();
    leaf.matrixAutoUpdate = true;
    const m = new Matrix4().makeBasis(d, y, nrm);
    leaf.quaternion.setFromRotationMatrix(m);
    leaf.rotateX(tilt);
  };
  // the sim's leaf flight (world.js K24.leaf, review-only copy): sample the curve itself so the ribbon is one smooth arc
  const SLP = { wind: 7, fly: 21, side: 1.5, high: 1.6 };
  const leafAt = (q, f, u, out) => {
    const t = q.t, mx = (f.ox + t.x) / 2 + q.px * SLP.side * f.k, mz = (f.oz + t.z) / 2 + q.pz * SLP.side * f.k;
    const y = f.k === 0 ? f.oy + (0.6 - f.oy) * u + SLP.high * Math.sin(Math.PI * u) * (1 - 0.4 * u) : f.oy + (0.6 - f.oy) * u + 0.3 * Math.sin(Math.PI * u);
    return out.set(bez2(f.ox, mx, t.x, u), y, bez2(f.oz, mz, t.z, u));
  };
  const bez2 = (a, c, b, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;
  const flightPts = (q, f, uNow, bow, whole = false) => {
    const pts = [], u0 = whole ? 0 : Math.max(0, uNow - 0.85), right = new Vector3();
    if (bow && window.__reviewCam) right.setFromMatrixColumn(window.__reviewCam.matrixWorld, 0);
    for (let i = 0; i < 40; i++) {
      const k = i / 39, p = leafAt(q, f, u0 + (uNow - u0) * k, new Vector3());
      if (bow) p.addScaledVector(right, 0.4 * Math.sin(Math.PI * k));
      pts.push(p);
    }
    if (!whole) { const head = pts[pts.length - 1].clone(); while (pts.length > 2 && pts[pts.length - 2].distanceTo(head) < 0.1) pts.splice(pts.length - 2, 1); pts.pop(); } // the ribbon head sits 0.1 u behind the leaf
    return pts;
  };
  const flightU = (q, f) => { // where along its curve the sim's leaf is now
    let best = 0, bd = 1e9;
    const p = new Vector3();
    for (let i = 0; i <= 200; i++) { const u = i / 200; leafAt(q, f, u, p); const dd = Math.hypot(p.x - f.x, p.y - f.y, p.z - f.z); if (dd < bd) { bd = dd; best = u; } }
    return best;
  };
  const camCol = (i) => new Vector3().setFromMatrixColumn(window.__reviewCam.matrixWorld, i);
  function slTick(dt) {
    const L = globalThis.__reviewLeaves || [];
    for (const [id, o] of sl) {
      o.t += dt;
      const q = L.find((x) => x.id === id);
      if (o.end != null) o.end += dt;
      const fade = o.end != null ? Math.max(0, 1 - o.end / 0.3) : 1;
      const pin = q && q.phase === 'pin';
      o.leaves.forEach((l, j) => {
        const f = q && q.leaf[j];
        const on = f && (f.on !== false) && !(q.phase === 'part' && !f.on);
        l.g.visible = !!on;
        if (on) {
          const p = new Vector3(f.x, f.y, f.z);
          l.g.position.copy(p);
          if (o.meet == null && q.phase === 'fly' && f.ox != null) l.hist = flightPts(q, f, flightU(q, f), f.k === 0);
          else if (o.meet != null && !l.frozen && f.ox != null) { l.hist = flightPts(q, f, 1, f.k === 0, true); const n = l.hist.length; for (let i = n - 6; i < n; i++) l.hist[i].lerp(o.hub, (i - (n - 6) + 1) / 6); l.frozen = true; } // at the meeting the whole flight shows, then fades
          if (pin && o.hub && window.__reviewCam) { // a three-blade pinwheel facing the camera, spun by the sim's orbit
            l.g.position.copy(o.hub);
            const f0 = q.leaf[0], spin = Math.atan2(f0.z - q.t.z, f0.x - q.t.x), a = spin + j * 2.094;
            const R = camCol(0), U = camCol(1), B = camCol(2);
            const d = R.multiplyScalar(Math.cos(a)).addScaledVector(U, Math.sin(a)).normalize();
            l.leaf.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(d, new Vector3().crossVectors(B, d), B));
            l.leaf.scale.set(0.46 / 0.62, 0.22 / 0.3, 1);
            l.leaf.material.depthTest = false; l.leaf.renderOrder = 5;
            const arc = []; // a thin gold spin streak trailing each blade tip
            for (let k = 0; k <= 12; k++) { const th = a - 1.571 + 1.571 * (k / 12); arc.push(o.hub.clone().addScaledVector(camCol(0), Math.cos(th) * 0.42).addScaledVector(camCol(1), Math.sin(th) * 0.42)); }
            l.pinHist = arc;
          } else {
            l.leaf.scale.set(0.5 / 0.62, 0.24 / 0.3, 1); l.leaf.material.depthTest = true; l.leaf.renderOrder = 3;
            const v = l.last ? p.clone().sub(l.last) : new Vector3(1, 0, 0);
            if (v.lengthSq() < 1e-6) v.set(1, 0, 0);
            aimLeaf(l.leaf, p, v, 0.5 * Math.sin(o.t * 9 * 6.28 + j * 2));
            l.leaf.position.set(-0.25, 0, 0).applyQuaternion(l.leaf.quaternion); // centre the leaf on its sim point in flight
          }
          if (pin && o.hub) l.leaf.position.set(0, 0, 0);
          l.last = p;
        }
        l.glow.material.opacity = pin ? 0 : 0.12;
        // the flight ribbon stays frozen after the meeting and fades (the high one sooner)
        const ribF = o.meet == null ? 1 : j === 1 ? Math.max(0, 1 - o.meet / 0.2) : o.meet < 0.15 ? 1 : Math.max(0, 1 - (o.meet - 0.15) / 0.5); // side arcs held, then faded; the high one goes fast
        if (l.hist.length > 1) { l.gold.set(l.hist); l.hi.set(l.hist); l.green.set(l.hist, o.meet != null ? 0.12 / 0.22 : 1); }
        l.gold.m.material.opacity = 0.9 * ribF * fade; l.hi.m.material.opacity = ribF * fade; l.green.m.material.opacity = 0.22 * ribF * fade;
        if (l.pinHist.length > 1) l.swirl.set(l.pinHist);
        l.swirl.m.material.opacity = pin ? 0.9 * fade : 0;
      });
      if (o.meet != null) {
        o.meet += dt;
        for (const s of o.sparks) {
          const u = s.userData;
          if (u.halo) { s.material.opacity = 0.2 * Math.max(0, 1 - o.meet / u.life) * Math.min(1, o.meet / 0.04); continue; }
          if (u.hub) { s.material.opacity = pin ? fade : Math.max(0, s.material.opacity - dt * 4); s.material.rotation += dt * 4; s.scale.setScalar(0.28 * (1 + 0.15 * Math.sin(o.meet * 6 * 6.283))); continue; }
          if (u.hubGlow) { s.material.opacity = pin ? 0.25 * fade : Math.max(0, s.material.opacity - dt * 2); continue; }
          const k = o.meet - u.at;
          if (k < 0) continue;
          s.position.x += u.vx * dt; s.position.y += u.vy * dt; s.position.z += u.vz * dt;
          s.material.opacity = Math.min(1, k / 0.05) * Math.max(0, 1 - k / u.life);
        }
        for (const c of o.chips) { c.position.y = Math.max(0.05, c.position.y + c.userData.vy * dt); c.material.rotation += dt * 3; c.material.opacity = Math.max(0, 1 - o.meet / 0.8); }
      }
      if (o.end != null && o.end > 0.3) {
        for (const l of o.leaves) { root.remove(l.g); l.gold.dispose(); l.hi.dispose(); l.green.dispose(); l.swirl.dispose(); }
        for (const s of [...o.sparks, ...o.chips]) { root.remove(s); s.material.dispose(); }
        sl.delete(id);
      }
    }
  }

  // ================================================================ S22 Wispfall
  // comet wisps dive from the sky; each lands as a white-gold starburst inside a thin purple rune ring
  const falls = [];
  bus.on('review_fall_dive', (ev) => {
    let seed = Math.floor((ev.x * 31 + ev.z * 17) * 100) % 9973 + 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const head = spr(glowTex(), LANTERN, 0.38);
    const core = spr(starTex(), '#FFFFFF', 0.34);
    const dot = spr(glowTex(), '#FFFFFF', 0.16); // a hot white centre that survives the bloom
    root.add(head, core, dot);
    const from = new Vector3(ev.x + 0.6 + (rnd() - 0.5) * 0.6, 3.8, ev.z - 1.2);
    const ctl = new Vector3((from.x + ev.x) / 2 + 1.1, 2.6, (from.z + ev.z) / 2);
    const tail = makeTrail(GOLD, 13, 0.085, 0.9, false, 1.6), hot = makeTrail(GOLD_HI, 13, 0.035, 1, false, 1.6);
    head.renderOrder = core.renderOrder = dot.renderOrder = 1;
    falls.push({ kind: 'dive', head, core, dot, from, ctl, to: new Vector3(ev.x, 0.35, ev.z), t: 0, t0: world.tick, life: ev.secs, hist: [], tail, hot }); // timed by the sim tick so the head lands on the hit
  });
  let landR = 0.65;
  bus.on('review_fall_land', (ev) => { landR = Math.max(ev.r, 0.65); });
  bus.on('hit', (ev) => {
    (globalThis.__mossHits ||= []).push({ s: ev.source, x: ev.x, z: ev.z, a: ev.amount, c: ev.crit, t: ev.target }); // REVIEW debug
    if (ev.source !== 'bell_toll') return;
    const big = ev.crit ? 1.6 : 1;
    { const ring = flat(1, 1, runeTex(!!ev.crit), ARCANE, 0, false);
      ring.material.blending = AdditiveBlending;
      ring.position.set(ev.x, 0.05, ev.z);
      const ring2 = flat(1, 1, glowTex(), LANTERN, 0);
      ring2.position.set(ev.x, 0.045, ev.z);
      root.add(ring, ring2);
      falls.push({ kind: 'ring', ring, ring2, r: ev.crit ? 1.5 : landR, t: 0, life: 1.4 }); }
    const g = new Group();
    g.position.set(ev.x, 0.2, ev.z);
    const flash = spr(glowTex(), '#FFE3A0', ev.crit ? 0.9 : 0.65);
    const star = spr(starTex(), '#FFFFFF', Math.min(1.1, 0.9 * big));
    g.add(flash, star);
    const rays = [];
    let seed = Math.floor(ev.target * 7919) % 9973 + 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 24; i++) {
      const purple = i % 6 === 0 && i < 22;
      const r = spr(streakTex(), purple ? '#C9A0FF' : i % 4 === 0 ? '#FFF1C8' : '#FFD27A', 1);
      const spike = i >= 22;
      const a = spike ? Math.PI / 2 + (i === 22 ? 0.15 : -0.15) : rnd() * Math.PI * 2;
      r.material.rotation = a;
      r.userData = { a, len: spike ? 1.4 * big : purple ? (0.3 + rnd() * 0.25) * big : (0.5 + rnd() * 0.6) * big, w: 0.02 + rnd() * 0.02 };
      g.add(r); rays.push(r);
    }
    const motes = [];
    for (let i = 0; i < 24; i++) {
      const m2 = spr(glowTex(), i % 3 ? GOLD_HI : '#D7B8FF', 0.06 + rnd() * 0.05);
      const a = rnd() * 6.28, v = 0.8 + rnd() * 1.6, r0 = 0.2 + rnd() * 0.3;
      m2.position.set(Math.cos(a) * r0, 0, Math.sin(a) * r0 * 0.7);
      m2.userData = { vx: Math.cos(a) * v * big, vy: 1.0 + rnd() * 1.6, vz: Math.sin(a) * v * 0.7 * big };
      g.add(m2); motes.push(m2);
    }
    root.add(g);
    falls.push({ kind: 'burst', g, flash, star, rays, motes, t: 0, life: ev.crit ? 1.1 : 0.9, big, crit: !!ev.crit });
  });
  // a gold glow on her raised staff while the channel runs
  let channel = null;
  bus.on('review_fall', () => { if (!channel) { channel = { glow: spr(glowTex(), GOLD, 0.45), star: spr(starTex(), GOLD_HI, 0.3), t: 0, hist: [], trail: makeTrail(GOLD_HI, 24, 0.025, 0.5, false, 1.6) }; root.add(channel.glow, channel.star); } channel.end = null; });
  bus.on('review_fall_end', () => { if (channel) channel.end = 0; });
  const bez = (a, c, b, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;
  function fallTick(dt) {
    if (channel) {
      channel.t += dt;
      if (channel.end != null) channel.end += dt;
      const f = channel.end != null ? Math.max(0, 1 - channel.end / 0.3) : Math.min(1, channel.t / 0.2);
      const p = new Vector3(); if (tip) tip(p);
      channel.glow.position.copy(p); channel.star.position.copy(p);
      channel.glow.material.opacity = 0.55 * f * (0.8 + 0.2 * Math.sin(channel.t * 8));
      channel.star.material.opacity = 0.8 * f; channel.star.material.rotation = channel.t * 1.5;
      // a little wisp curling up off the gem
      const a = channel.t * 5;
      { const hh = 0.35 + 0.3 * Math.sin(channel.t * 2.2), rr = 0.28 * hh / 0.65; channel.hist.push(new Vector3(p.x + Math.cos(a) * rr, p.y + hh, p.z + Math.sin(a) * rr)); } // a wisp that widens as it rises off the gem
      if (channel.hist.length > 24) channel.hist.shift();
      channel.trail.set(channel.hist); channel.trail.m.material.opacity = 0.5 * f;
      if (channel.end != null && channel.end > 0.3) { root.remove(channel.glow, channel.star); channel.trail.dispose(); channel = null; }
    }
    for (let i = falls.length - 1; i >= 0; i--) {
      const o = falls[i];
      o.t += dt;
      const u = Math.min(1, o.t / o.life);
      if (o.kind === 'dive') {
        const el = typeof world.tick === 'number' && o.t0 != null ? (world.tick - o.t0) / 60 : o.t; // sim seconds since the dive
        const uu = Math.min(1, el / o.life), e = Math.pow(uu, 1.4); // accelerates down
        const p = new Vector3(bez(o.from.x, o.ctl.x, o.to.x, e), bez(o.from.y, o.ctl.y, o.to.y, e), bez(o.from.z, o.ctl.z, o.to.z, e));
        o.head.position.copy(p); o.core.position.copy(p); o.dot.position.copy(p);
        o.head.material.opacity = 0.75; o.core.material.opacity = 1; o.dot.material.opacity = 1;
        if (el <= o.life) { o.hist.push(p.clone()); if (o.hist.length > 13) o.hist.shift(); }
        const after = Math.max(0, el - o.life);
        if (after > 0) { const keep = Math.max(2, Math.round(o.hist.length * (1 - after / 0.15))); if (o.hist.length > keep) o.hist.splice(0, o.hist.length - keep); } // tail-first: it shrinks into the hit
        o.tail.set(o.hist); o.hot.set(o.hist);
        if (el >= o.life) { o.head.material.opacity = 0; o.core.material.opacity = 0; o.dot.material.opacity = 0; o.tail.m.material.opacity = 0.9 * (after < 0.1 ? 1 : 1 - (after - 0.1) / 0.05); o.hot.m.material.opacity = 1 - after / 0.15; }
        if (after >= 0.15) { root.remove(o.head, o.core, o.dot); o.head.material.dispose(); o.core.material.dispose(); o.dot.material.dispose(); o.tail.dispose(); o.hot.dispose(); falls.splice(i, 1); }
      } else if (o.kind === 'ring') {
        const g = ease(u / 0.35);
        const R = o.r * 2 * (0.75 + 0.25 * g);
        o.ring.scale.set(R, R, 1); o.ring2.scale.set(R * 0.7, R * 0.7, 1);
        o.ring.rotation.z = o.t * 0.8;
        o.ring.material.opacity = (o.r >= 1.5 ? 0.8 : 0.7) * Math.min(1, o.t / 0.05) * (u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5);
        o.ring2.material.opacity = 0.2 * (1 - u);
        if (u >= 1) { root.remove(o.ring, o.ring2); o.ring.material.dispose(); o.ring2.material.dispose(); falls.splice(i, 1); }
      } else if (o.kind === 'burst') {
        const k = 1 - u;
        o.flash.material.opacity = (o.crit ? 0.3 : 0.25) * Math.pow(k, 2.5);
        o.star.material.opacity = (o.crit ? 0.7 : 0.65) * Math.pow(k, 1.5); o.star.scale.setScalar(Math.min(1.1, 0.9 * o.big) * (0.7 + 0.5 * ease(u / 0.2)));
        for (const r of o.rays) {
          const d = r.userData, gr = ease(u / 0.25);
          r.scale.set(d.len * (0.4 + 0.8 * gr), d.w * 6 * (1 - u * 0.6), 1);
          r.position.set(Math.cos(d.a) * d.len * 0.45 * gr, Math.sin(d.a) * d.len * 0.45 * gr, 0);
          r.material.opacity = 0.8 * Math.pow(k, 1.1);
        }
        for (const m2 of o.motes) { const d = m2.userData; m2.position.x += d.vx * dt; m2.position.y += d.vy * dt; m2.position.z += d.vz * dt; d.vy -= 1.4 * dt; d.vx *= 0.96; d.vz *= 0.96; m2.material.opacity = Math.pow(k, 0.4); }
        if (u >= 1) { root.remove(o.g); o.g.traverse((m) => { if (m.material) m.material.dispose(); }); falls.splice(i, 1); }
      }
    }
  }

  function update(dt) {
    slTick(dt);
    fallTick(dt);
    for (let i = live.length - 1; i >= 0; i--) {
      const o = live[i];
      o.dt = dt; o.t += dt;
      if (o.t >= o.life) { o.done(); live.splice(i, 1); continue; }
      o.tick(o);
    }
  }
  return { update };
}
