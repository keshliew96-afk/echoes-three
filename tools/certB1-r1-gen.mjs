// certB1 (block B, round 1) — full-loop certification critic. Action-file generator.
// Writes tools/actions/certB1-r1*.json programmatically (JSON.stringify, never hand-escaped).
//
//   node tools/certB1-r1-gen.mjs            -> tools/actions/certB1-r1.json
//
// One page scope, real input only on the certified runs:
//   B1  camp boot (?seed=777) -> WASD walk to the portal -> prompt visible -> press the chip's key (E)
//   B2  rooms 1-8 by real play (WASD / RMB hold / Digit1-4 / Space dodge / E revive hold), draft = click Take,
//       path = click a door, socket chain = Escape, shop = click a card + click Advance, boss to FELLED + mop-up,
//       victory screen = click Return to Camp
//   B3  run 2 through the portal, wipe hastened with cmd('downAll') ONLY, defeat screen = click Return to Camp,
//       leak audit in camp
//   B4  run 3 through the portal: fresh seed, full party, starting kit, room 1 fresh
//   B5  ordered event list dumped at the end of every run
// Every click is guarded by a live getBoundingClientRect containment check; a guard miss is logged as
// [FALLBACK] (never silent) and Enter is pressed instead.
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 70) => ({ type: 'key', key: k, ms });
const down = (k) => ({ type: 'keydown', key: k });
const up = (k) => ({ type: 'keyup', key: k });
const shot = (name) => ({ type: 'shot', name });
const click = (x, y) => ({ type: 'click', x, y });
const mm = (x, y) => ({ type: 'mousemove', x, y });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const IF = (cond, then) => ({ type: 'if', cond: iife(`return !!(${cond})`), then });
const LOOP = (label, cond, maxMs, body) => ({ type: 'loop', label, cond: iife(`return !!(${cond})`), maxMs, body });
const waitFor = (cond, timeout = 20000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);
const note = (s) => ev(`${JSON.stringify(s)}`);

// Bus types armed (real names emitted by src/sim + the names the task lists; unknown names are inert).
const TYPES = ['run_start', 'room_enter', 'room_start', 'room_cleared', 'room_soft_fail', 'reward_offer', 'reward', 'draft', 'draft_taken', 'draft_declined',
  'path_offer', 'path_chosen', 'shop_open', 'shop_purchase', 'shop_buy', 'shop_close', 'currency_denied', 'room_transition', 'boss_spawn', 'boss_death',
  'boss_adds', 'boss_despawn', 'boss_quake_start', 'boss_quake_resolve', 'boss_trample', 'victory', 'defeat', 'run_end', 'run_wiped', 'return_to_camp', 'wave_start',
  'waystone_spawn', 'downed', 'revive', 'revive_start', 'heal', 'death', 'skill_equip', 'node_granted', 'intent', 'dash_end', 'skill_cast', 'basic_fire', 'glint_gain',
  'ally_rescue', 'reward_forfeited', 'director_stop', 'hit', 'intent_denied', 'enemy_spawn', 'spawn_telegraph', 'telegraph_start'];
// Ordered-integrity list printed per run.
const ORDER = ['run_start', 'room_enter', 'room_start', 'room_cleared', 'room_soft_fail', 'reward_offer', 'draft_taken', 'draft_declined', 'path_offer', 'path_chosen',
  'shop_open', 'shop_purchase', 'currency_denied', 'shop_close', 'room_transition', 'boss_spawn', 'boss_adds', 'boss_despawn', 'boss_death', 'victory', 'defeat', 'run_end',
  'run_wiped', 'return_to_camp', 'reward_forfeited', 'director_stop'];
// High-volume types are counted, not stored.
const COUNT_ONLY = ['hit', 'heal', 'intent_denied', 'basic_fire', 'enemy_spawn', 'spawn_telegraph', 'telegraph_start', 'skill_cast', 'death', 'glint_gain'];

