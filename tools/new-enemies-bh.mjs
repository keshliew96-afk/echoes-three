#!/usr/bin/env node
// New enemies, Barrow and Heart probe (content plan 3 slice 4,
// docs/NEW_ENEMIES_BARROW_HEART.md) — headless Node, the sim built exactly
// like src/main.js.
//
//   node tools/new-enemies-bh.mjs [--seed 4] [--seeds 1-8] [--out captures/new-enemies-bh.json]
//
// Legs:
//   kits     each new kind (Ash Keener, Barrow Sexton, Heart Bloom, Vein
//            Siphon), spawned into a live campaign room of its land, fires
//            every beat of its kit and its numbers land as the doc says
//            (the keen slows, the snare springs, holds and crumbles, the
//            bloom roots and pulses on the shared heartbeat, the siphon
//            latches, drinks, heals and snaps when stretched).
//   roster   a campaign room 2 of each land never plans them, room 3 does;
//            the legacy single-level run (startRun) and its plans never do;
//            Endless past the first cycle mixes them in as guests.
//   campaign real campaign runs of Levels III and IV on the autopilot meet
//            each new kind from room 3 on and see it attack.
//   affixes  the `not` lists hold (a Bloom never Blinks or Hastes, a Siphon
//            is never Vampiric) over a thousand rolls.
//   journal  every kind has a bestiary row in its own land.
//   save     a mid-fight capture with a sprung snare and a latched siphon
//            continues bit-identically in a fresh world for 600 ticks.
// Exit code 1 on any failure.
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
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { clonePlain } = await import(u('src/save/codec.js'));
const { LEVELS, CAMPAIGN_ONLY_ENEMIES } = await import(u('src/data/levels.js'));
const { endlessLevel, GUEST_WEIGHT } = await import(u('src/data/endless.js'));
const { rollAffixes } = await import(u('src/sim/affixes.js'));
const { BESTIARY } = await import(u('src/data/journal.js'));
const { ARCHETYPES } = await import(u('src/sim/enemies.js'));
const { HEARTBEAT, beatPhase } = await import(u('src/sim/enemies/husk.js'));
const { ENEMY_VFX } = await import(u('src/data/vfx.js'));

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEED = Number(opt('seed', '4'));
const seedsArg = opt('seeds', '1-8');
const SEEDS = seedsArg.includes('-')
  ? (() => {
      const [a, b] = seedsArg.split('-').map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    })()
  : seedsArg.split(',').map(Number);
const OUT = opt('out', 'captures/new-enemies-bh.json');
const LAND = { keener: 3, sexton: 3, bloom: 4, siphon: 4 };
const KINDS = Object.keys(LAND);

