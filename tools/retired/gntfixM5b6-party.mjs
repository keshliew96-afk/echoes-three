// gntfixM5b6-party.mjs — copy of the net critic's tools/gntcnet6-party.mjs (outputs renamed gntfixM5b6-<tag>*). Original: net critic r5: PARTY multiplayer ownership / deadlines / build replication
// with FOUR clients (host + 3 guests, each its own browser) on my own child server, guest links
// conditioned (default N1). Independent of the builder's gntPARTY-net (1 guest).
// node tools/gntcnet6-party.mjs --port 7843 [--cond lat75,jit10,loss10] [--shop 1] [--transit 1]
import { openClient, closeClient, sleep, writeJson, shot, startServer, admin, PREVIEW } from './gntcnet6-lib.mjs';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7843);
const COND = A.cond || 'lat75,jit10,loss10';
const TAG = A.tag || 'party';
const out = { tool: 'gntcnet6-party', startedAt: new Date().toISOString(), port, cond: COND, checks: [], notes: [], errors: {} };
const check = (what, ok, got) => { out.checks.push({ what, ok: !!ok, got }); console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ' ' + JSON.stringify(got).slice(0, 900)}`); };
const note = (m, d) => { out.notes.push({ m, d }); console.log('[note] ' + m + (d !== undefined ? ' ' + JSON.stringify(d).slice(0, 600) : '')); };

const ev = (c, fn, arg) => c.page.evaluate(fn, arg);
async function waitOn(c, fn, { timeout = 30000, poll = 50, arg } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { const v = await c.page.evaluate(fn, arg); if (v) return v; } catch { /* nav */ }
    await sleep(poll);
  }
  throw new Error(`${c.tag}: timeout ${String(fn).slice(0, 140)}`);
}
const phaseOf = (c) => ev(c, () => { const E = window.__echoes; const v = E.state().run; return { phase: v.phase, room: v.room, tick: E.tick, level: E.campaign && E.campaign.state ? E.campaign.state().level : null, party: v.party ? { openedTick: v.party.openedTick, deadlineTick: v.party.deadlineTick, owners: v.party.owners, cards: (v.party.cards || []).map((k) => ({ seat: k.seat, decided: k.decided, choice: k.choice, by: k.by, type: k.type, id: k.id, swap: k.swap, suggest: k.suggest })) } : null, shop: v.partyShop ? { done: v.partyShop.done, leaveTick: v.partyShop.leaveTick, leaveInTicks: v.partyShop.leaveInTicks, deadlineTick: v.partyShop.deadlineTick } : null }; });
// Every seat's build as the page sees it (host: sim; guest: replica read cmds).
const builds = (c) => ev(c, () => {
  const E = window.__echoes; const o = {};
  for (const s of [0, 1, 2, 3]) {
    try {
      const v = E.cmd('partyView', s);
      o[s] = v && typeof v === 'object' ? { slots: v.slots, skills: (v.skills || []).map((k) => k.id + ':' + (k.sockets || []).map((x) => (x ? x.node + (x.rarity ? '/' + x.rarity : '') : '-')).join(',')), bench: (v.bench || []).map((b) => (b && (b.node || b.id)) || b).join(','), purse: v.purse, filled: v.filled } : { raw: v };
    } catch (e) { o[s] = { err: String(e.message || e) }; }
  }
  try { const h = E.cmd('buildView'); o.healer = { skills: (h.skills || []).map((k) => k.id + ':' + (k.sockets || k.nodes || []).map((x) => (x ? (x.node || x.id || x) : '-')).join(',')), bench: (h.bench || []).length, wallet: E.state().run.wallet }; } catch (e) { o.healer = { err: String(e.message || e) }; }
  return o;
});
async function clearToPage(host) {
  for (let i = 0; i < 400; i++) {
    const r = await ev(host, () => { const E = window.__echoes; const v = E.state().run; if (v.phase === 'combat') { E.cmd('killAllEnemies'); if (v.room === 8) { try { E.cmd('killBoss'); } catch { /* */ } } } return v.phase === 'reward' && v.party ? 'page' : v.phase; });
    if (r === 'page') return 'page';
    if (['victory', 'defeat', 'idle'].includes(r)) return r;
    await sleep(150);
  }
  return 'timeout';
}

let srv = null; const cl = [];
try {
  srv = await startServer(port, ['--admin']);
  out.server = { pid: srv.pid, readyMs: srv.readyMs };
  const names = ['Host', 'Fox', 'Wren', 'Moss'];
  const url = (nm) => PREVIEW + `?menu=0&seed=7&netname=${nm}&net=${encodeURIComponent(`ws://127.0.0.1:${port}/echoes`)}`;
  for (const [i, nm] of names.entries()) cl[i] = await openClient(url(nm), { w: 960, h: 540, tag: nm });
  await Promise.all(cl.map((c) => waitOn(c, () => window.__echoes.tick > 240, { timeout: 120000, poll: 200 })));
  const [H, ...G] = cl;
  const code = await ev(H, async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  const seats = [];
  for (const g of G) seats.push(await ev(g, async (c) => { const n = window.__echoes.net; const r = await n.join(c); n.setReady(true); return r.seat; }, code));
  await sleep(500);
  out.start = await ev(H, () => window.__echoes.net.start());
  await Promise.all(G.map((g) => waitOn(g, () => window.__echoes.net.session.status().synced, { timeout: 30000, poll: 50 })));
  note('session', { code, seats });
  const peers = await Promise.all(G.map((g) => ev(g, () => window.__echoes.net.peerId)));
  if (COND !== 'off') for (const p of peers) out.cond = await admin(port, '/admin/conditioner', { target: p, up: COND, down: COND });
  for (const c of cl) await ev(c, () => { const E = window.__echoes; window.__pe = []; for (const t of ['party_autopick', 'party_deadline', 'draft_taken', 'path_chosen', 'shop_close', 'level_clear', 'level_transit', 'level_start', 'party_socket_close', 'seat_control']) E.on(t, (e) => window.__pe.push({ ...e, type: t, at: E.tick, wall: Date.now() })); return 1; });
  await ev(H, () => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  for (const g of G) await waitOn(g, () => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  await sleep(1500);
  const seatOf = (gi) => seats[gi];

  // ---------------------------------------------------------------- page 1
  check('page 1 reached', (await clearToPage(H)) === 'page');
  for (const g of G) await waitOn(g, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; }, { timeout: 15000 });
  const p1 = await phaseOf(H);
  out.page1 = p1;
  check(`page 1: owners on the host = 4 humans (${JSON.stringify(p1.party.owners)}), a deadline armed (${p1.party.deadlineTick - p1.party.openedTick} ticks)`, [0, 1, 2, 3].every((s) => p1.party.owners[s] === 'human') && p1.party.deadlineTick - p1.party.openedTick === 1800, p1.party);
  const other = seatOf(1); // Wren's seat, attacked by Fox
  const fox = G[0]; const foxSeat = seatOf(0);
  const local = await ev(fox, ([o]) => { const E = window.__echoes; const n = E.net; const W = E.content.world(); const s0 = n.session.partyStats().sent; const r = { pickOther: W.runSystem().partyPick(o, 'take'), pickHealer: W.runSystem().partyPick(0, 'take'), buyOther: W.runSystem().partyBuy(o, 0) }; try { r.fillOther = W.partySystem().build(o).autoFill(); } catch (e) { r.fillOther = 'ERR ' + e.message; } r.sent = n.session.partyStats().sent - s0; return r; }, [other]);
  check(`guest Fox: own-UI calls on Wren's seat / the Healer are refused locally, nothing sent (${JSON.stringify(local)})`, local.pickOther === false && local.pickHealer === false && local.buyOther === false && local.fillOther === false && local.sent === 0, local);
  const hb = await ev(H, () => window.__echoes.net.session.partyStats());
  const cardsBefore = JSON.stringify((await phaseOf(H)).party.cards);
  const buildsBefore = JSON.stringify(await builds(H));
  await ev(fox, ([o]) => { const s = window.__echoes.net.session; s.debugPartyCmd({ op: 'pick', seat: o, choice: 'take' }); s.debugPartyCmd({ op: 'pick', seat: 0, choice: 'leave' }); s.debugPartyCmd({ op: 'autofill', seat: o }); s.debugPartyCmd({ op: 'reorder', seat: o, from: 0, to: 1 }); return 1; }, [other]);
  await sleep(1500);
  const ha = await ev(H, () => window.__echoes.net.session.partyStats());
  const ga = await ev(fox, () => window.__echoes.net.session.partyStats());
  const cardsAfter = JSON.stringify((await phaseOf(H)).party.cards);
  const buildsAfter = JSON.stringify(await builds(H));
  check(`RAW guest CMDs on seats ${other} / 0 -> host not_owner +${(ha.byReason.not_owner || 0) - (hb.byReason.not_owner || 0)} (want 4), guest told ${ga.byReason && ga.byReason.not_owner}; cards + builds unchanged`, (ha.byReason.not_owner || 0) - (hb.byReason.not_owner || 0) === 4 && cardsBefore === cardsAfter && buildsBefore === buildsAfter, { hb, ha, ga, same: [cardsBefore === cardsAfter, buildsBefore === buildsAfter] });
  const hostUi = await ev(H, ([s]) => { const W = window.__echoes.content.world(); return { pick: W.runSystem().partyPick(s, 'take'), reorder: W.runSystem().reorderLoadout ? W.runSystem().reorderLoadout(s, 0, 1) : 'n/a' }; }, [foxSeat]);
  check(`the host's UI cannot decide / reorder a guest's seat (${JSON.stringify(hostUi)})`, hostUi.pick === false && hostUi.reorder === false, hostUi);
  // Simultaneous picks: all four press at once.
  const choice = { 0: 'leave', [seatOf(0)]: 'take', [seatOf(1)]: 'leave', [seatOf(2)]: 'take' };
  const pickFns = cl.map((c, i) => ev(c, ([s, ch]) => { const W = window.__echoes.content.world(); const t = Date.now(); const r = W.runSystem().partyPick(s, ch); return { s, ch, r, t }; }, [i === 0 ? 0 : seatOf(i - 1), i === 0 ? 'leave' : choice[seatOf(i - 1)]]));
  const presses = await Promise.all(pickFns);
  const lastPress = Math.max(...presses.map((p) => p.t));
  const spread = lastPress - Math.min(...presses.map((p) => p.t));
  const commitWall = await Promise.all(cl.map((c) => waitOn(c, () => (window.__echoes.state().run.phase !== 'reward' ? Date.now() : null), { timeout: 15000, poll: 10 })));
  out.page1Picks = { presses, spread, commitMs: commitWall.map((w) => w - lastPress) };
  const dt = await ev(H, () => window.__pe.filter((e) => e.type === 'draft_taken').slice(-8));
  out.page1Draft = dt;
  check(`simultaneous picks (4 presses within ${spread} ms): page commits on host / guests ${out.page1Picks.commitMs.join(' / ')} ms after the last press (<= ~1 s at N1)`, out.page1Picks.commitMs.every((m) => m < 1500), out.page1Picks);
  await sleep(1200);
  const B1 = await Promise.all(cl.map(builds));
  const eq1 = B1.map((b) => JSON.stringify(b) === JSON.stringify(B1[0]));
  out.buildsAfterPage1 = B1[0];
  check(`after page 1 every client's view of all four builds equals the host's (${eq1.join(',')})`, eq1.every(Boolean), B1.map((b, i) => (eq1[i] ? 'eq' : b)));

  // ---------------------------------------------------------------- page 2: stalled guest (Moss)
  await ev(H, () => window.__echoes.content.world().runSystem().choosePath(0));
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat', { timeout: 20000 });
  await sleep(800);
  check('page 2 reached', (await clearToPage(H)) === 'page');
  for (const g of G) await waitOn(g, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; }, { timeout: 15000 });
  const p2 = await phaseOf(H);
  const moss = G[2]; const mossSeat = seatOf(2);
  await ev(H, () => window.__echoes.content.world().runSystem().partyPick(0, 'leave'));
  await ev(G[0], ([s]) => window.__echoes.content.world().runSystem().partyPick(s, 'leave'), [seatOf(0)]);
  await ev(G[1], ([s]) => window.__echoes.content.world().runSystem().partyPick(s, 'leave'), [seatOf(1)]);
  note('page 2 opened; Moss stalls', { opened: p2.party.openedTick, deadline: p2.party.deadlineTick, mossCard: p2.party.cards[mossSeat] });
  // Countdown / waiting line visible to the others while Moss stalls.
  await sleep(23000);
  const waitTxt = await Promise.all(cl.map((c) => ev(c, () => { const t = document.body.innerText || ''; const m = t.match(/[^\n]*(choosing|Time|left|\d+ s)[^\n]*/g); return m ? m.slice(0, 8) : []; })));
  out.page2WaitingText = waitTxt;
  await shot(G[0], `gntfixM5b6-${TAG}-stall-fox.png`);
  await shot(moss, `gntfixM5b6-${TAG}-stall-moss.png`);
  await waitOn(H, () => window.__echoes.state().run.phase === 'path', { timeout: 20000, poll: 30 });
  const ap = await ev(H, () => window.__pe.filter((e) => e.type === 'party_autopick'));
  const mine = ap.find((e) => e.seat === mossSeat);
  const secs = mine ? (mine.tick - p2.party.openedTick) / 60 : null;
  check(`a stalled guest (Moss, seat ${mossSeat}): the page commits ${secs} s after it opened (30.0 +- 0.5) with party_autopick reason ${mine && mine.reason}`, mine && Math.abs(secs - 30) <= 0.5, { ap, p2: p2.party });
  const sug = p2.party.cards[mossSeat].suggest;
  check(`the stalled seat holds the AI suggestion (${JSON.stringify(sug)} -> ${mine && JSON.stringify(mine.choice)})`, mine && sug && JSON.stringify(mine.choice) === JSON.stringify(sug.choice !== undefined ? sug.choice : sug), { sug, mine });
  await sleep(700);
  const toasts = await Promise.all(cl.map((c) => ev(c, () => { try { return window.__echoes.app.toasts().slice(-6).map((t) => t.text || t.message || JSON.stringify(t)); } catch (e) { return ['ERR ' + e.message]; } })));
  out.page2Toasts = toasts;
  check(`the autopick toast shows on all 4 clients (${toasts.map((t) => t.filter((x) => /time|auto|chose|picked/i.test(x)).length).join('/')})`, toasts.every((t) => t.some((x) => /time's up|auto/i.test(x))), toasts);
  const gotAp = await Promise.all(G.map((g) => ev(g, () => window.__pe.filter((e) => e.type === 'party_autopick').length)));
  check(`party_autopick replayed on every guest (${gotAp.join('/')})`, gotAp.every((n) => n >= 1), gotAp);
  await sleep(1000);
  const B2 = await Promise.all(cl.map(builds));
  const eq2 = B2.map((b) => JSON.stringify(b) === JSON.stringify(B2[0]));
  check(`after page 2 all four builds equal on every client (${eq2.join(',')})`, eq2.every(Boolean), B2.map((b, i) => (eq2[i] ? 'eq' : b)));

  // ---------------------------------------------------------------- guest socket op on the path page
  const fill = await ev(fox, ([s]) => { const W = window.__echoes.content.world(); try { return W.partySystem().build(s).autoFill(); } catch (e) { return 'ERR ' + e.message; } }, [foxSeat]);
  await sleep(1500);
  const B3 = await Promise.all(cl.map(builds));
  const eq3 = B3.map((b) => JSON.stringify(b) === JSON.stringify(B3[0]));
  check(`Fox auto-fills its own bench on the door page (${JSON.stringify(fill)}): its row on the host ${JSON.stringify(B3[0][foxSeat] && B3[0][foxSeat].filled)} filled; all clients equal (${eq3.join(',')})`, eq3.every(Boolean), B3.map((b, i) => (eq3[i] ? 'eq' : b)));

  // ---------------------------------------------------------------- door deadline: nobody picks
  const pathAt = mine ? mine.tick : await ev(H, () => window.__echoes.tick);
  await waitOn(H, () => { const p = window.__echoes.state().run.phase; return p === 'combat' || p === 'fade'; }, { timeout: 40000, poll: 50 });
  const dd = await ev(H, () => window.__pe.filter((e) => e.type === 'party_autopick' && /door/.test(e.reason || '')).slice(-1)[0]);
  const pc = await ev(H, () => window.__pe.filter((e) => e.type === 'path_chosen').slice(-1)[0]);
  check(`door deadline: nobody picks -> ${dd ? ((dd.tick - pathAt) / 60).toFixed(2) : '?'} s after the page commit, side ${pc && pc.side} (30 +- 0.5, left)`, dd && pc && pc.side === 0 && Math.abs((dd.tick - pathAt) / 60 - 30) <= 0.5, { dd, pc, pathAt });

  // ---------------------------------------------------------------- shop
  if (A.shop !== '0') {
    await waitOn(H, () => window.__echoes.state().run.phase === 'combat', { timeout: 15000 });
    const sk = await ev(H, () => { try { return window.__echoes.cmd('skipToRoom', 7); } catch (e) { return 'ERR ' + e.message; } });
    note('skipToRoom 7', sk);
    await waitOn(H, () => window.__echoes.state().run.phase === 'shop', { timeout: 30000, poll: 100 });
    for (const g of G) await waitOn(g, () => { const v = window.__echoes.state().run; return v.phase === 'shop' && !!v.partyShop; }, { timeout: 15000 });
    const before = await ev(H, ([s]) => window.__echoes.cmd('partyView', s).purse, [foxSeat]);
    const buyOther = await ev(fox, ([o]) => window.__echoes.content.world().runSystem().partyBuy(o, 0), [other]);
    const buyOwn = await ev(fox, ([s]) => window.__echoes.content.world().runSystem().partyBuy(s, 0), [foxSeat]);
    await sleep(1500);
    const after = await ev(H, ([s]) => ({ purse: window.__echoes.cmd('partyView', s).purse, sold: window.__echoes.state().run.partyShop.shelves[s].stock[0].sold }), [foxSeat]);
    check(`shop: Fox's buy on Wren's shelf refused locally (${JSON.stringify(buyOther)}); its own buy lands on the host (purse ${before} -> ${after.purse}, sold ${after.sold})`, buyOther === false && after.sold && after.purse < before, { buyOther, buyOwn, before, after });
    const adv = await ev(H, () => ({ r: window.__echoes.content.world().runSystem().advanceFromShop(), tick: window.__echoes.tick }));
    await sleep(1200);
    const gcd = await Promise.all(G.map((g) => ev(g, () => { const v = window.__echoes.state().run; return v.partyShop ? v.partyShop.leaveInTicks : null; })));
    await shot(G[1], `gntfixM5b6-${TAG}-shopcountdown-wren.png`);
    await waitOn(H, () => window.__echoes.state().run.phase !== 'shop', { timeout: 30000, poll: 30 });
    const sc = await ev(H, () => window.__pe.filter((e) => e.type === 'shop_close').slice(-1)[0]);
    check(`host Advance with guests not Done -> countdown (${JSON.stringify(adv.r)}), guests see ${gcd.join('/')} ticks left, shop leaves ${sc ? ((sc.tick - adv.tick) / 60).toFixed(2) : '?'} s after (15 +- 0.2)`, adv.r && adv.r.countdown && sc && Math.abs((sc.tick - adv.tick) / 60 - 15) <= 0.25 && gcd.every((x) => Number.isFinite(x) && x > 0), { adv, gcd, sc });
    await sleep(1500);
    const B4 = await Promise.all(cl.map(builds));
    const eq4 = B4.map((b) => JSON.stringify(b) === JSON.stringify(B4[0]));
    check(`after the shop all four builds + purses equal on every client (${eq4.join(',')})`, eq4.every(Boolean), B4.map((b, i) => (eq4[i] ? 'eq' : b)));
  }

  // ---------------------------------------------------------------- level transition carries the builds
  if (A.transit !== '0') {
    const pre = await builds(H);
    await ev(H, () => { try { window.__echoes.cmd('skipToRoom', 8); } catch { /* */ } return 1; });
    await waitOn(H, () => { const v = window.__echoes.state().run; return v.phase === 'combat' && v.room === 8; }, { timeout: 40000, poll: 150 }).catch(() => null);
    for (let i = 0; i < 300; i++) {
      const lv = await ev(H, () => { const E = window.__echoes; const v = E.state().run; if (v.phase === 'combat') { E.cmd('killAllEnemies'); try { E.cmd('killBoss'); } catch { /* */ } } return (E.campaign.state().level || 0) >= 2 && v.phase === 'combat' ? E.campaign.state().level : null; });
      if (lv) break;
      await sleep(200);
    }
    await sleep(2000);
    const post = await Promise.all(cl.map(builds));
    const eq5 = post.map((b) => JSON.stringify(b) === JSON.stringify(post[0]));
    const lvl = await Promise.all(cl.map((c) => ev(c, () => window.__echoes.campaign.state().level)));
    const carried = [1, 2, 3].every((s) => JSON.stringify(pre[s] && pre[s].skills) === JSON.stringify(post[0][s] && post[0][s].skills));
    const trans = await Promise.all(cl.map((c) => ev(c, () => window.__pe.filter((e) => /level_/.test(e.type)).map((e) => e.type + '@' + e.at))));
    check(`level transition: every client in Level ${lvl.join('/')}; ally skills+sockets carried (${carried}); all clients equal (${eq5.join(',')})`, lvl.every((l) => l === 2) && carried && eq5.every(Boolean), { lvl, trans, pre, post0: post[0], diff: post.map((b, i) => (eq5[i] ? 'eq' : b)) });
  }

  const hs = await Promise.all(G.map((g) => ev(g, () => { const d = window.__echoes.net.session.debugGuest(); return { desyncs: d.desyncs, hashChecks: d.hashChecks, stats: window.__echoes.net.session.partyStats() }; })));
  out.guestHash = hs;
  check(`0 desyncs over ${hs.map((h) => h.hashChecks).join('/')} hash checks`, hs.every((h) => h.desyncs === 0 && h.hashChecks > 0), hs);
  out.hostPartyStats = await ev(H, () => window.__echoes.net.session.partyStats());
} catch (e) {
  out.crash = String(e && e.stack ? e.stack : e);
  console.log('CRASH', out.crash);
} finally {
  for (const c of cl) if (c) out.errors[c.tag] = c.errors;
  for (const c of cl) if (c) await closeClient(c);
  if (srv) srv.proc.kill();
  const pass = out.checks.filter((c) => c.ok).length;
  out.summary = `${pass}/${out.checks.length}`;
  writeJson(`gntfixM5b6-${TAG}.json`, out);
  console.log('SUMMARY', out.summary, 'pageErrors', JSON.stringify(out.errors));
}
