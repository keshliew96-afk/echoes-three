// certA3 addendum probe: enumerate the real shape of state().vfx / state() so the
// stateSummary vfx counts are reported as truth, not as "undefined".
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;

const acts = [
  ev(iife(`const s=E.state();return {where:'camp-boot',version:E.version,stateKeys:Object.keys(s),vfxKeys:Object.keys(s.vfx||{}),vfx:s.vfx,scene:s.scene}`)),
  ev(iife(`E.cmd('startRun');return 'startRun tick='+E.tick`)),
  { type: 'wait', ms: 2500 },
  ev(iife(`const s=E.state();return {where:'room1-combat',scene:s.scene,vfxKeys:Object.keys(s.vfx||{}),vfx:s.vfx,enemies:s.enemies.length,hasNumeralLayer:!!document.querySelector('#dmg-num-layer'),numeralNodes:document.querySelectorAll('#dmg-num-layer .dmg-num').length}`)),
];
writeFileSync('tools/actions/certA3-vfxkeys.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certA3-vfxkeys.json', acts.length);
