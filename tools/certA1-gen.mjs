// certA1 capture technician — action-file generator (round 1 final certification, fresh run).
// Writes tools/actions/certA1-*.json programmatically (never hand-escaped JSON).
// Helper pattern copied from tools/cert-gen.mjs (arm / snap / waitFor). Every eval is an
// IIFE (all evals share ONE page scope); waits are async IIFEs polling window.__echoes every
// 8 ms and RETURNING the observed state so it lands in <name>.console.txt as [EVAL].
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 40000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}}})()`);

const ALL_TYPES = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','spawn_telegraph',
  'telegraph_start','telegraph_resolve','enemy_fire','enemy_bite','hit','hit_immune','death','hitstop','sound','heal',
  'skill_cast','ally_cast','ally_basic','dodge','dash','run_end','run_wiped','return_to_camp','downed','revive',
  'boss_spawn','boss_quake_start','boss_quake_resolve','boss_trample','boss_adds','boss_death','enemy_despawn',
  'reward','draft','draft_taken','path_chosen','shop_buy','currency_denied','skill_equip','node_granted','zone_spawn',
  'azone_spawn','skill_bolt_spawn','projectile_spawn','flash','knockback','screenshake','flinch','director_stop','mark','defeat','victory'];
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(ALL_TYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed tick '+E.tick+' seed '+E.seed+' v'+E.version`));
const counts = `(()=>{const m={};for(const e of (window.__c?window.__c.ev:[]))m[e.T]=(m[e.T]||0)+1;return m})()`;
// compact vfx counts: top-level + arena sub-object (numerals/decals/particles live under vfx.arena in run mode)
const vfxCounts = `(v=>{const a=v.arena||{};return {mode:v.mode,emitters:v.emitters,propTypes:v.propTypes,propShadows:v.propShadows,grass:v.grass,fireflies:v.fireflies,embers:v.embers,vignette:v.vignette,exposure:v.exposure,arena:{numerals:a.numerals,decals:a.decals,particles:a.particles,dummies:a.dummies,variant:a.variant,variantName:a.variantName,grass:a.grass,flowers:a.flowers,propTypes:a.propTypes,propShadows:a.propShadows,emitters:a.emitters,embers:a.embers,party:a.party}}})(s.vfx||{})`;
const threat = `(({gated,offFrame,markersDrawn,domMarkers,uncued})=>({gated,offFrame,markersDrawn,domMarkers,uncued}))(E.hud.threat())`;
const snap = (tag) => ev(iife(`const s=E.state();const r=s.run;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,seed:E.seed,bootSeed:E.bootSeed,entityCount:E.entityCount,scene:s.scene,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,wallet:r.wallet,roomState:s.room,enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.maxHp,p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),skills:s.skills.map(k=>k&&k.id),boss:r.boss,ui:E.runUi().screen,hud:E.hud.combat(),banner:E.hud.banner().text,threat:${threat},toggles:s.toggles,vfx:${vfxCounts}}`));

const files = {};

// ---------- 1. camp boot (plain URL, no input; evals only READ state) ----------
files['certA1-camp'] = [
  snap('camp'),
  ev(iife(`const c=E.cmd('campState');return {tag:'campState',tick:E.tick,mode:c.mode,propTypes:c.propTypes,campPropTypesCount:(c.campPropTypes||[]).length,campPropTypes:c.campPropTypes,emitters:c.emitters,emitterKinds:c.emitterKinds,lights:c.lights,propShadows:c.propShadows,fireflies:c.fireflies,embers:c.embers,gateMotes:c.gateMotes,vignette:c.vignette,exposure:c.exposure,grass:c.grass,flowers:c.flowers,treeline:c.treeline,colliders:c.colliders,roadViolations:c.roadViolations,seats:c.seats,seatDrift:c.seatDrift,player:c.player,inPortal:c.inPortal,promptVisible:c.promptVisible,critters:c.prompt&&c.prompt.critters,overlaps:c.prompt&&c.prompt.overlaps,rigs:c.party&&c.party.rigs,bookends:c.bookends}`)),
  ev(iife(`const s=E.state();return {tag:'vfx',tick:E.tick,fps:E.fps,vfx:s.vfx,toggles:s.toggles}`)),
];

