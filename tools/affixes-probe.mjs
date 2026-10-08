#!/usr/bin/env node
// ELITE AFFIXES probe (docs/ELITE_AFFIXES.md), headless:
//
//   node tools/affixes-probe.mjs [--tune]
//
//   1. Where they roll: campaign elites carry powers (one on Level I, two on
//      Level III, two in Endless); the legacy single-level run, the tutorial
//      and the ?room= harness never roll one. Rolls replay by seed, respect
//      each power's excluded kinds and never pair Molten with Frozen.
//   2. Each of the eight, forced on an elite in a live campaign room, through
//      the real sim: Molten (core -> Ember ring -> burst -> burning pool),
//      Frozen (rooted wind-up under a ring, slowing frost patch), Vampiric
//      (heals off its hits), Warded (warn, then hit_immune, then hittable),
//      Blinking (marked spot, then it is there), Splitting (two smaller,
//      plain copies), Hasted (x1.4 the steps), Thorned (an AI melee seat that
//      hits it gets stung).
//   3. The §11 governor holds over affixed rooms: never more than two live
//      player-targeted telegraphs, starts at least 72 ticks apart.
//   4. The AI: a ranged and a melee seat step out of an affix burst ring; the
//      seats look past a Warded elite while its ward holds.
//   5. Co-op and saves: an affixed elite survives the snapshot quantiser and
//      a JSON round trip unchanged.
//   --tune   also plays autopilot campaigns (Levels 1-3, seeds 1-8) and
//            prints clears / downs per level.
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
const { AFFIX_IDS, AFFIXES, AFFIX_RULES, rollAffixes } = await import(u('src/sim/affixes.js'));
const { quantizeEntity, viewEntity } = await import(u('src/net/protocol/quantize.js'));
const { default: KNIGHT } = await import(u('src/sim/enemies/knight.js'));
const TUNE = process.argv.includes('--tune');

function makeWorld(seed, { harness = false, room = null } = {}) {
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
  const world = createWorld({ rng, registry, events: bus, harness, requestHitstop: clock.requestHitstop, room });
  const log = [];
  bus.on('*', (e) => {
    if (e.type.startsWith('affix_') || e.type === 'elite_affixes' || e.type === 'elite_spawn' || e.type === 'telegraph_start' || e.type === 'telegraph_resolve' || e.type === 'enemy_glob_land' || e.type === 'hit' || e.type === 'hit_immune' || e.type === 'slick_spawn') log.push(e);
  });
  const run = world.runSystem();
  const step = (snap = null) => clock.stepOnce((t) => world.step(t, snap ?? emptySnapshot()));
  return { world, registry, bus, clock, run, log, step };
}

const fails = [];
const passes = [];
const check = (ok, what) => {
  (ok ? passes : fails).push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
  return ok;
};
// n SIM ticks (hitstop freezes the tick while the clock still steps).
const steps = (W, n) => {
  const until = W.clock.tick + n;
  for (let i = 0; i < n * 4 && W.clock.tick < until; i++) W.step();
};

// A live campaign room at `level`, with every rolled enemy gone and waves held.
function liveRoom(seed, level = 1, opts = {}) {
  const W = makeWorld(seed);
  W.run.startCampaign({ level, harness: true, ...opts });
  for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
  steps(W, 30);
  return W;
}
const elitesOf = (W) => W.registry.all().filter((e) => e.elite && e.state === 'active');
// Spawn one forced elite at (x, z) after clearing the room's own enemies.
function forced(W, kind, affixes, x = 0, z = -3) {
  W.world.cmd('killAllEnemies');
  W.registry.all().filter((e) => e.kind === 'eglob' || e.kind === 'slick' || e.kind === 'affix_core').forEach((e) => W.registry.despawn(e.id));
  const id = W.world.cmd('spawn', kind, x, z, { elite: true, affixes });
  return W.registry.byId(id);
}
// Park the party far from (x, z) so only the bodies we place matter.
function parkParty(W, x = 0, z = 4.5) {
  W.world.cmd('teleport', x, z);
  for (const a of W.registry.all().filter((e) => e.kind === 'ally')) {
    a.x = a.px = x + (a.partyIndex - 2) * 0.9;
    a.z = a.pz = z + 0.6;
  }
}

