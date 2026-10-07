#!/usr/bin/env node
// SLICK FLOOR (docs/SLICK_FLOOR.md), headless, through the real sim.
// In a live Act II campaign room, with a wet patch laid at (4, 0) r 2:
//   stop     the Healer walking onto the patch slides on after the keys let
//            go (a dry floor stops dead)
//   turn     a 90° turn on the patch keeps drifting the old way first
//   dodge    a dodge that starts on the patch travels further than on dry
//            ground
//   kb       a training dummy knocked back on the patch slides further
//   enemy    a Thorn Boar walking across the patch carries momentum
//   flier    a Mire Moth over the patch never slips
//   seat     a human seat's own step (sim/remote.js, the step the co-op guest
//            predicts with) slides by the same rule
// plus the layouts: every slick patch is in an Act II / III layout, none in
// Act I, the tutorial clearing or a boss room, and a campaign room that rolls
// one places its patches and the movement module's list.
//   node tools/slickfloor-probe.mjs        exit 1 on any failure
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
const { LAYOUTS } = await import(u('src/data/layouts.js'));
const { LEVELS } = await import(u('src/data/levels.js'));
const { slipPatches, setSlipPatches } = await import(u('src/sim/movement.js'));
const { stepHumanMove } = await import(u('src/sim/remote.js'));

