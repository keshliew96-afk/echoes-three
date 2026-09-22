// Certification C round 5 — action-file generator (responsiveness bar).
// Writes tools/actions/certC5-*.json programmatically. Never hand-escape JSON.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const shot = (name) => ({ type: 'shot', name });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const EVTYPES = ['intent', 'dash_end', 'hit', 'hit_immune', 'sound', 'hitstop', 'death', 'screenshake',
  'room_cleared', 'enemy_spawn', 'telegraph_start', 'telegraph_resolve', 'enemy_fire', 'enemy_bite',
  'wave_start', 'room_enter', 'downed', 'revive', 'boss_quake_start', 'boss_quake_resolve', 'boss_trample',
  'knockback', 'flash', 'run_end'];
const ARM = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(EVTYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return {armed:E.tick,version:E.version}`));

const VER = ev(iife(`return {version:E.version,tick:E.tick,fps:E.fps,seed:E.seed,bootSeed:E.bootSeed}`));

// per-rendered-frame sampler: one row per NEW sim tick [tick,x,z,dashTicksLeft,hp,wallMs] + DOM keydown stamps
const SAMPLER = ev(iife(`window.__s={rows:[],kd:[],ku:[],last:-1};
  const f=()=>{const t=E.tick;if(t!==window.__s.last){const p=E.state().party[0];
    window.__s.rows.push([t,+p.x.toFixed(4),+p.z.toFixed(4),p.dashTicksLeft|0,p.hp,+performance.now().toFixed(1)]);window.__s.last=t;}
    requestAnimationFrame(f);};requestAnimationFrame(f);
  addEventListener('keydown',e=>{if(!e.repeat)window.__s.kd.push([e.code,E.tick,+performance.now().toFixed(1)]);},true);
  addEventListener('keyup',e=>window.__s.ku.push([e.code,E.tick,+performance.now().toFixed(1)]),true);
  return 'sampler armed at '+E.tick`));

const PROJ = `window.__proj=(x,y,z)=>{const cam=window.__arenaProbe.stage.camera;cam.updateMatrixWorld();
  const mv=cam.matrixWorldInverse.elements,pm=cam.projectionMatrix.elements;
  const mul=(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3]];
  let v=mul(mv,[x,y,z,1]);v=mul(pm,v);const w=v[3]||1;
  return [Math.round((v[0]/w*0.5+0.5)*innerWidth),Math.round((-v[1]/w*0.5+0.5)*innerHeight)];};`;

const files = {};

// ================= RECON =================
files['certC5-recon'] = [
  VER,
  ev(iife(`return {keys:Object.keys(E),hudKeys:Object.keys(E.hud||{})}`)),
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick,run:JSON.stringify(E.cmd('runState')).slice(0,400)}`)),
  waitFor(`E.state().enemies.length>=2`, 40000, `,enemies:E.state().enemies.length`),
  ev(iife(`const s=E.state();return {stateKeys:Object.keys(s),party0:s.party[0],enemy0:s.enemies[0],vfxArena:s.vfx.arena?Object.keys(s.vfx.arena):null,numerals:s.vfx.arena?s.vfx.arena.numerals:s.vfx.numerals}`)),
  ev(iife(`return {probe:window.__arenaProbe?Object.keys(window.__arenaProbe):null,stage:window.__arenaProbe&&window.__arenaProbe.stage?Object.keys(window.__arenaProbe.stage):null,numLayer:!!document.querySelector('#dmg-num-layer'),threatLayer:!!document.querySelector('#hud-threat'),canvas:(c=>c?[c.width,c.height]:null)(document.querySelector('canvas'))}`)),
  ev(iife(`return {hitOnce:JSON.stringify(E.cmd('hitOnce',0)),hp:E.state().party[0].hp}`)),
  down('Space'), wait(100), up('Space'), wait(700),
  ev(iife(`const seen={};for(const e of window.__c.ev)seen[e.T]=seen[e.T]||JSON.stringify(e).slice(0,220);return seen`)),
  ev(iife(`return {threat:JSON.stringify(E.hud.threat()).slice(0,600),combat:JSON.stringify(E.hud.combat()),banner:JSON.stringify(E.hud.banner()).slice(0,300)}`)),
];

// ================= C1 MOVEMENT LATENCY =================
const SETUP_HOLD = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 40000, `,enemies:E.state().enemies.length`),
  ev(iife(`E.cmd('teleport',-3,2);E.cmd('iframe',0,7200);
    const s1=E.cmd('spawn','boar',9,-6),s2=E.cmd('spawn','boar',-9,-6);
    const st=E.state();for(const e of st.enemies)E.cmd('iframe',e.id,7200);
    return {spawned:[JSON.stringify(s1),JSON.stringify(s2)],enemies:st.enemies.map(e=>[e.id,e.kind,e.iframed]),player:[st.party[0].x,st.party[0].z,st.party[0].hp]}`)),
  wait(600),
  SAMPLER,
];

const trials = [];
for (let i = 0; i < 5; i++) for (const k of ['KeyD', 'KeyA', 'KeyW', 'KeyS']) trials.push(down(k), wait(260), up(k), wait(260));
const alt = [];
for (let i = 0; i < 10; i++) alt.push(down('KeyD'), wait(100), up('KeyD'), down('KeyA'), wait(100), up('KeyA'));

