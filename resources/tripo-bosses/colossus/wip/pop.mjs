import fs from 'fs'; import { makeRig } from './quad.mjs'; import { CFG, CLIPS } from './clips.mjs';
const skel = JSON.parse(fs.readFileSync('out/skel.json')); const rig = makeRig(skel, CFG);
for (const name of process.argv.slice(2)) { const fr = rig.sample(CLIPS[name]); const a = fr[0], z = fr[fr.length - 1];
  const out = []; for (const n of skel.names) if (a.QL[n] && z.QL[n]) { const d = 2 * Math.acos(Math.min(1, Math.abs(a.QL[n].dot(z.QL[n])))) * 57.3; if (d > 0.5) out.push(n + ' ' + d.toFixed(1)); }
  console.log(name, out.join(', '), 'drop', fr.map((S) => S.drop.toFixed(3)).filter((d) => d !== '0.000').length); }
