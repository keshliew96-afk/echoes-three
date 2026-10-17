#!/usr/bin/env node
// THE EMBER KILN probe (docs/KILN.md, content plan 5 slice 7) — headless
// Node, the sim built like src/main.js, with the ?act6=1 preview turned on
// through ECHOES_ACT6=1.
//
//   node tools/act6-probe.mjs
//
// Checks:
//   0. Without the flag (a child process): five levels on the Spire road,
//      the Level IV clear opens the Spire only, Endless five, Boss Rush five,
//      no Kiln page, chapter or arena.
//   1. Wiring under the flag: both Level V lands play, the campaign takes the
//      Kiln road (1-4 then act 6), the roads fork after Level IV, layouts
//      36-41 in the kiln biome, Spire numbers, Endless cycles six, Boss Rush
//      unchanged, four Journal rows, no Ringwalker widening, the Kiln chapter
//      and ending.
//   2. Ember Newt: a lunge lane that bites, then a rest.
//   3. Slag Golem: crusted x0.6, a slam that hurts and splashes slag, x1.4
//      while the core shows, then the crust knits.
//   4. Bellows Imp: a cone fan that hurts; a stun chokes it.
//   5. Cinder Moth: a kindle ring and flare, spent at x2, then relit.
//   6. Cinder vent: a telegraph, an eruption that hurts, a bed that slows,
//      then it cools.
//   7. Governor: five Kiln attackers keep at most two player-targeted
//      telegraphs live, starts >= 72 ticks apart.
//   8. Kiln runs: kiln rooms and creatures, a stand-in boss on the Firing
//      Floor, the Kiln clear wins; a Level IV start runs on to the Kiln; a
//      Spire start still ends on the Spire; the Daily keeps the Spire road.
//   9. Saves and co-op: a world mid-fight with all four enemies continues
//      bit-identically after a capture round trip.
// Exit code 1 on any failure.
import { spawnSync } from 'node:child_process';
process.env.ECHOES_ACT6 = '1';
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
const { hashState } = await import(u('src/core/hash.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { quantizeEntity, viewEntity } = await import(u('src/net/protocol/quantize.js'));
const { difficulty } = await import(u('src/data/difficulty.js'));
const { LEVELS, ACT_IDS, CAMPAIGN_ACTS, ENDLESS_ACTS, ROADS, DEFAULT_ROAD, levelNumberOf } = await import(u('src/data/levels.js'));
const { CAMPAIGN_LEVELS, ALL_LEVELS, nextLevel, nextLevels, prevLevel, FINAL_LEVEL } = await import(u('src/data/campaign.js'));
const { LAYOUTS } = await import(u('src/data/layouts.js'));
const E = await import(u('src/data/endless.js'));
const { affixCountFor } = await import(u('src/sim/affixes.js'));
const { speedMul } = await import(u('src/sim/status.js'));
const { HAZARD_TYPES } = await import(u('src/sim/hazards.js'));
const { BESTIARY } = await import(u('src/data/journal.js'));
const { ARENA_IDS } = await import(u('src/data/unlocks.js'));
const { CHAPTERS, endingFor, ENDING } = await import(u('src/data/story.js'));
const RUSH = await import(u('src/data/rush.js'));

function makeWorld(seed, { harness = false } = {}) {
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
  const world = createWorld({ rng, registry, events: bus, harness, requestHitstop: clock.requestHitstop, room: null });
  const io = createStateIO({ clock, rng, registry, world });
  const log = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') log.push(e);
  });
  const run = world.runSystem();
  const step = () => clock.stepOnce((t) => world.step(t, emptySnapshot()));
  return { world, registry, bus, clock, run, log, step, io };
}

