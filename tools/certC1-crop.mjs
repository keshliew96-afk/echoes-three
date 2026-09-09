// certC1 crop+zoom helper (copy of certD1-crop.mjs): node tools/certC1-crop.mjs <in.png> <x,y,w,h> <scale> <out.png>
import sharp from 'sharp';
const [inp, box, scale, outp] = process.argv.slice(2);
const [x, y, w, h] = box.split(',').map(Number);
const s = Number(scale || 4);
const img = sharp(inp).extract({ left: x, top: y, width: w, height: h }).resize(Math.round(w * s), Math.round(h * s), { kernel: 'nearest' });
await img.png().toFile(outp);
const { data, info } = await sharp(inp).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer({ resolveWithObject: true });
let bright = 0, mx = 0, dng = 0; const C = info.channels;
const hsv = (r, g, b) => { const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m; if (!d) return [0, 0]; let h; if (M === r) h = ((g - b) / d) % 6; else if (M === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return [h, M ? d / M : 0]; };
for (let i = 0; i < info.width * info.height; i++) { const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2]; const L = 0.2126 * r + 0.7152 * g + 0.0722 * b; if (L > 160) bright++; if (L > mx) mx = L; const [hh, ss] = hsv(r, g, b); if (ss > 0.35 && L > 40 && hh >= 5 && hh < 25) dng++; }
console.log(`crop ${inp} box ${box} -> ${outp}; px ${info.width}x${info.height}, luma>160 ${bright}, maxLuma ${mx.toFixed(0)}, danger ${dng}`);
