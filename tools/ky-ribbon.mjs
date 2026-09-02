// Cross-section of the Guardian Bond ribbon, A (shipped) vs B (skillfx hidden).
// Walks the arcCore's CENTRE line (the mean of its two rails) and reports, per
// sample: the pixel the ribbon covers in B ("under"), the core pixel at the
// centre in A, and the darkest pixel within +/-9 px (the Void Charcoal rim).
import { readFileSync } from 'fs';
import sharp from 'sharp';
const [consoleFile, aF, bF] = process.argv.slice(2);
let payload = null;
for (const l of readFileSync(consoleFile, 'latin1').split('\n')) {
  if (!l.startsWith('[EVAL] ')) continue;
  try { const j = JSON.parse(l.slice(7)); if (j && j.mid) payload = j; } catch {}
}
const load = async (f) => { const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { d: data, W: info.width, H: info.height, C: info.channels }; };
const A = await load(aF), B = await load(bF);
const get = (im, x, y) => { const xi = Math.round(x), yi = Math.round(y); if (xi < 0 || yi < 0 || xi >= im.W || yi >= im.H) return [0, 0, 0]; const i = (yi * im.W + xi) * im.C; return [im.d[i], im.d[i + 1], im.d[i + 2]]; };
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
function hsv(c) { const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0]; }
let nCore = 0, satOk = 0, hueOk = 0, rimOk = 0, nRim = 0;
payload.mid.forEach((pts, k) => {
  console.log(`\n--- ribbon ${k} (centre line, n=${pts.length})`);
  for (let i = 0; i < pts.length; i++) {
    const [x, y, wy] = pts[i];
    const core = get(A, x, y);
    const under = get(B, x, y);
    const [ch, cs] = hsv(core);
    // darkest A pixel in the lateral neighbourhood = the ink rim
    let rim = null;
    for (let ox = -9; ox <= 9; ox++) for (let oy = -9; oy <= 9; oy++) {
      if (Math.hypot(ox, oy) < 4 || Math.hypot(ox, oy) > 9) continue;
      const p = get(A, x + ox, y + oy);
      if (!rim || luma(p) < luma(rim)) rim = p;
    }
    nCore++;
    if (cs >= 0.3) satOk++;
    let dh = Math.abs(ch - 128.8) % 360; if (dh > 180) dh = 360 - dh;
    if (dh <= 20) hueOk++;
    nRim++;
    if (luma(rim) < luma(under) * 0.85) rimOk++;
    console.log(`  y${wy.toFixed(2)} (${x.toFixed(0)},${y.toFixed(0)})  under ${under.join(',')} L${luma(under).toFixed(0)} | CORE ${core.join(',')} h${ch.toFixed(0)} s${cs.toFixed(2)} L${luma(core).toFixed(0)} | rim ${rim.join(',')} L${luma(rim).toFixed(0)}`);
  }
});
console.log(`\nSUMMARY  core sat>=0.30: ${satOk}/${nCore}   core hue within 20 deg of Bright Heal: ${hueOk}/${nCore}   rim <0.85x the covered pixel: ${rimOk}/${nRim}`);