const fails = [];
const passes = [];
const check = (ok, what) => {
  (ok ? passes : fails).push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
  return ok;
};
const steps = (W, n) => {
  const until = W.clock.tick + n;
  for (let i = 0; i < n * 4 && W.clock.tick < until; i++) W.step();
};
// A live Kiln room with the room's own enemies gone and waves held.
function kilnRoom(seed = 3) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 6, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  steps(W, 30);
  clearRoom(W);
  return W;
}
function clearRoom(W) {
  W.world.cmd('killAllEnemies');
  W.registry.all().filter((e) => e.kind === 'eglob' || e.kind === 'slick' || e.kind === 'affix_core').forEach((e) => W.registry.despawn(e.id));
  W.log.length = 0;
}
// Park the whole party at (x, z), allies in a row beside the player.
function parkParty(W, x = 0, z = 4.5, gap = 0.9) {
  W.world.cmd('teleport', x, z);
  for (const a of W.registry.all().filter((e) => e.kind === 'ally')) {
    a.x = a.px = x + (a.partyIndex - 2) * gap;
    a.z = a.pz = z + 0.6;
  }
}
const party = (W) => W.registry.all().filter((e) => e.faction === 'party');
// Make the party immortal so long checks are not cut short by a down.
const mend = (W) => party(W).forEach((p) => (p.hp = p.maxHp));
// Spawned tough (hpMul 30) so the party's own fire does not end a check early.
const spawn = (W, kind, x, z, o = { hpMul: 30 }) => W.registry.byId(W.world.cmd('spawn', kind, x, z, o));

const player = (W) => W.registry.all().find((e) => e.kind === 'player');
function inLaneOf(t, p) {
  const px = p.x - t.fromX;
  const pz = p.z - t.fromZ;
  const along = px * t.dirX + pz * t.dirZ;
  const r = p.radius ?? 0;
  if (along < -r || along > t.length + r) return false;
  return Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + r;
}
// Clear levels boss by boss until the run ends; returns the level_clear events.
function runThrough(W, opts, maxLevels = 6) {
  W.run.startCampaign({ harness: true, ...opts });
  const clears = [];
  for (let lv = 0; lv < maxLevels && W.run.view().phase !== 'victory'; lv++) {
    for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) {
      W.step();
      const v = W.run.view();
      if (['transit', 'reward', 'relic', 'socket'].includes(v.phase) || (W.world.cmd('campaignState') || {}).phase === 'transit') W.world.cmd('campaignAdvance', 'probe');
    }
    W.world.cmd('skipToRoom', 8);
    for (let i = 0; i < 600 && W.run.view().phase !== 'combat'; i++) W.step();
    steps(W, 30);
    W.run.cmd('killBoss');
    const before = clears.length;
    for (let i = 0; i < 4000 && clears.length === before; i++) {
      W.world.cmd('killAllEnemies');
      mend(W);
      W.step();
      const c = W.log.filter((e) => e.type === 'level_clear');
      if (c.length > before) clears.push(c[c.length - 1]);
    }
    if (clears.length === before || clears[clears.length - 1].final) break;
  }
  for (let i = 0; i < 3000 && W.run.view().phase !== 'victory'; i++) W.step();
  return clears;
}


const NEW = ['newt', 'slag', 'bellows', 'cindermoth'];

