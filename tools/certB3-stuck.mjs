import { ev, wait, key, down, up, shot, click, mm, iife, snap, arm, evDetail, waitFor,
         fightLoop, dumpUi, screenLoop, portalStart } from './certB3-parts.mjs';
import { write } from './certB3-gen.mjs';

const deep = (tag) => ev(iife(`const u=E.runUi();const rs=document.querySelector('#run-screen');const cs=rs?getComputedStyle(rs):null;const el=document.elementFromPoint(703,399);const path=[];let n=el;while(n&&path.length<6){const c=getComputedStyle(n);path.push([n.tagName+'.'+(n.className||''),c.pointerEvents,c.opacity,c.display,c.zIndex]);n=n.parentElement;}
const pages=[...document.querySelectorAll('#run-screen .rn-page')].map(p=>[p.className,getComputedStyle(p).display,getComputedStyle(p).opacity,getComputedStyle(p).pointerEvents]);
return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,phase:u.phase,room:u.room,open:u.open,held:u.held,stale:u.stale,fade:u.fade,veil:u.veil,doors:u.doors.map(d=>[d.glyphs.join(''),d.focused,d.box.x,d.box.y]),reward:JSON.stringify(E.cmd('runState').reward),path:JSON.stringify(E.cmd('runState').path),rewardFor:JSON.stringify(E.cmd('runState').rewardFor),freeSlots:u.freeSkillSlots,bench:E.state().build.bench,active:document.activeElement?document.activeElement.tagName+'.'+document.activeElement.className:null,runScreen:cs?{display:cs.display,opacity:cs.opacity,pointerEvents:cs.pointerEvents,zIndex:cs.zIndex,visibility:cs.visibility}:null,hitStack:path,pages}`));

const acts = [wait(1200), arm, ...portalStart('stuck'), wait(1000)];
for (let i = 1; i <= 3; i++) {
  acts.push({ type: 'mousedown', button: 'right' });
  acts.push(fightLoop(i, 200000));
  acts.push({ type: 'mouseup', button: 'right' });
  acts.push(wait(700));
  acts.push(ev(iife(`return {room:${i},screen:E.runUi().screen,tick:E.tick}`)));
  if (i < 3) { acts.push(screenLoop(`stuck-r${i}`, 40000)); acts.push(wait(600)); }
}
acts.push(waitFor(`window.__echoes.runUi().screen!=='none'`, 20000, `,screen:E.runUi().screen`));
acts.push(wait(1200));
acts.push(shot('certB3-stuck-screen'));
acts.push(deep('at-stuck'));
acts.push(evDetail('stuck-events'));
// battery of real-input recovery attempts, each followed by a probe
acts.push(mm(703, 399)); acts.push(wait(300)); acts.push(click(703, 399)); acts.push(wait(1200)); acts.push(deep('after-click-door1'));
acts.push(key('ArrowRight', 90)); acts.push(wait(900)); acts.push(deep('after-arrowright'));
acts.push(key('Enter', 90)); acts.push(wait(1200)); acts.push(deep('after-enter'));
acts.push(click(897, 405)); acts.push(wait(1200)); acts.push(deep('after-click-door2'));
acts.push(key('Escape', 90)); acts.push(wait(900)); acts.push(deep('after-escape'));
acts.push(key('KeyB', 90)); acts.push(wait(1200)); acts.push(shot('certB3-stuck-afterB')); acts.push(deep('after-B'));
acts.push(key('Space', 90)); acts.push(wait(900)); acts.push(deep('after-space'));
acts.push(key('KeyD', 90)); acts.push(wait(400)); acts.push(key('Enter', 90)); acts.push(wait(1200)); acts.push(deep('after-D-enter'));
acts.push(shot('certB3-stuck-final'));
// last resort: does the SIM accept the choice when the input layer is bypassed?
acts.push(ev(iife(`let r;try{r=E.cmd('pathChoose',0)}catch(e){r='ERR '+e}return {cmdPathChoose:JSON.stringify(r).slice(0,400)}`)));
acts.push(wait(1500)); acts.push(deep('after-cmd-pathChoose'));
acts.push(shot('certB3-stuck-aftercmd'));
write('certB3-stuck', acts);
