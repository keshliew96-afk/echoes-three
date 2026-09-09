// certD2 batch 10 — D6 layout sweep, v2: curated HUD-component rects, container transparency check,
// leaf inventory, outside-viewport and component-overlap tests.
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, arm } from './certD2-gen.mjs';
const files = {};
const COMPSEL = ['#hud-banner','.hud-loc','.hud-glint','#proto-hud','.hud-port','.hud-port-hp','.hud-slot',
  '#version-label','#fps-meter','#camp-prompt','#hud-threat > svg','.hud-boss','.hud-objective','.hud-way',
  '#run-screen .rn-page','#run-screen .rn-card','#run-screen .rn-door','#run-screen button','#run-screen .rn-title',
  '#run-screen .rn-hint','#run-screen .rn-wallet','#run-screen .rn-plaque','#run-screen .rn-sub','#run-screen .rn-coin'];
const CONTSEL = ['#app','#hud','#hud-threat','#dmg-num-layer','#nd-fizzle-layer','#run-screen'];
const RECTS = (tag) => ev(`(()=>{const E=__echoes;const vw=innerWidth,vh=innerHeight;
const vis=n=>{const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.02)return false;const r=n.getBoundingClientRect();return r.width>0.5&&r.height>0.5;};
const nm=n=>{let s=n.id?'#'+n.id:'';if(n.classList&&n.classList.length)s+='.'+[...n.classList].join('.');return s||n.tagName.toLowerCase();};
const box=n=>{const r=n.getBoundingClientRect();const cs=getComputedStyle(n);
 return {n:nm(n),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
  fs:+parseFloat(cs.fontSize).toFixed(1),txt:(n.textContent||'').trim().replace(/\s+/g,' ').slice(0,34)};};
const comps=[];for(const s of ${JSON.stringify(COMPSEL)}){for(const n of document.querySelectorAll(s)){if(vis(n)&&!comps.includes(n))comps.push(n);}}
const cr=comps.map(box);
const outside=cr.filter(r=>r.x<-0.5||r.y<-0.5||r.x+r.w>vw+0.5||r.y+r.h>vh+0.5);
const ov=[];for(let i=0;i<comps.length;i++)for(let j=i+1;j<comps.length;j++){
 if(comps[i].contains(comps[j])||comps[j].contains(comps[i]))continue;
 const a=cr[i],b=cr[j];const ix=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),iy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
 if(ix>1&&iy>1)ov.push([a.n,b.n,+ix.toFixed(1),+iy.toFixed(1)]);}
const conts=[];for(const s of ${JSON.stringify(CONTSEL)}){const n=document.querySelector(s);if(!n)continue;const r=n.getBoundingClientRect();const cs=getComputedStyle(n);
 conts.push({n:s,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),bg:cs.backgroundColor,border:cs.borderTopWidth,pe:cs.pointerEvents,tf:cs.transform.slice(0,44),vis:cs.display!=='none'&&cs.visibility!=='hidden'});}
const leaves=[...document.body.querySelectorAll('*')].filter(n=>n.childElementCount===0&&n.tagName!=='CANVAS'&&n.tagName!=='SCRIPT'&&n.tagName!=='STYLE'&&vis(n)).map(box);
const lOut=leaves.filter(r=>r.x<-0.5||r.y<-0.5||r.x+r.w>vw+0.5||r.y+r.h>vh+0.5);
const xs=cr.map(r=>r.x),ys=cr.map(r=>r.y),rs=cr.map(r=>r.x+r.w),bs=cr.map(r=>r.y+r.h);
const texts=cr.filter(r=>r.txt);
return {tag:${JSON.stringify(tag)},vw,vh,nComp:cr.length,nLeaf:leaves.length,
 outside,leavesOutside:lOut,overlaps:ov,
 extremes:{minX:Math.min(...xs),minY:Math.min(...ys),maxRight:Math.max(...rs),maxBottom:Math.max(...bs)},
 minFontPx:Math.min(...leaves.filter(r=>r.txt).map(r=>r.fs)),
 comps:cr,containers:conts};})()`);

const camp = [ev(iife(`return {ver:E.version,scene:E.state().scene,vp:[innerWidth,innerHeight]}`)), RECTS('camp'),
  ev(iife(`E.cmd('teleport',0,-5.6);return 'to portal'`)), wait(1000),
  ev(iife(`const c=E.cmd('campState');return {inPortal:c.inPortal,promptVisible:c.promptVisible}`)), RECTS('camp-prompt'), shot('_camp')];
const combat = [arm, ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',1);return {room:r&&r.room,vp:[innerWidth,innerHeight]}`)),
  { type: 'mousemove', x: 400, y: 300 }, waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.length`),
  { type: 'mousedown', button: 'right' }, wait(700),
  ev(iife(`return {banner:E.hud.banner().text,threat:JSON.stringify(E.hud.threat()).slice(0,300)}`)), RECTS('combat'), shot('_combat'), { type: 'mouseup', button: 'right' }];
const shop = [arm, ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {room:r&&r.room,vp:[innerWidth,innerHeight]}`)), wait(2500),
  ev(iife(`return JSON.stringify(E.runUi()).slice(0,1400)`)), RECTS('shop'), shot('_shop')];
const boss = [arm, ev(iife(`E.cmd('startRun');E.cmd('skipToRoom',8);return {vp:[innerWidth,innerHeight]}`)),
  { type: 'mousemove', x: 800, y: 300 }, waitFor(`E.cmd('runState').boss&&E.state().enemies.length>=1`, 60000, `,boss:E.cmd('runState').boss.pct`), wait(1500),
  ev(iife(`return {banner:E.hud.banner().text}`)), RECTS('boss'), shot('_boss')];
const draft = [arm, ev(iife(`E.cmd('startRun');E.cmd('skipToRoom',1);return {vp:[innerWidth,innerHeight]}`)),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<60000){const u=E.runUi();if(u.screen!=='none')return {screen:u.screen,tick:E.tick};if(E.state().enemies.length>0)E.cmd('killAllEnemies');await new Promise(r=>setTimeout(r,250));}return {screen:'timeout'}})()`),
  wait(1500), ev(iife(`return JSON.stringify(E.runUi()).slice(0,1200)`)), RECTS('draft'), shot('_draft')];
files['certD2-l2-camp'] = camp; files['certD2-l2-combat'] = combat; files['certD2-l2-shop'] = shop;
files['certD2-l2-boss'] = boss; files['certD2-l2-draft'] = draft;
for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
