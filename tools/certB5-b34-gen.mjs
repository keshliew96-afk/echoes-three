// certB5 — full-loop certification critic, block B round 5 (resumed instance).
//   node tools/certB5-b34-gen.mjs
// Writes tools/actions/certB5-b34.json programmatically (never hand-escaped).
// Probe: ONE page scope, boot ?seed=777 (no ?room):
//   run 1  = hastened defeat (portal by real input; HP pinned to 2 % with NO fight input so
//            enemies land every killing blow; Defeat card -> Return to Camp by real click)
//   run 2  = same again  -> B3 evidence (second run of the session, seed != run 1)
//   run 3  = fresh-run check (B4) + a few seconds of real play
// Every eval shares the page scope through window.__b5. Helpers copied from tools/certB5-gen.mjs
// (not imported: importing would re-write certB5-full.json as a side effect).
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('tools/actions', { recursive: true });

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const shot = (name) => ({ type: 'shot', name });
const click = (x, y, button = 'left') => ({ type: 'click', x, y, button });
const mm = (x, y) => ({ type: 'mousemove', x, y });
const iife = (body) => `(()=>{const E=window.__echoes;${body}})()`;
const waitFor = (cond, timeout = 20000, extra = '') =>
  ev(`(async()=>{const E=window.__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){try{if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};}catch(err){return {ok:false,err:String(err)};}await new Promise(r=>setTimeout(r,8));}return {ok:false,timeout:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}}})()`);

const SOCK_OPEN = `(()=>{const n=document.getElementById('socket-screen');return !!n&&n.classList.contains('nd-open')})()`;
const UI = `window.__echoes.runUi().screen`;
const ENDED = `(()=>{try{const u=window.__echoes.runUi();return u.screen==='end'||u.phase==='defeat'}catch(e){return false}})()`;

const ALL = ['run_start','room_enter','room_start','room_cleared','reward','reward_offer','draft','draft_taken','draft_declined',
  'path_offer','path_chosen','shop_buy','shop_purchase','currency_denied','boss_spawn','boss_death','victory','defeat','run_end','run_wiped',
  'return_to_camp','wave_start','downed','revive','director_stop','node_granted','skill_equip','boss_adds'];
const COUNTED = ['dash','skill_cast','hit','heal','ally_basic','ally_cast','death','enemy_spawn','boss_quake_start','mark','hit_immune'];

const arm = ev(iife(`window.__b5={ev:[],n:{},keys:[],scr:[],fs:[],hits:[],runs:{},lastScr:'none',lastScrAt:performance.now(),mk:E.tick};
const F=window.__b5;
for(const t of ${JSON.stringify(ALL)})E.on(t,e=>F.ev.push({T:t,tick:(e&&e.tick!=null)?e.tick:E.tick,d:(()=>{const o={};for(const k of Object.keys(e||{}))if(['room','index','id','reward','result','wallet','side','seed','mode','slot','item','node','skill','pct','spawned','reason','kind','nextRoom','cost','price'].includes(k))o[k]=e[k];return o})()}));
for(const t of ${JSON.stringify(COUNTED)})E.on(t,()=>{F.n[t]=(F.n[t]||0)+1});
// shallow copy of every hit event (primitive fields only, capped) so killing blows can be attributed
E.on('hit',e=>{if(F.hits.length<600){const o={tick:(e&&e.tick!=null)?e.tick:E.tick};for(const k of Object.keys(e||{})){const v=e[k];if(v===null||['number','string','boolean'].includes(typeof v))o[k]=v;else if(v&&typeof v==='object'&&('id' in v))o[k]='#'+v.id+(v.kind?':'+v.kind:'')+(v.classId?':'+v.classId:'');}F.hits.push(o);}});
F.iv=setInterval(()=>{try{const s=E.runUi().screen;if(s!==F.lastScr){const now=performance.now();F.scr.push({s,tick:E.tick,t:Math.round(now)});F.lastScr=s;F.lastScrAt=now;}}catch(_){}},8);
window.addEventListener('keydown',e=>{F.keys.push({c:e.code,scr:F.lastScr,ms:Math.round(performance.now()-F.lastScrAt),tick:E.tick})},true);
window.addEventListener('mousedown',e=>{F.keys.push({c:'mouse'+e.button,x:e.clientX,y:e.clientY,scr:F.lastScr,ms:Math.round(performance.now()-F.lastScrAt),tick:E.tick})},true);
return {armed:E.tick,version:E.version,seed:E.seed,bootSeed:E.bootSeed}`));

