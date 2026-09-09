// certC2-b round-2 audit re-run, probe generators.
//  certC2-b-arc   : G1 — hitstop on NON-KILLING melee-arc connects.
//                   Enemy HP is pinned to full by a 25 ms keepalive so NOTHING dies:
//                   the §9 "no stacking above 4 ticks per 20-tick window" cap cannot
//                   hide an arc hitstop behind kill hitstops. Three independent
//                   measurements per hit: (a) `hitstop` events, (b) per-tick WALL DWELL
//                   from a raw rAF frame log (a real sim pause shows as the tick counter
//                   dwelling ~2x-3x its normal wall duration), (c) a kill-phase control.
//  certC2-b-hits  : G2 — >= 20 NON-KILLING hits, each with flash + numeral + knockback
//                   + sound, melee arcs included; flash from a per-rendered-frame
//                   readback of the live WebGL canvas around every enemy.
import { writeFileSync, mkdirSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const mv = (x, y) => ({ type: 'mousemove', x, y });
const kd = (k) => ({ type: 'keydown', key: k });
const ku = (k) => ({ type: 'keyup', key: k });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;

const EVT = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn',
  'telegraph_start','telegraph_resolve','enemy_fire','enemy_bite','hit','hit_immune','death','hitstop','sound','heal',
  'intent','intent_denied','dash_end','downed','revive','screenshake','flash','knockback',
  'basic_fire','skill_cast','ally_cast','ally_basic'];

const arm = ev(iife(`
  window.__c={ev:[],rows:[],dom:[],frames:[],started:performance.now(),grabOn:false,frozen:[],buf:{},wser:{}};
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>{try{window.__c.ev.push(Object.assign({T:t,ms:Math.round(performance.now()-window.__c.started)},e))}catch(err){window.__c.ev.push({T:t,bad:1})}});
  const L=document.querySelector('#dmg-num-layer');window.__c.numLayer=!!L;
  const lastKey=new WeakMap();
  if(L){const mo=new MutationObserver(muts=>{const t=E.tick;const seen=new Set();for(const m of muts){const n=m.target.nodeType===3?m.target.parentElement:m.target;const el=n&&n.closest?n.closest('.dmg-num'):null;if(!el||seen.has(el))continue;seen.add(el);const cs=getComputedStyle(el);const vis=!(cs.display==='none'||cs.opacity==='0'||cs.visibility==='hidden'||!el.textContent);const k=el.textContent+'|'+vis;if(lastKey.get(el)===k)continue;lastKey.set(el,k);if(!vis)continue;const r=el.getBoundingClientRect();window.__c.dom.push({t,txt:el.textContent,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),col:cs.color});}});mo.observe(L,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});}
  let last=-1;
  const f=()=>{const now=performance.now()-window.__c.started;const t=E.tick;
    window.__c.frames.push([Math.round(now*10)/10,t]);
    if(window.__c.frames.length>60000)window.__c.frames.splice(0,20000);
    if(t!==last){last=t;const s=E.state();const p=s.party[0];const en={};for(const e of s.enemies)en[e.id]=[+e.x.toFixed(3),+e.z.toFixed(3),e.hp,e.kbTicks];
      window.__c.rows.push({t,ms:Math.round(now),px:+p.x.toFixed(4),pz:+p.z.toFixed(4),hp:p.hp,num:(s.vfx&&(s.vfx.numerals??(s.vfx.arena&&s.vfx.arena.numerals)))??null,en});
      if(window.__c.rows.length>24000)window.__c.rows.splice(0,9000);}
    requestAnimationFrame(f);};
  requestAnimationFrame(f);
  return 'armed t'+E.tick+' ver '+E.version+' numLayer '+window.__c.numLayer+' probe '+!!window.__arenaProbe`));

// dwell helpers live in page scope so both probes can call them
const dwellLib = ev(iife(`
  window.__c.dwell=(T)=>{const F=window.__c.frames;let i0=-1;for(let i=0;i<F.length;i++){if(F[i][1]===T){i0=i;break;}if(F[i][1]>T)return null;}
    if(i0<0)return null;let j=i0;while(j<F.length&&F[j][1]<=T)j++;if(j>=F.length)return null;return +(F[j][0]-F[i0][0]).toFixed(1);};
  window.__c.dwellStats=(lo,hi)=>{const F=window.__c.frames;const d=[];let i=0;
    while(i<F.length){const T=F[i][1];let j=i;while(j<F.length&&F[j][1]===T)j++;if(j<F.length&&T>=lo&&T<=hi&&F[j][1]===T+1)d.push(F[j][0]-F[i][0]);i=j;}
    d.sort((a,b)=>a-b);const q=(p)=>d.length?+d[Math.min(d.length-1,Math.floor(p*d.length))].toFixed(1):null;
    return {n:d.length,min:q(0),p25:q(0.25),median:q(0.5),p90:q(0.9),p99:q(0.99),max:q(0.999)};};
  return 'dwell lib ok'`));

