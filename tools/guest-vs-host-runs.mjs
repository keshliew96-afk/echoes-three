#!/usr/bin/env node
// GUEST VS HOST IN RUNS (docs/CLASS_SELECT.md "Guest vs host in runs"): a
// guest plays a run with what the host has. Two pages on their own network
// server (port block 7932-7939, tools/gntM5b-lib.mjs), each in its own
// browser; the host takes the Archer, the guest the Healer:
//   - unit: the input frame carries the Healer's party commands (rally, mark,
//     heal target with its ally index) only from a seat-0 sender;
//   - at camp the guest Healer's Level Select pick starts the run on the
//     host, as an ally-seat guest's does (PR #97);
//   - in room 1 the guest Healer's R, Tab and F2 reach the host's sim
//     (intent rally / target_cycle / target_select 1), as the host Healer's do;
//   - the host's party tabs mark its own Archer "you" and the guest's Healer
//     with the guest's name (was: the Healer tab read "you" for any host);
//   - the reward: the guest takes its own Healer card on its own page; the
//     host's UI can neither pick nor move it;
//   - the socket screen: the guest's auto-fill of its own Healer build is
//     applied on the host; the host's own call on that build is refused;
//   - settings: the guest's "Socket my new nodes" change mid-session reaches
//     the host;
//   - the Peddler: the guest buys from its own purse (the run wallet); the
//     host's Advance waits on the guest, and the guest's Done then lets the
//     party leave at once (was: the countdown ran out when the host played
//     another class);
//   - the party's calls (Kesh's "guests call too"): the guest's own focus on
//     the doors and its pick decides the door; the guest leaves an event card;
//     the guest picks the relic it points at; the guest's Return to Camp on
//     the end card; at a Level IV start the guest picks the Kiln's road on the
//     clear card and its Enter sets the party out;
//   - 0 desyncs over the snapshot hash checks; no page errors.
//   node tools/guest-vs-host-runs.mjs [--port 7932] [--base http://127.0.0.1:5199/] [--shots dir] [--lang de] [--w 720 --h 450]
import { mkdirSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep } from './gntM5b-lib.mjs';
import { frameFromSnapshot, seatInputOf, playerSnapshotOf } from '../src/sim/netseats.js';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7932));
const base = arg('base', 'http://127.0.0.1:5199/');
const shots = arg('shots', 'captures');
const lang = arg('lang', null);
const W = Number(arg('w', 720));
const H = Number(arg('h', 450));
const TAG = lang ? `-${lang}` : '';
mkdirSync(shots, { recursive: true });
const fails = [];
let total = 0;
function check(what, ok, got = null) {
  total += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ` ${JSON.stringify(got).slice(0, 600)}`}`);
  if (!ok) fails.push(what);
}
async function waitOn(c, src, { timeout = 90000, poll = 200, arg: a = null } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await netEval(c, src, a)) return Date.now() - t0;
    await sleep(poll);
  }
  throw new Error(`${c.name}: timeout waiting for ${src.slice(0, 160)}`);
}
const shot = (c, name) => c.page.screenshot({ path: `${shots}/${name}${TAG}.png` });
async function tap(c, key) {
  await c.page.keyboard.down(key);
  await sleep(300);
  await c.page.keyboard.up(key);
}
// The software renderer is slow: half resolution, 30 fps, before the game boots.
async function lowRender(browser) {
  const p = await browser.newPage();
  await p.setRequestInterception(true);
  p.on('request', (r) => r.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><title>seed</title>' }));
  await p.goto(`${base}__seed.html`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => localStorage.setItem('echoes.settings', JSON.stringify({ v: 1, savedAt: new Date().toISOString(), data: { 'display.renderScale': 0.5, 'display.frameLimit': 30 } })));
  await p.close();
}

// 1. Unit: the wire.
{
  const sel = { presses: [{ kind: 'rally' }, { kind: 'target_cycle' }, { kind: 'target_select', index: 2 }, { kind: 'dodge' }] };
  const f0 = frameFromSnapshot(sel, { seq: 1, tick: 1, party: true });
  const p0 = playerSnapshotOf(seatInputOf([f0])).presses;
  const fk = frameFromSnapshot(sel, { seq: 1, tick: 1 });
  const pk = seatInputOf([fk]).presses.map((p) => p.kind);
  check(
    `a seat-0 frame carries rally, mark and heal target 3 (${JSON.stringify(p0)}); any other seat's frame drops them (${JSON.stringify(pk)})`,
    p0.some((p) => p.kind === 'rally') && p0.some((p) => p.kind === 'target_cycle') && p0.some((p) => p.kind === 'target_select' && p.index === 2) && pk.length === 1 && pk[0] === 'dodge',
    { p0, pk }
  );
  const two = seatInputOf([frameFromSnapshot({ presses: [{ kind: 'target_select', index: 1 }] }, { seq: 1, tick: 1, party: true }), frameFromSnapshot({ presses: [{ kind: 'target_select', index: 2 }] }, { seq: 2, tick: 2, party: true })]);
  check('two heal-target presses drained in one tick keep the first ally index', (two.presses.find((p) => p.kind === 'target_select') || {}).index === 1, two.presses);
}

