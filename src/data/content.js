// The shared `content` service (docs/gauntlet/PLAN.md §3.2 / §3.6 / §6.4).
// Owner: M4a (creates it; main.js `@gnt:M4a WORLD-LAYERS` provides it).
// M4b never edits this file: it adds its probes from ITS OWN modules with
//   registerContentProbe('hazards', () => [...])
//   registerContentProbe('interactables', () => [...])
// and they appear on the service and on window.__echoes.content at once.
// Probes are read-only views over sim state (plain data, never live objects).
//
// M4a members:
//   levels()              the three expeditions (data/levels.js)
//   unlockedActs()        acts the player may pick at the portal: Act I always;
//                         Act N+1 once Act N has been won — from the save
//                         profile when the save service exists (M2 persists
//                         unlocks), plus every act won THIS session (so the
//                         rule is truthful before/without a profile), plus a
//                         probe override (debug.unlock) for critics
//   lastAct()             the last expedition started (profile lastAct, else
//                         this session's, else the highest unlocked)
//   difficultyTable(c)    the §4.2 curve (data/difficulty.js)
//   roomPlan()            the live room: act/room/layout, the difficulty
//                         numbers it was rolled with, every wave's budget /
//                         cost / units (null outside a run room)
//   curve(act, c)         per-room hpMul/dmgMul/budget/elite for one act
//   probe(name) / probes() M4b's registered probes
import { LEVELS, ACT_IDS, levelFor } from './levels.js';
import { difficulty, difficultyTable } from './difficulty.js';

const probes = new Map(); // name -> fn() -> plain data

export function registerContentProbe(name, fn) {
  if (typeof name !== 'string' || typeof fn !== 'function') throw new Error('registerContentProbe(name, fn)');
  probes.set(name, fn);
  return () => probes.delete(name);
}

export function contentProbeNames() {
  return [...probes.keys()].sort();
}

export function createContentService({ world, bus = null, service = null } = {}) {
  // Session record of expeditions (acts won / started this page session).
  const wonThisSession = new Set();
  let lastStarted = null;
  let forced = null; // debug.unlock(list) override (probe only)
  if (bus && typeof bus.on === 'function') {
    bus.on('run_start', (ev) => {
      if (Number.isFinite(ev.act)) lastStarted = ev.act;
    });
    bus.on('run_end', (ev) => {
      if (ev.result === 'victory' && Number.isFinite(ev.act)) wonThisSession.add(ev.act);
    });
  }
  const save = () => (typeof service === 'function' ? service('save') : null);
  function profile() {
    const s = save();
    if (!s || typeof s.profile !== 'function') return null;
    try {
      return s.profile() ?? null;
    } catch {
      return null;
    }
  }

  function unlockedActs() {
    if (Array.isArray(forced)) return [...forced];
    const set = new Set([1]);
    const p = profile();
    const fromProfile = p && p.unlocks && Array.isArray(p.unlocks.acts) ? p.unlocks.acts : [];
    for (const a of fromProfile) if (ACT_IDS.includes(a)) set.add(a);
    // A victory in act N unlocks N+1 (levels.js `unlock.afterVictory`).
    const won = new Set(wonThisSession);
    const rec = p && p.records ? p.records : null;
    if (rec && rec.fastestVictorySec) for (const k of Object.keys(rec.fastestVictorySec)) if (rec.fastestVictorySec[k] != null) won.add(Number(k));
    for (const a of ACT_IDS) {
      const u = LEVELS[a].unlock;
      if (u && won.has(u.afterVictory)) set.add(a);
    }
    return [...set].filter((a) => ACT_IDS.includes(a)).sort((a, b) => a - b);
  }

  // { act, reason: 'last' | 'newest' } — 'last' only when a run really was
  // started in that act (profile or this session), so the picker's badge
  // never claims a history the player does not have.
  function lastActInfo() {
    const p = profile();
    const unlocked = unlockedActs();
    const fromProfile = p && Number.isFinite(p.lastAct) ? p.lastAct : null;
    const played = fromProfile ?? lastStarted;
    if (played !== null && played !== undefined && unlocked.includes(played)) return { act: played, reason: 'last' };
    return { act: unlocked[unlocked.length - 1] ?? 1, reason: 'newest' };
  }
  const lastAct = () => lastActInfo().act;

  function roomPlan() {
    const run = world && world.runSystem ? world.runSystem() : null;
    if (!run || typeof run.roomPlan !== 'function') return null;
    return run.roomPlan();
  }

  function curve(act = 1, challenge = 'standard') {
    const rows = [];
    for (let room = 1; room <= 6; room++) {
      const d = difficulty(act, room, challenge);
      rows.push({ room, hpMul: d.hpMul, dmgMul: d.dmgMul, budget: d.budget, defendBudget: d.defendBudget, eliteChance: d.eliteChance, waveIntervalTicks: d.waveIntervalTicks });
    }
    const boss = difficulty(act, 6, challenge);
    return { act, challenge, rooms: rows, bossHp: boss.bossHp, bossDmgMul: boss.bossDmgMul, waystoneHp: boss.waystoneHp };
  }

  const api = {
    levels: () => ACT_IDS.map((a) => LEVELS[a]),
    level: (act) => levelFor(act),
    unlockedActs,
    lastAct,
    lastActInfo,
    difficultyTable: (challenge = 'standard') => difficultyTable(challenge),
    curve,
    roomPlan,
    probe(name) {
      const fn = probes.get(name);
      return fn ? fn() : null;
    },
    probes: contentProbeNames,
    world: () => world ?? null,
  };
  // Probe-only override so a critic can reach the "≥ 2 acts unlocked" portal
  // branch without playing an act first (PLAN G4a.11). null restores the
  // truthful rule.
  api.unlock = (list) => {
    forced = Array.isArray(list) ? list.filter((a) => ACT_IDS.includes(a)).sort((a, b) => a - b) : null;
    if (forced && !forced.includes(1)) forced.unshift(1);
    return unlockedActs();
  };
  api.sessionWins = () => [...wonThisSession].sort((a, b) => a - b);
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
