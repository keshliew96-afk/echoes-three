// Certification critic — block C (responsiveness), ROUND 2. Fresh measurement
// on the current build. Writes tools/actions/certC2-*.json programmatically.
// Helpers adapted from tools/certC1-gen.mjs (previous C critic) + tools/cert-gen.mjs.
// Every eval shares ONE page scope; all code is IIFE-wrapped; async IIFEs poll
// window.__echoes every ~4 ms and RETURN observed state so it lands in
// captures/<name>.console.txt as [EVAL].
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const waitFor = (cond, timeout = 20000, extra = '') =>
  ev(aiife(`const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await sleep(4);}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}`));

const EVT = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','spawn_telegraph','spawn_blocked',
  'telegraph_start','telegraph_resolve','enemy_fire','enemy_bite','hit','hit_immune','death','hitstop','sound','heal',
  'intent','intent_denied','dash_end','dash','dodge','downed','revive','boss_spawn','boss_quake_start','boss_quake_resolve','boss_trample',
  'boss_adds','boss_death','run_end','defeat','victory','reward','draft_taken','path_chosen','eshot_despawn','zone_spawn','enemy_despawn',
  'basic_fire','skill_cast','ally_cast','ally_basic','screenshake','flash','knockback'];

// Event bus + per-rAF sampler (one row per NEW sim tick) + deduped numeral DOM observer.
const arm = ev(iife(`
  window.__c={ev:[],rows:[],dom:[],keys:[],ticksSeen:0,frames:0,started:performance.now(),sampleOn:true,grabOn:false,grabs:[],buf:{}};
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t,ms:Math.round(performance.now()-window.__c.started)},e)));
  window.addEventListener('keydown',e=>{if(e.repeat)return;const s=E.state();const p=s.party[0];window.__c.keys.push({key:e.code,t:E.tick,ms:Math.round(performance.now()-window.__c.started),x:p.x,z:p.z,dash:p.dashTicksLeft});},true);
  window.addEventListener('keyup',e=>{const s=E.state();const p=s.party[0];window.__c.keys.push({key:e.code,upT:E.tick,t:E.tick,up:true,ms:Math.round(performance.now()-window.__c.started),x:p.x,z:p.z});},true);
  const L=document.querySelector('#dmg-num-layer');window.__c.numLayer=!!L;
  const lastKey=new WeakMap();
  if(L){const mo=new MutationObserver(muts=>{const t=E.tick;const seen=new Set();for(const m of muts){const n=m.target.nodeType===3?m.target.parentElement:m.target;const el=n&&n.closest?n.closest('.dmg-num'):null;if(!el||seen.has(el))continue;seen.add(el);const cs=getComputedStyle(el);const vis=!(cs.display==='none'||cs.opacity==='0'||cs.visibility==='hidden'||!el.textContent);const k=el.textContent+'|'+vis;if(lastKey.get(el)===k)continue;lastKey.set(el,k);if(!vis)continue;const r=el.getBoundingClientRect();window.__c.dom.push({t,txt:el.textContent,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),col:cs.color});}});mo.observe(L,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});}
  let last=-1;const f=()=>{window.__c.frames++;if(window.__c.sampleOn){const t=E.tick;if(t!==last){last=t;const s=E.state();const p=s.party[0];const cam=(window.__arenaProbe&&window.__arenaProbe.stage)?window.__arenaProbe.stage.camera.position:null;const en={};for(const e of s.enemies)en[e.id]=[+e.x.toFixed(3),+e.z.toFixed(3),e.hp,e.kbTicks];const vfx=s.vfx||{};const num=vfx.numerals??(vfx.arena&&vfx.arena.numerals)??null;window.__c.rows.push({t,ms:Math.round(performance.now()-window.__c.started),px:+p.x.toFixed(4),pz:+p.z.toFixed(4),dash:p.dashTicksLeft,hp:p.hp,cam:cam?[+cam.x.toFixed(4),+cam.y.toFixed(4),+cam.z.toFixed(4)]:null,num,en});window.__c.ticksSeen++;if(window.__c.rows.length>16000)window.__c.rows.splice(0,6000);}}requestAnimationFrame(f);};requestAnimationFrame(f);
  return 'armed t'+E.tick+' ver '+E.version+' numLayer '+window.__c.numLayer+' probe '+!!window.__arenaProbe`));

const PROJ = `const P=window.__arenaProbe;const cam=P.stage.camera;const V=P.root.position.constructor;const W=window.innerWidth,H=window.innerHeight;const proj=(x,y,z)=>{const v=new V(x,y,z);v.project(cam);return [Math.round((v.x*0.5+0.5)*W),Math.round((-v.y*0.5+0.5)*H)];};`;
const startRun = ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,ver:E.version,modes:r&&r.frame&&r.frame.modes,room:r&&r.room,tick:E.tick}`));
const LIVE = `(()=>{const s=E.state();return s.run.active&&s.run.combatActive&&s.enemies.length>0})()`;
const waitLive = waitFor(LIVE, 40000, `,enemies:E.state().enemies.length,phase:E.state().run.phase`);
const snap = (tag) => ev(iife(`const s=E.state();const r=s.run;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,scene:s.scene,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,enemies:s.enemies.length,party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.downed]),ui:E.runUi().screen,threat:(({gated,offFrame,markersDrawn,domMarkers,uncued})=>({gated,offFrame,markersDrawn,domMarkers,uncued}))(E.hud.threat())}`));
const coverage = ev(iife(`const r=window.__c.rows;let gaps=0,maxGap=0;for(let i=1;i<r.length;i++){const g=r[i].t-r[i-1].t;if(g>1){gaps+=g-1;maxGap=Math.max(maxGap,g);}}return {ticksSeen:window.__c.ticksSeen,frames:window.__c.frames,fps:E.fps,missedTicks:gaps,maxTickGap:maxGap,span:r.length?r[r.length-1].t-r[0].t:0}`));
const errs = ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {tick:E.tick,counts:m}`));

const files = {};

