// gntfixM5b3-freeze.mjs — fix-M5b-r3: the guest render-stall watchdog must
// stay inert while the page keeps drawing but the frame loop does not advance
// the sim (the debug API's __echoes.sim.freeze(), the save round-trip freeze)
// and must still step through a REAL render stall (no rAF while visible).
//   host + 1 guest in play. Control: the guest walks. Freeze: guest
//   __echoes.sim.freeze(), hold A 2 s -> the guest's clock tick, its watchdog
//   steps and the seat's movement on the host and on its own pose must all
//   stay ~0 (the page keeps drawing; nothing may advance the sim behind the
//   freeze). Thaw -> it walks again. The real-stall side is covered by
//   tools/gntfixM5b3-dodgediag.mjs (stallSteps during measured render stalls).
// node tools/gntfixM5b3-freeze.mjs --port 7822 --base http://127.0.0.1:4307/ [--out name.json]
import { args, startServer, bootSession, sleep, r2, writeJson, closeClient } from './gntfixM5b3-lib.mjs';

const A = args();
const port = Number(A.port || 7822);
const base = A.base || 'http://127.0.0.1:4307/';
const out = { tool: 'gntfixM5b3-freeze', base, checks: [], data: {} };
const check = (name, ok, detail) => {
  out.checks.push({ name, ok: !!ok, detail });
  console.log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 900));
};
const srv = await startServer(port, ['--admin']);
let cl = [];
try {
  const s = await bootSession({ base, port, n: 2, names: ['ZHost', 'ZGuest'] });
  cl = s.cl;
  const [H, G] = cl;
  await sleep(1500);
  out.data.version = await G.page.evaluate(() => window.__echoes.version);
  const seat = await G.page.evaluate(() => window.__echoes.net.session.debugGuest().entityId);
  const hostPos = () => H.page.evaluate((id) => {
    const st = window.__echoes.state();
    const m = [st.player, ...(st.party || [])].find((q) => q && q.id === id);
    return m ? { x: m.x, z: m.z } : null;
  }, seat);
  const guestInfo = () => G.page.evaluate(() => {
    const E = window.__echoes;
    const p = E.net.session.ownPose();
    const x = E.net.stats();
    return { tick: E.tick, rx: p.rx, rz: p.rz, stallSteps: x.stallSteps, stallStepMs: x.stallStepMs, frozen: E.sim ? E.sim.frozen : null };
  });
  const hold = async (key, ms) => {
    await G.page.keyboard.down(key);
    await sleep(ms);
    await G.page.keyboard.up(key);
  };
  // Control: walk unfrozen.
  const c0 = await guestInfo();
  const h0 = await hostPos();
  await hold('KeyD', 1500);
  await sleep(600);
  const c1 = await guestInfo();
  const h1 = await hostPos();
  const control = { guestTicks: c1.tick - c0.tick, ownMove: r2(Math.hypot(c1.rx - c0.rx, c1.rz - c0.rz)), hostMove: r2(Math.hypot(h1.x - h0.x, h1.z - h0.z)), stallSteps: c1.stallSteps - c0.stallSteps };
  // Freeze leg.
  const was = await G.page.evaluate(() => (window.__echoes.sim ? window.__echoes.sim.freeze() : null));
  await sleep(300);
  const f0 = await guestInfo();
  const hf0 = await hostPos();
  await hold('KeyA', 2000);
  await sleep(300);
  const f1 = await guestInfo();
  const hf1 = await hostPos();
  const frozen = { freezeReturned: was, frozenFlag: f1.frozen, guestTicks: f1.tick - f0.tick, stallSteps: f1.stallSteps - f0.stallSteps, stallStepMs: f1.stallStepMs - f0.stallStepMs, ownMove: r2(Math.hypot(f1.rx - f0.rx, f1.rz - f0.rz)), hostMove: r2(Math.hypot(hf1.x - hf0.x, hf1.z - hf0.z)) };
  await G.page.evaluate(() => window.__echoes.sim.thaw());
  await sleep(800);
  const t0 = await guestInfo();
  const ht0 = await hostPos();
  await hold('KeyA', 1500);
  await sleep(600);
  const t1 = await guestInfo();
  const ht1 = await hostPos();
  const thawed = { guestTicks: t1.tick - t0.tick, ownMove: r2(Math.hypot(t1.rx - t0.rx, t1.rz - t0.rz)), hostMove: r2(Math.hypot(ht1.x - ht0.x, ht1.z - ht0.z)), stallSteps: t1.stallSteps - t0.stallSteps };
  out.data = { ...out.data, seat, control, frozen, thawed };
  check('control: the guest walks unfrozen (>= 1 u on host and own pose)', control.hostMove >= 1 && control.ownMove >= 1, control);
  check('debug freeze on the guest: its sim does not advance (<= 2 ticks), the watchdog does not step, the seat does not walk', frozen.guestTicks <= 2 && frozen.stallSteps === 0 && frozen.hostMove < 0.2 && frozen.ownMove < 0.2, frozen);
  check('thaw: the guest walks again (>= 1 u on host and own pose)', thawed.hostMove >= 1 && thawed.ownMove >= 1, thawed);
} catch (e) {
  out.crash = String(e && e.stack ? e.stack : e);
  console.error(e);
} finally {
  out.pageErrors = Object.fromEntries(cl.map((c) => [c.tag, c.errors]));
  const f = writeJson(A.out || 'gntfixM5b3-freeze.json', out);
  console.log(`${out.checks.filter((c) => c.ok).length}/${out.checks.length}`, 'pageErrors', JSON.stringify(out.pageErrors), f);
  for (const c of cl) await closeClient(c);
  try {
    srv.proc.kill();
  } catch {
    /* */
  }
}
