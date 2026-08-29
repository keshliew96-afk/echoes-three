// Report the brightest pixels in a box + their hue/sat, and the hue profile by luma band.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, bx, by, bw, bh] = process.argv.slice(2);
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha()
  .extract({ left: +bx, top: +by, width: +bw, height: +bh }).raw().toBuffer({ resolveWithObject: true });
const C = info.channels;
function hsv(r, g, b) { r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;
  if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);} if(h<0)h+=360;
  return [h, mx?d/mx:0, mx*255]; }
const px = [];
for (let i = 0; i < info.width * info.height; i++) {
  const r = data[i*C], g = data[i*C+1], b = data[i*C+2];
  const L = 0.2126*r + 0.7152*g + 0.0722*b;
  px.push({ r, g, b, L, hsv: hsv(r,g,b) });
}
px.sort((a,b)=>b.L-a.L);
const fmt = (p) => `rgb(${p.r},${p.g},${p.b}) L=${p.L.toFixed(0)} h=${p.hsv[0].toFixed(0)} s=${p.hsv[1].toFixed(2)} v=${p.hsv[2].toFixed(0)}`;
console.log(`${file} box ${bx},${by} ${bw}x${bh}  n=${px.length}`);
console.log('TOP1   ', fmt(px[0]));
const top1pct = px.slice(0, Math.max(1, Math.round(px.length*0.01)));
const avg = (arr,k)=>arr.reduce((s,p)=>s+p[k],0)/arr.length;
console.log(`TOP1%   mean rgb(${avg(top1pct,'r').toFixed(0)},${avg(top1pct,'g').toFixed(0)},${avg(top1pct,'b').toFixed(0)}) meanHue=${(top1pct.reduce((s,p)=>s+p.hsv[0],0)/top1pct.length).toFixed(0)} meanSat=${(top1pct.reduce((s,p)=>s+p.hsv[1],0)/top1pct.length).toFixed(2)}`);
for (const [lo,hi] of [[240,256],[220,240],[200,220],[180,200],[150,180]]) {
  const b = px.filter(p=>p.L>=lo&&p.L<hi);
  if (!b.length) continue;
  console.log(`L ${lo}-${hi}  n=${b.length}  meanRGB=(${avg(b,'r').toFixed(0)},${avg(b,'g').toFixed(0)},${avg(b,'b').toFixed(0)})  meanHue=${(b.reduce((s,p)=>s+p.hsv[0],0)/b.length).toFixed(0)}  meanSat=${(b.reduce((s,p)=>s+p.hsv[1],0)/b.length).toFixed(2)}`);
}
