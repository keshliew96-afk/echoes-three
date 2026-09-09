// Certification critic — block C (responsiveness), round 1 (fresh run).
// Writes tools/actions/certC1-*.json programmatically (never hand-escaped JSON).
// Every eval shares ONE page scope; all code is IIFE-wrapped. Async IIFEs poll
// window.__echoes (every ~4-8 ms or per rAF) and RETURN the observed state so it
// lands in captures/<name>.console.txt as [EVAL].
//
// Boot: http://127.0.0.1:5199/?seed=555 (camp) + cmd('startRun'). The run is
// hosted in the camp scene (state().scene stays 'camp', vfx.mode 'run'), so the
// live gate is run.combatActive && enemies>0, never the scene name.
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
  'intent','intent_denied','dash_end','downed','revive','boss_spawn','boss_quake_start','boss_quake_resolve','boss_trample',
  'boss_adds','boss_death','run_end','defeat','victory','reward','draft_taken','path_chosen','eshot_despawn','zone_spawn','zone_tick','enemy_despawn','basic_fire','skill_cast','ally_cast','ally_basic'];

// Event bus + per-rAF sampler (one row per NEW sim tick) + deduped numeral DOM
// observer + emissive-flash tracer (max emissiveIntensity of non-instanced
// meshes with an emissive material within 0.9 u of each enemy).
const arm = ev(iife(`
  window.__c={ev:[],rows:[],dom:[],keys:[],ticksSeen:0,frames:0,started:performance.now(),flashOn:false,sampleOn:true};
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t,ms:Math.round(performance.now()-window.__c.started)},e)));
  window.addEventListener('keydown',e=>{if(e.repeat)return;const s=E.state();const p=s.party[0];window.__c.keys.push({key:e.code,t:E.tick,ms:Math.round(performance.now()-window.__c.started),x:p.x,z:p.z,dash:p.dashTicksLeft});},true);
  window.addEventListener('keyup',e=>{const s=E.state();const p=s.party[0];window.__c.keys.push({key:e.code,upT:E.tick,t:E.tick,up:true,ms:Math.round(performance.now()-window.__c.started),x:p.x,z:p.z});},true);
  const L=document.querySelector('#dmg-num-layer');window.__c.numLayer=!!L;
  const lastKey=new WeakMap();
  if(L){const mo=new MutationObserver(muts=>{const t=E.tick;const seen=new Set();for(const m of muts){const n=m.target.nodeType===3?m.target.parentElement:m.target;const el=n&&n.closest?n.closest('.dmg-num'):null;if(!el||seen.has(el))continue;seen.add(el);const cs=getComputedStyle(el);const vis=!(cs.display==='none'||cs.opacity==='0'||cs.visibility==='hidden'||!el.textContent);const k=el.textContent+'|'+vis;if(lastKey.get(el)===k)continue;lastKey.set(el,k);if(!vis)continue;const r=el.getBoundingClientRect();window.__c.dom.push({t,txt:el.textContent,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),col:cs.color});}});mo.observe(L,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});}
  let meshes=[];let meshAt=0;const V=window.__arenaProbe&&window.__arenaProbe.root.position.constructor;const tmp=V?new V():null;
  const refresh=()=>{meshes=[];if(!window.__arenaProbe)return;window.__arenaProbe.root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.material&&o.material.emissive&&o.visible)meshes.push(o);});meshAt=performance.now();};
  const flashOf=(en)=>{const out={};if(!tmp)return out;for(const o of meshes){o.getWorldPosition(tmp);for(const id in en){const e=en[id];const dx=tmp.x-e[0],dz=tmp.z-e[1];if(dx*dx+dz*dz<0.81){const it=o.material.emissiveIntensity??1;const c=o.material.emissive;const l=(0.299*c.r+0.587*c.g+0.114*c.b)*it;if(!(id in out)||it>out[id].i)out[id]={i:+it.toFixed(3),l:+l.toFixed(3)};}}}return out;};
  window.__c.refreshMeshes=refresh;
  let last=-1;const f=()=>{window.__c.frames++;if(window.__c.sampleOn){const t=E.tick;if(t!==last){last=t;const s=E.state();const p=s.party[0];const cam=(window.__arenaProbe&&window.__arenaProbe.stage)?window.__arenaProbe.stage.camera.position:null;const en={};for(const e of s.enemies)en[e.id]=[+e.x.toFixed(3),+e.z.toFixed(3),e.hp,e.kbTicks];let fl=null;if(window.__c.flashOn){if(performance.now()-meshAt>1000)refresh();fl=flashOf(en);}const vfx=s.vfx||{};const num=vfx.numerals??(vfx.arena&&vfx.arena.numerals)??null;window.__c.rows.push({t,ms:Math.round(performance.now()-window.__c.started),px:+p.x.toFixed(4),pz:+p.z.toFixed(4),dash:p.dashTicksLeft,hp:p.hp,cam:cam?[+cam.x.toFixed(4),+cam.y.toFixed(4),+cam.z.toFixed(4)]:null,num,en,fl});window.__c.ticksSeen++;if(window.__c.rows.length>16000)window.__c.rows.splice(0,6000);}}requestAnimationFrame(f);};requestAnimationFrame(f);
  return 'armed '+E.tick+' numLayer '+window.__c.numLayer+' probe '+!!window.__arenaProbe`));
const PROJ = `const P=window.__arenaProbe;const cam=P.stage.camera;const V=P.root.position.constructor;const W=window.innerWidth,H=window.innerHeight;const proj=(x,y,z)=>{const v=new V(x,y,z);v.project(cam);return [Math.round((v.x*0.5+0.5)*W),Math.round((-v.y*0.5+0.5)*H)];};`;
const startRun = ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,modes:r&&r.frame&&r.frame.modes,room:r&&r.room,tick:E.tick}`));
const LIVE = `(()=>{const s=E.state();return s.run.active&&s.run.combatActive&&s.enemies.length>0})()`;
const waitLive = waitFor(LIVE, 30000, `,enemies:E.state().enemies.length,phase:E.state().run.phase`);
const snap = (tag) => ev(iife(`const s=E.state();const r=s.run;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,scene:s.scene,vfxMode:s.vfx&&s.vfx.mode,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,roomState:s.room,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),ui:E.runUi().screen,hud:E.hud.combat(),threat:(({gated,offFrame,markersDrawn,domMarkers,uncued})=>({gated,offFrame,markersDrawn,domMarkers,uncued}))(E.hud.threat())}`));
const coverage = ev(iife(`const r=window.__c.rows;let gaps=0,maxGap=0;for(let i=1;i<r.length;i++){const g=r[i].t-r[i-1].t;if(g>1){gaps+=g-1;maxGap=Math.max(maxGap,g);}}return {ticksSeen:window.__c.ticksSeen,frames:window.__c.frames,fps:E.fps,missedTicks:gaps,maxTickGap:maxGap,span:r.length?r[r.length-1].t-r[0].t:0}`));
const errs = ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {tick:E.tick,counts:m}`));

const files = {};

