// Scratch leak probe: camp -> campaign (skip through rooms, levels) -> camp, N cycles.
import puppeteer from '/home/claude/echoes-three/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const EXE = process.env.EXE;
const N = +(process.env.N || 6);
const URL = process.env.URL || 'http://127.0.0.1:4391/?menu=0&seed=7&fresh=1';
const INIT = `(() => {
  const live = { buffer: 0, texture: 0, program: 0, vao: 0 };
  const hook = (P) => { for (const [c, d, k] of [['createBuffer','deleteBuffer','buffer'],['createTexture','deleteTexture','texture'],['createProgram','deleteProgram','program'],['createVertexArray','deleteVertexArray','vao']]) {
    const oc = P[c], od = P[d]; if (!oc) continue;
    P[c] = function () { const o = oc.apply(this, arguments); if (o) live[k]++; return o; };
    P[d] = function (o) { if (o) live[k]--; return od.apply(this, arguments); }; } };
  try { hook(WebGL2RenderingContext.prototype); } catch (e) {}
  window.__gl = live;
  const au = { created: 0, finalized: 0, connects: 0, disconnects: 0, byType: {} };
  const fr = new FinalizationRegistry((t) => { au.finalized++; au.byType[t]--; });
  const P = BaseAudioContext.prototype;
  for (const n of Object.getOwnPropertyNames(P).filter((n) => /^create[A-Z]/.test(n) && n !== 'createBuffer' && n !== 'createPeriodicWave')) {
    const o = P[n]; if (typeof o !== 'function') continue;
    P[n] = function () { const node = o.apply(this, arguments); au.created++; au.byType[n] = (au.byType[n] || 0) + 1; fr.register(node, n); return node; };
  }
  const AN = AudioNode.prototype; const oc = AN.connect, od = AN.disconnect;
  AN.connect = function () { au.connects++; return oc.apply(this, arguments); };
  AN.disconnect = function () { au.disconnects++; return od.apply(this, arguments); };
  window.__au = au;
  const ev = { window: 0, document: 0, other: 0, rafs: 0, intervals: 0, timeouts: 0 };
  const ET = EventTarget.prototype; const ae = ET.addEventListener, re = ET.removeEventListener;
  const kind = (t) => (t === window ? 'window' : t === document ? 'document' : 'other');
  ET.addEventListener = function () { ev[kind(this)]++; return ae.apply(this, arguments); };
  ET.removeEventListener = function () { ev[kind(this)]--; return re.apply(this, arguments); };
  const si = window.setInterval, ci = window.clearInterval; const ivs = new Set();
  window.setInterval = function () { const id = si.apply(this, arguments); ivs.add(id); return id; };
  window.clearInterval = function (id) { ivs.delete(id); return ci.apply(this, arguments); };
  window.__ev = ev; window.__ivs = ivs;
})();`;
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'shell', protocolTimeout: 600000,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--js-flags=--expose-gc'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200)));
await page.setViewport({ width: 960, height: 540 });
await page.evaluateOnNewDocument(INIT);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 120, { timeout: 300000, polling: 500 });
const cdp = await page.createCDPSession();
await cdp.send('HeapProfiler.enable');
const raf = (n) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
async function sample(label) {
  await raf(10);
  await cdp.send('HeapProfiler.collectGarbage'); await cdp.send('HeapProfiler.collectGarbage');
  await new Promise((r) => setTimeout(r, 300));
  const h = await cdp.send('Runtime.getHeapUsage');
  const s = await page.evaluate(() => {
    const X = window.__echoes; const m = X.campaign.memory(); const c = X.campaign.census ? X.campaign.census() : null;
    let objs = 0; try { const t = c && c.groups; for (const k in t) objs += t[k].objects; } catch (e) {}
    const au = window.__au;
    return { phase: m.phase, geo: m.gl.geometries, tex: m.gl.textures, prog: m.gl.programs, glBuf: window.__gl.buffer, glTex: window.__gl.texture, glVao: window.__gl.vao,
      sceneObjs: objs, groups: c && Object.fromEntries(Object.entries(c.groups).map(([k, v]) => [k, v.objects + '/' + v.geometries])), resid: m.resident, dress: m.dressings, sceneGeo: c && c.sceneGeometries, sceneMat: c && c.sceneMaterials, ent: m.entities, bus: m.busListeners, dom: m.dom,
      auCreated: au.created, auLive: au.created - au.finalized, conn: au.connects, disc: au.disconnects, liveByType: Object.fromEntries(Object.entries(au.byType).filter(([, v]) => v > 3)),
      evWin: window.__ev.window, evDoc: window.__ev.document, evOther: window.__ev.other, intervals: window.__ivs.size };
  });
  s.heapMB = Math.round(h.usedSize / 1048576 * 10) / 10; s.label = label;
  console.log(JSON.stringify(s));
  return s;
}
await sample('camp0');
for (let c = 1; c <= N; c++) {
  const level = ((c - 1) % (+process.env.LV || 6)) + 1;
  try {
    await page.evaluate(async (level) => {
      const X = window.__echoes;
      const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
      X.cmd('startCampaign', { level, depart: false });
      for (let i = 0; i < 20; i++) { X.sim.stepN ? X.sim.stepN(15, null) : 0; await raf(); }
      for (let room = 2; room <= 8; room++) {
        X.cmd('skipToRoom', room);
        for (let i = 0; i < 12; i++) { X.sim.stepN && X.sim.stepN(15, null); await raf(); }
        if (room === 8) { X.cmd('killBoss'); for (let i = 0; i < 12; i++) { X.sim.stepN && X.sim.stepN(15, null); await raf(); } }
      }
      X.cmd('returnToCamp'); if (X.cmd('abandonRun', 'quit')) {}
      for (let i = 0; i < 60; i++) { X.sim.stepN && X.sim.stepN(5, null); await raf(); }
    }, level);
  } catch (e) { console.log('cycle err', String(e).slice(0, 300)); }
  await sample(`camp${c}-L${level}`);
}
console.log('errors', JSON.stringify(errors.slice(0, 10)), errors.length);
await browser.close();
