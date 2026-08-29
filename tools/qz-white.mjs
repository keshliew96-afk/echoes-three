// Critic probe: count near-white low-saturation pixels in a box (hit-flash detector).
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [,, box, ...files] = process.argv;
const [x,y,w,h] = box.split(',').map(Number);
for (const f of files) {
  const { data, info } = await sharp(readFileSync(f)).extract({left:x,top:y,width:w,height:h})
    .ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
  const C = info.channels; let white=0, n=info.width*info.height, maxL=0;
  for(let i=0;i<n;i++){const r=data[i*C],g=data[i*C+1],b=data[i*C+2];
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b);const s=mx?(mx-mn)/mx:0;
    const L=0.2126*r+0.7152*g+0.0722*b; if(L>maxL)maxL=L;
    if(L>170 && s<0.28) white++;}
  console.log(`${f.split(/[\/]/).pop()} white=${white} (${(white/n*100).toFixed(1)}%) maxL=${maxL.toFixed(0)}`);
}
