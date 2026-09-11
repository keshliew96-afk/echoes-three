#!/usr/bin/env node
// certfixDshouldfix4 — Chrome trace around an in-game frame gap.
//
// The cert harness (tools/cert-capture.mjs) records rAF timestamps, sim events
// and renderer.info, which is enough to say WHEN a frame stalled and that the
// main thread was free — not WHERE the time went. This launches the same
// headless Chrome with the same flags, runs an action list with two extra
// action types, {type:'traceStart'} / {type:'traceStop', path}, and then digests
// the trace: every process/thread name, every user-timing GAP mark the sampler
// planted (performance.mark('GAP<ms>') on the frame after a >60 ms gap), and
// every event over a duration floor in the window before each mark — across
// the renderer main thread, the compositor, the raster threads and the GPU
// process. Nothing under tools/cert-*.mjs is touched.
//
//   node tools/certfixDshouldfix4-trace.mjs <name> --url <url> --settle <ms>
//        --actions <file.json> [--timeout ms]
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const name = argv[0];
const opt = { url: 'http://127.0.0.1:5199', settle: 2500, actions: null, w: 1600, h: 900, timeout: 90000, cats: 'full', traceBoot: 0 };
for (let i = 1; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = k === 'url' || k === 'actions' || k === 'cats' ? argv[i + 1] : parseFloat(argv[i + 1]);
}
const outDir = join(root, 'captures');
mkdirSync(outDir, { recursive: true });
const logLines = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CATS_FULL = [
  '-*',
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'blink.user_timing',
  'toplevel',
  'v8.execute',
  'gpu',
  'gpu.angle',
  'gpu.service',
  'gpu.capture',
  'cc',
  'viz',
  'benchmark',
  'disabled-by-default-cc.debug.scheduler',
  'skia',
  'skia.gpu',
  'skia.shaders',
  'disabled-by-default-skia.gpu',
  'disabled-by-default-skia.shaders',
];
// `--cats shaders`: only the Graphite pipeline-use / creation events plus the
// user-timing marks — small enough to trace a whole boot + a 15 s fight.
const CATS_SHADERS = ['-*', 'blink.user_timing', 'disabled-by-default-skia.shaders', 'skia.shaders'];
const CATS = opt.cats === 'shaders' ? CATS_SHADERS : CATS_FULL;

const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 240000,
  args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage', `--window-size=${opt.w},${opt.h}`],
});
let hadError = false;
let tracePath = null;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: opt.w, height: opt.h, deviceScaleFactor: 1 });
  page.on('console', (m) => logLines.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => { hadError = true; logLines.push(`[PAGEERROR] ${e.message}`); });
  if (opt.traceBoot) {
    // `--traceBoot 1`: tracing runs from BEFORE navigation, so the boot
    // warm-ups are inside the trace; the action list's traceStop ends it.
    tracePath = join(outDir, `${name}.trace.json`);
    await page.tracing.start({ path: tracePath, categories: CATS });
    logLines.push('[TRACE] start (boot)');
  }
  await page.goto(opt.url, { waitUntil: 'networkidle2', timeout: opt.timeout });
  await sleep(opt.settle);
  const run = async (acts) => {
    for (const a of acts) {
      if (a.type === 'keydown') await page.keyboard.down(a.key);
      else if (a.type === 'keyup') await page.keyboard.up(a.key);
      else if (a.type === 'mousemove') await page.mouse.move(a.x, a.y);
      else if (a.type === 'mousedown') await page.mouse.down({ button: a.button ?? 'left' });
      else if (a.type === 'mouseup') await page.mouse.up({ button: a.button ?? 'left' });
      else if (a.type === 'wait') await sleep(a.ms);
      else if (a.type === 'eval') logLines.push(`[EVAL] ${JSON.stringify(await page.evaluate(a.code))}`);
      else if (a.type === 'traceStart') {
        if (opt.traceBoot) continue; // already tracing since before the boot
        tracePath = join(outDir, `${name}.trace.json`);
        await page.tracing.start({ path: tracePath, categories: CATS });
        logLines.push('[TRACE] start');
      } else if (a.type === 'traceStop') {
        await page.tracing.stop();
        logLines.push('[TRACE] stop');
      }
    }
  };
  await run(JSON.parse(readFileSync(resolve(root, opt.actions), 'utf8')));
} catch (e) {
  hadError = true;
  logLines.push(`[HARNESS-ERROR] ${e.message}`);
} finally {
  await browser.close();
}
writeFileSync(join(outDir, `${name}.console.txt`), logLines.join('\n') + '\n');

