// Certification block D round 5 — action generator (critic-owned, prefix certD5-).
// Writes tools/actions/certD5-*.json programmatically (never hand-escaped JSON).
// Every eval is an IIFE / async IIFE that polls window.__echoes and RETURNS the observed
// state so it lands in captures/<name>.console.txt as [EVAL].
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 40000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){try{if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};}catch(e){}await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const EVT = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','spawn_telegraph',
  'telegraph_start','telegraph_resolve','enemy_fire','hit','death','run_end','run_wiped','return_to_camp','downed','revive',
  'boss_spawn','boss_quake_start','boss_quake_resolve','boss_trample','boss_adds','boss_death','enemy_despawn','director_stop',
  'victory','defeat','skill_cast','ally_cast','azone_spawn','zone_spawn','skill_bolt_spawn','projectile_spawn','hitstop','screenshake','draft','draft_taken','path_chosen','shop_buy','reward'];
// event log carries pn = performance.now() at receipt so frame gaps can be matched to sim events
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(EVT)})E.on(t,e=>{if(window.__c.ev.length<20000)window.__c.ev.push(Object.assign({T:t,pn:+performance.now().toFixed(1)},e));});return 'armed '+E.tick`));

const rmbOn = [{ type: 'mousemove', x: 800, y: 380 }, { type: 'mousedown', button: 'right' }];
const rmbOff = [{ type: 'mouseup', button: 'right' }];

// ---- rAF sampler: mean/p50/p95/p99/max, warm(0-3 s) vs steady, every gap>100 ms with timestamp,
// per-second E.fps / E.entityCount / enemy count, 2 s buckets, worst 15 s steady window,
// and a forensic dump of sim events within [-400,+120] ms of every frame > 60 ms.
const sampler = (tag, durMs) => ev(`(async()=>{const E=__echoes;const TAG=${JSON.stringify(tag)};const DUR=${durMs};
const D=[];const S=[];const LT=[];let po=null;
try{po=new PerformanceObserver(l=>{for(const e of l.getEntries())LT.push([+e.startTime.toFixed(0),+e.duration.toFixed(1)]);});po.observe({entryTypes:['longtask']});}catch(e){}
let t0=0,last=0,stop=false;
const step=(now)=>{const d=now-last;last=now;D.push([+(now-t0).toFixed(1),+d.toFixed(2)]);if(now-t0<DUR)requestAnimationFrame(step);else stop=true;};
requestAnimationFrame((n)=>{t0=n;last=n;requestAnimationFrame(step);});
const iv=setInterval(()=>{try{const s=E.state();let b=null;try{const r=E.cmd('runState');b=r&&r.boss&&r.boss.active?+r.boss.pct.toFixed(2):-1;}catch(e){}S.push([+((performance.now()-t0)/1000).toFixed(2),+(E.fps||0).toFixed(1),E.entityCount,s.enemies.length,s.eshots.length,s.zones.length,s.azones.length,s.skillBolts.length,E.tick,b]);}catch(e){}},1000);
const guard=performance.now();
while(!stop&&performance.now()-guard<DUR+15000){await new Promise(r=>setTimeout(r,40));}
clearInterval(iv);if(po)try{po.disconnect();}catch(e){}
const stat=(a)=>{if(!a.length)return null;const v=a.map(x=>x[1]).sort((p,q)=>p-q);const n=v.length;const sum=v.reduce((p,q)=>p+q,0);const Q=(p)=>+v[Math.min(n-1,Math.floor(p*n))].toFixed(2);
return {frames:n,meanMs:+(sum/n).toFixed(2),meanFps:+(1000/(sum/n)).toFixed(1),p50:Q(0.5),p95:Q(0.95),p99:Q(0.99),max:+v[n-1].toFixed(2),g100:a.filter(x=>x[1]>100).length};};
const W=D.filter(x=>x[0]<3000),ST=D.filter(x=>x[0]>=3000);
const buckets=[];for(let s=0;s<DUR;s+=2000){const w=D.filter(x=>x[0]>=s&&x[0]<s+2000);if(w.length)buckets.push([s/1000,stat(w).meanFps,stat(w).max,stat(w).g100]);}
const gS=ST.filter(x=>x[1]>100).map(x=>[x[0],x[1]]);const gA=D.filter(x=>x[1]>100).map(x=>[x[0],x[1]]);
let worst=null;
if(ST.length>2){const te=ST[ST.length-1][0];for(let s=ST[0][0];s+15000<=te+500;s+=1000){const w=ST.filter(x=>x[0]>=s&&x[0]<s+15000);if(w.length<10)continue;const g=w.filter(x=>x[1]>100).length;const st=stat(w);if(!worst||g>worst.gaps||(g===worst.gaps&&st.meanFps<worst.meanFps))worst={start:Math.round(s),gaps:g,meanFps:st.meanFps,max:st.max};}}
const evl=(window.__c?window.__c.ev:[]);
const forensic=D.filter(x=>x[1]>60).slice(0,12).map(x=>{const end=t0+x[0];const start=end-x[1];const near=evl.filter(e=>e.pn>=start-400&&e.pn<=end+120).map(e=>[+(e.pn-start).toFixed(0),e.T,e.tick,e.skill||e.kind||e.id||'']).slice(0,40);return {rel:x[0],ms:x[1],events:near};});
const evs=evl.filter(e=>/quake|adds|downed|room_cleared|boss_death|wave_start|run_end/.test(e.T)).map(e=>[e.T,e.tick]);
const deaths=evl.filter(e=>e.T==='death').length;
return {tag:TAG,durMs:Math.round(performance.now()-guard),all:stat(D),warm:stat(W),steady:stat(ST),buckets,steadyGaps100:gS,allGaps100:gA,longTasks:LT.length,longTasksTop:LT.sort((a,b)=>b[1]-a[1]).slice(0,5),worst15s:worst,perSec:S,forensic,evs,deaths};})()`);

const peakArm = ev(iife("window.__pk={max:0,at:0,maxEnts:0,n:0};window.__pkiv=setInterval(()=>{try{const s=E.state();window.__pk.n++;if(s.enemies.length>window.__pk.max){window.__pk.max=s.enemies.length;window.__pk.at=E.tick;}if(E.entityCount>window.__pk.maxEnts)window.__pk.maxEnts=E.entityCount;}catch(e){}},100);return 'peak armed t'+E.tick"));
const peakRead = ev(iife("clearInterval(window.__pkiv);const s=E.state();return {peak:window.__pk,now:{enemies:s.enemies.length,ents:E.entityCount,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length}}"));

const verProbe = ev(iife("const out=[...document.querySelectorAll('body *')].filter(el=>!el.children.length&&/^v?\\s*\\d+\\.\\d+\\.\\d+$/.test((el.textContent||'').trim())).map(el=>{const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return {tag:el.tagName,id:el.id,cls:String(el.className),text:(el.textContent||'').trim(),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],color:cs.color,font:cs.fontSize+' '+cs.fontFamily.slice(0,24),op:cs.opacity,z:cs.zIndex};});return {vp:[innerWidth,innerHeight],version:E.version,found:out}"));

// party-only keep-alive: never touches boss HP, so add phases are NOT suppressed
const partyAlive = ev(iife("window.__ka=setInterval(()=>{try{const s=E.state();for(const p of s.party){if(p.downed){try{E.cmd('rally');}catch(e){}}if(p.downed||p.hp<p.maxHp*0.6){try{E.cmd('setHp',p.id,1);}catch(e){}}}}catch(e){}},400);return 'partyAlive armed t'+E.tick"));
const stopKa = ev(iife("clearInterval(window.__ka);return {stopped:true,tick:E.tick}"));

// ---- layout probe (single snapshot): component rects, viewport overflow, pairwise intersections
// classified as contains vs CROSS ----
const layoutProbe = (tag) => ev(iife(`const vw=innerWidth,vh=innerHeight;const T=${JSON.stringify(tag)};
const vis=(el)=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.02)return false;const r=el.getBoundingClientRect();return r.width>0.5&&r.height>0.5;};
const R=(el)=>{const r=el.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];};
const nm=(el)=>((el.id?'#'+el.id:'')+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\\s+/).join('.'):''))||el.tagName;
const comps=[];
const push=(el,extra)=>{if(!vis(el))return;const r=R(el);if(r[2]>=vw-1&&r[3]>=vh-1)return;comps.push([nm(el)+(extra||''),r,(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,34)]);};
const hud=document.getElementById('hud');
if(hud)for(const el of hud.children)push(el);
const rs=document.getElementById('run-screen');
if(rs&&vis(rs)){for(const el of rs.querySelectorAll('.rn-page,.rn-card,.rn-door,button'))push(el);}
for(const el of document.querySelectorAll('body > *'))if(el.tagName!=='CANVAS'&&el.id!=='hud'&&el.id!=='run-screen')push(el);
const vers=[...document.querySelectorAll('body *')].filter(el=>!el.children.length&&/^v?\\s*\\d+\\.\\d+\\.\\d+$/.test((el.textContent||'').trim()));
for(const el of vers)if(vis(el)&&!comps.some(c=>c[0]===nm(el)))push(el,'|VERSION');
const subs=[];
for(const sel of ['.hud-port','.hud-slot','.hud-port-hp','.hud-bn-label','.hud-bn-num','.hud-loc-name','.hud-glint-num','.rn-card','.rn-door'])
  for(const el of document.querySelectorAll(sel))if(vis(el))subs.push([sel,R(el),(el.textContent||'').trim().slice(0,16)]);
