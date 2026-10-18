#!/usr/bin/env node
// Small fixes 7 probe (v0.5.301), headless:
//
//   node tools/small-fixes-7-probe.mjs [--root <checkout>]
//
//   cinder   the AI seats step off a Cinder elite's burning patch (ranged
//            and melee alike) and the autopilot walks the player seat off
//            one; a human seat standing in a patch with no input stays put
//            and burns, exactly as before
//   road     the pilgrim's road bends round a shrine that stands in the
//            escort room (before, the shrine was placed first and the road
//            ran a stop into it), levels 1 to 4, seeds 1 to 6
//   tempered the Forge Shrine's Tempered blessing keeps Kiln Gold (its
//            lasting look is render-only, see the shots)
//   version  v0.5.301
// --root runs the same checks against another checkout (a `git archive` of
// gauntlet before this round: the cinder and road legs fail there).
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
const { AFFIX_RULES } = await import(u('src/sim/affixes.js'));
const { blockerClearance } = await import(u('src/sim/movement.js'));
const { OBJECTIVE_RULES } = await import(u('src/sim/objectives.js'));
const { BLESSING_COLORS, VFX_MATTER, PALETTE } = await import(u('src/data/palette.js'));
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
    if (e.type === 'hit' || e.type === 'pilgrim_spawn' || e.type === 'shrine_spawn') log.push(e);
  });
  const step = () => clock.stepOnce((t) => world.step(t, ap.active() ? ap.intents(t, emptySnapshot()) : emptySnapshot()));
  const run = () => world.runSystem();
  return { registry, world, clock, ap, log, step, run };
}
const steps = (w, n) => {
  const until = w.clock.tick + n;
  for (let i = 0; i < n * 4 && w.clock.tick < until; i++) w.step();
};

// A live Level III campaign room, its own enemies gone, one Cinder elite
// held still at (0, -2.4) (standing, it lays no patch of its own).
function cinderRoom(seed) {
  const w = build(seed);
  w.run().startCampaign({ level: 3, harness: true });
  for (let i = 0; i < 4000 && w.run().view().phase !== 'combat'; i++) w.step();
  steps(w, 30);
  w.world.cmd('killAllEnemies');
  for (const e of w.registry.all().filter((x) => x.kind === 'eglob' || x.kind === 'slick')) w.registry.despawn(e.id);
  const id = w.world.cmd('spawn', 'boar', 0, -2.4, { elite: true, affixes: ['cinder'] });
  const e = w.registry.byId(id);
  e.hp = e.maxHp = 50000;
  e.knockbackable = false;
  return { w, e };
}
// A Cinder patch at (x, z), as the affix lays it (sim/affixes.js).
function patch(w, owner, x, z) {
  const N = AFFIX_RULES.cinder;
  const tick = w.clock.tick;
  return w.registry.spawn({ kind: 'slick', faction: 'neutral', x, z, px: x, pz: z, radius: N.radius, slow: 0, startTick: tick, untilTick: tick + N.ticks, ownerId: owner.id, variant: 'cinder', burn: N.burn });
}
const hold = (e) => {
  e.x = e.px = 0;
  e.z = e.pz = -2.4;
};
const inPatch = (b, s) => Math.hypot(b.x - s.x, b.z - s.z) <= s.radius;
const burnsOn = (w, id, from) => w.log.slice(from).filter((x) => x.type === 'hit' && x.target === id && x.shape === 'molten').length;

