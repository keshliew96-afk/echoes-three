// TEMP critic tool: diff two frames, cluster the changed regions, report which
// changed pixels got DARKER (shadow) vs BRIGHTER (emissive) per cluster.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [fa,fb,thrs]=process.argv.slice(2);
const thr=+(thrs||14);
const A=await sharp(readFileSync(fa)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const B=await sharp(readFileSync(fb)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H,channels:C}=A.info;
const luma=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
const CELL=12,gw=Math.ceil(W/CELL),gh=Math.ceil(H/CELL);
const cnt=new Int32Array(gw*gh),dsum=new Float64Array(gw*gh);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*C;
 const la=luma(A.data[i],A.data[i+1],A.data[i+2]),lb=luma(B.data[i],B.data[i+1],B.data[i+2]);
 if(Math.abs(la-lb)>thr){const id=Math.floor(y/CELL)*gw+Math.floor(x/CELL);cnt[id]++;dsum[id]+=lb-la;}}
const seen=new Uint8Array(gw*gh),cl=[];
for(let cy=0;cy<gh;cy++)for(let cx=0;cx<gw;cx++){const id=cy*gw+cx;if(!cnt[id]||seen[id])continue;const st=[[cx,cy]];seen[id]=1;let n=0,d=0,sx=0,sy=0,mnx=1e9,mxx=-1,mny=1e9,mxy=-1;
 while(st.length){const [x,y]=st.pop();const i2=y*gw+x;n+=cnt[i2];d+=dsum[i2];sx+=cnt[i2]*(x*CELL);sy+=cnt[i2]*(y*CELL);mnx=Math.min(mnx,x*CELL);mxx=Math.max(mxx,x*CELL+CELL);mny=Math.min(mny,y*CELL);mxy=Math.max(mxy,y*CELL+CELL);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=gw||ny>=gh)continue;const nid=ny*gw+nx;if(cnt[nid]&&!seen[nid]){seen[nid]=1;st.push([nx,ny]);}}}
 cl.push({n,d:d/n,c:[Math.round(sx/n),Math.round(sy/n)],box:[mnx,mny,mxx-mnx,mxy-mny]});}
cl.sort((a,b)=>b.n-a.n);
console.log(`diff ${fa} vs ${fb} thr=${thr}`);
for(const c of cl.slice(0,10)) console.log(`  n=${String(c.n).padStart(6)} meanDeltaL=${c.d.toFixed(1).padStart(7)} centroid=(${c.c[0]},${c.c[1]}) box=${c.box.join(',')}`);