let srv = null;
const browsers = [];
try {
  srv = await startServer({ port, admin: true });
  for (let i = 0; i < 2; i++) {
    const b = await launchEchoes({ gpu: true, background: true, width: W, height: H });
    browsers.push(b);
    await lowRender(b);
  }
  const extra = lang ? { lang } : {};
  const [host, guest] = await Promise.all([openClient(browsers[0], { base, server: srv.url, name: 'Host', seed: 7, extra, w: W, h: H }), openClient(browsers[1], { base, server: srv.url, name: 'Guest', seed: 8, extra, w: W, h: H })]);
  const code = await hostRoom(host);
  const hs = await netEval(host, 'return n.selectSeat(3);');
  for (let i = 0; ; i++) {
    try {
      await joinRoom(guest, code, 0);
      break;
    } catch (err) {
      if (i >= 4) throw err;
      await sleep(3000);
    }
  }
  await startGame(host, [guest]);
  await waitSession([host, guest], 90000);
  await sleep(6000);
  const roles = await Promise.all([host, guest].map((c) => netEval(c, 'const s = n.session.status(); return { role: s.role, seat: s.seat };')));
  check(`the session is up: the host on the Archer, the guest on the Healer (${JSON.stringify(roles)})`, hs && hs.ok && roles[0].role === 'host' && roles[0].seat === 3 && roles[1].role === 'guest' && roles[1].seat === 0, roles);

  await waitOn(host, 'return E.campaign.ready(1).ready;', { timeout: 150000 });
  // The guest Healer picks Level 1 at camp (the pick goes to the host's game).
  const ask = await netEval(guest, 'return n.session.campBegin(1, "levels");');
  let started = true;
  try {
    await waitOn(host, 'const v = E.state().run; return v.phase === "combat" && v.act === 1 && v.room === 1;', { timeout: 45000 });
  } catch {
    started = false;
  }
  check(`the guest Healer's Level Select pick starts Level 1 on the host (${ask})`, ask === true && started, { ask, started });
  if (!started) await netEval(host, 'return E.campaign.choose(1);');
  await waitOn(host, 'const v = E.state().run; return v.phase === "combat" && v.act === 1 && v.room === 1;');
  await waitOn(guest, 'const v = E.state().run; return v.phase === "combat" && v.act === 1 && v.room === 1;');
  await sleep(3000);

  // 2. The Healer's party commands from the guest's keys.
  await netEval(host, 'window.__ev = []; E.on("intent", (e) => window.__ev.push({ kind: e.kind, index: e.index ?? null })); return 1;');
  await guest.page.bringToFront().catch(() => {});
  await netEval(guest, 'window.__kd = 0; window.addEventListener("keydown", () => (window.__kd += 1), true); return 1;');
  for (let round = 0; round < 2; round++) {
    for (const k of ['KeyR', 'Tab', 'F2']) {
      await tap(guest, k);
      await sleep(1500);
    }
    const all = await waitOn(host, 'return ["rally", "target_cycle", "target_select"].every((k) => window.__ev.some((e) => e.kind === k));', { timeout: 30000 }).catch(() => null);
    if (all !== null) break;
  }
  const intents = await netEval(host, 'return window.__ev;');
  if (!intents.some((e) => e.kind === 'rally')) console.log('  host at', JSON.stringify(await netEval(host, 'return { status: n.session.status(), ev: window.__ev.length };')).slice(0, 1200));
  if (!intents.some((e) => e.kind === 'rally')) console.log('  guest at', JSON.stringify(await netEval(guest, 'const g = n.session.debugGuest(); return { vis: document.visibilityState, focus: document.hasFocus(), away: g && g.away, frozen: g && g.frozen, ownReady: !!(g && g.own && g.own.ready), seat: n.session.status().seat, keydowns: window.__kd || 0, gseat: g && g.seat };')).slice(0, 900));
  check(
    `the guest Healer's R, Tab and F2 reach the host's sim (${JSON.stringify(intents)})`,
    intents.some((e) => e.kind === 'rally') && intents.some((e) => e.kind === 'target_cycle') && intents.some((e) => e.kind === 'target_select' && e.index === 1),
    intents
  );

  // 3. The reward: the guest's own Healer card.
  await netEval(host, 'window.__calls = []; for (const k of ["path_chosen", "event_leave", "relic_gain", "road_pick"]) E.on(k, (e) => window.__calls.push({ type: k, side: e.side ?? null, relic: e.relic ?? null, road: e.road ?? null, reason: e.reason ?? null })); E.cmd("eventDoor", "wishing_well", 1); return 1;');
  await waitOn(host, 'const p = E.state().run.phase; if (p === "combat") E.cmd("killAllEnemies"); return p === "reward";', { timeout: 180000, poll: 1500 });
  await waitOn(guest, 'return E.state().run.phase === "reward" && E.runUi().screen === "draft";');
  await sleep(3000);
  const owners = await netEval(host, 'const { netOwners } = await import("/src/ui/run/partystrip.js"); return netOwners();');
  check(`the host's tabs mark its own Archer "you" and the guest's Healer with the guest's name (${JSON.stringify(owners)})`, owners[3] === 'you' && owners[0] === 'Guest', owners);
  const hostTry = await netEval(host, 'const R = E.content.world().runSystem(); return { pick: R.partyPick(0, "leave"), replace: R.setRewardReplace(0), take: R.takeReward() };');
  const card0 = await netEval(host, 'const p = E.state().run.party; return p ? p.cards[0] : null;');
  check(`the host's UI can neither decide nor move the guest's Healer card (${JSON.stringify(hostTry)})`, hostTry.pick === false && hostTry.replace === false && hostTry.take === false && card0 && !card0.decided, { hostTry, card0 });
  await shot(guest, 'guest-healer-draft');
  const gTake = await netEval(guest, 'const vis = [...document.querySelectorAll(".rn-draft .rn-take")].filter((x) => x.getClientRects().length > 0); const b = vis[0]; const dis = b ? b.classList.contains("rn-disabled") : null; if (b) b.click(); return { clicked: !!b, dis };');
  await waitOn(host, 'const v = E.state().run; return v.phase !== "reward" || (v.party && v.party.cards[0].decided);', { timeout: 30000 }).catch(() => null);
  const after = await netEval(host, 'const v = E.state().run; return { phase: v.phase, card0: v.party ? v.party.cards[0] : null };');
  check(`the guest takes its own Healer card on its own page (${JSON.stringify(gTake)} -> ${JSON.stringify(after)})`, gTake.clicked && !gTake.dis && (after.phase !== 'reward' || (after.card0 && after.card0.decided && after.card0.by === 'human')), { gTake, after });
  if (after.phase === 'reward') await netEval(host, 'E.cmd("partyCommit"); return 1;');
  await waitOn(host, 'const p = E.state().run.phase; return p !== "reward";');

  // 4. The socket screen and the setting: the guest's own Healer build.
  await waitOn(host, 'return !E.state().run.combatActive;', { timeout: 30000 }).catch(() => null);
  const gFill = await netEval(guest, 'const B = E.content.world().buildSystem(); const r = B.autoFill(); return r && typeof r === "object" ? { ok: r.ok, op: r.op, seat: r.seat } : r;');
  const hFill = await netEval(host, 'return E.content.world().buildSystem().autoFill();');
  await sleep(2500);
  check(`the guest's auto-fill of its own Healer build goes to the host (${JSON.stringify(gFill)}); the host's own call on it is refused (${JSON.stringify(hFill)})`, gFill && gFill.ok && gFill.seat === 0 && hFill === false, { gFill, hFill });
  await netEval(guest, 'E.settings.set("gameplay.autoSocketOwn", true, { source: "ui" }); return 1;');
  await waitOn(host, 'return E.party.state().autoSocketOwn[0] === true;', { timeout: 20000 }).catch(() => null);
  const pref = await netEval(host, 'return E.party.state().autoSocketOwn;');
  check(`the guest's "Socket my new nodes" change mid-session reaches the host (${JSON.stringify(pref)})`, pref[0] === true, pref);

  // 5. The party's calls from the guest: the doors, an event card, a relic.
  const clearRoom = async () => {
    await waitOn(host, 'const p = E.state().run.phase; if (p === "combat") E.cmd("killAllEnemies"); if (p === "reward") E.cmd("partyCommit"); return p !== "combat" && p !== "reward" && p !== "skip";', { timeout: 180000, poll: 1500 });
  };
  const guestDoor = async (side) => {
    await waitOn(guest, 'const v = E.state().run; return v.phase === "path" && E.runUi().screen === "path";', { timeout: 60000 });
    await sleep(1500);
    const f = await netEval(guest, 'const R = E.content.world().runSystem(); R.focusPath(arg); const v = R.view(); return { focus: v.path.focus, pick: R.choosePath(v.path.focus) };', side);
    await waitOn(host, 'return E.state().run.phase !== "path";', { timeout: 30000 }).catch(() => null);
    const chosen = await netEval(host, 'return window.__calls.filter((c) => c.type === "path_chosen").pop() || null;');
    return { f, chosen };
  };
  // The relic pick (the run's first comes after room 1; a cursed room owes one).
  let relicDone = false;
  const guestRelic = async () => {
    const rv = await netEval(host, 'const v = E.state().run; return { phase: v.phase, offer: v.relics && v.relics.offer ? v.relics.offer.choices.map((c) => c.id) : null };');
    await waitOn(guest, 'return E.state().run.phase === "relic" && E.runUi().screen === "relic";', { timeout: 60000 });
    await sleep(1500);
    await shot(guest, 'guest-calls-relic');
    const g = await netEval(guest, 'const R = E.content.world().runSystem(); R.focusRelic(1); const o = R.view().relics.offer; return { focus: o.focus, pick: R.chooseRelic(o.focus) };');
    await waitOn(host, 'return E.state().run.phase !== "relic";', { timeout: 30000 }).catch(() => null);
    const got = await netEval(host, 'return window.__calls.filter((c) => c.type === "relic_gain").pop() || null;');
    check(`the guest picks the relic it points at for the party (${JSON.stringify(g)} -> ${JSON.stringify(got)} of ${JSON.stringify(rv.offer)})`, rv.offer && rv.offer.length >= 2 && g.focus === 1 && got && got.relic === rv.offer[1], { g, got, rv });
    relicDone = true;
  };
  await waitOn(host, 'const p = E.state().run.phase; if (p === "reward") E.cmd("partyCommit"); return p === "path" || p === "relic";', { timeout: 90000, poll: 1500 }).catch(async (err) => {
    console.log('  host at', JSON.stringify(await netEval(host, 'const v = E.state().run; return { phase: v.phase, room: v.room, combat: v.combatActive, party: v.party ? { cards: v.party.cards.map((c) => c && { decided: c.decided, by: c.by }) } : null, path: v.path || null };')).slice(0, 900));
    throw err;
  });
  if ((await netEval(host, 'return E.state().run.phase;')) === 'relic') {
    await guestRelic();
    await waitOn(host, 'return E.state().run.phase === "path";', { timeout: 60000 });
  }
  let hv = await netEval(host, 'const v = E.state().run; return { focus: v.path.focus, options: v.path.options.map((o) => ({ event: !!o.event, curse: o.curse || null })) };');
  const evSide = hv.options.findIndex((o) => o.event);
  const side1 = evSide >= 0 ? evSide : 1;
  const d1 = await guestDoor(side1);
  check(`the guest points at a door with its own keys and its pick decides the door (host focus ${hv.focus}, guest ${JSON.stringify(d1.f)} -> ${JSON.stringify(d1.chosen)})`, d1.f.focus === side1 && d1.chosen && d1.chosen.side === side1, { hv, d1 });
  if (evSide >= 0) {
    await waitOn(host, 'const p = E.state().run.phase; return p === "event" || p === "encounter";', { timeout: 60000 });
    await netEval(host, 'E.cmd("relicDoor", "short_fuse", 0); if (E.state().run.phase === "event") E.cmd("eventOpen"); return 1;');
    await waitOn(guest, 'const v = E.state().run; return v.phase === "encounter" && E.runUi().screen === "encounter";', { timeout: 60000 });
    await sleep(1500);
    await shot(guest, 'guest-calls-event');
    await netEval(guest, 'const R = E.content.world().runSystem(); R.focusEncounter(1); return R.chooseEncounter("leave");');
    await waitOn(host, 'return window.__calls.some((c) => c.type === "event_leave");', { timeout: 30000 }).catch(() => null);
    const left = await netEval(host, 'return { phase: E.state().run.phase, left: window.__calls.some((c) => c.type === "event_leave") };');
    check(`the guest leaves the event card for the party (${JSON.stringify(left)})`, left.left, left);
  } else {
    check('the doors after room 1 carry the forced "?" door', false, hv);
    await clearRoom();
    await netEval(host, 'E.cmd("relicDoor", "short_fuse", 0); return 1;');
  }
  // The cursed door owes a relic pick after its room (when room 1 paid none).
  if (!relicDone) {
    await waitOn(host, 'return E.state().run.phase === "path";', { timeout: 60000 });
    hv = await netEval(host, 'const v = E.state().run; return { options: v.path.options.map((o) => ({ event: !!o.event, curse: o.curse || null })) };');
    await guestDoor(Math.max(0, hv.options.findIndex((o) => o.curse)));
    await clearRoom();
    const rv = await netEval(host, 'const v = E.state().run; return { phase: v.phase };');
    if (rv.phase === 'relic') await guestRelic();
    else check('the cursed room owes a relic pick', false, { hv, rv });
  }

  // 6. The Peddler: the guest's own purse, and its Done after the host's Advance.
  await netEval(host, 'E.cmd("skipToRoom", 7); return 1;');
  await waitOn(host, 'return E.state().run.phase === "shop";');
  await waitOn(guest, 'return E.state().run.phase === "shop" && E.runUi().screen === "shop";');
  await sleep(3000);
  await netEval(host, 'E.cmd("wallet", 500); return 1;');
  await sleep(1500);
  const w0 = await netEval(host, 'return E.state().run.shop.wallet;');
  const gBuy = await netEval(guest, 'const r = E.content.world().runSystem().buy(0); return r && typeof r === "object" ? { ok: r.ok, op: r.op } : r;');
  await waitOn(host, 'return E.state().run.shop.wallet < arg;', { timeout: 20000, arg: w0 }).catch(() => null);
  const w1 = await netEval(host, 'return E.state().run.shop.wallet;');
  check(`the guest Healer buys from its own purse, the run wallet (${w0} -> ${w1}; ${JSON.stringify(gBuy)})`, gBuy && gBuy.ok && w1 < w0, { w0, w1, gBuy });
  await shot(guest, 'guest-healer-shop');
  const adv = await netEval(host, 'return E.content.world().runSystem().advanceFromShop();');
  check(`the host's Advance waits on the guest Healer (${JSON.stringify(adv)})`, adv && adv.countdown && Array.isArray(adv.waiting) && adv.waiting.includes(0), adv);
  const tDone = Date.now();
  await netEval(guest, 'E.content.world().runSystem().advanceFromShop(); return 1;');
  let left = true;
  try {
    await waitOn(host, 'return E.state().run.phase !== "shop";', { timeout: 12000 });
  } catch {
    left = false;
  }
  check(`the guest's Done lets the party leave at once (${left ? `${Date.now() - tDone} ms` : 'still in the shop after 12 s'}), not after the countdown`, left, { left });

  // 7. The end card: the guest's Return to Camp.
  await netEval(host, 'E.cmd("endRun", "defeat"); return 1;');
  await waitOn(guest, 'const v = E.state().run; return v.phase === "defeat" && E.runUi().screen === "end";', { timeout: 60000 });
  await sleep(2000);
  await netEval(guest, 'return E.content.world().runSystem().returnToCamp();');
  let camped = true;
  try {
    await waitOn(host, 'return E.state().run.phase === "idle";', { timeout: 30000 });
  } catch {
    camped = false;
  }
  check(`the guest's Return to Camp on the end card takes the party to camp (${camped})`, camped, { camped });
  if (!camped) await netEval(host, 'E.cmd("returnToCamp"); return 1;');

  // 8. The Level IV clear card: the guest picks the road and sets out.
  await netEval(host, 'E.campaign.unlock([1, 2, 3, 4]); return 1;');
  await sleep(4000);
  await waitOn(host, 'return E.campaign.ready(4).ready;', { timeout: 300000 }).catch(() => null);
  await netEval(guest, 'return n.session.campBegin(4, "levels");');
  await waitOn(host, 'const v = E.state().run; return v.act === 4 && v.phase === "combat";', { timeout: 300000 });
  await netEval(host, 'E.cmd("skipToRoom", 8); return 1;');
  await waitOn(host, 'const v = E.state().run; return v.room === 8 && v.phase === "combat";', { timeout: 120000 });
  await waitOn(host, 'const c = E.campaign.state().card; if (c && c.fork) return true; E.cmd("killBoss"); E.cmd("killAllEnemies"); return false;', { timeout: 420000, poll: 1500 }).catch(async (err) => {
    console.log('  host at', JSON.stringify(await netEval(host, 'const v = E.state().run; return { phase: v.phase, act: v.act, room: v.room, card: E.campaign.state().card };')).slice(0, 900));
    throw err;
  });
  await waitOn(guest, 'const c = E.campaign.state().card; return !!(c && c.fork) && E.runUi().screen === "transit";', { timeout: 120000 });
  await sleep(2000);
  await shot(guest, 'guest-calls-road');
  const gRoad = await netEval(guest, 'const R = E.content.world().runSystem(); R.pickRoad("kiln"); return E.campaign.requestSkip("enter");');
  await waitOn(host, 'const c = n.session.partyCalls(); return c.pickRoad === 1 && c.levelSkip === 1;', { timeout: 30000 }).catch(() => null);
  const road = await netEval(host, 'const c = E.campaign.state().card; return { pick: c && c.fork ? c.fork.pick : null, calls: n.session.partyCalls(), log: window.__calls.filter((x) => x.type === "road_pick") };');
  check(`the guest picks the Kiln's road on the Level IV clear card (${JSON.stringify(road)})`, road.log.some((x) => x.road === 'kiln') && road.calls.pickRoad === 1, road);
  check(`the guest's Enter on the level card sets the party out (${JSON.stringify(gRoad)}; host calls ${JSON.stringify(road.calls)})`, gRoad && gRoad.ok && road.calls.levelSkip === 1, { gRoad, road });
  let onKiln = true;
  try {
    await waitOn(host, 'const v = E.state().run; return v.act === 6 && v.phase !== "transit";', { timeout: 300000 });
  } catch {
    onKiln = false;
  }
  check(`the party sets out on the Kiln's road (${onKiln})`, onKiln, { onKiln });

  const gs = await netEval(guest, 'const g = n.session.debugGuest(); return g ? { desyncs: g.desyncs, hashChecks: g.hashChecks } : null;');
  check(`0 desyncs over ${gs && gs.hashChecks} snapshot hash checks`, gs && gs.desyncs === 0 && gs.hashChecks > 0, gs);
  check('no page errors on either page', host.errors.length === 0 && guest.errors.length === 0, { host: host.errors.slice(0, 5), guest: guest.errors.slice(0, 5) });
} catch (err) {
  check('probe completed', false, String(err && err.stack ? err.stack : err).slice(0, 800));
} finally {
  for (const b of browsers) await b.close().catch(() => {});
  if (srv) await srv.stop();
}
console.log(`${total - fails.length}/${total} checks pass`);
process.exit(fails.length ? 1 : 0);
