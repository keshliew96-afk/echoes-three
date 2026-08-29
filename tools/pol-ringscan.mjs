// pol-ringscan.mjs <png> — measures the four identity rings on a spawn frame.
// For each critter (screen centers passed inline below or via argv JSON):
// walks a horizontal scanline left+right from the ring center, finds the
// [ink][band][ink] structure, and reports band hue (vs the class accent hex),
// band luma, adjacent ground luma, and ink stroke widths in px.
import sharp from 'sharp';

const file = process.argv[2];
const centers = JSON.parse(
  process.argv[3] ??
    '{"healer":[800,449],"tank":[636,381],"swordsman":[953,362],"archer":[771,308]}'
);
const ACCENTS = { healer: '#33513C', tank: '#6B6157', swordsman: '#6B2E3A', archer: '#6E7A3F' };

const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const C = info.channels, W = info.width;
const px = (x, y) => {
  const i = (y * W + x) * C;
  return [data[i], data[i + 1], data[i + 2]];
};
const lumaOf = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function hueOf([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return null;
  let h;
  if (mx === r) h = 60 * (((g - b) / d) % 6);
  else if (mx === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  return h;
}
const hexHue = (hex) => hueOf([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
const hueDist = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

for (const [cls, [cx, cy]] of Object.entries(centers)) {
  for (const dir of [-1, 1]) {
    // Walk outward: collect runs of dark (ink, luma<62) and bright (band).
    const runs = [];
    let cur = null;
    for (let o = 8; o < 110; o++) {
      const p = px(cx + dir * o, cy);
      const L = lumaOf(p);
      const kind = L < 62 ? 'ink' : 'lit';
      if (!cur || cur.kind !== kind) {
        cur = { kind, start: o, end: o, sum: [0, 0, 0], n: 0 };
        runs.push(cur);
      }
      cur.end = o;
      cur.sum[0] += p[0]; cur.sum[1] += p[1]; cur.sum[2] += p[2]; cur.n++;
    }
    // Find pattern: ink run (>=2px), lit run (band), ink run (>=2px), then ground.
    for (let i = 0; i + 2 < runs.length; i++) {
      const [a, b, c] = [runs[i], runs[i + 1], runs[i + 2]];
      if (a.kind === 'ink' && a.n >= 2 && b.kind === 'lit' && b.n >= 3 && b.n <= 30 && c.kind === 'ink' && c.n >= 2) {
        const band = b.sum.map((v) => v / b.n);
        const bandHue = hueOf(band);
        const accentHue = hexHue(ACCENTS[cls]);
        // ground sample: 6px beyond the outer ink
        const gOff = c.end + 6;
        const ground = px(cx + dir * gOff, cy);
        console.log(
          `${cls} ${dir < 0 ? 'L' : 'R'}: innerInk ${a.n}px, band ${b.n}px rgb(${band.map((v) => v.toFixed(0)).join(',')}) hue ${bandHue?.toFixed(1)} (accent ${accentHue.toFixed(1)}, diff ${hueDist(bandHue, accentHue).toFixed(1)}), outerInk ${c.n}px, bandLuma ${lumaOf(band).toFixed(0)}, inkLuma ${(lumaOf(a.sum.map((v) => v / a.n))).toFixed(0)}, groundLuma@+6 ${lumaOf(ground).toFixed(0)}`
        );
        break;
      }
    }
  }
}
