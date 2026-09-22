// Certification block D round 5 — AUDIT-GAP generator (critic-owned, prefix certD5-b-).
// Re-runs the camp-idle / wave2 / boss probes per resolution with the same rAF sampler as
// tools/certD5-gen.mjs, plus: (a) per-frame CPU share = performance.now() - rAF timestamp inside
// a rAF callback registered AFTER the game's loop (the game's update+render JS for that frame),
// (b) a 1 s trace of the on-screen #fps-meter text next to E.fps, (c) render-surface info
// (canvas backing size, drawingBuffer, dpr, GPU string). Writes tools/actions/certD5-b-*.json.
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 40000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){try{if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};}catch(e){}await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const EVT = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','hit','death','run_end','run_wiped',
  'downed','revive','boss_spawn','boss_quake_start','boss_quake_resolve','boss_adds','boss_death','ally_cast','azone_spawn','zone_spawn',
  'skill_bolt_spawn','projectile_spawn'];
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(EVT)})E.on(t,e=>{if(window.__c.ev.length<20000)window.__c.ev.push(Object.assign({T:t,pn:+performance.now().toFixed(1)},e));});return 'armed '+E.tick`));

const surf = (tag) => ev(iife(`const c=document.querySelector('canvas');let info=null,db=null,ext=null;try{const gl=c.getContext('webgl2')||c.getContext('webgl');const d=gl.getExtension('WEBGL_debug_renderer_info');info=gl.getParameter(d.UNMASKED_RENDERER_WEBGL);db=[gl.drawingBufferWidth,gl.drawingBufferHeight];const a=gl.getContextAttributes();ext={antialias:a.antialias,alpha:a.alpha,depth:a.depth,powerPreference:a.powerPreference,maxSamples:gl.getParameter(gl.MAX_SAMPLES)};}catch(e){info=String(e)}
const cs=[...document.querySelectorAll('canvas')].map(k=>[k.width,k.height,k.clientWidth,k.clientHeight]);
const m=document.getElementById('fps-meter');
return {tag:${JSON.stringify(tag)},vp:[innerWidth,innerHeight],dpr:devicePixelRatio,canvases:cs,drawingBuffer:db,ctx:ext,gpu:info,version:E.version,tick:E.tick,Efps:E.fps,meter:m?m.textContent:null,ents:E.entityCount,heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null}`));

const meterArm = ev(iife("window.__mt=[];const t0=performance.now();window.__mtiv=setInterval(()=>{try{const m=document.getElementById('fps-meter');window.__mt.push([+((performance.now()-t0)/1000).toFixed(1),m?m.textContent:null,+(E.fps||0).toFixed(1),E.tick,E.entityCount]);}catch(e){}},1000);return 'meter armed t'+E.tick"));
const meterRead = ev(iife("clearInterval(window.__mtiv);return {meterTrace:window.__mt}"));

const rmbOn = (w, h) => [{ type: 'mousemove', x: Math.round(w * 0.5), y: Math.round(h * 0.4222) }, { type: 'mousedown', button: 'right' }];
const rmbOff = [{ type: 'mouseup', button: 'right' }];

// Same sampler as certD5-gen.mjs plus per-frame cpu = now_at_callback - rAF timestamp.
const sampler = (tag, durMs) => ev(`(async()=>{const E=__echoes;const TAG=${JSON.stringify(tag)};const DUR=${durMs};
const D=[];const C=[];const S=[];const LT=[];let po=null;
try{po=new PerformanceObserver(l=>{for(const e of l.getEntries())LT.push([+e.startTime.toFixed(0),+e.duration.toFixed(1)]);});po.observe({entryTypes:['longtask']});}catch(e){}
let t0=0,last=0,stop=false;
const step=(now)=>{const cpu=performance.now()-now;const d=now-last;last=now;D.push([+(now-t0).toFixed(1),+d.toFixed(2)]);C.push([+(now-t0).toFixed(1),+cpu.toFixed(2)]);if(now-t0<DUR)requestAnimationFrame(step);else stop=true;};
requestAnimationFrame((n)=>{t0=n;last=n;requestAnimationFrame(step);});
const iv=setInterval(()=>{try{const s=E.state();let b=null;try{const r=E.cmd('runState');b=r&&r.boss&&r.boss.active?+r.boss.pct.toFixed(2):-1;}catch(e){}const m=document.getElementById('fps-meter');S.push([+((performance.now()-t0)/1000).toFixed(2),+(E.fps||0).toFixed(1),E.entityCount,s.enemies.length,s.eshots.length,s.zones.length,s.azones.length,s.skillBolts.length,E.tick,b,m?m.textContent:null]);}catch(e){}},1000);
const guard=performance.now();
while(!stop&&performance.now()-guard<DUR+15000){await new Promise(r=>setTimeout(r,40));}
clearInterval(iv);if(po)try{po.disconnect();}catch(e){}
const stat=(a)=>{if(!a.length)return null;const v=a.map(x=>x[1]).sort((p,q)=>p-q);const n=v.length;const sum=v.reduce((p,q)=>p+q,0);const Q=(p)=>+v[Math.min(n-1,Math.floor(p*n))].toFixed(2);
return {frames:n,meanMs:+(sum/n).toFixed(2),meanFps:+(1000/(sum/n)).toFixed(1),p50:Q(0.5),p95:Q(0.95),p99:Q(0.99),max:+v[n-1].toFixed(2),g100:a.filter(x=>x[1]>100).length};};
const W=D.filter(x=>x[0]<3000),ST=D.filter(x=>x[0]>=3000);
const CW=C.filter(x=>x[0]>=3000);
const buckets=[];for(let s=0;s<DUR;s+=2000){const w=D.filter(x=>x[0]>=s&&x[0]<s+2000);const cw=C.filter(x=>x[0]>=s&&x[0]<s+2000);if(w.length)buckets.push([s/1000,stat(w).meanFps,stat(w).max,stat(w).g100,cw.length?stat(cw).meanMs:null]);}
const gS=ST.filter(x=>x[1]>100).map(x=>[x[0],x[1]]);const gA=D.filter(x=>x[1]>100).map(x=>[x[0],x[1]]);
let worst=null;
if(ST.length>2){const te=ST[ST.length-1][0];for(let s=ST[0][0];s+15000<=te+500;s+=1000){const w=ST.filter(x=>x[0]>=s&&x[0]<s+15000);if(w.length<10)continue;const g=w.filter(x=>x[1]>100).length;const st=stat(w);if(!worst||g>worst.gaps||(g===worst.gaps&&st.meanFps<worst.meanFps))worst={start:Math.round(s),gaps:g,meanFps:st.meanFps,max:st.max};}}
const evl=(window.__c?window.__c.ev:[]);
const forensic=D.filter(x=>x[1]>60).slice(0,12).map(x=>{const end=t0+x[0];const start=end-x[1];const near=evl.filter(e=>e.pn>=start-400&&e.pn<=end+120).map(e=>[+(e.pn-start).toFixed(0),e.T,e.tick,e.skill||e.kind||e.id||'']).slice(0,30);return {rel:x[0],ms:x[1],events:near};});
const evs=evl.filter(e=>/quake|adds|downed|room_cleared|boss_death|wave_start|run_end/.test(e.T)).map(e=>[e.T,e.tick]);
const deaths=evl.filter(e=>e.T==='death').length;
const sS=stat(ST);const cS=stat(CW);
return {tag:TAG,vp:[innerWidth,innerHeight],durMs:Math.round(performance.now()-guard),all:stat(D),warm:stat(W),steady:sS,cpuSteady:cS,cpuShare:sS&&cS?+(cS.meanMs/sS.meanMs).toFixed(3):null,buckets,steadyGaps100:gS,allGaps100:gA,longTasks:LT.length,longTasksTop:LT.sort((a,b)=>b[1]-a[1]).slice(0,5),worst15s:worst,perSec:S,forensic,evs,deaths};})()`);

const peakArm = ev(iife("window.__pk={max:0,at:0,maxEnts:0,n:0};window.__pkiv=setInterval(()=>{try{const s=E.state();window.__pk.n++;if(s.enemies.length>window.__pk.max){window.__pk.max=s.enemies.length;window.__pk.at=E.tick;}if(E.entityCount>window.__pk.maxEnts)window.__pk.maxEnts=E.entityCount;}catch(e){}},100);return 'peak armed t'+E.tick"));
const peakRead = ev(iife("clearInterval(window.__pkiv);const s=E.state();return {peak:window.__pk,now:{enemies:s.enemies.length,ents:E.entityCount,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length}}"));

const RES = { 2560: [2560, 1440], 1920: [1920, 1080], 1600: [1600, 900] };
const files = {};
for (const [k, [w, h]] of Object.entries(RES)) {
  // D3 camp idle, 10 s (same as certD5-camp-idle, minus the layout probe)
  files[`certD5-b-camp-${k}`] = [
    arm, surf(`camp-${k}-pre`), meterArm,
    sampler(`B-camp-idle-${k}`, 10000),
    meterRead, surf(`camp-${k}-post`),
  ];
  // D1 room 2 kill_all, 20 s (same steps as certD5-wave2)
  files[`certD5-b-wave2-${k}`] = [
    arm, surf(`wave2-${k}-pre`),
    ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',2);const s=E.state();return {room:r&&r.room,mode:r&&r.mode,roomState:s.room,ents:E.entityCount}")),
    waitFor("E.state().enemies.length>=2", 45000, ",enemies:E.state().enemies.map(e=>[e.id,e.kind]),roomState:E.state().room"),
    ...rmbOn(w, h), wait(800),
    ev(iife("const s=E.state();return {tag:'pre-wave2',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,party:s.party.map(p=>[p.classId||p.id,Math.round(p.hp),p.downed])}")),
    meterArm, peakArm,
    sampler(`B-room2-killall-${k}`, 20000),
    peakRead, meterRead,
    ev(iife("const s=E.state();return {tag:'post-wave2',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,party:s.party.map(p=>[p.classId||p.id,Math.round(p.hp),p.downed]),evs:window.__c.ev.filter(e=>['wave_start','room_cleared','downed'].includes(e.T)).map(e=>[e.T,e.tick])}")),
    surf(`wave2-${k}-post`),
    ...rmbOff,
  ];
  // D2 boss natural, 20 s (same steps as certD5-boss)
  files[`certD5-b-boss-${k}`] = [
    arm, surf(`boss-${k}-pre`),
    ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room,mode:r&&r.mode,boss:r&&r.boss}")),
    waitFor("window.__c.ev.some(e=>e.T==='boss_spawn') && window.__c.ev.some(e=>e.T==='boss_adds') && E.state().enemies.length>=3", 60000,
      ",boss:E.cmd('runState').boss,enemies:E.state().enemies.length,evs:window.__c.ev.filter(e=>/boss|downed/.test(e.T)).map(e=>[e.T,e.tick])"),
    ...rmbOn(w, h), wait(600),
    ev(iife("const s=E.state();const r=E.cmd('runState');return {tag:'pre-boss',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,boss:r&&r.boss,party:s.party.map(p=>[p.classId||p.id,Math.round(p.hp),p.downed])}")),
    meterArm, peakArm,
    sampler(`B-boss-natural-${k}`, 20000),
    peakRead, meterRead,
    ev(iife("const s=E.state();const r=E.cmd('runState');return {tag:'post-boss',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,boss:r&&r.boss,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>e.tick),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>[e.tick,e.pct,e.spawned]),downed:window.__c.ev.filter(e=>e.T==='downed').length,deaths:window.__c.ev.filter(e=>e.T==='death').length,screen:E.runUi().screen}")),
    surf(`boss-${k}-post`),
    ...rmbOff,
  ];
}

// 30 s camp idle at 2560 (settles the 40.9 / 50.7 split between two 10 s samples)
files['certD5-b-camp30-2560'] = [arm, surf('camp30-2560-pre'), meterArm, sampler('B-camp-idle30-2560', 30000), meterRead, surf('camp30-2560-post')];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
