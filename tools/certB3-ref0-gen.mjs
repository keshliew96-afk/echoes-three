// Refuter probe generator (prefix certB3-ref0-). Writes action JSON programmatically.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });

const ARM = `(()=>{const E=window.__echoes;
const R=window.__r0={ev:[],keys:[],tl:[],tClear:performance.now()};
for(const t of ["run_start","room_enter","room_start","room_cleared","draft_taken","skill_equip","node_granted","path_chosen","reward_offer","reward","draft"])E.on(t,()=>{R.ev.push({T:t,tick:E.tick,now:Math.round(performance.now())})});
const info=()=>{const s=document.getElementById('run-screen');if(!s)return{none:true,ui:'no-node'};const cs=getComputedStyle(s);const r=s.getBoundingClientRect();
const btns=[...s.querySelectorAll('.rn-btn')].map(b=>[b.className,(b.textContent||'').replace(/\\s+/g,' ').trim().slice(0,9)]);
return{op:+(+cs.opacity).toFixed(3),disp:cs.display,vis:cs.visibility,w:Math.round(r.width),h:Math.round(r.height),
ui:(()=>{try{return E.runUi().screen}catch(e){return 'ERR'}})(),
focus:btns.filter(b=>/rn-focus/.test(b[0])).map(b=>b[1]),btns:btns.map(b=>b[1])}};
R.info=info;
window.addEventListener('keydown',e=>{R.keys.push({k:e.code,rep:e.repeat,dt:Math.round(performance.now()-R.tClear),tick:E.tick,s:info()})},true);
window.addEventListener('keyup',e=>{R.keys.push({k:e.code+'-UP',dt:Math.round(performance.now()-R.tClear),tick:E.tick,s:info()})},true);
E.on('room_cleared',()=>{R.tClear=performance.now();R.tl=[];const t0=performance.now();let last='';
const f=()=>{const d=performance.now()-t0;const i=info();const k=JSON.stringify([i.op,i.ui,i.focus,i.disp,i.w,i.vis]);
if(k!==last){last=k;R.tl.push(Object.assign({dt:Math.round(d)},i))}
if(d<1600)requestAnimationFrame(f);else R.tl.push(Object.assign({dt:Math.round(d),END:1},i))};requestAnimationFrame(f)});
return 'armed v'+E.version+' t'+E.tick})()`;

const D = (tag) => `(()=>{const E=window.__echoes;const R=window.__r0;const i=R.info();
return {tag:${JSON.stringify(tag)},tick:E.tick,dtClear:Math.round(performance.now()-R.tClear),ui:i.ui,op:i.op,w:i.w,vis:i.vis,
focus:i.focus,btns:i.btns,skills:E.state().skills.map(k=>k&&k.id),
free:(()=>{try{return E.runUi().freeSkillSlots}catch(e){return null}})(),
held:(()=>{try{return E.runUi().held}catch(e){return 'na'}})(),stale:(()=>{try{return E.runUi().stale}catch(e){return 'na'}})(),
takes:R.ev.filter(e=>e.T==='draft_taken').length,
socket:(()=>{const n=document.getElementById('socket-screen');return !!n&&n.classList.contains('nd-open')})()}})()`;

const KEYS = (tag) => `(()=>{const R=window.__r0;const k=R.keys.splice(0);const t=R.tl.splice(0);
return {tag:${JSON.stringify(tag)},keys:k,tl:t}})()`;

const TEXT = (tag) => `(()=>{const s=document.getElementById('run-screen');
return {tag:${JSON.stringify(tag)},text:(s?(s.textContent||''):'').replace(/\\s+/g,' ').trim().slice(0,260),
cls:(s?[...s.querySelectorAll('.rn-btn')].map(b=>b.className):[])}})()`;

const mark = { type: 'eval', code: `(()=>{const E=window.__echoes;window.__r0.mk=E.tick;return 'mark '+E.tick})()` };
const clearLoop = (label) => ({
  type: 'loop', label, maxMs: 95000,
  cond: `window.__r0.ev.some(e=>e.T==='room_cleared'&&e.tick>=window.__r0.mk)`,
  body: [
    { type: 'eval', code: `(()=>{const E=window.__echoes;if(E.state().enemies.length>0)E.cmd('killAllEnemies');return E.state().enemies.length})()` },
    { type: 'wait', ms: 200 },
  ],
});
const closeSocket = [{
  type: 'if',
  cond: `(()=>{const n=document.getElementById('socket-screen');return !!n&&n.classList.contains('nd-open')})()`,
  then: [{ type: 'key', key: 'Escape', ms: 100 }, { type: 'wait', ms: 900 }],
}];
const doorIfPath = [{
  type: 'if', cond: `window.__echoes.runUi().screen==='path'`,
  then: [{ type: 'click', x: 703, y: 399 }, { type: 'wait', ms: 1500 }],
}];

