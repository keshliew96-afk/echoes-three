// certfixAhud1 — fix builder A-hud (round 1) action-file generator.
// Technician frame conditions copied from tools/certA1-gen.mjs (seed 4242:
// camp boot / Act-1 mid-wave with >=3 enemies and a live telegraph /
// skipToRoom 7 shop / skipToRoom 8 boss during quake 2+ with adds), plus the
// HUD builder's own probes: shop hover / buy / deny sequences with rAF frame
// counts, HUD layout audits at 1024x576 and 2560x1440, a 10 s rAF fps sample.
// Every eval is an IIFE; every wait polls window.__echoes and RETURNS what it saw.
import { writeFileSync } from 'fs';

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const key = (k, ms = 80) => ({ type: 'key', key: k, ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 40000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}}})()`);

const ALL_TYPES = ['run_start','room_enter','room_start','room_cleared','wave_start','enemy_spawn','spawn_telegraph',
  'telegraph_start','telegraph_resolve','enemy_fire','enemy_bite','hit','hit_immune','death','hitstop','sound','heal',
  'skill_cast','ally_cast','ally_basic','dodge','dash','run_end','run_wiped','return_to_camp','downed','revive',
  'boss_spawn','boss_quake_start','boss_quake_resolve','boss_trample','boss_adds','boss_death','enemy_despawn',
  'reward','draft','draft_taken','path_chosen','shop_buy','currency_denied','skill_equip','node_granted','zone_spawn',
  'azone_spawn','skill_bolt_spawn','projectile_spawn','flash','knockback','screenshake','flinch','director_stop','mark','defeat','victory'];
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(ALL_TYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed tick '+E.tick+' seed '+E.seed+' v'+E.version`));
const counts = `(()=>{const m={};for(const e of (window.__c?window.__c.ev:[]))m[e.T]=(m[e.T]||0)+1;return m})()`;
const vfxCounts = `(v=>{const a=v.arena||{};return {mode:v.mode,emitters:v.emitters,propTypes:v.propTypes,propShadows:v.propShadows,grass:v.grass,fireflies:v.fireflies,embers:v.embers,vignette:v.vignette,exposure:v.exposure,arena:{numerals:a.numerals,decals:a.decals,particles:a.particles,variant:a.variant,propTypes:a.propTypes,emitters:a.emitters,party:a.party}}})(s.vfx||{})`;
const threat = `(({gated,offFrame,markersDrawn,domMarkers,uncued})=>({gated,offFrame,markersDrawn,domMarkers,uncued}))(E.hud.threat())`;
const snap = (tag) => ev(iife(`const s=E.state();const r=s.run;return {tag:${JSON.stringify(tag)},tick:E.tick,fps:E.fps,version:E.version,seed:E.seed,entityCount:E.entityCount,scene:s.scene,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,wallet:r.wallet,roomState:s.room,enemies:s.enemies.length,party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.maxHp,p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),skills:s.skills.map(k=>k&&k.id),boss:r.boss,ui:E.runUi().screen,hud:E.hud.combat(),banner:E.hud.banner().text,threat:${threat},vfx:${vfxCounts}}`));

// HUD chrome audit: every top-level HUD element's real-px box + pairwise overlaps.
const hudAudit = (tag) => ev(iife(`const q=(sel)=>{const n=document.querySelector(sel);if(!n)return null;const r=n.getBoundingClientRect();const cs=getComputedStyle(n);if(r.width<1||r.height<1||cs.opacity==='0'||cs.display==='none')return null;return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};const boxes={bar:q('.hud-bar'),banner:q('#hud-banner'),loc:q('.hud-loc'),glint:q('.hud-glint'),fps:q('#fps-meter'),version:q('#version-label'),shopPanel:q('.rn-shop'),shopShelf:q('.rn-shelf')};const keys=Object.keys(boxes).filter(k=>boxes[k]);const overlaps=[];for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){const a=boxes[keys[i]],b=boxes[keys[j]];const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);const oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);if(ox>0&&oy>0)overlaps.push([keys[i],keys[j],ox,oy]);}const m=E.hud.metrics?E.hud.metrics():null;const win={w:innerWidth,h:innerHeight};const inWin=Object.fromEntries(keys.map(k=>{const b=boxes[k];return [k,b.x>=0&&b.y>=0&&b.x+b.w<=win.w&&b.y+b.h<=win.h]}));return {tag:${JSON.stringify(tag)},win,boxes,overlaps,inWin,metrics:m,slots:E.hud.slots?E.hud.slots().map(s=>({key:s.key,abbrev:s.abbrev,icon:s.icon,empty:s.empty,wipeDeg:s.wipeDeg,counting:s.counting,numeral:s.numeral})):null,loc:E.hud.loc?E.hud.loc():null,bossPlate:E.hud.bossPlate?E.hud.bossPlate():null}`));

