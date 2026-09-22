// C4 take 2 (fixed numeral-pool index, flash triptychs), boss-room arc hitstop,
// C3 clean frames, C5 camera, C6 threat pointers, C4 8-frame sequence.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const shot = (name) => ({ type: 'shot', name });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick${extra}}})()`);
const files = {};

const EVTYPES = ['hit', 'hit_immune', 'sound', 'hitstop', 'death', 'screenshake', 'ally_basic', 'ally_cast',
  'skill_cast', 'room_cleared', 'enemy_spawn', 'wave_start', 'room_enter', 'boss_quake_start',
  'boss_quake_resolve', 'boss_trample', 'boss_adds', 'boss_death', 'telegraph_start', 'telegraph_resolve'];
const ARM = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(EVTYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));

const PROJ = `window.__proj=(x,y,z)=>{const cam=window.__arenaProbe.stage.camera;cam.updateMatrixWorld();
  const mv=cam.matrixWorldInverse.elements,pm=cam.projectionMatrix.elements;
  const mul=(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3]];
  let v=mul(mv,[x,y,z,1]);v=mul(pm,v);const w=v[3]||1;
  return [Math.round((v[0]/w*0.5+0.5)*innerWidth),Math.round((-v[1]/w*0.5+0.5)*innerHeight)];};`;

const SAMPLER = (withTrip) => ev(iife(`${PROJ}
  const FW=64,FH=88;const src=document.querySelector('canvas');
  const tmp=document.createElement('canvas');tmp.width=FW;tmp.height=FH;const g=tmp.getContext('2d',{willReadFrequently:true});
  const TW=480,TH=360;const big=document.createElement('canvas');big.width=TW;big.height=TH;const bg=big.getContext('2d');
  const layer=document.querySelector('#dmg-num-layer');
  window.__f={flash:{},num:[],tick:[],ent:[],cam:[],frames:0,last:-1,lastWall:0,numState:new Map(),trip:[],ring:[],want:null};
  const F=window.__f;
  const vis=(n)=>{const s=getComputedStyle(n);return s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity||'1')>0.05;};
  const step=()=>{F.frames++;const t=E.tick;const now=performance.now();
    const st=E.state();
    if(t!==F.last){if(F.last>=0)F.tick.push([F.last,+(now-F.lastWall).toFixed(1),t-F.last]);F.last=t;F.lastWall=now;
      const p=st.party[0];
      F.ent.push([t,st.enemies.map(e=>[e.id,+e.x.toFixed(3),+e.z.toFixed(3),e.hp,e.kbTicks|0]),
        (st.vfx.arena?st.vfx.arena.numerals:st.vfx.numerals)|0,+p.x.toFixed(3),+p.z.toFixed(3),p.hp]);
      const cm=st.vfx.arena?st.vfx.arena.cam:null;if(cm)F.cam.push([t,+cm[0].toFixed(4),+cm[1].toFixed(4)]);}
    if(layer){const nodes=layer.querySelectorAll('.dmg-num');
      nodes.forEach((n,i)=>{const v=vis(n);const txt=(n.textContent||'').trim();
        const prev=F.numState.get(i)||{v:false,txt:''};
        if(v&&(!prev.v||prev.txt!==txt)){const r=n.getBoundingClientRect();
          F.num.push([t,txt,Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]);}
        F.numState.set(i,{v,txt});});}
    try{for(const e of st.enemies){const pr=window.__proj(e.x,0.55,e.z);
        let sx=pr[0]-FW/2,sy=pr[1]-FH/2;
        if(sx<0||sy<0||sx+FW>innerWidth||sy+FH>innerHeight)continue;
        g.clearRect(0,0,FW,FH);g.drawImage(src,sx,sy,FW,FH,0,0,FW,FH);
        const d=g.getImageData(0,0,FW,FH).data;let w=0;
        for(let i=0;i<d.length;i+=4){const r=d[i],gg=d[i+1],b=d[i+2];
          const L=0.2126*r+0.7152*gg+0.0722*b;const mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);
          const s=mx?(mx-mn)/mx:0;if(L>230&&s<0.18)w++;}
        (F.flash[e.id]=F.flash[e.id]||[]).push([t,+(w/(FW*FH)).toFixed(3),Math.round(sx),Math.round(sy)]);}
    }catch(err){F.err=String(err);}
    ${withTrip ? `
    // rolling 480x360 buffer around the current triptych victim + capture on demand
    if(F.want){const v=st.enemies.find(e=>e.id===F.want.id);
      if(v){const pr=window.__proj(v.x,0.55,v.z);
        let sx=Math.max(0,Math.min(innerWidth-TW,pr[0]-TW/2)),sy=Math.max(0,Math.min(innerHeight-TH,pr[1]-TH/2));
        try{bg.clearRect(0,0,TW,TH);bg.drawImage(src,sx,sy,TW,TH,0,0,TW,TH);
          const url=big.toDataURL('image/png');
          F.ring.push({tick:t,box:[sx,sy,TW,TH],url});if(F.ring.length>4)F.ring.shift();
          if(F.want.until&&t<=F.want.until){F.want.frames.push({tick:t,box:[sx,sy,TW,TH],url});}
          if(F.want.until&&t>F.want.until){F.trip.push(F.want);F.want=null;}
        }catch(err){}}}` : ''}
    requestAnimationFrame(step);};
  requestAnimationFrame(step);return 'sampler armed at '+E.tick`));