const snap = (tag) => ev(iife(`const s=E.state();const r=s.run||{};const u=(()=>{try{return E.runUi()}catch(e){return {screen:'ERR'}}})();const rs=(()=>{try{return E.cmd('runState')}catch(e){return null}})();const c=(()=>{try{return E.cmd('campState')}catch(e){return null}})();
return {tag:${JSON.stringify(tag)},tick:E.tick,fps:Math.round(E.fps),ver:E.version,seed:E.seed,bootSeed:E.bootSeed,scene:s.scene,campMode:c&&c.mode,runActive:r.active,phase:r.phase,room:r.room,rooms:rs&&rs.rooms,mode:r.mode,combat:r.combatActive,wallet:r.wallet,freeSlots:r.freeSkillSlots,clearedRooms:rs&&rs.clearedRooms,
enemies:s.enemies.length,enemyKinds:s.enemies.map(e=>e.kind),eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,numerals:s.vfx&&s.vfx.numerals,
party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),skills:s.skills.map(k=>k&&k.id),bench:s.build&&s.build.bench,boss:rs&&rs.boss,
ui:u.screen,socketOpen:${SOCK_OPEN},uiText:(u.text||'').replace(/\\s+/g,' ').slice(0,160),banner:(()=>{try{const b=E.hud.banner();return {vis:b.visible,text:b.text,sub:b.sub}}catch(e){return 'ERR'}})(),threat:(()=>{try{const t=E.hud.threat();return {markersDrawn:t.markersDrawn,domMarkers:t.domMarkers,gated:t.gated}}catch(e){return 'ERR'}})(),hudCombat:(()=>{try{return E.hud.combat()}catch(e){return 'ERR'}})(),counts:window.__b5&&window.__b5.n}`));

const dumpUi = (tag) => ev(iife(`const u=E.runUi();const so=${SOCK_OPEN};const F=window.__b5;
const rect=(b)=>{const r=b.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};
const btns=[...document.querySelectorAll('#run-screen .rn-btn')].filter(b=>b.offsetParent!==null).map(b=>[b.className.replace('rn-btn','').trim(),(b.textContent||'').replace(/\\s+/g,' ').trim().slice(0,16),...rect(b)]);
const cards=[...document.querySelectorAll('#run-screen .rn-card')].filter(b=>b.offsetParent!==null).map(b=>[(b.textContent||'').replace(/\\s+/g,' ').trim().slice(0,40),...rect(b)]);
const doors=[...document.querySelectorAll('#run-screen .rn-door')].filter(b=>b.offsetParent!==null).map(b=>[b.classList.contains('rn-focus'),...rect(b)]);
return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,socketOpen:so,phase:u.phase,room:u.room,wallet:u.wallet,freeSlots:u.freeSkillSlots,sinceOpenMs:u.sinceOpenMs,settled:u.settled,held:u.held,stale:u.stale,
focused:btns.filter(a=>/rn-focus/.test(a[0])).map(a=>a[1]),buttons:btns,cards,doors,uiButtons:u.buttons,
text:(u.text||'').replace(/\\s+/g,' ').slice(0,260),skills:E.state().skills.map(k=>k&&k.id),bench:E.state().build.bench,
keysOnThisScreen:F.keys.filter(k=>k.scr===u.screen&&k.tick>=(F.scr.length?F.scr[F.scr.length-1].tick:0)).map(k=>k.c+'@'+k.ms)}`));

