// qk-diff.mjs <a.png> <b.png> [x,y,w,h] — pixels that changed between two frames:
// count, bbox, and the top hexes of the CHANGED pixels in A (what appeared).
import sharp from 'sharp';
const [fa, fb, boxArg] = process.argv.slice(2);
const load = async (f) => { let i = sharp(f); let bx=0,by=0; if(boxArg){const [x,y,w,h]=boxArg.split(',').map(Number); bx=x;by=y; i=i.extract({left:x,top:y,width:w,height:h});} const r = await i.raw().toBuffer({resolveWithObject:true}); return {...r, bx, by}; };
const A = await load(fa), B = await load(fb);
const C = A.info.channels, W = A.info.width, H = A.info.height;
const hsv=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0,mx];};
const thr = +(process.env.QKT||18);
let n=0,x0=1e9,y0=1e9,x1=-1,y1=-1; const hexes=new Map(); const bands={heal:0,danger:0,amber:0,violet:0,other:0};
for(let i=0;i<W*H;i++){
  const dr=Math.abs(A.data[i*C]-B.data[i*C]), dg=Math.abs(A.data[i*C+1]-B.data[i*C+1]), db=Math.abs(A.data[i*C+2]-B.data[i*C+2]);
  if(Math.max(dr,dg,db)<thr) continue;
  n++; const px=A.bx+(i%W), py=A.by+Math.floor(i/W);
  if(px<x0)x0=px; if(py<y0)y0=py; if(px>x1)x1=px; if(py>y1)y1=py;
  const r=A.data[i*C],g=A.data[i*C+1],b=A.data[i*C+2];
  hexes.set('#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''),(hexes.get('#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''))||0)+1);
  const [h,s,v]=hsv(r,g,b);
  if(s>0.20&&v>0.35){ if(h>=100&&h<160)bands.heal++; else if(h>=5&&h<25)bands.danger++; else if(h>=28&&h<52)bands.amber++; else if(h>=245&&h<285)bands.violet++; else bands.other++; } else bands.other++;
}
console.log(JSON.stringify({a:fa,b:fb,box:boxArg||`full ${W}x${H}`,threshold:thr,changed:n,bbox:n?[x0,y0,x1,y1]:null,bands,top:[...hexes.entries()].sort((p,q)=>q[1]-p[1]).slice(0,10)}));
