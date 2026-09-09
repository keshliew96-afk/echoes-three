// certC2-ref0-recon : (1) what build is live, (2) full debug-API surface,
// (3) the COMPLETE event vocabulary as seen in the __echoes ring buffer (not just
// a hand-picked E.on list) during a normal kill_all room, (4) the kill-hitstop
// control on this machine with no other browser running.
import { writeFileSync, mkdirSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (b) => `(()=>{const E=window.__echoes;${b}})()`;
const aiife = (b) => `(async()=>{const E=window.__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${b}})()`;

const ARM = iife(`
  const W = window.__r0 = {ring:[], types:{}, gaps:0, frames:[], t0:performance.now(), lastKey:null};
  const getEvents = () => { try { const e = (typeof E.events === 'function') ? E.events() : E.events; return Array.isArray(e) ? e : []; } catch(err){ return []; } };
  W.poll = () => { const a = getEvents(); if(!a.length) return; let start = 0;
    if (W.lastKey != null) { let idx = -1; for (let i = a.length-1; i >= 0; i--) { if (JSON.stringify(a[i]) === W.lastKey) { idx = i; break; } }
      if (idx >= 0) start = idx + 1; else { W.gaps++; start = 0; } }
    for (let i = start; i < a.length; i++) { const e = a[i]; W.ring.push(e); W.types[e.type] = (W.types[e.type]||0)+1; }
    W.lastKey = JSON.stringify(a[a.length-1]); if (W.ring.length > 40000) W.ring.splice(0, 15000); };
  const f = () => { W.poll(); W.frames.push([Math.round((performance.now()-W.t0)*10)/10, E.tick]);
    if (W.frames.length > 120000) W.frames.splice(0, 40000); requestAnimationFrame(f); };
  requestAnimationFrame(f);
  W.dwell = (T) => { const F = W.frames; let i0 = -1; for (let i=0;i<F.length;i++){ if(F[i][1]===T){i0=i;break;} if(F[i][1]>T) return null; }
    if (i0 < 0) return null; let j = i0; while (j < F.length && F[j][1] <= T) j++; if (j >= F.length) return null; return +(F[j][0]-F[i0][0]).toFixed(1); };
  W.dwellStats = (lo,hi) => { const F=W.frames; const d=[]; let i=0;
    while(i<F.length){ const T=F[i][1]; let j=i; while(j<F.length&&F[j][1]===T)j++;
      if(j<F.length&&T>=lo&&T<=hi&&F[j][1]===T+1)d.push(F[j][0]-F[i][0]); i=j; }
    d.sort((a,b)=>a-b); const q=(p)=>d.length?+d[Math.min(d.length-1,Math.floor(p*d.length))].toFixed(1):null;
    return {n:d.length,min:q(0),median:q(0.5),p90:q(0.9),p99:q(0.99),max:q(0.9999),over40:d.filter(x=>x>40).length,over30:d.filter(x=>x>30).length}; };
  return {armed:E.tick, version:E.version, seed:E.seed, bootSeed:E.bootSeed, fps:E.fps,
    apiKeys:Object.keys(E), eventsType:(typeof E.events), eventsLen:getEvents().length,
    sampleEvents:getEvents().slice(-6)};`);

const acts = [
  ARM ? ev(ARM) : null,
  ev(iife(`const s=E.state(); return {stateKeys:Object.keys(s), scene:s.scene, run:s.run&&{active:s.run.active,room:s.run.room,mode:s.run.mode},
     toggles:s.toggles, vfx:s.vfx, party:(s.party||[]).map(p=>[p.id,p.kind,p.classId,p.hp]), enemies:(s.enemies||[]).length};`)),
  ev(aiife(`if(!E.state().run||!E.state().run.active){E.cmd('startRun');}
     const t0=performance.now(); while(performance.now()-t0<45000){ const s=E.state(); if(s.run&&s.run.active) break; await sleep(10);} 
     const r=E.cmd('skipToRoom',5); await sleep(500);
     const t1=performance.now(); while(performance.now()-t1<45000){ const s=E.state(); if(s.enemies&&s.enemies.length) return {ok:true,tick:E.tick,room:s.run.room,mode:s.run.mode,enemies:s.enemies.map(e=>[e.id,e.kind,e.hp])}; await sleep(20);} 
     return {ok:false,tick:E.tick,skip:r,state:E.state().run};`)),
  ev(iife(`E.cmd('iframe',0,60000); window.__r0.combatStart=E.tick; return {combatStart:E.tick, hitKeys:'pending'};`)),
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const t0=performance.now(); while(performance.now()-t0<40000){ const s=E.state(); if(E.state().party[0].hp<80)E.cmd('setHp',0,1);
      if(!s.enemies.length){ E.cmd('startWave'); await sleep(400); }
      await sleep(200);} return {end:E.tick,fps:E.fps,enemies:E.state().enemies.length};`)),
  ev(iife(`const W=window.__r0; const hits=W.ring.filter(e=>e.type==='hit');
     return {ringTypes:W.types, ringGaps:W.gaps, ringLen:W.ring.length, tick:E.tick,
       sampleHit:hits.slice(0,3), sampleHitKeys:hits.length?Object.keys(hits[0]):null,
       hitShapes:(()=>{const m={};for(const h of hits)m[(h.shape||'noshape')+'|'+(h.source||'nosrc')]=(m[(h.shape||'noshape')+'|'+(h.source||'nosrc')]||0)+1;return m;})()};`)),
  ev(iife(`const W=window.__r0; const HS=W.ring.filter(e=>/stop|freeze|pause/i.test(e.type));
     const D=W.ring.filter(e=>e.type==='death');
     return {hitstopEvents:HS.map(s=>[s.tick,s.type,s.cause,s.ticks]).slice(0,40), hitstopCount:HS.length,
       deaths:D.length, killDwell:(()=>{const v=D.map(d=>W.dwell(d.tick)).filter(x=>x!=null).sort((a,b)=>a-b);
         return {n:v.length,min:v[0],median:v[Math.floor(v.length/2)],max:v[v.length-1]};})(),
       baseline:W.dwellStats(W.combatStart, E.tick)};`)),
  ev(iife(`const W=window.__r0; const sampleTypes={}; for(const e of W.ring){ if(!sampleTypes[e.type]) sampleTypes[e.type]=e; }
     return {oneOfEach:Object.keys(sampleTypes).map(k=>[k,JSON.stringify(sampleTypes[k]).slice(0,180)])};`)),
].filter(Boolean);
mkdirSync('tools/actions', { recursive: true });
writeFileSync('tools/actions/certC2-ref0-recon.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certC2-ref0-recon.json', acts.length);
