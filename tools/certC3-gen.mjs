// Certification C round 3 — action-file generator. Never hand-escape JSON.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });

export const ev = (code) => ({ type: 'eval', code });
export const wait = (ms) => ({ type: 'wait', ms });
export const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
export const down = (k) => ({ type: 'keydown', key: k });
export const up = (k) => ({ type: 'keyup', key: k });
export const shot = (name) => ({ type: 'shot', name });
export const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
export const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const files = {};

// ---------------- RECON ----------------
files['certC3-recon'] = [
  ev(iife(`return {version:E.version,keys:Object.keys(E),tick:E.tick,fps:E.fps,seed:E.seed,bootSeed:E.bootSeed}`)),
  ev(iife(`E.cmd('startRun');return {seed:E.seed,run:JSON.stringify(E.cmd('runState')).slice(0,600)}`)),
  wait(4000),
  ev(iife(`const s=E.state();return {stateKeys:Object.keys(s),party0:s.party[0]?Object.keys(s.party[0]):null,enemy0:s.enemies[0]?Object.keys(s.enemies[0]):null,vfx:s.vfx,toggles:s.toggles}`)),
  ev(iife(`return {probe:window.__arenaProbe?Object.keys(window.__arenaProbe):null,stage:window.__arenaProbe&&window.__arenaProbe.stage?Object.keys(window.__arenaProbe.stage):null}`)),
  ev(iife(`return {threat:E.hud.threat(),combat:JSON.stringify(E.hud.combat()).slice(0,400),banner:E.hud.banner()}`)),
  // exercise a hit + dodge so the ring buffer holds representative event shapes
  ev(iife(`return {hitOnce:JSON.stringify(E.cmd('hitOnce',0)),hp:E.state().party[0].hp}`)),
  down('Space'), wait(120), up('Space'), wait(600),
  ev(iife(`const seen={};for(const e of E.events){seen[e.type]=seen[e.type]||JSON.stringify(e).slice(0,190)}return seen`)),
  ev(iife(`return {events:E.events.slice(-14).map(e=>JSON.stringify(e).slice(0,150))}`)),
  ev(iife(`return {giveHeavy:JSON.stringify(E.cmd('giveSkill','heavy_slam')),skills:E.state().skills.map(k=>k&&k.id)}`)),
  ev(iife(`const c=document.querySelector('canvas');return {canvas:c?[c.width,c.height,c.clientWidth,c.clientHeight]:null,ctxAttrs:c&&c.getContext?'ok':'no',numLayer:!!document.querySelector('#dmg-num-layer')}`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
