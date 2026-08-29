// TEMP critic tool (delete after review): locate pixels in a hue/sat band and
// cluster them into bounding boxes so a critic can name the on-screen source.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const args = process.argv.slice(2);
const file = args[0];
const mode = args[1] || 'danger';
const bands = {
  danger: (h,s,L)=> s>0.35 && L>40 && h>=5 && h<25,
  violet: (h,s,L)=> s>0.35 && L>40 && h>=245 && h<285,
  amberbright: (h,s,L)=> s>0.30 && L>150 && h>=25 && h<60,
  cool:   (h,s,L)=> s>0.12 && h>=160 && h<330,
  bright: (h,s,L)=> L>190,
  pool: (h,s,L)=> L>150 && (h<70 || h>300),
};
const test = bands[mode];
const luma=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
function hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0,mx*255];}
const {data,info}=await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H,channels:C}=info;
const CELL=16, gw=Math.ceil(W/CELL), gh=Math.ceil(H/CELL);
const grid=new Int32Array(gw*gh);
let total=0;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*C;const r=data[i],g=data[i+1],b=data[i+2];const L=luma(r,g,b);const [h,s]=hsv(r,g,b);if(test(h,s,L)){grid[Math.floor(y/CELL)*gw+Math.floor(x/CELL)]++;total++;}}
// flood-fill clusters over non-empty cells
const seen=new Uint8Array(gw*gh); const clusters=[];
for(let cy=0;cy<gh;cy++)for(let cx=0;cx<gw;cx++){const idx=cy*gw+cx;if(!grid[idx]||seen[idx])continue;const st=[[cx,cy]];seen[idx]=1;let n=0,minx=1e9,maxx=-1,miny=1e9,maxy=-1,sx=0,sy=0;
 while(st.length){const [x,y]=st.pop();const id=y*gw+x;const c=grid[id];n+=c;sx+=c*(x*CELL+CELL/2);sy+=c*(y*CELL+CELL/2);
  minx=Math.min(minx,x*CELL);maxx=Math.max(maxx,x*CELL+CELL);miny=Math.min(miny,y*CELL);maxy=Math.max(maxy,y*CELL+CELL);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=gw||ny>=gh)continue;const nid=ny*gw+nx;if(grid[nid]&&!seen[nid]){seen[nid]=1;st.push([nx,ny]);}}}
 clusters.push({n,box:[minx,miny,maxx-minx,maxy-miny],c:[Math.round(sx/n),Math.round(sy/n)]});}
clusters.sort((a,b)=>b.n-a.n);
console.log(`${file} band=${mode} total=${total} clusters=${clusters.length}`);
for(const cl of clusters.slice(0,14)) console.log(`  n=${String(cl.n).padStart(6)} centroid=(${cl.c[0]},${cl.c[1]}) box=${cl.box.join(',')}`);
