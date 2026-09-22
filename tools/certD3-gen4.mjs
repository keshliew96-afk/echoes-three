// Certification block D round 3 — batch 4: hitch forensics (room 2 kill_all).
import { writeFileSync } from 'fs';
import { ev, wait, iife, waitFor } from './certD3-gen.mjs';

const rmbOn = [{ type: 'mousemove', x: 800, y: 380 }, { type: 'mousedown', button: 'right' }];
const rmbOff = [{ type: 'mouseup', button: 'right' }];

const ALL = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','spawn_telegraph',
  'telegraph_start','telegraph_resolve','enemy_fire','enemy_bite','hit','hit_immune','death','hitstop','sound','heal',
  'skill_cast','ally_cast','ally_basic','dodge','dash','downed','revive','reward','draft','zone_spawn','azone_spawn',
  'skill_bolt_spawn','projectile_spawn','flash','knockback','screenshake','flinch','mark','enemy_despawn'];

const armT = ev(iife(`window.__h={ev:[]};for(const t of ${JSON.stringify(ALL)})E.on(t,e=>window.__h.ev.push({T:t,tick:e.tick,ms:+performance.now().toFixed(1),k:e.kind||e.skill||e.id||e.source||e.type||''}));return 'armedT '+E.tick`));

// rAF sampler that returns, for every gap >60 ms, the events in [t-400, t+120] ms around it
const hitchSampler = (tag, durMs) => ev(`(async()=>{const E=__echoes;const TAG=${JSON.stringify(tag)};const DUR=${durMs};
const D=[];const LT=[];let po=null;
try{po=new PerformanceObserver(l=>{for(const e of l.getEntries())LT.push([+e.startTime.toFixed(0),+e.duration.toFixed(1),e.name]);});po.observe({entryTypes:['longtask']});}catch(e){}
let t0=0,last=0,stop=false;const ABS=[];
const step=(now)=>{const d=now-last;last=now;D.push([+(now-t0).toFixed(1),+d.toFixed(2)]);ABS.push(now);if(now-t0<DUR)requestAnimationFrame(step);else stop=true;};
requestAnimationFrame((n)=>{t0=n;last=n;requestAnimationFrame(step);});
const guard=performance.now();
while(!stop&&performance.now()-guard<DUR+15000){await new Promise(r=>setTimeout(r,40));}
if(po)try{po.disconnect();}catch(e){}
const stat=(a)=>{if(!a.length)return null;const v=a.map(x=>x[1]).sort((p,q)=>p-q);const n=v.length;const sum=v.reduce((p,q)=>p+q,0);const Q=(p)=>+v[Math.min(n-1,Math.floor(p*n))].toFixed(2);
return {frames:n,meanMs:+(sum/n).toFixed(2),meanFps:+(1000/(sum/n)).toFixed(1),p50:Q(0.5),p95:Q(0.95),p99:Q(0.99),max:+v[n-1].toFixed(2)};};
const W=D.filter(x=>x[0]<3000),ST=D.filter(x=>x[0]>=3000);
const H=[];
for(let i=0;i<D.length;i++){if(D[i][1]>60){const endAbs=ABS[i];const startAbs=endAbs-D[i][1];
  const near=(window.__h?window.__h.ev:[]).filter(e=>e.ms>=startAbs-400&&e.ms<=endAbs+120).map(e=>[+(e.ms-startAbs).toFixed(0),e.T,e.tick,String(e.k).slice(0,14)]);
  const lt=LT.filter(l=>l[0]>=startAbs-t0-50&&l[0]<=endAbs-t0+50);
  H.push({relMs:D[i][0],gap:D[i][1],tickNow:E.tick,longTasks:lt,events:near});}}
return {tag:TAG,all:stat(D),warm:stat(W),steady:stat(ST),gaps60:H.length,hitches:H.slice(0,8),longTaskCount:LT.length,evTotal:(window.__h?window.__h.ev.length:0)};})()`);

const files = {};
files['certD3-hitch2'] = [
  armT,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',2);return {room:r&&r.room,mode:r&&r.mode,roomState:E.state().room}")),
  waitFor("E.state().enemies.length>=2", 45000, ",enemies:E.state().enemies.length,tick:E.tick"),
  ...rmbOn,
  wait(800),
  ev(iife("return {sampleStartTick:E.tick,ms:+performance.now().toFixed(1)}")),
  hitchSampler('D1-room2-hitch', 20000),
  ev(iife("const s=E.state();return {tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,vfx:{numerals:s.vfx.numerals,decals:s.vfx.decals,particles:s.vfx.particles}}")),
  ...rmbOff,
];
// same fight, second pass in the SAME page session: is the stall first-use only?
files['certD3-hitch2x2'] = [
  armT,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',2);return {pass:1,room:r&&r.room}")),
  waitFor("E.state().enemies.length>=2", 45000, ",enemies:E.state().enemies.length"),
  ...rmbOn, wait(800),
  hitchSampler('pass1-room2', 16000),
  ...rmbOff,
  ev(iife("E.cmd('endRun','defeat');return {ended:true}")),
  wait(1500),
  ev(iife("try{E.cmd('returnToCamp');}catch(e){}return {scene:E.state().scene}")),
  waitFor("E.state().scene==='camp'", 30000, ",scene:E.state().scene"),
  wait(1500),
  ev(iife("window.__h.ev=[];E.cmd('startRun');const r=E.cmd('skipToRoom',2);return {pass:2,room:r&&r.room}")),
  waitFor("E.state().enemies.length>=2", 45000, ",enemies:E.state().enemies.length"),
  ...rmbOn, wait(800),
  hitchSampler('pass2-room2', 16000),
  ...rmbOff,
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