const A = [];
A.push({ type: 'wait', ms: 1200 });
A.push({ type: 'eval', code: ARM });
A.push({ type: 'mousemove', x: 800, y: 450 });
A.push({ type: 'eval', code: `(()=>{const E=window.__echoes;E.cmd('startRun');return {seed:E.seed,ver:E.version}})()` });
A.push({ type: 'wait', ms: 800 });

// ---- ROOM 1: exact reproduction of critic leg B (KeyD tap right after the clear) + instrumentation
A.push(mark, clearLoop('L1-clear'));
A.push({ type: 'key', key: 'KeyD', ms: 60 });
A.push({ type: 'wait', ms: 1500 });
A.push({ type: 'shot', name: 'certB3-ref0-L1-afterKeyD' });
A.push({ type: 'eval', code: D('L1-repro-afterKeyD') });
A.push({ type: 'eval', code: KEYS('L1-keylog') });
A.push({ type: 'eval', code: TEXT('L1-screentext') });
A.push({ type: 'key', key: 'Enter', ms: 90 });
A.push({ type: 'wait', ms: 1400 });
A.push({ type: 'eval', code: D('L1-afterEnter') });
A.push(...closeSocket, ...doorIfPath);

// ---- ROOM 2: LATE tap. Screen fully settled (3 s), then the same single KeyD tap.
A.push(mark, clearLoop('L2-clear'));
A.push({ type: 'wait', ms: 3000 });
A.push({ type: 'eval', code: D('L2-settled-nokey') });
A.push({ type: 'key', key: 'KeyD', ms: 60 });
A.push({ type: 'wait', ms: 700 });
A.push({ type: 'shot', name: 'certB3-ref0-L2-lateKeyD' });
A.push({ type: 'eval', code: D('L2-after-late-KeyD') });
A.push({ type: 'key', key: 'KeyW', ms: 60 });
A.push({ type: 'wait', ms: 500 });
A.push({ type: 'eval', code: D('L2-after-KeyW') });
A.push({ type: 'key', key: 'KeyS', ms: 60 });
A.push({ type: 'wait', ms: 500 });
A.push({ type: 'eval', code: D('L2-after-KeyS') });
A.push({ type: 'key', key: 'KeyA', ms: 60 });
A.push({ type: 'wait', ms: 500 });
A.push({ type: 'eval', code: D('L2-after-KeyA') });
A.push({ type: 'eval', code: KEYS('L2-keylog') });
A.push({ type: 'key', key: 'Enter', ms: 90 });
A.push({ type: 'wait', ms: 1400 });
A.push({ type: 'eval', code: D('L2-afterEnter') });
A.push(...closeSocket, ...doorIfPath);

// ---- ROOM 3: PRE-CLEAR tap. KeyD pressed AND released ~900 ms before the room clears.
A.push(mark);
A.push({ type: 'key', key: 'KeyD', ms: 60 });
A.push({ type: 'wait', ms: 900 });
A.push(clearLoop('L3-clear'));
A.push({ type: 'wait', ms: 1500 });
A.push({ type: 'eval', code: D('L3-preclear-tap') });
A.push({ type: 'eval', code: KEYS('L3-keylog') });
A.push({ type: 'key', key: 'Enter', ms: 90 });
A.push({ type: 'wait', ms: 1400 });
A.push({ type: 'eval', code: D('L3-afterEnter') });
A.push(...closeSocket, ...doorIfPath);

// ---- ROOM 4: HELD across the boundary (KeyD held down through room_cleared, released after)
A.push(mark);
A.push({ type: 'keydown', key: 'KeyD' });
A.push(clearLoop('L4-clear'));
A.push({ type: 'wait', ms: 800 });
A.push({ type: 'eval', code: D('L4-while-held') });
A.push({ type: 'keyup', key: 'KeyD' });
A.push({ type: 'wait', ms: 900 });
A.push({ type: 'eval', code: D('L4-after-release') });
A.push({ type: 'eval', code: KEYS('L4-keylog') });
A.push({ type: 'key', key: 'Enter', ms: 90 });
A.push({ type: 'wait', ms: 1400 });
A.push({ type: 'eval', code: D('L4-afterEnter') });
A.push(...closeSocket, ...doorIfPath);

// ---- ROOM 5: control, no key at all (critic leg A)
A.push(mark, clearLoop('L5-clear'));
A.push({ type: 'wait', ms: 1500 });
A.push({ type: 'eval', code: D('L5-control-nokey') });
A.push({ type: 'eval', code: KEYS('L5-keylog') });
A.push({ type: 'key', key: 'Enter', ms: 90 });
A.push({ type: 'wait', ms: 1400 });
A.push({ type: 'eval', code: D('L5-afterEnter') });
A.push({ type: 'eval', code: `(()=>{const R=window.__r0;return {tag:'ALL-EVENTS',ev:R.ev.map(e=>e.T+'@'+e.tick)}})()` });

writeFileSync('tools/actions/certB3-ref0-window.json', JSON.stringify(A));
console.log('wrote tools/actions/certB3-ref0-window.json steps=', A.length);