const results = [];
let failed = 0;
function check(leg, name, ok, detail = null) {
  results.push({ leg, name, ok: !!ok, ...(detail !== null ? { detail } : {}) });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}

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
  const ap = world.runSystem().autopilot;
  const io = createStateIO({ clock, rng, registry, world });
  const log = [];
  let rec = null;
  bus.on('*', (e) => {
    if (rec && e.type !== 'sound') rec.push(e);
    if (e.type !== 'sound') log.push(e);
    if (log.length > 60000) log.splice(0, 20000);
  });
  const step = () => clock.stepOnce((t) => world.step(t, ap.active() ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  function continuation(n, every = 60) {
    rec = [];
    const hashes = [];
    for (let done = 0; done < n; done += every) {
      for (let k = 0; k < every; k++) step();
      hashes.push(hashState(io.capture()));
    }
    const events = rec.map((e) => canonicalJSON(e));
    rec = null;
    return { hashes, events };
  }
  return { registry, bus, clock, world, ap, io, step, continuation, log, run: () => world.runSystem() };
}
const holdParty = (w) => {
  for (const e of w.registry.all()) if (e.partyIndex !== undefined && e.hp > 0) e.hp = e.maxHp;
};
const party = (w) => w.registry.all().filter((e) => e.partyIndex !== undefined);
const player = (w) => w.registry.all().find((e) => e.partyIndex === 0);
const seen = (w, type, pred = () => true) => w.log.filter((e) => e.type === type && pred(e));

// A live campaign room `n` of `level` with the waves gone and the party at
// full health, ready for staged spawns.
function stage(seed, level, n = 3) {
  const w = build(seed);
  w.run().startCampaign({ level, harness: true });
  w.world.cmd('skipToRoom', n);
  for (let i = 0; i < 30; i++) w.step();
  w.world.cmd('killAllEnemies');
  for (let i = 0; i < 4; i++) w.step();
  holdParty(w);
  return w;
}
// Pump a staged body so the party cannot one-shot it before its beat.
function sturdy(w, id, hp = 600) {
  const e = w.registry.byId(id);
  e.maxHp = hp;
  e.hp = hp;
  return e;
}
function spawnAt(w, kind, x, z) {
  const id = w.world.cmd('spawn', kind, x, z);
  return typeof id === 'object' && id ? id.id : id;
}

// ------------------------------------------------------------------ kits --
{
  // ASH KEENER: a wail down a cone that slows who it finds.
  const w = stage(SEED, 3);
  w.ap.configure(false);
  const p = player(w);
  const id = spawnAt(w, 'keener', p.x, p.z - 3.0);
  sturdy(w, id);
  let slowed = null;
  let wailed = false;
  w.bus.on('keener_wail', (ev) => {
    if (ev.victims > 0) wailed = true;
  });
  for (let i = 0; i < 900 && !slowed; i++) {
    holdParty(w);
    w.step();
    if (wailed) slowed = party(w).filter((b) => b.status && b.status.slow && b.status.slow.src === id).map((b) => ({ id: b.id, mag: b.status.slow.mag, left: b.status.slow.untilTick - w.clock.tick }));
  }
  const tel = seen(w, 'telegraph_start', (e) => e.id === id)[0];
  const wail = seen(w, 'keener_wail', (e) => e.id === id)[0];
  check('kits', 'keener: telegraphs a 54-tick cone (r 4.2, 28°) and wails', tel && tel.shape === 'cone' && wail && wail.radius === 4.2 && wail.halfAngleDeg === 28 && tel.resolveTick - tel.tick === 54, { tel, wail });
  check('kits', 'keener: the wail slows every hero it hits by 40% for 2 s', slowed && slowed.length > 0 && slowed.every((s) => Math.abs(s.mag - 0.4) < 1e-6 && s.left > 100), slowed);
  const hit = seen(w, 'hit', (e) => e.attacker === id && e.amount > 0)[0];
  check('kits', 'keener: the wail lands its damage on a hero', !!hit, hit ?? null);
}
{
  // BARROW SEXTON: buries snares that arm, spring under a hero, snap and
  // hold; three at most; they crumble with it.
  const w = stage(SEED, 3);
  w.ap.configure(false);
  const p = player(w);
  const id = spawnAt(w, 'sexton', p.x + 0.5, p.z - 3.6);
  sturdy(w, id);
  for (let i = 0; i < 520 && seen(w, 'sexton_bury', (e) => e.id === id).length < 1; i++) {
    holdParty(w);
    w.step();
  }
  const bury = seen(w, 'sexton_bury', (e) => e.id === id)[0];
  const dig = seen(w, 'sexton_dig', (e) => e.id === id)[0];
  check('kits', 'sexton: kneels 36 ticks and buries a snare toward its target', dig && bury && bury.tick - dig.tick === 36 && bury.armTick - bury.tick === 45, { dig, bury });
  const snare = bury ? w.registry.byId(bury.snare) : null;
  check('kits', 'sexton: the snare is a slowless snare slick', snare && snare.kind === 'slick' && snare.variant === 'snare' && !(snare.slow > 0), snare && { kind: snare.kind, variant: snare.variant, slow: snare.slow });
  // Walk the player onto it once it is armed.
  for (let i = 0; i < 60 && w.clock.tick < bury.armTick + 1; i++) w.step();
  w.world.cmd('teleport', bury.x, bury.z);
  let trip = null;
  for (let i = 0; i < 5 && !trip; i++) {
    w.step();
    trip = seen(w, 'sexton_snare_trip', (e) => e.snare === bury.snare)[0];
  }
  check('kits', 'sexton: an armed snare springs under a hero (an Ember ring r 0.95 for 42 ticks)', trip && trip.radius === 0.95 && trip.resolveTick - trip.tick === 42 && w.registry.byId(bury.snare)?.telegraph, trip);
  let snap = null;
  for (let i = 0; i < 60 && !snap; i++) {
    w.world.cmd('teleport', bury.x, bury.z);
    w.step();
    snap = seen(w, 'sexton_snare_snap', (e) => e.snare === bury.snare)[0];
  }
  const pl = player(w);
  check('kits', 'sexton: the jaws snap for damage and hold with a 60% slow', snap && snap.victims >= 1 && pl.status && pl.status.slow && Math.abs(pl.status.slow.mag - 0.6) < 1e-6 && !w.registry.byId(bury.snare), { snap, slow: pl.status?.slow ?? null });
  // Stepping off inside the 0.7 s escapes the bite.
  w.world.cmd('teleport', 0, 4);
  let more = 0;
  const park = () => {
    // The whole party stands together, out of the snares' way.
    for (const b of party(w)) {
      b.x = b.px = (b.partyIndex - 1.5) * 0.7;
      b.z = b.pz = 4;
    }
  };
  for (let i = 0; i < 2400 && more < 5; i++) {
    holdParty(w);
    park();
    w.step();
    more = seen(w, 'sexton_bury', (e) => e.id === id).length;
  }
  const live = w.registry.byId(id).snareIds.length;
  check('kits', 'sexton: keeps three snares at most (the oldest crumbles)', more >= 5 && live === 3 && seen(w, 'sexton_snare_crumble', (e) => e.cause === 'oldest').length >= 1, { buried: more, live });
  // A snare sprung and stepped off: no bite.
  const s2 = w.registry.byId(w.registry.byId(id).snareIds[2]);
  for (let i = 0; i < 60 && w.clock.tick < s2.armTick + 1; i++) w.step();
  w.world.cmd('teleport', s2.x, s2.z);
  w.step();
  w.world.cmd('teleport', 0, 4);
  holdParty(w);
  const before = player(w).hp;
  let snap2 = null;
  for (let i = 0; i < 60 && !snap2; i++) {
    w.world.cmd('teleport', 0, 4);
    w.step();
    snap2 = seen(w, 'sexton_snare_snap', (e) => e.snare === s2.id)[0];
  }
  const bit = seen(w, 'hit', (e) => e.attacker === id && snap2 && e.tick === snap2.tick);
  check('kits', 'sexton: stepping off a sprung snare inside the ring escapes the bite', snap2 && snap2.victims === 0 && bit.length === 0, { snap2, bit });
  // Its death crumbles the rest.
  const left = w.registry.byId(id).snareIds.slice();
  w.world.cmd('killAllEnemies');
  w.step();
  check('kits', "sexton: a dead Sexton's snares crumble with it", left.length > 0 && left.every((sid) => !w.registry.byId(sid)) && seen(w, 'sexton_snare_crumble', (e) => e.cause === 'sexton_died').length === left.length, { left });
}
{
  // HEART BLOOM: roots near the party and pulses on every second beat.
  const w = stage(SEED, 4);
  w.ap.configure(false);
  const p = player(w);
  const a = spawnAt(w, 'bloom', p.x - 1.2, p.z - 4.5);
  const b = spawnAt(w, 'bloom', p.x + 1.2, p.z - 4.5);
  sturdy(w, a);
  sturdy(w, b);
  for (let i = 0; i < 1400 && seen(w, 'bloom_pulse', (e) => e.id === a || e.id === b).length < 4; i++) {
    holdParty(w);
    // Stand between the two once they have rooted (the party is the bait).
    if (seen(w, 'bloom_root').length >= 2) {
      const ea = w.registry.byId(a);
      const eb = w.registry.byId(b);
      w.world.cmd('teleport', (ea.x + eb.x) / 2, (ea.z + eb.z) / 2 + 1.2);
    }
    w.step();
  }
  const roots = seen(w, 'bloom_root', (e) => e.id === a || e.id === b);
  check('kits', 'bloom: creeps in and takes root', roots.length === 2, roots);
  const ea = w.registry.byId(a);
  const ra = roots.find((r) => r.id === a);
  check('kits', 'bloom: rooted, it never moves again', ra && Math.hypot(ea.x - ra.x, ea.z - ra.z) < 0.02 && ea.kbScale === 0, { root: ra, now: { x: ea.x, z: ea.z } });
  const pulses = seen(w, 'bloom_pulse', (e) => e.id === a || e.id === b);
  const opens = seen(w, 'bloom_open', (e) => e.id === a || e.id === b);
  check('kits', 'bloom: opens 54 ticks before an even heartbeat and pulses on its surge (r 2.3)', pulses.length >= 2 && pulses.every((e) => beatPhase(e.tick) === 0 && Math.floor(e.tick / HEARTBEAT.period) % 2 === 0 && e.radius === 2.3) && opens.every((o) => o.resolveTick - o.tick === 54), { pulses: pulses.map((e) => e.tick), opens: opens.map((e) => e.tick) });
  const together = pulses.filter((e) => e.id === a).map((e) => e.tick);
  check('kits', 'bloom: every Bloom in the room pulses on the same beat', together.length >= 1 && together.every((t) => pulses.some((e) => e.id === b && e.tick === t)), { a: together, b: pulses.filter((e) => e.id === b).map((e) => e.tick) });
  const tel = seen(w, 'telegraph_start', (e) => e.id === a)[0];
  check('kits', 'bloom: its ring takes no governor slot (not player-targeted)', tel && tel.playerTargeted === false, tel);
}
{
  // VEIN SIPHON: lashes a lane, latches, drinks and heals, snaps stretched.
  const w = stage(SEED, 4);
  w.ap.configure(false);
  const p = player(w);
  const id = spawnAt(w, 'siphon', p.x, p.z - 3.4);
  const e = sturdy(w, id, 300);
  let latch = null;
  for (let i = 0; i < 1500 && !latch; i++) {
    holdParty(w);
    w.step();
    latch = seen(w, 'siphon_latch', (x) => x.id === id)[0];
  }
  const lash = seen(w, 'siphon_lash', (x) => x.id === id && latch && x.tick === latch.tick)[0];
  const tel = seen(w, 'telegraph_start', (x) => x.id === id)[0];
  check('kits', 'siphon: telegraphs a 54-tick lane (0.7 u) and lashes', tel && tel.shape === 'lane' && lash && lash.width === 0.7 && tel.resolveTick - tel.tick === 54, { tel, lash });
  check('kits', 'siphon: the lash latches the first hero in the lane', latch && lash && latch.target === lash.target, latch);
  // Let it drink a while (the hero stays put), with the sac hurt so its heal shows.
  e.hp = 150;
  let drinks = [];
  for (let i = 0; i < 100; i++) {
    w.step();
    drinks = seen(w, 'siphon_drink', (x) => x.id === id);
  }
  check('kits', 'siphon: drinks every 30 ticks and heals itself by as much', drinks.length >= 3 && drinks.every((d) => d.amount > 0 && Math.abs(d.healed - d.amount) < 0.02) && drinks[1].tick - drinks[0].tick === 30 && e.hp > 150, { drinks: drinks.slice(0, 3), hp: e.hp });
  const kb = seen(w, 'hit', (x) => x.attacker === id && x.tick === drinks[0]?.tick)[0];
  check('kits', 'siphon: a drink pushes nobody (no knockback)', kb && !(Math.abs(kb.kb ?? 0) > 0), kb);
  // Walk the prey away: the tether snaps.
  const prey = w.registry.byId(latch.target);
  const away = { x: e.x + (prey.x - e.x) * 10, z: e.z + (prey.z - e.z) * 10 };
  let un = null;
  for (let i = 0; i < 30 && !un; i++) {
    if (prey.partyIndex === 0) w.world.cmd('teleport', away.x, away.z);
    else {
      prey.x = Math.max(-6, Math.min(6, away.x));
      prey.z = Math.max(-6, Math.min(6, away.z));
      prey.px = prey.x;
      prey.pz = prey.z;
    }
    w.step();
    un = seen(w, 'siphon_unlatch', (x) => x.id === id)[0];
  }
  check('kits', 'siphon: walking 5.6 u away snaps the tether', un && (un.cause === 'stretched' || un.cause === 'full'), un);
}

// ---------------------------------------------------------------- roster --
for (const level of [3, 4]) {
  const mine = KINDS.filter((k) => LAND[k] === level);
  const plan = (n) => {
    const w = build(SEED);
    w.run().startCampaign({ level, harness: true });
    w.world.cmd('skipToRoom', n);
    w.step();
    return (w.run().roomPlan()?.roster ?? []).map((r) => r.etype);
  };
  const r2 = plan(2);
  const r3 = plan(3);
  check('roster', `Level ${level}: campaign room 2 never plans ${mine.join(' / ')}`, mine.every((k) => !r2.includes(k)), r2);
  check('roster', `Level ${level}: campaign room 3 plans them`, mine.every((k) => r3.includes(k)), r3);
  const legacy = new Set();
  for (const seed of SEEDS.slice(0, 3)) {
    const w = build(seed);
    w.run().startRun({ act: level });
    for (const n of [3, 4, 5, 6]) {
      w.world.cmd('skipToRoom', n);
      w.step();
      for (const r of w.run().roomPlan()?.roster ?? []) legacy.add(r.etype);
    }
  }
  check('roster', `Level ${level}: the legacy single-level run never plans the new kinds`, KINDS.every((k) => !legacy.has(k)) && legacy.size > 0, [...legacy]);
  check('roster', `Level ${level}: the new kinds are listed CAMPAIGN_ONLY_ENEMIES`, mine.every((k) => CAMPAIGN_ONLY_ENEMIES.includes(k) && LEVELS[level].roster[k] > 0 && LEVELS[level].introduce[k] === 3), null);
}
{
  const guests = {};
  for (let d = 5; d <= 8; d++) {
    const lv = endlessLevel(d);
    for (const k of KINDS) if (lv.roster[k] > 0) guests[k] = (guests[k] ?? []).concat({ depth: d, land: lv.act, w: lv.roster[k], intro: lv.introduce[k] });
  }
  const ok = KINDS.every((k) => (guests[k] ?? []).length === 4 && guests[k].every((g) => (g.land === LAND[k] ? g.w === LEVELS[LAND[k]].roster[k] && g.intro === 3 : Math.abs(g.w - Math.round(LEVELS[LAND[k]].roster[k] * GUEST_WEIGHT * 10000) / 10000) < 1e-9 && g.intro === 4)));
  check('roster', 'Endless past the first cycle: home weight at home, guests at GUEST_WEIGHT from room 4', ok, guests);
}

// -------------------------------------------------------------- campaign --
{
  const met = {};
  for (const level of [3, 4]) {
    const mine = KINDS.filter((k) => LAND[k] === level);
    for (const seed of SEEDS) {
      if (mine.every((k) => met[k] && met[k].attacked)) break;
      const w = build(seed);
      const kinds = new Map();
      w.bus.on('enemy_spawn', (e) => {
        kinds.set(e.id, e.etype);
        if (mine.includes(e.etype)) {
          const room = w.run().view().room;
          const m = (met[e.etype] = met[e.etype] ?? { seed, firstRoom: room, minRoom: room, spawned: 0, attacked: null });
          m.spawned += 1;
          m.minRoom = Math.min(m.minRoom, room);
        }
      });
      const beat = { keener: 'keener_wail', sexton: 'sexton_bury', bloom: 'bloom_pulse', siphon: 'siphon_lash' };
      w.bus.on('*', (e) => {
        for (const k of mine) if (e.type === beat[k] && met[k] && !met[k].attacked) met[k].attacked = { seed, tick: e.tick, room: w.run().view().room };
      });
      w.run().startCampaign({ level, harness: true });
      w.ap.configure(true);
      for (let i = 0; i < 60000; i++) {
        w.step();
        const v = w.run().view();
        if (v.phase === 'victory' || v.phase === 'defeat' || v.act !== level) break;
        holdParty(w); // a fresh party at Level III / IV: kept standing, this leg asks only who it meets
        if (mine.every((k) => met[k] && met[k].attacked)) break;
      }
    }
  }
  for (const k of KINDS) {
    const m = met[k];
    check('campaign', `${k}: a Level ${LAND[k]} campaign on the autopilot meets it from room 3 on and it attacks`, m && m.minRoom >= 3 && m.attacked, m ?? null);
  }
}

// --------------------------------------------------------------- affixes --
{
  const bad = [];
  for (let i = 0; i < 1000; i++) {
    for (const k of KINDS) {
      const list = rollAffixes(`probe:${i}`, i, k, 2);
      if (k === 'bloom' && (list.includes('blinking') || list.includes('hasted'))) bad.push({ k, list });
      if (k === 'siphon' && list.includes('vampiric')) bad.push({ k, list });
    }
  }
  check('affixes', 'a Bloom never Blinks or Hastes and a Siphon is never Vampiric (1000 rolls each)', bad.length === 0, bad.slice(0, 3));
}

// --------------------------------------------------------------- journal --
for (const k of KINDS) {
  const row = BESTIARY.find((b) => b.id === k);
  check('journal', `${k}: a bestiary row in its own land, with lore, and a VFX row`, row && row.lands.length === 1 && row.lands[0] === LAND[k] && row.lore && row.text && ARCHETYPES[k] && ENEMY_VFX[k], row ?? null);
}

// ------------------------------------------------------------------ save --
function roundTrip(label, tree, seed) {
  const a = build(seed);
  const ok1 = a.io.apply(clonePlain(tree));
  const contA = a.continuation(600);
  const b = build(seed + 1000);
  const ok2 = b.io.apply(clonePlain(tree));
  const contB = b.continuation(600);
  const same = JSON.stringify(contA.hashes) === JSON.stringify(contB.hashes) && JSON.stringify(contA.events) === JSON.stringify(contB.events);
  check('save', `${label}: a mid-fight capture continues bit-identically in a fresh world`, ok1.ok && ok2.ok && same, { applyA: ok1.ok, applyB: ok2.ok, hashes: contA.hashes.length, events: contA.events.length });
}
{
  const w = stage(SEED, 4);
  w.ap.configure(false);
  const p = player(w);
  sturdy(w, spawnAt(w, 'siphon', p.x, p.z - 3.4), 300);
  sturdy(w, spawnAt(w, 'sexton', p.x + 2, p.z - 3.6), 300);
  sturdy(w, spawnAt(w, 'bloom', p.x - 2, p.z - 3.6), 300);
  sturdy(w, spawnAt(w, 'keener', p.x - 3, p.z - 2.6), 300);
  let tree = null;
  for (let i = 0; i < 2400 && !tree; i++) {
    holdParty(w);
    w.step();
    const ents = w.registry.all();
    const latched = ents.some((e) => e.kind === 'siphon' && e.latchId != null);
    const snares = ents.some((e) => e.kind === 'slick' && e.variant === 'snare');
    if (latched && snares) tree = clonePlain(w.io.capture());
  }
  if (tree) roundTrip('a Heart room with a latched siphon, snares and a bloom', tree, SEED);
  else check('save', 'a room with a latched siphon and snares: captured', false);
}

mkdirSync(join(here, 'captures'), { recursive: true });
writeFileSync(join(here, OUT), JSON.stringify({ tool: 'new-enemies-bh', at: new Date().toISOString(), seed: SEED, seeds: SEEDS, failed, results }, null, 1));
console.log(`${results.length - failed}/${results.length} pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
