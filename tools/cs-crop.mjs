// crop.mjs <png> <x> <y> <w> <h> <out> [scale]
// Crops a region and upscales it (nearest) for close inspection.
import sharp from 'sharp';
const [f, x, y, w, h, out, scale = '3'] = process.argv.slice(2);
const img = sharp(f).extract({ left: +x, top: +y, width: +w, height: +h });
await img.resize({ width: Math.round(+w * +scale), kernel: 'nearest' }).toFile(out);
console.log('wrote', out);
