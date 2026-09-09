// certD2 batch 8 — boss sampled from boss_spawn so the FIRST add wave's stall gets a timestamp.
// Sampler variant reports EVERY gap >100 ms (warm ones flagged) with the sim event ring around it.
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, GPU, sample, arm, evdump } from './certD2-gen.mjs';
const files = {};
const sample2 = (ms, tag) => ev(`(async()=>{const E=__echoes;
const D={f:[],sec:[],timerMax:0,lt:[]};window.__D=D;
let tlast=performance.now();
const ti=setInterval(()=>{const n=performance.now();const g=n-tlast;if(g>D.timerMax)D.timerMax=g;tlast=n;},4);
let po=null;try{po=new PerformanceObserver(l=>{for(const e of l.getEntries())D.lt.push([Math.round(e.startTime),Math.round(e.duration)]);});po.observe({entryTypes:['longtask']});}catch(e){}
const t0=performance.now();
const si=setInterval(()=>{try{const s=E.state();const b=(E.cmd('runState')||{}).boss;D.sec.push([Math.round(performance.now()-t0),E.fps,E.entityCount,s.enemies.length,E.tick,b?b.hp:0]);}catch(e){}},1000);
let prev=performance.now();
const loop=()=>{const n=performance.now();D.f.push([+(n-t0).toFixed(1),+(n-prev).toFixed(2),E.tick]);prev=n;if(n-t0<${ms})requestAnimationFrame(loop);};
requestAnimationFrame(()=>{prev=performance.now();requestAnimationFrame(loop);});
await new Promise(r=>setTimeout(r,${ms + 500}));
clearInterval(ti);clearInterval(si);if(po)po.disconnect();
const f=D.f.slice(1);
const stat=(a)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);const m=a.reduce((x,y)=>x+y,0)/a.length;return {n:a.length,meanMs:+m.toFixed(2),fps:+(1000/m).toFixed(1),p50:+s[Math.floor(s.length*0.5)].toFixed(2),p95:+s[Math.floor(s.length*0.95)].toFixed(2),p99:+s[Math.floor(s.length*0.99)].toFixed(2),max:+s[s.length-1].toFixed(2)};};
const warm=f.filter(x=>x[0]<3000),steady=f.filter(x=>x[0]>=3000);
const ring=(tk)=>(window.__c?window.__c.ev.filter(e=>Math.abs(e.tick-tk)<=12).map(e=>e.tick+':'+e.T):[]);
const allGaps=f.filter(x=>x[1]>100).map(x=>({atMs:Math.round(x[0]),ms:+x[1].toFixed(1),tick:x[2],warm:x[0]<3000,ring:ring(x[2])}));
const gaps=allGaps.filter(g=>!g.warm);
const wins=[];const endT=f.length?f[f.length-1][0]:0;
for(let w=3000;w+15000<=endT+300;w+=1000){const seg=f.filter(x=>x[0]>=w&&x[0]<w+15000);if(seg.length<10)continue;const g=seg.filter(x=>x[1]>100).length;const mx=Math.max(...seg.map(x=>x[1]));const mn=seg.reduce((a,b)=>a+b[1],0)/seg.length;wins.push([w/1000,g,+mx.toFixed(1),+(1000/mn).toFixed(1)]);}
return {tag:${JSON.stringify(tag)},sampleMs:Math.round(endT),ALL:stat(f.map(x=>x[1])),WARM:stat(warm.map(x=>x[1])),STEADY:stat(steady.map(x=>x[1])),allGapsOver100:allGaps,steadyGapsOver100:gaps,gapsOver250:gaps.filter(g=>g.ms>250).length,worstWindowGaps:wins.length?Math.max(...wins.map(w=>w[1])):0,windows15s:wins,perSec:D.sec,timerMaxGapMs:+D.timerMax.toFixed(1),longTasks:D.lt.slice(0,25)};
})()`);
const calib = [GPU, ev(iife(`return {ver:E.version,scene:E.state().scene}`)), sample(5000, 'CALIB-camp-idle')];

files['certD2-c-boss-early'] = [
  ...calib, arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room,boss:r&&r.boss}`)),
  { type: 'mousemove', x: 800, y: 320 },
  { type: 'mousedown', button: 'right' },
  sample2(22000, 'boss-from-spawn'),
  { type: 'mouseup', button: 'right' },
  ev(iife(`const s=E.state();return {tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,boss:E.cmd('runState').boss,banner:E.hud.banner().text}`)),
  evdump, shot('certD2-c-boss-early-frame'),
];
// second visit to a boss room in the SAME page session: does the 218 ms add-wave stall repeat once warm?
files['certD2-c-boss-twice'] = [
  ...calib, arm,
  ev(iife(`E.cmd('startRun');E.cmd('skipToRoom',8);return 'visit1'`)),
  { type: 'mousemove', x: 800, y: 320 },
  waitFor(`window.__c.ev.filter(e=>e.T==='boss_adds').length>=2`, 90000, `,adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>e.tick)`),
  ev(iife(`E.cmd('endRun');return 'ended v1'`)), wait(2500),
  ev(iife(`window.__c.ev.length=0;E.cmd('startRun');E.cmd('skipToRoom',8);return 'visit2'`)),
  { type: 'mousedown', button: 'right' },
  sample2(20000, 'boss-second-visit'),
  { type: 'mouseup', button: 'right' },
  evdump, shot('certD2-c-boss-twice-frame'),
];
// synthetic worst case: room 1 topped up to 40 live enemies (advisory)
files['certD2-c-stress40'] = [
  ...calib, arm,
  ev(iife(`E.cmd('startRun');E.cmd('skipToRoom',1);return 'r1'`)),
  { type: 'mousemove', x: 800, y: 320 },
  waitFor(`E.state().enemies.length>=1`, 40000),
  ev(`(async()=>{const E=__echoes;for(let i=0;i<36;i++){const a=i*0.35;E.cmd('spawn',i%2?'boar':'mantis',Math.cos(a)*(3+i*0.12),Math.sin(a)*(3+i*0.12));await new Promise(r=>setTimeout(r,40));}return {enemies:E.state().enemies.length,ents:E.entityCount}})()`),
  { type: 'mousedown', button: 'right' },
  ev(iife(`window.__top=setInterval(()=>{try{const n=E.state().enemies.length;if(n<38){const a=Math.random()*6.28;E.cmd('spawn',Math.random()<0.5?'boar':'mantis',Math.cos(a)*6,Math.sin(a)*6);}}catch(e){}},300);return 'topup'`)),
  sample2(20000, 'stress40'),
  ev(iife(`clearInterval(window.__top);const s=E.state();return {enemies:s.enemies.length,ents:E.entityCount,party:s.party.map(p=>[p.id,p.hp,p.downed])}`)),
  { type: 'mouseup', button: 'right' },
  shot('certD2-c-stress40-frame'),
];
for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
