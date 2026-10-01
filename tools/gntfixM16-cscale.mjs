// fix-M1-r6: verbatim copy of tools/gntcmenu6-scale.mjs (menu critic r6), outputs renamed gntfixM16-cscale.
// Menu critic r6 — G1.4 render scale + G1.9 Keep/Revert, by REAL keys in the pause-menu Settings.
// Measures: drawing buffer per press (frames to apply, independent counter), live readout text,
// HUD rects, 3D pixel detail (mean |Laplacian| in a scene box), fps at 0.5 vs 1.0 (A/B/A/B),
// Keep / timeout / Revert(Esc) / reload-during-countdown.
import sharp from 'sharp';
import { launch, open, logger, sleep, CAP, URL_BASE, installFrameCounter, measureFps } from './gntcmenu6-lib.mjs';
import { waitReady } from './gnt-arch-browser.mjs';
const log = logger('gntfixM16-cscale');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const W = 1600, H = 900;
const browser = await launch({ width: W, height: H });
try {
  const page0 = await browser.newPage();
  await installFrameCounter(page0);
  await page0.close();
  // installFrameCounter must be on the page that loads: open manually
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await installFrameCounter(page);
  await page.goto(URL_BASE + '?menu=0&seed=7&fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: 180000 });
  await waitReady(page, { minTick: 240, timeout: 180000 });
  const F = () => page.evaluate(() => { const a = window.__echoes.app; const f = a.focus(); return { id: f && f.id, stack: a.stack().join('>'), ring: a.ringCount(), state: a.state }; });
  const buf = () => page.evaluate(() => { const c = document.querySelector('canvas'); const d = window.__echoes.app.display(); return { cw: c.width, ch: c.height, scale: window.__echoes.settings.get('display.renderScale'), db: d.drawingBuffer, css: d.css }; });
  const hudRects = () => page.evaluate(() => [...document.body.querySelectorAll('body > *:not(canvas):not(#app-ui):not(script) *')].filter((el) => el.id && el.getBoundingClientRect().width > 0).slice(0, 40).map((el) => { const r = el.getBoundingClientRect(); return [el.id, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
  const readout = () => page.evaluate(() => { const r = document.querySelector('[data-row-id="ap-display-renderScale"]') || document.getElementById('ap-display-renderScale').closest('.ap-row'); return r ? r.innerText.replace(/\s+/g, ' ') : null; });
  // press a key and count rendered frames until the canvas matches (w, h)
  const pressAndWait = async (k, w, h) => {
    await page.evaluate((w, h) => { const st = window.__gcFrames; window.__gcWatch = { f0: st.frames, hit: null, w, h }; const c = document.querySelector('canvas'); const loop = () => { const wt = window.__gcWatch; if (!wt || wt.hit !== null) return; if (c.width === wt.w && c.height === wt.h) { wt.hit = st.frames - wt.f0; return; } if (st.frames - wt.f0 > 30) { wt.hit = -1; return; } requestAnimationFrame(loop); }; requestAnimationFrame(loop); }, w, h);
    await page.keyboard.press(k);
    await sleep(350);
    return page.evaluate(() => window.__gcWatch.hit);
  };
  const b0 = await buf();
  log('baseline', b0);
  const hud0 = await hudRects();
  // open pause > Settings (Display, focus Resolution scale)
  await page.keyboard.press('Escape'); await sleep(500);
  let f = await F(); for (let i = 0; i < 6 && f.id !== 'pz-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); f = await F(); }
  await page.keyboard.press('Enter'); await sleep(700);
  f = await F(); log('in settings', f);
  const exp = (s) => [Math.round(W * s), Math.round(H * s)];
  const table = [];
  let s = 1.0;
  for (let i = 0; i < 10; i++) { s = +(s - 0.05).toFixed(2); const [w, h] = exp(s); const fr = await pressAndWait('ArrowLeft', w, h); const b = await buf(); table.push({ s, want: `${w}x${h}`, got: `${b.cw}x${b.ch}`, framesToApply: fr, store: b.scale }); if (s === 0.75 || s === 0.5) log('readout @' + s, await readout()); }
  for (let i = 0; i < 15; i++) { s = +(s + 0.05).toFixed(2); const [w, h] = exp(s); const fr = await pressAndWait('ArrowRight', w, h); const b = await buf(); table.push({ s, want: `${w}x${h}`, got: `${b.cw}x${b.ch}`, framesToApply: fr, store: b.scale }); if (s === 1.25 || s === 1.0) log('readout @' + s, await readout()); }
  log('scale sweep', table);
  const key4 = table.filter((r) => [0.5, 0.75, 1.0, 1.25].includes(r.s));
  check('G1.4a drawing buffer = round(css x s) for 0.5/0.75/1.0/1.25 within 2 frames', key4.every((r) => r.want === r.got && r.framesToApply >= 0 && r.framesToApply <= 2), key4);
  check('G1.4a2 every 5% step applied within 2 frames', table.every((r) => r.want === r.got && r.framesToApply >= 0 && r.framesToApply <= 2), table.filter((r) => !(r.want === r.got && r.framesToApply >= 0 && r.framesToApply <= 2)));
  // Keep/Revert: at 1.25 leave Settings (Esc) -> dialog; wait for the timeout
  await page.keyboard.press('Escape'); await sleep(500);
  f = await F();
  const dlg = await page.evaluate(() => { const d = document.querySelector('[data-screen="keep-display"]'); return d ? d.innerText.replace(/\s+/g, ' ') : null; });
  log('after Esc from Settings', f, dlg);
  check('G1.9a leaving Settings after a scale change opens Keep/Revert with focus on Keep', /keep-display/.test(f.stack) && f.id === 'ap-keep-keep', { f, dlg });
  const tStart = Date.now();
  let reverted = null;
  for (let i = 0; i < 60; i++) { await sleep(250); const st = await F(); if (!/keep-display/.test(st.stack)) { reverted = Date.now() - tStart; break; } }
  const bT = await buf();
  log('timeout closed dialog after ms', reverted, bT, await F());
  check('G1.9b timeout (~10 s) restores the value AND the buffer', reverted !== null && reverted > 8500 && reverted < 11500 && bT.scale === 1 && bT.cw === W && bT.ch === H, { reverted, bT });
  // where does focus land after the timeout? (the dialog was opened by leaving Settings)
  log('focus after timeout', await F());
  // back to Settings to go to 0.5 and KEEP
  f = await F();
  if (f.stack !== 'pause>settings') { if (f.stack === 'pause') { for (let i = 0; i < 6 && (await F()).id !== 'pz-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); } await page.keyboard.press('Enter'); await sleep(700); } }
  f = await F(); log('before 0.5 keep', f);
  for (let i = 0; i < 6 && (await F()).id !== 'ap-display-renderScale'; i++) { await page.keyboard.press('ArrowUp'); await sleep(150); }
  for (let i = 0; i < 10; i++) { await page.keyboard.press('ArrowLeft'); await sleep(90); }
  await sleep(300);
  await page.keyboard.press('Escape'); await sleep(500);
  const kd = await F();
  await page.keyboard.press('Enter'); await sleep(500);
  const bK = await buf(); f = await F();
  check('G1.9c Keep keeps 0.5 and the buffer', /keep-display/.test(kd.stack) && bK.scale === 0.5 && bK.cw === 800 && bK.ch === 450, { kd, bK, f });
  // close pause -> play at 0.5
  for (let i = 0; i < 4 && (await F()).stack !== ''; i++) { await page.keyboard.press('Escape'); await sleep(500); }
  const hud1 = await hudRects();
  const hudDiff = hud0.filter((r, i) => { const q = hud1.find((x) => x[0] === r[0]); return !q || Math.abs(q[1] - r[1]) > 1 || Math.abs(q[2] - r[2]) > 1 || Math.abs(q[3] - r[3]) > 1 || Math.abs(q[4] - r[4]) > 1; });
  check('G1.4b HUD rects unchanged +-1 px at 0.5 vs 1.0', hud0.length > 0 && hudDiff.length === 0, { n: hud0.length, diff: hudDiff.slice(0, 5), sample: hud0.slice(0, 4) });
  // pixel detail + fps A/B at 0.5 and 1.0
  const box = { left: 560, top: 250, width: 480, height: 300 };
  const lap = async (file) => { const { data, info } = await sharp(file).extract(box).greyscale().raw().toBuffer({ resolveWithObject: true }); let sum = 0, n = 0; for (let y = 1; y < info.height - 1; y++) for (let x = 1; x < info.width - 1; x++) { const i = y * info.width + x; const v = 4 * data[i] - data[i - 1] - data[i + 1] - data[i - info.width] - data[i + info.width]; sum += Math.abs(v); n++; } return +(sum / n).toFixed(3); };
  const setScaleUI = async (target) => {
    await page.keyboard.press('Escape'); await sleep(500);
    for (let i = 0; i < 6 && (await F()).id !== 'pz-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); }
    await page.keyboard.press('Enter'); await sleep(600);
    for (let i = 0; i < 6 && (await F()).id !== 'ap-display-renderScale'; i++) { await page.keyboard.press('ArrowUp'); await sleep(150); }
    let cur = await page.evaluate(() => window.__echoes.settings.get('display.renderScale'));
    while (Math.abs(cur - target) > 0.001) { await page.keyboard.press(cur > target ? 'ArrowLeft' : 'ArrowRight'); await sleep(80); cur = await page.evaluate(() => window.__echoes.settings.get('display.renderScale')); }
    await page.keyboard.press('Escape'); await sleep(500);
    if (/keep-display/.test((await F()).stack)) { await page.keyboard.press('Enter'); await sleep(400); }
    for (let i = 0; i < 4 && (await F()).stack !== ''; i++) { await page.keyboard.press('Escape'); await sleep(500); }
    await sleep(1200);
  };
  const res = [];
  for (const target of [0.5, 1.0, 0.5, 1.0]) {
    if (Math.abs((await page.evaluate(() => window.__echoes.settings.get('display.renderScale'))) - target) > 0.001) await setScaleUI(target);
    else await sleep(1200);
    const file = `${CAP}/gntfixM16-cscale-${String(target).replace('.', '')}-${res.length}.png`;
    await page.screenshot({ path: file });
    const m = await measureFps(page, 5000);
    res.push({ target, buf: (await buf()).cw + 'x' + (await buf()).ch, lap: await lap(file), fps: m.fps, ticks: m.ticksPerSec, gameFps: m.game && m.game.renderedFps, workP50: m.game && m.game.workMsP50 });
  }
  log('A/B detail + fps', res);
  const l05 = (res[0].lap + res[2].lap) / 2, l10 = (res[1].lap + res[3].lap) / 2;
  const f05 = (res[0].fps + res[2].fps) / 2, f10 = (res[1].fps + res[3].fps) / 2;
  check('G1.4c 3D detail lower at 0.5 than 1.0 (mean |Laplacian| in a scene box)', l05 < l10 * 0.9, { l05, l10 });
  check('G1.4d fps(0.5) >= fps(1.0) (independent counter, A/B/A/B)', f05 >= f10 * 0.98, { f05, f10 });
  // Revert by Esc on the dialog
  await page.keyboard.press('Escape'); await sleep(500);
  for (let i = 0; i < 6 && (await F()).id !== 'pz-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); }
  await page.keyboard.press('Enter'); await sleep(600);
  for (let i = 0; i < 6 && (await F()).id !== 'ap-display-renderScale'; i++) { await page.keyboard.press('ArrowUp'); await sleep(150); }
  for (let i = 0; i < 5; i++) { await page.keyboard.press('ArrowLeft'); await sleep(80); }
  const mid = await buf();
  await page.keyboard.press('Escape'); await sleep(500); const dd = await F();
  await page.keyboard.press('Escape'); await sleep(500); const bR = await buf(); const fR = await F();
  check('G1.9d Esc on Keep/Revert = Revert: value AND buffer restored', mid.scale === 0.75 && /keep-display/.test(dd.stack) && bR.scale === 1 && bR.cw === W && bR.ch === H, { mid, dd, bR, fR });
  // Reload during the countdown: is the unconfirmed scale persisted?
  for (let i = 0; i < 6 && (await F()).id !== 'ap-display-renderScale'; i++) { await page.keyboard.press('ArrowUp'); await sleep(150); }
  f = await F();
  if (f.stack === 'pause') { for (let i = 0; i < 6 && (await F()).id !== 'pz-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); } await page.keyboard.press('Enter'); await sleep(600); }
  for (let i = 0; i < 8; i++) { await page.keyboard.press('ArrowLeft'); await sleep(80); }
  await page.keyboard.press('Escape'); await sleep(600);
  const pre = { f: await F(), b: await buf(), stored: await page.evaluate(() => { try { return localStorage.getItem('echoes.settings'); } catch (e) { return 'ERR'; } }) };
  log('before reload (countdown running)', pre.f, pre.b, (pre.stored || '').slice(0, 200));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 30, { timeout: 180000 });
  await sleep(800);
  const post = await buf();
  log('after reload', post);
  check('S3/G1.9e reload during the countdown does NOT keep the unconfirmed scale', post.scale === 1 && post.cw === W, { preScale: pre.b.scale, postScale: post.scale, post });
  log('page errors', errors.length, errors.slice(0, 3));
  check('0 page errors', errors.length === 0, errors.length);
} finally { await browser.close(); }
log('TOTAL FAILS', fails);
