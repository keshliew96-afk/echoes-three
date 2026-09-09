#!/usr/bin/env node
// Shop-room ambience proof: skip to room 7 and hold, so a 6-frame sequence can
// show the arena still breathing behind the shelf (fireflies/motes drifting,
// torch + stall-lantern flicker) while the shop page is open.
import { writeFileSync } from 'fs';
writeFileSync('tools/actions/certfixAworld2-shopseq.json', JSON.stringify([
  { type: 'eval', code: "(()=>{const E=window.__echoes;E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {tag:'skip7',room:r&&r.room,phase:r&&r.phase}})()" },
  { type: 'wait', ms: 2000 },
  { type: 'eval', code: "(()=>{const E=window.__echoes;const s=E.state();return {tag:'shopseq-state',screen:E.runUi().screen,version:E.version,vfx:s.vfx&&s.vfx.arena&&{emitters:s.vfx.arena.emitters,embers:s.vfx.arena.embers,mote0:s.vfx.arena.mote0,propTypes:s.vfx.arena.propTypes}}})()" },
], null, 1));
console.log('wrote tools/actions/certfixAworld2-shopseq.json');
