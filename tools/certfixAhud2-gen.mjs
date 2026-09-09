#!/usr/bin/env node
// A-hud round-2 fix builder: writes the capture action files (programmatically,
// per the fix brief). Nothing here touches src/**.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'tools', 'actions');
mkdirSync(dir, { recursive: true });

const w = (name, acts) => {
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(acts, null, 1));
  console.log('wrote', name);
};

// Arm the same 23 event listeners the technician arms.
const ARM = {
  type: 'eval',
  code: "(()=>{const E=window.__echoes;window.__a2={ev:[]};for(const t of [\"telegraph_start\",\"telegraph_resolve\",\"hit\",\"death\",\"enemy_spawn\",\"flash\",\"knockback\",\"screenshake\",\"boss_quake_start\",\"boss_quake_resolve\",\"boss_adds\",\"boss_trample\",\"boss_spawn\",\"boss_death\",\"wave_start\",\"room_cleared\",\"spawn_telegraph\",\"skill_cast\",\"hitstop\",\"enemy_fire\",\"zone_spawn\",\"azone_spawn\",\"skill_bolt_spawn\",\"shop_purchase\",\"currency_denied\"]){try{E.on(t,e=>window.__a2.ev.push(Object.assign({T:t},e)));}catch(err){}}return {armed:true,tick:E.tick,version:E.version,seed:E.seed,bootSeed:E.bootSeed}})()",
};
const SKIP7 = {
  type: 'eval',
  code: "(()=>{const E=window.__echoes;E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {tag:'skip7',seed:E.seed,tick:E.tick,room:r&&r.room,phase:r&&r.phase}})()",
};
const SHOPSTATE = {
  type: 'eval',
  code: "(()=>{const E=window.__echoes;const u=E.runUi();const s=E.state();return {tag:'shop-frame',version:E.version,tick:E.tick,fps:+E.fps.toFixed(1),screen:u.screen,wallet:u.wallet,cards:u.cards,plaques:u.plaques,enemies:s.enemies.length,cool:'see analyzer'}})()",
};
const BOXES = {
  type: 'eval',
  code: "(()=>{const q=(s)=>[...document.querySelectorAll(s)].map(n=>{const b=n.getBoundingClientRect();return {t:(n.textContent||'').trim().slice(0,26),b:[Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]}});return {tag:'boxes',cards:q('#run-screen .rn-card'),plaques:q('#run-screen .rn-plaque'),panel:q('#run-screen .rn-shop'),lamp:q('#run-screen .rn-lamp'),strip:q('#run-screen .rn-strip')}})()",
};
const ANIM = { type: 'eval', code: "(()=>{const E=window.__echoes;return E.runUi().animState?E.runUi().animState():(window.__shopAnim?window.__shopAnim():null)})()" };

// ---- 1. shop idle frame (the certification shop frame conditions) ----------
w('certfixAhud2-shop', [ARM, SKIP7, { type: 'wait', ms: 1800 }, SHOPSTATE, BOXES]);

// ---- 2. shop BUY sequence — the player scorer's exact reproduction ---------
// frame 0 lands right after the click; harness screenshot latency (~150-400 ms
// of page time each) is exactly what made round-2's 620 ms choreography
// invisible to a scorer.
w('certfixAhud2-shopbuy', [
  ARM,
  SKIP7,
  { type: 'wait', ms: 1800 },
  { type: 'mousemove', x: 500, y: 600 },
  { type: 'wait', ms: 260 },
  { type: 'shot', name: 'certfixAhud2-buy-hover' },
  { type: 'click', x: 500, y: 600 },
]);

// ---- 3. shop ambient sequence (is the panel's own art alive?) --------------
w('certfixAhud2-shopamb', [ARM, SKIP7, { type: 'wait', ms: 1800 }]);

// ---- 4. denial: click Ascend (35) after spending down to < 35 --------------
w('certfixAhud2-shopdeny', [
  ARM,
  SKIP7,
  { type: 'wait', ms: 1800 },
  { type: 'click', x: 500, y: 600 },
  { type: 'wait', ms: 500 },
  { type: 'click', x: 800, y: 600 },
  { type: 'wait', ms: 1400 },
  { type: 'eval', code: "(()=>({tag:'wallet',w:window.__echoes.runUi().wallet}))()" },
  { type: 'click', x: 1100, y: 600 },
]);

