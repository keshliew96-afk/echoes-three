// Round D3 HUD critic probe generator. Emits tools/actions/zhd-*.json.
// eval steps share one page scope -> every snippet is an IIFE.
import { writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = (name, acts) => writeFileSync(join(root, 'tools/actions', `${name}.json`), JSON.stringify(acts, null, 1));
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 50) => ({ type: 'key', key: k, ms });
const mouseCentre = { type: 'mousemove', x: 800, y: 450 };

const LIB = `(()=>{window.__Y=window.__Y||{};const E=window.__echoes;
window.__Y.pid=(i)=>{const p=E.state().party;const m=p.find(q=>(q.partyIndex??0)===i);return m?m.id:null;};
window.__Y.rects=()=>{const SEL=['.hud-slot-key','.hud-port-key','.hud-slot-abbrev','.hud-slot-num','.hud-port-num','.hud-port-e','.hud-slot-passive','.hud-bn-label','.hud-bn-num','.hud-bn-pips','.hud-bn-bar','.tm-badge'];const vis=(n)=>{const r=n.getBoundingClientRect();let p=n;while(p&&p!==document.body){const c=getComputedStyle(p);if(c.display==='none'||Number(c.opacity)<0.02)return null;p=p.parentElement;}return r.width>0.5&&r.height>0.5?r:null;};const rs=[];for(const s of SEL)for(const n of document.querySelectorAll(s)){const r=vis(n);if(r)rs.push({s,txt:(n.textContent||'').trim().slice(0,12),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),fs:+(parseFloat(getComputedStyle(n).fontSize)).toFixed(1)});}const hits=[];for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],b=rs[j];const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);const oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);if(ox>0.5&&oy>0.5)hits.push({a:a.s+':'+a.txt,b:b.s+':'+b.txt,ox:+ox.toFixed(1),oy:+oy.toFixed(1)});}return {n:rs.length,overlaps:hits,rects:rs};};
window.__Y.gate=()=>{const E=window.__echoes;const r=E.cmd('runState');const b=E.hud.banner();const t=E.hud.threat();const s=E.state();const bn=document.getElementById('hud-banner');const cs=getComputedStyle(bn);const wash=document.getElementById('bk-wash');const pages=[...document.querySelectorAll('#run-screen .rn-page')].filter(p=>getComputedStyle(p).display!=='none').map(p=>p.className);const m=E.hud.metrics();const lab=document.querySelector('.hud-bn-label');const num=document.querySelectorAll('.hud-bn-num')[0];return {tick:E.tick,version:E.version,phase:r&&r.phase,active:r&&r.active,combatActive:r&&r.combatActive,room:r&&r.room,runBoss:s.run&&s.run.boss?{hp:s.run.boss.hp,active:s.run.boss.active,cleared:s.run.boss.cleared,adds:s.run.boss.adds}:null,hudCombat:E.hud.combat(),banner:{mode:b.mode,gated:b.gated,show:b.show,opacity:b.opacity,text:b.text,label:lab&&lab.textContent,num:num&&num.textContent,box:b.box,cssOpacity:cs.opacity,display:cs.display},threat:{gated:t.gated,offFrame:t.offFrame,markersDrawn:t.markersDrawn,domMarkers:t.domMarkers,covered:t.covered,uncued:t.uncued,tmNodes:document.querySelectorAll('#hud-threat .tm').length,tmVisible:[...document.querySelectorAll('#hud-threat .tm')].filter(n=>n.style.display!=='none'&&Number(getComputedStyle(n).opacity)>0.02).length},markers:E.hud.markers(),enemies:(s.enemies||[]).map(e=>({id:e.id,kind:e.kind,x:e.x,z:e.z})),roomState:s.room?{mode:s.room.mode,cleared:s.room.cleared,alive:s.room.aliveEnemies,pending:s.room.pendingSpawns,wave:s.room.waveIndex,wavesTotal:s.room.wavesTotal}:null,scene:s.scene,vfxMode:s.vfx&&s.vfx.mode,pages,washOpacity:wash?getComputedStyle(wash).opacity:null,zone1:m.zone1Box,zone2:m.zone2Box,fps:E.fps};};
window.__Y.ports=()=>{const E=window.__echoes;const m=E.hud.metrics();return {tick:E.tick,scale:m.scale,ports:E.hud.portraits().map(p=>({i:p.index,c:p.classId,st:p.state,sel:p.selected,hov:p.hover,hp:p.hpWidth,num:p.numeral,inner:p.innerBorder+' '+p.innerColor,outline:p.trackOutline,trackBorder:p.trackBorder,fill:p.fillImage,keyVisible:p.keyVisible,keyBox:p.keyBox,keyColor:p.keyColor,keyText:document.querySelectorAll('.hud-port-key')[p.index].textContent,keyFs:+(parseFloat(getComputedStyle(document.querySelectorAll('.hud-port-key')[p.index]).fontSize)*m.scale).toFixed(2),identColor:p.identColor,eBox:p.eBox,imgFilter:p.imgFilter,numBox:p.numBox,tile:p.tileBox,hpBox:p.hpBox,rev:p.reviveOffset,revTot:p.reviveTotal,img:p.hasImage})),rects:window.__Y.rects(),revive:E.cmd('reviveState'),banner:E.hud.banner(),fps:E.fps};};
window.__Y.boss=()=>{const E=window.__echoes;const s=E.state();const b=s.run&&s.run.boss;const bn=E.hud.banner();const lab=document.querySelector('.hud-bn-label');const num=document.querySelectorAll('.hud-bn-num')[0];const fill=document.querySelector('.hud-bn-bar i');const st=(s.enemies||[]).find(e=>e.kind==='stag');return {tick:E.tick,hp:b&&b.hp,max:b&&b.maxHp,act:b&&b.active,clr:b&&b.cleared,adds:b&&b.adds,ph:b&&b.phasesFired,stag:st?st.hp:null,en:(s.enemies||[]).length,mode:bn.mode,op:+bn.opacity.toFixed(2),show:bn.show,gated:bn.gated,label:lab&&lab.textContent,num:num&&num.textContent,fillW:fill&&fill.style.width,barDisp:fill&&fill.parentElement.style.display,box:bn.box,phase:E.cmd('runState').phase,tm:document.querySelectorAll('#hud-threat .tm').length};};
return 'lib';})()`;

