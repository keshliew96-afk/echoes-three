// certD1 generator, part D — room recon (which seed-999 room has the biggest waves) + re-run helpers.
import { writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = (name, acts) => { writeFileSync(join(root, 'tools/actions', `${name}.json`), JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); };
const ev = (code) => ({ type: 'eval', code });
const iife = (body) => `(()=>{const E=window.__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=window.__echoes;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
out('certD1-recon-rooms', [
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,bootSeed:E.bootSeed,modes:r&&r.frame&&r.frame.modes,frame:r&&r.frame,room:r&&r.room}`)),
  ev(aiife(`const rows=[];for(const n of [1,2,3,4,5,6,8]){const r=E.cmd('skipToRoom',n);await sl(400);const s=E.state();const rs=E.cmd('runState');rows.push({n,room:rs.room,phase:rs.phase,mode:s.room&&s.room.mode,waveSizes:s.room&&s.room.waveSizes,wavesTotal:s.room&&s.room.wavesTotal,pending:s.room&&s.room.pendingSpawns,alive:s.enemies.length,ents:E.entityCount,defendTicks:s.room&&s.room.defendTicksLeft,boss:rs.boss&&{hp:rs.boss.hp,max:rs.boss.maxHp}});}return rows`)),
]);
