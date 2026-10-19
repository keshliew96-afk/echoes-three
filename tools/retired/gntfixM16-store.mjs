// fix-M1-r6 — settings store change ordering (the root cause of MENU-R6-F1).
// On the running game's own store (window.__echoes.settings):
//   S1 a set() made inside a change listener reaches every LATER listener after
//      the outer change, so each listener's last-heard value equals the store
//      (was: later listeners heard the nested value first and the stale one last)
//   S2 the audio engine's mode switch (log <-> linear keeps loudness by moving
//      the level, a nested set) still lands: the level moves, a late listener
//      hears mode then level, and its last-heard values equal the store
//   S3 the display service's gamepad refusal (display.fullscreen true -> false
//      inside the change) leaves the store, a late listener and the real state
//      all on false
// Usage: [ECHOES_URL=<base>/] node tools/gntfixM16-store.mjs
import { launch, logger, sleep, URL_BASE, reachTitle } from './gntcmenu6-lib.mjs';

const log = logger('gntfixM16-store');
const browser = await launch({});
let fails = 0;
const expect = (label, cond, detail) => {
  if (!cond) fails++;
  log(`${cond ? 'PASS' : 'FAIL'} ${label}`, detail === undefined ? '' : detail);
};
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(URL_BASE + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
  await reachTitle(page);
  log('version', await page.evaluate(() => window.__echoes.version));

  const s1 = await page.evaluate(() => {
    const S = window.__echoes.app.service('settings');
    const heard = [];
    // An early listener that clamps the screenshake to 0.5 whenever it is set to 1 (a nested set).
    const offA = S.subscribe('gameplay.screenshake', (v) => {
      if (v === 1) S.set('gameplay.screenshake', 0.5, { source: 'system' });
    });
    const offB = S.subscribe('gameplay.screenshake', (v, p, prev, src) => heard.push({ v, prev, src }));
    const before = S.get('gameplay.screenshake');
    S.set('gameplay.screenshake', 0, { source: 'api' });
    heard.length = 0;
    S.set('gameplay.screenshake', 1, { source: 'api' });
    const out = { before, heard: heard.slice(), store: S.get('gameplay.screenshake') };
    offA();
    offB();
    S.set('gameplay.screenshake', before, { source: 'api' });
    return out;
  });
  log('S1', s1);
  expect('S1 a late listener hears the outer change first and the nested one last', s1.heard.length === 2 && s1.heard[0].v === 1 && s1.heard[1].v === 0.5, s1.heard);
  expect('S1 last-heard value equals the store', s1.heard.length > 0 && s1.heard[s1.heard.length - 1].v === s1.store, { last: s1.heard[s1.heard.length - 1], store: s1.store });

  const s2 = await page.evaluate(() => {
    const S = window.__echoes.app.service('settings');
    const heard = [];
    const off = S.subscribe('audio.music', (v, p, prev, src) => heard.push({ p, v, prev, src }));
    const mode0 = S.get('audio.music.mode');
    const lvl0 = S.get('audio.music.level');
    const other = mode0 === 'log' ? 'linear' : 'log';
    S.set('audio.music.mode', other, { source: 'ui' });
    const out = { mode0, lvl0, mode1: S.get('audio.music.mode'), lvl1: S.get('audio.music.level'), heard: heard.slice() };
    off();
    S.set('audio.music.mode', mode0, { source: 'revert' });
    S.set('audio.music.level', lvl0, { source: 'revert' });
    out.restored = { mode: S.get('audio.music.mode'), level: S.get('audio.music.level') };
    return out;
  });
  log('S2', s2);
  expect('S2 the mode switch moved the level (loudness kept)', s2.mode1 !== s2.mode0 && s2.lvl1 !== s2.lvl0, { lvl0: s2.lvl0, lvl1: s2.lvl1 });
  const lastBy = (arr, p) => [...arr].reverse().find((e) => e.p === p);
  expect('S2 a late listener hears mode first, then level', s2.heard.length >= 2 && s2.heard[0].p === 'audio.music.mode' && s2.heard[1].p === 'audio.music.level', s2.heard.map((e) => e.p));
  expect('S2 last-heard values equal the store', lastBy(s2.heard, 'audio.music.mode')?.v === s2.mode1 && lastBy(s2.heard, 'audio.music.level')?.v === s2.lvl1);
  expect('S2 restored', s2.restored.mode === s2.mode0 && Math.abs(s2.restored.level - s2.lvl0) < 1e-9, s2.restored);

  // S3: the display service's gamepad refusal, driven through the store as the Display tab does
  // while the nav's last input source is the gamepad (a nav action from the 'gamepad' source).
  const s3 = await page.evaluate(async () => {
    const E = window.__echoes;
    const S = E.app.service('settings');
    const heard = [];
    const off = S.subscribe('display.fullscreen', (v, p, prev, src) => heard.push({ v, src }));
    // Make the nav's last source the gamepad the way a pad press does.
    const pad = { id: 'm16', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), timestamp: 0 };
    navigator.getGamepads = () => { pad.timestamp = performance.now(); return [pad, null, null, null]; };
    const f0 = E.app.frameCount;
    for (let i = 0; i < 100 && E.app.frameCount < f0 + 3; i++) await new Promise((r) => setTimeout(r, 50)); // the poller sees the pad idle first
    const f1 = E.app.frameCount;
    // D-pad down on the title (source -> gamepad); held until the poller has seen it (a loaded
    // machine renders the title at a few fps, and the pad is polled once per rendered frame).
    pad.buttons[13].pressed = true; pad.buttons[13].value = 1;
    for (let i = 0; i < 100 && E.app.lastSource() !== 'gamepad'; i++) await new Promise((r) => setTimeout(r, 50));
    pad.buttons[13].pressed = false; pad.buttons[13].value = 0;
    { const fr = E.app.frameCount; for (let i = 0; i < 100 && E.app.frameCount < fr + 2; i++) await new Promise((r) => setTimeout(r, 50)); }
    const src = E.app.lastSource();
    const padDbg = E.app.gamepad ? E.app.gamepad() : null;
    S.set('display.fullscreen', true, { source: 'ui' });
    const out = { src, padDbg, frames: [f0, f1, E.app.frameCount], vis: document.visibilityState, top: E.app.stack(), heard: heard.slice(), store: S.get('display.fullscreen'), fsEl: !!document.fullscreenElement };
    off();
    return out;
  });
  log('S3', s3);
  expect('S3 source was the gamepad', s3.src === 'gamepad', s3.src);
  expect('S3 store, late listener and real state all end on windowed', s3.store === false && !s3.fsEl && s3.heard.length > 0 && s3.heard[s3.heard.length - 1].v === false, s3);
  await sleep(300);
  log('page errors', errors.length, errors.slice(0, 3));
  if (errors.length) fails++;
  log(`RESULT ${fails === 0 ? 'PASS' : 'FAIL'} fails=${fails}`);
} finally {
  await browser.close();
}
process.exit(fails === 0 ? 0 : 1);
