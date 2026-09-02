#!/usr/bin/env node
// node tools/xh-px.mjs <png> "x,y,w,h[:label]" ... -> mean/max/min RGB + luma of each box
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [inp, ...boxes] = process.argv.slice(2);
const { data, info } = await sharp(readFileSync(inp)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, channels: C } = info;
const lum = (r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
const srgb=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const rel=(r,g,b)=>0.2126*srgb(r)+0.7152*srgb(g)+0.0722*srgb(b);
const out=[];
for (const spec of boxes) {
  const [bs, label] = spec.split(':');
  const [x,y,w,h] = bs.split(',').map(Number);
  let sr=0,sg=0,sb=0,n=0, mx=-1, mxpx=null, mn=1e9, mnpx=null;
  for (let j=y;j<y+h;j++) for (let i=x;i<x+w;i++){
    const o=(j*W+i)*C; const r=data[o],g=data[o+1],b=data[o+2];
    sr+=r;sg+=g;sb+=b;n++;
    const L=lum(r,g,b);
    if(L>mx){mx=L;mxpx=[r,g,b];}
    if(L<mn){mn=L;mnpx=[r,g,b];}
  }
  const mean=[sr/n,sg/n,sb/n].map(v=>Math.round(v));
  out.push({label:label||bs, box:[x,y,w,h], mean, meanLuma:+lum(...mean).toFixed(1), maxLuma:+mx.toFixed(1), maxPx:mxpx, minLuma:+mn.toFixed(1), minPx:mnpx,
    relMax:+rel(...mxpx).toFixed(4), relMin:+rel(...mnpx).toFixed(4),
    contrastMaxMin:+(((rel(...mxpx)+0.05)/(rel(...mnpx)+0.05))).toFixed(2)});
}
console.log(JSON.stringify(out,null,1));
