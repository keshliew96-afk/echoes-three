// gntfixM5b4-hostreload.mjs — fix-M5b-r4 (NET4-F2): the HOST's page goes away mid-run and comes
// back through the title's "Rejoin". Does the party keep its run?
// Host + 2 guests (own browsers), L1 campaign advanced to room 2 combat with Glint; then:
//   --mode reload : the host tab navigates to the plain link (+ ?net=) — an F5 / crashed tab;
//                   Rejoin accepted as soon as it shows (inside the 10 s grace)
//   --mode reopen : the host closes its tab and opens the link in a NEW tab of the same browser
//                   (the record belongs to a dead tab); Rejoin accepted at once
//   --mode late   : like reload, but Rejoin accepted only once the grace ran out and a guest
//                   became the host (migration path):
//                   the old host comes back as a guest on the Healer, the run is kept
// Records a 1 Hz trail, the keyframe resume figures, HUD notes, logs and screenshots.
// node tools/gntfixM5b4-hostreload.mjs --port 7821 --base http://127.0.0.1:4307/ --mode reload --out gntfixM5b4-hostreload-reload
import { args, openClient, closeClient, tapPage, gotoGame, startServer, writeJson, shot, sleep, waitFor, snapState, bodyText, WS } from './gntfixM5b4-lib.mjs';