const ANALYZE_MOVE = ev(iife(`
  const S=window.__s,rows=S.rows,kd=S.kd;
  const AX={KeyD:['x',1],KeyA:['x',-1],KeyW:['z',-1],KeyS:['z',1]};
  const val=(r,a)=>a==='x'?r[1]:r[2];
  const out=[];
  for(const rec of kd){const code=rec[0],t0=rec[1];const A=AX[code];if(!A)continue;
    let ref=null,refi=-1;for(let i=0;i<rows.length;i++){if(rows[i][0]<=t0){ref=rows[i];refi=i;}else break;}
    if(!ref){out.push({code,t0,err:'no-ref'});continue;}
    let hit=null,hi=-1;
    for(let i=refi+1;i<rows.length;i++){const d=(val(rows[i],A[0])-val(ref,A[0]))*A[1];if(d>=0.02){hit=rows[i];hi=i;break;}if(rows[i][0]-t0>40)break;}
    if(!hit){out.push({code,t0,err:'no-move'});continue;}
    const span=hit[0]-rows[hi-1][0];
    out.push({code,t0,refTick:ref[0],moveTick:hit[0],raw:hit[0]-t0,span,corrected:(hit[0]-t0)-(span-1),d:+((val(hit,A[0])-val(ref,A[0]))*A[1]).toFixed(4)});}
  const lat=out.filter(o=>!o.err);
  return {n:out.length,fps:E.fps,rowsN:rows.length,worstRaw:Math.max.apply(null,lat.map(o=>o.raw)),worstCorrected:Math.max.apply(null,lat.map(o=>o.corrected)),rawOver2:lat.filter(o=>o.raw>2).length,trials:out}`));

