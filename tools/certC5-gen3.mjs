// Certification C round 5 — third-pass generator: boss stomp screenshake probe (certC5-boss).
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);
const EVTYPES = ['hit', 'hitstop', 'death', 'screenshake', 'room_cleared', 'enemy_spawn', 'telegraph_start', 'telegraph_resolve',
  'boss_spawn', 'boss_quake_start', 'boss_quake_resolve', 'boss_trample', 'boss_adds', 'downed', 'run_end', 'room_enter'];
const ARM = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(EVTYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return {armed:E.tick,version:E.version}`));

const files = {};
files['certC5-boss'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 40000),
  ev(iife(`const r=E.cmd('skipToRoom',8);window.__ui=[];
    (async()=>{while(true){try{const u=E.runUi();if(u.screen&&u.screen!=='none'&&(window.__ui.length===0||window.__ui[window.__ui.length-1][1]!==u.screen))window.__ui.push([E.tick,u.screen]);
      if(u.screen==='draft'||u.screen==='reward'||u.screen==='reward_offer')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');}catch(e){window.__drverr=String(e);}await new Promise(r=>setTimeout(r,250));}})();
    return {tick:E.tick,skip:JSON.stringify(r).slice(0,200),ui:E.runUi().screen,run:JSON.stringify(E.cmd('runState')).slice(0,160)}`)),
  waitFor(`E.state().enemies.some(e=>e.kind==='stag')`, 60000, `,enemies:E.state().enemies.map(e=>e.kind).join('/'),ui:E.runUi().screen,uiLog:JSON.stringify(window.__ui),room:JSON.stringify(E.state().room).slice(0,120)`),
  ev(iife(`window.__b={cam:[]};
    setInterval(()=>{const a=E.state().vfx.arena;if(!a||!a.cam)return;const c=a.cam;window.__b.cam.push([E.tick,+c[0].toFixed(4),+c[1].toFixed(4)]);},16);
    (async()=>{while(true){try{E.cmd('iframe',0,600);const st=E.state();for(const p of st.party)if(p.hp<p.maxHp*0.5)E.cmd('heal',p.id,100);
      if(st.enemies.some(e=>e.kind==='stag'))E.cmd('bossHp',1);}catch(e){window.__berr=String(e);}await new Promise(r=>setTimeout(r,200));}})();
    return 'boss sampler armed '+E.tick`)),
  wait(32000),
  ev(iife(`const evs=window.__c.ev;const cam=window.__b.cam;
    const jerk=(t)=>{let m=0;for(let i=2;i<cam.length;i++){if(cam[i][0]<t)continue;if(cam[i][0]>t+12)break;const j=Math.hypot(cam[i][1]-2*cam[i-1][1]+cam[i-2][1],cam[i][2]-2*cam[i-1][2]+cam[i-2][2]);if(j>m)m=j;}return +m.toFixed(4);};
    const qs=evs.filter(e=>e.T==='boss_quake_start').map(e=>e.tick),qr=evs.filter(e=>e.T==='boss_quake_resolve').map(e=>e.tick),tr=evs.filter(e=>e.T==='boss_trample').map(e=>e.tick);
    const sh=evs.filter(e=>e.T==='screenshake');
    return {tick:E.tick,fps:E.fps,version:E.version,berr:window.__berr||null,quakeStarts:qs,quakeResolves:qr,quakeGaps:qs.map((s,i)=>qr[i]!=null?qr[i]-s:null),tramples:tr,
      shakes:sh.length,shakeCauses:sh.reduce((m,e)=>{m[e.cause]=(m[e.cause]||0)+1;return m;},{}),shakeTicks:sh.map(e=>[e.tick,e.cause,e.amp,e.durationSec]),
      shakeWithin2OfResolve:qr.filter(t=>sh.some(s=>s.tick>=t&&s.tick<=t+2)).length,shakeWithin2OfTrample:tr.filter(t=>sh.some(s=>s.tick>=t&&s.tick<=t+2)).length,
      jerkAtStart:qs.map(jerk),jerkAtResolve:qr.map(jerk),jerkAtTrample:tr.map(jerk),camSamples:cam.length,
      bossHp:(E.state().enemies.find(e=>e.kind==='stag')||{}).hp,deaths:evs.filter(e=>e.T==='death').length,adds:evs.filter(e=>e.T==='boss_adds').length}`)),
];
for (const [name, acts] of Object.entries(files)) { writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); }
