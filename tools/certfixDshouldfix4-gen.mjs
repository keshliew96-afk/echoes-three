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
// Wrap the stage's render so the JS cost of composer.render AND its GPU time (EXT_disjoint_timer_query_webgl2, read back
// asynchronously a few frames later) are measured per frame.
try{const st=window.__arenaProbe.stage;const gl=st.renderer.getContext();const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');D.gpuExt=!!ext;D.gpuQ=[];D.gpuMs=[];D.frameIdx=-1;
 if(!st.__wrapped){const orig=st.render;D.jsRender=0;st.render=function(){let q=null;if(ext){try{q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);}catch(e){q=null;}}const a=performance.now();const r=orig.apply(this,arguments);D.jsRender=performance.now()-a;if(q){try{gl.endQuery(ext.TIME_ELAPSED_EXT);D.gpuQ.push({q,frame:D.frameIdx,at:+performance.now().toFixed(0)});}catch(e){}}return r;};st.__wrapped=true;}
 D.gpuPoll=()=>{if(!ext)return;while(D.gpuQ.length){const e=D.gpuQ[0];let avail=false;try{avail=gl.getQueryParameter(e.q,gl.QUERY_RESULT_AVAILABLE);}catch(x){avail=true;}if(!avail)break;let ms=null;try{ms=+(gl.getQueryParameter(e.q,gl.QUERY_RESULT)/1e6).toFixed(2);}catch(x){}const dis=gl.getParameter(ext.GPU_DISJOINT_EXT);D.gpuMs.push([e.frame,ms,dis?1:0,e.at]);try{gl.deleteQuery(e.q);}catch(x){}D.gpuQ.shift();if(D.gpuMs.length>6000)D.gpuMs.splice(0,3000);}};
}catch(e){D.wrapErr=String(e);}
return 'armed t'+E.tick+' programs '+D.progList().length;})()`;

// Per-frame recorder. fr rows: [t, dt, programs, geometries, textures, tick,
// calls, tris, jsRender]. `adds` lists every new program with the frame it
// appeared on and the materials that own it; `gaps` lists every frame > 60 ms
// with the deltas across [i-3, i+1] and the sim ring around it.
const REC = `
D.rec=async(ms,until)=>{const R=D.R();const fr=[];const adds=[];let last=null;const t0=performance.now();let lastProg=R.info.programs.length;let lastGeo=R.info.memory.geometries;let lastTex=R.info.memory.textures;
const tm=[];let tmLast=performance.now();const tiv=setInterval(()=>{const n=performance.now();tm.push([+(n-t0).toFixed(1),+(n-tmLast).toFixed(1)]);tmLast=n;},4);
let known=new Set(R.info.programs.map(p=>p.id));const rem=[];
// Geometry census: every mesh / points / sprite gets an onBeforeRender hook (wrapping any hook it already has) that
// records the FIRST frame each geometry is actually drawn — three's own upload bookkeeping is not reachable from a page.
const geoSeen=new Set();const geoAdds=[];const hooked=new WeakSet();let curFrame=-1,curAt=0;const stg=window.__arenaProbe.stage;
const chainOf=(o)=>{let chain=o.name||o.type;let q=o.parent;let n=0;while(q&&n<4){chain+='<'+(q.name||q.type);q=q.parent;n++;}return chain;};
const hook=(o)=>{if(hooked.has(o)||!(o.isMesh||o.isPoints||o.isSprite||o.isLine))return;hooked.add(o);const prev=o.onBeforeRender;
 o.onBeforeRender=function(r,sc,c,g,m,gr){if(g&&!geoSeen.has(g.id)){geoSeen.add(g.id);if(curFrame>=0)geoAdds.push({frame:curFrame,at:curAt,tick:E.tick,gid:g.id,verts:g.attributes&&g.attributes.position?g.attributes.position.count:0,shared:!!(g.userData&&g.userData.shared),owner:chainOf(o),mat:m&&m.type});}if(typeof prev==='function')prev.apply(this,arguments);};};
const geoScan=(frame,at)=>{curFrame=frame;curAt=at;const roots=[stg.scene];for(const p of (stg.composer&&stg.composer.passes)||[]){if(p.scene&&p.scene.isScene&&p.scene!==stg.scene)roots.push(p.scene);}for(const root of roots)root.traverse(hook);};
geoScan(-1,0);
await new Promise(res=>{const f=(now)=>{const i=R.info;const np=i.programs.length;
 {const cur=new Set();for(const p of i.programs){cur.add(p.id);if(!known.has(p.id))adds.push({frame:fr.length,at:+(now-t0).toFixed(0),tick:E.tick,name:p.name,id:p.id,key:(p.cacheKey||'').slice(0,60),owners:D.owners(p)});}
  for(const id of known)if(!cur.has(id))rem.push({frame:fr.length,at:+(now-t0).toFixed(0),tick:E.tick,id});known=cur;lastProg=np;}
 geoScan(fr.length,+(now-t0).toFixed(0));D.frameIdx=fr.length;if(D.gpuPoll)D.gpuPoll();
 if(last!==null){const dt=now-last;if(dt>60)performance.mark('GAP'+dt.toFixed(0));fr.push([+(now-t0).toFixed(1),+dt.toFixed(2),np,i.memory.geometries,i.memory.textures,E.tick,i.render.calls,i.render.triangles,+(D.jsRender||0).toFixed(1)]);}
 last=now;if(now-t0<ms&&!(until&&until()))requestAnimationFrame(f);else res();};requestAnimationFrame(f);});
clearInterval(tiv);
const gaps=[];for(let i=1;i<fr.length;i++){const f=fr[i];if(f[1]<=60)continue;const a=fr[Math.max(0,i-3)];const c=fr[Math.min(fr.length-1,i+1)];const startAbs=t0+f[0]-f[1];const endAbs=t0+f[0];
 const near=D.ev.filter(e=>e.ms>=startAbs-400&&e.ms<=endAbs+120).map(e=>[+(e.ms-startAbs).toFixed(0),e.T,e.tick,String(e.k).slice(0,14)]);
 const tg=tm.filter(x=>x[0]>=f[0]-f[1]-2&&x[0]<=f[0]+2).map(x=>x[1]);
 const lt=D.lt.filter(l=>l[0]>=startAbs-50&&l[0]<=endAbs+50);
 const W=(k)=>fr.slice(Math.max(0,i-4),Math.min(fr.length,i+2)).map(r=>r[k]);const gpuWin=(D.gpuMs||[]).filter(g=>g[0]>=i-5&&g[0]<=i+1).map(g=>[g[0],g[1],g[2]]);
 gaps.push({at:f[0],absStart:+startAbs.toFixed(0),gap:f[1],tick:f[5],frame:i,jsRenderPrev:fr[i-1][8],jsRender:f[8],dProg:c[2]-a[2],dGeo:c[3]-a[3],dTex:c[4]-a[4],progWin:[a[2],fr[i-1][2],f[2],c[2]],geoWin:[a[3],fr[i-1][3],f[3],c[3]],callsWin:W(6),trisWin:W(7),jsWin:W(8),tickWin:W(5),gpuWin,geoAddsNear:geoAdds.filter(g=>g.frame>=i-4&&g.frame<=i+2),timerMaxGap:tg.length?+Math.max(...tg).toFixed(1):null,longTasks:lt,events:near.slice(0,26)});}
const dts=fr.map(f=>f[1]);const W=fr.filter(f=>f[0]<3000).map(f=>f[1]);const S=fr.filter(f=>f[0]>=3000).map(f=>f[1]);
const st=(v)=>{if(!v.length)return null;const s=[...v].sort((a,b)=>a-b);const n=s.length;const sum=s.reduce((p,q)=>p+q,0);const Q=(p)=>+s[Math.min(n-1,Math.floor(p*n))].toFixed(2);return {frames:n,meanMs:+(sum/n).toFixed(2),meanFps:+(1000/(sum/n)).toFixed(1),p50:Q(0.5),p95:Q(0.95),p99:Q(0.99),max:+s[n-1].toFixed(2),gt60:v.filter(d=>d>60).length,gt100:v.filter(d=>d>100).length};};
if(D.gpuPoll)D.gpuPoll();const gpuAll=(D.gpuMs||[]).filter(g=>g[1]!==null&&g[0]>=0).map(g=>g[1]);const gpuTop=[...(D.gpuMs||[])].filter(g=>g[1]!==null&&g[0]>=0).sort((a,b)=>b[1]-a[1]).slice(0,8);
return {t0:+t0.toFixed(0),gpuExt:D.gpuExt,gpuSamples:gpuAll.length,gpuStats:st(gpuAll.map((v,k)=>v)),gpuTop,all:st(dts),warm:st(W),steady:st(S),prog0:fr[0]?fr[0][2]:null,progEnd:fr.length?fr[fr.length-1][2]:null,geo0:fr[0]?fr[0][3]:null,geoEnd:fr.length?fr[fr.length-1][3]:null,tex0:fr[0]?fr[0][4]:null,texEnd:fr.length?fr[fr.length-1][4]:null,adds,removes:rem,geoAdds,gaps,longTaskCount:D.lt.length};};`;

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

// --- dom: the room-2 driver with a MutationObserver over the whole document
// and a Web Animations census, so a gap can be laid beside every DOM write
// (class / attribute / text / child) in the 400 ms before it. For the stall
// that survives the program anchors: GL counters flat, main thread free —
// if it is the compositor, the DOM is where its cause will show.
{
  const DOMARM = iife(`D.dom=[];D.anim=[];
