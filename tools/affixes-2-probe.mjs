#!/usr/bin/env node
// ELITE AFFIXES batch two probe (content plan 5 slice 10,
// docs/ELITE_AFFIXES.md "Batch two"), headless:
//
//   node tools/affixes-2-probe.mjs
//
//   1. Where they roll: rooms 1 to 3 of a level draw from the first eight
//      exactly as before (the old roll, re-run here, for every kind); from
//      room 4 on the four join the pool; the live rule turns `late` on at
//      room 4 in the campaign and in Endless; all four roll in late rooms of
//      live campaigns, never on an excluded kind or with a clashing power.
//   2. Each of the four, forced on an elite in a live campaign room, through
//      the real sim: Gusting (rooted under a ring, hits and throws the hero
//      out), Crystal (a spur ring where it stood, the eruption, a slowing
//      quartz bed), Tolling (rooted under a ring, no damage, a 40% slow),
//      Cinder (a trail of burning patches as it walks, capped, none standing).
//   3. The §11 governor holds with four batch-two elites in one room.
//   4. The AI: the seats step out of a Gusting ring before it blows.
//   5. Signbreaker still counts the first eight; co-op snapshot and save
//      carry the new powers.
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
const { AFFIX_IDS, FIRST_AFFIX_IDS, LATE_AFFIX_IDS, AFFIXES, AFFIX_RULES, rollAffixes, hash32 } = await import(u('src/sim/affixes.js'));
const { DEEDS } = await import(u('src/data/unlocks.js'));
const { quantizeEntity, viewEntity } = await import(u('src/net/protocol/quantize.js'));

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
  // The pre-slice roll, verbatim, over the first eight.
  const oldRoll = (salt, ordinal, etype, count) => {
    const out = [];
    let pool = FIRST_AFFIX_IDS.filter((id) => !AFFIXES[id].not.includes(etype));
    for (let k = 0; k < count && pool.length > 0; k++) {
      const id = pool[hash32(`${salt}|${ordinal}|${k}`) % pool.length];
      out.push(id);
      pool = pool.filter((p) => p !== id && !(id === 'molten' ? ['frozen'] : id === 'frozen' ? ['molten'] : []).includes(p));
    }
    return out;
  };
  const KINDS = ['boar', 'mantis', 'ram', 'crab', 'brood', 'knight', 'mole', 'lamprey', 'gravewisp', 'geode', 'bloom', 'chime', 'gargoyle', 'kite', 'newt', 'slag', 'hurler', 'ashwraith', 'sacristan', 'vane'];
  let diff = 0;
  let lateEarly = 0;
  let bad = 0;
  const lateSeen = new Set();
  for (const kind of KINDS)
    for (let o = 0; o < 300; o++)
      for (const n of [1, 2]) {
        const a = rollAffixes(`7:2:1:${o % 3 + 1}`, o, kind, n, false);
        if (a.join('+') !== oldRoll(`7:2:1:${o % 3 + 1}`, o, kind, n).join('+')) diff += 1;
        if (a.some((id) => LATE_AFFIX_IDS.includes(id))) lateEarly += 1;
        const b = rollAffixes(`7:2:1:${o % 4 + 4}`, o, kind, n, true);
        for (const id of b) if (LATE_AFFIX_IDS.includes(id)) lateSeen.add(id);
        if (new Set(b).size !== b.length || b.some((id) => AFFIXES[id].not.includes(kind)) || b.some((id) => b.some((q) => AFFIXES[id].clash.includes(q)))) bad += 1;
      }
  check(diff === 0 && lateEarly === 0, `rooms 1-3 roll exactly as before: ${KINDS.length * 600} rolls, ${diff} differ, ${lateEarly} carry a batch-two power`);
  check(lateSeen.size === 4 && bad === 0, `room 4 on: all four join the pool (${[...lateSeen].sort().join(', ')}), ${bad} bad rolls (excluded kind, clash, repeat)`);
  // Clash lists are symmetric.
  let asym = 0;
  for (const id of AFFIX_IDS) for (const c of AFFIXES[id].clash) if (!AFFIXES[c].clash.includes(id)) asym += 1;
  check(asym === 0, `clash lists are symmetric (${asym} one-way)`);
  // The live rule: off in rooms 1-3, on from room 4 (campaign and Endless).
  const lateAt = (opts) => {
    const out = [];
    for (const room of [1, 2, 3, 4, 5, 6, 7]) {
      const W = makeWorld(31);
      W.run.startCampaign({ harness: true, ...opts });
      for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
      if (room > 1) W.world.cmd('skipToRoom', room);
      for (let i = 0; i < 4000 && !['combat', 'shop'].includes(W.run.view().phase); i++) W.step();
      const r = W.run.cmd('affixRule');
      out.push(r ? (r.late ? 'L' : 'e') : '-');
    }
    return out.join('');
  };
  const c2 = lateAt({ level: 2 });
  const en = lateAt({ endless: true });
  check(/^[e-]{3}[L-]{4}$/.test(c2) && c2.includes('e') && c2.includes('L'), `campaign Level II rule by room: ${c2} (e = first eight, L = all twelve, - = no roll)`);
  check(/^[e-]{3}[L-]{4}$/.test(en) && en.includes('L'), `Endless Depth 1 rule by room: ${en}`);
  // Live late rooms: all four turn up on real elites over seeds and levels.
  const seen = new Set();
  let early = 0;
  let excluded = 0;
  for (const level of [3, 4, 5]) {
    for (let seed = 1; seed <= 10; seed++) {
      const W = makeWorld(seed);
      W.run.startCampaign({ level, harness: true });
      for (let i = 0; i < 4000 && W.run.view().phase !== 'combat'; i++) W.step();
      let room = 0;
      W.bus.on('elite_affixes', (e) => {
        for (const id of e.affixes) {
          if (LATE_AFFIX_IDS.includes(id)) (room >= 4 ? seen.add(id) : (early += 1));
          if (AFFIXES[id].not.includes(e.etype)) excluded += 1;
        }
      });
      for (const r of [1, 4, 5, 6]) {
        if (r > 1) W.world.cmd('skipToRoom', r);
        for (let i = 0; i < 4000 && !['combat', 'shop'].includes(W.run.view().phase); i++) W.step();
        room = W.run.view().room ?? r;
        if (W.run.view().phase !== 'combat') continue;
        for (let w = 0; w < 6; w++) {
          W.world.cmd('startWave');
          steps(W, 90);
        }
      }
    }
  }
  check(seen.size === 4 && early === 0 && excluded === 0, `live campaigns, Levels III-V: batch two rolled in late rooms (${[...seen].sort().join(', ')}), ${early} in rooms 1-3, ${excluded} on an excluded kind`);
}

