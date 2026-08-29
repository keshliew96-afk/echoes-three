// TEMP: locate the bolt (brightest blob) and its contact shadow (darkest blob
// in the ground band under it) in the SAME frame, so "the shadow tracks the
// bolt" is measured from pixels rather than from a stale sim probe.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file] = process.argv.slice(2);
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const luma=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
const L=(x,y)=>{const i=(y*W+x)*C;return luma(data[i],data[i+1],data[i+2]);};
// bolt = centroid of the brightest connected mass in the play band
let bx=0,by=0,bn=0,best=0;
for(let y=200;y<700;y++)for(let x=850;x<1600;x++){const v=L(x,y);if(v>250){bx+=x;by+=y;bn++;}if(v>best)best=v;}
bx/=bn||1; by/=bn||1;
// shadow = darkest 9x9 mean in a window under and around the bolt
let sx=0,sy=0,sv=1e9;
for(let y=Math.round(by);y<Math.round(by)+90;y++)for(let x=Math.round(bx)-90;x<Math.round(bx)+90;x++){
  let s=0,n=0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;s+=L(X,Y);n++;}
  const m=s/n; if(m<sv){sv=m;sx=x;sy=y;}}
// control: same-radius ground 46 px to the left of the shadow
let cs=0,cn=0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const X=sx-46+dx,Y=sy+dy;cs+=L(X,Y);cn++;}
const ctrl=cs/cn;
console.log(`${file}  bolt(${bx.toFixed(0)},${by.toFixed(0)}) peakL ${best.toFixed(0)} px ${bn} | shadow(${sx},${sy}) L${sv.toFixed(1)} vs local ground L${ctrl.toFixed(1)} -> ${(100*(1-sv/ctrl)).toFixed(1)}% darker | offset dx ${(sx-bx).toFixed(0)} dy ${(sy-by).toFixed(0)}`);
