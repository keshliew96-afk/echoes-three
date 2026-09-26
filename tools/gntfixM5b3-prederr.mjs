// gntfixM5b3-prederr.mjs — where do large own-seat prediction errors come
// from? (fix-M5b-r3, NET3-F2 / G5b.2 "max <= 1.0 u"). Host + 3 guest pages
// (own browsers) at a conditioner setting. Every guest's own-seat predictor
// is tapped IN THE PAGE: each reconcile whose predErrMax rises above 0.3 u
// is logged with its context (k, snapshot tick, the host body, the guest's
// run room / phase, the recent event types the replica replayed). The host
// then plays --rooms rooms of Level 1 with the autopilot (room clears, room
// re-seats, the shop, doors) while the guests walk with scripted keys
// (--walk) or stand (default), so room-boundary re-seats are covered.
// node tools/gntfixM5b3-prederr.mjs --port 7826 --base http://127.0.0.1:4307/ [--cond lat75,jit10] [--seconds 60] [--walk]
import { args, startServer, bootSession, setCond, waitFor, sleep, writeJson, closeClient } from './gntfixM5b3-lib.mjs';

const A = args();
const port = Number(A.port || 7826);
const base = A.base || 'http://127.0.0.1:4307/';
const cond = A.cond || 'lat75,jit10';
const seconds = Number(A.seconds || 60);
const out = { tool: 'gntfixM5b3-prederr', port, base, cond, seconds, guests: [] };
const srv = await startServer(port, ['--admin']);
let cl = [];
try {
  const s = await bootSession({ base, port, n: 4, names: ['EHost', 'ETank', 'ESword', 'EArcher'], w: 960, h: 540 });
  cl = s.cl;
  const [H, ...G] = cl;
  out.version = await H.page.evaluate(() => window.__echoes.version);
  const peers = await Promise.all(G.map((g) => g.page.evaluate(() => window.__echoes.net.peerId)));
  if (cond !== 'off') for (const p of peers) out.condSet = await setCond(port, p, cond);
  for (const g of G) {
    await g.page.evaluate(() => {
      const E = window.__echoes;
      const g = E.net.session.debugGuest();
      const own = g.own;
      window.__pe = [];
      window.__peEv = [];
      for (const ty of ['room_start', 'room_enter', 'run_start', 'layout_enter', 'return_to_camp', 'state_restored', 'room_cleared', 'knockback', 'hit', 'ally_hit', 'push']) E.on(ty, (ev) => {
        window.__peEv.push({ t: Math.round(performance.now()), type: ty, tick: ev.tick });
        if (window.__peEv.length > 60) window.__peEv.shift();
      });
      const rRec = own.reconcile;
      own.reconcile = (e, snapTick, k, timers, opt) => {
        const s0 = own.stats();
        const pos0 = own.pos;
        const r = rRec(e, snapTick, k, timers, opt);
        const s1 = own.stats();
        if (s1.predErrMax > s0.predErrMax + 1e-6 && s1.predErrMax > 0.3) {
          const st = E.state();
          window.__pe.push({
            t: Math.round(performance.now()),
            predErrMax: s1.predErrMax,
            k,
            snapTick,
            seqNow: g.seq,
            e: { x: +e.x.toFixed(3), z: +e.z.toFixed(3), dash: e.dashTicksLeft ?? null, hp: e.hp },
            pos0: pos0 && { x: +pos0.x.toFixed(3), z: +pos0.z.toFixed(3) },
            snaps: s1.snaps - s0.snaps,
            teleports: s1.teleports - s0.teleports,
            handoff: !!(opt && opt.handoff),
            run: st.run ? { room: st.run.room, phase: st.run.phase } : null,
            scene: st.scene,
            recentEvents: window.__peEv.filter((x) => performance.now() - x.t < 1500).map((x) => x.type + '@' + x.tick),
          });
        }
        return r;
      };
      own.resetStats();
    });
  }
  // go: level 1 with the host's autopilot (room clears, re-seats, doors, the shop)
  await H.page.evaluate(() => {
    const E = window.__echoes;
    E.cmd('startCampaign', { level: 1 });
    E.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' });
    window.__ekeep = setInterval(() => {
      try {
        for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.6) E.cmd('setHp', m.id, m.maxHp);
      } catch {
        /* */
      }
    }, 500);
  });
  const t0 = Date.now();
  const keys = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
  let ki = 0;
  while (Date.now() - t0 < seconds * 1000) {
    if (A.walk) {
      const k = keys[ki++ % 4];
      await Promise.all(G.map((g) => g.page.keyboard.down(k)));
      await sleep(700);
      await Promise.all(G.map((g) => g.page.keyboard.up(k)));
      if (ki % 3 === 0) await Promise.all(G.map((g) => g.page.keyboard.press('Space')));
      await sleep(300);
    } else await sleep(1000);
  }
  const hostRun = await H.page.evaluate(() => {
    const st = window.__echoes.state();
    return st.run ? { room: st.run.room, phase: st.run.phase } : null;
  });
  out.hostRun = hostRun;
  for (const g of G) {
    const r = await g.page.evaluate(() => ({ seat: window.__echoes.net.seat, pe: window.__pe.slice(), stats: window.__echoes.net.stats() }));
    out.guests.push({ seat: r.seat, jumps: r.pe, predErrP95: r.stats.predErrP95, predErrMax: r.stats.predErrMax, snaps: r.stats.correctionSnaps, teleports: r.stats.teleports });
    console.log(JSON.stringify({ seat: r.seat, p95: r.stats.predErrP95, max: r.stats.predErrMax, snaps: r.stats.correctionSnaps, n: r.pe.length }));
    for (const j of r.pe.slice(0, 12)) console.log('   ', JSON.stringify(j).slice(0, 400));
  }
} catch (e) {
  out.crash = String(e.stack || e);
  console.error(e);
} finally {
  out.pageErrors = Object.fromEntries(cl.map((c) => [c.tag, c.errors]));
  writeJson(A.out || 'gntfixM5b3-prederr.json', out);
  console.log('pageErrors', JSON.stringify(out.pageErrors), 'hostRun', JSON.stringify(out.hostRun));
  try {
    srv.proc.kill();
  } catch {
    /* */
  }
  await Promise.all(cl.map(closeClient));
}
