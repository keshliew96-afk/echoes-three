// certC1-grabgen.mjs — certification C r1 (2nd instance): like certC1-pxgen.mjs but keeps a
// rolling 3-frame crop buffer for EVERY live enemy and, on each natural `hit`, freezes that
// victim's pre-frames and records its next 6 rendered frames (ghost box if it dies), so a
// non-kill hit flash lands on disk as real rendered pixels. Up to 6 sets, natural fight only,
// no screenshots during the fight (a page.screenshot stalls rendering for ~4 ticks).
import { writeFileSync } from 'node:fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const waitFor = (cond, timeout = 20000, extra = '') =>
  ev(aiife(`const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await sleep(4);}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}`));
const EVT = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','spawn_telegraph','spawn_blocked',
  'telegraph_start','telegraph_resolve','enemy_fire','enemy_bite','hit','hit_immune','death','hitstop','sound','heal',
  'intent','intent_denied','dash_end','downed','revive','reward','draft_taken','path_chosen','enemy_despawn','basic_fire','skill_cast','ally_cast','ally_basic'];

const armGrab = ev(iife(`
  window.__c={ev:[],rows:[],dom:[],pre:{},sets:[],active:null,ticksSeen:0,frames:0,started:performance.now(),sampleOn:true,lastPos:{},maxSets:6};
  const C=window.__c;
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>{const r=Object.assign({T:t,ms:Math.round(performance.now()-C.started)},e);C.ev.push(r);
    if(t==='hit'&&e.target>=4&&!C.active&&C.sets.length<C.maxSets&&C.pre[e.target]&&C.pre[e.target].length){C.active={id:e.target,hitTick:e.tick,amt:e.amount,kind:(C.lastPos[e.target]&&C.lastPos[e.target].kind)||null,left:6,grabs:C.pre[e.target].map(g=>Object.assign({phase:'pre'},g))};}
    if(t==='death'&&C.active&&e.id===C.active.id)C.active.killed=e.tick;});
  const L=document.querySelector('#dmg-num-layer');C.numLayer=!!L;const lastKey=new WeakMap();const perEl=new WeakMap();
  if(L){const mo=new MutationObserver(muts=>{const t=E.tick;const seen=new Set();for(const m of muts){const n=m.target.nodeType===3?m.target.parentElement:m.target;const el=n&&n.closest?n.closest('.dmg-num'):null;if(!el||seen.has(el))continue;seen.add(el);const cs=getComputedStyle(el);const vis=!(cs.display==='none'||cs.opacity==='0'||cs.visibility==='hidden'||!el.textContent);if(!vis){lastKey.set(el,'hidden');perEl.set(el,0);continue;}const r=el.getBoundingClientRect();const k=el.textContent+'|'+Math.round(r.x/8)+'|'+Math.round(r.y/8);if(lastKey.get(el)===k)continue;const cnt=(perEl.get(el)||0)+1;perEl.set(el,cnt);lastKey.set(el,k);if(cnt>3)continue;C.dom.push({t,txt:el.textContent,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),col:cs.color});}});mo.observe(L,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});}
  const cvs=[...document.querySelectorAll('canvas')];let cv=null;for(const c of cvs){if(!cv||c.width*c.height>cv.width*cv.height)cv=c;}C.cv=cv&&[cv.width,cv.height,cv.clientWidth,cv.clientHeight,cvs.length];
  const sc=document.createElement('canvas');sc.width=96;sc.height=160;const sctx=sc.getContext('2d',{willReadFrequently:true});
  const gc=document.createElement('canvas');const gctx=gc.getContext('2d');
  const P=window.__arenaProbe;const V=P.root.position.constructor;const W=window.innerWidth,H=window.innerHeight;
  const proj=(x,y,z)=>{const v=new V(x,y,z);v.project(P.stage.camera);return [(v.x*0.5+0.5)*W,(-v.y*0.5+0.5)*H];};
  const boxOf=(x,z)=>{const [hx,hy]=proj(x,1.1,z);const [fx,fy]=proj(x,0,z);const cx=(hx+fx)/2;const bw=64;const bh=Math.max(48,Math.min(150,Math.round(fy-hy)+20));return [Math.round(cx-bw/2),Math.round(hy-10),bw,bh];};
  const onScreen=(bx,by,bw,bh)=>bx>=0&&by>=0&&bx+bw<=W&&by+bh<=H;
  const measure=(bx,by,bw,bh)=>{const sx=cv.width/W,sy=cv.height/H;sctx.clearRect(0,0,96,160);sctx.drawImage(cv,bx*sx,by*sy,bw*sx,bh*sy,0,0,bw,bh);const d=sctx.getImageData(0,0,bw,bh).data;let Ls=0,Ss=0,w=0,mx=0,b200=0;const n=bw*bh;for(let i=0;i<n;i++){const r=d[i*4],g=d[i*4+1],b=d[i*4+2];const l=0.2126*r+0.7152*g+0.0722*b;const M=Math.max(r,g,b),m=Math.min(r,g,b);const s=M?(M-m)/M:0;Ls+=l;Ss+=s;if(l>230&&s<0.18)w++;if(l>200)b200++;if(l>mx)mx=l;}return {bx,by,bw,bh,L:+(Ls/n).toFixed(1),S:+(Ss/n).toFixed(3),W:+(w/n).toFixed(3),B:+(b200/n).toFixed(3),mx:Math.round(mx),on:onScreen(bx,by,bw,bh)};};
  const grab=(bx,by,bw,bh)=>{const sx=cv.width/W,sy=cv.height/H;gc.width=bw;gc.height=bh;gctx.drawImage(cv,bx*sx,by*sy,bw*sx,bh*sy,0,0,bw,bh);return gc.toDataURL('image/png');};
  let last=-1;const f=()=>{C.frames++;if(C.sampleOn&&cv){const t=E.tick;const s=E.state();const p=s.party[0];const cam=P.stage.camera.position;const en={};const pxs={};const live=new Set();
    for(const e of s.enemies){live.add(e.id);en[e.id]=[+e.x.toFixed(3),+e.z.toFixed(3),e.hp,e.kbTicks];C.lastPos[e.id]={x:e.x,z:e.z,fr:C.frames,kind:e.kind};try{pxs[e.id]=measure(...boxOf(e.x,e.z));}catch(err){pxs[e.id]={err:String(err)};}}
    for(const id in C.lastPos){const lp=C.lastPos[id];if(live.has(+id))continue;if(C.frames-lp.fr>12){delete C.lastPos[id];delete C.pre[id];continue;}try{const m=measure(...boxOf(lp.x,lp.z));m.ghost=true;pxs[id]=m;}catch(err){}}
    const vfx=s.vfx||{};const num=vfx.numerals??(vfx.arena&&vfx.arena.numerals)??null;
    C.rows.push({t,fr:C.frames,nt:t!==last,ms:Math.round(performance.now()-C.started),px:+p.x.toFixed(4),pz:+p.z.toFixed(4),hp:p.hp,cam:[+cam.x.toFixed(4),+cam.y.toFixed(4),+cam.z.toFixed(4)],num,en,pxs});
    if(t!==last){C.ticksSeen++;last=t;}
    const a=C.active;
    for(const id in pxs){const b=pxs[id];if(b.err||!b.on)continue;const isA=a&&+id===a.id;if(!isA&&(a||C.sets.length>=C.maxSets))continue;const g={t,fr:C.frames,id:+id,box:[b.bx,b.by,b.bw,b.bh],L:b.L,S:b.S,W:b.W,B:b.B,mx:b.mx,ghost:!!b.ghost,url:grab(b.bx,b.by,b.bw,b.bh)};
      if(isA){g.phase='post';a.grabs.push(g);a.left--;}else{(C.pre[id]=C.pre[id]||[]).push(g);if(C.pre[id].length>3)C.pre[id].shift();}}
    if(a&&(a.left<=0||(!pxs[a.id]))){C.sets.push(a);C.active=null;}
    if(C.rows.length>24000)C.rows.splice(0,8000);}
    requestAnimationFrame(f);};requestAnimationFrame(f);
  return {armed:E.tick,numLayer:C.numLayer,probe:!!P,canvas:C.cv,inner:[W,H]}`));

