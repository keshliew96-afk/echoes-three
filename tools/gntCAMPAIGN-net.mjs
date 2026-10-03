#!/usr/bin/env node
// CAMPAIGN multiplayer probe (docs/gauntlet/PLAN.md §12.9, gate GC.11).
// Own network server (CAMPAIGN port block 7900-7909), a host + a guest page
// (tools/gntM5b-lib.mjs, read-only), then:
//   - the host starts a campaign at Level 1 through the player path
//     (campaign.choose(1)); the guest follows into Level 1;
//   - the guest's run mutators are refused (choose / startCampaign /
//     campaignAdvance / abandonRun change nothing on the host);
//   - the host clears Level 1: every rendered guest frame is sampled with the
//     replica's applied host tick — from the host's clear tick to its advance
//     tick the guest shows the card (phase transit, the 'transit' page, the
//     guest note), from the advance tick on it shows Level 2 (same phase /
//     level / layout as the host); the guest reported `level_ready` and the
//     host waited for it; 0 desyncs (snapshot hash checks);
//   - the guest's pause menu has Leave Session and no Quit to Lobby; the
//     host's Quit to Lobby (pause menu -> confirm) returns BOTH to camp, the
//     session stays up.
//   node tools/gntCAMPAIGN-net.mjs [--port 7900] [--base http://127.0.0.1:5199/] [--cond lat60,jit10,loss2]
import { writeFileSync, mkdirSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep, admin } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7900));
const base = arg('base', 'http://127.0.0.1:5199/');
const cond = arg('cond', null);
const TAG = arg('tag', cond ? 'cond' : 'clean');
const out = { port, base, cond, checks: [] };
const fails = [];
function check(what, ok, got = null) {
  out.checks.push({ what, ok: !!ok, got });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ` ${JSON.stringify(got).slice(0, 500)}`}`);
  if (!ok) fails.push(what);
}
async function waitOn(c, src, { timeout = 30000, poll = 100, arg: a = null } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await netEval(c, src, a)) return Date.now() - t0;
    await sleep(poll);
  }
  throw new Error(`${c.name}: timeout waiting for ${src.slice(0, 120)}`);
}
const view = (c) => netEval(c, 'const v = E.state().run; const c = E.campaign.state(); return { phase: v.phase, act: v.act, room: v.room, active: v.active, index: c.index, level: c.level, mode: E.cmd("campState").mode, page: E.runUi().screen, layout: (E.cmd("arenaLayout") || {}).layoutId ?? null };');

let srv = null;
let browser = null;
try {
  srv = await startServer({ port, admin: true });
  out.serverPid = srv.pid;
  browser = await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 });
  const host = await openClient(browser, { base, server: srv.url, name: 'Host', seed: 7 });
  const guest = await openClient(browser, { base, server: srv.url, name: 'Guest', seed: 8 });
  const code = await hostRoom(host);
  await joinRoom(guest, code);
  if (cond) {
    const gp = await netEval(guest, 'return n.peerId;');
    out.conditioner = await admin(srv, '/admin/conditioner', { target: gp, up: cond, down: cond });
  }
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  await sleep(1500);
  await waitOn(host, 'return E.campaign.ready(1).ready;', { timeout: 90000 });
  // Guest cannot start anything.
  const gStart = await netEval(guest, 'return { choose: E.campaign.choose(1), open: E.cmd("campLevels") };');
  await sleep(600);
  const hostIdle = await view(host);
  check(`a guest can neither choose a level (${JSON.stringify(gStart.choose)}) nor open the select (${gStart.open}); the host stays in camp`, gStart.choose && gStart.choose.ok === false && gStart.open === false && !hostIdle.active, { gStart, hostIdle });
  // Host starts Level 1 through the player path.
  const ch = await netEval(host, 'return E.campaign.choose(1);');
  await waitOn(host, 'const v = E.state().run; return v.phase === "combat" && v.act === 1 && v.room === 1;', { timeout: 30000 });
  await waitOn(guest, 'const v = E.state().run; return v.phase === "combat" && v.act === 1 && v.room === 1;', { timeout: 30000 });
  check('the host starts Level 1 (campaign.choose) and the guest follows into it', ch && ch.ok, ch);
  await sleep(1500);
  // Guest run mutators during combat: refused.
  const before = await view(host);
  await netEval(guest, 'try { E.cmd("startCampaign", { level: 3 }); } catch (e) {} try { E.cmd("abandonRun", "guest"); } catch (e) {} return 1;');
  await sleep(800);
  const afterG = await view(host);
  check('guest startCampaign / abandonRun change nothing on the host', afterG.active && afterG.act === 1 && afterG.index === before.index && afterG.phase === 'combat', { before, afterG });
  // Samplers: host events + guest per-frame view with the applied host tick.
  await netEval(host, 'window.__cn = []; for (const t of ["level_clear", "level_transit", "level_start", "run_end", "return_to_camp"]) E.on(t, (e) => window.__cn.push({ type: t, tick: e.tick, level: e.level ?? e.to ?? null, reason: e.reason ?? null })); return 1;');
  await netEval(guest, `window.__cg = []; window.__cgOn = true; const f = () => { if (!window.__cgOn) return; const g = n.session.debugGuest(); const v = E.state().run; window.__cg.push({ t: Math.round(performance.now()), applied: g && g.replica ? g.replica.appliedTick : null, phase: v.phase, act: v.act, room: v.room, page: E.runUi().screen, mode: E.cmd("campState").mode, layout: (E.cmd("arenaLayout") || {}).layoutId ?? null }); requestAnimationFrame(f); }; requestAnimationFrame(f); return 1;`);
  // Host clears Level 1.
  await netEval(host, 'E.cmd("skipToRoom", 8); return 1;');
  await sleep(500);
  for (let i = 0; i < 100; i++) {
    const ph = await netEval(host, 'const v = E.state().run; if (v.phase === "combat" && v.room === 8) { E.cmd("killBoss"); E.cmd("killAllEnemies"); } return v.phase;');
    if (ph === 'transit') break;
    await sleep(80);
  }
  // Guest tries to advance the card itself.
  await sleep(700);
  const gAdv = await netEval(guest, 'let r = null; try { r = E.cmd("campaignAdvance", "guest"); } catch (e) { r = String(e); } return { r, skip: E.campaign.requestSkip ? E.campaign.requestSkip("guest") : null };');
  await sleep(300);
  const hostCard = await view(host);
  const guestCardUi = await netEval(guest, 'const p = [...document.querySelectorAll(".rn-page")].find((x) => x.style.display !== "none"); return { page: E.runUi().screen, text: p ? p.textContent.replace(/\\s+/g, " ").trim().slice(0, 200) : null, hint: p && p.querySelector(".rn-hint") ? p.querySelector(".rn-hint").textContent : null };');
  check(`the guest cannot advance the card (${JSON.stringify(gAdv.skip)}); the host is still on it`, hostCard.phase === 'transit' && gAdv.skip && gAdv.skip.ok === false, { gAdv, hostCard });
  check(`the guest shows the card with the follow line "${guestCardUi.hint}"`, guestCardUi.page === 'transit' && /The Healer leads on/.test(guestCardUi.hint || ''), guestCardUi);
  await host.page.screenshot({ path: `captures/gntCAMPAIGN-net-host-card-${TAG}.png` });
  await guest.page.screenshot({ path: `captures/gntCAMPAIGN-net-guest-card-${TAG}.png` });
  await waitOn(host, 'const v = E.state().run; return v.phase === "combat" && v.act === 2;', { timeout: 20000 });
  await waitOn(guest, 'const v = E.state().run; return v.phase === "combat" && v.act === 2 && E.runUi().screen === "none";', { timeout: 20000 });
  await sleep(1200);
  const hEv = await netEval(host, 'return window.__cn;');
  const gRows = await netEval(guest, 'window.__cgOn = false; return window.__cg;');
  const hostT = await netEval(host, 'const t = E.campaign.transitions().slice(-1)[0]; return { advanceReason: t.advanceReason, waitedMs: t.waitedMs, readyAt: t.readyAt, cardAt: t.cardAt, killToControlMs: t.killToControlMs };');
  const clearTick = (hEv.find((e) => e.type === 'level_clear') || {}).tick;
  const advTick = (hEv.find((e) => e.type === 'level_start') || {}).tick;
  const inCard = gRows.filter((r) => r.applied !== null && r.applied >= clearTick && r.applied < advTick);
  const after = gRows.filter((r) => r.applied !== null && r.applied >= advTick + 1);
  const cardOk = inCard.length > 0 && inCard.every((r) => r.phase === 'transit' && r.act === 1);
  const afterOk = after.length > 0 && after.every((r) => r.act === 2 && r.mode === 'run');
  const lateFrames = after.filter((r) => r.phase === 'transit').length;
  const hostNow = await view(host);
  const guestNow = await view(guest);
  check(`guest in sync across the transition: ${inCard.length} frames on the card while the applied host tick was in [clear ${clearTick}, advance ${advTick}), ${after.length} frames of Level 2 after it (${lateFrames} still on the card), never a camp frame`, cardOk && afterOk && lateFrames === 0 && gRows.every((r) => r.mode === 'run'), { clearTick, advTick, inCard: inCard.slice(0, 3), after: after.slice(0, 3), modes: [...new Set(gRows.map((r) => r.mode))] });
  check(`guest level / phase / layout equal to the host's in Level 2 (host ${JSON.stringify(hostNow)}, guest ${JSON.stringify(guestNow)})`, hostNow.act === guestNow.act && hostNow.phase === guestNow.phase && hostNow.room === guestNow.room && hostNow.layout === guestNow.layout && hostNow.index === 2 && guestNow.index === 2, { hostNow, guestNow });
  const ready = await netEval(host, 'return { all: n.levelReadyAll ? n.levelReadyAll(2) : null, seat1: n.session.debugHost && n.session.debugHost() && n.session.debugHost().levelReady ? n.session.debugHost().levelReady(1) : null };');
  check(`the guest reported level_ready for Level 2 (${JSON.stringify(ready.seat1)}) and the host advanced on "${hostT.advanceReason}" after ${hostT.waitedMs} ms`, ready.seat1 && ready.seat1.level === 2 && ready.seat1.ready === true && hostT.advanceReason === 'auto', { ready, hostT });
  const gs = await netEval(guest, 'const g = n.session.debugGuest(); return { desyncs: g.desyncs, hashChecks: g.hashChecks, decodeErrors: g.decodeErrors };');
  check(`0 desyncs over ${gs.hashChecks} snapshot hash checks`, gs.desyncs === 0 && gs.hashChecks > 0, gs);
  // Pause menus: the guest has Leave Session, not Quit to Lobby.
  await guest.page.keyboard.press('Escape');
  await sleep(500);
  const gItems = await netEval(guest, 'return [...document.querySelectorAll("[id^=pz-]")].map((b) => b.id);');
  await guest.page.keyboard.press('Escape');
  check(`guest pause menu: Leave Session, no Quit to Lobby (${JSON.stringify(gItems)})`, gItems.includes('pz-leave') && !gItems.includes('pz-lobby'), gItems);
  // Host Quit to Lobby -> both in camp, the session stays up.
  await host.page.keyboard.press('Escape');
  await waitOn(host, 'return E.app.overlay === "pause";', { timeout: 5000 });
  await sleep(300);
  const hItems = await netEval(host, 'return [...document.querySelectorAll("[id^=pz-]")].map((b) => b.id);');
  await netEval(host, 'document.getElementById("pz-lobby").click(); return 1;');
  await waitOn(host, 'return !!document.getElementById("ap-confirm-ok");', { timeout: 5000 });
  const body = await netEval(host, 'const d = document.querySelector(".ap-confirm, [role=alertdialog]"); return d ? d.textContent.replace(/\\s+/g, " ").trim() : null;');
  await sleep(200);
  await netEval(host, 'document.getElementById("ap-confirm-ok").click(); return 1;');
  await waitOn(host, 'return E.state().run.phase === "idle" && E.cmd("campState").mode === "camp";', { timeout: 15000 });
  await waitOn(guest, 'return E.state().run.phase === "idle" && E.cmd("campState").mode === "camp";', { timeout: 15000 });
  await sleep(1000);
  const sess = await Promise.all([host, guest].map((c) => netEval(c, 'const s = n.session.status(); return { role: s.role, synced: s.synced, seats: (s.seats || []).length };')));
  check(`host pause menu has Quit to Lobby (${JSON.stringify(hItems)}); confirm "${(body || '').slice(0, 80)}" -> host AND guest back in camp, the session still up (${JSON.stringify(sess)})`, hItems.includes('pz-lobby') && /whole party|everyone returns to camp/.test(body || '') && sess.every((s) => s.role !== 'none' && s.synced), { hItems, body, sess });
  await guest.page.screenshot({ path: `captures/gntCAMPAIGN-net-guest-camp-${TAG}.png` });
  out.errors = { host: host.errors.slice(0, 5), guest: guest.errors.slice(0, 5) };
  check('no page errors on either page', host.errors.length === 0 && guest.errors.length === 0, out.errors);
} catch (err) {
  check('probe completed', false, String(err && err.stack ? err.stack : err).slice(0, 600));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
mkdirSync('captures', { recursive: true });
writeFileSync(`captures/gntCAMPAIGN-net-${TAG}.json`, JSON.stringify(out, null, 1));
console.log(`${out.checks.filter((c) => c.ok).length}/${out.checks.length} checks pass`);
process.exit(fails.length ? 1 : 0);
