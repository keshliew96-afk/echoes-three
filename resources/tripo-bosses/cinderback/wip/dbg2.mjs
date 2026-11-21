import fs from 'fs';
import { makeRig } from '../../kit/quad.mjs';
const { CFG, CLIPS } = await import('./clips.mjs');
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const R = makeRig(skel, CFG); const fr = R.sample(CLIPS[process.argv[2]]); const L = process.argv[5] || 'L';
const f3 = (v) => v.toArray().map(x => x.toFixed(3)).join(',');
for (const f of fr.slice(+process.argv[3], +process.argv[4])) console.log(f.t.toFixed(3), 'over', f.over['F'+L].toFixed(4), 'sh', f3(f.PW['fUp'+L]), 'el', f3(f.PW['fLo'+L]), 'wr', f3(f.PW['fHand'+L]), 'toe', f3(f.toe['F'+L]), 'want', f3(f.want['F'+L]));
