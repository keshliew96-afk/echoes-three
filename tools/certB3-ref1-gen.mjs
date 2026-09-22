import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('tools/actions', { recursive: true });

const ARM = `(()=>{const E=window.__echoes;
window.__r={ev:[],cleared:null,scr:[],mk:E.tick,openAt:null};
const R=window.__r;
for(const t of ["run_start","room_enter","room_start","room_cleared","draft_taken","path_chosen","node_granted","skill_equip","run_end"])
  E.on(t,e=>{R.ev.push({T:t,tick:(e&&e.tick!=null)?e.tick:E.tick});if(t==='room_cleared'){R.cleared=performance.now();R.openAt=null;}});
R.iv=setInterval(()=>{try{const s=E.runUi().screen;const L=R.scr[R.scr.length-1];if(!L||L.s!==s){R.scr.push({s,t:Math.round(performance.now())});if(s==='draft'&&R.cleared!=null&&R.openAt==null)R.openAt=Math.round(performance.now()-R.cleared);}}catch(_){}} ,8);
return 'armed tick '+E.tick})()`;

const snap = (tag) => ({ type:'eval', code:`(()=>{const E=window.__echoes;const R=window.__r;const u=E.runUi();
const btns=[...document.querySelectorAll('#run-screen .rn-btn')].map(x=>{const cs=getComputedStyle(x);const r=x.getBoundingClientRect();
 return {cls:x.className,txt:(x.textContent||'').replace(/\s+/g,' ').trim().slice(0,12),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
 bg:cs.backgroundColor,bc:cs.borderColor,bw:cs.borderWidth,sh:(cs.boxShadow||'').slice(0,70),tr:cs.transform,op:cs.opacity}});
const rs=document.getElementById('run-screen');const cs=rs?getComputedStyle(rs):null;
const p=(E.state().party||[])[0]||{};const p0={};for(const k of ['id','x','z','hp'])if(p[k]!=null)p0[k]=(typeof p[k]==='number'?+p[k].toFixed(3):p[k]);
const so=document.getElementById('socket-screen');
return {tag:${JSON.stringify(tag)},tick:E.tick,msSinceCleared:R.cleared!=null?Math.round(performance.now()-R.cleared):null,draftOpenedAtMs:R.openAt,
 screen:u.screen,fade:u.fade,veil:u.veil,held:u.held,stale:u.stale,rsOpacity:cs?cs.opacity:null,rsDisplay:cs?cs.display:null,
 text:(u.text||'').replace(/\s+/g,' ').slice(0,70),sub:(u.subline||'').replace(/\s+/g,' ').slice(0,90),
 focused:btns.filter(b=>/rn-focus/.test(b.cls)).map(b=>b.txt),btns,
 skills:E.state().skills.map(k=>k&&k.id),freeSlots:u.freeSkillSlots,takes:R.ev.filter(e=>e.T==='draft_taken').length,
 socketOpen:so?(so.className||''):null,party0:p0,scr:R.scr.slice(-4)}})()` });

const mark = { type:'eval', code:`(()=>{const E=window.__echoes;window.__r.mk=E.tick;window.__r.cleared=null;window.__r.openAt=null;return 'mark '+E.tick})()` };
const clearLoop = (label) => ({ type:'loop', label, maxMs:75000,
  cond:`window.__r.ev.some(e=>e.T==='room_cleared'&&e.tick>=window.__r.mk)`,
  body:[ { type:'eval', code:`(()=>{const E=window.__echoes;if(E.state().enemies.length>0)E.cmd('killAllEnemies');return E.state().enemies.length})()` }, { type:'wait', ms:200 } ] });
const escSocket = { type:'if', cond:`(()=>{const s=document.getElementById('socket-screen');return !!(s&&/nd-open/.test(s.className||''))})()`,
  then:[ { type:'key', key:'Escape', ms:80 }, { type:'wait', ms:700 } ] };
const doPath = { type:'if', cond:`window.__echoes.runUi().screen==='path'`, then:[ { type:'click', x:703, y:399, button:'left' }, { type:'wait', ms:1500 } ] };

const A = [];
A.push({ type:'wait', ms:1500 });
A.push({ type:'eval', code:ARM });
A.push({ type:'mousemove', x:800, y:450 });
A.push({ type:'eval', code:`(()=>{const E=window.__echoes;E.cmd('startRun');return {seed:E.seed,ver:E.version}})()` });
A.push(mark);

// ---- L1: baseline, no key at all after the clear ----
A.push(clearLoop('L1clear'));
A.push(snap('L1-a-immediately-after-clear-no-key'));
A.push({ type:'wait', ms:1500 });
A.push(snap('L1-b-settled-no-key'));
A.push({ type:'shot', name:'certB3-ref1-L1-take-focus' });
A.push({ type:'key', key:'Enter', ms:90 });
A.push({ type:'wait', ms:1400 });
A.push(snap('L1-c-afterEnter'));
A.push(escSocket); A.push(doPath);

// ---- L2: exact critic repro - one fresh KeyD tap right after the clear ----
A.push(mark);
A.push(clearLoop('L2clear'));
A.push(snap('L2-a-pre-tap'));
A.push({ type:'key', key:'KeyD', ms:60 });
A.push(snap('L2-b-just-after-tap'));
A.push({ type:'wait', ms:1500 });
A.push(snap('L2-c-settled-after-KeyD'));
A.push({ type:'shot', name:'certB3-ref1-L2-decline-focus' });
A.push({ type:'key', key:'Enter', ms:90 });
A.push({ type:'wait', ms:1400 });
A.push(snap('L2-d-afterEnter'));
A.push(escSocket); A.push(doPath);

// ---- L3: same tap but 3000 ms AFTER the clear, screen fully settled ----
A.push(mark);
A.push(clearLoop('L3clear'));
A.push({ type:'wait', ms:3000 });
A.push(snap('L3-a-settled-before-tap'));
A.push({ type:'key', key:'KeyD', ms:60 });
A.push({ type:'wait', ms:500 });
A.push(snap('L3-b-after-late-KeyD'));
A.push({ type:'key', key:'ArrowLeft', ms:80 });
A.push({ type:'wait', ms:400 });
A.push(snap('L3-c-after-ArrowLeft'));
A.push({ type:'key', key:'ArrowRight', ms:80 });
A.push({ type:'wait', ms:400 });
A.push(snap('L3-d-after-ArrowRight'));
A.push({ type:'key', key:'ArrowLeft', ms:80 });
A.push({ type:'wait', ms:400 });
A.push({ type:'key', key:'Enter', ms:90 });
A.push({ type:'wait', ms:1400 });
A.push(snap('L3-e-afterEnter'));
A.push(escSocket); A.push(doPath);

// ---- L4: KeyD HELD across the clear boundary (strafing player), released 900 ms later ----
A.push(mark);
A.push({ type:'keydown', key:'KeyD' });
A.push(clearLoop('L4clear'));
A.push(snap('L4-a-still-held-after-clear'));
A.push({ type:'wait', ms:900 });
A.push({ type:'keyup', key:'KeyD' });
A.push({ type:'wait', ms:600 });
A.push(snap('L4-b-after-release'));

writeFileSync('tools/actions/certB3-ref1-focus.json', JSON.stringify(A, null, 1));
console.log('wrote tools/actions/certB3-ref1-focus.json steps=' + A.length);