// ------------------------------------------------------------- digest --
if (tracePath) {
  const raw = JSON.parse(readFileSync(tracePath, 'utf8'));
  const evs = raw.traceEvents || raw;
  const procName = new Map();
  const threadName = new Map();
  for (const e of evs) {
    if (e.ph !== 'M') continue;
    if (e.name === 'process_name') procName.set(e.pid, e.args?.name);
    if (e.name === 'thread_name') threadName.set(`${e.pid}/${e.tid}`, e.args?.name);
  }
  const P = (e) => `${procName.get(e.pid) || e.pid}`;
  const T = (e) => `${threadName.get(`${e.pid}/${e.tid}`) || e.tid}`;
  let t0 = Infinity;
  for (const e of evs) if (typeof e.ts === 'number' && e.ts < t0 && e.ph !== 'M') t0 = e.ts;
  const rel = (ts) => ((ts - t0) / 1000).toFixed(1);
  const marks = evs.filter((e) => e.cat && e.cat.includes('blink.user_timing') && /^GAP/.test(e.name || ''));
  const lines = [];
  lines.push(`trace ${tracePath}: ${evs.length} events; processes: ${[...new Set([...procName.values()])].join(' | ')}`);
  lines.push(`GAP marks: ${marks.map((m) => `${m.name}@${rel(m.ts)}`).join(', ') || 'none'}`);
  // Long complete events anywhere.
  const longX = evs
    .filter((e) => e.ph === 'X' && e.dur >= 25000)
    .sort((a, b) => a.ts - b.ts);
  lines.push(`\n== events >= 25 ms (any process/thread), ${longX.length} total ==`);
  for (const e of longX.slice(0, 120))
    lines.push(`${rel(e.ts)}ms +${(e.dur / 1000).toFixed(1)}ms  ${P(e)} / ${T(e)}  ${e.name}  ${JSON.stringify(e.args || {}).slice(0, 140)}`);
  // Window before each GAP mark.
  for (const m of marks) {
    const gapMs = parseFloat(m.name.replace('GAP', '')) || 0;
    const from = m.ts - (gapMs + 60) * 1000;
    const to = m.ts + 20 * 1000;
    const win = evs
      .filter((e) => e.ph === 'X' && e.ts >= from && e.ts <= to && e.dur >= 2000)
      .sort((a, b) => a.ts - b.ts);
    lines.push(`\n== window for ${m.name} @${rel(m.ts)} ms: [${rel(from)} .. ${rel(to)}], ${win.length} events >= 2 ms ==`);
    for (const e of win.slice(0, 160))
      lines.push(`${rel(e.ts)}ms +${(e.dur / 1000).toFixed(1)}ms  ${P(e)} / ${T(e)}  ${e.name}  ${JSON.stringify(e.args || {}).slice(0, 160)}`);
    // Instant / flow events of interest in the same window (frame + swap).
    const inst = evs
      .filter((e) => e.ph !== 'X' && e.ph !== 'M' && e.ts >= from && e.ts <= to && /Swap|Frame|Draw|Present|Compile|Link|Shader|Program|Decode|Raster/i.test(e.name || ''))
      .sort((a, b) => a.ts - b.ts);
    lines.push(`-- ${inst.length} instant/async events matching frame|swap|compile|link|shader|program|decode|raster:`);
    for (const e of inst.slice(0, 120)) lines.push(`${rel(e.ts)}ms ph=${e.ph}  ${P(e)} / ${T(e)}  ${e.name}  ${JSON.stringify(e.args || {}).slice(0, 120)}`);
  }
  const digest = join(outDir, `${name}.digest.txt`);
  writeFileSync(digest, lines.join('\n') + '\n');
  console.log(lines.slice(0, 40).join('\n'));
  console.log(`\n(full digest: ${digest})`);
}
console.log(`done -> captures/${name}.console.txt; errors: ${hadError}`);
process.exit(hadError ? 1 : 0);
