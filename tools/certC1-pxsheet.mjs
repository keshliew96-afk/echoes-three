// certC1-pxsheet.mjs — decode the {tag:'GRABS'} [EVAL] lines of a certC1 console log into
// PNG crops (4x nearest zoom) + one contact sheet per trial; prints per-grab pixel stats.
// usage: node tools/certC1-pxsheet.mjs captures/certC1-pxflash.console.txt certC1-pxflash
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
const [log, prefix] = process.argv.slice(2);
const lines = readFileSync(log, 'utf8').split(/\r?\n/).filter(l => l.startsWith('[EVAL] {"tag":"GRABS"'));
const Z = 4;
for (const line of lines) {
  const o = JSON.parse(line.slice(7));
  const tiles = [];
  let maxW = 0, maxH = 0;
  for (let i = 0; i < o.grabs.length; i++) {
    const g = o.grabs[i];
    const buf = Buffer.from(g.url.split(',')[1], 'base64');
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    let w = 0, b200 = 0, mx = 0; const n = info.width * info.height;
    for (let p = 0; p < n; p++) { const r = data[p * info.channels], gg = data[p * info.channels + 1], bb = data[p * info.channels + 2]; const l = 0.2126 * r + 0.7152 * gg + 0.0722 * bb; const M = Math.max(r, gg, bb), m = Math.min(r, gg, bb); const s = M ? (M - m) / M : 0; if (l > 230 && s < 0.18) w++; if (l > 200) b200++; if (l > mx) mx = l; }
    const name = `captures/${prefix}${o.trial}-g${String(i).padStart(2, '0')}-t${g.t}-${g.phase}.png`;
    const zoomed = await sharp(buf).resize(info.width * Z, info.height * Z, { kernel: 'nearest' }).png().toBuffer();
    writeFileSync(name, zoomed);
    console.log(`${name}  tick ${g.t} frame ${g.fr} ${g.phase}${g.ghost ? ' GHOST' : ''} box ${g.box.join(',')} (${info.width}x${info.height}) white ${(w / n * 100).toFixed(1)}% >200 ${(b200 / n * 100).toFixed(1)}% maxLuma ${mx.toFixed(0)} | in-page L ${g.L} S ${g.S} W ${g.W} B ${g.B} mx ${g.mx}`);
    tiles.push({ input: zoomed, w: info.width * Z, h: info.height * Z, t: g.t, phase: g.phase });
    maxW = Math.max(maxW, info.width * Z); maxH = Math.max(maxH, info.height * Z);
  }
  if (!tiles.length) { console.log(`trial ${o.trial}: no grabs`); continue; }
  const gap = 8;
  const sheetW = tiles.length * (maxW + gap) + gap, sheetH = maxH + 2 * gap;
  const composite = tiles.map((tl, i) => ({ input: tl.input, left: gap + i * (maxW + gap), top: gap }));
  const sheet = `captures/${prefix}${o.trial}-sheet.png`;
  await sharp({ create: { width: sheetW, height: sheetH, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } } }).composite(composite).png().toFile(sheet);
  console.log(`sheet ${sheet} ${sheetW}x${sheetH}: ${tiles.map((tl, i) => `#${i}=t${tl.t}/${tl.phase}`).join(' ')} (hit tick ${o.hitTick})`);
}
