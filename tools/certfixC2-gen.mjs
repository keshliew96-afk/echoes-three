// certfixC2 — F1-r2b probe: hitstop on melee-arc connects (BUILD_BRIEF §9 #4).
//
// Two action files:
//   certfixC2-boss  : the Hollow Stag pinned at full HP (cmd bossHp 1 every
//                     150 ms), player i-framed, melee allies grinding its arc
//                     for 60 s. NOTHING dies, so the 4-per-20 window budget is
//                     never spent by kill hitstops and an arc pause has to show
//                     both as a `hitstop` event and as elevated per-tick wall
//                     dwell.
//   certfixC2-arena : a live room-3 fight (seed 777) where kills DO happen —
//                     the in-capture control that kill hitstop still fires and
//                     the two causes coexist inside the §9 cap.
//
// The dwell detector is the critic's: per rAF frame record [ms, tick]; the
// dwell of tick T is the wall gap between the first frame showing T and the
// first frame showing T+1. A 2-tick pause has to lift that from ~16 ms to
// ~50 ms at 60 fps (proportionally less at higher fps — the pause is 2 sim
// ticks = 33.3 ms of extra wall time on top of the frame's own tick).
import { writeFileSync, mkdirSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const mv = (x, y) => ({ type: 'mousemove', x, y });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) =>
  `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;

const EVT = ['hit', 'death', 'hitstop', 'sound', 'ally_basic', 'ally_cast', 'screenshake', 'room_cleared', 'hit_immune'];

const arm = ev(iife(`
  window.__c={ev:[],frames:[],started:performance.now()};
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));
  const f=()=>{window.__c.frames.push([Math.round((performance.now()-window.__c.started)*10)/10,E.tick]);
    if(window.__c.frames.length>90000)window.__c.frames.splice(0,30000);requestAnimationFrame(f);};requestAnimationFrame(f);
  window.__c.dwell=(T)=>{const F=window.__c.frames;let i0=-1;for(let i=0;i<F.length;i++){if(F[i][1]===T){i0=i;break;}if(F[i][1]>T)return null;}
    if(i0<0)return null;let j=i0;while(j<F.length&&F[j][1]<=T)j++;if(j>=F.length)return null;return +(F[j][0]-F[i0][0]).toFixed(1);};
  window.__c.dwellStats=(lo,hi)=>{const F=window.__c.frames;const d=[];let i=0;
    while(i<F.length){const T=F[i][1];let j=i;while(j<F.length&&F[j][1]===T)j++;if(j<F.length&&T>=lo&&T<=hi&&F[j][1]===T+1)d.push(F[j][0]-F[i][0]);i=j;}
    d.sort((a,b)=>a-b);const q=(p)=>d.length?+d[Math.min(d.length-1,Math.floor(p*d.length))].toFixed(1):null;
    return {n:d.length,min:q(0),p25:q(0.25),median:q(0.5),p90:q(0.9),p99:q(0.99),max:q(0.9999)};};
  return 'armed t'+E.tick+' ver '+E.version`));

// Arc classifier: the hit event's own `shape` when the build carries one,
// otherwise the critic's source-name fallback (ally melee kits + melee basics
// of party_index 1 / 2 = Tank / Swordsman).
const ARC = `const arcSkills=['heavy_slam','brutal_cleave','flurry','lunge_strike'];
  const isArc=(h)=>h.shape==='melee_arc'||arcSkills.includes(h.source)||(h.source&&/_basic$/.test(h.source)&&(h.attacker===1||h.attacker===2));`;

// Shared report tail: coverage + dwell + per-hit rows + the full hitstop census.
const report = [
  ev(iife(`${ARC}
    const H=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=0);
    const D=window.__c.ev.filter(e=>e.T==='death'&&e.tick>=0);
    const src={};for(const h of H){const k=h.source+'|'+(h.shape||'?')+'|'+(isArc(h)?'ARC':'ranged');src[k]=(src[k]||0)+1;}
    const ab={};for(const a of window.__c.ev.filter(e=>e.T==='ally_basic'&&e.tick>=0))ab[a.classId+'|'+a.shape]=(ab[a.classId+'|'+a.shape]||0)+1;
    const ac={};for(const a of window.__c.ev.filter(e=>e.T==='ally_cast'&&e.tick>=0))ac[a.classId+'|'+a.skill+'|'+a.shape]=(ac[a.classId+'|'+a.skill+'|'+a.shape]||0)+1;
    return {window:[window.__c.start,E.tick],hits:H.length,deaths:D.length,hitSources:src,allyBasicFired:ab,allyCastFired:ac}`)),
  ev(iife(`${ARC}
    const H=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=0);
    const HS=window.__c.ev.filter(e=>e.T==='hitstop'&&e.tick>=0);
    const D=window.__c.ev.filter(e=>e.T==='death'&&e.tick>=0);
    const dead=(h)=>D.some(d=>d.id===h.target&&Math.abs(d.tick-h.tick)<=1);
    const arcNK=H.filter(h=>isArc(h)&&!dead(h));
    const rangedNK=H.filter(h=>!isArc(h)&&!dead(h));
    const stopWithin=(t)=>HS.find(s=>s.tick>=t&&s.tick<=t+2)||null;
    const dw=(arr)=>{const v=arr.map(h=>window.__c.dwell(h.tick)).filter(x=>x!=null).sort((a,b)=>a-b);
      return {n:v.length,min:v[0],p25:v[Math.floor(v.length*0.25)],median:v[Math.floor(v.length/2)],p90:v[Math.floor(v.length*0.9)],max:v[v.length-1],over40:v.filter(x=>x>40).length,over30:v.filter(x=>x>30).length};};
    const causes={};for(const s of HS)causes[s.cause+':'+s.ticks]=(causes[s.cause+':'+s.ticks]||0)+1;
    // an arc connect is COVERED when a stop fires on its own tick window OR it
    // lands inside the 4-tick §9 window budget already spent on a stop <=4
    // ticks earlier (the same impact burst).
    const near=(t)=>HS.some(s=>s.tick>=t-4&&s.tick<=t+2);
    // §9 cap accounting: ticks of pause already granted inside the rolling
    // 20-tick window [t-20, t] that the clock charges this request against.
    const spent=(t)=>HS.filter(s=>s.tick>=t-20&&s.tick<=t).reduce((a,s)=>a+s.ticks,0);
    const uncovered=arcNK.filter(h=>!stopWithin(h.tick));
    return {arcNonKill:arcNK.length,arcNonKillWithHitstop:arcNK.filter(h=>stopWithin(h.tick)).length,
      arcNonKillCoveredOrBurst:arcNK.filter(h=>near(h.tick)).length,
      uncoveredArc:uncovered.length,
      uncoveredExplainedByCap:uncovered.filter(h=>spent(h.tick)>=4).length,
      uncoveredRows:uncovered.slice(0,20).map(h=>[h.tick,h.source,spent(h.tick)]),
      arcCauses:(()=>{const c={};for(const h of arcNK){const s=stopWithin(h.tick);c[s?s.cause+':'+s.ticks:'none']=(c[s?s.cause+':'+s.ticks:'none']||0)+1;}return c;})(),
      rangedNonKill:rangedNK.length,rangedNonKillWithHitstop:rangedNK.filter(h=>stopWithin(h.tick)).length,
      hitstopTotal:HS.length,causes,
      arcDwell:dw(arcNK),rangedDwell:dw(rangedNK),
      killDwell:(()=>{const v=D.map(d=>window.__c.dwell(d.tick)).filter(x=>x!=null).sort((a,b)=>a-b);return {n:v.length,median:v[Math.floor(v.length/2)],min:v[0],max:v[v.length-1],over40:v.filter(x=>x>40).length};})(),
      killWithHitstop:D.filter(d=>stopWithin(d.tick)).length,
      killRows:D.map(d=>[d.tick,(stopWithin(d.tick)||{}).cause||'none',(stopWithin(d.tick)||{}).ticks||0,window.__c.dwell(d.tick),spent(d.tick)]),
      baseline:window.__c.dwellStats(window.__c.start,E.tick)}`)),
  ev(iife(`${ARC}
    const H=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=0);
    const D=window.__c.ev.filter(e=>e.T==='death');const HS=window.__c.ev.filter(e=>e.T==='hitstop');
    const dead=(h)=>D.some(d=>d.id===h.target&&Math.abs(d.tick-h.tick)<=1);
    const arcNK=H.filter(h=>isArc(h)&&!dead(h));
    return {first30arcHits:arcNK.slice(0,30).map(h=>[h.tick,h.source,h.shape||'?','atk'+h.attacker,h.amount,window.__c.dwell(h.tick),(HS.find(s=>s.tick>=h.tick&&s.tick<=h.tick+2)||{}).cause||'none'])}`)),
  ev(iife(`const HS=window.__c.ev.filter(e=>e.T==='hitstop');
    return {allHitstops:HS.map(s=>[s.tick,s.cause,s.ticks]).slice(0,120),hitstopCount:HS.length}`)),
  ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;const s=E.state();
    return {totals:m,tick:E.tick,fps:E.fps,ver:E.version,enemies:s.enemies.length,party:s.party.map(p=>[p.id,p.kind,p.hp])}`)),
];

