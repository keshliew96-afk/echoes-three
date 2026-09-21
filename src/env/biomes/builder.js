// Background dressing builder hook (M4b). The arena registers its pump here
// (scenes/arena.js: a generator-sliced build of every other layout's dressing
// + its GPU upload + a parked warm draw); main.js's M4b RENDER-TICK drives it
// through render/hazards/layers.js with a per-frame time budget — generous in
// the camp / title, tiny in live combat (a room's own dressing is always built
// before it is needed; this only pre-builds the rest).
const pumps = [];

export function registerDressingPump(fn) {
  if (typeof fn === 'function') pumps.push(fn);
  return () => {
    const i = pumps.indexOf(fn);
    if (i >= 0) pumps.splice(i, 1);
  };
}

export function pumpDressings(budgetMs = 8) {
  for (const p of pumps) p(budgetMs);
}
