// gntcparty5 — a guest's build survives a socket drop (reconnect) and a full page rejoin; drop-in onto an AI-built seat takes its build.
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep } from './gntM5b-lib.mjs';
const port = 7968; const base = (process.env.GNTC_BASE || 'http://127.0.0.1:5199/'); const SEAT = 3;
const out = { checks: [] };
const check = (w, ok, got) => { out.checks.push({ w, ok: !!ok, got }); console.log(`${ok ? 'PASS' : 'FAIL'} ${w}${ok ? '' : ' ' + JSON.stringify(got).slice(0, 500)}`); };
async function waitOn(c, src, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const r = await netEval(c, src).catch(() => null); if (r) return r; await sleep(100); } throw new Error('timeout ' + src.slice(0, 80)); }
const SIG = 'const P = E.content.world().partySystem(); return [1,2,3].map((s) => { const v = P.view(s); return v.slots.join(",") + "#" + v.skills.map((k) => k.sockets.map((x) => (x ? x.node : "-")).join(",")).join("|") + "#" + v.bench.map((b) => b.node).sort().join(",") + "#" + v.purse; });';
let srv = null; let browser = null;
try {
  srv = await startServer({ port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, autoplay: true, width: 1280, height: 720, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
  const host = await openClient(browser, { base, server: srv.url, name: 'Host', seed: 7, extra: { partygrant: '2' } });
  const code = await hostRoom(host);
  await startGame(host, []);
  await waitSession([host], 30000);
  await waitOn(host, 'return E.campaign.ready(1).ready;', 90000);
  await netEval(host, 'return E.campaign.choose(1);');
  await waitOn(host, 'const v = E.state().run; return v.phase === "combat" && v.room === 1;');
  await sleep(1500);
  // build the Archer seat (AI-held) a bit: clear room -> page (Suggested) -> commit
  await netEval(host, 'E.cmd("killAllEnemies"); return 1;');
  await waitOn(host, 'const v = E.state().run; return v.phase === "reward" && !!v.party;');
  await sleep(1300);
  await netEval(host, 'return E.cmd("draftTake");');
  await waitOn(host, 'return E.state().run.phase === "path";');
  const aiBuilt = await netEval(host, SIG);
  // drop-in onto the AI-built Archer seat
  const guest = await openClient(browser, { base, server: srv.url, name: 'Hare', seed: 8 });
  await joinRoom(guest, code, SEAT);
  await sleep(6000);
  const afterJoinH = await netEval(host, SIG); const afterJoinG = await netEval(guest, SIG).catch(() => null);
  check(`drop-in onto the AI-built Archer seat keeps its build (host ${afterJoinH[2].slice(0, 80)})`, afterJoinH[2] === aiBuilt[2], { aiBuilt: aiBuilt[2], afterJoinH: afterJoinH[2] });
  check('guest replica equals host (all three ally builds) after drop-in', JSON.stringify(afterJoinH) === JSON.stringify(afterJoinG), { afterJoinH, afterJoinG });
  const owners = await netEval(host, 'return E.content.world().partySystem().view(3).owner || null;').catch(() => null);
  out.owner = owners;
  // socket drop (reconnect)
  await netEval(guest, 'return n.drop ? n.drop(2500) : null;').catch(() => null);
  await sleep(9000);
  const afterDrop = await netEval(host, SIG);
  const gs = await netEval(guest, 'return n.session ? n.session.status() : null;').catch(() => null);
  check('socket drop 2.5 s -> reconnect: the Archer build unchanged on the host', afterDrop[2] === aiBuilt[2], { afterDrop: afterDrop[2] });
  out.guestStatusAfterDrop = gs;
  // full rejoin: close the guest page, open a new one, join the same seat
  await guest.page.close();
  await sleep(4000);
  const g2 = await openClient(browser, { base, server: srv.url, name: 'Hare', seed: 9 });
  const seat2 = await joinRoom(g2, code, SEAT).catch((e) => String(e));
  await sleep(6000);
  const afterRejoin = await netEval(host, SIG); const g2sig = await netEval(g2, SIG).catch(() => null);
  check(`full page rejoin (seat ${seat2}) keeps the Archer build on host and guest`, afterRejoin[2] === aiBuilt[2] && g2sig && g2sig[2] === aiBuilt[2], { afterRejoin: afterRejoin[2], g2: g2sig && g2sig[2] });
} catch (e) { check('ran', false, String(e.stack || e).slice(0, 600)); }
finally { if (browser) await browser.close().catch(() => {}); if (srv) await srv.stop(); writeFileSync('captures/gntfixPARTY5-rejoin.json', JSON.stringify(out, null, 1)); }