const over=[];
for(const el of document.querySelectorAll('body *')){if(el.tagName==='CANVAS'||el.ownerSVGElement)continue;if(!vis(el))continue;const r=el.getBoundingClientRect();
  if(r.left<-0.5||r.top<-0.5||r.right>vw+0.5||r.bottom>vh+0.5){if(Math.round(r.width)>=vw&&Math.round(r.height)>=vh)continue;over.push([nm(el),R(el)]);}}
const outv=comps.filter(c=>c[1][0]<-0.5||c[1][1]<-0.5||c[1][0]+c[1][2]>vw+0.5||c[1][1]+c[1][3]>vh+0.5).map(c=>[c[0],c[1]]);
const ix=(a,b)=>{const x=Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]);const y=Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]);return x>0.5&&y>0.5?[Math.round(x),Math.round(y)]:null;};
const contains=(a,b)=>a[0]<=b[0]+0.5&&a[1]<=b[1]+0.5&&a[0]+a[2]>=b[0]+b[2]-0.5&&a[1]+a[3]>=b[1]+b[3]-0.5;
const hits=[];
for(let i=0;i<comps.length;i++)for(let j=i+1;j<comps.length;j++){const A=comps[i],B=comps[j];if(A[0].split('|')[0]===B[0].split('|')[0])continue;const o=ix(A[1],B[1]);if(!o)continue;const rel=contains(A[1],B[1])?'A_contains_B':(contains(B[1],A[1])?'B_contains_A':'CROSS');hits.push([A[0],A[1],B[0],B[1],o,rel]);}
const subHits=[];
for(let i=0;i<subs.length;i++)for(let j=i+1;j<subs.length;j++){if(subs[i][0]!==subs[j][0])continue;const o=ix(subs[i][1],subs[j][1]);if(o)subHits.push([subs[i][0],subs[i][1],subs[j][1],o]);}
let bn=null,hc=null,us='?',sc='?';try{bn=E.hud.banner();}catch(e){}try{hc=E.hud.combat();}catch(e){}try{us=E.runUi().screen;}catch(e){}try{sc=E.state().scene;}catch(e){}
return {tag:T,vp:[vw,vh],scene:sc,uiScreen:us,version:E.version,comps,subs,overflow:over,outOfViewport:outv,overlaps:hits,cross:hits.filter(h=>h[5]==='CROSS'),subOverlaps:subHits,banner:bn,hudcombat:hc,enemies:(()=>{try{return E.state().enemies.length}catch(e){return -1}})()}`));

// ---- layout monitor: repeated layout snapshots over durMs (for the boss room, where the plate moves) ----
const layoutMon = (tag, durMs, stepMs) => ev(`(async()=>{const E=__echoes;const TAG=${JSON.stringify(tag)};
const vis=(el)=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.02)return false;const r=el.getBoundingClientRect();return r.width>0.5&&r.height>0.5;};
const R=(el)=>{const r=el.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];};
const nm=(el)=>((el.id?'#'+el.id:'')+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\\s+/).join('.'):''))||el.tagName;
const grab=()=>{const vw=innerWidth,vh=innerHeight;const comps=[];
 const push=(el,extra)=>{if(!vis(el))return;const r=R(el);if(r[2]>=vw-1&&r[3]>=vh-1)return;comps.push([nm(el)+(extra||''),r,(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,34)]);};
 const hud=document.getElementById('hud');if(hud){for(const el of hud.children)push(el);}
 const rs=document.getElementById('run-screen');if(rs&&vis(rs)){for(const el of rs.querySelectorAll('.rn-page,.rn-card,.rn-door,button'))push(el);}
 for(const el of document.querySelectorAll('body > *'))if(el.tagName!=='CANVAS'&&el.id!=='hud'&&el.id!=='run-screen')push(el);
 const over=[];
 for(const el of document.querySelectorAll('body *')){if(el.tagName==='CANVAS'||el.ownerSVGElement)continue;if(!vis(el))continue;const r=el.getBoundingClientRect();
  if(r.left<-0.5||r.top<-0.5||r.right>vw+0.5||r.bottom>vh+0.5){if(Math.round(r.width)>=vw&&Math.round(r.height)>=vh)continue;over.push([nm(el),R(el)]);}}
 const outv=comps.filter(c=>c[1][0]<-0.5||c[1][1]<-0.5||c[1][0]+c[1][2]>vw+0.5||c[1][1]+c[1][3]>vh+0.5).map(c=>[c[0],c[1]]);
 const ix=(a,b)=>{const x=Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]);const y=Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]);return x>0.5&&y>0.5?[Math.round(x),Math.round(y)]:null;};
 const contains=(a,b)=>a[0]<=b[0]+0.5&&a[1]<=b[1]+0.5&&a[0]+a[2]>=b[0]+b[2]-0.5&&a[1]+a[3]>=b[1]+b[3]-0.5;
 const hits=[];
 for(let i=0;i<comps.length;i++)for(let j=i+1;j<comps.length;j++){const A=comps[i],B=comps[j];if(A[0].split('|')[0]===B[0].split('|')[0])continue;const o=ix(A[1],B[1]);if(!o)continue;const rel=contains(A[1],B[1])?'A_contains_B':(contains(B[1],A[1])?'B_contains_A':'CROSS');hits.push([A[0],A[1],B[0],B[1],o,rel]);}
 let bn=null;try{bn=E.hud.banner();}catch(e){}
 let bp=null;try{const r=E.cmd('runState');bp=r&&r.boss?{pct:+r.boss.pct.toFixed(2),hp:r.boss.hp,adds:r.boss.adds,phases:r.boss.phasesFired}:null;}catch(e){}
 let us='?';try{us=E.runUi().screen;}catch(e){}
 return {t:+performance.now().toFixed(0),tick:E.tick,vp:[vw,vh],uiScreen:us,banner:bn&&bn.text,boss:bp,enemies:(()=>{try{return E.state().enemies.length}catch(e){return -1}})(),comps,overflow:over,outOfViewport:outv,overlaps:hits};};