// ================= C1: movement latency =================
const analyzeMoves = ev(iife(`
  const rows=window.__c.rows;const keys=window.__c.keys.filter(k=>!k.up);const out=[];
  const dirOf={KeyD:[1,0],KeyA:[-1,0],KeyW:[0,-1],KeyS:[0,1]};
  for(const k of keys){const d=dirOf[k.key];if(!d)continue;
    let first=null;const after=rows.filter(r=>r.t>=k.t&&r.t<=k.t+30);
    for(const r of after){const dx=r.px-k.x,dz=r.pz-k.z;const along=dx*d[0]+dz*d[1];if(along>1e-6){first={t:r.t,along:+along.toFixed(4),ticksOfTravel:Math.round(along/0.04)};break;}}
    const sampled=after.filter(r=>r.t<=k.t+4).map(r=>r.t+'@'+(r.px-k.x).toFixed(2)+','+(r.pz-k.z).toFixed(2));
    const raw=first?first.t-k.t:null;const corr=first?Math.max(1,raw-(Math.max(1,first.ticksOfTravel)-1)):null;
    out.push({key:k.key,t0:k.t,firstMoveTick:first&&first.t,along:first&&first.along,rawLatency:raw,correctedLatency:corr,sampled});}
  const byKey={};for(const o of out){byKey[o.key]=byKey[o.key]||[];byKey[o.key].push(o.correctedLatency+'/'+o.rawLatency);}
  return {byKey,worstCorrected:Math.max(...out.map(o=>o.correctedLatency??99)),worstRaw:Math.max(...out.map(o=>o.rawLatency??99)),n:out.length,trials:out.map(o=>[o.key,o.t0,o.firstMoveTick,o.correctedLatency,o.rawLatency])}`));
const moveTrial = (k) => [down(k), wait(150), up(k), wait(220)];
const altPair = [down('KeyD'), wait(100), up('KeyD'), down('KeyA'), wait(100), up('KeyA')];
files['certC2-move'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,3600);E.cmd('teleport',-3,2);return 'iframe+tp t'+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 }, wait(250),
  ev(iife(`window.__c.keys.length=0;return {t:E.tick,hp:E.state().party[0].hp,enemies:E.state().enemies.length,phase:E.state().run.phase}`)),
  ...['KeyD','KeyA','KeyW','KeyS','KeyD','KeyA','KeyW','KeyS','KeyD','KeyA','KeyW','KeyS','KeyD','KeyA','KeyW','KeyS','KeyD','KeyA','KeyW','KeyS'].flatMap(moveTrial),
  analyzeMoves,
  ev(iife(`const ks=window.__c.keys.filter(k=>!k.up).slice(0,4);return ks.map(k=>({key:k.key,t0:k.t,trace:window.__c.rows.filter(r=>r.t>=k.t-2&&r.t<=k.t+8).map(r=>r.t+':'+r.px.toFixed(2)+','+r.pz.toFixed(2)).join(' ')}))`)),
  // alternation, i-frames OFF (natural fight)
  ev(iife(`window.__c.keys.length=0;E.cmd('iframe',0,0);E.cmd('teleport',0,2);window.__c.altStart=E.tick;return {altStart:E.tick,phase:E.state().run.phase,enemies:E.state().enemies.length,hp:E.state().party[0].hp}`)),
  wait(150),
  ...Array(10).fill(0).flatMap(() => altPair),
  wait(250),
  ev(iife(`
    const rows=window.__c.rows.filter(r=>r.t>=window.__c.altStart);const keys=window.__c.keys.filter(k=>!k.up);const out=[];
    for(let i=0;i<keys.length;i++){const k=keys[i];const sign=k.key==='KeyD'?1:-1;let flip=null;
      for(let j=1;j<rows.length;j++){const r=rows[j],q=rows[j-1];if(r.t<=k.t)continue;const vx=r.px-q.px;if(vx*sign>1e-6){flip={t:r.t,vx:+vx.toFixed(4),span:r.t-q.t};break;}if(r.t>k.t+30)break;}
      const raw=flip?flip.t-k.t:null;const corr=flip?Math.max(1,raw-(flip.span-1)):null;
      out.push({i,key:k.key,t0:k.t,flipTick:flip&&flip.t,rawLatency:raw,correctedLatency:corr,span:flip&&flip.span});}
    const trace=[];for(let j=1;j<rows.length;j++){const vx=rows[j].px-rows[j-1].px;trace.push(rows[j].t+(vx>1e-6?'+':vx<-1e-6?'-':'0'));}
    return {n:out.length,flips:out.map(o=>[o.i,o.key,o.t0,o.flipTick,o.correctedLatency,o.rawLatency,o.span]),worstCorrected:Math.max(...out.map(o=>o.correctedLatency??99)),worstRaw:Math.max(...out.map(o=>o.rawLatency??99)),hitsOnPlayer:window.__c.ev.filter(e=>e.T==='hit'&&e.target===0&&e.tick>=window.__c.altStart).map(e=>e.tick),trace:trace.join(' ')}`)),
  coverage, snap('move-end'),
];

