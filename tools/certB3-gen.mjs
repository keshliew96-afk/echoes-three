// Full-loop certification critic (block B, round 3) — action-file generator.
// Writes tools/actions/certB3-*.json programmatically. Never hand-escaped.
import { writeFileSync, mkdirSync } from 'fs';
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

export const ALL_TYPES = ['run_start','room_enter','room_start','room_cleared','reward','draft','draft_taken',
  'path_chosen','shop_buy','currency_denied','boss_spawn','boss_death','victory','defeat','run_end','run_wiped',
  'return_to_camp','wave_start','downed','revive','director_stop'];
export const arm = ev(iife(`window.__b3={ev:[],t0:E.tick};for(const t of ${JSON.stringify(ALL_TYPES)})E.on(t,e=>window.__b3.ev.push({T:t,tick:e&&e.tick!=null?e.tick:E.tick,d:(()=>{const o={};for(const k of Object.keys(e||{}))if(['room','pct','spawned','id','kind','reason','result','wallet','item','skill','door','index','seed','mode'].includes(k))o[k]=e[k];return o;})()}));return 'armed t'+E.tick`));
export const evList = (tag) => ev(iife(`return {tag:${JSON.stringify(tag)},tick:E.tick,order:window.__b3.ev.map(e=>e.T+'@'+e.tick)}`));
export const evDetail = (tag) => ev(iife(`return {tag:${JSON.stringify(tag)},ev:window.__b3.ev.map(e=>[e.T,e.tick,JSON.stringify(e.d)])}`));

export const snap = (tag) => ev(iife(`const s=E.state();const r=s.run||{};const u=(()=>{try{return E.runUi()}catch(e){return {screen:'ERR'}}})();return {tag:${JSON.stringify(tag)},tick:E.tick,fps:Math.round(E.fps),seed:E.seed,bootSeed:E.bootSeed,scene:s.scene,phase:r.phase,room:r.room,mode:r.mode,combat:r.combatActive,wallet:r.wallet,freeSlots:r.freeSkillSlots,enemies:s.enemies.length,eshots:s.eshots.length,zones:s.zones.length,azones:s.azones.length,bolts:s.skillBolts.length,numerals:s.vfx&&s.vfx.numerals,party:s.party.map(p=>[p.id,p.classId||'healer',Math.round(p.hp),p.maxHp,!!p.downed,+p.x.toFixed(2),+p.z.toFixed(2)]),skills:s.skills.map(k=>k&&k.id),bench:s.build&&s.build.bench,boss:r.boss,ui:u.screen,uiText:u.text,banner:(()=>{try{const b=E.hud.banner();return {vis:b.visible,text:b.text,sub:b.sub}}catch(e){return 'ERR'}})(),threat:(()=>{try{const t=E.hud.threat();return {markersDrawn:t.markersDrawn,domMarkers:t.domMarkers,gated:t.gated}}catch(e){return 'ERR'}})()}`));

export const write = (name, acts) => {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', name, acts.length, 'actions');
};
