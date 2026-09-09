// certD1 generator, part C — hitch diagnostics. The boss probe reproduced two >100 ms gaps at the same
// sim ticks on two runs (t961/962 and t1545/1549, seed 999), so they are deterministic. This probe samples
// per-frame heap + renderer.info (if a WebGLRenderer is reachable through window.__arenaProbe) + Long Tasks,
// and on every gap >100 ms dumps the sim event ring buffer around that tick.
import { writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = (name, acts) => { writeFileSync(join(root, 'tools/actions', `${name}.json`), JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); };
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=window.__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=window.__echoes;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(aiife(`const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await sl(8);}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}`));

const LIB = iife(`window.__G=window.__G||{};const G=window.__G;
G.findRenderer=()=>{const seen=new Set();const q=[];const push=(o,p)=>{if(o&&typeof o==='object'&&!seen.has(o)){seen.add(o);q.push([o,p]);}};push(window.__arenaProbe,'__arenaProbe');push(window.__echoes,'__echoes');let n=0;while(q.length&&n<4000){const [o,p]=q.shift();n++;if(o.info&&o.info.render&&o.info.memory&&typeof o.render==='function')return {r:o,path:p};if(p.split('.').length>5)continue;let keys=[];try{keys=Object.keys(o);}catch(e){}for(const k of keys){let v;try{v=o[k];}catch(e){continue;}if(v&&typeof v==='object')push(v,p+'.'+k);}}return null;};
const fr=G.findRenderer();G.renderer=fr?fr.r:null;G.rendererPath=fr?fr.path:null;
G.info=()=>{const r=G.renderer;if(!r)return null;const i=r.info;return {programs:i.programs?i.programs.length:null,geometries:i.memory.geometries,textures:i.memory.textures,calls:i.render.calls,triangles:i.render.triangles};};
G.longTasks=[];try{G.po=new PerformanceObserver((l)=>{for(const e of l.getEntries())G.longTasks.push({start:+e.startTime.toFixed(0),dur:+e.duration.toFixed(1),name:e.name,attr:(e.attribution||[]).map(a=>a.containerType+':'+a.containerName+':'+a.containerSrc).join('|')});});G.po.observe({entryTypes:['longtask']});}catch(e){G.poErr=String(e);}
G.diag=async(ms)=>{const fr=[];const gaps=[];let last=null;const t0=performance.now();const tick0=E.tick;let prevHeap=performance.memory?performance.memory.usedJSHeapSize:0;let prevInfo=G.info();const per=[];let nextSec=t0;const lt0=G.longTasks.length;await new Promise(res=>{const f=(now)=>{const heap=performance.memory?performance.memory.usedJSHeapSize:0;const info=G.info();if(last!==null){const dt=now-last;fr.push(+dt.toFixed(1));if(dt>100){const ring=(E.events||[]).filter(e=>e.tick>=E.tick-40).map(e=>e.tick+':'+e.type+(e.kind?'/'+e.kind:'')+(e.etype?'/'+e.etype:'')+(e.id!==undefined?'#'+e.id:''));gaps.push({ms:+(now-t0).toFixed(0),dt:+dt.toFixed(1),tick:E.tick,ents:E.entityCount,heapBeforeMB:+(prevHeap/1048576).toFixed(1),heapAfterMB:+(heap/1048576).toFixed(1),infoBefore:prevInfo,infoAfter:info,ring});}}last=now;prevHeap=heap;prevInfo=info;if(now>=nextSec){per.push({s:per.length,tick:E.tick,fps:+E.fps.toFixed(1),ents:E.entityCount,heapMB:+(heap/1048576).toFixed(1),info});nextSec+=1000;}if(now-t0>=ms)res();else requestAnimationFrame(f);};requestAnimationFrame(f);});const sorted=[...fr].sort((a,b)=>a-b);const steady=fr.slice(Math.min(fr.length,Math.round(fr.length*3000/ms)));return {tick0,tick1:E.tick,frames:fr.length,meanFps:+(1000*fr.length/(performance.now()-t0)).toFixed(1),p95:sorted[Math.floor(0.95*sorted.length)],max:Math.max(...fr),gt100:fr.filter(d=>d>100).length,gaps,longTasks:G.longTasks.slice(lt0),rendererPath:G.rendererPath,per};};
return {lib:'G',rendererPath:G.rendererPath,info:G.info(),poErr:G.poErr||null};`);

// boss diagnostic: identical drive to certD1-boss (startRun, skipToRoom 8, RMB held, wait first adds, 20 s)
out('certD1-boss-diag', [ev(LIB),
  ev(iife(`window.__gev=[];for(const t of ['boss_adds','boss_quake_start','boss_quake_resolve','boss_trample','boss_death','death','enemy_despawn','enemy_spawn','spawn_telegraph','room_cleared','downed','revive','zone_spawn','azone_spawn','skill_cast','ally_cast','hitstop','screenshake','flash'])E.on(t,e=>window.__gev.push([t,e.tick]));E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 300 }, { type: 'mousedown', button: 'right' },
  waitFor(`window.__gev.some(e=>e[0]==='boss_adds')`, 40000),
  ev(aiife(`const r=await window.__G.diag(20000);r.eventsNearGaps=r.gaps.map(g=>window.__gev.filter(e=>Math.abs(e[1]-g.tick)<=45).map(e=>e[0]+'@'+e[1]));return r`)),
  { type: 'mouseup', button: 'right' },
]);

// room-clear transition diagnostic: room 1, kill waves with the diag sampler running through the reward screen
out('certD1-clear-diag', [ev(LIB),
  ev(iife(`window.__gev=[];for(const t of ['room_cleared','reward','draft','wave_start','enemy_spawn','death','enemy_despawn','director_stop'])E.on(t,e=>window.__gev.push([t,e.tick]));const r=E.cmd('startRun');return {seed:E.seed,room:r&&r.room,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 380 },
  waitFor(`E.state().enemies.length>=3`, 30000),
  ev(aiife(`const killer=setInterval(()=>{const s=E.state();if(E.runUi().screen==='none'&&s.enemies.length>0)E.cmd('killAllEnemies');},400);const r=await window.__G.diag(14000);clearInterval(killer);r.eventsNearGaps=r.gaps.map(g=>window.__gev.filter(e=>Math.abs(e[1]-g.tick)<=45).map(e=>e[0]+'@'+e[1]));r.screen=E.runUi().screen;r.phase=E.cmd('runState').phase;return r`)),
]);
