import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file,x0S,x1S,yS] = process.argv.slice(2);
const {data,info}=await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,channels:C}=info;
const y=+yS; const out=[];
for(let x=+x0S;x<=+x1S;x++){const i=(y*W+x)*C;out.push([x,+(0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2]).toFixed(0)]);}
console.log(out.map(([x,l])=>`${x}:${l}`).join(' '));
