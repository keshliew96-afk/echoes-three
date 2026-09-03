// Critic probe generator (round D2 HUD hygiene critique). Emits tools/actions/yhd-*.json.
import { writeFileSync } from 'fs';
const out = (name, acts) => writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 50) => ({ type: 'key', key: k, ms });
const mouseCentre = { type: 'mousemove', x: 800, y: 450 };

// Shared helpers, attached once to window.__Y (eval steps share one page scope).
const LIB = `(()=>{window.__Y=window.__Y||{};const E=window.__echoes;
window.__Y.pid=(i)=>{const p=E.state().party;const m=p.find(q=>(q.partyIndex??0)===i);return m?m.id:null;};
window.__Y.rects=()=>{const SEL=['.hud-slot-key','.hud-port-key','.hud-slot-abbrev','.hud-slot-num','.hud-port-num','.hud-port-e','.hud-slot-passive','.hud-bn-label','.hud-bn-num','.hud-bn-pips','.hud-bn-bar','.tm-badge'];const vis=(n)=>{const r=n.getBoundingClientRect();let p=n;while(p&&p!==document.body){const c=getComputedStyle(p);if(c.display==='none'||Number(c.opacity)<0.02)return null;p=p.parentElement;}return r.width>0.5&&r.height>0.5?r:null;};const rs=[];for(const s of SEL)for(const n of document.querySelectorAll(s)){const r=vis(n);if(r)rs.push({s,txt:(n.textContent||'').trim().slice(0,8),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),fs:+(parseFloat(getComputedStyle(n).fontSize)).toFixed(1)});}const hits=[];for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],b=rs[j];const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);const oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);if(ox>0.5&&oy>0.5)hits.push({a:a.s+':'+a.txt,b:b.s+':'+b.txt,ox:+ox.toFixed(1),oy:+oy.toFixed(1)});}return {n:rs.length,overlaps:hits,rects:rs};};
window.__Y.gate=()=>{const E=window.__echoes;const r=E.cmd('runState');const b=E.hud.banner();const t=E.hud.threat();const s=E.state();const bn=document.getElementById('hud-banner');const cs=getComputedStyle(bn);const wash=document.getElementById('bk-wash');const pages=[...document.querySelectorAll('#run-screen .rn-page')].filter(p=>getComputedStyle(p).display!=='none').map(p=>p.className);const m=E.hud.metrics();return {tick:E.tick,phase:r&&r.phase,active:r&&r.active,combatActive:r&&r.combatActive,room:r&&r.room,hudCombat:E.hud.combat(),banner:{mode:b.mode,gated:b.gated,show:b.show,opacity:b.opacity,text:b.text,box:b.box,cssOpacity:cs.opacity,display:cs.display},threat:{gated:t.gated,offFrame:t.offFrame,markersDrawn:t.markersDrawn,domMarkers:t.domMarkers,covered:t.covered,uncued:t.uncued,tmNodes:document.querySelectorAll('#hud-threat .tm').length},markers:E.hud.markers(),enemies:(s.enemies||[]).map(e=>({id:e.id,kind:e.kind,x:e.x,z:e.z})),roomState:s.room?{mode:s.room.mode,cleared:s.room.cleared,alive:s.room.aliveEnemies,pending:s.room.pendingSpawns,wave:s.room.waveIndex}:null,scene:s.scene,vfxMode:s.vfx&&s.vfx.mode,pages,washOpacity:wash?getComputedStyle(wash).opacity:null,zone1:m.zone1Box,zone2:m.zone2Box,fps:E.fps};};
window.__Y.ports=()=>{const E=window.__echoes;const m=E.hud.metrics();return {tick:E.tick,scale:m.scale,ports:E.hud.portraits().map(p=>({i:p.index,c:p.classId,st:p.state,sel:p.selected,hov:p.hover,hp:p.hpWidth,num:p.numeral,inner:p.innerBorder+' '+p.innerColor,outline:p.trackOutline,trackBorder:p.trackBorder,fill:p.fillImage,keyVisible:p.keyVisible,keyBox:p.keyBox,keyColor:p.keyColor,keyText:document.querySelectorAll('.hud-port-key')[p.index].textContent,keyFs:+(parseFloat(getComputedStyle(document.querySelectorAll('.hud-port-key')[p.index]).fontSize)*m.scale).toFixed(2),identColor:p.identColor,eBox:p.eBox,imgFilter:p.imgFilter,numBox:p.numBox,tile:p.tileBox,hpBox:p.hpBox,rev:p.reviveOffset,revTot:p.reviveTotal,img:p.hasImage})),rects:window.__Y.rects(),revive:E.cmd('reviveState'),banner:E.hud.banner(),fps:E.fps};};
return 'lib';})()`;

