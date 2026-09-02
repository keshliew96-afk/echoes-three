// CRITIC probe: per-arc identity-ring measurement straight off the shipped PNG.
// Geometry comes from the scene graph (tools/kx-ring.js eval, logged into the
// capture's console.txt); colour comes from the captured pixels only.
import { readFileSync } from 'fs';
import sharp from 'sharp';

const [consoleFile, pngFile] = process.argv.slice(2);
const txt = readFileSync(consoleFile, 'utf8');
const lines = txt.split('\n').filter((l) => l.startsWith('[EVAL] '));
let data = null;
for (const l of lines) {
  try { const j = JSON.parse(l.slice(7)); if (j && j.rings) data = j; } catch {}
}
if (!data) { console.error('no ring payload'); process.exit(2); }

const { data: buf, info } = await sharp(readFileSync(pngFile)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const px = (x, y) => {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return null;
  const i = (yi * W + xi) * C;
  return [buf[i], buf[i + 1], buf[i + 2]];
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
// circular median of hues
function hueMed(hs) {
  if (!hs.length) return null;
  let bx = 0, by = 0;
  for (const h of hs) { bx += Math.cos((h * Math.PI) / 180); by += Math.sin((h * Math.PI) / 180); }
  let m = (Math.atan2(by, bx) * 180) / Math.PI; if (m < 0) m += 360;
  return m;
}
const dHue = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const ACCENT = { healer: 138.0, tank: 30.0, swordsman: 348.2, archer: 72.2 };

// piecewise-linear radius->screen map from the probe's 5 sampled fractions
const FRS = [0.40, 0.755, 0.93, 1.12, 1.25];
const KEYS = ['in', 'band', 'ink', 'g1', 'g2'];
function at(pts, fr) {
  let i = 0;
  while (i < FRS.length - 2 && fr > FRS[i + 1]) i++;
  const f0 = FRS[i], f1 = FRS[i + 1];
  const p0 = pts[KEYS[i]], p1 = pts[KEYS[i + 1]];
  const t = (fr - f0) / (f1 - f0);
  return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
}

for (const r of data.rings) {
  const poolLocal = r.nearestEmitter ? ((-r.nearestEmitter.ang % 360) + 360) % 360 : null;
  const acc = ACCENT[r.cls];
  const rows = [];
  for (const s of r.samples) {
    // band interior: fr 0.68..0.85
    const bandPx = [];
    for (let fr = 0.68; fr <= 0.85; fr += 0.02) { const p = at(s.pts, fr); const c = px(p[0], p[1]); if (c) bandPx.push(c); }
    // outer ink: fr 0.885..0.975, in fine steps to count dark px width
    const inkPx = [];
    for (let fr = 0.885; fr <= 0.985; fr += 0.005) { const p = at(s.pts, fr); const c = px(p[0], p[1]); if (c) inkPx.push({ fr, c, p }); }
    // adjacent ground fr 1.08..1.30
    const gPx = [];
    for (let fr = 1.08; fr <= 1.30; fr += 0.02) { const p = at(s.pts, fr); const c = px(p[0], p[1]); if (c) gPx.push(c); }
    if (!bandPx.length || !gPx.length) continue;
    const bh = hueMed(bandPx.map((c) => hsv(c)[0]));
    const bs = med(bandPx.map((c) => hsv(c)[1]));
    const bl = med(bandPx.map(luma));
    const gl = med(gPx.map(luma));
    // dark-rim width in SCREEN px: contiguous ink samples darker than 0.75*ground
    let inkMin = 999, runPxLen = 0, best = 0;
    for (let i = 0; i < inkPx.length; i++) {
      const L = luma(inkPx[i].c);
      if (L < inkMin) inkMin = L;
      if (L < gl * 0.75) {
        const prev = i > 0 ? inkPx[i - 1].p : inkPx[i].p;
        runPxLen += Math.hypot(inkPx[i].p[0] - prev[0], inkPx[i].p[1] - prev[1]);
        if (runPxLen > best) best = runPxLen;
      } else runPxLen = 0;
    }
    rows.push({ a: s.a, bh, bs, bl, gl, ratio: bl / gl, inkMin, rim: best });
  }
  // arcs, in ring-local angle: pool-facing = within 45 deg of poolLocal
  const arc = (centre) => rows.filter((x) => dHue(x.a, centre) <= 45);
  const summar = (rs, label) => {
    if (!rs.length) return `${label}: no samples`;
    const h = hueMed(rs.map((x) => x.bh));
    const sats = med(rs.map((x) => x.bs));
    const ratios = rs.map((x) => x.ratio).sort((a, b) => a - b);
    const rims = rs.map((x) => x.rim).sort((a, b) => a - b);
    const bad = rs.filter((x) => x.ratio < 1.6 && x.rim < 2).length;
    return `${label}: n=${rs.length} hue ${h.toFixed(1)} (d${dHue(h, acc).toFixed(1)}) sat ${sats.toFixed(2)} bandL ${med(rs.map((x) => x.bl)).toFixed(0)} groundL ${med(rs.map((x) => x.gl)).toFixed(0)} ratio med ${med(ratios).toFixed(2)} min ${ratios[0].toFixed(2)} rim med ${med(rims).toFixed(1)}px min ${rims[0].toFixed(1)}px | samples failing BOTH fallbacks: ${bad}/${rs.length}`;
  };
  console.log(`\n--- ${r.cls}  world ${r.world}  screen ${r.centre}  accent h${acc}  nearest ${r.nearestEmitter ? r.nearestEmitter.kind + ' d' + r.nearestEmitter.dist + ' worldAng' + r.nearestEmitter.ang + ' -> localAng ' + poolLocal.toFixed(0) : 'none'}`);
  console.log('  ' + summar(arc(poolLocal), 'POOL-FACING arc'));
  console.log('  ' + summar(arc((poolLocal + 180) % 360), 'AWAY arc      '));
  console.log('  ' + summar(rows, 'WHOLE ring    '));
  // worst 6 individual samples by hue delta
  const worst = [...rows].sort((a, b) => dHue(b.bh, acc) - dHue(a.bh, acc)).slice(0, 6);
  console.log('  worst hue samples: ' + worst.map((x) => `a${x.a}:${x.bh.toFixed(0)}(d${dHue(x.bh, acc).toFixed(0)},s${x.bs.toFixed(2)},L${x.bl.toFixed(0)})`).join(' '));
}