// ------------------------------------------------------- 0. without the flag --
{
  const code = `
    const L = await import(${JSON.stringify(u('src/data/levels.js'))});
    const C = await import(${JSON.stringify(u('src/data/campaign.js'))});
    const { BESTIARY } = await import(${JSON.stringify(u('src/data/journal.js'))});
    const { CHAPTERS } = await import(${JSON.stringify(u('src/data/story.js'))});
    const { ARENA_IDS } = await import(${JSON.stringify(u('src/data/unlocks.js'))});
    const R = await import(${JSON.stringify(u('src/data/rush.js'))});
    const E = await import(${JSON.stringify(u('src/data/endless.js'))});
    console.log(JSON.stringify({ flag: L.ACT6_PREVIEW, road: L.DEFAULT_ROAD, acts: L.ACT_IDS, endless: L.ENDLESS_ACTS, levels: C.CAMPAIGN_LEVELS, all: C.ALL_LEVELS, next4: C.nextLevel(4), opens: C.nextLevels(4), best: BESTIARY.length, kiln: BESTIARY.filter((b) => ${JSON.stringify(NEW)}.includes(b.id)).length, chapters: CHAPTERS.length, arenas: ARENA_IDS, lap: R.LAP, cycle: E.CYCLE }));`;
  const env = { ...process.env };
  delete env.ECHOES_ACT6;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env, encoding: 'utf8' });
  let o = null;
  try { o = JSON.parse(r.stdout.trim().split('\n').pop()); } catch { o = null; }
  check(!!o && o.flag === false && o.road === 'spire' && o.acts.join() === '1,2,3,4,5' && o.levels.join() === '1,2,3,4,5' && o.all.join() === '1,2,3,4,5', `without the flag the campaign is unchanged: five levels on the Spire road (${o ? o.acts.join(', ') : r.stderr.slice(0, 300)})`);
  check(!!o && o.next4 === 5 && o.opens.join() === '5', 'without the flag the Level IV clear opens the Spire only');
  check(!!o && o.endless.join() === '1,2,3,4,5' && o.cycle === 5 && o.lap === 5, `without the flag Endless cycles five and Boss Rush laps five (${o ? `${o.cycle}, ${o.lap}` : '-'})`);
  check(!!o && o.kiln === 0 && o.best === 60 && o.chapters === 5 && !o.arenas.includes(41), `without the flag no Kiln page, chapter or arena shows (${o ? `${o.best} entries, ${o.chapters} chapters` : '-'})`);
}

// ---------------------------------------------------------------- 1. wiring --
{
  check(DEFAULT_ROAD === 'kiln' && ACT_IDS.join() === '1,2,3,4,5,6' && ALL_LEVELS.join() === '1,2,3,4,5,6', `under the flag both Level V lands play (${ACT_IDS.join(', ')})`);
  check(CAMPAIGN_LEVELS.join() === '1,2,3,4,6' && FINAL_LEVEL === 6 && CAMPAIGN_ACTS === 5, `the campaign takes the Kiln road: ${CAMPAIGN_LEVELS.join(', ')} (CAMPAIGN_ACTS ${CAMPAIGN_ACTS})`);
  check(nextLevel(4) === 6 && nextLevel(6) === null && nextLevel(4, 'spire') === 5 && nextLevel(5) === null && prevLevel(6) === 4 && prevLevel(5) === 4, 'the roads fork after Level IV: the Kiln or the Spire, each final, each unlocked by Level IV');
  check(nextLevels(4).join() === '5,6', `a Level IV clear opens both Level Vs (${nextLevels(4).join(', ')})`);
  const lv = LEVELS[6];
  check(lv && lv.name === 'The Ember Kiln' && lv.biome === 'kiln' && lv.level === 5 && lv.road === 'kiln' && ROADS.kiln === 6 && levelNumberOf(6) === 5, 'the Kiln is act 6 in data and plays as Level V on the kiln road');
  const lays = [36, 37, 38, 39, 40, 41].map((id) => LAYOUTS[id]);
  check(lays.every((l) => l && l.act === 6 && l.biome === 'kiln') && lv.bossLayout === 39 && LAYOUTS[41].arena === true, `six kiln layouts (${lays.map((l) => l && l.name).join(', ')}), the boss on the Firing Floor, the arena the Kiln Mouth`);
  check(lays.filter((l) => (l.hazards || []).some((h) => h.type === 'vent')).length === 6, 'cinder vents in all six kiln layouts');
  check(NEW.every((k) => lv.roster[k] > 0), 'the Kiln roster holds the four new enemies');
  let same = true;
  for (let r = 1; r <= 6; r++) for (const k of ['hpMul', 'dmgMul', 'budget', 'eliteChance', 'bossHp']) if (difficulty(6, r)[k] !== difficulty(5, r)[k]) same = false;
  check(same, `the Kiln plays on the Spire's numbers (room 6 hp ${difficulty(6, 6).hpMul})`);
  check(ENDLESS_ACTS.join() === '1,2,3,4,5,6' && E.CYCLE === 6 && E.levelOfDepth(6) === 6 && E.endlessNextLevel(6) === 1, `the Endless Descent cycles six lands under the flag (cycle ${E.CYCLE})`);
  check(RUSH.LAP === 5, `Boss Rush still laps the five campaign lands (${RUSH.LAP})`);
  check(NEW.every((k) => BESTIARY.some((b) => b.id === k)) && new Set(BESTIARY.map((b) => b.id)).size === BESTIARY.length && BESTIARY.length === 64, `the Journal adds four Kiln rows, no duplicates (${BESTIARY.length} entries)`);
  check(!ARENA_IDS.includes(41), 'the Ringwalker deed does not count the Kiln Mouth');
  check(CHAPTERS.length === 6 && CHAPTERS[5].verse === 'flame' && endingFor(5, 'kiln') === ENDING.kiln && endingFor(5) === ENDING.spire, 'the story gains the Kiln chapter (the Verse of Flame) and its own ending');
}