const arm = ev(iife(`window.__c={ev:[],hm:{},t0:performance.now()};window.__roomT={};window.__shots={};window.__bossId=null;window.__it=0;window.__dodge={};window.__fpsMin={};window.__seeds=[];
for(const t of ${JSON.stringify(TYPES)})E.on(t,e=>{const w=Math.round(performance.now()-window.__c.t0);const rec=Object.assign({T:t,w,tk:E.tick},e);
 if(t==='intent'){if(e.kind!=='dodge')return;rec.T='dodge_intent';}
 if(t==='death'){rec.isBoss=(e.id===window.__bossId);if(rec.isBoss){window.__c.ev.push(rec);}}
 if(${JSON.stringify(COUNT_ONLY)}.includes(t)){const m=window.__c.hm;m[t]=(m[t]||0)+1;return;}
 window.__c.ev.push(rec);
 if(t==='boss_spawn')window.__bossId=e.id;
 if(t==='room_enter')window.__roomT[e.index]={enterW:w,enterTick:E.tick,mode:e.mode,reward:e.reward,wallet:e.wallet};
 if(t==='room_cleared'){const ri=E.state().run.room;if(window.__roomT[ri]){window.__roomT[ri].clearW=w;window.__roomT[ri].clearTick=E.tick;}}
 if(t==='run_start'){window.__runSeed=E.seed;window.__seeds.push([E.tick,E.seed,E.bootSeed]);}});
window.__proj=(x,z)=>{try{const c=__arenaProbe.stage.camera;const v=c.position.clone().set(x,0.5,z).project(c);return {x:Math.round((v.x+1)/2*innerWidth),y:Math.round((1-v.y)/2*innerHeight)}}catch(e){return null}};
window.__dumpRun=(label)=>{const ev=window.__c.ev;const list=ev.filter(e=>${JSON.stringify(ORDER)}.includes(e.T)||(e.T==='death'&&e.isBoss)).map(e=>(e.T==='death'?'boss_death':e.T)+(e.T==='run_end'?'('+e.result+')':'')+(e.T==='room_enter'?'(r'+e.index+':'+e.mode+')':'')+(e.T==='boss_adds'?'('+e.pct+')':'')+'@'+e.tk);const m={};for(const e of ev)m[e.T]=(m[e.T]||0)+1;return {label,seed:window.__runSeed,seeds:window.__seeds,order:list,counts:m,hm:window.__c.hm,rooms:window.__roomT,fpsMin:window.__fpsMin,dodge:window.__dodge};};
window.__resetRun=()=>{window.__c.ev=[];window.__c.hm={};window.__roomT={};window.__bossId=null;window.__fpsMin={};window.__dodge={};window.__shots={};return 'reset '+E.tick};
return {armed:E.tick,version:E.version,seed:E.seed,bootSeed:E.bootSeed,href:location.href}`));

const snap = (tag) => ev(iife(`const s=E.state();const r=s.run;const u=E.runUi();const b=E.hud.banner();const th=E.hud.threat();return {tag:${JSON.stringify(tag)},tick:E.tick,w:Math.round(performance.now()-window.__c.t0),fps:E.fps,seed:E.seed,bootSeed:E.bootSeed,scene:s.scene,vfx:s.vfx&&s.vfx.variantName,active:r.active,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,wallet:r.wallet,freeSlots:r.freeSkillSlots,cleared:r.clearedRooms,roomState:s.room,enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,projectiles:s.projectiles.length,party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp*10)/10,p.maxHp,p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),skills:s.skills.map(k=>k&&[k.id,k.remainingTicks]),bench:s.build&&s.build.bench&&s.build.bench.map(n=>n.node||n),sockets:s.build&&s.build.skills&&s.build.skills.map(k=>[k.id,k.sockets]),boss:r.boss&&{active:r.boss.active,hp:r.boss.hp,adds:r.boss.adds,phases:r.boss.phasesFired},ui:u.screen,uiPhase:u.phase,banner:b.text,bannerMode:b.mode,bannerShow:b.show,hud:E.hud.combat(),threat:{gated:th.gated,offFrame:th.offFrame,markersDrawn:th.markersDrawn,domMarkers:th.domMarkers,uncued:th.uncued},numerals:s.vfx&&s.vfx.numerals,decals:s.vfx&&s.vfx.decals,entities:E.entityCount}`));
const rect = (sel) => `(()=>{const n=document.querySelector(${JSON.stringify(sel)});if(!n)return null;const r=n.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),cx:Math.round(r.x+r.width/2),cy:Math.round(r.y+r.height/2),vis:n.offsetParent!==null,txt:(n.textContent||'').trim().slice(0,40)}})()`;

// Click grids: the JSON needs literal coordinates, so each button gets a 4-px row grid around its
// live centre; exactly ONE row is chosen from the live rect (|row - cy| <= 2) and one click is emitted.
const grid = (y0, y1) => { const a = []; for (let y = y0; y <= y1; y += 4) a.push(y); return a; };
const pickRow = (sel, x, rows, varName) =>
  ev(iife(`const r=${rect(sel)};window.${varName}=-1;if(r&&r.vis&&Math.abs(r.cx-${x})<=r.w/2-4){let best=-1,bd=1e9;${JSON.stringify(rows)}.forEach((y,k)=>{const dd=Math.abs(y-r.cy);if(dd<bd){bd=dd;best=k;}});if(bd<=2)window.${varName}=best;}return {btn:${JSON.stringify(sel)},rect:r,row:window.${varName},clickAt:window.${varName}>=0?[${x},${JSON.stringify(rows)}[window.${varName}]]:null}`));
const clickRows = (x, rows, varName) => rows.map((y, k) => IF(`window.${varName}===${k}`, [click(x, y)]));
const TAKE_ROWS = grid(470, 640), ADV_ROWS = grid(530, 630), CAMP_ROWS = grid(490, 600);
const DOOR_PTS = [[703, 399], [897, 405]];
const SHOP_PTS = [[528, 390], [800, 390], [1072, 390]];
const AIM_R = 260, AIM_N = 16;
const aimPt = (k) => [Math.round(800 + AIM_R * Math.cos((k * Math.PI * 2) / AIM_N)), Math.round(450 + AIM_R * Math.sin((k * Math.PI * 2) / AIM_N))];

