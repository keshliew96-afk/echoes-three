// certC2 batch 3: guaranteed-clean frame (no run, no enemies, no telegraph) and
// a second room-clearing-kill run on a different seed.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const aiife = (b) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${b}})()`;
const files = {};

files['certC2-clean-arena'] = [
  ev(iife(`window.__c={ev:[]};for(const t of ['telegraph_start','telegraph_resolve','enemy_spawn'])E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed t'+E.tick+' ver '+E.version`)),
  { type: 'mousemove', x: 800, y: 450 }, wait(1200),
  ev(iife(`const s=E.state();return {tick:E.tick,ver:E.version,scene:s.scene,runActive:s.run.active,enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,teleEvents:window.__c.ev.length,ui:E.runUi().screen,party:s.party.map(p=>[p.classId||'healer',p.hp])}`)),
  { type: 'shot', name: 'certC2-clean-arena' },
  ev(iife(`const s=E.state();return {afterShotTick:E.tick,enemies:s.enemies.length,teleLive:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).length,teleEvents:window.__c.ev.length}`)),
];

// killAllEnemies + clearRoom so no wave can respawn during the ~50-tick shot.
files['certC2-clean-cleared'] = [
  ev(iife(`window.__c={ev:[]};for(const t of ['telegraph_start','enemy_spawn','room_cleared'])E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));E.cmd('startRun');return 'armed t'+E.tick+' ver '+E.version`)),
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<40000){const s=E.state();if(s.run.active&&s.run.combatActive&&s.enemies.length>0)return {ok:true,tick:E.tick,enemies:s.enemies.length};await sleep(20);}return {ok:false,tick:E.tick}`)),
  wait(1500),
  ev(iife(`E.cmd('iframe',0,3600);E.cmd('killAllEnemies');E.cmd('clearRoom');window.__c.k=E.tick;return {tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<6000){const s=E.state();if(s.enemies.length===0&&s.eshots.length===0)return {ok:true,tick:E.tick,enemies:0,ui:E.runUi().screen};await sleep(8);}return {ok:false,tick:E.tick,enemies:E.state().enemies.length}`)),
  ev(iife(`const s=E.state();return {preShotTick:E.tick,enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,teleLive:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).length,ui:E.runUi().screen,phase:s.run.phase}`)),
  { type: 'shot', name: 'certC2-clean-cleared' },
  ev(iife(`const s=E.state();return {afterShotTick:E.tick,enemies:s.enemies.length,eshots:s.eshots.length,teleLive:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).length,spawnsSinceClear:window.__c.ev.filter(e=>e.T==='enemy_spawn'&&e.tick>=window.__c.k).length,ui:E.runUi().screen}`)),
];

for (const [n, a] of Object.entries(files)) { writeFileSync(`tools/actions/${n}.json`, JSON.stringify(a, null, 1)); console.log('wrote', n, a.length); }
