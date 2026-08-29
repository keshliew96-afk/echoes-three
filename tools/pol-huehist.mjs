// pol-huehist.mjs <png...> — hue histogram in 15-degree bins over the same
// coloured-pixel population analyze.mjs uses (s > 0.12), with the analyzer's
// warm / foliage / cool cut lines marked. The polish chain's answer to "the
// cool share swung 3% to 21% between two loads — WHERE is the mass sitting?":
// if a metric is unstable, its population is piled on a threshold.
import sharp from 'sharp';
const BIN = 15;
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  const C = info.channels;
  const N = info.width * info.height;
  const bins = new Array(360 / BIN).fill(0);
  let col = 0;
  for (let i = 0; i < N; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!mx || d / mx <= 0.12) continue;
    let h = 0;
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
    bins[Math.floor(h / BIN)]++;
    col++;
  }
  console.log(`\n=== ${f}  (${col} coloured px)`);
  for (let i = 0; i < bins.length; i++) {
    const lo = i * BIN;
    const pct = (bins[i] / col) * 100;
    if (pct < 0.25) continue;
    const mark = lo < 60 || lo >= 330 ? 'warm' : lo < 160 ? 'foliage' : 'cool';
    console.log(
      `h${String(lo).padStart(3)}-${String(lo + BIN).padStart(3)} ${mark.padEnd(8)} ${pct.toFixed(1).padStart(5)}%  ${'#'.repeat(Math.round(pct))}`
    );
  }
}
