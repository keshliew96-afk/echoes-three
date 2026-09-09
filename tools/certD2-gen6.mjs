// certD2 batch 6 — D6 layout sweep: camp / combat / shop at 1024x576 and 2560x1440.
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, arm } from './certD2-gen.mjs';
const files = {};
const RECTS = (tag) => ev(`(()=>{const E=__echoes;
const vw=innerWidth,vh=innerHeight;
const all=[...document.body.querySelectorAll('*')].filter(n=>{
  if(n.tagName==='CANVAS'||n.tagName==='SCRIPT'||n.tagName==='STYLE')return false;
  const cs=getComputedStyle(n);
  if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.02)return false;
  const r=n.getBoundingClientRect();
  return r.width>0.5&&r.height>0.5;});
const nm=n=>(n.id?'#'+n.id:'')+(n.className&&typeof n.className==='string'?'.'+n.className.trim().split(/\s+/).join('.'):'')||n.tagName.toLowerCase();
const rec=all.map(n=>{const r=n.getBoundingClientRect();const cs=getComputedStyle(n);
  return {n:nm(n),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
    fs:+parseFloat(cs.fontSize).toFixed(1),txt:(n.childElementCount===0?(n.textContent||'').trim().slice(0,28):'')};});
const outside=rec.filter(r=>r.x<-0.5||r.y<-0.5||r.x+r.w>vw+0.5||r.y+r.h>vh+0.5);
const ov=[];
for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
  const a=all[i],b=all[j];
  if(a.contains(b)||b.contains(a))continue;
  const ra=rec[i],rb=rec[j];
  const ix=Math.min(ra.x+ra.w,rb.x+rb.w)-Math.max(ra.x,rb.x);
  const iy=Math.min(ra.y+ra.h,rb.y+rb.h)-Math.max(ra.y,rb.y);
  if(ix>1&&iy>1)ov.push([ra.n,rb.n,+ix.toFixed(1),+iy.toFixed(1)]);}
return {tag:${JSON.stringify(tag)},vw,vh,n:rec.length,outside,overlaps:ov,rects:rec};})()`);

files['certD2-lay-camp'] = [
  ev(iife(`return {ver:E.version,scene:E.state().scene,tick:E.tick,vp:[innerWidth,innerHeight]}`)),
  RECTS('camp'),
  ev(iife(`E.cmd('teleport',0,-5.6);return 'to portal'`)), wait(900),
  ev(iife(`const c=E.cmd('campState');return {inPortal:c.inPortal,promptVisible:c.promptVisible,prompt:c.prompt.box}`)),
  RECTS('camp-prompt'),
  shot('_camp-prompt'),
];
files['certD2-lay-combat'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',1);return {room:r&&r.room,mode:r&&r.mode,vp:[innerWidth,innerHeight]}`)),
  { type: 'mousemove', x: 400, y: 300 },
  waitFor(`E.state().enemies.length>=3`, 40000, `,enemies:E.state().enemies.length`),
  { type: 'mousedown', button: 'right' }, wait(500),
  ev(iife(`return {banner:E.hud.banner().text,combat:JSON.stringify(E.hud.combat()).slice(0,900),threat:JSON.stringify(E.hud.threat()).slice(0,500)}`)),
  RECTS('combat'),
  shot('_combat'),
  { type: 'mouseup', button: 'right' },
];
files['certD2-lay-shop'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {room:r&&r.room,mode:r&&r.mode,vp:[innerWidth,innerHeight]}`)),
  wait(2200),
  ev(iife(`return JSON.stringify(E.runUi()).slice(0,1800)`)),
  RECTS('shop'),
  shot('_shop'),
];
files['certD2-lay-boss'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room,vp:[innerWidth,innerHeight]}`)),
  { type: 'mousemove', x: 800, y: 300 },
  waitFor(`(E.cmd('runState').boss)&&E.state().enemies.length>=1`, 60000, `,boss:E.cmd('runState').boss,enemies:E.state().enemies.length`),
  wait(1500),
  ev(iife(`return {banner:E.hud.banner().text,boss:E.cmd('runState').boss}`)),
  RECTS('boss'),
  shot('_boss'),
];
files['certD2-lay-draft'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',1);return {room:r&&r.room,vp:[innerWidth,innerHeight]}`)),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<60000){const u=E.runUi();if(u.screen!=='none')return {screen:u.screen,tick:E.tick};if(E.state().enemies.length>0)E.cmd('killAllEnemies');await new Promise(r=>setTimeout(r,250));}return {screen:'timeout'}})()`),
  wait(1200),
  ev(iife(`return JSON.stringify(E.runUi()).slice(0,1500)`)),
  RECTS('draft'),
  shot('_draft'),
];
for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
