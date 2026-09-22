// certA5-player crop/upscale + contact-sheet helper (critic tool, read-only on captures).
// usage:
//   node tools/certA5-player-crop.mjs crop <in.png> <out.png> x y w h [scale]
//   node tools/certA5-player-crop.mjs sheet <out.png> cols x y w h scale <in1.png> <in2.png> ...
import sharp from 'sharp';

const [mode, ...a] = process.argv.slice(2);

async function cropBuf(inp, x, y, w, h, s) {
  const img = sharp(inp).extract({ left: x, top: y, width: w, height: h });
  if (s && s !== 1) return img.resize(Math.round(w * s), Math.round(h * s), { kernel: s > 1 ? 'nearest' : 'lanczos3' }).png().toBuffer();
  return img.png().toBuffer();
}

if (mode === 'crop') {
  const [inp, out, x, y, w, h, s] = a;
  const buf = await cropBuf(inp, +x, +y, +w, +h, s ? +s : 1);
  await sharp(buf).toFile(out);
  console.log('wrote', out);
} else if (mode === 'sheet') {
  const [out, cols, x, y, w, h, s, ...ins] = a;
  const sc = +s, cw = Math.round(+w * sc), ch = Math.round(+h * sc), c = +cols;
  const rows = Math.ceil(ins.length / c);
  const comps = [];
  for (let i = 0; i < ins.length; i++) {
    const buf = await cropBuf(ins[i], +x, +y, +w, +h, sc);
    comps.push({ input: buf, left: (i % c) * (cw + 4), top: Math.floor(i / c) * (ch + 4) });
  }
  await sharp({ create: { width: c * (cw + 4), height: rows * (ch + 4), channels: 3, background: { r: 255, g: 0, b: 255 } } })
    .composite(comps).png().toFile(out);
  console.log('wrote', out, c * (cw + 4), 'x', rows * (ch + 4));
} else {
  console.log('modes: crop | sheet');
}