const REPORT = ev(iife(`
  const F=window.__f,evs=window.__c.ev;
  const hits=evs.filter(e=>e.T==='hit'&&e.kind!=='player');
  const dwell={};for(const r of F.tick)dwell[r[0]]=r[1];
  const entAt=(t)=>{let best=null;for(const r of F.ent){if(r[0]<=t)best=r;else break;}return best;};
  const numUsed=new Set();const rows=[];
  for(const h of hits){const T=h.tick,V=h.target;
    let num=null;
    for(let i=0;i<F.num.length;i++){const n=F.num[i];if(numUsed.has(i))continue;
      if(n[0]>=T-1&&n[0]<=T+3&&n[1]===String(h.amount)){num=n;numUsed.add(i);break;}}
    const a=entAt(T-1),b=F.ent.find(r=>r[0]>=T+2);
    const poolStep=a&&b?b[2]-a[2]:null;
    const snd=evs.some(e=>e.T==='sound'&&e.tick>=T&&e.tick<=T+2);
    let kb=null,kbT=null;
    const r0=entAt(T),r1=F.ent.find(r=>r[0]>=T+10);
    if(r0&&r1){const p0=r0[1].find(x=>x[0]===V),p1=r1[1].find(x=>x[0]===V);
      if(p0&&p1){kb=+((p1[1]-p0[1])*(h.dirX||0)+(p1[2]-p0[2])*(h.dirZ||0)).toFixed(3);kbT=p0[4];}}
    let fl=null,flPre=null;const fr=F.flash[V]||[];
    const pre=fr.filter(r=>r[0]>=T-8&&r[0]<T).map(r=>r[1]);
    const post=fr.filter(r=>r[0]>=T&&r[0]<=T+4).map(r=>r[1]);
    if(post.length){fl=Math.max.apply(null,post);flPre=pre.length?Math.max.apply(null,pre):null;}
    const stop=evs.filter(e=>e.T==='hitstop'&&e.tick>=T&&e.tick<=T+2).map(e=>e.ticks+':'+e.cause);
    const kill=evs.some(e=>e.T==='death'&&e.id===V&&e.tick>=T&&e.tick<=T+1);
    rows.push({t:T,v:V,src:h.source,shape:h.shape,amt:h.amount,kill,
      num:num?num[1]+'@'+num[2]+','+num[3]:null,poolStep,snd,kb,kbT,fl,flPre,dwell:dwell[T]||null,stop});}
  const nonKill=rows.filter(r=>!r.kill);
  const ok=(r)=>!!r.num&&r.snd&&r.kb!=null&&Math.abs(r.kb)>=0.05&&r.fl!=null&&r.fl>=0.15;
  const arcNK=nonKill.filter(r=>r.shape==='melee_arc');
  const arcD=arcNK.map(r=>r.dwell).filter(v=>v!=null).sort((a,b)=>a-b);
  return {tick:E.tick,fps:E.fps,frames:F.frames,err:F.err||null,
    hits:rows.length,nonKill:nonKill.length,kills:rows.filter(r=>r.kill).length,
    numeralOk:rows.filter(r=>r.num).length,poolStepOk:rows.filter(r=>r.poolStep>0).length,
    soundOk:rows.filter(r=>r.snd).length,
    kbOk:nonKill.filter(r=>r.kb!=null&&Math.abs(r.kb)>=0.05).length,
    kbMedian:(()=>{const v=nonKill.map(r=>r.kb).filter(x=>x!=null&&Math.abs(x)>=0.05).map(Math.abs).sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:null;})(),
    flashOk:nonKill.filter(r=>r.fl!=null&&r.fl>=0.15).length,
    allFour:nonKill.filter(ok).length,
    failReasons:nonKill.filter(r=>!ok(r)).map(r=>[r.t,r.src,r.amt,r.num?'n':'NO-NUM',r.snd?'s':'NO-SND',(r.kb!=null&&Math.abs(r.kb)>=0.05)?'k':'NO-KB'+r.kb,(r.fl!=null&&r.fl>=0.15)?'f':'NO-FL'+r.fl]),
    arcHits:rows.filter(r=>r.shape==='melee_arc').length,arcNonKill:arcNK.length,
    arcWithStop:arcNK.filter(r=>r.stop.length).length,
    arcStopDetail:arcNK.map(r=>[r.t,r.src,r.amt,r.dwell,r.stop.join(',')||'none']),
    arcDwell:{median:arcD[Math.floor(arcD.length/2)],max:arcD[arcD.length-1],over40:arcD.filter(v=>v>40).length},
    killsWithStop:rows.filter(r=>r.kill&&r.stop.length).length,
    stopCauses:evs.filter(e=>e.T==='hitstop').reduce((m,e)=>{const k=e.ticks+':'+e.cause;m[k]=(m[k]||0)+1;return m;},{}),
    deaths:evs.filter(e=>e.T==='death').length,shakes:evs.filter(e=>e.T==='screenshake').length,
    shakeCauses:evs.filter(e=>e.T==='screenshake').reduce((m,e)=>{m[e.cause]=(m[e.cause]||0)+1;return m;},{}),
    dwellStats:(()=>{const v=F.tick.filter(r=>r[2]===1).map(r=>r[1]).sort((a,b)=>a-b);
      return {n:v.length,median:v[Math.floor(v.length/2)],p99:v[Math.floor(v.length*0.99)],max:v[v.length-1]};})(),
    sample:nonKill.slice(0,26).map(r=>[r.t,r.src,r.amt,r.num,r.poolStep,r.snd?1:0,r.kb,r.kbT,r.fl,r.flPre])}`));

