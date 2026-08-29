#!/usr/bin/env node
// Load-to-load metric sweep for the polish chain (baseline-v030 fix round 2).
//
// The reserved-band count and the cool share are COSMETIC-STREAM dependent:
// foliage placement, prop clusters and the party's idle pose all roll from the
// unseeded stream, so a single capture proves nothing. This drives one browser
// through N reloads per variant, screenshots each, and reports the analyzer's
// numbers per frame plus the WORST frame per metric — the number the gates are
// judged on.
//
// The metric code below is copied verbatim from tools/analyze.mjs so a sweep
// number and an `analyze.mjs` number on the same PNG are the same number
// (cross-checked in the fix round's verification log).
//
// Usage:
//   node tools/qp-sweep.mjs --tag base --loads 12 --variants 1,2,3
//   node tools/qp-sweep.mjs --tag x --loads 4 --urls "?variant=3&seed=22"
//   ... --clusters 4      also attribute the top danger-band cells per frame
import { mkdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = {
  tag: 'sweep', loads: 12, variants: '1,2,3', seed: '7', urls: '',
  url: 'http://127.0.0.1:5199', settle: 2600, w: 1600, h: 900, clusters: 0,
};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
opt.loads = +opt.loads; opt.clusters = +opt.clusters;

const outDir = join(root, 'captures');
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}

async function measure(file, wantClusters) {
  const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const N = W * H;
  const buckets = new Array(16).fill(0);
  let a160 = 0, a200 = 0, warm = 0, cool = 0, foliage = 0, satSum = 0, satN = 0;
  const hues = { danger: 0, heal: 0, violet: 0, amber: 0 };
  const CELL = 32;
  const cw = Math.ceil(W / CELL), chh = Math.ceil(H / CELL);
  const cells = wantClusters ? new Int32Array(cw * chh) : null;
  for (let i = 0; i < N; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
    const L = luma(r, g, b);
    buckets[Math.min(15, Math.floor(L / 16))]++;
    if (L > 160) a160++;
    if (L > 200) a200++;
    const [h, s] = hsv(r, g, b);
    if (s > 0.12) {
      satSum += s; satN++;
      if (h >= 330 || h < 60) warm++;
      else if (h >= 60 && h < 160) foliage++;
      else cool++;
      if (s > 0.35 && L > 40) {
        if (h >= 5 && h < 25) {
          hues.danger++;
          if (cells) {
            const x = i % W, y = (i / W) | 0;
            cells[((y / CELL) | 0) * cw + ((x / CELL) | 0)]++;
          }
        } else if (h >= 110 && h < 150) hues.heal++;
        else if (h >= 245 && h < 285) hues.violet++;
        else if (h >= 30 && h < 50) hues.amber++;
      }
    }
  }
  let flat = 0, blocks = 0;
  for (let by = 0; by + 8 <= H; by += 8) {
    for (let bx = 0; bx + 8 <= W; bx += 8) {
      let mnR = 255, mxR = 0, mnG = 255, mxG = 0, mnB = 255, mxB = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const i = ((by + y) * W + bx + x) * C;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r < mnR) mnR = r; if (r > mxR) mxR = r;
        if (g < mnG) mnG = g; if (g > mxG) mxG = g;
        if (b < mnB) mnB = b; if (b > mxB) mxB = b;
      }
      blocks++;
      if (mxR - mnR <= 4 && mxG - mnG <= 4 && mxB - mnB <= 4) flat++;
    }
  }
  const tot = warm + cool + foliage || 1;
  let top = [];
  if (cells) {
    top = [...cells].map((n, i) => ({ n, x: (i % cw) * CELL + CELL / 2, y: ((i / cw) | 0) * CELL + CELL / 2 }))
      .filter((c) => c.n > 0).sort((a, b) => b.n - a.n).slice(0, wantClusters);
  }
  return {
    a160: (a160 / N) * 100, a200: (a200 / N) * 100,
    buckets: buckets.filter((b) => b / N > 0.0005).length,
    warm: (warm / tot) * 100, foliage: (foliage / tot) * 100, cool: (cool / tot) * 100,
    flat: (flat / blocks) * 100, sat: satN ? satSum / satN : 0,
    danger: hues.danger, heal: hues.heal, violet: hues.violet, amber: hues.amber, top,
  };
}

