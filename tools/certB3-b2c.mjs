import { ev, wait, key, shot, click, mm, iife, snap, evDetail, waitFor,
         arm2, fightLoop, dumpUi, portalStart, campBack, SOCK_OPEN } from './certB3-parts2.mjs';
import { write } from './certB3-gen.mjs';

const markRoom = (i) => ev(iife(`window.__b3.rt=window.__b3.rt||{};window.__b3.rt[${i}]={t0:performance.now(),tick0:E.tick};return {markRoom:${i},startTick:E.tick,uiRoom:E.state().run.room,mode:E.state().run.mode}`));
const endRoom = (i) => ev(iife(`const r=window.__b3.rt[${i}];r.ms=Math.round(performance.now()-r.t0);r.ticks=E.tick-r.tick0;const u=E.runUi();return {endRoom:${i},wallS:+(r.ms/1000).toFixed(1),ticks:r.ticks,screen:u.screen,socketOpen:${SOCK_OPEN},phase:u.phase,uiRoom:u.room,wallet:u.wallet,takes:window.__b3.ev.filter(e=>e.T==='draft_taken').length,inputs:window.__b3.n}`));

// Enter-first draft handler (Enter = the on-screen "Enter commit" key), Take-click fallback
const screenLoopC = (tag, maxMs = 120000) => ({
  type: 'loop', label: `screens-${tag}`, maxMs,
  cond: `(()=>{try{const s=window.__echoes.runUi().screen;const so=${SOCK_OPEN};return (s==='end'&&!so)||(s==='none'&&!so)}catch(e){return false}})()`,
  body: [
    { type: 'if', cond: SOCK_OPEN, then: [
      shot(`certB3-${tag}-socket`),
      ev(iife(`const b=E.state().build;return {tag:'${tag}-socket',tick:E.tick,uiScreen:E.runUi().screen,bench:b.bench,skills:b.skills.map(s=>[s.id,s.sockets])}`)),
      key('Escape', 100), wait(1000),
      ev(iife(`return {tag:'${tag}-socketClosed',open:${SOCK_OPEN},screen:E.runUi().screen}`)) ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='draft'&&!${SOCK_OPEN}`, then: [
      shot(`certB3-${tag}-draft`), dumpUi(`${tag}-draft`),
      key('Enter', 90), wait(1300), dumpUi(`${tag}-draft-afterEnter`),
      { type: 'if', cond: `window.__echoes.runUi().screen==='draft'&&!${SOCK_OPEN}`, then: [
        click(728, 536), wait(1300), dumpUi(`${tag}-draft-afterTakeClick`) ] },
      { type: 'if', cond: `window.__echoes.runUi().screen==='draft'&&!${SOCK_OPEN}`, then: [
        key('Enter', 90), wait(1300), dumpUi(`${tag}-draft-afterEnter2`) ] } ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='shop'&&!${SOCK_OPEN}`, then: [
      shot(`certB3-${tag}-shop`), dumpUi(`${tag}-shop`),
      { type: 'if', cond: `(()=>{const E=window.__echoes;return E.runUi().wallet>=25&&!window.__b3.bought})()`, then: [
        click(500, 607), wait(1300),
        ev(iife(`window.__b3.bought=true;const u=E.runUi();return {tag:'${tag}-shopBuy',tick:E.tick,wallet:u.wallet,owned:u.owned,bench:E.state().build.bench,buys:window.__b3.ev.filter(e=>e.T==='shop_buy'||e.T==='node_granted'||e.T==='currency_denied').map(e=>[e.T,e.tick,JSON.stringify(e.d)])}`)),
        shot(`certB3-${tag}-shop-bought`) ] },
      click(800, 769), wait(1300),
      { type: 'if', cond: `window.__echoes.runUi().screen==='shop'&&!${SOCK_OPEN}`, then: [key('Enter', 90), wait(1300)] },
      dumpUi(`${tag}-shop-after`) ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='path'&&!${SOCK_OPEN}`, then: [
      shot(`certB3-${tag}-path`), dumpUi(`${tag}-path`),
      click(703, 399), wait(1100),
      { type: 'if', cond: `window.__echoes.runUi().screen==='path'&&!${SOCK_OPEN}`, then: [key('Enter', 90), wait(1100)] },
      dumpUi(`${tag}-path-after`) ] },
    wait(400),
  ],
});

const acts = [
  wait(1200), arm2, snap('B2c-camp-boot'),
  ...portalStart('b2c'),
  wait(1200), snap('B2c-room1-enter'), shot('certB3-b2c-r1-enter'),
];
for (let i = 1; i <= 8; i++) {
  acts.push(markRoom(i));
  if (i > 1) { acts.push(shot(`certB3-b2c-r${i}-enter`)); acts.push(snap(`B2c-r${i}-enter`)); }
  if (i === 8) acts.push(ev(iife(`window.__b3.bs=[];window.__b3.bt=setInterval(()=>{try{const b=E.hud.banner();const k=(b.text||'')+'|'+(b.sub||'');const l=window.__b3.bs[window.__b3.bs.length-1];if(!l||l[1]!==k)window.__b3.bs.push([E.tick,k,E.state().enemies.length]);}catch(e){}},100);return 'banner sampler armed t'+E.tick`)));
  acts.push({ type: 'mousedown', button: 'right' });
  acts.push(fightLoop(i, 240000));
  acts.push({ type: 'mouseup', button: 'right' });
  acts.push(wait(600));
  acts.push(endRoom(i));
  acts.push(snap(`B2c-r${i}-cleared`));
  acts.push(shot(`certB3-b2c-r${i}-cleared`));
  if (i === 8) break;
  acts.push(screenLoopC(`b2c-r${i}`, 150000));
  acts.push(snap(`B2c-after-r${i}-screens`));
}
// room-8 tail: FELLED plate + add mop-up + victory
acts.push(ev(iife(`clearInterval(window.__b3.bt);const rs=E.cmd('runState');const s=E.state();const b=E.hud.banner();return {tag:'r8-final',boss:rs.boss,phase:rs.phase,enemies:s.enemies.length,bannerText:b.text,bannerSub:b.sub,ui:E.runUi().screen,socketOpen:${SOCK_OPEN},bannerTimeline:window.__b3.bs}`)));
acts.push({ type: 'if', cond: SOCK_OPEN, then: [shot('certB3-b2c-r8-socket'), key('Escape', 100), wait(1000)] });
acts.push(waitFor(`window.__echoes.runUi().screen==='end'`, 90000, `,screen:E.runUi().screen,phase:E.runUi().phase`));
acts.push(wait(1200));
acts.push(shot('certB3-b2c-victory'));
acts.push(dumpUi('b2c-victory'));
acts.push(snap('B2c-victory'));
acts.push(ev(iife(`return {summary:JSON.stringify(E.cmd('runState').summary),inputs:window.__b3.n}`)));
acts.push(click(800, 532)); acts.push(wait(1600));
acts.push({ type: 'if', cond: `window.__echoes.runUi().screen==='end'`, then: [key('Enter', 100), wait(1800)] });
acts.push(...campBack('b2c'));
acts.push(snap('B2c-back-in-camp'));
acts.push(ev(iife(`return {roomTimes:window.__b3.rt,inputs:window.__b3.n,takes:window.__b3.ev.filter(e=>e.T==='draft_taken').length}`)));
acts.push(evDetail('B2c-events'));
write('certB3-b2c', acts);
