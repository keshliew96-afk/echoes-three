// usage: node bprobe.mjs <rig dir> <clips> <clip> <t> <bone,...>  : world position of bones (and the staff's top) at time t
import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
import * as THREE from 'three';
import { makeRig, V3 } from './biped.mjs';
const [dir, clipsPath, clip, ts, bl] = process.argv.slice(2);
const { CFG, CLIPS } = await import(pathToFileURL(path.resolve(clipsPath)).href);
const skel = JSON.parse(fs.readFileSync(dir + '/skel.json')); const rig = makeRig(skel, CFG);
const fr = rig.sample(CLIPS[clip]); const i = Math.min(fr.length - 1, Math.round(+ts * 60)); const S = fr[i];
for (const b of bl.split(',')) { const q = S.QW[b]; const up = V3(0, 1, 0).applyQuaternion(q); console.log(b, S.PW[b].toArray().map((v) => v.toFixed(3)).join(' '), 'up', up.toArray().map((v) => v.toFixed(2)).join(' ')); }
