// certfixB4 (fix builder B, round 4) — shared building blocks. Everything here
// writes captures/actions prefixed `certfixB4-`; the fight/screen loops are the
// critic's certB3 parts2 blocks verbatim (same strafing pattern) so the full run
// reproduces the certification conditions, plus keydown instrumentation that
// records WHEN every key lands relative to the meta page that is on screen.
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('tools/actions', { recursive: true });

export const ev = (code) => ({ type: 'eval', code });
export const wait = (ms) => ({ type: 'wait', ms });
export const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
export const down = (k) => ({ type: 'keydown', key: k });
export const up = (k) => ({ type: 'keyup', key: k });
export const shot = (name) => ({ type: 'shot', name });
export const click = (x, y, button = 'left') => ({ type: 'click', x, y, button });
export const mm = (x, y) => ({ type: 'mousemove', x, y });
export const iife = (body) => `(()=>{const E=window.__echoes;${body}})()`;
export const waitFor = (cond, timeout = 20000, extra = '') =>
  ev(`(async()=>{const E=window.__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){try{if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};}catch(err){return {ok:false,err:String(err)};}await new Promise(r=>setTimeout(r,8));}return {ok:false,timeout:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}}})()`);
export const write = (name, acts) => {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length, 'actions');
};

export const SOCK_OPEN = `(()=>{const n=document.getElementById('socket-screen');return !!n&&n.classList.contains('nd-open')})()`;

export const ALL = ['run_start','room_enter','room_start','room_cleared','reward_offer','draft_taken','draft_declined','path_offer','path_chosen',
  'currency_denied','shop_purchase','boss_spawn','defeat','run_end','run_wiped','return_to_camp','wave_start','downed','revive','director_stop','node_granted','skill_equip'];
export const COUNTED = ['dash','skill_cast','hit','heal','ally_basic','ally_cast','death','enemy_spawn','boss_adds','boss_quake_start','mark'];

// arm: event log + screen-transition poll (8 ms) + keydown log (capture phase,
// so it still fires when the run UI consumes the key). Every keydown records
// the page on screen and the ms since that page opened (from the poll).
export const arm = ev(iife(`window.__f={ev:[],n:{},keys:[],scr:[],mk:E.tick,lastScr:'none',lastScrAt:performance.now()};
const F=window.__f;
for(const t of ${JSON.stringify(ALL)})E.on(t,e=>F.ev.push({T:t,tick:(e&&e.tick!=null)?e.tick:E.tick,d:(()=>{const o={};for(const k of Object.keys(e||{}))if(['room','index','id','reward','result','wallet','side','seed','mode','slot','bench','nextRoom'].includes(k))o[k]=e[k];return o})()}));
for(const t of ${JSON.stringify(COUNTED)})E.on(t,()=>{F.n[t]=(F.n[t]||0)+1});
F.iv=setInterval(()=>{try{const s=E.runUi().screen;if(s!==F.lastScr){const now=performance.now();F.scr.push({s,tick:E.tick,t:Math.round(now)});F.lastScr=s;F.lastScrAt=now;}}catch(_){}},8);
window.addEventListener('keydown',e=>{F.keys.push({c:e.code,r:e.repeat,scr:F.lastScr,ms:Math.round(performance.now()-F.lastScrAt),tick:E.tick})},true);
return 'armed tick '+E.tick+' v'+E.version`));

