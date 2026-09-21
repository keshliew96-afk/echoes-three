#!/usr/bin/env node
// Shared browser launcher for Gauntlet probes (docs/gauntlet/PLAN.md §6.7).
// READ-ONLY for every key: import it, never edit it (it is ARCH's file).
//
//   import { launchEchoes, openEchoes, FLAGS } from './gnt-arch-browser.mjs';
//   const browser = await launchEchoes({ gpu: true, headful: false, background: true, autoplay: true });
//   const { page, errors, consoleLines } = await openEchoes(browser, 'http://127.0.0.1:5199/?menu=0&seed=7');
//
// Profiles (named in PLAN §6.7 — gates cite them by name):
//   GPU harness      gpu:true,  headful:false  (ANGLE/D3D11 on the real GPU, like tools/gpu-fps.mjs)
//                    -> fps / frame-time gates: G1.4 G1.7(>=60) G4a.8 G4b.5 G5b.8b GI.6
//   Display harness  gpu:true,  headful:true   (a visible window: rAF locked to the display refresh)
//                    -> present-cadence gates: G1.6 (V-Sync) and G1.7 (limit vs display cap)
//   Multi-page       background:true (default) — without these flags a page that is not the
//                    focused tab stops rAF and throttles timers to 1 Hz, so multi-client net and
//                    journey harnesses would measure the browser, not the game
//   Audio            autoplay:true — Web Audio runs without a gesture (headless renders to a null sink)
//
// CLI:  node tools/gnt-arch-browser.mjs rafhz [--headful] [--url U] [--ms 3000]
//       -> { rafHz, frameMsP50, frameMsP95, renderer, headful } — the display cadence a
//          V-Sync / frame-limit measurement must be interpreted against.
import puppeteer from 'puppeteer';

export const FLAGS = Object.freeze({
  base: Object.freeze(['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check']),
  gpu: Object.freeze(['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl']),
  background: Object.freeze([
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
  ]),
  autoplay: Object.freeze(['--autoplay-policy=no-user-gesture-required']),
});

export async function launchEchoes({
  gpu = true,
  headful = false,
  background = true,
  autoplay = false,
  width = 1600,
  height = 900,
  extraArgs = [],
} = {}) {
  const args = [
    ...FLAGS.base,
    ...(gpu ? FLAGS.gpu : []),
    ...(background ? FLAGS.background : []),
    ...(autoplay ? FLAGS.autoplay : []),
    `--window-size=${width},${height}`,
    ...extraArgs,
  ];
  return puppeteer.launch({
    headless: !headful,
    protocolTimeout: 300000,
    defaultViewport: headful ? null : { width, height, deviceScaleFactor: 1 },
    args,
  });
}

// Opens a page, records page errors and console lines, waits for __echoes.
export async function openEchoes(browser, url, { width = 1600, height = 900, timeout = 180000 } = {}) {
  const page = await browser.newPage();
  const errors = [];
  const consoleLines = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
  } catch {
    /* headful with defaultViewport null */
  }
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout });
  return { page, errors, consoleLines };
}

// Waits until the sim has run `minTick` ticks and the boot warm-up bay is
// empty (no shader compiles left), so cadence samples measure steady state.
export async function waitReady(page, { minTick = 240, timeout = 90000 } = {}) {
  return page.evaluate(
    async (minTick, timeout) => {
      const t0 = performance.now();
      while (performance.now() - t0 < timeout) {
        try {
          const E = window.__echoes;
          const gl = E.state().gl;
          if (E.tick >= minTick && (!gl || !gl.warmupPending)) return { ok: true, ms: Math.round(performance.now() - t0), tick: E.tick };
        } catch {
          /* booting */
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      return { ok: false, ms: timeout };
    },
    minTick,
    timeout
  );
}

// Samples requestAnimationFrame cadence for `ms` (after a 500 ms settle).
export async function measureRaf(page, ms = 3000) {
  return page.evaluate(async (ms) => {
    await new Promise((r) => setTimeout(r, 500));
    const d = [];
    let last = performance.now();
    const t0 = last;
    await new Promise((res) => {
      function f(t) {
        d.push(t - last);
        last = t;
        if (t - t0 < ms) requestAnimationFrame(f);
        else res();
      }
      requestAnimationFrame(f);
    });
    d.shift();
    const s = [...d].sort((a, b) => a - b);
    const p50 = s[Math.floor(s.length / 2)];
    const p95 = s[Math.floor(s.length * 0.95)];
    let renderer = 'n/a';
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'n/a';
    } catch {
      /* ignore */
    }
    return {
      frames: d.length,
      rafHz: Math.round((1000 / p50) * 10) / 10,
      frameMsP50: Math.round(p50 * 100) / 100,
      frameMsP95: Math.round(p95 * 100) / 100,
      renderer,
    };
  }, ms);
}

const isMain = (() => {
  try {
    return process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
  } catch {
    return false;
  }
})();

if (isMain && process.argv[2] === 'rafhz') {
  const argv = process.argv.slice(3);
  const opt = { headful: argv.includes('--headful'), url: 'http://127.0.0.1:5199/?menu=0&seed=7', ms: 3000 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url') opt.url = argv[++i];
    else if (argv[i] === '--ms') opt.ms = Number(argv[++i]);
  }
  const browser = await launchEchoes({ gpu: true, headful: opt.headful });
  try {
    const { page, errors } = await openEchoes(browser, opt.url);
    const ready = await waitReady(page);
    const r = await measureRaf(page, opt.ms);
    console.log(JSON.stringify({ ...r, headful: opt.headful, url: opt.url, ready, pageErrors: errors.length }));
  } finally {
    await browser.close();
  }
}