const PIN = ev(iife(`(async()=>{while(true){try{
    E.cmd('iframe',0,600);const st=E.state();
    for(const e of st.enemies)E.cmd('setHp',e.id,1);
    const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);
    const near=st.party.slice(1).map(p=>[p.x,p.z]);
    if(st.enemies.length<5){for(const p of near)E.cmd('spawn','boar',+(p[0]+0.6).toFixed(2),+(p[1]+0.6).toFixed(2));}
  }catch(err){window.__pinerr=String(err);}await new Promise(r=>setTimeout(r,16));}})();return 'pin armed'`));

// ---- certC3-hits2: Act-1 element sweep, run ALONE ----
files['certC3-hits2'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.length`),
  ev(iife(`E.cmd('iframe',0,60000);const st=E.state();
    for(let i=1;i<st.party.length;i++){const p=st.party[i];E.cmd('spawn','boar',+(p.x+0.6).toFixed(2),+(p.z+0.6).toFixed(2));}
    return {party:st.party.map(p=>[p.id,p.kind,+p.x.toFixed(2),+p.z.toFixed(2)]),enemies:E.state().enemies.length}`)),
  PIN, wait(800), SAMPLER(true),
  // arm a triptych: freeze 480x360 canvas frames around the next non-killing hit
  ev(iife(`(async()=>{const F=window.__f;let n=0;
    E.on('hit',(h)=>{if(n>=3||F.want)return;if(h.kind==='player')return;
      F.want={id:h.target,hitTick:h.tick,src:h.source,amt:h.amount,shape:h.shape,
        pre:F.ring.slice(-2).map(r=>({tick:r.tick,box:r.box,url:r.url})),until:h.tick+6,frames:[]};n++;});
    })();return 'trip armed'`)),
  wait(55000),
  ev(iife(`const st=E.state();return {enemies:st.enemies.length,hits:window.__c.ev.filter(e=>e.T==='hit').length,
    shapes:window.__c.ev.filter(e=>e.T==='hit').reduce((m,e)=>{m[(e.source||'?')+'|'+(e.shape||'?')]=(m[(e.source||'?')+'|'+(e.shape||'?')]||0)+1;return m;},{}),
    frames:window.__f.frames,numRows:window.__f.num.length,trips:window.__f.trip.length}`)),
  REPORT,
  ev(iife(`const t=window.__f.trip[0];if(!t)return 'no trip';
    return {hitTick:t.hitTick,src:t.src,amt:t.amt,shape:t.shape,victim:t.id,
      pre:t.pre.map(f=>[f.tick,f.box]),post:t.frames.map(f=>[f.tick,f.box])}`)),
  ev(iife(`const t=window.__f.trip[0];const f=t&&t.pre[t.pre.length-1];return f?('PNG0|'+JSON.stringify(f.box)+'|'+f.tick+'|0|'+f.url):'none'`)),
  ev(iife(`const t=window.__f.trip[0];const f=t&&t.frames[0];return f?('PNG1|'+JSON.stringify(f.box)+'|'+f.tick+'|1|'+f.url):'none'`)),
  ev(iife(`const t=window.__f.trip[0];const f=t&&t.frames[1];return f?('PNG2|'+JSON.stringify(f.box)+'|'+f.tick+'|2|'+f.url):'none'`)),
];

// ---- certC3-boss2: Stag pinned at full HP, nothing dies, melee arcs measured ----
files['certC3-boss2'] = [
  ARM,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room,boss:JSON.stringify(r&&r.boss)}`)),
  waitFor(`E.state().enemies.length>=1`, 40000, `,enemies:E.state().enemies.map(e=>[e.id,e.kind,e.hp])`),
  ev(iife(`E.cmd('iframe',0,60000);
    (async()=>{while(true){try{E.cmd('iframe',0,600);E.cmd('bossHp',1);
      for(const e of E.state().enemies)if(e.kind!=='stag')E.cmd('setHp',e.id,1);
      if(E.state().party[0].hp<100)E.cmd('heal',0,100);}catch(err){window.__pinerr=String(err);}
      await new Promise(r=>setTimeout(r,16));}})();return 'boss pin armed'`)),
  wait(800), SAMPLER(false),
  wait(60000),
  ev(iife(`return {enemies:E.state().enemies.map(e=>[e.id,e.kind,e.hp]),boss:JSON.stringify(E.cmd('runState').boss),
    hits:window.__c.ev.filter(e=>e.T==='hit').length,deaths:window.__c.ev.filter(e=>e.T==='death').length,
    shapes:window.__c.ev.filter(e=>e.T==='hit').reduce((m,e)=>{m[(e.source||'?')+'|'+(e.shape||'?')]=(m[(e.source||'?')+'|'+(e.shape||'?')]||0)+1;return m;},{}),
    quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>[e.tick,e.resolveTick]),
    quakeRes:window.__c.ev.filter(e=>e.T==='boss_quake_resolve').map(e=>e.tick),
    tramples:window.__c.ev.filter(e=>e.T==='boss_trample').map(e=>e.tick),
    shakes:window.__c.ev.filter(e=>e.T==='screenshake').map(e=>[e.tick,e.cause,e.amp,e.durationSec])}`)),
  REPORT,
];

