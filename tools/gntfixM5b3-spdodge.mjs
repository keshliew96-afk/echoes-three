// gntfixM5b3-spdodge.mjs — control for NET3-F2's first-dodge hitch (fix-M5b-r3):
// the SAME measurement on a SINGLE-PLAYER page (no network): room 1 combat,
// one earlier user gesture, then --n dodges; per dodge the keydown ->
// first moved rendered frame and the longest rendered-frame gap after it.
// With --trace the first dodge is Chrome-traced (longest GPU/raster events).
// node tools/gntfixM5b3-spdodge.mjs --base http://127.0.0.1:4307/ [--n 3] [--trace]
import { args, openClient, waitFor, sleep, writeJson, closeClient } from './gntfixM5b3-lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const A = args();
const base = A.base || 'http://127.0.0.1:4307/';
const n = Number(A.n || 3);
const out = { tool: 'gntfixM5b3-spdodge', base, dodges: [] };
const c = await openClient(`${base}?menu=0&seed=5`, { w: 960, h: 540, tag: 'sp' });
try {
  await waitFor(c.page, () => window.__echoes.tick > 240, { timeout: 90000 });
  out.version = await c.page.evaluate(() => window.__echoes.version);
  await c.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitFor(c.page, () => window.__echoes.state().run && window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  await c.page.evaluate(() => {
    const E = window.__echoes;
    window.__skeep = setInterval(() => {
      try {
        for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.7) E.cmd('setHp', m.id, m.maxHp);
      } catch {
        /* */
      }
    }, 400);
    window.__pf = [];
    window.__pkey = null;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat) window.__pkey = e.timeStamp;
    }, true);
    const f = (t) => {
      const p = E.state().party.find((q) => q.id === 0);
      window.__pf.push({ t, x: p ? p.x : 0, z: p ? p.z : 0 });
      if (window.__pf.length > 2000) window.__pf.splice(0, 1000);
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await c.page.keyboard.press('KeyL'); // the player's earlier gesture
  // --prewarmWipe: experiment — paint the dodge tile's cooldown wipe through
  // every angle band (incl. the degenerate 0 / 360 edges) before the dodges.
  if (A.prewarmWipe) {
    out.prewarm = await c.page.evaluate(async (list) => {
      const el = document.querySelector('.hud-group-dodge .hud-slot-wipe');
      if (!el) return 'no-wipe';
      const W = 'rgba(34,31,27,0.7)';
      for (const e of list) {
        el.style.background = e >= 360 ? 'none' : `conic-gradient(transparent 0deg ${e}deg, ${W} ${e}deg 360deg)`;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      el.style.background = 'none';
      return list.length;
    }, String(A.prewarmWipe) === 'true' ? [0, 1, 2, 3, 5, 8, 13, 30, 60, 90, 180, 270, 330, 355, 358, 359] : String(A.prewarmWipe).split(',').map(Number));
  }
  // --prewarmReady: experiment — play the dodge tile's 'hud-ready' pop once
  // and then paint it cooling for a few frames, before the dodges.
  if (A.prewarmReady) {
    out.prewarmReady = await c.page.evaluate(async () => {
      const slot = document.querySelector('.hud-group-dodge .hud-slot');
      if (!slot) return 'no-slot';
      const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      slot.classList.add('hud-ready');
      await new Promise((r) => setTimeout(r, 300));
      slot.classList.remove('hud-ready');
      await raf2();
      slot.classList.add('is-cooling');
      await raf2();
      await raf2();
      slot.classList.remove('is-cooling');
      return 'ok';
    });
  }
  await sleep(4000);
  for (let i = 0; i < n; i++) {
    await c.page.mouse.move(700, 270);
    await sleep(1500);
    const tf = path.join(process.cwd(), 'captures', `gntfixM5b3-spdodge-${i}.trace.json`);
    const tracing = A.trace && i === Number(A.traceAt || 0);
    if (tracing) await c.page.tracing.start({ path: tf, categories: ['toplevel', 'gpu', 'disabled-by-default-gpu.service', 'blink', 'cc', 'viz', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.invalidationTracking'] });
    await c.page.evaluate(() => {
      window.__pf.length = 0;
    });
    await c.page.keyboard.press('Space');
    await sleep(1000);
    if (tracing) await c.page.tracing.stop();
    const fr = await c.page.evaluate(() => ({ key: window.__pkey, frames: window.__pf.slice() }));
    let gap = 0;
    let gapAt = null;
    for (let k = 1; k < fr.frames.length; k++) {
      const d = fr.frames[k].t - fr.frames[k - 1].t;
      if (d > gap) {
        gap = d;
        gapAt = fr.frames[k - 1].t - fr.key;
      }
    }
    const p0 = fr.frames.filter((f) => f.t <= fr.key).pop() || fr.frames[0];
    const mv = fr.frames.find((f) => f.t > fr.key && Math.hypot(f.x - p0.x, f.z - p0.z) > 0.05);
    const row = { i, gapMs: Math.round(gap), gapAfterKeyMs: gapAt !== null ? Math.round(gapAt) : null, keyToMoveMs: mv ? Math.round(mv.t - fr.key) : null };
    if (tracing) {
      const tr = JSON.parse(fs.readFileSync(tf, 'utf8'));
      const evs = (tr.traceEvents || tr).filter((e) => e.ph === 'X' && e.dur > Number(A.minDur || 15000));
      const names = new Map();
      for (const e of tr.traceEvents || tr) if (e.ph === 'M' && e.name === 'thread_name') names.set(e.pid + ':' + e.tid, e.args.name);
      // the stall's window: the longest raster flush; list what the renderer
      // invalidated / painted in the 300 ms before it ends
      const all = tr.traceEvents || tr;
      const flush = all.filter((e) => e.name === 'RasterDecoderImpl::DoEndRasterCHROMIUM::Flush' && e.dur).sort((x, y) => y.dur - x.dur)[0];
      if (flush) {
        const lo = flush.ts - 300000;
        const hi = flush.ts + flush.dur;
        const inv = all.filter((e) => e.ts >= lo && e.ts <= hi && /Invalidat|StyleRecalc|Paint|UpdateLayer/.test(e.name) && e.args && e.args.data);
        row.inWindow = inv.slice(0, 80).map((e) => Math.round((e.ts - flush.ts) / 1000) + 'ms ' + e.name + ' ' + JSON.stringify(e.args.data).slice(0, 220));
      }
      row.top = evs.sort((x, y) => y.dur - x.dur).slice(0, Number(A.topN || 12)).map((e) => Math.round(e.dur / 1000) + 'ms ' + (names.get(e.pid + ':' + e.tid) || e.tid) + ' ' + e.name);
    }
    out.dodges.push(row);
    console.log(JSON.stringify(row));
    await sleep(1500);
  }
} catch (e) {
  out.crash = String(e.stack || e);
  console.error(e);
} finally {
  out.pageErrors = c.errors;
  writeJson(A.out || 'gntfixM5b3-spdodge.json', out);
  await closeClient(c);
}
