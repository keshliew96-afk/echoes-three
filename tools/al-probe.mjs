// al-probe.mjs — ally-block pixel measurements.
//
//   node tools/al-probe.mjs band <png> <hLo,hHi> [x,y,w,h]
//     Counts saturated pixels inside a hue band (+ bbox + top hexes). Used for
//     the §17 Signal Blue mark reticle (#4FA3D9 = hue 203.5).
//
//   node tools/al-probe.mjs ring <png> <cx,cy> <rx,ry> [lumaMin]
//     Samples an elliptical annulus (the ground-plane revive ring seen through
//     the 52° rig) at 360 angles measured CLOCKWISE FROM 12 O'CLOCK and reports
//     a 12-bucket clock histogram of "lit" (bright, low-saturation = Parchment)
//     samples plus total coverage. That is how "fills clockwise from 12" and
//     "drains in reverse" are measured instead of eyeballed.
import sharp from 'sharp';

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
  return [h, mx ? d / mx : 0, mx];
};

const [mode, file, ...rest] = process.argv.slice(2);

if (mode === 'band') {
  const [lo, hi] = rest[0].split(',').map(Number);
  let img = sharp(file);
  let bx = 0, by = 0;
  if (rest[1]) {
    const [x, y, w, h] = rest[1].split(',').map(Number);
    bx = x; by = y;
    img = img.extract({ left: x, top: y, width: w, height: h });
  }
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const C = info.channels, W = info.width, H = info.height;
  const hexes = new Map();
  let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, hueSum = 0;
  const minS = +(process.env.ALS ?? 0.3), minV = +(process.env.ALV ?? 0.4);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
    const [h, s, v] = hsv(r, g, b);
    if (s <= minS || v <= minV || h < lo || h >= hi) continue;
    n++; hueSum += h;
    const hex = '#' + [r, g, b].map((q) => q.toString(16).padStart(2, '0')).join('');
    hexes.set(hex, (hexes.get(hex) || 0) + 1);
    const px = bx + (i % W), py = by + Math.floor(i / W);
    if (px < x0) x0 = px; if (py < y0) y0 = py;
    if (px > x1) x1 = px; if (py > y1) y1 = py;
  }
  console.log(JSON.stringify({
    file, band: [lo, hi], box: rest[1] ?? `full ${W}x${H}`, minS, minV,
    n, meanHue: n ? +(hueSum / n).toFixed(1) : null,
    bbox: n ? [x0, y0, x1, y1] : null,
    spanPx: n ? [x1 - x0 + 1, y1 - y0 + 1] : null,
    top: [...hexes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
  }));
} else if (mode === 'ring') {
  const [cx, cy] = rest[0].split(',').map(Number);
  const [rx, ry] = rest[1].split(',').map(Number);
  const lumaMin = rest[2] ? Number(rest[2]) : 240; // Parchment fill measures L~253
  const satMax = rest[3] ? Number(rest[3]) : 0.08; // ...at s~0.05; the Bone track sits at L<230
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const C = info.channels, W = info.width, H = info.height;
  const at = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    const i = (y * W + x) * C;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const buckets = new Array(12).fill(0);
  const bucketN = new Array(12).fill(0);
  let lit = 0, total = 0;
  const litAngles = [];
  for (let a = 0; a < 360; a++) {
    const phi = (a * Math.PI) / 180; // clockwise from 12 o'clock
    let best = false;
    // 3 radial samples across the band thickness so a 1 px miss never counts.
    for (const k of [0.94, 1.0, 1.06]) {
      const px = cx + rx * k * Math.sin(phi);
      const py = cy - ry * k * Math.cos(phi);
      const c = at(px, py);
      if (!c) continue;
      const [, s, v] = hsv(c[0], c[1], c[2]);
      const luma = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      if (luma >= lumaMin && s <= satMax) best = true; // Parchment: bright + near-neutral
    }
    total++;
    const b = Math.floor(a / 30);
    bucketN[b]++;
    if (best) { lit++; buckets[b]++; litAngles.push(a); }
  }
  const clock = buckets.map((v, i) => ({ hour: i === 0 ? 12 : i, litOf30: v }));
  console.log(JSON.stringify({
    file, center: [cx, cy], radii: [rx, ry], lumaMin, satMax,
    litSamples: lit, ofSamples: total, coveragePct: +((100 * lit) / total).toFixed(1),
    firstLitAngle: litAngles.length ? litAngles[0] : null,
    lastLitAngle: litAngles.length ? litAngles[litAngles.length - 1] : null,
    clock,
  }));
} else if (mode === 'find') {
  // Locate the brightest near-neutral (Parchment) blob inside a box: the
  // revive ring. Returns its bbox + centroid so `ring` can be centred on the
  // measured ring instead of a hand-computed projection.
  const [x, y, w, h] = rest[0].split(',').map(Number);
  const lumaMin = rest[1] ? Number(rest[1]) : 215;
  const { data, info } = await sharp(file)
    .extract({ left: x, top: y, width: w, height: h })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const C = info.channels, W = info.width, H = info.height;
  let n = 0, sx = 0, sy = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0; i < W * H; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
    const [, s] = hsv(r, g, b);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma < lumaMin || s > 0.2) continue;
    const px = x + (i % W), py = y + Math.floor(i / W);
    n++; sx += px; sy += py;
    if (px < x0) x0 = px; if (py < y0) y0 = py;
    if (px > x1) x1 = px; if (py > y1) y1 = py;
  }
  console.log(JSON.stringify({
    file, box: [x, y, w, h], lumaMin, n,
    centroid: n ? [Math.round(sx / n), Math.round(sy / n)] : null,
    bbox: n ? [x0, y0, x1, y1] : null,
    spanPx: n ? [x1 - x0 + 1, y1 - y0 + 1] : null,
    bboxCenter: n ? [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)] : null,
  }));
} else {
  console.error('usage: al-probe.mjs band <png> <hLo,hHi> [x,y,w,h] | ring <png> <cx,cy> <rx,ry> [lumaMin] | find <png> <x,y,w,h> [lumaMin]');
  process.exit(2);
}
