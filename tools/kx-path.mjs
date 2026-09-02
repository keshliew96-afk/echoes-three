// Contrast of a VFX ribbon along its own projected centre line: A (shipped) vs
// B (same frozen frame, skillfx hidden). Reports what the shape actually adds
// to the pixels it covers, and what it is covering.
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [consoleFile, aF, bF] = process.argv.slice(2);
let payload = null;
for (const l of readFileSync(consoleFile, 'utf8').split('\n')) {
  if (!l.startsWith('[EVAL] ')) continue;
  try { const j = JSON.parse(l.slice(7)); if (j && j.arcs) payload = j; } catch {}
}
const load = async (f) => { const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { d: data, W: info.width, H: info.height, C: info.channels }; };
const A = await load(aF), B = await load(bF);
const get = (im, x, y) => { const xi = Math.round(x), yi = Math.round(y); const i = (yi * im.W + xi) * im.C; return [im.d[i], im.d[i + 1], im.d[i + 2]]; };
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
function hsv(c) { const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0]; }
payload.arcs.forEach((pts, k) => {
  console.log(`\n--- ribbon ${k}`);
  for (let i = 0; i < pts.length; i += 2) {
    const [x, y, wy] = pts[i];
    // take the best (max |dLuma|) pixel within +/-3 px perpendicular-ish window
    let best = null;
    for (let ox = -3; ox <= 3; ox++) for (let oy = -3; oy <= 3; oy++) {
      const a = get(A, x + ox, y + oy), b = get(B, x + ox, y + oy);
      const d = luma(a) - luma(b);
      if (!best || Math.abs(d) > Math.abs(best.d)) best = { a, b, d, ox, oy };
    }
    const [ha, sa] = hsv(best.a);
    console.log(`  worldY ${wy.toFixed(2)} screen(${x.toFixed(0)},${y.toFixed(0)})  under rgb ${best.b.join(',')} L${luma(best.b).toFixed(0)}  -> shipped rgb ${best.a.join(',')} L${luma(best.a).toFixed(0)} h${ha.toFixed(0)} s${sa.toFixed(2)}  dL ${best.d.toFixed(1)}`);
  }
});
