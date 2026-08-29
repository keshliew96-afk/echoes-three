// qw-delta.mjs <png> <fx x,y,w,h> <bg x,y,w,h> [minDelta]
// Critic tool for the §19.1 colour law over ANY background: additive VFX
// composite as bg + emitted, so the EMITTED colour is (pixel - background).
// Reports the hue of the emitted light for every pixel whose delta magnitude
// clears minDelta, bucketed into the reserved bands, plus the top emitted
// colours and the brightest sample. Bright Heal #5FE873 = hue 128.8;
// Hearth Amber #E8A23D = hue 34.6; Ember #FF5A36 = hue 12.5;
// Parchment #F4EFE6 is near-neutral (sat < 0.1 => reported as 'white/neutral').
import sharp from 'sharp';
const [f, fxArg, bgArg, minArg] = process.argv.slice(2);
const min = +(minArg ?? 12);
const grab = async (a) => { const [x, y, w, h] = a.split(',').map(Number); const r = await sharp(f).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer({ resolveWithObject: true }); return { ...r, x, y }; };
const FX = await grab(fxArg), BG = await grab(bgArg);
const C = FX.info.channels;
let br = 0, bg2 = 0, bb = 0, n = 0;
for (let i = 0; i < BG.info.width * BG.info.height; i++) { br += BG.data[i * C]; bg2 += BG.data[i * C + 1]; bb += BG.data[i * C + 2]; n++; }
br /= n; bg2 /= n; bb /= n;
const hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0, mx]; };
const bands = { heal_green: 0, amber: 0, ember_danger: 0, violet: 0, blue_cyan: 0, white_neutral: 0, other: 0 };
const hexes = new Map(); let peak = { m: -1 };
let W = FX.info.width, H = FX.info.height;
for (let i = 0; i < W * H; i++) {
  const dr = FX.data[i * C] - br, dg = FX.data[i * C + 1] - bg2, db = FX.data[i * C + 2] - bb;
  const m = Math.max(dr, dg, db);
  if (m < min) continue;
  const R = Math.max(0, dr), G = Math.max(0, dg), B = Math.max(0, db);
  const [h, s, v] = hsv(R, G, B);
  if (s < 0.18) bands.white_neutral++;
  else if (h >= 90 && h < 175) bands.heal_green++;
  else if (h >= 26 && h < 60) bands.amber++;
  else if (h >= 0 && h < 26) bands.ember_danger++;
  else if (h >= 245 && h < 300) bands.violet++;
  else if (h >= 175 && h < 245) bands.blue_cyan++;
  else bands.other++;
  const hex = '#' + [R, G, B].map((v2) => Math.round(v2).toString(16).padStart(2, '0')).join('');
  hexes.set(hex, (hexes.get(hex) || 0) + 1);
  if (m > peak.m) peak = { m, hex, hue: +h.toFixed(1), sat: +s.toFixed(2), px: FX.x + (i % W), py: FX.y + Math.floor(i / W) };
}
const tot = Object.values(bands).reduce((a, b) => a + b, 0) || 1;
console.log(JSON.stringify({ file: f, fx: fxArg, bgMean: [br, bg2, bb].map((v) => Math.round(v)), minDelta: min, litPx: tot, bands, bandPct: Object.fromEntries(Object.entries(bands).map(([k, v]) => [k, +((v / tot) * 100).toFixed(1)])), peak, topEmitted: [...hexes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8) }, null, 0));
