import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const r = doc.getRoot();
console.log('exts', r.listExtensionsUsed().map(e=>e.extensionName));
for (const n of r.listNodes()) console.log('node', n.getName(), n.getTranslation(), n.getRotation(), n.getScale(), !!n.getMesh(), !!n.getSkin());
for (const m of r.listMeshes()) for (const p of m.listPrimitives()) {
  const pos=p.getAttribute('POSITION'); const idx=p.getIndices();
  console.log('mesh', m.getName(), 'verts', pos.getCount(), 'tris', (idx?idx.getCount():pos.getCount())/3, 'attrs', p.listSemantics(), 'min', pos.getMin([]), 'max', pos.getMax([]));
  const mat=p.getMaterial(); console.log(' mat', mat?.getName(), mat?.getBaseColorFactor(), 'metal', mat?.getMetallicFactor(), 'rough', mat?.getRoughnessFactor());
}
for (const t of r.listTextures()) console.log('tex', t.getName(), t.getMimeType(), t.getSize(), t.getImage().byteLength);
console.log('anims', r.listAnimations().length, 'skins', r.listSkins().length);
