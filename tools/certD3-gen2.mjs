// Certification block D round 3 — action generator batch 2 (perf + layout + leak).
import { writeFileSync } from 'fs';
import { ev, wait, shot, down, up, key, iife, waitFor, arm, sampler } from './certD3-gen.mjs';

const rmbOn = [{ type: 'mousemove', x: 800, y: 380 }, { type: 'mousedown', button: 'right' }];
const rmbOff = [{ type: 'mouseup', button: 'right' }];

const verProbe = ev(iife("const out=[...document.querySelectorAll('body *')].filter(el=>!el.children.length&&/^v?\\s*\\d+\\.\\d+\\.\\d+$/.test((el.textContent||'').trim())).map(el=>{const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return {tag:el.tagName,id:el.id,cls:String(el.className),text:(el.textContent||'').trim(),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],color:cs.color,font:cs.fontSize+' '+cs.fontFamily.slice(0,24),op:cs.opacity,z:cs.zIndex};});return {vp:[innerWidth,innerHeight],version:E.version,found:out}"));

const peakArm = ev(iife("window.__pk={max:0,at:0,maxEnts:0,n:0};window.__pkiv=setInterval(()=>{try{const s=E.state();window.__pk.n++;if(s.enemies.length>window.__pk.max){window.__pk.max=s.enemies.length;window.__pk.at=E.tick;}if(E.entityCount>window.__pk.maxEnts)window.__pk.maxEnts=E.entityCount;}catch(e){}},100);return 'peak armed t'+E.tick"));
const peakRead = ev(iife("clearInterval(window.__pkiv);const s=E.state();return {peak:window.__pk,now:{enemies:s.enemies.length,ents:E.entityCount,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length},vfx:s.vfx&&{numerals:s.vfx.numerals,decals:s.vfx.decals,particles:s.vfx.particles,emitters:s.vfx.emitters,propShadows:s.vfx.propShadows,grass:s.vfx.grass}}"));

// ---- layout probe: component rects, viewport overflow, pairwise intersection ----
const layoutProbe = (tag) => ev(iife(`const vw=innerWidth,vh=innerHeight;const T=${JSON.stringify(tag)};
const vis=(el)=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.02)return false;const r=el.getBoundingClientRect();return r.width>0.5&&r.height>0.5;};
const R=(el)=>{const r=el.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];};
const nm=(el)=>((el.id?'#'+el.id:'')+(el.className?'.'+String(el.className).trim().split(/\\s+/).join('.'):''))||el.tagName;
const comps=[];
const hud=document.getElementById('hud');
if(hud)for(const el of hud.children)if(vis(el))comps.push([nm(el),R(el),(el.textContent||'').trim().slice(0,28)]);
const rs=document.getElementById('run-screen');
if(rs&&vis(rs)){comps.push([nm(rs),R(rs),'']);for(const el of rs.querySelectorAll('.rn-page,.rn-card,.rn-door,button'))if(vis(el))comps.push([nm(el),R(el),(el.textContent||'').trim().slice(0,24)]);}
for(const el of document.querySelectorAll('body > *'))if(el.tagName!=='CANVAS'&&el.id!=='hud'&&el.id!=='run-screen'&&vis(el))comps.push([nm(el),R(el),el.childElementCount?'':(el.textContent||'').trim().slice(0,28)]);
const vers=[...document.querySelectorAll('body *')].filter(el=>!el.children.length&&/^v?\\s*\\d+\\.\\d+\\.\\d+$/.test((el.textContent||'').trim()));
for(const el of vers)if(vis(el))comps.push(['VERSION'+nm(el),R(el),(el.textContent||'').trim()]);
const subs=[];
for(const sel of ['.hud-port','.hud-slot','.hud-port-hp','.hud-bn-label','.hud-bn-num','.hud-loc-name','.hud-glint-num'])
  for(const el of document.querySelectorAll(sel))if(vis(el))subs.push([sel,R(el),(el.textContent||'').trim().slice(0,16)]);
const over=[];
for(const el of document.querySelectorAll('body *')){if(el.tagName==='CANVAS'||el.ownerSVGElement)continue;if(!vis(el))continue;const r=el.getBoundingClientRect();
  if(r.left<-0.5||r.top<-0.5||r.right>vw+0.5||r.bottom>vh+0.5){if(Math.round(r.width)>=vw&&Math.round(r.height)>=vh)continue;over.push([nm(el),R(el)]);}}
const ix=(a,b)=>{const x=Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]);const y=Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]);return x>0.5&&y>0.5?[Math.round(x),Math.round(y)]:null;};
const hits=[];const list=comps.filter(c=>!/^#run-screen/.test(c[0]));
for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const o=ix(list[i][1],list[j][1]);if(o)hits.push([list[i][0],list[j][0],o]);}
const subHits=[];
for(let i=0;i<subs.length;i++)for(let j=i+1;j<subs.length;j++){if(subs[i][0]!==subs[j][0])continue;const o=ix(subs[i][1],subs[j][1]);if(o)subHits.push([subs[i][0],subs[i][1],subs[j][1],o]);}
return {tag:T,vp:[vw,vh],scene:E.state().scene,uiScreen:E.runUi().screen,comps,subs,overflow:over,compOverlaps:hits,subOverlaps:subHits,banner:E.hud.banner(),hudcombat:E.hud.combat()}`));

