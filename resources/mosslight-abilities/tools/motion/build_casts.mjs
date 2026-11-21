// Clip-only builder: reads the passed GLB (skeleton, body mesh), runs the rig thread's own clip pipeline
// (build2.mjs, copied below unchanged) on NEW clips and writes them as JSON tracks for the review build.
import fs from 'fs';
import * as THREE from 'three';
import { BASE, CFG, CLIPS as OLD } from './base_clips.mjs';
const GLB=process.env.GLB||'/mnt/project-files/tripo-pilot/healer-model/healer-tripo-rigged.glb';
const SRC=process.env.CLIPS||'./casts.mjs';
const OUT=process.argv[2]||'casts.json';
const b=fs.readFileSync(GLB); const jl=b.readUInt32LE(12); const J=JSON.parse(b.slice(20,20+jl).toString()); const BIN=b.slice(20+jl+8);
const CT={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array}, NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function gacc(i){const a=J.accessors[i],v=J.bufferViews[a.bufferView],T=CT[a.componentType],nc=NC[a.type],off=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||T.BYTES_PER_ELEMENT*nc;
  const out=new T(a.count*nc); const dv=new DataView(BIN.buffer,BIN.byteOffset+off); const get={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'}[a.componentType];
  for(let k=0;k<a.count;k++)for(let c=0;c<nc;c++)out[k*nc+c]=dv[get](k*stride+c*T.BYTES_PER_ELEMENT,true); return out;}
const skinJ=J.skins[0], joints=skinJ.joints, names=joints.map(i=>J.nodes[i].name), N=names.length;
const parentOf={}; J.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parentOf[c]=i));
const skel={names,parents:joints.map(i=>parentOf[i]!==undefined&&joints.includes(parentOf[i])?J.nodes[parentOf[i]].name:null)};
const ibm=gacc(skinJ.inverseBindMatrices); const world=names.map((n,i)=>new THREE.Vector3(-ibm[i*16+12],-ibm[i*16+13],-ibm[i*16+14]));
const TR=joints.map(i=>J.nodes[i].translation||[0,0,0]);
const jn=names.map((n,i)=>({getTranslation:()=>TR[i],setRotation(){return this;}}));
const chain={setTranslation(){return this;},setRotation(){return this;},setScale(){return this;}}; const staffNode=chain;
const bodyNode=J.nodes.find(n=>n.skin!==undefined&&n.mesh!==undefined); const prim=J.meshes[bodyNode.mesh].primitives[0];
const ARR={'b_pos.bin':gacc(prim.attributes.POSITION),'b_ji.bin':Uint16Array.from(gacc(prim.attributes.JOINTS_0)),'b_jw.bin':(()=>{const w=gacc(prim.attributes.WEIGHTS_0);return w instanceof Float32Array?w:Float32Array.from(w,x=>x/(w instanceof Uint8Array?255:65535));})()};
const rd=(n)=>ARR[n];
const STAFF_SCALE=CFG.scale;
const MOD=await import(SRC); const CLIPS={}; const want=(process.env.ONLY||'').split(',').filter(Boolean);
const ALL={...(process.env.WITH_OLD?OLD:{}),...MOD.CLIPS};
for(const k of Object.keys(ALL)) if(!want.length||want.includes(k)) CLIPS[k]=ALL[k];
const RESULT={};
// ---- FK helper with three
const bones=names.map(n=>new THREE.Object3D()); names.forEach((n,i)=>{const pi=names.indexOf(skel.parents[i]); bones[i].position.fromArray(jn[i].getTranslation()); if(pi>=0)bones[pi].add(bones[i]);});
const D=Math.PI/180; const idx=n=>names.indexOf(n);
const E=new THREE.Euler(),qa=new THREE.Quaternion(),qb=new THREE.Quaternion();
function applyPose(pose){ // pose: {joint:[x,y,z] deg delta in the parent frame, applied after BASE; _hips:[x,y,z] offset}
  names.forEach((n,i)=>{const b=BASE[n]||[0,0,0], p=pose[n]||[0,0,0]; if(CFG.eulerAdd){bones[i].quaternion.setFromEuler(E.set((b[0]+p[0])*D,(b[1]+p[1])*D,(b[2]+p[2])*D,'XYZ'));}else{qb.setFromEuler(E.set(b[0]*D,b[1]*D,b[2]*D,'XYZ')); qa.setFromEuler(E.set(p[0]*D,p[1]*D,p[2]*D,'XYZ')); bones[i].quaternion.copy(qa).multiply(qb);} bones[i].position.fromArray(jn[i].getTranslation());});
  if(pose._hips){bones[idx('hips')].position.add(new THREE.Vector3(...pose._hips));}
  bones[0].updateMatrixWorld(true);
  // walk and run: no splayed feet. Each leg turns about its own length (hip to ankle) until the foot's heel-to-toe line points straight ahead
  if(pose._toes)for(const s of ['L','R']){const leg=bones[idx('leg'+s)],foot=bones[idx('foot'+s)],sg=s==='L'?1:-1;
    for(let it=0;it<5;it++){tv.copy(TOEQ[s]).applyQuaternion(foot.getWorldQuaternion(qa)); const err=Math.atan2(-tv.z,tv.x)-sg*TOE_KEEP*D; // read off the foot's side-to-side line, which stays level when the foot tips toe-down in a kick
      tv.setFromMatrixPosition(foot.matrixWorld).sub(tw.setFromMatrixPosition(leg.matrixWorld)).normalize(); leg.parent.getWorldQuaternion(qb);
      leg.quaternion.premultiply(qa.copy(qb).invert().multiply(qc.setFromAxisAngle(tv,err/Math.max(0.5,Math.abs(tv.y)))).multiply(qb)); leg.updateWorldMatrix(false,true);}}
  // keep the soles on the floor: a leg that would sink slides up into the tabard (a hidden knee bend)
  for(const s of ['L','R']){const leg=bones[idx('leg'+s)],foot=bones[idx('foot'+s)]; let lo=0;
    for(const pt of SOLE){const y=tv.set(...pt).applyMatrix4(foot.matrixWorld).y; if(y<lo)lo=y;}
    if(lo<0&&!pose._noground){tv.set(0,-lo,0).applyQuaternion(leg.parent.getWorldQuaternion(qa).invert()); leg.position.add(tv);}}
  bones[0].updateMatrixWorld(true);
}
const SOLE=CFG.sole||[[0,-0.06,-0.04],[0,-0.06,0.1]], tv=new THREE.Vector3();
// grip matrix from base pose: staff upright at the right palm
applyPose({});
// the side-to-side line of each foot as modelled (square to its heel-to-toe line; CFG.toe: degrees turned out, measured from the footprint), kept in the foot's own frame
const TOE_KEEP=2, tw=new THREE.Vector3(), qc=new THREE.Quaternion(), TOEQ={};
if(CFG.toe){for(const s of ['L','R']){const sg=s==='L'?1:-1,a=CFG.toe[s]*D; TOEQ[s]=new THREE.Vector3(Math.cos(a),0,-sg*Math.sin(a)).applyQuaternion(bones[idx('foot'+s)].getWorldQuaternion(new THREE.Quaternion()).invert());}
  for(const [name,c] of Object.entries(CLIPS))if(/^(walk|run)/.test(name))c.toes=true;}
