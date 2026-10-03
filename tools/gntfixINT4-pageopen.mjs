#!/usr/bin/env node
// fix-INT-r4 GI.6 residual: what a run page's open frame is made of (draft after a room clear, the path doors, the
// shop). Fresh GPU-harness browser, title boot (player path, so the loading-card warm-ups ran), camp -> startRun
// (debug) -> killAllEnemies -> the draft page -> Enter -> the path page -> Enter -> ... -> skipToRoom 7 (shop).
// Every frame > 50 ms within 1.5 s of each page open is attributed from a Chrome trace (renderer main vs GPU).
//   node tools/gntfixINT4-pageopen.mjs [--url http://127.0.0.1:4310] [--tag x]
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4310'); const tag = arg('tag', 'x');
const sleep = (t) => new Promise((r) => setTimeout(r, t));
async function waitFor(page, body, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; } catch { /* */ } await sleep(50); } return -1; }
const browser = await launchEchoes({ gpu: true });
const tracePath = `captures/gntfixINT4-pageopen-${tag}.trace.json`;
const out = { tag, opens: [] };
try {
  const { page, errors } = await openEchoes(browser, `${base}/?fresh=1&seed=7&menu=1`);
  await waitFor(page, `window.__echoes.app.state==='title' || (window.__echoes.app.focus()||{}).label==='Press any key or click'`, 90000);
  if (await page.evaluate(() => window.__echoes.app.stack().includes('loading'))) await page.keyboard.press('Enter');
  await waitFor(page, `window.__echoes.app.state==='title'`, 20000); await sleep(1200);
  await page.keyboard.press('Enter');
  await waitFor(page, `window.__echoes.app.state==='playing' && window.__echoes.app.mode==='camp'`, 20000);
  await sleep(2500);
  await page.evaluate(() => { const E = window.__echoes; window.__po = { f: [], opens: [] }; let last = performance.now(); let prev = 'none'; const loop = (t) => { window.__po.f.push([+(t - last).toFixed(1), +t.toFixed(1)]); last = t; const s = (E.runUi() || {}).screen || 'none'; if (s !== prev) { window.__po.opens.push([s, +t.toFixed(1)]); prev = s; } requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  await page.tracing.start({ path: tracePath, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'blink.user_timing', 'gpu', 'viz', 'v8.execute', 'blink', 'disabled-by-default-gpu.service'] });
  const mark = await page.evaluate(() => { performance.mark('gntfixINT4-P'); return performance.now(); });
  await page.evaluate(() => window.__echoes.cmd('startRun'));
  await waitFor(page, `window.__echoes.state().run.phase==='combat'`, 20000); await sleep(1500);
  for (let r = 0; r < 2; r++) {
    await page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
    for (let k = 0; k < 12; k++) { await sleep(900); const s = await page.evaluate(() => ({ scr: (window.__echoes.runUi() || {}).screen || 'none', ok: (window.__echoes.runUi() || {}).settled, ph: window.__echoes.state().run.phase })); if (s.ph === 'combat') break; if (s.scr !== 'none' && s.ok) await page.keyboard.press('Enter'); }
    await sleep(1200);
  }
  await page.evaluate(() => window.__echoes.cmd('skipToRoom', 7));
  await sleep(2500);
  await page.tracing.stop();
  const raw = await page.evaluate(() => window.__po);
  const tr = JSON.parse(readFileSync(tracePath, 'utf8')); const evs = tr.traceEvents || tr;
  const m = evs.find((e) => e.name === 'gntfixINT4-P');
  const threads = {}; for (const e of evs) if (e.name === 'thread_name') threads[`${e.pid}:${e.tid}`] = e.args.name;
  const procs = {}; for (const e of evs) if (e.name === 'process_name') procs[e.pid] = e.args.name;
  for (const [scr, t] of raw.opens) {
    if (scr === 'none') continue;
    const fr = raw.f.filter(([, ft]) => ft >= t - 100 && ft <= t + 1500);
    const long = fr.filter(([d]) => d > 50).map(([d, ft]) => {
      const s = m.ts + (ft - d - mark) * 1000, en = m.ts + (ft - mark) * 1000;
      const sl = evs.filter((e) => e.ph === 'X' && e.dur > 6000 && e.ts < en && e.ts + e.dur > s).map((e) => ({ thr: `${procs[e.pid] || e.pid}/${threads[`${e.pid}:${e.tid}`] || e.tid}`, name: e.name, ms: +(e.dur / 1000).toFixed(1) })).filter((x) => !/RunTask|ThreadController|Scheduler::|GPUTask|ExecuteDeferred|AsyncTask|FunctionCall|CommandBuffer|FireAnimationFrame|PageAnimator|Blink.Animate|FrameRequestCallback|BeginMainFrame|WidgetImpl/.test(x.name)).sort((a, b) => b.ms - a.ms).slice(0, 10);
      return { dt: d, atMs: Math.round(ft - t), slices: sl };
    });
    out.opens.push({ screen: scr, frames: fr.length, max: Math.max(...fr.map(([d]) => d)), long });
  }
  out.errors = errors;
  try { unlinkSync(tracePath); } catch { /* */ }
} catch (e) { out.harnessError = String((e && e.stack) || e); console.error(e); }
finally { await browser.close(); }
writeFileSync(`captures/gntfixINT4-pageopen-${tag}.json`, JSON.stringify(out, null, 1));
for (const o of out.opens) { console.log(o.screen, 'max', o.max); for (const l of o.long) console.log('   ', l.dt, '@', l.atMs, JSON.stringify(l.slices).slice(0, 700)); }
