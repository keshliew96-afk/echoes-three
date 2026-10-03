#!/usr/bin/env node
// CAMPAIGN warm-up diagnosis (GC.6): which GL geometries appear between the
// first and second campaign at the same deterministic moment (L1 + 90 ticks).
//   node tools/gntCAMPAIGN-warm.mjs [--url http://127.0.0.1:5199/]
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const URL0 = argv.includes('--url') ? argv[argv.indexOf('--url') + 1] : 'http://127.0.0.1:5199/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launchEchoes({ gpu: true, width: 1600, height: 900 });
const o = await openEchoes(browser, `${URL0}?seed=7&menu=0`);
const { page } = o;
const E = (fn, ...a) => page.evaluate(fn, ...a);
const frames = (n) => page.evaluate((k) => new Promise((res) => { let i = 0; const f = () => (++i >= k ? res(i) : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
async function waitFor(fn, args = [], timeout = 90000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(fn, ...args)) return; await sleep(100); } throw new Error('timeout'); }
await waitFor(() => window.__echoes && __echoes.tick > 30 && __echoes.campaign && __echoes.campaign.ready(1).ready);
await sleep(1000);
console.log('arm', JSON.stringify(await E(() => __echoes.campaign.glTrack())));
const snaps = {};
for (let c = 1; c <= 2; c++) {
  await E(() => { __echoes.save.resetToFresh({ seed: 7 }); __echoes.sim.freeze(); });
  await waitFor(() => __echoes.campaign.ready(1).ready);
  await frames(30);
  await E(() => __echoes.cmd('startCampaign', { level: 1, depart: false }));
  for (const lv of [1, 2, 3]) {
    await E(() => __echoes.sim.stepN(90, 0));
    await frames(20);
    snaps[`c${c}-L${lv}`] = await E(() => __echoes.campaign.glAlive());
    await E(() => { __echoes.cmd('skipToRoom', 8); __echoes.sim.stepN(30, 0); });
    for (let i = 0; i < 40; i++) { const ph = await E(() => { __echoes.cmd('killBoss'); __echoes.cmd('killAllEnemies'); __echoes.sim.stepN(2, 0); return __echoes.state().run.phase; }); if (ph !== 'combat') break; }
    if (lv < 3) { await E(() => __echoes.sim.stepN(31, 0)); await waitFor((l) => __echoes.campaign.ready(l).ready, [lv + 1]); await E(() => __echoes.cmd('campaignAdvance', 'probe')); }
  }
  await E(() => { __echoes.cmd('returnToCamp'); __echoes.sim.stepN(2, 0); });
  await waitFor(() => __echoes.state().run.phase === 'idle' && __echoes.campaign.ready(1).ready);
  await frames(30);
  snaps[`c${c}-camp`] = await E(() => __echoes.campaign.glAlive());
  await E(() => __echoes.sim.thaw());
}
for (const k of ['L1', 'L2', 'L3', 'camp']) {
  const a = snaps[`c1-${k}`], b = snaps[`c2-${k}`];
  const d = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) if ((a[key] || 0) !== (b[key] || 0)) d[key] = [a[key] || 0, b[key] || 0];
  console.log(`== ${k}`, Object.values(a).reduce((x, y) => x + y, 0), Object.values(b).reduce((x, y) => x + y, 0));
  for (const [key, v] of Object.entries(d)) console.log('  ', v.join(' -> '), key.slice(0, 200));
}
console.log('errors', o.errors.slice(0, 3));
await browser.close();
