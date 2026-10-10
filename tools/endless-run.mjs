#!/usr/bin/env node
// ENDLESS runner (docs/ENDLESS.md). Plays endless descents headless with the
// deterministic default-build autopilot (the same Node world the campaign
// runner builds) and reports, per seed, the depth reached and each depth's
// outcome, downs and lowest party HP; then the survival curve over the seeds
// (how many runs cleared each depth).
//
//   node tools/endless-run.mjs --seeds 1-16 [--max-depth 12] [--root dir] [--out f] [--jobs 8]
//   --campaign 1   play a PLAIN campaign instead (the "before": depths 1-3)
//   --rush 1       play Boss Rushes (a depth = a fight; --third 1,2,3,4 opens the third bosses)
//
// A room still live 180 s after it started is STUCK (the run stops there).
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fork } from 'node:child_process';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const seedsArg = opt('seeds', '1-16');
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const MAX_DEPTH = Number(opt('max-depth', '12'));
const ROOT = resolve(opt('root', here));
const PLAIN = opt('campaign', '0') === '1';
// BOSS RUSH (docs/BOSS_RUSH.md): --rush 1 plays Boss Rushes (a depth = a fight).
const RUSH = opt('rush', '0') === '1';
const JOBS = Number(opt('jobs', '8'));
const OUT = opt('out', `captures/endless-${RUSH ? 'rush' : PLAIN ? 'campaign' : 'run'}-${seedsArg}.json`);
const STUCK_TICKS = 10800;

async function runOne(seed) {
  const u = (p) => pathToFileURL(join(ROOT, p)).href;
  const { createGameplayRng } = await import(u('src/core/rng.js'));
  const { createRegistry } = await import(u('src/core/registry.js'));
  const { createEventBus } = await import(u('src/core/events.js'));
  const { createClock } = await import(u('src/core/clock.js'));
  const { createWorld } = await import(u('src/sim/world.js'));
  const { emptySnapshot } = await import(u('src/core/intents.js'));
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
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const run = world.runSystem();
  const ap = run.autopilot;
  const depths = [];
  let cur = null;
  let room = null;
  let hash = 0;
  const newDepth = (level, tick) => {
    cur = { depth: depths.length + 1, level, boss: null, outcome: null, downs: 0, seatDowns: [0, 0, 0, 0], minHpFrac: 1, startTick: tick, ticks: null, rooms: 0 };
    depths.push(cur);
  };
  // A cheap running hash of every event (determinism: two runs of one seed match).
  const mix = (s) => {
    for (let i = 0; i < s.length; i++) hash = (Math.imul(hash ^ s.charCodeAt(i), 16777619) >>> 0);
  };
  for (const t of ['room_enter', 'room_cleared', 'level_clear', 'downed', 'death', 'run_end']) bus.on(t, (e) => mix(`${t}:${e.tick}:${e.index ?? e.level ?? e.kind ?? ''}`));
  bus.on('run_start', (e) => newDepth(e.act, e.tick));
  bus.on('level_start', (e) => newDepth(e.level, e.tick));
  bus.on('room_enter', (e) => {
    room = { startTick: e.tick, index: e.index };
    if (cur) cur.rooms = e.index;
    if (cur && e.mode === 'boss') cur.boss = run.view().actBoss ? run.view().actBoss.kind : null;
  });
  bus.on('downed', (e) => {
    if (!cur) return;
    cur.downs += 1;
    const m = registry.byId ? registry.byId(e.id) : null;
    if (m && m.partyIndex !== undefined) cur.seatDowns[m.partyIndex] += 1;
  });
  bus.on('hit', (e) => {
    if (!cur || (e.kind !== 'player' && e.kind !== 'ally')) return;
    const t = registry.byId ? registry.byId(e.target) : null;
    if (t && t.maxHp > 0) cur.minHpFrac = Math.min(cur.minHpFrac, Math.max(0, t.hp) / t.maxHp);
  });
  bus.on('level_clear', (e) => {
    if (!cur) return;
    cur.outcome = 'cleared';
    cur.ticks = e.tick - cur.startTick;
  });
  let stopNow = false;
  bus.on('level_clear', () => {
    if (depths.length >= MAX_DEPTH) stopNow = true;
  });
  run.startCampaign({ level: 1, harness: true, ...(RUSH ? { rush: true, thirdBosses: (opt('third', '') || '').split(',').filter(Boolean).map(Number) } : { endless: !PLAIN }) });
  ap.configure(true);
  let outcome = null;
  let stuck = null;
  for (let i = 0; i < 4_000_000; i++) {
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
    if (stopNow) {
      outcome = 'capped';
      break;
    }
    const v = run.view();
    if (v.phase === 'victory' || v.phase === 'defeat') {
      outcome = v.phase;
      if (cur && !cur.outcome) cur.outcome = v.phase;
      break;
    }
    if (v.phase === 'combat' && room && clock.tick - room.startTick > STUCK_TICKS) {
      stuck = { depth: cur ? cur.depth : null, room: room.index };
      outcome = 'stuck';
      break;
    }
  }
  const reached = depths.filter((d) => d.outcome === 'cleared').length;
  return {
    seed,
    outcome,
    stuck,
    depthsCleared: reached,
    ticks: clock.tick,
    hash: hash.toString(16),
    depths: depths.map((d) => ({ ...d, minHpFrac: Math.round(d.minHpFrac * 1000) / 1000 })),
  };
}