const startRun = ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,ver:E.version,tick:E.tick,room:r&&r.room}`));
const LIVE = `(()=>{const s=__echoes.state();return s.run.active&&s.run.combatActive&&s.enemies.length>0})()`;
const waitFor = (cond, timeout = 45000, extra = '') =>
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,ms:Math.round(performance.now()-t0)${extra}};await sleep(8);}return {ok:false,tick:E.tick${extra}}`));
const waitLive = waitFor(LIVE, 45000, `,enemies:E.state().enemies.length,fps:E.fps`);
const snap = (tag) => ev(iife(`const s=E.state();return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,ver:E.version,phase:s.run.phase,room:s.run.room,enemies:s.enemies.length,party:s.party.map(p=>[p.id,p.kind,p.hp])}`));

// pin every enemy at full HP: nothing can die -> no kill hitstop, cap window free
const pinOn = ev(iife(`
  window.__c.pinTicks=0;
  window.__c.pin=setInterval(()=>{try{const s=E.state();for(const e of s.enemies){if(e.hp<(e.maxHp||e.hp))E.cmd('setHp',e.id,1);}window.__c.pinTicks++;}catch(err){}},25);
  const s=E.state();const e=s.enemies[0];const before=e&&e.hp;
  return {pinned:true,tick:E.tick,enemyKeys:e?Object.keys(e):null,enemy0:e,before}`));
const pinOff = ev(iife(`clearInterval(window.__c.pin);window.__c.pin=null;return {pinOff:true,tick:E.tick,pinTicks:window.__c.pinTicks}`));

// classify a hit source as melee arc / ranged
const ARC = `const ARCSRC=['tank_basic','swordsman_basic','sword_basic','heavy_slam','brutal_cleave','flurry','lunge_strike','restorative_wave','melee'];const isArc=(s)=>ARCSRC.some(a=>String(s).includes(a));`;

const hitReport = (tag, lo, hi) => ev(iife(`${ARC}
  const H=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=${lo}&&e.tick<=${hi});
  const HS=window.__c.ev.filter(e=>e.T==='hitstop'&&e.tick>=${lo}-2&&e.tick<=${hi}+4);
  const D=window.__c.ev.filter(e=>e.T==='death'&&e.tick>=${lo}&&e.tick<=${hi});
  const bySrc={};for(const h of H){const k=h.source+(isArc(h.source)?' [ARC]':' [ranged]');bySrc[k]=(bySrc[k]||0)+1;}
  const perHit=H.map(h=>{const st=HS.find(s=>s.tick>=h.tick&&s.tick<=h.tick+2);const dead=D.some(d=>d.id===h.target&&Math.abs(d.tick-h.tick)<=1);
    return {t:h.tick,src:h.source,arc:isArc(h.source),atk:h.attacker,tgt:h.target,amt:h.amount,dead,stop:st?st.cause+':'+st.ticks:null,dwell:window.__c.dwell(h.tick)};});
  const arcHits=perHit.filter(h=>h.arc&&!h.dead);
  const causes={};for(const s of HS)causes[s.cause+':'+s.ticks]=(causes[s.cause+':'+s.ticks]||0)+1;
  const dw=arcHits.map(h=>h.dwell).filter(v=>v!=null).sort((a,b)=>a-b);
  return {tag:${JSON.stringify(tag)},window:[${lo},${hi}],hits:H.length,deaths:D.length,hitstops:HS.length,causes,bySrc,
    nonKillArcHits:arcHits.length,nonKillArcWithHitstop:arcHits.filter(h=>h.stop).length,
    arcDwell:{n:dw.length,min:dw[0],median:dw[Math.floor(dw.length/2)],p90:dw[Math.floor(dw.length*0.9)],max:dw[dw.length-1]},
    baselineDwell:window.__c.dwellStats(${lo},${hi}),
    sampleArc:arcHits.slice(0,24)}`));

const files = {};

