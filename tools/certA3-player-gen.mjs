// certA3-player critic — action-file generator. Writes tools/actions/certA3-player-*.json
// programmatically (never hand-escaped). Same helper shape as tools/cert-gen.mjs.
import { writeFileSync, mkdirSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const ALL_TYPES = ['run_start', 'room_enter', 'room_start', 'room_cleared', 'wave_start', 'enemy_spawn',
  'spawn_telegraph', 'telegraph_start', 'telegraph_resolve', 'enemy_fire', 'enemy_bite', 'hit', 'hit_immune',
  'death', 'hitstop', 'heal', 'skill_cast', 'ally_cast', 'ally_basic', 'dodge', 'dash', 'downed', 'revive',
  'boss_spawn', 'boss_quake_start', 'boss_quake_resolve', 'boss_trample', 'boss_adds', 'boss_death',
  'zone_spawn', 'azone_spawn', 'skill_bolt_spawn', 'projectile_spawn', 'flash', 'knockback', 'screenshake',
  'flinch', 'shop_buy', 'currency_denied'];
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(ALL_TYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));

// Snapshot with SCREEN-SPACE boxes for every enemy and party member, so silhouette
// claims can cite pixel boxes. Uses the same projection helper the technician used
// (state().party[i].screen / state().enemies[i].screen when present).
const snap = (tag) => ev(iife(`const s=E.state();const r=s.run;const px=(o)=>o&&o.screen?[Math.round(o.screen.x),Math.round(o.screen.y),Math.round(o.screen.w||0),Math.round(o.screen.h||0)]:null;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,ver:E.version,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,enemies:s.enemies.map(e=>({id:e.id,kind:e.kind,x:+e.x.toFixed(2),z:+e.z.toFixed(2),hp:e.hp,screen:px(e)})),party:s.party.map(p=>({id:p.id,cls:p.classId,hp:p.hp,max:p.maxHp,down:p.downed,x:+p.x.toFixed(2),z:+p.z.toFixed(2),screen:px(p)})),vfxArena:s.vfx&&s.vfx.arena?s.vfx.arena:null,bolts:s.skillBolts.length,azones:s.azones.length,zones:s.zones.length,banner:E.hud.banner().text,threat:E.hud.threat()}`));

const evCounts = ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;const tail=window.__c.ev.slice(-14).map(e=>[e.tick,e.T,e.id!==undefined?e.id:'',e.amount!==undefined?e.amount:'']);return {tick:E.tick,counts:m,tail:tail}`));

// spawn a readable enemy trio right next to the party so the camera frames them
const spawnNear = ev(iife(`const a=E.cmd('spawn','boar',2.2,0.6);const b=E.cmd('spawn','mantis',-2.4,1.2);const c=E.cmd('spawn','mantis',0.4,-2.6);const s=E.state();return {spawned:[a,b,c].map(x=>x&&x.id!==undefined?x.id:x),enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp])}`));

const files = {};

// ---- P1: combat frame WITH enemies on camera, caught on a fresh hit ----
const combatBody = (tag) => [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,room:r&&r.room,phase:r&&r.phase}`)),
  { type: 'mousemove', x: 800, y: 450 },
  waitFor(`E.state().enemies.length>=3`, 30000, `,enemies:E.state().enemies.length`),
  spawnNear,
  wait(400),
  // wait for a hit within the last 4 ticks so the frame carries a live hit flash
  waitFor(`window.__c.ev.some(e=>e.T==='hit'&&E.tick-e.tick<=4)`, 30000,
    `,hits:window.__c.ev.filter(e=>e.T==='hit').length,lastHit:(window.__c.ev.filter(e=>e.T==='hit').slice(-1)[0]||null),near:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp])`),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  key('Digit2', 60),
  wait(90),
  snap(tag),
  evCounts,
];
files['certA3-player-combat2'] = combatBody('combat2');
files['certA3-player-combat2seq'] = combatBody('combat2seq');

// ---- P2: shop page — hover a card, then probe the page chrome ----
files['certA3-player-shop'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {seed:E.seed,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode}`)),
  wait(1800),
  { type: 'mousemove', x: 800, y: 600 },
  wait(500),
  ev(iife(`const u=E.runUi();const q=(s)=>[...document.querySelectorAll(s)].map(n=>{const b=n.getBoundingClientRect();const cs=getComputedStyle(n);return {cls:n.className,box:[Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)],op:cs.opacity,tf:cs.transform,bs:cs.boxShadow.slice(0,60),bg:cs.backgroundImage.slice(0,60)}});return JSON.stringify({screen:u.screen,wallet:u.wallet,cards:q('#run-screen .rn-card'),plaques:q('#run-screen .rn-plaque,#run-screen .rn-price'),btns:q('#run-screen button')}).slice(0,3000)`)),
  ev(iife(`const s=E.state();return {vfxMode:s.vfx.mode,arena:s.vfx.arena,partyScreen:s.party.map(p=>[p.id,p.classId,p.hp])}`)),
];

mkdirSync('tools/actions', { recursive: true });
for (const [k, v] of Object.entries(files)) {
  writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
  console.log(`wrote tools/actions/${k}.json (${v.length} actions)`);
}