const FRESH = `(()=>{const E=window.__echoes;const r=E.cmd('startRoom','kill_all');const s=E.cmd('runState');return {room:s&&s.room,phase:s&&s.phase,mode:r&&r.mode};})()`;
const G = `(()=>window.__Y.gate())()`;
const P = `(()=>window.__Y.ports())()`;
const B = `(()=>window.__Y.boss())()`;
const TELE0 = `(()=>{window.__echoes.cmd('teleport',0,0);return 1;})()`;
const SPAWN8 = `(()=>{const E=window.__echoes;E.cmd('teleport',0,0);const P=[[-5,-6.6],[5,-6.6],[-10.2,-3],[10.2,-3],[-10.2,3],[10.2,3],[-5,6.6],[5,6.6]];return P.map((p,i)=>E.cmd('spawn',i%3===1?'mantis':'boar',p[0],p[1]));})()`;
const KILLCLEAR = `(()=>{const E=window.__echoes;const k=E.cmd('killAllEnemies');const c=E.cmd('clearRoom');return {killed:k,cleared:c,phase:E.cmd('runState').phase};})()`;
const SKIP7 = `(()=>{const v=window.__echoes.cmd('skipToRoom',7);return {room:v.room,phase:v.phase};})()`;
const SKIP8 = `(()=>{const v=window.__echoes.cmd('skipToRoom',8);return {room:v.room,phase:v.phase};})()`;
const WIN = `(()=>{const E=window.__echoes;E.cmd('bossHp',0.2);E.cmd('killAllEnemies');const kb=E.cmd('killBoss');E.cmd('killAllEnemies');return {killBoss:kb,phase:E.cmd('runState').phase};})()`;
const DEFEAT = `(()=>{const E=window.__echoes;const s=E.state();for(const p of s.party)E.cmd('setHp',p.id,0);return {tick:E.tick,phase:E.cmd('runState').phase};})()`;
const CAMP = `(()=>window.__echoes.cmd('returnToCamp'))()`;
const LEAKSPAWN = `(()=>{const E=window.__echoes;const a=E.cmd('spawn','boar',-11,0);const b=E.cmd('spawn','mantis',11,0.5);return {ids:[a,b],enemies:(E.state().enemies||[]).length,phase:E.cmd('runState').phase};})()`;
const STRAYROOM = `(()=>{const E=window.__echoes;const r=E.cmd('startRoom','kill_all');return {startRoom:r?{mode:r.mode}:r,phase:E.cmd('runState').phase};})()`;
const START = `(()=>{const E=window.__echoes;E.cmd('startRun');return {phase:E.cmd('runState').phase,scene:E.state().scene};})()`;

