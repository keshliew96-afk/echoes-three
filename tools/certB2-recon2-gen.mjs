// certB2 recon 2 — NOT evidence. Drives a cmd-forced run to the first NODE draft so the
// socket overlay's live rects can be measured for the certified generator's click grid.
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const IF = (cond, then) => ({ type: 'if', cond: iife(`return !!(${cond})`), then });
const LOOP = (label, cond, maxMs, body) => ({ type: 'loop', label, cond: iife(`return !!(${cond})`), maxMs, body });

const rr = `(n)=>{const r=n.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),Math.round(r.x+r.width/2),Math.round(r.y+r.height/2)]}`;

const A = [];
A.push(ev(iife(`window.__sock=null;const r=E.cmd('startRun');return {v:E.version,run:r.room,rewardFor:r.rewardFor}`)));
A.push(LOOP('to-socket', `window.__sock`, 120000, [
  ev(iife(`const u=E.runUi();const so=document.querySelector('#socket-screen');const open=so&&(so.classList.contains('nd-open')||getComputedStyle(so).display!=='none');window.__st={screen:u.screen,open:!!open,room:E.state().run.room};return null`)),
  IF(`window.__st.open`, [
    ev(iife(`const R=${rr};const cs=[...document.querySelectorAll('#socket-screen .nd-bench .nd-card')];const cells=[...document.querySelectorAll('#socket-screen .nd-cell')];
const all=[...document.querySelectorAll('#socket-screen *')].filter(n=>typeof n.className==='string'&&n.className&&n.getBoundingClientRect().width>8).slice(0,50).map(n=>[n.className.slice(0,34),...R(n)]);
window.__sock={benchSel:cs.length,cellSel:cells.length,bench:cs.map(n=>[n.className.slice(0,24),...R(n),(n.textContent||'').replace(/\\s+/g,' ').trim().slice(0,24)]),cells:cells.map(n=>[n.className.slice(0,30),...R(n)]),all};return window.__sock`)),
    shot('certB2-recon2-socket'),
    key('Escape', 80), wait(500),
  ]),
  IF(`!window.__st.open && window.__st.screen==='none'`, [ev(iife(`E.cmd('killAllEnemies');return null`)), wait(400)]),
  IF(`!window.__st.open && window.__st.screen!=='none' && window.__st.screen!=='end'`, [key('Enter', 70), wait(700)]),
  IF(`!window.__st.open && window.__st.screen==='end'`, [ev(iife(`window.__sock={none:'reached end with no socket screen'};return null`))]),
  wait(150),
]));
A.push(ev(iife(`return {socket:window.__sock,screen:E.runUi().screen,room:E.state().run.room,bench:E.state().build.bench,sockets:E.state().build.skills.map(k=>[k.id,k.sockets&&k.sockets.map(s=>s&&s.node)])}`)));

writeFileSync('tools/actions/certB2-recon2.json', JSON.stringify(A, null, 1));
console.log('wrote tools/actions/certB2-recon2.json', A.length, 'steps');