const leak = (tag) => ev(iife(`const s=E.state();const c=(()=>{try{return E.cmd('campState')}catch(e){return null}})();const b=E.hud.banner();const t=E.hud.threat();
const layer=document.getElementById('dmg-num-layer');const kids=layer?[...layer.children]:[];
return {tag:${JSON.stringify(tag)},tick:E.tick,scene:s.scene,campMode:c&&c.mode,runs:c&&c.runs,runActive:s.run.active,phase:s.run.phase,room:s.run.room,wallet:s.run.wallet,
enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,projectiles:s.projectiles?s.projectiles.length:0,entityCount:E.entityCount,
vfxNumerals:s.vfx&&s.vfx.numerals,domNumerals:kids.length,visibleNumerals:kids.filter(n=>{const g=getComputedStyle(n);return g.display!=='none'&&+g.opacity>0.05}).length,
bannerVisible:b.visible,bannerText:b.text,bannerSub:b.sub,threatMarkers:t.markersDrawn,domMarkers:t.domMarkers,
party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),
seats:c&&c.seats,seatDrift:c&&c.seatDrift,rigs:c&&c.party&&c.party.rigs&&c.party.rigs.map(r=>[r.classId,+r.x.toFixed(2),+r.z.toFixed(2),r.anim||'-']),
skills:s.skills.map(k=>k&&k.id),bench:s.build.bench,socketOpen:${SOCK_OPEN},uiScreen:E.runUi().screen,evCount:window.__b5.ev.length,reviveDom:document.querySelectorAll('.revive-ring,.rv-ring,[class*=revive]').length}`));

const events = (tag) => ev(iife(`const F=window.__b5;return {tag:${JSON.stringify(tag)},n:F.ev.length,ev:F.ev.map(e=>e.T+'@'+e.tick+(Object.keys(e.d).length?JSON.stringify(e.d):'')),counts:F.n,screens:F.scr.map(s=>s.s+'@'+s.tick)}`));
const stashRun = (k) => ev(iife(`const F=window.__b5;F.runs[${k}]={ev:F.ev.slice(),n:Object.assign({},F.n),scr:F.scr.slice(),hits:F.hits.slice()};F.ev.length=0;F.n={};F.scr.length=0;F.hits.length=0;return 'stashed run ${k} ('+F.runs[${k}].ev.length+' events), log cleared t'+E.tick`));

