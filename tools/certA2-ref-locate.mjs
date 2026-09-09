// certA2-ref critic tool: bounding box + count of pixels in a hue band.
// usage: node tools/certA2-ref-locate.mjs <png> <band>   band = danger|violet|heal|bright
import sharp from 'sharp';
const [src, band] = process.argv.slice(2);
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, ch = info.channels;
function hsv(r, g, b) {
  r/=255; g/=255; b/=255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
  let h = 0;
  if (d) { if (mx===r) h = 60*(((g-b)/d)%6); else if (mx===g) h = 60*((b-r)/d+2); else h = 60*((r-g)/d+4); }
  if (h<0) h+=360;
  return [h, mx? d/mx : 0, mx];
}
const test = {
  danger: (h,s,v) => (h<=22||h>=350) && s>0.55 && v>0.35,
  violet: (h,s,v) => h>=245 && h<=290 && s>0.35 && v>0.30,
  heal:   (h,s,v) => h>=95 && h<=160 && s>0.45 && v>0.35,
  bright: (h,s,v) => v>0.86,
}[band];
let n=0, x0=1e9,y0=1e9,x1=-1,y1=-1; const grid = {};
for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
  const i=(y*W+x)*ch; const [h,s,v]=hsv(data[i],data[i+1],data[i+2]);
  if (test(h,s,v)) { n++; if(x<x0)x0=x; if(y<y0)y0=y; if(x>x1)x1=x; if(y>y1)y1=y;
    const k=`${Math.floor(x/200)*200},${Math.floor(y/150)*150}`; grid[k]=(grid[k]||0)+1; }
}
const top = Object.entries(grid).sort((a,b)=>b[1]-a[1]).slice(0,6);
console.log(src, band, 'count', n, 'bbox', n? `${x0},${y0}-${x1},${y1}`:'-', 'topcells', JSON.stringify(top));