// ----------------------------------------------------------------- 2. newt --
{
  const W = kilnRoom(3);
  parkParty(W, 0, 2.5, 3.5);
  const n = spawn(W, 'newt', 0, -0.5);
  let tel = null;
  for (let i = 0; i < 900 && !tel; i++) {
    W.step();
    mend(W);
    parkParty(W, 0, 2.5, 3.5);
    if (n.telegraph && n.telegraph.lance) tel = { ...n.telegraph };
  }
  check(!!tel && tel.kind === 'lane' && tel.playerTargeted && tel.resolveTick - tel.startTick >= 42, `the newt crouches and marks a lunge lane (${tel ? `${tel.length.toFixed(1)} u, ${tel.resolveTick - tel.startTick} ticks` : 'none'})`);
  let stop = null;
  for (let i = 0; i < 300 && !stop; i++) {
    const p = player(W);
    if (n.telegraph) {
      p.x = p.px = n.telegraph.fromX + n.telegraph.dirX * Math.min(2, n.telegraph.length - 0.4);
      p.z = p.pz = n.telegraph.fromZ + n.telegraph.dirZ * Math.min(2, n.telegraph.length - 0.4);
    }
    W.step();
    mend(W);
    stop = W.log.find((e) => e.type === 'newt_stop' && e.id === n.id);
  }
  check(!!stop && stop.hits >= 1 && n.mode === 'rest' && W.log.some((e) => e.type === 'newt_lunge' && e.id === n.id), `it lunges down the lane, bites and rests (${stop ? stop.hits : 0} hit)`);
}

// ----------------------------------------------------------------- 3. slag --
{
  const W = kilnRoom(4);
  parkParty(W, 0, 1.4, 0.7);
  const g = spawn(W, 'slag', 0, -0.4);
  check(g.takenMul === 0.6 && g.kbScale === 0.3, 'the golem arrives crusted: x0.6 damage taken, x0.3 knockback');
  let slam = null;
  for (let i = 0; i < 900 && !slam; i++) {
    W.step();
    mend(W);
    parkParty(W, 0, 1.4, 0.7);
    slam = W.log.find((e) => e.type === 'slag_slam' && e.id === g.id);
  }
  const pool = W.registry.all().find((e) => e.kind === 'slick' && e.variant === 'slag' && e.ownerId === g.id);
  check(!!slam && slam.victims >= 1 && !!pool, `it slams a ring for ${slam ? slam.victims : 0} heroes and splashes a slag pool (${pool ? `r ${pool.radius}` : 'none'})`);
  check(g.takenMul === 1.4 && g.coreUntil > W.clock.tick, 'the slam cracks its crust: x1.4 while the core shows');
  let crust = null;
  for (let i = 0; i < 200 && !crust; i++) {
    for (const p of party(W)) { p.x = p.px = 9; p.z = p.pz = 5; }
    W.step();
    mend(W);
    crust = W.log.find((e) => e.type === 'slag_crust' && e.id === g.id);
  }
  check(!!crust && g.takenMul === 0.6, 'then the crust knits shut again');
}

