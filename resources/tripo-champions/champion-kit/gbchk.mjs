// usage: node gbchk.mjs <rig dir> <clips> <clip> <t,...>: the pipe's foot and gather, the wrists, the mouth, and how far each arm falls short
import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
import * as THREE from 'three';
import { makeRig, V3 } from './biped.mjs';
const [dir, clipsPath, clip, ts] = process.argv.slice(2);
const M = await import(pathToFileURL(path.resolve(clipsPath)).href); const { CFG, CLIPS, GRIP, MOUTH } = M;
const skel = JSON.parse(fs.readFileSync(dir + '/skel.json')); const rig = makeRig(skel, CFG);
const fr = rig.sample(CLIPS[clip]); const PU = V3(0.037, 0.9991, -0.0194).normalize(); const H0 = V3(...skel.pos[skel.names.indexOf('head')]);
const f = (v) => v.toArray().map((x) => x.toFixed(3)).join(' ');
for (const t of ts.split(',')) {
  const S = fr[Math.min(fr.length - 1, Math.round(+t * 60))]; const q = S.QW.pipe, g = S.PW.pipe;
  const at = (d) => g.clone().add(PU.clone().multiplyScalar(d).applyQuaternion(q));
  const mouth = S.PW.head.clone().add(MOUTH.clone().sub(H0).applyQuaternion(S.QW.head));
  const L = S.PW.handL, R = S.PW.handR; const u = PU.clone().applyQuaternion(q);
  const dl = (p) => { const r = p.clone().sub(g); const tt = r.dot(u); return [tt.toFixed(3), r.sub(u.clone().multiplyScalar(tt)).length().toFixed(3)]; };
  console.log(t, 'foot', f(at(-0.742)), 'gather', f(at(0.215)), 'mouthEnd-mouth', at(-0.742).distanceTo(mouth).toFixed(3), 'wristR t,r', dl(R), 'wristL t,r', dl(L), 'armOver', (S.armOver || 0).toFixed(3));
}
