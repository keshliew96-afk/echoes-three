// LOCAL brightness attribution: auto-pause on a blown frame, then hide candidates one by one.
import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes('--' + k) ? argv[argv.indexOf('--' + k) + 1] : d);
const OUT = opt('out', '/tmp/bp'); mkdirSync(OUT, { recursive: true });
const CATCH = Number(opt('catch', 3)), SEED = opt('seed', '7'), SPAWN = Number(opt('spawn', 10)), THR = Number(opt('thr', 0.03));
const QS = opt('qs', '');
const browser = await puppeteer.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', protocolTimeout: 900000,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e.message || e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.evaluateOnNewDocument((THR) => {
  const raf = window.requestAnimationFrame.bind(window);
  const S = { armed: false, paused: false, queue: [], hit: null, thr: THR };
  window.__bp = S;
  const c2 = document.createElement('canvas'); c2.width = 320; c2.height = 180; const g = c2.getContext('2d', { willReadFrequently: true });
  S.measure = (box) => { // fraction of blown (luma>=240) px in play rows, or in box (in 1280x720 coords)
    const gl = document.querySelector('canvas'); g.drawImage(gl, 0, 0, 320, 180);
    const d = g.getImageData(0, 0, 320, 180).data; let n = 0, b = 0, sx = 0, sy = 0;
    const [x0, y0, x1, y1] = box ? box.map((v) => Math.round(v / 4)) : [0, 15, 320, 160];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = (y * 320 + x) * 4; const L = 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]; n++; if (L >= 240) { b++; sx += x; sy += y; } }
    return { frac: b / n, cx: b ? (sx / b) * 4 : 0, cy: b ? (sy / b) * 4 : 0 };
  };
  window.requestAnimationFrame = (cb) => {
    if (S.paused) { S.queue.push(cb); return 0; }
    return raf((t) => {
      if (S.paused) { S.queue.push(cb); return; }
      cb(t);
      if (S.armed && cb.name !== '' ) {}
      if (S.armed) { try { const m = S.measure(); if (m.frac > S.thr) { S.paused = true; S.armed = false; S.hit = m; } } catch (e) { S.err = String(e); } }
    });
  };
  S.resume = () => { S.paused = false; const q = S.queue.splice(0); for (const f of q) window.requestAnimationFrame(f); };
}, THR);
await page.goto(`http://127.0.0.1:5199/?menu=0&seed=${SEED}&audio=0${QS}`, { waitUntil: 'domcontentloaded', timeout: 600000 });
await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 600000, polling: 500 });
await page.evaluate(() => { const X = __echoes; X.cmd('skipToRoom', 3, { act: 1 }); X.cmd('autopilot', true);
  window.__ev = []; for (const t of ['skill_cast', 'death', 'hit', 'heal', 'keg_blast', 'keg_ignite']) X.on(t, (e) => __ev.push({ t, tick: X.tick, e: JSON.stringify(e).slice(0, 160) })); });
await new Promise((r) => setTimeout(r, 4000));
await page.evaluate((n) => { const X = __echoes; const p = X.content.world().player; const kinds = ['boar', 'mantis', 'quillback', 'toad', 'moth', 'ram', 'mole'];
  for (let i = 0; i < n; i++) X.cmd('spawn', kinds[i % kinds.length], p.x + ((i % 10) - 4.5) * 0.9, p.z - 3 - Math.floor(i / 10) * 0.8); }, SPAWN);
const results = [];
for (let k = 0; k < CATCH; k++) {
  await page.evaluate(() => { __ev = []; __bp.armed = true; });
  await page.waitForFunction(() => __bp.paused, { timeout: 300000, polling: 300 });
  const shot = await page.screenshot({ type: 'png' }); writeFileSync(`${OUT}/catch${k}.png`, shot);
  const r = await page.evaluate(() => {
    const st = __echoes.__stage, scene = st.scene; const hit = __bp.hit; const bp = st.bloomPass;
    const box = [hit.cx - 220, hit.cy - 180, hit.cx + 220, hit.cy + 180].map((v, i) => Math.max(0, Math.min(i % 2 ? 720 : 1280, v)));
    const B0 = { s: bp.strength, r: bp.radius, t: bp.threshold };
    const grab = () => { const gl = document.querySelector('canvas'); const c = document.createElement('canvas'); c.width = gl.width; c.height = gl.height; c.getContext('2d').drawImage(gl, 0, 0); return c.toDataURL('image/jpeg', 0.88); };
    // targeted: enemy hit-flash emissive capped, kit flash/star + tplkit opacity halved where stacked
    const touched = [];
    const targeted = (on) => {
      if (!on) { for (const [o, k, v] of touched) o[k] = v; touched.length = 0; return; }
      scene.traverse((o) => { const m = o.material; if (!m || Array.isArray(m)) return;
        if (m.emissive && m.emissiveIntensity > 0.45 && (m.emissive.r + m.emissive.g + m.emissive.b) > 2.5) { touched.push([m, 'emissiveIntensity', m.emissiveIntensity]); m.emissiveIntensity = 0.45; }
        let p = o; while (p.parent && p.parent !== scene) p = p.parent;
        if ((p.name === 'vfxkit' || p.name === 'vfxtplkit') && m.blending === 2 && o.visible) {
          if (m.uniforms && m.uniforms.uOpacity) { touched.push([m.uniforms.uOpacity, 'value', m.uniforms.uOpacity.value]); m.uniforms.uOpacity.value *= 0.6; }
          else { touched.push([m, 'opacity', m.opacity]); m.opacity *= 0.6; } } });
    };
    const V = [
      ['now', () => {}],
      ['bloom-0.9', () => { bp.strength = 0.9; }],
      ['bloom-0.8-r0.35', () => { bp.strength = 0.8; bp.radius = 0.35; }],
      ['thr-0.95', () => { bp.threshold = 0.95; }],
      ['targeted', () => targeted(true)],
      ['targeted+bloom-0.9', () => { targeted(true); bp.strength = 0.9; }],
      ['bloom-off', () => { bp.enabled = false; }],
    ];
    const out = [];
    for (const [name, fn] of V) { fn(); st.render(); out.push({ name, frac: +__bp.measure(box).frac.toFixed(4), all: +__bp.measure().frac.toFixed(4), img: grab() }); targeted(false); bp.strength = B0.s; bp.radius = B0.r; bp.threshold = B0.t; bp.enabled = true; }
    st.render();
    return { hit, box, out, ev: __ev.slice(-8).map((e) => e.t + ' ' + e.e.slice(30, 120)) };
  });
  for (const o of r.out) { writeFileSync(`${OUT}/c${k}-${o.name}.jpg`, Buffer.from(o.img.split(',')[1], 'base64')); delete o.img; }
  results.push(r); console.log(JSON.stringify(r));
  await page.evaluate(() => { __bp.resume(); });
  await new Promise((r) => setTimeout(r, 1500));
}
writeFileSync(`${OUT}/attr.json`, JSON.stringify(results, null, 1));
console.log(JSON.stringify({ errors: errors.slice(0, 5) }));
await browser.close();
