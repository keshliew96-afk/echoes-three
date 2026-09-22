// C2 natural-attack i-frame proof (dash3) + C3 mid-telegraph pixels (telepx).
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

const ARM = ev(iife(`window.__c={ev:[]};for(const t of ['intent','dash_end','hit','hit_immune','sound','hitstop','death','room_cleared','enemy_spawn','telegraph_start','telegraph_resolve','enemy_fire','screenshake','wave_start','room_enter'])E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));
const SAMPLER = ev(iife(`window.__s={rows:[],kd:[],last:-1};
  const f=()=>{const t=E.tick;if(t!==window.__s.last){const p=E.state().party[0];
    window.__s.rows.push([t,+p.x.toFixed(4),+p.z.toFixed(4),p.dashTicksLeft|0,p.hp]);window.__s.last=t;}
    requestAnimationFrame(f);};requestAnimationFrame(f);
  addEventListener('keydown',e=>{if(!e.repeat)window.__s.kd.push([e.code,E.tick]);},true);
  return 'sampler armed at '+E.tick`));

// ---- dash3: a boar parked beside the player bites for 30 s while the player dodges ----
files['certC3-dash3'] = [
  ARM,
  ev(iife(`E.cmd('startRun');return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 30000),
  ev(iife(`E.cmd('teleport',-3,2);
    const st=E.state();for(const e of st.enemies)E.cmd('iframe',e.id,20000);
    const id=E.cmd('spawn','boar',-3.0,2.7);
    (async()=>{while(true){const p=E.state().party[0];if(p.hp<60)E.cmd('heal',0,100);
      const b=E.state().enemies.find(e=>e.id===${'id'});await new Promise(r=>setTimeout(r,120));}})();
    return {biter:JSON.stringify(id),enemies:E.state().enemies.map(e=>[e.id,e.kind,e.iframed])}`)),
  wait(600),
  SAMPLER,
  ...Array.from({ length: 22 }).flatMap(() => [down('Space'), wait(80), up('Space'), wait(1180)]),
  wait(400),
  ev(iife(`const evs=window.__c.ev,S=window.__s.rows;
    const dashes=[];for(const i of evs.filter(e=>e.T==='intent'&&e.kind==='dodge')){
      const de=evs.find(e=>e.T==='dash_end'&&e.tick>=i.tick);dashes.push([i.tick,de?de.tick:i.tick+15]);}
    const inDash=t=>dashes.some(d=>t>=d[0]&&t<=d[1]);
    const hits=evs.filter(e=>e.T==='hit'&&e.target===0).map(e=>[e.tick,e.amount,inDash(e.tick)]);
    const imm=evs.filter(e=>e.T==='hit_immune'&&e.target===0).map(e=>[e.tick,e.reason,inDash(e.tick)]);
    return {fps:E.fps,tick:E.tick,dashes:dashes.length,dashSpans:dashes,
      hitsTotal:hits.length,hitsInsideDash:hits.filter(h=>h[2]).length,
      immuneTotal:imm.length,immuneInsideDash:imm.filter(h=>h[2]).length,
      hits,imm}`)),
];

// ---- telepx: per-rendered-frame canvas crop centred on the live telegraph ----
const PROJ = `window.__proj=(x,y,z)=>{const cam=window.__arenaProbe.stage.camera;cam.updateMatrixWorld();
  const mv=cam.matrixWorldInverse.elements,pm=cam.projectionMatrix.elements;
  const mul=(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3]];
  let v=mul(mv,[x,y,z,1]);v=mul(pm,v);const w=v[3]||1;
  return [Math.round((v[0]/w*0.5+0.5)*innerWidth),Math.round((-v[1]/w*0.5+0.5)*innerHeight)];};`;

