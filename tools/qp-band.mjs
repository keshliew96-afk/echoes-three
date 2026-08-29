// TEMP: list the pixels of a frame inside a hue/sat band within a box, grouped
// by rounded colour, so a builder can name exactly which surface is offending.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, bx, by, bw, bh, mode='danger'] = process.argv.slice(2);
const luma=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
function hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0,mx*255];}
const tests={danger:(h,s,L)=>s>0.35&&L>40&&h>=5&&h<25, near:(h,s,L)=>s>0.30&&L>40&&h>=0&&h<32};
const test=tests[mode];
const {data,info}=await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H,channels:C}=info;
const X0=bx?+bx:0,Y0=by?+by:0,X1=bw?X0+ +bw:W,Y1=bh?Y0+ +bh:H;
const map=new Map();
let n=0;
for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++){const i=(y*W+x)*C;const r=data[i],g=data[i+1],b=data[i+2];const L=luma(r,g,b);const [h,s]=hsv(r,g,b);
 if(test(h,s,L)){n++;const k=`${(r/8|0)*8},${(g/8|0)*8},${(b/8|0)*8}`;const e=map.get(k)||{n:0,h:0,s:0,L:0,x:0,y:0};e.n++;e.h+=h;e.s+=s;e.L+=L;e.x+=x;e.y+=y;map.set(k,e);}}
const rows=[...map.entries()].sort((a,b)=>b[1].n-a[1].n).slice(0,14);
console.log(`${file} box ${X0},${Y0},${X1-X0},${Y1-Y0} mode=${mode} total=${n}`);
for(const [k,e] of rows) console.log(`  ${String(e.n).padStart(4)}  rgb(${k})  h ${(e.h/e.n).toFixed(1)}  s ${(e.s/e.n).toFixed(3)}  L ${(e.L/e.n).toFixed(0)}  at ~${(e.x/e.n)|0},${(e.y/e.n)|0}`);
