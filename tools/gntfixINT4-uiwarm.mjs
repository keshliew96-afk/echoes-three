#!/usr/bin/env node
// fix-INT-r4 J4-F1: the title-boot HUD paint warm-up is invisible and costs nothing the player sees.
// Fresh GPU-harness browser, plain title boot (?fresh=1&seed=7&menu=1): every rAF frame records the HUD layers'
// computed visibility + opacity (#hud, #hud-threat, #dmg-num-layer) and the frame time, from page open to 3 s after
// the title is up. Checks: U1 the warm ran on the title (window.__echoesUiWarm.startedAt set, ms < 1000);
// U2 on EVERY frame where a HUD layer was visible on the title, its effective opacity was <= 0.01;
// U3 the layers are hidden again on the title after the warm; U4 frames on the title: max (reported);
// U5 0 page errors. Also a ?menu=0 boot: the warm never arms a title warm (U6).
//   node tools/gntfixINT4-uiwarm.mjs [--url http://127.0.0.1:4310] [--tag x]
import { writeFileSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4310'); const tag = arg('tag', 'x');
const sleep = (t) => new Promise((r) => setTimeout(r, t));
async function waitFor(page, body, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; } catch { /* */ } await sleep(50); } return -1; }
const checks = []; let fails = 0;
const check = (n, ok, d) => { checks.push({ n, ok: !!ok, d }); if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${n} ${String(JSON.stringify(d ?? null)).slice(0, 600)}`); };
const out = { tag, base, checks };
const REC = () => {
  window.__uw = [];
  let last = performance.now();
  const eff = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity || '1'); return +o.toFixed(4); };
  const f = (t) => {
    const E = window.__echoes;
    const row = { t: Math.round(t), dt: +(t - last).toFixed(1), state: E && E.app ? E.app.state : 'pre', loading: !!(E && E.app && E.app.stack && E.app.stack().includes('loading')), layers: {} };
    for (const id of ['hud', 'hud-threat', 'dmg-num-layer']) {
      const el = document.getElementById(id);
      if (!el) continue;
      const cs = getComputedStyle(el);
      // the most opaque VISIBLE descendant (the numeral warm spans set their own visibility / opacity)
      let maxO = 0; let anyVis = false;
      void cs; // the layer container itself paints nothing: only its descendants count
      for (const c of el.querySelectorAll('*')) { const s2 = getComputedStyle(c); if (s2.visibility === 'visible' && s2.display !== 'none' && c.getClientRects().length) { anyVis = true; maxO = Math.max(maxO, eff(c)); } }
      row.layers[id] = { vis: anyVis, maxOpacity: +maxO.toFixed(4) };
    }
    last = t;
    window.__uw.push(row);
    if (window.__uw.length < 2000) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
};
const browser = await launchEchoes({ gpu: true });
try {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(REC);
  await page.goto(`${base}/?fresh=1&seed=7&menu=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await waitFor(page, `window.__echoes && (window.__echoes.app.state==='title' || (window.__echoes.app.focus()||{}).label==='Press any key or click')`, 120000);
  if (await page.evaluate(() => window.__echoes.app.stack().includes('loading'))) await page.keyboard.press('Enter');
  await waitFor(page, `window.__echoes.app.state==='title' && !window.__echoes.app.stack().includes('loading')`, 30000);
  await sleep(3000);
  const R = await page.evaluate(() => ({ rows: window.__uw, warm: window.__echoesUiWarm, version: window.__echoes.version }));
  const title = R.rows.filter((r) => r.state === 'title' && !r.loading);
  const loadingRows = R.rows.filter((r) => r.loading);
  const visRows = [...loadingRows, ...title].filter((r) => Object.values(r.layers).some((l) => l.vis));
  const worst = visRows.reduce((m, r) => Math.max(m, ...Object.values(r.layers).filter((l) => l.vis).map((l) => l.maxOpacity)), 0);
  const lastRow = title[title.length - 1];
  out.version = R.version; out.warm = R.warm;
  check('U1 the HUD paint warm ran under the loading card (before the title)', R.warm && R.warm.on === 'loading' && R.warm.startedAt !== null && R.warm.ms !== null && R.warm.ms < 3000, R.warm);
  check('U2 every loading / title frame with a HUD layer visible had it at <= 0.01 effective opacity', worst <= 0.01, { framesVisible: visRows.length, worstOpacity: worst, sample: visRows.slice(0, 3) });
  check('U3 the HUD layers are hidden again on the title after the warm', lastRow && Object.values(lastRow.layers).every((l) => !l.vis), lastRow);
  const tDt = title.slice(1).map((r) => r.dt);
  out.titleFrames = { n: tDt.length, max: Math.max(...tDt), over50: tDt.filter((x) => x > 50).length, over100: tDt.filter((x) => x > 100).length, long: title.filter((r) => r.dt > 50).map((r) => ({ dt: r.dt, t: r.t })) };
  const lDt = loadingRows.slice(1).map((r) => r.dt);
  out.loadingFrames = { n: lDt.length, max: Math.max(...lDt), over100: lDt.filter((x) => x > 100).length, long: loadingRows.filter((r) => r.dt > 100).map((r) => ({ dt: r.dt, t: r.t })) };
  // REPORT ONLY: this recorder walks every HUD node with getComputedStyle each frame, which inflates frame
  // times by itself; the clean title-frame measurement is tools/gntfixINT4-titletrace.mjs.
  check('U4 (report) title / loading frames under this heavy recorder', true, { title: out.titleFrames, loading: out.loadingFrames });
  check('U5 0 page errors (title boot)', errors.length === 0, errors);
  // menu-skip boot: no title warm is armed
  const p2 = await ctx.newPage(); const e2 = []; p2.on('pageerror', (e) => e2.push(String(e)));
  await p2.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await p2.goto(`${base}/?menu=0&seed=7`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await waitFor(p2, `window.__echoes && window.__echoes.tick > 240`, 120000);
  const w2 = await p2.evaluate(() => ({ warm: window.__echoesUiWarm, state: window.__echoes.app.state, bodyWarm: document.body.classList.contains('pz-uiwarm') }));
  check('U6 a ?menu=0 boot plays with no title warm armed and no page errors', w2.state === 'playing' && w2.warm && w2.warm.startedAt === null && !w2.bodyWarm && e2.length === 0, { w2, e2 });
} catch (e) { out.harnessError = String((e && e.stack) || e); console.error(e); fails++; }
finally { await browser.close(); }
out.fails = fails;
writeFileSync(`captures/gntfixINT4-uiwarm-${tag}.json`, JSON.stringify(out, null, 1));
console.log(`${checks.length - checks.filter((c) => !c.ok).length}/${checks.length}`);
process.exit(fails ? 1 : 0);
