import { readFileSync } from 'fs';
import sharp from 'sharp';
const [inp, bs, thrS] = process.argv.slice(2);
const [x,y,w,h] = bs.split(',').map(Number);
const thr = Number(thrS||200);
const { data, info } = await sharp(readFileSync(inp)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, channels: C } = info;
const lum=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
let n=0; const pts=[];
for (let j=y;j<y+h;j++) for (let i=x;i<x+w;i++){const o=(j*W+i)*C;const L=lum(data[o],data[o+1],data[o+2]);if(L>=thr){n++;if(pts.length<12)pts.push([i,j,data[o],data[o+1],data[o+2],Math.round(L)]);}}
console.log(JSON.stringify({count:n,total:w*h,pct:+(100*n/(w*h)).toFixed(2),samples:pts}));
