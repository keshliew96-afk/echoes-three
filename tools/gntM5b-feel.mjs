#!/usr/bin/env node
// gntM5b-feel — the GUEST's local loop by REAL input (PLAN §7 G5b.10 + G5b.12).
// Owner: M5b.
//
// One browser (GPU harness + multi-page flags + autoplay): the HOST page is a
// background TAB (a cover tab in front — its sim keeps ticking on the Worker
// metronome and it renders nothing), the GUEST page is its own window, so the
// guest's frame rate is its own on this GPU. A session server of our own
// shapes the guest link per condition (admin conditioner). The host is in a
// combat room of Act I kept alive with sturdy enemies; the guest plays its
// seat with puppeteer's trusted keyboard + mouse:
//   move      D / A held from rest        -> frames from keydown to a visibly moved body
//   dodge     Space                       -> frames to the dash pose, dash length on screen
//   kit       Digit1..4                   -> ownActionFeedbackMs, cooldown tile frame
//   basic     right mouse on an enemy     -> ownActionFeedbackMs, cosmetic bolt
//   interact  E at a fresh Dewfont        -> ownActionFeedbackMs (use flourish + cue)
//   deny      host setHp(seat, 0) then Digit1 at once -> retraction within a snapshot
//   doubles   cue requests + own authoritative presentation events vs predictions
//   fps       the guest window's rAF over the whole condition
//
//   node tools/gntM5b-feel.mjs [--conds N1,N2] [--seat 3] [--port 7823]
//        [--base http://127.0.0.1:5199/] [--w 1600 --h 900] [--out captures/gntM5b-feel-seat3.json]
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, openCover, visibility, hostRoom, joinRoom, startGame, waitSession, netEval, sleep, admin, assertNoReload, pct } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const CONDS = { none: null, N1: 'lat75,jit10,loss10', N2: 'lat125,jit20,loss20', N3: 'lat75,burst0.05:0.3:0.8', N4: 'lat50,dup1,reo2' };
const opt = {
  conds: String(arg('conds', 'N1,N2')).split(','),
  seat: Number(arg('seat', 3)),
  port: Number(arg('port', 7823)),
  base: arg('base', 'http://127.0.0.1:5199/'),
  w: Number(arg('w', 1600)),
  h: Number(arg('h', 900)),
};
opt.out = arg('out', `captures/gntM5b-feel-seat${opt.seat}.json`);
const report = { schema: 'echoes-gntM5b-feel/1', startedAt: new Date().toISOString(), opt, conditions: [], notes: [] };
const log = (m) => console.log(`[feel] ${m}`);

// Page probe (guest): trusted input timestamps + per-rendered-frame own pose
// and skill-tile cooling state, sampled AFTER the game's own frame callback.
const PROBE = () => {
  const E = window.__echoes;
  if (window.__gntFeel) return true;
  const P = (window.__gntFeel = { keys: [], frames: [], on: true, own: [] });
  // ts = the event's own timestamp (input creation), td = when the page's
  // main thread dispatched it (the first moment any page code can see it).
  addEventListener('keydown', (e) => { if (!e.repeat) P.keys.push({ code: e.code, ts: e.timeStamp, td: performance.now(), down: 1 }); }, { capture: true });
  addEventListener('keyup', (e) => P.keys.push({ code: e.code, ts: e.timeStamp, td: performance.now(), down: 0 }), { capture: true });
  addEventListener('mousedown', (e) => P.keys.push({ code: `Mouse${e.button}`, ts: e.timeStamp, td: performance.now(), down: 1 }), { capture: true });
  addEventListener('mouseup', (e) => P.keys.push({ code: `Mouse${e.button}`, ts: e.timeStamp, td: performance.now(), down: 0 }), { capture: true });
  // Own-seat presentation events that reached the view bus (predicted or not).
  for (const t of ['ally_basic', 'ally_cast', 'ally_dodge', 'interact', 'presentation_retract']) {
    E.on(t, (ev) => {
      const g = E.net.session.debugGuest();
      const own = g && (ev.seat === g.seat || ev.id === g.entityId || ev.by === g.entityId);
      if (own) P.own.push({ t: performance.now(), type: t, predicted: !!ev.predicted, predId: ev.predId ?? null, inputSeq: ev.inputSeq ?? null, slot: ev.slot ?? null, id: t === 'interact' ? ev.id : null });
    });
  }
  let tiles = null;
  const loop = () => {
    if (!P.on) return;
    requestAnimationFrame(loop);
    const tp = performance.now();
    const pose = E.net.session.ownPose();
    if (!tiles || tiles.length < 5) tiles = [...document.querySelectorAll('.hud-group-skill .hud-slot'), ...document.querySelectorAll('.hud-group-dodge .hud-slot')];
    let cool = '';
    for (const el of tiles) cool += el.classList.contains('is-cooling') ? '1' : '0';
    P.frames.push({ tp, rx: pose ? pose.rx : null, rz: pose ? pose.rz : null, dash: pose ? !!pose.dashing : null, cool });
    if (P.frames.length > 60000) P.frames.splice(0, 20000);
  };
  requestAnimationFrame(loop);
  return true;
};

