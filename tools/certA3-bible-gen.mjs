// Art-bible critic (round 3) — action-file generator. Writes tools/actions/certA3-bible-*.json
// programmatically (never hand-escaped). Every eval is IIFE-wrapped; every wait-for-condition
// is an async poll at 8 ms that RETURNS its observed state so the proof lands in console.txt.
import { writeFileSync, mkdirSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 40000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const TYPES = ['enemy_spawn', 'death', 'hit', 'wave_start', 'room_cleared', 'knockback', 'flash', 'screenshake', 'hitstop', 'telegraph_start', 'telegraph_resolve'];
const arm = ev(iife(`window.__b={ev:[]};for(const t of ${JSON.stringify(TYPES)})E.on(t,e=>window.__b.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));
const arena = `(()=>{const s=__echoes.state();return s.vfx&&s.vfx.arena?s.vfx.arena:null})()`;

const files = {};

// ---- decal probe: does a KILL leave a persistent ground decal? (REFERENCE_BAR check 5) ----
files['certA3-bible-decals'] = [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,room:r&&r.room}`)),
  { type: 'mousemove', x: 800, y: 450 },
  waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp])`),
  ev(iife(`const s=E.state();const a=s.vfx.arena||{};return {tag:'BEFORE-KILL',tick:E.tick,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2)]),decals:a.decals,scorch:a.scorch,numerals:a.numerals,particles:a.particles}`)),
  ev(iife(`E.cmd('killAllEnemies');return {tag:'KILLED',tick:E.tick}`)),
  wait(1400),
  ev(iife(`const s=E.state();const a=s.vfx.arena||{};return {tag:'AFTER-KILL+1400ms',tick:E.tick,deaths:window.__b.ev.filter(e=>e.T==='death').length,deathAt:window.__b.ev.filter(e=>e.T==='death').map(e=>[e.tick,e.id,e.kind,e.x,e.z]),enemies:s.enemies.length,decals:a.decals,scorch:a.scorch,numerals:a.numerals,particles:a.particles}`)),
  wait(2600),
  ev(iife(`const s=E.state();const a=s.vfx.arena||{};return {tag:'AFTER-KILL+4000ms',tick:E.tick,enemies:s.enemies.length,decals:a.decals,scorch:a.scorch,numerals:a.numerals,particles:a.particles,phase:s.run.phase,ui:E.runUi().screen}`)),
];

mkdirSync('tools/actions', { recursive: true });
for (const [name, acts] of Object.entries(files)) {
  const p = `tools/actions/${name}.json`;
  writeFileSync(p, JSON.stringify(acts, null, 2));
  console.log(`wrote ${p} (${acts.length} actions)`);
}
