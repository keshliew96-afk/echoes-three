// CRITIC probe #2 — per-arc identity-ring measurement by A/B mask.
//   mask  = pixels that change when ONLY the ring band meshes are hidden,
//           measured with bloom OFF so the diff is local (bloom is global).
//   colour = read from the SHIPPED frame (bloom on) at those pixels.
// Occluded arcs contribute nothing instead of contributing the occluder.
import { readFileSync } from 'fs';
import sharp from 'sharp';

const [consoleFile, aFile, anbFile, bnbFile, only] = process.argv.slice(2);
const txt = readFileSync(consoleFile, 'utf8');
let geo = null;
for (const l of txt.split('\n')) {
  if (!l.startsWith('[EVAL] ')) continue;
  try { const j = JSON.parse(l.slice(7)); if (j && j.rings) geo = j; } catch {}
}
if (!geo) { console.error('no ring payload'); process.exit(2); }
const load = async (f) => {
  const { data, info } = await sharp(readFileSync(f)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, W: info.width, H: info.height, C: info.channels };
};
const A = await load(aFile), ANB = await load(anbFile), BNB = await load(bnbFile);
const at = (im, x, y) => {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= im.W || yi >= im.H) return null;
  const i = (yi * im.W + xi) * im.C;
  return [im.d[i], im.d[i + 1], im.d[i + 2]];
};
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
function hsv(c) {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx * 255];
}
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const hueMed = (hs) => { if (!hs.length) return null; let bx = 0, by = 0; for (const h of hs) { bx += Math.cos(h * Math.PI / 180); by += Math.sin(h * Math.PI / 180); } let m = Math.atan2(by, bx) * 180 / Math.PI; return m < 0 ? m + 360 : m; };
const dHue = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const ACCENT = { healer: 138.0, tank: 30.0, swordsman: 348.2, archer: 72.2 };
const FRS = [0.50, 0.63, 0.755, 0.88, 0.93, 0.98, 1.12, 1.25, 1.40];
const KEYS = ['f050', 'f063', 'f0755', 'f088', 'f093', 'f098', 'f112', 'f125', 'f140'];
function pt(pts, fr) {
  let i = 0; while (i < FRS.length - 2 && fr > FRS[i + 1]) i++;
  const t = (fr - FRS[i]) / (FRS[i + 1] - FRS[i]);
  const p0 = pts[KEYS[i]], p1 = pts[KEYS[i + 1]];
  return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
}
const changed = (x, y) => {
  const a = at(ANB, x, y), b = at(BNB, x, y);
  if (!a || !b) return 0;
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
};

