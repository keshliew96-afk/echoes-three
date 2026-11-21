import {NodeIO} from '@gltf-transform/core';
import {KHRMaterialsVolume} from '@gltf-transform/extensions';
const io=new NodeIO().registerExtensions([KHRMaterialsVolume]); const d=await io.read(process.argv[2]); const r=d.getRoot();
for(const m of r.listMaterials()){ console.log('mat',m.getName(),m.getBaseColorFactor(),m.getMetallicFactor(),m.getRoughnessFactor(),m.getAlphaMode(),m.getDoubleSided(),m.listExtensions().map(e=>e.extensionName),!!m.getBaseColorTexture(),!!m.getNormalTexture(),!!m.getMetallicRoughnessTexture(),m.getEmissiveFactor());
  for(const e of m.listExtensions())m.setExtension(e.extensionName,null); m.setMetallicFactor(0); m.setRoughnessFactor(0.9); m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setEmissiveTexture(null); }
for(const e of r.listExtensionsUsed())e.dispose();
for(const t of r.listTextures()){ if(t.listParents().length<=1)t.dispose(); }
await io.write(process.argv[3],d); console.log('ok', r.listTextures().length);