files['certC5-move'] = [
  ...SETUP_HOLD,
  ev(iife(`window.__s.mark1=E.tick;return 'trials start '+E.tick`)),
  ...trials,
  wait(300),
  ev(iife(`window.__s.mark2=E.tick;return 'alt start '+E.tick`)),
  ...alt,
  wait(400),
  ev(iife(`return {tick:E.tick,fps:E.fps,version:E.version,kd:window.__s.kd.length,rows:window.__s.rows.length,mark1:window.__s.mark1,mark2:window.__s.mark2,hitsOnPlayer:window.__c.ev.filter(e=>e.T==='hit'&&e.target===0).length,immune:window.__c.ev.filter(e=>e.T==='hit_immune').length,cleared:window.__c.ev.filter(e=>e.T==='room_cleared').length,enemies:E.state().enemies.length}`)),
  ANALYZE_MOVE,
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
    return out.slice(0,1600)`)),
];

// ================= C2 DASH / I-FRAMES =================
const dashArm = (n) => ev(iife(`window.__d=window.__d||[];const rec={trial:${n}};window.__d.push(rec);
  (async()=>{const t0=E.tick;
    while(E.tick-t0<240&&E.state().party[0].dashTicksLeft<=0)await new Promise(r=>setTimeout(r,4));
    const p=E.state().party[0];rec.dashSeenTick=E.tick;rec.dashTicksLeft=p.dashTicksLeft;rec.hpBefore=p.hp;
    rec.midHit=E.cmd('hitOnce',0);rec.midTick=E.tick;rec.hpAfterMid=E.state().party[0].hp;
    while(E.tick-t0<400&&E.state().party[0].dashTicksLeft>0)await new Promise(r=>setTimeout(r,4));
    rec.dashOverTick=E.tick;const w=E.tick;while(E.tick-w<6)await new Promise(r=>setTimeout(r,4));
    rec.postHit=E.cmd('hitOnce',0);rec.postTick=E.tick;rec.hpAfterPost=E.state().party[0].hp;rec.done=true;})();
  return 'armed '+${n}+' at '+E.tick`));

files['certC5-dash'] = [
  ...SETUP_HOLD,
  ev(iife(`E.cmd('heal',0,100);return {hp:E.state().party[0].hp}`)),
  // 5 latency trials spaced 1500 ms (> 72-tick dodge cooldown), alternate direction so no wall pin
  ...[0, 1, 2, 3, 4].flatMap((i) => [down(i % 2 ? 'KeyA' : 'KeyD'), wait(40), down('Space'), wait(90), up('Space'), up(i % 2 ? 'KeyA' : 'KeyD'), wait(1500)]),
  wait(300),
  ev(iife(`const kd=window.__s.kd.filter(k=>k[0]==='Space');const evs=window.__c.ev;const S=window.__s.rows;
    const rows=kd.map(rec=>{const t0=rec[1];const i=evs.find(e=>e.T==='intent'&&e.kind==='dodge'&&e.tick>=t0&&e.tick<=t0+12);
      const de=i?evs.find(e=>e.T==='dash_end'&&e.tick>=i.tick):null;
      const a=i?S.filter(r=>r[0]<=i.tick).pop():null,b=de?S.find(r=>r[0]>=de.tick):null;
      return {keydownTick:t0,intentTick:i?i.tick:null,latency:i?i.tick-t0:null,dashEnd:de?de.tick:null,cause:de?de.cause:null,duration:i&&de?de.tick-i.tick:null,travel:a&&b?+Math.hypot(b[1]-a[1],b[2]-a[2]).toFixed(3):null};});
    return {n:rows.length,fps:E.fps,version:E.version,rows,soundDodge:evs.filter(e=>e.T==='sound'&&/dodge|dash|whoosh/.test(e.slot||'')).map(e=>e.tick)}`)),
  // i-frame trials: global i-frame cleared, hit mid-dash then after
  ev(iife(`E.cmd('iframe',0,0);E.cmd('heal',0,100);window.__d=[];return {hp:E.state().party[0].hp,iframeCleared:true}`)),
  dashArm(1), down('KeyD'), wait(40), down('Space'), wait(90), up('Space'), up('KeyD'), wait(1600),
  dashArm(2), down('KeyA'), wait(40), down('Space'), wait(90), up('Space'), up('KeyA'), wait(1600),
  dashArm(3), down('KeyD'), wait(40), down('Space'), wait(90), up('Space'), up('KeyD'), wait(1600),
  ev(iife(`return JSON.stringify(window.__d)`)),
  ev(iife(`const evs=window.__c.ev;return {immuneOnPlayer:evs.filter(e=>e.T==='hit_immune'&&e.target===0).map(e=>[e.tick,e.reason]),
    hitsOnPlayer:evs.filter(e=>e.T==='hit'&&e.target===0).map(e=>[e.tick,e.amount,e.source]),
    intents:evs.filter(e=>e.T==='intent').map(e=>[e.tick,e.kind]),dashEnds:evs.filter(e=>e.T==='dash_end').map(e=>[e.tick,e.cause]),
    fps:E.fps,tick:E.tick}`)),
];

// natural biter: a boar parked beside the player bites while the player dodges 12x alternating direction
const pairDash = (mv) => [down(mv), wait(40), down('Space'), wait(90), up('Space'), up(mv), wait(1200)];
files['certC5-dash-nat'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 40000),
  ev(iife(`E.cmd('teleport',-3,2);
    for(const e of E.state().enemies)E.cmd('iframe',e.id,30000);
    const id=E.cmd('spawn','boar',-3.0,2.7);window.__biter=id;
    (async()=>{while(true){if(E.state().party[0].hp<70)E.cmd('heal',0,100);await new Promise(r=>setTimeout(r,100));}})();
    return {biter:JSON.stringify(id),enemies:E.state().enemies.map(e=>[e.id,e.kind,e.iframed])}`)),
  wait(700),
  SAMPLER,
  ...Array.from({ length: 12 }).flatMap((_, i) => pairDash(i % 2 ? 'KeyA' : 'KeyD')),
  wait(400),
  ev(iife(`const evs=window.__c.ev,S=window.__s.rows;
    const dashes=[];for(const i of evs.filter(e=>e.T==='intent'&&e.kind==='dodge')){
      const de=evs.find(e=>e.T==='dash_end'&&e.tick>=i.tick);
      const a=S.filter(r=>r[0]<=i.tick).pop(),b=S.find(r=>r[0]>=(de?de.tick:i.tick+15));
      dashes.push({start:i.tick,end:de?de.tick:null,cause:de?de.cause:null,dur:de?de.tick-i.tick:null,travel:a&&b?+Math.hypot(b[1]-a[1],b[2]-a[2]).toFixed(3):null});}
    const full=dashes.filter(d=>d.dur>=10);
    const inside=(t)=>full.find(d=>t>d.start&&t<d.end);
    const hits=evs.filter(e=>e.T==='hit'&&e.target===0);
    const imm=evs.filter(e=>e.T==='hit_immune'&&e.target===0);
    const kd=window.__s.kd.filter(k=>k[0]==='Space').map(k=>k[1]);
    const lat=kd.map(t0=>{const i=evs.find(e=>e.T==='intent'&&e.kind==='dodge'&&e.tick>=t0&&e.tick<=t0+12);return [t0,i?i.tick:null,i?i.tick-t0:null];});
    return {fps:E.fps,version:E.version,tick:E.tick,dashes:dashes.length,fullDashes:full.length,
      hitsTotal:hits.length,hitsInsideFullDash:hits.filter(h=>inside(h.tick)).map(h=>[h.tick,h.amount]),
      immuneTotal:imm.length,immuneInsideFullDash:imm.filter(h=>inside(h.tick)).map(h=>[h.tick,h.reason]),
      dashSpans:full.map(d=>[d.start,d.end,d.cause,d.dur,d.travel]),
      keydownLatency:lat,
      hitTicks:hits.map(h=>[h.tick,h.amount]),immTicks:imm.map(h=>[h.tick,h.reason])}`)),
];

// ================= C3 TELEGRAPHS =================
const DRIVER = `(async()=>{while(true){try{const u=E.runUi();
  if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);
  else if(u.screen==='shop')E.cmd('shopAdvance');else if(u.screen==='reward'||u.screen==='reward_offer')E.cmd('draftDecline');
  E.cmd('iframe',0,600);if(E.state().party[0].hp<100)E.cmd('heal',0,100);}catch(err){window.__drverr=String(err);}
  await new Promise(r=>setTimeout(r,250));}})();`;

const TELE_REPORT = ev(iife(`const evs=window.__c.ev;const rows=[];
  for(const s of evs.filter(e=>e.T==='telegraph_start')){
    const r=evs.find(e=>e.T==='telegraph_resolve'&&e.id===s.id&&e.tick>=s.tick);
    const f=evs.find(e=>e.T==='enemy_fire'&&e.id===s.id&&e.tick>=s.tick&&e.tick<=s.tick+60);
    const d=evs.find(e=>e.T==='death'&&e.id===s.id&&e.tick>=s.tick);
    rows.push([s.id,s.tick,s.resolveTick,s.resolveTick-s.tick,r?r.tick:null,r?r.tick-s.tick:null,f?f.tick:null,d?d.tick:null]);}
  const gaps=rows.filter(r=>r[5]!=null).map(r=>r[5]);
  const starts=rows.map(r=>r[1]);const inter=[];for(let i=1;i<starts.length;i++)inter.push(starts[i]-starts[i-1]);
  return {tick:E.tick,fps:E.fps,version:E.version,n:rows.length,resolved:gaps.length,
    minPlanned:rows.length?Math.min.apply(null,rows.map(r=>r[3])):null,maxPlanned:rows.length?Math.max.apply(null,rows.map(r=>r[3])):null,
    minGap:gaps.length?Math.min.apply(null,gaps):null,maxGap:gaps.length?Math.max.apply(null,gaps):null,
    belowGate:gaps.filter(g=>g<42).length,fireAtResolve:rows.filter(r=>r[4]!=null&&r[6]===r[4]).length,
    unresolvedWithoutDeath:rows.filter(r=>r[4]==null&&r[7]==null&&r[2]<E.tick).length,
    minInterStart:inter.length?Math.min.apply(null,inter):null,rows}`));

files['certC5-tele'] = [
  ARM,
  ev(iife(`E.cmd('startRun');${DRIVER}return {seed:E.seed,tick:E.tick,modes:E.cmd('runState').frame.modes}`)),
  wait(70000),
  ev(iife(`const evs=window.__c.ev;return {tick:E.tick,fps:E.fps,starts:evs.filter(e=>e.T==='telegraph_start').length,resolves:evs.filter(e=>e.T==='telegraph_resolve').length,fires:evs.filter(e=>e.T==='enemy_fire').length,deaths:evs.filter(e=>e.T==='death').length,rooms:evs.filter(e=>e.T==='room_enter').map(e=>[e.tick,e.index,e.mode]),waves:evs.filter(e=>e.T==='wave_start').length,drverr:window.__drverr||null,sampleStart:JSON.stringify(evs.find(e=>e.T==='telegraph_start')||null),sampleResolve:JSON.stringify(evs.find(e=>e.T==='telegraph_resolve')||null)}`)),
  TELE_REPORT,
];

// high-N: six mantises kept alive around the i-framed player
files['certC5-tele2'] = [
  ARM,
  ev(iife(`E.cmd('startRun');
    (async()=>{while(true){try{E.cmd('iframe',0,600);if(E.state().party[0].hp<100)E.cmd('heal',0,100);
      const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);
      const ms=E.state().enemies.filter(e=>e.kind==='mantis');
      if(ms.length<6){for(let i=ms.length;i<6;i++){const a=i*1.05;E.cmd('spawn','mantis',+(Math.cos(a)*5).toFixed(2),+(Math.sin(a)*5).toFixed(2));}}
      for(const e of E.state().enemies)E.cmd('iframe',e.id,600);}catch(err){window.__err=String(err);}
      await new Promise(r=>setTimeout(r,300));}})();
    return {seed:E.seed,tick:E.tick}`)),
  wait(65000),
  TELE_REPORT,
];

// mid-telegraph pixels: real harness shots the instant a telegraph goes live with >=30 ticks left
const LIVE = `window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&!window.__c.ev.some(r=>r.T==='telegraph_resolve'&&r.id===e.id&&r.tick>=e.tick))`;
const teleShot = (n, minLeft) => [
  { type: 'loop', label: 'waitTele' + n, cond: `(()=>{const E=__echoes;return ${LIVE}.some(e=>e.resolveTick-E.tick>=${minLeft});})()`, maxMs: 40000, body: [wait(15)] },
  ev(iife(`const live=${LIVE};return {pre:${n},tick:E.tick,live:live.map(t=>[t.id,t.tick,t.resolveTick,t.resolveTick-E.tick,t.x,t.z,window.__proj(t.x,0.02,t.z),t.target,t.playerTargeted]),enemies:E.state().enemies.map(e=>[e.id,e.kind,window.__proj(e.x,0.55,e.z)])}`)),
  shot('certC5-teleshot' + n),
  ev(iife(`const live=${LIVE};return {post:${n},tick:E.tick,live:live.map(t=>[t.id,t.tick,t.resolveTick,t.resolveTick-E.tick,window.__proj(t.x,0.02,t.z)])}`)),
  wait(1500),
];
files['certC5-telepx'] = [
  ARM,
  ev(iife(`E.cmd('startRun');${DRIVER}return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 40000),
  ev(iife(`${PROJ}return 'proj armed'`)),
  ...teleShot(1, 32), ...teleShot(2, 32), ...teleShot(3, 34),
  VER,
];

