// REFUTER certC2-ref1 : independent re-test of F1-r2b (no hitstop on melee-arc connects).
// Three probes, each with an IN-CAPTURE positive control (kill hitstop) so the
// detector is calibrated inside the same page scope / same fps / same room.
import { writeFileSync, mkdirSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const mv = (x, y) => ({ type: 'mousemove', x, y });
const shot = (name) => ({ type: 'shot', name });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const aiife = (b) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${b}})()`;

const EVT = ['hit','death','hitstop','sound','ally_basic','ally_cast','enemy_spawn','boss_spawn',
  'boss_adds','boss_quake_start','boss_quake_resolve','boss_trample','screenshake','room_cleared',
  'hit_immune','knockback','heal','full_heal','skill_cast','player_basic','crit'];

const ARM = iife(`
  window.__r={ev:[],frames:[],types:{},errs:[],started:performance.now()};
  for(const t of ${JSON.stringify(EVT)}){ try{E.on(t,e=>window.__r.ev.push(Object.assign({T:t},e)));}catch(err){window.__r.errs.push(t+':'+err.message);} }
  const f=()=>{const F=window.__r.frames;F.push([Math.round((performance.now()-window.__r.started)*10)/10,E.tick]);
    if(F.length>150000)F.splice(0,50000);requestAnimationFrame(f);};requestAnimationFrame(f);
  window.__r.poll=setInterval(()=>{try{for(const e of E.events)window.__r.types[e.type]=e.tick;}catch(err){}},300);
  window.__r.dwell=(T)=>{const F=window.__r.frames;let i0=-1;
    for(let i=0;i<F.length;i++){if(F[i][1]===T){i0=i;break;}if(F[i][1]>T)return null;}
    if(i0<0)return null;let j=i0;while(j<F.length&&F[j][1]<=T)j++;if(j>=F.length)return null;
    return +(F[j][0]-F[i0][0]).toFixed(1);};
  window.__r.rate=(T,W)=>{const F=window.__r.frames;let i0=-1;
    for(let i=0;i<F.length;i++){if(F[i][1]===T){i0=i;break;}if(F[i][1]>T)return null;}
    if(i0<0)return null;const t0=F[i0][0];
    for(let i=i0;i<F.length;i++){if(F[i][0]-t0>W)return F[i-1][1]-T;}return null;};
  window.__r.dwellStats=(lo,hi)=>{const F=window.__r.frames;const d=[];let i=0;
    while(i<F.length){const T=F[i][1];let j=i;while(j<F.length&&F[j][1]===T)j++;
      if(j<F.length&&T>=lo&&T<=hi&&F[j][1]===T+1)d.push(F[j][0]-F[i][0]);i=j;}
    d.sort((a,b)=>a-b);const q=(p)=>d.length?+d[Math.min(d.length-1,Math.floor(p*d.length))].toFixed(1):null;
    return {n:d.length,min:q(0),median:q(0.5),p90:q(0.9),p99:q(0.99),max:q(0.9999),over40:d.filter(x=>x>40).length,over30:d.filter(x=>x>30).length};};
  window.__r.rateStats=(lo,hi,W)=>{const v=[];for(let T=lo;T<=hi;T+=7){const r=window.__r.rate(T,W);if(r!=null)v.push(r);}
    v.sort((a,b)=>a-b);return {n:v.length,min:v[0],median:v[Math.floor(v.length/2)],max:v[v.length-1]};};
  return 'armed t'+E.tick+' ver '+E.version+' onErrs '+JSON.stringify(window.__r.errs)`);

// classify by the sim's own shape field when present, else by the fired-skill map
const CLS = `
  const casts={};for(const a of window.__r.ev){ if(a.T==='ally_cast')casts[a.skill]=a.shape; }
  const basicArc=(s)=>/^(swordsman|tank)_basic$/.test(s||'');
  const isArc=(h)=>h.shape==='melee_arc'||casts[h.source]==='melee_arc'||basicArc(h.source);`;

const REPORT = (tag) => [
  ev(iife(`${CLS}
    const H=window.__r.ev.filter(e=>e.T==='hit');
    const D=window.__r.ev.filter(e=>e.T==='death');
    const HS=window.__r.ev.filter(e=>e.T==='hitstop');
    const dead=(h)=>D.some(d=>d.id===h.target&&Math.abs(d.tick-h.tick)<=1);
    const W=[window.__r.phaseStart||0,E.tick];
    const inW=(e)=>e.tick>=W[0]&&e.tick<=W[1];
    const arcNK=H.filter(h=>inW(h)&&isArc(h)&&!dead(h));
    const ranNK=H.filter(h=>inW(h)&&!isArc(h)&&!dead(h));
    const kills=D.filter(inW);
    const stop=(t)=>HS.find(s=>s.tick>=t&&s.tick<=t+2)||null;
    const dw=(a)=>{const v=a.map(h=>window.__r.dwell(h.tick)).filter(x=>x!=null).sort((x,y)=>x-y);
      return {n:v.length,min:v[0],median:v[Math.floor(v.length/2)],p90:v[Math.floor(v.length*0.9)],max:v[v.length-1],over40:v.filter(x=>x>40).length,over30:v.filter(x=>x>30).length};};
    const rt=(a)=>{const v=a.map(h=>window.__r.rate(h.tick,150)).filter(x=>x!=null).sort((x,y)=>x-y);
      return {n:v.length,min:v[0],median:v[Math.floor(v.length/2)],max:v[v.length-1]};};
    const causes={};for(const s of HS.filter(inW))causes[s.cause+':'+s.ticks]=(causes[s.cause+':'+s.ticks]||0)+1;
    return {phase:'${tag}',window:W,fps:E.fps,ver:E.version,
      arcNonKill:arcNK.length,arcWithHitstop:arcNK.filter(h=>stop(h.tick)).length,
      rangedNonKill:ranNK.length,rangedWithHitstop:ranNK.filter(h=>stop(h.tick)).length,
      kills:kills.length,killWithHitstop:kills.filter(d=>stop(d.tick)).length,
      hitstopTotal:HS.filter(inW).length,causes,
      arcDwell:dw(arcNK),rangedDwell:dw(ranNK),killDwell:dw(kills),
      arcRate150:rt(arcNK),killRate150:rt(kills),
      baselineDwell:window.__r.dwellStats(W[0],W[1]),baselineRate150:window.__r.rateStats(W[0],W[1],150)}`)),
  ev(iife(`${CLS}
    const H=window.__r.ev.filter(e=>e.T==='hit');const D=window.__r.ev.filter(e=>e.T==='death');
    const HS=window.__r.ev.filter(e=>e.T==='hitstop');
    const dead=(h)=>D.some(d=>d.id===h.target&&Math.abs(d.tick-h.tick)<=1);
    const arcNK=H.filter(h=>h.tick>=(window.__r.phaseStart||0)&&isArc(h)&&!dead(h));
    return {phase:'${tag}',arcRows:arcNK.slice(0,24).map(h=>[h.tick,h.source,h.shape||'?',h.amount,window.__r.dwell(h.tick),window.__r.rate(h.tick,150),(HS.find(s=>s.tick>=h.tick&&s.tick<=h.tick+2)||{}).cause||'none']),
      killRows:D.filter(d=>d.tick>=(window.__r.phaseStart||0)).slice(0,12).map(d=>[d.tick,d.kind||d.id,window.__r.dwell(d.tick),window.__r.rate(d.tick,150),(HS.find(s=>s.tick>=d.tick&&s.tick<=d.tick+2)||{}).cause||'none'])}`)),
];

/* ---------------- probe 1: boss room, kill-free arc grind + in-capture kill control ------- */
const boss = [
  ev(ARM),
  ev(iife(`E.cmd('startRun');return {seed:E.seed,boot:E.bootSeed,tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<30000){if(E.state().run.active)break;await sleep(8);}
    return {skip:!!E.cmd('skipToRoom',8),tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<60000){const b=E.state().run.boss;
      if(b&&b.active)return {ok:true,tick:E.tick,boss:[b.id,b.name,b.hp],fps:E.fps};await sleep(20);}
    return {ok:false,tick:E.tick}`)),
  ev(iife(`E.cmd('iframe',0,300000);const b=E.state().run.boss;window.__r.bossId=b&&b.id;
    E.cmd('teleport',b.x+1.4,b.z);E.cmd('mark',b.id);
    window.__r.pin=setInterval(()=>{try{E.cmd('bossHp',1);for(const e of E.state().enemies){if(e.id!==window.__r.bossId)E.cmd('setHp',e.id,1);}}catch(err){window.__r.perr=String(err)}},150);
    window.__r.phaseStart=E.tick;return {phaseStart:E.tick,boss:[b.id,b.hp]}`)),
  mv(800,450),
  ev(aiife(`const t0=performance.now();let n=0;while(performance.now()-t0<58000){const s=E.state();const b=s.run.boss;
      if(b&&n%8===0){E.cmd('teleport',b.x+1.2,b.z);E.cmd('rally');}
      if(s.party[0].hp<70)E.cmd('setHp',0,1);
      for(const p of s.party)if(p.hp<=0)E.cmd('setHp',p.id,1);
      n++;await sleep(250);}
    return {end:E.tick,fps:E.fps,bossPct:E.state().run.boss.pct,hits:window.__r.ev.filter(e=>e.T==='hit').length,pinErr:window.__r.perr||null}`)),
  shot('certC2-ref1-boss-grind'),
  ...REPORT('A-killfree-arc'),
  ev(iife(`const H=window.__r.ev.filter(e=>e.T==='hit');
    return {sampleHitObjects:H.slice(0,3),eventTypesSeenInRing:window.__r.types,
      stateKeys:Object.keys(E.state()),toggles:E.state().toggles||null}`)),
  // ---- in-capture positive control: let things die in the SAME room/scope ----
  ev(iife(`clearInterval(window.__r.pin);
    window.__r.pin=setInterval(()=>{try{E.cmd('bossHp',1);}catch(err){}},150);
    const b=E.state().run.boss;for(let i=0;i<4;i++)E.cmd('spawn','boar',b.x-1.5+i*1.0,b.z+1.6);
    window.__r.phaseStart=E.tick;return {controlStart:E.tick,enemies:E.state().enemies.length}`)),
  ev(aiife(`const t0=performance.now();let n=0;
    while(performance.now()-t0<26000){const s=E.state();const b=s.run.boss;
      if(n%10===0&&s.enemies.filter(e=>e.id!==window.__r.bossId).length<2){for(let i=0;i<3;i++)E.cmd('spawn','boar',b.x-1.2+i*1.1,b.z+1.7);}
      for(const p of s.party)if(p.hp<=0)E.cmd('setHp',p.id,1);
      if(s.party[0].hp<70)E.cmd('setHp',0,1);
      n++;await sleep(250);}
    return {end:E.tick,deaths:window.__r.ev.filter(e=>e.T==='death').length,fps:E.fps}`)),
  ...REPORT('B-kill-control'),
  ev(iife(`clearInterval(window.__r.pin);const HS=window.__r.ev.filter(e=>e.T==='hitstop');
    return {allHitstops:HS.map(s=>[s.tick,s.cause,s.ticks]).slice(0,40),hitstopCount:HS.length,
      totals:window.__r.ev.reduce((m,e)=>((m[e.T]=(m[e.T]||0)+1),m),{}),tick:E.tick,ver:E.version}`)),
];

/* ---------------- probe 2: ordinary room, pinned boars, arcs on non-boss victims ---------- */
const arena = [
  ev(ARM),
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<30000){if(E.state().run.active)break;await sleep(8);}
    E.cmd('skipToRoom',3);await sleep(1500);return {tick:E.tick,room:E.state().room,enemies:E.state().enemies.length}`)),
  ev(iife(`E.cmd('iframe',0,300000);
    window.__r.pin=setInterval(()=>{try{for(const e of E.state().enemies)E.cmd('setHp',e.id,1);}catch(err){window.__r.perr=String(err)}},90);
    window.__r.phaseStart=E.tick;return {phaseStart:E.tick,enemies:E.state().enemies.map(e=>[e.id,e.kind,e.hp])}`)),
  mv(800,450),
  ev(aiife(`const t0=performance.now();let n=0;
    while(performance.now()-t0<55000){const s=E.state();const en=s.enemies;
      if(en.length<3){for(let i=en.length;i<4;i++)E.cmd('spawn','boar',s.party[0].x-2+i*1.2,s.party[0].z+2);}
      if(n%6===0&&en.length){E.cmd('teleport',en[0].x+1.0,en[0].z);E.cmd('rally');}
      for(const p of s.party)if(p.hp<=0)E.cmd('setHp',p.id,1);
      if(s.party[0].hp<70)E.cmd('setHp',0,1);
      n++;await sleep(250);}
    return {end:E.tick,fps:E.fps,hits:window.__r.ev.filter(e=>e.T==='hit').length,deaths:window.__r.ev.filter(e=>e.T==='death').length,pinErr:window.__r.perr||null}`)),
  shot('certC2-ref1-arena-grind'),
  ...REPORT('A-pinned-boars-arc'),
  // control: stop pinning, let the same allies kill the same boars in the same room
  ev(iife(`clearInterval(window.__r.pin);window.__r.phaseStart=E.tick;return {controlStart:E.tick}`)),
  ev(aiife(`const t0=performance.now();let n=0;
    while(performance.now()-t0<22000){const s=E.state();
      if(s.enemies.length<3){for(let i=s.enemies.length;i<4;i++)E.cmd('spawn','boar',s.party[0].x-2+i*1.2,s.party[0].z+2);}
      for(const p of s.party)if(p.hp<=0)E.cmd('setHp',p.id,1);
      if(s.party[0].hp<70)E.cmd('setHp',0,1);
      n++;await sleep(250);}
    return {end:E.tick,deaths:window.__r.ev.filter(e=>e.T==='death').length,fps:E.fps}`)),
  ...REPORT('B-kill-control'),
  ev(iife(`const HS=window.__r.ev.filter(e=>e.T==='hitstop');
    return {hitstopCount:HS.length,causes:HS.reduce((m,s)=>((m[s.cause+':'+s.ticks]=(m[s.cause+':'+s.ticks]||0)+1),m),{}),
      totals:window.__r.ev.reduce((m,e)=>((m[e.T]=(m[e.T]||0)+1),m),{}),ver:E.version,tick:E.tick}`)),
];

