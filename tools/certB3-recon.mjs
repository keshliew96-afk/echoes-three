import { ev, wait, iife, snap, write, shot } from './certB3-gen.mjs';
write('certB3-recon', [
  wait(1500),
  snap('camp-boot'),
  ev(iife(`const c=E.cmd('campState');return JSON.stringify(c).slice(0,3000)`)),
  ev(iife(`return {keys:Object.keys(E), cmdList:(typeof E.cmds!=='undefined')?E.cmds:null}`)),
  ev(iife(`const p=document.querySelector('#camp-prompt,.camp-prompt,[data-prompt]');return {domPrompt:p?{cls:p.className,txt:(p.textContent||'').trim().slice(0,120),disp:getComputedStyle(p).display,op:getComputedStyle(p).opacity,rect:p.getBoundingClientRect().toJSON()}:null, all:[...document.querySelectorAll('#hud *, #camp *')].filter(n=>/press|begin|portal|enter/i.test(n.textContent||'')&&n.children.length===0).map(n=>[n.className||n.id,(n.textContent||'').trim().slice(0,60)]).slice(0,12)}`)),
  shot('certB3-recon-camp'),
]);
