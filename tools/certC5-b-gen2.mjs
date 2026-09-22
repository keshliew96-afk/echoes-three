// Certification C round 5, audit re-run (prefix certC5-b-): screenshake measured on the RENDER camera.
// Samples window.__arenaProbe.stage.camera on every rAF AND at render time via a chained scene.onBeforeRender
// hook (camera.matrixWorld the renderer draws with). Never reads the camera through E.state().
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const TYPES = ['screenshake', 'boss_spawn', 'boss_quake_start', 'boss_quake_resolve', 'boss_trample', 'boss_trample_hit',
  'boss_adds', 'boss_death', 'death', 'room_enter', 'hitstop', 'run_end', 'victory', 'hit'];
const ARM = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(TYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));

const SAMPLER = ev(iife(`window.__cs={rows:[],hook:[],scenes:0,err:null,st:[]};const CS=window.__cs;
  let hooked=null;const ids=new WeakMap();let nid=0;const idOf=o=>{if(!o)return -1;if(!ids.has(o))ids.set(o,++nid);return ids.get(o);};
  const hook=()=>{const P=window.__arenaProbe;if(!P||!P.stage||!P.stage.scene)return;const sc=P.stage.scene;if(sc===hooked)return;
    const prev=sc.onBeforeRender;sc.onBeforeRender=function(r,s,c){try{const m=c.matrixWorld.elements;CS.hook.push([E.tick,+performance.now().toFixed(1),+m[12].toFixed(5),+m[13].toFixed(5),+m[14].toFixed(5),idOf(c)]);}catch(e){CS.err=String(e);}return prev&&prev.apply(this,arguments);};
    hooked=sc;CS.scenes++;};
  const step=()=>{try{hook();const P=window.__arenaProbe;const c=P&&P.stage&&P.stage.camera;
    if(c)CS.rows.push([E.tick,+performance.now().toFixed(1),+c.position.x.toFixed(5),+c.position.y.toFixed(5),+c.position.z.toFixed(5),idOf(c)]);}catch(e){CS.err=String(e);}
    requestAnimationFrame(step);};requestAnimationFrame(step);
  setInterval(()=>{try{const s=E.state();CS.st.push([E.tick,s.room?s.room.mode:null,s.enemies?s.enemies.length:null,s.enemies?s.enemies.some(e=>e.kind==='stag'):null,s.vfx?!!s.vfx.arena:null,E.runUi().screen]);}catch(e){CS.st.push([E.tick,'ERR '+String(e).slice(0,60)]);}},500);
  return 'cam sampler armed '+E.tick`));