// ---------------- B1: WASD to the portal, press the prompt's own key ----------------
const walkToPortal = (tag) => [
  mm(800, 300),
  ev(iife(`const c=E.cmd('campState');window.__walk=[];return {tag:${JSON.stringify(tag)},tick:E.tick,scene:E.state().scene,mode:c.mode,player:c.player,portal:c.portal,hearth:c.hearth,inPortal:c.inPortal,promptVisible:c.promptVisible,promptKeyChip:(document.querySelector('#camp-prompt .cp-key')||{}).textContent,promptDisplay:getComputedStyle(document.querySelector('#camp-prompt')).display,runPhase:E.state().run.phase,rigs:c.party&&c.party.rigs}`)),
  LOOP(`walk-${tag}`, `E.cmd('campState').inPortal`, 40000, [
    ev(iife(`const c=E.cmd('campState');const p=c.player;const tx=c.portal.x,tz=c.portal.z+0.55;const dx=tx-p.x,dz=tz-p.z;window.__mv={W:dz<-0.2,S:dz>0.2,A:dx<-0.4&&p.z<-2.5,D:dx>0.4&&p.z<-2.5};if(window.__walk.length<400)window.__walk.push([E.tick,+p.x.toFixed(2),+p.z.toFixed(2)]);return null`)),
    IF('window.__mv.W', [down('KeyW')]), IF('window.__mv.S', [down('KeyS')]), IF('window.__mv.A', [down('KeyA')]), IF('window.__mv.D', [down('KeyD')]),
    wait(110),
    up('KeyW'), up('KeyS'), up('KeyA'), up('KeyD'),
  ]),
  ev(iife(`const w=window.__walk;return {walkSamples:w.length,first:w[0],mid:w[Math.floor(w.length/2)],last:w[w.length-1],dist:+Math.hypot(w[w.length-1][1]-w[0][1],w[w.length-1][2]-w[0][2]).toFixed(2),ticks:w[w.length-1][0]-w[0][0]}`)),
  waitFor(`E.cmd('campState').promptVisible`, 3000, `,camp:(({inPortal,promptVisible,player,prompt})=>({inPortal,promptVisible,player,promptBox:prompt.box,overlaps:prompt.overlaps}))(E.cmd('campState'))`),
  ev(iife(`const p=document.querySelector('#camp-prompt');return {promptText:p&&p.textContent.replace(/\\s+/g,' ').trim(),keyChip:p&&[...p.querySelectorAll('.cp-key')].map(k=>k.textContent.trim()),display:p&&getComputedStyle(p).display,opacity:p&&getComputedStyle(p).opacity,cls:p&&p.className,box:p&&(({x,y,width,height})=>({x:Math.round(x),y:Math.round(y),w:Math.round(width),h:Math.round(height)}))(p.getBoundingClientRect())}`)),
  shot(`certB1-${tag}-prompt`),
  ev(iife(`window.__runsBefore=window.__c.ev.filter(e=>e.T==='run_start').length;window.__seedBefore=E.seed;window.__n=window.__c.ev.length;window.__pressT=E.tick;return {runsBefore:window.__runsBefore,seedBefore:E.seed,bootSeed:E.bootSeed,pressTick:E.tick}`)),
  IF(`(document.querySelector('#camp-prompt .cp-key')||{}).textContent.trim()==='E'`, [key('KeyE', 80)]),
  IF(`(document.querySelector('#camp-prompt .cp-key')||{}).textContent.trim()!=='E'`, [note('[FALLBACK] prompt key chip is not E — no key pressed')]),
  waitFor(`window.__c.ev.filter(e=>e.T==='run_start').length>window.__runsBefore && E.state().run.active && E.state().run.room===1`, 6000,
    `,seed:E.seed,seedBefore:window.__seedBefore,bootSeed:E.bootSeed,runState:(({active,phase,room,mode,wallet,freeSkillSlots,clearedRooms})=>({active,phase,room,mode,wallet,freeSkillSlots,clearedRooms}))(E.cmd('runState')),lastBegin:E.cmd('campState').lastBegin,scene:E.state().scene,vfx:E.state().vfx.variantName,startEvents:window.__c.ev.slice(window.__n).map(e=>e.T+'@'+e.tk).slice(0,12)`),
  wait(900),
  snap(`${tag}-room1-enter`),
  ev(iife(`return {projTest:window.__proj(0,0),projPlayer:(p=>window.__proj(p.x,p.z))(E.state().party[0]),arenaProbe:!!window.__arenaProbe}`)),
  shot(`certB1-${tag}-room1`),
];

