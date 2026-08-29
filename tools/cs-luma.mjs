// cs-luma.mjs <png> <x,y,w,h> — mean luma of a box (for shadow-dip comparisons)
import sharp from 'sharp';
const [f, boxArg] = process.argv.slice(2);
const [bx, by, bw, bh] = boxArg.split(',').map(Number);
const { data, info } = await sharp(f).extract({ left: bx, top: by, width: bw, height: bh }).raw().toBuffer({ resolveWithObject: true });
const C = info.channels;
let sum = 0;
const N = info.width * info.height;
for (let i = 0; i < N; i++) sum += 0.2126 * data[i * C] + 0.7152 * data[i * C + 1] + 0.0722 * data[i * C + 2];
console.log(JSON.stringify({ box: [bx, by, bw, bh], meanLuma: Math.round((sum / N) * 10) / 10 }));
