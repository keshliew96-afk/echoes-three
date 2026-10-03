// gntfixCAMPAIGN5 — fix builder r5 (own file): F2 "Cannot read properties of undefined (reading 'isReady')".
// three.js WebGLRenderer.compileAsync polls properties.get(material).currentProgram.isReady() from a
// setTimeout; a material disposed while that poll is pending throws there and the promise never settles.
//
// Modes (fresh browser context per trial):
//   legacy : the critic's boot ?level=3&seed=S&fresh=1, 7 s each (natural timing; --par N pages = load)
//   mech   : ?menu=0 camp boot, levels unlocked by the probe override, then __echoes.campaign.choose(3)
//            (= Level Select -> III) fired on a frame where a Level-1 layout's async compile is in flight
//   slow   : DETERMINISTIC — a slow-driver emulation: KHR_parallel_shader_compile's COMPLETION_STATUS reports
//            "not ready" for --slow ms (default 2500) after a program's first poll, so every async compile
//            window is wide; then the legacy boot (?level=3) — the camp's Level-1 dressings are disposed
//            while their compile is pending, every time.
//   slowmech: slow + mech (choose(3) during the in-flight window)
//   slowquit: slow + ?level=1 boot -> skipToRoom 8 + killBoss -> Quit to Lobby from the level-clear card while
//            a Level-2 layout compile is pending (player path in the critic's F2 note)
// Records every pageerror; after the action: pump health (does the background builder still finish the
// resident level's layouts? i.e. no compile promise left hanging), campaign phase / level.
// usage: node tools/gntfixCAMPAIGN5-isready.mjs <mode> [--n 8] [--par 1] [--slow 2500] [--base URL] [--tag x]
import { launchEchoes } from './gnt-arch-browser.mjs';
import fs from 'fs';

const argv = process.argv.slice(2);
const mode = argv[0] || 'slow';
const A = {};
for (let i = 1; i < argv.length; i++) if (argv[i].startsWith('--')) A[argv[i].slice(2)] = argv[i + 1];
const base = A.base || 'http://127.0.0.1:4365/';
const N = +(A.n || 6);
const PAR = +(A.par || 1);
const SLOW = +(A.slow || 2500);
const tag = A.tag || mode;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = `captures/gntfixM4a5-isready-${tag}.json`;

const INIT = (slowMs) => `(() => {
  const st = { polls: 0, pollsFalse: 0, faked: 0, errs: [], slow: ${slowMs} };
  window.__gf5 = st;
  const first = new WeakMap();
  const hook = (P) => { const o = P.getProgramParameter; P.getProgramParameter = function (p, n) {
    const v = o.apply(this, arguments);
    if (n === 0x91B1) {
      st.polls++;
      if (st.slow > 0) { const now = performance.now(); if (!first.has(p)) first.set(p, now); if (now - first.get(p) < st.slow) { st.faked++; st.pollsFalse++; return false; } }
      if (!v) st.pollsFalse++;
    }
    return v; }; };
  try { hook(WebGL2RenderingContext.prototype); } catch (e) {}
  try { hook(WebGLRenderingContext.prototype); } catch (e) {}
  window.addEventListener('error', (e) => { st.errs.push({ t: Math.round(performance.now()), msg: String(e.message).slice(0, 200) }); });
})();`;

const R = { mode, base, N, PAR, slow: mode.startsWith('slow') ? SLOW : 0, startedAt: new Date().toISOString(), rows: [] };
const save = () => fs.writeFileSync(OUT, JSON.stringify(R, null, 1));

async function openPage(browser, url, slowMs) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String((e && e.stack) || e).slice(0, 600)));
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(INIT(slowMs));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0 && !!window.__echoes.campaign, { timeout: 180000 });
  return { ctx, page, errors };
}

// Pump health: wait (up to ms) for every layout of the resident level to be built + warmed.
const HEALTH = (ms) => new Promise((resolve) => {
  const E = window.__echoes;
  const t0 = performance.now();
  const f = () => {
    let r = null;
    try { r = E.campaign.residency(); } catch (e) {}
    const c = E.campaign.state();
    const lv = c.level || 1;
    let rd = null;
    try { rd = E.campaign.ready(lv); } catch (e) {}
    if ((rd && rd.ready) || performance.now() - t0 > ms)
      return resolve({ ms: Math.round(performance.now() - t0), ready: rd, level: lv, phase: c.phase, disposals: r && r.disposals, disposedIds: r && r.disposedIds, compile: r && r.compile, gf5: { polls: window.__gf5.polls, faked: window.__gf5.faked, errs: window.__gf5.errs.length } });
    setTimeout(f, 100);
  };
  f();
});

