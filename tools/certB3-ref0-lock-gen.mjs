// Refuter probe 3: while the reward screen is open, is KeyD still a MOVEMENT key?
// If the player body does not move, D is unambiguously the screen's "choose right".
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });

const POS = (tag) => `(()=>{const E=window.__echoes;const s=E.state();
const p=(s.party&&s.party[0])||(s.party||[])[0]||null;
const xz=p?[+(p.x??p.pos?.x??0).toFixed(3),+(p.z??p.pos?.z??0).toFixed(3)]:null;
const btn=[...document.querySelectorAll('#run-screen .rn-btn')].filter(b=>/rn-focus/.test(b.className)).map(b=>(b.textContent||'').trim().slice(0,8));
return {tag:${JSON.stringify(tag)},tick:E.tick,ui:(()=>{try{return E.runUi().screen}catch(e){return 'ERR'}})(),
pos:xz,party:(s.party||[]).map(q=>[+(q.x??0).toFixed(2),+(q.z??0).toFixed(2)]),focus:btn,
held:(()=>{try{return E.runUi().held}catch(e){return 'na'}})()}})()`;

const A = [];
A.push({ type: 'wait', ms: 1200 });
A.push({ type: 'eval', code: `(()=>{const E=window.__echoes;window.__r0={ev:[]};for(const t of ["room_cleared","draft_taken"])E.on(t,()=>window.__r0.ev.push(t+'@'+E.tick));return 'armed3 v'+E.version})()` });
A.push({ type: 'mousemove', x: 800, y: 450 });
A.push({ type: 'eval', code: `(()=>{const E=window.__echoes;E.cmd('startRun');return {seed:E.seed}})()` });
A.push({ type: 'wait', ms: 900 });
// baseline: movement DOES work during combat
A.push({ type: 'eval', code: POS('C1-incombat-before') });
A.push({ type: 'keydown', key: 'KeyD' });
A.push({ type: 'wait', ms: 700 });
A.push({ type: 'keyup', key: 'KeyD' });
A.push({ type: 'wait', ms: 200 });
A.push({ type: 'eval', code: POS('C2-incombat-after-700ms-D') });
A.push({
  type: 'loop', label: 'lock-clear', maxMs: 60000,
  cond: `window.__r0.ev.some(e=>e.startsWith('room_cleared'))`,
  body: [
    { type: 'eval', code: `(()=>{const E=window.__echoes;if(E.state().enemies.length>0)E.cmd('killAllEnemies');return E.state().enemies.length})()` },
    { type: 'wait', ms: 100 },
  ],
});
A.push({ type: 'wait', ms: 1500 });
A.push({ type: 'eval', code: POS('C3-onscreen-before') });
A.push({ type: 'keydown', key: 'KeyD' });
A.push({ type: 'wait', ms: 700 });
A.push({ type: 'eval', code: POS('C4-onscreen-while-D-held') });
A.push({ type: 'keyup', key: 'KeyD' });
A.push({ type: 'wait', ms: 300 });
A.push({ type: 'eval', code: POS('C5-onscreen-after') });
A.push({ type: 'shot', name: 'certB3-ref0-lock-screen' });
// and Escape: the documented decline key
A.push({ type: 'key', key: 'Escape', ms: 90 });
A.push({ type: 'wait', ms: 1200 });
A.push({ type: 'eval', code: POS('C6-after-Escape') });

writeFileSync('tools/actions/certB3-ref0-lock.json', JSON.stringify(A));
console.log('wrote tools/actions/certB3-ref0-lock.json steps=', A.length);
