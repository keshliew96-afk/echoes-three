// Effect stroke pixels over the party box: node tools/xfx-stroke.mjs <name> x,y,w,h
import { loadPng, hsv, luma } from './xfx-lib.mjs';
const [name, box] = process.argv.slice(2); const [bx, by, bw, bh] = box.split(',').map(Number);
const on = await loadPng(`captures/${name}_00.png`), off = await loadPng(`captures/${name}_01.png`);
let changed = 0, strong = 0, green = 0, overBody = 0, overBodyStrong = 0;
for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) { const p = on.px(x, y), q = off.px(x, y); const d = Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])+Math.abs(p[2]-q[2]); if (d <= 24) continue; changed++; const [h, s] = hsv(...p); const body = hsv(...q)[1] < 0.2 && luma(...q) > 150; if (body) overBody++; if (d > 90) { strong++; if (body) overBodyStrong++; } if (h >= 100 && h < 160 && s > 0.35) green++; }
console.log(`${name} box ${box}: changed ${changed}, strong(d>90) ${strong}, green(sat>.35) ${green}, over cream fur ${overBody} (strong ${overBodyStrong})`);
