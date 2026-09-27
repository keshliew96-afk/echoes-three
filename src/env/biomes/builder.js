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

// gauntlet r4 J4-F1 (INT, GI.6): frame-aware slicing. `spentMs` = what this
// frame already spent before the pump (its sim ticks — a level teardown at the
// clear, a room entry, a load). A HEAVY frame — one that already spent more
// than HEAVY_FRAME_MS and 2.5x this device's usual pre-pump time (a slow or
// busy machine is not starved) — gets no build work: the build waits a frame
// (the level-clear frame used to carry the teardown AND a whole build step,
// 88-109 ms on a quiet machine). At most MAX_HEAVY_SKIPS frames in a row, so a
// build always progresses.
const HEAVY_FRAME_MS = 14;
const HEAVY_FACTOR = 2.5;
const MAX_HEAVY_SKIPS = 4;
let heavySkips = 0;
let spentEma = null;
const pumpStats = { heavySkipped: 0, lastSpentMs: 0, log: [] };
export function pumpStatsDebug() {
  return { heavySkipped: pumpStats.heavySkipped, lastSpentMs: pumpStats.lastSpentMs, usualSpentMs: spentEma === null ? null : Math.round(spentEma * 10) / 10, heavyFrameMs: HEAVY_FRAME_MS, maxHeavySkips: MAX_HEAVY_SKIPS, log: pumpStats.log.slice() };
}

export function pumpDressings(budgetMs = 8, spentMs = 0) {
  const b = budgetMs > 0 && budgetOverride !== null ? budgetOverride : budgetMs;
  if (b > 0) {
    const heavyAt = Math.max(HEAVY_FRAME_MS, spentEma === null ? 0 : spentEma * HEAVY_FACTOR);
    const heavy = spentMs > heavyAt && heavySkips < MAX_HEAVY_SKIPS;
    spentEma = spentEma === null ? spentMs : spentEma + (spentMs - spentEma) * 0.05;
    pumpStats.lastSpentMs = Math.round(spentMs * 10) / 10;
    // probe ring: [performance.now(), spent, budget, skipped 0|1]
    pumpStats.log.push([Math.round(performance.now()), pumpStats.lastSpentMs, b, heavy ? 1 : 0]);
    if (pumpStats.log.length > 240) pumpStats.log.shift();
    if (heavy) {
      heavySkips += 1;
      pumpStats.heavySkipped += 1;
      return;
    }
    heavySkips = 0;
  }
  for (const p of pumps) p(b);
}