// ------------------------------------------------------------- boss grind --
const boss = [
  arm,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<30000){const s=E.state();if(s.run.active)break;await sleep(8);}
    const r=E.cmd('skipToRoom',8);return {skip:r,tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<60000){const s=E.state();const b=s.run&&s.run.boss;
      if(b&&b.active)return {ok:true,tick:E.tick,boss:[b.id,b.name,b.hp],fps:E.fps};await sleep(20);}
    return {ok:false,tick:E.tick}`)),
  ev(iife(`E.cmd('iframe',0,60000);const s=E.state();const b=s.run&&s.run.boss;if(b){E.cmd('teleport',b.x+1.4,b.z);E.cmd('mark',b.id);}window.__c.bossId=b&&b.id;
    window.__c.pin=setInterval(()=>{try{E.cmd('bossHp',1);const st=E.state();for(const e of st.enemies){if(e.id!==window.__c.bossId)E.cmd('setHp',e.id,1);}}catch(err){window.__c.perr=String(err)}},150);
    window.__c.start=E.tick;return {start:E.tick,boss:b?[b.id,b.hp]:null}`)),
  mv(800, 450),
  ev(aiife(`const t0=performance.now();let n=0;while(performance.now()-t0<60000){
      const s=E.state();const b=s.run&&s.run.boss;
      if(b&&(n%8===0)){E.cmd('teleport',b.x+1.2,b.z);E.cmd('rally');}
      for(const p of s.party)if(p.hp<70)E.cmd('setHp',p.id,1);
      n++;await sleep(250);}
    const s=E.state();const b=s.run&&s.run.boss;
    return {end:E.tick,fps:E.fps,bossPct:b?b.pct:null,hits:window.__c.ev.filter(e=>e.T==='hit').length,pinErr:window.__c.perr||null}`)),
  { type: 'shot', name: 'certfixC2-boss-grind' },
  ev(iife(`clearInterval(window.__c.pin);return {pinOff:E.tick}`)),
  ...report,
];

// ------------------------------------------ live arena (kills DO happen) --
const arena = [
  arm,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<30000){const s=E.state();if(s.run.active)break;await sleep(8);}
    const r=E.cmd('skipToRoom',3);return {skip:r,tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<40000){const s=E.state();if(s.enemies.length>=2)return {ok:true,tick:E.tick,enemies:s.enemies.length};await sleep(20);}
    return {ok:false,tick:E.tick}`)),
  ev(iife(`E.cmd('iframe',0,90000);window.__c.start=E.tick;return {start:E.tick}`)),
  mv(800, 450),
  ev(aiife(`const t0=performance.now();let n=0;while(performance.now()-t0<60000){
      const s=E.state();
      if(s.enemies.length>0&&(n%6===0)){const e=s.enemies[0];E.cmd('teleport',e.x+1.0,e.z);E.cmd('rally');}
      for(const p of s.party)if(p.hp<40)E.cmd('setHp',p.id,1);
      n++;await sleep(250);}
    return {end:E.tick,fps:E.fps,hits:window.__c.ev.filter(e=>e.T==='hit').length,deaths:window.__c.ev.filter(e=>e.T==='death').length}`)),
  { type: 'shot', name: 'certfixC2-arena-grind' },
  ...report,
];

