#!/usr/bin/env node
// ACT V probe (docs/ACT_V.md) — headless Node, the sim built like
// src/main.js, with the ?act5=1 preview turned on through ECHOES_ACT5=1.
//
//   node tools/act5-probe.mjs
//
// Checks:
//   0. Without the flag (a child process): four campaign acts, the Endless
//      cycle of four, Boss Rush and the Journal unchanged.
//   1. Wiring under the flag: Level V after the Hollow Heart and final,
//      layouts 29-34 in the spire biome, the Endless cycle of five, Act V
//      numbers at or above Act IV's, the Daily still four levels, Boss Rush
//      still four acts, the four Journal rows.
//   2. Gust Kite: a lane dive that hits, then grounded and taking x1.5.
//   3. Chime Wraith: a toll ring that hurts and slows; a stun chokes it.
//   4. Gargoyle: stone until a hero walks up, a wake burst, a slam, then
//      settles back into stone.
//   5. Rope Hanger: a lane swing that throws a hero out of the lane.
//   6. Gust vent: a telegraph, then a gust that carries a hero down the lane.
//   7. Governor: five Act V attackers keep at most two player-targeted
//      telegraphs live, starts >= 72 ticks apart.
//   8. AI: allies standing in a hanger's swing lane step out before it fires.
//   9. Level V campaign: spire rooms, Act V creatures, the boss in the
//      Belfry Crown, and clearing it wins the campaign.
//  10. Saves and co-op: a world mid-fight with all four enemies continues
//      bit-identically after a capture round trip.
// Exit code 1 on any failure.
import { spawnSync } from 'node:child_process';
process.env.ECHOES_ACT5 = '1';
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
const { LEVELS, ACT_IDS, CAMPAIGN_ACTS, ENDLESS_ACTS } = await import(u('src/data/levels.js'));
const { CAMPAIGN_LEVELS, nextLevel } = await import(u('src/data/campaign.js'));
const { LAYOUTS } = await import(u('src/data/layouts.js'));
const E = await import(u('src/data/endless.js'));
const { affixCountFor } = await import(u('src/sim/affixes.js'));
const { speedMul } = await import(u('src/sim/status.js'));
const { HAZARD_TYPES } = await import(u('src/sim/hazards.js'));
const { BESTIARY } = await import(u('src/data/journal.js'));
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
// A live Level V room with the room's own enemies gone and waves held.
function spireRoom(seed = 3) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 5, harness: true });
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

// ------------------------------------------------------- 0. without the flag --
{
  const code = `
    const { ACT_IDS, ENDLESS_ACTS, CAMPAIGN_ACTS, ACT5_PREVIEW } = await import(${JSON.stringify(u('src/data/levels.js'))});
    const { CAMPAIGN_LEVELS } = await import(${JSON.stringify(u('src/data/campaign.js'))});
    const { BESTIARY } = await import(${JSON.stringify(u('src/data/journal.js'))});
    const R = await import(${JSON.stringify(u('src/data/rush.js'))});
    const E = await import(${JSON.stringify(u('src/data/endless.js'))});
    console.log(JSON.stringify({ flag: ACT5_PREVIEW, acts: ACT_IDS, endless: ENDLESS_ACTS, campaign: CAMPAIGN_ACTS, levels: CAMPAIGN_LEVELS, best: BESTIARY.length, spire: BESTIARY.filter((b) => ['kite','chime','gargoyle','hanger'].includes(b.id)).length, lap: R.LAP, cycle: E.CYCLE }));`;
  const env = { ...process.env };
  delete env.ECHOES_ACT5;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env, encoding: 'utf8' });
  let o = null;
  try { o = JSON.parse(r.stdout.trim().split('\n').pop()); } catch { o = null; }
  // Slice 3 (docs/ACT_V_BOSSES.md) opened Level V for everyone: the flag no
  // longer changes anything.
  check(!!o && o.acts.join() === '1,2,3,4,5' && o.levels.join() === '1,2,3,4,5' && o.campaign === 5, `without the flag the campaign has five acts too (${o ? o.acts.join(', ') : r.stderr.slice(0, 200)})`);
  check(!!o && o.endless.join() === '1,2,3,4,5' && o.cycle === 5 && o.lap === 5, `without the flag Endless cycles five and Boss Rush laps five (${o ? `${o.cycle}, ${o.lap}` : '-'})`);
  check(!!o && o.spire === 4 && o.best === 51, `without the flag the Journal holds the Spire rows (${o ? o.best : '-'} entries)`);
}