// ---- certC3-clean: no enemies, no telegraph ----
files['certC3-clean'] = [
  ARM,
  ev(iife(`const s=E.state();return {scene:s.scene,enemies:s.enemies.length,eshots:s.eshots.length,tick:E.tick,
    tele:window.__c.ev.filter(e=>e.T==='telegraph_start').length}`)),
  wait(1500),
  ev(iife(`const s=E.state();return {beforeShot:{tick:E.tick,enemies:s.enemies.length,eshots:s.eshots.length,tele:window.__c.ev.filter(e=>e.T==='telegraph_start').length}}`)),
  shot('certC3-clean-arena'),
  ev(iife(`const s=E.state();return {afterShot:{tick:E.tick,enemies:s.enemies.length,eshots:s.eshots.length,tele:window.__c.ev.filter(e=>e.T==='telegraph_start').length}}`)),
];
files['certC3-clean-run'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 40000),
  ev(iife(`E.cmd('iframe',0,60000);E.cmd('killAllEnemies');E.cmd('clearRoom');
    return {tick:E.tick,enemies:E.state().enemies.length,ui:E.runUi().screen}`)),
  wait(700),
  ev(iife(`const s=E.state();const evs=window.__c.ev;
    return {beforeShot:{tick:E.tick,enemies:s.enemies.length,eshots:s.eshots.length,
      liveTele:evs.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).length,ui:E.runUi().screen}}`)),
  shot('certC3-clean-cleared'),
  ev(iife(`const s=E.state();const evs=window.__c.ev;
    return {afterShot:{tick:E.tick,enemies:s.enemies.length,eshots:s.eshots.length,
      liveTele:evs.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick).length,ui:E.runUi().screen}}`)),
];