// Per-event camera response. Jerk = |second difference| of consecutive samples of ONE camera object;
// step = |first difference|. Window [t, t+W] ticks; pre-window [t-W, t-1] for comparison.
const ANALYZE = (tag, fromExpr) => ev(iife(`const CS=window.__cs,EV=window.__c.ev;const from=${fromExpr};
  const dedupe=(rows)=>{const o=[];for(const r of rows){const l=o[o.length-1];if(l&&Math.abs(r[1]-l[1])<2&&r[2]===l[2]&&r[3]===l[3]&&r[4]===l[4])continue;o.push(r);}return o;};
  const ser=(rows)=>{const o=[];for(let i=2;i<rows.length;i++){const a=rows[i-2],b=rows[i-1],c=rows[i];if(a[5]!==c[5]||b[5]!==c[5])continue;
    o.push([c[0],Math.hypot(c[2]-2*b[2]+a[2],c[3]-2*b[3]+a[3],c[4]-2*b[4]+a[4]),Math.hypot(c[2]-b[2],c[3]-b[3],c[4]-b[4]),c[1]-b[1]]);}return o;};
  const H=ser(dedupe(CS.hook).filter(r=>r[0]>=from)),R=ser(CS.rows.filter(r=>r[0]>=from));
  const shakeT=EV.filter(e=>e.T==='screenshake'&&e.tick>=from).map(e=>e.tick);
  const enterT=EV.filter(e=>e.T==='room_enter').map(e=>e.tick);
  const r4=v=>+v.toFixed(4);
  const win=(S,t,a,b)=>{let mj=0,ms=0,n=0;for(const s of S){if(s[0]>=t+a&&s[0]<=t+b){n++;if(s[1]>mj)mj=s[1];if(s[2]>ms)ms=s[2];}}return [n,r4(mj),r4(ms)];};
  const q=(arr,p)=>{if(!arr.length)return null;const s=[...arr].sort((x,y)=>x-y);return r4(s[Math.min(s.length-1,Math.floor(s.length*p))]);};
  const baseOf=(S)=>{const b=S.filter(s=>shakeT.every(t=>Math.abs(s[0]-t)>24)&&enterT.every(t=>s[0]-t>90||s[0]<t));const j=b.map(s=>s[1]),st=b.map(s=>s[2]);
    return {n:b.length,jerkP50:q(j,0.5),jerkP95:q(j,0.95),jerkP99:q(j,0.99),jerkMax:q(j,1),stepP50:q(st,0.5),stepP95:q(st,0.95),stepMax:q(st,1)};};
  const evRows=(S)=>EV.filter(e=>e.tick>=from&&(e.T==='boss_quake_start'||e.T==='boss_quake_resolve'||e.T==='boss_trample'||(e.T==='screenshake'&&e.cause==='kill'))).map(e=>{
    const W=e.T==='screenshake'?8:12;return [e.T==='screenshake'?'kill_shake':e.T,e.tick,...win(S,e.tick,0,W),win(S,e.tick,-W,-1)[1]];});
  const gap=(S)=>{let m=0;for(const s of S)if(s[3]>m)m=s[3];return Math.round(m);};
  return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,from,err:CS.err,scenes:CS.scenes,hookRows:CS.hook.length,rafRows:CS.rows.length,
    hookFrames:H.length,rafFrames:R.length,maxFrameGapMsHook:gap(H),
    shakes:EV.filter(e=>e.T==='screenshake'&&e.tick>=from).map(e=>[e.tick,e.cause,e.amp,e.durationSec]),
    deaths:EV.filter(e=>e.T==='death'&&e.tick>=from).length,adds:EV.filter(e=>e.T==='boss_adds'&&e.tick>=from).map(e=>e.tick),
    baseHook:baseOf(H),baseRaf:baseOf(R),
    cols:'[type,tick,framesInWin,maxJerk,maxStep,preWinMaxJerk]',
    hook:evRows(H),raf:evRows(R)}`));

// raw render-time camera trace around the Nth event of a type
const TRACE = (type, n, a = -6, b = 16) => ev(iife(`const e=window.__c.ev.filter(x=>x.T===${JSON.stringify(type)})[${n}];if(!e)return 'no ${type} #${n}';
  return {type:${JSON.stringify(type)},n:${n},tick:e.tick,hook:window.__cs.hook.filter(r=>r[0]>=e.tick+(${a})&&r[0]<=e.tick+(${b})).map(r=>[r[0],r[2],r[3],r[4]]),
    raf:window.__cs.rows.filter(r=>r[0]>=e.tick+(${a})&&r[0]<=e.tick+(${b})).map(r=>[r[0],r[2],r[3],r[4]])}`));

