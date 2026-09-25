#!/usr/bin/env node
// CAMPAIGN exactly-once edge cases in the SIM (docs/gauntlet/PLAN.md §12.2,
// gate GC.3 — the sim half; the input half is tools/gntCAMPAIGN-probe.mjs
// `edge`). Headless Node, the world built exactly like src/main.js.
//
//   node tools/gntCAMPAIGN-edge.mjs [--seeds 1-5] [--out captures/gntCAMPAIGN-edge.json]
//
// Cases (every seed):
//   sameTick    the Stag and every add killed between two steps (they die on
//               ONE tick) -> exactly one level_clear + one level_transit;
//   stagFirst   the Stag dies while adds live -> no clear; the adds die ->
//               exactly one clear;
//   replay      a second room_cleared / onRoomCleared on the card -> ignored
//               (phase + per-level latch);
//   wipeOnClear every party member floored AND the Stag + adds killed before
//               the same step -> defeat, NO level_clear, no transit;
//   spamAdvance campaignAdvance x10 in one tick after the 0.5 s settle ->
//               exactly one level_start, index 1 -> 2; before the settle ->
//               refused 'settle';
//   hardBound   no presentation at all -> the sim advances itself at
//               hardUntilTick (reason 'timeout'), exactly once;
//   abandonCard Quit to Lobby (abandonRun) on the card -> run_end abandoned +
//               return_to_camp, no level_start ever after;
//   finalClear  Level 3 cleared -> level_clear(final) + run_end victory ->
//               camp by itself at autoReturnTick (600 ticks), exactly one
//               return_to_camp;
//   defeatL2    a wipe in Level 2 -> defeat card, campaign over (no level_clear).
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { scriptedInput } = await import(u('src/sim/script.js'));
const { TRANSIT } = await import(u('src/data/campaign.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const seedsArg = opt('seeds', '1-5');
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const OUT = opt('out', 'captures/gntCAMPAIGN-edge.json');

function build(seed) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; },
    getState: () => impl.getState(),
    setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const counts = {};
  const log = [];
  bus.on('*', (e) => {
    if (e.type === 'sound') return;
    counts[e.type] = (counts[e.type] || 0) + 1;
    if (['level_clear', 'level_transit', 'level_start', 'run_end', 'return_to_camp', 'defeat', 'run_start'].includes(e.type)) log.push({ type: e.type, tick: e.tick, level: e.level ?? e.act ?? e.to ?? null, result: e.result, reason: e.reason, kind: e.kind });
  });
  function stepN(n) {
    let stepped = 0;
    let guard = 0;
    while (stepped < n && guard < n * 8 + 64) {
      guard += 1;
      if (clock.stepOnce((t) => world.step(t, scriptedInput(0, t, { skillSlots: 0 })))) stepped += 1;
    }
    return stepped;
  }
  const run = () => world.runSystem();
  const c = (t) => counts[t] || 0;
  return { world, registry, bus, clock, stepN, run, counts, c, log };
}

// Into the Stag room with its adds up (the Stag summons adds on a timer).
function toStag(w, { wantAdds = true } = {}) {
  w.world.cmd('skipToRoom', 8);
  w.stepN(20);
  if (!wantAdds) return 0;
  for (let i = 0; i < 120; i++) {
    const adds = w.registry.all().filter((e) => e.faction === 'hostile' && e.kind !== 'stag' && e.hp > 0).length;
    if (adds > 0) return adds;
    w.world.cmd('bossHp', 0.3); // push the Stag into its add-summoning phases
    w.stepN(30);
  }
  return 0;
}
const hostiles = (w) => w.registry.all().filter((e) => e.faction === 'hostile' && e.hp > 0);

const checks = [];
function check(seed, what, ok, got = null) {
  checks.push({ seed, what, ok: !!ok, got });
  if (!ok) console.log(`FAIL [seed ${seed}] ${what} ${JSON.stringify(got).slice(0, 300)}`);
}

