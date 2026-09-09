// certC2 generator, batch 2: telegraph PIXELS via per-frame canvas crops.
// A headless page.screenshot costs ~50 sim ticks, so it cannot land inside a
// 42-tick telegraph window. Instead we copy a region of the live WebGL canvas
// centred on the projected telegraph decal on every rendered frame while the
// telegraph is live, count Ember-danger pixels with the SAME rule as
// tools/analyze.mjs (hue 5-25 deg, sat > 0.35, luma > 40) and keep the peak
// frame as a data URL -> decoded to captures/certC2-telepx*.png by
// tools/certC2-telesheet.mjs, then measured again with analyze.mjs.
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const aiife = (body) => `(async()=>{const E=__echoes;const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));${body}})()`;
const EVT = ['telegraph_start', 'telegraph_resolve', 'enemy_fire', 'death', 'enemy_despawn', 'room_cleared', 'boss_quake_start', 'boss_quake_resolve'];

const armT = ev(iife(`
  window.__c={ev:[],tele:{},grabs:[]};
  for(const t of ${JSON.stringify(EVT)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));
  const cv=document.querySelector('canvas');window.__c.cv=cv;
  const CW=360,CH=280;const off=document.createElement('canvas');off.width=CW;off.height=CH;const ctx=off.getContext('2d',{willReadFrequently:true});
  const P=window.__arenaProbe;const cam=P.stage.camera;const V=P.root.position.constructor;
  const proj=(x,y,z)=>{const v=new V(x,y,z);v.project(cam);return [(v.x*0.5+0.5)*window.innerWidth,(-v.y*0.5+0.5)*window.innerHeight];};
  window.__c.proj=proj;
  // same band rule as tools/analyze.mjs
  const hsv=(r,g,b)=>{r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b),d=M-m;let h=0;if(d){if(M===r)h=60*(((g-b)/d)%6);else if(M===g)h=60*(((b-r)/d)+2);else h=60*(((r-g)/d)+4);}if(h<0)h+=360;return [h,M?d/M:0,M];};
  const bands=(d)=>{let danger=0,violet=0,amber=0,heal=0,a160=0,a200=0;const n=d.length/4;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];const L=0.2126*r+0.7152*g+0.0722*b;if(L>160)a160++;if(L>200)a200++;const [h,s]=hsv(r,g,b);if(s>0.35&&L>40){if(h>=5&&h<25)danger++;else if(h>=110&&h<150)heal++;else if(h>=245&&h<285)violet++;else if(h>=30&&h<50)amber++;}}return {danger,heal,violet,amber,a160,a200,n};};
  window.__c.bands=bands;
  const grab=()=>{
    const t=E.tick;
    const live=window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>t&&e.tick<=t);
    for(const s of live){
      const c=proj(s.x,0.02,s.z);const x=Math.round(c[0]-CW/2),y=Math.round(c[1]-CH/2);
      if(x<0||y<0||x+CW>cv.width||y+CH>cv.height)continue;
      ctx.clearRect(0,0,CW,CH);ctx.drawImage(cv,x,y,CW,CH,0,0,CW,CH);
      const st=bands(ctx.getImageData(0,0,CW,CH).data);
      const key=s.id+'@'+s.tick;const prev=window.__c.tele[key];
      if(!prev||st.danger>prev.st.danger)window.__c.tele[key]={id:s.id,start:s.tick,resolveTick:s.resolveTick,t,left:s.resolveTick-t,box:[x,y,CW,CH],world:[s.x,s.z],st,url:off.toDataURL('image/png')};
    }};
  const f=()=>{if(window.__c.on)grab();requestAnimationFrame(f);};requestAnimationFrame(f);
  return 'telepx armed t'+E.tick+' ver '+E.version+' canvas '+cv.width+'x'+cv.height`));