// Restart the CURRENT room's wave schedule (fresh wave 1) so the run stays in combat.
const FRESH = `(()=>{const E=window.__echoes;const r=E.cmd('startRoom','kill_all');const s=E.cmd('runState');return {room:s&&s.room,phase:s&&s.phase,mode:r&&r.mode};})()`;
const G = `(()=>window.__Y.gate())()`;
const P = `(()=>window.__Y.ports())()`;
const TELE0 = `(()=>{window.__echoes.cmd('teleport',0,0);return 1;})()`;
// One enemy at every §11 edge spawn point (6 of 8 project off the safe frame).
const SPAWN8 = `(()=>{const E=window.__echoes;E.cmd('teleport',0,0);const P=[[-5,-6.6],[5,-6.6],[-10.2,-3],[10.2,-3],[-10.2,3],[10.2,3],[-5,6.6],[5,6.6]];return P.map((p,i)=>E.cmd('spawn',i%3===1?'mantis':'boar',p[0],p[1]));})()`;
const KILLCLEAR = `(()=>{const E=window.__echoes;const k=E.cmd('killAllEnemies');const c=E.cmd('clearRoom');return {killed:k,cleared:c,phase:E.cmd('runState').phase};})()`;
const SKIP7 = `(()=>{const v=window.__echoes.cmd('skipToRoom',7);return {room:v.room,phase:v.phase};})()`;
const SKIP8 = `(()=>{const v=window.__echoes.cmd('skipToRoom',8);return {room:v.room,phase:v.phase};})()`;
const WIN = `(()=>{const E=window.__echoes;E.cmd('bossHp',0.2);E.cmd('killAllEnemies');const kb=E.cmd('killBoss');E.cmd('killAllEnemies');return {killBoss:kb,phase:E.cmd('runState').phase};})()`;
const DEFEAT = `(()=>{const E=window.__echoes;const s=E.state();for(const p of s.party)E.cmd('setHp',p.id,0);return {tick:E.tick,phase:E.cmd('runState').phase};})()`;
const CAMP = `(()=>window.__echoes.cmd('returnToCamp'))()`;
const LEAKSPAWN = `(()=>{const E=window.__echoes;const a=E.cmd('spawn','boar',-11,0);const b=E.cmd('spawn','mantis',11,0.5);return {ids:[a,b],enemies:(E.state().enemies||[]).length,phase:E.cmd('runState').phase};})()`;
const STRAYROOM = `(()=>{const E=window.__echoes;const r=E.cmd('startRoom','kill_all');return {startRoom:r?{mode:r.mode}:r,phase:E.cmd('runState').phase};})()`;

