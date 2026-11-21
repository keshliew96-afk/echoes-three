const R = '/home/claude/echoes-three/src/';
const { createGameplayRng } = await import(R + 'core/rng.js');
const { createRegistry } = await import(R + 'core/registry.js');
const { createEventBus } = await import(R + 'core/events.js');
const { createClock } = await import(R + 'core/clock.js');
const { createWorld } = await import(R + 'sim/world.js');
const { scriptedInput } = await import(R + 'sim/script.js');
const { SKILL_SLOTS } = await import(R + 'core/constants.js');
const { createStateIO } = await import(R + 'save/capture.js');
export const { hashState } = await import(R + 'core/hash.js');
export function build({ seed = 7 } = {}) {
  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; }, get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(), range: (a, b) => impl.range(a, b), int: (n) => impl.int(n), chance: (p) => impl.chance(p), pick: (a) => impl.pick(a),
    reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; },
    getState: () => impl.getState(), setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = createRegistry(); const bus = createEventBus(); const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const autopilot = world.runSystem().autopilot; const rawStep = world.step;
  world.step = (tick, snap, ...rest) => rawStep(tick, autopilot && autopilot.active() ? autopilot.intents(tick, snap) : snap, ...rest);
  const io = createStateIO({ clock, rng, registry, world });
  function stepN(n, script = 3, driver = null) {
    let stepped = 0, guard = 0;
    while (stepped < n && guard < n * 8 + 64) { guard++; if (clock.stepOnce((t) => world.step(t, scriptedInput(script, t, { skillSlots: SKILL_SLOTS })))) { stepped++; if (driver) driver(world, clock.tick); } }
    return stepped;
  }
  return { rng, registry, bus, clock, world, io, stepN };
}
