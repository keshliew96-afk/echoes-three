// gntfixM5b4-mprejoin.mjs — fix-M5b-r4 (NET4-F2), the Multiplayer-menu path: the host reloads, answers
// the title's offer with "Not now", opens Multiplayer, sees "Rejoin ABCDE — You were hosting — your
// party is waiting for you", presses it (Enter on the default) and resumes hosting the SAME run.
// A second browser tab of the host opened meanwhile must NOT show that button (live elsewhere).
// node tools/gntfixM5b4-mprejoin.mjs --port 7828 --base http://127.0.0.1:4307/
import { args, openClient, closeClient, gotoGame, tapPage, startServer, writeJson, shot, sleep, waitFor, snapState, bodyText, WS } from './gntfixM5b4-lib.mjs';

const A = args();
const port = Number(A.port || 7828);
const BASE = A.base || 'http://127.0.0.1:4307/';
const out = { tool: 'gntfixM5b4-mprejoin', port, checks: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 500)); };
const srv = await startServer(port, []);
const url = (n) => BASE + `?menu=0&seed=5&netname=${n}&net=${encodeURIComponent(WS(port))}`;
const plain = BASE + `?net=${encodeURIComponent(WS(port))}`;
const cl = await Promise.all(['MHost', 'MGuest'].map((n) => openClient(url(n), { w: 1280, h: 720, tag: n })));
const [H, G] = cl;
let T2 = null;
try {
  await Promise.all(cl.map((c) => waitFor(c.page, () => window.__echoes.tick > 240, { timeout: 120000 })));
  const code = await H.page.evaluate(async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  await G.page.evaluate(async (c) => { await window.__echoes.net.join(c); window.__echoes.net.setReady(true); }, code);
  await sleep(500);
  await H.page.evaluate(() => window.__echoes.net.start());
  await waitFor(G.page, () => { const d = window.__echoes.net.session.debugGuest(); return !!(d && d.synced); }, { timeout: 20000 });
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitFor(H.page, () => window.__echoes.state().run.phase === 'combat', { timeout: 20000 });
  await H.page.evaluate(() => { const E = window.__echoes; window.__rk = setInterval(() => { try { for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.6) E.cmd('setHp', m.id, m.maxHp); } catch { /* */ } }, 700); });
  await sleep(3000);
  out.before = await snapState(H.page);
  // Live host: a second tab of the host's browser opens Multiplayer — no Rejoin for the live session.
  const p2 = await H.browser.newPage();
  T2 = { ...tapPage(p2, 'MHost-tab2') };
  await gotoGame(p2, plain);
  await waitFor(p2, () => window.__echoes.app.state === 'title' || /press any key/i.test(document.body.innerText || ''), { timeout: 120000 });
  if (await p2.evaluate(() => window.__echoes.app.state !== 'title')) { await p2.keyboard.press('Enter'); await sleep(800); }
  await p2.evaluate(() => { const b = [...document.querySelectorAll('button, [data-nav]')].find((e) => /^multiplayer/i.test((e.innerText || '').trim())); if (b) b.click(); });
  await waitFor(p2, () => /Host a Game|Host a game|Join/i.test(document.body.innerText || ''), { timeout: 15000 });
  await sleep(1500);
  const t2txt = await bodyText(p2);
  out.tab2 = { rejoinShown: /Rejoin [A-Z0-9]{5}/.test(t2txt), text: t2txt.replace(/\s+/g, ' ').slice(0, 300) };
  await shot(p2, 'gntfixM5b4-mprejoin-tab2.png');
  check('second tab of the live host: Multiplayer shows no Rejoin', !out.tab2.rejoinShown, out.tab2);
  await p2.close();
  await H.page.bringToFront();
  // The host reloads, says "Not now" to the title offer, opens Multiplayer.
  const t0 = Date.now();
  await gotoGame(H.page, plain);
  let said = false;
  for (let k = 0; k < 80 && !said; k++) {
    await sleep(250);
    const txt = await bodyText(H.page);
    if (/Rejoin [A-Z0-9]{5}\?/.test(txt)) { await H.page.keyboard.press('Escape'); said = true; }
    else if (/press any key/i.test(txt)) await H.page.keyboard.press('Enter');
  }
  await sleep(600);
  await H.page.evaluate(() => { const b = [...document.querySelectorAll('button, [data-nav]')].find((e) => /^multiplayer/i.test((e.innerText || '').trim())); if (b) b.click(); });
  const shown = await waitFor(H.page, () => /Rejoin [A-Z0-9]{5}/.test(document.body.innerText || ''), { timeout: 15000 });
  await sleep(500);
  const mtxt = await bodyText(H.page);
  out.menu = { saidNotNow: said, rejoinShown: shown.ok, caption: (mtxt.match(/Rejoin [A-Z0-9]{5}[^\n]*\n?[^\n]*/) || [''])[0], sinceReloadMs: Date.now() - t0 };
  await shot(H.page, 'gntfixM5b4-mprejoin-menu.png');
  check('reloaded host: Multiplayer shows Rejoin with the host caption', shown.ok && /hosting/i.test(out.menu.caption), out.menu);
  const focusedIsRejoin = await H.page.evaluate(() => /Rejoin/i.test((document.activeElement && document.activeElement.innerText) || '') || !!document.querySelector('.nt-mp-rejoin.nv-focus, #nt-mp-rejoin[data-focus], .nt-mp-rejoin[data-nav-default]'));
  await H.page.keyboard.press('Enter');
  const hosted = await waitFor(H.page, () => window.__echoes.net.state === 'host' && window.__echoes.app.state === 'playing', { timeout: 20000, poll: 50 });
  await sleep(3000);
  out.after = { host: await snapState(H.page), guest: await snapState(G.page), focusedIsRejoin };
  await shot(H.page, 'gntfixM5b4-mprejoin-after.png');
  const b = out.before;
  const x = out.after.host;
  // Inside the grace the host resumes as HOST; after it (a slow reload), as the Healer guest — both keep the run.
  check('Rejoin from the menu keeps the run (host or, after the grace, Healer guest)', (hosted.ok || x.net === 'guest') && x.level === b.level && x.room === b.room && x.wallet >= b.wallet && x.skills === b.skills, { hosted: hosted.ok, host: x, before: b });
  check('guest keeps the run, synced', out.after.guest.level === b.level && out.after.guest.room === b.room && out.after.guest.g && out.after.guest.g.synced && out.after.guest.g.desyncs === 0, out.after.guest);
} catch (e) { out.crash = String(e.stack || e); console.error(e); }
finally {
  out.pageErrors = Object.fromEntries([...cl, ...(T2 ? [T2] : [])].map((c) => [c.tag, c.errors]));
  out.pass = out.checks.filter((c) => c.ok).length;
  out.total = out.checks.length;
  writeJson('gntfixM5b4-mprejoin.json', out);
  console.log(`${out.pass}/${out.total}`, 'pageErrors', JSON.stringify(out.pageErrors));
  await Promise.all(cl.map(closeClient));
  try { srv.proc.kill(); } catch { /* */ }
}
