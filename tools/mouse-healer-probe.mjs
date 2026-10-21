#!/usr/bin/env node
// MOUSE HEALER probe (docs/MOUSE_HEALER.md) — headless Node, reads the model
// file and the rig code; no browser.
//
//   node tools/mouse-healer-probe.mjs
//
// Checks:
//   1. The model: src/assets/heroes/mousehealer.glb parses, holds one skinned
//      mesh, the staff-tip and head nodes the game reads, WebP textures, and
//      stays under its 2 MB budget.
//   2. The clips: every clip the rig plays is in the file (Idle, Idle_Look,
//      Run, Walk, Bolt_1-3, Hit, Death, Revive and the four skill casts), each at least 0.5 s long.
//   3. The mapping: every clip name the game drives (critters/driver.js
//      CLIPS) has a model clip in mousehealer.js's CLIP_OF, and every shape
//      in the Healer's kit has its own skill cast clip (SKILL_CAST).
//   4. Continuity: Revive starts in the pose Death ends in, and each combo
//      hit starts in the pose the hit before it ends in (Bolt_1 -> 2 -> 3 ->
//      1), every bone within 6 degrees: momentum carries hit to hit, and a
//      revived body gets up from where it fell.
//   5. The switch-back: the procedural healer is still built when the model
//      is off or missing (critters/index.js keeps buildHealer as the fallback).
// Exit code 1 on any failure.
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info ? `  ${typeof info === 'string' ? info : JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};

// --- 1. the model file
const GLB = join(here, 'src/assets/heroes/mousehealer.glb');
const buf = readFileSync(GLB);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8;
const bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen));
const nodeNames = gltf.nodes.map((n) => n.name);
const sizeKb = Math.round(statSync(GLB).size / 1024);
check('model: one skinned mesh with its 77-bone skin', gltf.skins?.length === 1 && gltf.skins[0].joints.length === 77, { skins: gltf.skins?.length, joints: gltf.skins?.[0]?.joints.length });
check('model: StaffTip (bolt emitter) and Bone_023 (head) nodes', nodeNames.includes('StaffTip') && nodeNames.includes('Bone_023'));
check('model: WebP textures', (gltf.images || []).length > 0 && gltf.images.every((i) => i.mimeType === 'image/webp'), (gltf.images || []).map((i) => i.mimeType));
check('model: under 2 MB', sizeKb < 2048, `${sizeKb} KB`);

// --- 2. the clips
function accessor(i) {
  const a = gltf.accessors[i];
  const v = gltf.bufferViews[a.bufferView];
  const comps = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
  const off = (v.byteOffset || 0) + (a.byteOffset || 0);
  const out = new Float32Array(a.count * comps);
  for (let k = 0; k < out.length; k++) out[k] = bin.readFloatLE(off + k * 4);
  return { data: out, comps, count: a.count, max: a.max };
}
const clips = Object.fromEntries((gltf.animations || []).map((a) => [a.name, a]));
const duration = (a) => Math.max(...a.samplers.map((s) => accessor(s.input).max[0]));
const NEED = ['Idle', 'Idle_Look', 'Run', 'Walk', 'Bolt_1', 'Bolt_2', 'Bolt_3', 'Hit', 'Death', 'Revive', 'Cast_Bolt', 'Cast_Quick', 'Cast_Area', 'Attack'];
const missing = NEED.filter((n) => !clips[n]);
check('clips: all fourteen the rig plays are in the file', missing.length === 0, missing.length ? { missing } : NEED.map((n) => `${n} ${duration(clips[n]).toFixed(2)}s`).join(', '));
check('clips: each at least 0.5 s long', NEED.every((n) => clips[n] && duration(clips[n]) >= 0.5));

// --- 3. the mapping
const src = readFileSync(join(here, 'src/render/critters/mousehealer.js'), 'utf8');
const { CLIPS } = await import(pathToFileURL(join(here, 'src/render/critters/driver.js')).href);
const clipOf = Object.fromEntries([...src.match(/CLIP_OF = Object\.freeze\(\{([^}]*)\}/)[1].matchAll(/(\w+):\s*'(\w+)'/g)].map((m) => [m[1], m[2]]));
const unmapped = CLIPS.filter((c) => !clipOf[c] || !clips[clipOf[c]]);
check('mapping: every game clip plays a model clip', unmapped.length === 0, unmapped.length ? { unmapped } : clipOf);
const skillCast = Object.fromEntries([...src.match(/SKILL_CAST = Object\.freeze\(\{([\s\S]*?)\n\}\);/)[1].matchAll(/(\w+): Object\.freeze\(\{ clip: '(\w+)', from: ([\d.]+) \}\)/g)].map((m) => [m[1], { clip: m[2], from: Number(m[3]) }]));
const { SKILLS } = await import(pathToFileURL(join(here, 'src/sim/skills.js')).href);
const { AI_PRIORITY } = await import(pathToFileURL(join(here, 'src/data/classes.js')).href);
const kitShapes = [...new Set(AI_PRIORITY.healer.map((id) => SKILLS[id]?.shape))].filter((sh) => sh && sh !== 'aura');
const missingShape = kitShapes.filter((sh) => !skillCast[sh] || !clips[skillCast[sh].clip]);
check('skills: every healer skill shape has its own cast clip in the file', missingShape.length === 0, missingShape.length ? { missingShape } : Object.fromEntries(kitShapes.map((sh) => [sh, skillCast[sh].clip])));
check('skills: each cast starts inside its clip', Object.values(skillCast).every((k) => clips[k.clip] && k.from < duration(clips[k.clip])));

// --- 4. the rise starts where the fall ends
function rotationAt(anim, pickLast) {
  const out = {};
  for (const ch of anim.channels) {
    if (ch.target.path !== 'rotation') continue;
    const s = anim.samplers[ch.sampler];
    const q = accessor(s.output);
    const k = pickLast ? q.count - 1 : 0;
    out[gltf.nodes[ch.target.node].name] = Array.from(q.data.subarray(k * 4, k * 4 + 4));
  }
  return out;
}
function seam(from, to) {
  const end = rotationAt(clips[from], true);
  const start = rotationAt(clips[to], false);
  let worst = 0;
  let worstBone = '';
  for (const [bone, a] of Object.entries(end)) {
    const b = start[bone];
    if (!b) continue;
    const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
    const deg = (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI;
    if (deg > worst) {
      worst = deg;
      worstBone = bone;
    }
  }
  check(`continuity: ${to} starts in the pose ${from} ends in (every bone within 6 degrees)`, worst <= 6, `${worst.toFixed(2)} deg at ${worstBone}`);
}
seam('Death', 'Revive');
seam('Bolt_1', 'Bolt_2');
seam('Bolt_2', 'Bolt_3');
seam('Bolt_3', 'Bolt_1');

// --- 5. the switch-back
const idx = readFileSync(join(here, 'src/render/critters/index.js'), 'utf8');
check('switch-back: the procedural healer stays the fallback', /HEALER_MODEL !== 'mouse' \|\| !mouseHealerReady\(\)\) return buildHealer/.test(idx) && /'classic' \? buildHealer : buildMouseHealer/.test(idx));
check('switch-back: HEALER_MODEL is set', /export const HEALER_MODEL = '(mouse|classic)'/.test(src), src.match(/export const HEALER_MODEL = '(\w+)'/)?.[1]);

console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
