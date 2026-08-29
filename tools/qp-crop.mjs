// TEMP critic tool (delete after review): crop + upscale a region for eyeballing.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file,x,y,w,h,scale,out]=process.argv.slice(2);
const s=parseFloat(scale||'4');
await sharp(readFileSync(file)).extract({left:+x,top:+y,width:+w,height:+h}).resize({width:Math.round(+w*s),kernel:'nearest'}).png().toFile(out);
console.log('wrote',out);
