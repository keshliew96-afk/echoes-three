import { ev, wait, key, shot, click, mm, iife, snap, evDetail, waitFor,
         arm2, fightLoop, dumpUi, screenLoop, portalStart, campBack, SOCK_OPEN } from './certB3-parts2.mjs';
import { write } from './certB3-gen.mjs';

const markRoom = (i) => ev(iife(`window.__b3.rt=window.__b3.rt||{};window.__b3.rt[${i}]={t0:performance.now(),tick0:E.tick};return {markRoom:${i},startTick:E.tick,uiRoom:E.state().run.room,mode:E.state().run.mode}`));
const endRoom = (i) => ev(iife(`const r=window.__b3.rt[${i}];r.ms=Math.round(performance.now()-r.t0);r.ticks=E.tick-r.tick0;const u=E.runUi();return {endRoom:${i},wallMs:r.ms,wallS:+(r.ms/1000).toFixed(1),ticks:r.ticks,screen:u.screen,socketOpen:${SOCK_OPEN},phase:u.phase,uiRoom:u.room,wallet:u.wallet,inputs:window.__b3.n}`));

const acts = [
  wait(1200), arm2, snap('B2-camp-boot'),
  ...portalStart('b2b'),
  wait(1200), snap('B2-room1-enter'), shot('certB3-b2b-r1-enter'),
];
for (let i = 1; i <= 8; i++) {
  acts.push(markRoom(i));
  if (i > 1) { acts.push(shot(`certB3-b2b-r${i}-enter`)); acts.push(snap(`B2-r${i}-enter`)); }
  acts.push({ type: 'mousedown', button: 'right' });
  acts.push(fightLoop(i, 240000));
  acts.push({ type: 'mouseup', button: 'right' });
  acts.push(wait(600));
  acts.push(endRoom(i));
  acts.push(snap(`B2-r${i}-cleared`));
  acts.push(shot(`certB3-b2b-r${i}-cleared`));
  acts.push(ev(iife(`return {room:${i},tail:window.__b3.ev.map(e=>e.T+'@'+e.tick).slice(-12)}`)));
  if (i === 8) break;
  acts.push(screenLoop(`b2b-r${i}`, 120000));
  acts.push(snap(`B2-after-r${i}-screens`));
}
// ---- room 8 tail: boss felled plate, add mop-up, victory ----
acts.push(ev(iife(`const rs=E.cmd('runState');const s=E.state();const b=E.hud.banner();return {tag:'r8-final',boss:rs.boss,phase:rs.phase,enemies:s.enemies.length,bannerText:b.text,bannerVisible:b.visible,ui:E.runUi().screen,socketOpen:${SOCK_OPEN}}`)));
acts.push({ type: 'if', cond: SOCK_OPEN, then: [shot('certB3-b2b-r8-socket'), key('Escape', 100), wait(1000)] });
acts.push(waitFor(`window.__echoes.runUi().screen==='end'`, 60000, `,screen:E.runUi().screen,phase:E.runUi().phase`));
acts.push(wait(1200));
acts.push(shot('certB3-b2b-victory'));
acts.push(dumpUi('b2b-victory'));
acts.push(snap('B2-victory'));
acts.push(ev(iife(`return {summary:JSON.stringify(E.cmd('runState').summary),inputs:window.__b3.n}`)));
acts.push(click(800, 532)); acts.push(wait(1600));
acts.push({ type: 'if', cond: `window.__echoes.runUi().screen==='end'`, then: [key('Enter', 100), wait(1800)] });
acts.push(...campBack('b2b'));
acts.push(snap('B2-back-in-camp'));
acts.push(ev(iife(`return {roomTimes:window.__b3.rt,inputs:window.__b3.n}`)));
acts.push(evDetail('B2-events'));
write('certB3-b2b', acts);
