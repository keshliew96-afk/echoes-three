// certfixAworld1 — the scorers' own measurements, reproduced so the builder
// can compare BEFORE/AFTER on the exact numbers they quoted:
//   rings   concentric mean luma, frame centre -> corners (vignette proof)
//   corners BL/BR/TL/TR vs centre mean luma
//   box     >160 / >200 / mean luma / hue-band counts for an arbitrary box
// Read-only. Never edits tools/analyze.mjs.
import sharp from 'sharp';
const file = process.argv[2];
const boxes = process.argv.slice(3);
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const L = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx / 255];
};
// Rings: 8 concentric bands by normalised radius from the frame centre.
const N = 8, ring = new Array(N).fill(0), ringN = new Array(N).fill(0);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const dx = (x / W - 0.5), dy = (y / H - 0.5);
  const d = Math.min(0.999, Math.hypot(dx, dy) * 1.4142 * 2);
  const k = Math.floor(d * N); ring[k] += L((y * W + x) * C); ringN[k]++;
}
console.log(`${file} ${W}x${H}`);
console.log('RINGS  centre->corner ' + ring.map((s, i) => (s / (ringN[i] || 1)).toFixed(1)).join(' | '));
const meanBox = (x, y, w, h) => {
  let s = 0, n = 0, a160 = 0, a200 = 0, satSum = 0, satN = 0;
  const hb = { danger: 0, heal: 0, violet: 0, amber: 0, foliage: 0 };
  for (let yy = y; yy < Math.min(H, y + h); yy++) for (let xx = x; xx < Math.min(W, x + w); xx++) {
    const i = (yy * W + xx) * C, l = L(i); s += l; n++;
    if (l > 160) a160++; if (l > 200) a200++;
    const [hh, ss] = hsv(data[i], data[i + 1], data[i + 2]);
    if (ss > 0.35 && l > 40) {
      if (hh >= 5 && hh < 25) hb.danger++; else if (hh >= 110 && hh < 150) hb.heal++;
      else if (hh >= 245 && hh < 285) hb.violet++; else if (hh >= 30 && hh < 50) hb.amber++;
    }
    if (ss > 0.12) { satSum += ss; satN++; }
    if (ss > 0.12 && hh >= 60 && hh < 160) hb.foliage++;
  }
  return { mean: s / n, p160: (a160 / n) * 100, p200: (a200 / n) * 100, sat: satSum / (satN || 1), ...hb, n };
};
const q = Math.round(W * 0.14), qh = Math.round(H * 0.14);
const named = { TL: [0, 0], TR: [W - q, 0], BL: [0, H - qh], BR: [W - q, H - qh], C: [Math.round(W / 2 - q / 2), Math.round(H / 2 - qh / 2)] };
for (const [k, [x, y]] of Object.entries(named)) {
  const m = meanBox(x, y, q, qh);
  console.log(`${k.padEnd(3)} ${x},${y},${q},${qh}  mean ${m.mean.toFixed(1)}  >160 ${m.p160.toFixed(2)}%  >200 ${m.p200.toFixed(2)}%`);
}
for (const b of boxes) {
  const [x, y, w, h] = b.split(',').map(Number);
  const m = meanBox(x, y, w, h);
  console.log(`BOX ${b}  mean ${m.mean.toFixed(1)}  >160 ${m.p160.toFixed(2)}%  >200 ${m.p200.toFixed(2)}%  SAT ${m.sat.toFixed(3)}  danger ${m.danger} heal ${m.heal} violet ${m.violet} amber ${m.amber} foliage ${m.foliage}`);
}
