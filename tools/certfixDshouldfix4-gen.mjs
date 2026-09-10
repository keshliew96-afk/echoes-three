// certfixDshouldfix4 generator — probes for the round-4 D "performance
// hygiene" fix pass (S1: the 145-291 ms first-use VFX stall).
//
//  hitch2 : the D critic's room-2 fight (seed 999, skipToRoom 2, RMB held,
//           20 s) with a per-frame renderer.info recorder, so every frame gap
//           can be attributed: a jump in `programs` across it is a first-use
//           shader compile (the GPU process compiles HLSL synchronously on
//           ANGLE/D3D11, so the main thread stays FREE and no long task is
//           reported — exactly the r3 signature), a jump in geometries /
//           textures is a first upload. Every program that appears during the
//           sample is logged with its shader name, cache key and the scene
//           objects whose material owns it.
//  boss   : skipToRoom 8, wait for the Stag, RMB held, 15 s from the room
//           opening (covers the first hit on the Stag), then a forced
//           `downed` (setHp on an ally) with a 3 s sample around it.
//  geo    : the r3 leak driver (certD3-leak2.json, two full cmd-driven runs
//           to VICTORY and back to camp) with renderer.info.memory added to
//           every snapshot, so the geometry counter is read at baseline-camp
//           / run1-camp / run2-camp.
//  shine  : the legendary-card shimmer probe from the round-1 fix pass, with
//           this pass's shot name.
//  fps    : camp idle 10 s rAF sample (regression duty).
//  run    : startRun -> room clears with a real banner (regression duty).
import { readFileSync, writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const aiife = (b) =>
  `(async()=>{const E=window.__echoes;const D=window.__D;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));${b}})()`;
const iife = (b) => `(()=>{const E=window.__echoes;const D=window.__D;${b}})()`;

// Event ring: every sim event the r3 forensic probe armed, stamped with
// performance.now() at emission.
const ARM = `(()=>{const E=window.__echoes;window.__D=window.__D||{};const D=window.__D;D.ev=[];D.lt=[];
try{D.po=new PerformanceObserver(l=>{for(const e of l.getEntries())D.lt.push([+e.startTime.toFixed(0),+e.duration.toFixed(1)]);});D.po.observe({entryTypes:['longtask']});}catch(e){D.poErr=String(e);}
for(const t of ["run_start","room_enter","room_start","room_cleared","wave_start","enemy_spawn","spawn_telegraph","telegraph_start","telegraph_resolve","enemy_fire","enemy_bite","hit","hit_immune","death","hitstop","heal","skill_cast","ally_cast","ally_basic","dodge","dash","downed","revive","reward","draft","zone_spawn","azone_spawn","azone_tick","skill_bolt_spawn","projectile_spawn","flash","knockback","screenshake","flinch","mark","enemy_despawn","boss_spawn","boss_adds","boss_quake_start","boss_quake_resolve","bounce_hop","siphon_drain","detonate","echo_recast"])E.on(t,e=>D.ev.push({T:t,tick:e.tick,ms:+performance.now().toFixed(1),k:e.kind||e.skill||e.id||e.source||e.type||''}));
// Program census helpers.
D.R=()=>window.__arenaProbe&&window.__arenaProbe.stage&&window.__arenaProbe.stage.renderer;
D.owners=(prog)=>{const out=[];try{const st=window.__arenaProbe.stage;const R=st.renderer;const walk=(root)=>root.traverse(o=>{const m=o.material;if(!m)return;const ms=Array.isArray(m)?m:[m];for(const x of ms){const p=R.properties.get(x);if(p&&p.currentProgram===prog){let chain=o.name||o.type;let q=o.parent;let n=0;while(q&&n<4){chain+='<'+(q.name||q.type);q=q.parent;n++;}out.push(x.type+(x.name?'('+x.name+')':'')+'@'+chain);}}});walk(st.scene);for(const p of (st.composer&&st.composer.passes)||[]){if(p.scene&&p.scene.isScene&&p.scene!==st.scene)walk(p.scene);}}catch(e){out.push('err:'+String(e).slice(0,60));}return out.slice(0,8);};
D.progList=()=>{const R=D.R();return R?R.info.programs.map(p=>p.name+'#'+p.id):[];};
// Wrap the stage's render so the JS cost of composer.render is measured per frame.
try{const st=window.__arenaProbe.stage;if(!st.__wrapped){const orig=st.render;D.jsRender=0;st.render=function(){const a=performance.now();const r=orig.apply(this,arguments);D.jsRender=performance.now()-a;return r;};st.__wrapped=true;}}catch(e){D.wrapErr=String(e);}
return 'armed t'+E.tick+' programs '+D.progList().length;})()`;

// Per-frame recorder. fr rows: [t, dt, programs, geometries, textures, tick,
// calls, tris, jsRender]. `adds` lists every new program with the frame it
// appeared on and the materials that own it; `gaps` lists every frame > 60 ms
// with the deltas across [i-3, i+1] and the sim ring around it.
const REC = `
D.rec=async(ms,until)=>{const R=D.R();const fr=[];const adds=[];let last=null;const t0=performance.now();let lastProg=R.info.programs.length;let lastGeo=R.info.memory.geometries;let lastTex=R.info.memory.textures;
const tm=[];let tmLast=performance.now();const tiv=setInterval(()=>{const n=performance.now();tm.push([+(n-t0).toFixed(1),+(n-tmLast).toFixed(1)]);tmLast=n;},4);
let known=new Set(R.info.programs.map(p=>p.id));const rem=[];
await new Promise(res=>{const f=(now)=>{const i=R.info;const np=i.programs.length;
 {const cur=new Set();for(const p of i.programs){cur.add(p.id);if(!known.has(p.id))adds.push({frame:fr.length,at:+(now-t0).toFixed(0),tick:E.tick,name:p.name,id:p.id,key:(p.cacheKey||'').slice(0,60),owners:D.owners(p)});}
  for(const id of known)if(!cur.has(id))rem.push({frame:fr.length,at:+(now-t0).toFixed(0),tick:E.tick,id});known=cur;lastProg=np;}
 if(last!==null){const dt=now-last;if(dt>60)performance.mark('GAP'+dt.toFixed(0));fr.push([+(now-t0).toFixed(1),+dt.toFixed(2),np,i.memory.geometries,i.memory.textures,E.tick,i.render.calls,i.render.triangles,+(D.jsRender||0).toFixed(1)]);}
 last=now;if(now-t0<ms&&!(until&&until()))requestAnimationFrame(f);else res();};requestAnimationFrame(f);});
clearInterval(tiv);
const gaps=[];for(let i=1;i<fr.length;i++){const f=fr[i];if(f[1]<=60)continue;const a=fr[Math.max(0,i-3)];const c=fr[Math.min(fr.length-1,i+1)];const startAbs=t0+f[0]-f[1];const endAbs=t0+f[0];
 const near=D.ev.filter(e=>e.ms>=startAbs-400&&e.ms<=endAbs+120).map(e=>[+(e.ms-startAbs).toFixed(0),e.T,e.tick,String(e.k).slice(0,14)]);
 const tg=tm.filter(x=>x[0]>=f[0]-f[1]-2&&x[0]<=f[0]+2).map(x=>x[1]);
 const lt=D.lt.filter(l=>l[0]>=startAbs-50&&l[0]<=endAbs+50);
 gaps.push({at:f[0],absStart:+startAbs.toFixed(0),gap:f[1],tick:f[5],jsRenderPrev:fr[i-1][8],jsRender:f[8],dProg:c[2]-a[2],dGeo:c[3]-a[3],dTex:c[4]-a[4],progWin:[a[2],fr[i-1][2],f[2],c[2]],geoWin:[a[3],fr[i-1][3],f[3],c[3]],timerMaxGap:tg.length?+Math.max(...tg).toFixed(1):null,longTasks:lt,events:near.slice(0,26)});}
const dts=fr.map(f=>f[1]);const W=fr.filter(f=>f[0]<3000).map(f=>f[1]);const S=fr.filter(f=>f[0]>=3000).map(f=>f[1]);
const st=(v)=>{if(!v.length)return null;const s=[...v].sort((a,b)=>a-b);const n=s.length;const sum=s.reduce((p,q)=>p+q,0);const Q=(p)=>+s[Math.min(n-1,Math.floor(p*n))].toFixed(2);return {frames:n,meanMs:+(sum/n).toFixed(2),meanFps:+(1000/(sum/n)).toFixed(1),p50:Q(0.5),p95:Q(0.95),p99:Q(0.99),max:+s[n-1].toFixed(2),gt60:v.filter(d=>d>60).length,gt100:v.filter(d=>d>100).length};};
return {t0:+t0.toFixed(0),all:st(dts),warm:st(W),steady:st(S),prog0:fr[0]?fr[0][2]:null,progEnd:fr.length?fr[fr.length-1][2]:null,geo0:fr[0]?fr[0][3]:null,geoEnd:fr.length?fr[fr.length-1][3]:null,tex0:fr[0]?fr[0][4]:null,texEnd:fr.length?fr[fr.length-1][4]:null,adds,removes:rem,gaps,longTaskCount:D.lt.length};};`;

const WAIT_ENEMIES = (n, ms) =>
  ev(
    aiife(`const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${ms}){try{if(E.state().enemies.length>=${n})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0),enemies:E.state().enemies.length};}catch(e){}await sl(8);}return {ok:false,tick:E.tick,enemies:E.state().enemies.length}`)
  );

// --- hitch2 -----------------------------------------------------------------
writeFileSync(
  'tools/actions/certfixDshouldfix4-hitch2.json',
  JSON.stringify(
    [
      ev(ARM),
      ev(iife(`${REC}E.cmd('startRun');const r=E.cmd('skipToRoom',2);return {room:r&&r.room,mode:r&&r.mode,progAtStart:D.progList().length,progs:D.progList()}`)),
      WAIT_ENEMIES(2, 45000),
      { type: 'mousemove', x: 800, y: 380 },
      { type: 'mousedown', button: 'right' },
      { type: 'wait', ms: 800 },
      ev(iife(`return {tag:'sample-start',tick:E.tick,ms:+performance.now().toFixed(1),programs:D.progList().length}`)),
      ev(aiife(`const out=await D.rec(20000);out.tag='hitch2';out.tickEnd=E.tick;out.progsEnd=D.progList();return out`)),
      ev(iife(`const s=E.state();return {tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,azones:s.azones.length,allyfx:s.allyfx,techfx:s.techfx}`)),
      { type: 'mouseup', button: 'right' },
    ],
    null,
    1
  )
);
console.log('wrote tools/actions/certfixDshouldfix4-hitch2.json');

// --- boss + downed ------------------------------------------------------------
writeFileSync(
  'tools/actions/certfixDshouldfix4-boss.json',
  JSON.stringify(
    [
      ev(ARM),
      ev(iife(`${REC}E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room,mode:r&&r.mode,boss:r&&r.boss,progAtStart:D.progList().length}`)),
      { type: 'mousemove', x: 800, y: 380 },
      { type: 'mousedown', button: 'right' },
      ev(
        aiife(`const t0=performance.now();while(performance.now()-t0<30000){try{const r=E.cmd('runState');if(r&&r.boss&&r.boss.active)break;}catch(e){}await sl(8);}
const out=await D.rec(15000);out.tag='boss';out.tickEnd=E.tick;const r=E.cmd('runState');out.boss=r&&r.boss;out.enemies=E.state().enemies.length;return out`)
      ),
      // Forced downed: setHp 0 on the first ally, then a 3 s sample around it.
      ev(
        aiife(`const allies=E.state().party?E.state().party.filter(m=>m.kind==='ally'||m.classId):[];const s=E.state();const id=(s.allies&&s.allies[0]&&s.allies[0].id)||(s.party&&s.party[1]&&s.party[1].id)||null;
D.downedId=id;const p=D.rec(3200,null);await sl(600);let r=null;try{r=E.cmd('setHp',id,0);}catch(e){r='err '+String(e).slice(0,80);}D.setHpAt=+performance.now().toFixed(1);const out=await p;out.tag='downed';out.setHp=r;out.id=id;out.downedEvents=D.ev.filter(e=>e.T==='downed').map(e=>[e.tick,e.ms]);out.stateKeys=Object.keys(s).slice(0,30);return out`)
      ),
      { type: 'mouseup', button: 'right' },
      { type: 'shot', name: 'certfixDshouldfix4-boss-downed' },
    ],
    null,
    1
  )
);
console.log('wrote tools/actions/certfixDshouldfix4-boss.json');

// --- geo (renderer.info at every leak snapshot) --------------------------------
{
  const src = JSON.parse(readFileSync('tools/actions/certD3-leak2.json', 'utf8'));
  const RINFO =
    `(()=>{try{const R=window.__arenaProbe.stage.renderer;return {programs:R.info.programs.length,geometries:R.info.memory.geometries,textures:R.info.memory.textures};}catch(e){return null;}})()`;
  let n = 0;
  for (const a of src) {
    if (a.type === 'eval' && /return \{tag:"/.test(a.code)) {
      a.code = a.code.replace(/return \{tag:"/, `return {rinfo:${RINFO},tag:"`);
      n++;
    }
    if (a.type === 'shot') a.name = a.name.replace(/^certD3-/, 'certfixDshouldfix4-geo-');
  }
  writeFileSync('tools/actions/certfixDshouldfix4-geo.json', JSON.stringify(src, null, 1));
  console.log(`wrote tools/actions/certfixDshouldfix4-geo.json (${n} snapshots carry rinfo)`);
}

// --- shine (legendary card open window) ------------------------------------------
{
  const src = JSON.parse(readFileSync('tools/actions/certfixDshouldfix1-shine.json', 'utf8'));
  for (const a of src) if (a.type === 'shot') a.name = a.name.replace(/^certfixDshouldfix1-/, 'certfixDshouldfix4-');
  writeFileSync('tools/actions/certfixDshouldfix4-shine.json', JSON.stringify(src, null, 1));
  console.log('wrote tools/actions/certfixDshouldfix4-shine.json');
}

// --- fps (camp idle 10 s) ---------------------------------------------------------
writeFileSync(
  'tools/actions/certfixDshouldfix4-fps.json',
  JSON.stringify(
    [
      ev(ARM),
      ev(iife(`${REC}return {tick:E.tick,scene:E.state().scene,programs:D.progList().length,geometries:D.R().info.memory.geometries}`)),
      ev(aiife(`const out=await D.rec(10000);out.tag='camp-idle-10s';out.efps=E.fps;out.ents=E.entityCount;return out`)),
    ],
    null,
    1
  )
);
console.log('wrote tools/actions/certfixDshouldfix4-fps.json');

// --- run (a run still plays: startRun -> a room clears -> banner) -------------------
writeFileSync(
  'tools/actions/certfixDshouldfix4-run.json',
  JSON.stringify(
    [
      ev(ARM),
      ev(iife(`const r=E.cmd('startRun');return {started:!!r,room:(E.cmd('runState')||{}).room,active:!!(E.cmd('runState')||{}).active}`)),
      WAIT_ENEMIES(1, 30000),
      ev(iife(`return {banner:E.hud&&E.hud.banner?E.hud.banner():null,room:(E.cmd('runState')||{}).room}`)),
      { type: 'mousemove', x: 800, y: 380 },
      { type: 'mousedown', button: 'right' },
      { type: 'wait', ms: 2500 },
      { type: 'shot', name: 'certfixDshouldfix4-run-fight' },
      ev(iife(`E.cmd('killAllEnemies');return 'killed t'+E.tick`)),
      { type: 'mouseup', button: 'right' },
      ev(
        aiife(`const t0=performance.now();while(performance.now()-t0<20000){if(D.ev.some(e=>e.T==='room_cleared'))break;await sl(16);}await sl(400);
return {cleared:D.ev.filter(e=>e.T==='room_cleared').map(e=>e.tick),screen:E.runUi().screen,text:(E.runUi().text||'').slice(0,80),banner:E.hud&&E.hud.banner?E.hud.banner():null,pageErrors:0}`)
      ),
      { type: 'shot', name: 'certfixDshouldfix4-run-cleared' },
    ],
    null,
    1
  )
);
console.log('wrote tools/actions/certfixDshouldfix4-run.json');

// --- trace variants: the same drivers with tracing around the sample --------
for (const [src, dst] of [
  ['tools/actions/certfixDshouldfix4-hitch2.json', 'tools/actions/certfixDshouldfix4-trace-hitch2.json'],
  ['tools/actions/certfixDshouldfix4-boss.json', 'tools/actions/certfixDshouldfix4-trace-boss.json'],
]) {
  const acts = JSON.parse(readFileSync(src, 'utf8'));
  const out = [];
  for (const a of acts) {
    if (a.type === 'shot') continue;
    const isSample = a.type === 'eval' && /await D\.rec\(/.test(a.code);
    if (isSample) out.push({ type: 'traceStart' });
    out.push(a);
    if (isSample) out.push({ type: 'traceStop' });
  }
  writeFileSync(dst, JSON.stringify(out, null, 1));
  console.log('wrote ' + dst);
}

// --- census: one page session through rooms 2-8, the shop, the boss with its
// quakes and adds, a forced downed + recovery, and a second run's first fight
// — with the recorder running the WHOLE time. Every program that appears or
// disappears after boot is listed with its owner, and every frame > 60 ms is
// bucketed by the room it fell in with its offset from that room's start.
{
  const MARK = (tag) => ev(iife(`D.marks=D.marks||[];D.marks.push({tag:${JSON.stringify(tag)},at:+performance.now().toFixed(0),tick:E.tick});return 'mark ${tag} t'+E.tick`));
  const FIGHT = (room, ms) => [
    ev(iife(`const r=E.cmd('skipToRoom',${room});return {jumpTo:${room},room:r&&r.room,mode:r&&r.mode}`)),
    WAIT_ENEMIES(2, 45000),
    MARK(`room${room}`),
    { type: 'wait', ms },
    ev(iife(`const s=E.state();const out={room:${room},tick:E.tick,enemies:s.enemies.length,gl:s.gl,vfx:{numerals:s.vfx&&s.vfx.numerals,decals:s.vfx&&s.vfx.decals,particles:s.vfx&&s.vfx.particles,variant:s.vfx&&s.vfx.variantName}};try{E.cmd('killAllEnemies');}catch(e){}return out`)),
    { type: 'wait', ms: 1200 },
  ];
  const acts = [
    ev(ARM),
    ev(iife(`${REC}D.stop=false;D.census=D.rec(600000,()=>D.stop);return {recStarted:true,tick:E.tick,gl:E.state().gl}`)),
    { type: 'wait', ms: 1500 },
    ev(iife(`E.cmd('startRun');return {run:1,room:(E.cmd('runState')||{}).room,gl:E.state().gl}`)),
    { type: 'mousemove', x: 800, y: 380 },
    { type: 'mousedown', button: 'right' },
    ...FIGHT(2, 9000),
    ...FIGHT(3, 9000),
    ...FIGHT(4, 9000),
    ...FIGHT(5, 9000),
    ...FIGHT(6, 9000),
    ev(iife(`const r=E.cmd('skipToRoom',7);return {shop:r&&r.room,ui:E.runUi().screen}`)),
    MARK('shop'),
    { type: 'wait', ms: 2500 },
    { type: 'shot', name: 'certfixDshouldfix4-census-shop' },
    ev(iife(`const r=E.cmd('skipToRoom',8);return {boss:r&&r.room,mode:r&&r.mode}`)),
    ev(aiife(`const t0=performance.now();while(performance.now()-t0<30000){try{const r=E.cmd('runState');if(r&&r.boss&&r.boss.active)break;}catch(e){}await sl(8);}return {bossActive:true,tick:E.tick}`)),
    MARK('boss'),
    // Party keep-alive (never the Stag): the fight has to last the window.
    ev(iife(`D.ka=setInterval(()=>{try{const s=E.state();for(const m of (s.party||[])){if(m.hp>0&&m.hp<m.maxHp*0.35)E.cmd('setHp',m.id,1);}}catch(e){}},500);return 'keepalive'`)),
    { type: 'wait', ms: 12000 },
    ev(iife(`clearInterval(D.ka);const s=E.state();const a=(s.party||[]).find(m=>m.partyIndex===1)||(s.party||[])[1];D.downId=a&&a.id;let r=null;try{r=E.cmd('setHp',D.downId,0);}catch(e){r='err '+String(e).slice(0,60);}return {forcedDown:D.downId,r,tick:E.tick}`)),
    MARK('downed'),
    { type: 'wait', ms: 3000 },
    { type: 'shot', name: 'certfixDshouldfix4-census-downed' },
    ev(iife(`let r=null;try{r=E.cmd('setHp',D.downId,0.6);}catch(e){r='err';}D.ka=setInterval(()=>{try{const s=E.state();for(const m of (s.party||[])){if(m.hp>0&&m.hp<m.maxHp*0.35)E.cmd('setHp',m.id,1);}}catch(e){}},500);return {recovered:D.downId,r,tick:E.tick,boss:(E.cmd('runState')||{}).boss}`)),
    MARK('boss2'),
    { type: 'wait', ms: 10000 },
    { type: 'mouseup', button: 'right' },
    ev(iife(`clearInterval(D.ka);const s=E.state();return {tag:'boss-end',tick:E.tick,boss:(E.cmd('runState')||{}).boss,enemies:s.enemies.length,gl:s.gl}`)),
    // End the run, come back to camp, start a second run's first fight.
    ev(iife(`try{E.cmd('killBoss');}catch(e){}try{E.cmd('killAllEnemies');}catch(e){}return 'boss killed t'+E.tick`)),
    ev(aiife(`const t0=performance.now();while(performance.now()-t0<20000){try{if(E.runUi().screen==='end')break;}catch(e){}await sl(16);}return {screen:E.runUi().screen,text:(E.runUi().text||'').slice(0,60)}`)),
    { type: 'key', key: 'Enter', ms: 80 },
    ev(aiife(`const t0=performance.now();while(performance.now()-t0<20000){try{const r=E.cmd('runState');if((!r||!r.active)&&E.cmd('campState'))break;}catch(e){}await sl(16);}await sl(1500);const s=E.state();return {tag:'camp-after-run1',tick:E.tick,gl:s.gl,ents:E.entityCount}`)),
    MARK('camp2'),
    ev(iife(`E.cmd('startRun');return {run:2,room:(E.cmd('runState')||{}).room}`)),
    { type: 'mousedown', button: 'right' },
    ...FIGHT(2, 9000),
    { type: 'mouseup', button: 'right' },
    ev(aiife(`D.stop=true;const out=await D.census;const marks=D.marks||[];
// Bucket every gap by the room mark it follows; judge only gaps that start > 3 s after that mark.
const t0=out.t0;
for(const g of out.gaps){let m=null;for(const k of marks){if(k.at<=g.absStart)m=k;}g.room=m?m.tag:'boot';g.sinceRoomMs=m?Math.round(g.absStart-m.at):null;g.judged=!!m&&g.sinceRoomMs>3000;}
const judged=out.gaps.filter(g=>g.judged);
return {tag:'census',all:out.all,marks,adds:out.adds,removes:out.removes,gapsTotal:out.gaps.length,judgedGt60:judged.length,judgedGt100:judged.filter(g=>g.gap>100).length,worstJudged:judged.reduce((a,g)=>Math.max(a,g.gap),0),gaps:out.gaps.map(g=>({room:g.room,since:g.sinceRoomMs,at:g.at,gap:g.gap,tick:g.tick,judged:g.judged,dProg:g.dProg,dGeo:g.dGeo,dTex:g.dTex,jsPrev:g.jsRenderPrev,timerMaxGap:g.timerMaxGap,lt:g.longTasks,ev:g.events.slice(0,12)})),longTaskCount:out.longTaskCount,glEnd:E.state().gl}`)),
  ];
  writeFileSync('tools/actions/certfixDshouldfix4-census.json', JSON.stringify(acts, null, 1));
  console.log('wrote tools/actions/certfixDshouldfix4-census.json');
}
