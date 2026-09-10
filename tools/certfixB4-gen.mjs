// certfixB4 — fix builder B round 4, action-file generator (B-r3-F1 reward focus).
//   node tools/certfixB4-gen.mjs
// writes tools/actions/certfixB4-focus.json   (legs A-F: the critic's A-D + inherit + held)
//        tools/actions/certfixB4-focus2.json  (legs G-K: grace-window edges, path page, Space/Esc)
//        tools/actions/certfixB4-b2b.json     (full 8-room real-input run, the certB3-b2b strafing pattern)
import { ev, wait, key, down, up, shot, click, mm, iife, waitFor, write, arm, focus, clearRoom,
         escSocket, doPath, events, fightLoop, screenLoop, dumpUi, portalStart, campBack, SOCK_OPEN } from './certfixB4-parts.mjs';

const start = [wait(1200), arm, mm(800, 450), ev(iife(`E.cmd('startRun');return {seed:E.seed,ver:E.version}`))];
const enter = (tag) => [key('Enter', 90), wait(1200), focus(`${tag}-afterEnter`), escSocket];

// ------------------------------------------------------------ focus (A-F) --
write('certfixB4-focus', [
  ...start,
  // A (room 1): control — no key after the clear. Expect Take focused; Enter takes.
  ...clearRoom('clearA'), wait(1500), focus('A-no-key'), shot('certfixB4-focus-A'), ...enter('A'), doPath,
  // B (room 2): the critic's repro — ONE fresh KeyD tap right after the clear. Expect Take; Enter takes.
  ...clearRoom('clearB'), key('KeyD', 60), focus('B-just-after-tap'), wait(1500), focus('B-settled'), shot('certfixB4-focus-B'), ...enter('B'), doPath,
  // C (room 3): one fresh KeyA tap. Expect Take; Enter takes.
  ...clearRoom('clearC'), key('KeyA', 60), wait(1500), focus('C-settled'), ...enter('C'), doPath,
  // D (room 4): the documented binding AFTER the grace — KeyD moves to Decline, arrows move back and forth, Esc declines.
  ...clearRoom('clearD'), wait(1500), key('KeyD', 60), wait(300), focus('D-lateKeyD'),
  key('ArrowLeft', 60), wait(300), focus('D-afterArrowLeft'),
  key('ArrowRight', 60), wait(300), focus('D-afterArrowRight'), shot('certfixB4-focus-D-decline'),
  key('Escape', 60), wait(1200), focus('D-afterEsc'), doPath,
  // E (room 5): inheritance — the previous page ended on Decline; a fresh page with NO key for 3 s must open on Take.
  ...clearRoom('clearE'), wait(3000), focus('E-inherit-check'), shot('certfixB4-focus-E'), ...enter('E'), doPath,
  // F (room 6): KeyD HELD across the clear (strafing player), released 900 ms later. Expect Take throughout.
  down('KeyD'), ...clearRoom('clearF'), focus('F-held-at-open'), wait(900), up('KeyD'), wait(600), focus('F-after-release'), ...enter('F'),
  events('focus-events'),
]);

// ------------------------------------------------------- focus2 (G-K) --
const pathFocus = (tag) => focus(tag);
write('certfixB4-focus2', [
  ...start,
  // G (room 1): KeyD pressed INSIDE the grace and held PAST it — must never count; a later fresh tap counts.
  ...clearRoom('clearG'), wait(120), down('KeyD'), wait(700), up('KeyD'), wait(300), focus('G-pressed-in-grace-held-past'),
  key('KeyD', 60), wait(300), focus('G-fresh-tap-settled'), key('ArrowLeft', 60), wait(300), focus('G-back-to-take'),
  key('Enter', 90), wait(150),
  // P (path page after room 1): KeyD in the path's grace is ignored; after it, KeyD focuses door 2, ArrowLeft door 1, Enter walks through door 1.
  key('KeyD', 60), wait(100), pathFocus('P-KeyD-in-grace'), wait(600), key('KeyD', 60), wait(250), pathFocus('P-KeyD-settled'),
  key('ArrowLeft', 60), wait(250), pathFocus('P-ArrowLeft'), key('Enter', 90), wait(1400), pathFocus('P-afterEnter'),
  // H (room 2): a dodge-mash Space landing inside the grace must not commit; a settled Enter takes.
  ...clearRoom('clearH'), key('Space', 45), wait(120), focus('H-space-in-grace'), wait(1500), ...enter('H'), doPath,
  // I (room 3): the b2b fight-body TAIL landing on the fresh page (A tap, two skill keys, D tap). The skill keys are
  // carry-over and restart the settle, so the D (~400 ms) is dropped: expect Take.
  ...clearRoom('clearI'), down('KeyA'), wait(120), up('KeyA'), key('Digit2', 45), key('Digit3', 45), down('KeyD'), wait(120), up('KeyD'),
  wait(1500), focus('I-burst-settled'), ...enter('I'), doPath,
  // J (room 4): ArrowRight inside the grace is ignored too (same binding as D).
  ...clearRoom('clearJ'), key('ArrowRight', 60), wait(1500), focus('J-arrowright-in-grace'), ...enter('J'), doPath,
  // K (room 5): Esc is the decline path and is honoured at once (it has no combat meaning).
  ...clearRoom('clearK'), key('Escape', 60), wait(1200), focus('K-esc-at-open'), doPath,
  // L (room 6): the cap — a page quiet for 2 s is settled for good; a skill key then no longer restarts it, so the D right after it counts.
  ...clearRoom('clearL'), wait(2000), key('Digit2', 45), wait(100), key('KeyD', 60), wait(300), focus('L-D-after-late-carry'), key('ArrowLeft', 60), wait(300), focus('L-back-to-take'), ...enter('L'),
  events('focus2-events'),
]);

