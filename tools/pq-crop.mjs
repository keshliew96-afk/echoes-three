import { readFileSync } from 'fs';
import sharp from 'sharp';
const [f,x,y,w,h,out,scale] = process.argv.slice(2);
let img = sharp(readFileSync(f)).extract({left:+x,top:+y,width:+w,height:+h});
if (scale) img = img.resize({width: Math.round(+w*+scale), kernel:'nearest'});
await img.toFile(out);
console.log('wrote', out);
