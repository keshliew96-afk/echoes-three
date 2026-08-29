// TEMP: measure a contact-shadow blob — mean luma at the projected ground point
// vs a control ring of the same ground 40 px away.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, gx, gy, r=6, off=42] = process.argv.slice(2);
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const luma=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
const sample=(cx,cy,rad)=>{let s=0,n=0;for(let y=-rad;y<=rad;y++)for(let x=-rad;x<=rad;x++){if(x*x+y*y>rad*rad)continue;const X=Math.round(+cx+x),Y=Math.round(+cy+y);if(X<0||Y<0||X>=W||Y>=H)continue;const i=(Y*W+X)*C;s+=luma(data[i],data[i+1],data[i+2]);n++;}return s/n;};
const c = sample(+gx,+gy,+r);
const ctrl = [[+off,0],[-off,0],[0,+off],[0,-off]].map(([dx,dy])=>sample(+gx+dx,+gy+dy,+r));
const cm = ctrl.reduce((a,b)=>a+b,0)/ctrl.length;
console.log(`${file}  shadow@${gx},${gy} L${c.toFixed(1)}   surrounding L${cm.toFixed(1)}   darkening ${(100*(1-c/cm)).toFixed(1)}%`);
