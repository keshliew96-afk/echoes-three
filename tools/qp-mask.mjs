// TEMP: paint reserved-band pixels magenta over a darkened frame + crop/upscale.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file,out,bx,by,bw,bh,scale='6']=process.argv.slice(2);
const luma=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
function hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0,mx*255];}
const {data,info}=await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H,channels:C}=info;
const o=Buffer.alloc(W*H*3);
for(let i=0;i<W*H;i++){const r=data[i*C],g=data[i*C+1],b=data[i*C+2];const L=luma(r,g,b);const[h,s]=hsv(r,g,b);
 if(s>0.35&&L>40&&h>=5&&h<25){o[i*3]=255;o[i*3+1]=0;o[i*3+2]=255;}
 else {o[i*3]=r*0.55|0;o[i*3+1]=g*0.55|0;o[i*3+2]=b*0.55|0;}}
let img=sharp(o,{raw:{width:W,height:H,channels:3}});
if(bx!==undefined) img=img.extract({left:+bx,top:+by,width:+bw,height:+bh}).resize({width:Math.round(+bw*+scale),kernel:'nearest'});
await img.png().toFile(out);console.log('wrote',out);