// ------------------------------------------------------------ 1. rolls --
{
  // Level 1 and Level 3 campaigns, autopilot-free: walk rooms by clearing.
  const counts = { 1: new Set(), 3: new Set() };
  let affixed = 0;
  let elites = 0;
  let badKind = 0;
  let clash = 0;
  const seen = new Set();
  for (const level of [1, 3]) {
    for (let seed = 1; seed <= 12; seed++) {
      const W = makeWorld(seed);
      W.bus.on('elite_spawn', () => (elites += 1));
      W.bus.on('elite_affixes', (e) => {
        affixed += 1;
        counts[level].add(e.affixes.length);
        for (const id of e.affixes) {
          seen.add(id);
          if (AFFIXES[id].not.includes(e.etype)) badKind += 1;
        }
        if (e.affixes.includes('molten') && e.affixes.includes('frozen')) clash += 1;
      });
      W.run.startCampaign({ level, harness: true });
      // Let the first room roll its waves (force each wave out).
      for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
      for (let w = 0; w < 6; w++) {
        W.world.cmd('startWave');
        steps(W, 90);
      }
    }
  }
  check(affixed > 0 && affixed === elites, `campaign elites all carry powers (${affixed} of ${elites} elites over 24 first rooms)`);
  check(counts[3].size === 1 && counts[3].has(2), `Level III elites carry two powers (${[...counts[3]]})`);
  // The live rule, room by room: Level I one, Level II one then two from room 4.
  const ruleAt = (level, rooms) => {
    const W = liveRoom(7, level);
    const out = [];
    for (let r = 1; r <= rooms; r++) {
      out.push(W.run.cmd('affixRule')?.count ?? 0);
      W.world.cmd('killAllEnemies');
      for (let i = 0; i < 3000 && W.run.view().phase !== 'path'; i++) {
        const v = W.run.view();
        if (v.phase === 'combat') W.world.cmd('killAllEnemies');
        else if (v.phase === 'reward') W.run.declineReward();
        else if (v.phase === 'relic') W.run.chooseRelic(0);
        W.step();
      }
      const p = W.run.view().path;
      if (!p) break;
      W.run.choosePath(p.options[0].event ? 1 : 0);
      for (let i = 0; i < 3000 && !['combat', 'shop'].includes(W.run.view().phase); i++) W.step();
      if (W.run.view().phase !== 'combat') out.push('-');
    }
    return out.join(',');
  };
  const l1 = ruleAt(1, 5);
  const l2 = ruleAt(2, 5);
  check(!/2/.test(l1) && /1/.test(l1), `Level I rooms roll one power (rule by room: ${l1})`);
  check(/^1,.*2/.test(l2), `Level II rolls one, then two from room 4 (rule by room: ${l2})`);
  check(badKind === 0 && clash === 0, `no power on an excluded kind (${badKind}), never Molten with Frozen (${clash})`);
  check(seen.size === AFFIX_IDS.length, `all eight powers rolled somewhere (${[...seen].sort().join(', ')})`);
  // Pure roll: every kind, many ordinals.
  let pureBad = 0;
  for (const kind of ['boar', 'mantis', 'brood', 'knight', 'mole', 'lamprey', 'gravewisp', 'ram'])
    for (let o = 0; o < 200; o++) {
      const l = rollAffixes('s', o, kind, 2);
      if (l.length !== 2 || l[0] === l[1] || l.some((id) => AFFIXES[id].not.includes(kind)) || (l.includes('molten') && l.includes('frozen'))) pureBad += 1;
    }
  check(pureBad === 0, `rollAffixes: two distinct, allowed, non-clashing powers for 1600 rolls (${pureBad} bad)`);
  // Replay: one seed, one set of rolls.
  const rollsOf = (seed) => {
    const W = makeWorld(seed);
    const out = [];
    W.bus.on('elite_affixes', (e) => out.push(`${e.etype}:${e.affixes.join('+')}`));
    W.run.startCampaign({ level: 3, harness: true });
    for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
    for (let w = 0; w < 6; w++) {
      W.world.cmd('startWave');
      steps(W, 90);
    }
    return out.join(',');
  };
  // Elites are a chance roll, so a seed may field none in six waves: take
  // the first seed from 5 that does, then replay it.
  let rs = 5, a = rollsOf(rs);
  while (!a.length && rs < 20) a = rollsOf(++rs);
  check(a.length > 0 && a === rollsOf(rs), `the same seed rolls the same powers (seed ${rs}: ${a.slice(0, 60)}...)`);
  // Endless: two powers at depth 1.
  {
    const W = makeWorld(4);
    W.run.startCampaign({ endless: true, harness: true });
    for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
    const r = W.run.cmd('affixRule');
    check(!!r && r.count === 2, `Endless elites carry two powers (rule count ${r ? r.count : '-'})`);
  }
  // Never: the legacy single-level run, the tutorial, the ?room= harness.
  {
    let n = 0;
    let el = 0;
    const L = makeWorld(3);
    L.bus.on('elite_affixes', () => (n += 1));
    L.bus.on('elite_spawn', () => (el += 1));
    L.run.startRun({ act: 3 });
    for (let w = 0; w < 8; w++) {
      L.world.cmd('startWave');
      steps(L, 90);
    }
    const T = makeWorld(3);
    T.bus.on('elite_affixes', () => (n += 1));
    T.run.startCampaign({ tutorial: true, harness: true });
    steps(T, 200);
    T.run.cmd('tutorialRelease');
    for (let w = 0; w < 6; w++) {
      T.world.cmd('startWave');
      steps(T, 90);
    }
    const H = makeWorld(3, { harness: true, room: 'kill_all' });
    H.bus.on('elite_affixes', () => (n += 1));
    H.world.cmd('spawn', 'boar', 0, -3, { elite: true });
    steps(H, 60);
    check(n === 0, `no powers in the legacy run (${el} elites), the tutorial or the ?room= harness (${n} rolled)`);
  }
}