const STLOG = ev(iife(`const s=window.__cs.st;return {n:s.length,first:s.slice(0,3),samples:s.filter((_,i)=>i%6===0).slice(0,40),nullRoom:s.filter(r=>r[1]===null).length,stagSeen:s.filter(r=>r[3]===true).length,noArena:s.filter(r=>r[4]===false).length}`));
const COUNTS = ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {tick:E.tick,fps:E.fps,counts:m}`));
const PIN_PLAYER = `setInterval(()=>{try{E.cmd('iframe',0,600);const p=E.state().party[0];if(p&&p.hp<100)E.cmd('heal',0,100);}catch(e){window.__perr=String(e);}},100);`;

const files = {};
// A: camp boot -> startRun -> natural room-1 kills -> skipToRoom(8) -> natural boss fight to the end.
files['certC5-b-shake'] = [
  ARM, SAMPLER,
  ev(iife(`E.cmd('startRun');${PIN_PLAYER}window.__t1=E.tick;return {tick:E.tick,seed:E.seed,version:E.version,run:JSON.stringify(E.cmd('runState')).slice(0,120)}`)),
  waitFor(`window.__c.ev.filter(e=>e.T==='screenshake'&&e.cause==='kill').length>=5`, 45000, `,deaths:window.__c.ev.filter(e=>e.T==='death').length`),
  wait(600),
  ANALYZE('room1-kills', 'window.__t1'),
  TRACE('screenshake', 0, -4, 12),
  ev(iife(`const r=E.cmd('skipToRoom',8);window.__t8=E.tick;return {tick:E.tick,room:r&&r.room,mode:r&&r.mode}`)),
  waitFor(`(()=>{const t=window.__c.ev.filter(e=>e.T==='boss_trample'&&e.tick>=window.__t8);return t.length>=2&&E.tick>=t[1].tick+5})()`, 45000,
    `,tramples:window.__c.ev.filter(e=>e.T==='boss_trample').map(e=>e.tick),hud:JSON.stringify(E.hud.banner()).slice(0,200)`),
  shot('certC5-b-shake-mid'),
  ev(iife(`return {tick:E.tick,afterShot:true,boss:JSON.stringify(E.cmd('runState').boss).slice(0,200)}`)),
  waitFor(`E.runUi().screen==='end'||E.tick>=window.__t8+3000`, 90000, `,screen:E.runUi().screen`),
  wait(500),
  ANALYZE('boss-natural', 'window.__t8'),
  TRACE('boss_quake_start', 0), TRACE('boss_quake_resolve', 0), TRACE('boss_trample', 1),
  STLOG, COUNTS,
];
// B: camp boot -> startRun -> skipToRoom(8), Stag pinned at full HP -> many quakes/tramples; mid-telegraph shot.
files['certC5-b-shake2'] = [
  ARM, SAMPLER,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);window.__t8=E.tick;${PIN_PLAYER}
    setInterval(()=>{try{E.cmd('bossHp',1);}catch(e){window.__berr=String(e);}},16);return {tick:E.tick,room:r&&r.room,mode:r&&r.mode,version:E.version}`)),
  waitFor(`(()=>{const q=window.__c.ev.filter(e=>e.T==='boss_quake_start');return q.length>=2&&E.tick>=q[1].tick+4})()`, 60000,
    `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>[e.tick,e.resolveTick])`),
  shot('certC5-b-shake2-tele'),
  ev(iife(`return {tick:E.tick,afterShot:true,berr:window.__berr||null}`)),
  waitFor(`E.tick>=window.__t8+3300||E.runUi().screen==='end'`, 110000, `,screen:E.runUi().screen`),
  ANALYZE('boss-pinned', 'window.__t8'),
  TRACE('boss_quake_resolve', 2), TRACE('boss_trample', 4),
  STLOG, COUNTS,
];
// C: harness boot straight into the arena boss room (?scene=arena&room=boss) — the ?room path the audit asked for.
files['certC5-b-shake3'] = [
  ARM, SAMPLER,
  ev(iife(`${PIN_PLAYER}window.__t8=E.tick;let st=null;try{st=E.state();}catch(e){}return {tick:E.tick,url:location.search,scene:st&&st.scene,room:st&&st.room&&st.room.mode,enemies:st&&st.enemies&&st.enemies.map(e=>e.kind),run:JSON.stringify(E.cmd('runState')).slice(0,200)}`)),
  wait(1500), shot('certC5-b-shake3-a'),
  waitFor(`E.tick>=window.__t8+1500||E.runUi().screen==='end'`, 60000, `,screen:E.runUi().screen`),
  ANALYZE('arena-boot', 'window.__t8'),
  STLOG, COUNTS,
];
for (const [name, acts] of Object.entries(files)) { writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); }