// --------------------------------------------------------------- cinder --
{
  // Every AI seat gets a patch laid right where it stands while it fights.
  const { w, e } = cinderRoom(7);
  const allies = w.registry.all().filter((x) => x.kind === 'ally' && x.hp > 0);
  for (const a of allies) a.hp = a.maxHp = 5000;
  // The hero just behind the elite: the seats close in and settle on their
  // own spots round it (they stand still there by tick 60).
  w.world.cmd('teleport', 0, 0.8);
  for (let i = 0; i < 90; i++) {
    hold(e);
    w.step();
  }
  const pats = allies.map((a) => patch(w, e, a.x, a.z));
  const from = w.log.length;
  let worst = 0;
  const stood = allies.map(() => 0);
  for (let i = 0; i < 60; i++) {
    hold(e);
    w.step();
    allies.forEach((a, k) => {
      if (inPatch(a, pats[k])) stood[k] += 1;
    });
  }
  worst = Math.max(...stood);
  const burns = allies.map((a) => burnsOn(w, a.id, from));
  const off = allies.every((a, k) => !inPatch(a, pats[k]));
  check('cinder', `the AI seats step off a fresh Cinder patch (${allies.map((a) => a.classId).join(', ')}): out within ${worst} ticks`, allies.length >= 2 && off && worst <= 40, { stood, burns });
  check('cinder', 'so a patch laid under an AI seat never burns it (the first burn is 0.5 s in)', burns.every((n) => n === 0), { burns });
  const melee = allies.filter((a) => ['swordsman', 'tank', 'duskwing'].includes(a.classId));
  check('cinder', `melee seats step off too (${melee.map((a) => a.classId).join(', ') || 'none in this party'})`, melee.length > 0 && melee.every((a) => !inPatch(a, pats[allies.indexOf(a)])));
}
{
  // The autopilot (the player seat on the bot) walks off a patch.
  // The party pinned round the hero, so the bot (holding near the party's
  // centre, the elite out of its reach) would stand still where it is.
  const { w, e } = cinderRoom(7);
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
  const s = patch(w, e, p.x, p.z);
  const from = w.log.length;
  let stood = 0;
  for (let i = 0; i < 100; i++) {
    hold(e);
    pin();
    w.step();
    if (inPatch(p, s)) stood += 1;
  }
  check('cinder', `the autopilot walks the player seat off a patch: out within ${stood} ticks`, stood <= 40 && !inPatch(p, s), { stood, burns: burnsOn(w, p.id, from) });
}
{
  // A human seat: no input, no steering. It stays in the patch and burns.
  const { w, e } = cinderRoom(7);
  for (const a of w.registry.all().filter((x) => x.kind === 'ally')) {
    a.x = a.px = 6;
    a.z = a.pz = 5;
  }
  const p = w.world.player;
  p.hp = p.maxHp = 5000;
  w.world.cmd('teleport', 0, 0.4);
  const x0 = p.x;
  const z0 = p.z;
  const s = patch(w, e, p.x, p.z);
  const from = w.log.length;
  for (let i = 0; i < 100; i++) {
    hold(e);
    w.step();
  }
  const moved = Math.hypot(p.x - x0, p.z - z0);
  const burns = burnsOn(w, p.id, from);
  check('cinder', `a human seat with no input stays in the patch and burns (${burns} burns, moved ${moved.toFixed(2)} u)`, inPatch(p, s) && burns >= 2 && moved < 0.05, { burns, moved });
}

// ----------------------------------------------------------------- road --
{
  const E = OBJECTIVE_RULES.escort;
  const bad = [];
  let withShrine = 0;
  for (let level = 1; level <= 4; level++)
    for (let seed = 1; seed <= 6; seed++) {
      const w = build(seed);
      w.run().startCampaign({ level, harness: true });
      w.world.cmd('objectiveRoom', 'escort', 4);
      w.world.cmd('skipToRoom', 4);
      w.step();
      const sp = w.log.find((x) => x.type === 'pilgrim_spawn');
      const sh = w.registry.all().find((x) => x.kind === 'shrine');
      if (!sp || !sh) continue;
      withShrine += 1;
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
      if (!(minClear >= 0)) bad.push({ level, seed, shrine: [sh.x, sh.z], minClear: Math.round(minClear * 1000) / 1000 });
      void blockerClearance;
    }
  check('road', `the pilgrim's road runs clear of the room's shrine (${withShrine} escort rooms with a shrine, levels 1-4, seeds 1-6)`, withShrine >= 3 && bad.length === 0, { bad });
}

// ------------------------------------------------------------- tempered --
{
  const c = BLESSING_COLORS.tempered;
  check('tempered', `Tempered wears Kiln Gold (${c && c.glow}), never Ember`, !!c && c.glow === VFX_MATTER.kilngold && c.glow !== PALETTE.emberDanger && c.core !== PALETTE.emberDanger);
}

// -------------------------------------------------------------- version --
check('version', `the game shows v${VERSION}`, VERSION === '0.5.301');

console.log(`\n${passed}/${passed + failed} checks pass`);
process.exit(failed ? 1 : 0);
