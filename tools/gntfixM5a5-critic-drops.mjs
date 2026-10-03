// gntfixM5a5-critic-drops.mjs — copy of tools/gntcnet5-drops.mjs with renamed outputs (the critic's evidence is kept). Original header: net critic r4: connection drop-offs on an OWN child server (own browsers).
// A guest close 4 s, B guest blackhole 7 s, C guest page reload -> Rejoin, D host blackhole 5 s,
// E kill-host -> migration, F server kill -> title + SP intact.
// node tools/gntcnet5-drops.mjs --port 7843 [--legs A,B,C,D,E,F]
import { startServer, admin, writeJson, shot, sleep, r2 } from './gntcnet5-lib.mjs';
import { bootClients, formSession, goCombat, closeClient, waitFor } from './gntcnet5-session-lib.mjs';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7843);
const legs = String(A.legs || 'A,B,C,D,E,F').split(',');
const out = { tool: 'gntcnet5-drops', port, checks: [], data: {} };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(detail).slice(0, 500)); };
const srv = await startServer(port, ['--admin']);
const cl = await bootClients(3, { port, w: 1280, h: 720, names: ['DHost', 'DGuestA', 'DGuestB'] });
const [H, G1, G2] = cl;
const hudText = (c) => c.page.evaluate(() => { const parts = []; for (const sel of ['#nt-hud', '.nt-banner', '.nt-note', '[class*="nt-"]']) for (const el of document.querySelectorAll(sel)) { const t = (el.innerText || '').trim(); if (t && !parts.includes(t)) parts.push(t); } return parts.join(' | ').slice(0, 600); });
const status = (c) => c.page.evaluate(() => { const E = window.__echoes; const n = E.net; let st = null; try { st = n.session.status(); } catch { /* */ } const s = E.state(); return { net: n.state, role: n.role, seat: n.seat, synced: st && st.synced, frozen: st && st.frozen, hostLost: st && st.hostLost, reconnecting: st && st.reconnecting, phase: s.run && s.run.phase, room: s.run && s.run.room, level: E.campaign.state().level, tick: E.tick, app: E.app.state, stack: E.app.stack(), party: (s.party || []).map((m) => [m.id, Math.round(m.x * 100) / 100, Math.round(m.z * 100) / 100, m.hp]), wallet: s.wallet, skills: JSON.stringify(s.skills), stats: (() => { const x = n.stats(); return { desyncs: x.desyncs, hashChecks: x.hashChecks, reconnects: x.reconnects, lastReconnectMs: x.lastReconnectMs, migrations: x.migrations, migration: x.migration, fullSnapshots: x.fullSnapshots, playerController: x.playerController }; })() }; });
const seatCtl = (seat) => H.page.evaluate((s) => { const st = window.__echoes.net.session.debugHost ? window.__echoes.net.session.debugHost() : null; const e = window.__echoes.net.session.debugGuest ? null : null; const reg = window.__echoes.save && window.__echoes.save.capture ? null : null; void st; void e; void reg; const party = window.__echoes.state().party.find((m) => m.id === s); return party; }, seat);
const walkCheck = async (G, seat, hostPage) => {
  const x0 = await hostPage.evaluate((s) => window.__echoes.state().party.find((m) => m.id === s).x, seat);
  await G.page.keyboard.down('KeyD'); await sleep(700); await G.page.keyboard.up('KeyD'); await sleep(700);
  const x1 = await hostPage.evaluate((s) => window.__echoes.state().party.find((m) => m.id === s).x, seat);
  return r2(x1 - x0);
};
const stateMatch = async (G, seat) => {
  await sleep(600);
  const [h, g] = await Promise.all([status(H), status(G)]);
  const hp = h.party.find((p) => p[0] === seat), gp = g.party.find((p) => p[0] === seat);
  return { hostPhase: h.phase, guestPhase: g.phase, hostRoom: h.room, guestRoom: g.room, hostLevel: h.level, guestLevel: g.level, wallet: [h.wallet, g.wallet], skillsEq: h.skills === g.skills, ownPosErr: hp && gp ? r2(Math.hypot(hp[1] - gp[1], hp[2] - gp[2])) : null, hpEq: hp && gp ? hp[3] === gp[3] : null };
};
try {
  const s = await formSession(cl);
  out.data.code = s.code;
  await goCombat(H);
  await H.page.evaluate(() => { window.__gn3keep = setInterval(() => { try { const E = window.__echoes; for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.6) E.cmd('setHp', m.id, m.maxHp); } catch { /* */ } }, 500); });
  await H.page.evaluate(() => { const E = window.__echoes; window.__gn3dur = setInterval(() => { try { const st = E.state(); if (st.run.phase === 'combat' && (st.enemies || []).length < 2) E.cmd('spawn', 'mantis', 6, 5, { hpMul: 300, dmgMul: 0 }); } catch { /* */ } }, 500); });
  await sleep(2000);
  const peers = await Promise.all(cl.map((c) => c.page.evaluate(() => window.__echoes.net.peerId)));
  const seats = [0, ...(await Promise.all([G1, G2].map((g) => g.page.evaluate(() => window.__echoes.net.session.debugGuest().entityId))))];
  out.data.peers = peers; out.data.seats = seats;

  if (legs.includes('A') || legs.includes('B')) for (const mode of ['close', 'blackhole']) {
    const leg = mode === 'close' ? 'A' : 'B';
    if (!legs.includes(leg)) continue;
    const forMs = mode === 'close' ? 4000 : 7000;
    const pid = await G1.page.evaluate(() => window.__echoes.net.peerId);
    const t0 = Date.now();
    const dr = await admin(port, '/admin/drop', { peerId: pid, mode, forMs });
    // during
    let heldAt = null, otherNoteAt = null, g1BannerAt = null; const notes = [];
    while (Date.now() - t0 < forMs - 300) {
      const rs = await admin(port, '/stats');
      const room = rs.rooms.find((r) => r.code === s.code);
      const seat = room && room.seats[seats[1]];
      if (!heldAt && seat && (seat.held || !seat.connected)) heldAt = Date.now() - t0;
      const t2 = await hudText(G2); if (!otherNoteAt && /reconnect|lost|dropped|AI/i.test(t2)) { otherNoteAt = Date.now() - t0; notes.push(t2); }
      const t1 = await hudText(G1).catch(() => ''); if (!g1BannerAt && /reconnect|lost|connection/i.test(t1)) { g1BannerAt = Date.now() - t0; notes.push('G1: ' + t1); }
      await sleep(250);
    }
    await shot(G1, `gntfixM5a5-critic-drops-${leg}-guest-during.png`); await shot(G2, `gntfixM5a5-critic-drops-${leg}-other-during.png`);
    const restoreAt = t0 + forMs;
    const syncedW = await waitFor(G1.page, () => { const st = window.__echoes.net.session.status(); return st.synced && !st.reconnecting && window.__echoes.net.state === 'guest'; }, { timeout: 30000, poll: 25 });
    const syncedAfterRestoreMs = Date.now() - restoreAt - (syncedW.ok ? 0 : 0);
    const match = await stateMatch(G1, seats[1]);
    const dx = await walkCheck(G1, seats[1], H.page);
    const st1 = await status(G1);
    out.data[leg] = { drop: dr, heldAtMs: heldAt, otherNoteAtMs: otherNoteAt, g1BannerAtMs: g1BannerAt, notes, synced: syncedW, syncedAfterRestoreMs, match, controlDx: dx, g1: st1 };
    check(`${leg} guest ${mode} ${forMs} ms: seat held for AI, others told, reconnect restores state + control within 3 s of link restore`,
      syncedW.ok && syncedAfterRestoreMs <= 3000 && match.hostPhase === match.guestPhase && match.hostRoom === match.guestRoom && match.skillsEq && (match.ownPosErr === null || match.ownPosErr < 0.3) && dx > 0.5,
      { heldAtMs: heldAt, otherNoteAtMs: otherNoteAt, g1BannerAtMs: g1BannerAt, syncedAfterRestoreMs, match, controlDx: dx, reconnects: st1.stats.reconnects, desyncs: st1.stats.desyncs });
    await sleep(1500);
  }

  if (legs.includes('C')) {
    // guest page reload mid-session -> title "Rejoin <code>?"
    const t0 = Date.now();
    await G1.page.goto('http://127.0.0.1:4328/?net=' + encodeURIComponent('ws://127.0.0.1:' + port + '/echoes'), { waitUntil: 'domcontentloaded' });
    const bootW = await waitFor(G1.page, () => /press any key|rejoin/i.test(document.body.innerText || ''), { timeout: 90000, poll: 200 });
    out.data.C_boot = { ok: bootW.ok, ms: bootW.ms, url: G1.page.url(), text: await G1.page.evaluate(() => (document.body.innerText || '').replace(/s+/g, ' ').slice(0, 400)).catch((e) => 'ERR ' + e.message) };
    if (!bootW.ok) await shot(G1, 'gntfixM5a5-critic-drops-C-boot-timeout.png');
    await sleep(800);
    out.data.C_titleBeforeKey = await hudText(G1).catch(() => '');
    out.data.C_bodyBeforeKey = await G1.page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400));
    const modalUp = await G1.page.evaluate(() => /Rejoin [A-Z0-9]{5}?/.test(document.body.innerText || ''));
    out.data.C_modalOnBoot = modalUp; out.data.C_modalAtMs = Date.now() - t0;
    await shot(G1, 'gntfixM5a5-critic-drops-C-guest-boot.png');
    if (!modalUp) { await G1.page.keyboard.press('Enter'); await sleep(1500); }
    const tOffer = Date.now();
    const offer = await waitFor(G1.page, () => { const t = document.body.innerText || ''; return /rejoin/i.test(t) ? t.slice(0, 1500) : false; }, { timeout: 20000, poll: 200 });
    const info = await G1.page.evaluate(() => { try { return window.__echoes.net.rejoinInfo(); } catch (e) { return 'ERR ' + e.message; } });
    await shot(G1, 'gntfixM5a5-critic-drops-C-guest-title-rejoin.png');
    // accept the rejoin through the player-facing path: focus the Rejoin item and press Enter
    let accepted = null;
    if (offer.ok) {
      accepted = await G1.page.evaluate(() => { const els = [...document.querySelectorAll('button, [role="button"], [data-action], .ti-item, li, a')]; const el = els.find((e) => /rejoin/i.test(e.innerText || '')); if (el) { el.click(); return (el.innerText || '').trim().slice(0, 80); } return null; });
      if (!accepted) { await G1.page.keyboard.press('Enter'); accepted = 'Enter'; }
    }
    const back = await waitFor(G1.page, () => { const n = window.__echoes.net; try { return n.state === 'guest' && n.session.status().synced; } catch { return false; } }, { timeout: 30000, poll: 50 });
    const match = back.ok ? await stateMatch(G1, seats[1]) : null;
    const dx = back.ok ? await walkCheck(G1, seats[1], H.page) : null;
    await shot(G1, 'gntfixM5a5-critic-drops-C-guest-after-rejoin.png');
    out.data.C = { acceptToSyncedMs: Date.now() - tOffer, offer: offer.ok ? offer.v.slice(0, 400) : null, rejoinInfo: info, accepted, back, reloadToSyncedMs: Date.now() - t0, match, controlDx: dx };
    check('C guest page reload -> title offers Rejoin -> back in the same seat with state', offer.ok && back.ok && match && match.hostRoom === match.guestRoom && dx > 0.5, { offer: offer.ok, accepted, backMs: back.ms, match, controlDx: dx, seat: await G1.page.evaluate(() => window.__echoes.net.seat) });
    await sleep(1000);
  }

  if (legs.includes('D')) {
    // host blackhole 5 s (inside the 10 s grace) -> guests freeze + banner, resume, no migration
    const t0 = Date.now();
    await admin(port, '/admin/drop', { peerId: peers[0], mode: 'blackhole', forMs: 5000 });
    let frozenAt = null, banner = null;
    while (Date.now() - t0 < 4800) { const st = await status(G2); if (!frozenAt && (st.frozen || st.hostLost)) { frozenAt = Date.now() - t0; banner = await hudText(G2); } await sleep(150); }
    await shot(G2, 'gntfixM5a5-critic-drops-D-guest-frozen.png');
    const resumed = await waitFor(G2.page, () => { const st = window.__echoes.net.session.status(); return !st.frozen && !st.hostLost && st.synced; }, { timeout: 20000, poll: 25 });
    const after = await status(G2);
    const hostRole = await H.page.evaluate(() => window.__echoes.net.role);
    out.data.D = { frozenAtMs: frozenAt, banner, resumedAfterRestoreMs: Date.now() - (t0 + 5000), resumed, after, hostRole };
    check('D host blackhole 5 s: guests freeze with banner, resume after restore, host keeps its role', frozenAt !== null && resumed.ok && hostRole === 'host' && after.stats.migrations === 0, { frozenAtMs: frozenAt, banner, resumedAfterRestoreMs: out.data.D.resumedAfterRestoreMs, migrations: after.stats.migrations, desyncs: after.stats.desyncs });
    await sleep(1500);
  }

  if (legs.includes('E')) {
    // kill-host -> 10 s grace -> migration
    const before = await status(H);
    const t0 = Date.now();
    const kr = await admin(port, '/admin/kill-host', { code: s.code });
    let lostAt = null, lostBanner = null, becameAt = null, newHost = null; const seen = [];
    while (Date.now() - t0 < 25000) {
      for (const [i, g] of [[1, G1], [2, G2]]) {
        const st = await status(g).catch(() => null);
        if (!st) continue;
        if (!lostAt && (st.hostLost || st.frozen)) { lostAt = Date.now() - t0; lostBanner = await hudText(g); }
        if (!becameAt && st.role === 'host') { becameAt = Date.now() - t0; newHost = i; }
      }
      if (becameAt) break;
      await sleep(200);
    }
    await sleep(3000);
    const nh = newHost === 1 ? G1 : G2; const og = newHost === 1 ? G2 : G1;
    const nhs = nh ? await status(nh) : null;
    const t1 = nh ? await nh.page.evaluate(() => ({ tick: window.__echoes.tick, t: performance.now() })) : null;
    await sleep(2000);
    const t2 = nh ? await nh.page.evaluate(() => ({ tick: window.__echoes.tick, t: performance.now() })) : null;
    const ogs = og ? await status(og) : null;
    const oldHost = await status(H).catch(() => null);
    const oldHostText = await H.page.evaluate(() => (document.body.innerText || '').slice(0, 600)).catch(() => '');
    await shot(H, 'gntfixM5a5-critic-drops-E-oldhost.png'); if (nh) await shot(nh, 'gntfixM5a5-critic-drops-E-newhost.png'); if (og) await shot(og, 'gntfixM5a5-critic-drops-E-otherguest.png');
    const rate = t1 && t2 ? (t2.tick - t1.tick) / ((t2.t - t1.t) / 1000) : null;
    out.data.E = { kill: kr, lostAtMs: lostAt, lostBanner, becameHostAtMs: becameAt, newHostSeat: newHost, before: { phase: before.phase, room: before.room, level: before.level, wallet: before.wallet, skills: before.skills }, newHostState: nhs && { phase: nhs.phase, room: nhs.room, level: nhs.level, wallet: nhs.wallet, skillsEq: nhs.skills === before.skills, migration: nhs.stats.migration }, newHostTicksPerSec: rate, otherGuest: ogs && { role: ogs.role, synced: ogs.synced, desyncs: ogs.stats.desyncs, phase: ogs.phase, room: ogs.room }, oldHost: oldHost && { net: oldHost.net, app: oldHost.app, stack: oldHost.stack }, oldHostText };
    check('E kill-host: guests see host lost, migration after the 10 s grace within 5 s, new host ticks 60/s, other guest synced, run continues',
      lostAt !== null && becameAt !== null && becameAt <= 16000 && rate > 55 && ogs && ogs.synced && ogs.stats.desyncs === 0 && nhs && nhs.level === before.level,
      { lostAtMs: lostAt, lostBanner, becameHostAtMs: becameAt, newHostTicksPerSec: r2(rate), migration: nhs && nhs.stats.migration, continuity: out.data.E.newHostState, before: out.data.E.before, otherGuest: out.data.E.otherGuest });
    check('E old host gets an explicit message (not a silent title)', /closed|lost|ended|host|session|disconnect/i.test(oldHostText) && oldHost && oldHost.net !== 'host', { oldHost: out.data.E.oldHost, text: oldHostText.slice(0, 300) });
  }

  if (legs.includes('G')) {
    // realistic host link loss longer than the 10 s grace: blackhole the host 18 s -> migration -> link back
    const before = await status(H);
    const t0 = Date.now();
    await admin(port, '/admin/drop', { peerId: peers[0], mode: A.gmode || 'close', forMs: 18000 });
    let lostAt = null, becameAt = null, newHost = null, hostSawAt = null, hostSaw = null; const gtrail = [];
    while (Date.now() - t0 < 30000) {
      { const rs = await admin(port, '/stats').catch(() => null); const room = rs && rs.rooms && rs.rooms[0]; const g2s = await G2.page.evaluate(() => { const st = window.__echoes.net.session.status(); return { role: st.role, frozen: st.frozen, hostLost: st.hostLost, synced: st.synced }; }).catch(() => null); const g2t = await hudText(G2).catch(() => ''); gtrail.push({ ms: Date.now() - t0, room: room && { state: room.state, host: room.hostPeerId, seats: room.seats.map((x) => (x.connected ? 1 : 0) + (x.held ? 'h' : '')).join('') }, g2: g2s, g2text: g2t.slice(0, 200) }); }
      for (const [i, g] of [[1, G1], [2, G2]]) { const st = await status(g).catch(() => null); if (!st) continue; if (!lostAt && (st.hostLost || st.frozen)) lostAt = Date.now() - t0; if (!becameAt && st.role === 'host') { becameAt = Date.now() - t0; newHost = i; } }
      const ht = await hudText(H).catch(() => ''); if (!hostSawAt && /lost|reconnect|connection|closed|ended/i.test(ht)) { hostSawAt = Date.now() - t0; hostSaw = ht.slice(0, 300); }
      if (becameAt && Date.now() - t0 > 20000) break;
      await sleep(250);
    }
    await shot(H, 'gntfixM5a5-critic-drops-G-oldhost-during.png');
    // after the link is back (t0 + 18 s): watch the old host for 20 s
    const trail = [];
    while (Date.now() - t0 < 42000) { const st = await status(H).catch(() => null); const tx = await H.page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 260)).catch(() => ''); trail.push({ ms: Date.now() - t0, net: st && st.net, role: st && st.role, app: st && st.app, stack: st && st.stack, text: tx }); await sleep(2000); }
    await shot(H, 'gntfixM5a5-critic-drops-G-oldhost-after.png');
    // accept the "Rejoin" offer on the old host (Enter on the focused Rejoin button) and see where it lands
    const hasOffer = await H.page.evaluate(() => /rejoin/i.test(document.body.innerText || ''));
    let rejoin = null;
    if (hasOffer) {
      await H.page.keyboard.press('Enter');
      const w = await waitFor(H.page, () => { const n = window.__echoes.net; return n.state === 'guest' || n.state === 'host' ? n.state : false; }, { timeout: 15000, poll: 100 });
      await sleep(3000);
      const st = await status(H).catch(() => null);
      const txt = await H.page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400));
      const nhSeats = await (newHost === 1 ? G1 : G2).page.evaluate(() => window.__echoes.net.session.status().seats.map((s) => ({ i: s.index, name: s.name, connected: s.connected, host: s.host }))).catch(() => null);
      let dx = null;
      if (st && st.net === 'guest') { const NH = newHost === 1 ? G1 : G2; const p0 = await NH.page.evaluate(() => { const m = window.__echoes.state().party.find((q) => q.id === 0); return [m.x, m.z]; }); const o0 = await H.page.evaluate(() => { const p = window.__echoes.net.session.ownPose(); return p && [p.rx, p.rz]; }); const ctl = await NH.page.evaluate(() => { try { const s = window.__echoes.net.stats(); return { humanSeats: s.humanSeats, awaySeats: s.awaySeats, playerController: s.playerController }; } catch (e) { return String(e); } }); await H.page.keyboard.down('KeyD'); await sleep(2000); await H.page.keyboard.up('KeyD'); await sleep(800); const p1 = await NH.page.evaluate(() => { const m = window.__echoes.state().party.find((q) => q.id === 0); return [m.x, m.z]; }); const o1 = await H.page.evaluate(() => { const p = window.__echoes.net.session.ownPose(); return p && [p.rx, p.rz]; }); const ent = await H.page.evaluate(() => window.__echoes.net.session.debugGuest().entityId);
      const appSt = await H.page.evaluate(() => ({ app: window.__echoes.app.state, stack: window.__echoes.app.stack(), overlay: window.__echoes.app.overlay, lastFrames: window.__echoes.net.session.debugGuest().frames.slice(-2) }));
      await H.page.mouse.click(640, 400); await sleep(300);
      const q0 = await NH.page.evaluate(() => { const m = window.__echoes.state().party.find((q) => q.id === 0); return [m.x, m.z, m.hp]; });
      await H.page.keyboard.down('KeyA'); await sleep(2000); await H.page.keyboard.up('KeyA'); await sleep(800);
      const q1 = await NH.page.evaluate(() => { const m = window.__echoes.state().party.find((q) => q.id === 0); return [m.x, m.z, m.hp]; });
      const sentA = await H.page.evaluate(() => window.__echoes.net.session.debugGuest().frames.slice(-2));
      const ev = await NH.page.evaluate(() => window.__echoes.events.filter((e) => (e.id === 0 || e.seat === 0) && e.type !== 'sound').slice(-6).map((e) => e.type + '@' + e.tick));
      const later = { appSt, afterClickMove: Math.round(Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) * 100) / 100, sentA, seat0Events: ev }; dx = { later, hostSideMove: Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * 100) / 100, hostDx: Math.round((p1[0] - p0[0]) * 100) / 100, ownPoseDx: o0 && o1 ? Math.round((o1[0] - o0[0]) * 100) / 100 : null, entityId: ent, ctl }; }
      await shot(H, 'gntfixM5a5-critic-drops-G-oldhost-rejoined.png');
      rejoin = { waited: w, st: st && { net: st.net, role: st.role, seat: st.seat, synced: st.synced, phase: st.phase, room: st.room }, txt, nhSeats, healerDx: dx };
    }
    out.data.G_rejoin = { hasOffer, rejoin };
    check('G old host accepts "Rejoin" after the migration: lands in a coherent seat', !hasOffer || (rejoin && rejoin.st && rejoin.st.synced), out.data.G_rejoin);
    const nh = newHost === 1 ? G1 : newHost === 2 ? G2 : null; const og = newHost === 1 ? G2 : G1;
    const nhs = nh ? await status(nh) : null; const ogs = await status(og).catch(() => null);
    out.data.G = { gtrail, before: { phase: before.phase, room: before.room, level: before.level }, lostAtMs: lostAt, becameHostAtMs: becameAt, newHostSeat: newHost, hostSawAtMs: hostSawAt, hostSaw, trail, newHost: nhs && { phase: nhs.phase, room: nhs.room, level: nhs.level, migration: nhs.stats.migration }, otherGuest: ogs && { role: ogs.role, net: ogs.net, synced: ogs.synced, desyncs: ogs.stats.desyncs } };
    const last = trail[trail.length - 1] || {};
    check('G host link lost 18 s (> grace): migration within 5 s after the grace, other guest follows', becameAt !== null && becameAt <= 16000 && ogs && ogs.synced, { lostAtMs: lostAt, becameHostAtMs: becameAt, migration: nhs && nhs.stats.migration, otherGuest: out.data.G.otherGuest });
    check('G old host, link restored after migration: ends on a usable screen with an explanation', last.net !== 'host' && /lost|closed|ended|migrat|another player|host|connection/i.test(trail.map((x) => x.text).join(' ')), { hostSawAtMs: hostSawAt, hostSaw, last });
  }

  if (legs.includes('F')) {
    const inSess = [];
    for (const c of cl) { const st = await status(c).catch(() => null); if (st && (st.net === 'host' || st.net === 'guest')) inSess.push(c); }
    const t0 = Date.now();
    srv.proc.kill();
    const results = await Promise.all(inSess.map(async (c) => {
      let firstBanner = null;
      const w = await waitFor(c.page, () => { const t = document.body.innerText || ''; return /connection to the server was lost/i.test(t) ? t.replace(/s+/g, ' ').slice(0, 300) : false; }, { timeout: 40000, poll: 200 });
      const st = await status(c).catch(() => null);
      return { tag: c.tag, msg: w.ok, ms: Date.now() - t0, net: st && st.net, app: st && st.app, text: w.v && w.v.slice(0, 200), firstBanner };
    }));
    for (const c of inSess) await shot(c, `gntfixM5a5-critic-drops-F-${c.tag}.png`);
    // SP by the player path on the first page that was in session: dismiss the message, New Game, walk
    const P = inSess[inSess.length - 1];
    const clickTxt = async (re) => { const box = await P.page.evaluate((src) => { const rx = new RegExp(src, 'i'); const els = [...document.querySelectorAll('button, [role="button"], li, a, div, span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && rx.test((e.innerText || '').trim()); }); els.sort((x, y) => x.getBoundingClientRect().width * x.getBoundingClientRect().height - y.getBoundingClientRect().width * y.getBoundingClientRect().height); const e = els[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: (e.innerText || '').trim().slice(0, 40) }; }, re); if (box) { await P.page.mouse.click(box.x, box.y); } return box; };
    let sp = { steps: [] };
    for (let k = 0; k < 4; k++) { const st = await P.page.evaluate(() => window.__echoes.app.state); if (st === 'title') break; await P.page.keyboard.press('Enter'); await sleep(700); sp.steps.push('Enter'); }
    sp.newGame = await clickTxt('^new game$'); await sleep(1200);
    const conf = await clickTxt('^(start|begin|new game|yes|overwrite|start new game)$'); sp.confirm = conf; 
    const camp = await waitFor(P.page, () => window.__echoes.app.state === 'playing' && window.__echoes.state().scene === 'camp', { timeout: 30000 });
    const t1 = await P.page.evaluate(() => ({ tick: window.__echoes.tick, x: window.__echoes.state().party[0].x }));
    await P.page.keyboard.down('KeyD'); await sleep(900); await P.page.keyboard.up('KeyD'); await sleep(300);
    const t2 = await P.page.evaluate(() => ({ tick: window.__echoes.tick, x: window.__echoes.state().party[0].x, replica: (typeof window.__echoes.busCounters === 'function' ? window.__echoes.busCounters() : window.__echoes.busCounters || {}).replica, net: window.__echoes.net.state }));
    sp = { ...sp, camp: camp.ok, ticks: t2.tick - t1.tick, dx: Math.round((t2.x - t1.x) * 100) / 100, replica: t2.replica, net: t2.net };
    out.data.F = { results, sp };
    check('F server kill: every in-session client reaches "Connection to the server was lost"; New Game works afterwards', results.length > 0 && results.every((r) => r.msg) && sp.camp && sp.ticks > 60 && sp.dx > 0.5 && !sp.replica, { results: results.map((r) => ({ tag: r.tag, msg: r.msg, ms: r.ms, net: r.net, text: r.text && r.text.slice(0, 120) })), sp });
  }
} catch (e) {
  out.crash = String(e.stack || e); console.error(e);
} finally {
  out.pageErrors = Object.fromEntries(cl.map((c) => [c.tag, c.errors]));
  out.consoleErrors = Object.fromEntries(cl.map((c) => [c.tag, c.consoleLines.filter((l) => l.startsWith('[error]') && !/ERR_CONNECTION_REFUSED/.test(l)).slice(0, 20)]));
  out.pass = out.checks.filter((c) => c.ok).length; out.total = out.checks.length;
  writeJson(`gntfixM5a5-critic-drops-${legs.join('')}.json`, out);
  console.log(`${out.pass}/${out.total}`, 'pageErrors', JSON.stringify(out.pageErrors));
  try { srv.proc.kill(); } catch { /* */ }
  await Promise.all(cl.map(closeClient));
}
