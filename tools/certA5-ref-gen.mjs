// REFERENCE MATCHER r5 — critic-only generator: shop z50 + shop seq (technician shipped neither).
// Reproduces tools/certA5-gen.mjs 'certA5-shop' conditions: ?seed=4242, startRun -> skipToRoom(7), wait 1800.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const TYPES = ['wave_start','room_cleared','enemy_spawn','hit','death','shop_buy','currency_denied','run_end','skill_cast'];
const arm = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(TYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed tick='+E.tick`));
const VFX = `(s=>{const v=s.vfx||{};const pick=o=>o?{numerals:o.numerals,decals:o.decals,scorch:o.scorch,particles:o.particles,emitters:o.emitters,embers:o.embers,propTypes:o.propTypes,propShadows:o.propShadows,grass:o.grass,flowers:o.flowers,variantName:o.variantName,shake:o.shake,shakes:o.shakes,fireflies:o.fireflies,vignette:o.vignette,exposure:o.exposure}:null;return {mode:v.mode,top:pick(v),arena:pick(v.arena)}})`;
const shop = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {seed:E.seed,bootSeed:E.bootSeed,version:E.version,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode}`)),
  wait(1800),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<15000){if(E.runUi().screen==='shop')break;await new Promise(r=>setTimeout(r,8));}const u=E.runUi();const s=E.state();return {ok:u.screen==='shop',tick:E.tick,waitedTicks:E.tick-k0,fps:+E.fps.toFixed(1),version:E.version,screen:u.screen,wallet:u.wallet,cards:u.cards.map(c=>[c.name,c.box.x,c.box.y,c.box.w,c.box.h,c.opacity]),plaques:u.plaques,buttons:u.buttons,room:s.run.room,phase:s.run.phase,enemies:s.enemies.length,entityCount:E.entityCount,vfx:${VFX}(s),banner:E.hud.banner().text,hud:E.hud.combat(),party:s.party.map(p=>[p.id,p.classId||'healer',p.hp,p.maxHp,+p.x.toFixed(2),+p.z.toFixed(2)]),pagesVisible:[...document.querySelectorAll('#run-screen .rn-page')].filter(p=>getComputedStyle(p).display!=='none').map(p=>p.className)}})()`),
  ev(iife(`const m={};for(const e of window.__c.ev)m[e.T]=(m[e.T]||0)+1;return {tick:E.tick,eventCounts:m}`)),
];
writeFileSync('tools/actions/certA5-ref-shop.json', JSON.stringify(shop, null, 1));
console.log('wrote tools/actions/certA5-ref-shop.json', shop.length, 'steps');

// ---- Probe 8: kill-decal persistence (check 5 "kills leave persistent decals") ----
const KT = ['wave_start','enemy_spawn','hit','death','telegraph_start','telegraph_resolve','skill_bolt_spawn'];
const karm = ev(iife(`window.__k={ev:[]};for(const t of ${JSON.stringify(KT)})E.on(t,e=>window.__k.ev.push(Object.assign({T:t,tk:E.tick},e)));return 'armed tick='+E.tick`));
const kstate = (tag) => ev(iife(`const s=E.state();const d=window.__k.ev.filter(e=>e.T==='death');return {tag:${JSON.stringify(tag)},tick:E.tick,deaths:d.map(e=>({tk:e.tk,id:e.id,kind:e.kind||e.type,x:e.x,z:e.z,keys:Object.keys(e).join('|')})),enemies:s.enemies.map(e=>[e.id,e.kind||e.type,+e.x.toFixed(2),+e.z.toFixed(2),e.hp]),vfx:${VFX}(s),banner:E.hud.banner().text}`));
const kill = [
  karm,
  ev(iife(`const r=E.cmd('startRun');return {seed:E.seed,version:E.version,room:E.state().run.room}`)),
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<25000){if(window.__k.ev.filter(e=>e.T==='death').length>=2)break;await new Promise(r=>setTimeout(r,8));}return {ok:window.__k.ev.filter(e=>e.T==='death').length>=2,tick:E.tick,waited:E.tick-k0}})()`),
  kstate('after2deaths'),
  { type: 'shot', name: 'certA5-ref-kill-t0' },
  wait(1500),
  kstate('plus1500ms'),
  { type: 'shot', name: 'certA5-ref-kill-t1500' },
  wait(3000),
  kstate('plus4500ms'),
];
writeFileSync('tools/actions/certA5-ref-kill.json', JSON.stringify(kill, null, 1));
console.log('wrote tools/actions/certA5-ref-kill.json', kill.length, 'steps');
