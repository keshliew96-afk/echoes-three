// M5b multi-client harness helpers (network play probes). Owner: M5b.
// Uses the committed launcher (tools/gnt-arch-browser.mjs) and M5a's
// one-window-per-page opener (tools/gntM5a-botlib.mjs) read-only.
//
//   const srv = await startServer({ port: 7821, admin: true, cond: null });
//   const browser = await launchEchoes({ gpu: true, background: true });
//   const host = await openClient(browser, { url, server: srv.url, name: 'Host', seed: 7 });
//   const guest = await openClient(browser, { ... name: 'Guest' });
//   const code = await hostRoom(host); await joinRoom(guest, code); await startGame(host, [guest]);
//   await waitSession([host, guest]);
//   ... srv.stop();
import { spawn } from 'node:child_process';
import { launchEchoes, waitReady } from './gnt-arch-browser.mjs';
import { openEchoesWindow } from './gntM5a-botlib.mjs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export { launchEchoes };

export function startServer({ port, admin = true, cond = null, host = null, extra = [] } = {}) {
  return new Promise((resolve, reject) => {
    const args = ['server/index.mjs', '--port', String(port)];
    if (admin) args.push('--admin');
    if (cond) args.push('--cond', cond);
    if (host) args.push('--host', host);
    args.push(...extra);
    const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const timer = setTimeout(() => reject(new Error(`server on ${port} not ready: ${out}`)), 10000);
    p.stdout.on('data', (d) => {
      out += d.toString();
      if (out.includes('[echoes-net] ready')) {
        clearTimeout(timer);
        resolve({
          proc: p,
          pid: p.pid,
          port,
          url: `ws://127.0.0.1:${port}/echoes`,
          http: `http://127.0.0.1:${port}`,
          out: () => out,
          stop: () =>
            new Promise((res) => {
              if (p.exitCode !== null) return res();
              p.once('exit', () => res());
              p.kill();
              setTimeout(res, 2000);
            }),
        });
      }
    });
    p.stderr.on('data', (d) => {
      out += d.toString();
    });
    p.on('exit', (code) => {
      clearTimeout(timer);
      if (!out.includes('[echoes-net] ready')) reject(new Error(`server exited ${code}: ${out}`));
    });
  });
}

export async function admin(srv, path, body = null) {
  const res = await fetch(`${srv.http}${path}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  return res.json().catch(() => null);
}

// tab: true opens the page as a TAB of the default window (openTab); a later
// cover tab (openCover) hides it, c.page.bringToFront() shows it again.
export async function openClient(browser, { base = 'http://127.0.0.1:5199/', server, name, seed = 7, extra = {}, w = 1280, h = 720, tab = false } = {}) {
  const q = new URLSearchParams({ menu: '0', seed: String(seed), net: server, netname: name, ...extra });
  const url = `${base}${base.includes('?') ? '&' : '?'}${q.toString()}`;
  const c = tab ? await openTab(browser, url, { width: w, height: h }) : await openEchoesWindow(browser, url, { width: w, height: h });
  c.name = name;
  c.url = url;
  await waitReady(c.page, { minTick: 120, timeout: 150000 });
  await c.page.evaluate(() => (window.__gntMark = true));
  return c;
}

export const netEval = (c, fnSrc, arg = null) => c.page.evaluate(new Function('arg', `return (async () => { const E = window.__echoes; const n = E.net; ${fnSrc} })()`), arg);

export async function hostRoom(c, visibility = 'private') {
  const r = await netEval(c, `return n.host({ visibility: arg });`, visibility);
  if (!r || !r.ok) throw new Error(`host failed: ${JSON.stringify(r)}`);
  return r.code;
}
export async function joinRoom(c, code, seat = null) {
  const r = await netEval(c, `return n.join(arg.code, arg.seat);`, { code, seat });
  if (!r || !r.ok) throw new Error(`${c.name} join failed: ${JSON.stringify(r)}`);
  return r.seat;
}
export async function startGame(host, guests) {
  for (const g of guests) await netEval(g, 'return n.setReady(true);');
  const r = await netEval(host, 'return n.start();');
  if (!r || !r.ok) throw new Error(`start failed: ${JSON.stringify(r)}`);
}
export async function waitSession(clients, timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const st = await Promise.all(clients.map((c) => netEval(c, 'const s = n.session ? n.session.status() : null; return s ? { role: s.role, synced: s.synced } : null;').catch(() => null)));
    if (st.every((s) => s && s.role !== 'none' && s.synced)) return st;
    await sleep(250);
  }
  throw new Error('session did not start / sync in time');
}
export const stats = (c) => netEval(c, 'return n.stats();');

// Hold keys for ms on a page (real puppeteer keyboard = trusted events).
export async function holdKeys(c, codes, ms) {
  for (const k of codes) await c.page.keyboard.down(k);
  await sleep(ms);
  for (const k of codes) await c.page.keyboard.up(k);
}

export function assertNoReload(clients) {
  return Promise.all(clients.map((c) => c.page.evaluate(() => window.__gntMark === true).catch(() => false))).then((ok) => {
    const bad = clients.filter((_, i) => !ok[i]).map((c) => c.name);
    if (bad.length) throw new Error(`navigation: ${bad.join(', ')} reloaded`);
  });
}

export function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}

// A game page as a tab of the browser's default window.
export async function openTab(browser, url, { width = 1280, height = 720, timeout = 180000 } = {}) {
  const page = await browser.newPage();
  const errors = [];
  const consoleLines = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout });
  return { page, errors, consoleLines };
}
// A blank tab in front of the tabs opened with openTab: they become hidden
// (document.visibilityState === 'hidden'); c.page.bringToFront() shows one
// again, cover.bringToFront() hides it.
export async function openCover(browser) {
  const page = await browser.newPage();
  await page.goto('about:blank');
  return page;
}
export const visibility = (c) => c.page.evaluate(() => document.visibilityState);