// ---------- C1: movement latency ----------
// Per keydown k (t0 = last completed tick at the DOM keydown; pos at keydown):
// first sampled row whose position moved along the pressed axis. Raw latency =
// rowTick - t0. Displacement-corrected latency subtracts the extra ticks of
// travel the row already contains (0.04 u/tick at 2.4 u/s) when a frame ran
// several ticks, so it names the tick the movement actually began.
const analyzeMoves = ev(iife(`
  const rows=window.__c.rows;const keys=window.__c.keys.filter(k=>!k.up);const out=[];
  const dirOf={KeyD:[1,0],KeyA:[-1,0],KeyW:[0,-1],KeyS:[0,1]};
  for(const k of keys){const d=dirOf[k.key];if(!d)continue;
    let first=null;const after=rows.filter(r=>r.t>=k.t&&r.t<=k.t+30);
    for(const r of after){const dx=r.px-k.x,dz=r.pz-k.z;const along=dx*d[0]+dz*d[1];if(along>1e-6){first={t:r.t,along:+along.toFixed(4),ticksOfTravel:Math.round(along/0.04)};break;}}
    const sampled=after.filter(r=>r.t<=k.t+4).map(r=>r.t+'@'+(r.px-k.x).toFixed(2)+','+(r.pz-k.z).toFixed(2));
    const hs=window.__c.ev.filter(e=>e.T==='hitstop'&&e.tick>=k.t-3&&e.tick<=k.t+6).map(e=>e.ticks+'@'+e.tick);
    const raw=first?first.t-k.t:null;const corr=first?Math.max(1,raw-(first.ticksOfTravel-1)):null;
    out.push({key:k.key,t0:k.t,firstMoveTick:first&&first.t,along:first&&first.along,rawLatency:raw,correctedLatency:corr,sampled,hitstops:hs});}
  const worst=Math.max(...out.map(o=>o.correctedLatency??99));const worstRaw=Math.max(...out.map(o=>o.rawLatency??99));
  const byKey={};for(const o of out){byKey[o.key]=byKey[o.key]||[];byKey[o.key].push(o.correctedLatency+'/'+o.rawLatency);}
  return {trials:out,byKey,worstCorrected:worst,worstRaw,n:out.length}`));
const moveTrial = (k) => [down(k), wait(150), up(k), wait(220)];
const altPair = [down('KeyD'), wait(100), up('KeyD'), down('KeyA'), wait(100), up('KeyA')];
files['certC1-move'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,3600);E.cmd('teleport',-3,2);return 'iframe+tp '+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 }, wait(250),
  ev(iife(`window.__c.keys.length=0;return {t:E.tick,hp:E.state().party[0].hp,enemies:E.state().enemies.length,phase:E.state().run.phase}`)),
  ...['KeyD','KeyA','KeyW','KeyS','KeyD','KeyA','KeyW','KeyS','KeyD','KeyA','KeyW','KeyS','KeyD','KeyA','KeyW','KeyS','KeyD','KeyA','KeyW','KeyS'].flatMap(moveTrial),
  analyzeMoves,
  // per-tick position trace for the first 4 trials (raw evidence)
  ev(iife(`const ks=window.__c.keys.filter(k=>!k.up).slice(0,4);return ks.map(k=>({key:k.key,t0:k.t,trace:window.__c.rows.filter(r=>r.t>=k.t-2&&r.t<=k.t+8).map(r=>r.t+':'+r.px.toFixed(2)+','+r.pz.toFixed(2)).join(' ')}))`)),
  // Alternating D/A 10x at 100 ms, i-frames OFF (natural fight): keyup old + keydown new back-to-back.
  ev(iife(`window.__c.keys.length=0;E.cmd('iframe',0,0);E.cmd('teleport',0,2);window.__c.altStart=E.tick;return {altStart:E.tick,phase:E.state().run.phase,enemies:E.state().enemies.length,hp:E.state().party[0].hp}`)),
  wait(150),
  ...altPair, ...altPair, ...altPair, ...altPair, ...altPair, ...altPair, ...altPair, ...altPair, ...altPair, ...altPair,
  wait(250),
  ev(iife(`
    const rows=window.__c.rows.filter(r=>r.t>=window.__c.altStart);const keys=window.__c.keys.filter(k=>!k.up);const out=[];
    for(let i=0;i<keys.length;i++){const k=keys[i];const sign=k.key==='KeyD'?1:-1;let flip=null;
      for(let j=1;j<rows.length;j++){const r=rows[j],q=rows[j-1];if(r.t<=k.t)continue;const vx=r.px-q.px;const perTick=vx/(r.t-q.t);if(vx*sign>1e-6){flip={t:r.t,vx:+vx.toFixed(4),span:r.t-q.t,perTick:+perTick.toFixed(4)};break;}if(r.t>k.t+30)break;}
      const raw=flip?flip.t-k.t:null;const corr=flip?Math.max(1,raw-(flip.span-1)):null;
      let stale=0;if(flip){for(let j=1;j<rows.length;j++){const r=rows[j],q=rows[j-1];if(r.t<=flip.t)continue;if(r.t>k.t+6)break;const vx=r.px-q.px;if(vx*sign<-1e-6)stale++;}}
      out.push({i,key:k.key,t0:k.t,flipTick:flip&&flip.t,rawLatency:raw,correctedLatency:corr,span:flip&&flip.span,staleRowsAfterFlip:stale});}
    const trace=[];for(let j=1;j<rows.length;j++){const vx=rows[j].px-rows[j-1].px;trace.push(rows[j].t+(vx>1e-6?'+':vx<-1e-6?'-':'0'));}
    const hits=window.__c.ev.filter(e=>(e.T==='hit')&&e.target===0&&e.tick>=window.__c.altStart).map(e=>e.tick);
    return {flips:out,worstCorrected:Math.max(...out.map(o=>o.correctedLatency??99)),worstRaw:Math.max(...out.map(o=>o.rawLatency??99)),staleTotal:out.reduce((a,o)=>a+o.staleRowsAfterFlip,0),hitsOnPlayer:hits,trace:trace.join(' ')}`)),
  coverage, snap('move-end'),
];