const files = {};
files['certC2-telepx'] = [
  armT,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,ver:E.version,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<40000){const s=E.state();if(s.run.active&&s.run.combatActive&&s.enemies.length>0)return {ok:true,tick:E.tick,enemies:s.enemies.length};await sleep(20);}return {ok:false,tick:E.tick}`)),
  ev(iife(`E.cmd('iframe',0,3600);window.__c.on=true;return 'grab on t'+E.tick`)),
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<100000){const u=E.runUi();if(u.screen==='draft')E.cmd('draftDecline');else if(u.screen==='path')E.cmd('pathChoose',0);else if(u.screen==='shop')E.cmd('shopAdvance');if(Object.keys(window.__c.tele).length>=4)break;await sleep(40);}window.__c.on=false;return {tick:E.tick,fps:E.fps,collected:Object.keys(window.__c.tele).length,summary:Object.entries(window.__c.tele).map(([k,v])=>[k,v.t,v.left,v.st.danger,v.st.violet,v.st.amber,v.box])}`)),
  ...[0, 1, 2, 3].map((i) => ev(iife(`const es=Object.values(window.__c.tele);const v=es[${i}];if(!v)return {telepx:${i},none:true};return JSON.stringify({telepx:${i},id:v.id,start:v.start,resolveTick:v.resolveTick,t:v.t,left:v.left,world:v.world,box:v.box,st:v.st,url:v.url})`))),
  ev(iife(`const ev=window.__c.ev;const st=ev.filter(e=>e.T==='telegraph_start');const rs=ev.filter(e=>e.T==='telegraph_resolve');return {starts:st.length,resolves:rs.length,pairs:st.map(s=>{const r=rs.find(x=>x.id===s.id&&x.tick>=s.tick);return [s.id,s.tick,s.resolveTick,s.resolveTick-s.tick,r&&r.tick,r?r.tick-s.tick:null]})}`)),
];

// Full-frame Ember check: repeated shots while mantises telegraph, so at least
// one full PNG lands with an Ember decal on the ground.
files['certC2-telefull'] = [
  armT,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,ver:E.version,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 450 },
  ev(aiife(`const t0=performance.now();while(performance.now()-t0<40000){const s=E.state();if(s.run.active&&s.run.combatActive&&s.enemies.length>0)return {ok:true,tick:E.tick,enemies:s.enemies.length};await sleep(20);}return {ok:false,tick:E.tick}`)),
  ev(iife(`E.cmd('iframe',0,3600);E.cmd('killAllEnemies');E.cmd('teleport',0,0);return 'setup t'+E.tick`)),
  wait(600),
  ev(iife(`const out=[];for(const p of [[3.6,0],[ -3.6,0],[0,3.2],[0,-3.2],[3.0,2.6],[-3.0,-2.6]])out.push(E.cmd('spawn','mantis',p[0],p[1]));const s=E.state();return {spawned:out.length,enemies:s.enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2)])}`)),
  wait(500),
  ev(iife(`window.__c.on=true;return 'grab on t'+E.tick`)),
  ...[0, 1, 2, 3, 4, 5].flatMap((i) => [
    ev(iife(`const t=E.tick;const live=window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>t&&e.tick<=t);const pr=window.__c.proj;return {pre:${i},tick:t,live:live.map(s=>[s.id,s.tick,s.resolveTick,s.resolveTick-t,pr(s.x,0.02,s.z).map(Math.round)]),enemies:E.state().enemies.length}`)),
    shot(`certC2-telefull_${i}`),
    ev(iife(`const t=E.tick;const live=window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>t&&e.tick<=t);const pr=window.__c.proj;return {post:${i},tick:t,live:live.map(s=>[s.id,s.tick,s.resolveTick,s.resolveTick-t,pr(s.x,0.02,s.z).map(Math.round)]),spanned:window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick>t-60&&e.tick<=t).map(s=>[s.id,s.tick,s.resolveTick])}`)),
    wait(250),
  ]),
  ev(iife(`window.__c.on=false;return {collected:Object.keys(window.__c.tele).length,summary:Object.entries(window.__c.tele).map(([k,v])=>[k,v.t,v.left,v.st.danger,v.box])}`)),
  ...[0, 1, 2].map((i) => ev(iife(`const es=Object.values(window.__c.tele);const v=es[${i}];if(!v)return {telepx:${i},none:true};return JSON.stringify({telepx:'full'+${i},id:v.id,start:v.start,resolveTick:v.resolveTick,t:v.t,left:v.left,world:v.world,box:v.box,st:v.st,url:v.url})`))),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