const A = args();
const port = Number(A.port || 7821);
const BASE = A.base || 'http://127.0.0.1:4307/';
const MODE = A.mode || 'reload';
const OUT = A.out || `gntfixM5b4-hostreload-${MODE}${A.at ? '-' + A.at : ''}`;
const HOLD = Number(A.observe || 30);
const AT = A.at || 'room2'; // room2 | levelclear (the reload lands on the level-clear transition card)
const out = { tool: 'gntfixM5b4-hostreload', mode: MODE, port, base: BASE, trail: [], checks: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 500)); };
const srv = await startServer(port, ['--admin']);
const url = (n) => BASE + `?menu=0&seed=5&netname=${n}&net=${encodeURIComponent(WS(port))}`;
const cl = await Promise.all(['RHost', 'RGuestA', 'RGuestB'].map((n) => openClient(url(n), { tag: n })));
let [H, G1, G2] = cl;
const extraPages = [];
try {
  await Promise.all(cl.map((c) => waitFor(c.page, () => window.__echoes.tick > 240, { timeout: 120000 })));
  const code = await H.page.evaluate(async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  for (const g of [G1, G2]) await g.page.evaluate(async (c) => { await window.__echoes.net.join(c); window.__echoes.net.setReady(true); }, code);
  await sleep(500);
  await H.page.evaluate(() => window.__echoes.net.start());
  await Promise.all([G1, G2].map((g) => waitFor(g.page, () => { const d = window.__echoes.net.session.debugGuest(); return !!(d && d.synced); }, { timeout: 20000 })));
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitFor(H.page, () => window.__echoes.state().run.phase === 'combat', { timeout: 20000 });
  if (AT === 'levelclear') {
    await H.page.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
    await waitFor(H.page, () => { const s = window.__echoes.state(); return s.run.room === 8 && s.run.phase === 'combat'; }, { timeout: 20000 });
    await sleep(2500);
    for (let k = 0; k < 20; k++) { const ph = await H.page.evaluate(() => { const E = window.__echoes; try { E.cmd('bossHp', 0.001); } catch { /* */ } E.cmd('killAllEnemies'); return E.campaign.state().transitionState; }); if (ph !== 'none') break; await sleep(400); }
    await sleep(2300); // a keyframe taken on the card (every 2 s)
  } else {
    await H.page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
    await waitFor(H.page, () => window.__echoes.state().run.phase === 'reward', { timeout: 20000 });
    for (let k = 0; k < 6; k++) { const ph = await H.page.evaluate(() => window.__echoes.state().run.phase); if (ph === 'combat') break; await H.page.keyboard.press('Enter'); await sleep(900); }
  }
  const keepAlive = () => { const E = window.__echoes; window.__rk = setInterval(() => { try { for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.6) E.cmd('setHp', m.id, m.maxHp); } catch { /* */ } }, 700); };
  if (AT !== 'levelclear') {
    await H.page.evaluate(keepAlive);
    await sleep(3000);
  }
  out.beforeCampaign = await Promise.all([H, G1, G2].map((c) => c.page.evaluate(() => { const c2 = window.__echoes.campaign.state(); return { level: c2.level, transitionState: c2.transitionState, card: !!c2.card }; })));
  for (const c of [G1, G2]) await c.page.evaluate(() => { window.__lv = []; for (const t of ['level_clear', 'level_transit', 'level_start']) window.__echoes.on(t, (ev) => window.__lv.push({ type: t, tick: ev.tick })); });
  out.code = code;
  out.before = { host: await snapState(H.page), g1: await snapState(G1.page), g2: await snapState(G2.page) };
  out.before.stored = await H.page.evaluate(() => ({ sessions: localStorage.getItem('echoes.net.sessions'), legacy: localStorage.getItem('echoes.net.session'), tab: sessionStorage.getItem('echoes.net.tab') }));
  console.log('before', JSON.stringify(out.before).slice(0, 900));
  const t0 = Date.now();
  const plain = BASE + `?net=${encodeURIComponent(WS(port))}`;
  if (MODE === 'reopen') {
    const np = await H.browser.newPage();
    await H.page.close();
    const c = tapPage(np, 'RHost-tab2');
    extraPages.push(c);
    H = { ...H, page: np, errors: c.errors, consoleLines: c.consoleLines };
    await gotoGame(np, plain);
  } else {
    await gotoGame(H.page, plain);
  }
  out.navMs = Date.now() - t0;
  let accepted = null;
  let offer = null;
  let anyKeyPressed = false;
  const acceptAfter = 0;
  for (let k = 0; k < HOLD * 4; k++) {
    await sleep(250);
    const txt = await bodyText(H.page);
    if (!accepted) {
      if (/press any key/i.test(txt) && !/Rejoin [A-Z0-9]{5}\?/.test(txt) && !anyKeyPressed) { await H.page.keyboard.press('Enter').catch(() => {}); anyKeyPressed = true; }
      else if (/Rejoin [A-Z0-9]{5}\?/.test(txt)) {
        if (!offer) offer = { atS: (Date.now() - t0) / 1000, text: (txt.match(/Rejoin [A-Z0-9]{5}\?[^\n]*\n?[^\n]*/) || [''])[0] };
        // late: accept only once the room has migrated (a guest page hosts).
        const migrated = MODE !== 'late' || (await Promise.all([G1, G2].map((g) => g.page.evaluate(() => window.__echoes.net.state).catch(() => null)))).includes('host');
        if (Date.now() - t0 >= acceptAfter && migrated) {
          await H.page.keyboard.press('Enter').catch(() => {});
          accepted = Math.round((Date.now() - t0) / 100) / 10;
        }
      }
    }
    if (k % 4 === 3) out.trail.push({ s: Math.round((Date.now() - t0) / 100) / 10, host: await snapState(H.page), g1: await snapState(G1.page), g2: await snapState(G2.page) });
  }
  out.offer = offer;
  out.acceptedAtS = accepted;
  out.after = { host: await snapState(H.page), g1: await snapState(G1.page), g2: await snapState(G2.page) };
  out.hostResume = await H.page.evaluate(() => { try { return window.__echoes.net.stats().hostResume; } catch (e) { return String(e); } });
  out.netStats = { host: await H.page.evaluate(() => { const s = window.__echoes.net.stats(); return { hostResumes: s.hostResumes, migrations: s.migrations, reconnects: s.reconnects }; }) };
  out.logs = {
    hostSession: await H.page.evaluate(() => window.__echoes.net.session.log(80)).catch(() => null),
    hostNet: await H.page.evaluate(() => window.__echoes.net.log(60)).catch(() => null),
    g2Session: await G2.page.evaluate(() => window.__echoes.net.session.log(60)).catch(() => null),
    g2Net: await G2.page.evaluate(() => window.__echoes.net.log(60)).catch(() => null),
  };
  out.server = srv.out().split('\n').filter((l) => /host_resume|migrate|peer_dropped|peer_restored|reattach/.test(l)).slice(-20);
  await shot(H.page, `${OUT}-host.png`);
  await shot(G1.page, `${OUT}-g1.png`);
  const b = out.before.host;
  const a = out.after;
  const sameRun = AT === 'levelclear'
    ? (x) => x && x.level === 2 && x.phase === 'combat' && x.wallet >= b.wallet && x.skills === b.skills
    : (x) => x && x.level === b.level && x.room >= b.room && x.wallet >= b.wallet && x.skills === b.skills;
  if (AT === 'levelclear') out.guestLevelEvents = await Promise.all([G1, G2].map((c) => c.page.evaluate(() => window.__lv).catch(() => null)));
  if (MODE === 'late') {
    check('late Rejoin (after the grace): a guest took over, the old host plays the Healer as a guest', a.host.net === 'guest' && a.host.seat === 0, { host: a.host });
  } else {
    check('Rejoin offered to the reloaded host, host copy', !!offer && /hosting/.test(offer.text), offer);
    check('the host is back as HOST', a.host.net === 'host', { host: a.host.net, acceptedAtS: accepted });
    check('keyframe applied (hostResume.applied)', out.hostResume && out.hostResume.applied, out.hostResume);
  }
  check('host keeps the run (level/room/Glint/skills)', sameRun(a.host), { before: b, after: a.host });
  check('guest 1 keeps the run', sameRun(a.g1), a.g1);
  check('guest 2 keeps the run', sameRun(a.g2), a.g2);
  const guestsNow = [a.host, a.g1, a.g2].filter((x) => x.net === 'guest');
  check('every guest page synced, 0 desyncs', guestsNow.length === 2 && guestsNow.every((x) => x.g && x.g.synced && x.g.desyncs === 0), guestsNow.map((x) => ({ seat: x.seat, g: x.g })));
  const noIdle = out.trail.filter((r) => r.s > (accepted || 0) + 1).every((r) => [r.host, r.g1, r.g2].every((x) => !x.err ? x.phase !== 'idle' || x.app !== 'playing' : true));
  check('no page shows an idle camp after the resume', noIdle, null);
  const lostNotes = out.trail.flatMap((r) => [...(r.host.notes || []), ...(r.g1.notes || []), ...(r.g2.notes || [])]).filter((t) => /lost connection/.test(t));
  check('no false "lost connection" note', lostNotes.length === 0, [...new Set(lostNotes)]);
} catch (e) { out.crash = String(e.stack || e); console.error(e); }
finally {
  out.pageErrors = Object.fromEntries([...cl, ...extraPages].map((c) => [c.tag, c.errors]));
  out.pass = out.checks.filter((c) => c.ok).length;
  out.total = out.checks.length;
  writeJson(`${OUT}.json`, out);
  console.log(`${out.pass}/${out.total}`, 'pageErrors', JSON.stringify(out.pageErrors));
  await Promise.all(cl.map(closeClient));
  try { srv.proc.kill(); } catch { /* */ }
}
