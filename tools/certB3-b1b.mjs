import { ev, wait, key, down, up, shot, mm, iife, snap, write, arm, evDetail, waitFor } from './certB3-gen.mjs';
const trace = ev(iife(`const c=E.cmd('campState');(window.__b3.trace=window.__b3.trace||[]).push([E.tick,+c.player.x.toFixed(2),+c.player.z.toFixed(2),c.inPortal?1:0,c.promptVisible?1:0]);return window.__b3.trace.length`));
const walk = (k, label, maxMs) => ({ type: 'loop', label, maxMs,
  cond: `(()=>{try{return !!window.__echoes.cmd('campState').promptVisible}catch(e){return false}})()`,
  body: [down(k), wait(400), up(k), wait(60)] });
write('certB3-b1b', [
  wait(1200), arm, snap('B1-camp'),
  ev(iife(`const c=E.cmd('campState');return {player:c.player,portal:c.portal,hearth:c.hearth,promptVisible:c.promptVisible,inPortal:c.inPortal,promptTxt:(document.querySelector('#camp-prompt,.camp-prompt,[data-prompt]')||{}).textContent}`)),
  mm(800, 450), trace,
  walk('KeyW', 'walkNorth', 24000),
  trace,
  { type: 'if', cond: `(()=>{try{return !window.__echoes.cmd('campState').promptVisible}catch(e){return true}})()`,
    then: [down('KeyA'), wait(300), up('KeyA'), wait(100), walk('KeyW', 'walkNorth2', 12000), trace] },
  { type: 'if', cond: `(()=>{try{return !window.__echoes.cmd('campState').promptVisible}catch(e){return true}})()`,
    then: [down('KeyD'), wait(600), up('KeyD'), wait(100), walk('KeyW', 'walkNorth3', 12000), trace] },
  wait(300),
  ev(iife(`const c=E.cmd('campState');const p=document.querySelector('#camp-prompt,.camp-prompt,[data-prompt]');const cs=p?getComputedStyle(p):null;const r=p?p.getBoundingClientRect():null;return {player:c.player,portal:c.portal,inPortal:c.inPortal,promptVisible:c.promptVisible,promptBox:c.prompt.box,dom:cs?{display:cs.display,opacity:cs.opacity,visibility:cs.visibility,text:(p.textContent||'').trim(),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}:null,trace:window.__b3.trace}`)),
  shot('certB3-b1-prompt'),
  ev(iife(`window.__b3.tStart=performance.now();return 'markT@'+E.tick`)),
  key('KeyE', 120),
  waitFor(`(()=>{const s=E.state();return s.scene!=='camp'&&s.run&&s.run.room>=1&&s.run.active})()`, 40000,
    `,scene:E.state().scene,room:E.state().run&&E.state().run.room,ms2:Math.round(performance.now()-window.__b3.tStart)`),
  wait(1500), snap('B1-room1'), shot('certB3-b1-room1'),
  ev(iife(`return {runState:JSON.stringify(E.cmd('runState')).slice(0,1400)}`)),
  evDetail('B1-events'),
]);
