#!/usr/bin/env node
// ACT IV probe (docs/ACT_IV.md) — headless Node, the sim built like
// src/main.js.
//
//   node tools/act4-probe.mjs
//
// Checks:
//   1. Wiring: four campaign levels, Level IV after the Barrow and final,
//      layouts 16-20 in the heart biome, the Endless cycle of four, Act IV
//      numbers above Act III's, two elite powers on Level IV.
//   2. Hollow Husk: the room's husks surge together on the heartbeat, run
//      faster in the surge, and bite.
//   3. Vein Lancer: a lane telegraph (flagged lance), then a lance that hits
//      a body standing in it.
//   4. Geode Brute: a ring slam, then three crystal shards that leave
//      crystal slicks.
//   5. Heart Censer: gathers, then mends a wounded kin; a stun mid-gather
//      spills it.
//   6. Governor: five Act IV attackers keep at most two player-targeted
//      telegraphs live, starts >= 72 ticks apart.
//   7. AI: allies standing in a lance lane step out before it fires.
//   8. Level IV campaign: its rooms roll Act IV creatures, its boss room
//      holds the Wyrm or the Lich Ram in the Heart Chamber, and clearing it
//      wins the campaign.
//   9. Saves and co-op: a world mid-fight with all four enemies continues
//      bit-identically after a capture round trip; the snapshot quantiser
//      keeps their kinds.
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
const { HEARTBEAT } = await import(u('src/sim/enemies/husk.js'));

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
// A live Level IV room with the room's own enemies gone and waves held.
function heartRoom(seed = 3) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level: 4, harness: true });
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

// ---------------------------------------------------------------- 1. wiring --
{
  check(CAMPAIGN_ACTS === 4 && ACT_IDS.join() === '1,2,3,4' && CAMPAIGN_LEVELS.length === 4, `the campaign is four levels (${ACT_IDS.join(', ')})`);
  check(nextLevel(3) === 4 && nextLevel(4) === null, 'Level IV follows the Barrow and is the final level');
  const lv = LEVELS[4];
  check(lv && lv.name === 'The Hollow Heart' && lv.biome === 'heart' && lv.unlock && lv.unlock.afterVictory === 3, `Level IV is the Hollow Heart in the heart biome, unlocked by clearing Level III`);
  const lays = [16, 17, 18, 19, 20].map((id) => LAYOUTS[id]);
  check(lays.every((l) => l && l.act === 4 && l.biome === 'heart') && lv.bossLayout === 18, `five heart layouts (${lays.map((l) => l && l.name).join(', ')}), the boss in the Heart Chamber`);
  check(['husk', 'lancer', 'geode', 'censer'].every((k) => lv.roster[k] > 0), 'the Heart roster holds the four new enemies');
  let up = true;
  for (let r = 1; r <= 6; r++) for (const k of ['hpMul', 'dmgMul', 'budget']) if (!(difficulty(4, r)[k] >= difficulty(3, r)[k])) up = false;
  check(up, `Act IV numbers sit at or above Act III's in every room (room 6 hp ${difficulty(3, 6).hpMul} -> ${difficulty(4, 6).hpMul})`);
  check(E.CYCLE === 4 && ENDLESS_ACTS.join() === '1,2,3,4' && E.levelOfDepth(4) === 4 && E.levelOfDepth(8) === 4 && E.endlessNextLevel(4) === 1, 'the Endless Descent cycles four biomes, the Heart every fourth depth');
  check(affixCountFor({ act: 4, room: 2 }) === 2, `Level IV elites carry two powers (${affixCountFor({ act: 4, room: 2 })})`);
}

