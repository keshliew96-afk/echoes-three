// The shared `content` service (docs/gauntlet/PLAN.md §3.2 / §3.6 / §6.4).
// Owner: M4a (creates it; main.js `@gnt:M4a WORLD-LAYERS` provides it).
// M4b never edits this file: it adds its probes from ITS OWN modules with
//   registerContentProbe('hazards', () => [...])
//   registerContentProbe('interactables', () => [...])
// and they appear on the service and on window.__echoes.content at once.
// Probes are read-only views over sim state (plain data, never live objects).
//
// ARCH stub (v0.5.1): levels / difficulty tables from the committed data
// modules + the probe registry. M4a adds unlockedActs() (from the save
// profile when the save service exists; [1] otherwise) and roomPlan().
import { LEVELS, ACT_IDS } from './levels.js';
import { difficultyTable } from './difficulty.js';

const probes = new Map(); // name -> fn() -> plain data

export function registerContentProbe(name, fn) {
  if (typeof name !== 'string' || typeof fn !== 'function') throw new Error('registerContentProbe(name, fn)');
  probes.set(name, fn);
  return () => probes.delete(name);
}

export function contentProbeNames() {
  return [...probes.keys()].sort();
}

export function createContentService({ world } = {}) {
  const api = {
    levels: () => ACT_IDS.map((a) => LEVELS[a]),
    unlockedActs: () => [1],
    difficultyTable: (challenge = 'standard') => difficultyTable(challenge),
    roomPlan: () => null, // M4a: the rolled waves/costs of the live room
    probe(name) {
      const fn = probes.get(name);
      return fn ? fn() : null;
    },
    probes: contentProbeNames,
    world: () => world ?? null,
  };
  // debug surface = the API plus every registered probe as a getter-style
  // function, so `__echoes.content.hazards()` works for M4b's probes.
  api.debug = new Proxy(api, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && probes.has(prop)) return () => probes.get(prop)();
      return undefined;
    },
  });
  return api;
}