// ---------- 2. Act-1 combat, mid-wave with a LIVE telegraph (>=28 ticks to resolve) ----------
const combatCond = `E.state().enemies.length>=3 && window.__c.ev.some(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&e.resolveTick-E.tick>=28)`;
const combatExtra = `,enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),liveTelegraphs:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).map(e=>({tick:e.tick,resolveTick:e.resolveTick,ticksLeft:e.resolveTick-E.tick,x:e.x,z:e.z,target:e.target,id:e.id,kind:e.kind})),counts:${counts}`;
const combatSetup = [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {startRun:{seed:E.seed,modes:r&&r.frame&&r.frame.modes,room:r&&r.room},tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 400 },
  waitFor(combatCond, 40000, combatExtra),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  key('Digit2', 60),
  wait(120),
];
const combatSummary = (tag) => ev(iife(`const s=E.state();const r=s.run;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,seed:E.seed,bootSeed:E.bootSeed,entityCount:E.entityCount,scene:s.scene,phase:r.phase,room:r.room,mode:r.mode,roomState:s.room,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),liveTelegraphs:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).map(e=>({tick:e.tick,resolveTick:e.resolveTick,ticksLeft:e.resolveTick-E.tick,x:e.x,z:e.z,target:e.target,id:e.id})),allTelegraphs:window.__c.ev.filter(e=>e.T==='telegraph_start').map(e=>[e.tick,e.resolveTick,e.id]),skillBolts:s.skillBolts.map(b=>[b.skill,b.heal,+b.x.toFixed(2),+b.z.toFixed(2)]),azones:s.azones.map(z=>[z.skill,z.radius,z.x,z.z]),zones:s.zones.length,eshots:s.eshots.length,vfx:${vfxCounts},banner:E.hud.banner().text,hud:E.hud.combat(),threat:${threat},party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.maxHp,p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),skills:s.skills.map(k=>k&&[k.id,k.remainingTicks]),eventCounts:${counts},recent:window.__c.ev.filter(e=>['hit','flash','knockback','screenshake','hitstop','death','skill_cast','telegraph_start','telegraph_resolve','enemy_spawn'].includes(e.T)).slice(-30).map(e=>[e.tick,e.T,e.id!==undefined?e.id:'',e.target!==undefined?e.target:'',e.amount!==undefined?e.amount:''])}`));
files['certA1-combat'] = [...combatSetup, combatSummary('combat-frame')];
// seq variant: identical setup, summary at the seq start; frames follow immediately (8 x 150 ms).
files['certA1-combatseq'] = [...combatSetup, combatSummary('combatseq-start')];

