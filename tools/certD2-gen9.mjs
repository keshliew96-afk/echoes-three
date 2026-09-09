// certD2 batch 9 — diagnostic for the single ~210-218 ms boss-room stall.
// Records renderer.info (programs / geometries / textures) and sim counts EVERY frame,
// then reports the 6 frames around any gap > 100 ms so a shader compile or GPU upload shows up.
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, GPU, sample, arm, evdump } from './certD2-gen.mjs';
const files = {};
const calib = [GPU, ev(iife(`return {ver:E.version,scene:E.state().scene}`)), sample(5000, 'CALIB-camp-idle')];
const diag = (ms, tag) => ev(`(async()=>{const E=__echoes;
let R=null;for(const k of Object.keys(window)){try{const o=window[k];if(o&&o.info&&o.info.memory&&o.info.render){R=o;break;}}catch(e){}}
try{if(!R&&E.renderer&&E.renderer.info)R=E.renderer;}catch(e){}
const D={f:[],timerMax:0,lt:[]};window.__D=D;
let tlast=performance.now();
const ti=setInterval(()=>{const n=performance.now();const g=n-tlast;if(g>D.timerMax)D.timerMax=g;tlast=n;},4);
let po=null;try{po=new PerformanceObserver(l=>{for(const e of l.getEntries())D.lt.push([Math.round(e.startTime),Math.round(e.duration)]);});po.observe({entryTypes:['longtask']});}catch(e){}
const t0=performance.now();let prev=t0;
const loop=()=>{const n=performance.now();
 const i=R?R.info:null;const s=E.state();
 D.f.push([+(n-t0).toFixed(1),+(n-prev).toFixed(2),E.tick,
   i?i.programs.length:-1,i?i.memory.geometries:-1,i?i.memory.textures:-1,i?i.render.calls:-1,i?i.render.triangles:-1,
   s.enemies.length,s.vfx.arena?s.vfx.arena.particles:-1,s.vfx.arena?s.vfx.arena.decals:-1,s.vfx.arena?s.vfx.arena.numerals:-1]);
 prev=n;if(n-t0<${ms})requestAnimationFrame(loop);};
requestAnimationFrame(()=>{prev=performance.now();requestAnimationFrame(loop);});
await new Promise(r=>setTimeout(r,${ms + 500}));
clearInterval(ti);clearInterval(si=0);if(po)po.disconnect();
const f=D.f.slice(1);
const cols=['ms','dt','tick','programs','geometries','textures','calls','tris','enemies','particles','decals','numerals'];
const idx=[];f.forEach((x,i)=>{if(x[1]>100)idx.push(i);});
const ctx=idx.map(i=>({gapMs:f[i][1],atMs:Math.round(f[i][0]),window:f.slice(Math.max(0,i-3),i+4)}));
const stat=(a)=>{const s=[...a].sort((x,y)=>x-y);const m=a.reduce((x,y)=>x+y,0)/a.length;return {n:a.length,fps:+(1000/m).toFixed(1),p95:+s[Math.floor(s.length*0.95)].toFixed(2),max:+s[s.length-1].toFixed(2)};};
return {tag:${JSON.stringify(tag)},cols,ALL:stat(f.map(x=>x[1])),STEADY:stat(f.filter(x=>x[0]>=3000).map(x=>x[1])),
 gapCount:idx.length,gaps:ctx,first:f[0],last:f[f.length-1],timerMaxGapMs:+D.timerMax.toFixed(1),longTasks:D.lt.slice(0,20)};
})()`);
files['certD2-c-boss-diag'] = [
  ...calib, arm,
  ev(iife(`E.cmd('startRun');E.cmd('skipToRoom',8);return 'boss'`)),
  { type: 'mousemove', x: 800, y: 320 }, { type: 'mousedown', button: 'right' },
  diag(25000, 'boss-diag'),
  { type: 'mouseup', button: 'right' },
  evdump, shot('certD2-c-boss-diag-frame'),
];
for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
