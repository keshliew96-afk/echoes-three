import { CLIPS, CFG } from './clips.mjs';
import { makeRig, addPose } from '../../kit/quad.mjs';
import fs from 'fs';
const skel = JSON.parse(fs.readFileSync(new URL('./out/skel.json', import.meta.url)));
const rig = makeRig(skel, CFG); const [name, a, b] = process.argv.slice(2); const c = CLIPS[name];
const fr = rig.sample(c); const f3 = (v) => v.toArray().map((x) => x.toFixed(2)).join(',');
for (const S of fr) if (S.t > +a && S.t < +b) { const v0 = rig.P0.weed2.clone().sub(rig.P0.weed1);
  const H = rig.solve(addPose(CFG.base, c.pose(S.t)));
  console.log(S.t.toFixed(3), 'w1 joint', f3(S.PW.weed1), 'sprung', f3(v0.clone().applyQuaternion(S.QW.weed1)), 'hang', f3(v0.clone().applyQuaternion(H.QW.weed1)), 'par', f3(v0.clone().applyQuaternion(H.QW.hips))); }