// -------------------------------------------------------------- 4. bellows --
{
  const W = kilnRoom(5);
  parkParty(W, 0, 1.2, 0.6);
  const b = spawn(W, 'bellows', 0, -1.6);
  let fan = null;
  let tel = null;
  for (let i = 0; i < 900 && !fan; i++) {
    W.step();
    mend(W);
    parkParty(W, 0, 1.2, 0.6);
    if (b.telegraph) tel = { ...b.telegraph };
    fan = W.log.find((e) => e.type === 'bellows_fan' && e.id === b.id);
  }
  check(!!tel && tel.kind === 'cone' && !!fan && fan.victims >= 1, `the imp marks a cone and fans sparks down it (${fan ? fan.victims : 0} caught)`);
  W.log.length = 0;
  let choked = false;
  let stunned = false;
  for (let i = 0; i < 900 && !choked; i++) {
    W.step();
    mend(W);
    parkParty(W, 0, 1.2, 0.6);
    if (b.telegraph && !stunned) {
      W.world.cmd('clearStatus', b.id);
      if (b.status) delete b.status.stunImmune;
      W.world.cmd('setStatus', b.id, 'stun', 1, 60);
      stunned = true;
    }
    choked = W.log.some((e) => e.type === 'bellows_choke' && e.id === b.id);
  }
  check(choked && !W.log.some((e) => e.type === 'bellows_fan' && e.id === b.id), 'a stun mid-pump chokes the fan');
}

// ----------------------------------------------------------- 5. cinder moth --
{
  const W = kilnRoom(6);
  parkParty(W, 0, 1.0, 0.7);
  const m = spawn(W, 'cindermoth', 0, -1.5);
  let flare = null;
  for (let i = 0; i < 900 && !flare; i++) {
    W.step();
    mend(W);
    parkParty(W, 0, 1.0, 0.7);
    flare = W.log.find((e) => e.type === 'cindermoth_flare' && e.id === m.id);
  }
  check(!!flare && flare.victims >= 1 && m.mode === 'spent' && m.takenMul === 2, `the moth kindles and flares (${flare ? flare.victims : 0} caught), then hangs spent at x2 damage taken`);
  let relit = null;
  for (let i = 0; i < 300 && !relit; i++) {
    W.step();
    mend(W);
    relit = W.log.find((e) => e.type === 'cindermoth_relight' && e.id === m.id);
  }
  check(!!relit && m.takenMul === undefined && m.mode === 'flutter', 'then it catches light again and the punish window closes');
}

