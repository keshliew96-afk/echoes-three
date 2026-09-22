// Round-3 certification CAPTURE TECHNICIAN — action-file generator.
// Writes tools/actions/certA3-*.json programmatically (never hand-escaped).
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
// Async poll every 8 ms; RETURNS observed state so it lands in console.txt as [EVAL].
const waitFor = (cond, timeout = 40000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){try{if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};}catch(err){}await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}}})()`);

const ALL_TYPES = ['telegraph_start', 'telegraph_resolve', 'hit', 'death', 'enemy_spawn', 'flash', 'knockback', 'screenshake',
  'hitstop', 'boss_quake_start', 'boss_quake_resolve', 'boss_adds', 'boss_trample', 'boss_spawn', 'boss_death',
  'wave_start', 'room_cleared', 'run_end', 'enemy_fire', 'skill_cast', 'zone_spawn', 'azone_spawn', 'skill_bolt_spawn'];
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(ALL_TYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed tick='+E.tick+' types=${ALL_TYPES.length}'`));

// state().vfx is the CAMP diagnostic block; the live arena numbers hang off
// state().vfx.arena (verified by captures/certA3-vfxkeys.console.txt). Report the
// arena block when a run is live, and always keep vfx.mode + the camp block too.
const VFX = `(s=>{const a=s.vfx.arena;return {mode:s.vfx.mode,arena:a?{numerals:a.numerals,decals:a.decals,scorch:a.scorch,particles:a.particles,emitters:a.emitters,embers:a.embers,propTypes:a.propTypes,propShadows:a.propShadows,grass:a.grass,flowers:a.flowers,variantName:a.variantName,shake:a.shake,shakes:a.shakes,treeline:a.treeline}:null,camp:{emitters:s.vfx.emitters,propTypes:s.vfx.propTypes,propShadows:s.vfx.propShadows,grass:s.vfx.grass,fireflies:s.vfx.fireflies,embers:s.vfx.embers,vignette:s.vfx.vignette,exposure:s.vfx.exposure}}})`;

const evCounts = ev(iife(`const m={};for(const e of (window.__c?window.__c.ev:[]))m[e.T]=(m[e.T]||0)+1;return {tick:E.tick,fps:+E.fps.toFixed(1),eventCounts:m}`));

const files = {};

// ================= 1. CAMP =================
const campProbe = [
  ev(iife(`const c=E.cmd('campState');return {version:E.version,tick:E.tick,fps:+E.fps.toFixed(1),scene:E.state().scene,entityCount:E.entityCount,bootSeed:E.bootSeed,propTypes:c.propTypes,campPropTypes:c.campPropTypes,emitters:c.emitters,emitterKinds:c.emitterKinds,propShadows:c.propShadows,fireflies:c.fireflies,embers:c.embers,vignette:c.vignette,colliders:c.colliders,roadViolations:c.roadViolations,seats:c.seats}`)),
  ev(iife(`const s=E.state();return {vfx:${VFX}(s),toggles:s.toggles,party:s.party.map(p=>[p.id,p.hp,p.maxHp]),critters:(E.cmd('campState').prompt||{}).critters}`)),
];
files['certA3-camp'] = campProbe;
files['certA3-campseq'] = campProbe;

