import { readFileSync } from 'fs';
import sharp from 'sharp';
const [inp, bs, thrS] = process.argv.slice(2);
const [x,y,w,h] = bs.split(',').map(Number);
const thr = Number(thrS||30);
const { data, info } = await sharp(readFileSync(inp)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, channels: C } = info;
let n=0;
for (let j=y;j<y+h;j++) for (let i=x;i<x+w;i++){const o=(j*W+i)*C;const r=data[o],g=data[o+1],b=data[o+2];const ch=Math.max(r,g,b)-Math.min(r,g,b);if(ch>thr)n++;}
console.log(JSON.stringify({file:inp,box:[x,y,w,h],chromaticPx:n,total:w*h,pct:+(100*n/(w*h)).toFixed(1)}));
