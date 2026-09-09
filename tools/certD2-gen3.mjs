// certD2 batch 3 — paired camp-vs-combat in ONE page session (contention control).
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, GPU, sample, arm, evdump } from './certD2-gen.mjs';
const files = {};
const rmb = { type: 'mousedown', button: 'right' };
const look = { type: 'mousemove', x: 800, y: 320 };

files['certD2-pair'] = [
  GPU,
  ev(iife(`return {ver:E.version,tick:E.tick,scene:E.state().scene}`)),
  sample(8000, 'A-camp-idle'),
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',2);return {room:r&&r.room,mode:r&&r.mode}`)),
  look,
  waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.length`),
  rmb,
  sample(15000, 'B-room2-combat'),
  { type: 'mouseup', button: 'right' },
  ev(iife(`const s=E.state();return {tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,ui:E.runUi().screen,vfx:{numerals:s.vfx.arena?s.vfx.arena.numerals:s.vfx.numerals,decals:s.vfx.arena?s.vfx.arena.decals:s.vfx.decals,particles:s.vfx.arena?s.vfx.arena.particles:s.vfx.particles}}`)),
  sample(8000, 'C-postclear-idle'),
  ev(iife(`return {tick:E.tick,fps:E.fps,ents:E.entityCount,ui:E.runUi().screen}`)),
  shot('certD2-pair-frame'),
];

// same page, but combat FIRST then camp-equivalent idle to rule out ordering
files['certD2-pair2'] = [
  ev(iife(`return {ver:E.version,scene:E.state().scene}`)),
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',2);return {room:r&&r.room,mode:r&&r.mode}`)),
  look,
  waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.length`),
  rmb,
  sample(15000, 'B-room2-combat'),
  { type: 'mouseup', button: 'right' },
  ev(iife(`E.cmd('endRun');E.cmd('returnToCamp');return {scene:E.state().scene,ui:E.runUi().screen}`)),
  wait(3000),
  ev(iife(`return {scene:E.state().scene,tick:E.tick,ents:E.entityCount}`)),
  sample(8000, 'A2-camp-after'),
  shot('certD2-pair2-frame'),
];
for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