// -------------------------------------------------------- 2. the eight --
// MOLTEN: kill it; a core waits for the governor, swells under a ring, bursts
// (hits the body standing there) and leaves a burning pool that keeps biting.
{
  const W = liveRoom(11, 1);
  parkParty(W);
  const e = forced(W, 'boar', ['molten'], 0, 2.6);
  const p = W.world.player;
  steps(W, 2);
  p.x = p.px = 0.3;
  p.z = p.pz = 3.0;
  const hp0 = p.hp;
  const from = W.log.length;
  W.world.cmd('setHp', e.id, 0);
  steps(W, 4);
  const core = W.registry.all().find((x) => x.kind === 'affix_core') ?? null;
  const glob = W.registry.all().find((x) => x.kind === 'eglob' && x.affix === 'molten');
  const tel = W.log.slice(from).find((x) => x.type === 'telegraph_start' && x.etype === 'eglob' && x.playerTargeted);
  // Hold the player inside the ring and the pool.
  for (let i = 0; i < 160; i++) {
    p.x = p.px = 0.3;
    p.z = p.pz = 3.0;
    W.step();
  }
  const ev = W.log.slice(from);
  const land = ev.find((x) => x.type === 'enemy_glob_land' && x.affix === 'molten');
  const pool = ev.find((x) => x.type === 'slick_spawn' && x.variant === 'molten');
  const burns = ev.filter((x) => x.type === 'hit' && x.shape === 'molten' && x.target === p.id).length;
  check(!!(ev.find((x) => x.type === 'affix_core') && (core || glob) && tel && land && land.victims >= 1 && pool && burns >= 3 && p.hp < hp0), `Molten: core, Ember ring (${tel ? tel.resolveTick - tel.tick : '-'} ticks), burst on ${land ? land.victims : 0}, burning pool bit ${burns} times`);
}
// FROZEN: a party body inside 3 u: it roots under a ring, the burst slows.
{
  const W = liveRoom(12, 1);
  parkParty(W);
  const e = forced(W, 'boar', ['frozen'], 0, 2.0);
  const p = W.world.player;
  e.knockbackable = false; // the party's hits must not shove it: we watch its own steps
  e.frostAt = W.clock.tick + 2;
  const from = W.log.length;
  let rooted = true;
  let x0 = null;
  for (let i = 0; i < 120; i++) {
    p.x = p.px = 0;
    p.z = p.pz = 3.4;
    W.step();
    if (e.frostUntil > W.clock.tick) {
      if (x0 === null) x0 = { x: e.x, z: e.z };
      else if (Math.hypot(e.x - x0.x, e.z - x0.z) > 1e-6) rooted = false;
    }
  }
  const ev = W.log.slice(from);
  const cast = ev.find((x) => x.type === 'affix_frost');
  const land = ev.find((x) => x.type === 'enemy_glob_land' && x.affix === 'frozen');
  const patch = ev.find((x) => x.type === 'slick_spawn' && x.variant === 'frost');
  const slowed = p.status && p.status.slow && p.status.slow.mag >= AFFIX_RULES.frozen.slow - 1e-9;
  check(!!(cast && x0 && rooted && land && land.victims >= 1 && patch && slowed), `Frozen: wind-up rooted ${AFFIX_RULES.frozen.windTicks} ticks, burst on ${land ? land.victims : 0}, frost patch slows ${slowed ? p.status.slow.mag : 0}`);
}
// VAMPIRIC: hurt it, let it bite; it heals off its hits.
{
  const W = liveRoom(13, 1);
  parkParty(W);
  const e = forced(W, 'boar', ['vampiric'], 0, 3.6);
  const p = W.world.player;
  e.maxHp = 2000;
  e.hp = 600;
  const hp0 = e.hp;
  const from = W.log.length;
  for (let i = 0; i < 240; i++) {
    p.x = p.px = 0;
    p.z = p.pz = 4.2;
    W.step();
  }
  const ev = W.log.slice(from);
  const leech = ev.filter((x) => x.type === 'affix_leech');
  const healed = leech.reduce((n, x) => n + x.amount, 0);
  const dealt = ev.filter((x) => x.type === 'hit' && x.attacker === e.id).reduce((n, x) => n + x.amount, 0);
  const ratio = dealt > 0 ? healed / dealt : 0;
  check(leech.length > 0 && Math.abs(ratio - AFFIX_RULES.vampiric.leech) < 0.02 && hp0 > 0, `Vampiric: ${leech.length} bites healed it ${healed.toFixed(1)} of ${dealt.toFixed(1)} dealt (x${ratio.toFixed(2)})`);
}
// WARDED: warn, then the party's real hits whiff (hit_immune), then land.
{
  const W = liveRoom(14, 1);
  const e = forced(W, 'ram', ['warded'], 0, -1.0);
  e.hp = e.maxHp = 5000;
  e.wardAt = W.clock.tick + 2;
  steps(W, 3);
  const warn = e.affixWard === 'warn';
  steps(W, AFFIX_RULES.warded.warnTicks);
  const on = e.affixWard === 'on';
  const hpOn = e.hp;
  const from = W.log.length;
  steps(W, AFFIX_RULES.warded.onTicks - 4);
  // The seats keep swinging at their only foe; the ward eats every instance
  // (an arc skips an iframed body, a bolt whiffs on it).
  let swings = 0;
  const offSw = W.bus.on('ally_basic', () => (swings += 1));
  const whiffs = W.log.slice(from).filter((x) => x.type === 'hit_immune' && x.target === e.id).length;
  const heldHp = e.hp === hpOn;
  steps(W, 10);
  const off = e.affixWard === null;
  const from2 = W.log.length;
  steps(W, 120);
  const landed = W.log.slice(from2).filter((x) => x.type === 'hit' && x.target === e.id).length;
  if (typeof offSw === 'function') offSw();
  check(warn && on && heldHp && off && landed > 0, `Warded: warns ${AFFIX_RULES.warded.warnTicks} ticks, took no damage for ${AFFIX_RULES.warded.onTicks} ticks (${whiffs} whiffs), then ${landed} hits landed`);
}
// BLINKING: the target far away: a marked spot, then it stands there.
{
  const W = liveRoom(15, 1);
  parkParty(W, 0, 4.8);
  const e = forced(W, 'mantis', ['blinking'], 0, -4.5);
  e.blinkAt = W.clock.tick + 2;
  const from = W.log.length;
  steps(W, 4);
  const mark = W.log.slice(from).find((x) => x.type === 'affix_blink_mark');
  steps(W, AFFIX_RULES.blinking.markTicks + 2);
  const blink = W.log.slice(from).find((x) => x.type === 'affix_blink');
  const near = blink ? Math.hypot(blink.x - mark.x, blink.z - mark.z) < 1e-6 : false;
  check(!!(mark && blink && near && Math.abs(e.z - blink.z) < 0.5), `Blinking: marked (${mark ? `${mark.x}, ${mark.z}` : '-'}) ${AFFIX_RULES.blinking.markTicks} ticks ahead, then blinked there from z ${blink ? blink.fromZ : '-'}`);
}
// SPLITTING: two smaller, plain copies.
{
  const W = liveRoom(16, 1);
  parkParty(W);
  const e = forced(W, 'boar', ['splitting'], 0, -3);
  const maxHp = e.maxHp;
  const from = W.log.length;
  W.world.cmd('setHp', e.id, 0);
  steps(W, 2);
  const sp = W.log.slice(from).find((x) => x.type === 'affix_split');
  const kids = sp ? sp.brood.map((id) => W.registry.byId(id)).filter(Boolean) : [];
  const ok = kids.length === 2 && kids.every((k) => k.kind === 'boar' && !k.elite && !k.affixes && k.splitling && k.scale < 1 && k.maxHp < maxHp * 0.5);
  check(!!sp && ok, `Splitting: ${kids.length} copies, plain and smaller (hp ${kids.map((k) => k.maxHp.toFixed(1)).join('/')} of ${maxHp.toFixed(1)})`);
}
// HASTED: x1.4 the distance of a plain elite over the same walk.
{
  const walk = (aff) => {
    const W = liveRoom(17, 1);
    parkParty(W, 0, 4.5);
    const e = forced(W, 'boar', aff, 0, -4.5);
    const z0 = e.z;
    steps(W, 40);
    return e.z - z0;
  };
  const plain = walk([]);
  const fast = walk(['hasted']);
  check(fast > plain * 1.3 && fast < plain * 1.5, `Hasted: ${fast.toFixed(2)} u vs ${plain.toFixed(2)} u in 40 ticks (x${(fast / plain).toFixed(2)})`);
}
// THORNED: the AI melee seats fight it; a melee hit stings its striker.
{
  const W = liveRoom(18, 1);
  const e = forced(W, 'ram', ['thorned'], 0, -1.0);
  e.hp = e.maxHp = 5000;
  const from = W.log.length;
  steps(W, 600);
  const ev = W.log.slice(from);
  const stings = ev.filter((x) => x.type === 'affix_thorns');
  const back = ev.filter((x) => x.type === 'hit' && x.shape === 'thorns');
  const maxBack = back.reduce((m, x) => Math.max(m, x.amount), 0);
  check(stings.length > 0 && back.length === stings.length && maxBack <= AFFIX_RULES.thorned.cap * 1.5 + 1e-6, `Thorned: ${stings.length} stings back on the party (largest ${maxBack.toFixed(1)}, cap ${AFFIX_RULES.thorned.cap})`);
}