// --------------------------------------------------------- full run --
const markRoom = (i) => ev(iife(`window.__f.rt=window.__f.rt||{};window.__f.rt[${i}]={t0:performance.now(),tick0:E.tick};return {markRoom:${i},startTick:E.tick,uiRoom:E.state().run.room,mode:E.state().run.mode}`));
const endRoom = (i) => ev(iife(`const r=window.__f.rt[${i}];r.ms=Math.round(performance.now()-r.t0);r.ticks=E.tick-r.tick0;const u=E.runUi();return {endRoom:${i},wallS:+(r.ms/1000).toFixed(1),ticks:r.ticks,screen:u.screen,socketOpen:${SOCK_OPEN},phase:u.phase,uiRoom:u.room,wallet:u.wallet,takes:window.__f.ev.filter(e=>e.T==='draft_taken').length,declines:window.__f.ev.filter(e=>e.T==='draft_declined').length}`));
const acts = [wait(1200), arm, ...portalStart('b2b'), wait(1200), shot('certfixB4-b2b-r1-enter')];
for (let i = 1; i <= 8; i++) {
  acts.push(markRoom(i));
  acts.push({ type: 'mousedown', button: 'right' });
  acts.push(fightLoop(i, 240000));
  acts.push({ type: 'mouseup', button: 'right' });
  acts.push(wait(600));
  acts.push(endRoom(i));
  if (i === 8) break;
  acts.push(screenLoop(`b2b-r${i}`, 120000));
}
acts.push({ type: 'if', cond: SOCK_OPEN, then: [key('Escape', 100), wait(1000)] });
acts.push(waitFor(`window.__echoes.runUi().screen==='end'`, 60000, `,screen:E.runUi().screen,phase:E.runUi().phase`));
acts.push(wait(1200));
acts.push(shot('certfixB4-b2b-victory'));
acts.push(dumpUi('b2b-victory'));
acts.push(ev(iife(`return {summary:JSON.stringify(E.cmd('runState').summary)}`)));
acts.push(click(800, 532)); acts.push(wait(1600));
acts.push({ type: 'if', cond: `window.__echoes.runUi().screen==='end'`, then: [key('Enter', 100), wait(1800)] });
acts.push(...campBack('b2b'));
acts.push(ev(iife(`const F=window.__f;return {tag:'b2b-final',takes:F.ev.filter(e=>e.T==='draft_taken').map(e=>e.d.id+'@'+e.tick),declines:F.ev.filter(e=>e.T==='draft_declined').map(e=>e.tick),paths:F.ev.filter(e=>e.T==='path_chosen').map(e=>e.d.side),roomTimes:Object.fromEntries(Object.entries(F.rt).map(([k,v])=>[k,+(v.ms/1000).toFixed(1)])),counts:F.n}`)));
// every key that landed on a meta page, with its ms-since-open — the timing evidence for the grace window
acts.push(ev(iife(`const F=window.__f;const on=F.keys.filter(k=>k.scr!=='none');return {tag:'b2b-keys-on-pages',n:on.length,byPage:on.reduce((m,k)=>{(m[k.scr]=m[k.scr]||[]).push(k.c+'@'+k.ms);return m},{}),navInGrace:on.filter(k=>['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(k.c)&&k.ms<300).map(k=>k.scr+':'+k.c+'@'+k.ms),navAfterGrace:on.filter(k=>['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(k.c)&&k.ms>=300).map(k=>k.scr+':'+k.c+'@'+k.ms)}`)));
acts.push(events('b2b-events'));
write('certfixB4-b2b', acts);