// clean frames: no live telegraph, no enemies
files['certC5-clean'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 40000),
  ev(iife(`E.cmd('iframe',0,60000);E.cmd('killAllEnemies');return {tick:E.tick,enemies:E.state().enemies.length}`)),
  wait(450),
  ev(iife(`const s=E.state();const live=${LIVE};return {beforeShot:{tick:E.tick,enemies:s.enemies.length,eshots:s.eshots.length,azones:s.azones.length,zones:s.zones.length,liveTele:live.length,ui:E.runUi().screen}}`)),
  shot('certC5-clean-between'),
  ev(iife(`const s=E.state();const live=${LIVE};return {afterShot:{tick:E.tick,enemies:s.enemies.length,eshots:s.eshots.length,liveTele:live.length,ui:E.runUi().screen}}`)),
];

// ================= C4 HIT FEEDBACK =================
const HIT_SAMPLER = ev(iife(`${PROJ}
  const S=4,DW=400,DH=225;const src=document.querySelector('canvas');
  const dc=document.createElement('canvas');dc.width=DW;dc.height=DH;const dg=dc.getContext('2d',{willReadFrequently:true});
  const layer=document.querySelector('#dmg-num-layer');
  window.__f={flash:{},num:[],numSeen:[],tick:[],ent:[],cam:[],frames:0,last:-1,lastWall:0,numState:new Map(),err:null};
  const F=window.__f;
  const step=()=>{F.frames++;const t=E.tick;const now=performance.now();const st=E.state();
    if(t!==F.last){if(F.last>=0)F.tick.push([F.last,+(now-F.lastWall).toFixed(1),t-F.last]);F.last=t;F.lastWall=now;
      const p=st.party[0];
      F.ent.push([t,st.enemies.map(e=>[e.id,+e.x.toFixed(3),+e.z.toFixed(3),e.hp,e.kbTicks|0]),
        (st.vfx.arena?st.vfx.arena.numerals:st.vfx.numerals)|0,+p.x.toFixed(3),+p.z.toFixed(3),p.hp]);
      const cm=st.vfx.arena?st.vfx.arena.cam:null;if(cm)F.cam.push([t,+cm[0].toFixed(4),+cm[1].toFixed(4)]);}
    if(layer){for(const n of layer.querySelectorAll('.dmg-num')){
        const s=getComputedStyle(n);
        const v=s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity||'1')>0.05;
        const txt=(n.textContent||'').trim();
        const prev=F.numState.get(n)||{v:false,txt:''};
        if(v){const r=n.getBoundingClientRect();
          F.numSeen.push([t,txt,Math.round(r.x),Math.round(r.y)]);
          if(!prev.v||prev.txt!==txt)F.num.push([t,txt,Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]);}
        F.numState.set(n,{v,txt});}
      if(F.numSeen.length>40000)F.numSeen.splice(0,20000);}
    try{dg.clearRect(0,0,DW,DH);dg.drawImage(src,0,0,DW,DH);
      const img=dg.getImageData(0,0,DW,DH).data;
      for(const e of st.enemies){const pr=window.__proj(e.x,0.55,e.z);
        const x0=Math.round((pr[0]-32)/S),y0=Math.round((pr[1]-44)/S),bw=16,bh=22;
        if(x0<0||y0<0||x0+bw>DW||y0+bh>DH){(F.flash[e.id]=F.flash[e.id]||[]).push([t,null,pr[0],pr[1]]);continue;}
        let w=0,n2=0;
        for(let yy=y0;yy<y0+bh;yy++){let o=(yy*DW+x0)*4;
          for(let xx=0;xx<bw;xx++,o+=4){const r=img[o],g2=img[o+1],b=img[o+2];
            const L=0.2126*r+0.7152*g2+0.0722*b;const mx=Math.max(r,g2,b),mn=Math.min(r,g2,b);
            if(L>230&&(mx?(mx-mn)/mx:0)<0.18)w++;n2++;}}
        (F.flash[e.id]=F.flash[e.id]||[]).push([t,+(w/n2).toFixed(3),pr[0]-32,pr[1]-44]);}
    }catch(err){F.err=String(err);}
    requestAnimationFrame(step);};
  requestAnimationFrame(step);return 'hit sampler armed at '+E.tick`));

