// zz-crop.mjs <in.png> <x,y,w,h> <scale> <out.png>  (critic-owned)
import sharp from 'sharp';
const [inp, boxs, scaleS, out] = process.argv.slice(2);
const [x,y,w,h] = boxs.split(',').map(Number);
const scale = Number(scaleS)||1;
const meta = await sharp(inp).metadata();
const L = Math.max(0, Math.min(meta.width-1, x));
const T = Math.max(0, Math.min(meta.height-1, y));
const W = Math.max(1, Math.min(meta.width-L, w));
const H = Math.max(1, Math.min(meta.height-T, h));
await sharp(inp).extract({left:L, top:T, width:W, height:H}).resize({width:Math.round(W*scale), kernel:'nearest'}).png().toFile(out);
console.log('wrote', out, W+'x'+H, '->', Math.round(W*scale)+'x'+Math.round(H*scale));
