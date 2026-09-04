// Certification critic — action-file generator (batch 1: frames + camp + recon).
// Writes tools/actions/cert-*.json programmatically (never hand-escaped JSON).
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
// Async wait: polls every 8 ms until cond (JS expr using E) is true or timeout.
const waitFor = (cond, timeout = 20000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const ALL_TYPES = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','spawn_telegraph',
  'telegraph_start','telegraph_resolve','enemy_fire','enemy_bite','hit','hit_immune','death','hitstop','sound','heal',
  'skill_cast','ally_cast','ally_basic','dodge','dash','run_end','run_wiped','return_to_camp','downed','revive',
  'boss_spawn','boss_quake_start','boss_quake_resolve','boss_trample','boss_adds','boss_death','enemy_despawn',
  'reward','draft','draft_taken','path_chosen','shop_buy','currency_denied','skill_equip','node_granted','zone_spawn',
  'azone_spawn','skill_bolt_spawn','projectile_spawn','flash','knockback','screenshake','flinch','director_stop','mark','defeat','victory'];
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(ALL_TYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));
const dumpEv = (from = 0, n = 80) => ev(iife(`return JSON.stringify(window.__c.ev.slice(${from},${from + n}))`));
const counts = ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {tick:E.tick,fps:E.fps,counts:m}`));
const snap = (tag) => ev(iife(`const s=E.state();const r=s.run;return {tag:${JSON.stringify(tag)},tick:E.tick,seed:E.seed,scene:s.scene,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,wallet:r.wallet,freeSlots:r.freeSkillSlots,roomState:s.room,enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.maxHp,p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),skills:s.skills.map(k=>k&&k.id),bench:s.build.bench,boss:r.boss,ui:E.runUi().screen,hud:E.hud.combat(),banner:E.hud.banner().text,threat:(({gated,offFrame,markersDrawn,domMarkers,uncued})=>({gated,offFrame,markersDrawn,domMarkers,uncued}))(E.hud.threat())}`));

const files = {};

// ---------- A1: camp boot (no actions; captured separately with settle) ----------
files['cert-camp-boot'] = [snap('camp-boot'), ev(iife(`const c=E.cmd('campState');return {propTypes:c.propTypes,campPropTypes:c.campPropTypes,emitters:c.emitters,emitterKinds:c.emitterKinds,propShadows:c.propShadows,fireflies:c.fireflies,embers:c.embers,vignette:c.vignette,colliders:c.colliders,roadViolations:c.roadViolations,seats:c.seats,seatDrift:c.seatDrift,critters:c.prompt.critters,toggles:E.state().toggles,verLabel:(document.querySelector('#version,.version,[data-version]')||{}).textContent}`))];

// ---------- A2: Act-1 combat frame, mid-wave with telegraph live ----------
files['cert-combat'] = [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,modes:r.frame.modes,room:r.room}`)),
  { type: 'mousemove', x: 500, y: 450 },
  // wait for >=3 enemies alive and a fresh telegraph (>=30 ticks left)
  waitFor(`E.state().enemies.length>=3 && window.__c.ev.some(e=>e.T==='telegraph_start'&&e.resolveTick-E.tick>=28&&e.resolveTick>E.tick)`, 40000,
    `,enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),tele:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).map(e=>[e.tick,e.resolveTick,e.x,e.z,e.target])`),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  key('Digit2', 60),
  wait(120),
  snap('combat-frame'),
  ev(iife(`const s=E.state();return {bolts:s.skillBolts.map(b=>[b.skill,b.heal,+b.x.toFixed(2),+b.z.toFixed(2)]),eshots:s.eshots,azones:s.azones.map(z=>[z.skill,z.radius]),zones:s.zones,vfx:{numerals:s.vfx.numerals,decals:s.vfx.decals,particles:s.vfx.particles,emitters:s.vfx.emitters,propTypes:s.vfx.propTypes,propShadows:s.vfx.propShadows,grass:s.vfx.grass,variantName:s.vfx.variantName},party:s.party.map(p=>[p.id,p.hp,p.dashTicksLeft])}`)),
];

