// Critic probe generator (round D HUD critique). Emits tools/actions/xhd-*.json.
import { writeFileSync } from 'fs';
const out = (name, acts) => writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 50) => ({ type: 'key', key: k, ms });
const mouseCentre = { type: 'mousemove', x: 800, y: 450 };

// helpers shared by evals (IIFE-safe: attached to window once)
const LIB = `(()=>{window.__X=window.__X||{};const E=window.__echoes;window.__X.pid=(i)=>{const p=E.state().party;const m=p.find(q=>(q.partyIndex??0)===i);return m?m.id:null;};window.__X.rects=()=>{const SEL=['.hud-slot-key','.hud-port-key','.hud-slot-abbrev','.hud-slot-num','.hud-port-num','.hud-port-e','.hud-slot-passive','.hud-bn-label','.hud-bn-num','.hud-bn-pips','.hud-bn-bar','.tm-badge'];const vis=(n)=>{const r=n.getBoundingClientRect();let p=n;while(p&&p!==document.body){const c=getComputedStyle(p);if(c.display==='none'||Number(c.opacity)<0.02)return null;p=p.parentElement;}return r.width>0.5&&r.height>0.5?r:null;};const rs=[];for(const s of SEL)for(const n of document.querySelectorAll(s)){const r=vis(n);if(r)rs.push({s,txt:(n.textContent||'').trim().slice(0,8),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),fs:+(parseFloat(getComputedStyle(n).fontSize)).toFixed(1)});}const hits=[];for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],b=rs[j];const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);const oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);if(ox>0.5&&oy>0.5)hits.push({a:a.s+':'+a.txt,b:b.s+':'+b.txt,ox:+ox.toFixed(1),oy:+oy.toFixed(1)});}return {n:rs.length,overlaps:hits,rects:rs};};return 'lib';})()`;

// Restart the CURRENT room's wave schedule (fresh wave 1) instead of clearing
// it, so the run stays in combat and the banner stays up.
const FRESH = `(()=>{const E=window.__echoes;const r=E.cmd('startRoom','kill_all');const s=E.cmd('runState');return {room:s&&s.room,phase:s&&s.phase,mode:r&&r.mode};})()`;

// ---- A. portrait states (a): healthy+selected, hurt, critical(peak bone), being-revived
const SET_A = `(()=>{const E=window.__echoes;const X=window.__X;E.cmd('setHp',X.pid(1),0.4);E.cmd('setHp',X.pid(2),0.12);E.cmd('setHp',X.pid(3),0);E.hud.freeze(0.25);if(E.hud.overrideIndex()!==0)E.cmd('healOverride',0);return E.hud.portraits().map(p=>p.state);})()`;
const READ_A = `(()=>{const E=window.__echoes;return {tick:E.tick,ports:E.hud.portraits().map(p=>({i:p.index,c:p.classId,st:p.state,sel:p.selected,hov:p.hover,hp:p.hpWidth,num:p.numeral,inner:p.innerBorder+' '+p.innerColor,outline:p.trackOutline,fill:p.fillImage,track:p.trackColor,keyBox:p.keyBox,numBox:p.numBox,tile:p.tileBox,rev:p.reviveOffset,img:p.hasImage})),rects:window.__X.rects(),metrics:E.hud.metrics(),revive:E.cmd('reviveState'),banner:E.hud.banner()};})()`;
out('xhd-states-a', [ev(LIB), ev(FRESH), mouseCentre, ev(SET_A), wait(1500), ev(SET_A), wait(60), ev(READ_A)]);

// ---- A2. states (b): hover on hurt, critical LOW phase, revive further along
const SET_B = `(()=>{const E=window.__echoes;const X=window.__X;E.cmd('setHp',X.pid(1),0.4);E.cmd('setHp',X.pid(2),0.12);E.hud.freeze(0.0);E.hud.hover(1,true);return E.hud.portraits().map(p=>p.state);})()`;
const READ_B = `(()=>{const E=window.__echoes;const t=[...document.querySelectorAll('.hud-port-tile')];return {tick:E.tick,ports:E.hud.portraits().map((p,i)=>({i:p.index,st:p.state,sel:p.selected,hov:p.hover,hp:p.hpWidth,num:p.numeral,inner:p.innerBorder+' '+p.innerColor,tileBorder:getComputedStyle(t[i]).borderTopColor,tileBg:getComputedStyle(t[i]).backgroundImage.slice(0,70),rev:p.reviveOffset,revTot:p.reviveTotal,revPct:+(1-p.reviveOffset/p.reviveTotal).toFixed(3)})),revive:E.cmd('reviveState'),rects:window.__X.rects()};})()`;
out('xhd-states-b', [ev(LIB), ev(FRESH), mouseCentre, ev(SET_A), wait(2600), ev(SET_B), wait(80), ev(READ_B)]);

