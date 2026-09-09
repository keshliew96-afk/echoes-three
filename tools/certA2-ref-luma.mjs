// certA2-ref critic tool: mean luma of a box.
import sharp from 'sharp';
const src = process.argv[2];
for (const box of process.argv.slice(3)) {
  const [x,y,w,h] = box.split(',').map(Number);
  const { data, info } = await sharp(src).extract({left:x,top:y,width:w,height:h}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let s=0,n=0; const ch=info.channels;
  for (let i=0;i<data.length;i+=ch){ s += 0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2]; n++; }
  console.log(src, box, 'meanLuma', (s/n).toFixed(1));
}