// ------------------------------------------------------- 3. governor --
{
  let worstConcurrent = 0;
  let minGap = Infinity;
  let affixTels = 0;
  let starvedSwings = 0;
  for (const seed of [2, 5]) {
    const W = makeWorld(seed);
    const ap = W.run.autopilot;
    W.run.startCampaign({ level: 3, harness: true });
    ap.configure(true);
    let last = -1e9;
    W.bus.on('telegraph_start', (e) => {
      if (!e.playerTargeted) return;
      const g = W.registry.byId(e.id);
      if (g && g.affix) affixTels += 1;
      // Balance pass (v0.5.224): a Knight the governor held back for
      // starveTicks swings anyway, so its start is not held to the stagger.
      const starved = g && g.kind === 'knight' && g.heldLast === e.tick && e.tick - g.heldSince >= KNIGHT.stats.starveTicks;
      if (starved) starvedSwings += 1;
      else if (last > -1e9) minGap = Math.min(minGap, e.tick - last);
      last = e.tick;
    });
    for (let i = 0; i < 9000; i++) {
      W.clock.stepOnce((t) => W.world.step(t, ap.intents(t, emptySnapshot())));
      let n = 0;
      for (const x of W.registry.all()) if (x.telegraph && x.telegraph.playerTargeted) n += 1;
      worstConcurrent = Math.max(worstConcurrent, n);
      if (W.run.view().phase === 'defeat') break;
    }
  }
  check(affixTels > 0 && worstConcurrent <= 2 && minGap >= 72, `governor over Level III: ${affixTels} affix telegraphs, at most ${worstConcurrent} live, starts >= ${minGap} ticks apart (${starvedSwings} starved Knight swings exempt)`);
}

