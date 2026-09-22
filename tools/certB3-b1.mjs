import { ev, wait, key, down, up, shot, click, mm, iife, snap, write, arm, evList, evDetail, waitFor } from './certB3-gen.mjs';

// one fight-loop iteration: aim sweep + held basic + skills + dodge + WASD taps
export const fightBody = [
  mm(820, 330), wait(120), key('Digit1', 50), wait(80),
  mm(1020, 500), wait(120), key('Digit2', 50), wait(80),
  down('KeyA'), wait(160), up('KeyA'),
  mm(600, 520), wait(120), key('Digit3', 50), wait(80),
  down('KeyD'), wait(160), up('KeyD'),
  mm(800, 620), wait(120), key('Digit4', 50), wait(80),
  key('Space', 50), wait(150),
  mm(800, 420), wait(120),
];

write('certB3-b1', [
  wait(1200),
  arm,
  snap('B1-camp'),
  ev(iife(`const c=E.cmd('campState');return {player:c.player,portal:c.portal,promptVisible:c.promptVisible,inPortal:c.inPortal,promptTxt:(document.querySelector('#camp-prompt,.camp-prompt,[data-prompt]')||{}).textContent}`)),
  mm(800, 450),
  // centre x on the portal
  down('KeyA'), wait(600), up('KeyA'), wait(150),
  ev(iife(`const c=E.cmd('campState');return {afterA:c.player}`)),
  // walk north to the portal with real WASD until the prompt shows
  { type: 'loop', label: 'walkToPortal', maxMs: 30000,
    cond: `(()=>{try{return !!window.__echoes.cmd('campState').promptVisible}catch(e){return false}})()`,
    body: [down('KeyW'), wait(500), up('KeyW'), wait(80)] },
  wait(300),
  ev(iife(`const c=E.cmd('campState');const p=document.querySelector('#camp-prompt,.camp-prompt,[data-prompt]');const cs=p?getComputedStyle(p):null;const r=p?p.getBoundingClientRect():null;return {player:c.player,portal:c.portal,inPortal:c.inPortal,promptVisible:c.promptVisible,promptBox:c.prompt.box,dom:cs?{display:cs.display,opacity:cs.opacity,visibility:cs.visibility,text:(p.textContent||'').trim(),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}:null}`)),
  shot('certB3-b1-prompt'),
  ev(iife(`window.__b3.tStart=performance.now();return 'markT'`)),
  key('KeyE', 120),
  waitFor(`(()=>{const s=E.state();return s.scene!=='camp'||(s.run&&s.run.room>=1)})()`, 30000,
    `,scene:E.state().scene,room:E.state().run&&E.state().run.room`),
  wait(1500),
  snap('B1-room1'),
  ev(iife(`const r=E.cmd('runState');return {runState:JSON.stringify(r).slice(0,1200),events:window.__b3.ev.map(e=>e.T+'@'+e.tick)}`)),
  shot('certB3-b1-room1'),
  // ---- scout: fight room 1 with real input until a screen appears
  { type: 'loop', label: 'fightRoom1', maxMs: 240000,
    cond: `(()=>{try{const E=window.__echoes;return E.runUi().screen!=='none'||(E.state().run&&E.state().run.room>1)}catch(e){return false}})()`,
    body: fightBody },
  wait(800),
  snap('B1-afterRoom1'),
  ev(iife(`return {msRoom1:Math.round(performance.now()-window.__b3.tStart),tick:E.tick,ui:JSON.stringify(E.runUi()).slice(0,2500)}`)),
  ev(iife(`return {nodes:[...document.querySelectorAll('#run-screen button, #run-screen .rn-card, #run-screen .rn-door, #run-screen [tabindex], #run-screen .rn-key')].map(n=>{const r=n.getBoundingClientRect();return [n.className,(n.textContent||'').trim().slice(0,50),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}).slice(0,24)}`)),
  shot('certB3-b1-reward'),
  evDetail('B1-events'),
]);
