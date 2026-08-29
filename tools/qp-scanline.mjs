// TEMP critic tool: dump a horizontal scanline (hex/hue/sat/luma per px).
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file,ys,x0s,x1s]=process.argv.slice(2);
const y=+ys,x0=+x0s,x1=+x1s;
const {data,info}=await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,channels:C}=info;
const luma=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
function hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0];}
const rows=[];
for(let x=x0;x<=x1;x++){const i=(y*W+x)*C;const r=data[i],g=data[i+1],b=data[i+2];const [h,s]=hsv(r,g,b);
 rows.push(`x=${x} #${[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')} h=${h.toFixed(0).padStart(3)} s=${s.toFixed(2)} L=${luma(r,g,b).toFixed(0).padStart(3)}`);}
console.log(`scanline y=${y}`);
for(let i=0;i<rows.length;i+=4) console.log(rows.slice(i,i+4).join('  | '));
