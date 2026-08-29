// Critic probe helper: crop + nearest-neighbour magnify a capture region.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [,, file, box, out, scaleArg] = process.argv;
const [x,y,w,h] = box.split(',').map(Number);
const scale = scaleArg ? Number(scaleArg) : 4;
await sharp(readFileSync(file)).extract({left:x, top:y, width:w, height:h})
  .resize({width: Math.round(w*scale), height: Math.round(h*scale), kernel:'nearest'}).png().toFile(out);
console.log('ok', out);
