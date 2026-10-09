#!/usr/bin/env node
// NEW ENEMIES, Wood and Mill probe (docs/WOOD_MILL_ENEMIES.md, content plan 3
// slice 3) — headless Node, the sim built like src/main.js.
//
//   node tools/woodmill-probe.mjs
//
// Checks:
//   1. Wiring: the four kinds have a kit, a threat cost, a VFX row, a journal
//      row (37 entries), and their affix exclusions.
//   2. Gate: campaign Level I rooms 3+ roll from a roster with the Shriek Owl
//      and the Vine Lasher, Level II rooms 3+ with the Mire Leech and the
//      Drowned Miller; rooms 1-2, the tutorial and the legacy single-level
//      run never; Endless has them at home and as guests past Depth 5.
//   3. Shriek Owl: a cone telegraph, then a shriek that hits and slows a hero
//      in the cone and misses one beside it.
//   4. Vine Lasher: a lane telegraph, then a lash that hits a hero in the lane
//      and yanks it toward the pod.
//   5. Mire Leech: a leap lane, a latch that drains the host and heals the
//      leech, shed by a hit; a second latch shed by a dodge.
//   6. Drowned Miller: the flail sweep ring hits a hero beside him; the sack
//      toss lands a sack glob that leaves a flour slick.
//   7. Governor: all four attacking keep at most two player-targeted
//      telegraphs live, starts >= 72 ticks apart.
//   8. Campaign rooms: Level I and II rooms 3-6 over several seeds actually
//      spawn the new kinds.
//   9. Saves and co-op: a capture mid-latch and mid-yank continues
//      bit-identically; the snapshot quantiser keeps their kinds.
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
const { THREAT } = await import(u('src/data/difficulty.js'));
const { LEVELS, campaignLevel } = await import(u('src/data/levels.js'));
const { ENEMY_VFX } = await import(u('src/data/vfx.js'));
const { BESTIARY } = await import(u('src/data/journal.js'));
const { ARCHETYPES } = await import(u('src/sim/enemies.js'));
const { AFFIXES } = await import(u('src/sim/affixes.js'));
const E = await import(u('src/data/endless.js'));
const { speedMul } = await import(u('src/sim/status.js'));

const WOOD = ['owl', 'lasher'];
const MILL = ['leech', 'miller'];
const NEW = [...WOOD, ...MILL];

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
const toCombat = (W) => {
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
};
// A live campaign room of `level`, its own enemies gone, waves held back by
// clearing every few ticks in the checks that need a quiet room.
function room(level, seed = 3, n = 3) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level, harness: true });
  toCombat(W);
  if (n > 1) {
    W.world.cmd('skipToRoom', n);
    toCombat(W);
  }
  steps(W, 30);
  clearRoom(W);
  return W;
}
function clearRoom(W) {
  W.world.cmd('killAllEnemies');
  W.registry.all().filter((e) => e.kind === 'eglob' || e.kind === 'slick' || e.kind === 'affix_core').forEach((e) => W.registry.despawn(e.id));
  // A defend room's Waystone is party faction: park it in a far corner so
  // the checks' enemies aim at the heroes.
  for (const ws of W.registry.all().filter((e) => e.kind === 'waystone')) {
    ws.x = ws.px = 6;
    ws.z = ws.pz = -6;
  }
  W.log.length = 0;
}
const player = (W) => W.registry.all().find((e) => e.kind === 'player');
const allies = (W) => W.registry.all().filter((e) => e.kind === 'ally');
// Put the player at (x, z) and the allies far off in a corner row.
function place(W, x, z) {
  const p = player(W);
  p.x = p.px = x;
  p.z = p.pz = z;
  for (const a of allies(W)) {
    a.x = a.px = -5.5 + a.partyIndex * 0.8;
    a.z = a.pz = 5.5;
  }
}
const party = (W) => W.registry.all().filter((e) => e.faction === 'party');
const mend = (W) => party(W).forEach((p) => (p.hp = p.maxHp));
const spawn = (W, kind, x, z, o = { hpMul: 30 }) => W.registry.byId(W.world.cmd('spawn', kind, x, z, o));
// Keep the room quiet: the wave director's own spawns are culled each step.
const cull = (W, keep) => W.registry.all().filter((e) => e.faction === 'hostile' && !keep.includes(e) && e.kind !== 'eglob' && e.kind !== 'eshot').forEach((e) => W.registry.despawn(e.id));

