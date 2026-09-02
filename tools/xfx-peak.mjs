// peak hue of an effect: node tools/xfx-peak.mjs <name> x,y,w,h  (A/B changed px only)
import { loadPng, hsv, luma, circMean, mean } from './xfx-lib.mjs';
const [name, box] = process.argv.slice(2); const [bx, by, bw, bh] = box.split(',').map(Number);
const on = await loadPng(`captures/${name}_00.png`), off = await loadPng(`captures/${name}_01.png`);
const px = [];
for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) { const p = on.px(x, y), q = off.px(x, y); const d = Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])+Math.abs(p[2]-q[2]); if (d > 24) { const [h, s] = hsv(...p); px.push({ x, y, p, h, s, L: luma(...p) }); } }
px.sort((a, b) => b.L - a.L);
const top = px.slice(0, 30);
const sat = px.filter((v) => v.s > 0.3).sort((a, b) => b.s - a.s).slice(0, 30);
console.log(`${name}: effect px ${px.length}; brightest 30: hue ${circMean(top.map((v) => v.h)).toFixed(1)} sat ${mean(top.map((v) => v.s)).toFixed(2)} L ${mean(top.map((v) => v.L)).toFixed(0)} e.g. rgb(${top[0].p}) @(${top[0].x},${top[0].y}); most-saturated 30: hue ${circMean(sat.map((v) => v.h)).toFixed(1)} sat ${mean(sat.map((v) => v.s)).toFixed(2)} L ${mean(sat.map((v) => v.L)).toFixed(0)}`);
const hist = new Array(36).fill(0); for (const v of px) if (v.s > 0.35 && v.L > 40) hist[Math.floor(v.h / 10)]++;
console.log('  10deg hue hist (sat>0.35):', hist.map((n, i) => n ? `${i*10}:${n}` : '').filter(Boolean).join(' '));
// ground hue under the bolt (off frame, same box)
const g = []; for (let y = by; y < by + bh; y += 2) for (let x = bx; x < bx + bw; x += 2) { const q = off.px(x, y); const [h, s] = hsv(...q); if (s > 0.2) g.push(h); }
console.log(`  ground beneath (off frame) hue ${circMean(g).toFixed(1)}`);
