// usage: node dbgq.mjs <rig dir> <clips.mjs> <clip> <t> <bone,bone>   prints each bone's world up, forward and position
import fs from 'fs'; import path from 'path'; import * as THREE from 'three';
import { makeRig, FPS, V3 } from './biped.mjs';
const [rigDir, clipsPath, name, tt, bones] = process.argv.slice(2);
const skel = JSON.parse(fs.readFileSync(path.join(rigDir, 'skel.json')));
const { CFG, CLIPS } = await import(path.resolve(clipsPath));
const rig = makeRig(skel, CFG); const fr = rig.sample(CLIPS[name]); const S = fr[Math.min(fr.length - 1, Math.round(+tt * FPS))];
for (const b of bones.split(',')) { const q = S.QW[b], p = S.PW[b]; const f = (v) => v.toArray().map((x) => x.toFixed(2)).join(' ');
  console.log(b, 'pos', f(p), 'up', f(V3(0, 1, 0).applyQuaternion(q)), 'fwd', f(V3(0, 0, 1).applyQuaternion(q)), 'left', f(V3(1, 0, 0).applyQuaternion(q))); }
