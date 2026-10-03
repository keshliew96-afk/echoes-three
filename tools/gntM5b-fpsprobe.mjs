#!/usr/bin/env node
// gntM5b — fps isolation probe: N single-player pages, each in its OWN
// browser process (GPU harness) vs one browser. Measures whether two
// rendering pages on this machine contend per browser or per GPU.
//   node tools/gntM5b-fpsprobe.mjs [--pages 2] [--browsers 2] [--w 1600 --h 900] [--seconds 10]
import { launchEchoes } from './gnt-arch-browser.mjs';
import { openEchoesWindow } from './gntM5a-botlib.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const N = Number(arg('pages', 2)); const B = Number(arg('browsers', 2)); const W = Number(arg('w', 1600)); const H = Number(arg('h', 900)); const S = Number(arg('seconds', 10));
const browsers = [];
try {
  for (let i = 0; i < B; i++) browsers.push(await launchEchoes({ gpu: true, background: true, width: W, height: H }));
  const pages = [];
  for (let i = 0; i < N; i++) pages.push(await openEchoesWindow(browsers[i % B], `http://127.0.0.1:5199/?menu=0&seed=${7 + i}`, { width: W, height: H }));
  await new Promise((r) => setTimeout(r, 6000));
  for (const p of pages) await p.page.evaluate(() => { window.__echoes.cmd('startRun', { act: 1 }); window.__echoes.cmd('autopilot', true); });
  await new Promise((r) => setTimeout(r, 3000));
  const res = await Promise.all(pages.map((p) => p.page.evaluate((ms) => new Promise((res) => { const d = []; let last = performance.now(); const t0 = last; (function f(t) { d.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else { d.shift(); const tot = d.reduce((a, b) => a + b, 0); const s = [...d].sort((a, b) => a - b); res({ fps: +(d.length / tot * 1000).toFixed(1), p5: +(1000 / s[Math.floor(s.length * 0.95)]).toFixed(1), over50: d.filter((x) => x > 50).length }); } })(performance.now()); }), S * 1000)));
  console.log(JSON.stringify({ pages: N, browsers: B, w: W, h: H, res }));
} finally { for (const b of browsers) await b.close(); }