const t0=performance.now();const seen=new Map();const incidents=[];const all=[];
while(performance.now()-t0<${durMs}){const g=grab();all.push(g);const sig=JSON.stringify(g.comps.map(c=>[c[0],c[1]]));if(!seen.has(sig))seen.set(sig,g);
 if(g.overlaps.some(h=>h[5]==='CROSS')||g.outOfViewport.length||g.overflow.length)incidents.push(g);
 await new Promise(r=>setTimeout(r,${stepMs}));}
const isBanner=(c)=>/hud-banner/.test(c[0])&&/show/.test(c[0]);
const bannerFrames=all.filter(g=>g.comps.some(isBanner));
return {tag:TAG,samples:all.length,distinctLayouts:seen.size,bannerFrames:bannerFrames.length,bossFrames:all.filter(g=>g.comps.some(c=>/boss/.test(c[0]))).length,
 crossIncidents:incidents.filter(g=>g.overlaps.some(h=>h[5]==='CROSS')).length,outOfViewportIncidents:incidents.filter(g=>g.outOfViewport.length).length,overflowIncidents:incidents.filter(g=>g.overflow.length).length,
 crossSample:incidents.filter(g=>g.overlaps.some(h=>h[5]==='CROSS')).slice(0,3).map(g=>({t:g.t,tick:g.tick,cross:g.overlaps.filter(h=>h[5]==='CROSS')})),
 overflowSample:incidents.filter(g=>g.overflow.length||g.outOfViewport.length).slice(0,4).map(g=>({t:g.t,tick:g.tick,overflow:g.overflow,outv:g.outOfViewport})),
 first:all[0],last:all[all.length-1],bannerFirst:bannerFrames[0]||null,bannerLast:bannerFrames[bannerFrames.length-1]||null,layouts:[...seen.values()].slice(0,6).map(g=>({tick:g.tick,banner:g.banner,boss:g.boss,comps:g.comps}))};})()`);

const memSnap = (tag) => ev(iife(`const s=E.state();const v=s.vfx||{};let r=null;try{r=E.cmd('runState');}catch(e){}
let ri=null;try{const R=window.__renderer||(window.__arenaProbe&&window.__arenaProbe.renderer);ri=R&&R.info?{geo:R.info.memory.geometries,tex:R.info.memory.textures,programs:R.info.programs&&R.info.programs.length,calls:R.info.render.calls,tris:R.info.render.triangles}:null;}catch(e){}
return {tag:${JSON.stringify(tag)},tick:E.tick,scene:s.scene,vfxMode:v.mode,runActive:!!(r&&r.active),room:r&&r.room,
ents:E.entityCount,enemies:(s.enemies||[]).length,eshots:(s.eshots||[]).length,zones:(s.zones||[]).length,azones:(s.azones||[]).length,bolts:(s.skillBolts||[]).length,
vfx:{numerals:v.numerals,decals:v.decals,particles:v.particles,emitters:v.emitters,propTypes:v.propTypes,propShadows:v.propShadows,grass:v.grass,fireflies:v.fireflies,embers:v.embers,gateMotes:v.gateMotes,lights:v.lights,flowers:v.flowers,runs:v.runs,variantName:v.variantName},
vfxKeys:Object.keys(v),
dom:document.querySelectorAll('*').length,numLayer:(document.getElementById('dmg-num-layer')||{children:[]}).children.length,threatLayer:(document.getElementById('hud-threat')||{children:[]}).children.length,
heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null,renderer:ri,stats:E.stats||null}`));

const files = {};

// ================= RECON =================
files['certD5-recon'] = [
  ev(iife(`const c=document.querySelector('canvas');let info=null;try{const gl=c.getContext('webgl2')||c.getContext('webgl');const d=gl.getExtension('WEBGL_debug_renderer_info');info={renderer:gl.getParameter(d.UNMASKED_RENDERER_WEBGL),vendor:gl.getParameter(d.UNMASKED_VENDOR_WEBGL),ver:gl.getParameter(gl.VERSION)};}catch(e){info={err:String(e)}}
  return {version:E.version,seed:E.seed,bootSeed:E.bootSeed,tick:E.tick,fps:E.fps,ents:E.entityCount,canvas:[c.width,c.height],css:[c.clientWidth,c.clientHeight],dpr:devicePixelRatio,vp:[innerWidth,innerHeight],cores:navigator.hardwareConcurrency,ua:navigator.userAgent.slice(0,80),info}`)),
  ev(iife(`const s=E.state();return {scene:s.scene,vfx:s.vfx,ents:E.entityCount,toggles:s.toggles,stateKeys:Object.keys(s)}`)),
  verProbe,
  ev(iife(`const r=E.cmd('startRun');const rs=E.cmd('runState');return {seed:E.seed,frame:r&&r.frame,room:rs&&rs.room,mode:rs&&rs.mode,rsKeys:rs&&Object.keys(rs),rs:JSON.stringify(rs).slice(0,1500)}`)),
  wait(600),
  ev(iife(`const s=E.state();return {roomState:s.room,scene:s.scene,vfxKeys:s.vfx&&Object.keys(s.vfx)}`)),
  // walk rooms 2..8 and read each wave schedule
  ...[2,3,4,5,6,7,8].map(n => ev(iife(`const r=E.cmd('skipToRoom',${n});const s=E.state();const rs=E.cmd('runState');return {room:${n},mode:r&&r.mode,roomState:s.room,boss:rs&&rs.boss}`))),
];

// ================= D3: camp idle baseline (10 s) + version + layout @1600 =================
files['certD5-camp-idle'] = [
  arm, verProbe, peakArm,
  ev(iife("const s=E.state();const v=s.vfx||{};return {scene:s.scene,ents:E.entityCount,fps:E.fps,tick:E.tick,vfx:{fireflies:v.fireflies,embers:v.embers,gateMotes:v.gateMotes,grass:v.grass,emitters:v.emitters,propShadows:v.propShadows,propTypes:v.propTypes},heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null,dom:document.querySelectorAll('*').length}")),
  sampler('D3-camp-idle', 10000),
  peakRead,
  layoutProbe('camp-1600'),
  ev(iife("return {tick:E.tick,heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null,dom:document.querySelectorAll('*').length,fps:E.fps}")),
];

// ================= D1: worst-case wave =================
const waveProbe = (room, tag, durMs) => [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',${room});const s=E.state();return {room:r&&r.room,mode:r&&r.mode,roomState:s.room,ents:E.entityCount}`)),
  waitFor("E.state().enemies.length>=2", 45000, ",enemies:E.state().enemies.map(e=>[e.id,e.kind]),roomState:E.state().room"),
  ...rmbOn,
  wait(800),
  ev(iife(`const s=E.state();return {tag:'pre-${tag}',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,room:s.room,party:s.party.map(p=>[p.classId||p.id,Math.round(p.hp),p.downed])}`)),
  peakArm,
  sampler(tag, durMs),
  peakRead,
  ev(iife(`const s=E.state();return {tag:'post-${tag}',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,room:s.room,party:s.party.map(p=>[p.classId||p.id,Math.round(p.hp),p.downed]),evs:window.__c.ev.filter(e=>['wave_start','enemy_spawn','death','room_cleared','downed'].includes(e.T)).map(e=>[e.T,e.tick]).slice(-60)}`)),
  ...rmbOff,
];
files['certD5-wave2'] = waveProbe(2, 'D1-room2-killall', 20000);
files['certD5-wave3'] = waveProbe(3, 'D1-room3-killall', 24000);
files['certD5-wave6'] = waveProbe(6, 'D1-room6-defend', 20000);

