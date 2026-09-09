// certB1-fl recon (NOT the certified loop): dump debug-API field shapes used by the boss policy.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout, extra = '') => ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick${extra}}})()`);
const acts = [
  ev(iife(`return {v:E.version,seed:E.seed,boot:E.bootSeed,scene:E.state().scene,keys:Object.keys(E.state()),runKeys:Object.keys(E.state().run),partyKeys:Object.keys(E.state().party[0]),skill0:E.state().skills[0],cmds:Object.keys(E.cmd||{})}`)),
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',8);return {skip:r&&{room:r.room,phase:r.phase,mode:r.mode},bossKeys:E.state().run.boss&&Object.keys(E.state().run.boss)}`)),
  waitFor(`E.state().enemies.length>0`, 15000, `,enemy0:JSON.stringify(E.state().enemies[0]).slice(0,600)`),
  waitFor(`E.state().run.boss&&E.state().run.boss.quake`, 15000, `,boss:JSON.stringify(E.state().run.boss).slice(0,900)`),
  ev(iife(`const s=E.state();return {party0:JSON.stringify(s.party[0]).slice(0,700),party1:JSON.stringify(s.party[1]).slice(0,400),room:JSON.stringify(s.room).slice(0,500),skills:JSON.stringify(s.skills).slice(0,600),build:JSON.stringify(s.build).slice(0,400)}`)),
  wait(1500),
  ev(iife(`const s=E.state();const tel=s.enemies.find(e=>e.telegraph);return {tele:tel&&JSON.stringify(tel.telegraph),enemyStates:[...new Set(s.enemies.map(e=>e.state))],boss:JSON.stringify(s.run.boss).slice(0,900),runState:JSON.stringify(E.cmd('runState')).slice(0,600)}`)),
  ev(iife(`return {ui:JSON.stringify(E.runUi()).slice(0,800),banner:JSON.stringify(E.hud.banner()),threat:JSON.stringify(E.hud.threat()).slice(0,300),proj:(()=>{try{const c=__arenaProbe.stage.camera;const p=E.state().party[0];const v=c.position.clone().set(p.x,0.5,p.z).project(c);return {x:Math.round((v.x+1)/2*innerWidth),y:Math.round((1-v.y)/2*innerHeight)}}catch(e){return 'noproj '+e.message}})()}`)),
];
writeFileSync('tools/actions/certB1-fl-recon.json', JSON.stringify(acts, null, 1));
console.log('wrote recon', acts.length);
