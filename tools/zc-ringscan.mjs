// Critic tool (Round D): per-arc identity-ring measurement.
// usage: node tools/zc-ringscan.mjs <capture-name> [--full]
// reads captures/<name>.png + captures/<name>.console.txt (ring probe JSON).
import { readFileSync } from 'fs';
import sharp from 'sharp';

const name = process.argv[2];
const full = process.argv.includes('--full');
const ACCENT = { healer: '#33513C', tank: '#6B6157', swordsman: '#6B2E3A', archer: '#6E7A3F' };

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
  return [h, mx ? d / mx : 0, mx * 255];
}
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const hexHue = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return hsv((n >> 16) & 255, (n >> 8) & 255, n & 255)[0];
};
const dh = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const circMean = (arr) => {
  let x = 0, y = 0;
  for (const h of arr) { x += Math.cos(h * Math.PI / 180); y += Math.sin(h * Math.PI / 180); }
  let m = Math.atan2(y / arr.length, x / arr.length) * 180 / Math.PI;
  return (m + 360) % 360;
};
const med = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

const log = readFileSync(`captures/${name}.console.txt`, 'latin1');
const line = log.split('\n').filter((l) => l.startsWith('[EVAL]') && l.includes('"rings"')).pop();
const probe = JSON.parse(line.slice(7));
const { data, info } = await sharp(readFileSync(`captures/${name}.png`)).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const px = (x, y) => {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return null;
  const i = (yi * W + xi) * C;
  return [data[i], data[i + 1], data[i + 2]];
};

for (const ring of probe.rings) {
  const accent = ACCENT[ring.cls];
  const aH = hexHue(accent);
  // nearest warm emitter
  let near = null, nd = 1e9;
  for (const e of probe.emitters) {
    if (!['flame', 'brazier', 'lantern'].includes(e.k)) continue;
    const d = Math.hypot(e.x - ring.wx, e.z - ring.wz);
    if (d < nd) { nd = d; near = e; }
  }
  const poolAng = near ? ((Math.atan2(near.z - ring.wz, near.x - ring.wx) * 180 / Math.PI) + 360) % 360 : null;
  const rows = [];
  for (const p of ring.pts) {
    const bs = p.band.map((c) => px(c[0], c[1])).filter(Boolean);
    if (bs.length < 3) continue;
    const bh = bs.map((c) => hsv(...c));
    const spread = Math.max(dh(bh[0][0], bh[1][0]), dh(bh[1][0], bh[2][0]), dh(bh[0][0], bh[2][0]));
    const bandRGB = bs[1];
    const [bhue, bsat, bval] = hsv(...bandRGB);
    const bl = luma(...bandRGB);
    const inks = p.ink.map((c) => px(c[0], c[1])).filter(Boolean);
    const inkL = Math.min(...inks.map((c) => luma(...c)));
    const gnds = p.gnd.map((c) => px(c[0], c[1])).filter(Boolean);
    const gL = gnds.reduce((s, c) => s + luma(...c), 0) / gnds.length;
    rows.push({ a: p.a, rgb: bandRGB, h: bhue, s: bsat, L: bl, spread, inkL, gL,
      dev: dh(bhue, aH), poolDelta: poolAng === null ? null : dh(p.a, poolAng) });
  }
  const arc = (test) => rows.filter((r) => test(r));
  const stat = (rs, label) => {
    if (!rs.length) return `${label}: (no samples)`;
    const hs = rs.map((r) => r.h);
    const mh = circMean(hs);
    const devs = rs.map((r) => r.dev);
    const rat = rs.map((r) => r.L / r.gL);
    const inkRat = rs.map((r) => r.inkL / r.gL);
    return `${label}: n=${rs.length} hue(circmean)=${mh.toFixed(1)} dev=${dh(mh, aH).toFixed(1)} devMed=${med(devs).toFixed(1)} devMax=${Math.max(...devs).toFixed(1)} sat=${med(rs.map(r=>r.s)).toFixed(2)} bandL=${med(rs.map(r=>r.L)).toFixed(0)} gndL=${med(rs.map(r=>r.gL)).toFixed(0)} band/gnd=${med(rat).toFixed(2)} inkL=${med(rs.map(r=>r.inkL)).toFixed(0)} ink/gnd=${med(inkRat).toFixed(2)}`;
  };
  console.log(`\n### ${ring.cls}  accent ${accent} h${aH.toFixed(1)}  centre (${ring.wx},${ring.wz})  nearest emitter ${near ? near.k + ' d=' + nd.toFixed(2) + ' at ang ' + poolAng.toFixed(0) : 'none'}`);
  console.log('  ' + stat(rows, 'ALL      '));
  if (poolAng !== null) {
    console.log('  ' + stat(arc((r) => r.poolDelta <= 45), 'POOL-arc '));
    console.log('  ' + stat(arc((r) => r.poolDelta >= 135), 'AWAY-arc '));
  }
  const bad = rows.filter((r) => r.h >= 5 && r.h < 25 && r.s > 0.35 && r.L > 40);
  console.log(`  reserved-band samples (h5-25,s>.35,L>40): ${bad.length}/${rows.length}${bad.length ? ' at angles ' + bad.map((r) => r.a).join(',') : ''}`);
  if (full) for (const r of rows) console.log(`   a=${String(r.a).padStart(3)} rgb ${r.rgb.join(',')} h${r.h.toFixed(1)} s${r.s.toFixed(2)} L${r.L.toFixed(0)} dev${r.dev.toFixed(1)} spread${r.spread.toFixed(0)} ink${r.inkL.toFixed(0)} gnd${r.gL.toFixed(0)} pool${r.poolDelta===null?'-':r.poolDelta.toFixed(0)}`);
}