// --------------------------------------------------------- 2. the four --
// GUSTING: a hero within range: it roots under a ring, the gust hits and
// throws the hero out.
{
  const W = liveRoom(41, 3);
  parkParty(W);
  const e = forced(W, 'boar', ['gusting'], 0, -1.5);
  const p = W.world.player;
  e.knockbackable = false;
  e.gustAt = W.clock.tick + 2;
  const from = W.log.length;
  let rooted = true;
  let x0 = null;
  let held = true;
  let d0 = null;
  let landTick = null;
  for (let i = 0; i < 100; i++) {
    if (held) {
      p.x = p.px = 0;
      p.z = p.pz = -0.3;
    }
    W.step();
    if (e.gustUntil > W.clock.tick) {
      if (x0 === null) x0 = { x: e.x, z: e.z };
      else if (Math.hypot(e.x - x0.x, e.z - x0.z) > 1e-6) rooted = false;
    }
    if (held && W.log.slice(from).some((x) => x.type === 'affix_gust_blast')) {
      held = false;
      landTick = W.clock.tick;
      d0 = 0;
    }
  }
  const d1 = Math.abs(p.z - -0.3);
  const ev = W.log.slice(from);
  const cast = ev.find((x) => x.type === 'affix_gust');
  const tel = ev.find((x) => x.type === 'telegraph_start' && x.etype === 'eglob' && x.playerTargeted);
  const blast = ev.find((x) => x.type === 'affix_gust_blast');
  const hit = ev.find((x) => x.type === 'hit' && x.target === p.id && x.source === 'gusting');
  check(!!(cast && tel && x0 && rooted && blast && blast.victims >= 1 && hit && d0 !== null && d1 - d0 >= AFFIX_RULES.gusting.throwDist * 0.8), `Gusting: rooted ${AFFIX_RULES.gusting.windTicks}-tick Ember ring, gust hit for ${hit ? hit.amount.toFixed(1) : 0}, hero thrown ${d0 !== null ? (d1 - d0).toFixed(2) : '-'} u`);
}
// CRYSTAL: a spur ring where it stood; the eruption hits who stands there and
// leaves a quartz bed that slows.
{
  const W = liveRoom(42, 3);
  parkParty(W);
  const e = forced(W, 'boar', ['crystal'], 0, 2.4);
  const p = W.world.player;
  e.spurAt = W.clock.tick + 2;
  const from = W.log.length;
  let spot = null;
  for (let i = 0; i < 90; i++) {
    const g = W.registry.all().find((x) => x.kind === 'eglob' && x.affix === 'crystal');
    if (g && !spot) spot = { x: g.tx, z: g.tz };
    // Stand where the spur was planted once it is known (else near it).
    p.x = p.px = spot ? spot.x + 0.3 : 0;
    p.z = p.pz = spot ? spot.z : 3.6;
    W.step();
  }
  const ev = W.log.slice(from);
  const plant = ev.find((x) => x.type === 'affix_spur');
  const land = ev.find((x) => x.type === 'enemy_glob_land' && x.affix === 'crystal');
  const bed = ev.find((x) => x.type === 'slick_spawn' && x.variant === 'quartz');
  const slowed = p.status && p.status.slow && p.status.slow.mag >= AFFIX_RULES.crystal.slow - 1e-9;
  const span = plant && land ? land.tick - plant.tick : 0;
  check(!!(plant && land && land.victims >= 1 && bed && slowed && span >= AFFIX_RULES.crystal.windTicks - 1), `Crystal: spur ring ${span} ticks, eruption on ${land ? land.victims : 0}, quartz bed slows ${slowed ? p.status.slow.mag : 0}`);
}
// TOLLING: rooted under a ring; no damage, a 40% slow for 2 s.
{
  const W = liveRoom(43, 3);
  parkParty(W);
  const e = forced(W, 'boar', ['tolling'], 0, 2.0);
  const p = W.world.player;
  e.knockbackable = false;
  e.tollAt = W.clock.tick + 2;
  e.nextAttackTick = W.clock.tick + 9999; // its own charge must not muddy the hp count
  e.cdByTarget = new Proxy({}, { get: () => W.clock.tick + 9999 });
  const from = W.log.length;
  let rooted = true;
  let x0 = null;
  for (let i = 0; i < 80; i++) {
    p.x = p.px = 0;
    p.z = p.pz = 4.4;
    W.step();
    if (e.tollUntil > W.clock.tick) {
      if (x0 === null) x0 = { x: e.x, z: e.z };
      else if (Math.hypot(e.x - x0.x, e.z - x0.z) > 1e-6) rooted = false;
    }
  }
  const ev = W.log.slice(from);
  const cast = ev.find((x) => x.type === 'affix_toll');
  const tolled = ev.find((x) => x.type === 'affix_tolled');
  const tollHits = ev.filter((x) => x.type === 'hit' && x.target === p.id && x.tick === (tolled ? tolled.tick : -1)).length;
  const slowed = p.status && p.status.slow && Math.abs(p.status.slow.mag - AFFIX_RULES.tolling.slow) < 1e-9;
  check(!!(cast && x0 && rooted && tolled && tolled.victims >= 1 && tollHits === 0 && slowed), `Tolling: rooted ${AFFIX_RULES.tolling.windTicks}-tick ring r ${AFFIX_RULES.tolling.radius}, toll on ${tolled ? tolled.victims : 0}, ${tollHits} damage, slow ${slowed ? p.status.slow.mag : 0}`);
}
// CINDER: walking leaves burning patches (capped); standing leaves none.
{
  const W = liveRoom(44, 3);
  parkParty(W, 0, 4.6);
  const e = forced(W, 'boar', ['cinder'], -3, -3);
  e.hp = e.maxHp = 5000;
  const p = W.world.player;
  const from = W.log.length;
  // Walk it in a loop by hand.
  for (let i = 0; i < 360; i++) {
    const a = i / 40;
    e.x = e.px = Math.cos(a) * 2.5;
    e.z = e.pz = -2 + Math.sin(a) * 1.5;
    p.x = p.px = 0;
    p.z = p.pz = 4.6;
    W.step();
  }
  const ev = W.log.slice(from);
  const drops = ev.filter((x) => x.type === 'affix_cinder').length;
  const live = W.registry.all().filter((x) => x.kind === 'slick' && x.variant === 'cinder' && x.ownerId === e.id).length;
  // Stand still: no new patch.
  const before = W.log.length;
  e.knockbackable = false;
  for (let i = 0; i < 120; i++) {
    e.x = e.px = 1;
    e.z = e.pz = -2;
    W.step();
  }
  const still = W.log.slice(before).filter((x) => x.type === 'affix_cinder').length;
  // The burn: stand the hero on a fresh patch.
  // A fresh patch to stand on.
  e.x = e.px = -1;
  e.z = e.pz = -2;
  steps(W, AFFIX_RULES.cinder.everyTicks + 2);
  const s = W.registry.all().filter((x) => x.kind === 'slick' && x.variant === 'cinder').sort((a, b) => b.untilTick - a.untilTick)[0];
  const hp0 = p.hp;
  const b0 = W.log.length;
  for (let i = 0; i < 70 && s; i++) {
    p.x = p.px = s.x;
    p.z = p.pz = s.z;
    W.step();
  }
  const burns = W.log.slice(b0).filter((x) => x.type === 'hit' && x.target === p.id && x.shape === 'molten').length;
  check(drops >= 10 && live <= AFFIX_RULES.cinder.maxLive && still <= 1 && burns >= 1 && p.hp < hp0, `Cinder: ${drops} patches walking, ${live} live (cap ${AFFIX_RULES.cinder.maxLive}), ${still} while standing, a patch burned ${burns} times`);
}

