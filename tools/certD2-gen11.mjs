// certD2 batch 11 — D7 v2: two runs that ACTUALLY spawn and kill enemy rigs in every room,
// plus a harder hunt for the three.js renderer so geometry counts can be checked.
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, arm, evdump } from './certD2-gen.mjs';
const files = {};
const RHUNT = ev(`(()=>{const E=__echoes;const hits=[];
for(const k of Object.getOwnPropertyNames(window)){try{const o=window[k];
 if(o&&typeof o==='object'){if(o.info&&o.info.memory&&o.info.render)hits.push(['global.'+k,'renderer']);
  else if(o.domElement&&o.getContext)hits.push(['global.'+k,'hasDomElement']);
  else if(o.scene&&o.camera&&o.renderer)hits.push(['global.'+k,'appish']);}}catch(e){}}
for(const k of Object.keys(E)){try{const o=E[k];if(o&&typeof o==='object'&&o.info&&o.info.memory)hits.push(['__echoes.'+k,'renderer']);}catch(e){}}
let dev=null;try{dev=window.__THREE_DEVTOOLS__?'present':null;}catch(e){}
let st=null;try{st=JSON.stringify(E.stats).slice(0,600);}catch(e){st='ERR '+e.message}
return {hits,devtools:dev,echoesKeys:Object.keys(E),stats:st};})()`);

const SNAP = (tag) => ev(`(()=>{const E=__echoes;const s=E.state();const v=s.vfx;const a=v.arena||v;const p=performance.memory||{};
let st=null;try{st=E.stats;}catch(e){}
return {tag:${JSON.stringify(tag)},tick:E.tick,scene:s.scene,ents:E.entityCount,
 sim:{enemies:s.enemies.length,eshots:s.eshots.length,bolts:s.skillBolts.length,zones:s.zones.length,azones:s.azones.length},
 campVfx:{fireflies:v.fireflies,embers:v.embers,gateMotes:v.gateMotes,grass:v.grass,emitters:v.emitters,propShadows:v.propShadows,propTypes:v.propTypes,flowers:v.flowers,colliders:v.colliders},
 arenaVfx:{numerals:a.numerals,decals:a.decals,scorch:a.scorch,particles:a.particles,dummies:a.dummies,shakes:a.shakes,grass:a.grass,emitters:a.emitters,embers:a.embers,propShadows:a.propShadows,propTypes:a.propTypes},
 dom:{nodes:document.getElementsByTagName('*').length,svg:document.getElementsByTagName('svg').length,hudChildren:(document.querySelector('#hud')||{children:[]}).children.length,threatSvg:document.querySelectorAll('#hud-threat > svg').length,numLayer:(document.querySelector('#dmg-num-layer')||{children:[]}).children.length},
 stats:st?JSON.parse(JSON.stringify(st)):null,
 heapMB:p.usedJSHeapSize?+(p.usedJSHeapSize/1048576).toFixed(1):null,
 heapTotalMB:p.totalJSHeapSize?+(p.totalJSHeapSize/1048576).toFixed(1):null};})()`);

// A run that lets every combat room actually spawn rigs before killing them.
const REALRUN = (label) => ev(`(async()=>{const E=__echoes;const log=[];const t0=performance.now();
const sleep=m=>new Promise(r=>setTimeout(r,m));
E.cmd('startRun');log.push(['startRun',E.tick]);
let guard=0,kills=0,spawnSeen=0;
while(performance.now()-t0<110000&&guard++<600){
 const u=E.runUi();const rs=E.cmd('runState');
 if(u.screen==='draft'||u.screen==='reward'){E.cmd('draftTake',0);await sleep(200);continue;}
 if(u.screen==='path'){E.cmd('pathChoose',0);await sleep(200);continue;}
 if(u.screen==='shop'){E.cmd('shopAdvance');await sleep(300);continue;}
 if(u.screen==='victory'||u.screen==='defeat'||u.screen==='summary'){log.push([u.screen,E.tick]);break;}
 if(!rs||!rs.active){log.push(['inactive',E.tick]);break;}
 if(rs.room>=8){if(rs.boss){ // let the adds spawn first
   const t1=performance.now();while(performance.now()-t1<9000&&E.state().enemies.length<3)await sleep(120);
   log.push(['bossAdds',E.tick,E.state().enemies.length]);spawnSeen+=E.state().enemies.length;
   E.cmd('killAllEnemies');await sleep(300);E.cmd('killBoss');log.push(['killBoss',E.tick]);await sleep(600);}
  else await sleep(200);
  if(E.state().enemies.length)E.cmd('killAllEnemies');await sleep(250);continue;}
 // combat room: wait for a wave to actually spawn, then kill it
 const t1=performance.now();while(performance.now()-t1<7000&&E.state().enemies.length===0){const uu=E.runUi();if(uu.screen!=='none')break;await sleep(100);}
 const n=E.state().enemies.length;
 if(n>0){spawnSeen+=n;E.cmd('killAllEnemies');kills++;log.push(['killWave',E.tick,n]);await sleep(220);continue;}
 const st=E.state().room;
 if(st&&!st.cleared){E.cmd('clearRoom');log.push(['clearRoom',E.tick,st.mode]);await sleep(300);continue;}
 await sleep(150);}
return {label:${JSON.stringify(label)},ms:Math.round(performance.now()-t0),tick:E.tick,screen:E.runUi().screen,waves:kills,rigsSpawned:spawnSeen,steps:log.length,log:log.slice(0,50)};})()`);

const TOCAMP = ev(`(async()=>{const E=__echoes;const sleep=m=>new Promise(r=>setTimeout(r,m));
for(let i=0;i<40;i++){if(E.state().scene==='camp')return {scene:'camp',tick:E.tick,i};try{E.cmd('returnToCamp');}catch(e){}await sleep(300);}
return {scene:E.state().scene,tick:E.tick,failed:true};})()`);

files['certD2-leak2'] = [
  RHUNT, SNAP('baseline-camp'), arm,
  REALRUN('run1'), TOCAMP, wait(3000), SNAP('after-run1'),
  REALRUN('run2'), TOCAMP, wait(3000), SNAP('after-run2'),
  wait(10000), SNAP('after-run2-plus10s'),
  shot('certD2-leak2-camp'),
];
for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
