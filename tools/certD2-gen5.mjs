// certD2 batch 5 — calibrated perf probes: 5 s camp-idle contention reference in the SAME page
// session immediately before the measured sample, so a contended run is detectable and rejectable.
import { writeFileSync } from 'fs';
import { ev, wait, shot, iife, waitFor, GPU, sample, arm, evdump } from './certD2-gen.mjs';
const files = {};
const rmb = { type: 'mousedown', button: 'right' };
const look = { type: 'mousemove', x: 800, y: 320 };
const calib = [GPU, ev(iife(`return {ver:E.version,scene:E.state().scene,tick:E.tick}`)), sample(5000, 'CALIB-camp-idle')];

const roomProbe = (room, ms, tag) => [
  ...calib,
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',${room});return {room:r&&r.room,mode:r&&r.mode}`)),
  look,
  waitFor(`E.state().enemies.length>=1`, 40000, `,enemies:E.state().enemies.length`),
  rmb,
  sample(ms, tag),
  { type: 'mouseup', button: 'right' },
  ev(iife(`const s=E.state();return {tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,ui:E.runUi().screen,roomState:s.room,party:s.party.map(p=>[p.id,p.hp,p.downed])}`)),
  evdump,
  shot(tag),
];
files['certD2-c-wave2'] = roomProbe(2, 20000, 'certD2-c-wave2-frame');
files['certD2-c-wave3'] = roomProbe(3, 20000, 'certD2-c-wave3-frame');
files['certD2-c-defend6'] = roomProbe(6, 26000, 'certD2-c-defend6-frame');
files['certD2-c-defend4'] = roomProbe(4, 26000, 'certD2-c-defend4-frame');

files['certD2-c-boss'] = [
  ...calib,
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room,mode:r&&r.mode,boss:r&&r.boss}`)),
  look,
  waitFor(`window.__c.ev.some(e=>e.T==='boss_adds')`, 90000,
    `,quakes:window.__c.ev.filter(e=>e.T==='boss_quake_start').map(e=>e.tick),adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>e.tick),enemies:E.state().enemies.length,boss:E.cmd('runState').boss`),
  rmb,
  sample(20000, 'boss-natural'),
  { type: 'mouseup', button: 'right' },
  ev(iife(`const s=E.state();return {tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,boss:E.cmd('runState').boss,banner:E.hud.banner().text,party:s.party.map(p=>[p.id,p.hp,p.downed])}`)),
  evdump,
  shot('certD2-c-boss-frame'),
];
files['certD2-c-boss-held'] = [
  ...calib,
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {room:r&&r.room,boss:r&&r.boss}`)),
  look,
  waitFor(`window.__c.ev.some(e=>e.T==='boss_adds')`, 90000, `,adds:window.__c.ev.filter(e=>e.T==='boss_adds').map(e=>e.tick),boss:E.cmd('runState').boss`),
  ev(iife(`window.__hp=setInterval(()=>{try{const b=E.cmd('runState').boss;if(b&&b.hp/b.maxHp<0.62)E.cmd('bossHp',0.72);}catch(e){}},500);return 'hp-hold armed'`)),
  rmb,
  sample(20000, 'boss-held'),
  { type: 'mouseup', button: 'right' },
  ev(iife(`clearInterval(window.__hp);const s=E.state();return {tick:E.tick,ents:E.entityCount,enemies:s.enemies.length,boss:E.cmd('runState').boss,banner:E.hud.banner().text}`)),
  evdump,
  shot('certD2-c-boss-held-frame'),
];
for (const [k, v] of Object.entries(files)) writeFileSync(`tools/actions/${k}.json`, JSON.stringify(v, null, 1));
console.log('wrote', Object.keys(files).join(', '));