// ---------------- B2: real-play combat loop for one room ----------------
const PLAN = iife(`const s=E.state();const r=s.run;const me=s.party[0];const al=s.party.slice(1);const t=E.tick;window.__it++;
const d=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const live=al.filter(a=>!a.downed);const dn=al.filter(a=>a.downed);
const en=s.enemies.filter(e=>e.hp>0&&e.state!=='retreating'&&e.state!=='dead');
const bossE=(r.boss&&r.boss.active&&r.boss.hp>0)?{x:r.boss.x,z:r.boss.z,boss:1}:null;
const P={mv:{W:0,S:0,A:0,D:0},aim:-1,sk:[0,0,0,0],dodge:0,revive:0};
let anc=me;if(live.length)anc={x:live.reduce((q,a)=>q+a.x,0)/live.length,z:live.reduce((q,a)=>q+a.z,0)/live.length};
const threats=[];for(const e of en)if(e.telegraph)threats.push({x:e.telegraph.x,z:e.telegraph.z,rt:e.telegraph.resolveTick});
if(r.boss&&r.boss.quake)threats.push({x:r.boss.quake.x,z:r.boss.quake.z,rt:r.boss.quake.resolveTick,rad:r.boss.quake.radius||1.6});
const near=threats.filter(th=>d(th,me)<(th.rad?th.rad+0.6:2.4)&&(th.rt==null||(th.rt-t<=45&&th.rt-t>=-2)));
const hostiles=en.concat(bossE?[bossE]:[]).map(e=>({e,dd:d(e,me)})).sort((a,b)=>a.dd-b.dd);const enN=hostiles[0];
let mx=0,mz=0,mode='hold';
const dodgeReady=(me.dodgeReadyTick<=t)&&!me.downed&&me.dashTicksLeft===0;
if(near.length){const th=near[0];mx=me.x-th.x;mz=me.z-th.z;const L=Math.hypot(mx,mz)||1;mx/=L;mz/=L;mode='flee';if(dodgeReady&&near.some(th=>th.rt!=null&&th.rt-t<=30&&th.rt-t>=0))P.dodge=1;}
else if(enN&&enN.dd<1.5){mx=me.x-enN.e.x;mz=me.z-enN.e.z;const L=Math.hypot(mx,mz)||1;mx/=L;mz/=L;mode='back';if(dodgeReady&&enN.dd<1.0)P.dodge=1;}
else if(d(anc,me)>2.0){mx=anc.x-me.x;mz=anc.z-me.z;mode='regroup';}
else if(window.__it%5===0){const a=window.__it*1.9;mx=Math.cos(a);mz=Math.sin(a);mode='jiggle';}
if(d(anc,me)>3.2&&mode!=='regroup'){mx=anc.x-me.x;mz=anc.z-me.z;mode='leash';}
const rk='r'+r.room;if(!window.__dodge[rk]&&dodgeReady&&(window.__roomT[r.room]&&t-window.__roomT[r.room].enterTick>180)){P.dodge=1;window.__dodge[rk]={pressTick:t,readyTick:me.dodgeReadyTick,mode};}
P.mv.W=mz<-0.25?1:0;P.mv.S=mz>0.25?1:0;P.mv.A=mx<-0.25?1:0;P.mv.D=mx>0.25?1:0;
if(!me.downed&&dn.length&&!near.length){const tg=dn.map(a=>({a,dd:d(a,me)})).sort((p,q)=>p.dd-q.dd)[0];const hot=hostiles.some(h=>h.dd<3.2);if(!hot){if(tg.dd<0.5){P.mv={W:0,S:0,A:0,D:0};P.revive=1;mode='revive';}else{mx=tg.a.x-me.x;mz=tg.a.z-me.z;P.mv.W=mz<-0.15?1:0;P.mv.S=mz>0.15?1:0;P.mv.A=mx<-0.15?1:0;P.mv.D=mx>0.15?1:0;mode='toDowned';}}}
let tgt=null;const hurt=live.map(a=>({a,f:a.hp/a.maxHp})).sort((p,q)=>p.f-q.f)[0];
if(hurt&&hurt.f<0.75)tgt=hurt.a;else if(enN)tgt=enN.e;else if(live[0])tgt=live[0];
if(tgt){let pm=window.__proj(me.x,me.z),pt=window.__proj(tgt.x,tgt.z);if(!pm||!pt){pm={x:0,y:0};pt={x:tgt.x-me.x,y:tgt.z-me.z};}const ang=Math.atan2(pt.y-pm.y,pt.x-pm.x);P.aim=((Math.round(ang/(Math.PI*2/${AIM_N}))%${AIM_N})+${AIM_N})%${AIM_N};}
const anyHurt=live.some(a=>a.hp<a.maxHp*0.9)||me.hp<me.maxHp*0.9;
if(!me.downed&&!P.dodge)s.skills.forEach((k,i)=>{if(!k||k.passive||k.remainingTicks>0)return;const heal=k.id!=='spirit_bolt';if(heal?(anyHurt||window.__it%4===0):(en.length>0||bossE))P.sk[i]=1;});
const fk='r'+r.room;if(E.fps>0&&(window.__fpsMin[fk]==null||E.fps<window.__fpsMin[fk]))window.__fpsMin[fk]=Math.round(E.fps*10)/10;
window.__plan=P;
if(window.__it%25===0)return {t,w:Math.round(performance.now()-window.__c.t0),fps:E.fps,room:r.room,ph:r.phase,mode,en:en.length,alive:s.room&&s.room.aliveEnemies,pend:s.room&&s.room.pendingSpawns,wave:s.room&&s.room.waveIndex,dleft:s.room&&s.room.defendTicksLeft,ws:s.room&&s.room.waystone&&s.room.waystone.hp,hp:s.party.map(p=>Math.round(p.hp)),dn:s.party.filter(p=>p.downed).length,me:[+me.x.toFixed(1),+me.z.toFixed(1)],anc:+d(anc,me).toFixed(1),boss:r.boss&&[r.boss.hp,r.boss.adds,r.boss.phasesFired],ent:E.entityCount,ban:E.hud.banner().text,ui:E.runUi().screen};
return null`);
const NOUI = `__echoes.runUi().screen==='none'`;
const roomDone = `(()=>{const r=E.state().run;const u=E.runUi();return u.screen!=='none'||!r.active||(r.phase!=='combat'&&r.phase!=='fade')})()`;
const shotOnce = (flag, cond, name) => IF(`!window.__shots[${JSON.stringify(flag)}] && (${cond})`, [shot(name), ev(iife(`window.__shots[${JSON.stringify(flag)}]=E.tick;return 'shot ${name} @'+E.tick`))]);
// Real Space press, then poll ≤400 ms for the dash to actually run (dashTicksLeft>0) or end (dash_end).
const dodgePress = [
  ev(iife(`window.__dT=E.tick;window.__dN=window.__c.ev.length;return null`)),
  key('Space', 40),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();let seen=null;while(performance.now()-t0<400){const p=E.state().party[0];const de=window.__c.ev.slice(window.__dN).find(e=>e.T==='dash_end');if(p.dashTicksLeft>0){seen={dashTicksLeft:p.dashTicksLeft,tick:E.tick};break;}if(de){seen={dashEnd:de.cause,tick:de.tk};break;}await new Promise(r=>setTimeout(r,8));}const rk='r'+E.state().run.room;const rec=window.__dodge[rk];const intent=window.__c.ev.slice(window.__dN).find(e=>e.T==='dodge_intent');const out={dodgePress:rk,pressTick:window.__dT,seen,intentTick:intent&&intent.tk,latencyTicks:seen?seen.tick-window.__dT:null};if(rec&&!rec.result){rec.result=out;}window.__dodgeLog=(window.__dodgeLog||[]);if(window.__dodgeLog.length<40)window.__dodgeLog.push(out);return rec&&rec.result===out?out:null})()`),
];
const roomLoop = (tag, n) => {
  const body = [ev(PLAN)];
  for (let k = 0; k < AIM_N; k++) body.push(IF(`window.__plan.aim===${k}`, [mm(...aimPt(k))]));
  body.push(IF(`window.__plan.mv.W&&${NOUI}`, [down('KeyW')]), IF(`window.__plan.mv.S&&${NOUI}`, [down('KeyS')]), IF(`window.__plan.mv.A&&${NOUI}`, [down('KeyA')]), IF(`window.__plan.mv.D&&${NOUI}`, [down('KeyD')]));
  body.push(IF(`window.__plan.dodge&&${NOUI}`, dodgePress));
  body.push(wait(140));
  body.push(up('KeyW'), up('KeyS'), up('KeyA'), up('KeyD'));
  for (let i = 0; i < 4; i++) body.push(IF(`window.__plan.sk[${i}]&&${NOUI}`, [key(`Digit${i + 1}`, 40)]));
  body.push(IF(`window.__plan.revive&&${NOUI}`, [{ type: 'mouseup', button: 'right' }, down('KeyE'), wait(5400), up('KeyE'), { type: 'mousedown', button: 'right' }, ev(iife(`return {reviveHold:'done',tick:E.tick,party:E.state().party.map(p=>[p.id,Math.round(p.hp),p.downed]),reviveEv:window.__c.ev.filter(e=>e.T==='revive'||e.T==='revive_start').slice(-4).map(e=>e.T+'@'+e.tk)}`))]));
  body.push(shotOnce(`${tag}-r${n}-fight`, `E.state().enemies.length>=3||(E.state().run.boss&&E.state().run.boss.active)`, `certB1-${tag}-r${n}-fight`));
  body.push(shotOnce(`${tag}-r${n}-tele`, `E.state().enemies.some(e=>e.telegraph&&e.telegraph.resolveTick-E.tick>=10)`, `certB1-${tag}-r${n}-tele`));
  if (n === 8) {
    body.push(shotOnce(`${tag}-boss-quake`, `E.state().run.boss&&E.state().run.boss.quake`, `certB1-${tag}-r8-quake`));
    body.push(shotOnce(`${tag}-boss-adds`, `E.state().run.boss&&E.state().run.boss.adds>0`, `certB1-${tag}-r8-adds`));
    body.push(shotOnce(`${tag}-boss-felled`, `E.hud.banner().text.includes('FELLED')`, `certB1-${tag}-r8-felled`));
  }
  return [
    ev(iife(`window.__shots['${tag}-r${n}-t0']=Math.round(performance.now()-window.__c.t0);return {roomLoopStart:${n},tick:E.tick,w:window.__shots['${tag}-r${n}-t0'],phase:E.state().run.phase,room:E.state().run.room,mode:E.state().run.mode,wallet:E.state().run.wallet,roomState:E.state().room}`)),
    { type: 'mousedown', button: 'right' },
    LOOP(`${tag}-room${n}`, roomDone, 240000, body),
    { type: 'mouseup', button: 'right' },
    up('KeyW'), up('KeyS'), up('KeyA'), up('KeyD'),
    ev(iife(`const rt=window.__roomT[${n}]||{};const w=Math.round(performance.now()-window.__c.t0);const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;const hm=window.__c.hm;return {roomDone:${n},wallSec:Math.round((w-window.__shots['${tag}-r${n}-t0'])/100)/10,enterToClearSec:rt.clearW!=null&&rt.enterW!=null?Math.round((rt.clearW-rt.enterW)/100)/10:null,ticksToClear:rt.clearTick!=null?rt.clearTick-rt.enterTick:null,iters:window.__it,hp:E.state().party.map(p=>Math.round(p.hp)),counts:{heal:hm.heal||0,hit:hm.hit||0,basic_fire:hm.basic_fire||0,skill_cast:hm.skill_cast||0,denied:hm.intent_denied||0,death:hm.death||0,downed:m.downed||0,revive:m.revive||0,dodge_intent:m.dodge_intent||0,dash_end:m.dash_end||0,room_cleared:m.room_cleared||0},dodgeTest:window.__dodge['r${n}'],fpsMin:window.__fpsMin['r${n}'],phase:E.state().run.phase,ui:E.runUi().screen}`)),
    snap(`${tag}-r${n}-done`),
    shot(`certB1-${tag}-r${n}-clear`),
  ];
};

// Handles whatever screen follows a room: draft -> (socket chain) -> path | shop.
const handleScreens = (tag, n) => [
  waitFor(`E.runUi().screen!=='none' || !E.state().run.active`, 15000, `,screen:E.runUi().screen,phase:E.state().run.phase`),
  wait(500),
  IF(`E.runUi().screen==='draft'`, [
    shot(`certB1-${tag}-r${n}-draft`),
    ev(iife(`const u=E.runUi();return {screen:u.screen,room:u.room,text:u.text.slice(0,200),cards:u.cards,buttons:u.buttons,take:${rect('#run-screen .rn-take')},decline:${rect('#run-screen .rn-decline')},reward:E.state().run.reward,freeSlots:u.freeSkillSlots,wallet:u.wallet,held:u.held,stale:u.stale}`)),
    ev(iife(`window.__n=window.__c.ev.length;return null`)),
    pickRow('#run-screen .rn-take', 728, TAKE_ROWS, '__takeRow'),
    ...clickRows(728, TAKE_ROWS, '__takeRow'),
    IF(`window.__takeRow<0`, [note('[FALLBACK] Take rect not on the click grid -> Enter'), key('Enter', 80)]),
    wait(700),
    IF(`E.runUi().screen==='draft'`, [note('[FALLBACK] draft: click on Take did not commit -> Enter'), key('Enter', 80), wait(600)]),
    ev(iife(`return {afterDraft:E.runUi().screen,draftEvents:window.__c.ev.slice(window.__n).filter(e=>['draft_taken','draft_declined','skill_equip','node_granted','path_offer','path_chosen','room_transition','shop_open'].includes(e.T)).map(e=>e.T+'@'+e.tk+(e.id?':'+e.id:'')+(e.reward?':'+e.reward:'')),skills:E.state().skills.map(k=>k&&k.id),bench:E.state().build.bench.map(b=>b.node||b),socketOpen:!!document.querySelector('#socket-screen.nd-open')}`)),
    IF(`document.querySelector('#socket-screen.nd-open')`, [shot(`certB1-${tag}-r${n}-socket`), note('socket screen chained after the node take -> Escape (real key) banks it to the bench'), key('Escape', 80), wait(500), ev(iife(`return {socketOpenAfterEsc:!!document.querySelector('#socket-screen.nd-open'),screen:E.runUi().screen,bench:E.state().build.bench.map(b=>b.node||b)}`))]),
    wait(400),
  ]),
  IF(`E.runUi().screen==='path'`, [
    shot(`certB1-${tag}-r${n}-path`),
    ev(iife(`const u=E.runUi();const p=E.state().run.path;const want=(u.freeSkillSlots>0)?'skill':'node';let i=p.options.findIndex(o=>o.reward===want);if(i<0)i=0;window.__door=i;window.__n=window.__c.ev.length;const b=u.doors[i].box;const pt=${JSON.stringify(DOOR_PTS)}[i];window.__doorOk=pt[0]>=b.x+2&&pt[0]<=b.x+b.w-2&&pt[1]>=b.y+2&&pt[1]<=b.y+b.h-2;return {doors:u.doors,options:p.options,freeSlots:u.freeSkillSlots,nextRoom:p.nextRoom,choose:i,clickAt:pt,doorOk:window.__doorOk,held:u.held,stale:u.stale}`)),
    IF(`window.__door===0&&window.__doorOk`, [click(...DOOR_PTS[0])]),
    IF(`window.__door===1&&window.__doorOk`, [click(...DOOR_PTS[1])]),
    IF(`!window.__doorOk`, [note('[FALLBACK] door box not at the expected point -> Enter'), key('Enter', 80)]),
    wait(700),
    IF(`E.runUi().screen==='path'`, [note('[FALLBACK] path: door click did not commit -> Enter'), key('Enter', 80), wait(600)]),
    ev(iife(`return {afterPath:E.runUi().screen,phase:E.state().run.phase,pathEvents:window.__c.ev.slice(window.__n).filter(e=>['path_chosen','room_transition','room_enter'].includes(e.T)).map(e=>e.T+'@'+e.tk+(e.index!=null?':r'+e.index:'')+(e.side!=null?':side'+e.side:''))}`)),
  ]),
  IF(`E.runUi().screen==='shop'`, [
    shot(`certB1-${tag}-r7-shop`),
    ev(iife(`const u=E.runUi();const sh=E.state().run.shop;let i=sh.stock.findIndex(s=>!s.sold&&s.affordable);window.__buy=i;window.__n=window.__c.ev.length;window.__w0=sh.wallet;const b=i>=0&&u.cards[i]&&u.cards[i].box;const pt=i>=0&&${JSON.stringify(SHOP_PTS)}[i];window.__buyOk=!!(b&&pt&&pt[0]>=b.x+2&&pt[0]<=b.x+b.w-2&&pt[1]>=b.y+2&&pt[1]<=b.y+b.h-2);return {wallet:sh.wallet,stock:sh.stock,cards:u.cards,plaques:u.plaques,buttons:u.buttons,advance:${rect('#run-screen .rn-advance')},buy:i,clickAt:pt,buyOk:window.__buyOk}`)),
    IF(`window.__buy===0&&window.__buyOk`, [click(...SHOP_PTS[0])]),
    IF(`window.__buy===1&&window.__buyOk`, [click(...SHOP_PTS[1])]),
    IF(`window.__buy===2&&window.__buyOk`, [click(...SHOP_PTS[2])]),
    IF(`!window.__buyOk`, [note('[FALLBACK] shop card box not at the expected point -> no purchase attempted')]),
    wait(900),
    ev(iife(`const sh=E.state().run.shop;const u=E.runUi();return {walletBefore:window.__w0,walletAfter:sh.wallet,runWallet:E.state().run.wallet,stock:sh.stock.map(s=>[s.node,s.price,s.sold]),bench:E.state().build.bench.map(b=>b.node+':'+b.provenance),plaques:u.plaques,cards:u.cards.map(c=>[c.name,c.opacity,c.filter]),shopEvents:window.__c.ev.slice(window.__n).filter(e=>['shop_purchase','shop_buy','currency_denied','node_granted','glint_set'].includes(e.T)).map(e=>e.T+'@'+e.tk+JSON.stringify({node:e.node,price:e.price,wallet:e.wallet}))}`)),
    shot(`certB1-${tag}-r7-shop-bought`),
    ev(iife(`window.__n=window.__c.ev.length;return null`)),
    pickRow('#run-screen .rn-advance', 800, ADV_ROWS, '__advRow'),
    ...clickRows(800, ADV_ROWS, '__advRow'),
    IF(`window.__advRow<0`, [note('[FALLBACK] Advance rect not on the click grid -> Enter'), key('Enter', 80)]),
    wait(700),
    IF(`E.runUi().screen==='shop'`, [note('[FALLBACK] shop: Advance click did not commit -> Enter'), key('Enter', 80), wait(600)]),
    ev(iife(`return {afterShop:E.runUi().screen,phase:E.state().run.phase,room:E.state().run.room,shopEvents:window.__c.ev.slice(window.__n).filter(e=>['shop_close','room_transition','room_enter','boss_spawn','room_start'].includes(e.T)).map(e=>e.T+'@'+e.tk)}`)),
  ]),
];

const waitRoom = (tag, n) => [
  waitFor(`E.state().run.room===${n} && E.state().run.phase==='combat' && E.runUi().screen==='none'`, 15000, `,room:E.state().run.room,phase:E.state().run.phase,screen:E.runUi().screen`),
  wait(600),
  snap(`${tag}-r${n}-enter`),
  shot(`certB1-${tag}-r${n}-enter`),
];

// End screen (victory or defeat): ONE real click on Return to Camp (row grid), then the camp audit.
const endScreenToCamp = (tag) => [
  waitFor(`E.runUi().screen==='end'`, 12000, `,screen:E.runUi().screen,phase:E.state().run.phase`),
  wait(800),
  ev(iife(`const u=E.runUi();return {screen:u.screen,phase:u.phase,text:u.text.slice(0,420),buttons:u.buttons,camp:${rect('#run-screen .rn-camp')},summary:E.state().run.summary,held:u.held,stale:u.stale,pages:[...document.querySelectorAll('#run-screen .rn-page')].filter(p=>getComputedStyle(p).display!=='none').map(p=>p.className),veil:u.veil}`)),
  snap(`${tag}-end-screen`),
  shot(`certB1-${tag}-end`),
  ev(iife(`window.__n=window.__c.ev.length;window.__retTick=E.tick;return window.__dumpRun(${JSON.stringify(tag)})`)),
  pickRow('#run-screen .rn-camp', 800, CAMP_ROWS, '__campRow'),
  ...clickRows(800, CAMP_ROWS, '__campRow'),
  IF(`window.__campRow<0`, [note('[FALLBACK] Return-to-Camp rect not on the click grid -> Enter'), key('Enter', 80)]),
  wait(800),
  IF(`E.runUi().screen==='end'`, [note('[FALLBACK] end: Return-to-Camp click did not commit -> Enter'), key('Enter', 80), wait(600)]),
  waitFor(`E.state().scene==='camp' && E.cmd('campState').mode==='camp' && E.state().run.phase==='idle' && E.runUi().screen==='none'`, 8000, `,scene:E.state().scene,mode:E.cmd('campState').mode,phase:E.state().run.phase,screen:E.runUi().screen,vfx:E.state().vfx.variantName,retEvents:window.__c.ev.slice(window.__n).filter(e=>['return_to_camp','run_end','run_wiped','director_stop'].includes(e.T)).map(e=>e.T+'@'+e.tk+JSON.stringify({enemies:e.enemies}))`),
  wait(3000),
  snap(`${tag}-camp-after`),
  ev(iife(`const c=E.cmd('campState');const s=E.state();const after=E.events.filter(e=>e.tick>window.__retTick&&e.type!=='intent');const m={};for(const e of after)m[e.type]=(m[e.type]||0)+1;return {campMode:c.mode,inPortal:c.inPortal,promptVisible:c.promptVisible,player:c.player,seatDrift:c.seatDrift,rigs:c.party&&c.party.rigs,healerAnim:c.party&&c.party.healerAnim,runs:c.runs,leaks:{enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,skillBolts:s.skillBolts.length,projectiles:s.projectiles.length,numerals:s.vfx&&s.vfx.numerals,decals:s.vfx&&s.vfx.decals,entities:E.entityCount,room:s.room,boss:s.run.boss,healOverride:s.healOverride,domNumerals:document.querySelectorAll('#dmg-num-layer .dmg-num').length},party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.maxHp,p.downed]),skills:s.skills.map(k=>k&&k.id),bench:s.build.bench,wallet:s.run.wallet,freeSlots:s.run.freeSkillSlots,banner:E.hud.banner(),threat:(({gated,offFrame,markersDrawn,domMarkers,uncued,threats})=>({gated,offFrame,markersDrawn,domMarkers,uncued,threats:threats&&threats.length}))(E.hud.threat()),hud:E.hud.combat(),busEventsSinceReturn:m,busSinceReturnCount:after.length}`)),
  shot(`certB1-${tag}-camp-after`),
  ev(iife(`return window.__resetRun()`)),
];

// ---------------- assemble: B1 + B2 + B3 + B4 ----------------
const TAG = 'r1';
const main = [arm, snap('boot'), shot(`certB1-${TAG}-boot`), ...walkToPortal(TAG)];
for (let n = 1; n <= 6; n++) {
  main.push(...roomLoop(TAG, n));
  main.push(...handleScreens(TAG, n), ...waitRoom(TAG, n < 6 ? n + 1 : 8));
}
main.push(...roomLoop(TAG, 8));
main.push(...endScreenToCamp(TAG));
// B3: run 2 through the portal; real play for ~2 s, then downAll (the ONLY command touching this run).
main.push(...walkToPortal(`${TAG}b`));
main.push(
  waitFor(`E.state().enemies.length>0`, 15000, `,enemies:E.state().enemies.length,room:E.state().room`),
  { type: 'mousedown', button: 'right' }, mm(1000, 450), down('KeyW'), wait(300), up('KeyW'), key('Digit2', 50), wait(200), key('Digit1', 50), { type: 'mouseup', button: 'right' },
  wait(1500),
  snap(`${TAG}b-prewipe`),
  shot(`certB1-${TAG}b-prewipe`),
  ev(iife(`window.__n=window.__c.ev.length;window.__wipeTick=E.tick;const r=E.cmd('downAll');return {downAll:r,tick:E.tick,enemies:E.state().enemies.length,pending:E.state().room&&E.state().room.pendingSpawns,eshots:E.state().eshots.length}`)),
  waitFor(`E.state().run.phase==='defeat' && E.runUi().screen==='end'`, 8000, `,phase:E.state().run.phase,screen:E.runUi().screen,ev:window.__c.ev.slice(window.__n).filter(e=>['downed','defeat','run_end','run_wiped','director_stop'].includes(e.T)).map(e=>e.T+'@'+e.tk+(e.result?'('+e.result+')':'')+(e.index!=null?':'+e.index:''))`),
  ...endScreenToCamp(`${TAG}b`),
);
// B4: run 3 through the portal — fresh seed, full party, starting kit, room 1 fresh.
main.push(...walkToPortal(`${TAG}c`));
main.push(
  waitFor(`E.state().enemies.length>0`, 15000, `,enemies:E.state().enemies.length,room:E.state().room`),
  wait(800),
  snap(`${TAG}c-room1-live`),
  shot(`certB1-${TAG}c-room1-live`),
  ev(iife(`return window.__dumpRun('${TAG}c-start')`)),
  ev(iife(`const s=E.state();return {seedRun3:E.seed,seedRun2:window.__seedBefore,bootSeed:E.bootSeed,seedsAll:window.__seeds,party:s.party.map(p=>[p.classId||'healer',p.hp,p.maxHp,p.downed]),skills:s.skills.map(k=>k&&[k.id,k.remainingTicks]),freeSlots:s.run.freeSkillSlots,wallet:s.run.wallet,bench:s.build.bench,room:s.run.room,roomState:s.room,enemies:s.enemies.map(e=>[e.id,e.kind,e.hp]),cleared:s.run.clearedRooms,walletCmd:E.cmd('wallet')}`)),
);

writeFileSync(`tools/actions/certB1-${TAG}.json`, JSON.stringify(main, null, 1));
console.log('wrote', `tools/actions/certB1-${TAG}.json`, main.length, 'top-level steps');
