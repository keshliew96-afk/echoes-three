import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const acts = [
  ev(iife(`window.__c={ev:[]};for(const t of ['telegraph_start','telegraph_resolve','enemy_spawn','wave_start'])E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<40000){if(E.state().enemies.length>=2)return {ok:true,tick:E.tick};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick}})()`),
  ev(iife(`E.cmd('iframe',0,60000);E.cmd('killAllEnemies');return {tick:E.tick,enemies:E.state().enemies.length}`)),
  wait(400),
  ev(iife(`const s=E.state();const evs=window.__c.ev;return {beforeShot:{tick:E.tick,enemies:s.enemies.length,eshots:s.eshots.length,azones:s.azones.length,liveTele:evs.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).length,ui:E.runUi().screen}}`)),
  { type: 'shot', name: 'certC3-clean-between' },
  ev(iife(`const s=E.state();const evs=window.__c.ev;return {afterShot:{tick:E.tick,enemies:s.enemies.length,eshots:s.eshots.length,liveTele:evs.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).length,ui:E.runUi().screen}}`)),
];
writeFileSync('tools/actions/certC3-between.json', JSON.stringify(acts, null, 1));
console.log('wrote certC3-between', acts.length);
