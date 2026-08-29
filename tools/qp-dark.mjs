// TEMP critic tool: find the darkest 9x9 patch inside a box (shadow locator).
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file,bx,by,bw,bh]=process.argv.slice(2);
const {data,info}=await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,channels:C}=info;
const luma=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
let best=1e9,bxr=0,byr=0,sum=0,n=0;
for(let y=+by;y<+by+ +bh;y++)for(let x=+bx;x<+bx+ +bw;x++){let s=0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const i=((y+dy)*W+x+dx)*C;s+=luma(data[i],data[i+1],data[i+2]);}s/=81;sum+=s;n++;if(s<best){best=s;bxr=x;byr=y;}}
console.log(`${file} box=${bx},${by},${bw},${bh}  darkest 9x9 mean L=${best.toFixed(1)} at (${bxr},${byr})   box mean L=${(sum/n).toFixed(1)}`);
