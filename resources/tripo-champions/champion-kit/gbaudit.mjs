// usage: node gbaudit.mjs <rig dir> <clips>: per clip, how far the right wrist falls short of its place on the pipe, how far
// the left wrist falls short of its point, and the pipe's lowest point (mm in model units x 1000)
import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
import { makeRig, V3 } from './biped.mjs';
const [dir, clipsPath] = process.argv.slice(2);
const M = await import(pathToFileURL(path.resolve(clipsPath)).href); const { CFG, CLIPS } = M;
const skel = JSON.parse(fs.readFileSync(dir + '/skel.json')); const rig = makeRig(skel, CFG); const ix = (n) => skel.names.indexOf(n);
const PU = V3(...CFG.grips.A.axis); const OFF = V3(...skel.pos[ix('handR')]).sub(V3(...skel.pos[ix('pipe')]));
const out = {};
for (const [name, c] of Object.entries(CLIPS)) {
  const fr = rig.sample(c); let r = 0, l = 0, lo = 9, rAt = 0, lAt = 0, loAt = 0;
  fr.forEach((S, i) => { const t = i / 60, p = c.pose(Math.min(t, c.dur)); const g = (p.AG ?? 1);
    if (g > 0.5) { const T = S.PW.pipe.clone().add(OFF.clone().add(PU.clone().multiplyScalar(p.AGs || 0)).applyQuaternion(S.QW.pipe)); const d = T.distanceTo(S.PW.handR); if (d > r) { r = d; rAt = t; } }
    if ((p.BW || 0) > 0.99) { const d = V3(p.Bx, p.By, p.Bz).distanceTo(S.PW.handL); if (d > l) { l = d; lAt = t; } }
    for (const d of [-0.742, 0.175]) { const y = S.PW.pipe.clone().add(PU.clone().multiplyScalar(d).applyQuaternion(S.QW.pipe)).y - (d > 0 ? 0.04 : 0); if (y < lo) { lo = y; loAt = t; } } });
  if (process.env.CLIP === name) console.log(fr.map((S, i) => { const p = c.pose(Math.min(i / 60, c.dur)); const T = S.PW.pipe.clone().add(OFF.clone().add(PU.clone().multiplyScalar(p.AGs || 0)).applyQuaternion(S.QW.pipe)); return (i / 60).toFixed(2) + ":" + (T.distanceTo(S.PW.handR) * 1000).toFixed(0); }).filter((_, i) => i % 4 === 0).join(" "));
  out[name] = { right_mm: +(r * 1000).toFixed(1), rAt: +rAt.toFixed(2), left_mm: +(l * 1000).toFixed(1), lAt: +lAt.toFixed(2), pipeLow_mm: +(lo * 1000).toFixed(1), loAt: +loAt.toFixed(2) };
  console.log(name.padEnd(13), JSON.stringify(out[name]));
}
fs.writeFileSync(process.argv[4] || 'gb.hands.json', JSON.stringify(out));
