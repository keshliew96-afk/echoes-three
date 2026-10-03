#!/usr/bin/env node
// G1.11 (second half): every legacy harness param and ?menu=0 boots straight
// into play with no title and the sim ticking; ?menu=1 forces the title even
// with a legacy param; the in-page golden trace is unchanged by the app shell.
//   node tools/gntM1-legacy.mjs [--base http://127.0.0.1:5199/]
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const base = argv[argv.indexOf('--base') + 1] && argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'http://127.0.0.1:5199/';
const cases = [
  { q: '?menu=0', expect: 'playing' },
  { q: '?seed=5', expect: 'playing' },
  { q: '?scene=arena', expect: 'playing' },
  { q: '?room=kill_all', expect: 'playing' },
  { q: '?run=1', expect: 'playing' },
  { q: '?variant=2', expect: 'playing' },
  { q: '?scene=graybox', expect: 'playing' },
  { q: '?seed=5&menu=1', expect: 'title' },
  { q: '', expect: 'title' },
];
const browser = await launchEchoes({ gpu: true });
const out = [];
let pageErrors = 0;
try {
  for (const c of cases) {
    const { page, errors } = await openEchoes(browser, base + c.q);
    const r = await page.evaluate(async () => {
      const first = { state: __echoes.app.state, stack: __echoes.app.stack(), tick: __echoes.tick };
      await new Promise((res) => setTimeout(res, 1500));
      return {
        first,
        state: __echoes.app.state,
        stack: __echoes.app.stack(),
        ticks: __echoes.tick - first.tick,
        scene: __echoes.state().scene,
        run: __echoes.state().run ? __echoes.state().run.phase : null,
        hideGame: document.body.classList.contains('ap-hide-game'),
        fpsMeter: getComputedStyle(document.getElementById('fps-meter')).display,
      };
    });
    const ok =
      c.expect === 'playing'
        ? r.first.state === 'playing' && r.stack.length === 0 && r.ticks > 30 && !r.hideGame
        : r.stack.length > 0 && (r.stack[0] === 'loading' || r.stack[0] === 'title') && r.ticks === 0;
    out.push({ q: c.q || '(plain)', expect: c.expect, ok, ...r, pageErrors: errors.length });
    pageErrors += errors.length;
    await page.close();
  }
  // In-page golden trace (docs/TESTING.md: identical to v0.5.0).
  const { page, errors } = await openEchoes(browser, base + '?seed=7&scene=arena&room=kill_all&freeze=1');
  await page.waitForFunction(() => window.__echoes && __echoes.sim, { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const trace = await page.evaluate(() => {
    const t = __echoes.sim.trace(600, 3);
    return { stateHash: t.stateHash, eventsHash: t.eventsHash, fromTick: t.fromTick, toTick: t.toTick };
  });
  pageErrors += errors.length;
  out.push({ trace, want: { stateHash: '8e8d6fd519dca899', eventsHash: '817f1e9940c91d76' }, ok: trace.stateHash === '8e8d6fd519dca899' && trace.eventsHash === '817f1e9940c91d76' });
} finally {
  await browser.close();
}
for (const o of out) console.log(JSON.stringify(o));
console.log(JSON.stringify({ verdict: { pass: out.every((o) => o.ok) && pageErrors === 0, pageErrors } }));
