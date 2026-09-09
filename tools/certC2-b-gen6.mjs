// certC2-b-hits : G2 — >= 20 NON-KILLING hits, each checked for all four
// REFERENCE_BAR feedback elements (flash + damage number + knockback + sound),
// melee-arc connects included (the audit found non-kill MELEE knockback was
// never measured). Enemy HP is pinned to full every 20 ms so hits do not kill;
// the party is repeatedly parked on top of a marked enemy so the Tank and
// Swordsman actually swing their arcs. Flash is read back from the live WebGL
// canvas on EVERY rendered frame for EVERY enemy. Ends with 8 full-frame
// harness screenshots (certC2-b-seq0..7) plus the projected enemy boxes so the
// flash can be pointed at in real PNG pixels.
import { writeFileSync, mkdirSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const mv = (x, y) => ({ type: 'mousemove', x, y });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const EVT = ['hit','death','hitstop','sound','ally_basic','ally_cast','enemy_spawn','screenshake','room_cleared','wave_start','hit_immune','knockback','flash'];

const arm = ev(iife(`
  window.__c={ev:[],rows:[],dom:[],frames:[],started:performance.now(),grabOn:false,hits:[],saved:[]};
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));
  const L=document.querySelector('#dmg-num-layer');window.__c.numLayer=!!L;const lastKey=new WeakMap();
  if(L){const mo=new MutationObserver(muts=>{const t=E.tick;const seen=new Set();for(const m of muts){const n=m.target.nodeType===3?m.target.parentElement:m.target;const el=n&&n.closest?n.closest('.dmg-num'):null;if(!el||seen.has(el))continue;seen.add(el);const cs=getComputedStyle(el);const vis=!(cs.display==='none'||cs.opacity==='0'||cs.visibility==='hidden'||!el.textContent);const k=el.textContent+'|'+vis;if(lastKey.get(el)===k)continue;lastKey.set(el,k);if(!vis)continue;const r=el.getBoundingClientRect();window.__c.dom.push({t,txt:el.textContent,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),col:cs.color});}});mo.observe(L,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});}
  // canvas flash sampler
  const cv=document.querySelector('canvas');window.__c.cv=cv;
  const CW=64,CH=88;const off=document.createElement('canvas');off.width=CW;off.height=CH;const ctx=off.getContext('2d',{willReadFrequently:true});
  const P=window.__arenaProbe;const cam=P.stage.camera;const V=P.root.position.constructor;
  window.__c.proj=(x,y,z)=>{const v=new V(x,y,z);v.project(cam);return [(v.x*0.5+0.5)*window.innerWidth,(-v.y*0.5+0.5)*window.innerHeight];};
  const stats=(d)=>{let w=0,sum=0,mx=0;const n=d.length/4;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];const Lm=0.299*r+0.587*g+0.114*b;const mxc=Math.max(r,g,b),mnc=Math.min(r,g,b);const S=mxc?(mxc-mnc)/mxc:0;sum+=Lm;if(Lm>mx)mx=Lm;if(Lm>230&&S<0.18)w++;}return {W:+(w/n).toFixed(3),L:+(sum/n).toFixed(1),mx:Math.round(mx)};};
  window.__c.series={};   // enemyId -> [{t,W,L,mx,box}] rolling
  window.__c.grabFrame=()=>{if(!window.__c.grabOn)return;const s=E.state();const t=E.tick;
    for(const e of s.enemies){const c=window.__c.proj(e.x,0.55,e.z);const x=Math.round(c[0]-CW/2),y=Math.round(c[1]-CH/2);
      if(x<0||y<0||x+CW>cv.width||y+CH>cv.height)continue;
      ctx.clearRect(0,0,CW,CH);ctx.drawImage(cv,x,y,CW,CH,0,0,CW,CH);
      const st=stats(ctx.getImageData(0,0,CW,CH).data);
      const a=window.__c.series[e.id]||(window.__c.series[e.id]=[]);
      a.push({t,W:st.W,L:st.L,mx:st.mx,box:[x,y,CW,CH],url:(window.__c.saveNext&&window.__c.saveNext[e.id])?off.toDataURL('image/png'):null});
      if(a.length>26)a.shift();}};
  let last=-1;
  const f=()=>{const now=performance.now()-window.__c.started;const t=E.tick;
    window.__c.frames.push([Math.round(now*10)/10,t]);if(window.__c.frames.length>90000)window.__c.frames.splice(0,30000);
    window.__c.grabFrame();
    if(t!==last){last=t;const s=E.state();const en={};for(const e of s.enemies)en[e.id]=[+e.x.toFixed(4),+e.z.toFixed(4),e.hp,e.kbTicks];
      window.__c.rows.push({t,en,num:(s.vfx&&(s.vfx.numerals??(s.vfx.arena&&s.vfx.arena.numerals)))??null});
      if(window.__c.rows.length>26000)window.__c.rows.splice(0,9000);}
    requestAnimationFrame(f);};
  requestAnimationFrame(f);
  window.__c.dwell=(T)=>{const F=window.__c.frames;let i0=-1;for(let i=0;i<F.length;i++){if(F[i][1]===T){i0=i;break;}if(F[i][1]>T)return null;}
    if(i0<0)return null;let j=i0;while(j<F.length&&F[j][1]<=T)j++;if(j>=F.length)return null;return +(F[j][0]-F[i0][0]).toFixed(1);};
  // freeze a flash window per hit: keep 3 pre-frames and collect 6 post-frames
  E.on('hit',(h)=>{if(!window.__c.grabOn)return;if(h.attacker===undefined)return;
    const a=window.__c.series[h.target]||[];const pre=a.filter(r=>r.t<h.tick).slice(-3).map(r=>[r.t,r.W,r.L,r.mx]);
    window.__c.hits.push({t:h.tick,tgt:h.target,src:h.source,atk:h.attacker,amt:h.amount,crit:h.crit,kb:h.kb,dirX:h.dirX,dirZ:h.dirZ,pre,post:[],need:7,box:a.length?a[a.length-1].box:null});});
  // post-frame collector
  const g=()=>{if(window.__c.grabOn){for(const hh of window.__c.hits){if(hh.need>0){const a=window.__c.series[hh.tgt]||[];const r=a[a.length-1];
    if(r&&(!hh.post.length||hh.post[hh.post.length-1][0]!==r.t)){hh.post.push([r.t,r.W,r.L,r.mx]);hh.need--;if(r.url&&hh.urls===undefined)hh.urls=[];if(r.url&&hh.urls)hh.urls.push([r.t,r.url]);}}}}
    requestAnimationFrame(g);};requestAnimationFrame(g);
  return 'armed t'+E.tick+' ver '+E.version+' numLayer '+window.__c.numLayer+' canvas '+cv.width+'x'+cv.height`));

const ARC = `const arcSkills=['heavy_slam','brutal_cleave','flurry','lunge_strike'];
  const isArc=(h)=>arcSkills.includes(h.src||h.source)||(/_basic$/.test(h.src||h.source||'')&&((h.atk!==undefined?h.atk:h.attacker)===1||(h.atk!==undefined?h.atk:h.attacker)===2));`;

// per-hit verdict builder (chunked so console lines stay readable)
const hitChunk = (i0, i1) => ev(iife(`${ARC}
  const D=window.__c.ev.filter(e=>e.T==='death');const S=window.__c.ev.filter(e=>e.T==='sound');const HS=window.__c.ev.filter(e=>e.T==='hitstop');
  const rows=window.__c.rows;
  const out=window.__c.hits.slice(${i0},${i1}).map(h=>{
    const dead=D.some(d=>d.id===h.tgt&&Math.abs(d.tick-h.t)<=1);
    const num=window.__c.dom.filter(d=>d.t>=h.t-1&&d.t<=h.t+3&&d.txt===String(h.amt))[0]||null;
    const snd=S.filter(s=>s.tick>=h.t&&s.tick<=h.t+2).map(s=>s.slot);
    const r0=rows.find(r=>r.t===h.t&&r.en[h.tgt]);
    let disp=null,along=null,kbT=null;
    if(r0){const p0=r0.en[h.tgt];let best=0,bestAlong=0,mkb=0;
      for(const r of rows){if(r.t<=h.t||r.t>h.t+10)continue;const p=r.en[h.tgt];if(!p)continue;
        const dx=p[0]-p0[0],dz=p[1]-p0[1];const d=Math.hypot(dx,dz);if(d>best)best=d;
        const al=dx*(h.dirX||0)+dz*(h.dirZ||0);if(al>bestAlong)bestAlong=al;if(p[3]>mkb)mkb=p[3];}
      disp=+best.toFixed(3);along=+bestAlong.toFixed(3);kbT=mkb;}
    const wpre=h.pre.map(p=>p[1]);const wpost=h.post.map(p=>p[1]);
    const flashW=Math.max(0,...wpost.slice(0,4));
    return {t:h.t,src:h.src,arc:isArc(h),atk:h.atk,tgt:h.tgt,amt:h.amt,dead,
      num:num?num.txt+'@'+num.x+','+num.y+' dt'+(num.t-h.t):null,snd:snd.join('+')||null,
      kb:disp,along,kbTicks:kbT,Wpre:Math.max(0,...wpre).toFixed(3),Wflash:flashW.toFixed(3),
      pre:h.pre.map(p=>p[0]+':'+p[1]).join(' '),post:h.post.map(p=>p[0]+':'+p[1]).join(' '),
      stop:(HS.find(s=>s.tick>=h.t&&s.tick<=h.t+2)||{}).cause||null,dwell:window.__c.dwell(h.t)};});
  return out`));

const acts = [
  arm,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick,ver:E.version}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<45000){const s=E.state();if(s.run.active&&s.run.combatActive&&s.enemies.length>0)return {ok:true,tick:E.tick,enemies:s.enemies.length,fps:E.fps};await sleep(8);}return {ok:false,tick:E.tick}`)),
  ev(iife(`E.cmd('iframe',0,30000);window.__c.grabOn=true;window.__c.start=E.tick;
    window.__c.pin=setInterval(()=>{try{for(const e of E.state().enemies)E.cmd('setHp',e.id,1);}catch(err){}},20);
    return {start:E.tick,grabOn:true}`)),
  mv(800, 450),
  // 75 s: keep a marked enemy under the party so melee arcs connect; top the player up
  ev(aiife(`const t0=performance.now();let n=0;
    while(performance.now()-t0<75000){
      const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');
      const s=E.state();const p=s.party[0];
      if(p.hp<70)E.cmd('setHp',0,1);
      if(s.enemies.length<3){const t=s.party[1];if(t)E.cmd('spawn','boar',t.x+0.6,t.z+0.2);const w=s.party[2];if(w)E.cmd('spawn','boar',w.x+0.5,w.z-0.3);}
      const e=s.enemies[0];
      if(e&&n%4===0){E.cmd('mark',e.id);E.cmd('teleport',e.x+0.8,e.z+0.2);E.cmd('rally');}
      n++;await sleep(250);}
    return {end:E.tick,fps:E.fps,hits:window.__c.hits.length,enemies:E.state().enemies.length,deaths:window.__c.ev.filter(e=>e.T==='death').length}`)),
  ev(iife(`${ARC}const H=window.__c.hits;const D=window.__c.ev.filter(e=>e.T==='death');
    const dead=(h)=>D.some(d=>d.id===h.tgt&&Math.abs(d.tick-h.t)<=1);
    const src={};for(const h of H)src[h.src+'|atk'+h.atk+(isArc(h)?'|ARC':'|ranged')+(dead(h)?'|KILL':'|nonkill')]=(src[h.src+'|atk'+h.atk+(isArc(h)?'|ARC':'|ranged')+(dead(h)?'|KILL':'|nonkill')]||0)+1;
    return {totalHits:H.length,nonKill:H.filter(h=>!dead(h)).length,arcNonKill:H.filter(h=>isArc(h)&&!dead(h)).length,bySrc:src,deaths:D.length}`)),
  hitChunk(0, 10), hitChunk(10, 20), hitChunk(20, 30), hitChunk(30, 40), hitChunk(40, 52), hitChunk(52, 64),
  // ---- tally ----
  ev(iife(`${ARC}const D=window.__c.ev.filter(e=>e.T==='death');const S=window.__c.ev.filter(e=>e.T==='sound');
    const rows=window.__c.rows;let all=0,nk=0,arcnk=0;const fails=[];const per={num:0,snd:0,kb:0,flash:0};
    const res=[];
    for(const h of window.__c.hits){const dead=D.some(d=>d.id===h.tgt&&Math.abs(d.tick-h.t)<=1);
      const num=window.__c.dom.some(d=>d.t>=h.t-1&&d.t<=h.t+3&&d.txt===String(h.amt));
      const snd=S.some(s=>s.tick>=h.t&&s.tick<=h.t+2);
      const r0=rows.find(r=>r.t===h.t&&r.en[h.tgt]);let disp=0,mkb=0;
      if(r0){const p0=r0.en[h.tgt];for(const r of rows){if(r.t<=h.t||r.t>h.t+10)continue;const p=r.en[h.tgt];if(!p)continue;const d=Math.hypot(p[0]-p0[0],p[1]-p0[1]);if(d>disp)disp=d;if(p[3]>mkb)mkb=p[3];}}
      const flash=Math.max(0,...h.post.slice(0,4).map(p=>p[1]))>0.05;
      const ok={num,snd,kb:disp>0.05||mkb>0,flash};
      res.push({t:h.t,src:h.src,arc:isArc(h),dead,ok});
      if(!dead){nk++;if(isArc(h))arcnk++;if(num)per.num++;if(snd)per.snd++;if(ok.kb)per.kb++;if(ok.flash)per.flash++;
        if(!(num&&snd&&ok.kb&&ok.flash))fails.push({t:h.t,src:h.src,arc:isArc(h),ok,disp:+disp.toFixed(3),kbTicks:mkb,W:Math.max(0,...h.post.slice(0,4).map(p=>p[1]))});}
      all++;}
    return {allHits:all,nonKillHits:nk,arcNonKill:arcnk,nonKillWith:per,nonKillAllFour:nk-fails.length,fails:fails.slice(0,12)}`)),
  ev(iife(`${ARC}const D=window.__c.ev.filter(e=>e.T==='death');const rows=window.__c.rows;
    const out=[];for(const h of window.__c.hits){const dead=D.some(d=>d.id===h.tgt&&Math.abs(d.tick-h.t)<=1);if(dead||!isArc(h))continue;
      const r0=rows.find(r=>r.t===h.t&&r.en[h.tgt]);if(!r0)continue;const p0=r0.en[h.tgt];let disp=0,along=0,mkb=0,atT=null;
      for(const r of rows){if(r.t<=h.t||r.t>h.t+10)continue;const p=r.en[h.tgt];if(!p)continue;const dx=p[0]-p0[0],dz=p[1]-p0[1];const d=Math.hypot(dx,dz);if(d>disp){disp=d;if(atT===null&&d>0.05)atT=r.t;}const al=dx*(h.dirX||0)+dz*(h.dirZ||0);if(al>along)along=al;if(p[3]>mkb)mkb=p[3];}
      out.push([h.t,h.src,h.amt,+disp.toFixed(3),+along.toFixed(3),mkb,atT,h.kb]);}
    return {meleeNonKillKnockback:out}`)),
  // ---- save PNG crops for a few non-kill melee hits ----
  ev(iife(`window.__c.saveNext={};const s=E.state();for(const e of s.enemies)window.__c.saveNext[e.id]=true;return {saving:Object.keys(window.__c.saveNext)}`)),
  ev(aiife(`window.__c.hits.length=0;await sleep(6000);return {captured:window.__c.hits.length,withUrls:window.__c.hits.filter(h=>h.urls&&h.urls.length).length}`)),
  ...[0,1,2,3].map(i => ev(iife(`const h=window.__c.hits.filter(q=>q.urls&&q.urls.length>=3)[${i}];if(!h)return {set:${i},none:true};
    const D=window.__c.ev.filter(e=>e.T==='death');const dead=D.some(d=>d.id===h.tgt&&Math.abs(d.tick-h.t)<=1);
    return JSON.stringify({set:${i},t:h.t,src:h.src,amt:h.amt,tgt:h.tgt,dead,box:h.box,pre:h.pre,post:h.post,frames:h.urls.slice(0,5).map(u=>({t:u[0],url:u[1]}))})`))),
  ev(iife(`window.__c.saveNext={};return 'saving off'`)),
  // ---- 8-frame harness seq: real PNGs during the dense pinned brawl ----
  ev(iife(`window.__c.seq=[];return 'seq start t'+E.tick`)),
  ...[0,1,2,3,4,5,6,7].flatMap((i) => [
    shot(`certC2-b-seq${i}`),
    ev(iife(`const s=E.state();const t=E.tick;
      const ens=s.enemies.map(e=>{const c=window.__c.proj(e.x,0.55,e.z);const a=window.__c.series[e.id]||[];const last=a.slice(-3).map(r=>r.t+':'+r.W);
        return {id:e.id,kind:e.kind,hp:e.hp,w:[+e.x.toFixed(2),+e.z.toFixed(2)],box:[Math.round(c[0]-32),Math.round(c[1]-44),64,88],recentW:last.join(' ')};});
      const rec=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=t-12).map(h=>[h.tick,h.target,h.source,h.amount]);
      const nums=window.__c.dom.filter(d=>d.t>=t-40).slice(-4).map(d=>d.txt+'@'+d.x+','+d.y+' t'+d.t);
      return {seq:${i},tick:t,enemies:ens,hitsLast12:rec,numerals:nums};`)),
    wait(100),
  ]),
  ev(iife(`clearInterval(window.__c.pin);window.__c.grabOn=false;const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;
    return {totals:m,tick:E.tick,fps:E.fps,ver:E.version}`)),
];
mkdirSync('tools/actions', { recursive: true });
writeFileSync('tools/actions/certC2-b-hits.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certC2-b-hits.json', acts.length);
