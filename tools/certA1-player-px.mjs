// certA1-player critic pixel helper: crop/zoom, box luma stats, frame diff. Read-only on captures.
import sharp from 'sharp';
const [,, cmd, ...args] = process.argv;
const box = (s) => { const [x,y,w,h] = s.split(',').map(Number); return {x,y,w,h}; };
async function raw(p) { const {data, info} = await sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true}); return {d:data, w:info.width, h:info.height}; }
const lum = (d,i) => 0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];
if (cmd === 'crop') {
  const [p, b, scale, out] = args; const {x,y,w,h} = box(b); const sc = Number(scale)||1;
  await sharp(p).extract({left:x,top:y,width:w,height:h}).resize(Math.round(w*sc), Math.round(h*sc), {kernel:'nearest'}).png().toFile(out);
  console.log('wrote', out, `${w}x${h} @${sc}x`);
} else if (cmd === 'luma') {
  const [p, ...boxes] = args; const A = await raw(p);
  for (const bs of boxes) { const {x,y,w,h} = box(bs); let s=0,n=0,mn=255,mx=0,hi=0,dark=0;
    for (let yy=y; yy<y+h; yy++) for (let xx=x; xx<x+w; xx++) { const i=(yy*A.w+xx)*4; const L=lum(A.d,i); s+=L; n++; if(L<mn)mn=L; if(L>mx)mx=L; if(L>160)hi++; if(L<40)dark++; }
    console.log(`${p} box ${bs}: mean ${(s/n).toFixed(1)} min ${mn.toFixed(0)} max ${mx.toFixed(0)} >160 ${(100*hi/n).toFixed(2)}% <40 ${(100*dark/n).toFixed(2)}%`); }
} else if (cmd === 'diff') {
  const [a, b, ...boxes] = args; const A = await raw(a), B = await raw(b);
  for (const bs of boxes) { const {x,y,w,h} = box(bs); let s=0,n=0,ch=0;
    for (let yy=y; yy<y+h; yy++) for (let xx=x; xx<x+w; xx++) { const i=(yy*A.w+xx)*4; const d=Math.max(Math.abs(A.d[i]-B.d[i]),Math.abs(A.d[i+1]-B.d[i+1]),Math.abs(A.d[i+2]-B.d[i+2])); s+=d; n++; if(d>24)ch++; }
    console.log(`diff ${bs}: meanAbs ${(s/n).toFixed(2)} changed>24 ${(100*ch/n).toFixed(2)}%`); }
} else if (cmd === 'hue') {
  // count pixels in a hue band [h0,h1] deg with sat>=smin and val>=vmin inside box
  const [p, bs, h0, h1, smin, vmin] = args; const A = await raw(p); const {x,y,w,h} = box(bs); let c=0,n=0;
  for (let yy=y; yy<y+h; yy++) for (let xx=x; xx<x+w; xx++) { const i=(yy*A.w+xx)*4; const r=A.d[i]/255,g=A.d[i+1]/255,b=A.d[i+2]/255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); const v=mx,s=mx?(mx-mn)/mx:0; let H=0; if(mx!==mn){ if(mx===r)H=60*(((g-b)/(mx-mn))%6); else if(mx===g)H=60*((b-r)/(mx-mn)+2); else H=60*((r-g)/(mx-mn)+4);} if(H<0)H+=360; n++; if(s>=+smin&&v>=+vmin&&H>=+h0&&H<=+h1)c++; }
  console.log(`${p} box ${bs} hue[${h0},${h1}] s>=${smin} v>=${vmin}: ${c} px (${(100*c/n).toFixed(2)}%)`);
}