// ---- 1. PHASE GATING (boot ?scene=arena&run=1&seed=777 unless noted)
out('yhd-gate-combat', [ev(LIB), ev(TELE0), mouseCentre, wait(300), ev(SPAWN8), wait(300), ev(G)]);
out('yhd-gate-reward', [ev(LIB), ev(KILLCLEAR), wait(900), ev(G)]);
out('yhd-gate-path', [ev(LIB), ev(KILLCLEAR), wait(900), ev(`(()=>{const E=window.__echoes;const d=E.cmd('draftDecline');return {declined:d,phase:E.cmd('runState').phase};})()`), wait(900), ev(G)]);
out('yhd-gate-shop', [ev(LIB), ev(SKIP7), wait(1200), ev(G)]);
out('yhd-gate-victory', [ev(LIB), ev(SKIP8), wait(800), ev(WIN), wait(900), ev(G)]);
out('yhd-gate-victory-leak', [ev(LIB), ev(SKIP8), wait(800), ev(WIN), wait(900), ev(LEAKSPAWN), wait(400), ev(G)]);
out('yhd-gate-defeat', [ev(LIB), ev(DEFEAT), wait(900), ev(G)]);
out('yhd-gate-defeat-leak', [ev(LIB), ev(DEFEAT), wait(900), ev(LEAKSPAWN), wait(400), ev(G)]);
out('yhd-gate-camp-v', [ev(LIB), ev(SKIP8), wait(800), ev(WIN), wait(900), ev(CAMP), wait(3500), ev(G)]);
out('yhd-gate-camp-d', [ev(LIB), ev(DEFEAT), wait(900), ev(CAMP), wait(3500), ev(G)]);
out('yhd-gate-camp-leak', [ev(LIB), ev(DEFEAT), wait(900), ev(CAMP), wait(1500), ev(STRAYROOM), ev(LEAKSPAWN), wait(1500), ev(G)]);
// Banner/pointer teardown timing across the run_end edge (victory), sampled per frame.
const VTRACE = `(async()=>{const E=window.__echoes;const raf=()=>new Promise(r=>requestAnimationFrame(r));let endT=null;E.on('run_end',()=>{endT=performance.now();});E.cmd('bossHp',0.2);E.cmd('killAllEnemies');const before={banner:E.hud.banner().mode,opacity:E.hud.banner().opacity,tm:document.querySelectorAll('#hud-threat .tm').length,markers:E.hud.markers().length};const t0=performance.now();E.cmd('killBoss');const sync={phase:E.cmd('runState').phase,bannerMode:E.hud.banner().mode,show:E.hud.banner().show,tm:document.querySelectorAll('#hud-threat .tm').length,combat:E.hud.combat()};const tr=[];let outFirst=null,outDone=null;while(performance.now()-t0<1500){const b=E.hud.banner();const o=b.opacity;const tm=[...document.querySelectorAll('#hud-threat .tm')].filter(n=>n.style.display!=='none').length;tr.push([Math.round(performance.now()-t0),+o.toFixed(2),tm,b.mode]);if(outFirst===null&&o<0.995)outFirst=performance.now()-t0;if(outDone===null&&o<0.005)outDone=performance.now()-t0;if(outDone!==null&&performance.now()-t0>600)break;await raf();}return {before,sync,runEndMs:endT===null?null:Math.round(endT-t0),outFirstMs:outFirst===null?null:Math.round(outFirst),outDoneMs:outDone===null?null:Math.round(outDone),trace:tr.slice(0,24),phase:E.cmd('runState').phase,fps:E.fps};})()`;
out('yhd-gate-vtrace', [ev(LIB), ev(SKIP8), wait(800), ev(VTRACE)]);
// Same across the defeat edge.
const DTRACE = `(async()=>{const E=window.__echoes;const raf=()=>new Promise(r=>requestAnimationFrame(r));let endT=null;E.on('run_end',()=>{endT=performance.now();});const before={banner:E.hud.banner().mode,opacity:E.hud.banner().opacity,tm:document.querySelectorAll('#hud-threat .tm').length};const t0=performance.now();for(const p of E.state().party)E.cmd('setHp',p.id,0);const sync={phase:E.cmd('runState').phase,bannerMode:E.hud.banner().mode,show:E.hud.banner().show,tm:document.querySelectorAll('#hud-threat .tm').length};const tr=[];let outFirst=null,outDone=null;while(performance.now()-t0<1500){const b=E.hud.banner();const o=b.opacity;const tm=[...document.querySelectorAll('#hud-threat .tm')].filter(n=>n.style.display!=='none').length;tr.push([Math.round(performance.now()-t0),+o.toFixed(2),tm,b.mode]);if(outFirst===null&&o<0.995)outFirst=performance.now()-t0;if(outDone===null&&o<0.005)outDone=performance.now()-t0;if(outDone!==null&&performance.now()-t0>600)break;await raf();}return {before,sync,runEndMs:endT===null?null:Math.round(endT-t0),outFirstMs:outFirst===null?null:Math.round(outFirst),outDoneMs:outDone===null?null:Math.round(outDone),trace:tr.slice(0,24),phase:E.cmd('runState').phase,fps:E.fps};})()`;
out('yhd-gate-dtrace', [ev(LIB), ev(SPAWN8), wait(300), ev(DTRACE)]);

