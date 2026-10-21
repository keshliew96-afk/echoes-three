#!/usr/bin/env node
// VFX READABILITY, in the game (docs/VFX_READABILITY.md). Needs `npm run dev`
// on 127.0.0.1:5199. The first campaign room with the party on auto and a
// pack on top, stepped on the virtual clock the way tools/vfx-rework.mjs
// reels are (the sim two ticks a frame, the renderer one frame per 33 ms),
// shot every fourth frame at play zoom (1600x900). Each shot is measured:
// the largest connected near-white blob inside the play area (the HUD bands
// excluded), which is what hid the hero in v0.5.329.
//
//   node tools/vfx-readability-browser.mjs [--url http://127.0.0.1:5199/] [--dir captures/vfx-readability]
//     [--seed 21] [--frames 200] [--every 4]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
//   ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader"
//
// Bars (v0.5.331, measured on seed 21; v0.5.329 is in the doc):
//   - no shot has a near-white blob over MAX_BLOB px;
//   - at most BUSY_SHOTS of the shots have one over BUSY_BLOB px;
//   - no page or shader error.
// Writes the worst shot and the median shot to --dir. Exit code 1 on failure.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const URL0 = arg('--url', 'http://127.0.0.1:5199/');
const DIR = resolve(arg('--dir', 'captures/vfx-readability'));
const SEED = Number(arg('--seed', 21));
const N = Number(arg('--frames', 200));
const EVERY = Number(arg('--every', 4));
const MAX_BLOB = 9000; // px at 1600x900 (v0.5.329 reached 44,000)
const BUSY_BLOB = 3000;
const BUSY_SHOTS = 6; // of 50 (v0.5.329: 28 of 50)
mkdirSync(DIR, { recursive: true });
const W = 1600;
const H = 900;
const FPS = 30;
const fails = [];
const check = (ok, label, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${info ? `  ${typeof info === 'string' ? info : JSON.stringify(info)}` : ''}`);
  if (!ok) fails.push(label);
};
const { launchEchoes } = await import('./gnt-arch-browser.mjs');
const root = typeof process.getuid === 'function' && process.getuid() === 0;
const browser = await launchEchoes({ gpu: false, width: W, height: H, extraArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...(root ? ['--no-sandbox'] : [])] });
const errors = [];
// The virtual clock (as tools/vfx-rework.mjs): requestAnimationFrame queues
// while it is on, and step(ms) runs the queue with performance.now advanced.
const VCLOCK = () => {
  const realRaf = window.requestAnimationFrame.bind(window);
  const realNow = performance.now.bind(performance);
  let on = false;
  let vt = 0;
  let queue = [];
  window.requestAnimationFrame = (cb) => {
    if (on) {
      queue.push(cb);
      return queue.length;
    }
    return realRaf(cb);
  };
  performance.now = () => (on ? vt : realNow());
  window.__vclock = {
    start() {
      vt = realNow();
      on = true;
    },
    step(ms) {
      vt += ms;
      const q = queue;
      queue = [];
      for (const cb of q) cb(vt);
      return q.length;
    },
  };
};
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(String(e?.message ?? e)));
page.on('console', (m) => {
  if (m.type() === 'error' && /shader|webgl|program/i.test(m.text())) errors.push(m.text().slice(0, 300));
});
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(VCLOCK);
await page.goto(`${URL0}?menu=0&seed=${SEED}`, { waitUntil: 'domcontentloaded', timeout: 420000 });
await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 420000, polling: 250 });
await page.evaluate((lineup) => __echoes.cmd('startCampaign', { level: 1, lineup }), ['healer', 'tank', 'swordsman', 'archer']);
await page.waitForFunction(() => (__echoes.state().run || {}).phase === 'combat', { timeout: 420000, polling: 250 });
await page.evaluate(() => {
  const X = __echoes;
  X.sim.freeze();
  X.cmd('partyMode', 'auto');
  X.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true });
  const p = X.content.world().player;
  const kinds = ['boar', 'mantis', 'boar', 'quillback', 'mantis', 'moth', 'boar'];
  kinds.forEach((k, i) => X.cmd('spawn', k, p.x + (i - 3) * 0.9, p.z - 2.2 - (i % 2) * 0.9));
  __vclock.start();
});

// The play area: between the top HUD strip and the skill bar.
const PLAY = { y0: 72, y1: 800 };
function blob(raw, w) {
  const S = 4;
  const gw = Math.floor(w / S);
  const gh = Math.floor((PLAY.y1 - PLAY.y0) / S);
  const white = new Uint8Array(gw * gh);
  let n = 0;
  let nWhite = 0;
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const i = ((PLAY.y0 + gy * S) * w + gx * S) * 3;
      n++;
      if (raw[i] > 232 && raw[i + 1] > 232 && raw[i + 2] > 215) {
        white[gy * gw + gx] = 1;
        nWhite++;
      }
    }
  }
  const seen = new Uint8Array(gw * gh);
  let best = { size: 0, cx: 0, cy: 0 };
  for (let s0 = 0; s0 < gw * gh; s0++) {
    if (!white[s0] || seen[s0]) continue;
    const stack = [s0];
    seen[s0] = 1;
    let size = 0;
    let sx = 0;
    let sy = 0;
    while (stack.length) {
      const c = stack.pop();
      size++;
      const cx = c % gw;
      const cy = (c - cx) / gw;
      sx += cx;
      sy += cy;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const k = ny * gw + nx;
        if (white[k] && !seen[k]) {
          seen[k] = 1;
          stack.push(k);
        }
      }
    }
    if (size > best.size) best = { size, cx: Math.round((sx / size) * S), cy: Math.round(PLAY.y0 + (sy / size) * S) };
  }
  return { whitePct: +((100 * nWhite) / n).toFixed(2), blobPx: best.size * S * S, blobAt: [best.cx, best.cy] };
}

const rows = [];
for (let f = 0; f < N; f++) {
  await page.evaluate((ms) => (__echoes.sim.stepN(2, null), __vclock.step(ms)), 1000 / FPS);
  if (f % EVERY) continue;
  const buf = await page.screenshot({ type: 'png' });
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const tick = await page.evaluate(() => __echoes.tick);
  rows.push({ f, tick, ...blob(data, info.width), buf });
  const r = rows[rows.length - 1];
  console.log(`shot f${f} tick ${tick}: blob ${r.blobPx} px at ${r.blobAt.join(',')} (${r.whitePct}% near-white)`);
}
await browser.close();
const bySize = [...rows].sort((a, b) => b.blobPx - a.blobPx);
const worst = bySize[0];
const median = bySize[Math.floor(bySize.length / 2)];
writeFileSync(join(DIR, 'vfx-readability-worst.png'), worst.buf);
writeFileSync(join(DIR, 'vfx-readability-median.png'), median.buf);
writeFileSync(join(DIR, 'rows.json'), JSON.stringify(rows.map(({ buf, ...r }) => r), null, 1));
const busy = rows.filter((r) => r.blobPx > BUSY_BLOB).length;
check(worst.blobPx <= MAX_BLOB, `no shot has a near-white blob over ${MAX_BLOB} px (worst ${worst.blobPx} px at tick ${worst.tick})`);
check(busy <= BUSY_SHOTS, `at most ${BUSY_SHOTS} of ${rows.length} shots have a blob over ${BUSY_BLOB} px (${busy} do)`);
check(errors.length === 0, `no page or shader errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
console.log(`shots in ${DIR}: vfx-readability-worst.png (tick ${worst.tick}), vfx-readability-median.png (tick ${median.tick})`);
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall pass');
process.exit(fails.length ? 1 : 0);
