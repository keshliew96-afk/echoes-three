// UNLOCKS round two (docs/UNLOCKS.md "Round two"): what one run did that a
// deed counts, gathered from the event bus by the save service (and by the
// headless probe on a sim bus). A presentation listener: it only reads
// events, so it never changes a run.
//   events      event rooms entered (encounter ids)
//   affixes     affixes worn by elites the party felled (each counts)
//   objectives  objective rooms won (hunt, purge, escort, hold)
//   champions   champions felled (ids)
//   arenas      arena layouts fought in (ids)
//   vaults      vaults opened
import { ARENA_IDS } from '../data/unlocks.js';

export function createDeedRunTracker(bus) {
  let run = fresh();
  function fresh() {
    return { events: [], affixes: [], objectives: [], champions: [], arenas: [], vaults: 0, wore: new Map() };
  }
  const addOnce = (arr, v) => {
    if (v !== undefined && v !== null && !arr.includes(v)) arr.push(v);
  };
  bus.on('event_enter', (ev) => {
    if (typeof ev.encounter === 'string') addOnce(run.events, ev.encounter);
  });
  bus.on('elite_affixes', (ev) => {
    if (Array.isArray(ev.affixes) && ev.affixes.length) run.wore.set(ev.id, ev.affixes.slice());
    if (run.wore.size > 256) run.wore.delete(run.wore.keys().next().value);
  });
  bus.on('death', (ev) => {
    const list = run.wore.get(ev.id);
    if (!list) return;
    run.wore.delete(ev.id);
    for (const a of list) if (typeof a === 'string') addOnce(run.affixes, a);
  });
  bus.on('room_cleared', (ev) => {
    if (typeof ev.objective === 'string' && ev.won && !ev.softFailed) addOnce(run.objectives, ev.objective);
  });
  bus.on('champion_fall', (ev) => {
    if (typeof ev.champion === 'string') addOnce(run.champions, ev.champion);
  });
  bus.on('vault_open', () => {
    run.vaults += 1;
  });
  bus.on('layout_enter', (ev) => {
    if (ARENA_IDS.includes(ev.layoutId)) addOnce(run.arenas, ev.layoutId);
  });
  return {
    reset() {
      run = fresh();
    },
    // The plain facts (no live state), as awardRun's summary.deedRun.
    facts: () => ({ events: run.events.slice(), affixes: run.affixes.slice(), objectives: run.objectives.slice(), champions: run.champions.slice(), arenas: run.arenas.slice(), vaults: run.vaults }),
  };
}
