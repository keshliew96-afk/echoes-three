import { ev, wait, key, down, up, shot, click, mm, iife, snap, evDetail, waitFor,
         arm2, portalStart, SOCK_OPEN } from './certB3-parts2.mjs';
import { write } from './certB3-gen.mjs';

const walkLeg = (tag, ms = 2000) => [
  mm(800, 450),
  ev(iife(`window.__w={t:E.tick,p:Object.assign({},E.cmd('campState').player)};return {tag:'${tag}-start',p:window.__w.p,tick:E.tick}`)),
  down('KeyW'), wait(ms), up('KeyW'), wait(250),
  ev(iife(`const p=E.cmd('campState').player;const d=Math.hypot(p.x-__w.p.x,p.z-__w.p.z);const dt=(E.tick-__w.t)/60;return {tag:'${tag}-leg',from:__w.p,to:{x:+p.x.toFixed(2),z:+p.z.toFixed(2)},moved:+d.toFixed(2),seconds:+dt.toFixed(2),uPerSec:+(d/dt).toFixed(2),healerDowned:E.state().party[0].downed,healerHp:Math.round(E.state().party[0].hp)}`)),
];

const campDump = (tag) => ev(iife(`const s=E.state();const c=E.cmd('campState');const hc=(()=>{try{return E.hud.combat()}catch(e){return 'ERR'}})();
return {tag:${JSON.stringify(tag)},tick:E.tick,campMode:c.mode,runs:c.runs,runActive:s.run.active,phase:s.run.phase,
party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed]),
enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,
banner:E.hud.banner().text,threat:E.hud.threat().markersDrawn,
hudCombat:JSON.stringify(hc).slice(0,900)}`));

write('certB3-defeat2', [
  wait(1200), arm2,
  campDump('fresh-camp'),
  ...walkLeg('fresh', 1600),
  ev(iife(`E.cmd('teleport',1.35,1);return 'reset to gate road'`)), wait(600),
  // ---- run 1: natural wipe (enemies land the killing blows; setHp only hastens) ----
  ...portalStart('d2'),
  wait(4000),
  ev(iife(`const r=E.state().party.map(p=>{E.cmd('setHp',p.id,0.02);return p.id});return {hastened:r,partyAfter:E.state().party.map(p=>[p.id,Math.round(p.hp),p.maxHp,!!p.downed]),enemies:E.state().enemies.length}`)),
  shot('certB3-defeat2-lowhp'),
  waitFor(`(()=>{const u=window.__echoes.runUi();return u.screen==='end'||u.phase==='defeat'})()`, 90000,
    `,screen:E.runUi().screen,phase:E.runUi().phase,party:E.state().party.map(p=>[p.id,Math.round(p.hp),!!p.downed]),killers:window.__b3.ev.filter(e=>e.T==='downed'||e.T==='defeat'||e.T==='run_wiped'||e.T==='run_end').map(e=>e.T+'@'+e.tick)`),
  wait(1400), shot('certB3-defeat2-defeatscreen'),
  ev(iife(`const u=E.runUi();return {tag:'defeat-screen',tick:E.tick,screen:u.screen,phase:u.phase,text:(u.text||'').replace(/\\s+/g,' ').slice(0,240),buttons:u.buttons,events:window.__b3.ev.map(e=>e.T+'@'+e.tick)}`)),
  click(800, 532), wait(1700),
  { type: 'if', cond: `window.__echoes.runUi().screen==='end'`, then: [key('Enter', 100), wait(1800)] },
  waitFor(`(()=>{try{return window.__echoes.cmd('campState').mode==='camp'&&!window.__echoes.state().run.active}catch(e){return false}})()`, 30000, `,runs:E.cmd('campState').runs`),
  wait(1600),
  shot('certB3-defeat2-camp'),
  campDump('camp-after-natural-defeat'),
  ev(iife(`const rings=[...document.querySelectorAll('#hud *,#hud-threat *')].filter(n=>/revive|channel|prompt/i.test(n.className||'')).map(n=>{const r=n.getBoundingClientRect();return [n.className,(n.textContent||'').trim().slice(0,8),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),getComputedStyle(n).display]});
return {tag:'camp-revive-dom',count:rings.length,rings:rings.slice(0,14)}`)),
  ...walkLeg('after-defeat', 1600),
  wait(6000),
  campDump('camp-after-defeat-plus6s'),
  evDetail('defeat2-events'),
]);
