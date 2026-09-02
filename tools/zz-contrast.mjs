// zz-contrast.mjs <png> <x,y,w,h> [--split N]  (critic-owned)
// WCAG contrast between the bright (ink) and dark (plate) pixel clusters in a box.
import sharp from 'sharp';
const [inp, boxs, ...rest] = process.argv.slice(2);
const [x,y,w,h] = boxs.split(',').map(Number);
const { data, info } = await sharp(inp).extract({left:x,top:y,width:w,height:h}).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const C = info.channels, N = info.width*info.height;
const lin = (c)=>{const s=c/255; return s<=0.03928? s/12.92 : Math.pow((s+0.055)/1.055,2.4);};
const relL = (r,g,b)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
const px = [];
for (let i=0;i<N;i++){ const r=data[i*C],g=data[i*C+1],b=data[i*C+2]; px.push({r,g,b,L:relL(r,g,b), Y:0.2126*r+0.7152*g+0.0722*b}); }
// Otsu on Y
const hist=new Array(256).fill(0); for(const p of px) hist[Math.round(p.Y)]++;
let total=N, sum=0; for(let t=0;t<256;t++) sum+=t*hist[t];
let sumB=0,wB=0,mx=0,thr=0;
for(let t=0;t<256;t++){ wB+=hist[t]; if(!wB) continue; const wF=total-wB; if(!wF) break; sumB+=t*hist[t];
  const mB=sumB/wB, mF=(sum-sumB)/wF, between=wB*wF*(mB-mF)*(mB-mF); if(between>mx){mx=between;thr=t;} }
const hi=px.filter(p=>p.Y>thr), lo=px.filter(p=>p.Y<=thr);
const mean=(a,k)=>a.length? a.reduce((s,p)=>s+p[k],0)/a.length : 0;
// top decile of hi = glyph core; bottom decile of lo = plate core
hi.sort((a,b)=>b.Y-a.Y); lo.sort((a,b)=>a.Y-b.Y);
const hiCore=hi.slice(0,Math.max(1,Math.floor(hi.length*0.2)));
const loCore=lo.slice(0,Math.max(1,Math.floor(lo.length*0.5)));
const Lhi=mean(hiCore,'L'), Llo=mean(loCore,'L');
const ratio=(Math.max(Lhi,Llo)+0.05)/(Math.min(Lhi,Llo)+0.05);
const avg=(a)=>[Math.round(mean(a,'r')),Math.round(mean(a,'g')),Math.round(mean(a,'b'))];
console.log(`${inp} box ${boxs}`);
console.log(`  threshold Y=${thr}  ink px ${hi.length} (${(hi.length/N*100).toFixed(1)}%)  plate px ${lo.length}`);
console.log(`  ink  rgb(${avg(hiCore).join(',')})  L=${Lhi.toFixed(4)}`);
console.log(`  plate rgb(${avg(loCore).join(',')})  L=${Llo.toFixed(4)}`);
console.log(`  WCAG contrast ratio = ${ratio.toFixed(2)}:1`);
const maxY=Math.max(...px.map(p=>p.Y));
console.log(`  maxY in box ${maxY.toFixed(1)}`);