// ================= 2. COMBAT =================
const combatSetup = [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,bootSeed:E.bootSeed,version:E.version,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode}`)),
  { type: 'mousemove', x: 800, y: 450 },
  waitFor(`E.state().enemies.length>=3 && window.__c.ev.some(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&e.resolveTick-E.tick>=28)`, 60000,
    `,enemyCount:E.state().enemies.length,enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),liveTelegraphs:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).map(e=>({startTick:e.tick,resolveTick:e.resolveTick,ticksLeft:e.resolveTick-E.tick,x:e.x,z:e.z,target:e.target,kind:e.kind}))`),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  key('Digit2', 60),
  wait(120),
  ev(iife(`const s=E.state();const r=s.run;return {tick:E.tick,fps:+E.fps.toFixed(1),version:E.version,scene:s.scene,room:r.room,phase:r.phase,mode:r.mode,combat:r.combatActive,wallet:r.wallet,entityCount:E.entityCount,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp,e.maxHp]),skillBolts:s.skillBolts.map(b=>[b.skill,b.heal,+b.x.toFixed(2),+b.z.toFixed(2)]),azones:s.azones.map(z=>[z.skill,z.radius]),zones:s.zones.length,eshots:s.eshots.length,party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.maxHp,p.downed]),skills:s.skills.map(k=>k&&k.id),vfx:${VFX}(s),banner:E.hud.banner().text,hud:E.hud.combat()}`)),
  ev(iife(`const now=E.tick;return {liveTelegraphsAtShot:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>now).map(e=>({startTick:e.tick,resolveTick:e.resolveTick,ticksLeft:e.resolveTick-now,x:e.x,z:e.z,kind:e.kind})),recent:window.__c.ev.slice(-30).map(e=>[e.tick,e.T])}`)),
  evCounts,
];
files['certA3-combat'] = combatSetup;
files['certA3-combatseq'] = combatSetup;

// ================= 3. SHOP =================
files['certA3-shop'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {seed:E.seed,version:E.version,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode}`)),
  wait(1800),
  ev(iife(`const u=E.runUi();return JSON.stringify({screen:u.screen,text:u.text,subline:u.subline,wallet:u.wallet,buttons:u.buttons,cards:u.cards,plaques:u.plaques,doors:u.doors,owned:u.owned,held:u.held,stale:u.stale,phase:u.phase,room:u.room}).slice(0,3000)`)),
  ev(iife(`const s=E.state();return {tick:E.tick,fps:+E.fps.toFixed(1),scene:s.scene,room:s.run.room,phase:s.run.phase,wallet:s.run.wallet,entityCount:E.entityCount,enemies:s.enemies.length,vfx:${VFX}(s),banner:E.hud.banner().text,pagesVisible:[...document.querySelectorAll('#run-screen .rn-page')].filter(p=>getComputedStyle(p).display!=='none').map(p=>p.className),cardNodes:[...document.querySelectorAll('#run-screen .rn-card')].map(n=>{const b=n.getBoundingClientRect();return [n.className,(n.textContent||'').trim().slice(0,44),Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]}),plaqueNodes:[...document.querySelectorAll('#run-screen .rn-plaque')].map(n=>{const b=n.getBoundingClientRect();return [(n.textContent||'').trim().slice(0,44),Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]})}`)),
];

// ================= 4. BOSS =================
const bossSetup = (extraKeys) => [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,version:E.version,room:r&&r.room,phase:r&&r.phase,boss:r&&r.boss}`)),
  { type: 'mousemove', x: 800, y: 380 },
  waitFor(`(()=>{const q=window.__c.ev.filter(e=>e.T==='boss_quake_start');const a=window.__c.ev.filter(e=>e.T==='boss_adds');return q.length>=2&&a.length>=1&&E.tick-q[q.length-1].tick<=6})()`, 90000,
    `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>({tick:e.tick,resolveTick:e.resolveTick,ticksSince:E.tick-e.tick,x:e.x,z:e.z})),quakeResolves:window.__c.ev.filter(e=>e.T==='boss_quake_resolve').map(e=>e.tick),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>({tick:e.tick,pct:e.pct,spawned:e.spawned})),boss:E.cmd('runState').boss,enemyCount:E.state().enemies.length`),
  ...extraKeys,
  ev(iife(`const s=E.state();const r=s.run;return {tick:E.tick,fps:+E.fps.toFixed(1),version:E.version,room:r.room,phase:r.phase,combat:r.combatActive,boss:E.cmd('runState').boss,entityCount:E.entityCount,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp,e.maxHp]),skillBolts:s.skillBolts.length,azones:s.azones.map(z=>[z.skill,z.radius]),zones:s.zones.length,eshots:s.eshots.length,party:s.party.map(p=>[p.id,p.hp,p.maxHp,p.downed]),vfx:${VFX}(s),banner:E.hud.banner().text,hud:E.hud.combat()}`)),
  ev(iife(`const now=E.tick;return {quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>({tick:e.tick,resolveTick:e.resolveTick,ticksSinceStart:now-e.tick})),quakeResolves:window.__c.ev.filter(e=>e.T==='boss_quake_resolve').map(e=>e.tick),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>({tick:e.tick,pct:e.pct,spawned:e.spawned})),tramples:window.__c.ev.filter(e=>e.T==='boss_trample').map(e=>e.tick)}`)),
  evCounts,
];
files['certA3-boss'] = bossSetup([{ type: 'mousedown', button: 'right' }, key('Digit1', 60), wait(150)]);
// seq: fires right at a quake start so the 8x150 ms frames span the resolve (+~42 ticks = 700 ms)
files['certA3-bossseq'] = bossSetup([{ type: 'mousedown', button: 'right' }, key('Digit1', 60)]);

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote tools/actions/' + name + '.json', acts.length, 'actions');
}