D.mo=new MutationObserver((recs)=>{const t=+performance.now().toFixed(1);for(const r of recs){const el=r.target;const tag=(el.nodeType===1?el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).slice(0,3).join('.'):''):'#text<'+(el.parentNode&&el.parentNode.className||'')+'>');
 D.dom.push([t,r.type,tag,r.attributeName||'',r.type==='attributes'&&r.attributeName?String(el.getAttribute(r.attributeName)||'').slice(0,60):(r.type==='childList'?('+'+r.addedNodes.length+'/-'+r.removedNodes.length):String(el.textContent||'').slice(0,30))]);}
 if(D.dom.length>20000)D.dom.splice(0,10000);});
D.mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true,attributeOldValue:false});
D.animPoll=setInterval(()=>{try{const a=document.getAnimations();D.anim.push([+performance.now().toFixed(0),a.length,a.filter(x=>x.playState==='running').map(x=>(x.animationName||'css')+'@'+((x.effect&&x.effect.target&&(x.effect.target.className||x.effect.target.tagName))||'?')).slice(0,6).join(',')]);if(D.anim.length>4000)D.anim.splice(0,2000);}catch(e){}},50);
return 'dom armed'`);
  const src = JSON.parse(readFileSync('tools/actions/certfixDshouldfix4-hitch2.json', 'utf8'));
  const out = [];
  for (const a of src) {
    out.push(a);
    if (a.type === 'eval' && /D\.rec=async/.test(a.code)) out.push(ev(DOMARM));
  }
  // Replace the sample eval so the gap dump carries the DOM ring.
  for (const a of out) {
    if (a.type === 'eval' && /await D\.rec\(20000\)/.test(a.code)) {
      a.code = aiife(`const out=await D.rec(20000);clearInterval(D.animPoll);D.mo.disconnect();out.tag='hitch2-dom';
