#!/usr/bin/env node
// Critic-only crop/magnify helper (REFERENCE MATCHER round 5).
// usage: node tools/certA5-ref-crop.mjs <src.png> x,y,w,h <out.png> [scale]
import sharp from 'sharp';
const [src, boxStr, out, scaleStr] = process.argv.slice(2);
const [x, y, w, h] = boxStr.split(',').map(Number);
const scale = Number(scaleStr || 3);
const img = sharp(src);
const meta = await img.metadata();
const cx = Math.max(0, Math.min(x, meta.width - 1));
const cy = Math.max(0, Math.min(y, meta.height - 1));
const cw = Math.min(w, meta.width - cx);
const ch = Math.min(h, meta.height - cy);
await sharp(src)
  .extract({ left: cx, top: cy, width: cw, height: ch })
  .resize({ width: Math.round(cw * scale), height: Math.round(ch * scale), kernel: 'nearest' })
  .png()
  .toFile(out);
console.log(`OK ${out} from ${src} box ${cx},${cy},${cw},${ch} x${scale}`);
