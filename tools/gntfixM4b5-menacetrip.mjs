#!/usr/bin/env node
// gntfixM4b5 — MENACE (constants.js MENACE, PLAN GP.5) sim checks, Node:
//  (1) save / load round trip while the Tank's menace is live: a carried
//      campaign (autopilot, the CAMPAIGN recipe) is driven to a combat room
//      where the Tank holds Taunting Roar; A = capture(); K ticks (hash every
//      60 + every non-sound event); apply(A) on the same world and on a FRESH
//      world; both continuations must equal the first (the per-tick threat
//      cache is derived state and must not leak across a load);
//  (2) the rule itself on a pinned layout: a hostile equidistant-ish from the
//      Swordsman (nearer by < the menace) and the Tank targets the Tank with
//      the source equipped, the Swordsman without; a live taunt still wins
//      (boss.js is untouched: the Stag keeps its own nearest + taunt rule).
//   node tools/gntfixM4b5-menacetrip.mjs [--seed 3] [--ticks 900]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? Number(argv[i + 1]) : d;
};
const SEED = opt('seed', 3);
const K = opt('ticks', 900);
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { hashState } = await import(u('src/core/hash.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { MENACE } = await import(u('src/core/constants.js'));

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
  let rec = null;
  bus.on('*', (e) => {
    if (rec && e.type !== 'sound') rec.push(canonicalJSON(e));
  });
  const io = createStateIO({ clock, rng, registry, world });
  const stepN = (n) => {
    for (let k = 0, g = 0; k < n && g < n * 8 + 64; g++) if (clock.stepOnce((t) => world.step(t, ap.active() ? ap.intents(t, emptySnapshot()) : emptySnapshot()))) k += 1;
  };
  const continuation = (n) => {
    rec = [];
    const hashes = [];
    const threat = [];
    for (let d = 0; d < n; d += 60) {
      stepN(Math.min(60, n - d));
      hashes.push(hashState(io.capture()));
      threat.push(JSON.stringify(world.cmd('threat')));
    }
    const ev = rec;
    rec = null;
    return { hashes, ev, threat };
  };
  return { world, registry, clock, io, ap, stepN, continuation };
}
const same = (a, b) => a.hashes.join() === b.hashes.join() && a.ev.join('\n') === b.ev.join('\n');
const checks = [];
const check = (name, ok, got) => {
  checks.push({ name, ok: !!ok, got });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${got !== undefined ? JSON.stringify(got).slice(0, 300) : ''}`);
};

// (1) round trip with menace live.
{
  const A = build(SEED);
  A.world.runSystem().startCampaign({ level: 1, challenge: 'standard', harness: true });
  A.ap.configure(true);
  let found = null;
  for (let t = 0; t < 120000 && !found; t += 30) {
    A.stepN(30);
    const v = A.world.runSystem().view();
    const th = A.world.cmd('threat');
    const hostiles = A.registry.all().filter((e) => e.faction === 'hostile' && e.hp > 0).length;
    if (v.phase === 'combat' && Object.keys(th).length > 0 && hostiles >= 3) found = { tick: A.clock.tick, room: `L${v.act}r${v.room}`, threat: th, hostiles };
  }
  check('a combat room with the Tank\'s menace live was reached', !!found, found);
  if (found) {
    const snap = A.io.capture();
    const c1 = A.continuation(K);
    A.io.apply(snap);
    const c2 = A.continuation(K);
    check(`same world: apply(A) continuation equals the first over ${K} ticks (${c1.hashes.length} hashes, ${c1.ev.length} events)`, same(c1, c2), { h1: c1.hashes.slice(-1), h2: c2.hashes.slice(-1) });
    const B = build(SEED);
    B.ap.configure(true);
    B.io.apply(snap);
    const c3 = B.continuation(K);
    check('fresh world: apply(A) continuation equals the first', same(c1, c3), { h1: c1.hashes.slice(-1), h3: c3.hashes.slice(-1) });
    check('the threat map is live through the continuation', c1.threat.some((s) => s !== '{}'), c1.threat.slice(0, 4));
  }
}

// (2) the rule on a pinned layout (harness world: no run, no autopilot).
{
  const W = build(11);
  const w = W.world;
  const R = W.registry;
  const tank = R.all().find((e) => e.kind === 'ally' && e.partyIndex === 1);
  const sword = R.all().find((e) => e.kind === 'ally' && e.partyIndex === 2);
  const others = R.all().filter((e) => e.partyIndex !== undefined && e.partyIndex !== 1 && e.partyIndex !== 2);
  const place = (e, x, z) => { e.x = x; e.z = z; e.px = x; e.pz = z; };
  const pinParty = () => {
    place(tank, 1.2, 0);
    place(sword, -1.0, 0);
    others.forEach((o, i) => place(o, -6 + i * 0.5, 6));
  };
  const pick = (kind) => {
    pinParty();
    const id = w.cmd('spawn', kind, 0.05, 0);
    const e = R.byId(typeof id === 'object' && id ? id.id : id);
    return e;
  };
  // The ally loadout is the starting kit here (no taunt source): the nearest rule.
  const tl = w.cmd('partyView', 1);
  check('harness Tank starts without a taunt source (menace off)', tl && !tl.slots.includes('taunting_roar') && Object.keys(w.cmd('threat')).length === 0, tl && tl.slots);
  let r = w.cmd('partySwap', 1, 'taunting_roar', 3);
  check('Taunting Roar swapped into the Tank\'s slot 4', r && !r.denied, r);
  W.stepN(1); // the presence map is read once per tick: a swap shows from the next tick
  const th = w.cmd('threat');
  check(`menace map = { tank: ${MENACE.perSourceU} } with one source`, th[tank.id] === MENACE.perSourceU, th);
  // A boar at x 0.05: Swordsman 1.05 u, Tank 1.15 u -> Tank within 0.3 u -> Tank.
  const boar = pick('boar');
  // A live taunt (the Tank AI roars at a hostile in reach) forces its target —
  // clear it before each read so the menace rule itself is measured.
  // The allies' hits knock the boar back (a knocked-back body keeps its last
  // target) and could kill it: pin it as a sturdy, unshoved probe body.
  boar.knockbackable = false;
  const settle = () => { boar.status = {}; boar.kbTicks = 0; boar.hp = boar.maxHp = 1e6; pinParty(); W.stepN(1); };
  settle();
  place(boar, 0.05, 0);
  settle();
  check('a hostile 0.1 u nearer the Swordsman targets the Tank (menace 0.3)', boar && boar.targetId === tank.id, { target: boar && boar.targetId, tank: tank.id, sword: sword.id });
  // Outside the menace: Swordsman 0.3 u, Tank 1.9 u -> Swordsman.
  place(boar, -0.7, 0);
  settle();
  check('a hostile far nearer the Swordsman stays on the Swordsman', boar.targetId === sword.id, { target: boar.targetId, hp: boar.hp, kb: boar.kbTicks, x: boar.x, sx: sword.x, tx: tank.x });
  // A live taunt from the Swordsman's side still wins over menace (status.js taunt).
  boar.status = {};
  place(boar, 0.05, 0);
  pinParty();
  boar.status = { taunt: { mag: 1, untilTick: W.clock.tick + 120, src: sword.id, at: W.clock.tick } };
  boar.kbTicks = 0;
  W.stepN(1);
  check('a live taunt still forces its source over the menace', boar.targetId === sword.id, { target: boar.targetId });
  // Without the source the same equidistant spot picks the Swordsman.
  r = w.cmd('partySwap', 1, 'whirling_guard', 3);
  place(boar, 0.05, 0);
  settle();
  const th0 = w.cmd('threat');
  check('without a taunt source the nearer Swordsman is the target (v0.5.150 rule)', Object.keys(th0).length === 0 && boar.targetId === sword.id, { th0, target: boar.targetId });
}
const failed = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ tool: 'gntfixM4b5-menacetrip', checks: checks.length, passed: checks.length - failed.length, failed: failed.map((c) => c.name) }));
process.exit(failed.length ? 1 : 0);