const files = {};

// ---------- camp boot (plain URL; evals only READ) ----------
files['certfixAhud1-camp'] = [snap('camp'), hudAudit('camp-hud')];

// ---------- Act-1 combat, mid-wave with a LIVE telegraph ----------
const combatCond = `E.state().enemies.length>=3 && window.__c.ev.some(e=>e.T==='telegraph_start'&&e.resolveTick>E.tick&&e.resolveTick-E.tick>=28)`;
const combatExtra = `,enemies:E.state().enemies.map(e=>[e.id,e.kind,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),counts:${counts}`;
const combatSetup = [
  arm,
  ev(iife(`const r=E.cmd('startRun');return {startRun:{seed:E.seed,room:r&&r.room},tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 400 },
  waitFor(combatCond, 40000, combatExtra),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  key('Digit2', 60),
  wait(120),
];
files['certfixAhud1-combat'] = [...combatSetup, snap('combat-frame'), hudAudit('combat-hud')];

// ---------- room-7 shop (judged frame, at rest) ----------
const shopSetup = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {seed:E.seed,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode,tick:E.tick}`)),
  wait(1800),
];
// Shop DOM audit: veil, panel, party screen positions, card header wrap check.
const shopAudit = (tag) => ev(iife(`const u=E.runUi();const s=E.state();const veil=document.getElementById('run-veil');const vcs=veil?getComputedStyle(veil):null;const panel=document.querySelector('.rn-shop');const pb=panel?panel.getBoundingClientRect():null;const heads=[...document.querySelectorAll('.rn-shop .rn-cardhead')].map(n=>{const r=n.getBoundingClientRect();const c=n.closest('.rn-card').getBoundingClientRect();return {t:n.textContent.trim(),w:Math.round(r.width),h:Math.round(r.height),rows:Math.round(r.height/(parseFloat(getComputedStyle(n).lineHeight)||r.height)),overflowRight:Math.round(r.right-(c.right-12))}});const names=[...document.querySelectorAll('.rn-shop .rn-cardname')].map(n=>{const r=n.getBoundingClientRect();return [n.textContent.trim(),Math.round(r.x),Math.round(r.y)]});const party=E.hud.project?s.party.map(p=>{const q=E.hud.project(p.x,0.5,p.z);return [p.classId||'healer',Math.round(q.x),Math.round(q.y),q.onScreen]}):null;const overlapParty=(pb&&party)?party.filter(p=>p[1]>=pb.x&&p[1]<=pb.x+pb.width&&p[2]>=pb.y&&p[2]<=pb.y+pb.height).map(p=>p[0]):null;return {tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,wallet:u.wallet,fit:u.fit,floors:u.floors,veil:vcs?{display:vcs.display,opacity:vcs.opacity,bg:vcs.backgroundImage.slice(0,140)||vcs.backgroundColor,filter:vcs.backdropFilter||vcs.filter}:null,panel:pb?{x:Math.round(pb.x),y:Math.round(pb.y),w:Math.round(pb.width),h:Math.round(pb.height)}:null,cards:u.cards,plaques:u.plaques,heads,names,party,partyUnderPanel:overlapParty,icons:[...document.querySelectorAll('.rn-shop .rn-cardicon')].map(n=>n.querySelector('svg')?'svg':n.textContent.trim())}`));
files['certfixAhud1-shop'] = [...shopSetup, snap('shop'), shopAudit('shop-audit'), hudAudit('shop-hud')];

