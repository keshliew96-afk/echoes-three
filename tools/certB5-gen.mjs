// certB5 — full-loop certification critic, block B round 5. Action-file generator.
//   node tools/certB5-gen.mjs
// Writes tools/actions/certB5-*.json programmatically (never hand-escaped).
// Every eval shares ONE page scope: all state lives on window.__b5.
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('tools/actions', { recursive: true });

export const ev = (code) => ({ type: 'eval', code });
export const wait = (ms) => ({ type: 'wait', ms });
export const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
export const down = (k) => ({ type: 'keydown', key: k });
export const up = (k) => ({ type: 'keyup', key: k });
export const shot = (name) => ({ type: 'shot', name });
export const click = (x, y, button = 'left') => ({ type: 'click', x, y, button });
export const mm = (x, y) => ({ type: 'mousemove', x, y });
export const iife = (body) => `(()=>{const E=window.__echoes;${body}})()`;
export const waitFor = (cond, timeout = 20000, extra = '') =>
  ev(`(async()=>{const E=window.__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){try{if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};}catch(err){return {ok:false,err:String(err)};}await new Promise(r=>setTimeout(r,8));}return {ok:false,timeout:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}}})()`);
export const write = (name, acts) => {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length, 'actions');
};

export const SOCK_OPEN = `(()=>{const n=document.getElementById('socket-screen');return !!n&&n.classList.contains('nd-open')})()`;
const UI = `window.__echoes.runUi().screen`;

// union of the task's names and the builder's actual bus names
export const ALL = ['run_start','room_enter','room_start','room_cleared','reward','reward_offer','draft','draft_taken','draft_declined',
  'path_offer','path_chosen','shop_buy','shop_purchase','currency_denied','boss_spawn','boss_death','victory','defeat','run_end','run_wiped',
  'return_to_camp','wave_start','downed','revive','director_stop','node_granted','skill_equip','boss_adds'];
export const COUNTED = ['dash','skill_cast','hit','heal','ally_basic','ally_cast','death','enemy_spawn','boss_quake_start','mark','hit_immune'];

export const arm = ev(iife(`window.__b5={ev:[],n:{},keys:[],scr:[],fs:[],rt:{},runs:{},lastScr:'none',lastScrAt:performance.now(),mk:E.tick};
const F=window.__b5;
for(const t of ${JSON.stringify(ALL)})E.on(t,e=>F.ev.push({T:t,tick:(e&&e.tick!=null)?e.tick:E.tick,d:(()=>{const o={};for(const k of Object.keys(e||{}))if(['room','index','id','reward','result','wallet','side','seed','mode','slot','item','node','skill','pct','spawned','reason','kind','nextRoom','cost','price'].includes(k))o[k]=e[k];return o})()}));
for(const t of ${JSON.stringify(COUNTED)})E.on(t,()=>{F.n[t]=(F.n[t]||0)+1});
F.iv=setInterval(()=>{try{const s=E.runUi().screen;if(s!==F.lastScr){const now=performance.now();F.scr.push({s,tick:E.tick,t:Math.round(now)});F.lastScr=s;F.lastScrAt=now;}}catch(_){}},8);
window.addEventListener('keydown',e=>{F.keys.push({c:e.code,scr:F.lastScr,ms:Math.round(performance.now()-F.lastScrAt),tick:E.tick})},true);
window.addEventListener('mousedown',e=>{F.keys.push({c:'mouse'+e.button,x:e.clientX,y:e.clientY,scr:F.lastScr,ms:Math.round(performance.now()-F.lastScrAt),tick:E.tick})},true);
return {armed:E.tick,version:E.version,seed:E.seed,bootSeed:E.bootSeed}`));

