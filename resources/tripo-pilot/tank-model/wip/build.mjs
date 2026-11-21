import fs from 'fs';
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { BASE, CLIPS, CFG } from './clips.mjs';
const skel=JSON.parse(fs.readFileSync('skel.json'));
const f32=n=>new Float32Array(fs.readFileSync(n).buffer.slice(0)); 
const rd=(n,T)=>{const b=fs.readFileSync(n);return new T(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=new Document(); const buf=doc.createBuffer();
const scene=doc.createScene(CFG.name);
// ---- skeleton
const names=skel.names, N=names.length;
const jn=names.map((n,i)=>doc.createNode(n));
const world=skel.pos.map(p=>new THREE.Vector3(...p));
names.forEach((n,i)=>{const pi=names.indexOf(skel.parents[i]); const loc=pi<0?world[i].clone():world[i].clone().sub(world[pi]); jn[i].setTranslation(loc.toArray()); if(pi>=0) jn[pi].addChild(jn[i]);});
const rootNode=doc.createNode(CFG.name+'_root'); scene.addChild(rootNode); rootNode.addChild(jn[0]);
const ibm=new Float32Array(16*N); names.forEach((n,i)=>{const m=new THREE.Matrix4().makeTranslation(-world[i].x,-world[i].y,-world[i].z); m.toArray(ibm,i*16);});
const skin=doc.createSkin('skin').setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf)).setSkeleton(jn[0]);
jn.forEach(j=>skin.addJoint(j));
// ---- body mesh
const tex=doc.createTexture(CFG.name+'_body').setImage(fs.readFileSync('body_tex.jpg')).setMimeType('image/jpeg');
const mat=doc.createMaterial(CFG.name+'_body').setBaseColorTexture(tex).setRoughnessFactor(0.9).setMetallicFactor(0);
const prim=doc.createPrimitive().setMaterial(mat)
 .setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(rd('b_pos.bin',Float32Array)).setBuffer(buf))
 .setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(rd('b_nrm.bin',Float32Array)).setBuffer(buf))
 .setAttribute('TEXCOORD_0',doc.createAccessor().setType('VEC2').setArray((()=>{const u=rd('b_uv.bin',Float32Array);for(let i=1;i<u.length;i+=2)u[i]=1-u[i];return u;})()).setBuffer(buf))
 .setAttribute('JOINTS_0',doc.createAccessor().setType('VEC4').setArray(rd('b_ji.bin',Uint16Array)).setBuffer(buf))
 .setAttribute('WEIGHTS_0',doc.createAccessor().setType('VEC4').setArray(rd('b_jw.bin',Float32Array)).setBuffer(buf))
 .setIndices(doc.createAccessor().setType('SCALAR').setArray(rd('b_idx.bin',Uint32Array)).setBuffer(buf));
