// Certification block D round 3 — AUDIT-GAP batch (prefix certD3-b-).
// Gap 1: D6 boss plate layout at 1024x576 / 2560x1440 (never measured).
// Gap 2: D2 boss sampled with the real add load alive for the whole window.
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, arm, sampler } from './certD3-gen.mjs';

const rmbOn = [{ type: 'mousemove', x: 800, y: 380 }, { type: 'mousedown', button: 'right' }];
const rmbOff = [{ type: 'mouseup', button: 'right' }];

const peakArm = ev(iife("window.__pk={max:0,at:0,maxEnts:0,n:0,minNonBoss:99,samples:0,withAdds:0};window.__pkiv=setInterval(()=>{try{const s=E.state();window.__pk.n++;const n=s.enemies.length;if(n>window.__pk.max){window.__pk.max=n;window.__pk.at=E.tick;}if(E.entityCount>window.__pk.maxEnts)window.__pk.maxEnts=E.entityCount;const r=E.cmd('runState');const nb=r&&r.boss&&r.boss.active?n-1:n;window.__pk.samples++;if(nb>=1)window.__pk.withAdds++;if(nb<window.__pk.minNonBoss)window.__pk.minNonBoss=nb;}catch(e){}},100);return 'peak armed t'+E.tick"));
const peakRead = ev(iife("clearInterval(window.__pkiv);const s=E.state();const r=E.cmd('runState');return {peak:window.__pk,addsAlivePct:+(100*window.__pk.withAdds/Math.max(1,window.__pk.samples)).toFixed(1),now:{enemies:s.enemies.length,ents:E.entityCount,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length},boss:r&&r.boss}"));

// party-only keep-alive: never touches boss HP, so add phases are NOT suppressed
const partyAlive = ev(iife("window.__ka=setInterval(()=>{try{const s=E.state();for(const p of s.party){if(p.downed){try{E.cmd('rally');}catch(e){}}if(p.downed||p.hp<p.maxHp*0.6){try{E.cmd('setHp',p.id,1);}catch(e){}}}}catch(e){}},400);return 'partyAlive armed t'+E.tick"));

// sustained-load driver: party alive + boss floored in a LOW band (0.18 -> 0.32, i.e. it
// re-crosses the 0.25 add threshold instead of being lifted back above it) + add top-up to N
const loadDriver = (n) => ev(iife("window.__lg={spawned:0,bumps:0};window.__ka=setInterval(()=>{try{const s=E.state();" +
  "for(const p of s.party){if(p.downed){try{E.cmd('rally');}catch(e){}}if(p.downed||p.hp<p.maxHp*0.6){try{E.cmd('setHp',p.id,1);}catch(e){}}}" +
  "const r=E.cmd('runState');if(r&&r.boss&&r.boss.active&&r.boss.pct<0.18){try{E.cmd('bossHp',0.32);window.__lg.bumps++;}catch(e){}}" +
  "const nb=s.enemies.length-((r&&r.boss&&r.boss.active)?1:0);" +
  "if(nb<" + n + "){const K=['boar','mantis'];for(let i=nb;i<" + n + ";i++){const a=(window.__lg.spawned*1.13)%6.283;const rad=5+((window.__lg.spawned%3)*1.6);try{E.cmd('spawn',K[window.__lg.spawned%2],+(Math.cos(a)*rad).toFixed(2),+(Math.sin(a)*rad).toFixed(2));window.__lg.spawned++;}catch(e){}}}" +
  "}catch(e){}},400);return 'loadDriver armed t'+E.tick"));

const stopKa = ev(iife("clearInterval(window.__ka);return {stopped:true,lg:window.__lg||null,tick:E.tick}"));

