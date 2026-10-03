#!/usr/bin/env node
// fix-INT-r3 J3-F2 probe: what a player sees during boot.
//   node tools/gntfixINT3-boot.mjs <baseUrl> <tag> [--reps 2] [--legs static,frames,menuskip]
// Legs:
//   static   — the bundle is held back (request interception): what the page
//              shows with no JS yet (the static splash), + its layout rects.
//   frames   — cold/warm title boots with a CDP screencast: time of the first
//              frame, first CONTENT frame (a pixel > 120 luma), frames where
//              the world shows RAW (bright pixels outside the centre column
//              while no overlay covers it), per-rAF DOM log (splash present /
//              loading-screen opacity) and the rect deltas between the static
//              splash and the loading screen at the hand-over.
//   menuskip — ?menu=0: the splash leaves after the first world frames.
import { writeFileSync } from 'fs';
import sharp from 'sharp';
import { launchEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const base = argv[0] || 'http://127.0.0.1:4310';
const tag = argv[1] || 'prod';
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const reps = Number(opt('reps', 2));
const legs = opt('legs', 'static,frames,menuskip').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { schema: 'gntfixINT3-boot/1', at: new Date().toISOString(), base, tag };

// Per-animation-frame DOM log, installed before any page script runs.
const LOGGER = `(() => {
  const t0 = performance.now();
  const log = [];
  window.__bootLog = log;
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left*10)/10, Math.round(r.top*10)/10, Math.round(r.width*10)/10, Math.round(r.height*10)/10]; };
  window.__bootRects = () => ({
    splash: { word: rect(document.querySelector('#boot-splash .bs-word')), rule: rect(document.querySelector('#boot-splash .bs-rule')), bar: rect(document.querySelector('#boot-splash .bs-bar')), status: rect(document.querySelector('#boot-splash .bs-status')), press: rect(document.querySelector('#boot-splash .bs-press')) },
    loading: { word: rect(document.querySelector('.ap-loading .ap-logo-word')), rule: rect(document.querySelector('.ap-loading .ap-logo-rule')), bar: rect(document.querySelector('.ap-loading .ap-bar')), status: rect(document.querySelector('.ap-loading .ap-load-status')), press: rect(document.querySelector('.ap-loading .ap-press')) },
  });
  let handRects = null;
  const f = () => {
    const bs = document.getElementById('boot-splash');
    const ld = document.querySelector('[data-screen="loading"]');
    const bsOp = bs ? parseFloat(getComputedStyle(bs).opacity) : null;
    const ldOp = ld ? parseFloat(getComputedStyle(ld).opacity) : null;
    const ldShown = !!ld && getComputedStyle(ld).display !== 'none';
    const canvas = !!document.querySelector('#app canvas');
    const E = window.__echoes;
    const fc = E && E.app && E.app.debug ? null : null;
    if (bs && ld && ldShown && !handRects) handRects = null;
    if (bs && ld && ldShown && ldOp >= 0.99) handRects = window.__bootRects();
    log.push({ t: Math.round(performance.now() - t0), bs: !!bs, bsOp, ld: ldShown, ldOp, canvas, state: E && E.app ? E.app.state : null });
    if (log.length < 4000) requestAnimationFrame(f);
  };
  window.__handRects = () => handRects;
  requestAnimationFrame(f);
})();`;

async function lumaStats(b64, w, h) {
  const { data, info } = await sharp(Buffer.from(b64, 'base64')).greyscale().raw().toBuffer({ resolveWithObject: true });
  let s = 0, mx = 0, outerBright = 0, outerN = 0;
  // centre column (the logo / bar / status / press stack) excluded for the raw-world test
  const cx0 = info.width * 0.25, cx1 = info.width * 0.75, cy0 = info.height * 0.28, cy1 = info.height * 0.72;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const v = data[y * info.width + x];
      s += v; if (v > mx) mx = v;
      if (!(x >= cx0 && x < cx1 && y >= cy0 && y < cy1)) { outerN++; if (v > 70) outerBright++; }
    }
  }
  return { meanLuma: +(s / data.length).toFixed(1), maxLuma: mx, outerBrightPct: +((outerBright / outerN) * 100).toFixed(2) };
}