const out = { seeds: SEEDS, cases: {} };
for (const seed of SEEDS) {
  // ---------------------------------------------------------- sameTick --
  {
    const w = build(seed);
    w.stepN(30);
    w.world.cmd('startCampaign', { level: 1 });
    w.stepN(60);
    const adds = toStag(w);
    const before = hostiles(w).length;
    w.world.cmd('killBoss');
    w.world.cmd('killAllEnemies');
    const deadTick = w.clock.tick;
    w.stepN(3);
    check(seed, `sameTick: Stag + ${adds} adds (${before} hostiles) die on one tick -> exactly one level_clear / level_transit`, w.c('level_clear') === 1 && w.c('level_transit') === 1 && w.run().view().phase === 'transit', { counts: { lc: w.c('level_clear'), lt: w.c('level_transit') }, phase: w.run().view().phase, deadTick, log: w.log.slice(-4) });
    // replay: a second room clear on the card
    w.run().onRoomCleared({ mode: 'boss' });
    w.bus.emit(w.clock.tick, 'room_cleared', { mode: 'boss', softFailed: false });
    w.stepN(2);
    check(seed, 'replay: a second room_cleared on the card is ignored', w.c('level_clear') === 1 && w.c('level_transit') === 1 && w.run().campaign().index === 1, { lc: w.c('level_clear'), idx: w.run().campaign().index });
    // spamAdvance: before the settle -> refused
    const early = w.run().campaignAdvance('probe');
    const card = w.run().campaign().card;
    const settleLeft = card.minSkipTick - w.clock.tick;
    check(seed, 'spamAdvance: an advance inside the 0.5 s settle is refused', settleLeft <= 0 || (early && early.refused === 'settle'), { early, settleLeft });
    w.stepN(Math.max(0, settleLeft) + 1);
    for (let i = 0; i < 10; i++) w.run().campaignAdvance('probe');
    w.stepN(5);
    const cv = w.run().campaign();
    check(seed, 'spamAdvance: 10 advances in one tick -> exactly one level_start, index 2, level 2', w.c('level_start') === 1 && cv.index === 2 && cv.level === 2 && w.run().view().phase === 'combat', { ls: w.c('level_start'), index: cv.index, level: cv.level, phase: w.run().view().phase });
    out.cases.sameTick = out.cases.sameTick || [];
    out.cases.sameTick.push({ seed, adds, hostiles: before, log: w.log });
  }
  // --------------------------------------------------------- stagFirst --
  {
    const w = build(seed);
    w.stepN(30);
    w.world.cmd('startCampaign', { level: 1 });
    w.stepN(60);
    const adds = toStag(w);
    w.world.cmd('killBoss');
    w.stepN(10);
    const liveAdds = hostiles(w).length;
    const lc0 = w.c('level_clear');
    check(seed, `stagFirst: the Stag down with ${liveAdds} adds alive -> no level clear yet`, liveAdds === 0 || lc0 === 0, { liveAdds, lc0, adds });
    for (let i = 0; i < 20 && w.run().view().phase === 'combat'; i++) {
      w.world.cmd('killAllEnemies');
      w.stepN(5);
    }
    check(seed, 'stagFirst: the last add dies -> exactly one level_clear', w.c('level_clear') === 1 && w.run().view().phase === 'transit', { lc: w.c('level_clear'), phase: w.run().view().phase });
  }
  // ------------------------------------------------------- wipeOnClear --
  {
    const w = build(seed);
    w.stepN(30);
    w.world.cmd('startCampaign', { level: 1 });
    w.stepN(60);
    toStag(w);
    w.world.cmd('downAll');
    w.world.cmd('killBoss');
    w.world.cmd('killAllEnemies');
    w.stepN(4);
    const v = w.run().view();
    const ends = w.log.filter((e) => e.type === 'run_end');
    check(seed, 'wipeOnClear: party floored + Stag + adds on one tick -> defeat, no level_clear, no transit', w.c('level_clear') === 0 && w.c('level_transit') === 0 && v.phase === 'defeat' && ends.length === 1 && ends[0].result === 'defeat', { lc: w.c('level_clear'), phase: v.phase, ends, log: w.log.slice(-4) });
  }
  // --------------------------------------------------------- hardBound --
  {
    const w = build(seed);
    w.stepN(30);
    w.world.cmd('startCampaign', { level: 1 });
    w.stepN(60);
    toStag(w, { wantAdds: false });
    w.world.cmd('killBoss');
    w.world.cmd('killAllEnemies');
    w.stepN(3);
    const card = w.run().campaign().card;
    const t0 = w.clock.tick;
    w.stepN(TRANSIT.hardTicks + 30);
    const starts = w.log.filter((e) => e.type === 'level_start');
    check(seed, `hardBound: with nothing advancing it, the card advances itself at hardUntilTick (+${card ? card.hardUntilTick - card.startTick : '?'} ticks), once, reason timeout`, starts.length === 1 && starts[0].reason === 'timeout' && starts[0].tick === card.hardUntilTick && w.run().campaign().index === 2, { starts, hard: card && card.hardUntilTick, t0 });
  }
  // ------------------------------------------------------- abandonCard --
  {
    const w = build(seed);
    w.stepN(30);
    w.world.cmd('startCampaign', { level: 1 });
    w.stepN(60);
    toStag(w, { wantAdds: false });
    w.world.cmd('killBoss');
    w.world.cmd('killAllEnemies');
    w.stepN(40);
    const r = w.world.cmd('abandonRun', 'quit');
    w.stepN(TRANSIT.hardTicks + 60);
    const v = w.run().view();
    const ends = w.log.filter((e) => e.type === 'run_end');
    check(seed, 'abandonCard: Quit to Lobby on the card -> run_end abandoned + return_to_camp, never a level_start, phase idle, no hostile', r && r.abandoned && ends.length === 1 && ends[0].result === 'abandoned' && w.c('return_to_camp') === 1 && w.c('level_start') === 0 && v.phase === 'idle' && !v.active && hostiles(w).length === 0, { r: !!r, ends, rtc: w.c('return_to_camp'), ls: w.c('level_start'), phase: v.phase });
  }
  // -------------------------------------------------------- finalClear --
  {
    const w = build(seed);
    w.stepN(30);
    w.world.cmd('startCampaign', { level: 3 });
    // (a Level-3 start opens on the setting-out card only when asked to; here it enters room 1)
    w.stepN(60);
    toStag(w, { wantAdds: false });
    w.world.cmd('killBoss');
    w.world.cmd('killAllEnemies');
    w.stepN(3);
    const v = w.run().view();
    const cv = w.run().campaign();
    const lcs = w.log.filter((e) => e.type === 'level_clear');
    check(seed, 'finalClear: Level 3 clear -> one level_clear + run_end victory, CAMPAIGN COMPLETE auto-return armed', lcs.length === 1 && v.phase === 'victory' && w.c('run_end') === 1 && cv.autoReturnInTicks > 0 && cv.autoReturnInTicks <= TRANSIT.victoryReturnTicks, { lcs, phase: v.phase, auto: cv.autoReturnInTicks });
    const tEnd = w.clock.tick;
    w.stepN(TRANSIT.victoryReturnTicks + 10);
    const rt = w.log.filter((e) => e.type === 'return_to_camp');
    check(seed, 'finalClear: back in camp by itself within 600 ticks, exactly one return_to_camp', rt.length === 1 && rt[0].tick - tEnd <= TRANSIT.victoryReturnTicks && w.run().view().phase === 'idle', { rt, tEnd });
  }
  // ---------------------------------------------------------- defeatL2 --
  {
    const w = build(seed);
    w.stepN(30);
    w.world.cmd('startCampaign', { level: 1 });
    w.stepN(60);
    toStag(w, { wantAdds: false });
    w.world.cmd('killBoss');
    w.world.cmd('killAllEnemies');
    w.stepN(40);
    w.run().campaignAdvance('probe');
    w.stepN(120);
    w.world.cmd('downAll');
    w.stepN(10);
    const v = w.run().view();
    const ends = w.log.filter((e) => e.type === 'run_end');
    check(seed, 'defeatL2: a wipe in Level 2 -> defeat card, the campaign is over (one level_clear total)', v.phase === 'defeat' && ends.length === 1 && ends[0].result === 'defeat' && w.c('level_clear') === 1 && v.summary && v.summary.campaign && v.summary.campaign.level === 2, { phase: v.phase, ends, lc: w.c('level_clear') });
  }
}

const fails = checks.filter((c) => !c.ok);
out.checks = checks;
out.ok = fails.length === 0;
mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify(out, null, 1));
const byWhat = {};
for (const c of checks) {
  const k = c.what.split(':')[0];
  byWhat[k] = byWhat[k] || { pass: 0, total: 0 };
  byWhat[k].total += 1;
  if (c.ok) byWhat[k].pass += 1;
}
console.log(JSON.stringify(byWhat));
console.log(`${checks.length - fails.length}/${checks.length} checks pass -> ${OUT}`);
process.exit(fails.length ? 1 : 0);