const WAIT_WINDOW = (lo, hi, maxMs) => new Promise((resolve) => {
  const E = window.__echoes;
  const t0 = performance.now();
  const f = () => {
    let res = null;
    try { res = E.campaign.residency(); } catch (e) {}
    const tlr = (res && res.timeline) || [];
    const inflight = tlr.filter((r) => r.uploaded !== undefined && r.warm === undefined && !(res.disposedIds || []).includes(r.id));
    const hit = inflight.find((r) => r.id >= lo && r.id <= hi);
    if (hit) return resolve({ found: true, at: Math.round(performance.now()), id: hit.id });
    if (performance.now() - t0 > maxMs) return resolve({ found: false, timeline: tlr });
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
});

async function oneLegacy(browser, i, slowMs) {
  const o = await openPage(browser, base + `?level=3&seed=${4 + (i % 3)}&fresh=1`, slowMs);
  await sleep(7000);
  const health = await o.page.evaluate(HEALTH, 25000);
  const row = { i, errors: o.errors, health };
  await o.ctx.close();
  return row;
}

async function oneMech(browser, i, slowMs) {
  const o = await openPage(browser, base + '?menu=0&seed=4&fresh=1', slowMs);
  await o.page.evaluate(() => window.__echoes.campaign.unlock([1, 2, 3]));
  const w = await o.page.evaluate(WAIT_WINDOW, 1, 3, 25000);
  let act = null;
  if (w.found) act = await o.page.evaluate(() => ({ t: Math.round(performance.now()), r: window.__echoes.campaign.choose(3) }));
  await sleep(4000);
  const health = await o.page.evaluate(HEALTH, 25000);
  const row = { i, window: w, act, health, errors: o.errors };
  await o.ctx.close();
  return row;
}

const focusTo = async (page, id, key, max = 10) => {
  for (let i = 0; i < max; i++) {
    const f = await page.evaluate(() => window.__echoes.app.focus());
    if (f && f.id === id) return true;
    await page.keyboard.press(key);
    await sleep(120);
  }
  return false;
};
async function oneQuit(browser, i, slowMs) {
  const o = await openPage(browser, base + `?level=1&seed=${40 + i}&fresh=1`, slowMs);
  const p = o.page;
  await p.waitForFunction(() => { const s = window.__echoes.state(); return s.run.phase === 'combat' && s.run.room === 1; }, { timeout: 90000 });
  await p.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
  await p.waitForFunction(() => { const r = window.__echoes.state().run; return r.room === 8 && r.boss && r.boss.active && r.phase === 'combat'; }, { timeout: 30000 });
  await sleep(1500);
  await p.evaluate(() => { const E = window.__echoes; E.cmd('killBoss'); E.cmd('killAllEnemies'); });
  await p.waitForFunction(() => window.__echoes.campaign.state().phase === 'transit', { timeout: 20000 });
  await p.keyboard.press('Escape');
  await sleep(250);
  const found = await focusTo(p, 'pz-lobby', 'ArrowDown');
  await p.keyboard.press('Enter');
  await sleep(200);
  const ok = await focusTo(p, 'ap-confirm-ok', 'ArrowLeft', 3);
  const w = await p.evaluate(WAIT_WINDOW, 4, 6, 12000);
  await p.keyboard.press('Enter');
  await sleep(4000);
  const health = await p.evaluate(HEALTH, 25000);
  const end = await p.evaluate(() => ({ mode: window.__echoes.app.mode, phase: window.__echoes.state().run.phase }));
  const row = { i, found, ok, window: w, end, health, errors: o.errors };
  await o.ctx.close();
  return row;
}

const browsers = [];
try {
  for (let p = 0; p < PAR; p++) browsers.push(await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 }));
  let next = 0;
  const slowMs = mode.startsWith('slow') ? SLOW : 0;
  const worker = async (b, p) => {
    while (true) {
      const i = next++;
      if (i >= N) return;
      let row = null;
      for (let attempt = 1; attempt <= 3 && !row; attempt++) {
        try {
          if (mode === 'legacy' || mode === 'slow') row = await oneLegacy(b, i, slowMs);
          else if (mode === 'mech' || mode === 'slowmech') row = await oneMech(b, i, slowMs);
          else if (mode === 'slowquit' || mode === 'quit') row = await oneQuit(b, i, slowMs);
        } catch (e) {
          console.log('retry', i, attempt, String(e).slice(0, 200));
        }
      }
      if (!row) row = { i, failed: true };
      row.worker = p;
      R.rows.push(row);
      const errs = row.errors || [];
      console.log(mode, i, 'errors', errs.length, errs.length ? errs[0].slice(0, 140).replace(/\n/g, ' | ') : '', row.health ? JSON.stringify({ ready: row.health.ready && row.health.ready.ready, ms: row.health.ms, lv: row.health.level, faked: row.health.gf5.faked, compile: row.health.compile }) : '', row.window ? JSON.stringify({ found: row.window.found, id: row.window.id }) : '');
      save();
    }
  };
  await Promise.all(browsers.map((b, p) => worker(b, p)));
} finally {
  R.endedAt = new Date().toISOString();
  R.summary = {
    rows: R.rows.length,
    failed: R.rows.filter((r) => r.failed).length,
    withError: R.rows.filter((r) => (r.errors || []).length).length,
    isReady: R.rows.filter((r) => (r.errors || []).some((e) => /isReady/.test(e))).length,
    pumpStalled: R.rows.filter((r) => r.health && !(r.health.ready && r.health.ready.ready)).length,
  };
  save();
  console.log('SUMMARY', JSON.stringify(R.summary));
  for (const b of browsers) await b.close().catch(() => {});
}
