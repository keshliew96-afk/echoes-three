#!/usr/bin/env node
// Orchestrator-owned GPU-backed fps probe. Launches Chrome with ANGLE/D3D11 so
// WebGL runs on the real GPU (not SwiftShader), then samples rAF frame times in
// camp idle, an Act-1 wave, a defend room and the boss. Prints one JSON blob.
import puppeteer from 'puppeteer';
const url = process.argv[2] || 'http://127.0.0.1:5199/?seed=999';
const browser = await puppeteer.launch({
  headless: true, protocolTimeout: 300000,
  args: ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl',
    '--disable-dev-shm-usage', '--window-size=1600,900'],
});
const out = { url, errors: [], console: 0, samples: [] };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => out.errors.push(e.message));
  page.on('console', () => out.console++);
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 180000 });
  out.gotoMs = Date.now() - t0;
  out.gpu = await page.evaluate(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'n/a'; });
  const waitFor = (cond, timeout = 90000) => page.evaluate(async (cond, timeout) => {
    const t0 = performance.now(); const f = new Function('E', 'return (' + cond + ')');
    while (performance.now() - t0 < timeout) { try { if (f(window.__echoes)) return { ok: true, ms: Math.round(performance.now() - t0) }; } catch (e) {} await new Promise((r) => setTimeout(r, 50)); }
    return { ok: false, ms: timeout };
  }, cond, timeout);
  const sample = (label, ms) => page.evaluate(async (label, ms) => {
    const E = window.__echoes; const d = []; let last = performance.now(); const start = last;
    await new Promise((res) => { function f(t) { d.push(t - last); last = t; if (t - start < ms) requestAnimationFrame(f); else res(); } requestAnimationFrame(f); });
    d.shift(); const warm = d.slice(0, 180); const steady = d.slice(180);
    const st = (a) => { const s = [...a].sort((x, y) => x - y); const mean = a.reduce((x, y) => x + y, 0) / a.length; return { frames: a.length, meanMs: +mean.toFixed(2), meanFps: +(1000 / mean).toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), max: +Math.max(...a).toFixed(1), gaps100: a.filter((x) => x > 100).length, gaps50: a.filter((x) => x > 50).length }; };
    const s = E.state(); const rs = E.cmd('runState');
    return { label, tick: E.tick, fps: E.fps, entities: E.entityCount, enemies: s.enemies ? s.enemies.length : null, room: rs && rs.room, boss: rs && rs.boss ? { hp: rs.boss.hp, adds: rs.boss.adds } : null, warm: st(warm), steady: st(steady.length ? steady : warm), gapsOver100: d.map((x, i) => [i, +x.toFixed(0)]).filter((p) => p[1] > 100) };
  }, label, ms);
  out.ready = await waitFor('E && E.tick > 300', 120000);
  out.samples.push(await sample('camp-idle', 10000));
  await page.evaluate(() => window.__echoes.cmd('startRun'));
  await page.mouse.move(800, 450);
  out.waveReady = await waitFor('E.state().enemies.length >= 3', 60000);
  out.samples.push(await sample('act1-wave', 12000));
  await page.evaluate(() => window.__echoes.cmd('skipToRoom', 6));
  out.room6Ready = await waitFor('E.state().enemies.length >= 4', 60000);
  out.samples.push(await sample('room6-defend', 12000));
  await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
  out.bossReady = await waitFor('(function(){const r=E.cmd("runState");return r&&r.boss&&r.boss.active})()', 60000);
  out.bossAddsReady = await waitFor('E.state().enemies.length >= 2', 90000);
  out.samples.push(await sample('boss-with-adds', 12000));
} catch (e) {
  out.errors.push('HARNESS: ' + e.message);
} finally {
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
}
