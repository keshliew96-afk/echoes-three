import fs from 'fs';
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { BASE, CLIPS } from './clips.mjs';
const skel=JSON.parse(fs.readFileSync('skel.json'));
const f32=n=>new Float32Array(fs.readFileSync(n).buffer.slice(0)); 
const rd=(n,T)=>{const b=fs.readFileSync(n);return new T(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=new Document(); const buf=doc.createBuffer();
const scene=doc.createScene('healer');
// ---- skeleton
const names=skel.names, N=names.length;
const jn=names.map((n,i)=>doc.createNode(n));
const world=skel.pos.map(p=>new THREE.Vector3(...p));
names.forEach((n,i)=>{const pi=names.indexOf(skel.parents[i]); const loc=pi<0?world[i].clone():world[i].clone().sub(world[pi]); jn[i].setTranslation(loc.toArray()); if(pi>=0) jn[pi].addChild(jn[i]);});
const rootNode=doc.createNode('healer_root'); scene.addChild(rootNode); rootNode.addChild(jn[0]);
const ibm=new Float32Array(16*N); names.forEach((n,i)=>{const m=new THREE.Matrix4().makeTranslation(-world[i].x,-world[i].y,-world[i].z); m.toArray(ibm,i*16);});
const skin=doc.createSkin('skin').setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf)).setSkeleton(jn[0]);
jn.forEach(j=>skin.addJoint(j));
// ---- body mesh
const tex=doc.createTexture('healer_body').setImage(fs.readFileSync('body_tex.jpg')).setMimeType('image/jpeg');
const mat=doc.createMaterial('healer_body').setBaseColorTexture(tex).setRoughnessFactor(0.9).setMetallicFactor(0);
const prim=doc.createPrimitive().setMaterial(mat)
 .setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(rd('b_pos.bin',Float32Array)).setBuffer(buf))
 .setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(rd('b_nrm.bin',Float32Array)).setBuffer(buf))
 .setAttribute('TEXCOORD_0',doc.createAccessor().setType('VEC2').setArray((()=>{const u=rd('b_uv.bin',Float32Array);for(let i=1;i<u.length;i+=2)u[i]=1-u[i];return u;})()).setBuffer(buf))
 .setAttribute('JOINTS_0',doc.createAccessor().setType('VEC4').setArray(rd('b_ji.bin',Uint16Array)).setBuffer(buf))
 .setAttribute('WEIGHTS_0',doc.createAccessor().setType('VEC4').setArray(rd('b_jw.bin',Float32Array)).setBuffer(buf))
 .setIndices(doc.createAccessor().setType('SCALAR').setArray(rd('b_idx.bin',Uint32Array)).setBuffer(buf));