// ---------------------------------------------------------------- 4. AI --
{
  // Seats inside a burst ring walk out before it lands.
  const W = liveRoom(19, 1);
  const allies = W.registry.all().filter((e) => e.kind === 'ally');
  const e = forced(W, 'boar', ['frozen'], 0, 0);
  // Put the boar among the party and charge its nova at once.
  const ring = AFFIX_RULES.frozen.radius;
  for (const a of allies) {
    a.x = a.px = e.x + (a.partyIndex - 2) * 0.7;
    a.z = a.pz = e.z + 1.2;
  }
  e.frostAt = W.clock.tick + 1;
  steps(W, 3);
  const glob = W.registry.all().find((x) => x.kind === 'eglob' && x.affix === 'frozen');
  steps(W, AFFIX_RULES.frozen.windTicks - 4);
  const out = glob ? allies.filter((a) => Math.hypot(a.x - glob.tx, a.z - glob.tz) > ring + a.radius).map((a) => a.classId) : [];
  check(!!glob && out.length >= 2, `AI: ${out.length} of ${allies.length} seats left the Frozen ring before it landed (${out.join(', ')})`);
  // A Warded elite with its ward up is passed over for another target.
  const V = liveRoom(20, 1);
  V.world.cmd('killAllEnemies');
  const w = V.registry.byId(V.world.cmd('spawn', 'boar', 0, -1.5, { elite: true, affixes: ['warded'] }));
  const other = V.registry.byId(V.world.cmd('spawn', 'boar', 2.6, -3.4));
  w.affixWard = 'on';
  w.wardAt = V.clock.tick + 400;
  const hpOther = other.hp;
  steps(V, 120);
  check(other.hp < hpOther, `AI: seats turn on the other boar while the ward holds (${hpOther.toFixed(0)} -> ${Math.max(0, other.hp).toFixed(0)})`);
}