// ---- B1-style portal start: real walk from wherever the player stands, press the prompt's key ----
const portalStart = (tag) => [
  mm(800, 450),
  ev(iife(`const c=E.cmd('campState');const p=document.getElementById('camp-prompt');return {tag:${JSON.stringify(tag)}+'-preportal',tick:E.tick,player:c.player,portal:c.portal,prompt:c.prompt,promptVisible:c.promptVisible,inPortal:c.inPortal,promptDom:p?{text:(p.textContent||'').replace(/\\s+/g,' ').trim(),display:getComputedStyle(p).display,opacity:getComputedStyle(p).opacity}:null,seedBefore:E.seed,runs:c.runs,mode:c.mode}`)),
  ev(iife(`window.__b5.walk={t0:performance.now(),tick0:E.tick,p0:E.cmd('campState').player,presses:0};return 'walk armed'`)),
  { type: 'loop', label: `walk-${tag}`, maxMs: 30000,
    cond: `(()=>{try{return !!window.__echoes.cmd('campState').promptVisible}catch(e){return false}})()`,
    body: [down('KeyW'), wait(400), up('KeyW'), wait(60), ev(iife(`const w=window.__b5.walk;w.presses++;const p=E.cmd('campState').player;return [w.presses,+p.x.toFixed(2),+p.z.toFixed(2)]`))] },
  { type: 'if', cond: `(()=>{try{return !window.__echoes.cmd('campState').promptVisible}catch(e){return true}})()`,
    then: [down('KeyD'), wait(400), up('KeyD'), wait(100),
      { type: 'loop', label: `walk2-${tag}`, maxMs: 15000,
        cond: `(()=>{try{return !!window.__echoes.cmd('campState').promptVisible}catch(e){return false}})()`,
        body: [down('KeyW'), wait(400), up('KeyW'), wait(60)] }] },
  wait(300),
  ev(iife(`const c=E.cmd('campState');const w=window.__b5.walk;const p=document.getElementById('camp-prompt');const cs=p?getComputedStyle(p):null;const r=p?p.getBoundingClientRect():null;
return {tag:${JSON.stringify(tag)}+'-atPortal',tick:E.tick,presses:w.presses,walkMs:Math.round(performance.now()-w.t0),walkTicks:E.tick-w.tick0,from:w.p0,player:c.player,distToPortal:+Math.hypot(c.player.x-c.portal.x,c.player.z-c.portal.z).toFixed(2),portalR:c.portal.radius||c.portal.r,inPortal:c.inPortal,promptVisible:c.promptVisible,prompt:c.prompt,dom:cs?{display:cs.display,opacity:cs.opacity,text:(p.textContent||'').replace(/\\s+/g,' ').trim(),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}:null}`)),
  shot(`certB5-${tag}-prompt`),
  ev(iife(`window.__b5.pressTick=E.tick;return {pressingKeyE:E.tick}`)),
  key('KeyE', 120),
  waitFor(`(()=>{const r=window.__echoes.state().run;return r.active&&r.room>=1})()`, 30000,
    `,room:E.state().run.room,seedAfter:E.seed,phase:E.state().run.phase,runState:E.cmd('runState'),campMode:E.cmd('campState').mode,runStartEv:window.__b5.ev.filter(e=>['run_start','room_enter','room_start'].includes(e.T)).map(e=>e.T+'@'+e.tick+JSON.stringify(e.d)),pressTick:window.__b5.pressTick`),
];

// ---- real-input fight body (~0.9 s) — used ONLY in run 3's "fresh room fights" leg ----
const fightBody = [
  key('Space', 45), mm(830, 340), key('Digit1', 45),
  down('KeyA'), wait(120), up('KeyA'),
  mm(1010, 500), key('Digit2', 45),
  mm(620, 500), key('Digit3', 45),
  down('KeyD'), wait(120), up('KeyD'),
  mm(800, 600), key('Digit4', 45),
  mm(800, 430), wait(100),
  ev(iife(`const s=E.state();window.__b5.fs.push([E.tick,Math.round(E.fps),s.enemies.length]);return null`)),
];

const campBack = (tag) => [
  waitFor(`(()=>{try{return window.__echoes.cmd('campState').mode==='camp'&&!window.__echoes.state().run.active}catch(e){return false}})()`, 30000,
    `,campRuns:E.cmd('campState').runs,scene:E.state().scene,rtc:window.__b5.ev.filter(e=>e.T==='return_to_camp').map(e=>e.tick)`),
  wait(1500), shot(`certB5-${tag}-backcamp`),
  leak(`${tag}-camp-arrival`),
];

