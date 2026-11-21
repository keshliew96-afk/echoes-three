import { build } from './sim.mjs';
import { memStorage } from './memstore.mjs';
const { createSaveSystem } = await import('/home/claude/echoes-three/src/save/index.js');
function page(ls) {
  const s = build({ seed: 5 });
  const save = createSaveSystem({ clock: s.clock, rng: s.rng, registry: s.registry, world: s.world, bus: s.bus, storage: ls });
  return { s, save };
}
const runEnd = (s) => s.bus.emit(s.clock.tick, 'run_end', { result: 'defeat', act: 1, rooms: 3, ticks: 6000, campaign: { mode: 'campaign', startLevel: 1, levels: [{ level: 1, index: 1, rooms: 3, cleared: false, ticks: 6000 }] } });
// Page A: a run, a vault opened in room 2 (Keyholder deed: "Open a vault"), then the tab is closed.
const lsA = memStorage();
const A = page(lsA);
A.s.world.runSystem().startCampaign({ level: 1 });
A.s.stepN(30);
A.s.bus.emit(A.s.clock.tick, 'vault_open', {});
A.s.bus.emit(A.s.clock.tick, 'room_cleared', { objective: 'hunt', won: true });
const tree = A.save.capture();
// Control: the run ends on page A itself.
runEnd(A.s);
console.log('same page   -> deeds', A.save.lastAward().deeds);
// Page B: a reload; Continue applies the saved tree, the run then ends.
const lsB = memStorage();
const B = page(lsB);
const r = B.save.apply ? B.save.apply(tree) : null;
console.log('apply', r && r.ok);
runEnd(B.s);
console.log('after reload-> deeds', B.save.lastAward().deeds);