// ================= C2: dash latency + i-frames =================
const dashTrial = (n) => [
  ev(iife(`window.__c.keys.length=0;window.__c.evMark=window.__c.ev.length;return {trial:${n},t:E.tick,dodgeReadyTick:E.state().party[0].dodgeReadyTick}`)),
  down('Space'), up('Space'),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<1400){const q=E.state().party[0];if(q.dashTicksLeft===0&&window.__c.ev.slice(window.__c.evMark).some(e=>e.T==='dash_end'))break;await sleep(4);}
    const k=window.__c.keys.find(k=>!k.up);
    const evs=window.__c.ev.slice(window.__c.evMark).filter(e=>['intent','intent_denied','dash_end','sound'].includes(e.T)).map(e=>[e.T,e.tick,e.kind||e.slot||e.cause,e.reason]);
    const intent=window.__c.ev.slice(window.__c.evMark).find(e=>e.T==='intent'&&e.kind==='dodge');
    const fr=window.__c.rows.find(r=>k&&r.t>=k.t&&r.dash>0);
    const de=window.__c.ev.slice(window.__c.evMark).find(e=>e.T==='dash_end');
    const p0=k?[k.x,k.z]:null;const p1=E.state().party[0];const dist=p0?Math.hypot(p1.x-p0[0],p1.z-p0[1]):null;
    return {trial:${n},keydownTick:k&&k.t,intentTick:intent&&intent.tick,latencyIntent:(k&&intent)?intent.tick-k.t:null,firstDashRow:fr&&[fr.t,fr.dash],latencyRows:(k&&fr)?fr.t-k.t:null,dashEnd:de&&[de.tick,de.cause],durationTicks:(intent&&de)?de.tick-intent.tick:null,travelU:dist!=null?+dist.toFixed(3):null,evs,dashRows:window.__c.rows.filter(r=>k&&r.t>=k.t-1&&r.t<=k.t+20).map(r=>r.t+':'+r.dash).join(' ')}`)),
  wait(1400),
];
const iframeTrial = (n, double) => [
  ev(iife(`window.__c.keys.length=0;window.__c.evMark=window.__c.ev.length;E.cmd('setHp',0,1);return {iframeTrial:${n},t:E.tick,hp:E.state().party[0].hp}`)),
  down('Space'), up('Space'),
  ev(aiife(`const k=window.__c.keys.find(k=>!k.up);const t0=performance.now();let p=E.state().party[0];while(performance.now()-t0<500&&p.dashTicksLeft===0){await sleep(2);p=E.state().party[0];}
    const hpA=p.hp;const tA=E.tick;const dashA=p.dashTicksLeft;const nA=window.__c.ev.length;const rA=E.cmd('hitOnce',0);${double ? "await sleep(30);E.cmd('hitOnce',0);" : ''}
    await sleep(40);const pB=E.state().party[0];const tB=E.tick;const evA=window.__c.ev.slice(nA).filter(e=>['hit','hit_immune','sound','hitstop'].includes(e.T)).map(e=>[e.T,e.tick,e.target,e.amount,e.slot,e.reason]);
    while(performance.now()-t0<1500){const q=E.state().party[0];if(q.dashTicksLeft===0&&window.__c.ev.slice(window.__c.evMark).some(e=>e.T==='dash_end'))break;await sleep(4);}
    await sleep(60);const pC=E.state().party[0];const tC=E.tick;const nC=window.__c.ev.length;const rC=E.cmd('hitOnce',0);await sleep(80);const pD=E.state().party[0];
    const evC=window.__c.ev.slice(nC).filter(e=>['hit','hit_immune','sound','hitstop'].includes(e.T)).map(e=>[e.T,e.tick,e.target,e.amount,e.slot,e.reason]);
    const de=window.__c.ev.slice(window.__c.evMark).find(e=>e.T==='dash_end');const it=window.__c.ev.slice(window.__c.evMark).find(e=>e.T==='intent'&&e.kind==='dodge');
    return {iframeTrial:${n},keydownTick:k&&k.t,intentTick:it&&it.tick,duringDash:{tick:tA,dashTicksLeft:dashA,hpBefore:hpA,hpAfter:pB.hp,tickAfter:tB,cmdResult:rA,events:evA},dashEnd:de&&[de.tick,de.cause],afterDash:{tick:tC,dashTicksLeft:pC.dashTicksLeft,hpBefore:pC.hp,hpAfter:pD.hp,cmdResult:rC,events:evC}}`)),
  wait(1400),
];
// Natural attack through the dash: adjacent Thorn Boar bites before / during / after.
const biteTrial = (n, bx) => [
  ev(iife(`E.cmd('killAllEnemies');E.cmd('teleport',-3,2.5);E.cmd('setHp',0,1);return {biteTrial:${n},tick:E.tick,hp:E.state().party[0].hp}`)),
  wait(350),
  ev(iife(`window.__c.keys.length=0;window.__c.evMark=window.__c.ev.length;const p=E.state().party[0];const r=E.cmd('spawn','boar',p.x+${bx},p.z);const s=E.state();const b=s.enemies.find(e=>e.kind==='boar'&&Math.abs(e.x-(p.x+${bx}))<0.35&&Math.abs(e.z-p.z)<0.35);window.__c.boarId=b?b.id:null;if(b)E.cmd('iframe',b.id,1200);return {spawn:r,boarId:window.__c.boarId,boar:b&&[b.x,b.z],player:[p.x,p.z],tick:E.tick,hp:p.hp}`)),
  ev(aiife(`const t0=performance.now();let bite=null;while(performance.now()-t0<3000){bite=window.__c.ev.slice(window.__c.evMark).find(e=>e.T==='enemy_bite'&&e.target===0&&e.id===window.__c.boarId);if(bite)break;await sleep(3);}
    if(!bite)return {ok:false,reason:'no first bite',tick:E.tick,evs:window.__c.ev.slice(window.__c.evMark).map(e=>[e.T,e.tick,e.target,e.id]).slice(0,20)};
    window.__c.bite1=bite.tick;while(performance.now()-t0<3000){if(E.tick-window.__c.bite1>=41)break;await sleep(2);}
    const p=E.state().party[0];const b=E.state().enemies.find(e=>e.id===window.__c.boarId);
    return {ok:true,bite1:window.__c.bite1,nowTick:E.tick,hp:p.hp,player:[+p.x.toFixed(2),+p.z.toFixed(2)],boar:b&&[+b.x.toFixed(2),+b.z.toFixed(2),b.hp],dist:b?+Math.hypot(b.x-p.x,b.z-p.z).toFixed(3):null}`)),
  down('KeyD'), down('Space'), wait(330), up('Space'), up('KeyD'),
  wait(1700),
  ev(iife(`const k=window.__c.keys.filter(k=>!k.up).map(k=>[k.key,k.t]);const ev=window.__c.ev.slice(window.__c.evMark);
    const it=ev.find(e=>e.T==='intent'&&e.kind==='dodge');const de=ev.find(e=>e.T==='dash_end');
    const bites=ev.filter(e=>e.T==='enemy_bite'&&e.target===0).map(e=>e.tick);
    const hits=ev.filter(e=>(e.T==='hit'||e.T==='hit_immune')&&e.target===0).map(e=>[e.T,e.tick,e.amount??e.reason]);
    const dashSpan=it&&de?[it.tick,de.tick]:null;const inDash=(t)=>dashSpan&&t>=dashSpan[0]&&t<=dashSpan[1];
    return {trial:${n},keys:k,intentTick:it&&it.tick,dashEnd:de&&[de.tick,de.cause],dashSpan,bites,hitsOnPlayer:hits,bitesDuringDash:bites.filter(inDash),hitsDuringDash:hits.filter(h=>inDash(h[1])),bitesAfterDash:bites.filter(t=>de&&t>de.tick),hpTrace:window.__c.rows.filter(r=>r.t>=window.__c.bite1-2&&de&&r.t<=de.tick+100).map(r=>r.t+':'+r.hp+(r.dash>0?'d':'')).join(' '),denied:ev.filter(e=>e.T==='intent_denied').map(e=>[e.tick,e.kind,e.reason])}`)),
];
files['certC2-dash'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('teleport',-2,2);return 'tp t'+E.tick`)),
  { type: 'mousemove', x: 1100, y: 450 }, wait(250),
  ...dashTrial(1), ...dashTrial(2), ...dashTrial(3), ...dashTrial(4), ...dashTrial(5),
  ...iframeTrial(1, false), ...iframeTrial(2, true), ...iframeTrial(3, false),
  ...biteTrial(1, 0.55), ...biteTrial(2, 0.55),
  ev(iife(`const rows=window.__c.rows;const dashTicks=new Set(rows.filter(r=>r.dash>0).map(r=>r.t));const hits=window.__c.ev.filter(e=>e.T==='hit'&&e.target===0);const imm=window.__c.ev.filter(e=>e.T==='hit_immune'&&e.target===0);return {hitsOnPlayerDuringDash:hits.filter(h=>dashTicks.has(h.tick)).map(h=>h.tick),hitsOnPlayerTotal:hits.length,immuneOnPlayer:imm.map(e=>[e.tick,e.reason]),dashTickCount:dashTicks.size}`)),
  errs, coverage, snap('dash-end'),
];

