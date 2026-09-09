import { writeFileSync } from 'fs';
const ev=(c)=>({type:'eval',code:c}), shot=(n)=>({type:'shot',name:n}), wait=(m)=>({type:'wait',ms:m});
const acts=[
 ev(`(() => { const E=window.__echoes; window.__P={ev:[]}; for(const t of ['death','hit']) E.on(t,(e)=>window.__P.ev.push(Object.assign({type:t},e))); return {armed:true,tick:E.tick,version:E.version}; })()`),
 ev(`(() => { const E=window.__echoes; E.cmd('startRun'); return {tag:'startRun',tick:E.tick}; })()`),
 ev(`(async () => { const E=window.__echoes; E.cmd('killAllEnemies'); E.cmd('teleport',0,0); await new Promise(r=>setTimeout(r,1200));
   E.cmd('killAllEnemies'); await new Promise(r=>setTimeout(r,400)); E.cmd('teleport',0,0);
   E.cmd('spawn','boar',2.5,-1.5); E.cmd('spawn','boar',3.6,-0.4); E.cmd('spawn','mantis',1.6,-2.4);
   await new Promise(r=>setTimeout(r,700)); E.cmd('teleport',0,0);
   const s=E.state(); return {tag:'setup',tick:E.tick,player:{x:s.party[0].x,z:s.party[0].z},enemies:(s.enemies||[]).map(e=>({id:e.id,kind:e.kind,x:+e.x.toFixed(2),z:+e.z.toFixed(2)})),dec:s.vfx.arena.decals,sc:s.vfx.arena.scorch}; })()`),
 shot('certA2-player-d2-before'),
 ev(`(async () => { const E=window.__echoes; const n=()=>window.__P.ev.filter(e=>e.type==='death').length; const b=n(); const t0=Date.now();
   const tgt=(E.state().enemies||[]).map(e=>({id:e.id,x:+e.x.toFixed(2),z:+e.z.toFixed(2)}));
   E.cmd('killAllEnemies'); while(n()===b && Date.now()-t0<6000) await new Promise(r=>setTimeout(r,8)); E.cmd('teleport',0,0);
   return {tag:'killed',tick:E.tick,killedAt:tgt,deaths:window.__P.ev.filter(e=>e.type==='death').slice(-4).map(d=>({tick:d.tick,kind:d.kind,x:+d.x.toFixed(2),z:+d.z.toFixed(2)})),dec:E.state().vfx.arena.decals,sc:E.state().vfx.arena.scorch}; })()`),
 wait(200), shot('certA2-player-d2-t0'),
 wait(1500), shot('certA2-player-d2-t1'),
 wait(4000), shot('certA2-player-d2-t2'),
 ev(`(() => { const E=window.__echoes,s=E.state(); return {tag:'end',tick:E.tick,player:{x:s.party[0].x,z:s.party[0].z},dec:s.vfx.arena.decals,sc:s.vfx.arena.scorch}; })()`),
];
writeFileSync('tools/actions/certA2-player-decal2.json', JSON.stringify(acts,null,2));
console.log('ok');
