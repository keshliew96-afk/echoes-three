// gntfixCAMPAIGN6 — GC.6 heap trend WITHOUT probe-side compilation churn. The critic's memdet / leakid probes
// drive every 15 sim ticks with a fresh page.evaluate (+ an eval() of the predicate source): ~3 000 new
// scripts compiled per campaign, whose SharedFunctionInfos / FeedbackVectors / compilation-cache entries live
// in the page heap and age out only slowly — so they add a slow "growth" of their own. Here ONE in-page
// driver (installed once) plays each bit-identical campaign (New Game seed 7, harness start at Level 1, the
// default-build autopilot plays every room, the sim stepped 15 ticks per rendered frame, the same keep-alive
// assist), and Node only starts it, waits on a flag, then samples in camp: renderer.info.memory geometries /
// textures / programs, live GL buffers (driver hook), heap after two forced GCs.
// usage: node tools/gntfixCAMPAIGN6-memloop.mjs [--base URL] [--campaigns 10] [--tag t]
import { launch, open, heap, sleep, writeJson, ARGS } from './gntfixCAMPAIGN6-lib.mjs';
import fs from 'fs';
// --snap 2,5 writes captures/gntfixCAMPAIGN6-heaploop-<tag>-c<N>.heapsnapshot in camp after those campaigns
async function writeSnapshot(cdp, file) {
  const out = fs.createWriteStream(file);
  const onChunk = (e) => out.write(e.chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false, captureNumericValue: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await new Promise((r) => out.end(r));
}
const base = ARGS.base || 'http://127.0.0.1:4380/';
const N = +(ARGS.campaigns || 10);
const tag = ARGS.tag || 'after';
const NAME = `gntfixCAMPAIGN6-memloop-${tag}`;
const R = { base, N, tag, samples: [] };
const browser = await launch({ autoplay: true });
const { page, errors, cdp } = await open(browser, base + '?menu=0&seed=7&fresh=1');
try {
  await page.waitForFunction(() => window.__echoes.tick > 240, { timeout: 120000 });
  await page.evaluate(() => {
    const X = window.__echoes;
    const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
    const until = async (f, maxMs = 120000) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > maxMs) throw new Error('timeout'); await raf(); } };
    const done = () => { const r = X.state().run; return (!r.active && r.phase !== 'victory' && r.phase !== 'defeat') || r.phase === 'defeat'; };
    window.__gntfixCampaign = async () => {
      X.save.resetToFresh({ seed: 7 });
      X.sim.freeze();
      await until(() => X.campaign.ready(1).ready);
      for (let i = 0; i < 20; i++) await raf();
      X.cmd('startCampaign', { level: 1, depart: false });
      X.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' });
      let ticks = 0;
      for (; ticks < 200000; ticks += 15) {
        for (const p of X.state().party) if (!p.downed && p.hp < p.maxHp * 0.6) X.cmd('setHp', p.id, 1);
        if (done()) break;
        X.sim.stepN(15, null);
        if (done()) break;
        await raf();
      }
      const defeat = X.state().run.phase === 'defeat';
      if (defeat) { X.cmd('returnToCamp'); X.sim.stepN(2, null); }
      X.cmd('autopilot', false);
      await until(() => X.state().run.phase === 'idle' && X.campaign.ready(1).ready);
      for (let i = 0; i < 30; i++) await raf();
      return { ticks, defeat };
    };
    return true;
  });
  for (let c = 1; c <= N; c++) {
    await page.evaluate(() => { window.__gntfixRes = null; window.__gntfixCampaign().then((r) => { window.__gntfixRes = r; }, (e) => { window.__gntfixRes = { err: String(e) }; }); });
    await page.waitForFunction(() => window.__gntfixRes !== null, { timeout: 1800000, polling: 1000 });
    const res = await page.evaluate(() => window.__gntfixRes);
    // camp sample (sim frozen, a few frames rendered)
    await page.evaluate(() => new Promise((r) => { let k = 0; const f = () => (++k >= 10 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    const s = await page.evaluate(() => { const X = window.__echoes; const m = X.campaign.memory(); return { gl: m.gl, buffers: window.__gc4gl.live.buffer, dressings: m.dressings, entities: m.entities, bus: m.busListeners }; });
    s.heap = await heap(cdp);
    s.c = c; s.res = res;
    R.samples.push(s);
    writeJson(NAME, R);
    console.log(`c${c}-camp`, JSON.stringify(s));
    if ((ARGS.snap || '').split(',').includes(String(c))) { await writeSnapshot(cdp, `captures/gntfixCAMPAIGN6-heaploop-${tag}-c${c}.heapsnapshot`); console.log('snapshot', c); }
    await page.evaluate(() => window.__echoes.sim.thaw());
    await sleep(500);
  }
} catch (e) {
  R.fatal = String((e && e.stack) || e).slice(0, 1200);
  console.error(R.fatal);
} finally {
  R.pageErrors = errors;
  writeJson(NAME, R);
  await browser.close();
}
