// Local contrast probe: mean luma in a small disc vs an annulus around it.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file,cxS,cyS,rIn='6',rOut='22'] = process.argv.slice(2);
const {data,info}=await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H,channels:C}=info;
const cx=+cxS,cy=+cyS,ri=+rIn,ro=+rOut;
let si=0,ni=0,so=0,no=0,minL=999,minAt=null;
for(let y=Math.max(0,cy-ro-2);y<Math.min(H,cy+ro+2);y++)for(let x=Math.max(0,cx-ro-2);x<Math.min(W,cx+ro+2);x++){
  const d=Math.hypot(x-cx,y-cy); const i=(y*W+x)*C;
  const L=0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2];
  if(d<=ri){si+=L;ni++;if(L<minL){minL=L;minAt=[x,y];}}
  else if(d>=ro-6&&d<=ro){so+=L;no++;}
}
console.log(`${file} centre(${cx},${cy}) discL ${(si/ni).toFixed(1)}  ringL ${(so/no).toFixed(1)}  delta ${((si/ni)-(so/no)).toFixed(1)}  darkest ${minL.toFixed(0)} @${minAt}`);