// synthetic worst case: room 6 defend topped up to 16 simultaneous enemies for the whole window
const stress = (target) => [
  arm,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',6);return {room:r&&r.room,mode:r&&r.mode,roomState:E.state().room}")),
  waitFor("E.state().enemies.length>=2", 45000, ",enemies:E.state().enemies.length"),
  ...rmbOn,
  ev(iife(`window.__su=setInterval(()=>{try{const s=E.state();let n=s.enemies.length,i=0;while(n<${target}&&i<8){const a=(n*1.7+i*0.9);const r=3.5+((n+i)%4)*0.9;E.cmd('spawn',(i%2?'boar':'mantis'),+(Math.cos(a)*r).toFixed(2),+(Math.sin(a)*r).toFixed(2));n++;i++;}}catch(e){}},350);return 'topup armed t'+E.tick`)),
  wait(3500),
  ev(iife("const s=E.state();return {tag:'pre-stress',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,eshots:s.eshots.length}")),
  peakArm,
  sampler(`D1-stress${target}`, 20000),
  peakRead,
  ev(iife("clearInterval(window.__su);const s=E.state();return {tag:'post-stress',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,room:s.room,party:s.party.map(p=>[p.classId||p.id,Math.round(p.hp),p.downed])}")),
  ...rmbOff,
];
files['certD5-stress16'] = stress(16);

