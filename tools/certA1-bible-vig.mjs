#!/usr/bin/env node
// certA1-bible: vignette probe. Mean luma of concentric rectangular rings from the frame edge inward
// (ring k = pixels whose distance to the nearest edge is in [k*t,(k+1)*t)), plus per-edge strips so a
// bright object on one side can be separated from the vignette falloff. Usage: vig.mjs <png...> [--t 30] [--rings 6]
import { readFileSync } from 'fs';
import sharp from 'sharp';
const args = process.argv.slice(2); let t = 30, rings = 6; const files = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '--t') t = Number(args[++i]); else if (args[i] === '--rings') rings = Number(args[++i]); else files.push(args[i]); }
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
for (const f of files) {
  const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const sum = new Array(rings + 1).fill(0), n = new Array(rings + 1).fill(0);
  const edge = { L: [], R: [], T: [], B: [] }; for (const k of Object.keys(edge)) { edge[k] = { s: new Array(rings).fill(0), n: new Array(rings).fill(0) }; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * C; const L = luma(data[o], data[o + 1], data[o + 2]);
    const d = Math.min(x, y, W - 1 - x, H - 1 - y); const k = Math.min(rings, Math.floor(d / t)); sum[k] += L; n[k]++;
    // per-edge strips: only the middle 60% of each edge so corners don't double count
    if (x < rings * t && y > H * 0.2 && y < H * 0.8) { const kk = Math.floor(x / t); edge.L.s[kk] += L; edge.L.n[kk]++; }
    if (x >= W - rings * t && y > H * 0.2 && y < H * 0.8) { const kk = Math.floor((W - 1 - x) / t); edge.R.s[kk] += L; edge.R.n[kk]++; }
    if (y < rings * t && x > W * 0.2 && x < W * 0.8) { const kk = Math.floor(y / t); edge.T.s[kk] += L; edge.T.n[kk]++; }
    if (y >= H - rings * t && x > W * 0.2 && x < W * 0.8) { const kk = Math.floor((H - 1 - y) / t); edge.B.s[kk] += L; edge.B.n[kk]++; }
  }
  console.log(`${f}: rings(${t}px from edge -> interior) ` + sum.map((s, k) => (s / n[k]).toFixed(1)).join(' | '));
  for (const k of ['L', 'R', 'T', 'B']) console.log(`   edge ${k}: ` + edge[k].s.map((s, i) => (s / (edge[k].n[i] || 1)).toFixed(1)).join(' > '));
}
