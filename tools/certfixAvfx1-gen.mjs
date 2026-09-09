// A-vfx fix-builder action generator (creature read / VFX layering / grounding / motion juice).
// Mirrors tools/certA1-gen.mjs frame conditions exactly (seed 4242 via --url), prefix certfixAvfx1-.
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
const vfxCounts = `(v=>{const a=v.arena||{};return {mode:v.mode,emitters:v.emitters,propTypes:v.propTypes,propShadows:v.propShadows,arena:{numerals:a.numerals,decals:a.decals,particles:a.particles,scorch:a.scorch,trails:a.trails,shake:a.shake,propTypes:a.propTypes,propShadows:a.propShadows,emitters:a.emitters}}})(s.vfx||{})`;

const files = {};

// ---------- camp boot (regression duty) ----------
files['certfixAvfx1-camp'] = [
  ev(iife(`const s=E.state();return {tag:'camp',tick:E.tick,fps:E.fps,version:E.version,scene:s.scene,vfx:s.vfx}`)),
];

// ---------- combat: mid-wave, >=3 enemies, live telegraph >=28 ticks to resolve ----------
const combatCond = `E.state().enemies.length>=3 && window.__c.ev.some(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&e.resolveTick-E.tick>=28)`;
const combatExtra = `,enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp])`;
const combatSetup = [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {startRun:{seed:E.seed,room:r&&r.room},tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 400 },
  waitFor(combatCond, 40000, combatExtra),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  key('Digit2', 60),
  wait(120),
];
const combatSummary = (tag) => ev(iife(`const s=E.state();const r=s.run;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,seed:E.seed,scene:s.scene,phase:r.phase,room:r.room,mode:r.mode,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),liveTelegraphs:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).map(e=>({tick:e.tick,resolveTick:e.resolveTick,ticksLeft:e.resolveTick-E.tick,x:e.x,z:e.z})),skillBolts:s.skillBolts.map(b=>[b.skill,b.heal,+b.x.toFixed(2),+b.z.toFixed(2)]),eshots:s.eshots.length,vfx:${vfxCounts},party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,+p.x.toFixed(2),+p.z.toFixed(2)]),eventCounts:${counts},recent:window.__c.ev.filter(e=>['hit','flash','knockback','screenshake','hitstop','death'].includes(e.T)).slice(-24).map(e=>[e.tick,e.T,e.id!==undefined?e.id:'',e.amount!==undefined?e.amount:''])}`));
files['certfixAvfx1-combat'] = [...combatSetup, combatSummary('combat-frame')];
files['certfixAvfx1-combatseq'] = [...combatSetup, combatSummary('combatseq-start')];

// ---------- boss: >=2 quakes, >=1 adds phase, latest quake <=6 ticks old ----------
const bossExtra = `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').length,adds:window.__c.ev.filter(e=>e.T==='boss_adds').length`;
const bossSetup = (cond) => [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 300 },
  waitFor(cond, 40000, bossExtra),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
];
const bossSummary = (tag) => ev(iife(`const s=E.state();const b=E.cmd('runState').boss;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,seed:E.seed,scene:s.scene,boss:b&&{hp:b.hp,maxHp:b.maxHp,pct:b.pct,adds:b.adds,phasesFired:b.phasesFired,quake:b.quake,x:b.x,z:b.z},quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>({tick:e.tick,resolveTick:e.resolveTick,ticksLeft:e.resolveTick-E.tick})),enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),vfx:${vfxCounts},party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,+p.x.toFixed(2),+p.z.toFixed(2)]),eventCounts:${counts},recent:window.__c.ev.filter(e=>['hit','flash','knockback','screenshake','hitstop','death','boss_trample'].includes(e.T)).slice(-24).map(e=>[e.tick,e.T,e.id!==undefined?e.id:'',e.amount!==undefined?e.amount:''])}`));
const bossCondMain = `(()=>{const q=window.__c.ev.filter(e=>e.T==='boss_quake_start');const a=window.__c.ev.filter(e=>e.T==='boss_adds');return q.length>=2&&a.length>=1&&E.tick-q[q.length-1].tick<=6})()`;
files['certfixAvfx1-boss'] = [...bossSetup(bossCondMain), wait(150), bossSummary('boss-frame')];
files['certfixAvfx1-bossseq'] = [
  ...bossSetup(`(()=>{const q=window.__c.ev.filter(e=>e.T==='boss_quake_start');const a=window.__c.ev.filter(e=>e.T==='boss_adds');if(!(q.length>=2&&a.length>=1))return false;const l=q[q.length-1];return E.tick-l.tick>=10&&l.resolveTick-E.tick<=24&&l.resolveTick>E.tick})()`),
  bossSummary('bossseq-start'),
];

