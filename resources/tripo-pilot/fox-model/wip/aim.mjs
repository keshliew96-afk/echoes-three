// finds the hand delta that points the weapon's long axis along a wanted direction for a given pose
import * as THREE from 'three'; import fs from 'fs'; import {BASE,CFG} from './clips.mjs';
const skel=JSON.parse(fs.readFileSync('skel.json')); const D=Math.PI/180; const names=skel.names;
const q=(e,o='XYZ')=>new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0]*D,e[1]*D,e[2]*D,o));
function chainRot(pose){let r=new THREE.Quaternion(); const chain=[]; let n=CFG.hand; while(n){chain.unshift(n); n=skel.parents[names.indexOf(n)];}
  for(const b of chain){r.multiply(q(pose[b]||[0,0,0]).multiply(q(BASE[b]||[0,0,0])));} return r;}
const rest=chainRot({}); const tilt=q(CFG.tilt,CFG.tiltOrder||'YXZ'); const Gq=rest.clone().invert().multiply(tilt);
const dirOf=pose=>new THREE.Vector3(0,1,0).applyQuaternion(chainRot(pose).multiply(Gq));
const pose=JSON.parse(process.argv[2]), want=new THREE.Vector3(...JSON.parse(process.argv[3])).normalize();
console.log('now',dirOf(pose).toArray().map(v=>+v.toFixed(2)));
let best=null; for(let x=-180;x<180;x+=10)for(let y=-90;y<=90;y+=10){const p={...pose,[CFG.hand]:[x,y,0]}; const d=dirOf(p).dot(want); if(!best||d>best.d)best={d,x,y};}
console.log('best',best);
