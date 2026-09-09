// A-vfx r2 isolation lab: a mantis parked far from the party, telegraph held,
// captured across the whole wind-up. Writes tools/actions/certfixAvfx2-lab.json
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const iife = (b) => `(()=>{const E=window.__echoes;${b}})()`;
const acts = [
  ev(iife(`window.__lab={ev:[]};for(const t of ['telegraph_start','telegraph_resolve']){E.on(t,e=>window.__lab.ev.push(Object.assign({T:t},e)));}return {armed:true,v:E.version}`)),
  ev(iife(`const r=E.cmd('startRun');return {tag:'startRun',room:r&&r.room}`)),
  { type: 'mousemove', x: 800, y: 450 },
  // wait for the wave, then park a lone mantis south-east of the party
  ev(`(async()=>{const E=window.__echoes;const t0=performance.now();while(performance.now()-t0<40000){if(E.state().enemies.length>=1)break;await new Promise(r=>setTimeout(r,10));}
    E.cmd('killAllEnemies');const id=E.cmd('spawn','mantis',4.2,-3.2);
    const t1=performance.now();while(performance.now()-t1<40000){const e=E.state().enemies.find(q=>q.id===id);if(e&&e.telegraph)return {ok:true,id,tick:E.tick,tele:e.telegraph,pos:[e.x,e.z]};await new Promise(r=>setTimeout(r,8));}
    return {ok:false,id,enemies:E.state().enemies}})()`),
  ev(iife(`const e=E.state().enemies[0];return {tag:'lab-frame',tick:E.tick,fps:+E.fps.toFixed(1),enemy:e&&{id:e.id,x:+e.x.toFixed(2),z:+e.z.toFixed(2),tele:e.telegraph},party:E.state().party.map(p=>[p.classId,+p.x.toFixed(2),+p.z.toFixed(2)])}`)),
];
writeFileSync('tools/actions/certfixAvfx2-lab.json', JSON.stringify(acts, null, 1));
console.log('wrote tools/actions/certfixAvfx2-lab.json');
