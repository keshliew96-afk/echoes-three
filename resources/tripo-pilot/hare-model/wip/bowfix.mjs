// cuts the broken string off the Tripo bow (thin faces on the string side between the two tips) and reports where it was tied
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc=await io.read(process.argv[2]);
const p=doc.getRoot().listMeshes()[0].listPrimitives()[0]; const pos=p.getAttribute('POSITION').getArray(), idx=p.getIndices().getArray();
const X=+(process.argv[4]||0.088), Z=+(process.argv[5]||0.02), Y0=+(process.argv[6]||0.09), Y1=1-Y0;
const isS=v=>pos[v*3]>X&&Math.abs(pos[v*3+2])<Z&&pos[v*3+1]>Y0&&pos[v*3+1]<Y1;
const keep=[]; let cut=0; let lo=[0,9,0],hi=[0,-9,0],zs=[9,-9],xs=[9,-9];
for(let f=0;f<idx.length;f+=3){const a=idx[f],b=idx[f+1],c=idx[f+2]; if(isS(a)&&isS(b)&&isS(c)){cut++; for(const v of [a,b,c]){const y=pos[v*3+1]; if(y<lo[1])lo=[pos[v*3],y,pos[v*3+2]]; if(y>hi[1])hi=[pos[v*3],y,pos[v*3+2]]; zs=[Math.min(zs[0],pos[v*3+2]),Math.max(zs[1],pos[v*3+2])]; xs=[Math.min(xs[0],pos[v*3]),Math.max(xs[1],pos[v*3])];}} else keep.push(a,b,c);}
p.getIndices().setArray(new Uint32Array(keep)); console.log('string faces cut',cut,'kept',keep.length/3,'low end',lo.map(v=>+v.toFixed(3)),'high end',hi.map(v=>+v.toFixed(3)),'z',zs.map(v=>+v.toFixed(3)),'x',xs.map(v=>+v.toFixed(3)));
await io.write(process.argv[3],doc);
