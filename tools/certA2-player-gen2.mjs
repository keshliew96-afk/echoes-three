import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const shot = (name) => ({ type: 'shot', name });
const wait = (ms) => ({ type: 'wait', ms });
const acts = [
  ev(`(() => { const E=window.__echoes; window.__P={ev:[]}; for(const t of ['death','hit','screenshake','knockback']) E.on(t,(e)=>window.__P.ev.push(Object.assign({type:t},e))); return {armed:true,tick:E.tick,version:E.version,seed:E.seed}; })()`),
  ev(`(() => { const E=window.__echoes; E.cmd('startRun'); return {tag:'startRun',tick:E.tick,phase:E.state().run&&E.state().run.phase}; })()`),
  // park the player, clear the wave, then spawn 3 boars on a known patch
  ev(`(async () => { const E=window.__echoes; E.cmd('killAllEnemies'); E.cmd('teleport',0,0);
     await new Promise(r=>setTimeout(r,900));
     E.cmd('spawn','boar',2.6,1.4); E.cmd('spawn','boar',3.6,2.2); E.cmd('spawn','mantis',1.8,2.4);
     await new Promise(r=>setTimeout(r,900)); E.cmd('teleport',0,0);
     const s=E.state(); return {tag:'setup',tick:E.tick,party:s.party.map(p=>({id:p.id,x:+p.x.toFixed(2),z:+p.z.toFixed(2)})),enemies:(s.enemies||[]).map(e=>({id:e.id,kind:e.kind,x:e.x,z:e.z})),vfx:{dec:s.vfx.arena.decals,sc:s.vfx.arena.scorch}}; })()`),
  wait(600), shot('certA2-player-dec-before'),
  ev(`(async () => { const E=window.__echoes; const n=()=>window.__P.ev.filter(e=>e.type==='death').length; const b=n(); const t0=Date.now();
     E.cmd('killAllEnemies'); while(n()===b && Date.now()-t0<6000) await new Promise(r=>setTimeout(r,8));
     return {tag:'killed',tick:E.tick,deaths:window.__P.ev.filter(e=>e.type==='death').slice(-4),vfx:E.state().vfx.arena&&{dec:E.state().vfx.arena.decals,sc:E.state().vfx.arena.scorch,pa:E.state().vfx.arena.particles}}; })()`),
  wait(160), shot('certA2-player-dec-t0'),
  wait(1400), shot('certA2-player-dec-t1'),
  wait(2500), shot('certA2-player-dec-t2'),
  wait(6000), shot('certA2-player-dec-t3'),
  ev(`(() => { const E=window.__echoes; const s=E.state(); return {tag:'end',tick:E.tick,camPlayer:s.party&&s.party.map(p=>({id:p.id,x:+p.x.toFixed(2),z:+p.z.toFixed(2)})),vfx:{dec:s.vfx.arena.decals,sc:s.vfx.arena.scorch,pa:s.vfx.arena.particles,num:s.vfx.arena.numerals}}; })()`),
];
writeFileSync('tools/actions/certA2-player-decal.json', JSON.stringify(acts, null, 2));
console.log('wrote tools/actions/certA2-player-decal.json');
