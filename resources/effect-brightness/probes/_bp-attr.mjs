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
    const st = __echoes.__stage, scene = st.scene, cam = st.camera; const hit = __bp.hit;
    const box = [hit.cx - 220, hit.cy - 180, hit.cx + 220, hit.cy + 180].map((v, i) => Math.max(0, Math.min(i % 2 ? 720 : 1280, v)));
    st.render(); const base = __bp.measure(box).frac;
    const V = new cam.position.constructor();
    const KIT=[['arc',40],['light',16],['flash',64],['streak',64],['cracks',12],['pillar',8],['star',64],['mark',24],['glow',32]], TPL=[['circle',28],['beam',18],['blaze',48],['trace',16],['blast',40],['head',64],['dust',1],['bits',1],['sparks',1]];
    const tag = (o) => { let p = o, c = null; while (p && p.parent && p.parent !== scene) { c = p; p = p.parent; } if (!p) return '?'; const top = p.name || p.type; if (top === 'vfxkit' || top === 'vfxtplkit') { const i = p.children.indexOf(c || o); let n = 0; for (const [k, cap] of (top === 'vfxkit' ? KIT : TPL)) { n += cap; if (i < n) return top + ':' + k; } return top + ':extra'; } return top; };
    const path = (o) => { const a = []; let p = o; while (p && p !== scene && a.length < 6) { a.push((p.name || p.type) + (p.userData && p.userData.kind ? '[' + p.userData.kind + ']' : '')); p = p.parent; } return a.reverse().join('/'); };
    const cands = [];
    scene.traverseVisible((o) => {
      if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine)) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m) return;
      const add = m.blending === 2; const em = m.emissive && m.emissiveIntensity > 0.3 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.6;
      const hot = m.color && (m.color.r + m.color.g + m.color.b) > 2.4 && (m.transparent || m.toneMapped === false);
      if (!add && !em && !hot) return;
      o.getWorldPosition(V); V.project(cam); const sx = (V.x + 1) * 640, sy = (1 - V.y) * 360;
      if (sx < box[0] - 60 || sx > box[2] + 60 || sy < box[1] - 60 || sy > box[3] + 60) return;
      const ws = new cam.position.constructor(); o.getWorldScale(ws);
      cands.push({ o, info: { tag: tag(o), path: path(o), type: o.type, geo: o.geometry && o.geometry.type, add, em, col: m.color ? [m.color.r, m.color.g, m.color.b].map((v) => +v.toFixed(2)) : null, op: +(m.opacity ?? 1).toFixed(2), tm: m.toneMapped, ei: m.emissiveIntensity, scale: +Math.max(ws.x, ws.y, ws.z).toFixed(2), sx: Math.round(sx), sy: Math.round(sy), map: !!m.map, inst: o.isInstancedMesh ? o.count : 0 } });
    });
    const out = [];
    for (const c of cands) { c.o.visible = false; st.render(); const f = __bp.measure(box).frac; c.o.visible = true; out.push({ ...c.info, drop: +(base - f).toFixed(4) }); }
    st.render();
    // bloom off
    st.bloomPass.enabled = false; st.render(); const noBloom = __bp.measure(box).frac; st.bloomPass.enabled = true; st.render();
    out.sort((a, b) => b.drop - a.drop); const byTag = {}; for (const c of out) byTag[c.tag] = +((byTag[c.tag] || 0) + c.drop).toFixed(4);
    return { hit, box, base, noBloom, n: cands.length, byTag, top: out.slice(0, 8).map((c) => ({ tag: c.tag, path: c.path.slice(-50), col: c.col, op: c.op, scale: c.scale, tm: c.tm, drop: c.drop })), ev: __ev.slice(-10).map((e) => e.t + ' ' + e.tick + ' ' + e.e.slice(30, 150)) };
  });
  results.push(r); console.log(JSON.stringify(r, null, 0).slice(0, 4000));
  // shot with bloom off for the record
  await page.evaluate(() => { const st = __echoes.__stage; st.bloomPass.enabled = false; });
  await page.evaluate(() => { __echoes.__stage.render(); });
  writeFileSync(`${OUT}/catch${k}-nobloom.png`, await page.screenshot({ type: 'png' }));
  await page.evaluate(() => { __echoes.__stage.bloomPass.enabled = true; __bp.resume(); });
  await new Promise((r) => setTimeout(r, 1500));
}
writeFileSync(`${OUT}/attr.json`, JSON.stringify(results, null, 1));
console.log(JSON.stringify({ errors: errors.slice(0, 5) }));
await browser.close();
