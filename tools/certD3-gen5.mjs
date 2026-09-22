// Certification block D round 3 — batch 5: boss steady-state with the fight held alive.
import { writeFileSync } from 'fs';
import { ev, wait, iife, waitFor, arm, sampler } from './certD3-gen.mjs';

const rmbOn = [{ type: 'mousemove', x: 800, y: 380 }, { type: 'mousedown', button: 'right' }];
const rmbOff = [{ type: 'mouseup', button: 'right' }];
const peakArm = ev(iife("window.__pk={max:0,at:0,maxEnts:0,n:0};window.__pkiv=setInterval(()=>{try{const s=E.state();window.__pk.n++;if(s.enemies.length>window.__pk.max){window.__pk.max=s.enemies.length;window.__pk.at=E.tick;}if(E.entityCount>window.__pk.maxEnts)window.__pk.maxEnts=E.entityCount;}catch(e){}},100);return 'peak armed t'+E.tick"));
const peakRead = ev(iife("clearInterval(window.__pkiv);const s=E.state();return {peak:window.__pk,now:{enemies:s.enemies.length,ents:E.entityCount,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length}}"));

const ALL = ['room_cleared','wave_start','enemy_spawn','telegraph_start','telegraph_resolve','enemy_fire','enemy_bite',
  'hit','death','hitstop','skill_cast','ally_cast','ally_basic','downed','revive','zone_spawn','azone_spawn',
  'skill_bolt_spawn','projectile_spawn','screenshake','boss_quake_start','boss_quake_resolve','boss_trample','boss_adds','boss_death'];
const armT = ev(iife(`window.__h={ev:[]};for(const t of ${JSON.stringify(ALL)})E.on(t,e=>window.__h.ev.push({T:t,tick:e.tick,ms:+performance.now().toFixed(1),k:e.kind||e.skill||e.id||e.source||''}));return 'armedT '+E.tick`));

const hitchSampler = (tag, durMs) => ev(`(async()=>{const E=__echoes;const TAG=${JSON.stringify(tag)};const DUR=${durMs};
const D=[];const ABS=[];let t0=0,last=0,stop=false;
const step=(now)=>{const d=now-last;last=now;D.push([+(now-t0).toFixed(1),+d.toFixed(2)]);ABS.push(now);if(now-t0<DUR)requestAnimationFrame(step);else stop=true;};
requestAnimationFrame((n)=>{t0=n;last=n;requestAnimationFrame(step);});
const guard=performance.now();
while(!stop&&performance.now()-guard<DUR+15000){await new Promise(r=>setTimeout(r,40));}
const stat=(a)=>{if(!a.length)return null;const v=a.map(x=>x[1]).sort((p,q)=>p-q);const n=v.length;const sum=v.reduce((p,q)=>p+q,0);const Q=(p)=>+v[Math.min(n-1,Math.floor(p*n))].toFixed(2);
return {frames:n,meanMs:+(sum/n).toFixed(2),meanFps:+(1000/(sum/n)).toFixed(1),p50:Q(0.5),p95:Q(0.95),p99:Q(0.99),max:+v[n-1].toFixed(2)};};
const H=[];
for(let i=0;i<D.length;i++){if(D[i][1]>60){const endAbs=ABS[i];const startAbs=endAbs-D[i][1];
  const near=(window.__h?window.__h.ev:[]).filter(e=>e.ms>=startAbs-300&&e.ms<=endAbs+80).map(e=>[+(e.ms-startAbs).toFixed(0),e.T,e.tick,String(e.k).slice(0,14)]);
  H.push({relMs:D[i][0],frameStartMs:+startAbs.toFixed(0),gap:D[i][1],events:near.slice(0,26)});}}
return {tag:TAG,all:stat(D),warm:stat(D.filter(x=>x[0]<3000)),steady:stat(D.filter(x=>x[0]>=3000)),gaps60:H.length,hitches:H.slice(0,6)};})()`);

const keepAlive = ev(iife("window.__ka=setInterval(()=>{try{const s=E.state();for(const p of s.party){if(p.downed){try{E.cmd('rally');}catch(e){}}if(p.downed||p.hp<p.maxHp*0.65){try{E.cmd('setHp',p.id,1);}catch(e){}}}const r=E.cmd('runState');if(r&&r.boss&&r.boss.pct<0.55){try{E.cmd('bossHp',0.85);}catch(e){}}}catch(e){}},500);return 'keepalive armed t'+E.tick"));

const files = {};
files['certD3-boss2'] = [
  arm, armT,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room,mode:r&&r.mode,boss:r&&r.boss}")),
  waitFor("window.__c.ev.some(e=>e.T==='boss_adds') && E.state().enemies.length>=3", 60000, ",boss:E.cmd('runState').boss,enemies:E.state().enemies.length"),
  ...rmbOn,
  keepAlive,
  hitchSampler('D2-boss-early', 10000),
  ev(iife("const s=E.state();return {tag:'mid-boss',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,boss:E.cmd('runState').boss,party:s.party.map(p=>[p.classId||p.id,p.hp,p.downed])}")),
  peakArm,
  sampler('D2-boss-steady', 20000),
  peakRead,
  ev(iife("clearInterval(window.__ka);const s=E.state();return {tag:'post-boss',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,boss:E.cmd('runState').boss,party:s.party.map(p=>[p.classId||p.id,p.hp,p.downed]),quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>e.tick),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>[e.tick,e.pct,e.spawned]),downed:window.__c.ev.filter(e=>e.T==='downed').length}")),
  ...rmbOff,
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
