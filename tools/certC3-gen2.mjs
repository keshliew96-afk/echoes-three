// C1 movement latency + C2 dash/i-frames.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick${extra}}})()`);
const files = {};

// ---- shared setup: start a run, hold room 1 open, park + i-frame the player ----
const SETUP = [
  ev(iife(`window.__c={ev:[]};for(const t of ['intent','dash_end','hit','hit_immune','sound','hitstop','death','room_cleared','enemy_spawn'])E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 30000, `,enemies:E.state().enemies.length`),
  ev(iife(`E.cmd('teleport',-3,2);E.cmd('iframe',0,7200);
    const s1=E.cmd('spawn','boar',9,-6),s2=E.cmd('spawn','boar',-9,-6);
    const st=E.state();for(const e of st.enemies)E.cmd('iframe',e.id,7200);
    return {spawned:[JSON.stringify(s1),JSON.stringify(s2)],enemies:st.enemies.map(e=>[e.id,e.kind,e.iframed]),player:[st.party[0].x,st.party[0].z,st.party[0].hp]}`)),
  wait(600),
  // per-rendered-frame sampler: one row per NEW sim tick + DOM keydown/keyup stamps
  ev(iife(`window.__s={rows:[],kd:[],ku:[],last:-1};
    const f=()=>{const t=E.tick;if(t!==window.__s.last){const p=E.state().party[0];
      window.__s.rows.push([t,+p.x.toFixed(4),+p.z.toFixed(4),p.dashTicksLeft|0,p.hp,+performance.now().toFixed(1)]);window.__s.last=t;}
      requestAnimationFrame(f);};requestAnimationFrame(f);
    addEventListener('keydown',e=>{if(!e.repeat)window.__s.kd.push([e.code,E.tick,+performance.now().toFixed(1)]);},true);
    addEventListener('keyup',e=>window.__s.ku.push([e.code,E.tick,+performance.now().toFixed(1)]),true);
    return 'sampler armed at '+E.tick`)),
];

// ---- C1: 5 trials per key, then 10x A/D alternation at 100 ms ----
const trials = [];
for (let i = 0; i < 5; i++) for (const k of ['KeyD', 'KeyA', 'KeyW', 'KeyS']) {
  trials.push(down(k), wait(260), up(k), wait(260));
}
const alt = [];
for (let i = 0; i < 10; i++) { alt.push(down('KeyD'), wait(100), up('KeyD'), down('KeyA'), wait(100), up('KeyA')); }

const ANALYZE = ev(iife(`
  const S=window.__s,rows=S.rows,kd=S.kd;
  const AX={KeyD:['x',1],KeyA:['x',-1],KeyW:['z',-1],KeyS:['z',1]};
  const val=(r,a)=>a==='x'?r[1]:r[2];
  const out=[];
  for(const rec of kd){
    const code=rec[0],t0=rec[1];
    const A=AX[code];if(!A)continue;
    let ref=null,refi=-1;
    for(let i=0;i<rows.length;i++){if(rows[i][0]<=t0){ref=rows[i];refi=i;}else break;}
    if(!ref){out.push({code,t0,err:'no-ref'});continue;}
    let hit=null,hi=-1;
    for(let i=refi+1;i<rows.length;i++){const d=(val(rows[i],A[0])-val(ref,A[0]))*A[1];if(d>=0.02){hit=rows[i];hi=i;break;}
      if(rows[i][0]-t0>40)break;}
    if(!hit){out.push({code,t0,err:'no-move'});continue;}
    const span=hit[0]-rows[hi-1][0];
    out.push({code,t0,refTick:ref[0],moveTick:hit[0],raw:hit[0]-t0,span,corrected:(hit[0]-t0)-(span-1),
      d:+((val(hit,A[0])-val(ref,A[0]))*A[1]).toFixed(4)});
  }
  const lat=out.filter(o=>!o.err);
  return {n:out.length,fps:E.fps,rowsN:rows.length,worstRaw:Math.max.apply(null,lat.map(o=>o.raw)),worstCorrected:Math.max.apply(null,lat.map(o=>o.corrected)),trials:out}`));

files['certC3-move'] = [
  ...SETUP,
  ev(iife(`window.__s.mark1=E.tick;return 'trials start '+E.tick`)),
  ...trials,
  wait(300),
  ev(iife(`window.__s.mark2=E.tick;return 'alt start '+E.tick`)),
  ...alt,
  wait(400),
  ev(iife(`return {tick:E.tick,fps:E.fps,kd:window.__s.kd.length,rows:window.__s.rows.length,mark1:window.__s.mark1,mark2:window.__s.mark2,hitsOnPlayer:window.__c.ev.filter(e=>e.T==='hit'&&e.target===0).length,immune:window.__c.ev.filter(e=>e.T==='hit_immune').length,cleared:window.__c.ev.filter(e=>e.T==='room_cleared').length}`)),
  ANALYZE,
  // alternation detail: per-tick x-velocity sign around each flip
  ev(iife(`const S=window.__s,rows=S.rows.filter(r=>r[0]>=S.mark2),kd=S.kd.filter(k=>k[1]>=S.mark2);
    const flips=[];
    for(const rec of kd){const code=rec[0],t0=rec[1];const want=code==='KeyD'?1:-1;
      let ref=null,refi=-1;for(let i=0;i<rows.length;i++){if(rows[i][0]<=t0){ref=rows[i];refi=i;}else break;}
      if(!ref){flips.push({code,t0,err:'noref'});continue;}
      let hit=null,hi=-1;for(let i=refi+1;i<rows.length;i++){if((rows[i][1]-ref[1])*want>=0.02){hit=rows[i];hi=i;break;}if(rows[i][0]-t0>40)break;}
      if(!hit){flips.push({code,t0,err:'nomove'});continue;}
      const span=hit[0]-rows[hi-1][0];
      flips.push({code,t0,moveTick:hit[0],raw:hit[0]-t0,corrected:(hit[0]-t0)-(span-1),span});}
    const ok=flips.filter(f=>!f.err);
    return {flips:flips.length,worstRaw:Math.max.apply(null,ok.map(f=>f.raw)),worstCorrected:Math.max.apply(null,ok.map(f=>f.corrected)),detail:flips}`)),
  ev(iife(`const S=window.__s,rows=S.rows.filter(r=>r[0]>=S.mark2);
    let out='';for(let i=1;i<rows.length;i++){const dx=rows[i][1]-rows[i-1][1];out+=rows[i][0]+(dx>0.005?'+':dx<-0.005?'-':'0')+' ';}
    return out.slice(0,1400)`)),
];

// ---- C2: dash latency + i-frames ----
const dashTrial = (n) => [
  ev(iife(`window.__d=window.__d||[];const rec={trial:${n}};window.__d.push(rec);
    (async()=>{const t0=E.tick;
      while(E.tick-t0<240&&E.state().party[0].dashTicksLeft<=0)await new Promise(r=>setTimeout(r,4));
      const p=E.state().party[0];rec.dashSeenTick=E.tick;rec.dashTicksLeft=p.dashTicksLeft;rec.hpBefore=p.hp;
      rec.midHit=E.cmd('hitOnce',0);rec.midTick=E.tick;rec.hpAfterMid=E.state().party[0].hp;
      while(E.tick-t0<400&&E.state().party[0].dashTicksLeft>0)await new Promise(r=>setTimeout(r,4));
      rec.dashOverTick=E.tick;
      const w=E.tick;while(E.tick-w<6)await new Promise(r=>setTimeout(r,4));
      rec.postHit=E.cmd('hitOnce',0);rec.postTick=E.tick;rec.hpAfterPost=E.state().party[0].hp;rec.done=true;})();
    return 'armed '+${n}+' at '+E.tick`)),
  down('Space'), wait(90), up('Space'), wait(1400),
];

files['certC3-dash'] = [
  ...SETUP,
  ev(iife(`E.cmd('heal',0,100);return {hp:E.state().party[0].hp}`)),
  // 5 plain latency trials (no hits)
  ...[0, 1, 2, 3, 4].flatMap(() => [down('Space'), wait(90), up('Space'), wait(900)]),
  wait(400),
  ev(iife(`const kd=window.__s.kd.filter(k=>k[0]==='Space');const evs=window.__c.ev;
    const rows=[];for(const rec of kd){const t0=rec[1];const i=evs.find(e=>e.T==='intent'&&e.kind==='dodge'&&e.tick>=t0&&e.tick<=t0+12);
      const de=i?evs.find(e=>e.T==='dash_end'&&e.tick>=i.tick):null;
      rows.push({keydownTick:t0,intentTick:i?i.tick:null,latency:i?i.tick-t0:null,dashEnd:de?de.tick:null,cause:de?de.cause:null,duration:i&&de?de.tick-i.tick:null});}
    return {n:rows.length,fps:E.fps,rows}`)),
  // i-frame trials: hit during dash, then after
  ev(iife(`E.cmd('iframe',0,0);E.cmd('heal',0,100);window.__d=[];return {hp:E.state().party[0].hp,iframedCleared:true}`)),
  ...dashTrial(1), ...dashTrial(2), ...dashTrial(3),
  wait(600),
  ev(iife(`return JSON.stringify(window.__d)`)),
  ev(iife(`const evs=window.__c.ev;return {immuneOnPlayer:evs.filter(e=>e.T==='hit_immune'&&e.target===0).map(e=>[e.tick,e.reason]),
    hitsOnPlayer:evs.filter(e=>e.T==='hit'&&e.target===0).map(e=>[e.tick,e.amount,e.source]),
    intents:evs.filter(e=>e.T==='intent').map(e=>[e.tick,e.kind]),dashEnds:evs.filter(e=>e.T==='dash_end').map(e=>[e.tick,e.cause]),
    fps:E.fps,tick:E.tick}`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