// ------------------------------------------------------------ 6. cinder vent --
{
  const W = kilnRoom(7);
  W.world.cmd('setLayout', 36);
  clearRoom(W);
  const vents = W.registry.all().filter((e) => e.kind === 'hazard' && e.htype === 'vent');
  check(vents.length === 2, `the Stoke Hall has two cinder vents (${vents.length})`);
  const v = vents[0];
  W.log.length = 0;
  W.world.cmd('hazardPhase', v.id, 'telegraph');
  let tel = null;
  let res = null;
  const allyAway = () => W.registry.all().filter((e) => e.kind === 'ally').forEach((a) => { a.x = a.px = 3; a.z = a.pz = 2 + a.partyIndex * 0.6; });
  const hp0 = player(W).maxHp;
  for (let i = 0; i < 200 && !res; i++) {
    const p = player(W);
    p.x = p.px = v.x + 0.3;
    p.z = p.pz = v.z;
    p.hp = p.maxHp;
    allyAway();
    W.world.cmd('killAllEnemies');
    W.step();
    tel = tel || W.log.find((e) => e.type === 'hazard_telegraph' && e.id === v.id);
    res = W.log.find((e) => e.type === 'hazard_resolve' && e.id === v.id && e.erupt);
  }
  const hurt = hp0 - player(W).hp;
  check(!!tel && !!res && res.telegraphTicks >= HAZARD_TYPES.vent.telegraphTicks - 1 && res.victims >= 1 && hurt > 0, `the vent telegraphs ${res ? res.telegraphTicks : '-'} ticks, then erupts (${res ? res.victims : 0} caught, ${hurt.toFixed(1)} damage)`);
  // A far foe holds the room open so it does not clear (a clear sends every
  // hazard dormant).
  const hold = spawn(W, 'slag', -6, -4);
  W.step();
  const slowed = speedMul(player(W), W.clock.tick) < 1;
  check(v.phase === 'active' && slowed, 'it leaves a bed of cinders that slows the hero on it');
  for (let i = 0; i < HAZARD_TYPES.vent.bedTicks + 4; i++) {
    allyAway();
    hold.x = hold.px = -6;
    hold.z = hold.pz = -4;
    mend(W);
    W.step();
  }
  check(W.log.some((e) => e.type === 'vent_cool' && e.id === v.id) && v.phase === 'idle', 'then the vent cools to idle');
}

// ------------------------------------------------------------- 7. governor --
{
  const W = kilnRoom(8);
  parkParty(W, 0, 2.0);
  for (const [k, x, z] of [['newt', -3, -2], ['newt', 3, -2], ['bellows', 0, -2.5], ['cindermoth', -1.5, 0.8], ['slag', 1.5, 0.6]]) spawn(W, k, x, z);
  // Live player-targeted foe telegraphs by id (a foe the allies kill
  // mid-wind-up leaves the set with its body).
  const live = new Set();
  let maxLive = 0;
  const starts = [];
  W.bus.on('telegraph_start', (e) => {
    if (!e.playerTargeted || W.registry.byId(e.id)?.faction !== 'hostile') return;
    live.add(e.id);
    starts.push(e.tick);
  });
  const end = (e) => live.delete(e.id);
  W.bus.on('telegraph_resolve', end);
  W.bus.on('telegraph_cancel', end);
  for (let i = 0; i < 1800; i++) {
    W.step();
    mend(W);
    for (const id of live) if (!W.registry.byId(id)?.telegraph) live.delete(id);
    maxLive = Math.max(maxLive, live.size);
  }
  const gaps = starts.slice(1).map((t, i) => t - starts[i]);
  check(starts.length >= 4 && maxLive <= 2 && gaps.every((g) => g >= 72), `governor: ${starts.length} telegraphs, at most ${maxLive} live, starts >= 72 ticks apart (min gap ${Math.min(...gaps)})`);
}