const hand=bones[idx(CFG.hand)];
const palmW=new THREE.Vector3(...CFG.palm).applyMatrix4(hand.matrixWorld);
const tilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(CFG.tilt[0]*D,CFG.tilt[1]*D,CFG.tilt[2]*D,CFG.tiltOrder||'YXZ'));
const S0=new THREE.Matrix4().compose(palmW.clone().sub(new THREE.Vector3(...CFG.grip).multiplyScalar(STAFF_SCALE).applyQuaternion(tilt)),tilt,new THREE.Vector3(1,1,1).multiplyScalar(STAFF_SCALE));
console.log('palm',palmW.toArray().map(v=>+v.toFixed(3)));
const G=hand.matrixWorld.clone().invert().multiply(S0);
function staffAt(){return hand.matrixWorld.clone().multiply(G);}
{const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();S0.decompose(p,q,s);staffNode.setTranslation(p.toArray()).setRotation(q.toArray()).setScale(s.toArray());
 // bake base pose as the rest pose of the nodes
 names.forEach((n,i)=>jn[i].setRotation(bones[i].quaternion.toArray()));}
// ---- clipping check: body vertices inside the weapon's slab, weapon below the floor
const VP=rd('b_pos.bin',Float32Array), VJ=rd('b_ji.bin',Uint16Array), VW=rd('b_jw.bin',Float32Array), NV=VP.length/3;
const armSet=new Set(CFG.holdBones.map(idx)); const report=[];
const skipV=new Uint8Array(NV); for(let v=0;v<NV;v++){let w=0;for(let k=0;k<4;k++)if(armSet.has(VJ[v*4+k]))w+=VW[v*4+k]; if(w>0.3)skipV[v]=1;}
const skm=names.map(()=>new THREE.Matrix4()), inv=new THREE.Matrix4(), vv=new THREE.Vector3(), acc=new THREE.Vector3(), t3=new THREE.Vector3();
const HANDV=names.map(n=>/^(hand|fingers)/.test(n)?n.slice(-1):0); const TAILV=names.map(n=>/^tail/.test(n)); let TWO=false; const offSet=new Set(['upperarmL','forearmL','handL','fingersL','upperarmR','forearmR','handR','fingersR'].filter(n=>!CFG.holdBones.includes(n)).map(n=>names.indexOf(n))); const skipL=new Uint8Array(NV); for(let v=0;v<NV;v++){let w=0;for(let k=0;k<4;k++)if(offSet.has(VJ[v*4+k]))w+=VW[v*4+k]; if(w>0.3)skipL[v]=1;}
const DB={}, LIMB=names.map(n=>/^(upperarm|forearm|hand|fingers|tail)/.test(n));
function clipCheck(M){
  names.forEach((n,i)=>skm[i].copy(bones[i].matrixWorld).multiply(new THREE.Matrix4().makeTranslation(-world[i].x,-world[i].y,-world[i].z)));
  inv.copy(M).invert(); let n=0; const who={}; const B=CFG.box;
  let under=0, minY=1; const loH={L:1,R:1}; let loT=1; for(let v=0;v<NV;v++){ acc.set(0,0,0); let top=0,tw=0;
    for(let k=0;k<4;k++){const w=VW[v*4+k]; if(!w)continue; vv.set(VP[v*3],VP[v*3+1],VP[v*3+2]).applyMatrix4(skm[VJ[v*4+k]]); acc.addScaledVector(vv,w); if(w>tw){tw=w;top=VJ[v*4+k];}}
    if(acc.y<minY&&!LIMB[top])minY=acc.y; if(TAILV[top]&&acc.y<loT)loT=acc.y; if(HANDV[top]){const s=HANDV[top]; if(acc.y<loH[s])loH[s]=acc.y;} if(process.env.DBG&&acc.y<-0.035){DB[names[top]]=Math.min(DB[names[top]]||0,+acc.y.toFixed(3));} if(acc.y<-0.035)under++; if(skipV[v]||(TWO&&skipL[v]))continue;
    acc.applyMatrix4(inv); if(acc.x>B[0]&&acc.x<B[1]&&acc.y>B[2]&&acc.y<B[3]&&acc.z>B[4]&&acc.z<B[5]){n++;who[names[top]]=(who[names[top]]||0)+1;}}
  // weapon corners under the floor
  let lo=0; for(const x of [B[0],B[1]])for(const y of [B[2],B[3]])for(const z of [B[4],B[5]]){const yy=vv.set(x,y,z).applyMatrix4(M).y; if(yy<lo)lo=yy;}
  if(lo<-0.03)who['floor '+lo.toFixed(2)]=1;
  if(under>8){who['body under floor']=under;n+=under;}
  return {minY,loH,loT,body:n,lo,n:n+(lo<-0.03?1:0),who:Object.entries(who).map(e=>e.join(' ')).join(', ')};
}
// ---- keep the weapon out of the body: swing the holding arm so the weapon moves along its own face normal
const armB=bones[idx(CFG.holdBones[0])], ax=new THREE.Vector3(), nrm=new THREE.Vector3(), sh=new THREE.Vector3(), hd=new THREE.Vector3(), qd=new THREE.Quaternion(), qp=new THREE.Quaternion();
function pushOut(d,d2){ if(d2){hand.parent.getWorldQuaternion(qp); hand.position.add(nrm.set(0,0,d2).applyQuaternion(qp.invert())); bones[0].updateMatrixWorld(true);} if(!d)return;
  const M=staffAt(); if(CFG.pushMode==='away'){const B=CFG.box; nrm.set((B[0]+B[1])/2,(B[2]+B[3])/2,(B[4]+B[5])/2).applyMatrix4(M).sub(sh.setFromMatrixPosition(bones[idx('chest')].matrixWorld)); nrm.y=0; nrm.normalize();} else nrm.set(0,0,1).transformDirection(M); hand.parent.getWorldQuaternion(qp);
  hand.position.add(nrm.multiplyScalar(d).applyQuaternion(qp.invert())); bones[0].updateMatrixWorld(true);
}
function liftUp(h){ if(!h)return; hand.parent.getWorldQuaternion(qp); hand.position.add(nrm.set(0,h,0).applyQuaternion(qp.invert())); bones[0].updateMatrixWorld(true); }
function needPush(set){ let a=0; for(let k=0;k<30;k++){set(); pushOut(a); if(clipCheck(staffAt()).body<=0)break; a+=0.01;} return a; }
// ---- clips
const FPS=CFG.fps||60;
// Keys are joined by a monotone cubic through every key (no stop at each key, no overshoot, holds stay held).
// A segment marked 'in' arrives at full speed (a blow landing), 'out' leaves at full speed, 'lin' is straight.
function tangents(K){
  const joints=new Set(); K.forEach(k=>Object.keys(k.p).forEach(j=>joints.add(j)));
  const val=(i,j,c)=>(K[i].p[j]||[0,0,0])[c]; const M=K.map(()=>({}));
  for(const j of joints){ for(let i=0;i<K.length;i++)M[i][j]=[0,0,0];
    for(let c=0;c<3;c++){ const d=[]; for(let i=0;i<K.length-1;i++)d.push((val(i+1,j,c)-val(i,j,c))/(K[i+1].t-K[i].t));
      for(let i=1;i<K.length-1;i++){ if(d[i-1]*d[i]<=0)continue; const h0=K[i].t-K[i-1].t,h1=K[i+1].t-K[i].t,w1=2*h1+h0,w2=h1+2*h0; M[i][j][c]=(w1+w2)/(w1/d[i-1]+w2/d[i]); } } }
  return {M,joints};
}
const LAG=CFG.lag||{}, CARRY=CFG.carry||0;
function evalClip(c,t,sub){
  const pose={};
  if(c.keys){const K=c.keys; if(!c._tan)c._tan=tangents(K); const {M,joints}=c._tan; let i=K.length-2; for(let k=0;k<K.length-1;k++){if(t>=K[k].t&&t<=K[k+1].t){i=k;break;}}
    const a=K[i],b=K[i+1],h=b.t-a.t,u=h>0?Math.min(1,Math.max(0,(t-a.t)/h)):0,e=CFG.smoothKeys===false?'old':(b.ease||'s');
    const u2=u*u,u3=u2*u,h00=2*u3-3*u2+1,h10=u3-2*u2+u,h01=-2*u3+3*u2,h11=u3-u2;
    for(const j of joints){ if(LAG[j]&&!sub&&!c.nolag){continue;}
      const A=a.p[j]||[0,0,0],B=b.p[j]||[0,0,0],o=[0,0,0];
      for(let x=0;x<3;x++){const sec=h>0?(B[x]-A[x])/h:0; let m0=M[i][j][x],m1=M[i+1][j][x];
        if(e==='in')m1=2*sec; else if(e==='out')m0=2*sec; else if(e==='lin'){m0=sec;m1=sec;}
        o[x]=h00*A[x]+h10*h*m0+h01*B[x]+h11*h*m1;
        if(a.ease==='in'&&i>0&&CARRY){const P=K[i-1].p[j]||[0,0,0],v=2*(A[x]-P[x])/(a.t-K[i-1].t),tau=t-a.t,lim=j==='_hips'?0.015:10; o[x]+=Math.max(-lim,Math.min(lim,CARRY*v*0.035*Math.E))*(tau/0.035)*Math.exp(-tau/0.035)/Math.E*Math.E;}}
      pose[j]=o;}
    if(!sub&&!c.nolag)for(const j of joints){ if(!LAG[j])continue; const w=Math.min(1,Math.min(t,c.T-t)/0.12), ws=w*w*(3-2*w); pose[j]=evalClip(c,Math.max(0,t-LAG[j]*ws),true)[j]; }
    if(sub)return pose;}
  if(c.mech&&!sub){ // the hips drive the blow: they turn a beat before the chest, the legs stay planted under them, the weight drops and the tail counters
    const e=evalClip(c,Math.min(c.T,t+0.03),true), g=(j,x)=>((e[j]||[0,0,0])[x]), yaw=g('chest',1)+g('spine',1), pit=g('chest',0)+g('spine',0);
    const addp=(j,v)=>{const A=pose[j]||[0,0,0]; pose[j]=[A[0]+v[0],A[1]+v[1],A[2]+v[2]];};
    addp('hips',[0,0.3*yaw,0]); addp('legL',[-0.14*yaw,-0.3*yaw,0]); addp('legR',[0.14*yaw,-0.3*yaw,0]); addp('head',[0,-0.12*yaw,0]);
    addp('_hips',[0.0005*yaw,-0.0004*Math.abs(yaw)-0.0005*Math.max(0,pit),0.0006*pit]); }
  if(c.fn){const extra=c.fn(t,c.T); for(const k in extra){const A=pose[k]||[0,0,0],B=extra[k]; pose[k]=[A[0]+B[0],A[1]+B[1],A[2]+B[2]];}}
  if(c.toes)pose._toes=1;
  return pose;
}
// ---- follow-through: ears and tail are springs that trail the body and settle after it stops
const SPR=(CFG.springs||[]).map(s=>{const i=idx(s.bone); const kid=names.findIndex((n,k)=>skel.parents[k]===s.bone); const tip=s.tip?new THREE.Vector3(...s.tip):world[kid].clone().sub(world[i]);
  return {i,k:s.k,c:2*s.z*Math.sqrt(s.k),max:(s.max||30)*D,tip,p:new THREE.Vector3(),v:new THREE.Vector3(),on:false};});