export const snap = (tag) => ev(iife(`const s=E.state();const r=s.run||{};const u=(()=>{try{return E.runUi()}catch(e){return {screen:'ERR'}}})();const rs=(()=>{try{return E.cmd('runState')}catch(e){return null}})();const c=(()=>{try{return E.cmd('campState')}catch(e){return null}})();
return {tag:${JSON.stringify(tag)},tick:E.tick,fps:Math.round(E.fps),ver:E.version,seed:E.seed,bootSeed:E.bootSeed,scene:s.scene,campMode:c&&c.mode,runActive:r.active,phase:r.phase,room:r.room,rooms:rs&&rs.rooms,mode:r.mode,combat:r.combatActive,wallet:r.wallet,freeSlots:r.freeSkillSlots,clearedRooms:rs&&rs.clearedRooms,
enemies:s.enemies.length,enemyKinds:s.enemies.map(e=>e.kind),eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,numerals:s.vfx&&s.vfx.numerals,
party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),skills:s.skills.map(k=>k&&k.id),bench:s.build&&s.build.bench,boss:rs&&rs.boss,
ui:u.screen,socketOpen:${SOCK_OPEN},uiText:(u.text||'').replace(/\\s+/g,' ').slice(0,160),banner:(()=>{try{const b=E.hud.banner();return {vis:b.visible,text:b.text,sub:b.sub}}catch(e){return 'ERR'}})(),threat:(()=>{try{const t=E.hud.threat();return {markersDrawn:t.markersDrawn,domMarkers:t.domMarkers,gated:t.gated}}catch(e){return 'ERR'}})(),hudCombat:(()=>{try{return E.hud.combat()}catch(e){return 'ERR'}})(),counts:window.__b5&&window.__b5.n}`));

// visible buttons/cards/doors with rects — proves click coordinates land inside boxes
export const dumpUi = (tag) => ev(iife(`const u=E.runUi();const so=${SOCK_OPEN};const F=window.__b5;
const rect=(b)=>{const r=b.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};
const btns=[...document.querySelectorAll('#run-screen .rn-btn')].filter(b=>b.offsetParent!==null).map(b=>[b.className.replace('rn-btn','').trim(),(b.textContent||'').replace(/\\s+/g,' ').trim().slice(0,16),...rect(b)]);
const cards=[...document.querySelectorAll('#run-screen .rn-card')].filter(b=>b.offsetParent!==null).map(b=>[(b.textContent||'').replace(/\\s+/g,' ').trim().slice(0,40),...rect(b)]);
const doors=[...document.querySelectorAll('#run-screen .rn-door')].filter(b=>b.offsetParent!==null).map(b=>[b.classList.contains('rn-focus'),...rect(b)]);
return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,socketOpen:so,phase:u.phase,room:u.room,wallet:u.wallet,freeSlots:u.freeSkillSlots,sinceOpenMs:u.sinceOpenMs,settled:u.settled,held:u.held,stale:u.stale,
focused:btns.filter(a=>/rn-focus/.test(a[0])).map(a=>a[1]),buttons:btns,cards,doors,uiDoors:u.doors&&u.doors.map(d=>[d.glyphs&&d.glyphs.join(''),d.focused,d.box&&d.box.x,d.box&&d.box.y,d.box&&d.box.w,d.box&&d.box.h]),plaques:u.plaques,owned:u.owned,uiCards:u.cards,
text:(u.text||'').replace(/\\s+/g,' ').slice(0,200),skills:E.state().skills.map(k=>k&&k.id),bench:E.state().build.bench,
keysOnThisScreen:F.keys.filter(k=>k.scr===u.screen&&k.tick>=(F.scr.length?F.scr[F.scr.length-1].tick:0)).map(k=>k.c+'@'+k.ms)}`));

export const leak = (tag) => ev(iife(`const s=E.state();const c=(()=>{try{return E.cmd('campState')}catch(e){return null}})();const b=E.hud.banner();const t=E.hud.threat();
const layer=document.getElementById('dmg-num-layer');const kids=layer?[...layer.children]:[];
return {tag:${JSON.stringify(tag)},tick:E.tick,scene:s.scene,campMode:c&&c.mode,runs:c&&c.runs,runActive:s.run.active,phase:s.run.phase,room:s.run.room,wallet:s.run.wallet,
enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,projectiles:s.projectiles?s.projectiles.length:0,entityCount:E.entityCount,
vfxNumerals:s.vfx&&s.vfx.numerals,domNumerals:kids.length,visibleNumerals:kids.filter(n=>{const g=getComputedStyle(n);return g.display!=='none'&&+g.opacity>0.05}).length,
bannerVisible:b.visible,bannerText:b.text,bannerSub:b.sub,threatMarkers:t.markersDrawn,domMarkers:t.domMarkers,
party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),
seats:c&&c.seats,seatDrift:c&&c.seatDrift,rigs:c&&c.party&&c.party.rigs&&c.party.rigs.map(r=>[r.classId,+r.x.toFixed(2),+r.z.toFixed(2),r.anim||'-']),
skills:s.skills.map(k=>k&&k.id),bench:s.build.bench,socketOpen:${SOCK_OPEN},uiScreen:E.runUi().screen,evCount:window.__b5.ev.length,reviveDom:document.querySelectorAll('.revive-ring,.rv-ring,[class*=revive]').length}`));