/* ---------------- probe 3: scope — is ANY melee_arc in the game able to fire hitstop? ----- */
const scope = [
  ev(ARM),
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<30000){if(E.state().run.active)break;await sleep(8);}
    E.cmd('skipToRoom',3);await sleep(1200);const s=E.state();
    return {tick:E.tick,skills:s.skills,build:s.build}`)),
  ev(iife(`const ids=['heavy_slam','brutal_cleave','flurry','lunge_strike','restorative_wave','cleave',
      'blade_storm','caltrops','whirling_guard','ground_crack','sundering_nova','volley','piercing_shot',
      'detonating_charge','mending_arc','sweeping_light','radiant_arc'];
    const out={};for(const id of ids){try{out[id]=JSON.stringify(E.cmd('giveSkill',id)).slice(0,80);}catch(err){out[id]='THREW '+err.message}}
    return {giveSkill:out,skillsAfter:E.state().skills}`)),
  ev(iife(`window.__r.phaseStart=E.tick;const s=E.state();
    for(const p of s.party)if(p.id!==0)E.cmd('setHp',p.id,0.35);
    return {phaseStart:E.tick,party:s.party.map(p=>[p.id,p.kind,p.hp])}`)),
  mv(800,450),
  ev(aiife(`const keys=['Digit1','Digit2','Digit3','Digit4','KeyQ','KeyE','KeyR','KeyF'];
    const t0=performance.now();let n=0;
    while(performance.now()-t0<30000){const s=E.state();
      if(s.enemies.length<3){for(let i=s.enemies.length;i<4;i++)E.cmd('spawn','boar',s.party[0].x-1.5+i*1.0,s.party[0].z+1.6);}
      for(const p of s.party)if(p.id!==0&&p.hp>30)E.cmd('setHp',p.id,0.3);
      for(const p of s.party)if(p.hp<=0)E.cmd('setHp',p.id,1);
      if(s.party[0].hp<70)E.cmd('setHp',0,1);
      const k=keys[n%keys.length];
      window.dispatchEvent(new KeyboardEvent('keydown',{code:k,key:k.slice(-1).toLowerCase(),bubbles:true}));
      document.dispatchEvent(new KeyboardEvent('keydown',{code:k,key:k.slice(-1).toLowerCase(),bubbles:true}));
      await sleep(60);
      window.dispatchEvent(new KeyboardEvent('keyup',{code:k,key:k.slice(-1).toLowerCase(),bubbles:true}));
      document.dispatchEvent(new KeyboardEvent('keyup',{code:k,key:k.slice(-1).toLowerCase(),bubbles:true}));
      n++;await sleep(140);}
    return {end:E.tick,casts:window.__r.ev.filter(e=>e.T==='skill_cast'||e.T==='ally_cast').length,
      heals:window.__r.ev.filter(e=>e.T==='heal').length,hits:window.__r.ev.filter(e=>e.T==='hit').length}`)),
  ev(iife(`const shapes={};for(const e of window.__r.ev){if(e.shape){const k=e.T+'|'+(e.skill||e.source||e.classId||'?')+'|'+e.shape;shapes[k]=(shapes[k]||0)+1;}}
    const HS=window.__r.ev.filter(e=>e.T==='hitstop');
    return {shapesSeen:shapes,hitstops:HS.map(s=>[s.tick,s.cause,s.ticks]).slice(0,30),hitstopCount:HS.length,
      deaths:window.__r.ev.filter(e=>e.T==='death').length,
      healEvents:window.__r.ev.filter(e=>e.T==='heal').slice(0,3),
      totals:window.__r.ev.reduce((m,e)=>((m[e.T]=(m[e.T]||0)+1),m),{}),ver:E.version}`)),
];

mkdirSync('tools/actions',{recursive:true});
writeFileSync('tools/actions/certC2-ref1-boss.json',JSON.stringify(boss,null,1));
writeFileSync('tools/actions/certC2-ref1-arena.json',JSON.stringify(arena,null,1));
writeFileSync('tools/actions/certC2-ref1-scope.json',JSON.stringify(scope,null,1));
console.log('wrote 3 action files',boss.length,arena.length,scope.length);