// ---------- C2: dash latency + i-frames ----------
const dashTrial = (n) => [
  ev(iife(`window.__c.keys.length=0;window.__c.evMark=window.__c.ev.length;return {trial:${n},t:E.tick,ready:E.state().party[0].dodgeReadyTick<=E.tick,readyTick:E.state().party[0].dodgeReadyTick}`)),
  down('Space'), up('Space'),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<1400){const q=E.state().party[0];if(q.dashTicksLeft===0&&window.__c.ev.slice(window.__c.evMark).some(e=>e.T==='dash_end'))break;await sleep(4);}
    const k=window.__c.keys.find(k=>!k.up);
    const evs=window.__c.ev.slice(window.__c.evMark).filter(e=>['intent','intent_denied','dash_end','sound'].includes(e.T)).map(e=>[e.T,e.tick,e.kind||e.slot||e.cause,e.reason]);
    const rows=window.__c.rows.filter(r=>k&&r.t>=k.t-1&&r.t<=k.t+22).map(r=>r.t+':'+r.dash);
    const intent=window.__c.ev.slice(window.__c.evMark).find(e=>e.T==='intent'&&e.kind==='dodge');
    const fr=window.__c.rows.find(r=>k&&r.t>=k.t&&r.dash>0);
    const de=window.__c.ev.slice(window.__c.evMark).find(e=>e.T==='dash_end');
    const startFromRow=fr?fr.t-(15-fr.dash):null;
    const p0=k?[k.x,k.z]:null;const p1=E.state().party[0];const dist=p0?Math.hypot(p1.x-p0[0],p1.z-p0[1]):null;
    return {trial:${n},keydownTick:k&&k.t,firstDashRow:fr&&{t:fr.t,dashTicksLeft:fr.dash},startFromRow,latencyRows:(k&&fr)?fr.t-k.t:null,latencyStart:(k&&startFromRow!=null)?startFromRow-k.t:null,intentTick:intent&&intent.tick,latencyIntent:(k&&intent)?intent.tick-k.t:null,dashEnd:de&&[de.tick,de.cause],durationTicks:(intent&&de)?de.tick-intent.tick:null,travelU:dist!=null?+dist.toFixed(3):null,evs,dashRows:rows.join(' ')}`)),
  wait(1400),
];
const iframeTrial = (n, double) => [
  ev(iife(`window.__c.keys.length=0;window.__c.evMark=window.__c.ev.length;E.cmd('setHp',0,1);return {iframeTrial:${n},t:E.tick,hp:E.state().party[0].hp,ready:E.state().party[0].dodgeReadyTick<=E.tick}`)),
  down('Space'), up('Space'),
  ev(aiife(`const k=window.__c.keys.find(k=>!k.up);const t0=performance.now();let p=E.state().party[0];while(performance.now()-t0<500&&p.dashTicksLeft===0){await sleep(2);p=E.state().party[0];}
    const hpA=p.hp;const tA=E.tick;const dashA=p.dashTicksLeft;const nA=window.__c.ev.length;const rA=E.cmd('hitOnce',0);${double ? "await sleep(30);E.cmd('hitOnce',0);" : ''}
    await sleep(40);const pB=E.state().party[0];const tB=E.tick;const evA=window.__c.ev.slice(nA).filter(e=>['hit','hit_immune','sound','hitstop'].includes(e.T)).map(e=>[e.T,e.tick,e.target,e.amount,e.slot,e.reason]);
    while(performance.now()-t0<1500){const q=E.state().party[0];if(q.dashTicksLeft===0&&window.__c.ev.slice(window.__c.evMark).some(e=>e.T==='dash_end'))break;await sleep(4);}
    await sleep(50);const pC=E.state().party[0];const tC=E.tick;const nC=window.__c.ev.length;const rC=E.cmd('hitOnce',0);await sleep(60);const pD=E.state().party[0];
    const evC=window.__c.ev.slice(nC).filter(e=>['hit','hit_immune','sound','hitstop'].includes(e.T)).map(e=>[e.T,e.tick,e.target,e.amount,e.slot,e.reason]);
    const de=window.__c.ev.slice(window.__c.evMark).find(e=>e.T==='dash_end');const it=window.__c.ev.slice(window.__c.evMark).find(e=>e.T==='intent'&&e.kind==='dodge');
    return {iframeTrial:${n},keydownTick:k&&k.t,intentTick:it&&it.tick,duringDash:{tick:tA,dashTicksLeft:dashA,hpBefore:hpA,hpAfter:pB.hp,tickAfter:tB,cmdResult:rA,events:evA},dashEnd:de&&[de.tick,de.cause],afterDash:{tick:tC,dashTicksLeft:pC.dashTicksLeft,hpBefore:pC.hp,hpAfter:pD.hp,cmdResult:rC,events:evC}}`)),
  wait(1400),
];
// Natural attack through the dash: an adjacent Thorn Boar (contact 8, 0.8 s
// per-target cd) bites the player before, DURING (must be hit_immune, HP
// unchanged) and after the dash (must land). The boar is i-framed itself so
// the AI party cannot kill it mid-probe; the dash direction is +x (KeyD held
// on the same tick as Space) straight through the boar.
const biteTrial = (n, bx) => [
  ev(iife(`E.cmd('killAllEnemies');E.cmd('teleport',-3,2.5);E.cmd('setHp',0,1);return {biteTrial:${n},tick:E.tick,hp:E.state().party[0].hp}`)),
  wait(350),
  ev(iife(`window.__c.keys.length=0;window.__c.evMark=window.__c.ev.length;const p=E.state().party[0];const r=E.cmd('spawn','boar',p.x+${bx},p.z);const s=E.state();const b=s.enemies.find(e=>e.kind==='boar'&&Math.abs(e.x-(p.x+${bx}))<0.3&&Math.abs(e.z-p.z)<0.3);window.__c.boarId=b?b.id:null;if(b)E.cmd('iframe',b.id,1200);return {spawn:r,boarId:window.__c.boarId,boar:b&&[b.x,b.z],player:[p.x,p.z],tick:E.tick,hp:p.hp,ready:p.dodgeReadyTick<=E.tick}`)),
  ev(aiife(`const t0=performance.now();let bite=null;while(performance.now()-t0<3000){bite=window.__c.ev.slice(window.__c.evMark).find(e=>e.T==='enemy_bite'&&e.target===0&&e.id===window.__c.boarId);if(bite)break;await sleep(3);}
    if(!bite)return {ok:false,reason:'no first bite',tick:E.tick,evs:window.__c.ev.slice(window.__c.evMark).map(e=>[e.T,e.tick,e.target,e.id]).slice(0,20)};
    window.__c.bite1=bite.tick;while(performance.now()-t0<3000){if(E.tick-window.__c.bite1>=41)break;await sleep(2);}
    const p=E.state().party[0];const b=E.state().enemies.find(e=>e.id===window.__c.boarId);
    return {ok:true,bite1:window.__c.bite1,nowTick:E.tick,sinceBite:E.tick-window.__c.bite1,hp:p.hp,player:[+p.x.toFixed(2),+p.z.toFixed(2)],boar:b&&[+b.x.toFixed(2),+b.z.toFixed(2),b.hp,b.iframed],dist:b?+Math.hypot(b.x-p.x,b.z-p.z).toFixed(3):null}`)),
  down('KeyD'), down('Space'), wait(330), up('Space'), up('KeyD'),
  wait(1700),
  ev(iife(`const k=window.__c.keys.filter(k=>!k.up).map(k=>[k.key,k.t]);const ev=window.__c.ev.slice(window.__c.evMark);
    const it=ev.find(e=>e.T==='intent'&&e.kind==='dodge');const de=ev.find(e=>e.T==='dash_end');
    const bites=ev.filter(e=>e.T==='enemy_bite'&&e.target===0).map(e=>e.tick);
    const hits=ev.filter(e=>(e.T==='hit'||e.T==='hit_immune')&&e.target===0).map(e=>[e.T,e.tick,e.amount??e.reason]);
    const dashSpan=it&&de?[it.tick,de.tick]:null;
    const inDash=(t)=>dashSpan&&t>=dashSpan[0]&&t<dashSpan[1];
    const hpRows=window.__c.rows.filter(r=>r.t>=window.__c.bite1-2&&de&&r.t<=de.tick+90).map(r=>r.t+':'+r.hp+(r.dash>0?'d':'')).join(' ');
    return {keys:k,intentTick:it&&it.tick,latencyIntent:(it&&k.length)?it.tick-k[k.length-1][1]:null,dashEnd:de&&[de.tick,de.cause],dashSpan,bites,hitsOnPlayer:hits,bitesDuringDash:bites.filter(inDash),hitsDuringDash:hits.filter(h=>inDash(h[1])),bitesAfterDash:bites.filter(t=>de&&t>=de.tick),hpTrace:hpRows,denied:ev.filter(e=>e.T==='intent_denied').map(e=>[e.tick,e.kind,e.reason])}`)),
];
files['certC1-dash'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('teleport',-2,2);return 'tp '+E.tick`)),
  { type: 'mousemove', x: 1100, y: 450 }, wait(250),
  ...dashTrial(1), ...dashTrial(2), ...dashTrial(3), ...dashTrial(4), ...dashTrial(5),
  ...iframeTrial(1, false), ...iframeTrial(2, true), ...iframeTrial(3, false),
  ...biteTrial(1, 0.55), ...biteTrial(2, 0.55),
  ev(iife(`const rows=window.__c.rows;const dashTicks=new Set(rows.filter(r=>r.dash>0).map(r=>r.t));const hits=window.__c.ev.filter(e=>e.T==='hit'&&e.target===0);const imm=window.__c.ev.filter(e=>e.T==='hit_immune'&&e.target===0);return {hitsOnPlayerDuringDash:hits.filter(h=>dashTicks.has(h.tick)).map(h=>h.tick),hitsOnPlayerTotal:hits.length,immuneOnPlayer:imm.map(e=>[e.tick,e.reason]),dashTickCount:dashTicks.size}`)),
  errs, coverage, snap('dash-end'),
];