for(const g of out.gaps){const a=g.absStart-450,b=g.absStart+g.gap+30;g.dom=D.dom.filter(x=>x[0]>=a&&x[0]<=b).map(x=>[+(x[0]-g.absStart).toFixed(0),x[1],x[2],x[3],x[4]]).slice(0,80);g.anims=D.anim.filter(x=>x[0]>=a&&x[0]<=b).map(x=>[+(x[0]-g.absStart).toFixed(0),x[1],x[2]]);}
// Per-second DOM write rate for the whole sample, and the class of writes.
const t0=out.t0;const perSec={};for(const x of D.dom){const s=Math.floor((x[0]-t0)/1000);perSec[s]=(perSec[s]||0)+1;}
const kinds={};for(const x of D.dom){const k=x[1]+':'+x[2].split('.')[0]+':'+x[3];kinds[k]=(kinds[k]||0)+1;}
out.domPerSec=perSec;out.domKinds=Object.entries(kinds).sort((p,q)=>q[1]-p[1]).slice(0,25);out.domTotal=D.dom.length;return out`);
    }
  }
  writeFileSync('tools/actions/certfixDshouldfix4-dom.json', JSON.stringify(out, null, 1));
  console.log('wrote tools/actions/certfixDshouldfix4-dom.json');
}

// --- A/B for the surviving stall: the room-2 driver with every DOM layer the
// fight touches hidden (HUD, damage numerals, threat pointers, run screen),
// so a stall that vanishes is compositor/raster work and one that stays is
// the WebGL frame.
{
  const src = JSON.parse(readFileSync('tools/actions/certfixDshouldfix4-hitch2.json', 'utf8'));
  const out = [];
  for (const a of src) {
    if (a.type === 'eval' && /tag:'sample-start'/.test(a.code)) {
      out.push(ev(iife(`const ids=['hud','dmg-num-layer','hud-threat','nd-fizzle-layer','run-screen','fps-meter','version-label'];const hid=[];for(const id of ids){const el=document.getElementById(id);if(el){el.style.display='none';hid.push(id);}}return {hidden:hid}`)));
    }
    out.push(a);
  }
  for (const a of out) if (a.type === 'eval' && /out\.tag='hitch2'/.test(a.code)) a.code = a.code.replace("out.tag='hitch2'", "out.tag='hitch2-nohud'");
  writeFileSync('tools/actions/certfixDshouldfix4-hitch2-nohud.json', JSON.stringify(out, null, 1));
  console.log('wrote tools/actions/certfixDshouldfix4-hitch2-nohud.json');
}

// --- render-layer bisection for the surviving stall: the room-2 driver with
// one render layer hidden before the sample (the sim is untouched, so the
// fight — and the moment the stall lands — is the same).
{
  const src = JSON.parse(readFileSync('tools/actions/certfixDshouldfix4-hitch2.json', 'utf8'));
  const variants = {
    noally: `const r=st.scene.getObjectByName('allyfx');if(r)r.visible=false;const k=st.scene.getObjectByName('allyfx-ink');if(k)k.visible=false;return {hidden:['allyfx']}`,
    noenemy: `const r=st.scene.getObjectByName('enemyfx');if(r)r.visible=false;return {hidden:['enemyfx']}`,
    nofx: `const out=[];for(const n of ['skillfx','techfx','bossfx']){const r=st.scene.getObjectByName(n);if(r){r.visible=false;out.push(n);}}st.scene.traverse(o=>{if(o.isPoints){o.visible=false;out.push('points');}});return {hidden:out}`,
    nopost: `const c=st.composer;const out=[];for(const p of c.passes){if(/Bloom|FXAA|ShaderPass/.test(p.constructor.name)){p.enabled=false;out.push(p.constructor.name);}}return {disabled:out}`,
  };
  for (const [key, body] of Object.entries(variants)) {
    const out = [];
    for (const a of src) {
      if (a.type === 'eval' && /tag:'sample-start'/.test(a.code)) out.push(ev(iife(`const st=window.__arenaProbe.stage;${body}`)));
      out.push(a);
    }
    for (const a of out) if (a.type === 'eval' && /out\.tag='hitch2'/.test(a.code)) a.code = a.code.replace("out.tag='hitch2'", `out.tag='hitch2-${key}'`);
    writeFileSync(`tools/actions/certfixDshouldfix4-hitch2-${key}.json`, JSON.stringify(out, null, 1));
    console.log(`wrote tools/actions/certfixDshouldfix4-hitch2-${key}.json`);
  }
}

// --- shop-open test bed. The shine probe measured a 347.6 ms frame with the
// main thread FREE inside the first 3 s of the shop shelf, and the GPU timer
// queries then showed the WebGL render itself taking 395-877 ms of GPU time
// on single frames around the open. The recorder now runs from BEFORE the
// skipToRoom(7) so those frames carry their program / geometry / texture
// census. Variants: rec, a second open in the same session (twice), the shelf
// with one family of CSS raster effects disabled (nobox / notext / nofilter /
// nobackdrop / noeffects), and the WebGL scene hidden for the open (noscene).
{
  const OPEN = (tag, extraBefore) => [
    ...(extraBefore ? [ev(iife(extraBefore))] : []),
    ev(iife(`D.openAt=+performance.now().toFixed(1);D.openP=D.rec(7000);const r=E.cmd('skipToRoom',7);return {open:${JSON.stringify(tag)},room:r&&r.room,tick:E.tick,gl:E.state().gl}`)),
    ev(aiife(`const t0=performance.now();while(performance.now()-t0<20000){let s=null;try{s=E.runUi().screen}catch(e){}if(s==='shop')break;await sl(16);}D.shopAt=+performance.now().toFixed(1);
