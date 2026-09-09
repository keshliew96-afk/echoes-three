// certfixC1-gen.mjs — certification FIX round 1, block C (F1).
// Probe: does the kill that CLEARS a room get its damage numeral?
// Mirrors the critic's certC1-lastkill2 evidence (tools/certC1-pxgen.mjs) but
// adds (a) a per-frame count of VISIBLE .dmg-num nodes (opacity > 0.05 and not
// hidden) so the numeral is proven on screen, not just in the DOM, (b) a shot
// fired the moment a same-tick room-clearing kill is seen, and (c) the
// no-leak regression: vfx.numerals read inside room_enter / run_end AFTER
// main.js's boundary flush has run (our listener is registered last).
import { writeFileSync } from 'node:fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const NUM = 'const NUMOF=()=>{const v=E.state().vfx||{};return v.numerals??(v.arena&&v.arena.numerals)??null;};';
const iife = (body) => `(()=>{const E=__echoes;${NUM}${body}})()`;
const aiife = (body) =>
  `(async()=>{const E=__echoes;${NUM}const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const waitFor = (cond, timeout = 20000, extra = '') =>
  ev(aiife(
    `const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await sleep(4);}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}`,
  ));

const EVT = ['run_start', 'room_enter', 'room_start', 'room_cleared', 'wave_start', 'enemy_spawn',
  'hit', 'death', 'hitstop', 'sound', 'heal', 'reward_offer', 'draft_taken', 'path_chosen',
  'run_end', 'return_to_camp', 'enemy_despawn'];

// --- arm ------------------------------------------------------------------
// One event tap, one DOM MutationObserver on #dmg-num-layer, one rAF sampler.
const arm = ev(iife(`
  window.__c={ev:[],rows:[],dom:[],ticksSeen:0,frames:0,started:performance.now(),
    clearFlag:false,clearInfo:null,boundary:[],lastPos:{}};
  const C=window.__c;
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>{
    const r=Object.assign({T:t,ms:Math.round(performance.now()-C.started)},e);C.ev.push(r);
    if(t==='room_cleared'){
      const deaths=C.ev.filter(x=>x.T==='death');const d=deaths[deaths.length-1];
      const same=!!d&&d.tick===e.tick;
      C.boundary.push({T:'room_cleared',tick:e.tick,num:NUMOF()??null,sameTickKill:same});
      if(same&&!C.clearFlag){const h=C.ev.filter(x=>x.T==='hit'&&x.target===d.id&&x.tick===d.tick).slice(-1)[0];
        C.clearInfo={clearTick:e.tick,deathTick:d.tick,id:d.id,amount:h?h.amount:null,src:h?(h.source??h.src??h.skill??null):null};C.clearFlag=true;}
    }
    if(t==='room_enter'||t==='run_end'||t==='return_to_camp')
      C.boundary.push({T:t,tick:e.tick,num:NUMOF()??null});
  });
  const L=document.querySelector('#dmg-num-layer');C.numLayer=!!L;
  const lastKey=new WeakMap();const perEl=new WeakMap();
  if(L){const mo=new MutationObserver(muts=>{const t=E.tick;const seen=new Set();
    for(const m of muts){const n=m.target.nodeType===3?m.target.parentElement:m.target;
      const el=n&&n.closest?n.closest('.dmg-num'):null;if(!el||seen.has(el))continue;seen.add(el);
      const cs=getComputedStyle(el);
      const vis=!(cs.display==='none'||cs.opacity==='0'||cs.visibility==='hidden'||!el.textContent);
      if(!vis){lastKey.set(el,'hidden');perEl.set(el,0);continue;}
      const r=el.getBoundingClientRect();
      const k=el.textContent+'|'+Math.round(r.x/8)+'|'+Math.round(r.y/8);
      if(lastKey.get(el)===k)continue;
      const cnt=(perEl.get(el)||0)+1;perEl.set(el,cnt);lastKey.set(el,k);if(cnt>3)continue;
      C.dom.push({t,txt:el.textContent,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),op:cs.opacity});}});
    mo.observe(L,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});}
  let last=-1;
  const f=()=>{C.frames++;const t=E.tick;const s=E.state();const vfx=s.vfx||{};
    const num=vfx.numerals??(vfx.arena&&vfx.arena.numerals)??null;
    let visN=0,visTxt=[];const V=document.querySelector('#run-veil');const vop=V?+(parseFloat(getComputedStyle(V).opacity||'0')||0).toFixed(2):null;const vdisp=V?getComputedStyle(V).display:null;
    if(L){for(const el of L.querySelectorAll('.dmg-num')){const cs=getComputedStyle(el);
      if(cs.visibility==='hidden'||cs.display==='none')continue;const o=parseFloat(cs.opacity||'0');
      if(!(o>0.05))continue;visN++;if(visTxt.length<8)visTxt.push(el.textContent+'@'+o.toFixed(2));}}
    for(const e of s.enemies)C.lastPos[e.id]={x:e.x,z:e.z,fr:C.frames,kind:e.kind};
    C.rows.push({t,fr:C.frames,nt:t!==last,ms:Math.round(performance.now()-C.started),num,visN,visTxt,vop:vdisp==='none'?0:vop});
    if(t!==last){C.ticksSeen++;last=t;}
    if(C.rows.length>40000)C.rows.splice(0,12000);
    requestAnimationFrame(f);};
  requestAnimationFrame(f);
  return {armed:E.tick,numLayer:C.numLayer,version:E.version}`));

const startRun = ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,modes:r&&r.frame&&r.frame.modes,room:r&&r.room,tick:E.tick}`));
const LIVE = `(()=>{const s=__echoes.state();return s.run.active&&s.run.combatActive&&s.enemies.length>0})()`;
const waitLive = waitFor(LIVE, 30000, `,enemies:E.state().enemies.length,phase:E.state().run.phase`);