const files = {};

// ---------- D3: camp idle baseline (10 s) + version label + layout @1600x900 ----------
files['certD3-camp-idle'] = [
  arm, verProbe, peakArm,
  ev(iife("const s=E.state();return {scene:s.scene,ents:E.entityCount,fps:E.fps,tick:E.tick,vfx:{fireflies:s.vfx.fireflies,embers:s.vfx.embers,gateMotes:s.vfx.gateMotes,grass:s.vfx.grass,emitters:s.vfx.emitters,propShadows:s.vfx.propShadows,propTypes:s.vfx.propTypes},heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null,dom:document.querySelectorAll('*').length}")),
  sampler('D3-camp-idle', 10000),
  peakRead,
  layoutProbe('camp-1600'),
  ev(iife("return {tick:E.tick,heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null,dom:document.querySelectorAll('*').length,fps:E.fps}")),
];

// ---------- D1: worst-case wave ----------
const waveProbe = (room, tag, durMs) => [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',${room});const s=E.state();return {room:r&&r.room,mode:r&&r.mode,roomState:s.room,ents:E.entityCount}`)),
  waitFor("E.state().enemies.length>=2", 45000, ",enemies:E.state().enemies.map(e=>[e.id,e.kind]),roomState:E.state().room"),
  ...rmbOn,
  wait(800),
  ev(iife(`const s=E.state();return {tag:'pre-${tag}',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,room:s.room,party:s.party.map(p=>[p.classId||p.id,p.hp,p.downed])}`)),
  peakArm,
  sampler(tag, durMs),
  peakRead,
  ev(iife(`const s=E.state();return {tag:'post-${tag}',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,room:s.room,party:s.party.map(p=>[p.classId||p.id,p.hp,p.downed]),evs:window.__c.ev.filter(e=>['wave_start','enemy_spawn','death','room_cleared','downed'].includes(e.T)).map(e=>[e.T,e.tick]).slice(-60)}`)),
  ...rmbOff,
];
files['certD3-wave6'] = waveProbe(6, 'D1-room6-defend', 20000);
files['certD3-wave4'] = waveProbe(4, 'D1-room4-defend', 20000);
files['certD3-wave2'] = waveProbe(2, 'D1-room2-killall', 20000);

// ---------- D2: boss room 8, 20 s across quakes ----------
files['certD3-boss'] = [
  arm,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room,mode:r&&r.mode,boss:r&&r.boss}")),
  waitFor("window.__c.ev.some(e=>e.T==='boss_spawn') && window.__c.ev.some(e=>e.T==='boss_adds') && E.state().enemies.length>=3", 60000,
    ",boss:E.cmd('runState').boss,enemies:E.state().enemies.map(e=>[e.id,e.kind,e.hp]),evs:window.__c.ev.map(e=>[e.T,e.tick])"),
  ...rmbOn,
  ev(iife("const s=E.state();return {tag:'pre-boss',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,boss:E.cmd('runState').boss}")),
  peakArm,
  sampler('D2-boss-quakes', 20000),
  peakRead,
  ev(iife("const s=E.state();return {tag:'post-boss',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,boss:E.cmd('runState').boss,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>e.tick),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>[e.tick,e.pct,e.spawned]),deaths:window.__c.ev.filter(e=>e.T==='death').length}")),
  layoutProbe('boss-1600'),
  ...rmbOff,
];

// ---------- D5/D6: layout probes (run at 1024x576 and 2560x1440) ----------
files['certD3-lay-camp'] = [wait(500), verProbe, layoutProbe('camp')];
files['certD3-lay-combat'] = [
  arm,
  ev(iife("E.cmd('startRun');return {room:E.cmd('runState').room}")),
  waitFor("E.state().enemies.length>=2", 45000, ",enemies:E.state().enemies.length"),
  ...rmbOn, wait(1200),
  verProbe, layoutProbe('combat'),
  ev(iife("const s=E.state();return {ents:E.entityCount,enemies:s.enemies.length,fps:E.fps,banner:E.hud.banner(),threat:E.hud.threat()}")),
  ...rmbOff,
];
files['certD3-lay-shop'] = [
  arm,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {room:r&&r.room,mode:r&&r.mode}")),
  wait(2500),
  verProbe, layoutProbe('shop'),
  ev(iife("return JSON.stringify(E.runUi()).slice(0,1600)")),
];