const out=await D.openP;out.tag=${JSON.stringify(tag)};out.screen=E.runUi().screen;out.shopAfterMs=Math.round(D.shopAt-D.openAt);out.glEnd=E.state().gl;return out`)),
  ];
  const CSS = (css) => `const st=document.createElement('style');st.id='dfix-ab';st.textContent=${JSON.stringify(css)};document.head.appendChild(st);return {css:st.textContent.slice(0,80)}`;
  const variants = {
    rec: [...OPEN('shop-open-1')],
    twice: [
      ...OPEN('shop-open-1'),
      ev(iife(`E.cmd('skipToRoom',6);return {left:E.runUi().screen}`)),
      { type: 'wait', ms: 2500 },
      ...OPEN('shop-open-2'),
    ],
    nobox: [...OPEN('shop-nobox', CSS('#run-screen *{box-shadow:none!important}'))],
    notext: [...OPEN('shop-notext', CSS('#run-screen *{text-shadow:none!important}'))],
    nofilter: [...OPEN('shop-nofilter', CSS('#run-screen *{filter:none!important}'))],
    nobackdrop: [...OPEN('shop-nobackdrop', CSS('#run-screen *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'))],
    noeffects: [...OPEN('shop-noeffects', CSS('#run-screen *{box-shadow:none!important;text-shadow:none!important;filter:none!important;backdrop-filter:none!important;background-image:none!important}'))],
    noscene: [...OPEN('shop-noscene', `const st=window.__arenaProbe.stage;st.scene.visible=false;return {sceneHidden:true}`)],
    nopost: [...OPEN('shop-nopost', `const st=window.__arenaProbe.stage;const out=[];for(const p of st.composer.passes){if(/Bloom|FXAA|ShaderPass/.test(p.constructor.name)){p.enabled=false;out.push(p.constructor.name);}}return {disabled:out}`)],
  };
  for (const [key, body] of Object.entries(variants)) {
    const acts = [
      ev(ARM),
      ev(iife(`${REC}E.cmd('startRun');return {run:1,tick:E.tick,gl:E.state().gl}`)),
      { type: 'wait', ms: 1500 },
      ...body,
    ];
    writeFileSync(`tools/actions/certfixDshouldfix4-shop-${key}.json`, JSON.stringify(acts, null, 1));
    console.log(`wrote tools/actions/certfixDshouldfix4-shop-${key}.json`);
  }
}

// --- more discriminators for the fight stall (GPU time normal around it):
// noaudio stubs AudioContext before the RMB unlock; nonum / nothreat /
// nohudonly hide one DOM layer each.
{
  const src = JSON.parse(readFileSync('tools/actions/certfixDshouldfix4-hitch2.json', 'utf8'));
  const variants = {
    noaudio: { where: 'arm', code: `window.AudioContext=undefined;window.webkitAudioContext=undefined;return {audioStubbed:true}` },
    nonum: { where: 'sample', code: `const el=document.getElementById('dmg-num-layer');if(el)el.style.display='none';return {hidden:['dmg-num-layer']}` },
    nothreat: { where: 'sample', code: `const el=document.getElementById('hud-threat');if(el)el.style.display='none';return {hidden:['hud-threat']}` },
    nohudonly: { where: 'sample', code: `const el=document.getElementById('hud');if(el)el.style.display='none';return {hidden:['hud']}` },
  };
  for (const [key, v] of Object.entries(variants)) {
    const out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i];
      if (v.where === 'arm' && i === 1) out.push(ev(iife(v.code)));
      if (v.where === 'sample' && a.type === 'eval' && /tag:'sample-start'/.test(a.code)) out.push(ev(iife(v.code)));
      out.push(a);
    }
    for (const a of out) if (a.type === 'eval' && /out\.tag='hitch2'/.test(a.code)) a.code = a.code.replace("out.tag='hitch2'", `out.tag='hitch2-${key}'`);
    writeFileSync(`tools/actions/certfixDshouldfix4-hitch2-${key}.json`, JSON.stringify(out, null, 1));
    console.log(`wrote tools/actions/certfixDshouldfix4-hitch2-${key}.json`);
  }
}

// --- shop3: CSS-family bisection of the shop-open stall on a QUIET server
// (round-4 resume). Each variant injects one stylesheet before the open; the
// stall that survives tells which effect family still compiles a raster
// pipeline at the real open even though the boot pre-paint drew the shelf.
{
  const CSS = (css) =>
    `const st=document.createElement('style');st.id='dfix-ab';st.textContent=${JSON.stringify(css)};document.head.appendChild(st);return {css:st.textContent.slice(0,90)}`;
  const variants = {
    nobox: CSS('#run-screen *{box-shadow:none!important}'),
    notext: CSS('#run-screen *{text-shadow:none!important}'),
    nofilter: CSS('#run-screen *{filter:none!important}'),
    nograd: CSS('#run-screen *{background-image:none!important}'),
    noveil: CSS('#run-veil{display:none!important}'),
    notrans: CSS('#run-screen,#run-veil{transition:none!important}'),
    noshine: CSS('.rn-shine{display:none!important}'),
    nofx: CSS('.rn-fx{display:none!important}'),
    nolamp: CSS('.rn-lamp,.rn-lanternglow{display:none!important}'),
    noallfx: CSS('#run-screen *{box-shadow:none!important;text-shadow:none!important;filter:none!important} #run-veil{display:none!important} .rn-shine,.rn-fx{display:none!important}'),
  };
  for (const [key, body] of Object.entries(variants)) {
    const acts = [
      ev(ARM),
      ev(iife(`${REC}E.cmd('startRun');return {run:1,tick:E.tick,gl:E.state().gl}`)),
      { type: 'wait', ms: 1500 },
      ev(iife(body)),
      ev(iife(`D.openAt=+performance.now().toFixed(1);D.openP=D.rec(6000);const r=E.cmd('skipToRoom',7);return {open:'shop3-${key}',room:r&&r.room,tick:E.tick}`)),
      ev(aiife(`const t0=performance.now();while(performance.now()-t0<20000){let s=null;try{s=E.runUi().screen}catch(e){}if(s==='shop')break;await sl(16);}D.shopAt=+performance.now().toFixed(1);