// ---------- A3: room-7 shop ----------
files['cert-shop'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {seed:E.seed,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode}`)),
  wait(1800),
  snap('shop'),
  ev(iife(`const u=E.runUi();return JSON.stringify({screen:u.screen,text:u.text,subline:u.subline,wallet:u.wallet,buttons:u.buttons,cards:u.cards,plaques:u.plaques,owned:u.owned,fit:u.fit}).slice(0,3000)`)),
  ev(iife(`const s=E.state();return {vfx:{numerals:s.vfx.numerals,decals:s.vfx.decals,emitters:s.vfx.emitters,propTypes:s.vfx.propTypes,propShadows:s.vfx.propShadows,variantName:s.vfx.variantName},pages:[...document.querySelectorAll('#run-screen .rn-page')].filter(p=>getComputedStyle(p).display!=='none').map(p=>p.className)}`)),
];

// ---------- A4: boss fight mid-quake (2nd+ quake, adds live) ----------
files['cert-boss-quake'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room,boss:r&&r.boss}`)),
  { type: 'mousemove', x: 800, y: 300 },
  waitFor(`(()=>{const q=window.__c.ev.filter(e=>e.T==='boss_quake_start');const a=window.__c.ev.filter(e=>e.T==='boss_adds');return q.length>=2&&a.length>=1&&E.tick-q[q.length-1].tick<=6})()`, 40000,
    `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>[e.tick,e.resolveTick,e.x,e.z,e.target]),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>[e.tick,e.pct,e.spawned]),boss:E.cmd('runState').boss`),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  wait(150),
  snap('boss-quake'),
  ev(iife(`const s=E.state();return {enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),bolts:s.skillBolts.length,eshots:s.eshots.length,azones:s.azones.length,vfx:{numerals:s.vfx.numerals,decals:s.vfx.decals,particles:s.vfx.particles,emitters:s.vfx.emitters,propTypes:s.vfx.propTypes,propShadows:s.vfx.propShadows,variantName:s.vfx.variantName},boss:E.cmd('runState').boss,bossfx:window.__arenaProbe&&window.__arenaProbe.stage?Object.keys(window.__arenaProbe):null}`)),
];

