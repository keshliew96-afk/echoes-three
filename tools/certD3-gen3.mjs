// Certification block D round 3 — action generator batch 3 (stress + reruns).
import { writeFileSync } from 'fs';
import { ev, wait, iife, waitFor, arm, sampler } from './certD3-gen.mjs';

const rmbOn = [{ type: 'mousemove', x: 800, y: 380 }, { type: 'mousedown', button: 'right' }];
const rmbOff = [{ type: 'mouseup', button: 'right' }];
const peakArm = ev(iife("window.__pk={max:0,at:0,maxEnts:0,n:0};window.__pkiv=setInterval(()=>{try{const s=E.state();window.__pk.n++;if(s.enemies.length>window.__pk.max){window.__pk.max=s.enemies.length;window.__pk.at=E.tick;}if(E.entityCount>window.__pk.maxEnts)window.__pk.maxEnts=E.entityCount;}catch(e){}},100);return 'peak armed t'+E.tick"));
const peakRead = ev(iife("clearInterval(window.__pkiv);const s=E.state();return {peak:window.__pk,now:{enemies:s.enemies.length,ents:E.entityCount,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length},vfx:s.vfx&&{numerals:s.vfx.numerals,decals:s.vfx.decals,particles:s.vfx.particles}}"));

const files = {};

// ---- STRESS: room 6 defend topped up to ~16 simultaneous enemies for the whole 20 s window ----
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
  ev(iife("clearInterval(window.__su);const s=E.state();return {tag:'post-stress',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,room:s.room,party:s.party.map(p=>[p.classId||p.id,p.hp,p.downed]),vfx:{numerals:s.vfx.numerals,decals:s.vfx.decals,particles:s.vfx.particles}}")),
  ...rmbOff,
];
files['certD3-stress16'] = stress(16);

// ---- rerun of room 2 kill_all (the 224 ms steady gap needs a second read) ----
const waveProbe = (room, tag, durMs) => [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',${room});return {room:r&&r.room,mode:r&&r.mode,roomState:E.state().room,ents:E.entityCount}`)),
  waitFor("E.state().enemies.length>=2", 45000, ",enemies:E.state().enemies.length"),
  ...rmbOn,
  wait(800),
  peakArm,
  sampler(tag, durMs),
  peakRead,
  ev(iife(`const s=E.state();return {tag:'post-${tag}',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,room:s.room,evs:window.__c.ev.filter(e=>['wave_start','enemy_spawn','death','room_cleared','downed'].includes(e.T)).map(e=>[e.T,e.tick]).slice(-40)}`)),
  ...rmbOff,
];
files['certD3-wave2b'] = waveProbe(2, 'D1-room2-killall-rerun', 20000);
files['certD3-wave2c'] = waveProbe(2, 'D1-room2-killall-run3', 20000);

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
