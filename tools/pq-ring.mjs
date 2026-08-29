// Identity-ring measurement (critic tool).
// Anchors on the ring's OUTER dark ink stroke (the first dark run whose start
// sits in t=[0.72,1.05] of the ring half-size), then walks inward collecting
// the accent band as the contiguous hue-stable run just inside it.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [file, spec] = process.argv.slice(2);
const hsv=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0];};
const LU=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
const {data,info}=await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H,channels:C}=info;
const hdiff=(a,b)=>{let d=Math.abs(a-b)%360;return d>180?360-d:d;};
function meanHue(l){let sx=0,sy=0;for(const h of l){sx+=Math.cos(h*Math.PI/180);sy+=Math.sin(h*Math.PI/180);}let a=Math.atan2(sy,sx)*180/Math.PI;if(a<0)a+=360;return a;}
let DARK=+(process.env.DARK||70);
const rows=[];
for (const s of spec.split(',')){
  const [nm,cxS,cyS,hpS,accS]=s.split(':');
  const cx=+cxS, cy=+cyS, hp=+hpS, acc=accS!==undefined?+accS:NaN;
  for (const dir of [1,-1]){
    const prof=[];
    for(let d=Math.round(0.30*hp); d<=Math.round(1.7*hp); d++){
      const x=Math.round(cx+dir*d), y=Math.round(cy);
      if(x<0||x>=W||y<0||y>=H) continue;
      const i=(y*W+x)*C; const r=data[i],g=data[i+1],b=data[i+2];
      const [h,sa]=hsv(r,g,b);
      prof.push({d,t:d/hp,r,g,b,L:LU(r,g,b),h,s:sa});
    }
    const idx=(d)=>prof.findIndex(p=>p.d===d);
    // Adaptive ink threshold: a rim stroke is ink when it is well under the
    // scanline's typical value, so a bright brazier-lit ground does not make a
    // real dark rim measure as 'not dark'.
    const sorted=prof.map(p=>p.L).sort((a,b)=>a-b);
    const med=sorted[Math.floor(sorted.length/2)];
    DARK=Math.max(45,Math.min(110,0.62*med));
    // outer ink: dark run starting in t 0.72..1.05
    let runs=[],cur=null;
    for(const p of prof){ if(p.L<DARK){ if(!cur){cur={a:p.d,b:p.d};runs.push(cur);} else cur.b=p.d;} else cur=null; }
    // authored ring: band ends (outer ink starts) at 0.855 of the half-size.
    const cand=runs.filter(r=>r.a/hp>=0.68&&r.a/hp<=1.12);
    cand.sort((x,y)=>Math.abs(x.a/hp-0.855)-Math.abs(y.a/hp-0.855));
    const outer=cand[0];
    if(!outer){console.log(`  ${nm} dir${dir>0?'+':'-'}: NO outer ink stroke found (no dark run in t .72-1.06)`);continue;}
    const inkPx=outer.b-outer.a+1;
    const inkMin=Math.min(...prof.filter(p=>p.d>=outer.a&&p.d<=outer.b).map(p=>p.L));
    // band: walk inward from outer.a-1 while hue stable vs seed and L stable
    let i0=idx(outer.a)-1;
    // skip up to 1 antialias pixel
    const seed=prof[i0-1]||prof[i0];
    const band=[];
    for(let i=i0;i>=0&&band.length<Math.round(0.45*hp);i--){
      const p=prof[i];
      if(p.L<DARK) break;
      if(band.length>2 && (hdiff(p.h,meanHue(band.map(q=>q.h)))>10 || Math.abs(p.L-band[0].L)>0.35*band[0].L)) break;
      band.push(p);
    }
    // drop the first (antialias) sample if it is an outlier
    const core=band.length>3?band.slice(1,-1):band;
    const gnd=prof.filter(p=>p.d>outer.b+1&&p.d<=outer.b+1+Math.max(8,Math.round(0.30*hp))&&p.L>=DARK);
    const bh=meanHue(core.map(p=>p.h));
    const bs=core.reduce((a,p)=>a+p.s,0)/core.length;
    const bL=core.reduce((a,p)=>a+p.L,0)/core.length;
    const gL=gnd.length?gnd.reduce((a,p)=>a+p.L,0)/gnd.length:NaN;
    const dev=isNaN(acc)?NaN:hdiff(bh,acc);
    rows.push({nm,dir,bh,dev,bs,bL,gL,ratio:bL/gL,inkPx,inkMin,bandPx:core.length});
    console.log(`  ${nm.padEnd(10)} dir${dir>0?'+':'-'}  bandHue ${bh.toFixed(1)}${isNaN(dev)?'':`  (acc ${acc}, Δ${dev.toFixed(1)}°)`}  sat ${bs.toFixed(2)}  bandL ${bL.toFixed(0)} over ${core.length}px  groundL ${gL.toFixed(0)}  ratio ${(bL/gL).toFixed(2)}  outerInk ${inkPx}px minL ${inkMin.toFixed(0)}`);
  }
}