// ---------------------------------------------------------------- 1. wiring --
{
  check(CAMPAIGN_ACTS === 5 && ACT_IDS.join() === '1,2,3,4,5' && CAMPAIGN_LEVELS.join() === '1,2,3,4,5', `the campaign runs five levels (${ACT_IDS.join(', ')}; CAMPAIGN_ACTS ${CAMPAIGN_ACTS})`);
  check(nextLevel(4) === 5 && nextLevel(5) === null, 'Level V follows the Hollow Heart and is the final level');
  const lv = LEVELS[5];
  check(lv && lv.name === 'The Still Spire' && lv.biome === 'spire' && lv.unlock && lv.unlock.afterVictory === 4, 'Level V is the Still Spire in the spire biome, unlocked by clearing Level IV');
  const lays = [29, 30, 31, 32, 33, 34].map((id) => LAYOUTS[id]);
  check(lays.every((l) => l && l.act === 5 && l.biome === 'spire') && lv.bossLayout === 32 && LAYOUTS[34].arena === true, `six spire layouts (${lays.map((l) => l && l.name).join(', ')}), the boss in the Belfry Crown, the arena Windward Court`);
  check(lays.filter((l) => (l.hazards || []).some((h) => h.type === 'gust')).length >= 5, 'gust vents in at least five spire layouts');
  check(['kite', 'chime', 'gargoyle', 'hanger'].every((k) => lv.roster[k] > 0), 'the Spire roster holds the four new enemies');
  let up = true;
  for (let r = 1; r <= 6; r++) for (const k of ['hpMul', 'dmgMul', 'budget']) if (!(difficulty(5, r)[k] >= difficulty(4, r)[k])) up = false;
  check(up, `Act V numbers sit at or above Act IV's in every room (room 6 hp ${difficulty(4, 6).hpMul} -> ${difficulty(5, 6).hpMul})`);
  check(ENDLESS_ACTS.join() === '1,2,3,4,5' && E.CYCLE === 5 && E.levelOfDepth(5) === 5 && E.endlessNextLevel(5) === 1, `the Endless Descent cycles five biomes under the flag (cycle ${E.CYCLE})`);
  check(RUSH.LAP === 5, `Boss Rush laps all five acts (${RUSH.LAP})`);
  check(['kite', 'chime', 'gargoyle', 'hanger'].every((k) => BESTIARY.some((b) => b.id === k)) && new Set(BESTIARY.map((b) => b.id)).size === BESTIARY.length, `the Journal adds four Spire rows, no duplicates (${BESTIARY.length} entries)`);
  check(affixCountFor({ act: 5, room: 2 }) >= 2, `Level V elites carry at least two powers (${affixCountFor({ act: 5, room: 2 })})`);
}

