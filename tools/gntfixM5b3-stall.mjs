// gntfixM5b3-stall.mjs — fix-M5b-r3: a deterministic RENDER stall on a guest
// (NET3-F2 residual, the render-stall watchdog). The guest page's
// requestAnimationFrame is held for --stall ms (callbacks queued, released
// afterwards) while its main thread stays free — exactly what a GPU / raster
// stall looks like from script: no frames, timers and socket messages still
// run. three's animation loop and the session's rAF heartbeat both look the
// method up on window per frame, so both stop.
//   host + 1 guest (Tank) in combat at --cond (default lat75,jit10).
//   Leg W: hold D 1.6 s with a stall 500 ms in (x --reps).
//   Leg D: stand still, press Space, stall 40 ms later (x --reps).
// Per rep: the guest's watchdog steps, correctionSnaps / corrections deltas,
// predErrMax, the host seat's displacement and the guest's final predicted
// pose vs the host's. A rep is BAD when correctionSnaps rise.
// node tools/gntfixM5b3-stall.mjs --port 7822 --base http://127.0.0.1:4307/ [--cond lat75,jit10] [--stall 420] [--reps 6] [--out name.json]
import { args, startServer, bootSession, setCond, waitFor, sleep, r2, writeJson, closeClient } from './gntfixM5b3-lib.mjs';

const A = args();
const port = Number(A.port || 7822);
const base = A.base || 'http://127.0.0.1:4307/';
const cond = A.cond || 'lat75,jit10';
const stallMs = Number(A.stall || 420);
const reps = Number(A.reps || 6);
const out = { tool: 'gntfixM5b3-stall', base, cond, stallMs, reps, rows: [], summary: {} };
const srv = await startServer(port, ['--admin']);
let cl = [];
try {
  const s = await bootSession({ base, port, n: 2, names: ['SHost', 'STank'] });
  cl = s.cl;
  const [H, G] = cl;
  out.version = await G.page.evaluate(() => window.__echoes.version);
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitFor(H.page, () => window.__echoes.state().run && window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  const peer = await G.page.evaluate(() => window.__echoes.net.peerId);
  if (cond !== 'off') out.condSet = await setCond(port, peer, cond);
  const ent = await G.page.evaluate(() => window.__echoes.net.session.debugGuest().entityId);
  await H.page.evaluate(() => {
    const E = window.__echoes;
    window.__skeep = setInterval(() => {
      try {
        for (const m of [E.state().player, ...(E.state().party || [])]) if (m && !m.downed && m.hp < m.maxHp * 0.7) E.cmd('setHp', m.id, m.maxHp);
        if ((E.state().enemies || []).length < 2) E.cmd('spawn', 'mantis', 6, -5, { hpMul: 300, dmgMul: 0 });
      } catch {
        /* */
      }
    }, 400);
  });
  // rAF hold on the guest page.
  await G.page.evaluate(() => {
    const orig = window.requestAnimationFrame.bind(window);
    let hold = false;
    const q = [];
    window.requestAnimationFrame = (cb) => {
      if (hold) {
        q.push(cb);
        return -1;
      }
      return orig(cb);
    };
    window.__stall = (ms) => {
      hold = true;
      window.__stallAt = performance.now();
      setTimeout(() => {
        hold = false;
        window.__stallEnd = performance.now();
        const cbs = q.splice(0);
        for (const cb of cbs) orig(cb);
      }, ms);
    };
  });
  await sleep(2500);
  const hostPos = () => H.page.evaluate((id) => {
    const st = window.__echoes.state();
    const m = [st.player, ...(st.party || [])].find((q) => q && q.id === id);
    return m ? { x: m.x, z: m.z } : null;
  }, ent);
  const gStats = () => G.page.evaluate(() => {
    const x = window.__echoes.net.stats();
    const g = window.__echoes.net.session.debugGuest();
    const b = g && g.own ? g.own.body : null;
    return { snaps: x.correctionSnaps, corr: x.corrections, predErrMax: x.predErrMax, stallSteps: x.stallSteps, stallStepMs: x.stallStepMs, stallGapMaxMs: x.stallGapMaxMs, bx: b ? b.x : null, bz: b ? b.z : null };
  });
  const runRep = async (leg, rep) => {
    await G.page.mouse.move(700, 270);
    await sleep(900);
    const s0 = await gStats();
    const h0 = await hostPos();
    if (leg === 'W') {
      await G.page.keyboard.down(rep % 2 ? 'KeyA' : 'KeyD');
      await sleep(500);
      await G.page.evaluate((ms) => window.__stall(ms), stallMs);
      await sleep(1100);
      await G.page.keyboard.up(rep % 2 ? 'KeyA' : 'KeyD');
    } else {
      await G.page.keyboard.press('Space');
      await sleep(40);
      await G.page.evaluate((ms) => window.__stall(ms), stallMs);
      await sleep(1000);
    }
    await sleep(1400);
    const s1 = await gStats();
    const h1 = await hostPos();
    const measured = await G.page.evaluate(() => Math.round((window.__stallEnd || 0) - (window.__stallAt || 0)));
    const row = {
      leg,
      rep,
      stallMeasuredMs: measured,
      watchdogSteps: s1.stallSteps - s0.stallSteps,
      watchdogMs: s1.stallStepMs - s0.stallStepMs,
      snaps: s1.snaps - s0.snaps,
      corrections: s1.corr - s0.corr,
      predErrMax: s1.predErrMax,
      hostMove: r2(Math.hypot(h1.x - h0.x, h1.z - h0.z)),
      guestMove: s0.bx == null ? null : r2(Math.hypot(s1.bx - s0.bx, s1.bz - s0.bz)),
      finalGap: s1.bx == null ? null : r2(Math.hypot(s1.bx - h1.x, s1.bz - h1.z)),
    };
    out.rows.push(row);
    console.log(JSON.stringify(row));
  };
  for (let rep = 0; rep < reps; rep++) await runRep('W', rep);
  for (let rep = 0; rep < reps; rep++) await runRep('D', rep);
  for (const leg of ['W', 'D']) {
    const rs = out.rows.filter((r) => r.leg === leg);
    out.summary[leg] = {
      reps: rs.length,
      snapReps: rs.filter((r) => r.snaps > 0).length,
      snaps: rs.reduce((a, r) => a + r.snaps, 0),
      watchdogFiredReps: rs.filter((r) => r.watchdogSteps > 0).length,
      maxFinalGap: Math.max(...rs.map((r) => r.finalGap ?? 0)),
      hostMoves: rs.map((r) => r.hostMove),
    };
  }
  console.log('summary', JSON.stringify(out.summary));
} catch (e) {
  out.crash = String(e && e.stack ? e.stack : e);
  console.error(e);
} finally {
  out.pageErrors = Object.fromEntries(cl.map((c) => [c.tag, c.errors]));
  const f = writeJson(A.out || 'gntfixM5b3-stall.json', out);
  console.log('pageErrors', JSON.stringify(out.pageErrors), f);
  for (const c of cl) await closeClient(c);
  try {
    srv.proc.kill();
  } catch {
    /* */
  }
}
