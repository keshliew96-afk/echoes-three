// qw-ring.mjs <png> <x,y,w,h> — histogram of pixel hues by brightness tier
// inside a box: for each tier (v>0.9 core, 0.75-0.9 inner glow, 0.6-0.75 outer
// glow) report count, mean hue, mean sat and the top hexes. Used to read what
// colour a VFX glow actually is where it is NOT blown out.
import sharp from 'sharp';
const [f, boxArg] = process.argv.slice(2);
const [bx, by, bw, bh] = boxArg.split(',').map(Number);
const { data, info } = await sharp(f).extract({ left: bx, top: by, width: bw, height: bh }).raw().toBuffer({ resolveWithObject: true });
const C = info.channels;
const hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx]; };
const tiers = [['core_v>0.92', 0.92, 1.01], ['inner_0.80-0.92', 0.80, 0.92], ['glow_0.66-0.80', 0.66, 0.80], ['rim_0.55-0.66', 0.55, 0.66]];
const out = {};
for (const [name, lo, hi] of tiers) {
  let n = 0, hs = 0, hc = 0, ss = 0; const hex = new Map();
  for (let i = 0; i < bw * bh; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
    const [h, s, v] = hsv(r, g, b);
    if (v < lo || v >= hi) continue;
    n++; ss += s;
    if (s > 0.06) { hs += h; hc++; }
    const k = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    hex.set(k, (hex.get(k) || 0) + 1);
  }
  out[name] = { n, meanHue: hc ? +(hs / hc).toFixed(1) : null, meanSat: n ? +(ss / n).toFixed(3) : null, top: [...hex.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) };
}
console.log(JSON.stringify({ file: f, box: boxArg, ...out }));
