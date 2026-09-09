// certD1 (4th instance) generator 2: per-enemy geometry-retention probe. Spawns/kills batches of enemies inside a
// live room and snapshots renderer.info.memory vs scene-graph unique geometries after each batch (and after the
// decal lifetime), so any monotonic renderer-side growth can be attributed per enemy. Reuses LIB from gen2's files.
import { readFileSync, writeFileSync } from 'fs';
const base = JSON.parse(readFileSync('tools/actions/certD1-n-camp-idle.json', 'utf8'));
const LIB = base[0]; const LOAD = base[1];
const ev = (code) => ({ type: 'eval', code });
const iife = (b) => `(()=>{const E=window.__echoes;${b}})()`;
const aiife = (b) => `(async()=>{const E=window.__echoes;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));${b}})()`;
const SNAP = `const snap=(tag)=>{const v=window.__D.vfx();const s=E.state();return {tag,tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,geo:v.renderer&&v.renderer.geometries,tex:v.renderer&&v.renderer.textures,prog:v.renderer&&v.renderer.programs,sgObjs:v.sceneGraph&&v.sceneGraph.objs,sgMeshes:v.sceneGraph&&v.sceneGraph.meshes,sgSprites:v.sceneGraph&&v.sceneGraph.sprites,uniqGeo:v.sceneGraph&&v.sceneGraph.uniqGeo,uniqMat:v.sceneGraph&&v.sceneGraph.uniqMat,decals:v.arena&&v.arena.decals,particles:v.arena&&v.arena.particles,numerals:v.arena&&v.arena.numerals,heap:v.heapMB};};`;
const PTS = '[[-5,-6.6],[5,-6.6],[-10.2,-3],[10.2,-3],[-10.2,3],[10.2,3],[-5,6.6],[5,6.6]]';
writeFileSync('tools/actions/certD1-q-geoleak.json', JSON.stringify([LIB, LOAD,
  ev(iife(`window.__D.arm();const r=E.cmd('startRun');return {seed:E.seed,room:r&&r.room,tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<30000){if(E.state().enemies.length>=3)break;await sl(8);}
${SNAP}const rows=[];rows.push(snap('room-live'));
// clear the natural wave first so only cmd spawns remain
E.cmd('killAllEnemies');await sl(2500);rows.push(snap('after-natural-kill'));
const P=${PTS};
for(let b=0;b<4;b++){const kind=b%2===0?'boar':'mantis';let ok=0;for(let i=0;i<10;i++){const p=P[i%8];const r=E.cmd('spawn',kind,p[0]+(i%5)*0.25,p[1]);if(r!==null&&r!==undefined)ok++;}await sl(500);rows.push(snap('batch'+b+'-'+kind+'-spawned('+ok+')'));E.cmd('killAllEnemies');await sl(2500);rows.push(snap('batch'+b+'-'+kind+'-killed'));}
await sl(22000);rows.push(snap('+22s-decals-expired'));
const ev=window.__D.ev;return {rows,phase:E.cmd('runState').phase,screen:E.runUi().screen,spawns:ev.filter(e=>e.T==='enemy_spawn').length,deaths:ev.filter(e=>e.T==='death').length,despawns:ev.filter(e=>e.T==='enemy_despawn').length,cleared:ev.filter(e=>e.T==='room_cleared').map(e=>e.tick)}`)),
], null, 1));
console.log('wrote tools/actions/certD1-q-geoleak.json');
