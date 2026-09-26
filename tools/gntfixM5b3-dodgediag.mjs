// gntfixM5b3-dodgediag.mjs — NET3-F2 diagnostics (fix-M5b-r3). Host + 3
// guest pages (Tank / Swordsman / Archer, own browsers) at a conditioner
// setting; every guest stands still and dodges `--reps` times. Each guest's
// own-seat predictor and action shadow are wrapped IN THE PAGE (read-only
// taps on the live objects) so every dodge carries its full timeline:
//   press   — the shadow's decision (predId | null) + the predictor's dodge
//             readiness at the keydown,
//   frame   — every local input frame (seq, dodge press, dodged?, dash left),
//   recon   — every reconcile (k, snapshot tick, the host body's dash state
//             and dodge timer at k, the replayed body, offset, snap),
// and the HOST's ally_dodge / seat_denied events for the seat (inputSeq,
// tick) plus the seat feed's gap / starve / late-press counters.
// A row is BAD when the guest's correctionSnaps rise or its rendered own
// pose steps > 0.5 u outside dash frames. Writes captures/<out>.
// node tools/gntfixM5b3-dodgediag.mjs --port 7824 --base http://127.0.0.1:4307/ --cond lat75,jit10 --reps 12 [--out name.json]
import { args, startServer, bootSession, admin, setCond, waitFor, sleep, r2, writeJson, closeClient } from './gntfixM5b3-lib.mjs';

