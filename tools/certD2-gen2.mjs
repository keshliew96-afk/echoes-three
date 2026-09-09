// certD2 batch 2 — D1 waves, D2 boss, D3 camp idle.
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, GPU, sample, arm, evdump } from './certD2-gen.mjs';
const files = {};
const rmb = { type: 'mousedown', button: 'right' };
const look = { type: 'mousemove', x: 800, y: 320 };

// D3 camp idle: 10 s at camp boot.
files['certD2-camp-idle'] = [
  GPU,
  ev(iife(`const s=E.state();return {ver:E.version,tick:E.tick,fps:E.fps,ents:E.entityCount,scene:s.scene,fireflies:s.vfx.fireflies,embers:s.vfx.embers,gateMotes:s.vfx.gateMotes,grass:s.vfx.grass,emitters:s.vfx.emitters,propShadows:s.vfx.propShadows,critters:s.vfx.prompt.critters.length}`)),
  sample(10000, 'camp-idle'),
  ev(iife(`return {tick:E.tick,fps:E.fps,ents:E.entityCount}`)),
];

// D1 room 6 defend (4 waves, 12 s cadence): 26 s sample from first wave.
const roomProbe = (room, ms, tag) => [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',${room});return {seed:E.seed,room:r&&r.room,mode:r&&r.mode,phase:r&&r.phase}`)),
  look,
  waitFor(`E.state().enemies.length>=1`, 40000, `,enemies:E.state().enemies.length,mode:E.cmd('runState').mode`),
  rmb,
  sample(ms, tag),
  ev(iife(`const s=E.state();return {tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,ui:E.runUi().screen,party:s.party.map(p=>[p.id,p.hp,p.downed]),roomState:s.room}`)),
  evdump,
  shot(tag),
];
files['certD2-defend6'] = roomProbe(6, 26000, 'certD2-defend6-frame');
files['certD2-defend4'] = roomProbe(4, 22000, 'certD2-defend4-frame');
files['certD2-wave2'] = roomProbe(2, 21000, 'certD2-wave2-frame');
files['certD2-wave3'] = roomProbe(3, 21000, 'certD2-wave3-frame');

// D2 boss: skipToRoom 8, wait for boss + first adds, then 20 s across quakes.
files['certD2-boss'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {seed:E.seed,room:r&&r.room,mode:r&&r.mode,boss:r&&r.boss}`)),
  look,
  waitFor(`window.__c.ev.some(e=>e.T==='boss_adds')`, 90000,
    `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>e.tick),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>e.tick),enemies:E.state().enemies.length,boss:E.cmd('runState').boss`),
  rmb,
  sample(20000, 'boss-natural'),
  ev(iife(`const s=E.state();return {tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,boss:E.cmd('runState').boss,banner:E.hud.banner().text,party:s.party.map(p=>[p.id,p.hp,p.downed])}`)),
  evdump,
  shot('certD2-boss-frame'),
];

// D2b boss held at high HP so quakes keep cycling for the whole 20 s.
files['certD2-boss-held'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room,boss:r&&r.boss}`)),
  look,
  waitFor(`window.__c.ev.some(e=>e.T==='boss_adds')`, 90000, `,adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>e.tick),boss:E.cmd('runState').boss`),
  ev(iife(`window.__hp=setInterval(()=>{try{const b=E.cmd('runState').boss;if(b&&b.hp/b.maxHp<0.62)E.cmd('bossHp',0.72);}catch(e){}},500);return 'hp-hold armed'`)),
  rmb,
  sample(20000, 'boss-held'),
  ev(iife(`clearInterval(window.__hp);const s=E.state();return {tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,boss:E.cmd('runState').boss,banner:E.hud.banner().text}`)),
  evdump,
  shot('certD2-boss-held-frame'),
];

for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