// ---------------------------------------------------------------- 1. wiring --
{
  check(NEW.every((k) => ARCHETYPES[k] && ARCHETYPES[k].id === k), `four new kits (${NEW.join(', ')})`);
  check(NEW.every((k) => THREAT[k] > 0), `threat costs (${NEW.map((k) => `${k} ${THREAT[k]}`).join(', ')})`);
  check(NEW.every((k) => ENEMY_VFX[k]), 'one ENEMY_VFX row each');
  const rows = NEW.map((k) => BESTIARY.find((b) => b.id === k));
  check(BESTIARY.length === 37 && rows.every((r) => r && r.lore && r.text && r.lands.length === 1), `journal rows (${BESTIARY.length} entries; lands ${rows.map((r) => r && r.lands.join()).join(', ')})`);
  check(rows.every((r) => !/ember/i.test(r.text)), 'journal text says warning ring / lane / cone, never Ember');
  check(AFFIXES.blinking.not.includes('leech') && AFFIXES.blinking.not.includes('lasher') && AFFIXES.frozen.not.includes('leech') && AFFIXES.vampiric.not.includes('leech'), 'affix exclusions: no Blinking leech or lasher, no Frozen or Vampiric leech');
}

// ------------------------------------------------------------------ 2. gate --
{
  check(NEW.every((k) => !(k in LEVELS[1].roster) && !(k in LEVELS[2].roster)), 'the bare level rows (legacy run, harness) hold none of the new kinds');
  const c1 = campaignLevel(LEVELS[1]);
  const c2 = campaignLevel(LEVELS[2]);
  check(WOOD.every((k) => c1.roster[k] > 0 && c1.introduce[k] === 3) && MILL.every((k) => c2.roster[k] > 0 && c2.introduce[k] === 3), 'campaign rows: owl and lasher in the Wood, leech and miller in the Mill, from room 3');
  const rosterOf = (W) => (W.run.roomPlan()?.roster ?? []).map((r) => r.etype);
  const r1 = room(1, 3, 2);
  const r1b = room(1, 3, 3);
  check(!rosterOf(r1).some((k) => NEW.includes(k)) && WOOD.every((k) => rosterOf(r1b).includes(k)), `Level I: room 2 roster has none, room 3 has owl and lasher (${rosterOf(r1b).join(', ')})`);
  const r2 = room(2, 4, 3);
  check(MILL.every((k) => rosterOf(r2).includes(k)) && !WOOD.some((k) => rosterOf(r2).includes(k)), `Level II room 3 roster has leech and miller (${rosterOf(r2).join(', ')})`);
  // The legacy single-level run never rolls them.
  const L = makeWorld(5);
  L.run.startRun({ act: 1 });
  toCombat(L);
  L.world.cmd('skipToRoom', 5);
  toCombat(L);
  const legacy = rosterOf(L);
  check(legacy.length > 0 && !legacy.some((k) => NEW.includes(k)), `the legacy run's room 5 roster has none (${legacy.join(', ')})`);
  // The tutorial never rolls them.
  const T = makeWorld(6);
  T.run.startCampaign({ tutorial: true, harness: true });
  toCombat(T);
  T.world.cmd('skipToRoom', 4);
  toCombat(T);
  const tut = rosterOf(T);
  check(!tut.some((k) => NEW.includes(k)), `the tutorial's room 4 roster has none (${tut.join(', ') || 'no plan'})`);
  // Endless: home at Depths 1 and 2, guests from Depth 5.
  const d1 = E.endlessLevel(1);
  const d2 = E.endlessLevel(2);
  const d7 = E.endlessLevel(7); // the Barrow, mixed
  check(WOOD.every((k) => d1.roster[k] > 0) && MILL.every((k) => d2.roster[k] > 0) && NEW.every((k) => d7.roster[k] > 0 && d7.introduce[k] === 4), 'Endless: home at Depths 1-2, guests (from room 4) past Depth 5');
  const En = makeWorld(7);
  En.run.startCampaign({ endless: true, harness: true });
  toCombat(En);
  En.world.cmd('skipToRoom', 3);
  toCombat(En);
  check(WOOD.every((k) => rosterOf(En).includes(k)), `a live Endless Depth 1 room 3 rolls them (${rosterOf(En).join(', ')})`);
}

