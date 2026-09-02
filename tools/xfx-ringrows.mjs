// per-angle rows for one ring: node tools/xfx-ringrows.mjs <name> <cls> [step]
import { loadPng, hsv, luma, readProbe, makeProjector, mean } from './xfx-lib.mjs';
const [name, cls, stepS] = process.argv.slice(2); const step = Number(stepS || 10);
const probe = readProbe(name, 'ringprobe'); const on = await loadPng(`captures/${name}_00.png`); const off = await loadPng(`captures/${name}_01.png`); const proj = makeProjector(probe);
const ring = probe.rings.find((r) => r.cls === cls);
for (let a = 0; a < 360; a += step) {
  const rad = a * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad); const row = [];
  for (const f of [0.57, 0.70, 0.755, 0.81, 0.93, 1.15]) { const [sx, sy] = proj(ring.wx + cs * ring.half * f, 0.012, ring.wz + sn * ring.half * f); const p = on.px(sx, sy), q = off.px(sx, sy); if (!p) { row.push('-'); continue; } const d = Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])+Math.abs(p[2]-q[2]); const [h, s] = hsv(...p); row.push(`f${f}@(${sx.toFixed(0)},${sy.toFixed(0)}) rgb(${p.join(',')}) h${h.toFixed(0)} s${s.toFixed(2)} L${luma(...p).toFixed(0)} d${d}`); }
  console.log(`a${String(a).padStart(3)}: ${row.join(' | ')}`);
}
