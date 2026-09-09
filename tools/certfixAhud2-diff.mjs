#!/usr/bin/env node
// A-hud round-2 fix builder: read-only pixel probes.
//   diff  <box>  a.png b.png [c.png ...]   %px changed >8 / >40 + mean|d| per pair
//   crop  <box>  <scale> in.png out.png    nearest-neighbour crop upscale
//   mean  <box>  png                       mean/min/max luma + mean rgb
import sharp from 'sharp';

const argv = process.argv.slice(2);
const mode = argv[0];
const box = argv[1].split(',').map(Number);
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

async function raw(p) {
  const img = sharp(p).extract({ left: box[0], top: box[1], width: box[2], height: box[3] });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}

if (mode === 'diff') {
  const files = argv.slice(2);
  const bufs = [];
  for (const f of files) bufs.push(await raw(f));
  for (let i = 1; i < bufs.length; i++) {
    const a = bufs[i - 1], b = bufs[i];
    const C = a.info.channels, N = a.info.width * a.info.height;
    let n8 = 0, n40 = 0, sum = 0, max = 0;
    for (let k = 0; k < N; k++) {
      const la = luma(a.data[k * C], a.data[k * C + 1], a.data[k * C + 2]);
      const lb = luma(b.data[k * C], b.data[k * C + 1], b.data[k * C + 2]);
      const d = Math.abs(la - lb);
      sum += d; if (d > max) max = d;
      if (d > 8) n8++; if (d > 40) n40++;
    }
    console.log(`${files[i - 1].split(/[\\/]/).pop()} -> ${files[i].split(/[\\/]/).pop()}  >8 ${((n8 / N) * 100).toFixed(2)}%  >40 ${((n40 / N) * 100).toFixed(2)}%  mean|d| ${(sum / N).toFixed(2)}  max ${max.toFixed(0)}`);
  }
} else if (mode === 'crop') {
  const scale = Number(argv[2]);
  await sharp(argv[3])
    .extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
    .resize({ width: box[2] * scale, height: box[3] * scale, kernel: 'nearest' })
    .toFile(argv[4]);
  console.log('wrote', argv[4]);
} else if (mode === 'mean') {
  const { data, info } = await raw(argv[2]);
  const C = info.channels, N = info.width * info.height;
  let s = 0, mn = 255, mx = 0, r = 0, g = 0, b = 0;
  for (let k = 0; k < N; k++) {
    const L = luma(data[k * C], data[k * C + 1], data[k * C + 2]);
    s += L; if (L < mn) mn = L; if (L > mx) mx = L;
    r += data[k * C]; g += data[k * C + 1]; b += data[k * C + 2];
  }
  console.log(`${argv[2].split(/[\\/]/).pop()} box ${box.join(',')}  meanLuma ${(s / N).toFixed(1)}  min ${mn.toFixed(0)}  max ${mx.toFixed(0)}  rgb ${(r / N).toFixed(0)},${(g / N).toFixed(0)},${(b / N).toFixed(0)}`);
} else {
  console.error('usage: diff|crop|mean');
  process.exit(2);
}