for (const r of geo.rings) {
  if (only && r.cls !== only) continue;
  const acc = ACCENT[r.cls];
  const poolLocal = r.nearestEmitter ? ((-r.nearestEmitter.ang % 360) + 360) % 360 : 0;
  const rows = [];
  for (const s of r.samples) {
    // ground first (never sample the band's own AA), so the dark-rim test is
    // RELATIVE to the ground it must read against.
    const grd = [];
    for (let fr = 1.06; fr <= 1.32; fr += 0.01) {
      const p = pt(s.pts, fr);
      if (changed(p[0], p[1]) > 8) continue;
      const c = at(A, p[0], p[1]);
      if (c) grd.push(c);
    }
    if (grd.length < 5) continue;
    const gl = med(grd.map(luma));
    const bandC = [], inkL = [];
    let inkRun = 0, inkBest = 0, prev = null;
    for (let fr = 0.60; fr <= 1.04; fr += 0.004) {
      const p = pt(s.pts, fr);
      const ch = changed(p[0], p[1]);
      const c = at(A, p[0], p[1]);
      if (!c) { prev = p; continue; }
      const L = luma(c);
      if (ch > 8) {
        if (fr >= 0.66 && fr <= 0.85) bandC.push({ c, ch });
        if (fr >= 0.90) inkL.push(L);
      }
      if (fr >= 0.88) {
        if (ch > 8 && L < gl * 0.75) { if (prev) inkRun += Math.hypot(p[0] - prev[0], p[1] - prev[1]); if (inkRun > inkBest) inkBest = inkRun; }
        else inkRun = 0;
      }
      prev = p;
    }
    // Keep only BAND-DOMINATED pixels: the A/B delta is the band's coverage in
    // that pixel, so a silhouette-edge blend (low delta) is not the band.
    const dmax = bandC.length ? Math.max(...bandC.map((x) => x.ch)) : 0;
    const core = bandC.filter((x) => x.ch >= Math.max(40, 0.85 * dmax)).map((x) => x.c);
    if (core.length < 3 || inkL.length < 4 || dmax < 40) continue; // occluded arc: no verdict
    const bl = med(core.map(luma));
    rows.push({
      a: s.a, n: core.length,
      h: hueMed(core.map((c) => hsv(c)[0])), s: med(core.map((c) => hsv(c)[1])),
      bl, gl, ratio: bl / gl, ink: inkL.length ? Math.min(...inkL) : null, rim: inkBest,
      gh: hueMed(grd.map((c) => hsv(c)[0])),
    });
  }
  const near = (c) => rows.filter((x) => dHue(x.a, c) <= 45);
  const rep = (rs, label) => {
    if (!rs.length) { console.log(`  ${label}: NO unoccluded samples`); return; }
    const h = hueMed(rs.map((x) => x.h));
    const fails = rs.filter((x) => x.ratio < 1.6 && x.rim < 2);
    console.log(`  ${label}: n=${rs.length}  hue ${h.toFixed(1)} (d${dHue(h, acc).toFixed(1)})  sat ${med(rs.map((x) => x.s)).toFixed(2)}  bandL ${med(rs.map((x) => x.bl)).toFixed(0)}  groundL ${med(rs.map((x) => x.gl)).toFixed(0)}  ratio med ${med(rs.map((x) => x.ratio)).toFixed(2)} min ${Math.min(...rs.map((x) => x.ratio)).toFixed(2)}  rim med ${med(rs.map((x) => x.rim)).toFixed(1)}px  inkL med ${med(rs.map((x) => x.ink ?? 999)).toFixed(0)}  |  samples failing BOTH §17 fallbacks: ${fails.length}`);
    const worst = [...rs].sort((a, b) => dHue(b.h, acc) - dHue(a.h, acc))[0];
    console.log(`     worst-hue sample a${worst.a}: h${worst.h.toFixed(1)} (d${dHue(worst.h, acc).toFixed(1)}) s${worst.s.toFixed(2)} L${worst.bl.toFixed(0)} ratio ${worst.ratio.toFixed(2)} rim ${worst.rim.toFixed(1)}px`);
  };
  console.log(`\n--- ${r.cls}  world ${r.world}  screen ${r.centre}  accent h${acc}  nearest ${r.nearestEmitter ? r.nearestEmitter.kind + ' d' + r.nearestEmitter.dist : 'none'} -> pool arc centred on localAng ${poolLocal.toFixed(0)}`);
  // full sector sweep: 8 x 45deg, so no arc can hide
  const sect = [];
  for (let c0 = 0; c0 < 360; c0 += 45) {
    const rs = rows.filter((x) => { const d = Math.abs(x.a - (c0 + 22.5)) % 360; return (d > 180 ? 360 - d : d) <= 22.5; });
    if (!rs.length) { sect.push(`${c0}-${c0 + 45}:occl`); continue; }
    const h = hueMed(rs.map((x) => x.h));
    sect.push(`${c0}-${c0 + 45}:h${h.toFixed(0)}/d${dHue(h, acc).toFixed(0)}/n${rs.length}`);
  }
  console.log('  SECTORS(local deg) ' + sect.join('  '));
  rep(near(poolLocal), 'POOL-FACING arc');
  rep(near((poolLocal + 180) % 360), 'AWAY arc       ');
  rep(rows, 'WHOLE ring     ');
}