// ---- A3. revive-interrupted: drain + shake; and 2 Hz pulse proof
const BREAK = `(()=>{const E=window.__echoes;E.hud.unfreeze();const r0=E.cmd('reviveState');const b=E.cmd('breakRevive','debug');return {before:r0,broke:b};})()`;
const READ_C = `(()=>{const E=window.__echoes;const cells=[...document.querySelectorAll('.hud-port')];return {tick:E.tick,ports:E.hud.portraits().map(p=>({i:p.index,st:p.state,rev:p.reviveOffset,revPct:+(1-p.reviveOffset/p.reviveTotal).toFixed(3),ringStroke:document.querySelectorAll('.hud-port-ring .rf')[p.index].style.stroke})),shake:cells.map(c=>c.className),anims:E.hud.animations(),revive:E.cmd('reviveState')};})()`;
const PULSE = `(async()=>{const E=window.__echoes;const X=window.__X;E.cmd('setHp',X.pid(2),0.12);const raf=()=>new Promise(r=>requestAnimationFrame(r));const s=[];const t0=performance.now();while(performance.now()-t0<1100){const p=E.hud.portraits()[2];s.push([Math.round(performance.now()-t0),parseFloat(p.innerBorder)]);await raf();}let peaks=0;for(let i=1;i<s.length-1;i++){if(s[i][1]>=2.9&&s[i-1][1]<s[i][1]&&s[i][1]>=s[i+1][1])peaks++;}const mx=Math.max(...s.map(x=>x[1]));const mn=Math.min(...s.map(x=>x[1]));return {samples:s.length,peaksIn1100ms:peaks,minW:mn,maxW:mx,trace:s.filter((_,i)=>i%5===0)};})()`;
out('xhd-states-c', [ev(LIB), ev(FRESH), mouseCentre, ev(SET_A), wait(2600), ev(BREAK), wait(120), ev(READ_C), ev(PULSE)]);

// ---- A4. PURE downed (no eligible AI reviver) + hover on a healthy tile, nothing selected
const SET_D = `(()=>{const E=window.__echoes;const X=window.__X;E.cmd('teleport',0,0);E.cmd('setHp',X.pid(1),0);E.cmd('setHp',X.pid(2),0.12);E.cmd('setHp',X.pid(3),0);E.hud.freeze(0.25);if(E.hud.overrideIndex()!==null)E.cmd('healOverride',E.hud.overrideIndex());E.hud.hover(0,true);return E.hud.portraits().map(p=>p.state);})()`;
out('xhd-states-d', [ev(LIB), ev(FRESH), mouseCentre, ev(SET_D), wait(500), ev(SET_D), wait(80), ev(READ_B)]);

// ---- B. cooldown numeral / wipe / abbrev collision
const AIM = `(()=>{window.dispatchEvent(new MouseEvent('mousemove',{clientX:innerWidth*0.6,clientY:innerHeight*0.35,bubbles:true}));return 1;})()`;
const READ_MID = `(()=>{const s=window.__echoes.hud.slots()[0];return {mid:{wipeDeg:s.wipeDeg,cooling:s.cooling,counting:s.counting,bg:document.querySelector('.hud-slot-wipe').style.background.slice(0,120)}};})()`;
const READ_CD = `(()=>{const E=window.__echoes;const S=E.hud.slots();return {tick:E.tick,slots:S.map(s=>({k:s.key,a:s.abbrev,aVis:s.abbrevVisible,cnt:s.counting,num:s.numeral,deg:s.wipeDeg,empty:s.empty,abbrevBox:s.abbrevBox,numBox:s.numBox,keyBox:s.keyBox})),rects:window.__X.rects(),fps:E.fps};})()`;
out('xhd-cd', [ev(LIB), ev(FRESH), ev(AIM), key('Digit1'), wait(300), ev(READ_MID), wait(2050), key('Space'), wait(450), ev(READ_CD)]);