let srv = null;
let browser = null;
try {
  srv = await startServer({ port: opt.port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, autoplay: true, width: opt.w, height: opt.h });
  const host = await openClient(browser, { base: opt.base, server: srv.url, name: 'Host', seed: 7, w: 1280, h: 720, tab: true });
  host.role = 'host';
  const cover = await openCover(browser);
  await host.page.bringToFront();
  const guest = await openClient(browser, { base: opt.base, server: srv.url, name: 'Feel', seed: 8, w: opt.w, h: opt.h });
  guest.role = 'guest';
  const code = await hostRoom(host);
  const seat = await joinRoom(guest, code, opt.seat);
  report.seat = seat;
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  await cover.bringToFront();
  await sleep(400);
  report.hostVisibility = await visibility(host);
  if (report.hostVisibility !== 'hidden') throw new Error(`host tab is ${report.hostVisibility}`);
  await guest.page.bringToFront();
  report.guestVisibility = await visibility(guest);
  // Host: a combat room of Act I, the Healer idle (no autopilot), kept alive.
  await host.page.evaluate(() => {
    const E = window.__echoes;
    E.cmd('startRun', { act: 1 });
  });
  await sleep(1500);
  // The guest's seat is kept on its feet between the probes (a Downed seat
  // cannot act — that is the deny probe's job, not an accident of the room).
  let healSeat = null;
  const hostKeep = () =>
    host.page.evaluate((heal) => {
      const E = window.__echoes;
      const s = E.state();
      if (heal !== null) {
        const m = s.party.find((x) => x.id === heal);
        if (m && m.hp < m.maxHp * 0.6) E.cmd('setHp', heal, 1);
      }
      if (!s.run || !s.run.active) E.cmd('startRun', { act: 1 });
      else if (s.run.phase !== 'combat') {
        // A cleared room: take nothing, go on (the next room is combat again).
        try {
          E.cmd('draftDecline');
          E.cmd('pathChoose', 0);
          E.cmd('shopAdvance');
        } catch {
          /* page-specific */
        }
      }
      const alive = (s.enemies || []).filter((e) => e.hp > 0).length;
      if (s.run && s.run.phase === 'combat' && alive < 3) {
        for (const [x, z] of [[4.5, 3.2], [-4.5, 3.4], [4.2, -3.1]]) E.cmd('spawn', 'mantis', x, z, { hpMul: 25 });
      }
      return { phase: s.run ? s.run.phase : null, alive };
    }, healSeat);
  const keep = setInterval(() => hostKeep().catch(() => {}), 2500);
  await hostKeep();
  await guest.page.evaluate(PROBE);
  const guestPeer = await netEval(guest, 'return n.peerId;');
  const seatId = await host.page.evaluate((s) => {
    const p = window.__echoes.state().party.find((m) => m.partyIndex === s);
    return p ? p.id : null;
  }, seat);
  healSeat = seatId;
  const kb = guest.page.keyboard;
  const mouse = guest.page.mouse;
  const ownPos = () => guest.page.evaluate(() => window.__echoes.net.session.ownPose());
  const nearestEnemyScreen = () =>
    guest.page.evaluate(() => {
      const E = window.__echoes;
      const pose = E.net.session.ownPose();
      if (!pose) return null;
      let best = null;
      let bd = Infinity;
      for (const e of E.state().enemies || []) {
        if (!(e.hp > 0)) continue;
        const d = Math.hypot(e.x - pose.rx, e.z - pose.rz);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      if (!best) return null;
      const p = E.content.project(best.x, best.z);
      return { ...p, d: bd, id: best.id };
    });

  for (const condName of opt.conds) {
    const cond = CONDS[condName] ?? condName;
    log(`condition ${condName} (${cond})`);
    await admin(srv, '/admin/conditioner', { target: guestPeer, up: cond || 'off', down: cond || 'off' });
    await sleep(4000);
    await netEval(guest, 'n.session.resetStats(); return true;');
    await guest.page.evaluate(() => {
      const P = window.__gntFeel;
      P.keys.length = 0;
      P.frames.length = 0;
      P.own.length = 0;
      window.__gntCue0 = window.__echoes.audio ? window.__echoes.audio.cueLog(600).length : 0;
      window.__gntCueT0 = performance.now();
    });
    const c = { cond: condName, spec: cond, t0: Date.now(), marks: [] };
    const mark = async (kind) => c.marks.push({ kind, at: await guest.page.evaluate(() => performance.now()) });
    // ---- movement from rest (D / A alternating), 10 presses
    for (let i = 0; i < 10; i++) {
      const k = i % 2 ? 'KeyA' : 'KeyD';
      await sleep(450);
      await kb.down(k);
      await sleep(260);
      await kb.up(k);
    }
    await mark('move_done');
    // ---- dodge from rest, 6 presses (the 1.2 s cooldown between)
    for (let i = 0; i < 6; i++) {
      await sleep(1400);
      await kb.press('Space');
    }
    await mark('dodge_done');
    // ---- kit skills 1-4 aimed at the nearest enemy, 2 rounds
    for (let r = 0; r < 2; r++) {
      for (let s = 1; s <= 4; s++) {
        const t = await nearestEnemyScreen();
        if (t) await mouse.move(t.x, t.y);
        await sleep(250);
        await kb.press(`Digit${s}`);
        await sleep(700);
      }
      await sleep(4500);
    }
    await mark('kit_done');
    // ---- basic: right mouse held on the nearest enemy, 8 presses
    for (let i = 0; i < 8; i++) {
      const t = await nearestEnemyScreen();
      if (t) await mouse.move(t.x, t.y);
      await sleep(300);
      await mouse.down({ button: 'right' });
      await sleep(450);
      await mouse.up({ button: 'right' });
      await sleep(250);
    }
    await mark('basic_done');
    // ---- interact: a fresh Dewfont beside the guest's body, E
    let ixSpawned = 0;
    for (let i = 0; i < 4; i++) {
      const p = await ownPos();
      if (p) {
        await host.page.evaluate(({ x, z }) => window.__echoes.cmd('spawnInteractable', 'dewfont', x, z), { x: p.rx + 0.55, z: p.rz });
        ixSpawned += 1;
      }
      await sleep(900); // the asset reaches the guest's replica (interp delay + RTT)
      if (i === 0) await guest.page.screenshot({ path: `captures/gntM5b-feel-${condName}-prompt.png` });
      await kb.press('KeyE');
      await sleep(900);
    }
    c.ixSpawned = ixSpawned;
    await mark('interact_done');
    // ---- deny: the host downs the seat, the guest casts at once (it has not
    // seen the Downed state yet) -> the host resolves nothing -> retraction.
    const denies = [];
    healSeat = null;
    for (let i = 0; i < 3; i++) {
      await sleep(3600); // skill_1 off cooldown again
      const before = await netEval(guest, 'const s = n.stats(); return { retractions: s.retractions, predicted: s.predictedActions };');
      await host.page.evaluate((id) => window.__echoes.cmd('setHp', id, 0), seatId);
      await kb.press('Digit1');
      await sleep(1200);
      const after = await netEval(guest, 'const s = n.stats(); return { retractions: s.retractions, predicted: s.predictedActions, mis: s.mispredictRetractMs };');
      const tile = await guest.page.evaluate(() => {
        const t = document.querySelectorAll('.hud-group-skill .hud-slot')[0];
        return t ? t.classList.contains('is-cooling') : null;
      });
      denies.push({ before, after, tileCoolingAfter: tile });
      await host.page.evaluate((id) => window.__echoes.cmd('setHp', id, 1), seatId);
      await sleep(600);
    }
    c.denies = denies;
    healSeat = seatId;
    await mark('deny_done');
    // ------------------------------------------------------ collect --
    const probe = await guest.page.evaluate(() => {
      const P = window.__gntFeel;
      const E = window.__echoes;
      const cues = E.audio ? E.audio.cueLog(600).filter((x) => x.t >= 0) : [];
      return { keys: P.keys.slice(), frames: P.frames.slice(), own: P.own.slice(), cues, cueT0: window.__gntCueT0, bootT0: performance.timeOrigin };
    });
    const st = await netEval(guest, 'return n.stats();');
    c.stats = {
      ownActionFeedbackMs: st.ownActionFeedbackMs,
      mispredictRetractMs: st.mispredictRetractMs,
      retractions: st.retractions,
      predicted: st.predictedActions,
      confirmed: st.confirmedActions,
      eventsSuppressed: st.eventsSuppressed,
      predErrP95: st.predErrP95,
      predErrMax: st.predErrMax,
      maxCorrectionPerFrame: st.maxCorrectionPerFrame,
      remoteJumpMax: st.remoteJumpMax,
      desyncs: st.desyncs,
      hashChecks: st.hashChecks,
      rttMs: st.rttMs,
      lossPct: st.lossPct,
      interpDelayMs: st.interpDelayMs,
      cosmetics: st.cosmetics,
      shadowByKind: null,
    };
    c.shadow = await guest.page.evaluate(() => {
      const g = window.__echoes.net.session.debugGuest();
      return g ? g.shadow.stats() : null;
    });
    // Frame analysis: for each trusted keydown, frames until its visible effect.
    const F = probe.frames;
    const fr = [];
    for (let i = 1; i < F.length; i++) fr.push(F[i].tp - F[i - 1].tp);
    const total = fr.reduce((a, b) => a + b, 0);
    c.fps = fr.length ? { avg: Math.round((fr.length / total) * 10000) / 10, p5: Math.round((1000 / pct(fr, 0.95)) * 10) / 10, frameMsP95: Math.round(pct(fr, 0.95) * 10) / 10, over50: fr.filter((x) => x > 50).length, frames: fr.length } : null;
    const after = (ts) => {
      const i = F.findIndex((f) => f.tp > ts);
      return i < 0 ? null : i;
    };
    const move = [];
    const dodge = [];
    const tile = [];
    for (const k of probe.keys) {
      if (!k.down) continue;
      // Frames are counted from the DISPATCH (td): frame 1 = the first frame
      // rendered after page code could see the key. ts -> td (the browser's
      // own input delivery) is reported apart, as dispatchMs.
      const i = after(k.td);
      if (i === null || i < 1) continue;
      const base = F[i - 1];
      if (k.code === 'KeyD' || k.code === 'KeyA') {
        let n = null;
        for (let j = i; j < Math.min(F.length, i + 30); j++) {
          if (F[j].rx !== null && base.rx !== null && Math.hypot(F[j].rx - base.rx, F[j].rz - base.rz) > 1e-3) {
            n = j - i + 1;
            break;
          }
        }
        move.push({ frames: n, msToFrame: Math.round((F[i].tp - k.td) * 10) / 10, dispatchMs: Math.round((k.td - k.ts) * 10) / 10 });
      } else if (k.code === 'Space') {
        let n = null;
        let len = 0;
        let lenMs = 0;
        for (let j = i; j < Math.min(F.length, i + 60); j++) {
          if (F[j].dash) {
            if (n === null) n = j - i + 1;
            len += 1;
          } else if (n !== null) {
            lenMs = F[j].tp - F[i + n - 1].tp;
            break;
          }
        }
        dodge.push({ frames: n, dashFrames: len, dashMs: Math.round(lenMs), tileFrames: (() => {
          for (let j = i; j < Math.min(F.length, i + 30); j++) if (F[j].cool[4] === '1' && base.cool[4] !== '1') return j - i + 1;
          return null;
        })() });
      } else if (/^Digit[1-4]$/.test(k.code)) {
        const s = Number(k.code.slice(5)) - 1;
        if (base.cool[s] === '1') {
          tile.push({ slot: s + 1, frames: 'was_cooling' });
          continue;
        }
        let n = null;
        for (let j = i; j < Math.min(F.length, i + 30); j++) {
          if (F[j].cool[s] === '1') {
            n = j - i + 1;
            break;
          }
        }
        tile.push({ slot: s + 1, frames: n });
      }
    }
    const disp = probe.keys.filter((k) => k.down).map((k) => k.td - k.ts);
    c.dispatchMs = disp.length ? { p50: Math.round(pct(disp, 0.5) * 10) / 10, p95: Math.round(pct(disp, 0.95) * 10) / 10, max: Math.round(Math.max(...disp) * 10) / 10 } : null;
    c.move = { n: move.length, framesMax: Math.max(...move.map((m) => m.frames ?? 99)), all: move };
    c.dodge = { n: dodge.length, framesMax: Math.max(...dodge.map((m) => m.frames ?? 99)), all: dodge };
    c.tile = { n: tile.length, all: tile };
    // Doubles: own authoritative presentation events that reached the view
    // bus while a prediction of the same kind existed = a doubled swing/cast.
    const own = probe.own;
    const predicted = own.filter((x) => x.predicted && x.type !== 'presentation_retract');
    const authOwn = own.filter((x) => !x.predicted && x.type !== 'presentation_retract');
    const cueByEvent = {};
    for (const q of probe.cues) {
      const ev = q.event || q.source;
      cueByEvent[`${q.cue}`] = (cueByEvent[`${q.cue}`] || 0) + 1;
      void ev;
    }
    // A DOUBLE = an authoritative own event replayed although a prediction of
    // the same action (type + slot, seq within ±3; an interact: same asset
    // within 1.5 s) was presented.
    let doubled = 0;
    for (const a of authOwn) {
      const hit = predicted.find((p) => {
        if (p.type !== a.type) return false;
        if (a.type === 'interact') return p.id === a.id && a.t - p.t < 1500 && a.t >= p.t;
        const ps = p.predId ? Number(String(p.predId).split(':')[0]) : NaN;
        return (a.slot ?? null) === (p.slot ?? null) && Number.isFinite(ps) && Number.isInteger(a.inputSeq) && Math.abs(ps - a.inputSeq) <= 3;
      });
      if (hit) doubled += 1;
    }
    c.doubles = {
      doubled,
      predicted: predicted.length,
      predictedByType: predicted.reduce((m, x) => ((m[x.type] = (m[x.type] || 0) + 1), m), {}),
      authoritativeOwnReplayed: authOwn.length,
      authoritativeOwnByType: authOwn.reduce((m, x) => ((m[x.type] = (m[x.type] || 0) + 1), m), {}),
      retracts: own.filter((x) => x.type === 'presentation_retract').length,
      cues: cueByEvent,
    };
    c.pageErrors = guest.errors.slice(0, 10).concat(host.errors.slice(0, 10));
    report.conditions.push(c);
    log(`${condName}: fps ${JSON.stringify(c.fps)} move ${c.move.framesMax} dodge ${c.dodge.framesMax} feedback ${JSON.stringify(c.stats.ownActionFeedbackMs)} retract ${JSON.stringify(c.stats.mispredictRetractMs)}`);
  }
  clearInterval(keep);
  await assertNoReload([host, guest]);
  await guest.page.screenshot({ path: `captures/gntM5b-feel-seat${opt.seat}-end.png` });
  // ------------------------------------------------------------ gates --
  const G = (report.gates = {});
  for (const c of report.conditions) {
    const fb = c.stats.ownActionFeedbackMs;
    const mr = c.stats.mispredictRetractMs;
    G[c.cond] = {
      'G5b.10 fps>=60': !!c.fps && c.fps.avg >= 60,
      'G5b.10 move<=1 frame': c.move.n > 0 && c.move.all.every((m) => m.frames === 1),
      'G5b.10 dodge pose<=1 frame': c.dodge.n > 0 && c.dodge.all.every((m) => m.frames === 1),
      'G5b.10 dodge window on the predicted body': c.dodge.all.every((m) => m.dashFrames > 0 && m.dashMs >= 200),
      'G5b.12 feedback p95<=17ms': !!fb && fb.p95 <= 17,
      'G5b.12 tile same frame': c.tile.all.filter((t) => t.frames !== 'was_cooling').every((t) => t.frames === 1) && c.dodge.all.every((m) => m.tileFrames === 1),
      'G5b.12 retract<=1 snapshot+1 frame': !!mr && mr.p95 <= 50 + 17,
      'G5b.12 denied casts retracted': c.denies.every((d) => d.after.retractions > d.before.retractions && d.tileCoolingAfter === false),
      'G5b.12 no doubled presentation': c.doubles.doubled === 0,
      pageErrors0: c.pageErrors.length === 0,
    };
  }
} catch (err) {
  report.crash = String(err && err.stack ? err.stack : err);
  console.error(report.crash);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
writeFileSync(opt.out, JSON.stringify(report, null, 1));
if (report.gates) for (const [k, v] of Object.entries(report.gates)) log(`${k}: ${JSON.stringify(v)}`);
log(`-> ${opt.out}`);
process.exit(report.crash ? 1 : 0);