const HIT_REPORT = ev(iife(`
  const F=window.__f,evs=window.__c.ev;
  const ENEMY={boar:1,mantis:1,stag:1};
  const hits=evs.filter(e=>e.T==='hit'&&ENEMY[e.kind]);
  const dwell={};for(const r of F.tick)dwell[r[0]]=r[1];
  const entAt=(t)=>{let best=null;for(const r of F.ent){if(r[0]<=t)best=r;else break;}return best;};
  const numUsed=new Set();const rows=[];
  for(const h of hits){const T=h.tick,V=h.target;
    let num=null;
    for(let i=0;i<F.num.length;i++){const n=F.num[i];if(numUsed.has(i))continue;
      if(n[0]>=T-1&&n[0]<=T+2&&n[1]===String(h.amount)){num=n;numUsed.add(i);break;}}
    let seen=null;
    if(!num){for(const n of F.numSeen){if(n[0]>=T&&n[0]<=T+8&&n[1]===String(h.amount)){seen=n;break;}}}
    const a=entAt(T-1),b=F.ent.find(r=>r[0]>=T+2);
    const poolStep=a&&b?b[2]-a[2]:null;
    const snd=evs.some(e=>e.T==='sound'&&e.tick>=T&&e.tick<=T+2);
    let kb=null,kbT=null;
    const r0=entAt(T),r1=F.ent.find(r=>r[0]>=T+10);
    if(r0&&r1){const p0=r0[1].find(x=>x[0]===V),p1=r1[1].find(x=>x[0]===V);
      if(p0&&p1){kb=+((p1[1]-p0[1])*(h.dirX||0)+(p1[2]-p0[2])*(h.dirZ||0)).toFixed(3);kbT=p0[4];}}
    let fl=null,flPre=null,flBox=null;const fr=F.flash[V]||[];
    const pre=fr.filter(r=>r[0]>=T-8&&r[0]<T&&r[1]!=null).map(r=>r[1]);
    const post=fr.filter(r=>r[0]>=T&&r[0]<=T+2&&r[1]!=null);
    if(post.length){const best=post.reduce((m,r)=>r[1]>m[1]?r:m,post[0]);fl=best[1];flBox=[best[2],best[3]];flPre=pre.length?Math.max.apply(null,pre):null;}
    const stop=evs.filter(e=>e.T==='hitstop'&&e.tick>=T&&e.tick<=T+2).map(e=>e.ticks+':'+e.cause);
    const kill=evs.some(e=>e.T==='death'&&e.id===V&&e.tick>=T&&e.tick<=T+1);
    rows.push({t:T,v:V,src:h.source,shape:h.shape,amt:h.amount,kill,
      num:num?num[1]+'@'+num[2]+','+num[3]:null,seen:seen?seen[1]+'@'+seen[2]+','+seen[3]:null,
      poolStep,snd,kb,kbT,fl,flPre,flBox,dwell:dwell[T]||null,stop});}
  const nonKill=rows.filter(r=>!r.kill);
  const ok=(r)=>(!!r.num||!!r.seen)&&r.snd&&r.kb!=null&&Math.abs(r.kb)>=0.05&&r.fl!=null&&r.fl>=0.15;
  const arcNK=nonKill.filter(r=>r.shape==='melee_arc');
  const arcD=arcNK.map(r=>r.dwell).filter(v=>v!=null).sort((a,b)=>a-b);
  const baseD=F.tick.filter(r=>r[2]===1).map(r=>r[1]).sort((a,b)=>a-b);
  const heavy=nonKill.filter(r=>r.amt>=16);
  return {tick:E.tick,fps:E.fps,version:E.version,frames:F.frames,err:F.err,numRows:F.num.length,seenRows:F.numSeen.length,
    hits:rows.length,nonKill:nonKill.length,kills:rows.filter(r=>r.kill).length,
    numeralFresh2:rows.filter(r=>r.num).length,numeralAny:rows.filter(r=>r.num||r.seen).length,
    poolStepOk:rows.filter(r=>r.poolStep>0).length,soundOk:rows.filter(r=>r.snd).length,
    kbOk:nonKill.filter(r=>r.kb!=null&&Math.abs(r.kb)>=0.05).length,
    kbMedian:(()=>{const v=nonKill.map(r=>r.kb).filter(x=>x!=null&&Math.abs(x)>=0.05).map(Math.abs).sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:null;})(),
    flashOk2:nonKill.filter(r=>r.fl!=null&&r.fl>=0.15).length,
    flashPreMax:Math.max.apply(null,nonKill.map(r=>r.flPre==null?0:r.flPre)),
    allFour:nonKill.filter(ok).length,
    fails:nonKill.filter(r=>!ok(r)).map(r=>[r.t,r.src,r.amt,(r.num||r.seen)?'n':'NONUM',r.snd?'s':'NOSND',(r.kb!=null&&Math.abs(r.kb)>=0.05)?'k':('NOKB'+r.kb),(r.fl!=null&&r.fl>=0.15)?'f':('NOFL'+r.fl)]),
    heavyN:heavy.length,heavyWithStop:heavy.filter(r=>r.stop.length).length,heavyDetail:heavy.slice(0,40).map(r=>[r.t,r.src,r.amt,r.dwell,r.stop.join(',')||'none']),
    arcHits:rows.filter(r=>r.shape==='melee_arc').length,arcNonKill:arcNK.length,arcWithStop:arcNK.filter(r=>r.stop.length).length,
    arcDwell:{n:arcD.length,median:arcD[Math.floor(arcD.length/2)],max:arcD[arcD.length-1],over40:arcD.filter(v=>v>40).length},
    baseDwell:{n:baseD.length,median:baseD[Math.floor(baseD.length/2)],p99:baseD[Math.floor(baseD.length*0.99)],max:baseD[baseD.length-1]},
    killsWithStop:rows.filter(r=>r.kill&&r.stop.length).length,
    killsWithShake:rows.filter(r=>r.kill&&evs.some(e=>e.T==='screenshake'&&e.cause==='kill'&&e.tick>=r.t&&e.tick<=r.t+2)).length,
    stopCauses:evs.filter(e=>e.T==='hitstop').reduce((m,e)=>{const k=e.ticks+':'+e.cause;m[k]=(m[k]||0)+1;return m;},{}),
    deaths:evs.filter(e=>e.T==='death').length,shakes:evs.filter(e=>e.T==='screenshake').length,
    shakeCauses:evs.filter(e=>e.T==='screenshake').reduce((m,e)=>{m[e.cause]=(m[e.cause]||0)+1;return m;},{}),
    shakeSample:evs.filter(e=>e.T==='screenshake').slice(0,5).map(e=>JSON.stringify(e)),
    soundSlots:evs.filter(e=>e.T==='sound').reduce((m,e)=>{m[e.slot]=(m[e.slot]||0)+1;return m;},{}),
    sample:nonKill.slice(0,30).map(r=>[r.t,r.src,r.shape,r.amt,r.num||('seen:'+r.seen),r.poolStep,r.snd?1:0,r.kb,r.kbT,r.fl,r.flPre,r.flBox,r.stop.join(',')||'none'])}`));

