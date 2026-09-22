import { ev, wait, key, shot, click, mm, iife, snap, evDetail, waitFor,
         arm2, fightBody, portalStart, SOCK_OPEN } from './certB3-parts2.mjs';
import { write } from './certB3-gen.mjs';

const leak = (tag) => ev(iife(`const s=E.state();const c=(()=>{try{return E.cmd('campState')}catch(e){return null}})();const b=E.hud.banner();const t=E.hud.threat();
const layer=document.getElementById('dmg-num-layer');const kids=layer?[...layer.children]:[];
return {tag:${JSON.stringify(tag)},tick:E.tick,scene:s.scene,campMode:c&&c.mode,runs:c&&c.runs,runActive:s.run.active,phase:s.run.phase,room:s.run.room,wallet:s.run.wallet,
enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,projectiles:s.projectiles?s.projectiles.length:0,
vfxNumerals:s.vfx&&s.vfx.numerals,domNumerals:kids.length,visibleNumerals:kids.filter(n=>{const g=getComputedStyle(n);return g.display!=='none'&&+g.opacity>0.05}).length,
bannerVisible:b.visible,bannerText:b.text,threatMarkers:t.markersDrawn,domMarkers:t.domMarkers,
party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),
seats:c&&c.seats,seatDrift:c&&c.seatDrift,rigs:c&&c.party.rigs.map(r=>[r.classId,+r.x.toFixed(2),+r.z.toFixed(2),r.anim||'-']),
skills:s.skills.map(k=>k&&k.id),bench:s.build.bench,socketOpen:${SOCK_OPEN},uiScreen:E.runUi().screen,evCount:window.__b3.ev.length}`));

const endRects = (tag) => ev(iife(`const n=[...document.querySelectorAll('#run-screen .rn-btn')].map(x=>{const r=x.getBoundingClientRect();return [x.className,(x.textContent||'').replace(/\\s+/g,' ').trim().slice(0,24),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}).filter(a=>a[4]>0);
const u=E.runUi();return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,phase:u.phase,text:(u.text||'').replace(/\\s+/g,' ').slice(0,230),buttons:u.buttons,nodes:n}`));

// hasten a wipe in room 1: pin the party at 2% while enemies are still alive.
// Every killing blow is dealt by an enemy — no downAll, no endRun.
const wipeRun = (tag) => [
  ...fightBody, ...fightBody, ...fightBody,
  ev(iife(`for(const p of E.state().party)E.cmd('setHp',p.id,0.02);return {tag:'${tag}-hasten',tick:E.tick,party:E.state().party.map(p=>[p.id,Math.round(p.hp),p.maxHp,!!p.downed]),enemies:E.state().enemies.length,room:E.state().run.room,phase:E.state().run.phase}`)),
  { type: 'loop', label: `pin-${tag}`, maxMs: 80000,
    cond: `(()=>{try{const u=window.__echoes.runUi();return u.screen==='end'||u.phase==='defeat'}catch(e){return false}})()`,
    body: [ev(iife(`const s=E.state();for(const p of s.party)if(!p.downed&&p.hp>0.03*p.maxHp)E.cmd('setHp',p.id,0.02);
if(s.run.phase==='combat'&&s.enemies.length<3){const q=s.party[0];for(let i=s.enemies.length;i<3;i++)E.cmd('spawn','boar',+(q.x+(i-1)*0.8).toFixed(2),+(q.z+0.9).toFixed(2));}
return [E.tick,s.enemies.length,s.run.phase,s.party.map(p=>Math.round(p.hp)).join('/')]`)), wait(320)] },
  waitFor(`(()=>{const u=window.__echoes.runUi();return u.screen==='end'||u.phase==='defeat'})()`, 30000,
    `,screen:E.runUi().screen,phase:E.runUi().phase,party:E.state().party.map(p=>[p.id,Math.round(p.hp),!!p.downed]),chain:window.__b3.ev.filter(e=>['downed','revive','run_end','run_wiped','defeat','director_stop','return_to_camp'].includes(e.T)).map(e=>e.T+'@'+e.tick)`),
  wait(1400),
];
const backToCamp = (tag) => [
  click(800, 532), wait(1700),
  { type: 'if', cond: `window.__echoes.runUi().screen==='end'`, then: [key('Enter', 100), wait(1800)] },
  waitFor(`(()=>{try{return window.__echoes.cmd('campState').mode==='camp'&&!window.__echoes.state().run.active}catch(e){return false}})()`, 30000, `,runs:E.cmd('campState').runs`),
  wait(1600),
];