// ---- 5. smoke on the sanctioned harness boot (?scene=arena&room=kill_all&seed=777)
out('zhd-smoke-arena', [ev(LIB), ev(G)]);
out('zhd-arena-ptr', [ev(LIB), ev(TELE0), mouseCentre, wait(300), ev(SPAWN8), wait(400), ev(G)]);
// wave-room banner tracking on the harness boot: sample banner text vs sim room state
const WTRACE = `(async()=>{const E=window.__echoes;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));const tr=[];const t0=performance.now();for(let i=0;i<20;i++){const s=E.state();const r=s.room;const b=E.hud.banner();tr.push({ms:Math.round(performance.now()-t0),tick:E.tick,wave:r&&r.waveIndex,tot:r&&r.wavesTotal,alive:r&&r.aliveEnemies,pend:r&&r.pendingSpawns,clr:r&&r.cleared,mode:b.mode,op:+b.opacity.toFixed(2),text:b.text,tm:document.querySelectorAll('#hud-threat .tm').length,combat:E.hud.combat().combat});await sl(250);}return {trace:tr,gate:window.__Y.gate()};})()`;
out('zhd-arena-wtrace', [ev(LIB), ev(WTRACE)]);

// ---- 1. BOSS BANNER (boot ?scene=arena&seed=777)
out('zhd-boss-alive', [ev(LIB), ev(SKIP8), wait(1500), ev(B), wait(400), ev(B), wait(400), ev(B), ev(`(()=>window.__Y.rects())()`)]);
const NATURAL = `(async()=>{const E=window.__echoes;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));const log=[];for(const t of ['boss_spawn','boss_adds','death','room_cleared','run_end'])E.on(t,e=>log.push(t+' t'+e.tick+(e.kind?' '+e.kind:'')+(e.spawned!==undefined?' n='+e.spawned:'')+(e.pct!==undefined?' pct='+e.pct:'')));const v=E.cmd('skipToRoom',8);const tr=[];const t0=performance.now();let mism=0;for(let i=0;i<40;i++){const r=window.__Y.boss();const exp=(r.hp!=null)?Math.max(0,Math.ceil(r.hp))+'/'+r.max:null;const ok=r.num===exp;if(!ok)mism++;tr.push({ms:Math.round(performance.now()-t0),tick:r.tick,hp:r.hp,adds:r.adds,ph:r.ph,label:r.label,num:r.num,fillW:r.fillW,op:r.op,mode:r.mode,ok});await sl(200);}return {skip:{room:v.room,phase:v.phase},mismatches:mism,trace:tr,log,final:window.__Y.boss()};})()`;
out('zhd-boss-natural', [ev(LIB), ev(NATURAL)]);
// felled frame: adds spawned by bossHp(0.24), then bossHp(0)
out('zhd-boss-felled', [ev(LIB), ev(SKIP8), wait(1500), ev(B), ev(`(()=>({set:window.__echoes.cmd('bossHp',0.24)}))()`), wait(700), ev(B), ev(`(()=>({set:window.__echoes.cmd('bossHp',0)}))()`), wait(500), ev(B), ev(`(()=>window.__Y.rects())()`), ev(G)]);
// whole mop-up timeline until room_cleared (+1.5 s), then the post-clear state
const BTRACE = `(async()=>{const E=window.__echoes;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));const log=[];for(const t of ['boss_adds','death','room_cleared','run_end','boss_spawn'])E.on(t,e=>log.push(t+' t'+e.tick+(e.kind?' '+e.kind:'')+(e.spawned!==undefined?' n='+e.spawned:'')));const rd=()=>{const r=window.__Y.boss();return {ms:Math.round(performance.now()-t0),tick:r.tick,hp:r.hp,act:r.act,clr:r.clr,adds:r.adds,ph:r.ph,en:r.en,mode:r.mode,op:r.op,show:r.show,label:r.label,num:r.num,fillW:r.fillW,phase:r.phase,tm:r.tm};};const t0=performance.now();const pre=rd();const a=E.cmd('bossHp',0.24);await sl(700);const mid=rd();const z=E.cmd('bossHp',0);const sync=rd();const tr=[];let clearedAt=null,killed=false;while(performance.now()-t0<24000){const r=rd();tr.push(r);if(clearedAt===null&&log.some(l=>l.startsWith('room_cleared')))clearedAt=r.ms;if(clearedAt!==null&&r.ms-clearedAt>1500)break;if(!killed&&r.ms>16000){killed=true;E.cmd('killAllEnemies');}await sl(100);}const texts={};for(const r of tr){const k=(r.label||'')+' | '+(r.num||'')+' | '+r.mode;texts[k]=(texts[k]||0)+1;}return {pre,setA:a,mid,setZ:z,sync,clearedAt,killed,n:tr.length,texts,trace:tr.filter((_,i)=>i%4===0||i===tr.length-1),log,final:window.__Y.boss(),gate:window.__Y.gate()};})()`;
out('zhd-boss-trace', [ev(LIB), ev(SKIP8), wait(1500), ev(BTRACE)]);
// A/B on the felled plate (positive control for the boss branch)
out('zhd-ab-felled', [ev(LIB), ev(SKIP8), wait(1500), ev(`(()=>({set:window.__echoes.cmd('bossHp',0.24)}))()`), wait(700), ev(`(()=>({set:window.__echoes.cmd('bossHp',0)}))()`), wait(500), ev(B)]);