// ---- C. denial nudges: events + animations + peak capture
const READ_DENY = `(()=>{const E=window.__echoes;const den=E.events.filter(e=>e.type==='intent_denied').slice(-8);const an=E.hud.animations();return {denied:den,nudges:E.hud.nudges(),anims:an,outsideBar:an.filter(a=>!a.insideBar)};})()`;
const PEAK = `(()=>{const E=window.__echoes;E.hud.forceNudge(0,'on_cooldown');E.hud.forceNudge(2,'empty_slot');E.hud.forceNudge(1,'priority_suppressed');E.hud.forceNudge('dodge','ready');return E.hud.slots().map(s=>s.nudge);})()`;
out('xhd-deny', [ev(LIB), ev(FRESH), ev(AIM), key('Digit1'), wait(120), key('Digit1'), wait(60), key('Digit3'), wait(60),
  { type: 'keydown', key: 'Space' }, wait(40), key('Digit2'), { type: 'keyup', key: 'Space' }, wait(60), ev(READ_DENY), wait(400), ev(PEAK), wait(60)]);

// ---- D. banners
const SKIP2 = `(()=>{const E=window.__echoes;const v=E.cmd('skipToRoom',2);return {room:v.room,mode:v.mode};})()`;
const SKIP8 = `(()=>{const E=window.__echoes;const v=E.cmd('skipToRoom',8);return {room:v.room,mode:v.mode};})()`;
const READ_BN = `(()=>{const E=window.__echoes;const r=E.cmd('runState');return {banner:E.hud.banner(),metrics:E.hud.metrics(),rects:window.__X.rects(),run:{room:r.room,mode:r.mode,phase:r.phase},fps:E.fps};})()`;
out('xhd-banner-defend', [ev(LIB), ev(SKIP2), wait(1500), ev(READ_BN)]);
out('xhd-banner-boss', [ev(LIB), ev(SKIP8), wait(2500), ev(`(()=>{return window.__echoes.cmd('bossHp',0.62,true);})()`), wait(300), ev(READ_BN)]);
const FADE = `(async()=>{const E=window.__echoes;const B=()=>E.hud.banner();const raf=()=>new Promise(r=>requestAnimationFrame(r));E.cmd('killAllEnemies');const o0=B().opacity;const t1=performance.now();E.cmd('clearRoom');let outStart=null,outEnd=null;const outTrace=[];while(performance.now()-t1<1500){const o=B().opacity;outTrace.push([Math.round(performance.now()-t1),+o.toFixed(2)]);if(outStart===null&&o<0.995)outStart=performance.now()-t1;if(o<0.005){outEnd=performance.now()-t1;break;}await raf();}await new Promise(r=>setTimeout(r,400));const t0=performance.now();E.cmd('startRoom','kill_all');let inStart=null,inEnd=null;while(performance.now()-t0<1500){const o=B().opacity;if(inStart===null&&o>0.01)inStart=performance.now()-t0;if(o>0.995){inEnd=performance.now()-t0;break;}await raf();}return {startOpacity:o0,transition:B().transition,outFirstMs:Math.round(outStart),outDoneMs:Math.round(outEnd),outTrace:outTrace.slice(0,14),inFirstMs:Math.round(inStart),inDoneMs:Math.round(inEnd),mode:B().mode,text:B().text,fps:E.fps};})()`;
out('xhd-banner-fade', [ev(LIB), ev(FADE)]);

