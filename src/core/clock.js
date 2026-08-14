// §1 Simulation clock: fixed 60 Hz tick via accumulator; render frames
// interpolate visual positions but NEVER mutate sim state. Also owns hitstop
// (§9: global sim pause, capped at 4 ticks per 20-tick window) — during
// hitstop the accumulator drains but the tick counter and the world freeze,
// while rendering continues.
import { TICK_MS, MAX_FRAME_MS, HITSTOP } from './constants.js';

export function createClock() {
  let tick = 0;
  let accumulator = 0;
  let hitstopRemaining = 0;
  const grants = []; // { atTick, amount } inside the rolling budget window

  // Returns the number of ticks actually granted (0 when the window budget is
  // spent). Combat block calls this on melee connects / kill blows.
  function requestHitstop(n) {
    while (grants.length > 0 && grants[0].atTick < tick - HITSTOP.windowTicks) {
      grants.shift();
    }
    const used = grants.reduce((sum, g) => sum + g.amount, 0);
    const grant = Math.max(0, Math.min(n, HITSTOP.budgetTicks - used));
    if (grant > 0) {
      grants.push({ atTick: tick, amount: grant });
      hitstopRemaining += grant;
    }
    return grant;
  }

  // Advance sim time by one render frame. stepFn(tick) runs once per elapsed
  // 60 Hz tick (catch-up bounded by MAX_FRAME_MS so a hitch never spirals).
  // Returns the interpolation alpha in [0, 1) — how far the *next* tick has
  // accrued — for render-side prev->curr lerping.
  function advance(frameMs, stepFn) {
    accumulator += Math.min(frameMs, MAX_FRAME_MS);
    while (accumulator >= TICK_MS) {
      accumulator -= TICK_MS;
      if (hitstopRemaining > 0) {
        hitstopRemaining -= 1; // world frozen; time is consumed, not banked
        continue;
      }
      tick += 1;
      stepFn(tick);
    }
    return accumulator / TICK_MS;
  }

  return {
    advance,
    requestHitstop,
    get tick() {
      return tick;
    },
    get hitstopRemaining() {
      return hitstopRemaining;
    },
  };
}