// Drive real Act-1 play: decline drafts, take the first path, advance the shop,
// keep the Healer alive. No command ever touches an enemy.
const roomLoop = (ms, rooms) => ev(aiife(
  `const C=window.__c;const t0=performance.now();while(performance.now()-t0<${ms}){
    const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');
    const p=E.state().party[0];if(p.hp<30)E.cmd('setHp',0,1);
    const n=C.ev.filter(e=>e.T==='room_cleared').length;
    if(n>=${rooms}){await sleep(600);return {ok:true,tick:E.tick,cleared:n,ms:Math.round(performance.now()-t0),fps:E.fps};}
    await sleep(40);}
  return {ok:false,tick:E.tick,cleared:C.ev.filter(e=>e.T==='room_cleared').length,fps:E.fps}`));

// The clearing-kill frame: run the same driver, but stop the instant a
// room_cleared lands on the same tick as the last death, so the shot that
// follows is inside the numeral's 0.8 s life.
const driveUntilClearKill = (ms) => ev(aiife(
  `const C=window.__c;const t0=performance.now();while(performance.now()-t0<${ms}){
    const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');
    const p=E.state().party[0];if(p.hp<30)E.cmd('setHp',0,1);
    if(C.clearFlag)return {ok:true,tick:E.tick,info:C.clearInfo,num:NUMOF(),fps:E.fps,ms:Math.round(performance.now()-t0)};
    await sleep(4);}
  return {ok:false,tick:E.tick,fps:E.fps}`));

const clearShotReport = ev(iife(`
  const C=window.__c;const i=C.clearInfo;if(!i)return {tag:'clearshot',none:true};
  const t=i.deathTick;
  const rows=C.rows.filter(r=>r.t>=t-3&&r.t<=t+60);
  const dom=C.dom.filter(x=>x.t>=t-2&&x.t<=t+60).map(x=>[x.t,x.txt,x.x,x.y,x.op]);
  return {tag:'clearshot',info:i,tickNow:E.tick,
    numTrace:rows.filter(r=>r.nt).map(r=>r.t+':'+r.num+'/'+r.visN+'/v'+r.vop).slice(0,50),
    visFramesWithNumeral:rows.filter(r=>r.visN>0).length,
    visTxtSample:rows.filter(r=>r.visN>0).slice(0,6).map(r=>r.t+':'+r.visTxt.join(',')),
    dom}`));

