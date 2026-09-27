#!/usr/bin/env node
// fix-INT-r4 J4-F3: the guest is told when the host quits to the lobby — and only then.
// Own session server (--port, INT range 7830-7839), host + guest in two browser processes, debug-driven session setup.
//   Q1 host Quit to Lobby (the pause menu's abandonRun path) mid-combat in Level 1 -> the guest shows ONE toast naming
//      the host, the quit and the camp within 3 s, and is in camp
//   Q2 a normal end (defeat -> end card -> return to camp) -> the guest shows no quit toast
//   Q3 a single-player Quit to Lobby -> no toast (nobody to tell)
//   Q4 0 page errors
//   node tools/gntfixINT4-mpquit.mjs [--url http://127.0.0.1:4310] [--port 7832] [--tag x]
import { writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes } from './gnt-arch-browser.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4310'); const port = Number(arg('port', 7832)); const tag = arg('tag', 'x');
const sleep = (t) => new Promise((r) => setTimeout(r, t));
const checks = []; let fails = 0;
const check = (n, ok, d) => { checks.push({ n, ok: !!ok, d }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${String(JSON.stringify(d ?? null)).slice(0, 700)}`); };
async function waitFor(page, fn, a, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(fn, a)) return Date.now() - t0; } catch { /* */ } await sleep(100); } return -1; }
const server = spawn(process.execPath, [join(root, 'server', 'index.mjs'), '--port', String(port)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const ws = encodeURIComponent(`ws://127.0.0.1:${port}/echoes`);
const errors = [];
async function client(name) {
  const browser = await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 });
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${String(e && e.message ? e.message : e)}`));
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(`${base}/?menu=0&seed=5&fresh=1&netname=${name}&net=${ws}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 240, { timeout: 180000 });
  return { browser, page };
}
const recorder = () => { window.__tq = []; setInterval(() => { try { for (const t of window.__echoes.app.toasts() || []) { const s = typeof t === 'string' ? t : t.text; if (s && !window.__tq.some((x) => x.text === s)) window.__tq.push({ at: Math.round(performance.now()), text: s }); } } catch { /* */ } }, 50); };
const out = { schema: 'gntfixINT4-mpquit/1', at: new Date().toISOString(), base, port, tag, checks };
let H = null; let G = null; let S = null;
try {
  [H, G] = await Promise.all([client('Kesh'), client('Wren')]);
  const code = await H.page.evaluate(async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  await G.page.evaluate(async (c) => { await window.__echoes.net.join(c); window.__echoes.net.setReady(true); }, code);
  await sleep(500);
  await H.page.evaluate(() => window.__echoes.net.start());
  await waitFor(G.page, () => { const d = window.__echoes.net.session.debugGuest(); return !!(d && d.synced); }, null, 25000);
  await G.page.evaluate(recorder);
  // Q1
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitFor(G.page, () => window.__echoes.state().run.phase === 'combat', null, 20000);
  await sleep(2500);
  const t0 = await G.page.evaluate(() => performance.now());
  await H.page.evaluate(() => window.__echoes.cmd('abandonRun', 'quit'));
  const inCamp = await waitFor(G.page, () => window.__echoes.app.mode === 'camp' && !window.__echoes.state().run.active, null, 8000);
  await sleep(3000);
  const q1 = await G.page.evaluate((tt) => window.__tq.filter((x) => x.at >= tt).map((x) => ({ ms: Math.round(x.at - tt), text: x.text })), t0);
  await G.page.screenshot({ path: join(root, 'captures', `gntfixINT4-mpquit-${tag}-guest-q1.png`) });
  const quitToasts = q1.filter((x) => /quit to the lobby/i.test(x.text));
  check('Q1 host Quit to Lobby mid-combat -> the guest shows ONE toast naming the host, the quit and the camp within 3 s', inCamp >= 0 && quitToasts.length === 1 && /Kesh \(host\)/.test(quitToasts[0].text) && /camp/.test(quitToasts[0].text) && quitToasts[0].ms <= 3000, { inCampMs: inCamp, toasts: q1 });
  // Q2
  await sleep(4000);
  const t1 = await G.page.evaluate(() => performance.now());
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitFor(G.page, () => window.__echoes.state().run.phase === 'combat', null, 20000);
  await sleep(1500);
  await H.page.evaluate(() => window.__echoes.cmd('endRun', 'defeat'));
  await sleep(1500);
  await H.page.evaluate(() => window.__echoes.cmd('returnToCamp'));
  const inCamp2 = await waitFor(G.page, () => window.__echoes.app.mode === 'camp' && !window.__echoes.state().run.active, null, 15000);
  await sleep(2500);
  const q2 = await G.page.evaluate((tt) => window.__tq.filter((x) => x.at >= tt).map((x) => ({ ms: Math.round(x.at - tt), text: x.text })), t1);
  check('Q2 a normal end (defeat -> camp) shows the guest no quit toast', inCamp2 >= 0 && !q2.some((x) => /quit to the lobby/i.test(x.text)), { inCampMs: inCamp2, toasts: q2 });
  // Q3 single player
  const b3 = await launchEchoes({ gpu: true });
  const p3 = await b3.newPage(); p3.on('pageerror', (e) => errors.push(`sp: ${String(e)}`));
  await p3.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await p3.goto(`${base}/?menu=0&seed=5&fresh=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p3.waitForFunction(() => window.__echoes && window.__echoes.tick > 240, { timeout: 180000 });
  await p3.evaluate(recorder);
  await p3.evaluate(() => window.__echoes.cmd('startRun'));
  await sleep(1500);
  await p3.evaluate(() => window.__echoes.cmd('abandonRun', 'quit'));
  await sleep(2500);
  const q3 = await p3.evaluate(() => window.__tq);
  check('Q3 a single-player Quit to Lobby shows no quit toast', !q3.some((x) => /quit to the lobby/i.test(x.text)), q3);
  S = b3;
  check('Q4 0 page errors', errors.length === 0, errors.slice(0, 4));
} catch (e) { out.harnessError = String((e && e.stack) || e); console.error(e); fails++; }
finally {
  for (const c of [H, G]) { try { if (c) await c.browser.close(); } catch { /* */ } }
  try { if (S) await S.close(); } catch { /* */ }
  try { server.kill(); } catch { /* */ }
}
out.fails = fails;
writeFileSync(join(root, 'captures', `gntfixINT4-mpquit-${tag}.json`), JSON.stringify(out, null, 1));
console.log(`${checks.length - checks.filter((c) => !c.ok).length}/${checks.length}`);
process.exit(fails ? 1 : 0);
