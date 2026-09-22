// shared building blocks for the certB3 full-loop probes
import { ev, wait, key, down, up, shot, click, mm, iife, snap, arm, evDetail, waitFor } from './certB3-gen.mjs';
export { ev, wait, key, down, up, shot, click, mm, iife, snap, arm, evDetail, waitFor };

// --- real-input fight loop body (~1.5 s): aim sweep, held basic, skills, dodge, WASD ---
export const fightBody = [
  mm(830, 340), key('Digit1', 45), wait(60),
  down('KeyA'), wait(140), up('KeyA'),
  mm(1010, 500), key('Digit2', 45), wait(60),
  key('Space', 45), wait(90),
  mm(620, 500), key('Digit3', 45), wait(60),
  down('KeyD'), wait(140), up('KeyD'),
  mm(800, 600), key('Digit4', 45), wait(60),
  mm(800, 430), wait(140),
];

export const uiScreen = `window.__echoes.runUi().screen`;
export const fightLoop = (i, maxMs = 240000) => ({
  type: 'loop', label: `fight-room${i}`, maxMs,
  cond: `(()=>{try{const E=window.__echoes;const r=E.state().run;return E.runUi().screen!=='none'||!r.active||r.room>${i}}catch(e){return false}})()`,
  body: fightBody,
});

export const dumpUi = (tag) => ev(iife(`const u=E.runUi();return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,phase:u.phase,room:u.room,wallet:u.wallet,freeSlots:u.freeSkillSlots,text:(u.text||'').replace(/\s+/g,' ').slice(0,200),buttons:u.buttons,cards:u.cards,doors:u.doors.map(d=>[d.glyphs.join(''),d.box.x,d.box.y,d.box.w,d.box.h]),plaques:u.plaques,skills:E.state().skills.map(k=>k&&k.id),bench:E.state().build.bench}`));

// draft/path/shop handler — real clicks with a real-key fallback
export const screenLoop = (tag, maxMs = 60000) => ({
  type: 'loop', label: `screens-${tag}`, maxMs,
  cond: `(()=>{try{const s=window.__echoes.runUi().screen;return s==='none'||s==='end'}catch(e){return false}})()`,
  body: [
    { type: 'if', cond: `window.__echoes.runUi().screen==='draft'`, then: [
      shot(`certB3-${tag}-draft`), dumpUi(`${tag}-draft`),
      click(800, 413), wait(900),
      { type: 'if', cond: `window.__echoes.runUi().screen==='draft'`, then: [key('Enter', 90), wait(900)] },
      dumpUi(`${tag}-draft-after`) ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='shop'`, then: [
      shot(`certB3-${tag}-shop`), dumpUi(`${tag}-shop`),
      { type: 'if', cond: `(()=>{const E=window.__echoes;return E.runUi().wallet>=25 && !window.__b3.bought})()`, then: [
        click(500, 607), wait(1100),
        ev(iife(`window.__b3.bought=true;const u=E.runUi();return {tag:'shop-after-buy',wallet:u.wallet,owned:u.owned,plaques:u.plaques,bench:E.state().build.bench,ev:window.__b3.ev.filter(e=>e.T==='shop_buy'||e.T==='currency_denied').map(e=>[e.T,e.tick,JSON.stringify(e.d)])}`)),
        shot(`certB3-${tag}-shop-bought`) ] },
      click(800, 769), wait(1100),
      { type: 'if', cond: `window.__echoes.runUi().screen==='shop'`, then: [key('Enter', 90), wait(1100)] },
      dumpUi(`${tag}-shop-after`) ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='path'`, then: [
      shot(`certB3-${tag}-path`), dumpUi(`${tag}-path`),
      click(703, 399), wait(900),
      { type: 'if', cond: `window.__echoes.runUi().screen==='path'`, then: [key('Enter', 90), wait(900)] },
      dumpUi(`${tag}-path-after`) ] },
    { type: 'if', cond: `!['draft','shop','path','none','end'].includes(window.__echoes.runUi().screen)`, then: [
      shot(`certB3-${tag}-other`), dumpUi(`${tag}-other`), key('Enter', 90), wait(900) ] },
    wait(400),
  ],
});

// walk the healer to the portal and press E — B1 flow, reused by every run
export const portalStart = (tag) => [
  mm(800, 450),
  ev(iife(`const c=E.cmd('campState');return {tag:${JSON.stringify(tag)},player:c.player,portal:c.portal,promptVisible:c.promptVisible,inPortal:c.inPortal,seedBefore:E.seed}`)),
  { type: 'loop', label: `walk-${tag}`, maxMs: 30000,
    cond: `(()=>{try{return !!window.__echoes.cmd('campState').promptVisible}catch(e){return false}})()`,
    body: [down('KeyW'), wait(400), up('KeyW'), wait(60)] },
  { type: 'if', cond: `(()=>{try{return !window.__echoes.cmd('campState').promptVisible}catch(e){return true}})()`,
    then: [down('KeyD'), wait(400), up('KeyD'), wait(100),
      { type: 'loop', label: `walk2-${tag}`, maxMs: 15000,
        cond: `(()=>{try{return !!window.__echoes.cmd('campState').promptVisible}catch(e){return false}})()`,
        body: [down('KeyW'), wait(400), up('KeyW'), wait(60)] }] },
  wait(300),
  ev(iife(`const c=E.cmd('campState');const p=document.querySelector('#camp-prompt,.camp-prompt,[data-prompt]');const cs=p?getComputedStyle(p):null;const r=p?p.getBoundingClientRect():null;return {tag:${JSON.stringify(tag)}+'-atPortal',player:c.player,inPortal:c.inPortal,promptVisible:c.promptVisible,dom:cs?{display:cs.display,text:(p.textContent||'').trim(),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}:null}`)),
  shot(`certB3-${tag}-prompt`),
  key('KeyE', 120),
  waitFor(`(()=>{const r=window.__echoes.state().run;return r.active&&r.room>=1})()`, 30000,
    `,room:E.state().run.room,seedAfter:E.seed,phase:E.state().run.phase`),
];
