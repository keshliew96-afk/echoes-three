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
//      the four-way run, Bolt_1-3, Hit, Death, Revive and the four skill
//      casts), each at least 0.4 s long.
//   3. The mapping: every clip name the game drives (critters/driver.js
//      CLIPS) has a model clip in mousehealer.js's CLIP_OF, and every shape
//      in the Healer's kit has its own skill cast clip (SKILL_CAST).
//   4. Continuity: Revive starts in the pose Death ends in, and each combo
//      hit starts in the pose the hit before it ends in (Bolt_1 -> 2 -> 3 ->
//      1), every bone within 6 degrees: momentum carries hit to hit, and a
//      revived body gets up from where it fell.
//   5. The switch-back: the procedural healer is still built when the model
//      is off or missing (critters/index.js keeps buildHealer as the fallback).
//   6. Kesh's three animation rules (docs/MOUSE_HEALER.md "Self-check"), on
//      the clips themselves, with a forward-kinematics pass over the skeleton:
//      a. Direction: in each run clip the planted foot moves opposite to the
//         way that clip travels, at the speed the strides are built for
//         (LOCO_SPEED in game units, within 3%), so body and legs share one
//         velocity vector.
//      b. No sliding: in every standing clip a planted foot (its ankle within
//         1.5 cm of its rest height) moves under 0.3 cm a frame.
//      c. Force: where the body travels more than 4 cm in a strike or a
//         flinch, a foot steps the same way (the lead foot), so the legs carry
//         it (Revive rises over planted feet instead).
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
const NEED = ['Idle', 'Idle_Look', 'Run_F', 'Run_B', 'Strafe_L', 'Strafe_R', 'Bolt_1', 'Bolt_2', 'Bolt_3', 'Hit', 'Death', 'Revive', 'Cast_Bolt', 'Cast_Quick', 'Cast_Area', 'Attack'];
const missing = NEED.filter((n) => !clips[n]);
check('clips: all sixteen the rig plays are in the file', missing.length === 0, missing.length ? { missing } : NEED.map((n) => `${n} ${duration(clips[n]).toFixed(2)}s`).join(', '));
check('clips: each at least 0.4 s long', NEED.every((n) => clips[n] && duration(clips[n]) >= 0.39));

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