const browser = await launchEchoes({ gpu: true, background: true });
try {
  if (legs.includes('static')) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    const held = [];
    page.on('request', (r) => {
      const u = r.url();
      if (r.resourceType() === 'script' && /(\/src\/main\.js|\/assets\/index-[^/]+\.js)(\?|$)/.test(u)) { held.push(u); return; } // never answered: no JS
      r.continue();
    });
    const t0 = Date.now();
    page.goto(`${base}/?fresh=1`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
    await sleep(2500);
    const st = await page.evaluate(() => {
      const bs = document.getElementById('boot-splash');
      const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10); };
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      return { present: !!bs, text: bs && bs.innerText.replace(/\s+/g, ' ').trim(), word: r('#boot-splash .bs-word'), bar: r('#boot-splash .bs-bar'), status: r('#boot-splash .bs-status'), sweep: bs && getComputedStyle(bs.querySelector('.bs-bar > i')).animationName, fcp: fcp && Math.round(fcp.startTime), apS: getComputedStyle(document.documentElement).getPropertyValue('--ap-s') };
    });
    await page.screenshot({ path: `captures/gntfixINT3-boot-${tag}-static.png` });
    // the sweep moves while nothing else runs: two shots 300 ms apart differ inside the bar
    const a = await page.screenshot({ clip: { x: 480, y: 440, width: 640, height: 30 } });
    await sleep(300);
    const b = await page.screenshot({ clip: { x: 480, y: 440, width: 640, height: 30 } });
    const [ra, rb] = await Promise.all([sharp(a).raw().toBuffer(), sharp(b).raw().toBuffer()]);
    let diff = 0; for (let i = 0; i < ra.length; i++) diff += Math.abs(ra[i] - rb[i]);
    out.static = { ...st, heldScripts: held.length, sweepMoves: diff > 1000, sweepDiff: diff, ms: Date.now() - t0 };
    console.log('STATIC', JSON.stringify(out.static));
    await ctx.close();
  }

  if (legs.includes('frames')) {
    out.frames = [];
    for (let rep = 0; rep < reps; rep++) {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
      const errors = []; page.on('pageerror', (e) => errors.push(String(e.message || e)));
      await page.evaluateOnNewDocument(LOGGER);
      const cdp = await page.createCDPSession();
      const frames = [];
      let t0 = 0;
      cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: Date.now() - t0, data: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* */ } });
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 40, maxWidth: 800, maxHeight: 450, everyNthFrame: 1 });
      t0 = Date.now();
      page.goto(`${base}/?fresh=1`, { waitUntil: 'load', timeout: 120000 }).catch(() => null);
      // wait for "press any key" (or 40 s)
      let readyAt = null;
      while (Date.now() - t0 < 40000) {
        let s = null;
        try { s = await page.evaluate(() => ({ label: window.__echoes && window.__echoes.app && (window.__echoes.app.focus() || {}).label, state: window.__echoes && window.__echoes.app && window.__echoes.app.state, prompt: !!document.querySelector('.ap-loading .ap-press.ap-on') })); } catch { /* nav */ }
        if (s && (s.prompt || s.label === 'Press any key or click' || s.state === 'title')) { readyAt = Date.now() - t0; break; }
        await sleep(25);
      }
      await sleep(600);
      await cdp.send('Page.stopScreencast');
      const perf = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { dcl: n && Math.round(n.domContentLoadedEventEnd), load: n && Math.round(n.loadEventEnd), fcp: fcp && Math.round(fcp.startTime) }; });
      const splash = await page.evaluate(() => (window.__echoesBootSplash ? window.__echoesBootSplash.state : null));
      const hand = await page.evaluate(() => (window.__handRects ? window.__handRects() : null));
      const domLog = await page.evaluate(() => window.__bootLog || []);
      // invariant: every rAF either has the splash fully up, or the loading screen opaque
      const uncovered = domLog.filter((r) => r.canvas && !(r.bs && r.bsOp >= 0.99) && !(r.ld && r.ldOp >= 0.99) && r.state === 'boot');
      const tl = [];
      for (const f of frames) tl.push({ t: f.t, ...(await lumaStats(f.data)) });
      const firstContent = tl.find((o) => o.maxLuma > 120);
      // the world visible outside the column BEFORE the title exists (the title
      // is drawn over the live camp by design; page clock ~ screencast clock)
      const titleRaf = domLog.find((r) => r.state === 'title');
      const titleAt = titleRaf ? titleRaf.t : Infinity;
      const coveredRaf = domLog.find((r) => r.ld && r.ldOp >= 0.99);
      const raw = tl.filter((o) => o.outerBrightPct > 3 && o.t < titleAt - 100);
      if (frames.length) {
        for (const want of [0, 1, 2, 3, 6, 10]) { const f = frames[Math.min(want, frames.length - 1)]; await sharp(Buffer.from(f.data, 'base64')).toFile(`captures/gntfixINT3-boot-${tag}-r${rep}-frame-${want}.png`); }
      }
      let deltas = null;
      if (hand) {
        deltas = {};
        for (const k of ['word', 'rule', 'bar', 'status', 'press']) {
          const a = hand.splash[k], b = hand.loading[k];
          deltas[k] = a && b ? Math.max(...a.map((v, i) => Math.abs(v - b[i]))) : null;
        }
      }
      const row = { rep, titleAt: Number.isFinite(titleAt) ? titleAt : null, loadingOpaqueAt: coveredRaf ? coveredRaf.t : null, frames: tl.length, firstFrameMs: tl[0] && tl[0].t, firstContentMs: firstContent && firstContent.t, rawWorldFrames: raw.length, rawWorldFirst: raw[0] || null, readyAt, perf, splash, handRectDeltaPx: deltas, uncoveredRafs: uncovered.length, uncoveredFirst: uncovered[0] || null, rafs: domLog.length, errors, timeline: tl.filter((_, i) => i < 12 || i % 4 === 0).slice(0, 60) };
      out.frames.push(row);
      console.log('FRAMES', JSON.stringify({ ...row, timeline: tl.slice(0, 6) }));
      await ctx.close();
    }
  }

  if (legs.includes('fail')) {
    // the game bundle fails to load: the splash must turn into an honest failure card
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', (r) => { const u = r.url(); if (r.resourceType() === 'script' && /(\/src\/main\.js|\/assets\/index-[^/]+\.js)(\?|$)/.test(u)) r.abort('failed'); else r.continue(); });
    page.goto(`${base}/?fresh=1`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
    await sleep(6500);
    const st = await page.evaluate(() => ({ splash: window.__echoesBootSplash ? window.__echoesBootSplash.state : null, text: (document.getElementById('boot-splash') || {}).innerText, focused: document.activeElement && document.activeElement.textContent }));
    await page.screenshot({ path: `captures/gntfixINT3-boot-${tag}-fail.png` });
    out.fail = st;
    console.log('FAIL', JSON.stringify(st));
    await ctx.close();
  }

  if (legs.includes('menuskip')) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', (e) => errors.push(String(e.message || e)));
    await page.evaluateOnNewDocument(LOGGER);
    const t0 = Date.now();
    await page.goto(`${base}/?fresh=1&menu=0&seed=7`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 120000 });
    await sleep(1000);
    const st = await page.evaluate(() => ({ splash: window.__echoesBootSplash ? window.__echoesBootSplash.state : null, present: !!document.getElementById('boot-splash'), state: window.__echoes.app.state, tick: window.__echoes.tick }));
    await page.screenshot({ path: `captures/gntfixINT3-boot-${tag}-menuskip.png` });
    out.menuskip = { ...st, ms: Date.now() - t0, errors };
    console.log('MENUSKIP', JSON.stringify(out.menuskip));
    await ctx.close();
  }
} catch (e) {
  out.harnessError = String((e && e.stack) || e);
  console.error('[HARNESS-ERROR]', out.harnessError);
} finally {
  await browser.close();
}
writeFileSync(`captures/gntfixINT3-boot-${tag}.json`, JSON.stringify(out, null, 1));
process.exit(out.harnessError ? 1 : 0);
