const { chromium } = require('playwright');
const fs=require('fs');
(async () => {
const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:640,height:400}});
await p.goto('http://127.0.0.1:5199/?scene=arena&fresh=1&menu=0&tripo=1&flat=1',{waitUntil:'domcontentloaded'});
for(let i=0;i<90;i++){ const ok=await p.evaluate(()=>!!(window.__tripoFox&&window.__tripoFox.sweeps&&window.__tripoFox.sweeps.rift20)); if(ok)break; await new Promise(r=>setTimeout(r,1000)); }
const r=await p.evaluate(async()=>{
  const m=await import('/src/render/critters/tripoFoxSkills.js');
  const defs=m.SKILL20_DEFS; const st=window.__tripoFox; const out={};
  for (const name in st.sweeps){ const sw=st.sweeps[name]; const pts=sw.pts; const sp=[];
    for(let k=1;k<pts.length;k++){const a=pts[k-1],c=pts[k]; sp.push(Math.hypot(c[3]-a[3],c[4]-a[4],c[5]-a[5])/sw.dt);}
    // smooth
    const sm=sp.map((v,i)=>{let s=0,n=0;for(let j=i-2;j<=i+2;j++)if(j>=0&&j<sp.length){s+=sp[j];n++;}return s/n;});
    const segs=[]; let s0=-1;
    for(let i=0;i<sm.length;i++){ if(sm[i]>4&&s0<0)s0=i; if((sm[i]<=4||i===sm.length-1)&&s0>=0){ if(i-s0>=3) { let pk=0; for(let j=s0;j<i;j++)pk=Math.max(pk,sm[j]); segs.push([+(s0*sw.dt).toFixed(3),+(i*sw.dt).toFixed(3),+pk.toFixed(1)]);} s0=-1;} }
    const d=defs[name]; const hits=d? d.keys.filter(k=>k.hit).map(k=>+k.t.toFixed(3)):null;
    out[name]={T:+(pts.length*sw.dt).toFixed(2),hits,segs};
  }
  return out;});
fs.writeFileSync('/tmp/claude-0/af/trsegs.json',JSON.stringify(r,null,0));
for(const k in r) console.log(k, 'T',r[k].T,'hits',JSON.stringify(r[k].hits),'segs',JSON.stringify(r[k].segs));
await b.close();})();
