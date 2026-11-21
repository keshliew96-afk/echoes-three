// removes every loose piece smaller than 200 faces
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc=await io.read(process.argv[2]);
const p=doc.getRoot().listMeshes()[0].listPrimitives()[0]; const pos=p.getAttribute('POSITION').getArray(), idx=p.getIndices().getArray();
const key=new Map(), rep=new Int32Array(pos.length/3); for(let v=0;v<rep.length;v++){const k=[0,1,2].map(i=>pos[v*3+i].toFixed(5)).join(','); if(!key.has(k))key.set(k,v); rep[v]=key.get(k);}
const par=Int32Array.from(rep.keys()); const find=a=>{while(par[a]!==a){par[a]=par[par[a]];a=par[a];}return a;};
for(let f=0;f<idx.length;f+=3){const a=find(rep[idx[f]]),b=find(rep[idx[f+1]]),c=find(rep[idx[f+2]]);par[b]=a;par[c]=a;}
const cnt=new Map(); for(let f=0;f<idx.length;f+=3){const r=find(rep[idx[f]]);cnt.set(r,(cnt.get(r)||0)+1);}
const keep=[]; let cut=0; for(let f=0;f<idx.length;f+=3){if(cnt.get(find(rep[idx[f]]))>=200)keep.push(idx[f],idx[f+1],idx[f+2]);else cut++;}
p.getIndices().setArray(new Uint32Array(keep)); console.log('removed faces',cut,'kept',keep.length/3); await io.write(process.argv[3],doc);