// ---------- 3. room-7 shop ----------
files['certA1-shop'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {seed:E.seed,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode,tick:E.tick}`)),
  wait(1800),
  snap('shop'),
  ev(iife(`const u=E.runUi();return JSON.stringify({screen:u.screen,wallet:u.wallet,text:u.text,subline:u.subline,buttons:u.buttons,cards:u.cards,plaques:u.plaques,owned:u.owned,fit:u.fit,doors:u.doors}).slice(0,3500)`)),
  ev(iife(`const s=E.state();return {tag:'shop-pages',tick:E.tick,fps:E.fps,version:E.version,wallet:E.cmd('wallet'),vfx:${vfxCounts},pages:[...document.querySelectorAll('#run-screen .rn-page')].filter(p=>getComputedStyle(p).display!=='none'&&getComputedStyle(p).opacity!=='0').map(p=>p.className),allPages:[...document.querySelectorAll('#run-screen .rn-page')].map(p=>[p.className,getComputedStyle(p).display,getComputedStyle(p).opacity]),cardBoxes:[...document.querySelectorAll('#run-screen .rn-card')].map(c=>{const b=c.getBoundingClientRect();return [(c.querySelector('.rn-card-name,.rn-name,h3,h2')||c).textContent.trim().slice(0,20),Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]}),eventCounts:${counts}}`)),
];

// ---------- 4. boss fight: >=2 quakes started, >=1 adds phase fired, latest quake <=6 ticks old ----------
const bossExtra = `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>({tick:e.tick,resolveTick:e.resolveTick,x:e.x,z:e.z,target:e.target})),quakeResolves:window.__c.ev.filter(e=>e.T==='boss_quake_resolve').map(e=>e.tick),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>({tick:e.tick,pct:e.pct,spawned:e.spawned})),boss:E.cmd('runState').boss,enemies:E.state().enemies.length`;
const bossSetup = (cond) => [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room,boss:r&&r.boss,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 300 },
  waitFor(cond, 40000, bossExtra),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
];
const bossSummary = (tag) => ev(iife(`const s=E.state();const b=E.cmd('runState').boss;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,seed:E.seed,bootSeed:E.bootSeed,entityCount:E.entityCount,scene:s.scene,phase:s.run.phase,room:s.run.room,mode:s.run.mode,boss:b&&{name:b.name,id:b.id,hp:b.hp,maxHp:b.maxHp,pct:b.pct,adds:b.adds,phasesFired:b.phasesFired,quake:b.quake,lunging:b.lunging,x:b.x,z:b.z,active:b.active,cleared:b.cleared},quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>({tick:e.tick,resolveTick:e.resolveTick,x:e.x,z:e.z,target:e.target,ticksLeft:e.resolveTick-E.tick})),quakeResolves:window.__c.ev.filter(e=>e.T==='boss_quake_resolve').map(e=>e.tick),tramples:window.__c.ev.filter(e=>e.T==='boss_trample').map(e=>e.tick),addsEvents:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>({tick:e.tick,pct:e.pct,spawned:e.spawned})),enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),skillBolts:s.skillBolts.length,azones:s.azones.length,zones:s.zones.length,eshots:s.eshots.length,vfx:${vfxCounts},banner:E.hud.banner().text,hud:E.hud.combat(),threat:${threat},party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.maxHp,p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),eventCounts:${counts}}`));
const bossCondMain = `(()=>{const q=window.__c.ev.filter(e=>e.T==='boss_quake_start');const a=window.__c.ev.filter(e=>e.T==='boss_adds');return q.length>=2&&a.length>=1&&E.tick-q[q.length-1].tick<=6})()`;
files['certA1-boss'] = [
  ...bossSetup(bossCondMain),
  wait(150),
  bossSummary('boss-frame'),
];
// seq variant: start the 8-frame burst once a 2nd+ quake is >=10 ticks old and <=24 ticks from
// resolve, so boss_quake_resolve (start+42) falls inside the 8 x 150 ms burst window.
files['certA1-bossseq'] = [
  ...bossSetup(`(()=>{const q=window.__c.ev.filter(e=>e.T==='boss_quake_start');const a=window.__c.ev.filter(e=>e.T==='boss_adds');if(!(q.length>=2&&a.length>=1))return false;const l=q[q.length-1];return E.tick-l.tick>=10&&l.resolveTick-E.tick<=24&&l.resolveTick>E.tick})()`),
  bossSummary('bossseq-start'),
];

// ---------- 5. screenshot-latency proof (NOT a judged frame): a DOM tick overlay is drawn,
// the tick is read before and after each intermediate shot, so the tick baked into the PNG
// bounds how many ticks after the last [EVAL] the harness screenshot actually samples pixels.
files['certA1-latency'] = [
  ev(iife(`const d=document.createElement('div');d.id='certA1-tick';d.style.cssText='position:fixed;left:40px;top:120px;font:bold 72px monospace;color:#fff;background:#000;padding:10px;z-index:99999;pointer-events:none';document.body.appendChild(d);(function f(){d.textContent='T'+E.tick;requestAnimationFrame(f)})();return 'overlay at tick '+E.tick`)),
  wait(300),
  ev(iife(`return {beforeA:E.tick,ms:Math.round(performance.now())}`)),
  { type: 'shot', name: 'certA1-latency-a' },
  ev(iife(`return {afterA:E.tick,ms:Math.round(performance.now())}`)),
  { type: 'shot', name: 'certA1-latency-b' },
  ev(iife(`return {afterB:E.tick,ms:Math.round(performance.now())}`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