// ---- 3. GATE (boot ?scene=arena&run=1&seed=777)
out('zhd-gate-combat', [ev(LIB), ev(TELE0), mouseCentre, wait(300), ev(SPAWN8), wait(300), ev(G)]);
out('zhd-gate-reward', [ev(LIB), ev(KILLCLEAR), wait(900), ev(G)]);
out('zhd-gate-path', [ev(LIB), ev(KILLCLEAR), wait(900), ev(`(()=>{const E=window.__echoes;const d=E.cmd('draftDecline');return {declined:d,phase:E.cmd('runState').phase};})()`), wait(900), ev(G)]);
out('zhd-gate-shop', [ev(LIB), ev(SKIP7), wait(1200), ev(G)]);
out('zhd-gate-victory', [ev(LIB), ev(SKIP8), wait(800), ev(WIN), wait(900), ev(G)]);
out('zhd-gate-defeat', [ev(LIB), ev(DEFEAT), wait(900), ev(G)]);
// camp bookends (default camp boot)
out('zhd-camp-v2', [ev(LIB), ev(START), wait(800), ev(SKIP8), wait(800), ev(WIN), wait(900), ev(G), ev(CAMP), wait(3500), ev(G)]);
out('zhd-camp-d2', [ev(LIB), ev(START), wait(2500), ev(DEFEAT), wait(900), ev(G), ev(CAMP), wait(3500), ev(G)]);
out('zhd-camp-leak2', [ev(LIB), ev(START), wait(2500), ev(DEFEAT), wait(900), ev(CAMP), wait(1500), ev(STRAYROOM), ev(LEAKSPAWN), wait(1500), ev(G)]);
// camp after a VICTORY + stray start (the new predicate's other edge)
out('zhd-camp-leakv', [ev(LIB), ev(START), wait(800), ev(SKIP8), wait(800), ev(WIN), wait(900), ev(CAMP), wait(1500), ev(STRAYROOM), ev(LEAKSPAWN), wait(1500), ev(G)]);
// adversarial: stray start in camp BEFORE any run (everStarted=false)
out('zhd-camp-leak0', [ev(LIB), wait(300), ev(G), ev(STRAYROOM), ev(LEAKSPAWN), wait(1500), ev(G)]);
out('zhd-camp-combat', [ev(LIB), ev(START), wait(2500), ev(TELE0), wait(200), ev(SPAWN8), wait(300), ev(G)]);

