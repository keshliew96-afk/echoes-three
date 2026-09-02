import sharp from 'sharp';
const [,, a, b] = process.argv;
const A = await sharp(a).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const B = await sharp(b).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const W = A.info.width, H = A.info.height, C = A.info.channels;
const hsv=(r,g,bb)=>{r/=255;g/=255;bb/=255;const mx=Math.max(r,g,bb),mn=Math.min(r,g,bb),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-bb)/d)%6);else if(mx===g)h=60*((bb-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0,mx*255];};
let n=0, big=0;
const cell = 40;
const grid = {};
let hueBefore=[], hueAfter=[];
for (let y=0;y<H;y++) for (let x=0;x<W;x++){
  const i=(y*W+x)*C;
  const d=Math.abs(A.data[i]-B.data[i])+Math.abs(A.data[i+1]-B.data[i+1])+Math.abs(A.data[i+2]-B.data[i+2]);
  if(d>24){n++; const k=`${Math.floor(x/cell)*cell},${Math.floor(y/cell)*cell}`; grid[k]=(grid[k]||0)+1;
    if(d>60){big++; if(hueBefore.length<200000){hueBefore.push(hsv(A.data[i],A.data[i+1],A.data[i+2])); hueAfter.push(hsv(B.data[i],B.data[i+1],B.data[i+2]));}}}
}
const cells=Object.entries(grid).sort((p,q)=>q[1]-p[1]).slice(0,14);
console.log(`changed(>24) ${n} px (${(n/(W*H)*100).toFixed(2)}%)  strong(>60) ${big}`);
console.log('hot 40x40 cells:', cells.map(([k,v])=>`${k}:${v}`).join('  '));
// hue histogram of strong changes
const bins=new Array(36).fill(0), binsA=new Array(36).fill(0);
for(let i=0;i<hueBefore.length;i++){bins[Math.floor(hueAfter[i][0]/10)]++;binsA[Math.floor(hueBefore[i][0]/10)]++;}
console.log('strong-change hue BEFORE(A) per 10deg:', binsA.map((v,i)=>v>200?`${i*10}:${v}`:null).filter(Boolean).join(' '));
console.log('strong-change hue AFTER(B)  per 10deg:', bins.map((v,i)=>v>200?`${i*10}:${v}`:null).filter(Boolean).join(' '));