const PIN = ev(iife(`(async()=>{while(true){try{
    E.cmd('iframe',0,600);const st=E.state();
    for(const p of st.party)if(p.hp<p.maxHp)E.cmd('heal',p.id,100);
    for(const e of st.enemies)E.cmd('setHp',e.id,1);
    const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);
    const boars=st.enemies.filter(e=>e.kind==='boar');
    if(boars.length<3){const p=st.party[1+((E.tick/13|0)%3)];if(p)E.cmd('spawn','boar',+(p.x+0.55).toFixed(2),+(p.z+0.55).toFixed(2));}
  }catch(err){window.__pinerr=String(err);}await new Promise(r=>setTimeout(r,16));}})();return 'pin armed'`));

files['certC5-hits'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.length`),
  ev(iife(`E.cmd('iframe',0,60000);E.cmd('killAllEnemies');const st=E.state();
    for(const p of st.party.slice(1))E.cmd('spawn','boar',+(p.x+0.55).toFixed(2),+(p.z+0.55).toFixed(2));
    return {party:st.party.map(p=>[p.id,p.kind,+p.x.toFixed(2),+p.z.toFixed(2)]),enemies:E.state().enemies.length}`)),
  PIN, wait(1200), HIT_SAMPLER,
  wait(45000),
  ev(iife(`return {enemies:E.state().enemies.length,hits:window.__c.ev.filter(e=>e.T==='hit').length,downed:window.__c.ev.filter(e=>e.T==='downed').length,cleared:window.__c.ev.filter(e=>e.T==='room_cleared').length,frames:window.__f.frames,pinerr:window.__pinerr||null}`)),
  HIT_REPORT,
];

// natural-density numeral audit (no pinning) + kill shake
files['certC5-numaudit'] = [
  ARM,
  ev(iife(`E.cmd('startRun');${DRIVER}return {seed:E.seed,tick:E.tick}`)),
  wait(1500),
  ev(iife(`const layer=document.querySelector('#dmg-num-layer');
    window.__n={num:[],seen:[],state:new Map(),frames:0,tick:[],last:-1,lastWall:0,pool:[]};
    const N=window.__n;
    const f=()=>{N.frames++;const t=E.tick;const now=performance.now();
      if(t!==N.last){if(N.last>=0)N.tick.push([N.last,+(now-N.lastWall).toFixed(1),t-N.last]);N.last=t;N.lastWall=now;
        const s=E.state();N.pool.push([t,(s.vfx.arena?s.vfx.arena.numerals:s.vfx.numerals)|0]);}
      for(const n of layer.querySelectorAll('.dmg-num')){const st=getComputedStyle(n);
        const v=st.display!=='none'&&st.visibility!=='hidden'&&parseFloat(st.opacity||'1')>0.05;
        const txt=(n.textContent||'').trim();const prev=N.state.get(n)||{v:false,txt:''};
        if(v){const r=n.getBoundingClientRect();
          N.seen.push([t,txt,Math.round(r.x),Math.round(r.y)]);
          if(!prev.v||prev.txt!==txt)N.num.push([t,txt,Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),st.color]);}
        N.state.set(n,{v,txt});}
      if(N.seen.length>60000)N.seen.splice(0,30000);
      requestAnimationFrame(f);};requestAnimationFrame(f);
    return 'numeral tracker armed at '+E.tick`)),
  wait(65000),
  ev(iife(`const N=window.__n,evs=window.__c.ev;const ENEMY={boar:1,mantis:1,stag:1};
    const hits=evs.filter(e=>e.T==='hit'&&ENEMY[e.kind]);
    const used=new Set();const rows=[];
    for(const h of hits){const T=h.tick;let m=null;
      for(let i=0;i<N.num.length;i++){const n=N.num[i];if(used.has(i))continue;
        if(n[0]>=T-1&&n[0]<=T+2&&n[1]===String(h.amount)){m=n;used.add(i);break;}}
      let seen=null;if(!m){for(const n of N.seen){if(n[0]>=T&&n[0]<=T+8&&n[1]===String(h.amount)){seen=n;break;}}}
      const pa=N.pool.filter(p=>p[0]<=T-1).pop(),pb=N.pool.find(p=>p[0]>=T+2);
      const kill=evs.some(e=>e.T==='death'&&e.id===h.target&&e.tick>=T&&e.tick<=T+1);
      const clear=evs.some(e=>e.T==='room_cleared'&&e.tick>=T&&e.tick<=T+1);
      const shake=kill&&evs.some(e=>e.T==='screenshake'&&e.tick>=T&&e.tick<=T+2);
      rows.push({t:T,src:h.source,amt:h.amount,kill,clear,shake,num:m?m[1]+'@'+m[2]+','+m[3]:null,color:m?m[6]:null,seen:seen?seen[1]+'@'+seen[2]+','+seen[3]:null,
        pool:pa&&pb?[pa[1],pb[1]]:null,snd:evs.some(e=>e.T==='sound'&&e.tick>=T&&e.tick<=T+2),stop:evs.filter(e=>e.T==='hitstop'&&e.tick>=T&&e.tick<=T+2).map(e=>e.ticks+':'+e.cause).join(',')});}
    const miss=rows.filter(r=>!r.num&&!r.seen);
    const gaps=N.tick.map(r=>r[1]).sort((a,b)=>a-b);
    return {tick:E.tick,fps:E.fps,version:E.version,frames:N.frames,hits:rows.length,kills:rows.filter(r=>r.kill).length,
      numeralFresh2:rows.filter(r=>r.num).length,numeralAny:rows.filter(r=>r.num||r.seen).length,
      soundOk:rows.filter(r=>r.snd).length,poolStep:rows.filter(r=>r.pool&&r.pool[1]>r.pool[0]).length,
      killsWithShake:rows.filter(r=>r.kill&&r.shake).length,killsWithStop:rows.filter(r=>r.kill&&r.stop).length,
      missing:miss.map(r=>[r.t,r.src,r.amt,r.kill?'kill':'',r.clear?'CLEARS':'']),
      clearingKills:rows.filter(r=>r.clear).map(r=>[r.t,r.src,r.amt,r.num||('seen:'+r.seen)]),
      rooms:evs.filter(e=>e.T==='room_enter').map(e=>[e.tick,e.index,e.mode]),
      clears:evs.filter(e=>e.T==='room_cleared').map(e=>e.tick),
      frameGaps:{n:gaps.length,median:gaps[Math.floor(gaps.length/2)],p99:gaps[Math.floor(gaps.length*0.99)],max:gaps[gaps.length-1],over100:gaps.filter(g=>g>100).length},
      sample:rows.slice(0,24).map(r=>[r.t,r.src,r.amt,r.num||('seen:'+r.seen),r.color,r.pool,r.stop||'none'])}`)),
];

// 8 harness screenshots ~100 ms apart across hits, with tick / numeral bboxes / enemy screen boxes / hits stamped before each
const stamp = (i) => ev(iife(`const st=E.state();const layer=document.querySelector('#dmg-num-layer');
  const nums=[...layer.querySelectorAll('.dmg-num')].filter(n=>{const s=getComputedStyle(n);return s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity||'1')>0.05;}).map(n=>{const r=n.getBoundingClientRect();return [(n.textContent||'').trim(),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];});
  const evs=window.__c.ev;const t=E.tick;
  return {frame:${i},tick:t,nums,enemies:st.enemies.map(e=>[e.id,e.kind,e.hp,e.kbTicks|0,window.__proj(e.x,0.55,e.z)]),recentHits:evs.filter(e=>e.T==='hit'&&e.tick>=t-8&&e.tick<=t).map(e=>[e.tick,e.target,e.source,e.amount,e.shape]),recentDeaths:evs.filter(e=>e.T==='death'&&e.tick>=t-8).map(e=>[e.tick,e.id])}`));
files['certC5-hitseq'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.length`),
  ev(iife(`E.cmd('iframe',0,60000);E.cmd('killAllEnemies');const st=E.state();
    for(const p of st.party.slice(1))E.cmd('spawn','boar',+(p.x+0.55).toFixed(2),+(p.z+0.55).toFixed(2));
    return {enemies:E.state().enemies.length}`)),
  PIN, wait(1500),
  ev(iife(`${PROJ}return 'proj armed'`)),
  ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => [stamp(i), shot('certC5-hitseq-s' + i), wait(100)]),
  ev(iife(`const evs=window.__c.ev;return {hits:evs.filter(e=>e.T==='hit').length,tick:E.tick,fps:E.fps,version:E.version}`)),
];

