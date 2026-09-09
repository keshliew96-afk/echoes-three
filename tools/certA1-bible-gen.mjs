// certA1-bible critic: action generator (JSON.stringify, never hand-escaped).
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const cardStyle = (x, y, tag) => ev(iife(`const el=document.elementFromPoint(${x},${y});const card=el&&(el.closest('.rn-card')||el.closest('button')||el);if(!card)return {tag:${JSON.stringify(tag)},none:true};const cs=getComputedStyle(card);const r=card.getBoundingClientRect();return {tag:${JSON.stringify(tag)},tick:E.tick,cls:card.className,box:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],transform:cs.transform,boxShadow:cs.boxShadow,border:cs.borderColor,filter:cs.filter,bg:cs.backgroundColor,outline:cs.outlineColor,hover:card.matches(':hover')}`));
const files = {};
files['certA1-bible-shop'] = [
  ev(iife(`return 'armed '+E.tick+' seed '+E.seed+' v'+E.version`)),
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {tick:E.tick,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode}`)),
  wait(1800),
  ev(iife(`return {tag:'s0',tick:E.tick,fps:E.fps,ui:E.runUi().screen,cards:E.runUi().cards.map(c=>[c.name,c.opacity,c.box.x,c.box.y])}`)),
  shot('certA1-bible-shop-s0'),
  wait(400),
  ev(iife(`return {tag:'s1',tick:E.tick}`)),
  shot('certA1-bible-shop-s1'),
  { type: 'mousemove', x: 528, y: 390 },
  wait(350),
  cardStyle(528, 390, 'hoverBounce'),
  shot('certA1-bible-shop-hover'),
  { type: 'mousemove', x: 1072, y: 390 },
  wait(350),
  cardStyle(1072, 390, 'hoverAscend'),
  shot('certA1-bible-shop-hoverAscend'),
  { type: 'mousemove', x: 800, y: 569 },
  wait(350),
  cardStyle(800, 569, 'hoverAdvance'),
  ev(iife(`return {tag:'end',tick:E.tick,fps:E.fps,ui:E.runUi().screen,wallet:E.runUi().wallet}`)),
];
for (const [name, actions] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(actions, null, 1));
  console.log('wrote tools/actions/' + name + '.json (' + actions.length + ' steps)');
}
