import { writeFileSync } from 'fs';
import { ev, wait, iife, waitFor, arm, sampler } from './certD3-gen.mjs';
const rmbOn = [{ type: 'mousemove', x: 800, y: 380 }, { type: 'mousedown', button: 'right' }];
const peakArm = ev(iife("window.__pk={max:0,at:0,maxEnts:0,n:0};window.__pkiv=setInterval(()=>{try{const s=E.state();window.__pk.n++;if(s.enemies.length>window.__pk.max){window.__pk.max=s.enemies.length;window.__pk.at=E.tick;}if(E.entityCount>window.__pk.maxEnts)window.__pk.maxEnts=E.entityCount;}catch(e){}},100);return 'peak armed t'+E.tick"));
const peakRead = ev(iife("clearInterval(window.__pkiv);const s=E.state();return {peak:window.__pk,now:{enemies:s.enemies.length,ents:E.entityCount}}"));
const probe = (room, tag, dur) => [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',${room});return {room:r&&r.room,mode:r&&r.mode,roomState:E.state().room}`)),
  waitFor("E.state().enemies.length>=2", 45000, ",enemies:E.state().enemies.length"),
  ...rmbOn, wait(800), peakArm, sampler(tag, dur), peakRead,
  ev(iife(`const s=E.state();return {tag:'post-${tag}',tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,room:s.room,evs:window.__c.ev.filter(e=>['wave_start','enemy_spawn','death','room_cleared','downed'].includes(e.T)).map(e=>[e.T,e.tick]).slice(-50)}`)),
];
const files = { 'certD3-wave3': probe(3, 'D1-room3-killall', 24000), 'certD3-wave4b': probe(4, 'D1-room4-defend', 24000) };
for (const [n, a] of Object.entries(files)) { writeFileSync(`tools/actions/${n}.json`, JSON.stringify(a, null, 1)); console.log('wrote', n, a.length); }