// ===================== G1: certC2-b-arc =====================
files['certC2-b-arc'] = [
  arm, dwellLib, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,20000);E.cmd('teleport',0,0);return 'iframe+tp t'+E.tick`)),
  mv(800, 450),
  pinOn,
  ev(aiife(`await sleep(400);const s=E.state();return {check:'setHp works?',enemies:s.enemies.map(e=>[e.id,e.kind,e.hp,e.maxHp])}`)),
  ev(iife(`window.__c.phaseA=E.tick;return {phaseAstart:E.tick}`)),
  // phase A: 60 s of pinned combat, nothing dies. Decline any UI that appears.
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<60000){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');
    const p=E.state().party[0];if(p.hp<60)E.cmd('setHp',0,1);await sleep(120);}
    return {phaseAend:E.tick,fps:E.fps,enemies:E.state().enemies.length,hits:window.__c.ev.filter(e=>e.T==='hit').length,deaths:window.__c.ev.filter(e=>e.T==='death').length}`)),
  ev(iife(`window.__c.phaseAend=E.tick;return {phaseA:[window.__c.phaseA,E.tick]}`)),
  ev(iife(`return window.__c.dwellReport=window.__c.dwellStats(window.__c.phaseA,window.__c.phaseAend)`)),
  hitReport('A-pinned', 0, 999999),
  // per-source hitstop coverage table over phase A
  ev(iife(`${ARC}
    const H=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=window.__c.phaseA);
    const HS=window.__c.ev.filter(e=>e.T==='hitstop');
    const D=window.__c.ev.filter(e=>e.T==='death');
    const tbl={};
    for(const h of H){const dead=D.some(d=>d.id===h.target&&Math.abs(d.tick-h.tick)<=1);const k=h.source+(isArc(h.source)?'|ARC':'|ranged')+(dead?'|KILL':'|nonkill');
      const st=HS.find(s=>s.tick>=h.tick&&s.tick<=h.tick+2);tbl[k]=tbl[k]||{n:0,stop:0,dwellSum:0,dwellN:0};tbl[k].n++;if(st)tbl[k].stop++;const d=window.__c.dwell(h.tick);if(d!=null){tbl[k].dwellSum+=d;tbl[k].dwellN++;}}
    for(const k in tbl)tbl[k].meanDwell=tbl[k].dwellN?+(tbl[k].dwellSum/tbl[k].dwellN).toFixed(1):null;
    return {tbl,allHitstops:HS.map(s=>[s.tick,s.cause,s.ticks])}`)),
  // A2: try to give the PLAYER a damaging melee arc and swing it
  ev(iife(`const g1=E.cmd('giveSkill','heavy_slam');const g2=E.cmd('giveSkill','flurry');const s=E.state();
    return {heavy_slam:g1,flurry:g2,slots:s.skills.map(k=>k&&k.id),build:s.build.skills.map(b=>[b.id,b.archetype,b.shape])}`)),
  ev(iife(`const s=E.state();const e=s.enemies[0];if(!e)return 'none';E.cmd('teleport',e.x-0.5,e.z);window.__c.arcMark=E.tick;window.__c.arcTgt=e.id;return {tp:[e.x-0.5,e.z],tgt:e.id,tick:E.tick}`)),
  wait(200),
  ...[0,1,2,3,4,5,6,7].flatMap(() => [kd('Digit3'), ku('Digit3'), wait(120), kd('Digit4'), ku('Digit4'), wait(900),
    ev(iife(`const s=E.state();const e=s.enemies[0];if(e)E.cmd('teleport',e.x-0.5,e.z);return E.tick`))]),
  ev(iife(`${ARC}
    const H=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=window.__c.arcMark&&e.attacker===0);
    const HS=window.__c.ev.filter(e=>e.T==='hitstop'&&e.tick>=window.__c.arcMark);
    const C=window.__c.ev.filter(e=>(e.T==='skill_cast'||e.T==='intent_denied')&&e.tick>=window.__c.arcMark);
    return {playerHits:H.map(h=>({t:h.tick,src:h.source,amt:h.amount,tgt:h.target,arc:isArc(h.source),stop:HS.find(s=>s.tick>=h.tick&&s.tick<=h.tick+2)||null,dwell:window.__c.dwell(h.tick)})),
      casts:C.slice(0,12).map(c=>[c.tick,c.T,c.skill||c.reason]),hitstopsSince:HS.map(s=>[s.tick,s.cause,s.ticks])}`)),
  // phase B control: unpin, let kills happen, compare dwell on kill ticks
  pinOff,
  ev(iife(`window.__c.phaseB=E.tick;return {phaseBstart:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<25000){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');await sleep(120);}
    return {phaseBend:E.tick,deaths:window.__c.ev.filter(e=>e.T==='death'&&e.tick>=window.__c.phaseB).length}`)),
  ev(iife(`${ARC}
    const D=window.__c.ev.filter(e=>e.T==='death'&&e.tick>=window.__c.phaseB);
    const HS=window.__c.ev.filter(e=>e.T==='hitstop'&&e.tick>=window.__c.phaseB);
    const H=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=window.__c.phaseB);
    const kills=D.map(d=>{const st=HS.find(s=>Math.abs(s.tick-d.tick)<=2);return {t:d.tick,id:d.id,stop:st?st.cause+':'+st.ticks:null,dwell:window.__c.dwell(d.tick)};});
    const nonKillArc=H.filter(h=>isArc(h.source)&&!D.some(d=>d.id===h.target&&Math.abs(d.tick-h.tick)<=1));
    return {controlKills:kills,killDwellMedian:(()=>{const v=kills.map(k=>k.dwell).filter(x=>x!=null).sort((a,b)=>a-b);return v[Math.floor(v.length/2)];})(),
      nonKillArcInB:nonKillArc.length,nonKillArcWithStopInB:nonKillArc.filter(h=>HS.find(s=>s.tick>=h.tick&&s.tick<=h.tick+2)).length,
      nonKillArcDwellMedian:(()=>{const v=nonKillArc.map(h=>window.__c.dwell(h.tick)).filter(x=>x!=null).sort((a,b)=>a-b);return v[Math.floor(v.length/2)];})(),
      baselineB:window.__c.dwellStats(window.__c.phaseB,E.tick)}`)),
  ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {totals:m,tick:E.tick,fps:E.fps}`)),
  snap('arc-end'),
];

mkdirSync('tools/actions', { recursive: true });
for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote tools/actions/' + name + '.json', acts.length, 'actions');
}
