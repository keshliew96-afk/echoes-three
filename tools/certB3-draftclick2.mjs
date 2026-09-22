import { ev, wait, key, shot, click, mm, iife } from './certB3-parts2.mjs';
import { write } from './certB3-gen.mjs';

const probe = (tag) => ev(iife(`const u=E.runUi();const s=E.state();
const n=[...document.querySelectorAll('#run-screen .rn-card, #run-screen .rn-btn')].map(x=>{const r=x.getBoundingClientRect();return [x.className,(x.textContent||'').replace(/\\s+/g,' ').trim().slice(0,20),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}).filter(a=>a[4]>0);
return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,phase:u.phase,freeSlots:u.freeSkillSlots,held:u.held,stale:u.stale,skills:s.skills.map(k=>k&&k.id),bench:s.build.bench,active:document.activeElement?document.activeElement.tagName+'.'+document.activeElement.className:null,nodes:n,tail:(E.events||[]).slice(-6).map(e=>e.type+'@'+e.tick)}`));
const toDraft = (label) => ({ type: 'loop', label, maxMs: 90000,
  cond: `window.__echoes.runUi().screen==='draft'`,
  body: [ev(iife(`if(E.state().enemies.length>0)E.cmd('killAllEnemies');return E.state().enemies.length`)), wait(350)] });
const nextRoom = [{ type: 'if', cond: `window.__echoes.runUi().screen==='path'`, then: [click(703, 399), wait(1400)] }];

write('certB3-draftclick2', [
  wait(1200), mm(800, 450),
  ev(iife(`E.cmd('startRun');return {seed:E.seed}`)),
  // LEG 1 — exact b2b sequence: click card body at y=400, then Enter
  toDraft('d1'), wait(900), probe('L1-draftUp'), shot('certB3-dc2-L1'),
  click(800, 400), wait(900), probe('L1-afterCardClick'),
  key('Enter', 90), wait(1200), probe('L1-afterEnter'),
  ...nextRoom,
  // LEG 2 — control: Enter with no preceding card click
  toDraft('d2'), wait(900), probe('L2-draftUp'),
  key('Enter', 90), wait(1200), probe('L2-afterEnter'),
  ...nextRoom,
  // LEG 3 — click Take directly at the computed offset
  toDraft('d3'), wait(900), probe('L3-draftUp'),
  click(728, 536), wait(1200), probe('L3-afterTakeClick'),
]);