// ------------------------------------------------------------ 3. shriek owl --
{
  const W = room(1, 11);
  W.run.cmd('autopilot', false);
  place(W, 0, 3);
  const o = spawn(W, 'owl', 0, -1);
  let tel = null;
  for (let i = 0; i < 900 && !tel; i++) {
    W.step();
    cull(W, [o]);
    mend(W);
    place(W, 0, 3);
    if (o.telegraph) tel = { ...o.telegraph };
  }
  check(!!tel && tel.kind === 'cone' && tel.playerTargeted && tel.halfAngleDeg === 30 && o.flier, `the owl hangs and marks a cone (${tel ? `r ${tel.radius}, ${tel.halfAngleDeg} deg, ${tel.resolveTick - tel.startTick} ticks` : 'none'})`);
  // The player stays in the cone; an ally stands beside it, outside.
  const a = allies(W)[0];
  let shriek = null;
  for (let i = 0; i < 200 && !shriek; i++) {
    const p = player(W);
    if (o.telegraph) {
      const t = o.telegraph;
      p.x = p.px = t.x + t.dirX * 2.5;
      p.z = p.pz = t.z + t.dirZ * 2.5;
      a.x = a.px = t.x + t.dirX * 2.5 - t.dirZ * 2.4;
      a.z = a.pz = t.z + t.dirZ * 2.5 + t.dirX * 2.4;
    }
    W.step();
    cull(W, [o]);
    shriek = W.log.find((e) => e.type === 'owl_shriek');
  }
  const hits = W.log.filter((e) => e.type === 'hit' && e.attacker === o.id);
  const p = player(W);
  check(!!shriek && hits.some((h) => h.target === p.id) && !hits.some((h) => h.target === a.id), `the shriek hits the hero in the cone, not the one beside it (${hits.length} hits)`);
  check(speedMul(p, W.clock.tick) < 0.7, `the shriek slows (speed x${speedMul(p, W.clock.tick).toFixed(2)})`);
}

// ----------------------------------------------------------- 4. vine lasher --
{
  const W = room(1, 12);
  W.run.cmd('autopilot', false);
  place(W, 0, 2.5);
  const l = spawn(W, 'lasher', 0, -1.5);
  let tel = null;
  for (let i = 0; i < 900 && !tel; i++) {
    W.step();
    cull(W, [l]);
    mend(W);
    place(W, 0, 2.5);
    if (l.telegraph) tel = { ...l.telegraph };
  }
  check(!!tel && tel.kind === 'lane' && tel.playerTargeted, `the lasher coils and marks a lane (${tel ? `${tel.length.toFixed(1)} u x ${tel.width}` : 'none'})`);
  let lash = null;
  let d0 = 0;
  for (let i = 0; i < 200 && !lash; i++) {
    const p = player(W);
    if (l.telegraph) {
      p.x = p.px = l.telegraph.fromX + l.telegraph.dirX * 3.6;
      p.z = p.pz = l.telegraph.fromZ + l.telegraph.dirZ * 3.6;
      d0 = Math.hypot(p.x - l.x, p.z - l.z);
    }
    W.step();
    cull(W, [l]);
    lash = W.log.find((e) => e.type === 'lasher_lash');
  }
  steps(W, 14);
  const p = player(W);
  const d1 = Math.hypot(p.x - l.x, p.z - l.z);
  const yank = W.log.find((e) => e.type === 'lasher_yank');
  check(!!lash && lash.victims >= 1 && W.log.some((e) => e.type === 'hit' && e.attacker === l.id && e.target === p.id), `the lash hits the hero in the lane (${lash ? lash.victims : 0} victims)`);
  check(!!yank && d0 - d1 > 1.2, `and yanks it toward the pod (${d0.toFixed(2)} -> ${d1.toFixed(2)} u)`);
}