// ---------- shop interaction sequence: hover / buy / buy / deny ----------
// A rAF counter runs during the buy so the console proves how many rendered
// frames the purchase animation spans; intermediate shots land every ~90 ms.
const animState = (tag) => ev(iife(`const u=E.runUi();const a=u.shopAnim?u.shopAnim():null;const amt=document.querySelector('.rn-shop .rn-amt');const fly=[...document.querySelectorAll('.rn-flycoin')].map(n=>[Math.round(parseFloat(n.style.left)),Math.round(parseFloat(n.style.top)),n.style.opacity]);return {tag:${JSON.stringify(tag)},tick:E.tick,rafFrames:window.__raf?window.__raf.n:null,walletDom:amt?amt.textContent:null,wallet:u.wallet,cards:u.cards.map(c=>[c.name,c.opacity,c.box.x,c.box.y]),plaques:u.plaques,flycoins:fly.length,fly:fly.slice(0,3),anim:a}`));
// The purchase choreography is 620 ms and one harness screenshot costs several
// hundred ms of PAGE time, so the sequence PINS the animation clock (a debug
// surface on the shop screen: same step function, told what time it is) and
// photographs each phase. Buy 2 then runs FREE so `anim.frames` reports how
// many real rAF frames an unpinned purchase spans.
const pin = (ms) => ev(iife(`const r=E.runUi().shopPin(${ms === null ? 'null' : ms});return {pin:${ms === null ? "'release'" : ms},r}`));
const domHover = (i, on) => ev(iife(`const c=document.querySelectorAll('.rn-shop .rn-card')[${i}];if(!c)return 'no card';c.dispatchEvent(new MouseEvent(${on ? "'mouseenter'" : "'mouseleave'"},{bubbles:true}));c.classList.toggle('rn-hover',${on});const b=c.getBoundingClientRect();return {hover:${i},on:${on},box:[Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]}`));
const domClick = (i) => ev(iife(`const c=document.querySelectorAll('.rn-shop .rn-card')[${i}];if(!c)return 'no card';window.__raf={n:0,t0:performance.now()};(function f(){window.__raf.n++;if(performance.now()-window.__raf.t0<1500)requestAnimationFrame(f)})();c.dispatchEvent(new MouseEvent('click',{bubbles:true}));return {clicked:${i},tick:E.tick}`));
files['certfixAhud1-shopseq'] = [
  ...shopSetup,
  shopAudit('seq-open'),
  shot('certfixAhud1-shop-rest'),
  domHover(0, true), wait(260), animState('hover-bounce'), shot('certfixAhud1-shop-hover'),
  domHover(0, false), wait(120), animState('hover-off'),
  // --- buy 1: pinned, one shot per phase of the choreography ---
  pin(30), domClick(0), wait(60), animState('buy1-pin30'), shot('certfixAhud1-shop-buy1-a'),
  pin(150), wait(40), animState('buy1-pin150'), shot('certfixAhud1-shop-buy1-b'),
  pin(260), wait(40), animState('buy1-pin260'), shot('certfixAhud1-shop-buy1-c'),
  pin(380), wait(40), animState('buy1-pin380'), shot('certfixAhud1-shop-buy1-d'),
  pin(500), wait(40), animState('buy1-pin500'), shot('certfixAhud1-shop-buy1-e'),
  pin(null), wait(800), animState('buy1-settled'), shot('certfixAhud1-shop-buy1-f'),
  // --- buy 2: FREE RUNNING — anim.frames counts the rendered frames it spans ---
  domClick(1), wait(1100), animState('buy2-free'), shot('certfixAhud1-shop-buy2'),
  // --- denial: 35 GLINT against a short wallet; the shake clock pins too ---
  domClick(2), pin(45), wait(40), animState('deny-pin45'), shot('certfixAhud1-shop-deny-a'),
  pin(120), wait(40), animState('deny-pin120'), shot('certfixAhud1-shop-deny-b'),
  pin(null), wait(1200), animState('deny-settled'), shot('certfixAhud1-shop-deny-c'),
  ev(iife(`return {events:window.__c.ev.filter(e=>['shop_buy','currency_denied'].includes(e.T)).map(e=>[e.T,e.tick,e.node||e.nodeId||'',e.price||'',e.wallet]),counts:${counts}}`)),
];