// ================= C3: telegraphs =================
const teleTable = ev(iife(`
  const ev=window.__c.ev;const starts=ev.filter(e=>e.T==='telegraph_start');const res=ev.filter(e=>e.T==='telegraph_resolve');
  const used=new Set();const pairs=starts.map(s=>{let ri=-1;for(let i=0;i<res.length;i++){if(!used.has(i)&&res[i].id===s.id&&res[i].tick>=s.tick){ri=i;break;}}const r=ri>=0?res[ri]:null;if(r)used.add(ri);return {id:s.id,tgt:s.target,t:s.tick,rt:s.resolveTick,plan:s.resolveTick-s.tick,obs:r?r.tick:null,gap:r?r.tick-s.tick:null};});
  const gaps=pairs.filter(p=>p.gap!=null).map(p=>p.gap);const plans=pairs.map(p=>p.plan);
  const unresolved=pairs.filter(p=>p.gap==null).map(p=>{const d=ev.find(e=>e.T==='death'&&e.id===p.id&&e.tick>=p.t);const dd=ev.find(e=>e.T==='enemy_despawn'&&e.id===p.id&&e.tick>=p.t);return Object.assign({},p,{deathTick:d&&d.tick,despawnTick:dd&&dd.tick});});
  const fires=ev.filter(e=>e.T==='enemy_fire');const fireAtResolve=fires.filter(f=>res.some(r=>r.id===f.id&&r.tick===f.tick)).length;
  const bq=ev.filter(e=>e.T==='boss_quake_start').map(s=>{const r=ev.find(x=>x.T==='boss_quake_resolve'&&x.tick>=s.tick);return [s.tick,s.resolveTick-s.tick,r&&r.tick,r?r.tick-s.tick:null];});
  const spanTicks=ev.length?E.tick-ev[0].tick:0;
  return {spanTicks,spanSec:+(spanTicks/60).toFixed(1),telegraphs:pairs.length,resolved:gaps.length,minGap:gaps.length?Math.min(...gaps):null,maxGap:gaps.length?Math.max(...gaps):null,minPlanned:Math.min(...plans),maxPlanned:Math.max(...plans),fires:fires.length,fireAtResolveTick:fireAtResolve,bosseQuakes:bq,unresolved,pairs:pairs.map(p=>[p.id,p.t,p.rt,p.plan,p.obs,p.gap])}`));
const progressLoop = (ms, minTickAfter) => aiife(`const t0=performance.now();const mark=E.tick;while(performance.now()-t0<${ms}){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');const p=E.state().party[0];if(p.hp<30)E.cmd('setHp',0,1);const live=window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.tick>mark+${minTickAfter}&&e.resolveTick-E.tick>=28&&e.resolveTick>E.tick);if(live.length){${PROJ}const s=live[live.length-1];return {ok:true,tick:E.tick,tele:{id:s.id,target:s.target,x:s.x,z:s.z,start:s.tick,resolveTick:s.resolveTick,ticksLeft:s.resolveTick-E.tick,screen:proj(s.x,0.02,s.z),box:[proj(s.x-0.6,0.02,s.z-0.6),proj(s.x+0.6,0.02,s.z+0.6),proj(s.x-0.6,0.02,s.z+0.6),proj(s.x+0.6,0.02,s.z-0.6)]},enemies:E.state().enemies.length};}await sleep(4);}return {ok:false,tick:E.tick}`);
const liveTele = ev(iife(`${PROJ}const s=E.state();const live=window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).map(e=>({id:e.id,x:e.x,z:e.z,start:e.tick,resolveTick:e.resolveTick,left:e.resolveTick-E.tick,screen:proj(e.x,0.02,e.z),box:[proj(e.x-0.6,0.02,e.z-0.6),proj(e.x+0.6,0.02,e.z+0.6)]}));return {afterShotTick:E.tick,live,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),proj(e.x,0.4,e.z)]),player:proj(s.party[0].x,0.4,s.party[0].z),eshots:s.eshots.length}`));
files['certC2-tele'] = [
  arm, startRun, waitLive,
  { type: 'mousemove', x: 800, y: 450 },
  ev(progressLoop(60000, -1)), shot('certC2-tele-mid1'), liveTele,
  ev(progressLoop(60000, 120)), shot('certC2-tele-mid2'), liveTele,
  ev(aiife(`const t0=performance.now();let screens=[];let heals=0;while(performance.now()-t0<75000){const u=E.runUi();if(u.screen==='draft'){E.cmd('draftDecline');screens.push('draft@'+E.tick);}else if(u.screen==='path'){E.cmd('pathChoose',0);screens.push('path@'+E.tick);}else if(u.screen==='shop'){E.cmd('shopAdvance');screens.push('shop@'+E.tick);}else if(u.screen==='defeat'||u.screen==='victory'){screens.push(u.screen+'@'+E.tick);break;}const p=E.state().party[0];if(p.hp<30){E.cmd('setHp',0,1);heals++;}await sleep(100);}return {tick:E.tick,fps:E.fps,screens,heals,room:E.state().run.room,phase:E.state().run.phase}`)),
  teleTable, errs, coverage, snap('tele-end'),
];

// clean frame: no enemies, no live telegraph
files['certC2-clean'] = [
  arm, startRun, waitLive, { type: 'mousemove', x: 800, y: 450 },
  wait(2500),
  ev(iife(`E.cmd('killAllEnemies');window.__c.killT=E.tick;return {tick:E.tick}`)),
  waitFor(`E.state().enemies.length===0&&!window.__c.ev.some(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick)&&E.tick-window.__c.killT>=8`, 6000, `,enemies:E.state().enemies.length`),
  shot('certC2-clean-between'),
  ev(iife(`${PROJ}const s=E.state();return {tick:E.tick,enemies:s.enemies.length,pending:s.room&&s.room.pendingSpawns,liveTele:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).length,eshots:s.eshots.length,zones:s.zones.length,numerals:s.vfx&&(s.vfx.numerals??null),party:s.party.map(p=>[p.classId||'healer',p.hp,...proj(p.x,0.4,p.z)]),ui:E.runUi().screen}`)),
];