// --- analysis -------------------------------------------------------------
const analyzeClears = ev(iife(`
  const C=window.__c;const rows=C.rows;const ev=C.ev;const out=[];
  for(const rc of ev.filter(e=>e.T==='room_cleared')){
    const deaths=ev.filter(e=>e.T==='death'&&e.tick<=rc.tick);const d=deaths[deaths.length-1];
    if(!d){out.push({clearTick:rc.tick,death:null});continue;}
    const h=ev.find(e=>e.T==='hit'&&e.target===d.id&&e.tick===d.tick)||ev.filter(e=>e.T==='hit'&&e.target===d.id).slice(-1)[0];
    const t=d.tick;
    const dom=h?C.dom.filter(x=>x.t>=t&&x.t<=t+2&&x.txt===String(h.amount)):[];
    const domNear=C.dom.filter(x=>x.t>=t-2&&x.t<=t+8).map(x=>[x.t,x.txt,x.x,x.y]);
    const numRows=rows.filter(r=>r.nt&&r.t>=t-2&&r.t<=t+10).map(r=>r.t+':'+r.num+'/'+r.visN);
    const visFrames=rows.filter(r=>r.t>=t&&r.t<=t+50&&r.visN>0).length;
    const seg=rows.filter(r=>r.t>=t-5&&r.t<=t+20);let mg=0,mgAt=null;
    for(let i=1;i<seg.length;i++){const g=seg[i].ms-seg[i-1].ms;if(g>mg){mg=g;mgAt=seg[i].t;}}
    const hs=ev.filter(e=>e.T==='hitstop'&&e.tick>=t&&e.tick<=t+2).map(e=>e.ticks+':'+e.cause);
    const snd=ev.filter(e=>e.T==='sound'&&e.tick>=t&&e.tick<=t+2).map(e=>e.slot);
    out.push({clearTick:rc.tick,sameTickKill:d.tick===rc.tick,room:rc.room??null,
      death:{tick:t,id:d.id,kind:(C.lastPos[d.id]&&C.lastPos[d.id].kind)||null},
      hit:h?{tick:h.tick,amt:h.amount,src:h.source??h.src??h.skill??null}:null,
      numeral:dom.length>0,numeralAt:dom.length?dom[0].t-t:null,visFrames,domNear,numRows,
      maxFrameGapMs:mg,gapAtTick:mgAt,hitstop:hs,sound:snd});}
  const allKills=ev.filter(e=>e.T==='death').map(d=>{
    const h=ev.find(e=>e.T==='hit'&&e.target===d.id&&e.tick===d.tick);
    const dom=h?C.dom.filter(x=>x.t>=d.tick&&x.t<=d.tick+2&&x.txt===String(h.amount)):[];
    return {t:d.tick,id:d.id,amt:h&&h.amount,num:dom.length>0};});
  const big=[];for(let i=1;i<rows.length;i++){const g=rows[i].ms-rows[i-1].ms;if(g>100)big.push([rows[i].t,g]);}
  return {tag:'clears',rooms:out,kills:allKills.length,killsWithNumeral:allKills.filter(k=>k.num).length,
    killsMissingNumeral:allKills.filter(k=>!k.num),frameGapsOver100ms:big,
    boundaryNumerals:C.boundary}`));

const coverage = ev(iife(`const r=window.__c.rows;let gaps=0,maxGap=0;
  for(let i=1;i<r.length;i++){const g=r[i].t-r[i-1].t;if(g>1){gaps+=g-1;maxGap=Math.max(maxGap,g);}}
  return {tag:'coverage',ticksSeen:window.__c.ticksSeen,frames:window.__c.frames,rows:r.length,fps:E.fps,missedTicks:gaps,maxTickGap:maxGap,span:r.length?r[r.length-1].t-r[0].t:0}`));
