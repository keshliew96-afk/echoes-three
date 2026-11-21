// Busy-fight render cost probe: true draw calls per frame (WebGL hooks), triangles,
// framebuffer passes, rAF callback CPU ms. Software GL: fps is not the game's.
import puppeteer from 'puppeteer';
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes('--' + k) ? argv[argv.indexOf('--' + k) + 1] : d);
const QS = opt('qs', '?menu=0&seed=7');
const SEC = Number(opt('sec', 15));
const SPAWN = Number(opt('spawn', 10));
const ROOM = Number(opt('room', 3));
const ACT = Number(opt('act', 1));
const W = Number(opt('w', 1280)), H = Number(opt('h', 720));
const browser = await puppeteer.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', protocolTimeout: 600000,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: Number(opt('dpr', 1)) });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message || e)));
await page.evaluateOnNewDocument(() => {
  const P = { calls: 0, tris: 0, inst: 0, fbo: 0, prog: 0, frames: [] };
  window.__perf = P;
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    const pr = C.prototype;
    const wrap = (n, f) => { const o = pr[n]; if (!o) return; pr[n] = function (...a) { f(a); return o.apply(this, a); }; };
    wrap('drawElements', (a) => { P.calls++; if (a[0] === 4) P.tris += a[1] / 3; });
    wrap('drawArrays', (a) => { P.calls++; if (a[0] === 4) P.tris += a[2] / 3; });
    wrap('drawElementsInstanced', (a) => { P.calls++; P.inst++; if (a[0] === 4) P.tris += (a[1] / 3) * a[4]; });
    wrap('drawArraysInstanced', (a) => { P.calls++; P.inst++; if (a[0] === 4) P.tris += (a[2] / 3) * a[3]; });
    wrap('bindFramebuffer', () => { P.fbo++; });
    wrap('useProgram', () => { P.prog++; });
  }
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => {
    const t0 = performance.now();
    cb(t);
    const ms = performance.now() - t0;
    if (P.on) {
      const last = P.frames[P.frames.length - 1];
      if (last && last.t === t) { last.ms += ms; last.calls += P.calls; last.tris += P.tris; last.inst += P.inst; last.fbo += P.fbo; last.prog += P.prog; }
      else P.frames.push({ ms, calls: P.calls, tris: P.tris, inst: P.inst, fbo: P.fbo, prog: P.prog, t });
    }
    P.calls = P.tris = P.inst = P.fbo = P.prog = 0;
  });
});
await page.goto('http://127.0.0.1:5199/' + QS, { waitUntil: 'domcontentloaded', timeout: 300000 });
await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
async function sample(label) {
  await page.evaluate(() => { __perf.frames = []; __perf.on = true; });
  const t0 = Date.now();
  const extra = [];
  while (Date.now() - t0 < SEC * 1000) {
    await new Promise((r) => setTimeout(r, 1000));
    extra.push(await page.evaluate(() => { try { const s = __echoes.state(); const v = __echoes.content.vfx ? __echoes.content.vfx() : {}; const live = ['arcs', 'lights', 'flashes', 'streaks', 'cracks', 'pillars', 'stars', 'marks', 'glows'].reduce((n, k) => n + (v[k] || 0), 0); return { enemies: (s.enemies || []).length ?? null, alive: s.room?.alive ?? null, vfxLive: live, vfxMs: v.updateMs ?? null, numerals: __echoes.numerals ? __echoes.numerals()?.live ?? null : null }; } catch (e) { return { err: String(e) }; } }));
  }
  const fr = await page.evaluate(() => { __perf.on = false; return __perf.frames; });
  const q = (k, p) => { const a = fr.map((f) => f[k]).sort((x, y) => x - y); return a.length ? Math.round(a[Math.min(a.length - 1, Math.floor(a.length * p))] * 10) / 10 : null; };
  const out = { label, frames: fr.length, swFps: Math.round((fr.length / SEC) * 10) / 10 };
  for (const k of ['calls', 'tris', 'inst', 'fbo', 'prog', 'ms']) out[k] = { p50: q(k, 0.5), p95: q(k, 0.95), max: q(k, 1) };
  out.vfxLive = Math.max(...extra.map((e) => e.vfxLive || 0));
  out.vfxMsMax = Math.max(...extra.map((e) => e.vfxMs || 0));
  out.enemiesMax = Math.max(...extra.map((e) => e.alive || e.enemies || 0));
  out.extra = extra.slice(0, 3);
  console.log(JSON.stringify(out));
}
await sample('boot-scene');
await page.evaluate((room, act) => { const X = __echoes; X.cmd('skipToRoom', room, { act }); X.cmd('autopilot', true); }, ROOM, ACT);
await new Promise((r) => setTimeout(r, 6000));
await sample('room-before-spawn');
await page.evaluate((n) => {
  const X = __echoes; const p = X.content.world().player;
  const kinds = ['boar', 'mantis', 'quillback', 'toad', 'moth', 'ram', 'mole'];
  for (let i = 0; i < n; i++) X.cmd('spawn', kinds[i % kinds.length], p.x + ((i % 10) - 4.5) * 0.9, p.z - 3 - Math.floor(i / 10) * 0.8);
}, SPAWN);
const cdp = await page.createCDPSession();
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
await cdp.send('Profiler.start');
await sample('busy-fight');
const { profile } = await cdp.send('Profiler.stop');
{
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dt = profile.timeDeltas; let total = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id); const f = n.callFrame; const url = (f.url || '(native)').replace(/^.*\/src\//, 'src/').replace(/\?.*$/, '').replace(/^.*node_modules\/\.vite\/deps\//, 'deps/'); const key = url; const d = dt[i] || 0; total += d; self.set(key, (self.get(key) || 0) + d); });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, Math.round((v / total) * 1000) / 10]);
  console.log(JSON.stringify({ profileTopSelfPct: top }));
  const fn = new Map();
  profile.samples.forEach((id, i) => { const n = byId.get(id); const f = n.callFrame; const key = f.functionName + ' ' + (f.url || '').replace(/^.*\/(src|deps)\//, '$1/').replace(/\?.*$/, '') + ':' + f.lineNumber; fn.set(key, (fn.get(key) || 0) + (dt[i] || 0)); });
  console.log(JSON.stringify({ topFns: [...fn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, Math.round((v / total) * 1000) / 10]) }));
}
console.log(JSON.stringify({ errors: errors.slice(0, 5) }));
await browser.close();
