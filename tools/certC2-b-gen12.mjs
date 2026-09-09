// certC2-b-elems2 : final G2 capture.
//  - background keeper (pin enemy HP, keep 2-3 boars alive next to the melee
//    allies, revive downed allies) runs for the WHOLE capture, shots included
//  - numeral: per-frame invisible->visible scan of #dmg-num-layer + GREEDY 1:1
//    assignment to hits over [t-2,t+15] (a numeral can satisfy only one hit) and
//    the observed numeral latency distribution, PLUS state().vfx numeral counter
//  - flash: per-frame canvas readback; a hit with no in-bounds crop frames is
//    reported as nodata, never silently as a failure
//  - 480x360 canvas-region PNG triptychs (pre / flash / post) around non-killing
//    MELEE hits, and flash-triggered harness screenshots
import { writeFileSync, mkdirSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const mv = (x, y) => ({ type: 'mousemove', x, y });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const EVT = ['hit','death','hitstop','sound','ally_basic','ally_cast','enemy_spawn','screenshake','room_cleared','wave_start'];

const arm = ev(iife(`
  window.__c={ev:[],rows:[],num:[],frames:[],started:performance.now(),grabOn:false,bigOn:false,hits:[],flashNow:false};
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));
  const cv=document.querySelector('canvas');const layer=document.querySelector('#dmg-num-layer');
  window.__c.numLayer=!!layer;
  const numState=new WeakMap();
  window.__c.scanNums=()=>{if(!layer)return;const t=E.tick;
    for(const el of layer.querySelectorAll('.dmg-num')){const cs=getComputedStyle(el);const op=parseFloat(cs.opacity||'1');
      const vis=!(cs.display==='none'||cs.visibility==='hidden'||op<0.05||!el.textContent);const txt=el.textContent;const prev=numState.get(el);
      if(vis&&(!prev||!prev.vis||prev.txt!==txt)){const r=el.getBoundingClientRect();
        window.__c.num.push({t,txt,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),col:cs.color,used:false});}
      numState.set(el,{vis,txt});}};
  const CW=64,CH=88;const off=document.createElement('canvas');off.width=CW;off.height=CH;const ctx=off.getContext('2d',{willReadFrequently:true});
  const BW=480,BH=360;const big=document.createElement('canvas');big.width=BW;big.height=BH;const bctx=big.getContext('2d',{willReadFrequently:true});
  const P=window.__arenaProbe;const cam=P.stage.camera;const V=P.root.position.constructor;
  window.__c.proj=(x,y,z)=>{const v=new V(x,y,z);v.project(cam);return [(v.x*0.5+0.5)*window.innerWidth,(-v.y*0.5+0.5)*window.innerHeight];};
  const stats=(d)=>{let w=0,sum=0,mx=0;const n=d.length/4;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];const Lm=0.299*r+0.587*g+0.114*b;const mxc=Math.max(r,g,b),mnc=Math.min(r,g,b);const S=mxc?(mxc-mnc)/mxc:0;sum+=Lm;if(Lm>mx)mx=Lm;if(Lm>230&&S<0.18)w++;}return {W:+(w/n).toFixed(3),L:+(sum/n).toFixed(1),mx:Math.round(mx)};};
  window.__c.series={};window.__c.bigBuf={};
  window.__c.grabFrame=()=>{if(!window.__c.grabOn)return;const s=E.state();const t=E.tick;let any=false;
    for(const e of s.enemies){const c=window.__c.proj(e.x,0.55,e.z);const x=Math.round(c[0]-CW/2),y=Math.round(c[1]-CH/2);
      if(x<0||y<0||x+CW>cv.width||y+CH>cv.height)continue;
      ctx.clearRect(0,0,CW,CH);ctx.drawImage(cv,x,y,CW,CH,0,0,CW,CH);
      const st=stats(ctx.getImageData(0,0,CW,CH).data);if(st.W>0.25)any=true;
      const a=window.__c.series[e.id]||(window.__c.series[e.id]=[]);a.push({t,W:st.W,L:st.L,mx:st.mx,box:[x,y,CW,CH]});if(a.length>24)a.shift();
      if(window.__c.bigOn){const cc=window.__c.proj(e.x,0.55,e.z);
        const bx=Math.max(0,Math.min(cv.width-BW,Math.round(cc[0]-BW/2))),by=Math.max(0,Math.min(cv.height-BH,Math.round(cc[1]-BH/2)));
        bctx.clearRect(0,0,BW,BH);bctx.drawImage(cv,bx,by,BW,BH,0,0,BW,BH);
        const b=window.__c.bigBuf[e.id]||(window.__c.bigBuf[e.id]=[]);b.push({t,box:[bx,by,BW,BH],W:st.W,url:big.toDataURL('image/png')});if(b.length>3)b.shift();}}
    window.__c.flashNow=any;
    for(const h of window.__c.hits){if(h.want&&h.bigPost.length<3){const b=window.__c.bigBuf[h.tgt];const r=b&&b[b.length-1];
      if(r&&r.t>=h.t&&(!h.bigPost.length||h.bigPost[h.bigPost.length-1].t!==r.t))h.bigPost.push(r);}}};
  let last=-1;
  const f=()=>{const now=performance.now()-window.__c.started;const t=E.tick;
    window.__c.frames.push([Math.round(now*10)/10,t]);if(window.__c.frames.length>90000)window.__c.frames.splice(0,30000);
    window.__c.scanNums();window.__c.grabFrame();
    if(t!==last){last=t;const s=E.state();const en={};for(const e of s.enemies)en[e.id]=[+e.x.toFixed(4),+e.z.toFixed(4),e.hp,e.kbTicks];
      const v=s.vfx||{};const nc=(v.numerals!==undefined?v.numerals:(v.arena&&v.arena.numerals!==undefined?v.arena.numerals:null));
      window.__c.rows.push({t,en,nc});if(window.__c.rows.length>26000)window.__c.rows.splice(0,9000);}
    requestAnimationFrame(f);};
  requestAnimationFrame(f);
  window.__c.dwell=(T)=>{const F=window.__c.frames;let i0=-1;for(let i=0;i<F.length;i++){if(F[i][1]===T){i0=i;break;}if(F[i][1]>T)return null;}
    if(i0<0)return null;let j=i0;while(j<F.length&&F[j][1]<=T)j++;if(j>=F.length)return null;return +(F[j][0]-F[i0][0]).toFixed(1);};
  E.on('hit',(h)=>{if(!window.__c.grabOn)return;if(h.target<4)return;
    const a=window.__c.series[h.target]||[];const bb=window.__c.bigBuf[h.target]||[];
    window.__c.hits.push({t:h.tick,tgt:h.target,src:h.source,atk:h.attacker,amt:h.amount,crit:h.crit,dirX:h.dirX,dirZ:h.dirZ,
      pre:a.filter(r=>r.t<h.tick).slice(-3).map(r=>[r.t,r.W,r.L]),post:[],need:7,box:a.length?a[a.length-1].box:null,
      want:window.__c.bigOn,bigPre:bb.length?bb[bb.length-1]:null,bigPost:[]});});
  const g=()=>{if(window.__c.grabOn){for(const hh of window.__c.hits){if(hh.need>0){const a=window.__c.series[hh.tgt]||[];const r=a[a.length-1];
      if(r&&r.t>=hh.t&&(!hh.post.length||hh.post[hh.post.length-1][0]!==r.t)){hh.post.push([r.t,r.W,r.L]);hh.need--;}}}}
    requestAnimationFrame(g);};requestAnimationFrame(g);
  return 'armed t'+E.tick+' ver '+E.version+' numLayer '+window.__c.numLayer+' canvas '+cv.width+'x'+cv.height`));

const ARC = `const arcSkills=['heavy_slam','brutal_cleave','flurry','lunge_strike'];
  const isArc=(h)=>arcSkills.includes(h.src)||(/_basic$/.test(h.src||'')&&(h.atk===1||h.atk===2));`;

// greedy 1:1 numeral assignment + full per-hit verdicts
const ANALYSE = `${ARC}
  const D=window.__c.ev.filter(e=>e.T==='death');const S=window.__c.ev.filter(e=>e.T==='sound');const HS=window.__c.ev.filter(e=>e.T==='hitstop');
  const rows=window.__c.rows;const nums=window.__c.num;for(const n of nums)n.used=false;
  const dead=(h)=>D.some(d=>d.id===h.tgt&&Math.abs(d.tick-h.t)<=1);
  const verdicts=[];
  for(const h of window.__c.hits.slice().sort((a,b)=>a.t-b.t)){
    const want=[String(h.amt),String(Math.round(h.amt))];
    let pick=null;
    for(const n of nums){if(n.used)continue;if(n.t<h.t-2||n.t>h.t+15)continue;if(want.indexOf(n.txt)<0)continue;pick=n;break;}
    if(pick)pick.used=true;
    const snd=S.filter(s=>s.tick>=h.t&&s.tick<=h.t+2).map(s=>s.slot);
    const r0=rows.find(r=>r.t===h.t&&r.en[h.tgt]);let disp=0,along=0,kbT=0,kbAt=null;
    if(r0){const p0=r0.en[h.tgt];for(const r of rows){if(r.t<=h.t||r.t>h.t+10)continue;const p=r.en[h.tgt];if(!p)continue;
      const dx=p[0]-p0[0],dz=p[1]-p0[1];const d=Math.hypot(dx,dz);if(d>disp)disp=d;if(d>0.05&&kbAt===null)kbAt=r.t-h.t;
      const al=dx*(h.dirX||0)+dz*(h.dirZ||0);if(al>along)along=al;if(p[3]>kbT)kbT=p[3];}}
    const fr=h.post.filter(p=>p[0]>=h.t&&p[0]<=h.t+5);
    const flashW=fr.length?Math.max(...fr.map(p=>p[1])):null;
    const ncA=(rows.find(r=>r.t===h.t-1)||{}).nc, ncB=Math.max(...rows.filter(r=>r.t>=h.t&&r.t<=h.t+3).map(r=>r.nc===null||r.nc===undefined?-1:r.nc),-1);
    verdicts.push({t:h.t,src:h.src,arc:isArc(h),amt:h.amt,dead:dead(h),
      num:pick?{txt:pick.txt,x:pick.x,y:pick.y,dt:pick.t-h.t}:null,
      snd:snd.join('+')||null,kb:+disp.toFixed(3),along:+along.toFixed(3),kbTicks:kbT,kbAt,
      flashW,fl:fr.length,ncPre:ncA===undefined?null:ncA,ncPost:ncB<0?null:ncB,
      stop:(HS.find(s=>s.tick>=h.t&&s.tick<=h.t+2)||{}).cause||null,dwell:window.__c.dwell(h.t)});}
  window.__c.verdicts=verdicts;`;

const acts = [
  arm,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick,ver:E.version}`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<45000){const s=E.state();if(s.run.active&&s.run.combatActive&&s.enemies.length>0)return {ok:true,tick:E.tick,enemies:s.enemies.length,fps:E.fps};await sleep(8);}return {ok:false,tick:E.tick}`)),
  // persistent keeper: pin enemy HP, keep 2-3 boars by the melee allies, revive allies
  ev(iife(`E.cmd('iframe',0,60000);window.__c.grabOn=true;window.__c.start=E.tick;window.__c.k=0;
    window.__c.pin=setInterval(()=>{try{for(const e of E.state().enemies)E.cmd('setHp',e.id,1);}catch(err){}},20);
    window.__c.keep=setInterval(()=>{try{const s=E.state();const tk=s.party[1],sw=s.party[2];
      for(let i=0;i<4;i++){const q=s.party[i];if(q&&q.maxHp&&(q.downed||q.hp<q.maxHp*0.45))E.cmd('setHp',i,1);}
      if(s.enemies.length<3){const a=(window.__c.k%2===0?tk:sw)||tk;if(a)E.cmd('spawn','boar',a.x+0.45,a.z+0.25);}
      const e=s.enemies[0];if(e&&window.__c.k%10===0){E.cmd('mark',e.id);E.cmd('teleport',e.x+1.1,e.z+0.5);}
      const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');
      window.__c.k++;}catch(err){window.__c.kerr=String(err)}},200);
    return {start:E.tick,vfxNumeralField:(()=>{const v=E.state().vfx||{};return {top:v.numerals,arena:v.arena&&v.arena.numerals,keys:Object.keys(v).slice(0,14)};})()}`)),
  mv(800, 450),
  ev(aiife(`await sleep(26000);return {end:E.tick,fps:E.fps,hits:window.__c.hits.length,numSpawns:window.__c.num.length,deaths:window.__c.ev.filter(e=>e.T==='death').length,kerr:window.__c.kerr||null}`)),
  ev(iife(`${ANALYSE}
    const nk=window.__c.verdicts.filter(v=>!v.dead);
    const has=(v)=>({num:!!v.num,snd:!!v.snd,kb:(v.kb>0.05||v.kbTicks>0),flash:v.flashW!==null&&v.flashW>0.05,nodata:v.fl===0});
    const tally={n:nk.length,num:0,snd:0,kb:0,flash:0,nodata:0,all:0};
    const arcT={n:0,num:0,snd:0,kb:0,flash:0,nodata:0,all:0};
    for(const v of nk){const h=has(v);if(h.num)tally.num++;if(h.snd)tally.snd++;if(h.kb)tally.kb++;if(h.flash)tally.flash++;if(h.nodata)tally.nodata++;
      const all=h.num&&h.snd&&h.kb&&h.flash;if(all)tally.all++;
      if(v.arc){arcT.n++;if(h.num)arcT.num++;if(h.snd)arcT.snd++;if(h.kb)arcT.kb++;if(h.flash)arcT.flash++;if(h.nodata)arcT.nodata++;if(all)arcT.all++;}}
    const lat={};for(const v of nk)if(v.num)lat[v.num.dt]=(lat[v.num.dt]||0)+1;
    return {nonKillEnemyHits:tally,meleeArcOnly:arcT,numeralLatencyHistogram:lat,totalNumeralSpawns:window.__c.num.length,hitsAll:window.__c.verdicts.length}`)),
  ev(iife(`const nk=window.__c.verdicts.filter(v=>!v.dead);
    const bad=nk.filter(v=>!(v.num&&v.snd&&(v.kb>0.05||v.kbTicks>0)&&v.flashW!==null&&v.flashW>0.05));
    return {failing:bad.length,rows:bad.slice(0,16).map(v=>({t:v.t,src:v.src,arc:v.arc,amt:v.amt,num:v.num,snd:v.snd,kb:v.kb,kbT:v.kbTicks,flashW:v.flashW,frames:v.fl}))}`)),
  ev(iife(`const nk=window.__c.verdicts.filter(v=>!v.dead&&v.arc);
    return {meleeRows:nk.slice(0,26).map(v=>[v.t,v.src,v.amt,v.num?v.num.txt+'@'+v.num.x+','+v.num.y+'/dt'+v.num.dt:null,v.snd,v.kb,v.kbAt,v.kbTicks,v.flashW,v.stop,v.dwell])}`)),
  ev(iife(`const nk=window.__c.verdicts.filter(v=>!v.dead&&v.arc);
    return {meleeRows2:nk.slice(26,52).map(v=>[v.t,v.src,v.amt,v.num?v.num.txt+'/dt'+v.num.dt:null,v.snd,v.kb,v.kbTicks,v.flashW,v.stop,v.dwell])}`)),
  ev(iife(`const v=window.__c.verdicts;const kills=v.filter(q=>q.dead);
    return {kills:kills.length,killsWithStop:kills.filter(q=>q.stop).length,killDwellMedian:(()=>{const a=kills.map(q=>q.dwell).filter(x=>x!=null).sort((x,y)=>x-y);return a[Math.floor(a.length/2)];})(),
      arcNonKillStops:v.filter(q=>!q.dead&&q.arc&&q.stop).length,arcNonKillN:v.filter(q=>!q.dead&&q.arc).length,
      arcDwell:(()=>{const a=v.filter(q=>!q.dead&&q.arc).map(q=>q.dwell).filter(x=>x!=null).sort((x,y)=>x-y);return {n:a.length,median:a[Math.floor(a.length/2)],max:a[a.length-1],over40:a.filter(x=>x>40).length};})()}`)),
  // ---- big-region triptychs on non-kill melee hits ----
  ev(iife(`window.__c.bigOn=true;window.__c.hits.length=0;return 'bigOn t'+E.tick`)),
  ev(aiife(`await sleep(14000);return {hits:window.__c.hits.length,withBig:window.__c.hits.filter(h=>h.bigPost.length>=2&&h.bigPre).length}`)),
  ev(iife(`window.__c.bigOn=false;const DD=window.__c.ev.filter(e=>e.T==='death');
    const cand=window.__c.hits.filter(h=>h.bigPre&&h.bigPost.length>=2&&!DD.some(d=>d.id===h.tgt&&Math.abs(d.tick-h.t)<=1)&&(['heavy_slam','brutal_cleave','flurry','lunge_strike'].includes(h.src)||(/_basic$/.test(h.src||'')&&(h.atk===1||h.atk===2))));
    window.__c.trip=cand;return {candidates:cand.length,srcs:cand.slice(0,8).map(h=>h.src+'@'+h.t)}`)),
  ...[0,1,2].map(i => ev(iife(`const h=window.__c.trip[${i}];if(!h)return {set:${i},none:true};
    return JSON.stringify({set:${i},t:h.t,src:h.src,amt:h.amt,tgt:h.tgt,pre:h.pre,post:h.post.slice(0,4),
      frames:[{k:'pre',t:h.bigPre.t,box:h.bigPre.box,W:h.bigPre.W,url:h.bigPre.url}].concat(h.bigPost.slice(0,2).map(b=>({k:'post',t:b.t,box:b.box,W:b.W,url:b.url})))})`))),
  // ---- flash-triggered harness screenshots (keeper still running) ----
  ...[0,1,2,3,4,5,6,7].flatMap((i) => [
    { type: 'loop', cond: '(()=>{try{return !window.__c.flashNow}catch(e){return true}})()', maxMs: 15000, body: [wait(1)], label: `fl${i}` },
    shot(`certC2-b-fl${i}`),
    ev(iife(`const s=E.state();const t=E.tick;
      return {flashShot:${i},tick:t,flashNow:window.__c.flashNow,
        enemies:s.enemies.map(e=>{const c=window.__c.proj(e.x,0.55,e.z);const a=window.__c.series[e.id]||[];
          return {id:e.id,kind:e.kind,box:[Math.round(c[0]-32),Math.round(c[1]-44),64,88],W:a.slice(-5).map(r=>r.t+':'+r.W).join(' ')};}),
        hitsLast10:window.__c.ev.filter(e=>e.T==='hit'&&e.tick>=t-10).map(h=>[h.tick,h.target,h.source,h.amount]),
        nums:window.__c.num.filter(n=>n.t>=t-25).slice(-3).map(n=>n.txt+'@'+n.x+','+n.y+' t'+n.t)}`)),
  ]),
  ev(iife(`clearInterval(window.__c.pin);clearInterval(window.__c.keep);window.__c.grabOn=false;
    const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {totals:m,tick:E.tick,fps:E.fps,ver:E.version}`)),
];
mkdirSync('tools/actions', { recursive: true });
writeFileSync('tools/actions/certC2-b-shots.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certC2-b-shots.json', acts.length);
