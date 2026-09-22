import { ev, wait, key, down, up, shot, click, mm, iife, snap, arm, evDetail, waitFor,
         fightBody, fightLoop, dumpUi, screenLoop, portalStart } from './certB3-parts.mjs';
import { write } from './certB3-gen.mjs';

const markRoom = (i) => ev(iife(`window.__b3.rt=window.__b3.rt||{};window.__b3.rt[${i}]={t0:performance.now(),tick0:E.tick};return {room:${i},startTick:E.tick}`));
const endRoom = (i) => ev(iife(`const r=window.__b3.rt[${i}];r.ms=Math.round(performance.now()-r.t0);r.ticks=E.tick-r.tick0;const u=E.runUi();return {room:${i},wallMs:r.ms,ticks:r.ticks,screen:u.screen,phase:u.phase,uiRoom:u.room,wallet:u.wallet}`));

const acts = [
  wait(1200), arm, snap('B2-camp'),
  ...portalStart('b2'),
  wait(1200), snap('B2-room1-enter'), shot('certB3-b2-room1-enter'),
];
for (let i = 1; i <= 8; i++) {
  acts.push(markRoom(i));
  if (i > 1) { acts.push(shot(`certB3-b2-r${i}-enter`)); acts.push(snap(`B2-r${i}-enter`)); }
  acts.push({ type: 'mousedown', button: 'right' });
  acts.push(fightLoop(i, 240000));
  acts.push({ type: 'mouseup', button: 'right' });
  acts.push(wait(700));
  acts.push(endRoom(i));
  acts.push(snap(`B2-r${i}-cleared`));
  acts.push(shot(`certB3-b2-r${i}-cleared`));
  acts.push(ev(iife(`return {room:${i},ev:window.__b3.ev.map(e=>e.T+'@'+e.tick).slice(-14)}`)));
  if (i === 8) break;
  acts.push(screenLoop(`b2-r${i}`, 90000));
  acts.push(snap(`B2-after-r${i}-screens`));
}
// room 8: boss -> FELLED plate -> add mop-up -> victory
acts.push(ev(iife(`const b=E.cmd('runState').boss;const s=E.state();return {tag:'r8-final',boss:b,enemies:s.enemies.length,banner:E.hud.banner(),ui:E.runUi().screen}`)));
acts.push(shot('certB3-b2-victory'));
acts.push(dumpUi('b2-victory'));
acts.push(snap('B2-victory'));
acts.push(ev(iife(`return {summary:JSON.stringify(E.cmd('runState').summary)}`)));
// return to camp by real input
acts.push(click(800, 532)); acts.push(wait(1500));
acts.push({ type: 'if', cond: `window.__echoes.runUi().screen==='end'`, then: [key('Enter', 100), wait(1800)] });
acts.push(waitFor(`(()=>{try{return E.cmd('campState').mode==='camp'&&!E.state().run.active})()`, 25000, `,campRuns:E.cmd('campState').runs`));
acts.push(wait(1200));
acts.push(snap('B2-back-in-camp'));
acts.push(shot('certB3-b2-backcamp'));
acts.push(ev(iife(`const c=E.cmd('campState');const s=E.state();return {campMode:c.mode,runs:c.runs,player:c.player,seats:c.seats,rigs:c.party.rigs,enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,numerals:s.vfx&&s.vfx.numerals,banner:E.hud.banner(),threat:E.hud.threat().markersDrawn,skills:s.skills.map(k=>k&&k.id),wallet:s.run.wallet}`)));
acts.push(ev(iife(`return {roomTimes:window.__b3.rt}`)));
acts.push(evDetail('B2-events'));
write('certB3-b2', acts);
