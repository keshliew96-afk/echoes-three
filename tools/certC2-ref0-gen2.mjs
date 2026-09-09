// certC2-ref0-pin : the confound-free version of the critic's G1 probe.
// NORMAL enemies (not the boss), pinned at full HP every 60 ms so nothing dies,
// melee allies (tank arc + swordsman arc + their arc skills) grinding on them.
// If BUILD_BRIEF s9 item 4 (2-tick pause on melee-arc connects) exists anywhere
// it must appear here as a `hitstop` event with cause != kill AND as ~50 ms tick
// dwell. Phase 2 releases the pin for an in-capture kill-hitstop calibration.
import { writeFileSync, mkdirSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const iife = (b) => `(()=>{const E=window.__echoes;${b}})()`;
const aiife = (b) => `(async()=>{const E=window.__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${b}})()`;

const ARM = iife(`
  const W = window.__r0 = {ring:[], types:{}, gaps:0, frames:[], t0:performance.now(), lastKey:null, pinCalls:0};
  const getEvents = () => { try { const e = (typeof E.events === 'function') ? E.events() : E.events; return Array.isArray(e)?e:[]; } catch(err){ return []; } };
  W.poll = () => { const a = getEvents(); if(!a.length) return; let start = 0;
    if (W.lastKey != null) { let idx=-1; for(let i=a.length-1;i>=0;i--){ if(JSON.stringify(a[i])===W.lastKey){idx=i;break;} }
      if (idx>=0) start=idx+1; else { W.gaps++; start=0; } }
    for (let i=start;i<a.length;i++){ const e=a[i]; W.ring.push(e); W.types[e.type]=(W.types[e.type]||0)+1; }
    W.lastKey = JSON.stringify(a[a.length-1]); if (W.ring.length>60000) W.ring.splice(0,20000); };
  const f = () => { W.poll(); W.frames.push([Math.round((performance.now()-W.t0)*10)/10, E.tick]);
    if (W.frames.length>150000) W.frames.splice(0,50000); requestAnimationFrame(f); };
  requestAnimationFrame(f);
  W.dwell = (T) => { const F=W.frames; let i0=-1; for(let i=0;i<F.length;i++){ if(F[i][1]===T){i0=i;break;} if(F[i][1]>T) return null; }
    if(i0<0) return null; let j=i0; while(j<F.length&&F[j][1]<=T)j++; if(j>=F.length) return null; return +(F[j][0]-F[i0][0]).toFixed(1); };
  W.dwellStats=(lo,hi)=>{ const F=W.frames; const d=[]; let i=0;
    while(i<F.length){ const T=F[i][1]; let j=i; while(j<F.length&&F[j][1]===T)j++;
      if(j<F.length&&T>=lo&&T<=hi&&F[j][1]===T+1)d.push(F[j][0]-F[i][0]); i=j; }
    d.sort((a,b)=>a-b); const q=(p)=>d.length?+d[Math.min(d.length-1,Math.floor(p*d.length))].toFixed(1):null;
    return {n:d.length,min:q(0),median:q(0.5),p90:q(0.9),p99:q(0.99),max:q(0.9999),over40:d.filter(x=>x>40).length,over30:d.filter(x=>x>30).length}; };
  return {armed:E.tick, version:E.version, fps:E.fps};`);

// classifier built from the game's OWN shape labels (ally_cast/ally_basic events)
const CLS = `const W=window.__r0;
  const skillShape={}; for(const e of W.ring) if(e.type==='ally_cast') skillShape[e.skill]=e.shape;
  const basicShape={}; for(const e of W.ring) if(e.type==='ally_basic') basicShape[e.partyIndex]=e.shape;
  const shapeOf=(h)=>{ if(h.source&&skillShape[h.source]) return skillShape[h.source];
    if(h.source&&/_basic$/.test(h.source)) return basicShape[h.attacker]||('basic?'+h.attacker); return 'unknown'; };
  const isArc=(h)=>shapeOf(h)==='melee_arc';`;

const acts = [
  ev(ARM),
  ev(aiife(`E.cmd('startRun'); const t0=performance.now();
     while(performance.now()-t0<45000){ if(E.state().run&&E.state().run.active) break; await sleep(10); }
     const r=E.cmd('skipToRoom',5); await sleep(600);
     const t1=performance.now(); while(performance.now()-t1<45000){ const s=E.state(); if(s.enemies&&s.enemies.length)
       return {ok:true,tick:E.tick,room:s.run.room,mode:s.run.mode,enemies:s.enemies.map(e=>[e.id,e.kind,e.hp])}; await sleep(20); }
     return {ok:false,tick:E.tick,skip:r};`)),
  ev(iife(`const W=window.__r0; E.cmd('iframe',0,120000);
     const p=E.state().party; W.phase1=E.tick;
     E.cmd('teleport',0,0);
     W.pin=setInterval(()=>{ try{ W.pinCalls++; const s=E.state();
       for(const e of s.enemies) E.cmd('setHp',e.id,1);
       for(const q of s.party) if(q.hp<=0||q.hp<60) E.cmd('setHp',q.id,1);
     }catch(err){ W.perr=String(err); } },60);
     return {phase1Start:E.tick, party:p.map(q=>[q.id,q.classId||q.kind,q.hp]), enemies:E.state().enemies.length};`)),
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const W=window.__r0; const t0=performance.now(); let n=0;
     while(performance.now()-t0<55000){ const s=E.state();
       if(s.enemies.length<5){ for(let k=s.enemies.length;k<6;k++){ const a=Math.random()*6.28; E.cmd('spawn','boar',Math.cos(a)*1.6,Math.sin(a)*1.6); } }
       if(n%4===0){ E.cmd('teleport',0,0); E.cmd('rally'); }
       n++; await sleep(250); }
     const s=E.state();
     return {phase1End:E.tick, fps:E.fps, enemies:s.enemies.map(e=>[e.id,e.kind,e.hp]),
       hits:W.ring.filter(e=>e.type==='hit').length, deaths:W.ring.filter(e=>e.type==='death').length,
       hitstops:W.ring.filter(e=>e.type==='hitstop').length, pinCalls:W.pinCalls, pinErr:W.perr||null};`)),
  ev(iife(`const W=window.__r0; clearInterval(W.pin); W.phase1End=E.tick; return {pinOff:E.tick};`)),
  ev(iife(`${CLS}
     const H=W.ring.filter(e=>e.type==='hit'&&e.tick>=W.phase1&&e.tick<=W.phase1End);
     const D=W.ring.filter(e=>e.type==='death');
     const HS=W.ring.filter(e=>e.type==='hitstop');
     const dead=(h)=>D.some(d=>(d.id===h.target||d.target===h.target)&&Math.abs(d.tick-h.tick)<=2);
     const arcNK=H.filter(h=>isArc(h)&&!dead(h));
     const otherNK=H.filter(h=>!isArc(h)&&!dead(h));
     const stopWithin=(t)=>HS.find(s=>s.tick>=t-1&&s.tick<=t+2)||null;
     const dw=(arr)=>{ const v=arr.map(h=>W.dwell(h.tick)).filter(x=>x!=null).sort((a,b)=>a-b);
       return {n:v.length,min:v[0],median:v[Math.floor(v.length/2)],p90:v[Math.floor(v.length*0.9)],max:v[v.length-1],over40:v.filter(x=>x>40).length,over30:v.filter(x=>x>30).length}; };
     const bySrc={}; for(const h of arcNK) bySrc[h.source]=(bySrc[h.source]||0)+1;
     return {phase:'PIN (nothing may die)', window:[W.phase1,W.phase1End], hitsTotal:H.length, deathsTotal:D.length,
       skillShapes:skillShape, basicShapes:basicShape,
       arcNonKill:arcNK.length, arcNonKillBySource:bySrc, arcNonKillWithHitstop:arcNK.filter(h=>stopWithin(h.tick)).length,
       otherNonKill:otherNK.length, otherNonKillWithHitstop:otherNK.filter(h=>stopWithin(h.tick)).length,
       hitstopTotal:HS.length, hitstopCauses:(()=>{const c={};for(const s of HS)c[s.cause+':'+s.ticks]=(c[s.cause+':'+s.ticks]||0)+1;return c;})(),
       arcDwell:dw(arcNK), otherDwell:dw(otherNK), baseline:W.dwellStats(W.phase1,W.phase1End)};`)),
  ev(iife(`${CLS}
     const H=W.ring.filter(e=>e.type==='hit'&&e.tick>=W.phase1&&e.tick<=W.phase1End);
     const D=W.ring.filter(e=>e.type==='death'); const HS=W.ring.filter(e=>e.type==='hitstop');
     const dead=(h)=>D.some(d=>(d.id===h.target||d.target===h.target)&&Math.abs(d.tick-h.tick)<=2);
     const arcNK=H.filter(h=>isArc(h)&&!dead(h));
     return {first40arc:arcNK.slice(0,40).map(h=>[h.tick,h.source,'atk'+h.attacker,h.amount,W.dwell(h.tick),(HS.find(s=>s.tick>=h.tick-1&&s.tick<=h.tick+2)||{}).cause||'none'])};`)),
  ev(aiife(`const W=window.__r0; W.phase2=E.tick;
     const t0=performance.now();
     while(performance.now()-t0<25000){ const s=E.state();
       for(const e of s.enemies) E.cmd('setHp',e.id,0.08);
       if(s.enemies.length<4){ for(let k=s.enemies.length;k<5;k++){ const a=Math.random()*6.28; E.cmd('spawn','boar',Math.cos(a)*1.5,Math.sin(a)*1.5); } }
       for(const q of s.party) if(q.hp<60) E.cmd('setHp',q.id,1);
       E.cmd('teleport',0,0); await sleep(200); }
     W.phase2End=E.tick;
     return {phase2:[W.phase2,W.phase2End], deaths:W.ring.filter(e=>e.type==='death'&&e.tick>=W.phase2).length,
       hitstops:W.ring.filter(e=>e.type==='hitstop'&&e.tick>=W.phase2).length, fps:E.fps};`)),
  ev(iife(`${CLS}
     const D=W.ring.filter(e=>e.type==='death'&&e.tick>=W.phase2);
     const HS=W.ring.filter(e=>e.type==='hitstop'&&e.tick>=W.phase2);
     const v=D.map(d=>W.dwell(d.tick)).filter(x=>x!=null).sort((a,b)=>a-b);
     const H=W.ring.filter(e=>e.type==='hit'&&e.tick>=W.phase2);
     const killArc=H.filter(h=>isArc(h)&&D.some(d=>(d.id===h.target||d.target===h.target)&&Math.abs(d.tick-h.tick)<=2));
     return {phase:'KILL CALIBRATION', deaths:D.length, hitstopEvents:HS.map(s=>[s.tick,s.cause,s.ticks]).slice(0,30),
       hitstopCauses:(()=>{const c={};for(const s of HS)c[s.cause+':'+s.ticks]=(c[s.cause+':'+s.ticks]||0)+1;return c;})(),
       killDwell:{n:v.length,min:v[0],median:v[Math.floor(v.length/2)],max:v[v.length-1],over40:v.filter(x=>x>40).length},
       arcKills:killArc.length, baseline:W.dwellStats(W.phase2,E.tick)};`)),
  ev(iife(`const W=window.__r0; const m={}; for(const e of W.ring) m[e.type]=(m[e.type]||0)+1;
     return {allRingTypes:m, ringGaps:W.gaps, tick:E.tick, ver:E.version, fps:E.fps,
       stopFamily:W.ring.filter(e=>/stop|freeze|pause|slow/i.test(e.type)).length};`)),
];
mkdirSync('tools/actions', { recursive: true });
writeFileSync('tools/actions/certC2-ref0-pin.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certC2-ref0-pin.json', acts.length);