// ------------------------------------------------------------ 5. mire leech --
{
  const W = room(2, 13);
  W.run.cmd('autopilot', false);
  place(W, 0, 2);
  const lc = spawn(W, 'leech', 0, -0.4);
  let latch = null;
  for (let i = 0; i < 900 && !latch; i++) {
    W.step();
    cull(W, [lc]);
    mend(W);
    if (lc.mode !== 'latched') place(W, 0, 2);
    latch = W.log.find((e) => e.type === 'leech_latch');
  }
  const leap = W.log.find((e) => e.type === 'leech_leap');
  const p = player(W);
  check(!!leap && !!latch && latch.host === p.id && lc.mode === 'latched', `the leech leaps (${leap ? leap.length : '-'} u) and latches on the hero`);
  // Drain: the host loses health, the wounded leech heals.
  lc.hp = lc.maxHp * 0.5;
  const hp0 = p.hp;
  const lhp0 = lc.hp;
  for (let i = 0; i < 70; i++) {
    W.step();
    cull(W, [lc]);
    if (lc.mode !== 'latched') break;
    // The leech rides on its host wherever the host goes.
    if (i === 20) {
      p.x = p.px = p.x + 1;
    }
  }
  const drains = W.log.filter((e) => e.type === 'leech_drain');
  const riding = Math.hypot(lc.x - p.x, lc.z - p.z) < 0.6;
  check(drains.length >= 2 && p.hp < hp0 && lc.hp > lhp0 && riding, `it rides its host and drains (${drains.length} drains, host ${hp0.toFixed(0)} -> ${p.hp.toFixed(0)}, leech ${lhp0.toFixed(1)} -> ${lc.hp.toFixed(1)})`);
  check(speedMul(p, W.clock.tick) < 0.9, `the host is slowed while it holds on (x${speedMul(p, W.clock.tick).toFixed(2)})`);
  // A hit knocks it off.
  W.world.cmd('damage', lc.id, 1);
  if (!W.log.some((e) => e.type === 'hit' && e.target === lc.id)) lc.lastHitTick = W.clock.tick;
  steps(W, 3);
  const shed = W.log.find((e) => e.type === 'leech_shed');
  check(!!shed && shed.cause === 'hit' && lc.mode === 'flop', `a hit shakes it off (${shed ? shed.cause : 'no shed'}, mode ${lc.mode})`);
  // A second latch, shed by a dodge.
  W.log.length = 0;
  let latch2 = null;
  for (let i = 0; i < 900 && !latch2; i++) {
    W.step();
    cull(W, [lc]);
    mend(W);
    if (lc.mode === 'creep' && !lc.telegraph) place(W, lc.x, Math.min(5, lc.z + 2));
    latch2 = W.log.find((e) => e.type === 'leech_latch');
  }
  if (latch2) player(W).iframeUntilTick = W.clock.tick + 6;
  steps(W, 3);
  const shed2 = W.log.find((e) => e.type === 'leech_shed');
  check(!!latch2 && !!shed2 && shed2.cause === 'dodge', `a dodge shakes it off too (${shed2 ? shed2.cause : 'no shed'}, latch ${!!latch2}, mode ${lc.mode})`);
}

// --------------------------------------------------------- 6. drowned miller --
{
  const W = room(2, 14);
  W.run.cmd('autopilot', false);
  place(W, 0, 0.4);
  const m = spawn(W, 'miller', 0, -0.9);
  let sweep = null;
  let tel = null;
  for (let i = 0; i < 900 && !sweep; i++) {
    W.step();
    cull(W, [m]);
    mend(W);
    place(W, m.x, m.z + 1.3);
    if (m.telegraph && !tel) tel = { ...m.telegraph };
    sweep = W.log.find((e) => e.type === 'miller_sweep');
  }
  check(!!tel && tel.kind === 'ring' && tel.radius === 2.2 && tel.resolveTick - tel.startTick === 60, `the miller whirls under a ring (${tel ? `r ${tel.radius}, ${tel.resolveTick - tel.startTick} ticks` : 'none'})`);
  check(!!sweep && sweep.victims >= 1, `the sweep lands on the hero beside him (${sweep ? sweep.victims : 0} victims)`);
  // At range: the sack toss.
  W.log.length = 0;
  m.x = m.px = 0;
  m.z = m.pz = -4;
  m.nextAttackTick = W.clock.tick + 5;
  m.nextSackTick = W.clock.tick + 5;
  let land = null;
  for (let i = 0; i < 900 && !land; i++) {
    place(W, m.x, m.z + 4.5);
    W.step();
    cull(W, [m]);
    mend(W);
    land = W.log.find((e) => e.type === 'enemy_glob_land' && e.sack);
  }
  const lob = W.log.find((e) => e.type === 'enemy_lob' && e.sack);
  const flour = W.log.find((e) => e.type === 'slick_spawn' && e.variant === 'flour');
  check(!!lob && !!land && !!flour, `the sack flies, lands in its ring and leaves a flour slick (${land ? `r ${land.radius}` : 'none'})`);
}

