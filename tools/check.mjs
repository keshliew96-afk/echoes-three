#!/usr/bin/env node
// `npm run check` — the play check (CLAUDE.md "Running things"). Starts the dev
// server (`npm run dev`, port 5199) unless one already answers there, opens the
// game in Playwright's Chromium, plays a few seconds of real keyboard and mouse
// input, saves screenshots, and exits 1 if the page logged any console error or
// threw any uncaught error. It changes nothing in the game.
//
//   npm run check                         the whole check (title, camp, room 1)
//   node tools/check.mjs --out <dir>      where the screenshots and report go
//                                         (default captures/check, gitignored)
//   node tools/check.mjs --headful        show the browser window
//
// What it does, in order:
//   1. Title: opens the plain player URL on a wiped profile (?fresh=1), presses a
//      key on the loading screen, waits for the title, takes title.png.
//   2. Camp: opens ?fresh=1&menu=0 (straight into camp), walks with W A S D,
//      clicks to attack, presses Space to dash, takes camp.png.
//   3. Room 1: starts the campaign through the debug API (the same path the
//      probes use), plays the same input in the first room, takes room1.png.
// Every console line of type "error" and every uncaught page error, in any
// phase, fails the check. Warnings are listed in the report but do not fail it.
//
// Linux cloud session as root: Playwright's own Chromium is found through
// PLAYWRIGHT_BROWSERS_PATH; ECHOES_CHROME_ARGS adds flags (for example
// "--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader").
// Software GL runs at 1 to 25 fps, so keys are held for 250 ms and every wait is
// on game state, not on time.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}/`;
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const OUT = resolve(ROOT, opt('--out', 'captures/check'));
const HEADFUL = argv.includes('--headful');
const WAIT_MS = 180000;

const errors = []; // { phase, kind, text }
const warnings = [];
const steps = [];
let phase = 'boot';
const log = (s) => {
  steps.push(`[${phase}] ${s}`);
  console.log(`[${phase}] ${s}`);
};

async function serverUp() {
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

async function startServer() {
  if (await serverUp()) {
    log(`reusing the dev server already on ${BASE}`);
    return null;
  }
  log('starting npm run dev');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npm, ['run', 'dev'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
  });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    if (child.exitCode !== null) throw new Error(`npm run dev exited ${child.exitCode}:\n${out}`);
    if (await serverUp()) {
      log(`dev server up after ${Date.now() - t0} ms`);
      return child;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`dev server did not answer on ${BASE} within 60 s:\n${out}`);
}

function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    else process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

function watch(page) {
  page.on('console', (m) => {
    const text = m.text();
    const loc = m.location();
    const where = loc && loc.url ? ` (${loc.url.replace(BASE, '')}:${loc.lineNumber})` : '';
    if (m.type() === 'error') errors.push({ phase, kind: 'console.error', text: text + where });
    else if (m.type() === 'warning') warnings.push({ phase, text });
  });
  page.on('pageerror', (e) => errors.push({ phase, kind: 'uncaught', text: String((e && e.stack) || e) }));
  page.on('requestfailed', (r) => {
    // A navigation away aborts in-flight requests; only real failures count.
    const f = r.failure();
    if (f && !/ERR_ABORTED/.test(f.errorText)) errors.push({ phase, kind: 'request', text: `${r.url()} ${f.errorText}` });
  });
}

const tick = (page) => page.evaluate(() => (window.__echoes ? window.__echoes.tick : -1));

// Wait until the sim has ticked `n` more times (state, not wall-clock time).
async function ticks(page, n) {
  const start = await tick(page);
  await page.waitForFunction((s) => window.__echoes && window.__echoes.tick >= s, start + n, { timeout: WAIT_MS });
}

async function hold(page, key, ms = 250) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