// ---- 2. DOWNED IDENTITY: allies 2 + 3 down, tank at 12% (ineligible reviver, <30%)
const SET_DOWN2 = `(()=>{const E=window.__echoes;const Y=window.__Y;E.cmd('teleport',0,0);E.cmd('setHp',Y.pid(1),0.12);E.cmd('setHp',Y.pid(2),0);E.cmd('setHp',Y.pid(3),0);E.hud.freeze(0.25);if(E.hud.overrideIndex()!==null)E.cmd('healOverride',E.hud.overrideIndex());return E.hud.portraits().map(p=>p.state);})()`;
out('yhd-downed', [ev(LIB), ev(FRESH), mouseCentre, ev(SET_DOWN2), wait(600), ev(SET_DOWN2), wait(80), ev(P)]);
out('yhd-healthy', [ev(LIB), ev(FRESH), mouseCentre, ev(TELE0), wait(300), ev(P)]);

// ---- 3. PORTRAIT STATE MACHINE
const SET_A = `(()=>{const E=window.__echoes;const Y=window.__Y;E.cmd('teleport',0,0);E.cmd('setHp',Y.pid(1),0.4);E.cmd('setHp',Y.pid(2),0.12);E.cmd('setHp',Y.pid(3),0);E.hud.freeze(0.25);if(E.hud.overrideIndex()!==0)E.cmd('healOverride',0);return E.hud.portraits().map(p=>p.state);})()`;
out('yhd-states-a', [ev(LIB), ev(FRESH), mouseCentre, ev(SET_A), wait(1500), ev(SET_A), wait(60), ev(P)]);
const SET_LO = `(()=>{const E=window.__echoes;const Y=window.__Y;E.cmd('setHp',Y.pid(1),0.4);E.cmd('setHp',Y.pid(2),0.12);E.hud.freeze(0.0);E.hud.hover(1,true);return E.hud.portraits().map(p=>p.state);})()`;
const READ_LO = `(()=>{const E=window.__echoes;const t=[...document.querySelectorAll('.hud-port-tile')];return {ports:E.hud.portraits().map((p,i)=>({i:p.index,st:p.state,hov:p.hover,inner:p.innerBorder+' '+p.innerColor,outline:p.trackOutline,tileBorder:getComputedStyle(t[i]).borderTopColor,tileBg:getComputedStyle(t[i]).backgroundImage.slice(0,70),fill:p.fillImage}))};})()`;
out('yhd-states-lo', [ev(LIB), ev(FRESH), mouseCentre, ev(SET_A), wait(1500), ev(SET_LO), wait(80), ev(READ_LO)]);
const PULSE = `(async()=>{const E=window.__echoes;const Y=window.__Y;E.hud.unfreeze();E.cmd('setHp',Y.pid(2),0.12);const raf=()=>new Promise(r=>requestAnimationFrame(r));const s=[];const t0=performance.now();while(performance.now()-t0<1100){const p=E.hud.portraits()[2];s.push([Math.round(performance.now()-t0),parseFloat(p.innerBorder),p.innerColor]);await raf();}let peaks=0;const pk=[];for(let i=1;i<s.length-1;i++){if(s[i][1]>=2.9&&s[i-1][1]<s[i][1]&&s[i][1]>=s[i+1][1]){peaks++;pk.push(s[i][0]);}}const mx=Math.max(...s.map(x=>x[1]));const mn=Math.min(...s.map(x=>x[1]));return {samples:s.length,peaksIn1100ms:peaks,peakMs:pk,minW:mn,maxW:mx,numeral:E.hud.portraits()[2].numeral,trace:s.filter((_,i)=>i%6===0)};})()`;
out('yhd-pulse', [ev(LIB), ev(FRESH), ev(PULSE)]);
// Being-revived: tank healthy, archer down -> AI tank channels.
out('yhd-states-rev', [ev(LIB), ev(FRESH), mouseCentre, ev(`(()=>{const E=window.__echoes;const Y=window.__Y;E.cmd('teleport',0,0);E.cmd('setHp',Y.pid(3),0);return 1;})()`), wait(2600), ev(P)]);
// Cooldown numeral vs abbrev (sub-1 s): Digit1 then Space, read at 0.6 s / 0.8 s left.
const AIM = `(()=>{window.dispatchEvent(new MouseEvent('mousemove',{clientX:innerWidth*0.6,clientY:innerHeight*0.35,bubbles:true}));return 1;})()`;
const READ_MID = `(()=>{const s=window.__echoes.hud.slots()[0];return {mid:{wipeDeg:s.wipeDeg,cooling:s.cooling,counting:s.counting,bg:document.querySelector('.hud-slot-wipe').style.background.slice(0,120)}};})()`;
const READ_CD = `(()=>{const E=window.__echoes;const S=E.hud.slots();return {tick:E.tick,slots:S.map(s=>({k:s.key,a:s.abbrev,aVis:s.abbrevVisible,cnt:s.counting,num:s.numeral,deg:s.wipeDeg,empty:s.empty,abbrevBox:s.abbrevBox,numBox:s.numBox,keyBox:s.keyBox})),rects:window.__Y.rects(),fps:E.fps};})()`;
out('yhd-cd', [ev(LIB), ev(FRESH), ev(AIM), key('Digit1'), wait(300), ev(READ_MID), wait(2050), key('Space'), wait(450), ev(READ_CD)]);