// ---------- C3: telegraphs (>= 60 s of Act-1 waves) ----------
const teleTable = ev(iife(`
  const ev=window.__c.ev;const starts=ev.filter(e=>e.T==='telegraph_start');const res=ev.filter(e=>e.T==='telegraph_resolve');
  const used=new Set();const pairs=starts.map(s=>{let ri=-1;for(let i=0;i<res.length;i++){if(!used.has(i)&&res[i].id===s.id&&res[i].tick>=s.tick){ri=i;break;}}const r=ri>=0?res[ri]:null;if(r)used.add(ri);return {id:s.id,tgt:s.target,pt:s.playerTargeted,t:s.tick,rt:s.resolveTick,plan:s.resolveTick-s.tick,obs:r?r.tick:null,gap:r?r.tick-s.tick:null};});
  const gaps=pairs.filter(p=>p.gap!=null).map(p=>p.gap);const plans=pairs.map(p=>p.plan);
  const unresolved=pairs.filter(p=>p.gap==null).map(p=>{const d=ev.find(e=>e.T==='death'&&e.id===p.id&&e.tick>=p.t);const dd=ev.find(e=>e.T==='enemy_despawn'&&e.id===p.id&&e.tick>=p.t);return Object.assign({},p,{deathTick:d&&d.tick,despawnTick:dd&&dd.tick});});
  const fires=ev.filter(e=>e.T==='enemy_fire');const fireAfterResolve=fires.filter(f=>res.some(r=>r.id===f.id&&r.tick===f.tick)).length;
  const partyHits=ev.filter(e=>e.T==='hit'&&e.target<=3).map(h=>({t:h.tick,tgt:h.target,src:h.source,del:h.delivery,amt:h.amount,att:h.attacker}));
  const bySrc={};for(const h of partyHits){const s=h.del||h.src;bySrc[s]=(bySrc[s]||0)+1;}
  const bites=ev.filter(e=>e.T==='enemy_bite').length;
  const spanTicks=ev.length?E.tick-ev[0].tick:0;
  return {spanTicks,spanSec:+(spanTicks/60).toFixed(1),telegraphs:pairs.length,resolved:gaps.length,minGap:gaps.length?Math.min(...gaps):null,maxGap:gaps.length?Math.max(...gaps):null,minPlanned:plans.length?Math.min(...plans):null,maxPlanned:plans.length?Math.max(...plans):null,playerTargeted:pairs.filter(p=>p.pt).length,fires:fires.length,fireAtResolveTick:fireAfterResolve,partyHits:partyHits.length,partyHitsByDelivery:bySrc,bites,unresolved,pairs}`));
const progressLoop = (ms, minTickAfter) => aiife(`const t0=performance.now();const mark=E.tick;while(performance.now()-t0<${ms}){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');const p=E.state().party[0];if(p.hp<30)E.cmd('setHp',0,1);const live=window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.tick>mark+${minTickAfter}&&e.resolveTick-E.tick>=30&&e.resolveTick>E.tick);if(live.length){${PROJ}const s=live[live.length-1];return {ok:true,tick:E.tick,tele:{id:s.id,target:s.target,x:s.x,z:s.z,start:s.tick,resolveTick:s.resolveTick,ticksLeft:s.resolveTick-E.tick,screen:proj(s.x,0.02,s.z),box:[proj(s.x-0.6,0.02,s.z-0.6),proj(s.x+0.6,0.02,s.z+0.6),proj(s.x-0.6,0.02,s.z+0.6),proj(s.x+0.6,0.02,s.z-0.6)]},enemies:E.state().enemies.length};}await sleep(4);}return {ok:false,tick:E.tick}`);
const liveTele = ev(iife(`${PROJ}const s=E.state();const live=window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).map(e=>({id:e.id,x:e.x,z:e.z,start:e.tick,resolveTick:e.resolveTick,left:e.resolveTick-E.tick,screen:proj(e.x,0.02,e.z),box:[proj(e.x-0.6,0.02,e.z-0.6),proj(e.x+0.6,0.02,e.z+0.6),proj(e.x-0.6,0.02,e.z+0.6),proj(e.x+0.6,0.02,e.z-0.6)]}));return {afterShotTick:E.tick,live,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),proj(e.x,0.4,e.z)]),player:proj(s.party[0].x,0.4,s.party[0].z),eshots:s.eshots.length,zones:s.zones.length}`));
files['certC1-tele'] = [
  arm, startRun, waitLive,
  { type: 'mousemove', x: 800, y: 450 },
  ev(progressLoop(60000, -1)), shot('certC1-tele-mid'), liveTele,
  ev(progressLoop(60000, 120)), shot('certC1-tele-mid2'), liveTele,
  ev(aiife(`const t0=performance.now();let screens=[];let heals=0;while(performance.now()-t0<70000){const u=E.runUi();if(u.screen==='draft'){E.cmd('draftDecline');screens.push('draft@'+E.tick);}else if(u.screen==='path'){E.cmd('pathChoose',0);screens.push('path@'+E.tick);}else if(u.screen==='shop'){E.cmd('shopAdvance');screens.push('shop@'+E.tick);}else if(u.screen==='defeat'||u.screen==='victory'){screens.push(u.screen+'@'+E.tick);break;}const p=E.state().party[0];if(p.hp<30){E.cmd('setHp',0,1);heals++;}await sleep(100);}return {tick:E.tick,fps:E.fps,screens,heals,room:E.state().run.room,phase:E.state().run.phase}`)),
  teleTable,
  ev(iife(`return JSON.stringify(window.__c.ev.filter(e=>['telegraph_start','telegraph_resolve','enemy_fire','enemy_bite'].includes(e.T)).slice(0,50).map(e=>{const o=Object.assign({},e);delete o.ms;delete o.type;return o}))`)),
  errs, coverage, snap('tele-end'),
];

