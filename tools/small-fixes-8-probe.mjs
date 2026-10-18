#!/usr/bin/env node
// Small fixes 8 probe (v0.5.303), headless:
//
//   node tools/small-fixes-8-probe.mjs [--root <checkout>]
//
//   pools    the AI seats and the autopilot step off a champion's slow-only
//            patch (the Briar Knight's thorn thicket, the Moss Hart's moss,
//            the Gravebell Ringer's ash, the Glassblower's glass) as they do
//            off a Cinder patch (Small fixes 7); the game stamps those
//            patches as a champion's, a Thornling's thorn patch stays
//            unstamped (walked through as before); a human seat with no
//            input is never steered
//   soles    Pumice Soles keeps a slip floor (wet flagstone, grave frost,
//            heart crystal) from sliding the party: the player seat stops
//            dead, an AI seat never takes momentum, a human seat's step
//            (the host's and the guest predictor's stepHumanMove) never
//            slides; without the relic all three still slide
//   road     the pilgrim's road runs clear of the room's shrine on every
//            level, the Spire (Level V) and the Kiln (act 6) included,
//            seeds 1 to 12, objective rooms 4 to 6
//   version  v0.5.303
// --root runs the same checks against another checkout (a `git archive` of
// gauntlet before this round: the pools and soles legs fail there).
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const ri = argv.indexOf('--root');
const here = ri >= 0 ? resolve(argv[ri + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
globalThis.performance ??= { now: () => Date.now() };
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { setSlipPatches } = await import(u('src/sim/movement.js'));
const { stepHumanMove } = await import(u('src/sim/remote.js'));
const { OBJECTIVE_RULES } = await import(u('src/sim/objectives.js'));
const { VERSION } = await import(u('src/version.js'));

let failed = 0;
let passed = 0;
function check(leg, name, ok, detail = null) {
  if (ok) passed += 1;
  else failed += 1;
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
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const ap = world.runSystem().autopilot;
  const log = [];
  bus.on('*', (e) => {
    if (e.type === 'pilgrim_spawn' || e.type === 'slick_spawn' || e.type === 'relic_proc') log.push(e);
  });
  const step = (snap = null) => clock.stepOnce((t) => world.step(t, ap.active() ? ap.intents(t, emptySnapshot()) : snap ?? emptySnapshot()));
  const run = () => world.runSystem();
  return { registry, world, clock, ap, log, step, run };
}
const steps = (w, n) => {
  const until = w.clock.tick + n;
  for (let i = 0; i < n * 4 && w.clock.tick < until; i++) w.step();
};
const idOf = (r) => (r && typeof r === 'object' ? r.id : r);
const r2 = (v) => Math.round(v * 100) / 100;

// A live Level III campaign room, its own enemies gone, one elite boar held
// still at (0, -2.4) (the AI seats fight it and settle round it).
function fightRoom(seed) {
  const w = build(seed);
  w.run().startCampaign({ level: 3, harness: true });
  for (let i = 0; i < 4000 && w.run().view().phase !== 'combat'; i++) w.step();
  steps(w, 30);
  w.world.cmd('killAllEnemies');
  for (const e of w.registry.all().filter((x) => x.kind === 'eglob' || x.kind === 'slick')) w.registry.despawn(e.id);
  const e = w.registry.byId(idOf(w.world.cmd('spawn', 'boar', 0, -2.4, { elite: true })));
  e.hp = e.maxHp = 50000;
  e.knockbackable = false;
  return { w, e };
}
// A champion's patch as sim/enemies/champions.js lays it (radius, slow,
// life), stamped as the game stamps it (sim/enemies.js spawnSlick).
const POOLS = {
  thorn: { radius: 2.2, ticks: 300, slow: 0.35 },
  moss: { radius: 1.8, ticks: 300, slow: 0.3 },
  ash: { radius: 1.8, ticks: 300, slow: 0.3 },
  glass: { radius: 0.85, ticks: 240, slow: 0.35 },
};
function patch(w, owner, x, z, kind, champion = true) {
  const P = POOLS[kind];
  const tick = w.clock.tick;
  return w.registry.spawn({ kind: 'slick', faction: 'neutral', x, z, px: x, pz: z, radius: P.radius, slow: P.slow, startTick: tick, untilTick: tick + P.ticks, ownerId: owner.id, variant: kind, ...(champion ? { champion: true } : {}) });
}
const hold = (e) => {
  e.x = e.px = 0;
  e.z = e.pz = -2.4;
};
const inPatch = (b, s) => Math.hypot(b.x - s.x, b.z - s.z) <= s.radius;

// ---------------------------------------------------------------- pools --
// A wider patch takes longer to walk out of (and it slows the walk).
const OUT_WITHIN = { thorn: 110, moss: 80, ash: 80, glass: 50 };
function seatsOnPool(kind, champion) {
  const { w, e } = fightRoom(7);
  const allies = w.registry.all().filter((x) => x.kind === 'ally' && x.hp > 0);
  for (const a of allies) a.hp = a.maxHp = 5000;
  w.world.cmd('teleport', 0, 0.8);
  for (let i = 0; i < 90; i++) {
    hold(e);
    w.step();
  }
  // Centred half a radius off the seat, away from the elite (a wide patch
  // centred on a melee seat would cover the elite too).
  const pats = allies.map((a) => {
    const d = Math.hypot(a.x - e.x, a.z - e.z) || 1;
    const off = POOLS[kind].radius * 0.5;
    return patch(w, e, a.x + ((a.x - e.x) / d) * off, a.z + ((a.z - e.z) / d) * off, kind, champion);
  });
  const stood = allies.map(() => 0);
  for (let i = 0; i < 120; i++) {
    hold(e);
    w.step();
    allies.forEach((a, k) => {
      if (inPatch(a, pats[k])) stood[k] += 1;
    });
  }
  return { allies, pats, stood, off: allies.every((a, k) => !inPatch(a, pats[k])) };
}
for (const kind of Object.keys(POOLS)) {
  const r = seatsOnPool(kind, true);
  const worst = Math.max(...r.stood);
  check('pools', `the AI seats step off a champion's ${kind} patch (${r.allies.map((a) => a.classId).join(', ')}): out within ${worst} ticks`, r.allies.length >= 2 && r.off && worst <= OUT_WITHIN[kind], { stood: r.stood });
}
{
  // A Thornling's thorn patch (no champion stamp): unchanged, walked through.
  const r = seatsOnPool('thorn', false);
  const kept = r.stood.filter((n) => n >= 100).length;
  check('pools', `a Thornling's thorn patch is not steered round (${kept} of ${r.allies.length} seats keep their spot in it)`, kept >= 1, { stood: r.stood });
}
for (const kind of Object.keys(POOLS)) {
  // The autopilot walks the player seat off a champion's patch.
  const { w, e } = fightRoom(7);
  const pin = () => w.registry.all().filter((x) => x.kind === 'ally').forEach((a, k) => {
    a.hp = a.maxHp = 5000;
    a.x = a.px = -0.8 + k * 0.8;
    a.z = a.pz = 5.2;
  });
  const p = w.world.player;
  p.hp = p.maxHp = 5000;
  w.world.cmd('teleport', 0, 4.4);
  w.ap.configure(true);
  for (let i = 0; i < 30; i++) {
    hold(e);
    pin();
    w.step();
  }
  const s = patch(w, e, p.x, p.z, kind);
  let stood = 0;
  for (let i = 0; i < 120; i++) {
    hold(e);
    pin();
    w.step();
    if (inPatch(p, s)) stood += 1;
  }
  check('pools', `the autopilot walks the player seat off a champion's ${kind} patch: out within ${stood} ticks`, stood <= OUT_WITHIN[kind] && !inPatch(p, s), { stood });
}
{
  // A human seat: no input, no steering. It stays in the moss.
  const { w, e } = fightRoom(7);
  for (const a of w.registry.all().filter((x) => x.kind === 'ally')) {
    a.x = a.px = 6;
    a.z = a.pz = 5;
  }
  const p = w.world.player;
  p.hp = p.maxHp = 5000;
  w.world.cmd('teleport', 0, 0.4);
  const x0 = p.x;
  const z0 = p.z;
  const s = patch(w, e, p.x, p.z, 'moss');
  for (let i = 0; i < 100; i++) {
    hold(e);
    w.step();
  }
  const moved = Math.hypot(p.x - x0, p.z - z0);
  check('pools', `a human seat with no input stays in a champion's moss (moved ${moved.toFixed(2)} u)`, inPatch(p, s) && moved < 0.05, { moved });
}
{
  // The game's own stamp: each champion's patch carries it, a Thornling's not.
  const LAYS = { briar_knight: 'thorn', moss_hart: 'moss', gravebell_ringer: 'ash', glassblower: 'glass', thornling: 'thorn' };
  const got = {};
  for (const [kind, variant] of Object.entries(LAYS)) {
    const { w, e } = fightRoom(5);
    w.registry.despawn(e.id);
    const p = w.world.player;
    for (const h of w.registry.all().filter((x) => x.partyIndex !== undefined)) h.hp = h.maxHp = 50000;
    const c = w.registry.byId(idOf(w.world.cmd('spawn', kind, p.x + 3, p.z)));
    if (c) c.hp = c.maxHp = 50000;
    let s = null;
    for (let i = 0; i < 2400 && !s; i++) {
      w.step();
      s = w.registry.all().find((x) => x.kind === 'slick' && x.variant === variant && c && x.ownerId === c.id) ?? null;
    }
    got[kind] = s ? s.champion === true : 'no patch';
  }
  check('pools', "each champion's patch is stamped a champion's, a Thornling's is not", got.briar_knight === true && got.moss_hart === true && got.gravebell_ringer === true && got.glassblower === true && got.thornling === false, got);
}

// ---------------------------------------------------------------- soles --
// A live Act II room, the layout's hazards cleared, one wet patch at (4, 0)
// r 2, the AI party parked far off.
function slipRoom(relics, skin = 'wet') {
  const w = build(3);
  w.run().startCampaign({ level: 2, harness: true });
  for (let i = 0; i < 4000 && w.run().view().phase !== 'combat'; i++) w.step();
  w.world.cmd('clearLayout');
  w.world.cmd('killAllEnemies');
  for (const id of relics) w.world.cmd('relicGrant', id);
  w.world.cmd('spawnHazard', 'slip', 4, 0, { r: 2, skin });
  w.step();
  for (const [i, x, z] of [[1, -9, -5], [2, -9, 5], [3, -10, 0]]) w.world.cmd('placeAlly', i, x, z);
  w.log.length = 0;
  return w;
}
const move = (x, z) => ({ ...emptySnapshot(), move: { x, z }, aim: { x: 20, z: 0 } });
function stopSlide(relics, skin) {
  const w = slipRoom(relics, skin);
  const p = w.world.player;
  w.world.cmd('teleport', 2.6, 0);
  for (let i = 0; i < 30; i++) {
    w.world.cmd('killAllEnemies');
    w.step(move(1, 0));
  }
  const x0 = p.x;
  for (let i = 0; i < 90; i++) {
    w.world.cmd('killAllEnemies');
    w.step();
  }
  return { slide: r2(p.x - x0), beats: w.log.filter((x) => x.type === 'relic_proc' && x.relic === 'pumice_soles').length };
}
for (const skin of ['wet', 'frost', 'glass']) {
  const a = stopSlide([], skin);
  const b = stopSlide(['pumice_soles'], skin);
  check('soles', `on a ${skin} slip floor the player slides on without the soles (${a.slide} u), stops dead with them (${b.slide} u)`, a.slide >= 0.3 && Math.abs(b.slide) < 0.01, { without: a, with: b });
  if (skin === 'wet') check('soles', `the soles' beat shows on the slip floor (${b.beats}x in 2 s, at most twice a second)`, b.beats >= 1 && b.beats <= 5, b);
}
{
  // An AI seat knocked across the patch: momentum without the soles, none with.
  const knock = (relics) => {
    const w = slipRoom(relics, 'frost');
    const a = w.registry.all().find((x) => x.kind === 'ally' && x.partyIndex === 1);
    let slid = false;
    for (let i = 0; i < 40; i++) {
      w.world.cmd('killAllEnemies');
      if (i % 10 === 0) {
        a.x = a.px = 3;
        a.z = a.pz = 0;
        a.kbVx = 0.12;
        a.kbVz = 0;
        a.kbTicks = 4;
      }
      w.step();
      if (a.slipVx !== undefined) slid = true;
    }
    return slid;
  };
  const a = knock([]);
  const b = knock(['pumice_soles']);
  check('soles', 'an AI seat knocked over a frost floor takes momentum without the soles, never with them', a && !b, { without: a, with: b });
}
{
  // A human seat's own step (the host's co-op seat, the guest's predictor).
  setSlipPatches([{ id: 1, x: 0, z: 0, r: 3, grip: 0.07 }]);
  const walk = (slipProof) => {
    const b = { x: -1, z: 0, radius: 0.3, dashTicksLeft: 0, dashVel: { x: 0, z: 0 }, hp: 10 };
    for (let i = 0; i < 30; i++) stepHumanMove(b, { x: 1, z: 0 }, 3, { slipProof });
    const x0 = b.x;
    for (let i = 0; i < 40; i++) stepHumanMove(b, { x: 0, z: 0 }, 3, { slipProof });
    return { slide: r2(b.x - x0), momentum: b.slipVx !== undefined };
  };
  const a = walk(false);
  const b = walk(true);
  setSlipPatches(null);
  check('soles', `a human seat's step slides on without the soles (${a.slide} u), never with them (${b.slide} u)`, a.slide >= 0.2 && Math.abs(b.slide) < 0.01 && !b.momentum, { without: a, with: b });
}

// ----------------------------------------------------------------- road --
{
  const E = OBJECTIVE_RULES.escort;
  const bad = [];
  const withShrine = {};
  for (let level = 1; level <= 6; level++)
    for (const room of [4, 5, 6])
      for (let seed = 1; seed <= 12; seed++) {
        const w = build(seed);
        w.run().startCampaign({ level, harness: true });
        w.world.cmd('objectiveRoom', 'escort', room);
        w.world.cmd('skipToRoom', room);
        w.step();
        const sp = w.log.find((x) => x.type === 'pilgrim_spawn');
        const sh = w.registry.all().find((x) => x.kind === 'shrine');
        if (!sp || !sh) continue;
        withShrine[level] = (withShrine[level] ?? 0) + 1;
        // The road against the shrine alone: its footprint, the pilgrim's radius.
        let minClear = Infinity;
        const R = sp.route;
        for (let i = 1; i < R.length; i++) {
          const [ax, az] = R[i - 1];
          const [bx, bz] = R[i];
          const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2);
          for (let k = 0; k <= n; k++) {
            const x = ax + ((bx - ax) * k) / n;
            const z = az + ((bz - az) * k) / n;
            minClear = Math.min(minClear, Math.hypot(x - sh.x, z - sh.z) - (sh.collider?.r ?? 0.5) - E.radius);
          }
        }
        if (!(minClear >= 0)) bad.push({ level, room, seed, shrine: [sh.x, sh.z], minClear: Math.round(minClear * 1000) / 1000 });
      }
  const every = [1, 2, 3, 4, 5, 6].every((l) => (withShrine[l] ?? 0) >= 3);
  check('road', `the pilgrim's road runs clear of the room's shrine on Levels I to IV, the Spire and the Kiln (escort rooms with a shrine by act: ${JSON.stringify(withShrine)})`, every && bad.length === 0, { bad });
}

// -------------------------------------------------------------- version --
check('version', `the game shows v${VERSION} (v0.5.303 or later)`, VERSION.split('.').map(Number).reduce((a, n) => a * 1000 + n, 0) >= 5303);

console.log(`\n${passed}/${passed + failed} checks pass`);
process.exit(failed ? 1 : 0);
