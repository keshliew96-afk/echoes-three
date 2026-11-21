// audit.cjs <out.json>: measure every clip of the fox rig (review build): feet, hips, trunk, left paw, head, ears, tail, blade
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:480,height:300}});
p.on('pageerror',e=>console.log('err',e.message));
await p.goto('http://127.0.0.1:5199/?scene=arena&fresh=1&menu=0&tripo=1&flat=1',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.__echoes&&window.__echoes.tick>=30&&window.__tripoFox&&window.__tripoFox.model&&window.__tripoFox.clips&&window.__tripoFox.clips.flurry20,null,{timeout:300000});
const R=await p.evaluate(()=>{
  const st=window.__tripoFox, m=st.model, Mixer=st.mixer.constructor;
  const V=st.tipL.constructor;
  const B=(n)=>m.getObjectByName(n);
  const names=['hips','chest','head','earL','earR','handR','handL','footL','footR','tail1','tail5'];
  const bones=Object.fromEntries(names.map(n=>[n,B(n)]));
  const inv=()=>m.matrixWorld.clone().invert();
  const P=(o,I)=>new V().setFromMatrixPosition(o.matrixWorld).applyMatrix4(I);
  const fwd=(o,I,ax)=>{const e=o.matrixWorld.clone().premultiply(I).elements;const k=ax*4;return new V(e[k],e[k+1],e[k+2]).normalize();};
  const out={};
  const saved=[];m.traverse(o=>{if(o.isBone)saved.push([o,o.position.clone(),o.quaternion.clone()]);});
  for(const name of Object.keys(st.clips)){
    const clip=st.clips[name]; if(!clip||!clip.duration)continue;
    for(const [o,p0,q0] of saved){o.position.copy(p0);o.quaternion.copy(q0);}
    const mx=new Mixer(m); const a=mx.clipAction(clip); a.play();
    const T=clip.duration, N=Math.max(2,Math.round(T*60));
    const S=[];
    for(let i=0;i<=N;i++){
      mx.setTime(Math.min(T-1e-4,(i/N)*T)); m.updateMatrixWorld(true);
      const I=inv(); const r={};
      for(const n of names) r[n]=P(bones[n],I);
      r.hipF=fwd(bones.hips,I,2); r.chestF=fwd(bones.chest,I,2); r.headF=fwd(bones.head,I,2);
      r.earU=fwd(bones.earL,I,1); r.headU=fwd(bones.head,I,1);
      const WM=bones.handR.matrixWorld.clone().multiply(st.G);
      r.tip=st.tipL.clone().applyMatrix4(WM).applyMatrix4(I);
      r.grip=new V().setFromMatrixPosition(WM).applyMatrix4(I);
      S.push(r);
    }
    a.stop(); mx.uncacheRoot(m);
    const path=(f)=>{let s=0;for(let i=1;i<S.length;i++)s+=f(S[i]).distanceTo(f(S[i-1]));return s;};
    const yawOf=(v)=>Math.atan2(v.x,v.z)*180/Math.PI;
    const rng=(f)=>{let a=1e9,b=-1e9;for(const s of S){const v=f(s);a=Math.min(a,v);b=Math.max(b,v);}return b-a;};
    const unwrapRange=(f)=>{let prev=f(S[0]),acc=0,a=0,b=0;for(let i=1;i<S.length;i++){let v=f(S[i]),d=v-prev;while(d>180)d-=360;while(d<-180)d+=360;acc+=d;prev=v;a=Math.min(a,acc);b=Math.max(b,acc);}return b-a;};
    // frozen share: frames where feet, hips, left paw and tail all move under 0.6 mm a frame while the sword tip moves
    let frozen=0,moving=0,snap=0;
    for(let i=1;i<S.length;i++){
      const q=S[i],o=S[i-1];
      const body=Math.max(q.footL.distanceTo(o.footL),q.footR.distanceTo(o.footR),q.hips.distanceTo(o.hips));
      const tipv=q.tip.distanceTo(o.tip);
      if(tipv>0.004){moving++; if(body<0.0006)frozen++;}
      const d0=o.tip.clone().sub(o.grip).normalize(), d1=q.tip.clone().sub(q.grip).normalize();
      snap=Math.max(snap,Math.acos(Math.max(-1,Math.min(1,d0.dot(d1))))*180/Math.PI);
    }
    const body=st.body&&st.body[name];
    let lift=0,spin=0; if(body){for(const v of body.v){lift=Math.max(lift,v[0]);spin=Math.max(spin,Math.abs(v[1]),Math.abs(v[2]),Math.abs(v[3]));}}
    out[name]={dur:+T.toFixed(2), tracks:clip.tracks.length,
      footL:+path(s=>s.footL).toFixed(3), footR:+path(s=>s.footR).toFixed(3),
      hipsYaw:+unwrapRange(s=>yawOf(s.hipF)).toFixed(0), hipsDrop:+rng(s=>s.hips.y).toFixed(3), hipsSway:+Math.hypot(rng(s=>s.hips.x),rng(s=>s.hips.z)).toFixed(3),
      twist:+Math.max(...S.map(s=>{let d=yawOf(s.chestF)-yawOf(s.hipF);while(d>180)d-=360;while(d<-180)d+=360;return Math.abs(d);})).toFixed(0),
      pawL:+path(s=>s.handL.clone().sub(s.chest)).toFixed(3),
      headYaw:+unwrapRange(s=>yawOf(s.headF)-yawOf(s.chestF)).toFixed(0),
      ear:+rng(s=>Math.acos(Math.max(-1,Math.min(1,s.earU.dot(s.headU))))*180/Math.PI).toFixed(0),
      tail:+path(s=>s.tail5.clone().sub(s.hips)).toFixed(3),
      tipMinY:+Math.min(...S.map(s=>s.tip.y)).toFixed(3), tipPath:+path(s=>s.tip).toFixed(2),
      frozen:moving?+(frozen/moving).toFixed(2):0, snap:+snap.toFixed(0), lift:+lift.toFixed(2), spin:+spin.toFixed(0)};
  }
  for(const [o,p0,q0] of saved){o.position.copy(p0);o.quaternion.copy(q0);}
  return out;
});
fs.writeFileSync(process.argv[2],JSON.stringify(R,null,1));
console.log(Object.keys(R).length,'clips');
await b.close();
})();
