// certA1-player critic — probe generator #3: shop denial plaque-shake burst + hover state, DOM rects between shots.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const rects = (tag) => ev(iife(`const u=E.runUi();const pl=[...document.querySelectorAll('#run-screen .rn-plaque, #run-screen [class*=plaque]')].map(p=>{const r=p.getBoundingClientRect();const st=getComputedStyle(p);return [p.className,+r.x.toFixed(2),+r.y.toFixed(2),st.transform,st.animationName]});const cs=[...document.querySelectorAll('#run-screen .rn-card')].map(c=>{const r=c.getBoundingClientRect();const st=getComputedStyle(c);return [c.className,+r.x.toFixed(2),+r.y.toFixed(2),st.transform,st.boxShadow.slice(0,60),st.borderColor,st.filter]});return {tag:${JSON.stringify(tag)},tick:E.tick,wallet:u.wallet,plaques:u.plaques,pl,cards:cs,hoverEl:(document.querySelectorAll(':hover').length?[...document.querySelectorAll(':hover')].pop().className:null)}`));
const files = {};
files['certA1-player-deny'] = [
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {seed:E.seed,room:r&&r.room,phase:r&&r.phase}`)),
  wait(1800),
  rects('rest'),
  { type: 'mousemove', x: 528, y: 390 }, wait(400), rects('hover-bounce'),
  { type: 'click', x: 528, y: 390 }, wait(400),
  { type: 'mousemove', x: 800, y: 390 }, wait(200), { type: 'click', x: 800, y: 390 }, wait(400),
  rects('after-two-buys'),
  { type: 'mousemove', x: 1072, y: 390 }, wait(200),
  { type: 'click', x: 1072, y: 390 },
  rects('deny+0'),
  shot('certA1-player-deny-b0'),
  rects('deny+shot1'),
  shot('certA1-player-deny-b1'),
  rects('deny+shot2'),
  wait(600),
  rects('deny+600ms'),
];
for (const [name, acts] of Object.entries(files)) { writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); }