// ================= D2: boss room 8, 20 s across quakes =================
const bossPerf = (tag, driver, durMs) => [
  arm,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room,mode:r&&r.mode,boss:r&&r.boss}")),
  waitFor("window.__c.ev.some(e=>e.T==='boss_spawn') && window.__c.ev.some(e=>e.T==='boss_adds') && E.state().enemies.length>=3", 60000,
    ",boss:E.cmd('runState').boss,enemies:E.state().enemies.map(e=>[e.id,e.kind]),evs:window.__c.ev.filter(e=>/boss|wave|downed/.test(e.T)).map(e=>[e.T,e.tick])"),
  ...rmbOn,
  ...(driver ? [driver] : []),
  wait(600),
  ev(iife(`const s=E.state();const r=E.cmd('runState');return {tag:'pre-${tag}',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,kinds:s.enemies.map(e=>e.kind),boss:r&&r.boss,party:s.party.map(p=>[p.classId||p.id,Math.round(p.hp),p.downed])}`)),
  peakArm,
  sampler(tag, durMs),
  peakRead,
  ev(iife(`const s=E.state();const r=E.cmd('runState');return {tag:'post-${tag}',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,boss:r&&r.boss,party:s.party.map(p=>[p.classId||p.id,Math.round(p.hp),p.downed]),quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>e.tick),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>[e.tick,e.pct,e.spawned]),downed:window.__c.ev.filter(e=>e.T==='downed').length,deaths:window.__c.ev.filter(e=>e.T==='death').length,screen:E.runUi().screen}`)),
  layoutProbe('boss-1600'),
  ...(driver ? [stopKa] : []),
  ...rmbOff,
];
files['certD5-boss'] = bossPerf('D2-boss-natural', null, 20000);
files['certD5-boss-ka'] = bossPerf('D2-boss-partyalive', partyAlive, 20000);

