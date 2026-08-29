// Critic probe: ember-decal strength in a box = mean(R-G) over danger-hue pixels + count.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [,, box, ...files] = process.argv;
const [x,y,w,h] = box.split(',').map(Number);
for (const f of files) {
  const { data, info } = await sharp(readFileSync(f)).extract({left:x,top:y,width:w,height:h})
    .ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
  const C = info.channels; const n = info.width*info.height;
  let sum=0, cnt=0, peak=0;
  for(let i=0;i<n;i++){const r=data[i*C],g=data[i*C+1],b=data[i*C+2];
    const d = r - Math.max(g,b);
    if (d > 20 && r > 90) { sum += d; cnt++; if (d>peak) peak=d; }}
  console.log(`${f.split(/[\/]/).pop()} emberPx=${cnt} meanRminusG=${cnt?(sum/cnt).toFixed(1):0} peak=${peak}`);
}