// ----------------------------------------------------------------- 2. kite --
{
  const W = spireRoom(3);
  parkParty(W, 0, 3, 3.5);
  const k = spawn(W, 'kite', 0, -2);
  let tel = null;
  for (let i = 0; i < 900 && !tel; i++) {
    W.step();
    mend(W);
    parkParty(W, 0, 3, 3.5);
    if (k.telegraph && k.telegraph.lance) tel = { ...k.telegraph };
  }
  check(!!tel && tel.kind === 'lane' && tel.playerTargeted, `the kite marks a dive lane (${tel ? `${tel.length.toFixed(1)} u, ${tel.resolveTick - tel.startTick} ticks` : 'none'})`);
  let land = null;
  for (let i = 0; i < 300 && !land; i++) {
    const p = player(W);
    if (k.telegraph) {
      p.x = p.px = k.telegraph.fromX + k.telegraph.dirX * Math.min(3, k.telegraph.length - 0.5);
      p.z = p.pz = k.telegraph.fromZ + k.telegraph.dirZ * Math.min(3, k.telegraph.length - 0.5);
    }
    W.step();
    mend(W);
    land = W.log.find((e) => e.type === 'kite_land' && e.id === k.id);
  }
  check(!!land && land.hits >= 1 && k.mode === 'grounded' && k.flier === false, `it dives, hits and lands grounded (${land ? land.hits : 0} hit)`);
  // Twin worlds from the grounded moment, one keeping the x1.5 and one not,
  // each landing the same debug hit (same crit roll) on the kite.
  const tree = clonePlain(W.io.capture());
  const dealt = (keep) => {
    const X = makeWorld(3);
    X.io.apply(clonePlain(tree));
    const kk = X.registry.byId(k.id);
    if (!keep) delete kk.takenMul;
    kk.kind = 'dummy'; // hitOnce takes dummies only; the factor rides the body
    const hp = kk.hp;
    X.world.cmd('hitOnce', kk.id);
    return hp - kk.hp;
  };
  const withMul = dealt(true);
  const without = dealt(false);
  check(k.takenMul === 1.5 && without > 0 && Math.abs(withMul / without - 1.5) < 0.05, `grounded it takes x1.5 (${without.toFixed(1)} -> ${withMul.toFixed(1)} over the same hits)`);
  steps(W, 100);
  check(W.log.some((e) => e.type === 'kite_rise' && e.id === k.id) && k.takenMul === undefined, 'then it rises and the punish window closes');
}

// ---------------------------------------------------------------- 3. chime --
{
  const W = spireRoom(4);
  parkParty(W, 0, 1.0, 0.7);
  const c = spawn(W, 'chime', 0, -0.5);
  let toll = null;
  for (let i = 0; i < 900 && !toll; i++) {
    W.step();
    mend(W);
    parkParty(W, 0, 1.0, 0.7);
    toll = W.log.find((e) => e.type === 'chime_toll' && e.id === c.id);
  }
  const slowed = party(W).filter((p) => speedMul(p, W.clock.tick) < 1).length;
  check(!!toll && toll.victims >= 1 && slowed >= 1, `the chime tolls a ring that hurts and slows (${toll ? toll.victims : 0} caught, ${slowed} slowed)`);
  W.log.length = 0;
  let choked = false;
  let stunned = false;
  for (let i = 0; i < 900 && !choked; i++) {
    W.step();
    mend(W);
    parkParty(W, 0, 1.0, 0.7);
    if (c.telegraph && !stunned) {
      W.world.cmd('clearStatus', c.id);
      if (c.status) delete c.status.stunImmune;
      W.world.cmd('setStatus', c.id, 'stun', 1, 60);
      stunned = true;
    }
    choked = W.log.some((e) => e.type === 'chime_choke' && e.id === c.id);
  }
  check(choked && !W.log.some((e) => e.type === 'chime_toll' && e.id === c.id), 'a stun mid-toll chokes the bell');
}