// ------------------------------------ non-boss room, victims pinned alive --
// The critic's calibration scenario (certC2-ref0-cal): a room-5 defend fight on
// seed 909 with every enemy topped up to full HP every 20 ms, so the melee
// allies' arcs connect on ORDINARY boars/mantises without killing them. Round 2
// measured 75 such connects with 0 hitstop here.
const pinned = [
  arm,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<30000){const s=E.state();if(s.run.active)break;await sleep(8);}
    const r=E.cmd('skipToRoom',5);return {skip:{room:r.room,mode:r.frame&&r.frame.modes[4]},tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<40000){const s=E.state();if(s.enemies.length>=2)return {ok:true,tick:E.tick,enemies:s.enemies.map(e=>[e.id,e.kind,e.hp])};await sleep(20);}
    return {ok:false,tick:E.tick}`)),
  ev(iife(`E.cmd('iframe',0,90000);
    window.__c.pin=setInterval(()=>{try{for(const e of E.state().enemies)E.cmd('setHp',e.id,1);}catch(err){window.__c.perr=String(err)}},20);
    window.__c.start=E.tick;return {start:E.tick}`)),
  mv(800, 450),
  ev(aiife(`const t0=performance.now();let n=0;while(performance.now()-t0<50000){
      const s=E.state();
      if(s.enemies.length>0&&(n%6===0)){const e=s.enemies[0];E.cmd('teleport',e.x+1.0,e.z);E.cmd('rally');}
      for(const p of s.party)if(p.hp<70)E.cmd('setHp',p.id,1);
      n++;await sleep(250);}
    return {end:E.tick,fps:E.fps,hits:window.__c.ev.filter(e=>e.T==='hit').length,pinErr:window.__c.perr||null}`)),
  { type: 'shot', name: 'certfixC2-pinned-grind' },
  ev(iife(`clearInterval(window.__c.pin);return {pinOff:E.tick}`)),
  ...report,
];

mkdirSync('tools/actions', { recursive: true });
writeFileSync('tools/actions/certfixC2-boss.json', JSON.stringify(boss, null, 1));
writeFileSync('tools/actions/certfixC2-arena.json', JSON.stringify(arena, null, 1));
writeFileSync('tools/actions/certfixC2-pinned.json', JSON.stringify(pinned, null, 1));
console.log('wrote certfixC2-boss.json', boss.length, '/ certfixC2-arena.json', arena.length);
