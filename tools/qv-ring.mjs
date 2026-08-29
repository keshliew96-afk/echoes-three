#!/usr/bin/env node
// Angular ring scanner: samples an ellipse annulus clockwise from 12 o'clock
// and reports, per sector, the fraction of samples that are "fill" coloured.
// usage: node tools/qv-ring.mjs <png> cx cy rxMid ryMid [sectors] [--hex #F4EFE6] [--tol 60]
import sharp from 'sharp';
const a = process.argv.slice(2);
const file = a[0]; const cx = +a[1], cy = +a[2], rx = +a[3], ry = +a[4];
let sectors = a[5] && !a[5].startsWith('--') ? +a[5] : 24;
let hex = '#F4EFE6', tol = 60;
for (let i = 0; i < a.length; i++) { if (a[i] === '--hex') hex = a[i+1]; if (a[i] === '--tol') tol = +a[i+1]; }
const tr = parseInt(hex.slice(1,3),16), tg = parseInt(hex.slice(3,5),16), tb = parseInt(hex.slice(5,7),16);
const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const px = (x,y) => { x=Math.round(x); y=Math.round(y); if(x<0||y<0||x>=info.width||y>=info.height) return null; const i=(y*info.width+x)*info.channels; return [data[i],data[i+1],data[i+2]]; };
const out = [];
const RB = [0.9, 0.95, 1.0, 1.05, 1.1]; // radial band multipliers around the mid ellipse
for (let s = 0; s < sectors; s++) {
  let hit = 0, tot = 0, best = 1e9, bestpx=null;
  for (let k = 0; k < 8; k++) {
    const th = ((s + k/8) / sectors) * Math.PI * 2;
    for (const rb of RB) {
      const p = px(cx + rx*rb*Math.sin(th), cy - ry*rb*Math.cos(th));
      if (!p) continue; tot++;
      const d = Math.hypot(p[0]-tr, p[1]-tg, p[2]-tb);
      if (d < best) { best = d; bestpx = p; }
      if (d <= tol) hit++;
    }
  }
  out.push({ sector: s, degFrom12: Math.round(s*360/sectors), fill: +(hit/tot).toFixed(2), bestDist: Math.round(best), best: bestpx });
}
const filled = out.filter(o => o.fill >= 0.4).map(o => o.degFrom12);
console.log(JSON.stringify({ file, hex, tol, sectors, filledSectorsDeg: filled, filledCount: filled.length, perSector: out.map(o=>o.fill) }));
