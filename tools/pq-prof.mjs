import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file,cxS,cyS,hpS,dirS] = process.argv.slice(2);
const hsv=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0];};
const lum=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
const {data,info}=await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,channels:C}=info;
const cx=+cxS,cy=+cyS,hp=+hpS,dir=+dirS;
for(let d=Math.round(0.40*hp); d<=Math.round(1.35*hp); d++){
  const x=Math.round(cx+dir*d), y=Math.round(cy);
  const i=(y*W+x)*C; const r=data[i],g=data[i+1],b=data[i+2];
  const [h,s]=hsv(r,g,b);
  console.log(`t=${(d/hp).toFixed(3)} x=${x} rgb=${r},${g},${b} L=${lum(r,g,b).toFixed(0)} h=${h.toFixed(1)} s=${s.toFixed(2)}`);
}
