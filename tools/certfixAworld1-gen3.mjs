// certfixAworld1 — a settled fps probe: after the combat conditions are set
// up, sample the game's OWN fps meter (window.__echoes.fps, i.e. real render
// frames) once a second for 12 s and report min/median/mean, alongside a raw
// rAF count over the same window. Written programmatically per docs/TESTING.md.
import { readFileSync, writeFileSync } from 'fs';
const combat = JSON.parse(readFileSync('tools/actions/certA1-combat.json', 'utf8'));
writeFileSync('tools/actions/certfixAworld1-fps2.json', JSON.stringify([
  ...combat,
  { type: 'wait', ms: 1500 },
  { type: 'eval', code: `(async()=>{const E=__echoes;const s=[];let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<12000)requestAnimationFrame(f)};requestAnimationFrame(f);for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,1000));s.push(E.fps)}const ms=performance.now()-t0;const srt=[...s].sort((a,b)=>a-b);return {tag:'fps12s',samples:s,min:srt[0],median:srt[6],mean:Math.round(s.reduce((a,b)=>a+b,0)/s.length*10)/10,rafFrames:n,rafFps:Math.round(n/(ms/1000)*10)/10,entities:E.entityCount}})()` },
], null, 1));
writeFileSync('tools/actions/certfixAworld1-fps2camp.json', JSON.stringify([
  { type: 'wait', ms: 2000 },
  { type: 'eval', code: `(async()=>{const E=__echoes;const s=[];for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,1000));s.push(E.fps)}const srt=[...s].sort((a,b)=>a-b);return {tag:'fps10camp',samples:s,min:srt[0],median:srt[5],scene:E.state().scene}})()` },
], null, 1));
console.log('wrote fps2, fps2camp');