// ---- hastened defeat run: portal by real input, HP pinned at 2 % with NO fight input, defeat card -> Return to Camp by real click ----
const defeatRun = (k, tag) => [
  ...portalStart(tag),
  wait(900), shot(`certB5-${tag}-r1-enter`), snap(`${tag}-room1-enter`),
  ev(iife(`const F=window.__b5;F['seed'+${k}]=E.seed;return {tag:'${tag}-seed',run:${k},seed:E.seed,bootSeed:E.bootSeed,seedsSoFar:[F.seed1,F.seed2,F.seed3].filter(x=>x!=null)}`)),
  wait(3500),
  ev(iife(`const F=window.__b5;F.pin={t0:performance.now(),tick0:E.tick,pins:0,downAll:false,log:[]};for(const p of E.state().party){E.cmd('setHp',p.id,0.02);F.pin.pins++;}
return {tag:'${tag}-hasten',tick:E.tick,method:'setHp(id,0.02) on all 4, no input',party:E.state().party.map(p=>[p.id,Math.round(p.hp),p.maxHp,!!p.downed]),enemies:E.state().enemies.length,enemyKinds:E.state().enemies.map(e=>e.kind),room:E.state().run.room,phase:E.state().run.phase}`)),
  shot(`certB5-${tag}-lowhp`),
  { type: 'loop', label: `pin-${tag}`, maxMs: 75000, cond: ENDED,
    body: [
      ev(iife(`const F=window.__b5;const s=E.state();let re=0;for(const p of s.party)if(!p.downed&&p.hp>0.03*p.maxHp){E.cmd('setHp',p.id,0.02);re++;}F.pin.pins+=re;const row=[E.tick,s.enemies.length,s.run.phase,s.run.room,E.runUi().screen,s.party.map(p=>Math.round(p.hp)+(p.downed?'D':'')).join('/'),re];F.pin.log.push(row);return row`)),
      wait(500),
      { type: 'if', cond: `${UI}==='draft'&&!${SOCK_OPEN}`, then: [wait(1500), dumpUi(`${tag}-pin-draft`), key('Enter', 90), wait(1300)] },
      { type: 'if', cond: SOCK_OPEN, then: [key('Escape', 100), wait(1100)] },
      { type: 'if', cond: `${UI}==='path'&&!${SOCK_OPEN}`, then: [wait(1500), dumpUi(`${tag}-pin-path`), click(703, 399), wait(1200)] },
    ] },
  // permitted fallback (task: downAll allowed ONLY to hasten) — used only if 75 s of pinning did not wipe
  { type: 'if', cond: `!${ENDED}`, then: [
    ev(iife(`const F=window.__b5;F.pin.downAll=true;const r=E.cmd('downAll');return {tag:'${tag}-downAll-fallback',tick:E.tick,result:r,party:E.state().party.map(p=>[p.id,Math.round(p.hp),!!p.downed])}`)),
    waitFor(ENDED, 30000, `,screen:E.runUi().screen,phase:E.runUi().phase`) ] },
  waitFor(ENDED, 5000, `,screen:E.runUi().screen,phase:E.runUi().phase,party:E.state().party.map(p=>[p.id,Math.round(p.hp),!!p.downed]),chain:window.__b5.ev.filter(e=>['downed','revive','run_end','run_wiped','defeat','director_stop','return_to_camp','room_cleared','room_enter'].includes(e.T)).map(e=>e.T+'@'+e.tick+JSON.stringify(e.d))`),
  ev(iife(`const F=window.__b5;const p=F.pin;const downs=F.ev.filter(e=>e.T==='downed').map(e=>e.tick);
const near=F.hits.filter(h=>downs.some(t=>Math.abs(h.tick-t)<=3)).slice(0,24);
return {tag:'${tag}-wipe-attribution',pinMs:Math.round(performance.now()-p.t0),pinTicks:E.tick-p.tick0,pins:p.pins,downAllUsed:p.downAll,downedTicks:downs,hitsTotal:F.hits.length,hitSampleKeys:F.hits.length?Object.keys(F.hits[0]):[],hitsNearDowns:near,pinLogTail:p.log.slice(-8)}`)),
  wait(1500), shot(`certB5-${tag}-defeat`), dumpUi(`${tag}-defeat`), snap(`${tag}-defeat`), leak(`${tag}-on-defeat-screen`),
  ev(iife(`const b=[...document.querySelectorAll('#run-screen .rn-btn')].filter(b=>b.offsetParent!==null).map(b=>{const r=b.getBoundingClientRect();return {t:(b.textContent||'').replace(/\\s+/g,' ').trim(),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}});const rc=b.find(x=>/return/i.test(x.t));const inside=!!rc&&800>=rc.x&&800<=rc.x+rc.w&&532>=rc.y&&532<=rc.y+rc.h;window.__b5.clickTick=E.tick;return {tag:'${tag}-returnBtn',tick:E.tick,buttons:b,clickAt:[800,532],insideReturnRect:inside}`)),
  click(800, 532), wait(1700),
  { type: 'if', cond: `${UI}==='end'`, then: [dumpUi(`${tag}-end-stillOpen`), key('Enter', 100), wait(1800)] },
  ...campBack(tag),
  snap(`${tag}-back-in-camp`),
  ev(iife(`window.__b5.evAtArrival=window.__b5.ev.length;return {evAtArrival:window.__b5.evAtArrival,tick:E.tick}`)),
  wait(6000),
  leak(`${tag}-camp-plus360ticks`), shot(`certB5-${tag}-backcamp-plus6s`),
  ev(iife(`const F=window.__b5;return {tag:'${tag}-quiescence',newEventsSinceArrival:F.ev.length-F.evAtArrival,list:F.ev.slice(F.evAtArrival).map(e=>e.T+'@'+e.tick)}`)),
  events(`${tag}-events`),
  stashRun(k),
];

