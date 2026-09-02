// Per-arc identity-ring scan. usage: node tools/xfx-ringscan.mjs <name>
// Expects captures/<name>_00.png (rings on), captures/<name>_01.png (rings off) and the ringprobe in the console log.
// Band pixels are located GEOMETRICALLY (world annulus projected through the dumped camera) and
// validated by the on/off diff, so bodies occluding the ring are excluded rather than measured.
import { loadPng, hsv, luma, hexHue, dh, circMean, mean, median, readProbe, makeProjector } from './xfx-lib.mjs';

const name = process.argv[2];
const ACCENT = { healer: '#33513C', tank: '#6B6157', swordsman: '#6B2E3A', archer: '#6E7A3F' };
const RING = { inkInA: 0.52, inkOutA: 0.63, bandIn: 0.63, bandOut: 0.88, inkInB: 0.88, inkOutB: 0.98 };

const probe = readProbe(name, 'ringprobe');
if (!probe) { console.error('no ringprobe in log'); process.exit(2); }
const on = await loadPng(`captures/${name}_00.png`);
const off = await loadPng(`captures/${name}_01.png`);
const proj = makeProjector(probe);

console.log(`\n### ${name}  variant ${probe.variant}  enemies ${probe.enemies}  tick ${probe.tick}  party ${JSON.stringify(probe.party)}`);
for (const ring of probe.rings) {
  const aH = hexHue(ACCENT[ring.cls]);
  const c0 = proj(ring.wx, 0.012, ring.wz);
  const chkErr = Math.hypot(c0[0] - ring.chk[0], c0[1] - ring.chk[1]);
  let near = null, nd = 1e9;
  for (const e of probe.emitters) {
    if (!['flame', 'brazier', 'lantern'].includes(e.k)) continue;
    const d = Math.hypot(e.x - ring.wx, e.z - ring.wz);
    if (d < nd) { nd = d; near = e; }
  }
  const poolAng = ((Math.atan2(near.z - ring.wz, near.x - ring.wx) * 180) / Math.PI + 360) % 360;
  const arcs = { pool: [], away: [], all: [] };
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    const cs = Math.cos(rad), sn = Math.sin(rad);
    const samples = [];
    for (let f = 0.40; f <= 1.30; f += 0.004) {
      const [sx, sy] = proj(ring.wx + cs * ring.half * f, 0.012, ring.wz + sn * ring.half * f);
      const p = on.px(sx, sy), q = off.px(sx, sy);
      if (!p || !q) continue;
      const diff = Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
      samples.push({ f, sx, sy, p, q, diff });
    }
    const inB = samples.filter((s) => s.f > RING.bandIn + 0.04 && s.f < RING.bandOut - 0.04);
    const painted = inB.filter((s) => s.diff > 24);
    // Ring arc is "visible" only if the band actually paints here (not under a body).
    if (inB.length === 0 || painted.length < inB.length * 0.6) continue;
    const ground = samples.filter((s) => s.f > 1.06 && s.f < 1.26 && s.diff < 12);
    if (ground.length < 5) continue;
    const gL = mean(ground.map((s) => luma(...s.p)));
    const bL = mean(painted.map((s) => luma(...s.p)));
    const bH = painted.map((s) => hsv(...s.p)).filter((v) => v[1] > 0.08).map((v) => v[0]);
    const bS = mean(painted.map((s) => hsv(...s.p)[1]));
    // dark rim: contiguous outer-ink samples darker than 0.8x ground luma; length in screen px.
    const outer = samples.filter((s) => s.f > RING.inkInB - 0.03 && s.f < RING.inkOutB + 0.06);
    let best = 0, run = [];
    for (const s of outer) {
      if (luma(...s.p) < gL * 0.8 && s.diff > 12) run.push(s);
      else { if (run.length > 1) best = Math.max(best, Math.hypot(run[0].sx - run[run.length - 1].sx, run[0].sy - run[run.length - 1].sy)); run = []; }
    }
    if (run.length > 1) best = Math.max(best, Math.hypot(run[0].sx - run[run.length - 1].sx, run[0].sy - run[run.length - 1].sy));
    const rimL = outer.length ? Math.min(...outer.map((s) => luma(...s.p))) : NaN;
    const rec = { a, hue: bH.length ? circMean(bH) : NaN, sat: bS, bL, gL, ratio: bL / gL, rimPx: best, rimL, danger: painted.filter((s) => { const [h, sv] = hsv(...s.p); return sv > 0.35 && luma(...s.p) > 40 && h >= 5 && h < 25; }).length, n: painted.length };
    arcs.all.push(rec);
    if (dh(a, poolAng) <= 50) arcs.pool.push(rec);
    else if (dh(a, poolAng) >= 130) arcs.away.push(rec);
  }
  const summ = (rs) => {
    if (!rs.length) return 'n/a (no visible arc)';
    const hues = rs.map((r) => r.hue).filter((h) => !isNaN(h));
    const h = circMean(hues);
    const rimOk = rs.filter((r) => r.rimPx >= 2).length; const legible = rs.filter((r) => r.ratio >= 1.6 || r.rimPx >= 2).length;
    return `hue ${h.toFixed(1)} (d ${dh(h, aH).toFixed(1)}; per-angle range d ${Math.min(...hues.map((x) => dh(x, aH))).toFixed(1)}-${Math.max(...hues.map((x) => dh(x, aH))).toFixed(1)}) sat ${mean(rs.map((r) => r.sat)).toFixed(2)} bandL ${mean(rs.map((r) => r.bL)).toFixed(0)} groundL ${mean(rs.map((r) => r.gL)).toFixed(0)} ratio ${mean(rs.map((r) => r.ratio)).toFixed(2)} rim median ${median(rs.map((r) => r.rimPx)).toFixed(1)}px min ${Math.min(...rs.map((r) => r.rimPx)).toFixed(1)}px (>=2px on ${rimOk}/${rs.length} angles; rim min luma ${median(rs.map((r) => r.rimL)).toFixed(0)}) dangerPx ${rs.reduce((s, r) => s + r.danger, 0)}/${rs.reduce((s, r) => s + r.n, 0)} angles ${rs.length} LEGIBLE(ratio>=1.6 OR rim>=2px) ${legible}/${rs.length}`;
  };
  console.log(`\n${ring.cls.padEnd(9)} accent ${ACCENT[ring.cls]} h${aH.toFixed(1)}  authored band ${ring.core}  centre px (${c0[0].toFixed(0)},${c0[1].toFixed(0)}) [proj check err ${chkErr.toFixed(2)}px]  nearest warm ${near.k} @ ${nd.toFixed(2)}u dir ${poolAng.toFixed(0)}deg`);
  console.log(`  POOL arc : ${summ(arcs.pool)}`);
  console.log(`  AWAY arc : ${summ(arcs.away)}`);
  console.log(`  ALL      : ${summ(arcs.all)}`);
}
