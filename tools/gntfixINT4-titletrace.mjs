#!/usr/bin/env node
// fix-INT-r4 J4-F1 helper: what the long frame(s) as the title first appears are made of (fresh GPU-harness
// browser, title boot). Trace from the loading card's "Press any key" to 2 s after the title opened; every frame
// > 50 ms is attributed (renderer main vs GPU process, top slices).
//   node tools/gntfixINT4-titletrace.mjs [--url http://127.0.0.1:4310] [--tag x]
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { launchEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4310'); const tag = arg('tag', 'x');
const sleep = (t) => new Promise((r) => setTimeout(r, t));
async function waitFor(page, body, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; } catch { /* */ } await sleep(50); } return -1; }
const browser = await launchEchoes({ gpu: true });
const out = { tag };
const tracePath = `captures/gntfixINT4-titletrace-${tag}.trace.json`;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => { window.__tf = []; let last = performance.now(); const f = (t) => { window.__tf.push([+(t - last).toFixed(1), +t.toFixed(1)]); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await page.goto(`${base}/?fresh=1&seed=7&menu=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await waitFor(page, `window.__echoes && (window.__echoes.app.focus()||{}).label==='Press any key or click'`, 120000);
  await sleep(1500);
  await page.tracing.start({ path: tracePath, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'blink.user_timing', 'gpu', 'viz', 'v8.execute', 'blink', 'disabled-by-default-gpu.service'] });
  await sleep(300);
  const t0 = await page.evaluate(() => { performance.mark('gntfixINT4-T'); return performance.now(); });
  await page.keyboard.press('Enter');
  await sleep(2500);
  await page.tracing.stop();
  const tf = await page.evaluate(() => window.__tf);
  const F = tf.filter((x) => x[1] >= t0 - 50);
  out.long = F.filter((x) => x[0] > 50).map((x) => ({ dt: x[0], startMs: Math.round(x[1] - x[0] - t0), endMs: Math.round(x[1] - t0) }));
  const tr = JSON.parse(readFileSync(tracePath, 'utf8')); const evs = tr.traceEvents || tr;
  const mark = evs.find((e) => e.name === 'gntfixINT4-T');
  const threads = {}; for (const e of evs) if (e.name === 'thread_name') threads[`${e.pid}:${e.tid}`] = e.args.name;
  const procs = {}; for (const e of evs) if (e.name === 'process_name') procs[e.pid] = e.args.name;
  if (mark) {
    const tm = mark.ts;
    for (const L of out.long) {
      const s = tm + L.startMs * 1000, en = tm + L.endMs * 1000;
      L.slices = evs.filter((e) => e.ph === 'X' && e.dur > 8000 && e.ts < en && e.ts + e.dur > s).map((e) => ({ thr: `${procs[e.pid] || e.pid}/${threads[`${e.pid}:${e.tid}`] || e.tid}`, name: e.name, ms: +(e.dur / 1000).toFixed(1), at: Math.round((e.ts - tm) / 1000), fn: e.args && e.args.data && (e.args.data.functionName || e.args.data.url) || undefined })).filter((x) => !/RunTask|ThreadController|Scheduler::|GPUTask|ExecuteDeferred|AsyncTask|FunctionCall/.test(x.name)).sort((a, b) => b.ms - a.ms).slice(0, 18);
    }
  }
  try { unlinkSync(tracePath); } catch { /* */ }
} catch (e) { out.harnessError = String((e && e.stack) || e); console.error(e); }
finally { await browser.close(); }
writeFileSync(`captures/gntfixINT4-titletrace-${tag}.json`, JSON.stringify(out, null, 1));
for (const L of out.long || []) { console.log('LONG', L.dt, L.startMs, L.endMs); for (const s of L.slices || []) console.log('   ', JSON.stringify(s)); }
