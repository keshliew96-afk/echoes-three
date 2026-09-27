#!/usr/bin/env node
// fix-INT-r4 GI.6 residual (a lead for M4a, not a gate): what the room-7 SHOP page's open costs in raster, and
// how much of it its glow shadows / filters are. Fresh GPU-harness browser per variant, title boot -> New Game ->
// startCampaign L1 -> (variant CSS) -> skipToRoom 7 -> Chrome trace; sums the GPU-process / raster-thread work in
// the 1.5 s after shop_open and lists the frames > 40 ms.
//   node tools/gntfixINT4-shopraster.mjs [--url http://127.0.0.1:4312] [--variants base,noshadow] [--reps 2] [--tag x]
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4312'); const tag = arg('tag', 'x');
const variants = arg('variants', 'base,noshadow').split(','); const reps = Number(arg('reps', 2));
const sleep = (t) => new Promise((r) => setTimeout(r, t));
async function waitFor(page, body, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; } catch { /* */ } await sleep(50); } return -1; }
const CSS = {
  base: '',
  noshadow: '#run-screen *, #run-screen { box-shadow: none !important; filter: none !important; text-shadow: none !important; }',
  noglowanim: '#run-screen .rn-shine, #run-screen .rn-mote, #run-screen [class*="glitter"], #run-screen [class*="ember"] { display: none !important; }',
};
const out = { tag, base, rows: [] };
for (let rep = 0; rep < reps; rep++) for (const v of variants) {
  const browser = await launchEchoes({ gpu: true });
  const R = { variant: v, rep };
  const tracePath = `captures/gntfixINT4-shopraster-${tag}-${v}-${rep}.trace.json`;
  try {
    const { page, errors } = await openEchoes(browser, `${base}/?fresh=1&seed=7&menu=1`);
    await waitFor(page, `window.__echoes.app.state==='title' || (window.__echoes.app.focus()||{}).label==='Press any key or click'`, 90000);
    if (await page.evaluate(() => window.__echoes.app.stack().includes('loading'))) await page.keyboard.press('Enter');
    await waitFor(page, `window.__echoes.app.state==='title'`, 20000); await sleep(1200);
    await page.keyboard.press('Enter');
    await waitFor(page, `window.__echoes.app.state==='playing' && window.__echoes.app.mode==='camp'`, 20000);
    await sleep(2500);
    await page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
    await waitFor(page, `window.__echoes.state().run.phase==='combat'`, 20000); await sleep(2000);
    if (CSS[v]) await page.evaluate((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, CSS[v]);
    await page.evaluate(() => { const E = window.__echoes; window.__sr = { f: [], open: null }; let last = performance.now(); const loop = (t) => { window.__sr.f.push([+(t - last).toFixed(1), +t.toFixed(1)]); last = t; requestAnimationFrame(loop); }; requestAnimationFrame(loop); E.on('shop_open', () => { window.__sr.open = performance.now(); }); });
    await page.tracing.start({ path: tracePath, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'blink.user_timing', 'gpu', 'viz', 'cc', 'blink', 'disabled-by-default-gpu.service'] });
    const mark = await page.evaluate(() => { performance.mark('gntfixINT4-S'); return performance.now(); });
    await page.evaluate(() => window.__echoes.cmd('skipToRoom', 7));
    await waitFor(page, `window.__sr.open !== null`, 15000); await sleep(1800);
    await page.tracing.stop();
    const raw = await page.evaluate(() => window.__sr);
    const tr = JSON.parse(readFileSync(tracePath, 'utf8')); const evs = tr.traceEvents || tr;
    const m = evs.find((e) => e.name === 'gntfixINT4-S');
    const threads = {}; for (const e of evs) if (e.name === 'thread_name') threads[`${e.pid}:${e.tid}`] = e.args.name;
    const procs = {}; for (const e of evs) if (e.name === 'process_name') procs[e.pid] = e.args.name;
    const s0 = m.ts + (raw.open - mark) * 1000, s1 = s0 + 1500 * 1000;
    const inWin = evs.filter((e) => e.ph === 'X' && e.ts >= s0 && e.ts < s1);
    const sum = (pred) => +(inWin.filter(pred).reduce((a, e) => a + (e.dur || 0), 0) / 1000).toFixed(1);
    const thr = (e) => `${procs[e.pid] || e.pid}/${threads[`${e.pid}:${e.tid}`] || e.tid}`;
    R.rasterTaskMs = sum((e) => e.name === 'RasterTask');
    R.gpuRasterMs = sum((e) => /RasterDecoderImpl::DoRasterCHROMIUM$|RasterDecoderImpl::DoEndRasterCHROMIUM$/.test(e.name));
    R.rendererRasterWorkerMs = sum((e) => e.name === 'RendererRasterWorker');
    R.paintMs = sum((e) => e.name === 'Paint' && /CrRendererMain/.test(thr(e)));
    R.paints = inWin.filter((e) => e.name === 'Paint' && /CrRendererMain/.test(thr(e))).length;
    R.layoutMs = sum((e) => e.name === 'Layout' && /CrRendererMain/.test(thr(e)));
    R.updateLayerTreeMs = sum((e) => e.name === 'UpdateLayerTree');
    // which elements repaint: Paint events by their node (backend id -> element tag.class), count + clip area
    {
      const P = inWin.filter((e) => e.name === 'Paint' && /CrRendererMain/.test(thr(e)) && e.args && e.args.data);
      const by = new Map();
      for (const e of P) { const d = e.args.data; const k = d.nodeId ?? 'none'; const c = d.clip || []; const xs = [c[0], c[2], c[4], c[6]].filter((x) => x !== undefined), ys = [c[1], c[3], c[5], c[7]].filter((x) => x !== undefined); const area = xs.length ? (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)) : 0; const o = by.get(k) || { n: 0, area: 0, ms: 0, layer: d.layerId }; o.n++; o.area += area; o.ms += (e.dur || 0) / 1000; by.set(k, o); }
      const top = [...by.entries()].sort((a, b) => b[1].area - a[1].area).slice(0, 12);
      const cdp = await page.createCDPSession();
      await cdp.send('DOM.getDocument', { depth: 0 });
      const ids = top.map(([k]) => k).filter((k) => typeof k === 'number');
      let names = {};
      try { const { nodeIds } = await cdp.send('DOM.pushNodesByBackendIdsToFrontend', { backendNodeIds: ids }); for (let i = 0; i < ids.length; i++) { if (!nodeIds[i]) continue; const { node } = await cdp.send('DOM.describeNode', { nodeId: nodeIds[i] }); const at = node.attributes || []; const get = (n) => { const j = at.indexOf(n); return j >= 0 ? at[j + 1] : ''; }; names[ids[i]] = `${node.nodeName}${get('id') ? '#' + get('id') : ''}${get('class') ? '.' + get('class').trim().split(/\s+/).join('.') : ''}`; } } catch (err) { names.err = String(err); }
      R.paintBy = top.map(([k, o]) => ({ node: names[k] || String(k), n: o.n, areaMpx: +(o.area / 1e6).toFixed(2), ms: +o.ms.toFixed(1), layer: o.layer }));
      if (names.err) R.paintNameErr = names.err;
    }
    const F = raw.f.filter(([, t]) => t >= raw.open - 50 && t <= raw.open + 1500);
    R.frames = F.length; R.max = Math.max(...F.map(([d]) => d)); R.over50 = F.filter(([d]) => d > 50).length; R.over40 = F.filter(([d]) => d > 40).map(([d, t]) => `${d}@${Math.round(t - raw.open)}`);
    R.errors = errors.slice(0, 3);
    try { unlinkSync(tracePath); } catch { /* */ }
  } catch (e) { R.harnessError = String((e && e.stack) || e); }
  finally { await browser.close(); }
  out.rows.push(R);
  console.log(JSON.stringify(R));
}
writeFileSync(`captures/gntfixINT4-shopraster-${tag}.json`, JSON.stringify(out, null, 1));
