#!/usr/bin/env node
// GAMEPLAY BUGS probe (code review fix 3, docs/CAMPAIGN.md, docs/SHRINES.md)
// — headless Node, the sim built like src/main.js (no render, no DOM).
//
//   node tools/gameplay-bugs-probe.mjs
//
// Checks:
//   1. Daily boss credit: a won Daily credits the boss each level actually
//      met (every level reseeds, so the summary's one seed cannot re-roll
//      them); a plain campaign win credits what it did before; an old
//      summary with no per-level boss still reads through the seed fallback.
//   2. Room leftovers: walking on to the next room leaves no body of the last
//      room behind (retreaters, the escort pilgrim, the Waystone, nests,
//      enemy shots, the party's zones and bolts), shops, vaults and event
//      rooms included, over campaign seeds that met each of them.
//   3. Leaving a room revives no downed hero (only a room clear does).
//   4. Shrine and major curse: a Grave Shrine's curse never overwrites a
//      door's major curse; the major room pays its greater pick, and the
//      shrine's curse binds the next combat room instead.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { runFacts } = await import(u('src/data/unlocks.js'));
const { bossFor } = await import(u('src/data/levels.js'));
const { dailySeed, dailyLevelSeed } = await import(u('src/data/daily.js'));

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
  bus.on('*', (e) => {
    if (e.type !== 'sound') log.push(e);
  });
  const run = world.runSystem();
  const ap = run.autopilot;
  const step = (auto = false) => clock.stepOnce((t) => world.step(t, auto ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  return { world, registry, bus, clock, run, ap, log, step };
}

const fails = [];
const passes = [];
const check = (ok, what) => {
  (ok ? passes : fails).push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
  return ok;
};
const heroes = (W) => W.registry.all().filter((e) => e.partyIndex !== undefined);
const mend = (W) => {
  for (const e of heroes(W)) if (e.hp > 0) e.hp = e.maxHp;
};

// A whole campaign on autopilot with an unkillable party: the boss each level
// met, and the run's summary.
function wonRun(seed, opts) {
  const W = makeWorld(seed);
  const fought = [];
  let summary = null;
  W.bus.on('room_enter', (e) => {
    if (e.mode === 'boss') fought.push(W.run.view().actBoss?.kind ?? null);
  });
  W.bus.on('run_end', (e) => {
    const s = W.run.view().summary;
    summary = s ? { ...s, result: e.result, campaign: e.campaign ?? s.campaign } : null;
  });
  W.run.startCampaign({ level: 1, harness: true, ...opts });
  W.ap.configure(true);
  for (let i = 0; i < 3_000_000 && !summary; i++) {
    mend(W);
    W.step(true);
  }
  return { fought, summary };
}

// 1 ------------------------------------------------- Daily boss credit --
{
  for (const key of ['2026-01-01', '2026-10-19']) {
    const { fought, summary } = wonRun(1, { daily: { key } });
    const credited = summary ? runFacts(summary, {}).bosses : [];
    check(summary?.result === 'victory' && fought.length === 5, `Daily ${key}: won through five levels (${fought.join(', ')})`);
    check(credited.join() === fought.join(), `Daily ${key}: credits the bosses it fought (${credited.join(', ')})`);
    // What an old entry shows: a summary from before the fix (no per-level
    // boss) still reads through the last level's seed, as it always did.
    const old = JSON.parse(JSON.stringify(summary));
    for (const l of old.campaign.levels) delete l.boss;
    const s1 = dailySeed(key);
    const seeds = [s1, 2, 3, 4, 5].map((n, i) => (i ? dailyLevelSeed(s1, n) : s1));
    const oldList = runFacts(old, {}).bosses;
    check(oldList.join() === [1, 2, 3, 4, 5].map((lv) => bossFor(lv, seeds[4]).kind).join(), `Daily ${key}: an old summary keeps its old reading (${oldList.join(', ')})`);
  }
  for (const seed of [1, 2]) {
    const { fought, summary } = wonRun(seed, {});
    const credited = summary ? runFacts(summary, {}).bosses : [];
    const old = JSON.parse(JSON.stringify(summary));
    for (const l of old.campaign.levels) delete l.boss;
    check(credited.join() === fought.join() && runFacts(old, {}).bosses.join() === credited.join(), `campaign seed ${seed}: credits the same bosses as before the fix (${credited.join(', ')})`);
  }
}

// 2 --------------------------------------------------- room leftovers --
const LEFT = new Set(['pilgrim', 'waystone', 'nest', 'eshot', 'eglob', 'slick', 'affix_core', 'zone', 'azone', 'bolt', 'skillbolt']);
{
  const seen = { kinds: new Set(), modes: new Set(), retreaters: 0 };
  for (const seed of [4, 6]) {
    const W = makeWorld(seed);
    const born = new Map();
    let roomKey = 'init';
    const leaks = [];
    let level = 0;
    W.bus.on('level_start', () => level++);
    const party = (e) => e.partyIndex !== undefined || e.kind === 'player' || e.kind === 'ally';
    // The leftovers about to be carried: noted at the room before's exit.
    let before = [];
    W.bus.on('room_enter', (e) => {
      const key = `L${W.run.view().act}r${e.index}`;
      for (const ent of W.registry.all()) {
        if (party(ent)) continue;
        const from = born.get(ent.id);
        if (from && from !== key) leaks.push(`${key} (${e.mode}): ${ent.kind}#${ent.id} from ${from} state=${ent.state ?? ''}`);
      }
      for (const b of before) {
        seen.kinds.add(b.kind);
        if (b.state === 'retreating') seen.retreaters++;
      }
      seen.modes.add(e.mode);
      roomKey = key;
    });
    W.run.startCampaign({ level: 1, harness: true });
    W.ap.configure(true);
    for (let i = 0; i < 3_000_000 && level < 3; i++) {
      mend(W);
      W.step(true);
      for (const ent of W.registry.all()) if (!born.has(ent.id)) born.set(ent.id, roomKey);
      // What stands on the floor the tick before a room changes.
      before = W.registry.all().filter((ent) => !party(ent) && (LEFT.has(ent.kind) || ent.faction === 'hostile'));
      const ph = W.run.view().phase;
      if (ph === 'victory' || ph === 'defeat') break;
    }
    check(level >= 3 && leaks.length === 0, `seed ${seed}, Levels I-II on autopilot: nothing of a room follows the party into the next (${leaks.length} leftovers${leaks.length ? ': ' + leaks.slice(0, 4).join('; ') : ''})`);
  }
  check(seen.retreaters > 0 && seen.kinds.has('pilgrim'), `the runs walked out on retreaters (${seen.retreaters}) and an escort pilgrim; kinds left at an exit: ${[...seen.kinds].sort().join(', ')}`);
  check(['shop', 'vault', 'event'].every((m) => seen.modes.has(m)), `the runs entered shops, vaults and event rooms (${[...seen.modes].sort().join(', ')})`);
}
{
  // Bodies set down by hand in a shop do not reach the boss room.
  const W = makeWorld(3);
  W.run.startCampaign({ level: 1, harness: true });
  W.world.cmd('skipToRoom', 7);
  for (let i = 0; i < 400 && W.run.view().phase !== 'shop'; i++) W.step();
  const h = heroes(W)[0];
  const zone = W.registry.spawn({ kind: 'zone', skill: 'probe', x: 1, z: 1, radius: 2 });
  const azone = W.registry.spawn({ kind: 'azone', skill: 'probe', x: 1, z: 1, radius: 2 });
  const bolt = W.registry.spawn({ kind: 'bolt', x: 0, z: 0, vx: 1, vz: 0, owner: h.id });
  const way = W.registry.spawn({ kind: 'waystone', faction: 'hostile', x: 3, z: 3, hp: 50, maxHp: 50 });
  const ids = [zone.id, azone.id, bolt.id, way.id];
  W.run.cmd('shopAdvance', []);
  for (let i = 0; i < 600 && W.run.view().room !== 8; i++) {
    W.step();
    if (W.run.view().phase === 'path') W.run.cmd('pathChoose', [0]);
  }
  const left = ids.filter((id) => W.registry.byId(id));
  check(W.run.view().room === 8 && left.length === 0, `a zone, an ally zone, a bolt and a Waystone in the shop stay in the shop (room ${W.run.view().room}, ${left.length} carried)`);
}

// 3 ---------------------------------------------- no revive on exit --
{
  const W = makeWorld(5);
  W.run.startCampaign({ level: 1, harness: true });
  for (let i = 0; i < 30; i++) W.step();
  const ally = W.registry.all().find((e) => e.kind === 'ally');
  ally.hp = 0;
  ally.downed = true;
  const n = W.log.length;
  W.world.allySystem().cmd('roomExit');
  const revived = W.log.slice(n).some((e) => e.type === 'revive');
  check(ally.hp === 0 && ally.downed && !revived, 'leaving a room revives no downed hero');
}

// 4 ------------------------------------------- shrine and major curse --
function shrineThenDoor(curse) {
  const W = makeWorld(6);
  W.run.startCampaign({ level: 3, harness: true });
  W.run.cmd('shrineRoom', [3]);
  W.world.cmd('skipToRoom', 3);
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  for (let i = 0; i < 4; i++) W.step();
  const used = W.run.cmd('shrineUse', [0]);
  W.run.cmd('relicDoor', [curse, 0]);
  W.world.cmd('clearRoom');
  const rooms = [];
  let offer = null;
  for (let i = 0; i < 20000 && rooms.length < 2; i++) {
    W.step();
    mend(W);
    const v = W.run.view();
    const ph = v.phase;
    if (ph === 'reward') W.run.cmd('draftDecline', []);
    else if (ph === 'relic') {
      const o = W.run.cmd('relics', [])?.offer;
      if (o && o.room === rooms[0]?.room) offer = o;
      W.run.cmd('relicChoose', [0]);
    } else if (ph === 'path') W.run.cmd('pathChoose', [0]);
    else if (ph === 'shop') W.run.cmd('shopAdvance', []);
    else if (ph === 'combat' && (!rooms.length || rooms[rooms.length - 1].room !== v.room)) {
      const rel = W.run.cmd('relics', []);
      rooms.push({ room: v.room, mode: v.mode ?? null, curse: rel?.curse?.id ?? null, major: !!rel?.curse?.major, shrine: W.log.find((e) => e.type === 'shrine_curse' && e.room === v.room)?.curse ?? null });
    } else if (ph === 'combat' && i % 600 === 599) W.world.cmd('clearRoom');
    if (ph === 'combat' && rooms.length === 1 && !offer && i % 600 === 0) W.world.cmd('clearRoom');
  }
  return { W, used, rooms, offer };
}
{
  const { used, rooms, offer } = shrineThenDoor('hunted');
  const [a, b] = rooms;
  check(!!used?.curse, `Level III room 3: the Grave Shrine owes the next fight ${used?.curse}`);
  check(a && a.curse === 'hunted' && a.major && !a.shrine, `room ${a?.room}: the door's major curse holds (curse ${a?.curse}, shrine curse ${a?.shrine ?? 'none'})`);
  check(offer?.source === 'major', `room ${a?.room}'s clear pays the major curse's greater pick (source ${offer?.source})`);
  check(b && b.shrine === used?.curse && b.curse === used?.curse, `room ${b?.room}: the shrine's curse binds the next combat room (${b?.shrine})`);
}
{
  // Unchanged: a room curse on the door holds the room the same way.
  const { used, rooms } = shrineThenDoor('famine');
  const [a, b] = rooms;
  check(a && a.curse === 'famine' && !a.shrine, `a room curse door holds its room the same way (room ${a?.room}: ${a?.curse}, shrine curse ${a?.shrine ?? 'none'})`);
}

console.log(`\n${passes.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
