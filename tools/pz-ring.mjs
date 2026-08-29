// (pz-* = the polish chain's committed copy of the round-2 ring measurer, so
// the numbers in docs/critiques/baseline-v030-advisories.md are reproducible.)
// Identity-ring measurer (fix round 2). Samples radial rays over the ring's
// unobstructed lower arc at the KNOWN band radii from render/critters/common.js
// (RING: inner ink 0.564-0.68, accent band 0.68-0.852, outer ink 0.852-0.962 of
// the plane half-size; the outermost band edge is the ring's world radius), so
// nothing is guessed from image heuristics.
// Reports: band mean hue/sat/luma and its delta from the class accent hex, the
// ground luma just outside the ring, the band/ground luma ratio (§17
// legibility) and the MEASURED width in screen px of each dark ink stroke
// (the advisory's >=2px fallback).
// usage: node tools/qp-ring2.mjs <png> cx cy rxPx --label n --accent #hex
import { readFileSync } from 'fs';
import sharp from 'sharp';
const a = process.argv.slice(2);
const file = a[0]; const cx = +a[1], cy = +a[2], rx = +a[3];
let label = 'ring', accent = null;
for (let i = 0; i < a.length; i++) { if (a[i] === '--label') label = a[i+1]; if (a[i] === '--accent') accent = a[i+1]; }
const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const luma = (r,g,b) => 0.2126*r + 0.7152*g + 0.0722*b;
function hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0];}
const px=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=W||y>=H)return null;const i=(y*W+x)*C;return [data[i],data[i+1],data[i+2]];};
const SQUASH = 0.6155;               // cos(52 deg) — the camera's ground foreshortening
// Fractions of the ring's world radius (= 0.962 of the plane half-size):
// inner ink 0.53-0.64, band 0.64-0.868, outer ink 0.868-0.962 of the half.
// The BAND window is deliberately the middle ~40% of the band (its full
// span is 0.665-0.902 of the radius, centre 0.784): sampling to the band's
// edges pulls the shipped FXAA's ink<->band gradient into the average.
const F = { innerInk: [0.520, 0.648], band: [0.72, 0.80], outerInk: [0.872, 1.0], ground: [1.14, 1.30] };
const acc = [], gnd = [], inkAw = [], inkBw = [];
for (let d = 100; d <= 260; d += 3) {
  const th = (d * Math.PI) / 180;
  const ct = Math.cos(th), st = Math.sin(th) * SQUASH;
  const pxPerUnit = Math.hypot(ct, st) * rx;   // screen px per unit of r/rx
  const at = (f) => px(cx + ct * f * rx, cy + st * f * rx);
  const grab = (lo, hi, out) => { for (let f = lo; f <= hi; f += 0.012) { const p = at(f); if (p) out.push(p); } };
  const band = []; grab(F.band[0], F.band[1], band);
  const g = []; grab(F.ground[0], F.ground[1], g);
  if (!band.length || !g.length) continue;
  acc.push(...band); gnd.push(...g);
  const bL = band.reduce((s,p)=>s+luma(...p),0)/band.length;
  const gL = g.reduce((s,p)=>s+luma(...p),0)/g.length;
  const dark = Math.min(bL, gL) * 0.78;
  const width = (lo, hi) => { let n = 0; const step = 0.006; for (let f = lo; f <= hi; f += step) { const p = at(f); if (p && luma(...p) < dark) n++; } return n * step * pxPerUnit; };
  inkAw.push(width(F.innerInk[0] - 0.03, F.innerInk[1] + 0.02));
  inkBw.push(width(F.outerInk[0] - 0.02, F.outerInk[1] + 0.06));
}
const mean = (arr) => arr.reduce((s,x)=>s+x,0)/(arr.length||1);
// MODE, not mean. The party stands ON its own ring, so a lower-arc ray can
// cross a paw, a tail or the sword: averaging those in drags the reported hue
// tens of degrees. Bin the band samples into 10-degree hue bins, take the
// densest bin, and report the circular mean of everything within 15 degrees of
// it — the dominant band colour, with occluders rejected.
const bins = new Array(36).fill(0);
for (const p of acc) bins[Math.floor(hsv(...p)[0] / 10) % 36]++;
let bi = 0; for (let i = 1; i < 36; i++) if (bins[i] > bins[bi]) bi = i;
const centre = bi * 10 + 5;
const near15 = (h) => { let d = Math.abs(h - centre); if (d > 180) d = 360 - d; return d <= 15; };
const core = acc.filter((p) => near15(hsv(...p)[0]));
let hxs=0, hys=0, ss=0;
for (const p of core) { const [h,s]=hsv(...p); hxs+=Math.cos(h*Math.PI/180); hys+=Math.sin(h*Math.PI/180); ss+=s; }
let bh=(Math.atan2(hys,hxs)*180)/Math.PI; if(bh<0)bh+=360;
const bs = ss/core.length;
const bL = mean(core.map(p=>luma(...p)));
const gL = mean(gnd.map(p=>luma(...p)));
let accStr='';
if (accent){const n=parseInt(accent.slice(1),16);const [ah]=hsv((n>>16)&255,(n>>8)&255,n&255);let d=Math.abs(bh-ah);if(d>180)d=360-d;accStr=`  accent ${accent} h${ah.toFixed(1)}  DELTA ${d.toFixed(1)}deg`;}
console.log(`${label.padEnd(10)} band h${bh.toFixed(1)} s${bs.toFixed(3)} L${bL.toFixed(0)}  ground L${gL.toFixed(0)}  ratio ${(bL/gL).toFixed(2)}x  ink ${mean(inkAw).toFixed(1)}px / ${mean(inkBw).toFixed(1)}px${accStr}  bandpx ${core.length}/${acc.length}`);