// ---------- clean frames (no enemy threat) ----------
files['certC1-clean-prespawn'] = [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 450 },
  waitFor(`E.state().run.combatActive&&E.tick-window.__c.ev[0].tick>=14`, 8000, `,enemies:E.state().enemies.length,pending:E.state().room&&E.state().room.pendingSpawns`),
  shot('certC1-clean-prespawn'),
  ev(iife(`${PROJ}const s=E.state();const sp=window.__c.ev.filter(e=>e.T==='spawn_telegraph').map(e=>({etype:e.etype,x:e.x,z:e.z,spawnTick:e.spawnTick,screen:proj(e.x,0.02,e.z)}));return {tick:E.tick,enemies:s.enemies.length,pending:s.room.pendingSpawns,attackTelegraphsLive:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).length,spawnTelegraphs:sp,player:proj(s.party[0].x,0.4,s.party[0].z),party:s.party.map(p=>[p.classId||'healer',...proj(p.x,0.4,p.z)])}`)),
];
files['certC1-clean-between'] = [
  arm, startRun, waitLive, { type: 'mousemove', x: 800, y: 450 },
  wait(2500),
  ev(iife(`const r=E.cmd('killAllEnemies');window.__c.killT=E.tick;return {killed:r,tick:E.tick}`)),
  waitFor(`E.state().enemies.length===0&&!window.__c.ev.some(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick)&&E.tick-window.__c.killT>=8`, 4000, `,enemies:E.state().enemies.length,pending:E.state().room&&E.state().room.pendingSpawns`),
  shot('certC1-clean-between'),
  ev(iife(`${PROJ}const s=E.state();return {tick:E.tick,enemies:s.enemies.length,pending:s.room&&s.room.pendingSpawns,liveTele:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).length,eshots:s.eshots.length,numerals:s.vfx&&(s.vfx.numerals??(s.vfx.arena&&s.vfx.arena.numerals)),party:s.party.map(p=>[p.classId||'healer',p.hp,...proj(p.x,0.4,p.z)]),ui:E.runUi().screen}`)),
];
files['certC1-clean-arena'] = [
  arm, { type: 'mousemove', x: 800, y: 450 }, wait(300),
  ev(iife(`${PROJ}const s=E.state();return {tick:E.tick,scene:s.scene,enemies:s.enemies.length,run:s.run.active,teleLive:window.__c.ev.filter(e=>e.T==='telegraph_start').length,party:s.party.map(p=>[p.classId||'healer',...proj(p.x,0.4,p.z)])}`)),
];

// ---------- C4: hit feedback ----------
const hitTable = ev(iife(`
  const rows=window.__c.rows;const ev=window.__c.ev;const byT=new Map();for(const r of rows)byT.set(r.t,r);
  const rowAtOrBefore=(t)=>{for(let k=t;k>=t-6;k--){if(byT.has(k))return byT.get(k);}return null;};
  const rowsBetween=(a,b)=>rows.filter(r=>r.t>=a&&r.t<=b);
  const hits=ev.filter(e=>e.T==='hit'&&e.target>=4&&e.kind!=='dummy');const out=[];
  for(const h of hits.slice(0,80)){const t=h.tick;const pre=rowAtOrBefore(t-1);const dead=ev.some(d=>d.T==='death'&&d.id===h.target&&d.tick<=t+1&&d.tick>=t-1);
    let kbMax=0;let kbFirst=null;let kbTicksSeen=null;if(pre&&pre.en[h.target]){const p0=pre.en[h.target];for(const r of rowsBetween(t,t+8)){const p=r.en[h.target];if(!p)continue;const d=Math.hypot(p[0]-p0[0],p[1]-p0[1]);if(d>kbMax)kbMax=d;if(kbFirst==null&&d>0.03)kbFirst=r.t-t;if(p[3]>0&&(kbTicksSeen==null||p[3]>kbTicksSeen))kbTicksSeen=p[3];}}
    const numDom=window.__c.dom.filter(d=>d.t>=t&&d.t<=t+2&&d.txt===String(Math.round(h.amount)));
    const numAny=window.__c.dom.filter(d=>d.t>=t&&d.t<=t+2).map(d=>d.txt);
    const n0=pre?pre.num:null;const nPost=rowsBetween(t,t+2).map(r=>r.num);
    const snd=ev.filter(e=>e.T==='sound'&&e.tick>=t&&e.tick<=t+2).map(e=>e.slot);
    const hs=ev.filter(e=>e.T==='hitstop'&&e.tick>=t&&e.tick<=t+2).map(e=>e.ticks+':'+e.cause);
    let fl0=null,flMax=null,flTick=null;if(pre&&pre.fl&&h.target in pre.fl)fl0=pre.fl[h.target].i;for(const r of rowsBetween(t,t+3)){if(r.fl&&h.target in r.fl){const v=r.fl[h.target].i;if(flMax==null||v>flMax){flMax=v;flTick=r.t-t;}}}
    out.push({t,tgt:h.target,kind:h.kind,src:h.source,amt:h.amount,del:h.delivery,kbSpec:h.kb,dead,kbObs:+kbMax.toFixed(3),kbAtTick:kbFirst,kbTicksSeen,numDomHit:numDom.length,numDomAny:numAny.slice(0,4),numCount:[n0,...nPost],sound:snd,hitstop:hs,flashBase:fl0,flashMax:flMax,flashAtTick:flTick,rowsIn2:rowsBetween(t,t+2).map(r=>r.t)});}
  const ok=(o)=>({num:o.numDomHit>0||(o.numCount[0]!=null&&Math.max(...o.numCount.slice(1).map(v=>v??-1))>o.numCount[0]),kb:o.dead||o.kbObs>=0.06||o.kbTicksSeen>0,snd:o.sound.length>0,flash:(o.flashMax!=null&&o.flashMax>=0.9)||o.dead});
  const verdicts=out.map(o=>Object.assign({t:o.t,src:o.src,dead:o.dead},ok(o)));
  const fails=verdicts.filter(v=>!(v.num&&v.kb&&v.snd&&v.flash));
  const tally={num:0,kb:0,snd:0,flash:0,all:0};for(const v of verdicts){if(v.num)tally.num++;if(v.kb)tally.kb++;if(v.snd)tally.snd++;if(v.flash)tally.flash++;if(v.num&&v.kb&&v.snd&&v.flash)tally.all++;}
  return {hits:hits.length,analyzed:out.length,tally,failsCount:fails.length,fails:fails.slice(0,20),rows:out}`));
const hitstopTable = ev(iife(`
  const rows=window.__c.rows;const ev=window.__c.ev;const gaps=[];for(let i=1;i<rows.length;i++)gaps.push(rows[i].ms-rows[i-1].ms);const sorted=[...gaps].sort((a,b)=>a-b);const med=sorted[Math.floor(sorted.length/2)];
  const hs=ev.filter(e=>e.T==='hitstop').slice(0,40).map(h=>{const i=rows.findIndex(r=>r.t>=h.tick);let freeze=null,frames=null;if(i>=0){const r0=rows[i];const j=rows.findIndex((r,k)=>k>i&&r.t>r0.t);if(j>0){freeze=rows[j].ms-r0.ms;frames=j-i;}}return {t:h.tick,ticks:h.ticks,cause:h.cause,wallMsOnTick:freeze,framesOnTick:frames};});
  const causes={};for(const h of ev.filter(e=>e.T==='hitstop'))causes[h.cause+':'+h.ticks]=(causes[h.cause+':'+h.ticks]||0)+1;
  const cam=rows.filter(r=>r.cam);const jerk=[];for(let i=2;i<cam.length;i++){const a=cam[i-2].cam,b=cam[i-1].cam,c=cam[i].cam;const jx=c[0]-2*b[0]+a[0],jz=c[2]-2*b[2]+a[2];jerk.push({t:cam[i].t,j:Math.hypot(jx,jz)});}
  const deaths=ev.filter(e=>e.T==='death').map(e=>e.tick);const near=new Set();for(const d of deaths)for(let k=d-2;k<=d+12;k++)near.add(k);
  const base=jerk.filter(j=>!near.has(j.t)).map(j=>j.j).sort((a,b)=>a-b);const baseMed=base[Math.floor(base.length/2)]||0,baseP95=base[Math.floor(base.length*0.95)]||0,baseMax=base.length?base[base.length-1]:0;
  const thr=Math.max(0.012,baseP95*3);
  const perKill=deaths.slice(0,40).map(d=>{const w=jerk.filter(j=>j.t>=d&&j.t<=d+12);const m=w.length?Math.max(...w.map(j=>j.j)):null;return {death:d,maxJerk:m!=null?+m.toFixed(4):null,ticksOver:w.filter(j=>j.j>thr).length};});
  return {tickGapMedianMs:med,hitstops:hs,causes,shake:{thr:+thr.toFixed(4),baseMed:+baseMed.toFixed(5),baseP95:+baseP95.toFixed(5),baseMax:+baseMax.toFixed(5),perKill,killsWithShake:perKill.filter(k=>k.maxJerk!=null&&k.maxJerk>thr).length,kills:perKill.length}}`));
