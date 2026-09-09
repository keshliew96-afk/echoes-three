// certC2-ref0-cal : (A) NON-BOSS non-lethal melee-arc connects -- boars (20 HP)
// topped up every 40 ms so a 9-11 dmg melee basic cannot kill them; no rally cmd
// so the melee allies actually use their basics. (B) kill calibration in the SAME
// capture / same fps. (C) scope probe: can the PLAYER produce a damaging melee arc?
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
    if (W.frames.length>200000) W.frames.splice(0,60000); requestAnimationFrame(f); };
  requestAnimationFrame(f);
  W.dwell = (T) => { const F=W.frames; let i0=-1; for(let i=0;i<F.length;i++){ if(F[i][1]===T){i0=i;break;} if(F[i][1]>T) return null; }
    if(i0<0) return null; let j=i0; while(j<F.length&&F[j][1]<=T)j++; if(j>=F.length) return null; return +(F[j][0]-F[i0][0]).toFixed(1); };
  W.framesOn=(T)=>{ const F=W.frames; let n=0; for(let i=0;i<F.length;i++){ if(F[i][1]===T)n++; else if(F[i][1]>T) break; } return n; };
  W.dwellStats=(lo,hi)=>{ const F=W.frames; const d=[]; let i=0;
    while(i<F.length){ const T=F[i][1]; let j=i; while(j<F.length&&F[j][1]===T)j++;
      if(j<F.length&&T>=lo&&T<=hi&&F[j][1]===T+1)d.push(F[j][0]-F[i][0]); i=j; }
    d.sort((a,b)=>a-b); const q=(p)=>d.length?+d[Math.min(d.length-1,Math.floor(p*d.length))].toFixed(1):null;
    return {n:d.length,min:q(0),median:q(0.5),p90:q(0.9),p99:q(0.99),max:q(0.9999),over40:d.filter(x=>x>40).length,over30:d.filter(x=>x>30).length}; };
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
     E.cmd('skipToRoom',5); await sleep(600);
     const t1=performance.now(); while(performance.now()-t1<45000){ const s=E.state(); if(s.enemies&&s.enemies.length)
       return {ok:true,tick:E.tick,room:s.run.room,mode:s.run.mode,enemies:s.enemies.map(e=>[e.id,e.kind,e.hp])}; await sleep(20); }
     return {ok:false,tick:E.tick};`)),
  ev(iife(`const W=window.__r0; E.cmd('iframe',0,150000); W.p1=E.tick; E.cmd('teleport',0,0);
     W.pin=setInterval(()=>{ try{ W.pinCalls++; const s=E.state(); for(const e of s.enemies) E.cmd('setHp',e.id,1); }catch(err){ W.perr=String(err); } },40);
     return {p1:E.tick, enemies:E.state().enemies.length};`)),
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const W=window.__r0; const t0=performance.now(); let n=0;
     while(performance.now()-t0<45000){ const s=E.state();
       if(s.enemies.length<4){ for(let k=s.enemies.length;k<5;k++){ const a=Math.random()*6.28; E.cmd('spawn','boar',Math.cos(a)*1.4,Math.sin(a)*1.4); } }
       for(const q of s.party) if(q.hp<50) E.cmd('setHp',q.id,1);
       if(n%12===0) E.cmd('teleport',0,0);
       n++; await sleep(250); }
     W.p1e=E.tick; const s=E.state();
     return {p1End:E.tick, fps:E.fps, enemies:s.enemies.map(e=>[e.id,e.kind,e.hp]), pinCalls:W.pinCalls, pinErr:W.perr||null,
       hits:W.ring.filter(e=>e.type==='hit').length, deaths:W.ring.filter(e=>e.type==='death').length};`)),
  ev(iife(`const W=window.__r0; clearInterval(W.pin); return {pinOff:E.tick};`)),
  ev(iife(`${CLS}
     const H=W.ring.filter(e=>e.type==='hit'&&e.tick>=W.p1&&e.tick<=W.p1e);
     const D=W.ring.filter(e=>e.type==='death'); const HS=W.ring.filter(e=>e.type==='hitstop');
     const dead=(h)=>D.some(d=>Math.abs(d.tick-h.tick)<=2);
     const arcNK=H.filter(h=>isArc(h)&&!dead(h));
     const stopWithin=(t)=>HS.find(s=>s.tick>=t-1&&s.tick<=t+2)||null;
     const dw=(arr)=>{ const v=arr.map(h=>W.dwell(h.tick)).filter(x=>x!=null).sort((a,b)=>a-b);
       return {n:v.length,min:v[0],median:v[Math.floor(v.length/2)],p90:v[Math.floor(v.length*0.9)],max:v[v.length-1],over40:v.filter(x=>x>40).length,over30:v.filter(x=>x>30).length}; };
     const bySrc={}; for(const h of arcNK) bySrc[h.source+'|'+h.kind]=(bySrc[h.source+'|'+h.kind]||0)+1;
     return {phase:'A NON-BOSS non-lethal arcs', window:[W.p1,W.p1e], basicShapes:basicShape,
       hits:H.length, deaths:D.length, arcNonKill:arcNK.length, arcNonKillBySource:bySrc,
       arcNonKillWithHitstop:arcNK.filter(h=>stopWithin(h.tick)).length,
       hitstopCauses:(()=>{const c={};for(const s of HS)c[s.cause+':'+s.ticks]=(c[s.cause+':'+s.ticks]||0)+1;return c;})(),
       arcDwell:dw(arcNK), arcFramesOnTick:(()=>{const v=arcNK.map(h=>W.framesOn(h.tick)).sort((a,b)=>a-b);return {n:v.length,median:v[Math.floor(v.length/2)],max:v[v.length-1]};})(),
       baseline:W.dwellStats(W.p1,W.p1e),
       rows:arcNK.slice(0,25).map(h=>[h.tick,h.source,'atk'+h.attacker,h.kind,h.amount,W.dwell(h.tick),W.framesOn(h.tick),(stopWithin(h.tick)||{}).cause||'none'])};`)),
  ev(aiife(`const W=window.__r0; W.p2=E.tick; const t0=performance.now();
     while(performance.now()-t0<22000){ const s=E.state();
       if(s.enemies.length<4){ for(let k=s.enemies.length;k<5;k++){ const a=Math.random()*6.28; E.cmd('spawn','boar',Math.cos(a)*1.4,Math.sin(a)*1.4); } }
       for(const e of s.enemies) E.cmd('setHp',e.id,0.06);
       for(const q of s.party) if(q.hp<50) E.cmd('setHp',q.id,1);
       await sleep(220); }
     W.p2e=E.tick; return {p2:[W.p2,W.p2e], fps:E.fps};`)),
  ev(iife(`${CLS}
     const D=W.ring.filter(e=>e.type==='death'&&e.tick>=W.p2);
     const HS=W.ring.filter(e=>e.type==='hitstop'&&e.tick>=W.p2);
     const k3=HS.filter(s=>s.ticks===3);
     const dv=(arr)=>{ const v=arr.map(d=>W.dwell(d.tick)).filter(x=>x!=null).sort((a,b)=>a-b);
       return {n:v.length,min:v[0],median:v[Math.floor(v.length/2)],max:v[v.length-1],over40:v.filter(x=>x>40).length}; };
     const fv=(arr)=>{ const v=arr.map(d=>W.framesOn(d.tick)).sort((a,b)=>a-b); return {n:v.length,median:v[Math.floor(v.length/2)],max:v[v.length-1]}; };
     return {phase:'B kill calibration same capture', deaths:D.length, fps:E.fps,
       hitstopCauses:(()=>{const c={};for(const s of HS)c[s.cause+':'+s.ticks]=(c[s.cause+':'+s.ticks]||0)+1;return c;})(),
       dwellAt3TickStops:dv(k3), framesOnTickAt3TickStops:fv(k3),
       baseline:W.dwellStats(W.p2,E.tick)};`)),
  // ---- C: does the player have ANY damaging melee arc? ----
  ev(iife(`const W=window.__r0; const s=E.state();
     const tries=['heavy_slam','brutal_cleave','flurry','lunge_strike','restorative_wave','cleave','sweep','whirl'];
     const res={}; for(const t of tries){ try{ res[t]=JSON.stringify(E.cmd('giveSkill',t)).slice(0,120); }catch(err){ res[t]='THREW '+err; } }
     return {giveSkill:res, skillsState:JSON.stringify(s.skills).slice(0,600), build:JSON.stringify(s.build).slice(0,300)};`)),
  ev(iife(`const W=window.__r0; const m={}; for(const e of W.ring) m[e.type]=(m[e.type]||0)+1;
     return {allRingTypes:m, ringGaps:W.gaps, nonKillStops:W.ring.filter(e=>e.type==='hitstop'&&e.cause!=='kill').map(e=>[e.tick,e.cause,e.ticks]),
       tick:E.tick, ver:E.version, fps:E.fps};`)),
];
mkdirSync('tools/actions', { recursive: true });
writeFileSync('tools/actions/certC2-ref0-cal.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certC2-ref0-cal.json', acts.length);
