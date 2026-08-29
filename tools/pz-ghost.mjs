// (pz-* = the polish chain's committed copy of the dash-trail blob counter,
// so criterion 5's numbers are reproducible.)
// Count pale desaturated (ghost-tinted) pixels in the trail region behind the
// dashing healer, and report connected blobs there.
import { readFileSync } from 'fs';
import sharp from 'sharp';
for (const file of process.argv.slice(2)) {
  const { data, info } = await sharp(readFileSync(file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, C = info.channels;
  let n = 0;
  const X0 = 540, X1 = 800, Y0 = 350, Y1 = 500;
  const mask = new Uint8Array((X1 - X0) * (Y1 - Y0));
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const i = (y * W + x) * C, r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx ? (mx - mn) / mx : 0;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (L > 118 && s < 0.30 && g - r < 30 && r > 100) { mask[(y - Y0) * (X1 - X0) + (x - X0)] = 1; n++; }
  }
  // connected blobs
  const Wm = X1 - X0, Hm = Y1 - Y0; const lab = new Int8Array(Wm * Hm); const blobs = [];
  for (let i = 0; i < Wm * Hm; i++) {
    if (!mask[i] || lab[i]) continue;
    const st = [i]; lab[i] = 1; let cnt = 0, sx = 0, sy = 0;
    while (st.length) { const p = st.pop(); cnt++; sx += p % Wm; sy += (p / Wm) | 0;
      const x = p % Wm, y = (p / Wm) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy; if (nx<0||ny<0||nx>=Wm||ny>=Hm) continue; const q = ny*Wm+nx; if (mask[q] && !lab[q]) { lab[q]=1; st.push(q); } } }
    if (cnt > 120) blobs.push({ cnt, x: X0 + Math.round(sx / cnt), y: Y0 + Math.round(sy / cnt) });
  }
  blobs.sort((a,b)=>b.cnt-a.cnt);
  console.log(`${file}: palePx=${n} blobs=${blobs.length} ${blobs.slice(0,8).map(b=>`(${b.x},${b.y})x${b.cnt}`).join(' ')}`);
}