files['certC1-hits'] = [
  arm, startRun, waitLive,
  ev(iife(`window.__c.flashOn=true;window.__c.refreshMeshes();E.cmd('iframe',0,3600);return 'flash tracer on '+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<70000){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);const n=window.__c.ev.filter(e=>e.T==='hit'&&e.target>=4).length;if(n>=30&&E.state().enemies.length>0)return {ok:true,tick:E.tick,hits:n,fps:E.fps};await sleep(50);}return {ok:false,tick:E.tick,hits:window.__c.ev.filter(e=>e.T==='hit'&&e.target>=4).length}`)),
  hitTable, hitstopTable,
  ev(iife(`const hits=window.__c.ev.filter(e=>e.T==='hit'&&e.target>=4).slice(0,6);return hits.map(h=>({t:h.tick,tgt:h.target,rows:window.__c.rows.filter(r=>r.t>=h.tick-2&&r.t<=h.tick+5).map(r=>r.t+':'+JSON.stringify(r.fl&&r.fl[h.target]))}))`)),
  ...[0,1,2,3,4,5,6,7].flatMap(i => [
    ev(iife(`${PROJ}const s=E.state();const last=window.__c.ev.filter(e=>e.T==='hit'&&e.target>=4).slice(-3).map(h=>[h.tick,h.target,h.amount,h.source]);const rows=window.__c.rows;const r=rows[rows.length-1];return {frame:${i},tick:E.tick,lastHits:last,enemies:s.enemies.map(e=>[e.id,e.kind,e.hp,...proj(e.x,0.35,e.z)]),flash:r&&r.fl,numerals:window.__c.dom.filter(d=>d.t>=E.tick-8).map(d=>[d.t,d.txt,d.x,d.y,d.w,d.h])}`)),
    shot(`certC1-hitseq_${String(i).padStart(2,'0')}`),
    ev(iife(`return {frame:${i},tickAfterShot:E.tick,lastHitTick:(window.__c.ev.filter(e=>e.T==='hit'&&e.target>=4).slice(-1)[0]||{}).tick}`)),
    wait(60),
  ]),
  ev(iife(`E.cmd('killAllEnemies');E.cmd('teleport',-3,2);return 'tp '+E.tick`)),
  wait(500),
  ev(iife(`const p=E.state().party[0];const r=E.cmd('spawn','dummy',p.x+1.6,p.z);return {dummy:r,player:[p.x,p.z]}`)),
  wait(400),
  ev(iife(`${PROJ}const s=E.state();const d=s.enemies.find(e=>e.kind==='dummy');window.__c.refreshMeshes();return {tick:E.tick,dummy:d&&[d.id,+d.x.toFixed(2),+d.z.toFixed(2),...proj(d.x,0.35,d.z),...proj(d.x,0.9,d.z)],enemies:s.enemies.length}`)),
  shot('certC1-dummy-base'),
  ...[0,1,2,3,4,5].flatMap(i => [
    ev(iife(`${PROJ}const r=E.cmd('hitOnce');const s=E.state();const d=s.enemies.find(e=>e.kind==='dummy');return {i:${i},hitTick:E.tick,r,dummy:d&&[d.id,+d.x.toFixed(2),+d.z.toFixed(2),...proj(d.x,0.35,d.z)]}`)),
    shot(`certC1-dummyhit_${i}`),
    ev(iife(`const rows=window.__c.rows;const last=rows.slice(-8).map(r=>r.t+':'+JSON.stringify(r.fl));return {i:${i},tickAfterShot:E.tick,fl:last.join(' '),numerals:window.__c.dom.slice(-3).map(d=>[d.t,d.txt,d.x,d.y,d.w,d.h]),dummies:E.state().enemies.filter(e=>e.kind==='dummy').map(e=>[e.id,e.hp,+e.x.toFixed(3)])}`)),
    wait(700),
    { type: 'if', cond: `(()=>!__echoes.state().enemies.some(e=>e.kind==='dummy'))()`, then: [ev(iife(`const p=E.state().party[0];const r=E.cmd('spawn','dummy',p.x+1.6,p.z);window.__c.refreshMeshes();return {respawn:r}`)), wait(400)] },
  ]),
  errs, coverage, snap('hits-end'),
];

// ---------- C4b: boss stomps (quake resolve / trample) + kill shake in the boss room ----------
files['certC1-boss'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room,boss:r&&r.boss,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 300 },
  ev(iife(`E.cmd('iframe',0,3600);return 'iframe '+E.tick`)),
  waitFor(`(()=>{const q=window.__c.ev.filter(e=>e.T==='boss_quake_start');return q.length>=1&&q[q.length-1].resolveTick-E.tick>=20&&q[q.length-1].resolveTick>E.tick})()`, 30000, `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>[e.tick,e.resolveTick,e.x,e.z,e.radius])`),
  ev(iife(`${PROJ}const q=window.__c.ev.filter(e=>e.T==='boss_quake_start').slice(-1)[0];const r=q.radius??1.6;return {tick:E.tick,quake:q,center:proj(q.x,0.02,q.z),box:[proj(q.x-r,0.02,q.z-r),proj(q.x+r,0.02,q.z+r),proj(q.x-r,0.02,q.z+r),proj(q.x+r,0.02,q.z-r)],player:proj(E.state().party[0].x,0.4,E.state().party[0].z)}`)),
  shot('certC1-boss-quake'),
  ev(iife(`const q=window.__c.ev.filter(e=>e.T==='boss_quake_start').slice(-1)[0];return {afterShotTick:E.tick,left:q.resolveTick-E.tick}`)),
  waitFor(`(()=>{const ev=window.__c.ev;return ev.filter(e=>e.T==='boss_quake_resolve').length>=2&&ev.filter(e=>e.T==='boss_trample').length>=1&&ev.filter(e=>e.T==='death').length>=1})()`, 45000, `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_resolve').length,tramples:window.__c.ev.filter(e=>e.T==='boss_trample').length,deaths:window.__c.ev.filter(e=>e.T==='death').length`),
  wait(600),
  ev(iife(`
    const rows=window.__c.rows;const ev=window.__c.ev;const cam=rows.filter(r=>r.cam);const jerk=[];for(let i=2;i<cam.length;i++){const a=cam[i-2].cam,b=cam[i-1].cam,c=cam[i].cam;jerk.push({t:cam[i].t,j:Math.hypot(c[0]-2*b[0]+a[0],c[2]-2*b[2]+a[2])});}
    const marks=[];for(const T of ['boss_quake_resolve','boss_trample','death'])for(const e of ev.filter(x=>x.T===T))marks.push({T,t:e.tick});
    const near=new Set();for(const m of marks)for(let k=m.t-2;k<=m.t+12;k++)near.add(k);
    const base=jerk.filter(j=>!near.has(j.t)).map(j=>j.j).sort((a,b)=>a-b);const baseP95=base[Math.floor(base.length*0.95)]||0;const thr=Math.max(0.012,baseP95*3);
    const per=marks.map(m=>{const w=jerk.filter(j=>j.t>=m.t&&j.t<=m.t+12);return {T:m.T,t:m.t,maxJerk:w.length?+Math.max(...w.map(j=>j.j)).toFixed(4):null,over:w.filter(j=>j.j>thr).length};});
    const quakes=ev.filter(e=>e.T==='boss_quake_start').map(s=>{const r=ev.find(x=>x.T==='boss_quake_resolve'&&x.tick>=s.tick);return {start:s.tick,planned:s.resolveTick-s.tick,resolved:r&&r.tick,gap:r?r.tick-s.tick:null};});
    const hs=ev.filter(e=>e.T==='hitstop').map(e=>[e.tick,e.ticks,e.cause]);
    return {thr:+thr.toFixed(4),baseP95:+baseP95.toFixed(5),per,quakes,hitstops:hs,hitsOnPlayer:ev.filter(e=>(e.T==='hit'||e.T==='hit_immune')&&e.target===0).map(e=>[e.T,e.tick,e.amount??e.reason]),boss:E.cmd('runState').boss}`)),
  errs, coverage, snap('boss-end'),
];

