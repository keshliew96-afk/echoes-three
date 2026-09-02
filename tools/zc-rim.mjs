// Round D critic: radial profile of an identity ring -> outer dark-rim width in
// screen px and its luma vs the ground just outside, per arc.
// usage: node tools/zc-rim.mjs <captureName> [angleStep]
import { readFileSync } from 'fs';
import sharp from 'sharp';
const name = process.argv[2];
const ACCENT = { healer: '#33513C', tank: '#6B6157', swordsman: '#6B2E3A', archer: '#6E7A3F' };
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const log = readFileSync(`captures/${name}.console.txt`, 'latin1');
const probe = JSON.parse(log.split('\n').filter((l) => l.startsWith('[EVAL]') && l.includes('raysOf')).pop().slice(7));
const { data, info } = await sharp(readFileSync(`captures/${name}.png`)).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const px = (x, y) => { const xi = Math.round(x), yi = Math.round(y); if (xi < 0 || yi < 0 || xi >= W || yi >= H) return null; const i = (yi * W + xi) * C; return [data[i], data[i + 1], data[i + 2]]; };
for (const ring of probe.raysOf) {
  let near = null, nd = 1e9;
  for (const e of probe.emitters) { if (!['flame', 'brazier', 'lantern'].includes(e.k)) continue; const d = Math.hypot(e.x - ring.wx, e.z - ring.wz); if (d < nd) { nd = d; near = e; } }
  const poolAng = near ? ((Math.atan2(near.z - ring.wz, near.x - ring.wx) * 180 / Math.PI) + 360) % 360 : null;
  console.log(`\n### ${ring.cls} centre(${ring.wx},${ring.wz}) pool ang ${poolAng === null ? '-' : poolAng.toFixed(0)} (${near ? near.k : ''} d${nd.toFixed(2)})`);
  for (const ray of ring.rays) {
    const dd = poolAng === null ? 999 : Math.min(Math.abs(ray.a - poolAng), 360 - Math.abs(ray.a - poolAng));
    const tag = dd <= 30 ? 'POOL' : dd >= 150 ? 'AWAY' : null;
    if (!tag) continue;
    // ground = mean luma of the outermost 8 samples (f 1.15-1.25)
    const samples = ray.pts.map((p, i) => ({ i, f: ray.rs[i], c: px(p[0], p[1]), d: i ? Math.hypot(p[0] - ray.pts[i - 1][0], p[1] - ray.pts[i - 1][1]) : 0 })).filter((s) => s.c);
    const outer = samples.filter((s) => s.f >= 1.13);
    const gL = outer.reduce((t, s) => t + luma(...s.c), 0) / (outer.length || 1);
    // dark-rim run: consecutive samples in f 0.80..1.10 whose luma < 0.6*gL
    let best = null, cur = null;
    for (const s of samples) {
      if (s.f < 0.78 || s.f > 1.12) continue;
      if (luma(...s.c) < 0.6 * gL) { cur = cur || { from: s.f, px: 0, minL: 999 }; cur.px += s.d; cur.to = s.f; cur.minL = Math.min(cur.minL, luma(...s.c)); }
      else if (cur) { if (!best || cur.px > best.px) best = cur; cur = null; }
    }
    if (cur && (!best || cur.px > best.px)) best = cur;
    const peak = samples.filter((s) => s.f >= 0.55 && s.f <= 0.95).reduce((m, s) => (luma(...s.c) > (m ? luma(...m.c) : -1) ? s : m), null);
    console.log(`  a=${String(ray.a).padStart(3)} ${tag} gndL=${gL.toFixed(0)} bandPeakL=${peak ? luma(...peak.c).toFixed(0) : '--'} band/gnd=${peak ? (luma(...peak.c) / gL).toFixed(2) : '--'} darkRim=${best ? best.px.toFixed(1) + 'px (f' + best.from + '-' + best.to + ') minL=' + best.minL.toFixed(0) + ' rim/gnd=' + (best.minL / gL).toFixed(2) : 'NONE'}`);
  }
}
