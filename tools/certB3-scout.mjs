import { ev, wait, key, shot, mm, iife, write, arm, waitFor } from './certB3-gen.mjs';
const rects = (tag) => ev(iife(`const u=E.runUi();const sel='#run-screen button, #run-screen .rn-card, #run-screen .rn-door, #run-screen .rn-plaque, #run-screen [tabindex], #run-screen .rn-take, #run-screen .rn-decline, #run-screen .rn-btn';const nodes=[...document.querySelectorAll(sel)].map(n=>{const r=n.getBoundingClientRect();return {c:n.className,t:(n.textContent||'').replace(/\s+/g,' ').trim().slice(0,44),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}}).filter(n=>n.w>0);return {tag:${JSON.stringify(tag)},screen:u.screen,room:u.room,phase:u.phase,wallet:u.wallet,text:(u.text||'').slice(0,220),doors:u.doors.map(d=>[d.glyphs.join(''),d.box]),plaques:u.plaques,cards:(u.cards||[]).map(c=>c&&(c.id||c.name||JSON.stringify(c).slice(0,60))),buttons:u.buttons,nodes}`));
const waitScreen = (s, ms = 90000) => waitFor(`E.runUi().screen==='${s}'`, ms, `,screen:E.runUi().screen,room:E.runUi().room`);
write('certB3-scout', [
  wait(1200), arm, mm(800, 450),
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,room:r&&r.room}`)),
  waitScreen('draft', 90000), wait(900), rects('draft-r1'), shot('certB3-scout-draft'),
  key('Enter', 100), wait(1200), rects('after-enter'), shot('certB3-scout-path'),
  waitFor(`E.runUi().screen!=='none'`, 20000, `,screen:E.runUi().screen`), rects('path-r1'),
  key('Enter', 100), wait(1500), rects('after-path'),
  // jump to the shop (scouting run only)
  ev(iife(`const r=E.cmd('skipToRoom',7);return {room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode,wallet:r&&r.wallet}`)),
  wait(2500), rects('shop-r7'), shot('certB3-scout-shop'),
  ev(iife(`return {shopUi:JSON.stringify(E.runUi()).slice(0,3000)}`)),
  // victory / defeat screen rects
  ev(iife(`E.cmd('endRun','victory');return 'endRun victory'`)), wait(2000), rects('victory'), shot('certB3-scout-victory'),
  ev(iife(`return {ui:JSON.stringify(E.runUi()).slice(0,1600),campMode:(()=>{try{return E.cmd('campState').mode}catch(e){return String(e)}})()}`)),
  key('Enter', 100), wait(2500),
  ev(iife(`const s=E.state();return {scene:s.scene,run:E.cmd('runState'),camp:(()=>{try{const c=E.cmd('campState');return {mode:c.mode,runs:c.runs,player:c.player,seats:c.seats}}catch(e){return String(e)}})()}`)),
  shot('certB3-scout-backcamp'),
]);
