// socket-aware building blocks (certB3 round 3, attempt 2)
import { ev, wait, key, down, up, shot, click, mm, iife, snap, evDetail, waitFor } from './certB3-gen.mjs';
export { ev, wait, key, down, up, shot, click, mm, iife, snap, evDetail, waitFor };

export const SOCK_OPEN = `(()=>{const n=document.getElementById('socket-screen');return !!n&&n.classList.contains('nd-open')})()`;

export const ALL2 = ['run_start','room_enter','room_start','room_cleared','reward','draft','draft_taken','path_chosen',
  'shop_buy','currency_denied','boss_spawn','boss_death','victory','defeat','run_end','run_wiped','return_to_camp',
  'wave_start','downed','revive','director_stop','node_granted','skill_equip'];
export const COUNTED = ['dash','skill_cast','hit','heal','ally_basic','ally_cast','death','enemy_spawn','boss_adds','boss_quake_start','mark'];
export const arm2 = ev(iife(`window.__b3={ev:[],n:{},t0:E.tick};
for(const t of ${JSON.stringify(ALL2)})E.on(t,e=>window.__b3.ev.push({T:t,tick:(e&&e.tick!=null)?e.tick:E.tick,d:(()=>{const o={};for(const k of Object.keys(e||{}))if(['room','index','pct','spawned','id','kind','reason','result','wallet','item','node','skill','side','seed','mode','type'].includes(k))o[k]=e[k];return o})()}));
for(const t of ${JSON.stringify(COUNTED)})E.on(t,()=>{window.__b3.n[t]=(window.__b3.n[t]||0)+1});
return 'armed t'+E.tick`));

// ~0.9 s of real input; Space (dodge) fires first so a room clearing mid-body cannot commit a screen with it
export const fightBody = [
  key('Space', 45), mm(830, 340), key('Digit1', 45),
  down('KeyA'), wait(120), up('KeyA'),
  mm(1010, 500), key('Digit2', 45),
  mm(620, 500), key('Digit3', 45),
  down('KeyD'), wait(120), up('KeyD'),
  mm(800, 600), key('Digit4', 45),
  mm(800, 430), wait(100),
];
export const fightLoop = (i, maxMs = 240000) => ({
  type: 'loop', label: `fight-room${i}`, maxMs,
  cond: `(()=>{try{const E=window.__echoes;const r=E.state().run;return E.runUi().screen!=='none'||!r.active||r.room>${i}||${SOCK_OPEN}}catch(e){return false}})()`,
  body: fightBody,
});

export const dumpUi = (tag) => ev(iife(`const u=E.runUi();const so=${SOCK_OPEN};return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,socketOpen:so,phase:u.phase,room:u.room,wallet:u.wallet,freeSlots:u.freeSkillSlots,open:u.open,held:u.held,stale:u.stale,text:(u.text||'').replace(/\\s+/g,' ').slice(0,170),buttons:u.buttons,cards:u.cards,doors:u.doors.map(d=>[d.glyphs.join(''),d.focused,d.box.x,d.box.y]),plaques:u.plaques,skills:E.state().skills.map(k=>k&&k.id),bench:E.state().build.bench}`));

