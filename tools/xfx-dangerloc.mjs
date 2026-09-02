// where are the danger-band pixels among effect (changed) pixels? node tools/xfx-dangerloc.mjs <name>
import { loadPng, hsv, luma } from './xfx-lib.mjs';
const name = process.argv[2]; const on = await loadPng(`captures/${name}_00.png`), off = await loadPng(`captures/${name}_01.png`);
const pts = []; let onTotal = 0, offTotal = 0;
for (let y = 0; y < on.H; y++) for (let x = 0; x < on.W; x++) { const p = on.px(x, y), q = off.px(x, y); const isD = (c) => { const [h, s] = hsv(...c); return s > 0.35 && luma(...c) > 40 && h >= 5 && h < 25; }; const a = isD(p), b = isD(q); if (a) onTotal++; if (b) offTotal++; const d = Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])+Math.abs(p[2]-q[2]); if (d > 24 && a) pts.push({ x, y, p, q }); }
// cluster into 40px cells
const cells = {}; for (const v of pts) { const k = `${Math.floor(v.x/40)*40},${Math.floor(v.y/40)*40}`; cells[k] = (cells[k] || 0) + 1; }
const top = Object.entries(cells).sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log(`${name}: frame danger ON ${onTotal} / OFF ${offTotal}; effect-attributed danger px ${pts.length}; top cells ${top.map(([k, n]) => `[${k}]x${n}`).join(' ')}`);
for (const [k] of top.slice(0, 3)) { const [cx, cy] = k.split(',').map(Number); const ex = pts.filter((v) => v.x >= cx && v.x < cx + 40 && v.y >= cy && v.y < cy + 40).slice(0, 2); for (const v of ex) console.log(`   (${v.x},${v.y}) on rgb(${v.p}) h${hsv(...v.p)[0].toFixed(0)} s${hsv(...v.p)[1].toFixed(2)}  off rgb(${v.q}) h${hsv(...v.q)[0].toFixed(0)}`); }