// ---- 5. camp regression frame ---------------------------------------------
w('certfixAhud2-camp', [
  { type: 'wait', ms: 900 },
  { type: 'eval', code: "(()=>{const E=window.__echoes;return {tag:'camp',version:E.version,tick:E.tick,fps:+E.fps.toFixed(1),screen:E.runUi().screen}})()" },
]);

// ---- 6. combat frame (HUD check 9 on a gameplay frame + cooldown radial) ---
w('certfixAhud2-combat', [
  ARM,
  { type: 'eval', code: "(()=>{const E=window.__echoes;E.cmd('startRun');return {tag:'run',room:E.state().room}})()" },
  { type: 'mousemove', x: 800, y: 450 },
  {
    type: 'eval',
    code: "(async()=>{const E=window.__echoes;const t0=Date.now();for(;;){const s=E.state();const en=s.enemies.length;if(en>=3)break;if(Date.now()-t0>25000)break;await new Promise(r=>setTimeout(r,8));}return {ok:true,tick:E.tick,enemies:E.state().enemies.length}})()",
  },
  { type: 'mousedown', button: 'right' },
  { type: 'key', key: 'Digit1', ms: 60 },
  { type: 'key', key: 'Digit2', ms: 60 },
  { type: 'wait', ms: 120 },
  { type: 'eval', code: "(()=>{const E=window.__echoes;return {tag:'hudcd',cd:E.hud&&E.hud.cooldowns?E.hud.cooldowns():null}})()" },
]);

// ---- 7. boss frame (boss plate check 9) -----------------------------------
w('certfixAhud2-boss', [
  ARM,
  { type: 'eval', code: "(()=>{const E=window.__echoes;E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {tag:'skip8',room:r&&r.room}})()" },
  { type: 'wait', ms: 2600 },
  { type: 'mousedown', button: 'right' },
  { type: 'wait', ms: 2400 },
  { type: 'eval', code: "(()=>{const E=window.__echoes;return {tag:'boss',tick:E.tick,banner:E.hud.banner().text,fps:+E.fps.toFixed(1)}})()" },
]);

// ---- 8. HUD fit sweep (1024x576 / 2560x1440) ------------------------------
const FITEVAL = {
  type: 'eval',
  code: "(()=>{const rects=[];const sel=['#hud .hd-bar','#hud .hd-banner','#hud .hd-loc','#hud .hd-glint','#hud .hd-ver','#hud .hd-fps','#run-screen .rn-shop'];for(const s of sel){for(const n of document.querySelectorAll(s)){const b=n.getBoundingClientRect();if(b.width<1||b.height<1)continue;rects.push({s,x:+b.x.toFixed(1),y:+b.y.toFixed(1),w:+b.width.toFixed(1),h:+b.height.toFixed(1)});}}const over=[];for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);const oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);if(ox>1&&oy>1)over.push([a.s,b.s,+ox.toFixed(1),+oy.toFixed(1)]);}const vw=innerWidth,vh=innerHeight;const out=rects.filter(r=>r.x<-0.5||r.y<-0.5||r.x+r.w>vw+0.5||r.y+r.h>vh+0.5);return {tag:'fit',vw,vh,rects,overlaps:over,offscreen:out}})()",
};
w('certfixAhud2-fit-shop', [ARM, SKIP7, { type: 'wait', ms: 1800 }, FITEVAL]);
w('certfixAhud2-fit-camp', [{ type: 'wait', ms: 900 }, FITEVAL]);

// ---- 9. fps sample (10 s rAF) ---------------------------------------------
w('certfixAhud2-fps', [
  ARM,
  SKIP7,
  { type: 'wait', ms: 1500 },
  {
    type: 'eval',
    code: "(async()=>{const t0=performance.now();let n=0,worst=0,prev=t0;await new Promise(res=>{const f=(t)=>{n++;const d=t-prev;if(d>worst)worst=d;prev=t;if(t-t0<10000)requestAnimationFrame(f);else res();};requestAnimationFrame(f);});const ms=performance.now()-t0;return {tag:'fps10s',frames:n,ms:Math.round(ms),fps:+(n/(ms/1000)).toFixed(1),worstFrameMs:+worst.toFixed(1)}})()",
  },
]);
console.log('done');
