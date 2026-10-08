#!/usr/bin/env node
// Small fixes probe (v0.5.244), headless Node:
//
//   node tools/small-fixes-probe.mjs
//
//   1. Glint counter: a run played as another class (seat 2, the Swordsman)
//      carries every seat's Glint in the run view (`purses`), so the HUD
//      reads the viewer's own purse; a solo Healer run has no `purses` key
//      (its hashed view is unchanged).
//   2. AI relics: at the room-7 peddler, AI-held allies with the Glint take
//      a relic off the relic shelf (their own class relic first, else one
//      for no class): held under Suggested and bought on Advance, bought at
//      once under Auto, never under Manual.
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
const { frameFromSnapshot, seatInputOf } = await import(u('src/sim/netseats.js'));
const { CLASS_OF_SEAT } = await import(u('src/data/classes.js'));

function makeWorld(seed) {
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
  const log = [];
  for (const t of ['relic_shelf', 'relic_purchase', 'shop_open', 'shop_close']) bus.on(t, (e) => log.push({ ...e, type: t }));
  const run = world.runSystem();
  return { world, registry, bus, clock, run, log };
}

const fails = [];
const check = (ok, what) => {
  if (!ok) fails.push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
  return ok;
};

// Autopilot to the room-7 peddler; every purse topped up to `glint` in room 6
// so the shelf is affordable.
function toShop(seed, { mode = 'suggest', glint = 200 } = {}) {
  const W = makeWorld(seed);
  const { run, world, clock } = W;
  const ap = run.autopilot;
  run.startCampaign({ level: 1, harness: true });
  ap.configure(true);
  const P = world.partySystem();
  P.setMode(mode);
  let topped = false;
  for (let i = 0; i < 240000; i++) {
    const v = run.view();
    if (v.phase === 'shop') break;
    if (v.phase === 'victory' || v.phase === 'defeat') return null;
    if (!topped && v.room === 6) {
      run.cmd('wallet', [glint]);
      for (const k of [1, 2, 3]) P.setPurse(k, glint);
      topped = true;
    }
    clock.stepOnce((t) => world.step(t, ap.intents(t, emptySnapshot())));
  }
  ap.configure(false);
  return run.view().phase === 'shop' ? { ...W, P } : null;
}

// ------------------------------------------------------- 1. Glint counter --
{
  // Class select: seat 2 (the Swordsman) played, the Healer AI-held.
  const W = makeWorld(41);
  W.run.startCampaign({ level: 1, harness: true });
  const P = W.world.partySystem();
  for (let i = 0; i < 400; i++)
    W.clock.stepOnce((t) => {
      const f = frameFromSnapshot(emptySnapshot(), { seq: t, tick: t, viewTick: t });
      return W.world.step(t, emptySnapshot(), { seats: { 2: seatInputOf([f]) }, reasons: {}, player: 'ai', rewind: null });
    });
  P.setPurse(2, 37);
  const v = W.run.view();
  check(Array.isArray(v.purses) && v.purses.length === 4 && v.purses[0] === v.wallet && v.purses[2] === 37,
    `class select (Swordsman): the run view carries every seat's Glint (${JSON.stringify(v.purses)}, Healer wallet ${v.wallet})`);
  const B = makeWorld(41);
  B.run.startCampaign({ level: 1, harness: true });
  for (let i = 0; i < 400; i++) B.clock.stepOnce((t) => B.world.step(t, emptySnapshot()));
  check(!('purses' in B.run.view()), 'solo Healer: no purses key in the run view (hash unchanged)');
}

// --------------------------------------------------------- 2. AI relics --
const aiBuys = (W) => W.log.filter((e) => e.type === 'relic_purchase' && e.seat > 0);
{
  const W = toShop(41);
  if (check(!!W, 'Suggested: reached the peddler')) {
    const shelf = W.run.view().relics.shelf;
    check(aiBuys(W).length === 0 && shelf.every((s) => !s.sold), `Suggested: nothing bought at the door (${shelf.map((s) => `${s.id}${s.cls ? '/' + s.cls : ''} ${s.price}`).join(', ')})`);
    W.run.cmd('shopAdvance', []);
    const got = aiBuys(W);
    const ok = got.length > 0 && got.every((e) => {
      const r = shelf[e.index];
      return r && (!r.cls || r.cls === CLASS_OF_SEAT[e.seat]);
    });
    check(ok, `Suggested: AI allies buy on Advance (${got.map((e) => `seat ${e.seat} ${e.relic} ${e.price}`).join(', ') || 'none'})`);
    check(new Set(got.map((e) => e.relic)).size === got.length && got.every((e) => W.run.view().relics.owned.some((o) => o.id === e.relic)), 'Suggested: each relic bought once and owned by the party');
  }
  const X = toShop(41, { mode: 'auto' });
  if (check(!!X, 'Auto: reached the peddler')) {
    const got = aiBuys(X);
    check(got.length > 0, `Auto: AI allies buy at the door (${got.map((e) => `seat ${e.seat} ${e.relic}`).join(', ') || 'none'})`);
  }
  const M = toShop(41, { mode: 'manual' });
  if (check(!!M, 'Manual: reached the peddler')) {
    M.run.cmd('shopAdvance', []);
    check(aiBuys(M).length === 0, 'Manual: AI allies buy no relic');
  }
  const N = toShop(41, { glint: 10 });
  if (check(!!N, 'short purses: reached the peddler')) {
    N.run.cmd('shopAdvance', []);
    check(aiBuys(N).length === 0, 'short purses: no relic bought');
  }
}

console.log(`\n${fails.length ? 'FAIL' : 'PASS'} small fixes probe`);
process.exit(fails.length ? 1 : 0);
