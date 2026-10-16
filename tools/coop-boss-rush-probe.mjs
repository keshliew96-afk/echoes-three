#!/usr/bin/env node
// CO-OP BOSS RUSH (docs/BOSS_RUSH.md "Co-op"): a host and a guest page on
// their own network server (port block 7930-7939, tools/gntM5b-lib.mjs):
//   - the host's Level Select shows the Boss Rush card open in the lobby
//     (the "sets out together" line); a guest can neither open the select
//     nor choose the rush;
//   - the host chooses the rush; BOTH pages show the setting-out card with
//     the seeded line (the same ten bosses), the guest with its follow line;
//   - fight 1: both in the Wood's boss room, the guest's HUD plate reads
//     BOSS RUSH · FIGHT 1/10; the boss falls: the bounty reaches the guest's
//     own purse, the war chest reaches the guest's seat, the guest takes
//     its OWN draft card, and the card after reads FIGHT 1 OF 10 WON on both;
//   - fight 2 opens at the Peddler on both pages (the shop strip FIGHT 2), and
//     the host's Done waits on the guest's own Done;
//   - the party falls in fight 2: both pages show THE BOSS RUSH ENDS with 1 of
//     10 felled, and each page records the rush on its own save (its
//     lastRecord; the two pages share one browser profile here) with no level
//     clears, under the co-op best (CO-OP BEST on the end card). (The won path is the single-player code: boss-rush-probe.)
//   - 0 desyncs over the snapshot hash checks; no page errors.
//   node tools/coop-boss-rush-probe.mjs [--port 7930] [--base http://127.0.0.1:5199/] [--shots dir] [--lang de]
import { writeFileSync, mkdirSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7930));
const base = arg('base', 'http://127.0.0.1:5199/');
const shots = arg('shots', 'captures');
const lang = arg('lang', null);
const TAG = lang ? `-${lang}` : '';
mkdirSync(shots, { recursive: true });
const out = { port, base, lang, checks: [] };
const fails = [];
function check(what, ok, got = null) {
  out.checks.push({ what, ok: !!ok, got });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ` ${JSON.stringify(got).slice(0, 600)}`}`);
  if (!ok) fails.push(what);
}
async function waitOn(c, src, { timeout = 60000, poll = 150, arg: a = null } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await netEval(c, src, a)) return Date.now() - t0;
    await sleep(poll);
  }
  throw new Error(`${c.name}: timeout waiting for ${src.slice(0, 160)}`);
}
const view = (c) => netEval(c, 'const v = E.state().run; return { phase: v.phase, act: v.act, room: v.room, active: v.active, rush: v.rush || null, page: E.runUi().screen };');
const card = (c) => netEval(c, 'const q = (s) => { const e = document.querySelector(".rn-transit " + s); return e ? e.textContent.replace(/\\s+/g, " ").trim() : null; }; return { kicker: q(".rn-kicker"), head: q(".rn-headline"), line: q(".rn-flavour"), next: q(".rn-nextname"), hint: q(".rn-hint") };');
const plate = (c) => netEval(c, 'const q = (s) => { const e = document.querySelector(s); return e ? e.textContent : null; }; return { name: q(".hud-loc-name"), sub: q(".hud-loc-sub") };');
const shot = (c, name) => c.page.screenshot({ path: `${shots}/${name}${TAG}.png` });

let srv = null;
let browser = null;
try {
  srv = await startServer({ port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 });
  const extra = { rush: '1', ...(lang ? { lang } : {}) };
  const first = await openClient(browser, { base, server: srv.url, name: 'Host', seed: 7, extra });
  const second = await openClient(browser, { base, server: srv.url, name: 'Guest', seed: 8, extra });
  let host = first;
  let guest = second;
  const code = await hostRoom(host);
  // A software-GL page can stall its socket on the first join: try again.
  for (let i = 0; ; i++) {
    try {
      await joinRoom(guest, code);
      break;
    } catch (err) {
      if (i >= 4) throw err;
      await sleep(3000);
    }
  }
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  // A software-GL page that stalls for seconds can hand the host over
  // (host migration); read the roles once they have settled.
  await sleep(8000);
  await waitSession([first, second], 60000);
  if ((await netEval(second, 'return n.session.status().role;')) === 'host') {
    host = second;
    guest = first;
    out.migratedBeforeStart = true;
  }
  await waitOn(host, 'return E.campaign.ready(1).ready;', { timeout: 120000 });
  const rec0 = await netEval(host, 'const r = E.save.profile().records; return { runs: r.rushRuns || 0, most: r.rushMostFelled || 0 };');
  const roles = await Promise.all([host, guest].map((c) => netEval(c, 'return n.session.status().role;')));
  check(`the session is up (host ${roles[0]}, guest ${roles[1]})`, roles[0] === 'host' && roles[1] === 'guest', roles);

  // 1. The host's Level Select: the rush card open in the lobby.
  const gTry = await netEval(guest, 'return { choose: E.campaign.choose("rush"), open: E.cmd("campLevels") };');
  check(`a guest can neither choose the rush (${JSON.stringify(gTry.choose)}) nor open the Level Select`, gTry.choose && gTry.choose.ok === false && gTry.open === false, gTry);
  const opened = await netEval(host, 'return E.cmd("campLevels");');
  await waitOn(host, 'return !!document.querySelector(".cg-levels .cg-card[data-level=rush]");', { timeout: 30000 });
  await sleep(2500);
  const sel = await netEval(host, 'const c = document.querySelector(".cg-levels .cg-card[data-level=rush]"); const co = c.querySelector(".cg-coop"); return { locked: c.getAttribute("aria-disabled") === "true", coop: co ? co.textContent : null, daily: document.querySelector(".cg-levels .cg-card[data-level=daily]").getAttribute("aria-disabled") === "true", misses: E.i18n ? (E.i18n().misses || []).filter((m) => /party sets out/.test(String(m))) : [] };');
  check(`the host's Boss Rush card is open in the lobby with "${sel.coop}"; the Daily stays single player`, opened === true && !sel.locked && !!sel.coop && sel.daily && sel.misses.length === 0, sel);
  await shot(host, 'coop-rush-1-select');
  if (lang) throw 'done';
  await netEval(host, 'document.querySelector(".cg-levels .cg-card[data-level=rush]").click(); return 1;');

  // 2. The setting-out card on both pages, the same line.
  await waitOn(host, 'return E.state().run.phase === "transit" && E.runUi().screen === "transit";');
  await waitOn(guest, 'return E.state().run.phase === "transit" && E.runUi().screen === "transit";');
  await sleep(2500);
  const hc = await card(host);
  const gc = await card(guest);
  const lines = await Promise.all([host, guest].map((c) => netEval(c, 'const v = E.state().run; return { rush: v.rush || null, line: document.querySelector(".rn-transit .rn-flavour")?.textContent || "" };')));
  check(`both pages show the setting-out card with the same ten-boss line (${hc.line})`, hc.kicker === gc.kicker && hc.line === gc.line && (hc.line || '').split(' · ').length === 10 && lines[1].rush && lines[1].rush.fights === 10, { hc, gc, lines });
  check(`the guest's card carries its follow line ("${gc.hint}")`, !!gc.hint && gc.hint !== hc.hint, { hc: hc.hint, gc: gc.hint });
  await shot(host, 'coop-rush-2-setout-host');
  await shot(guest, 'coop-rush-2-setout-guest');
  await netEval(host, 'E.cmd("campaignAdvance", "probe"); return 1;');

  // 3. Fight 1 on both pages.
  await waitOn(host, 'const v = E.state().run; return v.phase === "combat" && v.room === 8 && v.rush && v.rush.fight === 1;');
  await waitOn(guest, 'const v = E.state().run; return v.phase === "combat" && v.room === 8 && v.rush && v.rush.fight === 1 && E.runUi().screen === "none";');
  let gp = null;
  try {
    await waitOn(guest, 'return /1\\/10/.test(document.querySelector(".hud-loc-sub")?.textContent || "");', { timeout: 30000 });
  } finally {
    gp = await plate(guest);
  }
  check(`the guest's HUD plate reads ${JSON.stringify(gp.sub)}`, /FIGHT 1\/10/.test(gp.sub || ''), gp);
  await sleep(2000);
  await shot(guest, 'coop-rush-3-fight-guest');
  const seat = await netEval(guest, 'return n.session.status().seat;');
  const purse0 = await netEval(host, 'const v = E.state().run; return Array.isArray(v.purses) ? v.purses[arg] : null;', seat);
  await netEval(host, 'window.__rs = []; for (const t of ["rush_felled", "rush_supply", "party_grant"]) E.on(t, (e) => window.__rs.push({ t, seats: e.seats ? e.seats.map((s) => s.seat) : null, fight: e.fight ?? null })); E.cmd("killBoss"); return 1;');
  await waitOn(host, 'return E.state().run.phase === "reward";');
  await waitOn(guest, 'return E.state().run.phase === "reward" && E.runUi().screen === "draft";');
  await sleep(2500);
  const purse1 = await netEval(host, 'const v = E.state().run; return Array.isArray(v.purses) ? v.purses[arg] : null;', seat);
  const evs = await netEval(host, 'return window.__rs;');
  const grant = evs.find((e) => e.t === 'party_grant');
  check(`fight 1 falls: the bounty reached the guest's own purse (${purse0} -> ${purse1}) and the war chest reached its seat (${JSON.stringify(evs)})`, Number.isFinite(purse1) && purse1 - purse0 >= 40 && evs.some((e) => e.t === 'rush_felled' && e.fight === 1) && grant && grant.seats.includes(seat), { purse0, purse1, evs });
  // The guest takes its OWN card on its own draft page.
  const slots = (c) => netEval(c, 'try { const s = E.party.state().seats.find((x) => x && x.seat === arg); return s ? [...s.slots] : null; } catch (e) { return String(e); }', seat);
  const before = await slots(host);
  out.guestSlotsBefore = before;
  const offer = await netEval(guest, 'const vis = [...document.querySelectorAll(".rn-draft .rn-take")].filter((x) => x.getClientRects().length > 0); const b = vis[0]; if (b) b.click(); return { clicked: !!b, label: b ? b.textContent.trim() : null };');
  await shot(guest, 'coop-rush-4-draft-guest');
  await sleep(2500);
  check(`the guest takes its own draft card on its own page (${JSON.stringify(offer)})`, offer.clicked, { offer, before });
  await netEval(host, 'E.cmd("draftTake"); return 1;');
  await waitOn(host, 'const p = E.state().run.phase; return p === "relic" || p === "transit";');
  if ((await view(host)).phase === 'relic') await netEval(host, 'E.cmd("relicChoose", 0); return 1;');
  await waitOn(host, 'return E.state().run.phase === "transit";');
  await waitOn(guest, 'return E.state().run.phase === "transit" && E.runUi().screen === "transit";');
  await sleep(2500);
  const hc2 = await card(host);
  const gc2 = await card(guest);
  check(`the card after reads "${gc2.kicker}" / "${gc2.next}" on the guest, as on the host`, /FIGHT 1 OF 10 WON/.test(gc2.kicker || '') && gc2.kicker === hc2.kicker && gc2.next === hc2.next && /^Fight 2 of 10/.test(gc2.next || ''), { hc2, gc2 });
  await shot(guest, 'coop-rush-5-card-guest');
  const after = await slots(host);
  const count = (a) => (Array.isArray(a) ? a.filter(Boolean).length : -1);
  check(`the guest's seat carries the card it took (${JSON.stringify(before)} -> ${JSON.stringify(after)})`, Array.isArray(after) && count(after) === count(before) + 1, { before, after, offer });

  // 4. Fight 2 opens at the Peddler on both pages.
  await netEval(host, 'E.cmd("campaignAdvance", "probe"); return 1;');
  await waitOn(host, 'return E.state().run.phase === "shop";');
  await waitOn(guest, 'return E.state().run.phase === "shop" && E.runUi().screen === "shop";');
  await sleep(3000);
  const strip = await netEval(guest, 'const v = E.state().run; return { act: v.act, room: v.room, sub: document.querySelector(".hud-loc-sub")?.textContent, shop: (document.querySelector(".rn-shop")?.textContent || "").replace(/\\s+/g, " ").slice(0, 120) };');
  const adv = await netEval(host, 'return E.cmd("shopAdvance");');
  check(`fight 2 opens at the Peddler in the Mill on the guest (${strip.sub}; ${strip.shop}); the host's Done waits on the guest (${JSON.stringify(adv)})`, strip.act === 2 && strip.room === 7 && /FIGHT\s*2/.test(strip.shop || '') && adv && adv.countdown && Array.isArray(adv.waiting) && adv.waiting.includes(seat), { strip, adv });
  await shot(guest, 'coop-rush-6-shop-guest');
  // The guest's own Done lets the party walk on.
  const done = await netEval(guest, 'const b = [...document.querySelectorAll(".rn-btn, button")].find((x) => x.getClientRects().length > 0 && x.children.length === 0 && /finished shopping/.test(x.textContent)); if (b) b.click(); return b ? b.className : false;');
  out.guestDone = done;
  await waitOn(host, 'const v = E.state().run; return v.phase === "combat" && v.room === 8;', { timeout: 90000 });
  await waitOn(guest, 'const v = E.state().run; return v.phase === "combat" && v.room === 8 && E.runUi().screen === "none";', { timeout: 90000 });
  await sleep(3000);
  await shot(guest, 'coop-rush-7-fight2-guest');

  // 5. The party falls in fight 2: both end cards, both records.
  await netEval(host, 'E.cmd("endRun", "defeat"); return 1;');
  await waitOn(host, 'return E.state().run.phase === "defeat";');
  await waitOn(guest, 'return E.state().run.phase === "defeat" && E.runUi().screen === "end";', { timeout: 60000 });
  await sleep(3000);
  const endOf = (c) => netEval(c, 'const q = (s) => document.querySelector(".rn-end " + s)?.textContent.replace(/\\s+/g, " ").trim(); return { head: q(".rn-headline"), flavour: q(".rn-flavour"), summary: q(".rn-summary") };');
  const he = await endOf(host);
  const ge = await endOf(guest);
  check(`both pages end the rush: "${ge.head}" / "${ge.flavour}"`, /THE BOSS RUSH ENDS/.test(ge.head || '') && ge.head === he.head && /BOSSES FELLED\s*1 \/ 10/.test(ge.summary || '') && /CO-OP BEST/.test(ge.summary || '') && /CO-OP BEST/.test(he.summary || ''), { he, ge });
  await shot(guest, 'coop-rush-8-end-guest');
  await sleep(1500);
  const recOf = (c) => netEval(c, 'const l = E.save.lastRecord ? E.save.lastRecord() : null; const r = E.save.profile().records; return { rush: l && l.rush ? l.rush : null, written: l ? l.written : null, clears: r.levelClears, runs: r.rushRuns || 0 };');
  const recs = [await recOf(host), await recOf(guest)];
  check(`each page recorded the rush on its own save as a co-op rush (host ${JSON.stringify(recs[0].rush)}, guest ${JSON.stringify(recs[1].rush)}), no level clears`, recs.every((r) => r.rush && r.rush.felled === 1 && r.rush.won === false && r.rush.coop === true && r.written === true && !Object.values(r.clears || {}).some((n) => n > 0)) && recs[1].runs > rec0.runs, { rec0, recs });
  const gs = await netEval(guest, 'const g = n.session.debugGuest(); return g ? { desyncs: g.desyncs, hashChecks: g.hashChecks } : null;');
  check(`0 desyncs over ${gs && gs.hashChecks} snapshot hash checks`, gs && gs.desyncs === 0 && gs.hashChecks > 0, gs);
  const errs = { host: host.errors.slice(0, 5), guest: guest.errors.slice(0, 5) };
  check('no page errors on either page', host.errors.length === 0 && guest.errors.length === 0, errs);
} catch (err) {
  if (err !== 'done') check('probe completed', false, String(err && err.stack ? err.stack : err).slice(0, 800));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
writeFileSync(`captures/coop-boss-rush-probe${TAG}.json`, JSON.stringify(out, null, 1));
console.log(`${out.checks.filter((c) => c.ok).length}/${out.checks.length} checks pass`);
process.exit(fails.length ? 1 : 0);