// ================= C4: hit feedback (events/state) =================
const hitTable = ev(iife(`
  const rows=window.__c.rows;const ev=window.__c.ev;const byT=new Map();for(const r of rows)byT.set(r.t,r);
  const rowAtOrBefore=(t)=>{for(let k=t;k>=t-6;k--){if(byT.has(k))return byT.get(k);}return null;};
  const rowsBetween=(a,b)=>rows.filter(r=>r.t>=a&&r.t<=b);
  const hits=ev.filter(e=>e.T==='hit'&&e.target>=4);const out=[];
  for(const h of hits.slice(0,60)){const t=h.tick;const pre=rowAtOrBefore(t-1);const dead=ev.some(d=>d.T==='death'&&d.id===h.target&&d.tick<=t+1&&d.tick>=t-1);
    let kbMax=0,kbFirst=null,kbTicksSeen=null;if(pre&&pre.en[h.target]){const p0=pre.en[h.target];for(const r of rowsBetween(t,t+8)){const p=r.en[h.target];if(!p)continue;const d=Math.hypot(p[0]-p0[0],p[1]-p0[1]);if(d>kbMax)kbMax=d;if(kbFirst==null&&d>0.03)kbFirst=r.t-t;if(p[3]>0&&(kbTicksSeen==null||p[3]>kbTicksSeen))kbTicksSeen=p[3];}}
    const numDom=window.__c.dom.filter(d=>d.t>=t&&d.t<=t+2&&d.txt===String(Math.round(h.amount)));
    const n0=pre?pre.num:null;const nPost=rowsBetween(t,t+2).map(r=>r.num);
    const snd=ev.filter(e=>e.T==='sound'&&e.tick>=t&&e.tick<=t+2).map(e=>e.slot);
    const hs=ev.filter(e=>e.T==='hitstop'&&e.tick>=t&&e.tick<=t+2).map(e=>e.ticks+':'+e.cause);
    const rc=ev.find(e=>e.T==='room_cleared'&&e.tick===t);
    out.push({t,tgt:h.target,amt:h.amount,src:h.source,dead,clearsRoom:!!rc,kbObs:+kbMax.toFixed(3),kbAtTick:kbFirst,kbTicksSeen,numDomHit:numDom.length,numDomPos:numDom.slice(0,1).map(d=>[d.x,d.y,d.w,d.h,d.col]),numCount:[n0,...nPost],sound:snd,hitstop:hs});}
  const ok=(o)=>({num:o.numDomHit>0||(o.numCount[0]!=null&&Math.max(...o.numCount.slice(1).map(v=>v??-1))>o.numCount[0]),kb:o.dead||o.kbObs>=0.06||o.kbTicksSeen>0,snd:o.sound.length>0});
  const verdicts=out.map(o=>Object.assign({t:o.t,dead:o.dead,clearsRoom:o.clearsRoom},ok(o)));
  const tally={num:0,kb:0,snd:0,all:0};for(const v of verdicts){if(v.num)tally.num++;if(v.kb)tally.kb++;if(v.snd)tally.snd++;if(v.num&&v.kb&&v.snd)tally.all++;}
  const fails=verdicts.filter(v=>!(v.num&&v.kb&&v.snd));
  return {hits:hits.length,analyzed:out.length,tally,failsCount:fails.length,fails,rows:out}`));
const hitstopTable = ev(iife(`
  const rows=window.__c.rows;const ev=window.__c.ev;const gaps=[];for(let i=1;i<rows.length;i++)gaps.push(rows[i].ms-rows[i-1].ms);const sorted=[...gaps].sort((a,b)=>a-b);const med=sorted[Math.floor(sorted.length/2)];
  const hs=ev.filter(e=>e.T==='hitstop').slice(0,40).map(h=>{const i=rows.findIndex(r=>r.t>=h.tick);let freeze=null;if(i>=0){const r0=rows[i];const j=rows.findIndex((r,k)=>k>i&&r.t>r0.t);if(j>0)freeze=rows[j].ms-r0.ms;}return [h.tick,h.ticks,h.cause,freeze];});
  const causes={};for(const h of ev.filter(e=>e.T==='hitstop'))causes[h.cause+':'+h.ticks]=(causes[h.cause+':'+h.ticks]||0)+1;
  const cam=rows.filter(r=>r.cam);const jerk=[];for(let i=2;i<cam.length;i++){const a=cam[i-2].cam,b=cam[i-1].cam,c=cam[i].cam;jerk.push({t:cam[i].t,j:Math.hypot(c[0]-2*b[0]+a[0],c[2]-2*b[2]+a[2])});}
  const deaths=ev.filter(e=>e.T==='death').map(e=>e.tick);const near=new Set();for(const d of deaths)for(let k=d-2;k<=d+12;k++)near.add(k);
  const base=jerk.filter(j=>!near.has(j.t)).map(j=>j.j).sort((a,b)=>a-b);const baseMed=base[Math.floor(base.length/2)]||0,baseP95=base[Math.floor(base.length*0.95)]||0;
  const thr=Math.max(0.012,baseP95*3);
  const perKill=deaths.slice(0,40).map(d=>{const w=jerk.filter(j=>j.t>=d&&j.t<=d+12);const m=w.length?Math.max(...w.map(j=>j.j)):null;return [d,m!=null?+m.toFixed(4):null,w.filter(j=>j.j>thr).length];});
  return {tickGapMedianMs:med,hitstops:hs,causes,shake:{thr:+thr.toFixed(4),baseMed:+baseMed.toFixed(5),baseP95:+baseP95.toFixed(5),perKill,killsWithShake:perKill.filter(k=>k[1]!=null&&k[1]>thr).length,kills:perKill.length}}`));
files['certC2-hits'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,3600);return 'iframe t'+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<90000){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');const n=window.__c.ev.filter(e=>e.T==='hit'&&e.target>=4).length;if(n>=32&&E.state().enemies.length>0)return {ok:true,tick:E.tick,hits:n,fps:E.fps,room:E.state().run.room};await sleep(50);}return {ok:false,tick:E.tick,hits:window.__c.ev.filter(e=>e.T==='hit'&&e.target>=4).length}`)),
  hitTable, hitstopTable, errs, coverage, snap('hits-end'),
];