// ---- certC3-cam: C5 ----
files['certC3-cam'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=1`, 40000),
  ev(iife(`${PROJ}E.cmd('iframe',0,60000);E.cmd('teleport',-5,4);
    window.__cam={legs:{},cur:null};
    (async()=>{while(true){const c=window.__cam;if(c.cur){const p=E.state().party[0];
      const sp=window.__proj(p.x,0.55,p.z);const cm=E.state().vfx.arena.cam;
      c.legs[c.cur].push([E.tick,+p.x.toFixed(2),+p.z.toFixed(2),sp[0],sp[1],+cm[0].toFixed(3),+cm[1].toFixed(3)]);}
      await new Promise(r=>setTimeout(r,250));}})();
    (async()=>{let last=null;window.__step=[];while(true){const cm=E.state().vfx.arena.cam;
      if(last)window.__step.push(+Math.hypot(cm[0]-last[0],cm[1]-last[1]).toFixed(4));last=[cm[0],cm[1]];
      await new Promise(r=>setTimeout(r,16));}})();
    return {player:[E.state().party[0].x,E.state().party[0].z],cam:E.state().vfx.arena.cam}`)),
  wait(900),
  ev(iife(`window.__cam.legs.D=[];window.__cam.cur='D';return 'leg D at '+E.tick`)),
  down('KeyD'), wait(4000), up('KeyD'),
  ev(iife(`window.__cam.cur=null;return {n:window.__cam.legs.D.length}`)),
  wait(600),
  ev(iife(`window.__cam.legs.W=[];window.__cam.cur='W';return 'leg W at '+E.tick`)),
  down('KeyW'), wait(4000), up('KeyW'),
  ev(iife(`window.__cam.cur=null;return {n:window.__cam.legs.W.length}`)),
  shot('certC3-cam-end'),
  ev(iife(`const L=window.__cam.legs;const out={};
    for(const k of ['D','W']){const r=L[k]||[];let maxJump=0,mj=null;
      for(let i=1;i<r.length;i++){const d=Math.hypot(r[i][3]-r[i-1][3],r[i][4]-r[i-1][4]);if(d>maxJump){maxJump=d;mj=[r[i-1][0],r[i][0],Math.round(d)];}}
      const inside=r.filter(x=>x[3]>=320&&x[3]<=1280&&x[4]>=180&&x[4]<=720).length;
      out[k]={samples:r.length,sxMin:Math.min.apply(null,r.map(x=>x[3])),sxMax:Math.max.apply(null,r.map(x=>x[3])),
        syMin:Math.min.apply(null,r.map(x=>x[4])),syMax:Math.max.apply(null,r.map(x=>x[4])),
        maxJumpPx:Math.round(maxJump),maxJumpPctW:+(maxJump/innerWidth*100).toFixed(2),maxJumpAt:mj,
        inside60:inside,outside:r.filter(x=>!(x[3]>=320&&x[3]<=1280&&x[4]>=180&&x[4]<=720)).map(x=>[x[0],x[3],x[4]]),
        worldFrom:[r[0][1],r[0][2]],worldTo:[r[r.length-1][1],r[r.length-1][2]],rows:r};}
    const st=window.__step.slice().sort((a,b)=>a-b);
    out.camStep={n:st.length,median:st[Math.floor(st.length/2)],p99:st[Math.floor(st.length*0.99)],max:st[st.length-1]};
    out.fps=E.fps;out.window=[innerWidth,innerHeight];return out`)),
];

// ---- certC3-threat: C6 ----
files['certC3-threat'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 40000),
  ev(iife(`E.cmd('iframe',0,60000);const t=E.hud.threat();
    return {natural:{gated:t.gated,offFrame:t.offFrame,markersDrawn:t.markersDrawn,domMarkers:t.domMarkers,covered:t.covered,uncued:t.uncued},
      threats:t.threats.map(x=>[x.key,x.kind,x.sx,x.sy,x.onScreen])}`)),
  shot('certC3-threat-natural'),
  ev(iife(`const t=E.hud.threat();return {afterShot:{offFrame:t.offFrame,markersDrawn:t.markersDrawn,domMarkers:t.domMarkers,uncued:t.uncued},
    dom:[...document.querySelectorAll('#hud-threat .tm')].map(n=>{const r=n.getBoundingClientRect();const s=getComputedStyle(n);
      return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),s.display,s.opacity,s.transform];})}`)),
  // forced: park the player in one corner, the enemies in the others
  ev(iife(`E.cmd('teleport',-9,6);
    for(const e of E.state().enemies)E.cmd('iframe',e.id,20000);
    E.cmd('spawn','mantis',10,-6);E.cmd('spawn','boar',10,6);E.cmd('spawn','boar',-10,-6);
    for(const e of E.state().enemies)E.cmd('iframe',e.id,20000);
    return {enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(1),+e.z.toFixed(1)])}`)),
  wait(900),
  ev(iife(`E.cmd('teleport',-9,6);const t=E.hud.threat();
    return {forced:{gated:t.gated,offFrame:t.offFrame,markersDrawn:t.markersDrawn,domMarkers:t.domMarkers,covered:t.covered,uncued:t.uncued},
      threats:t.threats.map(x=>[x.key,x.kind,x.sx,x.sy,x.onScreen])}`)),
  shot('certC3-threat-forced'),
  ev(iife(`const t=E.hud.threat();return {afterShot:{offFrame:t.offFrame,markersDrawn:t.markersDrawn,domMarkers:t.domMarkers,uncued:t.uncued},
    layer:(()=>{const n=document.querySelector('#hud-threat');if(!n)return null;const r=n.getBoundingClientRect();const s=getComputedStyle(n);
      return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),s.display,s.opacity,s.visibility];})(),
    dom:[...document.querySelectorAll('#hud-threat .tm')].map(n=>{const r=n.getBoundingClientRect();const s=getComputedStyle(n);
      return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),s.display,s.opacity,s.transform];})}`)),
];

// ---- certC3-hitseq: the required 8-frame sequence across a hit ----
files['certC3-hitseq'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=3`, 40000),
  ev(iife(`E.cmd('iframe',0,60000);const st=E.state();
    for(let i=1;i<st.party.length;i++){const p=st.party[i];E.cmd('spawn','boar',+(p.x+0.6).toFixed(2),+(p.z+0.6).toFixed(2));}
    (async()=>{while(true){try{E.cmd('iframe',0,600);for(const e of E.state().enemies)E.cmd('setHp',e.id,1);
      const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');}catch(e){}await new Promise(r=>setTimeout(r,16));}})();
    return {enemies:E.state().enemies.length}`)),
  wait(2500),
  ev(iife(`window.__hs=[];E.on('hit',h=>{if(h.kind!=='player')window.__hs.push([h.tick,h.source,h.amount,h.target]);});
    (function poll(){const L=document.querySelector('#dmg-num-layer');window.__hn=window.__hn||[];
      const f=()=>{if(L){for(const n of L.querySelectorAll('.dmg-num')){const s=getComputedStyle(n);
        if(s.display!=='none'&&parseFloat(s.opacity||'1')>0.05){const r=n.getBoundingClientRect();
          window.__hn.push([E.tick,(n.textContent||'').trim(),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]);}}}
        requestAnimationFrame(f);};requestAnimationFrame(f);})();
    return 'seq trackers armed at '+E.tick`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
