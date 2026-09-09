// certD1 leak probe, 3 runs: renderer.info.memory, scene-graph object counts, #dmg-num-layer node styles, DOM
// node count and heap at camp baseline and after each of three cmd-driven runs (same RUN/TO_CAMP drive as
// certD1-leak). Re-declares the page library so the file is self-contained.
import { readFileSync, writeFileSync } from 'fs';
const base = JSON.parse(readFileSync('tools/actions/certD1-leak.json', 'utf8'));
const LIB = base[0]; const LOAD = base[1]; const RUN = base[4]; const TO_CAMP = base.slice(5, 8);
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=window.__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=window.__echoes;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const SNAP = (tag) => ev(iife(`const T=${JSON.stringify(tag)};const s=E.state();const v=s.vfx||{};const P=window.__arenaProbe||{};const st=P.stage||{};const r=st.renderer;const info=r&&r.info?{programs:r.info.programs?r.info.programs.length:null,geometries:r.info.memory.geometries,textures:r.info.memory.textures,calls:r.info.render.calls,tris:r.info.render.triangles}:null;const walk=(root)=>{let n=0,mesh=0,pts=0,spr=0,vis=0;const geos=new Set(),mats=new Set();if(root&&root.traverse)root.traverse(o=>{n++;if(o.isMesh)mesh++;if(o.isPoints)pts++;if(o.isSprite)spr++;if(o.visible)vis++;if(o.geometry)geos.add(o.geometry.uuid);if(o.material){const m=Array.isArray(o.material)?o.material:[o.material];for(const x of m)mats.add(x.uuid);}});return {objects:n,meshes:mesh,points:pts,sprites:spr,visible:vis,uniqueGeos:geos.size,uniqueMats:mats.size};};const scenes={};for(const k of Object.keys(st)){const o=st[k];if(o&&o.isScene)scenes[k]=walk(o);}for(const k of Object.keys(P)){const o=P[k];if(o&&o.isScene)scenes['probe.'+k]=walk(o);}const nl=document.getElementById('dmg-num-layer');const nums=nl?[...nl.children].map(c=>({cls:c.className,txt:(c.textContent||'').slice(0,12),op:getComputedStyle(c).opacity,disp:getComputedStyle(c).display,vis:getComputedStyle(c).visibility}))
:null;return {tag:T,tick:E.tick,scene:s.scene,phase:s.run&&s.run.phase,ents:E.entityCount,enemies:s.enemies.length,eshots:s.eshots.length,bolts:s.skillBolts.length,zones:s.zones.length,azones:s.azones.length,vfxKeys:Object.keys(v).slice(0,60),campCounts:{emitters:v.emitters,embers:v.embers,fireflies:v.fireflies,gateMotes:v.gateMotes,propShadows:v.propShadows,runs:v.runs,bandGuardMats:v.bandGuard&&v.bandGuard.materials},arena:v.arena?{numerals:v.arena.numerals,decals:v.arena.decals,particles:v.arena.particles,dummies:v.arena.dummies,emitters:v.arena.emitters,embers:v.arena.embers,propShadows:v.arena.propShadows,grass:v.arena.grass}:null,renderer:info,stageKeys:Object.keys(st).slice(0,40),probeKeys:Object.keys(P).slice(0,40),scenes,numeralNodes:nl?nl.children.length:null,numerals:nums,threatNodes:document.querySelectorAll('#hud-threat *').length,fizzleNodes:document.querySelectorAll('#nd-fizzle-layer *').length,domNodes:document.getElementsByTagName('*').length,heapMB:performance.memory?+(performance.memory.usedJSHeapSize/1048576).toFixed(1):null};`));
const acts = [LIB, LOAD, wait(1500), SNAP('baseline'),
  RUN, ...TO_CAMP, SNAP('after-run-1'),
  RUN, ...TO_CAMP, SNAP('after-run-2'),
  RUN, ...TO_CAMP, SNAP('after-run-3'),
  wait(8000), SNAP('after-run-3+8s'),
];
writeFileSync('tools/actions/certD1-leak3.json', JSON.stringify(acts, null, 1));
console.log('wrote certD1-leak3', acts.length);
