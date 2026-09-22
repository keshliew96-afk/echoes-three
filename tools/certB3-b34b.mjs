import { ev, wait, key, shot, click, mm, iife, snap, evDetail, waitFor,
         arm2, fightLoop, fightBody, dumpUi, portalStart, SOCK_OPEN } from './certB3-parts2.mjs';
import { write } from './certB3-gen.mjs';

const leak = (tag) => ev(iife(`const s=E.state();const c=(()=>{try{return E.cmd('campState')}catch(e){return null}})();const b=E.hud.banner();const t=E.hud.threat();
const layer=document.getElementById('dmg-num-layer');const kids=layer?[...layer.children]:[];
return {tag:${JSON.stringify(tag)},tick:E.tick,scene:s.scene,campMode:c&&c.mode,runs:c&&c.runs,runActive:s.run.active,phase:s.run.phase,room:s.run.room,wallet:s.run.wallet,
enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,projectiles:s.projectiles?s.projectiles.length:0,
vfxNumerals:s.vfx&&s.vfx.numerals,domNumerals:kids.length,visibleNumerals:kids.filter(n=>{const g=getComputedStyle(n);return g.display!=='none'&&+g.opacity>0.05}).length,
bannerVisible:b.visible,bannerText:b.text,bannerSub:b.sub,threatMarkers:t.markersDrawn,domMarkers:t.domMarkers,
party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),
seats:c&&c.seats,seatDrift:c&&c.seatDrift,rigs:c&&c.party.rigs.map(r=>[r.classId,r.x,r.z,r.anim||'-']),
skills:s.skills.map(k=>k&&k.id),bench:s.build.bench,socketOpen:${SOCK_OPEN},uiScreen:E.runUi().screen,evCount:window.__b3.ev.length}`));

const endRects = (tag) => ev(iife(`const n=[...document.querySelectorAll('#run-screen .rn-btn')].map(x=>{const r=x.getBoundingClientRect();return [x.className,(x.textContent||'').replace(/\\s+/g,' ').trim().slice(0,24),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}).filter(a=>a[4]>0);
const u=E.runUi();return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,phase:u.phase,text:(u.text||'').replace(/\\s+/g,' ').slice(0,220),buttons:u.buttons,nodes:n}`));

// natural wipe: setHp only HASTENS; the enemies land every killing blow
const wipeRun = (tag) => [
  ev(iife(`for(const p of E.state().party)E.cmd('setHp',p.id,0.02);return {tag:'${tag}-hasten',tick:E.tick,after:E.state().party.map(p=>[p.id,Math.round(p.hp),p.maxHp,!!p.downed]),enemies:E.state().enemies.length}`)),
  waitFor(`(()=>{const u=window.__echoes.runUi();return u.screen==='end'||u.phase==='defeat'})()`, 110000,
    `,screen:E.runUi().screen,phase:E.runUi().phase,party:E.state().party.map(p=>[p.id,Math.round(p.hp),!!p.downed]),chain:window.__b3.ev.filter(e=>['downed','revive','run_end','run_wiped','defeat','director_stop'].includes(e.T)).map(e=>e.T+'@'+e.tick)`),
  wait(1400),
];

const acts = [wait(1200), arm2, snap('B34b-camp-boot'), leak('camp-boot')];

// ---------------- RUN 1 (setup run: real portal start, real play, hastened wipe) ----------------
acts.push(...portalStart('run1'));
acts.push(wait(1200), snap('B34b-run1-room1'), shot('certB3-b34b-run1-room1'));
acts.push(ev(iife(`window.__b3.seed1=E.seed;return {run:1,seed:E.seed,bootSeed:E.bootSeed,room:E.state().run.room}`)));
acts.push({ type: 'mousedown', button: 'right' });
acts.push({ type: 'loop', label: 'run1-play', maxMs: 20000, cond: `window.__echoes.tick>window.__b3.t0+1200`, body: fightBody });
acts.push({ type: 'mouseup', button: 'right' });
acts.push(...wipeRun('run1'));
acts.push(shot('certB3-b34b-run1-defeat'), endRects('run1-defeat'));
acts.push(click(800, 532), wait(1600));
acts.push({ type: 'if', cond: `window.__echoes.runUi().screen==='end'`, then: [key('Enter', 100), wait(1800)] });
acts.push(waitFor(`(()=>{try{return window.__echoes.cmd('campState').mode==='camp'&&!window.__echoes.state().run.active}catch(e){return false}})()`, 30000, `,runs:E.cmd('campState').runs`));
acts.push(wait(1500), leak('after-run1-camp'), shot('certB3-b34b-after-run1'));

