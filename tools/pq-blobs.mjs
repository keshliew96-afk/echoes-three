// Warm-pool blob detector: bright warm pixels, 4-connected clustering.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const args = process.argv.slice(2);
let LUM = 150, MINA = 400, MODE='warm';
const files=[];
for (let i=0;i<args.length;i++){
  if(args[i]==='--lum') LUM=+args[++i];
  else if(args[i]==='--min') MINA=+args[++i];
  else if(args[i]==='--mode') MODE=args[++i];
  else files.push(args[i]);
}
const hsv=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0,mx*255];};
for (const f of files){
  const {data,info}=await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:W,height:H,channels:C}=info;
  const mask=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++){
    const r=data[i*C],g=data[i*C+1],b=data[i*C+2];
    const L=0.2126*r+0.7152*g+0.0722*b;
    const [h,s]=hsv(r,g,b);
    let ok=false;
    if(MODE==='warm') ok = L>LUM && (h>=330||h<60) ;
    else if(MODE==='bright') ok = L>LUM;
    if(ok) mask[i]=1;
  }
  // flood fill
  const lab=new Int32Array(W*H).fill(-1);
  const blobs=[];
  const stack=new Int32Array(W*H);
  for(let i=0;i<W*H;i++){
    if(!mask[i]||lab[i]>=0) continue;
    const id=blobs.length; let sp=0; stack[sp++]=i; lab[i]=id;
    let n=0,sx=0,sy=0,minx=1e9,maxx=-1,miny=1e9,maxy=-1,sr=0,sg=0,sb=0;
    while(sp){
      const p=stack[--sp]; const x=p%W,y=(p-x)/W;
      n++;sx+=x;sy+=y;if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;
      sr+=data[p*C];sg+=data[p*C+1];sb+=data[p*C+2];
      if(x>0){const q=p-1;if(mask[q]&&lab[q]<0){lab[q]=id;stack[sp++]=q;}}
      if(x<W-1){const q=p+1;if(mask[q]&&lab[q]<0){lab[q]=id;stack[sp++]=q;}}
      if(y>0){const q=p-W;if(mask[q]&&lab[q]<0){lab[q]=id;stack[sp++]=q;}}
      if(y<H-1){const q=p+W;if(mask[q]&&lab[q]<0){lab[q]=id;stack[sp++]=q;}}
    }
    blobs.push({n,cx:Math.round(sx/n),cy:Math.round(sy/n),bbox:[minx,miny,maxx-minx+1,maxy-miny+1],
      rgb:[Math.round(sr/n),Math.round(sg/n),Math.round(sb/n)]});
  }
  blobs.sort((a,b)=>b.n-a.n);
  console.log(`\n=== ${f} (${W}x${H}) mode=${MODE} lum>${LUM} min=${MINA}`);
  for(const b of blobs.filter(b=>b.n>=MINA)){
    const [h,s,v]=hsv(...b.rgb);
    console.log(` blob n=${b.n} centroid=(${b.cx},${b.cy}) bbox=${b.bbox.join(',')} meanRGB=${b.rgb.join(',')} h=${h.toFixed(1)} s=${s.toFixed(2)}`);
  }
  console.log(` total blobs>=${MINA}: ${blobs.filter(b=>b.n>=MINA).length}, all: ${blobs.length}`);
}
