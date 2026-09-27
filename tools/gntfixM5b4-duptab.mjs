// gntfixM5b4-duptab.mjs — fix-M5b-r4 (NET4-F2): "Duplicate tab" of a live host. Chrome copies the tab's
// sessionStorage into the duplicate, so the copy starts with the host tab's id. The copy must re-key
// (the live tab answers for that id), must not be offered the live session, and a session the copy
// then joins must be stored under its own id — the host tab's record untouched.
// node tools/gntfixM5b4-duptab.mjs --port 7826 --base http://127.0.0.1:4307/
import { args, launch, tapPage, gotoGame, openClient, closeClient, startServer, writeJson, sleep, waitFor, bodyText, WS } from './gntfixM5b4-lib.mjs';

const A = args();
const port = Number(A.port || 7826);
const BASE = A.base || 'http://127.0.0.1:4307/';
const out = { tool: 'gntfixM5b4-duptab', port, checks: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 500)); };
const srv = await startServer(port, []);
const browser = await launch();
const T1 = tapPage((await browser.pages())[0] || (await browser.newPage()), 'T1');
let G = null;
let T2 = null;
try {
  await gotoGame(T1.page, BASE + `?menu=0&seed=5&netname=DupHost&net=${encodeURIComponent(WS(port))}`);
  G = await openClient(BASE + `?menu=0&seed=5&netname=DupGuest&net=${encodeURIComponent(WS(port))}`, { tag: 'G' });
  await Promise.all([T1.page, G.page].map((p) => waitFor(p, () => window.__echoes.tick > 240, { timeout: 120000 })));
  const code = await T1.page.evaluate(async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  await G.page.evaluate(async (c) => { await window.__echoes.net.join(c); window.__echoes.net.setReady(true); }, code);
  await sleep(500);
  await T1.page.evaluate(() => window.__echoes.net.start());
  await waitFor(G.page, () => { const d = window.__echoes.net.session.debugGuest(); return !!(d && d.synced); }, { timeout: 20000 });
  await sleep(1500);
  const t1Id = await T1.page.evaluate(() => window.__echoes.net.tabId);
  const t1Rec = await T1.page.evaluate(() => localStorage.getItem('echoes.net.sessions'));
  // The duplicate: a new tab whose sessionStorage already holds the host tab's id.
  const p2 = await browser.newPage();
  T2 = tapPage(p2, 'T2');
  await p2.evaluateOnNewDocument((id) => { try { if (!sessionStorage.getItem('echoes.net.tab')) sessionStorage.setItem('echoes.net.tab', id); } catch { /* */ } }, t1Id);
  await gotoGame(p2, BASE + `?net=${encodeURIComponent(WS(port))}`);
  await waitFor(p2, () => window.__echoes.app.state === 'title' || /press any key/i.test(document.body.innerText || ''), { timeout: 120000 });
  if (await p2.evaluate(() => window.__echoes.app.state !== 'title')) await p2.keyboard.press('Enter');
  await sleep(3000);
  const t2 = await p2.evaluate(() => ({ tabId: window.__echoes.net.tabId, info: window.__echoes.net.rejoinInfo(), log: window.__echoes.net.log(40).filter((l) => /tab_rekeyed/.test(l.kind)), modal: /Rejoin [A-Z0-9]{5}\?/.test(document.body.innerText || ''), toasts: window.__echoes.app.toasts().map((t) => t.text) }));
  out.t1 = { tabId: t1Id };
  out.t2 = t2;
  check('the duplicate re-keys (a new tab id; the live tab answered for the copied one)', t2.tabId !== t1Id && t2.log.length === 1, { t1: t1Id, t2: t2.tabId, log: t2.log });
  check('the duplicate is not offered the live host session', !t2.modal && !t2.info, { modal: t2.modal, info: t2.info, toasts: t2.toasts });
  check('the duplicate says where the session is', t2.toasts.some((t) => /open in another tab/i.test(t)), t2.toasts);
  const t1After = await T1.page.evaluate(() => ({ net: window.__echoes.net.state, rec: localStorage.getItem('echoes.net.sessions') }));
  const recs = JSON.parse(t1After.rec || '{}');
  check('the host tab is untouched and its record stays under its own id', t1After.net === 'host' && recs[t1Id] && recs[t1Id].role === 'host', { net: t1After.net, ids: Object.keys(recs), before: JSON.parse(t1Rec || '{}')[t1Id] ? 'present' : 'absent' });
} catch (e) { out.crash = String(e.stack || e); console.error(e); }
finally {
  out.pageErrors = { T1: T1.errors, T2: T2 ? T2.errors : null, G: G ? G.errors : null };
  out.pass = out.checks.filter((c) => c.ok).length;
  out.total = out.checks.length;
  writeJson('gntfixM5b4-duptab.json', out);
  console.log(`${out.pass}/${out.total}`, 'pageErrors', JSON.stringify(out.pageErrors));
  if (G) await closeClient(G);
  await browser.close();
  try { srv.proc.kill(); } catch { /* */ }
}
