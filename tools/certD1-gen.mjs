// certD1 (performance & chrome certification critic, block D round 1, FRESH 2026-09-05 pass) — action-file
// generator. Writes tools/actions/certD1-*.json programmatically (JSON.stringify, never hand-escaped).
// Every eval is an IIFE; async IIFEs poll window.__echoes and RETURN the observed state so it lands in
// captures/<name>.console.txt as [EVAL]. The page library window.__D is re-declared in every file so each
// action file is self-contained.
import { writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = (name, acts) => { writeFileSync(join(root, 'tools/actions', `${name}.json`), JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); };
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=window.__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=window.__echoes;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(aiife(`const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await sl(8);}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}`));

// ---------------------------------------------------------------- shared page library (window.__D)
// D.sample(ms): requestAnimationFrame-delta sampler. Per frame it records [t, dt]; every dt > 100 ms is logged
// with its timestamp, sim tick, E.fps, entityCount, heap before/after, and the sim event ring (E.events) for the
// last 40 ticks. Returns warm-up (first 3 s) vs steady-state stats (mean fps, p50/p95/p99/max, >50/>100/>250
// counts), rolling 15 s windows (5 s step) with their >100 ms counts, 1 s samples of E.fps / entityCount /
// enemies / projectiles / vfx counts, Long Tasks (PerformanceObserver) and heap. D.arm(): sim events -> D.ev.
// D.vfx(): leak-proxy snapshot. D.verEl(): #version-label rect/text.
const LIB = iife(`window.__D=window.__D||{};const D=window.__D;D.ev=D.ev||[];D.lt=D.lt||[];
if(!D.po){try{D.po=new PerformanceObserver((l)=>{for(const e of l.getEntries())D.lt.push({start:+e.startTime.toFixed(0),dur:+e.duration.toFixed(1)});});D.po.observe({entryTypes:['longtask']});}catch(e){D.poErr=String(e);}}
D.arm=()=>{if(D.armed)return 'already';D.armed=true;for(const t of ['boss_spawn','boss_adds','boss_quake_start','boss_quake_resolve','boss_trample','boss_death','death','wave_start','enemy_spawn','room_cleared','run_end','run_start','return_to_camp','hitstop','room_enter','downed','revive','reward','draft_taken','path_chosen'])E.on(t,e=>D.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick;};
D.pct=(arr,p)=>{if(!arr.length)return null;const s=[...arr].sort((a,b)=>a-b);return +s[Math.min(s.length-1,Math.floor(p*s.length))].toFixed(2)};
D.stats=(fr)=>{if(fr.length<2)return null;const dts=fr.map(f=>f[1]);const tot=fr[fr.length-1][0]-fr[0][0];return {frames:fr.length,spanMs:Math.round(tot),meanFps:+(1000*(fr.length-1)/Math.max(1,tot)).toFixed(1),meanMs:+(tot/(fr.length-1)).toFixed(2),p50:D.pct(dts,0.5),p95:D.pct(dts,0.95),p99:D.pct(dts,0.99),max:+Math.max(...dts).toFixed(2),gt50:dts.filter(d=>d>50).length,gt100:dts.filter(d=>d>100).length,gt250:dts.filter(d=>d>250).length}};
D.heap=()=>performance.memory?+(performance.memory.usedJSHeapSize/1048576).toFixed(1):null;
D.ring=(n)=>(E.events||[]).filter(e=>e.tick>=E.tick-n).map(e=>e.tick+':'+e.type+(e.kind?'/'+e.kind:'')+(e.id!==undefined?'#'+e.id:''));
D.sample=async(ms)=>{const fr=[];const per=[];const gaps=[];let last=null;const t0=performance.now();let nextSec=t0;const sampleCost=[];const tick0=E.tick;const lt0=D.lt.length;let prevHeap=D.heap();await new Promise(res=>{const f=(now)=>{if(last!==null){const dt=now-last;fr.push([+(now-t0).toFixed(1),+dt.toFixed(2)]);if(dt>100){const h=D.heap();gaps.push({ms:+(now-t0).toFixed(0),dt:+dt.toFixed(1),tick:E.tick,fps:+E.fps.toFixed(1),ents:E.entityCount,heapBefore:prevHeap,heapAfter:h,ring:D.ring(40)});}}last=now;if(now>=nextSec){const c0=performance.now();let s=null;try{s=E.state();}catch(e){}const c1=performance.now();per.push({s:per.length,ms:Math.round(now-t0),tick:E.tick,fps:+E.fps.toFixed(1),ents:E.entityCount,enemies:s?s.enemies.length:null,eshots:s?s.eshots.length:null,bolts:s?s.skillBolts.length:null,zones:s?s.zones.length:null,azones:s?s.azones.length:null,numerals:s&&s.vfx?s.vfx.numerals:null,particles:s&&s.vfx?s.vfx.particles:null,bossHp:s&&s.run&&s.run.boss?Math.round(s.run.boss.hp):null,phase:s&&s.run?s.run.phase:null,heap:D.heap()});sampleCost.push(+(c1-c0).toFixed(1));nextSec+=1000;}prevHeap=D.heap();if(now-t0>=ms)res();else requestAnimationFrame(f);};requestAnimationFrame(f);});const warm=fr.filter(f=>f[0]<3000);const steady=fr.filter(f=>f[0]>=3000);const win=[];for(let w=3000;w+15000<=fr[fr.length-1][0]+1;w+=5000){const seg=fr.filter(f=>f[0]>=w&&f[0]<w+15000);if(seg.length>2)win.push({from:w,to:w+15000,gt100:seg.filter(f=>f[1]>100).length,max:+Math.max(...seg.map(f=>f[1])).toFixed(1),meanFps:D.stats(seg).meanFps});}return {tick0,tick1:E.tick,simTicks:E.tick-tick0,all:D.stats(fr),warm:D.stats(warm),steady:D.stats(steady),gaps,windows15s:win,perSec:per,longTasks:D.lt.slice(lt0).map(t=>({at:+(t.start-t0).toFixed(0),dur:t.dur})),stateCostMs:{max:Math.max(...sampleCost),mean:+(sampleCost.reduce((a,b)=>a+b,0)/sampleCost.length).toFixed(2)},heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null};};
D.verEl=()=>{const el=document.getElementById('version-label');if(!el)return {missing:true,version:E.version};const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return {version:E.version,text:el.textContent,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1),fs:cs.fontSize,color:cs.color,opacity:cs.opacity,display:cs.display,vis:cs.visibility,vw:innerWidth,vh:innerHeight};};
D.vfx=()=>{const s=E.state();const v=s.vfx||{};const a=v.arena||{};return {tick:E.tick,scene:s.scene,phase:s.run&&s.run.phase,ents:E.entityCount,enemies:s.enemies.length,eshots:s.eshots.length,bolts:s.skillBolts.length,zones:s.zones.length,azones:s.azones.length,vfxMode:v.mode,runs:v.runs,campEmitters:v.emitters,campEmbers:v.embers,fireflies:v.fireflies,gateMotes:v.gateMotes,campShadows:v.propShadows,arena:{numerals:a.numerals,decals:a.decals,particles:a.particles,dummies:a.dummies,emitters:a.emitters,embers:a.embers,propShadows:a.propShadows,smearGhosts:a.party&&a.party.smearGhosts},bandGuardMaterials:v.bandGuard&&v.bandGuard.materials,numeralNodes:document.querySelectorAll('#dmg-num-layer *').length,threatNodes:document.querySelectorAll('#hud-threat *').length,fizzleNodes:document.querySelectorAll('#nd-fizzle-layer *').length,domNodes:document.getElementsByTagName('*').length,heapMB:D.heap(),renderer:(()=>{const r=window.__arenaProbe&&window.__arenaProbe.stage&&window.__arenaProbe.stage.renderer;if(!r||!r.info)return null;return {programs:r.info.programs?r.info.programs.length:null,geometries:r.info.memory.geometries,textures:r.info.memory.textures};})()};};
return 'lib '+E.version+' t'+E.tick+' vw'+innerWidth+'x'+innerHeight+' poErr='+(D.poErr||'none');`);

const VER = ev(iife(`const v=window.__D.verEl();v.fpsMeter=(()=>{const f=document.getElementById('fps-meter');if(!f)return null;const q=f.getBoundingClientRect();return {text:f.textContent,x:q.x,y:q.y,w:q.width,h:q.height}})();v.apiVersion=E.version;return v`));
const LOAD = ev(iife(`return {tick:E.tick,fps:E.fps,ents:E.entityCount,scene:E.state().scene,hwConcurrency:navigator.hardwareConcurrency,now:new Date().toISOString()}`));
const RMB_DOWN = { type: 'mousedown', button: 'right' };
const RMB_UP = { type: 'mouseup', button: 'right' };
const AIM = { type: 'mousemove', x: 800, y: 380 };
const VFX = (tag) => ev(iife(`const v=window.__D.vfx();v.tag=${JSON.stringify(tag)};return v`));
const EVSUM = `const ev=window.__D.ev;r.events={waves:ev.filter(e=>e.T==='wave_start').map(e=>[e.tick,e.index,e.size]),spawns:ev.filter(e=>e.T==='enemy_spawn').length,deaths:ev.filter(e=>e.T==='death').length,hitstops:ev.filter(e=>e.T==='hitstop').length,cleared:ev.filter(e=>e.T==='room_cleared').map(e=>e.tick),downed:ev.filter(e=>e.T==='downed').map(e=>[e.tick,e.id]),revive:ev.filter(e=>e.T==='revive').map(e=>[e.tick,e.id]),quakeStart:ev.filter(e=>e.T==='boss_quake_start').map(e=>e.tick),quakeResolve:ev.filter(e=>e.T==='boss_quake_resolve').map(e=>e.tick),adds:ev.filter(e=>e.T==='boss_adds').map(e=>[e.tick,e.pct,e.spawned]),bossDeath:ev.filter(e=>e.T==='boss_death'||(e.T==='death'&&e.kind==='stag')).map(e=>e.tick),runEnd:ev.filter(e=>e.T==='run_end').map(e=>e.tick)};`;

// ---- D3 camp idle baseline (boot ?seed=999, settle 3000): 10 s sample + version label + vfx baseline
out('certD1-camp-idle', [ev(LIB), LOAD, VER,
  ev(aiife(`const r=await window.__D.sample(10000);const c=E.cmd('campState');r.campState={fireflies:c.fireflies,embers:c.embers,gateMotes:c.gateMotes,grass:c.grass,emitters:c.emitters,propShadows:c.propShadows,critters:c.prompt&&c.prompt.critters&&c.prompt.critters.length};return r`)),
  VFX('camp-idle'),
]);

// ---- D1 recon: which seed-999 room has the biggest waves (skipToRoom each, read waveSizes)
out('certD1-recon', [ev(LIB),
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,bootSeed:E.bootSeed,frame:r&&r.frame,room:r&&r.room}`)),
  ev(aiife(`const rows=[];for(const n of [1,2,3,4,5,6,8]){const r=E.cmd('skipToRoom',n);await sl(400);const s=E.state();const rs=E.cmd('runState');rows.push({n,room:rs.room,phase:rs.phase,mode:s.room&&s.room.mode,waveSizes:s.room&&s.room.waveSizes,wavesTotal:s.room&&s.room.wavesTotal,pending:s.room&&s.room.pendingSpawns,alive:s.enemies.length,ents:E.entityCount,defendTicks:s.room&&s.room.defendTicksLeft,boss:rs.boss&&{hp:rs.boss.hp,max:rs.boss.maxHp}});}return rows`)),
]);

// ---- D1 worst-case kill_all wave: room 2 (waves 5/4/3 for seed 999), RMB held (player auto-attacks), 25 s
const roomProbe = (name, room, ms) => out(name, [ev(LIB), LOAD,
  ev(iife(`window.__D.arm();const r=E.cmd('startRun');return {seed:E.seed,modes:r&&r.frame&&r.frame.modes,room:r&&r.room}`)),
  wait(300),
  ev(iife(`const r=E.cmd('skipToRoom',${room});const s=E.state();return {skip:{room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode},roomState:s.room,tick:E.tick,party:s.party.map(p=>[p.id,p.hp,+p.x.toFixed(1),+p.z.toFixed(1)])}`)),
  AIM, RMB_DOWN,
  ev(aiife(`const r=await window.__D.sample(${ms});${EVSUM}r.roomState=E.state().room;r.phase=E.cmd('runState').phase;r.party=E.state().party.map(p=>[p.id,p.hp,p.downed]);return r`)),
  RMB_UP, VFX('after-' + name),
]);
roomProbe('certD1-wave2', 2, 25000);
roomProbe('certD1-defend4', 4, 47000);
roomProbe('certD1-defend6', 6, 47000);

// ---- D1b synthetic stress at the BUILD_BRIEF density ceiling (40 concurrent enemies) topped up <=5/s
const PTS = '[[-5,-6.6],[5,-6.6],[-10.2,-3],[10.2,-3],[-10.2,3],[10.2,3],[-5,6.6],[5,6.6]]';
out('certD1-stress40', [ev(LIB), LOAD,
  ev(iife(`window.__D.arm();const r=E.cmd('startRun');return {seed:E.seed,room:r&&r.room}`)),
  waitFor(`E.state().enemies.length>=3`, 30000),
  ev(iife(`const P=${PTS};const ids=[];const n0=E.state().enemies.length;for(let i=n0;i<40;i++){const p=P[i%8];ids.push(E.cmd('spawn',i%3===1?'mantis':'boar',p[0]+(i%5)*0.3,p[1]));}return {before:n0,spawned:ids.length,after:E.state().enemies.length,tick:E.tick}`)),
  wait(800),
  AIM, RMB_DOWN,
  ev(aiife(`const P=${PTS};let top=0;const iv=setInterval(()=>{const s=E.state();const n=s.enemies.length;if(s.run&&s.run.phase!=='combat')return;let k=0;for(let i=n;i<40&&k<5;i++,k++){const p=P[i%8];E.cmd('spawn',i%3===1?'mantis':'boar',p[0]+(i%5)*0.3,p[1]);top++;}},1000);const r=await window.__D.sample(20000);clearInterval(iv);r.topUps=top;${EVSUM}r.phase=E.cmd('runState').phase;r.party=E.state().party.map(p=>[p.id,p.hp,p.downed]);return r`)),
  RMB_UP, VFX('after-stress40'),
]);

// ---- D2 boss: skipToRoom(8), wait Stag + first adds, then 20 s across quakes; a mid-sample screenshot too
out('certD1-boss', [ev(LIB), LOAD,
  ev(iife(`window.__D.arm();E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room,boss:r&&r.boss&&{hp:r.boss.hp,max:r.boss.maxHp},tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 300 }, RMB_DOWN,
  waitFor(`window.__D.ev.some(e=>e.T==='boss_adds')`, 40000, `,adds:window.__D.ev.filter(e=>e.T==='boss_adds').map(e=>[e.tick,e.pct,e.spawned]),quakes:window.__D.ev.filter(e=>e.T==='boss_quake_start').map(e=>e.tick),bossHp:E.cmd('runState').boss&&E.cmd('runState').boss.hp,enemies:E.state().enemies.length`),
  ev(aiife(`const r=await window.__D.sample(20000);${EVSUM}r.boss=E.cmd('runState').boss;r.phase=E.cmd('runState').phase;r.party=E.state().party.map(p=>[p.id,p.hp,p.downed]);return r`)),
  VER, RMB_UP, VFX('after-boss'),
]);

