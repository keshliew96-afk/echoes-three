import { ev, wait, key, shot, click, mm, iife, arm, waitFor } from './certB3-parts.mjs';
import { write } from './certB3-gen.mjs';
const dom = (tag) => ev(iife(`const vis=n=>{const c=getComputedStyle(n);const r=n.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&+c.opacity>0.05&&r.width>0&&r.height>0};
const roots=[...document.body.children].map(n=>[n.tagName+'#'+(n.id||'')+'.'+(n.className||''),vis(n),getComputedStyle(n).zIndex,JSON.stringify(n.getBoundingClientRect().toJSON())]);
const sock=document.querySelector('#socket-screen,.socket-screen,[id*=socket],[class*=socket]');
const items=sock?[...sock.querySelectorAll('*')].filter(n=>vis(n)&&n.children.length===0||/(bench|slot|cell|node|row)/i.test(n.className)).map(n=>{const r=n.getBoundingClientRect();return [n.className||n.tagName,(n.textContent||'').replace(/\s+/g,' ').trim().slice(0,30),Math.round(r.x),Math.round(r.y),Math.round(r.w||r.width),Math.round(r.height)]}).filter(a=>a[4]>0).slice(0,40):null;
const u=E.runUi();
return {tag:${JSON.stringify(tag)},tick:E.tick,uiScreen:u.screen,uiKeys:Object.keys(u),open:u.open,sockId:sock?sock.id+'.'+sock.className:null,sockVis:sock?vis(sock):null,roots,items}`));
write('certB3-sock', [
  wait(1200), arm, mm(800,450),
  ev(iife(`E.cmd('startRun');return {seed:E.seed}`)),
  waitFor(`window.__echoes.runUi().screen==='draft'`, 90000, `,screen:E.runUi().screen`),
  key('Escape', 90), wait(1200),
  ev(iife(`const r=E.cmd('grantNode','sharpen');return {grant:JSON.stringify(r).slice(0,200),bench:E.state().build.bench,screen:E.runUi().screen}`)),
  dom('before-B'),
  key('KeyB', 100), wait(1500),
  shot('certB3-sock-open'),
  dom('after-B'),
  ev(iife(`const u=E.runUi();return {full:JSON.stringify(u).slice(0,1200)}`)),
  // real-input socket: click the bench node, then a slot cell
  click(360, 247), wait(900), dom('after-clickBench'),
  click(1126, 348), wait(900), shot('certB3-sock-socketed'),
  ev(iife(`return {bench:E.state().build.bench,socketed:JSON.stringify(E.state().build).slice(0,400),ev:window.__b3.ev.map(e=>e.T+'@'+e.tick).slice(-8)}`)),
  key('Escape', 100), wait(1200), shot('certB3-sock-closed'),
  dom('after-escape'),
]);
