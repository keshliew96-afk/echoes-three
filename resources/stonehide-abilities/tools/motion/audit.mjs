// audit.mjs <glb> [clip,clip]: per clip, measured on the baked 60 fps frames:
// slide = how far a foot travels along the floor while its sole is on it (u), and its top speed there (u/s);
// pop0/pop1 = largest joint angle between the clip's first/last frame and the rest pose (deg);
// jerk = largest change of a joint's turn speed between two frames (deg/s per frame) and where;
// ears/tail = how far they swing (deg). under = lowest point of a sole (u).
import { NodeIO } from '@gltf-transform/core'; import * as THREE from 'three'; import fs from 'fs';
const skel=JSON.parse(fs.readFileSync(new URL('./skel.json',import.meta.url))); const names=skel.names;
const doc=await new NodeIO().read(process.argv[2]); const only=process.argv[3]?process.argv[3].split(','):null;
const nodes=Object.fromEntries(doc.getRoot().listNodes().map(n=>[n.getName(),n]));
const B=names.map(n=>new THREE.Object3D()); names.forEach((n,i)=>{const pi=names.indexOf(skel.parents[i]); if(pi>=0)B[pi].add(B[i]);});
const rest=names.map(n=>({p:nodes[n].getTranslation(),q:nodes[n].getRotation()}));
const SOLE=[[0,-0.06,-0.04],[0,-0.06,0.1]], v=new THREE.Vector3(); const out={};
for(const a of doc.getRoot().listAnimations()){ const nm=a.getName(); if(only&&!only.includes(nm))continue;
  const ch=a.listChannels().map(c=>({i:names.indexOf(c.getTargetNode().getName()),path:c.getTargetPath(),t:c.getSampler().getInput().getArray(),v:c.getSampler().getOutput().getArray()})).filter(c=>c.i>=0);
  const n=ch[0].t.length, T=ch[0].t[n-1], dt=T/(n-1); const foot={L:[],R:[]}, low={L:[],R:[]}, Q=names.map(()=>[]);
  for(let f=0;f<n;f++){ names.forEach((_,i)=>{B[i].position.fromArray(rest[i].p);B[i].quaternion.fromArray(rest[i].q);});
    for(const c of ch){ if(c.path==='rotation')B[c.i].quaternion.fromArray(c.v,f*4); else if(c.path==='translation')B[c.i].position.fromArray(c.v,f*3); }
    B[0].updateMatrixWorld(true); names.forEach((_,i)=>Q[i].push(B[i].quaternion.clone()));
    for(const s of ['L','R']){const ft=B[names.indexOf('foot'+s)]; foot[s].push(new THREE.Vector3().setFromMatrixPosition(ft.matrixWorld)); let lo=1; for(const p of SOLE){const y=v.set(...p).applyMatrix4(ft.matrixWorld).y; if(y<lo)lo=y;} low[s].push(lo);} }
  let slide=0,vmax=0,under=0; for(const s of ['L','R'])for(let f=1;f<n;f++){ under=Math.min(under,low[s][f]); if(low[s][f]<0.015&&low[s][f-1]<0.015){const d=Math.hypot(foot[s][f].x-foot[s][f-1].x,foot[s][f].z-foot[s][f-1].z); slide+=d; vmax=Math.max(vmax,d/dt);} }
  const rq=new THREE.Quaternion(); let pop0=0,pop1=0,jerk=0,jw='',pw='',p0w=''; const rng=(nmB)=>{const i=names.indexOf(nmB); let m=0; for(let f=0;f<n;f++)m=Math.max(m,Q[i][f].angleTo(rq.fromArray(rest[i].q))); return m*180/Math.PI;};
  names.forEach((nmB,i)=>{ if(!i)return; rq.fromArray(rest[i].q); {const a0=Q[i][0].angleTo(rq); if(a0>pop0){pop0=a0;p0w=nmB;}} {const a_=Q[i][n-1].angleTo(rq); if(a_>pop1){pop1=a_;pw=nmB;}}
    if(/^(ear|tail)/.test(nmB))return; for(let f=2;f<n;f++){const w1=Q[i][f].angleTo(Q[i][f-1])/dt,w0=Q[i][f-1].angleTo(Q[i][f-2])/dt,j=Math.abs(w1-w0)*180/Math.PI; if(j>jerk){jerk=j;jw=nmB+'@'+(f*dt).toFixed(2);} } });
  out[nm]={T:+T.toFixed(2),fps:Math.round((n-1)/T),slide:+slide.toFixed(3),slideSpeed:+vmax.toFixed(2),under:+under.toFixed(3),pop0:+(pop0*180/Math.PI).toFixed(1),pop1:+(pop1*180/Math.PI).toFixed(1),popAt:pw,pop0At:p0w,jerk:Math.round(jerk),at:jw,ears:+Math.max(rng('earL'),rng('earR')).toFixed(0),tail:+Math.max(rng('tail1'),rng('tail2'),rng('tail3')).toFixed(0)};
}
if(process.argv[4])fs.writeFileSync(process.argv[4],JSON.stringify(out,null,1));
console.table(out);