// ----------------------------------------------------------------- 2. husk --
{
  const W = heartRoom(3);
  parkParty(W, 0, 5);
  const hs = [spawn(W, 'husk', -3, -4), spawn(W, 'husk', 0, -4.5), spawn(W, 'husk', 3, -4)];
  // Wait for a surge boundary, then compare a stalk step with a surge step.
  const speedOver = (e, n) => {
    const x0 = e.x, z0 = e.z;
    steps(W, n);
    return Math.hypot(e.x - x0, e.z - z0) / n;
  };
  let guard = 0;
  while ((W.clock.tick % HEARTBEAT.period) !== HEARTBEAT.surge + 4 && guard++ < 400) W.step();
  parkParty(W, 0, 5);
  const stalk = speedOver(hs[1], 20);
  while ((W.clock.tick % HEARTBEAT.period) !== 2 && guard++ < 800) W.step();
  parkParty(W, 0, 5);
  const surge = speedOver(hs[1], 20);
  const surges = W.log.filter((e) => e.type === 'husk_surge');
  const ticks = new Set(surges.map((e) => e.tick));
  check(surges.length >= 3 && ticks.size === Math.ceil(surges.length / 3), `the room's husks surge together on the beat (${surges.length} surges on ${ticks.size} ticks)`);
  check(surge > stalk * 1.6, `a surging husk runs faster (${stalk.toFixed(3)} -> ${surge.toFixed(3)} u/tick)`);
  mend(W);
  steps(W, 400);
  const bites = W.log.filter((e) => e.type === 'enemy_bite' && hs.some((h) => h.id === e.id));
  check(bites.length > 0, `husks bite the party (${bites.length} bites)`);
}

// --------------------------------------------------------------- 3. lancer --
{
  const W = heartRoom(4);
  parkParty(W, 0, 3, 3.5);
  const l = spawn(W, 'lancer', 0, -2);
  let tel = null;
  for (let i = 0; i < 900 && !tel; i++) {
    W.step();
    parkParty(W, 0, 3, 3.5);
    if (l.telegraph && l.telegraph.lance) tel = { ...l.telegraph };
  }
  check(!!tel && tel.kind === 'lane' && tel.playerTargeted && tel.length > 3, `the lancer charges a lane telegraph (${tel ? `${tel.kind}, ${tel.length.toFixed(1)} u, ${tel.resolveTick - W.clock.tick} ticks` : 'none'})`);
  // Pin the player into the lane and hold everyone still until it fires.
  let lance = null;
  for (let i = 0; i < 200 && !lance; i++) {
    const p = W.registry.all().find((e) => e.kind === 'player');
    if (l.telegraph) {
      p.x = p.px = l.telegraph.fromX + l.telegraph.dirX * 3;
      p.z = p.pz = l.telegraph.fromZ + l.telegraph.dirZ * 3;
    }
    W.step();
    lance = W.log.find((e) => e.type === 'lancer_lance');
  }
  const hits = W.log.filter((e) => e.type === 'hit' && e.attacker === l.id && e.shape === 'lane');
  check(!!lance && lance.victims >= 1 && hits.length >= 1, `the lance fires down the lane and hits the body in it (${lance ? lance.victims : 0} victims)`);
}

// ---------------------------------------------------------------- 4. geode --
{
  const W = heartRoom(5);
  parkParty(W, 0, 1.5);
  const g = spawn(W, 'geode', 0, -0.5);
  let slam = null;
  for (let i = 0; i < 900 && !slam; i++) {
    W.step();
    mend(W);
    slam = W.log.find((e) => e.type === 'geode_slam');
  }
  check(!!slam, `the geode slams a ring (${slam ? `r ${slam.radius}, ${slam.victims} caught` : 'none'})`);
  steps(W, 90);
  const shards = W.log.filter((e) => e.type === 'enemy_glob_land' && e.shard);
  const slicks = W.log.filter((e) => e.type === 'slick_spawn' && e.variant === 'crystal');
  check(shards.length === 3 && slicks.length === 3, `three crystal shards land and leave crystal slicks (${shards.length} shards, ${slicks.length} slicks)`);
  check(g.kbScale !== undefined || g.hp > 0, 'the brute stands (heavy body)');
}

