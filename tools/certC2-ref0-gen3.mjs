// certC2-ref0-boss : G1 re-run WITHOUT the critic's bossHp pin.
// The Stag has 1800 HP, so every early melee-arc connect is non-lethal on its own
// -- no cmd('bossHp') / cmd('setHp') on any enemy is issued at all, which removes
// the "the pin suppressed the pause" artifact hypothesis. Only the party is kept
// alive (setHp on party ids, timestamped so it can be cross-checked against hits).
// Phase 2 = in-capture kill calibration at the SAME fps (adds are killed).
import { writeFileSync, mkdirSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const iife = (b) => `(()=>{const E=window.__echoes;${b}})()`;
const aiife = (b) => `(async()=>{const E=window.__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${b}})()`;

const ARM = iife(`
  const W = window.__r0 = {ring:[], types:{}, gaps:0, frames:[], t0:performance.now(), lastKey:null, cmdLog:[]};
  const getEvents = () => { try { const e = (typeof E.events === 'function') ? E.events() : E.events; return Array.isArray(e)?e:[]; } catch(err){ return []; } };
  W.poll = () => { const a = getEvents(); if(!a.length) return; let start = 0;
    if (W.lastKey != null) { let idx=-1; for(let i=a.length-1;i>=0;i--){ if(JSON.stringify(a[i])===W.lastKey){idx=i;break;} }
      if (idx>=0) start=idx+1; else { W.gaps++; start=0; } }
    for (let i=start;i<a.length;i++){ const e=a[i]; W.ring.push(e); W.types[e.type]=(W.types[e.type]||0)+1; }
    W.lastKey = JSON.stringify(a[a.length-1]); if (W.ring.length>60000) W.ring.splice(0,20000); };
  const f = () => { W.poll(); W.frames.push([Math.round((performance.now()-W.t0)*10)/10, E.tick]);
    if (W.frames.length>200000) W.frames.splice(0,60000); requestAnimationFrame(f); };
  requestAnimationFrame(f);
  W.dwell = (T) => { const F=W.frames; let i0=-1; for(let i=0;i<F.length;i++){ if(F[i][1]===T){i0=i;break;} if(F[i][1]>T) return null; }
    if(i0<0) return null; let j=i0; while(j<F.length&&F[j][1]<=T)j++; if(j>=F.length) return null; return +(F[j][0]-F[i0][0]).toFixed(1); };
  W.dwellStats=(lo,hi)=>{ const F=W.frames; const d=[]; let i=0;
    while(i<F.length){ const T=F[i][1]; let j=i; while(j<F.length&&F[j][1]===T)j++;
      if(j<F.length&&T>=lo&&T<=hi&&F[j][1]===T+1)d.push(F[j][0]-F[i][0]); i=j; }
    d.sort((a,b)=>a-b); const q=(p)=>d.length?+d[Math.min(d.length-1,Math.floor(p*d.length))].toFixed(1):null;
    return {n:d.length,min:q(0),median:q(0.5),p90:q(0.9),p99:q(0.99),max:q(0.9999),over40:d.filter(x=>x>40).length,over30:d.filter(x=>x>30).length}; };
  // per-tick frame count too: a paused sim shows several frames on the same tick
  W.framesOn=(T)=>{ const F=W.frames; let n=0; for(let i=0;i<F.length;i++){ if(F[i][1]===T)n++; else if(F[i][1]>T) break; } return n; };
  return {armed:E.tick, version:E.version, fps:E.fps};`);

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
     E.cmd('skipToRoom',8);
     const t1=performance.now(); while(performance.now()-t1<60000){ const s=E.state(); const b=s.run&&s.run.boss;
       if(b&&b.active) return {ok:true,tick:E.tick,boss:[b.id,b.name,b.hp,b.maxHp],fps:E.fps}; await sleep(20); }
     return {ok:false,tick:E.tick};`)),
  ev(iife(`const W=window.__r0; E.cmd('iframe',0,150000); const b=E.state().run.boss; W.bossId=b.id; W.p1=E.tick;
     E.cmd('teleport',b.x+1.3,b.z);
     return {p1:E.tick, boss:[b.id,b.hp,b.x,b.z]};`)),
  { type: 'mousemove', x: 800, y: 450 },
  // 65 s of melee grind. NO enemy hp command is ever issued in this phase.
  ev(aiife(`const W=window.__r0; const t0=performance.now(); let n=0;
     while(performance.now()-t0<65000){ const s=E.state(); const b=s.run&&s.run.boss;
       if(b&&n%8===0){ E.cmd('teleport',b.x+1.2,b.z); W.cmdLog.push([E.tick,'teleport']); }
       for(const q of s.party){ if(q.hp<50){ E.cmd('setHp',q.id,1); W.cmdLog.push([E.tick,'setHp_party'+q.id]); } }
       n++; await sleep(250); }
     const s=E.state(); const b=s.run&&s.run.boss; W.p1e=E.tick;
     return {p1End:E.tick, fps:E.fps, bossHp:b?[b.hp,b.maxHp,b.pct]:null, enemies:s.enemies.length,
       hits:W.ring.filter(e=>e.type==='hit').length, deaths:W.ring.filter(e=>e.type==='death').length,
       hitstops:W.ring.filter(e=>e.type==='hitstop').length, enemyHpCmds:0, cmdLogLen:W.cmdLog.length};`)),
  ev(iife(`${CLS}
     const H=W.ring.filter(e=>e.type==='hit'&&e.tick>=W.p1&&e.tick<=W.p1e);
     const D=W.ring.filter(e=>e.type==='death');
     const HS=W.ring.filter(e=>e.type==='hitstop');
     const dead=(h)=>D.some(d=>Math.abs(d.tick-h.tick)<=2);
     const arcNK=H.filter(h=>isArc(h)&&!dead(h));
     const otherNK=H.filter(h=>!isArc(h)&&!dead(h)&&h.attacker!=null&&h.attacker<4);
     const stopWithin=(t)=>HS.find(s=>s.tick>=t-1&&s.tick<=t+2)||null;
     const dw=(arr)=>{ const v=arr.map(h=>W.dwell(h.tick)).filter(x=>x!=null).sort((a,b)=>a-b);
       return {n:v.length,min:v[0],p25:v[Math.floor(v.length*0.25)],median:v[Math.floor(v.length/2)],p90:v[Math.floor(v.length*0.9)],max:v[v.length-1],over40:v.filter(x=>x>40).length,over30:v.filter(x=>x>30).length}; };
     const bySrc={}; for(const h of arcNK) bySrc[h.source]=(bySrc[h.source]||0)+1;
     const fr=(arr)=>{ const v=arr.map(h=>W.framesOn(h.tick)).filter(x=>x!=null).sort((a,b)=>a-b);
       return {n:v.length,median:v[Math.floor(v.length/2)],max:v[v.length-1]}; };
     return {phase:'BOSS, NO PIN', window:[W.p1,W.p1e], hitsTotal:H.length, deathsTotal:D.length,
       arcNonKill:arcNK.length, arcNonKillBySource:bySrc, arcNonKillWithHitstop:arcNK.filter(h=>stopWithin(h.tick)).length,
       allyOtherNonKill:otherNK.length, allyOtherWithHitstop:otherNK.filter(h=>stopWithin(h.tick)).length,
       hitstopTotal:HS.length, hitstopCauses:(()=>{const c={};for(const s of HS)c[s.cause+':'+s.ticks]=(c[s.cause+':'+s.ticks]||0)+1;return c;})(),
       arcDwell:dw(arcNK), otherDwell:dw(otherNK), arcFramesOnTick:fr(arcNK), baseline:W.dwellStats(W.p1,W.p1e)};`)),
  ev(iife(`${CLS}
     const H=W.ring.filter(e=>e.type==='hit'&&e.tick>=W.p1&&e.tick<=W.p1e);
     const D=W.ring.filter(e=>e.type==='death'); const HS=W.ring.filter(e=>e.type==='hitstop');
     const dead=(h)=>D.some(d=>Math.abs(d.tick-h.tick)<=2);
     const arcNK=H.filter(h=>isArc(h)&&!dead(h));
     const near=(t)=>W.cmdLog.filter(c=>Math.abs(c[0]-t)<=2).map(c=>c[1]).join(',')||'-';
     return {arcRows:arcNK.slice(0,45).map(h=>[h.tick,h.source,'atk'+h.attacker,h.amount,W.dwell(h.tick),W.framesOn(h.tick),(HS.find(s=>s.tick>=h.tick-1&&s.tick<=h.tick+2)||{}).cause||'none',near(h.tick)])};`)),
  // ---- phase 2: kill calibration at the same fps, same room ----
  ev(aiife(`const W=window.__r0; W.p2=E.tick; const t0=performance.now();
     while(performance.now()-t0<25000){ const s=E.state();
       if(s.enemies.length<4){ for(let k=s.enemies.length;k<5;k++){ const a=Math.random()*6.28; E.cmd('spawn','boar',Math.cos(a)*1.5,Math.sin(a)*1.5); } }
       for(const e of s.enemies) if(e.id!==W.bossId) E.cmd('setHp',e.id,0.06);
       for(const q of s.party) if(q.hp<50) E.cmd('setHp',q.id,1);
       const b=s.run&&s.run.boss; if(b) E.cmd('teleport',b.x+1.2,b.z);
       await sleep(250); }
     W.p2e=E.tick;
     return {p2:[W.p2,W.p2e], deaths:W.ring.filter(e=>e.type==='death'&&e.tick>=W.p2).length,
       hitstops:W.ring.filter(e=>e.type==='hitstop'&&e.tick>=W.p2).length, fps:E.fps};`)),
  ev(iife(`${CLS}
     const D=W.ring.filter(e=>e.type==='death'&&e.tick>=W.p2);
     const HS=W.ring.filter(e=>e.type==='hitstop'&&e.tick>=W.p2);
     const v=D.map(d=>W.dwell(d.tick)).filter(x=>x!=null).sort((a,b)=>a-b);
     const f3=D.map(d=>W.framesOn(d.tick)).filter(x=>x!=null).sort((a,b)=>a-b);
     return {phase:'KILL CALIBRATION (same capture)', deaths:D.length,
       hitstopCauses:(()=>{const c={};for(const s of HS)c[s.cause+':'+s.ticks]=(c[s.cause+':'+s.ticks]||0)+1;return c;})(),
       killDwell:{n:v.length,min:v[0],median:v[Math.floor(v.length/2)],max:v[v.length-1],over40:v.filter(x=>x>40).length},
       killFramesOnTick:{n:f3.length,median:f3[Math.floor(f3.length/2)],max:f3[f3.length-1]},
       baseline:W.dwellStats(W.p2,E.tick), fps:E.fps};`)),
  ev(iife(`const W=window.__r0; const m={}; for(const e of W.ring) m[e.type]=(m[e.type]||0)+1;
     return {allRingTypes:m, ringGaps:W.gaps, tick:E.tick, ver:E.version, fps:E.fps,
       nonKillStops:W.ring.filter(e=>e.type==='hitstop'&&e.cause!=='kill').map(e=>[e.tick,e.cause,e.ticks])};`)),
];
mkdirSync('tools/actions', { recursive: true });
writeFileSync('tools/actions/certC2-ref0-boss.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certC2-ref0-boss.json', acts.length);
