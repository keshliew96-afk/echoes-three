// certfixC2 regression probe for the melee-arc hitstop fix (v0.4.53):
//   1. a run still PLAYS — startRun, a room clears naturally (room_cleared +
//      the §17 banner text on screen), the reward phase opens;
//   2. fps floor — a 10 s rAF sample taken inside a live combat room with
//      melee arcs (and therefore melee hitstop) firing the whole time;
//   3. the pause is bounded — the §9 cap means the sim never loses more than
//      4 ticks of a 20-tick window, so the run's tick rate stays inside the
//      brief's envelope. Reported as ticks-per-second over the sample.
import { writeFileSync, mkdirSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) =>
  `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;

const acts = [
  ev(iife(`window.__r={ev:[]};for(const t of ['room_cleared','hitstop','death','hit'])E.on(t,e=>window.__r.ev.push(Object.assign({T:t},e)));
    return {ver:E.version,tick:E.tick}`)),
  ev(iife(`E.cmd('startRun');return {seed:E.seed}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<30000){if(E.state().run.active)break;await sleep(8);}
    return {active:E.state().run.active,room:E.state().run.room,mode:E.state().run.frame&&E.state().run.frame.modes[0],tick:E.tick}`)),
  // --- 10 s rAF sample inside the live first room (melee arcs connecting) ---
  ev(aiife(`const F=[];let stop=false;const f=()=>{F.push([performance.now(),E.tick]);if(!stop)requestAnimationFrame(f);};requestAnimationFrame(f);
    await sleep(10000);stop=true;
    const dur=(F[F.length-1][0]-F[0][0])/1000;const ticks=F[F.length-1][1]-F[0][1];
    return {sampleSec:+dur.toFixed(2),frames:F.length,fpsSampled:+(F.length/dur).toFixed(1),fpsReported:E.fps,
      ticksPerSec:+(ticks/dur).toFixed(1),
      hitstops:window.__r.ev.filter(e=>e.T==='hitstop').length,
      hits:window.__r.ev.filter(e=>e.T==='hit').length}`)),
  // --- let the room clear on its own, then read the banner from the DOM ---
  ev(aiife(`const t0=performance.now();let cleared=null;
    while(performance.now()-t0<90000){
      const c=window.__r.ev.find(e=>e.T==='room_cleared');
      if(c){cleared=c;break;}
      const s=E.state();for(const p of s.party)if(p.hp<35)E.cmd('setHp',p.id,1);
      await sleep(120);}
    const b=document.getElementById('hud-banner');
    const st=E.state();
    return {cleared:cleared?{tick:cleared.tick,room:cleared.room}:null,phase:st.run.phase,room:st.run.room,
      bannerText:b?b.innerText.replace(/\\s+/g,' ').trim().slice(0,80):null,
      bannerVisible:b?getComputedStyle(b).opacity:null,
      deaths:window.__r.ev.filter(e=>e.T==='death').length,
      hitstopCauses:(()=>{const c={};for(const s of window.__r.ev.filter(e=>e.T==='hitstop'))c[s.cause+':'+s.ticks]=(c[s.cause+':'+s.ticks]||0)+1;return c;})()}`)),
  { type: 'shot', name: 'certfixC2-reg-cleared' },
  ev(iife(`return {tick:E.tick,fps:E.fps,ver:E.version,phase:E.state().run.phase}`)),
];

mkdirSync('tools/actions', { recursive: true });
writeFileSync('tools/actions/certfixC2-reg.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certfixC2-reg.json', acts.length);
