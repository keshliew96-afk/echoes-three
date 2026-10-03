// gntfixM5b4-takeover.mjs — fix-M5b-r4 (NET4-F2), the two paths the hostreload probe does not take:
//   --case steal  : the host's session is resumed by ANOTHER page that cannot see the live host tab
//                   (another browser profile holding the host's record — the server-side safety net
//                   for a frozen tab that cannot answer the live-tab query). The server supersedes the
//                   live socket; the new page must resume the RUN from the keyframe (never a fresh camp)
//                   and the old tab must say where the session went.
//   --case reward : the host reloads while the party sits on the between-room reward page (the host's
//                   choice) and rejoins from the title: the reward page must come back on the host, the
//                   guest keeps its read-only banner, and taking the reward moves the run on.
// Host + 1 guest (own browsers) on L1; room 1 cleared -> reward page.
// node tools/gntfixM5b4-takeover.mjs --port 7823 --base http://127.0.0.1:4307/ --case steal
import { args, openClient, closeClient, tapPage, gotoGame, launch, startServer, writeJson, shot, sleep, waitFor, snapState, bodyText, WS } from './gntfixM5b4-lib.mjs';

const A = args();
const port = Number(A.port || 7823);
const BASE = A.base || 'http://127.0.0.1:4307/';
const CASE = A.case || 'steal';
const OUT = A.out || `gntfixM5b4-takeover-${CASE}`;
const out = { tool: 'gntfixM5b4-takeover', case: CASE, port, base: BASE, trail: [], checks: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 500)); };
const srv = await startServer(port, ['--admin']);
const url = (n) => BASE + `?menu=0&seed=5&netname=${n}&net=${encodeURIComponent(WS(port))}`;
const plain = BASE + `?net=${encodeURIComponent(WS(port))}`;
const cl = await Promise.all(['THost', 'TGuest'].map((n) => openClient(url(n), { tag: n })));
const [H, G] = cl;
let S = null;
const runPage = (page) => page.evaluate(() => { try { const d = window.__echoes.runUi(); return { screen: window.__echoes.app.state, buttons: d && d.buttons, cards: d && d.cards ? d.cards.length : null }; } catch (e) { return { err: String(e.message) }; } }).catch((e) => ({ err: String(e.message) }));
const toasts = (page) => page.evaluate(() => { try { return window.__echoes.app.toasts ? window.__echoes.app.toasts() : [...document.querySelectorAll('[class*="toast"]')].map((e) => e.textContent); } catch { return null; } }).catch(() => null);
try {
  await Promise.all(cl.map((c) => waitFor(c.page, () => window.__echoes.tick > 240, { timeout: 120000 })));
  const code = await H.page.evaluate(async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  await G.page.evaluate(async (c) => { await window.__echoes.net.join(c); window.__echoes.net.setReady(true); }, code);
  await sleep(500);
  await H.page.evaluate(() => window.__echoes.net.start());
  await waitFor(G.page, () => { const d = window.__echoes.net.session.debugGuest(); return !!(d && d.synced); }, { timeout: 20000 });
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitFor(H.page, () => window.__echoes.state().run.phase === 'combat', { timeout: 20000 });
  await H.page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
  await waitFor(H.page, () => window.__echoes.state().run.phase === 'reward', { timeout: 20000 });
  await sleep(3000); // >= one keyframe (2 s) on the reward page
  out.code = code;
  out.before = { host: await snapState(H.page), guest: await snapState(G.page), hostRun: await runPage(H.page), guestText: (await bodyText(G.page)).match(/[^\n]*choosing[^\n]*/i)?.[0] || null };
  console.log('before', JSON.stringify(out.before).slice(0, 700));
  let R = null; // the page that should end up hosting
  const t0 = Date.now();
  if (CASE === 'steal') {
    const rec = await H.page.evaluate(() => localStorage.getItem('echoes.net.sessions'));
    const b3 = await launch();
    const p3 = (await b3.pages())[0] || (await b3.newPage());
    S = { ...tapPage(p3, 'TSteal'), browser: b3 };
    await gotoGame(p3, plain);
    await waitFor(p3, () => window.__echoes.app.state === 'title' || /press any key/i.test(document.body.innerText || ''), { timeout: 120000 });
    // Another profile holding the host's record (its tab id is not this page's).
    const injected = await p3.evaluate((r) => { const m = JSON.parse(r); for (const k of Object.keys(m)) m[k].tabId = 'deadbeefdeadbeef'; localStorage.setItem('echoes.net.sessions', JSON.stringify({ deadbeefdeadbeef: Object.values(m).find((x) => x.role === 'host') })); return window.__echoes.net.rejoinInfo(); }, rec);
    out.injected = injected;
    out.rejoin = await p3.evaluate(async (c) => window.__echoes.net.rejoin({ code: c }), code);
    R = S;
  } else {
    await gotoGame(H.page, plain);
    let pressed = false;
    for (let k = 0; k < 120; k++) {
      await sleep(250);
      const txt = await bodyText(H.page);
      if (/Rejoin [A-Z0-9]{5}\?/.test(txt)) { out.offer = (txt.match(/Rejoin [A-Z0-9]{5}\?[^\n]*\n?[^\n]*/) || [''])[0]; await H.page.keyboard.press('Enter'); break; }
      if (/press any key/i.test(txt) && !pressed) { await H.page.keyboard.press('Enter'); pressed = true; }
    }
    R = H;
  }
  const hosted = await waitFor(R.page, () => window.__echoes.net.state === 'host' && window.__echoes.app.state === 'playing', { timeout: 20000, poll: 50 });
  out.hostedMs = hosted.ms;
  await sleep(2500);
  out.after = { resumed: await snapState(R.page), guest: await snapState(G.page), resumedRun: await runPage(R.page), hostResume: await R.page.evaluate(() => window.__echoes.net.stats().hostResume), guestText: (await bodyText(G.page)).match(/[^\n]*choosing[^\n]*/i)?.[0] || null };
  if (CASE === 'steal') {
    out.after.oldTab = await snapState(H.page);
    out.after.oldTabText = (await bodyText(H.page)).replace(/\s+/g, ' ').slice(0, 400);
    out.after.oldTabToasts = await toasts(H.page);
    await shot(H.page, `${OUT}-oldtab.png`);
  }
  await shot(R.page, `${OUT}-host.png`);
  await shot(G.page, `${OUT}-guest.png`);
  const b = out.before.host;
  const x = out.after.resumed;
  check('the resuming page hosts', hosted.ok, { ms: hosted.ms });
  check('run kept on the new host page (L1 room 1 reward, Glint)', x.level === b.level && x.room === b.room && x.phase === 'reward' && x.wallet === b.wallet && x.skills === b.skills, { before: b, after: x });
  check('guest keeps the run and is synced, 0 desyncs', out.after.guest.phase === 'reward' && out.after.guest.wallet === b.wallet && out.after.guest.g && out.after.guest.g.synced && out.after.guest.g.desyncs === 0, out.after.guest);
  check('reward page back on the host (buttons shown)', Array.isArray(out.after.resumedRun.buttons) && out.after.resumedRun.buttons.length > 0, out.after.resumedRun);
  if (CASE === 'steal') {
    check('the superseded tab is back on the title and says where the session went', out.after.oldTab.app === 'title' && /another window|another tab/i.test(out.after.oldTabText + JSON.stringify(out.after.oldTabToasts || '')), { app: out.after.oldTab.app, text: out.after.oldTabText.slice(0, 200), toasts: out.after.oldTabToasts });
  }
  // Take the reward on the new host -> the run moves on for both.
  await R.page.bringToFront();
  for (let k = 0; k < 8; k++) {
    const ph = await R.page.evaluate(() => window.__echoes.state().run.phase);
    if (ph === 'combat') break;
    await R.page.keyboard.press('Enter');
    await sleep(900);
  }
  await sleep(1500);
  out.moved = { host: await snapState(R.page), guest: await snapState(G.page) };
  check('taking the reward moves the run on for both (room 2 combat)', out.moved.host.room === b.room + 1 && out.moved.host.phase === 'combat' && out.moved.guest.room === b.room + 1, out.moved);
} catch (e) { out.crash = String(e.stack || e); console.error(e); }
finally {
  out.pageErrors = Object.fromEntries([...cl, ...(S ? [S] : [])].map((c) => [c.tag, c.errors]));
  out.pass = out.checks.filter((c) => c.ok).length;
  out.total = out.checks.length;
  writeJson(`${OUT}.json`, out);
  console.log(`${out.pass}/${out.total}`, 'pageErrors', JSON.stringify(out.pageErrors));
  await Promise.all([...cl, ...(S ? [S] : [])].map(closeClient));
  try { srv.proc.kill(); } catch { /* */ }
}
