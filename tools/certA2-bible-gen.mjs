// READ-ONLY critic generator: writes tools/actions/certA2-bible-*.json programmatically.
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });

const evalStep = (code) => ({ type: 'eval', code });

// Wait helper: async IIFE polling window.__echoes every 8 ms, RETURNS the observed state.
const waitFor = (probeBody, maxMs = 25000) => evalStep(`(async () => {
  const E = window.__echoes; const t0 = Date.now();
  const probe = () => { ${probeBody} };
  let last = null;
  while (Date.now() - t0 < ${maxMs}) {
    last = probe();
    if (last && last.ok) return last;
    await new Promise(r => setTimeout(r, 8));
  }
  return Object.assign({ ok: false, timedOut: true, ms: Date.now() - t0 }, last || {});
})()`);

const shopseq = [
  evalStep(`(() => { const E = window.__echoes; window.__critic = { t0: E.tick }; return { armed: true, tick: E.tick, version: E.version, seed: E.seed, bootSeed: E.bootSeed }; })()`),
  evalStep(`(() => { window.__echoes.cmd('startRun'); return { started: true, tick: window.__echoes.tick }; })()`),
  { type: 'wait', ms: 700 },
  evalStep(`(() => { window.__echoes.cmd('skipToRoom', 7); const s = window.__echoes.state(); return { skipped: true, room: s.room, phase: s.phase }; })()`),
  waitFor(`const u = E.runUi(); const s = E.state();
    return { ok: u.screen === 'shop', screen: u.screen, room: s.room, wallet: (E.cmd('wallet') || u.wallet), cards: (u.cards || []).length, tick: E.tick };`),
  { type: 'wait', ms: 1500 },
  { type: 'mousemove', x: 800, y: 600 },
  { type: 'wait', ms: 250 },
  evalStep(`(() => { const E = window.__echoes; const u = E.runUi(); const s = E.state();
    return { atCapture: true, tick: E.tick, fps: E.fps, screen: u.screen, wallet: u.wallet,
      cards: (u.cards || []).map(c => c.name || c.id || String(c)),
      vfx: s.vfx && s.vfx.arena ? { emitters: s.vfx.arena.emitters, embers: s.vfx.arena.embers, particles: s.vfx.arena.particles, propTypes: s.vfx.arena.propTypes, propShadows: s.vfx.arena.propShadows } : null,
      enemies: (s.enemies || []).length }; })()`),
];
writeFileSync('tools/actions/certA2-bible-shopseq.json', JSON.stringify(shopseq, null, 2));
console.log('wrote tools/actions/certA2-bible-shopseq.json', shopseq.length, 'steps');