// --- 6. Kesh's three rules, by forward kinematics over the skeleton
const SCALE = 1.1 / 1.7; // mousehealer.js: model metres -> game units
const LOCO_SPEED = Number(src.match(/export const LOCO_SPEED = ([\d.]+)/)[1]);
const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qrot = (q, v) => {
  const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]);
  return [p[0], p[1], p[2]];
};
const parent = {};
gltf.nodes.forEach((n, i) => (n.children || []).forEach((c) => (parent[c] = i)));
const nodeIdx = Object.fromEntries(gltf.nodes.map((n, i) => [n.name, i]));
function sampler(anim) {
  const ch = {};
  for (const c of anim.channels) {
    const s = anim.samplers[c.sampler];
    (ch[c.target.node] ||= {})[c.target.path] = { t: accessor(s.input).data, v: accessor(s.output) };
  }
  return (node, path, time, rest) => {
    const c = ch[node]?.[path];
    if (!c) return rest;
    const { t, v } = c;
    let k = 0;
    while (k < t.length - 2 && t[k + 1] < time) k++;
    const a = Math.min(1, Math.max(0, (time - t[k]) / ((t[k + 1] ?? t[k]) - t[k] || 1)));
    const n = v.comps;
    const out = [];
    for (let j = 0; j < n; j++) out.push(v.data[k * n + j] * (1 - a) + v.data[Math.min(k + 1, v.count - 1) * n + j] * a);
    if (n === 4) {
      const l = Math.hypot(...out);
      return out.map((x) => x / l);
    }
    return out;
  };
}
function worldPos(anim, name, time) {
  const smp = sampler(anim);
  const chain = [];
  for (let i = nodeIdx[name]; i !== undefined; i = parent[i]) chain.unshift(i);
  let pos = [0, 0, 0];
  let rot = [0, 0, 0, 1];
  for (const i of chain) {
    const n = gltf.nodes[i];
    const t = smp(i, 'translation', time, n.translation || [0, 0, 0]);
    const r = smp(i, 'rotation', time, n.rotation || [0, 0, 0, 1]);
    const p = qrot(rot, t);
    pos = [pos[0] + p[0], pos[1] + p[1], pos[2] + p[2]];
    rot = qmul(rot, r);
  }
  return pos;
}
const FOOT = { L: 'Bone_015', R: 'Bone_020' };
const FPS = 30;
const restY = Object.fromEntries(Object.entries(FOOT).map(([k, n]) => [k, worldPos(clips.Idle, n, 0)[1]]));
function track(name, bone) {
  const out = [];
  const frames = Math.round(duration(clips[name]) * FPS);
  for (let f = 0; f <= frames; f++) out.push(worldPos(clips[name], bone, f / FPS));
  return out;
}
// a. direction and speed of the run clips (glTF: +Z forward, +X her left)
const TRAVEL = { Run_F: [0, 1], Run_B: [0, -1], Strafe_L: [1, 0], Strafe_R: [-1, 0] };
for (const [name, dir] of Object.entries(TRAVEL)) {
  const v = [];
  for (const side of Object.keys(FOOT)) {
    const p = track(name, FOOT[side]);
    for (let f = 1; f < p.length; f++) {
      if (p[f][1] - restY[side] < 0.01 && p[f - 1][1] - restY[side] < 0.01) {
        const dx = p[f][0] - p[f - 1][0];
        const dz = p[f][2] - p[f - 1][2];
        v.push({ along: (dx * dir[0] + dz * dir[1]) * FPS * SCALE, across: Math.abs(dx * dir[1] - dz * dir[0]) * FPS * SCALE });
      }
    }
  }
  const along = v.reduce((a, x) => a + x.along, 0) / (v.length || 1);
  const across = Math.max(0, ...v.map((x) => x.across));
  check(`rules a: ${name} plants a foot that moves back at ${LOCO_SPEED} u/s, against its travel`, v.length > 0 && Math.abs(-along - LOCO_SPEED) / LOCO_SPEED < 0.03 && across < 0.1, { planted: v.length, along: +along.toFixed(3), across: +across.toFixed(3) });
}
// b. no sliding and c. force in every standing clip
const STANDING = ['Idle', 'Idle_Look', 'Bolt_1', 'Bolt_2', 'Bolt_3', 'Cast_Bolt', 'Cast_Quick', 'Cast_Area', 'Attack', 'Hit', 'Revive'];
for (const name of STANDING) {
  let worst = 0;
  let worstAt = '';
  const steps = [];
  const feet = {};
  for (const side of Object.keys(FOOT)) {
    const p = (feet[side] = track(name, FOOT[side]));
    for (let f = 1; f < p.length; f++) {
      if (p[f][1] - restY[side] < 0.015 && p[f - 1][1] - restY[side] < 0.015) {
        const d = Math.hypot(p[f][0] - p[f - 1][0], p[f][2] - p[f - 1][2]) * SCALE * 100;
        if (d > worst) {
          worst = d;
          worstAt = `${side} f${f}`;
        }
      }
    }
  }
  check(`rules b: ${name} never slides a planted foot (worst ${worst.toFixed(2)} cm/frame)`, worst < 0.3, worstAt);
  const root = track(name, 'Bone_000');
  let far = 0;
  let farAt = 0;
  for (let f = 0; f < root.length; f++) {
    const d = Math.hypot(root[f][0] - root[0][0], root[f][2] - root[0][2]);
    if (d > far) {
      far = d;
      farAt = f;
    }
  }
  // Revive rises from sitting over feet that stay planted: the legs push the
  // body up and forward over them, so no step is due there.
  if (far * SCALE > 0.04 && name !== 'Revive') {
    const rd = [(root[farAt][0] - root[0][0]) / far, (root[farAt][2] - root[0][2]) / far];
    const stepped = Object.keys(FOOT).some((side) => {
      const p = feet[side];
      const end = p[Math.min(p.length - 1, farAt + 2)];
      return ((end[0] - p[0][0]) * rd[0] + (end[2] - p[0][2]) * rd[1]) * SCALE > 0.02;
    });
    check(`rules c: ${name} moves its body ${(far * SCALE * 100).toFixed(1)} cm and a foot steps the same way`, stepped);
  }
}

// --- 5. the switch-back
const idx = readFileSync(join(here, 'src/render/critters/index.js'), 'utf8');
check('switch-back: the procedural healer stays the fallback', /HEALER_MODEL !== 'mouse' \|\| !mouseHealerReady\(\)\) return buildHealer/.test(idx) && /'classic' \? buildHealer : buildMouseHealer/.test(idx));
check('switch-back: HEALER_MODEL is set', /export const HEALER_MODEL = '(mouse|classic)'/.test(src), src.match(/export const HEALER_MODEL = '(\w+)'/)?.[1]);

console.log(fails.length ? `\n${fails.length} FAIL` : '\nall pass');
process.exit(fails.length ? 1 : 0);
