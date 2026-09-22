// certA3-player critic tool: crop a box from a PNG and upscale it (nearest) for silhouette inspection.
// usage: node tools/certA3-player-crop.mjs <src.png> x,y,w,h <out.png> [scaleFactor]
import sharp from 'sharp';

const [src, box, out, scaleArg] = process.argv.slice(2);
const [x, y, w, h] = box.split(',').map(Number);
const scale = Number(scaleArg || 3);
const img = sharp(src);
const meta = await img.metadata();
const cx = Math.max(0, Math.min(x, meta.width - 1));
const cy = Math.max(0, Math.min(y, meta.height - 1));
const cw = Math.max(1, Math.min(w, meta.width - cx));
const ch = Math.max(1, Math.min(h, meta.height - cy));
await sharp(src)
  .extract({ left: cx, top: cy, width: cw, height: ch })
  .resize({ width: Math.round(cw * scale), height: Math.round(ch * scale), kernel: 'nearest' })
  .png()
  .toFile(out);
console.log(`crop ${src} [${cx},${cy},${cw},${ch}] x${scale} -> ${out}`);