const counts = ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {tag:'counts',tick:E.tick,version:E.version,counts:m}`));
const snap = (tag) => ev(iife(`const s=E.state();const r=s.run;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,scene:s.scene,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,enemies:s.enemies.length,ui:E.runUi().screen,vfx:s.vfx}`));

// 10 s rAF fps sample (regression duty).
const fpsSample = ev(aiife(`const t0=performance.now();let n=0,worst=0,lastT=t0;
  await new Promise(res=>{const f=(now)=>{const d=now-lastT;lastT=now;if(n>2&&d>worst)worst=d;n++;
    if(now-t0>=10000)return res();requestAnimationFrame(f);};requestAnimationFrame(f);});
  const ms=performance.now()-t0;return {tag:'fps10s',frames:n,seconds:+(ms/1000).toFixed(2),fps:+(n/(ms/1000)).toFixed(1),worstFrameMs:Math.round(worst),reportedFps:E.fps}`));

const files = {};

// A. the F1 probe — three natural room clears, seed 555 (the critic's seed).
files['certfixC1-lastkill'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,7200);return 'iframe '+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  roomLoop(120000, 3),
  analyzeClears, counts, coverage, snap('lastkill-end'),
];

// B. the clearing-kill FRAME — stop on the same-tick clear and shoot at once.
files['certfixC1-clearframe'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,7200);return 'iframe '+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  shot('certfixC1-warm'),
  driveUntilClearKill(120000),
  shot('certfixC1-clearkill'),
  clearShotReport,
  wait(1500),
  shot('certfixC1-clearkill-after'),
  ev(iife(`const C=window.__c;return {tag:'after',tick:E.tick,num:NUMOF(),visN:C.rows[C.rows.length-1].visN,ui:E.runUi().screen}`)),
  counts, coverage, snap('clearframe-end'),
];

// C. regression: a run still plays (rooms clear, banner/UI advance) + fps.
files['certfixC1-regress'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,20000);return 'iframe '+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  roomLoop(120000, 2),
  snap('regress-mid'),
  fpsSample,
  analyzeClears, counts, coverage, snap('regress-end'),
];

// D. no-leak: finish the run (win) and prove nothing rides into Camp.
files['certfixC1-leak'] = [
  arm,
  ev(iife(`const r=E.cmd('startRun');E.cmd('iframe',0,20000);return {seed:E.seed,room:r&&r.room}`)),
  waitLive,
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const C=window.__c;const t0=performance.now();
    while(performance.now()-t0<20000){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);await sleep(40);
      if(C.ev.some(e=>e.T==='room_cleared'))break;}
    return {cleared:C.ev.filter(e=>e.T==='room_cleared').length,tick:E.tick}`)),
  ev(iife(`const r=E.cmd('endRun','victory');return {won:E.tick,ui:E.runUi().screen,phase:r&&r.phase}`)),
  wait(1400),
  ev(iife(`const C=window.__c;return {tag:'after-run-end',tick:E.tick,num:NUMOF(),visN:C.rows[C.rows.length-1].visN,ui:E.runUi().screen,scene:E.state().scene}`)),
  shot('certfixC1-victory'),
  ev(iife(`E.cmd('returnToCamp');return {tag:'to-camp',tick:E.tick,ui:E.runUi().screen}`)),
  wait(1500),
  ev(iife(`const C=window.__c;const L=document.querySelector('#dmg-num-layer');let vis=0;
    if(L)for(const el of L.querySelectorAll('.dmg-num')){const cs=getComputedStyle(el);
      if(cs.visibility!=='hidden'&&cs.display!=='none'&&parseFloat(cs.opacity||'0')>0.05)vis++;}
    return {tag:'in-camp',tick:E.tick,num:NUMOF(),domVisible:vis,ui:E.runUi().screen,run:E.state().run.active}`)),
  shot('certfixC1-camp-after'),
  counts, coverage, snap('leak-end'),
];


// E. layout regression (HUD builder's gate, re-checked here): the two HUD
// zones must not overlap each other or the corner plates at 1024x576 or
// 2560x1440, with a live combat room behind them.
const layoutReport = ev(iife(`
  const m=E.hud.metrics();const l=E.hud.loc();const c=E.hud.combat();
  const b1=m.zone1Box,b2=m.zone2Box;
  const ov=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  return {tag:'layout',win:m.window,scale:m.scale,fitScale:m.fitScale,clamped:m.clamped,
    zonePctOfHeight:m.zonePctOfHeight,zone1Box:b1,zone2Box:b2,locBox:l.locBox,glintBox:l.glintBox,
    overlapZ1Z2:ov(b1,b2),overlapZ2Loc:ov(b2,l.locBox),overlapZ2Glint:ov(b2,l.glintBox),
    bannerMode:c.bannerMode,threatNodes:c.threatNodes,realLocPx:l.realLocPx,realGlintPx:l.realGlintPx,
    enemies:E.state().enemies.length,fps:E.fps}`));

files['certfixC1-layout'] = [
  arm, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,7200);return 'iframe '+E.tick`)),
  wait(900),
  layoutReport,
  counts, snap('layout-end'),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