// ------------------------------------------------------------- 4. gargoyle --
{
  const W = spireRoom(5);
  parkParty(W, 0, 5, 0.9);
  const g = spawn(W, 'gargoyle', 0, -3);
  const x0 = g.x, z0 = g.z;
  steps(W, 120);
  check(g.mode === 'stone' && Math.hypot(g.x - x0, g.z - z0) < 0.05 && !g.telegraph, 'the gargoyle sits as stone while no hero is near');
  W.registry.all().filter((e) => e.kind === 'ally').forEach((a) => { a.x = a.px = 8; a.z = a.pz = 5; });
  let wake = null;
  for (let i = 0; i < 300 && !wake; i++) {
    const p = player(W);
    p.x = p.px = 0;
    p.z = p.pz = -1.6;
    W.step();
    mend(W);
    wake = W.log.find((e) => e.type === 'gargoyle_wake' && e.id === g.id);
  }
  const crack = W.log.find((e) => e.type === 'gargoyle_crack' && e.id === g.id);
  check(!!crack && !!wake && wake.tick - crack.tick >= 40 && g.mode === 'stalk', `a hero walking up cracks it, and it bursts free ${wake ? wake.tick - crack.tick : '-'} ticks later (${wake ? wake.victims : 0} caught)`);
  let slam = null;
  for (let i = 0; i < 900 && !slam; i++) {
    W.step();
    mend(W);
    slam = W.log.find((e) => e.type === 'gargoyle_slam' && e.id === g.id);
  }
  check(!!slam, `awake it slams (${slam ? `r ${slam.radius}, ${slam.victims} caught` : 'none'})`);
  // Everyone leaves: it settles back into stone.
  let settle = null;
  for (let i = 0; i < 900 && !settle; i++) {
    for (const p of party(W)) { p.x = p.px = 8.5; p.z = p.pz = 5; }
    if (g.x > 2) { g.x = g.px = -3; g.z = g.pz = -3; }
    W.step();
    mend(W);
    settle = W.log.find((e) => e.type === 'gargoyle_settle' && e.id === g.id);
  }
  check(!!settle && g.mode === 'stone' && g.kbScale === 0, 'left alone it settles back into stone');
}

// --------------------------------------------------------------- 5. hanger --
{
  const W = spireRoom(6);
  parkParty(W, 0, 3, 3.5);
  const h = spawn(W, 'hanger', 0, -3);
  let tel = null;
  for (let i = 0; i < 900 && !tel; i++) {
    W.step();
    mend(W);
    parkParty(W, 0, 3, 3.5);
    if (h.telegraph && h.telegraph.lance) tel = { ...h.telegraph };
  }
  check(!!tel && tel.kind === 'lane' && tel.width > 1 && tel.playerTargeted, `the hanger grips and marks a swing lane (${tel ? `${tel.length.toFixed(1)} u` : 'none'})`);
  let land = null;
  let thrownFrom = null;
  for (let i = 0; i < 300 && !land; i++) {
    const p = player(W);
    if (h.telegraph) {
      p.x = p.px = h.telegraph.fromX + h.telegraph.dirX * 3 + h.telegraph.dirZ * 0.15;
      p.z = p.pz = h.telegraph.fromZ + h.telegraph.dirZ * 3 - h.telegraph.dirX * 0.15;
      thrownFrom = { ...h.telegraph };
    }
    W.step();
    mend(W);
    land = W.log.find((e) => e.type === 'hanger_land' && e.id === h.id);
  }
  steps(W, 20);
  const p = player(W);
  check(!!land && land.hits >= 1, `it swings down the lane and hits (${land ? land.hits : 0} hit)`);
  check(!!thrownFrom && !inLaneOf(thrownFrom, p), 'the hero it hits is thrown out of the lane');
}

// ------------------------------------------------------------ 6. gust vent --
{
  const W = spireRoom(7);
  W.world.cmd('setLayout', 29);
  clearRoom(W);
  const vents = W.registry.all().filter((e) => e.kind === 'hazard' && e.htype === 'gust');
  check(vents.length === 2, `the Bell Stair has two gust vents (${vents.length})`);
  const v = vents[0];
  W.log.length = 0;
  W.world.cmd('hazardPhase', v.id, 'telegraph');
  let tel = null;
  let res = null;
  let start = null;
  const allyAway = () => W.registry.all().filter((e) => e.kind === 'ally').forEach((a) => { a.x = a.px = 3; a.z = a.pz = 2 + a.partyIndex * 0.6; });
  for (let i = 0; i < 200 && !res; i++) {
    const p = player(W);
    if (!res) {
      p.x = p.px = v.lane.x0 + (v.lane.x1 - v.lane.x0) * 0.25;
      p.z = p.pz = v.lane.z0 + (v.lane.z1 - v.lane.z0) * 0.25;
    }
    allyAway();
    W.world.cmd('killAllEnemies');
    W.step();
    tel = tel || W.log.find((e) => e.type === 'hazard_telegraph' && e.id === v.id);
    res = W.log.find((e) => e.type === 'hazard_resolve' && e.id === v.id && e.gust);
    if (res) start = { x: player(W).x, z: player(W).z };
  }
  check(!!tel && !!res && res.telegraphTicks >= HAZARD_TYPES.gust.telegraphTicks - 1 && res.caught >= 1, `the vent telegraphs ${res ? res.telegraphTicks : '-'} ticks, then gusts (${res ? res.caught : 0} caught)`);
  for (let i = 0; i < HAZARD_TYPES.gust.gustTicks + 4; i++) {
    allyAway();
    W.world.cmd('killAllEnemies');
    W.step();
  }
  const p = player(W);
  const moved = start ? (p.x - start.x) * v.dirX + (p.z - start.z) * v.dirZ : 0;
  check(moved > 1.5, `the gust carries the hero ${moved.toFixed(2)} u down the lane`);
  check(W.log.some((e) => e.type === 'gust_calm' && e.id === v.id) && v.phase === 'idle', 'then the vent calms');
}

