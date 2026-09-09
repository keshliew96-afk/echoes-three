// certD2 batch 4 — progressive-decay probes: repeated identical samples in one page.
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, GPU, sample, arm, evdump } from './certD2-gen.mjs';
const files = {};
const mem = (tag) => ev(iife(`const p=performance.memory||{};const r=window.__renderer||null;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,ents:E.entityCount,heapMB:p.usedJSHeapSize?+(p.usedJSHeapSize/1048576).toFixed(1):null,domNodes:document.getElementsByTagName('*').length}`));

// A: camp only, 5 identical 8 s samples, nothing else happens.
files['certD2-decay-camp'] = [
  GPU, mem('t0'), sample(8000, 'camp-1'), mem('t1'), sample(8000, 'camp-2'), mem('t2'),
  sample(8000, 'camp-3'), mem('t3'), sample(8000, 'camp-4'), mem('t4'), sample(8000, 'camp-5'), mem('t5'),
  shot('certD2-decay-camp-frame'),
];
// B: room 1, enemies killed off immediately, 5 identical 8 s samples on an empty arena.
files['certD2-decay-room'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',1);return {room:r&&r.room,mode:r&&r.mode}`)),
  { type: 'mousemove', x: 800, y: 320 },
  waitFor(`E.state().enemies.length>=1`, 40000, `,enemies:E.state().enemies.length`),
  mem('r0'), sample(8000, 'room-1'), mem('r1'), sample(8000, 'room-2'), mem('r2'),
  sample(8000, 'room-3'), mem('r3'), sample(8000, 'room-4'), mem('r4'), sample(8000, 'room-5'), mem('r5'),
  ev(iife(`const s=E.state();return {enemies:s.enemies.length,ui:E.runUi().screen,room:s.room}`)),
  shot('certD2-decay-room-frame'),
];
for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
