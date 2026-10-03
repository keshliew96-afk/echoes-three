// gntfixM5b4-lib.mjs — fix-M5b-r4 (NET4-F2) probe helpers (own prefix; a copy of the
// few multi-browser helpers the probes need, so no other agent's tool is a dependency).
// Every client = its OWN browser process (own profile => own localStorage) unless a probe
// opens extra tabs in one browser on purpose.
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CAP = path.join(ROOT, 'captures');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const args = () => Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
export const WS = (p) => `ws://127.0.0.1:${p}/echoes`;

const GPU = ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl'];
export const BG = ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'];

export async function launch({ w = 960, h = 540 } = {}) {
  return puppeteer.launch({
    headless: true,
    protocolTimeout: 300000,
    defaultViewport: { width: w, height: h, deviceScaleFactor: 1 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', ...GPU, ...BG, `--window-size=${w},${h}`],
  });
}
export function tapPage(page, tag) {
  const errors = [];
  const consoleLines = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => { if (consoleLines.length < 4000) consoleLines.push(`[${m.type()}] ${m.text()}`); });
  return { page, errors, consoleLines, tag };
}
export async function gotoGame(page, url, { timeout = 180000 } = {}) {
  let lastErr = null;
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout });
      return;
    } catch (e) { lastErr = e; await sleep(1000); }
  }
  throw lastErr;
}
export async function openClient(url, { w = 960, h = 540, tag = 'c' } = {}) {
  const browser = await launch({ w, h });
  const page = (await browser.pages())[0] || (await browser.newPage());
  const c = tapPage(page, tag);
  await gotoGame(page, url);
  return { ...c, browser };
}
export async function closeClient(c) { try { await c.browser.close(); } catch { /* */ } }
export async function waitFor(page, fn, { timeout = 30000, poll = 100, arg } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { const v = await page.evaluate(fn, arg); if (v) return { ok: true, ms: Date.now() - t0, v }; } catch { /* navigating */ }
    await sleep(poll);
  }
  return { ok: false, ms: Date.now() - t0 };
}
export async function admin(port, p, body) {
  const r = await fetch(`http://127.0.0.1:${port}${p}`, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { status: r.status, text: t }; }
}
export function startServer(port, extra = [], logFile = null) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(ROOT, 'server', 'index.mjs'), '--port', String(port), ...extra], { cwd: ROOT });
    let out = '';
    const onData = (d) => {
      out += d.toString();
      if (logFile) fs.appendFileSync(logFile, d);
      if (/\[echoes-net\] ready/.test(out) && !proc._ready) { proc._ready = true; resolve({ proc, pid: proc.pid, out: () => out }); }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('exit', (code) => { if (!proc._ready) reject(new Error('server exit ' + code + ' ' + out)); });
    setTimeout(() => { if (!proc._ready) reject(new Error('server not ready ' + out)); }, 10000);
  });
}
export function writeJson(name, obj) { const f = path.join(CAP, name); fs.writeFileSync(f, JSON.stringify(obj, null, 1)); return f; }
export async function shot(page, name) { try { await page.screenshot({ path: path.join(CAP, name) }); return name; } catch (e) { return 'shot-failed:' + e.message; } }

// One page's game + session state (a compact row for trails).
export const snapState = (page) => page.evaluate(() => {
  const E = window.__echoes;
  const s = E.state();
  let lvl = null; try { lvl = E.campaign.state().level; } catch { /* */ }
  let g = null; try { const d = E.net.session.debugGuest(); g = d ? { synced: d.synced, desyncs: d.desyncs, frozen: d.frozen } : null; } catch { /* */ }
  const notes = [...document.querySelectorAll('.nt-note')].map((e) => e.textContent);
  const banner = [...document.querySelectorAll('div')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 40 && /host|waiting|lost|rejoin|reconnect/i.test(e.innerText || '') && (e.innerText || '').length < 180; }).map((e) => (e.innerText || '').replace(/\s+/g, ' ')).slice(-1)[0] || null;
  return { net: E.net.state, role: E.net.role, seat: E.net.seat, app: E.app.state, tick: E.tick, level: lvl, room: s.run && s.run.room, phase: s.run && s.run.phase, wallet: s.wallet, skills: (s.skills || []).filter(Boolean).map((k) => k.id).join(','), enemies: (s.enemies || []).length, g, notes, banner };
}).catch((e) => ({ err: String(e.message).slice(0, 120) }));

export const bodyText = (page) => page.evaluate(() => document.body.innerText || '').catch(() => '');