const startRun = ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,modes:r&&r.frame&&r.frame.modes,room:r&&r.room,tick:E.tick}`));
const LIVE = `(()=>{const s=E.state();return s.run.active&&s.run.combatActive&&s.enemies.length>0})()`;
const waitLive = waitFor(LIVE, 30000, `,enemies:E.state().enemies.length,phase:E.state().run.phase`);
const snap = (tag) => ev(iife(`const s=E.state();const r=s.run;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,scene:s.scene,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,roomState:s.room,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),ui:E.runUi().screen,hud:E.hud.combat()}`));
const coverage = ev(iife(`const r=window.__c.rows;let gaps=0,maxGap=0;for(let i=1;i<r.length;i++){const g=r[i].t-r[i-1].t;if(g>1){gaps+=g-1;maxGap=Math.max(maxGap,g);}}return {ticksSeen:window.__c.ticksSeen,frames:window.__c.frames,rows:r.length,fps:E.fps,missedTicks:gaps,maxTickGap:maxGap,span:r.length?r[r.length-1].t-r[0].t:0}`));
const errs = ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {tick:E.tick,counts:m}`));

const analyzeHits = (tag) => ev(iife(`
  const C=window.__c;const rows=C.rows;const ev=C.ev;const hits=ev.filter(e=>e.T==='hit'&&e.target>=4);
  const deaths=new Map();for(const d of ev.filter(e=>e.T==='death'))deaths.set(d.id,d.tick);
  const out=[];
  for(const h of hits){const t=h.tick;const id=h.target;const killed=deaths.has(id)&&deaths.get(id)<=t+1;
    const pre=rows.filter(r=>r.t>=t-6&&r.t<=t-1&&r.pxs[id]&&!r.pxs[id].err&&!r.pxs[id].ghost&&r.pxs[id].on);const post=rows.filter(r=>r.t>=t&&r.t<=t+3&&r.pxs[id]&&!r.pxs[id].err&&r.pxs[id].on);
    const mean=(a,k)=>a.length?+(a.reduce((s,r)=>s+r.pxs[id][k],0)/a.length).toFixed(3):null;const max=(a,k)=>a.length?Math.max(...a.map(r=>r.pxs[id][k])):null;
    const baseW=mean(pre,'W'),baseL=mean(pre,'L'),baseB=mean(pre,'B'),baseMx=max(pre,'mx');const peakW=max(post,'W'),peakL=max(post,'L'),peakB=max(post,'B'),peakMx=max(post,'mx');
    const peakRow=post.length?post.reduce((a,r)=>r.pxs[id].W>a.pxs[id].W?r:a,post[0]):null;
    const flash=(peakW!=null&&baseW!=null)&&((peakW-baseW>=0.08)||(peakB-baseB>=0.12)||(peakL-baseL>=35));
    const dom=C.dom.filter(d=>d.t>=t&&d.t<=t+2&&d.txt===String(h.amount));const domAny=C.dom.filter(d=>d.t>=t&&d.t<=t+2).map(d=>d.txt);
    const before=rows.filter(r=>r.t>=t-4&&r.t<=t&&r.en[id]);const r0=before.length?before[before.length-1]:null;let kb=0,kbAt=null;if(r0){for(const r of rows.filter(r=>r.t>=t&&r.t<=t+8&&r.en[id])){const d=Math.hypot(r.en[id][0]-r0.en[id][0],r.en[id][1]-r0.en[id][1]);if(d>kb){kb=d;kbAt=r.t-t;}}}
    const snd=ev.filter(e=>e.T==='sound'&&e.tick>=t&&e.tick<=t+2).map(e=>e.slot);const hs=ev.filter(e=>e.T==='hitstop'&&e.tick>=t&&e.tick<=t+2).map(e=>e.ticks+':'+e.cause);
    let shake=null;if(killed){const seg=rows.filter(r=>r.nt&&r.t>=t-1&&r.t<=t+14);let mj=0;for(let i=2;i<seg.length;i++){const a=seg[i-2].cam,b=seg[i-1].cam,c=seg[i].cam;const j=Math.hypot(c[0]-2*b[0]+a[0],c[2]-2*b[2]+a[2]);if(j>mj)mj=j;}shake=+mj.toFixed(4);}
    out.push({t,id,kind:(C.lastPos[id]&&C.lastPos[id].kind)||h.kind||null,src:h.source??h.src??h.skill??null,amt:h.amount,crit:!!h.crit,killed,preFrames:pre.length,postFrames:post.length,baseW,peakW,baseB,peakB,baseL,peakL,baseMx,peakMx,peakAt:peakRow?peakRow.t-t:null,flash,num:dom.length>0,numAt:dom.length?dom[0].t-t:null,numAny:domAny,kb:+kb.toFixed(3),kbAt,r0:!!r0,snd,hs,shake});}
  const nonKill=out.filter(o=>!o.killed&&o.preFrames>0&&o.postFrames>0);const kills=out.filter(o=>o.killed);
  let baseJerk=[];{const seg=rows.filter(r=>r.nt);const killT=new Set(kills.map(k=>k.t));for(let i=2;i<seg.length;i++){const t=seg[i].t;let near=false;for(const k of killT)if(t>=k-1&&t<=k+14){near=true;break;}if(near)continue;const a=seg[i-2].cam,b=seg[i-1].cam,c=seg[i].cam;baseJerk.push(Math.hypot(c[0]-2*b[0]+a[0],c[2]-2*b[2]+a[2]));}}
  baseJerk.sort((a,b)=>a-b);const p95=baseJerk.length?baseJerk[Math.floor(baseJerk.length*0.95)]:null;
  return {tag:${JSON.stringify(tag)},hits:out.length,nonKillMeasurable:nonKill.length,nonKillFlash:nonKill.filter(o=>o.flash).length,kills:kills.length,killsWithShake:kills.filter(k=>k.shake!=null&&k.shake>0.012).length,killsWithHitstop:kills.filter(k=>k.hs.length).length,numerals:out.filter(o=>o.num).length,sounds:out.filter(o=>o.snd.includes('hit')).length,kbNonKill:nonKill.filter(o=>o.kb>=0.1).length,baseJerkP95:p95!=null?+p95.toFixed(5):null,rows:out}`));