// --------------------------------------------------- 5. co-op, saves --
{
  const W = liveRoom(21, 2);
  const e = forced(W, 'crab', ['molten', 'hasted'], 0, -3);
  e.blink = null;
  const q = quantizeEntity(e, W.clock.tick, null);
  const v = viewEntity(q, W.clock.tick);
  const j = JSON.parse(JSON.stringify(e));
  check(JSON.stringify(v.affixes) === JSON.stringify(e.affixes) && v.affixSpeed === e.affixSpeed && JSON.stringify(j.affixes) === JSON.stringify(e.affixes), `co-op snapshot and save carry the powers (${v.affixes.join('+')}, speed x${v.affixSpeed})`);
}

// -------------------------------------------------------------- tune --
if (TUNE) {
  for (const level of [1, 2, 3]) {
    let cleared = 0;
    let downs = 0;
    let affixed = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const W = makeWorld(seed);
      const ap = W.run.autopilot;
      let done = null;
      let roomStart = 0;
      W.bus.on('downed', () => (downs += 1));
      W.bus.on('elite_affixes', () => (affixed += 1));
      W.bus.on('room_enter', (e) => (roomStart = e.tick));
      W.bus.on('level_clear', () => (done = 'cleared'));
      W.run.startCampaign({ level, harness: true });
      ap.configure(true);
      for (let i = 0; i < 2_000_000 && !done; i++) {
        W.clock.stepOnce((t) => W.world.step(t, ap.intents(t, emptySnapshot())));
        const v = W.run.view();
        if (v.phase === 'victory') done = 'cleared';
        else if (v.phase === 'defeat') done = 'defeat';
        else if (v.phase === 'combat' && W.clock.tick - roomStart > 10800) done = 'stuck';
      }
      if (done === 'cleared') cleared += 1;
    }
    console.log(`tune: Level ${level}: ${cleared}/8 cleared, ${downs} downs, ${affixed} affixed elites`);
  }
}

console.log(`\n${passes.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