// ---------- boss fight: >=2 quakes started, >=1 adds phase, latest quake <=6 ticks old ----------
const bossExtra = `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>({tick:e.tick,resolveTick:e.resolveTick})),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>({tick:e.tick,pct:e.pct})),boss:E.cmd('runState').boss,enemies:E.state().enemies.length`;
const bossCondMain = `(()=>{const q=window.__c.ev.filter(e=>e.T==='boss_quake_start');const a=window.__c.ev.filter(e=>e.T==='boss_adds');return q.length>=2&&a.length>=1&&E.tick-q[q.length-1].tick<=6})()`;
files['certfixAhud1-boss'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room,boss:r&&r.boss,tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 300 },
  waitFor(bossCondMain, 40000, bossExtra),
  { type: 'mousedown', button: 'right' },
  key('Digit1', 60),
  wait(150),
  snap('boss-frame'),
  hudAudit('boss-hud'),
];

// ---------- HUD layout audits (run with --w/--h) ----------
files['certfixAhud1-layout'] = [
  hudAudit('camp'),
  ev(iife(`E.cmd('startRun');return {tick:E.tick}`)),
  waitFor(`E.state().enemies.length>=1`, 30000),
  wait(400),
  hudAudit('combat'),
  ev(iife(`E.cmd('skipToRoom',7);return {tick:E.tick}`)),
  wait(1200),
  hudAudit('shop'),
  shopAudit('shop-layout'),
  shot('certfixAhud1-layout-shop'),
  ev(iife(`E.cmd('skipToRoom',8);return {tick:E.tick}`)),
  waitFor(`!!(E.cmd('runState').boss&&E.cmd('runState').boss.active)`, 20000),
  wait(600),
  hudAudit('boss'),
];

// ---------- fps: 10 s rAF sample in Act-1 combat ----------
files['certfixAhud1-fps'] = [
  arm,
  ev(iife(`E.cmd('startRun');return {tick:E.tick}`)),
  { type: 'mousemove', x: 800, y: 400 },
  waitFor(`E.state().enemies.length>=3`, 40000),
  { type: 'mousedown', button: 'right' },
  ev(`(async()=>{const E=__echoes;let n=0;const t0=performance.now();let worst=0;let last=t0;await new Promise(res=>{(function f(){const now=performance.now();worst=Math.max(worst,now-last);last=now;n++;if(now-t0<10000)requestAnimationFrame(f);else res()})()});const ms=performance.now()-t0;return {tag:'fps10s',frames:n,ms:Math.round(ms),fps:Math.round(n/(ms/1000)*10)/10,worstFrameMs:Math.round(worst),echoesFps:E.fps,tick:E.tick,enemies:E.state().enemies.length}})()`),
];

// ---------- run regression: a room clears -> banner / reward ----------
files['certfixAhud1-run'] = [
  arm,
  ev(iife(`E.cmd('startRun');return {tick:E.tick,room:E.state().run.room}`)),
  waitFor(`E.state().enemies.length>=1`, 30000),
  ev(iife(`E.cmd('killAllEnemies');return {tick:E.tick}`)),
  waitFor(`window.__c.ev.some(e=>e.T==='room_cleared')||E.state().run.phase!=='combat'`, 30000, `,phase:E.state().run.phase,counts:${counts}`),
  wait(600),
  ev(iife(`const r=E.state().run;return {tag:'after-clear',phase:r.phase,room:r.room,screen:E.runUi().screen,banner:E.hud.banner(),counts:${counts}}`)),
];

for (const [name, acts] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length);
}
