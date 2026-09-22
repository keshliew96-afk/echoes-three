// Refuter probe 2: is the draft screen actually invisible (fading in) when the
// KeyD tap of F1 leg B lands? Samples every rAF from room_cleared: the run-screen
// AND every element inside it (opacity / transform / visibility / rect), plus an
// early screenshot taken as close to room_cleared as the harness allows.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });

const ARM = `(()=>{const E=window.__echoes;const R=window.__r0={ev:[],fade:[],keys:[]};
for(const t of ["room_cleared","reward_offer","draft_taken","path_chosen","room_enter"])E.on(t,()=>{R.ev.push(t+'@'+E.tick)});
const snap=()=>{const s=document.getElementById('run-screen');if(!s)return{none:1};
const el=[...s.querySelectorAll('*')].filter(n=>n.children.length===0||/rn-page|rn-card|rn-panel|rn-draft|rn-body/.test(n.className||''));
const cs=getComputedStyle(s);const r=s.getBoundingClientRect();
let minOp=1,minName='';const rows=[];
for(const n of [s,...[...s.children]]){const c=getComputedStyle(n);const b=n.getBoundingClientRect();
const o=+(+c.opacity).toFixed(3);if(o<minOp){minOp=o;minName=(n.className||n.tagName)+''}
rows.push([(n.className||n.tagName).toString().slice(0,26),o,c.transform==='none'?'-':c.transform.slice(0,30),c.visibility[0],Math.round(b.width),Math.round(b.height)])}
return {rootOp:+(+cs.opacity).toFixed(3),vis:cs.visibility,w:Math.round(r.width),h:Math.round(r.height),minOp,minName:minName.slice(0,24),rows,
ui:(()=>{try{return E.runUi().screen}catch(e){return 'ERR'}})(),
focus:[...s.querySelectorAll('.rn-btn')].filter(b=>/rn-focus/.test(b.className)).map(b=>(b.textContent||'').trim().slice(0,8))}};
R.snap=snap;
window.addEventListener('keydown',e=>{R.keys.push({k:e.code,dt:Math.round(performance.now()-R.t0),s:snap()})},true);
E.on('room_cleared',()=>{R.t0=performance.now();R.fade=[];const f=()=>{const d=performance.now()-R.t0;const s=snap();
R.fade.push({dt:Math.round(d),rootOp:s.rootOp,minOp:s.minOp,minName:s.minName,vis:s.vis,w:s.w,ui:s.ui,foc:s.focus});
if(d<450)requestAnimationFrame(f)};requestAnimationFrame(f)});
return 'armed2 v'+E.version})()`;

const A = [];
A.push({ type: 'wait', ms: 1200 });
A.push({ type: 'eval', code: ARM });
A.push({ type: 'mousemove', x: 800, y: 450 });
A.push({ type: 'eval', code: `(()=>{const E=window.__echoes;E.cmd('startRun');return {seed:E.seed,ver:E.version}})()` });
A.push({ type: 'wait', ms: 800 });
A.push({ type: 'eval', code: `(()=>{const E=window.__echoes;window.__r0.mk=E.tick;return 'mark '+E.tick})()` });
A.push({
  type: 'loop', label: 'fade-clear', maxMs: 60000,
  cond: `window.__r0.ev.some(e=>e.startsWith('room_cleared'))`,
  body: [
    { type: 'eval', code: `(()=>{const E=window.__echoes;if(E.state().enemies.length>0)E.cmd('killAllEnemies');return E.state().enemies.length})()` },
    { type: 'wait', ms: 25 },
  ],
});
A.push({ type: 'shot', name: 'certB3-ref0-fade-early' });
A.push({ type: 'eval', code: `(()=>{const R=window.__r0;return {tag:'fade-earlyshot-at',dt:Math.round(performance.now()-R.t0),s:R.snap()}})()` });
A.push({ type: 'key', key: 'KeyD', ms: 60 });
A.push({ type: 'wait', ms: 250 });
A.push({ type: 'shot', name: 'certB3-ref0-fade-afterD' });
A.push({ type: 'eval', code: `(()=>{const R=window.__r0;return {tag:'fade-afterD',dt:Math.round(performance.now()-R.t0),keys:R.keys,ev:R.ev,s:R.snap()}})()` });
A.push({ type: 'eval', code: `(()=>{const R=window.__r0;const f=R.fade;const out=[];let last='';
for(const x of f){const k=JSON.stringify([x.rootOp,x.minOp,x.vis,x.w,x.ui,x.foc]);if(k!==last){last=k;out.push(x)}}
return {tag:'fade-timeline',n:f.length,first:f[0],changes:out,last:f[f.length-1]}})()` });
A.push({ type: 'eval', code: `(()=>{const R=window.__r0;return {tag:'fade-rows',rows:R.snap().rows}})()` });

writeFileSync('tools/actions/certB3-ref0-fade.json', JSON.stringify(A));
console.log('wrote tools/actions/certB3-ref0-fade.json steps=', A.length);
