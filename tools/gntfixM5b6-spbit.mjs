// gntfixM5b6-spbit.mjs — copy of the net critic's tools/gntcnet6-spbit.mjs (output renamed gntfixM5b6-spbit.json). Original: net critic r6: single-player bit-identity with and without the network layer.
// Each leg is a FRESH page (own browser). The sim is frozen at boot (?freeze=1) and stepped by sim.trace
// (scripted input, deterministic), so wall-clock never enters. Legs:
//   A  ?seed=7&scene=arena&room=kill_all&freeze=1           -> trace(600, 3)  (PLAN §6.5 ref eventsHash 817f1e9940c91d76)
//   B  same as A + a live server connection (hello/welcome, idle)
//   C  ?menu=0&seed=7&freeze=1 -> startCampaign L1 -> trace(3600, 3)  (a full campaign segment, no server)
//   D  same as C, again (fresh load)
//   E  same as C, but the page first connects, HOSTS a lobby room and leaves it (no game started)
// Pass: A == B == reference; C == D == E (events hash, state hash, event count).
// node tools/gntcnet6-spbit.mjs --port 7845
import { openClient, closeClient, startServer, writeJson, sleep, waitFor, PREVIEW } from './gntcnet6-lib.mjs';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7845);
const WSU = `ws://127.0.0.1:${port}/echoes`;
const out = { tool: 'gntcnet6-spbit', checks: [], legs: {} };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 600)); };
const srv = await startServer(port, []);
async function leg(name, url, { pre = null, campaign = false, n = 600 } = {}) {
  const c = await openClient(url, { w: 960, h: 540, tag: name });
  try {
    await waitFor(c.page, () => !!window.__echoes && !!window.__echoes.sim, { timeout: 60000 });
    let preR = null;
    if (pre) preR = await c.page.evaluate(pre, WSU);
    const r = await c.page.evaluate(async ([camp, nn]) => {
      const E = window.__echoes;
      E.sim.freeze();
      let start = null;
      if (camp) { try { start = E.cmd('startCampaign', { level: 1 }); start = start && typeof start === 'object' ? { phase: start.phase, level: start.level } : start; } catch (e) { start = 'ERR ' + e.message; } }
      const t = E.sim.trace(nn, 3);
      const s = E.state();
      return { fromTick: t.fromTick, toTick: t.toTick, stateHash: t.stateHash, eventsHash: t.eventsHash, eventCount: t.eventCount, types: Object.keys(t.byType || {}).length, start, phase: s.run && s.run.phase, room: s.run && s.run.room, wallet: s.wallet, net: E.net.state, replica: (typeof E.busCounters === 'function' ? E.busCounters() : E.busCounters || {}).replica };
    }, [campaign, n]);
    out.legs[name] = { ...r, pre: preR, errors: c.errors };
    console.log(name, JSON.stringify(out.legs[name]).slice(0, 400));
    return out.legs[name];
  } finally { await closeClient(c); }
}
try {
  const room = PREVIEW + '?seed=7&scene=arena&room=kill_all&freeze=1';
  const camp = PREVIEW + '?menu=0&seed=7&freeze=1';
  const connect = async (u) => { const n = window.__echoes.net; let r; try { r = await n.connect(u); } catch (e) { r = 'ERR ' + e.message; } await new Promise((res) => setTimeout(res, 1200)); return { r: typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : r, state: n.state }; };
  const hostLeave = async (u) => { const n = window.__echoes.net; const o = {}; try { o.connect = await n.connect(u); o.host = await n.host({ visibility: 'private' }); await new Promise((res) => setTimeout(res, 1500)); o.mid = n.state; await (n.leaveSession ? n.leaveSession() : n.leave()); await new Promise((res) => setTimeout(res, 1500)); o.after = n.state; } catch (e) { o.err = String(e.message || e); } return JSON.parse(JSON.stringify(o)); };
  const a = await leg('A', room);
  const b = await leg('B', room + '&net=' + encodeURIComponent(WSU), { pre: connect });
  check(`room trace: fresh load A = live-server load B (${a.eventsHash}/${a.stateHash} vs ${b.eventsHash}/${b.stateHash})`, a.eventsHash === b.eventsHash && a.stateHash === b.stateHash, { a, b });
  check(`room trace eventsHash = the PLAN §6.5 v0.5.0 reference 817f1e9940c91d76 (${a.eventsHash}, ${a.eventCount} events)`, a.eventsHash === '817f1e9940c91d76', a);
  const c = await leg('C', camp, { campaign: true, n: 3600 });
  const d = await leg('D', camp, { campaign: true, n: 3600 });
  const e = await leg('E', camp + '&net=' + encodeURIComponent(WSU), { campaign: true, n: 3600, pre: hostLeave });
  check(`campaign L1 3600-tick trace identical on two fresh loads (C ${c.eventsHash}/${c.stateHash} ${c.eventCount} ev, D ${d.eventsHash}/${d.stateHash})`, c.eventsHash === d.eventsHash && c.stateHash === d.stateHash && c.eventCount > 50, { c, d });
  check(`campaign trace identical after the page hosted and left a lobby room (E ${e.eventsHash}/${e.stateHash}; net ${e.net}, replica ${e.replica})`, e.eventsHash === c.eventsHash && e.stateHash === c.stateHash && !e.replica, { e });
} catch (err) { out.crash = String(err.stack || err); console.error(err); }
finally {
  out.pass = out.checks.filter((x) => x.ok).length; out.total = out.checks.length;
  writeJson('gntfixM5b6-spbit.json', out);
  console.log(`${out.pass}/${out.total}`);
  try { srv.proc.kill(); } catch { /* */ }
}
