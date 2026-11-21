// Combat hot-path probe (dev server, unminified): allocation sampling by function, DOM mutations/frame,
// registry.all() calls/frame, frame work time.
import puppeteer from '/home/claude/echoes-three/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import fs from 'node:fs';
const URL = process.env.URL || 'http://127.0.0.1:5291/?menu=0&seed=7&fresh=1';
const browser = await puppeteer.launch({ executablePath: process.env.EXE, headless: 'shell', protocolTimeout: 600000,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const page = await browser.newPage();
await page.setViewport({ width: +(process.env.W||960), height: +(process.env.H||540) });
await page.evaluateOnNewDocument(`(() => {
  window.__mut = { n: 0, nodes: 0 };
  const mo = new MutationObserver((l) => { window.__mut.n += l.length; for (const r of l) window.__mut.nodes += r.addedNodes.length; });
  document.addEventListener('DOMContentLoaded', () => mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true }));
  const dt = new EventTarget(); window.__three = []; dt.addEventListener('observe', (e) => window.__three.push(e.detail)); window.__THREE_DEVTOOLS__ = dt; window.__frames = 0; const f = () => { window.__frames++; requestAnimationFrame(f); }; requestAnimationFrame(f);
})();`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 120, { timeout: 400000, polling: 1000 });
const cdp = await page.createCDPSession();
// into combat: campaign L1 room 2, autopilot, keep party alive
await page.evaluate(async () => {
  const X = window.__echoes; const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
  X.cmd('startCampaign', { level: 1, depart: false });
  for (let i = 0; i < 30; i++) await raf();
  X.cmd('skipToRoom', 3);
  X.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' });
  for (let i = 0; i < 60; i++) await raf();
  window.__keep = setInterval(() => { for (const p of X.state().party) if (p.hp < p.maxHp * 0.6) X.cmd('setHp', p.id, 1); }, 500);
});
const idStat = () => page.evaluate(() => { let maxM = 0, maxG = 0, n = 0, mats = new Set(); const ren = window.__three.find((o) => o && o.isWebGLRenderer); for (const sc of window.__three.filter((o) => o && o.isScene)) sc.traverse((o) => { n++; if (o.geometry) maxG = Math.max(maxG, o.geometry.id); const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) { mats.add(m.id); maxM = Math.max(maxM, m.id); } }); return { maxM, maxG, objs: n, mats: mats.size, calls: ren ? ren.info.render.calls : null, tris: ren ? ren.info.render.triangles : null, t: performance.now(), f: window.__frames }; });
const id0 = await idStat();
const before = await page.evaluate(() => ({ m: window.__mut.n, nodes: window.__mut.nodes, f: window.__frames, ents: window.__echoes.state().run, t: performance.now() }));
await cdp.send('HeapProfiler.enable');
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 8192, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
await cdp.send('Profiler.enable');
await cdp.send('Profiler.start');
await new Promise((r) => setTimeout(r, Number(process.env.MS || 15000)));
const cpu = (await cdp.send('Profiler.stop')).profile;
const { profile } = await cdp.send('HeapProfiler.stopSampling');
const after = await page.evaluate(() => ({ m: window.__mut.n, nodes: window.__mut.nodes, f: window.__frames, t: performance.now(), ents: window.__echoes.state().entities ?? null, count: (window.__echoes.campaign.memory() || {}).entities, fs: window.__echoes.app.frameStats ? window.__echoes.app.frameStats() : null }));
const id1 = await idStat(); console.log('IDS', JSON.stringify({ id0, id1, matsCreatedPerSec: (id1.maxM - id0.maxM) / ((id1.t - id0.t) / 1000), geosCreatedPerSec: (id1.maxG - id0.maxG) / ((id1.t - id0.t) / 1000) }));
const frames = after.f - before.f; const secs = (after.t - before.t) / 1000;
// aggregate allocations by function+url
const agg = new Map(); let total = 0;
(function walk(n) { const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.replace(/^.*\/src\//, 'src/').replace(/\?.*$/, '')}:${n.callFrame.lineNumber + 1}`; agg.set(k, (agg.get(k) || 0) + n.selfSize); total += n.selfSize; for (const c of n.children) walk(c); })(profile.head);
const byFile = new Map(); for (const [k, v] of agg) { const f = k.split(' ')[1].replace(/:\d+$/, ''); byFile.set(f, (byFile.get(f) || 0) + v); }
// cpu self time by file
const selfT = new Map(); const dt = cpu.timeDeltas; const idT = new Map(); cpu.samples.forEach((id, i) => idT.set(id, (idT.get(id) || 0) + (dt[i] || 0)));
for (const n of cpu.nodes) { const f = n.callFrame.url.replace(/^.*\/src\//, 'src/').replace(/^.*node_modules\/\.?vite[^/]*\/deps\//, 'deps/').replace(/\?.*$/, '') || n.callFrame.functionName; selfT.set(f, (selfT.get(f) || 0) + (idT.get(n.id) || 0)); }
const cpuTot = [...selfT.values()].reduce((a, b) => a + b, 0);
const out = { frames, secs, fps: frames / secs, mutationsPerFrame: (after.m - before.m) / frames, addedNodesPerFrame: (after.nodes - before.nodes) / frames, allocMBperSec: total / 1048576 / secs, allocKBperFrame: total / 1024 / frames, entities: after.count, frameStats: after.fs,
  topAllocFns: [...agg].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / 1024 / frames).toFixed(2)} KB/f  ${k}`),
  topAllocFiles: [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${(100 * v / total).toFixed(1)}%  ${k}`),
  topCpuFiles: [...selfT].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `${(100 * v / cpuTot).toFixed(1)}%  ${k}`) };
fs.writeFileSync(process.env.OUT || '/dev/stdout', JSON.stringify(out, null, 1));
await browser.close();
