#!/usr/bin/env node
// SAVE DETERMINISM (code review finding 12, `npm test`), headless, no browser.
// A run captured mid-room and applied to a fresh world plays on hash for hash
// with the run it came from: Level I, III and IV campaign rooms and an Endless
// room, each 12 chunks of 120 ticks. Ported from the review's proof
// (review/code-review-proofs/save/t10-det.mjs).
//
// The two worlds run one after the other, never interleaved: src/sim/movement.js
// keeps its colliders (statics, dynamics, slips) at module level, so two worlds
// stepped in turn in one process share one set (seen: Level III drifts by chunk 2).
//
//   node tools/save-determinism-probe.mjs      exit 1 on any divergence
const R = new URL('../src/', import.meta.url).pathname;
const { createGameplayRng } = await import(R + 'core/rng.js');
const { createRegistry } = await import(R + 'core/registry.js');
const { createEventBus } = await import(R + 'core/events.js');
const { createClock } = await import(R + 'core/clock.js');
const { createWorld } = await import(R + 'sim/world.js');
const { scriptedInput } = await import(R + 'sim/script.js');
const { SKILL_SLOTS } = await import(R + 'core/constants.js');
const { createStateIO } = await import(R + 'save/capture.js');
const { hashState } = await import(R + 'core/hash.js');

// The sim as src/main.js builds it, with the autopilot wired into step.
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
  const clock = createClock();
  const world = createWorld({ rng, registry, events: createEventBus(), harness: false, requestHitstop: clock.requestHitstop, room: null });
  const autopilot = world.runSystem().autopilot;
  const rawStep = world.step;
  world.step = (tick, snap, ...rest) => rawStep(tick, autopilot && autopilot.active() ? autopilot.intents(tick, snap) : snap, ...rest);
  const io = createStateIO({ clock, rng, registry, world });
  function stepN(n, driver = null) {
    let stepped = 0, guard = 0;
    while (stepped < n && guard < n * 8 + 64) {
      guard++;
      if (clock.stepOnce((t) => world.step(t, scriptedInput(3, t, { skillSlots: SKILL_SLOTS })))) {
        stepped++;
        if (driver) driver(world, clock.tick);
      }
    }
    return stepped;
  }
  return { world, io, stepN };
}

// Clears rooms every 4 s so the chunks cross rewards, paths and shops.
const drive = (world, tick) => {
  if (tick % 240) return;
  world.cmd('killAllEnemies');
  const r = world.runSystem().view();
  if (r.phase === 'reward') world.runSystem().takeReward();
  if (r.phase === 'path') world.cmd('pathChoose', 0);
  if (r.phase === 'shop') world.cmd('shopAdvance');
};
const chunks = (s) => {
  const h = [];
  for (let i = 0; i < 12; i++) {
    s.stepN(120, drive);
    h.push(hashState(s.io.capture()));
  }
  return h;
};

let fails = 0;
for (const [level, room, opts] of [[1, 2, {}], [3, 4, {}], [4, 5, { endless: false }], [1, 3, { endless: true }]]) {
  const a = build(11 + level);
  a.world.runSystem().startCampaign({ level, harness: true, ...opts });
  a.stepN(10);
  a.world.cmd('skipToRoom', room);
  a.stepN(300, drive);
  const tree = a.io.capture();
  const ha = chunks(a);
  const b = build(999);
  const applied = b.io.apply(tree);
  const hb = chunks(b);
  const div = ha.findIndex((x, i) => x !== hb[i]);
  const ok = applied.ok && div === -1;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} Level ${level} room ${room}${opts.endless ? ' (Endless)' : ''}: apply ${applied.ok}, ${div === -1 ? '12 chunks on hash' : `diverges at chunk ${div}`}`);
}
process.exit(fails ? 1 : 0);