const A = args();
const port = Number(A.port || 7824);
const base = A.base || 'http://127.0.0.1:4307/';
const cond = A.cond || 'lat75,jit10';
const reps = Number(A.reps || 12);
const outName = A.out || 'gntfixM5b3-dodgediag.json';
const out = { tool: 'gntfixM5b3-dodgediag', port, base, cond, reps, rows: [], summary: {} };
const srv = await startServer(port, ['--admin']);
let cl = [];
try {
  const s = await bootSession({ base, port, n: 4, names: ['DHost', 'DTank', 'DSword', 'DArcher'], w: 960, h: 540 });
  cl = s.cl;
  const [H, ...G] = cl;
  out.version = await H.page.evaluate(() => window.__echoes.version);
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitFor(H.page, () => window.__echoes.state().run && window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  const peers = await Promise.all(G.map((g) => g.page.evaluate(() => window.__echoes.net.peerId)));
  if (cond !== 'off') for (const p of peers) out.condSet = await setCond(port, p, cond);
  const seats = await Promise.all(G.map((g) => g.page.evaluate(() => window.__echoes.net.seat)));
  out.seats = seats;
  const ents = await Promise.all(G.map((g) => g.page.evaluate(() => window.__echoes.net.session.debugGuest().entityId)));
  out.ents = ents;
  await H.page.evaluate(() => {
    const E = window.__echoes;
    window.__ddkeep = setInterval(() => {
      try {
        for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.7) E.cmd('setHp', m.id, m.maxHp);
        const st = E.state();
        if ((st.enemies || []).length < 3) E.cmd('spawn', 'mantis', 6, -5, { hpMul: 300, dmgMul: 0 });
      } catch {
        /* */
      }
    }, 400);
    window.__ddev = [];
    for (const ty of ['ally_dodge', 'seat_denied', 'seat_control']) E.on(ty, (ev) => window.__ddev.push({ type: ty, tick: ev.tick, seat: ev.seat ?? ev.partyIndex, inputSeq: ev.inputSeq, kind: ev.kind, reason: ev.reason, controller: ev.controller }));
  });
  // page-side taps on every guest
  for (const g of G) {
    await g.page.evaluate(() => {
      const g = window.__echoes.net.session.debugGuest();
      const own = g.own;
      const sh = g.shadow;
      window.__dd = [];
      window.__ddkey = null;
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat) window.__ddkey = e.timeStamp;
      }, true);
      const push = (x) => {
        window.__dd.push({ t: Math.round(performance.now()), ...x });
        if (window.__dd.length > 4000) window.__dd.splice(0, 1000);
      };
      const rOLF = own.onLocalFrame;
      own.onLocalFrame = (si) => {
        const d = rOLF(si);
        const b = own.body;
        const dodgeP = si.presses.some((p) => p.kind === 'dodge');
        if (dodgeP || d || (b && b.dashTicksLeft > 0)) push({ ev: 'frame', seq: si.seq, dodgeP, dodged: d, dash: b ? b.dashTicksLeft : null, dodgeSeq: b ? b.dodgeSeq : null, x: b ? +b.x.toFixed(3) : null, z: b ? +b.z.toFixed(3) : null });
        return d;
      };
      const rRec = own.reconcile;
      own.reconcile = (e, snapTick, k, timers, opt) => {
        const before = own.pos;
        const s0 = own.stats().snaps;
        const r = rRec(e, snapTick, k, timers, opt);
        const after = own.pos;
        const s1 = own.stats().snaps;
        const b = own.body;
        push({ ev: 'recon', k, snapTick, seqNow: g.seq, eDash: e.dashTicksLeft ?? null, eX: +e.x.toFixed(3), eZ: +e.z.toFixed(3), tDodge: timers ? timers.dodge : null, jump: before && after ? +Math.hypot(after.x - before.x, after.z - before.z).toFixed(3) : null, snap: s1 - s0, bDash: b ? b.dashTicksLeft : null, bX: b ? +b.x.toFixed(3) : null });
        return r;
      };
      const rPress = sh.press;
      sh.press = (kind, ctx) => {
        const r = rPress(kind, ctx);
        if (kind === 'dodge') push({ ev: 'press', seq: ctx.seq, pred: r, dashing: ctx.dashing, ownDodgeSeq: own.body ? own.body.dodgeSeq : null, ownDash: own.body ? own.body.dashTicksLeft : null, gseq: g.seq, lastConsumed: g.lastConsumed });
        return r;
      };
    });
  }
  await sleep(3000);
  for (let gi = 0; gi < G.length; gi++) {
    const g = G[gi];
    const seat = seats[gi];
    for (let rep = 0; rep < reps; rep++) {
      await H.page.evaluate((id) => {
        const E = window.__echoes;
        const m = E.state().party.find((q) => q.id === id);
        E.cmd('spawn', 'mantis', Math.max(-7, Math.min(7, m.x + 2.2)), m.z, { hpMul: 300, dmgMul: 0 });
      }, ents[gi]);
      await g.page.mouse.move(700, 270);
      await sleep(1200);
      const s0 = await g.page.evaluate(() => {
        const x = window.__echoes.net.stats();
        window.__dd.length = 0;
        window.__ddkey = null;
        window.__ddpose = [];
        const f = () => {
          const p = window.__echoes.net.session.ownPose();
          if (p) window.__ddpose.push({ t: Math.round(performance.now() * 10) / 10, x: p.rx, z: p.rz, d: p.dashing });
          if (window.__ddpose.length < 150) requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
        return { snaps: x.correctionSnaps, predErrMax: x.predErrMax };
      });
      const h0 = await H.page.evaluate((st) => {
        window.__ddev.length = 0;
        const d = window.__echoes.net.session.debugHost();
        const f = d.feeds.get(st);
        const hs = d.stats();
        return { tick: window.__echoes.tick, lastConsumed: f ? f.lastConsumed : null, gaps: hs.gapsFilled, starve: hs.staleRepeats, late: hs.latePresses, drains: hs.drains };
      }, seat);
      const keyT = await g.page.evaluate(() => Math.round(performance.now()));
      await g.page.keyboard.press('Space');
      await sleep(2400);
      const gd = await g.page.evaluate(() => ({ key: window.__ddkey, dd: window.__dd.slice(), pose: window.__ddpose.slice(), stats: (() => {
        const x = window.__echoes.net.stats();
        return { snaps: x.correctionSnaps, predErrMax: x.predErrMax, fps: window.__echoes.fps };
      })() }));
      const h1 = await H.page.evaluate((st) => {
        const d = window.__echoes.net.session.debugHost();
        const hs = d.stats();
        return { ev: window.__ddev.filter((e) => e.seat === st), gaps: hs.gapsFilled, starve: hs.staleRepeats, late: hs.latePresses, drains: hs.drains };
      }, seat);
      let bigNoDash = 0;
      for (let i = 1; i < gd.pose.length; i++) {
        if (gd.pose[i].d || gd.pose[i - 1].d) continue;
        bigNoDash = Math.max(bigNoDash, Math.hypot(gd.pose[i].x - gd.pose[i - 1].x, gd.pose[i].z - gd.pose[i - 1].z));
      }
      const press = gd.dd.find((x) => x.ev === 'press');
      // in-page clock: keydown event timeStamp -> first rendered own-pose move;
      // the longest rendered-frame gap in the 600 ms after the key.
      let keyToMoveMs = null;
      let gapAfterKey = 0;
      if (gd.key !== null && gd.pose.length) {
        const before = gd.pose.filter((p) => p.t <= gd.key);
        const p0 = before.length ? before[before.length - 1] : gd.pose[0];
        const mv = gd.pose.find((p) => p.t > gd.key && Math.hypot(p.x - p0.x, p.z - p0.z) > 0.05);
        keyToMoveMs = mv ? Math.round(mv.t - gd.key) : null;
        for (let i = 1; i < gd.pose.length; i++) if (gd.pose[i].t > gd.key && gd.pose[i - 1].t < gd.key + 600) gapAfterKey = Math.max(gapAfterKey, gd.pose[i].t - Math.max(gd.pose[i - 1].t, gd.key));
      }
      const firstMove = gd.pose.length ? gd.pose.find((p) => Math.hypot(p.x - gd.pose[0].x, p.z - gd.pose[0].z) > 0.05) : null;
      const row = {
        seat,
        rep,
        snaps: gd.stats.snaps - s0.snaps,
        bigNoDash: r2(bigNoDash),
        firstMoveMs: firstMove ? firstMove.t - keyT : null,
        keyToMoveMs,
        gapAfterKey: Math.round(gapAfterKey),
        keyDispatchMs: gd.key !== null ? Math.round(gd.key - keyT) : null,
        fps: gd.stats.fps,
        press,
        host: { dodge: h1.ev.filter((e) => e.type === 'ally_dodge').map((e) => ({ tick: e.tick, inputSeq: e.inputSeq })), denied: h1.ev.filter((e) => e.type === 'seat_denied').map((e) => ({ kind: e.kind, reason: e.reason, inputSeq: e.inputSeq })), gaps: h1.gaps - h0.gaps, starve: h1.starve - h0.starve, late: h1.late - h0.late, drains: h1.drains - h0.drains },
        timeline: gd.dd,
      };
      out.rows.push(row);
      const bad = row.snaps > 0 || row.bigNoDash > 0.5 || (row.keyToMoveMs !== null && row.keyToMoveMs > 120);
      console.log(JSON.stringify({ seat, rep, bad, snaps: row.snaps, big: row.bigNoDash, keyToMove: row.keyToMoveMs, gap: row.gapAfterKey, dispatch: row.keyDispatchMs, first: row.firstMoveMs, fps: row.fps, pred: press ? press.pred : 'NO-PRESS', hostDodge: row.host.dodge, denied: row.host.denied, gaps: row.host.gaps, starve: row.host.starve, late: row.host.late }));
      await sleep(1500);
    }
  }
  const by = {};
  for (const r of out.rows) {
    const b = (by[r.seat] = by[r.seat] || { n: 0, snapRows: 0, bigRows: 0, lateRows: 0, noPred: 0 });
    b.n += 1;
    if (r.snaps > 0) b.snapRows += 1;
    if (r.bigNoDash > 0.5) b.bigRows += 1;
    if (r.keyToMoveMs !== null && r.keyToMoveMs > 120) b.lateRows += 1;
    b.keyToMove = (b.keyToMove || []).concat([r.keyToMoveMs]);
    b.gaps = (b.gaps || []).concat([r.gapAfterKey]);
    if (!r.press || !r.press.pred) b.noPred += 1;
  }
  out.summary = by;
  console.log(JSON.stringify(by));
} catch (e) {
  out.crash = String(e.stack || e);
  console.error(e);
} finally {
  out.pageErrors = Object.fromEntries(cl.map((c) => [c.tag, c.errors]));
  writeJson(outName, out);
  console.log('pageErrors', JSON.stringify(out.pageErrors));
  try {
    srv.proc.kill();
  } catch {
    /* */
  }
  await Promise.all(cl.map(closeClient));
}
