// certfixAworld1 — coarse FLAT/luma heatmap so the builder can point at the
// exact region a frame goes dead-flat. Read-only; never edits the analyzer.
import sharp from 'sharp';
const file = process.argv[2];
const gx = parseInt(process.argv[3] || '10', 10);
const gy = parseInt(process.argv[4] || '6', 10);
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const cw = Math.floor(W / gx / 8) * 8, ch = Math.floor(H / gy / 8) * 8;
const rowsF = [], rowsL = [];
for (let cy = 0; cy < gy; cy++) {
  const rf = [], rl = [];
  for (let cx = 0; cx < gx; cx++) {
    let flat = 0, blocks = 0, lsum = 0, ln = 0;
    for (let by = cy * ch; by + 8 <= (cy + 1) * ch; by += 8) {
      for (let bx = cx * cw; bx + 8 <= (cx + 1) * cw; bx += 8) {
        let mn = [255, 255, 255], mx = [0, 0, 0];
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const i = ((by + y) * W + bx + x) * C;
          for (let k = 0; k < 3; k++) { const v = data[i + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; }
          lsum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; ln++;
        }
        blocks++;
        if (mx[0] - mn[0] <= 4 && mx[1] - mn[1] <= 4 && mx[2] - mn[2] <= 4) flat++;
      }
    }
    rf.push(String(Math.round((flat / blocks) * 100)).padStart(3));
    rl.push(String(Math.round(lsum / ln)).padStart(3));
  }
  rowsF.push(rf.join(' ')); rowsL.push(rl.join(' '));
}
console.log(`${file}  cell ${cw}x${ch}`);
console.log('FLAT%'); rowsF.forEach((r, i) => console.log(`y${String(i * ch).padStart(4)} ${r}`));
console.log('LUMA'); rowsL.forEach((r, i) => console.log(`y${String(i * ch).padStart(4)} ${r}`));
