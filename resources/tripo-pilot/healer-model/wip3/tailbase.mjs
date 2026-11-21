import * as THREE from 'three'; import fs from 'fs';
const sk=JSON.parse(fs.readFileSync('skel.json')); const P=n=>new THREE.Vector3(...sk.pos[sk.names.indexOf(n)]);
const pts=[P('tail1'),P('tail2'),P('tail3'),P('tail4'),P('tail5'),new THREE.Vector3(0.36,0.28,-0.37)];
// wanted: straight back with a soft S, same rise as the model
const sx=[0.10,-0.06,-0.22,-0.05,0.22]; let Qp=new THREE.Quaternion(); const out={};
for(let i=0;i<5;i++){const o=pts[i+1].clone().sub(pts[i]); const len=o.length(); const horiz=Math.hypot(o.x,o.z); const yy=i===4?o.y*0.45:o.y; const h=Math.sqrt(Math.max(1e-6,len*len-yy*yy));
  const want=new THREE.Vector3(sx[i],0,-1).normalize().multiplyScalar(h); want.y=yy; want.normalize();
  const local=want.clone().applyQuaternion(Qp.clone().invert()); const q=new THREE.Quaternion().setFromUnitVectors(o.clone().normalize(),local);
  const e=new THREE.Euler().setFromQuaternion(q,'XYZ'); out['tail'+(i+1)]=[e.x,e.y,e.z].map(v=>+(v*180/Math.PI).toFixed(1)); Qp.multiply(q);}
console.log(JSON.stringify(out));