// Focus snapshot: only VISIBLE buttons/doors (the hidden pages keep their own
// rn-focus classes, which is why the critic's list showed "Advance to" and
// "Return to" on a draft page).
export const focus = (tag) => ev(iife(`const F=window.__f;const u=E.runUi();
const btns=[...document.querySelectorAll('#run-screen .rn-btn')].filter(b=>b.offsetParent!==null).map(b=>[b.className.replace('rn-btn ','').trim(),(b.textContent||'').replace(/\\s+/g,' ').trim().slice(0,10)]);
const doors=[...document.querySelectorAll('#run-screen .rn-doorwrap')].filter(w=>w.offsetParent!==null).map(w=>w.querySelector('.rn-door').classList.contains('rn-focus'));
const so=${SOCK_OPEN};
return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,socketOpen:so,msSinceScreen:Math.round(performance.now()-F.lastScrAt),uiSinceOpen:u.sinceOpenMs,settled:u.settled,settleIn:u.settleInMs,carryMs:u.carryMs,graceMs:u.graceMs,
 focused:btns.filter(a=>/rn-focus/.test(a[0])).map(a=>a[1]),buttons:btns,doorFocus:doors,held:u.held,stale:u.stale,
 skills:E.state().skills.map(k=>k&&k.id),freeSlots:u.freeSkillSlots,takes:F.ev.filter(e=>e.T==='draft_taken').length,declines:F.ev.filter(e=>e.T==='draft_declined').length,paths:F.ev.filter(e=>e.T==='path_chosen').map(e=>e.d.side),
 keysOnThisScreen:F.keys.filter(k=>k.scr===u.screen&&k.tick>=F.mk).map(k=>k.c+'@'+k.ms)}`));

export const mark = ev(iife(`window.__f.mk=E.tick;return 'mark '+E.tick`));
// Clear the live room with killAllEnemies (diagnostic only) and wait for its room_cleared.
export const clearRoom = (label) => [
  mark,
  { type: 'loop', label, maxMs: 60000,
    cond: `window.__f.ev.some(e=>e.T==='room_cleared'&&e.tick>=window.__f.mk)`,
    body: [ev(iife(`if(E.state().enemies.length>0)E.cmd('killAllEnemies');return E.state().enemies.length`)), wait(200)] },
  // the draft page opens on the next animation frame after the clear
  waitFor(`window.__echoes.runUi().screen==='draft'`, 5000, `,screen:E.runUi().screen`),
];
export const escSocket = { type: 'if', cond: SOCK_OPEN, then: [key('Escape', 80), wait(700)] };
export const doPath = { type: 'if', cond: `window.__echoes.runUi().screen==='path'`, then: [wait(400), click(703, 399), wait(1400)] };
export const events = (tag) => ev(iife(`return {tag:${JSON.stringify(tag)},ev:window.__f.ev.map(e=>e.T+'@'+e.tick+(Object.keys(e.d).length?JSON.stringify(e.d):'')),keys:window.__f.keys.length,screens:window.__f.scr.length}`));

// --------------------------------------------------- full-run blocks --
// ~0.9 s of real input; the critic's certB3 parts2 body VERBATIM (Space first,
// A tap, D tap, four skill keys, aim sweeps).
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

export const dumpUi = (tag) => ev(iife(`const u=E.runUi();const so=${SOCK_OPEN};const F=window.__f;
const btns=[...document.querySelectorAll('#run-screen .rn-btn')].filter(b=>b.offsetParent!==null);
return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,socketOpen:so,phase:u.phase,room:u.room,wallet:u.wallet,freeSlots:u.freeSkillSlots,open:u.open,held:u.held,stale:u.stale,uiSinceOpen:u.sinceOpenMs,settled:u.settled,
 focused:btns.filter(b=>b.classList.contains('rn-focus')).map(b=>(b.textContent||'').trim().slice(0,10)),
 keysSinceOpen:F.keys.filter(k=>k.scr===u.screen&&k.tick>=(F.scr.length?F.scr[F.scr.length-1].tick:0)).map(k=>k.c+'@'+k.ms),
 text:(u.text||'').replace(/\\s+/g,' ').slice(0,120),doors:u.doors.map(d=>[d.glyphs.join(''),d.focused,d.box.x,d.box.y]),skills:E.state().skills.map(k=>k&&k.id),bench:E.state().build.bench}`));

