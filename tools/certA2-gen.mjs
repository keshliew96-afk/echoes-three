// Certification round 2 — capture technician action-file generator (prefix certA2-).
// Writes tools/actions/certA2-*.json programmatically (never hand-escaped JSON).
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('tools/actions', { recursive: true });

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const iife = (body) => `(()=>{const E=window.__echoes;${body}})()`;
// Async poll: every 8 ms until cond (JS expr using E) is true or timeout; returns observed state.
const waitFor = (cond, timeout = 60000, extra = '') =>
  ev(`(async()=>{const E=window.__echoes;const t0=performance.now();const k0=E.tick;` +
     `while(performance.now()-t0<${timeout}){try{if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};}catch(err){}` +
     `await new Promise(r=>setTimeout(r,8));}` +
     `return {ok:false,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}}})()`);

const ALL_TYPES = ['telegraph_start','telegraph_resolve','hit','death','enemy_spawn','flash','knockback','screenshake',
  'boss_quake_start','boss_quake_resolve','boss_adds','boss_trample','boss_spawn','boss_death','wave_start','room_cleared',
  'spawn_telegraph','skill_cast','hitstop','enemy_fire','zone_spawn','azone_spawn','skill_bolt_spawn'];
const arm = ev(iife(`window.__a2={ev:[]};for(const t of ${JSON.stringify(ALL_TYPES)}){try{E.on(t,e=>window.__a2.ev.push(Object.assign({T:t},e)));}catch(err){}}return {armed:true,tick:E.tick,version:E.version,seed:E.seed,bootSeed:E.bootSeed,types:${ALL_TYPES.length}}`));
const evCounts = ev(iife(`const m={};for(const e of window.__a2.ev)m[e.T]=(m[e.T]||0)+1;return {tick:E.tick,fps:+E.fps.toFixed(1),counts:m,total:window.__a2.ev.length}`));

// Dump the WHOLE vfx probe (arena and camp expose different keys) plus the explicit
// counts the scorers need, with `null` (not undefined) when a key is absent so it survives JSON.
const VFX = `(s=>Object.assign({__keys:Object.keys(s.vfx||{}),__stateKeys:Object.keys(s)},s.vfx,{` +
  `numerals:s.vfx.numerals??null,decals:s.vfx.decals??null,particles:s.vfx.particles??null,` +
  `emitters:s.vfx.emitters??null,propTypes:s.vfx.propTypes??null,propShadows:s.vfx.propShadows??null,` +
  `grass:s.vfx.grass??null,variantName:s.vfx.variantName??null}))`;

const files = {};

// ---------- 1. CAMP boot (plain URL, no ?room, eval-only actions = no input) ----------
files['certA2-camp'] = [
  ev(iife(`const c=E.cmd('campState');const s=E.state();return {tag:'campState',version:E.version,tick:E.tick,fps:+E.fps.toFixed(1),seed:E.seed,bootSeed:E.bootSeed,scene:s.scene,entityCount:E.entityCount,` +
    `propTypes:c.propTypes,campPropTypes:c.campPropTypes,emitters:c.emitters,emitterKinds:c.emitterKinds,propShadows:c.propShadows,fireflies:c.fireflies,embers:c.embers,vignette:c.vignette,colliders:c.colliders,roadViolations:c.roadViolations,seats:c.seats,seatDrift:c.seatDrift,campStateKeys:Object.keys(c)}`)),
  ev(iife(`const s=E.state();return {tag:'stateVfx',vfx:s.vfx,toggles:s.toggles,party:s.party.map(p=>[p.id,p.classId||'?',p.hp,p.maxHp,+p.x.toFixed(2),+p.z.toFixed(2)]),enemies:s.enemies.length,runUi:E.runUi().screen,banner:E.hud.banner().text}`)),
];

// ---------- 2. COMBAT — Act-1 room, mid-wave, live telegraph ----------
const combatActs = [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {tag:'startRun',seed:E.seed,tick:E.tick,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode,modes:r&&r.frame&&r.frame.modes}`)),
  { type: 'mousemove', x: 800, y: 450 },
  waitFor(`E.state().enemies.length>=3 && window.__a2.ev.some(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&(e.resolveTick-E.tick)>=28)`, 90000,
    `,enemies:E.state().enemies.map(e=>({id:e.id,kind:e.kind,x:+e.x.toFixed(2),z:+e.z.toFixed(2),hp:e.hp})),` +
    `liveTele:window.__a2.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).map(e=>({startTick:e.tick,resolveTick:e.resolveTick,ticksLeft:e.resolveTick-E.tick,x:e.x,z:e.z,kind:e.kind||e.target})),` +
    `allTeleCount:window.__a2.ev.filter(e=>e.T==='telegraph_start').length,phase:E.cmd('runState').phase,room:E.cmd('runState').room`),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  key('Digit2', 60),
  wait(120),
  ev(iife(`const s=E.state();const rs=E.cmd('runState');return {tag:'combat-frame',version:E.version,tick:E.tick,fps:+E.fps.toFixed(1),seed:E.seed,entityCount:E.entityCount,room:rs.room,mode:rs.mode,phase:rs.phase,wallet:rs.wallet,` +
    `enemies:s.enemies.map(e=>({id:e.id,kind:e.kind,x:+e.x.toFixed(2),z:+e.z.toFixed(2),hp:e.hp})),` +
    `telegraphs:window.__a2.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick-10).map(e=>({startTick:e.tick,resolveTick:e.resolveTick,ticksLeft:e.resolveTick-E.tick,x:e.x,z:e.z})),` +
    `skillBolts:s.skillBolts.map(b=>({skill:b.skill,heal:b.heal,x:+b.x.toFixed(2),z:+b.z.toFixed(2)})),` +
    `azones:s.azones.map(z=>({skill:z.skill,radius:z.radius})),zones:s.zones.length,eshots:s.eshots.length,` +
    `vfx:${VFX}(s),banner:E.hud.banner().text,hudCombat:E.hud.combat(),` +
    `party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.maxHp,p.downed])}`)),
  evCounts,
];
files['certA2-combat'] = combatActs;

// ---------- 3. SHOP — room 7 ----------
files['certA2-shop'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {tag:'skip7',seed:E.seed,tick:E.tick,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode}`)),
  wait(1800),
  ev(iife(`const u=E.runUi();const s=E.state();return {tag:'shop-frame',version:E.version,tick:E.tick,fps:+E.fps.toFixed(1),seed:E.seed,screen:u.screen,text:u.text,subline:u.subline,wallet:u.wallet,` +
    `cards:u.cards,plaques:u.plaques,buttons:u.buttons,doors:u.doors,owned:u.owned,phase:u.phase,room:u.room,` +
    `vfx:${VFX}(s),enemies:s.enemies.length,banner:E.hud.banner().text}`)),
  ev(iife(`return {tag:'shop-dom',pagesVisible:[...document.querySelectorAll('#run-screen .rn-page')].filter(p=>getComputedStyle(p).display!=='none').map(p=>p.className),` +
    `cardsDom:[...document.querySelectorAll('#run-screen .rn-card')].map(n=>({cls:n.className,text:(n.textContent||'').trim().slice(0,60),box:(b=>[Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)])(n.getBoundingClientRect())})),` +
    `plaquesDom:[...document.querySelectorAll('#run-screen .rn-plaque,#run-screen .rn-price')].map(n=>(n.textContent||'').trim().slice(0,40)),` +
    `walletDom:(document.querySelector('#run-screen .rn-wallet')||{}).textContent}`)),
  evCounts,
];

