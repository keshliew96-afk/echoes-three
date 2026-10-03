// gntfixM5b4-killsp.mjs — fix-M5b-r4 regression: the session server is killed mid-run.
// Every in-session page must reach the title with "Connection to the server was lost", must NOT be
// offered "Rejoin ABCDE? … your party is waiting / your seat is held" for a server that is gone
// (the offer now probes the server first), and single-player New Game must work by the player path.
// node tools/gntfixM5b4-killsp.mjs --port 7825 --base http://127.0.0.1:4307/
import { args, openClient, closeClient, startServer, writeJson, shot, sleep, waitFor, snapState, bodyText, WS } from './gntfixM5b4-lib.mjs';

const A = args();
const port = Number(A.port || 7825);
const BASE = A.base || 'http://127.0.0.1:4307/';
const out = { tool: 'gntfixM5b4-killsp', port, checks: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 500)); };
const srv = await startServer(port, []);
const url = (n) => BASE + `?menu=0&seed=5&netname=${n}&net=${encodeURIComponent(WS(port))}`;
const cl = await Promise.all(['KHost', 'KGuest'].map((n) => openClient(url(n), { tag: n })));
const [H, G] = cl;
try {
  await Promise.all(cl.map((c) => waitFor(c.page, () => window.__echoes.tick > 240, { timeout: 120000 })));
  const code = await H.page.evaluate(async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  await G.page.evaluate(async (c) => { await window.__echoes.net.join(c); window.__echoes.net.setReady(true); }, code);
  await sleep(500);
  await H.page.evaluate(() => window.__echoes.net.start());
  await waitFor(G.page, () => { const d = window.__echoes.net.session.debugGuest(); return !!(d && d.synced); }, { timeout: 20000 });
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitFor(H.page, () => window.__echoes.state().run.phase === 'combat', { timeout: 20000 });
  await sleep(2000);
  const t0 = Date.now();
  srv.proc.kill();
  const res = await Promise.all(cl.map(async (c) => {
    const w = await waitFor(c.page, () => window.__echoes.app.state === 'title' && window.__echoes.app.toasts().some((t) => /connection to the server was lost/i.test(t.text)), { timeout: 40000, poll: 200 });
    await sleep(8000); // an offer would show within ~0.5-1 s of the title (a dead server answers the probe in ~5 s on Windows)
    const txt = await bodyText(c.page);
    return { tag: c.tag, titleMs: w.ms, message: w.ok, rejoinModal: /Rejoin [A-Z0-9]{5}\?/.test(txt), log: await c.page.evaluate(() => window.__echoes.net.session.log(20).filter((l) => /rejoin|session_end/.test(l.kind))).catch(() => null) };
  }));
  out.kill = res;
  for (const c of cl) await shot(c.page, `gntfixM5b4-killsp-${c.tag}.png`);
  check('every in-session page reaches the title with "Connection to the server was lost"', res.every((r) => r.message), res.map((r) => ({ tag: r.tag, ms: r.titleMs })));
  check('no Rejoin offer for a server that is gone (it was probed)', res.every((r) => !r.rejoinModal), res.map((r) => ({ tag: r.tag, modal: r.rejoinModal, log: r.log })));
  // Single-player by the player path on the guest page: New Game (Enter on the focused title item or a click).
  const P = G.page;
  const box = await P.evaluate(() => { const b = [...document.querySelectorAll('button, [data-nav]')].find((e) => /^new game/i.test((e.innerText || '').trim())); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (box) await P.mouse.click(box.x, box.y);
  await sleep(1200);
  // A confirm (New Game over an autosave) takes its default.
  const conf = await P.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => /^(start new game|new game|start|yes)$/i.test((e.innerText || '').trim()) && e.closest('[role="dialog"], .ap-dialog')); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (conf) { await P.mouse.click(conf.x, conf.y); await sleep(800); }
  const camp = await waitFor(P, () => window.__echoes.app.state === 'playing' && window.__echoes.state().scene === 'camp', { timeout: 20000 });
  const a = await P.evaluate(() => ({ tick: window.__echoes.tick, x: window.__echoes.state().party[0].x }));
  await P.keyboard.down('KeyD'); await sleep(900); await P.keyboard.up('KeyD'); await sleep(300);
  const b = await P.evaluate(() => ({ tick: window.__echoes.tick, x: window.__echoes.state().party[0].x, net: window.__echoes.net.state }));
  out.sp = { clicked: !!box, confirm: !!conf, camp: camp.ok, ticks: b.tick - a.tick, dx: Math.round((b.x - a.x) * 100) / 100, net: b.net };
  check('single-player New Game works afterwards (camp, ticking, walks)', camp.ok && b.tick - a.tick > 40 && b.x - a.x > 0.5, out.sp);
  out.guestAfter = await snapState(P);
} catch (e) { out.crash = String(e.stack || e); console.error(e); }
finally {
  out.pageErrors = Object.fromEntries(cl.map((c) => [c.tag, c.errors]));
  out.pass = out.checks.filter((c) => c.ok).length;
  out.total = out.checks.length;
  writeJson('gntfixM5b4-killsp.json', out);
  console.log(`${out.pass}/${out.total}`, 'pageErrors', JSON.stringify(out.pageErrors));
  await Promise.all(cl.map(closeClient));
  try { srv.proc.kill(); } catch { /* */ }
}