// ---------- recon: reward / path / shop screens (cmd-driven, NOT the certified loop) ----------
files['cert-recon-screens'] = [
  arm,
  ev(iife(`E.cmd('startRun');return E.seed`)),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();let kills=0;while(performance.now()-t0<60000){const u=E.runUi();if(u.screen!=='none')return {ok:true,screen:u.screen,tick:E.tick,kills};if(E.state().enemies.length>0){E.cmd('killAllEnemies');kills++;}await new Promise(r=>setTimeout(r,250));}return {ok:false}})()`),
  wait(600),
  ev(iife(`return JSON.stringify(E.runUi()).slice(0,2500)`)),
  ev(iife(`return {keys:[...document.querySelectorAll('#run-screen button, #run-screen .rn-card, #run-screen .rn-door, #run-screen [tabindex]')].map(n=>[n.className,(n.textContent||'').trim().slice(0,40)]).slice(0,20)}`)),
  key('Enter', 80),
  wait(600),
  ev(iife(`const u=E.runUi();return JSON.stringify({screen:u.screen,text:u.text,subline:u.subline,doors:u.doors,buttons:u.buttons,cards:u.cards.length,held:u.held,stale:u.stale,phase:u.phase,room:u.room}).slice(0,2500)`)),
  key('Enter', 80),
  wait(600),
  ev(iife(`const u=E.runUi();return JSON.stringify({screen:u.screen,text:u.text,doors:u.doors,buttons:u.buttons,phase:u.phase,room:u.room,skills:E.state().skills.map(k=>k&&k.id)}).slice(0,2000)`)),
  counts,
  dumpEv(0, 60),
];

// ---------- E: camp roads (real WASD) ----------
const leg = (name, x, z, k, ms) => [
  ev(iife(`E.cmd('teleport',${x},${z});return 'tp ${name}'`)), wait(400), { type: 'mousemove', x: 800, y: 200 },
  ev(iife(`window.__w={t0:E.tick,p0:E.cmd('campState').player};return __w`)),
  down(k), wait(ms), up(k), wait(200),
  ev(iife(`const p=E.cmd('campState').player;const d=Math.hypot(p.x-__w.p0.x,p.z-__w.p0.z);return {leg:'${name}',p0:__w.p0,p1:p,ticks:E.tick-__w.t0,moved:+d.toFixed(2),uPerSec:+(d/((E.tick-__w.t0)/60)).toFixed(2)}`)),
];
files['cert-camp-roads'] = [
  ...leg('westRoad', -4.0, 1.3, 'KeyA', 2200),
  ...leg('westRoadFar', -7.0, 2.2, 'KeyA', 2200),
  ...leg('gateRoadSouth', 0.3, 1.6, 'KeyS', 2500),
  ...leg('eastRoad', 2.6, 0.3, 'KeyD', 2500),
  ...leg('eastRoadFar', 6.0, -0.4, 'KeyD', 2200),
  ...leg('gateRoadNorth', 1.35, 1.0, 'KeyW', 2700),
  ev(iife(`const c=E.cmd('campState');return {inPortal:c.inPortal,promptVisible:c.promptVisible,prompt:c.prompt.box,player:c.player}`)),
];
files['cert-camp-anvil'] = [
  ...leg('toSmithyW', -4.0, 1.3, 'KeyA', 700),
  ...leg('toAnvilS', -5.5, 1.9, 'KeyS', 1500),
  ev(iife(`const p=E.cmd('campState').player;return {anvil:[-5.5,3.7],player:p,distToAnvil:+Math.hypot(p.x+5.5,p.z-3.7).toFixed(2)}`)),
];
files['cert-camp-stops'] = [
  ...leg('hearth', 0.0, 1.9, 'KeyW', 1500),
  ev(iife(`const p=E.cmd('campState').player;return {hearthDist:+Math.hypot(p.x-0,p.z+0.2).toFixed(2)}`)),
  ...leg('tent1', -4.95, -1.5, 'KeyW', 1200),
  ev(iife(`const p=E.cmd('campState').player;return {tent1Dist:+Math.hypot(p.x+4.95,p.z+3.35).toFixed(2)}`)),
  ...leg('tent3', -7.5, 1.6, 'KeyW', 1200),
  ev(iife(`const p=E.cmd('campState').player;return {tent3Dist:+Math.hypot(p.x+7.5,p.z+0.3).toFixed(2)}`)),
  ...leg('stall', 6.35, 0.5, 'KeyS', 1500),
  ev(iife(`const p=E.cmd('campState').player;return {stallDist:+Math.hypot(p.x-6.35,p.z-2.5).toFixed(2)}`)),
  ...leg('cart', 8.35, 0.3, 'KeyW', 1500),
  ev(iife(`const p=E.cmd('campState').player;return {cartDist:+Math.hypot(p.x-8.35,p.z+1.95).toFixed(2)}`)),
];
files['cert-camp-seats'] = [
  ev(iife(`const c=E.cmd('campState');return {t:E.tick,seatDrift:c.seatDrift,rigs:c.party.rigs}`)),
  wait(5000),
  ev(iife(`const c=E.cmd('campState');return {t:E.tick,seatDrift:c.seatDrift,rigs:c.party.rigs}`)),
  { type: 'mousemove', x: 800, y: 200 },
  down('KeyW'), wait(2700), up('KeyW'), wait(300),
  ev(iife(`const c=E.cmd('campState');return {t:E.tick,seatDrift:c.seatDrift,rigs:c.party.rigs,inPortal:c.inPortal,promptVisible:c.promptVisible,player:c.player}`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
