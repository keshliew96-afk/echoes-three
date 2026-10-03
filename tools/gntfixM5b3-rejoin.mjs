// gntfixM5b3-rejoin.mjs — NET3-F1 probe (fix-M5b-r3). The critic's leg G
// (tools/gntcnet3-drops.mjs --legs G) with per-step diagnostics:
//   host + 2 guests in combat -> the HOST's socket is closed and refused for
//   18 s (POST /admin/drop mode close) -> the session migrates to a guest
//   after the 10 s grace -> the old host gives up at 15 s and lands on the
//   title with "Rejoin XXXXX? Your Healer seat is held" -> Enter (or a mouse
//   click on Rejoin with --accept click) -> the old host is a guest in seat 0.
//   Then it holds D for 2 s, clicks the canvas, holds A for 2 s and reports
//   the Healer's displacement on the NEW HOST (authoritative) and on its own
//   predicted pose, every sent frame's move index, and the input-path state
//   (held move, app stack, sim pause, input gate) sampled every 100 ms.
// node tools/gntfixM5b3-rejoin.mjs --port 7822 --base http://127.0.0.1:4307/ [--accept enter|click] [--out name.json] [--reps 1]
import { args, startServer, bootSession, admin, waitFor, sleep, r2, writeJson, shot, closeClient } from './gntfixM5b3-lib.mjs';

