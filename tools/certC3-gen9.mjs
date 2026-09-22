// C4 take 4: numeral state keyed by ELEMENT (index keying breaks when the pool
// re-appends recycled nodes), allies healed so the fight does not end early,
// enemy count held at 3 so frame cost stays low.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick${extra}}})()`);
const files = {};

const EVTYPES = ['hit', 'sound', 'hitstop', 'death', 'screenshake', 'room_cleared', 'enemy_spawn',
  'wave_start', 'room_enter', 'downed', 'revive'];
const ARM = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(EVTYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));

const PROJ = `window.__proj=(x,y,z)=>{const cam=window.__arenaProbe.stage.camera;cam.updateMatrixWorld();
  const mv=cam.matrixWorldInverse.elements,pm=cam.projectionMatrix.elements;
  const mul=(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3]];
  let v=mul(mv,[x,y,z,1]);v=mul(pm,v);const w=v[3]||1;
  return [Math.round((v[0]/w*0.5+0.5)*innerWidth),Math.round((-v[1]/w*0.5+0.5)*innerHeight)];};`;

const SAMPLER = ev(iife(`${PROJ}
  const S=4,DW=400,DH=225;const src=document.querySelector('canvas');
  const dc=document.createElement('canvas');dc.width=DW;dc.height=DH;const dg=dc.getContext('2d',{willReadFrequently:true});
  const TW=420,TH=320;const big=document.createElement('canvas');big.width=TW;big.height=TH;const bgc=big.getContext('2d');
  const layer=document.querySelector('#dmg-num-layer');
  window.__f={flash:{},num:[],numSeen:[],tick:[],ent:[],cam:[],frames:0,last:-1,lastWall:0,numState:new Map(),
    trip:null,ring:[],watch:null,err:null};
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
    // rolling 3-frame 420x320 ring around the watched victim, frozen on its next hit
    if(F.watch!=null){const v=st.enemies.find(e=>e.id===F.watch);
      if(v){const pr=window.__proj(v.x,0.55,v.z);
        const sx=Math.max(0,Math.min(innerWidth-TW,pr[0]-TW/2)),sy=Math.max(0,Math.min(innerHeight-TH,pr[1]-TH/2));
        try{bgc.clearRect(0,0,TW,TH);bgc.drawImage(src,sx,sy,TW,TH,0,0,TW,TH);
          const url=big.toDataURL('image/png');
          F.ring.push({tick:t,box:[sx,sy,TW,TH],url});if(F.ring.length>3)F.ring.shift();
          if(F.trip&&F.trip.open){F.trip.post.push({tick:t,box:[sx,sy,TW,TH],url});
            if(t>F.trip.hitTick+5){F.trip.open=false;F.watch=null;}}}catch(err){}}}
    requestAnimationFrame(step);};
  requestAnimationFrame(step);return 'sampler armed at '+E.tick`));

const REPORT = ev(iife(`
  const F=window.__f,evs=window.__c.ev;
  const ENEMY={boar:1,mantis:1,stag:1};
  const hits=evs.filter(e=>e.T==='hit'&&ENEMY[e.kind]);
  const dwell={};for(const r of F.tick)dwell[r[0]]=r[1];
  const entAt=(t)=>{let best=null;for(const r of F.ent){if(r[0]<=t)best=r;else break;}return best;};
  const numUsed=new Set();const rows=[];
  for(const h of hits){const T=h.tick,V=h.target;
    let num=null;
    for(let i=0;i<F.num.length;i++){const n=F.num[i];if(numUsed.has(i))continue;
      if(n[0]>=T-1&&n[0]<=T+5&&n[1]===String(h.amount)){num=n;numUsed.add(i);break;}}
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
    const post=fr.filter(r=>r[0]>=T&&r[0]<=T+4&&r[1]!=null);
    if(post.length){const best=post.reduce((m,r)=>r[1]>m[1]?r:m,post[0]);fl=best[1];flBox=[best[2],best[3]];
      flPre=pre.length?Math.max.apply(null,pre):null;}
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
  return {tick:E.tick,fps:E.fps,frames:F.frames,err:F.err,numRows:F.num.length,seenRows:F.numSeen.length,
    hits:rows.length,nonKill:nonKill.length,kills:rows.filter(r=>r.kill).length,
    numeralFresh:rows.filter(r=>r.num).length,numeralAny:rows.filter(r=>r.num||r.seen).length,
    poolStepOk:rows.filter(r=>r.poolStep>0).length,soundOk:rows.filter(r=>r.snd).length,
    kbOk:nonKill.filter(r=>r.kb!=null&&Math.abs(r.kb)>=0.05).length,
    flashOk:nonKill.filter(r=>r.fl!=null&&r.fl>=0.15).length,
    flashPreMax:Math.max.apply(null,nonKill.map(r=>r.flPre==null?0:r.flPre)),
    allFour:nonKill.filter(ok).length,
    fails:nonKill.filter(r=>!ok(r)).map(r=>[r.t,r.src,r.amt,(r.num||r.seen)?'n':'NONUM',r.snd?'s':'NOSND',(r.kb!=null&&Math.abs(r.kb)>=0.05)?'k':('NOKB'+r.kb),(r.fl!=null&&r.fl>=0.15)?'f':('NOFL'+r.fl)]),
    arcHits:rows.filter(r=>r.shape==='melee_arc').length,arcNonKill:arcNK.length,
    arcWithStop:arcNK.filter(r=>r.stop.length).length,
    arcStopDetail:arcNK.map(r=>[r.t,r.src,r.amt,r.dwell,r.stop.join(',')||'none']),
    arcDwell:{n:arcD.length,median:arcD[Math.floor(arcD.length/2)],max:arcD[arcD.length-1],over40:arcD.filter(v=>v>40).length},
    baseDwell:{n:baseD.length,median:baseD[Math.floor(baseD.length/2)],p99:baseD[Math.floor(baseD.length*0.99)],max:baseD[baseD.length-1]},
    killsWithStop:rows.filter(r=>r.kill&&r.stop.length).length,
    stopCauses:evs.filter(e=>e.T==='hitstop').reduce((m,e)=>{const k=e.ticks+':'+e.cause;m[k]=(m[k]||0)+1;return m;},{}),
    deaths:evs.filter(e=>e.T==='death').length,shakes:evs.filter(e=>e.T==='screenshake').length,
    shakeCauses:evs.filter(e=>e.T==='screenshake').reduce((m,e)=>{m[e.cause]=(m[e.cause]||0)+1;return m;},{}),
    sample:nonKill.slice(0,30).map(r=>[r.t,r.src,r.shape,r.amt,r.num||('seen:'+r.seen),r.poolStep,r.snd?1:0,r.kb,r.kbT,r.fl,r.flPre,r.flBox])}`));