const bodyNode=doc.createNode('healer_body').setMesh(doc.createMesh('healer_body').addPrimitive(prim)).setSkin(skin); rootNode.addChild(bodyNode);
// ---- staff (rigid, driven in root space)
const sdoc=await io.read('staff2.glb'); const sm=sdoc.getRoot().listMeshes()[0].listPrimitives()[0];
const stex=doc.createTexture('healer_staff').setImage(sdoc.getRoot().listTextures()[0].getImage()).setMimeType('image/jpeg');
const smat=doc.createMaterial('healer_staff').setBaseColorTexture(stex).setRoughnessFactor(0.9).setMetallicFactor(0);
const sprim=doc.createPrimitive().setMaterial(smat).setIndices(doc.createAccessor().setType('SCALAR').setArray(sm.getIndices().getArray().slice()).setBuffer(buf));
for(const s of ['POSITION','NORMAL','TEXCOORD_0']){const a=sm.getAttribute(s);sprim.setAttribute(s,doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setBuffer(buf));}
const staffNode=doc.createNode('staff').setMesh(doc.createMesh('healer_staff').addPrimitive(sprim)); rootNode.addChild(staffNode);
const STAFF_SCALE=0.8, GRIP_Y=0.44;
// ---- FK helper with three
const bones=names.map(n=>new THREE.Object3D()); names.forEach((n,i)=>{const pi=names.indexOf(skel.parents[i]); bones[i].position.fromArray(jn[i].getTranslation()); if(pi>=0)bones[pi].add(bones[i]);});
const D=Math.PI/180; const idx=n=>names.indexOf(n);
function applyPose(pose){ // pose: {joint:[x,y,z] deg, _hips:[x,y,z] offset}
  names.forEach((n,i)=>{const b=BASE[n]||[0,0,0], p=pose[n]||[0,0,0]; bones[i].rotation.set((b[0]+p[0])*D,(b[1]+p[1])*D,(b[2]+p[2])*D,'XYZ'); bones[i].position.fromArray(jn[i].getTranslation());});
  if(pose._hips){bones[idx('hips')].position.add(new THREE.Vector3(...pose._hips));}
  bones[0].updateMatrixWorld(true);
}
// grip matrix from base pose: staff upright at the right palm
applyPose({});
const hand=bones[idx('handR')];
const palmLocal=new THREE.Vector3(-0.028,-0.03,0.012);
const palmW=palmLocal.clone().applyMatrix4(hand.matrixWorld);
const tilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(6*D,0,4*D));
const S0=new THREE.Matrix4().compose(palmW.clone().sub(new THREE.Vector3(0,GRIP_Y*STAFF_SCALE,0).applyQuaternion(tilt)),tilt,new THREE.Vector3(1,1,1).multiplyScalar(STAFF_SCALE));
const G=hand.matrixWorld.clone().invert().multiply(S0);
function staffAt(){return hand.matrixWorld.clone().multiply(G);}
{const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();S0.decompose(p,q,s);staffNode.setTranslation(p.toArray()).setRotation(q.toArray()).setScale(s.toArray());
 // bake base pose as the rest pose of the nodes
 names.forEach((n,i)=>jn[i].setRotation(bones[i].quaternion.toArray()));}
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
  const n=Math.round(c.T*FPS)+1; const times=new Float32Array(n); const rot=names.map(()=>new Float32Array(n*4)); const hp=new Float32Array(n*3); const sp=new Float32Array(n*3), sq=new Float32Array(n*4);
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(); let prevQ=null;
  for(let f=0;f<n;f++){const t=f/FPS; times[f]=t; const pose=evalClip(c,Math.min(t,c.T)); applyPose(pose);
    names.forEach((nm,i)=>bones[i].quaternion.toArray(rot[i],f*4)); bones[idx('hips')].position.toArray(hp,f*3);
    let M=staffAt(); if(c.staff) M=c.staff(t,c.T,M,THREE,{hand,STAFF_SCALE});
    M.decompose(p,q,s); if(prevQ&&prevQ.dot(q)<0){q.set(-q.x,-q.y,-q.z,-q.w);} prevQ=q.clone(); p.toArray(sp,f*3); q.toArray(sq,f*4);}
  const anim=doc.createAnimation(name); const tin=doc.createAccessor().setType('SCALAR').setArray(times).setBuffer(buf);
  const add=(node,path,arr,type)=>{const smp=doc.createAnimationSampler().setInput(tin).setOutput(doc.createAccessor().setType(type).setArray(arr).setBuffer(buf)).setInterpolation('LINEAR'); anim.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(smp));};
  names.forEach((nm,i)=>{if(i>0)add(jn[i],'rotation',rot[i],'VEC4');}); add(jn[idx('hips')],'translation',hp,'VEC3'); add(staffNode,'translation',sp,'VEC3'); add(staffNode,'rotation',sq,'VEC4');
}
await io.write(process.argv[2]||'healer-rigged.glb',doc);
let tris=0; for(const m of doc.getRoot().listMeshes())for(const pr of m.listPrimitives())tris+=pr.getIndices().getCount()/3;
console.log('written; tris',tris,'joints',N,'clips',Object.keys(CLIPS).join(','),'size',fs.statSync(process.argv[2]||'healer-rigged.glb').size);
