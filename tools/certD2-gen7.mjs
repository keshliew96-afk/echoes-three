// certD2 batch 7 — D7 leak proxy: camp baseline -> 2 full cmd-driven runs -> camp.
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, arm, evdump } from './certD2-gen.mjs';
const files = {};

const findRenderer = ev(`(()=>{const seen=[];for(const k of Object.keys(window)){try{const v=window[k];if(v&&v.info&&v.info.memory&&v.info.render)seen.push(k);}catch(e){}}
const E=__echoes;let via=null;try{if(E.renderer&&E.renderer.info)via='__echoes.renderer';}catch(e){}
return {globals:seen,via,keys:Object.keys(E)};})()`);

const SNAP = (tag) => ev(`(()=>{const E=__echoes;const s=E.state();const v=s.vfx;const a=v.arena||v;
let R=null;for(const k of Object.keys(window)){try{const o=window[k];if(o&&o.info&&o.info.memory&&o.info.render){R=o;break;}}catch(e){}}
try{if(!R&&E.renderer&&E.renderer.info)R=E.renderer;}catch(e){}
const p=performance.memory||{};
return {tag:${JSON.stringify(tag)},tick:E.tick,scene:s.scene,ents:E.entityCount,
 sim:{enemies:s.enemies.length,eshots:s.eshots.length,bolts:s.skillBolts.length,zones:s.zones.length,azones:s.azones.length},
 campVfx:{fireflies:v.fireflies,embers:v.embers,gateMotes:v.gateMotes,grass:v.grass,emitters:v.emitters,propShadows:v.propShadows,propTypes:v.propTypes,flowers:v.flowers},
 arenaVfx:{numerals:a.numerals,decals:a.decals,scorch:a.scorch,particles:a.particles,dummies:a.dummies,shakes:a.shakes,grass:a.grass,emitters:a.emitters,embers:a.embers,propShadows:a.propShadows},
 dom:{nodes:document.getElementsByTagName('*').length,numerals:document.querySelectorAll('.dmg,.numeral,[class*=numeral]').length,threat:document.querySelectorAll('[class*=threat]').length},
 heapMB:p.usedJSHeapSize?+(p.usedJSHeapSize/1048576).toFixed(1):null,
 renderer:R?{programs:R.info.programs?R.info.programs.length:null,geometries:R.info.memory.geometries,textures:R.info.memory.textures,calls:R.info.render.calls,triangles:R.info.render.triangles}:null};})()`);

// one full run driven entirely by cmd; returns a step log
const FULLRUN = (label) => ev(`(async()=>{const E=__echoes;const log=[];const t0=performance.now();
E.cmd('startRun');log.push(['startRun',E.tick]);
const sleep=(m)=>new Promise(r=>setTimeout(r,m));
let guard=0;
while(performance.now()-t0<70000&&guard++<400){
  const u=E.runUi();const rs=E.cmd('runState');
  if(u.screen==='draft'||u.screen==='reward'){E.cmd('draftTake',0);log.push(['draftTake',E.tick]);await sleep(180);continue;}
  if(u.screen==='path'){E.cmd('pathChoose',0);log.push(['pathChoose',E.tick]);await sleep(180);continue;}
  if(u.screen==='shop'){E.cmd('shopAdvance');log.push(['shopAdvance',E.tick]);await sleep(250);continue;}
  if(u.screen==='victory'||u.screen==='defeat'||u.screen==='summary'){log.push([u.screen,E.tick]);break;}
  if(!rs||!rs.active){log.push(['inactive',E.tick]);break;}
  if(rs.room>=8){const b=rs.boss;if(b){const k=E.cmd('killBoss');log.push(['killBoss',E.tick,JSON.stringify(k).slice(0,60)]);await sleep(400);}
    else {await sleep(200);} 
    if(E.state().enemies.length)E.cmd('killAllEnemies');
    await sleep(250);continue;}
  if(rs.room===7){E.cmd('shopAdvance');await sleep(250);continue;}
  if(E.state().enemies.length>0){E.cmd('killAllEnemies');await sleep(160);continue;}
  const st=E.state().room;
  if(st&&st.mode==='defend'&&!st.cleared){E.cmd('clearRoom');log.push(['clearRoom',E.tick]);await sleep(250);continue;}
  if(st&&!st.cleared){E.cmd('clearRoom');log.push(['clearRoomKA',E.tick]);await sleep(250);continue;}
  await sleep(150);}
return {label:${JSON.stringify(label)},ms:Math.round(performance.now()-t0),tick:E.tick,screen:E.runUi().screen,room:(E.cmd('runState')||{}).room,steps:log.length,log:log.slice(0,60)};})()`);

const TOCAMP = ev(`(async()=>{const E=__echoes;const sleep=(m)=>new Promise(r=>setTimeout(r,m));
for(let i=0;i<40;i++){const s=E.state();if(s.scene==='camp')return {scene:'camp',tick:E.tick,i};
 try{E.cmd('returnToCamp');}catch(e){}
 await sleep(300);}
return {scene:E.state().scene,tick:E.tick,failed:true};})()`);

files['certD2-leak'] = [
  findRenderer,
  SNAP('baseline-camp'),
  arm,
  FULLRUN('run1'), TOCAMP, wait(2500), SNAP('after-run1'),
  FULLRUN('run2'), TOCAMP, wait(2500), SNAP('after-run2'),
  wait(8000), SNAP('after-run2-plus8s'),
  evdump,
  shot('certD2-leak-camp'),
];
for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
