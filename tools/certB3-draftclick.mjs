import { ev, wait, key, shot, click, mm, iife, waitFor } from './certB3-parts2.mjs';
import { write } from './certB3-gen.mjs';

const probe = (tag) => ev(iife(`const u=E.runUi();const s=E.state();
const n=[...document.querySelectorAll('#run-screen .rn-card, #run-screen .rn-btn')].map(x=>{const r=x.getBoundingClientRect();return [x.className,(x.textContent||'').replace(/\\s+/g,' ').trim().slice(0,26),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}).filter(a=>a[4]>0);
const evs=(E.events||[]).slice(-14).map(e=>e.type+'@'+e.tick);
return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,phase:u.phase,room:u.room,freeSlots:u.freeSkillSlots,skills:s.skills.map(k=>k&&k.id),bench:s.build.bench,cardBox:u.cards[0]&&u.cards[0].box,nodes:n,events:evs}`));

const toDraft = (label) => ({ type: 'loop', label, maxMs: 90000,
  cond: `window.__echoes.runUi().screen==='draft'`,
  body: [ev(iife(`if(E.state().enemies.length>0)E.cmd('killAllEnemies');return E.state().enemies.length`)), wait(350)] });

write('certB3-draftclick', [
  wait(1200), mm(800, 450),
  ev(iife(`E.cmd('startRun');return {seed:E.seed}`)),
  toDraft('toDraft1'), wait(900),
  probe('A-before'), shot('certB3-draftclick-A'),
  click(800, 413), wait(1200),
  probe('A-after-cardClick'),
  // walk on to the next draft
  { type: 'if', cond: `window.__echoes.runUi().screen==='path'`, then: [click(703, 399), wait(1200)] },
  toDraft('toDraft2'), wait(900),
  probe('B-before'), shot('certB3-draftclick-B'),
  click(728, 536), wait(1200),
  probe('B-after-takeClick'),
  { type: 'if', cond: `window.__echoes.runUi().screen==='path'`, then: [click(703, 399), wait(1200)] },
  toDraft('toDraft3'), wait(900),
  probe('C-before'),
  key('Enter', 100), wait(1200),
  probe('C-after-enter'),
]);
