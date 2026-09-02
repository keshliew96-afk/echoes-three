import { readFileSync } from 'fs';
import sharp from 'sharp';
const [consoleFile, aFile, anbFile, bnbFile, cls, angList] = process.argv.slice(2);
let geo = null;
for (const l of readFileSync(consoleFile, 'utf8').split('\n')) {
  if (!l.startsWith('[EVAL] ')) continue;
  try { const j = JSON.parse(l.slice(7)); if (j && j.rings) geo = j; } catch {}
}
const load = async (f) => { const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { d: data, W: info.width, H: info.height, C: info.channels }; };
const A = await load(aFile), ANB = await load(anbFile), BNB = await load(bnbFile);
const at = (im, x, y) => { const xi = Math.round(x), yi = Math.round(y); if (xi < 0 || yi < 0 || xi >= im.W || yi >= im.H) return null; const i = (yi * im.W + xi) * im.C; return [im.d[i], im.d[i + 1], im.d[i + 2]]; };
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
function hsv(c) { const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0]; }
const FRS = [0.50, 0.63, 0.755, 0.88, 0.93, 0.98, 1.12, 1.25, 1.40];
const KEYS = ['f050', 'f063', 'f0755', 'f088', 'f093', 'f098', 'f112', 'f125', 'f140'];
function pt(pts, fr) { let i = 0; while (i < FRS.length - 2 && fr > FRS[i + 1]) i++; const t = (fr - FRS[i]) / (FRS[i + 1] - FRS[i]); const p0 = pts[KEYS[i]], p1 = pts[KEYS[i + 1]]; return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]; }
const r = geo.rings.find((x) => x.cls === cls);
for (const a of angList.split(',').map(Number)) {
  const s = r.samples.find((x) => x.a === a);
  console.log(`\n== ${cls} local angle ${a}`);
  for (let fr = 0.60; fr <= 1.34; fr += 0.02) {
    const p = pt(s.pts, fr);
    const c = at(A, p[0], p[1]), b = at(ANB, p[0], p[1]), n = at(BNB, p[0], p[1]);
    const ch = Math.max(Math.abs(b[0] - n[0]), Math.abs(b[1] - n[1]), Math.abs(b[2] - n[2]));
    const [h, sat] = hsv(c);
    console.log(`  fr ${fr.toFixed(2)} (${p[0].toFixed(0)},${p[1].toFixed(0)}) rgb ${String(c[0]).padStart(3)},${String(c[1]).padStart(3)},${String(c[2]).padStart(3)}  L ${luma(c).toFixed(0).padStart(3)}  h ${h.toFixed(0).padStart(3)} s ${sat.toFixed(2)}  band-delta ${String(ch).padStart(3)}`);
  }
}