// ---------- C5: camera follow ----------
const camSample = (tag, n, first) => ev(aiife(`${PROJ}const out=[];for(let i=0;i<${n};i++){const s=E.state();const p=s.party[0];const c=P.stage.camera.position;const sp=proj(p.x,0.4,p.z);out.push({i:${first}+i,t:E.tick,x:+p.x.toFixed(2),z:+p.z.toFixed(2),sx:sp[0],sy:sp[1],cx:+c.x.toFixed(3),cz:+c.z.toFixed(3)});if(i<${n}-1)await sleep(250);}
    window.__c.cam=(window.__c.cam||[]).concat(out);return {leg:${JSON.stringify(tag)},samples:out}`));
const camLegSummary = (tag) => ev(iife(`const out=window.__c.cam||[];let maxJump=0,maxCamStep=0,minCamStep=99;for(let i=1;i<out.length;i++){const a=out[i-1],b=out[i];maxJump=Math.max(maxJump,Math.hypot(b.sx-a.sx,b.sy-a.sy));const cs=Math.hypot(b.cx-a.cx,b.cz-a.cz);maxCamStep=Math.max(maxCamStep,cs);minCamStep=Math.min(minCamStep,cs);}
    const inside=out.every(o=>o.sx>=320&&o.sx<=1280&&o.sy>=180&&o.sy<=720);window.__c.cam=[];
    return {leg:${JSON.stringify(tag)},n:out.length,maxScreenJumpPx:+maxJump.toFixed(1),pctOfWidth:+(maxJump/16).toFixed(2),maxCamStepU:+maxCamStep.toFixed(3),minCamStepU:+minCamStep.toFixed(3),allInsideCentral60:inside,sxRange:[Math.min(...out.map(o=>o.sx)),Math.max(...out.map(o=>o.sx))],syRange:[Math.min(...out.map(o=>o.sy)),Math.max(...out.map(o=>o.sy))]}`));
const camShotState = (tag) => ev(iife(`${PROJ}const p=E.state().party[0];return {leg:${JSON.stringify(tag)},shotTick:E.tick,player:[+p.x.toFixed(2),+p.z.toFixed(2)],screen:proj(p.x,0.4,p.z),head:proj(p.x,1.0,p.z),feet:proj(p.x,0,p.z),cam:P.stage.camera.position.toArray().map(v=>+v.toFixed(3))}`));
const camLeg = (k, tag) => [
  down(k),
  camSample(tag, 9, 0), shot(`certC1-cam-${tag}-mid`), camShotState(tag + '-mid'),
  camSample(tag, 8, 9), shot(`certC1-cam-${tag}-end`), camShotState(tag + '-end'),
  up(k), camLegSummary(tag),
];
files['certC1-cam'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,3600);const r=E.cmd('teleport',-5,4);return {tp:r,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 450 }, wait(700),
  ...camLeg('KeyD', 'd'), wait(150), ...camLeg('KeyW', 'w'),
  down('KeyW'), wait(2500), camShotState('w-wall'), shot('certC1-cam-w-wall'), up('KeyW'),
  down('KeyA'), wait(4000), camShotState('a-4s'), shot('certC1-cam-a-4s'), wait(3000), camShotState('a-wall'), shot('certC1-cam-a-wall'), up('KeyA'),
  down('KeyS'), wait(4000), camShotState('s-4s'), shot('certC1-cam-s-4s'), wait(3000), camShotState('s-wall'), shot('certC1-cam-s-wall'), up('KeyS'),
  ev(iife(`const rows=window.__c.rows.filter(r=>r.cam);const steps=[];for(let i=1;i<rows.length;i++){const a=rows[i-1].cam,b=rows[i].cam;steps.push({t:rows[i].t,d:Math.hypot(b[0]-a[0],b[2]-a[2])/(rows[i].t-rows[i-1].t)});}const ds=steps.map(s=>s.d).sort((a,b)=>a-b);const top=steps.slice().sort((a,b)=>b.d-a.d).slice(0,5);return {perTickCamStep:{max:+ds[ds.length-1].toFixed(4),p99:+ds[Math.floor(ds.length*0.99)].toFixed(4),median:+ds[Math.floor(ds.length/2)].toFixed(4)},top5:top.map(s=>[s.t,+s.d.toFixed(4)]),deaths:window.__c.ev.filter(e=>e.T==='death').map(e=>e.tick)}`)),
  coverage, snap('cam-end'),
];

