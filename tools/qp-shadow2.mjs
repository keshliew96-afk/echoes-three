// Contact-shadow measurer: given the bolt's projected GROUND point, find the
// local luma minimum within 14 px of it and compare with an annulus of ground
// 26-34 px out (the same lighting neighbourhood, outside the blob).
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, gx, gy] = process.argv.slice(2);
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, channels: C } = info;
const luma=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
const L=(x,y)=>{const i=(Math.round(y)*W+Math.round(x))*C;return luma(data[i],data[i+1],data[i+2]);};
const m5=(x,y)=>{let s=0,n=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){s+=L(x+dx,y+dy);n++;}return s/n;};
let bx=+gx,by=+gy,bv=1e9;
for(let y=+gy-14;y<=+gy+14;y++)for(let x=+gx-14;x<=+gx+14;x++){const v=m5(x,y);if(v<bv){bv=v;bx=x;by=y;}}
let s=0,n=0;
for(let a=0;a<360;a+=6){const th=a*Math.PI/180;for(const r of [26,30,34]){s+=L(bx+Math.cos(th)*r, by+Math.sin(th)*r*0.62);n++;}}
const ring=s/n;
console.log(`${file}  ground-point(${gx},${gy}) darkest(${bx},${by}) L${bv.toFixed(1)}  ring L${ring.toFixed(1)}  -> ${(100*(1-bv/ring)).toFixed(1)}% darker`);