const PIN = ev(iife(`(async()=>{while(true){try{
    E.cmd('iframe',0,600);const st=E.state();
    for(const p of st.party)if(p.hp<p.maxHp)E.cmd('heal',p.id,100);
    for(const e of st.enemies)E.cmd('setHp',e.id,1);
    const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);
    const boars=st.enemies.filter(e=>e.kind==='boar');
    if(boars.length<3){const p=st.party[1+((E.tick/13|0)%3)];if(p)E.cmd('spawn','boar',+(p.x+0.55).toFixed(2),+(p.z+0.55).toFixed(2));}
  }catch(err){window.__pinerr=String(err);}await new Promise(r=>setTimeout(r,16));}})();return 'pin armed'`));

files['certC3-hits4'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.length`),
  ev(iife(`E.cmd('iframe',0,60000);E.cmd('killAllEnemies');const st=E.state();
    for(const p of st.party.slice(1))E.cmd('spawn','boar',+(p.x+0.55).toFixed(2),+(p.z+0.55).toFixed(2));
    return {party:st.party.map(p=>[p.id,p.kind,+p.x.toFixed(2),+p.z.toFixed(2)]),enemies:E.state().enemies.length}`)),
  PIN, wait(1200), SAMPLER,
  ev(iife(`const F=window.__f;const b=E.state().enemies.find(e=>e.kind==='boar');F.watch=b?b.id:null;
    E.on('hit',(h)=>{if(F.trip||F.watch==null)return;if(h.target!==F.watch)return;
      F.trip={hitTick:h.tick,src:h.source,amt:h.amount,shape:h.shape,victim:h.target,open:true,
        pre:F.ring.slice().map(r=>({tick:r.tick,box:r.box,url:r.url})),post:[]};});
    return {watch:F.watch}`)),
  wait(45000),
  ev(iife(`return {enemies:E.state().enemies.length,hits:window.__c.ev.filter(e=>e.T==='hit').length,
    downed:window.__c.ev.filter(e=>e.T==='downed').length,cleared:window.__c.ev.filter(e=>e.T==='room_cleared').length,
    frames:window.__f.frames,trip:!!window.__f.trip,pinerr:window.__pinerr||null}`)),
  REPORT,
  ev(iife(`const t=window.__f.trip;if(!t)return 'no trip';
    return {hitTick:t.hitTick,src:t.src,amt:t.amt,shape:t.shape,victim:t.victim,
      pre:t.pre.map(f=>[f.tick,f.box]),post:t.post.map(f=>[f.tick,f.box])}`)),
  ev(iife(`const t=window.__f.trip;const f=t&&t.pre[t.pre.length-1];return f?('PNG0|'+JSON.stringify(f.box)+'|'+f.tick+'|0|'+f.url):'none'`)),
  ev(iife(`const t=window.__f.trip;const f=t&&t.post[0];return f?('PNG1|'+JSON.stringify(f.box)+'|'+f.tick+'|1|'+f.url):'none'`)),
  ev(iife(`const t=window.__f.trip;const f=t&&t.post[t.post.length-1];return f?('PNG2|'+JSON.stringify(f.box)+'|'+f.tick+'|2|'+f.url):'none'`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