// A few seconds of play: walk a square, attack at the cursor, dash.
async function playInput(page) {
  const vp = page.viewportSize();
  const cx = vp.width / 2;
  const cy = vp.height / 2;
  const before = await page.evaluate(() => window.__echoes.controls.state().body);
  for (const k of ['KeyW', 'KeyD', 'KeyS', 'KeyA']) {
    await hold(page, k, 600);
    await ticks(page, 2);
  }
  await page.mouse.move(cx + 160, cy - 60);
  for (let i = 0; i < 3; i++) {
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.up();
    await ticks(page, 2);
  }
  await hold(page, 'KeyD', 400);
  await hold(page, 'Space', 250);
  await ticks(page, 10);
  const after = await page.evaluate(() => window.__echoes.controls.state().body);
  log(`body moved from ${JSON.stringify(before)} to ${JSON.stringify(after)}`);
  return { before, after };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await startServer();
  const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
  const browser = await chromium.launch({
    headless: !HEADFUL,
    args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', ...extra],
  });
  const result = { ok: false, url: BASE, out: OUT, steps, errors, warnings };
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    watch(page);

    // 1. Title, the way a player opens the game.
    phase = 'title';
    await page.goto(`${BASE}?fresh=1`, { waitUntil: 'domcontentloaded', timeout: WAIT_MS });
    await page.waitForFunction(() => window.__echoes && window.__echoes.tick >= 0, null, { timeout: WAIT_MS });
    log(`game booted, version ${await page.evaluate(() => window.__echoes.version)}`);
    // The loading screen shows "Press any key" once its shader warm-up is done.
    // (No autoplay flag: like a player's browser, audio waits for that key.)
    await page.waitForFunction(
      () => !window.__echoes.app.stack().includes('loading') || !!document.querySelector('.ap-press.ap-on'),
      null,
      { timeout: WAIT_MS }
    );
    await page.keyboard.press('Enter');
    await page
      .waitForFunction(() => !window.__echoes.app.stack().includes('loading'), null, { timeout: 60000 })
      .catch(() => log('the loading screen did not close within 60 s'));
    // The sim does not tick on the title; wait on a few rendered frames instead.
    for (let i = 0; i < 5; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    log(`screen: ${JSON.stringify(await page.evaluate(() => ({ mode: window.__echoes.app.mode, stack: window.__echoes.app.stack() })))}`);
    await page.screenshot({ path: join(OUT, 'title.png') });

    // 2. Camp: straight in, then real input.
    phase = 'camp';
    await page.goto(`${BASE}?fresh=1&menu=0`, { waitUntil: 'domcontentloaded', timeout: WAIT_MS });
    await page.waitForFunction(() => window.__echoes && window.__echoes.tick >= 30, null, { timeout: WAIT_MS });
    await page.mouse.click(640, 360); // focus the canvas
    result.camp = await playInput(page);
    await page.screenshot({ path: join(OUT, 'camp.png') });

    // 3. The first room of a campaign run.
    phase = 'room1';
    const started = await page.evaluate(() => {
      try {
        return { ok: true, r: JSON.stringify(window.__echoes.cmd('startCampaign', { level: 1 })) };
      } catch (e) {
        return { ok: false, r: String(e) };
      }
    });
    log(`startCampaign: ${started.r}`);
    await page.waitForFunction(() => window.__echoes.entityCount > 4, null, { timeout: WAIT_MS }).catch(() => log('no foes counted within the wait'));
    await ticks(page, 60);
    result.room1 = await playInput(page);
    result.room1.entityCount = await page.evaluate(() => window.__echoes.entityCount);
    await page.screenshot({ path: join(OUT, 'room1.png') });
    phase = 'done';
    result.ok = errors.length === 0;
  } catch (e) {
    errors.push({ phase, kind: 'check', text: String((e && e.stack) || e) });
    result.ok = false;
  } finally {
    await browser.close().catch(() => {});
    stopServer(server);
  }
  writeFileSync(join(OUT, 'check-report.json'), JSON.stringify(result, null, 2));
  console.log(`\nscreenshots and report: ${OUT}`);
  console.log(`warnings: ${warnings.length}`);
  if (errors.length) {
    console.log(`FAIL: ${errors.length} error(s)`);
    for (const e of errors) console.log(`  [${e.phase}] ${e.kind}: ${e.text.split('\n').slice(0, 4).join('\n    ')}`);
    process.exit(1);
  }
  console.log('PASS: no console errors');
  process.exit(0);
}

main();
