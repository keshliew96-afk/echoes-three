// certC2-b-boss : G1 decisive — the Stag (1800 HP, kept topped up with bossHp)
// forces the melee allies (Tank arc 0.90/50deg, Swordsman arc 0.75/40deg basics
// + Heavy Slam / Brutal Cleave / Flurry / Lunge Strike) to connect over and over
// WITHOUT killing anything. If BUILD_BRIEF §9 item 4 (2-tick global sim pause on
// melee-arc connects) is implemented, it must show here both as `hitstop` events
// with cause != kill and as elevated per-tick wall dwell.
import { writeFileSync, mkdirSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const mv = (x, y) => ({ type: 'mousemove', x, y });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const EVT = ['hit','death','hitstop','sound','ally_basic','ally_cast','enemy_spawn','boss_spawn','boss_adds',
  'boss_quake_start','boss_quake_resolve','boss_trample','screenshake','room_cleared','hit_immune','knockback'];

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

const ARC = `const arcSkills=['heavy_slam','brutal_cleave','flurry','lunge_strike','restorative_wave'];
  const isArc=(h)=>arcSkills.includes(h.source)||(h.source&&/_basic$/.test(h.source)&&(h.attacker===1||h.attacker===2))||h.shape==='melee_arc';`;

const acts = [
  arm,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<30000){const s=E.state();if(s.run.active)break;await sleep(8);}
    const r=E.cmd('skipToRoom',8);return {skip:r,tick:E.tick}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<60000){const s=E.state();const b=s.run&&s.run.boss;if(b&&b.active)return {ok:true,tick:E.tick,boss:[b.id,b.name,b.hp,b.x,b.z],enemies:s.enemies.length,fps:E.fps};await sleep(20);}
    return {ok:false,tick:E.tick,enemies:E.state().enemies.map(e=>[e.id,e.kind,e.hp])}`)),
  ev(iife(`E.cmd('iframe',0,30000);const s=E.state();const b=s.run&&s.run.boss;if(b){E.cmd('teleport',b.x+1.4,b.z);E.cmd('mark',b.id);}window.__c.bossId=b&&b.id;
    window.__c.pin=setInterval(()=>{try{E.cmd('bossHp',1);const st=E.state();for(const e of st.enemies){if(e.id!==window.__c.bossId)E.cmd('setHp',e.id,1);}}catch(err){window.__c.perr=String(err)}},150);
    window.__c.start=E.tick;return {start:E.tick,boss:b?[b.id,b.hp]:null}`)),
  mv(800, 450),
  // 70 s of melee grind on a boss that cannot die
  ev(aiife(`const t0=performance.now();let n=0;while(performance.now()-t0<70000){
      const s=E.state();const b=s.run&&s.run.boss;
      if(b&&(n%8===0)){E.cmd('teleport',b.x+1.2,b.z);E.cmd('rally');}
      if(E.state().party[0].hp<70)E.cmd('setHp',0,1);
      n++;await sleep(250);}
    const s=E.state();const b=s.run&&s.run.boss;
    return {end:E.tick,fps:E.fps,bossHp:b?b.hp:null,bossPct:b?b.pct:null,enemies:s.enemies.length,hits:window.__c.ev.filter(e=>e.T==='hit').length,pinErr:window.__c.perr||null}`)),
  ev(iife(`clearInterval(window.__c.pin);return {pinOff:E.tick}`)),
  // ---- report ----
  ev(iife(`${ARC}
    const H=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=0);
    const D=window.__c.ev.filter(e=>e.T==='death'&&e.tick>=0);
    const src={};for(const h of H)src[h.source+'|atk'+h.attacker+(isArc(h)?'|ARC':'|ranged')]=(src[h.source+'|atk'+h.attacker+(isArc(h)?'|ARC':'|ranged')]||0)+1;
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
      return {n:v.length,min:v[0],p25:v[Math.floor(v.length*0.25)],median:v[Math.floor(v.length/2)],p90:v[Math.floor(v.length*0.9)],max:v[v.length-1],over40:v.filter(x=>x>40).length};};
    const causes={};for(const s of HS)causes[s.cause+':'+s.ticks]=(causes[s.cause+':'+s.ticks]||0)+1;
    return {arcNonKill:arcNK.length,arcNonKillWithHitstop:arcNK.filter(h=>stopWithin(h.tick)).length,
      rangedNonKill:rangedNK.length,rangedNonKillWithHitstop:rangedNK.filter(h=>stopWithin(h.tick)).length,
      hitstopTotal:HS.length,causes,
      arcDwell:dw(arcNK),rangedDwell:dw(rangedNK),
      killDwell:(()=>{const v=D.map(d=>window.__c.dwell(d.tick)).filter(x=>x!=null).sort((a,b)=>a-b);return {n:v.length,median:v[Math.floor(v.length/2)],min:v[0],max:v[v.length-1]};})(),
      baseline:window.__c.dwellStats(window.__c.start,E.tick)}`)),
  ev(iife(`${ARC}
    const H=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=0);
    const D=window.__c.ev.filter(e=>e.T==='death');const HS=window.__c.ev.filter(e=>e.T==='hitstop');
    const dead=(h)=>D.some(d=>d.id===h.target&&Math.abs(d.tick-h.tick)<=1);
    const arcNK=H.filter(h=>isArc(h)&&!dead(h));
    return {first30arcHits:arcNK.slice(0,30).map(h=>[h.tick,h.source,'atk'+h.attacker,h.amount,window.__c.dwell(h.tick),(HS.find(s=>s.tick>=h.tick&&s.tick<=h.tick+2)||{}).cause||'none'])}`)),
  ev(iife(`const HS=window.__c.ev.filter(e=>e.T==='hitstop');return {allHitstops:HS.map(s=>[s.tick,s.cause,s.ticks]),shakes:window.__c.ev.filter(e=>e.T==='screenshake').map(s=>[s.tick,s.cause,s.amp,s.durationSec]).slice(0,20)}`)),
  ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;const s=E.state();
    return {totals:m,tick:E.tick,fps:E.fps,ver:E.version,enemies:s.enemies.map(e=>[e.id,e.kind,e.hp]),party:s.party.map(p=>[p.id,p.kind,p.hp,+p.x.toFixed(2),+p.z.toFixed(2)])}`)),
];
mkdirSync('tools/actions', { recursive: true });
writeFileSync('tools/actions/certC2-b-boss2.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certC2-b-boss2.json', acts.length);