const targets = opt.urls
  ? opt.urls.split(';').map((q, i) => ({ key: 'u' + i, q }))
  : opt.variants.split(',').map((v) => ({ key: 'v' + v, q: `?variant=${v}&seed=${opt.seed}` }));

const browser = await puppeteer.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage', `--window-size=${opt.w},${opt.h}`],
});
const rows = [];
let hadError = false;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: +opt.w, height: +opt.h, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { hadError = true; console.log('[PAGEERROR]', e.message); });
  for (const t of targets) {
    for (let i = 0; i < opt.loads; i++) {
      const file = join(outDir, `${opt.tag}-${t.key}-${String(i).padStart(2, '0')}.png`);
      let m = null;
      // Degenerate-frame retry: after many reloads in one browser the software
      // GL context occasionally comes back lost and the shot is a flat
      // background fill. That is a harness artefact, not a build result, so it
      // is re-taken rather than reported as a metric.
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.goto(`${opt.url}/${t.q}&nocache=${Date.now()}${i}${attempt}`, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(+opt.settle);
        await page.screenshot({ path: file });
        m = await measure(file, opt.clusters);
        if (m.buckets > 3 && m.flat < 50) break;
        console.log(`  (degenerate frame, retrying ${t.key}#${i})`);
      }
      rows.push({ file: file.replace(root + '\\', '').replace(/\\/g, '/'), key: t.key, ...m });
      console.log(
        `${t.key}#${i}  danger ${String(m.danger).padStart(5)}  cool ${m.cool.toFixed(1).padStart(5)}%  warm ${m.warm.toFixed(1).padStart(5)}%  fol ${m.foliage.toFixed(1).padStart(5)}%  ` +
        `>160 ${m.a160.toFixed(2)}%  >200 ${m.a200.toFixed(2)}%  bk ${m.buckets}  FLAT ${m.flat.toFixed(2)}%  sat ${m.sat.toFixed(2)}` +
        (m.top.length ? '  top ' + m.top.map((c) => `${c.n}@${c.x},${c.y}`).join(' ') : '')
      );
    }
  }
} catch (e) { hadError = true; console.log('[HARNESS-ERROR]', e.message); }
finally { await browser.close(); }

const worst = (f, cmp) => rows.reduce((a, b) => (cmp(f(b), f(a)) ? b : a), rows[0]);
if (rows.length) {
  const wd = worst((r) => r.danger, (a, b) => a > b);
  const wc = worst((r) => r.cool, (a, b) => a < b);
  const w160 = worst((r) => r.a160, (a, b) => a < b);
  const w200 = worst((r) => r.a200, (a, b) => a < b);
  const wbk = worst((r) => r.buckets, (a, b) => a < b);
  const wfl = worst((r) => r.flat, (a, b) => a > b);
  console.log(`\n=== WORST OF ${rows.length} frames (tag ${opt.tag})`);
  console.log(`danger  MAX ${wd.danger}  (${wd.file})            gate <500`);
  console.log(`cool    MIN ${wc.cool.toFixed(1)}%  (${wc.file})  gate >=8%`);
  console.log(`>160    MIN ${w160.a160.toFixed(2)}%  (${w160.file})  gate >=1.5%`);
  console.log(`>200    MIN ${w200.a200.toFixed(2)}%  (${w200.file})  gate >=0.4%`);
  console.log(`buckets MIN ${wbk.buckets}  (${wbk.file})           gate >=13`);
  console.log(`FLAT    MAX ${wfl.flat.toFixed(2)}%  (${wfl.file})   gate <20%`);
  const cw = rows.filter((r) => r.cool >= r.warm).length;
  console.log(`frames where cool >= warm: ${cw} (must be 0 — Act-1 stays warm-dominant)`);
}
process.exit(hadError ? 1 : 0);