export const events = (tag) => ev(iife(`const F=window.__b5;return {tag:${JSON.stringify(tag)},n:F.ev.length,ev:F.ev.map(e=>e.T+'@'+e.tick+(Object.keys(e.d).length?JSON.stringify(e.d):'')),counts:F.n,screens:F.scr.map(s=>s.s+'@'+s.tick)}`));
export const stashRun = (k) => ev(iife(`const F=window.__b5;F.runs[${k}]={ev:F.ev.slice(),n:Object.assign({},F.n),scr:F.scr.slice()};F.ev.length=0;F.n={};F.scr.length=0;return 'stashed run ${k} ('+F.runs[${k}].ev.length+' events), log cleared t'+E.tick`));

// ---- B1: real walk from the boot seat to the portal, press the prompt's key ----
export const portalStart = (tag) => [
  mm(800, 450),
  ev(iife(`const c=E.cmd('campState');const p=document.getElementById('camp-prompt');return {tag:${JSON.stringify(tag)}+'-preportal',tick:E.tick,keys:Object.keys(c),player:c.player,portal:c.portal,hearth:c.hearth,prompt:c.prompt,promptVisible:c.promptVisible,inPortal:c.inPortal,promptDom:p?{text:(p.textContent||'').replace(/\\s+/g,' ').trim(),display:getComputedStyle(p).display,opacity:getComputedStyle(p).opacity}:null,seedBefore:E.seed,runs:c.runs,mode:c.mode}`)),
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

// ---- real-input fight body (~0.9 s): dodge first, aim sweeps, held right mouse (outside), skills 1-4, A/D strafes ----
export const fightBody = [
  key('Space', 45), mm(830, 340), key('Digit1', 45),
  down('KeyA'), wait(120), up('KeyA'),
  mm(1010, 500), key('Digit2', 45),
  mm(620, 500), key('Digit3', 45),
  down('KeyD'), wait(120), up('KeyD'),
  mm(800, 600), key('Digit4', 45),
  mm(800, 430), wait(100),
  ev(iife(`const s=E.state();window.__b5.fs.push([E.tick,Math.round(E.fps),s.enemies.length]);return null`)),
];
const felledShot = (tag) => ({ type: 'if',
  cond: `(()=>{try{const b=window.__echoes.hud.banner();return !window.__b5.felledShot&&/FELLED/i.test((b.text||'')+(b.sub||''))}catch(e){return false}})()`,
  then: [ev(iife(`window.__b5.felledShot=true;const b=E.hud.banner();return {tag:'${tag}-felled',tick:E.tick,banner:b.text,sub:b.sub,enemies:E.state().enemies.length,boss:E.cmd('runState').boss}`)), shot(`certB5-${tag}-felled`)] });
const bossShot = (tag) => ({ type: 'if',
  cond: `(()=>{try{const F=window.__b5;return !F.bossShot&&F.ev.some(e=>e.T==='boss_adds')}catch(e){return false}})()`,
  then: [ev(iife(`window.__b5.bossShot=true;return {tag:'${tag}-bossmid',tick:E.tick,banner:E.hud.banner().text,boss:E.cmd('runState').boss,enemies:E.state().enemies.length}`)), shot(`certB5-${tag}-bossmid`)] });
export const fightLoop = (i, tag, maxMs = 240000) => ({
  type: 'loop', label: `fight-${tag}-room${i}`, maxMs,
  cond: `(()=>{try{const E=window.__echoes;const r=E.state().run;return E.runUi().screen!=='none'||!r.active||r.room>${i}||${SOCK_OPEN}}catch(e){return false}})()`,
  body: i === 8 ? [...fightBody, bossShot(tag), felledShot(tag)] : fightBody,
});
export const markRoom = (i, tag) => ev(iife(`const F=window.__b5;F.rt[${i}]={t0:performance.now(),tick0:E.tick,fs0:F.fs.length};const rs=E.cmd('runState');return {markRoom:${i},tag:'${tag}',startTick:E.tick,uiRoom:E.state().run.room,mode:E.state().run.mode,rsRoom:rs.room,enemies:E.state().enemies.length,wallet:rs.wallet,party:E.state().party.map(p=>[p.id,Math.round(p.hp),!!p.downed])}`));
export const endRoom = (i, tag) => ev(iife(`const F=window.__b5;const r=F.rt[${i}];r.ms=Math.round(performance.now()-r.t0);r.ticks=E.tick-r.tick0;const fs=F.fs.slice(r.fs0).map(a=>a[1]);r.fpsMin=fs.length?Math.min(...fs):null;r.fpsMed=fs.length?fs.slice().sort((a,b)=>a-b)[fs.length>>1]:null;const u=E.runUi();
return {endRoom:${i},tag:'${tag}',wallS:+(r.ms/1000).toFixed(1),ticks:r.ticks,fpsMin:r.fpsMin,fpsMed:r.fpsMed,samples:fs.length,screen:u.screen,socketOpen:${SOCK_OPEN},phase:u.phase,uiRoom:u.room,wallet:u.wallet,takes:F.ev.filter(e=>e.T==='draft_taken').length,declines:F.ev.filter(e=>e.T==='draft_declined').length,party:E.state().party.map(p=>[p.id,Math.round(p.hp),!!p.downed]),counts:Object.assign({},F.n),cleared:F.ev.filter(e=>e.T==='room_cleared').map(e=>e.tick)}`));

// ---- meta-screen handler: settle-aware (v0.4.60 300 ms window) — wait quietly, then the documented input ----
export const screenLoop = (tag, maxMs = 150000) => ({
  type: 'loop', label: `screens-${tag}`, maxMs,
  cond: `(()=>{try{const s=${UI};const so=${SOCK_OPEN};return (s==='end'&&!so)||(s==='none'&&!so)}catch(e){return false}})()`,
  body: [
    { type: 'if', cond: SOCK_OPEN, then: [
      shot(`certB5-${tag}-socket`),
      ev(iife(`const b=E.state().build;return {tag:'${tag}-socket',tick:E.tick,uiScreen:E.runUi().screen,bench:b.bench,skills:b.skills.map(s=>[s.id,s.sockets])}`)),
      key('Escape', 100), wait(1100),
      ev(iife(`return {tag:'${tag}-socketClosed',open:${SOCK_OPEN},screen:E.runUi().screen}`)) ] },
    { type: 'if', cond: `${UI}==='draft'&&!${SOCK_OPEN}`, then: [
      wait(1500), shot(`certB5-${tag}-draft`), dumpUi(`${tag}-draft`),
      key('Enter', 90), wait(1300), dumpUi(`${tag}-draft-afterEnter`),
      { type: 'if', cond: `${UI}==='draft'&&!${SOCK_OPEN}`, then: [
        click(728, 533), wait(1200), dumpUi(`${tag}-draft-afterTakeClick`) ] } ] },
    { type: 'if', cond: `${UI}==='shop'&&!${SOCK_OPEN}`, then: [
      wait(1500), shot(`certB5-${tag}-shop`), dumpUi(`${tag}-shop`),
      { type: 'if', cond: `(()=>{const E=window.__echoes;const u=E.runUi();const p=(u.plaques||[])[0];const price=p&&(p.price||p.cost)||25;return u.wallet>=price&&!window.__b5.bought})()`, then: [
        ev(iife(`window.__b5.walletBefore=E.runUi().wallet;return {tag:'${tag}-shop-preBuy',wallet:window.__b5.walletBefore,plaques:E.runUi().plaques,bench:E.state().build.bench}`)),
        click(500, 607), wait(1300),
        ev(iife(`window.__b5.bought=true;const u=E.runUi();return {tag:'${tag}-shopBuy',tick:E.tick,walletBefore:window.__b5.walletBefore,wallet:u.wallet,owned:u.owned,plaques:u.plaques,bench:E.state().build.bench,buys:window.__b5.ev.filter(e=>['shop_buy','shop_purchase','node_granted','currency_denied'].includes(e.T)).map(e=>[e.T,e.tick,JSON.stringify(e.d)])}`)),
        wait(900), shot(`certB5-${tag}-shop-bought`) ] },
      click(800, 769), wait(1300),
      { type: 'if', cond: `${UI}==='shop'&&!${SOCK_OPEN}`, then: [key('Enter', 90), wait(1300)] },
      dumpUi(`${tag}-shop-after`) ] },
    { type: 'if', cond: `${UI}==='path'&&!${SOCK_OPEN}`, then: [
      wait(1500), shot(`certB5-${tag}-path`), dumpUi(`${tag}-path`),
      click(703, 399), wait(1200),
      { type: 'if', cond: `${UI}==='path'&&!${SOCK_OPEN}`, then: [key('Enter', 90), wait(1200)] },
      dumpUi(`${tag}-path-after`) ] },
    { type: 'if', cond: `!['draft','shop','path','none','end'].includes(${UI})&&!${SOCK_OPEN}`, then: [
      wait(1500), shot(`certB5-${tag}-other`), dumpUi(`${tag}-other`), key('Enter', 90), wait(1200) ] },
    wait(400),
  ],
});

export const campBack = (tag) => [
  waitFor(`(()=>{try{return window.__echoes.cmd('campState').mode==='camp'&&!window.__echoes.state().run.active}catch(e){return false}})()`, 30000,
    `,campRuns:E.cmd('campState').runs,scene:E.state().scene,rtc:window.__b5.ev.filter(e=>e.T==='return_to_camp').map(e=>e.tick)`),
  wait(1500), shot(`certB5-${tag}-backcamp`),
  leak(`${tag}-camp-arrival`),
];
export const endScreen = (tag) => [
  waitFor(`${UI}==='end'`, 90000, `,screen:E.runUi().screen,phase:E.runUi().phase`),
  wait(1500), shot(`certB5-${tag}-end`), dumpUi(`${tag}-end`),
  ev(iife(`const rs=E.cmd('runState');return {tag:'${tag}-summary',summary:JSON.stringify(rs.summary),phase:rs.phase,active:rs.active}`)),
  leak(`${tag}-on-end-screen`),
  click(800, 532), wait(1700),
  { type: 'if', cond: `${UI}==='end'`, then: [dumpUi(`${tag}-end-stillOpen`), key('Enter', 100), wait(1800)] },
  ...campBack(tag),
];

// ---------------------------------------------------------------- probe: FULL LOOP --
// run 1: B1 + B2 (victory) ; run 2: B3 (defeat) ; run 3: B4 (fresh)
const acts = [wait(1500), arm, snap('boot'), leak('boot')];
acts.push(...portalStart('run1'));
acts.push(wait(1200), snap('run1-room1-enter'), shot('certB5-run1-r1-enter'));
for (let i = 1; i <= 8; i++) {
  acts.push(markRoom(i, 'run1'));
  if (i > 1) { acts.push(shot(`certB5-run1-r${i}-enter`)); acts.push(snap(`run1-r${i}-enter`)); }
  if (i === 8) acts.push(ev(iife(`window.__b5.bs=[];window.__b5.bt=setInterval(()=>{try{const b=E.hud.banner();const k=(b.text||'')+' || '+(b.sub||'');const l=window.__b5.bs[window.__b5.bs.length-1];const key=k.replace(/[0-9]+/g,'#');if(!l||l[3]!==key)window.__b5.bs.push([E.tick,k,E.state().enemies.length,key]);}catch(e){}},100);return 'banner sampler armed t'+E.tick`)));
  acts.push({ type: 'mousedown', button: 'right' });
  acts.push(fightLoop(i, 'run1', 240000));
  acts.push({ type: 'mouseup', button: 'right' });
  acts.push(wait(600));
  acts.push(endRoom(i, 'run1'));
  acts.push(snap(`run1-r${i}-cleared`));
  acts.push(shot(`certB5-run1-r${i}-cleared`));
  if (i === 8) break;
  acts.push(screenLoop(`run1-r${i}`, 150000));
  acts.push(snap(`run1-after-r${i}-screens`));
}
acts.push(ev(iife(`clearInterval(window.__b5.bt);const rs=E.cmd('runState');const s=E.state();const b=E.hud.banner();return {tag:'run1-r8-final',boss:rs.boss,phase:rs.phase,enemies:s.enemies.length,bannerText:b.text,ui:E.runUi().screen,bannerTimeline:window.__b5.bs.map(a=>[a[0],a[1],a[2]])}`)));
acts.push({ type: 'if', cond: SOCK_OPEN, then: [shot('certB5-run1-r8-socket'), key('Escape', 100), wait(1100)] });
acts.push(...endScreen('run1'));
acts.push(snap('run1-back-in-camp'));
acts.push(ev(iife(`const F=window.__b5;return {tag:'run1-roomTimes',rt:Object.fromEntries(Object.entries(F.rt).map(([k,v])=>[k,{wallS:+(v.ms/1000).toFixed(1),ticks:v.ticks,fpsMin:v.fpsMin,fpsMed:v.fpsMed}])),takes:F.ev.filter(e=>e.T==='draft_taken').map(e=>e.tick+JSON.stringify(e.d)),declines:F.ev.filter(e=>e.T==='draft_declined').length,paths:F.ev.filter(e=>e.T==='path_chosen').map(e=>e.tick+JSON.stringify(e.d)),navKeysOnPages:F.keys.filter(k=>k.scr!=='none'&&['KeyA','KeyD','ArrowLeft','ArrowRight','Enter','Space'].includes(k.c)).map(k=>k.scr+':'+k.c+'@'+k.ms)}`)));
acts.push(events('run1-events'));
acts.push(ev(iife(`window.__b5.seed1=E.seed;window.__b5.evAtArrival=window.__b5.ev.length;return {seed1:E.seed}`)));
acts.push(wait(5000));
acts.push(leak('run1-camp-plus300ticks'));
acts.push(ev(iife(`const F=window.__b5;return {tag:'run1-quiescence',newEventsSinceArrival:F.ev.length-F.evAtArrival,list:F.ev.slice(F.evAtArrival).map(e=>e.T+'@'+e.tick)}`)));
acts.push(stashRun(1));

// ---- run 2: B3 defeat loop. Hasten ONLY with setHp(id,0.02); every killing blow by an enemy ----
acts.push(...portalStart('run2'));
acts.push(wait(900), shot('certB5-run2-r1-enter'), snap('run2-room1-enter'));
acts.push(ev(iife(`window.__b5.seed2=E.seed;return {run:2,seed:E.seed,seed1:window.__b5.seed1,differsFromRun1:E.seed!==window.__b5.seed1}`)));
acts.push({ type: 'mousedown', button: 'right' });
acts.push(...fightBody, ...fightBody);
acts.push(ev(iife(`for(const p of E.state().party)E.cmd('setHp',p.id,0.02);return {tag:'run2-hasten',tick:E.tick,party:E.state().party.map(p=>[p.id,Math.round(p.hp),p.maxHp,!!p.downed]),enemies:E.state().enemies.length,room:E.state().run.room,phase:E.state().run.phase}`)));
acts.push({ type: 'loop', label: 'pin-run2', maxMs: 90000,
  cond: `(()=>{try{const u=window.__echoes.runUi();return u.screen==='end'||u.phase==='defeat'}catch(e){return false}})()`,
  body: [
    ev(iife(`const s=E.state();for(const p of s.party)if(!p.downed&&p.hp>0.03*p.maxHp)E.cmd('setHp',p.id,0.02);return [E.tick,s.enemies.length,s.run.phase,s.run.room,E.runUi().screen,s.party.map(p=>Math.round(p.hp)+(p.downed?'D':'')).join('/')]`)),
    ...fightBody,
    { type: 'if', cond: `${UI}==='draft'&&!${SOCK_OPEN}`, then: [wait(1500), key('Enter', 90), wait(1300)] },
    { type: 'if', cond: SOCK_OPEN, then: [key('Escape', 100), wait(1100)] },
    { type: 'if', cond: `${UI}==='path'&&!${SOCK_OPEN}`, then: [wait(1500), click(703, 399), wait(1200)] },
  ] });
acts.push({ type: 'mouseup', button: 'right' });
acts.push(waitFor(`(()=>{const u=window.__echoes.runUi();return u.screen==='end'||u.phase==='defeat'})()`, 30000,
  `,screen:E.runUi().screen,phase:E.runUi().phase,party:E.state().party.map(p=>[p.id,Math.round(p.hp),!!p.downed]),chain:window.__b5.ev.filter(e=>['downed','revive','run_end','run_wiped','defeat','director_stop','return_to_camp'].includes(e.T)).map(e=>e.T+'@'+e.tick+JSON.stringify(e.d))`));
acts.push(wait(1500), shot('certB5-run2-defeat'), dumpUi('run2-defeat'), snap('run2-defeat'), leak('run2-on-defeat-screen'));
acts.push(click(800, 532), wait(1700));
acts.push({ type: 'if', cond: `${UI}==='end'`, then: [dumpUi('run2-end-stillOpen'), key('Enter', 100), wait(1800)] });
acts.push(...campBack('run2'));
acts.push(snap('run2-back-in-camp'));
acts.push(ev(iife(`window.__b5.evAtArrival=window.__b5.ev.length;return {evAtArrival:window.__b5.evAtArrival}`)));
acts.push(wait(6000));
acts.push(leak('run2-camp-plus360ticks'), shot('certB5-run2-backcamp-plus6s'));
acts.push(ev(iife(`const F=window.__b5;return {tag:'run2-quiescence',newEventsSinceArrival:F.ev.length-F.evAtArrival,list:F.ev.slice(F.evAtArrival).map(e=>e.T+'@'+e.tick)}`)));
acts.push(events('run2-events'));
acts.push(stashRun(2));

// ---- run 3: B4 freshness ----
acts.push(...portalStart('run3'));
acts.push(wait(1500), shot('certB5-run3-r1-enter'), snap('run3-room1-enter'));
acts.push(ev(iife(`const rs=E.cmd('runState');const s=E.state();const F=window.__b5;return {tag:'run3-fresh',seed:E.seed,seed2:F.seed2,seed1:F.seed1,bootSeed:E.bootSeed,differsFromRun2:E.seed!==F.seed2,differsFromRun1:E.seed!==F.seed1,
room:rs.room,rooms:rs.rooms,mode:rs.mode,wallet:rs.wallet,clearedRooms:rs.clearedRooms,roomsDone:rs.roomsDone,freeSkillSlots:rs.freeSkillSlots,frameModes:rs.frame&&rs.frame.modes,
enemies:s.enemies.length,enemyKinds:s.enemies.map(e=>e.kind),party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed]),
skills:s.skills.map(k=>k&&k.id),skillSlotCount:s.skills.length,bench:s.build.bench,cooldowns:s.skills.map(k=>k&&(k.cooldown??k.cd??k.cooldownLeft??null)),
events:F.ev.map(e=>e.T+'@'+e.tick+JSON.stringify(e.d))}`)));
acts.push(leak('run3-room1'));
// a few seconds of real play in run 3 to show the fresh room fights
acts.push({ type: 'mousedown', button: 'right' });
acts.push(...fightBody, ...fightBody, ...fightBody, ...fightBody);
acts.push({ type: 'mouseup', button: 'right' });
acts.push(shot('certB5-run3-r1-fight'), snap('run3-r1-fight'));
acts.push(events('run3-events'));
acts.push(ev(iife(`const F=window.__b5;return {tag:'all-runs',run1:F.runs[1]&&F.runs[1].ev.length,run2:F.runs[2]&&F.runs[2].ev.length,run3:F.ev.length,seeds:[F.seed1,F.seed2,E.seed],bootSeed:E.bootSeed}`)));
write('certB5-full', acts);
