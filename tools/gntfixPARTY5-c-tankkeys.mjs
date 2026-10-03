// gntcparty5 — human Tank seat (guest) presses 4 (Whirling Guard) FIRST while room 1 is alive; then 3, 2, 1.
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep } from './gntM5b-lib.mjs';
const port = 7965; const base = (process.env.GNTC_BASE || 'http://127.0.0.1:5199/'); const SEAT = 1;
const out = { res: [] };
let srv = null; let browser = null;
async function waitOn(c, src, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const r = await netEval(c, src).catch(() => null); if (r) return r; await sleep(80); } throw new Error('timeout ' + src.slice(0, 80)); }
try {
  srv = await startServer({ port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, autoplay: true, width: 1280, height: 720, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
  const host = await openClient(browser, { base, server: srv.url, name: 'Host', seed: 7 });
  const guest = await openClient(browser, { base, server: srv.url, name: 'Badger', seed: 8 });
  const code = await hostRoom(host);
  await joinRoom(guest, code, SEAT);
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  await netEval(host, 'window.__pe = []; for (const t of ["ally_cast","intent_denied","seat_denied"]) E.on(t, (e) => window.__pe.push({ ...e, at: E.tick })); return 1;');
  await waitOn(host, 'return E.campaign.ready(1).ready;', 90000);
  await netEval(host, 'return E.campaign.choose(1);');
  await waitOn(guest, 'const v = E.state().run; return v.phase === "combat" && v.room === 1;');
  await sleep(1200);
  await guest.page.bringToFront();
  for (const k of ['4', '3', '2', '1', '4']) {
    const n0 = await netEval(host, 'return window.__pe.length;');
    const alive = await netEval(host, 'return (E.state().enemies || []).filter((e) => e.hp > 0).length;').catch(() => null);
    const cds = await netEval(guest, 'const me = (E.state().party || [])[1]; return me ? { cds: me.cds, x: me.x, z: me.z } : null;').catch(() => null);
    await guest.page.mouse.move(700, 330);
    await guest.page.keyboard.press(k);
    await sleep(700);
    const ev = await netEval(host, `return window.__pe.slice(${n0}).filter((e) => e.partyIndex === 1 || e.seat === 1 || e.id === undefined).map((e) => ({ type: e.type, skill: e.skill, reason: e.reason, inputSeq: e.inputSeq }));`);
    const phase = await netEval(host, 'return E.state().run.phase;');
    out.res.push({ key: k, alive, phase, cds, ev });
    console.log(`key ${k}: alive ${alive} phase ${phase} -> ${JSON.stringify(ev)}`);
    await sleep(1600);
  }
  await guest.page.screenshot({ path: 'captures/gntfixPARTY5-tankkeys-guest.png' });
} catch (e) { out.err = String(e.stack || e).slice(0, 600); console.log(out.err); }
finally { if (browser) await browser.close().catch(() => {}); if (srv) await srv.stop(); writeFileSync('captures/gntfixPARTY5-tankkeys.json', JSON.stringify(out, null, 1)); }
