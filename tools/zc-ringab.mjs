// Round D critic: identity-ring per-arc measurement with A/B occlusion masking.
// frame _00 = shipped, frame _01 = same frozen frame with ring meshes hidden.
// A band sample counts only where the two frames differ (i.e. the ring really
// paints that pixel) -> body/grass occlusion can never masquerade as the band.
// usage: node tools/zc-ringab.mjs <seqName> [--full]
import { readFileSync } from 'fs';
import sharp from 'sharp';
const name = process.argv[2];
const full = process.argv.includes('--full');
const ACCENT = { healer: '#33513C', tank: '#6B6157', swordsman: '#6B2E3A', archer: '#6E7A3F' };
function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx * 255];
}
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const hexHue = (hex) => { const n = parseInt(hex.slice(1), 16); return hsv((n >> 16) & 255, (n >> 8) & 255, n & 255)[0]; };
const dh = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const circMean = (arr) => { let x = 0, y = 0; for (const h of arr) { x += Math.cos(h * Math.PI / 180); y += Math.sin(h * Math.PI / 180); } return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360; };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const log = readFileSync(`captures/${name}.console.txt`, 'latin1');
const probe = JSON.parse(log.split('\n').filter((l) => l.startsWith('[EVAL]') && l.includes('"rings"')).pop().slice(7));
const load = async (f) => { const { data, info } = await sharp(readFileSync(f)).raw().toBuffer({ resolveWithObject: true }); return { data, W: info.width, H: info.height, C: info.channels }; };
const A = await load(`captures/${name}_00.png`);
const B = await load(`captures/${name}_01.png`);
const px = (im, x, y) => { const xi = Math.round(x), yi = Math.round(y); if (xi < 0 || yi < 0 || xi >= im.W || yi >= im.H) return null; const i = (yi * im.W + xi) * im.C; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };
const diff = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
for (const ring of probe.rings) {
  const accent = ACCENT[ring.cls], aH = hexHue(accent);
  let near = null, nd = 1e9;
  for (const e of probe.emitters) { if (!['flame', 'brazier', 'lantern'].includes(e.k)) continue; const d = Math.hypot(e.x - ring.wx, e.z - ring.wz); if (d < nd) { nd = d; near = e; } }
  const poolAng = near ? ((Math.atan2(near.z - ring.wz, near.x - ring.wx) * 180 / Math.PI) + 360) % 360 : null;
  const rows = [];
  for (const p of ring.pts) {
    // band: pick the radial sample with the largest A-vs-B difference (the most
    // certainly-ring pixel on this ray); require a real difference.
    let best = null;
    for (const c of p.band) { const a = px(A, ...c), b = px(B, ...c); if (!a || !b) continue; const d = diff(a, b); if (!best || d > best.d) best = { d, a, b }; }
    if (!best) continue;
    const visible = best.d > 30;
    const [h, s, v] = hsv(...best.a);
    const L = luma(...best.a);
    // ground: the A/B-unchanged ground just outside the ring
    const gs = p.gnd.map((c) => ({ a: px(A, ...c), b: px(B, ...c) })).filter((o) => o.a && o.b && diff(o.a, o.b) < 12);
    const gL = gs.length ? gs.reduce((t, o) => t + luma(...o.a), 0) / gs.length : NaN;
    // ink: darkest of the outer-stroke samples, and only where A/B differ there
    const ik = p.ink.map((c) => ({ a: px(A, ...c), b: px(B, ...c) })).filter((o) => o.a && o.b && diff(o.a, o.b) > 30);
    const inkL = ik.length ? Math.min(...ik.map((o) => luma(...o.a))) : NaN;
    rows.push({ a: p.a, rgb: best.a, base: best.b, d: best.d, visible, h, s, L, gL, inkL, dev: dh(h, aH), pd: poolAng === null ? null : dh(p.a, poolAng) });
  }
  const stat = (rs, label) => {
    const vis = rs.filter((r) => r.visible);
    if (!vis.length) return `${label} n=0 (fully occluded)`;
    const mh = circMean(vis.map((r) => r.h));
    const rat = vis.filter((r) => !isNaN(r.gL)).map((r) => r.L / r.gL);
    const ink = vis.filter((r) => !isNaN(r.inkL) && !isNaN(r.gL));
    return `${label} vis=${vis.length}/${rs.length} hue=${mh.toFixed(1)} dev=${dh(mh, aH).toFixed(1)} devMed=${med(vis.map((r) => r.dev)).toFixed(1)} devMax=${Math.max(...vis.map((r) => r.dev)).toFixed(1)} sat=${med(vis.map((r) => r.s)).toFixed(2)} bandL=${med(vis.map((r) => r.L)).toFixed(0)} gndL=${med(vis.map((r) => r.gL)).toFixed(0)} band/gnd=${med(rat).toFixed(2)} inkL=${med(ink.map((r) => r.inkL)).toFixed(0)} ink/gnd=${med(ink.map((r) => r.inkL / r.gL)).toFixed(2)}`;
  };
  console.log(`\n### ${ring.cls} accent ${accent} h${aH.toFixed(1)} centre(${ring.wx},${ring.wz}) pool=${near ? near.k + ' d' + nd.toFixed(2) + ' ang' + poolAng.toFixed(0) : 'none'}`);
  console.log('  ' + stat(rows, 'ALL     '));
  if (poolAng !== null) { console.log('  ' + stat(rows.filter((r) => r.pd <= 45), 'POOL±45 ')); console.log('  ' + stat(rows.filter((r) => r.pd >= 135), 'AWAY±45 ')); }
  const bad = rows.filter((r) => r.visible && r.h >= 5 && r.h < 25 && r.s > 0.35 && r.L > 40);
  console.log(`  reserved h5-25 samples: ${bad.length}${bad.length ? ' @ ' + bad.map((r) => r.a).join(',') : ''}`);
  if (full) for (const r of rows) console.log(`   a=${String(r.a).padStart(3)} ${r.visible ? 'VIS' : 'occ'} d=${String(r.d).padStart(3)} rgb ${r.rgb.join(',')} h${r.h.toFixed(1)} s${r.s.toFixed(2)} L${r.L.toFixed(0)} dev${r.dev.toFixed(1)} gnd${isNaN(r.gL) ? '--' : r.gL.toFixed(0)} ink${isNaN(r.inkL) ? '--' : r.inkL.toFixed(0)} pool${r.pd === null ? '-' : r.pd.toFixed(0)}`);
}
