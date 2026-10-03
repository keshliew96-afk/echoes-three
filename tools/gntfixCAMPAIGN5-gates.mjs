#!/usr/bin/env node
// gntfixCAMPAIGN5: a copy of tools/gntCAMPAIGN-gates.mjs with only the output names changed (captures/gntfixCAMPAIGN5-gates-*).
// CAMPAIGN gate probe (docs/gauntlet/PLAN.md §12, gates GC.1-GC.5, GC.8,
// GC.10) on the GPU harness (tools/gnt-arch-browser.mjs), driven through the
// PLAYER paths (keyboard, mouse, a mocked gamepad, the pause menu) wherever a
// gate names one. Legs:
//   flow    title session -> New Game -> every level unlocked (probe
//           override) -> walk to the portal -> E: Level 1 starts, no picker
//           (GC.1); L1 -> card -> L2 -> card (Enter skip) -> L3, every frame
//           sampled (camp mode never shown, GC.2), a presentation + carry
//           diff on each card (GC.5), the final clear's CAMPAIGN COMPLETE
//           card and the automatic return (GC.4); event counts (GC.2).
//   quit    Quit to Lobby through the pause menu (Esc -> Quit to Lobby ->
//           confirm) from combat, from a run page (the reward draft) and from
//           the card (GC.4): camp, no end card, records count it.
//   edge    during the card: Esc (pause holds the card), Enter x12 mash, F5
//           quicksave, a frozen (hidden) page for 3 s — never a second
//           transition, never a skipped level, never a hang (GC.3).
//   locks   fresh profile: Level 1 open, 2-3 locked on every path — keyboard
//           (L, arrows, Enter), mouse (click a locked card), mocked gamepad
//           (d-pad + A), campaign.choose, cmd('campChoose'), a save file;
//           clearing Level 1 unlocks 2 and it survives a reload; a Level-2
//           start (setting-out card) plays 2 -> 3 (GC.8); the Records screen
//           shows the campaign rows (GC.10, screenshot).
//
//   node tools/gntCAMPAIGN-gates.mjs <flow|quit|edge|locks|all> [--url http://127.0.0.1:5199/] [--tag t]
// Output: captures/gntCAMPAIGN-gates-<leg>-<tag>.json + screenshots
// captures/gntCAMPAIGN-gates-*.png. Reaching a Stag fast uses
// cmd('skipToRoom', 8) + cmd('killBoss') + cmd('killAllEnemies').
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const LEG = argv[0] || 'all';
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const TAG = opt('tag', 't');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const E = (page, fn, ...args) => page.evaluate(fn, ...args);
const shot = (page, name) => page.screenshot({ path: join(here, 'captures', `gntfixCAMPAIGN5-gates-${name}.png`) });

async function waitFor(page, cond, { timeout = 60000, poll = 100, args = [] } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate(cond, ...args)) return Date.now() - t0;
    await sleep(poll);
  }
  throw new Error(`timeout waiting for ${cond.toString().slice(0, 140)}`);
}

// Every leg runs in its OWN browser context (a fresh profile: localStorage,
// the records and unlocks start empty — legs never see each other's clears).
async function boot(browser, query) {
  const ctx = await browser.createBrowserContext();
  const o = await openEchoes(ctx, `${URL0}${query}`, { width: 1600, height: 900 });
  o.ctx = ctx;
  await o.page.waitForFunction(() => window.__echoes && window.__echoes.campaign && window.__echoes.app, { timeout: 180000 });
  o.cdp = await o.page.target().createCDPSession();
  return o;
}

// Plain URL: splash -> title -> New Game -> playing.
async function titleToPlaying(page) {
  for (let i = 0; i < 120; i++) {
    const st = await E(page, () => __echoes.app.state);
    if (st === 'title') break;
    if (st === 'playing') return 'playing';
    if (st === 'loading') await page.keyboard.press('Space');
    await sleep(500);
  }
  await sleep(700); // the title's open guard
  const r = await E(page, () => {
    const b = [...document.querySelectorAll('button')].find((x) => /^\s*New Game/.test(x.textContent) && x.offsetParent !== null);
    if (!b) return 'no-button';
    b.click();
    return 'clicked';
  });
  await waitFor(page, () => __echoes.app.state === 'playing', { timeout: 30000 });
  return r;
}

// Event recorder in the page.
const installRecorder = (page) =>
  E(page, () => {
    window.__cg = { ev: [] };
    for (const t of ['run_start', 'level_clear', 'level_transit', 'level_start', 'run_end', 'return_to_camp', 'state_restored']) {
      __echoes.on(t, (e) => window.__cg.ev.push({ type: t, tick: e.tick, level: e.level ?? e.act ?? e.to ?? null, result: e.result ?? null, kind: e.kind ?? null, reason: e.reason ?? null, at: Math.round(performance.now()) }));
    }
    return true;
  });
const events = (page) => E(page, () => window.__cg.ev.slice());

