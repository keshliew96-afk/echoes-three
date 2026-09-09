// certD1 crop+zoom helper: node tools/certD1-crop.mjs <in.png> <x,y,w,h> <scale> <out.png>
import sharp from 'sharp';
const [inp, box, scale, outp] = process.argv.slice(2);
const [x, y, w, h] = box.split(',').map(Number);
const s = Number(scale || 4);
const img = sharp(inp).extract({ left: x, top: y, width: w, height: h }).resize(Math.round(w * s), Math.round(h * s), { kernel: 'nearest' });
await img.png().toFile(outp);
const { data, info } = await sharp(inp).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer({ resolveWithObject: true });
let bright = 0, mx = 0; const C = info.channels;
for (let i = 0; i < info.width * info.height; i++) { const L = 0.2126 * data[i * C] + 0.7152 * data[i * C + 1] + 0.0722 * data[i * C + 2]; if (L > 160) bright++; if (L > mx) mx = L; }
console.log(`crop ${inp} box ${box} -> ${outp}; px ${info.width}x${info.height}, luma>160 ${bright}, maxLuma ${mx.toFixed(0)}`);
