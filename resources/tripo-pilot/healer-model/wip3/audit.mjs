// Smoothness audit of a rigged GLB: reads every clip's joint rotations and reports jerks, stop-and-go, seams and rest mismatch.
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import * as THREE from 'three'; import fs from 'fs';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc=await io.read(process.argv[2]);
const SEC=/^(ear|tail|fingers)/, LOOPS=new Set((process.argv[4]||'idle,walk,walkBack,walkLeft,walkRight,run,runBack,runLeft,runRight,downLie,downCrawl').split(','));
const STARTS_PRONE=new Set(['revive','downLie','downCrawl']), ENDS_PRONE=new Set(['downFall','downLie','downCrawl']);
const R2D=180/Math.PI, out={};
for(const an of doc.getRoot().listAnimations()){
  const ch={}; let times=null;
  for(const c of an.listChannels()){ if(c.getTargetPath()!=='rotation')continue; const n=c.getTargetNode().getName(); if(n==='staff'||n==='weapon')continue;
    const s=c.getSampler(); times=s.getInput().getArray(); ch[n]={q:s.getOutput().getArray(),rest:c.getTargetNode().getRotation()}; }
  const n=times.length, dt0=times[1]-times[0], step=Math.max(1,Math.round((1/30)/dt0)), dt=dt0*step; const idx=[]; for(let i=0;i<n;i+=step)idx.push(i); const m=idx.length;
  const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(); const W={}; // angular velocity vectors deg/s
  let speed=new Float64Array(m-1), maxAcc=0, accJoint='', restStart=0, restEnd=0, seam=0, pop=0;
  for(const [name,c] of Object.entries(ch)){ const w=[];
    for(let k=0;k<m-1;k++){qa.fromArray(c.q,idx[k]*4);qb.fromArray(c.q,idx[k+1]*4); const d=qa.clone().invert().multiply(qb); if(d.w<0)d.set(-d.x,-d.y,-d.z,-d.w);
      const ang=2*Math.acos(Math.min(1,d.w)), s=Math.sin(ang/2)||1; w.push(new THREE.Vector3(d.x/s,d.y/s,d.z/s).multiplyScalar(ang*R2D/dt));}
    W[name]=w; if(SEC.test(name))continue;
    for(let k=0;k<m-1;k++)speed[k]+=w[k].length();
    for(let k=0;k<m-2;k++){const a=w[k+1].clone().sub(w[k]).length()/dt; if(a>maxAcc){maxAcc=a;accJoint=name+'@'+(times[idx[k+1]]).toFixed(2);}}
    if(LOOPS.has(an.getName())){const a=w[0].clone().sub(w[m-2]).length(); let mx=1; for(let k=0;k<m-2;k++)mx=Math.max(mx,w[k+1].clone().sub(w[k]).length()); if(a/mx>seam)seam=a/mx; qa.fromArray(c.q,0);qb.fromArray(c.q,(n-1)*4); pop=Math.max(pop,2*Math.acos(Math.min(1,Math.abs(qa.dot(qb))))*R2D);}
    const ang=(i)=>{qa.fromArray(c.q,i*4);qb.fromArray(c.rest); return 2*Math.acos(Math.min(1,Math.abs(qa.dot(qb))))*R2D;};
    restStart=Math.max(restStart,ang(0)); restEnd=Math.max(restEnd,ang(n-1));
  }
  // stop-and-go: interior dips of whole-body speed below 12% of the clip's peak, between two bursts of at least 35%
  const peak=Math.max(...speed); let stops=0, hi=false, low=false;
  for(let k=0;k<m-1;k++){const r=speed[k]/peak; if(r>0.35){if(hi&&low)stops++; hi=true; low=false;} else if(r<0.12&&hi)low=true;}
  // jerk count: frames where the summed velocity change of the main joints exceeds 900 deg/s in one thirtieth
  let jerks=0; for(let k=0;k<m-2;k++){let s=0; for(const [name,w] of Object.entries(W)){if(SEC.test(name))continue; s+=w[k+1].clone().sub(w[k]).length();} if(s>900)jerks++;}
  const nm=an.getName(); out[nm]={fps:Math.round(1/dt0),dur:+times[n-1].toFixed(2),peakAccel:Math.round(maxAcc),at:accJoint,jerkFrames:jerks,stops,loopSeam:LOOPS.has(nm)?+seam.toFixed(2):null,loopPop:LOOPS.has(nm)?+pop.toFixed(1):null,
    startOff:STARTS_PRONE.has(nm)||LOOPS.has(nm)?null:+restStart.toFixed(1), endOff:ENDS_PRONE.has(nm)||LOOPS.has(nm)?null:+restEnd.toFixed(1)};
}
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(out,null,1));
const rows=Object.entries(out); console.log('clip            fps dur  peakAcc  jerkFr stops seam  pop   startOff endOff');
for(const [k,v] of rows)console.log(k.padEnd(15),String(v.fps).padEnd(3),String(v.dur).padEnd(5),String(v.peakAccel).padEnd(8),String(v.jerkFrames).padEnd(6),String(v.stops).padEnd(5),String(v.loopSeam??'-').padEnd(5),String(v.loopPop??'-').padEnd(5),String(v.startOff??'-').padEnd(8),v.endOff??'-',' ',v.at);
const tot=(f)=>rows.reduce((a,[,v])=>a+(v[f]||0),0); console.log('TOTAL jerkFrames',tot('jerkFrames'),'stops',tot('stops'),'pop sum',tot('loopPop').toFixed(1));