// Per-frame sampler: camp/run mode, phase, level, frame time.
const startSampler = (page) =>
  E(page, () => {
    const s = { rows: [], on: true };
    window.__cgS = s;
    let last = performance.now();
    const f = (t) => {
      if (!s.on) return;
      const v = __echoes.state().run;
      s.rows.push({ t: Math.round(t), dt: Math.round(t - last), mode: __echoes.cmd('campState').mode, phase: v.phase, act: v.act, room: v.room, page: __echoes.runUi().screen });
      last = t;
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
    return true;
  });
const stopSampler = (page) =>
  E(page, () => {
    window.__cgS.on = false;
    return window.__cgS.rows;
  });

const controllable = (level) => {
  const v = __echoes.state().run;
  return v.active && v.phase === 'combat' && v.act === level && v.room === 1 && !__echoes.runUi().open && __echoes.campaign.state().transitionState === 'none';
};

async function clearLevel(page) {
  await E(page, () => __echoes.cmd('skipToRoom', 8));
  await sleep(400);
  for (let i = 0; i < 100; i++) {
    const ph = await E(page, () => {
      const v = __echoes.state().run;
      if (v.phase === 'combat' && v.room === 8) {
        __echoes.cmd('killBoss');
        __echoes.cmd('killAllEnemies');
      }
      return v.phase;
    });
    if (ph === 'transit' || ph === 'victory' || ph === 'defeat') return ph;
    await sleep(80);
  }
  return 'stuck';
}

// Everything the card must show as reset / restored / carried (GC.5).
const cardState = (page) =>
  E(page, () => {
    const s = __echoes.state();
    const m = __echoes.campaign.memory();
    const c = __echoes.campaign.state();
    const t = __echoes.campaign.transitions().slice(-1)[0];
    const hudMarkers = (() => {
      try {
        const x = __echoes.hud.markers();
        return Array.isArray(x) ? x.length : x && typeof x === 'object' ? Object.keys(x).length : x;
      } catch {
        return null;
      }
    })();
    return {
      phase: s.run.phase,
      entities: m.entities,
      party: s.party.map((p) => ({ hp: Math.round(p.hp), max: p.maxHp, downed: !!p.downed })),
      statuses: (s.party_ai && s.party_ai.statuses) || null,
      cooldowns: (s.skills || []).filter(Boolean).map((k) => k.remainingTicks ?? k.remaining ?? 0),
      build: { skills: s.build.skills.map((k) => k.id), socketed: s.build.skills.reduce((n, k) => n + k.filled, 0), bench: s.build.bench.length },
      wallet: s.wallet,
      zones: s.zones.length,
      azones: s.azones.length,
      skillBolts: s.skillBolts.length,
      room: s.room,
      vfx: { numerals: s.vfx.numerals, decals: s.vfx.decals, scorch: s.vfx.scorch },
      bossfx: { boss: s.bossfx.boss, ring: s.bossfx.ring, bursts: s.bossfx.bursts },
      techfx: s.techfx,
      skillfx: { zoneRigs: s.skillfx.zoneRigs, beams: s.skillfx.beams, rings: s.skillfx.rings },
      allyfx: { zones: s.allyfx.zones, reviveRings: s.allyfx.reviveRings, mark: s.allyfx.mark },
      hudMarkers,
      teardown: t ? t.teardown : null,
      card: c.card ? { kind: c.card.kind, from: c.card.from, to: c.card.to, summary: c.card.summary, leftovers: c.card.leftovers } : null,
      leftovers: c.card ? c.card.leftovers : null,
    };
  });
const buildNow = (page) =>
  E(page, () => {
    const s = __echoes.state();
    return { skills: s.build.skills.map((k) => `${k.id}:${k.sockets.map((x) => (x ? x.node : '-')).join(',')}`), bench: s.build.bench.map((x) => x.node).sort(), wallet: s.wallet };
  });

const results = {};
const fails = [];
function check(leg, what, ok, got = null) {
  (results[leg] ||= { checks: [] }).checks.push({ what, ok: !!ok, got });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${what}${ok ? '' : ` ${JSON.stringify(got).slice(0, 400)}`}`);
  if (!ok) fails.push(`${leg}: ${what}`);
}

// --------------------------------------------------------------------- flow --
async function legFlow(browser) {
  const L = 'flow';
  const o = await boot(browser, ''); // plain URL: a TITLE session (any harness param would skip the title)
  const { page } = o;
  const how = await titleToPlaying(page);
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await installRecorder(page);
  const unlocked = await E(page, () => __echoes.campaign.unlock([1, 2, 3]));
  // Walk to the portal and press E.
  await page.keyboard.down('w');
  await waitFor(page, () => __echoes.cmd('campState').inPortal, { timeout: 15000, poll: 50 });
  await page.keyboard.up('w');
  const tops = [];
  await page.keyboard.press('e');
  for (let i = 0; i < 15; i++) {
    tops.push(await E(page, () => __echoes.app.overlay));
    await sleep(100);
  }
  await waitFor(page, controllable, { args: [1], timeout: 30000 });
  const c1 = await E(page, () => __echoes.campaign.state());
  check(L, `GC.1 title session (${how}), all levels unlocked ${JSON.stringify(unlocked)}: E at the portal starts a campaign at Level 1, no picker`, c1.active && c1.mode === 'campaign' && c1.level === 1 && c1.startLevel === 1 && c1.harness === false && !tops.includes('levels') && !tops.includes('expedition'), { c1: { mode: c1.mode, level: c1.level, start: c1.startLevel, harness: c1.harness }, tops: [...new Set(tops)] });
  // Level 1 -> 2 (auto) and 2 -> 3 (Enter skip at 0.6 s).
  const trans = [];
  for (const level of [1, 2]) {
    await sleep(1500);
    const pre = await buildNow(page);
    await startSampler(page);
    const ph = await clearLevel(page);
    const card = await (async () => {
      await sleep(200);
      return cardState(page);
    })();
    if (level === 1) await shot(page, `flow-card-${TAG}`);
    if (level === 2) {
      await sleep(400);
      await page.keyboard.press('Enter');
    }
    await waitFor(page, controllable, { args: [level + 1], timeout: 30000, poll: 30 });
    await sleep(300);
    const rows = await stopSampler(page);
    const post = await buildNow(page);
    const t = await E(page, () => __echoes.campaign.transitions().slice(-1)[0]);
    const clearIdx = rows.findIndex((r) => r.phase === 'transit');
    const span = rows.slice(Math.max(0, clearIdx - 1));
    trans.push({ level, ph, card, frames: span.length, modes: [...new Set(span.map((r) => r.mode))], maxDt: Math.max(...span.map((r) => r.dt)), killToControlMs: t.killToControlMs, advanceReason: t.advanceReason });
    check(L, `GC.2 L${level} -> L${level + 1}: the card, then the next level, no camp frame (${span.length} frames sampled, modes ${JSON.stringify([...new Set(span.map((r) => r.mode))])})`, ph === 'transit' && span.length > 10 && span.every((r) => r.mode === 'run'), { ph, modes: [...new Set(span.map((r) => r.mode))] });
    const restored = card.party.every((p) => p.hp === p.max && !p.downed);
    const reset =
      card.entities === 4 &&
      card.zones === 0 &&
      card.azones === 0 &&
      card.skillBolts === 0 &&
      (!card.room || card.room.aliveEnemies === 0) &&
      card.vfx.numerals === 0 &&
      card.vfx.decals === 0 &&
      card.vfx.scorch === 0 &&
      !card.bossfx.boss &&
      !card.bossfx.ring &&
      card.techfx.arcs === 0 &&
      card.techfx.rings === 0 &&
      card.skillfx.zoneRigs === 0 &&
      card.allyfx.zones === 0 &&
      card.allyfx.reviveRings === 0 &&
      Array.isArray(card.leftovers) &&
      card.leftovers.length === 0;
    const cooldownsReady = card.cooldowns.every((x) => x === 0);
    check(L, `GC.5 L${level} card: RESET (4 party entities, no zones / bolts / enemies / numerals / decals / scorches / boss rig / telegraph rings, leftovers [])`, reset, card);
    check(L, `GC.5 L${level} card: RESTORE (every member at max HP, standing, cooldowns ready)`, restored && cooldownsReady, { party: card.party, cooldowns: card.cooldowns });
    check(L, `GC.5 L${level} -> L${level + 1}: CARRY (skills + sockets + bench identical, wallet carried + the Stag stipend)`, JSON.stringify(pre.skills) === JSON.stringify(post.skills) && JSON.stringify(pre.bench) === JSON.stringify(post.bench) && post.wallet >= pre.wallet, { pre, post });
  }
  results[L].transitions = trans;
  // Level 3 -> CAMPAIGN COMPLETE -> camp by itself.
  await sleep(1200);
  const ph3 = await clearLevel(page);
  await sleep(600);
  const endCard = await E(page, () => {
    const el = document.querySelector('.rn-headline');
    const pageEl = [...document.querySelectorAll('.rn-page')].find((p) => p.style.display !== 'none');
    return { screen: __echoes.runUi().screen, text: pageEl ? pageEl.textContent.replace(/\s+/g, ' ').trim().slice(0, 400) : null, head: el ? el.textContent : null };
  });
  await shot(page, `flow-complete-${TAG}`);
  await waitFor(page, () => __echoes.state().run.phase === 'idle' && __echoes.cmd('campState').mode === 'camp', { timeout: 20000 });
  const ev = await events(page);
  const endEv = ev.find((e) => e.type === 'run_end');
  const rtc = ev.filter((e) => e.type === 'return_to_camp');
  check(L, `GC.4 final clear -> "CAMPAIGN COMPLETE" card (${JSON.stringify(endCard.text).slice(0, 120)}) -> camp by itself within 600 ticks (${rtc.length ? rtc[0].tick - endEv.tick : '?'} ticks)`, ph3 === 'victory' && /CAMPAIGN COMPLETE/.test(endCard.text || '') && /Returning to camp in/.test(endCard.text || '') && endEv && endEv.result === 'victory' && rtc.length === 1 && rtc[0].tick - endEv.tick <= 600, { ph3, endCard, endEv, rtc });
  const n = (t) => ev.filter((e) => e.type === t).length;
  check(L, `GC.2 exactly once: run_start ${n('run_start')}, level_clear ${n('level_clear')}, level_transit ${n('level_transit')}, level_start ${n('level_start')}, run_end ${n('run_end')}, return_to_camp ${n('return_to_camp')}`, n('run_start') === 1 && n('level_clear') === 3 && n('level_transit') === 2 && n('level_start') === 2 && n('run_end') === 1 && n('return_to_camp') === 1, ev);
  const idx = ev.filter((e) => e.type === 'level_start').map((e) => e.level);
  check(L, `GC.2 the level advances 1 -> 2 -> 3 once each (${JSON.stringify(idx)})`, JSON.stringify(idx) === '[2,3]');
  results[L].events = ev;
  results[L].errors = o.errors.slice();
  check(L, 'no page errors', o.errors.length === 0, o.errors.slice(0, 3));
  await o.ctx.close();
}

// --------------------------------------------------------------------- quit --
async function pauseQuit(page) {
  await page.keyboard.press('Escape');
  await waitFor(page, () => __echoes.app.overlay === 'pause', { timeout: 5000 });
  await sleep(250);
  const has = await E(page, () => !!document.getElementById('pz-lobby'));
  if (!has) return { ok: false, why: 'no Quit to Lobby item', items: await E(page, () => [...document.querySelectorAll('[id^=pz-]')].map((b) => b.id)) };
  await E(page, () => document.getElementById('pz-lobby').click());
  await waitFor(page, () => !!document.getElementById('ap-confirm-ok'), { timeout: 5000 });
  const body = await E(page, () => document.querySelector('.ap-confirm, [role=alertdialog]') ? document.querySelector('.ap-confirm, [role=alertdialog]').textContent.replace(/\s+/g, ' ').trim() : null);
  await sleep(200);
  await E(page, () => document.getElementById('ap-confirm-ok').click());
  await sleep(600);
  return { ok: true, body };
}
async function legQuit(browser) {
  const L = 'quit';
  const o = await boot(browser, '?seed=12&menu=0');
  const { page } = o;
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await installRecorder(page);
  const where = [];
  // (a) combat
  await E(page, () => __echoes.campaign.choose(1));
  await waitFor(page, controllable, { args: [1], timeout: 30000 });
  await sleep(1500);
  const a = await pauseQuit(page);
  where.push({ from: 'combat', ...a, after: await E(page, () => ({ phase: __echoes.state().run.phase, mode: __echoes.cmd('campState').mode, page: __echoes.runUi().screen, overlay: __echoes.app.overlay })) });
  // (b) a run page: room 1's reward draft
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await E(page, () => __echoes.campaign.choose(1));
  await waitFor(page, controllable, { args: [1], timeout: 30000 });
  await sleep(800);
  await E(page, () => __echoes.cmd('killAllEnemies'));
  await waitFor(page, () => __echoes.runUi().screen === 'draft' || __echoes.state().run.phase === 'reward', { timeout: 15000 });
  await sleep(600);
  const b = await pauseQuit(page);
  where.push({ from: 'reward page', ...b, after: await E(page, () => ({ phase: __echoes.state().run.phase, mode: __echoes.cmd('campState').mode, page: __echoes.runUi().screen, overlay: __echoes.app.overlay })) });
  // (c) the level-clear card
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await E(page, () => __echoes.campaign.choose(1));
  await waitFor(page, controllable, { args: [1], timeout: 30000 });
  await sleep(500);
  await clearLevel(page);
  await sleep(700);
  const c = await pauseQuit(page);
  where.push({ from: 'card', ...c, after: await E(page, () => ({ phase: __echoes.state().run.phase, mode: __echoes.cmd('campState').mode, page: __echoes.runUi().screen, overlay: __echoes.app.overlay })) });
  await sleep(3000); // nothing may advance a card that no longer exists
  const ev = await events(page);
  const rec = await E(page, () => __echoes.save.profile().records);
  for (const w of where) {
    check(L, `GC.4 Quit to Lobby from ${w.from} (pause menu -> confirm): camp, no end card`, w.ok && w.after.phase === 'idle' && w.after.mode === 'camp' && (w.after.page === 'none' || w.after.page === null) && w.after.overlay !== 'pause', w);
  }
  const ends = ev.filter((e) => e.type === 'run_end');
  check(L, `records: 3 abandoned runs (${rec.abandoned}), no defeat counted (${rec.defeats}); run_end results ${JSON.stringify(ends.map((e) => e.result))}; no level_start after the quit from the card`, rec.abandoned === 3 && rec.defeats === 0 && ends.length === 3 && ends.every((e) => e.result === 'abandoned') && ev.filter((e) => e.type === 'level_start').length === 0, { rec, ev });
  check(L, 'the confirm dialog names what is kept', where.every((w) => /Unlocks and records are kept/.test(w.body || '')), where.map((w) => w.body));
  check(L, 'no page errors', o.errors.length === 0, o.errors.slice(0, 3));
  results[L].where = where;
  await o.ctx.close();
}

// --------------------------------------------------------------------- edge --
async function legEdge(browser) {
  const L = 'edge';
  const o = await boot(browser, '?seed=13&menu=0');
  const { page, cdp } = o;
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await installRecorder(page);
  await E(page, () => __echoes.campaign.choose(1));
  await waitFor(page, controllable, { args: [1], timeout: 30000 });
  await sleep(800);
  await clearLevel(page);
  // Esc during the card: the pause freezes it.
  await sleep(300);
  const c0 = await E(page, () => __echoes.campaign.state().card.elapsedTicks);
  await page.keyboard.press('Escape');
  await sleep(2000);
  const paused = await E(page, () => ({ overlay: __echoes.app.overlay, elapsed: __echoes.campaign.state().card ? __echoes.campaign.state().card.elapsedTicks : null, phase: __echoes.state().run.phase }));
  await page.keyboard.press('Escape');
  await sleep(300);
  check(L, `GC.3 Esc on the card: the pause menu holds it (elapsed ${c0} -> ${paused.elapsed} over 2 s paused)`, paused.overlay === 'pause' && paused.phase === 'transit' && paused.elapsed !== null && paused.elapsed - c0 <= 2, paused);
  // F5 quicksave on the card.
  await page.keyboard.press('F5');
  await sleep(800);
  const qs = await E(page, () => ({ toasts: __echoes.app.toasts().slice(-2), phase: __echoes.state().run.phase, list: __echoes.save.list().map((m) => ({ id: m.id, phase: m.meta.phase })) }));
  check(L, 'GC.3 F5 on the card: quicksaved, still on the card', qs.phase === 'transit' && qs.list.some((m) => m.id === 'quick' && m.phase === 'transit'), qs);
  // Enter x12 mash after the settle.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Enter');
    await sleep(15);
  }
  await waitFor(page, controllable, { args: [2], timeout: 20000, poll: 30 });
  await sleep(1500);
  let ev = await events(page);
  const ls = ev.filter((e) => e.type === 'level_start');
  check(L, `GC.3 Enter mashed x12 on the card: exactly one advance (${ls.length} level_start), Level 2 room 1 (not skipped past)`, ls.length === 1 && ls[0].level === 2 && (await E(page, () => __echoes.state().run.room)) === 1, { ls });
  // A frozen / hidden page during the next card.
  await clearLevel(page);
  await sleep(200);
  const before = await E(page, () => ({ tick: __echoes.tick, card: __echoes.campaign.state().card && __echoes.campaign.state().card.elapsedTicks }));
  // A hidden tab: the browser stops requestAnimationFrame and fires
  // visibilitychange (document.hidden). Emulated in the page — CDP's frozen
  // lifecycle state also kills the dev server's HMR socket, which reloads
  // the page when it comes back.
  await E(page, () => {
    const raf = window.requestAnimationFrame.bind(window);
    const held = [];
    window.requestAnimationFrame = (cb) => {
      held.push(cb);
      return 0;
    };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    window.__cgUnhide = () => {
      window.requestAnimationFrame = raf;
      delete document.hidden;
      delete document.visibilityState;
      document.dispatchEvent(new Event('visibilitychange'));
      for (const cb of held.splice(0)) raf(cb);
      return true;
    };
    return true;
  });
  await sleep(3000);
  const hidden = await E(page, () => ({ tick: __echoes.tick, card: __echoes.campaign.state().card && __echoes.campaign.state().card.elapsedTicks, phase: __echoes.state().run.phase }));
  await E(page, () => window.__cgUnhide());
  const woke = Date.now();
  await waitFor(page, controllable, { args: [3], timeout: 30000, poll: 30 });
  const wokeMs = Date.now() - woke;
  await sleep(1000);
  ev = await events(page);
  const ls2 = ev.filter((e) => e.type === 'level_start');
  check(L, `GC.3 tab hidden 3 s on the card (rAF stopped: tick ${before.tick} -> ${hidden.tick}), then visible: the card completes once (${ls2.length} level_start total), Level 3 in ${wokeMs} ms, no hang`, ls2.length === 2 && ls2[1].level === 3 && hidden.phase === 'transit', { before, hidden, ls2, wokeMs });
  // Load the F5 quicksave (the Level 1 card) -> the card again, then Level 2 once.
  const ld = await E(page, async () => {
    const r = await __echoes.save.load('quick');
    return { ok: r.ok, phase: __echoes.state().run.phase, card: __echoes.campaign.state().card && __echoes.campaign.state().card.to };
  });
  await waitFor(page, controllable, { args: [2], timeout: 20000, poll: 30 });
  await sleep(500);
  const tr = await E(page, () => __echoes.campaign.transitions().slice(-1)[0]);
  check(L, 'GC.3 F9-style load of the card save -> the card resumes and advances once into Level 2', ld.ok && ld.phase === 'transit' && ld.card === 2 && tr.restored === true && tr.advanceTick !== null, { ld, tr: { restored: tr.restored, reason: tr.advanceReason } });
  check(L, 'no page errors', o.errors.length === 0, o.errors.slice(0, 3));
  results[L].events = await events(page);
  await o.ctx.close();
}

// -------------------------------------------------------------------- locks --
const cards = (page) =>
  E(page, () => ({
    open: __echoes.app.overlay,
    cards: [...document.querySelectorAll('.cg-levels .cg-card')].map((c) => ({ level: Number(c.dataset.level), locked: c.getAttribute('aria-disabled') === 'true', focused: c.classList.contains('ap-focus'), lock: (c.querySelector('.cg-lock-t') || {}).textContent })),
    note: (document.querySelector('.cg-levels .cg-note') || {}).textContent || '',
  }));
const focused = async (page) => (await cards(page)).cards.filter((c) => c.focused).map((c) => c.level);
async function legLocks(browser) {
  const L = 'locks';
  const o = await boot(browser, '?seed=14&menu=0');
  const { page } = o;
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await installRecorder(page);
  const fresh = await E(page, () => ({ unlocked: __echoes.campaign.unlocked(), profile: __echoes.save.profile().unlocks }));
  check(L, `GC.8 fresh profile: Level 1 open, 2-3 locked (${JSON.stringify(fresh.unlocked)})`, JSON.stringify(fresh.unlocked) === '[1]');
  // keyboard: L opens the select; arrows never land on a locked card.
  await page.keyboard.press('l');
  await waitFor(page, () => __echoes.app.overlay === 'levels', { timeout: 5000 });
  await sleep(400);
  const k0 = await cards(page);
  await shot(page, `locks-select-${TAG}`);
  const seen = [await focused(page)];
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'Tab', 'ArrowLeft', 'ArrowRight']) {
    await page.keyboard.press(k);
    await sleep(120);
    seen.push(await focused(page));
  }
  check(L, `GC.8 Level Select: cards ${JSON.stringify(k0.cards.map((c) => [c.level, c.locked ? 'locked' : 'open']))}; keyboard focus only ever on Level 1 (${JSON.stringify(seen)})`, k0.cards.length === 3 && k0.cards[1].locked && k0.cards[2].locked && !k0.cards[0].locked && seen.every((f) => f.length === 0 || (f.length === 1 && f[0] === 1)) && /Clear The Hollow Wood to unlock/.test(k0.cards[1].lock), k0);
  // mouse: click locked Level 2.
  const rect = await E(page, () => {
    const r = document.querySelector('.cg-levels .cg-card[data-level="2"]').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(rect.x, rect.y);
  await sleep(500);
  const m = await cards(page);
  const m2 = await E(page, () => ({ phase: __echoes.state().run.phase, active: __echoes.state().run.active }));
  check(L, `GC.8 mouse click on locked Level 2: stays open, no run, note "${m.note}"`, m.open === 'levels' && !m2.active && /locked/.test(m.note), { m, m2 });
  // mocked gamepad: d-pad right x2 + A.
  await E(page, () => {
    const pad = { id: 'probe pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), timestamp: performance.now() };
    window.__cgPad = pad;
    navigator.getGamepads = () => [pad];
    window.__cgPress = (i, on) => {
      pad.buttons[i].pressed = on;
      pad.buttons[i].value = on ? 1 : 0;
      pad.timestamp = performance.now();
    };
    return true;
  });
  const padSeen = [];
  for (const b of [15, 15, 15]) {
    await E(page, (i) => window.__cgPress(i, true), b);
    await sleep(120);
    await E(page, (i) => window.__cgPress(i, false), b);
    await sleep(150);
    padSeen.push(await focused(page));
  }
  const padSrc = await E(page, () => __echoes.app.lastSource());
  // pad A on the (only open) focused card would start Level 1 — the locked
  // cards are what matter here; A is exercised on the second select below.
  check(L, `GC.8 mocked gamepad d-pad right x3 (input source "${padSrc}"): focus stays on Level 1 (${JSON.stringify(padSeen)})`, padSrc === 'gamepad' && padSeen.every((f) => f.length === 1 && f[0] === 1), { padSeen, padSrc });
  // Esc out (nothing started), then the API paths.
  await page.keyboard.press('Escape');
  await sleep(400);
  const api = await E(page, () => ({ choose2: __echoes.campaign.choose(2), choose3: __echoes.cmd('campChoose', 3), overlay: __echoes.app.overlay, active: __echoes.state().run.active }));
  check(L, 'GC.8 campaign.choose(2) and cmd("campChoose", 3) refuse: locked', api.choose2.ok === false && api.choose2.reason === 'locked' && api.choose3.ok === false && api.choose3.reason === 'locked' && !api.active, api);
  // A save file in a locked level: a Level-2 campaign started through the player path under a probe unlock, saved, then the unlock withdrawn.
  const sv = await E(page, async () => {
    __echoes.campaign.unlock([1, 2]);
    const ch = __echoes.campaign.choose(2);
    return { ch };
  });
  await waitFor(page, controllable, { args: [2], timeout: 30000 });
  const sv2 = await E(page, async () => {
    const s = await __echoes.save.save('manual-3', { name: 'L2 probe' });
    __echoes.cmd('abandonRun', 'probe');
    __echoes.campaign.unlock(null);
    await new Promise((r) => setTimeout(r, 300));
    const l = await __echoes.save.load('manual-3');
    return { saved: s.ok, load: { ok: l.ok, error: l.error, reason: l.reason }, phase: __echoes.state().run.phase, unlocked: __echoes.campaign.unlocked() };
  });
  check(L, `GC.8 a save file in locked Level 2 is refused on load ("${sv2.load.reason}")`, sv.ch.ok && sv2.saved && sv2.load.ok === false && sv2.load.error === 'locked' && sv2.phase === 'idle', { sv, sv2 });
  // Clear Level 1 through the player path; Level 2 unlocks and survives a reload.
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await E(page, () => __echoes.campaign.choose(1));
  await waitFor(page, controllable, { args: [1], timeout: 30000 });
  await sleep(500);
  await clearLevel(page);
  const after = await E(page, () => __echoes.campaign.unlocked());
  await E(page, () => __echoes.cmd('abandonRun', 'probe'));
  await sleep(500);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__echoes && window.__echoes.campaign && __echoes.tick > 30, { timeout: 180000 });
  const reloaded = await E(page, () => ({ unlocked: __echoes.campaign.unlocked(), profile: __echoes.save.profile().unlocks.acts, clears: __echoes.save.profile().records.levelClears }));
  check(L, `GC.8 clearing Level 1 unlocks Level 2 at once (${JSON.stringify(after)}) and it survives a reload (${JSON.stringify(reloaded.unlocked)})`, JSON.stringify(after) === '[1,2]' && JSON.stringify(reloaded.unlocked) === '[1,2]' && reloaded.clears[1] >= 1, reloaded);
  // The select now: 2 open, 3 locked; choose Level 2 with the keyboard.
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  await installRecorder(page);
  await page.keyboard.press('l');
  await waitFor(page, () => __echoes.app.overlay === 'levels', { timeout: 5000 });
  await sleep(400);
  const k1 = await cards(page);
  const f1 = await focused(page);
  await shot(page, `locks-select2-${TAG}`);
  // Positive control for the pad: left -> Level 1, right x2 -> Level 2 (never 3).
  await E(page, () => {
    const pad = { id: 'probe pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), timestamp: performance.now() };
    navigator.getGamepads = () => [pad];
    window.__cgPress = (i, on) => {
      pad.buttons[i].pressed = on;
      pad.buttons[i].value = on ? 1 : 0;
      pad.timestamp = performance.now();
    };
    return true;
  });
  const pad2 = [];
  for (const b of [14, 15, 15]) {
    await E(page, (i) => window.__cgPress(i, true), b);
    await sleep(120);
    await E(page, (i) => window.__cgPress(i, false), b);
    await sleep(150);
    pad2.push(await focused(page));
  }
  check(L, `GC.8 pad positive control on the second select: left -> 1, right x2 -> 2 then held on 2, never locked 3 (${JSON.stringify(pad2)})`, JSON.stringify(pad2) === '[[1],[2],[2]]', pad2);
  await page.keyboard.press('Enter');
  await waitFor(page, () => __echoes.state().run.phase === 'transit', { timeout: 10000, poll: 30 });
  const depart = await E(page, () => ({ card: __echoes.campaign.state().card, text: [...document.querySelectorAll('.rn-page')].filter((p) => p.style.display !== 'none').map((p) => p.textContent.replace(/\s+/g, ' ').trim()).join(' | ').slice(0, 300) }));
  await shot(page, `locks-depart-${TAG}`);
  check(L, `GC.8 the select after the clear: 2 open (preselected ${JSON.stringify(f1)}), 3 locked; Enter -> the setting-out card for Level 2 with the starter grant`, !k1.cards[1].locked && k1.cards[2].locked && f1[0] === 2 && depart.card && depart.card.kind === 'depart' && depart.card.to === 2 && depart.card.summary && depart.card.summary.grant, { k1, f1, depart });
  await waitFor(page, controllable, { args: [2], timeout: 30000 });
  await sleep(800);
  await clearLevel(page);
  await waitFor(page, controllable, { args: [3], timeout: 30000 });
  await sleep(800);
  const ph3 = await clearLevel(page);
  const c3 = await E(page, () => __echoes.state().run.summary && __echoes.state().run.summary.campaign);
  check(L, `GC.8 a Level-2 start plays 2 -> 3 -> CAMPAIGN COMPLETE (${ph3}, levels ${c3 && JSON.stringify(c3.levels.map((l) => l.level))})`, ph3 === 'victory' && c3 && c3.startLevel === 2 && c3.complete && c3.levels.map((l) => l.level).join() === '2,3', c3);
  await page.keyboard.press('Enter');
  await waitFor(page, () => __echoes.state().run.phase === 'idle', { timeout: 15000 });
  // GC.10 Records screen.
  await sleep(500);
  await E(page, () => __echoes.app.open('records'));
  await sleep(800);
  const recText = await E(page, () => {
    const el = document.querySelector('.sv-records, [aria-label*="Records" i]') || document.body;
    return [...document.querySelectorAll('dt')].map((d) => `${d.textContent}=${d.nextElementSibling ? d.nextElementSibling.textContent : ''}`);
  });
  await shot(page, `records-${TAG}`);
  const rtx = recText.join(' | ');
  check(L, `GC.10 Records shows campaigns completed / abandoned / furthest level / fastest campaign / level clears (${rtx.slice(0, 260)})`, /Campaigns completed=1 of \d/.test(rtx) && /Abandoned=\d/.test(rtx) && /Furthest level=Level III/.test(rtx) && /Level I cleared=×1/.test(rtx) && /Level II cleared=×1/.test(rtx) && /Level III cleared=×1/.test(rtx) && /Levels open=I · II · III/.test(rtx), recText);
  check(L, 'no page errors', o.errors.length === 0, o.errors.slice(0, 3));
  await o.ctx.close();
}

// ----------------------------------------------------------------- continue --
// GC.9: the autosave taken at the level transition, a page reload (a title
// session), Continue -> the same card with the carried build, then Level 2.
// Also the lobby's other two entries to the Level Select: the map table (E in
// its ring) and a real mouse click on the portal prompt's "Levels" chip.
async function legContinue(browser) {
  const L = 'continue';
  const o = await boot(browser, '?seed=15&menu=0');
  const { page } = o;
  await waitFor(page, () => __echoes.campaign.ready(1).ready, { timeout: 90000 });
  // map table
  await E(page, () => __echoes.cmd('teleport', -3.3, -4.85));
  await sleep(700);
  const tp = await E(page, () => __echoes.cmd('campState').levelTable);
  await page.keyboard.press('e');
  await sleep(600);
  const viaTable = await E(page, () => __echoes.app.overlay);
  await page.keyboard.press('Escape');
  await sleep(500);
  check(L, `the map table: prompt shown in its ring (${tp.promptVisible}), E opens the Level Select (${viaTable})`, tp.inRange && tp.promptVisible && viaTable === 'levels', { tp, viaTable });
  // portal prompt chip, real mouse
  await E(page, () => __echoes.cmd('teleport', 0, -5.2));
  await sleep(700);
  const chip = await E(page, () => {
    const r = document.querySelector('#camp-prompt .cp-levels').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, visible: r.width > 0 };
  });
  await page.mouse.click(chip.x, chip.y);
  await sleep(600);
  const viaChip = await E(page, () => __echoes.app.overlay);
  await page.keyboard.press('Escape');
  await sleep(500);
  check(L, `the portal prompt's "Levels" chip (mouse click at ${Math.round(chip.x)},${Math.round(chip.y)}) opens the Level Select (${viaChip})`, chip.visible && viaChip === 'levels', { chip, viaChip });
  // a campaign to the Level 1 card; the level_transit autosave
  await E(page, () => __echoes.campaign.choose(1));
  await waitFor(page, controllable, { args: [1], timeout: 30000 });
  await sleep(1500);
  // room 1 cleared by killing every wave as it lands (waves keep spawning)
  for (let i = 0; i < 150; i++) {
    const ph = await E(page, () => {
      if (__echoes.state().run.phase === 'combat') __echoes.cmd('killAllEnemies');
      return __echoes.state().run.phase;
    });
    if (ph === 'reward') break;
    await sleep(100);
  }
  await waitFor(page, () => __echoes.state().run.phase === 'reward', { timeout: 15000 });
  await sleep(500);
  const ph = await clearLevel(page);
  await sleep(1500);
  const saved = await E(page, () => ({ log: __echoes.save.autosaveLog().filter((r) => /level_transit/.test(r.reason || '')), build: (() => { const s = __echoes.state(); return { skills: s.build.skills.map((k) => `${k.id}:${k.sockets.map((x) => (x ? x.node : '-')).join(',')}`), bench: s.build.bench.map((x) => x.node).sort(), wallet: s.wallet }; })(), card: __echoes.campaign.state().card }));
  check(L, `the level transition autosaved (${JSON.stringify(saved.log.map((r) => ({ slot: r.slot, ok: r.ok, tick: r.captureTick })))})`, ph === 'transit' && saved.log.length === 1 && saved.log[0].ok, saved.log);
  // reload as a TITLE session and Continue
  await page.goto(URL0, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__echoes && window.__echoes.app, { timeout: 180000 });
  for (let i = 0; i < 120; i++) {
    const st = await E(page, () => __echoes.app.state);
    if (st === 'title') break;
    if (st === 'loading') await page.keyboard.press('Space');
    await sleep(500);
  }
  await sleep(800);
  const cont = await E(page, () => {
    const b = [...document.querySelectorAll('button')].find((x) => /^\s*Continue/.test(x.textContent) && x.offsetParent !== null);
    return b ? b.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  await shot(page, `continue-title-${TAG}`);
  await E(page, () => [...document.querySelectorAll('button')].find((x) => /^\s*Continue/.test(x.textContent) && x.offsetParent !== null).click());
  await waitFor(page, () => __echoes.app.state === 'playing' && __echoes.state().run.active, { timeout: 30000 });
  await sleep(300);
  const back = await E(page, () => ({ phase: __echoes.state().run.phase, card: __echoes.campaign.state().card, screen: __echoes.runUi().screen, build: (() => { const s = __echoes.state(); return { skills: s.build.skills.map((k) => `${k.id}:${k.sockets.map((x) => (x ? x.node : '-')).join(',')}`), bench: s.build.bench.map((x) => x.node).sort(), wallet: s.wallet }; })() }));
  await shot(page, `continue-card-${TAG}`);
  check(L, `reload -> title Continue ("${cont}") -> the same card (${back.card && `${back.card.kind} ${back.card.from}->${back.card.to}`}, page ${back.screen}) with the carried build`, /Level I cleared/.test(cont || '') && back.phase === 'transit' && back.card && back.card.to === 2 && back.screen === 'transit' && JSON.stringify(back.build) === JSON.stringify(saved.build), { cont, back, saved: saved.build });
  await waitFor(page, controllable, { args: [2], timeout: 30000 });
  const lv = await E(page, () => ({ c: __echoes.campaign.state(), build: (() => { const s = __echoes.state(); return { skills: s.build.skills.map((k) => k.id) }; })() }));
  check(L, `...and the card advances into Level 2 of the same campaign (index ${lv.c.index}, start level ${lv.c.startLevel})`, lv.c.level === 2 && lv.c.index === 2 && lv.c.startLevel === 1 && lv.c.harness === false, lv.c);
  check(L, 'no page errors', o.errors.length === 0, o.errors.slice(0, 3));
  await o.ctx.close();
}

// --------------------------------------------------------------------- main --
const legs = { flow: legFlow, quit: legQuit, edge: legEdge, locks: legLocks, continue: legContinue };
const which = LEG === 'all' ? Object.keys(legs) : LEG.split(',');
mkdirSync(join(here, 'captures'), { recursive: true });
const browser = await launchEchoes({ gpu: true, width: 1600, height: 900, extraArgs: ['--autoplay-policy=no-user-gesture-required'] });
try {
  for (const k of which) {
    if (!legs[k]) throw new Error(`unknown leg ${k}`);
    const t0 = Date.now();
    try {
      await legs[k](browser);
    } catch (err) {
      check(k, `leg completed`, false, String(err && err.stack ? err.stack : err).slice(0, 600));
    }
    (results[k] ||= { checks: [] }).ms = Date.now() - t0;
    writeFileSync(join(here, 'captures', `gntfixCAMPAIGN5-gates-${k}-${TAG}.json`), JSON.stringify(results[k], null, 1));
  }
} finally {
  await browser.close();
}
const all = Object.values(results).flatMap((r) => r.checks);
console.log(`${all.filter((c) => c.ok).length}/${all.length} checks pass`);
if (fails.length) console.log('FAILS:\n  ' + fails.join('\n  '));
process.exit(fails.length ? 1 : 0);