// ---------- C6: threat pointers ----------
const threatDom = ev(iife(`const th=E.hud.threat();const layer=document.querySelector('#hud-threat');const lr=layer?layer.getBoundingClientRect():null;const nodes=[...document.querySelectorAll('#hud-threat .tm')].map(n=>{const r=n.getBoundingClientRect();const head=n.querySelector('.tm-head');const hr=head?head.getBoundingClientRect():null;return {tag:n.tagName,cls:n.getAttribute('class'),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),op:getComputedStyle(n).opacity,disp:getComputedStyle(n).display,head:hr&&[Math.round(hr.x),Math.round(hr.y),Math.round(hr.width),Math.round(hr.height)],transform:n.getAttribute('transform')||n.style.transform||null}});return {tick:E.tick,layer:layer&&{tag:layer.tagName,rect:[Math.round(lr.x),Math.round(lr.y),Math.round(lr.width),Math.round(lr.height)],op:getComputedStyle(layer).opacity,disp:getComputedStyle(layer).display,vis:getComputedStyle(layer).visibility},gated:th.gated,offFrame:th.offFrame,markersDrawn:th.markersDrawn,domMarkers:th.domMarkers,covered:th.covered,uncued:th.uncued,markers:th.markers,threats:th.threats,nodes:nodes.slice(0,12)}`));
files['certC1-threat'] = [
  arm, startRun,
  { type: 'mousemove', x: 800, y: 450 },
  waitFor(`E.state().enemies.length>=3&&E.hud.threat().markersDrawn>=1`, 15000, `,enemies:E.state().enemies.length,threat:(({offFrame,markersDrawn,domMarkers})=>({offFrame,markersDrawn,domMarkers}))(E.hud.threat())`),
  ev(iife(`${PROJ}const s=E.state();return {tick:E.tick,player:proj(s.party[0].x,0.4,s.party[0].z),enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(1),+e.z.toFixed(1),...proj(e.x,0.4,e.z)])}`)),
  shot('certC1-threat-natural'), threatDom,
  ev(iife(`E.cmd('iframe',0,3600);E.cmd('killAllEnemies');const r=E.cmd('teleport',-9,6);return {tp:r,tick:E.tick}`)),
  wait(900),
  ev(iife(`const a=E.cmd('spawn','mantis',10,-6);const b=E.cmd('spawn','boar',10,6);return {spawned:[a,b],tick:E.tick}`)),
  wait(700),
  ev(iife(`${PROJ}const s=E.state();return {tick:E.tick,player:proj(s.party[0].x,0.4,s.party[0].z),enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(1),+e.z.toFixed(1),...proj(e.x,0.4,e.z)])}`)),
  shot('certC1-threat-forced'), threatDom,
  snap('threat-end'),
];

// ---------- C4c: pixel flash on a fresh dummy (hitOnce -> shot on the very next frames) ----------
// The AI party kills a dummy within ~1.7 s, so the hit lands ~100 ms after the spawn and the
// shot follows the hit immediately. Three shots per trial: pre (before spawn), hit (right
// after hitOnce), post (~40 ticks later, flash over). Numeral / sound / knockback read from
// the same eval scope.
const flashTrial = (n) => [
  shot(`certC1-flash${n}-pre`),
  ev(iife(`const p=E.state().party[0];const id=E.cmd('spawn','dummy',p.x+1.8,p.z);window.__c.dummyId=id;window.__c.numMark=window.__c.dom.length;window.__c.evMark=window.__c.ev.length;const vfx=E.state().vfx||{};window.__c.num0=vfx.numerals??(vfx.arena&&vfx.arena.numerals);return {trial:${n},spawnTick:E.tick,id,player:[p.x,p.z]}`)),
  wait(110),
  ev(iife(`${PROJ}const s=E.state();const d=s.enemies.find(e=>e.id===window.__c.dummyId);window.__c.d0=d?[d.x,d.z]:null;const vfx=s.vfx||{};const r=d?E.cmd('hitOnce',d.id):null;const d2=E.state().enemies.find(e=>e.id===window.__c.dummyId);return {trial:${n},hitTick:E.tick,alive:!!d,hp0:d&&d.hp,r,hpAfter:d2&&d2.hp,screen:d&&proj(d.x,0.35,d.z),head:d&&proj(d.x,0.9,d.z),feet:d&&proj(d.x,0,d.z),num0:vfx.numerals??(vfx.arena&&vfx.arena.numerals)}`)),
  shot(`certC1-flash${n}-hit`),
  ev(iife(`${PROJ}const s=E.state();const d=s.enemies.find(e=>e.id===window.__c.dummyId);const vfx=s.vfx||{};const ev=window.__c.ev.slice(window.__c.evMark).filter(e=>['hit','sound','hitstop','death'].includes(e.T)).map(e=>[e.T,e.tick,e.target??e.id,e.amount??e.slot??e.ticks]);const dom=window.__c.dom.slice(window.__c.numMark).map(x=>[x.t,x.txt,x.x,x.y,x.w,x.h]);return {trial:${n},tickAfterShot:E.tick,num1:vfx.numerals??(vfx.arena&&vfx.arena.numerals),dummy:d&&[d.id,d.hp,+d.x.toFixed(3),+d.z.toFixed(3),d.kbTicks],moved:d&&window.__c.d0?+Math.hypot(d.x-window.__c.d0[0],d.z-window.__c.d0[1]).toFixed(3):null,events:ev,dom}`)),
  shot(`certC1-flash${n}-post`),
  ev(iife(`return {trial:${n},tickAfterPost:E.tick,dummies:E.state().enemies.filter(e=>e.kind==='dummy').map(e=>[e.id,e.hp])}`)),
  wait(900), ev(iife(`E.cmd('killAllEnemies');return 'cleanup '+E.tick`)), wait(1200),
];
files['certC1-flash'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,3600);E.cmd('killAllEnemies');E.cmd('teleport',-3,2);return 'setup '+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 }, wait(1500),
  ...flashTrial(1), ...flashTrial(2), ...flashTrial(3),
  errs, coverage, snap('flash-end'),
];

// ---------- C4d: numeral on the room-clearing kill (and a control kill mid-wave) ----------
const killProbe = (tag, cond) => [
  waitFor(cond, 60000, `,room:E.state().room,enemies:E.state().enemies.map(e=>[e.id,e.kind,e.hp])`),
  ev(iife(`const s=E.state();const e=s.enemies[0];E.cmd('setHp',e.id,0.05);const e2=E.state().enemies.find(x=>x.id===e.id);window.__c.kMark=E.tick;window.__c.kDom=window.__c.dom.length;window.__c.kEv=window.__c.ev.length;window.__c.kRow=window.__c.rows.length;const r=E.cmd('hitOnce',e.id);return {tag:${JSON.stringify(tag)},id:e.id,kind:e.kind,hpBefore:e.hp,hpSet:e2&&e2.hp,hitTick:E.tick,r,room:s.room}`)),
  wait(700),
  ev(iife(`const rows=window.__c.rows.slice(window.__c.kRow-3);const t0=window.__c.kMark;const ev=window.__c.ev.slice(window.__c.kEv).filter(e=>['hit','death','room_cleared','wave_start','sound','hitstop','reward','enemy_despawn'].includes(e.T)).map(e=>[e.T,e.tick,e.target??e.id,e.amount??e.slot??e.ticks??e.cause]);const dom=window.__c.dom.slice(window.__c.kDom).map(x=>[x.t,x.txt,x.x,x.y]);let maxGap=0,maxAt=null;for(let i=1;i<rows.length;i++){const g=rows[i].ms-rows[i-1].ms;if(g>maxGap){maxGap=g;maxAt=rows[i].t;}}return {tag:${JSON.stringify(tag)},hitTick:t0,numRows:rows.filter(r=>r.t>=t0-2&&r.t<=t0+30).map(r=>r.t+':'+r.num),events:ev.slice(0,20),dom,maxFrameGapMs:maxGap,maxGapAtTick:maxAt,ui:E.runUi().screen,phase:E.state().run.phase}`)),
];
files['certC1-lastkill'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,3600);return 'iframe '+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  ...killProbe('control-midwave', `(()=>{const s=E.state();return s.run.combatActive&&s.enemies.length>=2})()`),
  ...killProbe('room-clearing-kill', `(()=>{const s=E.state();return s.run.combatActive&&s.room&&s.room.waveIndex===s.room.wavesTotal-1&&s.room.pendingSpawns===0&&s.enemies.length===1})()`),
  errs, coverage, snap('lastkill-end'),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