const sA=new THREE.Vector3(),sB=new THREE.Vector3(),sO=new THREE.Vector3(),sQ=new THREE.Quaternion(),sW=new THREE.Quaternion(),sP=new THREE.Quaternion(),sFix=new THREE.Quaternion();
function springs(dt,settle){ // settle 0..1 fades the trail out at the end of a one-shot clip
  for(const s of SPR){const b=bones[s.i]; b.updateWorldMatrix(true,false); b.getWorldQuaternion(sW); sO.setFromMatrixPosition(b.matrixWorld);
    const len=s.tip.length(); sA.copy(s.tip).applyQuaternion(sW).add(sO); // where the tip is authored to be
    if(!s.on){s.p.copy(sA);s.v.set(0,0,0);s.on=true;}
    const n=4,h=dt/n; for(let k=0;k<n;k++){sB.copy(sA).sub(s.p).multiplyScalar(s.k).addScaledVector(s.v,-s.c); s.v.addScaledVector(sB,h); s.p.addScaledVector(s.v,h);}
    sB.copy(s.p).sub(sO).normalize(); sA.sub(sO).normalize(); // sB: sprung direction, sA: authored direction
    let ang=sA.angleTo(sB); if(ang<1e-5)continue; const lim=s.max*(1-settle); sFix.setFromUnitVectors(sA,sB);
    if(ang>lim){sFix.slerp(sQ.identity(),1-lim/ang); sB.copy(sA).applyQuaternion(sFix); s.p.copy(sB).multiplyScalar(len).add(sO); s.v.multiplyScalar(0.6);}
    else if(settle>0){sFix.slerp(sQ.identity(),settle);}
    b.parent.getWorldQuaternion(sP); b.quaternion.copy(sP.invert()).multiply(sFix).multiply(sW); b.updateWorldMatrix(false,true);}
}
for(const [name,c] of Object.entries(CLIPS)){
  const n=Math.round(c.T*FPS)+1, dt=c.T/(n-1), tf=f=>Math.min(c.T,f*dt); const times=new Float32Array(n); const rot=names.map(()=>new Float32Array(n*4)); const hp=new Float32Array(n*3), lp={L:new Float32Array(n*3),R:new Float32Array(n*3)}, hdp=new Float32Array(n*3), odp=new Float32Array(n*3); const sp=new Float32Array(n*3), sq=new Float32Array(n*4);
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(); let prevQ=null; let worst={n:0};
  const wrap=(f,o)=>c.loop?(f+o+2*(n-1))%(n-1):Math.min(n-1,Math.max(0,f+o)), R=[-4,-3,-2,-1,0,1,2,3,4];
  const smooth=(arr)=>{const d=arr.map((v,f)=>Math.max(...R.map(o=>arr[wrap(f,o)])));return d.map((v,f)=>R.reduce((a,o)=>a+d[wrap(f,o)],0)/R.length);};
  for(const k in DB)delete DB[k]; const FL=c.flight||(c.staff?[-1,1e9]:null), noP=(f)=>!!FL&&tf(f)>FL[0]-0.02&&tf(f)<FL[1]+0.02, hipI=idx('hips'), other=bones[idx(CFG.hand==='handR'?'handL':'handR')], oS=CFG.hand==='handR'?'L':'R', wS=CFG.hand==='handR'?'R':'L';
  const set=(f)=>applyPose(evalClip(c,tf(f)));
  // the body is kept on the floor first (a prone pose must lie on it, not in it)
  const body0=new Float32Array(n); for(let f=0;f<n;f++){set(f); body0[f]=Math.max(0,-0.012-clipCheck(staffAt()).minY);} const bodyUp=smooth(body0);
  const push0=new Float32Array(n), fwd0=new Float32Array(n), lift0=new Float32Array(n), oth0=new Float32Array(n), tl0=new Float32Array(n); let sm2=push0, fwd=fwd0, lift=lift0, oth=oth0, tl=tl0; const t1=bones[idx('tail1')];
  const full=(f)=>{set(f); if(bodyUp[f]){bones[hipI].position.y+=bodyUp[f]; bones[0].updateMatrixWorld(true);} if(tl[f]){t1.parent.getWorldQuaternion(qp); t1.quaternion.premultiply(qa.copy(qp).invert().multiply(qb.setFromAxisAngle(nrm.set(1,0,0),tl[f])).multiply(qp)); bones[0].updateMatrixWorld(true);} staffIK(f); pushOut(sm2[f],fwd[f]); liftUp(lift[f]); grip2(f); if(oth[f]){other.parent.getWorldQuaternion(qp); other.position.add(nrm.set(0,oth[f],0).applyQuaternion(qp.invert())); bones[0].updateMatrixWorld(true);}};
  TWO=!!c.twoHand; let gripMiss=0; const oSide=CFG.hand==='handR'?'L':'R', uaO=bones[idx('upperarm'+oSide)], faO=bones[idx('forearm'+oSide)];
  const grip2=(f)=>{ if(!c.twoHand)return; const t=tf(f), g=c.twoHand, a=Math.min(1,Math.max(0,(t-g.from)/g.fade)), z=Math.min(1,Math.max(0,(g.to-t)/g.fade)), w0=Math.min(a,z), w=w0*w0*(3-2*w0); if(w<=0)return;
    const q0=uaO.quaternion.clone(), q1=faO.quaternion.clone(), T=new THREE.Vector3(g.x||0,g.y,g.z||0).applyMatrix4(staffAt()), W=new THREE.Vector3(), B=new THREE.Vector3();
    for(let it=0;it<16;it++)for(const bn of [faO,uaO]){ bones[0].updateMatrixWorld(true); W.setFromMatrixPosition(other.matrixWorld); B.setFromMatrixPosition(bn.matrixWorld);
      qb.setFromUnitVectors(W.clone().sub(B).normalize(),T.clone().sub(B).normalize()); bn.parent.getWorldQuaternion(qp); bn.quaternion.premultiply(qa.copy(qp).invert().multiply(qb).multiply(qp)); }
    bones[0].updateMatrixWorld(true); gripMiss=Math.max(gripMiss,w>=1?W.setFromMatrixPosition(other.matrixWorld).distanceTo(T):0); if(process.env.GRIP&&f%6===0){const R=new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld),Sh=new THREE.Vector3().setFromMatrixPosition(uaO.matrixWorld);console.log('grip t',t.toFixed(2),'miss',W.distanceTo(T).toFixed(3),'Rhand',R.toArray().map(v=>v.toFixed(2)).join(','),'Lsh',Sh.toArray().map(v=>v.toFixed(2)).join(','),'T',T.toArray().map(v=>v.toFixed(2)).join(','));}
    const res=T.clone().sub(W.setFromMatrixPosition(other.matrixWorld)); if(res.length()>0.09)res.setLength(0.09); other.parent.getWorldQuaternion(qp); other.position.add(res.multiplyScalar(w).applyQuaternion(qp.invert()));
    uaO.quaternion.copy(q0.slerp(uaO.quaternion,w)); faO.quaternion.copy(q1.slerp(faO.quaternion,w)); bones[0].updateMatrixWorld(true); };
  // staff-led arms: the weapon hand is solved to a grip point and turned so the staff points the wanted way
  const uaW=bones[idx('upperarm'+wS)], faW=bones[idx('forearm'+wS)];
  const staffIK=(f)=>{ const g=c.staffPose; if(!g)return; const t=tf(f), a=Math.min(1,Math.max(0,(t-g.from)/g.fade)), z=Math.min(1,Math.max(0,(g.to-t)/g.fade)), w0=Math.min(a,z), w=w0*w0*(3-2*w0); if(w<=0)return;
    const K=g.keys; let i=K.length-2; for(let k=0;k<K.length-1;k++)if(t>=K[k].t&&t<=K[k+1].t){i=k;break;} let u=(t-K[i].t)/(K[i+1].t-K[i].t); u=Math.min(1,Math.max(0,u)); u=K[i+1].ease==='in'?u*u*u:u*u*(3-2*u);
    const P=new THREE.Vector3(...K[i].p).lerp(new THREE.Vector3(...K[i+1].p),u), Dr=new THREE.Vector3(...K[i].d).lerp(new THREE.Vector3(...K[i+1].d),u).normalize();
    const q0=uaW.quaternion.clone(), q1=faW.quaternion.clone(), q2=hand.quaternion.clone(), W=new THREE.Vector3(), B=new THREE.Vector3(), gl=new THREE.Vector3(...CFG.grip);
    for(let pass=0;pass<4;pass++){ // bring the grip point to P, then aim the staff; repeat because each moves the other a little
      for(let it=0;it<12;it++)for(const bn of [faW,uaW]){ bones[0].updateMatrixWorld(true); W.copy(gl).applyMatrix4(staffAt()); B.setFromMatrixPosition(bn.matrixWorld);
        qb.setFromUnitVectors(W.clone().sub(B).normalize(),P.clone().sub(B).normalize()); bn.parent.getWorldQuaternion(qp); bn.quaternion.premultiply(qa.copy(qp).invert().multiply(qb).multiply(qp)); }
      bones[0].updateMatrixWorld(true); W.set(0,1,0).transformDirection(staffAt()); qb.setFromUnitVectors(W,Dr); hand.parent.getWorldQuaternion(qp); hand.quaternion.premultiply(qa.copy(qp).invert().multiply(qb).multiply(qp)); }
    bones[0].updateMatrixWorld(true); if(process.env.GRIP&&f%6===0)console.log('staffIK t',t.toFixed(2),'grip miss',W.copy(gl).applyMatrix4(staffAt()).distanceTo(P).toFixed(3),'dir',W.set(0,1,0).transformDirection(staffAt()).toArray().map(v=>v.toFixed(2)).join(','),'want',Dr.toArray().map(v=>v.toFixed(2)).join(','),'w',w.toFixed(2));
    uaW.quaternion.copy(q0.slerp(uaW.quaternion,w)); faW.quaternion.copy(q1.slerp(faW.quaternion,w)); hand.quaternion.copy(q2.slerp(hand.quaternion,w)); bones[0].updateMatrixWorld(true); };
  // then, until every frame is clear: the weapon hand moves away from the body, the weapon and both hands stay above the floor
  for(let it=0;it<26;it++){ let bad=0; for(let f=0;f<n;f++){ full(f); const cc=clipCheck(staffAt());
      if(!noP(f)&&cc.body>0){bad++; if(push0[f]<0.1)push0[f]+=0.02; else if(fwd0[f]<0.24)fwd0[f]+=0.03; else push0[f]=Math.min(0.45,push0[f]+0.03);}
      if(!noP(f)&&cc.lo<-0.004){bad++; lift0[f]+=-cc.lo*1.1;} if(cc.loH[wS]<-0.006){bad++; lift0[f]+=-cc.loH[wS];} if(cc.loH[oS]<-0.006){bad++; oth0[f]+=-cc.loH[oS];} if(cc.loT<-0.02&&tl0[f]<1){bad++; tl0[f]+=Math.min(0.15,-cc.loT/0.3);} }
    if(!bad)break; sm2=smooth(push0); fwd=smooth(fwd0); lift=smooth(lift0); oth=smooth(oth0); tl=smooth(tl0); }
  const pmax=Math.max(...sm2,...fwd);
  SPR.forEach(s=>s.on=false);
  const frame=(f,rec)=>{const t=tf(f); full(f);
    springs(dt,c.loop?0:Math.min(1,Math.max(0,(t-(c.T-0.18))/0.18))); if(!rec)return; times[f]=f*dt;
    names.forEach((nm,i)=>bones[i].quaternion.toArray(rot[i],f*4)); bones[idx('hips')].position.toArray(hp,f*3); hand.position.toArray(hdp,f*3); other.position.toArray(odp,f*3); bones[idx('legL')].position.toArray(lp.L,f*3); bones[idx('legR')].position.toArray(lp.R,f*3);
    let M=staffAt(); if(c.staff) M=c.staff(t,c.T,M,THREE,{hand,STAFF_SCALE});
    if(f%3===0){const cc=clipCheck(M); if(cc.n>worst.n)worst={n:cc.n,t:+t.toFixed(2),who:cc.who};}
    M.decompose(p,q,s); if(prevQ&&prevQ.dot(q)<0){q.set(-q.x,-q.y,-q.z,-q.w);} prevQ=q.clone(); p.toArray(sp,f*3); q.toArray(sq,f*4);};
  if(c.loop){ // run the cycle until the springs repeat, record the last pass, and close the seam exactly
    for(let pass=0;pass<3;pass++)for(let f=0;f<n-1;f++)frame(f,pass===2);
    times[n-1]=c.T; const cp=(arr,w)=>{for(let k=0;k<w;k++)arr[(n-1)*w+k]=arr[k];}; rot.forEach(r=>cp(r,4)); cp(hp,3); cp(hdp,3); cp(odp,3); cp(lp.L,3); cp(lp.R,3); cp(sp,3); cp(sq,4);
  } else for(let f=0;f<n;f++)frame(f,true);
  if(process.env.DBG===name)console.log(name,JSON.stringify(DB));
  report.push(name+(c.twoHand?' [off hand misses the staff by '+gripMiss.toFixed(3)+']':'')+' [lift '+Math.max(...bodyUp).toFixed(3)+' push '+pmax.toFixed(2)+' at '+(sm2.indexOf(pmax)*dt).toFixed(2)+'s]: '+(worst.n?worst.n+' verts at '+worst.t+'s ('+worst.who+')':'clear'));
  const tr=(a,k)=>Array.from(a,v=>+v.toFixed(k));
  RESULT[name]={T:c.T,loop:!!c.loop,ct:c.ct??null,times:tr(times,4),rot:Object.fromEntries(names.map((nm,i)=>[nm,tr(rot[i],5)]).filter((e,i)=>i>0)),
    pos:{hips:tr(hp,5),[CFG.hand]:tr(hdp,5),[CFG.hand==='handR'?'handL':'handR']:tr(odp,5),legL:tr(lp.L,5),legR:tr(lp.R,5)},twirl:c.twirl||null,note:c.note||null};
}
fs.writeFileSync(OUT,JSON.stringify(RESULT));
console.log('CLIPPING\n'+report.join('\n'));
console.log('written',OUT,Object.keys(RESULT).join(','),fs.statSync(OUT).size);
