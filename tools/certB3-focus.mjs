import { ev, wait, key, shot, click, mm, iife, waitFor, arm2 } from './certB3-parts2.mjs';
import { write } from './certB3-gen.mjs';

const focus = (tag) => ev(iife(`const n=[...document.querySelectorAll('#run-screen .rn-btn')].map(x=>[x.className,(x.textContent||'').replace(/\\s+/g,' ').trim().slice(0,10)]);
return {tag:${JSON.stringify(tag)},tick:E.tick,screen:E.runUi().screen,focused:n.filter(a=>/rn-focus/.test(a[0])).map(a=>a[1]),buttons:n,skills:E.state().skills.map(k=>k&&k.id),freeSlots:E.runUi().freeSkillSlots,takes:window.__b3.ev.filter(e=>e.T==='draft_taken').length}`));
// clear the room with killAllEnemies (diagnostic run only) and stop the instant room_cleared fires
const clearRoom = (label) => [
  ev(iife(`window.__b3.mk=E.tick;return 'mark '+E.tick`)),
  { type: 'loop', label, maxMs: 60000,
    cond: `window.__b3.ev.some(e=>e.T==='room_cleared'&&e.tick>=window.__b3.mk)`,
    body: [ev(iife(`if(E.state().enemies.length>0)E.cmd('killAllEnemies');return E.state().enemies.length`)), wait(200)] },
];
const takeAndAdvance = [
  key('ArrowLeft', 80), wait(400), key('Enter', 90), wait(1200),
  { type: 'if', cond: `window.__echoes.runUi().screen==='path'`, then: [click(703, 399), wait(1400)] },
];

write('certB3-focus', [
  wait(1200), arm2, mm(800, 450),
  ev(iife(`E.cmd('startRun');return {seed:E.seed}`)),
  // ---- CONTROL: clear the room, press NOTHING, look at the reward focus
  ...clearRoom('clearA'), wait(1500), shot('certB3-focus-A-noinput'), focus('A-no-key-pressed'),
  ...takeAndAdvance, focus('A-after-take'),
  // ---- CASE B: identical, but one fresh KeyD tap ~200 ms after room_cleared
  ...clearRoom('clearB'), key('KeyD', 60), wait(1500), shot('certB3-focus-B-afterKeyD'), focus('B-one-KeyD-tap'),
  ev(iife(`const u=E.runUi();return {tag:'B-heldstale',held:u.held,stale:u.stale}`)),
  key('Enter', 90), wait(1300), focus('B-afterEnter'),
  { type: 'if', cond: `window.__echoes.runUi().screen==='path'`, then: [click(703, 399), wait(1400)] },
  // ---- CASE C: identical, but one fresh KeyA tap
  ...clearRoom('clearC'), key('KeyA', 60), wait(1500), focus('C-one-KeyA-tap'),
  ...takeAndAdvance, focus('C-after-take'),
  // ---- CASE D: KeyD tap, then correct it with ArrowLeft before Enter
  ...clearRoom('clearD'), key('KeyD', 60), wait(1200), focus('D-one-KeyD-tap'),
  key('ArrowLeft', 80), wait(400), focus('D-afterArrowLeft'),
  key('Enter', 90), wait(1300), focus('D-afterEnter'),
]);
