// qk-hue.mjs <png> [x,y,w,h] — critic hue audit for the heal/damage colour law.
// Reports, for saturated pixels (s>0.35, v>0.45): counts + top hexes + bbox for
// the heal band (h 100-160), the Ember danger band (h 5-25), the amber band
// (h 28-52) and violet (h 245-285). Bright Heal #5FE873 = h 128.8.
import sharp from 'sharp';
const [f, boxArg] = process.argv.slice(2);
let img = sharp(f);
let bx = 0, by = 0;
if (boxArg) { const [x, y, w, h] = boxArg.split(',').map(Number); bx = x; by = y; img = img.extract({ left: x, top: y, width: w, height: h }); }
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const C = info.channels, W = info.width, H = info.height;
const hsv = (r, g, b) => { r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; let h=0; if(d){ if(mx===r)h=60*(((g-b)/d)%6); else if(mx===g)h=60*((b-r)/d+2); else h=60*((r-g)/d+4);} if(h<0)h+=360; return [h, mx?d/mx:0, mx]; };
const bands = { heal:[100,160], danger:[5,25], amber:[28,52], violet:[245,285] };
const out = {};
for (const k of Object.keys(bands)) out[k] = { n:0, hexes:new Map(), x0:1e9,y0:1e9,x1:-1,y1:-1, hueSum:0, maxV:0, maxHex:null };
for (let i = 0; i < W*H; i++) {
  const r=data[i*C], g=data[i*C+1], b=data[i*C+2];
  const [h,s,v] = hsv(r,g,b);
  if (s <= (+process.env.QKS||0.35) || v <= (+process.env.QKV||0.45)) continue;
  for (const [k,[lo,hi]] of Object.entries(bands)) {
    if (h >= lo && h < hi) {
      const o = out[k]; o.n++; o.hueSum += h;
      const hex = '#'+[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join('');
      o.hexes.set(hex,(o.hexes.get(hex)||0)+1);
      const px = bx + (i%W), py = by + Math.floor(i/W);
      if(px<o.x0)o.x0=px; if(py<o.y0)o.y0=py; if(px>o.x1)o.x1=px; if(py>o.y1)o.y1=py;
      if(v>o.maxV){o.maxV=v;o.maxHex=hex;}
    }
  }
}
const res = {};
for (const [k,o] of Object.entries(out)) res[k] = { n:o.n, meanHue:o.n?+(o.hueSum/o.n).toFixed(1):null, brightest:o.maxHex, top:[...o.hexes.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6), bbox:o.n?[o.x0,o.y0,o.x1,o.y1]:null };
console.log(JSON.stringify({ file:f, box:boxArg||`full ${W}x${H}`, ...res }));