// ---- 4. PORTRAITS (boot ?scene=arena&run=1&seed=777)
const SET_A = `(()=>{const E=window.__echoes;const Y=window.__Y;E.cmd('teleport',0,0);E.cmd('setHp',Y.pid(1),0.4);E.cmd('setHp',Y.pid(2),0.12);E.cmd('setHp',Y.pid(3),0);E.hud.freeze(0.25);if(E.hud.overrideIndex()!==0)E.cmd('healOverride',0);return E.hud.portraits().map(p=>p.state);})()`;
out('zhd-states-a', [ev(LIB), ev(FRESH), mouseCentre, ev(SET_A), wait(1500), ev(SET_A), wait(60), ev(P)]);
const SET_LO = `(()=>{const E=window.__echoes;const Y=window.__Y;E.cmd('setHp',Y.pid(1),0.4);E.cmd('setHp',Y.pid(2),0.12);E.hud.freeze(0.0);E.hud.hover(1,true);return E.hud.portraits().map(p=>p.state);})()`;
const READ_LO = `(()=>{const E=window.__echoes;const t=[...document.querySelectorAll('.hud-port-tile')];return {ports:E.hud.portraits().map((p,i)=>({i:p.index,st:p.state,hov:p.hover,inner:p.innerBorder+' '+p.innerColor,outline:p.trackOutline,tileBorder:getComputedStyle(t[i]).borderTopColor,tileBg:getComputedStyle(t[i]).backgroundImage.slice(0,70),fill:p.fillImage,num:p.numeral})),rects:window.__Y.rects()};})()`;
out('zhd-states-lo', [ev(LIB), ev(FRESH), mouseCentre, ev(SET_A), wait(1500), ev(SET_LO), wait(80), ev(READ_LO)]);
const PULSE = `(async()=>{const E=window.__echoes;const Y=window.__Y;E.hud.unfreeze();E.cmd('setHp',Y.pid(2),0.12);const raf=()=>new Promise(r=>requestAnimationFrame(r));const s=[];const t0=performance.now();while(performance.now()-t0<1100){const p=E.hud.portraits()[2];s.push([Math.round(performance.now()-t0),parseFloat(p.innerBorder),p.innerColor]);await raf();}let peaks=0;const pk=[];for(let i=1;i<s.length-1;i++){if(s[i][1]>=2.9&&s[i-1][1]<s[i][1]&&s[i][1]>=s[i+1][1]){peaks++;pk.push(s[i][0]);}}const mx=Math.max(...s.map(x=>x[1]));const mn=Math.min(...s.map(x=>x[1]));return {samples:s.length,peaksIn1100ms:peaks,peakMs:pk,minW:mn,maxW:mx,numeral:E.hud.portraits()[2].numeral,trace:s.filter((_,i)=>i%6===0)};})()`;
out('zhd-pulse', [ev(LIB), ev(FRESH), ev(PULSE)]);
const SET_DOWN2 = `(()=>{const E=window.__echoes;const Y=window.__Y;E.cmd('teleport',0,0);E.cmd('setHp',Y.pid(1),0.12);E.cmd('setHp',Y.pid(2),0);E.cmd('setHp',Y.pid(3),0);E.hud.freeze(0.25);if(E.hud.overrideIndex()!==null)E.cmd('healOverride',E.hud.overrideIndex());return E.hud.portraits().map(p=>p.state);})()`;
out('zhd-downed', [ev(LIB), ev(FRESH), mouseCentre, ev(SET_DOWN2), wait(600), ev(SET_DOWN2), wait(80), ev(P)]);
out('zhd-healthy', [ev(LIB), ev(FRESH), mouseCentre, ev(TELE0), wait(300), ev(P)]);
out('zhd-states-rev', [ev(LIB), ev(FRESH), mouseCentre, ev(`(()=>{const E=window.__echoes;const Y=window.__Y;E.cmd('teleport',0,0);E.cmd('setHp',Y.pid(3),0);return 1;})()`), wait(2600), ev(P)]);
const AIM = `(()=>{window.dispatchEvent(new MouseEvent('mousemove',{clientX:innerWidth*0.6,clientY:innerHeight*0.35,bubbles:true}));return 1;})()`;
const READ_CD = `(()=>{const E=window.__echoes;const S=E.hud.slots();return {tick:E.tick,slots:S.map(s=>({k:s.key,a:s.abbrev,aVis:s.abbrevVisible,cnt:s.counting,num:s.numeral,deg:s.wipeDeg,empty:s.empty,abbrevBox:s.abbrevBox,numBox:s.numBox,keyBox:s.keyBox})),rects:window.__Y.rects(),fps:E.fps};})()`;
out('zhd-cd', [ev(LIB), ev(FRESH), ev(AIM), key('Digit1'), wait(2350), key('Space'), wait(450), ev(READ_CD)]);

