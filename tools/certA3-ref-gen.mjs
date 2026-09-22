// REFERENCE MATCHER round-3 critic — action-file generator. Prefix certA3-ref-.
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);
const snapShop = ev(iife(`const s=E.state();const u=E.runUi();return {tick:E.tick,fps:E.fps,ver:E.version,phase:s.run.phase,room:s.run.room,screen:u.screen,wallet:u.wallet,cards:u.cards&&u.cards.length,plaques:u.plaques,enemies:s.enemies.length,vfxMode:s.vfx.mode,arena:s.vfx.arena?{particles:s.vfx.arena.particles,emitters:s.vfx.arena.emitters,decals:s.vfx.arena.decals,scorch:s.vfx.arena.scorch,numerals:s.vfx.arena.numerals,propTypes:s.vfx.arena.propTypes,propShadows:s.vfx.arena.propShadows,grass:s.vfx.arena.grass,flowers:s.vfx.arena.flowers,variantName:s.vfx.arena.variantName}:null,party:s.party.map(p=>[p.id,p.hp,+p.x.toFixed(2),+p.z.toFixed(2)])}`));

const files = {};
// Shop frame — same recipe as the technician's certA3-shop, reused for zoom + sequence.
const shopBody = [
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {seed:E.seed,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode}`)),
  wait(1800),
  waitFor(`E.runUi().screen==='shop'`, 20000, `,screen:E.runUi().screen,wallet:E.runUi().wallet,cards:(E.runUi().cards||[]).length`),
  snapShop,
];
files['certA3-ref-shopz'] = shopBody;
files['certA3-ref-shopseq'] = shopBody;

for (const [n, a] of Object.entries(files)) {
  writeFileSync(`tools/actions/${n}.json`, JSON.stringify(a, null, 2));
  console.log('wrote tools/actions/' + n + '.json (' + a.length + ' steps)');
}
