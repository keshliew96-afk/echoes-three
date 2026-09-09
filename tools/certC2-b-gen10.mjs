// certC2-b-elems : G2 definitive — for every hit whose victim is an ENEMY,
// measure all four REFERENCE_BAR feedback elements on the SAME hit:
//   flash    = live WebGL canvas readback around the victim, every rendered frame
//   numeral  = per-frame scan of #dmg-num-layer, counting invisible->visible
//              transitions (pool nodes are REUSED, so a MutationObserver keyed on
//              text alone under-counts; this counts spawns)
//   knockback= victim displacement over t..t+10 + kbTicks from state()
//   sound    = `sound` events on t..t+2
// plus hitstop/dwell per hit. Moderate density (<=3 spawned boars) so the numeral
// pool cannot saturate. Ends with 480x360 canvas-region PNG triptychs (pre/flash/
// post) around non-killing MELEE hits, and flash-triggered harness screenshots.
import { writeFileSync, mkdirSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const mv = (x, y) => ({ type: 'mousemove', x, y });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const EVT = ['hit','death','hitstop','sound','ally_basic','ally_cast','enemy_spawn','screenshake','room_cleared','wave_start','hit_immune'];

const arm = ev(iife(`
  window.__c={ev:[],rows:[],num:[],frames:[],started:performance.now(),grabOn:false,hits:[],flashNow:false,shots:[]};
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));
  const cv=document.querySelector('canvas');window.__c.cv=cv;
  const layer=document.querySelector('#dmg-num-layer');window.__c.numLayer=!!layer;
  const numState=new WeakMap();
  window.__c.scanNums=()=>{if(!layer)return;const t=E.tick;
    for(const el of layer.querySelectorAll('.dmg-num')){const cs=getComputedStyle(el);
      const op=parseFloat(cs.opacity||'1');
      const vis=!(cs.display==='none'||cs.visibility==='hidden'||op<0.05||!el.textContent);
      const txt=el.textContent;const prev=numState.get(el);
      if(vis&&(!prev||!prev.vis||prev.txt!==txt)){const r=el.getBoundingClientRect();
        window.__c.num.push({t,txt,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),col:cs.color});}
      numState.set(el,{vis,txt});}
    if(window.__c.num.length>4000)window.__c.num.splice(0,1500);};
  const CW=64,CH=88;const off=document.createElement('canvas');off.width=CW;off.height=CH;const ctx=off.getContext('2d',{willReadFrequently:true});
  const BW=480,BH=360;const big=document.createElement('canvas');big.width=BW;big.height=BH;const bctx=big.getContext('2d',{willReadFrequently:true});
  const P=window.__arenaProbe;const cam=P.stage.camera;const V=P.root.position.constructor;
  window.__c.proj=(x,y,z)=>{const v=new V(x,y,z);v.project(cam);return [(v.x*0.5+0.5)*window.innerWidth,(-v.y*0.5+0.5)*window.innerHeight];};
  const stats=(d)=>{let w=0,sum=0,mx=0;const n=d.length/4;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];const Lm=0.299*r+0.587*g+0.114*b;const mxc=Math.max(r,g,b),mnc=Math.min(r,g,b);const S=mxc?(mxc-mnc)/mxc:0;sum+=Lm;if(Lm>mx)mx=Lm;if(Lm>230&&S<0.18)w++;}return {W:+(w/n).toFixed(3),L:+(sum/n).toFixed(1),mx:Math.round(mx)};};
  window.__c.series={};
  window.__c.bigGrab=(x,z)=>{const c=window.__c.proj(x,0.55,z);const bx=Math.max(0,Math.min(cv.width-BW,Math.round(c[0]-BW/2)));const by=Math.max(0,Math.min(cv.height-BH,Math.round(c[1]-BH/2)));
    bctx.clearRect(0,0,BW,BH);bctx.drawImage(cv,bx,by,BW,BH,0,0,BW,BH);return {box:[bx,by,BW,BH],url:big.toDataURL('image/png')};};
  window.__c.grabFrame=()=>{if(!window.__c.grabOn)return;const s=E.state();const t=E.tick;let any=false;
    for(const e of s.enemies){const c=window.__c.proj(e.x,0.55,e.z);const x=Math.round(c[0]-CW/2),y=Math.round(c[1]-CH/2);
      if(x<0||y<0||x+CW>cv.width||y+CH>cv.height)continue;
      ctx.clearRect(0,0,CW,CH);ctx.drawImage(cv,x,y,CW,CH,0,0,CW,CH);
      const st=stats(ctx.getImageData(0,0,CW,CH).data);
      if(st.W>0.25)any=true;
      const a=window.__c.series[e.id]||(window.__c.series[e.id]=[]);
      a.push({t,W:st.W,L:st.L,mx:st.mx,box:[x,y,CW,CH],ex:e.x,ez:e.z});if(a.length>24)a.shift();}
    window.__c.flashNow=any;
    // per-hit big-region triptych for the flagged hits
    for(const h of window.__c.hits){if(h.want&&h.big.length<3){const e=s.enemies.find(q=>q.id===h.tgt);if(e){const g=window.__c.bigGrab(e.x,e.z);h.big.push({t,box:g.box,url:g.url});}}}};
  let last=-1;
  const f=()=>{const now=performance.now()-window.__c.started;const t=E.tick;
    window.__c.frames.push([Math.round(now*10)/10,t]);if(window.__c.frames.length>90000)window.__c.frames.splice(0,30000);
    window.__c.scanNums();window.__c.grabFrame();
    if(t!==last){last=t;const s=E.state();const en={};for(const e of s.enemies)en[e.id]=[+e.x.toFixed(4),+e.z.toFixed(4),e.hp,e.kbTicks];window.__c.rows.push({t,en});
      if(window.__c.rows.length>26000)window.__c.rows.splice(0,9000);}
    requestAnimationFrame(f);};
  requestAnimationFrame(f);
  window.__c.dwell=(T)=>{const F=window.__c.frames;let i0=-1;for(let i=0;i<F.length;i++){if(F[i][1]===T){i0=i;break;}if(F[i][1]>T)return null;}
    if(i0<0)return null;let j=i0;while(j<F.length&&F[j][1]<=T)j++;if(j>=F.length)return null;return +(F[j][0]-F[i0][0]).toFixed(1);};
  E.on('hit',(h)=>{if(!window.__c.grabOn)return;if(h.target<4)return;
    const a=window.__c.series[h.target]||[];
    const pre=a.filter(r=>r.t<h.tick).slice(-3).map(r=>[r.t,r.W,r.L]);
    const rec={t:h.tick,tgt:h.target,src:h.source,atk:h.attacker,amt:h.amount,crit:h.crit,dirX:h.dirX,dirZ:h.dirZ,pre,post:[],need:7,
      box:a.length?a[a.length-1].box:null,big:[],want:false,preBig:null};
    window.__c.hits.push(rec);});
  const g=()=>{if(window.__c.grabOn){for(const hh of window.__c.hits){if(hh.need>0){const a=window.__c.series[hh.tgt]||[];const r=a[a.length-1];
      if(r&&(!hh.post.length||hh.post[hh.post.length-1][0]!==r.t)){hh.post.push([r.t,r.W,r.L]);hh.need--;}}}}
    requestAnimationFrame(g);};requestAnimationFrame(g);
  return 'armed t'+E.tick+' ver '+E.version+' numLayer '+window.__c.numLayer+' canvas '+cv.width+'x'+cv.height`));

const ARC = `const arcSkills=['heavy_slam','brutal_cleave','flurry','lunge_strike'];
  const isArc=(h)=>arcSkills.includes(h.src)||(/_basic$/.test(h.src||'')&&(h.atk===1||h.atk===2));`;

const chunk = (i0, i1) => ev(iife(`${ARC}
  const D=window.__c.ev.filter(e=>e.T==='death');const S=window.__c.ev.filter(e=>e.T==='sound');const HS=window.__c.ev.filter(e=>e.T==='hitstop');
  const rows=window.__c.rows;
  return window.__c.hits.slice(${i0},${i1}).map(h=>{
    const dead=D.some(d=>d.id===h.tgt&&Math.abs(d.tick-h.t)<=1);
    const cands=window.__c.num.filter(n=>n.t>=h.t-1&&n.t<=h.t+4);
    const exact=cands.find(n=>n.txt===String(h.amt)||n.txt===String(Math.round(h.amt)));
    const r0=rows.find(r=>r.t===h.t&&r.en[h.tgt]);let disp=0,along=0,kbT=0,firstT=null;
    if(r0){const p0=r0.en[h.tgt];for(const r of rows){if(r.t<=h.t||r.t>h.t+10)continue;const p=r.en[h.tgt];if(!p)continue;
      const dx=p[0]-p0[0],dz=p[1]-p0[1];const d=Math.hypot(dx,dz);if(d>disp)disp=d;if(d>0.05&&firstT===null)firstT=r.t-h.t;
      const al=dx*(h.dirX||0)+dz*(h.dirZ||0);if(al>along)along=al;if(p[3]>kbT)kbT=p[3];}}
    return {t:h.t,src:h.src,arc:isArc(h),amt:h.amt,dead,
      num:exact?exact.txt+'@'+exact.x+','+exact.y+' dt'+(exact.t-h.t):(cands.length?'ANY:'+cands.map(c=>c.txt).join(','):null),
      snd:S.filter(s=>s.tick>=h.t&&s.tick<=h.t+2).map(s=>s.slot).join('+')||null,
      kb:+disp.toFixed(3),along:+along.toFixed(3),kbTicks:kbT,kbAt:firstT,
      Wpre:h.pre.map(p=>p[1]).join('/'),Wpost:h.post.slice(0,5).map(p=>p[1]).join('/'),
      stop:(HS.find(s=>s.tick>=h.t&&s.tick<=h.t+2)||{}).cause||null,dwell:window.__c.dwell(h.t)};});`));

const acts = [
  arm,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick,ver:E.version,toggles:E.state().toggles}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<45000){const s=E.state();if(s.run.active&&s.run.combatActive&&s.enemies.length>0)return {ok:true,tick:E.tick,enemies:s.enemies.length,fps:E.fps};await sleep(8);}return {ok:false,tick:E.tick}`)),
  ev(iife(`E.cmd('iframe',0,30000);window.__c.grabOn=true;window.__c.start=E.tick;
    window.__c.pin=setInterval(()=>{try{for(const e of E.state().enemies)E.cmd('setHp',e.id,1);}catch(err){}},20);
    return {start:E.tick}`)),
  mv(800, 450),
  ev(aiife(`const t0=performance.now();let n=0;
    while(performance.now()-t0<70000){
      const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');
      const s=E.state();const tk=s.party[1],sw=s.party[2];
      for(let i=0;i<4;i++){const q=s.party[i];if(q&&q.maxHp&&(q.downed||q.hp<q.maxHp*0.45))E.cmd('setHp',i,1);}
      if(s.enemies.length<3){const a=(n%2===0?tk:sw)||tk;if(a)E.cmd('spawn','boar',a.x+0.45,a.z+0.25);}
      const e=s.enemies[0];
      if(e&&n%10===0){E.cmd('mark',e.id);E.cmd('teleport',e.x+1.1,e.z+0.5);}
      n++;await sleep(200);}
    return {end:E.tick,fps:E.fps,hits:window.__c.hits.length,enemies:E.state().enemies.length,deaths:window.__c.ev.filter(e=>e.T==='death').length,numSpawns:window.__c.num.length}`)),
  ev(iife(`${ARC}const D=window.__c.ev.filter(e=>e.T==='death');const dead=(h)=>D.some(d=>d.id===h.tgt&&Math.abs(d.tick-h.t)<=1);
    const src={};for(const h of window.__c.hits)src[h.src+(isArc(h)?'|ARC':'|ranged')+(dead(h)?'|KILL':'|nonkill')]=(src[h.src+(isArc(h)?'|ARC':'|ranged')+(dead(h)?'|KILL':'|nonkill')]||0)+1;
    return {hits:window.__c.hits.length,nonKill:window.__c.hits.filter(h=>!dead(h)).length,arcNonKill:window.__c.hits.filter(h=>isArc(h)&&!dead(h)).length,bySrc:src}`)),
  // ---- tally over ALL non-kill enemy hits ----
  ev(iife(`${ARC}const D=window.__c.ev.filter(e=>e.T==='death');const S=window.__c.ev.filter(e=>e.T==='sound');const rows=window.__c.rows;
    const per={num:0,exact:0,snd:0,kb:0,flash:0,all:0};const arc={n:0,num:0,snd:0,kb:0,flash:0,all:0};const fails=[];
    for(const h of window.__c.hits){const dead=D.some(d=>d.id===h.tgt&&Math.abs(d.tick-h.t)<=1);if(dead)continue;
      const cands=window.__c.num.filter(n=>n.t>=h.t-1&&n.t<=h.t+4);
      const exact=cands.some(n=>n.txt===String(h.amt)||n.txt===String(Math.round(h.amt)));
      const snd=S.some(s=>s.tick>=h.t&&s.tick<=h.t+2);
      const r0=rows.find(r=>r.t===h.t&&r.en[h.tgt]);let disp=0,kbT=0;
      if(r0){const p0=r0.en[h.tgt];for(const r of rows){if(r.t<=h.t||r.t>h.t+10)continue;const p=r.en[h.tgt];if(!p)continue;const d=Math.hypot(p[0]-p0[0],p[1]-p0[1]);if(d>disp)disp=d;if(p[3]>kbT)kbT=p[3];}}
      const flash=Math.max(0,...h.post.slice(0,4).map(p=>p[1]))>0.05;
      const kb=disp>0.05||kbT>0;const ok=exact&&snd&&kb&&flash;
      per.num++;if(exact)per.exact++;if(snd)per.snd++;if(kb)per.kb++;if(flash)per.flash++;if(ok)per.all++;
      if(isArc(h)){arc.n++;if(exact)arc.num++;if(snd)arc.snd++;if(kb)arc.kb++;if(flash)arc.flash++;if(ok)arc.all++;}
      if(!ok&&fails.length<14)fails.push({t:h.t,src:h.src,arc:isArc(h),exact,snd,kb:+disp.toFixed(3),kbT,W:Math.max(0,...h.post.slice(0,4).map(p=>p[1])),cands:cands.map(c=>c.txt+'@t'+c.t).join(' ')});}
    return {nonKillTotal:per.num,numeral:per.exact,sound:per.snd,knockback:per.kb,flash:per.flash,ALLFOUR:per.all,arcOnly:arc,fails}`)),
  chunk(0, 10), chunk(10, 20), chunk(20, 30), chunk(30, 42),
  // melee-only knockback table
  ev(iife(`${ARC}const D=window.__c.ev.filter(e=>e.T==='death');const rows=window.__c.rows;const out=[];
    for(const h of window.__c.hits){const dead=D.some(d=>d.id===h.tgt&&Math.abs(d.tick-h.t)<=1);if(dead||!isArc(h))continue;
      const r0=rows.find(r=>r.t===h.t&&r.en[h.tgt]);if(!r0)continue;const p0=r0.en[h.tgt];let disp=0,along=0,kbT=0,firstT=null;
      for(const r of rows){if(r.t<=h.t||r.t>h.t+10)continue;const p=r.en[h.tgt];if(!p)continue;const dx=p[0]-p0[0],dz=p[1]-p0[1];const d=Math.hypot(dx,dz);
        if(d>disp)disp=d;if(d>0.05&&firstT===null)firstT=r.t-h.t;const al=dx*(h.dirX||0)+dz*(h.dirZ||0);if(al>along)along=al;if(p[3]>kbT)kbT=p[3];}
      out.push([h.t,h.src,h.amt,+disp.toFixed(3),+along.toFixed(3),kbT,firstT]);}
    const v=out.map(o=>o[3]).sort((a,b)=>a-b);
    return {meleeNonKillN:out.length,dispMin:v[0],dispMedian:v[Math.floor(v.length/2)],dispMax:v[v.length-1],rows:out.slice(0,30)}`)),
  // ---- pixel triptychs around 4 non-kill MELEE hits ----
  ev(iife(`${ARC}window.__c.hits.length=0;window.__c.wantArc=true;
    E.on('hit',(h)=>{if(h.target<4)return;const rec=window.__c.hits[window.__c.hits.length-1];
      if(rec&&rec.t===h.tick&&rec.tgt===h.target){const arcish=isArc({src:h.source,atk:h.attacker});if(arcish&&window.__c.hits.filter(q=>q.want).length<4)rec.want=true;}});
    return 'triptych arm t'+E.tick`)),
  ev(aiife(`await sleep(12000);return {hits:window.__c.hits.length,wanted:window.__c.hits.filter(h=>h.want).length,withBig:window.__c.hits.filter(h=>h.big.length>=2).length}`)),
  ...[0,1,2,3].map(i => ev(iife(`${ARC}const D=window.__c.ev.filter(e=>e.T==='death');
    const w=window.__c.hits.filter(h=>h.want&&h.big.length>=2)[${i}];if(!w)return {set:${i},none:true};
    const dead=D.some(d=>d.id===w.tgt&&Math.abs(d.tick-w.t)<=1);
    return JSON.stringify({set:${i},t:w.t,src:w.src,amt:w.amt,tgt:w.tgt,dead,arc:isArc(w),pre:w.pre,post:w.post.slice(0,5),crop64:w.box,frames:w.big.map(b=>({t:b.t,box:b.box,url:b.url}))})`))),
  // ---- flash-triggered harness screenshots ----
  ...[0,1,2,3,4,5].flatMap((i) => [
    { type: 'loop', cond: '(()=>{try{return !window.__c.flashNow}catch(e){return true}})()', maxMs: 12000, body: [wait(2)], label: `flash${i}` },
    shot(`certC2-b-flash${i}`),
    ev(iife(`const s=E.state();const t=E.tick;
      const ens=s.enemies.map(e=>{const c=window.__c.proj(e.x,0.55,e.z);const a=window.__c.series[e.id]||[];
        return {id:e.id,kind:e.kind,box:[Math.round(c[0]-32),Math.round(c[1]-44),64,88],W:a.slice(-4).map(r=>r.t+':'+r.W).join(' ')};});
      const nums=window.__c.num.filter(n=>n.t>=t-30).slice(-4).map(n=>n.txt+'@'+n.x+','+n.y+' t'+n.t);
      const hits=window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=t-20).map(h=>[h.tick,h.target,h.source,h.amount]);
      return {flashShot:${i},tick:t,enemies:ens,numerals:nums,hitsLast20:hits}`)),
  ]),
  ev(iife(`clearInterval(window.__c.pin);window.__c.grabOn=false;const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;
    return {totals:m,tick:E.tick,fps:E.fps,ver:E.version,numSpawns:window.__c.num.length}`)),
];
mkdirSync('tools/actions', { recursive: true });
writeFileSync('tools/actions/certC2-b-elems.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certC2-b-elems.json', acts.length);