// ================= C4d: room-clearing kill numeral (round-1 must-fix regression) =================
files['certC2-lastkill'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,3600);return 'iframe t'+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const t0=performance.now();const marks=[];while(performance.now()-t0<170000){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');const p=E.state().party[0];if(p.hp<40)E.cmd('setHp',0,1);const cl=window.__c.ev.filter(e=>e.T==='room_cleared').length;if(cl>=3)return {ok:true,tick:E.tick,cleared:cl,room:E.state().run.room};await sleep(60);}return {ok:false,tick:E.tick,cleared:window.__c.ev.filter(e=>e.T==='room_cleared').length,room:E.state().run.room}`)),
  ev(iife(`
    const ev=window.__c.ev;const deaths=ev.filter(e=>e.T==='death'&&e.id>=4);const clears=ev.filter(e=>e.T==='room_cleared').map(e=>e.tick);
    const rows=window.__c.rows;const byT=new Map();for(const r of rows)byT.set(r.t,r);
    const out=deaths.map(d=>{const h=ev.filter(e=>e.T==='hit'&&e.target===d.id&&e.tick>=d.tick-2&&e.tick<=d.tick).slice(-1)[0];
      const amt=h?String(Math.round(h.amount)):null;
      const dom=window.__c.dom.filter(x=>x.t>=d.tick-1&&x.t<=d.tick+3);
      const exact=amt?dom.filter(x=>x.txt===amt):[];
      const nums=rows.filter(r=>r.t>=d.tick-2&&r.t<=d.tick+4).map(r=>r.t+':'+r.num).join(' ');
      let gapMs=null;for(let i=1;i<rows.length;i++){if(rows[i].t===d.tick){gapMs=rows[i].ms-rows[i-1].ms;break;}}
      return {death:d.tick,id:d.id,hitAmt:amt,hitTick:h&&h.tick,clearsRoom:clears.includes(d.tick),numeralExact:exact.length,numeralAny:dom.map(x=>x.txt),numeralPos:exact.slice(0,1).map(x=>[x.x,x.y,x.w,x.h]),numTrace:nums,frameGapMs:gapMs};});
    const clearing=out.filter(o=>o.clearsRoom);const others=out.filter(o=>!o.clearsRoom);
    return {clears,deaths:out.length,clearingKills:clearing,clearingWithNumeral:clearing.filter(o=>o.numeralExact>0).length,otherKills:others.length,otherWithNumeral:others.filter(o=>o.numeralExact>0).length,killsMissingNumeral:out.filter(o=>o.numeralExact===0).map(o=>[o.death,o.hitAmt,o.clearsRoom,o.numeralAny])}`)),
  errs, coverage, snap('lastkill-end'),
];

// ================= C4 pixels: per-frame canvas crops around the victim =================
// Rolling 3-frame crop buffer per live enemy, frozen on each natural `hit`, then
// emitted as data URLs (decoded to PNG by tools/certC2-sheet.mjs).
const grabArm = ev(iife(`
  const cv=document.querySelector('canvas');window.__c.cv=cv;
  const CW=64,CH=88;const off=document.createElement('canvas');off.width=CW;off.height=CH;const ctx=off.getContext('2d',{willReadFrequently:true});
  window.__c.grabOn=false;window.__c.buf={};window.__c.frozen=[];
  const P=window.__arenaProbe;const cam=P.stage.camera;const V=P.root.position.constructor;
  const proj=(x,y,z)=>{const v=new V(x,y,z);v.project(cam);return [(v.x*0.5+0.5)*window.innerWidth,(-v.y*0.5+0.5)*window.innerHeight];};
  const stats=(d)=>{let w=0,b=0,sum=0,mx=0;const n=d.length/4;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],bl=d[i+2];const L=0.299*r+0.587*g+0.114*bl;const mxc=Math.max(r,g,bl),mnc=Math.min(r,g,bl);const S=mxc?(mxc-mnc)/mxc:0;sum+=L;if(L>mx)mx=L;if(L>230&&S<0.18)w++;if(L>200)b++;}return {L:+(sum/n).toFixed(1),W:+(w/n).toFixed(3),B:+(b/n).toFixed(3),mx:Math.round(mx)};};
  const grab=()=>{if(!window.__c.grabOn)return;const s=E.state();const t=E.tick;
    for(const e of s.enemies){const c=proj(e.x,0.55,e.z);const x=Math.round(c[0]-CW/2),y=Math.round(c[1]-CH/2);
      if(x<0||y<0||x+CW>cv.width||y+CH>cv.height)continue;
      ctx.clearRect(0,0,CW,CH);ctx.drawImage(cv,x,y,CW,CH,0,0,CW,CH);
      const im=ctx.getImageData(0,0,CW,CH);const st=stats(im.data);
      const rec={t,box:[x,y,CW,CH],st,url:off.toDataURL('image/png')};
      const b=window.__c.buf[e.id]||(window.__c.buf[e.id]=[]);b.push(rec);if(b.length>4)b.shift();}
    for(const f of window.__c.frozen){if(f.need>0){const e=s.enemies.find(q=>q.id===f.id);const bx=f.lastBox;
      ctx.clearRect(0,0,CW,CH);
      let box=bx;if(e){const c=proj(e.x,0.55,e.z);box=[Math.round(c[0]-CW/2),Math.round(c[1]-CH/2),CW,CH];}
      if(box[0]>=0&&box[1]>=0&&box[0]+CW<=cv.width&&box[1]+CH<=cv.height){ctx.drawImage(cv,box[0],box[1],CW,CH,0,0,CW,CH);const im=ctx.getImageData(0,0,CW,CH);f.post.push({t,box,st:stats(im.data),url:off.toDataURL('image/png')});f.lastBox=box;}
      f.need--;}}};
  const f=()=>{grab();requestAnimationFrame(f);};requestAnimationFrame(f);
  E.on('hit',(h)=>{if(!window.__c.grabOn)return;if(h.target<4)return;if(window.__c.frozen.length>=8)return;const pre=(window.__c.buf[h.target]||[]).slice(-3).map(r=>Object.assign({},r));const last=pre.length?pre[pre.length-1].box:[0,0,64,88];window.__c.frozen.push({id:h.target,hitTick:h.tick,amt:h.amount,pre,post:[],need:7,lastBox:last});});
  return 'grab armed, canvas '+cv.width+'x'+cv.height`));
