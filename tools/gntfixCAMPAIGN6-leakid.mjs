// gntfixCAMPAIGN6 — COPY of tools/gntccampaign6-leakid.mjs (campaign critic r6) with outputs renamed: which GL geometries survive campaign after campaign?
// --mode fast : each campaign = save.resetToFresh({seed:7}) + cmd startCampaign(L1) + per level skipToRoom(8)+killBoss+killAllEnemies
//               (the builder's GC.6 method), card advanced when ready, final victory -> returnToCamp.
// --mode full : each campaign played in full by the autopilot (every room), sim stepped 15 ticks per frame, keep-alive assist.
// Campaigns 1..W are warm-up; then campaign.glTrack() is armed in camp; K more campaigns; then glAlive()/glOffScene()/census() in camp.
// usage: node tools/gntccampaign6-leakid.mjs [--mode fast|full] [--warm 2] [--k 3]
import { launch, open, sleep, writeJson, heap, ARGS } from './gntfixCAMPAIGN6-lib.mjs';
const base = ARGS.base || 'http://127.0.0.1:4332/';
const mode = ARGS.mode || 'fast';
const W = +(ARGS.warm || 2), K = +(ARGS.k || 3);
const NAME = `gntfixCAMPAIGN6-leakid-${mode}`;
const R = { base, mode, W, K, samples: [] };
const browser = await launch({ autoplay: true });
const { page, errors, cdp } = await open(browser, base + '?menu=0&seed=7&fresh=1');
const raf = (n = 3) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const E = (fn, ...a) => page.evaluate(fn, ...a);
async function campSample(label) {
  await E(() => window.__echoes.sim.freeze()); await raf(10);
  const s = await E(() => { const X = window.__echoes; const m = X.campaign.memory(); return { gl: m.gl, buffers: window.__gc4gl.live.buffer, dressings: m.dressings, dom: m.dom }; });
  s.heap = await heap(cdp); s.label = label; R.samples.push(s); writeJson(NAME, R); console.log(label, JSON.stringify(s));
}
async function stepUntil(predSrc, max = 90000) {
  for (let n = 0; n < max; n += 15) {
    const done = await E((src) => { const X = window.__echoes; const pred = eval(src); for (const p of X.state().party) if (!p.downed && p.hp < p.maxHp * 0.6) X.cmd('setHp', p.id, 1); if (pred(X)) return true; X.sim.stepN(15, null); return pred(X); }, predSrc);
    if (done) return n; await raf(1);
  }
  return -1;
}
async function campaign() {
  await E(() => { const X = window.__echoes; X.save.resetToFresh({ seed: 7 }); X.sim.freeze(); });
  await page.waitForFunction(() => window.__echoes.campaign.ready(1).ready, { timeout: 90000 });
  await raf(20);
  await E(() => window.__echoes.cmd('startCampaign', { level: 1, depart: false }));
  if (mode === 'full') {
    await E(() => window.__echoes.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' }));
    const n = await stepUntil(`(X) => (!X.state().run.active && X.state().run.phase !== 'victory' && X.state().run.phase !== 'defeat') || X.state().run.phase === 'defeat'`, 200000);
    if ((await E(() => window.__echoes.state().run.phase)) === 'defeat') { await E(() => { window.__echoes.cmd('returnToCamp'); window.__echoes.sim.stepN(2, null); }); }
    await E(() => window.__echoes.cmd('autopilot', false));
    return n;
  }
  for (const level of [1, 2, 3]) {
    await E(() => window.__echoes.sim.stepN(90, null)); await raf(10);
    await E(() => window.__echoes.cmd('skipToRoom', 8)); await E(() => window.__echoes.sim.stepN(30, null)); await raf(5);
    for (let i = 0; i < 40; i++) { const ph = await E(() => { const X = window.__echoes; X.cmd('killBoss'); X.cmd('killAllEnemies'); X.sim.stepN(2, null); return X.state().run.phase; }); if (ph !== 'combat') break; }
    if (level < 3) {
      await E(() => window.__echoes.sim.stepN(31, null));
      await page.waitForFunction((l) => window.__echoes.campaign.ready(l).ready, { timeout: 90000 }, level + 1);
      await E(() => window.__echoes.cmd('campaignAdvance', 'probe')); await raf(10);
    }
  }
  await E(() => { window.__echoes.cmd('returnToCamp'); window.__echoes.sim.stepN(2, null); });
  return 0;
}
try {
  await page.waitForFunction(() => window.__echoes.tick > 240, { timeout: 90000 });
  for (let c = 1; c <= W + K; c++) {
    const n = await campaign();
    await page.waitForFunction(() => window.__echoes.state().run.phase === 'idle' && window.__echoes.campaign.ready(1).ready, { timeout: 120000 });
    await raf(30);
    await campSample(`c${c}-camp (${n})`);
    if (c === W) { R.armed = await E(() => { const X = window.__echoes; const r = X.campaign.glTrack(); return JSON.stringify(r).slice(0, 300); }); R.census0 = await E(() => window.__echoes.campaign.census()); console.log('armed', R.armed); }
    await E(() => window.__echoes.sim.thaw());
  }
  await E(() => window.__echoes.sim.freeze()); await raf(10);
  R.alive = await E(() => { const X = window.__echoes; const a = X.campaign.glAlive(); return a; });
  R.offScene = await E(() => { try { return window.__echoes.campaign.glOffScene(); } catch (e) { return String(e); } });
  R.census1 = await E(() => window.__echoes.campaign.census());
  const g0 = (R.census0 && R.census0.groups) || {}, g1 = (R.census1 && R.census1.groups) || {};
  R.censusDiff = {}; for (const k of new Set([...Object.keys(g0), ...Object.keys(g1)])) { const a = g0[k] ? g0[k].geometries : 0, b = g1[k] ? g1[k].geometries : 0; if (a !== b) R.censusDiff[k] = [a, b]; }
  console.log('alive', JSON.stringify(R.alive).slice(0, 3000));
  console.log('offScene', JSON.stringify(R.offScene).slice(0, 2000));
  console.log('censusDiff', JSON.stringify(R.censusDiff));
} catch (e) { R.fatal = String(e && e.stack || e).slice(0, 1200); console.error(R.fatal); }
finally { R.errors = errors; writeJson(NAME, R); await browser.close(); }