// --------------------------------------------------------- 3. governor --
{
  const W = liveRoom(45, 3);
  W.world.cmd('killAllEnemies');
  let worst = 0;
  let minGap = Infinity;
  let last = -1e9;
  let tels = 0;
  W.bus.on('telegraph_start', (ev) => {
    if (!ev.playerTargeted) return;
    const g = W.registry.byId(ev.id);
    if (g && g.affix) tels += 1;
    if (last > -1e9) minGap = Math.min(minGap, ev.tick - last);
    last = ev.tick;
  });
  const ids = [['boar', 'gusting', -1.4, 1.0], ['ram', 'tolling', 1.4, 1.0], ['boar', 'crystal', 0, 2.2], ['crab', 'cinder', 0, -0.4]].map(([k, a, x, z]) => W.world.cmd('spawn', k, x, z, { elite: true, affixes: [a] }));
  for (const id of ids) {
    const e = W.registry.byId(id);
    if (!e) continue;
    e.hp = e.maxHp = 5000;
    e.gustAt = e.tollAt = e.spurAt = W.clock.tick + 2;
    // Their own charges would starve the governor; hold them so the powers
    // are what competes for it.
    e.nextAttackTick = W.clock.tick + 99999;
    e.knockbackable = false; // (a knocked-back elite waits, as Frozen does)
    e.cdByTarget = new Proxy({}, { get: () => W.clock.tick + 99999 });
  }
  const party = W.registry.all().filter((x) => x.partyIndex !== undefined);
  for (let i = 0; i < 800; i++) {
    // Pin the party among the elites so every power has someone in reach.
    party.forEach((b, k) => {
      b.x = b.px = -1.2 + k * 0.8;
      b.z = b.pz = 0.9;
    });
    // Only these four: the room's own waves stay out.
    for (const x of W.registry.all()) if (x.faction === 'hostile' && x.hp > 0 && x.kind !== 'eglob' && !ids.includes(x.id)) W.registry.despawn(x.id);
    W.step();
    let n = 0;
    for (const x of W.registry.all()) if (x.telegraph && x.telegraph.playerTargeted) n += 1;
    worst = Math.max(worst, n);
  }
  check(tels >= 4 && worst <= 2 && minGap >= 72, `governor with four batch-two elites: ${tels} affix telegraphs, at most ${worst} live, starts >= ${minGap} ticks apart`);
}