files['certC2-pxgrab'] = [
  arm, grabArm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,3600);window.__c.grabOn=true;return 'grab on t'+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<70000){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);if(window.__c.frozen.length>=6&&window.__c.frozen.every(f=>f.need<=0))return {ok:true,tick:E.tick,frozen:window.__c.frozen.length,fps:E.fps};await sleep(50);}return {ok:false,tick:E.tick,frozen:window.__c.frozen.length}`)),
  ev(iife(`window.__c.grabOn=false;return window.__c.frozen.map(f=>({id:f.id,hitTick:f.hitTick,amt:f.amt,pre:f.pre.map(r=>r.t+':'+r.st.W+'/'+r.st.L+'/'+r.st.mx),post:f.post.map(r=>r.t+':'+r.st.W+'/'+r.st.L+'/'+r.st.mx),box:f.pre.length?f.pre[f.pre.length-1].box:null,dead:window.__c.ev.some(e=>e.T==='death'&&e.id===f.id&&Math.abs(e.tick-f.hitTick)<=1)}))`)),
  ...[0,1,2,3,4,5].map(i => ev(iife(`const f=window.__c.frozen[${i}];if(!f)return {set:${i},none:true};const all=[...f.pre.map(r=>['pre',r]),...f.post.map(r=>['post',r])];return JSON.stringify({set:${i},id:f.id,hitTick:f.hitTick,amt:f.amt,frames:all.map(([k,r])=>({k,t:r.t,box:r.box,st:r.st,url:r.url}))})`))),
  errs, coverage, snap('pxgrab-end'),
];

// ================= C4 pixels: 8-frame seq across a hit + numeral shot =================
files['certC2-hitseq'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,3600);return 'iframe t'+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  ...[0,1,2,3,4,5,6,7].flatMap(i => [
    ev(iife(`${PROJ}const s=E.state();const last=window.__c.ev.filter(e=>e.T==='hit'&&e.target>=4).slice(-3).map(h=>[h.tick,h.target,h.amount]);return {frame:${i},tick:E.tick,lastHits:last,enemies:s.enemies.map(e=>[e.id,e.kind,e.hp,...proj(e.x,0.45,e.z)]),numerals:window.__c.dom.filter(d=>d.t>=E.tick-12).map(d=>[d.t,d.txt,d.x,d.y,d.w,d.h])}`)),
    shot(`certC2-hitseq_${String(i).padStart(2, '0')}`),
    ev(iife(`return {frame:${i},tickAfterShot:E.tick,lastHitTick:(window.__c.ev.filter(e=>e.T==='hit'&&e.target>=4).slice(-1)[0]||{}).tick,numeralsNow:[...document.querySelectorAll('#dmg-num-layer .dmg-num')].filter(n=>getComputedStyle(n).opacity!=='0'&&n.textContent).map(n=>{const r=n.getBoundingClientRect();return [n.textContent,Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]})}`)),
    wait(100),
  ]),
  errs, snap('hitseq-end'),
];

// ================= C4b boss stomps =================
files['certC2-boss'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,ver:E.version,room:r&&r.room,boss:r&&r.boss,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 300 },
  ev(iife(`E.cmd('iframe',0,3600);return 'iframe t'+E.tick`)),
  waitFor(`(()=>{const q=window.__c.ev.filter(e=>e.T==='boss_quake_start');return q.length>=1&&q[q.length-1].resolveTick-E.tick>=18&&q[q.length-1].resolveTick>E.tick})()`, 40000,
    `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>[e.tick,e.resolveTick,e.x,e.z,e.radius])`),
  ev(iife(`${PROJ}const q=window.__c.ev.filter(e=>e.T==='boss_quake_start').slice(-1)[0];const r=q.radius??1.6;return {tick:E.tick,left:q.resolveTick-E.tick,quake:[q.tick,q.resolveTick,q.x,q.z,r],center:proj(q.x,0.02,q.z),box:[proj(q.x-r,0.02,q.z-r),proj(q.x+r,0.02,q.z+r)],player:proj(E.state().party[0].x,0.4,E.state().party[0].z)}`)),
  shot('certC2-boss-quake'),
  ev(iife(`const q=window.__c.ev.filter(e=>e.T==='boss_quake_start').slice(-1)[0];return {afterShotTick:E.tick,left:q.resolveTick-E.tick}`)),
  waitFor(`(()=>{const ev=window.__c.ev;return ev.filter(e=>e.T==='boss_quake_resolve').length>=2&&ev.filter(e=>e.T==='boss_trample').length>=1&&ev.filter(e=>e.T==='death').length>=1})()`, 60000,
    `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_resolve').length,tramples:window.__c.ev.filter(e=>e.T==='boss_trample').length,deaths:window.__c.ev.filter(e=>e.T==='death').length`),
  wait(600),
  ev(iife(`
    const rows=window.__c.rows;const ev=window.__c.ev;const cam=rows.filter(r=>r.cam);const jerk=[];for(let i=2;i<cam.length;i++){const a=cam[i-2].cam,b=cam[i-1].cam,c=cam[i].cam;jerk.push({t:cam[i].t,j:Math.hypot(c[0]-2*b[0]+a[0],c[2]-2*b[2]+a[2])});}
    const marks=[];for(const T of ['boss_quake_resolve','boss_trample','death'])for(const e of ev.filter(x=>x.T===T))marks.push({T,t:e.tick});
    const near=new Set();for(const m of marks)for(let k=m.t-2;k<=m.t+12;k++)near.add(k);
    const base=jerk.filter(j=>!near.has(j.t)).map(j=>j.j).sort((a,b)=>a-b);const baseP95=base[Math.floor(base.length*0.95)]||0;const thr=Math.max(0.012,baseP95*3);
    const per=marks.map(m=>{const w=jerk.filter(j=>j.t>=m.t&&j.t<=m.t+12);return [m.T,m.t,w.length?+Math.max(...w.map(j=>j.j)).toFixed(4):null,w.filter(j=>j.j>thr).length];});
    const quakes=ev.filter(e=>e.T==='boss_quake_start').map(s=>{const r=ev.find(x=>x.T==='boss_quake_resolve'&&x.tick>=s.tick);return [s.tick,s.resolveTick-s.tick,r&&r.tick,r?r.tick-s.tick:null];});
    return {thr:+thr.toFixed(4),baseP95:+baseP95.toFixed(5),per,quakes,hitstops:ev.filter(e=>e.T==='hitstop').map(e=>[e.tick,e.ticks,e.cause]).slice(0,20),boss:E.cmd('runState').boss}`)),
  errs, coverage, snap('boss-end'),
];

// ================= C5 camera =================
const camSample = (tag, n, first) => ev(aiife(`${PROJ}const out=[];for(let i=0;i<${n};i++){const s=E.state();const p=s.party[0];const c=P.stage.camera.position;const sp=proj(p.x,0.4,p.z);out.push({i:${first}+i,t:E.tick,x:+p.x.toFixed(2),z:+p.z.toFixed(2),sx:sp[0],sy:sp[1],cx:+c.x.toFixed(3),cz:+c.z.toFixed(3)});if(i<${n}-1)await sleep(250);}
    window.__c.cam=(window.__c.cam||[]).concat(out);return {leg:${JSON.stringify(tag)},samples:out}`));
