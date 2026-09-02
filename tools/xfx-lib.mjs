// xfx critic helpers (Round D fixes critic). Own code — nothing shared with builder probes.
import { readFileSync } from 'fs';
import sharp from 'sharp';

export async function loadPng(file) {
  const { data, info } = await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  return {
    W, H, C, data,
    px(x, y) {
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || yi < 0 || xi >= W || yi >= H) return null;
      const i = (yi * W + xi) * C;
      return [data[i], data[i + 1], data[i + 2]];
    },
  };
}

export function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx * 255];
}
export const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const hexHue = (hex) => hsv(...hexRgb(hex))[0];
export const dh = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
export function circMean(arr) {
  if (!arr.length) return NaN;
  let x = 0, y = 0;
  for (const h of arr) { x += Math.cos((h * Math.PI) / 180); y += Math.sin((h * Math.PI) / 180); }
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
export const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
export const median = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
export const isDanger = (r, g, b) => { const [h, s] = hsv(r, g, b); return s > 0.35 && luma(r, g, b) > 40 && h >= 5 && h < 25; };
export const isHeal = (r, g, b) => { const [h, s] = hsv(r, g, b); return s > 0.35 && luma(r, g, b) > 40 && h >= 110 && h < 150; };
export const isViolet = (r, g, b) => { const [h, s] = hsv(r, g, b); return s > 0.35 && luma(r, g, b) > 40 && h >= 245 && h < 285; };

// Read the last [EVAL] line in captures/<name>.console.txt whose JSON carries `tag`.
export function readProbe(name, tag) {
  const log = readFileSync(`captures/${name}.console.txt`, 'latin1');
  const lines = log.split('\n').filter((l) => l.startsWith('[EVAL]'));
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const j = JSON.parse(lines[i].slice(7));
      if (j && j.tag === tag) return j;
    } catch { /* not json */ }
  }
  return null;
}

// Project a world point through the dumped three.js camera (column-major elements).
export function makeProjector(probe) {
  const P = probe.P, V = probe.Vm, W = probe.W, H = probe.H;
  const mul = (e, x, y, z, w) => [
    e[0] * x + e[4] * y + e[8] * z + e[12] * w,
    e[1] * x + e[5] * y + e[9] * z + e[13] * w,
    e[2] * x + e[6] * y + e[10] * z + e[14] * w,
    e[3] * x + e[7] * y + e[11] * z + e[15] * w,
  ];
  return (x, y, z) => {
    const v = mul(V, x, y, z, 1);
    const c = mul(P, v[0], v[1], v[2], v[3]);
    const nx = c[0] / c[3], ny = c[1] / c[3];
    return [((nx + 1) / 2) * W, ((1 - ny) / 2) * H];
  };
}