// ================= C5 CAMERA =================
files['certC5-cam'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 40000),
  ev(iife(`${PROJ}E.cmd('iframe',0,60000);E.cmd('teleport',-5,4);for(const e of E.state().enemies)E.cmd('iframe',e.id,60000);return {player:[E.state().party[0].x,E.state().party[0].z]}`)),
  wait(1500),
  ev(iife(`window.__cam={rows:[],step:[],last:null};
    const p=E.state().party[0];const pr=window.__proj(p.x,0.55,p.z);window.__cam.rows.push({t:E.tick,leg:'pre',wx:+p.x.toFixed(2),wz:+p.z.toFixed(2),sx:pr[0],sy:pr[1]});
    const c0=E.state().vfx.arena.cam;window.__cam.last=[c0[0],c0[1]];
    setInterval(()=>{const c=E.state().vfx.arena.cam;const L=window.__cam.last;window.__cam.step.push(+Math.hypot(c[0]-L[0],c[1]-L[1]).toFixed(4));window.__cam.last=[c[0],c[1]];},16);
    window.__cam.timer=setInterval(()=>{const p=E.state().party[0];const pr=window.__proj(p.x,0.55,p.z);const c=E.state().vfx.arena.cam;window.__cam.rows.push({t:E.tick,leg:window.__cam.leg||'?',wx:+p.x.toFixed(2),wz:+p.z.toFixed(2),sx:pr[0],sy:pr[1],cam:[+c[0].toFixed(2),+c[1].toFixed(2)]});},250);
    window.__cam.leg='D';return 'cam sampler armed '+E.tick`)),
  down('KeyD'), wait(4000), up('KeyD'),
  ev(iife(`window.__cam.leg='W';return 'leg W '+E.tick`)),
  down('KeyW'), wait(4000), up('KeyW'),
  wait(300),
  ev(iife(`clearInterval(window.__cam.timer);const R=window.__cam.rows;const W=innerWidth,H=innerHeight;
    const cx0=W*0.2,cx1=W*0.8,cy0=H*0.2,cy1=H*0.8;
    const legs={};for(const r of R){if(r.leg==='pre')continue;(legs[r.leg]=legs[r.leg]||[]).push(r);}
    const out={};for(const k of Object.keys(legs)){const rs=legs[k];let maxJump=0,mj=null;
      for(let i=1;i<rs.length;i++){const j=Math.hypot(rs[i].sx-rs[i-1].sx,rs[i].sy-rs[i-1].sy);if(j>maxJump){maxJump=j;mj=[rs[i-1].t,rs[i].t];}}
      out[k]={samples:rs.length,sx:[Math.min.apply(null,rs.map(r=>r.sx)),Math.max.apply(null,rs.map(r=>r.sx))],sy:[Math.min.apply(null,rs.map(r=>r.sy)),Math.max.apply(null,rs.map(r=>r.sy))],
        worldX:[rs[0].wx,rs[rs.length-1].wx],worldZ:[rs[0].wz,rs[rs.length-1].wz],maxJumpPx:+maxJump.toFixed(1),maxJumpPctW:+(maxJump/W*100).toFixed(2),maxJumpAt:mj,
        inside:rs.filter(r=>r.sx>=cx0&&r.sx<=cx1&&r.sy>=cy0&&r.sy<=cy1).length,outside:rs.filter(r=>!(r.sx>=cx0&&r.sx<=cx1&&r.sy>=cy0&&r.sy<=cy1)).map(r=>[r.t,r.sx,r.sy])};}
    const st=window.__cam.step.slice().sort((a,b)=>a-b);
    return {W,H,central:[cx0,cx1,cy0,cy1],legs:out,camStep:{n:st.length,median:st[Math.floor(st.length/2)],p99:st[Math.floor(st.length*0.99)],max:st[st.length-1]},fps:E.fps,version:E.version,rows:R}`)),
  shot('certC5-cam-end'),
  ev(iife(`const p=E.state().party[0];return {endPlayer:window.__proj(p.x,0.55,p.z),world:[+p.x.toFixed(2),+p.z.toFixed(2)]}`)),
];