// draft/path/shop/socket handler — the critic's b2b handler (card click, then Enter).
export const screenLoop = (tag, maxMs = 90000) => ({
  type: 'loop', label: `screens-${tag}`, maxMs,
  cond: `(()=>{try{const s=window.__echoes.runUi().screen;const so=${SOCK_OPEN};return (s==='end'&&!so)||(s==='none'&&!so)}catch(e){return false}})()`,
  body: [
    { type: 'if', cond: SOCK_OPEN, then: [
      dumpUi(`${tag}-socket`), key('Escape', 100), wait(1000),
      ev(iife(`return {tag:'${tag}-socketClosed',open:${SOCK_OPEN},screen:E.runUi().screen}`)) ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='draft'&&!${SOCK_OPEN}`, then: [
      shot(`certfixB4-${tag}-draft`), dumpUi(`${tag}-draft`),
      click(800, 400), wait(900),
      { type: 'if', cond: `window.__echoes.runUi().screen==='draft'&&!${SOCK_OPEN}`, then: [key('Enter', 90), wait(900)] },
      dumpUi(`${tag}-draft-after`) ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='shop'&&!${SOCK_OPEN}`, then: [
      dumpUi(`${tag}-shop`),
      { type: 'if', cond: `(()=>{const E=window.__echoes;return E.runUi().wallet>=25&&!window.__f.bought})()`, then: [
        click(500, 607), wait(1200),
        ev(iife(`window.__f.bought=true;const u=E.runUi();return {tag:'${tag}-shopBuy',wallet:u.wallet,owned:u.owned,bench:E.state().build.bench}`)) ] },
      click(800, 769), wait(1200),
      { type: 'if', cond: `window.__echoes.runUi().screen==='shop'&&!${SOCK_OPEN}`, then: [key('Enter', 90), wait(1200)] },
      dumpUi(`${tag}-shop-after`) ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='path'&&!${SOCK_OPEN}`, then: [
      dumpUi(`${tag}-path`),
      click(703, 399), wait(1000),
      { type: 'if', cond: `window.__echoes.runUi().screen==='path'&&!${SOCK_OPEN}`, then: [key('Enter', 90), wait(1000)] },
      { type: 'if', cond: `window.__echoes.runUi().screen==='path'&&!${SOCK_OPEN}`, then: [key('ArrowRight', 90), wait(300), key('Enter', 90), wait(1000)] },
      dumpUi(`${tag}-path-after`) ] },
    wait(400),
  ],
});

export const portalStart = (tag) => [
  mm(800, 450),
  { type: 'loop', label: `walk-${tag}`, maxMs: 30000,
    cond: `(()=>{try{return !!window.__echoes.cmd('campState').promptVisible}catch(e){return false}})()`,
    body: [down('KeyW'), wait(400), up('KeyW'), wait(60)] },
  { type: 'if', cond: `(()=>{try{return !window.__echoes.cmd('campState').promptVisible}catch(e){return true}})()`,
    then: [down('KeyD'), wait(400), up('KeyD'), wait(100),
      { type: 'loop', label: `walk2-${tag}`, maxMs: 15000,
        cond: `(()=>{try{return !!window.__echoes.cmd('campState').promptVisible}catch(e){return false}})()`,
        body: [down('KeyW'), wait(400), up('KeyW'), wait(60)] }] },
  wait(300),
  ev(iife(`const c=E.cmd('campState');return {tag:${JSON.stringify(tag)}+'-atPortal',tick:E.tick,player:c.player,inPortal:c.inPortal,promptVisible:c.promptVisible}`)),
  key('KeyE', 120),
  waitFor(`(()=>{const r=window.__echoes.state().run;return r.active&&r.room>=1})()`, 30000,
    `,room:E.state().run.room,seedAfter:E.seed,phase:E.state().run.phase`),
];

export const campBack = (tag) => [
  waitFor(`(()=>{try{return window.__echoes.cmd('campState').mode==='camp'&&!window.__echoes.state().run.active}catch(e){return false}})()`, 30000,
    `,scene:E.state().scene`),
  wait(1500), shot(`certfixB4-${tag}-backcamp`),
  ev(iife(`const c=E.cmd('campState');const s=E.state();const b=E.hud.banner();return {tag:${JSON.stringify(tag)}+'-camp',tick:E.tick,campMode:c.mode,party:s.party.map(p=>[p.id,Math.round(p.hp),p.maxHp,!!p.downed]),enemies:s.enemies.length,bannerText:b.text,skills:s.skills.map(k=>k&&k.id),bench:s.build.bench,wallet:s.run.wallet,runActive:s.run.active,socketOpen:${SOCK_OPEN},runScreenOpen:E.runUi().screen}`)),
];