// ---- 4b. NO TINT
const READ_CHROME = `(()=>{const E=window.__echoes;const m=E.hud.metrics();const s=E.hud.slots();const p=E.hud.portraits();const st=E.state();return {metrics:{zone1Box:m.zone1Box,zone2Box:m.zone2Box,scale:m.scale},slotBoxes:s.map(x=>({k:x.key,a:x.abbrev,tile:x.tileBox,abbrev:x.abbrevBox,key:x.keyBox})),portTiles:p.map(x=>x.tileBox),chrome:E.hud.chrome(),player:st.party.find(q=>(q.partyIndex??0)===0),scene:st.scene,vfxMode:st.vfx&&st.vfx.mode,phase:E.cmd('runState').phase,banner:E.hud.banner(),fps:E.fps};})()`;
out('zhd-tint-camp', [ev(LIB), wait(300), ev(READ_CHROME)]);
const place = (px, pz, a) => `(()=>{const E=window.__echoes;E.cmd('teleport',${px},${pz});E.cmd('placeAlly',1,${a[0][0]},${a[0][1]});E.cmd('placeAlly',2,${a[1][0]},${a[1][1]});E.cmd('placeAlly',3,${a[2][0]},${a[2][1]});return 'p';})()`;
const IN_POOL = place(3.2, -2.4, [[2.6, -2.0], [3.8, -2.0], [3.2, -3.0]]);
out('zhd-tint-pool', [ev(LIB), ev(FRESH), mouseCentre, ev(IN_POOL), wait(700), ev(IN_POOL), wait(120), ev(READ_CHROME)]);
out('zhd-tint-boss', [ev(LIB), ev(SKIP8), wait(2500), ev(`(()=>window.__echoes.cmd('bossHp',0.62,true))()`), wait(300), ev(READ_CHROME)]);

// ---- 4c. SIZE SWEEP
const SOUP = `(()=>{const E=window.__echoes;const Y=window.__Y;E.cmd('giveSkill','warding_aura');E.cmd('giveSkill','nova_bloom');E.cmd('setHp',Y.pid(1),0.4);E.cmd('setHp',Y.pid(2),0.12);E.cmd('setHp',Y.pid(3),0);E.hud.freeze(0.25);if(E.hud.overrideIndex()!==0)E.cmd('healOverride',0);window.dispatchEvent(new MouseEvent('mousemove',{clientX:innerWidth*0.6,clientY:innerHeight*0.35,bubbles:true}));return E.hud.slots().map(s=>s.abbrev);})()`;
const READ_SIZE = `(()=>{const E=window.__echoes;const m=E.hud.metrics();const r=window.__Y.rects();const minFs=(sel)=>{const v=r.rects.filter(x=>x.s===sel).map(x=>x.fs*m.scale);return v.length?+Math.min(...v).toFixed(2):null;};return {metrics:m,slots:E.hud.slots().map(s=>({k:s.key,a:s.abbrev,cnt:s.counting,num:s.numeral,pas:s.passive})),ports:E.hud.portraits().map(p=>p.state+(p.selected?'+sel':'')),overlaps:r.overlaps,nRects:r.n,realPx:{key:minFs('.hud-slot-key'),portKey:minFs('.hud-port-key'),abbrev:minFs('.hud-slot-abbrev'),slotNum:minFs('.hud-slot-num'),portNum:minFs('.hud-port-num'),bnLabel:minFs('.hud-bn-label'),bnNum:minFs('.hud-bn-num'),e:minFs('.hud-port-e')},chrome:E.hud.chrome(),banner:E.hud.banner(),threat:(()=>{const t=E.hud.threat();return {off:t.offFrame,dom:t.domMarkers,uncued:t.uncued};})(),fps:E.fps};})()`;
out('zhd-size', [ev(LIB), ev(FRESH), ev(SOUP), key('Digit1'), wait(2600), ev(SOUP), key('Space'), wait(500), ev(SOUP), wait(60), ev(READ_SIZE)]);
console.log('zhd probes written');