const bodyNode=doc.createNode(CFG.name+'_body').setMesh(doc.createMesh(CFG.name+'_body').addPrimitive(prim)).setSkin(skin); rootNode.addChild(bodyNode);
// ---- staff (rigid, driven in root space)
const sdoc=await io.read(CFG.weaponFile); const sm=sdoc.getRoot().listMeshes()[0].listPrimitives()[0];
const stex=doc.createTexture(CFG.name+'_weapon').setImage(sdoc.getRoot().listTextures()[0].getImage()).setMimeType('image/jpeg');
const smat=doc.createMaterial(CFG.name+'_weapon').setBaseColorTexture(stex).setRoughnessFactor(0.9).setMetallicFactor(0);
const sprim=doc.createPrimitive().setMaterial(smat).setIndices(doc.createAccessor().setType('SCALAR').setArray(sm.getIndices().getArray().slice()).setBuffer(buf));
for(const s of ['POSITION','NORMAL','TEXCOORD_0']){const a=sm.getAttribute(s);sprim.setAttribute(s,doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setBuffer(buf));}
const staffNode=doc.createNode('weapon').setMesh(doc.createMesh(CFG.name+'_weapon').addPrimitive(sprim)); rootNode.addChild(staffNode);
const STAFF_SCALE=CFG.scale;
// ---- FK helper with three
const bones=names.map(n=>new THREE.Object3D()); names.forEach((n,i)=>{const pi=names.indexOf(skel.parents[i]); bones[i].position.fromArray(jn[i].getTranslation()); if(pi>=0)bones[pi].add(bones[i]);});
const D=Math.PI/180; const idx=n=>names.indexOf(n);
const E=new THREE.Euler(),qa=new THREE.Quaternion(),qb=new THREE.Quaternion();
function applyPose(pose){ // pose: {joint:[x,y,z] deg delta in the parent frame, applied after BASE; _hips:[x,y,z] offset}
  names.forEach((n,i)=>{const b=BASE[n]||[0,0,0], p=pose[n]||[0,0,0]; qb.setFromEuler(E.set(b[0]*D,b[1]*D,b[2]*D,'XYZ')); qa.setFromEuler(E.set(p[0]*D,p[1]*D,p[2]*D,'XYZ')); bones[i].quaternion.copy(qa).multiply(qb); bones[i].position.fromArray(jn[i].getTranslation());});
  if(pose._hips){bones[idx('hips')].position.add(new THREE.Vector3(...pose._hips));}
  bones[0].updateMatrixWorld(true);
  // keep the soles on the floor: a leg that would sink slides up into the tabard (a hidden knee bend)
  for(const s of ['L','R']){const leg=bones[idx('leg'+s)],foot=bones[idx('foot'+s)]; let lo=0;
    for(const pt of SOLE){const y=tv.set(...pt).applyMatrix4(foot.matrixWorld).y; if(y<lo)lo=y;}
    if(lo<0&&!pose._noground){tv.set(0,-lo,0).applyQuaternion(leg.parent.getWorldQuaternion(qa).invert()); leg.position.add(tv);}}
  bones[0].updateMatrixWorld(true);
}
const SOLE=[[0,-0.06,-0.04],[0,-0.06,0.1]], tv=new THREE.Vector3();
// grip matrix from base pose: staff upright at the right palm
applyPose({});
const hand=bones[idx(CFG.hand)];
const palmW=new THREE.Vector3(...CFG.palm).applyMatrix4(hand.matrixWorld);
const tilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(CFG.tilt[0]*D,CFG.tilt[1]*D,CFG.tilt[2]*D,'YXZ'));
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
function clipCheck(M){
  names.forEach((n,i)=>skm[i].copy(bones[i].matrixWorld).multiply(new THREE.Matrix4().makeTranslation(-world[i].x,-world[i].y,-world[i].z)));
  inv.copy(M).invert(); let n=0; const who={}; const B=CFG.box;
  for(let v=0;v<NV;v++){ if(skipV[v])continue; acc.set(0,0,0); let top=0,tw=0;
    for(let k=0;k<4;k++){const w=VW[v*4+k]; if(!w)continue; vv.set(VP[v*3],VP[v*3+1],VP[v*3+2]).applyMatrix4(skm[VJ[v*4+k]]); acc.addScaledVector(vv,w); if(w>tw){tw=w;top=VJ[v*4+k];}}
    acc.applyMatrix4(inv); if(acc.x>B[0]&&acc.x<B[1]&&acc.y>B[2]&&acc.y<B[3]&&acc.z>B[4]&&acc.z<B[5]){n++;who[names[top]]=(who[names[top]]||0)+1;}}
  // weapon corners under the floor
  let lo=0; for(const x of [B[0],B[1]])for(const y of [B[2],B[3]])for(const z of [B[4],B[5]]){const yy=vv.set(x,y,z).applyMatrix4(M).y; if(yy<lo)lo=yy;}
  if(lo<-0.03)who['floor '+lo.toFixed(2)]=1;
  return {body:n,lo,n:n+(lo<-0.03?1:0),who:Object.entries(who).map(e=>e.join(' ')).join(', ')};
}
// ---- keep the weapon out of the body: swing the holding arm so the weapon moves along its own face normal
const armB=bones[idx(CFG.holdBones[0])], ax=new THREE.Vector3(), nrm=new THREE.Vector3(), sh=new THREE.Vector3(), hd=new THREE.Vector3(), qd=new THREE.Quaternion(), qp=new THREE.Quaternion();
function pushOut(d){ if(!d)return;
  const M=staffAt(); nrm.set(0,0,1).transformDirection(M); hand.parent.getWorldQuaternion(qp);
  hand.position.add(nrm.multiplyScalar(d).applyQuaternion(qp.invert())); bones[0].updateMatrixWorld(true);
}
function liftUp(h){ if(!h)return; hand.parent.getWorldQuaternion(qp); hand.position.add(nrm.set(0,h,0).applyQuaternion(qp.invert())); bones[0].updateMatrixWorld(true); }
function needPush(pose){ let a=0; for(let k=0;k<30;k++){applyPose(pose); pushOut(a); if(clipCheck(staffAt()).body<=0)break; a+=0.01;} return a; }
// ---- clips
const FPS=30;
function evalClip(c,t){ // keyframed with smoothstep + procedural add
  const pose={};
  if(c.keys){const K=c.keys; let a=K[0],b=K[K.length-1]; for(let i=0;i<K.length-1;i++){if(t>=K[i].t&&t<=K[i+1].t){a=K[i];b=K[i+1];break;}}
    let u=b.t>a.t?(t-a.t)/(b.t-a.t):0; const e=b.ease||'s'; u=e==='in'?u*u:e==='out'?1-(1-u)*(1-u):e==='lin'?u:u*u*(3-2*u);
    const keysSet=new Set([...Object.keys(a.p),...Object.keys(b.p)]);
    for(const k of keysSet){const A=a.p[k]||[0,0,0],B=b.p[k]||[0,0,0]; pose[k]=[A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u,A[2]+(B[2]-A[2])*u];}}
  if(c.fn){const extra=c.fn(t,c.T); for(const k in extra){const A=pose[k]||[0,0,0],B=extra[k]; pose[k]=[A[0]+B[0],A[1]+B[1],A[2]+B[2]];}}
  return pose;
}
for(const [name,c] of Object.entries(CLIPS)){
  const n=Math.round(c.T*FPS)+1; const times=new Float32Array(n); const rot=names.map(()=>new Float32Array(n*4)); const hp=new Float32Array(n*3), lp={L:new Float32Array(n*3),R:new Float32Array(n*3)}, hdp=new Float32Array(n*3); const sp=new Float32Array(n*3), sq=new Float32Array(n*4);
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(); let prevQ=null; let worst={n:0};
  const push=new Float32Array(n); for(let f=0;f<n;f++)push[f]=needPush(evalClip(c,Math.min(f/FPS,c.T)));
  const dil=push.map((v,f)=>Math.max(...[-2,-1,0,1,2].map(o=>push[c.loop?(f+o+n-1)%(n-1):Math.min(n-1,Math.max(0,f+o))])));
  const sm2=dil.map((v,f)=>[-2,-1,0,1,2].reduce((a,o)=>a+dil[c.loop?(f+o+n-1)%(n-1):Math.min(n-1,Math.max(0,f+o))],0)/5); const pmax=Math.max(...sm2);
  const smooth=(arr)=>{const d=arr.map((v,f)=>Math.max(...[-2,-1,0,1,2].map(o=>arr[c.loop?(f+o+n-1)%(n-1):Math.min(n-1,Math.max(0,f+o))])));return d.map((v,f)=>[-2,-1,0,1,2].reduce((a,o)=>a+d[c.loop?(f+o+n-1)%(n-1):Math.min(n-1,Math.max(0,f+o))],0)/5);};
  const lift0=new Float32Array(n); for(let f=0;f<n;f++){applyPose(evalClip(c,Math.min(f/FPS,c.T))); pushOut(sm2[f]); lift0[f]=Math.max(0,-clipCheck(staffAt()).lo)*1.15;} const lift=smooth(lift0);
  for(let f=0;f<n;f++){const t=f/FPS; times[f]=t; const pose=evalClip(c,Math.min(t,c.T)); applyPose(pose); pushOut(sm2[f]); liftUp(lift[f]);
    names.forEach((nm,i)=>bones[i].quaternion.toArray(rot[i],f*4)); bones[idx('hips')].position.toArray(hp,f*3); hand.position.toArray(hdp,f*3); bones[idx('legL')].position.toArray(lp.L,f*3); bones[idx('legR')].position.toArray(lp.R,f*3);
    let M=staffAt(); if(c.staff) M=c.staff(t,c.T,M,THREE,{hand,STAFF_SCALE});
    if(f%2===0){const c=clipCheck(M); if(c.n>worst.n)worst={n:c.n,t:+t.toFixed(2),who:c.who};}
    M.decompose(p,q,s); if(prevQ&&prevQ.dot(q)<0){q.set(-q.x,-q.y,-q.z,-q.w);} prevQ=q.clone(); p.toArray(sp,f*3); q.toArray(sq,f*4);}
  report.push(name+' [push '+pmax.toFixed(2)+' at '+(sm2.indexOf(pmax)/FPS).toFixed(2)+'s]: '+(worst.n?worst.n+' verts at '+worst.t+'s ('+worst.who+')':'clear'));
  const anim=doc.createAnimation(name); const tin=doc.createAccessor().setType('SCALAR').setArray(times).setBuffer(buf);
  const add=(node,path,arr,type)=>{const smp=doc.createAnimationSampler().setInput(tin).setOutput(doc.createAccessor().setType(type).setArray(arr).setBuffer(buf)).setInterpolation('LINEAR'); anim.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(smp));};
  names.forEach((nm,i)=>{if(i>0)add(jn[i],'rotation',rot[i],'VEC4');}); add(jn[idx('hips')],'translation',hp,'VEC3'); add(jn[idx(CFG.hand)],'translation',hdp,'VEC3'); add(jn[idx('legL')],'translation',lp.L,'VEC3'); add(jn[idx('legR')],'translation',lp.R,'VEC3'); add(staffNode,'translation',sp,'VEC3'); add(staffNode,'rotation',sq,'VEC4');
}
await io.write(process.argv[2]||'tank-rigged.glb',doc);
console.log('CLIPPING\n'+report.join('\n'));
let tris=0; for(const m of doc.getRoot().listMeshes())for(const pr of m.listPrimitives())tris+=pr.getIndices().getCount()/3;
console.log('written; tris',tris,'joints',N,'clips',Object.keys(CLIPS).join(','),'size',fs.statSync(process.argv[2]||'tank-rigged.glb').size);