// ---------------- RUN 2 (B3): defeat loop ----------------
acts.push(ev(iife(`window.__b3.ev.length=0;window.__b3.mark2=E.tick;return 'cleared event log at t'+E.tick`)));
acts.push(...portalStart('run2'));
acts.push(wait(1200), snap('B34b-run2-room1'), shot('certB3-b34b-run2-room1'));
acts.push(ev(iife(`window.__b3.seed2=E.seed;const rs=E.cmd('runState');return {run:2,seed:E.seed,seed1:window.__b3.seed1,differs:E.seed!==window.__b3.seed1,bootSeed:E.bootSeed,room:rs.room,mode:rs.mode,wallet:rs.wallet,clearedRooms:rs.clearedRooms,enemies:E.state().enemies.length,party:E.state().party.map(p=>[p.id,Math.round(p.hp),p.maxHp]),skills:E.state().skills.map(k=>k&&k.id),freeSlots:rs.freeSkillSlots}`)));
acts.push({ type: 'mousedown', button: 'right' });
acts.push({ type: 'loop', label: 'run2-play', maxMs: 14000, cond: `window.__echoes.tick>window.__b3.mark2+900`, body: fightBody });
acts.push({ type: 'mouseup', button: 'right' });
acts.push(...wipeRun('run2'));
acts.push(shot('certB3-b34b-run2-defeat'), endRects('run2-defeat'), snap('B34b-run2-defeat'));
acts.push(leak('run2-on-defeat-screen'));
acts.push(click(800, 532), wait(1600));
acts.push({ type: 'if', cond: `window.__echoes.runUi().screen==='end'`, then: [key('Enter', 100), wait(1800)] });
acts.push(waitFor(`(()=>{try{return window.__echoes.cmd('campState').mode==='camp'&&!window.__echoes.state().run.active}catch(e){return false}})()`, 30000, `,runs:E.cmd('campState').runs`));
acts.push(wait(1500), shot('certB3-b34b-run2-backcamp'), snap('B34b-run2-backcamp'));
acts.push(leak('run2-camp-arrival'));
acts.push(ev(iife(`window.__b3.evAtArrival=window.__b3.ev.length;return {evAtArrival:window.__b3.evAtArrival}`)));
acts.push(wait(6000));
acts.push(leak('run2-camp-plus360ticks'));
acts.push(ev(iife(`return {tag:'run2-quiescence',newEventsSinceArrival:window.__b3.ev.length-window.__b3.evAtArrival,list:window.__b3.ev.slice(window.__b3.evAtArrival).map(e=>e.T+'@'+e.tick)}`)));
acts.push(evDetail('B3b-run2-events'));

// ---------------- RUN 3 (B4): freshness ----------------
acts.push(ev(iife(`window.__b3.ev.length=0;window.__b3.mark3=E.tick;return 'cleared event log at t'+E.tick`)));
acts.push(...portalStart('run3'));
acts.push(wait(1500), snap('B34b-run3-room1'), shot('certB3-b34b-run3-room1'));
acts.push(ev(iife(`const rs=E.cmd('runState');const s=E.state();return {tag:'B4b-run3-fresh',run:3,seed:E.seed,seed2:window.__b3.seed2,seed1:window.__b3.seed1,bootSeed:E.bootSeed,differsFromRun2:E.seed!==window.__b3.seed2,differsFromRun1:E.seed!==window.__b3.seed1,
room:rs.room,rooms:rs.rooms,mode:rs.mode,wallet:rs.wallet,clearedRooms:rs.clearedRooms,roomsDone:rs.roomsDone,freeSkillSlots:rs.freeSkillSlots,frameModes:rs.frame&&rs.frame.modes,
enemies:s.enemies.length,enemyKinds:s.enemies.map(e=>e.kind),party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed]),
skills:s.skills.map(k=>k&&k.id),skillSlotCount:s.skills.length,bench:s.build.bench,
events:window.__b3.ev.map(e=>e.T+'@'+e.tick+' '+JSON.stringify(e.d))}`)));
acts.push(leak('run3-room1'));
acts.push(evDetail('B4b-run3-events'));
write('certB3-b34b', acts);
