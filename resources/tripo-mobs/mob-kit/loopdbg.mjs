// usage: node loopdbg.mjs <rig dir> <clips> <clip>: per-bone loop pop
import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
import { makeRig } from './quad.mjs';
const [dir, cp, name] = process.argv.slice(2);
const { CFG, CLIPS } = await import(pathToFileURL(path.resolve(cp)).href);
const skel = JSON.parse(fs.readFileSync(dir + '/skel.json'));
const rig = (CFG.makeRig || makeRig)(skel, CFG); const fr = rig.sample(CLIPS[name]); const a = fr[0], z = fr[fr.length - 1];
for (const n of skel.names) if (a.QL[n] && z.QL[n]) { const d = 2 * Math.acos(Math.min(1, Math.abs(a.QL[n].dot(z.QL[n])))) * 180 / Math.PI; if (d > 0.5) console.log(n, d.toFixed(2)); }
const b = rig.sample({ ...CLIPS.idle, dur: 0 })[0]; for (const n of skel.names) if (b.QL[n]) { const d = 2 * Math.acos(Math.min(1, Math.abs(b.QL[n].w))) * 180 / Math.PI; if (d > 2) console.log('rest', n, d.toFixed(1)); }