// ---------------------------------------------------------------- probe: B3 + B4 --
const acts = [wait(1500), arm, snap('boot'), leak('boot')];
acts.push(...defeatRun(1, 'b34-run1'));
acts.push(...defeatRun(2, 'b34-run2'));

// ---- run 3: B4 freshness ----
acts.push(...portalStart('b34-run3'));
acts.push(wait(1500), shot('certB5-b34-run3-r1-enter'), snap('b34-run3-room1-enter'));
acts.push(ev(iife(`const rs=E.cmd('runState');const s=E.state();const F=window.__b5;F.seed3=E.seed;return {tag:'b34-run3-fresh',seed:E.seed,seed2:F.seed2,seed1:F.seed1,bootSeed:E.bootSeed,differsFromRun2:E.seed!==F.seed2,differsFromRun1:E.seed!==F.seed1,
room:rs.room,rooms:rs.rooms,mode:rs.mode,wallet:rs.wallet,clearedRooms:rs.clearedRooms,roomsDone:rs.roomsDone,freeSkillSlots:rs.freeSkillSlots,frameModes:rs.frame&&rs.frame.modes,
enemies:s.enemies.length,enemyKinds:s.enemies.map(e=>e.kind),party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed]),
skills:s.skills.map(k=>k&&k.id),skillSlotCount:s.skills.length,bench:s.build.bench,cooldowns:s.skills.map(k=>k&&(k.cooldown??k.cd??k.cooldownLeft??null)),banner:E.hud.banner().text,
events:F.ev.map(e=>e.T+'@'+e.tick+JSON.stringify(e.d))}`)));
acts.push(leak('b34-run3-room1'));
acts.push({ type: 'mousedown', button: 'right' });
acts.push(...fightBody, ...fightBody, ...fightBody, ...fightBody, ...fightBody, ...fightBody);
acts.push({ type: 'mouseup', button: 'right' });
acts.push(shot('certB5-b34-run3-r1-fight'), snap('b34-run3-r1-fight'));
acts.push(events('b34-run3-events'));
acts.push(ev(iife(`const F=window.__b5;return {tag:'b34-all-runs',run1:F.runs[1]&&F.runs[1].ev.length,run2:F.runs[2]&&F.runs[2].ev.length,run3:F.ev.length,seeds:[F.seed1,F.seed2,F.seed3],bootSeed:E.bootSeed,allDistinct:new Set([F.seed1,F.seed2,F.seed3]).size===3,fs:F.fs}`)));

// ---- syntax-check every eval / cond before writing (catches escaping mistakes at generation time) ----
let checked = 0;
const check = (a) => {
  if (a.type === 'eval') { new Function('return (' + a.code + ')'); checked++; }
  if (a.cond) { new Function('return (' + a.cond + ')'); checked++; }
  for (const b of (a.body || a.then || [])) check(b);
};
for (const a of acts) check(a);
writeFileSync('tools/actions/certB5-b34.json', JSON.stringify(acts, null, 1));
console.log('wrote certB5-b34', acts.length, 'top-level actions;', checked, 'eval/cond snippets parsed OK');
