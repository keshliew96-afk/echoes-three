// certD2 batch 12 — D7 v3: instrument the live WebGL context so GPU-object churn
// (buffers / textures / programs / VAOs created vs deleted) is measurable even though
// v0.4.43 exposes no three.js renderer handle.
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, arm } from './certD2-gen.mjs';
const files = {};
const PATCH = ev(`(()=>{
const C={};window.__gl={C};
const protos=[];
if(window.WebGL2RenderingContext)protos.push(WebGL2RenderingContext.prototype);
if(window.WebGLRenderingContext)protos.push(WebGLRenderingContext.prototype);
const pairs=[['createBuffer','deleteBuffer'],['createTexture','deleteTexture'],['createProgram','deleteProgram'],
 ['createShader','deleteShader'],['createVertexArray','deleteVertexArray'],['createFramebuffer','deleteFramebuffer'],
 ['createRenderbuffer','deleteRenderbuffer']];
for(const p of protos)for(const [mk,dl] of pairs){
 for(const fn of [mk,dl]){ if(typeof p[fn]!=='function'||p[fn].__patched)continue;
  const orig=p[fn];const key=fn;C[key]=C[key]||0;
  const wrapped=function(){C[key]=(C[key]||0)+1;return orig.apply(this,arguments);};
  wrapped.__patched=true;try{p[fn]=wrapped;}catch(e){}}}
const c=document.querySelector('canvas');
return {patched:Object.keys(C),protos:protos.length,canvas:!!c};})()`);
const GLSNAP = (tag) => ev(`(()=>{const E=__echoes;const C=window.__gl.C;const p=performance.memory||{};
const live=(a,b)=>(C[a]||0)-(C[b]||0);
return {tag:${JSON.stringify(tag)},tick:E.tick,scene:E.state().scene,ents:E.entityCount,counters:Object.assign({},C),
 live:{buffers:live('createBuffer','deleteBuffer'),textures:live('createTexture','deleteTexture'),
  programs:live('createProgram','deleteProgram'),shaders:live('createShader','deleteShader'),
  vaos:live('createVertexArray','deleteVertexArray'),fbos:live('createFramebuffer','deleteFramebuffer')},
 heapMB:p.usedJSHeapSize?+(p.usedJSHeapSize/1048576).toFixed(1):null};})()`);
const REALRUN = (label) => ev(`(async()=>{const E=__echoes;const log=[];const t0=performance.now();
const sleep=m=>new Promise(r=>setTimeout(r,m));
E.cmd('startRun');let guard=0,waves=0,rigs=0;
while(performance.now()-t0<110000&&guard++<600){
 const u=E.runUi();const rs=E.cmd('runState');
 if(u.screen==='draft'||u.screen==='reward'){E.cmd('draftTake',0);await sleep(200);continue;}
 if(u.screen==='path'){E.cmd('pathChoose',0);await sleep(200);continue;}
 if(u.screen==='shop'){E.cmd('shopAdvance');await sleep(300);continue;}
 if(u.screen==='victory'||u.screen==='defeat'||u.screen==='summary'){log.push([u.screen,E.tick]);break;}
 if(!rs||!rs.active){log.push(['inactive',E.tick]);break;}
 if(rs.room>=8){if(rs.boss){const t1=performance.now();while(performance.now()-t1<9000&&E.state().enemies.length<3)await sleep(120);
   rigs+=E.state().enemies.length;E.cmd('killAllEnemies');await sleep(300);E.cmd('killBoss');await sleep(600);}else await sleep(200);
  if(E.state().enemies.length)E.cmd('killAllEnemies');await sleep(250);continue;}
 const t1=performance.now();while(performance.now()-t1<7000&&E.state().enemies.length===0){if(E.runUi().screen!=='none')break;await sleep(100);}
 const n=E.state().enemies.length;
 if(n>0){rigs+=n;E.cmd('killAllEnemies');waves++;await sleep(220);continue;}
 const st=E.state().room;
 if(st&&!st.cleared){E.cmd('clearRoom');await sleep(300);continue;}
 await sleep(150);}
return {label:${JSON.stringify(label)},ms:Math.round(performance.now()-t0),tick:E.tick,waves,rigs};})()`);
const TOCAMP = ev(`(async()=>{const E=__echoes;const s=m=>new Promise(r=>setTimeout(r,m));
for(let i=0;i<40;i++){if(E.state().scene==='camp')return {scene:'camp',tick:E.tick};try{E.cmd('returnToCamp');}catch(e){}await s(300);}
return {scene:E.state().scene,failed:true};})()`);
files['certD2-leak3'] = [
  PATCH, wait(2500), GLSNAP('baseline-camp'),
  REALRUN('run1'), TOCAMP, wait(3000), GLSNAP('after-run1'),
  REALRUN('run2'), TOCAMP, wait(3000), GLSNAP('after-run2'),
  REALRUN('run3'), TOCAMP, wait(3000), GLSNAP('after-run3'),
  wait(10000), GLSNAP('after-run3-plus10s'),
  shot('certD2-leak3-camp'),
];
for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
