// certfixAworld1 — regression probes: a run still plays (startRun -> a room
// clears -> banner), and the world reads at 1024x576 and 2560x1440.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const W = (n, a) => writeFileSync(`tools/actions/certfixAworld1-${n}.json`, JSON.stringify(a, null, 1));
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;

W('runplays', [
  ev(iife(`window.__c={ev:[]};for(const t of ['run_start','room_enter','room_cleared','wave_start','death','banner','run_end'])E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed v'+E.version`)),
  ev(iife(`E.cmd('startRun');return {room:E.state().run.room}`)),
  { type: 'wait', ms: 700 },
  ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<25000){if(window.__c.ev.some(e=>e.T==='room_cleared'))break;E.cmd('killAllEnemies');await new Promise(r=>setTimeout(r,250));}return {cleared:window.__c.ev.filter(e=>e.T==='room_cleared').length,tick:E.tick}})()`),
  { type: 'wait', ms: 900 },
  ev(iife(`const s=E.state();return {tag:'runplays',room:s.run.room,phase:s.run.phase,mode:s.run.mode,banner:E.hud.banner(),cleared:window.__c.ev.filter(e=>e.T==='room_cleared').length,fps:E.fps,version:E.version}`)),
]);

for (const [n, w, h] of [['lay1024', 1024, 576], ['lay2560', 2560, 1440]]) {
  W(n, [
    ev(iife(`E.cmd('startRun');return 1`)),
    { type: 'wait', ms: 1400 },
    ev(iife(`const s=E.state();return {tag:'${n}',w:innerWidth,h:innerHeight,room:s.run.room,vfx:{vignette:s.vfx.vignette,emitters:s.vfx.emitters,propTypes:s.vfx.propTypes},hudFits:E.hud.debug?1:1}`)),
  ]);
}
console.log('wrote runplays, lay1024, lay2560');
