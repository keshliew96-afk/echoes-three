// Certification block D round 3 — action generator (critic-owned, prefix certD3-).
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 40000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){try{if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};}catch(e){}await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const EVT = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','spawn_telegraph',
  'telegraph_start','telegraph_resolve','enemy_fire','death','run_end','run_wiped','return_to_camp','downed',
  'boss_spawn','boss_quake_start','boss_quake_resolve','boss_trample','boss_adds','boss_death','enemy_despawn','director_stop','victory','defeat'];
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(EVT)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));

// ---- rAF sampler: returns mean/p50/p95/p99/max, warm(0-3s) vs steady, every gap>100ms, per-second state
const sampler = (tag, durMs) => ev(`(async()=>{const E=__echoes;const TAG=${JSON.stringify(tag)};const DUR=${durMs};
const D=[];const S=[];const LT=[];let po=null;
try{po=new PerformanceObserver(l=>{for(const e of l.getEntries())LT.push([+e.startTime.toFixed(0),+e.duration.toFixed(1)]);});po.observe({entryTypes:['longtask']});}catch(e){}
let t0=0,last=0,stop=false;
const step=(now)=>{const d=now-last;last=now;D.push([+(now-t0).toFixed(1),+d.toFixed(2)]);if(now-t0<DUR)requestAnimationFrame(step);else stop=true;};
requestAnimationFrame((n)=>{t0=n;last=n;requestAnimationFrame(step);});
const iv=setInterval(()=>{try{const s=E.state();S.push([+((performance.now()-t0)/1000).toFixed(2),+(E.fps||0).toFixed(1),E.entityCount,s.enemies.length,s.eshots.length,s.zones.length,s.azones.length,s.skillBolts.length,E.tick]);}catch(e){}},1000);
const guard=performance.now();
while(!stop&&performance.now()-guard<DUR+15000){await new Promise(r=>setTimeout(r,40));}
clearInterval(iv);if(po)try{po.disconnect();}catch(e){}
const stat=(a)=>{if(!a.length)return null;const v=a.map(x=>x[1]).sort((p,q)=>p-q);const n=v.length;const sum=v.reduce((p,q)=>p+q,0);const Q=(p)=>+v[Math.min(n-1,Math.floor(p*n))].toFixed(2);
return {frames:n,meanMs:+(sum/n).toFixed(2),meanFps:+(1000/(sum/n)).toFixed(1),p50:Q(0.5),p95:Q(0.95),p99:Q(0.99),max:+v[n-1].toFixed(2)};};
const W=D.filter(x=>x[0]<3000),ST=D.filter(x=>x[0]>=3000);
const gS=ST.filter(x=>x[1]>100).map(x=>[x[0],x[1]]);
const gA=D.filter(x=>x[1]>100).map(x=>[x[0],x[1]]);
let worst=null;
if(ST.length>2){const te=ST[ST.length-1][0];for(let s=ST[0][0];s+15000<=te+500;s+=1000){const w=ST.filter(x=>x[0]>=s&&x[0]<s+15000);if(w.length<10)continue;const g=w.filter(x=>x[1]>100).length;const st=stat(w);if(!worst||g>worst.gaps||(g===worst.gaps&&st.meanFps<worst.meanFps))worst={start:Math.round(s),gaps:g,meanFps:st.meanFps,max:st.max};}}
let evs=null;try{evs=(window.__c?window.__c.ev:[]).filter(e=>['boss_quake_start','boss_adds','wave_start','room_cleared','boss_death','death','downed','enemy_spawn'].includes(e.T)).map(e=>[e.T,e.tick]);}catch(e){}
return {tag:TAG,durMs:Math.round(performance.now()-guard),all:stat(D),warm:stat(W),steady:stat(ST),steadyGaps100:gS,allGaps100:gA,longTasks:LT.length,longTasksTop:LT.sort((a,b)=>b[1]-a[1]).slice(0,5),worst15s:worst,perSec:S,evs:evs};})()`);

const files = {};

// ---------- RECON: renderer identity, run frame for seed 999, DOM inventory, camp baseline ----------
files['certD3-recon'] = [
  ev(iife(`const c=document.querySelector('canvas');let info=null;try{const gl=c.getContext('webgl2')||c.getContext('webgl');const d=gl.getExtension('WEBGL_debug_renderer_info');info={renderer:gl.getParameter(d.UNMASKED_RENDERER_WEBGL),vendor:gl.getParameter(d.UNMASKED_VENDOR_WEBGL),ver:gl.getParameter(gl.VERSION)};}catch(e){info={err:String(e)}}
  return {version:E.version,seed:E.seed,bootSeed:E.bootSeed,tick:E.tick,fps:E.fps,ents:E.entityCount,canvas:[c.width,c.height],css:[c.clientWidth,c.clientHeight],dpr:devicePixelRatio,vp:[innerWidth,innerHeight],cores:navigator.hardwareConcurrency,info}`)),
  ev(iife(`const s=E.state();return {scene:s.scene,vfx:s.vfx,ents:E.entityCount,toggles:s.toggles}`)),
  // DOM inventory of everything visible (excluding canvas) with a real rect
  ev(iife(`const out=[];const walk=(n,d)=>{if(d>7)return;for(const el of n.children){if(el.tagName==='CANVAS'||el.tagName==='SCRIPT'||el.tagName==='STYLE'){continue;}const cs=getComputedStyle(el);const r=el.getBoundingClientRect();if(cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>0.01&&r.width>0&&r.height>0){out.push([d,el.tagName,el.id||'',el.className&&el.className.baseVal!==undefined?el.className.baseVal:(el.className||''),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),(el.childElementCount?'':(el.textContent||'').trim().slice(0,26))]);}
  walk(el,d+1);}};walk(document.body,0);return {vp:[innerWidth,innerHeight],n:out.length,els:out.slice(0,120)}`)),
  ev(iife(`const r=E.cmd('startRun');const rs=E.cmd('runState');return {seed:E.seed,frame:r&&r.frame,room:rs&&rs.room,mode:rs&&rs.mode,rs:JSON.stringify(rs).slice(0,1200)}`)),
  wait(500),
  ev(iife(`const rs=E.cmd('runState');return {waves:rs&&rs.waves,sched:JSON.stringify(rs).slice(0,1500)}`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
export { ev, wait, shot, down, up, key, iife, waitFor, arm, sampler, EVT };