// ---------------- layout monitor: samples every HUD component rect over time ----------------
const layoutMon = (tag, durMs, stepMs) => ev(
  '(async()=>{const E=__echoes;const TAG=' + JSON.stringify(tag) + ';\n' +
  "const vis=(el)=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.02)return false;const r=el.getBoundingClientRect();return r.width>0.5&&r.height>0.5;};\n" +
  'const R=(el)=>{const r=el.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];};\n' +
  "const nm=(el)=>((el.id?'#'+el.id:'')+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\\s+/).join('.'):''))||el.tagName;\n" +
  'const grab=()=>{const vw=innerWidth,vh=innerHeight;const comps=[];\n' +
  " const push=(el,extra)=>{if(!vis(el))return;const r=R(el);if(r[2]>=vw-1&&r[3]>=vh-1)return;comps.push([nm(el)+(extra||''),r,(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,34)]);};\n" +
  " const hud=document.getElementById('hud');\n" +
  ' if(hud){for(const el of hud.children)push(el);\n' +
  "   for(const el of hud.querySelectorAll('*'))if(/boss/i.test(el.id||'')||/boss/i.test(typeof el.className==='string'?el.className:''))push(el,'|BOSS');}\n" +
  " for(const el of document.querySelectorAll('body *')){const id=el.id||'';const cl=typeof el.className==='string'?el.className:'';\n" +
  "   if(/boss/i.test(id)||/boss/i.test(cl)){if(!comps.some(c=>c[0].split('|')[0]===nm(el)))push(el,'|BOSS');}}\n" +
  " const rs=document.getElementById('run-screen');\n" +
  " if(rs&&vis(rs)){for(const el of rs.querySelectorAll('.rn-page,.rn-card,.rn-door,button'))push(el);}\n" +
  " for(const el of document.querySelectorAll('body > *'))if(el.tagName!=='CANVAS'&&el.id!=='hud'&&el.id!=='run-screen')push(el);\n" +
  ' const over=[];\n' +
  " for(const el of document.querySelectorAll('body *')){if(el.tagName==='CANVAS'||el.ownerSVGElement)continue;if(!vis(el))continue;const r=el.getBoundingClientRect();\n" +
  '  if(r.left<-0.5||r.top<-0.5||r.right>vw+0.5||r.bottom>vh+0.5){if(Math.round(r.width)>=vw&&Math.round(r.height)>=vh)continue;over.push([nm(el),R(el)]);}}\n' +
  ' const outv=comps.filter(c=>c[1][0]<-0.5||c[1][1]<-0.5||c[1][0]+c[1][2]>vw+0.5||c[1][1]+c[1][3]>vh+0.5).map(c=>[c[0],c[1]]);\n' +
  ' const ix=(a,b)=>{const x=Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]);const y=Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]);return x>0.5&&y>0.5?[Math.round(x),Math.round(y)]:null;};\n' +
  ' const contains=(a,b)=>a[0]<=b[0]+0.5&&a[1]<=b[1]+0.5&&a[0]+a[2]>=b[0]+b[2]-0.5&&a[1]+a[3]>=b[1]+b[3]-0.5;\n' +
  ' const hits=[];\n' +
  ' for(let i=0;i<comps.length;i++)for(let j=i+1;j<comps.length;j++){const A=comps[i],B=comps[j];\n' +
  "   if(A[0].split('|')[0]===B[0].split('|')[0])continue;\n" +
  '   const o=ix(A[1],B[1]);if(!o)continue;\n' +
  "   const rel=contains(A[1],B[1])?'A_contains_B':(contains(B[1],A[1])?'B_contains_A':'CROSS');\n" +
  '   hits.push([A[0],A[1],B[0],B[1],o,rel]);}\n' +
  ' let bn=null;try{bn=E.hud.banner();}catch(e){}\n' +
  ' let bp=null;try{const r=E.cmd("runState");bp=r&&r.boss?{pct:r.boss.pct,hp:r.boss.hp,adds:r.boss.adds,phases:r.boss.phasesFired,quake:!!r.boss.quake}:null;}catch(e){}\n' +
  " let sc='?',us='?';try{sc=E.state().scene;}catch(e){}try{us=E.runUi().screen;}catch(e){}\n" +
  ' return {t:+performance.now().toFixed(0),tick:E.tick,vp:[vw,vh],scene:sc,uiScreen:us,banner:bn,boss:bp,enemies:(()=>{try{return E.state().enemies.length}catch(e){return -1}})(),comps,overflow:over,outOfViewport:outv,overlaps:hits};};\n' +
  'const t0=performance.now();const seen=new Map();const incidents=[];const all=[];\n' +
  'while(performance.now()-t0<' + durMs + '){const g=grab();all.push(g);\n' +
  ' const sig=JSON.stringify(g.comps.map(c=>[c[0],c[1]]));\n' +
  ' if(!seen.has(sig))seen.set(sig,g);\n' +
  " if(g.overlaps.some(h=>h[5]==='CROSS')||g.outOfViewport.length||g.overflow.length)incidents.push(g);\n" +
  ' await new Promise(r=>setTimeout(r,' + stepMs + '));}\n' +
  'const isBoss=(c)=>/\\|BOSS$/.test(c[0]);\n' +
  'const isBanner=(c)=>/hud-banner/.test(c[0])&&/show/.test(c[0]);\n' +
  'const bossFrames=all.filter(g=>g.comps.some(isBoss));\n' +
  'const bannerFrames=all.filter(g=>g.comps.some(isBanner));\n' +
  'const both=all.filter(g=>g.comps.some(isBoss)&&g.comps.some(isBanner));\n' +
  'return {tag:TAG,samples:all.length,distinctLayouts:seen.size,\n' +
  ' bossPlateFrames:bossFrames.length,bannerFrames:bannerFrames.length,bossPlateAndBannerFrames:both.length,\n' +
  " crossOverlapIncidents:incidents.filter(g=>g.overlaps.some(h=>h[5]==='CROSS')).length,\n" +
  ' outOfViewportIncidents:incidents.filter(g=>g.outOfViewport.length).length,\n' +
  ' overflowIncidents:incidents.filter(g=>g.overflow.length).length,\n' +
  ' firstBossFrame:bossFrames[0]||null,lastBossFrame:bossFrames[bossFrames.length-1]||null,\n' +
  ' bothFrame:both[0]||null,bothFrameLast:both[both.length-1]||null,\n' +
  ' incidentSample:incidents.slice(0,4),\n' +
  ' layouts:[...seen.values()].slice(0,10)};})()');