// ---------- creature-read probe: one mantis + one boar beside a parked party ----------
files['certfixAvfx1-creature'] = [
  arm,
  ev(iife(`E.cmd('startRun');return {tick:E.tick}`)),
  wait(900),
  ev(iife(`E.cmd('killAllEnemies');E.cmd('teleport',0,0);return {tick:E.tick,enemies:E.state().enemies.length}`)),
  wait(500),
  ev(iife(`E.cmd('killAllEnemies');E.cmd('teleport',6.5,4.6);return {tick:E.tick,player:E.state().party[0]}`)),
  wait(400),
  ev(iife(`E.cmd('teleport',6.5,4.6);E.cmd('spawn','mantis',7.9,4.3);E.cmd('spawn','boar',5.0,4.3);return {tick:E.tick,enemies:E.state().enemies.map(e=>[e.kind,+e.x.toFixed(2),+e.z.toFixed(2)]),party:E.state().party.map(p=>[p.id,+p.x.toFixed(2),+p.z.toFixed(2)])}`)),
  wait(320),
  ev(iife(`const s=E.state();return {tag:'creature',tick:E.tick,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),party:s.party.map(p=>[p.id,+p.x.toFixed(2),+p.z.toFixed(2)]),vfx:${vfxCounts}}`)),
];

// ---------- knockback probe: sample one enemy's position every render frame ----------
files['certfixAvfx1-kb'] = [
  arm,
  ev(iife(`E.cmd('startRun');return {tick:E.tick}`)),
  wait(900),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();
    while(performance.now()-t0<30000&&E.state().enemies.length<1)await new Promise(r=>setTimeout(r,10));
    const tgt=E.state().enemies[0];if(!tgt)return {ok:false};
    const rows=[];const shakes=[];E.on('screenshake',e=>shakes.push({tick:e.tick,cause:e.cause,amp:e.amp}));
    const kbs=[];E.on('hit',e=>{if(e.target===tgt.id)kbs.push({tick:e.tick,kb:e.kb,dirX:e.dirX,dirZ:e.dirZ})});
    for(let i=0;i<260;i++){const e=E.state().enemies.find(x=>x.id===tgt.id);if(!e)break;rows.push([E.tick,+e.x.toFixed(3),+e.z.toFixed(3)]);await new Promise(r=>setTimeout(r,16));}
    let best=0,bestWin=null;
    for(let i=0;i<rows.length;i++){for(let j=i+1;j<rows.length&&rows[j][0]-rows[i][0]<=14;j++){const d=Math.hypot(rows[j][1]-rows[i][1],rows[j][2]-rows[i][2]);if(d>best){best=d;bestWin=[rows[i],rows[j]]}}}
    return {ok:true,id:tgt.id,samples:rows.length,hits:kbs.length,kbEvents:kbs.slice(0,8),maxTravel14t:+best.toFixed(3),window:bestWin,shakes:shakes.length,shakeKinds:shakes.slice(0,8),vfx:E.state().vfx}})()`),
];

// ---------- screenshake probe: camera position sampled around a kill ----------
files['certfixAvfx1-shake'] = [
  arm,
  ev(iife(`E.cmd('startRun');return {tick:E.tick}`)),
  wait(900),
  ev(`(async()=>{const E=__echoes;const cams=[];const shakes=[];
    E.on('screenshake',e=>shakes.push({tick:e.tick,cause:e.cause,amp:e.amp,durationSec:e.durationSec}));
    const t0=performance.now();
    while(performance.now()-t0<26000){const v=E.state().vfx.arena;cams.push([E.tick,v.cam[0],v.cam[1],v.shake]);if(shakes.length>=3&&performance.now()-t0>9000)break;await new Promise(r=>setTimeout(r,10));}
    // Camera jitter WHILE a shake is live vs the same-length quiet stretch.
    const hot=cams.filter(c=>c[3]>0);const cold=cams.filter(c=>c[3]===0);
    const dev=(rows)=>{if(rows.length<3)return 0;let mx=0,mz=0;for(const r of rows){mx+=r[1];mz+=r[2]}mx/=rows.length;mz/=rows.length;
      let d=0;for(const r of rows)d=Math.max(d,Math.hypot(r[1]-mx,r[2]-mz));return +d.toFixed(4)};
    let jump=0;for(let i=1;i<cams.length;i++){if(cams[i][3]>0||cams[i-1][3]>0){const d=Math.hypot(cams[i][1]-cams[i-1][1],cams[i][2]-cams[i-1][2]);if(d>jump)jump=d}}
    return {shakes:shakes.length,shakeList:shakes.slice(0,10),camSamples:cams.length,hotSamples:hot.length,maxStepDuringShake:+jump.toFixed(4),vfx:E.state().vfx}})()`),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
