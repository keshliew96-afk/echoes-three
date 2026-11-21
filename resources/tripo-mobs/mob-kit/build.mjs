// usage: node build.mjs <rig dir> <clips module> <out.glb> [ONLY=a,b]
// Writes the rigged GLB with every clip at 60 frames a second and prints the audit:
// planted hooves that moved, hooves out of reach, points under the floor, loop pops.
import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { makeRig, FPS, V3 } from './quad.mjs';
const [dir, clipsPath, outPath] = process.argv.slice(2);
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const { CFG, CLIPS } = await import(pathToFileURL(path.resolve(clipsPath)).href);
const skel = JSON.parse(fs.readFileSync(dir + '/skel.json'));
const rd = (n, T) => { const b = fs.readFileSync(dir + '/' + n); return new T(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const rig = (CFG.makeRig || makeRig)(skel, CFG); // a boss without legs brings its own rig (wheel.mjs)
const names = skel.names, N = names.length;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = new Document(); const buf = doc.createBuffer(); const scene = doc.createScene(CFG.name);
const jn = names.map((n) => doc.createNode(n)); const world = skel.pos.map((p) => V3(...p));
names.forEach((n, i) => { const pi = names.indexOf(skel.parents[i]); const loc = pi < 0 ? world[i].clone() : world[i].clone().sub(world[pi]); jn[i].setTranslation(loc.toArray()); if (pi >= 0) jn[pi].addChild(jn[i]); });
const rootNode = doc.createNode(CFG.name + '_root'); scene.addChild(rootNode); rootNode.addChild(jn[0]);
const ibm = new Float32Array(16 * N); names.forEach((n, i) => new THREE.Matrix4().makeTranslation(-world[i].x, -world[i].y, -world[i].z).toArray(ibm, i * 16));
const skin = doc.createSkin('skin').setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf)).setSkeleton(jn[0]); jn.forEach((j) => skin.addJoint(j));
const pos = rd('b_pos.bin', Float32Array), ji = rd('b_ji.bin', Uint16Array), jw = rd('b_jw.bin', Float32Array), idx = rd('b_idx.bin', Uint32Array);
const tex = doc.createTexture(CFG.name + '_body').setImage(fs.readFileSync(dir + '/body_tex.jpg')).setMimeType('image/jpeg');
const mat = doc.createMaterial(CFG.name + '_body').setBaseColorTexture(tex).setRoughnessFactor(0.9).setMetallicFactor(0);
const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
const prim = doc.createPrimitive().setMaterial(mat)
  .setAttribute('POSITION', acc('VEC3', pos)).setAttribute('NORMAL', acc('VEC3', rd('b_nrm.bin', Float32Array)))
  .setAttribute('TEXCOORD_0', acc('VEC2', (() => { const u = rd('b_uv.bin', Float32Array); for (let i = 1; i < u.length; i += 2) u[i] = 1 - u[i]; return u; })()))
  .setAttribute('JOINTS_0', acc('VEC4', ji)).setAttribute('WEIGHTS_0', acc('VEC4', jw)).setAttribute('_MASK', acc('VEC3', rd('b_mask.bin', Float32Array)))
  .setIndices(acc('SCALAR', idx));
rootNode.addChild(doc.createNode(CFG.name + '_body').setMesh(doc.createMesh(CFG.name + '_body').addPrimitive(prim)).setSkin(skin));

