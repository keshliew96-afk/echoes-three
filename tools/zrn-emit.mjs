#!/usr/bin/env node
// Round D3 emitter proof: for a zrn-* capture whose last [EVAL] line carries
// bossBox / emittersInFrame / tightRack, measure LUMA >200 / >160 share and the
// brightest 24-px block inside the boss box vs same-size boxes centred on every
// torch/brazier emitter (pixels inside the boss box EXCLUDED from the emitter
// boxes so the Stag's own glare cannot vote for a torch), whole-frame LUMA, the
// antler-rack hue histogram, and a rack hue-mask PNG (blue band 195-244 = red,
// violet band 244-285 = green, rest dimmed) at 3x.
//   node tools/zrn-emit.mjs zrn-fight1 [zrn-fight2 ...]
import { readFileSync } from 'fs';
import sharp from 'sharp';

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}

for (const name of process.argv.slice(2)) {
  const con = readFileSync(`captures/${name}.console.txt`, 'utf8').split('\n').filter((l) => l.startsWith('[EVAL]'));
  const info = JSON.parse(con[con.length - 1].slice(7));
  const { data, info: im } = await sharp(readFileSync(`captures/${name}.png`)).ensureAlpha().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = im;
  const clamp = ([x, y, w, h]) => { const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)); const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h)); return [x0, y0, x1 - x0, y1 - y0]; };
  // HUD banner band (boss plate with white numerals) is excluded from emitter boxes too.
  const inside = (x, y, b) => b && ((x >= b[0] && x < b[0] + b[2] && y >= b[1] && y < b[1] + b[3]) || y < 64);
  const stats = (box, excl) => {
    const [x0, y0, w, h] = clamp(box); let n = 0, a160 = 0, a200 = 0, sum = 0, skipped = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (inside(x, y, excl)) { skipped++; continue; } const i = (y * W + x) * C; const L = luma(data[i], data[i + 1], data[i + 2]); n++; sum += L; if (L > 160) a160++; if (L > 200) a200++; }
    let best = 0, bx = 0, by = 0;
    for (let y = y0; y + 24 <= y0 + h; y += 8) for (let x = x0; x + 24 <= x0 + w; x += 8) { if (excl && (inside(x, y, excl) || inside(x + 23, y + 23, excl) || inside(x, y + 23, excl) || inside(x + 23, y, excl))) continue; let s = 0; for (let yy = 0; yy < 24; yy++) for (let xx = 0; xx < 24; xx++) { const i = ((y + yy) * W + x + xx) * C; s += luma(data[i], data[i + 1], data[i + 2]); } s /= 576; if (s > best) { best = s; bx = x; by = y; } }
    return { box: [x0, y0, w, h], n, excludedPx: skipped, p200: +((100 * a200) / Math.max(1, n)).toFixed(2), p160: +((100 * a160) / Math.max(1, n)).toFixed(2), mean: +(sum / Math.max(1, n)).toFixed(1), block24: { mean: +best.toFixed(1), at: [bx, by] } };
  };
  const hue = (box) => {
    const [x0, y0, w, h] = clamp(box); const bins = new Array(72).fill(0); let sat = 0, blue = 0, violet = 0, blueG = 0, violetG = 0, warm = 0, blueHaze = 0, blueSolid = 0, violetHaze = 0, violetSolid = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * W + x) * C; const r = data[i], g = data[i + 1], b = data[i + 2]; const [hh, s, v] = hsv(r, g, b); if (s <= 0.2 || v < 0.15) continue; sat++; bins[Math.floor(hh / 5) % 72]++; if (hh >= 195 && hh < 244) { blue++; if (s < 0.35) blueHaze++; else blueSolid++; } else if (hh >= 244 && hh < 285) { violet++; if (s < 0.35) violetHaze++; else violetSolid++; } else if (hh >= 330 || hh < 60) warm++; const L = luma(r, g, b); if (s > 0.35 && L > 40) { if (hh >= 195 && hh < 245) blueG++; else if (hh >= 245 && hh < 285) violetG++; } }
    const cool = bins.map((n, i) => [i * 5, n]).filter(([d]) => d >= 180 && d < 300).sort((a, b) => b[1] - a[1]);
    const p = (n) => +((100 * n) / Math.max(1, sat)).toFixed(1);
    const hist = bins.map((n, i) => [i * 5, n]).filter(([d, n]) => d >= 180 && d < 300 && n > 0).map(([d, n]) => `${d}:${n}`).join(' ');
    // Antler subset: bright AND saturated (v>=0.5, s>=0.35) — the tines/beams,
    // not the dark navy body (v<0.5) and not the low-sat bloom halo.
    const tb = new Array(72).fill(0); let tBlue = 0, tViolet = 0, tN = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * W + x) * C; const [hh, s, v] = hsv(data[i], data[i + 1], data[i + 2]); if (s < 0.35 || v < 0.5) continue; tN++; tb[Math.floor(hh / 5) % 72]++; if (hh >= 195 && hh < 244) tBlue++; else if (hh >= 244 && hh < 285) tViolet++; }
    const tcool = tb.map((n, i) => [i * 5, n]).filter(([d]) => d >= 180 && d < 300).sort((a, b) => b[1] - a[1]);
    const tines = { px: tN, blue: tBlue, violet: tViolet, dominantCoolBin: tcool.length && tcool[0][1] ? `${tcool[0][0]}-${tcool[0][0] + 5}` : null, hist: tb.map((n, i) => [i * 5, n]).filter(([d, n]) => d >= 180 && d < 300 && n > 0).map(([d, n]) => `${d}:${n}`).join(' ') };
    return { box: [x0, y0, w, h], satPx: sat, dominantCoolBin: `${cool[0][0]}-${cool[0][0] + 5}`, dominantCoolPx: cool[0][1], violetPct: p(violet), bluePct: p(blue), warmPct: p(warm), gateViolet: violetG, gateBlue: blueG, blueHaze, blueSolid, violetHaze, violetSolid, coolHist5deg: hist, tines };
  };
  const mask = async (box, out) => {
    const [x0, y0, w, h] = clamp(box); const buf = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y + y0) * W + x + x0) * C; const r = data[i], g = data[i + 1], b = data[i + 2]; const [hh, s, v] = hsv(r, g, b); const o = (y * w + x) * 3; const L = luma(r, g, b); if (s > 0.2 && v >= 0.15 && hh >= 195 && hh < 244) { buf[o] = 255; buf[o + 1] = s >= 0.35 ? 0 : 120; buf[o + 2] = s >= 0.35 ? 0 : 120; } else if (s > 0.2 && v >= 0.15 && hh >= 244 && hh < 285) { buf[o] = s >= 0.35 ? 0 : 120; buf[o + 1] = 255; buf[o + 2] = s >= 0.35 ? 0 : 120; } else { buf[o] = buf[o + 1] = buf[o + 2] = Math.round(L * 0.5); } }
    await sharp(buf, { raw: { width: w, height: h, channels: 3 } }).resize(w * 3, h * 3, { kernel: 'nearest' }).toFile(out);
  };
  const buckets = new Array(16).fill(0); let a200 = 0, a160 = 0; const N = W * H;
  for (let i = 0; i < N; i++) { const L = luma(data[i * C], data[i * C + 1], data[i * C + 2]); buckets[Math.min(15, Math.floor(L / 16))]++; if (L > 200) a200++; if (L > 160) a160++; }
  const used = buckets.filter((b) => b / N > 0.0005).length;
  const bb = typeof info.bossBox === 'string' ? info.bossBox.split(',').map(Number) : info.bossBox;
  const bossBox = bb ? clamp(bb) : null;
  const boss = bossBox ? stats(bossBox, null) : null;
  const ems = (info.emittersInFrame || []).map((e) => { const [, , w, h] = bossBox || [0, 0, 200, 200]; const s = stats([e.x - w / 2, e.y - h / 2, w, h], bossBox); return { kind: e.kind, brazier: e.brazier, at: [e.x, e.y], ...s }; }).sort((a, b) => b.p200 - a.p200);
  console.log(`\n=== ${name}  tick ${info.tick} boss hp ${info.boss && info.boss.hp}/${info.boss && info.boss.maxHp} adds ${info.boss && info.boss.adds} enemies ${info.enemies} numerals ${info.numerals && info.numerals.length} plate ${JSON.stringify(info.plate)} fps ${info.fps}`);
  console.log(`frame >200 ${((100 * a200) / N).toFixed(3)}%  >160 ${((100 * a160) / N).toFixed(3)}%  buckets ${used}/16`);
  console.log(`BOSS  ${JSON.stringify(boss)}`);
  for (const e of ems.slice(0, 5)) console.log(`EMIT  ${e.kind}${e.brazier ? '(brazier)' : ''} @${e.at} box ${e.box} excl ${e.excludedPx}px >200 ${e.p200}% >160 ${e.p160}% mean ${e.mean} block24 ${e.block24.mean}@${e.block24.at}`);
  if (info.tightRack) { console.log(`RACK  tight ${JSON.stringify(hue(info.tightRack))}`); await mask(info.tightRack, `captures/${name}-rackmask.png`); }
  if (info.rackBox) console.log(`RACK  padded ${JSON.stringify(hue(info.rackBox))}`);
  console.log(`party ${JSON.stringify(info.party)} bossfx ${JSON.stringify(info.bossfx && { boss: info.bossfx.boss, flash: info.bossfx.flash, screenBox: info.bossfx.screenBox && info.bossfx.screenBox.box })}`);
}
