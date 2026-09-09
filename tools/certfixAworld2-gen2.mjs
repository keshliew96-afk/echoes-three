#!/usr/bin/env node
// Fast tuning loops for the A-world r2 fix pass: an Act-1 arena frame without
// the certified frame's 30-90 s telegraph poll (floor/lighting tuning only —
// every checkpoint is re-measured with the real certA2 conditions), plus a
// room-7 shop frame and a room-8 boss frame on the same short path.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });

const arena = [
  ev("(()=>{const E=window.__echoes;const r=E.cmd('startRun');return {tag:'startRun',seed:E.seed,room:r&&r.room,mode:r&&r.mode}})()"),
  { type: 'mousemove', x: 800, y: 450 },
  wait(2200),
  ev("(()=>{const E=window.__echoes;const s=E.state();return {tag:'arena',version:E.version,tick:E.tick,fps:+E.fps.toFixed(1),enemies:s.enemies.length,vfx:s.vfx&&s.vfx.arena}})()"),
];
writeFileSync('tools/actions/certfixAworld2-fastarena.json', JSON.stringify(arena, null, 1));

const shop = [
  ev("(()=>{const E=window.__echoes;E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {tag:'skip7',room:r&&r.room,phase:r&&r.phase}})()"),
  wait(2200),
  ev("(()=>{const E=window.__echoes;const s=E.state();return {tag:'shop',version:E.version,screen:E.runUi().screen,vfx:s.vfx&&s.vfx.arena}})()"),
];
writeFileSync('tools/actions/certfixAworld2-fastshop.json', JSON.stringify(shop, null, 1));

const boss = [
  ev("(()=>{const E=window.__echoes;E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {tag:'skip8',room:r&&r.room,phase:r&&r.phase}})()"),
  { type: 'mousemove', x: 800, y: 450 },
  wait(3000),
  ev("(()=>{const E=window.__echoes;const s=E.state();return {tag:'boss',version:E.version,enemies:s.enemies.length,vfx:s.vfx&&s.vfx.arena}})()"),
];
writeFileSync('tools/actions/certfixAworld2-fastboss.json', JSON.stringify(boss, null, 1));
console.log('wrote fastarena / fastshop / fastboss action files');
