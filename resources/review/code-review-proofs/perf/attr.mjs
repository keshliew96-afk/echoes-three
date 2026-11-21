import fs from 'node:fs';
const [js, mapf] = process.argv.slice(2);
const code = fs.readFileSync(js,'utf8'); const map = JSON.parse(fs.readFileSync(mapf,'utf8'));
const B='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; const dec={};[...B].forEach((c,i)=>dec[c]=i);
function vlq(s){const out=[];let v=0,sh=0;for(const c of s){let d=dec[c];v+=(d&31)<<sh;if(d&32){sh+=5}else{out.push(v&1?-(v>>1):v>>1);v=0;sh=0}}return out}
const lines=code.split('\n'); const sizes={}; let src=0;
map.mappings.split(';').forEach((ln,li)=>{const L=lines[li]||'';let col=0;const segs=ln?ln.split(','):[];const pts=[];for(const sg of segs){const f=vlq(sg);col+=f[0];if(f.length>1){src+=f[1];}pts.push([col,f.length>1?src:-1]);}
 for(let i=0;i<pts.length;i++){const end=i+1<pts.length?pts[i+1][0]:L.length;const k=pts[i][1]<0?'(none)':map.sources[pts[i][1]];sizes[k]=(sizes[k]||0)+(end-pts[i][0]);}});
const agg={};for(const [k,v] of Object.entries(sizes)){const d=k.replace(/^(\.\.\/)+/,'').split('/').slice(0,process.argv[4]?+process.argv[4]:99).join('/');agg[d]=(agg[d]||0)+v}
Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,+process.argv[5]||40).forEach(([k,v])=>console.log((v/1024).toFixed(0).padStart(6),'KB',k));
