import { readFileSync } from 'fs';
import sharp from 'sharp';
const files=process.argv.slice(2);
const hsv=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0,mx*255];};
for(const f of files){
  const {data,info}=await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:W,height:H,channels:C}=info;
  const pts=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*C;const r=data[i],g=data[i+1],b=data[i+2];
    const L=0.2126*r+0.7152*g+0.0722*b;const [h,s]=hsv(r,g,b);
    if(s>0.35&&L>40&&h>=5&&h<25)pts.push([x,y,r,g,b,+h.toFixed(1)]);}
  // grid histogram 8x5
  const GX=8,GY=5;const grid=Array.from({length:GY},()=>new Array(GX).fill(0));
  for(const p of pts)grid[Math.min(GY-1,Math.floor(p[1]/H*GY))][Math.min(GX-1,Math.floor(p[0]/W*GX))]++;
  console.log(`\n=== ${f}  danger px ${pts.length}`);
  for(let y=0;y<GY;y++)console.log('   '+grid[y].map(n=>String(n).padStart(5)).join(''));
  const per=new Map();
  for(const p of pts){const k=Math.min(GY-1,Math.floor(p[1]/H*GY))+','+Math.min(GX-1,Math.floor(p[0]/W*GX));if(!per.has(k))per.set(k,[]);per.get(k).push(p);}
  for(const [k,v] of [...per.entries()].sort((a,b)=>b[1].length-a[1].length).slice(0,3)){
    const cx=Math.round(v.reduce((a,p)=>a+p[0],0)/v.length), cy=Math.round(v.reduce((a,p)=>a+p[1],0)/v.length);
    console.log(`   cell ${k}: ${v.length}px centroid(${cx},${cy}) e.g. ${v.slice(0,3).map(p=>`(${p[0]},${p[1]})rgb${p[2]},${p[3]},${p[4]}h${p[5]}`).join(' ')}`);
  }
}