// ---- D2b boss with the boss held at a fixed HP fraction so the sample sees ONLY quakes/tramples (no adds, no
//      downed-ally cascade) — separates the boss render cost from the downed/hitstop path.
out('certD1-boss-steady', [ev(LIB), LOAD,
  ev(iife(`window.__D.arm();E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 300 }, RMB_DOWN,
  waitFor(`window.__D.ev.some(e=>e.T==='boss_adds')`, 40000, `,adds:window.__D.ev.filter(e=>e.T==='boss_adds').map(e=>[e.tick,e.pct,e.spawned])`),
  ev(aiife(`const iv=setInterval(()=>{try{const b=E.cmd('runState').boss;if(b&&b.active&&b.hp<0.62*b.maxHp)E.cmd('bossHp',0.7);}catch(e){}},300);const r=await window.__D.sample(20000);clearInterval(iv);${EVSUM}r.boss=E.cmd('runState').boss;r.phase=E.cmd('runState').phase;r.party=E.state().party.map(p=>[p.id,p.hp,p.downed]);return r`)),
  RMB_UP, VFX('after-boss-steady'),
]);

// ---- D6 layout sweep: camp / combat / draft / path / shop / boss / victory at the given viewport
const RECTS = (tag) => ev(iife(`const T=${JSON.stringify(tag)};const vw=innerWidth,vh=innerHeight;const vis=(n)=>{let p=n;while(p&&p!==document.body){const c=getComputedStyle(p);if(c.display==='none'||c.visibility==='hidden'||Number(c.opacity)<0.02)return false;p=p.parentElement;}return true;};const R=(n,label)=>{const r=n.getBoundingClientRect();if(r.width<0.5||r.height<0.5)return null;return {l:label,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),r:+r.right.toFixed(1),b:+r.bottom.toFixed(1),fs:+parseFloat(getComputedStyle(n).fontSize).toFixed(1),txt:(n.textContent||'').replace(/\\s+/g,' ').trim().slice(0,28),el:n};};const els=[];const add=(sel,label)=>{document.querySelectorAll(sel).forEach((n,i)=>{if(!vis(n))return;const r=R(n,label+'#'+i);if(r)els.push(r);});};add('#hud-banner','banner');add('#proto-hud','bar');add('.hud-port','portrait');add('.hud-slot','slot');add('#version-label','version');add('#fps-meter','fpsmeter');add('#camp-prompt','prompt');add('#hud-threat .tm','threat');add('#run-screen .rn-page','page');add('#run-screen .rn-card','card');add('#run-screen .rn-door','door');add('#run-screen .rn-btn','button');add('#run-screen .rn-title','title');add('#run-screen .rn-hint','hint');add('#run-screen .rn-wallet, #run-screen .rn-plaque, #run-screen .rn-note, #run-screen .rn-sub, #run-screen .rn-subline','text');const P=E.hud.portraits();P.forEach((p,i)=>{if(p.hpBox&&p.hpBox.w>0)els.push({l:'hpbar#'+i,x:p.hpBox.x,y:p.hpBox.y,w:p.hpBox.w,h:p.hpBox.h,r:p.hpBox.x+p.hpBox.w,b:p.hpBox.y+p.hpBox.h,fs:0,txt:'',el:null});});const outside=els.filter(e=>e.x<-0.5||e.y<-0.5||e.r>vw+0.5||e.b>vh+0.5).map(e=>({l:e.l,x:e.x,y:e.y,r:e.r,b:e.b}));const contains=(a,b)=>a.el&&b.el&&(a.el.contains(b.el)||b.el.contains(a.el));const skip=(a,b)=>contains(a,b)||(a.l.startsWith('hpbar')&&(b.l.startsWith('portrait')||b.l.startsWith('bar')))||(b.l.startsWith('hpbar')&&(a.l.startsWith('portrait')||a.l.startsWith('bar')))||(a.l.startsWith('page')||b.l.startsWith('page'));const hits=[];for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i],b=els[j];if(skip(a,b))continue;const ox=Math.min(a.r,b.r)-Math.max(a.x,b.x);const oy=Math.min(a.b,b.b)-Math.max(a.y,b.y);if(ox>0.5&&oy>0.5)hits.push({a:a.l,b:b.l,ox:+ox.toFixed(1),oy:+oy.toFixed(1)});}const m=E.hud.metrics();const bn=E.hud.banner();const u=E.runUi();const rs=E.cmd('runState');return {tag:T,vw,vh,tick:E.tick,fps:+E.fps.toFixed(1),scene:E.state().scene,phase:rs.phase,room:rs.room,screen:u.screen,fit:u.fit,floors:u.floors,metrics:{scale:m.scale,clamped:m.clamped,zonePct:m.zonePctOfHeight,zone1:m.zone1Box,zone2:m.zone2Box,textPx:m.realTextPx,keyPx:m.realKeyPx,numPx:m.realNumeralPx},banner:{mode:bn.mode,show:bn.show,text:bn.text,box:bn.box},n:els.length,outside,overlaps:hits,rects:els.map(e=>({l:e.l,x:e.x,y:e.y,w:e.w,h:e.h,fs:e.fs,txt:e.txt}))}`));
const layout = (W) => {
  const n = (s) => `certD1-layout-${W}-${s}`;
  return [ev(LIB), LOAD, VER, wait(300), RECTS('camp'), shot(n('camp')),
    ev(iife(`window.__D.arm();const r=E.cmd('startRun');return {seed:E.seed,modes:r&&r.frame&&r.frame.modes}`)),
    { type: 'mousemove', x: Math.round(W * 0.31), y: Math.round(W * 0.28) },
    waitFor(`E.state().enemies.length>=3 && E.hud.banner().show`, 30000, `,enemies:E.state().enemies.length`),
    wait(300), RECTS('combat'), VER, shot(n('combat')),
    ev(aiife(`const t0=performance.now();let kills=0;while(performance.now()-t0<60000){const u=E.runUi();if(u.screen!=='none')return {ok:true,screen:u.screen,tick:E.tick,kills};if(E.state().enemies.length>0){E.cmd('killAllEnemies');kills++;}await sl(250);}return {ok:false,screen:E.runUi().screen}`)),
    wait(700), RECTS('draft'), shot(n('draft')),
    key('Enter', 80), wait(700), RECTS('path'), shot(n('path')),
    ev(iife(`E.cmd('pathChoose',0);const r=E.cmd('skipToRoom',7);return {room:r&&r.room,phase:r&&r.phase}`)),
    wait(1500), RECTS('shop'), VER, shot(n('shop')),
    ev(iife(`const r=E.cmd('skipToRoom',8);return {room:r&&r.room,phase:r&&r.phase}`)),
    waitFor(`E.hud.banner().mode==='boss' && E.hud.banner().show`, 20000, `,text:E.hud.banner().text`),
    wait(1200), RECTS('boss'), shot(n('boss')),
    ev(iife(`const k=E.cmd('killBoss');const a=E.cmd('killAllEnemies');return {killBoss:k,killAll:a}`)),
    waitFor(`E.runUi().screen==='victory'||E.runUi().screen==='end'`, 20000, `,screen:E.runUi().screen`),
    wait(1000), RECTS('victory'), VER, shot(n('victory')),
  ];
};
out('certD1-layout-1024', layout(1024));
out('certD1-layout-2560', layout(2560));
out('certD1-layout-1600', layout(1600));
// camp portal prompt ("press E") — the one camp HUD element the sweep above never shows
for (const W of [1024, 2560]) out(`certD1-prompt-${W}`, [ev(LIB), LOAD,
  ev(iife(`E.cmd('teleport',0,-5.6);return E.cmd('campState').player`)),
  wait(700),
  ev(iife(`const c=E.cmd('campState');return {inPortal:c.inPortal,promptVisible:c.promptVisible,box:c.prompt.box,player:c.player}`)),
  RECTS('prompt'), VER,
]);

// ---- D7 leak proxy: camp baseline -> two cmd-driven runs -> camp; vfx/entity counts at each bookend
const RUN = ev(aiife(`const log=[];const t0=performance.now();window.__D.arm();const r0=E.cmd('startRun');log.push('startRun r'+(r0&&r0.room)+' t'+E.tick);let guard=0;let last='';while(performance.now()-t0<170000&&guard++<900){const s=E.state();const u=E.runUi();const rs=E.cmd('runState');const st=rs.phase+'/'+rs.room+'/'+u.screen;if(st!==last){log.push(st+' t'+E.tick);last=st;}if(rs.phase==='victory'||rs.phase==='defeat'){break;}if(u.screen==='draft'){const d=E.cmd('draftTake');log.push('draftTake '+JSON.stringify(d).slice(0,60));await sl(350);continue;}if(u.screen==='path'){const d=E.cmd('pathChoose',0);log.push('pathChoose '+JSON.stringify(d).slice(0,60));await sl(350);continue;}if(u.screen==='shop'||(rs.room===7&&rs.phase!=='combat')){const d=E.cmd('skipToRoom',8);log.push('skipToRoom8 '+JSON.stringify(d&&{room:d.room,phase:d.phase}));await sl(350);continue;}if(rs.phase==='combat'){if(rs.room===8){if(rs.boss&&rs.boss.active){const k=E.cmd('killBoss');log.push('killBoss '+JSON.stringify(k).slice(0,80)+' t'+E.tick);}if(s.enemies.length>0)E.cmd('killAllEnemies');}else if(rs.room===7){const d=E.cmd('skipToRoom',8);log.push('skipToRoom8(from combat r7) '+JSON.stringify(d&&{room:d.room,phase:d.phase}));}else if(s.room&&s.room.mode==='defend'&&!s.room.cleared){const c=E.cmd('clearRoom');log.push('clearRoom(defend r'+rs.room+') '+JSON.stringify(c).slice(0,40)+' t'+E.tick);}else if(s.enemies.length>0){E.cmd('killAllEnemies');}}await sl(250);}const ev=window.__D.ev;return {log,ms:Math.round(performance.now()-t0),phase:E.cmd('runState').phase,screen:E.runUi().screen,tick:E.tick,ev:{spawns:ev.filter(e=>e.T==='enemy_spawn').length,deaths:ev.filter(e=>e.T==='death').length,cleared:ev.filter(e=>e.T==='room_cleared').length,runEnd:ev.filter(e=>e.T==='run_end').map(e=>e.tick)}}`));
const TO_CAMP = [key('Enter', 80), wait(4000),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<8000){const rs=E.cmd('runState');const s=E.state();if(rs.phase==='idle'&&s.scene==='camp'&&E.runUi().screen==='none')return {viaEnter:true,tick:E.tick};await sl(100);}const r=E.cmd('returnToCamp');await sl(2500);const rs=E.cmd('runState');return {viaEnter:false,returnToCamp:r,phase:rs.phase,scene:E.state().scene,screen:E.runUi().screen,tick:E.tick}`)),
  wait(3000)];
out('certD1-leak', [ev(LIB), LOAD, wait(1500),
  VFX('baseline'),
  RUN, ...TO_CAMP,
  ev(iife(`const v=window.__D.vfx();v.tag='after-run-1';v.events=window.__D.ev.filter(e=>['run_end','return_to_camp'].includes(e.T)).map(e=>e.T+' t'+e.tick);return v`)),
  RUN, ...TO_CAMP,
  ev(iife(`const v=window.__D.vfx();v.tag='after-run-2';v.events=window.__D.ev.filter(e=>['run_end','return_to_camp'].includes(e.T)).map(e=>e.T+' t'+e.tick);return v`)),
  wait(6000),
  VFX('after-run-2+6s'),
  ev(aiife(`const r=await window.__D.sample(8000);return {tag:'camp-after-2-runs',steady:r.steady,all:r.all,gaps:r.gaps.map(g=>({ms:g.ms,dt:g.dt,tick:g.tick}))}`)),
  VFX('after-run-2+14s'),
]);
