// A-vfx round-2 fix pass — action-file generator (prefix certfixAvfx2-).
// Mirrors the technician's certA2 conditions exactly (seed 4242 combat frame,
// boss frame) plus extra probes this pass needs.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const iife = (body) => `(()=>{const E=window.__echoes;${body}})()`;

const ALL_TYPES = ['telegraph_start','telegraph_resolve','hit','death','enemy_spawn','flash','knockback','screenshake',
  'boss_quake_start','boss_quake_resolve','boss_adds','boss_trample','boss_spawn','boss_death','wave_start','room_cleared',
  'spawn_telegraph','skill_cast','hitstop','enemy_fire','zone_spawn','azone_spawn','skill_bolt_spawn'];
const arm = ev(iife(`window.__a2={ev:[]};for(const t of ${JSON.stringify(ALL_TYPES)}){try{E.on(t,e=>window.__a2.ev.push(Object.assign({T:t},e)));}catch(err){}}return {armed:true,tick:E.tick,version:E.version,seed:E.seed}`));
const evCounts = ev(iife(`const m={};for(const e of window.__a2.ev)m[e.T]=(m[e.T]||0)+1;return {tick:E.tick,fps:+E.fps.toFixed(1),counts:m,total:window.__a2.ev.length}`));

const waitFor = (cond, timeout, extra) =>
  ev(`(async()=>{const E=window.__echoes;const t0=performance.now();const k0=E.tick;` +
     `while(performance.now()-t0<${timeout}){try{if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};}catch(err){}` +
     `await new Promise(r=>setTimeout(r,8));}` +
     `return {ok:false,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}}})()`);

const VFX = `(s=>Object.assign({},s.vfx,{numerals:s.vfx.numerals??null,decals:s.vfx.decals??null,scorch:s.vfx.scorch??null,particles:s.vfx.particles??null}))`;

const combatPoll = waitFor(
  `E.state().enemies.length>=3 && window.__a2.ev.some(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&(e.resolveTick-E.tick)>=28)`,
  90000,
  `,enemies:E.state().enemies.map(e=>({id:e.id,kind:e.kind,x:+e.x.toFixed(2),z:+e.z.toFixed(2),hp:e.hp})),` +
  `liveTele:window.__a2.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).map(e=>({startTick:e.tick,resolveTick:e.resolveTick,ticksLeft:e.resolveTick-E.tick,x:e.x,z:e.z})),` +
  `phase:E.cmd('runState').phase,room:E.cmd('runState').room`);

const combatFrameProbe = ev(iife(`const s=E.state();const rs=E.cmd('runState');return {tag:'combat-frame',version:E.version,tick:E.tick,fps:+E.fps.toFixed(1),room:rs.room,mode:rs.mode,` +
  `enemies:s.enemies.map(e=>({id:e.id,kind:e.kind,x:+e.x.toFixed(2),z:+e.z.toFixed(2),hp:e.hp})),` +
  `telegraphs:window.__a2.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick-10).map(e=>({startTick:e.tick,resolveTick:e.resolveTick,ticksLeft:e.resolveTick-E.tick,x:e.x,z:e.z})),` +
  `simTele:s.enemies.map(e=>e.telegraph?{id:e.id,tx:e.telegraph.x,tz:e.telegraph.z}:null).filter(Boolean),` +
  `skillBolts:s.skillBolts.map(b=>({skill:b.skill,heal:b.heal,x:+b.x.toFixed(2),z:+b.z.toFixed(2)})),` +
  `vfx:${VFX}(s),banner:E.hud.banner().text,party:s.party.map(p=>[p.classId||'healer',p.hp,+p.x.toFixed(2),+p.z.toFixed(2)])}`));

const combat = [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {tag:'startRun',seed:E.seed,room:r&&r.room,mode:r&&r.mode}`)),
  { type: 'mousemove', x: 800, y: 450 },
  combatPoll,
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  key('Digit2', 60),
  wait(120),
  combatFrameProbe,
  evCounts,
];
const files = {};
files['certfixAvfx2-combat'] = combat;
files['certfixAvfx2-combatseq'] = combat.slice(0, -2);

// BOSS: room 8, during quake 2+ with adds (technician conditions).
const bossPoll = waitFor(
  `(()=>{const q=window.__a2.ev.filter(e=>e.T==='boss_quake_start');const a=window.__a2.ev.filter(e=>e.T==='boss_adds');return q.length>=2&&a.length>=1&&(E.tick-q[q.length-1].tick)<=6})()`,
  90000,
  `,quakes:window.__a2.ev.filter(e=>e.T==='boss_quake_start').length,adds:window.__a2.ev.filter(e=>e.T==='boss_adds').length,` +
  `boss:(b=>b?{hp:b.hp,x:+b.x.toFixed(2),z:+b.z.toFixed(2)}:null)(E.state().enemies.find(e=>e.kind==='stag')),enemies:E.state().enemies.length`);
const boss = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {tag:'skip8',room:r&&r.room,mode:r&&r.mode}`)),
  { type: 'mousemove', x: 800, y: 450 },
  bossPoll,
  { type: 'mousedown', button: 'right' },
  wait(60),
  ev(iife(`const s=E.state();return {tag:'boss-frame',version:E.version,tick:E.tick,fps:+E.fps.toFixed(1),` +
    `enemies:s.enemies.map(e=>({id:e.id,kind:e.kind,x:+e.x.toFixed(2),z:+e.z.toFixed(2),hp:e.hp})),vfx:${VFX}(s),` +
    `party:s.party.map(p=>[p.classId||'healer',p.hp,+p.x.toFixed(2),+p.z.toFixed(2)])}`)),
  evCounts,
];
files['certfixAvfx2-boss'] = boss;

// KNOCKBACK + SHAKE audit: watch knockback distance and screenshake events.
files['certfixAvfx2-juice'] = [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {tag:'startRun',room:r&&r.room}`)),
  { type: 'mousemove', x: 800, y: 450 },
  { type: 'mousedown', button: 'right' },
  waitFor(`window.__a2.ev.filter(e=>e.T==='death').length>=2`, 90000,
    `,kb:window.__a2.ev.filter(e=>e.T==='knockback').slice(0,8),shakes:window.__a2.ev.filter(e=>e.T==='screenshake').slice(0,8),deaths:window.__a2.ev.filter(e=>e.T==='death').length`),
  ev(iife(`const s=E.state();return {tag:'juice',vfx:${VFX}(s),shakeEvents:window.__a2.ev.filter(e=>e.T==='screenshake').length,kbEvents:window.__a2.ev.filter(e=>e.T==='knockback').length}`)),
  evCounts,
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote tools/actions/' + name + '.json (' + acts.length + ' actions)');
}