files['certC3-telepx'] = [
  ARM,
  ev(iife(`E.cmd('startRun');
    (async()=>{while(true){try{const u=E.runUi();
      if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);
      else if(u.screen==='shop')E.cmd('shopAdvance');
      E.cmd('iframe',0,600);if(E.state().party[0].hp<100)E.cmd('heal',0,100);}catch(e){}
      await new Promise(r=>setTimeout(r,250));}})();return {seed:E.seed,tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=2`, 30000),
  ev(iife(`${PROJ}
    const W=360,H=280;window.__t={best:{},W,H,frames:0,live:0};
    const src=document.querySelector('canvas');
    const tmp=document.createElement('canvas');tmp.width=W;tmp.height=H;const g=tmp.getContext('2d',{willReadFrequently:true});
    const rgb2hsv=(r,gg,b)=>{r/=255;gg/=255;b/=255;const mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),d=mx-mn;let h=0;
      if(d){if(mx===r)h=60*(((gg-b)/d)%6);else if(mx===gg)h=60*((b-r)/d+2);else h=60*((r-gg)/d+4);}if(h<0)h+=360;
      return [h,mx?d/mx:0,mx*255];};
    const f=()=>{window.__t.frames++;
      const evs=window.__c.ev;const live=evs.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&!evs.some(r=>r.T==='telegraph_resolve'&&r.id===e.id&&r.tick>=e.tick));
      window.__t.live=live.length;
      for(const tg of live){
        const p=window.__proj(tg.x,0.02,tg.z);
        let sx=Math.max(0,Math.min(innerWidth-W,p[0]-W/2)),sy=Math.max(0,Math.min(innerHeight-H,p[1]-H/2));
        try{g.clearRect(0,0,W,H);g.drawImage(src,sx,sy,W,H,0,0,W,H);}catch(err){continue;}
        const d=g.getImageData(0,0,W,H).data;let danger=0;
        for(let i=0;i<d.length;i+=4){const hs=rgb2hsv(d[i],d[i+1],d[i+2]);
          if(hs[1]>0.35&&(0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2])>40&&hs[0]>=5&&hs[0]<25)danger++;}
        const k='t'+tg.id+'_'+tg.tick;const cur=window.__t.best[k];
        if(!cur||danger>cur.danger)window.__t.best[k]={id:tg.id,startTick:tg.tick,resolveTick:tg.resolveTick,shotTick:E.tick,
          ticksLeft:tg.resolveTick-E.tick,box:[sx,sy,W,H],danger,url:tmp.toDataURL('image/png')};}
      requestAnimationFrame(f);};requestAnimationFrame(f);return 'telepx sampler armed at '+E.tick`)),
  wait(45000),
  ev(iife(`const b=window.__t.best;return {frames:window.__t.frames,keys:Object.keys(b),
    rows:Object.values(b).map(v=>({id:v.id,startTick:v.startTick,resolveTick:v.resolveTick,shotTick:v.shotTick,ticksLeft:v.ticksLeft,box:v.box,danger:v.danger,bytes:v.url.length}))}`)),
  ev(iife(`const v=Object.values(window.__t.best).sort((a,b)=>b.danger-a.danger)[0];return v?('PNG0|'+JSON.stringify(v.box)+'|'+v.shotTick+'|'+v.danger+'|'+v.url):'none'`)),
  ev(iife(`const v=Object.values(window.__t.best).sort((a,b)=>b.danger-a.danger)[1];return v?('PNG1|'+JSON.stringify(v.box)+'|'+v.shotTick+'|'+v.danger+'|'+v.url):'none'`)),
  ev(iife(`const v=Object.values(window.__t.best).sort((a,b)=>b.danger-a.danger)[2];return v?('PNG2|'+JSON.stringify(v.box)+'|'+v.shotTick+'|'+v.danger+'|'+v.url):'none'`)),
  // real harness screenshots: fire the instant a telegraph goes live with >=30 ticks left
  { type: 'loop', label: 'waitTele1', cond: `(()=>{const E=__echoes;return window.__c.ev.some(e=>e.T==='telegraph_start'&&e.resolveTick-E.tick>=30&&!window.__c.ev.some(r=>r.T==='telegraph_resolve'&&r.id===e.id&&r.tick>=e.tick));})()`, maxMs: 30000, body: [wait(20)] },
  ev(iife(`const evs=window.__c.ev;const live=evs.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&!evs.some(r=>r.T==='telegraph_resolve'&&r.id===e.id&&r.tick>=e.tick));
    window.__pre={tick:E.tick,live:live.map(t=>[t.id,t.tick,t.resolveTick,t.resolveTick-E.tick,t.x,t.z,window.__proj(t.x,0.02,t.z)])};return window.__pre`)),
  shot('certC3-teleshot1'),
  ev(iife(`const evs=window.__c.ev;const live=evs.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&!evs.some(r=>r.T==='telegraph_resolve'&&r.id===e.id&&r.tick>=e.tick));
    return {postTick:E.tick,live:live.map(t=>[t.id,t.tick,t.resolveTick,t.resolveTick-E.tick,window.__proj(t.x,0.02,t.z)])}`)),
  { type: 'loop', label: 'waitTele2', cond: `(()=>{const E=__echoes;return window.__c.ev.some(e=>e.T==='telegraph_start'&&e.resolveTick-E.tick>=36&&!window.__c.ev.some(r=>r.T==='telegraph_resolve'&&r.id===e.id&&r.tick>=e.tick));})()`, maxMs: 30000, body: [wait(20)] },
  ev(iife(`const evs=window.__c.ev;const live=evs.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&!evs.some(r=>r.T==='telegraph_resolve'&&r.id===e.id&&r.tick>=e.tick));
    return {preTick:E.tick,live:live.map(t=>[t.id,t.tick,t.resolveTick,t.resolveTick-E.tick,window.__proj(t.x,0.02,t.z)])}`)),
  shot('certC3-teleshot2'),
  ev(iife(`const evs=window.__c.ev;const live=evs.filter(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&!evs.some(r=>r.T==='telegraph_resolve'&&r.id===e.id&&r.tick>=e.tick));
    return {postTick:E.tick,live:live.map(t=>[t.id,t.tick,t.resolveTick,t.resolveTick-E.tick,window.__proj(t.x,0.02,t.z)])}`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
