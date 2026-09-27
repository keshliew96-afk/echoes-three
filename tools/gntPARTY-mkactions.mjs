#!/usr/bin/env node
// PARTY: writes the tools/actions/gntPARTY-*.json action files for
// tools/cert-capture.mjs (programmatic, so every eval is a returning IIFE).
//   node tools/gntPARTY-mkactions.mjs
import { writeFileSync } from 'node:fs';

const ev = (code) => ({ type: 'eval', code: `(()=>{${code}})()` });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 90) => ({ type: 'key', key: k, ms });
const shot = (name) => ({ type: 'shot', name });
const loop = (label, cond, body, maxMs = 30000) => ({ type: 'loop', label, cond, maxMs, body });

const RUN = '__echoes.state().run';
const state = ev(
  `const s=__echoes.state();const r=s.run;const u=__echoes.runUi&&__echoes.runUi();` +
    `return {v:__echoes.version,tick:__echoes.tick,phase:r&&r.phase,room:r&&r.room,reward:r&&r.reward,skills:(s.skills||[]).map(x=>x&&x.id),` +
    `bench:(s.build&&s.build.bench||[]).map(b=>b.node),rows:(s.build&&s.build.skills||[]).map(k=>k.id+':'+k.filled),` +
    `page:u&&u.screen,draft:u&&u.draft,settled:u&&u.settled,socket:__echoes.socketUi?__echoes.socketUi():null}`
);

// Ruling A17 — the Healer's SWAP offer by real input (keyboard + wheel + click).
// ?run=1&menu=0&seed=7 boots straight into room 1 (a skill room); two skills
// are given so the Healer holds 4, a node is socketed on the slot the offer
// will replace, then W/S move the Replaces mark and Enter takes it.
const swap = [
  loop('room1', `(()=>{const r=${RUN};return r&&r.phase==='combat'&&r.room===1})()`, [wait(150)], 20000),
  ev(`__echoes.cmd('giveSkill','bell_toll');__echoes.cmd('giveSkill','pale_lance');__echoes.cmd('grantNode','sharpen');__echoes.cmd('grantNode','echo');return (__echoes.state().skills||[]).map(x=>x&&x.id)`),
  loop('clear1', `(()=>{const r=${RUN};return r&&r.phase==='reward'})()`, [ev(`__echoes.cmd('killAllEnemies');return 1`), wait(400)], 40000),
  ev(`return [__echoes.cmd('socket','pale_lance','sharpen'),__echoes.cmd('socket','pale_lance','echo'),__echoes.cmd('socket','bell_toll','sharpen')]`),
  wait(900),
  state,
  shot('gntPARTY-swap-open'),
  key('s'),
  wait(250),
  state,
  key('ArrowUp'),
  wait(250),
  key('w'),
  wait(250),
  state,
  shot('gntPARTY-swap-moved'),
  // Put the mark on slot 4 (Pale Lance, 2 nodes) with a click on its tile.
  ev(`const t=document.querySelector('.rn-rep[data-slot="3"]');if(!t)return null;const b=t.getBoundingClientRect();window.__gntTile={x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};return window.__gntTile`),
  { type: 'eval', code: `(()=>{const t=document.querySelector('.rn-rep[data-slot="3"]');t.dispatchEvent(new MouseEvent('click',{bubbles:true}));return __echoes.state().run.reward.replace})()` },
  wait(200),
  state,
  // Focus Take (A) then Enter.
  key('a'),
  wait(150),
  key('Enter'),
  wait(700),
  state,
  shot('gntPARTY-swap-taken'),
];
writeFileSync('tools/actions/gntPARTY-swap.json', JSON.stringify(swap, null, 1));

// Leave keeps the loadout byte-identical.
const leave = [
  loop('room1', `(()=>{const r=${RUN};return r&&r.phase==='combat'&&r.room===1})()`, [wait(150)], 20000),
  ev(`__echoes.cmd('giveSkill','bell_toll');__echoes.cmd('giveSkill','pale_lance');return 1`),
  loop('clear1', `(()=>{const r=${RUN};return r&&r.phase==='reward'})()`, [ev(`__echoes.cmd('killAllEnemies');return 1`), wait(400)], 40000),
  wait(900),
  ev(`window.__gntBefore=JSON.stringify([__echoes.state().skills.map(x=>x&&x.id),__echoes.state().build]);return __echoes.state().run.reward`),
  key('x'),
  wait(600),
  ev(`const after=JSON.stringify([__echoes.state().skills.map(x=>x&&x.id),__echoes.state().build]);return {phase:__echoes.state().run.phase,same:after===window.__gntBefore,skills:__echoes.state().skills.map(x=>x&&x.id)}`),
  shot('gntPARTY-swap-leave'),
];
writeFileSync('tools/actions/gntPARTY-swapleave.json', JSON.stringify(leave, null, 1));
console.log('wrote gntPARTY-swap.json, gntPARTY-swapleave.json');