// ------------------------------------------------------------- 7. governor --
{
  const W = room(2, 15);
  place(W, 0, 2.5);
  const ks = [['owl', -3, -2], ['lasher', 3, -2], ['leech', -1, 0.4], ['miller', 1, 1.2], ['owl', 0, -3]].map(([k, x, z]) => spawn(W, k, x, z));
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
    cull(W, ks);
    mend(W);
  }
  const gaps = starts.slice(1).map((t, i) => t - starts[i]);
  check(starts.length >= 6 && maxLive <= 2 && gaps.every((g) => g >= 72), `governor: ${starts.length} telegraphs, at most ${maxLive} live, starts >= 72 ticks apart (min gap ${Math.min(...gaps)})`);
}

// ------------------------------------------------------- 8. campaign rooms --
{
  const seen = new Set();
  for (const level of [1, 2]) {
    for (const seed of [21, 22, 23, 24, 25, 26]) {
      const W = makeWorld(seed);
      W.bus.on('enemy_spawn', (e) => seen.add(e.etype));
      W.run.startCampaign({ level, harness: true });
      toCombat(W);
      for (const n of [3, 4, 5, 6]) {
        W.world.cmd('skipToRoom', n);
        toCombat(W);
        for (let w = 0; w < 4; w++) {
          W.world.cmd('startWave');
          steps(W, 70);
          mend(W);
        }
      }
    }
  }
  check(NEW.every((k) => seen.has(k)), `Level I and II rooms 3-6 spawn the new kinds (${NEW.filter((k) => seen.has(k)).join(', ')})`);
}

// ----------------------------------------------------- 9. saves and co-op --
{
  const W = room(2, 16);
  W.run.cmd('autopilot', false);
  place(W, 0, 2);
  const lc = spawn(W, 'leech', 0, -0.4);
  const ls = spawn(W, 'lasher', 3, -3);
  const ml = spawn(W, 'miller', -3, -2);
  const ow = spawn(W, 'owl', 2, 3);
  const keep = [lc, ls, ml, ow];
  let latched = false;
  for (let i = 0; i < 900 && !latched; i++) {
    W.step();
    cull(W, keep);
    mend(W);
    if (lc.mode !== 'latched') place(W, 0, 2);
    latched = lc.mode === 'latched';
  }
  steps(W, 10);
  const tree = clonePlain(W.io.capture());
  const cont = (seed) => {
    const X = makeWorld(seed);
    const ok = X.io.apply(clonePlain(tree)).ok;
    const hs = [];
    for (let i = 0; i < 8; i++) {
      steps(X, 45);
      hs.push(hashState(X.io.capture()));
    }
    return { ok, hs: hs.join() };
  };
  const a = cont(16);
  const b = cont(999);
  check(latched && a.ok && b.ok && a.hs === b.hs, 'a capture with a leech latched continues bit-identically in fresh worlds');
  const ents = W.registry.all().filter((e) => NEW.includes(e.kind));
  const round = ents.map((e) => viewEntity(JSON.parse(JSON.stringify(quantizeEntity(e)))));
  check(ents.length === 4 && round.every((r, i) => r && r.kind === ents[i].kind && r.mode === ents[i].mode), `the co-op snapshot keeps their kinds and modes (${round.map((r) => r && `${r.kind}:${r.mode}`).join(', ')})`);
}

console.log(`\n${passes.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
