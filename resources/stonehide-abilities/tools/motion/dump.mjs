import { NodeIO } from '@gltf-transform/core';
const doc=await new NodeIO().read(process.argv[2]); const nm=process.argv[3], node=process.argv[4]||'hips', path=process.argv[5]||'translation';
const all=doc.getRoot().listAnimations().filter(a=>a.getName()===nm); console.log('animations named',nm,all.length,'total',doc.getRoot().listAnimations().length);
for(const a of all){const c=a.listChannels().find(c=>c.getTargetNode().getName()===node&&c.getTargetPath()===path); const t=c.getSampler().getInput().getArray(), v=c.getSampler().getOutput().getArray(), k=path==='translation'?3:4;
 let s=''; for(let i=0;i<t.length;i+=3)s+=t[i].toFixed(2)+':'+[...v.slice(i*k,i*k+k)].map(x=>x.toFixed(3)).join(',')+'  '; console.log(s);}