// ================= C6 THREAT POINTERS =================
const THREAT = (tag) => ev(iife(`const t=E.hud.threat();const dom=[...document.querySelectorAll('#hud-threat *')].filter(n=>{const s=getComputedStyle(n);return s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity||'1')>0.05&&n.getBoundingClientRect().width>4;}).map(n=>{const r=n.getBoundingClientRect();return [n.className||n.tagName,Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),(getComputedStyle(n).transform||'').slice(0,60)]}).slice(0,16);
  const lay=document.querySelector('#hud-threat');const ls=lay?getComputedStyle(lay):null;
  return {tag:${JSON.stringify(tag)},tick:E.tick,gated:t.gated,offFrame:t.offFrame,markersDrawn:t.markersDrawn,domMarkers:t.domMarkers,covered:t.covered,uncued:t.uncued,threats:(t.threats||[]).map(x=>[x.key,x.kind,x.sx,x.sy,x.onScreen,x.inSafeFrame,x.marker]),layer:ls?[ls.display,ls.opacity,ls.visibility]:null,dom}`));
files['certC5-threat'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.length`),
  ev(iife(`E.cmd('iframe',0,60000);return 'iframed'`)),
  wait(300),
  THREAT('natural'),
  shot('certC5-threat-natural'),
  THREAT('natural-post'),
  ev(iife(`E.cmd('killAllEnemies');E.cmd('teleport',-9,6);for(const e of E.state().enemies)E.cmd('iframe',e.id,60000);
    const ids=[E.cmd('spawn','mantis',10,-6),E.cmd('spawn','boar',10,6),E.cmd('spawn','boar',-10,-6)];
    for(const e of E.state().enemies)E.cmd('iframe',e.id,60000);return {ids:ids.map(String),enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(1),+e.z.toFixed(1)])}`)),
  wait(1200),
  THREAT('forced'),
  shot('certC5-threat-forced'),
  THREAT('forced-post'),
  VER,
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