// ---------- D7: leak proxy ----------
const memSnap = (tag) => ev(iife(`const s=E.state();const v=s.vfx||{};
return {tag:${JSON.stringify(tag)},tick:E.tick,scene:s.scene,ents:E.entityCount,enemies:(s.enemies||[]).length,eshots:(s.eshots||[]).length,zones:(s.zones||[]).length,azones:(s.azones||[]).length,bolts:(s.skillBolts||[]).length,
vfx:{numerals:v.numerals,decals:v.decals,particles:v.particles,emitters:v.emitters,propTypes:v.propTypes,propShadows:v.propShadows,grass:v.grass,fireflies:v.fireflies,embers:v.embers,gateMotes:v.gateMotes,lights:v.lights,flowers:v.flowers},
dom:document.querySelectorAll('*').length,numLayer:(document.getElementById('dmg-num-layer')||{children:[]}).children.length,
heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null,
mem:(window.__arenaProbe&&window.__arenaProbe.mem)||(E.stats&&E.stats.memory)||null}`));

const advanceRooms = {
  type: 'loop', label: 'rooms', maxMs: 150000,
  cond: "(()=>{try{const r=__echoes.cmd('runState');return !r||!r.active||r.room>=7;}catch(e){return true}})()",
  body: [
    ev(iife("try{if(E.state().enemies.length)E.cmd('killAllEnemies');}catch(e){}const r=E.cmd('runState');const u=E.runUi();return {room:r&&r.room,phase:r&&r.phase,screen:u.screen,en:E.state().enemies.length}")),
    wait(260), key('Enter', 60), wait(260), key('Enter', 60), wait(200),
  ],
};
const oneRun = (n) => [
  ev(iife(`E.cmd('startRun');return {run:${n},room:E.cmd('runState').room,seed:E.seed}`)),
  wait(600),
  advanceRooms,
  memSnap(`run${n}-atShop`),
  ev(iife("try{E.cmd('shopAdvance');}catch(e){}return {room:E.cmd('runState')&&E.cmd('runState').room}")),
  waitFor("(()=>{const r=E.cmd('runState');return r&&r.room===8&&E.state().enemies.length>=1;})()", 60000, ",room:E.cmd('runState')&&E.cmd('runState').room,en:E.state().enemies.length"),
  wait(1500),
  memSnap(`run${n}-boss`),
  { type: 'loop', label: `killboss${n}`, maxMs: 40000, cond: "(()=>{try{const r=__echoes.cmd('runState');return !r||!r.active||(r.boss&&r.boss.hp<=0)||['victory','summary','defeat','end'].includes(__echoes.runUi().screen);}catch(e){return true}})()",
    body: [ev(iife("try{const k=E.cmd('killBoss');const r=E.cmd('runState');return {kb:k===null?'null':'ok',boss:r&&r.boss,screen:E.runUi().screen};}catch(e){return {err:String(e)}}")), wait(400)] },
  { type: 'loop', label: `clearadds${n}`, maxMs: 40000, cond: "(()=>{try{const r=__echoes.cmd('runState');return !r||!r.active||__echoes.state().scene!=='arena'||['victory','summary','defeat','end'].includes(__echoes.runUi().screen);}catch(e){return true}})()",
    body: [ev(iife("try{if(E.state().enemies.length)E.cmd('killAllEnemies');}catch(e){}return {en:E.state().enemies.length,screen:E.runUi().screen,room:E.cmd('runState')&&E.cmd('runState').room}")), wait(400)] },
  wait(1200),
  ev(iife(`const u=E.runUi();return {tag:'run${n}-endscreen',screen:u.screen,text:u.text,buttons:u.buttons,tick:E.tick}`)),
  key('Enter', 80), wait(800),
  ev(iife("if(E.state().scene!=='camp'){try{E.cmd('returnToCamp');}catch(e){}}return {scene:E.state().scene}")),
  waitFor("E.state().scene==='camp'", 30000, ",scene:E.state().scene"),
  wait(3500),
  memSnap(`run${n}-camp`),
];
files['certD3-leak'] = [
  arm, wait(1500), memSnap('baseline-camp'),
  ...oneRun(1),
  ...oneRun(2),
  wait(3000),
  memSnap('final-camp'),
  ev(iife("return {evCounts:window.__c.ev.reduce((m,e)=>(m[e.T]=(m[e.T]||0)+1,m),{}),tick:E.tick,fps:E.fps}")),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
