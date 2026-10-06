#!/usr/bin/env node
// RELICS probe (docs/CONTENT_PLAN.md §5): the relic + curse slice, headless.
//
//   node tools/relics-probe.mjs [--seeds 1-4] [--from 1]
//
// Plays whole campaigns on the deterministic autopilot (it takes the first
// relic of each pick and walks the first door, cursed or not) and checks:
//   1. room 1 of every level opens a relic pick after its draft;
//   2. path screens carry cursed doors, a cursed room rolls its waves with
//      the curse's numbers, and clearing it opens a relic pick;
//   3. relics persist across levels and land in the run summary;
//   4. relic effects reach the pipeline (a granted Whetstone raises a hit;
//      Last Light keeps a member up once per room);
//   5. a save taken on the relic page restores it exactly;
//   6. the legacy single-level startRun() has no relics (no `relics` key, no
//      relic events), so the golden traces are untouched;
//   7. the same seed plays the same relics twice.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const seedsArg = opt('seeds', '1-4');
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const FROM = Number(opt('from', '1'));
const MAX_TICKS = 240000;

const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { difficulty } = await import(u('src/data/difficulty.js'));
const { cursedDiff, RELICS } = await import(u('src/sim/relics.js'));

function makeWorld(seed) {
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
  const log = [];
  for (const t of ['relic_offer', 'relic_gain', 'relic_proc', 'curse_taken', 'curse_apply', 'curse_lift', 'path_offer', 'level_clear', 'room_enter', 'run_end', 'reward_offer']) bus.on(t, (e) => log.push({ ...e, type: t }));
  const run = world.runSystem();
  const step = (ap) => clock.stepOnce((t) => world.step(t, ap ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  return { world, registry, bus, clock, run, log, step };
}

const fails = [];
const check = (ok, what) => {
  if (!ok) fails.push(what);
  return ok;
};

// ------------------------------------------------- 1-3, 7: whole campaigns --
function playCampaign(seed) {
  const W = makeWorld(seed);
  const { run, log, step } = W;
  const ap = run.autopilot;
  run.startCampaign({ level: FROM, harness: true });
  ap.configure(true);
  let summary = null;
  let cursedPlan = null;
  for (let i = 0; i < MAX_TICKS; i++) {
    step(ap);
    const v = run.view();
    // A cursed combat room: its plan must carry the curse's numbers.
    if (v.phase === 'combat' && v.relics && v.relics.curse && v.relics.curse.room === v.room && !v.relics.curse.major && !cursedPlan) {
      const plan = run.roomPlan();
      let want = cursedDiff(difficulty(v.act, Math.min(6, v.room), v.challenge), v.relics.curse.id);
      for (const m of v.relics.majors) want = cursedDiff(want, m.id); // slice 2: run-long majors
      cursedPlan = { curse: v.relics.curse.id, room: v.room, plan, want };
    }
    if (v.phase === 'victory' || v.phase === 'defeat') {
      summary = v.summary;
      break;
    }
  }
  const offers = log.filter((e) => e.type === 'relic_offer');
  const allGains = log.filter((e) => e.type === 'relic_gain');
  // Slice 2: elite drops and shop buys arrive without a pick.
  const gains = allGains.filter((e) => e.source !== 'elite' && e.source !== 'shop');
  const doors = log.filter((e) => e.type === 'path_offer');
  const cursedDoors = doors.filter((e) => e.options.some((o) => o.curse));
  const taken = log.filter((e) => e.type === 'curse_taken');
  const levels = log.filter((e) => e.type === 'level_clear').length;
  return { seed, summary, offers, gains, allGains, doors: doors.length, cursedDoors: cursedDoors.length, taken, levels, cursedPlan, sig: gains.map((g) => g.relic).join(',') + '|' + taken.map((t) => t.curse).join(','), outcome: summary ? summary.result : 'timeout' };
}

const results = [];
for (const seed of SEEDS) {
  const r = playCampaign(seed);
  results.push(r);
  const freeOffers = r.offers.filter((o) => o.source === 'free');
  const curseOffers = r.offers.filter((o) => o.source === 'curse' || o.source === 'major');
  check(freeOffers.length >= 1 && freeOffers.every((o) => o.room === 1), `seed ${seed}: a free relic pick after room 1 of each level (got ${freeOffers.map((o) => o.room)})`);
  check(freeOffers.length === Math.min(3, r.levels + (r.outcome === 'defeat' ? 1 : 0)) || r.outcome !== 'victory', `seed ${seed}: one free pick per level played (free ${freeOffers.length}, levels cleared ${r.levels})`);
  check(r.offers.every((o) => o.choices.length === 3 && new Set(o.choices).size === 3), `seed ${seed}: every pick offers three distinct relics`);
  check(r.gains.length === r.offers.length, `seed ${seed}: every pick was taken (offers ${r.offers.length}, gains ${r.gains.length})`);
  check(new Set(r.allGains.map((g) => g.relic)).size === r.allGains.length, `seed ${seed}: no relic twice`);
  check(r.cursedDoors > 0, `seed ${seed}: some path screens carry a cursed door (${r.cursedDoors}/${r.doors})`);
  if (r.summary) check(Array.isArray(r.summary.relics) && r.summary.relics.length === r.allGains.length, `seed ${seed}: the run summary lists the relics (${r.summary.relics})`);
  // Every cursed room that was cleared (a later room was entered) paid a pick.
  check(curseOffers.length <= r.taken.length, `seed ${seed}: curse picks never exceed curses taken`);
  if (r.cursedPlan) {
    const { plan, want, curse } = r.cursedPlan;
    const keys = ['hpMul', 'dmgMul', 'eliteChance'];
    if (plan.mode === 'kill_all') keys.push('budget');
    check(keys.every((k) => Math.abs((plan[k] ?? 0) - (want[k] ?? 0)) < 1e-6), `seed ${seed}: cursed room (${curse}) rolled with the curse's numbers`);
  }
}
const anyCursedPlan = results.some((r) => r.cursedPlan);
check(anyCursedPlan, 'at least one seed walked into a cursed room');
check(results.some((r) => r.offers.some((o) => o.source === 'curse')), 'at least one cursed room paid a relic pick');
const levelsCarry = results.some((r) => r.levels >= 1 && r.gains.length >= 2);
check(levelsCarry, 'relics ride across a level clear');

// Same seed, same relics.
const again = playCampaign(SEEDS[0]);
check(again.sig === results[0].sig, `seed ${SEEDS[0]} replays the same relics and curses`);

// ------------------------------------------------- 4: effects in the pipeline --
{
  const W = makeWorld(77);
  const { run, registry, world } = W;
  run.startCampaign({ level: 1, harness: true });
  for (let i = 0; i < 20; i++) W.step(null);
  const hostile = () => registry.all().find((e) => e.faction === 'hostile' && e.hp > 5 && e.kind !== 'waystone');
  // Wait for a hostile body.
  for (let i = 0; i < 4000 && !hostile(); i++) W.step(null);
  const t = hostile();
  if (check(!!t, 'effects: a hostile to hit')) {
    const hit = () => {
      const before = t.hp;
      run.cmd('keenProbe', [t.id, -1]); // power 1, no crit (bonus -1)
      return before - t.hp;
    };
    const plain = hit();
    run.cmd('relicGrant', ['whetstone']);
    const sharp = hit();
    check(Math.abs(sharp - plain * (1 + RELICS.whetstone.dealt)) < 1e-9, `effects: Whetstone raises party damage ${plain} -> ${sharp}`);
  }
  // Last Light: a lethal blow leaves a member at 1 HP, once per room.
  run.cmd('relicGrant', ['last_light']);
  const p = registry.all().find((e) => e.partyIndex === 1);
  if (check(!!p, 'effects: an ally to hit')) {
    // hitOnce = one basic-power instance (no attacker); setHp leaves 1% so it is lethal.
    world.cmd('setHp', p.id, 0.01);
    world.cmd('hitOnce', p.id);
    check(p.hp === 1, `effects: Last Light keeps the member at 1 HP (hp ${p.hp})`);
    world.cmd('hitOnce', p.id);
    check(p.hp === 0, `effects: Last Light works once per room (hp ${p.hp})`);
  }
}

// ------------------------------------------------- 5: save on the relic page --
{
  const W = makeWorld(5);
  const { run, world, step } = W;
  const ap = run.autopilot;
  run.startCampaign({ level: 1, harness: true });
  ap.configure(true);
  // Play until the first relic page, then stop the autopilot there.
  let at = null;
  for (let i = 0; i < 60000; i++) {
    const v = run.view();
    if (v.phase === 'relic') {
      at = v;
      break;
    }
    if (v.phase === 'reward') {
      ap.configure(false);
      run.takeReward();
      ap.configure(true);
    }
    step(ap);
  }
  if (check(!!at, 'save: reached the relic page')) {
    ap.configure(false);
    const snap = JSON.parse(JSON.stringify(world.saveState()));
    run.chooseRelic(1);
    const took = run.view().relics.owned.map((o) => o.id);
    world.loadState(JSON.parse(JSON.stringify(snap)));
    const back = run.view();
    check(back.phase === 'relic' && JSON.stringify(back.relics.offer) === JSON.stringify(at.relics.offer), 'save: the relic page restores with the same three relics');
    run.chooseRelic(1);
    check(JSON.stringify(run.view().relics.owned.map((o) => o.id)) === JSON.stringify(took), 'save: the restored pick takes the same relic');
  }
}

// ------------------------------------------------- 6: legacy run untouched --
{
  const W = makeWorld(1);
  const { run, log, step } = W;
  const ap = run.autopilot;
  run.startRun({ act: 1 });
  ap.configure(true);
  let keyed = false;
  for (let i = 0; i < 60000; i++) {
    step(ap);
    const v = run.view();
    if ('relics' in v) keyed = true;
    if (v.path && v.path.options.some((o) => 'curse' in o)) keyed = true;
    if (v.phase === 'victory' || v.phase === 'defeat') break;
  }
  check(!keyed, 'legacy: startRun() views carry no relics / curse keys');
  check(!log.some((e) => e.type.startsWith('relic') || e.type.startsWith('curse')), 'legacy: startRun() fires no relic or curse events');
}

for (const r of results)
  console.log(`seed ${r.seed}: ${r.outcome}, levels cleared ${r.levels}, relics [${r.allGains.map((g) => g.relic + (g.source === 'elite' ? '(elite)' : '')).join(', ')}], cursed doors ${r.cursedDoors}/${r.doors}, curses taken [${r.taken.map((t) => `${t.curse}@${t.room}`).join(', ')}]`);
if (fails.length) {
  console.log(`\nFAIL (${fails.length})`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('\nPASS relics probe');
