// world positions of bones (and bone ends from skel.json) at time t of a clip, from the GLB. usage: fk.mjs glb skel clip t bone...
import { NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import fs from 'fs';
const [f, skf, clip, ts, ...bones] = process.argv.slice(2); const t = +ts;
const sk = JSON.parse(fs.readFileSync(skf)); const doc = await new NodeIO().read(f);
const nodes = doc.getRoot().listNodes(); const loc = new Map();
for (const n of nodes) loc.set(n, { t: new THREE.Vector3(...n.getTranslation()), r: new THREE.Quaternion(...n.getRotation()), s: new THREE.Vector3(...n.getScale()) });
const anim = doc.getRoot().listAnimations().find((a) => a.getName() === clip);
for (const ch of anim.listChannels()) { const s = ch.getSampler(); const inp = s.getInput().getArray(), out = s.getOutput().getArray(); const n = out.length / inp.length;
  let i = 0; while (i < inp.length - 1 && inp[i + 1] <= t) i++; const v = Array.from(out.slice(i * n, i * n + n)); const L = loc.get(ch.getTargetNode());
  if (ch.getTargetPath() === 'rotation') L.r.set(...v); else if (ch.getTargetPath() === 'translation') L.t.set(...v); else L.s.set(...v); }
const parent = new Map(); for (const n of nodes) for (const c of n.listChildren()) parent.set(c, n);
const world = (n) => { const L = loc.get(n); const m = new THREE.Matrix4().compose(L.t, L.r, L.s); const p = parent.get(n); return p ? world(p).multiply(m) : m; };
for (const b of bones) { const n = nodes.find((x) => x.getName() === b); const W = world(n); const p = new THREE.Vector3().setFromMatrixPosition(W);
  let e = ''; if (sk.ends[b]) { const rest = new THREE.Vector3(...sk.ends[b]).sub(new THREE.Vector3(...sk.pos[sk.names.indexOf(b)])); const L = loc.get(n);
    // ends are in model space at rest; bones have identity rest rotation, so the end offset rides the bone's world matrix minus its scale
    const q = new THREE.Quaternion(); W.decompose(new THREE.Vector3(), q, new THREE.Vector3()); e = ' end ' + rest.applyQuaternion(q).add(p).toArray().map((v) => v.toFixed(3)).join(','); }
  console.log(b, p.toArray().map((v) => v.toFixed(3)).join(','), e); }