// ================= D5/D6: layout probes (run at 1024x576 and 2560x1440) =================
files['certD5-lay-camp'] = [wait(500), verProbe, layoutProbe('camp')];
files['certD5-lay-combat'] = [
  arm,
  ev(iife("E.cmd('startRun');return {room:E.cmd('runState').room}")),
  waitFor("E.state().enemies.length>=3", 45000, ",enemies:E.state().enemies.length"),
  ...rmbOn, wait(1200),
  verProbe, layoutProbe('combat'),
  ev(iife("const s=E.state();return {ents:E.entityCount,enemies:s.enemies.length,fps:E.fps,banner:E.hud.banner(),threat:(({gated,offFrame,markersDrawn,domMarkers,uncued})=>({gated,offFrame,markersDrawn,domMarkers,uncued}))(E.hud.threat())}")),
  ...rmbOff,
];
files['certD5-lay-shop'] = [
  arm,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {room:r&&r.room,mode:r&&r.mode}")),
  wait(2500),
  verProbe, layoutProbe('shop'),
  ev(iife("const u=E.runUi();return JSON.stringify({screen:u.screen,text:u.text,wallet:u.wallet,buttons:u.buttons,cards:u.cards,fit:u.fit}).slice(0,1600)")),
];
files['certD5-lay-boss'] = [
  arm,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {vp:[innerWidth,innerHeight],room:r&&r.room,mode:r&&r.mode,boss:r&&r.boss}")),
  waitFor("(()=>{const r=E.cmd('runState');return r&&r.boss&&r.boss.active;})()", 60000, ",boss:E.cmd('runState').boss"),
  partyAlive,
  ...rmbOn,
  layoutMon('boss-layout', 12000, 250),
  verProbe,
  ev(iife("const r=E.cmd('runState');const s=E.state();return {tag:'layboss-post',vp:[innerWidth,innerHeight],tick:E.tick,boss:r&&r.boss,enemies:s.enemies.length,ents:E.entityCount,banner:E.hud.banner(),screen:E.runUi().screen}")),
  stopKa,
  ...rmbOff,
];
// end screens (victory / defeat) layout
files['certD5-lay-end'] = [
  arm,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room}")),
  waitFor("(()=>{const r=E.cmd('runState');return r&&r.boss&&r.boss.active&&E.state().enemies.length>=1;})()", 60000, ",boss:E.cmd('runState').boss"),
  wait(1500),
  { type: 'loop', label: 'killboss', maxMs: 40000,
    cond: "(()=>{try{const r=__echoes.cmd('runState');if(!r||!r.active)return true;const u=__echoes.runUi().screen;return u==='victory'||u==='end'||u==='summary'||u==='defeat';}catch(e){return true}})()",
    body: [ev(iife("try{const k=E.cmd('killBoss');if(E.state().enemies.length)E.cmd('killAllEnemies');const r=E.cmd('runState');return {kb:k===null?'null':'ok',bossHp:r&&r.boss&&r.boss.hp,en:E.state().enemies.length,screen:E.runUi().screen};}catch(e){return {err:String(e)}}")), wait(500)] },
  wait(1500),
  verProbe, layoutProbe('victory'),
  ev(iife("const u=E.runUi();return {screen:u.screen,text:u.text,buttons:u.buttons}")),
];

