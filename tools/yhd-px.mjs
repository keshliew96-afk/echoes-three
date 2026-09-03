// Critic pixel tool (round D2 HUD critique). Subcommands:
//   sig <png> x,y,w,h ...            HUD-chrome signature counts per box
//                                    (warm-charcoal plate / rim / parchment-bone ink / luma>200)
//   diff <pngA> <pngB> x,y,w,h ...   pixels differing by >24 on any channel, per box
//   tile <png> x,y,w,h x,y,w,h       mean |A-B| per channel between two same-size boxes
//   contrast <png> x,y,w,h ...       WCAG contrast: darkest 40% (plate) vs brightest 8% (ink)
//   ink <png> x,y,w,h [minLuma]      pixels above a luma threshold (text-render proof)
//   crop <png> x,y,w,h <scale> <out> nearest-neighbour crop for viewing
import { readFileSync } from 'fs';
import sharp from 'sharp';

const [cmd, ...rest] = process.argv.slice(2);
const load = async (f) => {
  const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height, C: info.channels };
};
const box = (s) => s.split(',').map(Number);
const px = (img, x, y) => { const i = (y * img.W + x) * img.C; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const relL = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const clampBox = (img, [x, y, w, h]) => {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(img.W, x + w), y1 = Math.min(img.H, y + h);
  return [x0, y0, x1 - x0, y1 - y0];
};

// Warm charcoal plate: #221F1B (34,31,27) .. plateHi (46,42,38); rim ~ (88,81,74).
const isPlate = (r, g, b) => r >= 26 && r <= 58 && g >= 23 && g <= 54 && b >= 19 && b <= 48 && r >= g && g >= b && r - b >= 3 && r - b <= 16;
const isRim = (r, g, b) => r >= 70 && r <= 112 && g >= 63 && g <= 104 && b >= 56 && b <= 96 && r >= g && g >= b && r - b >= 8 && r - b <= 24;
// Parchment #F4EFE6 (244,239,230) / Bone (201,194,179): warm near-white, low chroma.
const isInk = (r, g, b) => r >= 190 && g >= 182 && b >= 165 && r >= g && g >= b && r - b <= 40;

if (cmd === 'sig') {
  const img = await load(rest[0]);
  for (const bs of rest.slice(1)) {
    const [x0, y0, w, h] = clampBox(img, box(bs));
    let plate = 0, rim = 0, ink = 0, l200 = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const [r, g, b] = px(img, x, y);
      if (isPlate(r, g, b)) plate++;
      if (isRim(r, g, b)) rim++;
      if (isInk(r, g, b)) ink++;
      if (luma(r, g, b) > 200) l200++;
    }
    const n = w * h;
    console.log(`sig ${rest[0]} box ${bs}: n=${n} plate=${plate} (${(100 * plate / n).toFixed(2)}%) rim=${rim} ink=${ink} (${(100 * ink / n).toFixed(2)}%) luma>200=${l200}`);
  }
} else if (cmd === 'diff') {
  const a = await load(rest[0]);
  const b = await load(rest[1]);
  const T = 24;
  for (const bs of rest.slice(2)) {
    const [x0, y0, w, h] = clampBox(a, box(bs));
    let n = 0, diff = 0, sum = 0, maxd = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const p = px(a, x, y), q = px(b, x, y);
      const d = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]));
      n++; sum += d; if (d > maxd) maxd = d; if (d > T) diff++;
    }
    console.log(`diff ${rest[0]} vs ${rest[1]} box ${bs}: n=${n} differing(>${T})=${diff} (${(100 * diff / n).toFixed(2)}%) meanDelta=${(sum / n).toFixed(2)} maxDelta=${maxd}`);
  }
} else if (cmd === 'tile') {
  const img = await load(rest[0]);
  const A = clampBox(img, box(rest[1])), B = clampBox(img, box(rest[2]));
  const w = Math.min(A[2], B[2]), h = Math.min(A[3], B[3]);
  let s = [0, 0, 0], n = 0, big = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = px(img, A[0] + x, A[1] + y), q = px(img, B[0] + x, B[1] + y);
    const d = [Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])];
    s[0] += d[0]; s[1] += d[1]; s[2] += d[2]; n++;
    if (Math.max(...d) > 40) big++;
  }
  const m = s.map((v) => (v / n).toFixed(1));
  console.log(`tile ${rest[0]} A=${rest[1]} B=${rest[2]} (${w}x${h}): mean|A-B| r=${m[0]} g=${m[1]} b=${m[2]} avg=${((s[0] + s[1] + s[2]) / (3 * n)).toFixed(1)} px>40=${big} (${(100 * big / n).toFixed(1)}%)`);
} else if (cmd === 'contrast') {
  const img = await load(rest[0]);
  for (const bs of rest.slice(1)) {
    const [x0, y0, w, h] = clampBox(img, box(bs));
    const list = [];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const [r, g, b] = px(img, x, y);
      list.push({ r, g, b, L: relL(r, g, b) });
    }
    list.sort((p, q) => p.L - q.L);
    const n = list.length;
    const mean = (arr) => {
      const s = arr.reduce((a, p) => [a[0] + p.r, a[1] + p.g, a[2] + p.b, a[3] + p.L], [0, 0, 0, 0]);
      return { r: Math.round(s[0] / arr.length), g: Math.round(s[1] / arr.length), b: Math.round(s[2] / arr.length), L: s[3] / arr.length };
    };
    const plate = mean(list.slice(0, Math.floor(n * 0.4)));
    const ink = mean(list.slice(Math.floor(n * 0.92)));
    const ratio = (ink.L + 0.05) / (plate.L + 0.05);
    console.log(`contrast ${rest[0]} box ${bs}: plate rgb(${plate.r},${plate.g},${plate.b}) L=${plate.L.toFixed(4)} | ink rgb(${ink.r},${ink.g},${ink.b}) L=${ink.L.toFixed(4)} | ${ratio.toFixed(2)}:1`);
  }
} else if (cmd === 'ink') {
  const img = await load(rest[0]);
  const [x0, y0, w, h] = clampBox(img, box(rest[1]));
  const T = Number(rest[2] ?? 90);
  let n = 0, hi = 0, sum = 0; let mn = 255, mx = 0; const hist = {};
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const [r, g, b] = px(img, x, y);
    const L = luma(r, g, b); n++; sum += L; if (L > T) hi++; if (L < mn) mn = L; if (L > mx) mx = L;
    const k = `${r},${g},${b}`; hist[k] = (hist[k] || 0) + 1;
  }
  const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `rgb(${k})x${v}`).join(' ');
  console.log(`ink ${rest[0]} box ${rest[1]}: n=${n} luma>${T}=${hi} (${(100 * hi / n).toFixed(1)}%) meanLuma=${(sum / n).toFixed(1)} min=${mn.toFixed(0)} max=${mx.toFixed(0)} top=${top}`);
} else if (cmd === 'crop') {
  const [x, y, w, h] = box(rest[1]);
  const scale = Number(rest[2] ?? 2);
  await sharp(readFileSync(rest[0])).extract({ left: x, top: y, width: w, height: h })
    .resize(Math.round(w * scale), Math.round(h * scale), { kernel: 'nearest' }).png().toFile(rest[3]);
  console.log(`crop -> ${rest[3]} (${w}x${h} @${scale}x)`);
} else {
  console.error('usage: yhd-px.mjs sig|diff|tile|contrast|ink|crop ...');
  process.exit(2);
}