const out=await D.openP;out.tag='shop3-${key}';out.screen=E.runUi().screen;out.shopAfterMs=Math.round(D.shopAt-D.openAt);out.glEnd=E.state().gl;return out`)),
    ];
    writeFileSync(`tools/actions/certfixDshouldfix4-shop3-${key}.json`, JSON.stringify(acts, null, 1));
    console.log(`wrote tools/actions/certfixDshouldfix4-shop3-${key}.json`);
  }
}

// --- boss-dom: the boss driver with the DOM MutationObserver ring, so the
// 341 ms frame seen ~15 s into the boss room (after7-boss) can be laid beside
// every DOM write in the 450 ms before it.
{
  const DOMARM = iife(`D.dom=[];D.anim=[];
D.mo=new MutationObserver((recs)=>{const t=+performance.now().toFixed(1);for(const r of recs){const el=r.target;const tag=(el.nodeType===1?el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).slice(0,3).join('.'):''):'#text<'+(el.parentNode&&el.parentNode.className||'')+'>');
 D.dom.push([t,r.type,tag,r.attributeName||'',r.type==='attributes'&&r.attributeName?String(el.getAttribute(r.attributeName)||'').slice(0,70):(r.type==='childList'?('+'+r.addedNodes.length+'/-'+r.removedNodes.length):String(el.textContent||'').slice(0,30))]);}
 if(D.dom.length>30000)D.dom.splice(0,15000);});