// ---- 4. NO TINT: camp (default boot) / brazier pool / boss room
const READ_CHROME = `(()=>{const E=window.__echoes;const m=E.hud.metrics();const s=E.hud.slots();const p=E.hud.portraits();const st=E.state();return {metrics:{zone1Box:m.zone1Box,zone2Box:m.zone2Box,scale:m.scale},slotBoxes:s.map(x=>({k:x.key,a:x.abbrev,tile:x.tileBox,abbrev:x.abbrevBox,key:x.keyBox})),portTiles:p.map(x=>x.tileBox),chrome:E.hud.chrome(),player:st.party.find(q=>(q.partyIndex??0)===0),scene:st.scene,vfxMode:st.vfx&&st.vfx.mode,phase:E.cmd('runState').phase,banner:E.hud.banner(),fps:E.fps};})()`;
out('yhd-tint-camp', [ev(LIB), wait(300), ev(READ_CHROME)]);
const place = (px, pz, a) => `(()=>{const E=window.__echoes;E.cmd('teleport',${px},${pz});E.cmd('placeAlly',1,${a[0][0]},${a[0][1]});E.cmd('placeAlly',2,${a[1][0]},${a[1][1]});E.cmd('placeAlly',3,${a[2][0]},${a[2][1]});return 'p';})()`;
const IN_POOL = place(3.2, -2.4, [[2.6, -2.0], [3.8, -2.0], [3.2, -3.0]]);
out('yhd-tint-pool', [ev(LIB), ev(FRESH), mouseCentre, ev(IN_POOL), wait(700), ev(IN_POOL), wait(120), ev(READ_CHROME)]);
out('yhd-tint-boss', [ev(LIB), ev(SKIP8), wait(2500), ev(`(()=>window.__echoes.cmd('bossHp',0.62,true))()`), wait(300), ev(READ_CHROME)]);