// --------------------------------------------------------------- 5. censer --
{
  const W = heartRoom(6);
  parkParty(W, 0, 5.5);
  const h = spawn(W, 'husk', -1, -4);
  const c = spawn(W, 'censer', -1, -5.5);
  h.hp = Math.round(h.maxHp * 0.4);
  // Hold the husk beside the censer (it would run off to the party).
  const pin = () => {
    h.x = h.px = -1;
    h.z = h.pz = -4;
  };
  let mendEv = null;
  for (let i = 0; i < 900 && !mendEv; i++) {
    W.step();
    parkParty(W, 0, 5.5);
    pin();
    mend(W);
    mendEv = W.log.find((e) => e.type === 'censer_mend');
  }
  const gather = W.log.find((e) => e.type === 'censer_gather');
  check(!!gather && !!mendEv && mendEv.tick - gather.tick >= 40, `the censer gathers, then mends (${gather ? gather.tick : '-'} -> ${mendEv ? mendEv.tick : '-'})`);
  const got = mendEv ? mendEv.healed.find((x) => x.id === h.id) : null;
  check(!!got && got.amount > 0, `a wounded husk is mended (+${got ? got.amount : 0} of ${h.maxHp})`);
  // A stun mid-gather spills the mend.
  W.log.length = 0;
  let spilled = false;
  let stunRec = null;
  for (let i = 0; i < 900 && !spilled; i++) {
    W.step();
    parkParty(W, 0, 5.5);
    pin();
    mend(W);
    h.hp = Math.round(h.maxHp * 0.4);
    if (c.mode === 'gather' && !stunRec) {
      W.world.cmd('clearStatus', c.id);
      if (c.status) delete c.status.stunImmune;
      stunRec = W.world.cmd('setStatus', c.id, 'stun', 1, 60);
    }
    spilled = W.log.some((e) => e.type === 'censer_spill');
  }
  check(spilled && !W.log.some((e) => e.type === 'censer_mend'), `a stun mid-gather spills the mend (stunned at ${stunRec ? stunRec.at : '-'})`);
}

// ------------------------------------------------------------- 6. governor --
{
  const W = heartRoom(7);
  parkParty(W, 0, 3.5);
  for (const [k, x, z] of [['lancer', -4, -3], ['lancer', 4, -3], ['lancer', 0, -5], ['geode', -1.5, 1], ['geode', 1.5, 1]]) spawn(W, k, x, z);
  let live = 0;
  let maxLive = 0;
  const starts = [];
  W.bus.on('telegraph_start', (e) => {
    if (!e.playerTargeted) return;
    live += 1;
    maxLive = Math.max(maxLive, live);
    starts.push(e.tick);
  });
  W.bus.on('telegraph_resolve', (e) => {
    if (e.playerTargeted) live = Math.max(0, live - 1);
  });
  for (let i = 0; i < 1800; i++) {
    W.step();
    mend(W);
  }
  const gaps = starts.slice(1).map((t, i) => t - starts[i]);
  check(starts.length >= 4 && maxLive <= 2 && gaps.every((g) => g >= 72), `governor: ${starts.length} telegraphs, at most ${maxLive} live, starts >= 72 ticks apart (min gap ${Math.min(...gaps)})`);
}

