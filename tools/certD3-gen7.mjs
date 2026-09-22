// Certification block D round 3 — batch 7: D7 leak proxy, fully cmd-driven (no run-screen keyboard).
import { writeFileSync } from 'fs';
import { ev, wait, key, iife, waitFor, arm } from './certD3-gen.mjs';

const inCamp = "(()=>{try{const r=E.cmd('runState');return (!r||!r.active)&&!!E.cmd('campState');}catch(e){return false}})()";

const memSnap = (tag) => ev(iife(`const s=E.state();const v=s.vfx||{};const r=E.cmd('runState');
return {tag:${JSON.stringify(tag)},tick:E.tick,scene:s.scene,vfxMode:v.mode,runActive:!!(r&&r.active),room:r&&r.room,
ents:E.entityCount,enemies:(s.enemies||[]).length,eshots:(s.eshots||[]).length,zones:(s.zones||[]).length,azones:(s.azones||[]).length,bolts:(s.skillBolts||[]).length,
vfx:{numerals:v.numerals,decals:v.decals,particles:v.particles,emitters:v.emitters,propTypes:v.propTypes,propShadows:v.propShadows,grass:v.grass,fireflies:v.fireflies,embers:v.embers,gateMotes:v.gateMotes,lights:v.lights,flowers:v.flowers,runs:v.runs,variantName:v.variantName},
dom:document.querySelectorAll('*').length,numLayer:(document.getElementById('dmg-num-layer')||{children:[]}).children.length,
heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null}`));

// one combat room: let the wave spawn, fight it with real bolts, then jump on
const room = (n) => [
  ev(iife(`const r=E.cmd('skipToRoom',${n});return {jumpTo:${n},room:r&&r.room,mode:r&&r.mode}`)),
  waitFor("E.state().enemies.length>=2", 30000, ",en:E.state().enemies.length,room:(E.cmd('runState')||{}).room"),
  wait(2200),
  ev(iife(`const s=E.state();return {tag:'room${n}-live',room:(E.cmd('runState')||{}).room,ents:E.entityCount,enemies:s.enemies.length,numerals:s.vfx&&s.vfx.numerals,decals:s.vfx&&s.vfx.decals,particles:s.vfx&&s.vfx.particles,variant:s.vfx&&s.vfx.variantName}`)),
  ev(iife("try{E.cmd('killAllEnemies');}catch(e){}return 'killed'")),
  wait(700),
];

const oneRun = (n) => [
  ev(iife(`E.cmd('startRun');const r=E.cmd('runState');return {run:${n},room:r&&r.room,seed:E.seed,active:!!(r&&r.active)}`)),
  wait(800),
  ...room(2), ...room(3), ...room(4), ...room(5), ...room(6),
  ev(iife("const r=E.cmd('skipToRoom',7);return {shopRoom:r&&r.room,mode:r&&r.mode,ui:E.runUi().screen}")),
  wait(1800),
  memSnap(`run${n}-shop`),
  ev(iife("const r=E.cmd('skipToRoom',8);return {bossRoom:r&&r.room,mode:r&&r.mode,boss:r&&r.boss}")),
  waitFor("(()=>{const r=E.cmd('runState');return r&&r.room===8&&r.boss&&r.boss.active&&E.state().enemies.length>=1;})()", 60000, ",room:(E.cmd('runState')||{}).room,en:E.state().enemies.length"),
  wait(2500),
  memSnap(`run${n}-bossLive`),
  { type: 'loop', label: `boss${n}`, maxMs: 60000,
    cond: "(()=>{try{const r=__echoes.cmd('runState');if(!r||!r.active)return true;const u=__echoes.runUi().screen;return u==='victory'||u==='end'||u==='summary'||u==='defeat';}catch(e){return true}})()",
    body: [ev(iife("try{const k=E.cmd('killBoss');if(E.state().enemies.length)E.cmd('killAllEnemies');const r=E.cmd('runState');return {kb:k===null?'null':'ok',bossHp:r&&r.boss&&r.boss.hp,adds:r&&r.boss&&r.boss.adds,en:E.state().enemies.length,screen:E.runUi().screen,cleared:r&&r.boss&&r.boss.cleared};}catch(e){return {err:String(e)}}")), wait(500)] },
  wait(1200),
  ev(iife(`const u=E.runUi();const r=E.cmd('runState');return {tag:'run${n}-endscreen',screen:u.screen,text:(u.text||'').slice(0,90),active:!!(r&&r.active),tick:E.tick}`)),
  key('Enter', 90), wait(1200),
  ev(iife(`return {tag:'run${n}-afterEnter',screen:E.runUi().screen,active:!!(E.cmd('runState')||{}).active}`)),
  { type: 'if', cond: `!(${inCamp.replace(/\bE\./g, '__echoes.')})`, then: [ev(iife("try{E.cmd('returnToCamp');}catch(e){}return 'forced returnToCamp'")), wait(1200)] },
  waitFor(inCamp, 30000, ",active:!!(E.cmd('runState')||{}).active,ui:E.runUi().screen"),
  wait(4500),
  memSnap(`run${n}-camp`),
];

const files = {};
files['certD3-leak2'] = [
  arm, wait(1500), memSnap('baseline-camp'),
  ...oneRun(1),
  ...oneRun(2),
  wait(4000),
  memSnap('final-camp'),
  ev(iife("return {evCounts:window.__c.ev.reduce((m,e)=>(m[e.T]=(m[e.T]||0)+1,m),{}),tick:E.tick,fps:E.fps,dom:document.querySelectorAll('*').length}")),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
