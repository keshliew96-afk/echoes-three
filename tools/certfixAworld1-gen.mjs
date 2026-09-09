// certfixAworld1 — action-file generator for the A-world fix builder (round 1).
// Reuses the technician's certification conditions VERBATIM (tools/certA1-gen.mjs
// wrote certA1-{camp,combat,shop,boss}.json) under this builder's prefix, and
// adds world-only probes. Written programmatically per docs/TESTING.md.
import { readFileSync, writeFileSync } from 'fs';

const copy = (from, to) => {
  const acts = JSON.parse(readFileSync(`tools/actions/${from}.json`, 'utf8'));
  writeFileSync(`tools/actions/${to}.json`, JSON.stringify(acts, null, 1));
  console.log('wrote', to, acts.length);
};
copy('certA1-camp', 'certfixAworld1-camp');
copy('certA1-combat', 'certfixAworld1-combat');
copy('certA1-shop', 'certfixAworld1-shop');
copy('certA1-boss', 'certfixAworld1-boss');
copy('certA1-combatseq', 'certfixAworld1-combatseq');

const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;

// Plain room-1 spawn frame (no wave wait): the lighting/grade/prop probe.
writeFileSync('tools/actions/certfixAworld1-spawn.json', JSON.stringify([
  ev(iife(`E.cmd('startRun');return {tick:E.tick,seed:E.seed}`)),
  wait(900),
  ev(iife(`const s=E.state();return {tag:'spawn',tick:E.tick,fps:E.fps,version:E.version,room:s.run.room,mode:s.run.mode,vfx:s.vfx&&s.vfx.arena&&{propTypes:s.vfx.arena.propTypes,propShadows:s.vfx.arena.propShadows,emitters:s.vfx.arena.emitters,grass:s.vfx.arena.grass,dressing:s.vfx.arena.dressing}}`)),
], null, 1));

// 10 s rAF fps sample on the combat frame conditions (regression duty).
const combat = JSON.parse(readFileSync('tools/actions/certA1-combat.json', 'utf8'));
writeFileSync('tools/actions/certfixAworld1-fps.json', JSON.stringify([
  ...combat,
  ev(`(async()=>{const t0=performance.now();let n=0;await new Promise(r=>{const f=()=>{n++;if(performance.now()-t0<10000)requestAnimationFrame(f);else r()};requestAnimationFrame(f)});const ms=performance.now()-t0;return {tag:'fps10s',frames:n,ms:Math.round(ms),fps:Math.round(n/(ms/1000)*10)/10,apiFps:__echoes.fps}})()`),
], null, 1));
console.log('wrote spawn, fps');