const fails = [];
function check(what, ok, got = null) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${got !== null ? ` ${JSON.stringify(got)}` : ''}`);
  if (!ok) fails.push(what);
}
const r2 = (v) => Math.round(v * 1000) / 1000;

function makeWorld(seed = 3) {
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
  const run = world.runSystem();
  return { world, run, registry, bus, clock };
}

// A live Act II room with the layout's own hazards cleared, enemies gone and
// (optionally) one wet patch at (4, 0) r 2.
function arena(withPatch, skin = 'wet') {
  const W = makeWorld();
  W.run.startCampaign({ level: 2, harness: true });
  let snap = emptySnapshot();
  W.step = (s = snap) => W.clock.stepOnce((t) => W.world.step(t, s));
  for (let i = 0; i < 4000 && !(W.run.view().phase === 'combat'); i++) W.step(emptySnapshot());
  W.world.cmd('clearLayout');
  W.world.cmd('killAllEnemies');
  if (withPatch) W.world.cmd('spawnHazard', 'slip', 4, 0, { r: 2, skin });
  W.step(emptySnapshot());
  // Park the AI party far from the patch.
  for (const [i, x, z] of [[1, -9, -5], [2, -9, 5], [3, -10, 0]]) W.world.cmd('placeAlly', i, x, z);
  W.quiet = () => W.world.cmd('killAllEnemies');
  return W;
}
const P = (W) => W.world.player;
const move = (x, z) => ({ ...emptySnapshot(), move: { x, z }, aim: { x: 20, z: 0 } });

// ------------------------------------------------------------- stop slide --
function stopSlide(withPatch) {
  const W = arena(withPatch);
  W.world.cmd('teleport', 2.6, 0);
  for (let i = 0; i < 30; i++) {
    W.quiet();
    W.step(move(1, 0));
  }
  const x0 = P(W).x;
  for (let i = 0; i < 90; i++) {
    W.quiet();
    W.step(emptySnapshot());
  }
  return { at: r2(x0), slide: r2(P(W).x - x0), slipVx: P(W).slipVx ?? null };
}
const s0 = stopSlide(false);
const s1 = stopSlide(true);
check('stop: a dry floor stops the Healer dead', Math.abs(s0.slide) < 0.01, s0);
check('stop: on the wet patch the Healer slides on after letting go (>= 0.3 u)', s1.slide >= 0.3, s1);

// ------------------------------------------------------------------- turn --
function turn(withPatch) {
  const W = arena(withPatch);
  W.world.cmd('teleport', 2.6, 0.6);
  for (let i = 0; i < 28; i++) {
    W.quiet();
    W.step(move(1, 0));
  }
  const x0 = P(W).x;
  for (let i = 0; i < 12; i++) {
    W.quiet();
    W.step(move(0, -1));
  }
  return { drift: r2(P(W).x - x0) };
}
const t0 = turn(false);
const t1 = turn(true);
check('turn: on the patch a 90° turn keeps drifting the old way (>= 0.15 u in 12 ticks)', t1.drift >= 0.15 && t0.drift < 0.01, { dry: t0, wet: t1 });

// ------------------------------------------------------------------ dodge --
function dodge(withPatch, skin) {
  const W = arena(withPatch, skin);
  W.world.cmd('teleport', 2.4, 0);
  W.quiet();
  W.step(move(1, 0));
  const x0 = P(W).x;
  W.quiet();
  W.step({ ...move(1, 0), presses: [{ kind: 'dodge' }] });
  for (let i = 0; i < 80; i++) {
    W.quiet();
    W.step(emptySnapshot());
  }
  return r2(P(W).x - x0);
}
const d0 = dodge(false);
const d1 = dodge(true, 'wet');
const d2 = dodge(true, 'frost');
check('dodge: a dodge on wet stone carries further than on dry ground (+0.5 u or more)', d1 >= d0 + 0.5, { dry: d0, wet: d1 });
check('dodge: grave frost is slicker than wet stone', d2 > d1, { wet: d1, frost: d2 });

// ------------------------------------------------------------- knockback --
function knock(withPatch) {
  const W = arena(withPatch);
  W.world.cmd('teleport', 1.2, 0);
  const id = W.world.cmd('spawn', 'dummy', 3.6, 0);
  W.step(emptySnapshot());
  const d = W.registry.byId(id);
  const x0 = d.x;
  W.world.cmd('hitOnce', id);
  for (let i = 0; i < 90; i++) W.step(emptySnapshot());
  return r2(d.x - x0);
}
const k0 = knock(false);
const k1 = knock(true);
check('knockback: a dummy knocked back on the patch slides further', k1 >= k0 + 0.2, { dry: k0, wet: k1 });

// ------------------------------------------------------------- enemy slide --
// A boar on the patch walks toward the Healer to its north; the Healer then
// jumps to the south. On dry ground it turns at once; on the patch its
// momentum keeps carrying it north first.
function boar(withPatch) {
  const W = arena(withPatch);
  W.world.cmd('teleport', 4, -7);
  const id = W.world.cmd('spawn', 'boar', 4, 1.2);
  let slipSeen = false;
  for (let i = 0; i < 30; i++) {
    W.step(emptySnapshot());
    const b = W.registry.byId(id);
    if (b && b.slipVx !== undefined) slipSeen = true;
  }
  const b = W.registry.byId(id);
  const z0 = b.z;
  W.world.cmd('teleport', 4, 7);
  let minZ = z0;
  for (let i = 0; i < 20; i++) {
    W.step(emptySnapshot());
    minZ = Math.min(minZ, b.z);
  }
  return { slipSeen, carry: r2(z0 - minZ) };
}
const b0 = boar(false);
const b1 = boar(true);
check('enemy: a Thorn Boar on the patch carries on before it can turn back (dry ground turns at once)', b1.slipSeen && !b0.slipSeen && b1.carry >= 0.05 && b0.carry < 0.02, { dry: b0, wet: b1 });

// ------------------------------------------------------------------ flier --
{
  const W = arena(true);
  W.world.cmd('teleport', -6, 0);
  const id = W.world.cmd('spawn', 'moth', 4, 0);
  let slipped = false;
  let over = false;
  for (let i = 0; i < 120; i++) {
    W.step(emptySnapshot());
    const m = W.registry.byId(id);
    if (!m) break;
    if (Math.hypot(m.x - 4, m.z) < 2) over = true;
    if (m.slipVx !== undefined) slipped = true;
  }
  check('flier: a Mire Moth over the patch never slips', over && !slipped, { over, slipped });
}

// ------------------------------------------------------- human seat step --
{
  setSlipPatches([{ id: 1, x: 0, z: 0, r: 3, grip: 0.09 }]);
  const body = { x: -1, z: 0, radius: 0.3, dashTicksLeft: 0, dashVel: { x: 0, z: 0 }, hp: 100 };
  for (let i = 0; i < 20; i++) stepHumanMove(body, { x: 1, z: 0 }, 2.4);
  const x0 = body.x;
  for (let i = 0; i < 60; i++) stepHumanMove(body, { x: 0, z: 0 }, 2.4);
  const slide = r2(body.x - x0);
  const twin = { x: -1, z: 0, radius: 0.3, dashTicksLeft: 0, dashVel: { x: 0, z: 0 }, hp: 100 };
  for (let i = 0; i < 20; i++) stepHumanMove(twin, { x: 1, z: 0 }, 2.4);
  for (let i = 0; i < 60; i++) stepHumanMove(twin, { x: 0, z: 0 }, 2.4);
  check('seat: a human seat\'s own step slides too, and replays bit-exact (the guest predictor runs this step)', slide >= 0.3 && twin.x === body.x && twin.z === body.z, { slide });
  setSlipPatches(null);
}

// ---------------------------------------------------------------- layouts --
{
  const withSlip = Object.values(LAYOUTS).filter((L) => L.hazards.some((h) => h.type === 'slip'));
  const acts = withSlip.map((L) => L.act);
  check('layouts: slick floor in Act II and III layouts only, never Act I', withSlip.length >= 4 && acts.every((a) => a === 2 || a === 3) && acts.includes(2) && acts.includes(3), withSlip.map((L) => `${L.id} ${L.name}`));
  const bossIds = Object.values(LEVELS).map((l) => l.bossLayout);
  check('layouts: the skins match the land (wet in the Mill, frost in the Barrow)', withSlip.every((L) => L.hazards.filter((h) => h.type === 'slip').every((h) => h.skin === (L.act === 2 ? 'wet' : 'frost'))));
  check('layouts: no slick floor in Level 1 tables (Act I) or the tutorial clearing (layout 2)', !LEVELS[1].layouts.some((id) => withSlip.some((L) => L.id === id)) && !LAYOUTS[2].hazards.some((h) => h.type === 'slip'));
  void bossIds;
}

// A campaign room that rolls a slick layout places the patches; the boss room
// (dressed as a slick layout) places none.
{
  let found = null;
  for (let seed = 1; seed <= 24 && !found; seed++) {
    const W = makeWorld(seed);
    const ap = W.run.autopilot;
    let hit = null;
    let boss = null;
    W.bus.on('layout_placed', (e) => {
      const L = LAYOUTS[e.layoutId];
      const want = L && L.hazards.filter((h) => h.type === 'slip').length;
      if (e.mode === 'boss') boss = { id: e.layoutId, slips: W.registry.all().filter((x) => x.kind === 'hazard' && x.htype === 'slip').length };
      else if (want && !hit) hit = { layoutId: e.layoutId, room: e.room, want, tick: e.tick };
    });
    W.run.startCampaign({ level: 3, harness: true });
    ap.configure(true);
    for (let i = 0; i < 60000 && !hit; i++) W.clock.stepOnce((t) => W.world.step(t, ap.intents(t, emptySnapshot())));
    if (hit) {
      W.clock.stepOnce((t) => W.world.step(t, ap.intents(t, emptySnapshot())));
      const live = W.registry.all().filter((x) => x.kind === 'hazard' && x.htype === 'slip');
      found = { seed, ...hit, live: live.length, patches: slipPatches().length };
      W.world.cmd('skipToRoom', 8);
      for (let i = 0; i < 400 && !boss; i++) W.clock.stepOnce((t) => W.world.step(t, ap.intents(t, emptySnapshot())));
      found.boss = boss;
    }
  }
  check('campaign: a Level 3 room that rolls a slick layout places its patches and the movement list', found && found.live === found.want && found.patches === found.want, found);
  check('campaign: the boss room places no slick floor', found && found.boss && found.boss.slips === 0, found && found.boss);
}

console.log(fails.length ? `\nFAIL slick floor (${fails.length})` : '\nPASS slick floor');
process.exit(fails.length ? 1 : 0);
