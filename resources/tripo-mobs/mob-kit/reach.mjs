import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
import { makeRig } from './quad.mjs';
const [dir, clipsPath, name, step] = process.argv.slice(2);
const { CFG, CLIPS } = await import(pathToFileURL(path.resolve(clipsPath)).href);
const rig = makeRig(JSON.parse(fs.readFileSync(dir + '/skel.json')), CFG);
const fr = rig.sample(CLIPS[name]);
fr.forEach((S, i) => { if (i % (+step || 3)) return; const r = Object.keys(S.toe).map((k) => k + ':' + (S.toe[k].distanceTo(S.want[k]) * CFG.unit * 1000).toFixed(0) + (S.lock[k] ? 'L' : ''));
  console.log(S.t.toFixed(2), r.join(' '), 'hipsY', S.PW.hips.y.toFixed(3)); });
