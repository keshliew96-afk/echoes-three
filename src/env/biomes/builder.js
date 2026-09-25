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

// CAMPAIGN (docs/gauntlet/PLAN.md §12.5): under the level-transition card the
// level manager raises the calm-frame budget so the next level's layouts are
// built before the card is due; live combat (0) and a held menu (0) stay 0.
let budgetOverride = null;
export function setPumpBudgetOverride(ms) {
  budgetOverride = Number.isFinite(ms) && ms > 0 ? ms : null;
  return budgetOverride;
}

export function pumpDressings(budgetMs = 8) {
  const b = budgetMs > 0 && budgetOverride !== null ? budgetOverride : budgetMs;
  for (const p of pumps) p(b);
}
