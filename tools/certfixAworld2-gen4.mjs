#!/usr/bin/env node
// Regression duty for the A-world r2 fix pass:
//   perf   — a 10 s rAF sample inside a live Act-1 wave (bar: >= 55 fps on the
//            headless harness), reported as mean fps + the worst frame gap.
//   run    — startRun, let a room clear naturally, read the banner back.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });

writeFileSync('tools/actions/certfixAworld2-fps.json', JSON.stringify([
  ev("(()=>{const E=window.__echoes;const r=E.cmd('startRun');return {tag:'startRun',room:r&&r.room,mode:r&&r.mode}})()"),
  { type: 'mousemove', x: 800, y: 450 },
  { type: 'wait', ms: 2500 },
  ev("(async()=>{const E=window.__echoes;const t=[];let last=performance.now();const t0=last;await new Promise(res=>{const step=()=>{const n=performance.now();t.push(n-last);last=n;if(n-t0<10000)requestAnimationFrame(step);else res();};requestAnimationFrame(step);});const s=t.slice(1);const mean=s.reduce((a,b)=>a+b,0)/s.length;const sorted=[...s].sort((a,b)=>a-b);return {tag:'fps10s',frames:s.length,meanMs:+mean.toFixed(2),fps:+(1000/mean).toFixed(1),p95Ms:+sorted[Math.floor(sorted.length*0.95)].toFixed(1),maxMs:+Math.max(...s).toFixed(1),over100:s.filter(x=>x>100).length,enemies:E.state().enemies.length,room:E.cmd('runState').room}})()"),
], null, 1));

writeFileSync('tools/actions/certfixAworld2-run.json', JSON.stringify([
  ev("(()=>{const E=window.__echoes;window.__w2={ev:[]};for(const t of ['room_cleared','wave_start','death','reward_offer','run_end']){try{E.on(t,e=>window.__w2.ev.push(Object.assign({T:t},e)));}catch(err){}}const r=E.cmd('startRun');return {tag:'startRun',room:r&&r.room,mode:r&&r.mode}})()"),
  { type: 'mousemove', x: 800, y: 450 },
  ev("(async()=>{const E=window.__echoes;const t0=performance.now();while(performance.now()-t0<110000){if(window.__w2.ev.some(e=>e.T==='room_cleared'))break;try{E.cmd('killAllEnemies');}catch(e){}await new Promise(r=>setTimeout(r,220));}return {tag:'cleared',ms:Math.round(performance.now()-t0),events:window.__w2.ev.map(e=>e.T),room:E.cmd('runState').room,phase:E.cmd('runState').phase,banner:E.hud.banner().text,screen:E.runUi().screen}})()"),
], null, 1));
console.log('wrote certfixAworld2-fps.json + certfixAworld2-run.json');