// ---------- 4. BOSS — room 8, >=2 quakes, >=1 adds, latest quake <=6 ticks old ----------
const bossPoll = waitFor(
  `(()=>{const q=window.__a2.ev.filter(e=>e.T==='boss_quake_start');const a=window.__a2.ev.filter(e=>e.T==='boss_adds');return q.length>=2&&a.length>=1&&(E.tick-q[q.length-1].tick)<=6;})()`,
  120000,
  `,quakes:window.__a2.ev.filter(e=>e.T==='boss_quake_start').map(e=>({tick:e.tick,resolveTick:e.resolveTick,ticksSince:E.tick-e.tick,x:e.x,z:e.z})),` +
  `addsEv:window.__a2.ev.filter(e=>e.T==='boss_adds').map(e=>({tick:e.tick,pct:e.pct,spawned:e.spawned})),` +
  `boss:E.cmd('runState').boss,enemies:E.state().enemies.map(e=>({id:e.id,kind:e.kind,x:+e.x.toFixed(2),z:+e.z.toFixed(2),hp:e.hp}))`);

files['certA2-boss'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {tag:'skip8',seed:E.seed,tick:E.tick,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode,boss:r&&r.boss}`)),
  { type: 'mousemove', x: 800, y: 380 },
  bossPoll,
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  wait(150),
  ev(iife(`const s=E.state();const rs=E.cmd('runState');return {tag:'boss-frame',version:E.version,tick:E.tick,fps:+E.fps.toFixed(1),seed:E.seed,entityCount:E.entityCount,room:rs.room,phase:rs.phase,` +
    `boss:rs.boss,` +
    `quakes:window.__a2.ev.filter(e=>e.T==='boss_quake_start').map(e=>({tick:e.tick,resolveTick:e.resolveTick,ticksSince:E.tick-e.tick})),` +
    `quakeResolves:window.__a2.ev.filter(e=>e.T==='boss_quake_resolve').map(e=>e.tick),` +
    `addsEv:window.__a2.ev.filter(e=>e.T==='boss_adds').map(e=>({tick:e.tick,pct:e.pct,spawned:e.spawned})),` +
    `enemies:s.enemies.map(e=>({id:e.id,kind:e.kind,x:+e.x.toFixed(2),z:+e.z.toFixed(2),hp:e.hp})),` +
    `skillBolts:s.skillBolts.length,azones:s.azones.length,zones:s.zones.length,eshots:s.eshots.length,` +
    `vfx:${VFX}(s),banner:E.hud.banner().text,party:s.party.map(p=>[p.id,p.hp,p.downed])}`)),
  evCounts,
];

// boss sequence: fire the seq across a quake resolve — poll until a quake JUST started (<=2 ticks)
files['certA2-bossseq'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {tag:'skip8',seed:E.seed,tick:E.tick,room:r&&r.room,boss:r&&r.boss}`)),
  { type: 'mousemove', x: 800, y: 380 },
  waitFor(`(()=>{const q=window.__a2.ev.filter(e=>e.T==='boss_quake_start');const a=window.__a2.ev.filter(e=>e.T==='boss_adds');return q.length>=2&&a.length>=1&&(E.tick-q[q.length-1].tick)<=2;})()`,
    120000,
    `,quakes:window.__a2.ev.filter(e=>e.T==='boss_quake_start').map(e=>({tick:e.tick,resolveTick:e.resolveTick,ticksSince:E.tick-e.tick})),addsEv:window.__a2.ev.filter(e=>e.T==='boss_adds').map(e=>({tick:e.tick,pct:e.pct,spawned:e.spawned})),boss:E.cmd('runState').boss`),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
];

// combat sequence uses the identical combat setup (same moment); tail eval omitted so
// the frames start immediately after the 120 ms wait.
files['certA2-combatseq'] = combatActs.slice(0, -2);

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote tools/actions/' + name + '.json', acts.length, 'actions');
}
