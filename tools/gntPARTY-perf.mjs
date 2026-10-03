#!/usr/bin/env node
// PARTY GP.15 performance. Level 3 room 6 with the four deterministic
// MAX-STRESS builds (BUILD_BRIEF §25.10, ?level=3&partygrant=max):
//   page (GPU harness, the production preview): after a warm-up, EVERY rAF
//     frame of --secs of COMBAT (the gate's "60 s of combat": a frame counts
//     when it starts and ends in room 6's combat phase; the room re-entered
//     whenever it clears, the party kept standing; the clear -> fade -> next
//     room transitions between are reported, not gated): 0 frames > 50 ms,
//     p95 <= 20 ms; then the party page, the shop and the socket screen each
//     interactive <= 350 ms after it opens (setScreen(); the page's 300 ms
//     settle window counts, then the first free main-thread task);
//   Node: the sim step p95 <= 4 ms over 60 s of that room; events per second
//     <= 2.5 x the v0.5.150 Level 3 room-6 rate (--base150 <archive>, the
//     same recipe with its default build).
//   node tools/gntPARTY-perf.mjs [--url http://127.0.0.1:4400/] [--secs 60] [--base150 <dir>]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const BASE = opt('url', 'http://127.0.0.1:4400/');
const SECS = Number(opt('secs', 60));
const B150 = opt('base150');
const results = [];
function check(name, pass, got = null) {
  results.push({ name, pass: !!pass, got });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ' ' + JSON.stringify(got).slice(0, 400)}`);
}
const pct = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null;
};

// ------------------------------------------------------------- Node --
async function nodeRun(root, { max }) {
  const u = (p) => pathToFileURL(join(root, p)).href;
  const { createGameplayRng } = await import(u('src/core/rng.js'));
  const { createRegistry } = await import(u('src/core/registry.js'));
  const { createEventBus } = await import(u('src/core/events.js'));
  const { createClock } = await import(u('src/core/clock.js'));
  const { createWorld } = await import(u('src/sim/world.js'));
  const { emptySnapshot } = await import(u('src/core/intents.js'));
  let impl = createGameplayRng(1);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (q) => impl.chance(q),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; },
    getState: () => impl.getState(),
    setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const run = world.runSystem();
  if (max && run.setHarnessGrant) run.setHarnessGrant('max');
  run.startCampaign({ level: 3, challenge: 'standard', harness: true });
  const ap = run.autopilot;
  ap.configure(true);
  let evs = 0;
  bus.on('*', (e) => {
    if (e.type !== 'sound') evs += 1;
  });
  const stepOnce = () => clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
  for (let i = 0; i < 30; i++) stepOnce();
  world.cmd('skipToRoom', 6);
  const times = [];
  let ticks = 0;
  const e0 = evs;
  for (let g = 0; ticks < 3600 && g < 20000; g++) {
    const v = run.view();
    if (v.phase !== 'combat' || v.room !== 6) {
      if (v.phase === 'reward' || v.phase === 'path' || v.phase === 'combat' || v.phase === 'shop') world.cmd('skipToRoom', 6);
    }
    for (const m of registry.all()) if (m.partyIndex !== undefined && m.hp < m.maxHp * 0.5) m.hp = m.maxHp;
    const t0 = performance.now();
    const stepped = stepOnce();
    const dt = performance.now() - t0;
    if (stepped) {
      ticks += 1;
      times.push(dt);
    }
  }
  return { stepP95: pct(times, 0.95), stepP50: pct(times, 0.5), stepMax: Math.max(...times), eventsPerSec: ((evs - e0) / ticks) * 60, ticks };
}
{
  const now = await nodeRun(here, { max: true });
  check(`Node: the sim step p95 ${now.stepP95.toFixed(2)} ms (p50 ${now.stepP50.toFixed(2)}, max ${now.stepMax.toFixed(1)}) over ${now.ticks} ticks of Level 3 room 6 with four max-stress builds (<= 4 ms)`, now.stepP95 <= 4, now);
  if (B150) {
    const old = await nodeRun(resolve(B150), { max: false });
    check(`Node: events per second ${now.eventsPerSec.toFixed(1)} vs v0.5.150 ${old.eventsPerSec.toFixed(1)} in the same room (x${(now.eventsPerSec / old.eventsPerSec).toFixed(2)}, <= 2.5)`, now.eventsPerSec <= 2.5 * old.eventsPerSec, { now: now.eventsPerSec, old: old.eventsPerSec });
  }
}

// ------------------------------------------------------------- page --
const PAGE = opt('page', '1') !== '0';
const browser = PAGE ? await launchEchoes({ gpu: true, width: 1600, height: 900 }) : null;
let errors = [];
if (PAGE) try {
  const { page, errors: errs } = await openEchoes(browser, `${BASE}?seed=1&menu=0&level=3&partygrant=max`, { width: 1600, height: 900 });
  errors = errs;
  await waitReady(page, { minTick: 60 });
  const pre = await page.evaluate(async () => {
    const E = window.__echoes;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 120 && !(E.state().run.phase === 'combat' && E.state().run.act === 3); i++) await wait(250);
    const h = E.cmd('buildView');
    const fill = { healer: h.skills.reduce((a, k) => a + k.filled, 0), allies: [1, 2, 3].map((s) => E.cmd('partyView', s).filled) };
    E.cmd('skipToRoom', 6);
    for (let i = 0; i < 120 && !(E.state().run.phase === 'combat' && E.state().run.room === 6); i++) await wait(100);
    E.cmd('autopilot', true);
    // The room re-entered whenever it clears; the party kept standing.
    window.__perfKeep = setInterval(() => {
      const v = E.state().run;
      for (const m of E.state().party) if (m.hp < m.maxHp * 0.5) E.cmd('setHp', m.id, 1);
      if (v.phase !== 'combat' || v.room !== 6) if (v.phase === 'reward' || v.phase === 'path' || v.phase === 'combat' || v.phase === 'shop') E.cmd('skipToRoom', 6);
    }, 500);
    return fill;
  });
  check(`page: the max-stress precondition — every seat 32 / 32 (Healer ${pre.healer}, allies ${JSON.stringify(pre.allies)})`, pre.healer === 32 && pre.allies.every((n) => n === 32), pre);
  const fr = await page.evaluate(
    async ({ secs, warm }) => {
      const E = window.__echoes;
      await new Promise((r) => setTimeout(r, warm));
      const d = [];
      const other = [];
      let last = performance.now();
      let lastIn = false;
      let combatMs = 0;
      let ev = 0;
      const off = E.on('*', (e) => {
        if (e.type !== 'sound') ev += 1;
      });
      const inCombat = () => {
        const v = E.state().run;
        return v.phase === 'combat' && v.room === 6;
      };
      await new Promise((res) => {
        const f = (t) => {
          const now = inCombat();
          const dt = t - last;
          if (now && lastIn) {
            d.push(dt);
            combatMs += dt;
          } else other.push({ dt: Math.round(dt), phase: E.state().run.phase, room: E.state().run.room });
          last = t;
          lastIn = now;
          if (combatMs < secs * 1000 && other.length < 20000) requestAnimationFrame(f);
          else res();
        };
        requestAnimationFrame(f);
      });
      off();
      clearInterval(window.__perfKeep);
      return { d, other, ev, fs: E.app.frameStats ? E.app.frameStats() : null };
    },
    { secs: SECS, warm: 6000 }
  );
  const over50 = fr.d.filter((x) => x > 50);
  check(`page: ${fr.d.length} combat frames over ${SECS} s of combat after warm-up — frame p95 ${pct(fr.d, 0.95).toFixed(2)} ms (<= 20), ${over50.length} frames > 50 ms (0; max ${Math.max(...fr.d).toFixed(1)} ms)`, pct(fr.d, 0.95) <= 20 && over50.length === 0, { over50: over50.slice(0, 10), fs: fr.fs });
  const trans = fr.other.filter((x) => x.dt > 50);
  console.log(`INFO page: ${fr.other.length} frames outside room 6's combat (clear -> reward -> fade -> re-entry), ${trans.length} of them > 50 ms: ${JSON.stringify(trans.slice(0, 8))}`);
  // Build pages interactive <= 350 ms after they open.
  const pages = await page.evaluate(async () => {
    const E = window.__echoes;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    // Interactive = the moment a key pressed on the page is ACCEPTED: the
    // page's settle window has run out (runUi().settleInMs; no key is pressed
    // here, so the window is exactly graceMs from setScreen()) AND the main
    // thread is free to run the keydown (the first task after the window).
    // Measured from the page's own open (setScreen(); the socket screen: the
    // cmd that opens it — it has no settle window). The trigger -> open
    // latency (the kill's clear roll, the skip's room load) is reported too.
    const measure = async (open, want) => {
      const t0 = performance.now();
      open();
      for (let i = 0; i < 600; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        const u = E.runUi();
        const shown = want === 'socket' ? E.content.socketUi() && E.content.socketUi().open : u && u.screen === want;
        if (!shown) continue;
        const now = performance.now();
        if (want === 'socket') return { visibleMs: Math.round(now - t0), interactiveMs: Math.round(now - t0) };
        const left = Math.max(0, u.settleInMs);
        const opened = now + left - u.graceMs;
        await new Promise((r) => setTimeout(r, left));
        await new Promise((r) => setTimeout(r, 0));
        const ready = performance.now();
        return { triggerToOpenMs: Math.round(opened - t0), visibleMs: Math.round(now - t0), interactiveMs: Math.round(ready - opened) };
      }
      return { visibleMs: null, interactiveMs: null };
    };
    E.cmd('autopilot', false);
    // Back in room 6's combat (the frame window may end on a transition).
    for (let i = 0; i < 100 && !(E.state().run.phase === 'combat' && E.state().run.room === 6); i++) {
      if (i % 20 === 0) E.cmd('skipToRoom', 6);
      await wait(100);
    }
    await wait(800);
    const draft = await measure(() => {
      E.cmd('killAllEnemies');
      E.cmd('killBoss');
    }, 'draft');
    const socket = await measure(() => E.cmd('openSocket'), 'socket');
    E.cmd('closeSocket');
    const shop = await measure(() => E.cmd('skipToRoom', 7), 'shop');
    return { draft, socket, shop };
  });
  const worst = Math.max(pages.draft.interactiveMs ?? 1e9, pages.socket.interactiveMs ?? 1e9, pages.shop.interactiveMs ?? 1e9);
  check(`page: the party page (${pages.draft.interactiveMs} ms), the socket screen (${pages.socket.interactiveMs} ms) and the shop (${pages.shop.interactiveMs} ms) interactive <= 350 ms after opening`, worst <= 350, pages);
} finally {
  await browser.close();
}
if (PAGE) check('no page errors', errors.length === 0, errors.slice(0, 5));
mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(join(here, 'captures/gntPARTY-perf.json'), JSON.stringify({ tool: 'gntPARTY-perf', results }, null, 1));
const failed = results.filter((r) => !r.pass);
console.log(`${results.length - failed.length}/${results.length} checks pass`);
process.exit(failed.length ? 1 : 0);
