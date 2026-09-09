// certD2 — Performance & Chrome certification round 2. Action-file generator.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 60000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<${timeout}){try{if(${cond})return {ok:true,tick:E.tick,ms:Math.round(performance.now()-t0)${extra}};}catch(e){}await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,ms:Math.round(performance.now()-t0)${extra}}})()`);

const GPU = ev(`(()=>{const c=document.querySelector('canvas');const gl=c&&(c.getContext('webgl2')||c.getContext('webgl'));let r='none',v='none',ver='none';if(gl){const d=gl.getExtension('WEBGL_debug_renderer_info');if(d){r=gl.getParameter(d.UNMASKED_RENDERER_WEBGL);v=gl.getParameter(d.UNMASKED_VENDOR_WEBGL);}ver=gl.getParameter(gl.VERSION);}return {renderer:r,vendor:v,glVersion:ver,canvas:c?[c.width,c.height]:null,dpr:devicePixelRatio,cores:navigator.hardwareConcurrency};})()`);

// rAF sampler: records every frame delta + 4ms timer starvation + longtasks + per-second sim state.
const sample = (ms, tag) => ev(`(async()=>{const E=__echoes;
const D={f:[],sec:[],timerMax:0,lt:[]};window.__D=D;
let tlast=performance.now();
const ti=setInterval(()=>{const n=performance.now();const g=n-tlast;if(g>D.timerMax)D.timerMax=g;tlast=n;},4);
let po=null;try{po=new PerformanceObserver(l=>{for(const e of l.getEntries())D.lt.push([Math.round(e.startTime),Math.round(e.duration)]);});po.observe({entryTypes:['longtask']});}catch(e){}
const t0=performance.now();D.t0=t0;
const si=setInterval(()=>{try{const s=E.state();D.sec.push([Math.round(performance.now()-t0),E.fps,E.entityCount,s.enemies.length,E.tick,(s.run&&s.run.boss&&s.run.boss.hp)||0]);}catch(e){}},1000);
let prev=performance.now();
const loop=()=>{const n=performance.now();D.f.push([+(n-t0).toFixed(1),+(n-prev).toFixed(2),E.tick]);prev=n;if(n-t0<${ms})requestAnimationFrame(loop);};
requestAnimationFrame(()=>{prev=performance.now();requestAnimationFrame(loop);});
await new Promise(r=>setTimeout(r,${ms + 500}));
clearInterval(ti);clearInterval(si);if(po)po.disconnect();
const f=D.f.slice(1);
const stat=(a)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);const m=a.reduce((x,y)=>x+y,0)/a.length;return {n:a.length,meanMs:+m.toFixed(2),fps:+(1000/m).toFixed(1),p50:+s[Math.floor(s.length*0.5)].toFixed(2),p95:+s[Math.floor(s.length*0.95)].toFixed(2),p99:+s[Math.floor(s.length*0.99)].toFixed(2),max:+s[s.length-1].toFixed(2)};};
const warm=f.filter(x=>x[0]<3000),steady=f.filter(x=>x[0]>=3000);
const gaps=steady.filter(x=>x[1]>100).map(x=>[Math.round(x[0]),+x[1].toFixed(1),x[2]]);
const wins=[];const endT=f.length?f[f.length-1][0]:0;
for(let w=3000;w+15000<=endT+300;w+=1000){const seg=f.filter(x=>x[0]>=w&&x[0]<w+15000);if(seg.length<10)continue;const g=seg.filter(x=>x[1]>100).length;const mx=Math.max(...seg.map(x=>x[1]));const mn=seg.reduce((a,b)=>a+b[1],0)/seg.length;wins.push([w/1000,g,+mx.toFixed(1),+(1000/mn).toFixed(1)]);}
return {tag:${JSON.stringify(tag)},sampleMs:Math.round(endT),ALL:stat(f.map(x=>x[1])),WARM:stat(warm.map(x=>x[1])),STEADY:stat(steady.map(x=>x[1])),steadyGapsOver100:gaps,gapsOver250:gaps.filter(g=>g[1]>250).length,worstWindowGaps:wins.length?Math.max(...wins.map(w=>w[1])):0,windows15s:wins,perSec:D.sec,timerMaxGapMs:+D.timerMax.toFixed(1),longTasks:D.lt.slice(0,25)};
})()`);

const ALLT=['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','death','boss_spawn','boss_quake_start','boss_quake_resolve','boss_trample','boss_adds','boss_death','downed','revive','run_end','victory','defeat','return_to_camp'];
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(ALLT)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed t'+E.tick`));
const evdump = ev(iife(`return JSON.stringify(window.__c.ev.map(e=>[e.tick,e.T,e.pct!==undefined?e.pct:(e.wave!==undefined?e.wave:(e.count!==undefined?e.count:''))]))`));

const files = {};

// ---- recon: room frame for seed 999, gpu identity, camp vfx baseline ----
files['certD2-recon'] = [
  GPU,
  ev(iife(`return {ver:E.version,tick:E.tick,fps:E.fps,ents:E.entityCount,seed:E.seed,bootSeed:E.bootSeed,scene:E.state().scene}`)),
  arm,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,room:r&&r.room,frame:JSON.stringify(r&&r.frame).slice(0,1500)}`)),
  ev(iife(`const r=E.cmd('runState');return JSON.stringify(r).slice(0,2500)`)),
  ev(iife(`const s=E.state();return {vfx:s.vfx,toggles:s.toggles}`)),
];
for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
export { ev, wait, shot, iife, waitFor, GPU, sample, arm, evdump, ALLT };
