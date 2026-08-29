// TEMP critic tool: print 3x3-averaged RGB/HSV/luma at given pixels.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file,...pts]=process.argv.slice(2);
const {data,info}=await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H,channels:C}=info;
const luma=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
function hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0,mx*255];}
for(const p of pts){const [x,y]=p.split(',').map(Number);let r=0,g=0,b=0,n=0;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const i=(yy*W+xx)*C;r+=data[i];g+=data[i+1];b+=data[i+2];n++;}
 r/=n;g/=n;b/=n;const [h,s]=hsv(r,g,b);
 console.log(`${p}  rgb(${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)}) #${[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')}  hue ${h.toFixed(1)}  sat ${s.toFixed(3)}  luma ${luma(r,g,b).toFixed(1)}`);}