// ================= D7: leak proxy — two full cmd-driven runs in ONE page session =================
const inCamp = "(()=>{try{const r=E.cmd('runState');return (!r||!r.active)&&!!E.cmd('campState');}catch(e){return false}})()";
const room = (n) => [
  ev(iife(`const r=E.cmd('skipToRoom',${n});return {jumpTo:${n},room:r&&r.room,mode:r&&r.mode}`)),
  waitFor("E.state().enemies.length>=2", 30000, ",en:E.state().enemies.length,room:(E.cmd('runState')||{}).room"),
  wait(2200),
  ev(iife(`const s=E.state();return {tag:'room${n}-live',room:(E.cmd('runState')||{}).room,ents:E.entityCount,enemies:s.enemies.length,azones:s.azones.length,bolts:s.skillBolts.length,dom:document.querySelectorAll('*').length}`)),
  ev(iife("try{E.cmd('killAllEnemies');}catch(e){}return 'killed'")),
  wait(700),
];
const oneRun = (n) => [
  ev(iife(`E.cmd('startRun');const r=E.cmd('runState');return {run:${n},room:r&&r.room,seed:E.seed,active:!!(r&&r.active)}`)),
  wait(800),
  ...room(2), ...room(3), ...room(4), ...room(5), ...room(6),
  ev(iife("const r=E.cmd('skipToRoom',7);return {shopRoom:r&&r.room,mode:r&&r.mode,ui:E.runUi().screen}")),
  wait(1800),
  memSnap(`run${n}-shop`),
  ev(iife("const r=E.cmd('skipToRoom',8);return {bossRoom:r&&r.room,mode:r&&r.mode,boss:r&&r.boss}")),
  waitFor("(()=>{const r=E.cmd('runState');return r&&r.room===8&&r.boss&&r.boss.active&&E.state().enemies.length>=1;})()", 60000, ",room:(E.cmd('runState')||{}).room,en:E.state().enemies.length"),
  wait(2500),
  memSnap(`run${n}-bossLive`),
  { type: 'loop', label: `boss${n}`, maxMs: 60000,
    cond: "(()=>{try{const r=__echoes.cmd('runState');if(!r||!r.active)return true;const u=__echoes.runUi().screen;return u==='victory'||u==='end'||u==='summary'||u==='defeat';}catch(e){return true}})()",
    body: [ev(iife("try{const k=E.cmd('killBoss');if(E.state().enemies.length)E.cmd('killAllEnemies');const r=E.cmd('runState');return {kb:k===null?'null':'ok',bossHp:r&&r.boss&&r.boss.hp,adds:r&&r.boss&&r.boss.adds,en:E.state().enemies.length,screen:E.runUi().screen};}catch(e){return {err:String(e)}}")), wait(500)] },
  wait(1200),
  ev(iife(`const u=E.runUi();const r=E.cmd('runState');return {tag:'run${n}-endscreen',screen:u.screen,text:(u.text||'').slice(0,90),active:!!(r&&r.active),tick:E.tick}`)),
  key('Enter', 90), wait(1200),
  ev(iife(`return {tag:'run${n}-afterEnter',screen:E.runUi().screen,active:!!(E.cmd('runState')||{}).active}`)),
  { type: 'if', cond: `!(${inCamp.replace(/\bE\./g, '__echoes.')})`, then: [ev(iife("try{E.cmd('returnToCamp');}catch(e){}return 'forced returnToCamp'")), wait(1200)] },
  waitFor(inCamp, 30000, ",active:!!(E.cmd('runState')||{}).active,ui:E.runUi().screen"),
  wait(4500),
  memSnap(`run${n}-camp`),
];
files['certD5-leak'] = [
  arm, wait(1500), memSnap('baseline-camp'),
  ...oneRun(1),
  ...oneRun(2),
  wait(4000),
  memSnap('final-camp'),
  ev(iife("return {evCounts:window.__c.ev.reduce((m,e)=>(m[e.T]=(m[e.T]||0)+1,m),{}),tick:E.tick,fps:E.fps,dom:document.querySelectorAll('*').length}")),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
