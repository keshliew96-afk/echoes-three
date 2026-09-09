// certA1-player critic — action generator (shop sequence + juice probes). JSON via JSON.stringify only.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 20000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);
const TYPES = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','spawn_telegraph','telegraph_start','telegraph_resolve','enemy_fire','enemy_bite','hit','hit_immune','death','hitstop','sound','heal','skill_cast','ally_cast','ally_basic','dodge','dash','downed','revive','boss_spawn','boss_quake_start','boss_quake_resolve','boss_trample','boss_adds','boss_death','enemy_despawn','shop_buy','currency_denied','zone_spawn','azone_spawn','skill_bolt_spawn','projectile_spawn','flash','knockback','screenshake','flinch','decal','squash','spawn_pop','death_pop','shake','camera_shake','hurt'];
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(TYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t,at:E.tick},e)));return 'armed '+E.tick`));
const counts = (tag) => ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;const s=E.state();return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,counts:m,vfx:{numerals:s.vfx.numerals,decals:s.vfx.decals,particles:s.vfx.particles,arena:s.vfx.arena?{numerals:s.vfx.arena.numerals,decals:s.vfx.arena.decals,particles:s.vfx.arena.particles}:null}}`));
const cardStyle = (tag) => ev(iife(`const cs=[...document.querySelectorAll('#run-screen .rn-card')].map(c=>{const st=getComputedStyle(c);const r=c.getBoundingClientRect();return {cls:c.className,box:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],transform:st.transform,shadow:st.boxShadow.slice(0,80),border:st.borderColor,filter:st.filter,opacity:st.opacity}});const u=E.runUi();return {tag:${JSON.stringify(tag)},tick:E.tick,wallet:u.wallet,owned:u.owned,plaques:u.plaques,cards:cs}`));
const files = {};

// ---- shop sequence: hover, buy x2, denied buy (plaque shake) ----
files['certA1-player-shopseq'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {seed:E.seed,room:r&&r.room,phase:r&&r.phase}`)),
  wait(1800),
  cardStyle('rest'),
  { type: 'mousemove', x: 528, y: 390 }, wait(300),
  shot('certA1-player-shop-hover'), cardStyle('hover-bounce'),
  { type: 'click', x: 528, y: 390 }, wait(60),
  shot('certA1-player-shop-buy0'), cardStyle('buy0'),
  wait(300), shot('certA1-player-shop-buy1'), cardStyle('buy1'),
  { type: 'mousemove', x: 800, y: 390 }, wait(200),
  { type: 'click', x: 800, y: 390 }, wait(200), cardStyle('buy2'),
  { type: 'mousemove', x: 1072, y: 390 }, wait(200),
  { type: 'click', x: 1072, y: 390 }, wait(40),
  shot('certA1-player-shop-deny0'), cardStyle('deny0'),
  wait(120), shot('certA1-player-shop-deny1'), cardStyle('deny1'),
  wait(400), shot('certA1-player-shop-deny2'), cardStyle('deny2'),
  counts('shop-end'),
  ev(iife(`return JSON.stringify(window.__c.ev.filter(e=>['shop_buy','currency_denied','sound'].includes(e.T)).slice(0,20))`)),
];

// ---- combat juice probe: keys dump, hit/death instants, knockback displacement, screenshake payloads ----
const posFn = `const pos=()=>{const s=E.state();const e=s.enemies.find(x=>x.id===id)||s.party.find(x=>x.id===id);return e?[+e.x.toFixed(3),+e.z.toFixed(3),e.hp]:null};`;
files['certA1-player-juice'] = [
  arm,
  ev(iife(`E.cmd('startRun');return {seed:E.seed}`)),
  { type: 'mousemove', x: 500, y: 450 },
  waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp])`),
  ev(iife(`const s=E.state();return {vfxKeys:Object.keys(s.vfx),arenaKeys:s.vfx.arena?Object.keys(s.vfx.arena):null,enemyKeys:s.enemies[0]?Object.keys(s.enemies[0]):null,partyKeys:Object.keys(s.party[0]),stateKeys:Object.keys(s),hudKeys:Object.keys(E.hud),enemy0:s.enemies[0]}`)),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<30000){const k=window.__c.ev.find(e=>e.T==='knockback'||e.T==='hit');if(k){const id=k.id??k.target??k.victim??k.enemy;${posFn}const p0=pos();const tk=E.tick;while(E.tick<tk+6)await new Promise(r=>setTimeout(r,4));const p1=pos();while(E.tick<tk+12)await new Promise(r=>setTimeout(r,4));const p2=pos();return {first:k,id,tick:tk,p0,p6:p1,p12:p2}}await new Promise(r=>setTimeout(r,8));}return {ok:false}})()`),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<30000){const d=window.__c.ev.find(e=>e.T==='death');if(d){const s=E.state();return {death:d,tick:E.tick,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),vfx:{numerals:s.vfx.numerals,decals:s.vfx.decals,particles:s.vfx.particles},arena:s.vfx.arena?{decals:s.vfx.arena.decals,particles:s.vfx.arena.particles}:null}}await new Promise(r=>setTimeout(r,8));}return {ok:false}})()`),
  shot('certA1-player-death0'),
  wait(400),
  shot('certA1-player-death1'),
  ev(iife(`const s=E.state();return {tick:E.tick,vfx:{numerals:s.vfx.numerals,decals:s.vfx.decals,particles:s.vfx.particles},arena:s.vfx.arena?{decals:s.vfx.arena.decals,particles:s.vfx.arena.particles,numerals:s.vfx.arena.numerals}:null,enemies:s.enemies.length}`)),
  wait(2500),
  counts('juice-end'),
  ev(iife(`return JSON.stringify(window.__c.ev.filter(e=>['flash','knockback','screenshake','hitstop','flinch','death','decal','squash','spawn_pop','death_pop','shake','camera_shake'].includes(e.T)).slice(0,40))`)),
  ev(iife(`return JSON.stringify(window.__c.ev.filter(e=>e.T==='hit').slice(0,6))`)),
];

// ---- boss juice: quake impact instant + screenshake/knockback counts ----
files['certA1-player-bossjuice'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room}`)),
  { type: 'mousemove', x: 800, y: 300 },
  { type: 'mousedown', button: 'right' },
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<30000){const q=window.__c.ev.find(e=>e.T==='boss_quake_resolve');if(q)return {quake:q,tick:E.tick,party:E.state().party.map(p=>[p.id,p.hp,+p.x.toFixed(2),+p.z.toFixed(2)])};await new Promise(r=>setTimeout(r,4));}return {ok:false}})()`),
  shot('certA1-player-quake0'),
  wait(250),
  shot('certA1-player-quake1'),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<30000){const d=window.__c.ev.find(e=>e.T==='death');if(d){const s=E.state();return {death:d,tick:E.tick,arena:s.vfx.arena?{decals:s.vfx.arena.decals,particles:s.vfx.arena.particles}:null}}await new Promise(r=>setTimeout(r,8));}return {ok:false}})()`),
  shot('certA1-player-bossdeath0'),
  wait(400),
  shot('certA1-player-bossdeath1'),
  counts('boss-end'),
  ev(iife(`return JSON.stringify(window.__c.ev.filter(e=>['screenshake','knockback','flash','hitstop','flinch','boss_trample','boss_quake_resolve','death','decal'].includes(e.T)).slice(0,40))`)),
];

for (const [name, acts] of Object.entries(files)) { writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); }
