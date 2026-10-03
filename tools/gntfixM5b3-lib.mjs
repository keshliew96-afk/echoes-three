// gntfixM5b3-lib.mjs — fix-M5b-r3 shared helpers (own prefix). Every client
// is its OWN browser process (own temp profile => own localStorage), with the
// multi-page background flags (PLAN §6.x multi-page harness rule).
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CAP = path.join(ROOT, 'captures');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const r2 = (x) => (x == null || !Number.isFinite(x) ? x : Math.round(x * 100) / 100);

export function args() {
  const a = {};
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (!v[i].startsWith('--')) continue;
    const k = v[i].slice(2);
    const n = v[i + 1];
    if (n !== undefined && !n.startsWith('--')) {
      a[k] = n;
      i++;
    } else a[k] = true;
  }
  return a;
}

const GPU = ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl'];
const BG = ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'];

export async function openClient(url, { w = 960, h = 540, tag = 'c' } = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 300000,
    defaultViewport: { width: w, height: h, deviceScaleFactor: 1 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', ...GPU, ...BG, `--window-size=${w},${h}`],
  });
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  const errors = [];
  const consoleLines = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => {
    if (consoleLines.length < 4000) consoleLines.push(`[${m.type()}] ${m.text()}`);
  });
  let lastErr = null;
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: 180000 });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      await sleep(1000);
    }
  }
  if (lastErr) throw lastErr;
  return { browser, page, errors, consoleLines, tag };
}
export async function closeClient(c) {
  try {
    await c.browser.close();
  } catch {
    /* */
  }
}
export async function waitFor(page, fn, { timeout = 30000, poll = 100, arg } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const v = await page.evaluate(fn, arg);
      if (v) return { ok: true, ms: Date.now() - t0, v };
    } catch {
      /* navigating */
    }
    await sleep(poll);
  }
  return { ok: false, ms: Date.now() - t0 };
}
export async function admin(port, p, body) {
  const r = await fetch(`http://127.0.0.1:${port}${p}`, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    return { status: r.status, text: t };
  }
}
export const setCond = (port, target, up, down = up) => admin(port, '/admin/conditioner', { target, up, down });

export function startServer(port, extra = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(ROOT, 'server', 'index.mjs'), '--port', String(port), ...extra], { cwd: ROOT });
    let out = '';
    const onData = (d) => {
      out += d.toString();
      if (/\[echoes-net\] ready/.test(out) && !proc._ready) {
        proc._ready = true;
        resolve({ proc, pid: proc.pid });
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('exit', (code) => {
      if (!proc._ready) reject(new Error('server exit ' + code + ' ' + out));
    });
    setTimeout(() => {
      if (!proc._ready) reject(new Error('server not ready ' + out));
    }, 10000);
  });
}

export async function bootSession({ base, port, n, names, seed = 5, w = 960, h = 540 }) {
  const ws = `ws://127.0.0.1:${port}/echoes`;
  const url = (nm) => `${base}?menu=0&seed=${seed}&netname=${nm}&net=${encodeURIComponent(ws)}`;
  const cl = await Promise.all(names.slice(0, n).map((x) => openClient(url(x), { w, h, tag: x })));
  await Promise.all(cl.map((c) => waitFor(c.page, () => window.__echoes.tick > 240, { timeout: 90000 })));
  const [H, ...G] = cl;
  const hr = await H.page.evaluate(async () => {
    const r = await window.__echoes.net.host({ visibility: 'private' });
    return { code: r.code, ok: r.ok };
  });
  for (const g of G) {
    await g.page.evaluate(async (c) => {
      const n = window.__echoes.net;
      await n.join(c);
      n.setReady(true);
    }, hr.code);
  }
  await sleep(400);
  await H.page.evaluate(() => window.__echoes.net.start());
  await Promise.all(G.map((g) => waitFor(g.page, () => window.__echoes.net.session.status().synced, { timeout: 20000, poll: 20 })));
  return { cl, code: hr.code };
}

export function writeJson(name, obj) {
  fs.mkdirSync(CAP, { recursive: true });
  const f = path.join(CAP, name);
  fs.writeFileSync(f, JSON.stringify(obj, null, 1));
  return f;
}
export async function shot(c, name) {
  try {
    fs.mkdirSync(CAP, { recursive: true });
    await c.page.screenshot({ path: path.join(CAP, name) });
    return name;
  } catch (e) {
    return 'shot-failed:' + e.message;
  }
}
export function pct(arr, p) {
  const a = arr.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  return a[Math.min(a.length - 1, Math.floor(a.length * p))];
}
