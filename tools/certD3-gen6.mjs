// Certification block D round 3 — batch 6: D7 leak proxy (two full cmd-driven runs in one page session).
import { writeFileSync } from 'fs';
import { ev, wait, key, iife, waitFor, arm } from './certD3-gen.mjs';

// NOTE: E.state().scene reports "camp" even during an active run (proved in
// captures/certD3-lay-combat-1024.console.txt), so every wait below keys off
// runState.active + campState instead of scene.
const inCamp = "(()=>{try{const r=E.cmd('runState');return (!r||!r.active)&&!!E.cmd('campState');}catch(e){return false}})()";

const memSnap = (tag) => ev(iife(`const s=E.state();const v=s.vfx||{};const r=E.cmd('runState');
return {tag:${JSON.stringify(tag)},tick:E.tick,scene:s.scene,vfxMode:v.mode,runActive:!!(r&&r.active),room:r&&r.room,
ents:E.entityCount,enemies:(s.enemies||[]).length,eshots:(s.eshots||[]).length,zones:(s.zones||[]).length,azones:(s.azones||[]).length,bolts:(s.skillBolts||[]).length,
vfx:{numerals:v.numerals,decals:v.decals,particles:v.particles,emitters:v.emitters,propTypes:v.propTypes,propShadows:v.propShadows,grass:v.grass,fireflies:v.fireflies,embers:v.embers,gateMotes:v.gateMotes,lights:v.lights,flowers:v.flowers,runs:v.runs},
dom:document.querySelectorAll('*').length,numLayer:(document.getElementById('dmg-num-layer')||{children:[]}).children.length,
heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null}`));

const advanceRooms = {
  type: 'loop', label: 'rooms', maxMs: 150000,
  cond: "(()=>{try{const r=__echoes.cmd('runState');return !r||!r.active||r.room>=7;}catch(e){return true}})()",
  body: [
    ev(iife("try{if(E.state().enemies.length)E.cmd('killAllEnemies');}catch(e){}const r=E.cmd('runState');const u=E.runUi();return {room:r&&r.room,phase:r&&r.phase,screen:u.screen,en:E.state().enemies.length}")),
    wait(260), key('Enter', 60), wait(260), key('Enter', 60), wait(200),
  ],
};

const oneRun = (n) => [
  ev(iife(`E.cmd('startRun');const r=E.cmd('runState');return {run:${n},room:r&&r.room,seed:E.seed,active:r&&r.active}`)),
  wait(600),
  advanceRooms,
  memSnap(`run${n}-atShop`),
  ev(iife("try{E.cmd('shopAdvance');}catch(e){}const r=E.cmd('runState');return {room:r&&r.room,phase:r&&r.phase}")),
  waitFor("(()=>{const r=E.cmd('runState');return r&&r.room===8&&E.state().enemies.length>=1;})()", 60000, ",room:(E.cmd('runState')||{}).room,en:E.state().enemies.length,screen:E.runUi().screen"),
  wait(1500),
  memSnap(`run${n}-boss`),
  { type: 'loop', label: `boss${n}`, maxMs: 60000,
    cond: "(()=>{try{const r=__echoes.cmd('runState');if(!r||!r.active)return true;if(r.room!==8)return true;return __echoes.runUi().screen!=='none'&&__echoes.runUi().screen!=='socket';}catch(e){return true}})()",
    body: [ev(iife("try{const k=E.cmd('killBoss');if(E.state().enemies.length)E.cmd('killAllEnemies');const r=E.cmd('runState');return {kb:k===null?'null':'ok',boss:r&&r.boss&&[r.boss.hp,r.boss.adds],en:E.state().enemies.length,screen:E.runUi().screen};}catch(e){return {err:String(e)}}")), wait(450)] },
  wait(1200),
  ev(iife(`const u=E.runUi();const r=E.cmd('runState');return {tag:'run${n}-endscreen',screen:u.screen,text:u.text,buttons:u.buttons,active:r&&r.active,tick:E.tick}`)),
  key('Enter', 80), wait(900),
  ev(iife(`const u=E.runUi();return {tag:'run${n}-afterEnter',screen:u.screen,active:!!(E.cmd('runState')||{}).active}`)),
  { type: 'if', cond: `!(${inCamp.replace(/E\./g, '__echoes.')})`, then: [ev(iife("try{E.cmd('returnToCamp');}catch(e){}return 'forced returnToCamp'")), wait(900)] },
  waitFor(inCamp, 30000, ",active:!!(E.cmd('runState')||{}).active,ui:E.runUi().screen"),
  wait(4000),
  memSnap(`run${n}-camp`),
];

const files = {};
files['certD3-leak'] = [
  arm, wait(1500), memSnap('baseline-camp'),
  ...oneRun(1),
  ...oneRun(2),
  wait(3000),
  memSnap('final-camp'),
  ev(iife("return {evCounts:window.__c.ev.reduce((m,e)=>(m[e.T]=(m[e.T]||0)+1,m),{}),tick:E.tick,fps:E.fps,dom:document.querySelectorAll('*').length}")),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
