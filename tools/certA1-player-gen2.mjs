// certA1-player critic — probe generator #2: knockback displacement (sim state per tick), spawn pop, quake shake burst.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const TYPES = ['hit','death','hitstop','enemy_spawn','spawn_telegraph','boss_quake_resolve','boss_quake_start','wave_start','room_cleared','flash','knockback','screenshake','shake','camera_shake'];
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(TYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t,at:E.tick},e)));window.__rec={};window.__recTimer=setInterval(()=>{const s=E.state();const m={};for(const e of s.enemies)m[e.id]=[+e.x.toFixed(3),+e.z.toFixed(3),e.hp,e.kbTicks];window.__rec[E.tick]=m;},4);return 'armed '+E.tick`));
const files = {};
files['certA1-player-kb'] = [
  arm,
  ev(iife(`E.cmd('startRun');return {seed:E.seed}`)),
  { type: 'mousemove', x: 500, y: 450 },
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<40000){if(E.state().enemies.length>=3)return {ok:true,tick:E.tick};await new Promise(r=>setTimeout(r,8));}return {ok:false}})()`),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  // wait for a NON-lethal hit on an enemy, then dump per-tick positions from tick-4 .. tick+10
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<40000){const h=window.__c.ev.find(e=>e.T==='hit'&&e.kind!=='ally'&&!window.__c.ev.some(d=>d.T==='death'&&d.id===e.target&&d.at===e.at));if(h){const tk=h.at;while(E.tick<tk+12)await new Promise(r=>setTimeout(r,4));const out=[];for(let t=tk-4;t<=tk+10;t++){const m=window.__rec[t];out.push([t,m&&m[h.target]?m[h.target]:null]);}return {hit:h,samples:out}}await new Promise(r=>setTimeout(r,4));}return {ok:false}})()`),
  shot('certA1-player-kb0'),
  // wave-2 spawn pop: wait for the next enemy_spawn after this point, shoot immediately and +600ms
  ev(iife(`window.__mark=window.__c.ev.length;return {mark:window.__mark,tick:E.tick}`)),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<60000){const s=window.__c.ev.slice(window.__mark).find(e=>e.T==='enemy_spawn');if(s)return {spawn:s,tick:E.tick,enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2)])};await new Promise(r=>setTimeout(r,4));}return {ok:false}})()`),
  shot('certA1-player-spawn0'),
  wait(500),
  shot('certA1-player-spawn1'),
  ev(iife(`clearInterval(window.__recTimer);const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {tick:E.tick,fps:E.fps,counts:m,enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp])}`)),
];
// boss quake shake burst: three back-to-back shots right after boss_quake_resolve (+~5, +~65, +~125 ticks)
files['certA1-player-shake'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room}`)),
  { type: 'mousemove', x: 800, y: 300 },
  { type: 'mousedown', button: 'right' },
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<40000){const q=window.__c.ev.find(e=>e.T==='boss_quake_resolve');if(q)return {quake:q,tick:E.tick};await new Promise(r=>setTimeout(r,2));}return {ok:false}})()`),
  shot('certA1-player-shake0'),
  ev(iife(`return {tick:E.tick}`)),
  shot('certA1-player-shake1'),
  ev(iife(`return {tick:E.tick}`)),
  shot('certA1-player-shake2'),
  ev(iife(`clearInterval(window.__recTimer);const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {tick:E.tick,fps:E.fps,counts:m}`)),
];
for (const [name, acts] of Object.entries(files)) { writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); }
