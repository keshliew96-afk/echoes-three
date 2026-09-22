// Certification block E round 3 — batch 3: contact-shadow A/B on open ground.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;

const spot = (tag, x, z, shotName) => [
  ev(iife(`E.cmd('teleport',${x},${z});return 'tp ${tag}'`)),
  wait(1400),
  shot(shotName),
  ev(iife(`const c=E.cmd('campState');const h=c.prompt.critters.find(k=>k.classId==='healer');return {tag:${JSON.stringify(tag)},world:[c.player.x,c.player.z],healerBox:h,baseXY:h?[+(h.x+h.w/2).toFixed(1),+(h.y+h.h).toFixed(1)]:null,propShadows:c.propShadows,emitters:c.emitters,tick:E.tick}`)),
  wait(300),
  shot(shotName + 'b'),
];

const acts = [
  ev(iife(`return {ver:E.version,scene:E.state().scene,toggles:JSON.stringify(E.state().toggles)}`)),
  ...spot('open-NW', -3.0, 6.5, 'certE3-shadow-a'),
  ...spot('open-E', 9.6, 4.6, 'certE3-shadow-b'),
  ...spot('road-W', -9.0, 2.7, 'certE3-shadow-c'),
];
writeFileSync('tools/actions/certE3-shadow.json', JSON.stringify(acts, null, 1));
console.log('wrote certE3-shadow', acts.length);