const A = args();
const port = Number(A.port || 7822);
const base = A.base || 'http://127.0.0.1:4307/';
const accept = A.accept || 'enter';
const outName = A.out || 'gntfixM5b3-rejoin.json';
const out = { tool: 'gntfixM5b3-rejoin', port, base, accept, checks: [], data: {} };
const check = (name, ok, detail) => {
  out.checks.push({ name, ok: !!ok, detail });
  console.log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 600));
};
const srv = await startServer(port, ['--admin']);
let cl = [];
try {
  const s = await bootSession({ base, port, n: 3, names: ['RHost', 'RGuestA', 'RGuestB'] });
  cl = s.cl;
  const [H, G1, G2] = cl;
  out.data.code = s.code;
  out.data.version = await H.page.evaluate(() => window.__echoes.version);
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitFor(H.page, () => window.__echoes.state().run && window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  // keep the party alive and the room open (the critic's intervals)
  await H.page.evaluate(() => {
    const E = window.__echoes;
    window.__fxkeep = setInterval(() => {
      try {
        for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.6) E.cmd('setHp', m.id, m.maxHp);
        const st = E.state();
        if (st.run.phase === 'combat' && (st.enemies || []).length < 2) E.cmd('spawn', 'mantis', 6, 5, { hpMul: 300, dmgMul: 0 });
      } catch {
        /* */
      }
    }, 500);
  });
  await sleep(2000);
  // control: the host's own Healer walks before the drop
  const hx0 = await H.page.evaluate(() => window.__echoes.state().party.find((m) => m.id === 0).x);
  await H.page.keyboard.down('KeyD');
  await sleep(1000);
  await H.page.keyboard.up('KeyD');
  await sleep(300);
  const hx1 = await H.page.evaluate(() => window.__echoes.state().party.find((m) => m.id === 0).x);
  out.data.controlHostDx = r2(hx1 - hx0);
  // key log on the old host (capture phase, the page never reloads in this leg)
  await H.page.evaluate(() => {
    window.__fxkeys = [];
    window.addEventListener('keydown', (e) => window.__fxkeys.push({ t: Math.round(performance.now()), code: e.code, down: 1 }), true);
    window.addEventListener('keyup', (e) => window.__fxkeys.push({ t: Math.round(performance.now()), code: e.code, down: 0 }), true);
  });
  const hostPeer = await H.page.evaluate(() => window.__echoes.net.peerId);
  const t0 = Date.now();
  await admin(port, '/admin/drop', { peerId: hostPeer, mode: 'close', forMs: 18000 });
  let newHost = null;
  const mig = await waitFor(G1.page, () => window.__echoes.net.role === 'host', { timeout: 30000, poll: 100 });
  if (mig.ok) newHost = G1;
  else {
    const m2 = await waitFor(G2.page, () => window.__echoes.net.role === 'host', { timeout: 5000, poll: 100 });
    if (m2.ok) newHost = G2;
  }
  out.data.migratedAtMs = Date.now() - t0;
  if (!newHost) throw new Error('no migration');
  const offer = await waitFor(H.page, () => {
    const st = window.__echoes.app.stack();
    return window.__echoes.app.state === 'title' && st.includes('confirm') && /rejoin/i.test(document.body.innerText || '');
  }, { timeout: 45000, poll: 200 });
  out.data.offerAtMs = Date.now() - t0;
  out.data.offer = offer.ok;
  // the link returns at t0 + 18 s: accept after it (the critic accepted ~40 s in)
  while (Date.now() - t0 < Number(A.acceptAt || 21000)) await sleep(200);
  await shot(H, 'gntfixM5b3-rejoin-offer.png');
  if (!offer.ok) throw new Error('no rejoin offer');
  if (accept === 'click') {
    const box = await H.page.evaluate(() => {
      const el = [...document.querySelectorAll('button, [data-nav]')].find((e) => /^rejoin$/i.test((e.innerText || '').trim()));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await H.page.mouse.click(box.x, box.y);
  } else await H.page.keyboard.press('Enter');
  const back = await waitFor(H.page, () => {
    const n = window.__echoes.net;
    try {
      return n.state === 'guest' && n.session.status().synced;
    } catch {
      return false;
    }
  }, { timeout: 20000, poll: 50 });
  out.data.rejoinSyncedMs = back.ms;
  await sleep(1500);
  const diag = () =>
    H.page.evaluate(() => {
      const E = window.__echoes;
      const g = E.net.session.debugGuest();
      const f = g && g.frames.length ? g.frames[g.frames.length - 1] : null;
      return {
        t: Math.round(performance.now()),
        app: E.app.state,
        stack: E.app.stack(),
        simPaused: E.app.simPaused(),
        seat: E.net.seat,
        heldMove: g && g.held.move,
        frozen: g && g.frozen,
        away: g && g.away,
        ready: g && g.own.ready,
        lastSentMove: f && f.move,
        activeEl: document.activeElement ? document.activeElement.tagName + '.' + String(document.activeElement.className || '').slice(0, 40) : null,
        hasFocus: document.hasFocus(),
      };
    });
  out.data.d0 = await diag();
  const trial = async (key, label) => {
    const p0 = await newHost.page.evaluate(() => {
      const m = window.__echoes.state().party.find((q) => q.id === 0);
      return [m.x, m.z];
    });
    const o0 = await H.page.evaluate(() => {
      const p = window.__echoes.net.session.ownPose();
      return p && [p.rx, p.rz];
    });
    const samples = [];
    await H.page.keyboard.down(key);
    for (let i = 0; i < 20; i++) {
      await sleep(100);
      samples.push(await diag());
    }
    await H.page.keyboard.up(key);
    await sleep(800);
    const p1 = await newHost.page.evaluate(() => {
      const m = window.__echoes.state().party.find((q) => q.id === 0);
      return [m.x, m.z];
    });
    const o1 = await H.page.evaluate(() => {
      const p = window.__echoes.net.session.ownPose();
      return p && [p.rx, p.rz];
    });
    const ctl = await newHost.page.evaluate(() => {
      const s = window.__echoes.net.stats();
      return { humanSeats: s.humanSeats, awaySeats: s.awaySeats, playerController: s.playerController };
    });
    return {
      label,
      key,
      hostSideMove: r2(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])),
      ownPoseMove: o0 && o1 ? r2(Math.hypot(o1[0] - o0[0], o1[1] - o0[1])) : null,
      heldMoves: [...new Set(samples.map((x) => x.heldMove))],
      sentMoves: [...new Set(samples.map((x) => x.lastSentMove))],
      stacks: [...new Set(samples.map((x) => JSON.stringify(x.stack)))],
      simPaused: [...new Set(samples.map((x) => x.simPaused))],
      ctl,
    };
  };
  out.data.trialD = await trial('KeyD', 'hold D 2 s');
  await H.page.mouse.click(480, 300);
  await sleep(300);
  out.data.trialA = await trial('KeyA', 'canvas click, hold A 2 s');
  out.data.keysLogged = await H.page.evaluate(() => window.__fxkeys.slice(-12));
  out.data.sessionLog = await H.page.evaluate(() => {
    try {
      return window.__echoes.net.session.log ? window.__echoes.net.session.log().slice(-30) : null;
    } catch {
      return null;
    }
  });
  await shot(H, 'gntfixM5b3-rejoin-after.png');
  check('old host rejoined seat 0 after migration and its Healer walks (host-side and own pose >= 1 u per 2 s hold)',
    out.data.trialD.hostSideMove >= 1 && out.data.trialD.ownPoseMove >= 1 && out.data.trialA.hostSideMove >= 1,
    { controlHostDx: out.data.controlHostDx, rejoinSyncedMs: back.ms, D: out.data.trialD, A: out.data.trialA });

  // --- re-drop: the rejoined Healer's link closes for 4 s -> the leader bot
  // takes the seat on the new host; after the reconnect the human has it back.
  if (!A.nodrop) {
    const oldPeer = await H.page.evaluate(() => window.__echoes.net.peerId);
    const td = Date.now();
    await admin(port, '/admin/drop', { peerId: oldPeer, mode: 'close', forMs: 4000 });
    const toAi = await waitFor(newHost.page, () => window.__echoes.net.stats().playerController === 'ai', { timeout: 4000, poll: 50 });
    const backHuman = await waitFor(newHost.page, () => window.__echoes.net.stats().playerController === 'human', { timeout: 20000, poll: 100 });
    const reSync = await waitFor(H.page, () => {
      const n = window.__echoes.net;
      try {
        const st = n.session.status();
        return n.state === 'guest' && st.synced && !st.reconnecting;
      } catch {
        return false;
      }
    }, { timeout: 20000, poll: 100 });
    await sleep(800);
    const again = await trial('KeyD', 're-drop: hold D 2 s after the reconnect');
    const botLog = await newHost.page.evaluate(() => window.__echoes.net.session.log(300).filter((x) => x.kind === 'leader_bot' || x.kind === 'host_start'));
    out.data.redrop = { toAiMs: toAi.ok ? toAi.ms : null, backHumanMs: backHuman.ok ? Date.now() - td : null, reSync: reSync.ok, again, botLog };
    check('re-drop: the leader bot takes the Healer while its human is disconnected and hands it back on the reconnect (walks again)',
      toAi.ok && backHuman.ok && reSync.ok && again.hostSideMove >= 1, { toAiMs: out.data.redrop.toAiMs, backHumanMs: out.data.redrop.backHumanMs, again, botLog });
  }

  // --- pages: with a human on the Healer the between-room choices are the
  // host's (never auto-taken by the bot); the Healer guest's banner names
  // the host's seat.
  if (!A.nopages) {
    const cleared = await waitFor(newHost.page, () => {
      const E = window.__echoes;
      const st = E.state();
      if (st.run && st.run.phase === 'combat') {
        E.cmd('killAllEnemies');
        return false;
      }
      return st.run ? st.run.phase : false;
    }, { timeout: 30000, poll: 400 });
    await sleep(2500);
    const hostPhase = await newHost.page.evaluate(() => window.__echoes.state().run.phase);
    const guestNote = await H.page.evaluate(() => {
      const el = document.querySelector('.nt-guest-note');
      return el && el.style.display !== 'none' ? el.textContent : null;
    });
    await shot(H, 'gntfixM5b3-rejoin-guest-draft.png');
    await shot(newHost, 'gntfixM5b3-rejoin-newhost-draft.png');
    const newHostSeat = await newHost.page.evaluate(() => window.__echoes.net.seat);
    // the new host takes the reward by the player path (Enter on its draft page)
    await newHost.page.keyboard.press('Enter');
    const advanced = await waitFor(newHost.page, () => window.__echoes.state().run.phase !== 'reward', { timeout: 6000, poll: 100 });
    const after = await newHost.page.evaluate(() => window.__echoes.state().run.phase);
    out.data.pages = { clearedTo: cleared.ok ? cleared.v : null, phaseAfter2500ms: hostPhase, guestNote, newHostSeat, advanced: advanced.ok, phaseAfterEnter: after };
    check('pages: with a human Healer the draft waits for the host (not auto-taken), the guest banner names the host seat, the host takes it with Enter',
      cleared.ok && hostPhase === 'reward' && typeof guestNote === 'string' && guestNote.includes(['Healer', 'Tank', 'Swordsman', 'Archer'][newHostSeat]) && advanced.ok,
      out.data.pages);
  }
} catch (e) {
  out.crash = String(e.stack || e);
  console.error(e);
} finally {
  out.pageErrors = Object.fromEntries(cl.map((c) => [c.tag, c.errors]));
  out.pass = out.checks.filter((c) => c.ok).length;
  out.total = out.checks.length;
  writeJson(outName, out);
  console.log(`${out.pass}/${out.total}`, 'pageErrors', JSON.stringify(out.pageErrors));
  try {
    srv.proc.kill();
  } catch {
    /* */
  }
  await Promise.all(cl.map(closeClient));
}
