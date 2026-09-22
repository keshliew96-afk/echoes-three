import { ev, wait, key, shot, click, mm, iife, snap, evDetail, waitFor,
         arm2, fightLoop, dumpUi, portalStart, campBack, SOCK_OPEN } from './certB3-parts2.mjs';
import { write } from './certB3-gen.mjs';

const focusDump = (tag) => ev(iife(`const n=[...document.querySelectorAll('#run-screen .rn-btn, #run-screen .rn-card')].map(x=>{const r=x.getBoundingClientRect();return [x.className,(x.textContent||'').replace(/\\s+/g,' ').trim().slice(0,14),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}).filter(a=>a[4]>0);
return {tag:${JSON.stringify(tag)},tick:E.tick,screen:E.runUi().screen,focus:n.filter(a=>/rn-focus/.test(a[0])).map(a=>a[1]),nodes:n,skills:E.state().skills.map(k=>k&&k.id),freeSlots:E.runUi().freeSkillSlots,bench:E.state().build.bench,takes:window.__b3.ev.filter(e=>e.T==='draft_taken').length}`));

const markRoom = (i) => ev(iife(`window.__b3.rt=window.__b3.rt||{};window.__b3.rt[${i}]={t0:performance.now(),tick0:E.tick};return {markRoom:${i},startTick:E.tick,uiRoom:E.state().run.room,mode:E.state().run.mode}`));
const endRoom = (i) => ev(iife(`const r=window.__b3.rt[${i}];r.ms=Math.round(performance.now()-r.t0);r.ticks=E.tick-r.tick0;const u=E.runUi();return {endRoom:${i},wallS:+(r.ms/1000).toFixed(1),ticks:r.ticks,screen:u.screen,socketOpen:${SOCK_OPEN},phase:u.phase,uiRoom:u.room,wallet:u.wallet,takes:window.__b3.ev.filter(e=>e.T==='draft_taken').length,party:E.state().party.map(p=>[p.id,Math.round(p.hp),!!p.downed]),inputs:window.__b3.n}`));

const screenLoopD = (tag, maxMs = 150000) => ({
  type: 'loop', label: `screens-${tag}`, maxMs,
  cond: `(()=>{try{const s=window.__echoes.runUi().screen;const so=${SOCK_OPEN};return (s==='end'&&!so)||(s==='none'&&!so)}catch(e){return false}})()`,
  body: [
    { type: 'if', cond: SOCK_OPEN, then: [
      shot(`certB3-${tag}-socket`),
      ev(iife(`const b=E.state().build;return {tag:'${tag}-socket',tick:E.tick,uiScreen:E.runUi().screen,bench:b.bench,skills:b.skills.map(s=>[s.id,s.sockets])}`)),
      key('Escape', 100), wait(1100),
      ev(iife(`return {tag:'${tag}-socketClosed',open:${SOCK_OPEN},screen:E.runUi().screen}`)) ] },
    { type: 'if', cond: `window.__echoes.runUi().screen==='draft'&&!${SOCK_OPEN}`, then: [
      shot(`certB3-${tag}-draft`), dumpUi(`${tag}-draft`), focusDump(`${tag}-draft-focusOnArrival`),
      key('ArrowLeft', 90), wait(500), focusDump(`${tag}-draft-focusAfterArrowLeft`),
      key('Enter', 90), wait(1300), focusDump(`${tag}-draft-afterEnter`),
      { type: 'if', cond: `window.__echoes.runUi().screen==='draft'&&!${SOCK_OPEN}`, then: [
        click(728, 533), wait(1200), focusDump(`${tag}-draft-afterTakeClick`) ] } ] },
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
  wait(1200), arm2, snap('B2d-camp-boot'),
  ...portalStart('b2d'),
  wait(1200), snap('B2d-room1-enter'), shot('certB3-b2d-r1-enter'),
];
for (let i = 1; i <= 8; i++) {
  acts.push(markRoom(i));
  if (i > 1) { acts.push(shot(`certB3-b2d-r${i}-enter`)); acts.push(snap(`B2d-r${i}-enter`)); }
  if (i === 8) acts.push(ev(iife(`window.__b3.bs=[];window.__b3.bt=setInterval(()=>{try{const b=E.hud.banner();const k=(b.text||'')+' || '+(b.sub||'');const l=window.__b3.bs[window.__b3.bs.length-1];const key=k.replace(/[0-9]+/g,'#');if(!l||l[3]!==key)window.__b3.bs.push([E.tick,k,E.state().enemies.length,key]);}catch(e){}},100);return 'banner sampler armed t'+E.tick`)));
  acts.push({ type: 'mousedown', button: 'right' });
  acts.push(fightLoop(i, 240000));
  acts.push({ type: 'mouseup', button: 'right' });
  acts.push(wait(600));
  acts.push(endRoom(i));
  acts.push(snap(`B2d-r${i}-cleared`));
  acts.push(shot(`certB3-b2d-r${i}-cleared`));
  if (i === 8) break;
  acts.push(screenLoopD(`b2d-r${i}`, 150000));
  acts.push(snap(`B2d-after-r${i}-screens`));
}
acts.push(ev(iife(`clearInterval(window.__b3.bt);const rs=E.cmd('runState');const s=E.state();const b=E.hud.banner();return {tag:'r8-final',boss:rs.boss,phase:rs.phase,enemies:s.enemies.length,bannerText:b.text,ui:E.runUi().screen,bannerTimeline:window.__b3.bs.map(a=>[a[0],a[1],a[2]]).filter((a,i,arr)=>i<4||i>arr.length-14)}`)));
acts.push({ type: 'if', cond: SOCK_OPEN, then: [shot('certB3-b2d-r8-socket'), key('Escape', 100), wait(1100)] });
acts.push(waitFor(`window.__echoes.runUi().screen==='end'`, 90000, `,screen:E.runUi().screen,phase:E.runUi().phase`));
acts.push(wait(1200));
acts.push(shot('certB3-b2d-victory'));
acts.push(dumpUi('b2d-victory'));
acts.push(snap('B2d-victory'));
acts.push(ev(iife(`return {summary:JSON.stringify(E.cmd('runState').summary),inputs:window.__b3.n}`)));
acts.push(click(800, 532)); acts.push(wait(1600));
acts.push({ type: 'if', cond: `window.__echoes.runUi().screen==='end'`, then: [key('Enter', 100), wait(1800)] });
acts.push(...campBack('b2d'));
acts.push(snap('B2d-back-in-camp'));
acts.push(ev(iife(`const layer=document.getElementById('dmg-num-layer');const kids=layer?[...layer.children]:[];return {tag:'B2d-leak',domNumerals:kids.length,visibleNumerals:kids.filter(n=>{const c=getComputedStyle(n);return c.display!=='none'&&+c.opacity>0.05}).length,vfxNumerals:E.state().vfx&&E.state().vfx.numerals,roomTimes:window.__b3.rt,takes:window.__b3.ev.filter(e=>e.T==='draft_taken').length}`)));
acts.push(evDetail('B2d-events'));
write('certB3-b2d', acts);
