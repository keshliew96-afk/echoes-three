// certD1 generator, part F — isolate the reproducible boss-room stall: it lands ~18 ticks after an ally is Downed
// (t2536/2537 downed -> t2555 gap, 3 runs). Force a Downed ally in room 1 with cmd('setHp', id, 0) while the diag
// sampler runs, plus a 2 ms setInterval drift tracker that separates a blocked main thread (timer stalls too) from a
// starved rAF (timer keeps firing => compositor / GPU-process stall).
import { readFileSync, writeFileSync } from 'fs';
const LIB = JSON.parse(readFileSync('tools/actions/certD1-boss-diag.json', 'utf8'))[0];
const ev = (code) => ({ type: 'eval', code });
const iife = (body) => `(()=>{const E=window.__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=window.__echoes;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(aiife(`const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await sl(8);}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}`));
const acts = [LIB,
  ev(iife(`window.__gev=[];for(const t of ['downed','revive','revive_break','death','hitstop','flash','screenshake','enemy_spawn','wave_start','room_cleared'])E.on(t,e=>window.__gev.push([t,e.tick,e.id]));const r=E.cmd('startRun');return {seed:E.seed,room:r&&r.room,tick:E.tick,party:E.state().party.map(p=>[p.id,p.classId,p.hp,p.downed])}`)),
  { type: 'mousemove', x: 800, y: 380 }, { type: 'mousedown', button: 'right' },
  waitFor(`E.state().enemies.length>=3`, 30000),
  ev(aiife(`const drift=[];let lt=performance.now();const iv=setInterval(()=>{const n=performance.now();const d=n-lt;if(d>20)drift.push([+(n).toFixed(0),+d.toFixed(1)]);lt=n;},2);const T0=performance.now();const acts=[];const p=window.__G.diag(14000);(async()=>{await sl(4000);const pre=E.hud.portraits().map(q=>q.state||q.status||JSON.stringify(q).slice(0,40));const r=E.cmd('setHp',2,0);acts.push({at:+(performance.now()-T0).toFixed(0),tick:E.tick,cmd:'setHp 2 0',r,pre});await sl(4500);const r2=E.cmd('setHp',3,0);acts.push({at:+(performance.now()-T0).toFixed(0),tick:E.tick,cmd:'setHp 3 0',r:r2});})();const d=await p;clearInterval(iv);d.acts=acts;d.driftAbs=drift.map(x=>[+(x[0]-T0).toFixed(0),x[1]]);d.gapTimer=d.gaps.map(g=>({gapMs:g.ms,dt:g.dt,timerStallsInWindow:d.driftAbs.filter(x=>x[0]>=g.ms-g.dt-5&&x[0]<=g.ms+5)}));d.gev=window.__gev.filter(e=>e[0]!=='enemy_spawn');d.eventsNearGaps=d.gaps.map(g=>window.__gev.filter(e=>Math.abs(e[1]-g.tick)<=45).map(e=>e[0]+'@'+e[1]));d.portraits=E.hud.portraits().map(q=>q.state||q.status||null);d.party=E.state().party.map(p=>[p.id,p.hp,p.downed]);return d`)),
  { type: 'mouseup', button: 'right' },
];
writeFileSync('tools/actions/certD1-downed-diag.json', JSON.stringify(acts, null, 1));
console.log('wrote certD1-downed-diag', acts.length);
