// LOCAL brightness scout: busy hold room, sample frames, measure blown pixels, log events.
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes('--' + k) ? argv[argv.indexOf('--' + k) + 1] : d);
const OUT = opt('out', '/tmp/bp'); mkdirSync(OUT, { recursive: true });
const N = Number(opt('n', 30)), SEED = opt('seed', '7'), SPAWN = Number(opt('spawn', 10));
const browser = await puppeteer.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', protocolTimeout: 900000,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e.message || e)));
await page.goto(`http://127.0.0.1:5199/?menu=0&seed=${SEED}&audio=0`, { waitUntil: 'domcontentloaded', timeout: 600000 });
await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 600000, polling: 500 });
const info = await page.evaluate(() => { const X = __echoes; X.cmd('skipToRoom', 2, { act: 1 }); const m = X.cmd('objectiveRoom', 'hold', 3); X.cmd('skipToRoom', 3); X.cmd('autopilot', true);
  window.__ev = []; for (const t of ['skill_cast', 'death', 'hit', 'heal']) X.on(t, (e) => __ev.push({ t, tick: X.tick, c: e.classId || e.kind || e.skill || e.id || null, s: e.skillId || e.skill || null, src: e.sourceSeat ?? e.seat ?? null, crit: !!e.crit }));
  return { m, party: X.party ? X.party.state?.() : null }; });
console.log(JSON.stringify(info).slice(0, 400));
await new Promise((r) => setTimeout(r, 4000));
await page.evaluate((n) => { const X = __echoes; const p = X.content.world().player; const kinds = ['boar', 'mantis', 'quillback', 'toad', 'moth', 'ram', 'mole'];
  for (let i = 0; i < n; i++) X.cmd('spawn', kinds[i % kinds.length], p.x + ((i % 10) - 4.5) * 0.9, p.z - 3 - Math.floor(i / 10) * 0.8); }, SPAWN);
const rows = [];
for (let i = 0; i < N; i++) {
  const buf = await page.screenshot({ type: 'png' });
  const ev = await page.evaluate(() => { const e = __ev.splice(0); return { tick: __echoes.tick, casts: e.filter((x) => x.t === 'skill_cast').map((x) => `${x.c}:${x.s}`), deaths: e.filter((x) => x.t === 'death').length, hits: e.filter((x) => x.t === 'hit').length, crits: e.filter((x) => x.crit).length }; });
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height; let b250 = 0, b235 = 0; const y0 = 60, y1 = 640; // skip HUD rows
  // 32px block grid: blocks mostly blown
  const G = 32, blocks = [];
  for (let by = y0; by < y1; by += G) for (let bx = 0; bx < W; bx += G) { let c = 0, n = 0; for (let y = by; y < Math.min(by + G, y1); y++) for (let x = bx; x < Math.min(bx + G, W); x++) { const k = (y * W + x) * 3; const L = 0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]; n++; if (L >= 235) c++; } if (c / n > 0.5) blocks.push([bx, by, Math.round((c / n) * 100)]); }
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 3; const L = 0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]; if (L >= 250) b250++; if (L >= 235) b235++; }
  const row = { i, ...ev, b250, b235, blownBlocks: blocks.length, blocks: blocks.slice(0, 12) };
  rows.push(row); console.log(JSON.stringify(row));
  writeFileSync(`${OUT}/f${String(i).padStart(2, '0')}.png`, buf);
}
writeFileSync(`${OUT}/rows.json`, JSON.stringify(rows, null, 1));
console.log(JSON.stringify({ errors: errors.slice(0, 5) }));
await browser.close();