D.mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true,attributeOldValue:false});
return 'dom armed'`);
  const src = JSON.parse(readFileSync('tools/actions/certfixDshouldfix4-boss.json', 'utf8'));
  const out = [];
  for (const a of src) {
    if (a.type === 'shot') continue;
    out.push(a);
    if (a.type === 'eval' && /D\.rec=async/.test(a.code)) out.push(ev(DOMARM));
  }
  for (const a of out) {
    if (a.type === 'eval' && /await D\.rec\(15000\)/.test(a.code)) {
      a.code = a.code.replace(
        "out.tag='boss';",
        "out.tag='boss-dom';for(const g of out.gaps){const a=g.absStart-450,b=g.absStart+g.gap+30;g.dom=D.dom.filter(x=>x[0]>=a&&x[0]<=b).map(x=>[+(x[0]-g.absStart).toFixed(0),x[1],x[2],x[3],x[4]]).slice(0,120);}"
      );
    }
    if (a.type === 'eval' && /out\.tag='downed'/.test(a.code)) {
      a.code = a.code.replace(
        "out.tag='downed';",
        "out.tag='downed-dom';for(const g of out.gaps){const a=g.absStart-450,b=g.absStart+g.gap+30;g.dom=D.dom.filter(x=>x[0]>=a&&x[0]<=b).map(x=>[+(x[0]-g.absStart).toFixed(0),x[1],x[2],x[3],x[4]]).slice(0,120);}"
      );
    }
  }
  writeFileSync('tools/actions/certfixDshouldfix4-boss-dom.json', JSON.stringify(out, null, 1));
  console.log('wrote tools/actions/certfixDshouldfix4-boss-dom.json');
}

// --- shop4-rec: the plain shop open with the boot pre-paint state read at arm
// time (E.runUi().prepaint: started/done ms, frames painted).
{
  const acts = [
    ev(ARM),
    ev(iife(`${REC}return {prepaint:E.runUi().prepaint,tick:E.tick,gl:E.state().gl}`)),
    ev(iife(`E.cmd('startRun');return {run:1,tick:E.tick}`)),
    { type: 'wait', ms: 1500 },
    ev(iife(`D.openAt=+performance.now().toFixed(1);D.openP=D.rec(6000);const r=E.cmd('skipToRoom',7);return {open:'shop4',room:r&&r.room,tick:E.tick}`)),
    ev(aiife(`const t0=performance.now();while(performance.now()-t0<20000){let s=null;try{s=E.runUi().screen}catch(e){}if(s==='shop')break;await sl(16);}D.shopAt=+performance.now().toFixed(1);
const out=await D.openP;out.tag='shop4-rec';out.screen=E.runUi().screen;out.shopAfterMs=Math.round(D.shopAt-D.openAt);out.prepaint=E.runUi().prepaint;return out`)),
    { type: 'shot', name: 'certfixDshouldfix4-shop4-open' },
  ];
  writeFileSync('tools/actions/certfixDshouldfix4-shop4-rec.json', JSON.stringify(acts, null, 1));
  console.log('wrote tools/actions/certfixDshouldfix4-shop4-rec.json');
}