// -------------------------------------------------------------- driver --
if (process.env.ENDLESS_CHILD) {
  process.on('message', async (seed) => {
    process.send(await runOne(seed));
  });
} else {
  const t0 = Date.now();
  const results = [];
  const queue = [...SEEDS];
  await Promise.all(
    Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
      while (queue.length) {
        const seed = queue.shift();
        const child = fork(fileURLToPath(import.meta.url), argv, { env: { ...process.env, ENDLESS_CHILD: '1' } });
        const r = await new Promise((res) => {
          child.once('message', res);
          child.send(seed);
        });
        child.kill();
        results.push(r);
        const line = r.depths.map((d) => `${d.depth}:${d.outcome === 'cleared' ? 'ok' : d.outcome}(${d.downs}d ${Math.round(d.minHpFrac * 100)}%${d.boss ? ' ' + d.boss : ''})`).join(' ');
        console.log(`seed ${r.seed}: ${r.outcome} depths cleared ${r.depthsCleared}  ${line}`);
      }
    })
  );
  results.sort((a, b) => a.seed - b.seed);
  const maxD = Math.max(...results.map((r) => r.depths.length));
  const curve = [];
  for (let d = 1; d <= maxD; d++) {
    const reached = results.filter((r) => r.depths.length >= d).length;
    const cleared = results.filter((r) => r.depths[d - 1] && r.depths[d - 1].outcome === 'cleared').length;
    const downs = results.map((r) => r.depths[d - 1]).filter(Boolean).reduce((n, x) => n + x.downs, 0);
    curve.push({ depth: d, reached, cleared, downsPerRun: reached ? Math.round((downs / reached) * 10) / 10 : null });
  }
  console.log('\ndepth  reached  cleared  downs/run');
  for (const c of curve) console.log(`${String(c.depth).padStart(5)}  ${String(c.reached).padStart(7)}  ${String(c.cleared).padStart(7)}  ${c.downsPerRun}`);
  // Fairness: each seat's share of the party's downs, campaign depths vs the
  // endless ones (seat 0 Healer, 1 Tank, 2 Swordsman, 3 Archer).
  const share = (from, to) => {
    const t = [0, 0, 0, 0];
    for (const r of results) for (const d of r.depths) if (d.depth >= from && d.depth <= to) d.seatDowns.forEach((n, i) => (t[i] += n));
    const sum = t.reduce((a, b) => a + b, 0) || 1;
    return t.map((n) => Math.round((n / sum) * 100));
  };
  // Four lands since Act IV: the campaign depths are 1-4 and the descent
  // proper starts at 5 (the 4+ split is kept for comparison with the
  // three-land numbers in docs/ENDLESS.md and docs/BALANCE_PASS.md).
  const shares = { d1to3: share(1, 3), d4plus: share(4, 99), d1to4: share(1, 4), d5plus: share(5, 99) };
  console.log(`down share % (healer/tank/swordsman/archer): depths 1-3 ${shares.d1to3.join('/')}  depths 4+ ${shares.d4plus.join('/')}  depths 1-4 ${shares.d1to4.join('/')}  depths 5+ ${shares.d5plus.join('/')}`);
  const best = results.map((r) => r.depthsCleared).sort((a, b) => a - b);
  console.log(`median depths cleared ${best[Math.floor(best.length / 2)]}  stuck ${results.filter((r) => r.outcome === 'stuck').length}  ${Math.round((Date.now() - t0) / 1000)} s`);
  mkdirSync(dirname(join(here, OUT)), { recursive: true });
  writeFileSync(join(here, OUT), JSON.stringify({ seeds: SEEDS, maxDepth: MAX_DEPTH, plain: PLAIN, root: ROOT, curve, shares, results }, null, 1));
  console.log(`-> ${OUT}`);
}
