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
    `page:u&&u.screen,draft:u&&u.draft,settled:u&&u.settled,socket:__echoes.content&&__echoes.content.socketUi?__echoes.content.socketUi():null}`
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

// PARTY page: the four cards, switching by keyboard (E, F4, Q), mouse (a tab
// click) and the probe state; Suggested = one Enter commits.
{
  const pstate = ev(
    `const s=__echoes.state();const r=s.run;const u=__echoes.runUi&&__echoes.runUi();` +
      `return {phase:r&&r.phase,room:r&&r.room,mode:r&&r.party&&r.party.mode,cards:r&&r.party&&r.party.cards.map(c=>[c.seat,c.type,c.id,c.swap,c.decided,c.choice,c.replace]),draft:u&&u.draft,settle:u&&u.settleInMs}`
  );
  const page = [
    loop('room1', `(()=>{const r=${RUN};return r&&r.phase==='combat'&&r.room===1})()`, [wait(150)], 20000),
    loop('clear1', `(()=>{const r=${RUN};return r&&r.phase==='reward'})()`, [ev(`__echoes.cmd('killAllEnemies');return 1`), wait(400)], 40000),
    wait(1100),
    pstate,
    shot('gntPARTY-page-healer'),
    key('e'),
    wait(250),
    pstate,
    shot('gntPARTY-page-tank'),
    key('F4'),
    wait(250),
    pstate,
    shot('gntPARTY-page-archer'),
    key('q'),
    wait(250),
    pstate,
    ev(`const t=document.querySelector('.rn-draft .rn-ptab[data-seat="0"]');t.dispatchEvent(new MouseEvent('click',{bubbles:true}));return 1`),
    wait(250),
    pstate,
    key('Enter'),
    wait(700),
    pstate,
  ];
  writeFileSync('tools/actions/gntPARTY-page.json', JSON.stringify(page, null, 1));
}
console.log('wrote gntPARTY-page.json');

// Socket screen: the Tank's tab, a header reorder, Auto-fill all.
{
  const sstate = ev(`const d=__echoes.content&&__echoes.content.socketUi&&__echoes.content.socketUi();const P=__echoes.cmd('partyState');return {open:d&&d.open,viewSeat:d&&d.viewSeat,rows:d&&d.rows,rowSeats:d&&d.rowSeats,headerInHand:d&&d.headerInHand,focus:d&&d.focus,tabs:d&&d.tabs,slots:P.seats.map(s=>s.slots),filled:P.seats.map(s=>s.filled),bench:P.seats.map(s=>s.bench.length)}`);
  const sock = [
    loop('room1', `(()=>{const r=${RUN};return r&&r.phase==='combat'&&r.room===1})()`, [wait(150)], 20000),
    ev(`['sharpen','quicken','echo'].forEach(n=>__echoes.cmd('partyGrantNode',1,n,'drafted'));return 1`),
    loop('clear1', `(()=>{const r=${RUN};return r&&r.phase==='reward'})()`, [ev(`__echoes.cmd('killAllEnemies');return 1`), wait(400)], 40000),
    wait(1100),
    key('x'),
    wait(700),
    key('b'),
    wait(400),
    key('e'),
    wait(300),
    sstate,
    shot('gntPARTY-socket-tank'),
    key('ArrowRight'),
    key('Tab'),
    wait(100),
    // Reorder: header of row 1 (←← from the cells), pick up, down, swap.
    ev(`return 1`),
    key('Digit1'),
    ...Array.from({ length: 9 }, () => key('ArrowLeft', 40)),
    wait(150),
    sstate,
    key('Enter'),
    wait(200),
    key('ArrowDown'),
    wait(150),
    key('Enter'),
    wait(300),
    sstate,
    key('F', 120),
    wait(300),
    sstate,
    shot('gntPARTY-socket-tank2'),
  ];
  writeFileSync('tools/actions/gntPARTY-socket.json', JSON.stringify(sock, null, 1));
}
console.log('wrote gntPARTY-socket.json');

// Shop: every tab viewed by real keys, then Advance — the Suggested marks
// still buy (the review fix); a mark toggled by a click is not bought.
{
  const shopState = ev(`const s=__echoes.state();const r=s.run;const u=__echoes.runUi&&__echoes.runUi();const P=__echoes.cmd('partyState');return {phase:r&&r.phase,room:r&&r.room,wallet:r&&r.wallet,ps:r&&r.partyShop&&r.partyShop.shelves.slice(1).map(x=>({purse:x.purse,stock:x.stock.map(c=>c.node+(c.marked?'*':'')+(c.sold?'$':''))})),purses:P.seats.map(q=>q.purse),bench:P.seats.map(q=>q.bench.length+q.filled),shop:u&&u.shop}`);
  const shopA = [
    loop('room1', `(()=>{const r=${RUN};return r&&r.phase==='combat'&&r.room===1})()`, [wait(150)], 20000),
    ev(`__echoes.cmd('skipToRoom',7);return __echoes.state().run.phase`),
    wait(1200),
    shopState,
    shot('gntPARTY-shop-healer'),
    key('e'),
    wait(300),
    shot('gntPARTY-shop-tank'),
    ev(`const r=__echoes.runUi();return r&&r.screen`),
    key('e'),
    wait(300),
    key('e'),
    wait(300),
    // On the Archer's tab: un-mark its first marked card by a click on the ribbon.
    ev(`const b=[...document.querySelectorAll('.rn-shop .rn-suggest.rn-on')][0];if(!b)return null;const idx=b.dataset.idx;b.dispatchEvent(new MouseEvent('click',{bubbles:true}));return idx`),
    wait(300),
    shopState,
    shot('gntPARTY-shop-archer'),
    key('e'),
    wait(300),
    key('Enter'),
    wait(800),
    shopState,
  ];
  writeFileSync('tools/actions/gntPARTY-shop.json', JSON.stringify(shopA, null, 1));
}
console.log('wrote gntPARTY-shop.json');

// Browser save round trip with four max-stress builds, then on the party page.
{
  const rt = ev(`const r=__echoes.save.roundTrip({ticks:300});return {equal:r.equal,cont:r.continuationEqual,first:r.firstDivergence||null,phase:__echoes.state().run.phase}`);
  const save = [
    loop('room1', `(()=>{const r=${RUN};return r&&r.phase==='combat'&&r.room===1})()`, [wait(150)], 20000),
    wait(1500),
    rt,
    loop('clear1', `(()=>{const r=${RUN};return r&&r.phase==='reward'})()`, [ev(`__echoes.cmd('killAllEnemies');return 1`), wait(400)], 40000),
    wait(600),
    rt,
    ev(`return {builds:__echoes.cmd('partyState').seats.map(s=>s.filled+'/'+s.sockets)}`),
  ];
  writeFileSync('tools/actions/gntPARTY-save.json', JSON.stringify(save, null, 1));
}
console.log('wrote gntPARTY-save.json');
