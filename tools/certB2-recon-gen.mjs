// certB2 recon (block B, round 2) — NOT evidence. Dumps live DOM rects / API shapes at the
// current build so the certified generator's click grids are calibrated to real pixels.
//   node tools/certB2-recon-gen.mjs
//   node tools/cert-capture.mjs shot certB2-recon --url "http://127.0.0.1:5199/?seed=777" \
//        --settle 2500 --actions tools/actions/certB2-recon.json --timeout 180000
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const IF = (cond, then) => ({ type: 'if', cond: iife(`return !!(${cond})`), then });
const LOOP = (label, cond, maxMs, body) => ({ type: 'loop', label, cond: iife(`return !!(${cond})`), maxMs, body });
const waitFor = (cond, timeout = 20000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick${extra}}})()`);

// Dump every visible element under a root that carries a class, with its rect.
const domDump = (root, label) => ev(iife(`const rt=document.querySelector(${JSON.stringify(root)});if(!rt)return {dump:${JSON.stringify(label)},missing:${JSON.stringify(root)}};
const out=[];for(const n of rt.querySelectorAll('*')){if(!n.className||typeof n.className!=='string')continue;const r=n.getBoundingClientRect();if(r.width<6||r.height<6)continue;const st=getComputedStyle(n);if(st.display==='none'||st.opacity==='0'||st.visibility==='hidden')continue;
out.push([n.className.slice(0,40),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),Math.round(r.x+r.width/2),Math.round(r.y+r.height/2),(n.textContent||'').replace(/\\s+/g,' ').trim().slice(0,34)]);}
return {dump:${JSON.stringify(label)},screen:E.runUi().screen,n:out.length,els:out.slice(0,60)}`));

const A = [];
A.push(ev(iife(`return {version:E.version,tick:E.tick,seed:E.seed,bootSeed:E.bootSeed,scene:E.state().scene,href:location.href,cmds:Object.keys(E)}`)));
A.push(ev(iife(`const c=E.cmd('campState');return {campState:c}`)));
A.push(ev(iife(`const p=document.querySelector('#camp-prompt');return {promptNode:!!p,display:p&&getComputedStyle(p).display,text:p&&p.textContent.replace(/\\s+/g,' ').trim(),chips:p&&[...p.querySelectorAll('.cp-key')].map(k=>k.textContent.trim())}`)));
A.push(shot('certB2-recon-boot'));

// Force into a run with commands (recon only).
A.push(ev(iife(`const r=E.cmd('startRun');return {startRun:r,run:E.cmd('runState'),seed:E.seed}`)));
A.push(waitFor(`E.state().run.active && E.state().run.phase==='combat'`, 12000, `,run:E.cmd('runState')`));
A.push(wait(800));
A.push(ev(iife(`const s=E.state();return {room1:s.room,enemies:s.enemies.length,party:s.party.map(p=>[p.id,p.classId,p.hp,p.maxHp]),skills:s.skills.map(k=>k&&k.id),hud:E.hud.combat(),banner:E.hud.banner()}`)));
A.push(shot('certB2-recon-room1'));
// Clear it with commands until a screen appears.
A.push(LOOP('clear-r1', `E.runUi().screen!=='none'`, 30000, [
  ev(iife(`E.cmd('killAllEnemies');return null`)), wait(500),
]));
A.push(wait(600));
A.push(ev(iife(`const u=E.runUi();return {ui:u}`)));
A.push(domDump('#run-screen', 'draft'));
A.push(shot('certB2-recon-draft'));
// Take by Enter, then look at the socket overlay if any.
A.push(key('Enter', 80), wait(900));
A.push(ev(iife(`return {afterTake:E.runUi().screen,socketOpen:!!document.querySelector('#socket-screen.nd-open'),skills:E.state().skills.map(k=>k&&k.id),bench:E.state().build.bench}`)));
A.push(IF(`document.querySelector('#socket-screen')`, [domDump('#socket-screen', 'socket'), shot('certB2-recon-socket'),
  ev(iife(`const cs=[...document.querySelectorAll('#socket-screen .nd-bench .nd-card')];const cells=[...document.querySelectorAll('#socket-screen .nd-cell')];const rr=n=>{const r=n.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),Math.round(r.x+r.width/2),Math.round(r.y+r.height/2)]};return {benchCards:cs.map(rr),cells:cells.map(c=>[c.className.slice(0,30),...rr(c)])}`)),
  key('Escape', 80), wait(500)]));
A.push(ev(iife(`return {screenNow:E.runUi().screen}`)));
A.push(domDump('#run-screen', 'path'));
A.push(ev(iife(`const u=E.runUi();return {doors:u.doors,options:E.state().run.path&&E.state().run.path.options}`)));
A.push(shot('certB2-recon-path'));
A.push(key('Enter', 80), wait(1200));
// Shop
A.push(ev(iife(`const r=E.cmd('skipToRoom',7);return {skip7:r,screen:E.runUi().screen}`)));
A.push(waitFor(`E.runUi().screen==='shop'`, 12000, `,screen:E.runUi().screen,phase:E.state().run.phase`));
A.push(wait(700));
A.push(domDump('#run-screen', 'shop'));
A.push(ev(iife(`const u=E.runUi();return {cards:u.cards,plaques:u.plaques,buttons:u.buttons,wallet:u.wallet,stock:E.state().run.shop&&E.state().run.shop.stock}`)));
A.push(shot('certB2-recon-shop'));
// Boss + end screen
A.push(ev(iife(`const r=E.cmd('skipToRoom',8);return {skip8:r}`)));
A.push(waitFor(`E.state().run.boss&&E.state().run.boss.active`, 15000, `,boss:E.state().run.boss`));
A.push(wait(600));
A.push(shot('certB2-recon-boss'));
A.push(ev(iife(`return {killBoss:E.cmd('killBoss'),boss:E.state().run.boss}`)));
A.push(LOOP('mopup', `E.runUi().screen==='end'`, 30000, [ev(iife(`E.cmd('killAllEnemies');return null`)), wait(500)]));
A.push(wait(800));
A.push(domDump('#run-screen', 'end'));
A.push(ev(iife(`const u=E.runUi();return {screen:u.screen,text:u.text.slice(0,400),buttons:u.buttons,summary:E.state().run.summary}`)));
A.push(shot('certB2-recon-end'));
A.push(key('Enter', 80), wait(1500));
A.push(ev(iife(`return {scene:E.state().scene,camp:E.cmd('campState').mode,screen:E.runUi().screen}`)));

writeFileSync('tools/actions/certB2-recon.json', JSON.stringify(A, null, 1));
console.log('wrote tools/actions/certB2-recon.json', A.length, 'steps');