// ---- 5. SIZE SWEEP + FPS A/B
const SOUP = `(()=>{const E=window.__echoes;const Y=window.__Y;E.cmd('giveSkill','warding_aura');E.cmd('giveSkill','nova_bloom');E.cmd('setHp',Y.pid(1),0.4);E.cmd('setHp',Y.pid(2),0.12);E.cmd('setHp',Y.pid(3),0);E.hud.freeze(0.25);if(E.hud.overrideIndex()!==0)E.cmd('healOverride',0);window.dispatchEvent(new MouseEvent('mousemove',{clientX:innerWidth*0.6,clientY:innerHeight*0.35,bubbles:true}));return E.hud.slots().map(s=>s.abbrev);})()`;
const READ_SIZE = `(()=>{const E=window.__echoes;const m=E.hud.metrics();const r=window.__Y.rects();const minFs=(sel)=>{const v=r.rects.filter(x=>x.s===sel).map(x=>x.fs*m.scale);return v.length?+Math.min(...v).toFixed(2):null;};return {metrics:m,slots:E.hud.slots().map(s=>({k:s.key,a:s.abbrev,cnt:s.counting,num:s.numeral,pas:s.passive})),ports:E.hud.portraits().map(p=>p.state+(p.selected?'+sel':'')),overlaps:r.overlaps,nRects:r.n,realPx:{key:minFs('.hud-slot-key'),portKey:minFs('.hud-port-key'),abbrev:minFs('.hud-slot-abbrev'),slotNum:minFs('.hud-slot-num'),portNum:minFs('.hud-port-num'),bnLabel:minFs('.hud-bn-label'),bnNum:minFs('.hud-bn-num'),e:minFs('.hud-port-e')},chrome:E.hud.chrome(),banner:E.hud.banner(),threat:(()=>{const t=E.hud.threat();return {off:t.offFrame,dom:t.domMarkers,uncued:t.uncued};})(),fps:E.fps};})()`;
out('yhd-size', [ev(LIB), ev(FRESH), ev(SOUP), key('Digit1'), wait(2600), ev(SOUP), key('Space'), wait(500), ev(SOUP), wait(60), ev(READ_SIZE)]);
const FPS_ABA = `(async()=>{const E=window.__echoes;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));const run=async(on,ms)=>{E.hud.setEnabled(on);await sl(400);const f=[];const t0=performance.now();while(performance.now()-t0<ms){f.push(E.fps);await sl(100);}f.sort((a,b)=>a-b);return {on,n:f.length,min:f[0],median:f[Math.floor(f.length/2)],max:f[f.length-1]};};const a=await run(true,2500);const b=await run(false,2500);const a2=await run(true,2500);const b2=await run(false,2500);E.hud.setEnabled(true);return {on1:a,off1:b,on2:a2,off2:b2,enemies:(E.state().enemies||[]).length,markers:E.hud.markers().length};})()`;
out('yhd-fps-ab', [ev(LIB), ev(FRESH), mouseCentre, wait(1200), ev(SPAWN8), wait(300), ev(FPS_ABA)]);

// ---- CAMP-SCENE bookends: default boot (camp), a run swaps the scene, return_to_camp swaps back.
const START = `(()=>{const E=window.__echoes;E.cmd('startRun');return {phase:E.cmd('runState').phase,scene:E.state().scene};})()`;
out('yhd-camp-v2', [ev(LIB), ev(START), wait(800), ev(SKIP8), wait(800), ev(WIN), wait(900), ev(G), ev(CAMP), wait(3500), ev(G)]);
out('yhd-camp-d2', [ev(LIB), ev(START), wait(2500), ev(DEFEAT), wait(900), ev(G), ev(CAMP), wait(3500), ev(G)]);
out('yhd-camp-leak2', [ev(LIB), ev(START), wait(2500), ev(DEFEAT), wait(900), ev(CAMP), wait(1500), ev(STRAYROOM), ev(LEAKSPAWN), wait(1500), ev(G)]);
// Camp-scene live combat control (banner + pointers must be PRESENT in a camp-booted run).
out('yhd-camp-combat', [ev(LIB), ev(START), wait(2500), ev(TELE0), wait(200), ev(SPAWN8), wait(300), ev(G)]);
// Boss banner numeral truth: what the sim says vs what the banner prints.
const BOSSREAD = `(()=>{const E=window.__echoes;const s=E.state();const st=(s.enemies||[]).find(e=>e.kind==='stag');return {tick:E.tick,runBoss:s.run&&s.run.boss,stag:st?{hp:st.hp,maxHp:st.maxHp}:null,bannerText:E.hud.banner().text,mode:E.hud.banner().mode,phase:s.run&&s.run.phase};})()`;
out('yhd-boss-hp', [ev(LIB), ev(SKIP8), wait(1200), ev(BOSSREAD), wait(1300), ev(BOSSREAD), ev(`(()=>window.__echoes.cmd('bossHp',0.62,true))()`), wait(400), ev(BOSSREAD)]);

// ---- smoke on the ?room= debug boot: document the gate state there too
out('yhd-smoke-arena', [ev(LIB), ev(G)]);
console.log('yhd probes written');