const nV = pos.length / 3; const LEGB = new Set(Object.values(CFG.legs || {}).flatMap((l) => l.b.map((b) => names.indexOf(b)))); const report = {};
function skinMinY(S) { // lowest skinned point of this frame, and which bone owns it
  // world matrices down the hierarchy as exported (local rotations, the hips' translation, extras' slides and bone scales)
  const MW = {}; names.forEach((n, i) => { const p = skel.parents[i]; if (!p) { MW[n] = new THREE.Matrix4(); return; }
    const off = n === 'hips' ? S.PW.hips.clone() : world[i].clone().sub(world[names.indexOf(p)]).add((S.TL && S.TL[n]) || V3());
    const sc = S.SCL && S.SCL[n] !== undefined ? [S.SCL[n]].flat() : [1]; const sv = sc.length > 1 ? V3(...sc) : V3(sc[0], sc[0], sc[0]);
    MW[n] = MW[p].clone().multiply(new THREE.Matrix4().compose(off, S.QL[n] || new THREE.Quaternion(), sv)); });
  const M = names.map((n, i) => MW[n].clone().multiply(new THREE.Matrix4().makeTranslation(-world[i].x, -world[i].y, -world[i].z)));
  let lo = 1e9, hi = -1e9, who = -1, under = 0, loB = 1e9; const v = V3(), a = V3();
  for (let i = 0; i < nV; i += 2) { a.set(0, 0, 0); for (let k = 0; k < 4; k++) { const w = jw[i * 4 + k]; if (!w) continue; v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(M[ji[i * 4 + k]]); a.addScaledVector(v, w); } if (a.y < lo) { lo = a.y; who = ji[i * 4]; } if (a.y < loB && !LEGB.has(ji[i * 4])) loB = a.y; if (a.y > hi) hi = a.y; if (a.y < -0.004) under++; }
  return { lo, hi, who, under, loB };
}
for (const [name, clip] of Object.entries(CLIPS)) {
  if (only && !only.includes(name)) continue;
  const fr = rig.sample(clip); const nF = fr.length;
  if (fr[0].plantKey !== undefined) clip._plants = fr.map((S, i) => (i > 0 && S.plantKey && S.plantKey !== fr[i - 1].plantKey ? +S.t.toFixed(4) : null)).filter((x) => x !== null); // when a new peg takes the weight
  if (fr[0].line) { clip._lf = fr.map((S) => +S.line.Lf.toFixed(4)); clip._a0 = fr.map((S) => +S.line.a0.toFixed(4)); } // a snake: how much of it is free in front of its anchor, and how steeply it leaves it
  if (fr[0].th !== undefined) clip._roll = fr.map((S) => +S.th.toFixed(4)); // how far the wheel has turned, for the page (it carries the turn from one move into the next)
  const times = new Float32Array(nF); fr.forEach((S, i) => (times[i] = i / FPS));
  const anim = doc.createAnimation(name); const tin = acc('SCALAR', times);
  const add = (node, p, arr, type) => { const smp = doc.createAnimationSampler().setInput(tin).setOutput(acc(type, arr)).setInterpolation('LINEAR'); anim.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(p).setSampler(smp)); };
  const last = {};
  names.forEach((n, bi) => {
    if (n === 'root') return; const q = new Float32Array(nF * 4);
    fr.forEach((S, i) => { const ql = S.QL[n] || new THREE.Quaternion(); if (last[n] && last[n].dot(ql) < 0) ql.set(-ql.x, -ql.y, -ql.z, -ql.w); last[n] = ql.clone(); ql.toArray(q, i * 4); });
    add(jn[bi], 'rotation', q, 'VEC4');
  });
  const ht = new Float32Array(nF * 3); fr.forEach((S, i) => S.PW.hips.toArray(ht, i * 3)); add(jn[names.indexOf('hips')], 'translation', ht, 'VEC3');
  for (const [b] of CFG.extras || []) if (fr.some((S) => S.TL[b])) { const a = new Float32Array(nF * 3); const pi = names.indexOf(skel.parents[names.indexOf(b)]); const off = world[names.indexOf(b)].clone().sub(world[pi]); fr.forEach((S, i) => off.clone().add(S.TL[b] || V3()).toArray(a, i * 3)); add(jn[names.indexOf(b)], 'translation', a, 'VEC3'); }
  for (const [b] of CFG.scales || []) if (fr.some((S) => [S.SCL[b]].flat().some((v) => Math.abs(v - 1) > 1e-6))) { const a = new Float32Array(nF * 3); fr.forEach((S, i) => { const v = [S.SCL[b]].flat(); a.set([0, 1, 2].map((j) => Math.max(0.001, v[v.length > 1 ? j : 0])), i * 3); }); add(jn[names.indexOf(b)], 'scale', a, 'VEC3'); }
  const rt = new Float32Array(nF * 3), rs = new Float32Array(nF * 3); fr.forEach((S, i) => { rt[i * 3 + 2] = S.tz; rs.set([S.sc].flat().length > 1 ? S.sc : [S.sc, S.sc, S.sc].flat(), i * 3); });
  add(jn[0], 'translation', rt, 'VEC3'); add(jn[0], 'scale', rs, 'VEC3');
  // audit
  let slide = 0, slideAt = '', reach = 0, reachAt = '', lo = 1e9, loAt = '', under = 0, pop = 0, topMin = 1e9;
  const plant = {};
  fr.forEach((S, i) => {
    for (const k in S.toe) {
      const e = S.toe[k].distanceTo(S.want[k]); if (e > reach) { reach = e; reachAt = k + '@' + S.t.toFixed(2); }
      const w = S.toe[k].clone().add(V3(0, 0, S.tz));
      if (S.lock[k] && !clip.loop) { if (plant[k]) { const d = w.distanceTo(plant[k]); if (d > slide) { slide = d; slideAt = k + '@' + S.t.toFixed(2); } } else plant[k] = w; } else plant[k] = null;
      if (S.lock[k] && clip.loop && i > 0 && fr[i - 1].lock[k]) { const v = clip.gait || {}; const prev = fr[i - 1].toe[k]; const exp = S.want[k].clone().sub(fr[i - 1].want[k]); const d = S.toe[k].clone().sub(prev).sub(exp).length(); if (d > slide) { slide = d; slideAt = k + '@' + S.t.toFixed(2); } }
    }
    if (i % 2 === 0 || i === nF - 1) { const m = skinMinY(S); if (process.env.DBG) console.log('  ', S.t.toFixed(2), names[m.who], m.lo.toFixed(3), m.under, 'body', m.loB.toFixed(3)); if (m.lo < lo) { lo = m.lo; loAt = names[m.who] + '@' + S.t.toFixed(2); } under = Math.max(under, m.under); topMin = Math.min(topMin, m.hi); }
  });
  if (clip.loop) { const a = fr[0], z = fr[nF - 1]; for (const n of names) if (a.QL[n] && z.QL[n]) pop = Math.max(pop, 2 * Math.acos(Math.min(1, Math.abs(a.QL[n].dot(z.QL[n]))))); }
  report[name] = { dur: clip.dur, frames: nF, slide_mm: +(slide * CFG.unit * 1000).toFixed(1), slideAt, reach_mm: +(reach * CFG.unit * 1000).toFixed(1), reachAt, lowest: +lo.toFixed(4), loAt, under, loopPopDeg: +(pop * 180 / Math.PI).toFixed(2), ...(clip.sinks ? { topMin: +topMin.toFixed(3) } : {}) };
  console.log(name.padEnd(13), JSON.stringify(report[name]));
}
const meta = {}; for (const [k, c] of Object.entries(CLIPS)) meta[k] = { dur: c.dur, loop: !!c.loop, contact: c.contact || [], kinds: c.kinds || null, cues: c.cues || null, phases: c.phases || [], plants: c._plants || null, roll: c._roll || null, lf: c._lf || null, a0: c._a0 || null, travel: c.travel && (!c.loop || c.pageTravel) ? Array.from({ length: Math.round(c.dur * 60) + 1 }, (_, i) => +(c.travel(i / 60) * CFG.unit).toFixed(4)) : null };
fs.writeFileSync(outPath.replace(/\.glb$/, '.meta.json'), JSON.stringify(meta));
await io.write(outPath, doc);
fs.writeFileSync(outPath.replace(/\.glb$/, '.audit.json'), JSON.stringify(report, null, 1));
console.log('wrote', outPath, (fs.statSync(outPath).size / 1e6).toFixed(2), 'MB');