export const screenLoop = (tag, maxMs = 90000) => ({
  type: 'loop', label: `screens-${tag}`, maxMs,
  cond: `(()=>{try{const s=window.__echoes.runUi().screen;const so=${SOCK_OPEN};return (s==='end'&&!so)||(s==='none'&&!so)}catch(e){return false}})()`,
  body: [
    { type: 'if', cond: SOCK_OPEN, then: [
      shot(`certB3-${tag}-socket`), dumpUi(`${tag}-socket`),
      ev(iife(`const b=E.state().build;return {tag:'${tag}-socketBench',bench:b.bench,skills:b.skills.map(s=>[s.id,s.caps,s.sockets])}`)),
      key('Escape', 100), wait(1000),
      ev(iife(`return {tag:'${tag}-socketClosed',open:${SOCK_OPEN},screen:E.runUi().screen}`)) ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='draft'&&!${SOCK_OPEN}`, then: [
      shot(`certB3-${tag}-draft`), dumpUi(`${tag}-draft`),
      click(800, 400), wait(900),
      { type: 'if', cond: `window.__echoes.runUi().screen==='draft'&&!${SOCK_OPEN}`, then: [key('Enter', 90), wait(900)] },
      dumpUi(`${tag}-draft-after`) ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='shop'&&!${SOCK_OPEN}`, then: [
      shot(`certB3-${tag}-shop`), dumpUi(`${tag}-shop`),
      { type: 'if', cond: `(()=>{const E=window.__echoes;return E.runUi().wallet>=25&&!window.__b3.bought})()`, then: [
        click(500, 607), wait(1200),
        ev(iife(`window.__b3.bought=true;const u=E.runUi();return {tag:'${tag}-shopBuy',wallet:u.wallet,owned:u.owned,plaques:u.plaques,bench:E.state().build.bench,ev:window.__b3.ev.filter(e=>e.T==='shop_buy'||e.T==='currency_denied').map(e=>[e.T,e.tick,JSON.stringify(e.d)])}`)),
        shot(`certB3-${tag}-shop-bought`) ] },
      click(800, 769), wait(1200),
      { type: 'if', cond: `window.__echoes.runUi().screen==='shop'&&!${SOCK_OPEN}`, then: [key('Enter', 90), wait(1200)] },
      dumpUi(`${tag}-shop-after`) ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='path'&&!${SOCK_OPEN}`, then: [
      shot(`certB3-${tag}-path`), dumpUi(`${tag}-path`),
      click(703, 399), wait(1000),
      { type: 'if', cond: `window.__echoes.runUi().screen==='path'&&!${SOCK_OPEN}`, then: [key('Enter', 90), wait(1000)] },
      { type: 'if', cond: `window.__echoes.runUi().screen==='path'&&!${SOCK_OPEN}`, then: [key('ArrowRight', 90), wait(300), key('Enter', 90), wait(1000)] },
      dumpUi(`${tag}-path-after`) ] },
    wait(400),
  ],
});

export const portalStart = (tag) => [
  mm(800, 450),
  ev(iife(`const c=E.cmd('campState');return {tag:${JSON.stringify(tag)}+'-preportal',player:c.player,portal:c.portal,promptVisible:c.promptVisible,inPortal:c.inPortal,seedBefore:E.seed,runs:c.runs}`)),
  { type: 'loop', label: `walk-${tag}`, maxMs: 30000,
    cond: `(()=>{try{return !!window.__echoes.cmd('campState').promptVisible}catch(e){return false}})()`,
    body: [down('KeyW'), wait(400), up('KeyW'), wait(60)] },
  { type: 'if', cond: `(()=>{try{return !window.__echoes.cmd('campState').promptVisible}catch(e){return true}})()`,
    then: [down('KeyD'), wait(400), up('KeyD'), wait(100),
      { type: 'loop', label: `walk2-${tag}`, maxMs: 15000,
        cond: `(()=>{try{return !!window.__echoes.cmd('campState').promptVisible}catch(e){return false}})()`,
        body: [down('KeyW'), wait(400), up('KeyW'), wait(60)] }] },
  wait(300),
  ev(iife(`const c=E.cmd('campState');const p=document.getElementById('camp-prompt');const cs=p?getComputedStyle(p):null;const r=p?p.getBoundingClientRect():null;return {tag:${JSON.stringify(tag)}+'-atPortal',tick:E.tick,player:c.player,inPortal:c.inPortal,promptVisible:c.promptVisible,dom:cs?{display:cs.display,opacity:cs.opacity,text:(p.textContent||'').trim(),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}:null}`)),
  shot(`certB3-${tag}-prompt`),
  key('KeyE', 120),
  waitFor(`(()=>{const r=window.__echoes.state().run;return r.active&&r.room>=1})()`, 30000,
    `,room:E.state().run.room,seedAfter:E.seed,phase:E.state().run.phase`),
];

export const campBack = (tag) => [
  waitFor(`(()=>{try{return window.__echoes.cmd('campState').mode==='camp'&&!window.__echoes.state().run.active}catch(e){return false}})()`, 30000,
    `,campRuns:E.cmd('campState').runs,scene:E.state().scene`),
  wait(1500), shot(`certB3-${tag}-backcamp`),
  ev(iife(`const c=E.cmd('campState');const s=E.state();const b=E.hud.banner();const t=E.hud.threat();return {tag:${JSON.stringify(tag)}+'-camp',tick:E.tick,campMode:c.mode,runs:c.runs,player:c.player,seats:c.seats,seatDrift:c.seatDrift,rigs:c.party.rigs,party:s.party.map(p=>[p.id,Math.round(p.hp),p.maxHp,!!p.downed]),enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,projectiles:s.projectiles?s.projectiles.length:null,numerals:s.vfx&&s.vfx.numerals,domNumerals:document.querySelectorAll('#dmg-num-layer > *').length,bannerVisible:b.visible,bannerText:b.text,threatMarkers:t.markersDrawn,domMarkers:t.domMarkers,skills:s.skills.map(k=>k&&k.id),bench:s.build.bench,wallet:s.run.wallet,runActive:s.run.active,socketOpen:${SOCK_OPEN},runScreenOpen:E.runUi().screen}`)),
];
