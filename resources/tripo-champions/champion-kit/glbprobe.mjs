// usage: node glbprobe.mjs <glb> <clip> <node> <frame>: prints the node's rest translation and its animated translation / rotation at a frame
import fs from 'fs';
const [,, f, clip, node, fr] = process.argv; const b = fs.readFileSync(f); const jl = b.readUInt32LE(12); const J = JSON.parse(b.slice(20, 20 + jl).toString()); const bin = b.slice(20 + jl + 8);
const ni = J.nodes.findIndex((n) => n.name === node); console.log('rest', J.nodes[ni].translation, J.nodes[ni].rotation, 'scale', J.nodes[ni].scale);
const an = J.animations.find((a) => a.name === clip);
for (const c of an.channels) if (c.target.node === ni) { const s = an.samplers[c.sampler], a = J.accessors[s.output], bv = J.bufferViews[a.bufferView]; const n = a.type === 'VEC3' ? 3 : 4; const o = (bv.byteOffset || 0) + (a.byteOffset || 0) + (+fr) * n * 4; console.log(c.target.path, Array.from({ length: n }, (_, i) => +bin.readFloatLE(o + i * 4).toFixed(4)), 'count', a.count); }