// ---------------------------------------------------------------- 4. AI --
{
  const W = liveRoom(46, 1);
  const allies = W.registry.all().filter((e) => e.kind === 'ally');
  const e = forced(W, 'boar', ['gusting'], 0, 0);
  e.knockbackable = false;
  for (const a of allies) {
    a.x = a.px = e.x + (a.partyIndex - 2) * 0.7;
    a.z = a.pz = e.z + 1.2;
  }
  e.gustAt = W.clock.tick + 1;
  steps(W, 3);
  const glob = W.registry.all().find((x) => x.kind === 'eglob' && x.affix === 'gusting');
  steps(W, AFFIX_RULES.gusting.windTicks - 4);
  const out = glob ? allies.filter((a) => Math.hypot(a.x - glob.tx, a.z - glob.tz) > AFFIX_RULES.gusting.radius + a.radius).map((a) => a.classId) : [];
  check(!!glob && out.length >= 2, `AI: ${out.length} of ${allies.length} seats left the Gusting ring before it blew (${out.join(', ')})`);
}

// ---------------------------------------- 5. Signbreaker, co-op, saves --
{
  const test = DEEDS.signbreaker && DEEDS.signbreaker.test;
  const seven = [...FIRST_AFFIX_IDS.slice(0, 7), ...LATE_AFFIX_IDS];
  const all8 = [...FIRST_AFFIX_IDS];
  const okSb = typeof test === 'function' && !test({}, { affix: seven }) && test({}, { affix: all8 });
  check(okSb, `Signbreaker: seven of the first eight plus all four new = not yet; the first eight = done${typeof test === 'function' ? '' : ' (deed not found)'}`);
  const W = liveRoom(47, 3);
  const e = forced(W, 'boar', ['gusting', 'cinder'], 0, -3);
  const q = quantizeEntity(e, W.clock.tick, null);
  const v = viewEntity(q, W.clock.tick);
  const j = JSON.parse(JSON.stringify(e));
  check(JSON.stringify(v.affixes) === JSON.stringify(e.affixes) && JSON.stringify(j.affixes) === JSON.stringify(e.affixes) && j.gustAt === e.gustAt && j.cinderX === e.cinderX, `co-op snapshot and save carry the new powers (${v.affixes.join('+')})`);
}

console.log(`\n${passes.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