const camLegSummary = (tag) => ev(iife(`const out=window.__c.cam||[];let maxJump=0,maxCamStep=0;for(let i=1;i<out.length;i++){const a=out[i-1],b=out[i];maxJump=Math.max(maxJump,Math.hypot(b.sx-a.sx,b.sy-a.sy));maxCamStep=Math.max(maxCamStep,Math.hypot(b.cx-a.cx,b.cz-a.cz));}
    const inside=out.every(o=>o.sx>=320&&o.sx<=1280&&o.sy>=180&&o.sy<=720);const outs=out.filter(o=>!(o.sx>=320&&o.sx<=1280&&o.sy>=180&&o.sy<=720)).map(o=>[o.i,o.sx,o.sy]);window.__c.cam=[];
    return {leg:${JSON.stringify(tag)},n:out.length,maxScreenJumpPx:+maxJump.toFixed(1),pctOfWidth:+(maxJump/16).toFixed(2),maxCamStepU:+maxCamStep.toFixed(3),allInsideCentral60:inside,outside:outs,sxRange:[Math.min(...out.map(o=>o.sx)),Math.max(...out.map(o=>o.sx))],syRange:[Math.min(...out.map(o=>o.sy)),Math.max(...out.map(o=>o.sy))]}`));
const camShotState = (tag) => ev(iife(`${PROJ}const p=E.state().party[0];return {leg:${JSON.stringify(tag)},shotTick:E.tick,player:[+p.x.toFixed(2),+p.z.toFixed(2)],screen:proj(p.x,0.4,p.z),head:proj(p.x,1.0,p.z),feet:proj(p.x,0,p.z),cam:P.stage.camera.position.toArray().map(v=>+v.toFixed(3))}`));
const camLeg = (k, tag) => [
  down(k),
  camSample(tag, 9, 0), shot(`certC2-cam-${tag}-mid`), camShotState(tag + '-mid'),
  camSample(tag, 8, 9), shot(`certC2-cam-${tag}-end`), camShotState(tag + '-end'),
  up(k), camLegSummary(tag),
];
files['certC2-cam'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,3600);const r=E.cmd('teleport',-5,4);return {tp:r,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 450 }, wait(700),
  ...camLeg('KeyD', 'd'), wait(150), ...camLeg('KeyW', 'w'),
  down('KeyA'), wait(4000), camShotState('a-4s'), shot('certC2-cam-a-4s'), wait(3000), camShotState('a-wall'), shot('certC2-cam-a-wall'), up('KeyA'),
  down('KeyS'), wait(4000), camShotState('s-4s'), shot('certC2-cam-s-4s'), wait(3000), camShotState('s-wall'), shot('certC2-cam-s-wall'), up('KeyS'),
  ev(iife(`const rows=window.__c.rows.filter(r=>r.cam);const steps=[];for(let i=1;i<rows.length;i++){const a=rows[i-1].cam,b=rows[i].cam;steps.push({t:rows[i].t,d:Math.hypot(b[0]-a[0],b[2]-a[2])/(rows[i].t-rows[i-1].t)});}const ds=steps.map(s=>s.d).sort((a,b)=>a-b);return {perTickCamStep:{max:+ds[ds.length-1].toFixed(4),p99:+ds[Math.floor(ds.length*0.99)].toFixed(4),median:+ds[Math.floor(ds.length/2)].toFixed(4)},top5:steps.slice().sort((a,b)=>b.d-a.d).slice(0,5).map(s=>[s.t,+s.d.toFixed(4)])}`)),
  coverage, snap('cam-end'),
];

// ================= C6 threat pointers =================
const threatDom = ev(iife(`const th=E.hud.threat();const layer=document.querySelector('#hud-threat');const lr=layer?layer.getBoundingClientRect():null;const nodes=[...document.querySelectorAll('#hud-threat .tm')].map(n=>{const r=n.getBoundingClientRect();const head=n.querySelector('.tm-head');const hr=head?head.getBoundingClientRect():null;return {cls:n.getAttribute('class'),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),op:getComputedStyle(n).opacity,disp:getComputedStyle(n).display,head:hr&&[Math.round(hr.x),Math.round(hr.y),Math.round(hr.width),Math.round(hr.height)],transform:n.style.transform||null,txt:(n.textContent||'').trim().slice(0,8)}});return {tick:E.tick,layer:layer&&{rect:[Math.round(lr.x),Math.round(lr.y),Math.round(lr.width),Math.round(lr.height)],op:getComputedStyle(layer).opacity,disp:getComputedStyle(layer).display,vis:getComputedStyle(layer).visibility},gated:th.gated,offFrame:th.offFrame,markersDrawn:th.markersDrawn,domMarkers:th.domMarkers,covered:th.covered,uncued:th.uncued,markers:th.markers,nodes:nodes.slice(0,12)}`));
files['certC2-threat'] = [
  arm, startRun,
  { type: 'mousemove', x: 800, y: 450 },
  waitFor(`E.state().enemies.length>=3&&E.hud.threat().markersDrawn>=1`, 25000, `,enemies:E.state().enemies.length,threat:(({offFrame,markersDrawn,domMarkers})=>({offFrame,markersDrawn,domMarkers}))(E.hud.threat())`),
  ev(iife(`${PROJ}const s=E.state();return {tick:E.tick,player:proj(s.party[0].x,0.4,s.party[0].z),enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(1),+e.z.toFixed(1),...proj(e.x,0.4,e.z)])}`)),
  shot('certC2-threat-natural'), threatDom,
  ev(iife(`E.cmd('iframe',0,3600);E.cmd('killAllEnemies');const r=E.cmd('teleport',-9,6);return {tp:r,tick:E.tick}`)),
  wait(900),
  ev(iife(`const a=E.cmd('spawn','mantis',10,-6);const b=E.cmd('spawn','boar',10,6);const c=E.cmd('spawn','boar',-10,-6);return {spawned:[a,b,c],tick:E.tick}`)),
  wait(700),
  ev(iife(`${PROJ}const s=E.state();return {tick:E.tick,player:proj(s.party[0].x,0.4,s.party[0].z),enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(1),+e.z.toFixed(1),...proj(e.x,0.4,e.z)])}`)),
  shot('certC2-threat-forced'), threatDom,
  snap('threat-end'),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
