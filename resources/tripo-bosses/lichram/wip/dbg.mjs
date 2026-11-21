import fs from 'fs'; import * as THREE from 'three';
import { makeRig } from './quad.mjs'; import { CFG, CLIPS } from './clips.mjs';
const skel = JSON.parse(fs.readFileSync('out/skel.json')); const rig = makeRig(skel, CFG);
const [name, leg, t0, t1] = process.argv.slice(2); const fr = rig.sample(CLIPS[name]); const L = CFG.legs[leg].b;
const f = (v) => v.toArray().map((x) => x.toFixed(3)).join(',');
let prev = null;
for (const S of fr) { if (S.t < +t0 || S.t > +t1) continue;
  const xb = new THREE.Vector3(1, 0, 0).applyQuaternion(S.QW[skel.parents[skel.names.indexOf(L[0])]]);
  const up = S.PW[L[0]].clone().sub(S.PW[L[3]]).normalize();
  const d = L.map((b) => prev ? (2 * Math.acos(Math.min(1, Math.abs(prev[b].dot(S.QW[b])))) * 57.3).toFixed(0) : '-');
  console.log(S.t.toFixed(3), 'root', f(S.PW[L[0]]), 'elbow', f(S.PW[L[1]]), 'knee', f(S.PW[L[2]]), 'fet', f(S.PW[L[3]]), 'toe', f(S.toe[leg]), 'want', f(S.want[leg]), 'xb.up', xb.dot(up).toFixed(2), 'dq', d.join('/'));
  prev = Object.fromEntries(L.map((b) => [b, S.QW[b].clone()])); }
