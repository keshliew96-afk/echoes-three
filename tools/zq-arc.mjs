#!/usr/bin/env node
// Angular scan of a ring: for each degree (0 = 12 o'clock, increasing = clockwise
// on screen), report whether a Parchment-ish bright pixel exists in [r0,r1].
// Usage: node tools/zq-arc.mjs <cx> <cy> <r0> <r1> <png...>
import sharp from 'sharp';
const [cxs, cys, r0s, r1s, ...files] = process.argv.slice(2);
const cx = +cxs, cy = +cys, r0 = +r0s, r1 = +r1s;
for (const f of files) {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const hit = [];
  for (let a = 0; a < 360; a++) {
    const rad = (a - 90) * Math.PI / 180; // 0 deg = up, clockwise
    let on = false;
    for (let r = r0; r <= r1; r += 0.5) {
      const x = Math.round(cx + Math.cos(rad) * r), y = Math.round(cy + Math.sin(rad) * r);
      if (x < 0 || y < 0 || x >= info.width || y >= info.height) continue;
      const i = (y * info.width + x) * ch;
      const R = data[i], G = data[i + 1], B = data[i + 2];
      // Parchment #F4EFE6 -> bright, near-neutral, slightly warm
      if (R > 195 && G > 190 && B > 180 && Math.max(R, G, B) - Math.min(R, G, B) < 40) { on = true; break; }
    }
    hit.push(on ? 1 : 0);
  }
  // find contiguous runs (wrapping)
  const runs = [];
  let s = -1;
  for (let a = 0; a < 720; a++) {
    const v = hit[a % 360];
    if (v && s < 0) s = a;
    if (!v && s >= 0) { if (a - s > 3) runs.push([s % 360, (a - 1) % 360, a - s]); s = -1; }
  }
  const total = hit.reduce((a, b) => a + b, 0);
  console.log(`${f}: filledDeg=${total} runs=${JSON.stringify(runs.slice(0, 4))}`);
}