const driveLoop = (ms, minHits, minSets) => ev(aiife(`const C=window.__c;const t0=performance.now();while(performance.now()-t0<${ms}){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');const p=E.state().party[0];if(p.hp<30)E.cmd('setHp',0,1);const n=C.ev.filter(e=>e.T==='hit'&&e.target>=4).length;if(n>=${minHits}&&C.sets.length>=${minSets})return {ok:true,tick:E.tick,hits:n,sets:C.sets.length,ms:Math.round(performance.now()-t0),fps:E.fps};await sleep(40);}return {ok:false,tick:E.tick,hits:C.ev.filter(e=>e.T==='hit'&&e.target>=4).length,sets:C.sets.length,fps:E.fps}`));
const dumpSets = ev(iife(`const C=window.__c;if(C.active){C.sets.push(C.active);C.active=null;}return {tag:'SETS',n:C.sets.length,sets:C.sets.map((s,i)=>({trial:i+1,id:s.id,kind:s.kind,hitTick:s.hitTick,amt:s.amt,killed:s.killed||null,frames:s.grabs.map(g=>[g.t,g.phase,g.W,g.B,g.mx,g.ghost?'ghost':''])}))}`));
const dumpSet = (i) => ev(iife(`const C=window.__c;const s=C.sets[${i}];if(!s)return {tag:'GRABS',trial:${i + 1},grabs:[]};return {tag:'GRABS',trial:${i + 1},id:s.id,kind:s.kind,hitTick:s.hitTick,amt:s.amt,killed:s.killed||null,grabs:s.grabs.map(g=>({t:g.t,fr:g.fr,phase:g.phase,box:g.box,L:g.L,S:g.S,W:g.W,B:g.B,mx:g.mx,ghost:g.ghost,url:g.url}))}`));

const files = {};
files['certC1-pxgrab'] = [
  armGrab, startRun, waitLive,
  ev(iife(`E.cmd('iframe',0,7200);return 'iframe '+E.tick`)),
  { type: 'mousemove', x: 800, y: 450 },
  driveLoop(80000, 20, 6),
  analyzeHits('natural'),
  dumpSets, dumpSet(0), dumpSet(1), dumpSet(2), dumpSet(3), dumpSet(4), dumpSet(5),
  errs, coverage, snap('pxgrab-end'),
];
for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