// ------------------------------------------------------------- 7. governor --
{
  const W = spireRoom(8);
  parkParty(W, 0, 2.5);
  for (const [k, x, z] of [['kite', -4, -3], ['kite', 4, -3], ['hanger', 0, -4.5], ['chime', -1.5, 0.8], ['gargoyle', 1.5, 1.2]]) spawn(W, k, x, z);
  let live = 0;
  let maxLive = 0;
  const starts = [];
  W.bus.on('telegraph_start', (e) => {
    if (!e.playerTargeted) return;
    live += 1;
    maxLive = Math.max(maxLive, live);
    starts.push(e.tick);
  });
  const end = (e) => { if (e.playerTargeted) live = Math.max(0, live - 1); };
  W.bus.on('telegraph_resolve', end);
  W.bus.on('telegraph_cancel', end);
  for (let i = 0; i < 1800; i++) {
    W.step();
    mend(W);
  }
  const gaps = starts.slice(1).map((t, i) => t - starts[i]);
  check(starts.length >= 4 && maxLive <= 2 && gaps.every((g) => g >= 72), `governor: ${starts.length} telegraphs, at most ${maxLive} live, starts >= 72 ticks apart (min gap ${Math.min(...gaps)})`);
}

// ------------------------------------------------------------- 8. AI lanes --
{
  let atStart = 0;
  let atFire = 0;
  let tries = 0;
  for (const seed of [9, 10, 11, 12]) {
    const W = spireRoom(seed);
    W.run.cmd('autopilot', false);
    const p = player(W);
    p.x = p.px = 5;
    p.z = p.pz = 5;
    const h = spawn(W, 'hanger', 0, -4);
    for (const a of W.registry.all().filter((e) => e.kind === 'ally')) {
      a.x = a.px = 0.05 * (a.partyIndex - 2);
      a.z = a.pz = -0.2 + 0.9 * (a.partyIndex - 1);
    }
    let rec = null;
    for (let i = 0; i < 900; i++) {
      W.step();
      mend(W);
      p.x = p.px = 5;
      p.z = p.pz = 5;
      if (!rec && h.telegraph && h.telegraph.lance) {
        rec = { ...h.telegraph };
        atStart += W.registry.all().filter((e) => e.kind === 'ally' && inLaneOf(rec, e)).length;
        tries += 1;
      }
      if (rec && !h.telegraph) break;
      if (rec && h.telegraph && W.clock.tick === rec.resolveTick - 1) atFire += W.registry.all().filter((e) => e.kind === 'ally' && inLaneOf(rec, e)).length;
    }
  }
  check(tries >= 3 && atStart > 0 && atFire <= Math.floor(atStart / 3), `AI seats leave a swing lane before it fires (${atStart} in the lanes at the start, ${atFire} when they fire, ${tries} swings)`);
}