// ---- sampler2: everything sampler() gives, plus 2 s bucket stats so the load-carrying
// seconds can be judged on their own instead of being averaged with an empty stage.
const sampler2 = (tag, durMs) => ev('(async()=>{const E=__echoes;const TAG=' + JSON.stringify(tag) + ';const DUR=' + durMs + ';\n' +
  'const D=[];const S=[];const LT=[];let po=null;\n' +
  "try{po=new PerformanceObserver(l=>{for(const e of l.getEntries())LT.push([+e.startTime.toFixed(0),+e.duration.toFixed(1)]);});po.observe({entryTypes:['longtask']});}catch(e){}\n" +
  'let t0=0,last=0,stop=false;\n' +
  'const step=(now)=>{const d=now-last;last=now;D.push([+(now-t0).toFixed(1),+d.toFixed(2)]);if(now-t0<DUR)requestAnimationFrame(step);else stop=true;};\n' +
  'requestAnimationFrame((n)=>{t0=n;last=n;requestAnimationFrame(step);});\n' +
  'const iv=setInterval(()=>{try{const s=E.state();const r=E.cmd("runState");const b=r&&r.boss;S.push([+((performance.now()-t0)/1000).toFixed(2),+(E.fps||0).toFixed(1),E.entityCount,s.enemies.length,(b&&b.active)?+(b.pct.toFixed(2)):-1,(b&&b.adds)||0,s.azones.length,s.skillBolts.length,E.tick]);}catch(e){}},500);\n' +
  'const guard=performance.now();\n' +
  'while(!stop&&performance.now()-guard<DUR+15000){await new Promise(r=>setTimeout(r,40));}\n' +
  'clearInterval(iv);if(po)try{po.disconnect();}catch(e){}\n' +
  'const stat=(a)=>{if(!a.length)return null;const v=a.map(x=>x[1]).sort((p,q)=>p-q);const n=v.length;const sum=v.reduce((p,q)=>p+q,0);const Q=(p)=>+v[Math.min(n-1,Math.floor(p*n))].toFixed(2);\n' +
  'return {frames:n,meanMs:+(sum/n).toFixed(2),meanFps:+(1000/(sum/n)).toFixed(1),p50:Q(0.5),p95:Q(0.95),p99:Q(0.99),max:+v[n-1].toFixed(2),g100:a.filter(x=>x[1]>100).length};};\n' +
  'const W=D.filter(x=>x[0]<3000),ST=D.filter(x=>x[0]>=3000);\n' +
  'const buckets=[];for(let s=0;s<DUR;s+=2000){const w=D.filter(x=>x[0]>=s&&x[0]<s+2000);if(w.length)buckets.push([s/1000,stat(w)]);}\n' +
  'const gS=ST.filter(x=>x[1]>100).map(x=>[x[0],x[1]]);const gA=D.filter(x=>x[1]>100).map(x=>[x[0],x[1]]);\n' +
  'let worst=null;\n' +
  'if(ST.length>2){const te=ST[ST.length-1][0];for(let s=ST[0][0];s+15000<=te+500;s+=1000){const w=ST.filter(x=>x[0]>=s&&x[0]<s+15000);if(w.length<10)continue;const g=w.filter(x=>x[1]>100).length;const st=stat(w);if(!worst||g>worst.gaps||(g===worst.gaps&&st.meanFps<worst.meanFps))worst={start:Math.round(s),gaps:g,meanFps:st.meanFps,max:st.max};}}\n' +
  'let evs=null;try{evs=(window.__c?window.__c.ev:[]).map(e=>[e.T,e.tick]).filter(e=>/quake|adds|downed|room_cleared|boss_death|death/.test(e[0]));}catch(e){}\n' +
  'return {tag:TAG,durMs:Math.round(performance.now()-guard),all:stat(D),warm:stat(W),steady:stat(ST),buckets,steadyGaps100:gS,allGaps100:gA,longTasks:LT.length,longTasksTop:LT.sort((a,b)=>b[1]-a[1]).slice(0,5),worst15s:worst,perHalfSec:S,evs};})()');

