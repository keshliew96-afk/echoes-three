#!/usr/bin/env node
// gntfixM5a1 — reconnect vs link-quality trace (own file): host page + guest
// page, the guest link at L20 for 12 s, then a 3 s server-admin socket drop;
// samples the guest's net.stats() quality / loss / snapshot age and net.log()
// every 200 ms around the reconnect.
//   node tools/gntfixM5a1-dropdbg.mjs --server ws://127.0.0.1:7810/echoes --base http://127.0.0.1:4306/
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchEchoes, waitReady } from './gnt-arch-browser.mjs';
import { openEchoesWindow } from './gntM5a-botlib.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argOf = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SERVER = argOf('server', 'ws://127.0.0.1:7810/echoes');
const BASE = argOf('base', 'http://127.0.0.1:4306/');
const COND = argOf('cond', 'lat75,jit10,loss20');
const HTTP = SERVER.replace(/^ws/, 'http').replace(/\/echoes$/, '');
const admin = async (p, body) => (await fetch(`${HTTP}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
const ev = (c, src, arg = null) => c.page.evaluate(new Function('arg', `return (async () => { const E = window.__echoes; const n = E.net; ${src} })()`), arg);

const browser = await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 });
const out = { trace: [] };
try {
  const open = async (name) => {
    const c = await openEchoesWindow(browser, `${BASE}?menu=0&seed=7&net=${encodeURIComponent(SERVER)}&netname=${name}`, { width: 1280, height: 720 });
    await waitReady(c.page, { minTick: 120, timeout: 150000 });
    return c;
  };
  const host = await open('DHost');
  const guest = await open('DGuest');
  const { code } = await ev(host, "return n.host({ visibility: 'private' });");
  await ev(guest, 'return n.join(arg);', code);
  await ev(guest, 'return n.setReady(true);');
  await ev(host, 'return n.start();');
  await sleep(4000);
  await ev(host, "E.cmd('startRun', { act: 1 }); E.cmd('autopilot', true); return true;");
  const gp = await ev(host, 'return n.peers().find((p) => p.peerId && !p.me).peerId;');
  await admin('/admin/conditioner', { target: gp, up: COND, down: COND });
  await sleep(12000);
  await admin('/admin/conditioner', { target: gp, up: 'off', down: 'off' });
  const t0 = Date.now();
  await admin('/admin/drop', { peerId: gp, mode: 'close', forMs: 3000 });
  while (Date.now() - t0 < 12000) {
    const s = await ev(guest, `const s = n.stats(); return { state: n.state, q: s.quality, in: s.lossInPct, out: s.lossOutPct, age: s.snapshotAgeMs, rtt: s.rttMs, notes: [...document.querySelectorAll('#nt-hud .nt-note')].map((x) => x.textContent), log: n.log(3).map((l) => l.kind) };`);
    out.trace.push({ t: Date.now() - t0, ...s });
    await sleep(200);
  }
  out.errors = { host: host.errors, guest: guest.errors };
} catch (err) {
  out.error = String(err && err.stack ? err.stack : err);
} finally {
  await browser.close().catch(() => {});
  writeFileSync(resolve(here, 'captures/gntfixM5a1-dropdbg.json'), JSON.stringify(out, null, 1));
  for (const x of out.trace) console.log(x.t, x.state, x.q ? `${x.q.level}:${x.q.reasons.join('+')}(raw ${x.q.raw})` : null, 'in', x.in, 'out', x.out, 'age', x.age, 'rtt', x.rtt, x.notes.length ? `NOTES ${x.notes.join(' / ')}` : '', x.log.join(','));
  if (out.error) console.log(out.error);
}