// ---- E. size sweep: full state soup, metrics + overlap
const SOUP = `(()=>{const E=window.__echoes;const X=window.__X;E.cmd('giveSkill','warding_aura');E.cmd('giveSkill','nova_bloom');E.cmd('setHp',X.pid(1),0.4);E.cmd('setHp',X.pid(2),0.12);E.cmd('setHp',X.pid(3),0);E.hud.freeze(0.25);if(E.hud.overrideIndex()!==0)E.cmd('healOverride',0);window.dispatchEvent(new MouseEvent('mousemove',{clientX:innerWidth*0.6,clientY:innerHeight*0.35,bubbles:true}));return E.hud.slots().map(s=>s.abbrev);})()`;
const READ_SIZE = `(()=>{const E=window.__echoes;const m=E.hud.metrics();const r=window.__X.rects();const minFs=(sel)=>{const v=r.rects.filter(x=>x.s===sel).map(x=>x.fs*m.scale);return v.length?+Math.min(...v).toFixed(2):null;};return {metrics:m,slots:E.hud.slots().map(s=>({k:s.key,a:s.abbrev,cnt:s.counting,num:s.numeral,pas:s.passive})),ports:E.hud.portraits().map(p=>p.state+(p.selected?'+sel':'')),overlaps:r.overlaps,nRects:r.n,realPx:{key:minFs('.hud-slot-key'),portKey:minFs('.hud-port-key'),abbrev:minFs('.hud-slot-abbrev'),slotNum:minFs('.hud-slot-num'),portNum:minFs('.hud-port-num'),bnLabel:minFs('.hud-bn-label'),bnNum:minFs('.hud-bn-num'),e:minFs('.hud-port-e')},chrome:E.hud.chrome(),banner:E.hud.banner(),fps:E.fps};})()`;
out('xhd-size', [ev(LIB), ev(FRESH), ev(SOUP), key('Digit1'), wait(2600), ev(SOUP), key('Space'), wait(500), ev(SOUP), wait(60), ev(READ_SIZE)]);

// ---- F. contrast / tint: party IN a brazier pool (variant 1 braziers: (-4.5,1.8) (3.2,-2.4) (5.6,5.2))
const place = (px, pz, a) => `(()=>{const E=window.__echoes;E.cmd('teleport',${px},${pz});E.cmd('placeAlly',1,${a[0][0]},${a[0][1]});E.cmd('placeAlly',2,${a[1][0]},${a[1][1]});E.cmd('placeAlly',3,${a[2][0]},${a[2][1]});return 'p';})()`;
const READ_CHROME = `(()=>{const E=window.__echoes;const m=E.hud.metrics();const s=E.hud.slots();const p=E.hud.portraits();return {metrics:{zone1Box:m.zone1Box,zone2Box:m.zone2Box},slotBoxes:s.map(x=>({k:x.key,tile:x.tileBox,abbrev:x.abbrevBox,key:x.keyBox})),portTiles:p.map(x=>x.tileBox),chrome:E.hud.chrome(),player:E.state().party.find(q=>(q.partyIndex??0)===0),fps:E.fps};})()`;
// (a) whole party standing in the (3.2,-2.4) pool
const IN_POOL = place(3.2, -2.4, [[2.6, -2.0], [3.8, -2.0], [3.2, -3.0]]);
out('xhd-bright-a', [ev(LIB), ev(FRESH), mouseCentre, ev(IN_POOL), wait(700), ev(IN_POOL), wait(120), ev(READ_CHROME)]);
// (b) allies in the (5.6,5.2) pool while that pool sits UNDER the command bar (player 4.5 u north of it)
const UNDER_BAR = place(5.6, 0.7, [[5.0, 5.0], [6.2, 5.0], [5.6, 4.4]]);
out('xhd-bright-b', [ev(LIB), ev(FRESH), mouseCentre, ev(UNDER_BAR), wait(700), ev(UNDER_BAR), wait(120), ev(READ_CHROME)]);
// (c) dark placement, no pool anywhere near the bar
const DARK = place(-7.5, -4.5, [[-8.2, -4.0], [-6.8, -4.0], [-7.5, -3.6]]);
out('xhd-dark', [ev(LIB), ev(FRESH), mouseCentre, ev(DARK), wait(700), ev(DARK), wait(120), ev(READ_CHROME)]);

