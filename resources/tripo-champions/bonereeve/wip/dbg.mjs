import * as THREE from 'three';
import fs from 'fs';
// sample bone world positions from a built glb at clip,time
const [,, glb, clipName, tt] = process.argv;
const buf = fs.readFileSync(glb); const jl = buf.readUInt32LE(12); const J = JSON.parse(buf.slice(20, 20 + jl).toString()); const bin = buf.slice(20 + jl + 8);
const acc = (i) => { const a = J.accessors[i], bv = J.bufferViews[a.bufferView]; const n = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type]; return new Float32Array(bin.buffer.slice(bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0), bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0) + a.count * n * 4)); };
const nodes = J.nodes.map((n) => { const o = new THREE.Object3D(); o.name = n.name; if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); return o; });
J.nodes.forEach((n, i) => (n.children || []).forEach((c) => nodes[i].add(nodes[c])));
const an = J.animations.find((a) => a.name === clipName); const t = +tt;
for (const ch of an.channels) { const s = an.samplers[ch.sampler]; const T = acc(s.input), V = acc(s.output); let i = 0; while (i < T.length - 1 && T[i + 1] <= t) i++; const n = nodes[ch.target.node]; const k = ch.target.path === 'rotation' ? 4 : 3; const v = V.slice(i * k, i * k + k); if (ch.target.path === 'rotation') n.quaternion.fromArray(v); else if (ch.target.path === 'translation') n.position.fromArray(v); else n.scale.fromArray(v); }
const roots = nodes.filter((n) => !n.parent); roots.forEach((r) => r.updateMatrixWorld(true));
for (const n of nodes) { if (!n.name) continue; const p = new THREE.Vector3().setFromMatrixPosition(n.matrixWorld); console.log(n.name.padEnd(12), p.x.toFixed(3), p.y.toFixed(3), p.z.toFixed(3)); }