// ------------------------------------------------------------- 7. AI lanes --
{
  // The lancer aims at the nearest party body; allies parked in a column in
  // front of it. Count allies inside the lane when it starts and when it fires.
  let atStart = 0;
  let atFire = 0;
  let tries = 0;
  for (const seed of [8, 9, 10, 11]) {
    const W = heartRoom(seed);
    W.run.cmd('autopilot', false);
    const p = W.registry.all().find((e) => e.kind === 'player');
    p.x = p.px = 5;
    p.z = p.pz = 5;
    const l = spawn(W, 'lancer', 0, -4);
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
      if (!rec && l.telegraph && l.telegraph.lance) {
        rec = { ...l.telegraph };
        atStart += W.registry.all().filter((e) => e.kind === 'ally' && inLaneOf(rec, e)).length;
        tries += 1;
      }
      if (rec && l.telegraph === null) break;
      if (rec && l.telegraph && W.clock.tick === rec.resolveTick - 1) atFire += W.registry.all().filter((e) => e.kind === 'ally' && inLaneOf(rec, e)).length;
    }
  }
  check(tries >= 3 && atStart > 0 && atFire <= Math.floor(atStart / 3), `AI seats leave a lance lane before it fires (${atStart} in the lanes at the start, ${atFire} when they fire, ${tries} lances)`);
}
function inLaneOf(t, p) {
  const px = p.x - t.fromX;
  const pz = p.z - t.fromZ;
  const along = px * t.dirX + pz * t.dirZ;
  const r = p.radius ?? 0;
  if (along < -r || along > t.length + r) return false;
  return Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + r;
}

// ------------------------------------------------------- 8. Level IV runs --
{
  // Rooms roll Act IV creatures (force waves out in room 1 of a few seeds).
  const kinds = new Set();
  for (const seed of [1, 2, 3, 4]) {
    const W = makeWorld(seed);
    W.bus.on('enemy_spawn', (e) => kinds.add(e.etype ?? e.kind));
    W.run.startCampaign({ level: 4, harness: true });
    for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
    const lay = W.run.view().layout?.layoutId;
    check(lay >= 16 && lay <= 20, `seed ${seed}: Level IV room 1 is a heart layout (${lay})`);
    for (let w = 0; w < 6; w++) {
      W.world.cmd('startWave');
      steps(W, 90);
    }
    for (const e of W.registry.all()) if (e.faction === 'hostile') kinds.add(e.kind);
  }
  const fresh = ['husk', 'lancer', 'geode', 'censer'].filter((k) => kinds.has(k));
  check(fresh.length >= 2, `Level IV room 1 waves roll Act IV creatures (${[...kinds].join(', ')})`);
  // The boss room and the campaign win.
  const W = makeWorld(5);
  W.run.startCampaign({ level: 4, harness: true });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  W.world.cmd('skipToRoom', 8);
  for (let i = 0; i < 600 && W.run.view().phase !== 'combat'; i++) W.step();
  steps(W, 60);
  const v = W.run.view();
  const boss = v.actBoss && v.actBoss.kind;
  check((boss === 'wyrm' || boss === 'lichram') && v.layout?.layoutId === 18, `the Heart Chamber holds ${boss} (layout ${v.layout?.layoutId})`);
  W.run.cmd('killBoss');
  let won = null;
  for (let i = 0; i < 4000 && !won; i++) {
    W.world.cmd('killAllEnemies');
    mend(W);
    W.step();
    won = W.log.find((e) => e.type === 'level_clear' && e.level === 4);
  }
  for (let i = 0; i < 3000 && W.run.view().phase !== 'victory'; i++) W.step();
  check(!!won && won.final === true && W.run.view().phase === 'victory', `clearing Level IV ends the campaign in victory (final ${won ? won.final : '-'}, phase ${W.run.view().phase})`);
}

// ----------------------------------------------------- 9. saves and co-op --
{
  const W = heartRoom(12);
  parkParty(W, 0, 4);
  for (const [k, x, z] of [['husk', -3, -3], ['lancer', 3, -4], ['geode', 0, -2], ['censer', -2, -5]]) spawn(W, k, x, z);
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
  const ents = W.registry.all().filter((e) => ['husk', 'lancer', 'geode', 'censer'].includes(e.kind));
  const round = ents.map((e) => viewEntity(JSON.parse(JSON.stringify(quantizeEntity(e)))));
  check(ents.length >= 3 && round.every((r, i) => r && r.kind === ents[i].kind), `the co-op snapshot keeps their kinds (${round.map((r) => r && r.kind).join(', ')})`);
}

console.log(`\n${passes.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