// ------------------------------------------------------------ 8. Kiln runs --
{
  const kinds = new Set();
  for (const seed of [1, 2, 3, 4]) {
    const W = makeWorld(seed);
    W.run.startCampaign({ level: 6, harness: true });
    for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
    const lay = W.run.view().layout?.layoutId;
    check(lay >= 36 && lay <= 41, `seed ${seed}: the Kiln's room 1 is a kiln layout (${lay})`);
    for (let w = 0; w < 6; w++) {
      W.world.cmd('startWave');
      steps(W, 90);
    }
    for (const e of W.registry.all()) if (e.faction === 'hostile') kinds.add(e.kind);
  }
  const fresh = NEW.filter((k) => kinds.has(k));
  check(fresh.length >= 2, `the Kiln's room 1 waves roll Kiln creatures (${[...kinds].join(', ')})`);
  const W = makeWorld(5);
  W.run.startCampaign({ level: 6, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  W.world.cmd('skipToRoom', 8);
  for (let i = 0; i < 600 && W.run.view().phase !== 'combat'; i++) W.step();
  steps(W, 60);
  const v = W.run.view();
  const boss = v.actBoss && v.actBoss.kind;
  check(['colossus', 'lichram'].includes(boss) && v.layout?.layoutId === 39, `the Firing Floor holds a stand-in, ${boss} (layout ${v.layout?.layoutId})`);
  W.run.cmd('killBoss');
  let won = null;
  for (let i = 0; i < 4000 && !won; i++) {
    W.world.cmd('killAllEnemies');
    mend(W);
    W.step();
    won = W.log.find((e) => e.type === 'level_clear' && e.level === 6);
  }
  for (let i = 0; i < 3000 && W.run.view().phase !== 'victory'; i++) W.step();
  check(!!won && won.final === true && W.run.view().phase === 'victory', `clearing the Kiln ends the campaign in victory (final ${won ? won.final : '-'}, phase ${W.run.view().phase})`);
  // From Level IV the campaign takes the Kiln road: its fifth level is act 6.
  const X = makeWorld(6);
  const xc = runThrough(X, { level: 4 });
  check(xc.length === 2 && xc[0].level === 4 && xc[0].final === false && xc[1].level === 6 && xc[1].final === true, `a campaign from Level IV runs on to the Kiln and ends there (${xc.map((c) => `${c.level}${c.final ? '!' : ''}`).join(' ')})`);
  // A Spire start under the flag still ends on the Spire.
  const S = makeWorld(8);
  const sc = runThrough(S, { level: 5 });
  check(sc.length === 1 && sc[0].level === 5 && sc[0].final === true, `a Level V start on the Spire still ends there (${sc.map((c) => `${c.level}${c.final ? '!' : ''}`).join(' ')})`);
  // The Daily keeps the Spire road: its board never meets the Kiln.
  const D = makeWorld(7);
  const dc = runThrough(D, { daily: { key: '2026-10-17', practice: true } });
  check(dc.length === 5 && dc[4].final === true && dc[4].level === 5, `the Daily keeps the Spire road (${dc.map((c) => `${c.level}${c.final ? '!' : ''}`).join(' ')})`);
}

// ---------------------------------------------------- 9. saves and co-op --
{
  const W = kilnRoom(12);
  parkParty(W, 0, 3);
  for (const [k, x, z] of [['newt', -3, -3], ['slag', 3, -2], ['bellows', 0, -4.5], ['cindermoth', -2, 0.5]]) spawn(W, k, x, z);
  steps(W, 240);
  const tree = clonePlain(W.io.capture());
  const cont = (seed) => {
    const X = makeWorld(seed);
    const ok = X.io.apply(clonePlain(tree)).ok;
    const hs = [];
    for (let i = 0; i < 10; i++) {
      steps(X, 60);
      hs.push(hashState(X.io.capture()));
    }
    return { ok, hs: hs.join() };
  };
  const a = cont(12);
  const b = cont(999);
  check(a.ok && b.ok && a.hs === b.hs, 'a capture mid-fight with all four Kiln enemies and the vents continues bit-identically in fresh worlds');
  const ents = W.registry.all().filter((e) => NEW.includes(e.kind));
  const round = ents.map((e) => viewEntity(JSON.parse(JSON.stringify(quantizeEntity(e)))));
  check(ents.length >= 3 && round.every((r, i) => r && r.kind === ents[i].kind), `the co-op snapshot keeps their kinds (${round.map((r) => r && r.kind).join(', ')})`);
}

console.log(`\n${passes.length} passed, ${fails.length} failed`);
if (fails.length) {
  for (const f of fails) console.log('FAIL', f);
  process.exit(1);
}