const acts = [wait(1200), arm2, snap('B34d-camp-boot'), leak('camp-boot')];

// RUN 1 — setup
acts.push(...portalStart('run1'));
acts.push(wait(900), shot('certB3-b34d-run1-room1'));
acts.push(ev(iife(`window.__b3.seed1=E.seed;return {run:1,seed:E.seed,bootSeed:E.bootSeed,room:E.state().run.room}`)));
acts.push({ type: 'mousedown', button: 'right' });
acts.push(...wipeRun('run1'));
acts.push({ type: 'mouseup', button: 'right' });
acts.push(shot('certB3-b34d-run1-defeat'), endRects('run1-defeat'));
acts.push(...backToCamp('run1'));
acts.push(leak('after-run1-camp'), shot('certB3-b34d-after-run1'));

// RUN 2 — B3 defeat loop
acts.push(ev(iife(`window.__b3.ev.length=0;return 'cleared event log t'+E.tick`)));
acts.push(...portalStart('run2'));
acts.push(wait(900), shot('certB3-b34d-run2-room1'), snap('B34d-run2-room1'));
acts.push(ev(iife(`window.__b3.seed2=E.seed;const rs=E.cmd('runState');return {run:2,seed:E.seed,seed1:window.__b3.seed1,differsFromRun1:E.seed!==window.__b3.seed1,room:rs.room,mode:rs.mode,wallet:rs.wallet,clearedRooms:rs.clearedRooms,enemies:E.state().enemies.length,party:E.state().party.map(p=>[p.id,Math.round(p.hp),p.maxHp]),skills:E.state().skills.map(k=>k&&k.id),freeSlots:rs.freeSkillSlots}`)));
acts.push({ type: 'mousedown', button: 'right' });
acts.push(...wipeRun('run2'));
acts.push({ type: 'mouseup', button: 'right' });
acts.push(shot('certB3-b34d-run2-defeat'), endRects('run2-defeat'), snap('B34d-run2-defeat'));
acts.push(leak('run2-on-defeat-screen'));
acts.push(...backToCamp('run2'));
acts.push(shot('certB3-b34d-run2-backcamp'), snap('B34d-run2-backcamp'));
acts.push(leak('run2-camp-arrival'));
acts.push(ev(iife(`window.__b3.evAtArrival=window.__b3.ev.length;return {evAtArrival:window.__b3.evAtArrival}`)));
acts.push(wait(6000));
acts.push(leak('run2-camp-plus360ticks'));
acts.push(ev(iife(`return {tag:'run2-quiescence',newEventsSinceArrival:window.__b3.ev.length-window.__b3.evAtArrival,list:window.__b3.ev.slice(window.__b3.evAtArrival).map(e=>e.T+'@'+e.tick)}`)));
acts.push(evDetail('B3d-run2-events'));

// RUN 3 — B4 freshness
acts.push(ev(iife(`window.__b3.ev.length=0;return 'cleared event log t'+E.tick`)));
acts.push(...portalStart('run3'));
acts.push(wait(1500), shot('certB3-b34d-run3-room1'), snap('B34d-run3-room1'));
acts.push(ev(iife(`const rs=E.cmd('runState');const s=E.state();return {tag:'B4d-run3-fresh',run:3,seed:E.seed,seed2:window.__b3.seed2,seed1:window.__b3.seed1,bootSeed:E.bootSeed,differsFromRun2:E.seed!==window.__b3.seed2,differsFromRun1:E.seed!==window.__b3.seed1,
room:rs.room,rooms:rs.rooms,mode:rs.mode,wallet:rs.wallet,clearedRooms:rs.clearedRooms,roomsDone:rs.roomsDone,freeSkillSlots:rs.freeSkillSlots,frameModes:rs.frame&&rs.frame.modes,
enemies:s.enemies.length,enemyKinds:s.enemies.map(e=>e.kind),party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed]),
skills:s.skills.map(k=>k&&k.id),skillSlotCount:s.skills.length,bench:s.build.bench,
events:window.__b3.ev.map(e=>e.T+'@'+e.tick+' '+JSON.stringify(e.d))}`)));
acts.push(leak('run3-room1'));
acts.push(evDetail('B4d-run3-events'));
write('certB3-b34d', acts);
