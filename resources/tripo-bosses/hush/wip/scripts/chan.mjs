import { NodeIO } from '@gltf-transform/core';
const [f, clip, bone] = process.argv.slice(2);
const doc = await new NodeIO().read(f);
for (const a of doc.getRoot().listAnimations()) { if (a.getName() !== clip) continue;
  for (const ch of a.listChannels()) { if (ch.getTargetNode().getName() !== bone) continue;
    const s = ch.getSampler(); const inp = s.getInput().getArray(), out = s.getOutput().getArray(); const n = out.length / inp.length;
    for (let i = 0; i < inp.length; i += 20) console.log(ch.getTargetPath(), inp[i].toFixed(2), Array.from(out.slice(i * n, i * n + n)).map((v) => v.toFixed(3)).join(' ')); } }
