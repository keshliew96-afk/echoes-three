// fix-M1-r6: verbatim copy of tools/gntcmenu6-legacy2.mjs (menu critic r6), outputs renamed gntfixM16-clegacy2.
// Menu critic r6 — re-check two legacy boots with a longer settle (machine saturated).
import { launch, logger, sleep, URL_BASE } from './gntcmenu6-lib.mjs';
const log = logger('gntfixM16-clegacy2');
const browser = await launch({});
try {
  for (const q of ['?room=kill_all&seed=7', '?act=2&run=1&seed=2', '?room=defend&seed=2']) {
    const p = await browser.newPage(); const err = [];
    p.on('pageerror', (e) => err.push(String(e.message || e)));
    await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    await p.goto(URL_BASE + q, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await p.waitForFunction(() => !!window.__echoes && !!window.__echoes.app && window.__echoes.tick >= 0, { timeout: 180000 });
    const first = await p.evaluate(() => ({ state: window.__echoes.app.state, stack: window.__echoes.app.stack() }));
    const t0 = Date.now();
    await p.waitForFunction(() => window.__echoes.tick > 120, { timeout: 60000 }).catch(() => {});
    const r = await p.evaluate(() => { const s = window.__echoes.state(); return { state: window.__echoes.app.state, stack: window.__echoes.app.stack(), tick: s.tick, scene: s.scene, room: s.room, enemies: s.enemies.length, run: { phase: s.run.phase, room: s.run.room, act: s.run.act } }; });
    log(q, { first, waitedMs: Date.now() - t0, ...r, err: err.slice(0, 2) });
    await p.close();
  }
} finally { await browser.close(); }
