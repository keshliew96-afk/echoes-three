// certE3 batch 4 — shadow-attachment A/B: two frames, camera centred, ground scrolled.
import { writeFileSync } from 'fs';
const ev = (c) => ({ type: 'eval', code: c });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (n) => ({ type: 'shot', name: n });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const at = (tag, x, z, name) => [
  ev(iife(`E.cmd('teleport',${x},${z});return 'tp ${tag}'`)), wait(1600), shot(name),
  ev(iife(`const c=E.cmd('campState');const h=c.prompt.critters.find(k=>k.classId==='healer');return {tag:${JSON.stringify(tag)},world:[c.player.x,c.player.z],healerBox:h,base:[+(h.x+h.w/2).toFixed(1),+(h.y+h.h).toFixed(1)]}`)),
];
const acts = [...at('A', 0.0, 4.5, 'certE3-attach-a'), ...at('B', 0.9, 4.5, 'certE3-attach-b'), ...at('A2', 0.0, 4.5, 'certE3-attach-a2')];
writeFileSync('tools/actions/certE3-attach.json', JSON.stringify(acts, null, 1));
console.log('wrote', acts.length);