const files = {};

// ================= GAP 1: D6 boss-plate layout =================
files['certD3-b-layboss'] = [
  arm,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {vp:[innerWidth,innerHeight],room:r&&r.room,mode:r&&r.mode,boss:r&&r.boss}")),
  waitFor("(()=>{const r=E.cmd('runState');return r&&r.boss&&r.boss.active;})()", 60000, ",boss:E.cmd('runState').boss"),
  partyAlive,
  ...rmbOn,
  layoutMon('boss-layout', 14000, 250),
  shot('certD3-b-layboss-mid'),
  ev(iife("const r=E.cmd('runState');const s=E.state();return {tag:'layboss-post',vp:[innerWidth,innerHeight],tick:E.tick,boss:r&&r.boss,enemies:s.enemies.length,ents:E.entityCount,banner:E.hud.banner(),screen:E.runUi().screen,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>e.tick),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>[e.tick,e.pct,e.spawned])}")),
  stopKa,
  ...rmbOff,
];

// ================= GAP 2: D2 boss with the real add load =================
const bossPerf = (tag, driver, durMs, s2) => [
  arm,
  ev(iife("E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room,mode:r&&r.mode,boss:r&&r.boss}")),
  waitFor("window.__c.ev.some(e=>e.T==='boss_adds') && E.state().enemies.length>=3", 60000,
    ",boss:E.cmd('runState').boss,enemies:E.state().enemies.map(e=>[e.id,e.kind]),evs:window.__c.ev.map(e=>[e.T,e.tick])"),
  ...rmbOn,
  driver,
  wait(600),
  ev(iife("const s=E.state();const r=E.cmd('runState');return {tag:'pre-" + tag + "',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,kinds:s.enemies.map(e=>e.kind),boss:r&&r.boss,party:s.party.map(p=>[p.classId||p.id,Math.round(p.hp),p.downed])}")),
  peakArm,
  (s2 ? sampler2 : sampler)(tag, durMs),
  peakRead,
  ev(iife("const s=E.state();const r=E.cmd('runState');return {tag:'post-" + tag + "',tick:E.tick,fps:E.fps,ents:E.entityCount,enemies:s.enemies.length,boss:r&&r.boss,party:s.party.map(p=>[p.classId||p.id,Math.round(p.hp),p.downed]),quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>e.tick),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>[e.tick,e.pct,e.spawned]),downed:window.__c.ev.filter(e=>e.T==='downed').length,deaths:window.__c.ev.filter(e=>e.T==='death').length}")),
  stopKa,
  ...rmbOff,
];
files['certD3-b-bossnat'] = bossPerf('D2b-boss-natural-partyalive', partyAlive, 20000, false);
files['certD3-b-bossload'] = bossPerf('D2b-boss-addload', loadDriver(5), 24000, true);
files['certD3-b-bossload2'] = bossPerf('D2b-boss-addload-rerun', loadDriver(5), 24000, true);

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