// -------------------------------------------------------- 9. Level V runs --
{
  const kinds = new Set();
  for (const seed of [1, 2, 3, 4]) {
    const W = makeWorld(seed);
    W.bus.on('enemy_spawn', (e) => kinds.add(e.etype ?? e.kind));
    W.run.startCampaign({ level: 5, harness: true });
    for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
    const lay = W.run.view().layout?.layoutId;
    check(lay >= 29 && lay <= 34 && lay !== 32, `seed ${seed}: Level V room 1 is a spire layout (${lay})`);
    for (let w = 0; w < 6; w++) {
      W.world.cmd('startWave');
      steps(W, 90);
    }
    for (const e of W.registry.all()) if (e.faction === 'hostile') kinds.add(e.kind);
  }
  const fresh = ['kite', 'chime', 'gargoyle', 'hanger'].filter((k) => kinds.has(k));
  check(fresh.length >= 2, `Level V room 1 waves roll Act V creatures (${[...kinds].join(', ')})`);
  const W = makeWorld(5);
  W.run.startCampaign({ level: 5, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  W.world.cmd('skipToRoom', 8);
  for (let i = 0; i < 600 && W.run.view().phase !== 'combat'; i++) W.step();
  steps(W, 60);
  const v = W.run.view();
  const boss = v.actBoss && v.actBoss.kind;
  check(!!boss && v.layout?.layoutId === 32, `the Belfry Crown holds ${boss} (layout ${v.layout?.layoutId})`);
  W.run.cmd('killBoss');
  let won = null;
  for (let i = 0; i < 4000 && !won; i++) {
    W.world.cmd('killAllEnemies');
    mend(W);
    W.step();
    won = W.log.find((e) => e.type === 'level_clear' && e.level === 5);
  }
  for (let i = 0; i < 3000 && W.run.view().phase !== 'victory'; i++) W.step();
  check(!!won && won.final === true && W.run.view().phase === 'victory', `clearing Level V ends the campaign in victory (final ${won ? won.final : '-'}, phase ${W.run.view().phase})`);
  // Level IV is no longer final; the Daily runs on to Level V too.
  const X = makeWorld(6);
  X.run.startCampaign({ level: 4, harness: true });
  for (let i = 0; i < 4000 && X.run.view().phase !== 'combat'; i++) X.step();
  X.world.cmd('skipToRoom', 8);
  for (let i = 0; i < 600 && X.run.view().phase !== 'combat'; i++) X.step();
  steps(X, 30);
  X.run.cmd('killBoss');
  let c4 = null;
  for (let i = 0; i < 4000 && !c4; i++) {
    X.world.cmd('killAllEnemies');
    mend(X);
    X.step();
    c4 = X.log.find((e) => e.type === 'level_clear' && e.level === 4);
  }
  check(!!c4 && c4.final === false, `under the flag clearing Level IV leads on to the Spire (final ${c4 ? c4.final : '-'})`);
  const D = makeWorld(7);
  const dc = runThrough(D, { daily: { key: '2026-10-11', practice: true } });
  check(dc.length === 5 && dc[4].final === true && dc[4].level === 5, `the Daily runs all five levels (${dc.map((c) => `${c.level}${c.final ? '!' : ''}`).join(' ')})`);
}

// ---------------------------------------------------- 10. saves and co-op --
{
  const W = spireRoom(12);
  parkParty(W, 0, 4);
  for (const [k, x, z] of [['kite', -3, -3], ['chime', 3, -4], ['gargoyle', 0, 1.5], ['hanger', -2, -5]]) spawn(W, k, x, z);
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
  check(a.ok && b.ok && a.hs === b.hs, 'a capture mid-fight with all four enemies continues bit-identically in fresh worlds');
  const ents = W.registry.all().filter((e) => ['kite', 'chime', 'gargoyle', 'hanger'].includes(e.kind));
  const round = ents.map((e) => viewEntity(JSON.parse(JSON.stringify(quantizeEntity(e)))));
  check(ents.length >= 3 && round.every((r, i) => r && r.kind === ents[i].kind), `the co-op snapshot keeps their kinds (${round.map((r) => r && r.kind).join(', ')})`);
}

console.log(`\n${passes.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
