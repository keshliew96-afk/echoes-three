// Certification C round 5 — second-pass generator: clean hit-feedback probe (certC5-hits2).
// Party i-framed (no contact damage -> no heal numerals), two pinned boars, full per-hit dump.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);
const EVTYPES = ['intent', 'dash_end', 'hit', 'hit_immune', 'sound', 'hitstop', 'death', 'screenshake', 'room_cleared', 'enemy_spawn',
  'telegraph_start', 'telegraph_resolve', 'enemy_fire', 'wave_start', 'room_enter', 'downed', 'knockback', 'flash', 'run_end'];
const ARM = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(EVTYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return {armed:E.tick,version:E.version}`));
const PROJ = `window.__proj=(x,y,z)=>{const cam=window.__arenaProbe.stage.camera;cam.updateMatrixWorld();
  const mv=cam.matrixWorldInverse.elements,pm=cam.projectionMatrix.elements;
  const mul=(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3]];
  let v=mul(mv,[x,y,z,1]);v=mul(pm,v);const w=v[3]||1;
  return [Math.round((v[0]/w*0.5+0.5)*innerWidth),Math.round((-v[1]/w*0.5+0.5)*innerHeight)];};`;

// per-rendered-frame sampler (same contract as certC5-gen.mjs HIT_SAMPLER) + kbTicks per enemy per tick
const HIT_SAMPLER = ev(iife(`${PROJ}
  const S=4,DW=400,DH=225;const src=document.querySelector('canvas');
  const dc=document.createElement('canvas');dc.width=DW;dc.height=DH;const dg=dc.getContext('2d',{willReadFrequently:true});
  const layer=document.querySelector('#dmg-num-layer');
  window.__f={flash:{},num:[],numSeen:[],tick:[],ent:[],frames:0,last:-1,lastWall:0,numState:new Map(),err:null};
  const F=window.__f;
  const step=()=>{F.frames++;const t=E.tick;const now=performance.now();const st=E.state();
    if(t!==F.last){if(F.last>=0)F.tick.push([F.last,+(now-F.lastWall).toFixed(1),t-F.last]);F.last=t;F.lastWall=now;
      F.ent.push([t,st.enemies.map(e=>[e.id,+e.x.toFixed(3),+e.z.toFixed(3),e.hp,e.kbTicks|0]),(st.vfx.arena?st.vfx.arena.numerals:st.vfx.numerals)|0]);}
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
    requestAnimationFrame(step);};
  requestAnimationFrame(step);return 'hit sampler armed at '+E.tick`));

// pin: whole party i-framed (no contact damage, no heals), tracked boars held at 100% HP, wave spawns i-framed
const PIN2 = ev(iife(`window.__tracked=new Set(E.state().enemies.filter(e=>e.kind==='boar').map(e=>e.id));window.__pinlog=[];
  const idOf=(id)=>(id&&typeof id==='object')?id.id:id;
  (async()=>{while(true){try{
    const st=E.state();for(const p of st.party)E.cmd('iframe',p.id,600);
    for(const e of st.enemies){if(window.__tracked.has(e.id))E.cmd('setHp',e.id,1);else if(!e.iframed)E.cmd('iframe',e.id,60000);}
    const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);
    const alive=st.enemies.filter(e=>window.__tracked.has(e.id));
    if(alive.length<2){const p=st.party[1+(alive.length%2)];if(p){const id=idOf(E.cmd('spawn','boar',+(p.x+0.55).toFixed(2),+(p.z+0.55).toFixed(2)));if(id!=null){window.__tracked.add(id);window.__pinlog.push([E.tick,'respawn',String(id)]);}}}
  }catch(err){window.__pinerr=String(err);}await new Promise(r=>setTimeout(r,16));}})();return {pin:'armed',tracked:[...window.__tracked]}`));

const HIT_REPORT2 = ev(iife(`
  const F=window.__f,evs=window.__c.ev;const ENEMY={boar:1,mantis:1,stag:1};
  const hits=evs.filter(e=>e.T==='hit'&&ENEMY[e.kind]&&e.tick>=F.ent[0][0]);
  const dwell={};for(const r of F.tick)dwell[r[0]]=r[1];
  const entAt=(t)=>{let best=null;for(const r of F.ent){if(r[0]<=t)best=r;else break;}return best;};
  const entFrom=(t)=>F.ent.find(r=>r[0]>=t);
  const txtOk=(txt,amt)=>txt===String(amt)||txt===String(Math.round(amt))||txt===String(Math.floor(amt));
  const numUsed=new Set();const rows=[];
  for(const h of hits){const T=h.tick,V=h.target;
    let num=null;for(let i=0;i<F.num.length;i++){const n=F.num[i];if(numUsed.has(i))continue;if(n[0]>=T-1&&n[0]<=T+8&&txtOk(n[1],h.amount)){num=n;numUsed.add(i);break;}}
    let seen=null;if(!num){for(const n of F.numSeen){if(n[0]>=T&&n[0]<=T+10&&txtOk(n[1],h.amount)){seen=n;break;}}}
    const pa=entAt(T-1);let pmax=null;for(const r of F.ent){if(r[0]>=T&&r[0]<=T+3)pmax=pmax==null?r[2]:Math.max(pmax,r[2]);}
    const snd=evs.filter(e=>e.T==='sound'&&e.tick>=T&&e.tick<=T+2).map(e=>e.slot);
    const r0=entAt(T),r1=entFrom(T+10),r6=entFrom(T+6),rn=entFrom(T+1);
    let kb=null,kbAbs6=null,kbT=null,alive10=false;
    if(r0){const p0=r0[1].find(x=>x[0]===V);
      if(p0&&r1){const p1=r1[1].find(x=>x[0]===V);if(p1){alive10=true;kb=+((p1[1]-p0[1])*(h.dirX||0)+(p1[2]-p0[2])*(h.dirZ||0)).toFixed(3);}}
      if(p0&&r6){const p6=r6[1].find(x=>x[0]===V);if(p6)kbAbs6=+Math.hypot(p6[1]-p0[1],p6[2]-p0[2]).toFixed(3);}}
    if(rn){const pn=rn[1].find(x=>x[0]===V);if(pn)kbT=pn[4];}
    let fl=null,flPre=null,flBox=null;const fr=F.flash[V]||[];
    const pre=fr.filter(r=>r[0]>=T-8&&r[0]<T&&r[1]!=null).map(r=>r[1]);
    const post=fr.filter(r=>r[0]>=T&&r[0]<=T+2&&r[1]!=null);
    if(post.length){const best=post.reduce((m,r)=>r[1]>m[1]?r:m,post[0]);fl=best[1];flBox=[best[2],best[3]];flPre=pre.length?Math.max.apply(null,pre):null;}
    const stop=evs.filter(e=>e.T==='hitstop'&&e.tick>=T&&e.tick<=T+2).map(e=>e.ticks+':'+e.cause);
    const kill=evs.some(e=>e.T==='death'&&e.id===V&&e.tick>=T&&e.tick<=T+1);
    const diedSoon=evs.some(e=>e.T==='death'&&e.id===V&&e.tick>T&&e.tick<=T+10);
    rows.push({t:T,v:V,src:h.source,shape:h.shape,amt:h.amount,kill,diedSoon,num:num?num[1]+'@'+num[2]+','+num[3]+'('+(num[0]-T)+')':null,seen:seen?seen[1]+'@'+seen[2]+','+seen[3]+'('+(seen[0]-T)+')':null,
      pool:[pa?pa[2]:null,pmax],snd,kb,kbAbs6,kbT,alive10,fl,flPre,flBox,dwell:dwell[T]||null,stop});}
  const nonKill=rows.filter(r=>!r.kill);
  const numOk=(r)=>!!r.num||!!r.seen;const sndOk=(r)=>r.snd.includes('hit');
  const poolOk=(r)=>r.pool[0]!=null&&r.pool[1]!=null&&(r.pool[1]>r.pool[0]||r.pool[0]>=12);
  const kbOk=(r)=>(r.kb!=null&&Math.abs(r.kb)>=0.05)||(r.kbAbs6!=null&&r.kbAbs6>=0.05)||(r.kbT!=null&&r.kbT>=6);
  const flOk=(r)=>r.fl!=null&&r.fl>=0.15;
  const all=(r)=>numOk(r)&&sndOk(r)&&kbOk(r)&&flOk(r);
  const arcNK=nonKill.filter(r=>r.shape==='melee_arc');const arcD=arcNK.map(r=>r.dwell).filter(v=>v!=null).sort((a,b)=>a-b);
  const baseD=F.tick.filter(r=>r[2]===1).map(r=>r[1]).sort((a,b)=>a-b);
  const heavy=nonKill.filter(r=>r.amt>=16);
  const fresh2=(r)=>{if(!r.num)return false;const m=/\\((-?\\d+)\\)$/.exec(r.num);return m&&(+m[1])<=2;};
  return {tick:E.tick,fps:E.fps,version:E.version,frames:F.frames,err:F.err,pinerr:window.__pinerr||null,respawns:window.__pinlog.length,
    ticksSampled:F.ent.length,firstTick:F.ent[0][0],lastTick:F.ent[F.ent.length-1][0],
    hits:rows.length,nonKill:nonKill.length,kills:rows.filter(r=>r.kill).length,
    numeralOk:nonKill.filter(numOk).length,numeralFreshWithin2:nonKill.filter(fresh2).length,
    poolOk:nonKill.filter(poolOk).length,soundHit:nonKill.filter(sndOk).length,
    kbDir10:nonKill.filter(r=>r.kb!=null&&Math.abs(r.kb)>=0.05).length,kbAny:nonKill.filter(kbOk).length,kbTicksSet:nonKill.filter(r=>r.kbT!=null&&r.kbT>=6).length,
    kbMedian:(()=>{const v=nonKill.map(r=>r.kb).filter(x=>x!=null).map(Math.abs).sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:null;})(),
    flashOk:nonKill.filter(flOk).length,flashPreMax:Math.max.apply(null,nonKill.map(r=>r.flPre==null?0:r.flPre)),
    flashPreOver015:nonKill.filter(r=>r.flPre!=null&&r.flPre>=0.15).length,
    allFour:nonKill.filter(all).length,
    fails:nonKill.filter(r=>!all(r)).map(r=>[r.t,r.v,r.src,r.amt,numOk(r)?'n':'NONUM',sndOk(r)?'s':'NOSND:'+r.snd.join('/'),kbOk(r)?'k':'NOKB:'+r.kb+'/'+r.kbAbs6+'/'+r.kbT+'/'+(r.alive10?'a':'dead'),flOk(r)?'f':'NOFL:'+r.fl,r.diedSoon?'diedSoon':'',r.pool.join('>')]),
    heavyN:heavy.length,heavyWithStop:heavy.filter(r=>r.stop.length).length,heavyDetail:heavy.map(r=>[r.t,r.src,r.amt,r.dwell,r.stop.join(',')||'none']),
    arcNonKill:arcNK.length,arcWithStop:arcNK.filter(r=>r.stop.length).length,arcDwell:{n:arcD.length,median:arcD[Math.floor(arcD.length/2)],max:arcD[arcD.length-1],over40:arcD.filter(v=>v>40).length},
    baseDwell:{n:baseD.length,median:baseD[Math.floor(baseD.length/2)],p99:baseD[Math.floor(baseD.length*0.99)],max:baseD[baseD.length-1]},
    killsWithStop:rows.filter(r=>r.kill&&r.stop.length).length,killsWithShake:rows.filter(r=>r.kill&&evs.some(e=>e.T==='screenshake'&&e.cause==='kill'&&e.tick>=r.t&&e.tick<=r.t+2)).length,
    stopCauses:evs.filter(e=>e.T==='hitstop').reduce((m,e)=>{const k=e.ticks+':'+e.cause;m[k]=(m[k]||0)+1;return m;},{}),
    deaths:evs.filter(e=>e.T==='death').length,shakes:evs.filter(e=>e.T==='screenshake').length,
    soundSlots:evs.filter(e=>e.T==='sound').reduce((m,e)=>{m[e.slot]=(m[e.slot]||0)+1;return m;},{}),
    healNumerals:F.num.filter(n=>n[1].charAt(0)==='+').length,
    rows:nonKill.map(r=>[r.t,r.v,r.src,r.shape,r.amt,r.num||('seen:'+r.seen),r.pool.join('>'),r.snd.join('/'),r.kb,r.kbAbs6,r.kbT,r.fl,r.flPre,r.flBox?r.flBox.join(','):null,r.stop.join(',')||'-'])}`));

const files = {};
files['certC5-hits2'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.length`),
  ev(iife(`const st=E.state();for(const p of st.party)E.cmd('iframe',p.id,60000);E.cmd('killAllEnemies');
    const a=st.party[1],b=st.party[2];
    const i1=E.cmd('spawn','boar',+(a.x+0.55).toFixed(2),+(a.z+0.55).toFixed(2)),i2=E.cmd('spawn','boar',+(b.x+0.55).toFixed(2),+(b.z+0.55).toFixed(2));
    return {tick:E.tick,spawned:[String(i1),String(i2)],party:st.party.map(p=>[p.id,p.kind,+p.x.toFixed(2),+p.z.toFixed(2)]),enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp])}`)),
  PIN2, wait(1200), HIT_SAMPLER,
  wait(30000),
  ev(iife(`return {tick:E.tick,enemies:E.state().enemies.map(e=>[e.id,e.kind,e.hp,e.iframed]),hits:window.__c.ev.filter(e=>e.T==='hit').length,hitsOnParty:window.__c.ev.filter(e=>e.T==='hit'&&(e.kind==='player'||e.kind==='ally')).length,downed:window.__c.ev.filter(e=>e.T==='downed').length,cleared:window.__c.ev.filter(e=>e.T==='room_cleared').length,frames:window.__f.frames,pinerr:window.__pinerr||null,tracked:[...window.__tracked]}`)),
  HIT_REPORT2,
];
for (const [name, acts] of Object.entries(files)) { writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); }