// ---- G. threat legibility
const READ_THREAT = `(()=>{const E=window.__echoes;const a=E.hud.threat();const dom=[...document.querySelectorAll('#hud-threat .tm')].filter(n=>n.style.display!=='none').map(n=>{const r=n.querySelector('.tm-rot').getBoundingClientRect();return {cls:n.className,x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};});return {win:a.window,zones:a.zones,threats:a.threats.map(t=>({k:t.key,kind:t.kind,x:t.x,z:t.z,sx:t.sx,sy:t.sy,onScreen:t.onScreen,inSafe:t.inSafeFrame,cued:t.marker,mi:t.markerIndex})),offFrame:a.offFrame,covered:a.covered,uncued:a.uncued,markersDrawn:a.markersDrawn,domMarkers:a.domMarkers,dom,markers:E.hud.markers(),player:(()=>{const p=E.state().party.find(q=>(q.partyIndex??0)===0);return {x:p.x,z:p.z};})(),fps:E.fps,tick:E.tick};})()`;
// (a) the real wave's spawn telegraphs, 300 ms after the room starts, player at centre
out('xhd-threat-spawn', [ev(LIB), ev(`(()=>{window.__echoes.cmd('teleport',0,0);return 1;})()`), mouseCentre, wait(300), ev(FRESH), wait(300), ev(READ_THREAT)]);
// (b) one enemy at EVERY §11 edge spawn point, player at centre; fps sampled for 1.2 s
const SPAWN8 = `(()=>{const E=window.__echoes;E.cmd('teleport',0,0);const P=[[-5,-6.6],[5,-6.6],[-10.2,-3],[10.2,-3],[-10.2,3],[10.2,3],[-5,6.6],[5,6.6]];const ids=P.map((p,i)=>E.cmd('spawn',i%3===1?'mantis':'boar',p[0],p[1]));window.__X.F=[];window.__X.fi=setInterval(()=>window.__X.F.push(window.__echoes.fps),100);return ids;})()`;
const READ_FPS = `(()=>{clearInterval(window.__X.fi);const f=window.__X.F.slice(1).sort((a,b)=>a-b);return {n:f.length,min:f[0],median:f[Math.floor(f.length/2)],max:f[f.length-1]};})()`;
out('xhd-threat-8', [ev(LIB), ev(FRESH), mouseCentre, wait(1400), ev(`(()=>{return window.__echoes.cmd('killAllEnemies');})()`), ev(SPAWN8), wait(250), ev(READ_THREAT), wait(1000), ev(READ_FPS), ev(READ_THREAT)]);
// (c) real wave arriving over time: audits sampled every 250 ms for 3 s, then a seq capture
const TRACK = `(()=>{const X=window.__X;X.T=[];X.ti=setInterval(()=>{const a=window.__echoes.hud.threat();X.T.push({t:window.__echoes.tick,off:a.offFrame,cued:a.covered,uncued:a.uncued,n:a.threats.length,dom:a.domMarkers,onScreenOff:a.threats.filter(r=>!r.inSafeFrame&&r.onScreen).length});},250);return 1;})()`;
const READ_TRACK = `(()=>{clearInterval(window.__X.ti);const T=window.__X.T;return {samples:T.length,maxUncued:Math.max(...T.map(x=>x.uncued)),trace:T};})()`;
out('xhd-threat-wave', [ev(LIB), ev(`(()=>{window.__echoes.cmd('teleport',0,0);return 1;})()`), mouseCentre, ev(FRESH), ev(TRACK), wait(3200), ev(READ_TRACK), ev(READ_THREAT)]);
// (d) mantis telegraphing from off-frame: park a mantis 3.4 u east of a player who stands at the far west so the mantis is off-frame horizontally? The frame is ~19 u wide; instead park the player at x=-9 and a mantis at x=+3.2 (12.2 u east, off the right edge)
const TELE = `(()=>{const E=window.__echoes;E.cmd('killAllEnemies');E.cmd('teleport',-9,0);E.cmd('placeAlly',1,-9.6,0.8);E.cmd('placeAlly',2,-8.4,0.8);E.cmd('placeAlly',3,-9,-0.9);const id=E.cmd('spawn','mantis',3.0,0);return id;})()`;
out('xhd-threat-tele', [ev(LIB), ev(FRESH), mouseCentre, wait(1400), ev(TELE), wait(1500), ev(READ_THREAT), ev(`(()=>{const E=window.__echoes;const en=E.state().enemies||[];return {enemies:en.map(e=>({id:e.id,kind:e.kind,x:e.x,z:e.z,telegraph:e.telegraph,state:e.state})),tele:E.events.filter(e=>/telegraph/.test(e.type)).slice(-4)};})()`)]);
