#!/usr/bin/env node
// fix-INT-r4 J4-F1 probe: the camp -> Level 1 room 1 run-start frames in a FRESH GPU-harness browser, with a
// Chrome trace so every long frame is attributed (renderer main-thread task vs GPU-process work).
// Player path: fresh profile -> title -> New Game (Enter) -> camp -> 3 s -> walk to the portal -> E, then --ms of
// room 1 (idle; the allies fight). Every rAF frame [dt, t, tick] is recorded; sim events (not sound) by tick.
//   node tools/gntfixINT4-runstart.mjs [--url http://127.0.0.1:4310] [--seed 7] [--tag x] [--reps 3] [--ms 6000] [--trace 1]
// Output: captures/gntfixINT4-runstart-<tag>.json  { reps: [{ over50, over100, maxMs, long: [{ dt, at, tick, main[], gpu[] }] }] }
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4310'); const seed = Number(arg('seed', 7)); const tag = arg('tag', 'x');
const reps = Number(arg('reps', 3)); const ms = Number(arg('ms', 6000)); const doTrace = arg('trace', '1') === '1';
const extra = arg('params', '');
const fight = arg('fight', '0') === '1';
const prof = arg('prof', '0') === '1';
const glHook = arg('gl', '1') === '1';
const sleep = (t) => new Promise((r) => setTimeout(r, t));
async function waitFor(page, body, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; } catch { /* nav */ } await sleep(100); } return -1; }
// GL hook: every linkProgram is recorded with the three.js SHADER_NAME of its fragment source and the time;
// every useProgram of a program never used before is recorded too (its first draw compiles the executables).
const GLHOOK = () => {
  window.__glh = { links: [], firstUse: [], defs: {} };
  const src = new WeakMap(); const progs = new WeakMap(); let id = 0;
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue; const P = C.prototype;
    const ss = P.shaderSource; P.shaderSource = function (sh, s) { src.set(sh, s); return ss.call(this, sh, s); };
    const at = P.attachShader; P.attachShader = function (p, sh) { const r = progs.get(p) || { id: ++id, names: [], used: false }; const s = src.get(sh) || ''; const m = s.match(/#define SHADER_NAME ([^\n]*)/); if (m) r.names.push(m[1]); if (/gl_FragColor|pc_fragColor|out highp vec4/.test(s)) r.fragLen = s.length; else r.vertLen = s.length; progs.set(p, r); return at.call(this, p, sh); };
    const lp = P.linkProgram; P.linkProgram = function (p) { const r = progs.get(p) || { id: ++id, names: [] }; try { const sh = this.getAttachedShaders(p) || []; window.__glh.defs[r.id] = sh.map((h) => (src.get(h) || '').split(String.fromCharCode(10)).filter((l) => /^#define|^uniform|^#include/.test(l.trim())).join('|')); } catch { /* */ } const t = performance.now(); const x = lp.call(this, p); window.__glh.links.push([+t.toFixed(1), r.id, (r.names[0] || '?').slice(0, 60), r.vertLen || 0, r.fragLen || 0]); return x; };
    const up = P.useProgram; P.useProgram = function (p) { const r = p && progs.get(p); if (r && !r.used) { r.used = true; window.__glh.firstUse.push([+performance.now().toFixed(1), r.id, (r.names[0] || '?').slice(0, 60)]); } return up.call(this, p); };
  }
};
async function openEchoesHooked(ctx, url) {
  if (!glHook) return openEchoes(ctx, url);
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(GLHOOK);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: 180000 });
  return { page, errors };
}
const out = { schema: 'gntfixINT4-runstart/1', at: new Date().toISOString(), base, seed, tag, reps: [] };
for (let rep = 0; rep < reps; rep++) {
  const browser = await launchEchoes({ gpu: true });
  const R = { rep };
  const tracePath = `captures/gntfixINT4-runstart-${tag}-${rep}.trace.json`;
  try {
    const ctx = await browser.createBrowserContext();
    const { page, errors } = await openEchoesHooked(ctx, `${base}/?fresh=1&seed=${seed}&menu=1${extra}`);
    await waitFor(page, `window.__echoes.app.state==='title' || (window.__echoes.app.focus()||{}).label==='Press any key or click'`, 90000);
    if (await page.evaluate(() => window.__echoes.app.stack().includes('loading'))) await page.keyboard.press('Enter');
    await waitFor(page, `window.__echoes.app.state==='title'`, 20000); await sleep(1500);
    await page.keyboard.press('Enter');
    await waitFor(page, `window.__echoes.app.state==='playing' && window.__echoes.app.mode==='camp'`, 20000);
    await sleep(3000);
    R.version = await page.evaluate(() => window.__echoes.version);
    const portal = await page.evaluate(() => window.__echoes.cmd('campState').portal);
    for (let i = 0; i < 40; i++) {
      const p = await page.evaluate(() => { const q = window.__echoes.state().party[0]; return { x: q.x, z: q.z, in: window.__echoes.cmd('campState').inPortal }; });
      if (p.in) break;
      const dx = portal.x - p.x, dz = portal.z + 0.55 - p.z; const keys = [];
      if (Math.abs(dx) > 0.2) keys.push(dx > 0 ? 'd' : 'a'); if (Math.abs(dz) > 0.2) keys.push(dz > 0 ? 's' : 'w'); if (!keys.length) break;
      for (const k of keys) await page.keyboard.down(k); await sleep(Math.max(80, Math.min(450, (Math.hypot(dx, dz) / 2.4) * 1000))); for (const k of keys) await page.keyboard.up(k); await sleep(150);
    }
    await sleep(1200);
    await page.evaluate(() => {
      const E = window.__echoes; window.__rs = { f: [], ev: [] };
      let last = performance.now(); const loop = (now) => { window.__rs.f.push([+(now - last).toFixed(2), +now.toFixed(1), E.tick]); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
      const bus = E.events || null; void bus;
      try { E.on('*', (ev) => { if (ev && ev.type && ev.type !== 'sound') window.__rs.ev.push([E.tick, ev.type, +performance.now().toFixed(1)]); }); } catch { /* */ }
    });
    if (doTrace) await page.tracing.start({ path: tracePath, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'toplevel', 'blink.user_timing', 'gpu', 'viz', 'v8.execute', 'disabled-by-default-gpu.service', 'blink', 'gpu.angle', 'disabled-by-default-gpu.decoder', 'gpu.capture'] });
    await sleep(500);
    await page.evaluate(() => { window.__mut = []; const d = (n) => n && n.nodeType === 1 ? (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/s+/).slice(0, 3).join('.') : '') || n.tagName : (n && n.parentElement ? 'text@' + (n.parentElement.id || n.parentElement.className || n.parentElement.tagName) : '?'); new MutationObserver((l) => { const t = +performance.now().toFixed(1); for (const m of l) { if (window.__mut.length > 4000) return; const v = m.type === 'attributes' ? String(m.target.getAttribute(m.attributeName) || '').slice(0, 90) : m.type === 'childList' ? [...m.addedNodes].map(d).join(',').slice(0, 90) : String(m.target.data || '').slice(0, 40); window.__mut.push([t, m.type, d(m.target), m.attributeName || '', v]); } }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); });
    let cdpP = null;
    if (prof) { cdpP = await page.createCDPSession(); await cdpP.send('Profiler.enable'); await cdpP.send('Profiler.setSamplingInterval', { interval: 100 }); await cdpP.send('Profiler.start'); }
    const ePerf = await page.evaluate(() => { performance.mark('gntfixINT4-E'); return performance.now(); });
    await page.keyboard.press('e');
    if (prof) {
      await sleep(700);
      const { profile } = await cdpP.send('Profiler.stop');
      const nodes = new Map(profile.nodes.map((n) => [n.id, n])); const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
      const key = (n) => `${n.callFrame.functionName || '(anon)'}@${(n.callFrame.url || '').split('/').pop()}:${n.callFrame.lineNumber + 1}`;
      const self = {}; const incl = {}; const dt = profile.timeDeltas; let i = 0;
      for (const sid of profile.samples) { const d = (dt[i++] || 0) / 1000; const n = nodes.get(sid); if (!n || ['(idle)', '(program)', '(garbage collector)'].includes(n.callFrame.functionName)) { if (n) { const k0 = n.callFrame.functionName; self[k0] = (self[k0] || 0) + d; } continue; } const k = key(n); self[k] = (self[k] || 0) + d; const seen = new Set(); for (let x = sid; x !== undefined; x = parent.get(x)) { const kk = key(nodes.get(x)); if (seen.has(kk)) continue; seen.add(kk); incl[kk] = (incl[kk] || 0) + d; } }
      const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, +v.toFixed(1)]);
      R.profSelf = top(self, 25); R.profIncl = top(incl, 45);
    }
    if (fight) {
      const tEnd = Date.now() + ms;
      await sleep(250);
      while (Date.now() < tEnd) {
        const t = await page.evaluate(() => { const E = window.__echoes; const st = E.state(); const q = st.party[0]; let best = null, bd = 1e9; for (const e of st.enemies || []) { if (e.hp !== undefined && e.hp <= 0) continue; const d = Math.hypot(e.x - q.x, e.z - q.z); if (d < bd) { bd = d; best = e; } } if (!best) return null; const pr = E.hud.project(best.x, 0.5, best.z); return pr && pr.onScreen ? { x: pr.x, y: pr.y } : null; });
        if (t) await page.mouse.move(t.x, t.y); else await page.mouse.move(900, 380);
        await page.mouse.down({ button: 'right' }); await sleep(300); await page.mouse.up({ button: 'right' });
        for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) { await page.keyboard.press(k); await sleep(40); }
      }
    } else await sleep(ms);
    await page.evaluate(() => performance.mark('gntfixINT4-END'));
    if (doTrace) await page.tracing.stop();
    const raw = await page.evaluate(() => window.__rs);
    const F = raw.f.filter((x) => x[1] >= ePerf - 200);
    R.frames = F.length; R.p50 = [...F.map((x) => x[0])].sort((a, b) => a - b)[Math.floor(F.length / 2)];
    R.over50 = F.filter((x) => x[0] > 50).length; R.over100 = F.filter((x) => x[0] > 100).length;
    R.maxMs = Math.max(...F.map((x) => x[0]));
    R.events = raw.ev.filter((x) => x[2] >= ePerf - 50).slice(0, 80).map((x) => [x[0], x[1], Math.round(x[2] - ePerf)]);
    R.long = F.filter((x) => x[0] > 50).map((x) => ({ dt: x[0], endMs: Math.round(x[1] - ePerf), startMs: Math.round(x[1] - x[0] - ePerf), tick: x[2] }));
    R.errors = errors.slice(0, 5);
    { const mu = await page.evaluate(() => window.__mut || []); R.mutBefore = R.long.filter((l) => l.dt > 90).map((l) => ({ at: l.startMs, muts: mu.filter((m) => m[0] - ePerf >= l.startMs - 120 && m[0] - ePerf <= l.startMs + 2).map((m) => [Math.round(m[0] - ePerf), m[1], m[2].slice(0, 50), m[3], m[4]]).filter((m, i, a) => a.findIndex((x) => x[2] === m[2] && x[3] === m[3]) === i).slice(0, 60) })); }
    if (glHook) {
      const g = await page.evaluate(() => window.__glh);
      R.linksTotal = g.links.length;
      R.linksAfterE = g.links.filter((x) => x[0] >= ePerf - 20).map((x) => [Math.round(x[0] - ePerf), x[1], x[2], x[3], x[4]]);
      R.firstUseAfterE = g.firstUse.filter((x) => x[0] >= ePerf - 20).map((x) => [Math.round(x[0] - ePerf), x[1], x[2]]);
      R.firstUseDefs = R.firstUseAfterE.map(([t, id2]) => ({ t, id: id2, defines: ((g.defs[id2] || []).join("|")).split("|").filter((x) => /^#define (USE_|SHADER_TYPE|TOON|FLAT|DOUBLE|INSTANC|NUM_|ALPHA)/.test(x)) }));
      // the defines of every program linked after E, diffed against the closest program linked before E
      const before = g.links.filter((x) => x[0] < ePerf - 20).map((x) => x[1]);
      const setOf = (id2) => new Set(((g.defs[id2] || []).join('|')).split('|'));
      R.newPrograms = R.linksAfterE.map(([t, id2]) => {
        const S = setOf(id2); let best = null; let bestD = 1e9;
        for (const b of before) { const B = setOf(b); let d = 0; for (const x of S) if (!B.has(x)) d++; for (const x of B) if (!S.has(x)) d++; if (d < bestD) { bestD = d; best = b; } }
        const B = best !== null ? setOf(best) : new Set();
        return { t, id: id2, closest: best, diff: bestD, defines: [...S].filter((x) => /^#define/.test(x)), onlyNew: [...S].filter((x) => !B.has(x)).slice(0, 40), onlyOld: [...B].filter((x) => !S.has(x)).slice(0, 40) };
      });
    }
    if (doTrace) {
      const tr = JSON.parse(readFileSync(tracePath, 'utf8'));
      const evs = tr.traceEvents || tr;
      const mark = evs.find((e) => e.name === 'gntfixINT4-E');
      const threads = {}; for (const e of evs) if (e.name === 'thread_name') threads[`${e.pid}:${e.tid}`] = e.args.name;
      const procs = {}; for (const e of evs) if (e.name === 'process_name') procs[e.pid] = e.args.name;
      const t0 = mark ? mark.ts : null;
      R.traceMark = !!mark;
      if (t0 !== null) {
        const gpuPid = new Set(Object.entries(procs).filter(([, n]) => /GPU/i.test(n)).map(([k]) => Number(k)));
        const big = evs.filter((e) => e.ph === 'X' && e.dur > (gpuPid.has(e.pid) ? 4000 : 20000) && e.ts >= t0 - 300000);
        for (const L of R.long) {
          const s = t0 + L.startMs * 1000, en = t0 + L.endMs * 1000;
          const inWin = big.filter((e) => e.ts < en && e.ts + e.dur > s);
          L.slices = inWin.map((e) => ({ thr: `${procs[e.pid] || e.pid}/${threads[`${e.pid}:${e.tid}`] || e.tid}`, name: e.name, ms: +(e.dur / 1000).toFixed(1), at: Math.round((e.ts - t0) / 1000), fn: e.args && e.args.data && (e.args.data.functionName || e.args.data.url || e.args.data.type) || undefined })).sort((a, b) => b.ms - a.ms).slice(0, 40);
        }
      }
      try { unlinkSync(tracePath); } catch { /* */ }
    }
  } catch (e) { R.harnessError = String((e && e.stack) || e); console.error(e); }
  finally { await browser.close(); }
  out.reps.push(R);
  console.log(JSON.stringify({ links: R.linksAfterE, firstUse: (R.firstUseAfterE || []).slice(0, 40) }));
  console.log(JSON.stringify({ rep, version: R.version, frames: R.frames, p50: R.p50, over50: R.over50, over100: R.over100, maxMs: R.maxMs, long: (R.long || []).map((l) => `${l.dt}@${l.startMs}..${l.endMs} t${l.tick}`), err: R.errors, h: R.harnessError }));
}
out.summary = { reps: out.reps.length, over100: out.reps.map((r) => r.over100), maxMs: out.reps.map((r) => r.maxMs) };
writeFileSync(`captures/gntfixINT4-runstart-${tag}.json`, JSON.stringify(out, null, 1));
console.log('SUMMARY', JSON.stringify(out.summary));
