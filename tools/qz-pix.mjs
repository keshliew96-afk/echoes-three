// Critic probe: dominant colours in a box + hue histogram of saturated pixels.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [,, file, box] = process.argv;
const [x,y,w,h] = box.split(',').map(Number);
const { data, info } = await sharp(readFileSync(file)).extract({left:x,top:y,width:w,height:h})
  .ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const C = info.channels;
function hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let hh=0;
 if(d){if(mx===r)hh=60*(((g-b)/d)%6);else if(mx===g)hh=60*((b-r)/d+2);else hh=60*((r-g)/d+4);}
 if(hh<0)hh+=360;return [hh, mx?d/mx:0, mx];}
const counts = new Map();
let best = null;
for(let i=0;i<info.width*info.height;i++){
  const r=data[i*C],g=data[i*C+1],b=data[i*C+2];
  const key=`${r>>3},${g>>3},${b>>3}`;
  counts.set(key,(counts.get(key)||0)+1);
  const [hh,s,v]=hsv(r,g,b);
  if(s>0.5 && (!best || s*v > best.sv)) best={sv:s*v,r,g,b,h:hh.toFixed(1),s:s.toFixed(2),v:(v*255).toFixed(0)};
}
const top=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6)
  .map(([k,c])=>{const [r,g,b]=k.split(',').map(n=>Number(n)*8);const [hh,s,v]=hsv(r,g,b);
    return `rgb(${r},${g},${b}) h=${hh.toFixed(0)} s=${s.toFixed(2)} n=${c}`;});
console.log(`${file} box ${box}`);
console.log('  top:', top.join(' | '));
console.log('  most-saturated:', best ? `rgb(${best.r},${best.g},${best.b}) h=${best.h} s=${best.s} v=${best.v}` : 'none');
